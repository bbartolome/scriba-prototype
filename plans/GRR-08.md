---
id: GRR-08
status: draft
unit: units/GRR-08-engine-gate.md
module: graph-runner
---
# GRR-08 plan — engine gate (closes Graph runner `phase:engine`)

Draft revision 1, planned against main `c37d390` by the planner. Revision 2 (Opus reviser, 2026-11-17, main `8e6482f`): the draft's open points 1 to 4 are settled in section 8 (simplest option each); the new test file is dropped, so the unit changes no file outside `plans/` and `units/`; the criterion-2 set is narrowed to Setup & auth's two invariant files; a negative control shows that the sweep reaches the graph-runner routes; the ticks are the orchestrator's, as in the MPR-08 precedent. No unit change. "CHECKED" means read or grepped on main, with the file and line. "ASSUMED" means not checked here (section 3b).

## 1. Summary

GRR-08 is a checklist gate with three criteria (unit lines 17 to 19) and no Scope section. It adds no code and no test file: the gate's evidence is the existing tests of GRR-02 to GRR-07, Setup & auth's two invariant test files, and Platform's boundaries lint, run on main's commit. One temporary, reverted edit (control N) shows that the invariant sweep reaches the graph-runner routes. The implementer commits nothing; the orchestrator ticks the boxes and sets this plan to done.

## 2. Decisions this plan obeys

- **D1. The unit is the phase checklist.** Merging the unit closes `phase:engine`; its three criteria are ticked when they pass. Source: unit lines 14 and 16 to 19; `units/README.md` line 69 (a phase closes when its gate unit is merged) and line 118 (the phase row: GRR-02 to GRR-08, gate GRR-08).
- **D2. Routes behind the guard, with fixed verbs.** `/api/graph-runner` routes sit behind Setup & auth's global guard. Reads are GET and never mutate; every command is POST. Source: `modules/graph-runner.md` line 41; `apps/api/src/modules/setup-auth/setup-auth.module.ts` line 59 (`APP_GUARD`).
- **D3. Boundaries.** graph-runner and agent-loop never import each other. Source: `modules/graph-runner.md` line 38; `eslint.config.mjs` lines 69 to 106 (rule R2).
- **D4. No code change in a gate.** The gate changes no file under `apps/`, `packages/`, `e2e/`, `scripts/`, `lint-fixtures/` or the root config. If a gate test fails, the cause is a defect in the gated units' code or in this plan; the implementer stops with PLAN DOES NOT WORK (section 8, OP3). Source: precedent `plans/MPR-08.md` D11 (line 44); `plans/GRR-07.md` line 163 ("GRR-08 has no plan and needs no change"); the unit has no Scope section.
- **D5. Sweep fixture rule.** A route template that contains `:` needs a `FIXTURE_PATHS` entry, or the sweeps fail by name. The sweeps enumerate `app.routes()`, so every route the router holds is swept. Source: `apps/api/test/invariant-sweep.ts` lines 4 to 5, 73, 141 to 152 and 687; `plans/GRR-02.md` S14.
- **D6. Criteria are fixed.** The three criteria are quoted verbatim in section 6 and are not changed or weakened. Source: unit lines 17 to 19.
- **D7. Who ticks.** The implementer runs the procedure and records the results; it does not tick boxes and does not change the plan status. The orchestrator ticks lines 17 to 19 of the unit file and sets `status: done` in this plan on `unit/GRR-08` after the review approves, as for MPR-08 (`plans/MPR-08.md` line 63) and GRR-07 (`git show --stat 0a7345d`: only the plan and the unit file).
- **D8. Reviser's choices (simplest option, recorded here).** No new test file (OP2). The criterion-2 tests are the two invariant files only (OP4). A local run on main's commit is the evidence for the ticks (OP1). The work runs in the worktree `scriba-prototype-wt/GRR-08` on branch `unit/GRR-08`, as the other units in progress do (`git worktree list`).

## 3. Facts checked and facts assumed

### 3a. CHECKED

