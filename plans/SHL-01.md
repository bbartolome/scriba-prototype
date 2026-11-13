---
id: SHL-01
status: planned
---

# SHL-01 plan — composition root, route table, not-found page, dev proxy

Batch: [SHL-01] (main track, phase:core, M1); a batch of one. Revision 4. Revision 2 was approved by Opus (DECISIONS 2026-11-13, SHL-01 revision 2, commit d85e7c5); revision 3 was rejected (rejection 2, DECISIONS 2026-11-13, commit 3dfa1c2); revision 4 is pending Opus review, so the status is `draft`. The base is `main` at `6b8094a` (section 3, step 0).

Revision 2 applies the five corrections of the Opus rejection of revision 1 (DECISIONS 2026-11-13, "SHL-01 — Opus plan review of revision 1"): decision 9 (one export per owned path), section 5 (Project store, Setup & auth and Tool registry rows, with counts), decision 8 (`pathMatch: 'full'` on the `/projects` entry), decision 6 (Material theme means the CSS theme), and decision 12 (citation). Step 10 now probes a two-path dummy feature. Open point 2 records the gap between unit line 18 and the module table.

Revision 3 changes the dev-server approach. The code subagent stopped at step 12 (the browser check) on `unit/SHL-01`; steps 0 to 11 passed on commits 328eacd and f87be80. The optional KaTeX peer of ngx-markdown cannot be pre-bundled by the dev server, so the dev build fails and `main.js` never bootstraps. Decision 22 adds `externalDependencies` to the `build` options of `apps/web/angular.json`. The new step 11A applies it and restarts the dev stack; the browser check of step 12 then runs on that stack. Section 2 gains the `angular.json` row, section 3 gains step 11A, section 6 gains open points 4 and 5, and section 7 gains the new facts. The dev checks use `http://localhost:4200` throughout (the Angular dev server binds localhost by default; this plan passes no `--host` flag). Status stays `draft` until Opus approves revision 4.

Revision 4 applies the four corrections of the Opus rejection of revision 3 (rejection 2, DECISIONS 2026-11-13, commit 3dfa1c2). Decision 22 now names the failure as logged. The log check moves after step 12 and into criterion 1. Step 11A reruns step 6 after the edit, and the section 5 PLT-11 row cites that rerun. The open point references are corrected: the unit-wording gap is open point 2, and the browser launch is open point 3. Steps 4, 13 and 15 name the stacks and checks they use.

## 1. Decisions this plan follows

Each item gives its source. FACT means checked in this session, with the check named. ASSUMED means a step in section 3 tests it.

