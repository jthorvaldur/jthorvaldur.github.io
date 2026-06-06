#!/usr/bin/env python3
"""
replicate_experiment.py — reproduce the original Orwell-Index comparison on the
REAL case documents: all our filings vs. what opposing counsel sent us
(certificates of service excluded).

Background / provenance
-----------------------
The original "v1" plot (Respondent ≈0.04, Opposing ≈0.70) was NOT produced by
this scorer. Its numbers are the hand-authored *Sample Scores* table in
    caseledger/docs/orwell_index_spec.md   (lines ~147-166)
which the spec itself lists as a TODO for the engineering team
("Build the 7-axis scorer as a Python module"). They were target estimates,
displayed in jthorvaldur.github.io/orwell/index.html, written before any code.

This script is the actual measured experiment those estimates anticipated:
deterministic, auditable, re-runnable. It does NOT hard-code the targets — it
scores real text with the committed 7-axis scorer (orwell_score.py) and reports
whatever separation the documents actually produce.

Cohorts are defined by EXPLICIT rules and every file's assignment is printed,
so we don't repeat the build_corpus.py mislabeling (where the opposing cohort
collapsed to 5 docs and high-scoring docs leaked into "neutral").

Usage
-----
    python3 replicate_experiment.py \
        --div-legal /Users/jthor/GitHub/div_legal \
        --out experiment_scores.json

Requires: orwell_score.py (same dir); `pdftotext` on PATH for opposing PDFs.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import orwell_score as scorer  # composite = Σ(axis × v1 weight); see WEIGHTS

# ─────────────────────────── cohort rules ───────────────────────────
# OURS  = documents we drafted/filed.  THEIRS = documents opposing counsel sent.
# Each rule: (cohort, root-glob relative to --div-legal, predicate on filename).
# Predicates keep the assignment transparent and adjustable.

def is_cert(name: str) -> bool:
    """Certificate-of-service / certification docs — excluded per instruction."""
    return bool(re.search(r"cert(ificate)?|_cos\b|certificate_of_service", name, re.I))

# The opposing_counsel_filings/ folder is the full back-and-forth: filenames are
# prefixed by author after the date. Heather_* = theirs, Joel_* = ours,
# Order_*/NOM/NOS = court/procedural (excluded from the two-party contrast).
def opposing_author(name: str) -> str | None:
    base = re.sub(r"^\d{4}_\d{2}_\d{2}_", "", name)  # strip leading date
    if re.match(r"Heather", base, re.I):                return "THEIRS"
    if re.match(r"Joel", base, re.I):                   return "OURS"
    if re.match(r"(Order|NOM|NOS|NOF)\b", base, re.I):  return None  # court/procedural
    return "THEIRS"  # unprefixed filings in this folder are opposing by default

OURS_GLOBS = [
    "FILING_*/**/*.md",
    "MAY5_COURT_PACKAGE/**/*.md",
    "MAY19_FILING/**/*.md",
    "MAY19_PACKAGE/**/*.md",
    "JUNE16_HEARING/**/*.md",
    "JUNE5_ENFORCEMENT/**/*.md",
    "CONTEMPT_HEATHER/**/*.md",   # our drafted petition material
    "TRIAL_ORDER_OBJECTION/**/*.md",
]
THEIRS_GLOBS = ["opposing_counsel_filings/**/*.pdf"]

# ─────────────────────────── text extraction ───────────────────────────
def read_pdf(path: Path) -> str:
    try:
        out = subprocess.run(["pdftotext", "-enc", "UTF-8", str(path), "-"],
                             capture_output=True, text=True, timeout=60)
        return out.stdout
    except Exception as e:                      # pragma: no cover
        print(f"  ! pdftotext failed on {path.name}: {e}", file=sys.stderr)
        return ""

def read_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return read_pdf(path)
    try:
        t = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""
    if path.suffix.lower() in (".html", ".htm"):
        t = re.sub(r"<[^>]+>", " ", t)
    return t

def title_from(path: Path) -> str:
    return re.sub(r"[_\-]+", " ", path.stem)

# ─────────────────────────── collection ───────────────────────────
def collect(div_legal: Path) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()

    def add(path: Path, cohort: str):
        key = path.name.lower()
        if key in seen:           # avoid md/pdf twins of the same filing
            return
        seen.add(key)
        items.append({"path": path, "cohort": cohort})

    for g in OURS_GLOBS:
        for p in sorted(div_legal.glob(g)):
            if p.is_file() and not is_cert(p.name):
                add(p, "OURS")
    for g in THEIRS_GLOBS:
        for p in sorted(div_legal.glob(g)):
            if not p.is_file() or is_cert(p.name):
                continue
            who = opposing_author(p.name)
            if who is None:        # court/procedural — skip
                continue
            add(p, who)
    return items

# ─────────────────────────── main ───────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--div-legal", default=str(Path.home() / "GitHub" / "div_legal"))
    ap.add_argument("--out", default="experiment_scores.json")
    ap.add_argument("--min-words", type=int, default=40)
    args = ap.parse_args()

    div_legal = Path(args.div_legal).expanduser()
    if not div_legal.exists():
        print(f"div_legal not found: {div_legal}", file=sys.stderr); return 2

    items = collect(div_legal)
    docs, skipped = [], []
    for it in items:
        body = read_text(it["path"])
        nwords = len(re.findall(r"[A-Za-z']+", body))
        if nwords < args.min_words:
            skipped.append((it["path"].name, nwords)); continue
        r = scorer.score_document(body, title_from(it["path"]))
        docs.append({
            "file": str(it["path"].relative_to(div_legal)),
            "cohort": it["cohort"],
            "n_words": nwords,
            "composite": round(r.composite, 4),
            "axes": {k: round(v, 4) for k, v in r.axes.items()},
        })

    # ---- report (auditable: every file + its cohort + score) ----
    def fmt(group):
        g = [d for d in docs if d["cohort"] == group]
        m = sum(d["composite"] for d in g) / len(g) if g else 0.0
        return g, m

    ours, ours_mean = fmt("OURS")
    theirs, theirs_mean = fmt("THEIRS")

    print("=" * 74)
    print("ORWELL INDEX — measured experiment (our filings vs theirs, certs excluded)")
    print("=" * 74)
    for grp, label in (("OURS", "OUR FILINGS"), ("THEIRS", "WHAT THEY SENT US")):
        g = [d for d in docs if d["cohort"] == grp]
        print(f"\n{label}  (n={len(g)})")
        for d in sorted(g, key=lambda x: -x["composite"]):
            print(f"  {d['composite']:.3f}  {d['file']}")
    if skipped:
        print(f"\nskipped {len(skipped)} docs under {args.min_words} words")

    print("\n" + "-" * 74)
    print(f"OUR mean composite   : {ours_mean:.3f}   (n={len(ours)})")
    print(f"THEIR mean composite : {theirs_mean:.3f}   (n={len(theirs)})")
    print(f"separation (them−us) : {theirs_mean - ours_mean:+.3f}")
    print(f"v1 spec targets      : ours≈0.04  theirs≈0.70  (hand-authored, not measured)")
    print("-" * 74)

    out = {
        "weights": scorer.WEIGHTS,
        "ours_mean": round(ours_mean, 4),
        "theirs_mean": round(theirs_mean, 4),
        "documents": docs,
    }
    Path(args.out).write_text(json.dumps(out, indent=2))
    print(f"\nwrote {args.out}  ({len(docs)} docs)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
