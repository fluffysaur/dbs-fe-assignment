# Meridian Banking — Tan Yi Jia

- Deployed: [dbs-fe-assignment-tanyijia.vercel.app](https://dbs-fe-assignment-tanyijia.vercel.app/)
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
  components/       Shared UI: Header, Button, Field, InlineError, Skeleton, EmptyState, SpotIcon
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

- **Decision:** files for one feature sit together (`dashboard/`, `transfer/`, `theme/`), with their
  CSS Modules and tests. Shared code lives in `components/`, `lib/` and `api/`.
- **Trade-off:** a flow that crosses features, such as a transfer refreshing the dashboard, connects
  through `api/` query keys rather than direct imports, so it isn't visible from one folder.
- **Justification:** changing a feature mostly touches one folder. The transfer refresh is the only
  cross-feature link, and going through query keys means neither feature imports the other. The same
  idea scales up to micro-frontends, where each feature becomes its own separately deployed app;
  keeping features self-contained keeps that option open.

#### Flat feature folders

- **Decision:** no sub-folders inside a feature. The largest holds 16 files, and their names already
  group them (`*Step`, `*Panel`).
- **Trade-off:** a long folder listing.
- **Justification:** sub-folders of two or three files would add import depth without making
  anything easier to find. At around 20 components I'd split them (e.g. `transfer/steps/`,
  `transfer/panels/`).

#### Shared helpers grouped by what they do

- **Decision:** one file per kind of helper rather than a general `utils` file. `format.ts` turns
  data into display text (`formatMoney`, `formatShortDate`, `maskAccountNumber`). `money.ts` holds
  the money rules (cents, total available, remaining limit). A helper used by only one feature stays
  in that feature, e.g. the amount pattern in `transfer/schema.ts`.
- **Trade-off:** more files and imports than one `utils.ts`, and when a second feature needs a
  feature-local helper, it has to move to `lib/`.
- **Justification:** each file has one job, so its name tells you where a helper lives, and a single
  `utils` file tends to grow into a grab bag nobody owns. Every screen formats data the same way,
  and the dashboard and the dialog can't disagree on money rules. Moving a helper happens once, when
  the need is real, and until then `lib/` holds only code that's truly shared.

#### CSS Modules on the brief's tokens

- **Decision:** one `.module.css` per component, every value a `var(--token)`. `src/index.css` holds
  the global base: reset, focus ring, `.amount` (tabular numbers), `.sr-only` and reduced motion.
- **Trade-off:** more files and class names than utility classes (e.g. Tailwind).
- **Justification:** class names can't clash, styles sit next to their component, and states such as
  `[data-over]`, media queries and keyframes read as plain CSS. Vite supports CSS Modules with no
  setup, and the brief's tokens are already CSS variables, so they're used as they are. Tailwind
  would also work, but it's a new dependency, and each token would need mapping into its theme
  (a second list of names to keep in sync with `design-tokens.css`) or long classes like
  `bg-[var(--surface)]`.

### Server data

#### Money compared in cents

- **Decision:** `lib/money.ts` turns amounts into whole cents before adding or comparing them.
- **Trade-off:** every money comparison has to go through `toCents`.
- **Justification:** `4280.55 ≤ 4280.55` can't fail on floating-point rounding. A rounding slip would
  wrongly block or allow a transfer, and the helpers in `money.ts` keep those calls in one place.

#### One dashboard state (D1, D7)

- **Decision:** `useDashboardData` combines the three parallel queries into
  `pending | error | success`: one skeleton, one `We couldn't load your dashboard.`, and Retry
  refetches only the requests that failed. A query that fails but still has data, such as a
  background refetch, keeps showing its data. Not chosen: a loading and error state per section.
- **Trade-off:** if one endpoint fails on first load, the whole dashboard shows the error even though
  the other two loaded.
- **Justification:** D7 asks for one dashboard error, and `New transfer` needs both the accounts and
  the customer's limit, so a half-loaded page would offer an action that can't work. One error with
  Retry is clearer.

#### Refresh after a transfer (T6): invalidate, don't patch

- **Decision:** on success, invalidate `customer`, `accounts` and `transactions`; they refetch in
  parallel behind the success screen. Not chosen: patching the cache from the POST response.
