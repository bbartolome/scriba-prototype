---
id: SHL-17
status: planned
---
# SHL-17 plan — PWA: manifest, icons, app-shell service worker with exclusions, reload prompt

Unit: Frontend shell, `phase:polish` (M7). Closes with SHL-19. Revision 3 (draft written from `main` at `835e99a`, revised on `main` at `b147249`, revised again on `main` at `45bfaf9`).

Revision 3 notes (2026-11-20, after PLAN DOES NOT WORK at the rework of review part 2): test 3's sequence now reloads the page once the worker controls it, waits for control again, and only then records the main bundle A and checks that A is build A's main file (F37). Without the reload the banner never appears: two implementer runs showed it (the first COMPLETE report passed with the reload; the rework run without it failed at the banner check after 60 s). Changed: step 10, the test 3 row of section 5, A5, new F37. The criterion text, the pass condition and the review parts are unchanged; test 3 stays in part 2. The committed test 3 at `unit/SHL-17` a44fc25 already follows this sequence.

Revision notes (2026-11-20): test 1 now runs in full Chromium in a persistent context, with a negative control, because the headless shell answers `Page.getInstallabilityErrors` with an empty list even for a page with no manifest (probe, F27); criterion 1's tailnet half has a local test (an HTTPS proxy on a `.ts.net` name, F28), and the real tailnet stays a manual check; test 2 now checks the source of each response through CDP (`serviceWorkerResponseSource`, F29) and its token-URL step no longer depends on the setup state (F30); `e2e/playwright.config.ts` blocks service workers for every other spec, because the worker would stop `page.route` in two existing specs (F31); test 3 makes build B itself from build A, so the spec passes in CI and on `main` with no environment variable (F32); the theme colours are fixed from the palette (F33); the procedure runs in the implementer's worktree; OP1 to OP5 are settled (section 7); section 8 "Review parts" is added. No unit file changed.

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
- D8. Test seams: UI behaviour through rendered components with Angular's Vitest runner; system behaviour through Platform's Playwright e2e against the build the API serves on port 8080 (`modules/shell.md` lines 93 and 95). Every test of this plan runs locally. Only the manual leg of step 12 (a real tailnet, a real iPad) needs what this environment does not have; it is not the test of any criterion.
- D9. SHL-17 is blocked by SHL-09, parallel with SHL-10, SHL-11, SHL-12, SHL-13 and SHL-18, and unblocks SHL-19 (unit front matter; `units/README.md` phase table). SHL-09 to SHL-16 are `status: done` on main.

Plan choices (not fixed by the unit, the module or the code; each is recorded so the implementer does not re-decide it):

