---
id: GNP-24
status: done
---
# GNP-24 plan — remaining-shapes gate: the phase checklist

Batch: [GNP-24] (Genre packs, phase:remaining-shapes, M7), a batch of one. Draft by the planner at main `3c0a390` (HEAD when read; the working tree was clean). The planner changed only this file and ran no build, test, lint or npm command. Revised by the Opus reviser at main `39f4866` (2026-11-20): open points 1 to 3 decided (section 7); C4's agent clause widened to all twelve shapes in one run and its canvas clause tied to the two reads the canvas makes (D5, D6, step 4); A1 and A2 checked; the step 4 imports completed. No unit change. Revised parts are marked "(Revised.)".

What this unit adds: one new API test file with two tests (C1 and C4), and the two edits of the merge stage (ticks and status). It changes no product code, pack, tool spec, `enabled` flag, enum, golden, scenario, e2e spec or module file. Criteria 2 and 3 are already tested by committed tests of earlier units; this plan runs them and names each one. The unit file has no Scope, Why or Decisions section and no change note (read in full, 27 lines). Its four criteria are copied in section 5 unchanged.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the README

- **G1 Scope.** The gate adds no shipped behaviour; its only code is a test file (D1). Source: unit lines 14 to 20 (the merge closes the phase; the criteria are its checklist); `modules/genre-packs.md` line 89 (this module adds no e2e step).
- **G2 Criteria stand.** Each criterion keeps its text and has one test (section 5). None is weakened, split or removed. Source: unit lines 17 to 20; GNP-19 plan, G5.
- **G3 Blockers.** `blocked_by` (unit line 7) names GNP-19 to GNP-23. A blocker is a merged unit, i.e. `status: done` (`units/README.md` line 61; F2).
- **G4 Unblocks.** `unblocks: []` (unit line 9) and `parallel_with: []` (line 8). `unblocks` is the exact inverse of `blocked_by` (`units/README.md` line 64; F4).
- **G5 Test seams.** External behaviour only. API tests boot the composed app with `createTestApp` on a temp library; the content suite is `packages/packs/test/`; no unit test reads `examples/` (`units/README.md` line 141; `modules/genre-packs.md` lines 85 to 88).
- **G6 Golden tests.** Through `POST /api/tool-registry/tools/:name/execute`, with `SCRIBA_PACKS_DIR=packages/packs`, a temp library and the mock OpenAI server. Goldens change only on purpose (`modules/genre-packs.md` line 87; `packages/packs/test/README.md`, "Golden cases").
- **G7 The Tool registry switch.** `POST /api/tool-registry/tools/:name/enabled` with `{enabled: true}` writes the `tools` section of `settings.yaml` (`modules/tool-registry.md` line 43; `packages/contracts/src/tool-registry/routes.ts` line 15; `apps/api/src/modules/tool-registry/tools.controller.ts` line 98). A tool node, its form and its function schema are derived from the spec with no per-tool code (`modules/tool-registry.md` line 67).
- **G8 What the agent is offered.** The function list: the enabled, valid tools of the project's genre pack (`apps/api/src/modules/tool-registry/catalog.service.ts` lines 351 to 367; `tools.controller.ts` lines 72 to 75, which read the active project). The agent's narrative family reads the same list (`apps/api/src/modules/agent-loop/agent-tools.service.ts` lines 90 to 96).
- **G9 Palette.** A row is offered when `enabled && valid` (`apps/web/src/app/features/graph-runner/tool-nodes.ts` lines 81 to 86; `units/GRR-11-tool-nodes-wires.md` line 19).

### 1b. Settled by DECISIONS and other plans

