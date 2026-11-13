---
id: SHL-03
status: done
---

# SHL-03 plan — SSE client: one stream, per-module streams, connection state, reconnect, reconcile tick

Batch: [SHL-02, SHL-03, SHL-04] (main track, phase:core, M1). Revision 3, status `draft`. Revision 3 applies the three corrections of the Opus rejection of revision 2 (DECISIONS 2026-11-13, "SHL-03 — Opus plan review of revision 2", commit e76d188): the shared-file rows are rewritten from the SHL-02 and SHL-04 drafts, T10 observes the navigation through a spy that rejects, and the 1 s wait of T11 runs on fake timers. The zod decision of revision 2 is unchanged. Revision 2 applies the Navigator decision on zod (DECISIONS 2026-11-13, "zod in the browser bundle: the Shell ships no runtime zod", option c; commit 5e75b06): the Shell ships no runtime zod, and the SSE envelope is checked by a hand-written guard with a parity test. Revisions 1 and 2 are superseded. The base is `main` at `248f39d`; `main` is now at `7b9c394`, and `apps` and `packages` are unchanged since `248f39d` (section 7a). SHL-02 (`plans/SHL-02.md`, on `main` at `13f4965`) and SHL-04 (`plans/SHL-04.md`, on `main` at `f9d8070`) are plans on `main`; section 2 is written from them, and section 7a says what was read. The coordinator checks them against the code units when those merge. This plan writes no code.

## 1. Decisions this plan follows

Each item gives its source. FACT means checked in this session, with the check named. ASSUMED means a step in section 3 tests it, or section 7b records it.

1. **Scope.** The unit is what its Decisions and criteria say (unit lines 18 to 22 and 25 to 28). The Shell's code lives in `apps/web/src/app/shell/` (`modules/shell.md` line 42). FACT.
2. **One EventSource, opened at app start.** `new EventSource('/events')` is opened once by an app initializer in `app.config.ts`, using `provideAppInitializer` (`@angular/core` 22.2.5, `types/core.d.ts` line 1986). It is not opened in `App`'s constructor: `app.spec.ts` creates `App` under jsdom, where EventSource is ASSUMED absent (section 7b). Source: unit line 18; SHL-01 plan section 5 (SHL-03 row: "SHL-01 opens no EventSource at start"). Decision.
3. **Platform's contract, type-only in the Shell.** The Shell's only contracts import is `import type` (`SseEnvelope`, `PublishingModuleSlug`, from `@bbartolome/scriba-contracts/platform`), which is erased at build. The runtime values are hand-copied into `sse-envelope.ts`: `EVENTS_PATH = '/events'` (`packages/contracts/src/platform/events.ts` line 5), `HEALTHZ_PATH = '/healthz'` (`packages/contracts/src/platform/http.ts` line 8), and `PUBLISHING_SLUGS` (`packages/contracts/src/platform/slugs.ts` lines 20 to 29). Decision 26 checks each copy against the contract. Sources: DECISIONS zod entry (Decision and Consequences); unit lines 18 and 19; `modules/shell.md` line 43. FACT for the contract values (read in the files). Decision.
4. **Envelope check.** Each `message` event: `JSON.parse(e.data)`, then `isPlatformEnvelope(value)` from `sse-envelope.ts`. The guard accepts a value only if it is a non-null, non-array object, `module` is a string in `PUBLISHING_SLUGS`, `type` is a string matching `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` (`events.ts` line 11), and the key `data` is present with any value, including `null`. This mirrors `sseEnvelopeSchema` (`events.ts` lines 15 to 19). A frame that fails (bad JSON, an unknown module, no `data` key, a bad type) is dropped and logged with `console.debug('[sse] ignored envelope', reason)`. Sources: unit line 19; DECISIONS zod entry; the base requires `data` (PLT-02 decision of 2026-11-11, DECISIONS around line 311). FACT for the schema; decision 26 checks the guard against it. Decision.
5. **Unknown types.** The Shell checks Platform's member types by name only: `hello` and `echo` are known, and any other `platform` type is ignored and logged. The Shell does not validate member data, because no Shell code reads it. The Shell holds no member schema for any other module, so an unknown type of another module passes to that module's stream, where its feature's own parse ignores it. Sources: unit line 19 read with `modules/shell.md` line 43 (the Shell consumes no other module's slice); DECISIONS zod entry (no runtime zod). Decision; open point 2.
6. **Demultiplexing.** `stream(module)` returns `Observable<SseEnvelope>`. One internal `Subject` carries the accepted envelopes, and each subscriber filters by `module`. An Observable, not a signal, because a signal can drop envelopes that arrive together, and features must see each event (AGL-07 line 20 applies only `seq > lastSeq`). `rxjs` 7.8.2 is a direct dependency of `apps/web` (`apps/web/package.json`). Sources: unit line 19; `modules/shell.md` line 71 (per-module stream). FACT for rxjs. Decision.
7. **Connection state.** `connectionState: Signal<ConnectionState>` with the values `connecting | open | reconnecting | closed`. It starts at `connecting`. Transitions: `onopen` gives `open`; `onerror` with `readyState` CONNECTING (0) gives `reconnecting` and the browser retries; `onerror` with `readyState` CLOSED (2) gives `closed`, and recovery (decision 9) follows; a replacement EventSource created by recovery gives `reconnecting`. Source: unit line 20. The readyState meanings are the WHATWG EventSource behaviour: ASSUMED (section 7b). No criterion tests a real network drop; the stub models these values.
8. **Native retry.** The browser retries network drops by itself, and the client does not recreate the stream on CONNECTING. The server sends `retry: 3000` (`events.ts` line 7; `publisher.ts` line 52). Sources: unit line 21; PLT-06 unit line 20. FACT for the server side; ASSUMED for the browser (section 7b).
9. **Recovery after CLOSED.** Wait `min(1000 × 2^n, 30000)` ms, where `n` counts failed recoveries since the last `open` (so the first wait is 1 s). Then `GET /healthz` (`HEALTHZ_PATH`; public under SAU-04 line 18). Then `GET /api/setup-auth/status` (SAU-05 line 15). That route is guarded: SAU-04 lists only `/healthz`, the handshake, the identity endpoint and the static bundle as public, so an unauthenticated call gets a 401 (SAU-04 line 21). On 401: `router.navigateByUrl('/setup')` is called without awaiting it, and its promise is caught and logged with `console.debug` as `[sse] /setup navigation failed`, so a navigation error does not reach the caller; T10 asserts that entry. (In the app, `/setup` matches the `**` route until SAU-06 registers it; the test router rejects it with NG04002.) Then count a failure and keep the same schedule, so the stream recovers after sign-in. Otherwise create the new EventSource. Probes use `fetch` with `cache: 'no-store'`. The status route is not the identity endpoint, because `modules/shell.md` line 43 names the setup-status route as the one Setup & auth route the Shell consumes. The path is a local string constant `SETUP_STATUS_ROUTE`, because `packages/contracts/src/setup-auth/index.ts` is `export {};` (FACT) and SAU-01 is not merged. Sources: unit line 21 ("first checking `/healthz` and auth (a 401 routes to `/setup`)"); `modules/shell.md` line 43; SAU-04 lines 18 and 21; SAU-05 line 15. Decision.
10. **Reachability signal (beyond the unit).** `serverReachable: Signal<boolean>`, initially `true`. It becomes `false` when a `/healthz` probe fails, and `true` when a probe succeeds or the stream opens. Probes run on every `error` with CONNECTING (about every 3 s, the native retry cadence) and in each recovery of decision 9. Reason: SHL-06 needs a "server unreachable" banner after the API stops (SHL-06 unit lines 16 and 19). A stopped API gives network errors, which leave the stream CONNECTING and never CLOSED (WHATWG behaviour, section 7b). The unit's recovery covers only CLOSED, so without this signal the banner could not appear. Decision; open point 3 flags it, because `modules/shell.md` line 71 lists only the connection-state signal.
11. **Reconcile tick.** `reconcile$: Observable<ReconcileReason>`, hot with no replay, where `ReconcileReason = 'reopen' | 'visible' | 'online' | 'pageshow'`. One tick per event:
    - an `open` after an earlier `open` of this client (the first open does not tick, because it is not a re-open after a drop);
    - `visibilitychange` on `document` while `document.visibilityState === 'visible'`;
    - `online` on `window`;
    - `pageshow` on `window` with `event.persisted === true`, which is the unit's "from the back/forward cache" (`persisted` is the only signal of that).
    Sources: unit lines 22 and 26; `modules/shell.md` line 99; unit line 25 (no replay). Decision on the first open and on `persisted`.
