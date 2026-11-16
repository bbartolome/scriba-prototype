---
id: SAU-17
status: done
---
# SAU-17 plan — LocalAPI client and normalised Tailscale status endpoint

Setup & auth, phase:tailnet, M3, main track. Unit `units/SAU-17-localapi-client-status.md` (three acceptance criteria at its lines 28 to 30). Written at main `6381d5d`. Revised by Opus on 2026-11-16 at main `fef1f47` (revision notes in section 10). The planner and the reviser changed no code and ran no test. Facts are marked **[checked]** (read at `6381d5d`, with the place) or **[assumed]** (section 9).

"Unit" means `units/SAU-17-localapi-client-status.md`. "Module" means `modules/setup-auth.md`. "DECISIONS" means `plans/DECISIONS.md`. A search of DECISIONS for `SAU-17` finds no decision for this unit: lines 796, 806 and 3954 cite it as a line reference only. The split of the contract is in `plans/SAU-01.md` line 130: the LocalAPI field mapping is SAU-17's.

## 1. Decisions this plan follows

1. **Socket and request (unit line 20).** `GET /localapi/v0/status` over a Unix socket at `SCRIBA_TS_SOCKET`, with the header `Host: local-tailscaled.sock`. No Tailscale CLI. The app only reads. The default path is `packages/contracts/src/platform/env.ts` line 15; the app reads the value into `ScribaEnv.SCRIBA_TS_SOCKET` (`apps/api/src/modules/platform/boot/env.ts` lines 22 and 117 to 122). The compose file gives `scriba` the same path (`deploy/compose.yaml` line 53) and mounts the volume read-only (line 56).
2. **Fields read (unit line 21).** `BackendState`; `AuthURL`; `Self.DNSName` with the trailing dot removed; `CurrentTailnet.MagicDNSEnabled`; `CertDomains` (empty means HTTPS certificates off); `Self.UserID`, resolved in the `User` map to `LoginName`. The hostname is never hard-coded to `scriba`.
3. **Normalised status (unit line 22).** The output is the existing contract `tailscaleStatusSchema` (`packages/contracts/src/setup-auth/tailscale.ts` lines 18 to 28). Its comment (line 18) says that when Tailscale is not available, `backendState` is `NoState`. No contract change.
4. **Cache and refresh (unit line 22).** The status read is cached briefly on the server. A rate-limited `refresh()` is exposed for SAU-18. The numbers are in section 3, step 7; the planner chose them (section 7, point 4).
5. **Endpoint (unit line 23).** `GET` of `TAILSCALE_STATUS_ROUTE`, which is `/api/setup-auth/tailscale/status` (`packages/contracts/src/setup-auth/routes.ts` lines 11 to 12). The path was assumed in `plans/SAU-01.md` line 34 and is used as it is. The route is guarded by the global default-deny guard (`apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 45 to 76). It is not `@Public()`. No SSE (module line 43).
6. **Auth key (unit line 24).** No code in this unit. The sidecar reads the optional `.secret` (`deploy/compose.yaml` lines 8 to 10). The app does nothing for it. Userspace mode and auth-key management are out of scope (module line 78).
7. **Test double (unit line 25; module line 67).** A small fake Unix-socket server that serves recorded status payloads is the only double for tailscaled. No mock of the client is allowed. "Recorded payloads" is read as fixed payloads stored in files and replayed unchanged by the fake (section 7, point 2). Their key set follows a real `tailscale status --json` read (F15).
8. **Testing (module lines 65 to 69).** External behaviour only: HTTP status and body, through the composed app. The app is made with `createTestApp` (`apps/api/test/create-test-app.ts` lines 65 to 114) and an `env` override that sets `SCRIBA_TS_SOCKET`. The cookie comes from `sessionCookie` (`apps/api/test/guard-request.ts` lines 80 to 98). Vitest.
9. **In-process providers (module line 41).** The client and the service are NestJS providers of the setup-auth module. They are not contract members. SAU-18 uses the service inside the same module.
10. **Identity (module line 44).** `ownerLogin` is for display and for the allowlist seed (unit SAU-19 line 19). It partitions no data.
11. **Start point (module line 7).** The LocalAPI client may start once `phase:token-guard` closes. SAU-08 is done (`plans/SAU-08.md` line 3).
12. **Placement and names (module line 40; `plans/SAU-08.md` section 1, item 18).** Source files under `apps/api/src/modules/setup-auth/`. Test and helper files under `apps/api/test/`. Test names start with `localapi status, criterion N:`.
13. **Blockers (unit lines 7 and 9; `units/README.md` line 64).** `blocked_by: [SAU-08]`. `unblocks: [SAU-18, SAU-20]`. Both name SAU-17 in `blocked_by` (SAU-18 line 7, SAU-20 line 7): the inverse holds.

Not decided here: the tailnet Host and the identity header (SAU-18), the owner allowlist (SAU-19) and the UI (SAU-20). This plan makes no unit change.

## 2. Files to change

Only these paths change. The planner checked the others (section 8, F13).

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/setup-auth/localapi-client.ts` | new | `LocalApiClient`: one `GET /localapi/v0/status` over the socket at `SCRIBA_TS_SOCKET`, with `Host: local-tailscaled.sock`, `agent: false` and a 2000 ms timeout. Resolves with the parsed JSON body; rejects on any socket error, timeout, non-200 status or bad JSON. It has no other method. |
| `apps/api/src/modules/setup-auth/tailscale-status.service.ts` | new | `TailscaleStatusService` (`status()`, `refresh()`), the constants `TAILSCALE_STATUS_CACHE_MS` and `TAILSCALE_REFRESH_MIN_INTERVAL_MS`, and the function `normaliseLocalApiStatus(payload: unknown): TailscaleStatus` with the rules of section 4.3 |
| `apps/api/src/modules/setup-auth/tailscale-status.controller.ts` | new | `TailscaleStatusController`: `@Get(TAILSCALE_STATUS_ROUTE)` returns `service.status()`. No `@Public()`. No cookie check in the controller: the guard does it (as `setup-flow.controller.ts` lines 16 to 17 say) |
| `apps/api/src/modules/setup-auth/setup-auth.module.ts` | edit | Adds `TailscaleStatusController` to `controllers` (lines 28 to 32) and `LocalApiClient` and `TailscaleStatusService` to `providers` (lines 33 to 53). `exports` (line 54) is unchanged. |
| `apps/api/test/localapi-fake.ts` | new | `startFakeLocalApi(fixture)`: a Unix-socket server with `use(fixture)`, `hits()`, `socketPath` and `close()`. Helper, not a test file. |
| `apps/api/test/fixtures/localapi/running-certs.json` | new | Recorded-shape payload, `Running` with certificates (section 4.1) |
| `apps/api/test/fixtures/localapi/running-no-certs.json` | new | `Running`, `CertDomains` empty |
| `apps/api/test/fixtures/localapi/running-null-certs.json` | new | `Running`, `CertDomains` null (the shape the installer node showed, section 8) |
| `apps/api/test/fixtures/localapi/needs-login.json` | new | `NeedsLogin` with `AuthURL` |
| `apps/api/test/fixtures/localapi/logged-out.json` | new | `NeedsLogin` with `AuthURL` empty |
| `apps/api/test/setup-auth-localapi.test.ts` | new | Tests T1, T2 and T3 of section 4 |

Not changed, and why:

- `packages/contracts/**`: the route constant and the schema exist (`tailscale.ts`, `routes.ts`, SAU-01).
- `apps/api/test/invariant-sweep.ts`: the new route has no `:` in its template, so it needs no `FIXTURE_PATHS` entry (section 6).
- `apps/api/test/create-test-app.ts` and `apps/api/test/guard-request.ts`: the tests pass `SCRIBA_TS_SOCKET` through the existing `env` option and use the existing `sessionCookie`.
- `apps/api/src/modules/setup-auth/setup-auth.guard.ts`, `request-policy.ts`, `host-frame.middleware.ts`: the Host allowlist does not change in this unit (SAU-18).
- `apps/web/**`: the UI is SAU-20. `deploy/**` and `apps/api/src/modules/platform/**`: no change.

## 3. Procedure

Run in a new worktree `/Users/bbartolome/workspace/scriba-prototype-wt/SAU-17` on the branch `unit/SAU-17`, made from `main`. Record `node -v` (expected `v26.x`) and `npm -v` beside each result. Do not push: the repository has no remote.

1. **Worktree.** The orchestrator gives the implementer its worktree on `unit/SAU-17`, made from `main` (prompt.md, Implement). If the branch already exists, continue from its commits and do not reset it.
2. **Install.** In the worktree, `npm ci`. Expected: exit 0.
3. **Baseline.** `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-api`. Expected: both exit 0 before any change. If the baseline fails, stop and report; the failure is not this unit's.
4. **Fixtures.** Create the five files of section 4.1. Then `npx prettier --write apps/api/test/fixtures/localapi`. Expected: each file is reported as written.
5. **Fake socket server.** Create `apps/api/test/localapi-fake.ts` as section 4.2 describes.
6. **Client.** Create `apps/api/src/modules/setup-auth/localapi-client.ts`. Import `Inject`, `Injectable` from `@nestjs/common`, `request` from `node:http`, and `SCRIBA_ENV` and `type ScribaEnv` from `'../platform/platform.module'` (the same import that `setup-status.service.ts` uses; its injection is at line 53). Class `LocalApiClient` with the constructor `@Inject(SCRIBA_ENV) private readonly env: ScribaEnv` and one method `status(): Promise<unknown>`. The method makes `request({ socketPath: this.env.SCRIBA_TS_SOCKET, path: '/localapi/v0/status', method: 'GET', headers: { Host: 'local-tailscaled.sock' }, agent: false })`. It sets a 2000 ms timeout that destroys the request with an error. It resolves with `JSON.parse` of the body when the status is 200. It rejects in every other case. Do not use `any`: the body is read as text and parsed as `unknown`.
7. **Service.** Create `apps/api/src/modules/setup-auth/tailscale-status.service.ts`.
   - Export `TAILSCALE_STATUS_CACHE_MS = 2000` and `TAILSCALE_REFRESH_MIN_INTERVAL_MS = 1000`.
   - Export `normaliseLocalApiStatus(payload: unknown): TailscaleStatus`. Its rules are in section 4.3.
   - Class `TailscaleStatusService` (`@Injectable()`), constructor `private readonly client: LocalApiClient`. Two private fields: `current: Promise<TailscaleStatus> | undefined` and `startedAt` (initially `Number.NEGATIVE_INFINITY`).
   - Private `read()`: sets `startedAt = Date.now()`, sets `current = client.status().then(normaliseLocalApiStatus, () => UNAVAILABLE)`, and returns `current`.
   - `status()`: returns `current` when it exists and `Date.now() - startedAt < TAILSCALE_STATUS_CACHE_MS`; otherwise returns `read()`.
   - `refresh()`: the same test with `TAILSCALE_REFRESH_MIN_INTERVAL_MS`. Both methods share `current` and `startedAt`. Because `current` is a promise, callers that arrive during a read share it (single flight).
   - `UNAVAILABLE` is `{ available: false, backendState: 'NoState' }`.
   - The raw payload is parsed with a private zod schema (zod 4 is a dependency of `apps/api`). Every key is optional or nullable, the names are the LocalAPI names, and unknown keys are ignored. A parse failure gives `UNAVAILABLE`.
8. **Controller.** Create `apps/api/src/modules/setup-auth/tailscale-status.controller.ts`: `@Controller()`, one method `@Get(TAILSCALE_STATUS_ROUTE) getTailscaleStatus(): Promise<TailscaleStatus>` that returns `this.status.status()`. Import the route and the type from `@bbartolome/scriba-contracts/setup-auth`.
9. **Module.** Edit `apps/api/src/modules/setup-auth/setup-auth.module.ts`: import the three new classes; add `TailscaleStatusController` to `controllers` after `SetupFlowController`; add `LocalApiClient` and `TailscaleStatusService` to `providers`. Leave `exports` as it is.
10. **Tests.** Create `apps/api/test/setup-auth-localapi.test.ts` with T1, T2 and T3 of section 4.4.
11. **Run the new file.** In `apps/api`: `npx vitest run test/setup-auth-localapi.test.ts`. Expected: three tests pass.
12. **Check that each test can fail.** Make each mutation of section 4.5 by hand, run the file, record the failing test names, and restore the file from a saved copy. Expected: each mutation fails the test named for it. After all five, `git status --short` lists only the files of section 2.
13. **Whole API suite.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. The invariant sweeps now include the new route (GET and HEAD leave the library unchanged; every non-public route gives 401 without a cookie). They must still pass.
14. **Format and lint.** `npx prettier --write` on each file of section 2 that is new or edited. Then `npm run lint -w @bbartolome/scriba-api`. Expected: exit 0.
15. **Root gates.** From the root: `npm run lint`, `npm test` and `npm run build`. Expected: each exits 0. The root lint runs `prettier --check .`, which covers the JSON fixtures.
16. **Regression (optional, not a criterion).** `npm run e2e`. Expected: exit 0. The journey does not call the status route. If the harness cannot run here, record why and continue.
17. **Commit.** Add the files of section 2 by path: `git add -- <paths>`. Then `git commit -m "feat(SAU-17): add the LocalAPI client and the normalised Tailscale status endpoint" -- <paths>`. One commit. Do not use `git add -A` or `git commit -a`.
18. **Report.** The implementer returns the outputs of steps 3, 11, 12, 13, 14, 15 and 16, with the Node and npm versions. A criterion counts as passed only when its test passed. The implementer does not edit the unit or this plan. The orchestrator ticks the boxes.

## 4. Acceptance criteria and tests

The unit has three criteria, so there are three tests. Each test file is `apps/api/test/setup-auth-localapi.test.ts`. The seam is the composed app over HTTP, with the fake socket as the only double for tailscaled.

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| 1. Without a socket, status reads `available: false` and loopback access is unaffected (28) | T1 | Section 4.4, T1 |
| 2. Against the fixtures: `NeedsLogin` exposes `authURL`; `Running` exposes `dnsName` (no trailing dot) and `tailnetURL`; empty `CertDomains` gives `httpsCertsEnabled: false`; `ownerLogin` is resolved from the `User` map (29) | T2 | Section 4.4, T2 |
| 3. Repeated calls within the cache window hit the socket once (30) | T3 | Section 4.4, T3 |

### 4.1 Fixture payloads

Directory `apps/api/test/fixtures/localapi/`. The files are hand-written in the field shape of section 9 (assumed). They are not recordings: the repository holds no recorded LocalAPI payload. The name of the examples folder must not appear in any file here or in the test file (`scripts/examples-check/m1.mjs`, `checkTestFiles`, lines 201 to 222).

`running-certs.json` (exact content):

```json
{
  "BackendState": "Running",
  "AuthURL": "",
  "HaveNodeKey": true,
  "TailscaleIPs": ["100.100.10.7", "fd7a:115c:a1e0::7"],
  "Self": {
    "ID": "n1",
    "DNSName": "scriba-1.tail1234.ts.net.",
    "HostName": "scriba",
    "UserID": 4242,
    "Online": true,
    "TailscaleIPs": ["100.100.10.7", "fd7a:115c:a1e0::7"]
  },
  "MagicDNSSuffix": "tail1234.ts.net",
  "CurrentTailnet": {
    "Name": "ada.example.com",
    "MagicDNSSuffix": "tail1234.ts.net",
    "MagicDNSEnabled": true
  },
  "CertDomains": ["scriba-1.tail1234.ts.net"],
  "User": {
    "1111": { "ID": 1111, "LoginName": "bob@example.com", "DisplayName": "Bob" },
    "4242": { "ID": 4242, "LoginName": "ada@example.com", "DisplayName": "Ada" }
  }
}
```

The distractor (bob) has the smaller ID on purpose. JavaScript iterates integer-like object keys in ascending numeric order, so bob is the first entry of `User`. A first-entry lookup then gives bob, and test M4 in section 4.5 catches it.

The other four files:

- `running-no-certs.json`: as `running-certs.json`, with `"CertDomains": []`.
- `running-null-certs.json`: as `running-certs.json`, with `"CertDomains": null`.
- `needs-login.json`: `"BackendState": "NeedsLogin"`, `"AuthURL": "https://login.tailscale.com/a/0123456789abcdef"`, `Self` with `"DNSName": ""`, `"UserID": 0`, `"TailscaleIPs": null`; `"CurrentTailnet": null`, `"CertDomains": null`, `"User": {}`.
- `logged-out.json`: as `needs-login.json`, with `"AuthURL": ""`. The unit's word "logged out" is modelled as `NeedsLogin` with no URL (section 7, point 3; assumption A13).

Run `npx prettier --write` on the folder (step 4).

### 4.2 Fake socket server

`apps/api/test/localapi-fake.ts` exports:

- `type LocalApiFixture = 'needs-login' | 'logged-out' | 'running-certs' | 'running-no-certs' | 'running-null-certs'`;
- `interface FakeLocalApi { readonly socketPath: string; use(fixture: LocalApiFixture): void; hits(): number; close(): Promise<void>; }`;
- `startFakeLocalApi(fixture: LocalApiFixture): Promise<FakeLocalApi>`.

Behaviour. It makes a temp folder with `mkdtempSync(join(tmpdir(), 'lapi-'))` and the socket `join(folder, 'ts.sock')`. The name is short on purpose: macOS limits the socket path to about 104 bytes (section 9). Every request that reaches the server increments `hits()`. A `Host` other than `local-tailscaled.sock` gets 400. A path other than `/localapi/v0/status` gets 404. Otherwise the answer is 200 with `Content-Type: application/json` and the file `fixtures/localapi/<fixture>.json`, read at request time, so `use()` switches the payload while the app runs. `close()` closes the server and removes the folder.

### 4.3 Normalisation rules

These rules are the planner's reading of the unit's decisions (unit lines 21 and 22). The tests in section 4.4 check them. A field that is omitted is absent from the JSON, not empty.

- R1. A payload that is not an object, that fails the private schema, or whose `BackendState` is not one of the six names in `BACKEND_STATES` (`tailscale.ts` lines 4 to 11) gives `UNAVAILABLE`.
- R2. `AuthURL` non-empty gives `authURL`. Empty or absent: no `authURL` key.
- R3. `Self.DNSName` non-empty gives `dnsName`, with exactly one trailing dot removed. `tailnetURL` is `https://` followed by `dnsName`. Empty or absent: no `dnsName` and no `tailnetURL`.
- R4. `magicDNSEnabled` is `true` when `CurrentTailnet.MagicDNSEnabled` is `true`, otherwise `false` (also when `CurrentTailnet` is null).
- R5. `httpsCertsEnabled` is `true` only when `CertDomains` is an array with at least one entry. `null`, absent and `[]` give `false`.
- R6. `ownerLogin` is `User[String(Self.UserID)].LoginName` when that is a non-empty string. Otherwise no `ownerLogin` key.
- R7. The result is validated with `tailscaleStatusSchema.safeParse`. A failure gives `UNAVAILABLE`. This catches a missed dot removal.
- R8. Every payload that passes R1 and R7 has `available: true`.
- R9. The client's errors (no socket, refused, timeout, non-200, bad JSON) give `UNAVAILABLE`.

### 4.4 Tests

**T1 — criterion 1.** Name: `localapi status, criterion 1: without a socket, status reads available false and loopback access is unaffected`.

- Make a library folder and a second folder. The socket path is `join(second, 'missing.sock')`; the file is not created.
- `createTestApp({ libraryDir: library, staticRoot: resolve(__dirname, 'fixtures/static'), env: { SCRIBA_TS_SOCKET: socketPath } })`.
- `cookie = await sessionCookie(app, library)`.
- `GET TAILSCALE_STATUS_ROUTE`, Host `127.0.0.1:8080`, with the cookie: status 200. The body parses with `tailscaleStatusSchema`, and it equals `{ available: false, backendState: 'NoState' }`.
- `GET VERSION_ROUTE` and `GET SETUP_STATUS_ROUTE`, same Host and cookie: each 200. Loopback access is unaffected.
- Extra, not a criterion: a regular file at the socket path (not a socket) also gives the same body.
- In `finally`: `app.close()`, then remove both folders.

**T2 — criterion 2.** Name: `localapi status, criterion 2: the fixtures give authURL, dnsName without the trailing dot, tailnetURL, httpsCertsEnabled and ownerLogin`.

- For each of the five fixtures, in this order: `startFakeLocalApi(name)`, then a new library folder, then a new app with `env: { SCRIBA_TS_SOCKET: fake.socketPath }`, then `sessionCookie`, then one `GET TAILSCALE_STATUS_ROUTE`. Close the app, then the fake, then remove the folder. A new app for each fixture is required: the cache window is 2000 ms, so a second fixture on the same app would get the first fixture's answer.
- The test has its own timeout of 60000 ms (third argument of `it`), because it boots five apps and the default is 20000 ms (A8). It stays one test for criterion 2.
- Expected bodies, which must also parse with `tailscaleStatusSchema`:
  - `needs-login`: `available` true; `backendState` `NeedsLogin`; `authURL` `https://login.tailscale.com/a/0123456789abcdef`; `magicDNSEnabled` false; `httpsCertsEnabled` false; no `dnsName`, `tailnetURL` or `ownerLogin` key.
  - `logged-out`: `available` true; `backendState` `NeedsLogin`; `magicDNSEnabled` false; `httpsCertsEnabled` false; no `authURL` key (not an empty string).
  - `running-certs`: `backendState` `Running`; `dnsName` `scriba-1.tail1234.ts.net`; `tailnetURL` `https://scriba-1.tail1234.ts.net`; `magicDNSEnabled` true; `httpsCertsEnabled` true; `ownerLogin` `ada@example.com`. Bob's key `1111` is the first entry of `User` in iteration order, so a first-entry lookup fails.
  - `running-no-certs`: as `running-certs`, with `httpsCertsEnabled` false.
  - `running-null-certs` (extra assertion, from the installer node's `CertDomains: null`, section 8): as `running-no-certs`.

**T3 — criterion 3.** Name: `localapi status, criterion 3: status calls within the cache window read the socket once`.

- `fake = startFakeLocalApi('running-certs')`; one library, one app with `env: { SCRIBA_TS_SOCKET: fake.socketPath }`; `cookie = sessionCookie(...)`.
- Expect `fake.hits()` to be 0.
- Send three `GET TAILSCALE_STATUS_ROUTE` in parallel (`Promise.all`), then one more after them. Each is 200 with the same body. Expect `fake.hits()` to be 1. The parallel part checks single flight.
- Extra, not a criterion: wait 2100 ms, then one more `GET`. Expect `fake.hits()` to be 2. This shows the cache is a window and not permanent.
- In `finally`: close the app, then the fake, then remove the folder.

### 4.5 Mutations (step 12)

Each mutation is made by hand, run with `npx vitest run test/setup-auth-localapi.test.ts`, and reverted from a saved copy. The expected failure is named.

- M1. `TAILSCALE_STATUS_CACHE_MS = 0`. Expected: T3 fails (the socket is hit on each call).
- M2. `httpsCertsEnabled` computed as `CertDomains !== undefined`. Expected: T2 fails for `running-no-certs` (`[]` is not undefined).
- M3. Remove the trailing-dot removal. Expected: R7 gives `UNAVAILABLE`, so T2 fails for `running-certs` (`available` false).
- M4. `ownerLogin` taken from the first entry of `User`. Expected: T2 fails for `running-certs`.
- M5. Remove the client's error handler (the `() => UNAVAILABLE` branch). Expected: T1 fails with status 500.

### 4.6 Pass condition

T1, T2 and T3 pass, and each mutation fails the test named for it. The whole API suite (step 13) passes.

## 5. Downstream agreement

| Unit | What the unit needs from SAU-17 | What this plan gives |
|---|---|---|
| SAU-18 tailnet guard path (`blocked_by` SAU-04, SAU-17; line 7) | The tailnet name from `Self.DNSName`, trailing dot removed (line 18). "At most one rate-limited refresh" of status before rejection (line 18). Criterion 5 (line 30): a fake LocalAPI that switches from logged-out to `Running`, then a request on the new tailnet Host succeeds after one refresh. | `TailscaleStatusService.refresh()` returns the normalised status, with `dnsName` (no dot), `available` and `backendState`. A refresh reads the socket unless a socket read started less than 1000 ms earlier, and then answers from the cache. `localapi-fake.ts` has `use(fixture)` for switching and `hits()` for counting. **Agreement for SAU-18's plan:** its criterion-5 test must leave at least 1000 ms between the start of the last socket read and the request that must trigger the refresh. Otherwise the rate limit answers from the cache, which is intended. Checked against SAU-18 line 30 by the reviser: the criterion asks for success "after one refresh, without restart" and for no repeated refreshes "within the rate limit"; it sets no time bound, so a wait of 1000 ms or more agrees with it, and the second clause is what the 1000 ms interval gives. SAU-18's unit is not changed by this plan. |
| SAU-20 Tailscale UI (`blocked_by` SAU-11, SAU-15, SAU-17; line 7) | The states (unavailable, logged out, waiting for login, running) and the hints (lines 15 and 20). Polling every few seconds (line 17). | `GET` of the route returns a body that passes `tailscaleStatusSchema`. `available` and `backendState` are always present. `magicDNSEnabled` and `httpsCertsEnabled` are booleans whenever `available` is true (rules R4 and R5). `authURL`, `dnsName`, `tailnetURL` and `ownerLogin` are present only when they have a value. At most one socket read per 2000 ms, however many polls. When SAU-20 shows each hint is its own decision. |
| SAU-19 owner allowlist (`blocked_by` SAU-18; line 7) | `ownerLogin` for the auto-seed (line 19). | `ownerLogin` (rule R6). SAU-19 reaches it through SAU-18 (SAU-18 is blocked by SAU-17), so no blocker change is needed. SAU-19 names SAU-17 only in prose, so SAU-17's `unblocks` correctly omits it. |
| SAU-21 tailnet gate (`blocked_by` SAU-18, SAU-19, SAU-20, PLT-15, PLT-16; line 7) | The socket-permission smoke test as the app's UID, with `status` reading successfully (line 17). "Without tailscaled (dev), status reads unavailable" (line 22). "LocalAPI fixture states render correctly (SAU-17, SAU-20)" (line 23). | The client sends only `GET`, so the smoke test needs no write permission. The socket path comes from `SCRIBA_TS_SOCKET`. The five fixtures are the states named in line 23 plus the null-certificates case. SAU-21 is the first place where the field paths of section 9 meet a real tailscaled. |
| SAU-16 setup-flow gate (parallel; line 8) | None. | None. |

Hand-off, not a change: `plans/DECISIONS.md` lines 1524 to 1527 say that SAU-18 must handle the setup status and Continue routes for tailnet callers, because the cookie check alone refuses them. This plan records the same point for the new route. Until SAU-18 lands, the route accepts only the setup cookie, so a tailnet browser gets 401 on it. SAU-18 decides how tailnet callers read it.

## 6. Other draft and planned plans that touch the same files

Rechecked by the reviser at `fef1f47`: the only other plan with status `draft` or `planned` is `GNP-06` (`planned`). `SAU-16`, `TRG-11` and `PST-16` are now `done` and on `main`. Their changes since `6381d5d` touch `apps/api/test/invariant-sweep.ts` (+6 lines, PST-16), `apps/api/test/setup-flow-gate.test.ts`, `apps/api/test/tool-registry-loader-gate.test.ts`, `e2e/specs/journey.e2e.ts` and `project-store`/`tool-registry` sources; none is a file of section 2, and none touches `apps/api/src/modules/setup-auth/`, `create-test-app.ts` or `guard-request.ts`. The planner's notes below are kept as history.

- `PST-16` (now done) changes `apps/api/test/invariant-sweep.ts`: it adds two `FIXTURE_PATHS` entries after lines 117 to 119. This plan does not change that file. The new route has no `:` template, so it needs no entry. **Either order is correct.** The sweeps read every route at run time, so each plan's routes are covered whichever lands first.
- `SAU-16` (planned) changes `e2e/specs/journey.e2e.ts` and adds `apps/api/test/setup-flow-gate.test.ts`. No shared path. Either order.
- `TRG-11` (planned) changes comment lines in `apps/api/src/modules/tool-registry/catalog.service.ts` and adds `apps/api/test/tool-registry-loader-gate.test.ts`. No shared path. Either order.
- `GNP-06` (planned at `fef1f47`; its plan names no path under `apps/api/src/modules/setup-auth/`, no `invariant-sweep.ts` and no `create-test-app.ts`). It changes `packages/packs/nonfiction/entity-types/*`, and adds `apps/api/test/packs/nonfiction-entity-types.test.ts`. No shared path. Either order.

No draft or planned plan changes a file of section 2. No change is needed in either order. Units that are not yet planned (SAU-18, SAU-19, SAU-20) are expected to touch `setup-auth.guard.ts`, the Host policy and the UI. This plan does not touch those files, so their plans can rely on this one's file list.

## 7. Points decided by the reviser

The draft's open points 1 to 8, each checked against the unit, the module file and the repository, and decided as the simplest correct option. None changes a criterion, a unit decision or a settled decision of the module file. None needs `plans/DECISIONS.md`.

1. **Field paths: decided, with a hand-off to SAU-21.** `CertDomains` is read at the root of the payload; `ownerLogin` is `User[String(Self.UserID)].LoginName`; `CurrentTailnet.MagicDNSEnabled`. The reviser checked these key paths on a real tailscaled, read-only (F15): they hold. F15 is the CLI form of the same status object, not a read through the app's socket. **Hand-off:** SAU-21's real-tailnet run must check, through the app's own status endpoint on a `Running` node, that `httpsCertsEnabled` matches the node's `CertDomains` and that `ownerLogin` is the owner's login. This is a note for SAU-21's planner; SAU-21's unit is not changed (its criterion 2 and line 18 cover the run).
2. **Hand-written fixtures: not a conflict with the unit.** The decision (unit line 25, module line 67) is about the double: one small fake socket server that replays fixed `status` payloads, and no other double. "Recorded" is read as "stored and replayed". The unit itself says SAU-17 is built against the fake and the real-tailnet check is SAU-21's (unit line 14). Criterion 2 says "against the fixtures", not "against recordings". The key set of the fixtures follows the real read of F15; the values are invented, so no real login, IP or tailnet name enters the repository. A later change of the fixtures to captured payloads changes only the JSON files, not the rules or the assertions, and touches no other unit. So it is not a point for the Navigator (prompt.md, Navigator: no effect on other units, not expensive to change).
3. **Logged-out fixture: assumption A13.** `logged-out.json` is `NeedsLogin` with an empty `AuthURL` and no `Self.DNSName`. A real tailscaled after `tailscale logout` is assumed to report this. If it reports `Stopped` or `NoState` instead, only the fixture changes: rules R1 to R8 accept every name of `BACKEND_STATES`.
4. **Numbers: kept.** Cache 2000 ms, refresh interval 1000 ms, socket timeout 2000 ms. The unit says only "cached briefly" and "rate-limited". Checked against SAU-18 line 30 (section 5): the criterion has no time bound, so a test that leaves 1000 ms or more before the refresh agrees with it. The socket timeout (2000 ms) is above the invariant sweep's `RESPONSE_CAP_MS` of 1000 ms (`invariant-sweep.ts` line 177); at the cap the sweep resolves the request and does not fail, so a slow real socket does not fail the sweep.
5. **No SAU-17 test of `refresh()`: decided, none.** The unit's three criteria do not name it, and the module allows only external tests (line 65). In this unit nothing calls `refresh()`, so no HTTP test can see it. SAU-18 criterion 5 is its test through HTTP. `refresh()` stays in this unit because the unit's decision (line 22) says so. Step 12 has no mutation for it.
6. **`SCRIBA_TS_SOCKET` in `createTestApp`: checked, left unchanged.** The base env (`create-test-app.ts` lines 77 to 83) does not set it, so other tests use the default `/var/run/tailscale/tailscaled.sock`. `sweepGetHead` sends a GET with the cookie to every GET route (`invariant-sweep.ts` lines 500 to 539), so it calls the new route. Without the socket (this machine has no `/var/run/tailscale`) the answer is `available: false` at once. With a real socket the read is a GET only, changes no library file and publishes no event, so the sweep stays green. The tests of this unit set the socket through the existing `env` option. No helper change is needed.
7. **Route for tailnet callers: recorded.** The route is not `@Public()`. Until SAU-18 lands, the global guard (`setup-auth.guard.ts` lines 45 to 64) accepts only the loopback setup cookie, so a tailnet caller gets 401 `AUTH_REQUIRED`. This matches unit line 23 ("guarded"). SAU-18 decides how tailnet callers read it, as for the status and Continue routes (DECISIONS 2026-11-13, SAU-18 hand-off from SAU-05). SAU-20's criteria use a fake API, so they do not depend on it.
8. **Unknown `BackendState`: `available: false`, kept.** The contract allows only the six names of `BACKEND_STATES` (`tailscale.ts` lines 4 to 11), so a seventh name (for example `InUseOtherUser`) cannot be passed through. The unit's "false when the socket is missing or the call is refused" (line 22) gives the cases where `available` must be false; it does not say "only then". `NoState` with `available: false` is what the contract comment (line 18) prescribes for "not available". So R1 agrees with the unit and the contract.

## 8. Facts checked

Checked at `6381d5d`, by reading the file or the line named. None of these commands changed the repository.

- **F1. Unit.** `units/SAU-17-localapi-client-status.md`: lines 2 to 9 front matter (`blocked_by: [SAU-08]`, `parallel_with: [SAU-09, SAU-10, SAU-16]`, `unblocks: [SAU-18, SAU-20]`); line 14 (fake socket); line 17 (Why); lines 20 to 25 (Decisions); lines 28 to 30 (three criteria).
- **F2. Module.** `modules/setup-auth.md`: line 7 (LocalAPI client may start once `phase:token-guard` closes); line 27 (graph node); line 36 (SAU-17 parallel with SAU-09 and SAU-10); line 41 (in-process exports); line 43 (no SSE); line 44 (identity display only); lines 46 to 47 (settled decisions, none about the LocalAPI); lines 65 to 69 (testing principles, LocalAPI seam at line 67); line 78 (userspace and auth key out of scope).
- **F3. Blocker tables.** `units/README.md` line 64 (`blocked_by` is the source of truth; `unblocks` is its exact inverse); line 90 (`phase:tailnet`, SAU-17 to SAU-21, gate SAU-21).
- **F4. Downstream units.** `units/SAU-18-tailnet-guard-path.md`: line 7; line 18 (Host allowlist, one rate-limited refresh); line 30 (criterion 5). `units/SAU-20-tailscale-ui.md`: line 7; lines 15 to 17 (states, hints, polling); lines 20 to 22 (criteria). `units/SAU-19-owner-allowlist.md`: line 19 (`ownerLogin` seed); `blocked_by: [SAU-18]`. `units/SAU-21-tailnet-gate.md`: line 17 (socket smoke test); line 22 (unavailable in dev); line 23 (fixture states from SAU-17 and SAU-20). `units/SAU-16-setup-flow-gate.md` line 8 and `units/SAU-09-setup-flow-api.md` line 8 and `units/SAU-10-compose-version-status.md` line 8 (parallel with SAU-17; none blocked by it).
- **F5. Status and blocker of SAU-08.** `plans/SAU-08.md` line 3 `status: done`; section 1, item 18 (small choices recorded in the plan, not in DECISIONS); section 7, F14 (token store writes `.scriba/setup-url` at boot, lines 101 to 109; read there, not re-read by the planner).
- **F6. Contract.** `packages/contracts/src/setup-auth/tailscale.ts`: lines 4 to 11 (`BACKEND_STATES`, six names); line 13 (`backendStateSchema`); line 16 (`DNS_NAME_PATTERN`, which refuses a trailing dot); line 18 (comment on `NoState`); lines 19 to 28 (`tailscaleStatusSchema`); lines 30 to 31 (types). `routes.ts` lines 11 to 12 (`TAILSCALE_STATUS_ROUTE`). `examples.ts` lines 13 to 27 (`tailscaleNeedsLogin`, `tailscaleRunning`, `tailscaleUnavailable`). `plans/SAU-01.md` line 99 (a `dnsName` with a trailing dot is rejected by the schema, so rule R3 must strip it); line 130 (the LocalAPI mapping is SAU-17's); line 34 (the six route paths were assumed in SAU-01).
- **F7. Existing guard and controllers.** `apps/api/src/modules/setup-auth/setup-auth.module.ts`: lines 1 to 18 (imports), 26 to 32 (`@Module`, imports and controllers), 33 to 53 (providers, including `APP_GUARD`), 54 (exports). `setup-auth.guard.ts` lines 45 to 76 (default deny; public check 47 to 52; cookie 53 to 57; 401 at 58 to 64; Origin for mutations at 65 to 74). `setup-status.controller.ts` lines 15 to 26 (`@Controller()`, `@Get`), 37 to 46 (cookie check). `setup-flow.controller.ts` lines 16 to 17 (the guard covers the routes; no cookie check repeated). `setup-status.service.ts` line 53 (`@Inject(SCRIBA_ENV) private readonly env: ScribaEnv`).
- **F8. Environment.** `apps/api/src/modules/platform/platform.module.ts` line 13 exports `SCRIBA_ENV` and `ScribaEnv`. `apps/api/src/app.module.ts` lines 42 to 43 provide and export `SCRIBA_ENV`. `apps/api/src/modules/platform/boot/env.ts` line 22 (`SCRIBA_TS_SOCKET` in `ScribaEnv`) and lines 117 to 122 (read with a default). `packages/contracts/src/platform/env.ts` line 5 (`SCRIBA_PORT` `'8080'`) and line 15 (`SCRIBA_TS_SOCKET` default `/var/run/tailscale/tailscaled.sock`).
- **F9. Compose and ST-1 facts.** `deploy/compose.yaml` line 15 (`TS_SOCKET` on the sidecar), lines 8 to 10 (optional `.secret`), line 37 (shared volume on the sidecar), line 53 (`SCRIBA_TS_SOCKET` on `scriba`), line 56 (the volume read-only on `scriba`), line 72 (the volume). `deploy/RUNBOOK.md` line 29: the script reads `/localapi/v0/status` over the socket with `Host: local-tailscaled.sock`, and prints `BackendState` and `Self.DNSName` (trailing dot removed) and `Self.TailscaleIPs`, with guards for a missing `Self`. `plans/DECISIONS.md` line 976 (`Self.DNSName` ends with a dot; `TailscaleIPs` may be null while `NeedsLogin`); line 1072 (`NeedsLogin` with empty DNS and IP fields); line 1784 (`CertDomains` null on the installer node); `plans/PLT-16.md` line 277 (installer node: `BackendState` `Running`, `MagicDNSSuffix`, `CertDomains` null) and line 303 (`scriba` node: `Running`, `CertDomains` non-empty). `plans/PLT-15.md` line 78 and `plans/DECISIONS.md` line 796 (SAU-17 lines 21 and 22 are the source of `httpsCertsEnabled`). `plans/PLT-15.md` lines 292 to 298 and `plans/DECISIONS.md` line 904 (PLT-15 criterion 3: the non-root UID reads the status over the shared socket; the process-UID proof is 1001 and 1001).
- **F10. Test helpers.** `apps/api/test/create-test-app.ts`: line 65 (`createTestApp`), lines 77 to 84 (base env, `...options.env` last; no `SCRIBA_TS_SOCKET` in the base), line 88 (`listen(0, '127.0.0.1')`), lines 102 to 113 (the app's `close` removes an owned library only). `apps/api/test/guard-request.ts`: line 27 (`send`, explicit Host), lines 80 to 98 (`sessionCookie(app, libraryDir)`, Host `127.0.0.1:8080` at line 88).
- **F11. Invariant sweeps.** `apps/api/test/invariant-sweep.ts`: line 4 (a template with `:` or `{` needs a `FIXTURE_PATHS` entry), the fixed public set `FIXED_PUBLIC_ROUTES` (line 59 at `fef1f47`: healthz, handshake, identity, SPA fallback), line 73 (`FIXTURE_PATHS`), line 177 (`RESPONSE_CAP_MS` 1000), line 500 (`sweepGetHead`, with the cookie), line 646 (`sweepMutations`, which enumerates `app.routes()` and expects 401 without a credential for every route outside the fixed set). The new GET route is therefore swept by both.
- **F12. Test and lint configuration.** `apps/api/vitest.config.mts` line 8 (`include: ['test/**/*.test.ts']`). `apps/api/tsconfig.json` (`types: ["node"]`, `include: ["src", "test"]`). `apps/api/package.json` (zod `^4` dependency; `@types/node` in dev dependencies; `build` and `test` scripts). Root `package.json`: `lint` runs `prettier --check .`. Root `.prettierignore` lists `/units/`, `/modules/`, `/plans/`, `/package-lock.json` and `/apps/api/test/fixtures/lint/`, so the JSON fixtures are checked by Prettier. `scripts/examples-check/m1.mjs` lines 201 to 222 (`checkTestFiles`, `namesExamples`).
- **F13. Files this plan does not touch.** A grep on `6381d5d` for `tailscale`, `localapi` and `TAILSCALE_STATUS_ROUTE` lists about 40 files in `apps/api`, `packages/contracts`, `apps/web`, `e2e`, `scripts` and `deploy`. Of these, this unit changes only the files of section 2. The `apps/web/src/app/features/setup-auth/` files are SAU-20's. `apps/api/test/tailnet-*.test.ts` and `tailnet-filter.test.ts` test the PLT-08 filter, and `apps/api/test/setup-auth-guard.test.ts` line 281 tests the identity header: not affected. `apps/api/test/setup-auth-*.test.ts`: none is named `setup-auth-localapi`, so the new name is free.
- **F14. Plan statuses at `6381d5d`.** `SAU-08` done. `SAU-16`, `TRG-11`, `PST-16` and `GNP-06` planned. No `plans/SAU-17.md` existed before this file. `git log main` shows that the commits from `c43080e` to `6381d5d` change only `plans/` files (`GNP-06.md`), so the code facts above hold at `6381d5d`.
- **F15. Real status key paths (reviser, 2026-11-16).** A read-only `docker exec installer-tailscale-1 tailscale status --json`, with only key names and types printed: root keys include `AuthURL`, `BackendState`, `CertDomains` (a list on this read), `CurrentTailnet`, `Self`, `User`; `BackendState` `Running`; `Self.DNSName` ends with a dot; `Self.UserID` is an integer; `CurrentTailnet` has `MagicDNSEnabled`, `MagicDNSSuffix`, `Name`; `User` is keyed by decimal strings and each entry has `LoginName`; `String(Self.UserID)` is a key of `User`. No value was recorded.
- **F16. Revision recheck at `fef1f47`.** `git diff 6381d5d fef1f47` touches no file of section 2 and nothing under `apps/api/src/modules/setup-auth/`, `create-test-app.ts`, `guard-request.ts` or `packages/contracts/`. The lines cited in F6, F7, F8 and F10 were reread and hold (`create-test-app.ts` base env lines 77 to 83, `...options.env` at line 83). `plans/SAU-22.md` to `plans/SAU-26.md` and the matching unit files do not exist; no split was made.

## 9. Facts assumed

Not checked by any command, and not in the repository. Each is named so that the reviser or SAU-21 can test it.

- **A1. LocalAPI field paths.** `CertDomains` is at the root of the status object. `Self.UserID` is a number. `User` is an object keyed by the user ID as a string, and each entry has `LoginName`. `CurrentTailnet` is an object with `MagicDNSEnabled`, or null when logged out. `Self` may be null when logged out. These are the planner's reading of the Tailscale status type. Partly supported by F9 (the script's field names, the `CertDomains` observation, the `Self` guard). **Checked by the reviser (F15)** for the key paths: `CertDomains` at the root, `CurrentTailnet.MagicDNSEnabled`, `Self.UserID` an integer, `User` keyed by decimal strings with `LoginName`. Not checked: `CurrentTailnet` and `Self` being null when logged out (the rules accept both). Section 7, point 1.
- **A2. Fixture values.** The fixture values (IPs, `scriba-1.tail1234.ts.net`, `ada@example.com`, the login URL) are invented in the shape of A1. They are not recorded from a real tailnet.
- **A3. Real tailscaled responses.** A real `NeedsLogin` with `AuthURL` and a real `Running` payload have the keys of the fixtures. Not checked in this repository; SAU-21 is the first real check.
- **A4. macOS socket path length.** A Unix-socket path of up to about 104 bytes works on macOS and Linux, with the temp folder from `tmpdir()` plus `lapi-XXXXXX/ts.sock`. Not run.
- **A5. Node 26 `http` with `socketPath`.** The Node client with `socketPath`, `agent: false` and a request timeout behaves as Node documents. Not run.
- **A6. Default socket in the test environment.** On CI and on the developer's machine, `/var/run/tailscale/tailscaled.sock` does not exist, so the default case is `available: false`. Checked on the reviser's machine (no `/var/run/tailscale`); not checked on CI. Section 7, point 6.
- **A7. Cookie flow.** `sessionCookie` works on a fresh library, as `plans/SAU-08.md` section 4 and `guard-request.ts` show. Not run in this planning pass.
- **A8. Test run times.** Five app boots (T2) and one 2.1 s wait (T3) fit in the test timeouts: T2 has its own 60000 ms timeout (section 4.4); T3 uses the default 20000 ms (`vitest.config.mts` line 9). Not timed.
- **A9. Prettier and fixtures.** Prettier formats the JSON fixtures with no conflict with the examples-check rule. Not run.
- **A10. The planner's values.** The cache, refresh and timeout numbers (section 7, point 4) are chosen by the planner, not fixed by any document.
- **A11. No `ownerLogin` for a tagged device.** A device with no user (tagged) has `UserID` 0 or no `User` entry, so `ownerLogin` is absent. From the unit's own remark that tagged devices get no user identity (unit SAU-18 line 20). Not checked.
- **A12. Repository state.** `main` is `fef1f47` at revision (`6381d5d` at drafting), and the uncommitted change to `units/SAU-12-providers-step.md` is not part of this work and is left as it is.
- **A13. Logged-out state (section 7, point 3).** After an explicit logout, tailscaled reports `NeedsLogin` with an empty `AuthURL` until a login is started, and no `Self.DNSName`. Not checked: the real node is logged in. Only the fixture depends on it.

## 10. Revision notes (Opus, 2026-11-16)

- Section 7: the eight open points are decided; none needs the Navigator, and no unit changes.
- Section 1, item 7: the reading of "recorded payloads" is stated.
- Section 3, step 1: the orchestrator makes the worktree, as prompt.md says.
- Section 4.4, T2: its own 60000 ms timeout, because it boots five apps.
- Section 5: the 1000 ms agreement is checked against SAU-18 line 30.
- Section 6 and F11: rechecked at `fef1f47` (SAU-16, TRG-11 and PST-16 are done; only GNP-06 is planned; the sweep's line numbers moved).
- F15, F16 and A13 are new; A1, A6, A8 and A12 are updated.

## Review parts

One part. The plan is small: three new source files, one module edit, one fake server, five fixtures and one test file.

- **Part 1 (the whole plan).** Steps 1 to 18 of section 3; the files of section 2; tests T1 (criterion 1), T2 (criterion 2) and T3 (criterion 3) of section 4.4; mutations M1 to M5 of section 4.5. The reviewer also checks that the diff changes only the files of section 2.
