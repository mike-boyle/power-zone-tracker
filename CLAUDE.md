# Power Zone Tracker

A phone-first web app for power zone training on an indoor bike (the owner rides a
Peloton without a subscription, in "Just Ride" mode, with the phone mounted on the
handlebars). It replaces what the subscription used to give: structured power zone
rides, multi-week programs with progression, and the watt range for each zone.

## Working agreement

- **Treat this codebase as your own.** The owner has delegated most product and
  technical decisions. Make the call, keep it consistent with what's here, and record
  any decision a future session would need to know in this file. Ask only about
  things that are genuinely the owner's: their accounts and hosting settings, their
  data, or a change in what the app is for.
- **Standing authorization to commit and push directly to `main`.** No branches, no
  pull requests. Commit in sensible chunks with clear messages and push when a piece
  of work is done and `npm run check` passes.

## Commands

```sh
npm run dev        # Vite dev server on :5173 (also exposed on the LAN for phone testing)
npm run check      # typecheck + unit tests + prettier check. Run before every commit.
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ on :4173 (service worker only runs in this mode)
npm run format     # prettier --write
```

CI (`.github/workflows/ci.yml`) runs `check` and `build` on every push to `main`,
then deploys `dist/` to GitHub Pages (enabled 2026-11-25, source: GitHub Actions).
Live at https://mike-boyle.github.io/power-zone-tracker/ — every push to `main` ships
to the owner's phone, so keep `main` working. The repo is private; the Pages site is
public, which is fine because the app holds no secrets (user data is on-device only).

## Stack and why

- **Solid 1.9** (`solid-js` v1 line). Solid 2.0 was released 2026-11-17, but
  `vite-plugin-solid` and `babel-preset-solid` only support it on `next` tags so far.
  Migrate once those reach `latest`.
- **Vite 8, TypeScript 7** (strict, `noUncheckedIndexedAccess`), **Vitest 5**.
- **CSS Modules** with `localsConvention: 'camelCaseOnly'`: write class names in
  camelCase (`.statusDone`), never hyphenated, or the lookup is `undefined`.
- **Design tokens** in `src/styles/tokens.css`, two layers:
  primitives (`--p-*`, raw palette) and semantic tokens (`--color-*`, `--zone-N`,
  `--zone-N-ink`, `--type-*`, spacing, type scale, radii, motion). Components use
  semantic tokens only, never `--p-*` or hard-coded colours. Light/dark follow the
  system via `prefers-color-scheme`; a theme only remaps semantic tokens.
- **No router library**: `src/router.ts` is a small hash router (hash URLs work on any
  static host and sub-path with no rewrites).
- **State** is a Solid store persisted to `localStorage` (`src/state/store.ts`). Every
  mutation goes through `commit()`, which saves. Schema is `version: 1`; if it
  changes, bump it and migrate in `normalize()` in `src/state/storage.ts`.
- **PWA**: hand-written `public/sw.js` (network-first for the page, cache-first for
  hashed assets) and `public/manifest.webmanifest`. Icons are generated PNGs; the SVG
  source is `public/icon.svg`.

## Layout

```
src/
  domain/        Pure logic, fully unit tested. No Solid imports.
    zones.ts       Zone % of FTP, watt ranges, FTP-test maths
    ride.ts        Segment/Ride types and the interval notation parser
    tss.ts         NP/IF/TSS estimate from a 1 Hz trace
    library.ts     The ride library (recipes → rides)
    programs.ts    Program definitions (block shape, ride mix per days/week)
    plan.ts        Plan generator
  state/         Store, persistence, ride clock
  lib/           Browser helpers: wake lock, audio/voice cues, cx()
  ui/            Generic primitives (Button, Card, Dialog, Page, controls, badges)
  components/    App-specific pieces (RideProfile graph, IntervalList, charts…)
  pages/         One file per screen; App.tsx switches on the route
```

## Domain notes

- **Zones** (% FTP): Z1 ≤55, Z2 56–75, Z3 76–90, Z4 91–105, Z5 106–120, Z6 121–150,
  Z7 >150. Watt ranges are contiguous integers (`wattRange`).
- **TSS** is estimated assuming each interval is ridden mid-zone (`ZONE_INFO.intensity`),
  using normalized power over a 30 s rolling window. Library values land a little
  under typical class estimates elsewhere; that's fine, it's internally consistent.
- **Interval notation** (`parseIntervals`): `3@4` = Z3 for 4 min, `5@1:30`,
  `6@0:20'Spin-up'` (with a cue), `4x[5@1 1@2]` (repeats, nestable).
- **Ride ids** are `<recipe>-<minutes>` and are stored inside saved plans. Never rename
  or remove a shipped recipe id or length; add new ones instead. Tests assert every
  ride fills its exact length and lands in a sane TSS band for its type and length.
- **The ride library is original.** It's modelled on common power zone class shapes,
  calibrated against typical TSS for each class type/length. Don't copy class data
  from third-party sites (e.g. homefitnessbuddy's community-sourced database) into
  the repo.
- **Programs** use 3:1 blocks (3 build weeks, 1 lighter week). FTP tests are optional per plan
  (`TestOptions`: start, between blocks, final); `program.testWeeks` says which lighter
  weeks _can_ end in a test, and `weekHasTest` applies the choice.
  Weekly target TSS = `baseWeeklyTss × load[week] × daysFactor(days)`. The generator
  splits it across the week's slots by weight and picks the closest ride, with a
  repeat penalty for variety. Plans store the generated ride ids, so library changes
  never reshuffle a plan in progress.
- **Ride clock** is wall-clock based (`accumulatedMs` + `runningSince`), so rides
  survive sleep, backgrounding and reloads. Skipping intervals moves the position;
  the saved ride time is the position reached, not wall time ridden.

## Verifying UI changes

The player (`src/pages/PlayerPage.tsx`) is the screen that matters most: it has to be
readable at arm's length on a handlebar mount. Check changes at 375×812 portrait and
812×375 landscape, in both light and dark. `.claude/launch.json` has `dev` and
`preview` configs for the browser pane.

## Ideas not built yet

- Optional Bluetooth power meter / FTMS connection (Web Bluetooth) to show live watts.
- Adjust a plan in place (change days/week mid-program) instead of restarting.
- Track wall time actually ridden separately from position, for skip-heavy rides.
- Ramp test as an alternative to the 20-minute FTP test.
