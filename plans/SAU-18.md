---
id: SAU-18
status: draft
unit: units/SAU-18-tailnet-guard-path.md
sources: units/SAU-18-tailnet-guard-path.md (committed, unchanged); modules/setup-auth.md (main's line numbers); units/README.md; units/SAU-19-owner-allowlist.md; units/SAU-20-tailscale-ui.md; units/SAU-21-tailnet-gate.md; units/SAU-16-setup-flow-gate.md; plans/SAU-03.md, SAU-04.md, SAU-05.md, SAU-06.md, SAU-07.md, SAU-16.md, SAU-17.md, PLT-02.md (structure), PLT-08.md, PLT-16.md; plans/DECISIONS.md (searched for SAU-18, SAU-17, SAU-04 and setup-auth; lines 929, 1050, 1524-1527, 2083, 2870); docs/adr/0001-tailscale-serve-mechanism.md; the apps/api code and tests named in section 2
---

# SAU-18 plan — tailnet guard path (draft)

Base: `main` at `bf4a6ab`. Revision 1, draft.

Uncommitted files, read but not changed and not on main: `modules/setup-auth.md` (modified), `units/README.md` (modified), `units/SAU-22-guard-dev-mode.md` (untracked). Line numbers of `modules/setup-auth.md` below are main's (`git show HEAD:`). The working copy is two lines longer from line 32 on, because of the uncommitted SAU-22 edit.

## 2. Facts checked and facts assumed

Checked facts carry a file and line on main. Assumed facts are marked A.

- **C1 The guard trusts a verified cookie on any admitted Host.** `apps/api/src/modules/setup-auth/setup-auth.guard.ts:53-57` verifies the cookie without reading Host and sets `req.identity` (`:57`). The credential refusal is `:58-64` (401). The Origin check is `:65-74`, using `policy.originFor` at `:66`.
- **C2 The Host allowlist is a synchronous map with no tailnet entry.** `request-policy.ts:13-24` builds it from `SCRIBA_PORT` and `SCRIBA_DEV_ORIGINS`. `originFor` is `:21-23`. `parseDevOrigins` is `:33-44`.
- **C3 There are two policy instances.** `apps/api/src/bootstrap.ts:36` builds one for the hook. `setup-auth.module.ts:52-56` builds another for the guard.
- **C4 The Host check is synchronous.** `host-frame.middleware.ts:25-47`, with the check at `:33`. Registered at `bootstrap.ts:50-52`, before `init()` at `:54`.
- **C5 `TailscaleStatusService` (SAU-17) is built.** `tailscale-status.service.ts:11` sets the 2000 ms cache. `:13` sets the 1000 ms refresh interval. `status()` is `:85-89`. `refresh()` is `:91-96`, and its comment names SAU-18 (`:91`). `read()` is `:102-108`. A failed read becomes UNAVAILABLE (`:106`), so no call rejects.
- **C6 Normalisation.** `dnsName` comes from `Self.DNSName` with the trailing dot removed (`:57-62`), in any backend state. `backendState` is validated (`:47-48`). The fixture `logged-out.json` has `NeedsLogin` and an empty `DNSName`. The fixtures `running-*.json` have `Running` and `scriba-1.tail1234.ts.net.`. The state gate is therefore new work for SAU-18.
- **C7 The contracts already carry what SAU-18 needs.** `packages/contracts/src/setup-auth/identity.ts:5-8` has the tailnet member. `errors.ts:7` has `TAILNET_IDENTITY_MISSING`, with status 403 at `:19`. `errors.ts:8` and `:20` hold `AUTH_TAILNET_NOT_ALLOWED`, which is SAU-19's. `tailscale.ts:4-11` lists `BACKEND_STATES`, and `:19-28` holds `tailscaleStatusSchema`. No contract change is needed.
- **C8 Cookie helpers.** `setup-session.cookie.ts:7-11` is `isLoopbackHost`, and `:24-37` is `cookieValue`. The handshake sets the cookie only on a loopback Host (`setup-session.controller.ts:91-97`).
- **C9 The identity route** (`setup-session.controller.ts:103-118`) checks the loopback Host and the cookie inside the handler (`:110`), and returns `{via: 'loopback'}` (`:117`).
- **C10 Status and Continue check the cookie in their controller.** `setup-status.controller.ts:36-46` (`requireSession`), called from `:24` and `:32`. This is the SAU-05 hand-off in `plans/DECISIONS.md:1524-1527`.
- **C11 The other controllers have no cookie check.** `tailscale-status.controller.ts:13-16` (its comment at `:8` says the global guard covers it). `setup-flow.controller.ts` has no `cookieValue`.
- **C12** `request-identity.ts:4-8` is `RequestIdentity`, which returns `req.identity`.
- **C13 Binding.** `apps/api/src/main.ts:8` binds `0.0.0.0:8080`, so peers are plain IPv4. `apps/api/test/create-test-app.ts:90` binds `127.0.0.1`, and `baseUrl` is set at `:92`. The options interface is `:9-14`.
- **C14 Test helpers.** `apps/api/test/guard-request.ts:29` sends `Host` exactly as given. `sessionCookie` is `:80-98`. `apps/api/test/localapi-fake.ts`: `use()` is `:59-61`, `hits()` is `:62`, and every request is counted at `:35`.
- **C15 Existing tests that stay green.** `apps/api/test/setup-auth-guard.test.ts` criterion 4 at `:281-317` (a loopback header gives 401). Criterion 6 at `:413-483` (identity without a cookie on loopback gives 401). `FOREIGN_HOSTS` at `:34-39` includes `scriba:8080` and `127.0.0.1`, and both must stay refused.
- **C16** `apps/api/src/modules/platform/events/echo.controller.ts:15-16` is `POST` with 202. It is the mutation probe.
- **C17** `apps/api/src/modules/platform/tailnet/tailnet-filter.ts:14-21` destroys sockets from `100.64.0.0/10` and `fd7a:115c:a1e0::/48` (`tailnet-address.ts:4-6`). Serve's proxied connections are not in those ranges.
- **C18 ST-1 outcome.** The published-path peer is the Docker gateway `172.22.0.1`, not loopback (`plans/PLT-16.md:199`). The Serve-path peer is `127.0.0.1` (`plans/PLT-16.md:201` and `:226`; `docs/adr/0001-tailscale-serve-mechanism.md` lines 29-35). The dedicated-listener fallback (unit line 19; module line 47) is not triggered on the measured setup.
- **C19 Plan facts.** SAU-04 decision 5 is the exact-string Host rule (`plans/SAU-04.md:17`). SAU-04 decision 21 names the extension points (`:33`). SAU-04 decisions 10 and 11 cover refusal shapes. SAU-17 `:16`, `:241` and `:243`: `refresh()` exists for SAU-18, and the tailnet-caller route is left to SAU-18. SAU-03 `:149`: no test for the tailnet Host handshake. SAU-06 `:266`: the Shell sends only 401s to `/setup`.
- **C20 In-flight work.** The only plan whose front matter says `draft` or `planned` is `plans/TRG-14.md`. Every unmerged unit branch (`unit/TRG-14`, `unit/TRG-05-*`, `unit/SAU-11-*`) has an empty diff against `main` for the nine files in section 4 (`git diff --stat main...<branch> -- <files>`).
- **C21 The untracked SAU-22 draft** changes `SetupAuthGuard.canActivate`, the policy builder (`devAuth`) and `env.ts` (`units/SAU-22-guard-dev-mode.md:18-21`). This plan does not plan around it (section 8).
- **C22 Unit text.** `units/SAU-18-tailnet-guard-path.md` decisions are at lines 18-23. Criteria are at lines 26-30, quoted in section 6.
- **C23 Scripts.** `apps/api/package.json:6-8`: `test` is build then vitest. Root `package.json:23-25` builds contracts first.
- **C24 Downstream units.** SAU-19 lines 19-22 (seeding, `AUTH_TAILNET_NOT_ALLOWED`, loopback cookie ignores the allowlist). SAU-21 line 18 (Serve peer check), line 22 (tailnet Host not allowed when unavailable), line 24 (criterion 3 names the SAU-18 tests), line 26 (late login). SAU-20 lines 15-17 (status polling; no API change named).

Assumed facts:

- **A1** Serve injects `Tailscale-User-Login` only for proxies to localhost and strips client copies (unit line 19; SAU-21 line 18). Verified only on a real tailnet, in SAU-21.
- **A2** Tailscale names are lower case, so an exact string match on Host is enough (as SAU-04 decision 5 does for loopback).
- **A3** Node reports `127.0.0.1` for a loopback connection, and the interface IPv4 address for a connection from another interface to a server bound on `0.0.0.0`. Neither is an IPv4-mapped IPv6 form.
- **A4** One status read per unknown Host, cached for 2 s, is acceptable load for one owner's node. Socket reads for refresh are bounded to one per second by C5.
- **A5** A wait of 1100 ms exceeds the 1000 ms refresh window plus timer jitter.
- **A6** A non-internal IPv4 interface exists on the machine that runs the criterion 2 test (open point 1).

## 3. Decisions the plan obeys

- **D1 Tailnet entry** (unit line 18; C5, C6). A Host is a tailnet Host when status has `available: true`, `backendState` `Running`, and a `dnsName`, and the Host equals `dnsName` or `dnsName:443` exactly. Every other state gives loopback entries only. This plan reads "logged out" as any state other than `Running`. An unknown Host triggers at most one `refresh()` (`tailscale-status.service.ts:91-96`, the SAU-17 rate limit) before rejection.
- **D2 Peer rule** (unit line 19; module line 47). The header is trusted only when the Host is a tailnet Host and `req.socket.remoteAddress` is exactly `127.0.0.1` or `::1`. An untrusted header is treated as absent (open point 5). The dedicated listener is not built (C18).
- **D3 Missing identity** (unit line 20; C7). A tailnet Host with no trusted header gets 403 `AUTH_TAILNET_IDENTITY_MISSING`. The message is "Sign this device in to Tailscale as a user (a tagged device has no user identity)." It matches the wording of SAU-06's explanation (`plans/SAU-06.md:94`).
- **D4 Cookie is a credential only on a loopback Host** (unit line 21; module line 60; SAU-03 decision 10, `plans/SAU-03.md:22`). The guard checks `isLoopbackHost` before it accepts a cookie. This closes the gap in C1.
- **D5 Origin on tailnet mutations** (unit line 22). The expected origin is `https://<dnsName>`, compared exactly, so the scheme is compared. A `:443` Host gets the same origin. A refusal is 403 `AUTH_ORIGIN_REJECTED`.
- **D6 Identity** (unit line 23; C7). The guard attaches `{via: 'tailnet', login}`. The identity route returns it, and `RequestIdentity` reads it.
- **D7 Guarded controllers use the guard's identity** (SAU-05 hand-off, `plans/DECISIONS.md:1524-1527`; C10). `requireSession` and the identity route accept "the guard attached an identity", not "a cookie verifies". This closes the hand-off, and the status and Continue routes accept tailnet callers.
- **D8 "A tailnet request"** (unit line 20; criterion 4, read literally). Every request on a tailnet Host, except `/healthz`, without a trusted identity gets 403, public routes included (open point 2).
- **D9 Module invariants** (module lines 3, 41, 44, 47). Default-deny guard. Host check before the body parser. `frame-ancestors 'none'`. No CORS. Identity is for display and logs only: the login is attached and never used to partition data.
- **D10 Test seam** (module lines 65-69; SAU-04 decision 18). External behaviour only, through `createTestApp`, which boots the composed app. The fake LocalAPI socket is the only Tailscale double.
- **D11 One policy instance** (C3). The hook takes the policy from the Nest container, so the hook and the guard share it.
- **D12 Early BootError kept** (SAU-04 decision 7). `checkDevOrigins(env.SCRIBA_DEV_ORIGINS)` runs before `NestFactory.create`, so a bad value still exits before any Nest code.
- **D13 Simplest choices, recorded.** Names: `admit`, `HostEntry`, `TailnetSource`, `checkDevOrigins`, `listenHost`. No new production file. One new test file. Test names begin with `criterion N:`. The guard's `canActivate` becomes `async`.
- **D14 Peer match is exact** (unit line 19). The IPv4-mapped form `::ffff:127.0.0.1` is not added, because C13 shows the listeners bind IPv4 only. If a later bind uses `::`, the rule must accept the mapped form too. Noted, not built.
- **D15 Order of checks.** The identity step comes before the Origin check, so a mutation is first checked for identity and then for Origin.

The logic, in prose and in outline:

- `admit(host)`: `undefined` for a missing Host. A static loopback or dev entry, if one matches. Otherwise `tailnetEntryFor(await source.status(), host) ?? tailnetEntryFor(await source.refresh(), host)`. `tailnetEntryFor` applies D1.
- Hook: set the CSP header. For every path except `/healthz`, if `await policy.admit(host)` is `undefined`, answer 403 `AUTH_HOST_REJECTED` as today. Otherwise call `next()`.
- Guard, `canActivate` (async): `entry = await policy.admit(host)`. `tailnet = entry?.tailnet === true`. If `tailnet`, the identity is `{via: 'tailnet', login}` when the header is a non-empty string and the peer is `127.0.0.1` or `::1`. Otherwise the identity is `{via: 'loopback'}` when `isLoopbackHost(host)` and the cookie verifies. Attach the identity when there is one. If the path is not `/healthz`: throw 403 `AUTH_TAILNET_IDENTITY_MISSING` when `tailnet` and there is no identity; throw 401 `AUTH_REQUIRED` when not `tailnet`, not public, and there is no identity. For a mutation, the expected origin is `entry?.origin`. Throw 403 `AUTH_ORIGIN_REJECTED` when it is missing or differs from the Origin header.

## 4. Files to change

Only these paths change. Nothing else is staged.

| # | Path | New or modified | Change |
|---|---|---|---|
| 1 | `apps/api/src/modules/setup-auth/request-policy.ts` | modified | Adds the interface `TailnetSource` (`status()` and `refresh()`; `TailscaleStatusService` satisfies it structurally), `HostEntry {origin, tailnet}`, and `RequestPolicy.admit(host)` in place of the sync `originFor`. Adds `tailnetEntryFor(status, host)` (D1). `buildRequestPolicy(env, tailnet)` keeps the loopback and dev map, then the status and refresh steps. Exports `checkDevOrigins(raw)`, which calls the existing `parseDevOrigins`. `REQUEST_POLICY` and `requestPath` are unchanged. |
| 2 | `apps/api/src/modules/setup-auth/host-frame.middleware.ts` | modified | `hostFrameMiddleware(policy)` returns an async handler. The CSP line and the refusal body are unchanged. The Host check awaits `policy.admit`. |
| 3 | `apps/api/src/modules/setup-auth/setup-auth.guard.ts` | modified | `canActivate` returns `Promise<boolean>`. Implements D1 to D8 and D15. `GuardRequest` gains `socket: {remoteAddress?: string}` and the `tailscale-user-login` header. |
| 4 | `apps/api/src/modules/setup-auth/setup-auth.module.ts` | modified | The `REQUEST_POLICY` factory becomes `inject: [SCRIBA_ENV, TailscaleStatusService]` and `useFactory: (env, tailnet) => buildRequestPolicy(env, tailnet)`. Nothing else. |
| 5 | `apps/api/src/modules/setup-auth/setup-status.controller.ts` | modified | `getStatus` and `continueSetup` take `@RequestIdentity() identity`. `requireSession` throws 401 `AUTH_REQUIRED` ("Not signed in.") when there is no identity. Remove the cookie import and the signer dependency if they become unused. |
| 6 | `apps/api/src/modules/setup-auth/setup-session.controller.ts` | modified | The identity route takes `@RequestIdentity()`. Without an identity it throws 401 ("Not signed in."); with one it returns it. The handshake is unchanged. |
| 7 | `apps/api/src/bootstrap.ts` | modified | `checkDevOrigins(env.SCRIBA_DEV_ORIGINS)` replaces the `buildRequestPolicy(env)` line (D12). After `create`, when `SetupAuthModule` is included, `app.use(hostFrameMiddleware(app.get<RequestPolicy>(REQUEST_POLICY)))` (D11). |
| 8 | `apps/api/test/create-test-app.ts` | modified | Adds an optional `listenHost` to `TestAppOptions`, default `127.0.0.1`, used in `app.listen(0, …)`. `baseUrl` stays on `127.0.0.1`. The change is additive. |
| 9 | `apps/api/test/setup-auth-tailnet.test.ts` | new | The five criterion tests in section 6. |

Not changed: `request-identity.ts`, `setup-session.cookie.ts`, `tailscale-status.service.ts`, `localapi-client.ts`, `localapi-fake.ts`, `guard-request.ts`, `setup-auth.section.ts`, `apps/api/src/modules/platform/**`, `packages/contracts/**`, every existing test file, `units/**`, `modules/**`, and every plan other than `plans/SAU-18.md`.

## 5. Procedure

1. Create the branch in its own worktree, so the uncommitted files in the main worktree are left alone: `git worktree add ../scriba-prototype-wt/SAU-18 -b unit/SAU-18 main`. Work only there.
2. Record a baseline. Run `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-api`. Record the file and test counts. Expected: all pass.
3. Edit `request-policy.ts` (table row 1), following D1, D12 and D13.
4. Edit `host-frame.middleware.ts` (row 2). It becomes async and awaits `admit`.
5. Edit `setup-auth.guard.ts` (row 3). Follow the outline in section 3.
6. Edit `setup-auth.module.ts` (row 4).
7. Edit `setup-status.controller.ts` and `setup-session.controller.ts` (rows 5 and 6). Use `@RequestIdentity()`. The cookie is no longer read in either controller.
8. Edit `bootstrap.ts` (row 7). The `checkDevOrigins` call must stay before `NestFactory.create`.
9. Edit `create-test-app.ts` (row 8). Add the option and nothing else.
10. Write `setup-auth-tailnet.test.ts` (row 9), with the five tests of section 6.
11. Run `npm run build -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-api`. Expected: the five new tests pass, and every pre-existing test passes with no edit. Pre-existing guard tests that must stay green: criteria 1 to 7, the extra `it`, the malformed dev origin test, and the LocalAPI, status, handshake, token, section and logs tests.
12. Run `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api`. Expected: exit 0.
13. Run `git diff --name-only main -- apps/api/test`. Expected: `create-test-app.ts` and `setup-auth-tailnet.test.ts` only. Run `git diff --name-only main` for the whole change. Expected: the rows of section 4 only.
14. Stop and report if criterion 2 cannot find a non-internal IPv4 interface (open point 1), or if any pre-existing test needs an edit.
15. Commit in the worktree with `feat(SAU-18): tailnet guard path`, staging only the section 4 paths.

## 6. Tests for the acceptance criteria

There is one test per criterion. The file is `apps/api/test/setup-auth-tailnet.test.ts`. Each test boots `createTestApp` with `SCRIBA_TS_SOCKET` set to a fake LocalAPI socket, except where the table says otherwise. The tailnet name is `scriba-1.tail1234.ts.net`, the name in the `running-certs` fixture. The login is `ada@example.com`. Loopback requests use `Host: 127.0.0.1:8080`.

| Criterion (unit lines 26 to 30, verbatim) | Test name | File | What it asserts |
|---|---|---|---|
| 1. "On the tailnet Host with an injected login from a loopback peer, API calls succeed with no cookie." | `criterion 1: on the tailnet Host with a login from a loopback peer, version, identity, setup status and an https-Origin echo POST succeed with no cookie` | `apps/api/test/setup-auth-tailnet.test.ts` | Fake `running-certs`. No cookie is sent. GET `VERSION_ROUTE` on the tailnet Host with the login header gives 200. GET `IDENTITY_ROUTE` gives 200 with body `{via: 'tailnet', login: 'ada@example.com'}`. GET `SETUP_STATUS_ROUTE` gives 200. POST `ECHO_ROUTE` with `Origin: https://scriba-1.tail1234.ts.net` gives 202. |
| 2. "The same header on a loopback Host is ignored (401); on the tailnet Host from a non-loopback peer it isn't trusted." | `criterion 2: the header is ignored on a loopback Host (401), and from a non-loopback peer on the tailnet Host it is not trusted` | same | This test uses `createTestApp` with `listenHost: '0.0.0.0'`, and the fake `running-certs`. The non-loopback address is the first non-internal IPv4 address from `os.networkInterfaces()`. Assertions: (a) GET `VERSION_ROUTE`, Host `127.0.0.1:8080`, login header, no cookie, sent to `127.0.0.1`: 401 `AUTH_REQUIRED`. (b) The same request on the tailnet Host, sent to the non-loopback address: 403 `AUTH_TAILNET_IDENTITY_MISSING` (open point 5). (c) Control: the same tailnet request sent to `127.0.0.1` gives 200, so (b) is caused by the peer rule. |
| 3. "A tailnet POST with an `http://` Origin gets 403." | `criterion 3: a tailnet POST with an http:// Origin gets 403 AUTH_ORIGIN_REJECTED, and the https:// control gets 202` | same | POST `ECHO_ROUTE` with the tailnet Host, the login header, no cookie, and `Origin: http://scriba-1.tail1234.ts.net`: 403 `AUTH_ORIGIN_REJECTED`. Control: the same request with `Origin: https://scriba-1.tail1234.ts.net`: 202. |
| 4. "A tailnet request with no header gets `AUTH_TAILNET_IDENTITY_MISSING`." | `criterion 4: a tailnet request with no login header gets 403 AUTH_TAILNET_IDENTITY_MISSING, with or without a valid loopback cookie, and the header control gets 200` | same | GET `VERSION_ROUTE` on the tailnet Host with no header and no cookie: 403, code `AUTH_TAILNET_IDENTITY_MISSING`, `content-security-policy` `frame-ancestors 'none'`, and a message matching `/Sign this device in to Tailscale as a user/`. The same request with a valid cookie from `sessionCookie(app, library)` gives the same 403, which shows that the cookie is not a credential on the tailnet Host. Control: with the login header, 200. |
| 5. "With the fake LocalAPI switching from logged-out to `Running`, a request on the new tailnet Host succeeds after one refresh, without restart; repeated unknown Hosts don't cause repeated refreshes within the rate limit." | `criterion 5: after the fake LocalAPI moves from logged-out to Running, the tailnet Host is admitted after one refresh with no restart, and repeated unknown Hosts cause no socket reads within the window` | same | Fake `logged-out`. (a) GET on the tailnet Host with the login header gives 403 `AUTH_HOST_REJECTED`. (b) Three GETs on `other.tail1234.ts.net` with the login header give 403 each, and the fake's `hits()` does not change. (c) `fake.use('running-certs')`, then wait 1100 ms. The GET on the tailnet Host with the login header gives 200, and `hits()` rises by exactly 1. |

## 7. Agreement with the downstream and parallel units

- **SAU-19 owner allowlist (blocked by SAU-18).** Needs the tailnet login on the request, set by the guard before the route runs, in the guard's tailnet branch. SAU-18 provides it through D6 and the identity step (section 4, row 3). SAU-19 adds its refusal (`AUTH_TAILNET_NOT_ALLOWED`, already in `errors.ts:8` and `:20`) in that same branch. `ownerLogin` comes from SAU-17 (`tailscale-status.service.ts:68-71`), unchanged. The loopback branch is untouched, so loopback cookie access ignores the allowlist, as SAU-19 line 22 requires.
- **SAU-21 tailnet gate (blocked by SAU-18).** Its criterion 3 (line 24) names the SAU-18 tests, which are tests 1, 2 and 3 here. Its criterion 1 (line 22) needs a tailnet Host refused while Tailscale is unavailable. That follows from D1, because no entry is made unless the state is `Running`. Its late-login criterion (line 26) is test 5. Its Serve check (line 18) needs the peer rule of D2, which SAU-18 provides, and the fallback is not built (open point 1 is about test seams, not the fallback). If the real tailnet disproves the peer assumption, SAU-21 applies the fallback. That is a change in the listener and in the rule, outside this plan.
- **SAU-20 Tailscale UI (parallel).** Uses the status endpoint (`GET` `TAILSCALE_STATUS_ROUTE`), whose payload and contract SAU-18 does not change. SAU-20 polls it. The route is now reachable on the tailnet Host, because the guard admits that Host with an identity (D6). SAU-20 needs no API change.
- **SAU-16 setup-flow gate (done, parallel).** `create-test-app.ts` gains an optional `listenHost` with a default that keeps the old behaviour (row 8). `guard-request.ts` is unchanged. No SAU-16 test changes.
- **SAU-17 (done, blocker).** SAU-18 uses `status()` and `refresh()` with their numbers unchanged (C5). The status endpoint and `normaliseLocalApiStatus` are unchanged.
- **SAU-05 hand-off** (`plans/DECISIONS.md:1524-1527`). Closed by D7: the status and Continue routes accept tailnet callers through the guard's identity.

## 8. Changes by other drafts and planned units to the same files

- **SAU-22 guard dev mode** (untracked draft, not on main, not planned). It changes `SetupAuthGuard.canActivate` (cookie check, Origin check and identity, `units/SAU-22-guard-dev-mode.md:19-21`), the policy builder (`devAuth` on `REQUEST_POLICY`, `:18`) and `env.ts`. Those are the same guard and policy functions this plan changes. This plan does not plan around it. Open point 7 asks for the sequence.
- **TRG-14** (planned). Its branch changes none of the nine files in section 4 (C20). No overlap.
- **SAU-19** (not planned, blocked by SAU-18). It adds its check to the guard's tailnet branch. It comes after SAU-18 by its blocker, so there is no conflict in either order.
- **SAU-20** (not planned, parallel). Its unit names no API file (C24). No overlap is expected. If SAU-20 later needs an API change, it must be planned against this plan's guard.
- None of the others touches these files.

## 9. Open points

1. **Test seam for the non-loopback peer (criterion 2).** The test app binds `127.0.0.1` (C13). The plan binds `0.0.0.0` with a new `listenHost` option and sends from the first non-internal IPv4 address (row 8, test 2). Options: (a) this, which fails when the machine has no such address (the plan's default); (b) connect from `127.0.0.2`, which works on Linux only, since macOS needs an alias; (c) skip the test when there is no such address, which leaves the criterion unrun on that machine. Affects the test structure and whether the criterion runs on every machine.
2. **Public routes on a tailnet Host with no header.** D8 applies the literal criterion 4: 403 on handshake, identity and sign-out too. Options: (a) the literal reading (the plan's default); (b) only guarded routes get 403, and public routes answer their own way (handshake 303 with no cookie, identity 401). Affects SAU-03's rule that the handshake on the tailnet Host redirects without a cookie (unit line 21), and what the Shell's `/setup` sees over the tailnet.
3. **Rules with no criterion.** Unit line 21 says a cookie is not a credential on the tailnet Host, and the handshake gives no cookie there. Test 4 covers the cookie case. The handshake case has no criterion (SAU-03 open point 3, `plans/SAU-03.md:149`). Options: (a) leave it untested; (b) add a criterion. Option (b) changes the criteria, so only the Navigator can choose it.
4. **Explanations on `/setup`.** `AUTH_TAILNET_IDENTITY_MISSING` is 403 (`errors.ts:19`; unit line 20). The Shell sends only 401s to `/setup` (`plans/SAU-06.md:266`). Options: (a) keep 403, so the `/setup` page shows the explanation only through the identity read (SAU-06's default); (b) a later Shell change sends the tailnet codes to `/setup` too (SAU-06 option b). Affects the first tailnet visit, not the guard.
5. **Criterion 2's "isn't trusted" has no status.** The plan answers an untrusted header with 403 `AUTH_TAILNET_IDENTITY_MISSING`, as for a missing header (D2). Options: (a) this; (b) a distinct code, which needs a contract change. Affects `errors.ts`.
6. **Reading of "at most one rate-limited refresh"** (unit line 18). The plan calls `status()` (2 s cache) before `refresh()` (1 s window), for each Host that is not static (A4). Options: (a) this; (b) call only `refresh()`, and keep the tailnet name cached in the policy. Option (b) makes logout detection depend on a second path. Affects load and how fast a logout is seen.
7. **SAU-22 draft overlaps this plan.** As drafted, SAU-22 gives `{via: 'loopback'}` to any admitted Host when `SCRIBA_DEV_AUTH` is set. A tailnet request with no header would then pass in dev mode. Options: (a) SAU-22 lands first, and this plan is revised to skip the tailnet identity in dev mode; (b) this plan lands first, and SAU-22 is revised to leave the tailnet branch alone; (c) dev mode is decided to apply to loopback Hosts only. Affects the guard, the policy builder and `env.ts`. Not planned around.