12. **Ticks do not reconnect.** A tick only notifies features. The recovery schedule of decision 9 runs on its own. Source: unit line 22. Decision (the simplest option).
13. **Feature API.** Features inject `SSE_CLIENT` (typed `SseClient`) and use `stream(module)`, `reconcile$`, `connectionState` and `serverReachable`. A feature re-fetches its own current-run-state endpoint on a tick (unit line 22; AGL-05 line 19; GRR-13 line 20; GRR-09 line 15). No feature code is written here. Decision.
14. **Logging.** Ignored envelopes and every tick are logged with `console.debug` and a `[sse]` prefix. Sources: unit line 19 ("logged at debug level"); SHL-09 line 31 ("visible in the debug log"). FACT for both lines.
15. **Globals read at call time.** `globalThis.EventSource`, `globalThis.fetch`, `window` and `document` are read when used, not captured at import, so a test's stub applies. Sources: unit line 24 ("via a stubbed global `EventSource`"); `modules/shell.md` line 85. Decision.
16. **Lifecycle.** `start()` is idempotent, so there is one EventSource per client. The client injects `DestroyRef`; on destroy it closes the stream, clears its timer and removes its `document` and `window` listeners. Sources: unit line 18 (one EventSource per tab). The cleanup keeps TestBed tests isolated; TestBed destroys its injector after each test by default (ASSUMED, section 7b; step 10 would show leaked listeners). Decision.
17. **Provider wiring.** In `tokens.ts`, `SSE_CLIENT` becomes `InjectionToken<SseClient>`, through a type-only import. In `app.config.ts`, `{ provide: SSE_CLIENT, useClass: SseClient }` is added, with `provideAppInitializer(() => { inject(SSE_CLIENT).start(); })`. Sources: SHL-01 plan decision 7; `apps/web/src/app/shell/tokens.ts` line 6 ("SHL-03 provides it") (FACT). Decision.
18. **Bundle and CommonJS.** The Shell has no runtime contracts import, so no zod enters the bundle (DECISIONS zod entry). `apps/web/angular.json` is not changed, and the default build keeps no `allowedCommonJsDependencies` entry. The only such entry is in `contracts-boot` (`angular.json` line 55, the only match of that key in the file; FACT), and the default build must keep none. So the default build reports zero CommonJS warnings (step 16). The base is SHL-01's measured initial total on `main`, 321.86 kB, which already includes ngx-markdown (DECISIONS 2026-11-13, SHL-01 code review, Builds bullet). The 128 kB figure of PLT-11 predates ngx-markdown and is not the base. This unit adds the client, the guard and the probes, a few kB (ASSUMED). Expected: about 322 kB plus that, below the 500 kB warning. The zod CommonJS build measured by PLT-11 is about 564 kB (DECISIONS 2026-11-12, line 634); it stays out of this bundle. Decision.
19. **Budgets.** `angular.json` `budgets.production` warns above 500 kB and errors above 1 MB (FACT). No budget changes (DECISIONS zod entry). Expected: no warning and no error.
20. **No package or lock change.** `apps/web/package.json` and `package-lock.json` are not changed. `apps/web/package.json` does not declare `@bbartolome/scriba-contracts` (FACT), and the PLT-11 fixture `apps/web/src/contracts-boot.ts` (lines 4 to 13) imports it undeclared. This plan follows that precedent (open point 1). SHL-01 decision 19 (the lock is additive only) is the reason no change is made.
21. **Tests.** Vitest through the Angular unit-test builder, `@angular/build:unit-test`, whose default runner is `vitest` (FACT: `/tmp/plt11-probe/ng/package/src/builders/unit-test/schema.json`). It requires `jsdom` or `happy-dom` (FACT: `runners/vitest/index.js` line 43; `jsdom` 30.1.3 is a dev dependency of `apps/web`). The `--include` option exists (FACT, same schema). The router is `provideRouter([])` (FACT: `app.routes.spec.ts` line 2 imports `provideRouter`). Backoff tests (T8 to T11) use `advanceTimersByTimeAsync`, because the probes await `fetch` (ASSUMED; step 10 tests it). The parity spec of decision 26 imports contracts at runtime in the test build only.
22. **Wire format.** The server writes `retry: 3000`, then unnamed `data:` messages (`publisher.ts` lines 52, 53 and 63), a `: heartbeat` comment every 15 s (`publisher.ts` line 57; `events.ts` line 8), and no `id:` or `event:` line (FACT: `grep -rn "id: \|event: " apps/api/src/modules/platform/events/` prints nothing). So one `onmessage` handler receives every envelope, and no replay is possible (PLT-06 unit lines 20 and 21). FACT.
23. **TypeScript.** `apps/web/tsconfig.app.json` sets `types: []`; `tsconfig.spec.json` sets `types: ["vitest/globals"]`; no web tsconfig sets `lib`; `tsconfig.base.json` sets `target: ES2022` (line 5). So the DOM types for `EventSource`, `document` and `window` come from the default lib (FACT). The type imports need the contracts `dist` (step 3).
24. **Branch and commits.** The driver creates `unit/SHL-03` from `main`. The implementer does not commit or push (SHL-01 plan decision 20). Decision.
25. **Runtime.** Node `v26.13.0` and npm `11.20.0` (FACT: `node -v` and `npm -v` in this session). `node_modules` is absent (FACT: `ls node_modules/@angular` fails), so `npm ci` runs first (step 1).
26. **Parity test.** `sse-envelope.spec.ts` (T13, section 4) is the one Shell test that imports contracts at runtime. It runs in the Vitest run, where the CommonJS build loads, and not in the app bundle. It checks the three copies of decision 3 against the contract values, and `isPlatformEnvelope` against `sseEnvelopeSchema` on a fixed sample table. Source: DECISIONS zod entry ("A Vitest parity test runs each guard against the contracts schemas in Node"). Decision.

