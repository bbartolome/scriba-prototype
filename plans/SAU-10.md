---
id: SAU-10
status: draft
---
# SAU-10 plan — Compose-version status

Unit: `units/SAU-10-compose-version-status.md` (front matter lines 1 to 10; Why line 15; Decisions lines 18 to 21; criterion line 24). The unit has no notes section and no change record: `git log -- units/SAU-10-compose-version-status.md` shows only 2fed3f4 and 098add9. Revision 1, checked at main d9bf481. None of the files named in this plan changed between 3738f0e and d9bf481, except `plans/SAU-09.md` (see section 5). Blocker SAU-08 is done: `plans/SAU-08.md` line 3 says `status: done`, and its commits are on main (`c685614`, `db364c6`, `0e6778d`). This plan marks nothing passed.

## 1. Decisions this plan follows

### 1a. Settled by the unit and the module (obeyed, not reopened)

- **Compare with the expected version.** `SCRIBA_COMPOSE_VERSION` (stamped by the installer into `.env`, passed by compose) is compared with the expected compose version from Platform's version info (`composeVersion`). Source: unit line 18.
- **Three states.** `ok`; `mismatch` with expected and actual; `unknown` when the variable is missing. Source: unit line 19; criterion line 24.
- **Exposed in `GET /api/setup-auth/status`.** Source: unit line 20; `modules/setup-auth.md` line 40 (routes under `/api/setup-auth/`). The POST continue body carries the same field, because it returns the same service body (`setup-status.controller.ts` lines 29 to 34).
- **UI warning text with the one-liner.** Source: unit line 21. No SAU-10 criterion covers UI text. Who owns it is open point 1 (section 6).
- **Reads never mutate; no SSE.** Source: `units/README.md` line 129 (GET never mutates); `modules/setup-auth.md` line 43 (no SSE events in v1; UIs poll).
- **Module scope.** This module reads `SCRIBA_COMPOSE_VERSION` and writes `setup-url`. `.env` and compose writing belong to Platform. Source: `modules/setup-auth.md` line 75.
- **Test seam.** External behaviour only, through the composed app (`createTestApp`). Source: `units/README.md` line 136; `modules/setup-auth.md` lines 65 and 66.
- **Bare compose key (settled in PLT-15).** Compose passes `SCRIBA_COMPOSE_VERSION:` with no default, so an unset variable is absent in the app and reports `unknown`; a `:-0` default would report a false mismatch. Source: `plans/DECISIONS.md` line 794 (item 4 of the 2026-11-12 PLT-15 review); `deploy/compose.yaml` line 52 (present on main); `plans/PLT-15.md` lines 76 and 115.

### 1b. Facts checked on main (d9bf481)