1. **Composition root files.** `apps/web/src/app/app.config.ts` is edited, `apps/web/src/app/app.routes.ts` is new, `apps/web/src/main.ts` is unchanged. Source: SHL-01 unit line 14 (ownership) and line 17; PLT-03 plan line 107. FACT: `main.ts` bootstraps `App` with `appConfig`.
2. **Zoneless.** `provideZonelessChangeDetection()` is listed explicitly. Source: unit line 17. FACT: `@angular/core` 22.2.5 `types/core.d.ts` line 3482 exports it, and its doc block has no `@deprecated` tag; `zone.js` is absent from `package-lock.json`.
3. **Router.** `provideRouter(APP_ROUTES)`. Source: PLT-03 plan line 25 (the generated app has no router; SHL-01 adds one). FACT: `app.config.ts` has only `provideBrowserGlobalErrorListeners()`.
4. **HTTP.** `provideHttpClient()` with its default backend: same-origin, no auth headers (SHL-02 decisions). Source: unit line 17. ASSUMED: the export name; step 8 type-checks it.
5. **Markdown.** `ngx-markdown` pinned exact at `22.1.1` and configured once: `provideMarkdown({ sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML } })`. `disableSanitizer` is never set. Source: unit line 17; `units/SHL-11-markdown-preview.md` line 18. FACT, from the npm cache in `~/.npm/_cacache` (extracted to `/tmp/shl01-cache/ngx`): the packument's `dist-tags.latest` is `22.1.1`; its `package.json` peers are `@angular/*` `^22.0.0` and `marked` `^17.0.0 || ^18.0.0` (not optional, so npm installs it); the optional peers (prismjs, katex, mermaid, clipboard, emoji-toolkit, marked-katex-extension) are not installed. `types/ngx-markdown.d.ts` exports `provideMarkdown` (line 1918) and `SANITIZE`; `fesm2022/ngx-markdown.mjs` line 153 sets the default context to `SecurityContext.HTML`. ASSUMED: the live registry agrees (step 2 checks it).
6. **Material.** "Material theme" in unit line 17 means the CSS theme only: `src/material-theme.scss` in the `styles` of `apps/web/angular.json` (line 27). FACT: `@angular/material` 22.2.7 exports no runtime theme provider. Its provider-like exports are `provideNativeDateAdapter` and the `MATERIAL_ANIMATIONS` injection token (`types/core.d.ts` lines 32 and 189). `createTheme` and `addThemeToAppStyles` are `ng add` schematic helpers under `schematics/ng-add/theming/`. No animations provider is added either: `provideAnimationsAsync` is `@deprecated 20.2`, with removal intended in v23 (`@angular/platform-browser` 22.2.5 `types/animations-async.d.ts` line 38). FACT as cited, from `/tmp/shl01-cache/angular/mat` and `/tmp/shl01-cache/angular/pb`.
7. **Placeholders.** `API_CLIENT` and `SSE_CLIENT` are bare `InjectionToken<unknown>` values in `shell/tokens.ts`, with no provider. Injecting one before SHL-02 or SHL-03 fails with Angular's "no provider" error. Source: unit line 17. Decision.
8. **Route table shape.** `APP_ROUTES` has three entries in SHL-01, in this order: `''` (`pathMatch: 'full'`, the landing placeholder), `projects/:projectId` (a componentless parent whose children are `[...PROJECT_ROUTES, { path: '**', not-found }]`), and `'**'` (not-found). `PROJECT_ROUTES` is an empty `Routes` array that project-scoped features append to. The `**` inside the parent makes an unknown project sub-path show the not-found page, not a blank page. Every owned-path entry uses `pathMatch: 'full'`, except a path that has a child route: only `graphs`, for `graphs/:graphId`, uses the default prefix match. So the app-level `/projects` entry (PST-09) is `pathMatch: 'full'` with its children at `''`, and `/projects/p1/chat` cannot match it. App-level feature entries are inserted above `'**'`. Source: unit lines 18 and 21; `modules/shell.md` lines 47 to 63; Opus rejection, item 3. Decision.
9. **Feature registration.** A feature exports one named `Routes` per path it owns, all in `apps/web/src/app/features/<m>/<m>.routes.ts`. The export is named `<segment>Routes`, where `<segment>` is the owned path's first segment in camel case: `setupRoutes` (`/setup`), `settingsRoutes` (`/settings`), `providersRoutes`, `toolsRoutes`, `projectsRoutes` (`/projects`), `chatRoutes`, `filesRoutes`, `reviewRoutes`, `graphsRoutes`, `manuscriptRoutes`. Each owned path has its own root or `PROJECT_ROUTES` entry, and that entry's `loadChildren` loads only that path's export: `loadChildren: () => import('./features/<m>/<m>.routes').then((m) => m.<segment>Routes)`, with a `data` value typed `ShellRouteData`. The child route `:graphId` lives inside `graphsRoutes`. Project-scoped entries go into `PROJECT_ROUTES`; app-level entries go above `'**'`. A fixed name per path keeps the names unique inside one file; the `routes` name is not used. Source: unit line 18 (its "one routes array" reading is replaced by this rule); SAU-06 line 15 and SAU-15 line 15 (Setup & auth owns two paths); PST-09 lines 17 and 18, PST-10 line 15 and PST-20 line 15 (Project store owns three); DECISIONS 2026-11-11 smaller choices, item 5 (line 240, the file name `<m>.routes.ts`); `units/README.md` line 125; Opus rejection, item 1. Decision.
10. **Route data type.** `ShellRouteData` is `{ scope: 'app' | 'project'; minDeviceClass?: DeviceClass; nav?: ShellNav }`; `DeviceClass` is `'phone' | 'tablet' | 'desktop'`; `ShellNav` is `{ label: string; icon: string; order: number }`. An absent `minDeviceClass` means `tablet`. SHL-05's gate applies that default; SHL-01 gates nothing. Exported from `shell/index.ts`. Source: unit line 19; `modules/shell.md` line 69. Decision.
11. **Not-found and landing.** `NotFoundPage` renders `<h2>Page not found</h2>` and a link to `/`. `LandingPage` renders `<p>Scriba is running.</p>` and no heading. The e2e journey's "app loads" step expects the heading named `Scriba` on `/` and no page errors, so the landing must add no second heading. SHL-08 replaces the landing. Source: unit line 21; `e2e/specs/journey.e2e.ts`, step "app loads". Decision.
12. **Shell location.** Shell code lives in `apps/web/src/app/shell/`, outside `features/`. Source: `modules/shell.md` line 42; PLT-03 plan line 13 (feature folders). Decision.
13. **Dev proxy.** `apps/web/proxy.conf.json` is not changed. It has exactly `/api`, `/healthz` and `/events`, each with target `http://127.0.0.1:8080`, and no `changeOrigin`, so unit line 20 is already met. FACT: the file, and the PLT-03 criterion 3 test `scripts/web-proxy.test.mjs`. Angular passes the JSON proxy object to Vite unchanged: `/tmp/plt11-probe/ng/package/src/utils/load-proxy-config.js` lines 52 to 64 and `src/builders/dev-server/vite/server.js` lines 51 and 75; that package never mentions `changeOrigin`. ASSUMED: Vite's default for `changeOrigin` is false. Step 13 checks it.
14. **Dev script.** Unchanged. The root `dev` script (`package.json` line 24) already sets `SCRIBA_DEV_ORIGINS` and `SCRIBA_SETUP_URL_BASE`. Source: DECISIONS 2026-11-11, PLT-03 dev script ownership (line 199); unit line 20. FACT.
15. **Contracts.** SHL-01's production code imports no `@bbartolome/scriba-contracts` subpath. So the cost of zod's CommonJS build (DECISIONS 2026-11-12, PLT-11 review, cross-unit finding, line 634) does not reach this unit's bundle. The `contracts-boot` configuration stays as PLT-11 built it. Source: PLT-11 plan section 6 point 3; SHL-09 criterion 2 (the dummy feature stays out of the initial bundle). Decision.
16. **Boundaries lint.** `eslint.config.mjs` is not changed, and no `web-shell` element is added. A `web-feature` may import a Shell file, because Shell files match no element. FACT, from the npm cache (extracted to `/tmp/shl01-cache/boundaries` and `/tmp/shl01-cache/policies`): `@boundaries/policies` 1.0.1 `dist/index.js` lines 1193 to 1214 (`getDependencySkipReason`) skip a local dependency whose target is unknown, unless `checkUnknownLocals` is set; the root config sets neither `checkUnknownLocals` nor `checkAllOrigins`. The locked versions match: `eslint-plugin-boundaries` 7.4.2 and `@boundaries/policies` 1.0.1. Step 10 checks it.
17. **Tests.** Vitest through the Angular unit-test builder: `npm test -w @bbartolome/scriba-web` (PLT-03 unit line 20). Rendered routes use `RouterTestingHarness`. FACT: `@angular/router` 22.2.5 `types/testing.d.ts` lines 58 to 70 (`create(initialUrl?)`, the `routeNativeElement` getter, `navigateByUrl`). `app.spec.ts` (PLT-03 criterion 2) is kept; `App` keeps `<h1>Scriba</h1>`, which the e2e assertion needs.
18. **Browser for the checks.** The brief names `/opt/pw-browsers/chromium`, and that path does not exist here (FACT: `ls -la /opt/pw-browsers` fails). The usable binary is `~/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome` (FACT: `ls` shows it), driven by the `@playwright/test` 1.65.0 in the lock through `executablePath`. ASSUMED: Playwright 1.65 launches that build (open point 3).
19. **Lockfile.** Additive only: no existing package entry changes its `version`, `resolved` or `integrity`. Source: DECISIONS 2026-11-11, lockfile gate (line 385); PLT-02 precedent.
20. **Runtime and branch.** Node v26.13.0 and npm 11.20.0 (FACT: `node -v`, `npm -v`; `.nvmrc` is 26). The driver creates `unit/SHL-01` from `main`. The implementer does not commit or push (PLT-11 precedent).
21. **Install first.** `node_modules` lacks `@angular/*`, the `ng` binary and `eslint-plugin-boundaries` (FACT: `ls node_modules/@angular` fails; `node_modules/.bin` has no `ng`). So `npm ci` runs first (step 1).
22. **Optional KaTeX peer (revision 3).** `ngx-markdown` 22.1.1 imports its optional peer `marked-katex-extension` at runtime, in its KaTeX path: `fesm2022/ngx-markdown.mjs` line 252, `this.markedKatex ??= await import(/* @vite-ignore */ 'marked-katex-extension')`. In the failing run (no externals), Vite logged `Pre-transform error` and `Internal server error` lines in `/tmp/shl01-dev.log` (lines 83, 92 and 110), each `Failed to resolve import "marked-katex-extension" from ".angular/cache/22.2.5/scriba-web/vite/deps/ngx-markdown.js"` (Vite import analysis on the pre-bundled ngx-markdown.js), so `main.js` never bootstraps. That log has no `Could not resolve` line. The `Could not resolve` message belongs to the `serve.options.prebundle.exclude` experiment (`/tmp/shl01-exp-serve.log`, rejected alternative (b)). With externals set, `preTransformRequests` is false (`dev-server/vite/server.js` line 142), so the import error surfaces only when the browser requests the module, which is step 12. The code subagent saw this at step 12; steps 0 to 11 passed. The production build (step 7) had passed without the change. Decision: add `"externalDependencies": ["marked-katex-extension"]` to the `build` target's `options` in `apps/web/angular.json`, one key only. The module is then left external, so the dev server builds, `http://localhost:4200/` renders the heading `Scriba` with no Vite error overlay and no page errors, and `npm run build -w @bbartolome/scriba-web` exits 0 with Initial total 321.86 kB. Nothing is installed. Rejected: (a) installing `marked-katex-extension` and its katex peer, which adds unplanned dependencies; (b) `serve.options.prebundle.exclude` for `ngx-markdown`, which was tested and still fails with `Could not resolve "marked-katex-extension"` (`/tmp/shl01-exp-serve.log`); (c) changing ngx-markdown, which contradicts unit line 17. The KaTeX path is not reached in SHL-01: `grep -rli -E 'katex|math|latex' units modules` finds no match, so no unit needs it. ASSUMED: the production bundle keeps an unreached dynamic `import('marked-katex-extension')`, which is harmless (step 11A checks the build; no criterion runs the path). Source: the code subagent's report (the dev and browser results are its figures, reproduced by step 11A); FACT: the cached 22.1.1 tarball (`/tmp/shl01-cache/ngxtypes/package/fesm2022/ngx-markdown.mjs` line 252); FACT: `@angular/build` 22.2.5 application schema, `externalDependencies` at `/tmp/plt11-probe/ng/package/src/builders/application/schema.json` line 205, which the dev server reads through the `build` target.

