---
id: GRR-08
status: draft
unit: units/GRR-08-engine-gate.md
module: graph-runner
---
# GRR-08 plan — engine gate (closes Graph runner `phase:engine`)

Draft revision 1, planned against main `c37d390` (the working tree was clean when read). Nothing was built, installed, run, committed or changed except this file. "CHECKED" means read or grepped at `c37d390`, with the file and line. "ASSUMED" means not checked here (section 3b).

## 1. Summary

GRR-08 is a checklist gate with three criteria (unit lines 17 to 19). Its one addition is a new test file, `apps/api/test/graph-runner-guard.test.ts`, which states the ten graph-runner routes and checks that each is behind the guard. No production code, lint config, contract or sweep changes. The gate's evidence is the existing tests of GRR-02 to GRR-07, the existing invariant tests, and the existing boundaries lint.

## 2. Decisions this plan obeys

- **D1. The unit is the phase checklist.** Merging the unit closes `phase:engine`; its three criteria are ticked when they pass. Source: unit lines 14 and 16 to 19; `units/README.md` line 69 (a phase closes when its gate unit is merged) and line 118 (the phase row: GRR-02 to GRR-08, gate GRR-08).
- **D2. Routes behind the guard, with fixed verbs.** `/api/graph-runner` routes sit behind Setup & auth's global guard. Reads are GET and never mutate; every command is POST; no other verb. Source: `modules/graph-runner.md` line 41; `units/README.md` line 132; `apps/api/src/modules/setup-auth/setup-auth.module.ts` line 59 (`APP_GUARD`).
- **D3. Boundaries.** graph-runner and agent-loop never import each other, not even their entry files. Source: `modules/graph-runner.md` line 38; `units/README.md` line 131; `eslint.config.mjs` lines 69 to 106 (rule R2, module policies).
- **D4. Module shape.** The module stays one `@Module` at `apps/api/src/modules/graph-runner/`; the gate adds no module and no export. Source: `modules/graph-runner.md` line 37; `units/README.md` line 131; `graph-runner.module.ts` line 12 (it exports nothing).
- **D5. Test seam.** API tests boot the composed app with `createTestApp` on a temp library and check external behaviour only (HTTP responses, files, events). Unit tests never read `examples/`. Source: `modules/graph-runner.md` lines 48 to 55; `units/README.md` line 139; `apps/api/test/create-test-app.ts` line 66.
- **D6. Sweep fixture rule.** A route template that contains `:` needs a `FIXTURE_PATHS` entry, or the sweeps fail by name. The sweeps enumerate `app.routes()`, so a route in that list is swept. Source: `apps/api/test/invariant-sweep.ts` lines 4 to 5, 254 to 256, 539 and 687; `plans/GRR-02.md` S14 (line 26).
- **D7. Criteria are fixed.** The three criteria are quoted verbatim in section 6 and are not changed or weakened. Source: unit lines 17 to 19; `plans/DECISIONS.md` line 3955 ("a criterion cannot be weakened").
- **D8. DECISIONS.** No entry names GRR-08 as its subject. GRR-08 appears only in the SAU-08 effect line (`plans/DECISIONS.md` line 3954). The rules for ticking a criterion that needs CI are at `plans/DECISIONS.md` lines 3946 to 3955 (SAU-08) and line 5322; see open point 1.
- **D9. Planner's choices (simplest option, recorded here).** One new test file, named `graph-runner-guard.test.ts`. The route comparison drops method HEAD, because a HEAD request is answered by its GET route and the contract has no separate HEAD route. The work runs in the worktree `scriba-prototype-wt/GRR-08`, as the PST-22 precedent does (`plans/DECISIONS.md` line 5567).

## 3. Facts checked and facts assumed

### 3a. CHECKED

