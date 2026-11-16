---
id: TRG-11
title: Loader gate — registry guard test, lint:packs wiring checked, catalog service documented
status: planned
---
# TRG-11 plan — loader-validation gate: guard test for the registry routes, lint:packs check, catalog service documented

Draft by the planner (Haiku 5.5, effort xhigh), 2026-11-16. Revision 1 by the Opus reviser, 2026-11-16, checked against `main` at `902f5e2`: open points 1 to 4, 6 and 7 settled in the plan; open point 5 sent to the Navigator (it decides whether TRG-09 criterion 4, which criterion 1 of this unit re-runs, holds as written). Revision 2 by the Opus reviser, 2026-11-16: open point 5 is decided by the Navigator with option A (`plans/DECISIONS.md`, 2026-11-16, TRG-11); TRG-09 criterion 4 holds as written, and criterion 1 of this unit is unblocked. No unit change (Remove, Loosen, Reword, Split) was needed.

TRG-11 is a gate. It adds no feature. It adds one test file and one comment block, and it runs the checks of the four blocker units (TRG-06, TRG-07, TRG-09, TRG-10) and of the guard. Merging it closes Tool registry `phase:loader-validation` (unit line 14).

## 1. Decisions this plan obeys

| # | Decision | Source |
|---|---|---|
| D1 | TRG-11 is a gate. Merging it closes `phase:loader-validation`. It adds no feature. | unit line 14; `units/README.md` lines 67 to 69 (phase gates) and line 102 (table row) |
| D2 | Scope: (a) every `/api/tool-registry` route is behind Setup & auth's guard, and Setup & auth's invariant tests pass for them; (b) `npm run lint:packs` is wired into `npm run lint` and green in CI; (c) the exported catalog service is documented for the Agent loop and the Graph runner. | unit lines 17 to 19 |
| D3 | Criteria: (1) "TRG-06, TRG-07, TRG-09, TRG-10 criteria pass on `main`"; (2) "Unauthenticated requests to registry routes are refused". The unit has no Decisions, Why or Demo section, and no note that records a change of the unit. | unit lines 22 and 23; `git log` of the unit file shows only the `docs(units)` commits 2fed3f4 and 098add9 |
| D4 | Every registry route is under `/api/tool-registry`, behind Setup & auth's global guard. GET never mutates. Every command is a POST. | `modules/tool-registry.md` line 42; `units/README.md` line 131 |
| D5 | The guard is one default-deny global guard. A route without a valid setup cookie gets 401 `AUTH_REQUIRED`. A mutation without the exact Origin of its Host gets 403 `AUTH_ORIGIN_REJECTED`. The credential is checked before the Origin. | `modules/setup-auth.md` line 3; `apps/api/src/modules/setup-auth/setup-auth.guard.ts` (`canActivate`); the criterion 3 test in `apps/api/test/token-guard-gate.test.ts` |
| D6 | Setup & auth's invariant tests (SAU-07) are used as they are, not changed. Test 1 is `apps/api/test/invariant-get-head.test.ts` (GET and HEAD leave the library and the events unchanged). Test 2 is `apps/api/test/invariant-mutation-guard.test.ts` (every route without a credential gets 401; every mutation refuses a foreign Origin or Host). | `modules/setup-auth.md` line 16; both test files |
| D7 | Testing principles: external behaviour only. The seam is the composed app through `createTestApp`, with the guard and a temp library. Unit tests never read `examples/` or the real packs. | `modules/tool-registry.md` lines 48 to 53 (the real-packs rule at line 52); `units/README.md` line 138 |
| D8 | The real packs are linted by `npm run lint:packs`, and that command is part of `npm run lint`. | `modules/tool-registry.md` line 52; the TRG-07 unit; root `package.json` line 26 (`lint`) and line 28 (`lint:packs`) |
| D9 | The catalog is the module's in-process service for the Agent loop and the Graph runner, exported from `ToolRegistryModule`. The module names its surface: list, get, function schemas, port descriptors, validate. The two consumers call the registry and never each other. | `modules/tool-registry.md` lines 38 and 39; `apps/api/src/modules/tool-registry/tool-registry.module.ts` (`exports: [CatalogService]`) |
| D10 | "Green in CI" is part of scope item (b), not of a criterion, so the section "Criteria that you cannot test" does not apply to it. Agents never push (`prompt.md` line 3); only the owner pushes `main`, and only then does GitHub Actions run. So no agent observes a CI run. The plan runs the commands of the CI steps Lint, Test and Build locally, on Node 26, from the worktree root (`.github/workflows/ci.yml` lines 27, 29 and 31; the same three gates as prompt step 3, item 3). It does not run the E2E step (TRG-11 changes no web, e2e or route behaviour). The report states that the CI run itself was not observed and that the local run does not replace it. Settled by the reviser (open point 2). | `prompt.md` lines 3, 163; `.github/workflows/ci.yml`; precedent of the same split for SAU-08 criterion 7 (`plans/DECISIONS.md`, 2026-11-15, SAU-08) |
| D11 | Code commit: `feat(TRG-11): …`. Plan commit: `docs(TRG-11): draft plan`. Commits by path only. The implementer does not touch the unit file or the plan status. The orchestrator marks the checkboxes and sets `status: done` (prompt step 3, item 8). | `prompt.md` lines 13, 168, 299 to 301 |
| D12 | No test file may name `examples/`, or a quoted `examples` next to a root, here or cwd word. | `scripts/examples-check/m1.mjs` lines 24 to 34 (rules D13, R1 and R2_QUOTED) |
| D13 | The catalog documentation is a comment block above `export class CatalogService`. No new `.md` file is written. The unit names no file or place (unit line 19), so the simplest option is taken. `docs/adr/` holds decisions (module line 64; `units/README.md` line 137), not service notes. Settled by the reviser (open point 4). | unit line 19 |
| D14 | The unit's criterion 2 is tested by a test that names the registry routes it checks. It does not depend on the invariant sweep's verdict. The invariant test 2 already checks the same property for every route, so the two agree. | `apps/api/test/invariant-mutation-guard.test.ts` test 2; section 4 below |

