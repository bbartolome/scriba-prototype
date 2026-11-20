---
id: SHL-17
status: draft
---
# SHL-17 plan — PWA: manifest, icons, app-shell service worker with exclusions, reload prompt

Unit: Frontend shell, `phase:polish` (M7). Closes with SHL-19. Revision 1 (first draft, written from `main` at `835e99a`).

## 1. Decisions this plan follows

Unit decisions and criteria (source: `units/SHL-17-pwa-service-worker.md`):

- D1. Web app manifest and icons. Angular's service worker is used only to cache the app shell's static assets. Source: unit line 18.
- D2. Never cached: `/api`, `/healthz`, `/events` and `/setup` (including the token URL). Offline use is limited to a "server unreachable" page. Source: unit line 19.
- D3. Installs over the tailnet HTTPS name. Loopback (`127.0.0.1`) is a secure context and works too. Source: unit line 20.
- D4. The service worker checks for a new bundle and prompts a reload when the server was updated. No "update available" check against published images (out of v1). Source: unit line 21; `modules/shell.md` line 103.
- D5. Criteria: unit lines 24 to 26 (installability on tailnet and loopback, full screen; no cache for the four paths and streaming after install; reload prompt, then the new bundle). Each is tested in section 5.

Module and README rules (source: `modules/shell.md`, `units/README.md`):

- D6. The Shell publishes no contract slice (`modules/shell.md` line 5). No change under `packages/contracts`.
- D7. The Shell owns the app root (app configuration, routes, dev proxy) and its own code lives in `apps/web/src/app/shell/`, outside `features/` (`modules/shell.md` line 3 and "Cross-cutting decisions").
- D8. Test seams: UI behaviour through rendered components with Angular's Vitest runner; system behaviour through Platform's Playwright e2e against the build the API serves on port 8080 (`modules/shell.md` lines 93 and 95). Nothing in this unit needs GitHub Actions, Docker or a tailnet to run locally, except the tailnet half of criterion 1 (open point OP3).
- D9. SHL-17 is blocked by SHL-09, parallel with SHL-10, SHL-11, SHL-12, SHL-13 and SHL-18, and unblocks SHL-19 (unit front matter; `units/README.md` phase table). The four units SHL-10 to SHL-13 are `status: done` on main.

Plan choices (not fixed by the unit, the module or the code; each is recorded so the implementer does not re-decide it):

