---
id: SAU-02
status: done
---
# SAU-02 plan — token store and setup URL

Batch: [SAU-02] alone (Setup & auth, phase:token-guard, M1, main track). SAU-03 to SAU-08 wait on it, so the batch is this unit only. Revision 2. Base: main at 5c6b80d (SHL-01 to SHL-07 and SAU-01 are merged). Revision 2 applies the Opus rejection of revision 1 (DECISIONS 2026-11-13, "SAU-02 — Opus plan review of revision 1", commit 0eafc32). This plan was written from the local checkout only. Nothing was built, installed, tested, committed or pushed while writing it. The only file written is this one.

## 1. Decisions this plan follows

Each item gives its source. FACT means the planner checked it (how is in section 7a), or the item is a recorded decision or unit text. ASSUMED means a choice made here because the sources are silent (section 7b).

1. **Module and wiring.** `apps/api/src/modules/setup-auth/`, one `@Module` (`SetupAuthModule`) imported by the composition root `COMPOSED_MODULES`. The module imports `PlatformModule` (the entry file). Source: unit line 18; modules/setup-auth.md line 40; app.module.ts line 14; PLT-04 plan section 1 bullet 3. FACT (unit and file). The import of `PlatformModule` is needed for the ordering in item 10. FACT (section 7a, Nest source).
2. **Token value.** 32 bytes from `crypto.randomBytes`, encoded base64url: 43 characters. Source: unit line 19 (≥ 256 bits, CSPRNG, base64url). FACT (unit); the length is arithmetic on 32 bytes.
3. **Token file.** `${SCRIBA_BOOKS_DIR}/.scriba/setup-token`, mode 0600, created only when no file exists. Source: unit line 19. FACT.
4. **Directory mode.** `${SCRIBA_BOOKS_DIR}/.scriba` is 0700. Platform's app-state check creates it with `mkdirSync(..., {recursive: true})` and no mode (`apps/api/src/modules/platform/boot/app-state.ts`), so the umask decides. The unit requires 0700 but does not say who sets it. The token store sets it with `chmodSync` on every start. Source: unit line 19; app-state.ts. The 0700 requirement is FACT; who sets it is ASSUMED.
5. **Token file contents and validation.** The file holds the token and one trailing newline. A read trims whitespace. The trimmed value must match `^[A-Za-z0-9_-]{43}$`. Any other existing content is a `BootError` that names the path and says to delete the file and restart. The token is never regenerated over an existing file. Source: unit line 19 ("only when none exists"). The validation rule and the message are ASSUMED.
6. **Modes on every start.** The token store applies `chmodSync` to the token file (0600) and the directory (0700) on every start, so a loosened mode is tightened. Source: unit lines 19 and 28. ASSUMED that it runs on every start, not only on creation.
7. **Setup URL file.** `${SCRIBA_BOOKS_DIR}/.scriba/setup-url`, mode 0600, one line: the URL and one trailing newline. Rewritten on every start: the store first removes any leftover `setup-url.tmp` (a crash can leave one with an old mode), writes `setup-url.tmp` with mode 0600, applies `chmodSync(0600)` to it, and renames it over the target. If the write fails, the temp file is removed before the `BootError`. Source: unit line 20 (0600, single line, rewritten on every start); the path is also used by SAU-03 line 20, SAU-06 line 17, SAU-15 line 19 and PLT-17 line 32. Path and format FACT; the temp-file rename, the removal and the explicit chmod ASSUMED.
8. **URL content.** `new URL('/api/setup-auth/handshake', SCRIBA_SETUP_URL_BASE)` with `token` set as a search parameter. The handshake route comes from the contract constant `HANDSHAKE_ROUTE` (`packages/contracts/src/setup-auth/routes.ts`). The base is used as an origin only; a base path, if given, is dropped. Source: unit line 20 (query parameter, not fragment); module line 40. Route and query FACT; base-path handling ASSUMED.
9. **Base value.** `SCRIBA_SETUP_URL_BASE` as parsed by `apps/api/src/modules/platform/boot/env.ts`: a `z.url()` value, defaulting to `http://127.0.0.1:${SCRIBA_PORT}`. The host publish port is `SCRIBA_PORT`; the app listens on 8080 inside the container (`apps/api/src/main.ts`; PLT-04 plan section 1 bullet 1). Source: unit line 20; `packages/contracts/src/platform/env.ts` comment. FACT.
10. **Print, and when.** Once per start, `process.stdout.write('Setup URL: <url>\n')`, in the token store's `onApplicationBootstrap`. It is not gated by `SCRIBA_LOG_LEVEL`, because the unit requires the print on every start (line 21) and `StdoutLogger` gates only Nest's log calls. The label `Setup URL: ` is ASSUMED. The hook runs after Platform's settings hook, so a settings refusal (exit 1) prints nothing. Source: unit line 21; `apps/api/src/modules/platform/boot/stdout-logger.ts`; Nest 12.4.2 hook order (section 7a). FACT for the ordering; the label ASSUMED.
11. **Constant-time comparison and the rejection log.** The token store provides `matches(candidate)`: both values are hashed with SHA-256 and the digests compared with `crypto.timingSafeEqual`. This avoids a length leak. When the result is false, `matches` writes one Nest `warn` line, `Setup token rejected.`, through a `Logger` with the context `SetupAuth`. The line carries no candidate and no stored token value. Source: unit line 24 lists both the constant-time comparison and the failed-attempt logging under SAU-02. The method, the message and the logger are ASSUMED. The external test of this line is in SAU-03 (open point 2).
12. **Cookie signing.** Stateless value `<issuedAtMs>.<signature>`. The signing key is `HMAC-SHA256(token, label)`, and the signature is `HMAC-SHA256(key, issuedAtMs)` in base64url. `sign(issuedAtMs)` and `verify(value)` are exposed through `SetupCookieSigner`. `verify` returns `{issuedAt}` or `undefined`, compares with `timingSafeEqual` after a length check, and does not enforce an age limit (the browser's Max-Age is SAU-03's). Source: unit line 22 (HMAC with a key derived from the token; replacing the token invalidates all cookies); module lines 46 and 47 (settled). The label, the value format and the no-expiry choice are ASSUMED.
13. **Cookie name.** `scriba_setup_<SCRIBA_PORT>`. Source: unit line 23 (the name includes the port; `__Host-` is not usable); module line 47 (port-suffixed). Which port is ASSUMED: `SCRIBA_PORT` is used, which equals the base port by default. Open point 3.
14. **setupAuth section.** Registered through `SettingsService.register` in a provider factory, with `key: 'setupAuth'`, `version: SETUP_AUTH_SECTION_SCHEMA_VERSION` (1, from the contract), `defaultValue` = the unit's default object (line 25), and `migrations: {}`. `register` requires the default's `schemaVersion` to equal the version (`settings.service.ts`, `register`). Source: unit line 25; SAU-09 line 19 (version 1, a migration only if the shape changes); PLT-07 plan section 2. FACT for the register rules; the empty migrations map is ASSUMED.
15. **Section writes.** SAU-02 writes nothing to the section except Platform's default-writing boot step. `SettingsService.write` replaces the whole section (`settings.service.ts`, `write`). The field-level merge the unit names (line 25) is therefore read-merge-write in the caller (SAU-05, SAU-09). Source: unit line 25; settings.service.ts. FACT for the write behaviour; the placement is ASSUMED.
16. **No routes, no guard, no SSE.** SAU-02 adds no controller, no route and no guard. Source: unit lines 18 to 25 (none listed); module line 43 (no SSE in v1); SAU-03 line 18 owns the handshake route. FACT.
17. **Failures.** A file-system failure in the store is a `BootError` with the message `Cannot write <path>: <reason>.` (or `Cannot read` for reads), as `settings.file.ts` does. `BootError` is not exported from the platform entry (grep, section 7a), so the platform entry gets one re-export line. Source: `apps/api/src/modules/platform/boot/boot-error.ts`; `apps/api/src/modules/platform/platform.module.ts`; rule R1 in `eslint.config.mjs`. The message wording and the re-export are ASSUMED.
18. **Test seam.** AC 2 and AC 3 use `createTestApp` (no stdout needed). AC 1 and AC 4 spawn a fixture child that calls the built `bootstrap()` with `COMPOSED_MODULES`, because they read stdout and stderr. Source: modules/setup-auth.md lines 49 to 52 (external behaviour; the composed app against a temp library); PLT-07 plan section 5 (the fixture pattern). FACT for the rules; the split is ASSUMED.
19. **Dev base and the harness base.** The root `dev` script sets `SCRIBA_SETUP_URL_BASE=http://localhost:4200` (root `package.json`). The PLT-13 harness leaves the variable unset, so the API default applies. Source: unit line 20 (agrees); DECISIONS 2026-11-12 PLT-13 revision 2 review (`plans/DECISIONS.md` line 707), which says the same and confirms the harness default `127.0.0.1:8080`; `plans/PLT-13.md` lines 262 and 297. FACT. Open point 6.
20. **Language and module format.** CommonJS in `apps/api`, so the fixture uses `require`. Source: DECISIONS 2026-11-12 PLT-04 open point 1 (line 460). FACT.

