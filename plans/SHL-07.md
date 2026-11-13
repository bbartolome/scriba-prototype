---
id: SHL-07
status: planned
---

# SHL-07 plan — test doubles: fake API client, fake event source, provider helper and feature route-test template

Batch: SHL-05, SHL-06, SHL-07 (main track, phase:core, M1). Revision 3, status `draft`. Revision 3 applies the three items of the Opus rejection of revision 2 (DECISIONS 2026-11-13, "SHL-07 — Opus plan review of revision 2", commit 8936be4): the untracked files are listed one per line in steps 5a and 10 (item 1, F27); F1 names HEAD by its property, not a hash (item 2); T8 subscribes before the pushes and decision 13 states the guard's reach (item 3). This plan covers SHL-07 only. Base: `main` at `eb30048` (`docs(SHL-06): settle criterion 2 as the stubbed EventSource and record the Navigator decision in plans/DECISIONS.md`), which holds the merged code of SHL-02, SHL-03 and SHL-04 (section 7a, F1 and F2). Since `eb30048` only `plans/` has changed, and step 0 checks the code paths only. The SHL-05 draft (`plans/SHL-05.md`, draft) and the SHL-06 draft (`plans/SHL-06.md`, draft, revision 2) are on disk and untracked, and section 2 reads their file tables. This plan writes no code and changes only `plans/SHL-07.md`.

Revision 2 applies the seven items of the Opus rejection of revision 1 (DECISIONS 2026-11-13, "SHL-07 — Opus plan review of revision 1", commit 2a31a5a): the base moves to `eb30048` (item 1); decision 13 drops the false claim about HttpClient and adds the throwing backend (item 2, F25); step 5c uses a multi-line-aware check (item 3, F26); the `tsconfig.app.json` line numbers are corrected (item 4); the SHL-06 wording is quoted from `eb30048` (item 5); decision 11 fixes the envelope error message, asserted in T8 (item 6); T8 pushes both envelopes and T3 adds a POST case (item 7).

## 1. Decisions this plan follows

Each item gives its source and a tag. FACT means checked in this session (the check is listed in section 7a under the F number given). ASSUMED means a step of section 3 tests it or section 7b lists it (A number). DECISION means a choice with no fact behind it beyond the source named.

1. **Location.** The fakes and the template live in `apps/web/src/app/shell/testing/`, outside `features/` and outside the Shell's entry `shell/index.ts`, so production code has no import path to them. Source: `modules/shell.md` line 42 (Shell code lives outside `features/`) and line 75 (the fakes are a Shell row); SHL-01 decision 12. [FACT F10: `features/` holds only `.gitkeep`] [DECISION]

2. **Fake API client.** `FakeApiClient implements ApiClient`, with `get(path, schema, params?)` and `post(path, body, schema)` and no other verb. Source: SHL-07 unit line 15 ("same interface as SHL-02"); SHL-02 decision 3. [FACT F5]

3. **Schema check through the shared parser.** A canned 2xx body goes through `parseResponse(path, schema, body)` inside `map`, so a mismatch reaches the subscriber as an `ApiSchemaError` on the error channel, as the real client does (`api-client.ts` lines 71 and 85). Source: SHL-07 unit line 22 (criterion 2); SHL-02 decision 14 ("so both reject a mismatch the same way"). [FACT F5]

4. **Canned responses per method and path.** `respond(method, path, body)` registers a 2xx body and `fail(method, path, error)` registers an `ApiError`. A later registration for the same method and path replaces the earlier one, so a reconnect test can change what the re-fetch returns. Source: SHL-07 unit line 15 ("register canned responses (or typed errors) per route constant"); AGL-07 unit line 28 (a reconnect replaces the view from run state). [DECISION]

5. **Recording.** Each `get` and `post` appends `{ method, path, params?, body? }` to `requests` when it is subscribed (inside `defer`), before the canned lookup. HttpClient also sends on subscribe. Source: SHL-07 unit line 15 ("records requests for assertions"); `modules/shell.md` line 83 (what goes over the wire). [DECISION]

6. **Unregistered route.** The observable errors with a plain `Error` whose message is `No canned response for <METHOD> <path>.`. It is not an `ApiError`, so a missing registration fails the test and does not look like a server answer. Source: DECISION (simplest option). [DECISION]

7. **Side effects not replicated.** The fake does not navigate on 401 and does not refuse `//` paths. Both stay in `HttpApiClient` and are tested by SHL-02 (T7 and T10). Source: SHL-02 decisions 10 and 12. The unit asks for the same interface, not the same side effects. [DECISION]

8. **Synchronous emission.** The fake emits on subscribe. HttpClient emits after a flush. The emitted values and errors are the same, and no test depends on the timing (open point 4). Source: DECISION. [DECISION]

9. **Fake event source surface.** `FakeEventSource implements Pick<SseClient, 'stream' | 'connectionState' | 'serverReachable' | 'reconcile$'>`. `start()` is left out, because the composition root starts the stream (`app.config.ts` lines 26 to 28) and features never do. Source: SHL-07 unit line 16 ("same interface as SHL-03's per-module streams and connection signal"); `sse-client.ts` lines 53, 56, 59 and 78. [FACT F3]

10. **Typing against a class with private members.** `SseClient` has private fields (`sse-client.ts` lines 39 to 50), so no fake is assignable to the class type. The fake is typed by `Pick` and provided with `useValue`. Angular types `useValue` as `any`, so no cast is needed. `SSE_CLIENT` keeps its type `InjectionToken<SseClient>` (`tokens.ts` line 12). Source: FACT F3 and F16. [FACT F3, F16]

