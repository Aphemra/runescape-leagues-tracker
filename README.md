# RuneScape League Ledger

A static, browser-local task tracker for Old School RuneScape and RuneScape leagues. There are no accounts, profiles, cookies, or server-side saves. Each league has an isolated local save in the current browser.

## Included league data

- RuneScape Equilibrium League: all 533 currently published Easy and Medium tasks.
- Old School RuneScape Demonic Pacts League: all 1,592 tasks.

Task data is imported from the Old School RuneScape Wiki and RuneScape Wiki under CC BY-SA 3.0. Each generated snapshot records its source page and revision.

## Run locally

```sh
npm ci
npm run dev
```

Quality checks:

```sh
npm test
npm run lint
npm run build
```

## Refresh Wiki data

Run every importer:

```sh
npm run import:wiki
```

Or refresh one league:

```sh
npm run import:wiki:equilibrium
npm run import:wiki:demonic-pacts
```

On GitHub, open **Actions → Refresh Wiki task data → Run workflow**. The workflow downloads the current structured Wiki rows, validates them, and opens a pull request only when the checked-in snapshots changed.

## Architecture

- `src/domain/leagues/` contains mechanic-neutral task, requirement, validation, filtering, and progress rules.
- `src/domain/storage/` owns the versioned per-league localStorage contract.
- `src/data/leagues/` contains immutable generated snapshots and the lazy-loaded league catalog.
- `scripts/import-wiki.ts` is the reproducible Wiki adapter.
- `src/migrations/legacyV1.ts` preserves saves made by the original Demonic Pacts tracker.

Regions, pacts, clue metadata, and future mechanics are manifest capabilities or generic facets. They are not required fields on every league or task, so a no-region or skill-locking league can be added without changing the core tracker.

## GitHub Pages

The `Test and deploy to GitHub Pages` workflow tests and builds every push to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once. The Vite base path is derived from the repository name during Actions builds.