- **C1.** Unit front matter: `blocked_by` (line 7) names GRR-02 to GRR-07, PST-22 and SAU-08; `parallel_with` (line 8) names GRR-10, GRR-11, GRR-12 and GRR-14; `unblocks` (line 9) is GRR-17. The three criteria (lines 17 to 19) are unticked. The unit has no change note.
- **C2.** Every blocker is done on main: `plans/GRR-02.md` to `plans/GRR-07.md`, `plans/PST-22.md` and `plans/SAU-08.md` have `status: done` (line 2 or 3). SAU-08's own blocker, `plans/SHL-21.md`, is done.
- **C3.** The 23 criteria of GRR-02 to GRR-07 are all ticked: GRR-02 lines 26 to 29 (4), GRR-03 lines 27 to 30 (4), GRR-04 lines 30 to 34 (5), GRR-05 lines 23 to 25 (3), GRR-06 lines 29 to 33 (5), GRR-07 lines 23 and 24 (2).
- **C4.** The seven test files and their 23 `it` blocks: `apps/api/test/graph-runner-graph-crud.test.ts` lines 98, 210, 252, 294 (K1 to K4); `graph-runner-validation.test.ts` lines 601, 624, 647, 685 (C1 to C4); `graph-runner-run.test.ts` lines 72, 118, 159, 212, 256 (C1 to C5); `graph-runner-stop.test.ts` lines 136, 196, 286 (C1 to C3); `graph-runner-output.test.ts` lines 104, 187, 240, 285, 314 (C1 to C5); `graph-runner-log.test.ts` line 63 (C1); `graph-runner-recovery.test.ts` line 56 (C2). Two kit files, `graph-runner-output.kit.ts` and `graph-runner-run.kit.ts`, are not test files.
- **C5.** `packages/contracts/src/graph-runner/routes.ts` lines 5 to 19 define the ten routes: GET `GRAPHS_ROUTE` (`/api/graph-runner/graphs`); GET `GRAPH_ROUTE` (`/api/graph-runner/graphs/:id`); POST `GRAPH_CREATE_ROUTE` (`.../graphs/create`); POST `GRAPH_VALIDATE_ROUTE` (`.../graphs/validate`, lines 8 to 9); POST `GRAPH_SAVE_ROUTE` (`.../graphs/:id/save`); POST `GRAPH_RENAME_ROUTE` (`.../graphs/:id/rename`, lines 11 to 12); POST `GRAPH_DELETE_ROUTE` (`.../graphs/:id/delete`, lines 13 to 14); POST `RUNS_ROUTE` (`/api/graph-runner/runs`); POST `RUN_STOP_ROUTE` (`.../runs/stop`); GET `RUN_CURRENT_ROUTE` (`.../runs/current`).
- **C6.** `apps/api/src/modules/graph-runner/graphs.controller.ts`: `@Controller()` at line 27; routes at lines 31 (GET list), 36 (GET detail), 41, 49, 55, 61 and 70 (POST). `runs.controller.ts`: `@Controller()` at line 17; routes at lines 21 (POST start), 30 (GET current) and 35 (POST stop). Neither file uses `@Public()` (grep). `graph-runner.module.ts` lines 13 to 17 register both controllers; line 12 says the module exports nothing.
- **C7.** `apps/api/src/app.module.ts` line 17 imports `GraphRunnerModule`; `COMPOSED_MODULES` (lines 20 to 28) holds it at line 27.
- **C8.** The guard is global: `setup-auth.module.ts` line 59 (`APP_GUARD`); `setup-auth.guard.ts` line 54 says a route is public only with `@Public()` or on `/healthz`. `apps/api/src/modules/setup-auth/public-route.decorator.ts` line 7 exports `Public`.
- **C9.** `apps/api/test/invariant-sweep.ts`: line 73 `FIXTURE_PATHS`; lines 141 to 152 hold the four graph-runner entries (`/graphs/:id`, `/save`, `/rename`, `/delete`), added by commit `0eaedd0` (GRR-02); lines 38 and 39 hold `LOOPBACK_HOST` and `LOOPBACK_ORIGIN`; `sweepGetHead` (line 533) calls `planGetHead(app.routes(), library)` at line 539; `sweepMutations` (line 679) reads `app.routes()` at line 687; its check (a), no credential with Origin set, expecting 401 `AUTH_REQUIRED`, is at lines 701 to 705. `isAuthRequired` (line 640) is not exported.
- **C10.** Invariant tests: `apps/api/test/invariant-get-head.test.ts` test 1 at line 55 (controls at lines 88 and 125). `apps/api/test/invariant-mutation-guard.test.ts` test 2 at line 52, its coverage step at line 55, controls at lines 69 and 92. `apps/api/test/token-guard-gate.test.ts` has six tests at lines 112, 151, 180, 263, 335 and 406 (SAU-08 criteria 1 to 6); criterion 3 (line 180) covers 401 without a cookie.
- **C11.** Test helpers: `apps/api/test/create-test-app.ts`: `TestAppOptions` line 9, `RouteEntry` line 18, `createTestApp` line 66, `ownsLibrary` (a default temp library, removed on close) line 69, `enumerateRoutes` lines 40 to 52 (keys of `route.methods`, upper-cased). `apps/api/test/guard-request.ts`: `RequestOptions` line 7, `send` line 27 (methods GET, POST, OPTIONS), `sessionCookie` line 80.
- **C12.** Lint: `eslint.config.mjs` R1 at lines 50 to 68; R2 for the agent-loop and graph-runner API modules at lines 69 to 106; R2 for their web features at lines 107 to 142. `scripts/boundaries.test.mjs`: `BAD_CROSS_MODULE` lines 26 to 31 (the four bad fixtures); the criterion 1 test at lines 81 to 86. The four fixtures exist under `lint-fixtures/apps/api/src/modules/graph-runner/` and `.../agent-loop/`. Root `package.json` line 25 (`test`) and line 26 (`lint`, which ends in `prettier --check .`). `apps/api/package.json` line 7 (`test`: build, then `vitest run`) and line 8 (`lint`: `eslint .`). `apps/api/vitest.config.mts` line 8 (`include: ['test/**/*.test.ts']`).
- **C13.** Boundary grep on main: no file under `apps/api/src/modules/graph-runner/` or `apps/api/test/graph-runner-*` imports from agent-loop; `apps/api/src/modules/graph-runner/graph-files.ts` line 6 mentions agent-loop in a comment only. The agent-loop side imports only the contract: `apps/api/src/modules/agent-loop/tools/narrative-tools.ts` line 15 and `output-routing.ts` line 1 import `@bbartolome/scriba-contracts/graph-runner`; the agent-loop tests `agent-loop-output-routing.test.ts` line 25 and `agent-loop-pending-writes-gate.test.ts` line 27 import the same contract. PLT-09 criterion 4 allows contract imports.
- **C14.** `apps/web/src/app/features/` holds agent-loop, project-store, providers, setup-auth and tool-registry. There is no graph-runner web feature on main.
- **C15.** Restart recovery runs at start, not on reads: `apps/api/src/modules/graph-runner/runs.service.ts` line 348 (`onApplicationBootstrap`); `current()` at lines 325 to 329 only reads.
- **C16.** Downstream: `units/GRR-17-canvas-gate.md` line 7 (`blocked_by`) names GRR-08; its criteria (lines 21 to 24) name GRR-09 to GRR-16 and no GRR-08 criterion. GRR-09 (`units/GRR-09-graphs-route-list.md` lines 15 and 17) and GRR-13 (`units/GRR-13-run-controls-status.md` lines 18 and 20) use existing routes (list, create, rename, delete, current run state) and SSE. A grep of the GRR-09 to GRR-16 unit texts for `/api` finds no new `/api/graph-runner` route.
- **C17.** Other plans, read by grep and by section: `plans/GRR-07.md` line 163 says "GRR-08 has no plan and needs no change"; `plans/GRR-05.md` line 184 says its new POST has no `:`, so needs no fixture; `plans/GRR-06.md` line 140 says GRR-06 adds no route; `plans/GRR-02.md` line 141 says the sweeps enumerate the router, so no list needs editing.
- **C18.** Plans and branches that could touch the same files: `plans/SAU-22.md` (draft) changes `setup-auth.guard.ts` (its row 5, line 86) only under `SCRIBA_DEV_AUTH=1` (its D2, line 26, default `0`), and its line 126 expects every existing test to pass with the flag unset. `plans/TRG-14.md` (planned) names `eslint.config.mjs` only in a description (line 78) and does not change it. `git diff --name-only main...unit/TRG-14` lists 11 files, none in section 4. `unit/PST-15`, `unit/PST-17`, `unit/SAU-13` and `unit/TRG-07` show no file diff against main.
- **C19.** Precedent for a gate's docs commit: `git show --stat 0a7345d` (GRR-07) changed only `plans/GRR-07.md` and `units/GRR-07-run-logs-recovery.md` (ticks and status).
- **C20.** `git worktree list` shows the `/Users/bbartolome/workspace/scriba-prototype-wt/<ID>` precedent (PST-15, PST-17, SAU-13, TRG-07). The root `package.json` lines 11 to 13 set `engines.node` to `>=26 <27`.

