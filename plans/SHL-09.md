---
id: SHL-09
status: planned
---

# SHL-09 plan — core gate: dummy lazy feature, dev stack, e2e and demo

Unit: SHL-09 (module shell, phase:core, M1; `units/SHL-09-core-gate.md`). Revision 2 (Opus-approved 2026-11-14 after rejection 3 and the OP8 decision, DECISIONS commit `497ae35`): the Navigator's decisions of 2026-11-14 on the location (`shell/core-gate/`) and the e2e mode (amend modules/shell.md line 88); back to Opus approval. Status `draft`. Base: `main` at `3df4319` (`git rev-parse --short HEAD` when this revision was written; the Opus review of revision 2 ran at `ba32965`). The commits after `437769c` change only `plans/DECISIONS.md`, so the code is the same as at `437769c`, and the tree outside `plans/` was clean (F1). `plans/SHL-09.md` is untracked (this plan). The driver creates `unit/SHL-09` from `main`. This plan writes no code and changes only `plans/SHL-09.md`.

All eight blockers are done (F3): SHL-01 to SHL-08 each have `status: done`, so no workaround is needed. Two inputs that criteria 1 and 5 use are also done. The dev proxy (PLT-03) is not in `blocked_by`, but it is a transitive blocker: PLT-03 is in PLT-11's `blocked_by`, and SHL-01's `blocked_by` names PLT-11. The Playwright harness (PLT-13) is not in `blocked_by` at all, and no `blocked_by` in that chain names it. Open point 3 records this.

Tags: `[FACT Fn]` means checked in this session, with the file and line in section 7a. `[ASSUMED An]` means a step of section 3 tests it or section 7b lists it. `[DECISION]` means a choice made here, with its source. Line numbers were read with `sed -n`, `grep -n` or `cat -n` at writing time.

## 1. Decisions this plan follows

1. **The dummy stays on `main` and is the reference pattern.** The unit calls it "a dummy feature" (line 18), and SHL-05 plan item 17 says "the real dummy comes at the core gate". It is not `templateRoutes`, which is test-only (SHL-07 plan line 148). Later feature units copy its shape. Source: unit lines 18 and 26 to 27 (no criterion is ticked by removing it); SHL-05 plan line 47; SHL-07 plan line 148. [FACT F19] [DECISION]

2. **Route and nav data.** Path `/core-gate`, `scope: 'app'`, `minDeviceClass: 'phone'`, `nav: { label: 'Core gate', icon: 'science', order: 100 }`. The phone minimum puts the item in all three nav forms, which is what "shown in the nav" (unit line 18) needs. `order: 100` puts it last, because the nav sorts its items by `order`. Source: route-data.ts lines 4 to 19; device-class.ts lines 148 to 171 (a route with `data.scope` is gated at its `minDeviceClass`, and an absent value means `tablet`); app-nav.ts line 188 (sort); SHL-01 plan decision 10. [FACT F14, F15, F16] [DECISION]

3. **Location.** `apps/web/src/app/shell/core-gate/`. `core-gate.routes.ts` exports `coreGateRoutes`, and `core-gate.ts` holds the standalone page `CoreGatePage`. The file and export names follow SHL-01 decision 9 (`<m>/<m>.routes.ts`, export `<segment>Routes`). The folder is `core-gate`, because the dummy has no product module. It sits under `shell/` because the route table names its owner "Shell (SHL-09 dummy)" (decision 13), so it is the Shell's own code, and `modules/shell.md` line 42 says the Shell's own code lives outside `features/`. The switch page is the precedent: it already lives in `shell/` (`shell/switch-project.ts`, SHL-08). Source: modules/shell.md line 42; the Navigator's decision (A) in the DECISIONS entry "2026-11-14 — SHL-09 — the Navigator's decisions on the dummy page's location (A) and the e2e mode (B)"; SHL-01 plan decision 9 (line 28). [FACT F3, F47] [DECISION]

4. **The dummy's imports and the boundaries lint.** The dummy is the Shell's own code under `shell/`, which the boundaries lint does not cover: `eslint.config.mjs` lines 27 to 41 cover only `src/app/features/*` and `src/modules/*` (elements and entry files), and rule R1 (lines 50 to 68; the rule opens at line 45) applies to web features only, on the web side; the api-module policy (`eslint.config.mjs` lines 51 to 59) is separate. The dummy still imports only `@angular/core` and `@angular/router` (its routes file also imports its sibling `./core-gate`), which is a plan choice, not a lint requirement. Source: eslint.config.mjs lines 27 to 41 and 45 to 70; the Navigator's decision (A) in the DECISIONS entry of 2026-11-14. [FACT F42] [DECISION]

5. **Route shape.** One entry in `APP_ROUTES`, between the `projects/:projectId` entry and the final `**` (app.routes.ts lines 35 and 36). App-level entries go above `**` (SHL-01 decision 8). The entry is `{ path: 'core-gate', pathMatch: 'full', data: { ... } satisfies ShellRouteData, loadChildren: () => import('./shell/core-gate/core-gate.routes').then((feature) => feature.coreGateRoutes) }`, and `coreGateRoutes` is `[{ path: '', pathMatch: 'full', component: CoreGatePage }]`. A feature's `loadChildren` loads only its own export (SHL-01 decision 9). Source: SHL-01 plan decisions 8 and 9; app.routes.ts lines 16 to 37. [FACT F9] [DECISION]

6. **The lazy claim is checked on the build stats, not in a rendered test.** The unit says "checked on the build stats" (line 18). A rendered test cannot see chunks. So criterion 2 has two named checks: C2 (rendered: the nav item and its page) and C2' (the stats: its own chunk, not in the initial bundle). Source: unit line 18; SHL-01 plan line 195 ("SHL-09 checks the lazy chunk on the build stats"). [FACT F39] [DECISION]

7. **The rendered test sits at the top level.** `apps/web/src/app/core-gate.spec.ts`, not in `shell/core-gate/`. It renders `App` with `APP_ROUTES`, and the App-level specs import the route table: `app.routes.spec.ts` imports `./app.routes` (line 6), and `shell/app-nav.spec.ts` imports `../app` and `../app.routes` (lines 5 and 6). The placement is a choice, not a lint requirement, since `shell/` is outside the boundaries lint (decision 4). The lint itself is checked in step 6 (A15). Source: app.routes.spec.ts line 6; shell/app-nav.spec.ts lines 5 and 6; eslint.config.mjs lines 27 to 41. [FACT F42, F43] [DECISION]

8. **Criterion 1 is three named dev-stack checks, run by hand and not committed.** D1 to D3 (section 4) are `curl` commands against `npm run dev`. The browser checks of SHL-04 (step 9) and SHL-05 (item 17) ran outside the repo, and this unit does the same. The static half of the proxy is already in `scripts/web-proxy.test.mjs`, which root `npm test` runs (package.json line 25). Source: SHL-04 plan step 9; SHL-05 plan item 17; scripts/web-proxy.test.mjs lines 14 to 37. [FACT F27] [DECISION]

9. **Criterion 3 is a named list.** Section 4 maps each sub-claim of SHL-02 to SHL-08 to the test that asserts it. Each test must pass on the batch head. One sub-claim has no named test: SHL-04 criterion 1's "follow the OS setting" is CSS (`color-scheme`, material-theme.scss line 12), and SHL-04 checked it in a browser (SHL-04 plan decision 1). SHL-09 repeats that check as B-OS. Source: units SHL-02 (lines 25 to 27), SHL-03 (25 to 28), SHL-04 (20 to 21), SHL-05 (25 to 28), SHL-06 (19 to 20), SHL-07 (21 to 22), SHL-08 (22 to 24); SHL-04 plan decision 1. [FACT F19] [DECISION]

