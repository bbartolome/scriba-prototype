---
id: GRR-17
status: draft
unit: units/GRR-17-canvas-gate.md
module: graph-runner
---
# GRR-17 plan — canvas gate: recipe e2e (empty canvas and sample), gate checks, iPad record

Draft by the planner on main `71b3321` (working tree clean at the start). Status stays `draft` until a reviser approves it. The unit closes `phase:canvas` when merged, and GNP-19 waits on that.

## 1. Decisions this plan follows

- **No product code.** The unit's Scope names one e2e extension and one manual check (unit lines 17 and 18). The only new file is an e2e spec. Source: unit lines 17 and 18; `units/README.md` line 69 (a gate unit closes its phase when merged).
- **Four criteria, one test each (section 4).** The "Done when" line (unit line 26) is covered by T1 and S1, not by its own test. Source: unit lines 21 to 24, 26.
- **Desktop mouse gestures.** T1 uses mouse drags, clicks, form fields and the input-values dialog only. No touch, and no API call changes the graph. Setup (sample project, mock provider, app default) is HTTP and is not part of the criterion, as in `graph-canvas.e2e.ts` (lines 50 and 120). Source: unit line 21; `e2e/specs/graph-canvas.e2e.ts`.
- **Gesture checks sit in this module's e2e step.** Source: `modules/graph-runner.md` line 53 (canvas-gesture Playwright spec, desktop and touch-emulated, and this module's e2e step).
- **External behaviour only.** The spec uses rendered labels, the attributes the canvas owns (`data-node`, `data-port`, `data-tool`, `data-run`, `data-run-dialog`, `data-start`, `data-status`, `data-review-link`), HTTP responses, the saved file on disk and the mock's request records. No ngx-vflow internals. Source: `modules/graph-runner.md` lines 49 and 53.
- **Harness.** Platform's harness, unchanged: `e2e/playwright.config.ts` (testMatch line 11, one worker line 13, baseURL line 20, service workers blocked line 23, Chromium from `SCRIBA_E2E_CHROMIUM` line 26) and `e2e/harness/global-setup.ts` (port 8080 must be free, lines 20 and 44 to 58; the API boots on a temp library, lines 74 to 85; the mock URL is set in `SCRIBA_E2E_MOCK_URL`, line 33).
- **One new spec file, copied helpers.** `e2e/specs/graph-recipe.e2e.ts`. Its helpers (`centreOf`, `hitsAtCentre`, `drag`, `saveAndStatus`, the project opener) are copies of those in `graph-canvas.e2e.ts` (lines 35 to 108), because each graph spec keeps its own copies (`graph-wires.e2e.ts` line 6). Simplest choice; no shared helper module is added.
- **The sample run (S1)** runs the shipped recipe `graphs/chapter-opening.json` in a project copied by start from sample (`POST /api/project-store/projects/start-from-sample`, status 201). Source: GRR-16 unit lines 15 to 23; `plans/GRR-16.md` section 8a (lines 199 to 205) and its status-codes bullet (line 76).
- **Mock scenario.** `recipe-chapter-opening`, the name GRR-16's section 8a asks this planner to use. Its four steps match `chat` attempts 1 to 4, and the four tool nodes of the sample make four chat calls in that order (`e2e/fixtures/mock-openai/scenarios/recipe-chapter-opening.json`; `server.mjs` lines 133 to 139 match by attempt). The attempt counter is per scenario and shared by every spec, so each test resets it first (`POST /__mock/scenarios/recipe-chapter-opening/reset`, returns 204, `server.mjs` lines 248 to 256).
- **Shared app default.** Every spec shares the app default provider. Each test reads it before, and restores it at the end, as `tools-try.e2e.ts` does (lines 88 to 92 and 147 to 153) and `graph-theme.e2e.ts` does (lines 186 and 465). When there was no default, the test deletes the provider it created (`providers.controller.ts` line 106; assumed A4).
- **Library cleanup.** Each test removes the folders it creates in `afterAll`, as `graph-canvas.e2e.ts` does (lines 111 to 118). `journey.e2e.ts` lines 206 to 209 expect the library to hold only `demo-book`. The same cause and fix are in DECISIONS 2026-11-20 GRR-15 (Navigator decision, line 7466).
- **Save before Run.** The run reads the saved graph from disk (`runs.service.ts` line 196), so T1 and S1 click Save before Run.
- **Predictable ids.** A new node's id is `<kind>-<n>` with the smallest free n (`vflow-adapter.ts` lines 201 to 204): an empty recipe gets `input-1`, `tool-1` and `output-1`. A new graph's id is the slug of its name (`graph-runner.service.ts` lines 123 to 126; `graph-files.ts` lines 8 to 14): "Empty recipe" gives `empty-recipe`. Port keys are fixed by the module (`modules/graph-runner.md` line 45): `out` and `in` for input and output nodes, and the tool's own input keys and `output`.
- **Manual evidence is recorded in DECISIONS.** This pipeline opens no pull request (DECISIONS 2026-11-20 GRR-15 MERGED entry, line 7525). So "noted in this PR" (unit line 18) is recorded as a dated DECISIONS entry by the orchestrator, the only writer of that file. The unit's text does not change. Simplest choice.
- **The demo is not a criterion.** Demo steps 3 to 5 are covered by S1 (step 3: the file, the entities, the target; step 4: the badges; step 5: the review link and the origin). Step 7 (the run log) is an extra assertion in S1. Steps 1, 2 and 6 use criteria of earlier units (GRR-10, GRR-11, GRR-12, GRR-14) or are manual. Manual demo legs are not merge conditions, as the Shell decided for its own demo (`plans/SHL-19.md`, OP-1, line 141). Simplest choice.
- **Criteria are not weakened.** No criterion text changes and no test is skipped. `prompt.md` lines 189 and 277 to 281 govern criteria that this environment cannot test; section 4 applies them.
- **Failure rule.** If a test fails because product behaviour is wrong, the implementer does not fix product code inside GRR-17. It stops and reports PLAN DOES NOT WORK (`prompt.md` line 130), as GRR-09, GRR-10, GRR-12 and GRR-13 did.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `e2e/specs/graph-recipe.e2e.ts` | new | T1 (criterion 1) and S1 (the Scope's sample run, part of criterion 3's extension). Helpers copied from `graph-canvas.e2e.ts`. |
| `plans/GRR-17.md` | this plan | Planner output. The closing step sets `status: done`. |