- P1. Package `@angular/service-worker` at exact `22.2.5`, the same version as `@angular/core` 22.2.5, as a dependency of `@bbartolome/scriba-web`. Exact pins follow the other Angular packages in `apps/web/package.json`.
- P2. The worker config is `apps/web/ngsw-config.json`. It is wired only in the `production` configuration of `apps/web/angular.json` (the default configuration, so `npm run build -w @bbartolome/scriba-web` and the e2e global setup build it). `ng serve` (development) and `contracts-boot` build no worker.
- P3. Navigations to the excluded paths reach the network. The exact `navigationUrls` list is in section 3. Reason: a navigation to `/api/setup-auth/handshake?token=...` (the token URL, F14) or to `/healthz` would otherwise be answered with the cached `index.html` under Angular's default `navigationUrls` (`/**`).
- P4. `navigationRequestStrategy` stays `performance` (the default). Reason: a navigation then gets the cached `index.html` of the active version, so the reload prompt decides when the new bundle runs, and the shell loads when the server is down (P10). With `freshness` a navigation would load the server's new `index.html` while the worker still runs the old version.
- P5. No `dataGroups`. The worker stores nothing from `/api`, `/healthz`, `/events` or `/setup`.
- P6. Manifest: `display` `standalone`. The unit's "open full screen" is read as the standalone display mode (the app opens without browser UI); `fullscreen` would also hide the status bar, and iPadOS treats home-screen apps as standalone. Name and short name `Scriba`, `start_url` and `scope` `/`. Icons 192 and 512 (`purpose` `any`) and 512 `maskable`. `theme_color` `#005cbb` and `background_color` `#faf9fd`: the light-scheme values of `--mat-sys-primary` and `--mat-sys-surface` for the theme's `mat.$azure-palette` (F33).
- P7. `index.html` gets a manifest link, `<meta name="theme-color" content="#005cbb" />` and an `apple-touch-icon` link (180 px).
- P8. Registration written out in full: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`. The strategy is Angular's default; `enabled` turns the worker off under `ng serve` and in unit tests (`apps/web/src/app/shell/markdown-preview.spec.ts` uses `appConfig`, F34).
- P9. Reload prompt (OP1 settled as option A). A Shell service `PwaUpdate` (`apps/web/src/app/shell/pwa-update.ts`) is started from an app initializer. On `SwUpdate.versionUpdates` with `type === 'VERSION_READY'` it posts one banner with key `pwa-update` through `NoticesService`, with a `Reload` action. The action calls `SwUpdate.activateUpdate()` and then reloads the page through an injected `PAGE_RELOAD` token. Update checks: Angular's worker checks by itself when the app is opened (a navigation); in addition `checkForUpdate()` runs on `visibilitychange` when the page is visible, on `pageshow`, and every 15 minutes while the page is open. The unit fixes only "checks for a new bundle"; these triggers are this plan's choice. Unsaved text is not lost silently: `markdown-editor.ts` line 108 has a `window:beforeunload` handler, so the browser asks before the reload when text is unsaved (F18).
- P10. Offline (OP2 settled as option A): when the server is unreachable the worker serves the cached app shell, and the "server unreachable" state is SHL-06's banner `Server unreachable` in that shell (posted while a `/healthz` probe fails, `connection-status.ts` lines 41 to 51). No separate offline page: Angular's worker has no per-path offline fallback, and D1 keeps Angular's worker. A navigation to `/setup` offline shows the browser's own error page, because `/setup` is excluded (D2).
- P11. No change to `apps/api`. The API's static middleware serves the new files (F9).
- P12. Every e2e spec except `pwa.e2e.ts` runs with service workers blocked (`serviceWorkers: 'block'` in the `use` block of `e2e/playwright.config.ts`); `pwa.e2e.ts` sets `test.use({ serviceWorkers: 'allow' })`. Reason: F31. The other specs then run as they did before this unit, in either merge order with PLT-23 and GRR-15.

## 2. Facts checked and assumptions

### Facts

- F1. Unit file: the decisions are at lines 18 to 21, the criteria at lines 24 to 26, and the file has no revision notes (`grep -n "Removed by revision\|Loosened by revision\|Reworded by revision\|Moved to" units/SHL-17-pwa-service-worker.md` exits 1).
- F2. Blocker and parallel lists. `units/SHL-17-pwa-service-worker.md` front matter: `blocked_by: [SHL-09]`, `parallel_with: [SHL-10, SHL-11, SHL-12, SHL-13, SHL-18]`, `unblocks: [SHL-19]`. These are symmetric with the front matter of SHL-10 to SHL-13 and SHL-18, and `units/SHL-19-polish-gate.md` lists SHL-17 in `blocked_by`.
- F3. Plans with `status: draft` or `planned` other than this one: `plans/CEX-14.md`, `plans/GNP-15.md` (draft), `plans/GRR-15.md`, `plans/PLT-23.md` (planned). None changes `apps/web/angular.json`, `apps/web/src/index.html`, `apps/web/src/app/app.config.ts`, `apps/web/package.json`, `package-lock.json`, `apps/web/public/`, the shell notices or `e2e/playwright.config.ts`. GRR-15 only reads `angular.json` (budgets, default configuration) and `app.config.ts`, and adds three `e2e/specs/graph-*.e2e.ts` files (its T7 runs against the production build). PLT-23 changes `e2e/specs/` only. CEX-14 changes `apps/api/` code; GNP-15 changes `packages/packs/` and one viewport in `e2e/specs/tools-preview.e2e.ts`. `plans/SHL-18.md`, `plans/SHL-19.md` and branches `unit/SHL-18`, `unit/SHL-19` do not exist. Rechecked at revision 3 (main `45bfaf9`): CEX-14 and PLT-23 are now `status: done`; GNP-15 (draft) and GRR-15 (planned) are the only other open plans, and neither changes `e2e/specs/pwa.e2e.ts`, `e2e/playwright.config.ts` or `apps/web/src/app/shell/` (GRR-15 only reads `theme.ts`, `theme-toggle.ts`, `device-class.ts` and the config); SHL-18 and SHL-19 still have no plan or branch.
- F4. `plans/DECISIONS.md`: `grep -n "SHL-17\|SHL-18" plans/DECISIONS.md` prints nothing. SHL-19 is named only as the owner of the accessibility pass and as unaffected by other units (lines 3322 to 6801). No recorded decision binds this unit.
- F5. Shell notes from earlier plans. `plans/SHL-06.md` line 131 says the offline "server unreachable" page for the service worker "is SHL-17's own surface". `plans/SAU-06.md` line 255 says nothing in that plan caches `/setup`.
- F6. Web app on main: `apps/web/public/` holds only `favicon.ico`. There is no manifest, no icon, no `ngsw-config.json`, and the repo has no brand artwork.
- F7. `apps/web/src/index.html` (lines 1 to 13) has a `base href="/"`, a `favicon.ico` link and the viewport meta. It has no manifest link, no `theme-color` and no `apple-touch-icon`.
- F8. `apps/web/src/main.ts` bootstraps `App` with `appConfig`. `apps/web/src/app/app.config.ts` has no service worker provider. It has `provideZonelessChangeDetection`, `provideRouter`, `provideHttpClient`, `provideMarkdown` and a `provideAppInitializer` that starts the SSE client.
- F9. API static serving: `apps/api/src/app.module.ts` line 51 sets `ServeStaticModule` with `exclude: ['/api{/*rest}', HEALTHZ_ROUTE, EVENTS_ROUTE]` and `redirect: false`. `/setup` is not excluded, so it gets the SPA fallback (the same `index.html`). `apps/api/test/setup-auth-guard.test.ts` (test "criterion 6") checks that `/` answers 200 with no cookie. The static root is the Angular output `browser` (`apps/api/src/bootstrap.ts` line 30).
- F10. `@angular/service-worker@22.2.5` (tarball read at `/tmp/shl17-probe-sw/pkg/package`, outside the repo): `types/service-worker.d.ts` has `enabled?` (line 144), `registrationStrategy` (line 195, default `registerWhenStable:30000`), `VERSION_READY` (line 68), `versionUpdates` (line 437), `checkForUpdate()` (line 460), `activateUpdate()` (line 485). `ngsw-worker.js` line 1582: the worker calls `clients.claim()` on activate, so it takes control of open pages without a reload.
- F11. `types/config.d.ts`: `Config` has `index`, `assetGroups`, `dataGroups`, `navigationUrls`, `navigationRequestStrategy` (`'freshness' | 'performance'`).
- F12. `ngsw-config.js` lines 80 to 89: the default `navigationUrls` are `/**` and the three exclusions `!/**/*.*`, `!/**/*__*`, `!/**/*__*/**`. A leading `!` makes a pattern an exclusion. The default `navigationRequestStrategy` is `performance`. Lines 363 to 373 are the CLI: `ngsw-config <distDir> <configPath> [baseHref]`, both paths joined to the current directory; it writes `<distDir>/ngsw.json` only.
- F13. `ngsw-worker.js`: `isNavigationRequest` matches the path without query or hash against `navigationUrls`. A request that matches no group and is not a matched navigation is fetched from the network (`safeFetch`); a request with the `ngsw-bypass` header or query skips the worker (line 1609).
- F14. Token URL. `packages/contracts/src/setup-auth/routes.ts` line 8: `HANDSHAKE_ROUTE` is `/api/setup-auth/handshake`; line 21: `SETUP_PAGE_PATH` is `/setup`; line 22: `LANDING_PATH` is `/`. `setup-session.controller.ts` lines 69 to 97: the handshake is public; a valid token gets a 303 to `/setup`, or to `/` once setup is complete, and the cookie on a loopback Host; any other token gets status `SETUP_AUTH_ERROR_STATUS.SETUP_TOKEN_INVALID` (401) and the invalid-link page. The token URL is under `/api`, and it is a navigation.
- F15. `@angular/build` application builder: `serviceWorker` is an option, a path string to `ngsw-config.json` (`node_modules/@angular/build/src/builders/application/schema.json` lines 484 to 497).
- F16. Chromium for the e2e: `~/.cache/ms-playwright` holds `chromium-1254` (full Chromium) and `chromium_headless_shell-1254`. `e2e/package.json` pins `@playwright/test` 1.65.0. `e2e/playwright.config.ts`: `testMatch` `**/*.e2e.ts` (line 11), `workers: 1`, `baseURL` `http://127.0.0.1:8080` (line 20), executable from `SCRIBA_E2E_CHROMIUM` when set (line 24). CI sets `SCRIBA_E2E_CHROMIUM=/usr/bin/chromium` (`.github/workflows/ci.yml` line 48), a full Chromium.
- F17. `e2e/harness/global-setup.ts` runs `buildWorkspaces()` (contracts, api, web; the web build is the production default) and starts `apps/api/dist/main.js` on port 8080 with a temp library. The API always binds 8080.
- F18. Unsaved text. `unsavedTextGuard` is a `canDeactivate` on the project-store and tool-registry routes. `apps/web/src/app/shell/markdown-editor.ts` line 108 is the `(window:beforeunload)` handler.
- F19. Notices. `apps/web/src/app/shell/notices.ts`: `BannerNotice` is `{ key, message, dismissible? }`, with no action. `notice-banners.ts` renders each banner in a `role="status"` element with a `Dismiss` button only. `notices.spec.ts` has the banner tests (lines 39 to 75). `app.html` places `<app-notice-banners />` under the toolbar, on every route.
- F20. Setup URL in e2e. `e2e/specs/journey.e2e.ts` lines 34 to 47 read `SCRIBA_E2E_LIBRARY/.scriba/setup-url` and `page.goto` it. `nav-phone.e2e.ts` and `setup-phone.e2e.ts` read the same file. The token can be used more than once.
- F21. Module line 95 (after SHL-09's amendment): "System: Platform's Playwright e2e runs against the build the API serves on port 8080."
- F22. Tailnet path. `deploy/compose.yaml` line 24 runs `tailscale serve --bg --https=443 http://127.0.0.1:8080`: an HTTPS proxy on the `.ts.net` name in front of the loopback port. `deploy/RUNBOOK.md` lines 19 to 34 are the ST-1 check, a manual pre-release check that needs a real tailnet. This environment has no Tailscale (`which tailscale` prints nothing). It has `openssl` (`/usr/bin/openssl`) and Docker; neither a tailnet nor Docker is needed by the tests below.
- F23. `apps/web/package.json` lists the Angular packages at exact versions (`22.2.5`, `22.2.7`). `@angular/service-worker` is not in it and not in `node_modules`.
- F24. `apps/web/angular.json`: the build options are `browser`, `tsConfig`, `assets` (`**/*` from `public`), `styles` and `externalDependencies`. The `production` configuration has the budgets and `outputHashing: all`; `defaultConfiguration` is `production`. `contracts-boot` is a separate configuration, used by no script (`grep -rn contracts-boot` outside `angular.json` finds nothing).
- F25. Gates on main, from the root `package.json`: `build` builds contracts, api, web, packs and e2e; `test` runs every workspace; `lint` runs every workspace, the examples and packs checks, and `prettier --check .`. Prettier ignores `/units/`, `/modules/`, `/plans/` and `/package-lock.json`.
- F26. `apps/api/src/modules/platform/events/events.publisher.ts` lines 38 to 53 write the `hello` envelope (`module: 'platform'`, `type: 'hello'`) on each new `/events` connection.
- F27. Installability probe (2026-11-20, scripts in `/tmp/shl17-rev`, outside the repo; Playwright 1.65.0 of `e2e/`, a test server with a manifest, two PNG icons and a passthrough worker): headless shell `chromium.launch()` gave `{"installabilityErrors":[]}` for the good page and also for a page with no manifest, so its answer proves nothing. Full Chromium (`channel: 'chromium'`) in a normal context gave `in-incognito`; full Chromium in `launchPersistentContext` gave `[]` for the good page and `no-manifest` for the page without one. The CDP result field is `installabilityErrors` (not `errors`).
- F28. Local HTTPS name probe (same scripts): a self-signed certificate for `scriba.tail-test.ts.net` (`openssl req -x509 ... -addext subjectAltName=DNS:...`), a Node `https` server on a free loopback port, and full Chromium in a persistent context launched with `--host-resolver-rules=MAP scriba.tail-test.ts.net:443 127.0.0.1:<port>` and `--ignore-certificate-errors-spki-list=<base64 SHA-256 of the SPKI>`: the page at `https://scriba.tail-test.ts.net/` got an active worker and `installabilityErrors: []`. The same name over plain `http` had no `navigator.serviceWorker` (not a secure context), so the leg tells a secure HTTPS name from an insecure one.
- F29. Response-source probe (same scripts): with CDP `Network.enable` on the page, `Network.responseReceived` gave `fromServiceWorker: true, serviceWorkerResponseSource: "cache-storage"` for a response the worker served from the Cache API, and `serviceWorkerResponseSource: "network"` for one it fetched.
- F30. Setup state in the full suite. After `journey.e2e.ts` (which sorts before `pwa.e2e.ts`) completes setup, the handshake answers 303 to `/` (F14), not to `/setup`. A test that expects `/setup` after the token URL fails in the full run.
- F31. `e2e/specs/phone-toolbar.e2e.ts` lines 67 and 78 and `setup-phone.e2e.ts` lines 65 and 170 use `page.route`. Playwright's `page.route` does not see requests that a service worker handles. With the worker on (F10, `clients.claim()`), those routes would stop applying once the worker takes control, a few seconds after the app is stable.
- F32. Build B for criterion 3. The e2e global setup builds only build A (F17), and CI sets no extra variable. A spec that needs a second build from outside fails in CI and in SHL-19's run on `main`. A second build can be made from A in the test: copy A, write a new `main-*.js` (A's file plus one statement), point `index.html` at it, and regenerate `ngsw.json` with Angular's CLI (F12). The new manifest has new hashes, so the worker sees a new version.
- F33. Theme colours. `apps/web/src/material-theme.scss` uses `mat.theme` with `primary: mat.$azure-palette`. `node_modules/@angular/material/core/theming/_palettes.scss` line 794: azure tone 40 is `#005cbb` (light `--mat-sys-primary`); line 836: its neutral tone 98 is `#faf9fd` (light `--mat-sys-surface`).
- F34. `apps/web/src/app/shell/markdown-preview.spec.ts` imports `appConfig`, so it gets `provideServiceWorker` and the new initializer under `ng test`, where `isDevMode()` is true and the worker is off.
- F35. Host policy. `apps/api/src/modules/setup-auth/host-frame.middleware.ts` refuses every path but `/healthz` when the Host is not `127.0.0.1:8080`, `localhost:8080`, a dev origin or the live tailnet name (`request-policy.ts` lines 29 to 51). A local HTTPS proxy must therefore send `Host: 127.0.0.1:8080` to the API. The tailnet Host admission is SAU's surface, not this unit's.
- F36. `connection-status.ts` lines 41 to 51 post the banner `Server unreachable` (key `server-unreachable`) while `serverReachable()` is false; `sse-client.ts` lines 162 to 188 set it from a `/healthz` probe with `cache: 'no-store'` that fails or is not ok.
- F37. Version mapping in `@angular/service-worker@22.2.5` `ngsw-worker.js`: `notifyClientsAboutVersionReady` (line 2202) posts `VERSION_READY` only to clients found in `clientVersionMap`, and returns for a client with no entry (lines 2206 to 2208). A client gets an entry in `assignVersion` (lines 1934 to 1975), called from `handleFetch` (line 1837) for a request the worker handles; a navigation the worker handles maps its `resultingClientId` to the latest version (line 1974). A page loaded before the worker existed was loaded from the network; `clients.claim()` (line 1582) makes it controlled but does not map it, and the shell served by test 3's static server makes no later request that reliably maps it. Two implementer runs of test 3 (`plans/DECISIONS.md`, the three SHL-17 entries of 2026-11-20): with a `page.reload()` and a second `waitForController` before recording A, the banner appeared and the test passed; without them the banner was not found after 60 s.

