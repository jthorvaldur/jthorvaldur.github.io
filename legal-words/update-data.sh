#!/bin/bash
# Refresh data files from PostgreSQL — HTML pages fetch these via JS
# Run from anywhere. Regenerates data/*.json only, never touches HTML.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"
mkdir -p "$DATA_DIR"

echo "Exporting from PostgreSQL..."

# 1. words.json — all non-IATE + top IATE per language (for v2.html)
PGPASSWORD=caseledger_dev psql -h localhost -p 5433 -U caseledger -d caseledger -t -A -c "
SELECT json_agg(t ORDER BY t.score DESC) FROM (
    SELECT word, leverage_score as score, trigger_breadth as tb, effect_magnitude as em,
           statutory_depth as sd, cross_jurisdiction as cj, cognitive_friction as cf,
           asymmetry as asi, jurisdiction as jur, COALESCE(domain,'family') as domain,
           COALESCE(notes,'') as notes, COALESCE(array_to_string(statute_cites,'; '),'') as statutes
    FROM word_leverage WHERE jurisdiction NOT LIKE 'EU-%%'
    UNION ALL
    SELECT word, leverage_score, trigger_breadth, effect_magnitude,
           statutory_depth, cross_jurisdiction, cognitive_friction,
           asymmetry, jurisdiction, COALESCE(domain,'family'),
           COALESCE(notes,''), COALESCE(array_to_string(statute_cites,'; '),'')
    FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY jurisdiction ORDER BY cognitive_friction DESC, leverage_score DESC) as rn
          FROM word_leverage WHERE jurisdiction LIKE 'EU-%%') ranked WHERE rn <= 150
) t;" 2>/dev/null | python3 -c "
import json, sys
data = json.loads(sys.stdin.read().strip())
for d in data: d['as'] = d.pop('asi', 0.5)
seen = {}
for d in data:
    k = f\"{d['word']}::{d['jur']}\"
    if k not in seen or d['score'] > seen[k]['score']: seen[k] = d
result = sorted(seen.values(), key=lambda x: -x['score'])
json.dump(result, open('$DATA_DIR/words.json','w'), ensure_ascii=False)
print(f'words.json: {len(result)} words')
"

# 2. embeddings.json — needs scikit-learn for t-SNE/PCA
if python3 -c "import sklearn" 2>/dev/null; then
    python3 << PYEOF
import json, numpy as np
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA

data = json.load(open('$DATA_DIR/words.json'))
axes = ['tb','em','sd','cj','cf']
for d in data: d['asym'] = d.get('as', 0.5)
X = np.array([[d.get(a,0.5) for a in axes]+[d.get('asym',0.5)] for d in data], dtype=np.float64)

tsne2 = TSNE(n_components=2, perplexity=30, random_state=42, learning_rate='auto', init='pca', max_iter=1000)
p2 = tsne2.fit_transform(X)
for i in range(2):
    r = p2[:,i].max()-p2[:,i].min()
    if r>0: p2[:,i]=(p2[:,i]-p2[:,i].min())/r*2-1

pca3 = PCA(n_components=3)
p3p = pca3.fit_transform(X)
for i in range(3):
    r = p3p[:,i].max()-p3p[:,i].min()
    if r>0: p3p[:,i]=(p3p[:,i]-p3p[:,i].min())/r*2-1

tsne3 = TSNE(n_components=3, perplexity=30, random_state=42, learning_rate='auto', init='pca', max_iter=1000)
p3t = tsne3.fit_transform(X)
for i in range(3):
    r = p3t[:,i].max()-p3t[:,i].min()
    if r>0: p3t[:,i]=(p3t[:,i]-p3t[:,i].min())/r*2-1

words = [{'w':d['word'][:40],'s':round(d['score'],3),'d':d.get('domain','family'),
          'j':d.get('jur',''),'f':d.get('sd',1)==0 and d.get('cf',0)>=0.85,
          'n':d.get('notes','')[:120],
          'ax':[round(d.get(a,0.5),2) for a in axes]+[round(d.get('asym',0.5),2)],
          't2':[round(float(p2[i,0]),4),round(float(p2[i,1]),4)],
          'p3':[round(float(p3p[i,0]),4),round(float(p3p[i,1]),4),round(float(p3p[i,2]),4)],
          't3':[round(float(p3t[i,0]),4),round(float(p3t[i,1]),4),round(float(p3t[i,2]),4)]}
         for i,d in enumerate(data)]

json.dump({'words':words,'pca_var':[round(float(v),3) for v in pca3.explained_variance_ratio_[:3]]},
          open('$DATA_DIR/embeddings.json','w'), ensure_ascii=False)
print(f'embeddings.json: {len(words)} words')
PYEOF
else
    echo "sklearn not available — skipping embeddings.json"
fi

# 3. tree.json — hierarchical PCA
python3 << PYEOF
import json, numpy as np
from collections import defaultdict

data = json.load(open('$DATA_DIR/words.json'))
for d in data:
    if 'asym' not in d: d['asym'] = d.get('as', 0.5)