## 2. Files to change

Only these paths change.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/test/tool-registry-loader-gate.test.ts` | new | Criterion 2: test G1 (section 4). One `it`. |
| `apps/api/src/modules/tool-registry/catalog.service.ts` | edit, comment lines only | Scope (c). Replace the two comment lines above `export class CatalogService` (lines 129 and 130 on `main`) with a block comment that keeps their two sentences and documents the consumer surface (procedure step 7). |
| `plans/TRG-11.md` | new | This plan. Committed by the planner as `docs(TRG-11): draft plan`. |

Checked and not changed: `package.json` (`lint:packs` is already wired, line 26); `.github/workflows/ci.yml`; `apps/api/test/invariant-sweep.ts` (`FIXTURE_PATHS` already holds an entry for each of the seven parameterised registry templates, lines 120 to 139); `apps/api/test/create-test-app.ts`; `apps/api/test/guard-request.ts`; `apps/api/src/modules/tool-registry/tools.controller.ts`; `apps/api/src/modules/tool-registry/tool-registry.module.ts`; `packages/packs/**`; `packages/contracts/**`; `scripts/**`; `e2e/**`; `apps/web/**`; `docs/**`; `modules/**`; `units/**` (the orchestrator alone changes the checkboxes, at prompt step 3, item 8).

## 3. Procedure

Record `node -v` and `npm -v` with each result. Node 26 is required (`package.json` `engines`). Stop at the first failing command and record it.

0. **Preconditions.** Run `git show main:plans/<ID>.md | grep -m1 '^status:'` for TRG-06, TRG-07, TRG-09, TRG-10 and SAU-08. Expected: each prints `status: done`. Run `git branch --list unit/TRG-11`. Expected: no output (a new branch). If the branch exists, continue from its commits: use `git worktree add <path> unit/TRG-11`, without `-b`.
1. **Worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/TRG-11 -b unit/TRG-11 main`. In that worktree run `node -v` (expected `v26.x`) and `npm ci`. Expected: exit 0.
2. **Baseline.** In the worktree run `npm run build`, then `npm test`. Expected: exit 0 on the unchanged tree. Record the file and test counts of `npm test -w @bbartolome/scriba-api`.
3. **Criterion 1 inputs (no edits).**
   - (a) `grep -c "\- \[ \]"` on `units/TRG-06-pack-loader-catalog.md`, `units/TRG-07-lint-pack-lint-cli.md`, `units/TRG-09-read-endpoints-enabled.md` and `units/TRG-10-save-delete-catalog-changed.md`. Expected: 0 for each.
   - (b) `npm test -w @bbartolome/scriba-api -- tool-registry invariant`. Expected: exit 0. The output shows these files as passed: `tool-registry-api`, `tool-registry-loader`, `tool-registry-lint`, `tool-registry-read-enable`, `tool-registry-save`, `tool-registry-template`, `invariant-get-head` and `invariant-mutation-guard`.
   - (c) `node --test scripts/lint-packs.test.mjs`. Expected: exit 0. Its test C2 asserts that `lint:packs` runs the CLI and that `lint` runs `npm run lint:packs` (lines 64 to 74).
   - (d) `npm run lint:packs` from the worktree root. Expected: exit 0 (TRG-07 criterion 5: it passes on the real `packages/packs`).
   - The `npm test` run of step 2 already ran every other API test file on the same tree; step 3 (b) names the blocker files so that the report shows them.
4. **Write the test file** `apps/api/test/tool-registry-loader-gate.test.ts` with test G1 of section 4. Import `createTestApp`, `RouteEntry` and `TestApp` from `./create-test-app`; `send`, `sessionCookie` and `Reply` from `./guard-request`; `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` from `./invariant-sweep`. Use the temp-library pattern (`withLibrary`, removed in a `finally`) and the `errorCodeOf` helper of `apps/api/test/token-guard-gate.test.ts`. The `staticRoot` is `resolve(__dirname, 'fixtures/static')`. The file must not contain the word `examples` (D12).
5. **Run G1.** `npm test -w @bbartolome/scriba-api -- tool-registry-loader-gate`. Expected: exit 0, one test passed.
6. **Check that G1 can fail (not a test, a check of the test).** Save `apps/api/src/modules/tool-registry/tools.controller.ts` to `/tmp/trg11-tools.controller.ts`. Add `@Public()` above the `list` handler, importing `Public` from `../setup-auth/public-route.decorator`. Run step 5's command. Expected: exit 1, with the 401 assertion failing for `GET /api/tool-registry/tools`. Restore with `cp /tmp/trg11-tools.controller.ts apps/api/src/modules/tool-registry/tools.controller.ts`, then run `git diff --quiet -- apps/api/src/modules/tool-registry/tools.controller.ts`. Expected: exit 0.
7. **Document the catalog service (scope c).** Replace the comment lines above `export class CatalogService` in `apps/api/src/modules/tool-registry/catalog.service.ts` with a block comment. Keep the two existing sentences. Add these facts, each checked against the method body:
   - The Agent loop and the Graph runner inject `CatalogService` from the exports of `ToolRegistryModule`. They do not import the other files of the module.
   - The read methods used by consumers: `list`, `detail`, `entry`, `ports`, `enabledOf`, `functions`, `validate`, `entityTypes`, `entityValidator`, `entityKinds`. `onChange` registers a listener.
   - Reads write no file. `list`, `detail`, `builtinDetail`, `userDetail`, `entry` (and so `ports`), `functions` and `validate` first re-scan the user pack. A host-side change found by that re-scan is published to the listeners, which publish `catalog-changed`. This sentence is written, because the Navigator confirmed option A (DECISIONS 2026-11-16, TRG-11). `enabledOf`, `entityTypes`, `entityKinds`, `entityValidator` and `lint` do not re-scan.
   - `lint`, `save`, `delete` and `setEnabled` are the HTTP commands. Consumers do not call them.
   - `entry` and `validate` throw `TOOL_NOT_FOUND` for an unknown name and `TOOL_INVALID` for an invalid effective tool. `validate` takes `{arguments, mode}`; `mode` `params` drops the port keys before validation.
   - `enabledOf` returns the effective switch of a valid tool (the author's override, else the spec's default).
8. **Check that step 7 changed comments only.** Run `git diff -U0 -- apps/api/src/modules/tool-registry/catalog.service.ts | grep '^[-+]' | grep -v -E '^(\+\+\+|---)' | grep -v -E '^[-+][[:space:]]*(//|/\*\*|\*|\*/|$)'`. Expected: no output.
9. **Format, types and lint.** `npx prettier --check apps/api/test/tool-registry-loader-gate.test.ts apps/api/src/modules/tool-registry/catalog.service.ts`. If it fails, run `npx prettier --write` on the same two files and check again. Then `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api`. Expected: each exits 0.
10. **Naming rule.** `grep -n -i "examples" apps/api/test/tool-registry-loader-gate.test.ts`. Expected: no output.
11. **Root gates.** From the worktree root: `npm run lint`, `npm test`, `npm run build`. Expected: each exits 0. The output of `npm run lint` contains a line for the `lint:packs` script, because `lint` runs it.
12. **Commit.** `git add apps/api/test/tool-registry-loader-gate.test.ts apps/api/src/modules/tool-registry/catalog.service.ts`, then `git commit -m "feat(TRG-11): test that the registry routes need the guard, and document the catalog service" -- apps/api/test/tool-registry-loader-gate.test.ts apps/api/src/modules/tool-registry/catalog.service.ts`. Expected: one commit on `unit/TRG-11`. If git reports that the index is locked, wait and try again.
13. **Report COMPLETE** to the orchestrator: the output of steps 3, 5, 6, 8, 9, 10 and 11 with their exit codes, the Node and npm versions, and any difference from this plan. State that step 11 is the local run of the CI Lint, Test and Build commands, that no CI run was observed (agents do not push), and that E2E was not run (D10).
14. **Orchestrator only (not the implementer).** After the Sonnet review and the three checks pass on the rebased branch, the orchestrator marks the criterion checkboxes in `units/TRG-11-loader-gate.md` on `unit/TRG-11` (criterion 1 after step 3 passes; criterion 2 after step 5 passes), sets this plan to `status: done`, makes one commit, and fast-forwards `main` (prompt step 3, items 8 and 9).