Closing step only (section 3, step 12): `units/GRR-17-canvas-gate.md` gets its boxes ticked for the criteria that passed. This follows the closing commit of GRR-15 (`a163fdf`). Criterion 3 and criterion 4 stay unticked until their open points are settled.

Nothing else changes: `apps/`, `packages/`, `examples/`, `e2e/fixtures/`, `e2e/harness/`, `e2e/playwright.config.ts`, every existing e2e spec (including `journey.e2e.ts`), every `package.json`, `docs/`, `modules/`, `plans/DECISIONS.md`.

## 3. Method (procedure)

Work in a worktree of main, not in the main checkout. The main checkout's `node_modules` lacks `ngx-vflow` and `@codemirror/lang-yaml` (DECISIONS 2026-11-19 TRG-14 note, line 6030). Record `node -v` (`.nvmrc` is `26`) and `npm -v` beside every result.

1. **Worktree.** `git worktree add ../scriba-prototype-wt/GRR-17 -b unit/GRR-17 main`, then in it `npm ci`. Expected: exit 0.
2. **Baseline before any change.** Record `uptime`. A counted run needs a 1-minute load below 2.0 (DECISIONS 2026-11-20, GRR-15 step 12, line 6286). Check that port 8080 is free with a probe like the one in `global-setup.ts` (lines 44 to 58). If another session holds it, wait; do not stop another session's server. Then `npm run build` and `npm run e2e` on the unchanged branch. Expected: both exit 0. If the baseline fails, record the failing test names, do not fix them inside GRR-17, and stop (section 1, failure rule).
3. **Write the spec.** `e2e/specs/graph-recipe.e2e.ts`, with a header comment that names the unit, the criteria and this plan. `test.use({ viewport: { width: 1280, height: 800 } })`, the helpers, `afterAll` cleanup, then T1 and S1 as in section 4.1 and 4.2.
4. **Run the new file alone, twice.** `npm run e2e -w @bbartolome/scriba-e2e -- graph-recipe.e2e.ts`. Expected: 2 passed on each run. A failing assertion is reported with its trace. Do not weaken an assertion (`prompt.md` line 189).
5. **Format, lint and types.** `npx prettier --check e2e/specs/graph-recipe.e2e.ts`, `npm run lint -w @bbartolome/scriba-e2e`, `npm run build -w @bbartolome/scriba-e2e`. Expected: exit 0 each.
6. **Root gates in CI order** (`.github/workflows/ci.yml` lines 40 to 48): `npm run lint`, `npm test`, `npm run build`, `npm run e2e`. Expected: exit 0 each. The e2e count rises by two over step 2.
7. **Commit.** Only the spec file, by path: `git add e2e/specs/graph-recipe.e2e.ts`, then `git commit -m "test(GRR-17): add the recipe e2e for an empty canvas and for the sample run"`. Expected: one commit, one file.
8. **Fresh clone.** `git clone --branch unit/GRR-17 /Users/bbartolome/workspace/scriba-prototype /tmp/grr17-fresh` into an empty target, then in it `npm ci && npm run lint && npm test && npm run build && npm run e2e`. Expected: exit 0 each. The lockfile is the committed one.
9. **Criterion 2 record, on main.** `git worktree add ../scriba-prototype-wt/GRR-17-main main --detach`, `npm ci` there, then `npm test` and `npm run e2e`, and `npm run lint:examples`. Check that every file of the table in section 4.3 passes, in the run output or in `e2e/test-results/report.json` (`playwright.config.ts` line 17). Run it on a quiet machine, as the gates of DECISIONS 2026-11-19 GRR-15 (line 6047) required. Expected: every named file passes and the lint exits 0.
10. **Report.** Give the orchestrator: `node` and `npm` versions, each command's exit code and counts, the load averages, each test's result, the commit hash, the criterion 2 result, and the criteria that cannot be run here (section 4.3). The orchestrator writes the DECISIONS entries.
11. **Criterion 3 and criterion 4.** Not run by the implementer. Their evidence comes after the merge and is handled by open points 1 and 2.
12. **Closing (after the merge).** Tick a criterion only when its test passed: criterion 1 after step 4, criterion 2 after step 9. Criterion 3 only after the CI run of the merge commit on main is green, or as open point 1 decides. Criterion 4 only after the recorded iPad check (open point 2). Set `status: done` in this plan. Commit by path: `docs(GRR-17): mark the criteria that passed and set the plan to done`.