11. **Envelope push.** `push(envelope: SseEnvelope)` throws a `TypeError` with the message `Not a Platform envelope.` when `isPlatformEnvelope` (`sse-envelope.ts` lines 35 to 49) rejects the value, so a test cannot push a frame the real client drops at its guard. Delivery is by `module`, as `stream(slug)` filters (`sse-client.ts` line 79). Source: SHL-07 unit line 16; `sse-client.ts` lines 127 to 147. The real client's unknown-platform-type filter is not copied, because `PLATFORM_TYPES` is private (`sse-client.ts` line 26); open point 6. [FACT F4] [DECISION]

12. **Connection and reconcile helpers.** `setConnectionState(state)` and `setServerReachable(reachable)` set the two signals. `drop(state = 'reconnecting')` sets a state and emits no tick. `reopen()` sets `open` and reachable to true and emits `reopen`. `tick(reason)` emits any `ReconcileReason`, which covers `visible`, `online` and `pageshow`. The fake starts at `open` and reachable true, while the real client starts at `connecting` (`sse-client.ts` line 41). Source: SHL-07 unit line 16 ("simulate drop/re-open/visibility to fire reconcile ticks"); `sse-client.ts` lines 116 to 125, 149 to 161 and 229 to 232. [FACT F3] [DECISION]

13. **Provider helper and a loud guard.** `createShellTestDoubles()` returns `{ api, events, providers }`, where `providers` is `[{ provide: API_CLIENT, useValue: api }, { provide: SSE_CLIENT, useValue: events }, { provide: HttpBackend, useValue: throwingBackend }]`. `throwingBackend.handle()` returns `throwError(() => new Error('Real HTTP is off in Shell tests; inject the fake API client.'))`. `HttpClient` is root-provided in Angular 22.2.5 (F25). So a feature that injects `HttpClient` directly, or any HTTP call made around `API_CLIENT` while this helper is in use, reaches the throwing backend and fails loudly instead of reaching the network. The guard covers only tests that use this helper. A test that forgot the helper is not covered: it gets a working real client. T1's identity check is the proof that the fake is in use. Source: SHL-07 unit line 17 ("a provider helper that swaps both in for a rendered route"); `tokens.ts` lines 6 to 12; F25. [FACT F2] [FACT F25] [DECISION]

14. **Dummy feature.** `shell/testing/template-feature.ts` exports `templateRoutes` and `TemplateFeaturePage`. The owned path is `template`, so the export is `templateRoutes` under the naming rule of SHL-01 decision 9. The page is a standalone component. It injects only the two tokens, reads `GET /api/platform/version` for the version and shows the `seq` of the latest `platform` `echo` envelope. Its text is exactly `Platform version: <version>` (`loading` until the response arrives) and `Latest echo: <seq>` (`none` until an echo arrives). Source: SHL-07 unit lines 18 and 21; `modules/shell.md` line 43 (the Shell consumes `/platform`, and this template uses only `/platform`). [FACT F7] [DECISION]

15. **Route entry lives in the spec.** The template spec defines the entry `templateEntry = { path: 'template', pathMatch: 'full', data, loadChildren }` and provides it through `provideRouter`, the way SHL-01's probe did (SHL-01 plan, step 10). `APP_ROUTES` is not changed, so the template never reaches the app. SHL-09's dummy is a different file. Source: SHL-01 decisions 8 and 9; SHL-09 unit line 18 (its own lazy dummy in the app). [FACT F6] [DECISION]

16. **Route data.** The entry's `data` is typed `satisfies ShellRouteData` (`route-data.ts` lines 15 to 19), with `scope: 'app'` and a `nav` value. Source: SHL-01 decision 10. [FACT F6]

17. **No runtime contracts in the Shell's non-spec files.** The template's schema is a hand-written `ResponseSchema` (`api-client.ts` lines 17 to 21). It reads fields with bracket access, because `noPropertyAccessFromIndexSignature` is on (`tsconfig.json` line 8). The fakes and the template import contracts only as `import type`. Source: DECISIONS 2026-11-13 zod entry (line 1084: "the Shell ships no runtime zod"); SHL-02 step 6 (the grep of `scriba-contracts`). [FACT F11] [DECISION]

18. **Contract values in specs.** The specs import contract values at run time from `@bbartolome/scriba-contracts/platform` (`VERSION_ROUTE`, `HEALTHZ_ROUTE`, `ECHO_ROUTE`, `healthzSchema`, `echoRequestSchema`), as `sse-envelope.spec.ts` does (lines 1 to 6). Body types are `satisfies VersionInfo` through `import type`. Source: SHL-03 test T13 (`sse-envelope.spec.ts`); DECISIONS 2026-11-13 zod entry (the parity test runs against the contract schemas). [FACT F17] [ASSUMED A2]

19. **Typed from the contract package, as far as main allows.** Only `/platform` has contract values on main. The nine other slices export `{}` (F7). The fakes accept any `ApiPath` and any `SseEnvelope`, so the routes and events of other slices work when their contracts land, with no change to the fakes. Source: SHL-07 unit line 15 ("typed from the contract package"); FACT F7. [FACT F7] [DECISION]

20. **No test framework in the fakes.** `test-doubles.ts` and `template-feature.ts` import neither `vitest` nor Node types. `tsconfig.app.json` sets `types: []` (line 6) and includes `src/**/*.ts` (line 8) minus `src/**/*.spec.ts` (line 9), so these two files are type-checked in the app build. Source: FACT F11. [FACT F11] [DECISION]