## 4. Acceptance criteria and tests

Each criterion has one test. Criterion 1 has no new test: its test is the run of the existing test files of the four blocker units (step 3). Criterion 2 has one new test, G1.

### Criterion 1: "TRG-06, TRG-07, TRG-09, TRG-10 criteria pass on `main`." (unit line 22)

- **Test:** the run in procedure step 3 on `unit/TRG-11`. The branch is `main` plus two files, and neither file belongs to a blocker's test set, so the result on `main` is the same.
- **Test files of the blockers** (named in their plans): TRG-06 `apps/api/test/tool-registry-loader.test.ts` (criteria AC1 to AC6) and `tool-registry-api.test.ts` (the TRG-02 regression); TRG-07 `apps/api/test/tool-registry-lint.test.ts` (C1, C3, C4, X1 to X4), `scripts/lint-packs.test.mjs` (C2) and the command `npm run lint:packs` (C5, run by step 11); TRG-09 `apps/api/test/tool-registry-read-enable.test.ts` (T1 to T4, E1); TRG-10 `apps/api/test/tool-registry-save.test.ts` (C1 to C5, X1 to X4) and the invariant files, which TRG-10's regression set names.
- **Ticks on `main`:** TRG-06 6 of 6, TRG-07 5 of 5, TRG-09 4 of 4, TRG-10 5 of 5 (`grep -c "\- \[x\]"`, and no `[ ]`).
- **Pass condition:** step 3 (a), (b), (c) and (d) all exit 0, and the files listed above are reported as passed.
- **Why a re-run is the test (open point 3, settled):** the criterion's words are "criteria pass on `main`". It asks for no new behaviour; each blocker criterion already has a named test in its plan, and the boxes are ticked on `main`. Re-running those tests on `main` plus this unit's two files is the direct test. No criterion text changes.
- **Open point 5 (decided by the Navigator, option A, `plans/DECISIONS.md` 2026-11-16, TRG-11):** TRG-09 criterion 4, "GETs are side-effect free", is tested by T4 (`tool-registry-read-enable.test.ts` line 278) as "the GET routes change neither the library nor the packs", and the GET/HEAD invariant allows `tool-registry/catalog-changed` on a GET (`invariant-sweep.ts` lines 153 to 166). The Navigator decided that "side-effect free" and "GET never mutates" mean that the request changes no file and no stored state, so a GET may publish `catalog-changed` when its re-scan finds a host-side change. TRG-09 criterion 4 holds on `main` as tested, and criterion 1 of this unit holds as written.

