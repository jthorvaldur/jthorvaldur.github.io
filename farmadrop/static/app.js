const initialScenario = JSON.parse(document.getElementById("initial-scenario").textContent);
const initialResult = JSON.parse(document.getElementById("initial-result").textContent);
const state = { scenario: initialScenario, result: initialResult, selectedLineId: initialScenario.lines[0].id, runId: null, legacyEvents: [] };
const API_ROOT = document.body.dataset.apiRoot || "/api";
const STATIC_MODE = document.body.dataset.staticMode === "true";
const apiPath = (path) => `${API_ROOT.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const minor = (value, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value || 0) / 100);
const qty = (value) => String(value ?? "0").replace(/\.0+$/, "");
const selectedLine = () => state.scenario.lines.find((line) => line.id === state.selectedLineId) || state.scenario.lines[0];
const activeAllocations = () => {
  const superseded = new Set(state.scenario.allocations.map((item) => item.supersedes).filter(Boolean));
  return state.scenario.allocations.filter((item) => !superseded.has(item.id) && item.status !== "reversed");
};

function populateBuilder() {
  const line = selectedLine();
  $("scenario-description").textContent = state.scenario.description;
  $("line-select").innerHTML = state.scenario.lines.map((item) => `<option value="${esc(item.id)}" ${item.id === line.id ? "selected" : ""}>${esc(item.id)} · ${esc(item.product)}</option>`).join("");
  $("ordered").value = line.ordered;
  $("packed").value = line.packed;
  $("handoff").value = line.handoff_accepted;
  $("manifested").value = line.manifested;
  $("allocated").value = line.allocated;
  $("accepted").value = line.customer_accepted;
  $("unit-price").value = line.unit_price_minor;
  $("discount").value = line.discount_minor;
  $("tax-amount").value = line.tax_components.reduce((sum, item) => sum + item.amount_minor, 0);
  $("liability-mode").value = state.scenario.policy.liability_mode;
  $("liability-cap").value = state.scenario.policy.participant_liability_cap_minor ?? "";
  const allocations = activeAllocations().filter((item) => item.order_line_id === line.id);
  const roleQuantity = (roles) => allocations.filter((item) => roles.includes(item.role)).reduce((sum, item) => sum + Number(item.quantity), 0);
  $("farmer-resp").value = roleQuantity(["farmer"]);
  $("host-resp").value = roleQuantity(["host", "dropper", "carrier"]);
  $("platform-resp").value = roleQuantity(["platform", "unresolved"]);
  $("scenario-json").value = JSON.stringify(state.scenario, null, 2);
  const stripeHref = `${STATIC_MODE ? "stripe-case.html" : "/stripe-case"}?scenario=${encodeURIComponent(state.scenario.id)}`;
  $("stripe-case-link").href = stripeHref;
  $("stripe-processor-link").href = stripeHref;
}

function collectScenario() {
  let scenario;
  try { scenario = JSON.parse($("scenario-json").value); }
  catch (error) { throw new Error(`Advanced JSON is invalid: ${error.message}`); }
  const lineIndex = scenario.lines.findIndex((line) => line.id === state.selectedLineId);
  if (lineIndex < 0) throw new Error("Selected source line no longer exists in the advanced JSON.");
  const line = { ...scenario.lines[lineIndex] };
  Object.assign(line, {
    ordered: $("ordered").value, assigned: $("ordered").value, packed: $("packed").value,
    handoff_accepted: $("handoff").value, manifested: $("manifested").value,
    allocated: $("allocated").value, customer_accepted: $("accepted").value,
    unit_price_minor: Number($("unit-price").value), discount_minor: Number($("discount").value),
  });
  const taxAmount = Number($("tax-amount").value || 0);
  if (line.tax_components.length) line.tax_components = line.tax_components.map((component, index) => index === 0 ? { ...component, amount_minor: taxAmount } : { ...component, amount_minor: 0 });
  else if (taxAmount) line.tax_components = [{ id: "supplied-tax", jurisdiction: "SIM", name: "Supplied tax", amount_minor: taxAmount, taxable_basis_minor: 0, rate: "0", tax_code: "simulated" }];
  scenario.lines[lineIndex] = line;
  scenario.policy = { ...scenario.policy, liability_mode: $("liability-mode").value, participant_liability_cap_minor: $("liability-cap").value === "" ? null : Number($("liability-cap").value) };
  const keep = scenario.allocations.filter((item) => item.order_line_id !== line.id);
  const definitions = [
    ["farmer", $("farmer-resp").value, line.farmer_id, "farmer underpacked"],
    ["host", $("host-resp").value, "host-1", "host/drop loss or damage"],
    ["platform", $("platform-resp").value, "platform", "goodwill/platform absorption"],
  ];
  const replacements = definitions.filter(([, value]) => Number(value) > 0).map(([role, value, actor, reason], index) => ({
    id: `ui:${line.id}:${role}:${index + 1}`, order_line_id: line.id, actor_id: actor, role,
    quantity: value, reason, status: "adjudicated", decision_version: 1, supersedes: null,
    policy_version: "liability-v1", evidence: ["operator:simulator"],
  }));
  scenario.allocations = [...keep, ...replacements];
  state.scenario = scenario;
  $("scenario-json").value = JSON.stringify(scenario, null, 2);
  return scenario;
}

async function reconcile() {
  const scenario = collectScenario();
  if (STATIC_MODE) {
    const response = await fetch(apiPath(`results/${encodeURIComponent(scenario.id)}`));
    if (!response.ok) throw new Error("The public build contains frozen Python fixtures; custom edits require the local Python service.");
    state.result = await response.json(); state.runId = null; render();
    $("run-status").textContent = "Frozen Python result loaded. Custom edits require the local service.";
    return;
  }
  $("run-status").textContent = "Reconciling in Python…";
  const response = await fetch(apiPath("reconcile"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(scenario) });
  if (!response.ok) { const body = await response.json(); throw new Error(body.detail ? JSON.stringify(body.detail) : "Reconciliation failed"); }
  state.result = await response.json(); state.runId = null; render();
  $("run-status").textContent = state.result.invariants.every((item) => item.passed) ? "All invariants pass." : "Review invariant failures.";
}

function render() {
  const result = state.result, currency = result.currency;
  $("metric-ordered").textContent = result.totals.ordered_quantity;
  $("metric-accepted").textContent = result.totals.accepted_quantity;
  $("metric-shortage").textContent = result.totals.shortage_quantity;
  $("metric-remedy").textContent = minor(result.totals.remedy_total_minor, currency);
  $("metric-absorption").textContent = minor(result.totals.platform_absorption_minor, currency);
  $("metric-settlement").textContent = result.totals.settlement_state === "calculated" ? "Calculated" : "Held";

  const byLine = result.timeline.reduce((groups, item) => {
    const key = item.source_line_id || "other";
    (groups[key] ||= []).push(item);
    return groups;
  }, {});
  $("timeline").innerHTML = Object.entries(byLine).map(([lineId, events]) => {
    const line = state.scenario.lines.find((item) => item.id === lineId);
    return `<div class="timeline-lane"><div class="lane-label"><strong>${esc(line?.product || lineId)}</strong><span>${esc(lineId)}</span></div><div class="lane-track">${events.filter((event) => event.quantity !== null).map((event) => `<div class="stage"><div class="stage-dot"></div><strong>${esc(event.stage.replaceAll("_", " "))}</strong><span>${esc(qty(event.quantity))} · ${esc(event.state)}</span></div>`).join("")}</div></div>`;
  }).join("");

  $("manifest-table").innerHTML = result.manifests.map((item) => `<tr><td><strong>${esc(item.manifest_id)}</strong><br><span class="eyebrow">${esc(item.manifest_line_id)}</span></td><td>${esc(item.farmer_id)}</td><td>${esc(item.product)}</td><td class="num">${esc(qty(item.source_quantity))}</td><td class="num">${esc(qty(item.allocated_quantity))}</td><td class="num">${esc(qty(item.remaining_quantity))}</td><td><span class="badge ${item.conserved ? "good" : "bad"}">${item.conserved ? "conserved" : "overallocated"}</span></td></tr>`).join("");
  $("discrepancy-table").innerHTML = result.discrepancies.length ? result.discrepancies.map((item) => `<tr><td>${esc(item.order_line_id)}</td><td>${esc(item.stage)}</td><td><span class="badge ${item.kind === "overage" ? "warn" : "bad"}">${esc(item.kind)}</span></td><td class="num">${esc(qty(item.expected))}</td><td class="num">${esc(qty(item.observed))}</td><td class="num">${esc(qty(item.quantity))}</td><td>${esc(item.reason)}</td></tr>`).join("") : `<tr><td colspan="7" class="empty">No physical discrepancies.</td></tr>`;
  $("responsibility-grid").innerHTML = result.responsibilities.length ? result.responsibilities.map((item) => `<article class="card"><p class="eyebrow">decision v${item.decision_version} · ${esc(item.status)}</p><h3>${esc(item.actor_id)} · ${esc(item.role)}</h3><dl><dt>Quantity</dt><dd>${esc(qty(item.quantity))}</dd><dt>Merchandise basis</dt><dd>${minor(item.merchandise_minor,currency)}</dd></dl><p>${esc(item.reason)}</p>${item.supersedes ? `<span class="badge warn">supersedes ${esc(item.supersedes)}</span>` : ""}</article>`).join("") : `<p class="empty">No responsibility allocation is required.</p>`;
  $("remedy-list").innerHTML = result.remedies.length ? result.remedies.map((item) => `<article class="stack-item"><p class="eyebrow">${esc(item.order_line_id)} · ${esc(qty(item.quantity))} units</p><h3>${esc(item.product)}</h3><dl><dt>Gross line share</dt><dd>${minor(item.original_merchandise_minor,currency)}</dd><dt>Discount share</dt><dd>−${minor(item.discount_share_minor,currency)}</dd><dt>Net merchandise</dt><dd>${minor(item.merchandise_minor,currency)}</dd><dt>Original tax reversed</dt><dd>${minor(item.tax_minor,currency)}</dd><dt>Refundable fee</dt><dd>${minor(item.fee_minor,currency)}</dd><dt><strong>Total remedy</strong></dt><dd><strong>${minor(item.total_minor,currency)}</strong></dd></dl><p>${esc(item.derivation)}</p></article>`).join("") : `<p class="empty">No customer remedy.</p>`;
  $("settlement-list").innerHTML = result.settlements.map((item) => `<article class="stack-item"><p class="eyebrow">${esc(item.role)} · ${esc(item.policy)}</p><h3>${esc(item.actor_id)}</h3><dl><dt>Original entitlement</dt><dd>${minor(item.original_entitlement_minor,currency)}</dd><dt>Responsibility</dt><dd>${minor(item.responsibility_minor,currency)}</dd><dt>Settlement offset</dt><dd>${minor(item.applied_offset_minor,currency)}</dd><dt>Recoverable balance</dt><dd>${minor(item.recoverable_minor,currency)}</dd><dt><strong>Net payout</strong></dt><dd><strong>${minor(item.net_payout_minor,currency)}</strong></dd></dl></article>`).join("");
  $("journal").innerHTML = result.journal.map((entry, index) => `<details ${index === result.journal.length - 1 ? "open" : ""}><summary><strong>#${entry.effective_order} · ${esc(entry.event_type.replaceAll("_"," "))}</strong><span>${minor(entry.lines.filter((line) => line.side === "debit").reduce((sum,line) => sum + line.amount_minor,0),currency)} debits = credits · ${esc(entry.state)}</span></summary><div class="journal-entry"><p class="eyebrow">${esc(entry.idempotency_key)} · ${esc(entry.source_reference)}</p><table><thead><tr><th>Side</th><th>Account</th><th class="num">Amount</th><th>Provenance</th></tr></thead><tbody>${entry.lines.map((line) => `<tr><td>${esc(line.side)}</td><td>${esc(line.account)}</td><td class="num">${minor(line.amount_minor,currency)}</td><td>${esc(line.provenance)}</td></tr>`).join("")}</tbody></table></div></details>`).join("");
  $("money-checkpoints").innerHTML = result.money_checkpoints.map((item) => `<tr><td><strong>${esc(item.stage.replaceAll("_", " "))}</strong></td><td><span class="badge ${item.status === "observed" ? "good" : "warn"}">${esc(item.status)}</span></td><td class="num">${minor(item.customer_collected_minor,currency)}</td><td class="num">${minor(item.processor_cash_minor,currency)}</td><td class="num">${minor(item.processor_fees_minor,currency)}</td><td class="num">${minor(item.customer_refunds_minor,currency)}</td><td class="num">${minor(item.participant_transfers_minor,currency)}</td><td class="num">${minor(item.tax_remitted_minor,currency)}</td><td class="num">${minor(item.funding_gap_minor,currency)}</td><td><span class="badge ${item.passed ? "good" : "bad"}">${item.passed ? "sources = uses" : minor(item.conservation_delta_minor,currency)}</span></td></tr>`).join("");
  $("processor-commands").innerHTML = result.processor.commands.length ? result.processor.commands.map((item) => `<article class="stack-item"><p class="eyebrow">${esc(item.processor_id)}</p><h3>${esc(item.action)} <span class="badge ${item.status === "succeeded" ? "good" : ["unknown","failed","disputed"].includes(item.status) ? "bad" : "warn"}">${esc(item.status)}</span></h3><p>${esc(item.idempotency_key)} · submitted ${item.submission_count} time(s)</p></article>`).join("") : `<p class="empty">No processor commands.</p>`;
  $("processor-queue").innerHTML = result.processor.reconciliation_queue.length ? result.processor.reconciliation_queue.map((item) => `<p><span class="badge bad">needs review</span> ${esc(item)}</p>`).join("") : `<p><span class="badge good">clear</span> Internal intent matches observed processor state.</p>`;
  $("invariant-grid").innerHTML = result.invariants.map((item) => `<article class="invariant ${item.passed ? "good" : "bad"}"><header><span class="eyebrow">${esc(item.code)}</span><span class="badge ${item.passed ? "good" : "bad"}">${item.passed ? "pass" : "fail"}</span></header><h3>${esc(item.label)}</h3><p>${esc(item.detail)}</p></article>`).join("");
  $("comparison-table").innerHTML = result.comparison.map((item) => `<tr><td>${esc(item.label)}</td><td class="num">${minor(item.original_minor,currency)}</td><td class="num">${minor(item.reconciled_minor,currency)}</td><td class="num">${item.delta_minor > 0 ? "+" : ""}${minor(item.delta_minor,currency)}</td></tr>`).join("");
  $("audit-report").textContent = result.audit_report;
}