### 3b. ASSUMED

- **A1.** The 23 tests of criterion 1 pass on main at `c37d390`. Not run; step 4 checks it.
- **A2.** `npm run lint` and `npm test -w @bbartolome/scriba-api` pass on main. Not run; steps 9 and 10 check it.
- **A3.** `token-guard-gate.test.ts` passes on main. Not run; step 6 checks it.
- **A4.** Express's route list holds only the registered methods (GET, POST) for these routes, with no HEAD entry. Not checked. Section 6 drops HEAD in either case, so the result does not depend on it.
- **A5.** Node 26 is on PATH. Step 0 checks it.
- **A6.** `npm ci` in the new worktree installs what `package-lock.json` names. Step 2 checks that the lock does not change.

## 4. Files to change

This is a gate. The change is one test addition (a new file) and the checklist tick. There is no production code, lint, contract or sweep change.

| Path | Change | Why |
|---|---|---|
| `apps/api/test/graph-runner-guard.test.ts` | new: two tests (T2a, T2b, section 6) | criterion 2 names the graph-runner routes; the sweeps pass silently if a route is missing from `app.routes()`, so this file states the set and checks each route's guard |
| `units/GRR-08-engine-gate.md` | edit at the docs commit: `[ ]` to `[x]` on lines 17, 18 and 19 | the checklist; only after steps 4, 6, 8, 9 and 10 pass |
| `plans/GRR-08.md` | this file; `status: draft` becomes `status: done` at the docs commit | the plan record |

