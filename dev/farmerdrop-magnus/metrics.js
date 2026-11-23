(() => {
  if (new URLSearchParams(location.search).get('metrics') !== '1') return;

  function initialize() {
    const storageKey = 'farmerdrop-prototype-metrics-v1';
    const actions = [...new Set(Array.from(document.querySelectorAll('[data-event]'), element => element.dataset.event).filter(Boolean))];
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    const labels = new Map();
    const readable = name => name.replace(/[-_.:]+/g, ' ');
    for (const action of actions) labels.set(`click:${action}`, `Click · ${readable(action)}`);
    for (const section of sections) labels.set(`reach:${section.id}`, `Section reached · ${readable(section.id)}`);
    labels.set('video:play', 'Explainer started');

    const counts = new Map(Array.from(labels.keys(), key => [key, 0]));
    try {
      const previous = JSON.parse(sessionStorage.getItem(storageKey)) || {};
      for (const key of counts.keys()) {
        if (Number.isSafeInteger(previous[key]) && previous[key] >= 0) counts.set(key, previous[key]);
      }
    } catch { /* Storage may be unavailable in a restricted browsing context. */ }

    const panel = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Prototype metrics';
    panel.append(summary);
    const description = document.createElement('p');
    description.textContent = 'Counts stay in this tab. Section visits and the first video play count once per page load.';
    panel.append(description);
    const list = document.createElement('ul');
    const rows = new Map();
    for (const [key, label] of labels) {
      const row = document.createElement('li');
      row.textContent = `${label} — ${counts.get(key)}`;
      list.append(row);
      rows.set(key, row);
    }
    panel.append(list);
    Object.assign(panel.style, {
      width: 'min(52rem, calc(100% - 2rem))', margin: '1.25rem auto',
      color: '#163d2d', backgroundColor: '#f8f7ef', padding: '1rem',
      borderRadius: '0.5rem', fontSize: '1rem', lineHeight: '1.6'
    });
    summary.style.cursor = 'pointer';
    document.body.append(panel);

    function count(key) {
      if (!counts.has(key)) return;
      const next = counts.get(key) + 1;
      counts.set(key, next);
      rows.get(key).textContent = `${labels.get(key)} — ${next}`;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(counts)));
      } catch { /* In-memory counts still work if storage is unavailable. */ }
    }

    document.addEventListener('click', event => {
      const action = event.target.closest?.('[data-event]')?.dataset.event;
      if (action) count(`click:${action}`);
    }, { capture: true });
    // Capture also covers a video mounted lazily inside the explainer section.
    function firstPlay(event) {
      if (!event.target.closest?.('#explainer')) return;
      count('video:play');
      document.removeEventListener('play', firstPlay, true);
    }
    document.addEventListener('play', firstPlay, true);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          count(`reach:${entry.target.id}`);
          observer.unobserve(entry.target);
        }
      });
      for (const section of sections) observer.observe(section);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
