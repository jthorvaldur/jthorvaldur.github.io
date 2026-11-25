'use strict';
function startDirectoryAtlas(data) {
  const get = id => document.getElementById(id);
  if (!data) { get('map-title').textContent = 'Map data could not be loaded.'; return; }
  const fmt = new Intl.NumberFormat('en-US');
  const num = value => fmt.format(value);
  const dec = value => value.toLocaleString('en-US', {maximumFractionDigits: 1});
  const palette = ['#eef3ed', '#d5e7db', '#a5d0b9', '#6aaf91', '#34856b', '#155946'];
  const labels = { reported:'Reported on-farm location', zip:'ZIP-area estimate', area:'No usable point' };
  const regions = new Map(data.states.filter(s => s.code).map(s => [s.code, s]));
  const fips = new Map([...regions.values()].map(s => [String(s.fips).padStart(2, '0'), s.code]));
  const geo = topojson.feature(STATE_TOPOLOGY, STATE_TOPOLOGY.objects.states).features
    .map(feature => ({...feature, code:fips.get(String(feature.id).padStart(2,'0'))})).filter(f=>f.code);
  const geoByCode = new Map(geo.map(f => [f.code, f]));
  const insets = ['AK','HI','PR','VI'];
  const mainland = geo.filter(f => !insets.includes(f.code));
  const unknown = data.farmers.filter(f => !f[2] || !regions.has(f[2])).length;
  const farmers = [...data.farmers].sort((a,b)=>a[1].localeCompare(b[1])||a[0].localeCompare(b[0]));
  const supported = new Set(['density','total','points']);
  const state = {mode:'density',region:'*',precision:'all',allRanks:false,page:0,point:null,query:''};
  const pageSize = 15;
  const svg = d3.select('#map');
  const name = code => code === '~' ? 'Unreported region' : (regions.get(code)?.name || code);
  const sourceNames = farm => farm[6].join(' · ');
  const points = {reported:0,zip:0,area:0};
  for (const farm of data.farmers) points[farm[7]]++;
  const stateMetric = s => state.mode === 'total' ? s.total : state.mode === 'points' ?
    (state.precision==='all' ? s.mapped : s[state.precision]) : s.total * 1000 / s.landSqMi;
  const byRegion = farm => state.region === '*' || (state.region === '~' ? !regions.has(farm[2]) : farm[2] === state.region);
  const placeable = f => f[4] != null && f[5] != null && f[7] !== 'area' && (state.precision==='all'||f[7]===state.precision);
  const keyOf = f => [f[4],f[5]].join(',');
  const word = (count, singular, plural) => count === 1 ? singular : plural;
  function create(tag, text, cls) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  get('count-listings').textContent = num(data.listingCount);
  get('count-farms').textContent = num(data.farmers.length);
  get('asof').textContent = 'Source snapshot · '+data.asOf;
  get('region').add(new Option('All regions', '*'));
  for (const s of [...regions.values()].sort((a,b)=>a.name.localeCompare(b.name))) get('region').add(new Option(s.name,s.code));
  if (unknown) get('region').add(new Option('Unreported region', '~'));
  const params = new URLSearchParams(location.hash.slice(1));
  if (supported.has(params.get('view'))) state.mode=params.get('view');
  if ([...get('region').options].some(x=>x.value===params.get('region'))) state.region=params.get('region');
  function saveView() {
    const p = new URLSearchParams({view:state.mode});
    if(state.region!=='*')p.set('region',state.region);
    history.replaceState(null,'','#'+p.toString());
  }
  function focusMap() {
    get('map-title').scrollIntoView({block:'nearest'});
    get('map-title').focus({preventScroll:true});
  }
  function selectRegion(code) {
    state.region=code; state.page=0; state.point=null; state.query=''; get('search').value=''; draw();
  }
  function setMode(value) {
    state.mode = value; state.page=0; state.point=null; draw();
  }
  function renderRanks() {
    const title = {density:'Regions by density',total:'Regions by count',points:'Regions with points'};
    get('rank-title').textContent=title[state.mode];
    get('rank-unit').textContent=state.mode==='density' ? 'Directory producers per 1,000 mi² of land' : state.mode==='points' ? 'Producers at the selected precision' : 'Provisional producer identities';
    const items=[...regions.values()].sort((a,b)=>stateMetric(b)-stateMetric(a)||a.name.localeCompare(b.name));
    const showing=state.allRanks ? items : items.slice(0,8);
    const host=get('rankings');host.replaceChildren();
    for (const r of showing) {
      const value=stateMetric(r), button=create('button',undefined,'rank');
      button.classList.toggle('selected',state.region===r.code);
      button.setAttribute('aria-label',r.name+', '+(state.mode==='density'?dec(value):num(value))+'. Filter to this region');
      const label=create('span',undefined,'rankline');
      const title=create('span',r.name);
      if(state.mode==='density')title.append(create('small',' · '+num(r.total)+' producers','rank-sample'));
      label.append(title,create('span',state.mode==='density'?dec(value):num(value),'ranknum'));
      const bar=create('span',undefined,'bar');
      bar.style.width=(100*value/(stateMetric(items[0])||1))+'%';
      button.append(label,bar);button.onclick=()=>{selectRegion(r.code);focusMap();};host.append(button);
    }
    get('ranking-more').textContent=state.allRanks?'Show top eight':'Show all '+items.length+' regions';
  }
  function tip(event,text) {
    const el=get('tip'),box=get('map-wrap').getBoundingClientRect();
    el.textContent=text;el.hidden=false;
    el.style.left=Math.max(0,Math.min(box.width-el.offsetWidth,event.clientX-box.left+9))+'px';
    el.style.top=Math.max(0,Math.min(box.height-el.offsetHeight,event.clientY-box.top+9))+'px';
  }
  function hideTip(){get('tip').hidden=true;}
  function localProjection(feature, extent) {
    const center = d3.geoCentroid(feature);
    return d3.geoAzimuthalEqualArea().rotate([-center[0],-center[1]]).fitExtent(extent,feature);
  }
  const mainProjection = d3.geoAlbers().fitExtent([[8,8],[852,374]],{type:'FeatureCollection',features:mainland});
  const insetBox = {AK:[40,383,200,460],HI:[248,396,353,460],PR:[446,400,570,453],VI:[660,397,748,455]};
  const nationalInsets = new Map();
  for(const code of insets) {
    const feat=geoByCode.get(code);
    if(feat) {const [x0,y0,x1,y1]=insetBox[code];nationalInsets.set(code,localProjection(feat,[[x0,y0],[x1,y1]]));}
  }
  function colorScale() {
    const cuts=state.mode==='density'?[1,4,10,20,40]:[50,200,500,1000,2000];
    return {cuts,color:d3.scaleThreshold(cuts,palette)};
  }
  function renderLegend(cuts) {
    const legend=get('legend');legend.replaceChildren();
    const item=(text,style,color)=>{
      const span=create('span'),i=create('i',undefined,style);if(color)i.style.background=color;
      span.append(i,document.createTextNode(text));legend.append(span);
    };
    if(state.mode==='points') {
      if(state.precision!=='zip') item('Publisher-reported on-farm site','dot reported');
      if(state.precision!=='reported') item('ZIP-area center','dot');
      return;
    }
    const ranges=['< '+num(cuts[0]),...cuts.slice(1).map((v,i)=>num(cuts[i])+'–<'+num(v)),num(cuts.at(-1))+'+'];
    ranges.forEach((v,i)=>item(v,'swatch',palette[i]));
  }
  function renderMap() {
    svg.selectAll('.plot').remove();hideTip();
    const layer=svg.append('g').attr('class','plot');
    const region=regions.get(state.region),selected=geoByCode.get(state.region);
    const focus=selected ? localProjection(selected,[[70,20],[790,468]]) : null;
    const projectFor=code=>focus || nationalInsets.get(code) || mainProjection;
    const place=state.region==='*'?'All regions':name(state.region);
    const title={density:'Directory density',total:'Producer counts',points:'Producer locations'};
    get('map-title').textContent=title[state.mode]+(state.region==='*'?'':' · '+place);
    const subset=data.farmers.filter(byRegion);
    const mapped=subset.filter(placeable);
    get('map-unit').textContent=state.mode==='density'?'Producer identities per 1,000 square miles of land':
      state.mode==='total'?'Distinct producer identities by assigned region':'Reported on-farm locations and approximate ZIP-area centers';
    const {cuts,color}=colorScale();
    renderLegend(cuts);
    if(state.region==='~' && state.mode!=='points') {
      layer.append('text').attr('x',430).attr('y',235).attr('text-anchor','middle').attr('fill','#526b60').text('No assigned region');
      get('map-note').textContent=num(subset.length)+' producers have no assigned state or territory. See their directory records below.';
      return;
    }
    const features=selected?[selected]:geo;
    for(const f of features) {
      const s=regions.get(f.code),p=projectFor(f.code),path=d3.geoPath(p);
      const value=stateMetric(s);const isDark=state.mode!=='points'&&value>=cuts[3];
      const fill=state.mode==='points'?'#e8eee7':color(value);
      layer.append('path').attr('class','boundary').attr('d',path(f)).attr('fill',fill).attr('data-region',f.code)
        .on('pointermove',ev=>tip(ev,s.name+' · '+num(s.total)+' producers · '+dec(1000*s.total/s.landSqMi)+' per 1,000 mi²')).on('pointerleave',hideTip)
        .on('click',()=>{if(!selected)selectRegion(f.code);});
      if(!selected && insets.includes(f.code)) {
        const [x0,,x1]=insetBox[f.code];
        layer.append('text').attr('class','inset-label').attr('x',(x0+x1)/2).attr('y',479).text(f.code+' · '+s.name.replace('United States ','U.S. '));
      } else if(!selected && state.mode!=='points' && path.area(f)>950) {
        const [x,y]=path.centroid(f);
        layer.append('text').attr('class','state-label').attr('fill',isDark?'#fff':'#315747').attr('x',x).attr('y',y+3).text(f.code);
      }
    }
    if(!selected) layer.append('line').attr('x1',24).attr('x2',836).attr('y1',382).attr('y2',382).attr('stroke','#e6ebe5');
    if(state.mode==='points'){
      let activePin;let plottedLocations=0;
      const batches=d3.group(mapped,keyOf);let placed=0;
      const pointLayer=layer.append('g');
      const clusters=[...batches.values()].sort((a,b)=>b.length-a.length);
      for(const farms of clusters){
        const f=farms[0],regionCode=f[2];
        const coords=[f[5],f[4]];
        const drawnRegion=regionCode || insets.find(code=>geoByCode.has(code)&&d3.geoContains(geoByCode.get(code),coords));
        const xy=projectFor(drawnRegion)(coords);
        if(!xy||xy[0]<0||xy[0]>860||xy[1]<0||xy[1]>490)continue;
        placed+=farms.length;plottedLocations++;
        if(state.point===keyOf(f))activePin={xy,label:farms.length===1?f[1]:num(farms.length)+' producers at this point'};
        const exact=farms.some(v=>v[7]==='reported');
        const size=(selected?2.8:1.25)+Math.min(6,Math.log2(farms.length)*.85);
        const desc=farms.length===1?f[1]+' · '+labels[f[7]]:num(farms.length)+' producers share this point';
        pointLayer.append('circle').attr('class','pin').attr('cx',xy[0]).attr('cy',xy[1]).attr('r',size)
          .attr('fill',exact?'#0b5848':'#fff').attr('fill-opacity',exact?.85:.7)
          .attr('stroke',exact?'#0b5848':'#31816e').attr('stroke-width',selected?1:.65)
          .on('pointermove',ev=>tip(ev,desc)).on('pointerleave',hideTip).on('click',()=>{
            state.point=keyOf(f);state.page=0;state.query='';get('search').value='';renderMap();renderTable();
            get('directory').scrollIntoView({block:'start'});get('clear-pin').focus({preventScroll:true});
          });
      }
      if(activePin){const [x,y]=activePin.xy;pointLayer.append('circle').attr('cx',x).attr('cy',y).attr('r',10).attr('fill','none').attr('stroke','#161c19').attr('stroke-width',2).attr('pointer-events','none');}
      const unplaced=subset.filter(f=>f[7]==='area').length;
      get('map-note').textContent=num(placed)+' producers plotted at '+num(plottedLocations)+' distinct coordinate pairs'+
        (placed<mapped.length?' (some points outside the frame)':'')+'. '+num(unplaced)+' '+word(unplaced,'producer has','producers have')+
        ' no usable point in this region selection. Larger marks represent shared locations. Select a point to see its producers.';
    } else {
      const unitNote=region ? num(region.total)+' producers · '+num(Math.round(region.landSqMi))+' mi² of land.' :
        num(data.farmers.length-unknown)+' producers assigned to a state or territory'+(unknown?' · '+num(unknown)+' with unreported region.':'.');
      get('map-note').textContent=unitNote+' '+(selected?'Use All regions to return to the national map.':'Select a state for detail. Alaska, Hawaii, Puerto Rico and the Virgin Islands use inset scales.');
    }
  }
  function renderTable() {
    const input=state.query.toLocaleLowerCase().trim();
    const rows=farmers.filter(f=>byRegion(f) && (state.mode!=='points'||state.precision==='all'||placeable(f)) && (!state.point || keyOf(f)===state.point && placeable(f))
      && (!input || [f[1],f[2],f[3]].some(t=>String(t||'').toLocaleLowerCase().includes(input))));
    const maxPage=Math.max(0,Math.ceil(rows.length/pageSize)-1);state.page=Math.min(state.page,maxPage);
    const start=state.page*pageSize;
    const host=get('rows');host.replaceChildren();
    for(const farm of rows.slice(start,start+pageSize)) {
      const tr=create('tr');
      const first=create('td');
      if(farm[7]!=='area'){
        const locate=create('button',farm[1],'farm-link');locate.setAttribute('aria-label','Locate '+farm[1]);
        locate.onclick=()=>{ state.mode='points';state.precision='all';get('precision').value='all';state.region=regions.has(farm[2])?farm[2]:'~';state.point=keyOf(farm);state.page=0;state.query='';get('search').value='';draw();focusMap();};first.append(locate);
      }else first.textContent=farm[1];
      tr.append(first,create('td',[farm[3],farm[2]].filter(Boolean).join(', ')||'Unreported'),create('td',labels[farm[7]]),create('td',sourceNames(farm)));
      host.append(tr);
    }
    get('list-meta').textContent=num(rows.length)+' '+word(rows.length,'producer','producers')+(state.region!=='*'?' · '+name(state.region):' · All regions');
    if(state.mode==='points' && state.precision==='all' && !state.point) {
      const noPoint=rows.filter(f=>f[7]==='area').length;
      if(noPoint)get('list-meta').textContent+=' · '+num(noPoint)+' without a usable point';
    }
    get('page-number').textContent=rows.length?(num(start+1)+'–'+num(Math.min(start+pageSize,rows.length))+' of '+num(rows.length)):'No matching producers';
    get('prev').disabled=!state.page;get('next').disabled=state.page>=maxPage;
    get('focus-tools').hidden=!state.point;
    if(state.point)get('focus-label').textContent='Showing producers at the selected point.';
  }
  function exportMap(){
    const doc=d3.create('svg:svg').attr('xmlns','http://www.w3.org/2000/svg').attr('viewBox','0 0 930 710').attr('width',930).attr('height',710);
    doc.append('title').text(get('map-title').textContent+' | FarmerDrop');
    doc.append('rect').attr('width',930).attr('height',710).attr('fill','white');
    const copy=(x,y,text,size=15,color='#36554a')=>doc.append('text').attr('x',x).attr('y',y).attr('font-family','Arial, sans-serif').attr('font-size',size).attr('fill',color).text(text);
    copy(34,32,'FarmerDrop  /  Directory research',14);
    copy(33,74,get('map-title').textContent,34,'#153d30');
    copy(34,102,get('map-unit').textContent,17);
    const layer=svg.select('.plot').node().cloneNode(true);
    doc.append('g').attr('transform','translate(35,111)').node().append(layer);
    doc.append('style').text('.boundary{stroke:#fff;stroke-width:1}.state-label,.inset-label{font:11px Arial,sans-serif;text-anchor:middle}.inset-label{fill:#466055}');
    let x=34;
    for(const l of get('legend').children){
      const mark=l.firstElementChild;
      if(mark.classList.contains('dot')) {
        doc.append('circle').attr('cx',x+5).attr('cy',619).attr('r',4).attr('fill',mark.classList.contains('reported')?'#0b5848':'white').attr('stroke','#0b5848');
      } else doc.append('rect').attr('x',x).attr('y',614).attr('width',14).attr('height',10).attr('fill',mark.style.backgroundColor).attr('stroke','#9dafa4').attr('stroke-width',0.5);
      copy(x+20,624,l.textContent,13);
      x+=32+l.textContent.length*7;
    }
    const note=state.mode==='points' ? get('map-note').textContent.split(' Larger marks')[0] :
      (regions.get(state.region) ? get('map-note').textContent.split(' Use All')[0] :
       state.region==='~' ? num(unknown)+' producer identities with no assigned region.' :
       num(data.farmers.length-unknown)+' identities assigned to a state or territory; '+num(unknown)+' with unreported region.');
    copy(34,652,note,13);
    copy(34,678,'Private directory · '+data.asOf+' · Census 2025 land areas and ZIP geography · Census 2017 state outlines',12);
    const file=new Blob([new XMLSerializer().serializeToString(doc.node())],{type:'image/svg+xml'});
    const href=URL.createObjectURL(file),a=create('a');a.href=href;a.download='farmerdrop-'+state.mode+'-'+(state.region==='*'?'national':state.region)+'.svg';
    a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  }
  function methods(){
    const m=get('method-body');
    const paras=[
      num(data.listingCount)+' source listings include producers, CSA programs, venues and other records. The atlas uses '+num(data.producerRecordCount)+' producer-tagged listings linked to '+num(data.farmers.length)+' provisional identities. Each identity counts once, even if several sources describe it.',
      'Density divides identities assigned to a state or territory by its land area in thousands of square miles. It measures the geographic coverage of this directory. It is not an estimate of the complete farming population or a measure of production volume.',
      num(points.reported)+' producers have a usable publisher-reported on-farm market location. '+num(points.zip)+' others can be placed approximately at a Census ZIP Code Tabulation Area representative point. '+num(points.area)+' have no usable point. ZIP locations can coincide for many farms. Market or CSA sales venues away from a farm are excluded from the farm point layer.',
      'Directory locations reflect the source editions and may change. State assignment, precision and conflicts are documented in the geographic audit. This shared edition unlocks in your browser. Filtering, search and map exports run on your device.'
    ];
    for(const p of paras)m.append(create('p',p));
    const credits=create('h3','Directory sources');m.append(credits);
    const sourceList=create('ul');
    for(const source of data.sources){
      const entry=create('li'),link=create('a',source.source);
      link.href=source.dataset_url;link.rel='noreferrer';
      entry.append(link,' · '+source.publisher);sourceList.append(entry);
    }
    m.append(sourceList);
    m.append(create('p','California Department of Public Health WIC Enabled Farmers data is used under Creative Commons Attribution. FarmerDrop selected business fields and normalized names and counties. New York State Department of Agriculture and Markets supplied the New York open market data.'));
    const refs=create('p');
    for(const [title,url] of [['2025 Census land area','https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.2025.html'],['2025 Census Gazetteer','https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2025.html'],['Boundary outlines (2017)','https://github.com/topojson/us-atlas']]){
      if(refs.children.length)refs.append(' · ');const a=create('a',title);a.href=url;a.rel='noreferrer';refs.append(a);
    }m.append(refs);
  }
  function draw(){
    get('reset').hidden=state.region==='*';get('region').value=state.region;
    get('point-tools').hidden=state.mode!=='points';
    for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));
    renderMap();renderRanks();renderTable();saveView();
  }
  get('region').onchange=e=>selectRegion(e.target.value);
  get('reset').onclick=()=>selectRegion('*');
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  get('precision').onchange=e=>{state.precision=e.target.value;state.point=null;state.page=0;draw();};
  get('ranking-more').onclick=()=>{state.allRanks=!state.allRanks;renderRanks();};
  get('search').oninput=e=>{state.query=e.target.value;state.page=0;renderTable();};
  get('prev').onclick=()=>{state.page--;renderTable();};get('next').onclick=()=>{state.page++;renderTable();};
  get('clear-pin').onclick=()=>{state.point=null;state.page=0;renderMap();renderTable();};
  get('save-map').onclick=exportMap;
  methods();draw();
}
