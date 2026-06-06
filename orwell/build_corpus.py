"""
Build an anonymized, projection-ready score JSON for the Orwell Explorer.

Walks a directory of .md / .txt / .pdf files, scores each with the 15-axis Orwell
feature vector, strips identifying content from labels, and writes a JSON manifest
the explorer page can load.

Output JSON shape:
{
  "feature_names": [...15 axis keys...],
  "feature_labels": [...15 human labels...],
  "weights": {axis: weight, ...},        # only for the 7 composite axes
  "documents": [
    {
      "id": "A07",                       # anon id
      "cohort": "A" | "B" | "X",         # author group (A, B, control X)
      "kind": "MOTION" | "ORDER" | "EMAIL" | ...,
      "year": 2025,
      "n_words": int,
      "n_sentences": int,
      "composite": float,
      "axes": {...},                     # 7 composite axes raw
      "diagnostics": {...},              # 8 diagnostics raw
      "vector": [15 floats]
    }, ...
  ],
  "projections": {
    "pca":  [[x,y], ...],                # 2D PCA in feature space (precomputed)
    "mds":  [[x,y], ...],                # MDS from Euclidean distances
  }
}

Anonymization: removes proper-noun substrings from titles and never copies body
text. Output contains only scores + structural metadata.

Usage:
    python build_corpus.py --root ../../div_legal --out corpus_scores.json
    python build_corpus.py --root ./samples --out corpus_scores.json --include synthetic
"""

from __future__ import annotations
import argparse, hashlib, json, math, re, sys
from pathlib import Path
from orwell_score import (
    score_document, WEIGHTS, DIAGNOSTIC_AXES, OrwellScore,
)

# ────────── cohort + kind inference ──────────

# Path/title heuristics. Tune freely — the explorer page only sees the cohort label.
COHORT_RULES = [
    # cohort A — author 1 (e.g. respondent / pro se)
    ("A", [r"respond(?:er|ent)", r"pro[\-_ ]?se", r"responder", r"FILING_", r"MAY5_PREPARATION", r"JUNE16"]),
    # cohort B — author 2 (e.g. petitioner / opposing counsel)
    ("B", [r"petition(?:er)?", r"plaintiff", r"opposing", r"counsel", r"tarara", r"conniff"]),
    # cohort X — orders, neutral, control
    ("X", [r"order", r"docket", r"court", r"neutral", r"control"]),
]
KIND_RULES = [
    ("MOTION",     [r"motion", r"notice_of_motion"]),
    ("PETITION",   [r"petition"]),
    ("AFFIDAVIT",  [r"affidavit", r"financial.*aff"]),
    ("ORDER",      [r"order", r"judgment"]),
    ("RESPONSE",   [r"response", r"reply", r"opposition", r"answer"]),
    ("DISCOVERY",  [r"discovery", r"interrogator", r"subpoena", r"production"]),
    ("EMAIL",      [r"email", r"\bre_", r"^[0-9]{8}_"]),
    ("BRIEF",      [r"brief", r"memorandum"]),
    ("CERT",       [r"certificate", r"cert_"]),
    ("CONTRACT",   [r"contract", r"agreement", r"settlement"]),
    ("NOTE",       [r"note", r"summary", r"analysis"]),
]
DEFAULT_COHORT = "X"
DEFAULT_KIND   = "DOC"

PREFIX_RE = re.compile(r"^([ABX])[_\-]", re.I)
def classify(path: Path) -> tuple[str, str]:
    p = str(path)
    # filename prefix override (A_, B_, X_) — useful for curated sample sets
    m = PREFIX_RE.match(path.name)
    if m:
        cohort = m.group(1).upper()
    else:
        cohort = next((c for c, pats in COHORT_RULES if any(re.search(rx, p, re.I) for rx in pats)), DEFAULT_COHORT)
    kind   = next((k for k, pats in KIND_RULES   if any(re.search(rx, p, re.I) for rx in pats)), DEFAULT_KIND)
    return cohort, kind

def year_from_path(path: Path, default: int = 0) -> int:
    m = re.search(r"(20\d{2})", str(path))
    return int(m.group(1)) if m else default

# ────────── content readers ──────────

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)