- **Trade-off:** three GETs per transfer, which assumes the calls are cheap and the server is fast.
- **Justification:** the POST response has no transaction row, so patching the list would mean
  rebuilding it by hand (id, description, category, status), copying server logic. Balance and limit
  could be patched safely (mapping `dailyLimit.used` → `customer.transferredToday`), but invalidating
  them too gives one refresh path, shared with the 422 handler, and the dashboard updates together
  instead of showing a new balance beside a list that hasn't caught up. The refetch runs behind the
  success screen, so the user doesn't wait on it. If the APIs were slow, patching balance and limit
  would save two calls, at the cost of more code and per-section loading states. The cleaner
  long-term fix is a POST response that returns the full updated resources to patch in.

#### Search (D6) filters the 8 loaded rows in the browser

- **Decision:** filter the loaded rows. Not chosen: the API's server search (`?q=`).
- **Trade-off:** older transactions aren't searchable.
- **Justification:** it's instant, with no extra requests, debounce or loading state. The list is
  labelled "Recent transactions", so users don't expect it to cover their full history. Server
  search would be the next step for a full history page.

#### Payees load when the dialog opens

- **Decision:** step 1 fetches payees when the dialog opens, with its own skeleton, error + Retry
  and empty states. Not chosen: prefetching them when the dashboard loads.
- **Trade-off:** the first open shows skeleton rows for about half a second.
- **Justification:** most visits may only check balances, so a payee request on every dashboard load
  would often be wasted. A prefetch also only helps if the dialog opens within the 30s `staleTime`;
  after that, the dialog fetches again anyway. If the list grew large, it would need server search
  or paging whichever component fetched it.

### Forms and validation

#### One form across all three steps

- **Decision:** one React Hook Form instance. `Continue` validates only the current step's fields
  (`trigger(stepFields, { shouldFocus: true })`). Not chosen: a separate form per step.
- **Trade-off:** the form holds fields for steps the user hasn't reached yet, so each step must list
  which fields it owns.
- **Justification:** `Back` keeps everything with no extra code (T4), even after picking a different
  recipient on step 1. The step list is one short array (`STEP_FIELDS`), far less than keeping three
  forms in sync for `Back` and the review.

#### Schema built from live data

- **Decision:** `makeTransferSchema({ accounts, remainingLimit })` in `transfer/schema.ts` builds the
  Zod schema from the loaded balances and limit. Length limits are named constants, and their
  messages are built from them. The same schema drives inline errors (`mode: 'onTouched'`),
  `Continue` and the final check before sending.
- **Trade-off:** the schema is a function, not a constant, so it's rebuilt on each render of the
  dialog.
- **Justification:** building it is cheap. The messages show real numbers, the balance and limit
  rules always use the numbers on screen with no second copy of them, and changing a length limit
  updates the rule, the message and the note counter together.

#### No `maxLength` or `pattern` on inputs

- **Decision:** length and format rules live only in the schema.
- **Trade-off:** the field accepts a 51st character and only then shows the error.
- **Justification:** no rule exists in two places. And if the user pastes a longer note, they can
  shorten it rather than have the end silently cut off.

#### Field names and messages match the API

- **Decision:** form fields use the API's names (`recipient.accountNumber`, `amount`…), and messages
  reuse the API's wording.
- **Trade-off:** the form's shape follows the API, so an API rename means a form rename.
- **Justification:** a server `fields` error maps straight onto `setError`, with no name mapping to
  keep in sync, and the user reads the same text whichever side catches the problem.

#### API errors on send (T7)

- **Decision:** a 400/422 shows the API message plus the field message in the alert, and also sets
  the error on the field. A 422 also refreshes balances. A 500 or network error shows the brief's
  copy.
- **Trade-off:** after `Back`, the same message shows in two places: the alert and the field.
- **Justification:** on review, the alert is what the user sees; after `Back`, the field error says
  what to fix. Refreshing on a 422 lets the form's own rules use the new numbers, so the user isn't
  stuck resending an amount that's no longer allowed.

#### Close blocked while sending

- **Decision:** ✕, Back and Esc do nothing while the request runs.
- **Trade-off:** the user can't cancel a slow send.
- **Justification:** closing wouldn't stop the request, so the money could move with the dialog gone
  and no success screen or reference shown. Keeping the dialog open means the user always sees the
  outcome.

### Transfer dialog

#### Native `<dialog>` with `showModal()`

- **Decision:** a native modal dialog, rendered only while open. On open and on each step change,
  focus moves to the step heading. Not chosen: a dialog library.
- **Trade-off:** the backdrop and open animation are styled by hand, and jsdom needs a `showModal`
  stub in tests.
- **Justification:** the browser provides the focus trap, Esc and backdrop, which are the parts most
  easily got wrong by hand, with no library to add. Rendering only while open means every transfer
  starts with a fresh form, and focusing the heading makes screen readers announce each step.