## 2. Files to create or change

| Path | Change | Purpose | Shared with |
|---|---|---|---|
| `apps/web/src/app/shell/sse-envelope.ts` | new | The Shell's hand-written copy of the envelope contract: `EVENTS_PATH`, `HEALTHZ_PATH`, `PUBLISHING_SLUGS` (decision 3) and `isPlatformEnvelope` (decision 4). The only contracts import is `import type` (`SseEnvelope`, `PublishingModuleSlug`), erased at build. | none |
| `apps/web/src/app/shell/sse-envelope.spec.ts` | new | T13, the parity test (decision 26; section 4). The only Shell test that imports contracts at runtime, in the test build only. | none |
| `apps/web/src/app/shell/sse-client.ts` | new | `SseClient` (`@Injectable()`): the one EventSource, the envelope check through `isPlatformEnvelope` (decisions 4 and 5), `stream(module)`, `connectionState`, `serverReachable`, `reconcile$`, the recovery schedule and probes (decisions 9 and 10), the listeners (decision 11), `start()` and destroy (decision 16). Imports `EVENTS_PATH`, `HEALTHZ_PATH` and `isPlatformEnvelope` from `./sse-envelope`; no runtime contracts import. Exports the types `ConnectionState` and `ReconcileReason`, the constants `SSE_BACKOFF_BASE_MS` (1000), `SSE_BACKOFF_MAX_MS` (30000) and `SETUP_STATUS_ROUTE` (`/api/setup-auth/status`). | none |
| `apps/web/src/app/shell/sse-client.spec.ts` | new | 12 Vitest tests, T1 to T12, grouped by criterion (section 4). Stubs `EventSource`, `fetch`, `document.visibilityState` and `console.debug`. Provides `SSE_CLIENT` the same way `app.config.ts` does. | none. SHL-07 mirrors the public interface in its own fake; it does not reuse this file. |
| `apps/web/src/app/shell/tokens.ts` | edit | Adds `import type { SseClient } from './sse-client';` after line 1. Changes the `SSE_CLIENT` declaration (lines 6 and 7) from `InjectionToken<unknown>` to `InjectionToken<SseClient>`. This unit only adds its type import after line 1; it does not change line 1 or lines 3 and 4 (`API_CLIENT`). | SHL-02 (`plans/SHL-02.md` section 2): edits line 1 to `import { inject, InjectionToken } from '@angular/core';`, edits lines 3 and 4 (`API_CLIENT` with `providedIn: 'root'` and `factory: () => inject(HttpApiClient)`), and adds `import { HttpApiClient, type ApiClient } from './api-client';` after line 1. SHL-04: no change. Merge: keep every import line and both declarations; lines 6 and 7 (`SSE_CLIENT`) are this unit's alone. |
| `apps/web/src/app/shell/index.ts` | edit | Appends `export type { ConnectionState, ReconcileReason, SseClient } from './sse-client';`. The existing route-data and token exports stay. | SHL-02 (`plans/SHL-02.md` section 2): appends two lines after line 3, `export type { ApiClient, ApiPath, ResponseSchema } from './api-client';` and `export { ApiError, ApiSchemaError } from './api-error';`. SHL-04 (`plans/SHL-04.md` section 2): appends three lines after line 3 and rewords line 1 (the comment). This unit appends one line after line 3. Keep every appended line; do not reorder or remove any. |
| `apps/web/src/app/app.config.ts` | edit | Adds the imports `inject` and `provideAppInitializer` (from `@angular/core`), `SSE_CLIENT` (from `./shell/tokens`) and `SseClient` (from `./shell/sse-client`). Adds two entries at the end of `providers`, after `provideMarkdown`: `{ provide: SSE_CLIENT, useClass: SseClient }` and `provideAppInitializer(() => { inject(SSE_CLIENT).start(); })`. | None. SHL-03 is the only unit that edits `app.config.ts`. SHL-02 adds no provider here: `API_CLIENT` is root-provided by its own factory (`plans/SHL-02.md` decision 2 and section 2). SHL-04 changes nothing in it (`plans/SHL-04.md` section 2). |