21. **Runner and seam.** Vitest through `@angular/build:unit-test` (`angular.json` lines 75 to 77). Its default runner is `vitest` and its default include is `**/*.spec.ts` and `**/*.test.ts`. The runner needs `jsdom` or `happy-dom`, and `apps/web/package.json` line 28 has `jsdom` 30.1.3. No browser, server or credential is needed. Source: SHL-07 unit line 21 ("runs under Vitest"); FACT F13. [FACT F13]

22. **Rendering and change detection.** `RouterTestingHarness.create(url)`, `routeNativeElement` and `detectChanges()` (`@angular/router` 22.2.5 `types/testing.d.ts` lines 58 to 82). TestBed is zoneless here: the `ZONELESS_ENABLED` factory returns true and so does the TestBed `autoDetect` default (F15). The template test still calls `harness.detectChanges()` after each push. Source: SHL-07 unit line 21; FACT F15. [FACT F15] [ASSUMED A3]

23. **Boundaries lint.** `shell/testing/` matches no `boundaries` element. `eslint.config.mjs` lines 27 to 38 define only `src/modules/*` and `src/app/features/*`, so feature tests may import the fakes without a lint error. SHL-01 decision 16 found the same for other Shell files. Source: FACT F12; SHL-01 decision 16. [FACT F12]

24. **External behaviour only.** Tests assert rendered text, recorded requests, pushed envelopes, and emitted values or errors. No test reads a signal, a private field or a service. Source: `modules/shell.md` lines 82 to 84; DECISIONS 2026-11-13 entry at line 1096 (the rule that rejected SHL-04 revision 1 for reading private state). [DECISION]

25. **Parity test uses the real client once.** T4 sends the same mismatched body through `HttpApiClient` (through `HttpTestingController`) and through `FakeApiClient`, and asserts the same error class and path. Source: SHL-07 unit line 22 ("same behaviour as the real client"); SHL-02 decision 15 (the test seam). [DECISION]

26. **Files not changed.** No edit to `app.config.ts`, `app.routes.ts`, `app.ts`, `app.html`, `app.css`, `shell/index.ts`, `shell/tokens.ts`, `shell/api-client.ts`, `shell/api-error.ts`, `shell/sse-client.ts`, `shell/sse-envelope.ts`, `shell/route-data.ts`, any `tsconfig*.json`, `apps/web/angular.json`, `apps/web/package.json`, `package-lock.json` or `eslint.config.mjs`. Source: DECISION. Section 3, step 5 checks the list. [DECISION]

27. **Branch and commit.** The driver creates `unit/SHL-07` from `main`. The implementer does not commit or push. Source: SHL-01 decision 20 (precedent). [DECISION]

## 2. Files to create or change

Four files, all new. Nothing else changes.

| Path | Change | Purpose | Shared with |
|---|---|---|---|
| `apps/web/src/app/shell/testing/test-doubles.ts` | new | `FakeApiClient` (decisions 2 to 8), `FakeEventSource` (decisions 9 to 12), the types `RecordedRequest` and `ShellTestDoubles`, and `createShellTestDoubles()` with the throwing `HttpBackend` (decision 13). Imports `API_CLIENT` and `SSE_CLIENT` from `../tokens`, `parseResponse` and the type `ApiClient` from `../api-client`, the type `ApiError` from `../api-error`, `isPlatformEnvelope` from `../sse-envelope`, and types from `../sse-client` and `@bbartolome/scriba-contracts/platform`. | None edited. SHL-06's draft does not use this file: its decision 13 tests through a stubbed `EventSource` (open point 1). |
| `apps/web/src/app/shell/testing/test-doubles.spec.ts` | new | Criterion 2 tests T3 to T9 (section 4). | None. SHL-05's draft adds a different file to the same folder (below). |
| `apps/web/src/app/shell/testing/template-feature.ts` | new | `templateRoutes` and `TemplateFeaturePage` (decisions 14, 16, 17). The template a feature copies. | None |
| `apps/web/src/app/shell/testing/template-feature.spec.ts` | new | Criterion 1 tests T1 and T2 (section 4). The file a feature copies to start its route tests (decision 15). | None |

Shared with SHL-05 and SHL-06, file by file.

- SHL-05's draft (`plans/SHL-05.md`, section 2, line 48) adds `apps/web/src/app/shell/testing/match-media.ts` (new). That is a sibling in the same folder, not one of the four files of this plan, and its draft says so (line 48). SHL-05 also edits `shell/index.ts`, `app.routes.ts`, `app.ts`, `app.html`, `app.css` and `apps/web/package.json`. SHL-07 edits none of them. The driver's branch is cut from `main`, so `match-media.ts` is not on `unit/SHL-07`, and step 5a and 5e do not see it.
- The SHL-06 draft edits `app.html` (adds `<app-connection-status />` to the toolbar), `app.ts` (imports `ConnectionStatus`), `app.spec.ts`, `shell/notices.spec.ts` and `shell/theme.spec.ts` (each adds an `SSE_CLIENT` provider), and creates `shell/connection-status.ts` and `shell/connection-status.spec.ts`. SHL-07 edits none of these.
- No file is shared for editing with SHL-05 or SHL-06, so no merge conflict is possible. If another draft later adds a file under `shell/testing/`, it must not edit the four files above; the coordinator checks that at merge.

## 3. Method

Run from the repo root on the driver's branch `unit/SHL-07`. Do not run `git switch -c`, do not commit and do not push. Record `node -v` and `npm -v` with each result. Each step names its files.

