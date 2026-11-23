import { dates, workspaces, queues, getRows, advance } from './model.js';

const byId = id => document.getElementById(id);
const workspace = byId('workspace');
const dropDate = byId('drop-date');
const nav = byId('queue-nav');
const tbody = byId('rows');
const search = byId('search');
const selectAll = byId('select-all');
const action = byId('advance');
const pending = byId('pending');
const all = byId('all');
const notice = byId('result');
const preferenceKey = 'fd-business-start-v1';
const inComparison = window.parent !== window && window.name === 'farmerdrop-preview';
const selected = new Set();
let role, queue, dateId, visibleRows;
let pendingOnly = true;

const iconPaths = {
  packing: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Zm0 9 8.5-4.5M12 12v9M12 12 3.5 7.5M7.8 5.3l8.5 4.5"/>',
  deliveries: '<path d="M3 5.5h11v11H7.5M14 9h3.8l3.2 3.8v3.7h-2.5M14 16.5h.8"/><circle cx="5.5" cy="17" r="2.2"/><circle cx="16.7" cy="17" r="2.2"/>',
  receiving: '<path d="m3.5 12 2.8-5H9m6 0h2.7l2.8 5v7h-17v-7Zm0 0H8l1.3 2h5.4l1.3-2h4.5M12 2v8m-3-3 3 3 3-3"/>',
  pickup: '<path d="m3 15 4-3h5.6a1.6 1.6 0 0 1 0 3.2H9.8m3.7-.5 5-3.3a1.6 1.6 0 0 1 2.1 2.3l-6.1 5-7.1.3L4 21M9 4h8v5H9z"/>',
};

function readPreference() {
  try { return sessionStorage.getItem(preferenceKey); } catch { return null; }
}

function savePreference(value) {
  if (inComparison) return;
  try {
    if (value) sessionStorage.setItem(preferenceKey, value);
    else sessionStorage.removeItem(preferenceKey);
  } catch { /* Direct desk URLs still work when storage is restricted. */ }
}

function locationFor(nextRole, nextQueue, nextDate) {
  const url = new URL(location.href);
  url.search = new URLSearchParams({ role: nextRole, queue: nextQueue, date: nextDate }).toString();
  url.hash = '';
  return url;
}

function resetFilters() {
  pendingOnly = true;
  search.value = '';
  selected.clear();
  notice.textContent = '';
}

function openWorkspace() {
  const params = new URLSearchParams(location.search);
  const roleParam = params.get('role') || readPreference();
  role = Object.hasOwn(workspaces, roleParam) ? roleParam : 'farmer';
  const options = workspaces[role].queues;
  queue = options.includes(params.get('queue')) ? params.get('queue') : options[0];
  dateId = dates.find(d => d.id === params.get('date'))?.id ?? dates[0].id;
  savePreference(role);
  resetFilters();
  workspace.value = role;
  dropDate.value = dateId;
  byId('title').textContent = queues[queue].label;
  byId('business-name').textContent = workspaces[role].name;
  document.title = queues[queue].label + ' · ' + workspaces[role].name + ' · FarmerDrop';
  nav.replaceChildren(...options.map(key => {
    const link = document.createElement('a');
    link.href = locationFor(role, key, dateId);
    link.dataset.queue = key;
    if (key === queue) link.setAttribute('aria-current', 'page');
    link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPaths[key] + '</svg>';
    link.append(queues[key].label);
    return link;
  }));
  byId('primary-col').textContent = queues[queue].primaryHeading;
  byId('qty-col').textContent = queues[queue].quantityHeading;
  byId('caption').textContent = queues[queue].label + ' for ' + dropDate.selectedOptions[0].textContent;
  renderRows();
  if (inComparison) {
    window.parent.postMessage({ type: 'farmerdrop:business-route', role, queue, date: dateId }, location.origin);
  }
}