## 4. Acceptance criteria and tests

Four criteria, one test each: T1 (criterion 1), T2 (criterion 2), T3 (criterion 3), T4 (criterion 4). S1 is the Scope's sample run. It is a second test in the same spec file, part of the extension that criterion 3 names. Total: five tests. T4 is manual, T3 runs only in CI, and the other three run locally.

### 4.1 T1, criterion 1: empty canvas to a pending change (desktop, mouse only)

Setup (HTTP, not part of the criterion):
- a. `GET /api/providers/app-default` records the prior default.
- b. `POST` the mock's reset for `recipe-chapter-opening` (`${SCRIBA_E2E_MOCK_URL}/__mock/scenarios/recipe-chapter-opening/reset`). Expected: 204.
- c. `POST /api/providers` with `headers: { origin: 'http://127.0.0.1:8080' }` and the body of `journey.e2e.ts` lines 221 to 234 (label `Mock`, kind `openai-compatible`, `baseURL` `${mock}/scenario/recipe-chapter-opening/v1`, model `mock-model`, the same timeouts). Expected: 201. Then `POST /api/providers/app-default` with `{providerId, model}` (journey lines 237 to 239). Expected: 200.
- d. `POST /api/project-store/projects/start-from-sample` with `{sampleId: 'nonfiction', folderName: 'recipe-gate-empty', title: 'Recipe gate empty'}` and the origin header. Expected: 201. Then `POST /api/project-store/active` with `{projectId: 'recipe-gate-empty'}`. Expected: `{active: 'recipe-gate-empty'}` (`verdicts-sample.e2e.ts` lines 105 to 123).