- P1. Package `@angular/service-worker` at exact `22.2.5`, the same version as `@angular/core` 22.2.5, as a dependency of `@bbartolome/scriba-web`. Exact pins follow the other Angular packages in `apps/web/package.json`.
- P2. The worker config is `apps/web/ngsw-config.json`. It is wired only in the production build configuration of `apps/web/angular.json`, so `ng serve` builds no worker config.
- P3. Navigations to the excluded paths reach the network. The exact `navigationUrls` list is in section 3. Reason: a navigation to `/api/setup-auth/handshake?token=...` (the token URL, section 2 F14) would otherwise be answered with the cached `index.html` under Angular's default `navigationUrls` (`/**`).
- P4. `navigationRequestStrategy` stays `performance` (the default). Reason: a navigation then gets the cached `index.html` of the active version, so the reload prompt decides when the new bundle runs. With `freshness` a navigation would load the server's new `index.html` while the worker still runs the old version.
- P5. No `dataGroups`. The worker stores nothing from `/api`, `/healthz`, `/events` or `/setup`.
- P6. Manifest: `display` `standalone` (the app opens without browser UI and keeps the status bar). The unit's "open full screen" is read as the standalone display mode; `fullscreen` would also hide the status bar. Name `Scriba`, `start_url` and `scope` `/`. Icons 192 and 512 (`purpose` any) and 512 maskable. The theme and background colours are the light-theme values of `--mat-sys-primary` and `--mat-sys-surface` (step 6d).
- P7. `index.html` gets a manifest link, a `theme-color` meta and an `apple-touch-icon` link (180 px).
- P8. Registration written out in full: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`. The strategy is Angular's default; `enabled` turns the worker off under `ng serve` and in unit tests.
- P9. Reload prompt. A Shell service `PwaUpdate` (`apps/web/src/app/shell/pwa-update.ts`) is started from an app initializer. On `SwUpdate.versionUpdates` with `type === 'VERSION_READY'` it posts one banner with key `pwa-update` through `NoticesService`, with a `Reload` action. The action calls `SwUpdate.activateUpdate()` and then reloads the page through an injected `PAGE_RELOAD` token. Update checks: `checkForUpdate()` on `visibilitychange` when the page is visible, on `pageshow`, and every 15 minutes while the page is open. The unit fixes only "checks for a new bundle"; these triggers are this plan's choice. Unsaved text is not lost silently: `markdown-editor.ts` line 108 has a `window:beforeunload` handler, so the browser asks before the reload when text is unsaved (F18).
- P10. Offline: when the server is unreachable the worker serves the cached app shell, and the "server unreachable" state is SHL-06's banner in that shell (OP2).
- P11. No change to `apps/api`. The API's static middleware serves the new files (F9).

## 2. Facts checked and assumptions

### Facts

- F1. Unit file: the decisions are at lines 18 to 21, the criteria at lines 24 to 26, and the file has no revision notes (`grep -n "Removed by revision\|Loosened by revision\|Reworded by revision\|Moved to" units/SHL-17-pwa-service-worker.md` exits 1).
- F2. Blocker and parallel lists. `units/SHL-17-pwa-service-worker.md` front matter: `blocked_by: [SHL-09]`, `parallel_with: [SHL-10, SHL-11, SHL-12, SHL-13, SHL-18]`, `unblocks: [SHL-19]`. These are symmetric with the front matter of SHL-10 to SHL-13 and SHL-18, and `units/SHL-19-polish-gate.md` lists SHL-17 in `blocked_by`.
- F3. Plans under `plans/` that name the same shell files or the parallel units. The plans that cite SHL-17's surfaces are SHL-06 (line 131), SAU-06 (line 255), SHL-10 (line 271) and SHL-12 (line 293); all are `done`, and they cite SHL-17 only as a downstream or parallel unit. Status: SHL-01 to SHL-16 and SHL-20 to SHL-23 are `done`. `plans/SHL-18*` does not exist. `plans/CEX-14.md` and `plans/GNP-15.md` are `draft`; `plans/GRR-15.md` and `plans/PLT-23.md` are `planned`. None of these four changes `apps/web/angular.json`, `apps/web/src/index.html`, `apps/web/src/app/app.config.ts`, `apps/web/package.json`, `package-lock.json`, `apps/web/public/` or the shell notices. PLT-23 changes `e2e/specs/` only (its lines 20 to 21). GRR-15 adds three `e2e/specs/graph-*.e2e.ts` files (line 27). CEX-14 changes compile-export code under `apps/api/` (its D8 names the controller), and GNP-15 changes `packages/packs/` and one viewport in `e2e/specs/tools-preview.e2e.ts`.
- F4. `plans/DECISIONS.md`: `grep -n "SHL-17\|SHL-18\|PWA\|service worker" plans/DECISIONS.md` prints nothing. No recorded decision binds this unit.
- F5. Shell notes from earlier plans. `plans/SHL-06.md` line 131 says the offline "server unreachable" page for the service worker "is SHL-17's own surface". `plans/SAU-06.md` line 255 says nothing in that plan caches `/setup`.
- F6. Web app on main: `apps/web/public/` holds only `favicon.ico`. There is no manifest, no icon, no `ngsw-config.json`. `find . -name "*.png" -o -name "*.webmanifest" -o -name "ngsw*"` (outside `node_modules`) finds none under `apps/web`. The repo has no brand artwork.
- F7. `apps/web/src/index.html` (lines 1 to 13) has a `base href="/"`, a `favicon.ico` link and the viewport meta. It has no manifest link, no `theme-color` and no `apple-touch-icon`.
- F8. `apps/web/src/main.ts` bootstraps `App` with `appConfig`. `apps/web/src/app/app.config.ts` has no service worker provider. It has `provideZonelessChangeDetection`, `provideRouter`, `provideMarkdown` and an `provideAppInitializer` that starts the SSE client.
- F9. API static serving: `apps/api/src/app.module.ts` line 51 sets `ServeStaticModule` with `exclude: ['/api{/*rest}', HEALTHZ_ROUTE, EVENTS_ROUTE]` and `redirect: false`. `/setup` is not excluded, so it gets the SPA fallback. `apps/api/test/setup-auth-guard.test.ts` (test "criterion 6") checks that `/` answers 200 with no cookie, so static files are not behind the default-deny guard. The static root is the Angular output `browser` (`apps/api/src/bootstrap.ts` line 30).
- F10. Angular package `@angular/service-worker`: `npm view @angular/service-worker@22.2.5 version` prints `22.2.5`. Its tarball is extracted to `/tmp/shl17-probe-sw/pkg/package` (read only; nothing in the repo changed). `types/service-worker.d.ts`: `enabled?` at line 144; `registrationStrategy` at line 195 (default `registerWhenStable:30000`, given in the comment above it); `VERSION_READY` at line 68; `versionUpdates` at line 437; `checkForUpdate()` at line 460; `activateUpdate()` at line 485.
- F11. `types/config.d.ts`: `Config` has `index`, `assetGroups`, `dataGroups`, `navigationUrls`, `navigationRequestStrategy` (`'freshness' | 'performance'`). `config/schema.json` lines 165 to 180 describe `navigationUrls` and `navigationRequestStrategy`.
- F12. `ngsw-config.js` lines 80 to 89: the default `navigationUrls` are `/**` and the three exclusions `!/**/*.*`, `!/**/*__*`, `!/**/*__*/**`. Lines 157 to 163: a leading `!` makes a pattern an exclusion. Line 109: the default `navigationRequestStrategy` is `performance`.
- F13. `ngsw-worker.js`: `isNavigationRequest` (about lines 1226 to 1242) matches the path without query or hash against `navigationUrls`. The navigation branch at about lines 1213 to 1222 returns the cached index for `performance` and fetches the network first for `freshness`. A request that matches no group and is not a navigation falls through to the network (`safeFetch`).
- F14. Token URL. `packages/contracts/src/setup-auth/routes.ts` line 8: `HANDSHAKE_ROUTE` is `/api/setup-auth/handshake`; line 21: `SETUP_PAGE_PATH` is `/setup`. `apps/api/src/modules/setup-auth/setup-token.store.ts` lines 71 to 74 (`setupUrl`) build the token URL as `new URL(HANDSHAKE_ROUTE, base)` with `token`. `setup-session.controller.ts` line 69 (`@Get(HANDSHAKE_ROUTE)`) and line 70 (`@Public()`) show that the handshake is public. It answers 303 to `/setup` (or `/` after setup) and sets the cookie on loopback (line 88). The token URL is therefore under `/api`, and it is also a navigation.
- F15. `@angular/build` application builder: `serviceWorker` is an option, a path string to `ngsw-config.json` (`node_modules/@angular/build/src/builders/application/schema.json` lines 484 to 497).
- F16. Chromium for the e2e: `~/.cache/ms-playwright` holds `chromium-1254` and `chromium_headless_shell-1254`. `e2e/package.json` pins `@playwright/test` 1.65.0. `e2e/playwright.config.ts`: `testMatch` `**/*.e2e.ts` (line 11), `workers: 1`, `baseURL` `http://127.0.0.1:8080` (line 20), executable from `SCRIBA_E2E_CHROMIUM` when set (line 24).
- F17. `e2e/harness/global-setup.ts` runs `buildWorkspaces()` (contracts, api, web) and starts `apps/api/dist/main.js` on port 8080 with a temp library (`startApi`). The API always binds 8080.
- F18. Unsaved text. `unsavedTextGuard` is a `canDeactivate` on the project-store and tool-registry routes. `apps/web/src/app/shell/markdown-editor.ts` line 108 is the `(window:beforeunload)` handler.
- F19. Notices. `apps/web/src/app/shell/notices.ts`: `BannerNotice` is `{ key, message, dismissible? }`. There is no action. `notice-banners.ts` renders a `Dismiss` button only. `plans/SHL-04.md` line 20 records the same shape.
- F20. Setup URL in e2e. `e2e/specs/journey.e2e.ts` lines 34 to 47 (the "setup" step) read `SCRIBA_E2E_LIBRARY/.scriba/setup-url`, `page.goto` it, and expect the URL to be `/setup` with "Signed in from this computer (loopback)." visible. The journey is the existing guard for the token URL and must keep passing.
- F21. Module line 95 (after SHL-09's amendment): "System: Platform's Playwright e2e runs against the build the API serves on port 8080."
- F22. Tailnet path. `deploy/compose.yaml` line 24 runs `tailscale serve --bg --https=443 http://127.0.0.1:8080`. `deploy/RUNBOOK.md` lines 19 to 34 are the ST-1 check (late login, HTTPS Serve), a manual pre-release check that needs a real tailnet.
- F23. `apps/web/package.json` lists the Angular packages at exact versions (`22.2.5`, `22.2.7`). `@angular/service-worker` is not in it, and `node_modules/@angular/service-worker` does not exist (`test -d`). `package-lock.json` mentions it only as an optional peer of `@angular/build` (lines 288 and 314).
- F24. `apps/web/angular.json`: the build options are `browser`, `tsConfig`, `assets` (`**/*` from `public`), `styles` and `externalDependencies`. The `production` configuration has the budgets and `outputHashing: all`. There is a `contracts-boot` configuration. No `serviceWorker` option exists yet.
- F25. Gates on main, from the root `package.json`: `build` builds contracts, api, web, packs and e2e; `test` runs every workspace; `lint` runs every workspace, the examples and packs checks, and `prettier --check .`. Prettier ignores `/units/`, `/modules/`, `/plans/` and `/package-lock.json` (`.prettierignore`), so this plan file is not format-checked.
- F26. `apps/api/src/modules/platform/events/events.publisher.ts` line 45 builds an envelope with `type: 'hello'` (the `/platform` slice has the `hello` member, PLT-02).

### Assumptions

- A1. `ng build` for the production configuration with `serviceWorker: "ngsw-config.json"` writes `ngsw.json` and `ngsw-worker.js` into `apps/web/dist/scriba-web/browser`, which is the API's static root. Checked at step 7.
- A2. The static middleware serves `/manifest.webmanifest`, `/ngsw.json`, `/ngsw-worker.js`, the icons and the hashed assets with no cookie (F9 shows `/` is public). Checked by test 1 (manifest fetch) and test 2.
- A3. Playwright 1.65.0's Chromium supports CDP `Page.getInstallabilityErrors` and `Page.getAppManifest`, and they report what DevTools reports. Checked by test 1. If either method is missing, test 1 fails and the implementer records it; the manifest and worker checks stay.
- A4. Angular's worker passes requests that match no group and are not navigations straight to the network, so `EventSource` and `POST` are not buffered (F13). Checked by test 2.
- A5. `SwUpdate.checkForUpdate()` after a server change fires `VERSION_READY` when the hash in `ngsw.json` changes (F10). Checked by test 3.
- A6. iPadOS honours the manifest's `standalone` display and the `apple-touch-icon` for "Add to Home Screen". Only a real iPad can check this (SHL-19's demo).
- A7. The update triggers of P9 (`visibilitychange`, `pageshow`, a 15 minute interval) are adequate for "an open installed app prompts a reload". The unit gives no interval.
- A8. Playwright gives each test a fresh browser context, so a worker's state does not carry between tests (Playwright default).
- A9. `document.visibilityState` is `visible` in the headless Chromium used by the e2e, so the `visibilitychange` trigger of test 3 runs its check.
- A10. `apps/api/src/modules/platform/events/events.publisher.ts` line 45 emits a `hello` envelope (F26). Test 2(e) assumes it is sent on each new `/events` connection. Checked by test 2.

