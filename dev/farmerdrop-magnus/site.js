(() => {
  const design = document.documentElement.dataset.design;
  const orchardBlend = document.documentElement.classList.contains('orchard-blend');
  document.body.dataset.design = design;
  if (orchardBlend) {
    document.querySelectorAll('header [data-journey="browse"]').forEach(button => button.remove());
  }
  if (window.parent !== window && window.name === 'farmerdrop-preview') {
    document.querySelector('.business-entry').hidden = true;
  }
  const photoFreeViewport = window.blendPhotoFreeViewport;
  const phone = window.matchMedia('(max-width: 760px)');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#phone-menu');
  function showMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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
  const video = document.querySelector('#film-template').content.querySelector('video');
  const poster = video.getAttribute('poster');
  const play = document.querySelector('.film-play');
  const filmLabel = play.querySelector('.film-label');
  video.controls = false;
  play.hidden = false;

  function renderMedia() {
    const textOnly = orchardBlend && photoFreeViewport.matches;
    filmLabel.hidden = !textOnly;
    if (textOnly) video.removeAttribute('poster');
    else video.setAttribute('poster', poster);
    if (textOnly && !video.controls) video.remove();
    else if (!video.isConnected) play.before(video);
  }

  play.addEventListener('click', () => {
    video.controls = true;
    if (!video.isConnected) play.before(video);
    play.hidden = true;
    video.focus();
    video.play().catch(() => { video.controls = true; });
  });

  phone.addEventListener('change', () => showMenu(false));
  if (orchardBlend) photoFreeViewport.addEventListener('change', renderMedia);
  renderMedia();
})();