10. **Criterion 4 is the existing template.** T1 and T2 of `shell/testing/template-feature.spec.ts` are the run. `shell/testing/` does not change (SHL-07 plan section 2d). Source: unit line 20; SHL-07 plan section 2d. [FACT F18] [DECISION]

11. **Criterion 5 is the existing journey, unchanged.** `npm run e2e` runs it. Only the "app loads" step runs; the other steps are placeholders whose owners are named in comments. SHL-09 adds no step and edits no spec. Source: journey.e2e.ts lines 11 to 19 and 33 to 47; unit line 21. [FACT F23] [DECISION]

12. **Build stop rule.** The rule of SHL-08 as amended by the Navigator (DECISIONS 2681 to 2685): the production build exits 0 and the 1 MB error budget holds; the 500 kB initial-total warning is accepted; the CommonJS warnings are two. The warnings expected are the two CommonJS ones (zod, and the setup-auth import, SHL-08 plan A9) and, at 500 kB or more, the initial-total warning. Any other warning, or a build failure, stops the code stage and goes to the Navigator. The dummy's code sits in its lazy chunk. The eager additions are one route entry and one data object, a few hundred bytes. Source: angular.json lines 35 and 36; DECISIONS 2681 to 2685; DECISIONS 2712 to 2716 (I1 504.21 kB at the batch head). [FACT F37, F46] [DECISION]

13. **Route table row.** `modules/shell.md` gets the row `` `/core-gate` `` | Shell (SHL-09 dummy) | app | phone | yes after the `switch` row (line 62). The module says the table fixes the paths and each owner registers its own entry (line 47), so a new path needs its row. Source: modules/shell.md lines 47 and 49 to 62; SHL-08 plan decision 17 (precedent). [FACT F4] [DECISION]

14. **Red first, then controls.** C2 is written first and fails before the route exists. Then three negative controls (section 3, steps 4 and 7). N3 is the one that tests the lazy claim: C2 renders the same with an eager import, so C2' must catch it. Source: SHL-08 plan section 3, step 7 (precedent). [DECISION]

15. **Ticks and records are the coordinator's.** The code stage does not edit `units/` or `plans/DECISIONS.md`. The coordinator ticks the criteria (unit lines 17 to 21) and records the demo outcome at closure, as for SHL-08 (DECISIONS 2712 to 2716). Source: SHL-08 plan section 2d; DECISIONS 2712 to 2716. [DECISION]

16. **Demo steps run by hand and are recorded, not reworded.** The demo runs on `npm run dev`, and the outcome of each step is recorded at closure. A step that cannot run on `main` is recorded as blocked (section 6). The wording is the Navigator's (DECISIONS 1305 to 1308 is the precedent for step 4). Source: unit lines 25 to 31; DECISIONS 1305 to 1308. [DECISION]

17. **Branch and commit.** The driver creates `unit/SHL-09` from `main`. The implementer does not commit, push, add a remote, rebase or switch branches. Source: SHL-08 plan decision 18. [DECISION]