Not changed, on purpose: any file under `apps/api/src/` (no code); `apps/api/test/invariant-sweep.ts` (its entries exist, C9); `apps/api/test/invariant-get-head.test.ts`, `invariant-mutation-guard.test.ts` and `token-guard-gate.test.ts` (run, not edited); `eslint.config.mjs` and `scripts/boundaries.test.mjs` (criterion 3 uses them as they are); `packages/contracts/**`; `apps/web/**`; `e2e/**`; `lint-fixtures/**`; `package.json`; `package-lock.json`; `plans/DECISIONS.md`.

`plans/GRR-07.md` line 163 says GRR-08 needs no change. This plan differs by one test file (open point 2).

## 5. Procedure

Work in the worktree `/Users/bbartolome/workspace/scriba-prototype-wt/GRR-08` on branch `unit/GRR-08` from main. Record `node -v` and `npm -v` beside each result. Do not push. Use absolute paths.

0. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.20.0`. Expected: both as stated. If `node -v` is not 26.x, stop and record it.
1. **Worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GRR-08 -b unit/GRR-08 main`. Expected: the branch is created at main's head.
2. **Dependencies.** `npm ci` in the worktree root. Expected: exit 0; `git status --short` shows no change to `package-lock.json`.
3. **Build the contracts.** The API tests import `@bbartolome/scriba-contracts/*` from `dist`. `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
4. **Criterion 1 (test T1).** `npm test -w @bbartolome/scriba-api -- graph-runner-graph-crud graph-runner-validation graph-runner-run graph-runner-stop graph-runner-output graph-runner-log graph-runner-recovery`. Expected: exit 0; 7 files; 23 tests passed; 0 failed.
5. **Write the test file.** Create `apps/api/test/graph-runner-guard.test.ts` as section 6 describes (T2a, T2b). Then `npx prettier --write apps/api/test/graph-runner-guard.test.ts`. Expected: the file is reported as written. The build in step 6 type-checks it.
6. **Criterion 2 (tests T2a to T2e).** `npm test -w @bbartolome/scriba-api -- graph-runner-guard invariant-get-head invariant-mutation-guard token-guard-gate`. Expected: exit 0; 2 + 3 + 3 + 6 = 14 tests passed; 0 failed.
7. **Negative control N, then commit.** Temporarily add `@Public()` (import it from `../setup-auth/public-route.decorator`) above `@Get(GRAPHS_ROUTE)` at line 31 of `apps/api/src/modules/graph-runner/graphs.controller.ts`. Run `npm test -w @bbartolome/scriba-api -- graph-runner-guard invariant-mutation-guard`. Expected: T2b fails for GET `/api/graph-runner/graphs` (status 200, not 401); invariant-mutation-guard test 2 fails with a `no-credential-401` violation for GET `/api/graph-runner/graphs`; T2a passes. Record both failure messages. Then revert the decorator and its import by hand, and check that `git diff --stat -- apps/api/src/modules/graph-runner/graphs.controller.ts` prints nothing. Then `git add apps/api/test/graph-runner-guard.test.ts` and commit `test(GRR-08): the graph-runner routes are the contract's ten, and each is behind the guard`. End of part 1.
8. **Criterion 3 (tests T3a and T3c).** `node --test scripts/boundaries.test.mjs`. Expected: exit 0; criterion 1 passes. Then `grep -rnE "from '[^']*agent-loop" apps/api/src/modules/graph-runner apps/api/test/graph-runner-*`. Expected: no output. Then `grep -rnE "from '[^']*graph-runner" apps/api/src/modules/agent-loop`. Expected: exactly two lines, `narrative-tools.ts:15` and `output-routing.ts:1`, both importing `@bbartolome/scriba-contracts/graph-runner`.
9. **Lint (test T3b).** `npm run lint` at the root. Expected: exit 0; the last line is `All matched files use Prettier code style!`. This runs `eslint .` in each workspace under the root config (rules R1 and R2) and `prettier --check .`, which includes the new file.
10. **Regression.** `npm test -w @bbartolome/scriba-api` and `node --test 'scripts/*.test.mjs'`. Expected: both exit 0; no test skipped or removed. Record vitest's file and test counts. Only `apps/api/test` gains a file, so the other workspaces are not run here.
11. **Ticks and status.** Only after steps 4, 6, 8, 9 and 10 pass: tick lines 17, 18 and 19 of `units/GRR-08-engine-gate.md`; set `status: done` in `plans/GRR-08.md`; commit `docs(GRR-08): mark the acceptance criteria and set the plan to done`. Expected: `git show --stat` lists only those two files.
12. **Record.** Node and npm versions, each command's exit code and counts, and the two negative-control failure messages, recorded in the review of this plan. The orchestrator commits the docs commit as in the earlier gates (C19).