## 2. Files to create or change

Only the paths below change. These do not change: `apps/web/src/main.ts`, `apps/web/proxy.conf.json`, `apps/web/tsconfig*.json`, `apps/web/src/app/features/.gitkeep`, `eslint.config.mjs`, the root `package.json`, `scripts/**`, `packages/contracts/**`, `apps/api/**` and `e2e/**`. Git-ignored output (`apps/web/dist/`, `node_modules/`, `.scriba-dev/`) is generated and is not committed.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/package.json` | edit | Adds `"ngx-markdown": "22.1.1"` to `dependencies`, pinned exact like the other web dependencies (decision 5). `marked` is not listed: it is a required peer, so npm adds it to the lock. |
| `package-lock.json` | changed by npm | Adds `ngx-markdown` 22.1.1, its required peer `marked` (17.x or 18.x) and any transitive entries. No existing entry changes (decision 19). |
| `apps/web/src/app/app.config.ts` | edit | Providers, in order: `provideBrowserGlobalErrorListeners()` (kept), `provideZonelessChangeDetection()`, `provideRouter(APP_ROUTES)`, `provideHttpClient()`, `provideMarkdown({ sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML } })` (decisions 2 to 5). |
| `apps/web/src/app/app.routes.ts` | new | Exports `PROJECT_ROUTES` (empty `Routes`, features append) and `APP_ROUTES`: the `''` landing entry, the `projects/:projectId` componentless parent, and the `'**'` not-found entry (decision 8). |
| `apps/web/src/app/app.ts` | edit | Adds `RouterOutlet` to the component's `imports`, next to `MatToolbar`. |
| `apps/web/src/app/app.html` | edit | Keeps `<mat-toolbar><h1>Scriba</h1></mat-toolbar>` and adds `<router-outlet />` after it. |
| `apps/web/src/app/shell/index.ts` | new | The Shell's entry for features: re-exports the types of `route-data.ts` and the tokens of `tokens.ts`. |
| `apps/web/src/app/shell/route-data.ts` | new | Exports `DeviceClass`, `ShellNav` and `ShellRouteData` (decision 10). |
| `apps/web/src/app/shell/tokens.ts` | new | Exports `API_CLIENT` and `SSE_CLIENT`, bare `InjectionToken<unknown>` placeholders with no provider (decision 7). |
| `apps/web/src/app/shell/not-found.ts` | new | `NotFoundPage`: an inline standalone component, `<h2>Page not found</h2>` and a `routerLink` to `/`. |
| `apps/web/src/app/shell/landing.ts` | new | `LandingPage`: an inline standalone component, `<p>Scriba is running.</p>`. SHL-08 replaces it (decision 11). |
| `apps/web/src/app/app.routes.spec.ts` | new | Criterion 3: three rendered-route tests with `RouterTestingHarness` (step 8). |
| `apps/web/src/app/shell/route-data.spec.ts` | new | Criterion 4: one test that imports `ShellRouteData` from `./index` and has two `@ts-expect-error` lines (step 8). |
| `apps/web/src/app/app.spec.ts` | unchanged (conditional edit) | Changed only if `RouterOutlet` makes it fail. The fix is `provideRouter([])` in its TestBed config (step 8). |
| `apps/web/src/app/features/shell-probe/shell-probe.routes.ts` | temporary, created and deleted in step 10 | Dummy feature with two paths: exports `probeARoutes` and `probeBRoutes`, and imports `ShellRouteData` from the Shell entry (criterion 4, decision 9). Never committed. |
| `apps/web/src/app/features/shell-probe/shell-probe.spec.ts` | temporary, created and deleted in step 10 | Two tests, each loading one export through its own entry (decision 9). Never committed. |
| `apps/web/angular.json` | edit (revision 3) | Adds one key, `"externalDependencies": ["marked-katex-extension"]`, to `projects.scriba-web.architect.build.options` (decision 22; applied in step 11A, not in step 4). Nothing else in the file changes, including the `contracts-boot` and `production` configurations. |

## 3. Method

Run from the repo root on the driver's branch `unit/SHL-01`. Do not run `git switch -c`, do not commit and do not push. Record `node -v` and `npm -v` with each result. Each step names its files.

0. **Preconditions (no file change).**
   - `node -v` prints `v26.x`; `npm -v` prints `11.20.0`.
   - `git rev-parse --short HEAD` prints `6b8094a` on the branch, or a later commit on `main`. `git diff --quiet 6b8094a HEAD -- ':!plans'` exits 0. `git status --short` prints nothing.
   - `curl -s -o /dev/null http://localhost:4200/; echo $?` prints `7`, and `curl -s -o /dev/null http://127.0.0.1:8080/healthz; echo $?` prints `7`. If either connects, stop and report the owner, found with the `/proc` method of `plans/PLT-11.md` section 3, step 0. Do not kill it.