### Assumptions

- A1. `ng build` for the production configuration with `serviceWorker: "ngsw-config.json"` writes `ngsw.json` and `ngsw-worker.js` into `apps/web/dist/scriba-web/browser`, the API's static root. Checked at step 5.
- A2. The static middleware serves `/manifest.webmanifest`, `/ngsw.json`, `/ngsw-worker.js`, the icons and the hashed assets with no cookie (F9). Checked by tests 1 and 2.
- A3. The probe results of F27 to F29 hold for the real app (a larger shell, the Angular worker). Checked by tests 1 and 2, and by the negative control of test 1.
- A4. Angular's worker passes `EventSource` requests and `POST`s to the network unbuffered (F13). Checked by test 2.
- A5. `checkForUpdate()` after `ngsw.json` changes fires `VERSION_READY` in a page whose navigation the worker served (F37). Checked by test 3.
- A6. iPadOS honours the manifest's `standalone` display and the `apple-touch-icon` for "Add to Home Screen". Only a real iPad can check this (step 12, SHL-19's demo).
- A7. The update triggers of P9 are adequate for "an open installed app prompts a reload". The unit gives no interval.
- A8. Playwright gives each test a fresh browser context, so a worker's state does not carry between tests.
- A9. `document.visibilityState` is `visible` in the headless Chromium used by test 3, so the dispatched `visibilitychange` runs its check.
- A10. A Chromium tab with an active worker behaves as the installed app for the update path (the installed app is the same origin, worker and page). Test 3 runs in a tab.

