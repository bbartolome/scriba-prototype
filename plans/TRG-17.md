---
id: TRG-17
status: done
---
# TRG-17 plan — Editor-UI gate (closes Tool registry `phase:editor-ui`)

Revision 1, draft, written at main `614ed0c` by the planner. Revision 2, by the reviser at main `b638f98` (the commit of revision 1; since `614ed0c` only `plans/TRG-17.md` changed). The reviser ran no test, changed no code and no unit file. Corrections: the overlap grep now also prints this plan; the source of `--trace off` and the port check method are named; GNP-12's unticked criterion 3 has its own source; line numbers of the shipped tool files; the four open points are settled (section 6); the facts moved to section 2.2; section 7 (review parts) is new. Status stays draft until the orchestrator sets it.

TRG-17 is a gate. It adds no code, no test file and no package. Its checks are the suites of TRG-13 to TRG-16 and the four workhorse golden tests of GNP-12, run on main. When they pass, the implementer ticks the two boxes of `units/TRG-17-editor-ui-gate.md` (lines 17 and 18).

## 1. Decisions this plan obeys

- **Graph.** `blocked_by` is TRG-13, TRG-14, TRG-15, TRG-16 and "Genre packs phase:nonfiction-workhorses (GNP-12)". `unblocks` and `parallel_with` are empty (`units/TRG-17-editor-ui-gate.md` lines 7 to 9). The inverse rule holds: TRG-13, TRG-14, TRG-15, TRG-16 and GNP-12 each name TRG-17 in `unblocks` (their line 9), and no unit's `blocked_by` names TRG-17 (`units/README.md` line 64, the source of truth).
- **Gate.** Merging closes `phase:editor-ui` (`units/TRG-17-editor-ui-gate.md` line 14). A phase closes when its gate unit is merged (`units/README.md` line 69). The phase row is `units/README.md` line 105.
- **Blockers are done.** `status: done` (line 3) in `plans/TRG-13.md`, `TRG-14.md`, `TRG-15.md`, `TRG-16.md` and `GNP-12.md`. GNP-12's phase closed at its merge with its criteria 3 and 4 unticked (`units/GNP-12-workhorses-gate.md` lines 19 and 20). Criterion 4: `plans/DECISIONS.md` lines 5255 to 5260. Criterion 3: `plans/GNP-12.md` section 8, point 1 (PLT-22 is not on main).
- **Criteria.** Two, in the unit's words (lines 17 and 18). Criterion 1 covers ten unit criteria in four units (section 4, table 2). Criterion 2 is the M2 done-when, tested as settled in section 6, points 2 and 3.
- **A gate with no code.** Its branch changes only its own checkboxes. This is the GNP-12 precedent: the patch id of such a unit is the empty output of `git diff main...<branch> -- . ':!plans' ':!units' | git patch-id --stable` (`plans/DECISIONS.md` lines 5263 to 5268; the command is at line 5067).
- **Module testing rules.** External behaviour only (`modules/tool-registry.md` line 49). The primary seam uses fixture packs (line 50). Tool registry's unit tests never read `examples/` or the real packs, and the real packs are linted in CI by `npm run lint:packs` (line 52). Pack content is Genre packs' (line 57), and Genre packs' golden tests run with `SCRIBA_PACKS_DIR=packages/packs` (`modules/genre-packs.md` line 87). This gate adds no test; it runs Genre packs' golden tests as they are (section 6, point 2).
- **Citations in this module.** Recording citations and draft provenance are the callers' (`modules/tool-registry.md` line 60). In this module "cites its source files" is the `sourcesUsed` of the call result (`units/TRG-12-executor.md` line 40, the API-level M2 done-when). Real models are checked only by the Agent loop's manual eval, never in CI (`units/README.md` line 139). Section 6, point 3.
- **Running app through the mock model.** TRG-16's criterion 2 is tested through the mock scenario `tool-execute-draft`, not a real model (`plans/TRG-16.md` section 7, point 1). This gate's criterion 1 includes that test.
- **Execute writes nothing.** The execute endpoint writes no file; agent and recipe writes always become pending changes (`modules/tool-registry.md` line 46). TRG-16 E1 checks that no file appears under the pending folder.
- **How e2e specs run.** One spec per invocation (`plans/TRG-14.md` section 4, step 9; two specs in one invocation can fail, `plans/DECISIONS.md` line 5748), with `--trace off` and port 8080 free (the TRG-14 Part C re-run, `plans/DECISIONS.md` line 5946). The e2e harness refuses to start while 8080 is held (`e2e/harness/global-setup.ts` lines 15, 20 and 44). `lsof`, `ss` and `netstat` are not installed here; `/proc/net/tcp` is the method that works (`plans/DECISIONS.md` line 622).
- **Demo.** The demo (unit lines 20 to 26) is not an acceptance criterion and is not run by this gate (section 6, point 4).