1. **Install from the lock (no file change).** `npm ci` exits 0. Then `ls node_modules/@angular/core/package.json` lists the file (it does not exist before this step).
2. **Add ngx-markdown (file: `apps/web/package.json`; `package-lock.json` changed by npm).**
   - `npm view ngx-markdown dist-tags.latest` prints `22.1.1`. If it prints a later 22.x, pin that one instead, after checking its peers the same way (`npm view ngx-markdown@<v> peerDependencies`: `@angular/core` `^22`, `marked` `^17` or `^18`). If no 22.x qualifies, stop and record it under the Angular conflict rule (DECISIONS 2026-11-10, line 71).
   - `npm install --save-exact ngx-markdown@22.1.1 -w @bbartolome/scriba-web` exits 0.
   - `grep -n '"ngx-markdown"' apps/web/package.json` prints `"ngx-markdown": "22.1.1"`.
   - `npm ls marked -w @bbartolome/scriba-web` lists one `marked`, at 17.x or 18.x.
3. **Lock gate (file: `package-lock.json`).** `git diff -U0 -- package-lock.json | grep '^-' | grep -v '^---'` prints nothing, or only lines inside the `"apps/web"` workspace entry (its `dependencies` block gains `ngx-markdown`, and a trailing comma may be re-emitted). No `version`, `resolved` or `integrity` line of an existing `node_modules/...` entry is removed. Then `npm ci` exits 0.
4. **Write the files (section 2), except `apps/web/angular.json`, which step 11A edits.** Follow section 1. Then `npx prettier --write apps/web/src apps/web/package.json`, and `npx prettier --check apps/web` exits 0.
5. **Static checks (no file change).**
   - `grep -rn --exclude=contracts-boot.ts -e changeOrigin -e disableSanitizer -e scriba-contracts apps/web/src apps/web/proxy.conf.json` prints nothing. The exclusion is for PLT-11's `contracts-boot.ts`, the one file that imports contracts by design.
   - `grep -c 'SANITIZE' apps/web/src/app/app.config.ts` prints `2` or more.
   - `git status --short` lists only the section 2 paths that the steps changed.
6. **PLT-11 check still passes (no file change).** `npm run build -w @bbartolome/scriba-contracts` exits 0, then `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` exits 0.
7. **Production build (no file change).** `npm run build -w @bbartolome/scriba-web` exits 0. A budget warning is allowed. Record the `Initial total` line. `grep -l 'scriba-contracts' apps/web/dist/scriba-web/browser/*.js` prints nothing.
8. **Unit tests (files: `app.routes.spec.ts`, `shell/route-data.spec.ts`; `app.spec.ts` only if needed).**
   - `npm test -w @bbartolome/scriba-web` exits 0, with 5 tests passing and none failing: `app.spec.ts` 1, `app.routes.spec.ts` 3, `shell/route-data.spec.ts` 1.
   - `npx tsc --noEmit -p apps/web/tsconfig.spec.json` exits 0. This is what makes the two `@ts-expect-error` lines count.
   - If `app.spec.ts` fails only because `RouterOutlet` needs a router, add `provideRouter([])` to its TestBed config and rerun. That is the only edit to `app.spec.ts`.
9. **Lint (no file change).** `npm run lint -w @bbartolome/scriba-web` exits 0.
10. **Feature-side probe and two-path registration (criterion 4 and decision 9; temporary files in `apps/web/src/app/features/shell-probe/`).**
    - Create `shell-probe.routes.ts`: one `import type { ShellRouteData } from '../../shell';`; two exports, `probeARoutes` and `probeBRoutes`, each a `Routes` with one standalone component whose text differs (`probe a`, `probe b`); a constant that uses `satisfies ShellRouteData` as its `data`.
    - Create `shell-probe.spec.ts` with two tests. Each runs `TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'probe-a', pathMatch: 'full', loadChildren: () => import('./shell-probe.routes').then((m) => m.probeARoutes) }, { path: 'probe-b', pathMatch: 'full', loadChildren: () => import('./shell-probe.routes').then((m) => m.probeBRoutes) }])] })`, then `RouterTestingHarness.create('/probe-a')` (or `/probe-b`), and expects the matching text. The two tests are needed because a harness may be created once per test.
    - `npm test -w @bbartolome/scriba-web` exits 0 with 7 tests passing (the 5 of step 8 plus the 2 probe tests).
    - `npx eslint apps/web/src/app/features/shell-probe` exits 0 with no output. `npx tsc --noEmit -p apps/web/tsconfig.app.json` exits 0.
    - `rm -r apps/web/src/app/features/shell-probe`. Then `git status --short apps/web/src/app/features` prints nothing.