- **Placeholder.** `apps/api/src/modules/setup-auth/setup-status.service.ts` line 18 is a comment that names SAU-10. Line 23 is the placeholder `compose: { state: 'unknown', expected: EXPECTED_COMPOSE_VERSION }`, inside `statusBody` (lines 19 to 25). `status()` is lines 42 to 45; `continueSetup()` is lines 48 to 53, with its `statusBody` call on line 52. The constructor (line 39) takes only `SettingsService`. Line 9 imports `EXPECTED_COMPOSE_VERSION` from `'../platform/platform.module'`.
- **Controller.** `setup-status.controller.ts` lines 22 to 26 (GET) and lines 29 to 34 (POST continue, `@HttpCode(200)` on line 30). Both return the service body.
- **Module.** `setup-auth.module.ts` line 24 imports `PlatformModule`; line 37 provides `SetupStatusService`; line 40 already injects `SCRIBA_ENV` in the request-policy factory.
- **Global env.** `apps/api/src/app.module.ts` lines 36 to 41: `buildRootModule` is `global: true` (line 39) and provides `SCRIBA_ENV` with `useValue: options.env` (line 40). `SetupStatusService` can inject it with no import in the module.
- **Entry file.** `apps/api/src/modules/platform/platform.module.ts` line 13 exports `SCRIBA_ENV` and `type ScribaEnv`; line 16 exports `EXPECTED_COMPOSE_VERSION`.
- **Parsed env.** `boot/env.ts` line 27 (`SCRIBA_COMPOSE_VERSION: number | undefined`); lines 54 to 58 (rule: non-negative integer, optional); lines 147 to 152 (read); lines 68 to 81 (`read`: `source[name] ?? fallback`; a bad value throws `BootError`, line 78).
- **Read once, at boot.** `apps/api/src/bootstrap.ts` line 33: `parseEnv(options.env ?? process.env)`. A changed `.env` takes effect after a restart.
- **Test env.** `apps/api/test/create-test-app.ts` lines 9 to 14 (options) and lines 78 to 84 (env; `...options.env` on line 83). When `env` is given, `process.env` is not read (`bootstrap.ts` line 33), so the developer's shell does not reach the tests.
- **Expected version.** `apps/api/src/modules/platform/compose-version.ts` line 2 (`EXPECTED_COMPOSE_VERSION = 2`). `apps/api/src/modules/platform/version.controller.ts` line 17 returns it as `composeVersion`. `deploy/compose-version` line 1 holds `2`. `apps/api/test/compose-version.test.ts` checks that the two agree.
- **Contract.** `packages/contracts/src/setup-auth/status.ts` lines 25 to 31 (`composeVersionStatusSchema`: `state` enum on line 28, `expected` integer on line 29, `actual` optional integer on line 30); lines 34 to 38 (`setupStatusSchema`, with `compose` on line 37). No refinement ties `state` to `actual`, so the API must keep that rule. No contract change is needed. Examples: `packages/contracts/src/setup-auth/examples.ts` lines 31 to 35.
- **Installer.** `scripts/entrypoint.sh` line 202 (first install writes `SCRIBA_COMPOSE_VERSION=<integer>`); line 261 (update merge replaces it with the release value); lines 99 to 104 (`check_compose_version`: a whole number of 1 or more). The installer never writes a blank value.
- **Dev.** `package.json` line 24 (`dev` script) sets no `SCRIBA_COMPOSE_VERSION`, so plain `npm run dev` reports `unknown`, as unit line 19 says.
- **Blank value.** `boot/env.ts` line 56 refuses `""`, so a blank value stops the app at boot (open point 3).
- **Existing tests.** `apps/api/test/setup-auth-status.test.ts` lines 30 to 35 (expected value read from `deploy/compose-version`); line 137 (env `SCRIBA_PORT`); lines 167 and 205 (`compose: unknown` with no env, which stays true after this plan); lines 256 to 273 (status GET writes nothing and sets no cookie). `apps/api/test/token-guard-gate.test.ts` line 92 says the compose field "is not read, because SAU-10 changes it".
- **Test helpers.** `apps/api/test/guard-request.ts` lines 7 to 18 (`RequestOptions`), line 27 (`send`), lines 80 to 98 (`sessionCookie`, Host `127.0.0.1:8080`). Usable as they are.
- **Downstream text.** `units/SAU-15-settings-page.md` line 7 (blocked by SAU-10), line 16 (versions from Platform's version info), line 17 (optional Shell banner), line 26 (warning for `mismatch` and `unknown` with the one-liner, hidden for `ok`). `units/SAU-16-setup-flow-gate.md` line 24 (unset or older: warning on `/setup` and settings; matching: none), line 28 (demo: edit `.env`, restart). `plans/SAU-06.md` line 134 (the warning: SAU-10 produces it, SAU-11 and SAU-15 show it). `units/SAU-11-wizard-shell-routing.md` lines 8 and 15 to 24 (no compose warning in its text). `units/SHL-04-theming-notices.md` line 17 (notices service; features post the compose-version warning). `plans/SAU-05.md` lines 19 and 128 (the placeholder; "SAU-10 needs no further re-export").
- **Other plans on the same files.** `plans/SAU-09.md` (planned, revised in d21928c): line 69 (edits `setup-status.service.ts`), line 83 (step 4), line 126 (merge rule with SAU-10), line 137 (textual conflict). `plans/TRG-02.md` line 134 (edits `invariant-sweep.ts` only, none of this plan's files); line 187 (MPR-08 adds only `apps/api/test/providers-gate.test.ts`). `plans/PST-10.md` lines 69 and 71 (apps/web only). No plan exists for SAU-17; its unit (line 20) names none of this plan's files.

### 1c. Small decisions made here

- **S1 Expected value.** `EXPECTED_COMPOSE_VERSION`, imported from the Platform entry as `setup-status.service.ts` already does (line 9). It is the value `version.controller.ts` returns as `composeVersion`. The service makes no HTTP call to `/api/platform/version`.
- **S2 Any difference is `mismatch`.** A newer `.env` than the image also gives `mismatch`. Reason: the contract's `state` enum has only `ok`, `mismatch` and `unknown` (`status.ts` line 28), and unit line 19 says `mismatch` with expected and actual. The criterion names only "older", and no criterion is changed. SAU-15 line 26 (warning for `mismatch`) and SAU-16 line 24 (matching: no warning) fit this.
- **S3 `actual` absent when unset.** The key is left out (not `null`, not `0`), because `status.ts` line 30 makes `actual` optional. A `0` would show a false mismatch (`plans/PLT-15.md` line 115).
- **S4 Pure check in a new file.** `apps/api/src/modules/setup-auth/compose-status.ts` (new) holds the check. The service changes only where it must (constructor, imports, `statusBody`, two call sites), which keeps its edit small beside SAU-09's (`plans/SAU-09.md` lines 69 and 126).
- **S5 Injection.** The service constructor takes `@Inject(SCRIBA_ENV) private readonly env: ScribaEnv`. `setup-auth.module.ts` does not change: `SetupStatusService` is already a provider (line 37), and `SCRIBA_ENV` is global (`app.module.ts` line 39).
- **S6 The test reads the expected value.** It reads `deploy/compose-version` as `setup-auth-status.test.ts` lines 30 to 35 do. "Older" is `expected - 1` and "equal" is `expected`, so no literal `2` appears in the test.
- **S7 Test file.** `apps/api/test/setup-auth-compose-status.test.ts` (new). It uses `send` and `sessionCookie` from `guard-request.ts`, unchanged, and a local `withLibrary` copied from `token-guard-gate.test.ts` lines 38 to 48.
- **S8 Nothing else changes.** No contract, route, SSE event, web file, `env.ts`, `invariant-sweep.ts`, deploy file or module file changes. The status GET stays read-only, so the invariant suites need no change.

### 1d. Assumed (not checked in this planning session)

- **A1** Compose resolves the bare `SCRIBA_COMPOSE_VERSION:` from the stamped `.env` value. `plans/PLT-15.md` line 14 and its step 9 name the run-time check, and fact 10A (line 393) the unset case. This plan does not re-run it. The SAU-16 demo exercises it.
- **A2** After a re-run (PLT-18, decision D5) and `docker compose up -d`, `scriba` is recreated with the new value, so the status turns `ok`. PLT-18 covers the re-run.
- **A3** SAU-17 changes none of this plan's files. Its plan does not exist, and its unit names none of them.
- **A4** Node 26 and `npm ci` work as in PLT-02. Not run here.

## 2. Files to create or change

Only these paths change.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/setup-auth/compose-status.ts` | new | `composeVersionStatus(actual, expected)`, the check (code below) |
| `apps/api/src/modules/setup-auth/setup-status.service.ts` | edit | imports (lines 1 and 8 to 13); constructor takes `SCRIBA_ENV` (line 39); `statusBody` takes a `compose` argument (line 19) and uses it on line 23 in place of the placeholder; `status()` (line 44) and `continueSetup()` (line 52) pass `composeVersionStatus(this.env.SCRIBA_COMPOSE_VERSION, EXPECTED_COMPOSE_VERSION)`; the comment on line 18 is reworded |
| `apps/api/test/setup-auth-compose-status.test.ts` | new | the tests of section 4 |

Code of the new file:

```ts
import type { ComposeVersionStatus } from '@bbartolome/scriba-contracts/setup-auth';

// `actual` is SCRIBA_COMPOSE_VERSION, or undefined when it is unset. `expected` is the compose version of this image.
export function composeVersionStatus(
  actual: number | undefined,
  expected: number,
): ComposeVersionStatus {
  if (actual === undefined) return { state: 'unknown', expected };
  return { state: actual === expected ? 'ok' : 'mismatch', expected, actual };
}
```

Not changed: `setup-auth.module.ts`, `setup-status.controller.ts`, `packages/contracts/**`, `boot/env.ts`, `compose-version.ts`, `deploy/**`, `scripts/**`, `invariant-sweep.ts`, `apps/web/**`, `units/**`, `modules/**`, `plans/**` other than this file, and `plans/DECISIONS.md`.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`, in a worktree on branch `unit/SAU-10` created from `main`: `git worktree add -b unit/SAU-10 <path> main`. Record `node -v` and `npm -v` beside each result. Do not push.

1. **Runtime.** `node -v` prints `v26.x`; record `npm -v`. Expected: exit 0.
2. **Install.** `npm ci`. Expected: exit 0.
3. **Contracts.** `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0. The API reads the contracts from `dist`; the contracts do not change.
4. **Baseline.** `npm test -w @bbartolome/scriba-api` before any edit. Expected: exit 0. Record the file and test counts.
5. **Check.** Create `compose-status.ts` (section 2).
6. **Service.** Edit `setup-status.service.ts`: the imports (`Inject` added to line 1; `SCRIBA_ENV` and `type ScribaEnv` added to the import of lines 8 to 12; `import { composeVersionStatus } from './compose-status';` after line 13); the comment on line 18; `statusBody` (line 19 gets the `compose: SetupStatus['compose']` parameter, line 23 becomes `compose,`); the constructor (line 39 gets `@Inject(SCRIBA_ENV) private readonly env: ScribaEnv`); the calls on lines 44 and 52. Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` exits 0; `git diff` shows only these hunks.
7. **Tests.** Create `apps/api/test/setup-auth-compose-status.test.ts` (section 4). Run `npm test -w @bbartolome/scriba-api -- setup-auth-compose-status`. Expected: all five tests pass.
8. **Mutation checks.** Apply each change, run step 7, then revert it:
   - M1: `compose` is always `unknown` (the comparison removed). Expected: T2 and T3 fail.
   - M2: `unknown` carries `actual: 0` (the `:-0` regression). Expected: T1 fails.
   - M3: `mismatch` drops `actual`. Expected: T2 fails.
   Record the name of each failing test. After the reverts, `git diff` matches step 6 again.
9. **Existing suites.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0, with `setup-auth-status.test.ts` (lines 167 and 205) and `token-guard-gate.test.ts` unchanged and passing.
10. **Root gates.** From the root, `npm run build` and `npm run lint` (ESLint boundaries and `prettier --check`). Expected: exit 0.
11. **Diff.** `git status --short` lists exactly: `apps/api/src/modules/setup-auth/compose-status.ts` (new), `apps/api/src/modules/setup-auth/setup-status.service.ts` (modified), `apps/api/test/setup-auth-compose-status.test.ts` (new).
12. **Commit.** On `unit/SAU-10`, commit with `feat(SAU-10): report the compose-version status`. Do not push.

## 4. Acceptance criteria and tests

Criterion (unit line 24): "Unset → `unknown`; older → `mismatch` with both values; equal → `ok`."

All tests are in `apps/api/test/setup-auth-compose-status.test.ts`. Each one boots `createTestApp({libraryDir, staticRoot, env})` on a temp library that the test removes in `finally`. `staticRoot` is `fixtures/static`, as in `setup-auth-status.test.ts`. `env` always sets `SCRIBA_PORT: '8080'`, and sets `SCRIBA_COMPOSE_VERSION` only in the cases that need it. The session cookie comes from `sessionCookie`; requests are sent with `send` and `Host: 127.0.0.1:8080`.

| Criterion or case | Test | Env | Pass condition |
|---|---|---|---|
| Unset → unknown | T1: "unset: the compose state is unknown, with the expected version and no actual" | no `SCRIBA_COMPOSE_VERSION` | GET status: `compose` equals `{state: 'unknown', expected: EXPECTED}`; the key `actual` is absent; the body passes `setupStatusSchema` |
| Older → mismatch with both values | T2: "older: mismatch with the expected and the actual version" | `EXPECTED - 1` | `compose` equals `{state: 'mismatch', expected: EXPECTED, actual: EXPECTED - 1}` |
| Equal → ok | T3: "equal: ok with both versions" | `EXPECTED` | `compose` equals `{state: 'ok', expected: EXPECTED, actual: EXPECTED}` |
| Extra, S2 | X1: "newer: mismatch, like any difference from the expected version" | `EXPECTED + 1` | `compose` equals `{state: 'mismatch', expected: EXPECTED, actual: EXPECTED + 1}` |
| Extra, the Continue body | X2: "Continue answers the same compose state as GET" | `EXPECTED - 1` | POST continue (`Origin`, cookie, `Content-Length: 0`), then GET: both bodies have the `compose` of T2 |

`EXPECTED` is read from `deploy/compose-version` as in `setup-auth-status.test.ts` lines 30 to 35. The existing tests at lines 167 and 205 (unset gives `unknown`) and at lines 256 to 273 (the GET writes nothing) are regression checks; they are not changed.

## 5. Downstream agreement and parallel work

- **SAU-15 (settings page, blocked by SAU-10).** Gets `compose` from GET status: `state`, `expected`, and `actual` when set. Its own unit (line 26) owns the warning text and the one-liner. Its versions come from Platform's version info (line 16), not from the status. Agreement: yes. The optional Shell banner (line 17; `SHL-04` notices) is not built here.
- **SAU-16 (setup-flow gate, line 24).** "Unset or older: warning; matching: none" is met by T1 to T3. Its demo (line 28) edits `.env` and restarts, which matches the read at boot (`bootstrap.ts` line 33). Agreement: yes.
- **SAU-11 (wizard, parallel with SAU-10).** Needs no SAU-10 code: it reads the published contract. Its unit names no compose warning; see open point 2.
- **SAU-09 (setup-flow API, parallel, planned).** Same file. The merge rule, in either order, is the rule that `plans/SAU-09.md` section 5 (line 126) asks of this plan:
  1. `statusBody` keeps SAU-09's `steps` expression (its D3 precedence) and takes SAU-10's `compose` parameter and `compose` property.
  2. Imports: both units' names are kept (`Inject` and `Injectable`; `SCRIBA_ENV` and `ScribaEnv`; SAU-09's preferences types).
  3. Constructor: if SAU-09 adds a parameter, both parameters stay, in order.
  4. SAU-09's new methods (`setStep`, `preferences`, `savePreferences`) are kept.
  5. `status()` and `continueSetup()` pass the compose argument; SAU-09's calls keep their own arguments.
  The conflicts are textual. After the merge, T1 to T3 and SAU-09's tests must both pass.
- **TRG-02 (planned).** Edits `invariant-sweep.ts` after line 107 and its own module files (`plans/TRG-02.md` line 134). None of this plan's files. No overlap.
- **MPR-08 (planned).** Adds `providers-gate.test.ts` only (`plans/TRG-02.md` line 187). No overlap.
- **PST-10 (draft).** Web only (`plans/PST-10.md` lines 69 and 71). No overlap.
- **SAU-17 (parallel, no plan).** No overlap found (assumption A3).
- **Done work.** The placeholder that SAU-05 left (`plans/SAU-05.md` lines 19 and 128) is replaced here. The bare key of PLT-15 (`deploy/compose.yaml` line 52) is used as it is. `token-guard-gate.test.ts` line 92 needs no change.

## 6. Open points

1. **Who owns the warning text and the one-liner.** Unit line 21 puts the one-liner in "the UI warning text", but no SAU-10 criterion covers UI, and the status carries no text (`status.ts` lines 25 to 31). This plan ships no UI text. Proposed: SAU-15 renders the warning with the one-liner (its line 26 says so), and SAU-11 renders it on `/setup` (open point 2). Reviewer to confirm, or name another owner. A text field in the contract would be a contract change; it is not proposed here.
2. **The `/setup` warning has no unit.** `units/SAU-16-setup-flow-gate.md` line 24 requires `/setup` to show the warning, and `plans/SAU-06.md` line 134 assigns the display to SAU-11. `units/SAU-11-wizard-shell-routing.md` names no compose warning (lines 15 to 24). SAU-11's unit needs a change; that is outside this plan.
3. **A blank value stops the app.** A blank `SCRIBA_COMPOSE_VERSION=` in `.env` stops the app at boot (`boot/env.ts` lines 56 and 78), instead of reporting `unknown` as the unit's "missing" suggests. The installer never writes a blank value (`scripts/entrypoint.sh` lines 99 to 104, 202, 261). Proposed: leave `env.ts` as it is (it is Platform's file, and `plans/PLT-15.md` line 102 says a blank value must not be passed). Reviewer to confirm.