## 2. Files to create or change

Paths are under `/Users/bbartolome/workspace/scriba-prototype/`. `setup-auth/` means `apps/api/src/modules/setup-auth/`.

Shared files: two. `apps/api/src/app.module.ts` is the composition root, which every module adds one line to; in this batch only SAU-02 edits it. `apps/api/src/modules/platform/platform.module.ts` is Platform's entry file; SAU-02 adds one re-export line. Both are named because they are shared with other units in general, not with another unit of this batch.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/setup-auth/setup-auth.section.ts` | new | `SETUP_AUTH_SECTION_DEF`: a `SettingsSectionDef` for `setupAuth` with the unit's default object (item 14) |
| `apps/api/src/modules/setup-auth/setup-token.store.ts` | new | `SetupTokenStore`: `onApplicationBootstrap` does the directory mode, token create-or-load and validation, mode enforcement, the atomic `setup-url` write and the stdout print; `matches(candidate)` in constant time, with the rejection log (items 2 to 11) |
| `apps/api/src/modules/setup-auth/setup-cookie.signer.ts` | new | `SetupCookieSigner`: `cookieName()`, `sign(issuedAtMs)`, `verify(value)`; the key is derived from the token on each call (item 12) |
| `apps/api/src/modules/setup-auth/setup-auth.module.ts` | new | entry `SetupAuthModule`: `imports: [PlatformModule]`; providers: the section registration factory (inject `SettingsService`), `SetupTokenStore`, `SetupCookieSigner`; exports: `SetupTokenStore`, `SetupCookieSigner` |
| `apps/api/src/app.module.ts` | edit | one import line for `SetupAuthModule`; `COMPOSED_MODULES` (line 14) becomes `[PlatformModule, SetupAuthModule]` |
| `apps/api/src/modules/platform/platform.module.ts` | edit | one re-export line, `export { BootError } from './boot/boot-error';`, next to the other entry re-exports (item 17) |
| `apps/api/test/fixtures/boot-setup-auth.cjs` | new | child process: calls the built `bootstrap({staticRoot: test/fixtures/static})` with the default modules, closes the app and exits 0. On a `BootError` it writes the message to stderr and exits 1, as `main.ts` does. Exits through the stream-drain callback, so no output is cut off |
| `apps/api/test/setup-auth-token.test.ts` | new | AC 1 (`it` with the fixture spawn), AC 2 and AC 3 (`it` each, with `createTestApp`) |
| `apps/api/test/setup-auth-logs.test.ts` | new | AC 4 (`it`, two spawns at `SCRIBA_LOG_LEVEL=debug`), plus the extra refusal `it` (invalid token file, at `SCRIBA_LOG_LEVEL=error`) |
| `apps/api/test/setup-auth-section.test.ts` | new | extra `it`: a fresh library gets the `setupAuth` default in `settings.yaml`, which the contract schema accepts, and a second start changes nothing |
| `apps/api/dist/` | generated, git-ignored (`.gitignore` line 2) | build output |