11. **Dev stack and HTTP checks (criterion 1; no file change).**
    - `npm run dev > /tmp/shl01-dev.log 2>&1 &`. Poll `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/` until it prints `200` (timeout 180 s).
    - `curl -s http://localhost:4200/ | grep -c '<app-root'` prints `1`.
    - `curl -s http://localhost:4200/healthz` prints `{"status":"ok","version":"0.0.0-dev"}`.
    - `curl -s http://localhost:4200/api/platform/version | grep -o '"builtAt"\|"composeVersion"\|"revision"\|"version"' | sort -u | wc -l` prints `4`.
    - `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:4200/api/platform/echo -H 'content-type: application/json' -d '{"count":1,"intervalMs":0}'` prints `202`.
    - `curl -sN -D /tmp/shl01-sse-headers.txt -m 3 http://localhost:4200/events > /dev/null; grep -i '^content-type' /tmp/shl01-sse-headers.txt; grep -ci '^content-encoding' /tmp/shl01-sse-headers.txt` prints `content-type: text/event-stream`, then `0`.
11A. **Dev-server external dependency (revision 3; file: `apps/web/angular.json`).** Run this step after step 11, before step 12. Steps 0 to 11 passed on f87be80 without this change; the failure is only in the browser (step 12).
    - Stop the dev stack of step 11 (its process group). Ports 4200 and 8080 must then refuse (`curl` exit 7).
    - In `apps/web/angular.json`, in `projects.scriba-web.architect.build.options` (the block that holds `browser`, `tsConfig`, `assets` and `styles`), add the key `"externalDependencies": ["marked-katex-extension"]` after `styles`. Change no other key. Then `npx prettier --write apps/web/angular.json` and `npx prettier --check apps/web` (exit 0).
    - `node -p "require('./apps/web/angular.json').projects['scriba-web'].architect.build.options.externalDependencies"` prints `[ 'marked-katex-extension' ]`. `git diff -- apps/web/angular.json` shows the added key and its line, and the `styles` line, which gains a trailing comma (the re-emit that step 3 allows for the lock). No other line changes.
    - `npm run build -w @bbartolome/scriba-web` exits 0. Record the `Initial total` line (the subagent measured 321.86 kB). `grep -l 'scriba-contracts' apps/web/dist/scriba-web/browser/*.js` prints nothing.
    - Rerun step 6 after the edit and before the dev stack restarts: `npm run build -w @bbartolome/scriba-contracts` exits 0, then `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` exits 0. The `contracts-boot` configuration inherits `build.options`, so this rerun is the evidence for the section 5 PLT-11 row. It runs while no dev stack is up, because a contracts rebuild would make `node --watch` restart the API.
    - Start the dev stack again: `npm run dev > /tmp/shl01-dev.log 2>&1 &`. Poll `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/` until it prints `200` (timeout 180 s). Then re-run every line of step 11 against `http://localhost:4200`; each prints the same result as in step 11.
    - Then run step 12 on this dev stack.
12. **Browser checks (criteria 1 and 3; no file change).** Save this script to `/tmp/shl01-check/browser-check.mjs`, outside the repo. Then run `cd <repo> && SCRIBA_E2E_CHROMIUM="$HOME/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome" node /tmp/shl01-check/browser-check.mjs`. It must print one JSON line and exit 0, with `overlay` `0` and `pageErrors` `[]`.

    ```js
    import { createRequire } from 'node:module';
    const req = createRequire(process.cwd() + '/package.json');
    const { chromium } = req('@playwright/test');
    const browser = await chromium.launch({ executablePath: process.env.SCRIBA_E2E_CHROMIUM });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto('http://localhost:4200/');
    await page.getByRole('heading', { name: 'Scriba' }).waitFor({ timeout: 30000 });
    const overlay = await page.locator('vite-error-overlay').count();
    const sse = await page.evaluate(() => new Promise((resolve) => {
      const got = [];
      const es = new EventSource('/events');
      const done = () => { es.close(); resolve(got); };
      es.onmessage = (m) => {
        const e = JSON.parse(m.data);
        got.push({ type: e.module + '/' + e.type, t: Date.now() });
        if (got.length === 1) {
          fetch('/api/platform/echo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ count: 3, intervalMs: 500 }) });
        }
        if (got.length === 4) done();
      };
      setTimeout(done, 10000);
    }));
    await page.goto('http://localhost:4200/no-such-page');
    await page.getByRole('heading', { name: 'Page not found' }).waitFor({ timeout: 30000 });
    console.log(JSON.stringify({ overlay, sse, pageErrors }));
    await browser.close();
    ```

    After the browser check, run `grep -c -E 'Failed to resolve import|Could not resolve' /tmp/shl01-dev.log`. It must print `0`. The log check runs after the browser check, because Vite reports the import error only when the browser requests the module (decision 22).

13. **Proxy echo check (criterion 2; no file change).**
    - Stop the dev stack of step 11A (the second `npm run dev` start, with its process group). Ports 4200 and 8080 must then refuse (`curl` exit 7).
    - Start a stand-in for the API on 8080: `node -e "require('node:http').createServer((q, s) => { s.setHeader('content-type', 'application/json'); s.end(JSON.stringify({ host: q.headers.host, origin: q.headers.origin })); }).listen(8080, '127.0.0.1')" &`.
    - Start the dev server: `NG_CLI_ANALYTICS=false npm run start -w @bbartolome/scriba-web > /tmp/shl01-web.log 2>&1 &`. Poll port 4200 until it prints `200`.
    - `curl -s -H 'Origin: http://localhost:4200' http://localhost:4200/healthz` prints `{"host":"localhost:4200","origin":"http://localhost:4200"}`.
    - `curl -s -H 'Origin: http://example.test' http://localhost:4200/healthz` prints `{"host":"localhost:4200","origin":"http://example.test"}`.
    - Stop both processes. Ports 4200 and 8080 refuse again.
14. **Root gates (no file change).** From the root, `npm run build`, `npm test` and `npm run lint` each exit 0. The last line of `npm run lint` is `All matched files use Prettier code style!`.
15. **Fresh clone (after the driver commits).** `git clone --branch unit/SHL-01 --no-hardlinks /Users/bbartolome/workspace/scriba-prototype /tmp/shl01-fresh` into an empty target. In the clone, `npm ci && npm run lint && npm test && npm run build` each exit 0. Then repeat steps 11, 11A and 12 in the clone. In the clone, step 11A's edit and its `git diff` check are skipped, because the key is already committed; only its `node -p` check runs, and its Prettier check, production build and step 6 rerun run as written. Then the log check of step 12 (`grep -c -E 'Failed to resolve import|Could not resolve' /tmp/shl01-dev.log` prints `0`, on the clone's dev log). They run on committed files only.
16. **Record.** Store the Node and npm versions and each command's output, the `Initial total` of step 7, the PIDs that were stopped, and the port results after each stop.