def read_markdown(path: Path) -> tuple[str, str]:
    raw = path.read_text(errors="ignore")
    m = FRONTMATTER_RE.match(raw)
    title = ""
    body = raw
    if m:
        fm, body = m.group(1), m.group(2)
        tm = re.search(r"^title:\s*[\"']?(.+?)[\"']?\s*$", fm, re.M)
        if tm: title = tm.group(1).strip()
    if not title:
        for line in body.splitlines():
            if line.strip().startswith("#"):
                title = line.lstrip("# ").strip(); break
    return title, body

def read_text(path: Path) -> tuple[str, str]:
    raw = path.read_text(errors="ignore")
    lines = [l for l in raw.splitlines() if l.strip()]
    title = ""
    if lines and (lines[0].isupper() or len(lines[0]) < 100):
        title = lines[0].lstrip("# ").strip()
    return title, raw

READERS = {".md": read_markdown, ".markdown": read_markdown,
           ".txt": read_text, ".text": read_text}

# ────────── projections (numpy-free) ──────────

def _matmul(A, B):
    n = len(A); m = len(B[0]); k = len(B)
    return [[sum(A[i][t]*B[t][j] for t in range(k)) for j in range(m)] for i in range(n)]
def _transpose(A): return [list(col) for col in zip(*A)]

def _pca2(X: list[list[float]]) -> list[list[float]]:
    """2-component PCA via power iteration on the covariance matrix."""
    n = len(X); d = len(X[0]) if X else 0
    if n < 2 or d < 2: return [[0.0, 0.0] for _ in X]
    mean = [sum(row[j] for row in X)/n for j in range(d)]
    Xc = [[row[j] - mean[j] for j in range(d)] for row in X]
    XT = _transpose(Xc)
    cov = _matmul(XT, Xc)  # d×d
    cov = [[c/(n-1) for c in row] for row in cov]
    def top_eig(M, exclude):
        v = [(i * 0.7654321 % 1.0) - 0.5 for i in range(len(M))]
        for _ in range(400):
            w = [sum(M[i][j]*v[j] for j in range(len(M))) for i in range(len(M))]
            for e in exclude:
                dot = sum(w[i]*e[i] for i in range(len(M)))
                w = [w[i] - dot*e[i] for i in range(len(M))]
            norm = math.sqrt(sum(x*x for x in w)) or 1.0
            v = [x/norm for x in w]
        return v
    v1 = top_eig(cov, [])
    v2 = top_eig(cov, [v1])
    proj = [[sum(Xc[i][j]*v1[j] for j in range(d)),
             sum(Xc[i][j]*v2[j] for j in range(d))] for i in range(n)]
    return proj

def _mds2(X: list[list[float]]) -> list[list[float]]:
    """Classical MDS on Euclidean distances in feature space."""
    n = len(X)
    if n < 2: return [[0.0, 0.0] for _ in X]
    D2 = [[sum((X[i][k]-X[j][k])**2 for k in range(len(X[0]))) for j in range(n)] for i in range(n)]
    rm = [sum(D2[i])/n for i in range(n)]
    gm = sum(rm)/n
    B = [[-0.5*(D2[i][j] - rm[i] - rm[j] + gm) for j in range(n)] for i in range(n)]
    def top_eig(M, exclude):
        v = [(i * 0.123456 % 1.0) - 0.5 for i in range(len(M))]
        for _ in range(400):
            w = [sum(M[i][j]*v[j] for j in range(len(M))) for i in range(len(M))]
            for e in exclude:
                dot = sum(w[i]*e["v"][i] for i in range(len(M)))
                w = [w[i] - dot*e["v"][i] for i in range(len(M))]
            norm = math.sqrt(sum(x*x for x in w)) or 1.0
            v = [x/norm for x in w]
        lam = sum(v[i]*sum(M[i][j]*v[j] for j in range(len(M))) for i in range(len(M)))
        return {"v": v, "lam": max(0.0, lam)}
    e1 = top_eig(B, [])
    e2 = top_eig(B, [e1])
    return [[e1["v"][i]*math.sqrt(e1["lam"]), e2["v"][i]*math.sqrt(e2["lam"])] for i in range(n)]