## 3. Files to change

### Change (existing files)

1. `apps/web/package.json`: add `"@angular/service-worker": "22.2.5"` to `dependencies` (step 1).
2. `package-lock.json`: changed by npm only (step 1).
3. `apps/web/angular.json`: add `"serviceWorker": "ngsw-config.json"` to `projects.scriba-web.architect.build.configurations.production` (step 3).
4. `apps/web/src/index.html`: in `<head>`, add `<link rel="manifest" href="manifest.webmanifest" />`, `<meta name="theme-color" content="#005cbb" />` and `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />` (step 2).
5. `apps/web/src/app/app.config.ts`: add `provideServiceWorker(...)` (P8, step 4) and a second `provideAppInitializer` that calls `inject(PwaUpdate).start()` (step 8).
6. `apps/web/src/app/shell/notices.ts`: `BannerNotice` gains `action?: { label: string; run: () => void }` (step 7).
7. `apps/web/src/app/shell/notice-banners.ts`: render the action as a `matButton` when present (step 7).
8. `apps/web/src/app/shell/notices.spec.ts`: one test that the action button shows and runs its handler (step 9).
9. `e2e/playwright.config.ts`: add `serviceWorkers: 'block'` to `use`, with the comment "Specs run without a service worker; pwa.e2e.ts allows it. page.route does not see requests a worker handles." (P12, step 6).

