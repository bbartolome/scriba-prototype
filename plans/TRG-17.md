---
id: TRG-17
status: draft
---
# TRG-17 plan — Editor-UI gate (closes Tool registry `phase:editor-ui`)

Revision 1, draft, written at main `614ed0c` by the planner. The reading started at `88e117a`; the only file that changed in between is `plans/QUEUE.md`. The planner ran no test and changed no file except this one. Status stays draft until the orchestrator sets it.

TRG-17 is a gate. It adds no code, no test file and no package. Its checks are the suites of TRG-13 to TRG-16 and the four workhorse golden tests of GNP-12, run on main. When they pass, the implementer ticks the two boxes of `units/TRG-17-editor-ui-gate.md` (lines 17 and 18). Open points 1 to 3 (section 6) change how the criteria are judged and are left open.

## 1. Decisions this plan obeys

- **Graph.** `blocked_by` is TRG-13, TRG-14, TRG-15, TRG-16 and "Genre packs phase:nonfiction-workhorses (GNP-12)". `unblocks` and `parallel_with` are empty (`units/TRG-17-editor-ui-gate.md` lines 7 to 9). The inverse rule holds: TRG-13, TRG-14, TRG-15, TRG-16 and GNP-12 each name TRG-17 in `unblocks` (their line 9), and no unit's `blocked_by` names TRG-17 (`units/README.md` line 64, the source of truth).
- **Gate.** Merging closes `phase:editor-ui` (`units/TRG-17-editor-ui-gate.md` line 14). A phase closes when its gate unit is merged (`units/README.md` line 69). The phase row is `units/README.md` line 105.
- **Blockers are done.** `status: done` (line 3) in `plans/TRG-13.md`, `TRG-14.md`, `TRG-15.md`, `TRG-16.md` and `GNP-12.md`. GNP-12's phase closed at its merge with its criteria 3 and 4 unticked (`units/GNP-12-workhorses-gate.md` lines 19 and 20; `plans/DECISIONS.md` lines 5255 to 5260).
- **Criteria.** Two, in the unit's words (lines 17 and 18). Criterion 1 covers ten unit criteria in four units (section 4, table 2). Criterion 2 is the M2 done-when.
- **A gate with no code.** Its branch changes only its own checkboxes. This is the GNP-12 precedent: the patch id of such a unit is the empty output of `git diff main...<branch> -- . ':!plans' ':!units' | git patch-id --stable` (`plans/DECISIONS.md` lines 5263 to 5268; the command is at line 5067).
- **Module testing rules.** External behaviour only (`modules/tool-registry.md` line 49). The primary seam uses fixture packs (line 50). Unit tests never read `examples/` or the real packs, and the real packs are linted in CI by `npm run lint:packs` (line 52). Criterion 2 names the shipped packs, so its test reads them. Read literally, line 52 forbids that; open point 2.
- **Real models.** Real models are checked only by the Agent loop's manual eval, never in CI (`units/README.md` line 139). The real-model part of GNP-12 criterion 4 has not been run (`plans/DECISIONS.md` lines 5255 to 5259; `plans/GNP-12.md` section 8, point 2). Open point 3.
- **Running app through the mock model.** TRG-16's criterion 2 is tested through the mock scenario `tool-execute-draft`, not a real model (`plans/TRG-16.md` section 7, point 1). This gate's criterion 1 includes that test.
- **Execute writes nothing.** The execute endpoint writes no file; agent and recipe writes always become pending changes (`modules/tool-registry.md` line 46). TRG-16 E1 checks that no file appears under the pending folder.
- **How e2e specs run.** One spec per invocation, with `--trace off`, and port 8080 free (`plans/TRG-13.md` section 3, step 11; `plans/TRG-14.md` section 4, step 9). Two specs in one invocation can fail (`plans/DECISIONS.md` line 5748). The e2e harness refuses to start while 8080 is held (`e2e/harness/global-setup.ts` lines 15, 20 and 43 to 44).
- **Demo.** The demo (unit lines 20 to 26) is not an acceptance criterion. Open point 4.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `units/TRG-17-editor-ui-gate.md` | edit, only after the runs of section 3 pass: lines 17 and 18, `- [ ]` to `- [x]` | the gate's checklist. No other line changes |
| `plans/TRG-17.md` | this plan. `status` is set by the orchestrator | none |