0. **Preconditions (no file change).**
   - `git rev-parse --short HEAD` prints `eb30048`, or a later `main` commit for which `git diff --quiet eb30048 HEAD -- apps packages` exits 0 (the code paths; later commits may touch `plans/` and `units/` only).
   - `git status --short -- ':!plans'` prints nothing.
   - `ls apps/web/src/app/shell/testing` fails (the folder is new).
   - `node -v` prints `v26.x`; `npm -v` prints `11.20.0`.
1. **Install (no file change).** `npm ci` exits 0. `ls node_modules/@angular/core/package.json` lists the file. Before this step the directory is absent (F9), so the Angular packages and `node_modules/.bin/ng` do not exist yet.
2. **Contracts build (no file change).** `npm run build -w @bbartolome/scriba-contracts` exits 0. `ls packages/contracts/dist/platform/index.js` prints the path. Before this step `packages/contracts/dist` is absent (F8), and the specs import the built subpath at run time.
3. **Baseline (no file change, before any edit).**
   - `npm test -w @bbartolome/scriba-web` exits 0. Record the passed count `B` (35 `it(` calls in the eight web spec files on main, F19).
   - `npm run build -w @bbartolome/scriba-web` exits 0. Record the `Initial total` line as `I0`.
4. **Write the four files (section 2), following section 1.**
   - Then `npx prettier --write apps/web/src/app/shell/testing` and `npx prettier --check apps/web/src/app/shell/testing` exits 0.
5. **Static checks (no file change).**
   - a. `git status --short -uall -- ':!plans'` prints exactly four lines, each starting with `??`, one for each path of section 2. `-uall` lists each file of the new folder; the default folds the folder into one `??` line (F27).
   - b. `git diff --quiet -- apps/web/src/app/app.config.ts apps/web/src/app/app.routes.ts apps/web/src/app/app.ts apps/web/src/app/app.html apps/web/src/app/app.css apps/web/src/app/shell apps/web/package.json apps/web/angular.json apps/web/tsconfig.json apps/web/tsconfig.app.json apps/web/tsconfig.spec.json eslint.config.mjs package-lock.json` exits 0. (`git diff` shows tracked changes only, so the new folder does not trip it.)
   - c. `perl -0ne 'print "$ARGV\n" if /import\s+(?!type\s)[^;]*?scriba-contracts/s' apps/web/src/app/shell/testing/test-doubles.ts apps/web/src/app/shell/testing/template-feature.ts` prints nothing (decision 17). The check reads across lines, so a multi-line `import type { A, B } from '...scriba-contracts...'`, which Prettier wraps, is not a false failure (F26).
   - d. `grep -n -E "from 'vitest'|from 'node:|reference types" apps/web/src/app/shell/testing/test-doubles.ts apps/web/src/app/shell/testing/template-feature.ts` prints nothing (decision 20).
   - e. `grep -rl --include=*.ts -e 'shell/testing' -e "/testing/test-doubles'" -e "/testing/template-feature'" apps/web/src | grep -v '^apps/web/src/app/shell/testing/'` prints nothing (decision 1: no file outside the folder imports the doubles).
6. **Unit tests (files: the four of section 2).**
   - `npm test -w @bbartolome/scriba-web` exits 0. The passed count is `B + 9`, none failed, and the nine names T1 to T9 of section 4 are reported as passed.
   - Negative control, then restore. `cp apps/web/src/app/shell/testing/test-doubles.ts /tmp/shl07-test-doubles.ts`. In `FakeApiClient`'s send path, replace the `parseResponse(...)` call with `body as T`. `npm test -w @bbartolome/scriba-web` exits 1, with T3 and T4 failing and no other test failing. Restore with `cp /tmp/shl07-test-doubles.ts apps/web/src/app/shell/testing/test-doubles.ts`. Then `cmp /tmp/shl07-test-doubles.ts apps/web/src/app/shell/testing/test-doubles.ts` prints nothing.
7. **Type checks (no file change).** `npx tsc --noEmit -p apps/web/tsconfig.spec.json` exits 0. `npx tsc --noEmit -p apps/web/tsconfig.app.json` exits 0. The second one type-checks the two non-spec files in the app configuration (decision 20).
8. **Lint (no file change).** `npm run lint -w @bbartolome/scriba-web` exits 0.
9. **Production build (no file change).**
   - `npm run build -w @bbartolome/scriba-web` exits 0. The `Initial total` line equals `I0` exactly, because production code does not import the doubles.
   - `grep -l 'No canned response for' apps/web/dist/scriba-web/browser/*.js` prints nothing. `grep -l 'Not a Platform envelope' apps/web/dist/scriba-web/browser/*.js` prints nothing. These are negative checks only (A5).
10. **Record (no file change).** Report `B`, the new passed count, `I0`, the new `Initial total`, and `git status --short -uall -- ':!plans'`.

## 4. Acceptance criteria tests

Both criteria are local. They need Vitest with jsdom, no browser, no server and no credential. Once step 1 has run, nothing in this environment is missing for them.

All tests are in the two spec files of section 2. The expected results below are what the implementer must observe in step 6.

**Criterion 1.** "The dummy feature's route test runs under Vitest using only the fakes, asserting a rendered value from a fake response and a live update from a fake envelope." (SHL-07 unit line 21)

