#!/usr/bin/env bash
# Check all HTML files for required SEO meta tags
# Run before pushing: ./scripts/check-seo.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

FAIL=0
CHECKED=0

for f in $(find . -name "*.html" -not -path "./.git/*" -not -path "./.venv/*" | sort); do
  CHECKED=$((CHECKED + 1))
  MISSING=""

  grep -q 'name="description"' "$f" || MISSING="$MISSING description"
  grep -q 'og:title' "$f" || MISSING="$MISSING og:title"
  grep -q 'og:description' "$f" || MISSING="$MISSING og:description"
  grep -q 'twitter:card' "$f" || MISSING="$MISSING twitter:card"

  if [ -n "$MISSING" ]; then
    echo -e "${RED}FAIL${NC} $f — missing:${YELLOW}$MISSING${NC}"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Checked $CHECKED files. $FAIL missing tags."
if [ $FAIL -gt 0 ]; then
  exit 1
else
  echo -e "${GREEN}All files have required SEO tags.${NC}"
fi