- **C1.** Unit front matter: `blocked_by` (line 7) names GRR-02 to GRR-07, PST-22 and SAU-08; `parallel_with` (line 8) names GRR-10, GRR-11, GRR-12 and GRR-14; `unblocks` (line 9) is GRR-17. The unit has no Scope, no Decisions and no change note. The three criteria (lines 17 to 19) are unticked. None names CI.
- **C2.** Every blocker is done on main (`status: done` in `plans/GRR-02.md` to `plans/GRR-07.md`, `plans/PST-22.md`, `plans/SAU-08.md`). `plans/QUEUE.md` line 4: GRR-08 available, all `blocked_by` done.
- **C3.** The 23 criteria of GRR-02 to GRR-07 are all ticked on main: GRR-02 lines 26 to 29 (4), GRR-03 lines 27 to 30 (4), GRR-04 lines 30 to 34 (5), GRR-05 lines 23 to 25 (3), GRR-06 lines 29 to 33 (5), GRR-07 lines 23 and 24 (2).
- **C4.** The seven test files and their 23 `it` blocks (grep `^\s*it\(`): `apps/api/test/graph-runner-graph-crud.test.ts` lines 98, 210, 252, 294; `graph-runner-validation.test.ts` lines 601, 624, 647, 685; `graph-runner-run.test.ts` lines 72, 118, 159, 212, 256; `graph-runner-stop.test.ts` lines 136, 196, 286; `graph-runner-output.test.ts` lines 104, 187, 240, 285, 314; `graph-runner-log.test.ts` line 63; `graph-runner-recovery.test.ts` line 56. `graph-runner-output.kit.ts` and `graph-runner-run.kit.ts` are helpers, not test files.
- **C5.** `packages/contracts/src/graph-runner/routes.ts` lines 5 to 19 define ten routes: GET `/api/graph-runner/graphs`, GET `.../graphs/:id`, POST `.../graphs/create`, `.../graphs/validate`, `.../graphs/:id/save`, `.../graphs/:id/rename`, `.../graphs/:id/delete`, POST `/api/graph-runner/runs`, POST `.../runs/stop`, GET `.../runs/current`.
- **C6.** `apps/api/src/modules/graph-runner/graphs.controller.ts` `@Controller()` line 27, routes at lines 31 (GET list), 36 (GET detail), 41, 49, 55, 61, 70 (POST). `runs.controller.ts` `@Controller()` line 17, routes at lines 21 (POST start), 30 (GET current), 35 (POST stop). Neither uses `@Public()`. `graph-runner.module.ts` lines 13 to 17 register both controllers.
- **C7.** `apps/api/src/app.module.ts` line 17 imports `GraphRunnerModule`; `COMPOSED_MODULES` (lines 20 to 28) holds it.
- **C8.** The guard is global (`setup-auth.module.ts` line 59). `setup-auth.guard.ts` line 54: a route is public only with `@Public()` or on `/healthz`; lines 74 to 99: with no credential and not public, it throws `AUTH_REQUIRED` (401). `apps/api/src/modules/setup-auth/public-route.decorator.ts` line 7 exports `Public`.
- **C9.** `apps/api/test/invariant-sweep.ts`: `FIXTURE_PATHS` line 73, the four graph-runner `:id` entries at lines 141 to 152 (`no-such-graph`); `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` lines 38 and 39; `sweepMutations` (line 679) reads `app.routes()` at line 687 and records `no-credential-401` with the route template (lines 701 to 705); `isAuthRequired` (line 640) wants 401, JSON and `AUTH_REQUIRED`.
- **C10.** Setup & auth's invariant tests are SAU-07's two files ("Cross-module invariant tests", `units/SAU-07-invariant-tests.md` line 3; `modules/setup-auth.md` line 3, "the cross-module GET/HEAD-never-mutate and mutation-guard invariant tests"): `apps/api/test/invariant-get-head.test.ts`, `it` at lines 55 (test 1), 88 and 125 (controls); `apps/api/test/invariant-mutation-guard.test.ts`, `it` at lines 52 (test 2, its coverage step at line 55), 69 (control N2) and 92 (control N3). Six tests. `token-guard-gate.test.ts` is SAU-08's gate test file, not an invariant test.
- **C11.** Lint: `eslint.config.mjs` R1 lines 50 to 68, R2 lines 69 to 142. `scripts/boundaries.test.mjs`: the four bad fixtures at lines 26 to 31; the criterion-1 test at lines 81 to 86. Root `package.json` line 25 (`test`) and line 26 (`lint`: workspace lints, `lint:examples`, `lint:packs`, `prettier --check .`). `apps/api/package.json` line 7 (`test`: `npm run build && vitest run`).
- **C12.** Boundary grep on main (run by the reviser at `8e6482f`): `grep -rnE "from '[^']*agent-loop" apps/api/src/modules/graph-runner apps/api/test/graph-runner-*` prints nothing; `grep -rnE "from '[^']*graph-runner" apps/api/src/modules/agent-loop` prints exactly `tools/narrative-tools.ts:15` and `tools/output-routing.ts:1`, both importing `@bbartolome/scriba-contracts/graph-runner` (a contract import, allowed by PLT-09 criterion 4).
- **C13.** `apps/web/src/app/features/` has no graph-runner feature on main.
- **C14.** `plans/DECISIONS.md` (grep by GRR-08, GRR-07, GRR-17, SAU-08, PST-22): no entry has GRR-08 as its subject. SAU-08 criterion 7 ("Both invariant tests pass in CI") stayed unticked (lines 3946 to 3955); GRR-01 criterion 5 ("Contract tests pass in CI") stayed unticked, a local run being "evidence, not the test" (lines 4445 to 4450). Both criteria name CI.
- **C15.** `plans/MPR-08.md` (a done gate): D11 line 44 (no code change; a failing gate test is PLAN DOES NOT WORK); line 63 (the orchestrator ticks and sets the plan to done on the unit branch).
- **C16.** Downstream: `units/GRR-17-canvas-gate.md` line 7 names GRR-08 in `blocked_by`; its Scope (lines 17 and 18) and criteria (lines 21 to 24) name no GRR-08 criterion, file or test.

