(() => {
  'use strict';
  const main = document.getElementById('main-content');
  const scenario = document.getElementById('scenario');
  const version = document.getElementById('version');
  const dialog = document.getElementById('directory');
  const query = document.getElementById('query');
  const area = document.getElementById('area');
  const rows = window.blueprintCatalog;
  const hosts = {
    grove: {
      name: 'Grove Yard',
      place: 'North neighborhood',
      day: 'Saturday',
      time: '9–11 am',
      access: 'Host reviews requests',
    },
    meadow: {
      name: 'Meadow Hall',
      place: 'West neighborhood',
      day: 'Wednesday',
      time: '4–6 pm',
      access: 'Open enrollment',
    },
  };
  const goods = [
    { title: 'Carrots', farm: 'Meadow Row Farm', unit: '1 bunch', cents: 400 },
    { title: 'Mixed salad greens', farm: 'Cedar Gate Growers', unit: '1 bag', cents: 600 },
  ];
  const esc = (str) =>
    String(str).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const currency = (cents) => '$' + (cents / 100).toFixed(2);
  let st;
  function url(page, changes = {}) {
    const v = { ...st, ...changes, page };
    if (changes.host && changes.host !== st.host && !Object.hasOwn(changes, 'carrots')) {
      [v.carrots, v.otherCarrots] = [st.otherCarrots, st.carrots];
      [v.greens, v.otherGreens] = [st.otherGreens, st.greens];
    }
    const q = new URLSearchParams();
    for (const [k, d] of Object.entries({
      state: 'new',
      version: 'proposed',
      host: 'grove',
      carrots: '0',
      greens: '0',
      product: '0',
      next: '',
      chosen: '',
      order: '',
      otherCarrots: '0',
      otherGreens: '0',
      groveAccess: '',
      meadowAccess: '',
    })) {
      if (v[k] && v[k] !== d) q.set(k, v[k]);
    }
    return '#' + encodeURIComponent(page) + (q.size ? '?' + q : '');
  }
  function link(label, page, style = 'btn', changes = {}) {
    return '<a class="' + style + '" href="' + esc(url(page, changes)) + '">' + esc(label) + '</a>';
  }
  const h = () => hosts[st.host];
  function membership(id) {
    if (st[id + 'Access']) return st[id + 'Access'];
    if (id !== (st.chosen || 'grove')) return 'available';
    if (st.state === 'pending') return 'pending';
    return ['returning', 'closed'].includes(st.state) ? 'approved' : 'available';
  }
  const approved = () => membership(st.host) === 'approved';
  const awaiting = () => membership(st.host) === 'pending';
  const wrap = (content) => '<section class="section wrap">' + content + '</section>';
  const lead = (k, t, d) =>
    '<div class="detail-head"><div class="wrap"><p class="kicker">' +
    esc(k) +
    '</p><h1>' +
    esc(t) +
    '</h1><p>' +
    esc(d) +
    '</p></div></div>';
  function card(title, text, action, kicker = '') {
    return (
      '<article class="card">' +
      (kicker ? '<span class="tag">' + esc(kicker) + '</span>' : '') +
      '<h3>' +
      esc(title) +
      '</h3><p>' +
      esc(text) +
      '</p>' +
      action +
      '</article>'
    );
  }
  const grid = (...cards) => '<div class="card-grid">' + cards.join('') + '</div>';
  function hero(k, title, copy, action) {
    return (
      '<div class="hero"><div class="wrap hero-grid"><div class="hero-copy"><p class="kicker">' +
      esc(k) +
      '</p><h1>' +
      esc(title) +
      '</h1><p>' +
      esc(copy) +
      '</p>' +
      action +
      '</div><img class="hero-art" src="../media/hero-small.webp" alt="" width="768" height="512"></div></div>'
    );
  }
  function hostCard(id) {
    const host = hosts[id];
    return card(
      host.name,
      host.place + ' · ' + host.day + ' pickup, ' + host.time + '.',
      link('Open HostDrop', 'host', 'textlink', { host: id }),
      host.access,
    );
  }
  function how() {
    const steps = [
      ['Choose a HostDrop', 'See which neighborhood pickup works for you.'],
      ['Browse local farms', 'Pick an open date to see what the farms are bringing.'],
      ['Place your order', 'An approved membership lets you order for that pickup.'],
      ['Pick up your food', 'Find your pickup details in My orders.'],
    ];
    return (
      '<h2>How ordering works</h2><ol class="lines">' +
      steps
        .map(
          ([a, b], i) =>
            '<li><span class="step">' +
            (i + 1) +
            '</span><div><strong>' +
            a +
            '</strong><p>' +
            b +
            '</p></div></li>',
        )
        .join('') +
      '</ol><details><summary>Watch the explainer</summary><video controls preload="none" poster="../media/explainer-poster.webp"><source src="../media/explainer.mp4" type="video/mp4"><track default kind="captions" srclang="en" label="English" src="../media/explainer.vtt"></video></details>' +
      link('Farmer and HostDrop guides', 'guides', 'textlink')
    );
  }
  function farms() {
    return (
      '<h2>Meet your local farmers</h2><p class="lead">Sample farms bringing food to these pickups.</p>' +
      grid(
        ...goods.map(
          (g, i) =>
            '<article class="card with-image"><img src="../media/' +
            (i ? 'member' : 'farmer') +
            '.webp" alt="" width="230" height="175" loading="lazy"><div><h3>' +
            g.farm +
            '</h3><p>' +
            g.title +
            '.</p>' +
            link('Meet the farm', 'farm', 'textlink', { product: String(i) }) +
            '</div></article>',
        ),
      )
    );
  }
  function home() {
    if (st.version === 'current') {
      const roleAction = (role, label) =>
        link(label, rows.find((row) => row.title === role + ' application').id, 'textlink');
      const recruitment =
        roleAction('Farmer', 'Join as a Farmer') + ' ' + roleAction('HostDrop', 'Host a HostDrop');
      return (
        '<div class="legacy">' +
        lead(
          'Current layout · sample reconstruction',
          'Farm to Neighborhood',
          'Open a HostDrop to see its farms, food and pickup dates.',
        ) +
        wrap(
          '<div class="actions">' +
            (awaiting()
              ? link('Check your HostDrop request', 'shop')
              : approved()
                ? link('View pickup dates', 'shop')
                : link('Find a HostDrop', 'hosts')) +
            link('How it works', 'help', 'btn alt') +
            link('Farmer and HostDrop guides', 'guides', 'textlink') +
            '</div><details><summary>Manage &amp; Guides</summary>' +
            link('Farmer and HostDrop guides', 'guides', 'textlink') +
            '</details>',
        ) +
        wrap(
          '<h2>Benefits for all involved</h2>' +
            grid(
              card(
                'For members',
                'Shop food from the farms in your area.',
                link('Shop FarmerDrop', 'shop', 'textlink'),
              ),
              card(
                'For farmers and hosts',
                'Bring your food or your pickup space to the network.',
                recruitment,
              ),
            ),
        ) +
        wrap(
          '<h2>The FarmerDrop Difference</h2><p class="lead">Shop local farms in our network.</p>' +
            link('Shop FarmerDrop', 'shop'),
        ) +
        wrap(
          '<h2>How FarmerDrop Works</h2><p class="lead">Browse &amp; Discover · Order Fresh · Get Notified · Enjoy &amp; Review</p>',
        ) +
        wrap(
          '<h2>Find HostDrop locations near you</h2><p class="lead">Discover local farmers and HostDrop locations in your area.</p><img class="legacy-photo" src="../media/host.webp" alt="Illustrative neighborhood pickup place" width="768" height="612">',
        ) +
        wrap(farms()) +
        wrap(
          '<h2>Putting Autonomy Back Into Every Community</h2><p class="lead">Connecting food producers with local communities.</p>',
        ) +
        wrap(
          '<h2>Ready to secure your fresh local food?</h2><div class="actions">' +
            link('Shop FarmerDrop', 'shop') +
            recruitment +
            '</div>',
        ) +
        '</div>'
      );
    }
    const stateHome = {
      incomplete: [
        'Finish your member profile',
        'Complete your profile to request a HostDrop and place a pickup order.',
        'Complete profile',
        'profile',
      ],
      verify: [
        'Verify your email',
        'Confirm your email to continue with membership and checkout.',
        'Review verification',
        'profile',
      ],
      returning: [
        'Your next pickup',
        'Your usual HostDrop is ready. Browse food for the next sample pickup.',
        'Shop pickup',
        'market',
      ],
      closed: [
        'Your HostDrop',
        'Your usual HostDrop has no open pickup date. You can still see the pickup location and your orders.',
        'View HostDrop',
        'host',
      ],
      pending: [
        'Your request is pending',
        'Your host is reviewing your request. You can browse the sample pickup while you wait.',
        'View request',
        'host',
      ],
      nearby: [
        'Find a nearby HostDrop',
        'The sample search has no matches in your area. Explore the directory to see another neighborhood.',
        'Explore HostDrops',
        'hosts',
      ],
      guest: [
        'Find food near you',
        'Choose a pickup to browse as a guest. You can sign in when you are ready to order.',
        'Explore HostDrops',
        'hosts',
      ],
    };
    const joined = Object.keys(hosts).find((id) => membership(id) === 'approved');
    const waiting = Object.keys(hosts).find((id) => membership(id) === 'pending');
    const mode = joined && st.state === 'pending' ? 'returning' : st.state;
    const data = stateHome[mode] || [
      'Choose your HostDrop',
      'Find a neighborhood pickup to see its farms, food and pickup dates.',
      'Choose a HostDrop',
      'hosts',
    ];
    const activeHost = joined || waiting || st.chosen || 'grove';
    const intro = hero(
      st.state === 'guest' ? 'Local food' : 'Member home',
      data[0],
      data[1],
      link(data[2], data[3], 'btn light', { host: activeHost }),
    );
    if (['returning', 'pending', 'closed'].includes(st.state)) {
      const extra =
        waiting && joined
          ? wrap(
              '<h2>Pending request</h2>' +
                card(
                  hosts[waiting].name,
                  'Your request to join this pickup place is awaiting review.',
                  link('View request', 'host', 'textlink', { host: waiting }),
                ),
            )
          : '';
      return (
        intro +
        wrap(
          '<h2>Your pickup place</h2>' +
            grid(
              hostCard(activeHost),
              card(
                'My orders',
                'Check the pickup instructions for an order you already placed.',
                link('View orders', 'orders', 'textlink'),
              ),
            ),
        ) +
        extra +
        wrap(
          '<div class="actions">' +
            link('Explore other HostDrops', 'hosts', 'textlink') +
            link('How ordering works', 'help', 'textlink') +
            '</div>',
        )
      );
    }
    if (st.state === 'nearby') return intro + wrap(noMatches());
    return (
      intro +
      wrap(
        '<h2>Neighborhood pickups</h2><p class="lead">Compare pickup windows and choose a place to start.</p>' +
          grid(hostCard('grove'), hostCard('meadow')),
      ) +
      wrap(how()) +
      wrap(farms())
    );
  }
  function noMatches() {
    return (
      '<h2>No nearby pickups found</h2><p class="lead">Try a wider area to see more pickup places.</p>' +
      link('Widen search', 'hosts', 'btn', { state: 'new' })
    );
  }
  function hostMatches(term) {
    return Object.entries(hosts)
      .filter(([, v]) => (v.name + ' ' + v.place).toLowerCase().includes(term.trim().toLowerCase()))
      .map(([id]) => id);
  }
  function directoryResults(term) {
    const ids = hostMatches(term);
    return ids.length
      ? grid(...ids.map(hostCard))
      : '<h2>No nearby pickups found</h2><p class="lead">Try North or West, or show all sample pickup places.</p><button type="button" class="btn" data-show-all>Widen search</button>';
  }
  function searchDirectory() {
    const initial = st.state === 'nearby' ? 'East' : '';
    return (
      '<label class="sample-field">Search neighborhood or HostDrop<input id="host-search" type="search" placeholder="Try North or West" value="' +
      initial +
      '"></label><div id="host-results" aria-live="polite">' +
      directoryResults(initial) +
      '</div>'
    );
  }
  function hostList() {
    if (st.version === 'current')
      return (
        lead(
          'Current picker · sample reconstruction',
          'My HostDrops',
          'Find a pickup location in the directory.',
        ) + wrap(st.state === 'nearby' ? noMatches() : grid(hostCard('grove'), hostCard('meadow')))
      );
    return (
      lead(
        'Pickup directory',
        'Choose a HostDrop',
        'Check the pickup window and how to join before you choose.',
      ) + wrap(searchDirectory())
    );
  }
  function host() {
    const closed = approved() && st.state === 'closed';
    const status = approved() ? 'Approved member' : awaiting() ? 'Request pending' : h().access;
    let cta;
    if (approved())
      cta = closed ? link('View other HostDrops', 'hosts') : link('Shop this pickup', 'market');
    else if (awaiting()) cta = link('Browse this pickup', 'market');
    else if (st.state === 'guest') cta = link('Sign in to join', 'sign-in', 'btn', { next: 'host' });
    else if (['incomplete', 'verify'].includes(st.state))
      cta = link(
        st.state === 'incomplete' ? 'Complete profile to join' : 'Verify your email',
        'profile',
        'btn',
        { next: 'host' },
      );
    else
      cta = link(
        st.host === 'meadow' ? 'Join HostDrop' : 'Request to join',
        st.next === 'checkout' && st.host === 'meadow' ? 'checkout' : 'host',
        'btn',
        {
          state: st.host === 'meadow' ? 'returning' : 'pending',
          chosen: st.host,
          order: st.order || 'none',
          groveAccess: st.host === 'grove' ? 'pending' : membership('grove'),
          meadowAccess: st.host === 'meadow' ? 'approved' : membership('meadow'),
        },
      );
    return (
      lead('HostDrop', h().name, h().place) +
      wrap(
        grid(
          card(
            status,
            approved()
              ? 'This pickup place is linked to your sample membership.'
              : awaiting()
                ? 'You can follow your request here and browse available food.'
                : 'Join this pickup place to be eligible to place an order.',
            cta,
          ),
          card(
            closed ? 'No open date' : h().day + ' pickup',
            closed
              ? 'Another pickup may have a different schedule.'
              : h().time + ' · Sample pickup window.',
            closed
              ? link('Explore pickups', 'hosts', 'textlink')
              : link('Browse food', 'market', 'textlink'),
          ),
        ),
      ) +
      wrap(farms())
    );
  }
  function shop() {
    if (awaiting() && st.version === 'current')
      return (
        lead(
          'Current shop · sample reconstruction',
          'Waiting for HostDrop approval',
          'Your host is reviewing your request.',
        ) + wrap(link('My HostDrops', 'hosts'))
      );
    if (approved() && st.version === 'current')
      return (
        lead(
          'Current shop · sample reconstruction',
          st.state === 'closed' ? 'No upcoming pickups yet' : 'Pickup dates',
          'Review upcoming pickups for your HostDrop.',
        ) +
        wrap(
          st.state === 'closed'
            ? link('My HostDrops', 'hosts')
            : card(h().name, h().day + ' pickup · ' + h().time, link('Open pickup', 'market')),
        )
      );
    if (approved() && st.state !== 'closed') return market();
    return (
      lead(
        'Shop',
        'Find your pickup',
        'The food you can order depends on the HostDrop and pickup date.',
      ) + wrap(st.state === 'nearby' ? noMatches() : grid(hostCard('grove'), hostCard('meadow')))
    );
  }
  function market() {
    if (approved() && st.state === 'closed') return host();
    return (
      lead(
        h().name,
        h().day + ' market',
        'Pickup from ' + h().time + '. Select a product to see its farm and unit price.',
      ) +
      wrap(
        '<p class="lead">' +
          link('Change pickup', 'hosts', 'textlink') +
          ' · ' +
          link('View basket (' + (+st.carrots + +st.greens) + ')', 'basket', 'textlink') +
          '</p>' +
          grid(
            ...goods.map((g, i) =>
              card(
                g.title,
                g.farm + ' · ' + g.unit,
                link('View product', 'product', 'textlink', { product: String(i) }),
                currency(g.cents),
              ),
            ),
          ),
      )
    );
  }
  function product() {
    const g = goods[+st.product],
      key = +st.product ? 'greens' : 'carrots';
    return (
      lead(g.farm, g.title, g.unit + ' · ' + currency(g.cents)) +
      wrap(
        grid(
          card(
            'Add to your basket',
            'For the ' + h().day + ' pickup at ' + h().name + '.',
            link('Add one to basket', 'basket', 'btn', { [key]: String(Math.min(99, +st[key] + 1)) }),
          ),
          card(
            g.farm,
            'Find the sample grower behind this product.',
            link('Meet the farm', 'farm', 'textlink'),
          ),
        ),
      )
    );
  }
  function basket() {
    const items = goods
      .map((g, i) => ({ g, key: i ? 'greens' : 'carrots', qty: +st[i ? 'greens' : 'carrots'] }))
      .filter((item) => item.qty);
    if (!items.length)
      return (
        lead('Shop', 'Your basket', 'Your sample basket is empty.') +
        wrap(link('Browse pickup', 'market'))
      );
    const list = items
      .map(
        ({ g, key, qty }) =>
          '<li><div><strong>' +
          esc(g.title) +
          '</strong><p>' +
          qty +
          ' × ' +
          currency(g.cents) +
          ' · ' +
          currency(qty * g.cents) +
          '</p>' +
          link('Remove one', 'basket', 'textlink', { [key]: String(qty - 1) }) +
          '</div></li>',
      )
      .join('');
    return (
      lead(h().name, 'Your basket', 'Review your food for ' + h().day + ' pickup.') +
      wrap(
        '<ul class="lines">' +
          list +
          '</ul><p class="lead">Product subtotal <strong>' +
          currency(items.reduce((sum, { g, qty }) => sum + qty * g.cents, 0)) +
          '</strong></p><div class="actions">' +
          link('Review checkout', 'checkout') +
          link('Keep shopping', 'market', 'textlink') +
          '</div>',
      )
    );
  }
  function checkout() {
    let t, d, a;
    if (!+st.carrots && !+st.greens)
      [t, d, a] = [
        'Your basket is empty',
        'Choose food for your pickup first.',
        link('Browse pickup', 'market'),
      ];
    else if (st.state === 'guest')
      [t, d, a] = [
        'Sign in to order',
        'Keep this pickup and basket as you continue.',
        link('Preview sign-in', 'sign-in', 'btn', { next: 'checkout' }),
      ];
    else if (['verify', 'incomplete'].includes(st.state))
      [t, d, a] = [
        'Finish your member profile',
        'A verified email and completed member profile are required to place an order.',
        link('Review next step', 'profile', 'btn', { next: 'checkout' }),
      ];
    else if (!approved())
      [t, d, a] = [
        awaiting() ? 'Waiting for host approval' : 'Join this HostDrop',
        'Placing a pickup order requires an approved membership at this location.',
        link('View HostDrop', 'host', 'btn', { next: 'checkout' }),
      ];
    else if (st.state === 'closed')
      [t, d, a] = [
        'Pickup closed',
        'Choose another open pickup date.',
        link('Explore pickups', 'hosts'),
      ];
    else
      [t, d, a] = [
        'Review sample order',
        'Check the basket and pickup window. Previewing confirmation creates only a sample order in this view.',
        link('Preview confirmation', 'order', 'btn', {
          order: st.host,
          carrots: '0',
          greens: '0',
          next: '',
        }),
      ];
    return lead('Checkout', t, d) + wrap(a);
  }
  function orders() {
    const existing = Object.hasOwn(hosts, st.order);
    return (
      lead('Member account', 'My orders', 'Find your pickup details and order updates.') +
      wrap(
        existing
          ? grid(
              card(
                'Neighborhood pickup',
                'A sample order is ready to review.',
                link('View order', 'order', 'textlink'),
                'Pickup order',
              ),
            )
          : card(
              'No orders yet',
              'Your orders will appear here once you place one.',
              link('Explore pickups', 'hosts', 'textlink'),
            ),
      )
    );
  }
  function order() {
    return (
      lead(
        'Pickup order',
        'Your order details',
        'Sample order · ' + hosts[Object.hasOwn(hosts, st.order) ? st.order : st.host].name,
      ) +
      wrap(
        grid(
          card(
            'Pickup instructions',
            'Bring your order confirmation to the pickup table during the listed window.',
            link('View pickup place', 'host', 'textlink', {
              host: Object.hasOwn(hosts, st.order) ? st.order : st.host,
            }),
          ),
          card(
            'Order updates',
            'Review the conversation for this pickup.',
            link('Read conversation', 'conversation', 'textlink'),
          ),
        ),
      )
    );
  }
  function profile() {
    const verify = st.state === 'verify';
    return (
      lead(
        'Member account',
        verify ? 'Verify your email' : 'Complete your member profile',
        'This sample step keeps your intended pickup and basket.',
      ) +
      wrap(
        link(verify ? 'Preview verified email' : 'Preview completed profile', st.next || 'host', 'btn', {
          state: 'new',
        }),
      )
    );
  }
  function signIn() {
    return (
      lead(
        'Member account',
        'Sign in',
        'Continue with a sample account to return to the page you were opening.',
      ) + wrap(link('Continue with sample account', st.next || 'home', 'btn', { state: 'new' }))
    );
  }
  const views = {
    public: () =>
      hero(
        'FarmerDrop',
        'Farm to neighborhood',
        'Order from local farms and pick up at one neighborhood HostDrop.',
        link('Explore HostDrops', 'hosts', 'btn light', { state: 'guest' }),
      ) +
      wrap(
        '<div class="actions"><a class="btn" href="../facelift.html?design=orchard-blend" data-review-design="orchard-blend">Open Orchard Blend</a><a class="btn alt" href="../facelift.html?design=orchard-blend-tabs" data-review-design="orchard-blend-tabs">Open Green Tabs</a></div>',
      ),
    about: () =>
      lead(
        'FarmerDrop',
        'About FarmerDrop',
        'Connect neighborhood pickup places with farms and the people who buy from them.',
      ) +
      wrap(
        grid(
          card(
            'Find a pickup',
            'See where to collect food from nearby farms.',
            link('Explore HostDrops', 'hosts', 'textlink'),
          ),
          card(
            'Meet the farms',
            'Learn about the farms serving each pickup.',
            link('Explore farms', 'farmers', 'textlink'),
          ),
        ),
      ),
    demo: () =>
      lead(
        'Public preview',
        'Explore a sample pickup',
        'Follow a guest from the directory to a pickup and its local food.',
      ) + wrap(link('Start demo', 'hosts', 'btn', { state: 'guest' })),
    home,
    hosts: hostList,
    host,
    shop,
    market,
    product,
    basket,
    checkout,
    orders,
    order,
    profile,
    'sign-in': signIn,
    help: () =>
      lead(
        'Member guide',
        'Your pickup, step by step',
        'From your first HostDrop to your first pickup.',
      ) + wrap(how()),
    farm: () =>
      lead('Farm profile', goods[+st.product].farm, 'A sample farm serving the neighborhood pickup.') +
      wrap(
        card(
          goods[+st.product].title,
          goods[+st.product].unit,
          link('View product', 'product', 'textlink'),
        ),
      ),
    farmers: () =>
      lead('Farm directory', 'Local farms', 'Explore the growers in the sample pickup network.') +
      wrap(farms()),
    account: () =>
      lead('Member account', 'Your account', 'Manage your membership and find help.') +
      wrap(
        grid(
          card('Pickup membership', h().name, link('View HostDrop', 'host', 'textlink')),
          card(
            'Member support',
            'Find help with your profile, membership or pickup.',
            link('Open support', 'support', 'textlink'),
          ),
        ),
      ),
    guides: () =>
      lead(
        'Guides',
        'Farmer and HostDrop guides',
        'Find first steps for farms and neighborhood hosts.',
      ) +
      wrap(
        grid(
          card(
            'For farms',
            'Prepare products for a neighborhood pickup.',
            onward('Browse farm guides', 'Farmer 101'),
          ),
          card(
            'For HostDrops',
            'Plan and host a neighborhood pickup.',
            onward('Browse HostDrop guides', 'HostDrop 101'),
          ),
        ),
      ),
    support: () =>
      lead(
        'Member support',
        'How can we help?',
        'Find the right place to start with a pickup or an order.',
      ) +
      wrap(
        grid(
          card(
            'A pickup question',
            'Review the place and window for your pickup.',
            link('View HostDrop', 'host', 'textlink'),
          ),
          card(
            'An order question',
            'Open the order to find its details and conversation.',
            link('View orders', 'orders', 'textlink'),
          ),
        ),
      ),
    conversation: () =>
      lead(
        'Order updates',
        'Pickup conversation',
        'Messages connected to the sample pickup appear here.',
      ) +
      wrap(
        card(
          'Pickup update',
          'Your order information is available in the pickup summary.',
          link('View order', 'order', 'textlink'),
        ),
      ),
  };
  function openIndex(group = '') {
    query.value = '';
    area.value = Array.from(area.options).some((x) => x.value === group) ? group : '';
    drawIndex();
    if (!dialog.open) dialog.showModal();
    query.focus();
  }
  function drawIndex() {
    const term = query.value.trim().toLowerCase();
    const found = rows.filter(
      (r) =>
        (!area.value || r.group === area.value) &&
        (!term || (r.title + ' ' + r.group + ' ' + r.label).toLowerCase().includes(term)),
    );
    const groups = Map.groupBy
      ? Map.groupBy(found, (r) => r.group)
      : found.reduce((m, r) => m.set(r.group, [...(m.get(r.group) || []), r]), new Map());
    document.getElementById('result-count').textContent =
      found.length + ' of ' + rows.length + ' review entries';
    document.getElementById('results').innerHTML =
      Array.from(
        groups,
        ([group, items]) =>
          '<section><h3>' +
          esc(group) +
          '</h3>' +
          items
            .map(
              (r) =>
                '<a class="index-result" href="' +
                esc(url(r.id)) +
                '"><span>' +
                esc(r.title) +
                '</span><small>' +
                esc(r.label) +
                '</small></a>',
            )
            .join('') +
          '</section>',
      ).join('') || '<p>Try another page name or area.</p>';
  }
  function receipt(headers, records) {
    return (
      '<div class="table-wrap"><table><thead><tr>' +
      headers.map((v) => '<th scope="col">' + esc(v) + '</th>').join('') +
      '</tr></thead><tbody>' +
      records
        .map(
          (cols) =>
            '<tr>' +
            cols
              .map((v, i) =>
                i === 0 ? '<th scope="row">' + esc(v) + '</th>' : '<td>' + esc(v) + '</td>',
              )
              .join('') +
            '</tr>',
        )
        .join('') +
      '</tbody></table></div>'
    );
  }
  function summaryList(items) {
    return (
      '<dl class="summary-list">' +
      items.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') +
      '</dl>'
    );
  }
  function article(title, sections) {
    return (
      '<article class="reading"><p class="kicker">Reading preview</p><h2>' +
      esc(title) +
      '</h2>' +
      sections
        .map(
          ([name, text], i) =>
            '<details ' +
            (i === 0 ? 'open' : '') +
            '><summary>' +
            esc(name) +
            '</summary><p>' +
            esc(text) +
            '</p></details>',
        )
        .join('') +
      '</article>'
    );
  }
  const studyFor = (title) => rows.find((r) => r.title === title).id;
  function onward(label, title) {
    return link(label, studyFor(title), 'textlink');
  }
  function reviewBody(r) {
    const role = r.group === 'Farmer' ? 'Farm' : r.group;
    const hostRole = r.group === 'HostDrop';
    const source = hostRole ? 'Grove Yard' : 'Meadow Row Farm';
    const roleHome = hostRole ? 'HostDrop dashboard' : 'Farmer dashboard';
    const layout = (title, content, actions) =>
      '<div class="sheet"><h2>' +
      esc(title) +
      '</h2>' +
      content +
      '<div class="actions">' +
      actions +
      '</div></div>';
    // Shared table or document layouts cannot stand in for a scan, referral or role-specific handoff.
    switch (r.pattern) {
      case 'scan-order':
        return layout(
          'Order scan',
          summaryList([
            ['Scanned code', 'Sample order 101'],
            ['Destination', 'Pickup order details'],
          ]),
          link('Open sample order', 'order', 'btn'),
        );
      case 'scan-package':
        return layout(
          'Package scan',
          summaryList([
            ['Package', 'Sample box A'],
            ['Destination', 'Grove Yard'],
            ['Pickup', 'Saturday'],
          ]),
          onward('Preview receiving', 'Receive farm shipments') +
            onward('Preview member pickup', 'Member pickup'),
        );
      case 'roles':
        return layout(
          'Choose how to join',
          grid(
            card('Member', 'Shop from local farms.', link('Continue as member', 'profile', 'textlink')),
            card(
              'Farmer',
              'Bring your food to a pickup.',
              onward('Apply as a farmer', 'Farmer application'),
            ),
            card(
              'HostDrop',
              'Host a neighborhood pickup.',
              onward('Apply as a host', 'HostDrop application'),
            ),
          ),
          '',
        );
      case 'farm-invite':
        return layout(
          'Farm referral',
          summaryList([
            ['Inviting farm', 'Meadow Row Farm'],
            ['After sign-in', 'Return to the farm profile'],
          ]),
          link('Preview referred sign-in', 'sign-in', 'btn', { next: 'farm' }) +
            link('View farm profile', 'farm', 'textlink'),
        );
      case 'pickup-invite':
        return layout(
          'HostDrop referral',
          summaryList([
            ['Pickup place', hosts.grove.name],
            ['After sign-in', 'Return to this HostDrop'],
          ]),
          link('Preview referred sign-in', 'sign-in', 'btn', { next: 'host', host: 'grove' }),
        );
      case 'account-invite':
        return layout(
          'Invited role',
          summaryList([
            ['Sample offer', 'HostDrop team'],
            ['Status', 'Awaiting acceptance'],
          ]),
          link('Preview account sign-in', 'sign-in', 'btn', { next: 'host' }),
        );
      case 'inbox': {
        const member = r.group === 'Member',
          staff = r.group === 'Staff facsimiles',
          farmer = r.group === 'Farmer';
        const subject = staff
          ? 'Application follow-up'
          : farmer
            ? 'Farm delivery'
            : member
              ? 'Pickup update'
              : 'Incoming shipment';
        const dest = staff
          ? 'Application review'
          : farmer
            ? 'Farm deliveries'
            : member
              ? 'Order conversation'
              : 'Receiving conversation';
        return layout(
          staff ? 'Staff correspondence' : role + ' inbox',
          receipt(
            ['Subject', 'Context', 'Status'],
            [
              [subject, staff ? 'Sample application' : 'Saturday pickup', 'Unread'],
              ['Previous update', 'Sample conversation', 'Read'],
            ],
          ),
          onward('Open ' + subject.toLowerCase(), dest),
        );
      }
      case 'role-setup': {
        const staff = r.group === 'Staff facsimiles';
        const target = hostRole
          ? 'HostDrop settings / HostDrop Info'
          : staff
            ? 'Workspace overview'
            : 'Farm settings / Farm Info';
        return layout(
          'Workspace setup',
          summaryList([
            ['Workspace', staff ? 'Staff workspace' : source],
            ['Profile', 'Ready for review'],
            ['Preferences', 'Configured'],
          ]),
          onward('Review ' + (staff ? 'workspace' : 'profile'), target),
        );
      }
      case 'fulfillment':
        return layout(
          'Pickup-day work',
          receipt(
            ['Queue', 'Pickup window', 'Status'],
            [
              ['Receiving', 'Saturday · 8 am', 'Expected'],
              ['Member pickup', 'Saturday · 9 am', 'Ready'],
            ],
          ),
          onward('Review receiving', 'Receive farm shipments') +
            onward('Review member pickup', 'Member pickup'),
        );
      case 'payment-status':
        return layout(
          'Payment setup',
          summaryList([
            ['Workspace', source],
            ['Setup status', 'Sample review pending'],
            ['Next step', 'Return to role settings'],
          ]),
          onward('Review role settings', hostRole ? 'HostDrop settings' : 'Farm settings'),
        );
      case 'roster':
        return layout(
          'Pickup roster',
          receipt(
            ['Association', 'Role', 'Status'],
            [
              ['Sample participant', r.title.split(' / ').pop(), 'Active'],
              ['Sample applicant', 'Request', 'Pending'],
            ],
          ),
          onward('Return to HostDrop settings', 'HostDrop settings'),
        );
      case 'farm-pickups':
        return layout(
          'Serving HostDrops',
          receipt(
            ['Pickup place', 'Schedule', 'Relationship'],
            [
              ['Grove Yard', 'Saturday', 'Active'],
              ['Meadow Hall', 'Wednesday', 'Pending'],
            ],
          ),
          onward('Return to farm settings', 'Farm settings'),
        );
      case 'pack-order':
        return layout(
          'Pack sample order 101',
          receipt(
            ['Item', 'Requested', 'Packed'],
            [
              ['Carrots', '1 bunch', '1 bunch'],
              ['Salad greens', '1 bag', '0 bags'],
            ],
          ),
          onward('Review package', 'Package inventory detail'),
        );
      case 'package-contents':
        return layout(
          'Sample box A',
          receipt(
            ['Contents', 'Unit', 'Quantity'],
            [
              ['Carrots', 'Bunch', '3'],
              ['Salad greens', 'Bag', '2'],
            ],
          ),
          onward('Return to inventory', 'HostDrop inventory'),
        );
      case 'pickup-list':
      case 'archived-orders':
        return layout(
          'Grove Yard pickup list',
          receipt(
            ['Order', 'Window', 'Status'],
            [
              ['Sample 101', 'Saturday · 9 am', 'Ready'],
              ['Sample 102', 'Saturday · 10 am', 'Packing'],
            ],
          ),
          onward('Review member pickup', 'Member pickup'),
        );
      case 'by-farm':
      case 'by-member': {
        const farm = r.pattern === 'by-farm';
        return layout(
          farm ? 'Grouped by farm' : 'Grouped by member',
          receipt(
            [farm ? 'Farm' : 'Member', 'Orders', 'Pickup'],
            [
              [farm ? 'Meadow Row Farm' : 'Sample member A', '2', 'Saturday'],
              [farm ? 'Cedar Gate Growers' : 'Sample member B', '1', 'Saturday'],
            ],
          ),
          r.group === 'Archive'
            ? onward('Review archived order list', 'Archived order list')
            : onward('Open pickup summary', 'Pickup summary'),
        );
      }
      case 'apply-farm':
      case 'apply-host': {
        const farm = r.pattern === 'apply-farm';
        return layout(
          farm ? 'Farm application' : 'HostDrop application',
          receipt(
            ['Step', 'Status'],
            [
              [farm ? 'Farm profile' : 'Pickup address', 'Complete'],
              [farm ? 'Products and practices' : 'Pickup schedule', 'In progress'],
              ['Application review', 'Upcoming'],
            ],
          ),
          onward('Read role guide', farm ? 'Farmer 101' : 'HostDrop 101'),
        );
      }
      case 'interest':
        return layout(
          'Farmer interest',
          summaryList([
            ['Role', 'Prospective farmer'],
            ['Example interest', 'Supply a neighborhood pickup'],
          ]),
          onward('Preview farmer application', 'Farmer application'),
        );
      case 'claim-status':
        return layout(
          'Unsettled claims',
          receipt(
            ['Claim', 'Order', 'Status'],
            [['Sample claim', 'Sample order 101', 'Pending review']],
          ),
          onward('Read conversation', 'Order conversation'),
        );
      case 'printer':
        return layout(
          'Label printer',
          summaryList([
            ['Printer', 'Sample label printer'],
            ['Status', 'Available'],
            ['Format', 'Pickup label'],
          ]),
          onward('Preview a package label', 'Package label'),
        );
      case 'safety':
        return layout(
          'Safety preferences',
          summaryList([
            ['Account', 'Sample account'],
            ['Review topic', 'Safety and support'],
          ]),
          link('Open support', 'support', 'textlink'),
        );
      case 'media':
        return layout(
          'Media resources',
          article('FarmerDrop overview', [
            ['About FarmerDrop', 'Farms bring locally grown food to neighborhood pickup places.'],
            ['Contact', 'Support can direct a media inquiry.'],
          ]),
          link('Open about FarmerDrop', 'about', 'textlink'),
        );
      case 'deletion':
        return layout(
          'Account removal information',
          article('Request information', [
            ['Before a request', 'Review your account and any open pickup orders.'],
            ['Support', 'The support page is the next place to find help.'],
          ]),
          link('Open support', 'support', 'textlink'),
        );
      case 'signup':
      case 'email':
        return layout(
          r.pattern === 'signup' ? 'Sample signup' : 'Email verification',
          summaryList([
            ['Account', 'Sample member'],
            ['Next step', r.pattern === 'signup' ? 'Choose a role' : 'Continue onboarding'],
          ]),
          r.pattern === 'signup'
            ? onward('Preview role selection', 'Choose a role')
            : link('Preview verified account', 'profile', 'btn'),
        );
      case 'pickup-chat':
      case 'receiving-chat': {
        const receiving = r.pattern === 'receiving-chat';
        return layout(
          receiving ? 'Receiving conversation' : 'Pickup conversation',
          summaryList([
            ['Subject', receiving ? 'Incoming farm shipment' : 'Member pickup'],
            ['Message', 'Saturday handoff is scheduled.'],
          ]),
          onward(
            receiving ? 'View receiving' : 'View pickup',
            receiving ? 'Receive farm shipments' : 'Member pickup',
          ),
        );
      }
      case 'farm-info':
      case 'host-info':
      case 'member-info':
        return layout(
          'Profile summary',
          summaryList([
            ['Display name', r.pattern === 'member-info' ? 'Sample member' : source],
            ['Profile state', 'Complete'],
          ]),
          r.pattern === 'member-info'
            ? link('Open account', 'account', 'textlink')
            : onward('Open role settings', hostRole ? 'HostDrop settings' : 'Farm settings'),
        );
      case 'activity':
        return layout(
          'Recent activity',
          receipt(
            ['Event', 'Context', 'Status'],
            [
              ['Preferences reviewed', 'Sample workspace', 'Complete'],
              ['Application received', 'Sample pickup', 'New'],
            ],
          ),
          onward('Return to overview', 'Workspace overview'),
        );
      case 'publication':
        return layout(
          'Reading preview',
          summaryList([
            ['Sample chapter', 'Neighborhood pickup'],
            ['State', 'Draft for review'],
          ]),
          onward('Preview guide reader', 'Field guide reader'),
        );
      case 'staff-catalog':
        return layout(
          'Catalog review',
          receipt(
            ['Product', 'Unit', 'State'],
            [
              ['Carrots', 'Bunch', 'Available'],
              ['Salad greens', 'Bag', 'In review'],
            ],
          ),
          onward('Return to overview', 'Workspace overview'),
        );
      case 'feedback':
        return layout(
          'Review queue',
          receipt(
            ['Subject', 'State'],
            [
              ['Sample submitted item', 'Awaiting review'],
              ['Prior review', 'Complete'],
            ],
          ),
          onward('Return to overview', 'Workspace overview'),
        );
    }
    switch (r.family) {
      case 'inventory':
        return layout(
          'Available stock',
          receipt(
            ['Product', 'Unit', 'Available'],
            [
              ['Carrots', 'Bunch', '16'],
              ['Salad greens', 'Bag', '9'],
            ],
          ),
          hostRole
            ? onward('Review receiving', 'Receive farm shipments')
            : onward('Review packing', 'Farm orders and packing'),
        );
      case 'orders':
        return layout(
          hostRole ? 'Pickup worklist' : 'Packing worklist',
          receipt(
            ['Order', 'Window', 'Status'],
            [
              ['Sample 101', 'Sat · 9 am', 'Ready'],
              ['Sample 102', 'Sat · 10 am', 'In progress'],
            ],
          ),
          hostRole
            ? onward('Open pickup conversation', 'Pickup conversation')
            : onward('Review deliveries', 'Farm deliveries'),
        );
      case 'delivery':
        return layout(
          hostRole ? 'Incoming deliveries' : 'Outgoing deliveries',
          receipt(
            ['Handoff', 'Pickup window', 'Status'],
            [
              ['Meadow Row → Grove Yard', 'Sat · 8 am', 'Packed'],
              ['Cedar Gate → Grove Yard', 'Sat · 8:30 am', 'Expected'],
            ],
          ),
          onward(
            hostRole ? 'Review inventory' : 'Review packing',
            hostRole ? 'HostDrop inventory' : 'Farm orders and packing',
          ),
        );
      case 'finance':
        return layout(
          'Period summary',
          receipt(
            ['Sample entry', 'Status', 'Amount'],
            [
              ['Pickup total', 'Recorded', '$24.00'],
              ['Adjustment', 'Pending', '$4.00'],
            ],
          ),
          r.group === 'Staff facsimiles'
            ? onward('Workspace overview', 'Workspace overview')
            : onward('Return to workspace', roleHome),
        );
      case 'team':
        return layout(
          'Participants',
          receipt(
            ['Role', 'Association', 'Status'],
            [
              ['Farm', 'Meadow Row', 'Active'],
              ['Pickup team', 'Grove Yard', 'Pending'],
            ],
          ),
          ['Farmer', 'HostDrop'].includes(r.group)
            ? onward('Open role settings', hostRole ? 'HostDrop settings' : 'Farm settings')
            : link('Review account', 'account', 'textlink'),
        );
      case 'message':
        return layout(
          'Conversation preview',
          '<ol class="thread"><li><strong>Pickup update</strong><p>Saturday pickup is scheduled at Grove Yard.</p></li><li><strong>Pickup team</strong><p>We will have your sample order at the collection table.</p></li></ol>',
          link('View sample order', 'order', 'textlink'),
        );
      case 'invite':
        return layout(
          'Your invitation',
          summaryList([
            ['Invitation', 'Neighborhood pickup'],
            ['Destination', r.title.includes('Farmer') ? 'Farm enrollment' : 'Pickup membership'],
            ['Status', 'Ready to review'],
          ]),
          link('Continue to sample sign-in', 'sign-in', 'btn', { next: 'host' }),
        );
      case 'identity': {
        const password = /password/i.test(r.title),
          email = /email|forgot/i.test(r.title);
        const field = email ? 'Email address' : password ? 'New password' : 'Account email';
        const val = field.includes('password') ? '••••••••••••' : 'member@example.invalid';
        return layout(
          r.title,
          '<label class="sample-field">' +
            esc(field) +
            '<input type="text" value="' +
            esc(val) +
            '" readonly></label><p class="lead">Sample account · Read-only preview</p>',
          onward(
            password ? 'Return to sign-in' : 'Review member profile',
            password ? 'Sign in' : 'Signed-in member profile',
          ),
        );
      }
      case 'application':
        return layout(
          'Application progress',
          receipt(
            ['Step', 'Status'],
            [
              ['Contact information', 'Complete'],
              ['Role details', 'In progress'],
              ['Review', 'Upcoming'],
            ],
          ),
          r.group === 'Staff facsimiles'
            ? onward('View application queue', 'Workspace overview')
            : link('Preview account step', 'profile', 'textlink'),
        );
      case 'preferences':
        return layout(
          'Settings summary',
          summaryList([
            ['Workspace', r.group === 'Account' ? 'Member account' : source],
            ['Selected preference', r.title.replace(/.* \/ /, '')],
            ['Status', 'Sample configuration'],
          ]),
          r.group === 'HostDrop' || r.group === 'Farmer'
            ? onward('Return to role settings', hostRole ? 'HostDrop settings' : 'Farm settings')
            : link('Return to account', 'account', 'textlink'),
        );
      case 'location':
        return layout(
          'Pickup summary',
          summaryList([
            ['Place', hosts.grove.name],
            ['Neighborhood', hosts.grove.place],
            ['Pickup', hosts.grove.day + ' · ' + hosts.grove.time],
          ]),
          link('Open sample pickup', 'host', 'btn'),
        );
      case 'guide':
      case 'handbook':
      case 'policy': {
        const isPolicy = r.family === 'policy';
        const isHandbook = r.family === 'handbook';
        const contents = isPolicy
          ? [
              ['Overview', 'Document heading and version belong together at the start of this page.'],
              ['Sections', 'Readers can navigate one section at a time.'],
              ['Questions', 'A contextual link leads to support.'],
            ]
          : isHandbook
            ? [
                ['Getting ready', 'Review the steps for your role before the first pickup.'],
                ['Pickup day', 'Keep the pickup checklist close at hand.'],
                ['Help', 'Return to the role guides to choose the next topic.'],
              ]
            : [
                ['Introduction', 'This section introduces the topic shown above.'],
                ['Explore the topic', 'The reading view keeps one section in focus at a time.'],
                ['Further reading', 'Continue to another topic through the guide index.'],
              ];
        return layout(
          isPolicy ? 'Document contents' : isHandbook ? 'Role handbook' : 'Chapter contents',
          article(r.title, contents),
          isPolicy
            ? link('Open support', 'support', 'textlink')
            : link('Browse guides', 'guides', 'textlink'),
        );
      }
      case 'archive':
        return layout(
          'Archive record',
          summaryList([
            ['Entry', r.title],
            ['Availability', 'Historical review'],
            ['Next step', 'Review the current workspace or return home'],
          ]),
          link('Return to member home', 'home', 'btn'),
        );
      case 'fallback':
        return layout(
          'Find another page',
          '<p class="lead">The requested destination is unavailable. Open the member home or use the page index to find another destination.</p>',
          link('Return to member home', 'home', 'btn'),
        );
      case 'workspace':
      case 'staff':
        return layout(
          role + ' workspace',
          receipt(
            ['Sample task', 'Window', 'Status'],
            [
              ['Review upcoming work', 'Saturday morning', 'Open'],
              ['Review completed work', 'Prior pickup', 'Complete'],
            ],
          ),
          r.group === 'Staff facsimiles'
            ? onward('Review workspace summary', 'Workspace overview')
            : onward(
                hostRole ? 'Review receiving' : 'Review packing',
                hostRole ? 'Receive farm shipments' : 'Farm orders and packing',
              ),
        );
      default:
        return layout(
          'Overview',
          summaryList([
            ['Area', r.group],
            ['Page', r.title],
            ['Sample state', 'Available for review'],
          ]),
          r.group === 'Public'
            ? link('Explore HostDrops', 'hosts', 'btn')
            : link('Open member home', 'home', 'btn'),
        );
    }
  }
  function samplePage(r) {
    if (r.view && views[r.view]) return views[r.view]();
    const family = window.blueprintFamilies[r.family];
    return (
      lead(
        r.group + ' · review template',
        r.title,
        r.pattern ? 'Illustrative workflow for this page.' : family.purpose,
      ) +
      wrap(reviewBody(r)) +
      wrap(
        '<details><summary>Presentation review</summary><p>' +
          esc(r.note || family.note) +
          '</p></details>',
      )
    );
  }
  function render(focus = false) {
    const [key, raw] = location.hash.slice(1).split('?');
    const q = new URLSearchParams(raw);
    const allowed = (value, options, initial) => (options.includes(value) ? value : initial);
    const qty = (value) => String(Math.max(0, Math.min(99, Number.parseInt(value, 10) || 0)));
    st = {
      page: key || 'home',
      state: allowed(
        q.get('state'),
        Array.from(scenario.options, (x) => x.value),
        'new',
      ),
      version: q.get('version') === 'current' ? 'current' : 'proposed',
      host: allowed(q.get('host'), Object.keys(hosts), 'grove'),
      chosen: allowed(q.get('chosen'), Object.keys(hosts), ''),
      carrots: qty(q.get('carrots')),
      greens: qty(q.get('greens')),
      product: q.get('product') === '1' ? '1' : '0',
      otherCarrots: qty(q.get('otherCarrots')),
      otherGreens: qty(q.get('otherGreens')),
      groveAccess: allowed(q.get('groveAccess'), ['pending', 'approved', 'available'], ''),
      meadowAccess: allowed(q.get('meadowAccess'), ['pending', 'approved', 'available'], ''),
      next: allowed(q.get('next'), ['checkout', 'host', 'farm'], ''),
      order: allowed(
        q.get('order'),
        ['grove', 'meadow', 'none'],
        ['returning', 'closed'].includes(q.get('state')) ? 'grove' : '',
      ),
    };
    if (dialog.open) dialog.close();
    const entry = rows.find((r) => r.id === st.page);
    const active = entry?.view || st.page;
    if (Object.hasOwn(views, st.page)) main.innerHTML = views[st.page]();
    else if (entry) main.innerHTML = samplePage(entry);
    else
      main.innerHTML =
        lead('Design preview', 'Page unavailable', 'Choose a page from the review index.') +
        wrap('<button type="button" class="btn" data-index-group="">Open page index</button>');
    if (entry)
      main.insertAdjacentHTML(
        'beforeend',
        wrap(
          '<button type="button" class="btn alt" data-index-group="' +
            esc(entry.group) +
            '">Back to page index</button>',
        ),
      );
    scenario.value = st.state;
    version.value = st.version;
    const section = ['hosts', 'host', 'market', 'product', 'basket', 'checkout'].includes(active)
      ? 'shop'
      : ['order', 'conversation'].includes(active)
        ? 'orders'
        : active;
    for (const el of document.querySelectorAll('[data-to]')) {
      el.href = url(el.dataset.to);
      if (el.dataset.to === section) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    }
    document.title =
      (entry?.title || main.querySelector('h1')?.textContent || 'Member blueprint') +
      ' · FarmerDrop preview';
    if (focus && !dialog.open) {
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
    if (parent !== self) parent.postMessage({ type: 'farmerdrop:blueprint-route' }, location.origin);
  }
  for (const group of [...new Set(rows.map((r) => r.group))]) area.add(new Option(group, group));
  scenario.addEventListener('change', () => {
    location.hash = url('home', {
      state: scenario.value,
      chosen: '',
      host: 'grove',
      carrots: '0',
      greens: '0',
      otherCarrots: '0',
      otherGreens: '0',
      groveAccess: '',
      meadowAccess: '',
      order: '',
      next: '',
    });
  });
  version.addEventListener('change', () => {
    location.hash = url('home', { version: version.value });
  });
  document.getElementById('open-index').addEventListener('click', () => openIndex());
  document.getElementById('close-index').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('.index-result')) dialog.close();
  });
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-index-group]');
    if (opener) openIndex(opener.dataset.indexGroup);
    if (e.target.closest('[data-show-all]')) {
      const input = document.getElementById('host-search');
      input.value = '';
      document.getElementById('host-results').innerHTML = directoryResults('');
      input.focus();
    }
    if (e.target.closest('.skip')) {
      e.preventDefault();
      main.focus();
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'host-search')
      document.getElementById('host-results').innerHTML = directoryResults(e.target.value);
  });
  query.addEventListener('input', drawIndex);
  area.addEventListener('change', drawIndex);
  window.addEventListener('hashchange', () => render(true));
  render();
})();
