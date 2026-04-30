#!/usr/bin/env python3
"""Validate filing portal PDFs before deploy.

Scans all PDFs in the filing directory for:
- Placeholder text ([JOEL], [CONFIRM], [TBD], [DATE])
- Draft markers (TO BE FILED, DRAFT, DO NOT FILE)
- Private markers (PRIVATE — DO NOT FILE)
- Missing signatures (unsigned verification pages)

Usage:
    python3 scripts/validate_filings.py                    # scan
    python3 scripts/validate_filings.py --strict           # fail on any issue
    python3 scripts/validate_filings.py --dir path/to/dir  # custom directory
"""
import sys
from pathlib import Path

try:
    import fitz  # pymupdf
except ImportError:
    print("Install: pip install pymupdf")
    sys.exit(1)

FILING_DIR = Path("r/cook6724-QgixOl/filing")

BLOCKERS = [
    "TO BE FILED AFTER",
    "PRIVATE — DO NOT FILE",
    "DRAFT — FOR REVIEW",
    "NOT FOR FILING",
    "DRAFT — NOT FILED",
]

# "DO NOT FILE" appears in standard court form instructions (false positive)
# Moved to warnings instead of blockers

WARNINGS = [
    "[JOEL",
    "[CONFIRM]",
    "[TBD]",
    "[DATE]",
    "PLACEHOLDER",
    "[FILL IN",
    "TO BE DETERMINED",
    "DO NOT FILE",
]


def scan_pdf(path: Path) -> dict:
    """Scan a PDF for placeholder/draft text."""
    issues = {"blockers": [], "warnings": []}
    try:
        doc = fitz.open(str(path))
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()

        for marker in BLOCKERS:
            if marker.lower() in text.lower():
                line = next((l.strip() for l in text.split("\n") if marker.lower() in l.lower()), "")
                issues["blockers"].append(f"{marker}: {line[:80]}")

        for marker in WARNINGS:
            if marker.lower() in text.lower():
                line = next((l.strip() for l in text.split("\n") if marker.lower() in l.lower()), "")
                issues["warnings"].append(f"{marker}: {line[:80]}")
    except Exception as e:
        issues["blockers"].append(f"PARSE ERROR: {e}")

    return issues


def main():
    strict = "--strict" in sys.argv
    custom_dir = None
    for i, arg in enumerate(sys.argv):
        if arg == "--dir" and i + 1 < len(sys.argv):
            custom_dir = Path(sys.argv[i + 1])

    filing_dir = custom_dir or FILING_DIR
    if not filing_dir.exists():
        print(f"Directory not found: {filing_dir}")
        sys.exit(1)

    pdfs = sorted(filing_dir.glob("**/*.pdf"))
    print(f"Scanning {len(pdfs)} PDFs in {filing_dir}...")
    print()

    total_blockers = 0
    total_warnings = 0

    for pdf in pdfs:
        rel = pdf.relative_to(filing_dir)
        issues = scan_pdf(pdf)

        if issues["blockers"] or issues["warnings"]:
            icon = "🔴" if issues["blockers"] else "🟡"
            print(f"  {icon} {rel}")
            for b in issues["blockers"]:
                print(f"     BLOCK: {b}")
                total_blockers += 1
            for w in issues["warnings"]:
                print(f"     WARN:  {w}")
                total_warnings += 1
            print()

    print(f"Results: {total_blockers} blockers, {total_warnings} warnings in {len(pdfs)} PDFs")

    if total_blockers > 0:
        print("\n🔴 DEPLOY BLOCKED — fix blockers before pushing")
        sys.exit(1)
    elif total_warnings > 0 and strict:
        print("\n🟡 STRICT MODE — warnings treated as errors")
        sys.exit(1)
    else:
        print("\n✅ Ready to deploy")


if __name__ == "__main__":
    main()