Any failing step stops the procedure there. Nothing is ticked (open point 3).

## 6. Acceptance criteria and tests

### Criterion 1 (unit line 17)

"GRR-02…GRR-07 criteria pass on `main`."

- **Test T1 (step 4).** The seven files of C4, 23 tests, run with `npm test -w @bbartolome/scriba-api -- <the seven names>`. Pass: exit 0, 23 passed. Each test asserts its unit's criterion:
  - GRR-02 (`graph-runner-graph-crud`, K1 to K4): create, save, rename, list and delete change the files; a schema-invalid save is refused and leaves the file unchanged; a `schemaVersion: 2` file is refused and listed as invalid; a rename to a taken id fails and the GETs write nothing.
  - GRR-03 (`graph-runner-validation`, C1 to C4): each rule's fixture gives exactly its issues; a type-mismatched wire saves and lists an error; a disabled tool gives `disabled-tool`; the validate endpoint accepts an unsaved graph and writes nothing.
  - GRR-04 (`graph-runner-run`, C1 to C5): a three-tool recipe emits `node-status` in topological order and ends `done`; "Run to here" runs only the target and its upstream; a story graph, a second run and a recipe with blocking errors are refused; a file input is read once; current run state returns the active run, then the last finished one.
  - GRR-05 (`graph-runner-stop`, C1 to C3): a failing tool marks its node `error`, the queued nodes `stopped` and the run `error`; a stop during a slow call ends the run `stopped` within 2 seconds, with the request aborted and no pending change; a project switch ends the run `stopped` with reason `project-switched`.
  - GRR-06 (`graph-runner-output`, C1 to C5): one pending change per in-scope output node, with origin and provenance; the captured base equals the run-start content and accepting after a mid-run edit reports a conflict; target precedence and the folder refusal; a graph output that fails the schema errors the node; an invalid graph propose is refused by the registered validator.
  - GRR-07 (`graph-runner-log` C1; `graph-runner-recovery` C2): the log holds start, per-node, tool-call, pending-change and end entries that parse; after a restart, current run state reports the run `stopped` with reason `interrupted`.

