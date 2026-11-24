(() => {
  const mount = document.getElementById("route-workbench");
  if (!mount) return;

  const routes = [
    {
      lane: "Farmer to HostDrop", sender: "Alder Creek Farm", receiver: "Mill Street HostDrop",
      load: "8 crates of greens", weight: 120, temperature: "chilled", handling: "Keep chilled and upright.",
      start: "08:00", end: "09:00", due: "10:00", price: [48, 52],
    },
    {
      lane: "HostDrop to Member", sender: "Mill Street HostDrop", receiver: "Member doorstep",
      load: "2 grocery boxes", weight: 24, temperature: "chilled", handling: "Keep chilled. Hand the boxes to the member at the door.",
      start: "13:00", end: "14:00", due: "15:00", price: [16, 19],
    },
    {
      lane: "Farmer to Farmer", sender: "Alder Creek Farm", receiver: "North Ridge Farm",
      load: "6 sacks of milling grain", weight: 300, temperature: "dry", handling: "Keep dry. Use the receiving shed.",
      start: "09:00", end: "10:00", due: "11:30", price: [64, 68],
    },
    {
      lane: "HostDrop to HostDrop", sender: "Mill Street HostDrop", receiver: "Orchard Lane HostDrop",
      load: "4 insulated totes", weight: 80, temperature: "chilled", handling: "Keep chilled and sealed until the receiving team checks the totes.",
      start: "11:00", end: "12:00", due: "13:00", price: [32, 36],
    },
    {
      lane: "South Florida to Texas", sender: "Gulf Meadow Farm, South Florida", receiver: "Hill Country HostDrop, Texas",
      load: "2 pallets of frozen beef", pallets: 2, weight: 1200, temperature: "frozen",
      handling: "Load with the liftgate and maintain frozen transport through handoff.",
      start: "08:00", end: "10:00", pickupDay: "Wednesday", pickupZone: "Eastern",
      due: "15:00", dueDay: "Friday", dueZone: "Central", price: [2400, null],
    },
  ];
  const partners = [
    {
      name: "Clover Lane Transport", capacity: 2000, pallets: 2, modes: ["dry", "chilled", "frozen"],
      vehicle: "Owner-operated refrigerated box truck with freezer mode, powered outlets and a liftgate.",
    },
    {
      name: "Juniper Van Service", capacity: 500, pallets: 0, modes: ["dry", "chilled"],
      vehicle: "Owner-operated chilled cargo van with a separate dry bay for sacks and boxes.",
    },
  ];
  function limitations(partner, route) {
    const limits = [];
    if (!partner.modes.includes(route.temperature)) limits.push(`${route.temperature} service required`);
    if ((route.pallets || 0) > partner.pallets) limits.push("pallet capacity required");
    if (route.weight > partner.capacity) limits.push("load exceeds vehicle weight limit");
    return limits;
  }
  const steps = ["Request", "Quote", "Review", "Pickup", "Receipt"];
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  function time(value) {
    const [hour, minute] = value.split(":").map(Number);
    return timeFormat.format(new Date(2000, 0, 1, hour, minute));
  }
  function schedule(clock, day, zone) {
    return [day, clock, zone].filter(Boolean).join(" ");
  }

  function newRun(route) {
    return {
      step: 0, partner: partners.findIndex(partner => !limitations(partner, route).length), issue: "",
      drafts: route.price.map(price => ({ price: price === null ? "" : String(price), pickup: route.start })),
    };
  }
  const runs = routes.map(newRun);
  let selectedRoute = 0;

  mount.innerHTML = `
    <div class="relay-sheet">
      <div class="relay-route-picker">
        <label for="relay-route">Sample route</label>
        <select id="relay-route"></select>
      </div>
      <ol class="relay-progress" aria-label="Shipment progress"></ol>
      <div class="relay-sheet-grid">
        <section class="relay-manifest" aria-labelledby="relay-manifest-heading">
          <h3 id="relay-manifest-heading">Shipment request</h3>
          <dl class="relay-facts"></dl>
        </section>
        <section class="relay-action" aria-labelledby="relay-step-heading"></section>
      </div>
      <p class="relay-status" role="status" aria-atomic="true"></p>
    </div>`;

  const picker = mount.querySelector("#relay-route");
  const progress = mount.querySelector(".relay-progress");
  const manifest = mount.querySelector(".relay-facts");
  const panel = mount.querySelector(".relay-action");
  const status = mount.querySelector(".relay-status");
  routes.forEach((route, index) => picker.add(new Option(route.lane, String(index))));

  function element(tag, content, className) {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (className) node.className = className;
    return node;
  }

  function addFact(list, label, value) {
    const row = element("div");
    row.append(element("dt", label), element("dd", value));
    list.append(row);
  }

  function button(label, onClick, secondary = false) {
    const control = element("button", label, secondary ? "relay-button relay-button-secondary" : "relay-button");
    control.type = "button";
    control.addEventListener("click", onClick);
    return control;
  }

  function field(form, label, id, control) {
    const wrapper = element("div", undefined, "relay-field");
    const name = element("label", label);
    name.htmlFor = id;
    control.id = id;
    wrapper.append(name, control);
    form.append(wrapper);
  }

  function moveTo(step, message) {
    runs[selectedRoute].step = step;
    render(true);
    status.textContent = message;
  }

  function intro(role, title, description) {
    const heading = element("h3", title);
    heading.id = "relay-step-heading";
    heading.tabIndex = -1;
    panel.append(element("p", role, "relay-role"), heading, element("p", description, "relay-instructions"));
  }

  function actions(...controls) {
    const row = element("div", undefined, "relay-actions");
    row.append(...controls);
    return row;
  }

  function quoteForm(route, run) {
    intro("Relay Partner", "Offer to carry this load", "Choose an independent business and enter the price and pickup time it would offer.");
    const form = element("form");
    const business = element("select");
    const unavailable = [];
    partners.forEach((partner, index) => {
      const limits = limitations(partner, route);
      const option = new Option(partner.name, String(index));
      if (limits.length) {
        option.disabled = true;
        option.textContent += " (ineligible)";
        unavailable.push(`${partner.name} cannot carry this load (${limits.join(", ")}).`);
      }
      business.add(option);
    });
    business.value = String(run.partner);
    field(form, "Your business", "relay-partner", business);
    const profile = element("p", "", "relay-partner-profile");
    profile.id = "relay-partner-details";
    profile.setAttribute("aria-live", "polite");
    business.setAttribute("aria-describedby", profile.id);
    form.append(profile);
    if (unavailable.length) form.append(element("p", unavailable.join(" "), "relay-partner-eligibility"));

    const price = element("input");
    Object.assign(price, { type: "number", min: "0.01", step: "0.01", required: true, inputMode: "decimal" });
    field(form, route.pallets ? "Custom flat freight quote (USD)" : "Your quote (USD)", "relay-price", price);
    const pickup = element("input");
    Object.assign(pickup, { type: "time", min: route.start, max: route.end, required: true });
    field(form, route.pickupZone ? `Proposed pickup (${route.pickupDay}, ${route.pickupZone})` : "Proposed pickup (local time)", "relay-pickup-time", pickup);

    function loadDraft() {
      const draft = run.drafts[run.partner];
      const partner = partners[run.partner];
      const palletLimit = partner.pallets ? `up to ${partner.pallets} pallets` : "boxes, sacks or totes only";
      profile.textContent = `${partner.vehicle} Capacity ${partner.capacity.toLocaleString("en-US")} lb, ${palletLimit}.`;
      price.value = draft.price;
      pickup.value = draft.pickup;
    }
    function saveDraft() {
      run.drafts[run.partner] = { price: price.value, pickup: pickup.value };
    }
    loadDraft();
    business.addEventListener("change", () => {
      run.partner = Number(business.value);
      loadDraft();
    });
    price.addEventListener("input", saveDraft);
    pickup.addEventListener("input", saveDraft);

    const submit = element("button", "Send sample quote", "relay-button");
    submit.type = "submit";
    form.append(actions(submit));
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (limitations(partners[run.partner], route).length || !form.reportValidity()) return;
      saveDraft();
      moveTo(2, "Sample quote sent to the requester.");
    });
    panel.append(form);
  }

  function render(focusHeading = false) {
    const route = routes[selectedRoute];
    const run = runs[selectedRoute];
    const partner = partners[run.partner].name;
    const draft = run.drafts[run.partner];
    const quotedPickup = schedule(time(draft.pickup || route.start), route.pickupDay, route.pickupZone);
    status.textContent = "";
    progress.replaceChildren();
    steps.forEach((label, index) => {
      const item = element("li", label, index < run.step ? "is-complete" : "");
      if (index === run.step) item.setAttribute("aria-current", "step");
      progress.append(item);
    });
    manifest.replaceChildren();
    addFact(manifest, "From", route.sender);
    addFact(manifest, "To", route.receiver);
    addFact(manifest, "Load", `${route.load} · ${route.weight.toLocaleString("en-US")} lb`);
    addFact(manifest, "Handling", route.handling);
    addFact(manifest, "Pickup window", schedule(`${time(route.start)} – ${time(route.end)}`, route.pickupDay, route.pickupZone));
    addFact(manifest, "Deliver by", schedule(time(route.due), route.dueDay, route.dueZone));

    const summary = () => {
      const facts = element("dl", undefined, "relay-facts relay-quote-summary");
      addFact(facts, "Relay Partner", partner);
      addFact(facts, route.pallets ? "Flat freight quote" : "Transport price", currency.format(Number(draft.price)));
      addFact(facts, "Agreed pickup", quotedPickup);
      panel.append(facts);
    };
    const reset = () => {
      runs[selectedRoute] = newRun(route);
      moveTo(0, "Sample route reset.");
    };
    panel.replaceChildren();
    switch (run.step) {
      case 0:
        intro("Sender", "Request a shipment", `You’re posting for ${route.sender}. Check the load, handling instructions and delivery window before inviting quotes.`);
        panel.append(actions(button("Post sample request", () => moveTo(1, "Sample request posted. A Relay Partner can now make an offer."))));
        break;
      case 1:
        quoteForm(route, run);
        break;
      case 2: {
        intro("Sender", "Review the quote", `${partner} offers pickup for ${quotedPickup}. The ${route.pallets ? "custom flat freight quote" : "price for this route"} is ${currency.format(Number(draft.price))}.`);
        const accept = button("Accept sample quote", () => moveTo(3, "Sample quote accepted. The partner can record pickup."));
        const decline = button("Decline quote", () => {
          const alternate = partners.findIndex((candidate, index) => index !== run.partner && !limitations(candidate, route).length);
          if (alternate >= 0) run.partner = alternate;
          moveTo(1, alternate >= 0 ? "Quote declined. Another business can offer a quote." : "Quote declined. The eligible business can revise its freight quote.");
        }, true);
        panel.append(actions(accept, decline));
        break;
      }
      case 3:
        intro("Relay Partner", "Record pickup", `You’re carrying this load for ${partner}. Confirm pickup at ${route.sender} once the sender has handed it over.`);
        summary();
        panel.append(actions(button("Record sample pickup", () => moveTo(4, "Pickup recorded. The recipient can now confirm delivery."))));
        break;
      case 4: {
        if (run.issue) {
          intro("Recipient", "Delivery on hold", `You reported a problem at handoff. The delivery is awaiting confirmation from ${route.receiver}.`);
          const issueDetails = element("dl", undefined, "relay-facts relay-quote-summary");
          addFact(issueDetails, "Reported issue", run.issue);
          panel.append(issueDetails, actions(button("Resolve and recheck load", () => {
            run.issue = "";
            moveTo(4, "Issue resolved. Check the load again before confirming delivery.");
          })));
          break;
        }
        intro("Recipient", "Confirm the handoff", `You’re receiving at ${route.receiver}. Check the load and its condition before confirming it arrived.`);
        const confirm = button("Confirm sample delivery", () => moveTo(5, "Recipient confirmed delivery. The sample run is complete."));
        const report = button("Flag a handling issue", () => {
          run.issue = "Load condition needs review";
          moveTo(4, "Handling issue recorded. Delivery confirmation is on hold.");
        }, true);
        panel.append(actions(confirm, report));
        break;
      }
      case 5:
        intro("Recipient", "Delivery confirmed", `${route.receiver} received the sample load from ${partner}.`);
        summary();
        break;
    }
    if (run.step > 0) panel.append(actions(button("Restart this sample", reset, true)));
    if (focusHeading) panel.querySelector("h3").focus();
  }

  picker.addEventListener("change", () => {
    selectedRoute = Number(picker.value);
    render();
    status.textContent = `${routes[selectedRoute].lane} selected. ${panel.querySelector("h3").textContent}.`;
  });
  render();
})();
