---
id: SAU-19
status: draft
unit: units/SAU-19-owner-allowlist.md
sources: units/SAU-19-owner-allowlist.md (no change notes; 28 lines); units/README.md; modules/setup-auth.md; units/SAU-18-tailnet-guard-path.md and plans/SAU-18.md (done); units/SAU-17-localapi-client-status.md and plans/SAU-17.md (done); units/SAU-20-tailscale-ui.md; units/SAU-21-tailnet-gate.md; units/SAU-22-guard-dev-mode.md and plans/SAU-22.md (draft, same guard); plans/SAU-01.md (done, status assumption); plans/SAU-05.md (done, merge rule); units/SAU-06, SAU-15 and their plans (done, web and recovery text); plans/PLT-02.md (layout); plans/DECISIONS.md (grep, matching lines read); the code, fixtures and tests named in section 2a
---

# SAU-19 plan — owner allowlist (draft)

Base: `main` at `31b0251`, clean tree. Revision 1. SAU-18 is done and its code is on main (`apps/api/src/modules/setup-auth/setup-auth.guard.ts:73-78`). No `unit/SAU-19` branch exists (`git branch --list 'unit/SAU-19*'` prints nothing). The unit file has no change notes.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, a done plan or a Navigator decision

- **D1 Storage and default.** `setupAuth.allowlist` is `{enabled, logins[]}`, off by default, changed as a field-level merge. Source: unit line 18; contract `packages/contracts/src/setup-auth/settings.ts:14-17` (`allowlistSchema`) and `:28`; default `apps/api/src/modules/setup-auth/setup-auth.section.ts:19`, which already holds `{enabled: false, logins: []}`, so no migration is needed. Merge rule: `plans/SAU-05.md` item 10 (line 22).
- **D2 Seed.** Turning the allowlist on while the list is empty seeds it with the tailnet owner's login, `ownerLogin`. Source: unit line 19. `ownerLogin` is `User[Self.UserID].LoginName` (`apps/api/src/modules/setup-auth/tailscale-status.service.ts:68-71`); rule R6 of `plans/SAU-17.md` (line 160).
- **D3 Lockout.** A change made over the tailnet is refused with `SETUP_ALLOWLIST_LOCKOUT` if it would exclude the login making it. Source: unit line 20; codes `packages/contracts/src/setup-auth/errors.ts:10` and `:22` (403).
- **D4 Refusal.** When the allowlist is on, a tailnet login that is not in the list gets 403 `AUTH_TAILNET_NOT_ALLOWED` (`errors.ts:8` and `:20`). Source: unit line 21 ("When on").
- **D5 Loopback bypass.** The loopback branch never reads the allowlist. Source: unit line 22. The guard's loopback identity is `cookieIdentity` (`setup-auth.guard.ts:111-117`), which this unit does not change.
- **D6 Routes.** GET and POST on `ALLOWLIST_ROUTE` (`packages/contracts/src/setup-auth/routes.ts:13`, `/api/setup-auth/allowlist`). Reads are GET, commands are POST (`units/README.md`, "Conventions", HTTP). The POST body is `allowlistUpdateSchema` (`settings.ts:19-20`, the partial). Source: unit line 23.
- **D7 Scope of the refusal on the tailnet.** The allowlist check runs for every request on the tailnet Host that the guard admits with a login, public routes included (the identity read and the handshake). Source: SAU-18 D8 (`plans/SAU-18.md:69`), which the guard already implements (`setup-auth.guard.ts:79-86` refuses public routes without an identity too). The setup page shows the NOT_ALLOWED explanation from the identity read (`apps/web/src/app/features/setup-auth/sign-in-notice.ts:12-13` and `:27`; `setup-page.spec.ts:290-301`).
- **D8 Check order on the tailnet.** Identity first, then the allowlist, then the Origin check on a mutation. Source: SAU-18 D15 (`plans/SAU-18.md:76`); guard `setup-auth.guard.ts:79-97`.
- **D9 Dev mode (SAU-22).** The allowlist check is in the tailnet branch only. SAU-22's `devAuth` skip applies only to a non-tailnet entry. Source: SAU-18 D17 (`plans/SAU-18.md:78`); `plans/SAU-22.md` D6 (line 30) and section 8 (line 233).
- **D10 Layout and UI.** The change is API only. The module file needs no change (`setup-auth.module.ts:31-36` controllers and `:37-60` providers already hold the services). The owner-facing toggle and lockout message are SAU-20's (`units/SAU-20-tailscale-ui.md` lines 16 and 21). The unit's decisions and criteria name no UI.