#### `Discard this transfer?` panel (optional)

- **Decision:** closing a half-filled (dirty) form asks first, inside the same dialog, with
  `Keep editing` focused. On phones the prompt is centred in the sheet.
- **Trade-off:** one more click to close a form you meant to abandon.
- **Justification:** losing a half-filled transfer to a stray Esc or ✕ is a real usability problem.
  The prompt only appears once something has been entered, so closing an untouched dialog is still
  one click. Centred, it reads as a confirmation rather than an empty page, and its buttons sit
  mid-screen, closer to the thumb than the top. The success panel is centred the same way.

#### Recipient error above the payee list

- **Decision:** `Choose who to send to.` sits above the list, linked to it with `aria-describedby`.
- **Trade-off:** the error sits between the search box and the list rather than next to `Continue`.
- **Justification:** below the list, it was off screen after `Continue` when there were many payees,
  so the user couldn't see why they were stuck. Above the list, it's read first when the step
  doesn't move on.

#### Picking `Send to someone new` scrolls its fields into view

- **Decision:** the dialog scrolls just far enough to show all three fields, smoothly unless the user
  prefers reduced motion. It only scrolls when the user picks the option: not when it's preselected
  because there are no saved payees, and not when coming `Back`. Focus stays on the radio. Not
  chosen: moving focus into `Recipient name`.
- **Trade-off:** the view moves without the user asking it to scroll.
- **Justification:** with several payees the fields open off screen, with no sign they appeared. The
  scroll only happens right after the user's own click, and only as far as needed, so it reads as
  the result of that click. Focus stays put because arrow keys change the selection in a radio
  group, so moving focus would pull keyboard users out of the list just by passing over the option.

#### Arrival line on review follows the wireframe

- **Decision:** `Usually arrives in minutes.` with an info icon under the review summary, as in the
  wireframe.
- **Trade-off:** it repeats the success screen's `The money should arrive within minutes.`
- **Justification:** the brief doesn't list it for T4, so I followed the wireframe's copy. The two
  lines do different jobs: one sets expectations before sending, the other confirms after.

### Theming and layout

#### `usePreferences` is called once, in `App`, and passed down

- **Decision:** one hook call, with props passed one level down. Not chosen: each switch calling the
  hook, or a context provider.
- **Trade-off:** props threaded through one level of components.
- **Justification:** two segment switches are rendered (header from 640px, under the greeting on
  phones). If each called the hook, each would have its own state, and they could disagree after a
  resize. One level of props is simpler than a provider for two consumers; a provider would be the
  next step if it went deeper.

#### Segment = saved choice, else `customer.segment` from the API, else retail

- **Decision:** the API's segment is the default until the user picks one.
- **Trade-off:** the pre-paint script can't know the API value, so a non-retail default would flash
  once (see Known issues).
- **Justification:** the API calls it the customer's default, so a Premium customer sees Premium on
  their first visit. The flash can happen only on that first visit.

#### Choices are saved only when the user toggles

- **Decision:** nothing is written to `localStorage` until the user changes a toggle.
- **Trade-off:** the system setting is read on load only, so changing it later needs a reload.
- **Justification:** a first-time visitor keeps following their system theme. Saving the system value
  on first load would freeze it, so a user who never toggles would stop following their system at
  all.

#### Account cards stack below 1024px

- **Decision:** one card per row on smaller screens. Not chosen: a sideways-scrolling row.
- **Trade-off:** a longer page on phones.
- **Justification:** balances are the main thing on the page, and a sideways row hides cards with no
  clear sign they're there.

### Polish, libraries and tooling

#### Motion and icons

- **Decision:** empty, error and success screens get an icon in a tinted circle (`SpotIcon`). The
  dialog, each step and the loaded dashboard fade in, the success circle pops in, and `Sending…`
  gets a spinner. All CSS, motion tokens only, `opacity`/`transform` only, each plays once. Left out
  on purpose: a balance count-up (noisy for screen readers) and dimming the review while sending
  (lower text contrast would break TH3).
- **Trade-off:** a little more CSS to maintain.
- **Justification:** the brief suggests `lucide-react` (§5), and the tokens ship motion durations,
  easing and a reduced-motion rule, so this uses what's provided. It's one small component and a few
  keyframes with no library, it makes state changes easier to follow, and reduced motion turns it
  all off.

#### Libraries added