axes = ['tb','em','sd','cj','cf','asym']
us = set('AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY'.split(','))
tmap = {
    'US Common Law': ([s for s in us]+['ALL'],'common_law'),
    'UK/Commonwealth': (['GB','AU','CA-ON'],'common_law'),
    'EU Terminology': ([j for j in set(d['jur'] for d in data) if j.startswith('EU-')],'eu_lang'),
    'Germanic Civil': (['DE','CH'],'civil_law'),'Romanistic Civil': (['FR','IT','BR','MX'],'civil_law'),
    'Nordic Civil': (['SE','NO','DK','NL'],'civil_law'),'East Asian': (['JP','KR','CN'],'civil_law'),
    'Islamic': (['SA','AE','ISLAMIC'],'islamic'),'Mixed/Religious': (['IL-ISR','PH','IN-HMA'],'mixed'),
    'Canon Law': (['CANON'],'canon'),'Hindu Dharmashastra': (['HINDU'],'dharmic'),
    'Confucian': (['CONFUCIAN'],'confucian'),'Indigenous': (['INDIGENOUS'],'indigenous'),
    'Customary': (['ZA'],'customary'),'Historical': (['LATIN'],'historical'),
}
all_jurs = set(d['jur'] for d in data)
for sfx,nm,sy in [('-MAR','Maritime','maritime'),('-CRIM','Criminal','criminal'),('-CONST','Constitutional','constitutional'),
    ('-PROP','Property','property'),('-COM','Commercial','commercial'),('-TORT','Tort','tort'),
    ('-TAX','Tax','tax'),('-LABOR','Labor','labor')]:
    jj = sorted([j for j in all_jurs if j.endswith(sfx)])
    if jj: tmap[nm+' Law'] = (jj, sy)

def lpca(sub,n=2):
    if len(sub)<3: return [(0,0)]*len(sub),[],[]
    X = np.array([[w.get(a,0.5) for a in axes] for w in sub],dtype=np.float64)
    Xc = X-X.mean(0); v = np.var(Xc)
    if v<1e-6:
        a = np.linspace(0,2*np.pi,len(sub),endpoint=False)
        return [(float(np.cos(x)*0.8),float(np.sin(x)*0.8)) for x in a],[],[]
    try: ev,evec = np.linalg.eigh(np.cov(Xc.T))
    except: return [(0,0)]*len(sub),[],[]
    pc = evec[:,-n:][:,::-1]; proj = Xc@pc
    for i in range(n):
        r = proj[:,i].max()-proj[:,i].min()
        if r>0: proj[:,i]=(proj[:,i]-proj[:,i].min())/r*2-1
    return proj.tolist(),pc.tolist(),(ev[-n:][::-1]/max(ev.sum(),1e-10)).tolist()

l0 = []
for tn,(jrs,sy) in tmap.items():
    sub = [d for d in data if d['jur'] in jrs]
    if not sub: continue
    c = {a:float(np.mean([w.get(a,0.5) for w in sub])) for a in axes}
    l0.append({'word':tn,'system':sy,'count':len(sub),'jurs':len(set(d['jur'] for d in sub)),
               **c,'score':float(np.mean([w['score'] for w in sub])),'children_jurs':sorted(set(d['jur'] for d in sub))})
p0,ld0,v0 = lpca(l0)
for i,w in enumerate(l0): w['x']=p0[i][0]; w['y']=p0[i][1]

l1 = {}
for tn,(jrs,sy) in tmap.items():
    bj = defaultdict(list)
    for d in data:
        if d['jur'] in jrs: bj[d['jur']].append(d)
    if not bj: continue
    je = [{'word':j,'count':len(ws),'score':float(np.mean([w['score'] for w in ws])),
           **{a:float(np.mean([w.get(a,0.5) for w in ws])) for a in axes}} for j,ws in bj.items()]
    if len(je)>=3:
        p1,ld1,v1 = lpca(je)
        for i,e in enumerate(je): e['x']=p1[i][0]; e['y']=p1[i][1]
    else:
        for i,e in enumerate(je): e['x']=-0.8+i*1.6/max(len(je)-1,1); e['y']=0
        ld1,v1 = [],[]
    l1[tn] = {'entries':je,'loadings':ld1,'variance':v1}

l2 = {}
jw = defaultdict(list)
for d in data: jw[d['jur']].append(d)
for j,ws in jw.items():
    seen = {}
    for w in ws:
        if w['word'] not in seen or w['score']>seen[w['word']]['score']: seen[w['word']]=w
    u = list(seen.values())
    p2,ld2,v2 = lpca(u)
    for i,w2 in enumerate(u): w2['x']=p2[i][0]; w2['y']=p2[i][1]
    l2[j] = {'entries':[{'word':w2['word'],'score':w2['score'],'x':w2.get('x',0),'y':w2.get('y',0),
              'domain':w2.get('domain','family'),'notes':w2.get('notes','')[:150],
              **{a:w2.get(a,0.5) for a in axes}} for w2 in u],'loadings':ld2,'variance':v2}

json.dump({'level0':{'entries':l0,'loadings':ld0,'variance':v0,'axes':axes},'level1':l1,'level2':l2},
          open('$DATA_DIR/tree.json','w'), ensure_ascii=False)
print(f'tree.json: {len(l0)} traditions, {len(l2)} jurisdictions')
PYEOF

echo ""
ls -lh "$DATA_DIR"/*.json
echo ""
echo "Done. Pages fetch data from data/*.json — no HTML was modified."