Unchanged, checked against this list: `shell/route-data.ts`, `shell/route-data.spec.ts`, `shell/landing.ts`, `shell/not-found.ts`, `app.ts`, `app.html`, `app.routes.ts`, `app.routes.spec.ts`, `app.spec.ts`, `apps/web/package.json`, `package-lock.json`, `apps/web/angular.json`, `apps/web/proxy.conf.json`, `apps/web/src/contracts-boot.ts`, `packages/contracts/**`, `apps/api/**`, `e2e/**`, `eslint.config.mjs`, `units/**`, and `plans/**` except `plans/SHL-03.md`.

## 3. Method

Run from the repo root. The driver's branch is `unit/SHL-03`, created from `main`. Do not commit and do not push. Record `node -v` and `npm -v` with each result. Each step names its files.

0. **Preconditions (no file change).**
   - `git rev-parse --short HEAD` prints `248f39d`, or a later `main` commit for which `git diff --quiet 248f39d HEAD -- apps packages` exits 0.
   - `git status --short` prints nothing.
   - `node -v` prints `v26.x`; `npm -v` prints `11.20.0` (SHL-01 recorded this).
   - `ls apps/web/src/app/shell` lists exactly `index.ts`, `landing.ts`, `not-found.ts`, `route-data.spec.ts`, `route-data.ts`, `tokens.ts`.
   - `ls node_modules/@angular` fails (the packages are not installed yet).
   - `curl -s -o /dev/null http://localhost:4200/; echo $?` prints `7`, and `curl -s -o /dev/null http://127.0.0.1:8080/healthz; echo $?` prints `7`. If either connects, stop and report the owner; do not kill it.

1. **Install from the lock (no file change).** `npm ci` exits 0. Then `ls node_modules/@angular/core/package.json` lists the file.

2. **Lock untouched (no file change).** `git diff --quiet -- package-lock.json apps/web/package.json; echo $?` prints `0`.

3. **Build the contracts (no source change).** `npm run build -w @bbartolome/scriba-contracts` exits 0, and `ls packages/contracts/dist/platform/index.d.ts` lists the file. The output is git-ignored. The type imports of steps 4 to 8 and the parity test of step 9 need it.

4. **Write `apps/web/src/app/shell/sse-envelope.ts` (file: section 2).** It holds the three hand-written copies (decision 3), the `import type` of decision 3, and `isPlatformEnvelope` (decision 4). The guard's rules are the ones listed in decision 4, and the slug copy is typed `as const satisfies readonly PublishingModuleSlug[]`, so a wrong slug fails the type check. Completeness of the copy is not a type check; step 9 checks it.

5. **Write `apps/web/src/app/shell/sse-client.ts` (file: section 2).** It implements decisions 5 to 17 and 22. The step fixes the behaviour: the class and its members (decisions 6, 7, 10 and 11); the constants; the recovery schedule and the probes (decisions 9 and 10); the envelope check and the member-type check (decisions 4 and 5); the listeners (decision 11); `start()` and destroy (decision 16); the `console.debug` logs (decision 14). It imports nothing at runtime from contracts. No other file changes in this step.

6. **Write `apps/web/src/app/shell/sse-client.spec.ts` (file: section 2).** It has the 12 tests T1 to T12 of section 4, named by criterion. In `beforeEach`, stub the globals: `EventSource` with a fake class that records its instances and has helpers to fire `open`, `message` and `error` (with a chosen `readyState`); `fetch` with a `vi.fn` routed by URL, returning the responses each test sets; and `console.debug` with a spy. Call `vi.useFakeTimers()` only in the backoff tests (T8 to T11; T11 waits the 1 s recovery). T12 and the other tests run on real timers. In `afterEach`, call `vi.unstubAllGlobals()`, `vi.useRealTimers()` and `vi.restoreAllMocks()`.

7. **Write `apps/web/src/app/shell/sse-envelope.spec.ts` (file: section 2).** It has the one test T13 of section 4. It imports the contract values (`EVENTS_ROUTE`, `HEALTHZ_ROUTE`, `PUBLISHING_MODULE_SLUGS`, `sseEnvelopeSchema`) from `@bbartolome/scriba-contracts/platform`, and the local copies from `./sse-envelope`.

8. **Edit the three shared files (section 2 rows).** `tokens.ts`, `index.ts` and `app.config.ts`. Only the lines named in section 2 change.

9. **Probe: the parity test runs (T13).** `npm test -w @bbartolome/scriba-web -- --include src/app/shell/sse-envelope.spec.ts` exits 0 and reports 1 passed and 0 failed. If the run fails because the contracts subpath does not load in the test build (a CommonJS file in a linked workspace package), stop and report it. Do not change the Shell's runtime imports to work around it, because decision 26 is the only place contracts is loaded.

10. **Unit tests T1 to T12 (no file change).** `npm test -w @bbartolome/scriba-web -- --include src/app/shell/sse-client.spec.ts` exits 0 and reports 12 passed and 0 failed. T10 rejects the spied navigation (section 4); its `[sse] /setup navigation failed` debug entry, with the NG04002 error, shows that the probe caught the rejection.

11. **Format (files: the section 2 paths).** `npx prettier --write apps/web/src/app/shell apps/web/src/app/app.config.ts`, then `npx prettier --check apps/web` exits 0.

12. **Type check (no file change).** `npx tsc --noEmit -p apps/web/tsconfig.app.json` exits 0. `npx tsc --noEmit -p apps/web/tsconfig.spec.json` exits 0. The spec is checked because it uses `vitest/globals`.

13. **Full unit run (no file change).** `npm test -w @bbartolome/scriba-web` exits 0 with 18 tests passing and none failing: the 5 of SHL-01 (`app.spec.ts` 1, `app.routes.spec.ts` 3, `shell/route-data.spec.ts` 1), the 12 of step 10, and T13 of step 9.