async function loadScenario(id) {
  const response = await fetch(apiPath(`scenarios/${encodeURIComponent(id)}`));
  if (!response.ok) throw new Error("Scenario could not be loaded.");
  state.scenario = await response.json(); state.selectedLineId = state.scenario.lines[0].id;
  populateBuilder(); await reconcile();
}

async function saveRun() {
  if (STATIC_MODE) throw new Error("Freezing custom runs requires the local Python service.");
  const scenario = collectScenario();
  const key = `ui:${scenario.id}:${Date.now()}`;
  const response = await fetch(apiPath("runs"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario, idempotency_key: key }) });
  if (!response.ok) throw new Error("The run could not be frozen.");
  const body = await response.json(); state.runId = body.run_id;
  $("run-status").textContent = `Frozen as ${body.run_id}`;
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}

function reportError(error) { $("run-status").textContent = error.message; $("run-status").style.color = "var(--rust-deep)"; }

async function runLegacy(nextEvent) {
  if (STATIC_MODE) throw new Error("Use the linked client-side legacy simulator on the public build; API replay requires local Python.");
  const events = nextEvent ? [...state.legacyEvents, nextEvent] : state.legacyEvents;
  const body = {
    config: {
      basket_minor: Math.round(Number($("legacy-basket").value) * 100),
      tax_rate: $("legacy-tax").value,
      take_rate: $("legacy-take").value,
      hop_count: Number($("legacy-hops").value),
      refund_fraction: $("legacy-refund").value,
    },
    events,
  };
  const response = await fetch(apiPath("legacy/simulate"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) { const error = await response.json(); throw new Error(error.detail || "Legacy event rejected"); }
  const result = await response.json(); state.legacyEvents = events;
  $("legacy-status").textContent = `${result.journal.length} event(s) · refunded ${Number(result.refunded_fraction) * 100}% · farmer paid ${result.farmer_paid ? "yes" : "no"} · dispute ${result.dispute_open ? "open" : "closed"}`;
  $("legacy-proof").innerHTML = [
    ["Total debits", minor(result.total_debits_minor)],
    ["Total credits", minor(result.total_credits_minor)],
    ["Books balance", result.balanced ? "pass" : "fail"],
    ["Σ book nets", minor(result.book_net_sum_minor)],
    ["Python self-audit", `${result.self_audit_checks} checks`],
  ].map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
  $("legacy-books").innerHTML = Object.entries(result.book_nets).map(([book, value]) => `<tr><td>${esc(book.replaceAll("_", " "))}</td><td class="num">${minor(value)}</td></tr>`).join("");
  $("legacy-journal").innerHTML = result.journal.map((entry, index) => `<div class="legacy-row"><strong>#${index + 1}</strong><div>${esc(entry.event_type.replaceAll("_", " "))}<br><span>${esc(entry.idempotency_key)}</span></div><strong>${minor(entry.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount_minor, 0))}</strong></div>`).join("");
}

async function quoteTexasTax() {
  if (STATIC_MODE) throw new Error("Interactive tax quoting requires the local Python service; frozen Texas cases remain visible in the public build.");
  const dollarsToMinor = (value) => Math.round(Number(value || 0) * 100);
  const body = {
    lines: [{
      id: "ui-texas-line",
      description: "Texas simulator line",
      merchandise_minor: dollarsToMinor($("texas-merchandise").value),
      delivery_minor: dollarsToMinor($("texas-delivery").value),
      category: $("texas-category").value,
    }],
    policy: { state_rate: "0.0625", local_rate: $("texas-local-rate").value, state_jurisdiction: "TX", local_jurisdiction: "TX-LOCAL", marketplace_provider_collects: true },
  };
  const response = await fetch(apiPath("tax/texas/quote"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) { const error = await response.json(); throw new Error(error.detail ? JSON.stringify(error.detail) : "Texas quote failed"); }
  const result = await response.json();
  $("texas-result").textContent = `${minor(result.taxable_basis_minor)} taxable · ${minor(result.exempt_basis_minor)} exempt · ${minor(result.state_tax_minor)} state + ${minor(result.local_tax_minor)} local = ${minor(result.total_tax_minor)} tax · ${minor(result.grand_total_minor)} total`;
}

$("scenario-select").addEventListener("change", (event) => loadScenario(event.target.value).catch(reportError));
$("line-select").addEventListener("change", (event) => { state.selectedLineId = event.target.value; populateBuilder(); });
$("simulate").addEventListener("click", () => reconcile().catch(reportError));
$("save-run").addEventListener("click", () => saveRun().catch(reportError));
$("export-scenario").addEventListener("click", () => download(`${state.scenario.id.toLowerCase()}-scenario.json`, JSON.stringify({ scenario: collectScenario() }, null, 2), "application/json"));
$("export-report").addEventListener("click", () => download(`${state.scenario.id.toLowerCase()}-audit.txt`, state.result.audit_report, "text/plain"));
$("import-scenario").addEventListener("change", async (event) => {
  try {
    const payload = JSON.parse(await event.target.files[0].text()); state.scenario = payload.scenario || payload;
    state.selectedLineId = state.scenario.lines[0].id; $("scenario-select").value = state.scenario.id; populateBuilder(); await reconcile();
  } catch (error) { reportError(error); }
});
document.querySelectorAll("[data-legacy-event]").forEach((button) => button.addEventListener("click", () => runLegacy(button.dataset.legacyEvent).catch((error) => { $("legacy-status").textContent = error.message; })));
$("legacy-reset").addEventListener("click", () => { state.legacyEvents = []; $("legacy-status").textContent = "Legacy journal cleared."; $("legacy-proof").innerHTML = ""; $("legacy-books").innerHTML = ""; $("legacy-journal").innerHTML = ""; });
$("texas-quote").addEventListener("click", () => quoteTexasTax().catch((error) => { $("texas-result").textContent = error.message; }));

populateBuilder(); render();
const requestedScenario = new URLSearchParams(window.location.search).get("scenario");
if (requestedScenario && requestedScenario !== state.scenario.id) {
  $("scenario-select").value = requestedScenario;
  loadScenario(requestedScenario).catch(reportError);
}
