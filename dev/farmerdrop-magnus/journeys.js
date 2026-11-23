(() => {
  const hostDrops = [
    { name: 'Orchard Lane', day: 'Saturday', hours: '9–11 a.m.', place: 'Community garden' },
    { name: 'Meadow Park', day: 'Sunday', hours: '2–4 p.m.', place: 'Neighborhood hall' },
  ];
  const products = [
    { name: 'Carrots', unit: '1 bunch', farm: 'Cedar Row Farm' },
    { name: 'Kale', unit: '1 bunch', farm: 'Cedar Row Farm' },
    { name: 'Apples', unit: '1 bag', farm: 'Orchard Hill' },
  ];
  const roles = [
    ['member', 'Member', 'Shop from nearby Farmers at one HostDrop.'],
    ['host', 'HostDrop', 'Receive orders and organize local pickup.'],
    ['farmer', 'Farmer', 'List produce for a neighborhood DropDate.'],
  ];
  const entryPoints = new Set(['member', 'host', 'farmer', 'browse', 'signin', 'signup', 'shop']);
  const dialog = document.createElement('dialog');
  dialog.className = 'journey-dialog';
  dialog.setAttribute('aria-labelledby', 'journey-title');
  dialog.setAttribute('aria-describedby', 'journey-intro');
  dialog.innerHTML = `
    <div class="journey-sheet">
      <div class="journey-top">
        <span>Prototype preview</span>
        <button type="button" class="journey-close" aria-label="Close preview" data-preview-action="close">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <h2 id="journey-title" tabindex="-1"></h2>
      <p id="journey-intro"></p>
      <div class="journey-content"></div>
    </div>`;
  const title = dialog.querySelector('#journey-title');
  const intro = dialog.querySelector('#journey-intro');
  const content = dialog.querySelector('.journey-content');
  let trigger;
  let pickup;
  let product;
  let history;

  function option(action, name, detail, index = '') {
    return `<button type="button" class="journey-option" data-preview-action="${action}" data-preview-index="${index}">
      <span><strong>${name}</strong><small>${detail}</small></span>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg>
    </button>`;
  }

  function button(action, label, secondary = false) {
    return `<button type="button" class="journey-button${secondary ? ' journey-secondary' : ''}" data-preview-action="${action}">${label}</button>`;
  }

  function setScreen(heading, description, html) {
    title.textContent = heading;
    intro.textContent = description;
    const back = history.length > 1 ? button('back', 'Back', true) : '';
    content.innerHTML = html + back;
    dialog.scrollTop = 0;
    if (dialog.open) title.focus({ preventScroll: true });
  }

  function display(screen) {
    const host = hostDrops[pickup];
    const item = products[product];
    const pickupWindow = `${host.day}, ${host.hours}`;
    switch (screen) {
      case 'signin':
      case 'signup':
        setScreen(
          screen === 'signin' ? 'Preview a workspace' : 'Choose your role',
          screen === 'signin' ? 'Choose a sample workspace to explore without entering account details.' : 'Try the experience as a Member, HostDrop, or Farmer. Each path uses sample data.',
          roles.map(([action, name, detail]) => option(action, name, detail)).join('')
        );
        break;
      case 'member':
      case 'browse':
        setScreen(
          screen === 'member' ? 'Choose your neighborhood pickup' : 'Browse HostDrops',
          'Explore two sample HostDrops. Choose a pickup window to see its produce.',
          hostDrops.map((group, index) => option('pickup', group.name, `${group.place} · ${group.day}, ${group.hours}`, index)).join('')
        );
        break;
      case 'shop':
        setScreen(
          `Shop ${host.name}`, `Sample catalog for pickup on ${host.day}, ${host.hours}. Choose an item to preview an order.`,
          products.map((entry, index) => option('item', entry.name, `${entry.unit} · ${entry.farm}`, index)).join('') +
          button('browse', 'Explore other HostDrops', true)
        );
        break;
      case 'review-order':
        setScreen(
          'Review your sample order', 'Check the item and pickup details before trying the confirmation.',
          `<dl class="journey-details"><dt>Produce</dt><dd>${item.name} · ${item.unit}</dd><dt>Farmer</dt><dd>${item.farm}</dd><dt>HostDrop</dt><dd>${host.name}</dd><dt>Pickup</dt><dd>${pickupWindow}</dd></dl>` +
          button('order-complete', 'Confirm sample order')
        );
        break;
      case 'order-complete':
        setScreen(
          'Sample order complete', `Your sample pickup is ${item.name.toLowerCase()} at ${host.name} on ${host.day}, ${host.hours}. This preview ends here without placing or charging an order.`, button('close', 'Done')
        );
        break;
      case 'host':
        setScreen(
          'Receive a delivery', 'Try the receiving step for a sample HostDrop. Check a package against the expected delivery before pickup.',
          `<dl class="journey-details"><dt>HostDrop</dt><dd>${host.name}</dd><dt>Delivery</dt><dd>Cedar Row Farm</dd><dt>Expected</dt><dd>1 package of carrots</dd><dt>Pickup</dt><dd>${pickupWindow}</dd></dl>` +
          button('host-complete', 'Mark sample package received')
        );
        break;
      case 'host-complete':
        setScreen('Sample package received', `The Cedar Row Farm package is ready for Member pickup at ${host.name} in this preview.`, button('close', 'Done'));
        break;
      case 'farmer':
        setScreen(
          'Choose produce to list', `Try preparing a sample listing for the ${host.day} DropDate at ${host.name}.`,
          products.map((entry, index) => option('listing', entry.name, entry.unit, index)).join('')
        );
        break;
      case 'review-listing':
        setScreen(
          'Review your sample listing', 'This is how the produce will appear in the local preview.',
          `<dl class="journey-details"><dt>Produce</dt><dd>${item.name} · ${item.unit}</dd><dt>HostDrop</dt><dd>${host.name}</dd><dt>DropDate</dt><dd>${pickupWindow}</dd></dl>` +
          button('farmer-complete', 'Finish sample listing')
        );
        break;
      case 'farmer-complete':
        setScreen('Sample listing complete', `Your listing preview shows ${item.name.toLowerCase()} for the ${host.day} DropDate at ${host.name}. It is visible only in this demo.`, button('close', 'Done'));
        break;
    }
  }

  function move(screen) {
    history.push({ screen, pickup, product });
    display(screen);
  }

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-journey]');
    if (!opener || !entryPoints.has(opener.dataset.journey)) return;
    event.preventDefault();
    trigger = opener;
    pickup = 0;
    product = 0;
    history = [];
    if (!dialog.isConnected) document.body.append(dialog);
    move(opener.dataset.journey);
    dialog.showModal();
    title.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      dialog.close();
      return;
    }
    const control = event.target.closest('[data-preview-action]');
    if (!control) return;
    const action = control.dataset.previewAction;
    if (action === 'close') {
      dialog.close();
    } else if (action === 'back') {
      history.pop();
      const previous = history[history.length - 1];
      ({ pickup, product } = previous);
      display(previous.screen);
    } else if (action === 'pickup') {
      pickup = Number(control.dataset.previewIndex);
      move('shop');
    } else if (action === 'item' || action === 'listing') {
      product = Number(control.dataset.previewIndex);
      move(action === 'item' ? 'review-order' : 'review-listing');
    } else {
      move(action);
    }
  });
  dialog.addEventListener('close', () => {
    if (trigger?.getClientRects().length) trigger.focus({ preventScroll: true });
    else document.querySelector('header button[aria-expanded]')?.focus({ preventScroll: true });
  });
})();