The criterion (UI only from here):
- e. Open `/projects/recipe-gate-empty/graphs`. Fill "Graph name" with `Empty recipe`, choose View `Recipe`, click Create (`graph-list-page.ts` lines 60 to 76). The list is re-read; click the row link `Empty recipe` (line 86). The canvas is at `/projects/recipe-gate-empty/graphs/empty-recipe` and has no `[data-node]`.
- f. Kind `input`, Label `Chapter notes`, Add. Kind `output`, Path `drafts/empty-recipe.md`, Label `Chapter draft`, Add (`canvas-page.ts` lines 361 to 410). Expect `[data-node="input-1"]` and `[data-node="output-1"]`. The Type select stays at its default, which must be `text` (assumed A2).
- g. Click the palette button of `mystery_question` (`li[data-tool="mystery_question"] button`, lines 345 to 354). Expect `[data-node="tool-1"]`.
- h. Click Arrange (`[data-arrange]`, line 423). New nodes are placed 40 px apart (`canvas-page.ts` lines 1164 and 1198), so they overlap until Arrange runs. The test does not assert the layout.
- i. In `[data-node="tool-1"]`, fill the form field `Puzzle` (`mystery_question.yaml` line 36) with a short question.
- j. Wire with the mouse. For each pair, scroll the source handle into view, check that `hitsAtCentre` is true for both handles, then `drag`. Pairs: `input-1.out` to `tool-1.coreIdea`, and `tool-1.output` to `output-1.in`. If a handle is not hit, stop and report: the same failure stopped GRR-10 (DECISIONS 2026-11-18, line 5758).
- k. Click Save and wait for `POST /api/graph-runner/graphs/empty-recipe/save`. Expected: 200. Read `<library>/recipe-gate-empty/graphs/empty-recipe.json`. Expected: exactly two edges, from `input-1.out` to `tool-1.coreIdea` and from `tool-1.output` to `output-1.in`, and `params.puzzle` set on `tool-1`.
- l. Wait until `[data-run]` is enabled and `[data-run-reasons]` is empty. Click Run. In the dialog `[data-run-dialog]`, fill the textarea labelled `Chapter notes` (`run-dialog.ts` line 91). The output's Target path keeps its default. Click Start (`[data-start]`, line 134). The dialog closes.
- m. Expect the run status `Done` (`canvas-page.ts` lines 284 to 289), `[data-node="tool-1"] .badge[data-status="done"]` and `[data-node="output-1"] .badge[data-status="done"]`.
- n. Click the output's `[data-review-link]` (line 675). The URL is `/projects/recipe-gate-empty/review`. A group heading starts with `Recipe run ` and contains `, output output-1` (`review-page.ts` lines 91 to 101). The group lists `drafts/empty-recipe.md`.
- o. Mock check: `GET ${SCRIBA_E2E_MOCK_URL}/__mock/scenarios/recipe-chapter-opening/requests` holds exactly one `chat` record, with `attempt` 1 and `step` 0.

Cleanup, in `afterAll` and in a `finally`: restore the prior app default, or delete the created provider if there was none (A4); remove `recipe-gate-empty`.

### 4.2 S1, the Scope's sample run (part of criterion 3's extension)

Setup as T1 steps a to c, with folder `recipe-gate-sample` and title `Recipe gate sample`, then activation as T1 step d.

- a. Open `/projects/recipe-gate-sample/graphs/chapter-opening`. Expect the eight nodes: `chapter-notes`, `people`, `house-style`, `mystery`, `cold-open`, `myth-buster`, `numbers-to-people` and `draft`.
- b. Click Run. In the dialog: for `Chapter notes`, set the mode select (`aria-label` `Chapter notes mode`, `run-dialog.ts` line 74) to Project file and fill `Chapter notes file` with `drafts/the-ten-thousand-hour-idea.md` (a file of the sample). For `Key people and claims`, add `k-anders-ericsson` and `hours-figure-is-average` through the picker's select (`entity-picker.ts` line 179; the sample's people input has no entity kind, so a claim is allowed, GRR-16 section 8a). For `House style`, choose `book-style`. The sample's `project.yaml` has no `styleProfile` line, so the picker starts empty (`entity-picker.ts` lines 387 to 408). For `draft`, set Target path to `drafts/ch02-opening.md` (demo step 3).
- c. Click Start. Expect the status `Done`, and `.badge[data-status="done"]` on `mystery`, `cold-open`, `myth-buster`, `numbers-to-people` and `draft`. Input nodes are not asserted (A3).
- d. Click `[data-review-link]` on `draft`. The review page has a group `Recipe run …, output draft`, listing `drafts/ch02-opening.md`.
- e. Mock check: the records of `recipe-chapter-opening` hold four `chat` records, `attempt` 1 to 4 and `step` 0 to 3 (the check of `plans/GRR-16.md` line 190).
- f. Extra, not a criterion (demo step 7): `<library>/recipe-gate-sample/logs/recipe-runs/` holds a file that names the run's id. Existence only.