# ────────── main ──────────

PRIORITY_DIR_PATTERNS = [
    r"FILING_", r"MAY5_PREPARATION", r"JUNE16", r"coercive",
    r"l2_reports", r"legal_filings", r"legal_docs_pdf",
    r"Volkmar", r"DISCOVERY_ADMISSIONS",
]
SKIP_DIR_PATTERNS = [
    r"/\.git/", r"/node_modules/", r"/sdata/", r"/qdrant", r"/data/",
    r"/__pycache__/", r"/\.venv/", r"/dist/",
]
def collect_files(root: Path, max_files: int) -> list[Path]:
    files = []
    seen = set()
    def add(p: Path):
        sp = str(p)
        if sp in seen: return
        if any(re.search(rx, sp) for rx in SKIP_DIR_PATTERNS): return
        if p.suffix.lower() not in READERS: return
        if not p.is_file(): return
        seen.add(sp); files.append(p)
    # priority pass — directories likely containing real filings
    for sub in root.iterdir() if root.is_dir() else []:
        if any(re.search(rx, str(sub), re.I) for rx in PRIORITY_DIR_PATTERNS):
            for p in sub.rglob("*"): add(p)
    # then everything else
    for p in root.rglob("*"):
        add(p)
        if len(files) >= max_files * 3: break
    return files

def make_anon_id(path: Path, cohort: str, seq: int) -> str:
    return f"{cohort}{seq:02d}"

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="root directory to scan")
    ap.add_argument("--out", default="corpus_scores.json")
    ap.add_argument("--max-files", type=int, default=400)
    ap.add_argument("--min-words", type=int, default=80)
    ap.add_argument("--max-words", type=int, default=20000)
    args = ap.parse_args(argv)

    root = Path(args.root).expanduser().resolve()
    print(f"[scan] {root}", file=sys.stderr)
    files = collect_files(root, args.max_files * 4)
    print(f"[scan] {len(files)} candidate files", file=sys.stderr)

    docs = []
    counters: dict[str, int] = {"A":0,"B":0,"X":0}
    for fp in files:
        try:
            title, body = READERS[fp.suffix.lower()](fp)
        except Exception:
            continue
        nw = len(re.findall(r"[A-Za-z']+", body))
        if nw < args.min_words or nw > args.max_words:
            continue
        cohort, kind = classify(fp)
        counters[cohort] = counters.get(cohort, 0) + 1
        seq = counters[cohort]
        anon_id = make_anon_id(fp, cohort, seq)
        score = score_document(body, title, path=str(fp))
        docs.append({
            "id": anon_id,
            "cohort": cohort,
            "kind": kind,
            "year": year_from_path(fp, 0),
            "n_words": score.n_words,
            "n_sentences": score.n_sentences,
            "composite": round(score.composite, 4),
            "axes": {k: round(v, 4) for k, v in score.axes.items()},
            "diagnostics": {k: round(v, 4) for k, v in score.diagnostics.items()},
            "vector": [round(x, 4) for x in score.feature_vector()],
        })
        if len(docs) >= args.max_files: break

    print(f"[score] {len(docs)} documents", file=sys.stderr)
    print(f"[cohorts] " + ", ".join(f"{c}={counters[c]}" for c in counters), file=sys.stderr)

    X = [d["vector"] for d in docs]
    pca = _pca2(X) if X else []
    mds = _mds2(X) if X else []

    manifest = {
        "feature_names":  OrwellScore.feature_names(),
        "feature_labels": [l for _, l in [(k, k.replace("_"," ").title()) for k in WEIGHTS.keys()]] +
                          [lbl for _, lbl in DIAGNOSTIC_AXES],
        "weights":        WEIGHTS,
        "n_composite":    len(WEIGHTS),
        "documents":      docs,
        "projections": {
            "pca": [[round(x,4), round(y,4)] for x,y in pca],
            "mds": [[round(x,4), round(y,4)] for x,y in mds],
        },
    }
    Path(args.out).write_text(json.dumps(manifest, indent=2))
    print(f"[write] {args.out} ({len(docs)} docs, {len(OrwellScore.feature_names())} dims)", file=sys.stderr)

if __name__ == "__main__":
    main()
