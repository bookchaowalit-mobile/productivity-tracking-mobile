# TrackIt (Tracking Mobile)

**Tier:** C, template (canonical NativeScript template for `bookchaowalit-mobile`; not store-released)
**Stack:** NativeScript 8.8 + TypeScript (strict), `@nativescript/webpack` 5, Vitest 4, Node 22 in CI, `package-lock.json`
**CI:** `.github/workflows/ci.yml` calls the shared `platform-ci-workflows` v1.1.1: `npm ci`, ESLint, `tsc --noEmit`,
Vitest with a 94% line-coverage gate over `app/**/*.ts`, the NativeScript webpack bundle for Android (JavaScript only),
plus the shared security scan (gitleaks, Semgrep, OSV-Scanner, Trivy)

## What it is and who it is for

A personal tracker for anime, manga, movies, books, games and podcasts, for someone who wants to remember how far
they got in each. It is a portfolio piece and the reference NativeScript app for the organisation, not a product
with users.

## What works today (in code and tests)

- **Library tab:** search by title, filter by status (All / Doing / Planned / Done / Dropped) and by category; each
  row shows category, status, unit-aware progress ("6 / 28 episodes (21%)") and stars. "Add item" asks for title,
  category and an optional length through native dialogs. Tapping a row offers +1 / +5 / -1, mark completed /
  dropped / planned, rate 1-5 stars, or delete (with confirmation). Progress auto-starts planned items and completes
  them at the last unit.
- **Stats tab:** totals by status and category, average rating, and how many finished items were completed rather
  than dropped.
- **Profile tab:** static name and site link.
- Data is stored on the device with `ApplicationSettings` (key `trackit.items.v1`); corrupt stored data is ignored
  instead of crashing. Nothing is sent over the network.
- Tests: `tests/tracker.test.ts` and `tests/filters.test.ts` (pure logic in `app/lib/tracker.ts`) and
  `tests/tracker-view-model.test.ts` (the view model with `@nativescript/core` replaced by an in-memory fake).

## What does not work yet

- `App_Resources/` (icons, `AndroidManifest.xml`, `Info.plist`) is not in the repo, so `ns build android` /
  `ns build ios` cannot produce an app yet, and no native build runs in CI. The app has not been run on a device or
  emulator for this version.
- No account, backend, sync, backup/export, analytics or crash reporting.
- Not in any app store and no installable artifact.

## Where it runs

- Nowhere hosted. Locally: `npm ci && npm run validate` for checks, `ns run android` once `App_Resources/` exists and
  the NativeScript CLI + Android SDK are installed.
- The web frontend is a separate repository: `bookchaowalit-website/tracking-frontend`.
