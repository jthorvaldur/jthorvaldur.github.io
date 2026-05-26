#!/bin/bash
# Refresh v2.html with latest data from PostgreSQL
# Run from: ~/GitHub/jthorvaldur.github.io/legal-words/

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
) t;" > /tmp/wl_raw.json

# Rename 'asi' to 'as' (reserved word in SQL)
python3 -c "
import json, sys
with open('/tmp/wl_raw.json') as f:
    data = json.load(f)
for d in data:
    d['as'] = d.pop('asi')
print(f'Exported {len(data)} words across {len(set(d[\"jur\"] for d in data))} jurisdictions', file=sys.stderr)
print(json.dumps(data, ensure_ascii=False))
" > /tmp/wl_js.json 2>&1

WORD_COUNT=$(python3 -c "import json; print(len(json.load(open('/tmp/wl_js.json'))))")
echo "Got $WORD_COUNT words"

# Replace the data line in v2.html
python3 -c "
import re
with open('$SCRIPT_DIR/v2.html') as f:
    html = f.read()
with open('/tmp/wl_js.json') as f:
    new_data = f.read().strip()
html = re.sub(r'const data = \[.*?\];', f'const data = {new_data};', html, flags=re.DOTALL)
with open('$SCRIPT_DIR/v2.html', 'w') as f:
    f.write(html)
print('Updated v2.html')
"

echo "Done. Open v2.html to see the updated visualization."
