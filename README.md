# Tracking — Mobile

NativeScript mobile app for **Tracking**.

Part of [Chaowalit Greepoke](https://bookchaowalit.com)'s 101 Portfolio Projects.

## Tech Stack

- **Framework:** NativeScript 8.8
- **Language:** TypeScript
- **UI:** NativeScript core components (native rendering)
- **Platform:** iOS + Android

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
npm run validate          # tsc --noEmit + vitest
npm run bundle:android    # NativeScript webpack bundle (no SDK needed)
```

Core logic lives in `app/lib/tracker.ts` (tests in `tests/`). CI
(`.github/workflows/build.yml`) runs the same commands and fails on errors.

## Related

- **Frontend:** [bookchaowalit-website/tracking-frontend](https://github.com/bookchaowalit-website/tracking-frontend)
- **Portfolio:** [bookchaowalit.com](https://bookchaowalit.com)

## License

MIT