Not changed: `apps/api/package.json` (no new dependency; `yaml` is already a dependency and the test uses it), `package-lock.json`, `packages/contracts/**` (SAU-01 is merged and has the needed shapes), `apps/api/src/modules/platform/settings/**`, `apps/api/src/modules/platform/boot/**`, `apps/api/src/main.ts`, `apps/api/src/bootstrap.ts`, `apps/api/test/create-test-app.ts`, `apps/web/**`, `eslint.config.mjs`, `.gitignore` (`.scriba-dev/` is already ignored, so a dev token is never committed), `units/**`, `modules/**`, `plans/DECISIONS.md`.

Signatures, as a sketch for the implementer (no code in this plan):
- `SetupTokenStore`: `onApplicationBootstrap(): void`; `matches(candidate: string): boolean`.
- `SetupCookieSigner`: `cookieName(): string`; `sign(issuedAtMs: number): string`; `verify(value: string | undefined): { issuedAt: number } | undefined`.
- `SETUP_AUTH_SECTION_DEF: SettingsSectionDef`.

## 3. Method

Run every command from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v` and `npm -v` beside the first result. The implementer creates the branch; this planning run creates none.

0. **Preconditions.**
   - `git status --short -- ':!plans'`: expected no output.
   - `git merge-base --is-ancestor 5c6b80d HEAD`: expected exit 0.
   - `git diff --quiet 5c6b80d HEAD -- apps packages`: expected exit 0 (no code change since the base). The planner ran this and the first check: both pass.
   - `git switch -c unit/SAU-02`: expected `Switched to a new branch 'unit/SAU-02'`.
1. **Versions and dependencies.** `node -v` expected v26.x (the planner saw v26.13.0). `npm -v` expected 11.x (11.20.0). `npm ci`: expected exit 0. If the registry is refused, `npm ci --prefer-offline` may succeed from `~/.npm/_cacache` (open point 8). Then `ls -d node_modules/@nestjs/core node_modules/zod node_modules/yaml`: expected all three paths listed. Before this step they are absent (section 7a).
2. **Baseline on main.** `npm run build -w @bbartolome/scriba-contracts`: expected exit 0. `ls apps/api/test/*.test.ts | wc -l`: expected `30`. `npm test -w @bbartolome/scriba-api`: expected exit 0 and vitest `Test Files  30 passed (30)`. If any fails, stop and report: main is not green.
3. **Gate on the Nest hook order.** Item 10 depends on it. `grep -n "b.distance - a.distance" node_modules/@nestjs/core/nest-application-context.js`: expected one line (the sort is by descending distance). `grep -n "depths.set(moduleRef, 1)" node_modules/@nestjs/core/injector/topology-tree/topology-tree.js`: expected one line (depth is the longest import path from the root). If either fails, stop and record it: the setup URL print could then come before a settings refusal, and the plan's settings-refusal check (step 7) must decide.
4. **Write the files**, in this order: `setup-auth.section.ts`, `setup-token.store.ts`, `setup-cookie.signer.ts`, `setup-auth.module.ts`, then the `platform.module.ts` re-export and the `app.module.ts` edit, then `boot-setup-auth.cjs`, then the three test files.
5. **Format.** `npx prettier --write apps/api/src/modules/setup-auth apps/api/src/app.module.ts apps/api/src/modules/platform/platform.module.ts apps/api/test/setup-auth-token.test.ts apps/api/test/setup-auth-logs.test.ts apps/api/test/setup-auth-section.test.ts apps/api/test/fixtures/boot-setup-auth.cjs`: expected each file reported, exit 0. Then `npx prettier --check apps/api`: expected `All matched files use Prettier code style!`, exit 0.
6. **Build.** `npm run build -w @bbartolome/scriba-api`: expected exit 0 (the `tsc` emit and the `--noEmit` check of `src` and `test`). `ls apps/api/dist/modules/setup-auth`: expected 4 files, one `.js` for each of `setup-auth.module`, `setup-auth.section`, `setup-token.store` and `setup-cookie.signer`. No `.d.ts` is emitted, because `apps/api/tsconfig.build.json` and `tsconfig.base.json` set no `declaration` (only `packages/contracts/tsconfig.build.json` does).
7. **Tests.** `npm test -w @bbartolome/scriba-api`: expected exit 0, vitest `Test Files  33 passed (33)`, the six new `it` blocks passing (3 + 2 + 1), none skipped. This run includes the regression that matters most: `settings-refusal.test.ts` case (a) expects `stdout` to be `''` from `dist/main.js`, which now includes `SetupAuthModule`. It must still pass (item 10). Also `app-state.test.ts` and `create-test-app.test.ts` must still pass.
8. **Lint.** `npm run lint -w @bbartolome/scriba-api`: expected exit 0, with no `boundaries/dependencies` error. The imports of `../platform/platform.module` from `setup-auth` are the allowed entry-file pattern.
9. **Root gates.** `npm run build`: expected exit 0. `npm test`: expected exit 0 (it runs the workspaces and `scripts/*.test.mjs`). `npm run lint`: expected exit 0, ending `All matched files use Prettier code style!`.
10. **Mutations.** One at a time, each reverted before the next. Each runs `npm test -w @bbartolome/scriba-api`, which rebuilds `dist/`, so the spawned fixture runs the mutated build. The expected result is a failing named test, and the mutation must keep `tsc` green (a mutation that fails `tsc` tests nothing, so replace it).
    - M1: token from 16 random bytes. Expected: AC 1 fails (the 43-character check).
    - M2: token file created with no `mode` and the `chmod` removed, under umask 022 it is 0644. Expected: AC 1 fails (mode).
    - M3: remove the `chmod` on the directory. Expected: AC 1 fails (directory mode 0755).
    - M4: write `setup-url` only when it does not exist. Expected: AC 2 fails (the port).
    - M5: regenerate the token on every start. Expected: AC 2 fails (the token bytes).
    - M6: cache the token in a module-level variable and reuse it when present. Expected: AC 3 fails (the new token equals the old one, because the test file runs both starts in one process).
    - M7: print `Setup token: <token>` instead of the URL line. Expected: AC 1 fails (the stdout pattern) and AC 4 fails.
    - M8: also log the URL through Nest's `Logger` at `log`. Expected: AC 4 fails (a second line contains the token).
    - M9: log the candidate in the rejection line of `matches`. Not runnable in SAU-02 (no test calls `matches`). It is caught by SAU-03's wrong-token check (open point 2).
11. **Optional manual check (not a criterion).** `npm run build -w @bbartolome/scriba-api`, then `SCRIBA_BOOKS_DIR=$(mktemp -d) SCRIBA_PACKS_DIR=/tmp/scriba-p SCRIBA_EXAMPLES_DIR=/tmp/scriba-e SCRIBA_LOG_LEVEL=info timeout 5 node apps/api/dist/main.js`: expected one `Setup URL: http://127.0.0.1:8080/api/setup-auth/handshake?token=…` line, and exit 124 from `timeout`. Port 8080 must be free.
12. **Status.** `git status --short`: expected only the section 2 paths. Do not commit; the driver commits.

## 4. Acceptance criteria tests

The unit has four criteria, numbered 1 to 4 as in the unit (lines 28 to 31). All four run locally with Node, the file system and the spawned fixture. None needs a tailnet, Docker, tailscaled or a git remote. The only external need is registry access for `npm ci` (open point 8).

**Criterion 1** (unit line 28): "First start creates the token (0600, dir 0700) and a 0600 `setup-url`, and prints the URL to stdout."
- Test: `apps/api/test/setup-auth-token.test.ts`, one `it`. A temp library; `spawnSync(process.execPath, [fixture])` with an environment built from scratch: `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR` inside the library, `SCRIBA_PORT=8080`, `SCRIBA_LOG_LEVEL=error`; timeout 15000 ms.
- Expected: exit status 0; `stderr` is `''`; `stdout` has exactly one non-empty line, matching `^Setup URL: (http://127\.0\.0\.1:8080/api/setup-auth/handshake\?token=([A-Za-z0-9_-]{43}))$`.
- Expected on disk: `.scriba/setup-token` mode `0o600`, and its trimmed content equals the captured token. `.scriba` mode `0o700`. `.scriba/setup-url` mode `0o600`, and its content equals the printed URL followed by one newline.
- Mutations covered: M1, M2, M3, M7.

**Criterion 2** (unit line 29): "A restart keeps the same token and rewrites `setup-url` with the current port."
- Test: `setup-auth-token.test.ts`, one `it`. `createTestApp({libraryDir: lib, env: {SCRIBA_PORT: '8080'}})`, then `close()`; read the bytes of `setup-token`. Then `createTestApp({libraryDir: lib, env: {SCRIBA_PORT: '9191'}})`, then `close()`. (`createTestApp` does not remove a library it was given.)
- Expected: the bytes of `setup-token` are unchanged. `setup-url` content is `http://127.0.0.1:9191/api/setup-auth/handshake?token=<the same token>` plus one newline. `setup-url` mode `0o600`. The string `8080` does not occur in `setup-url`.
- Mutations covered: M4, M5.

**Criterion 3** (unit line 30): "Deleting the token file and restarting creates a new token and a new `setup-url`."
- Test: `setup-auth-token.test.ts`, one `it`. `createTestApp({libraryDir: lib})`, `close()`; read token T1. Delete `setup-token` with `rmSync`. `createTestApp({libraryDir: lib})`, `close()`.
- Expected: `setup-token` exists, mode `0o600`, and holds T2 with T2 not equal to T1, and T2 matches the 43-character pattern. `setup-url` contains T2 and does not contain T1. `setup-url` mode `0o600`.
- Mutations covered: M6.

**Criterion 4** (unit line 31): "The token value never appears in logs other than the setup URL line."
- Test: `apps/api/test/setup-auth-logs.test.ts`, one `it`. Two spawns of the fixture on the same temp library, each with `SCRIBA_LOG_LEVEL=debug`, so Nest's debug output is produced. "Logs" means the child's stdout and stderr together; no log file exists. After the first spawn, read T from `setup-token`. After each spawn, read `setup-url` (its content without the newline is `<url>`).
- Expected, for each spawn: exit 0; `stderr` does not contain T; across the combined stdout and stderr of that spawn, exactly one line contains T, and that line equals `Setup URL: <url>`. The result is two such lines in total, one per start. The second start therefore also tests the print on a later start (unit line 21).
- Mutations covered: M7, M8.

**Extra checks (not named by a criterion; pinned by this plan).**
- `setup-auth-logs.test.ts`, one `it`: a `setup-token` containing `not-a-token` plus a newline. The spawn runs at `SCRIBA_LOG_LEVEL=error`, as criterion 1 does; the debug-level helper of criterion 4 is not used. Expected: exit 1; `stdout` `''`; `stderr` trimmed equals `Cannot read <lib>/.scriba/setup-token: not a 256-bit base64url setup token; delete the file and restart to create a new one.`; `stderr` does not contain `not-a-token`; the bytes of `setup-token` are unchanged; `setup-url` does not exist.
- `setup-auth-section.test.ts`, one `it`: a fresh library, one spawn. Expected: exit 0; `settings.yaml` parsed with the `yaml` package has `schemaVersion` 1, and `setupAuth` deep-equals `{schemaVersion: 1, steps: {access: 'pending', tailscale: 'pending', providers: 'pending', preferences: 'pending', firstProject: 'pending'}, complete: false, preferences: {}, allowlist: {enabled: false, logins: []}}`, and `setupAuthSectionSchema.safeParse(setupAuth).success` is true. A second spawn leaves the bytes of `settings.yaml` unchanged, and `.scriba` holds no `settings.yaml.bak-*` entry.
- Not tested in SAU-02 (open point 1): `matches()`, `sign()` and `verify()`, and the rejection line of `matches()` (open point 2). The testing principle (modules/setup-auth.md line 50) forbids testing the signing helper, and no route exists yet. SAU-03 and SAU-04 test them through HTTP.

## 5. Agreement with downstream units

The units named in SAU-02's `unblocks` are SAU-03, SAU-04 and SAU-05. Each lists SAU-02 in `blocked_by` (front matter line 7 of each). A grep of `units/*.md` for `SAU-02` finds no other `blocked_by` entry, so the inverse holds. The table covers every setup-auth unit that uses the token store, the setup URL or the section.

| Unit | Needs from SAU-02 | Provided |
|---|---|---|
| SAU-03 (handshake, cookie, identity) | `matches()` (constant time, with the rejection log); `SetupCookieSigner.sign`, `verify`, `cookieName()`; the module export; the path of `setup-url` (its invalid-token page names it) | Yes. Two points to confirm: the cookie name uses `SCRIBA_PORT` (open point 3); SAU-03's wrong-token check must observe the rejection line (open point 2) |
| SAU-04 (global guard) | `SetupCookieSigner.verify` as the credential check (line 21); the cookie name | Yes. The guard, the Host check and the public-route list are SAU-04's |
| SAU-05 (status, Continue) | the `setupAuth` section registered at version 1 with the default (line 25); `SettingsService` read and write (merge in the module, item 15) | Yes |
| SAU-06 (minimal /setup page) | none directly (blocked by SAU-05 and Shell `phase:core`). Its sign-in notice names `cat ~/Books/.scriba/setup-url` (line 17) | Yes, the path and format |
| SAU-07 (invariant tests) | none directly (blocked by SAU-04) | Not applicable |
| SAU-08 (token-guard gate) | `setup-url` at `${SCRIBA_BOOKS_DIR}/.scriba/setup-url`, one line, the handshake URL with `?token=` (line 17 of the unit); AC 1 to 3 underpin its "token lifecycle" item (line 21); "old cookies 401" needs `verify` keyed by the token. Its base URL on the PLT-13 harness is `http://127.0.0.1:8080` (item 19) | Yes |
| SAU-09 (setup-flow API) | the `setupAuth` section at version 1 and the default; "if the shape changed, register a migration" (line 19) is not needed, because the default already matches `setupAuthSectionSchema` | Yes |
| SAU-10 (compose status) | none directly (blocked by SAU-08) | Not applicable |
| SAU-15 (settings page, recovery) | the recovery steps: delete `setup-token` and restart gives a new token, a rewritten `setup-url`, and invalidates old cookies (line 20) | Yes (AC 3, and `verify` keyed by the token) |
| SAU-19 (owner allowlist) | `setupAuth.allowlist` at its default `{enabled: false, logins: []}` (line 18) | Yes |
| PLT-17 (dispenser, first install; Platform unit that reads the file) | `setup-url` at `<library>/.scriba/setup-url`: one line, the handshake URL with `?token=` (item 7). PLT-17 line 32 prints it, and prints the loopback URL until the file exists | Yes, the path and the single-line format |

## 6. Open points

1. **No SAU-02 test for `matches`, `sign` or `verify`.** The testing principle forbids testing the signing helper, and there is no route. They are covered by the SAU-03 and SAU-04 HTTP tests. The coordinator confirms.
2. **Failed-attempt logging (decision, with a hand-off).** Unit line 24 lists it under SAU-02, but the failures happen at the handshake, which is SAU-03. Decision: `matches()` writes the rejection line (item 11), because SAU-02 owns the comparison. SAU-03's unit does not list an external check for it. The coordinator either adds to SAU-03's wrong-token criterion "the API's output has the rejection line and no token value", or records the hand-off in DECISIONS for SAU-03's plan.
3. **Cookie name port.** `scriba_setup_<SCRIBA_PORT>`. Under `npm run dev` the browser uses 4200, while `SCRIBA_PORT` is 8080. Names stay unique, so this is harmless, but SAU-03 confirms the choice before it sets the cookie.
4. **`chmod` on a Docker bind mount.** The `.scriba` directory is a bind mount in the image. The local tests cannot reach that; PLT-16 and SAU-21 smoke runs can. If the `chmod` is refused there, the fallback is a Platform change that creates `.scriba` at 0700 in `ensureAppState`. No such change is made here.
5. **Print label.** `Setup URL: ` is this plan's choice; the unit names no label.
6. **Dev base and SAU-08 (resolved by DECISIONS line 707).** DECISIONS 2026-11-12 PLT-13 revision 1 review, "Text 4" (line 698), says the dev script leaves `SCRIBA_SETUP_URL_BASE` unset. The revision 2 review (line 707) says the root `dev` script sets it to `http://localhost:4200` and that the harness's `127.0.0.1:8080` default is correct (`plans/PLT-13.md` lines 262 and 297). Line 707 supersedes line 698, so no DECISIONS fix is needed before SAU-08. SAU-08 runs on the PLT-13 harness, which leaves the base unset, so its URL is `http://127.0.0.1:8080`.
7. **Wording of unit line 25.** "field-level merges via Platform's section read/write" reads as if Platform merges. Platform's `write` replaces the section. The merge is read-merge-write in the caller (SAU-05, SAU-09). Not a conflict; SAU-02 writes nothing to the section.
8. **Registry access.** `npm ci` needs the registry, or `--prefer-offline` with the npm cache. The planner did not run it. If neither works, stop and report.
9. **Shared entry edit.** The one-line `BootError` re-export in Platform's entry is a change to Platform's file. The coordinator accepts it, or the store throws a plain `Error`, which `main.ts` prints with a stack trace.

## 7. Facts checked and assumed

(a) Checked by the planner, by reading, grep, `git` or the npm cache. Nothing was built or installed.

- `git rev-parse --short HEAD`: `5c6b80d`, branch `main`. `git status --short`: no output. `git diff --quiet 5c6b80d HEAD -- apps packages`: exit 0. `git log --oneline -5` shows SAU-01 merged (commits 92d137c and 5c6b80d). Commit 0eafc32 (the rejection of revision 1) is a DECISIONS-only commit on top.
- `node -v`: v26.13.0. `npm -v`: 11.20.0.
- Unit `units/SAU-02-token-store-setup-url.md`: front matter lines 1 to 10 (`blocked_by: [SAU-01]`, `unblocks: [SAU-03, SAU-04, SAU-05]`); Decisions lines 18 to 25; criteria lines 28 to 31. The unit has no route and no endpoint.
- Inverse of `unblocks`: `grep -n "SAU-02" units/*.md` finds `blocked_by: [SAU-02]` in SAU-03 (line 7), SAU-04 (line 7) and SAU-05 (line 7), and nothing else. SAU-06 is blocked by SAU-05 and Shell `phase:core`; SAU-07 by SAU-04; SAU-08 by SAU-03 to SAU-07; SAU-09 and SAU-10 by SAU-08.
- Downstream text: SAU-03 lines 18 to 25 (handshake, `cat ~/Books/.scriba/setup-url`, attributes, sign-out, identity); SAU-04 lines 18 to 21 (credential is a verified session cookie); SAU-05 lines 12 to 17; SAU-06 line 17; SAU-08 lines 17 and 21; SAU-09 line 19; SAU-10 lines 12 to 16; SAU-15 lines 19 and 20; SAU-19 line 18.
- Module `modules/setup-auth.md`: line 40 (one vertical module, `/api/setup-auth/…`), line 43 (no SSE), lines 46 and 47 (settled: stateless cookie keyed from the token, port-suffixed names), lines 49 to 52 (testing principles).
- Contract `packages/contracts/src/setup-auth/`: `routes.ts` (`HANDSHAKE_ROUTE`, `SETUP_STATUS_ROUTE` and the rest, all under `/api/setup-auth/`); `settings.ts` (`SETUP_AUTH_SECTION_SCHEMA_VERSION = 1`; `setupAuthSectionSchema` with keys `schemaVersion`, `steps`, `complete`, `preferences`, `allowlist`); `status.ts` (`SETUP_STEP_KEYS`, the three step states); `index.ts` (re-exports all seven files, including `examples.ts`). The default object of the unit validates against `setupAuthSectionSchema`, by reading the schema.
- `packages/contracts/package.json`: exports `./setup-auth` maps to `./dist/setup-auth/index.d.ts` and `./dist/setup-auth/index.js`. The exports map has ten keys (the planner printed them).
- `packages/contracts/src/platform/env.ts`: `SCRIBA_PORT` default `'8080'` (host publish port; the app listens on 8080 in the container); `SCRIBA_SETUP_URL_BASE` default `'http://127.0.0.1:${SCRIBA_PORT}'`, kept as text.
- `apps/api/src/modules/platform/boot/env.ts`: `SCRIBA_SETUP_URL_BASE` is read with `rules.url` (`z.url()`), with the fallback `http://127.0.0.1:${port}`. `ScribaEnv.SCRIBA_PORT` is a number; `SCRIBA_BOOKS_DIR` is an absolute path.
- `apps/api/src/bootstrap.ts`: order env parse, `ensureAppState`, `NestFactory.create`, `app.init()`; no listen; returns the app. `apps/api/src/main.ts`: `bootstrap()`, `enableShutdownHooks`, `listen(8080, '0.0.0.0')`, and the `BootError` branch.
- `apps/api/src/app.module.ts`: line 14 `COMPOSED_MODULES: Type<unknown>[] = [PlatformModule]`; line 37 `options.modules ?? COMPOSED_MODULES`; the root module is `global: true` and exports `SCRIBA_ENV`.
- `apps/api/src/modules/platform/platform.module.ts`: entry re-exports at lines 13 to 21 (`SCRIBA_ENV`, `ScribaEnv`, `ModuleError`, `ZodValidationPipe`, `EventsPublisher`, `SettingsService`, and the settings types). `BootError` is not re-exported (`grep -n BootError` finds nothing). `PlatformModule` exports `EventsPublisher` and `SettingsService`.
- `apps/api/src/modules/platform/boot/app-state.ts`: `mkdirSync(join(SCRIBA_BOOKS_DIR, '.scriba'), {recursive: true})` with no mode, then `accessSync(W_OK)`.
- `apps/api/src/modules/platform/boot/stdout-logger.ts`: `StdoutLogger` gates Nest's `log`, `debug` and the other levels by `SCRIBA_LOG_LEVEL`; `error` and `fatal` go to stdout. A direct `process.stdout.write` is not gated.
- `apps/api/src/modules/platform/settings/settings.service.ts`: `register` checks the key, duplicates, an integer version of at least 1, and that `defaultValue.schemaVersion` equals the version; `write(key, section)` assigns `doc[key]` (a whole-section replace); `onApplicationBootstrap` reads, migrates, backs up when changed, and writes atomically. `settings.file.ts` holds the file path `.scriba/settings.yaml`.
- `apps/api/test/create-test-app.ts`: `createTestApp({libraryDir?, env?, staticRoot?, modules?})`; the base env sets the three directories and `SCRIBA_LOG_LEVEL=error`; `env` merges over it; `libraryDir` is never removed; `modules` replaces `COMPOSED_MODULES`.
- `apps/api/test/fixtures/boot-with-test-section.cjs` (PLT-07): the child pattern that calls the built `bootstrap()`, writes `BootError` messages to stderr and exits 1. `apps/api/test/fixtures/static/index.html` exists. `apps/api/test/settings.kit.ts` exists.
- `apps/api/tsconfig.build.json` and `apps/api/tsconfig.json` extend `tsconfig.base.json`, which sets no `declaration`. `grep -n declaration` finds it only in `packages/contracts/tsconfig.build.json` (line 6).
- `apps/api/test`: 30 `*.test.ts` files on main. Tests that check the `.scriba` listing (`settings-atomic.test.ts` line 33) use `settingsTestModule`, which replaces `COMPOSED_MODULES`, so they are not affected. `settings-refusal.test.ts` line 34 expects `stdout` `''` from `dist/main.js`. `app-state.test.ts` line 66 expects `stdout` `''` from a boot failure before Nest starts.
- `apps/api/package.json`: `yaml` `2.9.1` is in `dependencies`. `scripts.test` is `npm run build && vitest run`.
- Root `package.json` `dev` script: `SCRIBA_BOOKS_DIR='$PWD/.scriba-dev' … SCRIBA_DEV_ORIGINS=http://localhost:4200 SCRIBA_SETUP_URL_BASE=http://localhost:4200 node --watch apps/api/dist/main.js`. Root `devDependencies` include `eslint-plugin-boundaries`.
- `.gitignore`: line 2 `dist/`, line 5 `.scriba-dev/`.
- `eslint.config.mjs`: element `api-module` is `src/modules/*`; entry files are `**/src/modules/*/*.module.ts`; a module may import another only through an entry file (rule R1).
- Absent before `npm ci`: `ls -d apps/api/dist` gives no output; `ls node_modules/@nestjs` and `ls node_modules/zod` give no output. `apps/api/node_modules` and `node_modules` exist.
- `apps/web/src/app/features/setup-auth` and `apps/api/src/modules/setup-auth` do not exist. Nothing under `apps/api/src` mentions `setup-auth`.
- `plans/SAU-02.md` does not exist before this write (revision 1 was written once, then rewritten for revision 2). `plans/DECISIONS.md` entries read, with the grep for `SAU-02`, `setup-url`, `setup URL` and `SCRIBA_SETUP_URL_BASE`:
  - Lines 698 (PLT-13 revision 1 review, "Text 4", superseded) and 707 (PLT-13 revision 2 review: the dev script sets `http://localhost:4200`; the harness default `127.0.0.1:8080` is correct). Checked with `sed -n 707p`.
  - `plans/PLT-13.md` lines 262 (SAU-08's base URL is `http://127.0.0.1:8080`; the harness does not set the variable) and 297 (T4, the same point).
  - Lines 1402, 1404 and 1412 name SAU-02 only as part of the downstream group "SAU-02 to SAU-21" (SAU-01 entries, revision 2 and code approvals). Line 1410 is the SAU-01 revision 2 approval result.
  - Lines 1425 to 1437: the Opus rejection of revision 1 of this plan (commit 0eafc32), which is the source of this revision.
  - 2026-11-12 PLT-04 open point 1 (line 460, CommonJS).
- **Nest 12.4.2 hook order (read from the npm cache, not installed).** The tarball is `~/.npm/_cacache/content-v2/sha512/c7/45/edfb82a86a1fc263decff3d1b1b9d2689b2948321954e619a2c893af06e6b253dcc8cd0898a0e1734ecebf59d28cf69a409d68df4e7398a90548437b7598`, the integrity `sha512-x0Xt+4Koah/CY97P89GxudJomylIMhlU5hmiyJOvBuayU9zIzQiYoOFzTs6/WdKM9ppAnWjfTnOYqQVIQ3t1mA==`, read with `tar -xzOf`. Findings:
  - `nest-application-context.js` lines 277 to 304: `callInitHook` then `callBootstrapHook`, each looping over `getModulesToTriggerHooksOn()`; `getModulesToTriggerHooksOn` (from line 336): the modules are sorted by `b.distance - a.distance`, so the deepest module runs first.
  - `injector/topology-tree/topology-tree.js`: a module's depth is the longest import path from the root, which has depth 1. `scanner.js` `calculateModulesDistance` sets `moduleRef.distance` from this walk; global modules are skipped.
  - Consequence: with `SetupAuthModule` importing `PlatformModule`, `PlatformModule` has depth 3 and `SetupAuthModule` depth 2. Platform's `SettingsService.onApplicationBootstrap` (settings refusal) runs before the token store's hook. A refused boot prints no setup URL, which is what `settings-refusal` case (a) needs.
  - `injector/container.js` lines 109 to 111: global modules get `distance = Number.MAX_VALUE` for their own lifecycle hooks. `RootModule` is global. Its children are not global, so the ordering above holds.
  - Not verified by running: that `SettingsService`'s provider is instantiated before the factory in `SetupAuthModule` (the factory only calls `register`, and PLT-07 AC 1 already relies on a factory running before the hooks).
- The `npm` cache also holds `@nestjs/core` 12.3.3, which is not used.

(b) Assumed, not checked here:
- `npm ci` completes (needs the registry; open point 8).
- `chmod` on the `.scriba` directory succeeds on the host and in the container (open point 4).
- The fixture's `process.stdout.write('', callback)` before `process.exit` flushes earlier output on macOS and Linux (the pattern is standard; the AC 1 and AC 4 tests check it).
- `new URL(HANDSHAKE_ROUTE, base)` drops the base path, and the origin is all that matters.
- Vitest runs all test files of `apps/api` in worker processes, and a module-level cache in the store survives between `createTestApp` calls within one file (mutation M6 relies on it).
- The `yaml` package's `parse` is available to the test as a dependency of `apps/api`.
- The rejection line of `matches()` is written through Nest's `Logger` at `warn`, which the default `info` level prints. Its external check is in SAU-03 (open point 2).
- Every decision marked ASSUMED in section 1 (the label, the token validation text, the temp-file rename, the hash-compare method, the rejection line text and logger, the cookie format and label, the cookie-name port, the BootError re-export, the empty migrations map).
