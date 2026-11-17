"use strict"; // Keep setup and local login mistakes visible during development.
let setupDraft = null; // Keep unfinished setup only in memory until it is valid.
let loginIndex = null; // Remember the selected roommate during the two-step login.
function authFrame(body, subtitle = "Your home, together.") { // Draw the welcome and login layout in the existing Live Easy style.
  document.body.classList.add("auth-mode"); // Hide the dashboard before authentication.
  document.querySelector("#page-content").innerHTML = ""; // Remove the previous user's rendered household data.
  document.querySelector("#auth-screen").innerHTML = `<div class="auth-layout"><div class="auth-story"><a class="brand" href="#"><span class="brand-icon" aria-hidden="true">⌂</span> Live Easy<span class="brand-dot">.</span></a><p class="eyebrow">HOME SWEET SHARED HOME</p><h1>A home that works<br>for everyone.</h1><p>Make space for shared bills, fair rent, and the little things that are just yours.</p><div class="auth-feature">✓ &nbsp; Rent shares that add up</div><div class="auth-feature">✓ &nbsp; One login for each roommate</div><div class="auth-feature">✓ &nbsp; Shared life. Personal purchases.</div></div><div class="auth-panel"><p class="eyebrow">${subtitle}</p>${body}<p class="auth-footnote">No backend or cross-device sync. Use this same browser for this household.</p></div></div>`; // Give setup and login a clear split-screen layout.
  document.title = "Live Easy | Welcome & login"; // Identify the current entry screen in the browser.
} // Finish drawing the authentication frame.
function formError(message) { // Explain validation errors beside the active entry form.
  document.querySelector("#entry-error").textContent = message; // Insert plain text instead of interpreting error messages as HTML.
} // Finish the entry-error helper.
function bindEntry(callback) { // Attach submission behavior to the active welcome or login form.
  document.querySelector("#entry-form").addEventListener("submit", async event => { // Allow password hashing to finish before continuing.
    event.preventDefault(); // Keep the current document open.
    const button = event.target.querySelector('[type="submit"]'); // Find the form's main action button.
    button.disabled = true; // Prevent duplicate submissions while hashing or saving.
    formError(""); // Clear the previous error.
    try { await callback(new FormData(event.target)); } catch (error) { formError(error.message); } // Show validation and storage errors without losing the entered fields.
    finally { button.disabled = false; } // Restore the action if the form remains on screen.
  }); // Finish attaching the handler.
} // Finish the entry-form helper.
function renderWelcome() { // Show household setup to a new or upgrading browser.
  if (state.storageError) { authFrame('<h1>Your saved household needs attention</h1><p>Browser storage could not be read. Check storage permissions or recover the old localStorage record before setting up again. Nothing has been overwritten.</p>'); return; } // Do not overwrite unreadable data.
  const draft = setupDraft || { count: state.members.length || 3, rent: state.monthlyRent ? state.monthlyRent / 100 : "" }; // Reuse earlier setup entries or legacy household values.
  const minimum = state.members.length || 1; // Preserve all legacy member positions and their records.
  authFrame(`<span class="pill">STEP 1 OF 2 · YOUR SPACE</span><h1>Welcome home.</h1><p class="muted">Let's make this space yours. Start with the basics.</p>${state.members.length ? '<p class="setup-notice">Your existing records will be kept. Add rent details and accounts to finish upgrading.</p>' : ""}<form id="entry-form">${field("setup-count", "How many people share the apartment?", input("setup-count", "number", draft.count, `min="${minimum}" max="12" step="1"`))}${field("setup-rent", "Monthly rent (€)", input("setup-rent", "number", draft.rent, 'min="0" max="1000000" step="0.01"'))}${field("setup-rent-date", "Date the first rent was paid", input("setup-rent-date", "date", draft.rentDate || today(), `max="${today()}"`))}<p class="form-help">Choose 1–12 people. You will set each person's share next.</p><p id="entry-error" class="form-error" role="alert"></p><button type="submit" class="button primary full-width">Meet the roommates →</button></form>`); // Display the first setup step with labeled inputs.
  bindEntry(async data => { // Validate the household basics before asking for people.
    const count = Number(data.get("setup-count")); // Read the selected household size.
    const rent = Number(data.get("setup-rent")); // Read the rent amount in euros.
    if (!Number.isInteger(count) || count < minimum || count > 12 || !Number.isFinite(rent) || rent < 0 || rent > 1000000) throw new Error("Enter a valid number of roommates and a valid rent amount."); // Validate values independently of browser input constraints.
    const rentDate = data.get("setup-rent-date"); // Read the date of the initial paid rent.
    if (!validDate(rentDate) || rentDate > today()) throw new Error("Choose a valid first rent payment date, today or earlier."); // Treat initial rent as an actual paid expense.
    setupDraft = { count, rent, rentDate }; // Keep step-one values in memory.
    renderSetupMembers(); // Move to names, percentages, and the owner's password.
  }); // Finish step-one behavior.
} // Finish rendering welcome setup.
function equalPercentages(count) { // Suggest a valid percentage split even when 100 does not divide evenly.
  return allocateCents(10000, Array(count).fill(1)); // Use basis points so three people can receive 33.34%, 33.33%, and 33.33%.
} // Finish generating an equal split.
function renderSetupMembers() { // Ask for roommate details and the creator's login credentials.
  const defaults = equalPercentages(setupDraft.count); // Start with percentages adding up to exactly 100%.
  const rows = Array.from({ length: setupDraft.count }, (value, index) => `<fieldset class="setup-member"><legend>${index === 0 ? "You · household creator" : `Roommate ${index + 1}`}</legend>${field(`name-${index}`, "Name", input(`name-${index}`, "text", "", 'maxlength="24" autocomplete="off"'))}${field(`username-${index}`, "Login username", input(`username-${index}`, "text", "", 'minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]{3,32}" autocomplete="off"'))}${field(`share-${index}`, "Rent share (%)", input(`share-${index}`, "number", (defaults[index] / 100).toFixed(2), 'min="0" max="100" step="0.01"'))}</fieldset>`).join(""); // Give every roommate a stable identity and rent percentage.
  authFrame(`<span class="pill">STEP 2 OF 2 · YOUR PEOPLE</span><h1>A fair share for everyone.</h1><p class="muted">Assign names and usernames. Rent percentages must add up to 100%.</p><form id="entry-form"><div class="setup-grid">${rows}</div><div class="split-total" id="split-total" role="status">Total rent shares: 100.00%</div><button type="button" class="text-button" id="split-total-reset">Reset equal shares</button>${field("first-rent-payer", "Who paid the first rent?", `<select id="first-rent-payer" name="first-rent-payer">${Array.from({ length: setupDraft.count }, (value, index) => `<option value="${index}">${index === 0 ? "You · roommate 1" : `Roommate ${index + 1}`}</option>`).join("")}</select>`)}<p class="form-help">Rent uses these percentages. Other shared bills are split equally. Other roommates set their passwords when they first log in.</p><h2 class="section-gap">Create your password</h2>${passwordFields()}<p id="entry-error" class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" id="setup-back" class="button">Back</button><button type="submit" class="button primary">Create our home →</button></div></form>`); // Build the second setup step.
  document.querySelector("#setup-back").addEventListener("click", renderWelcome); // Allow changing household size or rent before saving.
  bindShareInputs("share-", setupDraft.count, "split-total"); // Adjust only untouched shares and keep the total at 100%.
  Array.from({ length: setupDraft.count }, (value, index) => index).forEach(index => { // Keep the rent-payer options synchronized with names the user actually types.
    document.querySelector(`#name-${index}`).addEventListener("input", () => { const select = document.querySelector("#first-rent-payer"); const selected = select.value || "0"; select.innerHTML = Array.from({ length: setupDraft.count }, (value, member) => `<option value="${member}">${escapeHtml(document.querySelector(`#name-${member}`).value.trim() || `Roommate ${member + 1}`)}</option>`).join(""); select.value = selected; }); // Offer real entered names without autofilling sample identities.
  }); // Finish updating the first rent payer's displayed name.
  bindEntry(completeSetup); // Save only after all setup inputs and the password pass validation.
} // Finish the member setup screen.
function passwordFields() { // Reuse the password creation fields for owners and first-time roommates.
  return field("new-password", "Password", input("new-password", "password", "", 'minlength="8" maxlength="128" autocomplete="new-password"'), "Use at least 8 characters. Choose a password only for this local demo.") + field("confirm-password", "Confirm password", input("confirm-password", "password", "", 'minlength="8" maxlength="128" autocomplete="new-password"')); // Require confirmation to reduce accidental lockouts.
} // Finish building password fields.
function validatePassword(data) { // Check new passwords before deriving their stored hash.
  const password = data.get("new-password"); // Read the password without trimming intentional spaces.
  if (!password || password.length < 8 || password.length > 128 || !password.trim()) throw new Error("Choose a password between 8 and 128 characters."); // Reject empty, too-short, and overly long passwords.
  if (password !== data.get("confirm-password")) throw new Error("Your passwords do not match."); // Ask users to correct mismatched confirmation.
  return password; // Return the password only to the in-memory hashing function.
} // Finish new-password validation.
function hex(bytes) { // Convert binary salt or hash bytes into storage-friendly text.
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(""); // Preserve each byte using two hexadecimal characters.
} // Finish the binary conversion helper.
async function passwordHash(password, salt) { // Derive a password hash using the browser's built-in cryptography.
  if (!crypto.subtle) throw new Error("Password setup needs HTTPS or localhost. Open this project with Live Server or use the hosted page."); // Avoid an insecure fallback when Web Crypto is unavailable.
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]); // Import the password only into memory.
  const saltBytes = new Uint8Array(salt.match(/.{2}/g).map(byte => parseInt(byte, 16))); // Restore the random salt bytes from localStorage text.
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 210000, hash: "SHA-256" }, key, 256); // Slow password guessing without adding a library or backend.
  return hex(new Uint8Array(result)); // Store a derived hash instead of the plain password.
} // Finish deriving a password hash.
async function newCredentials(password) { // Generate a fresh salt for every local account.
  const salt = hex(crypto.getRandomValues(new Uint8Array(16))); // Use a cryptographically random 16-byte salt.
  return { salt, hash: await passwordHash(password, salt) }; // Return only the random salt and derived password hash.
} // Finish creating password credentials.
async function completeSetup(data) { // Validate all roommates and save the complete household once.
  const members = Array.from({ length: setupDraft.count }, (value, index) => data.get(`name-${index}`).trim()); // Read names in stable member order.
  const usernames = members.map((name, index) => data.get(`username-${index}`).trim().toLowerCase()); // Normalize usernames for case-insensitive login.
  const percentages = members.map((name, index) => Number(data.get(`share-${index}`))); // Read each requested percentage.
  const rentShares = percentages.map(value => Math.round(value * 100)); // Store shares as hundredths of one percent.
  if (members.some(name => !name || name.length > 24) || new Set(members.map(name => name.toLowerCase())).size !== members.length) throw new Error("Use a different, nonempty name for each roommate."); // Keep names distinct and readable.
  if (usernames.some(name => !/^[a-z0-9._-]{3,32}$/.test(name)) || new Set(usernames).size !== usernames.length) throw new Error("Usernames must be unique, with 3–32 letters, numbers, dots, underscores, or hyphens."); // Prevent ambiguous or invalid login identifiers.
  if (percentages.some(value => !Number.isFinite(value) || value < 0 || value > 100 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) || rentShares.reduce((sum, value) => sum + value, 0) !== 10000) throw new Error("Rent shares must total exactly 100%, using at most two decimal places."); // Reject incorrect or over-precise percentage splits.
  const ownerPassword = validatePassword(data); // Validate the creator's password and confirmation.
  const credentials = await newCredentials(ownerPassword); // Hash the creator's password before saving anything.
  const next = { ...cloneState(), version: 2, configured: true, sample: false, members, monthlyRent: Math.round(setupDraft.rent * 100), rentShares, accounts: usernames.map((username, index) => ({ username, ...(index === 0 ? credentials : { salt: null, hash: null }) })) }; // Preserve existing records and create unclaimed accounts for the other roommates.
  if (state.expenses.length) next.expenses = state.expenses.map(expense => ({ ...expense, scope: "shared", shares: allocateCents(expense.amount, state.members.map(() => 1)).concat(Array(members.length - state.members.length).fill(0)) })); // Preserve legacy equal splits without charging newly added roommates for old bills.
  next.rentPaidDate = setupDraft.rentDate; next.firstRentPayer = Number(data.get("first-rent-payer")); // Save the first actual rent payment information.
  if (!Number.isInteger(next.firstRentPayer) || next.firstRentPayer < 0 || next.firstRentPayer >= members.length) throw new Error("Choose who paid the first rent."); // Reject an invalid payer.
  if (next.monthlyRent > 0 && !next.expenses.some(expense => expense.category === "Rent" && expense.date === next.rentPaidDate && expense.amount === next.monthlyRent)) next.expenses.push({ id: crypto.randomUUID(), title: "Rent", category: "Rent", amount: next.monthlyRent, payer: next.firstRentPayer, date: next.rentPaidDate, scope: "shared", owner: null, shares: allocateCents(next.monthlyRent, rentShares), initialRent: true }); // Create only the real first rent expense, never example groceries or utilities.
  normalizeFinance(next); // Initialize optional finance profiles without adding salaries or sample spending.
  if (!persist(next)) throw new Error("Could not save setup. Enable browser storage and try again."); // Keep setup open if the browser refuses to save.
  currentUser = 0; // Start the creator's first session after they have supplied credentials.
  setupDraft = null; // Release unfinished setup data from memory.
  document.querySelector("#auth-screen").innerHTML = ""; // Remove password form fields from the page.
  renderPage(); // Open the newly configured household.
  notify("Your home is ready. Other roommates can log in with their assigned usernames."); // Explain how the other accounts will start.
} // Finish completing setup.
function renderLogin() { // Start each new page visit with an explicit roommate login.
  loginIndex = null; // Clear any earlier selected account.
  authFrame(`<span class="pill">WELCOME BACK</span><h1>Your home is waiting.</h1><p class="muted">Log in to your household.</p><form id="entry-form">${field("login-username", "Your username", input("login-username", "text", "", 'maxlength="32" autocomplete="username" autofocus'))}<p class="form-help">First time here? Enter the username your household admin assigned you, then choose your password.</p><p id="entry-error" class="form-error" role="alert"></p><button type="submit" class="button primary full-width">Continue →</button></form>`); // Ask for the account username before selecting password or registration.
  bindEntry(async data => { // Look up the existing account before moving to its password step.
    const username = data.get("login-username").trim().toLowerCase(); // Normalize the login identifier.
    loginIndex = state.accounts.findIndex(account => account.username === username && account.active !== false); // Match an account created during setup.
    if (loginIndex < 0) throw new Error("That username is not in this household. Check with the person who set it up."); // Refuse to create an unassigned extra account.
    renderLoginPassword(); // Ask for an existing password or first-time password creation.
  }); // Finish binding the username step.
} // Finish rendering the login entry screen.
function renderLoginPassword() { // Show the appropriate password step for the selected account.
  const account = state.accounts[loginIndex]; // Read the selected account's saved credentials.
  const isNew = !account.hash; // Detect whether the roommate has ever set a password.
  authFrame(`<span class="pill">${isNew ? "FIRST LOGIN · CREATE PASSWORD" : "ROOMMATE LOGIN"}</span><h1>${isNew ? "Make yourself at home." : "Welcome back."}</h1><p class="muted">${escapeHtml(state.members[loginIndex])} · @${escapeHtml(account.username)}</p><form id="entry-form"><input type="text" name="username" value="${escapeHtml(account.username)}" autocomplete="username" hidden>${isNew ? passwordFields() : field("login-password", "Password", input("login-password", "password", "", 'maxlength="128" autocomplete="current-password" autofocus'))}${isNew ? '<p class="form-help">Only claim your own assigned username. This local demo does not verify identities or provide password recovery.</p>' : ""}<p id="entry-error" class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" id="login-back" class="button">Change username</button><button type="submit" class="button primary">${isNew ? "Set password & log in" : "Log in →"}</button></div></form>`); // Never prefill or reveal an existing password.
  document.querySelector("#login-back").addEventListener("click", renderLogin); // Allow returning to a different username.
  bindEntry(async data => { // Verify or create the selected roommate's credentials.
    const index = loginIndex; // Capture the account index before the asynchronous work starts.
    const before = JSON.stringify(state.accounts); // Detect account changes from another open tab.
    if (isNew) { // Let an unclaimed roommate set their first password.
      const credentials = await newCredentials(validatePassword(data)); // Hash a confirmed new password with a fresh salt.
      const latest = loadData(); // Recheck storage before claiming this local account.
      if (JSON.stringify(latest.accounts) !== before) throw new Error("Accounts changed in another tab. Reload and try again."); // Avoid overwriting a password someone just created.
      const next = { ...latest, accounts: latest.accounts.map((entry, member) => member === index ? { ...entry, ...credentials } : entry) }; // Change only this roommate's credentials.
      if (!persist(next)) throw new Error("Could not save your password. Check browser storage and try again."); // Do not log in with credentials that were never saved.
    } else { // Verify an account that already has a password.
      const hash = await passwordHash(data.get("login-password"), account.salt); // Derive the candidate hash using the stored salt.
      const latest = loadData(); // Refresh saved data before showing this session's dashboard.
      if (JSON.stringify(latest.accounts) !== before) throw new Error("Accounts changed. Reload the page before logging in."); // Refuse a stale account configuration.
      if (hash !== account.hash) throw new Error("Incorrect password. Please try again."); // Reject the wrong password without signing in.
      state = latest; // Use the newest household records after a successful verification.
    } // Finish creating or checking credentials.
    currentUser = index; // Keep the authenticated roommate only in this page's memory.
    document.querySelector("#auth-screen").innerHTML = ""; // Remove all password inputs after login.
    resetPrivateFilters(); // Do not carry a previous roommate's searches into this session.
    renderPage(); // Show the household after successful authentication.
  }); // Finish binding password submission.
} // Finish rendering the password step.
function resetPrivateFilters() { // Clear view state when switching between roommate sessions.
  expenseSearch = ""; expenseCategory = ""; expenseScope = "shared"; // Reset expense filters and return to shared bills.
  choreMember = ""; choreStatus = "all"; shoppingSearch = ""; shoppingStatus = "all"; // Reset other tab filters for the new user.
} // Finish clearing previous view state.
function logout() { // End this local in-memory login session.
  currentUser = null; // Require credentials before showing household data again.
  closeConfirmation(); // Discard a pending deletion when a user logs out.
  if (editor.open) editor.close(); // Hide any form left open by the previous roommate.
  saveHandler = null; // Discard any saved editor callback.
  document.querySelector("#form-fields").innerHTML = ""; // Remove previously displayed personal purchase values.
  document.querySelector("#signed-in-user").textContent = ""; // Remove the previous account name from the header.
  document.querySelector("#toast").classList.remove("show"); // Hide any previous user's notification.
  resetPrivateFilters(); // Drop search text and selected filters.
  renderPage(); // Return to login or setup as appropriate.
} // Finish ending the session.

