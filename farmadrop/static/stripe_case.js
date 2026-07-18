const initialCase = JSON.parse(document.getElementById("initial-stripe-case").textContent);
const API_ROOT = document.body.dataset.apiRoot || "/api";
const STATIC_MODE = document.body.dataset.staticMode === "true";
const apiPath = (path) => `${API_ROOT.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
const state = { data: initialCase, step: 0 };

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const money = (minor) => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(Number(minor || 0) / 100);
const label = (value) => String(value).replaceAll("_", " ").replaceAll(".", " · ");

function renderChart() {
  const snapshots = state.data.stripe.snapshots;
  const values = snapshots.map((item) => item.processor_cash_minor);
  const width = 1080, height = 280, left = 70, right = 30, top = 24, bottom = 50;
  const low = Math.min(0, ...values), high = Math.max(1, ...values);
  const span = Math.max(1, high - low);
  const x = (index) => left + (index / Math.max(1, snapshots.length - 1)) * (width - left - right);
  const y = (value) => top + ((high - value) / span) * (height - top - bottom);
  const path = snapshots.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(2)},${y(item.processor_cash_minor).toFixed(2)}`).join(" ");
  const points = snapshots.map((item, index) => `<circle cx="${x(index)}" cy="${y(item.processor_cash_minor)}" r="${index === state.step ? 6 : 3}" class="${index === state.step ? "selected" : ""}"><title>${esc(item.kind)} · ${money(item.processor_cash_minor)}</title></circle>`).join("");
  const zero = y(0);
  $("stripe-cash-chart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Processor cash after each Stripe event"><title>Processor cash by Stripe event</title><line x1="${left}" y1="${zero}" x2="${width - right}" y2="${zero}" class="zero-line"/><text x="${left - 10}" y="${zero + 4}" text-anchor="end">$0</text><path d="${path}" class="cash-path"/>${points}<text x="${left}" y="${height - 15}">event 1</text><text x="${width - right}" y="${height - 15}" text-anchor="end">event ${snapshots.length}</text></svg>`;
}

function renderSelected() {
  const interaction = state.data.stripe.interactions[state.step];
  const snapshot = state.data.stripe.snapshots[state.step];
  $("stripe-event-name").textContent = label(interaction.kind);
  $("stripe-step-position").textContent = `Event ${state.step + 1} of ${state.data.stripe.interactions.length}`;
  $("stripe-prev").disabled = state.step === 0;
  $("stripe-next").disabled = state.step === state.data.stripe.interactions.length - 1;
  $("stripe-event-detail").innerHTML = `<p><span class="badge ${snapshot.passed ? "good" : "bad"}">${snapshot.passed ? "sources = uses" : "imbalance"}</span> <code>${esc(interaction.object_id)}</code></p><dl><dt>Idempotency key</dt><dd><code>${esc(interaction.idempotency_key)}</code></dd><dt>Event id</dt><dd><code>${esc(interaction.event_id)}</code></dd><dt>Amount / fee on event</dt><dd>${money(interaction.amount_minor)} / ${money(interaction.fee_minor)}</dd><dt>Customer collections</dt><dd>${money(snapshot.customer_collections_minor)}</dd><dt>Processor cash</dt><dd class="${snapshot.processor_cash_minor < 0 ? "negative" : ""}">${money(snapshot.processor_cash_minor)}</dd><dt>Fees retained by Stripe</dt><dd>${money(snapshot.processor_fees_minor)}</dd><dt>Customer refunds</dt><dd>${money(snapshot.customer_refunds_minor)}</dd><dt>Participant transfers</dt><dd>${money(snapshot.participant_transfers_minor)}</dd><dt>Tax remitted</dt><dd>${money(snapshot.tax_remitted_minor)}</dd><dt>Source / use total</dt><dd>${money(snapshot.source_total_minor)} / ${money(snapshot.use_total_minor)}</dd></dl>`;
  [...$("stripe-steps").querySelectorAll("button")].forEach((button, index) => button.setAttribute("aria-pressed", String(index === state.step)));
  renderChart();
}

function renderCase() {
  const data = state.data, c = data.components;
  $("stripe-scenario-select").value = data.scenario_id;
  $("stripe-case-title").textContent = `${data.scenario_id} · ${data.title}`;
  $("stripe-case-description").textContent = data.description;
  $("back-to-recon").href = `${STATIC_MODE ? "reconcile.html" : "/reconcile"}?scenario=${encodeURIComponent(data.scenario_id)}`;
  $("stripe-case-strip").innerHTML = `<div><span>Captured</span><strong>${money(c.captured_minor)}</strong><small>merchandise + tax + fixed fee</small></div><div><span>Customer refund</span><strong>${money(c.refund_total_minor)}</strong><small>exact remedy legs</small></div><div><span>Final processor cash</span><strong class="${c.final_processor_cash_minor < 0 ? "negative" : ""}">${money(c.final_processor_cash_minor)}</strong><small>${c.funding_gap_minor ? `${money(c.funding_gap_minor)} funding gap` : "no modeled gap"}</small></div>`;
  const componentRows = [
    ["Merchandise", c.merchandise_minor], ["Original tax", c.tax_minor], ["Fixed fee", c.fixed_fee_minor],
    ["Card fee", c.card_fee_minor], ["Refund merchandise", c.refund_merchandise_minor], ["Refund tax", c.refund_tax_minor],
    ["Refund fixed fee", c.refund_fixed_fee_minor], ["Participant transfers", c.participant_transfers_minor],
    ["Payout fees", c.payout_fees_minor], ["Tax remittance", c.tax_remittance_minor],
  ];
  $("stripe-components").innerHTML = componentRows.map(([name, value]) => `<tr><th>${esc(name)}</th><td class="num">${money(value)}</td></tr>`).join("");
  $("stripe-steps").innerHTML = data.stripe.interactions.map((item, index) => `<button type="button" data-step="${index}" aria-pressed="false"><span>${index + 1}</span><b>${esc(label(item.kind))}</b><small>${esc(item.object_id)}</small></button>`).join("");
  $("stripe-steps").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { state.step = Number(button.dataset.step); renderSelected(); }));
  $("legacy-parity-badge").className = `badge ${data.legacy_default_parity ? "good" : "bad"}`;
  $("legacy-parity-badge").textContent = data.legacy_default_parity ? "canonical graph defaults = Python · pass" : "canonical parity failed";
  $("legacy-config-line").textContent = `Injected: basket ${money(data.legacy_config.basket_minor)} · tax ${(Number(data.legacy_config.tax_rate) * 100).toFixed(3)}% · take ${(Number(data.legacy_config.take_rate) * 100).toFixed(2)}% · ${data.legacy_config.hop_count} hops · refund ${(Number(data.legacy_config.refund_fraction) * 100).toFixed(2)}% · ${data.legacy.self_audit_checks} adapter checks`;
  $("legacy-comparison").innerHTML = data.comparisons.map((item) => `<tr><td><b>${esc(item.component)}</b></td><td class="num">${money(item.recon_minor)}</td><td class="num">${money(item.legacy_minor)}</td><td class="num">${item.delta_minor > 0 ? "+" : ""}${money(item.delta_minor)}</td><td>${esc(item.explanation)}</td></tr>`).join("");
  $("stripe-warnings").innerHTML = data.warnings.map((item) => `<p>${esc(item)}</p>`).join("");
  state.step = 0;
  renderSelected();
}

async function loadCase(id) {
  const response = await fetch(apiPath(`stripe/cases/${encodeURIComponent(id)}`));
  if (!response.ok) throw new Error(`Stripe case could not be loaded (${response.status}).`);
  state.data = await response.json();
  renderCase();
  history.replaceState({}, "", `${STATIC_MODE ? "stripe-case.html" : "/stripe-case"}?scenario=${encodeURIComponent(id)}`);
}

$("stripe-scenario-select").addEventListener("change", (event) => loadCase(event.target.value).catch((error) => { $("stripe-case-description").textContent = error.message; }));
$("stripe-prev").addEventListener("click", () => { if (state.step > 0) { state.step -= 1; renderSelected(); } });
$("stripe-next").addEventListener("click", () => { if (state.step < state.data.stripe.interactions.length - 1) { state.step += 1; renderSelected(); } });
renderCase();