14. **Lint (no file change).** `npm run lint -w @bbartolome/scriba-web` exits 0. The `shell/` folder matches no boundaries element, so no rule applies to it.

15. **Contracts-boot still builds (PLT-11; no file change).** `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` exits 0. Its allowance (`angular.json` line 55) is unchanged.

16. **Production build (no file change).** `npm run build -w @bbartolome/scriba-web` exits 0, and it prints an `Initial total` below 500 kB. Expected: about 322 kB plus the new client code and guard (decision 18; ASSUMED). Then `npm run build -w @bbartolome/scriba-web 2>&1 | grep -c -i 'commonjs'` prints `0`. Then `grep -l 'scriba-contracts' apps/web/dist/scriba-web/browser/*.js` prints nothing (the SHL-01 check, which still holds because the imports are type-only). Record the three results. If the initial total is at or above 500 kB, or a CommonJS warning appears, stop and report it: the decision of the DECISIONS zod entry would then be broken.

17. **Dev stack and one-stream check (supplementary; no file change).**
    - `npm run dev > /tmp/shl03-dev.log 2>&1 &`. Poll `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/` until it prints `200` (timeout 180 s).
    - Save this script to `/tmp/shl03-check/one-stream.mjs`, outside the repo. Run `cd <repo> && SCRIBA_E2E_CHROMIUM="$HOME/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome" node /tmp/shl03-check/one-stream.mjs`.

      ```js
      import { createRequire } from 'node:module';
      const req = createRequire(process.cwd() + '/package.json');
      const { chromium } = req('@playwright/test');
      const browser = await chromium.launch({ executablePath: process.env.SCRIBA_E2E_CHROMIUM });
      const page = await browser.newPage();
      const pageErrors = [];
      const eventsRequests = [];
      page.on('pageerror', (e) => pageErrors.push(String(e)));
      page.on('request', (r) => { if (new URL(r.url()).pathname === '/events') eventsRequests.push(r.resourceType()); });
      await page.goto('http://localhost:4200/');
      await page.getByRole('heading', { name: 'Scriba' }).waitFor({ timeout: 30000 });
      await page.waitForTimeout(2000);
      const overlay = await page.locator('vite-error-overlay').count();
      console.log(JSON.stringify({ overlay, pageErrors, eventsRequests }));
      await browser.close();
      ```

    - Expected JSON: `overlay` is `0`, `pageErrors` is `[]`, and `eventsRequests` has exactly one entry (resource type `eventsource` expected). If Playwright reports no `/events` request, record that and do not count it as a pass.
    - `grep -c -E 'exports is not defined|require is not defined|Failed to resolve import|Could not resolve' /tmp/shl03-dev.log` prints `0`.

18. **Stop the dev stack (no file change).** Stop the `npm run dev` process group. `curl` to `localhost:4200` and to `127.0.0.1:8080/healthz` both exit `7`.

19. **Root gates (no file change).** From the repo root, `npm run build`, `npm test` and `npm run lint` each exit 0. The last line of `npm run lint` is `All matched files use Prettier code style!`.

20. **Scope gate (no file change).** `git status --short` lists exactly `apps/web/src/app/shell/sse-envelope.ts`, `apps/web/src/app/shell/sse-envelope.spec.ts`, `apps/web/src/app/shell/sse-client.ts`, `apps/web/src/app/shell/sse-client.spec.ts`, `apps/web/src/app/shell/tokens.ts`, `apps/web/src/app/shell/index.ts` and `apps/web/src/app/app.config.ts`. `git diff --quiet -- package-lock.json apps/web/package.json apps/web/angular.json packages apps/api e2e` exits 0.

21. **Record (no file change).** The Node and npm versions; each command and its output; the `Initial total`; the CommonJS count; the bundle grep; the dev-log grep; the `/events` request list of step 17; the PIDs stopped and the port results.

## 4. Acceptance criteria tests

All four criteria are testable here. Each is defined "via a stubbed global `EventSource`" (unit line 24), so no browser is needed for them; the browser run of step 17 is supplementary. No criterion is left as an open point.

**Criterion 1.** "Envelope events for module A reach only A's subscribers; unknown modules and types are ignored without error."
- T1 `delivers an envelope only to its own module's stream` (step 10). Subscribe to `stream('agent-loop')` and `stream('project-store')`. The fake stream delivers `{module:'agent-loop', type:'node-status', data:{}}`. Pass: the agent-loop subscriber gets 1 envelope and the project-store subscriber gets 0.
- T2 `ignores an unknown module and malformed JSON without error` (step 10). Deliver `{module:'not-a-module', type:'x', data:{}}` and a frame whose `data` is `{`. Pass: no subscriber is called; neither delivery throws; `console.debug` is called twice, each message starting with `[sse]`.
- T3 `ignores an unknown platform type and passes an unknown feature type through` (step 10). Deliver `{module:'platform', type:'future-thing', data:{}}`, which is not delivered to `stream('platform')` and is debug-logged. Deliver `{module:'agent-loop', type:'future-thing', data:{}}`, which is delivered once to `stream('agent-loop')` (decision 5). Pass: as stated.
- Local: yes.

**Criterion 2.** "Simulated drop then re-open, visibilitychange to visible, online and pageshow each emit exactly one reconcile tick."
- T4 `ticks once on a re-open after a drop, and not on the first open` (step 10). Open (count 0), then error with `readyState` 0, then open again. Pass: the count is 1 after the second open, with reason `reopen`.
- T5 `ticks once on visibilitychange to visible, and not when hidden` (step 10). Dispatch `visibilitychange` on `document` with `visibilityState` stubbed to `'visible'`: count 1, reason `visible`. Then stub `'hidden'` and dispatch again: the count stays 1. Pass: as stated.
- T6 `ticks once on online` (step 10). Dispatch `online` on `window`. Pass: exactly 1, reason `online`.
- T7 `ticks once on pageshow from the back/forward cache only` (step 10). Dispatch `pageshow` with `persisted` true: count 1, reason `pageshow`. Dispatch it with `persisted` false: the count stays 1. Pass: as stated.
- Local: yes. The events are dispatched on jsdom's `document` and `window`. `visibilityState` is stubbed with `Object.defineProperty` and restored after each test.