### Add (new files)

10. `apps/web/ngsw-config.json` (step 3). Content:

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

11. `apps/web/public/manifest.webmanifest` (step 2): `name` "Scriba", `short_name` "Scriba", `start_url` "/", `scope` "/", `display` "standalone", `theme_color` "#005cbb", `background_color` "#faf9fd", and `icons`: `icons/icon-192.png` (`192x192`, `image/png`, `any`), `icons/icon-512.png` (`512x512`, `any`), `icons/icon-maskable-512.png` (`512x512`, `maskable`).
12. `apps/web/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and `apple-touch-icon.png` (180x180): placeholder squares filled with `#005cbb` (OP4, step 2).
13. `apps/web/src/app/shell/pwa-update.ts`: the `PAGE_RELOAD` injection token (default `() => document.location.reload()`) and the `PwaUpdate` service (P9, step 8).
14. `apps/web/src/app/shell/pwa-update.spec.ts`: four Vitest tests (section 5, supporting tests; step 9).
15. `e2e/specs/pwa.e2e.ts`: tests 1 and 2 (step 6), test 3 and supporting test S1 (step 10).

Generated and not committed: `apps/web/dist/` (git-ignored), the temp directories under `/tmp` and the ones the spec makes under `os.tmpdir()`.

### Must NOT change