Cleanup as T1, with `recipe-gate-sample`.

### 4.3 Criteria

| # | Criterion (unit line) | Test and seam | How it is run | Pass condition | Runnable here |
|---|---|---|---|---|---|
| 1 | On desktop, the author builds a recipe from an empty canvas with input, tool and output nodes using only mouse gestures, form fields and the input-values dialog, runs it end to end, and sees a pending change in the review queue (21) | T1, `e2e/specs/graph-recipe.e2e.ts`. Playwright, Chromium, 1280 by 800, mouse only | `npm run e2e -w @bbartolome/scriba-e2e -- graph-recipe.e2e.ts` (section 3, step 4) | T1 passes on both runs; every check of 4.1 holds | Yes. Chromium is in the Playwright cache of this machine (`~/.cache/ms-playwright`, not run yet) |
| 2 | GRR-09…GRR-16 criteria pass on `main` (22) | T2: the suite on main and the file table below. No new code | section 3, step 9, on a worktree of main | each named file passes; `npm run lint:examples` exits 0; the GRR-15 criterion 3 record exists (DECISIONS line 7482) | Yes, if port 8080 is free and the load is low |
| 3 | The e2e extension passes in CI (23) | T3: T1 and S1 run in the CI `E2E` step (`ci.yml` lines 46 to 48, after `npm test` and `npm run build`, on `ubuntu-latest` with `/usr/bin/chromium`) | the CI run of `ci.yml` on the commit that carries the extension. The workflow runs on pull requests and on push to main (`ci.yml` lines 3 to 6). No pull request exists in this pipeline, so the run is the one after the merge | the workflow run concludes with success, and its E2E step passes | No. Needs GitHub Actions and its Ubuntu runner. A local run of the same commands is evidence only and does not tick the box. Open point 1 |
| 4 | The real-iPad check is recorded (24) | T4 (manual, no code). Connect, move and chip drop checked by hand on a real iPad in Safari | a person does the check on a project copied by start from sample (`recipe-gate-ipad`, removed afterwards), graph `chapter-opening`. Steps: draw one wire, move one node, drop the claim chip `plateau-is-reorganising` on the myth-buster's entity port (the port already holds `hours-figure-is-average`, GRR-16 section 8a). The orchestrator records the result | a dated DECISIONS entry with each of the three gestures as pass or fail, the iPad model, the iOS and Safari versions, the URL, and the graph | No. Needs a real iPad, Safari and a route the device can reach (`units/SHL-19-polish-gate.md` line 28 names the tailnet route; module line 54 names the manual check). Chromium touch emulation (GRR-15) is not a substitute (`plans/GRR-15.md` line 225). Open point 2 |

Criterion 2's file table (T2). The unit plans name these files in their section 4 (checked with grep); the implementer confirms each test name from the run output:

| Unit (criteria) | Files that must pass on main |
|---|---|
| GRR-09 (2) | `apps/web/src/app/features/graph-runner/graph-list-page.spec.ts`, `graph-runner-contract.spec.ts` |
| GRR-10 (3) | `canvas-page.spec.ts` (test "saving without edits produces byte-equivalent JSON"); `e2e/specs/graph-canvas.e2e.ts` (move and connect) |
| GRR-11 (3) | `tool-nodes.spec.ts`, `canvas-page.spec.ts` (palette, settings, validation); `e2e/specs/graph-wires.e2e.ts` (wire refusal) |
| GRR-12 (4) | `entity-chips.spec.ts`, `canvas-page.spec.ts` (pins, refusals, removal); `e2e/specs/graph-chips.e2e.ts` (chip drop gesture) |
| GRR-13 (4) | `run-state.spec.ts`, `canvas-page.spec.ts` (dialog, stop, output link), `vflow-adapter.spec.ts` |
| GRR-14 (4) | `story-view.spec.ts`, `layout.spec.ts` (Arrange), `canvas-page.spec.ts` (story extras, no Run) |
| GRR-15 (3) | `e2e/specs/graph-touch.e2e.ts` (criterion 1), `e2e/specs/graph-theme.e2e.ts` (criterion 2). Criterion 3 (150 nodes, measured once) is the record at DECISIONS line 7482; `graph-large.e2e.ts` runs only with `SCRIBA_E2E_MEASURE=1` and is not in CI |
| GRR-16 (2) | `apps/api/test/graph-runner-sample-recipe.test.ts` (criterion 2); criterion 1 is the CI sample check `npm run lint:examples` |

