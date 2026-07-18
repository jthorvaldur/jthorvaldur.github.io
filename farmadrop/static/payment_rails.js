const initialPaymentProfile = JSON.parse(document.getElementById("initial-payment-profile").textContent);
const paymentApiRoot = document.body.dataset.apiRoot || "/api";
const paymentStaticMode = document.body.dataset.staticMode === "true";
const paymentApiPath = (path) => `${paymentApiRoot.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
const paymentMoney = (minor) => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(Number(minor || 0) / 100);
const paymentEsc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);

function renderPaymentProfile(data) {
  document.getElementById("payment-volume-title").textContent = `${data.transactions.toLocaleString()} × ${paymentMoney(data.amount_minor)} = ${paymentMoney(data.gross_volume_minor)}`;
  const priced = data.estimates.filter((item) => item.external_fee_total_minor !== null);
  const maximum = Math.max(1, ...priced.map((item) => item.external_fee_total_minor));
  document.getElementById("payment-cost-bars").innerHTML = data.estimates.map((item) => {
    const known = item.external_fee_total_minor !== null;
    const width = known ? Math.max(1.5, item.external_fee_total_minor / maximum * 100) : 0;
    const value = known ? `${paymentMoney(item.external_fee_total_minor)} · ${(item.external_fee_bps / 100).toFixed(2)}%` : "Unpriced";
    return `<div class="payment-cost-row"><div><b>${paymentEsc(item.display_name)}</b><span>${paymentEsc(item.category)}</span></div><div class="payment-cost-track ${known ? "" : "unknown"}">${known ? `<i style="width:${width.toFixed(2)}%"></i>` : `<em>funding · custody · redemption · compliance open</em>`}</div><strong>${paymentEsc(value)}</strong></div>`;
  }).join("");
  document.getElementById("payment-rail-table").innerHTML = data.estimates.map((item) => `<tr><td><b>${paymentEsc(item.display_name)}</b><br><span class="badge ${item.status === "priced-reference" ? "good" : "warn"}">${paymentEsc(item.status)}</span><small class="payment-formula">${paymentEsc(item.formula)}</small></td><td>${paymentEsc(item.path)}<small class="payment-formula">${paymentEsc(item.visibility)}</small></td><td class="num">${item.customer_visible_fee_minor === null ? "open" : paymentMoney(item.customer_visible_fee_minor)}</td><td class="num">${item.external_fee_total_minor === null ? "unpriced" : paymentMoney(item.external_fee_total_minor)}</td><td class="num">${item.external_fee_bps === null ? "—" : `${(item.external_fee_bps / 100).toFixed(2)}%`}</td><td>${paymentEsc(item.charged_to)}</td></tr>`).join("");
  document.getElementById("payment-interpretation").innerHTML = data.interpretation.map((item) => `<p>${paymentEsc(item)}</p>`).join("");
  document.getElementById("payment-assumptions").innerHTML = data.assumptions.map((item) => `<p>${paymentEsc(item)}</p>`).join("");
  const sources = new Map();
  data.estimates.forEach((item) => item.source_urls.forEach((url) => sources.set(url, item.display_name)));
  document.getElementById("payment-sources").innerHTML = [...sources.entries()].map(([url, label]) => `<a href="${paymentEsc(url)}" target="_blank" rel="noreferrer"><code>${paymentEsc(new URL(url).hostname)}</code><span>${paymentEsc(label)} reference ↗</span></a>`).join("");
}

async function profilePaymentRails() {
  const amountMinor = Math.round(Number(document.getElementById("payment-amount").value) * 100);
  const transactions = Number(document.getElementById("payment-count").value);
  const status = document.getElementById("payment-profile-status");
  if (paymentStaticMode) {
    status.textContent = "Custom profiling uses the password-protected live Python service; this public copy shows the frozen reference.";
    return;
  }
  status.textContent = "Profiling in Python…";
  const response = await fetch(paymentApiPath(`payment-rails/profile?amount_minor=${encodeURIComponent(amountMinor)}&transactions=${encodeURIComponent(transactions)}`));
  if (!response.ok) throw new Error(`Payment profile failed (${response.status}).`);
  renderPaymentProfile(await response.json());
  status.textContent = "Profile updated from the Python model.";
}

document.getElementById("profile-payment-rails").addEventListener("click", () => profilePaymentRails().catch((error) => { document.getElementById("payment-profile-status").textContent = error.message; }));
renderPaymentProfile(initialPaymentProfile);