**Criterion 3.** "A CLOSED stream is recreated with capped backoff after a /healthz check."
- T8 `retries /healthz at 1, 3, 7, 15, 31, 61 and 91 s while it fails, and creates no stream` (step 10). An error with `readyState` 2 at t = 0, and `/healthz` fails each time. Advance the fake clock with `advanceTimersByTimeAsync`. Pass: the `/healthz` calls happen at those seconds (delays 1, 2, 4, 8, 16, 30 and 30 s, capped at 30 s), and no EventSource is created.
- T9 `creates a new stream after /healthz and the status probe pass` (step 10). `/healthz` returns 200 and `/api/setup-auth/status` returns 200. Pass: at t = 1 s a second EventSource on `/events` is created, after the two fetch calls (the call log reads healthz, then status, then EventSource).
- T10 `routes a 401 from the status probe to /setup and keeps retrying` (step 10; fake timers). `/healthz` returns 200 and the status probe returns 401. `Router.navigateByUrl` is spied with `mockRejectedValue(new Error('NG04002'))`. Why a spy and not a stub route: `provideRouter([])` rejects `/setup` with NG04002 (reproduced by the Opus reviewer), and the spy keeps the router out of the fake-clock test; SHL-02's T7 uses a stub route with real time. The rejection is the case the probe must handle. Pass: the spy is called once with `'/setup'` at t = 1 s, and no EventSource is created. The probe catches the rejected promise and logs it: the `console.debug` spy receives `[sse] /setup navigation failed` with the NG04002 error, and T10 asserts that entry (a missing catch would leave it out). The status probe then returns 200 at t = 3 s, and the new EventSource is created at t = 3 s.
- Local: yes.

**Criterion 4.** "The connection-state signal transitions correctly through each case."
- T11 `walks connecting, open, reconnecting, open, closed, reconnecting, open` (step 10; fake timers, because the recovery waits 1 s, run with `advanceTimersByTimeAsync(1000)`). Start (`connecting`); open (`open`); error with `readyState` 0 (`reconnecting`); open (`open`); error with `readyState` 2 (`closed`); recovery succeeds at +1 s (`reconnecting`, one new EventSource); open (`open`). `start()` is also called twice, and it must create one EventSource. Pass: the recorded sequence is `connecting,open,reconnecting,open,closed,reconnecting,open`, and two EventSource instances exist at the end.
- T12 `serverReachable falls when /healthz fails and returns when a stream opens` (step 10). Error with `readyState` 0, while `/healthz` fails: the signal is `false`. Then open: the signal is `true`. Pass: `false`, then `true`.
- Local: yes. The tests read only the public `connectionState` and `serverReachable` signals (the testing principle of `modules/shell.md` line 83).

**Supporting test (not a criterion): T13, the guard and the copies agree with the contract.**
- T13 `the local guard, route paths and slug list agree with the contracts` (step 9; run again in step 13). For each sample of a fixed table (a valid envelope; an unknown module; a missing `data` key; `data: null`; an uppercase type; a dotted type; a non-object; an array), `isPlatformEnvelope(x)` equals `sseEnvelopeSchema.safeParse(x).success`. `PUBLISHING_SLUGS` equals `PUBLISHING_MODULE_SLUGS`, `EVENTS_PATH` equals `EVENTS_ROUTE`, and `HEALTHZ_PATH` equals `HEALTHZ_ROUTE`. Pass: every comparison holds.
- Criterion-neutral: yes. It adds no criterion and changes none of T1 to T12. It checks the helper that criterion 1 depends on (the rejection of an unknown module in T2), and it checks the copies that decision 3 relies on. T13 is the only test that loads contracts at runtime.

**Supplementary (not a criterion): one stream per tab, on the real server.** Step 17 loads the Shell on the dev stack and counts `/events` requests from the page. It is the nearest local check of decisions 2 and 22 on the real wire. The four criteria do not depend on it.

## 5. Agreement with downstream units

| Unit | What it needs from SHL-03 | Provided by this plan |
|---|---|---|
| SHL-06 connection indicator (unit lines 15, 16, 19) | `connectionState` for the indicator (`reconnecting` and `closed`); a reachability input for the "server unreachable" banner, cleared on recovery; a tick on restart | `connectionState` (decision 7); `serverReachable` (decision 10, an addition, open point 3); the tick on re-open (decision 11). The banner is SHL-06's, through SHL-04's notices. The "API network failure" case is SHL-02's error path, not this unit's. |
| SHL-07 test doubles (lines 15, 16, 21, 22) | "same interface as SHL-03's per-module streams and connection signal"; a fake that pushes envelopes and fires ticks | The public surface: `stream(module)`, `reconcile$`, `connectionState`, `serverReachable`, `start()`, and the types `ConnectionState`, `ReconcileReason` and `SseClient`. SHL-07 mirrors these in its own fake. |
| SHL-08 active project, landing (lines 7 and 18) | a `project-switched` event from `project-store`, for route reconciliation | `stream('project-store')` (decision 6). Route reconciliation is SHL-08's; the tick is available through `reconcile$`. SHL-08's own runtime setup-auth schema is SHL-08's (the DECISIONS zod entry); this unit preloads nothing for it. |
| SHL-09 core gate (lines 19 and 31) | reconnect and reconcile tick visible in the debug log; the demux and tick criteria pass on `main` | `console.debug` ticks (decision 14); all four criteria of this unit on `main`. The demo step is SHL-09's. |
| Agent loop: AGL-05 (line 19), AGL-07 (line 20) | a tick that triggers its current-run-state fetch; `agent-loop` events with `seq` | `reconcile$` and `stream('agent-loop')`. The `seq > lastSeq` rule is the feature's. |
| Graph runner: GRR-09 (line 15), GRR-13 (line 20) | `graph-runner` events and reconcile ticks | `stream('graph-runner')` and `reconcile$`. |
| Project store: PST-09 (line 25) | `project-switched` updating the picker's active marker | `stream('project-store')`. |
| SHL-02 (parallel) | the shared `tokens.ts`, `index.ts` and `app.config.ts`; its guard `isPlatformErrorBody` (`plans/SHL-02.md` section 2) | Section 2 rows. Both units route a 401 to `/setup`: SHL-02's rule is unawaited and errors as an `ApiError` with status 401 (`plans/SHL-02.md` decision 10); this unit's probe catches its navigation promise (decision 9). Neither unit ships runtime zod. |
| SHL-04 (parallel) | `index.ts` (appended lines and a reworded line 1); `app.config.ts` and `tokens.ts` are not touched by SHL-04 | Section 2 rows. SHL-04's step 9 expects one `GET /events` at page load once this unit merges (`plans/SHL-04.md` section 3, step 9 caveat, line 136). Step 17 of this plan measures that single request. |
| SHL-01 (done) | the `SSE_CLIENT` placeholder; no EventSource at start; `/events` proxied unbuffered; SHL-01 open point 1 (zod) | The placeholder is replaced (decision 17); one EventSource opens at start (decision 2); `apps/web/proxy.conf.json` is unchanged. The zod question is closed by the DECISIONS zod entry, which answers SHL-01 open point 1. |
| PLT-11 and the SHL-01 bundle check | the `contracts-boot` build; SHL-01's `grep -l 'scriba-contracts'` on the production bundle | The `contracts-boot` build is re-run (step 15). The SHL-01 grep is re-run in step 16 and must print nothing, as it does on `main`. |