- **T1 Rendered value from a fake response** (`template-feature.spec.ts`). `createShellTestDoubles()` is called. `api.respond('GET', VERSION_ROUTE, { version: '1.2.3', revision: 'abc1234', builtAt: '2026-11-13T00:00:00Z', composeVersion: 1 } satisfies VersionInfo)` is registered. TestBed is configured with `provideRouter([templateEntry]), ...doubles.providers`. `RouterTestingHarness.create('/template')` is awaited. Expected: `routeNativeElement.textContent` contains `Platform version: 1.2.3`, and `TestBed.inject(API_CLIENT)` is `doubles.api` (the identity check: the injected client is the fake).
- **T2 Live update from a fake envelope** (`template-feature.spec.ts`). Same setup as T1. Then `doubles.events.push({ module: 'platform', type: 'echo', data: { seq: 4, sentAt: '2026-11-13T00:00:04.000Z' } })` and `harness.detectChanges()`. Expected: the text contains `Latest echo: 4`, and `doubles.api.requests.length` is 1, with path `VERSION_ROUTE`. The update came from the envelope, not from a second request.
- **Proof that only the fakes are used.** T1's identity check and T2's `requests.length === 1`. A real client would fail the identity check, and a second request would fail the count. The throwing `HttpBackend` of decision 13 is a second guard for tests that use the helper: an HTTP request sent around the fakes fails. No grep is used for this, because HttpClient is root-provided and a missing fake does not fail at injection (F25).
- **Command.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0, and T1 and T2 reported as passed.

**Criterion 2.** "The fakes reject responses that don't match the passed schema (same behaviour as the real client)." (SHL-07 unit line 22)

