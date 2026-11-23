(() => {
  const designs = {
    original: { label: 'Original site', path: 'base/index.html' },
    orchard: { label: 'Orchard', path: 'facelift.html' },
    field: { label: 'Field', path: 'facelift.html?design=field' },
  };
  const devices = {
    auto: { label: 'Auto' },
    laptop: { label: 'Laptop', width: 1280, height: 800 },
    phone: { label: 'Phone', width: 390, height: 844 },
  };
  const bar = document.querySelector('.review-bar');
  const disclosure = document.querySelector('.review-disclosure');
  const stage = document.querySelector('.review-stage');
  const size = document.querySelector('.review-frame-size');
  let frame = document.querySelector('.review-frame');
  const openLink = document.querySelector('.review-open');
  const summary = document.querySelector('#review-summary');
  let device = 'auto';

  function fitFrame() {
    if (device === 'auto') {
      size.removeAttribute('style');
      frame.removeAttribute('style');
      return;
    }
    const styles = getComputedStyle(stage);
    const space = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    if (!space) return;
    const { width, height } = devices[device];
    const scale = Math.min(1, space / width);
    // Preserve the emulated viewport. The page scrolls within the frame and
    // shorter review windows can also scroll the outer stage to its bottom.
    size.style.width = `${width * scale}px`;
    size.style.height = `${height * scale}px`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.transform = `scale(${scale})`;
  }

  function render() {
    const params = new URLSearchParams(location.search);
    const design = Object.hasOwn(designs, params.get('design')) ? params.get('design') : 'original';
    device = Object.hasOwn(devices, params.get('device')) ? params.get('device') : 'auto';
    for (const button of bar.querySelectorAll('[data-design]')) {
      button.setAttribute('aria-pressed', String(button.dataset.design === design));
    }
    for (const button of bar.querySelectorAll('[data-device]')) {
      button.setAttribute('aria-pressed', String(button.dataset.device === device));
    }
    const { label, path } = designs[design];
    const destination = new URL(path, location.href);
    if (params.get('metrics') === '1') destination.searchParams.set('metrics', '1');
    if (frame.getAttribute('src') !== destination.href) {
      // Mount a fresh frame so only the shareable shell URL adds history.
      const next = frame.cloneNode(false);
      next.title = `${label} preview`;
      next.src = destination.href;
      frame.replaceWith(next);
      frame = next;
      stage.scrollTop = 0;
    }
    openLink.href = destination.href;
    summary.textContent = `${label} · ${devices[device].label}`;
    stage.dataset.device = device;
    fitFrame();
  }

  bar.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button === disclosure) {
      const expanded = bar.classList.toggle('is-expanded');
      disclosure.setAttribute('aria-expanded', String(expanded));
      return;
    }
    if (button.getAttribute('aria-pressed') === 'true') return;
    const url = new URL(location.href);
    if (button.hasAttribute('data-design')) {
      if (button.dataset.design === 'original') url.searchParams.delete('design');
      else url.searchParams.set('design', button.dataset.design);
    } else if (button.hasAttribute('data-device')) {
      if (button.dataset.device === 'auto') url.searchParams.delete('device');
      else url.searchParams.set('device', button.dataset.device);
    }
    history.pushState(null, '', url);
    render();
  });
  window.addEventListener('popstate', render);
  new ResizeObserver(fitFrame).observe(stage);
  render();
})();
