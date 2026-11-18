"use strict";
let choreStatus = "all";
let choreMember = "";
function choreRow(chore, compact = false) {
  const dueText = chore.done ? "Complete" : chore.due < today() ? "Overdue" : chore.due === today() ? "Today" : dateLabel(chore.due);
  const tone = chore.done ? "success" : chore.due <= today() ? "warning" : "";
  return `<div class="list-row ${chore.done ? "completed" : ""}"><button class="check-button ${chore.done ? "checked" : ""}" data-action="toggle-chore" data-id="${chore.id}" aria-label="${chore.done ? "Reopen" : "Complete"} ${escapeHtml(chore.title)}" aria-pressed="${chore.done}">${chore.done ? "✓" : ""}</button><div class="row-main"><strong>${escapeHtml(chore.title)}</strong><small>${escapeHtml(state.members[chore.assignee])} · Due ${dateLabel(chore.due)}</small></div><span class="pill ${tone}">${dueText}</span>${compact ? "" : `<div class="row-actions"><button class="text-button" data-action="edit-chore" data-id="${chore.id}" aria-label="Edit ${escapeHtml(chore.title)}">Edit</button><button class="text-button delete-button" data-action="delete-chore" data-id="${chore.id}" aria-label="Delete ${escapeHtml(chore.title)}">Delete</button></div>`}</div>`;
}
function renderChores() {
  const complete = state.chores.filter(chore => chore.done).length;
  const overdue = state.chores.filter(chore => !chore.done && chore.due < today()).length;
  content.innerHTML = heading("A little home upkeep", "Share the load. A tidy home feels better for everyone.", '<button class="button primary" data-action="add-chore">＋ Add chore</button>') + `<section class="stats-grid">${stat("All chores", state.chores.length, "Every task has a home", "▤")}${stat("Completed", complete, "A little teamwork in action", "✓", "green")}${stat("Still to do", state.chores.length - complete, "One small task at a time", "◷", "blue")}${stat("Overdue", overdue, "A gentle nudge to catch up", "!", "peach")}</section><section class="card"><div class="card-head"><div><h2>The household to-do list</h2><p class="card-subtitle">Check off a task when it's done. You can always reopen it.</p></div></div><div class="toolbar"><select id="chore-status" aria-label="Filter chore status"><option value="all">All chores</option><option value="pending">To do</option><option value="done">Completed</option><option value="overdue">Overdue</option></select><select id="chore-member" aria-label="Filter chores by roommate"><option value="">All roommates</option>${memberOptions(choreMember === "" ? -1 : Number(choreMember))}</select></div><div id="chore-results"></div></section>`;
  document.querySelector("#chore-status").value = choreStatus;
  document.querySelector("#chore-member").value = choreMember;
  renderChoreResults();
  document.querySelector("#chore-status").addEventListener("change", event => { choreStatus = event.target.value; renderChoreResults(); });
  document.querySelector("#chore-member").addEventListener("change", event => { choreMember = event.target.value; renderChoreResults(); });
}
function renderChoreResults() {
  const filtered = state.chores.filter(chore => (choreMember === "" || chore.assignee === Number(choreMember)) && (choreStatus === "all" || (choreStatus === "done" && chore.done) || (choreStatus === "pending" && !chore.done) || (choreStatus === "overdue" && !chore.done && chore.due < today()))).sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  document.querySelector("#chore-results").innerHTML = filtered.length ? filtered.map(chore => choreRow(chore)).join("") : empty("No chores here", "Add a chore or choose a different filter.");
}
function choreForm(id) {
  const existing = state.chores.find(chore => chore.id === id);
  const chore = existing || { title: "", assignee: currentUser, due: today(), done: false };
  const fields = field("title", "What needs doing?", input("title", "text", chore.title, 'maxlength="80" placeholder="e.g. Clean the kitchen"')) + field("assignee", "Who's on it?", `<select id="assignee" name="assignee">${memberOptions(chore.assignee)}</select>`) + field("due", "Due date", input("due", "date", chore.due));
  openForm(existing ? "Edit chore" : "Add a chore", fields, data => {
    const title = data.get("title").trim();
    if (!title) throw new Error("Please enter a chore name.");
    const record = { id: existing ? existing.id : crypto.randomUUID(), title, assignee: Number(data.get("assignee")), due: data.get("due"), done: chore.done };
    const next = cloneState();
    if (existing) next.chores = next.chores.map(item => item.id === id ? record : item);
    else next.chores.push(record);
    return persist(next);
  });
}
