"use strict"; // Keep percentage control errors visible while developing.
function adjustShares(values, locked, changed, requested) { // Rebalance only shares that the user has not manually fixed.
  const next = [...values]; // Preserve the previous valid split until a new one is ready.
  locked.add(changed); // Remember that this roommate was changed manually.
  const free = values.map((value, index) => index).filter(index => !locked.has(index)); // Find only the automatically adjustable roommates.
  const fixedTotal = values.reduce((sum, value, index) => sum + (locked.has(index) && index !== changed ? value : 0), 0); // Keep all previously fixed shares untouched.
  next[changed] = free.length ? Math.min(Math.max(0, requested), 10000 - fixedTotal) : 10000 - fixedTotal; // Clamp the latest share or make it the remainder when every share is manual.
  const remaining = 10000 - fixedTotal - next[changed]; // Calculate exactly what remains for unlocked roommates.
  if (free.length) { // Spread the remainder without disturbing manually fixed entries.
    const weights = free.map(index => values[index]); // Preserve relative proportions among untouched shares.
    const split = allocateCents(remaining, weights.some(value => value > 0) ? weights : free.map(() => 1)); // Fall back to equal proportions when all unlocked shares were zero.
    free.forEach((index, position) => { next[index] = split[position]; }); // Write only the unlocked shares.
  } // Finish redistributing remaining percentage units.
  return next; // Always return a split totaling exactly 10000 basis points.
} // Finish the pure share-rebalancing function.
function bindShareInputs(prefix, count, totalId, active = Array.from({ length: count }, (value, index) => index)) { // Add automatic balancing to setup or household settings.
  let values = Array.from({ length: count }, (value, index) => active.includes(index) ? Math.round(Number(document.querySelector(`#${prefix}${index}`).value) * 100) : 0); // Start from the displayed valid percentages.
  const locked = new Set(values.map((value, index) => index).filter(index => !active.includes(index))); // Initially allow every share to adjust automatically.
  const showTotal = () => { const target = document.querySelector(`#${totalId}`); if (target) target.textContent = "Total rent shares: 100.00% · edited shares stay fixed"; }; // Explain why other values move automatically.
  active.forEach(index => { // Attach behavior to each roommate's percentage input.
    const control = document.querySelector(`#${prefix}${index}`); // Find this roommate's input.
    control.addEventListener("input", () => { // Rebalance while the user types or uses the number arrows.
      const requested = Math.round((Number(control.value) || 0) * 100); // Read the current edit in hundredths of one percent.
      values = adjustShares(values, locked, index, Math.min(10000, Math.max(0, requested))); // Keep all already fixed roommates unchanged.
      values.forEach((share, position) => { const input = document.querySelector(`#${prefix}${position}`); if (!input) return; if (position !== index || share !== requested) input.value = (share / 100).toFixed(2); input.classList.toggle("manual-share", locked.has(position)); }); // Update the automatically affected inputs and show which ones are fixed.
      showTotal(); // Keep the 100% summary visible.
    }); // Finish reacting to this input.
    control.addEventListener("blur", () => { control.value = (values[index] / 100).toFixed(2); }); // Normalize the edited value after typing is complete.
  }); // Finish binding all share controls.
  const reset = document.querySelector(`#${totalId}-reset`); // Find the optional equal-split reset button.
  if (reset) reset.addEventListener("click", () => { const equal = equalPercentages(active.length); values = Array(count).fill(0); active.forEach((index, position) => { values[index] = equal[position]; }); locked.clear(); values.forEach((share, index) => { const input = document.querySelector(`#${prefix}${index}`); if (!input) { locked.add(index); return; } input.value = (share / 100).toFixed(2); input.classList.remove("manual-share"); }); showTotal(); }); // Unlock active shares without reintroducing removed members.
  showTotal(); // Display the valid initial total.
} // Finish binding percentage inputs.
