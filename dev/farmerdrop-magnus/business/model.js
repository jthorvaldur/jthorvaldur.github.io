export const dates = [
  { id: '2026-11-28', label: 'Sat, Nov 28, 2026' },
  { id: '2026-12-05', label: 'Sat, Dec 5, 2026' },
];

export const workspaces = {
  farmer: { label: 'Farmer', name: 'Cedar Row Farm', queues: ['packing', 'deliveries'] },
  host: { label: 'HostDrop', name: 'Orchard Lane', queues: ['receiving', 'pickup'] },
};

// Each sample order is packed for one member in one package. Its progress
// follows the order through handover, after the host has received the package.
const stages = ['to-pack', 'packed', 'in-transit', 'received', 'picked-up'];
export const queues = {
  packing: {
    role: 'farmer', label: 'Packing', action: 'Complete packing', stage: 'to-pack',
    pendingLabel: 'To pack', doneLabel: 'Packed',
    primaryHeading: 'Produce', detailHeading: 'Member', quantityHeading: 'Quantity',
  },
  deliveries: {
    role: 'farmer', label: 'Deliveries', action: 'Ship', stage: 'packed',
    pendingLabel: 'Ready to ship', doneLabel: 'Shipped',
    primaryHeading: 'Package contents', detailHeading: 'Member', quantityHeading: 'Quantity',
  },
  receiving: {
    role: 'host', label: 'Receiving', action: 'Receive', stage: 'in-transit',
    pendingLabel: 'In transit', doneLabel: 'Received',
    primaryHeading: 'Package contents', detailHeading: 'Member', quantityHeading: 'Quantity',
  },
  pickup: {
    role: 'host', label: 'Pickup', action: 'Hand over', stage: 'received',
    pendingLabel: 'Ready for pickup', doneLabel: 'Picked up',
    primaryHeading: 'Member', detailHeading: 'Produce', quantityHeading: 'Quantity',
  },
};

function order(id, member, produce, quantity, stage) {
  return { id, member, produce, quantity, stage };
}

const sampleOrders = {
  '2026-11-28': [
    order('FD-2401', 'Member 101', 'Rainbow carrots', '2 bunches', 'to-pack'),
    order('FD-2402', 'Member 102', 'Tuscan kale', '1 bunch', 'to-pack'),
    order('FD-2403', 'Member 103', 'Yukon gold potatoes', '1 bag (3 lb)', 'to-pack'),
    order('FD-2404', 'Member 104', 'Delicata squash', '2 squash', 'packed'),
    order('FD-2405', 'Member 105', 'Golden beets', '1 bunch', 'packed'),
    order('FD-2406', 'Member 106', 'Red onions', '1 bag (2 lb)', 'in-transit'),
    order('FD-2407', 'Member 107', 'Collard greens', '2 bunches', 'in-transit'),
    order('FD-2408', 'Member 108', 'Rainbow carrots', '1 bunch', 'received'),
    order('FD-2409', 'Member 109', 'Yukon gold potatoes', '2 bags (3 lb each)', 'received'),
    order('FD-2410', 'Member 110', 'Tuscan kale', '2 bunches', 'picked-up'),
  ],
  '2026-12-05': [
    order('FD-2501', 'Member 106', 'Golden beets', '2 bunches', 'to-pack'),
    order('FD-2502', 'Member 109', 'Red onions', '1 bag (2 lb)', 'to-pack'),
    order('FD-2503', 'Member 104', 'Collard greens', '1 bunch', 'packed'),
    order('FD-2504', 'Member 110', 'Delicata squash', '3 squash', 'in-transit'),
    order('FD-2505', 'Member 102', 'Tuscan kale', '2 bunches', 'received'),
    order('FD-2506', 'Member 103', 'Rainbow carrots', '1 bunch', 'picked-up'),
  ],
};

const storageKey = 'farmerdrop.preview.business.order-progress.v1';
let memory = {};
let useStorage = true;

function readProgress() {
  if (!useStorage) return memory;
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Some browsers restrict tab storage.
  }
  return memory;
}

function currentStage(record, progress) {
  // Ignore unknown or older saved stages if sample data changes.
  return Math.max(stages.indexOf(record.stage), stages.indexOf(progress[record.id]));
}

export function getRows(queueId, dateId) {
  if (!Object.hasOwn(queues, queueId) || !Object.hasOwn(sampleOrders, dateId)) return [];
  const queue = queues[queueId];
  const stage = stages.indexOf(queue.stage);
  const progress = readProgress();
  const rows = [];
  for (const record of sampleOrders[dateId]) {
    const current = currentStage(record, progress);
    if (current < stage) continue;
    const actionable = current === stage;
    rows.push({
      id: record.id,
      primary: queueId === 'pickup' ? record.member : record.produce,
      detail: queueId === 'pickup' ? record.produce : record.member,
      quantity: record.quantity,
      status: actionable ? queue.pendingLabel : queue.doneLabel,
      actionable,
    });
  }
  return rows;
}

export function advance(ids, queueId, dateId) {
  if (!Array.isArray(ids) && !(ids instanceof Set)) return 0;
  const selected = [...new Set(ids)];
  if (!selected.length || !Object.hasOwn(queues, queueId) || !Object.hasOwn(sampleOrders, dateId)) return 0;
  if (queueId === 'pickup' && selected.length !== 1) return 0;
  const stage = stages.indexOf(queues[queueId].stage);
  const progress = readProgress();
  const eligible = new Set(sampleOrders[dateId].filter(record => currentStage(record, progress) === stage).map(record => record.id));
  if (selected.some(id => !eligible.has(id))) return 0;
  const next = { ...progress };
  for (const id of selected) next[id] = stages[stage + 1];
  memory = next;
  if (useStorage) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Preserve changes in memory even when stale storage is still readable.
      useStorage = false;
    }
  }
  return selected.length;
}
