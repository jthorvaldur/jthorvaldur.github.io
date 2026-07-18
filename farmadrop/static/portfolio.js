const money = (minor) => {
  const sign = minor < 0 ? "−" : "";
  return `${sign}$${(Math.abs(minor) / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

const API_ROOT = document.body.dataset.apiRoot || "/api";
const apiPath = (path) => `${API_ROOT.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

const shortMoney = (minor) => {
  const value = minor / 100;
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1000) return `${sign}$${(absolute / 1000).toFixed(1)}k`;
  return `${sign}$${absolute.toFixed(0)}`;
};

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[char]);

const SERIES_COLORS = ["#1e3a2a", "#d9930d", "#2f6b4a", "#b23a1e", "#466c8a", "#76518b", "#8a6b36", "#b95f82", "#64733e"];

function renderChart(targetId, points, series, unit = "money") {
  const target = document.getElementById(targetId);
  const width = 1120;
  const height = 420;
  const margin = {top: 34, right: 24, bottom: 56, left: 82};
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const values = series.flatMap((item) => points.map((point) => Number(point[item.key])));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const padding = Math.max(1, (maximum - minimum) * 0.08);
  const low = minimum < 0 ? minimum - padding : 0;
  const high = maximum + padding;
  const x = (index) => margin.left + (index / Math.max(1, points.length - 1)) * innerWidth;
  const y = (value) => margin.top + ((high - value) / (high - low)) * innerHeight;
  const format = unit === "money" ? shortMoney : (value) => Number(value).toLocaleString();
  const ticks = Array.from({length: 6}, (_, index) => low + ((high - low) * index) / 5);
  const grid = ticks.map((tick) => `<line x1="${margin.left}" y1="${y(tick)}" x2="${width - margin.right}" y2="${y(tick)}" class="chart-grid"/><text x="${margin.left - 12}" y="${y(tick) + 4}" text-anchor="end" class="chart-label">${format(tick)}</text>`).join("");
  const lines = series.map((item, seriesIndex) => {
    const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(2)},${y(Number(point[item.key])).toFixed(2)}`).join(" ");
    const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
    const finalPoint = points[points.length - 1];
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${seriesIndex < 3 ? 2.4 : 1.7}" vector-effect="non-scaling-stroke"><title>${escapeHtml(item.label)} · ${escapeHtml(format(finalPoint[item.key]))}</title></path>`;
  }).join("");
  const eventPoints = points.map((point, index) => {
    const observed = point.status === "observed";
    return `<circle cx="${x(index)}" cy="${y(Number(point[series[0].key]))}" r="${observed ? 2.7 : 2.1}" class="event-point ${observed ? "observed" : "projected"}"><title>${escapeHtml(point.scenario_id)} · ${escapeHtml(point.event)} · posted ${escapeHtml(point.posted_at)} · effective ${escapeHtml(point.effective_at)}</title></circle>`;
  }).join("");
  const firstDate = points[0].posted_at.slice(0, 10);
  const lastDate = points[points.length - 1].posted_at.slice(0, 10);
  const legend = series.map((item, index) => `<span><i style="--series:${SERIES_COLORS[index % SERIES_COLORS.length]}"></i>${escapeHtml(item.label)}</span>`).join("");
  target.innerHTML = `<div class="chart-legend">${legend}</div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(series.map((item) => item.label).join(", "))} cumulative over posted transaction time"><title>Cumulative portfolio series over transaction time</title>${grid}<line x1="${margin.left}" y1="${y(0)}" x2="${width - margin.right}" y2="${y(0)}" class="zero-line"/>${lines}${eventPoints}<text x="${margin.left}" y="${height - 18}" class="chart-label">${firstDate}</text><text x="${width - margin.right}" y="${height - 18}" text-anchor="end" class="chart-label">${lastDate}</text><text x="${width / 2}" y="${height - 18}" text-anchor="middle" class="chart-axis-title">posted_at →</text></svg>`;
}

