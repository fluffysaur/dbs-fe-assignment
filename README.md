# Meridian Banking — Tan Yi Jia

- Deployed: [dbs-fe-assignment-tanyijia.vercel.app](https://dbs-fe-assignment-tanyijia.vercel.app/)
- Run locally: `npm install && npm run dev`
- Checks: `npm run check` (lint + format + typecheck + tests) and `npm run build`. Both also run in GitHub Actions (`.github/workflows/ci.yml`).

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
  components/       Shared UI: Header, Button, Field, InlineError, Skeleton, EmptyState
  lib/              format.ts (given), money.ts (cents, masking), demoParams.ts (demo URL hooks)
  test/             MSW + jsdom setup, renderApp helper
```

Code is grouped by feature, so tracing a flow stays inside one folder plus `api/`. For example, from
`Confirm transfer` to the new balance: `TransferDialog.send` → `useCreateTransfer` (`api/transfers.ts`)
→ `onSuccess` invalidates customer/accounts/transactions → `useDashboardData` refetches → the dashboard
re-renders behind the success screen.

Styling uses CSS Modules (one `.module.css` per component) on top of `brief/design-tokens.css`.
`src/index.css` holds the global base: reset, focus ring, `.amount` (tabular numbers), `.sr-only` and reduced motion.

## Decisions and trade-offs

**Server state vs UI state.** All API data lives in TanStack Query. Nothing is copied into `useState`.
Totals are calculated during render: total available = deposit accounts only (D3), remaining limit =
limit − transferred today. They're compared in cents (`lib/money.ts`) so `4280.55 ≤ 4280.55` can't fail
on floating-point rounding. Local state covers only UI concerns: the search text, the dialog's step,
whether the dialog is open, and the discard prompt.

- **One dashboard state (D1, D7).** `useDashboardData` runs the three queries in parallel and combines
  them into `pending | error | success`. That gives one skeleton and one `We couldn't load your dashboard.` with Retry, which refetches only the failed requests. A query that fails but still has
  data, such as a background refetch after a transfer, keeps showing its data instead of replacing the
  page with the error.
- **Refresh after a transfer (T6): invalidate, don't patch.** On success I invalidate `customer`,
  `accounts` and `transactions`. The dashboard is still mounted, so they refetch at once behind the
  success screen. Patching the cache from the response would have meant building the new transaction
  row by hand, which copies server logic. The server stays the only source of truth.
- **Search (D6) filters the 8 loaded rows in the browser.** It's instant, with no extra requests,
  debounce or loading state. Trade-off: older transactions aren't searchable, which fits a "Recent
  transactions" list. Server search (`?q=`) would be the next step for a full history page.
- **Payees are prefetched** when the dashboard loads (`usePrefetchQuery`), so the dialog usually opens
  ready. The step still has its own loading, error + Retry and empty states.

**Forms and validation (§3.3, E3).** One React Hook Form instance spans all three steps, so `Back`
keeps everything with no extra code. Every rule is defined once, in `features/transfer/schema.ts`:
`makeTransferSchema({ accounts, remainingLimit })` builds the Zod schema from live data, so the balance
and limit messages show real numbers. The same schema drives:

- inline errors (`mode: 'onTouched'`: checked on blur, then re-checked while typing);
- `Continue`, which calls `trigger(stepFields, { shouldFocus: true })` and focuses the first invalid field;
- the final check before sending.

Inputs have no `maxLength` or `pattern` attributes, so no rule exists in two places. Form field names
match the API's (`recipient.accountNumber`, `amount`…), so a server `fields` error maps straight onto
`setError`. Messages reuse the API's wording, so the user reads the same text whichever side catches it.

**Send failures (T7).** The dialog stays on review with the data intact. 500s and network errors show
the brief's copy in a `role="alert"`. A 400/422 shows the API message plus the field message in the
alert, and also sets the error on the field, so `Back` shows it there. A 422 also refreshes balances, so
the form's own rules catch up. `Confirm transfer` is disabled and reads `Sending…` while the request
runs, and ✕/Back/Esc are blocked so a transfer can't be lost mid-flight.

**Dialog.** A native `<dialog>` opened with `showModal()`. The browser provides the focus trap, Esc and
backdrop. It's rendered only while open, so every transfer starts with a fresh form. On open and on each
step change, focus moves to the step heading so screen readers announce it. On close, focus returns to
`New transfer`. Closing a half-filled form shows `Discard this transfer?` inside the same dialog.

- Centred at 520px from 1024px; a full-screen sheet below that.
- Gotcha: the effect calls `showModal()` and never `close()` on cleanup, because React StrictMode would
  run that cleanup and immediately close the dialog.

**Theming (TH1–TH3).**

- An inline script in `index.html` sets `data-theme` (saved choice, else the system setting) and the
  saved `data-segment` before first paint, so a reload never flashes the wrong theme.
- `usePreferences` takes over from there.
- Segment = saved choice, else `customer.segment` from the API (the API calls it her default), else retail.
- Choices are saved only when the user toggles.
- Components use token variables only; the one literal colour is in the static favicon.
- I checked every text/background token pair the app uses: all ≥ 4.5:1 in the four combinations.

**Layout (D8, §5).** One column below 1024px with stacked account cards (no hidden sideways-scrolling
row). Below 640px, `New transfer` is fixed at the bottom above the safe area, and the segment switch moves
under the greeting. Every tap target is ≥ 44px. Verified no sideways scroll at 360px and 390px.

**Motion and illustrations.** A deliberate, small layer of polish to make the app feel finished without
much extra code. Empty, error and success screens get a lucide icon in a tinted circle (`SpotIcon`, one
token pair per tone). The dialog, each step and the loaded dashboard fade in, the success circle pops in,
and `Sending…` gets a spinner. All CSS, existing motion tokens only, `opacity`/`transform` only, each plays
once, and the reduced-motion rule turns them off. Left out on purpose: a balance count-up (noisy for screen
readers), a separate sending screen (T5/T7 keep the user on review with the `Sending…` button) and dimming
the review while sending (lower text contrast would break TH3).

**Libraries added.** `lucide-react` for icons only. Everything else is in the starter. Native elements
(dialog, radios, select) rather than a component library, since they're accessible by default and
there's less to explain.

**What I'd change with more time.** A `Make another transfer` button; an end-to-end test against the
deployed site; follow live OS theme changes until the user picks one; server-side search for a full
history view.

## Loading, empty and error states

On the deployed site, add these to the page URL. `lib/demoParams.ts` forwards them to the mock API:

| State             | URL                                                                  | What you see                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `?delay=3000`                                                        | Skeleton matching the final layout (no jump), then data. Also makes `Sending…` visible.                                                                                                      |
| Dashboard error   | `?scenario=error`                                                    | `We couldn't load your dashboard.` + `Retry`. Only the **first** request per endpoint fails (and auto-retry is off while a scenario is set), so `Retry` then loads the dashboard.            |
| Empty             | `?scenario=empty`                                                    | `SGD 0.00` / `No deposit accounts`, `No accounts to show.` (New transfer disabled), `No transactions yet.`, and in the dialog `No saved payees yet.` with `Send to someone new` preselected. |
| No search results | type `zzz` in the search                                             | `No transactions match your search.` + `Clear search`                                                                                                                                        |
| Field errors      | e.g. amount `5000` from checking, or account number `123`            | Message under the field; Continue focuses it                                                                                                                                                 |
| Send failure      | put `#fail` in the transfer note                                     | Alert on the review step; data kept; Confirm works again                                                                                                                                     |
| Payee loading     | `?delay=3000`, then open the dialog as soon as the dashboard appears | Skeleton rows in step 1                                                                                                                                                                      |

The payee error state (`We couldn't load your saved payees.` + Retry, with `Send to someone new` still
usable) isn't reachable from the URL. The one-off `?scenario=error` hits the background prefetch, and
the dialog refetches when it opens.

## Tests

`npm test`: 17 tests. The integration tests render the whole `<App />` against the real MSW handlers
and use `user-event`, so they check what a user sees, not component internals.

| Test                                                                                                                                                                                                      | Why                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Amount over balance → exact error, focus on the field, **no POST sent** (MSW request log)                                                                                                                 | Required (E4.1). Shows the client rule blocks the request.                                                                         |
| Successful transfer → `Sending…` disabled, `Transfer sent` + reference → dashboard shows the new total, account balance, limit and `Transfer to Jamie Tan` row; focus back on `New transfer`              | Required (E4.2). Covers T5, T6 and the cache refresh end to end.                                                                   |
| Dashboard 500 (one-off `server.use`) → error → `Retry` → loaded                                                                                                                                           | Required (E4.3).                                                                                                                   |
| Note `#fail` → alert with the brief's copy, still on review, data shown, Confirm enabled, no success                                                                                                      | T7: "never show success after a failure".                                                                                          |
| Search by category (`DINING`), no-match state, `Clear search` restores 8 rows                                                                                                                             | D6.                                                                                                                                |
| `schema.test.ts`: amount format, min 1.00, 2 decimals, **exact balance passes / +0.01 fails**, daily limit, note length, payee/new recipient rules, and a recipient error while the amount is still empty | Fast checks of every rule, including the cents edge case and the cross-field case (step 1 is checked while step 2 is still blank). |

Test notes:

- Mock responses take ~500 ms, so the async query timeout is 3 s.
- Money assertions use `money()` (`test/renderApp.tsx`), which is `formatMoney` with the non-breaking
  space normalised the way Testing Library normalises page text.
- jsdom has no `showModal`, so `test/setup.ts` stubs it.

## AI use

**Tool:** Claude Code (Claude Opus 5.5), in the terminal, inside this repo.

**How it was used:**

- **Planning.** I ran Claude in plan mode with a "grill me" skill. It read the brief, API contract,
  wireframe, tokens and starter code, then asked me the design decisions in rounds, each with options,
  trade-offs and a recommendation. I made the calls; most matched its recommendations. Where I
  departed or pushed back:
    - I added the optional **`Discard this transfer?` confirmation**, which it had suggested skipping to
      keep scope small, because losing a half-filled transfer to a stray Esc or ✕ is a real usability problem.
    - I stopped a round to ask for more detail on **search (local vs `?q=`)**, **post-transfer refresh**
      (invalidate vs cache write) and **form structure** before deciding. In each case I chose the simpler
      option I could explain: local filter, invalidate, one form with one schema.
    - The result was a written plan (decisions, file layout, build order, test list) that I approved
      before any code was written.
- **Implementation.** Claude wrote the code, tests, CI workflow and a first draft of this README,
  following that plan, one commit per slice. It checked its own work with `npm run check` and
  `npm run build`, and drove the running app in headless Chrome (screenshots, focus checks, console
  errors, layout at 360/390px, all four theme combinations). It also computed token contrast ratios.
- **Me.** I own the decisions above, deployed to Vercel, and read the code so I can explain and change
  it. I'm adding my own fixes below as I find them.

**Places where the AI's output was wrong and had to be fixed.** These were caught during the build,
mostly by the tests and the browser checks, not by the first draft being right:

- **Money assertions failed.** The first tests searched for `formatMoney(...)`. Testing Library turns the
  non-breaking space after `SGD` into a normal space in page text, but not in the search string, so
  nothing matched. Fixed with the `money()` test helper. The same tests also failed because rendered
  output piled up between tests (Vitest globals are off, so Testing Library can't clean up by itself).
  Fixed with an explicit `cleanup()` in `test/setup.ts`.
- **Desktop dialog stretched to full screen height.** It used `height: auto`, which on a modal
  `<dialog>` (pinned top and bottom) stretches instead of fitting. Changed to `height: fit-content`.
- **Sideways scroll at 360px.** Single-column grids defaulted to `auto` tracks, which grew to fit the
  longest (non-wrapping) transaction name. Changed to `minmax(0, 1fr)` so names truncate.
- **Skeleton didn't match the loaded page** (rows 54px vs 70px, account cards and the limit card were
  shorter), so the layout jumped when data arrived (D1). Measured both, then set fixed row/card
  heights and real line heights on the placeholders.
- **An incorrect README claim.** The first draft said `?scenario=error` shows the payee error state in
  the dialog. It doesn't: only the background prefetch fails, and the dialog refetches when it opens.
  The claim was corrected.
- **Wrong error on the recipient step.** Pressing `Continue` with nobody selected first showed
  `Choose who to send to.`, then switched to Zod's `Invalid input: expected string, received null`.
  `Continue` focuses the first radio; when it loses focus, React Hook Form re-checks the field, and a radio
  group with nothing checked reads as `null`, not `''`. The schema had `payeeId` as `z.string()`, so it
  rejected the `null` with Zod's default message. Fixed by allowing `null` in the schema and treating it
  the same as `''` (a regression test covers it). I found this by trying the flow in the browser; the
  tests never produced a `null` because they set values directly.
- **Payee error out of sight.** The same error sat below the payee list, so with many payees it was off
  screen after `Continue`. Moved above the list. It is still linked to the list with `aria-describedby`.

**My own fixes and changes after the AI build:**

- **Motion and illustrations** (see Decisions). My idea, scoped down against the brief before
  building: I dropped a separate "sending" screen, a self-drawing tick and dimming the review step.
  The payee list's `No saved payees yet.` stays plain text because it sits inside the form.

## Not done / known issues

- Not built (optional): debug menu (URL params instead), balance-hide toggle, third segment, `#transfer`
  deep link, end-to-end test, `Make another transfer`, the optional date line.
- The OS theme is read on first load only. Changing it later doesn't update the app unless the user hasn't
  picked one and reloads.
- If the API's default segment were `premium` and nothing was saved, the page would paint retail first
  and then switch once the customer loads (the pre-paint script can't know the API value). For Ava it's
  retail, so there's no flash.
- In Chrome, pressing Esc twice quickly on the discard prompt can close the dialog (the browser stops
  pages from blocking repeated Esc). State stays in sync because everything listens to the dialog's
  `close` event.
- Data resets on reload (in-memory mock API), as expected.