18. **The e2e mode: amend `modules/shell.md` line 88 (the Navigator's decision (B)).** Line 88 says the Platform's Playwright e2e "runs against the dev server, exercising the proxy, SSE through the proxy and nav". `e2e/playwright.config.ts` line 20 sets `baseURL` to `http://127.0.0.1:8080`, and `e2e/harness/global-setup.ts` lines 15 to 41 start the API on port 8080 serving the built web. The DECISIONS entry cites this file as `e2e/global-setup.ts`; the file is at `e2e/harness/global-setup.ts` (F24). The line is corrected in the Shell's own doc, in the SHL-09 code stage (not in this plan stage), to the replacement in section 2b, which is the Navigator's option (A) of 2026-11-14 (DECISIONS commit `497ae35`). Decision 13 (the route-table row) is unchanged. Source: DECISIONS entry "2026-11-14 — SHL-09 — the Navigator's decisions on the dummy page's location (A) and the e2e mode (B)"; modules/shell.md line 88; e2e/playwright.config.ts line 20; e2e/harness/global-setup.ts lines 15 to 41. [FACT F24, F25] [DECISION]

## 2. Files to create or change

### 2a. New files (3)

| Path | Purpose | Decision |
|---|---|---|
| `apps/web/src/app/shell/core-gate/core-gate.routes.ts` | Exports `coreGateRoutes: Routes = [{ path: '', pathMatch: 'full', component: CoreGatePage }]`. Imports only `@angular/router` and `./core-gate` | 3, 4, 5 |
| `apps/web/src/app/shell/core-gate/core-gate.ts` | Standalone `CoreGatePage`, selector `app-core-gate`. Template: `<h2>Core gate</h2>` and one paragraph, "A dummy lazy feature. It shows the registration pattern and its own chunk." No API call, no Shell import, and no word "Scriba" (the e2e heading check, FACT F23) | 3, 4 |
| `apps/web/src/app/core-gate.spec.ts` | C2, one named test (section 4) | 6, 7 |

### 2b. Changed files (2 files, 3 edits)

| Path | Change | Decision |
|---|---|---|
| `apps/web/src/app/app.routes.ts` | Add `import type { ShellRouteData } from './shell/route-data';` after line 4. Insert between the `projects/:projectId` entry (its closing brace is line 35) and the `**` entry (line 36): `{ path: 'core-gate', pathMatch: 'full', data: { scope: 'app', minDeviceClass: 'phone', nav: { label: 'Core gate', icon: 'science', order: 100 } } satisfies ShellRouteData, loadChildren: () => import('./shell/core-gate/core-gate.routes').then((feature) => feature.coreGateRoutes) },`. Nothing else in the file changes | 2, 5 |
| `modules/shell.md` | Route table: add the row `` `/core-gate` `` \| Shell (SHL-09 dummy) \| app \| phone \| yes after line 62 | 13 |
| `modules/shell.md` line 88 (found by its text, `^- System: Platform's Playwright e2e`, not by its number: the route-table row above moves it to line 89) | The line becomes exactly: `- System: Platform's Playwright e2e runs against the build the API serves on port 8080.` It replaces the line that starts `- System: Platform's Playwright e2e runs against the dev server`; no citation is added. The wording is the Navigator's option (A) of 2026-11-14 (DECISIONS commit `497ae35`); open point 8 is resolved. The change is made in the SHL-09 code stage, not in this plan stage. Nothing else in the file changes, and the SSE line above it is kept; decision 13 (the route-table row) is unchanged | 18 |

### 2c. Shared with other units

No file in 2a or 2b is one that a unit in section 5 edits. The units in section 5 add their own entries and copy the shape of 2a. The nav gains one item for every test that renders `APP_ROUTES`. The nav tests count the nav's children, not its items (app-nav.spec.ts line 218, N9), so they should be unaffected. Step 5 checks this by running them.

### 2d. Files that must not change

`apps/web/proxy.conf.mjs` (C1 checks it as it is); `apps/web/angular.json` (the stats option is a CLI flag, so no config changes); `apps/web/package.json`; `package-lock.json`; `eslint.config.mjs`; `apps/web/tsconfig.json`, `tsconfig.app.json` and `tsconfig.spec.json`; `apps/web/src/app/app.ts`, `app.html`, `app.config.ts`, `app.spec.ts`, `app.routes.spec.ts`; every existing file under `apps/web/src/app/shell/` (the new folder `shell/core-gate/` of 2a is the only addition there; including `shell/testing/`, `shell/index.ts`, `shell/app-nav.ts` and `shell/app-nav.spec.ts`); `apps/web/src/app/features/.gitkeep`; everything under `e2e/`, `apps/api/`, `packages/contracts/` and `scripts/`; everything under `units/`; `plans/DECISIONS.md`; `plans/SHL-0*.md`. Step 5b checks the list.

## 3. Method

Run from the repo root on `unit/SHL-09` (or on `main` if the driver has not created the branch). Do not commit, push or switch branches. Record `node -v` and `npm -v`. Each step names its files.

0. **Preconditions (no file change).**
   - `git status --short -- ':!plans'` prints nothing (other units' plans may be untracked during parallel work; precedent DECISIONS line 2515).
   - `node -v` prints `v26.x`.
   - `test -d node_modules/@angular/core` succeeds (F44).
   - `npm run build -w @bbartolome/scriba-contracts` exits 0, and `ls packages/contracts/dist/setup-auth/index.js` lists the file (`packages/contracts/dist` is absent at writing, F44; the specs and the production build need it).
   - `lsof -nP -iTCP:4200 -iTCP:8080 -sTCP:LISTEN` prints nothing. Steps 8 and 10 need both ports [ASSUMED A2].
1. **Baseline (no file change, before any edit).**
   - `npm test -w @bbartolome/scriba-web` exits 0. Record the passed count `B`. The batch head of SHL-08 had 85 of 85 in 19 files (DECISIONS 2712 to 2716).
   - `npm run build -w @bbartolome/scriba-web` exits 0. Record the `Initial total` as `I0` (504.21 kB at the batch head, DECISIONS 2712 to 2716) and the warnings `W0`: two CommonJS warnings and the initial-total warning.
2. **Red first (files: `apps/web/src/app/core-gate.spec.ts` only).** Write C2 (section 4). Run `npm test -w @bbartolome/scriba-web`. Expect exit 1 with C2 failing and every other test passing (the route does not exist yet, so the nav has no item).
3. **Write the files (sections 2a and 2b).** Then `npx prettier --write` on the five paths of 2a and 2b.
4. **Green, then negative controls.**
   - `npm test -w @bbartolome/scriba-web` exits 0. The passed count is `B + 1`.
   - Each control: `cp` the file to `/tmp/shl09-<name>.ts` (or `.md`), edit, run `npm test -w @bbartolome/scriba-web`, restore with `cp`, then `cmp` prints nothing.
   - N1: in `app.routes.ts`, `minDeviceClass: 'tablet'`. Expected: exit 1 with C2 failing at the phone nav check, and no other test failing.
   - N2: in `app.routes.ts`, remove the `nav` property. Expected: exit 1 with C2 failing, and no other test failing.
   - N3 is run in step 7, with a build. Its change: replace the `loadChildren` line with a static import `import { coreGateRoutes } from './shell/core-gate/core-gate.routes';` and `children: coreGateRoutes`. Expected: C2 still passes, and C2' fails in step 7.
5. **Static checks (no file change).**
   - a. `git status --short -uall -- ':!plans'` prints five lines: three starting `??` (2a) and two starting ` M` (2b). `-uall` lists each file of the new folder.
   - b. `git diff --quiet -- apps/web/proxy.conf.mjs apps/web/angular.json apps/web/package.json package-lock.json eslint.config.mjs apps/web/tsconfig.json apps/web/tsconfig.app.json apps/web/tsconfig.spec.json apps/web/src/app/app.ts apps/web/src/app/app.html apps/web/src/app/app.config.ts apps/web/src/app/app.spec.ts apps/web/src/app/app.routes.spec.ts apps/web/src/app/shell e2e apps/api packages/contracts scripts units plans/DECISIONS.md` exits 0.
   - c. `grep -rln "core-gate.routes" apps/web/src` prints only `apps/web/src/app/app.routes.ts`.
   - d. `grep -n "from '" apps/web/src/app/shell/core-gate/core-gate.ts apps/web/src/app/shell/core-gate/core-gate.routes.ts` prints only `@angular/` imports and `./core-gate`.
   - e. After the route-table row (section 2b, after line 62) and the line-88 replacement: `grep -n "^- System: Platform's Playwright e2e" modules/shell.md` prints one line, `89:- System: Platform's Playwright e2e runs against the build the API serves on port 8080.` (found by its text; the row moves it from line 88 to 89), and `git diff --numstat -- modules/shell.md` prints the two numbers `2` and `1`, tab-separated (two lines added, the row and the replacement; one removed, the old line 88).
6. **Lint, types and format (no file change).** `npm run lint -w @bbartolome/scriba-web` exits 0. `npx tsc --noEmit -p apps/web/tsconfig.spec.json` and `npx tsc --noEmit -p apps/web/tsconfig.app.json` each exit 0. `npx prettier --check` on the five paths exits 0.
7. **Production build and the lazy check (C2').**
   - `npm run build -w @bbartolome/scriba-web -- --stats-json` exits 0 (stop rule, decision 12). Record `I1` and `W1`. `ls apps/web/dist/scriba-web/browser-stats.json apps/web/dist/scriba-web/browser/index.html` lists both files [ASSUMED A3].
   - Run the C2' check (a script in `/tmp`, outside the repo, run as `node -I`). It reads `browser-stats.json` (an esbuild metafile, F39) and `browser/index.html`, and it asserts four things. (i) Exactly one output has an input whose path ends in `shell/core-gate/core-gate.routes.ts`; call its file name `X` [ASSUMED A4]. (ii) `browser/index.html` references no file whose basename is `X`. (iii) Some other output lists `X` in `imports` with `kind: 'dynamic-import'`. (iv) The page's input `shell/core-gate/core-gate.ts` is an input of `X`.
   - Expected: all four hold.
   - Control N3 (from step 4): apply it, rebuild with `--stats-json`, and expect C2 to pass and C2' to fail at (ii). Restore `app.routes.ts` from `/tmp`, rebuild, and expect C2' to pass again.
8. **Dev stack (criterion 1, C1).** Pre-check: the ports are free (step 0). Run `npm run dev` in its own terminal (root package.json line 24). Wait until `ng serve` prints `http://localhost:4200/`. Then:
   - D1. `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4200/` prints `200`, and `curl -s http://localhost:4200/ | grep -c '<app-root'` prints at least `1`.
   - D2. `curl -s http://localhost:4200/healthz` and `curl -s http://localhost:8080/healthz` print the same JSON, and its `status` is `ok` (proxy.conf.mjs line 28; FACT F26).
   - D3, unbuffered `/events`. The setup URL is in `.scriba-dev/.scriba/setup-url` (A10, A11). `curl -s -o /dev/null -D - -c /tmp/shl09-jar "$(cat .scriba-dev/.scriba/setup-url)"` prints a redirect status and a `Set-Cookie` line. Then open the stream in the background with `curl -N -m 6 -b /tmp/shl09-jar http://localhost:4200/events`, piping each line through a short `python3 -I` reader that stamps its arrival time (the macOS `date` has no `%N`). After 2 s, POST the echo: `curl -s -o /dev/null -w '%{http_code}\n' -b /tmp/shl09-jar -H 'Origin: http://localhost:4200' -H 'Content-Type: application/json' -d '{"count":1,"intervalMs":0}' http://localhost:4200/api/platform/echo`.
   - Expected for D3: the POST answers 2xx; the stream shows the `hello` frame within about 1 s of connecting (F28), and an echo frame within about 1 s of the POST. If an echo frame arrives only when the stream closes, `/events` is buffered: a failure to report, not to fix here.
9. **Demo (manual, on `npm run dev`; record each step; section 6 names the steps that cannot run on `main`).** Expected results are in section 4 under C1 and in the table below.
   - Step 1. Open `http://localhost:4200/`. Without the setup cookie, `/` goes to `/setup`, which is not-found on `main` until SAU-06 merges (F13, F30, F32). With the cookie and an incomplete setup, the same. With a complete setup, the landing reads `GET /api/project-store/active`, which does not exist on `main` (F35; open point 5), so the landing shows the error and stays on `/`. Record which of the three happens.
   - Before step 2, and so before step 3, open `.scriba-dev/.scriba/setup-url` in the browser (the setup link, A10). That gives the browser the setup cookie. The cookie is needed by `POST /api/setup-auth/continue` (setup-status.controller.ts lines 29 to 34), by `/events` and by the status probe (sse-client.ts lines 191 to 200). Without it, the probe's 401 sends `/core-gate` to `/setup`, so steps 5 and 6 cannot be shown.
   - Step 2. Runs on `main` as: complete setup through `POST /api/setup-auth/continue` with the handshake's cookie (it marks the remaining steps skipped; setup-status.controller.ts line 28), then open `/`. `/` shows the version, the health and the project-store error, and stays on `/`. Record the result. The health read needs no cookie (`/healthz` is public: setup-auth.guard.ts line 48; health.controller.ts line 8). The version read and the setup-status read answer 401 without a cookie (version.controller.ts line 11 has no `@Public`; setup-status.controller.ts line 22). The wording after PST-04 lands is open point 1.
   - Step 3. At `/core-gate`, select `Dark` in the theme toggle (theme-toggle.ts line 23), reload, and check that the choice holds and that `localStorage['scriba.theme']` is `dark` (theme.ts line 8). B-OS: with `System` selected, DevTools rendering emulation `prefers-color-scheme: dark` makes the page dark, and `light` makes it light (material-theme.scss lines 12, 26, 30).
   - Step 4. Set the viewport to 390 by 844. The bottom nav (`nav` labelled "Bottom navigation", app-nav.ts line 31) shows the "Core gate" item. The graphs leg and the canvas leg cannot run on `main` (open point 2). The larger-screen leg runs with a temporary tablet-minimum probe, created and deleted in the run and not committed (SHL-05 plan item 17); the page "This page needs a larger screen" appears (larger-screen.ts line 12).
   - Step 5. Stop the API process (find it with `lsof -nP -iTCP:8080 -sTCP:LISTEN`). Expect the "Reconnecting" label (connection-status.ts line 25), then the "Server unreachable" banner (connection-status.ts line 48). The dev proxy hook (proxy.conf.mjs lines 13 to 24) makes the browser see the stream end.
   - Step 6. Start the API again with the command in root package.json line 24 (the `node --watch apps/api/dist/main.js` part, with the same environment variables). Expect both to clear and one `[sse] tick` line in the console (sse-client.ts line 230), shown at the Verbose level (A9).
10. **e2e (criterion 5).** Stop the dev stack and check that the ports are free. `npm run e2e` exits 0. The global setup builds contracts, API and web, and starts the API on 8080 with a temporary library (global-setup.ts lines 15 to 41). The "app loads" step passes, and the other steps stay pending as before. The JSON report is `e2e/test-results/report.json` (ignored, F40). If Chromium is not found, record "not run" with the reason; criterion 5 stays unticked [ASSUMED A1].
11. **Full runs (no file change).** `npm test -w @bbartolome/scriba-web` exits 0 with count `B + 1`. The root `npm test` runs once; a failing API test that this unit does not touch is recorded as found on `main` and is not fixed here.
12. **Record (no file change).** Report `B`, `B + 1`, `I0`, `I1`, `W0`, `W1`, the result of C2' and of each control, the results of D1 to D3, the e2e result, the demo table with each step's outcome, and `git status --short -uall`. Do not commit.

## 4. Acceptance criteria tests

Each criterion has at least one named check. The seam for each is external behaviour, as units/README.md line 133 and `modules/shell.md` lines 84 to 89 require: HTTP responses, rendered UI through the Shell's fakes, files on disk (the build's stats) and the e2e run.

**Criterion 1** (unit line 17): "`npm run dev` serves the Shell; proxy, `/healthz` and unbuffered `/events` verified."

- **C1 The dev stack serves the Shell, `/healthz` and an unbuffered `/events`** (step 8: D1, D2, D3). Seam: HTTP through the dev proxy. Expected: D1 to D3 as written in step 8.
- **Static half (existing, run by root `npm test`).** `scripts/web-proxy.test.mjs`: "proxy config covers exactly /api, /healthz and /events" (line 14), "every proxy entry targets the API on port 8080" (line 18), "the web project serves with proxy.conf.mjs" (line 24), "only /events has a configure hook" (line 29).
- **Command.** The dev checks are run by hand. The static half: `node --test scripts/web-proxy.test.mjs` exits 0.

**Criterion 2** (unit line 18): "A dummy feature registered with one route-table entry is lazy-loaded (its own chunk), shown in the nav with its label and icon, and absent from the initial bundle (checked on the build stats)."

- **C2 The Core gate nav item shows its label and icon on a phone, and its URL opens its page** (`apps/web/src/app/core-gate.spec.ts`). Seam: `App` rendered through the Shell's fakes (decision 7): `createShellTestDoubles()` (test-doubles.ts line 187) provides the doubles' providers, `provideRouter(APP_ROUTES)`, and `stubMatchMedia(390, 844)` (match-media.ts line 67) in `beforeEach`, with `restoreMatchMedia()` (line 99) in `afterEach`, as device-class.spec.ts does (line 36). Steps: create `App`, `detectChanges()`, and `whenStable()`. In the nav (`nav` with the label "Bottom navigation") find the link whose text is "Core gate" and check that its `mat-icon` text is `science`. Then navigate to `/core-gate` (by clicking the link, with `vi.waitFor` for the URL) and check that the URL is `/core-gate` and that the `h2` text is "Core gate". Red first (step 2). Controls N1 and N2 fail it.
- **C2' The Core gate chunk is lazy: its own chunk, not in the initial bundle** (step 7). Seam: files on disk, the build's stats and `index.html`, as the unit names. Expected: the four assertions of step 7 hold. Control N3 keeps C2 green and fails C2'.
- **Command.** `npm test -w @bbartolome/scriba-web` (C2); the build with `--stats-json` and the `/tmp` check (C2').

**Criterion 3** (unit line 19): "Breakpoint gate, nav forms, API client, SSE demux, reconcile ticks, landing redirect, project-route reconciliation and theming criteria (SHL-02…SHL-08) all pass on `main`."

Seam: each unit's own named test, run on the batch head. The table gives every unit criterion with its named tests. A sub-claim with no asserting test is reported, not ticked. The spec files are under `apps/web/src/app/shell/` unless a path says otherwise.

| Unit and criterion (unit line) | Named test(s) and file |
|---|---|
| SHL-02 valid, typed error, schema mismatch (25) | `api-client.spec.ts`: "emits the schema output for a valid response"; "maps a Platform error body to an ApiError"; "reports a schema mismatch as an ApiSchemaError, not an ApiError" |
| SHL-02 401 goes to `/setup` (26) | `api-client.spec.ts`: "sends a 401 to /setup and still fails the call with an ApiError" |
| SHL-02 same-origin, credentials, no auth headers (27) | `api-client.spec.ts`: "sends same-origin requests with credentials and no auth headers" |
| SHL-03 envelopes reach only their module (25) | `sse-client.spec.ts`: "delivers an envelope only to its own module's stream"; "ignores an unknown module and malformed JSON without error" |
| SHL-03 one tick per drop-and-reopen, visible, online, pageshow (26) | `sse-client.spec.ts`: "ticks once on a re-open after a drop, and not on the first open"; "ticks once on visibilitychange to visible, and not when hidden"; "ticks once on online"; "ticks once on pageshow from the back/forward cache only" |
| SHL-03 CLOSED recreated with capped backoff after `/healthz` (27) | `sse-client.spec.ts`: "retries /healthz at 1, 3, 7, 15, 31, 61 and 91 s while it fails, and creates no stream"; "creates a new stream after /healthz and the status probe pass" |
| SHL-03 connection-state transitions (28) | `sse-client.spec.ts`: "walks connecting, open, reconnecting, open, closed, reconnecting, open" |
| SHL-04 light and dark follow the OS, override persists (20) | `theme.spec.ts`: "stores a click on Dark, and System clears the stored choice"; "applies a light choice stored on this device when the App loads". The OS leg: B-OS (below) |
| SHL-04 banner and snackbar render and dismiss (21) | `notices.spec.ts`: "shows a dismissible banner, and its Dismiss button removes it"; "shows a snackbar in the overlay, and its Dismiss action closes it within 1 s" |
| SHL-05 tablet item hidden on phone; its URL shows "larger screen" (25) | `app-nav.spec.ts`: "N6 hides a tablet item on a phone, and shows it on a tablet"; `device-gate.spec.ts`: "G1 keeps the URL on a phone and shows the page there; back returns to the start page" |
| SHL-05 resize keeps the open view and shows a notice (26) | `device-class.spec.ts`: "D1 keeps the open view and its unsaved text on a phone, and shows one notice" |
| SHL-05 bottom nav on phone, rail on tablet, side nav on desktop (27) | `app-nav.spec.ts`: "N1 shows the bottom nav on a portrait phone"; "N3 shows the rail on a tablet"; "N4 shows the side nav on a desktop" |
| SHL-05 `deviceClassGuard('tablet')` on a child blocks phones and allows tablets (28) | `device-gate.spec.ts`: "G2 refuses a tablet child on a phone and shows the page at the same URL"; "G3 shows a tablet child on a tablet" |
| SHL-06 stop shows Reconnecting then the banner; restart clears both and ticks once (19) | `connection-status.spec.ts`: "stopping the API shows Reconnecting, then the banner; restarting clears both and fires one reconcile tick" |
| SHL-06 component tests through the stubbed EventSource (20) | `connection-status.spec.ts`: "connecting and open show neither the indicator nor the banner"; "reconnecting and closed show their own labels, and a successful probe posts no banner"; "a closed stream posts the banner after the first recovery probe; ..." |
| SHL-07 fake response and live envelope in the template (21) | `testing/template-feature.spec.ts`: "T1 renders a value from a fake response, with the fake client injected"; "T2 updates live from a fake envelope, with no second request" |
| SHL-07 fakes reject a mismatched body like the real client (22) | `testing/test-doubles.spec.ts`: "rejects a mismatched body for GET and POST with an ApiSchemaError"; "gives the same ApiSchemaError as the real client for the same body" |
| SHL-08 landing routes by setup status and active project (22) | `landing.spec.ts`: "C1 routes by setup status and active project" |
| SHL-08 mismatched project shows the switch page; Switch and Go (23) | `project-route.spec.ts`: "C2 shows the switch page for a mismatched project; Switch activates and proceeds; Go goes to the active id" |
| SHL-08 `project-switched` moves an open project tab (24) | `project-switch-follow.spec.ts`: "C3 a project-switched event moves an open project tab to the same child path under the new id" |

- **B-OS (manual, step 9, step 3).** The OS leg of SHL-04 criterion 1: with `System` selected, emulated `prefers-color-scheme: dark` makes the page dark and `light` makes it light. Seam: the rendered page in a browser. Expected: both hold.
- **Command.** `npm test -w @bbartolome/scriba-web` exits 0 and includes every named test above. B-OS is recorded in step 12.

**Criterion 4** (unit line 20): "The feature route-test template runs under Vitest."

- **T1 and T2** (`shell/testing/template-feature.spec.ts`, lines 36 and 53). Existing, unchanged. They must pass in steps 1, 4 and 11.
- **Command.** `npm test -w @bbartolome/scriba-web`.

**Criterion 5** (unit line 21): "Platform's Playwright e2e still passes: its first step loads the Shell."

- **Journey "app loads"** (`e2e/specs/journey.e2e.ts`, lines 14 to 31). Seam: the browser against the production build, served by the API on 8080 (`e2e/harness/global-setup.ts` lines 15, 21, 27 and 35 (port, build, `startApi`, health wait); FACT F36). Expected: the heading "Scriba" is visible (app.html line 2, which sits outside the router outlet, so the landing's redirect does not affect it); no page error; the settings file exists (line 26). Without a setup cookie, `/` goes to `/setup` (not-found on `main`) and the heading still shows [ASSUMED A8].
- **Command.** Step 10: `npm run e2e` exits 0.

## 5. Agreement with downstream units

| Unit | What it needs from SHL-09 | Provided by this plan |
|---|---|---|
| SHL-10, SHL-11, SHL-12, SHL-13, SHL-17, SHL-18 (each `blocked_by` names SHL-09) | The gate merged; no shared file changed by the gate | Yes. Section 2 adds no shared component and no fake. |
| AGL-07, CEX-17, GRR-09, GRR-10, MPR-09, PST-09, PST-10, SAU-06, SAU-11, SAU-15, TRG-03, TRG-13 (each `blocked_by` names SHL-09) | The registration pattern (SHL-01 decision 9) and the nav data (route-data.ts lines 4 to 19) | Yes. Section 2a is the pattern. Each unit's path is its own; none is `/core-gate`. Each unit adds its own `features/<m>/` folder. |
| SHL-05 nav (done) | The nav gains an item | Yes. `app-nav.spec.ts` is unchanged; N9 counts the nav's children (line 218). Step 5 runs it. |
| SHL-07 fakes and template (done) | Used as they are | Yes. Section 2d lists `shell/testing/` as unchanged. |
| SHL-08 landing and guard (done) | `/` and the guard are not changed | Yes. The dummy sits at `/core-gate`, which the guard does not cover (the guard is on `projects/:projectId`, app.routes.ts line 33). |
| PLT-03 dev proxy (done; a transitive blocker through PLT-11) and PLT-13 e2e harness (done; not in `blocked_by`) | Criterion 1 uses the proxy; criterion 5 uses the harness | Used as they are. Open point 3. |

The unit's `unblocks` list (front matter line 9) has eighteen names. They are exactly the units whose `blocked_by` names SHL-09: the twelve feature units above and SHL-10, SHL-11, SHL-12, SHL-13, SHL-17 and SHL-18 (grep of `units/*.md`, F48). The README's inverse rule (units/README.md line 64) holds, so no unit's front matter changes.

## 6. Open points

1. **Demo step 2 wording after PST-04 lands. Owner: the Navigator.** Step 2 runs on `main` as set out in section 3, step 9. The facts: `/healthz` is public (setup-auth.guard.ts line 48; health.controller.ts line 8), so the health read needs no cookie. Without a cookie, the version read (`/api/platform/version`, version.controller.ts line 11, no `@Public`) and the setup-status read (setup-status.controller.ts line 22) answer 401, and the client sends the browser to `/setup` (api-client.ts lines 104 and 105). After the handshake, `POST /api/setup-auth/continue` completes setup (setup-status.controller.ts lines 29 to 34). The landing then reads the version and the health, and on a complete setup it reads the active project (landing.ts lines 42 to 47 and 51 to 52). The active-project read has no route on `main` (open point 5), so `/` shows the version, the health and the error, and stays on `/` (landing.ts lines 58 to 60). Options for the wording after PST-04 lands, not decided here: (a) the SHL-08 candidate, "stop the API and reload `/`: the landing shows the version, the health and the error"; the same API serves all three reads, so the version and health stay `loading` with the error (landing.ts lines 42 to 47 and 58 to 60), and the candidate does not show them; (b) the curl rewording, "Open `/` in a fresh browser: it goes to `/setup`, a not-found page until SAU-06. With the setup cookie, `curl` `/api/platform/version` and `/healthz` show the version and health."; (c) this main path (complete setup through the continue route, then `/`), kept after PST-04 lands. No DECISIONS entry closes SHL-08 open point 3 (grep for "demo step 2" and "open point 3" finds none). No criterion depends on it.
2. **Demo step 4, the graphs and canvas legs. Owner: the Navigator.** The graphs route is GRR-09: its unit line 16 gates the `:graphId` child route with `deviceClassGuard('tablet')`, so the larger-screen leg waits on GRR-09. The canvas component is GRR-10 (`units/GRR-10-vflow-adapter.md` line 22). GRR-17 is the M4 gate, blocked by GRR-09 and GRR-10 among others. GRR-09 is blocked by SHL-09 (its `blocked_by`, `units/GRR-09-graphs-route-list.md` line 7). None of these is on `main`, and the dummy is phone-minimum, so `main` has no tablet-minimum route to open. Decision for the run (decision 16): the larger-screen leg uses a temporary probe, created and deleted in the run and not committed (SHL-05 plan item 17). The graphs and canvas legs are recorded as blocked by GRR-09 (itself blocked by SHL-09). Proposal: keep the Navigator's wording (DECISIONS 1305 to 1308) and add "after GRR-09" to both legs.
3. **`blocked_by` does not name two inputs that are done. Owner: the coordinator.** Criteria 1 and 5 use PLT-03 (the dev proxy, `status: done`) and PLT-13 (the e2e harness, `status: done`). PLT-03 is a transitive blocker, not a direct one: PLT-03 unblocks PLT-11 (`units/PLT-03-web-bootstrap.md` line 9), PLT-11 is in SHL-01's `blocked_by` (`units/SHL-01-composition-root.md` line 7), and PLT-11's `blocked_by` names PLT-03 (`units/PLT-11-scaffold-gate.md` line 7). PLT-13 is the only one missing from the blocker list: no `blocked_by` in SHL-01 to SHL-08 or PLT-01 to PLT-11 names it. `units/README.md` line 64 makes `blocked_by` the source of truth. Not blocking: both are merged, and this plan uses them as they are.
4. **The dummy stays in the production nav (decision 1). Owner: the Navigator, if they want it out.** If the Navigator wants the dummy hidden or removed from `main`, criterion 2's nav check and the lazy check both change, so the plan would need a revision. Otherwise nothing to decide.
5. **Conflict 4: the landing's active-project read has no route on `main`. Owner: Project store (PST-04).** After a complete setup the landing reads `GET /api/project-store/active` (landing.ts lines 51 to 52 and 63 to 74). No project-store module is on `main` (F35), so the read fails and the landing shows the error. Effect on the demo: on `main`, step 1 with a complete setup shows the error and stays on `/`, and step 2 shows the version and health with the error (open point 1). After PST-04 lands, the landing leaves `/` at once, for `/projects` or the active project's page (landing.ts lines 63 to 74), so step 1 no longer stays on `/`, and the version and health in step 2 are on screen only while the reads run.
6. **Location of the dummy page (decision 3). Owner: the Navigator. Resolved 2026-11-14: `apps/web/src/app/shell/core-gate/`.** The Navigator's decision (A) in the DECISIONS entry sets the location; decisions 3 and 4 are revised to match, decision 7's rationale is revised too, and decision 13 (the route-table row) is unchanged. The two options were (a) keep the dummy in `features/` with an exception to `modules/shell.md` line 42, and (b) put it under `shell/`, which the boundaries lint does not cover (`eslint.config.mjs` lines 27 to 41). Option (b) was chosen.
7. **E2e mode (the built app or the dev server). Owner: the Navigator. Resolved 2026-11-14: option (a), amend `modules/shell.md` line 88 (decision 18).** The amendment is made in the SHL-09 code stage and listed in section 2b. Option (b), keeping line 88 and recording the mismatch here, was not chosen. The seam of section 4 (the production build served on 8080) stands.
8. **Nav in the line 88 wording (open point 8). Owner: the Navigator. Resolved 2026-11-14: option (i), the replacement in section 2b, which is the Navigator's option (A) (DECISIONS commit `497ae35`).** The e2e asserts only the "app loads" step, with no nav and no SSE (`e2e/specs/journey.e2e.ts` lines 14 to 31), so the line does not claim them. Option (ii), keeping "nav on every run", was not chosen.

## 7. Facts checked and assumed

### 7a. Facts checked (file and line)

- **F1.** `git rev-parse --short HEAD` prints `3df4319` at this revision (the Opus review of revision 2 ran at `ba32965`). `git diff --name-only 437769c HEAD` prints only `plans/DECISIONS.md`: the five commits after `437769c` (`35359ea`, `3498a5e`, `28f7028`, `ba32965`, `3df4319`) change only that file, so the code is the same as at `437769c`. `git status --short -- ':!plans'` prints nothing (clean at writing; other units' plans may be untracked, as DECISIONS line 2515 notes). `plans/SHL-09.md` is untracked (this plan).
- **F2.** `units/SHL-09-core-gate.md`: front matter line 7 (`blocked_by: [SHL-01, ..., SHL-08]`), line 9 (`unblocks`, 18 names); line 14 (merging closes phase:core); lines 17 to 21 (criteria 1 to 5); line 23 (M1 "done when"); lines 25 to 31 (demo, steps at 26 to 31).
- **F3.** `status: done` on line 3 of `plans/SHL-02.md`, `SHL-03.md`, `SHL-04.md`, `SHL-05.md`, `SHL-06.md`, `SHL-07.md`, `SHL-08.md`, `SHL-01.md` (checked with `grep -n '^status:'`), and of `plans/PLT-03.md` and `plans/PLT-13.md`.
- **F4.** `modules/shell.md`: line 24 (SHL-09 row), line 37 (after SHL-09), line 42 (feature UIs in `features/<m>/`; Shell code outside), line 43 (what the Shell consumes), line 47 (route table heading and the fixed paths), lines 49 to 62 (route table; the `switch` row is line 62), lines 84 to 89 (testing principles).
- **F5.** `units/README.md`: line 59 (blocker notation), line 64 (`blocked_by` is the source of truth), line 80 (the `phase:core` row), line 133 (testing rule).
- **F9.** `apps/web/src/app/app.routes.ts`: lines 1 to 4 (imports), 6 to 10 (`PROJECT_ROUTES`), 16 (`APP_ROUTES` opens with `withDeviceGate`), 17 to 22 (`''`), 23 to 30 (`projects/:projectId/switch`), 31 to 35 (`projects/:projectId`, guard on line 33), 36 (`**`), 37 (closing). The insertion point is after line 35.
- **F10.** `apps/web/src/app/app.html`: line 2 (`<h1>Scriba</h1>` in the toolbar), line 3 (connection status and theme toggle), line 5 (banners), line 7 (`<app-nav />`), line 9 (`<router-outlet />`).
- **F11.** `apps/web/src/app/app.ts` lines 25 to 31 (`ThemeService`, `DeviceClassService`, `ProjectSwitchFollow` injected).
- **F12.** `apps/web/src/app/shell/landing.ts`: lines 11 to 15 (doc), 19 and 20 (version and health text), 27 to 29 (injections), 39 to 61 (`load`; the three reads at 42 to 57), 51 and 52 (complete goes to `toActiveProject`), 53 and 54 (incomplete goes to `/setup`), 63 to 74 (`toActiveProject`, with `/projects` at line 69).
- **F13.** `apps/web/src/app/shell/api-client.ts` line 104 (`if (error.status === 401)`) and line 105 (`navigateByUrl('/setup')`).
- **F14.** `apps/web/src/app/shell/route-data.ts`: lines 4 to 9 (`ShellNav`: label, icon, order), lines 11 to 19 (`ShellRouteData`: scope, minDeviceClass, nav).
- **F15.** `apps/web/src/app/shell/device-class.ts`: lines 128 to 132 (`deviceClassGuard`), line 148 (`withDeviceGate`), lines 152 to 171 (`gateRoute`: a route with `data.scope` gets a device guard at `data.minDeviceClass ?? 'tablet'`, a generated fallback sibling, and a wrapped `loadChildren`).
- **F16.** `apps/web/src/app/shell/app-nav.ts`: line 31 (phone form, label "Bottom navigation"), lines 36 to 44 (`navItem`), lines 52 to 75 (`navItems`; app-scope routes by `data.scope`), line 68 (`` `/${route.path}` `` as the href), line 162 (`<mat-icon>`), line 188 (sort by `order`).
- **F18.** `apps/web/src/app/shell/testing/template-feature.spec.ts`: line 36 (T1), line 53 (T2).
- **F19.** `apps/web/src/app/shell/theme.ts` line 8 (`STORAGE_KEY = 'scriba.theme'`). `apps/web/src/app/shell/theme-toggle.ts` line 17 (`aria-label="Theme"`), lines 21 to 23 (System, Light, Dark). `apps/web/src/material-theme.scss` lines 12 (`color-scheme: light dark`), 26 (`light`) and 30 (`dark`). SHL-04 plan decision 1 (CSS, not `matchMedia`).
- **F20.** `apps/web/src/app/shell/connection-status.ts` line 25 ("Reconnecting" text), line 48 (`message: 'Server unreachable'`).
- **F21.** `apps/web/src/app/shell/sse-client.ts` line 230 (`console.debug('[sse] tick', reason)`).
- **F22.** `apps/web/src/app/shell/larger-screen.ts` line 12 (`<h2>This page needs a larger screen</h2>`).
- **F23.** `e2e/specs/journey.e2e.ts`: line 11 (test title), lines 14 to 31 (step "app loads"), line 18 (heading check), lines 15 to 19 (page-error collection), lines 33 to 47 (placeholders with their owners in comments).
- **F24.** `e2e/harness/global-setup.ts`: line 15 (API port 8080), line 19 (`globalSetup`), lines 20 and 21 (`assertPortFree`, `buildWorkspaces`), line 27 (`startApi`), lines 88 to 126 (mock and health checks; no call to `/api/setup-auth/handshake`).
- **F25.** `e2e/playwright.config.ts` line 11 (`testMatch`), line 20 (`baseURL` 8080).
- **F26.** `apps/web/proxy.conf.mjs`: lines 7 to 12 (comment on the hook), lines 13 to 24 (`endStreamWhenUpstreamEnds`), lines 27 and 28 (`/api` and `/healthz`), line 29 (`/events` with `configure`).
- **F27.** `scripts/web-proxy.test.mjs`: lines 14 (exact keys), 18 (port 8080), 24 (serves with `proxy.conf.mjs`), 29 (`configure` only on `/events`). Root `package.json` line 25 (`test`: `npm test --workspaces && node --test 'scripts/*.test.mjs'`).
- **F28.** `apps/api/src/modules/platform/events/events.publisher.ts` line 38 (writes `retry` and the hello), lines 43 to 45 (the `hello` event).
- **F29.** `apps/api/src/modules/platform/events/events.controller.ts` line 11 (`@Get(EVENTS_ROUTE)`); `echo.controller.ts` line 15 (`@Post(ECHO_ROUTE)`); `packages/contracts/src/platform/events.ts` line 6 (`ECHO_ROUTE = '/api/platform/echo'`), lines 37 to 40 (`echoRequestSchema`: `count` and `intervalMs`).
- **F30.** `apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 35 and 36 (the default-deny guard: a route is public only with `@Public()` or on `/healthz`; every other route needs a setup cookie).
- **F31.** `apps/api/src/modules/setup-auth/setup-session.controller.ts` lines 69 and 70 (`@Get(HANDSHAKE_ROUTE)`, `@Public()`), line 77 (`parsed.data.token`), line 91 (cookie set only on a loopback host).
- **F32.** `apps/api/src/modules/setup-auth/setup-status.controller.ts` line 22 (`@Get(SETUP_STATUS_ROUTE)`, behind `requireSession`); `apps/api/src/modules/platform/version.controller.ts` line 11 (`@Get(VERSION_ROUTE)`). A grep for `Public` in both files finds nothing.
- **F33.** `apps/api/src/modules/setup-auth/setup-token.store.ts` lines 91 and 92 (the setup URL lives in `${SCRIBA_BOOKS_DIR}/.scriba`), lines 107 and 108 (the URL is written). `setup-session.cookie.ts` line 7 (`isLoopbackHost`).
- **F34.** `apps/api/src/app.module.ts` line 31 (the comment: non-API GETs get `index.html`), line 39 (`ServeStaticModule.forRoot`), line 41 (`exclude` for `/api`, `/healthz` and `/events`).
- **F35.** `apps/api/src/modules` lists `platform`, `providers` and `setup-auth` only. No project-store module (so no `/api/project-store/...` route on `main`).
- **F36.** `apps/api/src/bootstrap.ts` lines 19 to 26 (static root `apps/web/dist/scriba-web/browser`). `app.module.ts` line 40 (`rootPath`). The API serves the built Shell on the same origin.
- **F37.** `apps/web/angular.json` lines 35 (`maximumWarning: 500kB`) and 36 (`maximumError: 1MB`); line 63 (`proxyConfig`).
- **F38.** Root `package.json` line 24 (`dev`: builds contracts and API, then `concurrently` for the contracts and API watchers, the API with `SCRIBA_BOOKS_DIR='$PWD/.scriba-dev'` and `SCRIBA_DEV_ORIGINS=http://localhost:4200` and `SCRIBA_SETUP_URL_BASE=http://localhost:4200`, and `npm run start -w @bbartolome/scriba-web`), line 29 (`e2e`).
- **F39.** `node_modules/@angular/build/src/builders/application/schema.json` lines 535 to 538 (`statsJson`, the description names `browser-stats.json`). `options.js` line 166 (default `outputPath` is `dist/<project>` under the workspace root). `execute-build.js` line 330 (`browser-stats.json` is written to the output root).
- **F40.** `.gitignore` line 2 (`dist/`), line 5 (`.scriba-dev/`), line 8 (`e2e/test-results/`).
- **F41.** `apps/web/tsconfig.app.json` line 6 (`"types": []`), line 8 (`include: src/**/*.ts`), line 9 (`exclude` specs).
- **F42.** `eslint.config.mjs` lines 27 to 41 (`boundaries/elements`: `src/modules/*` and `src/app/features/*`; `boundaries/files`: entry files `src/app/features/*/*.routes.ts`), `boundaries/dependencies`, rule R1 (lines 50 to 68; the rule opens at line 45): a web-feature imports another only through its entry file.
- **F43.** `apps/web/src/app/app.routes.spec.ts` line 6 (imports `./app.routes`). `apps/web/src/app/shell/app-nav.spec.ts` lines 5 and 6 (imports `../app` and `../app.routes`).
- **F44.** `node_modules/@angular/core` is present. `packages/contracts/dist` is absent (`ls` prints nothing).
- **F45.** `plans/PLT-13.md` line 22 (the Chromium the CI runner installs; the local lookup); line 151 (`SCRIBA_E2E_CHROMIUM`). `plans/PLT-03.md` line 14 (the proxy maps exactly `/api`, `/healthz` and `/events`, and SSE is not buffered), line 118 (SSE buffering, a Navigator decision).
- **F46.** `plans/DECISIONS.md` lines 2712 to 2716: SHL-08 closed on `main`, with web 85 of 85 in 19 files at the batch head and I1 504.21 kB, the two CommonJS warnings and the initial-total warning. Lines 2681 to 2685: the Navigator's bundle decision (the 1 MB budget holds; the 500 kB warning is accepted).
- **F47.** `git ls-files apps/web/src/app/features` lists only `.gitkeep`.
- **F48.** `grep -n 'SHL-09' units/*.md` lists the twelve feature units and SHL-10, SHL-11, SHL-12, SHL-13, SHL-17 and SHL-18 with SHL-09 in `blocked_by`, and the SHL-09 `unblocks` list has the same eighteen names.
- **F49.** `apps/api/src/modules/setup-auth/setup-auth.guard.ts` line 48 (`/healthz` is public). `apps/api/src/modules/platform/health.controller.ts` line 8 (the comment: unguarded on purpose), line 11 (`@Get(HEALTHZ_ROUTE)`). `apps/api/src/modules/setup-auth/setup-status.controller.ts` line 22 (`@Get(SETUP_STATUS_ROUTE)`), line 24 (`requireSession` in the status read), line 28 (the comment: the continue route marks the remaining steps skipped), lines 29 to 34 (`@Post(SETUP_CONTINUE_ROUTE)`, `requireSession` at line 32). `apps/api/src/modules/platform/version.controller.ts` line 11 (`@Get(VERSION_ROUTE)`, no `@Public`; a grep of it and of `platform/events/` for `Public` finds nothing).
- **F50.** `apps/web/src/app/shell/sse-client.ts` lines 191 (the status probe), 199 (`status.status === 401`) and 200 (`navigateToSetup()`).
- **F51.** `units/GRR-09-graphs-route-list.md` line 7 (`blocked_by` names SHL-09) and line 16 (the `:graphId` child route gated with `deviceClassGuard('tablet')`). `units/GRR-10-vflow-adapter.md` line 7 (`blocked_by` names SHL-09) and line 22 (the canvas route component). `units/GRR-17-canvas-gate.md` line 6 (`milestone: M4`) and line 7 (`blocked_by` names GRR-09 and GRR-10).
- **F52.** `units/SHL-01-composition-root.md` line 7 (`blocked_by` names PLT-11, with PLT-03 as the web root handover). `units/PLT-11-scaffold-gate.md` line 7 (`blocked_by` names PLT-03). `units/PLT-03-web-bootstrap.md` line 9 (`unblocks` names PLT-11). A grep of `^blocked_by` in `units/SHL-0[1-8]-*.md` and `units/PLT-0[1-9]-*.md` and `units/PLT-1[01]-*.md` finds no PLT-13.
- **Earlier decisions read.** `plans/DECISIONS.md` lines 1305 to 1308 (demo step 4 reworded, 2026-11-13) and lines 1259 to 1263 (SHL-06, the dev-proxy hook, option b). `plans/SHL-05.md` line 47 (item 17) and line 256 (the SHL-09 row). `plans/SHL-07.md` line 148 (SHL-09 row). `plans/SHL-04.md` line 14 (decision 1) and line 174 (SHL-09 row). `plans/SHL-01.md` lines 27 to 30 (decisions 8 to 11) and line 195 (SHL-09 row). `plans/SHL-08.md` section 1 decisions 5, 17 and 18 and section 6 open point 3.

### 7b. Things assumed

- **A1.** `npm run e2e` finds a Chromium that Playwright can launch on the run machine (PLT-13 uses `SCRIBA_E2E_CHROMIUM` on CI and the local lookup otherwise). Step 10 tests it.
- **A2.** Ports 4200 and 8080 are free when steps 8 and 10 start, and they are not used in parallel.
- **A3.** `ng build --stats-json` writes `apps/web/dist/scriba-web/browser-stats.json` and `apps/web/dist/scriba-web/browser/index.html`. The path follows from F36 and F39, but the exact output directory is not checked here. Step 7 checks it with `ls`.
- **A4.** The esbuild metafile lists the input `src/app/shell/core-gate/core-gate.routes.ts` (relative to `apps/web`, the Angular workspace root), and a dynamic `import()` appears as `kind: 'dynamic-import'`. Step 7 checks both.
- **A5.** `index.html` lists only the initial scripts (no lazy chunk). Step 7 checks it.
- **A6.** `science` is a valid ligature name in the icon font. The package is pinned at `@fontsource/material-icons` 5.3.0 (`apps/web/package.json` line 20, checked), but the glyph name is not checked here. The test reads the ligature text; the glyph is checked by eye in step 9.
- **A7.** `pathMatch: 'full'` on an entry with `loadChildren` and a child `''` matches `/core-gate`. C2 tests it.
- **A8.** The e2e "app loads" step passes on `main` with the landing's redirect (no cookie in the harness, F24). Step 10 tests it.
- **A9.** Chrome's default console log levels leave out Verbose, where `console.debug` appears (sse-client.ts line 230). Step 9.6 (demo step 6) turns the Verbose level on.
- **A10.** The file `.scriba-dev/.scriba/setup-url` holds the full handshake URL with a `token` query. The key `token` is FACT F31; the path and the base URL follow F33 and F38.
- **A11.** `npm run dev` writes its library under `.scriba-dev/` (F38), so the setup URL is `.scriba-dev/.scriba/setup-url` (F33).
- **A12.** The dummy adds no CommonJS warning, so `W1` stays at two. Step 7 counts.
- **A13.** At 390 by 844, `App` renders the phone (bottom) nav under `stubMatchMedia`, as the nav tests do at their phone sizes (app-nav.spec.ts line 68 lists `SIZES`). C2 tests it.
- **A14.** The OS leg (B-OS) holds with the CSS of material-theme.scss. Step 9 checks it.
- **A15.** The top-level spec file `apps/web/src/app/core-gate.spec.ts` is not matched by a boundaries element, so the lint rule does not apply to it (decision 7). Step 6 checks it with `npm run lint`.

## 8. Summary of the plan's commitments

- Five criteria, six named checks: C1 (dev stack, D1 to D3), C2 (rendered nav and page), C2' (build stats), C3 (the named list of section 4 and B-OS), C4 (T1 and T2), C5 (the e2e journey's "app loads" step).
- One new route entry (`/core-gate`, phone minimum, nav "Core gate", icon `science`, order 100) and one folder (`shell/core-gate/`, under the Shell), registered in `APP_ROUTES` above `**` with `loadChildren` (decisions 2 to 5).
- Net passed count `B + 1` (step 4). Changed files: `app.routes.ts` and `modules/shell.md` (the route row and the line 88 amendment); new files: the two files under `shell/core-gate/` and the top-level spec.
- No shared Shell file, fake, e2e step or contract changes (section 2d).
- Five open points remain: the Navigator's on the demo wording (open points 1 and 2), the coordinator's (open point 3), the Navigator's overrule (open point 4), and the Project store owner's (open point 5, PST-04). Open points 6, 7 and 8 are resolved by the Navigator's decisions of 2026-11-14 (decisions 3 and 18; open point 8 by DECISIONS commit `497ae35`). Demo step 2 runs on `main` as set out in section 3, step 9.