## 4. Acceptance criteria tests

All four criteria are testable in this environment: a headless Chromium is found, and no remote, runner, tailnet or credential is needed. No criterion is left as an open point.

**Criterion 1.** "`npm run dev` serves the Shell; through the proxy `/healthz` answers and an `EventSource` on `/events` receives `platform/hello`; `platform/echo` envelopes from `POST /api/platform/echo` arrive with no buffering delay."
- Test: steps 11, 11A and 12 (and step 15 in the clone). The command is `npm run dev`, then the curl lines and the browser script. The run that counts is the one after step 11A; all dev checks use `http://localhost:4200`.
- Pass: every line of step 11 holds: `/` returns 200 with one `<app-root`; `/healthz` returns the JSON; four version keys; the echo POST returns 202; the SSE response has `content-type: text/event-stream` and no `content-encoding`. The browser run prints an `sse` list whose first entry is `platform/hello`, followed by three `platform/echo` entries. The gaps between consecutive echo entries are 400 to 600 ms. `overlay` is `0`, `pageErrors` is `[]`, the `Scriba` heading is visible, and `grep -c -E 'Failed to resolve import|Could not resolve' /tmp/shl01-dev.log` prints `0` (the log check after step 12).
- Local: yes. PLT-11's earlier run on another branch does not replace this run. Not yet passed: the run on f87be80 stopped at step 12, before revision 3.

**Criterion 2.** "The proxy forwards Host and Origin unchanged (asserted on a request echo)."
- Test: the static check of step 5 (no `changeOrigin` in the proxy file) and the echo check of step 13.
- Pass: both echoed bodies in step 13 show `host` as `localhost:4200` and `origin` equal to the Origin that was sent.
- Local: yes. The stand-in replaces the API on 8080 for this check only.

**Criterion 3.** "An unknown path renders the not-found page."
- Test: `app.routes.spec.ts` (step 8), a rendered-route test with `RouterTestingHarness`. It covers `/no-such-page`, `/projects/p1/no-such`, and `/` (the landing). Plus the browser check of step 12, which navigates to `/no-such-page`.
- Pass: the first two Vitest tests find the text `Page not found` in the route element; the third finds `Scriba is running.`. In the browser, the `Page not found` heading becomes visible.
- Local: yes.

**Criterion 4.** "The route `data` type is exported for features."
- Test: `shell/route-data.spec.ts`, run by `npm test -w @bbartolome/scriba-web` (step 8). `tsc -p apps/web/tsconfig.spec.json` (step 8) checks its two `@ts-expect-error` lines, which fail the compile if a bad value is accepted. The feature-side probe (step 10) checks the import from a `features/` file, and its two tests check the two-path registration of decision 9.
- Pass: the spec passes; `tsc` exits 0; the probe's `eslint` and `tsc` each exit 0 with no output; the two probe tests pass.
- Local: yes.

## 5. Agreement with downstream units

| Unit | What it needs from SHL-01 | Provided by this plan |
|---|---|---|
| SHL-02 typed API client | An HTTP client provider and a place for the client | `provideHttpClient()` (decision 4); `API_CLIENT` placeholder. The zod cost is an open point for SHL-02 (section 6, point 1). |
| SHL-03 SSE client | `/events` proxied unbuffered; a placeholder for the client | Proxy unchanged and checked in step 11 and step 12; `SSE_CLIENT` placeholder. SHL-01 opens no EventSource at start. |
| SHL-04 theming, notices | Root config; no Material animations provider | Root config as above; no animations provider. SHL-04 must not add `provideAnimationsAsync` (deprecated). |
| SHL-05 breakpoint gate, nav | The route `data` type with `minDeviceClass` and `nav` | `ShellRouteData` (decision 10). The gate and `deviceClassGuard` are SHL-05's. |
| SHL-07 test doubles | A rendered-route test pattern | The `RouterTestingHarness` pattern of `app.routes.spec.ts`. |
| SHL-08 active project, landing | The `''` landing and the `projects/:projectId` parent to reconcile | `LandingPage` at `''` (SHL-08 replaces it); the componentless parent with `PROJECT_ROUTES`. |
| SHL-09 core gate | The registration pattern for a dummy lazy feature, and the dummy's place in nav | Pattern and type (decisions 8, 9, 10). SHL-09 checks the lazy chunk on the build stats. No criterion here tests the lazy path. |
| SHL-11 Markdown preview | Root-configured `ngx-markdown`, sanitisation on | `provideMarkdown` with `SANITIZE` = `SecurityContext.HTML` (decision 5). |
| PLT-13 e2e journey | Heading `Scriba` at `/`; no page errors | Checked in step 12. The e2e run is not a criterion; run it only if its harness works here, and report the result. |
| PLT-03 | Its criterion 2 test stays valid | `app.spec.ts` is kept (decision 17); `proxy.conf.json` unchanged. |
| PLT-11 | `contracts-boot` config and `scripts/subpaths.test.mjs` unchanged; production bundle without contracts | Step 6 reruns the `contracts-boot` build; step 7 checks the bundle. The key added to `build.options` (decision 22) also applies to `contracts-boot`. Evidence: the step 6 rerun inside step 11A, after the edit, must show the `contracts-boot` build exiting 0. |
| Project store (PST-09, PST-10, PST-20) | Three paths: `/projects` (app-level, the picker), `files` and `review` (project-scoped); one export each | `projectsRoutes` above `'**'` with `pathMatch: 'full'`; `filesRoutes` and `reviewRoutes` in `PROJECT_ROUTES` (decisions 8, 9). PST-09 line 17 says "one entry"; this plan follows the table (open point 2). |
| Setup & auth (SAU-06, SAU-15) | Two app-level paths: `/setup` (no nav), `/settings` (nav) | `setupRoutes` and `settingsRoutes`, one entry each, above `'**'`. |
| Model providers (MPR-11) | `/providers`, one path | `providersRoutes`, one entry above `'**'`. |
| Tool registry (TRG-05, TRG-13) | `/tools`, named by both units as one Shell entry | One entry and one export, `toolsRoutes`, registered once. The second unit adds only its content or children. |
| Agent loop (AGL-07) | `projects/:projectId/chat`, one path | `chatRoutes` in `PROJECT_ROUTES`. |
| Graph runner (GRR-09) | `projects/:projectId/graphs` with the child `:graphId` | `graphsRoutes` in `PROJECT_ROUTES`, prefix match; the child route lives inside it. |
| Compile & export (CEX-17) | `projects/:projectId/manuscript`, one path | `manuscriptRoutes` in `PROJECT_ROUTES`. |