### Criterion 2: "Unauthenticated requests to registry routes are refused." (unit line 23)

- **Test G1**, in `apps/api/test/tool-registry-loader-gate.test.ts`, named `loader gate, criterion 2: every mounted /api/tool-registry route answers 401 AUTH_REQUIRED without a cookie, and GET /api/tool-registry/tools answers 200 with one`.
- **Seam:** the composed app (default modules, so `ToolRegistryModule` and `SetupAuthModule` are both in it) through `createTestApp({libraryDir, staticRoot})` on a temp library that the test removes. No packs folder exists, so the packs are empty (TRG-06 C1). No fixture pack is read.
- **Steps of G1:**
  1. `app.routes()`, filtered to paths that start with `/api/tool-registry/`, contains each of these eleven entries (`arrayContaining`, so routes that TRG-12 adds do not break it):
     - GET `/api/tool-registry/tools`, GET `/api/tool-registry/tools/:name`, GET `/api/tool-registry/tools/:name/builtin`, GET `/api/tool-registry/tools/:name/user`, GET `/api/tool-registry/functions`, GET `/api/tool-registry/entity-types`;
     - POST `/api/tool-registry/lint`, POST `/api/tool-registry/tools/:name/validate`, POST `/api/tool-registry/tools/:name/enabled`, POST `/api/tool-registry/tools/:name/save`, POST `/api/tool-registry/tools/:name/delete`.
  2. For each mounted route: the method must be GET or POST. The path is the template with `:name` replaced by `no-such-tool`; the test fails by name if a `:` or `{` remains. The request has no cookie and Host `127.0.0.1:8080`. A POST also has Origin `http://127.0.0.1:8080` and `Content-Length: 0`. Expected: status 401 and error code `AUTH_REQUIRED`. Each assertion carries the message `${method} ${path}`.
  3. Control: `sessionCookie(app, library)` on the same library, then GET `/api/tool-registry/tools` with that cookie. Expected: status 200 and a body with a `tools` array. This shows that the refusal in step 2 comes from the missing credential.
