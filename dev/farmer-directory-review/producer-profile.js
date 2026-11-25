'use strict';
function createProducerProfiles(edition, farmers) {
  const fields = {products:'Products and crops', methods:'Growing and raising methods', sales:'Where they sell'};
  const dialog = document.getElementById('producer-profile');
  const heading = document.getElementById('profile-name');
  const body = document.getElementById('profile-body');
  const byId = new Map(farmers.map(farm => [farm[0], farm]));
  const initial = new URLSearchParams(location.hash.slice(1)).get('profile');
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const categoryOrder = Object.keys(fields);
  const searchValues = new Map();
  let selected = null;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function address(id) {
    const params = new URLSearchParams(location.hash.slice(1));
    if (id) params.set('profile',id);
    else params.delete('profile');
    history.replaceState(null,'','#'+params);
  }
  function evidenceLink(source) {
    const [publisher,url,checked,published,basis] = source;
    const note = element('div',null,'profile-citation');
    const link = element('a',publisher || 'Source');
    link.href = url;
    link.rel = 'noreferrer noopener';
    link.target = '_blank';
    note.append(link);
    if (published) note.append(' · Source date '+published);
    if (checked) note.append(' · Checked '+checked);
    if (basis) note.append(element('p',basis));
    return note;
  }
  function show(farm) {
    selected = farm[0];
    heading.textContent = farm[1];
    document.getElementById('profile-place').textContent = [farm[3],farm[2]].filter(Boolean).join(', ');
    const groups = edition.rows[selected] || [[],[],[]];
    body.replaceChildren();
    categoryOrder.forEach((category,index) => {
      const section = element('section');
      section.append(element('h3',fields[category]));
      if (!groups[index].length) section.append(element('p','No source recorded yet.','profile-empty'));
      const groupLimit=4;
      let moreSources;
      if (groups[index].length>groupLimit) {
        moreSources=element('details');
        moreSources.append(element('summary','Show '+(groups[index].length-groupLimit)+' more source groups'));
      }
      for (const [groupNumber,[reference, values]] of groups[index].entries()) {
        const group = element('div',null,'profile-evidence');
        const list = element('ul');
        for (const value of values.slice(0,6)) list.append(element('li',value));
        group.append(list);
        if (values.length>6) {
          const more=element('details');
          more.append(element('summary','Show '+(values.length-6)+' more items'));
          const remaining=element('ul');
          for (const value of values.slice(6)) remaining.append(element('li',value));
          more.append(remaining);group.append(more);
        }
        group.append(evidenceLink(edition.sources[reference]));
        (groupNumber<groupLimit ? section : moreSources).append(group);
      }
      if (moreSources) section.append(moreSources);
      body.append(section);
    });
    const idea = edition.ideas?.[selected];
    if (idea) {
      const section = element('section');
      section.append(element('h3','Discovery idea to test'),element('p',idea));
      body.append(section);
    }
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop=0;
    address(selected);
  }
  function matches(farmId,field,query) {
    const rows = edition.rows[farmId];
    const idx = categoryOrder.indexOf(field);
    if (!rows || idx<0 || !rows[idx].length) return false;
    if (!query) return true;
    const key = farmId+field;
    if (!searchValues.has(key)) searchValues.set(key,normalize(rows[idx].flatMap(group=>group[1]).join('\n')));
    return searchValues.get(key).includes(normalize(query));
  }
  document.getElementById('close-profile').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{selected=null;address(null);});
  return {
    show, matches,
    appendParameter(params) {if (selected) params.set('profile',selected);},
    openInitial(){if (byId.has(initial)) show(byId.get(initial));}
  };
}