- **T3 Mismatch is rejected, for GET and POST** (`test-doubles.spec.ts`). Precondition: `healthzSchema.safeParse({ status: 'ok', version: 7 }).success` is false. GET part: `api.respond('GET', HEALTHZ_ROUTE, { status: 'ok', version: 7 })`, then `api.get(HEALTHZ_ROUTE, healthzSchema)` is subscribed. Expected: the error is an `ApiSchemaError`, `instanceof ApiError` is false, and `path` is `/healthz`. POST part: a local schema `acceptedSchema` (`ResponseSchema<{ accepted: boolean }>`, which rejects any non-object) is used. `api.respond('POST', ECHO_ROUTE, null)`, since `POST /api/platform/echo` answers 202 with no body (`apps/api/src/modules/platform/events/echo.controller.ts` lines 15 to 20). Then `api.post(ECHO_ROUTE, { count: 1, intervalMs: 0 }, acceptedSchema)` is subscribed. Expected: the error is an `ApiSchemaError` with `path` `/api/platform/echo`, and `requests` holds a `POST` with that path and body `{ count: 1, intervalMs: 0 }`.
- **T4 Same behaviour as the real client** (`test-doubles.spec.ts`). The same body `{ status: 'ok', version: 7 }` goes through two clients. The real one is `TestBed.inject(API_CLIENT)` with `provideHttpClient()`, `provideHttpClientTesting()` and `provideRouter([])`. Its request is flushed through `HttpTestingController` with `expectOne(HEALTHZ_ROUTE)`. The other is a new `FakeApiClient`. Expected: both errors are `ApiSchemaError` with `path` `/healthz`. This check is GET only, which is enough for the parity claim of decision 25.
- **T5 Accepted body is emitted parsed** (`test-doubles.spec.ts`). `respond('GET', HEALTHZ_ROUTE, { status: 'ok', version: '1.2.3' })`. Expected: the emission deep-equals `{ status: 'ok', version: '1.2.3' }`. This is the positive control for T3.
- **T6 Typed error is emitted as given** (`test-doubles.spec.ts`). `fail('GET', '/api/platform/version', new ApiError(404, 'PLATFORM_NOT_FOUND', 'Not found.', { x: 1 }))`. Expected: the same instance arrives on the error channel, `status` 404, `code` `PLATFORM_NOT_FOUND`.
- **T7 Unregistered route errors and is recorded** (`test-doubles.spec.ts`). `api.get('/api/none', healthzSchema)` with no registration. Expected: the error is a plain `Error` (not `ApiError`), its message is `No canned response for GET /api/none.`, and `requests` holds `{ method: 'GET', path: '/api/none' }`.
- **T8 Event fake rejects a non-envelope and delivers by module** (`test-doubles.spec.ts`). `events.push({ module: 'not-a-module', type: 'x', data: {} } as unknown as SseEnvelope)` throws a `TypeError` whose message is `Not a Platform envelope.` (decision 11). Then two valid envelopes are pushed: `events.push({ module: 'platform', type: 'echo', data: { seq: 1, sentAt: '2026-11-13T00:00:01.000Z' } })` and `events.push({ module: 'project-store', type: 'pending-created', data: {} })`. A subscriber to `events.stream('platform')` is attached before the first push and collects what it receives. `stream()` is hot with no replay (`sse-client.ts` line 79; the fake's `Subject` works the same way), so a subscriber attached after the pushes receives nothing. Expected: exactly one delivery, the `platform` echo.
- **T9 Drop, re-open and visibility fire ticks in order** (`test-doubles.spec.ts`). A subscriber to `reconcile$` collects reasons. Then `drop()`, `reopen()` and `tick('visible')`. Expected: the collected list is `['reopen', 'visible']`. `drop()` emits no tick.
- **Command.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0, and T3 to T9 reported as passed. The negative control of step 6 makes T3 and T4 fail, which shows the tests detect a fake that stops rejecting.

## 5. Agreement with downstream units

| Unit | What it needs from SHL-07 | Provided by this plan |
|---|---|---|
| SHL-08 (active project, landing; blocked by SHL-07, line 7) | A fake GET for the setup-status route and the active project, a fake POST for activate, and a fake `project-switched` on `project-store` (unit lines 21 to 24). | Yes: `respond`, `fail`, `requests`, `push` for any slug. The setup-status and project routes are `ApiPath` literals until SAU-01 and PST-01 publish them (open point 2). |
| SHL-09 (core gate; blocked by SHL-07, line 7) | "The feature route-test template runs under Vitest" (unit line 20). A dummy lazy feature of its own, in the app (line 18). | Yes: T1 and T2 are the template run. SHL-09's dummy must not be `templateRoutes`, which is test-only. |
| SHL-06 (connection indicator; `parallel_with` SHL-07, line 8) | Criterion 2 as amended by eb30048 (unit line 20): "Component tests drive the states through the stubbed EventSource." | Not required. The helpers are provided and SHL-06 does not use them. Settled by the Navigator (DECISIONS 2026-11-13, eb30048): SHL-06 tests through the stubbed global `EventSource`. No conflict and no dependency; SHL-06 stays parallel to SHL-07. |
| SHL-10 (tool-call card; blocked by SHL-09) | A sample chat route driven by the fake event source (unit line 26). | Yes: `stream(slug)` and `push`. |
| AGL-07 (chat panel; reads "Shell's fakes (SHL-07)", line 14) | `stream('agent-loop')`, a reconcile tick `reopen`, and a re-fetch of run state whose response changes between calls (line 28). | Yes: `reopen()`, `respond` replaces, `requests` counts the re-fetch. |
| GRR-09 (graphs list; line 20) | Fake API for the list, and "latest run status follows fake events" (`graph-runner` envelopes). | Yes. |
| PST-09 (project picker; line 29) | Fake API and fake SSE, including an external `project-switched` that updates the active marker. | Yes. |
| PST-20 (review queue; line 23) | Fake API and SSE: grouping, live insertion, update and removal from events. | Yes: `push` of any `project-store` type. |
| SAU-06 (minimal setup page; line 20) | A 401 that shows the sign-in notice: `fail('GET', '/api/setup-auth/status', new ApiError(401, …))`. | Yes. The fake does not navigate (decision 7). The navigation is SHL-02's test T7, so SAU-06 tests the notice only. |
| MPR-09 (providers panel; line 22) | Fake API typed from `/providers` types. | Yes, through `ApiPath` and the schema argument (decision 19). |
| CEX-17 (manuscript outline; line 24) | Fake API typed from `/compile-export` types. | Yes, same as MPR-09. |
| TRG-03 (form renderer; line 25) | Shell fakes for the Tools route. | Yes. |

## 6. Open points

1. **Settled by the Navigator (DECISIONS 2026-11-13, eb30048): SHL-06 uses the stubbed global `EventSource`.** The wording of SHL-06's criterion 2 (unit line 20) was changed by eb30048 from "drive the states through the fake event source" to "drive the states through the stubbed EventSource". That change is what settles it: "the fake event source" is the stub, not SHL-07's fake. SHL-06 stays parallel to SHL-07. SHL-07's helpers stay available to features and are not required by SHL-06.
2. **"Typed from the contract package" is partial on main.** Only `/platform` has contract values (F7). Other routes and events are literals or `SseEnvelope` until their slices land. The fakes need no change for that.
3. **The template's schema is local.** The template reads the version through a hand-written schema, because the Shell ships no runtime zod (DECISIONS 2026-11-13 zod entry). A feature that copies the template imports its own contract schema, and its build handling is that feature's plan.
4. **The fake emits synchronously.** The real client emits after an HTTP flush. A feature test must not rely on the real client's timing, and a render check waits for the value, not for a fixed tick.
5. **The fake starts `open`.** The real client starts at `connecting`. Feature tests must set the connection state they need (`setConnectionState`, `drop`, `reopen`).
6. **Unknown platform types are not dropped by the fake.** The real client drops `platform` types it does not know (`sse-client.ts` lines 139 to 145). The fake delivers them. Tests must not push such types.
7. **No Why or Scope section in the unit file.** `units/README.md` makes both optional. The decisions of section 1 take their place. This is not a contradiction.
8. **`npm ci` is needed first in this checkout.** `node_modules` has no `@angular` and no `ng` binary (F9). Step 1 installs them.

## 7. Facts checked and assumed

### 7a. Facts checked (with the check)

- **F1.** At revision 3, HEAD is a later `main` commit (`8936be4` at writing time). `git diff --name-only eb30048 HEAD` prints only `plans/DECISIONS.md`, so every commit after `eb30048` changes `plans/` only (`2a31a5a`, `10ec1cc`, `4ca000f` and `8936be4` at writing time, in that order). `eb30048` changed `units/SHL-06-connection-indicator.md` (line 20) and `plans/DECISIONS.md`. `git diff --name-only b3e5381 HEAD` lists exactly those two files, and `git diff --quiet b3e5381 HEAD -- apps packages` exits 0, so no code changed after `b3e5381`. `git diff --quiet 248f39d HEAD -- apps packages` exits 1, so the SHL-02, SHL-03 and SHL-04 code is on main after `248f39d`. `git branch --show-current` prints `main`.
- **F2.** The SHL-02 and SHL-03 code is on main: `shell/api-client.ts` (117 lines), `shell/api-error.ts` (60 lines), `shell/tokens.ts` (12 lines), `shell/index.ts` (9 lines), `shell/sse-client.ts` (244 lines), `shell/sse-envelope.ts` (49 lines). `app.config.ts` lines 25 to 28 provide `SSE_CLIENT` with `useClass: SseClient` and start it in an initializer.
- **F3.** `sse-client.ts`: `@Injectable()` with no `providedIn` (line 37); private fields `router`, `destroyRef`, `state`, `reachable`, `envelopes`, `ticks`, `source`, `timer`, `started`, `destroyed`, `hasOpened`, `failures` (lines 39 to 50); public `connectionState` (line 53), `serverReachable` (line 56), `reconcile$` (line 59), `stream(slug)` (line 78), `start()` (line 83). Types `ConnectionState` (line 11) and `ReconcileReason` (line 14). Initial state `connecting` (line 41) and reachable `true` (line 42). `index.ts` line 6 exports the class only as a type.
- **F4.** `sse-envelope.ts`: `EVENTS_PATH` and `HEALTHZ_PATH` (lines 10 and 13), `PUBLISHING_SLUGS` (lines 16 to 25), `isPlatformEnvelope` (lines 35 to 49), which checks a plain object, a `module` in the slug list, a `type` that matches the pattern, and a `data` key.
- **F5.** `api-client.ts`: `ApiPath` (line 13), `ResponseSchema<T>` (lines 17 to 21), `ApiClient` (lines 24 to 35), `parseResponse` (lines 38 to 48, throws `ApiSchemaError`), `HttpApiClient.get` and `post` with `map(parseResponse)` (lines 71 and 85).
- **F6.** `api-error.ts`: `ApiError` constructor `(status, code, message, details?)` (lines 15 to 20); `ApiSchemaError(path, issues)` (lines 31 to 41). `route-data.ts`: `ShellRouteData` (lines 15 to 19). `app.routes.ts`: `PROJECT_ROUTES` (line 9) and `APP_ROUTES` (lines 15 to 22); unchanged by this plan.
- **F7.** Contracts: `packages/contracts/src/platform/http.ts` exports `HEALTHZ_ROUTE` (line 8), `VERSION_ROUTE` (line 9), `healthzSchema` (lines 12 to 15), `versionInfoSchema` (lines 20 to 25), types `Healthz` and `VersionInfo` (lines 27 and 28). `events.ts` exports `EVENTS_ROUTE` (line 5), `ECHO_ROUTE` (line 6), `sseEnvelopeSchema` (lines 15 to 19), type `SseEnvelope` (line 21), `echoDataSchema` (lines 31 to 34), types `EchoData` and `PlatformEvent`, and `echoRequestSchema` (lines 37 to 40). `errors.ts` exports `errorBodySchema` (lines 25 to 31) and type `ErrorBody` (line 33). The nine other `src/*/index.ts` files (agent-loop, compile-export, genre-packs, graph-runner, project-store, providers, setup-auth, shell, tool-registry) contain only `export {};`.
- **F8.** `packages/contracts/dist` is absent (`test -d` fails). `packages/contracts/package.json` has no `"type"` field, and `tsconfig.base.json` sets `"module": "NodeNext"`, so the built subpath is CommonJS. `packages/contracts/package.json` exports `./platform` (lines 5 to 9).
- **F9.** `node_modules/@angular` is absent, and so are `node_modules/.bin/ng` and `node_modules/@angular/cli`. `node_modules/.bin` holds `tsc`, `vitest` and others. `node_modules/@bbartolome/` holds the workspace links.
- **F10.** `apps/web/src/app/features/` contains only `.gitkeep`.
- **F11.** `apps/web/tsconfig.json`: `noPropertyAccessFromIndexSignature: true` (line 8). `apps/web/tsconfig.app.json`: `types: []` (line 6), `include` `src/**/*.ts` (line 8), `exclude` `src/**/*.spec.ts` (line 9). `apps/web/tsconfig.spec.json`: `types: ["vitest/globals"]` (line 6), `include` the specs and `.d.ts` files (line 8).
- **F12.** `eslint.config.mjs` lines 27 to 38: the two `boundaries/elements` entries are `src/modules/*` (`api-module`) and `src/app/features/*` (`web-feature`).
- **F13.** `apps/web/angular.json` lines 75 to 77: `"test": { "builder": "@angular/build:unit-test" }`. In the cached `@angular/build` 22.2.5 package (`/tmp/plt11-probe/ng/package`): `src/builders/unit-test/schema.json` sets the runner default to `vitest` and the include default to `['**/*.spec.ts', '**/*.test.ts']`. `src/builders/unit-test/runners/vitest/index.js` line 43 requires `jsdom` or `happy-dom`. `apps/web/package.json` line 28 has `jsdom` 30.1.3.
- **F14.** Locked versions (`package-lock.json`): `vitest` 5.1.0 (line 10483), `@angular/build` 22.2.5 (line 198), `@angular/core` 22.2.5 (line 900), `zod` 4.6.6 (line 10814).
- **F15.** Cached `@angular/core` 22.2.5 (`/tmp/shl01-cache/angular/core/package`): `ZONELESS_ENABLED` has `factory: () => true` (`fesm2022/_pending_tasks-chunk.mjs` lines 2942 to 2944); the TestBed field `autoDetectDefault = this.zonelessEnabled ? true : false` (`fesm2022/testing.mjs` line 162); `ModuleTeardownOptions.destroyAfterEach` defaults to `true` (`types/testing.d.ts` line 414 and its doc). Cached `@angular/router` 22.2.5 `types/testing.d.ts` lines 58 to 82: `RouterTestingHarness.create(initialUrl?)`, `fixture`, `detectChanges()`, `routeNativeElement`.
- **F16.** `ValueSansProvider.useValue: any` (`@angular/core` 22.2.5 types, `_chrome_dev_tools_performance-chunk.d.ts` lines 267 to 271). `toSignal` is exported from `@angular/core/rxjs-interop` (its `exports` map, `package.json` lines 36 to 39).
- **F17.** Existing specs: `sse-envelope.spec.ts` lines 1 to 6 import contract values at run time from `@bbartolome/scriba-contracts/platform`. `api-client.spec.ts` line 9 imports types only and line 10 imports `createRequire`, which its T11 uses for the CommonJS dist.
- **F18.** What this check covers: the plan files on disk when the check ran. The committed `plans/` files are `DECISIONS.md`, `PLT-01` to `PLT-16` and `SHL-01` to `SHL-04` (`git ls-files plans`). Three untracked drafts are on disk: `plans/SHL-05.md` (draft, SHL-05's plan), `plans/SHL-06.md` (draft, revision 2) and `plans/SHL-07.md` (this plan). `git status --short plans` lists them. Their file tables were read for section 2.
- **F19.** Test count on main: `grep -cE "^\s*(it|test)(\.each)?\("` over the eight web spec files gives 3, 1, 11, 3, 1, 12, 1 and 3, a total of 35. This is a grep, not a run; step 3 records the real count `B`.
- **F20.** Unit `SHL-07` line numbers: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Decisions lines 15 to 18; criteria lines 21 and 22.
- **F21.** `modules/shell.md`: line 36 (parallel order), line 42 (Shell code outside `features/`), line 43 (what the Shell consumes), lines 47 to 63 (route table), line 75 (the fakes row), lines 82 to 84 (testing principles), line 85 (stubbed `EventSource` for the SSE client).
- **F22.** DECISIONS: line 1084 (the zod decision, "the Shell ships no runtime zod"), line 1096 (the rule against reading private services or signal wiring).
- **F23.** SHL-02 plan decisions 3, 10, 12, 14 and 15, and its section 3 step 6 (the `scriba-contracts` grep) and tests T3, T7, T9, T10 (section 4). SHL-03 plan section 2 says that SHL-07 "mirrors the public interface in its own fake; it does not reuse this file" (the `sse-client.spec.ts` row).
- **F24.** Feature unit lines used in section 5: AGL-07 lines 14, 20, 28; GRR-09 line 20; PST-09 line 29; PST-20 line 23; SAU-06 line 20; MPR-09 line 22; CEX-17 lines 14 and 24; TRG-03 line 25; SHL-06 lines 7, 8, 15 and 20; SHL-08 lines 7 and 21 to 24; SHL-09 lines 7, 18 and 20; SHL-10 line 26.
- **F25.** `@angular/common` 22.2.5, read from the npm cache tarball (integrity `sha512-8yRuc…`), extracted to `/tmp/shl07-cache/common/package` outside the repo. In `fesm2022/_module-chunk.mjs`: `HttpClient` is `providedIn: 'root'` (line 1522); `HttpHandler` is `providedIn: 'root'` with `useExisting: HttpInterceptorHandler` (line 1368); `HttpBackend` is `providedIn: 'root'` with `useExisting: FetchBackend` (line 1262); `FetchBackend` is declared with `ɵɵngDeclareService` (line 1028). `HttpBackend` is exported from `@angular/common/http` (`types/http.d.ts`, the export list near line 2657 of that file), and `types/http.d.ts` line 24 declares it abstract with `handle(req)`.
- **F26.** The step 5c check was run on sample files in `/tmp/shl07-probe` (outside the repo). The perl command prints a file with a runtime multi-line import, and prints nothing for a multi-line `import type`, a single-line `import type`, or a mixed file with a runtime import of another module. The `grep -n 'scriba-contracts' ... | grep -v 'import type'` form prints the closing `} from '...scriba-contracts...'` line of a multi-line `import type`, which is the false failure of revision 1.
- **F27.** The untracked-file listing was checked in a scratch repo outside the project (`/tmp/shl07-scratch`: four new files under `apps/web/src/app/shell/testing/`, plus one file under `plans/`, which the pathspec excludes). `git status --short -- ':!plans'` prints `?? apps/`, one line that hides the folder. `git status --short -uall -- ':!plans'` prints the four `??` lines, one per file (Opus rejection 2, item 1, reproduced here).

### 7b. Things assumed

- **A1.** `npm ci` succeeds in the implementer's environment with registry access (SHL-01 ran it). Step 1 tests it.
- **A2.** A direct run-time import of `@bbartolome/scriba-contracts/platform` works in a spec under the Vitest builder. SHL-03's T13 is the precedent, and step 3 (the baseline run) tests it again.
- **A3.** A signal change from the push renders after `harness.detectChanges()` in zoneless TestBed. T2 tests it.
- **A4.** A route entry with `pathMatch: 'full'` and `loadChildren` into a sibling file works under `RouterTestingHarness`, as SHL-01's probe showed before it was deleted. T1 tests it.
- **A5.** A production build leaves out code that nothing imports. Step 9's unchanged `Initial total` and the two literal greps check that fact in the negative only. No positive control exists in production, so step 5e, the import grep, carries the proof.
- **A6.** `@bbartolome/scriba-contracts/platform` resolves inside `apps/web` through the workspace link, as `api-client.spec.ts` and `sse-envelope.spec.ts` already rely on.
- **A7.** `HttpClient` yields `null` for an empty JSON body, which is why `POST /api/platform/echo` is modelled with a canned `null` (T3). T3 uses the canned value directly, so no test depends on this.
