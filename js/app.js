// Coordinates page rendering and navigation and wires household settings into the application.
"use strict"; // Enable stricter checks for app startup and navigation.
const pages = { overview: renderOverview, expenses: renderExpenses, chores: renderChores, shopping: renderShopping }; // Connect each URL hash to its tab renderer.
function renderPage() { // Show the requested tab and update shared navigation.
  const beforeUpgrade = JSON.stringify(state); // Detect a one-time additive migration or proven demo cleanup.
  normalizeFinance(state); // Ensure old households have wallet, repayment, and transferable-admin fields.
  if (state.configured && beforeUpgrade !== JSON.stringify(state)) persist(state); // Save the upgrade once without adding any sample spending.
  if (!state.configured) { renderWelcome(); return; } // New and upgraded households must finish setup first.
  if (currentUser === null) { renderLogin(); return; } // Require a login after every new load of this page.
  if (state.accounts[currentUser]?.active === false) { currentUser = null; renderLogin(); return; } // Block a removed member from reopening the household.
  if (!state.finances[currentUser].onboarded) { renderMoneyOnboarding(); return; } // Require a one-time explicit balance setup for every member, including the creator.
  reconcileFinance(); // Post due salaries and authorized per-expense autopay before showing current balances.
  document.body.classList.remove("auth-mode"); // Reveal the dashboard only after authentication.
  const requested = location.hash.slice(1) || "overview"; // Read the current tab from the URL.
  const pageNames = { overview: "Overview", expenses: "Money & Expenses", chores: "Chores", shopping: "Shopping" }; // Keep the familiar expenses URL while naming the expanded money tab clearly.
  const page = Object.hasOwn(pages, requested) ? requested : "overview"; // Fall back safely when a URL contains an unknown tab.
  pages[page](); // Render the chosen tab from the latest saved state.
  document.querySelectorAll("[data-page]").forEach(link => { // Update every navigation link.
    link.classList.toggle("active", link.dataset.page === page); // Highlight only the active link.
    if (link.dataset.page === page) link.setAttribute("aria-current", "page"); // Announce the current page to screen readers.
    else link.removeAttribute("aria-current"); // Remove the old current-page marker.
  }); // Finish updating navigation.
  document.querySelector("#breadcrumb").textContent = pageNames[page]; // Update the top breadcrumb label.
  document.querySelector("#chore-count").textContent = state.chores.filter(chore => !chore.done).length; // Keep the chore badge accurate on every tab.
  document.querySelector("#household-size").textContent = `${activeIndices().length} roommates · one home`; // Reflect the configured household size.
  document.querySelector("#signed-in-user").textContent = `${state.members[currentUser]} · @${state.accounts[currentUser].username}${isAdmin() ? " · Admin" : ""}`; // Identify the active local account.
  document.title = `Live Easy | ${pageNames[page]}`; // Make browser history and tabs easy to identify.
} // Finish rendering the active page.
function settingsForm() { // Allow the creator to maintain household names and future rent settings.
  if (!isAdmin()) { notify("The current household admin manages names and rent settings."); return; } // Keep configuration controls with the creator account.
  const fields = field("monthly-rent", "Monthly rent (€)", input("monthly-rent", "number", (state.monthlyRent / 100).toFixed(2), 'min="0" max="1000000" step="0.01"')) + activeIndices().map(index => { const name = state.members[index]; return field(`member-${index}`, `Roommate ${index + 1} · @${escapeHtml(state.accounts[index].username)}`, input(`member-${index}`, "text", name, 'maxlength="24"')) + field(`rent-share-${index}`, "Rent share (%)", input(`rent-share-${index}`, "number", (state.rentShares[index] / 100).toFixed(2), 'min="0" max="100" step="0.01"')); }).join("") + '<div class="split-total" id="settings-share-total"></div><button type="button" class="text-button" id="settings-share-total-reset">Reset equal shares</button><p class="form-help">Shares adjust automatically to 100%. Changes affect future rent records; saved expenses keep their original split. Usernames stay the same.</p><div class="settings-actions"><button type="button" class="button" data-action="manage-members">Manage members & admin role</button><button type="button" class="button" data-action="backup">Export shared data & my purchases ↓</button><button type="button" class="button danger" data-action="clear">Clear shared lists</button></div><p class="form-help section-gap">Personal purchases belonging to other accounts are excluded from exports and are kept when shared lists are cleared.</p>'; // Keep credentials and other users' personal details outside settings.
  openForm("Your household", fields, data => { // Open the creator's settings editor.
    if (!isAdmin()) throw new Error("Only the current admin can save household settings."); // Recheck a transferred admin role before saving.
    const next = cloneState(); // Prepare a draft before making any changes.
    next.members = state.members.map((name, index) => state.accounts[index].active === false ? name : data.get(`member-${index}`).trim()); // Rename roommates without changing their stable member indexes.
    const percentages = state.members.map((name, index) => state.accounts[index].active === false ? 0 : Number(data.get(`rent-share-${index}`))); // Read the new rent percentages.
    next.rentShares = percentages.map(value => Math.round(value * 100)); // Store percentages in basis points.
    next.monthlyRent = Math.round(Number(data.get("monthly-rent")) * 100); // Store rent in cents.
    if (next.members.some(name => !name) || new Set(next.members.map(name => name.toLowerCase())).size !== next.members.length) throw new Error("Use different, nonempty roommate names."); // Reject blank or duplicate names.
    if (percentages.some(value => !Number.isFinite(value) || value < 0 || value > 100 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) || next.rentShares.reduce((sum, value) => sum + value, 0) !== 10000) throw new Error("Rent percentages must add up to exactly 100%."); // Check each percentage and the complete split.
    if (!Number.isSafeInteger(next.monthlyRent) || next.monthlyRent < 0 || next.monthlyRent > 100000000) throw new Error("Enter a valid monthly rent amount."); // Reject invalid rent settings.
    return persist(next); // Save future rent settings without altering existing expense splits.
  }); // Finish configuring the settings form.
  bindShareInputs("rent-share-", state.members.length, "settings-share-total", activeIndices()); // Keep removed members at zero and adjust only active share controls.
} // Finish creator settings.
document.querySelector("#editor-form").addEventListener("submit", async event => { // Listen for the active dialog form to be submitted.
  event.preventDefault(); // Save with JavaScript instead of reloading the page.
  if (currentUser === null || !saveHandler) return; // Reject a stale editor submission after logout.
  try { // Catch extra validation and storage failures.
    if (await saveHandler(new FormData(event.target))) { editor.close(); renderPage(); notify("Saved. You're all set!"); } // Close and refresh only when saving succeeded.
    else document.querySelector("#form-error").textContent = "Your changes could not be saved. Check your browser storage settings and try again."; // Leave unsaved fields available for correction.
  } catch (error) { document.querySelector("#form-error").textContent = error.message; } // Display field validation errors in the open dialog.
}); // Finish registering the form handler.
document.querySelector("#close-dialog").addEventListener("click", () => editor.close()); // Close the dialog from its X button.
document.querySelector("#cancel-dialog").addEventListener("click", () => editor.close()); // Cancel editing without changing saved data.
document.querySelector("#house-settings").addEventListener("click", settingsForm); // Open settings from the sidebar.
document.querySelector("#download-source").addEventListener("click", () => { // Offer the fully commented project as a ZIP file.
  const link = document.createElement("a"); // Build a temporary download link.
  link.href = "roomly-source.zip"; // Point to the packaged source included with the app.
  link.download = "live-easy-source.zip"; // Suggest the project archive filename.
  link.click(); // Start downloading the source archive.
}); // Finish the source download action.
document.querySelector("#confirm-cancel").addEventListener("click", closeConfirmation); // Keep records when cancelling the branded confirmation.
document.querySelector("#confirm-dialog").addEventListener("cancel", () => { confirmHandler = null; }); // Treat Escape as cancellation, never as acceptance.
document.querySelector("#confirm-accept").addEventListener("click", () => { // Apply only the currently displayed destructive action.
  if (!confirmHandler || currentUser === null) return; // Ignore stale clicks after logout or cancellation.
  try { if (confirmHandler()) { closeConfirmation(); renderPage(); notify("Changes saved."); } else document.querySelector("#confirm-error").textContent = "Could not save. Your records were not changed."; } catch (error) { document.querySelector("#confirm-error").textContent = error.message; } // Keep failures visible without losing records.
}); // Finish handling custom confirmations.
document.querySelector("#logout-button").addEventListener("click", logout); // End the current roommate session explicitly.
document.addEventListener("click", event => { // Handle buttons even when their tab HTML is freshly rendered.
  const button = event.target.closest("[data-action]"); // Find a clicked action button or its parent.
  if (!button || currentUser === null) return; // Ignore clicks that are not application actions.
  const action = button.dataset.action; // Read which action the button requests.
  const id = button.dataset.id; // Read the selected record's stable ID if present.
  if (action === "my-purchases") { expenseScope = "personal"; location.hash = "expenses"; renderPage(); } // Open only the signed-in roommate's personal purchases.
  if (action === "add-rent") { expenseScope = "shared"; expenseForm(); if (editor.open) { document.querySelector("#title").value = "Monthly rent"; document.querySelector("#amount").value = (state.monthlyRent / 100).toFixed(2); document.querySelector("#category").value = "Rent"; } } // Prefill a shared full-rent payment without saving it automatically.
  if (action === "add-expense" || action === "edit-expense") expenseForm(id); // Open an expense editor.
  if (action === "add-chore" || action === "edit-chore") choreForm(id); // Open a chore editor.
  if (action === "add-shopping" || action === "edit-shopping") shoppingForm(id); // Open a shopping editor.
  if (action === "delete-expense") removeRecord("expenses", id); // Delete the selected expense after confirmation.
  if (action === "delete-chore") removeRecord("chores", id); // Delete the selected chore after confirmation.
  if (action === "delete-shopping") removeRecord("shopping", id); // Delete the selected shopping record after confirmation.
  if (action === "toggle-chore") toggleRecord("chores", id, "done"); // Complete or reopen a chore.
  if (action === "toggle-shopping") toggleRecord("shopping", id, "bought"); // Mark an item purchased or unpurchased.
  if (action === "settings") settingsForm(); // Open settings from the overview.
  if (action === "export-expenses") exportExpenses(); // Download the expense report.
  if (action === "backup") { downloadFile("live-easy-household-backup.json", JSON.stringify(readableBackup(), null, 2), "application/json"); notify("Household backup downloaded."); } // Export all household records locally.
  if (action === "budget-settings") budgetForm(); // Set a spending target without enabling a wallet or salary.
  if (action === "money-settings") financeForm(); // Let each member configure only their own wallet and salary.
  if (action === "pay-all") payAllForm(); // Review and confirm a checkable batch of unpaid expense shares.
  if (action === "repay") repaymentForm(id); // Pay a single outstanding expense share.
  if (action === "manage-members") memberManager(); // Open active membership and role-transfer controls for the admin.
  if (action === "add-member") addMemberForm(); // Create a new roommate's unclaimed login.
  if (action === "remove-member") removeMember(Number(button.dataset.member)); // Disable a settled member without changing historical record indexes.
  if (action === "transfer-admin") transferAdmin(Number(button.dataset.member)); // Hand over administrative authority after an explicit confirmation.
  if (action === "clear" && isAdmin()) { // Require current admin authority before clearing shared lists.
    if (state.settlements.length) { notify("Shared expenses with repayments must stay in the payment history. Delete unpaid items individually instead."); return; } // Avoid erasing money transfers that have already changed wallets.
    askConfirmation("Clear shared lists?", "Shared expenses, chores, and shopping will be removed. Personal purchases and accounts will stay.", () => { // Use an in-page confirmation instead of a browser popup.
      if (!isAdmin()) throw new Error("Only the current admin can clear shared records."); // Recheck the admin role before applying the action.
      const next = cloneState(); const removed = new Set(next.expenses.filter(expense => expense.scope !== "personal").map(expense => expense.id)); // Identify only shared records being removed.
      next.expenses = next.expenses.filter(expense => expense.scope === "personal"); next.chores = []; next.shopping = []; // Preserve every member's personal purchases.
      next.walletEntries.forEach(entry => { if (removed.has(entry.expenseId)) entry.voided = true; }); // Reverse only those removed purchases' simulated wallet charges.
      return persist(next); // Save the complete change atomically.
    }, "Clear shared lists"); // Name the destructive button for its real effect.
  } // Finish the clear-list action.
}); // Finish registering the shared click handler.
window.addEventListener("hashchange", () => { renderPage(); document.querySelector("#main").focus(); window.scrollTo(0, 0); }); // Support navigation, browser back, and accessible page focus.
window.addEventListener("storage", event => { // Respond to household changes in another tab of this browser.
  if (event.key !== STORAGE_KEY && event.key !== null) return; // Ignore unrelated websites' storage keys.
  const oldAccounts = JSON.stringify(state.accounts); // Remember the previous local account configuration.
  closeConfirmation(); // Cancel actions based on records another tab may have changed.
  state = loadData(); // Read the newest household rather than keeping a stale copy.
  if (editor.open) editor.close(); // Avoid submitting an editor based on older saved records.
  saveHandler = null; // Discard the stale editor callback.
  if (!state.configured || oldAccounts !== JSON.stringify(state.accounts)) currentUser = null; // Require login again when account settings change.
  renderPage(); // Refresh the current view or return to login.
}); // Finish the cross-tab update handler.
window.addEventListener("pagehide", logout); // Clear in-memory login before a browser-history page snapshot is kept.
window.addEventListener("pageshow", event => { if (event.persisted) logout(); }); // Require credentials when returning through the back-forward cache.
setInterval(() => { // Recheck local salaries and saved autopay while this page remains open.
  if (currentUser === null || !state.finances[currentUser].onboarded || editor.open || document.querySelector("#confirm-dialog").open) return; // Avoid modifying forms or processing finances while logged out.
  const before = JSON.stringify(state.walletEntries); // Remember the already displayed ledger.
  reconcileFinance(); // Credit a newly reached payday or an authorized outstanding payment.
  if (before !== JSON.stringify(state.walletEntries)) renderPage(); // Refresh the dashboard only when money actually changed.
}, 60000); // Check once a minute without requiring a backend or a background bank connection.
renderPage(); // Show welcome setup or login on every fresh document load.