### Criterion 2 (unit line 18)

"Every `/api/graph-runner` route is behind the guard; Setup & auth's invariant tests pass for them."

- **Test T2a (new, step 5 and step 6).** In `apps/api/test/graph-runner-guard.test.ts`, the test "the app holds exactly the ten graph-runner routes of the contract". It boots `createTestApp({ staticRoot })`, where `staticRoot` is `resolve(__dirname, 'fixtures/static')` as the invariant tests use, and the default temp library (removed on close, C11). It reads `app.routes()`, keeps the entries whose path starts with `/api/graph-runner`, drops method HEAD (D9), and compares the sorted `METHOD path` strings with the ten pairs of C5, built from the route constants of `@bbartolome/scriba-contracts/graph-runner`. Pass: equal. The app is closed in a `finally`. Why: a graph-runner route missing from `app.routes()` would go unswept without a failure, and a route added later fails here until the list is updated (section 7).
- **Test T2b (new, same file, step 5 and step 6).** The test "every graph-runner route answers 401 AUTH_REQUIRED without a credential". For each of the ten routes, with the concrete path (`:id` replaced by `no-such-graph`) and method GET or POST, it sends `send(app.baseUrl, { host: LOOPBACK_HOST, method, path, origin: LOOPBACK_ORIGIN })` with no cookie and no body. Pass: status 401; content type starts with `application/json`; `error.code` is `AUTH_REQUIRED`. It restates check (a) of `sweepMutations` (C9, lines 701 to 705), because that function is not exported.
- **Test T2c (existing, step 6).** `apps/api/test/invariant-get-head.test.ts` test 1 (line 55): GET and HEAD to every enumerated route leave the library and the event stream unchanged; verdict `[]`. Controls at lines 88 and 125 pass.
- **Test T2d (existing, step 6).** `apps/api/test/invariant-mutation-guard.test.ts` test 2 (line 52): every mutation is refused without a credential, a missing or foreign Origin, or a foreign Host; every other route answers 401 without a credential; verdict `[]`. The coverage step (line 55) and controls at lines 69 and 92 pass.
- **Test T2e (existing, step 6).** `apps/api/test/token-guard-gate.test.ts`, six tests (lines 112 to 406, SAU-08 criteria 1 to 6). Criterion 3 (line 180) covers 401 without a cookie and Host 403. Included because GRR-02's plan (step 13) and GRR-03's plan ran it with the two invariant files (open point 4).
- **Control N (step 7).** The temporary `@Public()` on `GET /api/graph-runner/graphs` must make T2b and invariant-mutation-guard test 2 fail, and must leave T2a passing. This shows that T2b and the sweep can fail for an unguarded graph-runner route.

Pass for the criterion: step 6 exit 0 with 14 tests passed, and control N as stated.

### Criterion 3 (unit line 19)

"Platform's boundaries lint confirms no import between `graph-runner` and `agent-loop`."

- **Test T3a (step 8).** `node --test scripts/boundaries.test.mjs`, criterion 1 (lines 81 to 86): each of the four bad fixtures (graph-runner to agent-loop, service and module; agent-loop to graph-runner, service and module) must fail a `boundaries/` rule. This shows that rule R2 is working.
- **Test T3b (step 9).** `npm run lint`: `eslint .` on the real source of each workspace under the root config, with R1 and R2 (lines 50 to 106), and `prettier --check .`. Exit 0 means no boundaries message on the real files.
- **Test T3c (step 8).** The two greps of step 8. The graph-runner side prints nothing. The agent-loop side prints exactly the two contract imports of C13. Together with T3b they show no import from either module into the other, while contract imports stay allowed (PLT-09 criterion 4).

