---
id: SAU-22
status: done
unit: units/SAU-22-guard-dev-mode.md
sources: units/SAU-22-guard-dev-mode.md (on main, unchanged since fb19867); modules/setup-auth.md (lines 3, 32, 39, 49, 86-91, 96); units/README.md (lines 91, 136, 139); units/SAU-19-owner-allowlist.md, units/SAU-21-tailnet-gate.md (decisions and criteria); plans/SAU-18.md (done at 60a665f; D7, D16, D17, sections 6, 7 and 8); plans/SAU-19.md (done; section 7); plans/SAU-20.md and plans/SAU-21.md (done; their notes on SAU-22); plans/DECISIONS.md (lines 1524-1527, 5508-5513, 5515-5518, 5520-5528, 5792-5796, and a grep for SAU-22, devAuth and SCRIBA_DEV_AUTH); plans/SAU-04.md (decisions 7, 14, 18); plans/CEX-01.md, plans/GRR-10.md, plans/GRR-16.md, plans/TRG-14.md (planned) and plans/GNP-13.md (draft) (file overlap); prompt.md (Revise, "When a plan does not work", "Changes of units that the reviser can make", "Criteria that you cannot test"); the code, tests and docs named in section 2, read on main at 8b7c214
---

# SAU-22 plan — guard dev mode (draft)

Base: `main` at `8b7c214`. Revision 1 read the code at `0ef06b3`. Between `0ef06b3` and `8b7c214`, SAU-19 (owner allowlist), SAU-20 and SAU-21 went to main (all three `status: done`). Of the paths that this plan reads or changes, only two changed: `apps/api/src/modules/setup-auth/setup-auth.guard.ts` (SAU-19 adds `checkAllowlist` and the `SetupStatusService` constructor parameter, +22 lines) and `modules/setup-auth.md` (SAU-21 adds the section "Real-tailnet and socket checks" at lines 66-84, so the later lines move by 20). `git diff --stat 0ef06b3 8b7c214` is empty for `Dockerfile`, `deploy/compose.yaml`, `scripts/entrypoint.sh`, `scripts/build-image.sh`, `main.ts`, `bootstrap.ts`, `request-policy.ts`, `host-frame.middleware.ts`, `setup-auth.module.ts`, both controllers, `create-test-app.ts`, `guard-request.ts`, `localapi-fake.ts`, `setup-auth-tailnet.test.ts`, `setup-auth-guard.test.ts`, `proxy.conf.mjs`, `angular.json`, the unit file and `units/README.md`. `boot/env.ts`, the contract env file and its test, the root `package.json` and `README.md` were checked by reading them at `8b7c214`. Every line number below is at `8b7c214`.

Revision 2 (Opus reviser):

- Open points 1 and 2 are settled by the user's decision (`plans/DECISIONS.md:5792-5796`): the plan follows the unit as written. Dev mode applies to every admitted non-tailnet Host and peer (no bind or peer condition), and it skips the Origin check on every mutation (unit line 21). The options that keep the unit as written, 1(c) and 2(b), also say that the README states the exposure; the README paragraph (step 9) does so. This is documentation only and changes no behaviour. The stop condition on the Navigator decision (step 13) is removed.
- The guard facts (C3, D6, step 5) follow SAU-19's guard on main: the allowlist call (guard line 102) stays above the Origin `if`, as `plans/SAU-19.md` section 7 says.
- Line numbers of the module file, the spawn test and the Shell are corrected. The other-plans check (C20, section 8) is redone at `8b7c214`. Section 6 records SAU-19, SAU-20 and SAU-21 as done.

Revision 1 (Opus reviser):

- SAU-18 landed first, so the order is fixed. The draft's controller edit (draft D7, step 6, rows 6 and 7) is SAU-18's D7 and is on main, so it leaves this plan. The guard step now follows SAU-18's guard structure (D6). E3, the D17 test, is no longer held.
- The dev script step now comes before the test step, because the criterion 5 test reads the script. The draft ran that test one step before the script changed.
- The criterion 6 test checks the phrase "local only" or "local-only" instead of the two words anywhere in the paragraph.
- Criterion 5 has a local procedure, P5 (section 4, step 11), with commands and expected output. Its checkbox waits for P5.
- Open points 3 to 9 are settled in the plan (section 7). Open points 1 and 2 were left open for the Navigator, which was not consulted. Revision 2 settles them by the user's decision (see above).
- The sections are renumbered. Section 8 is "Changes by other drafts and planned units to the same files". Section 9, "Review parts", is new.

## 1. Decisions this plan follows

Each decision gives its source. "Unit" is `units/SAU-22-guard-dev-mode.md`. "Module" is `modules/setup-auth.md`. "SAU-18" is `plans/SAU-18.md` (done). "Guard" is `apps/api/src/modules/setup-auth/setup-auth.guard.ts`.

