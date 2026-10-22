# Tracking — Mobile

NativeScript mobile app for **Tracking**.

Part of [Chaowalit Greepoke](https://bookchaowalit.com)'s 101 Portfolio Projects.

## Canonical NativeScript template

This repository **is the canonical NativeScript template** for `bookchaowalit-mobile` and the only NativeScript
repo there with an implemented app. The other NativeScript repos are unimplemented name-substituted scaffolds of
the same template (`bookchaowalit-mobile/devtools-tools-mobile`, `bookchaowalit-mobile/productivity-todo-board-mobile`).
Each repo owns its code (no shared package). Consolidating or archiving the copies is pending owner decision D5
(BD-033), see `repository-catalog/portfolio/MOBILE-CONSOLIDATION-2026-10.md` in solo-empire.

There is no native build yet: `App_Resources/` is missing, so CI stops at the JavaScript webpack bundle. See
`PRODUCT.md` for what works today.

## Tech Stack

- **Framework:** NativeScript 8.8
- **Language:** TypeScript
- **UI:** NativeScript core components (native rendering)
- **Platform:** iOS + Android (targets; no native build verified yet)

## Features ("TrackIt")

- Track anime, manga, movies, books, games and podcasts with unit-aware
  progress (episodes, chapters, pages, hours…); unknown lengths are fine.
- **Library** tab: search, filter by status, tap an item for +1 / +5 / -1,
  mark completed / dropped / planned, rate 1–5 stars or delete. Progress
  auto-starts planned items and completes them at the last unit.
- **Stats** tab: totals by status and category, average rating and how many
  finished items were completed rather than dropped.
- Data is stored on-device (`ApplicationSettings`); nothing leaves the phone.

## Getting Started

```bash
npm ci
ns run android   # requires the NativeScript CLI + Android SDK
ns run ios
```

`App_Resources/` is not in the repo yet; see `docs/UPGRADE-PLAN.md`.

## Validation

```bash
npm run validate          # eslint + tsc --noEmit + vitest
npm run bundle:android    # NativeScript webpack bundle (no SDK needed)
```

Core logic lives in `app/lib/tracker.ts`; the view model in `app/tracker-view-model.ts` is tested with
`@nativescript/core` replaced by an in-memory fake (tests in `tests/`). CI (`.github/workflows/ci.yml`) calls the
shared `bookchaowalit/platform-ci-workflows` v1.1.1 (`ci-node.yml` + `security.yml`, pinned by SHA): `npm ci`, lint,
typecheck, Vitest with a 94% line-coverage gate, `npm run bundle:android`, and the gitleaks / Semgrep / OSV-Scanner /
Trivy scans. Failures are not masked.

`osv-scanner.toml` ignores one dev-only advisory (GHSA-vcc3-ghjq-m6fr in `decode-uri-component`, pulled in by
`@nativescript/webpack` through `css`), with the reason and an expiry date written next to it.

## Related

- **Frontend:** [bookchaowalit-website/tracking-frontend](https://github.com/bookchaowalit-website/tracking-frontend)
- **Portfolio:** [bookchaowalit.com](https://bookchaowalit.com)

## License

MIT