Counts: Project store 3 (one app-level, two project-scoped), Setup & auth 2, each other feature 1. That is 10 top-level paths, the same total as the module table in `modules/shell.md` lines 49 to 61 (the `:graphId` child is not counted). The plan uses these counts, not the unit's "some two" (open point 2).

## 6. Open points

1. **For the Navigator, before SHL-02.** SHL-02 parses responses with Zod. A Zod import in the browser bundle brings zod's CommonJS build, which the PLT-11 review measured at about 564 kB (DECISIONS 2026-11-12, line 634). SHL-01 imports no contracts and is not affected. The decision belongs to SHL-02.
2. **Unit wording against the module table.** SHL-01 unit line 18 says most features own one path and some two. `modules/shell.md` lines 49 to 61 give Setup & auth two paths and Project store three. PST-09 line 17 says Project store registers "one entry". This plan follows the table. `modules/shell.md` is settled and is not edited here; the Navigator decides whether unit line 18 or PST-09 line 17 is corrected.
3. **Browser launch.** The brief's `/opt/pw-browsers/chromium` does not exist here. The plan uses the cached Chromium 1254 through `executablePath` with `@playwright/test` 1.65.0. If Playwright cannot launch it, step 12 is reported as not run. Then criterion 1's browser part and criterion 3's browser part stay open. The nearest local procedures are the curl SSE checks of step 11 for criterion 1, and the Vitest route tests for criterion 3.
4. **KaTeX and the `externalDependencies` change (revision 3).** Decision 22 leaves `marked-katex-extension` external. Nothing installs KaTeX, so the katex path of ngx-markdown cannot run in SHL-01, and no unit or module asks for math (`grep -rli -E 'katex|math|latex' units modules` finds none). If a later unit needs math, that unit reopens the decision: install `marked-katex-extension` and its katex peer (rejected here as unplanned dependencies), or keep the external setting and document the missing module at runtime. This plan does not decide it.
5. **Noted difference, not changed here: commits.** Decision 20 says the implementer does not commit or push (PLT-11 precedent). `prompt.md` line 73 tells the subagent to commit to its branch after each complete part, with the unit id in each message. The code subagent followed `prompt.md` and committed (328eacd, f87be80). The coordinator decides which rule applies; decision 20 is left as written.

Implementation record (not an open point): the code subagent stopped at step 12 (the browser check) on `unit/SHL-01`. Steps 0 to 11 passed on commits 328eacd and f87be80. The failure is the KaTeX pre-bundling error of decision 22. Steps 11A and 12 are the next run; steps 13 to 16 have not been run on the branch.

## 7. Facts checked and assumed