function navigate(url) {
  if (url.href !== location.href) history.pushState(null, '', url);
  openWorkspace();
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function rowFor(record) {
  const row = document.createElement('tr');
  const cell = element('td', 'pick');
  if (record.actionable) {
    const hitArea = document.createElement('label');
    const box = document.createElement('input');
    box.type = queue === 'pickup' ? 'radio' : 'checkbox';
    box.name = 'work-order';
    box.value = record.id;
    box.checked = selected.has(record.id);
    box.setAttribute('aria-label', 'Select ' + record.id + ', ' + record.primary + ', ' + record.detail);
    hitArea.append(box);
    cell.append(hitArea);
  }
  const contents = element('td', 'contents');
  contents.append(element('div', 'row-primary', record.primary), element('div', 'row-detail', record.detail));
  const state = element('td', 'state');
  state.append(element('span', record.actionable ? 'status-tag' : 'status-tag done', record.status));
  row.append(cell, element('td', 'ref', record.id), contents, element('td', 'qty', record.quantity), state);
  return row;
}

function updateSelection() {
  const eligible = visibleRows.filter(row => row.actionable).length;
  const single = queue === 'pickup';
  byId('select-header').hidden = single;
  byId('choose-one').hidden = !single;
  selectAll.disabled = !eligible;
  selectAll.checked = eligible > 0 && selected.size === eligible;
  selectAll.indeterminate = selected.size > 0 && selected.size < eligible;
  action.disabled = selected.size === 0;
  action.textContent = queues[queue].action;
  const hint = byId('selection-hint');
  if (selected.size) hint.textContent = selected.size + ' selected';
  else if (!eligible) hint.textContent = '';
  else hint.textContent = single ? 'Select one order for pickup.' : 'Select orders to ' + queues[queue].action.toLowerCase() + '.';
}

function renderRows() {
  const rows = getRows(queue, dateId);
  const available = rows.filter(row => row.actionable);
  const query = search.value.trim().toLowerCase();
  visibleRows = (pendingOnly ? available : rows).filter(row => !query || [row.id, row.primary, row.detail].some(text => text.toLowerCase().includes(query)));
  pending.querySelector('.count').textContent = available.length;
  all.querySelector('.count').textContent = rows.length;
  pending.setAttribute('aria-pressed', String(pendingOnly));
  all.setAttribute('aria-pressed', String(!pendingOnly));
  tbody.replaceChildren(...visibleRows.map(rowFor));
  byId('empty').hidden = visibleRows.length > 0;
  byId('empty').textContent = query ? 'No matching orders. Clear the search to see the worklist.' : 'No orders need action in this queue for this DropDate.';
  updateSelection();
}

dates.forEach(date => dropDate.add(new Option(date.label, date.id)));
workspace.addEventListener('change', () => navigate(locationFor(workspace.value, workspaces[workspace.value].queues[0], dateId)));
dropDate.addEventListener('change', () => navigate(locationFor(role, queue, dropDate.value)));
nav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(new URL(link.href));
  nav.querySelector('[aria-current]').focus({ preventScroll: true });
});
window.addEventListener('popstate', openWorkspace);
byId('mode-switch').addEventListener('click', () => {
  if (inComparison) {
    window.parent.postMessage({ type: 'farmerdrop:preview', design: 'original' }, location.origin);
    return;
  }
  savePreference(null);
  location.assign('../index.html?view=website');
});

for (const button of [pending, all]) {
  button.addEventListener('click', () => {
    pendingOnly = button === pending;
    selected.clear();
    notice.textContent = '';
    renderRows();
  });
}
search.addEventListener('input', () => {
  selected.clear();
  notice.textContent = '';
  renderRows();
});
tbody.addEventListener('change', event => {
  const box = event.target;
  if (!box.matches('input[name="work-order"]')) return;
  if (queue === 'pickup') selected.clear();
  if (box.checked) selected.add(box.value); else selected.delete(box.value);
  notice.textContent = '';
  updateSelection();
});
selectAll.addEventListener('change', () => {
  selected.clear();
  for (const box of tbody.querySelectorAll('input[type="checkbox"]')) {
    box.checked = selectAll.checked;
    if (box.checked) selected.add(box.value);
  }
  updateSelection();
});
action.addEventListener('click', () => {
  const changed = advance(selected, queue, dateId);
  const done = queues[queue].doneLabel.toLowerCase();
  selected.clear();
  renderRows();
  notice.textContent = changed ? changed + (changed === 1 ? ' order ' : ' orders ') + done + '.' : 'The worklist changed. Select the orders again.';
  const next = tbody.querySelector('input');
  (next ?? (pendingOnly ? pending : all)).focus({ preventScroll: true });
});
openWorkspace();