The 25 unit criteria are in these eight units. GRR-08 is also a blocker, and its criteria are on main as `[x]`, so it is not repeated here.

Not a test: GRR-15's six screenshots (criterion 2 of GRR-15, "visual check recorded in the PR") are in `/Users/bbartolome/workspace/scriba-prototype-wt/GRR-15-screenshots`, outside the repository (checked by `ls`; DECISIONS line 7525). The record is in DECISIONS, and the file set is named there. T2 relies on the test `graph-theme.e2e.ts` (T5, T6, T9), not on the screenshots.

## 5. Downstream agreement (GNP-19)

- GNP-19 names `"Graph runner phase:canvas (GRR-17)"` in `blocked_by` (`units/GNP-19-fiction-gate.md` line 7). It starts when GRR-17 merges (`units/README.md` line 69). Its demo uses the story graph with `order` edges (its line 28), the recipe run with the storm scene (line 30) and the Dialogue pending change (line 31). Those are the canvas, the run dialog and the review link of GRR-09 to GRR-14.
- What GRR-17 must leave in place for GNP-19:
  1. Product code unchanged. GRR-17 adds one spec and changes no route, control or API. The canvas that GNP-19 uses is what GRR-09 to GRR-16 deliver.
  2. The hooks that the demo and GNP-19's e2e use are pinned by T1 and S1: the labels Graph name, View, Create, Save, Run, Start, and the attributes `data-run`, `data-run-dialog`, `data-start`, `data-stop`, `data-arrange`, `data-review-link`, `data-status`, `data-node` and `data-port`. Changing one of them later also changes T1 and S1 in the same PR.
  3. The scenario `recipe-chapter-opening` keeps its name and its four steps (GRR-16 D12, `plans/GRR-16.md` line 41). A reuse of its attempt counter needs a reset first (section 1).
  4. Shared state is restored: the app default is put back, and every library folder that T1 and S1 create is removed in `afterAll`. GNP-19's specs then see the library that `journey.e2e.ts` expects (lines 206 to 209).
  5. The phase closes with its criteria settled. Criteria 3 and 4 need the decisions of open points 1 and 2 before GRR-17 merges, because the merge unblocks GNP-19.
- What GNP-19 does not need from GRR-17: no helper module (each spec keeps its own helpers), no new API, no new fixture.
- Name check: `graph-recipe.e2e.ts`, `recipe-gate-empty`, `recipe-gate-sample` and `recipe-gate-ipad` are taken by this plan. The GNP-19 planner must not reuse them.

## 6. Facts checked and facts assumed

### 6.1 Checked

