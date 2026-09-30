# Upgrade Plan

## Current state

- Before this pass: **1/10** — NativeScript scaffold with placeholder tabs,
  no `nativescript.config.ts` or `webpack.config.js` (so `ns run` could not
  build), no tests, no lockfile, CI masked failures with `|| true`.
- After this pass: **6/10** — "TrackIt" content tracker (anime, manga,
  movies, books, games, podcasts) with tested core logic, local persistence
  and a stats tab; CI typechecks, tests and produces the NativeScript webpack
  bundle. Native builds are still unverified (no `ns`/Android SDK here).

## Backlog

### P0
- Add `App_Resources/` (icons, `AndroidManifest.xml`, `Info.plist`; e.g. from
  `ns create --template @nativescript/template-blank-ts`) and verify
  `ns build android` in CI with the Android SDK.
- Manual device check of the dialogs-based add/edit flow.

### P1
- Dedicated add/edit page (form with category picker) instead of chained
  dialogs; inline +1 button on each row.
- Category filter chips on the Library tab (logic already supports it).
- Sync with tracking-frontend's `/api/tracking` once auth is decided.

### P2
- Lint (ESLint + typescript-eslint) for `app/`.
- Export/import JSON backup.

## Done in this pass

- `app/lib/tracker.ts`: create/validate items, progress with auto-start /
  auto-complete / resume, status and rating changes, unit-aware progress
  labels, filtering/sorting, library stats, defensive storage parsing —
  12 Vitest tests in `tests/`.
- Library tab (search, status filter, tap for +1/+5/-1, status, rating,
  delete; add via dialogs) and Stats tab, persisted with ApplicationSettings.
- Added `nativescript.config.ts`, `webpack.config.js` (with a `url` fallback
  fixing a real css-tree/source-map bundling error), theme CSS, tsconfig,
  scripts and a committed `package-lock.json`.
- CI runs `npm ci`, typecheck, tests and the NativeScript webpack bundle with
  no failure masking.