The new file names no `examples/` path and reads no environment variable (so SAU-22's dev-mode flag stays unset).

## 7. Downstream and parallel agreement

- **GRR-17 (canvas gate; `blocked_by` line 7 names GRR-08).** GRR-17 waits for `phase:engine`. GRR-08 changes no file GRR-17 uses; its only new file is a test. GRR-17's criteria (lines 21 to 24) do not name a GRR-08 criterion. If GRR-08's gate fails, GRR-17 waits. Agreed.
- **Any unit that adds a route under `/api/graph-runner`.** None of GRR-09 to GRR-16 adds one (C16). A unit that does must add (a) a `FIXTURE_PATHS` entry if its template contains `:` (`invariant-sweep.ts` lines 4 to 5; `plans/GRR-02.md` S14), and (b) the route to the list in T2a, in the same PR. Either order ends with T2a and the sweeps green on main: if GRR-08 merges first, the adding unit makes change (b); if the adding unit merges first, GRR-08 adds the route to its list when it rebases on main, and T2a fails on GRR-08's branch until it does.
- **SAU-22 (draft; guard dev mode).** Changes `setup-auth.guard.ts` only under `SCRIBA_DEV_AUTH=1` (C18). The tests of this plan run with the flag unset (SAU-22 D2 default `0`; SAU-22 line 126 expects existing tests to pass with the flag unset), and the new file sets no env. Either order is safe while the flag stays unset in these tests.
- **TRG-14 (planned) and the in-progress branches (C18).** No overlap with section 4.
- **Done plans that touched the same files.** GRR-02 (the four `FIXTURE_PATHS` entries and `app.module.ts`, C9), SAU-07 (the sweeps), PLT-09 (`eslint.config.mjs`, `scripts/boundaries.test.mjs`, C12) and SAU-08 (`token-guard-gate.test.ts`, C10). This plan changes none of them. GRR-05 and GRR-06 add no route with `:` (C17).
- **GRR-07's note** (`plans/GRR-07.md` line 163, "no change") is superseded here by one test file. See open point 2.

## 8. Open points

1. **Evidence for the ticks.** Criteria 1 to 3 say "pass" and "confirms" and name no CI. This plan treats a local run on `unit/GRR-08` as the evidence. Two earlier criteria that needed CI stayed unticked: SAU-08 criterion 7 (`plans/DECISIONS.md` lines 3948 to 3955) and GRR-01 criterion 5 (`plans/DECISIONS.md` line 4447). A CI run needs a push (line 5322). Navigator to confirm that a local run ticks criteria 1 to 3 here.
2. **Whether the new test file is wanted.** The planner chose to add T2a and T2b (one file, section 4), because criterion 2 names the routes and the sweeps would pass silently for a missing route. The alternative is a checklist only, as `plans/GRR-07.md` line 163 suggests. Then criterion 2 rests on T2c to T2e, and steps 5 and 7, the file row of section 4, and T2a and T2b are dropped. Navigator to decide.
3. **A failing test of GRR-02 to GRR-07 on main.** The procedure stops at the failing step and nothing is ticked. The fix belongs to the owning unit and is a Navigator decision; this plan does not choose it. A failure of the stop test's 2-second bound (T1, GRR-05 C2) is recorded as it is.
4. **Which tests are "Setup & auth's invariant tests".** Criterion 2 names no file. This plan uses the two invariant files (C10) and `token-guard-gate.test.ts`, as GRR-02's plan (step 13) and GRR-03's plan did. Navigator to confirm or narrow the set.

## 9. Review parts

**Part 1 (criteria 1 and 2): steps 0 to 7.** Tests: T1 (step 4), T2a and T2b (steps 5 and 6), T2c, T2d and T2e (step 6), control N (step 7).

**Part 2 (criterion 3, lint, regression, ticks and record): steps 8 to 12.** Tests: T3a and T3c (step 8), T3b (step 9), the regression (step 10).

Every step and every test appears in exactly one part.
