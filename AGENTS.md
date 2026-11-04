## Brief (the spec)

`brief/` is the source of truth and is read-only. Before any change to a requirement, UI text, layout, styling, API call, validation or test, read the brief file that covers it and follow it exactly. Where the brief is silent or unclear, make a reasonable choice and record it in `README.md`.

- `brief/candidate-brief.md`: scope (§2), requirements by ID (D1–D8, T1–T8, TH1–TH3, E1–E6), validation table (§3.3), exact copy (§4), layout (§5). Cite the requirement ID in commits and PRs.
- `brief/api-contract.md`: endpoints, request/response shapes, error codes, test and demo hooks.
- `brief/design-tokens.css`: every colour, spacing, type, radius, shadow, motion and z-index value. Already imported by `src/index.css`.

Rules that are easy to miss:

- UI text matches brief §4 character for character, including `…` in `Sending…`.
- Components style with `var(--token)` only; colour literals (hex, rgb, named) live solely in `design-tokens.css`. Theme and segment are set as `data-theme` / `data-segment` on `<html>` before first paint.
- API calls go through `apiFetch` (`src/api/client.ts`) using types from `src/api/types.ts`. Server data lives in TanStack Query; derived values (totals, remaining limit) are computed, never stored.
- Each validation rule is defined once in a Zod schema and used for both inline errors and submit.
- Money renders with `formatMoney`, dates with `formatShortDate` (`src/lib/format.ts`). Tests compare against `formatMoney(...)`, not typed strings.
- Tests are the three E4 lists, plus the starter's `format.test.ts`. The author defends every test in an interview, so propose any new test to the user with the reason it can't be checked by hand, and add it only once they agree.
- `mock-api/` and its data stay unchanged. Tests cover edge cases with `server.use(...)` overrides; `?scenario` and `?delay` reach the mock API only through `lib/demoParams.ts`, which forwards them from the page URL for reviewers and does nothing without them; `#fail` is typed into the note. Never add a permanent "break the app" control to the UI.
- Build only what §2 lists as Required or Optional. `Cards`, `Payments` and `Insights` render as disabled links.

## Before committing

Run `npm run format`, then make sure `npm run check` and `npm run build` pass. CI fails on unformatted code.

## Agent skills

### Issue tracker

Issues live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
