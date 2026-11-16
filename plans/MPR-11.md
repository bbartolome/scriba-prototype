---
id: MPR-11
status: done
---
# MPR-11 plan — `/providers` route: lazy app-level entry, nav item, page that hosts the providers panel

Batch: [MPR-11] (Model providers, `phase:settings-ui`, M2; the gate that closes the phase). Batch of one. Revision 2 (the reviser's, 2026-11-16), a draft.

Base: `main` at `122a9ff`. The planner wrote revision 1 at `e11ca95`. Since then SHL-22 merged (`b51c966`, `122a9ff`); `git diff --name-only e11ca95 122a9ff -- apps e2e packages units modules scripts` prints `apps/api/test/providers-client-timeout-abort.test.ts`, `apps/web/src/app/shell/api-client.spec.ts`, `apps/web/src/app/shell/connection-status.spec.ts`, `apps/web/src/app/shell/project-route.spec.ts` and `units/SHL-22-load-sensitive-spec-waits.md`. None of them is in section 2 or cited below, so every citation holds at `122a9ff`. The unit file has no "by revision" note (`grep -rn -i "by revision" units/` finds notes in PST-07, PST-08 and PST-10 only, none in `units/MPR-*`).

Unit front matter (`units/MPR-11-providers-route-gate.md` lines 2 to 9): `blocked_by: [MPR-09, MPR-10]`, `parallel_with: [MPR-12]`, `unblocks: [MPR-13, "Setup & auth phase:setup-flow providers embed"]`. Both blockers are `status: done` (`plans/MPR-09.md` line 3, `plans/MPR-10.md` line 3).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the shell, the earlier plans or DECISIONS

- **S1 Shape of the route.** A lazy, app-level `/providers` route, minimum device class `phone`, with a nav entry; one entry in the Shell's route table, hosting the providers panel. Source: `units/MPR-11-providers-route-gate.md` line 17.
- **S2 Responsive.** Usable on a phone for checking and switching the app default over the tailnet (the unit's story 31); desktop-first otherwise. The layout is MPR-09's CSS-only rule (D14), so this plan changes no CSS. Source: unit line 18; `plans/MPR-09.md` line 110 (D14).
- **S3 Route table row.** `/providers` | Model providers | app | phone | yes (nav). Source: `modules/shell.md` line 58; the heading of the table is line 52.
- **S4 Placement and matching.** App-level entries go above the `**` entry; each owned path uses `pathMatch: 'full'` unless it has a child route. Source: `apps/web/src/app/app.routes.ts` lines 40 to 43 (doc comment); the setup and settings entries follow the same pattern (lines 77 to 101). `plans/SHL-01.md` line 202: "Model providers (MPR-11) | `/providers`, one path | `providersRoutes`, one entry above `'**'`".
- **S5 Module shape and entry file.** Lazy feature routes live in `apps/web/src/app/features/providers/`; other code imports the feature only through `providers.routes.ts` (the ESLint boundary). Source: `modules/providers.md` line 33; `plans/MPR-09.md` line 71 (S14); `apps/web/src/app/features/providers/providers.routes.ts` lines 1 to 3.
- **S6 Lazy page pattern.** The entry file has no static import of the page; the page loads with `loadComponent` and a dynamic import. Source: `apps/web/src/app/features/project-store/project-store.routes.ts` lines 14 to 23 (`filesRoutes`, whose comment at lines 14 and 15 says the main bundle does not carry the page).
- **S7 The panel.** `ProvidersPanel` is standalone, selector `app-providers-panel`, with no inputs, no outputs and no router dependency; it is exported from the entry file. Source: `plans/MPR-09.md` line 77 (D1) and line 78 (D2); `apps/web/src/app/features/providers/providers-panel.ts` line 21 (selector).
- **S8 No runtime contract import in the feature.** Every contract import in a non-spec file is `import type`; the hand-written copies in `providers-copies.ts` stand in for runtime values. Source: `plans/MPR-09.md` line 70 (S13) and line 80 (D3); DECISIONS lines 3148 to 3152, the Navigator's option (b). Its reason (line 3151) says that once MPR-11 adds the route, the build gains a third CommonJS warning and zod lands in a feature chunk, which type-only imports and copies avoid. Checked here: section 7a.
- **S9 Checks that belong to this unit.** The real-viewport proof at 390 by 844 (MPR-09's open point 9) and the first measurement of the lazy chunk and its CommonJS count. Source: `plans/MPR-09.md` line 238 (open point 9), line 147 (step 6), line 221 (section 5, MPR-11 bullet); `plans/MPR-10.md` line 104 and line 130 ("RESOLVED: phone width is MPR-11's check").
- **S10 The lazy claim is checked on the build stats, not in a rendered test.** The stats method and its four assertions are the precedent of SHL-09. Source: `plans/SHL-09.md` line 26 (decision 6), lines 106 to 108 (step 7), line 141 (C2'). SHL-09's review added: run the check as `node <script> <stats> <index>`, not `node -I` (DECISIONS line 2836, note (b)).
- **S11 Nav items.** `AppNav` builds its items from the route table's `data.nav` entries, sorted by `nav.order`; an absent `minDeviceClass` means `tablet`. Source: `apps/web/src/app/shell/app-nav.ts` line 44 (default `tablet`), lines 52 to 73 (`navItems`), line 188 (sort); `apps/web/src/app/shell/route-data.ts` lines 4 to 9 (`ShellNav`), lines 11 to 19 (`ShellRouteData`), lines 12 and 13 (absent means `tablet`); `plans/SHL-05.md` line 39 (decision 11).
- **S12 Test seam.** Rendered routes with Angular's Vitest runner against the Shell's fakes; external behaviour only; the e2e run is Platform's Playwright harness. Source: `units/README.md` line 138 (Testing convention); `modules/providers.md` line 45 (UI seam); `modules/shell.md` line 92 (seam).
- **S13 Gate.** Merging this unit closes `phase:settings-ui`. Source: `units/MPR-11-providers-route-gate.md` line 14; `units/README.md` line 93 (phase table row).
- **S14 Existing links.** The chat panel links `AGENT_NO_PROVIDER` to `/providers` as a plain `href` (`apps/web/src/app/features/agent-loop/chat-page.ts` line 300; the spec at `chat-page.spec.ts` line 384 checks the `href`). `plans/AGL-07.md` line 47 says MPR-11 adds the route. This plan changes neither file.
- **S15 Settings page keeps the export.** `apps/web/src/app/features/setup-auth/settings-page.ts` line 13 imports `ProvidersPanel` from `../providers/providers.routes`; `plans/SAU-15.md` line 164 says MPR-11 keeps that export. The export stays.

### 1b. Decided here (the smaller choices; the simplest option in each case)

- **D1 Nav item.** Label `Providers`, Material icon `tune`, order `50`, so the item sits after Tools (`40`, `app.routes.ts` line 121) and before Settings (`90`, line 95). No other entry uses `50` (the orders in use are 10, 20, 30, 40, 90 and 100; `app.routes.ts` lines 18, 108, 31, 121, 95, 70). The label is the one-word form the other items use; the page title carries the full name (D5). The icon `tune` is a ligature of the loaded font: checked by the reviser on `node_modules/@fontsource/material-icons/files/material-icons-latin-400-normal.woff` (its `cmap` and the GSUB ligature lookups): `tune` maps to a ligature glyph, as `build`, `library_books`, `science`, `settings`, `chat` and `folder` do, and a made-up name does not (section 6, point 1).
- **D2 Route entry placement.** One `providers` entry is added after the `tools` entry and before the `**` entry (after line 127 and before line 128 of `app.routes.ts`). Its `data` is `{ scope: 'app', minDeviceClass: 'phone', nav: {...} }` with the `ShellRouteData` type, as the other entries do; its `loadChildren` loads `providersRoutes`. The code is in section 3, step 5.
- **D3 Entry file.** `providers.routes.ts` gains `providersRoutes` (one `''` route with `pathMatch: 'full'` and a lazy `loadComponent` for the page). Its line 3 re-export of `ProvidersPanel` stays. Lines 1 and 2 (the comment "It holds no routes yet") are replaced, because they are no longer true.
- **D4 Page component.** `ProvidersPage` in a new file `providers-page.ts`; standalone; selector `app-providers-page`; template: the title, then `<app-providers-panel />`. It imports `ProvidersPanel` from `./providers-panel`, not from the entry file, so there is no import cycle. It injects nothing. MPR-13 will add its section after the panel element.
- **D5 Title and its level.** The title text is a new key `pageHeading: 'Model providers'` in `TEXTS` (`providers-texts.ts`, after line 13), so every visible string stays in that file (`plans/MPR-09.md` line 108, D12). The title is an `h2`, not an `h1`: the toolbar already owns `<h1>Scriba</h1>` (`apps/web/src/app/app.html` line 2), and the feature pages use `h2` (`features/project-store/files-page.ts` line 176, `project-picker.ts` line 110, `features/setup-auth/settings-page.ts` line 55, `shell/core-gate/core-gate.ts` line 6). Two pages use `h1` (`features/agent-loop/chat-page.ts` line 224, `features/tool-registry/tools-preview.ts` line 129). MPR-09 D14's "the host page owns the `h1`" is a plan statement of a done unit about the panel (it renders no `h1`); it is not a criterion, and the other host of the panel, the settings page (SAU-15, done), puts an `h3` above it (`settings-page.ts` line 93). The document's one `h1` is the toolbar's, so the page uses `h2`. No MPR-09 file changes (section 6, point 2).
- **D6 No other change to the page.** The page holds the panel and the title. Nothing about projects, nothing about the connection test; MPR-13 adds the project section itself.
- **D7 Unit tests.** One new spec file, `apps/web/src/app/features/providers/providers-route.spec.ts`, with three tests R1, R2 and R3 (section 4). It uses the helpers the MPR-09 specs use: `installProvidersServer` and `readView` from `./providers-test-server` (`providers-test-server.ts` lines 47 to 64 and 17 to 25), and `stubMatchMedia` and `restoreMatchMedia` from `shell/testing/match-media.ts` (lines 67 and 99). It imports `APP_ROUTES` from `../../app.routes`, as `features/setup-auth/setup-page.spec.ts` does (line 20). Every `vi.waitFor` in it passes `{ timeout: 5000 }`, and R2 and R3 each get `10000` as the third argument of their `it`, the values SHL-22 (done) and `core-gate.spec.ts` use for a test that waits on a lazy load (`units/SHL-22-load-sensitive-spec-waits.md`, Decisions).
- **D8 Build check (B1).** The stats method of S10, four assertions (section 3, step 8). No new script in the repository; the script lives in `/tmp`.
- **D9 e2e file.** One new file, `e2e/specs/providers-phone.e2e.ts`, one test, at 390 by 844, in the style of `e2e/specs/projects-phone.e2e.ts`. It signs in as that spec does, creates its own provider through the API against the mock's `tool-call` scenario, and restores the app default it found at its end (section 3, step 7).
- **D10 Nothing else changes.** No contract, API, Shell file, unit file, module file, `plans/DECISIONS.md`, `angular.json`, `package.json` or lockfile. `shell/**`, `providers-panel.ts`, `provider-form.ts`, `model-picker.ts`, `key-field.ts`, `providers-store.ts`, `providers-copies.ts` and their specs stay as they are.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/app.routes.ts` | edit | One `providers` entry after `tools` (after line 127) and before `**` (line 128): `scope: 'app'`, `minDeviceClass: 'phone'`, nav `Providers` / `tune` / `50`, `loadChildren` of `providersRoutes`. Imports stay as they are |
| `apps/web/src/app/features/providers/providers.routes.ts` | edit | Adds `providersRoutes` (the lazy `''` route to the page). Keeps the `ProvidersPanel` re-export on line 3. Replaces the comment on lines 1 and 2 |
| `apps/web/src/app/features/providers/providers-page.ts` | new | `ProvidersPage`: title from `TEXTS.pageHeading`, then `<app-providers-panel />` |
| `apps/web/src/app/features/providers/providers-texts.ts` | edit | One key, `pageHeading: 'Model providers'`, after line 13 (`heading: 'Providers'`) |
| `apps/web/src/app/features/providers/providers-route.spec.ts` | new | R1, R2 and R3 (section 4) |
| `e2e/specs/providers-phone.e2e.ts` | new | E1, the 390 by 844 check of the page, its nav item and the app-default switch (section 4) |
| `plans/MPR-11.md` | new | This plan (the planner's commit only) |

Files that must not change: `packages/contracts/**`; `apps/api/**`; `apps/web/src/app/shell/**` (including `shell/index.ts` and `shell/testing/**`); `apps/web/src/app/features/providers/` apart from the four files above (`providers-panel.ts`, `provider-form.ts`, `model-picker.ts`, `key-field.ts`, `providers-store.ts`, `providers-copies.ts`, `providers-copies.spec.ts`, `providers-panel.spec.ts`, `providers-host.spec.ts`, `connection-test*.ts`, `connection-test-result.ts`, `providers-test-server.ts`); `apps/web/src/app/features/setup-auth/**`; `apps/web/angular.json`, `apps/web/package.json`, `apps/web/tsconfig*.json`; `e2e/playwright.config.ts`, `e2e/harness/**` and the other specs; the root `package.json` and `package-lock.json`; `units/**`; `modules/**`; `plans/**` except this file.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`, or from the implementer's worktree on `unit/MPR-11`, which the driver gives the implementer and which is made from `main` when the branch does not exist (`prompt.md` line 118). Record `node -v` and `npm -v` beside the first result. Do not push, add a remote or open a PR. Stage only the paths of section 2, by name. Commit after each complete part, with `MPR-11` in the message.

0. **Worktree and install.** `git branch --show-current` prints `unit/MPR-11`; `git status --short` prints nothing. `npm ci`. Expected: exit 0.
1. **Preconditions.** `git diff --name-only 122a9ff HEAD -- apps e2e packages units modules` prints nothing, or only paths that are not in section 2 (for example the AGL-08 paths of section 5). Then: `grep -n "providers" apps/web/src/app/app.routes.ts` prints nothing; `apps/web/src/app/features/providers/providers.routes.ts` has the comment on lines 1 and 2 and the re-export on line 3 only; `apps/web/src/app/shell/index.ts` exports `API_CLIENT`, `ApiError`, `ApiSchemaError`, `ApiPath` and `ResponseSchema`; `apps/web/src/app/app.html` line 2 has `<h1>Scriba</h1>`. If any check fails, stop and report.
2. **Baseline.** `npm run build -w @bbartolome/scriba-contracts`: expected exit 0, and `packages/contracts/dist/providers/index.js` exists. `npm test -w @bbartolome/scriba-web`: expected exit 0; record `Test Files` and `Tests`. `npm run build -w @bbartolome/scriba-web -- --stats-json 2>&1 | tee /tmp/mpr11-build-base.txt`: expected exit 0; record `grep -ci commonjs /tmp/mpr11-build-base.txt`, the `Initial total` line, and copy `apps/web/dist/scriba-web/browser-stats.json` to `/tmp/mpr11-stats-base.json` (the stats path as `plans/SHL-09.md` line 107 records it). The reviser's build at `122a9ff` (output path in `/tmp`) gave, for orientation only: exit 0, `Initial total` 581.83 kB with the budget warning "bundle initial exceeded maximum budget" (a warning: `maximumError` is 1MB, `angular.json` line 36), and two CommonJS warnings (`@bbartolome/scriba-contracts/setup-auth` and `zod`). A different baseline is not a stop condition; the recorded one is what step 8 compares with. If the baseline fails, stop and report.
3. **Criterion 1 (the earlier units hold on main).** `npm test -w @bbartolome/scriba-web -- --include 'src/app/features/providers/*.spec.ts'`: expected exit 0, every test passing. Record the `Tests` count as N1. Nothing is written in this step.
4. **Red.** Write `apps/web/src/app/features/providers/providers-route.spec.ts` with R1, R2 and R3 (section 4). Run `npm test -w @bbartolome/scriba-web -- --include src/app/features/providers/providers-route.spec.ts`: expected exit non-zero, with R1 failing on the missing entry (`toHaveLength(1)` against 0) and R2 and R3 failing on the missing link and the missing page. No compile error. Commit `test(MPR-11): add the /providers route tests (red)`.
5. **Green.** (a) `providers-texts.ts`: add `pageHeading: 'Model providers',` after line 13. (b) Create `providers-page.ts`:

   ```ts
   import { Component } from '@angular/core';
   import { ProvidersPanel } from './providers-panel';
   import { TEXTS } from './providers-texts';

   // The /providers page: its title, then the providers panel. MPR-13 adds its section after the panel.
   @Component({
     imports: [ProvidersPanel],
     selector: 'app-providers-page',
     template: `
       <h2>{{ texts.pageHeading }}</h2>
       <app-providers-panel />
     `,
   })
   export class ProvidersPage {
     protected readonly texts = TEXTS;
   }
   ```

   (c) `providers.routes.ts`: replace lines 1 and 2 by the comment and `import { Routes } from '@angular/router';`; add `providersRoutes`; keep line 3.

   ```ts
   import { Routes } from '@angular/router';

   // The providers feature's entry file. Other features import only from here (ESLint boundaries).
   // `providersRoutes` is the app-level `/providers` route. Its page loads lazily: this file has no
   // static import of the page, so the main bundle does not carry it.
   export const providersRoutes: Routes = [
     {
       path: '',
       pathMatch: 'full',
       loadComponent: () =>
         import('./providers-page').then((feature) => feature.ProvidersPage),
     },
   ];

   export { ProvidersPanel } from './providers-panel';
   ```

   (d) `app.routes.ts`: insert after the `tools` entry (after line 127), before `{ path: '**', component: NotFoundPage }`:

   ```ts
     {
       path: 'providers',
       pathMatch: 'full',
       data: {
         scope: 'app',
         minDeviceClass: 'phone',
         nav: { label: 'Providers', icon: 'tune', order: 50 },
       } satisfies ShellRouteData,
       loadChildren: () =>
         import('./features/providers/providers.routes').then(
           (feature) => feature.providersRoutes,
         ),
     },
   ```

   Run `npm test -w @bbartolome/scriba-web -- --include src/app/features/providers/providers-route.spec.ts`: expected exit 0, R1 to R3 passing. Then `npm test -w @bbartolome/scriba-web -- --include 'src/app/features/providers/*.spec.ts'`: expected exit 0 and `Tests` equal to N1 plus 3. Then `npm test -w @bbartolome/scriba-web`: expected exit 0; the other route specs (`app-nav.spec.ts`, `core-gate.spec.ts`, `device-gate.spec.ts`, `setup-page.spec.ts`) pass unchanged. Commit `feat(MPR-11): add the lazy /providers route, its page and the nav entry`.
6. **Types, lint, format.** `npx tsc --noEmit -p apps/web/tsconfig.spec.json` and `npx tsc --noEmit -p apps/web/tsconfig.app.json`: expected exit 0 for both (the app build includes `providers-page.ts` and `providers-test-server.ts`; `tsconfig.app.json` has `"types": []`, line 6). `npm run lint -w @bbartolome/scriba-web`: expected exit 0 with no `boundaries/dependencies` message. `npx prettier --write apps/web/src/app/app.routes.ts apps/web/src/app/features/providers` and then `npx prettier --check apps/web/src/app/app.routes.ts apps/web/src/app/features/providers`: expected `All matched files use Prettier code style!`. A format change is committed on its own as `style(MPR-11): format`, never amended into an earlier commit.
7. **e2e (E1).** Write `e2e/specs/providers-phone.e2e.ts` as section 4 describes. `npx prettier --check e2e/specs/providers-phone.e2e.ts` and `npm run build -w @bbartolome/scriba-e2e`: expected exit 0. Then, from the root, `npm run e2e`: expected exit 0. The global setup builds contracts, the API and the web app and starts the API on port 8080 with the mock (`e2e/harness/global-setup.ts` lines 21 and 27 to 34). The list reporter shows `the providers page fits 390 by 844 ...` as passed. Every other spec keeps its result on `main`. **Stop rule:** if the run cannot start (no Chromium, port 8080 in use), stop before the commit of this step and report; do not skip E1 silently and do not tick criteria 2b and 2c without it. An unrun E1 blocks the unit: it is the only real-viewport proof of criterion 2c (jsdom has no layout, `plans/MPR-09.md` D14 and open point 9). The reviser found Chromium revision 1254 in `~/.cache/ms-playwright`, the revision that Playwright 1.65.0 names (`node_modules/playwright-core/browsers.json`), and nothing listening on port 8080 (section 6, point 6). Commit `test(MPR-11): add the 390 by 844 e2e for /providers`.
8. **Build and the lazy check (B1, criterion 2a).** `npm run build -w @bbartolome/scriba-web -- --stats-json 2>&1 | tee /tmp/mpr11-build-after.txt`: expected exit 0. Record `grep -ci commonjs` and the `Initial total` line. Expected: the CommonJS count equals step 2's (no new warning), and the `Initial total` grows by a few hundred bytes at most (one route entry); a larger growth means something in the feature reached the main bundle: stop and report. Then run the four assertions on `apps/web/dist/scriba-web/browser-stats.json` and `browser/index.html`, from a script in `/tmp` run as `node <script> <stats> <index>`:
   - (a) Exactly one output has an input whose path ends in `features/providers/providers-page.ts`. Call that output X.
   - (b) `browser/index.html` does not reference X (by its file name).
   - (c) Some other output imports X with `kind: 'dynamic-import'`.
   - (d) For each output that has an input under `features/providers/`, no input with `bytesInOutput > 0` has a path containing `/zod/`, `contracts/dist/` or `@codemirror/`. The path patterns are checked against the stats first; record the actual paths that match.

   Expected: all four hold. The reviser's stats at `122a9ff` show why (d) is expected to hold: no JS output has a `@codemirror/` input with `bytesInOutput > 0` (`DiffView` and `MarkdownEditor` have no production user, so tree shaking drops them), and the `setup-auth-routes` chunk, which already carries eight `features/providers/` inputs through the settings page and imports `API_CLIENT` and `ApiError` from the same barrel, has no `/zod/`, `contracts/dist/` or `@codemirror/` bytes. Run the (d) patterns on `/tmp/mpr11-stats-base.json` too and record that they match nothing in the chunk that holds `features/providers/` inputs. If (d) fails, or any of (a) to (c) fails, stop and report; no file outside section 2 is edited in this unit (section 6, point 5).
9. **Controls.** On the committed code, one at a time, run each mutation of section 4b, record the named test that fails, and revert with `git checkout -- <file>` before the next. Nothing is committed in this step.
10. **Root gates.** From the root: `npm run build`, `npm test` and `npm run lint`: each expected exit 0. Record the web `Tests` (N1 plus 3). A failure in a file outside section 2 is reported, not fixed here.
11. **Status.** `git status --short` prints nothing. The unit's boxes and the plan's status are the closing step's job (the driver, as MPR-09 section 3 step 10 says), not this plan's.

## 4. Acceptance criteria and tests

The unit has two acceptance criteria (`units/MPR-11-providers-route-gate.md` lines 21 and 22). Criterion 2 has three parts, named 2a (lazy), 2b (nav) and 2c (phone width and switching). Each has a test. The unit tests run with `npm test -w @bbartolome/scriba-web`; the build and the e2e run as section 3 says.

| Criterion | Test | Seam | Command | Pass condition |
|---|---|---|---|---|
| 1. "MPR-09 and MPR-10 criteria pass on `main`" (unit line 21) | T1: the existing `features/providers/*.spec.ts` (no new test) | Vitest, Shell fakes | step 3 (and step 5) | exit 0; every test passes; `Tests` equals the recorded N1 (plus 3 after step 5) |
| 2a. Lazy-loaded (unit line 22) | R1 (structure) and B1 (build stats, step 8) | route table; build stats and `index.html` | step 4 (R1), step 8 (B1) | R1 passes; B1 assertions (a) to (d) hold |
| 2b. Appears in nav (unit line 22) | R2 (rendered nav at 390 and 1280, click opens the page); E1 step 4 (the real bottom nav at 390 by 844) | Vitest; Playwright | step 5 (R2); step 7 (E1) | R2 passes; E1 passes its step 4 |
| 2c. Usable at phone width for switching the app default (unit line 22) | R3 (wiring at 390 by 844 in Vitest); E1 steps 5 to 9 (real viewport) | Vitest; Playwright | step 5 (R3); step 7 (E1) | R3 passes; E1 passes and reports no page error |

**R1** (`providers-route.spec.ts`), "the /providers entry is app-scoped, phone-gated, has the nav entry, loads children and holds no component". Like `setup-page.spec.ts` X3 (lines 363 to 376). Find the routes of `APP_ROUTES` with `path === 'providers'` and `data !== undefined`: exactly one. Its `data` equals `{ scope: 'app', minDeviceClass: 'phone', nav: { label: 'Providers', icon: 'tune', order: 50 } }`; `loadChildren` is defined; `component` and `loadComponent` are undefined on that entry (the page is not in the route table). The generated sibling (no `data`) is not counted.

**R2** (`providers-route.spec.ts`), "the Providers item shows at 390 by 844 and at 1280 by 800, and clicking it opens the page". `stubMatchMedia(390, 844)` (restored after each test). The shell doubles from `createShellTestDoubles()`, the three reads answered by `installProvidersServer` with no providers, no presets and `appDefault: null`. Render `App` with `provideRouter(APP_ROUTES)` and the doubles' providers, as `core-gate.spec.ts` does (lines 26 to 47). The bottom nav has an `a` with `href="/providers"` whose `span` text is `Providers` and whose `mat-icon` text is `tune` (as `core-gate.spec.ts` C2 checks its icon). Click it; `vi.waitFor(() => expect(router.url).toBe('/providers'), { timeout: 5000 })`, then the `h2` text is `Model providers`. Then `resize(1280, 800)` and settle (as `app-nav.spec.ts` lines 102 to 106 do); the item is still there.

**R3** (`providers-route.spec.ts`), "at 390 by 844 the page hosts the panel: its title, the App default select with the stored default, and a choice posts it". `stubMatchMedia(390, 844)`. Two read views built with `readView` (`providers-test-server.ts` line 17) from two `ProviderConfig` literals: `{ id, kind: 'openai-compatible', baseURL, model: '', ...PROVIDER_DEFAULTS }` as `providers-host.spec.ts` builds its `MY_LOCAL_LLAMA`. `installProvidersServer` registers them with `presets: []` and `appDefault: { providerId: first, model: '' }`. Also `POST /api/providers/app-default` answered with `{ appDefault: { providerId: second, model: '' } }`. `RouterTestingHarness.create('/providers')` with `provideRouter(APP_ROUTES)` and the doubles. Check: the `h2` text is `Model providers`; the only `select` on the page (the App default select; the model picker exists only with a form open) has the first id as its value. Set its value to the second id, dispatch `change`, settle. The recorded requests contain one `POST /api/providers/app-default` whose body is `{ providerId: second, model: '' }`; the select then shows the second id.

**B1** (step 8, the stats check). Criterion 2a's build half, as the four assertions of section 3, step 8. Seam: files on disk (`browser-stats.json`, `browser/index.html`), as SHL-09's C2' does.

**E1** (`e2e/specs/providers-phone.e2e.ts`), one test titled `the providers page fits 390 by 844, its nav item opens it, and the app default switches`. `test.use({ viewport: { width: 390, height: 844 } })` (as `projects-phone.e2e.ts` line 7). The helper `expectReachable` is the one in `projects-phone.e2e.ts` lines 9 to 15 (visible, enabled, scrolled into view, `toBeInViewport({ ratio: 1 })`). A `pageerror` listener collects errors, as that spec does. Steps, in order:
1. Sign in: read `SCRIBA_E2E_LIBRARY/.scriba/setup-url` and `page.goto(setupUrl)`, as `projects-phone.e2e.ts` lines 23 to 28 do.
2. Read the app default with `page.request.get('/api/providers/app-default')`; keep its `appDefault` and expect it is not null.
3. Create a provider with `page.request.post('/api/providers', { headers: { origin: 'http://127.0.0.1:8080' }, data })`. The `origin` header is required: the Setup & auth guard refuses an unsafe method whose `Origin` is not the Host's origin (`apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 65 to 72; `request-policy.ts` lines 14 to 19; the `baseURL` of `e2e/playwright.config.ts` line 20), and `page.request` sends none; `plans/AGL-08.md` line 34 sends the same header. `data` is `data` is `{ label: 'Phone check', kind: 'openai-compatible', baseURL: \`${process.env.SCRIBA_E2E_MOCK_URL}/scenario/tool-call/v1\`, model: 'mock-model', temperature: 0.7, contextSize: 64000, maxTokens: 4096, timeout: 120000, retries: 2 }`. Expect status 201; the new id is the `id` of the body. The five numbers are `PROVIDER_DEFAULTS` (`packages/contracts/src/providers/defaults.ts` lines 5 to 9), written literally because e2e has no contracts dependency (`plans/AGL-08.md` line 33). `label` is enough for the id (`config.ts` lines 50 to 63). The mock's `tool-call` scenario answers its models route with 200 (`e2e/harness/global-setup.ts` lines 89 and 90; route at `e2e/fixtures/mock-openai/server.mjs` line 225).
4. Nav: `page.goto('/projects')`; the link `page.getByRole('navigation', { name: 'Bottom navigation' }).getByRole('link', { name: 'Providers', exact: true })` is `expectReachable`; click it; `expect(page).toHaveURL(/\/providers$/)`.
5. Page: the heading `Model providers` (`getByRole('heading', { name: 'Model providers', exact: true })`) is visible; `expectReachable(page.getByLabel('App default', { exact: true }))`; the row of the new id is visible. The row is the `li` of `ul[aria-label="Providers"]` whose `.provider-id` text is the id, as `projects-phone.e2e.ts` lines 56 to 59 find their rows.
6. Switch: wait for the `POST /api/providers/app-default` response (`page.waitForResponse`, set up before the action), `selectOption(newId)`; expect status 200; the row shows the text `Default` (`exact: true`); `page.request.get('/api/providers/app-default')` has the new id.
7. Edit and test: in the row, click `Edit`; `expectReachable` for the `Save` and `Test connection` buttons (`exact: true`, texts of `providers-texts.ts` lines 47 and 74); click `Test connection`; the heading `Connection test` (line 78) is visible. This checks the result block at phone width (MPR-10's note, `plans/MPR-10.md` line 104).
8. Fit: `document.documentElement.scrollWidth <= window.innerWidth` is true; the error list is empty.
9. Restore: `page.request.post('/api/providers/app-default', { headers: { origin: 'http://127.0.0.1:8080' }, data: { providerId, model } })` with the values of step 2; expect status 200. (The switch of step 6 is the page's own request, so the browser sends `Origin` itself; the GETs of steps 2 and 6 are safe methods.)

The e2e files run in name order on one worker (`e2e/playwright.config.ts` lines 11 and 13), so E1 runs after `journey.e2e.ts` and before `search-phone`, `setup-phone` and `tools-preview`. No other spec reads the provider list or the app default: the reviser's `grep -rn "provider\|app-default\|tool-call" e2e/specs` at `122a9ff` finds `setup-phone.e2e.ts` lines 240, 245 and 276 (the static providers step text and its step state) and the owner comment of `journey.e2e.ts` line 95, nothing else. AGL-08 (planned) writes provider state in the journey, which runs before E1; E1 reads the default it finds instead of assuming the seeded one, so it holds in either merge order. No spec uses the mock's `tool-call` scenario, so E1's connection test in step 7 disturbs no other spec.

### 4b. Controls (step 9; each must make the named test fail)

- **M1 (lazy broken).** In `app.routes.ts`, replace the `providers` entry's `loadChildren` by `component: ProvidersPage`, with `ProvidersPage` imported statically from `./features/providers/providers-page`. Expected: R1 fails (`loadChildren` is undefined, `component` is defined); B1 fails at (b) and (c), because the page sits in the main bundle, which `index.html` references and nothing imports dynamically.
- **M2 (phone gate dropped).** Remove `minDeviceClass: 'phone'`. Expected: R1 fails.
- **M3 (no nav).** Remove the `nav` object. Expected: R1 and R2 fail.
- **M4 (entry below `**`).** Move the entry after `{ path: '**', ... }`. Expected: R2 and R3 fail (the not-found page shows).
- **M5 (panel not hosted).** Remove `<app-providers-panel />` from `providers-page.ts`. Expected: R3 fails (no select).

### 4c. What the tests do not prove

- The real layout at 390 by 844 is proved only by E1, and only for the five-item bottom bar. That is the bar of every app-level URL, `/providers` included: `navItems` adds the project items only when the URL has a project id (`shell/app-nav.ts` lines 48 to 73), so the app default is always switched with five items. The seven-item bar of a project URL is not measured (section 6, point 3). Desktop layout is not measured.
- The tailnet path (story 31) and the phone's own browser are not exercised; the e2e runs Chromium at a phone viewport.
- The Angular build's CommonJS warnings are compared with the baseline count, not with a warning list. A warning that replaces another with the same count would pass.
- R3 shows the wiring of the page and the panel, not the panel's own behaviour (MPR-09's E5 covers that).

## 5. Agreement with downstream units and with other plans

- **MPR-13 (project model panel; `units/MPR-13-project-model-panel.md` lines 7 and 17).** Blocked by MPR-11 and MPR-12, so it merges after this unit. Its unit puts a "This project" section on the `/providers` page. Its change: one element after `<app-providers-panel />` in `providers-page.ts`'s template, its own component in a new file, its copies appended to `providers-copies.ts` with parity cases (`plans/MPR-09.md` section 5 and section 8 row; `plans/MPR-10.md` line 106). This plan creates `providers-page.ts`; MPR-13 edits it later, adding after the panel element, so the two changes touch different lines. If the two branches conflict in `providers-texts.ts` (the end of `TEXTS`), both keep their keys.
- **MPR-12 (project override API; `units/MPR-12-project-override-api.md` line 8).** Parallel. It works in `apps/api` and the contract; no path of section 2 is in its scope. Its `parallel_with` entry for MPR-11 holds.
- **MPR-10 and MPR-09 (done).** This plan changes neither. The panel, its form and its copies are the ones they left (section 2, "must not change"). MPR-10's result block is checked at phone width by E1 step 7 (`plans/MPR-10.md` line 104).
- **SAU-12 (providers step; `units/SAU-12-providers-step.md` lines 7, 15 and 21).** It is not yet planned (no `plans/SAU-12.md`, no `unit/SAU-12` branch), and its unit names no file, so no overlap with section 2 is known. Until its embed lands it links to `/providers` (its line 21); that link now resolves to this route. Its `blocked_by` entry for this phase is `"Model providers phase:settings-ui (to embed; link to /providers until then)"`, and MPR-11's `unblocks` has `"Setup & auth phase:setup-flow providers embed"`. Neither carries a unit id, so both are informative only (`units/README.md` line 65) and neither changes this plan (section 6, point 4).
- **SAU-15 (settings page, done; `plans/SAU-15.md` lines 50 and 164).** It embeds the panel from the entry file (`settings-page.ts` line 13). The export stays.
- **SAU-16 (setup-flow gate; `units/SAU-16-setup-flow-gate.md` line 23).** Unaffected: it checks that the providers step renders the panel.
- **AGL-07 (chat panel, done).** Its `/providers` link (`chat-page.ts` line 300) now opens the page. Nothing else changes.
- **Other draft or planned plans that touch e2e, routes or the web app.** Checked by `grep` of `plans/` for the paths of section 2 and by reading each file table:
  - `plans/AGL-08.md` (planned): `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` (new), `e2e/specs/journey.e2e.ts` (edit: the agent-run body), `apps/api/test/agent-loop-run.test.ts` (edit); its lines 63 to 65. Its journey sets the app default to its own mock provider and runs before E1 (name order). E1 reads the default first and restores it, so E1 leaves whatever the journey set. Either order is correct.
    AGL-08's line 40 lists the specs that run after the journey and says none reads provider state; after this unit `providers-phone.e2e.ts` is one more of them. It reads the app default but needs no particular value and restores it, so AGL-08's statement stays correct in effect and its plan needs no change.
  - `plans/SHL-22.md`: done since revision 1 (`b51c966`, `122a9ff`). Its four spec files are not in section 2. Its rule for load-sensitive waits is followed by the new spec (D7).
  - `plans/PLT-21.md` (planned): `scripts/examples-check/*.mjs` and `scripts/examples-check-graph.test.mjs` (its lines 45 to 48). No web or e2e path. Either order is correct. Step 10's root `npm run lint` runs `lint:examples`, which PLT-21 changes; a failure there is outside section 2 and is reported, not fixed (step 10).
  - At `122a9ff`, `grep -l '^status: \(draft\|planned\)' plans/*.md` lists `AGL-08.md`, `PLT-21.md` and this plan only.

## 6. Open points, settled by the reviser (2026-11-16)

1. **Nav item values. Settled: keep `Providers`, `tune`, `50`.** The label and the order are free choices that no unit, module file or decision fixes (`plans/DECISIONS.md` has no MPR-11 entry on them; `modules/shell.md` line 58 names the route "Model providers" and says only "yes (nav)"). Order 50 is free and puts the item between Tools and Settings. The icon was checked in the font file (D1); it is no longer an assumption.
2. **Title level. Settled: keep the `h2`.** The toolbar's `<h1>Scriba</h1>` (`app.html` line 2) is the document's `h1`; most feature pages use `h2` under it (D5). MPR-09 D14 describes the panel (it renders no `h1`) and is not a criterion; the settings host (SAU-15, done) does not follow it either. The panel's sections stay `h2` (no MPR-09 file changes).
3. **Seven items with a project open. Settled: not measured in this unit.** Criterion 2c is about switching the app default, which happens on `/providers`, an app-level URL; there the bar always has five items (`shell/app-nav.ts` lines 48 to 73: project items only with a project id in the URL). Criterion 2b ("appears in nav") is a presence check, done by R2 and E1 step 4. The layout of the seven-item bar is the Shell nav's (SHL), outside this unit's criteria, and measuring it would need a project fixture in E1. Recorded in section 4c.
4. **The quoted unblocks entry. Settled: no change to either unit.** Both entries are quoted and carry no unit id, so both are informative only (`units/README.md` line 65); the plan depends on neither. No reviser action applies: the front matter is neither a scope item nor a decision, and nothing in it is in the way of a correct plan. The mismatch is passed to the orchestrator (READY reply).
5. **CodeMirror and the Shell barrel. Settled: no change to MPR-09 files; B1 (d) stays as the check.** The reviser's build at `122a9ff` shows no `@codemirror/` bytes in any JS output, and the chunk that already carries the providers panel (through the settings page, with the same barrel imports) has no CodeMirror, zod or contracts bytes (section 3, step 8). If B1 (d) still fails, the implementer stops and reports; the fix (direct imports from `shell/tokens` and `shell/api-error`) is then a separate decision, because it edits files outside section 2.
6. **The e2e must run. Settled: an unrun E1 blocks the unit.** E1 is the only real-viewport proof of criterion 2c (MPR-09 open point 9; `plans/MPR-10.md` line 130: "phone width is MPR-11's check"). The stop rule of step 7 applies. In this environment Chromium 1254, the revision Playwright 1.65.0 expects, is installed, and port 8080 was free when the reviser checked.
7. **Chunk naming in B1.** No change (B1 (c) does not depend on file names).
8. **Shared state in e2e. Confirmed, with one correction.** No other spec reads provider state (section 4, after E1). The correction: the two POSTs of E1 (steps 3 and 9) must send `origin: http://127.0.0.1:8080`, or the guard refuses them; revision 1 said wrongly that the API has no Origin check.

## 7. Facts checked and assumed

### 7a. Checked by the planner (reading, `grep`, `sed`, `git`; nothing was built, installed or tested)

Repository and state: `git log --oneline -4` at planning showed `e11ca95` as HEAD and `aae7026`, `041c6f1`, `418fe6f` before it; `git diff --name-only aae7026 HEAD -- apps e2e packages units modules` printed nothing. `git status --short` printed nothing at the start.

Reviser (revision 2, `main` at `122a9ff`): re-read the unit, `modules/providers.md`, `units/README.md` lines 59 to 65, 93 and 138, `units/MPR-13-project-model-panel.md`, `units/SAU-12-providers-step.md`; `grep -n "MPR-11" plans/DECISIONS.md` (lines 2949, 3151, 3152; nothing settles the nav values, the title level or the e2e). Code re-checked: `app.routes.ts` (whole file), `providers.routes.ts`, `providers-texts.ts` lines 12 to 30, 44 to 50, 72 to 80, `providers-panel.ts` lines 55 to 160 and 230 to 242 (the select posts `{ providerId, model: '' }`), `providers-test-server.ts` lines 15 to 70, `shell/index.ts`, `shell/app-nav.ts` lines 25 to 80 and 180 to 200, `shell/device-class.ts` lines 120 to 175, `setup-page.spec.ts` lines 360 to 380, `core-gate.spec.ts` lines 20 to 50, `e2e/specs/projects-phone.e2e.ts`, `e2e/playwright.config.ts`, the guard and request policy of Setup & auth, `apps/web/angular.json` lines 30 to 48. Run: a production build of `apps/web` with `--stats-json` into `/tmp` (results in section 3, steps 2 and 8), a ligature read of the Material Icons font (D1), the Playwright Chromium lookup (section 6, point 6).

Unit and module files:
- `units/MPR-11-providers-route-gate.md` lines 2 to 9 (front matter), 12 (heading), 14 (closes the phase), 17 (S1), 18 (S2), 21 and 22 (the two criteria). No revision note.
- `units/MPR-09-providers-panel.md` line 9 (`unblocks: [MPR-10, MPR-11]`), lines 18 to 20 (standalone, contents, Material and phone), lines 23 to 26 (criteria, ticked).
- `units/MPR-10-connection-test-ui-hints.md` lines 9 (`unblocks: [MPR-11]`), 15 to 17 (test button, Ollama hints), 20 and 21 (criteria, ticked).
- `units/MPR-12-project-override-api.md` line 8 (`parallel_with` lists MPR-11).
- `units/MPR-13-project-model-panel.md` lines 7 (`blocked_by: [MPR-11, MPR-12]`), 8 (`parallel_with: []`), 14 (closes the phase), 17 (the "This project" section on `/providers`), 20 (refresh on `project-switched`).
- `units/SAU-12-providers-step.md` lines 7 (blocked_by text), 15 (embed; link until), 21 (link criterion). `units/SAU-15-settings-page.md` line 16. `units/SAU-16-setup-flow-gate.md` line 23.
- `units/README.md` lines 59 to 65 (blocker notation; line 64 `unblocks` inverse; line 65 quoted entries informative), 93 (phase table row), 138 (testing convention).
- `modules/providers.md` lines 7 (ordering), 33 (module shape), 45 (UI seam). `modules/shell.md` lines 52 (route table heading), 58 (`/providers` row), 92 (seam).
- `plans/SHL-01.md` line 202 (route table row for MPR-11). `plans/SHL-05.md` line 39 (decision 11, nav content). `plans/SHL-09.md` lines 26, 106 to 108, 141 (lazy check method and C2'), and line 110 (control N3, the precedent of M1).
- `plans/MPR-09.md` lines 3 (status done), 70 (S13), 71 (S14), 77 (D1), 78 (D2), 80 (D3), 110 (D14), 112 (D16), 147 (step 6), 221 (section 5, MPR-11), 232 (open point 3), 238 (open point 9), 313 (shared-files row for `features/providers/`).
- `plans/MPR-10.md` lines 3 (status done), 64 ("Not changed", includes `app.routes.ts`), 104 (MPR-11 and MPR-13 notes), 130 (open point 9 resolved).
- `plans/SAU-15.md` lines 50 (D5, embed), 164 (MPR-11 keeps the export). `plans/AGL-07.md` line 47 (D11, the `/providers` link).
- `plans/AGL-08.md` lines 3 (status planned), 33 (create body and literal defaults), 63 to 65 (its file table). `plans/SHL-22.md` lines 3 (planned), 40 to 43 (its file table). `plans/PLT-21.md` lines 3 (planned), 45 to 48 (its file table).
- `plans/DECISIONS.md`: `grep -n "MPR-11"` gives lines 2949 and 3151. The plan also searched for `option (b)`, `copies live`, `Opus review` and `MPR-09` and read the ranges of those hits: 2935 to 2960 (the MPR-09 review, item 1), 3135 to 3160 (the Navigator's option (b) and its reason), 3180 to 3186 (the driver's entry on the copies' location), and 2836 (the SHL-09 review: 505.56 kB, the three warnings, and the `node -I` note). Nothing else of the file is relied on.

Code on main:
- `apps/web/src/app/app.routes.ts`: lines 11 to 38 (`PROJECT_ROUTES`), 40 to 43 (doc comment), 44 (`withDeviceGate([`), 18, 31, 70, 95, 108, 121 (nav orders), 77 to 88 (setup), 89 to 101 (settings), 102 to 114 (projects), 115 to 127 (tools), 128 (`**`).
- `apps/web/src/app/shell/route-data.ts` lines 4 to 9, 11 to 19, 12 and 13.
- `apps/web/src/app/shell/app-nav.ts` lines 36 to 46 (`navItem`), 44 (default `tablet`), 52 to 73 (`navItems`), 188 (sort).
- `apps/web/src/app/shell/device-class.ts` lines 126 to 137 (guards), 139 to 147 (doc), 148 to 150 (`withDeviceGate`), 152 to 171 (`gateRoute`), 167 (loader wrap).
- `apps/web/src/app/features/providers/providers.routes.ts` lines 1 to 3 (comment, re-export).
- `apps/web/src/app/features/providers/providers-texts.ts` lines 12 (`TEXTS`), 13 (`heading`), 25 (`appDefaultLabel`), 27 (`defaultBadge`), 30 (`edit`), 47 (`save`), 74 (`testConnection`), 78 (`testHeading`), 89 (`} as const;`).
- `apps/web/src/app/features/providers/providers-panel.ts` lines 11 (import of `TEXTS`), 21 (selector), 61 (`<h2>`), 72 (`ul aria-label`), 134 (`mat-label` App default).
- `apps/web/src/app/features/providers/providers-test-server.ts` lines 9 to 11 (no vitest, types only), 17 to 25 (`readView`), 47 to 64 (`installProvidersServer`).
- `apps/web/src/app/features/providers/providers-store.ts` line 12 (`API_CLIENT` from `../../shell`), `providers-panel.ts` line 9 (`ApiError` from `../../shell`), `providers-copies.ts` line 13 (`import type` from `../../shell`). `prompt.md` line 118 (the driver's worktree rule for `unit/<ID>`).
- `apps/web/src/app/features/providers/providers-host.spec.ts` lines 16 (import of `ProvidersPanel` from `./providers.routes`), 86 and 105 (C4a and C4b), and the `.provider-id` selector in `rowIds`.
- `apps/web/src/app/features/providers/providers-panel.spec.ts` line 116 (`appDefaultSelect`).
- Runtime imports: every import of `@bbartolome/scriba-contracts/providers` in a non-spec file is `import type` (checked with an `awk` over the import lines: `connection-test-result.ts`, `provider-form.ts`, `providers-copies.ts`, `providers-panel.ts`, `providers-store.ts`, `providers-test-server.ts`). The runtime ones are in specs (`connection-test.spec.ts`, `providers-copies.spec.ts`, `providers-host.spec.ts`, `providers-panel.spec.ts`) and `apps/web/src/contracts-boot.ts` line 6, which `apps/web/src/main.ts` (lines 1 to 5) does not import.
- `apps/web/src/app/app.html` lines 1 to 4 (toolbar with `<h1>Scriba</h1>` on line 2).
- `apps/web/src/app/app.config.ts` line 20 (`provideRouter(APP_ROUTES)`).
- Feature heading levels: `features/project-store/files-page.ts` line 176 (`h2`), `project-picker.ts` line 110 (`h2`), `features/setup-auth/settings-page.ts` lines 13 (import), 55 (`h2`), 93 (`h3` "Model providers"), `shell/core-gate/core-gate.ts` line 6 (`h2`), `features/agent-loop/chat-page.ts` lines 224 (`h1`) and 300 (`/providers` link), `features/tool-registry/tools-preview.ts` line 129 (`h1`), `chat-page.spec.ts` line 384.
- `apps/web/src/app/features/project-store/project-store.routes.ts` lines 14 and 15 (comment), 16 to 23 (`filesRoutes`, lazy page).
- `apps/web/src/app/features/setup-auth/setup-page.spec.ts` lines 20 (import of `APP_ROUTES`), 363 to 376 (X3, structural).
- `apps/web/src/app/core-gate.spec.ts` lines 26 to 47 (render of `App`, nav link by span text, `vi.waitFor` with `{ timeout: 5000 }`).
- `apps/web/src/app/shell/app-nav.spec.ts` lines 10 (import of `stubMatchMedia`), 68 to 73 (`SIZES`), 75 to 83 (resize and restore), 102 to 106 (`settle`).
- `apps/web/src/app/app.routes.spec.ts` lines 12 to 26 (`RouterTestingHarness` pattern).
- `apps/web/src/app/shell/testing/match-media.ts` lines 67 (`stubMatchMedia`) and 99 (`restoreMatchMedia`). `apps/web/src/app/shell/testing/test-doubles.ts` lines 43 (`FakeApiClient`), 45 (`requests`), 49 (`respond`), 187 (`createShellTestDoubles`).
- `apps/web/src/app/shell/index.ts` lines 2 to 14 (exports; `API_CLIENT` at 3, `ApiError` at 5, `DiffView` at 13, `MarkdownEditor` at 14).
- `apps/web/src/app/shell/app-nav.ts` line 31 (phone form `bottom`).
- `apps/web/tsconfig.app.json` lines 6 (`"types": []`), 8 (`include`), 9 (`exclude` of specs). `apps/web/angular.json` lines 16 to 22 (build options), 55 (`allowedCommonJsDependencies` for `contracts-boot` only).
- `apps/web/src/styles.css` line 2 (`@fontsource/material-icons`).
- `packages/contracts/src/providers/defaults.ts` lines 4 to 10 (`PROVIDER_DEFAULTS`; values 5 to 9). `packages/contracts/src/providers/config.ts` lines 50 to 63 (`providerCreateSchema`; a `label` or `presetId` is required).
- `apps/api/src/modules/providers/providers.registry.ts` lines 84 to 89 (`setAppDefault` stores `{providerId, model}`). `apps/api/src/modules/providers/providers.controller.ts` lines 55 to 56 (create, 201). The reviser corrected the planner's "no `Origin` check": `apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 65 to 72 refuse an unsafe method whose `Origin` is not `policy.originFor(host)`; `request-policy.ts` lines 14 to 19 build `http://127.0.0.1:<port>` and `http://localhost:<port>`.
- E2e: `e2e/playwright.config.ts` lines 11 (testMatch), 12 (globalSetup), 13 (`workers: 1`). `e2e/harness/global-setup.ts` lines 19 to 41 (setup), 21 (`buildWorkspaces`), 27 to 34 (API and mock; line 33 sets `SCRIBA_E2E_MOCK_URL`), 60 to 72 (builds contracts, API, web), 88 to 95 (`checkMock`; `tool-call` models probe at 89 expects 200, reset at 93). `e2e/fixtures/mock-openai/server.mjs` lines 211 (chat route) and 225 (models route). `e2e/specs/projects-phone.e2e.ts` lines 7 (viewport), 9 to 15 (`expectReachable`), 23 to 28 (sign-in), 40 (`goto /projects`), 56 to 59 (row helper), 81 to 84 (fit check). `e2e/specs/phone-toolbar.e2e.ts` lines 6 and 8 (viewport). `e2e/specs/setup-phone.e2e.ts` lines 240 and 245 (providers step text and step), 276 (`steps.providers`). No spec in `e2e/specs/` reads the provider list, the app default or the `tool-call` scenario (`grep -rln "providers\|app-default\|tool-call" e2e/specs` names `setup-phone.e2e.ts` only, for lines 240 to 276).
- `e2e/package.json` line 10 (`"e2e": "playwright test"`). Root `package.json` lines 23 (`build`) and 29 (`"e2e"`).

### 7b. Assumed, not checked here

- A1. Checked by the reviser (D1): `tune` is a ligature of the loaded font.
- A2. Playwright's `getByLabel('App default', { exact: true })` finds the native select inside `mat-form-field` (the label is associated through `matNativeControl`). The implementer confirms in step 7.
- A3. Chromium is available to `npm run e2e` in the implementer's environment, and port 8080 is free. Checked by the reviser on this machine (section 6, point 6); the implementer's run confirms it.
- A4. `npm run build -w @bbartolome/scriba-web -- --stats-json` writes `apps/web/dist/scriba-web/browser-stats.json` and `browser/index.html`, as `plans/SHL-09.md` line 107 records. The reviser's build (with `--output-path` in `/tmp`) wrote `browser-stats.json` at the output root and `browser/index.html`; the project is `scriba-web` (`angular.json` line 9), so the default path is `apps/web/dist/scriba-web/`.
- A5. The five-item bottom bar at 390 px (no project open) keeps every item inside the viewport; E1 step 4 measures it.
- A6. `page.request` shares the browser context's cookies, so the sign-in of step 1 covers the API calls of steps 2, 3, 6 and 9.
- A7. The create endpoint answers 201 with the read view, including `id`. `plans/MPR-09.md` S11 says so and the controller's status code (line 56) was read; the response body was not.
- A8. `FakeApiClient.requests` records the body of each POST as sent (MPR-09 S15 says so; not re-read here).
- A9. Corrected by the reviser: the SHL-09 record (505.56 kB, three warnings) no longer holds; the build at `122a9ff` gave 581.83 kB and two CommonJS warnings (section 3, step 2). Step 2 records the fresh baseline, which is what counts.
- A10. The eager bundle grows by one route entry only; the lazy page and its panel are not in the initial files (B1 checks it).
- A11. Tree shaking keeps CodeMirror out of the feature's chunk. Seen at `122a9ff` for the chunk that already holds the panel (section 6, point 5); B1 (d) checks it after the change.
- A12. `freeId` gives the id `phone-check` for the label `Phone check` (E1 reads the id from the body, so the plan does not depend on it).
- A13. The `ProvidersPage` template's whitespace and the `h2` tag do not change the rendered text that R2 and R3 read (`textContent` contains the title).

## Commit

The orchestrator commits this plan on `main`. The implementer does not change it.

## Review parts

One part; the plan is small.

- **Part 1 — the `/providers` route, its page, its nav entry and the gate checks.** Steps 0 to 11 of section 3. Tests: T1 (criterion 1); R1 and B1 (criterion 2a); R2 and E1 step 4 (criterion 2b); R3 and E1 steps 5 to 9 (criterion 2c); the controls M1 to M5 of section 4b.