- **D1 The flag.** `SCRIBA_DEV_AUTH` is a boolean env, parsed in `apps/api/src/modules/platform/boot/env.ts` and carried on `REQUEST_POLICY` as `devAuth`. Unset means false. Source: unit line 18.
- **D2 Accepted values (settled, open point 6).** `1` turns dev mode on. `0` and unset leave it off. The contract default is `'0'`. Any other value, an empty string and `true` included, is a `BootError` with the text `Invalid SCRIBA_DEV_AUTH "<raw>": expected 0 or 1.`, which `read()` produces (`env.ts:68-81`). In the unit's decisions and criteria, "set" means that the flag is on (`1`): criterion 2 ("With it set, a cookie-less GET to a guarded route succeeds") is true only for an active dev mode. Reason: the dev script sets `1` (unit line 24). The only boolean rule on main, `watcher` (`env.ts:51-53`), takes `true` and `false`, so a new rule is needed either way, and `0` or `1` matches the value that the unit writes.
- **D3 Where it is parsed.** In `parseEnv` (`env.ts:84-154`). The read comes before the returned object, as the `SCRIBA_PORT` read does (`env.ts:85-90`), and the D5 refusal comes right after the read. The field goes into the returned object after `SCRIBA_DEV_ORIGINS` (`env.ts:129-134`). Reason: the refusal reads `NODE_ENV` from the `source` record, which only `parseEnv` receives. `parseEnv` is the first call in `bootstrap` (`bootstrap.ts:37`), before `ensureAppState` writes anything and before `NestFactory.create`.
- **D4 Contract name (settled, open point 5).** `read()` takes a `ScribaEnvName` (`env.ts:70`), which is the key set of `SCRIBA_ENV_DEFAULTS` (`packages/contracts/src/platform/env.ts:22`), and `parseEnv` "parses every SCRIBA_* name that the contract lists" (`env.ts:83`). So `SCRIBA_DEV_AUTH: '0', // app (dev only); never set in the image or compose` joins the `// app` group after `SCRIBA_DEV_ORIGINS`, the precedent for a dev-only name (contract line 17). This is an addition only (expand–contract, `units/README.md:136`). The count test moves from 14 to 15 (`packages/contracts/test/platform.schema.test.ts:264` and `:266`). No other code reads the key set: `SCRIBA_ENV_DEFAULTS` is used only by `boot/env.ts` and the contract tests, and `packages/contracts/test/boot.test.ts:53` checks only that the export exists.
- **D5 Refusal.** Unit line 23, criterion 4. In `parseEnv`, right after the read: when the flag is on and `source.NODE_ENV === 'production'`, throw `BootError` with the text `Invalid SCRIBA_DEV_AUTH "1": dev mode is refused when NODE_ENV is production.` `main.ts:9-14` catches it, writes the message to stderr and exits 1. The shape follows the `SCRIBA_DEV_ORIGINS` refusal (`request-policy.ts:86-88`; SAU-04 decision 7). The image sets no `NODE_ENV` (C12). Open point 3 is settled with no image change (section 7).
- **D6 Guard.** Unit lines 19-21 and SAU-18 D17. Dev mode applies only to an admitted Host that is not the tailnet Host: `devMode = this.policy.devAuth && entry?.tailnet === false`, with the `entry` of guard line 80. When `devMode` is true, the identity is a new `{via: 'loopback'}`, `cookieIdentity` (guard lines 133-139) is not called, and the Origin `if` (guard lines 103-105) does not call `checkOrigin`. As the unit writes it (open points 1 and 2, settled), there is no other condition: no peer address, no bind address, and no Origin check on any mutation in dev mode. These stay as they are: the tailnet branch (guard lines 81-83 and 87-93), the allowlist call `if (tailnet && identity !== undefined) this.checkAllowlist(identity);` (guard line 102, SAU-19; it never runs for a dev-mode request, whose entry is not tailnet), the Host check in the hook (`host-frame.middleware.ts:32-33`, not edited), the absence of `Access-Control-*` headers, and `frame-ancestors 'none'` (unit line 22; module line 3). When `entry` is undefined in the guard (a Host that the hook admitted and that the guard's later `admit` does not, such as a tailnet name that went away), `devMode` is false, so the production rule applies.
- **D7 Controllers (settled, open point 4).** SAU-18 D7 is on main. The status and Continue routes (`setup-status.controller.ts:19-44`) and the identity route (`setup-session.controller.ts:101-114`) read the guard's identity through `@RequestIdentity()` and read no cookie. The guard attaches the identity before the public check (guard line 85), so in dev mode these three routes answer 200 with no cookie. SAU-22 changes neither controller. Without SAU-18 D7, criterion 5 could not pass: the Shell reads the status route on load (`apps/web/src/app/shell/landing.ts:49`) and the identity route on `/setup` (`setup-page.ts:346`), and a 401 sends it to the sign-in notice (C15). A guard-only skip would pass criterion 2 on `VERSION_ROUTE` alone, but the criterion 2 test below also reads the status and identity routes.
- **D8 Warning (settled, open point 7).** Unit line 23 ("a loud startup warning is logged whenever dev mode is active"). When the flag is on, `bootstrap` writes one line to stderr right after `checkDevOrigins(env.SCRIBA_DEV_ORIGINS);` (`bootstrap.ts:40`), before `NestFactory.create`: `SCRIBA_DEV_AUTH=1: dev mode is on. The setup cookie and the Origin check are skipped for this process. Use it for local work only.` It uses `process.stderr.write`, not `StdoutLogger`, because `StdoutLogger` drops `warn` at `SCRIBA_LOG_LEVEL=error` (`stdout-logger.ts:7-12`), and "whenever" admits no log level that hides it.
- **D9 Dev script.** Unit line 24. In the root `dev` script (`package.json:24`), `SCRIBA_DEV_AUTH=1` goes inside the quoted API command, right after `SCRIBA_DEV_ORIGINS=http://localhost:4200`.
- **D10 Never in the image or compose.** Unit line 23. Test E4 reads the files that make the image and the stack. None names the flag today (C12).
- **D11 Existing tests unchanged.** Unit line 25. No existing API test file changes. The one edit to an existing test file is the contract count test (D4), which is not a guard test.
- **D12 Test seam.** Module lines 86-91; SAU-04 decision 18. The composed app through `createTestApp`, with the flag passed in its `env` option. A spawned `dist/main.js` checks the boot refusal, as `setup-auth-guard.test.ts:561-590` does.
- **D13 The tailnet rule.** SAU-18 D17 (`plans/SAU-18.md:78`), from the Navigator (`plans/DECISIONS.md:5508-5513`). On a tailnet Host the tailnet branch runs and `devAuth` has no effect: a tailnet request without the trusted header gets 403 `AUTH_TAILNET_IDENTITY_MISSING`, and a tailnet mutation needs `Origin: https://<dnsName>`. SAU-18 left the test of this rule to this plan (`plans/SAU-18.md:129` and `:147`). It is E3.
- **D14 Open points 1 and 2: the unit as written (settled by the user, `plans/DECISIONS.md:5792-5796`).** Dev mode has no peer or bind condition, and it skips the Origin check on every mutation on an admitted non-tailnet Host (unit lines 19-21; D6). `main.ts` is not changed and keeps `0.0.0.0:8080`. The README paragraph of criterion 6 states the two effects, as options 1(c) and 2(b) of section 7 say: (1) with the flag on, any device that can reach port 8080 can call the API without the setup cookie; (2) with the flag on, any web page open in the browser can send POST requests to the local API. This is documentation only. No test asserts these two sentences: they are not in a criterion, and the criterion 6 test stays as section 5 gives it.

## 2. Facts checked and facts assumed

The reviser checked each C fact on `main` at `8b7c214` (revision 2; see the paragraph under the title for the paths that did not change since `0ef06b3`). Assumed facts are marked A.

- **C1 The unit.** Front matter: `phase: none`, `milestone: M1`, `blocked_by: []`, `unblocks: []`. Decisions at lines 18-25, criteria at lines 28-33. One commit, `fb19867`, and no revision notes. The unit names neither controller and not the Shell.
- **C2 The base.** See the paragraph under the title.
- **C3 The guard (SAU-18 and SAU-19 on main).** `GuardRequest` at lines 27-38 (`socket` at 36). `SAFE_METHODS` at 41. `SERVE_PEERS` (`127.0.0.1`, `::1`) at 44. The class comment at 54-57 (SAU-19 added line 56). The constructor at 60-65, with `SetupStatusService` (SAU-19) at 64. `canActivate` (async) at 67-107: the `/healthz` GET return at 71-73, `isPublic` at 74-79, `admit` at 80, `tailnet` at 81, the identity at 82-84, the attach at 85, the tailnet 403 at 87-93, the 401 at 94-100, the allowlist call at 102 (tailnet only), the Origin check at 103-105. `checkAllowlist` at 110-121. `tailnetIdentity` at 124-130. `cookieIdentity` at 133-139. `checkOrigin` at 142-151.
- **C4 The policy.** `request-policy.ts`: `REQUEST_POLICY` at line 5. `TailnetSource` at 8-11. `HostEntry {origin, tailnet}` at 14-17. `RequestPolicy` at 20-23, with only `admit`. `buildRequestPolicy(env, tailnet)` at 27-49, the returned object at 38-48. `tailnetEntryFor` at 53-67. `checkDevOrigins` at 70-72. `parseDevOrigins` at 81-92, with its `BootError` at 86-88. No test builds a `RequestPolicy` (grep).
- **C5 The hook.** `host-frame.middleware.ts`: the async handler at 25-48, the CSP at 31, the Host check at 32-33 (it awaits `admit`), the refusal at 34-44. Registered at `bootstrap.ts:53-57` with the policy from the Nest container (`:56`). The module's factory passes `env` and `TailscaleStatusService` to `buildRequestPolicy` (`setup-auth.module.ts:52-57`).
- **C6 The env parser.** `boot/env.ts`: `ScribaEnv` at 15-28. The rules at 41-61 (`watcher` at 51-53). `read()` at 68-81, typed with `ScribaEnvName` at 70, with its `BootError` at 78. `parseEnv` at 84-154 (the `SCRIBA_PORT` read at 85-90, `SCRIBA_DEV_ORIGINS` at 129-134). `SCRIBA_DEV_AUTH` and `devAuth` appear in no code, test or script (grep without `node_modules`, `dist` and `plans`; the only hits are the unit, `modules/setup-auth.md:32` and `units/README.md:91`). No source or test builds a full `ScribaEnv` literal. The one cast, `agent-loop-transcript.test.ts:161`, is partial and stays valid with a new field.
- **C7 Where a `BootError` is caught.** `boot-error.ts:2-7` defines it. The only catch is `main.ts:9-14`: stderr at 11, exit 1 at 12, any other error rethrown at 14. An unhandled rejection also exits 1 (the draft's check), so the test checks the stderr text, not the status alone.
- **C8 Boot order.** `bootstrap.ts`: `parseEnv` at 37, `ensureAppState` at 38, `checkDevOrigins` at 39-40, `NestFactory.create` at 42-52, the hook at 53-57, `init` at 58-64. `main.ts:8` listens on `0.0.0.0:8080`.
- **C9 The existing spawn tests.** `setup-auth-guard.test.ts:561-590` and `env-boot.test.ts` (35 lines) spawn `dist/main.js` with a replaced env, so `NODE_ENV` is unset in the child unless the test sets it. They check status 1, stdout `''`, the stderr line and no stack frame.
- **C10 The test factory.** `create-test-app.ts`: the options at 9-15 (`listenHost` at 14, added by SAU-18), the env merged over the base env at 78-87, `listen` at 91 (`127.0.0.1` by default), `baseUrl` at 93. `process.env` is not read, so the flag and `NODE_ENV` reach a test only through `env`.
- **C11 The scripts.** Root `package.json:24` (`dev`) builds the contracts and the API, then runs `concurrently` with the API command `SCRIBA_BOOKS_DIR=… SCRIBA_PACKS_DIR=… SCRIBA_EXAMPLES_DIR=… SCRIBA_DEV_ORIGINS=http://localhost:4200 SCRIBA_SETUP_URL_BASE=http://localhost:4200 node --watch apps/api/dist/main.js` and `npm run start -w @bbartolome/scriba-web` (`ng serve`, `apps/web/package.json:7`). `test` (line 25) runs the workspaces, then `node --test 'scripts/*.test.mjs'`. `apps/api/package.json:7`: `test` is the build, then `vitest run`.
- **C12 Image and compose.** The `Dockerfile` has no `ENV` line (runtime stage at 50-64). `deploy/compose.yaml`: the `scriba` service's `environment` at 49-53 lists four names, and the service has no `env_file`. The only `env_file` (8-10) is the `tailscale` service's. So a value in `.env` reaches the app only through those four names. `scripts/entrypoint.sh:350-352` exports the three directories, and line 353 runs `exec node`. No tracked file outside `plans/` names `NODE_ENV` (grep).
- **C13 The dev network.** `main.ts:8` binds `0.0.0.0:8080`, and `README.md:17` says so. `apps/web/proxy.conf.mjs:5` targets `http://127.0.0.1:8080` with no `changeOrigin`, so the API sees the browser's Host (`localhost:4200`) and a loopback peer. The `serve` target sets no `host` (`apps/web/angular.json:60-74`), so `ng serve` listens on `localhost` (A6).
- **C14 Mutations.** Every mutation route is a `POST` (48 `@Post`, and no `@Put`, `@Patch` or `@Delete`, in `apps/api/src`). Nest registers `express.urlencoded({extended: true})` next to the JSON parser (`node_modules/@nestjs/platform-express/adapters/express-adapter.js:349-354`, version 12.4.2), so a form-encoded body is parsed into an object. Some POSTs read no body, such as `SETUP_CONTINUE_ROUTE` (`setup-status.controller.ts:26-33`) and `SIGN_OUT_ROUTE` (`setup-session.controller.ts:117`). This is the basis of open point 2 and of the README sentence on web pages (step 9).
- **C15 The Shell.** `landing.ts:49` reads `SETUP_STATUS_ROUTE`. `sse-client.ts:191` probes the same route, and a 401 navigates to `/setup` (`:199-200`). `api-client.ts:104` sends a 401 to `/setup`. `setup-page.ts:346` and `settings-page.ts:240` read `IDENTITY_ROUTE`, and `setup-page.ts:373` shows the sign-in notice on a 401.
- **C16 The existing guard tests.** `setup-auth-guard.test.ts`: constants at 28-39 (`HOST`, `ORIGIN`, `CSP`, `STATIC_ROOT`, `MAIN`, `ECHO_BODY`, `FOREIGN_HOSTS` at 34-39). Criteria 1 to 7 at 112, 161, 225, 281, 318, 413 and 484. The dev-origin spawn test at 561-590. Also `token-guard-gate.test.ts`, `invariant-get-head.test.ts` and `invariant-mutation-guard.test.ts`. None sets `SCRIBA_DEV_AUTH`, so with the contract default `'0'` they keep running the production guard.
- **C17 The contract count.** `platform.schema.test.ts:263-268`: the title "lists the 14 SCRIBA_* names" (264) and `toHaveLength(14)` (266).
- **C18 Test helpers.** `guard-request.ts`: `send` sends the Host as given (line 29), with the options `origin`, `cookie`, `body`, `contentType` and `headers` (7-18). `sessionCookie` (80-98) runs the handshake with `Host: 127.0.0.1:8080`. `localapi-fake.ts`: `startFakeLocalApi` at 26, `use` and `hits` at 15-16. `setup-auth-tailnet.test.ts` (SAU-18): constants at 23-31 (`TAILNET_NAME = 'scriba-1.tail1234.ts.net'`, `LOGIN_HEADER`), `withApp` at 34-58 (a fake LocalAPI and `createTestApp` with `SCRIBA_TS_SOCKET`), `nonTailnetIPv4` at 65-76. These helpers are local to that file and not exported.
- **C19 The README.** `## Getting started` at line 5, the `npm run dev` command at 11, the dev paragraph at 17, `## Security notes` at 83. `scripts/recovery-docs.test.mjs` reads `## Recovery` and `## Security notes` only. Its `sectionOf` (lines 11-16) is local to that file.
- **C20 Other plans and branches.** At `8b7c214` the other `draft` or `planned` plans are `plans/CEX-01.md` (planned; contract files under `packages/contracts/src/compile-export/` and `project-store/`, new contract test files; its section 8c says SAU-22's two contract paths are not CEX-01 paths), `plans/GRR-10.md` (planned; `apps/web/src/app/features/graph-runner/*`, `e2e/specs/graph-canvas.e2e.ts`, `apps/web/package.json`, the lockfile; its line 240 says it changes none of SAU-22's files), `plans/GRR-16.md` (planned; `examples/nonfiction/graphs/`, e2e fixtures, API test fixtures and `graph-runner-sample-recipe.test.ts`; `package.json` and `scripts/**` not changed, line 142), `plans/TRG-14.md` (planned; `apps/web/package.json`, the lockfile and tool-registry web files) and `plans/GNP-13.md` (draft; `packages/packs/fiction/**` only; `package.json` not changed, line 54). None shares a path with section 3. PST-20, SAU-19, SAU-20 and SAU-21 are done. For the branches `unit/CEX-01`, `unit/GRR-10`, `unit/GRR-16` and `unit/TRG-14`, `git diff --name-only main...<branch>` is empty for the paths of section 3 (the contract env file and its test, `boot/env.ts`, `apps/api/src/modules/setup-auth`, `bootstrap.ts`, `package.json`, `README.md`, `scripts`). No e2e config or script runs `npm run dev` (grep), so the flag in the `dev` script reaches no automated suite. There is no `unit/SAU-22` branch.
- **C21 SAU-18 (done).** D7 at `plans/SAU-18.md:68`, D16 at `:77`, D17 at `:78`, the section 6 note at `:129`, the section 7 requirement at `:147`, the section 8 rules for SAU-22 at `:151-156`. The review record (`plans/DECISIONS.md:5520-5528`) notes that a valid cookie on an admitted non-loopback dev-origin Host now gets `{via: 'loopback'}`.
- **C22 The decision entries.** `plans/DECISIONS.md:5508-5513` (Navigator, SAU-18 D17; "No change to SAU-22 is prescribed") and `5515-5518`. The one entry with SAU-22 as its unit is `5792-5796` (the user's decision, without the Navigator: open points 1 and 2 follow the unit as written).
- **C23 Fixtures.** `apps/api/test/fixtures/static/index.html` exists.

Assumed facts:

- **A1** The base images (`node:26-slim`, `node:26`) set no `NODE_ENV`. No image was inspected.
- **A2** A browser sends an `Origin` header on each cross-origin POST, an HTML form POST included, and it sends a form POST or a POST with no body without a preflight. Not run in a browser. This is the basis of open point 2 and of the second README sentence of D14.
- **A3** A device on the LAN can reach port 8080 of the dev machine and send any Host header. Not run. This is the basis of open point 1 and of the first README sentence of D14.
- **A4** The browser and the Shell behave as C15 says when the status and identity routes answer 200. No browser run was made. P5 checks the API side.
- **A5** `npm run dev` runs in the implementer's environment, with ports 4200 and 8080 free. The reviser did not run it.
- **A6** `ng serve` with no `host` option listens on `localhost` only (the Angular CLI default). Not run.

## 3. Files to create or change

Only these paths change. Nothing else is staged.

| # | Path | New or modified | Change | Decision |
|---|---|---|---|---|
| 1 | `packages/contracts/src/platform/env.ts` | modified | `SCRIBA_DEV_AUTH: '0'` after `SCRIBA_DEV_ORIGINS` (line 17), with the comment `// app (dev only); never set in the image or compose`. | D4 |
| 2 | `packages/contracts/test/platform.schema.test.ts` | modified | Lines 264 and 266: 15 instead of 14. | D4, D11 |
| 3 | `apps/api/src/modules/platform/boot/env.ts` | modified | `ScribaEnv.SCRIBA_DEV_AUTH: boolean`. The rule `devAuth: z.enum(['0', '1'], {error: 'expected 0 or 1'}).transform((value) => value === '1')`. In `parseEnv`: the read, the refusal, and the field in the returned object. | D2, D3, D5 |
| 4 | `apps/api/src/modules/setup-auth/request-policy.ts` | modified | `RequestPolicy` gains `readonly devAuth: boolean`. `buildRequestPolicy(env, tailnet)` returns `{admit, devAuth: env.SCRIBA_DEV_AUTH}`. Nothing else changes. | D1 |
| 5 | `apps/api/src/modules/setup-auth/setup-auth.guard.ts` | modified | `devMode` in `canActivate` (D6). The class comment (lines 54-57) gains one line on dev mode. | D6, D13 |
| 6 | `apps/api/src/bootstrap.ts` | modified | The warning line after line 40. | D8 |
| 7 | `package.json` | modified | `SCRIBA_DEV_AUTH=1` in the API command of the `dev` script. | D9 |
| 8 | `README.md` | modified | One paragraph after line 17. | criterion 6, D14 |
| 9 | `apps/api/test/setup-auth-dev-mode.test.ts` | new | The tests of criteria 1 to 5, and E1, E2 and E3. | section 5 |
| 10 | `scripts/dev-auth-docs.test.mjs` | new | The test of criterion 6, and E4. It runs in the root `test` script. | section 5 |

Not changed, on purpose: `setup-auth.module.ts` (its factory passes `env`, C5), `host-frame.middleware.ts`, `setup-status.controller.ts` and `setup-session.controller.ts` (D7), `main.ts`, `create-test-app.ts`, `guard-request.ts`, `localapi-fake.ts`, `setup-auth-tailnet.test.ts` and every other existing test file except row 2, the `Dockerfile`, `deploy/**`, `scripts/entrypoint.sh`, `scripts/build-image.sh`, `apps/web/**`, `units/**`, `modules/**`, and every plan except `plans/SAU-22.md`.

## 4. Method

Work in the worktree of `unit/SAU-22` that the orchestrator makes from `main`. Run `npm ci` there. Before step 1, run these two checks in the worktree:

- `grep -rn --exclude-dir=node_modules --exclude-dir=dist "devAuth\|SCRIBA_DEV_AUTH" apps packages package.json` prints nothing.
- `grep -n "tailnetIdentity" apps/api/src/modules/setup-auth/setup-auth.guard.ts` prints lines (SAU-18's guard is on the base).

If either check fails, the base is wrong: stop and report. Each step ends with its commit, staged by path. Code commits use `feat(SAU-22): …`. The API reads the contracts from `dist`, so run `npm run build -w @bbartolome/scriba-contracts` after step 2 and before any API build or test.

1. **Baseline.** Run `npm run build -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-api && node --test 'scripts/*.test.mjs'`. Record the counts. Expected: all pass.
2. **Contract (D4).** Edit rows 1 and 2. Rebuild the contracts, then run `npm test -w @bbartolome/scriba-contracts`. Expected: pass. Commit `feat(SAU-22): SCRIBA_DEV_AUTH in the env contract`.
3. **Parse and refuse (D2, D3, D5).** Edit row 3. Run `npm run build -w @bbartolome/scriba-api` (it type-checks `src` and `test`). Expected: exit 0. Commit `feat(SAU-22): parse SCRIBA_DEV_AUTH and refuse it when NODE_ENV is production`.
4. **Policy (D1).** Edit row 4. Build. Commit `feat(SAU-22): carry devAuth on REQUEST_POLICY`.
5. **Guard (D6, D13).** Edit row 5. Outline, in the structure of guard lines 80-105:

   ```ts
   const entry = await this.policy.admit(req.headers.host);
   const tailnet = entry?.tailnet === true;
   // Dev mode (SAU-22): only on an admitted Host that is not the tailnet Host (SAU-18 D17).
   const devMode = this.policy.devAuth && entry?.tailnet === false;
   const identity: Identity | undefined = tailnet
     ? this.tailnetIdentity(req)
     : devMode
       ? { via: 'loopback' } // the cookie is not read
       : this.cookieIdentity(req);
   // lines 85-100 unchanged: attach, the tailnet 403, the 401
   if (tailnet && identity !== undefined) this.checkAllowlist(identity); // line 102 (SAU-19), unchanged
   if (!devMode && !SAFE_METHODS.includes(req.method)) {
     this.checkOrigin(req, entry);
   }
   ```

   Run `npm test -w @bbartolome/scriba-api`. Expected: every existing test passes with the flag unset, `setup-auth-tailnet.test.ts` and `setup-auth-allowlist.test.ts` (SAU-19) included. `Identity` is already imported (guard line 12). Commit `feat(SAU-22): dev mode skips the guard's cookie and Origin checks`.
6. **Warning (D8).** Edit row 6: one `if` with one `process.stderr.write` after line 40. Build. Commit `feat(SAU-22): warn at boot when dev mode is on`.
7. **Dev script (D9).** Edit row 7. Commit `feat(SAU-22): npm run dev sets SCRIBA_DEV_AUTH=1`.
8. **API tests (section 5).** Write row 9 with the tests of criteria 1 to 5 and E1, E2 and E3. Run `npm test -w @bbartolome/scriba-api -- setup-auth-dev-mode`. Expected: pass. Commit `feat(SAU-22): dev-mode guard tests`.
9. **Docs and image check (criterion 6, D10, D14).** Add the README paragraph (row 8). It names `SCRIBA_DEV_AUTH`, says that the flag is local only and that `npm run dev` sets it, says that the boot refuses it with `NODE_ENV=production` and that it is never set in the image or compose, and has the two sentences of D14 (any device that can reach port 8080 can call the API without the setup cookie; any web page open in the browser can send POST requests to the local API) and write row 10. Run `node --test scripts/dev-auth-docs.test.mjs`. Expected: pass. Commit `feat(SAU-22): document SCRIBA_DEV_AUTH as local-only`.
10. **Checks.** Run `npm run build -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-contracts && npm test -w @bbartolome/scriba-api`, then `node --test 'scripts/*.test.mjs'`, `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check package.json README.md apps/api packages/contracts scripts`. Expected: exit 0 for each.
11. **P5, the local procedure for criterion 5.** In the worktree, on Linux (this environment), as one shell script:

    ```sh
    for url in http://127.0.0.1:8080/healthz http://localhost:4200/; do
      curl -s -o /dev/null --max-time 2 "$url" && { echo "port busy: $url"; exit 1; }
    done
    LOG=$(mktemp)
    setsid npm run dev >"$LOG" 2>&1 &
    DEV=$!
    for i in $(seq 1 240); do
      [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost:4200/healthz)" = 200 ] && break
      sleep 1
    done
    curl -s -o /dev/null -w 'app %{http_code}\n' http://localhost:4200/
    curl -s -w ' status %{http_code}\n' http://localhost:4200/api/setup-auth/status
    curl -s -w ' identity %{http_code}\n' http://localhost:4200/api/setup-auth/identity
    grep -c 'SCRIBA_DEV_AUTH=1: dev mode is on' "$LOG"
    kill -- -"$DEV"
    ```

    Expected: `app 200`; the status body and `status 200`; `{"via":"loopback"}` and `identity 200`; a count of 1 or more (`node --watch` prints the warning again after each restart). No request sends a cookie, and no setup URL is opened. A few seconds after the `kill`, `curl http://127.0.0.1:8080/healthz` fails. Record the output in the report. If the ports are busy or `npm run dev` does not reach `healthz` 200 within 240 s, do not mark criterion 5: report it (section 5, criterion 5).
12. **Scope.** Run `git diff --name-only main`. Expected: the ten rows of section 3 and nothing else. Run `git diff --name-only main -- apps/api/test packages/contracts/test`. Expected: `setup-auth-dev-mode.test.ts` (new) and `platform.schema.test.ts` only.
13. **Stop conditions.** Report `PLAN DOES NOT WORK` and stop if an existing test needs an edit, or if a test of section 5 cannot pass without a change outside section 3.

## 5. Acceptance criteria tests

There is one test for each criterion. The file for criteria 1 to 5 and E1 to E3 is `apps/api/test/setup-auth-dev-mode.test.ts`. The file for criterion 6 and E4 is `scripts/dev-auth-docs.test.mjs`. The API tests use `createTestApp` (D12) with `staticRoot: resolve(__dirname, 'fixtures/static')` and their own `libraryDir` from `mkdtemp`, removed in `finally`, unless they spawn `dist/main.js`. Every request goes through `send` (C18), so the Host is explicit. Each assertion checks the status and `error.code`. `ECHO_BODY` is `{"count":1,"intervalMs":0}`.

**Criterion 1 (unit line 28): unset means the production guard.**
Test name: `criterion 1: with SCRIBA_DEV_AUTH unset or 0, a cookie-less GET answers 401 AUTH_REQUIRED, and with a valid cookie a POST with a foreign or missing Origin answers 403 AUTH_ORIGIN_REJECTED`.
Asserts: for `env: {}` and for `env: {SCRIBA_DEV_AUTH: '0'}`, Host `127.0.0.1:8080`: GET `VERSION_ROUTE` with no cookie gives 401 `AUTH_REQUIRED`. With `sessionCookie(app, library)`, POST `ECHO_ROUTE` with `Origin: https://evil.example` gives 403 `AUTH_ORIGIN_REJECTED`, and the same POST with no Origin gives 403 `AUTH_ORIGIN_REJECTED`. Control: the POST with `Origin: http://127.0.0.1:8080` gives 202.

**Criterion 2 (unit line 29): dev mode admits a cookie-less read and a POST with no Origin.**
Test name: `criterion 2: with SCRIBA_DEV_AUTH=1, a cookie-less GET of VERSION_ROUTE, SETUP_STATUS_ROUTE and IDENTITY_ROUTE gives 200 with the identity loopback, and a cookie-less POST to ECHO_ROUTE with no Origin gives 202`.
Asserts: `env: {SCRIBA_DEV_AUTH: '1'}`, Host `127.0.0.1:8080`, no cookie. GET `VERSION_ROUTE` gives 200. GET `SETUP_STATUS_ROUTE` gives 200 (D7). GET `IDENTITY_ROUTE` gives 200 with the body `{via: 'loopback'}` (D7). POST `ECHO_ROUTE` with `ECHO_BODY` and no Origin gives 202.

**Criterion 3 (unit line 30): dev mode keeps the Host allowlist, the absence of CORS and the frame policy.**
Test name: `criterion 3: with SCRIBA_DEV_AUTH=1, every foreign Host gets 403 AUTH_HOST_REJECTED, no response carries an access-control-* header, and every response carries frame-ancestors 'none'`.
Asserts: `env: {SCRIBA_DEV_AUTH: '1'}`. For each Host in `['evil.example:8080', '127.0.0.1:9999', 'scriba:8080', '127.0.0.1', 'localhost:9999', 'localhost:4200']`: GET `VERSION_ROUTE` gives 403 `AUTH_HOST_REJECTED` and the CSP `frame-ancestors 'none'`. Then, with Host `127.0.0.1:8080`: an OPTIONS preflight to `VERSION_ROUTE` with `Origin: https://evil.example` and `Access-Control-Request-Method: GET` (through the `headers` option), and a GET of `VERSION_ROUTE` (200). None of these replies, the 403s included, has a header whose name starts with `access-control-`, and each has the CSP header. The OPTIONS status is not asserted (SAU-04 decision 14).

**Criterion 4 (unit line 31): the boot refuses dev mode in production.**
Test name: `criterion 4: spawning dist/main.js with SCRIBA_DEV_AUTH=1 and NODE_ENV=production exits 1 with stdout empty and one stderr line; without the flag, or with 0, the same production boot serves a cookie-less request with 401`.
Asserts (the spawn, as C9): the env is the three directory variables (three temp folders), `SCRIBA_LOG_LEVEL: 'error'`, `SCRIBA_DEV_AUTH: '1'` and `NODE_ENV: 'production'`, with a timeout of 8000 ms. `status` is 1. `stdout` is `''`. `stderr.trim()` equals `Invalid SCRIBA_DEV_AUTH "1": dev mode is refused when NODE_ENV is production.` No stderr line matches `/^\s+at /` (C7). Control (in-process): for `env: {NODE_ENV: 'production'}` and `env: {NODE_ENV: 'production', SCRIBA_DEV_AUTH: '0'}`, the app boots, and GET `VERSION_ROUTE` with no cookie gives 401 `AUTH_REQUIRED`.

**Criterion 5 (unit line 32): `npm run dev` serves the app locally with no setup URL step.**
The criterion names the real `npm run dev`, which builds, starts watchers and runs `ng serve`. A suite test cannot run it, so the criterion has two parts, and its checkbox is marked only after both pass:
- The automated test. Test name: `criterion 5: the dev script sets SCRIBA_DEV_AUTH=1 next to SCRIBA_DEV_ORIGINS for the API process, and with that env a cookie-less status, identity and mutation on localhost:4200 succeed`. Asserts: (a) read the root `package.json` from `resolve(__dirname, '..', '..', '..', 'package.json')`, take `scripts.dev`, and match the quoted API command with `/"([^"]*node --watch apps\/api\/dist\/main\.js)"/`. The captured command contains `SCRIBA_DEV_AUTH=1` and `SCRIBA_DEV_ORIGINS=http://localhost:4200`. (b) `env: {SCRIBA_DEV_AUTH: '1', SCRIBA_DEV_ORIGINS: 'http://localhost:4200', SCRIBA_SETUP_URL_BASE: 'http://localhost:4200'}`, Host `localhost:4200`, no cookie: GET `SETUP_STATUS_ROUTE` gives 200, GET `IDENTITY_ROUTE` gives 200 with `{via: 'loopback'}`, and POST `ECHO_ROUTE` with `Origin: http://localhost:4200` gives 202.
- P5 (section 4, step 11): the real `npm run dev` and `curl` through the dev proxy, with no cookie. If P5 cannot run in the implementer's environment (A5), the criterion is not marked, and the orchestrator gives the point to the Navigator ("Criteria that you cannot test" in `prompt.md`). The automated test does not replace P5.

**Criterion 6 (unit line 33): the README documents the flag as local-only.**
Test name (in `scripts/dev-auth-docs.test.mjs`): `criterion 6: the README paragraph that names SCRIBA_DEV_AUTH says it is local only and names NODE_ENV=production`.
Asserts: the `## Getting started` section of `README.md` has a paragraph (text between blank lines) that contains `SCRIBA_DEV_AUTH`, matches `/local[- ]only/i`, and contains `NODE_ENV=production`. The section reader is a copy of `sectionOf` from `recovery-docs.test.mjs:11-16`.

**E1 (extra, not a criterion): the startup warning (D8).**
Test name: `E1: with SCRIBA_DEV_AUTH=1 the boot writes the dev-mode warning to stderr, and with the flag unset it writes no such line`. In-process, with `vi.spyOn(process.stderr, 'write')`, restored in `finally`. Asserts one call whose text contains `SCRIBA_DEV_AUTH=1: dev mode is on` with the flag on (`SCRIBA_LOG_LEVEL` is `error` in the base env, C10), and no such call with the flag unset.

**E2 (extra): the value rule (D2).**
Test name: `E2: SCRIBA_DEV_AUTH=true and an empty value are refused with the expected 0 or 1 message`. `createTestApp({env: {SCRIBA_DEV_AUTH: 'true'}})` rejects with `Invalid SCRIBA_DEV_AUTH "true": expected 0 or 1.`, and `''` rejects with `Invalid SCRIBA_DEV_AUTH "": expected 0 or 1.`

**E3 (extra): the tailnet rule holds in dev mode (D13, SAU-18 section 7).**
Test name: `E3: with SCRIBA_DEV_AUTH=1 and the fake LocalAPI in running-certs, a tailnet request without the login header gets 403 AUTH_TAILNET_IDENTITY_MISSING, and a tailnet POST with no Origin or an http:// Origin gets 403 AUTH_ORIGIN_REJECTED`. Setup: `startFakeLocalApi('running-certs')` and `env: {SCRIBA_TS_SOCKET: fake.socketPath, SCRIBA_DEV_AUTH: '1'}`, in the pattern of `withApp` (C18, copied, not imported). The tailnet Host is `scriba-1.tail1234.ts.net`. Asserts: GET `VERSION_ROUTE` on the tailnet Host with no header and no cookie gives 403 `AUTH_TAILNET_IDENTITY_MISSING`, and GET `IDENTITY_ROUTE` the same (SAU-18 D8). With `Tailscale-User-Login: ada@example.com`: GET `VERSION_ROUTE` gives 200; POST `ECHO_ROUTE` with `ECHO_BODY` and no Origin gives 403 `AUTH_ORIGIN_REJECTED`; with `Origin: http://scriba-1.tail1234.ts.net` it gives 403 `AUTH_ORIGIN_REJECTED`; control, with `Origin: https://scriba-1.tail1234.ts.net`, it gives 202. Control in the same app: GET `VERSION_ROUTE` with Host `127.0.0.1:8080` and no cookie gives 200, so dev mode is on.

**E4 (extra, in `scripts/dev-auth-docs.test.mjs`): the flag never reaches the image or compose (D10).**
Test name: `E4: no file that makes the image or the stack names SCRIBA_DEV_AUTH`. Reads the `Dockerfile`, every file under `deploy/`, `scripts/entrypoint.sh` and `scripts/build-image.sh`, and asserts that none contains `SCRIBA_DEV_AUTH`.

## 6. Downstream agreement

- **Downstream units.** SAU-22 unblocks nothing (`unblocks: []`), and no unit names it in `blocked_by`.
- **SAU-18 (done).** D17 holds: dev mode is in the non-tailnet path only (D6), and E3 is the test that SAU-18 left to this plan.
- **SAU-19 owner allowlist (done).** Its check is the tailnet-only call at guard line 102 (C3). Dev mode does not reach it: a dev-mode entry is never tailnet. A dev-mode identity is `{via: 'loopback'}`, which ignores the allowlist as SAU-19 line 22 says for loopback cookie access. The order in `canActivate` is the one `plans/SAU-19.md` section 7 gives for SAU-22: the allowlist call, then SAU-22's form of the Origin `if`.
- **SAU-20 Tailscale UI (done).** Its files are web files. No overlap.
- **SAU-21 tailnet gate (done; one criterion, the late login, is not marked).** It runs the image, where the flag is never set (D10, E4), so its checks cover the production guard. `plans/SAU-21.md:130` relies on this, and this plan keeps it.

## 7. Open points

**Settled by the user, without the Navigator (`plans/DECISIONS.md:5792-5796`).** Points 1 and 2 follow the unit as written: option 1(c) and option 2(b) below. The code is D6 as written; `main.ts` is not changed; the README paragraph states the two effects (D14). The analysis and the other options stay below for the record. The user can redirect the decision; a change to the dev-mode behaviour would then need a new revision.

1. **The dev API is reachable from the LAN without a credential.** `main.ts:8` binds `0.0.0.0:8080` (C13). With the flag on, a device on the LAN that sends `Host: 127.0.0.1:8080` or `localhost:8080` passes the Host check and gets the full API, reads and mutations, with no cookie and no Origin (A3). The unit has no decision on the bind address or the peer. Option (a) adds a decision, which no reviser action does, and option (b) narrows unit lines 19-21, which are protected (see point 2). So the reviser cannot make either change. Module line 96 puts "LAN mode" and "`0.0.0.0` publishing" out of scope.
   - (a) Listen on `127.0.0.1` when the flag is on. Effect: `main.ts` is added to section 3, and `README.md:17` changes. The proxy target is `127.0.0.1:8080` (C13), so `npm run dev` still works. `main.ts` listens on the fixed port 8080, so the check is manual (in P5). No other unit is affected: the image runs with the flag unset.
   - (b) Dev mode only for a loopback peer: `devMode` also needs `req.socket.remoteAddress` to be `127.0.0.1` or `::1`, the set of `SERVE_PEERS` (guard line 44). Effect: rows 5 and 9 only. A LAN peer gets the production rule (401 without a cookie). The dev proxy connects from `127.0.0.1` (C13), so `npm run dev` still works. A new extra test uses SAU-18's seam (`listenHost: '0.0.0.0'` and a copy of `nonTailnetIPv4`, C10 and C18): a cookie-less GET from the non-loopback address gives 401, and from `127.0.0.1` gives 200. `README.md:17` stays true.
   - (c) Keep the unit as written. The README paragraph says that with the flag on, any device that can reach port 8080 has the API without a credential.
   - Revision 1 recommended (b). **Settled: (c)**, the unit as written (D14).
2. **Cross-site browser requests.** Unit line 21 skips the Origin check on every mutation. In dev mode, a page on any site that the developer opens can send a form POST or a POST with no body to `http://localhost:8080` or `http://localhost:4200`. Both Hosts pass the allowlist, the browser sends no preflight for these requests (A2), and Nest parses form bodies (C14). The page cannot read the replies, but it can change state: for example Continue, and any POST whose body schema accepts string fields. The decision is protected: SAU-18's plan (done) names unit lines 19-21 as a source of D17 (`plans/SAU-18.md:78`), and the Navigator's SAU-18 decision built on the committed `devAuth` text with "no change to SAU-22" (`plans/DECISIONS.md:5510`). It is not in the way of a correct plan either, so the reviser cannot reword it.
   - (a) Narrow unit line 21: in dev mode, a mutation with no `Origin` header passes, and a mutation that sends an `Origin` must send its Host's origin, as in production (403 `AUTH_ORIGIN_REJECTED` otherwise). Effect: criterion 2 ("a POST with no Origin succeeds") holds word for word. The app in the browser keeps working: through the proxy it sends `Origin: http://localhost:4200`, the dev origin of Host `localhost:4200`. A browser always sends `Origin` on a cross-site POST (A2), so those are refused. The guard condition becomes `if (!SAFE_METHODS.includes(req.method) && !(devMode && req.headers.origin === undefined))`. One more assertion in the criterion 2 test: a cookie-less POST with `Origin: https://evil.example` gives 403. SAU-18 D17 is unaffected.
   - (b) Keep the unit as written. The README paragraph says that in dev mode any web page can send POSTs to the local API.
   - Revision 1 recommended (a). **Settled: (b)**, the unit as written (D14).

**Settled in this revision.**

3. **NODE_ENV in the image.** No image change in this unit. The unit asks for the refusal (D5), which criterion 4 tests, and not for a `NODE_ENV` in the image. The image layer of the unit is "the flag is never set in the image or compose files" (D10, E4), and compose passes the app only four named variables, with no `env_file` (C12). So the flag reaches the container only by an edit of `compose.yaml` or a `docker run -e`. In that case the warning (D8) still prints. Adding `ENV NODE_ENV=production` would change the `Dockerfile`, a Platform file, and the runtime mode of the image for every module. That is outside this unit.
4. **The controllers.** Settled by main: SAU-18 D7 is on main, so SAU-22 changes no controller (D7).
5. **The contract addition.** Settled: needed by `read()` and additive (D4).
6. **The accepted values.** Settled: `1` and `0` (D2).
7. **The warning stream.** Settled: stderr at every log level (D8).
8. **Criterion 5.** Settled: an automated test plus the local procedure P5, and the checkbox waits for P5 (section 5).
9. **E3 sequencing.** Settled by main: SAU-18 is done, so E3 is written in step 8 with the other tests.

## 8. Changes by other drafts and planned units to the same files

SAU-18 changed the guard, the policy and the boot path. It is done and on main (`54c0938`, `60a665f`), so it landed first. The other order can no longer occur. The rule for each SAU-18 file follows. It agrees with `plans/SAU-18.md` section 8 (`:151-156`).

- **`setup-auth.guard.ts` (SAU-18 row 3; this plan row 5).** The tailnet branch runs first. The `devAuth` skip applies only to an admitted non-tailnet entry (D6), so a tailnet request keeps D2, D3, D8 and D5 of SAU-18 (D13, E3).
- **`request-policy.ts` (SAU-18 row 1; row 4).** `RequestPolicy` keeps `admit` and gains `devAuth`. `buildRequestPolicy(env, tailnet)` keeps its signature and sets `devAuth` from `env`.
- **`host-frame.middleware.ts` (SAU-18 row 2).** Not changed. The async Host check refuses an unknown Host in dev mode as it does today (criterion 3).
- **`setup-auth.module.ts` (SAU-18 row 4).** Not changed. The factory already passes `env` (C5).
- **`bootstrap.ts` (SAU-18 row 7; row 6).** SAU-18 replaced the early policy build with `checkDevOrigins` (line 40) and takes the hook's policy from the container (line 56). SAU-22 adds one line after line 40. The refusal of D5 is in `parseEnv` (line 37), not in `buildRequestPolicy`, so SAU-18's note on a refusal in the policy builder (`plans/SAU-18.md:154`) does not apply. A bad `SCRIBA_DEV_AUTH` and the production refusal stop the boot before `checkDevOrigins` and before `NestFactory.create`.
- **`setup-session.controller.ts` and `setup-status.controller.ts` (SAU-18 rows 5 and 6).** Not changed. They read the guard's identity (D7), so dev mode's `{via: 'loopback'}` opens the status, Continue and identity routes, as `plans/SAU-18.md:155` says.
- **`create-test-app.ts` (SAU-18 row 8).** Not changed. This plan uses the `env` option only. Open point 1 is settled as (c), so `listenHost` is not used.
- **`env.ts` (both), the contract and its test, `package.json`, `README.md`.** Only SAU-22 changes them (`plans/SAU-18.md:156`; C20).
- **Test files.** `setup-auth-tailnet.test.ts` (SAU-18) is not edited. E3 copies its setup pattern into this plan's file.
- **SAU-19 (done, same guard).** Its allowlist call and constructor parameter are on main and are kept (C3, step 5).
- **CEX-01, GRR-10, GRR-16, TRG-14 (planned) and GNP-13 (draft).** No shared path (C20). Each `unit/*` branch has an empty diff for the paths of section 3 (C20). Either order of the merges is correct.

## 9. Review parts

The plan is one part: ten paths, one flag.

- **Part 1 — guard dev mode.** Steps 1 to 13 of section 4. The tests of criteria 1 to 6 and E1 to E4 of section 5, and P5 (step 11). The reviewer also checks that the change touches only the paths of section 3, that the guard has no dev-mode condition beyond D6 (open points 1 and 2 follow the unit as written), that the README paragraph has the content of step 9, and repeats P5 or reads its recorded output.