Not changed: any file under `apps/`, `packages/`, `e2e/`, `scripts/` or `examples/`; any file under `modules/`; any other unit file; `plans/DECISIONS.md` (the orchestrator records the gate's result there, as for other units).

Simplest choices, recorded: no new test file, no helper, no new name. The tests are the existing files named in section 4. The only written diff is the two ticks.

Overlap check: `grep -l -E "^status: *(draft|planned)" plans/*.md` prints `plans/GRR-13.md` only. Its file table lists `apps/web/src/app/features/tool-registry/tool-registry.routes.ts` (line 153). No path of this plan is in GRR-13's table.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v`, `npm -v` and the main SHA with each result. Do not push. Do not fix code: a failing test belongs to the unit that owns it, and the gate goes back to that unit.

0. **Preconditions.** `grep -m1 -n '^status' plans/TRG-13.md plans/TRG-14.md plans/TRG-15.md plans/TRG-16.md plans/GNP-12.md` prints `status: done` for each. `git branch --list unit/TRG-17` prints nothing. `grep -n '^- \[' units/TRG-17-editor-ui-gate.md` prints two lines, both `[ ]`. Record `git rev-parse --short main` as the base. Expected: all hold.
1. **Runtime.** `node -v` prints `v26.x` (root `engines`, `package.json` lines 11 to 13). `npm -v` prints `11.20.0` (root `packageManager`). Expected: both.
2. **Worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/TRG-17 -b unit/TRG-17 main`, then `npm ci` in it. Expected: exit 0.
3. **Repository gates.** In the worktree: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0, and `npm run lint` ends with `All matched files use Prettier code style!`. `npm test` runs each workspace's test script and `node --test 'scripts/*.test.mjs'` (root `package.json` line 25). Save the log.
4. **E2e specs (criterion 1).** Check that port 8080 is free. Then run each in its own invocation from the worktree, and save each log:
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts --trace off`: 2 passed (TRG-05 C1 and C2, changed by TRG-13).
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-editor.e2e.ts --trace off`: 2 passed (TRG-14 E1 and E2).
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-live-preview.e2e.ts --trace off`: 2 passed (TRG-15 E1 and E2).
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-try.e2e.ts --trace off`: 1 passed (TRG-16 E1).
   Expected: seven passed in four invocations. Open point 1 says what a failed invocation means.
5. **Criterion 1 check.** From the step 3 log, confirm that every file of table 2 (section 4) ran and passed. A file that did not run counts as a failure.
6. **Criterion 2 check.** `npm test -w @bbartolome/scriba-api -- test/packs/cold-open.test.ts test/packs/mystery-question.test.ts test/packs/myth-buster.test.ts test/packs/numbers-to-people.test.ts`. Expected: the four files run, and every test passes (AC 2 of each file, and myth-buster's AC 3 at line 89). The log names the four files. If npm does not pass the file arguments through, run `npx vitest run test/packs/<file>` from `apps/api` instead, and record the change.
7. **Record.** The implementer's report carries: `node -v`, `npm -v`, the base SHA, the exit code of each command, the four e2e pass lines, the step 5 and 6 file lists, and the pass counts from the logs.
8. **Tick.** Only when steps 3, 4 and 6 pass and the decisions of open points 1 to 3 allow it: change `units/TRG-17-editor-ui-gate.md` lines 17 and 18 to `- [x]`. No other line changes. Before the commit, run `git diff --name-only <base>..main -- apps e2e packages scripts`; if it is not empty for a file of table 2, rerun steps 3 to 6 on the new main.
9. **Commit.** On `unit/TRG-17`: `git add -- units/TRG-17-editor-ui-gate.md`, then `git commit -m "docs(TRG-17): criteria 1 and 2 passed"`. Then `git diff main...unit/TRG-17 -- . ':!plans' ':!units' | git patch-id --stable` must print nothing (section 1).
10. **Orchestrator.** Merges the branch, sets `status: done` in `plans/TRG-17.md`, and records the result in `plans/DECISIONS.md`, as for the other units.

## 4. Acceptance criteria and tests

Table 1. The unit's criteria, one test each.

| Criterion (unit line) | Test | Steps | Pass condition |
|---|---|---|---|
| 1. "TRG-13…TRG-16 criteria pass on `main`." (17) | T1: the ten criteria of table 2, checked through the files of table 2 and the four e2e invocations of step 4 | 3, 4, 5 | Step 3 exits 0 and every file of table 2 ran and passed. Each e2e invocation passes its count. Nothing is skipped |
| 2. "M2 done-when: each of the four nonfiction workhorses (cold open, mystery question, myth-buster, numbers-to-people), as shipped by Genre packs, produces a draft that cites its source files." (18) | T2: the four golden tests of GNP-12 T2, one per tool: `apps/api/test/packs/cold-open.test.ts` (AC 2, line 23), `mystery-question.test.ts` (AC 2, line 23), `myth-buster.test.ts` (AC 2, line 64; AC 3, line 89), `numbers-to-people.test.ts` (AC 2, line 24) | 6 | Every test passes. Each case's kind is `draft`, and its `sourcesUsed` equals the value the case declares (`cold-open.test.ts` line 30: `notes-a`, `notes-b`, `researcher-a`). The tools are the shipped ones, `packages/packs/nonfiction/tools/{cold_open,mystery_question,myth_buster,numbers_to_people}.yaml`, each with `enabled: true` |

Table 2. Evidence for criterion 1: each unit criterion, with the test that proves it. Test names are those of each unit's plan (TRG-13 section 4, TRG-14 section 5, TRG-15 section 5.1, TRG-16 section 5). Every test is in the step 3 run except the e2e rows, which run in step 4.

| Unit criterion (unit file line) | Test | File |
|---|---|---|
| TRG-13, line 21: grouping, toggle posts `enabled`, invalid marked, `catalog-changed` refresh | L1, L2, L3, L4 (and L4b) | `apps/web/src/app/features/tool-registry/tools-list.spec.ts` |
| TRG-13, line 22: phone shows only the list and toggles | L6 (and L6b) | same |
| TRG-14, line 21: invalid save shows diagnostics on their lines and keeps the old version; warnings save | T1a, T1b (`tool-editor.spec.ts`); T1d (`tools-actions.spec.ts`); E2 (e2e) | `apps/web/src/app/features/tool-registry/`; `e2e/specs/tools-editor.e2e.ts` |
| TRG-14, line 22: Customize, save, Revert | T2a, T2b | `tools-actions.spec.ts` |
| TRG-14, line 23: Compare shows the diff | T3a | `tools-actions.spec.ts` |
| TRG-14, line 24: New and Duplicate give valid YAML; Delete removes a user-only tool | T4a (`tool-template.spec.ts`); T4b, T4d, T4e (`tools-actions.spec.ts`); E1 (e2e) | `tool-template.spec.ts`; `tools-actions.spec.ts`; `e2e/specs/tools-editor.e2e.ts` |
| TRG-15, line 21: editing `x-scriba-port` and `x-scriba-entity-kinds` changes the node preview and the picker | E1 (e2e, "TRG-15 E1") | `e2e/specs/tools-live-preview.e2e.ts` |
| TRG-15, line 22: rendered-prompt tab shows the template with sample values and a real entity | E2 (e2e, "TRG-15 E2") | `e2e/specs/tools-live-preview.e2e.ts` |
| TRG-16, line 21: resolution carries the chosen IDs; execute gets the resolved entities; output and sources render | Y1, Y2 | `apps/web/src/app/features/tool-registry/tools-try.spec.ts` |
| TRG-16, line 22: in the running app, Try produces output and no file under `.scriba/pending/` | E1 (e2e, "TRG-16 E1") | `e2e/specs/tools-try.e2e.ts` |

The demo (unit lines 21 to 26) is not a test of this gate (open point 4). Its mechanisms are covered as follows. Step 1 by TRG-13 L1 and L2. Step 3 by TRG-14 T1a and E2. Step 4 by TRG-16 E1. Step 6 by TRG-14 T2b. Step 2 (the `tone` select in three views) and step 5 (the narrative tool card) have no named test.

## 5. Downstream and parallel agreement

- **No unit waits on this gate.** `unblocks: []` (unit line 9). No other unit of `phase:editor-ui` follows it (`units/README.md` line 105).
- **GNP-12.** Its `unblocks` names this gate (`units/GNP-12-workhorses-gate.md` line 9). Criterion 2 restates GNP-12 line 20. This plan uses GNP-12's CI evidence (table 1, T2) and leaves its real-model half to open point 3. GNP-12 criterion 3 (line 19) is unticked; it is not a criterion of this gate, and the demo's sample project (`examples/nonfiction`) is not checked by this plan. The gate changes no line of GNP-12.
- **TRG-13 to TRG-16.** Their plans are done. This gate runs their tests and changes none of their files.
- **AGL-11.** Done (`plans/AGL-11.md` line 3). Its unit names "Tool registry editor-ui demo step 5" in `unblocks` (`units/AGL-11-narrative-gate.md` line 9), which is informative only (`plans/AGL-11.md` line 141). No dependency.
- **Other plans that mention this gate.** `plans/GNP-07.md` line 25, `GNP-08.md` line 282, `GNP-09.md` lines 81 and 343, `TRG-10.md` lines 125 and 165, `TRG-13.md` line 117, `TRG-14.md` line 204, `TRG-15.md` line 151 and `TRG-16.md` line 192 name the gate for its demo steps or its criteria. None names a file that this plan changes.
- **Draft and planned plans.** Only `plans/GRR-13.md` (section 2). Its change to `tool-registry.routes.ts` (one export line) is not in this gate's files. Order: either. If GRR-13 merges first and breaks a table 2 test, step 3 fails and the gate waits for GRR-13's owner. If the gate's tick merges first, GRR-13 is unaffected, because the tick touches only `units/TRG-17-editor-ui-gate.md`.

## 6. Open points

Each point is a question. None is settled here, because each changes how a criterion is judged or a settled rule of the module.

1. **What a failed e2e invocation means for criterion 1.** Criterion 1 includes four e2e invocations (table 2). TRG-05 C2 once failed while port 8080 was held by another process; the cause is not established (`plans/DECISIONS.md` lines 5798 to 5804). A review recorded the same spec's failure as pre-existing (lines 5312 to 5317). TRG-15 E1 failed once and was fixed by `8c4756c` (a wait for the picker's options). Options: (a) every invocation of step 4 must pass; a failed invocation is recorded and the gate does not tick; a re-run is allowed only after the cause is shown to be outside the code (the harness's port message, for example); (b) a failure shown to be a port collision is set aside and the invocation is run again; (c) criterion 1 is judged on the component and API suites only, and the e2e results are reported separately. Options (b) and (c) change how the criterion is judged. Step 4 follows (a) until the orchestrator decides.
2. **Whether criterion 2's test may read the shipped packs.** T2 reads the shipped packs through the GNP-02 golden harness: `apps/api/test/packs/golden.kit.ts` sets `SCRIBA_PACKS_DIR` to the real packs (line 171). `modules/tool-registry.md` line 52 says unit tests never read the real packs and that the real packs are linted by `npm run lint:packs`. Options: (a) yes; the golden tests are the evidence, and line 52 covers tool-registry's own unit tests; (b) a new gate test that reads the shipped packs, which raises the same reading question; (c) no CI test; criterion 2 is judged by the manual eval only. Option (c) changes the test; the reading of line 52 is a module rule. Left open. T2 is the test under option (a).
3. **Whether criterion 2 needs the real-model run.** The criterion says "produces a draft that cites its source files" and names no model. GNP-12 criterion 4 has a CI part (T2) and a real-model part (a run with `[@id]` citations), which has not been run (`units/GNP-12-workhorses-gate.md` line 20; `plans/GNP-12.md` section 8, point 2). Options: (a) no; the CI part ticks criterion 2; (b) yes; criterion 2 stays unticked until a person records a real-model run of the four cases on a local model server, and the phase's close waits for it (`plans/DECISIONS.md` line 5260 says the phase closes at GNP-12's merge, so this changes that); (c) the gate merges with criterion 2 unticked and the cause recorded, as GNP-12 did (`plans/DECISIONS.md` lines 5255 to 5259) and AGL-11 did (lines 5275 to 5280). Left open. Step 6 runs the CI part under all three options.
4. **Whether the demo is run at this gate, and by whom.** The demo is not an acceptance criterion. Options: (a) not run at this gate; a person runs it at the M2 close; (b) the implementer runs demo steps 1, 3, 4 and 6 in the running app with the mock model and records the result; (c) all six steps, step 5 with a real model. The planner's default is (a), because no criterion depends on the demo. The orchestrator may choose (b) or (c) without changing any test in section 4.

## 7. Facts checked and facts assumed

### 7.1 Checked

- CHECKED `units/TRG-17-editor-ui-gate.md`: lines 7 (`blocked_by`), 9 (`unblocks: []`), 14 (closes the phase), 16 to 18 (the checklist, both boxes `[ ]`), 20 to 26 (demo). The file has no notes section; it ends at line 26.
- CHECKED `units/README.md`: lines 61 to 65 (blocker notation; line 64 is the source-of-truth rule), 69 (a phase closes at its gate's merge), 105 (the `phase:editor-ui` row), 139 (testing; real models only in AGL-25).
- CHECKED `modules/tool-registry.md`: line 28 (TRG-17 node in the graph), 37 (cross-cutting decisions), 46 (execute writes no files), 49 to 53 (testing principles), 50 (primary seam: fixture packs), 52 (unit tests never read `examples/` or the real packs; `npm run lint:packs`).
- CHECKED the `blocked_by`/`unblocks` lines: `units/TRG-13-tools-page-list.md` line 9 (`unblocks: [TRG-14, TRG-16, TRG-17]`), `TRG-14` line 9 (`[TRG-15, TRG-17]`), `TRG-15` line 9 (`[TRG-17]`), `TRG-16` line 9 (`[TRG-17]`), `GNP-12` line 9 (names "Tool registry editor-ui gate (TRG-17)").
- CHECKED `grep -n "TRG-17" units/*.md`: no `blocked_by` names TRG-17; `parallel_with` does not either.
- CHECKED plan statuses: `status: done` at line 3 of `plans/TRG-13.md`, `TRG-14.md`, `TRG-15.md`, `TRG-16.md`, `GNP-12.md` and `AGL-11.md`. `grep -l -E "^status: *(draft|planned)" plans/*.md` prints `plans/GRR-13.md` (line 3) only.
- CHECKED criteria boxes on main: `units/TRG-13-tools-page-list.md` lines 21 and 22 `[x]`; `TRG-14` lines 21 to 24 `[x]`; `TRG-15` lines 21 and 22 `[x]`; `TRG-16` lines 21 and 22 `[x]`; `GNP-12` lines 17 and 18 `[x]`, lines 19 and 20 `[ ]`.
- CHECKED `plans/GRR-13.md` line 153: the row for `apps/web/src/app/features/tool-registry/tool-registry.routes.ts`.
- CHECKED `packages/packs/nonfiction/tools/`: `cold_open.yaml`, `mystery_question.yaml`, `myth_buster.yaml`, `numbers_to_people.yaml`, each with `output: draft` and `enabled: true` (lines 46 to 49).
- CHECKED `apps/api/test/packs/`: `cold-open.test.ts` `it(` at line 23 and `sourcesUsed` at line 30; `mystery-question.test.ts` line 23; `myth-buster.test.ts` lines 64 and 89; `numbers-to-people.test.ts` line 24.
- CHECKED `apps/api/test/packs/golden.kit.ts`: line 28 (`PACKS_ROOT`), line 171 (`SCRIBA_PACKS_DIR: PACKS_ROOT`), line 174 (`TOOL_EXECUTE_ROUTE` with the tool name).
- CHECKED `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json` exists.
- CHECKED e2e test names: `e2e/specs/tools-preview.e2e.ts` lines 83 (TRG-05 C1) and 167 (C2); `tools-editor.e2e.ts` lines 114 (E1) and 184 (E2); `tools-live-preview.e2e.ts` lines 108 (TRG-15 E1) and 172 (E2); `tools-try.e2e.ts` line 79 (TRG-16 E1).
- CHECKED `e2e/playwright.config.ts`: line 13 (`workers: 1`), line 21 (`trace` is `off` unless CI). `e2e/harness/global-setup.ts`: line 15 (port 8080), line 20 (`assertPortFree`), lines 43 and 44 (the API always binds 8080).
- CHECKED root `package.json`: `engines` lines 11 to 13; `build` line 23; `test` line 25; `lint` line 26 (ends with `prettier --check .`); `lint:packs` line 28; `e2e` line 30. `apps/api/package.json` line 7 (`test`); `apps/web/package.json` line 8 (`test`, `ng test --watch=false`).
- CHECKED `.prettierignore` lines 1 to 3: `/units/`, `/modules/`, `/plans/` are not checked by `prettier --check .`.
- CHECKED `plans/DECISIONS.md`: lines 622 to 623 (`lsof`, `ss` and `netstat` are not installed here; `/proc/net/tcp` is the method that works); 5047 to 5052 and 5059 (TRG-13 option b; "TRG-15 and TRG-17: not affected"); 5067 (the `git patch-id --stable` command); 5255 to 5260 (GNP-12 criterion 4 unticked; the phase closes at merge); 5263 to 5268 (the empty patch id of a unit with no code); 5275 to 5280 (AGL-11 unticked precedent); 5312 to 5317 (TRG-16 review, pre-existing e2e failure); 5748 (two e2e specs in one invocation); 5798 to 5804 (TRG-05 C2 port collision); 6022 to 6028 (TRG-14 e2e passed on the rebased branch on this machine).
- CHECKED `plans/TRG-16.md` section 7 (line 198), point 1 (the running-app criterion through the mock scenario).
- CHECKED `plans/TRG-13.md` section 3, step 11, and `plans/TRG-14.md` section 4, step 9 (one spec per invocation, `--trace off`).
- CHECKED `plans/GNP-12.md` section 5 (T2 test list) and section 8, point 2 (the real-model run procedure).
- CHECKED `git log` on main: `614ed0c` at the time of writing; since `88e117a`, only `plans/QUEUE.md` changed. Unit commits: `b628dd2` (TRG-13 criteria), `df6d474` (TRG-14), `2b661ff` (TRG-15), `07d800f` (TRG-16), `8c4756c` (TRG-15 E1 fix).
- CHECKED `examples/nonfiction` exists (the demo's sample project); its content is not checked.
- CHECKED `plans/QUEUE.md` line 2: the scout lists TRG-17 as available.

### 7.2 Assumed

- ASSUMED the root `npm test` and `npm run lint` pass on main today. The planner ran no test. Step 3 checks it.
- ASSUMED the four golden tests and the suites of TRG-13 to TRG-16 pass on main today. Steps 5 and 6 check it.
- ASSUMED `npm test -w @bbartolome/scriba-api -- <files>` passes the file arguments to vitest. Step 6 checks it, with the fallback named there.
- ASSUMED Node 26 is installed on the machine that runs the gate. Step 1 checks it.
- ASSUMED the e2e harness runs in the gate's environment with its browsers. The same machine passed these specs on 2026-11-18 and 2026-11-19 (`plans/DECISIONS.md` lines 5946 to 5949 and 6022 to 6028), but the gate's run is the check.
- ASSUMED no other unit changes a path of table 2 before the gate runs. Steps 0 and 8 check it through the base diff.
- ASSUMED vitest prints the name of each file that ran, so that step 5 can read them from the log. Step 5 checks it.