- **DECISIONS 2026-11-20, GNP-19 (Navigator option a, line 7625).** A criterion that needs a local model server and a person stays unticked and the unit completes. GNP-19 is therefore done and unblocks this unit, though its criterion 5 is unticked. That criterion is not one of GNP-24's.
- **DECISIONS 2026-11-20, GNP-15 (lines 7042 and 7044).** The rerun rule for an unrelated intermittent failure of the root `npm test`. Step 11 applies it as written.
- **DECISIONS 2026-11-20, GRR-17 (lines 7528 to 7534).** The precedent for a criterion that cannot be run locally. No criterion of this unit needs it.
- **`plans/GNP-14.md` line 43 (C5).** One test of a criterion may await several golden bodies. GNP-21 and GNP-22 applied it (`apps/api/test/packs/tier2-shapes.test.ts` line 76; `tier2-3-shapes.test.ts` line 182). Criterion 2 of this unit relies on it (D2).
- **Downstream notes of the blockers.** GNP-20 plan section 5 (criterion 1 needs Throughline check enabled, met by its D1); GNP-21 plan line 771 (criteria 1 and 2); GNP-22 plan line 472 (criterion 4's canvas node "is GNP-24's to check", taken here as D6); GNP-23 plan section 5 (criterion 3 holds on main; the count of 14 is its open point 3, here section 7, point 1).

### 1c. Decided here (the simplest option the sources allow)

- **D1 Test file.** `apps/api/test/packs/remaining-shapes-gate.test.ts`, beside `core-gate.test.ts` (the GNP-05 gate test, the model for its imports). Two `it`s: C1 and C4.
- **D2 Criterion 2 has no new test.** Its test is the 14 per-tool golden cases that already exist (section 5). Each is one `goldenCase` on the composed app through the mock. A second run in the gate file would repeat 14 mock runs and add no coverage.
- **D3 Criterion 3 has no new test.** Its test is `packages/packs/test/remix.test.ts`, "AC 1" (line 69). It reads the YAML files and asserts that the remix enum equals the shipped draft tools minus remix, which is the criterion's wording. (Revised.) "Minus remix" is the settled form of the enum: `units/GNP-23-remix.md` line 16 says "every shipped `draft` tool except `remix`".
- **D4 Criterion 1's test is the new C1.** It reads the 14 rows from the Tool registry (validity and enabled states). Its pass condition also needs the validation suite and `lint:packs` green, run in steps 7 and 8.
- **D5 Criterion 4's test is the new C4.** It enables each of the twelve disabled shapes through the route and checks the registry, agent and canvas clauses (step 4). (Revised.) The agent clause is checked for all twelve in one agent run after the twelve enables: the run's chat request to the mock carries each of the twelve names in `tools`. One run covers every shape, so no shape is picked.
- **D6 The canvas clause is checked through the two HTTP reads the canvas makes.** (Revised.) The canvas reads `GET TOOLS_ROUTE` with no query (`apps/web/src/app/features/graph-runner/canvas-page.ts` `readTools`, line 1669) and offers a row in the palette when it is `enabled && valid` (`tool-nodes.ts` `paletteOf`, lines 82 to 88); a node of that tool is `ready` (ports and form drawn) when the detail `GET TOOL_ROUTE` returns non-null `views` (`canvas-page.ts` `readDetail`, line 1709; `toolStateOf`, `tool-nodes.ts` lines 66 to 79). C4 asserts these two reads for each of the twelve, before (row `enabled: false`, so not in the palette) and after the enable. The client functions are generic (no per-tool code, G7) and their own web tests (`tool-nodes.spec.ts`, `canvas-page.spec.ts`) run in the root `npm test` of step 11. This is external behaviour (HTTP responses) and needs no e2e step, which `modules/genre-packs.md` line 89 rules out. Open point 3 is settled by this.
- **D7 No e2e run and no demo run.** GNP-24 changes no shipped behaviour (G1). The demo is manual (open point 6).

## 2. Facts checked and facts assumed

### 2a. Facts checked

Commands: `git`, `ls`, `grep`, `sed`, `wc` and one `diff`, all read-only, at main `3c0a390`. No build, test, lint or npm command was run.

- **F1.** `git rev-parse --short HEAD` prints `3c0a390`; `git status --short` prints nothing.
- **F2.** Line 3 of `plans/GNP-19.md` to `plans/GNP-23.md` says `status: done`. `grep -l "^status: \(draft\|planned\)" plans/*.md` printed nothing before this file existed.
- **F3.** `units/GNP-24-remaining-shapes-gate.md`: front matter lines 1 to 10 (`blocked_by` line 7: GNP-19, GNP-20, GNP-21, GNP-22, GNP-23; `parallel_with` line 8, empty; `unblocks` line 9, empty); criteria lines 17 to 20; demo lines 23 to 26.
- **F4.** The `unblocks` lines name GNP-24 in `units/GNP-19-fiction-gate.md` (line 9), `GNP-20` (line 9), `GNP-21` (line 9, with GNP-23), `GNP-22` (line 9, with GNP-23) and `GNP-23` (line 9). `grep -ln "GNP-24\|remaining-shapes" units/*.md` lists those five, the GNP-24 unit and `units/README.md` (line 111, the phase table). No `blocked_by` names GNP-24.
- **F5.** `plans/QUEUE.md` line 2: "GNP-24 | M7 | available: yes | all blockers done (GNP-19..23); milestone gate and demo, no plan yet". Read only.
- **F6. The count of tools (criterion 1).** `ls packages/packs/*/tools/*.yaml | wc -l` prints 24. The phase's additions: GNP-20 unit line 15 (`throughline_check`, 1); GNP-21 unit lines 17 to 19 (`named_concept`, `comparison_set`, `objection_handler`, 3); GNP-22 unit table lines 18 to 26 (nine, 9); GNP-23 unit line 15 (`remix`, 1). Sum 14. The other 10 files predate the phase: `propose_graph` (GNP-04), `cold_open`, `mystery_question`, `myth_buster`, `numbers_to_people` (GNP-07 to GNP-10), `scene_builder` and `dialogue` (GNP-15, GNP-16), `character_builder`, `world_builder` and `plot_manager` (GNP-14, GNP-17). 24 minus 10 is 14.
- **F7. The states of the 14.** From the `output:` and `enabled:` lines of each file: `throughline_check` (`check`, `enabled: true`) and `remix` (`draft`, `enabled: true`). The 12 ship `enabled: false`: `named_concept` (`entity`) and the 11 drafts `comparison_set`, `contrast`, `flashback`, `framework_builder`, `method_first`, `objection_handler`, `profile`, `reader_challenge`, `stockdale_tension`, `timeline`, `zoom` (`draft`).
- **F8. The remix enum.** The `diff` of step 7 (the sorted names of the `output: draft` files minus `remix`, against the sorted `targetShape` enum of `packages/packs/core/tools/remix.yaml`) printed nothing (exit 0). The enum has 17 names: 6 enabled (`cold_open`, `dialogue`, `mystery_question`, `myth_buster`, `numbers_to_people`, `scene_builder`) and 11 disabled.
- **F9. Goldens for the 14.** Each has `packages/packs/test/golden/<name>/` and `e2e/fixtures/mock-openai/scenarios/pack-<name>.json` (14 of 14 each, by `ls`). Per-tool cases: `throughline_check` in `apps/api/test/packs/throughline-check.test.ts` (`it` line 32; `tool:` line 35); `remix` in `apps/api/test/packs/remix.test.ts` (`it` line 31; `tool:` line 34); `named_concept`, `comparison_set` and `objection_handler` in `apps/api/test/packs/tier2-shapes.test.ts` (`it` line 76; `tool:` lines 28, 43, 62); the nine tier 2-3 tools in `apps/api/test/packs/tier2-3-shapes.test.ts` (`it` line 182; `tool:` lines 56 to 168).
- **F10. Shipped states already asserted in the packs suite.** `packages/packs/test/tier2-shapes.test.ts` line 16 (the three, `enabled` false, line 29); `packages/packs/test/tier2-3-shapes.test.ts` line 23 (the nine, line 37); `packages/packs/test/remix.test.ts` line 88 (`enabled` true); `apps/api/test/packs/throughline-check.test.ts` line 79 (`enabled: true, valid: true`, in the `it` of line 56).
- **F11. The golden kit.** `packages/packs/test/README.md` says `goldenCase` returns the body of one `it` and runs through the mock server. `apps/api/test/packs/golden.kit.ts`: `PACKS_ROOT` line 30, `GOLDEN_ROOT` line 39, `runGoldenCase` line 131, `goldenCase` line 255; the `enable` option posts `{enabled: true}` to the enable route (lines 179 to 184).
- **F12. The enable path in an existing test.** `apps/api/test/packs/tier2-3-shapes.test.ts` AC 3 (`it` line 225): the execute route refuses the disabled `contrast` with 409 `TOOL_DISABLED`; the enable post is at line 280; after it, `functionNames` (helper line 217) contains `contrast`, and the execute call returns a draft. The helpers `get` (line 195) and `post` (line 200) are local to that file.
- **F13. The agent precedent.** `apps/api/test/agent-loop-narrative.test.ts` T1 (lines 296 to 344): a disabled registry tool is absent from the next request and back after the re-enable; it reads `chatBodies(await recordsOf(h.mock, 'enabled'))`.
- **F14. The registry's read shapes.** `packages/contracts/src/tool-registry/catalog.ts` lines 26 to 37 (`toolSummarySchema`: name, description, output, enabled, origin, overrides, valid, lintCounts, error) and line 52 (`toolDetailSchema`: `spec` line 53, `views` line 57). `catalog.service.ts` `list()` (line 189) returns every row when no genre pack is given.
- **F15. The palette.** `tool-nodes.ts` `paletteOf` (lines 81 to 86); `tool-nodes.spec.ts` line 248 (W1, `paletteOf`); `canvas-page.spec.ts` line 394 (the palette adds a tool; its comment on line 392 names cold_open).
- **F16. The gate precedent.** `apps/api/test/packs/core-gate.test.ts` lines 1 to 20: `createTestApp` with `SCRIBA_PACKS_DIR` set to `PACKS_ROOT`, `makeLibrary` from `../settings.kit`, and a `GET` of `TOOLS_ROUTE` checked with `toolListSchema`.
- **F17. Test-only golden.** `packages/packs/test/golden/golden_probe/` (GNP-02) has no `tools/` folder and is not a shipped tool; the count of F6 excludes it.
- **F18. Eval cases.** `scripts/eval-agent/cases/` holds one case file for each of the 14 (14 of 14, by `ls`). Not a criterion of this unit.
- **F19. The module.** `modules/genre-packs.md` line 27 (the graph ends at GNP-24); lines 85 to 90 (testing principles; line 89 says there is no e2e step).

### 2b. Facts assumed (not run)

- **A1.** (Checked by the reviser, now a fact.) `apps/api/test/project-store-projects.kit.ts` line 46 writes `book/project.yaml` with `genrePack: nonfiction`. The harness of step 4 sets `projects.active: book` in its `settings.yaml` (as `settingsText` of F13, line 79 of `agent-loop-narrative.test.ts`), and the plan still posts `ACTIVE_PROJECT_ROUTE` as AC 3 of F12 does.
- **A2.** (Checked by the reviser.) The harness of F13 is `openHarness`, `post`, `get`, `startRun`, `readUntilEnded`, `toolNamesOf`, `chatBodies` and `writeNarrativeProject` (`agent-loop-narrative.test.ts` lines 99 to 221). All are local and use only test kits (`../create-test-app`, `../guard-request`, `../invariant-sweep` with `observeEvents`, `../project-store-projects.kit`, `../providers-client.kit`, `../sse`) and contracts (`@bbartolome/scriba-contracts/agent-loop`, `/providers`, `/tool-registry`). One change is required: `openHarness` there sets `SCRIBA_PACKS_DIR` to the fixture packs (line 49); the copy sets it to `PACKS_ROOT`, since the twelve shapes are only in the real packs. The agent offers the functions of `catalog.functions(genrePack)` minus the reserved names (`agent-tools.service.ts` lines 90 to 101; `packages/contracts/src/agent-loop/constants.ts` line 31); none of the twelve is reserved.
- **A3.** `npm ci` works in a new worktree (the GNP-15, GNP-18 and GNP-19 precedent).
- **A4.** Prettier ignores `/plans/` (GNP-19 plan, F17, read there) and checks `apps/api/test/`.
- **A5.** No model server is running and no person is available for the demo or the real-model runs (GNP-19 plan, section 7, point 1).
- **A6.** The 14 shipped tools are `valid: true` in the Tool registry list. Read here as the expectation of C1; not run.

## 3. Files to change

Only these paths change.

| Path | Change | Content |
|---|---|---|
| `apps/api/test/packs/remaining-shapes-gate.test.ts` | new | two `it`s: C1 and C4 (section 5) |
| `units/GNP-24-remaining-shapes-gate.md` | edit at merge (step 14) | ticks the boxes whose tests passed; no criterion text changes |
| `plans/GNP-24.md` | edit at merge (step 14) | `status: done` |

No other file changes: no pack, tool spec, `enabled` flag, enum, golden, scenario, recipe golden, e2e spec, `golden.kit.ts`, `checks.ts`, module file, DECISIONS entry or QUEUE. Criteria 2 and 3 need no file change (D2, D3).

## 4. Procedure

Run from the worktree of step 2. Record `node -v` and `npm -v` beside each result. Do not push, merge or delete any branch.

0. **Preconditions.** `git rev-parse --short HEAD` on main is `3c0a390` or later, and `git diff --stat 3c0a390 HEAD -- packages apps scripts e2e` prints nothing. `git show main:plans/<ID>.md | sed -n 3p` prints `status: done` for GNP-19, GNP-20, GNP-21, GNP-22 and GNP-23. No `unit/GNP-24` branch exists. If not, stop and report.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.x`.
2. **Worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GNP-24 -b unit/GNP-24 main`, then `cd` there and run `npm ci`. Expected: exit 0.
3. **Baseline, before any write.** (a) `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`: exit 0. (b) `npm run lint:packs`: exit 0. (c) `npm test -w @bbartolome/scriba-packs`: exit 0. (d) `cd apps/api && npx vitest run test/packs`: exit 0, every case passing; record the count (this is the run of criteria 2 and 3 on the base). (e) `git status --short` prints nothing. Stop and report on any failure.
4. **Write the test file (D1, D5, D6).** With the Write tool, create `apps/api/test/packs/remaining-shapes-gate.test.ts`.
   - Imports as in `core-gate.test.ts` (F16, including `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` from `../invariant-sweep`), plus `TOOL_ROUTE`, `TOOL_ENABLED_ROUTE`, `FUNCTIONS_ROUTE`, `functionListSchema` and `toolDetailSchema` from `@bbartolome/scriba-contracts/tool-registry`; `ACTIVE_PROJECT_ROUTE` from `@bbartolome/scriba-contracts/project-store`; and the imports the copied agent harness needs (A2): `AGENT_RUNS_ROUTE`, `agentLoopEventSchema`, `agentStartResponseSchema`, `type AgentLoopEvent` from `@bbartolome/scriba-contracts/agent-loop`; `PROVIDER_DEFAULTS` from `@bbartolome/scriba-contracts/providers`; `observeEvents` and `type Observer` from `../invariant-sweep`; `buildProjectsLibrary` and `type ProjectsLibrary` from `../project-store-projects.kit`; `startMockOpenAI`, `recordsOf`, `type MockOpenAI`, `type MockOpenAIRecord` from `../providers-client.kit`; `dataOf` from `../sse`; `send`, `sessionCookie`, `type Reply` from `../guard-request`; `stringify` from `yaml`; the `node:fs`, `node:os` and `node:path` functions it uses; `PACKS_ROOT` from `./golden.kit`. The harness helpers are copied locally (A2), with `SCRIBA_PACKS_DIR: PACKS_ROOT`; `writeNarrativeProject` is copied only if the run needs it. Only the helpers that the file uses are kept; no unused import.
   - Constants: `ENABLED = ['throughline_check', 'remix']`; `DISABLED = ['named_concept', 'comparison_set', 'objection_handler', 'contrast', 'profile', 'zoom', 'reader_challenge', 'framework_builder', 'method_first', 'timeline', 'flashback', 'stockdale_tension']`; `PHASE = [...ENABLED, ...DISABLED]`, of length 14.
   - **C1 `it`, title starting `C1:`.** A temp library and `createTestApp` with `SCRIBA_PACKS_DIR` set to `PACKS_ROOT`. `GET TOOLS_ROUTE`, parsed with `toolListSchema`. For each name of `PHASE`: its row exists; `valid` is true; there is no `error`; `enabled` equals `ENABLED.includes(name)`.
   - **C4 `it`, title starting `C4:`, timeout 120000.** (Revised.) One harness (A2): a temp mock scenario folder with one scenario whose only step is `{match: {endpoint: 'chat'}, reply: {kind: 'stream', deltas: ['Done.']}}` (as T1 of F13), `buildProjectsLibrary` with that provider and `projects.active: book`, `createTestApp` with `SCRIBA_PACKS_DIR: PACKS_ROOT`, and a session cookie. `POST ACTIVE_PROJECT_ROUTE` with `{projectId: 'book'}`, expecting 200 (A1). Then for each name of `DISABLED`: (i) `GET FUNCTIONS_ROUTE` does not contain it, and the row of `GET TOOLS_ROUTE` (no query, as the canvas reads it, D6) has `enabled: false`; (ii) `POST TOOL_ENABLED_ROUTE` with `{enabled: true}` returns 200 and a row with `enabled: true` and `valid: true`; (iii) `GET FUNCTIONS_ROUTE` contains it; (iv) `GET TOOL_ROUTE` returns 200, parsed with `toolDetailSchema`, with non-null `spec` and `views`; (v) the row of `GET TOOLS_ROUTE` (no query) is `enabled && valid`. Then the agent clause, once for all twelve: open the event stream, start one run with `startRun`, read until `run-ended`, and check that the run's chat request (`chatBodies(await recordsOf(mock, <scenario>))[0]`) carries each name of `DISABLED` in `tools`. The agent clause is not dropped; if the harness cannot be copied into this file, stop and report. Each resource (stream, app, mock, scenario folder, library) is closed or removed in `finally`, as in F13.
   - The file does not contain the word `examples`, not even in a comment: `scripts/examples-check/m1.mjs` refuses a test file that names it (GNP-19 plan, F16). No unused import.
5. **Run C1 and C4.** `cd apps/api && npx vitest run test/packs/remaining-shapes-gate.test.ts`: exit 0, 2 passed. Record the two titles and their results. A failure is reported with its output; no packs file is edited to make it pass.
6. **Criterion 2 (existing tests).** `cd apps/api && npx vitest run test/packs`: exit 0, the same run as step 3(d). Record that the 14 cases of section 5 pass. `git status --short packages/packs/test/golden` prints nothing (no `--update-goldens`).
7. **Criterion 3 (existing test).** `npm test -w @bbartolome/scriba-packs`: exit 0. Record the pass of `AC 1: the real packs pass the validation suite, and the remix enum is the shipped draft tools minus remix` (`packages/packs/test/remix.test.ts` line 69). Read-only check, recorded: `diff <(grep -l '^output: draft' packages/packs/*/tools/*.yaml | xargs -n1 basename | sed 's/\.yaml$//' | grep -v '^remix$' | sort) <(sed -n '/targetShape:/,/x-scriba-control/p' packages/packs/core/tools/remix.yaml | grep '^ *- ' | sed 's/^ *- //' | sort)` prints nothing.
8. **Criterion 1, validation suite.** `npm run lint:packs`: exit 0. The packs test "the suite passes on the real packs" (`packages/packs/test/real-packs.test.ts`) passes in step 7's run.
9. **Format.** `npx prettier --check apps/api/test/packs/remaining-shapes-gate.test.ts`: exit 0. If it fails, run `npx prettier --write` on that file and repeat step 5.
10. **No negative control.** C1 reads the shipped files, and this plan adds no second packs root, so no copy is made. Recorded as "no negative control".
11. **Root gates.** From the worktree root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .`, each exit 0, with `uptime` recorded before each `npm test`. If run 1 of `npm test` exits non-zero, the rule of DECISIONS 2026-11-20 GNP-15 (lines 7042 and 7044) applies as written: list every failing test and its file. If a failing file is the new test file, or is under `apps/api/test/packs/` or `packages/packs/test/`, stop and report it with the output. Otherwise run each failing file alone, then run `npm test` again on the same commit with no file changed in between (at most two reruns, `uptime` before each). The gate is met when a rerun exits 0. If both reruns fail, or the same test fails in all three runs, stop and report the three outputs and the load averages.
12. **E2E not run.** GNP-24 changes no shipped behaviour, and `modules/genre-packs.md` line 89 says this module adds no e2e step. Record "e2e not run" with that reason. Do not edit any e2e file.
13. **Tree check and commit.** `git status --short` lists exactly `apps/api/test/packs/remaining-shapes-gate.test.ts`. Then `git add -- apps/api/test/packs/remaining-shapes-gate.test.ts` and `git commit -m "test(GNP-24): remaining-shapes gate: phase state and the enable path" -- apps/api/test/packs/remaining-shapes-gate.test.ts`. Do not push.
14. **Gate record (after review, before merge; the merge is the orchestrator's).** One commit `docs(GNP-24): mark the criteria that passed` ticks in `units/GNP-24-remaining-shapes-gate.md` the boxes of the criteria whose tests passed in steps 5 to 8; the criterion text does not change. A second commit `docs(GNP-24): set the plan to done` sets `status: done` in `plans/GNP-24.md`. Both are by path. No box is ticked before its test passes.
15. **Record.** Node and npm versions; each command's exit code and output line; the two titles of step 5; the 14 cases of step 6; the pass of step 7; the `uptime` and reruns of step 11; "e2e not run" (step 12); "demo not run: manual, no model server and no person" (open point 6).

## 5. Acceptance criteria and tests

The criterion texts are copied from unit lines 17 to 20. Each criterion has one test.

| Criterion (unit line) | Test | Command (step) | Pass condition |
|---|---|---|---|
| 1. "All fourteen tools pass the validation suite. The twelve nonfiction shapes ship disabled; Throughline check and Remix ship enabled." (17) | C1: `apps/api/test/packs/remaining-shapes-gate.test.ts`, "C1: ...". New. The validation suite (`packages/packs/test/real-packs.test.ts`, `lint:packs`) is the same criterion's supporting run. | `cd apps/api && npx vitest run test/packs/remaining-shapes-gate.test.ts` (5); `npm run lint:packs` (8) | C1 passes: each of the 14 rows is valid with the enabled state the criterion names; `lint:packs` exits 0 and the packs suite passes. |
| 2. "One golden test per tool through the mock OpenAI server." (18) | The 14 existing per-tool golden cases (table below). Existing. | `cd apps/api && npx vitest run test/packs` (6) | Exit 0; every case matches its golden; no golden changed. |
| 3. "Remix's `targetShape` enum matches the shipped draft tools." (19) | `packages/packs/test/remix.test.ts`, "AC 1: the real packs pass the validation suite, and the remix enum is the shipped draft tools minus remix" (line 69). Existing. | `npm test -w @bbartolome/scriba-packs` (7) | The test passes; the `diff` of step 7 prints nothing. |
| 4. "Enabling a disabled shape through the Tool registry makes it callable by the agent and available as a canvas node." (20) | C4: the same file, "C4: ...". New. | `cd apps/api && npx vitest run test/packs/remaining-shapes-gate.test.ts` (5) | C4 passes: for each of the 12, the row is `enabled: false` and the name is absent from the function list before the enable; the enable route returns 200 with a row that is `enabled && valid`; after it, the name is in the function list, the unfiltered tool list row is `enabled && valid` (the palette condition) and the detail has non-null `spec` and `views` (the ready-node condition); the one agent run after the enables carries all 12 names in the `tools` of its chat request. |

The 14 per-tool golden cases of criterion 2:

| Tool | Case file | Line of `tool:` |
|---|---|---|
| `throughline_check` | `apps/api/test/packs/throughline-check.test.ts` | 35 |
| `remix` | `apps/api/test/packs/remix.test.ts` | 34 |
| `named_concept`, `comparison_set`, `objection_handler` | `apps/api/test/packs/tier2-shapes.test.ts` | 28, 43, 62 |
| `contrast`, `profile`, `zoom`, `reader_challenge`, `framework_builder`, `method_first`, `timeline`, `flashback`, `stockdale_tension` | `apps/api/test/packs/tier2-3-shapes.test.ts` | 56, 71, 80, 95, 109, 124, 138, 153, 168 |

The demo is not a criterion (D7, open point 6).

## 6. Agreement with downstream units and parallel work

- **GNP-24 unblocks nothing.** `unblocks: []` (unit line 9). No `blocked_by` in `units/` names GNP-24 (F4). The phase table (`units/README.md` line 111) and the module graph (`modules/genre-packs.md` line 27) show it as the last node of Genre packs; no later phase of the module exists. The new test file is read by no other unit. The merge's only effect is the close of `phase:remaining-shapes`, which the unit states (line 14).
- **GNP-19 to GNP-23 (the blockers).** Each of their `unblocks` lines names GNP-24 (F4), so the inverse holds. Their downstream notes (section 1b) name what this unit checks, and this plan agrees with each: GNP-20 (criterion 1 needs Throughline check enabled, its D1); GNP-21 line 771 (criteria 1 and 2); GNP-22 line 472 (its canvas-node note, taken here as D6); GNP-23 section 5 (the 17-name enum holds on main; the count of 14 is the phase's count).
- **Parallel work.** `parallel_with: []` (unit line 8). No plan with `status: draft` or `status: planned` exists besides this one (F2), so no other plan changes the files of section 3.
- **Shipped data.** GNP-24 changes no shipped state, so the recipe golden (GNP-23 D8) and the enum (GNP-23 D3) stay as they are.

## 7. Open points

1. **Decided by the reviser: "fourteen tools" are the 14 tools the phase adds.** The reviser re-ran the count at main `39f4866`: 24 tool files; the `output:` and `enabled:` lines give exactly 12 nonfiction shapes with `enabled: false` and 2 core tools of the phase enabled (`throughline_check`, `remix`). The criterion's own second sentence names these 12 + 2 = 14, so the reading follows from the criterion text and needs no author intent; under "all shipped tools" the number would be 24 and the second sentence would not cover them. The validation suite (steps 7 and 8) covers all 24 in any case. The criterion text is unchanged.
2. **Decided by the reviser: one golden case per tool, grouped `it`s allowed.** `plans/GNP-14.md` line 43 (C5) is the settled convention, applied by the done units GNP-21 and GNP-22, whose criteria were ticked on main with these grouped `it`s (DECISIONS, GNP-22 merge). Each of the 14 tools has its own `goldenCase` through the mock (section 5 table), so the criterion is met as written (D2). No file is split.
3. **Decided by the reviser: the canvas clause is testable by a local procedure the module allows (D6).** `modules/genre-packs.md` line 89 says only that this module adds no e2e step. The canvas decides "available as a canvas node" from two HTTP reads (the unfiltered tool list and the tool detail); C4 asserts both for each of the 12, before and after the enable, and the generic client code is tested by its own web specs in step 11. The criterion is not weakened; no Navigator point.
4. **Decided by the reviser: the agent clause covers all 12 in one run (D5), with the harness copied as A2 states (packs root changed to `PACKS_ROOT`).** If the copy cannot be made to run, the implementer stops and reports; the clause is not dropped.
5. **GNP-19 criterion 5 is unticked.** It needs a local model server and a person (DECISIONS 2026-11-20, GNP-19). The merge closed `phase:fiction` and unblocks this unit. It is not a criterion here and is not changed here. No action in GNP-24.
6. **Demo steps 1 to 4 are manual.** They need the UI and a model. Demo step 1 can use the chapter fixture of GNP-20 (`plans/GNP-20.md` section 7, point 2). They are not a test and are recorded as not run.
7. **The real-model runs of the 14 eval cases were never run.** GNP-20 (optional) and GNP-21 to GNP-23 record them as not run. No unit carries them, and no criterion of this unit names them. Recorded as not run; not added to this gate.

## 8. Review parts

The plan is small, so it has one part.

- **Part 1: the remaining-shapes gate test file, its gate runs and the merge-stage record.** Steps 0 to 15. Tests: C1 (criterion 1: step 5, with the validation run of step 8); the 14 existing cases (criterion 2: step 6); the existing AC 1 of `remix.test.ts` (criterion 3: step 7); C4 (criterion 4: step 5). Files: the new test file (step 13) and the two merge-stage edits (step 14). The reviewer checks: the file against step 4, D1, D5 and D6 (the 12 names; clauses (i) to (v) of C4, with the unfiltered tool list; the one agent run with all 12 names; the copied harness uses `PACKS_ROOT`; no word `examples`); that no golden, spec, enum or e2e file changed (steps 6 and 11); that the criterion texts are unchanged; that no box is ticked before its test passes; and the results of steps 5 to 8 and 11.