## 6. Open points

1. **Undeclared contracts dependency.** `apps/web` does not declare `@bbartolome/scriba-contracts`, following the PLT-11 fixture. The Shell's only contracts import is type-only, and the parity spec imports contracts in the test build. Declaring it would change the `apps/web` entry of the lock, so it is not done here.
2. **Unknown types of feature modules** reach the feature, which ignores them (decision 5). Dropping them in the Shell would need each feature to register its types. That is not in this unit.
3. **`serverReachable` is an addition** to the unit's Decisions and to `modules/shell.md` line 71, which lists only the connection-state signal. SHL-06's acceptance needs it (decision 10). The coordinator accepts it or asks for a revision.
4. **Status route string.** `SETUP_STATUS_ROUTE` is a local string until SAU-01 defines the route under `/setup-auth`. A later change can switch to the contract constant. Not needed here.
5. **Behaviour outside the criteria.** The first open does not tick (decision 11), so a feature that mounts before the first open relies on its own fetch. `online` and visibility ticks do not reconnect (decision 12), so a closed stream waits for its backoff timer (up to 30 s). iOS backgrounding and real visibility changes are not tested (no device here); step 17 is the only real-browser run.

Closed, not open: the bundle cost of a runtime contracts import, and the CommonJS warnings that the earlier revision left open. The DECISIONS 2026-11-13 zod entry (option c) closes both. Decisions 3, 18 and 26 carry them.

## 7. Facts checked and assumed