### 1b. Choices (small decisions; the simplest option, recorded)

- **C1 No new production file.** `SetupStatusService` gets `allowlist()` and `saveAllowlist(patch, caller)`. `SetupFlowController` gets GET and POST on `ALLOWLIST_ROUTE`. The guard injects `SetupStatusService`. Reason: the `savePreferences` pattern (`apps/api/src/modules/setup-auth/setup-status.service.ts:107-120`; `setup-flow.controller.ts:22-34`) and SAU-18 D13.
- **C2 Seed rule.** The seed runs when a request turns the allowlist from off to on and the list after the request is empty. The seed is `[ownerLogin]`, and it runs only when `ownerLogin` is known (open point 2). A non-empty list is never replaced by the seed. Reason: "when the list is empty" is read on the list the change produces.
- **C3 Lockout rule.** A tailnet caller's change is refused when the allowlist after the change is on and the caller's login is not in its list. A change that turns the allowlist off is never refused, because with the list off nothing is excluded (unit line 21, "When on"). Reason: the literal rule. It covers enabling (criterion 2) and editing a list that is on (unit line 20 is broader than criterion 2's "enabling"). Reading R1.
- **C4 Login comparison.** Exact string match, as the Serve header is compared (`setup-auth.guard.ts:103-107`, SAU-18 D2). Logins are stored as sent, with no trim and no lower-casing. See AS1.
- **C5 Server messages.** NOT_ALLOWED: `This Tailscale login is not on the owner's allowlist.` LOCKOUT: `This change would exclude the Tailscale login that made it. Add that login to the list first, or make the change from the computer that runs Scriba.` Reason: the unit names no text, and its title says "403 messages". The web shows its own text by code (SAU-06, `sign-in-notice.ts:27`), so the server text serves API readers and logs.
- **C6 Response bodies.** GET and POST answer 200 with `{enabled, logins}`, the shape of `allowlistSchema`. The owner login is not in the body; SAU-20 reads it from the Tailscale status.
- **C7 Settings write.** The POST writes the `setupAuth` section only and keeps keys it does not know, as `savePreferences` does (`setup-status.service.ts:110-118`). `SettingsService.write` replaces the whole section (`apps/api/src/modules/platform/settings/settings.service.ts:64-80`), so the write is read, merge, write.
- **C8 Malformed section.** `allowlist()` parses the stored section with `parsed()` and throws a plain Error (500), as the status route does (`setup-status.service.ts:132-140`). A malformed section now also fails tailnet requests. Reason: consistency, and no new error code.
- **C9 No contract change.** `ALLOWLIST_ROUTE`, `allowlistSchema`, `allowlistUpdateSchema`, `SETUP_ALLOWLIST_LOCKOUT` and `AUTH_TAILNET_NOT_ALLOWED` already exist in `packages/contracts/src/setup-auth/`. The POST patch is typed `Partial<Allowlist>`, because the contract exports the type `Allowlist` (`settings.ts:32`) and no type for the patch.

## 2. Facts checked and facts assumed

### 2a. Checked (file and line, or the command run)

- **K1 Unit.** `units/SAU-19-owner-allowlist.md`, all 28 lines read. Decisions at lines 18-23, criteria at lines 26-28. No change notes.
- **K2 Blockers.** SAU-19 `blocked_by: [SAU-18]`, `unblocks: [SAU-21]`, `parallel_with: [SAU-16, SAU-20]` (front matter, lines 7-9). SAU-21 line 7 names SAU-19 in `blocked_by`. SAU-18 `unblocks` names SAU-19. SAU-16 and SAU-20 list SAU-19 back in `parallel_with`. SAU-18 is done: `plans/SAU-18.md` `status: done`, and its criteria at `units/SAU-18-tailnet-guard-path.md` lines 26-30 are ticked.
- **K3 Guard on main.** `setup-auth.guard.ts`: `canActivate` 60-99; `/healthz` early return 63-66; `entry` and `tailnet` 73-74; identity 75-78; identity-missing refusal 79-94 (a tailnet caller without an identity gets 403 whether or not the route is public); Origin check for mutations 95-97; `SERVE_PEERS` 43; `TAILNET_IDENTITY_MESSAGE` 46-47; `tailnetIdentity` 102-108; `cookieIdentity` 111-117; `checkOrigin` 120-129.
- **K4 Policy on main.** `apps/api/src/modules/setup-auth/request-policy.ts`: loopback origins 33-34 (`http://127.0.0.1:<port>`); `admit` 39-47; `tailnetEntryFor` 53-67 (Running, `dnsName`, and the Host equal to the name with or without `:443`).
- **K5 Setup status service.** `setup-status.service.ts`: constructor 51-54 (`SettingsService`, `SCRIBA_ENV`); `status()` 57-67 reads the stored section; `continueSetup` 70-82 keeps other keys by spread; `savePreferences` 107-120 merges the patch and writes `setupAuth`; `stored()` 124-129 falls back to the module default; `parsed()` 132-140 throws a plain Error on a schema mismatch.
- **K6 Flow controller.** `setup-flow.controller.ts`: header comment 16-17; `@Get(PREFERENCES_ROUTE)` 22-25; `@Post(PREFERENCES_ROUTE)` with `@HttpCode(200)` and `ZodValidationPipe` 27-34.
- **K7 Module.** `setup-auth.module.ts`: controllers 31-36 (`SetupFlowController` at 34); providers `SetupStatusService` 48, `TailscaleStatusService` 50, the `REQUEST_POLICY` factory 52-57, `APP_GUARD` 59.
- **K8 Tailscale status.** `tailscale-status.service.ts`: `TAILSCALE_STATUS_CACHE_MS` 11 (2000 ms); `ownerLogin` set at 68-71 only when `User[String(Self.UserID)].LoginName` is non-empty; `status()` 85-89; `refresh()` 91-96.
- **K9 Settings file.** `apps/api/src/modules/platform/settings/settings.service.ts`: `read` 58-62; `write` 64-80 (replaces the section, checks `schemaVersion` against the registered version).
- **K10 Section default.** `setup-auth.section.ts:19`: `allowlist: { enabled: false, logins: [] }`.
- **K11 Contract.** `packages/contracts/src/setup-auth/settings.ts`: `allowlistSchema` 14-17, `allowlistUpdateSchema` 19-20, `setupAuthSectionSchema` 23-29 (`allowlist` at 28), types 31-33. `routes.ts:13` `ALLOWLIST_ROUTE`. `errors.ts`: `TAILNET_NOT_ALLOWED` 8, `ALLOWLIST_LOCKOUT` 10, `AUTH_TAILNET_NOT_ALLOWED: 403` at 20, `SETUP_ALLOWLIST_LOCKOUT: 403` at 22. Platform's `PLATFORM_VALIDATION_FAILED` is at `packages/contracts/src/platform/errors.ts:37` with status 400 at `:45`; the pipe is `apps/api/src/modules/platform/errors/zod-validation.pipe.ts:5-11`.
- **K12 Code search.** `grep -rn "ALLOWLIST\|allowlist\|NOT_ALLOWED\|LOCKOUT" packages/contracts/src apps/api/src apps/web/src e2e` finds no route, service or guard code for the allowlist on main. The hits in `apps/api/src` are the section default (`setup-auth.section.ts:19`) and a comment (`request-policy.ts:19`). No web code calls `ALLOWLIST_ROUTE`.
- **K13 Web and e2e.** `sign-in-notice.ts:12-13` (NOT_ALLOWED text) and `:27` (mapping by code); `setup-page.spec.ts:290-301` (an ApiError 403 `AUTH_TAILNET_NOT_ALLOWED` shows the explanation); `e2e/specs/setup-phone.e2e.ts:141-146`.
- **K14 Plans, status.** A loop over the `status:` line of every `plans/*.md` file found these not done: `plans/SAU-22.md` (draft), `plans/PST-21.md` and `plans/TRG-14.md` (planned). Plus `plans/DECISIONS.md` and `plans/QUEUE.md`, which are not plans. `grep -l` over `plans/*.md` for the file names in section 3 found matches only in done plans and in `plans/SAU-22.md`. PST-21 and TRG-14 name no setup-auth API file.
- **K15 SAU-22 plan.** `plans/SAU-22.md` row 5 (line 86) changes `setup-auth.guard.ts` (`devMode` in `canActivate`). D6 (line 30) puts the dev skip in the non-tailnet branch. Section 6 (line 201) and section 8 (line 233) say that SAU-19's check goes in the tailnet branch. `grep -rn "devAuth\|SCRIBA_DEV_AUTH" apps/api/src packages/contracts/src` finds nothing, so SAU-22 is not on main.
- **K16 DECISIONS.** `grep -n "SAU-19" plans/DECISIONS.md` gives lines 1435 and 1443, which concern the setup-URL reader and not the allowlist. `grep -n -i "allowlist\|LOCKOUT\|SAU-22"` finds no decision on the allowlist and no decision on the 403 status of `SETUP_ALLOWLIST_LOCKOUT`. The matching SAU-18 and SAU-21 lines were read: 1524-1527 (SAU-05 hand-off), 1529 (the Host check before the body parser), 5508-5513 (Navigator: SAU-22 order and D17), 5515-5518 (Navigator: the handshake gap), and the entries from 5520 on (SAU-18 review, and the owner's decision to accept the peer-header risk). None changes the allowlist.
- **K17 SAU-01 assumption.** `plans/SAU-01.md` line 36 and its open point 2 (line 143): the 403 status of `SETUP_ALLOWLIST_LOCKOUT` was chosen by SAU-01 and is not confirmed in DECISIONS (K16).
- **K18 SAU-17.** `plans/SAU-17.md` R6 (line 160) and assumption A11 (line 281): a tagged device has no user, so no `ownerLogin` (not checked on a device).
- **K19 Downstream text.** `units/SAU-20-tailscale-ui.md`: lines 7-8 (`blocked_by` SAU-11, SAU-15, SAU-17; `parallel_with` SAU-18, SAU-19), line 16 ("the owner allowlist editor with on/off toggle and the lockout message (once SAU-19 lands; the section can ship read-only first)"), line 21 (criterion "Allowlist toggle and lockout error rendering."). `units/SAU-21-tailnet-gate.md`: line 25 (criterion "Allowlist refusal, lockout protection and loopback bypass pass (SAU-19)") and line 30 (the demo: turn on the allowlist, try from a shared-in user, see the refusal, turn it off).
- **K20 Module.** `modules/setup-auth.md`: line 3 (the owner allowlist is part of the module), line 7 (the allowlist is built and tested against a fake LocalAPI socket), line 29 (SAU-19 under SAU-18 in the graph), line 46 ("The identity is for display and logs only: no user table, no per-user data, never used to partition data."), line 49 (settled decisions, including the peer rule), line 66 ("Testing principles": external behaviour, and the fake LocalAPI as the only Tailscale double).
- **K21 Fixture.** `apps/api/test/fixtures/localapi/running-certs.json`: `Self.DNSName` `scriba-1.tail1234.ts.net.`; `Self.UserID` 4242; `User` entry 4242 is `ada@example.com` (the owner), entry 1111 is `bob@example.com`.
- **K22 Test helpers.** `apps/api/test/setup-auth-tailnet.test.ts`: `withApp` (fake LocalAPI, temp library, `createTestApp` with `env.SCRIBA_TS_SOCKET`) and `codeOf`. `apps/api/test/guard-request.ts`: `send` (explicit Host) and `sessionCookie(app, libraryDir)`. `apps/api/test/create-test-app.ts`: `TestAppOptions` (`listenHost` default `127.0.0.1`). `apps/api/test/settings.kit.ts` exists.
- **K23 Existing tests that touch the allowlist.** `apps/api/test/setup-auth-status.test.ts` plants `allowlist: {enabled: true, logins: ['ada@example.com']}` (about line 181) and calls only loopback. No test on a tailnet Host plants an allowlist. The tailnet name is used only in `setup-auth-tailnet.test.ts` and `setup-auth-localapi.test.ts`.
- **K24 Invariant sweeps.** `apps/api/test/invariant-sweep.ts`: the verdict list at lines 660-666 and `sweepMutations` at 667. Every mutation route gets a cookie-less request (401), a missing Origin (403), a foreign Origin (403) and a foreign Host (403). `sweepGetHead` covers GET. Both use `app.routes()`.
- **K25 Scripts.** `apps/api/package.json` line 7 (`test`: build, then vitest) and line 8 (`lint`: `eslint .`).
- **K26 Origin on loopback mutations.** The loopback origin is `http://127.0.0.1:8080` (`request-policy.ts:33`), so loopback mutations in the tests send that Origin.

### 2b. Assumed

- **AS1** Tailscale login names reach the Serve header and the stored list in the same spelling, in lower case. Not checked on a real tailnet; SAU-21 checks Serve on a real tailnet.
- **AS2** A node with a user has a `User` entry for its `Self.UserID`. The fixture shows one (K21); a tagged device does not have one (K18). Open point 2 covers the missing case.
- **AS3** One `settings.yaml` read per tailnet request is acceptable for one owner's node. The status route already reads the file on each call (`setup-status.service.ts:57-58`).
- **AS4** The two invariant sweeps accept the two new routes without a fixture change, because `ALLOWLIST_ROUTE` has no `:` template (K24). This is confirmed only when section 4 step 7 runs.

## 3. Files to change

| # | Path | New or modified | Change | Decision |
|---|---|---|---|---|
| 1 | `apps/api/src/modules/setup-auth/setup-status.service.ts` | modified | Injects `TailscaleStatusService`. Adds `allowlist(): Allowlist` and `async saveAllowlist(patch, caller): Promise<Allowlist>` (section 4, step 3). | C1, C2, C3, C5, C7, C8, D2 |
| 2 | `apps/api/src/modules/setup-auth/setup-flow.controller.ts` | modified | `GET ALLOWLIST_ROUTE` and `POST ALLOWLIST_ROUTE` (200). Header comment names the allowlist. | C1, C6, D6 |
| 3 | `apps/api/src/modules/setup-auth/setup-auth.guard.ts` | modified | Injects `SetupStatusService`. Adds `checkAllowlist(identity)` in the tailnet branch, after the identity block and before the Origin check. Adds `NOT_ALLOWED_MESSAGE` beside `TAILNET_IDENTITY_MESSAGE`. One line in the class comment. | D4, D5, D7, D8, D9 |
| 4 | `apps/api/test/setup-auth-allowlist.test.ts` | new | The three tests of section 5. | section 5 |

Not changed: `setup-auth.module.ts` (K7), `setup-status.controller.ts`, `setup-session.controller.ts`, `request-policy.ts`, `tailscale-status.service.ts`, `setup-auth.section.ts`, `packages/contracts/**` (C9), `apps/web/**`, `e2e/**`, every other file under `apps/api/test/`, `units/**`, `modules/**`, and every plan except `plans/SAU-19.md`.

## 4. Procedure

Work in the worktree that the orchestrator makes for `unit/SAU-19` from `main`. Do not touch the main checkout. Run `npm ci` there, and run every command from the worktree root.

1. **Check SAU-22 on the base.** `grep -rn "devAuth\|SCRIBA_DEV_AUTH" apps/api/src`. Expected: no output (K15). If SAU-22 is on the base, keep its skip in the non-tailnet branch, put the allowlist check in the tailnet branch (D9), and stop to report if the two cannot be kept apart in step 5.
2. **Baseline.** `npm run build -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-api`. Record the file and test counts. Expected: all pass.
3. **Service (row 1).** In `setup-status.service.ts`:
   a. Constructor: add `private readonly tailnet: TailscaleStatusService` (import from `./tailscale-status.service`). Keep the existing parameters.
   b. `allowlist(): Allowlist` returns `this.parsed(this.stored()).allowlist`.
   c. `async saveAllowlist(patch: Partial<Allowlist>, caller: Identity | undefined): Promise<Allowlist>`:
      - `stored = this.stored()`; `current = this.parsed(stored).allowlist`.
      - `next = { enabled: patch.enabled ?? current.enabled, logins: patch.logins ?? current.logins }`.
      - If `!current.enabled && next.enabled && next.logins.length === 0`: `owner = (await this.tailnet.status()).ownerLogin`. If `owner !== undefined`, set `next.logins = [owner]` (C2).
      - If `caller?.via === 'tailnet' && next.enabled && !next.logins.includes(caller.login)`: throw `new ModuleError(SETUP_AUTH_ERROR_CODES.ALLOWLIST_LOCKOUT, SETUP_AUTH_ERROR_STATUS.SETUP_ALLOWLIST_LOCKOUT, LOCKOUT_MESSAGE)` (C3, C5). Nothing is written.
      - `this.settings.write('setupAuth', { ...stored, allowlist: { ...(stored.allowlist as Record<string, unknown>), ...next } })` (C7).
      - Return `next`.
   d. `LOCKOUT_MESSAGE` is a constant of this file (text in C5).
4. **Routes (row 2).** In `setup-flow.controller.ts`:
   a. `@Get(ALLOWLIST_ROUTE) allowlist(): Allowlist` returns `this.status.allowlist()`.
   b. `@Post(ALLOWLIST_ROUTE) @HttpCode(200) async saveAllowlist(@Body(new ZodValidationPipe(allowlistUpdateSchema)) body: Partial<Allowlist>, @RequestIdentity() identity: Identity | undefined): Promise<Allowlist>` returns `this.status.saveAllowlist(body, identity)`.
   c. Imports: `ALLOWLIST_ROUTE`, `allowlistUpdateSchema`, `Allowlist`, `Identity` from the contract; `RequestIdentity` from `./request-identity`.
   d. Update the header comment (lines 16-17) to name the allowlist.
5. **Guard (row 3).** In `setup-auth.guard.ts`:
   a. Constructor: add `private readonly status: SetupStatusService` (import from `./setup-status.service`).
   b. After the identity block (lines 79-94) and before the Origin check (line 95), add `if (tailnet && identity !== undefined) this.checkAllowlist(identity);`.
   c. `private checkAllowlist(identity: Identity): void`: return unless `identity.via === 'tailnet'`. Then `const list = this.status.allowlist()`. If `list.enabled && !list.logins.includes(identity.login)`, throw `new ModuleError(SETUP_AUTH_ERROR_CODES.TAILNET_NOT_ALLOWED, SETUP_AUTH_ERROR_STATUS.AUTH_TAILNET_NOT_ALLOWED, NOT_ALLOWED_MESSAGE)`.
   d. `NOT_ALLOWED_MESSAGE` is a constant beside `TAILNET_IDENTITY_MESSAGE` (text in C5). One line added to the class comment on the allowlist.
   e. The loopback branch is not edited. `/healthz` returns at lines 63-66 before any read, so it never reads the list.
6. **Tests (row 4).** Write `apps/api/test/setup-auth-allowlist.test.ts`. Copy `withApp` and `codeOf` from `setup-auth-tailnet.test.ts`, so the file is self-contained as SAU-18's was. Constants: `TAILNET_NAME` `scriba-1.tail1234.ts.net`; `TAILNET_ORIGIN` `https://scriba-1.tail1234.ts.net`; `ADA` `ada@example.com`; `BOB` `bob@example.com`; `LOOPBACK_HOST` `127.0.0.1:8080`; `LOOPBACK_ORIGIN` `http://127.0.0.1:8080`; `STATIC_ROOT`; `TEST_TIMEOUT_MS` 30000. Three `it` blocks with the names of section 5. Each uses the fixture `running-certs`.
7. **Run.** `npm run build -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-api`. Expected: the three new tests pass, and every pre-existing test passes with no edit, including the invariant sweeps, the guard tests, the tailnet tests, the status tests and the section tests. If a pre-existing test needs an edit, stop and report PLAN DOES NOT WORK.
8. **Lint and format.** `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api`. Expected: exit 0.
9. **Mutation checks.** Each mutation is undone and confirmed with `git diff` before the next one. (M1) Remove the `checkAllowlist` call: test 1 fails. (M2) Remove the lockout throw: test 2 fails. (M3) Remove the `via === 'tailnet'` return in `checkAllowlist`, so that a loopback identity is also checked against the list: test 3 fails at step 3. Record which test fails for each.
10. **Scope.** `git diff --name-only main` lists rows 1 to 4 of section 3 and nothing else.
11. **Commit.** In the worktree, commit with `feat(SAU-19): owner allowlist`, staging the four paths by name.

## 5. Tests for the acceptance criteria

There are three criteria and one test for each. The file is `apps/api/test/setup-auth-allowlist.test.ts`. The criteria are copied from unit lines 26 to 28. Each assertion checks the status and, for a refusal, `error.code`. The tailnet Host is `scriba-1.tail1234.ts.net`, and the tailnet requests send the Serve login header `Tailscale-User-Login`. Each test uses fixture `running-certs`, whose owner is `ada@example.com` (K21).

| Criterion (unit lines 26 to 28, verbatim) | Test name | Steps and expected results |
|---|---|---|
| "With the allowlist on, a login not in the list gets 403 with `AUTH_TAILNET_NOT_ALLOWED`." | `criterion 1: with the allowlist on, a tailnet login that is not listed gets 403 AUTH_TAILNET_NOT_ALLOWED on version, identity and status, and a listed login gets 200` | 1. Cookie from `sessionCookie(app, library)`. 2. Loopback POST `ALLOWLIST_ROUTE` (Host `127.0.0.1:8080`, Origin `http://127.0.0.1:8080`, cookie) with `{"enabled":true,"logins":["ada@example.com"]}`: 200, body `{enabled: true, logins: ['ada@example.com']}`. 3. Tailnet Host with the header `bob@example.com`, no cookie: GET `VERSION_ROUTE`, GET `IDENTITY_ROUTE` and GET `SETUP_STATUS_ROUTE` each give 403 with code `AUTH_TAILNET_NOT_ALLOWED` (identity is a public route, D7). 4. Tailnet Host with the header `ada@example.com`: GET `VERSION_ROUTE` gives 200. |
| "Enabling from a login that wouldn't be included is refused; enabling with an empty list seeds the owner." | `criterion 2: enabling from a tailnet login the new list would not include gets 403 SETUP_ALLOWLIST_LOCKOUT and writes nothing; enabling with an empty list seeds the owner, from the tailnet and from loopback` | Start: allowlist off, list empty (the default). 1. Tailnet POST `ALLOWLIST_ROUTE` (Origin `https://scriba-1.tail1234.ts.net`, header `bob@example.com`) with `{"enabled":true}`: 403, code `SETUP_ALLOWLIST_LOCKOUT`. Then loopback GET `ALLOWLIST_ROUTE` with cookie: `{enabled: false, logins: []}`. 2. Tailnet POST with header `ada@example.com`, `{"enabled":true}`: 200, body `{enabled: true, logins: ['ada@example.com']}` (seeded from `ownerLogin`). 3. Tailnet POST as ada with `{"logins":["bob@example.com"]}` while the list is on: 403, code `SETUP_ALLOWLIST_LOCKOUT` (decision line 20, beyond criterion 2's enabling; C3). Loopback GET still `[ada]`. 4. Tailnet POST as ada with `{"enabled":false}`: 200, body `{enabled: false, logins: ['ada@example.com']}` (turning off over the tailnet is never refused; this is the SAU-21 demo's "turn it off"). 5. Loopback POST with cookie and `{"logins":[]}`: 200, `{enabled: false, logins: []}`. 6. Loopback POST with cookie and `{"enabled":true}`: 200, body `{enabled: true, logins: ['ada@example.com']}` (seeded on a loopback request). |
| "Loopback with a cookie still works with the allowlist on." | `criterion 3: with the allowlist on, loopback with the cookie still gets 200 on version, status, identity and the allowlist, and may change the list; a tailnet login that is not listed is still refused` | 1. Loopback POST with cookie and `{"enabled":true,"logins":["ada@example.com"]}`: 200. 2. Control: tailnet GET `VERSION_ROUTE` as `bob@example.com`: 403, code `AUTH_TAILNET_NOT_ALLOWED`. 3. Loopback with cookie: GET `VERSION_ROUTE` 200; GET `SETUP_STATUS_ROUTE` 200; GET `IDENTITY_ROUTE` 200 with body `{via: 'loopback'}`; GET `ALLOWLIST_ROUTE` 200. 4. Loopback POST with cookie and `{"logins":["bob@example.com"]}` (this leaves the owner out): 200, because the lockout rule covers the tailnet only (D3). 5. Tailnet GET `VERSION_ROUTE` as `ada@example.com`: 403, code `AUTH_TAILNET_NOT_ALLOWED`. Loopback GET `VERSION_ROUTE` with cookie: still 200. |

Each test is one `it` with the steps above as assertions. The three tests are the only new tests. Sections 4 step 9 shows that each test fails when its check is removed.

## 6. Agreement with the downstream and parallel units

- **SAU-21 (blocked by SAU-19; the gate).** Its criterion 4 (unit line 25) is covered by tests 1, 2 and 3. Its demo (unit line 30) works with these routes: the refusal is test 1, turning the list off over the tailnet is test 2 step 4, and turning it on from the Mac is test 3 step 1. SAU-21 needs no change in these routes or codes. Its other criteria do not depend on SAU-19.
- **SAU-20 (parallel).** Needs `ALLOWLIST_ROUTE` for GET and POST, the shapes `allowlistSchema` and `allowlistUpdateSchema` (C6), the code `SETUP_ALLOWLIST_LOCKOUT` (403) and the code `AUTH_TAILNET_NOT_ALLOWED`. The contract does not change (C9), so SAU-20 can build against it with a fake API client before SAU-19 merges. Its toggle and lockout message follow SAU-20's own text (line 16); disagreement 2 in section 8.
- **SAU-18 (done).** Uses its identity attachment (`{via: 'tailnet', login}`, SAU-18 D6), its tailnet branch (D7 and D8) and its check order (D8 here, SAU-18 D15). SAU-18 named this check as SAU-19's, in the same branch (`plans/SAU-18.md:141`), so it is additive.
- **SAU-17 (done).** `ownerLogin` only (D2). `tailscale-status.service.ts` does not change.
- **SAU-06 and the web (done).** Explanations are keyed by code (`sign-in-notice.ts:27`). The server text (C5) is not shown in the UI. The identity read on `/setup` receives the 403 (D7).
- **SAU-15 (done).** Its recovery text, "use the Mac and the setup URL" (unit line 22 of SAU-15), stays true. Test 3 shows it.
- **SAU-16 (done, parallel).** Setup-flow tests run with the allowlist off. No change.
- **SAU-22 (draft, same guard).** Section 7.

### Disagreements between the unit, the module and downstream text

1. **Module line 46 against the unit.** `modules/setup-auth.md` line 46 says the identity is "for display and logs only ... never used to partition data". SAU-19 uses the login to refuse access (D4). The plan follows the unit, because the allowlist does not partition data and the unit's "People the node is shared with" needs it. Open point 3.
2. **SAU-20 ordering.** SAU-20 line 16 says its allowlist editor waits for SAU-19, but SAU-20 lists SAU-19 in `parallel_with` and not in `blocked_by`. The contract is fixed now, so both can proceed. Open point 5.
3. **Unit title against body.** The title says "toggle", but the unit's decisions and criteria name no UI. This plan puts the toggle in SAU-20 (D10).
4. **Criterion 2 against decision line 20.** Criterion 2 says "enabling". Decision line 20 says any change over the tailnet that would exclude the login making it. The plan applies the wider rule (C3), and test 2 checks both.

## 7. Changes by other drafts and planned units to the same files

- **SAU-22 guard dev mode (draft, `plans/SAU-22.md`).** Changes `setup-auth.guard.ts` in `canActivate` (its row 5, line 86), with `devMode = this.policy.devAuth && entry?.tailnet === false` (D6, line 30). The two edits meet in `canActivate`. SAU-19 adds one call after the identity block. SAU-22 adds the dev skip in the non-tailnet branch. Agreement for either order: the tailnet branch runs first (identity, then the allowlist, then the Origin rule on tailnet mutations), and the dev skip applies only to a non-tailnet entry (D9; `plans/SAU-22.md` section 8, line 233). SAU-22 changes `request-policy.ts` and `env.ts`, which SAU-19 does not touch. The two edits are close in `canActivate` and need a rebase in whichever order they land.
- **SAU-20, PST-21, TRG-14.** No overlap with the four paths of section 3 (K14).

## 8. Open points

1. **Who may change the list over the tailnet.** The literal rule (C3) refuses only a change that excludes the caller. A listed non-owner login can therefore remove the owner, and the owner is then locked out of the tailnet until a loopback change. The unit does not say the list is owner-only. The plan follows the literal rule; test 2 step 3 covers only the self-exclusion case. Owner decision needed.
2. **No owner login is known.** A tagged device has no `User` entry, so there is no `ownerLogin` (K18, AS2). Enabling from loopback with an empty list then seeds nothing. The plan follows the literal reading: the list stays empty and enabled, every tailnet login is refused until a loopback change adds one, and a tailnet caller is refused with `SETUP_ALLOWLIST_LOCKOUT` by C3 either way. The alternative is to refuse the enabling with an error. No test covers this case. Owner decision needed.
3. **Module line 46 against the unit** (disagreement 1). Confirm that the allowlist is an access gate and not partitioning, or reword line 46.
4. **The 403 status of `SETUP_ALLOWLIST_LOCKOUT`.** The contract's 403 (`errors.ts:22`) is SAU-01's assumption (K17), and no DECISIONS entry confirms it. The plan uses 403. The coordinator confirms it, or changes it before merge, since the contract is published.
5. **SAU-20 ordering** (disagreement 2). Whether SAU-20's toggle waits for the merge of SAU-19 is the coordinator's decision. The contract does not depend on it.

## Review parts

One part.

- **Part 1 — owner allowlist.** Steps 1 to 11 of section 4. Tests 1 to 3 of section 5 (criteria 1 to 3), all in `apps/api/test/setup-auth-allowlist.test.ts`. The reviewer of this part also checks that the changed paths are rows 1 to 4 of section 3 only, that the allowlist check sits in the tailnet branch and not in the loopback branch, and that no contract file changed.