- **Why no side effect:** the guard refuses before the handler and before the body pipe, so no POST in step 2 writes a file. The criterion 3 test of `token-guard-gate.test.ts` relies on the same order.
- **Pass condition:** step 5 exits 0; the step 6 check shows the test fails when `list` is made public.
- **Relation to the invariant test:** `invariant-mutation-guard.test.ts` test 2 checks the same property for every route through `sweepMutations`. G1 names the registry routes and asserts that they are mounted, so a registry module that is missing from the composition fails G1 even though the sweep would pass.

### Scope items without a criterion

The unit has three scope items and two criteria. A scope item without a criterion is still work of the unit: the plan does it and checks it, but the check is not an acceptance test and no checkbox depends on it. The prompt requires one test for each criterion, not for each scope item (prompt line 102), and only the Navigator can add a criterion. Checks:
- (a) G1 (criterion 2), and the step 3 (b) run of the two invariant test files (SAU-07) on the tree with every registry route mounted.
- (b) The wiring already exists (TRG-07). Step 3 (c) asserts it (test C2), step 3 (d) runs `lint:packs`, and step 11 runs `npm run lint`, whose output shows `lint:packs`. "In CI" is the local run of the CI Lint command (D10).
- (c) Steps 7 to 9: the comment block, checked fact by fact against the method bodies by the reviewer, and a comment-only diff that builds and lints.
Settled by the reviser (open point 1).

## 5. Agreement with the downstream units

The five units in `unblocks` are exactly the five units whose `blocked_by` names TRG-11 (checked, section 9a).

| Unit | Needs from TRG-11 | What this plan gives | Gap |
|---|---|---|---|
| TRG-12 executor (`blocked_by` TRG-08, TRG-11, MPR-08, PLT-12) | The gate closed. `entry(name)` for `TOOL_NOT_FOUND` and `TOOL_INVALID`. `enabledOf(tool)`, which TRG-12 uses to refuse a disabled tool (its comment at `catalog.service.ts` says so). `validate(name, {mode: 'full'})`. `ports(name)`. | The documentation of step 7. No behaviour change. G1 covers any route that TRG-12 mounts, because it iterates the mounted set, and the new routes need no change to G1. | None for TRG-11. TRG-12 must add two entries to `FIXTURE_PATHS` in `apps/api/test/invariant-sweep.ts`, for `/api/tool-registry/tools/:name/render` and `/api/tool-registry/tools/:name/execute` (path with `no-such-tool`). `concretePath` throws by name for a template with no entry, so the invariant tests fail without them. |
| TRG-13 Tools page (`blocked_by` TRG-05, TRG-11, SHL-09) | The gate closed. GET `/tools` and POST `…/tools/:name/enabled` behind the guard, answering 200 with the cookie. | G1 (401 without the cookie; 200 with it on `/tools`). | None. |
| PLT-22 examples check, pack layer (`blocked_by` PLT-20, TRG-11) | The pack-lint library entry (`lintPacks`), and a per-kind validator for entity front matter (TRG-06: the loader "exposes an Ajv validator per kind … used by Platform's examples check, PLT-22"). | `lintPacks` already exists (TRG-07). Step 7 documents `entityValidator(kind)` as the per-kind validator. | None for TRG-11 (downstream note for the PLT-22 planner). `entityValidator` is a method of the Nest provider `CatalogService`. `apps/api/src/modules/tool-registry/pack-lint.ts` exports only `lintPacks`, `formatFinding` and the `PackFinding` type, and `scripts/examples-check` does not import the registry. PLT-22's own Decisions (unit line 17) say it reaches the loader and Ajv validation "through the pack-lint CLI's library entry point"; making that entry return per-kind validators and params-mode validation is PLT-22's work. TRG-11's scope (c) documents the catalog for the Agent loop and the Graph runner only (unit line 19), and its criteria do not name PLT-22. See open point 6. |
| AGL-09 narrative tools (`blocked_by` AGL-08, TRG-12, TRG-11) | Enabled, valid tools offered to a project: `functions(genrePack)`. The port descriptor of each tool, to find entity and style arguments: `ports(name)`. `entry` and `detail`. | Step 7 documents each. | None for TRG-11. Open point 5 touches its reads. |
| GRR-03 validation (`blocked_by` GRR-01, TRG-11) | Port derivation: `ports(name)` (input ports, element types, list flags, output type). Params-mode validation: `validate(name, {mode: 'params'})`, which drops port keys (`validate.ts` lines 93 to 98). The enabled state: the `enabled` field of `list`, or `entry` with `enabledOf`. `TOOL_NOT_FOUND` for an unknown name. | Step 7 documents each. | None. |

