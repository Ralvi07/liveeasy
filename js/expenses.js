// Renders and filters shared expenses, handles expense editing, and prepares exports.
"use strict";
let expenseSearch = "";
let expenseCategory = "";
let expenseScope = "shared";
const expenseCategories = ["Groceries", "Utilities", "Rent", "Household", "Other"];
function selectedExpenses() {
  return visibleExpenses().filter(expense => expenseScope === "personal" ? expense.scope === "personal" : expense.scope !== "personal");
}
function renderExpenses() {
  const records = selectedExpenses();
  const total = records.reduce((sum, expense) => sum + expense.amount, 0);
  const myShare = expenseScope === "personal" ? total : records.reduce((sum, expense) => sum + expenseShares(expense)[currentUser], 0);
  const profile = state.finances[currentUser]; const budget = monthlyBudgetStatus();
  const payday = profile.salary > 0 ? nextMonthlyDate(profile.payday) : "";
  const days = payday ? Math.max(1, Math.round((new Date(`${payday}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000)) : 0;
  const isPersonal = expenseScope === "personal";
  content.innerHTML = heading("Money & Expenses", "Your budget, available money, and household spending in one place.", `<div class="heading-actions"><button class="button" data-action="money-settings">Budget & money settings</button><button class="button primary" data-action="pay-all" ${debtsFor(currentUser).length ? "" : "disabled"}>Pay all</button><button class="button" data-action="add-expense">＋ Add purchase</button></div>`) + `<div class="scope-tabs" role="group" aria-label="Spending view"><button class="button ${!isPersonal ? "primary" : ""}" id="show-shared" aria-pressed="${!isPersonal}">Shared expenses</button><button class="button ${isPersonal ? "primary" : ""}" id="show-personal" aria-pressed="${isPersonal}">My personal purchases</button></div><section class="stats-grid">${stat(isPersonal ? "My purchases" : "Shared spending", money(total), isPersonal ? "Only your personal records" : "Personal purchases are excluded", "↗")}${stat(isPersonal ? "Paid entirely by me" : "My recorded share", money(myShare), isPersonal ? "Not split with your roommates" : "Rent percentages + equal other bills", "÷", "blue")}${stat("Available balance", profile.enabled ? money(walletBalance(currentUser)) : "Not set", profile.enabled ? (payday ? `Until ${dateLabel(payday)} · ${days} days` : "Your current available funds") : "Set your balance in Budget & money settings", "↗")}${stat(budget.remaining < 0 && budget.limit ? "Over monthly budget" : "Monthly budget left", budget.limit ? money(Math.abs(budget.remaining)) : "Not set", budget.limit ? `${money(budget.spent)} of ${money(budget.limit)} used this month` : "Set a private monthly spending target", "▤", "green")}</section>${budgetPanel()}${financeDashboard(true)}<section class="card section-gap"><div class="card-head"><div><h2>${isPersonal ? "My personal purchases" : "Shared expense history"}</h2><p class="card-subtitle">${isPersonal ? "Your purchases never affect household balances." : "Rent follows your saved percentages. Other bills are split equally."}</p></div><button class="text-button" data-action="export-expenses">Export this view ↓</button></div><div class="toolbar"><input type="search" id="expense-search" aria-label="Search expenses" placeholder="Search purchases…" value="${escapeHtml(expenseSearch)}"><select id="expense-category" aria-label="Filter expense category"><option value="">All categories</option>${options(expenseCategories, expenseCategory)}</select></div><div id="expense-results"></div></section><p class="card-note">The rent plan is a monthly budget, not an automatic bill. Record a paid rent expense to include it in balances.</p>`;
  renderExpenseResults();
  document.querySelector("#show-shared").addEventListener("click", () => { expenseScope = "shared"; renderExpenses(); });
  document.querySelector("#show-personal").addEventListener("click", () => { expenseScope = "personal"; renderExpenses(); });
  document.querySelector("#expense-search").addEventListener("input", event => { expenseSearch = event.target.value; renderExpenseResults(); });
  document.querySelector("#expense-category").addEventListener("change", event => { expenseCategory = event.target.value; renderExpenseResults(); });
}
// Refresh the results for the current expense filters.
function renderExpenseResults() {
  const filtered = selectedExpenses().filter(expense => expense.title.toLowerCase().includes(expenseSearch.toLowerCase()) && (!expenseCategory || expense.category === expenseCategory)).sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector("#expense-results").innerHTML = filtered.length ? `<div class="table-wrap"><table><thead><tr><th>PURCHASE</th><th>PAID BY</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>${filtered.map(expense => `<tr><td><strong>${escapeHtml(expense.title)}</strong></td><td><span class="table-person">${avatar(expense.payer)}${escapeHtml(state.members[expense.payer])}</span></td><td><span class="pill">${escapeHtml(expense.category)}</span></td><td>${dateLabel(expense.date)}</td><td><strong>${money(expense.amount)}</strong></td><td><div class="row-actions">${expense.scope !== "personal" && expense.payer !== currentUser ? `<button class="text-button" data-action="repay" data-id="${expense.id}" ${remainingDebt(expense, currentUser) === 0 ? "disabled" : ""}>${remainingDebt(expense, currentUser) ? `Pay ${money(remainingDebt(expense, currentUser))}` : "Paid"}</button>` : ""}<button class="text-button" data-action="edit-expense" data-id="${expense.id}" aria-label="Edit ${escapeHtml(expense.title)}" ${expense.payer !== currentUser ? "hidden" : ""}>Edit</button><button class="text-button delete-button" data-action="delete-expense" data-id="${expense.id}" aria-label="Delete ${escapeHtml(expense.title)}" ${expense.payer !== currentUser ? "hidden" : ""}>Delete</button></div></td></tr>`).join("")}</tbody></table></div>` : empty("No purchases found", "Try another filter or add a purchase to this view.");
}
function expenseForm(id) {
  if (currentUser === null) return;
  const existing = visibleExpenses().find(expense => expense.id === id);
  if (existing && existing.payer !== currentUser) { notify("Only the member who recorded this purchase can edit it."); return; }
  if (id && !existing) { notify("That purchase is not available in your account."); return; }
  const expense = existing || { title: "", amount: "", payer: currentUser, category: "Groceries", date: today(), scope: expenseScope };
  const scope = expense.scope === "personal" ? "personal" : "shared";
  const scopeField = existing ? `<p class="setup-notice">${scope === "personal" ? "Personal purchase · not shared" : "Shared household expense"}</p>` : field("scope", "Who is this purchase for?", `<select id="scope" name="scope"><option value="shared" ${scope === "shared" ? "selected" : ""}>Shared household expense</option><option value="personal" ${scope === "personal" ? "selected" : ""}>Just me · personal purchase</option></select>`);
  const fields = scopeField + field("title", "What was it for?", input("title", "text", expense.title, 'maxlength="80" placeholder="e.g. Weekly groceries or my headphones"')) + field("amount", "Total amount (€)", input("amount", "number", expense.amount === "" ? "" : (expense.amount / 100).toFixed(2), 'min="0.01" max="1000000" step="0.01"')) + `<p class="form-help">Paid by you · ${escapeHtml(state.members[currentUser])}</p>` + field("category", "Category", `<select id="category" name="category">${options(expenseCategories, expense.category)}</select>`) + field("date", "Purchase date", input("date", "date", expense.date)) + '<p class="form-help">Personal purchases belong to you and are not split. Rent uses configured percentages; other shared bills use equal shares. Saved records keep their original split when household settings change.</p>';
  openForm(existing ? "Edit purchase" : "Add a purchase", fields, data => {
    const title = data.get("title").trim();
    const amount = Math.round(Number(data.get("amount")) * 100);
    const chosenScope = existing ? scope : data.get("scope");
    const payer = currentUser;
    if (!title || !Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000 || !Number.isInteger(payer) || payer < 0 || payer >= state.members.length || !["shared", "personal"].includes(chosenScope) || !expenseCategories.includes(data.get("category")) || !data.get("date")) throw new Error("Enter a title, valid amount, payer, category, and date.");
    const record = { id: existing ? existing.id : crypto.randomUUID(), title, amount, payer, category: data.get("category"), date: data.get("date"), scope: chosenScope, owner: chosenScope === "personal" ? currentUser : null };
    if (chosenScope === "shared") record.shares = existing && existing.category === record.category && existing.amount === record.amount ? expenseShares(existing) : allocateCents(amount, record.category === "Rent" ? state.rentShares : state.members.map((name, index) => state.accounts[index].active === false ? 0 : 1));
    if (existing && state.settlements.some(payment => payment.expenseId === id) && (record.amount !== existing.amount || record.category !== existing.category)) throw new Error("This expense has repayments. Its amount and split must stay unchanged.");
    const next = normalizeFinance(cloneState());
    bookPurchase(next, record, existing);
    if (existing) next.expenses = next.expenses.map(item => item.id === id ? record : item);
    else next.expenses.unshift(record);
    if (!persist(next)) return false;
    expenseScope = chosenScope;
    return true;
  });
}
// Export the expense selection as a downloadable report.
function exportExpenses() {
  const quote = value => '"' + String(value).replace(/"/g, '""') + '"';
  const safeText = value => /^[=+@-]/.test(value) ? "'" + value : value;
  const rows = [["Title", "Amount EUR", "Paid by", "Category", "Date", "Scope"], ...selectedExpenses().map(expense => [safeText(expense.title), (expense.amount / 100).toFixed(2), safeText(state.members[expense.payer]), expense.category, expense.date, expense.scope || "shared"])];
  downloadFile(`live-easy-${expenseScope}-expenses.csv`, rows.map(row => row.map(quote).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  notify("Your selected spending view was exported.");
}