### 3b. ASSUMED

- **A1.** The 23 tests of criterion 1, the six invariant tests and the lint pass on main. Not run by the reviser; steps 4, 5 and 8 check them.
- **A2.** Node 26 (`.nvmrc` is `26`) is on PATH. Step 0 checks it.
- **A3.** With `@Public()` on a graph-runner handler, a request without a credential gets a status other than 401 `AUTH_REQUIRED` (C8 lines 94 to 99 skip the throw for a public route). Step 6 checks it.

## 4. Files to change

None by the implementer. The gate adds no code, no test, no lint rule and no contract (D4).

| Path | Change | By |
|---|---|---|
| `units/GRR-08-engine-gate.md` | `[ ]` to `[x]` on lines 17, 18 and 19, only for the criteria whose tests passed | the orchestrator, after the review (D7) |
| `plans/GRR-08.md` | `status: done` | the orchestrator (D7) |

Not changed, on purpose: every file under `apps/`, `packages/`, `e2e/`, `scripts/`, `lint-fixtures/`; `eslint.config.mjs`; `package.json`; `package-lock.json`; `plans/DECISIONS.md`. The temporary edit of step 6 is reverted before step 7 and is never committed.

## 5. Procedure

Work in the worktree `/Users/bbartolome/workspace/scriba-prototype-wt/GRR-08` on branch `unit/GRR-08`. Record `node -v` and `npm -v` beside the results. Do not push. Do not commit. Use absolute paths. Any step whose result differs from "Expected" stops the procedure there (section 8, OP3).

0. **Runtime.** `node -v`. Expected: `v26.x`. Record `npm -v`.
1. **Worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GRR-08 -b unit/GRR-08 main`. Then, in the worktree, `git rev-parse HEAD` and `git rev-parse main`. Expected: the two hashes are equal. This makes the runs of steps 4, 5, 7 and 8 runs of main's commit (criterion 1 says "on `main`").
2. **Dependencies.** `npm ci` in the worktree root. Expected: exit 0; `git status --short` prints nothing.
3. **Build the contracts.** `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
4. **Criterion 1 (test T1).** `npm test -w @bbartolome/scriba-api -- graph-runner-graph-crud graph-runner-validation graph-runner-run graph-runner-stop graph-runner-output graph-runner-log graph-runner-recovery`. Expected: exit 0; 7 files; 23 tests passed; 0 failed; 0 skipped.
5. **Criterion 2 (test T2).** `npm test -w @bbartolome/scriba-api -- invariant-get-head invariant-mutation-guard`. Expected: exit 0; 2 files; 6 tests passed; 0 failed; 0 skipped.
6. **Control N (criterion 2).** In the worktree, temporarily add `@Public()` above `@Get(GRAPHS_ROUTE)` (line 31) and above `@Post(GRAPH_SAVE_ROUTE)` (line 49) in `apps/api/src/modules/graph-runner/graphs.controller.ts`, with `import { Public } from '../setup-auth/public-route.decorator';`. Run `npm test -w @bbartolome/scriba-api -- invariant-mutation-guard`. Expected: test 2 (line 52) fails; its verdict contains `{kind: 'no-credential-401', method: 'GET', path: '/api/graph-runner/graphs'}` and `{kind: 'no-credential-401', method: 'POST', path: '/api/graph-runner/graphs/:id/save'}`, and every entry of the verdict names one of these two routes; controls N2 and N3 pass. Record the verdict. Then `git checkout -- apps/api/src/modules/graph-runner/graphs.controller.ts` and `git status --short`. Expected: no output.
7. **Criterion 3 (tests T3a and T3c).** `node --test scripts/boundaries.test.mjs`. Expected: exit 0; the criterion-1 test passes. Then `grep -rnE "from '[^']*agent-loop" apps/api/src/modules/graph-runner apps/api/test/graph-runner-*`. Expected: no output. Then `grep -rnE "from '[^']*graph-runner" apps/api/src/modules/agent-loop`. Expected: exactly two lines, `tools/narrative-tools.ts:15` and `tools/output-routing.ts:1`, both importing `@bbartolome/scriba-contracts/graph-runner`.
8. **Criterion 3 (test T3b).** `npm run lint` at the worktree root. Expected: exit 0; the last line is `All matched files use Prettier code style!`.
9. **Record.** Report the Node and npm versions, the hash of step 1, each command's exit code and counts, and the verdict of step 6. Then `git status --short` and `git log --oneline main..unit/GRR-08`. Expected: both print nothing. The orchestrator then ticks the criteria whose tests passed and sets this plan to done (D7).