## 6. Other draft and planned plans that change the same files

Draft plans on `main` at `902f5e2`: `plans/GNP-06.md` and `plans/SAU-16.md` (and this plan). No plan is `planned`. Neither draft changes a path of section 2 (re-checked by the reviser with `grep` for `catalog.service`, `tools.controller`, `invariant-sweep` and `apps/api/src` in both).

- **`plans/SAU-16.md` (draft).** Adds `apps/api/test/setup-flow-gate.test.ts` and edits `e2e/specs/journey.e2e.ts`. No shared path. Correct in either order: each gate is its own test file, and TRG-11's test does not read a file that SAU-16 changes.
- **`plans/GNP-06.md` (draft).** Adds `packages/packs/nonfiction/entity-types/{person,claim,concept}.yaml`, deletes `.gitkeep`, and adds `apps/api/test/packs/nonfiction-entity-types.test.ts`. Its "Not changed" list excludes `apps/api/src/**`. It calls `CatalogService.entityValidator(kind)` by name, which this plan keeps. No shared path. Correct in either order: TRG-11's test uses no real pack, and step 11 (`npm run lint`, which runs `lint:packs` on the real packs) passes with or without the three new files, as long as GNP-06's files are clean under the TRG-07 rules. TRG-11 changes no pack file and no `apps/api/src/**` line that GNP-06 reads by line number. The catalog comment is added above the class, so the `catalog.service.ts` line numbers that GNP-06 cites (D9 lines 329 to 335, D10 lines 337 to 341, fact C10) shift by the number of added comment lines if TRG-11 merges first. GNP-06's step 0 already handles this: it runs `git diff --quiet 57e9f3a HEAD -- … apps/api/src/modules/tool-registry …` and re-reads the cited lines when the diff is not empty. GNP-06 does not edit the file and calls `entityValidator(kind)` and `entityTypes()` by name, so both orders are correct. To keep the shift small, step 7 adds no line inside a method body.

## 7. Open points