## 3. Files to change

### Change (existing files)

1. `apps/web/package.json`: add `"@angular/service-worker": "22.2.5"` to `dependencies` (step 1).
2. `package-lock.json`: changed by npm only (step 1).
3. `apps/web/angular.json`: add `"serviceWorker": "ngsw-config.json"` to `projects.scriba-web.architect.build.configurations.production` (step 3).
4. `apps/web/src/index.html`: in `<head>`, add `<link rel="manifest" href="manifest.webmanifest" />`, `<meta name="theme-color" content="<light --mat-sys-primary>" />` and `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />` (steps 2d and 6d).
5. `apps/web/src/app/app.config.ts`: add `provideServiceWorker(...)` (P8) and a second `provideAppInitializer` that calls `inject(PwaUpdate).start()` (step 4a).
6. `apps/web/src/app/shell/notices.ts`: `BannerNotice` gains `action?: { label: string; run: () => void }` (OP1, option A) (step 4b).
7. `apps/web/src/app/shell/notice-banners.ts`: render the action as a `matButton` when present (step 4c).
8. `apps/web/src/app/shell/notices.spec.ts`: one test that the action button shows and runs its handler (step 5).

### Add (new files)

9. `apps/web/ngsw-config.json` (step 3). Content:

```json
{
  "$schema": "../../node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/**/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "navigationUrls": [
    "/**",
    "!/api/**",
    "!/healthz",
    "!/events",
    "!/setup",
    "!/setup/**",
    "!/**/*.*",
    "!/**/*__*",
    "!/**/*__*/**"
  ]
}
```