- **Decision:** `lucide-react` for icons only; everything else is in the starter. Native elements
  (dialog, radios, select). Not chosen: a headless library (Radix, React Aria) or a styled one (MUI,
  Mantine).
- **Trade-off:** their styling is written by hand.
- **Justification:** the native elements already provide the hard behaviour (focus trap, Esc, arrow
  keys between radios) and behave the way users and screen readers expect. A headless library would
  replace that behaviour but leave all the CSS. A styled one would cut some CSS, but every brief
  token would need mapping into its theme, and its look overriding to match the wireframe, which is
  more to maintain and explain, not less.

#### Formatting

- **Decision:** Prettier (4-space indent, no semicolons, single quotes, trailing commas, width 90)
  with a matching `.editorconfig`. `mock-api/` stays at 2 spaces, and Markdown at 2. The reformat
  commits are listed in `.git-blame-ignore-revs`.
- **Trade-off:** two whole-repo reformats in the history.
- **Justification:** 4 spaces is what I've used in past work, and it reads well in nested JSX.
  `mock-api/` keeps its own style so the given files are untouched, and Markdown matches list
  linting. Both reformats were done before review, and the blame-ignore file means `git blame` still
  shows who wrote each line.

#### CI (optional, §2)

- **Decision:** GitHub Actions runs `npm run check` (lint, format, typecheck, tests) and
  `npm run build` on every pull request and every push to `main`, with Node from `.nvmrc`.
- **Trade-off:** each PR waits about a minute for CI.
- **Justification:** nothing unformatted, failing or unbuildable reaches `main`, which is what the
  deployed site builds from.

## What I'd change with more time

1. Fix the idle mock-worker failure (see Known issues): detect it and re-register the worker, or ask
   the user to reload.
2. An end-to-end test against the deployed site, which would have caught (1).
3. `Make another transfer` (wireframe, optional), with step 2 waiting for the refreshed balance and
   limit.
4. Per-section loading and error states on the dashboard, and patching balance and limit from the
   POST response if the APIs prove slow.
5. Find a fix for the overscroll strip above the header (see Known issues) that keeps
   pull-to-refresh on mobile.
6. Follow live OS theme changes until the user picks one.
7. Server search for a full transaction history page.

## Loading, empty and error states

On the deployed site, add these to the page URL. `lib/demoParams.ts` forwards them to the mock API:

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
`user-event`, so they check what a user sees, not component internals. `npm run check` and
`npm run build` both run in CI.

| Test                                                                                                                                                                                                    | Covers                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Amount over balance → exact error, focus on the field, **no POST sent** (MSW request log)                                                                                                               | E4.1                       |
| Successful transfer → `Sending…` disabled, `Transfer sent` + reference → dashboard shows the new total, account balance, limit and `Transfer to Jamie Tan` row; focus back on `New transfer`            | E4.2 (also T5, T6)         |
| Dashboard 500 (one-off `server.use`) → error → `Retry` → loaded                                                                                                                                         | E4.3                       |
| Send rejected with 422 (`server.use`: balance dropped to 100) → alert with the server message, still on review with 120, no `Transfer sent` → `Back` shows the error under Amount → lower to 100 → sent | T7, T8, §3.3 server errors |

The 422 test mocks the server because that path can't be reached by hand: the form blocks those
amounts first. The mock rejects anything over 100, so the test only passes if lowering the amount is
what makes the retry work. Checked by hand in the browser instead: the 500 failure (`#fail` note)
and the validation edge cases (exact balance vs +0.01, daily limit, `0.99`, `1.234`) with the demo
hooks above. Schema unit tests would mostly restate the rules, so I left them out. Also by hand:
every text/background token pair at ≥ 4.5:1 in all four theme combinations; no sideways scroll at
360px and 390px; tap targets ≥ 44px.

Test notes:

- Mock responses take ~500 ms, so the async query timeout is 3 s.
- Money assertions use `money()` (`test/renderApp.tsx`), which is `formatMoney` with the non-breaking
  space normalised the way Testing Library normalises page text.
- jsdom has no `showModal`, so `test/setup.ts` stubs it.

## AI use

**Tool:** Claude Code (Claude Opus 5.5), in the terminal, inside this repo.

**How it was used:**

