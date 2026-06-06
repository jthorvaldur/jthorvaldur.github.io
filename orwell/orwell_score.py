"""
Orwell Index — 7-axis weighted document scorer.

Composite score in [0, 1]; higher = more obscuring relative to stated purpose.

Axes and weights (must sum to 1.0):
    stated_vs_actual      0.20   title/header coherence with body
    verbosity             0.15   words per unique content word
    referral_loops        0.15   "contact X", "see Y", deflection phrases
    agency_hiding         0.15   passive voice / agent-erased constructions
    internal_contradict   0.15   self-negating qualifier patterns
    template_ratio        0.10   boilerplate sentence fraction
    exemption_stacking    0.10   stacked negations / carve-outs

Usage:
    python orwell_score.py path/to/document.txt
    python orwell_score.py path/to/document.txt --title "Motion to Strike"
    python orwell_score.py *.txt --json

Stdlib only. Drop in any Python 3.9+ environment.
"""

from __future__ import annotations
import argparse, json, math, re, sys
from dataclasses import dataclass, asdict, field
from pathlib import Path

# ────────── weights (mirror jthorvaldur.github.io/orwell/) ──────────
WEIGHTS = {
    "stated_vs_actual":    0.20,
    "verbosity":           0.15,
    "referral_loops":      0.15,
    "agency_hiding":       0.15,
    "internal_contradict": 0.15,
    "template_ratio":      0.10,
    "exemption_stacking":  0.10,
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, "weights must sum to 1.0"

STOPWORDS = {
    "the","a","an","of","to","in","and","or","is","are","was","were","be","been",
    "being","that","this","these","those","it","its","as","by","for","on","at",
    "with","from","but","not","no","if","then","than","so","such","which","who",
    "whom","whose","what","when","where","why","how","do","does","did","have",
    "has","had","i","you","he","she","they","we","us","them","my","your","our",
    "their","his","her","me","him","also","any","all","some","each","every",
    "may","might","must","shall","will","would","could","should","can","upon",
}

# ────────── axis implementations ──────────

def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
    return [s.strip() for s in parts if s and s.strip()]

def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", text.lower())

def stated_vs_actual(title: str, body: str) -> float:
    """Jaccard distance between title content words and body's top-N terms.
    0 = title's words dominate the body; 1 = title is unrelated to body."""
    if not title.strip():
        return 0.5  # no title → unknown, return prior
    title_terms = {w for w in _words(title) if w not in STOPWORDS and len(w) > 2}
    if not title_terms:
        return 0.5
    body_words = [w for w in _words(body) if w not in STOPWORDS and len(w) > 2]
    if not body_words:
        return 1.0
    freq: dict[str, int] = {}
    for w in body_words:
        freq[w] = freq.get(w, 0) + 1
    top_n = max(20, len(title_terms) * 5)
    top_terms = {w for w, _ in sorted(freq.items(), key=lambda kv: -kv[1])[:top_n]}
    inter = len(title_terms & top_terms)
    union = len(title_terms | top_terms)
    jacc = inter / union if union else 0
    return max(0.0, min(1.0, 1 - 5 * jacc))

def verbosity(body: str) -> float:
    """Total words ÷ unique content words. Higher ratio = more padding.
    Calibration: ratio 1.5→0.0, 4→0.5, 8→1.0 via squashing."""
    words = [w for w in _words(body) if w not in STOPWORDS]
    if len(words) < 20:
        return 0.0
    ratio = len(words) / max(1, len(set(words)))
    return max(0.0, min(1.0, (ratio - 1.5) / 6.5))

REFERRAL_PATTERNS = [
    r"\bsee\s+(?:exhibit|attachment|paragraph|section|filing)",
    r"\bplease\s+(?:contact|refer|direct|submit)",
    r"\bcontact\s+(?:the|our|opposing|counsel|clerk)",
    r"\brefer(?:red)?\s+to\b",
    r"\bdirected\s+to\b",
    r"\bforwarded\s+to\b",
    r"\bas\s+noted\s+(?:above|below|previously)",
    r"\bas\s+stated\s+(?:in|above|previously)",
    r"\bsubject\s+to\s+the\s+(?:terms|conditions|provisions)",
    r"\bsee\s+attached\b",
    r"\b(?:should|must|may)\s+be\s+directed\s+to\b",
    r"\bin\s+accordance\s+with\b",
]
def referral_loops(body: str) -> float:
    sents = _sentences(body)
    if not sents: return 0.0
    hits = sum(1 for s in sents if any(re.search(p, s, re.I) for p in REFERRAL_PATTERNS))
    rate = hits / len(sents)
    return max(0.0, min(1.0, rate * 4))  # 25% of sentences → saturated

PASSIVE_RE = re.compile(
    r"\b(?:is|are|was|were|be|been|being|am)\s+"
    r"(?:not\s+|never\s+|already\s+|hereby\s+|fully\s+)*"
    r"([a-z]+(?:ed|en))\b",
    re.I,
)
AGENT_ERASE_RE = re.compile(
    r"\b(?:it\s+(?:is|was|has\s+been)\s+(?:determined|found|alleged|claimed|noted|ordered|decided))"
    r"|\b(?:there\s+(?:is|are|was|were)\s+(?:no|insufficient|inadequate))"
    r"|\b(?:has\s+been\s+(?:filed|served|provided|produced))"
    r"|\b(?:was\s+(?:filed|served|provided|produced))",
    re.I,
)
def agency_hiding(body: str) -> float:
    sents = _sentences(body)
    if not sents: return 0.0
    passive_hits = sum(1 for s in sents if PASSIVE_RE.search(s))
    agent_hits   = sum(1 for s in sents if AGENT_ERASE_RE.search(s))
    rate = (passive_hits + 2 * agent_hits) / (2 * len(sents))
    return max(0.0, min(1.0, rate * 2))

CONTRADICT_PATTERNS = [
    r"\bnotwithstanding\b",
    r"\bhowever[,\s]",
    r"\balthough\b",
    r"\bwhile\s+(?:it|the|petitioner|respondent)",
    r"\bbut\s+(?:also|nevertheless|still)\b",
    r"\bdespite\s+the\b",
    r"\bin\s+spite\s+of\b",
    r"\bon\s+the\s+other\s+hand\b",
    r"\bto\s+the\s+extent\s+that\b",
    r"\bsubject\s+to\b",
    r"\bexcept\s+(?:that|as|where|when)\b",
    r"\bprovided[,\s]+however\b",
    r"\b(?:may|might|could)\s+(?:not\s+)?(?:be|have)\s+been\b",
]
def internal_contradict(body: str) -> float:
    sents = _sentences(body)
    if not sents: return 0.0
    hits = sum(1 for s in sents if any(re.search(p, s, re.I) for p in CONTRADICT_PATTERNS))
    rate = hits / len(sents)
    return max(0.0, min(1.0, rate * 3.5))

TEMPLATE_PATTERNS = [
    r"^\s*WHEREFORE\b",
    r"^\s*NOW[,\s]+THEREFORE\b",
    r"\bCOMES?\s+NOW\b",
    r"\bIN\s+WITNESS\s+WHEREOF\b",
    r"\bNOTICE\s+IS\s+HEREBY\s+GIVEN\b",
    r"\bRESPECTFULLY\s+SUBMITTED\b",
    r"\bCERTIFICATE\s+OF\s+SERVICE\b",
    r"\bPRAYS?\s+(?:for|that)\b",
    r"\bIT\s+IS\s+(?:HEREBY\s+)?ORDERED\b",
    r"\bFOR\s+GOOD\s+CAUSE\s+SHOWN\b",
    r"\bAS\s+SET\s+FORTH\s+(?:above|herein|below)\b",
    r"\bpursuant\s+to\s+(?:section|rule|statute)\b",
    r"\bUNDERSIGNED\s+COUNSEL\b",
    r"\bin\s+the\s+above[\-\s]+captioned\b",
]
def template_ratio(body: str) -> float:
    sents = _sentences(body)
    if not sents: return 0.0
    hits = sum(1 for s in sents if any(re.search(p, s, re.I) for p in TEMPLATE_PATTERNS))
    return max(0.0, min(1.0, hits / len(sents) * 6))

EXEMPTION_PATTERNS = [
    r"\bnot\s+(?:entitled|required|obligated|liable|applicable)\b",
    r"\bno\s+(?:obligation|duty|requirement|liability)\b",
    r"\bshall\s+not\b",
    r"\bcannot\s+be\b",
    r"\bwithout\s+(?:prejudice|waiving|admitting|conceding)\b",
    r"\bexempt(?:ed)?\s+from\b",
    r"\bnot\s+subject\s+to\b",
    r"\bdoes\s+not\s+(?:apply|constitute|admit|waive)\b",
    r"\bdenies?\b",
    r"\bobjects?\s+to\b",
    r"\binsufficient\s+(?:information|knowledge|basis)\b",
    r"\bnot\s+(?:relevant|admissible|material|reasonably\s+calculated)\b",
]
def exemption_stacking(body: str) -> float:
    sents = _sentences(body)
    if not sents: return 0.0
    per_sentence = [sum(1 for p in EXEMPTION_PATTERNS if re.search(p, s, re.I)) for s in sents]
    stacked = sum(1 for n in per_sentence if n >= 2)
    any_hit = sum(1 for n in per_sentence if n >= 1)
    rate = (any_hit + 2 * stacked) / (2 * len(sents))
    return max(0.0, min(1.0, rate * 2.5))

# ────────── orchestration ──────────

@dataclass
class OrwellScore:
    path: str
    title: str
    composite: float
    axes: dict[str, float] = field(default_factory=dict)
    weighted: dict[str, float] = field(default_factory=dict)

    def banner(self) -> str:
        bar = "█" * int(self.composite * 30) + "·" * (30 - int(self.composite * 30))
        verdict = "CLEAN" if self.composite < 0.20 else \
                  "MILD" if self.composite < 0.40 else \
                  "ELEVATED" if self.composite < 0.60 else \
                  "HIGH" if self.composite < 0.80 else "SATURATED"
        lines = [
            f"Document : {self.path}",
            f"Title    : {self.title or '(none provided)'}",
            f"Orwell   : {self.composite:.3f}  [{bar}]  {verdict}",
            "",
            f"  {'axis':<22} {'raw':>6} {'×w':>6}   contribution",
            f"  {'-'*22} {'-'*6} {'-'*6}   {'-'*30}",
        ]
        for k, w in WEIGHTS.items():
            raw = self.axes[k]
            contrib = raw * w
            tick = "█" * int(contrib * 80) + "·" * max(0, 16 - int(contrib * 80))
            lines.append(f"  {k:<22} {raw:>6.3f} {w:>6.2f}   {tick}")
        return "\n".join(lines)

def score_document(body: str, title: str = "", path: str = "<stdin>") -> OrwellScore:
    axes = {
        "stated_vs_actual":    stated_vs_actual(title, body),
        "verbosity":           verbosity(body),
        "referral_loops":      referral_loops(body),
        "agency_hiding":       agency_hiding(body),
        "internal_contradict": internal_contradict(body),
        "template_ratio":      template_ratio(body),
        "exemption_stacking":  exemption_stacking(body),
    }
    weighted = {k: axes[k] * WEIGHTS[k] for k in WEIGHTS}
    composite = sum(weighted.values())
    return OrwellScore(path=path, title=title, composite=composite,
                       axes=axes, weighted=weighted)

# ────────── CLI ──────────

def _read(p: Path) -> tuple[str, str]:
    """Return (title, body). If first non-empty line looks like a heading, use it."""
    raw = p.read_text(errors="ignore")
    lines = [l for l in raw.splitlines() if l.strip()]
    title = ""
    if lines and (lines[0].isupper() or lines[0].startswith("#") or len(lines[0]) < 90):
        title = lines[0].lstrip("# ").strip()
    return title, raw

def main(argv=None):
    ap = argparse.ArgumentParser(description="Orwell Index — score document doublespeak.")
    ap.add_argument("paths", nargs="+", help="document file(s); use - for stdin")
    ap.add_argument("--title", help="override title used by stated-vs-actual")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of banner")
    args = ap.parse_args(argv)

    results = []
    for p in args.paths:
        if p == "-":
            body = sys.stdin.read()
            title = args.title or ""
            r = score_document(body, title, path="<stdin>")
        else:
            path = Path(p)
            t, body = _read(path)
            r = score_document(body, args.title or t, path=str(path))
        results.append(r)

    if args.json:
        print(json.dumps([asdict(r) for r in results], indent=2))
    else:
        for r in results:
            print(r.banner())
            print()

if __name__ == "__main__":
    main()