## 2. Files to change, and facts

### 2.1 Files to change

| Path | Change | Purpose |
|---|---|---|
| `units/TRG-17-editor-ui-gate.md` | edit, only after the runs of section 3 pass: lines 17 and 18, `- [ ]` to `- [x]` | the gate's checklist. No other line changes |
| `plans/TRG-17.md` | this plan. `status` is set by the orchestrator | none |

Not changed: any file under `apps/`, `packages/`, `e2e/`, `scripts/` or `examples/`; any file under `modules/`; any other unit file; `plans/DECISIONS.md` (the orchestrator records the gate's result there, as for other units).

Simplest choices, recorded: no new test file, no helper, no new name. The tests are the existing files named in section 4. The only written diff is the two ticks.

Overlap check: `grep -l -E "^status: *(draft|planned)" plans/*.md` prints `plans/GRR-13.md` and this plan. GRR-13's file table lists `apps/web/src/app/features/tool-registry/tool-registry.routes.ts` (line 153: one line, `export { EntityPicker } from './entity-picker';`); its line 155 excludes the rest of `tool-registry/**`, `e2e/**` and `units/**`. So GRR-13 does touch `tool-registry.routes.ts`, but no path of this plan's table, and no test file of table 2.

### 2.2 Facts checked and facts assumed

Checked (at main `b638f98`):

- `units/TRG-17-editor-ui-gate.md`: lines 7 (`blocked_by`), 9 (`unblocks: []`), 14 (closes the phase), 16 to 18 (the checklist, both boxes `[ ]`), 20 to 26 (demo). The file ends at line 26.
- `units/README.md`: lines 61 to 65 (blocker notation; line 64 is the source-of-truth rule), 69 (a phase closes at its gate's merge), 105 (the `phase:editor-ui` row), 139 (testing; unit tests never read `examples/`; real models only in AGL-25, never in CI).
- `modules/tool-registry.md`: line 28 (TRG-17 node), 37 (cross-cutting decisions), 46 (execute writes no files), 49 to 53 (testing principles), 50 (fixture packs), 52 (unit tests never read `examples/` or the real packs; `npm run lint:packs`), 57 (pack content is Genre packs'), 60 (citations and provenance are the callers').
- `modules/genre-packs.md` line 87: golden tests in `apps/api/test/packs/` with `SCRIBA_PACKS_DIR=packages/packs`.
- `units/TRG-12-executor.md` line 40: "M2 done-when, API level ... cites its source files through `sourcesUsed`" (ticked).
- `grep -n "TRG-17" units/*.md modules/*.md`: TRG-17 appears in `unblocks` of TRG-13 (`[TRG-14, TRG-16, TRG-17]`), TRG-14 (`[TRG-15, TRG-17]`), TRG-15 and TRG-16 (`[TRG-17]`), GNP-12 (line 9, "Tool registry editor-ui gate (TRG-17)"); in no `blocked_by` or `parallel_with`; README line 105; module line 28.
- Plan statuses: `status: done` at line 3 of `plans/TRG-13.md`, `TRG-14.md`, `TRG-15.md`, `TRG-16.md`, `GNP-12.md` and `AGL-11.md`; `plans/GRR-13.md` is `planned`. No `unit/TRG-17` branch exists. GRR-13 has a branch and a worktree (`unit/GRR-13`).
- Criteria boxes on main: TRG-13 lines 21 and 22 `[x]`; TRG-14 lines 21 to 24 `[x]`; TRG-15 lines 21 and 22 `[x]`; TRG-16 lines 21 and 22 `[x]`; GNP-12 lines 17 and 18 `[x]`, lines 19 and 20 `[ ]`.
- `plans/GRR-13.md` lines 116 (C-6), 153 and 155.
- `packages/packs/nonfiction/tools/`: `cold_open.yaml` lines 46 and 47, `mystery_question.yaml` 45 and 46, `myth_buster.yaml` 48 and 49, `numbers_to_people.yaml` 46 and 47: `output: draft`, `enabled: true`.
- `apps/api/test/packs/`: `cold-open.test.ts` AC 2 at line 23, `sourcesUsed` line 30; `mystery-question.test.ts` line 23 (line 30); `myth-buster.test.ts` lines 64 (line 71) and 89 (AC 3); `numbers-to-people.test.ts` line 24 (line 31).
- `apps/api/test/packs/golden.kit.ts`: line 28 (`PACKS_ROOT`), 171 (`SCRIBA_PACKS_DIR: PACKS_ROOT`), 174 (`TOOL_EXECUTE_ROUTE`).
- Test names: `tools-list.spec.ts` L1 (319), L2 (340), L3 (360), L4 (372), L4b (393), L6 (515), L6b (538); `tool-editor.spec.ts` T1a (121), T1b (154); `tools-actions.spec.ts` T1d (281), T2a (332), T2b (401), T3a (417), T4b (455), T4d (526), T4e (570); `tool-template.spec.ts` T4a (16); `tools-try.spec.ts` Y1 (305), Y2 (347).
- E2e names: `tools-preview.e2e.ts` lines 83 (TRG-05 C1) and 167 (C2); `tools-editor.e2e.ts` 114 (E1) and 184 (E2); `tools-live-preview.e2e.ts` 108 (TRG-15 E1) and 172 (E2); `tools-try.e2e.ts` 79 (TRG-16 E1). `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json` exists.
- `e2e/playwright.config.ts` lines 13 (`workers: 1`) and 21 (`trace` off unless CI). `e2e/harness/global-setup.ts` lines 15 (port 8080), 20 (`assertPortFree`), 43 and 44.
- Root `package.json`: `engines` lines 11 to 13 (`>=26 <27`); `packageManager` line 14 (`npm@11.20.0`); `build` 23; `test` 25; `lint` 26 (ends with `prettier --check .`); `lint:packs` 28; `e2e` 30. `apps/api/package.json` line 7 (`npm run build && vitest run`, so file arguments after `--` reach vitest); `apps/web/package.json` line 8; `e2e/package.json` (`test: vitest run`, `e2e: playwright test`).
- `.prettierignore` lines 1 to 3: `/units/`, `/modules/`, `/plans/`.
- `plans/DECISIONS.md` (by unit id): 622; 5047 to 5059 ("TRG-15 and TRG-17: not affected"); 5067; 5255 to 5260; 5263 to 5268; 5275 to 5280; 5312 to 5317; 5748; 5798 to 5804; 5946; 6022 to 6028; 6090 (TRG-17 available).
- `plans/GNP-12.md` line 106 (the CI part of its criterion 4), line 114 (TRG-17 agreement), section 8 points 1 and 2, line 141 (demo not run). `plans/SAU-16.md` line 21 (demo not a criterion). `plans/TRG-16.md` section 7. `plans/TRG-14.md` section 4, step 9, and line 204. `plans/TRG-13.md` line 117.
- `git log`: `b628dd2` (TRG-13 done), `df6d474` (TRG-14), `2b661ff` (TRG-15), `07d800f` (TRG-16), `8c4756c` (TRG-15 E1 fix). `git worktree list` shows a `live` worktree (detached), the owner of the 8080 collision of `plans/DECISIONS.md` lines 5798 to 5804.

Assumed:

- The root `npm test` and `npm run lint` pass on main today. Step 3 checks it.
- The four golden tests and the suites of TRG-13 to TRG-16 pass on main today. Steps 5 and 6 check it.
- Node 26 is installed on the machine that runs the gate. Step 1 checks it.
- The e2e harness runs in the gate's environment with its browsers; the same machine passed these specs on 2026-11-18 and 2026-11-19 (`plans/DECISIONS.md` lines 5946 and 6022 to 6028). Step 4 checks it.
- No other unit changes a path of table 2 before the gate merges. Step 8 checks it.
- Vitest and `ng test` print the name of each file that ran. Step 5 checks it.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v`, `npm -v` and the main SHA with each result. Do not push. Do not fix code: a failing test belongs to the unit that owns it, and the gate goes back to that unit.

0. **Preconditions.** `grep -m1 -n '^status' plans/TRG-13.md plans/TRG-14.md plans/TRG-15.md plans/TRG-16.md plans/GNP-12.md` prints `status: done` for each. `git branch --list unit/TRG-17` prints nothing. `grep -n '^- \[' units/TRG-17-editor-ui-gate.md` prints two lines, both `[ ]`. Record `git rev-parse --short main` as the base. Expected: all hold.
1. **Runtime.** `node -v` prints `v26.x` (root `engines`, `package.json` lines 11 to 13). `npm -v` prints `11.20.0` (root `packageManager`, line 14). Expected: both.
2. **Worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/TRG-17 -b unit/TRG-17 main`, then `npm ci` in it. Expected: exit 0.
3. **Repository gates.** In the worktree: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0, and `npm run lint` ends with `All matched files use Prettier code style!`. `npm test` runs each workspace's test script and `node --test 'scripts/*.test.mjs'` (root `package.json` line 25). Save the log.
4. **E2e specs (criterion 1).** Before each invocation, check that port 8080 is free: `awk '$2 ~ /:1F90$/ && $4 == "0A"' /proc/net/tcp /proc/net/tcp6` prints nothing (`plans/DECISIONS.md` line 622; `1F90` is 8080, `0A` is LISTEN). No other API or e2e run on this machine during step 4. Then run each in its own invocation from the worktree, and save each log:
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts --trace off`: 2 passed (TRG-05 C1 and C2, changed by TRG-13).
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-editor.e2e.ts --trace off`: 2 passed (TRG-14 E1 and E2).
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-live-preview.e2e.ts --trace off`: 2 passed (TRG-15 E1 and E2).
   - `npm run e2e -w @bbartolome/scriba-e2e -- tools-try.e2e.ts --trace off`: 1 passed (TRG-16 E1).
   Expected: seven passed in four invocations. A failed invocation follows section 6, point 1.
5. **Criterion 1 check.** From the step 3 log, confirm that every file of table 2 (section 4) ran and passed. A file that did not run counts as a failure.
6. **Criterion 2 check.** `npm test -w @bbartolome/scriba-api -- test/packs/cold-open.test.ts test/packs/mystery-question.test.ts test/packs/myth-buster.test.ts test/packs/numbers-to-people.test.ts`. Expected: the four files run, and every test passes (AC 2 of each file, and myth-buster's AC 3 at line 89). The log names the four files. If the file arguments do not reach vitest, run `npx vitest run test/packs/<file>` from `apps/api` instead, and record the change.
7. **Record.** The implementer's report carries: `node -v`, `npm -v`, the base SHA, the exit code of each command, the port check before each e2e invocation, the four e2e pass lines, the step 5 and 6 file lists, and the pass counts from the logs.
8. **Tick.** Only when steps 3, 4 and 6 pass: change `units/TRG-17-editor-ui-gate.md` lines 17 and 18 to `- [x]`. No other line changes. Before the commit, run `git diff --name-only <base>..main -- apps e2e packages scripts`; if it names a file of table 2 or a file under `packages/packs/nonfiction/tools/` or `apps/api/test/packs/`, rerun steps 3 to 6 on the new main.
9. **Commit.** On `unit/TRG-17`: `git add -- units/TRG-17-editor-ui-gate.md`, then `git commit -m "docs(TRG-17): criteria 1 and 2 passed"`. Then `git diff main...unit/TRG-17 -- . ':!plans' ':!units' | git patch-id --stable` must print nothing (section 1).
10. **Orchestrator.** Merges the branch, sets `status: done` in `plans/TRG-17.md`, and records the result in `plans/DECISIONS.md`, as for the other units.

## 4. Acceptance criteria and tests

Table 1. The unit's criteria, one test each.

| Criterion (unit line) | Test | Steps | Pass condition |
|---|---|---|---|
| 1. "TRG-13…TRG-16 criteria pass on `main`." (17) | T1: the ten criteria of table 2, checked through the files of table 2 and the four e2e invocations of step 4 | 3, 4, 5 | Step 3 exits 0 and every file of table 2 ran and passed. Each e2e invocation passes its count. Nothing is skipped |
| 2. "M2 done-when: each of the four nonfiction workhorses (cold open, mystery question, myth-buster, numbers-to-people), as shipped by Genre packs, produces a draft that cites its source files." (18) | T2: the four golden tests of GNP-12 T2, one per tool: `apps/api/test/packs/cold-open.test.ts` (AC 2, line 23), `mystery-question.test.ts` (AC 2, line 23), `myth-buster.test.ts` (AC 2, line 64; AC 3, line 89), `numbers-to-people.test.ts` (AC 2, line 24) | 6 | Every test passes. Each case's kind is `draft`, and its `sourcesUsed` equals the value the case declares (for example `cold-open.test.ts` line 30: `notes-a`, `notes-b`, `researcher-a`). The tools are the shipped ones, `packages/packs/nonfiction/tools/{cold_open,mystery_question,myth_buster,numbers_to_people}.yaml`, each with `output: draft` and `enabled: true` |

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

The demo (unit lines 21 to 26) is not a test of this gate (section 6, point 4). Its mechanisms are covered as follows. Step 1 by TRG-13 L1 and L2. Step 2's Customize and save by TRG-14 T2a; its `tone` select in three views has no named test. Step 3 by TRG-14 T1a and E2. Step 4 by TRG-16 E1. Step 6 by TRG-14 T2b. Step 5 (the narrative tool card) has no test here.

## 5. Downstream and parallel agreement

- **No unit waits on this gate.** `unblocks: []` (unit line 9), and `grep -n "TRG-17" units/*.md` finds it in no `blocked_by`. No other unit of `phase:editor-ui` follows it (`units/README.md` line 105).
- **GNP-12.** Its `unblocks` names this gate (`units/GNP-12-workhorses-gate.md` line 9). Its plan's line 114 says GNP-12 provides T1, T2 and T4 to this gate; this plan uses T2 (the CI evidence through `sourcesUsed`). T4's real-model half is GNP-12's own criterion 4 (line 20), unticked by the Navigator's decision (`plans/DECISIONS.md` line 5258); it is not a criterion of this gate (section 6, point 3). GNP-12 criterion 3 (line 19) is unticked and is not a criterion of this gate. The gate changes no line of GNP-12.
- **TRG-13 to TRG-16.** Their plans are done. This gate runs their tests and changes none of their files.
- **AGL-11.** Done (`plans/AGL-11.md` line 3). Its unit names "Tool registry editor-ui demo step 5" in `unblocks` (`units/AGL-11-narrative-gate.md` line 9), which is informative only (`plans/AGL-11.md` line 141). No dependency. Its real-model criterion (line 21) stays unticked (`plans/DECISIONS.md` line 5278).
- **Other plans that mention this gate.** `plans/GNP-07.md` lines 25 and 319, `GNP-08.md` line 282, `GNP-09.md` lines 81 and 343, `GNP-12.md` line 114, `TRG-10.md` lines 125 and 165, `TRG-13.md` line 117, `TRG-14.md` line 204, `TRG-15.md` line 151 and `TRG-16.md` lines 192 and 193 name the gate for its demo steps or its criteria. None names a file that this plan changes, and none asks this gate for a real-model run.
- **Draft and planned plans.** Only `plans/GRR-13.md` (section 2.1). Its change to `tool-registry.routes.ts` (one export line) is not in this gate's files nor in table 2. Order: either. If GRR-13 merges first and breaks a table 2 test, step 3 fails and the gate waits for GRR-13's owner (step 8 catches a merge during the run). If the gate's tick merges first, GRR-13 is unaffected, because the tick touches only `units/TRG-17-editor-ui-gate.md`.

## 6. Open points

All four of the planner's points are settled by the reviser (revision 2). None changes a criterion's text, a module file or a test.

1. **A failed e2e invocation. Settled: (a).** Every invocation of step 4 must pass. A failed invocation is recorded and the gate does not tick. A re-run is allowed only after the cause is shown to be outside the code (the harness's port refusal, or a listener on 8080 found by the step 4 check), and the re-run must pass. Reason: criterion 1 says the criteria "pass on `main`"; (a) is that reading, and it is how TRG-14's TRG-05 C2 failure was handled (`plans/DECISIONS.md` lines 5798 to 5804, action; line 5946). Options (b) and (c) would weaken the test and are not taken.
2. **Whether criterion 2's test may read the shipped packs. Settled: (a), yes.** The criterion names the tools "as shipped by Genre packs", so its test must read them. `modules/tool-registry.md` line 52 binds Tool registry's own unit tests (its seam, line 50, uses fixture packs). The golden tests are Genre packs' tests, and `modules/genre-packs.md` line 87 settles that they run with `SCRIBA_PACKS_DIR=packages/packs`. `units/README.md` line 139 forbids only reads of `examples/`. This gate adds no test, so no Tool registry unit test reads the real packs. No module text changes.
3. **Whether criterion 2 needs the real-model run. Settled: (a), no; T2 ticks it.** The criterion names no model. In this module "cites its source files" is the call result's `sourcesUsed` (`units/TRG-12-executor.md` line 40); citations and provenance are the callers' (`modules/tool-registry.md` line 60); real models are never checked in CI (`units/README.md` line 139). The Navigator's GNP-12 reason applied the unticked rule only because GNP-12's text "requires a real model" (`plans/DECISIONS.md` line 5259); TRG-17's text does not. The real-model check stays required by GNP-12 line 20 and AGL-11 line 21, which a person ticks later (`plans/DECISIONS.md` lines 5258 and 5278). If the orchestrator reads criterion 2 as also needing `[@id]` citations from a real model, that is a Navigator point (options: (b) hold the tick until a person runs `plans/GNP-12.md` section 8, point 2; (c) merge with line 18 unticked, as GNP-12 and AGL-11 did).
4. **The demo. Settled: (a), not run at this gate.** No criterion depends on it; GNP-12 (`plans/GNP-12.md` line 141) and SAU-16 (`plans/SAU-16.md` line 21) did the same. Step 5 of the demo needs a real model. A person runs the demo at the M2 close.

## 7. Review parts

- **Part 1 (the whole plan).** Steps 0 to 10 of section 3. Tests: T1 (criterion 1; table 2, steps 3, 4 and 5) and T2 (criterion 2; step 6). Review against sections 1, 2.1 and 6: the diff is the two ticks only, and the patch id is empty.