1. **Settled (reviser).** Scope items (b) and (c) have no acceptance criterion. A scope item without a criterion is still work of the unit, so the plan does it and checks it (section 4, "Scope items without a criterion"); the prompt asks for one test per criterion, not per scope item. No criterion is added (only the Navigator can).
2. **Settled (reviser).** "Green in CI" is in scope item (b), not in a criterion, so it is not a "criterion that you cannot test". Agents never push (`prompt.md` line 3), although `git remote -v` lists `origin`; the owner pushes `main`, and only then does CI run. The plan runs the CI Lint, Test and Build commands locally and does not run E2E; the report says that no CI run was observed (D10, step 13).
3. **Settled (reviser).** Criterion 1 is tested by re-running the blockers' named tests and `npm run lint:packs` on the tree (step 3). The criterion text asks only that those criteria pass on `main`, so no new test and no criterion change is needed (section 4).
4. **Settled (reviser).** The unit names no file for the documentation (unit line 19). The simplest option is taken: a comment block above `export class CatalogService` (D13).
5. **Decided by the Navigator (option A, `plans/DECISIONS.md` 2026-11-16, TRG-11).** A read re-scans the user pack and can publish `catalog-changed`: `list`, `detail`, `builtinDetail`, `userDetail`, `entry` (and so `ports`), `functions` and `validate` call `refresh()` (`catalog.service.ts` lines 171, 186, 192, 202, 285, 302, 320), and `refresh()` notifies the listeners (line 160), which publish `catalog-changed` (`tool-registry.module.ts` lines 39 to 54). `modules/tool-registry.md` line 42 and `units/README.md` line 131 say "GET never mutates"; TRG-09 criterion 4 says "GETs are side-effect free". The GET/HEAD invariant allows this one event on a GET (`apps/api/test/invariant-sweep.ts` lines 153 to 166, citing TRG-06 line 20 and TRG-10 line 21). `plans/DECISIONS.md` (2026-11-16, TRG-10 code review) recorded the reading as not confirmed by the Navigator. Decision (option A): "mutates" and "side effect" mean a change of a file or of stored state, so a GET may publish a host-side change that the re-scan finds. The module wording stays; TRG-06 and TRG-10 stay done; TRG-11 criterion 1 is unblocked; this plan stands as written, and step 7's sentence is written.
6. **Settled (reviser), downstream note only.** PLT-22 needs a per-kind entity validator and params-mode validation outside Nest; the pack-lint library exports only `lintPacks`, `formatFinding` and `PackFinding`. PLT-22 unit line 17 puts that access through the pack-lint library entry point, so extending the entry is PLT-22's planning point. TRG-11's scope (c) and criteria do not cover it, so TRG-11 does not change (section 5).
7. **Settled (reviser).** `enabledOf` stays public and documented. Module line 38 lists what the catalog offers; it does not require other methods to be private, and the unit does not either. TRG-12 needs the effective switch (its Decisions step 1, `TOOL_DISABLED`; the comment at `catalog.service.ts` lines 294 and 295), and GRR-03 needs the enabled state (its criterion 3). No Remove action.

## 8. Review parts

One part (a small plan).

- **Part 1: the whole plan.** Steps 0 to 14. Tests: criterion 1 (step 3 (a) to (d)); criterion 2 (test G1, steps 4 to 6). Also the checks of the scope items without a criterion: steps 7 to 9 (catalog comment, comment-only diff), step 10 (naming rule) and step 11 (root gates). The reviewer checks also that the code changes only the two paths of section 2, and compares each fact of the step 7 comment with the method body it describes.

## 9. Facts checked and facts assumed

### 9a. Checked (read or grepped on `main` at `099f556` by the planner; re-checked by the reviser at `902f5e2`)

