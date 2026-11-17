---
id: SAU-22
status: draft
unit: units/SAU-22-guard-dev-mode.md
sources: units/SAU-22-guard-dev-mode.md (on main, unchanged since fb19867); modules/setup-auth.md (lines 32, 39, 48-49, 66-71); units/README.md (blocker notation, testing convention); plans/SAU-18.md (planned; sections 3, 4, 6, 7, 8, 9 and the D17 text); plans/DECISIONS.md (the SAU-18 entries at 5508-5518, the SAU-05 hand-off at 1524-1527, and a grep for SAU-22, devAuth and SCRIBA_DEV_AUTH); plans/SAU-04.md (section 1, decisions 7, 14, 17, 18, 20); plans/SAU-05.md (grep only, lines 45 and 49: the module's factory and the cookie helper); plans/SAU-08.md and plans/SAU-16.md (grep for REQUEST_POLICY, buildRequestPolicy, originFor, canActivate, SetupAuthGuard and request-policy: zero matches); plans/PLT-02.md (headings); plans/TRG-14.md and plans/PST-20.md (file overlap); the code, tests and docs named in section 2, read on main at f4b338d
---

# SAU-22 plan — guard dev mode (draft)

Base: `main` at `f4b338d`. The brief named `6be7616`. `git diff --stat 6be7616 f4b338d` shows one file, `plans/PST-20.md`, so every code fact below holds at both commits.

Two findings change the unit's text as written, and section 7 asks the owner to decide them before the implementation starts:

- The status, Continue and identity routes read the cookie in their own controllers. A guard-only skip leaves them answering 401 in dev mode, so criteria 2 and 5 cannot pass (D7, C14, C15).
- The dev API listens on `0.0.0.0:8080`, and the unit's dev mode has no credential on the API. Any device on the LAN that sends a loopback Host reaches the guarded routes (open point 1). Dev mode also has no Origin check on mutations, so a page on another site can reach bodyless mutations (open point 2).

## 1. Decisions this plan follows

Each decision gives its source. "Unit" is `units/SAU-22-guard-dev-mode.md`. "Module" is `modules/setup-auth.md`. "SAU-18" is `plans/SAU-18.md`.

- **D1 The flag.** `SCRIBA_DEV_AUTH` is a boolean env, parsed in `env.ts` and carried on `REQUEST_POLICY` as `devAuth`. Unset means false. Source: unit line 18.
- **D2 Accepted values (the plan's choice; the unit is silent on the syntax).** `1` turns the flag on and `0` turns it off. The contract default is `'0'`. Any other value, an empty string included, is a `BootError` with the text `Invalid SCRIBA_DEV_AUTH "<raw>": expected 0 or 1.`, which `read()` produces (C6). Reason: the dev script sets `1` (unit line 24), and the only boolean rule on main (`watcher`, `env.ts:51-53`) takes `true` and `false` only, so a new rule is needed. Open point 6.
- **D3 Where it is parsed.** In `parseEnv` (`env.ts:84-154`), next to the raw read of `SCRIBA_DEV_ORIGINS` (`env.ts:129-134`). Not in `parseDevOrigins` (`request-policy.ts:33-44`), which validates the origin list. The NODE_ENV check (D5) needs the `source` record, which only `parseEnv` receives, and `parseEnv` is the first call in `bootstrap` (`bootstrap.ts:33`), before `ensureAppState` and before `NestFactory.create`.
- **D4 Contract name.** `read()` takes a `ScribaEnvName` (`env.ts:70`), and `ScribaEnvName` is the key set of `SCRIBA_ENV_DEFAULTS` (`packages/contracts/src/platform/env.ts:22`). So the name joins the contract as `SCRIBA_DEV_AUTH: '0', // app (dev only); never set in the image or compose`. This is an addition only. The contract count test moves from 14 to 15 (section 3, row 2). Source: the contract's own comment at `env.ts:1` and the expand rule of `units/README.md` ("Contracts change by expand–contract once published"). Open point 5.
- **D5 Refusal.** Unit line 23. In `parseEnv`, after the read: when the flag is true and `source.NODE_ENV === 'production'`, throw `BootError` with the text `Invalid SCRIBA_DEV_AUTH "1": dev mode is refused when NODE_ENV is production.` `main.ts` catches it (C7), writes the message to stderr and exits 1. The shape matches the `SCRIBA_DEV_ORIGINS` refusal (`request-policy.ts:38-40`, SAU-04 decision 7). Open point 3 covers the fact that the image sets no NODE_ENV.
- **D6 Guard.** Unit lines 19-21. With `policy.devAuth` true, the guard does not read the cookie, sets `req.identity = {via: 'loopback'}`, and skips the Origin check on mutations. The Host check (`hostFrameMiddleware`, untouched), the absence of `Access-Control-*` headers and `frame-ancestors 'none'` (unit line 22; module line 3) are unchanged. The dev branch sits on the non-tailnet path only (D13, section 6).
- **D7 Controllers (not in the unit; required by criteria 2 and 5).** `requireSession` in `setup-status.controller.ts` (cookie check at lines 36-46) and the identity route in `setup-session.controller.ts` (lines 101-118) take the guard's identity, `@RequestIdentity()`, and stop reading the cookie. This is the SAU-18 rows 5 and 6 edit (SAU-18 D7, which closes the SAU-05 hand-off at `plans/DECISIONS.md:1524-1527`), written here in the same form (section 4, step 6). In production nothing changes: the guard sets `req.identity` when the same cookie verifies on the same header (`setup-auth.guard.ts:53-57`). The one difference is a non-loopback dev origin, which never receives a cookie, because the handshake sets one only on a loopback Host (`setup-session.controller.ts:91-97`). The guard sets the identity on public routes too, so the identity route still sees it.
- **D8 Warning.** Unit line 23 ("a loud startup warning ... whenever dev mode is active"). When the flag is true, `bootstrap` writes one line to stderr after `ensureAppState(env)` and before `NestFactory.create`: `SCRIBA_DEV_AUTH=1: dev mode is on. The setup cookie and the Origin check are skipped for this process. Use it for local work only.` It uses `process.stderr.write`, not `StdoutLogger`, because `StdoutLogger` drops `warn` at `SCRIBA_LOG_LEVEL=error` (`stdout-logger.ts:7-11`), and the unit says "whenever". Open point 7.
- **D9 Dev script.** Unit line 24. The root `dev` script (`package.json` line 24) gets `SCRIBA_DEV_AUTH=1` inside the quoted `node --watch apps/api/dist/main.js` command, next to `SCRIBA_DEV_ORIGINS=http://localhost:4200`.
- **D10 Never in the image or compose.** Unit line 23. A test greps the files that make the image and the stack for `SCRIBA_DEV_AUTH` (section 5, E4). None sets it today (C12).
- **D11 Existing tests unchanged.** Unit line 25. No existing test file changes. New tests go in new files. The one edit to an existing test is the contract count test (D4), which lives in `packages/contracts`.
- **D12 Test seam.** External behaviour only (module lines 66-71; SAU-04 decision 18). `createTestApp` boots the composed app. A spawned `dist/main.js` checks the boot refusal, as `setup-auth-guard.test.ts:560-590` does (SAU-04 decision 7).
- **D13 Either order with SAU-18.** Section 6. SAU-18 D17 (`plans/SAU-18.md:78`, from the Navigator at `plans/DECISIONS.md:5508-5513`): on a tailnet Host the tailnet branch runs first, so dev mode has no effect there. A tailnet request without the trusted header still gets 403 `AUTH_TAILNET_IDENTITY_MISSING`, and a tailnet mutation still needs `Origin: https://<dnsName>`.

## 2. Facts checked and facts assumed

Checked facts carry a file and line on main at `f4b338d`. Assumed facts are marked A.

- **C1 The unit.** Front matter: `blocked_by: []` (line 7), `phase: none`, `milestone: M1`. Decisions at lines 18-25. The six criteria at lines 28-33. The unit text does not name the controllers (C14) or the Shell (C15).
- **C2 The base.** `main` is `f4b338d`. `git diff --stat 6be7616 f4b338d` lists `plans/PST-20.md` only.
- **C3 The guard today.** `apps/api/src/modules/setup-auth/setup-auth.guard.ts`: `canActivate` at lines 45-76. `isPublic` at 47-52. The cookie is verified at 53-56 and `req.identity` is set at 57, before the public check. The 401 is thrown at 58-64. The Origin check is at 65-74, and it reads `this.policy.originFor` at 66.
- **C4 The policy today.** `request-policy.ts`: `REQUEST_POLICY` at line 4. `RequestPolicy` at 7-10 with only `originFor`. `buildRequestPolicy(env)` at 13-24 parses the dev origins at line 18. `requestPath` at 27-30. `parseDevOrigins` at 33-44, with its `BootError` at 38-40.
- **C5 The hook.** `host-frame.middleware.ts`: CSP at line 31, the Host check at 32-33, the refusal body at 34-43. Registered at `bootstrap.ts:50-52`. The plan does not touch it.
- **C6 The env parser.** `apps/api/src/modules/platform/boot/env.ts`: `ScribaEnv` at 15-28 (`SCRIBA_DEV_ORIGINS` at 24). `read()` at 68-81, typed with `ScribaEnvName` at line 70, with its `BootError` at 78. The `watcher` rule at 51-53 takes `'true'` or `'false'` only. `parseEnv` at 84-154. The raw read of `SCRIBA_DEV_ORIGINS` at 129-134. `SCRIBA_DEV_AUTH` appears nowhere in the repo (grep over everything except `node_modules` and `dist`; the only hits are the unit, the module, the README row of the unit table and the plans).
- **C7 Where a `BootError` is caught.** `apps/api/src/modules/platform/boot/boot-error.ts:2-7` defines the class. The only catch is `apps/api/src/main.ts:9-14`: `BootError` is written to stderr (line 11) and the process exits with 1 (line 12). Any other error is rethrown (line 14) and ends the process through an unhandled rejection, which exits with 1 too (checked: `node -e 'Promise.reject(...)'` exits 1 on v26.13.0). So an exit of 1 alone does not prove the refusal. The test must check the stderr text.
- **C8 Boot order.** `apps/api/src/bootstrap.ts`: `parseEnv` at 33, `ensureAppState` at 34, the early `buildRequestPolicy(env)` at 35-36, `NestFactory.create` at 38-48, the hook at 50-52, `init` at 53-59. `main.ts:8` listens on `0.0.0.0:8080`.
- **C9 The existing malformed-origin test.** `apps/api/test/setup-auth-guard.test.ts:560-590` spawns `dist/main.js` with the three directory variables set to temp folders, `SCRIBA_LOG_LEVEL=error` and a bad `SCRIBA_DEV_ORIGINS`. The env is replaced, so `NODE_ENV` is unset in the child. It checks status 1, stdout `''`, that the first stderr line starts with `Invalid SCRIBA_DEV_ORIGINS "`, and that no stack frame is printed. `apps/api/test/env-boot.test.ts` (35 lines) checks an exact stderr line the same way.
- **C10 The test factory.** `apps/api/test/create-test-app.ts:65-116`: `env` is merged over a base env (lines 77-89), so `process.env` is never read by tests. The flag therefore reaches a test only through its `env` option. It listens on `127.0.0.1` (line 90).
- **C11 The scripts.** Root `package.json`: `dev` is line 24. It sets `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR`, `SCRIBA_EXAMPLES_DIR`, `SCRIBA_DEV_ORIGINS=http://localhost:4200` and `SCRIBA_SETUP_URL_BASE=http://localhost:4200` before `node --watch apps/api/dist/main.js`. It does not set `SCRIBA_DEV_AUTH`. `test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'` (line 25). `apps/api/package.json` `test` is `npm run build && vitest run`.
- **C12 Image and compose.** `Dockerfile` has no `ENV` line (runtime stage at lines 50-64, `ENTRYPOINT` at 64). `deploy/compose.yaml`: the `scriba` service's `environment` is at lines 49-53 (`SCRIBA_PORT`, `SCRIBA_LIBRARY`, `SCRIBA_COMPOSE_VERSION`, `SCRIBA_TS_SOCKET`), and it has no `env_file`. The `env_file` at lines 8-10 belongs to the `tailscale` service. `scripts/entrypoint.sh` exports only `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR` (lines 350-352), then runs `exec node` (line 353). No file in the repo sets `NODE_ENV` (grep).
- **C13 The dev API and its proxy.** `main.ts:8` binds `0.0.0.0:8080`. `README.md:17` says so: "The dev API listens on `0.0.0.0:8080`". `apps/web/proxy.conf.mjs:5` sets `API_TARGET = 'http://127.0.0.1:8080'` and sets no `changeOrigin`, so the Host header reaches the API unchanged.
- **C14 The controllers read the cookie themselves.** `setup-status.controller.ts`: `getStatus` at 22-26 and `continueSetup` at 29-34 both call `requireSession` (36-46), which runs `this.signer.verify` on the cookie. `setup-session.controller.ts`: the identity route is at 101-118, marked `@Public()` at line 104, and checks `isLoopbackHost(host)` and `signer.verify(cookie)` at lines 109-110. It returns `{via: 'loopback'}` at line 117.
- **C15 The Shell reads those routes.** `apps/web/src/app/shell/landing.ts:49` reads `SETUP_STATUS_ROUTE` and navigates to `/setup` when the setup is incomplete. `apps/web/src/app/shell/sse-client.ts:191` probes the same route, and a 401 navigates to setup (`sse-client.ts:200`). `apps/web/src/app/features/setup-auth/setup-page.ts:346` and `settings-page.ts:221` read `IDENTITY_ROUTE`.
- **C16 The existing guard tests.** `setup-auth-guard.test.ts`: constants at 28-39 (`HOST`, `ORIGIN`, `CSP`, `MAIN`, `ECHO_BODY`, `FOREIGN_HOSTS`). Criterion 1 at 112, criterion 3 at 225, criterion 4 at 281, criterion 5 at 318, criterion 6 at 413, criterion 7 at 484. The invariant tests are `invariant-get-head.test.ts` and `invariant-mutation-guard.test.ts`. `token-guard-gate.test.ts` is the gate test. Not read line by line: `setup-auth-token.test.ts` and the SAU-05 and SAU-06 tests (see section 7, facts not checked).
- **C17 The contract count.** `packages/contracts/test/platform.schema.test.ts:263-268`: the test "lists the 14 SCRIBA_* names" (line 264) checks `toHaveLength(14)` (line 266). `packages/contracts/test/boot.test.ts` checks presence only.
- **C18 Test helpers.** `apps/api/test/guard-request.ts`: `send` sends the Host as given (line 29 area). `sessionCookie` (lines 80-98) uses the handshake with `Host: 127.0.0.1:8080`, which is public and unaffected by the flag. `apps/api/test/localapi-fake.ts`: `startFakeLocalApi`, `use(fixture)` (line 15), `hits()` (line 16).
- **C19 The README.** `## Getting started` is at line 5, the `npm run dev` command at line 11, the dev paragraph at line 17 (it names `0.0.0.0:8080`), `## Security notes` at line 83. `scripts/recovery-docs.test.mjs` reads `## Recovery` and `## Security notes` only, so a new paragraph under `## Getting started` breaks no check.
- **C20 Other drafts and planned units.** `plans/TRG-14.md` (planned) changes `apps/web/package.json`, the lockfile and the tool-registry files. `plans/PST-20.md` (draft) says at line 67 that it changes no contract, API file or `package.json`. Neither touches a file of section 3. `plans/SAU-18.md` (planned) changes the nine files of its section 4 (rows 1-9). Its worktree `scriba-prototype-wt/SAU-18` has uncommitted edits to `bootstrap.ts`, `host-frame.middleware.ts`, `request-policy.ts`, `setup-auth.guard.ts`, `setup-auth.module.ts`, `setup-session.controller.ts`, `setup-status.controller.ts`, `create-test-app.ts`, and a new `setup-auth-tailnet.test.ts`. This was read with `git --no-optional-locks status --short` only. The worktree was not changed and its code was not read.
- **C21 SAU-18 facts.** D17 is at `plans/SAU-18.md:78`. The requirement for this planner is section 7, line 147, which asks this plan to own a dev-mode test on a tailnet Host (section 5, E3). Section 8 at lines 151-156 lists the shared files. Section 6 at line 129 says that SAU-18 adds no D17 test.
- **C22 The Navigator entries.** `plans/DECISIONS.md:5508-5513` (D17 and the unblock), `5515-5518` (open point 3). No entry on SAU-22 exists.
- **C23 The fake LocalAPI and the static fixture.** `apps/api/test/fixtures/static/index.html` exists, so `staticRoot` works in the tests.

Assumed facts:

- **A1** The base images (`node:26-slim`, `node:26`) set no `NODE_ENV`. Not checked: no image was pulled or inspected. The repo sets none (C12).
- **A2** A browser sends an `Origin` header on a cross-site POST, and a POST without a body needs no preflight (Fetch standard). Not run in a browser. It is the basis of open point 2.
- **A3** A plain HTTP client, such as `curl` or a device on the LAN, can send any `Host` header. Not run. It is the basis of open point 1.
- **A4** The API can listen on `127.0.0.1` and `npm run dev` still works, because the proxy target is `127.0.0.1:8080` (C13). Not run. It is the basis of the option in open point 1.
- **A5** The Shell's dev-mode behaviour with the status and identity routes answering 200 is as C15 describes. Not observed, because no browser run was made. The local check in section 4, step 13, observes it.

## 3. Files to create or change

Only these paths change. Nothing else is staged.

| # | Path | New or modified | Change | Decision |
|---|---|---|---|---|
| 1 | `packages/contracts/src/platform/env.ts` | modified | Adds `SCRIBA_DEV_AUTH: '0'` to `SCRIBA_ENV_DEFAULTS`, with a comment "app (dev only); never set in the image or compose". | D4 |
| 2 | `packages/contracts/test/platform.schema.test.ts` | modified | Lines 264-266: the title says 15, and `toHaveLength(15)`. The only change to an existing test file. | D4, D11 |
| 3 | `apps/api/src/modules/platform/boot/env.ts` | modified | `ScribaEnv.SCRIBA_DEV_AUTH: boolean`. A `devAuth` rule, `z.enum(['0', '1'], {error: 'expected 0 or 1'}).transform((value) => value === '1')`. The read in `parseEnv`. The NODE_ENV refusal after the read. | D2, D3, D5 |
| 4 | `apps/api/src/modules/setup-auth/request-policy.ts` | modified | `RequestPolicy` gains `devAuth: boolean`. `buildRequestPolicy` returns `devAuth: env.SCRIBA_DEV_AUTH`. `originFor` and the rest are unchanged. | D1 |
| 5 | `apps/api/src/modules/setup-auth/setup-auth.guard.ts` | modified | The dev branch: the cookie is not read, `req.identity = {via: 'loopback'}`, and the Origin check is skipped. | D6 |
| 6 | `apps/api/src/modules/setup-auth/setup-status.controller.ts` | modified | `getStatus` and `continueSetup` take `@RequestIdentity()`. The cookie check is replaced. The `cookieValue` import and the signer constructor parameter are removed when unused. | D7 |
| 7 | `apps/api/src/modules/setup-auth/setup-session.controller.ts` | modified | The identity route takes `@RequestIdentity()`, and the `host` and `cookie` parameters go. The `cookieValue` import goes when unused. The handshake and its `isLoopbackHost` use stay. | D7 |
| 8 | `apps/api/src/bootstrap.ts` | modified | One `process.stderr.write` line after `ensureAppState(env)`, when the flag is on. | D8 |
| 9 | `package.json` | modified | The `dev` script gets `SCRIBA_DEV_AUTH=1` inside the `node --watch` command. | D9 |
| 10 | `README.md` | modified | One paragraph under `## Getting started`, after the `npm run dev` paragraph (line 17). | criterion 6 |
| 11 | `apps/api/test/setup-auth-dev-mode.test.ts` | new | The six criterion tests, and the extras E1, E2 and (once SAU-18 is on main) E3. | section 5 |
| 12 | `scripts/dev-auth-docs.test.mjs` | new | The README test (criterion 6) and the image and compose check (E4). It runs in the root `test` script. | section 5 |

Not changed, on purpose: `setup-auth.module.ts` (the flag reaches the policy through `env`, so the factory at lines 52-56 is unchanged), `host-frame.middleware.ts`, `create-test-app.ts`, `guard-request.ts`, every existing test file, `Dockerfile`, `deploy/**`, `scripts/entrypoint.sh`, `scripts/build-image.sh`, `apps/web/**`, `units/**`, `modules/**`, and every plan except `plans/SAU-22.md`.

## 4. Method

Work in a worktree of `unit/SAU-22` cut from `main`, made by the orchestrator. Run `npm ci` there. Before step 1, run `grep -rn "devAuth\|SCRIBA_DEV_AUTH" apps packages package.json` in the worktree. It must print nothing, or the base is wrong and the run stops. Each step ends with its commit. Code commits use `feat(SAU-22): …`, as `prompt.md` requires. Contract changes need `npm run build -w @bbartolome/scriba-contracts` before any API test, because the API reads the contracts from `dist`.

1. **Baseline.** Run `npm run build -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-api && node --test 'scripts/*.test.mjs'`. Record the counts. Expected: all pass.
2. **Contract (D4).** Edit `packages/contracts/src/platform/env.ts` and `packages/contracts/test/platform.schema.test.ts` (rows 1 and 2). Rebuild the contracts, then run `npm test -w @bbartolome/scriba-contracts`. Expected: pass, with 15 names. Commit `feat(SAU-22): SCRIBA_DEV_AUTH in the env contract`.
3. **Parse and refuse (D2, D3, D5).** Edit `boot/env.ts` (row 3): the `ScribaEnv` field, the `devAuth` rule, the read in `parseEnv` next to `SCRIBA_DEV_ORIGINS`, and the NODE_ENV refusal after it. Run `npm run build -w @bbartolome/scriba-api` (this type-checks). Commit `feat(SAU-22): parse SCRIBA_DEV_AUTH and refuse it when NODE_ENV is production`.
4. **Policy (D1).** Edit `request-policy.ts` (row 4): `devAuth` on `RequestPolicy` and in the returned object. Build. Commit `feat(SAU-22): carry devAuth on REQUEST_POLICY`.
5. **Guard (D6).** Edit `setup-auth.guard.ts` (row 5). Outline:

   ```ts
   if (this.policy.devAuth) {
     req.identity = { via: 'loopback' }; // dev mode: the cookie is not read
   } else {
     // the existing cookie verification, the identity and the 401, unchanged
   }
   if (!this.policy.devAuth && !SAFE_METHODS.includes(req.method)) {
     // the existing Origin check, unchanged
   }
   ```

   Run `npm test -w @bbartolome/scriba-api`. Expected: every existing test passes with the flag unset. Commit `feat(SAU-22): dev mode skips the guard's cookie and Origin checks`.
6. **Controllers (D7).** Edit `setup-status.controller.ts` and `setup-session.controller.ts` (rows 6 and 7). Each controller gets a private `requireIdentity(identity: Identity | undefined): void` that throws `ModuleError(SETUP_AUTH_ERROR_CODES.REQUIRED, SETUP_AUTH_ERROR_STATUS.AUTH_REQUIRED, 'Not signed in.')` when the identity is undefined. `getStatus` and `continueSetup` take `@RequestIdentity() identity: Identity | undefined` and call it. The identity route takes `@RequestIdentity() identity: Identity | undefined`, calls the same check and returns the identity. Remove the imports and the constructor parameter that become unused. Run the whole API suite. Expected: every existing test passes with no edit. Commit `feat(SAU-22): status, Continue and identity accept the guard's identity`.
7. **Warning (D8).** Edit `bootstrap.ts` (row 8). One line, after `ensureAppState(env)`. Build. Commit `feat(SAU-22): warn at boot when dev mode is on`.
8. **Tests (section 5).** Write `apps/api/test/setup-auth-dev-mode.test.ts` (row 11) with the six criterion tests and E1, E2. Run `npm test -w @bbartolome/scriba-api -- setup-auth-dev-mode`. Expected: pass. Commit `feat(SAU-22): dev-mode guard tests`.
9. **Dev script (D9).** Edit `package.json` (row 9). Add `SCRIBA_DEV_AUTH=1` inside the `node --watch apps/api/dist/main.js` command, next to `SCRIBA_DEV_ORIGINS`. The criterion 5 test of step 8 reads the script. Commit `feat(SAU-22): npm run dev sets SCRIBA_DEV_AUTH=1`.
10. **Docs and image check (criterion 6, D10).** Write `scripts/dev-auth-docs.test.mjs` (row 12) and add the paragraph to `README.md` (row 10). Run `node --test scripts/dev-auth-docs.test.mjs`. Expected: pass. Commit `feat(SAU-22): document SCRIBA_DEV_AUTH as local-only`.
11. **Tailnet test (E3, section 6 rule 9).** Only when SAU-18's guard is on main (`grep -n "tailnet" apps/api/src/modules/setup-auth/setup-auth.guard.ts` shows the tailnet branch). Otherwise hold E3 and say so in the report. Add E3 to the test file, run it, and commit `feat(SAU-22): dev mode keeps the tailnet identity rule`.
12. **Checks.** Run `npm run build -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-api`, `node --test 'scripts/*.test.mjs'`, `npm run lint -w @bbartolome/scriba-api`, and `npx prettier --check package.json README.md apps/api packages/contracts scripts`. Expected: exit 0 each.
13. **Criterion 5, local run (not automated).** Run `npm run dev` once from the worktree. Then run `curl -s -o /dev/null -w '%{http_code}' -H 'Host: localhost:4200' http://localhost:4200/api/setup-auth/status`, and the same for `/api/setup-auth/identity`. Expected: 200 and 200, with no cookie. Stop the run and record both codes in the PR body. If open point 1 is decided as option (a), this run also shows that the proxy still reaches the API.
14. **Scope.** Run `git diff --name-only main`. Expected: the rows of section 3, and nothing else. Run `git diff --name-only main -- apps/api/test packages/contracts/test`. Expected: `setup-auth-dev-mode.test.ts` (new) and `platform.schema.test.ts` only.
15. **Stop conditions.** Report `PLAN DOES NOT WORK` and stop if: an existing test needs an edit; the step 6 change breaks an existing SAU-05 or SAU-06 test; or a dev-mode test cannot reach 200 without a cookie after step 6.

## 5. Acceptance criteria tests

All tests in section 5 use `createTestApp` (D12) unless they spawn `dist/main.js`. Each assertion checks the status and `error.code`, as `setup-auth-guard.test.ts` does. `ECHO_BODY` is `{"count":1,"intervalMs":0}` (C16). The library is `mkdtemp` and is removed in `finally`, as in C16. The file for criteria 1 to 5 and E1 to E3 is `apps/api/test/setup-auth-dev-mode.test.ts`. The file for criterion 6 and E4 is `scripts/dev-auth-docs.test.mjs`.

**Criterion 1 (unit line 28): unset means the production guard.**
Test name: `criterion 1: with SCRIBA_DEV_AUTH unset or 0, a cookie-less GET answers 401 AUTH_REQUIRED, and with a valid cookie a POST with a foreign or missing Origin answers 403 AUTH_ORIGIN_REJECTED`.
Asserts: for `env: {}` and for `env: {SCRIBA_DEV_AUTH: '0'}`, GET `VERSION_ROUTE` with no cookie gives 401 `AUTH_REQUIRED`. With `sessionCookie(app, library)`, POST `ECHO_ROUTE` with `Origin: https://evil.example` gives 403 `AUTH_ORIGIN_REJECTED`, and POST with no Origin gives 403. Control: POST with the right Origin `http://127.0.0.1:8080` gives 202.

**Criterion 2 (unit line 29): dev mode admits a cookie-less read and a mutation with no Origin.**
Test name: `criterion 2: with SCRIBA_DEV_AUTH=1, a cookie-less GET of VERSION_ROUTE, SETUP_STATUS_ROUTE and IDENTITY_ROUTE gives 200 with the identity loopback, and a cookie-less POST to ECHO_ROUTE with no Origin gives 202`.
Asserts: `createTestApp({env: {SCRIBA_DEV_AUTH: '1'}})`, Host `127.0.0.1:8080`, no cookie. GET `VERSION_ROUTE` gives 200. GET `SETUP_STATUS_ROUTE` gives 200 (this needs D7). GET `IDENTITY_ROUTE` gives 200 with body `{via: 'loopback'}` (D7). POST `ECHO_ROUTE` with `ECHO_BODY` and no Origin gives 202.

**Criterion 3 (unit line 30): dev mode keeps the Host allowlist, the CORS absence and the frame policy.**
Test name: `criterion 3: with SCRIBA_DEV_AUTH=1, every foreign Host gets 403 AUTH_HOST_REJECTED, no response carries an access-control-* header, and every response carries frame-ancestors 'none'`.
Asserts: `createTestApp({env: {SCRIBA_DEV_AUTH: '1'}})`. For each Host in `['evil.example:8080', '127.0.0.1:9999', 'scriba:8080', '127.0.0.1', 'localhost:9999', 'localhost:4200']`: GET `VERSION_ROUTE` gives 403 `AUTH_HOST_REJECTED` and CSP `frame-ancestors 'none'`. Then, with Host `127.0.0.1:8080`: a preflight OPTIONS to `VERSION_ROUTE` with `Origin: https://evil.example` and `Access-Control-Request-Method: GET` (sent with the `headers` option), a GET of `VERSION_ROUTE` (200), and the 403 above. None of these replies has a header whose name starts with `access-control-`, and each has the CSP header. The OPTIONS status is not asserted (SAU-04 decision 14).

**Criterion 4 (unit line 31): the boot refuses dev mode in production.**
Test name: `criterion 4: spawning dist/main.js with SCRIBA_DEV_AUTH=1 and NODE_ENV=production exits 1 with stdout empty and one stderr line; without the flag the same production boot serves a cookie-less request with 401`.
Asserts (the spawn): the env is `{SCRIBA_BOOKS_DIR, SCRIBA_PACKS_DIR, SCRIBA_EXAMPLES_DIR` (three temp folders), `SCRIBA_LOG_LEVEL: 'error'`, `SCRIBA_DEV_AUTH: '1'`, `NODE_ENV: 'production'}`, with a timeout of 8000 ms (the pattern of C9). `status` is 1. `stdout` is `''`. `stderr.trim()` equals `Invalid SCRIBA_DEV_AUTH "1": dev mode is refused when NODE_ENV is production.` No line matches `/^\s+at /` (C7). Control (in-process): `createTestApp({env: {NODE_ENV: 'production'}})` boots, and GET `VERSION_ROUTE` with no cookie gives 401.

**Criterion 5 (unit line 32): `npm run dev` serves the app with no setup URL step.**
Test name: `criterion 5: the dev script sets SCRIBA_DEV_AUTH=1 next to SCRIBA_DEV_ORIGINS for the API process, and with that env a cookie-less status, identity and mutation on localhost:4200 succeed`.
Asserts: (a) read `package.json` from `resolve(__dirname, '..', '..', '..', 'package.json')`, take `scripts.dev`, and match the quoted command `/"([^"]*node --watch apps\/api\/dist\/main\.js)"/`. The captured command contains `SCRIBA_DEV_AUTH=1` and `SCRIBA_DEV_ORIGINS=http://localhost:4200`. (b) `createTestApp({env: {SCRIBA_DEV_AUTH: '1', SCRIBA_DEV_ORIGINS: 'http://localhost:4200', SCRIBA_SETUP_URL_BASE: 'http://localhost:4200'}})`, with Host `localhost:4200`: GET `SETUP_STATUS_ROUTE` gives 200, GET `IDENTITY_ROUTE` gives 200 with `{via: 'loopback'}`, and POST `ECHO_ROUTE` with `Origin: http://localhost:4200` gives 202. The test does not run `npm run dev`, which starts watchers and a web server. The real check is section 4, step 13, recorded in the PR.

**Criterion 6 (unit line 33): the README documents the flag as local-only.**
Test name (file `scripts/dev-auth-docs.test.mjs`): `criterion 6: the README paragraph that names SCRIBA_DEV_AUTH says local only and names NODE_ENV=production`.
Asserts: the `## Getting started` section of `README.md` has a paragraph that contains `SCRIBA_DEV_AUTH`. That paragraph contains `local`, `only` and `NODE_ENV=production`. The section reader is the one `recovery-docs.test.mjs` uses (`sectionOf`).

**E1 (extra, not a criterion): the startup warning.**
Test name: `E1: with SCRIBA_DEV_AUTH=1 the boot writes the dev-mode warning to stderr, and with the flag unset it writes no such line`. In-process, `vi.spyOn(process.stderr, 'write')`. Asserts one call containing `SCRIBA_DEV_AUTH=1: dev mode is on` with the flag on (`SCRIBA_LOG_LEVEL: 'error'`), and none with the flag unset. Reason: D8.

**E2 (extra): the value rule.**
Test name: `E2: SCRIBA_DEV_AUTH=true is refused with the expected 0 or 1 message`. `createTestApp({env: {SCRIBA_DEV_AUTH: 'true'}})` rejects with `Invalid SCRIBA_DEV_AUTH "true": expected 0 or 1.` Reason: D2.

**E3 (extra, held until SAU-18 is on main): the tailnet rule holds in dev mode.**
Test name: `E3: with SCRIBA_DEV_AUTH=1 and the fake LocalAPI in running-certs, a tailnet GET of VERSION_ROUTE without the login header gets 403 AUTH_TAILNET_IDENTITY_MISSING, with the login header and no cookie gets 200, and a tailnet POST with no Origin or with http:// gets 403 AUTH_ORIGIN_REJECTED`. The fake is `startFakeLocalApi` (C18), and the setup is that of `setup-auth-tailnet.test.ts`, the file SAU-18 adds. Reason: D13 and SAU-18 section 7.

**E4 (extra, in `scripts/dev-auth-docs.test.mjs`): the flag never reaches the image or compose (D10).**
Test name: `E4: no file that makes the image or the stack names SCRIBA_DEV_AUTH`. Reads `Dockerfile`, every file under `deploy/`, `scripts/entrypoint.sh` and `scripts/build-image.sh`, and asserts that none contains `SCRIBA_DEV_AUTH`.

## 6. Downstream agreement and the either-order rules

The brief asks that the plan be correct whether SAU-18 lands first or SAU-22 does. Each shared file has one rule.

1. **`request-policy.ts` (SAU-18 row 1; SAU-22 row 4).** SAU-18 replaces `originFor` with `admit`, changes `buildRequestPolicy` to `(env, tailnet)`, and adds `TailnetSource` and `HostEntry`. SAU-22 adds `devAuth` to the interface and to the returned object, and reads only `env`. Either order: the second lander keeps the first's members and adds its own. The returned object then holds `admit` and `devAuth`.
2. **`setup-auth.guard.ts` (SAU-18 row 3; SAU-22 row 5).** SAU-18 makes `canActivate` async and puts the tailnet branch first (D17). SAU-22's dev branch belongs on the non-tailnet path only.
   - SAU-18 first: SAU-22's branch goes inside the non-tailnet branch, which is where the cookie is read. The tailnet branch is untouched.
   - SAU-22 first: SAU-18 puts its tailnet branch above the `devAuth` branch, so the tailnet path never reads `devAuth`. Its non-tailnet path keeps SAU-22's skip.
   - Both orders give the same behaviour: on a tailnet Host, dev mode changes nothing (E3).
3. **`setup-status.controller.ts` and `setup-session.controller.ts` (SAU-18 rows 5 and 6; SAU-22 rows 6 and 7).** The two edits are the same, in the form given in section 4, step 6, so either lander takes the other's version without a conflict. If SAU-18 is on main when step 6 runs, step 6 is already done: check with `grep -n "RequestIdentity" apps/api/src/modules/setup-auth/setup-status.controller.ts` and skip the step.
4. **`bootstrap.ts` (SAU-18 row 7; SAU-22 row 8).** SAU-18 replaces the early `buildRequestPolicy(env)` call (line 36) and its comment (line 35), and adds the `app.use(hostFrameMiddleware(...))` line. SAU-22 adds one line after `ensureAppState(env);` (line 34). The two edits sit on adjacent lines, so the second lander keeps both. The refusal is in `parseEnv` (line 33), which runs first in both orders. Both orders therefore refuse a bad `SCRIBA_DEV_AUTH` before `checkDevOrigins` and before `NestFactory.create`.
5. **`setup-auth.module.ts` (SAU-18 row 4).** SAU-18 changes the inject list of the `REQUEST_POLICY` factory. SAU-22 changes nothing in the module, because the flag comes through `env`. No conflict.
6. **`host-frame.middleware.ts` and `create-test-app.ts` (SAU-18 rows 2 and 8).** SAU-22 changes neither. The Host check and the CSP are the same in dev mode, so criterion 3 holds in both orders.
7. **`env.ts`, the contract and its test, `package.json`, `README.md`.** Only SAU-22 changes them among the units checked (SAU-18 section 4 and C7; TRG-14 and PST-20 per C20). No rule is needed.
8. **Test files.** SAU-18's `setup-auth-tailnet.test.ts` and SAU-22's `setup-auth-dev-mode.test.ts` are separate files. Neither edits the other.
9. **The D17 test (SAU-18 section 7).** E3 is written in SAU-22's file. If SAU-22 lands first, E3 is not committed until SAU-18's tailnet branch is on main; then it is committed on top as `feat(SAU-22): dev mode keeps the tailnet identity rule`. SAU-18 keeps its "no D17 test" text (`plans/SAU-18.md:129`).
10. **Downstream units.** SAU-19 (blocked by SAU-18) adds its check in the tailnet branch and is untouched by SAU-22. SAU-21 (tailnet gate, real tailnet) must run with the flag unset, because its checks cover the production guard. SAU-20 needs no API change, so SAU-22 does not affect it.

## 7. Open points

Points 1 to 4 are safety or scope questions. They need the owner's decision before the implementation starts. The plan follows the unit as written until the decision is made.

1. **The dev API is reachable from the LAN (decision needed).** `main.ts:8` binds `0.0.0.0:8080`, and `README.md:17` documents it. With the flag on, a device on the LAN that sends `Host: 127.0.0.1:8080` or `localhost:8080` reaches every guarded route with no cookie (A3). Option (a): listen on `127.0.0.1` when the flag is on. The proxy target is `127.0.0.1:8080` (C13), so `npm run dev` still works (A4), but the change touches `main.ts` and the README. Option (b): accept it and say so in the README. Recommendation: (a).
2. **Cross-site browser requests (decision needed).** The unit skips the Origin check on every mutation. A page on another site can then POST to `http://localhost:8080` (its Host passes the allowlist, A2) and reach any mutation that reads no body. Option: skip the Origin check only when no `Origin` header is sent, and keep the 403 for a present Origin that is not the expected one. Criterion 2 still holds (a POST with no Origin succeeds), and browsers, which always send Origin on a cross-site POST, are refused. This is a change to the unit's text, so the owner decides.
3. **NODE_ENV is set nowhere (decision needed).** The production refusal (D5) protects an environment only when that process has `NODE_ENV=production`. Nothing in the repo or the Dockerfile sets it (C12, A1). Option: `ENV NODE_ENV=production` in the Dockerfile's runtime stage. That is an image change outside the unit, so the plan does not make it.
4. **The controllers (D7, scope).** The unit does not name `setup-status.controller.ts` or the identity route, but without D7 the status route (a guarded route) and the identity route answer 401 in dev mode, and the Shell reads both (C14, C15). The plan adds the SAU-18 edit. Confirm this scope.
5. **Contract addition (D4).** `SCRIBA_DEV_AUTH` joins `SCRIBA_ENV_DEFAULTS`, and the contract count test moves from 14 to 15. Confirm this additive change to a published contract is accepted.
6. **Accepted values (D2).** The plan accepts `1` and `0`, and refuses `true` and `false`. The owner may prefer `true` and `false`, which need a second rule.
7. **Warning stream (D8).** The warning goes to stderr whatever `SCRIBA_LOG_LEVEL` is. Confirm.
8. **Criterion 5 is not run here.** The test checks the script text and the same env in-process. The real `npm run dev` check is section 4, step 13, and it must be run once before the PR.
9. **E3 waits for SAU-18 (section 6, rule 9).** If SAU-22 lands first, the tailnet dev test is held.

Facts not checked: no `npm run dev` run and no browser run (A5); the base images' `NODE_ENV` (A1); the cross-site and LAN behaviour of browsers and clients (A2, A3); the existing `setup-auth-token.test.ts` and the SAU-05 and SAU-06 tests, which were not read line by line (step 6 checks them by running them); the code of the SAU-18 worktree, which was read only by `git status`.
