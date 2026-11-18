"use strict";
let shoppingSearch = "";
let shoppingStatus = "all";
function shoppingRow(item, compact = false) {
  return `<div class="list-row ${item.bought ? "completed" : ""}"><button class="check-button ${item.bought ? "checked" : ""}" data-action="toggle-shopping" data-id="${item.id}" aria-label="${item.bought ? "Mark unpurchased" : "Mark purchased"}: ${escapeHtml(item.title)}" aria-pressed="${item.bought}">${item.bought ? "✓" : ""}</button><div class="row-main"><strong>${escapeHtml(item.title)}</strong><small>${item.quantity} ${item.quantity === 1 ? "item" : "items"} · ${compact ? escapeHtml(item.category) : `${money(item.price)} each · ${escapeHtml(item.category)}`}</small></div><span class="row-end">${money(item.price * item.quantity)}</span>${compact ? "" : `<div class="row-actions"><button class="text-button" data-action="edit-shopping" data-id="${item.id}" aria-label="Edit ${escapeHtml(item.title)}">Edit</button><button class="text-button delete-button" data-action="delete-shopping" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.title)}">Delete</button></div>`}</div>`;
}
function renderShopping() {
  const remaining = state.shopping.filter(item => !item.bought);
  const estimate = remaining.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const bought = state.shopping.filter(item => item.bought).length;
  content.innerHTML = heading("The shared shopping list", "Out of milk? Put it on the list. Your next grocery run, sorted.", '<button class="button primary" data-action="add-shopping">＋ Add item</button>') + `<section class="stats-grid">${stat("Still to buy", remaining.length, "Items waiting for the next trip", "▤", "peach")}${stat("Estimated total", money(estimate), "For items still to buy", "↗")}${stat("Already picked up", bought, "Thanks, home team", "✓", "green")}${stat("Total list items", state.shopping.length, "Purchased and unpurchased", "▦", "blue")}</section><section class="card"><div class="card-head"><div><h2>For the next grocery run</h2><p class="card-subtitle">Prices are estimates. Checking an item does not create an expense.</p></div></div><div class="toolbar"><input type="search" id="shopping-search" aria-label="Search shopping items" placeholder="Search your shopping list…" value="${escapeHtml(shoppingSearch)}"><select id="shopping-status" aria-label="Filter shopping status"><option value="all">All items</option><option value="pending">Still to buy</option><option value="bought">Purchased</option></select></div><div id="shopping-results"></div><div class="shopping-summary"><span>Estimated remaining total</span><strong>${money(estimate)}</strong></div></section><p class="card-note">After shopping, add the actual receipt to Expenses and choose who paid. This keeps estimated and actual spending separate.</p>`;
  document.querySelector("#shopping-status").value = shoppingStatus;
  renderShoppingResults();
  document.querySelector("#shopping-search").addEventListener("input", event => { shoppingSearch = event.target.value; renderShoppingResults(); });
  document.querySelector("#shopping-status").addEventListener("change", event => { shoppingStatus = event.target.value; renderShoppingResults(); });
}
function renderShoppingResults() {
  const filtered = state.shopping.filter(item => item.title.toLowerCase().includes(shoppingSearch.toLowerCase()) && (shoppingStatus === "all" || (shoppingStatus === "bought" && item.bought) || (shoppingStatus === "pending" && !item.bought))).sort((a, b) => Number(a.bought) - Number(b.bought));
  document.querySelector("#shopping-results").innerHTML = filtered.length ? filtered.map(item => shoppingRow(item)).join("") : empty("Nothing on this list", "Add something for the home or adjust your filters.");
}
function shoppingForm(id) {
  const existing = state.shopping.find(item => item.id === id);
  const item = existing || { title: "", quantity: 1, price: 0, category: "Groceries", bought: false };
  const fields = field("title", "What do we need?", input("title", "text", item.title, 'maxlength="80" placeholder="e.g. Oat milk"')) + field("quantity", "Quantity", input("quantity", "number", item.quantity, 'min="1" max="999" step="1"')) + field("price", "Estimated price per item (€)", input("price", "number", (item.price / 100).toFixed(2), 'min="0" max="1000000" step="0.01"'), "Leave at 0 if you do not know the price yet.") + field("category", "Category", `<select id="category" name="category">${options(["Groceries", "Household", "Other"], item.category)}</select>`);
  openForm(existing ? "Edit shopping item" : "Add a shopping item", fields, data => {
    const title = data.get("title").trim();
    if (!title) throw new Error("Please enter an item name.");
    const record = { id: existing ? existing.id : crypto.randomUUID(), title, quantity: Number(data.get("quantity")), price: Math.round(Number(data.get("price")) * 100), category: data.get("category"), bought: item.bought };
    const next = cloneState();
    if (existing) next.shopping = next.shopping.map(entry => entry.id === id ? record : entry);
    else next.shopping.push(record);
    return persist(next);
  });
}