- **Unit file.** Front matter `blocked_by` (TRG-06, TRG-07, TRG-09, TRG-10, SAU-08) and `unblocks` (TRG-12, TRG-13, PLT-22, AGL-09, GRR-03). Scope lines 17 to 19; criteria lines 22 and 23. No Decisions, Why or Demo section. No text that records a change (`grep` for "by revision", "Moved", "Removed", "Loosened", "Reworded", "Split" gives 0).
- **Inverse check.** The units whose `blocked_by` names TRG-11 are AGL-09, GRR-03, PLT-22, TRG-12 and TRG-13. This is the same set as `unblocks`.
- **Blocker status on `main`.** `plans/TRG-06.md`, `plans/TRG-07.md`, `plans/TRG-09.md`, `plans/TRG-10.md` and `plans/SAU-08.md` have `status: done`.
- **Blocker criteria.** TRG-06 6 of 6 ticked; TRG-07 5 of 5; TRG-09 4 of 4; TRG-10 5 of 5. SAU-08 6 ticked and 2 unticked (criteria 6 and 7, the CI-only ones), as the Navigator decided at `plans/DECISIONS.md` line 3946 (2026-11-15, SAU-08).
- **Lint wiring.** Root `package.json` line 26: `lint` runs `npm run lint:packs`. Line 28 defines `lint:packs` as building contracts and API, then `node scripts/lint-packs.mjs`. `.github/workflows/ci.yml`: lint at line 27, test at line 29, build at line 31. `scripts/lint-packs.test.mjs` lines 66 to 71 assert both.
- **Mounted registry routes.** `apps/api/src/modules/tool-registry/tools.controller.ts` mounts eleven routes: six GET (list, functions, entity types, detail, builtin, user) and five POST (lint, validate, enabled, save, delete). `packages/contracts/src/tool-registry/routes.ts` also has `TOOL_RENDER_ROUTE` and `TOOL_EXECUTE_ROUTE`, which no controller mounts yet (TRG-12). `grep` for `Public` in `apps/api/src/modules/tool-registry` gives no output.
- **Guard.** `apps/api/src/modules/setup-auth/setup-auth.module.ts` registers `SetupAuthGuard` as `APP_GUARD`. `setup-auth.guard.ts` checks, in order: the public marker or `/healthz`; the cookie (401 `AUTH_REQUIRED`); the Origin for a non-safe method (403 `AUTH_ORIGIN_REJECTED`).
- **Invariant sweep.** `apps/api/test/invariant-sweep.ts`: `FIXTURE_PATHS` has entries for the seven parameterised registry templates (lines 120 to 139). `sweepMutations` enumerates `app.routes()`, and for each route that is not fixed it expects `no-credential-401`. `concretePath` throws by name for a template with no entry. `EVENT_ALLOWLIST` allows `tool-registry/catalog-changed` on GET. `LOOPBACK_HOST` is `127.0.0.1:8080`.
- **Test helpers.** `apps/api/test/create-test-app.ts`: `TestApp.routes()` reads the Nest router; `libraryDir` is not removed by the app. `apps/api/test/guard-request.ts`: `send` takes method `GET`, `POST` or `OPTIONS` and an explicit Host; `sessionCookie` reads `.scriba/setup-url` and expects 303.
- **Empty packs.** `apps/api/src/modules/tool-registry/packs.ts`, `yamlFilesIn`: a folder that does not exist has no files.
- **Catalog service.** `apps/api/src/modules/tool-registry/catalog.service.ts`: class at line 132, with the two comment lines at 129 and 130. `refresh()` is called in `list`, `detail`, `builtinDetail`, `userDetail`, `setEnabled`, `save`, `delete`, `entry` and `functions` and `validate` (lines 171 to 320). `ports` calls `entry`. `lint`, `entityTypes`, `entityKinds`, `entityValidator` and `enabledOf` do not. `enabledOf` has the TRG-12 comment (lines 294 and 295). `entry` and `validate` throw `TOOL_NOT_FOUND` through `resolve` and `TOOL_INVALID` through `loaded`.
- **Module.** `apps/api/src/modules/tool-registry/tool-registry.module.ts`: `exports: [CatalogService]`; the entry file re-exports `CatalogService` and three types; a registration calls `catalog.onChange` and publishes `catalog-changed`.
- **Pack-lint library.** `apps/api/src/modules/tool-registry/pack-lint.ts` exports `lintPacks` (line 17), `formatFinding` (line 81) and `PackFinding` (line 11). `scripts/lint-packs.mjs` loads `apps/api/dist/modules/tool-registry/pack-lint.js`.
- **Validate.** `apps/api/src/modules/tool-registry/validate.ts`: in `params` mode the port keys are dropped (lines 93 to 98). `packages/contracts/src/tool-registry/call.ts`: the validate request requires `mode`.
- **Examples rule.** `scripts/examples-check/m1.mjs` lines 24 to 34. `scripts/examples-check` does not import the registry.
- **Test configuration.** `apps/api/vitest.config.mts` includes `test/**/*.test.ts`. `apps/api/tsconfig.json` includes `src` and `test`, with `types: ["node"]`.
- **Existing 401 tests.** No file matching `apps/api/test/tool-registry-*` checks a 401 (`grep` gives no output).
- **Drafts.** `plans/GNP-06.md` and `plans/SAU-16.md` are the only drafts. Their path tables were read (section 6).
- **Remote.** `git remote -v` lists `origin` (open point 2).

### 9b. Assumed (not run here; the step named checks it)

- Node 26 and npm 11.20.0 are on the PATH of the worktree (step 1).
- `npm ci` succeeds from the lockfile in the new worktree (step 1).
- The composed app mounts exactly the eleven routes of section 4, with the paths as Express 5 holds them (`:name` syntax). Step 5 checks this with `arrayContaining`.
- `GET /api/tool-registry/tools` with a cookie answers 200 and `tools: []` when no packs folder exists (step 5 checks it).
- Each registry route answers 401 with `AUTH_REQUIRED` without a cookie, because the guard runs before the handler (step 5 checks it).
- The baseline suite passes on `main` at `099f556` (step 2 checks it). `plans/DECISIONS.md` records passing runs at the approval of the blockers, not at this commit.
- The mutation in step 6 makes G1 fail (step 6 checks it).
- Prettier and the API ESLint accept the new file (step 9 checks it).

### 9c. Not checked

- The E2E step and the Playwright harness were not read or run.
- `apps/web/**` was not read. The Tools page (TRG-13) is not part of this gate.
- `modules/setup-auth.md` was read only at lines 3 and 16.
