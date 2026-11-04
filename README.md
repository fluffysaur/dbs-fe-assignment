# Meridian Banking — Tan Yi Jia

- Deployed: [meridian-banking-yijia.vercel.app](https://meridian-banking-yijia.vercel.app/)
- Run locally: `npm install && npm run dev`

## Project structure

```text
src/
  api/              Typed data layer: the only code that talks to the API
    client.ts         apiFetch + ApiError (given)
    types.ts          API types (given)
    queries.ts        Query options: customer, accounts, recent transactions, payees
    transfers.ts      POST /api/transfers + useCreateTransfer (refreshes data on success)
  features/
    dashboard/      The page: data hook, skeleton, error, hero, accounts, transactions, daily limit
    transfer/       The dialog: steps, stepper, success/discard panels, schema.ts (all rules)
    theme/          usePreferences (light/dark + Retail/Premium), the two toggles
    header/         The top bar: brand, nav links, theme controls, avatar
  components/       Shared UI, no data: Button, Field, SearchInput, Avatar, InlineError, Skeleton, EmptyState, SpotIcon
  lib/              format.ts (display text), money.ts (money rules), demoParams.ts (demo URL hooks)
  mocks/            MSW browser worker over the given mock-api handlers
  test/             MSW + jsdom setup, renderApp helper
```

Each feature keeps its components, CSS Modules and tests together. Why it's laid out this way is
under [Code organisation](#code-organisation).

## Decisions and trade-offs

These are the calls the brief left to me. What the brief already fixes (TanStack Query, React Hook
Form + Zod, the copy, the breakpoints) isn't repeated here.

### Code organisation

#### Feature folders

- **Decision:** files for one feature sit together (`dashboard/`, `transfer/`, `theme/`, `header/`),
  with their CSS Modules and tests. Shared code lives in `components/`, `lib/` and `api/`.
- **Trade-off:** a flow that crosses features, such as a transfer refreshing the dashboard, connects
  through `api/` query keys rather than direct imports, so it isn't visible from one folder.
- **Justification:** changing a feature mostly touches one folder. Features import each other only to
  render one another's components (the dashboard opens `TransferDialog`); data never passes through
  those imports, so neither feature reaches into the other's state.

#### Flat feature folders

- **Decision:** no sub-folders inside a feature. The largest holds 16 files, and their names already
  group them (`*Step`, `*Panel`).
- **Trade-off:** a long folder listing.
- **Justification:** sub-folders of two or three files would add import depth without making
  anything easier to find. At around 20 components I'd split them (e.g. `transfer/steps/`,
  `transfer/panels/`).

#### Shared code only when it's shared today

- **Decision:** `lib/` has one file per kind of helper instead of a `utils` file: `format.ts` turns
  data into display text, `money.ts` holds the money rules (cents, total, remaining limit). A
  component goes in `components/` only when two places use it today: `Field` (wires label, error and
  `aria-*` ids so they can't disagree), `SearchInput` (transactions and payees), `Avatar` (header and
  payee rows). `components/` takes no data, so `Header`, which loads the customer, lives in
  `features/header/`.
- **Not shared on purpose:** the search filtering (different fields per requirement), the
  `filter(Boolean).join(' ')` class idiom (a helper wouldn't make three lines clearer), muted small
  text (two token lines), icon-only buttons (✕ and the theme toggle look different), and a general
  dialog or card component (there's one dialog, and the card is a shared class). The brief's
  suggested `PayeeOption`, `AccountCard`, `AmountField` and `ReviewSummary` would each be used once,
  so they stay inline.
- **Trade-off:** small repeats stay, e.g. both search filters trim and lowercase the query. `Field`
  takes a function as its child, which is less common than plain children.
- **Justification:** a file's name tells you where a helper lives, where a single `utils` file tends
  to grow into a grab bag nobody owns. The dashboard and dialog can't disagree on money rules.
  Extracting for imagined screens adds props before anyone needs them; extracting when a second use
  appears is a small change.

#### CSS Modules on the brief's tokens

- **Decision:** one `.module.css` per component, every value a `var(--token)`. `src/index.css` holds
  the global base (reset, focus ring, `.amount`, `.sr-only`, reduced motion).
- **Trade-off:** more files and class names than utility classes (e.g. Tailwind).
- **Justification:** class names can't clash, and Vite supports CSS Modules with no setup. The tokens
  are already CSS variables, so they're used as they are; Tailwind would need each token mapped into
  its theme, a second list to keep in sync with `design-tokens.css`.

#### Copy written inline

- **Decision:** UI text sits in the components, exactly as in §4; validation messages live with their
  rules in `transfer/schema.ts`. Not chosen: an i18n library or a central copy file.
- **Trade-off:** a second language would mean collecting the strings first.
- **Justification:** translations are out of scope (§2). Inline text can be checked against §4 by
  reading the component, and the tests type the §4 strings, so a typo can't hide behind a shared
  constant. With a second language I'd add an i18n library and move strings into message files.
  Money and date formatting already set their `en-SG` locale in one place (`lib/format.ts`).

### Server state vs UI state

- **Server data** (customer, accounts, transactions, payees) lives only in TanStack Query. Values
  derived from it (total available, remaining daily limit) are computed by `lib/money.ts` on render,
  never stored.
- **UI state** sits in the component that owns it, with `useState`: dialog open
  (`DashboardContent`), current step and discard prompt (`TransferDialog`), search text
  (`TransactionList`, `RecipientStep`). Form values live in React Hook Form.
- **Preferences** (theme, segment) live in `usePreferences`, saved to `localStorage`.

No global store: the query cache is the only state shared widely, and preferences are passed down
from `App` (see [Theming and layout](#theming-and-layout)).

### Server data

#### Money compared in cents

- **Decision:** `lib/money.ts` turns amounts into whole cents before adding or comparing them.
- **Trade-off:** every money comparison has to go through `toCents`.
- **Justification:** `4280.55 ≤ 4280.55` can't fail on floating-point rounding. A rounding slip would
  wrongly block or allow a transfer.

#### One dashboard state (D1, D7)

- **Decision:** `useDashboardData` combines the three parallel queries into
  `pending | error | success`: one skeleton, one `We couldn't load your dashboard.`, and Retry
  refetches only the requests that failed. Not chosen: a loading and error state per section.
- **Trade-off:** if one endpoint fails on first load, the whole dashboard shows the error even though
  the other two loaded.
- **Justification:** D7 asks for one dashboard error, and `New transfer` needs both the accounts and
  the customer's limit, so a half-loaded page would offer an action that can't work.

#### Refresh after a transfer (T6): invalidate, don't patch

- **Decision:** on success, invalidate `customer`, `accounts` and `transactions`; they refetch in
  parallel behind the success screen. Not chosen: patching the cache from the POST response.
- **Trade-off:** three GETs per transfer.
- **Justification:** the POST response has no transaction row, so patching the list would mean
  rebuilding it by hand, copying server logic. Invalidating everything gives one refresh path
  (shared with the 422 handler), and the dashboard updates together instead of showing a new balance
  beside a stale list. If the APIs were slow, I'd patch balance and limit from the response.

#### Search (D6) filters the 8 loaded rows in the browser

- **Decision:** filter the loaded rows. Not chosen: the API's server search (`?q=`).
- **Trade-off:** older transactions aren't searchable.
- **Justification:** instant, with no extra requests, debounce or loading state. The list is labelled
  "Recent transactions", so users don't expect full history. A full history page would use `?q=`.

#### Payees load when the dialog opens

- **Decision:** step 1 fetches payees when the dialog opens, with its own skeleton, error + Retry and
  empty states. Not chosen: prefetching them with the dashboard.
- **Trade-off:** the first open shows skeleton rows for about half a second.
- **Justification:** many visits only check balances, so a payee request on every load would often be
  wasted, and a prefetch only helps within the 30s `staleTime` anyway. If the list grew large, it
  would need server search or paging whichever component fetched it.

### Forms and validation

#### One form across all three steps

- **Decision:** one React Hook Form instance. `Continue` validates only the current step's fields
  (`trigger(STEP_FIELDS[current], { shouldFocus: true })`). Not chosen: a form per step.
- **Trade-off:** each step must list which fields it owns.
- **Justification:** `Back` keeps everything with no extra code (T4). One short array is far less than
  keeping three forms in sync for `Back` and the review.

#### Schema built from live data

- **Decision:** `makeTransferSchema({ accounts, remainingLimit })` builds the Zod schema from the
  loaded balances and limit. The same schema drives inline errors (`mode: 'onTouched'`), `Continue`
  and the final check before sending. Inputs have no `maxLength` or `pattern`.
- **Trade-off:** the schema is rebuilt on each render of the dialog, and a field accepts a 51st
  character before showing the error.
- **Justification:** building it is cheap, messages show the real numbers, and no rule exists in two
  places. A pasted long note can be shortened instead of silently cut off.

#### Field names and messages match the API

- **Decision:** form fields use the API's names (`recipient.accountNumber`, `amount`…) and wording.
- **Trade-off:** an API rename means a form rename.
- **Justification:** a server `fields` error maps straight onto `setError`, and the user reads the
  same text whichever side catches the problem.

#### API errors on send (T7)

- **Decision:** a 400/422 shows the API message in the alert and also sets the error on the field. A
  422 also refreshes balances. A 500 or network error shows the brief's copy.
- **Trade-off:** after `Back`, the same message shows in the alert and under the field.
- **Justification:** on review the alert is what the user sees; after `Back` the field says what to
  fix. Refreshing on a 422 means the form's own rules use the new numbers.

#### Close blocked while sending

- **Decision:** ✕, Back and Esc do nothing while the request runs.
- **Trade-off:** the user can't cancel a slow send.
- **Justification:** closing wouldn't stop the request, so money could move with no success screen or
  reference shown.

### Transfer dialog

#### Native `<dialog>` with `showModal()`

- **Decision:** a native modal dialog, rendered only while open. Focus moves to the step heading on
  open and on each step change. Not chosen: a dialog library.
- **Trade-off:** backdrop and animation styled by hand; jsdom needs a `showModal` stub in tests.
- **Justification:** the browser provides the focus trap, Esc and backdrop, the parts most easily got
  wrong by hand. Rendering only while open means every transfer starts with a fresh form.

#### `Discard this transfer?` panel (optional)

- **Decision:** closing a form with something entered asks first, inside the same dialog, with
  `Keep editing` focused.
- **Trade-off:** one more click to close a form you meant to abandon.
- **Justification:** losing a half-filled transfer to a stray Esc or ✕ is a real usability problem.
  An untouched dialog still closes in one click.

#### Smaller UX calls

- `Choose who to send to.` sits **above** the payee list: below it, it was off screen with many
  payees, so the user couldn't see why `Continue` did nothing.
- Picking `Send to someone new` **scrolls** its fields into view but leaves focus on the radio, since
  arrow keys change a radio group's selection and moving focus would pull keyboard users out of it.
- Review shows the wireframe's `Usually arrives in minutes.` (T4 doesn't specify it).
- Success and discard panels are centred on phones, putting the buttons nearer the thumb.

### Theming and layout

#### `usePreferences` is called once, in `App`, and passed down

- **Decision:** one hook call, with props passed one level down. Not chosen: a call per switch, or a
  context provider.
- **Trade-off:** props threaded through one level.
- **Justification:** two segment switches render (header from 640px, under the greeting on phones).
  Separate hook calls would hold separate state and could disagree after a resize.

#### Segment: saved choice, else `customer.segment`, else retail

- **Decision:** the API's segment is the default until the user picks one.
- **Trade-off:** the pre-paint script can't know the API value, so a non-retail default would flash
  once (see Known issues).
- **Justification:** the API calls it the customer's default, so a Premium customer sees Premium on
  first visit.

#### Choices are saved only when the user toggles

- **Decision:** nothing is written to `localStorage` until the user changes a toggle.
- **Trade-off:** the OS setting is read on load only.
- **Justification:** saving the OS value on first load would freeze it, so a user who never toggles
  would stop following their system.

Account cards stack one per row below 1024px rather than scrolling sideways, so no balance is hidden.

### Libraries, polish and tooling

#### Libraries added

- **Decision:** `lucide-react` for icons only; everything else is in the starter. Native elements
  (dialog, radios, select). Not chosen: a headless library (Radix, React Aria) or a styled one (MUI).
- **Trade-off:** their styling is written by hand.
- **Justification:** native elements already provide the hard behaviour (focus trap, Esc, arrow keys
  between radios). A headless library would leave all the CSS; a styled one would need every token
  mapped into its theme and its look overridden to match the wireframe.

#### Motion and icons

Empty, error and success screens get an icon in a tinted circle (`SpotIcon`). The dialog, steps and
loaded dashboard fade in, and `Sending…` gets a spinner. CSS only, motion tokens only, and reduced
motion turns it all off. Left out on purpose: a balance count-up (noisy for screen readers) and
dimming the review while sending (would break TH3 contrast).

#### Formatting and CI

Prettier (4-space indent, no semicolons, single quotes, width 90) with a matching `.editorconfig`.
`mock-api/` is in `.prettierignore` so the given files stay as shipped; the reformat commits are in
`.git-blame-ignore-revs`. GitHub Actions runs `npm run check` and `npm run build` on every PR and push
to `main`, so nothing failing reaches what Vercel deploys.

## Loading, empty and error states

The dashboard has one skeleton and one error (see [One dashboard state](#one-dashboard-state-d1-d7));
the payee list in the dialog has its own. Empty and no-results states share `EmptyState`. On the
deployed site, add these to the page URL; `lib/demoParams.ts` forwards them to the mock API:

| State              | How to trigger                                                 | What you see                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading            | `?delay=3000`                                                  | Skeleton matching the final layout (no jump), then data. Also makes `Sending…` visible.                                                                                                      |
| Dashboard error    | `?scenario=error`                                              | `We couldn't load your dashboard.` + `Retry`. Only the **first** request per endpoint fails (and auto-retry is off while a scenario is set), so `Retry` then loads the dashboard.            |
| Empty              | `?scenario=empty`                                              | `SGD 0.00` / `No deposit accounts`, `No accounts to show.` (New transfer disabled), `No transactions yet.`, and in the dialog `No saved payees yet.` with `Send to someone new` preselected. |
| No search results  | type `zzz` in the search                                       | `No transactions match your search.` + `Clear search`                                                                                                                                        |
| Balance error      | amount `5000` from Everyday Checking                           | `Amount can't be more than your available balance (SGD 4,280.55).` under the field; Continue focuses it                                                                                      |
| Daily limit error  | amount `6000` from Savings Plus                                | `This transfer exceeds your remaining daily limit (SGD 5,000.00).` under the field                                                                                                           |
| Other field errors | e.g. account number `123`, or a 51-character note              | Message under the field; Continue focuses the first one                                                                                                                                      |
| Send failure       | put `#fail` in the transfer note                               | Alert on the review step; data kept; Confirm works again                                                                                                                                     |
| Payee loading      | `?delay=3000`, then open the dialog                            | Skeleton rows in step 1                                                                                                                                                                      |
| Payee error        | `?scenario=error`, `Retry` the dashboard, then open the dialog | `We couldn't load your saved payees.` + `Retry`, with `Send to someone new` still usable; `Retry` then loads them                                                                            |

## Tests

`npm test` runs the three tests the brief asks for (E4), one send-failure test (T7), and the
starter's `format.test.ts`. They render the whole `<App />` against the real MSW handlers and use
`user-event`, so they check what a user sees, not component internals.

| Test                                                                                                                                                                                                    | Covers                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Amount over balance → exact error, focus on the field, **no POST sent** (MSW request log)                                                                                                               | E4.1                       |
| Successful transfer → `Sending…` disabled, `Transfer sent` + reference → dashboard shows the new total, account balance, limit and `Transfer to Jamie Tan` row; focus back on `New transfer`            | E4.2 (also T5, T6)         |
| Dashboard 500 (one-off `server.use`) → error → `Retry` → loaded                                                                                                                                         | E4.3                       |
| Send rejected with 422 (`server.use`: balance dropped to 100) → alert with the server message, still on review with 120, no `Transfer sent` → `Back` shows the error under Amount → lower to 100 → sent | T7, T8, §3.3 server errors |

The 422 test exists because that path can't be reached by hand: the form blocks those amounts first.
The mock rejects anything over 100, so the test only passes if lowering the amount is what makes the
retry work. Checked by hand instead: the 500 failure (`#fail` note), the validation edge cases
(exact balance vs +0.01, daily limit, `0.99`, `1.234`), text/background contrast ≥ 4.5:1 in all four
theme combinations, no sideways scroll at 360px, and tap targets ≥ 44px. Schema unit tests would
mostly restate the rules, so I left them out.

Money assertions use `money()` (`test/renderApp.tsx`): `formatMoney` with the non-breaking space
normalised the way Testing Library normalises page text.

## AI use

**Tool:** Claude Code (Claude Opus 5.5), in the terminal, inside this repo.

- **Planning.** In plan mode with Matt Pocock's `grill-me` skill, Claude read the brief, contract,
  wireframe and starter, then asked me the design decisions in rounds with options and a
  recommendation. I made the calls, and approved the written plan before any code was written.
- **Building.** Claude wrote the code, tests, CI and a first draft of this README, raising each change
  as a PR that I reviewed and edited before merging. It checked its work with `npm run check`,
  `npm run build` and headless Chrome (screenshots, focus, console errors, narrow widths, themes).
- **Me.** I own the decisions above, deployed to Vercel, and read the code so I can explain and
  change it.

**Three places I changed, rejected or fixed what it produced:**

1. **Fixed: wrong error on the recipient step.** With nobody selected, blurring the list
   showed Zod's `Invalid input: expected string, received null` instead of `Choose who to send to.`,
   because an unchecked radio group reads as `null`, not `''`. The schema now accepts `null` and
   treats it like `''`.
2. **Changed: `Send to someone new`.** With several payees, its fields opened off screen with no sign
   they'd appeared. Claude laid out the options, including moving focus into `Recipient name`; I
   chose scroll-only, because arrow keys change a radio group's selection, so moving focus would
   pull keyboard users out of the list just by passing over the option.
3. **Fixed: `New transfer` drew over the header.** Scrolling on desktop, the button in
   the balance card showed on top of the sticky header. The phone styles give it
   `z-index: var(--z-header)` so it floats above the page; from 640px it becomes `position: static`,
   but the z-index was never reset. A flex item honours `z-index` even when static, so it tied with
   the header and won by coming later in the page. Reset to `z-index: auto` from 640px (D8).

## Not done / known issues

### Known issues

- **Idle app can't reach the mock API.** Leave the deployed app idle for a while and the payee list
  fails to load in the dialog, and Retry doesn't help. The browser stops the idle MSW service worker;
  on restart it has forgotten this page, so `/api` requests go to Vercel, which has no API. Reload to
  fix. Sending a transfer would fail the same way.
- **Overscroll strip above the header.** With bounce scrolling (Safari, Chrome on macOS), pulling
  down past the top shows the page background (`--bg`) above the `--surface` header.
  `overscroll-behavior-y: none` would hide it but also turns off pull-to-refresh on mobile, so it's
  left as is.
- The OS theme is read on first load only, so changing it later needs a reload.
- A `premium` API default with nothing saved would paint retail first, then switch. For Ava it's
  retail, so there's no flash.
- In Chrome, pressing Esc twice quickly on the discard prompt can close the dialog (the browser stops
  pages from blocking repeated Esc). State stays in sync because everything listens to the dialog's
  `close` event.

### Not built (optional)

Debug menu (URL params instead), balance-hide toggle, third segment, `#transfer` deep link, the
wireframe's date line and `Make another transfer`.

### With more time

1. Detect the idle mock-worker failure and re-register the worker (or ask the user to reload).
2. An end-to-end test against the deployed site, which would have caught that.
3. Per-section loading and error states on the dashboard, and patching balance and limit from the
   POST response if the APIs prove slow.
4. Follow live OS theme changes until the user picks one, and server search for a full history page.