**(a) Facts checked in this session**
- At planning time, `git rev-parse --short HEAD` printed `6b8094a` on `main` and `git status --short` was empty. `main` has since gained only records (`plans/DECISIONS.md` and `plans/SHL-01.md`). `git diff --quiet 6b8094a HEAD -- ':!plans'` still exits 0, so no code changed. `git log --oneline -1 -- apps/web` prints `4f9007b`, so the web files read are at `main`.
- Web files read: `apps/web/src/main.ts`; `app.config.ts` (only `provideBrowserGlobalErrorListeners()`); `app.ts`; `app.html`; `app.spec.ts`; `proxy.conf.json` (three keys, target `http://127.0.0.1:8080`, no `changeOrigin`); `angular.json` (line 27 `styles`; `contracts-boot` at lines 50 to 55; serve `proxyConfig`); `package.json` (Angular 22.2.5 and Material 22.2.7 pinned exact; vitest 5.1.0; jsdom 30.1.3); the three tsconfig files (`module: preserve`, `moduleResolution: bundler`, `types: []` in the app, vitest globals in the spec); `src/index.html` (`<app-root>`).
- Root `package.json`: `dev` at line 24 sets `SCRIBA_DEV_ORIGINS` and `SCRIBA_SETUP_URL_BASE`; `lint` is `npm run lint --workspaces && prettier --check .`; `workspaces` includes `e2e`.
- `eslint.config.mjs`: elements `api-module` (`src/modules/*`) and `web-feature` (`src/app/features/*`); entry files `*.routes.ts`; default `disallow`.
- `node_modules`: `ls node_modules/@angular` fails; `node_modules/.bin` has `eslint`, `prettier`, `tsc`, `vitest` and no `ng`.
- `package-lock.json` (read with `node -p`): `@angular/core`, `@angular/router` and `@angular/build` 22.2.5; `eslint-plugin-boundaries` 7.4.2; `@boundaries/policies` 1.0.1; `@boundaries/config` 1.0.1; `@boundaries/elements` 3.3.2; `@playwright/test` 1.65.0; `vitest` 5.1.0; `jsdom` 30.1.3. `zone.js`, `ngx-markdown` and `marked` are absent.
- `node -v` prints `v26.13.0`; `npm -v` prints `11.20.0`; `.nvmrc` is `26`.
- `curl` to `localhost:4200` and to `127.0.0.1:8080/healthz` both exit 7 (nothing listening).
- `ls -la /opt/pw-browsers` fails. `ls ~/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/` shows `chrome`.
- `e2e/specs/journey.e2e.ts`, step "app loads": `goto('/')`, heading `Scriba` visible, `pageerror` list empty. `e2e/playwright.config.ts` reads `SCRIBA_E2E_CHROMIUM`.
- Angular 22.2.5 types, from the npm cache (extracted to `/tmp/shl01-cache/angular`): `@angular/core` `types/core.d.ts` line 3482 (`provideZonelessChangeDetection`, no `@deprecated`); `@angular/router` `types/testing.d.ts` lines 58 to 70 (`RouterTestingHarness`, `create`); `@angular/platform-browser` `types/animations-async.d.ts` line 38 (`provideAnimationsAsync` deprecated 20.2).
- ngx-markdown 22.1.1, from the npm cache (extracted to `/tmp/shl01-cache/ngx` and `/tmp/shl01-cache/ngxtypes`): peers as in decision 5; `provideMarkdown` at `types/ngx-markdown.d.ts` line 1918; `SANITIZE` exported; `fesm2022/ngx-markdown.mjs` line 153 (`DEFAULT_SECURITY_CONTEXT = SecurityContext.HTML`); the packument's `dist-tags.latest` is `22.1.1`.
- Boundaries, from the npm cache (extracted to `/tmp/shl01-cache/boundaries` and `/tmp/shl01-cache/policies`): `eslint-plugin-boundaries` 7.4.2 `dist/Rules/Dependencies.js` lines 53 to 55 (skip check before policies); `@boundaries/policies` 1.0.1 `dist/index.js` lines 1193 to 1214 (skip reasons, including the unknown-local skip at line 1207).
- Angular dev server, from the PLT-11 probe package (`@angular/build` 22.2.5, `/tmp/plt11-probe/ng/package`): `src/utils/load-proxy-config.js` lines 52 to 64; `src/builders/dev-server/vite/server.js` lines 51 and 75; no file in the package contains `changeOrigin`.
- Decisions read: DECISIONS lines 71 to 75 (Angular conflict rule), 170 to 175 (CommonJS), 197 to 203 (dev script), 204 to 211 (web tsconfig), 233 to 244 (smaller choices, item 5 at line 240), 385 to 389 (lockfile gate), 602 to 608 (criterion 5), 627 to 644 (PLT-11 review, cross-unit finding at line 634, measured bundle figures), 645 to 651 (PLT-11 criterion 1 run), 938 to 949 (Opus rejection of revision 1, the five items of revision 2).
- Revision 2 checks: `@angular/material` 22.2.7 (cached tarball, extracted to `/tmp/shl01-cache/angular/mat`): `types/core.d.ts` lines 32 and 189 (`MATERIAL_ANIMATIONS` token, its export); `provideNativeDateAdapter` is the only provider-like function; `createTheme` (`schematics/ng-add/theming/create-theme.d.ts` line 9) and `addThemeToAppStyles` (`schematics/ng-add/theming/theming.d.ts` line 11) are schematic helpers.
- Units read for revision 2 (route lines): SAU-06 line 15 (`/setup`); SAU-15 line 15 (`/settings`); PST-09 lines 17 and 18 (one entry; `/projects`); PST-10 line 15 (`/projects/:projectId/files`); PST-20 line 15 (`/projects/:projectId/review`); TRG-05 line 17 and TRG-13 line 15 (`/tools`); `plans/PLT-03.md` line 13 (feature folders).
- Units read: SHL-01 (all); SHL-02, SHL-03, SHL-04, SHL-09 (all); SHL-11 (front matter and line 18); front matter of SHL-05 to SHL-08; the route lines of AGL-07, CEX-17, GRR-09, MPR-11, PST-09, SAU-06, SAU-15 and TRG-13; `units/README.md`; `modules/shell.md`; `plans/PLT-02.md`; `plans/PLT-03.md` (lines 13, 20, 21, 25, 74, 107); `plans/PLT-11.md` (sections 1, 3, 4, 6, and section 5 line 243).
- Test folder: `scripts/subpaths.test.mjs`, `scripts/web-proxy.test.mjs` and `scripts/boundaries.test.mjs` exist.
- Revision 3 checks: the cached ngx-markdown 22.1.1 tarball (`/tmp/shl01-cache/ngxtypes/package/fesm2022/ngx-markdown.mjs`) has the dynamic `import(/* @vite-ignore */ 'marked-katex-extension')` at line 252, inside the katex branch, with the `.catch(() => null)` fallback. The `@angular/build` 22.2.5 application schema (`/tmp/plt11-probe/ng/package/src/builders/application/schema.json`) defines `externalDependencies` at line 205 (an array of strings, in the application builder's options).
- Revision 4 checks: `/tmp/plt11-probe/ng/package/src/builders/dev-server/vite/server.js` line 142 sets `preTransformRequests` to `externalMetadata.explicitBrowser.length === 0 && ssrMode === NoSsr`, so pre-transform is off once externals are set. `grep -c externalDependencies /tmp/plt11-probe/ng/package/src/builders/dev-server/schema.json` prints `0`: the option is read through the `build` target, not the dev-server schema.
- The failing run's log `/tmp/shl01-dev.log` (modified 04:30) has `Pre-transform error` at line 83 and `Internal server error` at lines 92 and 110, each a `Failed to resolve import "marked-katex-extension"` from `.angular/cache/22.2.5/scriba-web/vite/deps/ngx-markdown.js`. `grep -c 'Could not resolve' /tmp/shl01-dev.log` prints `0`. `/tmp/shl01-exp-serve.log` (the `prebundle.exclude` experiment) has `Could not resolve "marked-katex-extension"`.
- `grep -rli -E 'katex|math|latex' units modules` finds no match, so no unit or module names KaTeX or math.
- `prompt.md` line 53 (no plan and code in one iteration) and line 73 (the subagent commits to `unit/<ID>` after each complete part, with the unit id in the message): the source of open point 5.
- `git log -1 -- plans/SHL-01.md` shows commit `16a5a92`, "docs(SHL-01): add the Opus-approved plan with status planned". The revision 2 header and status in this file come from that commit; revision 3 sets `status: draft` and the header to revision 3.
- The code subagent's dev and browser results for the change (the `externalDependencies` run, Initial total 321.86 kB, no overlay, no page errors) are its reported figures. Steps 11A and 12 reproduce them; this session did not run them.

**(b) Assumed (each tested by a step)**
- Vite's default `changeOrigin` is false (step 13).
- `provideHttpClient` is exported from `@angular/common/http` and the default backend is used (step 8, `tsc`).
- The `RouterOutlet` in `App` does not break `app.spec.ts` without a router. If it does, the fix is in step 8.
- The live npm registry agrees with the cached packument: `ngx-markdown` 22.1.1 is the latest 22.x (step 2).
- Playwright 1.65.0 launches the cached Chromium 1254 through `executablePath` (step 12; open point 3).
- `npm ci` can read the lock and the registry or cache from this machine (step 1).
- The production bundle keeps an unreached dynamic `import('marked-katex-extension')` after decision 22, and that is harmless because no code path reaches it (step 11A checks the build; no criterion runs the katex path).
