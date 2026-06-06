#!/usr/bin/env python3
"""
orwell_judge.py — reproducible LLM-as-judge scorer for the 35-doc Orwell Index plot.

Scores the EXACT 35 documents referenced in jthorvaldur.github.io/orwell/index.html,
using a pinned model (claude-haiku-4-5), temperature 0, fixed 7-axis rubric, cached
to judge_scores.json. Re-running uses the cache; delete an entry to re-score that doc.

    source ~/.oh-my-zsh/custom/keys.zsh
    python3 orwell_judge.py                        # score the canonical 35 docs
    python3 orwell_judge.py --manifest             # print full path manifest and exit
    python3 orwell_judge.py --div-legal /path/to   # override div_legal root

Composite = Σ(axis × weight) with v1 weights — identical to orwell_score.py.

MANIFEST — full paths to the 35 documents (mapped from index.html DOCS labels):
Each entry: (date, author, label, path_relative_to_div_legal)
Paths were located 2026-06-06 via keyword search across div_legal/.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys, time, urllib.request
from pathlib import Path

MODEL = "claude-haiku-4-5"   # pinned — do not change without re-running and updating scores
API   = "https://api.anthropic.com/v1/messages"
DIV_LEGAL = Path.home() / "GitHub" / "div_legal"

# ── Canonical 35-document manifest ──────────────────────────────────────────
# Maps every entry in index.html DOCS[] to its full path under div_legal/.
# Located 2026-06-06 via keyword search across div_legal/.
# If a file has moved, update the path here and delete its cache entry to re-score.
MANIFEST = [
    # (date, author, label, path_relative_to_div_legal)
    # ── Our filings (petitioner, pro se) ──────────────────────────────────
    ("2024-09-22","respondent","Response to Contempt Petition",
        "FILING_PACKAGE_20260417/FILE_2_contempt_response.pdf"),
    ("2024-10-15","respondent","Fee Waiver Application",
        "fda_history/JOEL_FEE_WAIVER_20260525.md"),
    ("2024-12-03","respondent","Motion to Modify Purge",
        "MAY19_PACKAGE/MOTION_TO_MODIFY_PURGE.md"),
    ("2025-01-15","respondent","Motion for Findings",
        "sdata/md/51511a7f_motion_for_required_findings.md"),
    ("2025-02-12","respondent","Document Production (861 files)",
        "MAY19_FDA_PRODUCTION_REDACTED/gemini/gemini_2022-10.pdf"),
    ("2025-03-05","respondent","Motion re: Statutory Definition",
        "sdata/md/83884f32_motion_re_economic_retardation_court_pdf.md"),
    ("2025-03-18","respondent","Certificate of Service",
        "MAY5_PREPARATION/CERTIFICATE_OF_SERVICE.md"),
    ("2025-04-10","respondent","Discovery Requests (Rule 214)",
        "data/conniff_file_transfer/extracted/DISCOVERY/2026.03.02 NOFS for 214 - Thorarinson (1).pdf"),
    ("2025-05-12","respondent","Motion for Constitutional Findings",
        "JUNE16_HEARING/filed/MOTION_FOR_REQUIRED_FINDINGS.md"),
    ("2025-06-03","respondent","Supplemental Brief",
        "FILING_SUPPLEMENTAL_20260429/01_supplemental_brief.md"),
    ("2025-06-20","respondent","Direct Email (Settlement Offer)",
        "SETTLEMENT_AGGRESSIVE/DEMAND_FOR_SETTLEMENT.md"),
    ("2025-07-10","respondent","Motion for Sanctions",
        "JUNE5_ENFORCEMENT/MOTION_RULE_137_SANCTIONS.md"),
    # ── Opposing counsel filings ───────────────────────────────────────────
    ("2024-09-15","petitioner_counsel","Petition for Contempt (1st)",
        "CONTEMPT_HEATHER/PETITION_FOR_CONTEMPT.md"),
    ("2024-10-08","petitioner_counsel","Motion for Employment Diary",
        "sdata/md/7bf87665_2026_02_26_19_47_re_irmo_thorarinsonatagan_24_d_6724_motion_for_job_diary_and.md"),
    ("2024-11-12","petitioner_counsel","Proposed Order (Scheduling)",
        "TRIAL_ORDER_OBJECTION/PROPOSED_AMENDED_TRIAL_ORDER.md"),
    ("2025-01-08","petitioner_counsel","Petition for Contempt (2nd)",
        "MAY19_PACKAGE/AMENDED_PETITION_FOR_CONTEMPT.md"),
    ("2025-02-20","petitioner_counsel","Objection to Production Scope",
        "MAY19_FILING/PRODUCTION_COVER_LETTER.md"),
    ("2025-03-12","petitioner_counsel","Response to Statutory Motion",
        "MAY5_PREPARATION/01_may11_response_strategy.md"),
    ("2025-04-02","petitioner_counsel","Petition for Contempt (3rd)",
        "opposing_counsel_filings/2026_april/2026_04_17_Heather_Third_Contempt_Petition.pdf"),
    ("2025-05-05","petitioner_counsel","Proposed Denial Order",
        "TRIAL_ORDER_OBJECTION/REVISED_ORDER_JOEL_VERSION.md"),
    ("2025-07-01","petitioner_counsel","Motion to Strike",
        "MAY5_PREPARATION/COURTESY_COPIES/08_Motion_Strike_Financial_Affidavit.pdf"),
    ("2024-11-20","petitioner_counsel","Email: Scheduling Only",
        "sdata/md/e52bda83_deposition_scheduling_request_may_28_2026_9_00_am_central_in_re_marriage_of_thor.md"),
    ("2025-02-05","petitioner_counsel","Email: 'Nothing Attached'",
        "EMAIL_CHAIN_MAY6/06_fiduciary_pressure.md"),
    ("2025-04-22","petitioner_counsel","Email: Deposition Scheduling",
        "sdata/md/68ef4183_deposition_scheduling_request_may_28_2026_9_00_am_central_in_re_marriage_of_thor.md"),
    # ── Heather (petitioner) direct filings ───────────────────────────────
    ("2024-08-20","petitioner","Financial Disclosure Affidavit (Original)",
        "sdata/md/b916323a_2025_01_04_01_08_fwd_financial_disclosure_affidavit.md"),
    ("2025-05-20","petitioner","Corrected Financial Affidavit",
        "MAY5_PREPARATION/UPDATED_FINANCIAL_AFFIDAVIT.md"),
    # ── Court orders ──────────────────────────────────────────────────────
    ("2024-11-05","court","Order on Contempt",
        "sdata/md/537e9a6f_2026_05_05_atagan_contempt_order_post_hearing_clean_pdf.md"),
    ("2025-02-05","court","Allocation Judgment",
        "sdata/md/affbd4c9_2025_05_12_atagan_allocation_judgment_for_review_docx.md"),
    ("2025-04-18","court","Status Order",
        "opposing_counsel_filings/2026_april/2026_04_20_Order_re_3rd_Contempt_Petition.pdf"),
    ("2025-06-15","court","Order on Modification",
        "temp/2026 02 20 - ATAGAN - Order following PTC and EM.pdf"),
    ("2025-07-20","court","Ruling on Discovery",
        "opposing_counsel_filings/2026_april/2026_04_28_Order_Joel's_emergencies_denied.pdf"),
    # ── Government / FOIA ────────────────────────────────────────────────
    ("2024-12-10","government","FOIA Response (Initial Denial)",
        "title_IV_D/FOIA_REQUEST_IV_D.pdf"),
    ("2025-01-22","government","Child Support Agency Response",
        "title_IV_D/foia_response_analysis.md"),
    ("2025-03-25","government","FOIA Referral (Circular)",
        "title_IV_D/FOIA_REQUEST_IV_D.pdf"),
    ("2025-05-30","government","Regulatory Correction Notice",
        "MAY5_PREPARATION/NOTICE_OF_MOTION.md"),
]

# 7 axes + v1 weights (identical to orwell_score.WEIGHTS / the caseledger spec)
WEIGHTS = {
    "stated_vs_actual":    0.20,
    "verbosity":           0.15,
    "referral_loops":      0.15,
    "agency_hiding":       0.15,
    "internal_contradict": 0.15,
    "template_ratio":      0.10,
    "exemption_stacking":  0.10,
}

# The rubric IS the semantic-weight definition: what the judge looks for per axis,
# with anchor examples lifted from caseledger/docs/orwell_index_spec.md.
RUBRIC = """You are scoring a legal/government document on the ORWELL INDEX — how much it
obscures, deflects, or contradicts its own stated purpose. 0.0 = says what it means and does
what it says. 1.0 = full doublespeak (e.g. a "Freedom of Information" reply that withholds info).