**(a) Facts checked in this session**
- `git rev-parse --short HEAD` prints `7b9c394` at this revision. `git diff --stat c2c498c 248f39d` lists only `plans/DECISIONS.md`. `git diff --quiet 248f39d HEAD -- apps packages` exits 0. `git status --short` at this revision lists only `plans/SHL-03.md`, which stays untracked until it is committed. `plans/SHL-02.md` (183 lines) is on `main` at `13f4965`, and `plans/SHL-04.md` (228 lines) at `f9d8070`. Read with `grep` and `sed`: SHL-02 decisions 2, 3, 5, 7, 9, 10 and 15 (lines 14 to 42), section 2 (lines 50 to 62), section 4 (the test list, lines 96 to 126, read with `grep`), and section 5 (read with `grep`); SHL-04 header (line 8), decisions 9 and 10 (lines 22 and 23), section 2 (lines 30 to 50), the section 3 step 9 caveat (line 136, inside section 3), and section 5 (lines 168 to 183).
- `plans/DECISIONS.md` line 1084: the entry "2026-11-13 — SHL-01 / SHL-02 / SHL-03 — zod in the browser bundle: the Shell ships no runtime zod" (Navigator decision, option c, commit 5e75b06), read in full. Its Consequences name SHL-03 open point 1 and open point 6, and this revision closes both.
- `grep -rn 'scriba-contracts' apps/web --include=*.ts --include=*.json` (excluding `node_modules`) matches only `apps/web/src/contracts-boot.ts` lines 4 to 13 and `apps/web/angular.json` line 55. So no app code imports contracts at runtime on `main`.
- Shell files on `main`, read as built: `apps/web/src/app/app.config.ts` (providers: `provideBrowserGlobalErrorListeners`, `provideZonelessChangeDetection`, `provideRouter(APP_ROUTES)`, `provideHttpClient`, `provideMarkdown`); `app.routes.ts`; `app.ts`; `app.html`; `shell/tokens.ts` (`API_CLIENT` and `SSE_CLIENT` as `InjectionToken<unknown>`, the comment "SHL-03 provides it"); `shell/index.ts`; `shell/route-data.ts`; `main.ts`.
- `packages/contracts/src/platform/events.ts`: line 5 `EVENTS_ROUTE = '/events'`; line 7 `SSE_RETRY_MS = 3000`; line 8 `SSE_HEARTBEAT_MS = 15000`; line 11 the type pattern; lines 13 to 19 `sseEnvelopeSchema` (`module` as `z.enum(PUBLISHING_MODULE_SLUGS)`, `type` as a pattern string, `data` as `z.unknown()`); lines 55 to 58 `platformEventSchema`.
- `packages/contracts/src/platform/slugs.ts` lines 20 to 29: `PUBLISHING_MODULE_SLUGS` has eight slugs; `shell` and `genre-packs` are not in it.
- `packages/contracts/src/platform/http.ts` line 8: `HEALTHZ_ROUTE = '/healthz'`.
- `packages/contracts/src/platform/index.ts` re-exports `slugs`, `events`, `errors`, `http`, `settings` and `env`.
- `packages/contracts/src/setup-auth/index.ts` is `export {};` (11 bytes, from `cat -A`).
- `packages/contracts/package.json`: the `./platform` export points at `dist/platform/index.js`; there is no `"type": "module"`, so the output is CommonJS (DECISIONS, 2026-11-11 PLT-02 output format entry, around line 170). `zod` is `^4.6.7`.
- `apps/api/src/modules/platform/events/events.publisher.ts`: line 52 writes `retry: 3000`; line 53 writes the hello `data:` block; line 57 writes the `: heartbeat` comment every `SSE_HEARTBEAT_MS`; line 63 writes `data: <envelope>`; `grep -rn "id: \|event: " apps/api/src/modules/platform/events/` prints nothing. `events.controller.ts` lines 13 to 16 set `Content-Type: text/event-stream` and `Cache-Control: no-cache, no-transform`.
- `apps/web/angular.json`: `build.options.externalDependencies` is `["marked-katex-extension"]` (SHL-01 commit 1f7d56f). `budgets.production` has initial warning 500 kB and error 1 MB. `contracts-boot` has `allowedCommonJsDependencies: ["@bbartolome/scriba-contracts"]` at line 55, the only such key in the file. The default build's options have no such key, so the default build keeps none. The test target is `@angular/build:unit-test`.
- SHL-01's measured initial total on `main`: 321.86 kB, with ngx-markdown (DECISIONS 2026-11-13, SHL-01 code review, Builds bullet). PLT-11's 564.1 kB zod CommonJS figure: DECISIONS 2026-11-12, PLT-11 review, line 634 (cross-unit finding).
- `apps/web/package.json`: `rxjs` `7.8.2`, `ngx-markdown` `22.1.1`, and no `@bbartolome/scriba-contracts` entry.
- `package-lock.json` (read with `node -p`): `node_modules/rxjs` 7.8.2; `node_modules/zod` 4.6.6; `packages/contracts/node_modules/zod` 4.6.7, the copy the contracts subpath resolves; `node_modules/@bbartolome/scriba-contracts` is a link to `packages/contracts`.
- `apps/web/tsconfig.app.json` `types: []`; `apps/web/tsconfig.spec.json` `types: ["vitest/globals"]`; no web tsconfig sets `lib`; `tsconfig.base.json` `target: ES2022`.
- `@angular/core` 22.2.5 (the copy cached by SHL-01, `/tmp/shl01-cache/angular/core/package`): `types/core.d.ts` line 1986 declares `provideAppInitializer`.
- The unit-test builder (`/tmp/plt11-probe/ng/package/src/builders/unit-test`): the schema's `runner` default is `vitest`, and `include` is an option; `runners/vitest/index.js` line 43 requires `jsdom` or `happy-dom`.
- `node_modules` is absent. `node -v` prints `v26.13.0` and `npm -v` prints `11.20.0`. `~/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome` exists; `/opt/pw-browsers` does not.
- Units read, with lines: SHL-03 (all); SHL-01 (front matter); SHL-02 and SHL-04 (front matter, Decisions, criteria); SHL-06 (front matter, lines 15 to 19); SHL-07 (lines 7, 15, 16, 21, 22); SHL-08 (lines 7 and 18); SHL-09 (lines 7, 17 to 31); SAU-01 (line 25); SAU-03 (lines 18, 26); SAU-04 (lines 15, 18, 20, 21, 26, 30 to 33); SAU-05 (line 15); PLT-06 (all; lines 20 to 21 wire and no replay, 24 echo, 37 backpressure); PLT-02 (lines 19 and 24 to 35); AGL-05 (line 19); AGL-07 (line 20); GRR-09 (line 15); GRR-13 (line 20); PST-09 (line 25).
- `modules/shell.md`, all sections; the lines relied on: 42, 43, 71, 83, 85, 99.
- `plans/DECISIONS.md`: grep for `SHL-0`, `SSE`, `EventSource`, `reconcile`, `/events` and `Frontend shell`; read the entries at around lines 170 (CommonJS), 311 (PLT-02 envelope), 634 (zod cost), 647 (PLT-11 criterion 1), 1084 (zod entry), and the SHL-01 entries (headers, and the code-review Builds bullet).
- SHL-01 plan (`plans/SHL-01.md`): decisions 7, 15, 17, 19 and 20; section 3 step 12 (the browser script); section 5 (the SHL-03 row).

**(b) Assumed (tested by a step, or an open point)**
- The WHATWG EventSource behaviour: a network failure gives `error` with `readyState` CONNECTING, and a non-200 or wrong-type response (including a 401 on `/events`) gives CLOSED. Not observed in this session (decisions 7, 8 and 10; no criterion tests a real drop).
- jsdom has no `EventSource`, so the stub is needed. The stub is used either way.
- Vitest fake timers also fake `Date` and `setTimeout`, and `advanceTimersByTimeAsync` flushes the awaited `fetch` promises (step 10).
- TestBed destroys its injector after each test by default, which runs the `DestroyRef` cleanup (decision 16; step 10 would show leaked listeners).
- Playwright reports EventSource requests as `request` events with resource type `eventsource` (step 17; if not, the result is recorded, not counted).
- The Angular dev server and `npm test` both bundle the linked workspace package's CommonJS for the test build (step 9) and the dev server (step 17).
- The initial total stays near 322 kB plus the new client and guard, under the 500 kB warning (step 16). A zod inclusion would add about 564 kB and cross that warning, so the step would catch its return.
- The `/api/setup-auth/status` route is guarded by the default-deny guard once SAU-04 lands. Before that it answers 404, and the probe treats any non-401 response as a pass.
- The SHL-02 and SHL-04 drafts keep the edits that section 2 lists for them: section 2 is read from the drafts, and the coordinator checks them when they merge.
- The probe's catch is observed through its `[sse] /setup navigation failed` debug entry (T10), not through Vitest's reporting of rejections.
- The visibility tick fires only on `visible`, as the unit's "when the page becomes visible" reads.