function renderMoneyOnboarding() { // Require every new roommate to enter their own current funds before opening the household.
  const name = escapeHtml(state.members[currentUser]); // Insert the logged-in person's real name safely.
  authFrame(`<span class="pill">FIRST LOGIN · YOUR MONEY</span><h1>Let's set up your balance, ${name}.</h1><p class="muted">Enter the money you have available now. Salary, payday, budget, credit, and autopay are optional and only you can manage them.</p><form id="entry-form">${moneyFields(state.finances[currentUser], true)}<p id="entry-error" class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button" id="money-onboarding-logout">Use another account</button><button type="submit" class="button primary">Save & open my home →</button></div></form>`, "ONE-TIME MONEY SETUP"); // Use a full entry screen instead of a dismissible settings dialog.
  document.querySelector("#money-onboarding-logout").addEventListener("click", logout); // Allow account switching without marking the incomplete setup as finished.
  bindEntry(async data => { // Keep the person on setup until their money profile is saved successfully.
    if (!saveMoneySettings(data)) throw new Error("Your money setup could not be saved. Check browser storage and try again."); // Never unlock the dashboard after a failed local save.
    document.querySelector("#auth-screen").innerHTML = ""; // Remove the completed private entry fields from the page.
    renderPage(); // Open the household only after the explicit starting balance is stored.
    notify("Your money setup is saved. You can change it later in Money & Expenses."); // Point out where later edits belong.
  }); // Finish binding first-login money setup.
} // Finish mandatory private money onboarding.