## 6. Acceptance criteria and tests

Each criterion has one test (T1, T2, T3). Control N and the sub-checks T3a to T3c belong to the test of their criterion.

### Criterion 1 (unit line 17)

"GRR-02…GRR-07 criteria pass on `main`."

- **Test T1 (step 4).** The seven files of C4, 23 tests, on main's commit (step 1). Pass: exit 0, 23 passed. One test per criterion of C3:
  - GRR-02 (`graph-runner-graph-crud`, 4): create, save, rename, list and delete change the files; a schema-invalid save is refused and leaves the file unchanged; a `schemaVersion: 2` file is refused and listed as invalid; a rename to a taken id fails and the GETs write nothing.
  - GRR-03 (`graph-runner-validation`, 4): each rule's fixture gives exactly its issues; a type-mismatched wire saves and lists an error; a disabled tool gives `disabled-tool`; the validate endpoint accepts an unsaved graph and writes nothing.
  - GRR-04 (`graph-runner-run`, 5): topological `node-status` order and `done`; "Run to here"; the three refusals; a file input read once; current run state.
  - GRR-05 (`graph-runner-stop`, 3): fail-fast; stop within 2 seconds with the request aborted and no pending change; project switch.
  - GRR-06 (`graph-runner-output`, 5): one pending change per output node with origin and provenance; captured base and conflict; target precedence and folder refusal; a schema-failing graph output; the registered validator refuses an invalid graph propose.
  - GRR-07 (`graph-runner-log` 1, `graph-runner-recovery` 1): the log entries parse; after a restart the run is `stopped` with reason `interrupted`.

### Criterion 2 (unit line 18)

"Every `/api/graph-runner` route is behind the guard; Setup & auth's invariant tests pass for them."

- **Test T2 (step 5).** Setup & auth's invariant tests (C10): `invariant-get-head.test.ts` test 1 and its two controls, and `invariant-mutation-guard.test.ts` test 2 and its two controls, over the composed app (`COMPOSED_MODULES` holds `GraphRunnerModule`, C7). Test 2 sends every enumerated route a request without a credential and wants 401 `AUTH_REQUIRED` ("behind the guard"), and refuses every mutation without Origin, with a foreign Origin or a foreign Host; test 1 checks that GET and HEAD to every enumerated route leave the library and event stream unchanged. Pass: exit 0, 6 passed.
- **Why this covers every graph-runner route.** The sweeps enumerate the router (`app.routes()`, C9), which holds every route the app serves; the four `:id` templates have fixture paths (C9 lines 141 to 152), and a template without one fails by name (D5). T1 exercises the ten routes of C5 over HTTP, so they are served.
- **Control N (step 6).** A temporary `@Public()` on one graph-runner route without `:` (GET list) and one with `:` (POST save) makes test 2 report exactly those two routes. This shows that the sweep reaches the graph-runner routes, including a fixture-path one, and that its verdict fails for an unguarded one. The edit is reverted and never committed.

### Criterion 3 (unit line 19)

"Platform's boundaries lint confirms no import between `graph-runner` and `agent-loop`."