- **Planning.** I ran Claude in plan mode with Matt Pocock's `grill-me` skill. It read the brief, API
  contract, wireframe, tokens and starter code, then asked me the design decisions in rounds, each
  with options, trade-offs and a recommendation. I made the calls. Some areas I departed or pushed
  back:
  - I added the optional **`Discard this transfer?` confirmation**, which it had suggested skipping to
    keep scope small.
  - I stopped a round to ask for more detail on **search (local vs `?q=`)**, **post-transfer refresh**
    (invalidate vs cache write) and **form structure** before deciding, and chose what I felt was best
    (see Decisions).
  - The result was a written plan (decisions, file layout, build order, test list) that I reviewed
    and approved before any code was written.
- **Implementation.** Claude wrote the code, tests, CI workflow and a first draft of this README,
  following that plan. It raised each change as a Pull Request, which I reviewed, making edits where
  necessary before merging. It checked its own work with `npm run check` and `npm run build`, and
  drove the running app in headless Chrome (screenshots, focus checks, console errors, layout at
  360/390px, all four theme combinations). It also computed token contrast ratios.
- **Me.** I own the decisions above, deployed to Vercel, and read the code so I can explain and
  change it.

**Places where the AI's output was wrong and had to be fixed:**

- **Money assertions failed.** The first tests searched for `formatMoney(...)`. Testing Library turns
  the non-breaking space after `SGD` into a normal space in page text, but not in the search string,
  so nothing matched. Fixed with the `money()` test helper. The same tests also failed because
  rendered output piled up between tests (Vitest globals are off, so Testing Library can't clean up
  by itself). Fixed with an explicit `cleanup()` in `test/setup.ts`.
- **Desktop dialog stretched to full screen height.** It used `height: auto`, which on a modal
  `<dialog>` (pinned top and bottom) stretches instead of fitting. Changed to `height: fit-content`.
- **Sideways scroll at 360px.** Single-column grids defaulted to `auto` tracks, which grew to fit the
  longest (non-wrapping) transaction name. Changed to `minmax(0, 1fr)` so names truncate.
- **Skeleton didn't match the loaded page** (rows 54px vs 70px, account cards and the limit card were
  shorter), so the layout jumped when data arrived (D1). Measured both, then set fixed row/card
  heights and real line heights on the placeholders.
- **Wrong error on the recipient step** (found by me). With nobody selected, `Choose who to send to.`
  switched to Zod's `Invalid input: expected string, received null` on blur, because an unchecked
  radio group reads as `null`, not `''`. Fixed by allowing `null` in the schema and treating it like
  `''`.
- **Desktop `New transfer` drew over the header** (found by me). The desktop styles reset the button's
  phone positioning but not its `z-index: var(--z-header)`, so it tied with the sticky header and
  won. Reset to `z-index: auto` on desktop (D8).

**Changes I drove after the first build** (reasons under Decisions):

- Motion and icons.
- Scrolling the new-recipient fields into view (Claude laid out the options; I chose scroll-only).
- Moving the recipient error above the payee list.
- Loading payees when the dialog opens instead of prefetching them.
- Centring the success and discard panels on phones.
- Following the wireframe's arrival line on review.
- Validation limits as named constants, and the amount pattern moved into the schema.
- Building, then removing, `Make another transfer`. It's only in the wireframe, not the brief's
  scope (§2), and I didn't have time to refine it.
- Formatting and CI setup.

## Not done / known issues

- Not built (optional): debug menu (URL params instead), balance-hide toggle, third segment,
  `#transfer` deep link, end-to-end test, the wireframe's date line and `Make another transfer`.
- **Idle app can't reach the mock API.** Leave the deployed app idle for a while and the payee list
  fails to load in the dialog, and Retry doesn't help. The browser stops the idle MSW service worker;
  on restart it has forgotten this page, so `/api` requests go to Vercel, which has no API. Reload to
  fix. Sending a transfer would fail the same way.
- **Overscroll strip above the header.** In browsers with bounce scrolling (e.g. Safari, and Chrome
  on macOS), pulling down past the top shows a strip of the page background (`--bg`) above the
  header, which is `--surface`. `overscroll-behavior-y: none` would hide it, but it also turns off
  pull-to-refresh on mobile, which I'd rather keep, so it's left as is.
- The OS theme is read on first load only. Changing it later doesn't update the app unless the user
  hasn't picked one and reloads.
- If the API's default segment were `premium` and nothing was saved, the page would paint retail
  first and then switch once the customer loads (the pre-paint script can't know the API value). For
  Ava it's retail, so there's no flash.
- In Chrome, pressing Esc twice quickly on the discard prompt can close the dialog (the browser stops
  pages from blocking repeated Esc). State stays in sync because everything listens to the dialog's
  `close` event.
- Data resets on reload (in-memory mock API), as expected.