function renderStatus(data) {
  const finalPoint = data.points[data.points.length - 1];
  document.getElementById("portfolio-status").innerHTML = [
    ["Transactions", `${data.scenario_count} golden + ${data.normal_count} normal`, "all interleaved"],
    ["Customer collected", money(finalPoint.customer_collected_minor), "cumulative capture"],
    ["Customer refunded", money(finalPoint.customer_refunded_minor), "succeeded remedies"],
    ["Fees", money(finalPoint.card_fees_minor + finalPoint.payout_fees_minor), "card + payout"],
    ["Tax remitted", money(finalPoint.tax_remitted_minor), "projected"],
    ["Money proof", data.all_money_balanced ? "Σ = 0" : "FAILED", `${data.points.length} checkpoints`],
  ].map(([label, value, note]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`).join("");
}

function renderTable(points) {
  document.getElementById("portfolio-events").innerHTML = points.map((point) => `<tr><td class="num">${point.sequence}</td><td class="text-nowrap">${point.posted_at.slice(0, 16).replace("T", " ")}</td><td class="text-nowrap">${point.effective_at.slice(0, 16).replace("T", " ")}</td><td><span class="badge ${point.transaction_kind === "normal" ? "good" : "warn"}">${escapeHtml(point.scenario_id)}</span></td><td>${escapeHtml(point.event)} <small class="event-status">${escapeHtml(point.status)}</small></td><td class="num">${money(point.customer_collected_minor)}</td><td class="num">${money(point.customer_refunded_minor)}</td><td class="num">${money(point.card_fees_minor + point.payout_fees_minor)}</td><td class="num">${money(point.participant_transfers_minor)}</td><td class="num">${money(point.tax_liability_minor)}</td><td class="num">${money(point.processor_cash_minor)}</td><td><span class="badge ${point.money_delta_minor === 0 ? "good" : "bad"}">${point.money_delta_minor === 0 ? "Σ 0" : money(point.money_delta_minor)}</span></td></tr>`).join("");
}

function renderRisk(risk) {
  const worst = risk.worst_case;
  document.getElementById("cash-risk-summary").innerHTML = `<div><span>Stress portfolio maximum</span><strong>${money(risk.portfolio_maximum_gap_minor)}</strong><small>${(risk.portfolio_gap_bps_of_collections / 100).toFixed(2)}% of collected cash</small></div><div><span>Worst single case</span><strong>${escapeHtml(worst.scenario_id)} · ${money(worst.maximum_funding_gap_minor)}</strong><small>${(worst.gap_bps_of_capture / 100).toFixed(2)}% of its capture</small></div><div><span>Interpretation</span><strong>Liquidity exposure</strong><small>not a probability-weighted forecast</small></div>`;
  document.getElementById("cash-risk-cases").innerHTML = risk.exposed_cases.map((item) => `<tr><td><span class="badge warn">${escapeHtml(item.scenario_id)}</span> ${escapeHtml(item.title)}</td><td>${escapeHtml(item.trigger_stage.replaceAll("_", " "))}</td><td class="num">${money(item.captured_minor)}</td><td class="num">${money(item.maximum_funding_gap_minor)}</td><td class="num">${(item.gap_bps_of_capture / 100).toFixed(2)}%</td><td class="num">${money(item.participant_recoverable_minor)}</td><td class="num">${money(item.platform_absorption_minor)}</td></tr>`).join("");
  document.getElementById("cash-risk-controls").innerHTML = `<div><p class="eyebrow">What it implies</p>${risk.interpretation.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div><div><p class="eyebrow">Controls to validate</p><ol>${risk.controls_to_validate.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div><div><p class="eyebrow">Limits of this result</p>${risk.caveats.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`;
}

async function boot() {
  try {
    const [timelineResponse, riskResponse] = await Promise.all([
      fetch(apiPath("portfolio/timeline")),
      fetch(apiPath("business/risk")),
    ]);
    if (!timelineResponse.ok) throw new Error(`timeline request failed (${timelineResponse.status})`);
    if (!riskResponse.ok) throw new Error(`risk request failed (${riskResponse.status})`);
    const data = await timelineResponse.json();
    const risk = await riskResponse.json();
    renderStatus(data);
    renderRisk(risk);
    renderChart("money-chart", data.points, [
      {key: "customer_collected_minor", label: "Customer collected"},
      {key: "customer_net_minor", label: "Customer net"},
      {key: "total_external_uses_minor", label: "External uses"},
      {key: "processor_cash_minor", label: "Processor cash"},
      {key: "participant_transfers_minor", label: "Participant transfers"},
      {key: "customer_refunded_minor", label: "Refunds"},
      {key: "card_fees_minor", label: "Card fees"},
      {key: "payout_fees_minor", label: "Payout fees"},
      {key: "funding_gap_minor", label: "Funding gap"},
    ]);
    renderChart("tax-chart", data.points, [
      {key: "tax_collected_minor", label: "Tax collected"},
      {key: "tax_liability_minor", label: "Tax liability"},
      {key: "tax_reversed_minor", label: "Tax reversed"},
      {key: "tax_remitted_minor", label: "Tax remitted"},
      {key: "remedy_total_minor", label: "Customer remedy"},
      {key: "platform_absorption_minor", label: "Platform absorption"},
    ]);
    renderChart("quantity-chart", data.points, [
      {key: "ordered_quantity", label: "Ordered"},
      {key: "accepted_quantity", label: "Accepted"},
      {key: "shortage_quantity", label: "Shortage"},
    ], "quantity");
    renderTable(data.points);
  } catch (error) {
    document.getElementById("portfolio-status").innerHTML = `<div><span>Status</span><strong>Unable to load</strong><small>${escapeHtml(error.message)}</small></div>`;
  }
}

boot();
