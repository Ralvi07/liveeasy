// Loads and persists household state and provides shared date, formatting, and rendering helpers.
"use strict"; // Catch common JavaScript mistakes instead of silently ignoring them.
const STORAGE_KEY = "roomly-household-v1"; // Keep the original browser key so the Live Easy rename preserves existing accounts and records.
const content = document.querySelector("#page-content"); // Find the area where active tabs appear.
const editor = document.querySelector("#editor"); // Find the reusable form dialog.
let saveHandler = null; // Remember the function that should handle the current form.
let toastTimer; // Remember the timer used to hide notifications.
function today() { // Return today's local calendar date without a UTC timezone shift.
  const now = new Date(); // Read the device's current date and time.
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; // Build the date format expected by date inputs.
} // Finish the date helper.
function offsetDate(days) { // Build sample dates relative to today.
  const date = new Date(); // Start with the current date.
  date.setDate(date.getDate() + days); // Move forwards or backwards by the requested days.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; // Return a local calendar date.
} // Finish the sample date helper.
function blankHousehold() { // Start new visitors with setup instead of example records.
  return { version: 2, configured: false, members: [], accounts: [], rentShares: [], monthlyRent: 0, expenses: [], chores: [], shopping: [] }; // Define the simple local household schema.
} // Finish the empty-household helper.
function loadData() { // Read the existing household and preserve old records during the upgrade.
  try { // Handle unavailable storage and malformed JSON without overwriting it.
    const saved = localStorage.getItem(STORAGE_KEY); // Reuse the previous storage key so existing records survive.
    if (!saved) return blankHousehold(); // Show welcome setup on a new browser.
    const data = JSON.parse(saved); // Parse the stored household.
    if (!Array.isArray(data.members) || !Array.isArray(data.expenses) || !Array.isArray(data.chores) || !Array.isArray(data.shopping)) throw new Error("Invalid household"); // Check the required record collections.
    if (data.version !== 2) return { ...data, configured: false, accounts: [], rentShares: [], monthlyRent: 0 }; // Keep legacy records while asking the owner to add accounts and rent.
    if (!Array.isArray(data.accounts) || data.accounts.length !== data.members.length || !Array.isArray(data.rentShares) || data.rentShares.length !== data.members.length) throw new Error("Invalid accounts"); // Reject incompatible account settings.
    return typeof normalizeFinance === "function" ? normalizeFinance(data) : data; // Apply additive account upgrades consistently during login as well as startup.
  } catch (error) { // Avoid silently replacing an unreadable household.
    const empty = blankHousehold(); // Prepare a harmless in-memory placeholder.
    empty.storageError = true; // Block setup from overwriting unreadable data.
    return empty; // Display a recovery message through the welcome screen.
  } // Finish handling saved data.
} // Finish loading the household.
let state = loadData(); // Keep one shared household object in memory.
let currentUser = null; // Never save the logged-in roommate; every reload starts logged out.
function persist(next) { // Save a new household before updating what the user sees.
  try { // Attempt the storage operation before changing live state.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); // Write the household as JSON text.
    state = next; // Accept the change after saving succeeds.
    document.querySelector("#save-label").textContent = "● Saved on this browser"; // Confirm that the saved copy is current.
    return true; // Tell the caller the save worked.
  } catch (error) { // Handle full or disabled browser storage.
    document.querySelector("#save-label").textContent = "Storage unavailable"; // Show an honest storage status.
    notify("Could not save. Browser storage may be full or disabled. Your change was not applied."); // Explain the failure without pretending to save.
    return false; // Tell the caller to keep the form open.
  } // Finish handling save errors.
} // Finish the save function.
function cloneState() { // Make a separate copy before editing saved records.
  return JSON.parse(JSON.stringify(state)); // Copy this simple JSON-compatible data structure.
} // Finish the copy helper.
function escapeHtml(value) { // Prevent typed text from being interpreted as HTML.
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); // Replace the five characters that have special HTML meanings.
} // Finish the HTML safety helper.
function money(cents) { // Display stored cents as readable euro amounts.
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100); // Format money consistently across all four tabs.
} // Finish formatting money.
function dateLabel(value) { // Display an ISO calendar date in a friendly format.
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); // Use midday to avoid timezone-related date shifts.
} // Finish the date display helper.
function initials(name) { // Turn a roommate's name into avatar letters.
  return name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase(); // Use at most two initials.
} // Finish calculating initials.
function avatar(index) { // Return the small avatar for one roommate.
  return `<span class="avatar avatar-${index}" aria-hidden="true">${escapeHtml(initials(state.members[index]))}</span>`; // Escape names before putting them into HTML.
} // Finish the avatar helper.
function memberOptions(selected = 0) { // Build the payer or assignee dropdown.
  return activeIndices().map(index => { const name = state.members[index]; return `<option value="${index}" ${index === Number(selected) ? "selected" : ""}>${escapeHtml(name)}</option>`; }).join(""); // Keep the member index stable when names are changed.
} // Finish building roommate options.
function options(values, selected = "") { // Build a simple text dropdown.
  return values.map(value => `<option ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join(""); // Escape option labels and mark the current value.
} // Finish the dropdown helper.
function field(id, label, control, help = "") { // Wrap a form control with its visible label.
  return `<div class="field"><label for="${id}">${label}</label>${control}${help ? `<small>${help}</small>` : ""}</div>`; // Keep label and input relationships accessible.
} // Finish the field helper.
function input(id, type, value = "", extra = "") { // Build the simple inputs reused by the dialogs.
  return `<input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value)}" ${extra} required>`; // Escape current values and request browser validation.
} // Finish the input helper.
function heading(title, subtitle, action = "") { // Build a consistent page heading.
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`; // Place the title beside a date or add button.
} // Finish the page heading helper.
function stat(label, value, note, symbol, color = "") { // Build one dashboard metric.
  return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}" aria-hidden="true">${symbol}</span></div><strong class="stat-value">${value}</strong><span class="stat-foot">${note}</span></div>`; // Keep all summary cards visually consistent.
} // Finish the statistic helper.
function empty(title, description) { // Explain why a list is empty.
  return `<div class="empty-state"><strong>${title}</strong>${description}</div>`; // Provide guidance rather than showing an empty box.
} // Finish the empty-state helper.
function notify(message) { // Show feedback after a user action.
  const toast = document.querySelector("#toast"); // Find the notification region.
  clearTimeout(toastTimer); // Cancel any previous hide timer.
  toast.textContent = message; // Use plain text so user input cannot inject HTML.
  toast.classList.add("show"); // Reveal the notification.
  toastTimer = setTimeout(() => toast.classList.remove("show"), 5500); // Hide it after the user has time to read it.
} // Finish the notification helper.
function openForm(title, fields, handler) { // Open the reusable editor with the required fields.
  if (currentUser === null) return; // Block editor dialogs until login is complete.
  document.querySelector("#dialog-title").textContent = title; // Give the dialog an action-specific name.
  document.querySelector("#form-fields").innerHTML = fields; // Insert trusted templates containing escaped values.
  document.querySelector("#form-error").textContent = ""; // Clear errors from the previous dialog.
  const submit = document.querySelector('#editor-form button[type="submit"]'); submit.textContent = "Save changes"; submit.disabled = false; // Reset button state after a specialized checkout dialog.
  saveHandler = handler; // Remember what should happen on save.
  editor.showModal(); // Open the accessible native dialog and move focus inside it.
} // Finish opening a form.
let confirmHandler = null; // Remember only the pending in-page destructive action.
function closeConfirmation() { // Clear a pending destructive action without applying it.
  const dialog = document.querySelector("#confirm-dialog"); // Find the shared confirmation dialog.
  if (dialog.open) dialog.close(); // Return to the page without changing any records.
  confirmHandler = null; // Make stale confirmation clicks harmless.
} // Finish cancelling a confirmation.
function askConfirmation(title, message, action, label = "Delete item") { // Present a branded modal instead of the browser's confirm popup.
  if (currentUser === null) return; // Require a logged-in user before any destructive workflow.
  if (editor.open) editor.close(); // Avoid stacking two open modal editors.
  document.querySelector("#confirm-title").textContent = title; document.querySelector("#confirm-message").textContent = message; // Escape all dynamic names by inserting plain text.
  document.querySelector("#confirm-accept").textContent = label; document.querySelector("#confirm-error").textContent = ""; // Prepare the action label and clear old errors.
  confirmHandler = action; document.querySelector("#confirm-dialog").showModal(); // Require an explicit in-page confirmation before applying changes.
} // Finish opening a confirmation dialog.
function removeRecord(collection, id) { // Delete only records the signed-in user is allowed to manage.
  if (currentUser === null) return; // Require a login for every delete action.
  const record = state[collection].find(item => item.id === id); // Look up the actual item before showing a dialog.
  if (!record || (collection === "expenses" && record.payer !== currentUser)) { notify("Only the person who recorded this purchase can delete it."); return; } // Do not let members change another payer's spending.
  if (collection === "expenses" && state.settlements.some(payment => payment.expenseId === id)) { notify("This expense has repayments and must stay in the payment history."); return; } // Preserve transferred amounts and keep settled debts auditable.
  askConfirmation("Delete this item?", `Remove “${record.title}” from your ${collection === "expenses" ? "expenses" : collection}? This cannot be undone.`, () => { // Show the item title in the app's own confirmation card.
    if (collection === "expenses" && state.expenses.find(item => item.id === id)?.payer !== currentUser) throw new Error("Only the expense creator can delete this item."); // Recheck ownership before applying a delayed confirmation.
    const next = cloneState(); next[collection] = next[collection].filter(item => item.id !== id); // Remove only the chosen record.
    if (collection === "expenses") next.walletEntries.forEach(entry => { if (entry.expenseId === id) entry.voided = true; }); // Reverse an unpaid purchase's simulated wallet debit.
    return persist(next); // Save one complete change rather than partially deleting financial history.
  }); // Finish preparing this deletion.
} // Finish deleting a record.
function toggleRecord(collection, id, property) { // Toggle a chore's completion or an item's purchased state.
  if (currentUser === null) return; // Ignore record actions while logged out.
  const next = cloneState(); // Keep unsaved changes separate from live state.
  const item = next[collection].find(record => record.id === id); // Find the selected record.
  if (!item) return; // Ignore a record that no longer exists.
  item[property] = !item[property]; // Reverse the chosen true-or-false property.
  if (persist(next)) { renderPage(); notify(item[property] ? "All done. Nice teamwork!" : "Moved back to your list."); } // Save and display the updated status.
} // Finish the completion helper.
function sharedExpenses() { // Keep personal purchases out of household calculations.
  return state.expenses.filter(expense => expense.scope !== "personal"); // Treat old records without a scope as shared.
} // Finish selecting shared expenses.
function visibleExpenses() { // Show shared bills and only the signed-in roommate's personal purchases.
  return currentUser === null ? [] : state.expenses.filter(expense => expense.scope !== "personal" || expense.owner === currentUser); // Apply the same visibility rule to lists and exports.
} // Finish selecting visible expenses.
function allocateCents(amount, weights) { // Split integer cents exactly using proportional weights.
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0); // Add the percentage units or equal-share weights.
  const parts = weights.map(weight => Math.floor(amount * weight / totalWeight)); // Calculate each whole-cent share.
  let remaining = amount - parts.reduce((sum, value) => sum + value, 0); // Count cents left after rounding down.
  const order = weights.map((weight, index) => ({ index, fraction: amount * weight % totalWeight })).sort((a, b) => b.fraction - a.fraction || a.index - b.index); // Rank fractional remainders with a stable tie-break.
  for (let index = 0; index < remaining; index++) parts[order[index].index]++; // Give leftover cents to the largest remainders.
  return parts; // Return shares whose sum exactly equals the original amount.
} // Finish splitting money.
function expenseShares(expense) { // Use rent percentages for rent and equal shares for other household bills.
  if (Array.isArray(expense.shares)) return state.members.map((name, index) => expense.shares[index] || 0); // Keep the original split of an already recorded expense.
  return allocateCents(expense.amount, expense.category === "Rent" ? state.rentShares : state.members.map((name, index) => state.accounts[index]?.active === false ? 0 : 1)); // Split new bills only among active roommates.
} // Finish calculating an expense's shares.
function balances() { // Calculate only balances from shared recorded expenses.
  const result = state.members.map(() => 0); // Start each configured roommate at zero.
  sharedExpenses().forEach(expense => { // Ignore all personal purchases.
    result[expense.payer] += expense.amount; // Credit the person who paid the bill.
    expenseShares(expense).forEach((share, index) => { result[index] -= share; }); // Subtract each person's exact share.
  }); // Finish processing the shared bills.
  (state.settlements || []).forEach(payment => { result[payment.from] += payment.amount; result[payment.to] -= payment.amount; }); // Reduce each expense debt after an individual repayment.
  return result; // Positive means money to receive; negative means money owed.
} // Finish calculating household balances.
function readableBackup() { // Export only shared data and the current user's personal purchases.
  return { members: state.members, monthlyRent: state.monthlyRent, rentShares: state.rentShares, expenses: visibleExpenses(), chores: state.chores, shopping: state.shopping, myFinance: state.finances[currentUser], myWalletEntries: state.walletEntries.filter(entry => entry.member === currentUser), settlements: state.settlements, admin: state.admin, rentPaidDate: state.rentPaidDate }; // Exclude all passwords, hashes, and other users' personal records.
} // Finish preparing a viewable backup.
function downloadFile(name, text, type) { // Download a backup without sending household data to a server.
  const url = URL.createObjectURL(new Blob([text], { type })); // Turn the text into a temporary downloadable file.
  const link = document.createElement("a"); // Create a temporary download link.
  link.href = url; // Point the link to the generated file.
  link.download = name; // Suggest a clear filename.
  link.click(); // Start the browser download.
  setTimeout(() => URL.revokeObjectURL(url), 1000); // Release the temporary object URL after the download starts.
} // Finish the download helper.
