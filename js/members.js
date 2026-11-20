// Handles administrator actions for adding and removing members and transferring the administrator role.
"use strict"; // Keep household membership changes separate from the four tab implementations.
function memberManager() { // Give only the current admin access to member and admin-role controls.
  if (!isAdmin()) { notify("Only the household admin can manage members."); return; } // Enforce the transferable administrator role.
  const rows = activeIndices().map(index => `<div class="list-row">${avatar(index)}<div class="row-main"><strong>${escapeHtml(state.members[index])}</strong><small>@${escapeHtml(state.accounts[index].username)}${index === state.admin ? " · Admin" : ""}</small></div>${index !== state.admin ? `<button type="button" class="text-button" data-action="transfer-admin" data-member="${index}">Make admin</button><button type="button" class="text-button delete-button" data-action="remove-member" data-member="${index}">Remove</button>` : '<span class="pill">You</span>'}</div>`).join(""); // Keep historical member indexes stable while showing only current members.
  openForm("Manage household members", `<p class="form-help">Add a roommate, remove a settled member, or hand over the admin role. Existing expenses keep their original shares.</p>${rows}<div class="section-gap"><button type="button" class="button primary" data-action="add-member">＋ Add a member</button></div>`, () => true); // Offer member actions without changing another user's money settings.
} // Finish showing household member controls.
function addMemberForm() { // Register an unclaimed local login and rent share for a new roommate.
  if (!isAdmin()) return; // Require the saved admin identity.
  if (activeIndices().length >= 12) { notify("This beginner version supports up to 12 active roommates."); return; } // Keep the small-household scope manageable.
  editor.close(); // Replace the member list with the add-person form.
  const fields = field("member-name", "Name", input("member-name", "text", "", 'maxlength="24" autocomplete="off"')) + field("member-username", "Login username", input("member-username", "text", "", 'minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]{3,32}" autocomplete="off"')) + field("member-share", "New roommate's rent share (%)", input("member-share", "number", (100 / (activeIndices().length + 1)).toFixed(2), 'min="0" max="100" step="0.01"')) + '<p class="form-help">Existing members share the remaining rent proportionally. Old bills stay unchanged. The new member chooses their own password on first login.</p>'; // Keep fields blank and explain the effect on future rent.
  openForm("Add a roommate", fields, data => { // Validate and add only the identity, never a password on their behalf.
    if (!isAdmin()) throw new Error("Your admin role changed. Reopen this form."); // Recheck authorization at save time.
    const name = data.get("member-name").trim(); const username = data.get("member-username").trim().toLowerCase(); const percentage = Number(data.get("member-share")); // Read the requested identity and percentage.
    if (!name || state.members.some(value => value.toLowerCase() === name.toLowerCase()) || !/^[a-z0-9._-]{3,32}$/.test(username) || state.accounts.some(account => account.username === username)) throw new Error("Use a unique name and username with 3–32 letters, numbers, dots, underscores, or hyphens."); // Keep every historical identity unambiguous.
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100 || Math.abs(percentage * 100 - Math.round(percentage * 100)) > 0.00001) throw new Error("Choose a rent percentage from 0 to 100 with at most two decimals."); // Store exact basis points only.
    const next = normalizeFinance(cloneState()); const share = Math.round(percentage * 100); const active = activeIndices(next); // Start a membership update without mutating current records.
    const weights = active.map(index => next.rentShares[index]); const split = allocateCents(10000 - share, weights.some(value => value > 0) ? weights : active.map(() => 1)); // Redistribute only future rent among existing active people.
    next.rentShares = next.members.map(() => 0); active.forEach((index, position) => { next.rentShares[index] = split[position]; }); next.rentShares.push(share); // Preserve removed indexes with zero future rent.
    next.members.push(name); next.accounts.push({ username, active: true, salt: null, hash: null }); next.finances.push(defaultFinance()); // Append stable identity and private finance slots.
    return persist(next); // Save identity and rent changes atomically.
  }); // Finish configuring the new-member form.
} // Finish adding a member.
function removeMember(index) { // Remove future access without losing the historical identity on expenses.
  if (!isAdmin() || index === state.admin || !activeIndices().includes(index)) return; // Require the admin and prevent removing the current admin role.
  const owes = debtsFor(index).reduce((sum, item) => sum + item.due, 0); // Check all unpaid amounts this person owes.
  const owed = state.expenses.filter(expense => expense.scope !== "personal" && expense.payer === index).reduce((sum, expense) => sum + state.members.reduce((total, name, member) => total + remainingDebt(expense, member), 0), 0); // Check individual outstanding amounts owed to this person, even when net balances cancel.
  if (owes || owed || walletBalance(index) < 0) { notify("Settle this member's expense debts and negative wallet balance before removing them."); return; } // Keep debts repayable instead of stranding them behind a disabled login.
  askConfirmation("Remove this roommate?", `${state.members[index]} will lose login access. Their old records stay attached to them, and future rent is redistributed.`, () => { // Use the same styled confirmation flow as deletion.
    if (!isAdmin()) throw new Error("Only the current admin can remove members."); // Recheck authorization immediately before saving.
    const next = normalizeFinance(cloneState()); next.accounts[index].active = false; next.finances[index].autopay = "off"; // Disable login and future automated payments.
    const active = activeIndices(next); const weights = active.map(member => next.rentShares[member]); const split = allocateCents(10000, weights.some(value => value > 0) ? weights : active.map(() => 1)); // Reallocate future rent among the remaining active people.
    next.rentShares = next.members.map(() => 0); active.forEach((member, position) => { next.rentShares[member] = split[position]; }); // Keep all historical positions intact.
    next.chores.forEach(chore => { if (chore.assignee === index && !chore.done) chore.assignee = next.admin; }); // Keep unfinished chores assigned to an active person.
    return persist(next); // Save the membership update only after confirmation.
  }, "Remove member"); // Label the destructive action clearly.
} // Finish removing a settled member.
function transferAdmin(index) { // Let the current administrator hand their role to another active roommate.
  if (!isAdmin() || index === state.admin || !activeIndices().includes(index)) return; // Reject unauthorized or invalid transfers.
  askConfirmation("Transfer the admin role?", `${state.members[index]} will manage members and household settings. You will keep your account and become a regular member.`, () => { // Explain exactly what the current admin is giving up.
    if (!isAdmin()) throw new Error("Your admin role has already changed."); // Avoid stale repeated transfers.
    const next = cloneState(); next.admin = index; // Move the single admin role without sharing passwords or changing identities.
    return persist(next); // Save the explicit role transfer.
  }, "Transfer admin"); // Use a clear, intentional confirmation label.
} // Finish transferring the household administrator.