- `apps/api/**` (P11). The server serves the new files without change.
- `packages/**`, `modules/**`, `units/**`, `plans/**` (except this plan's status, set by the orchestrator).
- `e2e/harness/**` and every `e2e/specs/*.e2e.ts` other than the new `pwa.e2e.ts`. In `e2e/playwright.config.ts`, only the one `serviceWorkers` line and its comment.
- `apps/web/proxy.conf.mjs`, `apps/web/tsconfig*.json`, `eslint.config.mjs`, root `package.json`.
- `apps/web/src/main.ts`, `apps/web/src/app/app.routes.ts`, `app.ts`, `app.html`, `app.css`.
- `apps/web/src/app/shell/sse-client.ts`, `connection-status.ts`, `tokens.ts`, `index.ts`, `markdown-editor.ts`, `unsaved-text.ts`.
- `apps/web/src/app/features/**`, `apps/web/src/material-theme.scss`, `apps/web/src/styles.css`.

## 4. Procedure

Run in the implementer's own worktree on branch `unit/SHL-17` (path named by the orchestrator, for example `/Users/bbartolome/workspace/scriba-prototype-wt/SHL-17`, made from `main`), not in the shared main working tree. Record `node -v` (expected `v26.x`) and `npm -v` (expected `11.20.0`) beside each result. Before each e2e run, check that nothing listens on port 8080 (only one e2e run at a time across worktrees). Do not push.

Part 1: manifest, worker and exclusions (criteria 1 and 2).

0. Preconditions. `git status --short` prints nothing. `npm ci`. `npm run build -w @bbartolome/scriba-contracts` exits 0. Baseline on the branch before any change: `npm test`, `npm run lint` and `npm run e2e` exit 0, or record each failing test name as the baseline.
1. Install the worker package. `npm install --save-exact @angular/service-worker@22.2.5 --workspace=@bbartolome/scriba-web`. Expected: exit 0; `apps/web/package.json` gains `"@angular/service-worker": "22.2.5"` under `dependencies`; `npm ls @angular/service-worker` shows one copy, 22.2.5; `node_modules/@angular/service-worker/config/schema.json` and `node_modules/@angular/service-worker/ngsw-config.js` exist (test 3 calls the second); `npm ls typescript` still shows one version.
2. Icons, manifest and HTML head.
   a. Icons (OP4): a one-off Node script kept in `/tmp/shl17-icons/` (not in the repo, no dependency: `node:zlib` for the deflate, a hand-written CRC-32 and PNG chunks) writes four RGB PNGs filled with `#005cbb` into `apps/web/public/icons/`: `icon-192.png` 192x192, `icon-512.png` 512x512, `icon-maskable-512.png` 512x512, `apple-touch-icon.png` 180x180. Expected: `file apps/web/public/icons/*.png` reports these sizes.
   b. Write `apps/web/public/manifest.webmanifest` as section 3, item 11.
   c. Add the three head elements of section 3, item 4.
3. Worker config. Write `apps/web/ngsw-config.json` exactly as section 3, item 10. Add `"serviceWorker": "ngsw-config.json"` to the `production` configuration of `apps/web/angular.json`. Run `npx prettier --write apps/web/ngsw-config.json apps/web/public/manifest.webmanifest apps/web/angular.json apps/web/src/index.html`, then `npx prettier --check` on the same four files. Expected: exit 0.
4. Registration. `apps/web/src/app/app.config.ts`: import `isDevMode` from `@angular/core` and `provideServiceWorker` from `@angular/service-worker`; add `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })` to `providers`.
5. Production build and file checks.
   a. `npm run build -w @bbartolome/scriba-web`. Expected: exit 0. Warnings are only the existing initial-bundle size warning (`plans/DECISIONS.md` entry of 2026-11-19, "Follow-ups from the merge checks").
   b. `ls apps/web/dist/scriba-web/browser` lists `ngsw.json`, `ngsw-worker.js`, `manifest.webmanifest`, `icons/` and `index.html` (A1).
   c. Read `apps/web/dist/scriba-web/browser/ngsw.json`. Expected: `navigationUrls` holds the exclusions of `!/api/**`, `!/healthz`, `!/events`, `!/setup` and `!/setup/**` (as regex entries with `positive: false`); there is no `dataGroups` entry, or it is empty; no asset group's `urls` or `patterns` match `/api/...`, `/healthz`, `/events` or `/setup`.
6. Tests 1 and 2. Add `serviceWorkers: 'block'` and its comment to `use` in `e2e/playwright.config.ts` (section 3, item 9). Write `e2e/specs/pwa.e2e.ts` with `test.use({ serviceWorkers: 'allow' })`, the helpers, test 1 and test 2 (section 5). Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts`. Expected: 2 passed. Then two mutation checks, each with the same command, each undone before the next:
   - M1: remove `"!/setup"` and `"!/setup/**"` from `apps/web/ngsw-config.json`. Expected: test 2 fails at check (g) (a `/setup` response with source `cache-storage`).
   - M2: remove `"!/api/**"`. Expected: test 2 fails at check (b) (the page stays on the handshake path, or the version fetch is 401).
   Before M1, copy the file to `/tmp/shl17-ngsw-config.json`; after each mutation, copy it back (`cmp` of the two files exits 0). Run again, expect 2 passed. Record the three outputs.
   Then commit part 1 on `unit/SHL-17`, for example `feat(SHL-17): manifest, icons and app-shell service worker with exclusions`.

Part 2: reload prompt, offline shell and gates (criterion 3).

7. Banner action (OP1, option A). `apps/web/src/app/shell/notices.ts`: add `action?: { label: string; run: () => void }` to `BannerNotice`, with the comment "An optional button shown before Dismiss." `apps/web/src/app/shell/notice-banners.ts`: after the message, `@if (banner.action; as action) { <button matButton (click)="action.run()">{{ action.label }}</button> }`, before the Dismiss button.
8. `PwaUpdate`. `apps/web/src/app/shell/pwa-update.ts`: export `PAGE_RELOAD` (an `InjectionToken<() => void>`, `providedIn: 'root'`, factory `() => () => document.location.reload()`) and `PwaUpdate` (`providedIn: 'root'`). `start()`: return at once when `SwUpdate.isEnabled` is false. Otherwise subscribe to `versionUpdates` filtered to `VERSION_READY`, and on each event post the banner `{ key: 'pwa-update', message: 'A new version of Scriba is ready.', dismissible: true, action: { label: 'Reload', run: () => void this.activate() } }`. `activate()`: `await SwUpdate.activateUpdate()`, then call the `PAGE_RELOAD` function. The checks of P9 call `SwUpdate.checkForUpdate().catch(() => undefined)` on `visibilitychange` when `document.visibilityState === 'visible'`, on `pageshow`, and on a 15 minute `setInterval`. In `app.config.ts`, add `provideAppInitializer(() => { inject(PwaUpdate).start(); })` after the SSE initializer.
9. Supporting unit tests (Vitest). `apps/web/src/app/shell/pwa-update.spec.ts`: provide `SwUpdate` with a fake that has the public surface used (`isEnabled`, a `Subject` for `versionUpdates`, `checkForUpdate`, `activateUpdate`) and `PAGE_RELOAD` with a spy; render `NoticeBanners` and start `PwaUpdate`; the four cases of section 5. `notices.spec.ts`: the action case of section 5. Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0; the existing tests (including `markdown-preview.spec.ts`, F34) plus five new ones pass; none is skipped.
10. Test 3 and S1. Add test 3 and S1 to `e2e/specs/pwa.e2e.ts` (section 5). Test 3's sequence is, in this order: `page.goto(<static server>/)`; `waitForController(page)`; `page.reload()`; `waitForController(page)` again; read `script[src^="main-"]` as A and `expect(A).toBe(<A's main file name>)`; `setRoot(b/)`; dispatch `visibilitychange`; expect the banner. The reload is required: without it the worker never maps the page to a version and sends it no `VERSION_READY` (F37). Do not remove it. Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts`. Expected: 4 passed. Record the output, including the two `main-*.js` names of test 3.
11. Full gates. From the root: `npm run build`, `npm test`, `npm run lint`, `npm run e2e`. Expected: the first three exit 0. For the whole e2e suite: no failure that is not in the baseline of step 0 (PLT-23 lists existing flakes, `journey.e2e.ts` "project from sample" and `tools-preview`).
12. Manual legs, not run by the implementer and not the test of a criterion: on a machine where `deploy/RUNBOOK.md` ST-1 passes, open the tailnet HTTPS URL in desktop Chrome, DevTools, Application, Manifest, and record that installability shows no error; the iPad "Add to Home Screen" and full-screen launch (A6) is SHL-19's demo step 1. Record "not run" in the PR unless a person has run them.
13. Commit part 2 on `unit/SHL-17`, for example `feat(SHL-17): reload prompt after a server update`. Do not push. Remove `/tmp` artefacts. Expected: `git status --short` prints nothing, and `git diff --stat main...unit/SHL-17` lists only the files of section 3.

## 5. Acceptance criteria and tests

All tests are in `e2e/specs/pwa.e2e.ts`, which sets `test.use({ serviceWorkers: 'allow' })`. Helpers are copies in the file, not imports, as the other specs do: `waitForController(page)` polls `navigator.serviceWorker.controller` for up to 60 s (Angular registers the worker when the app is stable, up to 30 s) and reloads once if it is still `null`; `readSetupUrl()` reads `SCRIBA_E2E_LIBRARY/.scriba/setup-url`. Route constants come from `@bbartolome/scriba-contracts` (`HANDSHAKE_ROUTE`, `SETUP_PAGE_PATH`, `HEALTHZ_ROUTE`, `EVENTS_ROUTE`, `VERSION_ROUTE`, `SETUP_AUTH_ERROR_STATUS`), as the other specs import them. Per-test timeout 180 s. Every temp directory, server and browser a test makes is closed or removed in `finally` or `afterAll`, also on failure.

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| 1, line 24: installability checks on the tailnet HTTPS URL and on loopback; opens full screen | `criterion 1: installable on loopback and on an HTTPS tailnet-style name, standalone display` | Browser: `chromium.launchPersistentContext(<temp user data dir>, { channel: 'chromium' unless SCRIBA_E2E_CHROMIUM is set, executablePath: SCRIBA_E2E_CHROMIUM, args: [host-resolver rule, SPKI flag] })`, because the headless shell's answer proves nothing and a normal context reports `in-incognito` (F27). HTTPS proxy, made in the test: `openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=scriba.shl17-test.ts.net -addext subjectAltName=DNS:scriba.shl17-test.ts.net` into a temp dir (the test fails with a message if `openssl` is missing); the SPKI hash with `node:crypto` (`new X509Certificate(cert).publicKey.export({ type: 'spki', format: 'der' })`, SHA-256, base64); a `node:https` server on `127.0.0.1:0` that pipes each request to `127.0.0.1:8080` with `Host: 127.0.0.1:8080` (F35), streaming the body; Chromium args `--host-resolver-rules=MAP scriba.shl17-test.ts.net:443 127.0.0.1:<port>` and `--ignore-certificate-errors-spki-list=<hash>`. Checks: (a) negative control: on `http://127.0.0.1:8080/healthz` (a document with no manifest) `Page.getInstallabilityErrors` returns a non-empty `installabilityErrors` holding `no-manifest`; otherwise fail with "the browser runs no installability check". (b) Loopback: on `http://127.0.0.1:8080/`, after `waitForController`, `installabilityErrors` is `[]`, and `Page.getAppManifest` returns `errors: []`. (c) HTTPS name: on `https://scriba.shl17-test.ts.net/`, after `waitForController`, `installabilityErrors` is `[]`. (d) Full screen: `/manifest.webmanifest` (fetched from the page) parses with `display: "standalone"`, `start_url: "/"`, `scope: "/"`, an icon `192x192` and one `512x512` with purpose `any` or none, one with purpose `maskable`; each icon URL answers 200 with `image/png`. The real tailnet name is step 12 (manual). |
| 2, line 25: with the worker active, no request to `/api`, `/healthz`, `/events` or `/setup` is served from cache; streaming works after install | `criterion 2: excluded paths are never served from cache, and streaming works after install` | Before the first navigation, open a CDP session on the page with `Network.enable`, and record each `Network.responseReceived` as `{ path, fromServiceWorker, serviceWorkerResponseSource }` (F29). Steps: `page.goto('/')`; `waitForController`; `page.reload()`. (a) Token URL: `page.goto(readSetupUrl())`; the final path is not `HANDSHAKE_ROUTE`; then `fetch(VERSION_ROUTE)` from the page is 200, so the handshake reached the server and set the cookie. The final path may be `/setup` or the landing, because the full suite may have completed setup before this test (F30). (b) `page.goto(HANDSHAKE_ROUTE + '?token=wrong')` answers `SETUP_AUTH_ERROR_STATUS.SETUP_TOKEN_INVALID`. (c) `page.goto(SETUP_PAGE_PATH)` answers 200. (d) `page.goto(HEALTHZ_ROUTE)` answers 200 with a JSON body whose `status` is `ok` (not the shell's HTML). (e) Back on `/`: `fetch(HEALTHZ_ROUTE)` is 200 and `fetch(VERSION_ROUTE)` is 200. (f) Streaming: a new `EventSource(EVENTS_ROUTE)` in the page receives an envelope with `module: "platform"` and `type: "hello"` within 10 s. (g) Source check: the record has at least one response under each of `/api/`, `/healthz`, `/events`, `/setup`, and none of them has `serviceWorkerResponseSource === 'cache-storage'`; at least one shell response (the `/` navigation after the reload, or a `main-*.js`) has `cache-storage`, so the worker serves the shell and the check is not empty. (h) Cache listing: in the page, every request URL in every `caches.keys()` cache has a path not under the four prefixes, and the listing holds `/index.html` and the page's `main-*.js`. Mutations M1 and M2 of step 6 show that (g) and (a) fail when the exclusions are removed. |
| 3, line 26: after the server is updated to a new build, an open installed app prompts a reload and then runs the new bundle | `criterion 3: an open installed app prompts a reload after a server update and runs the new bundle` | At the start of the test (or in `beforeAll`): copy `apps/web/dist/scriba-web/browser` (build A, made by the global setup) to a temp dir `a/` and again to `b/`. Make build B in `b/` (F32): read A's main file name from `index.html` (`main-<hash>.js`); write `main-shl17b.js` as A's file plus the line `console.info('scriba build B');`; delete the old main file in `b/`; replace every occurrence of the old name in `b/index.html`; run `node <repo>/node_modules/@angular/service-worker/ngsw-config.js <abs b> <abs apps/web/ngsw-config.json>` with `cwd: '/'`. Expected: `b/ngsw.json` differs from `a/ngsw.json`. Static server, made in the test: `node:http` on `127.0.0.1:0` (not the harness's port 8080, and the repo's `dist/` is not touched), root held in a variable; `GET /healthz` answers 200 `{"status":"ok"}`; an existing file answers 200 with its content type and `Cache-Control: no-cache`; a path with no dot answers `index.html`; anything else 404; the query is ignored. Steps: start collecting the page's console messages; open `/` on the static server; `waitForController`; `page.reload()`, so the navigation goes through the worker and the worker maps this page to version A (F37; without it no `VERSION_READY` reaches the page); `waitForController` again; record `script[src^="main-"]` (A) and assert `A` equals A's main file name read from `index.html` when build B was made (the old main bundle, not `main-shl17b.js`). Set the root to `b/`. Run `document.dispatchEvent(new Event('visibilitychange'))` in the page (P9 trigger). Expect the text "A new version of Scriba is ready." within 60 s. Click the `Reload` button and wait for the `load` event. Pass: `script[src^="main-"]` is now `main-shl17b.js`, and the console message `scriba build B` was logged after the reload. |

Supporting tests (not criteria):

- S1, in `pwa.e2e.ts`: `offline: with the server down, the cached shell loads and shows Server unreachable` (D2, P10). Same static server with root `a/`; open `/`; `waitForController`; then the server destroys every new socket (a network failure); `page.reload()`. Pass: the toolbar heading `Scriba` is visible and the text `Server unreachable` is visible within 30 s (F36).
- `pwa-update.spec.ts` (Vitest): (i) a `VERSION_READY` event renders the banner text and a `Reload` button; (ii) clicking `Reload` calls `activateUpdate()` once, and the reload spy is called once, after the activation promise resolves; (iii) a second `VERSION_READY` leaves one `pwa-update` banner; (iv) with `isEnabled` false, nothing is posted.
- `notices.spec.ts` (Vitest): a banner with an `action` shows its button before Dismiss, and the click calls `run` once.

## 6. Agreement with downstream and parallel units

Downstream, SHL-19 (blocked by SHL-17; no plan and no branch yet):

- SHL-19's third criterion, "SHL-17 installability and cache-exclusion criteria pass on main", is tests 1 and 2 on main: `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts --grep "criterion 1|criterion 2"`. The spec needs no environment variable and no tailnet (test 3 makes build B itself), so it also passes in SHL-19's full e2e run and in CI (full Chromium at `/usr/bin/chromium`, F16).
- SHL-19's accessibility pass covers the new banner: it is in the existing `role="status"` element, its `Reload` button is a labelled `matButton`, and the message is text.
- SHL-19's phone-viewport check is a new e2e spec; with P12 it runs without a worker unless its planner sets `serviceWorkers: 'allow'` for it. Its planner should know this rule.
- SHL-19's demo step 1 (launch from the home screen) needs the manifest and icons (test 1) and step 12's manual leg; demo step 5 (airplane mode on the open app: reconnecting, then current state) is SHL-06's indicator and does not depend on this unit.
- The SHL-19 unit file needs no change. It is correct in the one order the blocker allows.

Parallel, SHL-18 (no plan file and no branch; its unit is `units/SHL-18-polish-about-shortcuts.md`):

- Files SHL-18 may share: `app.config.ts` (providers), `notices.ts` and `notice-banners.ts` (if it posts banners), `app.html`, `app.ts` and `app-nav.ts` (About panel, shortcuts), and `e2e/playwright.config.ts` (only if it adds e2e). Its About panel reads `/healthz` and `/api/platform/version`; neither is ever cached (P5, test 2), so the values are live in either order.
- Rule for SHL-18's files: whichever unit merges second rebases onto the first, keeps both changes in a shared file (both are additive: a provider or initializer, an optional field, a button), and runs `npm test -w @bbartolome/scriba-web` and `npm run e2e -w @bbartolome/scriba-e2e -- specs/pwa.e2e.ts`. SHL-18 must not add `dataGroups` or change the exclusions of `apps/web/ngsw-config.json`; a new server path outside `/api` would need its own exclusion there. If SHL-18 adds an e2e spec that uses `page.route`, P12 keeps it working. SHL-18's planner reads section 3 of this plan before writing its own.
- Correct in either sequence: the banner key `pwa-update`, the `action` field and the `serviceWorkers` line are additive, and no SHL-18 skeleton, empty state or shortcut depends on the worker. A keyboard shortcut for save does not reload the page.

Parallel and earlier Shell units SHL-10 to SHL-16 (done, on main): their files are not in section 3. `markdown-editor.ts` is read only (F18), and `markdown-preview.spec.ts` keeps passing with the worker off (F34, step 9).

Draft and planned plans (F3):

- PLT-23 and GRR-15 add or change `e2e/specs/` files only. With P12 their specs run without a worker in either merge order, as on main today; GRR-15's T7 timing runs against the same production build with no worker. `pwa.e2e.ts` has its own name, reads only `.scriba/setup-url`, and its token step works whatever the setup state (F30).
- CEX-14 (`apps/api/`) and GNP-15 (`packages/packs/`, one viewport in `tools-preview`) share no file with this unit.

## 7. Settled points

- OP1, settled (option A): the reload prompt is a banner with an optional `action` on `BannerNotice` (`notices.ts`, `notice-banners.ts`). It is additive, keeps one banner area on every route, and needs no change to `app.html` or `app.ts`, which SHL-18 may touch. SHL-04 is done; its type gains an optional field only, and its existing tests are unchanged.
- OP2, settled (option A): offline, the cached app shell with SHL-06's `Server unreachable` banner is the "server unreachable" page (P10), checked by S1. A separate page would need a custom worker script, against D1.
- OP3, settled: criterion 1's tailnet half is tested locally by test 1(c), a trusted HTTPS proxy on a `.ts.net` name in front of port 8080, as `tailscale serve` is (F22, F28). It needs no tailnet, Docker or GitHub Actions. What the local leg cannot check (the real Tailscale name and certificate, and the API's tailnet Host admission, which is SAU's surface) is the manual leg of step 12, recorded in the PR; the iPad check is SHL-19's demo.
- OP4, settled (option A): placeholder PNGs filled with the theme primary `#005cbb`, made by a one-off script in `/tmp` and committed. The owner may replace the files later; the names and sizes stay.
- OP5, settled: build B is made inside test 3 from build A (a new `main-*.js` and a `ngsw.json` regenerated by Angular's CLI), not by a second Angular build from a worktree and an environment variable. The bundle that runs after the reload is new JavaScript, so the test proves "runs the new bundle", and the spec runs in CI and on `main` with no setup.

No point for the Navigator.

## 8. Review parts

- Part 1, manifest, worker and exclusions: steps 0, 1, 2, 3, 4, 5 and 6 (with M1 and M2), with test 1 (criterion 1) and test 2 (criterion 2). Files: section 3 items 1 to 4, 5 (the `provideServiceWorker` line only), 9, 10, 11, 12, and 15 (tests 1 and 2).
- Part 2, reload prompt, offline shell and gates: steps 7, 8, 9, 10, 11, 12 and 13, with test 3 (criterion 3), S1 and the five Vitest tests. Files: section 3 items 5 (the `PwaUpdate` initializer), 6, 7, 8, 13, 14, and 15 (test 3 and S1).