- Unit file: lines 7 (blocked_by), 9 (unblocks), 14 (closes the phase), 17 and 18 (Scope), 21 to 24 (criteria), 26 (Done when), 28 to 35 (demo). It has no notes that record a change of the unit (no "Removed by revision", "Loosened", "Reworded" or "Moved to").
- Module file: line 28 (GRR-17 gate), 45 (port keys and design choices), 49 to 55 (testing principles, gesture checks, manual iPad check), 69 to 72 (risks).
- README: line 17 (GRR module row), 69 (gate closes the phase), 121 (phase:canvas row).
- Downstream: `grep -rn "GRR-17" units/` finds GNP-19 (line 7) and the unblocks lines of GRR-08 to GRR-16. Only GNP-19 names `Graph runner phase:canvas (GRR-17)`.
- Blockers: plans GRR-08 to GRR-16 are `status: done`. `git log main --grep` finds merged commits for each (7 to 36 commits per unit).
- No plan has a front-matter status of `draft` or `planned` (the first eight lines of every file in `plans/` were checked; only this file matched). So no other plan changes the same files.
- Repository state: main at `71b3321`, working tree clean.
- CI: `.github/workflows/ci.yml` triggers (lines 3 to 6), steps Test (line 40), Build (44), E2E (46 to 48, `SCRIBA_E2E_CHROMIUM: /usr/bin/chromium`).
- Node: `.nvmrc` is `26`.
- Harness and config: `e2e/playwright.config.ts` (lines 11, 13, 17, 20, 23, 26); `e2e/harness/global-setup.ts` (lines 15, 20, 33, 44 to 58, 74 to 85, 88 to 99); `e2e/package.json` (`@playwright/test` 1.65.0; scripts `e2e` and `lint`).
- Browsers on this machine: `~/.cache/ms-playwright` holds chromium-1194, -1248 and -1254; `/usr/bin/chromium-browser` exists. Not run.
- Existing specs and their helpers: `graph-canvas.e2e.ts` (openCanvas 35 to 63, centreOf 66 to 73, hitsAtCentre 76 to 85, drag 88 to 97, saveAndStatus 100 to 108, afterAll 111 to 118, tests at 120 and 149); `graph-wires.e2e.ts` (line 6, the copied helpers; line 90, scroll into view; afterAll at 133 to 141).
- `journey.e2e.ts`: lines 206 to 209 (library holds only `demo-book`), 219 to 235 (provider POST with origin, body, status 201), 237 to 239 (app default).
- `verdicts-sample.e2e.ts`: line 18 (`ORIGIN`), 105 to 123 (start from sample, activation), 240 (restore).
- `tools-try.e2e.ts`: 88 to 92 (prior default), 147 to 153 (restore only when a prior default existed). `graph-theme.e2e.ts`: 186, 210, 465.
- `providers.controller.ts`: GET providers line 52, POST providers 57, GET app-default 70, POST app-default 75, POST delete 106.
- Mock: `server.mjs` 133 to 139 (`findStepIndex`), 211 (chat route), 225 (models), 248 to 256 (reset). `recipe-chapter-opening.json` has four steps, each `{endpoint: chat, attempt: N}`. `pack-mystery_question.json` has one step matching any chat, whose reply carries `[@claim-a]`. It is not used.
- Run: `runs.service.ts` line 196 reads the graph from disk.
- Ids: `vflow-adapter.ts` 201 to 204 (`nextNodeId`), `graph-runner.service.ts` 123 to 126 (create, slug), `graph-files.ts` 8 to 14 (`slugOf`).
- Canvas (`canvas-page.ts`): run status labels 284 to 289; palette `Tool palette` 345 to 358; Kind, Type, Path, Label, Add 361 to 410; Save 418 to 420; Arrange (`data-arrange`) 423; Run (`data-run`) 432; run status, Stop and blocking reasons 438 to 448; dialog 451 to 461; node badge (`data-status`, drawn only for nodes in the run state) 581 to 586; review link 675 to 678; `add` 1161 to 1178; `addTool` 1184 to 1215; `openRun` 1328 to 1330; `onStart` 1342 to 1349; `openDialog` 1391 to 1403.
- Dialog (`run-dialog.ts`): `data-run-dialog` 65; aria-labels of the mode select, file input and textarea 74, 84 and 91; Start and Cancel 134 to 141; `canStart` 196 to 205; style default `ref: ''` 51. The output branch has a "Target path" label.
- Graph list (`graph-list-page.ts`): Graph name 60 to 65; View select with Story and Recipe 67 to 75; Create 76; row link 86; the Pending change badge 98 to 100; `create` 215 to 225.
- Review (`review-page.ts` 91 to 101): the group heading is `Recipe run <runId>, output <nodeId>`.
- Picker (`entity-picker.ts`): the `Add to <title>` select at 179; style preselect from `project.yaml` at 387 to 408.
- Sample: `examples/nonfiction/graphs/chapter-opening.json` has eight nodes (`chapter-notes`, `people`, `house-style`, `mystery`, `cold-open`, `myth-buster`, `numbers-to-people`, `draft`) and 13 edges (w1 to w13); its output is `draft` with path `drafts/chapter-opening.md`. `examples/nonfiction/project.yaml` has no `styleProfile` line (grep). `examples/nonfiction/drafts/` holds four files, including `the-ten-thousand-hour-idea.md`. Entities: `k-anders-ericsson` (person), `hours-figure-is-average` (claim), `plateau-is-reorganising` (claim), `deliberate-practice` (concept), `book-style` (style-profile).
- Tool: `packages/packs/nonfiction/tools/mystery_question.yaml` has required `coreIdea` and `puzzle` (line 44), `puzzle` titled "Puzzle" (lines 34 to 36), output `draft` (line 45), `enabled: true` (line 46).
- Discrepancy with the unit text (checked): demo step 3 (unit line 31) says "keep the default style" and "two people as entities". The sample has no style default, and only one person entity. The plan uses `book-style` and the two entities of section 4.2. The unit's wording is not changed.
- DECISIONS entries cited: 1537 (SAU-03 criterion left unticked by the Navigator), 3946 (SAU-08 criteria 6 and 7 unticked), 4220 (TRG-04 O7; the GRR-15 and GRR-17 gestures are their own checks; the Safari point was not verified), 5714 (GRR-09 PLAN DOES NOT WORK), 5758 (GRR-10 second PLAN DOES NOT WORK, the handle hit check), 5980 (GRR-12), 6001 (GRR-13), 6030 (main checkout `node_modules`), 6047 (gates on a quiet run), 6286 (load rule), 7466 (afterAll decision), 7482 (GRR-15 criterion 3 PASS record), 7498 and 7525 (screenshots and no pull request in this pipeline), 7519 (GRR-15 MERGED).
- `prompt.md`: 84 to 94 (Draft stage), 130 (PLAN DOES NOT WORK), 189 (no weakening), 277 to 281 (criteria this environment cannot test).
- Folder names: no spec uses `recipe-gate-empty`, `recipe-gate-sample` or `recipe-gate-ipad` (grep of `e2e/`, `apps/`, `scripts/`).