No `dataGroups` key. `navigationRequestStrategy` is omitted, so the default `performance` applies (P4).

10. `apps/web/public/manifest.webmanifest` (step 2c). Content: `name` "Scriba", `short_name` "Scriba", `start_url` "/", `scope` "/", `display` "standalone", `theme_color` and `background_color` (step 6d), and `icons`: `icons/icon-192.png` (192x192, `any`), `icons/icon-512.png` (512x512, `any`), `icons/icon-maskable-512.png` (512x512, `maskable`).
11. `apps/web/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (the glyph inside the central 80 percent), and `apple-touch-icon.png` (180x180) (step 2b; OP4).
12. `apps/web/src/app/shell/pwa-update.ts`: the `PAGE_RELOAD` injection token (default: `() => document.location.reload()`) and the `PwaUpdate` service (P9) (step 4d).
13. `apps/web/src/app/shell/pwa-update.spec.ts`: four Vitest tests (section 5, supporting tests) (step 5).
14. `e2e/specs/pwa.e2e.ts`: the three criterion tests (section 5) (step 7).

Generated and not committed: `apps/web/dist/` (git-ignored by `.gitignore`), the temp directories under `/tmp`, and the temporary git worktree of OP5 (removed at step 8).

### Must NOT change

- `apps/api/**` (P11). The server serves the new files without change.
- `packages/**`, `modules/**`, `units/**`, `plans/**` (except this plan). A DECISIONS entry, if the orchestrator wants one, is written by the orchestrator, not by this unit.
- `e2e/harness/global-setup.ts`, `e2e/playwright.config.ts` and every other `e2e/specs/*.e2e.ts`.
- `apps/web/proxy.conf.mjs`, `apps/web/tsconfig*.json`, `eslint.config.mjs`, root `package.json`.
- `apps/web/src/main.ts`, `apps/web/src/app/app.routes.ts`, `app.ts`, `app.html`, `app.css` (unless OP1 is settled as option B).
- `apps/web/src/app/shell/sse-client.ts`, `connection-status.ts`, `tokens.ts`, `index.ts`, `markdown-editor.ts`, `unsaved-text.ts`.
- `apps/web/src/app/features/**`.
- `apps/web/src/material-theme.scss`, `apps/web/src/styles.css`.

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/SHL-17`, created from `main` (`git switch -c unit/SHL-17`). Record `node -v` (expected `v26.x`, the engines range `>=26 <27`) and `npm -v` (expected `11.20.0`) beside each result. Do not push.

0. Preconditions. `git status --short` prints nothing. `npm ci`. `npm run build -w @bbartolome/scriba-contracts` exits 0 (the e2e and the api read `packages/contracts/dist`, which is git-ignored and missing in a new checkout). Baseline on `main`: `npm test` and `npm run lint` exit 0. Record any failing test name as the baseline.
1. Install the worker package. `npm install --save-exact @angular/service-worker@22.2.5 --workspace=@bbartolome/scriba-web`. Expected: exit 0; `apps/web/package.json` gains `"@angular/service-worker": "22.2.5"` under `dependencies`; `npm ls @angular/service-worker` shows one copy, 22.2.5; `node_modules/@angular/service-worker/config/schema.json` exists; `npm ls typescript` still shows one version.
2. Icons, manifest and HTML head.
   a. Keep the decision on the icon artwork (OP4). Under option A, write the four PNGs with a one-off script kept in `/tmp` (no dependency added to the repo), into `apps/web/public/icons/`. Expected: `file apps/web/public/icons/*.png` reports the sizes 192, 512, 512 and 180.
   b. Write `apps/web/public/manifest.webmanifest` as section 3, item 10. Theme colours are filled in step 6d.
   c. Add the three head elements of section 3, item 4. Colours are filled in step 6d.
3. Worker config. Write `apps/web/ngsw-config.json` exactly as section 3, item 9. Add `"serviceWorker": "ngsw-config.json"` to the `production` configuration of `apps/web/angular.json`. Run `npx prettier --write apps/web/ngsw-config.json apps/web/public/manifest.webmanifest apps/web/angular.json apps/web/src/index.html`. Expected: each file is reported as written, and `npx prettier --check apps/web/ngsw-config.json apps/web/public/manifest.webmanifest apps/web/angular.json apps/web/src/index.html` exits 0.
4. Shell code.
   a. `apps/web/src/app/app.config.ts`: import `isDevMode` from `@angular/core` and `provideServiceWorker` from `@angular/service-worker`; add `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })` to `providers`; add `provideAppInitializer(() => { inject(PwaUpdate).start(); })` after the SSE initializer.
   b. `apps/web/src/app/shell/notices.ts`: add `action?: { label: string; run: () => void }` to `BannerNotice`, with a comment that the action is optional and the Dismiss button is unchanged.
   c. `apps/web/src/app/shell/notice-banners.ts`: after the message, `@if (banner.action; as action) { <button matButton (click)="action.run()">{{ action.label }}</button> }`, before the Dismiss button.
   d. `apps/web/src/app/shell/pwa-update.ts`: export `PAGE_RELOAD` (an `InjectionToken<() => void>`, `providedIn: 'root'`, default `() => document.location.reload()`) and `PwaUpdate` (`providedIn: 'root'`). `start()`: return at once when `SwUpdate.isEnabled` is false. Otherwise subscribe to `versionUpdates` filtered to `VERSION_READY`, and on each event post the banner `{ key: 'pwa-update', message: 'A new version of Scriba is ready.', dismissible: true, action: { label: 'Reload', run: () => void this.activate() } }`. `activate()`: `await SwUpdate.activateUpdate()`, then `this.reload()`. The update checks of P9 call `SwUpdate.checkForUpdate()` and ignore a rejection (`.catch(() => undefined)`) on `visibilitychange` when `document.visibilityState === 'visible'`, on `pageshow`, and on a 15 minute interval.
   Expected: the files compile in step 6.
5. Supporting unit tests (Vitest, `ng test`).
   a. `apps/web/src/app/shell/pwa-update.spec.ts`: provide `SwUpdate` with a fake that has the public surface used (`isEnabled`, a `Subject` for `versionUpdates`, `checkForUpdate`, `activateUpdate`), and provide `PAGE_RELOAD` with a spy. Render `NoticeBanners` and start `PwaUpdate`. Tests: the four cases of section 5.
   b. `apps/web/src/app/shell/notices.spec.ts`: one test that a banner with an `action` shows its button and that the click runs the handler.
   Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0; the existing tests plus five new ones (four in `pwa-update.spec.ts`, one in `notices.spec.ts`) pass; none is skipped.
6. Production build and file checks.
   a. `npm run build -w @bbartolome/scriba-web`. Expected: exit 0. Warnings are only the existing initial-bundle size warning (recorded in the `plans/DECISIONS.md` entry of 2026-11-19, "Follow-ups from the merge checks").
   b. `ls apps/web/dist/scriba-web/browser` lists `ngsw.json`, `ngsw-worker.js`, `manifest.webmanifest`, `icons/` and `index.html`. Expected: all present (A1).
   c. Read `apps/web/dist/scriba-web/browser/ngsw.json`. Expected: `navigationUrls` contains `!/api/**`, `!/healthz`, `!/events`, `!/setup` and `!/setup/**`; there is no `dataGroups` key; no asset group's `urls` or `patterns` match `/api/...`, `/healthz`, `/events` or `/setup`.
   d. Theme colours. Start the e2e once (step 7 does this). Test 1 attaches the light values of `--mat-sys-primary` and `--mat-sys-surface` as test annotations. Copy them into `manifest.webmanifest` (`theme_color`, `background_color`) and `index.html` (`theme-color`). Expected: the same two values appear in both files; run `npm run build -w @bbartolome/scriba-web` again.
7. System tests. Write `e2e/specs/pwa.e2e.ts` (section 5). Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts`. The global setup builds the web and starts the API on 8080. Expected: three tests pass. Then the mutation check of test 2: remove `"!/api/**"` and `"!/setup"` from `ngsw-config.json`, run the same command, and expect test 2 to fail at its token-URL step (the URL is not `/setup`). Restore the file, run again, and expect pass. Record both outputs. The mutation is undone before the commit.
8. Criterion 3 build B (OP5, option A). `git worktree add --detach /tmp/shl17-b HEAD`. In `/tmp/shl17-b/apps/web/src/main.ts`, add the line `console.info('scriba build B');`. Link `ln -s "$PWD/node_modules" /tmp/shl17-b/node_modules`. Run `cd /tmp/shl17-b/apps/web && npx ng build --configuration production --output-path /tmp/shl17-b-out`. Expected: exit 0; `/tmp/shl17-b-out/browser/index.html` names a `main-*.js` other than the one in `apps/web/dist/scriba-web/browser/index.html`. Set `SCRIBA_E2E_PWA_BUILD_B=/tmp/shl17-b-out/browser` and run step 7's command again. Expected: test 3 passes. Then `git worktree remove --force /tmp/shl17-b` and `git worktree prune`.
9. Full gates. From the root: `npm run build`, `npm test`, `npm run lint`, and `npm run e2e` (the whole suite). Expected: each exits 0 for the build, the unit tests and the lint. For the whole e2e suite, expected: no failure that is not in the baseline of step 0. PLT-23 lists existing flakes (`journey.e2e.ts` "project from sample", `tools-preview`); those may still appear and are not new.
10. Manual legs, not run by the implementer. The tailnet half of criterion 1 and the iPad check follow OP3. Record in the PR "not run" unless a person has run them.
11. Commit on `unit/SHL-17`, for example `feat(SHL-17): PWA manifest, app-shell service worker and reload prompt`. Do not push unless asked. Remove `/tmp` artefacts. Expected: `git status --short` lists only the files of section 3.

## 5. Acceptance criteria and tests

All tests are in `e2e/specs/pwa.e2e.ts` unless marked. Each criterion has its own test. Each test runs against the build the API serves on 8080, in a fresh browser context (except test 3, which uses its own static server, see below). Timeouts: 120 s per test, because Angular registers the worker after the app is stable, up to 30 s (`registerWhenStable:30000`). Helper: `waitForController(page)` polls `navigator.serviceWorker.controller` for up to 60 s and reloads once if it is still `null`. Helpers are copies in the file, not imports, as the other specs do.

| Criterion (unit line) | Test | What it proves | Pass condition |
|---|---|---|---|
| 1, line 24: installability on tailnet and loopback; opens full screen | `criterion 1: installable on loopback with a standalone manifest and an active worker` | Loopback half. The tailnet half is OP3 (not run here) | (a) `Page.getInstallabilityErrors` returns `errors: []` over CDP (A3). (b) `Page.getAppManifest` returns `errors: []`, and the parsed manifest has `display: "standalone"`, `start_url: "/"`, an icon of 192x192 and one of 512x512, and an icon with `purpose` containing `maskable`. (c) `navigator.serviceWorker.controller` is set after `waitForController`. (d) The two colour values of step 6d are attached as annotations. |
| 2, line 25: no request to `/api`, `/healthz`, `/events` or `/setup` served from cache; streaming works after install | `criterion 2: excluded paths are never served from cache, and streaming works after install` | Cache contents, the token URL navigation, live fetches and the SSE stream | With the worker active: (a) every entry of every `caches.keys()` cache has a path that is not `/api/*`, `/healthz`, `/events` or `/setup`. (b) `page.goto` of the token URL from `SCRIBA_E2E_LIBRARY/.scriba/setup-url` ends on `/setup`, and "Signed in from this computer (loopback)." is visible. (c) `page.goto` of `/api/setup-auth/handshake?token=wrong` returns the status the setup-auth contract gives for `SETUP_TOKEN_INVALID` (read from `@bbartolome/scriba-contracts/setup-auth`), and not 200. (d) From the page, `fetch('/healthz')` is 200, and after the cookie is set `fetch('/api/platform/version')` is 200. (e) An `EventSource('/events')` opened in the page receives an envelope with `module: "platform"` and `type: "hello"`. (f) The cache check of (a) runs again and still passes. (g) Positive side: the same cache listing holds the shell (an entry for `/index.html` and the page's `main-*.js`), so the shell is cached and the exclusions are not an accident of an empty cache. |
| 3, line 26: an open installed app prompts a reload after a server update and runs the new bundle | `criterion 3: an open installed app prompts a reload after a server update and runs the new bundle` | The update path end to end | Test 3 serves copy A of the built browser directory from its own static server on a free loopback port (`node:http`, read only, root path held in a variable), so the repo's `dist/` is not touched and the harness's port 8080 is not used. Steps: open the page; `waitForController`; record `script[src^="main-"]` (A). Switch the static root to build B (the directory named by `SCRIBA_E2E_PWA_BUILD_B`, set in step 8; the test fails with a message when the variable is unset). Dispatch `visibilitychange` on `document` (P9 trigger). Expect the text "A new version of Scriba is ready." within 60 s. Click "Reload". Expect the load event. Pass: `script[src^="main-"]` now equals B's main file name (read from B's `index.html`), and that file answers 200. `afterAll` closes the static server and removes the temp copies, even on failure. |

Supporting tests (not criteria; they run in `npm test -w @bbartolome/scriba-web`):

- `pwa-update.spec.ts`: (i) a `VERSION_READY` event renders the banner text and a `Reload` button; (ii) clicking `Reload` calls `activateUpdate()` once, and then the reload spy is called once, after the activation promise resolves; (iii) a second `VERSION_READY` leaves one `pwa-update` banner; (iv) with `isEnabled` false, nothing is posted.
- `notices.spec.ts`: a banner with an `action` shows the button, and the click calls `run` once.

## 6. Agreement with downstream and parallel units

Downstream, SHL-19 (blocked by SHL-17, closes `phase:polish`):

- SHL-19's third criterion, "SHL-17 installability and cache-exclusion criteria pass on main", is tests 1 and 2 on main: `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts`. Test 3 runs in the full e2e and is not named by SHL-19.
- SHL-19's a11y pass covers the new banner. It has `role="status"` (from `notice-banners.ts`) and a real labelled `Reload` button, and the message is text.
- SHL-19's demo step 1 (launch from the home screen) needs the manifest and icons (test 1) and the cached shell (test 2). Demo step 5 (airplane mode) needs the cached shell to load offline, and then SHL-06's banner (OP2).
- SHL-19's demo on the iPad needs OP3 and A6.
- The SHL-19 unit file needs no change. It is correct in the one order the blocker allows, and SHL-17 runs first.

Parallel, SHL-18 (no plan file exists yet; its unit is `units/SHL-18-polish-about-shortcuts.md`):

- Shared surfaces, if SHL-18 touches them: `app.config.ts` (its providers), `notices.ts` and `notice-banners.ts` (if it posts banners or empty states through notices), `app.html`, `app.ts` and `app-nav.ts` (if the About panel or shortcuts are placed there). The About panel reads `/healthz` and `/api/platform/version`. Both are never cached (P5, test 2), so its values are live in either order.
- Rule: whichever merges second rebases onto the first. The second runs `npm test -w @bbartolome/scriba-web`, and test 2 when `app.config.ts` changed. SHL-18's planner must read this plan's file list (section 3) before writing its own.
- Correct in either sequence: the banner key `pwa-update` and the `action` field are additive, and no SHL-18 empty state or skeleton depends on the worker.

Parallel, SHL-10 to SHL-13 and SHL-14 to SHL-16 (already `done`, on main):

- Their files (`tool-call-card`, `markdown-preview`, `diff-view`, `markdown-editor`, merge view) are not in section 3, except `markdown-editor.ts`, which is read only (the `beforeunload` handler, F18).
- Correct in either sequence: no change of theirs is needed, and this unit does not change their components.

Planned or draft plans (F3):

- PLT-23 and GRR-15 add or change `e2e/specs/` files only. Our spec file has its own name (`pwa.e2e.ts`) and creates no library state beyond reading `.scriba/setup-url`. Test 3 does not touch the repo's `dist/` or the harness. The full e2e run (step 9) is compared with the baseline of step 0.
- CEX-14 (`apps/api/`) and GNP-15 (`packages/packs/`, one viewport in `tools-preview`) share no file with this unit.
- Correct in either sequence: none of these plans edits the worker, the manifest, `index.html`, `angular.json`, `app.config.ts`, `package.json` or the notices.

## 7. Open points

- OP1. Where the reload prompt lives. Option A (recommended, followed by this plan): an optional `action` on `BannerNotice` (`notices.ts`, `notice-banners.ts`, `notices.spec.ts`). It is additive and keeps one banner area, but it changes a public type of SHL-04. Option B: a Shell-owned banner component placed in `app.html` beside `<app-notice-banners />`, with no change to SHL-04's type. It needs `app.html` and `app.ts`, which SHL-18 might also touch.
- OP2. The "server unreachable" offline page. Option A (recommended): the cached app shell, with SHL-06's "server unreachable" banner when `/events` fails. No new page. Option B: a separate offline page. Angular's worker has no per-path offline fallback (only `index`), so B needs a custom worker script and is a larger change. Either way a navigation to `/setup` offline shows the browser's own error page, because `/setup` is excluded (D2).
- OP3. The tailnet half of criterion 1 cannot run here (no tailnet; `deploy/RUNBOOK.md` ST-1 is a manual check). Option A (recommended): a person checks the tailnet HTTPS URL in desktop Chrome DevTools (Application, Manifest, installability) after ST-1 passes, and records the result in the PR; the iPad check is SHL-19's demo. Option B: defer the tailnet check to the release checklist, if ST-1 has not passed by the time of the PR.
- OP4. Icon artwork. The repo has none (F6). Option A (recommended): placeholder PNGs made by a one-off script in `/tmp` and committed; the owner replaces them later. Option B: the owner supplies the artwork before merge.
- OP5. How build B is made for test 3. Option A (recommended, step 8): a second production build from a temporary worktree, with one `console.info` line in `main.ts`. It produces a different `main-*.js`, so the test proves that the new bundle runs. Option B: a build with a different `appData` in a temporary worker config. It is cheaper, but the same JavaScript runs, so the test proves the update path and not a new bundle.