Score each of these 7 axes from 0.0 to 1.0. Judge ONLY the text provided.

1. stated_vs_actual (most important): does the document do what its title/purpose says?
   "Financial Disclosure" that omits accounts = 1.0. "Motion to Modify Purge" that modifies purge = 0.0.
2. verbosity: words spent vs information conveyed. A 5-page denial that says "no" = high. A 2-sentence answer = low.
3. referral_loops: "contact X instead / refer to Y" deflection. Circular referral = 1.0. None = 0.0.
4. agency_hiding: passive voice hiding who acts ("the request was denied") vs named actor ("I, Officer X, deny") = low.
5. internal_contradict: claims that contradict each other or known facts (e.g. "$0 income" with "$21k/mo expenses").
6. template_ratio: share that is boilerplate/identical-across-filings vs case-specific. ~90% template = 0.9.
7. exemption_stacking: how many reasons/statutes cited for "no". 1 = ~0.0, 5+ = ~0.8 (fishing for any that stick).

Return ONLY strict JSON, no prose:
{"stated_vs_actual":0.0,"verbosity":0.0,"referral_loops":0.0,"agency_hiding":0.0,"internal_contradict":0.0,"template_ratio":0.0,"exemption_stacking":0.0,"rationale":"<=15 words"}"""

def judge(title: str, body: str, key: str) -> dict:
    body = body[:14000]   # cap context for cost/latency; enough for scoring
    payload = {
        "model": MODEL, "max_tokens": 300, "temperature": 0,
        "system": RUBRIC,
        "messages": [{"role": "user", "content": f"TITLE: {title}\n\nDOCUMENT:\n{body}"}],
    }
    req = urllib.request.Request(API, data=json.dumps(payload).encode(),
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        txt = json.loads(r.read())["content"][0]["text"]
    m = re.search(r"\{.*\}", txt, re.S)
    d = json.loads(m.group(0))
    return d

def composite(axes: dict) -> float:
    return round(sum(axes.get(k, 0.0) * w for k, w in WEIGHTS.items()), 4)

def read_file(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        try:
            out = subprocess.run(["pdftotext", "-enc", "UTF-8", str(path), "-"],
                                 capture_output=True, text=True, timeout=60)
            return out.stdout
        except Exception:
            return ""
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--div-legal", default=str(DIV_LEGAL))
    ap.add_argument("--out", default="judge_scores.json")
    ap.add_argument("--manifest", action="store_true", help="print full path manifest and exit")
    args = ap.parse_args()

    root = Path(args.div_legal).expanduser()

    if args.manifest:
        print(f"{'date':12} {'author':20} {'exists':6}  full_path")
        print("-" * 90)
        for date, author, label, rel in MANIFEST:
            p = root / rel
            print(f"{date:12} {author:20} {'✓' if p.exists() else '✗':6}  {p}")
        return 0

    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("ANTHROPIC_API_KEY not set — run: source ~/.oh-my-zsh/custom/keys.zsh", file=sys.stderr); return 2

    print(f"judging {len(MANIFEST)} canonical docs with {MODEL} @ temp 0")
    print(f"div_legal root: {root}\n")

    cache = {}
    outp = Path(args.out)
    if outp.exists():
        cache = {d["label"]: d for d in json.loads(outp.read_text()).get("documents", [])}

    docs = []
    for i, (date, author, label, rel) in enumerate(MANIFEST, 1):
        if label in cache:
            docs.append(cache[label]); print(f"  [{i:2}/{len(MANIFEST)}] cached   {label}"); continue
        path = root / rel
        if not path.exists():
            print(f"  [{i:2}/{len(MANIFEST)}] MISSING  {label}\n           → {path}", file=sys.stderr)
            continue
        body = read_file(path)
        if len(re.findall(r"[A-Za-z']+", body)) < 40:
            print(f"  [{i:2}/{len(MANIFEST)}] TOO SHORT {label}"); continue
        try:
            axes = judge(label, body, key)
        except Exception as e:
            print(f"  [{i:2}/{len(MANIFEST)}] ERROR  {label}: {e}", file=sys.stderr); continue
        rationale = axes.pop("rationale", "")
        rec = {"label": label, "date": date, "author": author,
               "file": str(path), "composite": composite(axes),
               "axes": {k: round(float(axes.get(k, 0.0)), 3) for k in WEIGHTS},
               "rationale": rationale}
        docs.append(rec)
        print(f"  [{i:2}/{len(MANIFEST)}] {rec['composite']:.3f}  [{author}]  {label}")
        outp.write_text(json.dumps({"model": MODEL, "weights": WEIGHTS, "documents": docs}, indent=2))
        time.sleep(0.2)

    def mean(author):
        v = [d["composite"] for d in docs if d["author"] == author]
        return sum(v)/len(v) if v else 0.0
    om  = mean("respondent")
    tm  = sum(mean(a) for a in ("petitioner_counsel",)) / 1
    outp.write_text(json.dumps({"model": MODEL, "weights": WEIGHTS,
        "ours_mean": round(om,4), "theirs_mean": round(tm,4), "documents": docs}, indent=2))
    print("\n" + "="*60)
    by_author = {}
    for d in docs:
        by_author.setdefault(d["author"], []).append(d["composite"])
    for author, vals in sorted(by_author.items()):
        print(f"  {author:20} n={len(vals):2}  mean={sum(vals)/len(vals):.3f}  range {min(vals):.2f}–{max(vals):.2f}")
    print(f"\nour (respondent) mean : {om:.3f}")
    print(f"their (counsel) mean  : {tm:.3f}")
    print(f"separation            : {tm-om:+.3f}   (v1 target ≈ +0.66)")
    print(f"wrote {args.out}  ({len(docs)}/{len(MANIFEST)} docs scored)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