- **Test T3 (steps 7 and 8).** Pass: all three sub-checks pass.
  - **T3a (step 7).** `node --test scripts/boundaries.test.mjs`, criterion-1 test (lines 81 to 86): each of the four bad fixtures (graph-runner to agent-loop and back, service and module) fails a `boundaries/` rule. This shows that rule R2 is live.
  - **T3b (step 8).** `npm run lint`: `eslint .` on the real source of each workspace under the root config, with R1 and R2. Exit 0 means no boundaries message on the real files.
  - **T3c (step 7).** The two greps: nothing on the graph-runner side; only the two contract imports of C12 on the agent-loop side (contract imports are allowed, PLT-09 criterion 4).

## 7. Downstream and parallel agreement

- **GRR-17 (canvas gate; `blocked_by` line 7 names GRR-08).** GRR-17 waits for `phase:engine`. GRR-08 changes no file; GRR-17's Scope and criteria (lines 17 to 24) name no GRR-08 criterion, file or test. If GRR-08's gate fails, GRR-17 waits. Agreed; no change to GRR-17.
- **A later unit that adds a route under `/api/graph-runner`.** None of GRR-09 to GRR-16 adds one (grep of their unit texts for `/api`). Such a unit is swept automatically; it needs a `FIXTURE_PATHS` entry if its template contains `:` (D5). This plan keeps no route list, so nothing here needs an update.
- **GRR-07 (done).** `plans/GRR-07.md` line 163 says "GRR-08 has no plan and needs no change". This plan agrees: it changes no code (D4).
- **SAU-07, SAU-08 (done).** Their files (`invariant-sweep.ts`, the two invariant test files, `token-guard-gate.test.ts`) are run, not changed. `plans/SAU-08.md` line 126 names GRR-08 criterion 2 as relying on the composed-app sweep; T2 is that sweep.
- **PLT-09 (done).** `eslint.config.mjs` and `scripts/boundaries.test.mjs` are run, not changed.
- **PST-22 (done).** `plans/PST-22.md` line 170: PST-22 changes no code that GRR-08 uses. Agreed.
- **SAU-22 (draft; guard dev mode under `SCRIBA_DEV_AUTH=1`).** The tests here run with the variable unset (the procedure sets no environment variable), so either merge order is safe.
- **Units in progress (`unit/PST-15`, `unit/PST-17`, `unit/SAU-13`, `unit/TRG-07`, `unit/TRG-14`).** GRR-08 changes no file, so it cannot conflict with them. If one of them merges to main before GRR-08's run and breaks a test of T1 to T3, OP3 applies.

## 8. Open points (all settled by the reviser; none is left for the Navigator)

1. **OP1 — Evidence for the ticks. SETTLED: a local run on main's commit is the evidence.** Criteria 1 to 3 say "pass on `main`", "pass" and "confirms"; none names CI (C1). SAU-08 criterion 7 and GRR-01 criterion 5 stayed unticked because their text says "in CI" (C14); that cause does not apply here. Step 1 makes the run a run of main's commit.
2. **OP2 — The new test file. SETTLED: dropped.** The unit has no Scope section and its criteria do not ask for a new test (C1); `plans/GRR-07.md` line 163 says GRR-08 needs no change; a gate that changes code is not a gate (D4, MPR-08 precedent). The draft's worry, a route missing from the sweep, is answered by the router enumeration and by control N (section 6, criterion 2). The draft's T2a, T2b and its route list are removed, so no later unit has a list to keep in step.
3. **OP3 — A failing test of GRR-02 to GRR-07 (or of T2, T3) on main. SETTLED: stop and send back.** The implementer stops at the failing step, fixes nothing, ticks nothing, reverts any step-6 edit, and reports PLAN DOES NOT WORK with the failing test's name, file and line, the owning unit (by C4), and the output. The orchestrator records it in `plans/DECISIONS.md` and sends the unit back for a Navigator decision; this plan chooses no fix. A rerun to rule out a flake is not part of the procedure.
4. **OP4 — "Setup & auth's invariant tests". SETTLED: the two SAU-07 files.** `apps/api/test/invariant-get-head.test.ts` and `apps/api/test/invariant-mutation-guard.test.ts` (C10), six tests. `token-guard-gate.test.ts` is SAU-08's gate test, not an invariant test, so it is not in T2; it is unchanged and still runs in the full suite.

## 9. Review parts

**Part 1 (criteria 1 and 2): steps 0 to 6.** Tests: T1 (step 4), T2 (step 5), control N (step 6).

**Part 2 (criterion 3 and the record): steps 7 to 9.** Tests: T3, with T3a and T3c (step 7) and T3b (step 8).

Every step and every test appears in exactly one part.
