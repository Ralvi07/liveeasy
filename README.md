# Live Easy

A shared-apartment organizer built with **HTML, CSS, and vanilla JavaScript**. Live Easy helps roommates split rent, track shared and personal spending, manage chores, and organize shopping.

The project is designed for a **four-person web-development team**, with one main tab per contributor. It runs entirely in the browser using **localStorage**—no backend, framework, database server, or API key is required.

[Open the live application](https://roomly-apartment-organizer.lamelysmart.chatgpt.site)

## Features

| Tab | What it does |
| --- | --- |
| **Overview** | Shows your unpaid share, your share paid, available balance, chore progress, shopping summary, household balances, and rent plan. |
| **Money & Expenses** | Tracks shared bills and personal purchases, manages your budget and money settings, and supports individual repayments and a checkable **Pay all** review. |
| **Chores** | Creates and assigns tasks, tracks deadlines and completion, and filters by roommate or status. |
| **Shopping** | Tracks items, quantities, estimated unit prices, purchased status, and the remaining shopping estimate. |

Additional features include first-time household setup, local roommate accounts, required first-login balance setup, optional salary/payday tracking, simulated credit, autopay, and a transferable household admin role.

## Run locally

1. Clone this repository or download and extract the completed project.
2. Open the project folder in **Visual Studio Code**.
3. Install the **Live Server** extension if it is not already installed.
4. Right-click `index.html` and select **Open with Live Server**.

Alternatively, open a terminal in the folder containing `index.html` and run:

```bash
python3 -m http.server 8000
```

Then visit **http://localhost:8000**.

Use **localhost or HTTPS**: password hashing relies on the browser's Web Crypto API. No npm installation or build command is needed. Google Fonts is optional; the interface uses fallback fonts when it cannot load them.

## First-time setup

1. Enter the number of roommates, monthly rent, and the date the first rent was paid.
2. Enter each person's name, unique username, and rent percentage.
3. Select the roommate who paid the first rent.
4. The creator sets their password and becomes the initial household admin.
5. Complete your own money setup by entering your current balance. Entering **0** is allowed; salary, payday, budget, credit, and autopay are optional.
6. Other roommates use their assigned usernames, choose their passwords on first login, and complete their own money setup.

Setup supports **1–12 active roommates**. It creates only the initial rent expense when rent is greater than zero; no sample names or other example expenses are added.

Each new page load requires login. The money setup step is saved separately for each person and is not repeated once completed.

### Rent percentages

Percentages always total **100%**. Changing a share fixes that value and redistributes the remainder among shares that have not been manually changed. Once every share has been edited, the latest edited share becomes the remainder required for 100%. **Reset equal shares** unlocks the values.

Rent expenses use these percentages. Other shared bills are split equally among active members. Existing expenses keep their original allocations when rent settings or membership change.

## Money, expenses, and payments

### Shared and personal purchases

Every purchase recorded after setup belongs to the signed-in person, who is also its payer. Only that person can edit or delete it. The initial rent entered during setup is the exception because setup asks who actually paid it.

A purchase can be **shared** or **personal**. Personal purchases are excluded from household balances and other accounts' purchase views and exports.

### Paid and unpaid shares

- **My unpaid share:** the portions of recorded shared expenses you still owe to their payers.
- **My share paid:** your allocated portions already covered through your own bill payments or repayments to other members.
- **Available balance:** your separately tracked wallet funds.

Paid and unpaid shares describe your own costs. They do not count money you advanced on behalf of other people as your own spending.

### Budget and salary

In **Money & Expenses**, use **Set up my budget** to choose a private monthly spending target without enabling wallet tracking. Use **Budget & money settings** to manage your current funds, optional monthly salary and next payday, credit permission, and autopay.

The budget counts your allocated share of bills plus your personal purchases dated in the current calendar month. Repayments are not counted again. A budget is a planning target; it is separate from your wallet balance.

Salary is credited once per scheduled monthly payday while the app is in use, or when it is next opened. Month-end paydays adjust for shorter months. Reopening the app does not duplicate an already recorded salary credit.

### Repayments and Pay all

Pay an individual expense share from its **Pay** button or your unpaid-shares list.

**Pay all** opens a brief review of your outstanding shares, showing the expense, recipient, remaining amount, and total. Uncheck any expense you do not want included. The total updates immediately, and nothing is paid until you confirm.

Balance-only payments require enough funds. If simulated credit is enabled, you can explicitly choose balance plus credit, up to your saved limit. An unaffordable Pay all batch is rejected in full instead of partly applying payments. Your separately enabled autopay setting remains independent of manual checkout selections.

Expenses with repayments stay in the payment history and cannot be deleted or have their amount/split rewritten.

### Autopay modes

| Mode | Behavior |
| --- | --- |
| **Off** | Pay your shares manually. |
| **Balance only** | Pay oldest recorded debts without going below zero. |
| **Balance and credit** | Use available funds and explicitly enabled simulated credit up to its limit. |

Autopay may make partial payments when only part of a debt is affordable. It runs while the app is in use; it cannot charge anything when the browser is closed. Future rent bills are not created automatically—record a new full rent payment when it is actually paid.

## Household admin

The creator starts as the sole admin. In **Edit household → Manage members & admin role**, the current admin can:

- Add a member with a name, username, and future rent share.
- Remove a member after debts to/from them are settled and their wallet is not negative.
- Transfer the admin role to another active member.

Existing records keep their original member indexes and allocations. Added members are not charged for old expenses. Removed members lose login access; their history remains. The former admin becomes a regular member after transferring the role.

## Project structure

```text
index.html
styles.css
favicon.svg
js/
  shared.js
  shares.js
  finance.js
  members.js
  auth.js
  overview.js
  expenses.js
  chores.js
  shopping.js
  app.js
README.md
COMMIT-COMMENTS.md
TEAM-WORKFLOW.md
```

| File | Responsibility |
| --- | --- |
| `index.html` | Shared page layout, navigation, entry screen, dialogs, and script imports. |
| `styles.css` | Shared styling and responsive layouts. |
| `js/shared.js` | Household state, localStorage, common UI helpers, money allocation, visibility, and exports. |
| `js/shares.js` | Automatically balanced rent-percentage controls. |
| `js/finance.js` | Wallets, salaries, budgets, repayments, credit checks, autopay, and Pay all review. |
| `js/members.js` | Admin role transfer and membership changes. |
| `js/auth.js` | Household setup, local passwords/login, first-login money setup, and logout. |
| `js/overview.js` | Overview cards, summaries, rent plan, and paid/unpaid share calculations. |
| `js/expenses.js` | Money & Expenses views, purchase forms, filters, and CSV export. |
| `js/chores.js` | Task rows, forms, deadlines, filters, and completion. |
| `js/shopping.js` | Shopping rows, forms, quantities, prices, filters, and purchased status. |
| `js/app.js` | App startup, guarded navigation, settings, event routing, and refresh behavior. |

Scripts load in order with `defer`. Tabs share a household state object and common helpers. Money is stored as **integer cents**, and rent percentages as **integer basis points**, to avoid rounding errors. Shared expense allocations are saved with each record.

## Four-person contribution plan

| Contribution | Main ownership |
| --- | --- |
| **1 — Overview and shared foundation** | Shared HTML/CSS, storage and helper modules, setup/login, money/admin infrastructure, Overview, and safe scaffolds for the other tabs. |
| **2 — Money & Expenses** | Replace `js/expenses.js` with the complete purchase, budget, and payment interface. |
| **3 — Chores** | Replace `js/chores.js` with the complete task-management tab. |
| **4 — Shopping** | Replace `js/shopping.js` with the complete shopping tab. |

Contribution 1 goes first. The other three can then be developed on separate branches. Each member should commit with their own Git name, verified GitHub email, and account, then open a pull request into the shared repository.

If using the member ZIPs, copy the **contents of `files/`** into the repository root. Do not add the outer `files/` folder. Choose either the commented or comment-free set for the whole team; both contain the same executable functionality. The commented packages include a detailed `COMMIT-N-EXPLANATION.txt` per contribution. [COMMIT-COMMENTS.md](COMMIT-COMMENTS.md) provides suggested commit titles and descriptions.

## Manual checks

- Complete setup with a rent split that totals 100% and verify the first rent's date/payer.
- Log out, reload, and test first-time and returning roommate logins.
- Enter a zero balance; try a wrong password or incomplete money form.
- Add shared and personal purchases and switch accounts to check visibility and ownership.
- Confirm that monthly budgets count expense shares once, including after repayments.
- Pay part of a debt, then review Pay all with selected/unselected expenses and insufficient funds.
- Test both autopay modes, credit limits, and repeated payday processing.
- Add/complete/filter a chore and add/purchase/filter a shopping item.
- Transfer the admin role and verify old records stay attached to their members.
- Check narrow screens, keyboard navigation, dialog cancellation, and persistence after reload.

## Storage and limitations

This is a **browser-local educational application**. Payments, salaries, balances, and credit are simulations: no bank or card is connected or charged. Local passwords are salted hashes, but they do not encrypt localStorage or prevent someone controlling browser storage from inspecting/changing data. There is no independent identity verification, password recovery, backend, or cross-device synchronization.

Use the same browser profile and origin for the same household. Clearing browser storage removes its saved accounts and records. CSV exports include the selected expense view; JSON exports exclude passwords and other users' private finance profiles. Exports are readable backups; an import screen is not included. Avoid simultaneous edits in multiple tabs.

The hosted source-download button needs its generated ZIP beside `index.html` when used locally. That archive is not required to run the application itself.