### 6.2 Assumed (verify at implementation; a mismatch stops the step, nothing is changed silently)

- A1. Playwright runs the spec files in alphabetical order with one worker, so `graph-recipe` runs before `journey`. The `afterAll` cleanup keeps journey's library check true whatever the order.
- A2. Field labels: the tool form field `Puzzle`; the dialog's `Chapter notes`, `Chapter notes mode`, `Chapter notes file`; the picker's `Add to Key people and claims`; the style picker's `House style`; the output's Target path. The Type select for input nodes defaults to `text`.
- A3. Input nodes carry no run badge in the run state, so S1 asserts badges on tool and output nodes only.
- A4. Deleting the provider that a test created, when there was no default before, leaves no default that a later spec uses. Check with `GET /api/providers/app-default` after the delete.
- A5. `start-from-sample` copies `drafts/` and `entities/` (`samples.service.ts` line 78 copies the sample's tree; the folders the sample leaves out are `logs/`, `.scriba/`, `snapshots/` and `.versions/`, per `units/GRR-16-sample-recipe.md` line 22, and `drafts/` and `entities/` are not among them).
- A6. The mock answers the `models` probe for `recipe-chapter-opening` without a step for it (`server.mjs` 225 to 240), as the journey relies on for `summarize-outline`.
- A7. Chat calls of a run use the app default provider (`plans/GRR-16.md` line 67 names `providers.appDefault` in the test settings; the run code was not re-read).
- A8. Node parameters are saved in the node (`params.puzzle`), as `graph-canvas.e2e.ts` relies on for the saved file.
- A9. `gh` can read CI runs for `main` from this environment. Not checked; needed only for criterion 3.
- A10. The Chromium that Playwright uses without `SCRIBA_E2E_CHROMIUM` (`playwright.config.ts` line 26) works here. Not run.
- A11. After Save and Arrange, Run becomes enabled when the validation is clean. The test waits for it; it is not checked.

## 7. Open points

1. **Criterion 3 (CI) and a different local procedure.** `prompt.md` (lines 277 to 281) asks for a different local procedure first. The candidate is a fresh clone of the commit, then the root gates and `CI=1 npm run e2e` with the CI's Chromium. Options: (a) the Navigator accepts that local run as the procedure, and criterion 3 is ticked before the merge; (b) criterion 3 is checked on the CI run of the merge commit on main (`ci.yml` lines 5 and 6), after the merge closes `phase:canvas`; if that run is red, GNP-19 is already unblocked; (c) the Navigator decides the unit is complete without criterion 3 (`prompt.md` line 279). Effect: when GNP-19 can start. Until a decision is recorded, GRR-17 does not merge as complete.
2. **Criterion 4 (real iPad) has no local procedure.** It needs a real iPad and Safari, and this environment has neither. Options: (a) the Navigator decides the unit is complete without criterion 4, as it did for SAU-03 criterion 6 (DECISIONS line 1537) and SAU-08 criteria 6 and 7 (line 3946); the box stays unticked and the merge closes `phase:canvas`, which unblocks GNP-19; (b) the merge waits until a person records the check, so `phase:canvas` and GNP-19 wait with it. Effect: when GNP-19 can start. Until a decision is recorded, GRR-17 does not merge as complete.
