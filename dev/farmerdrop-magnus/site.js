(() => {
  const design = new URLSearchParams(location.search).get('design');
  document.body.dataset.design = design === 'field' ? 'field' : 'orchard';
  if (window.parent !== window && window.name === 'farmerdrop-preview') {
    document.querySelector('.business-entry').hidden = true;
  }
  const phone = window.matchMedia('(max-width: 760px)');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#phone-menu');
  const tabList = document.querySelector('.role-tabs');
  const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
  let activeRole = 0;

  function showMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  function renderRoles() {
    tabList.hidden = !phone.matches;
    tabs.forEach((tab, index) => {
      const selected = index === activeRole;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = phone.matches && !selected;
      if (phone.matches) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
      } else {
        panel.removeAttribute('role');
        panel.setAttribute('aria-labelledby', panel.querySelector('h3').id);
      }
    });
  }
  menuButton.addEventListener('click', () => showMenu(menu.hidden));
  menu.addEventListener('click', event => {
    if (event.target.closest('a,button')) showMenu(false);
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !event.target.closest('.site-header')) showMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      showMenu(false);
      menuButton.focus();
    }
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { activeRole = index; renderRoles(); });
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      activeRole = next;
      renderRoles();
      tabs[next].focus();
    });
  });
  phone.addEventListener('change', () => { showMenu(false); renderRoles(); });
  renderRoles();

  const video = document.querySelector('#explainer');
  const play = document.querySelector('.film-play');
  video.controls = false;
  play.hidden = false;
  play.addEventListener('click', () => {
    play.hidden = true;
    video.controls = true;
    video.focus();
    video.play().catch(() => { video.controls = true; });
  });
})();
