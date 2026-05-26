#!/bin/bash
# Refresh v2.html with latest data from PostgreSQL
# Run from anywhere — uses absolute paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Exporting word_leverage data from PostgreSQL..."

PGPASSWORD=caseledger_dev psql -h localhost -p 5433 -U caseledger -d caseledger -t -A -c "
SELECT json_agg(t ORDER BY t.score DESC)
FROM (
  SELECT word, leverage_score as score, trigger_breadth as tb, effect_magnitude as em,
         statutory_depth as sd, cross_jurisdiction as cj, cognitive_friction as cf,
         asymmetry as asi, jurisdiction as jur,
         COALESCE(array_to_string(statute_cites, '; '), '') as statutes,
         COALESCE(notes, '') as notes
  FROM word_leverage
  ORDER BY leverage_score DESC
) t;" 2>/dev/null | python3 -c "
import json, sys, re

raw = sys.stdin.read().strip()
data = json.loads(raw)
for d in data:
    d['as'] = d.pop('asi')

new_data_str = json.dumps(data, ensure_ascii=False)

with open('$SCRIPT_DIR/v2.html') as f:
    html = f.read()

pattern = r'const data = \[.*?\];\n'
replacement = f'const data = {new_data_str};\n'
html_new = re.sub(pattern, replacement, html, count=1, flags=re.DOTALL)

with open('$SCRIPT_DIR/v2.html', 'w') as f:
    f.write(html_new)

print(f'{len(data)} words across {len(set(d[\"jur\"] for d in data))} jurisdictions → v2.html ({len(html_new):,} bytes)')
"
