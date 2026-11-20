---
id: AGL-24
status: draft
---
# AGL-24 plan — compile tools (assemble_manuscript, run_preflight, export_manuscript)

Unit `units/AGL-24-compile-tools.md` (module Agent loop, phase:compile-tools, M7). Planned on `main` at e5a0111, with a clean working tree. Revision 1, planner. Status draft: open points 1 to 4 (section 6) are for the Navigator. Nothing in this plan is marked passed.

## 1. Decisions this plan follows

Settled by the unit, the module or the README (the source is given):

- **D1. The three tools are thin calls to the Compile & export services.** `assemble_manuscript` returns `ManuscriptService.view()`, `run_preflight` returns `PreflightService.run(now)`, and `export_manuscript` returns `ExportService.export(format)`. Source: unit line 17, which lists "manuscript view model, preflight request/result, export request/result" in that order. The services are exported from the entry file (`apps/api/src/modules/compile-export/compile-export.module.ts` lines 19 to 22). Module shape: `modules/compile-export.md` line 39.
- **D2. Read and produce only.** No reorder, no snapshot create or restore, no settings tool. Source: unit line 18; `modules/agent-loop.md` line 74; `modules/compile-export.md` line 74.
- **D3. No graph run and no Graph runner.** Compile & export reads only `order` edges (unit line 19; `modules/compile-export.md` line 42). The import rule is lint R2 (`eslint.config.mjs` line 69): agent-loop and graph-runner never import each other, not even their entry files. Source: unit line 19; `modules/agent-loop.md` line 50.
- **D4. Offered only once this unit lands, in every normal run.** The compile family is added to the families of a normal start (`apps/api/src/modules/agent-loop/agent-runs.service.ts` lines 77 to 79). It is not behind a setting, because the unit names none. The check-grounding run keeps its own families (`['grounding']`, line 97), so it never offers compile tools. Source: unit line 20; `modules/agent-loop.md` line 81.
- **D5. Bound project.** Each handler calls `store.requireActive(ctx.run.projectId)` first. The compile services read the active project (`manuscript.service.ts` lines 92 to 93; `preflight.service.ts` line 65; `export.service.ts` lines 377 to 379), and `requireActive` refuses another project with a `ModuleError` (`project-store.service.ts` lines 126 to 141). Source: unit line 17 ("on the bound project"). Planner's choice: the simplest way to meet it, because the services take no project id.
- **D6. New file, registered in the service constructor.** The definitions go in a new file `apps/api/src/modules/agent-loop/tools/compile-tools.ts`. `AgentToolsService` builds its list from `builtinTools(...)` plus `compileDefinitions(...)`. They do not go into `builtinTools()`, which holds the project and grounding families (`tools/builtin-tools.ts` line 18 and the `family: 'grounding'` of `check_grounding` at line 363), and AGL-22 appends `fetch_page` to that list (`plans/AGL-22.md` P2 and section 2). A separate file keeps the two edits apart. The pattern is AGL-21's `tools/web-search.ts`. Planner's choice.
- **D7. Family gate.** `ToolRun` offers a tool only when its family is enabled (`tools/tool-run.ts` lines 88 to 93). No other gate is added.
- **D8. Arguments.** `assemble_manuscript` and `run_preflight` take an empty object: `properties: {}`, `required: []`, `additionalProperties: false`, in the shape of `ToolArgumentSchema` (`tools/tool-types.ts` lines 37 to 42). `export_manuscript` takes `format` as a string. The handler checks it with the contract's `exportFormatSchema` (`packages/contracts/src/compile-export/constants.ts` lines 44 to 45) and refuses any other value with `ToolArgumentError` at path `/format`, message `must be md, docx, epub or pdf`. `ToolSchemaProperty` has no `enum` (`tool-types.ts` lines 27 to 34), and this decision keeps `tool-types.ts` unchanged. Planner's choice.
- **D9. Results.** Each handler returns a `summary` and an `output`.
  - `assemble_manuscript`: summary `Read the manuscript: <entries count> files, <totals.manuscript> words.`; output is the `ManuscriptView`. The unit names the view model, not the assembled Markdown text, for this tool (unit line 17).
  - `run_preflight`: summary `Ran the preflight: <errors> errors, <warnings> warnings, <infos> infos.`; output is the `PreflightResult`. The counts are computed in `compile-tools.ts`, because `summaryOf` (`export.service.ts` lines 104 to 118) is not exported by the entry file.
  - `export_manuscript`: summary `Exported <fileName> (<bytes> bytes).`; output is the `ExportResult`.

  The loop emits the output on `tool-call-result` (`agent-run.ts` lines 361 to 364). The card shows object output as a JSON tree (`apps/web/src/app/shell/tool-call-card.ts` lines 186 to 200; `apps/web/src/app/features/agent-loop/chat-state.ts` lines 438 to 445). Source for "with result cards": unit line 17.
- **D10. The same export by construction.** The agent calls `ExportService.export(format)`, which the POST route also calls (`export.controller.ts` lines 29 to 35). The `md` format is written directly (`export.service.ts` lines 186 to 188) and needs no Pandoc.
- **D11. Errors are not caught in the handler.** A `ModuleError` from a compile service propagates to the dispatcher, which counts it as an invalid call (`tool-run.ts` lines 190 to 194). See open point 2.
- **D12. Module wiring.** `AgentToolsService` injects `ManuscriptService`, `PreflightService` and `ExportService` from `../compile-export/compile-export.module` (the entry file, which lint R1 allows, `eslint.config.mjs` line 50). `AgentLoopModule` imports `CompileExportModule`. There is no cycle: `CompileExportModule` imports only Platform, Project store and Setup & auth (`compile-export.module.ts` line 26).
- **D13. The test seam is the module default.** The unit heading has no seam parenthetical (`units/README.md` line 57), so the criteria run through the composed app, the mock OpenAI server and the SSE stream (`modules/agent-loop.md` lines 61 to 63). No test kit module is booted, as the AGL-10 decision requires (DECISIONS lines 4280 to 4283).
- **D14. Criterion 3, the "request-log assertion".** The unit does not say which log. This plan reads "the requests the mock model receives" (`modules/agent-loop.md` line 63) as the mock's record of chat requests, and adds an HTTP check that the Graph runner has no current run (`apps/api/src/modules/graph-runner/runs.service.ts` lines 325 to 330; route `runs.controller.ts` line 30). The import half is lint rule R2.
- **D15. Export format in the parity test.** The parity test uses `md` only. Pandoc was not installed on the host at the CEX-15 run (DECISIONS line 6651). `md` runs through the same service as the other formats, so the test covers the shared path.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/tools/compile-tools.ts` | new | Exports `compileDefinitions(services)`, which returns the three `ToolDefinition`s (family `compile`) with their schemas and handlers (D1, D5, D8, D9). Imports: `../../compile-export/compile-export.module`, `../../project-store/project-store.module` (type `ProjectStoreService`), `./tool-types`, and `@bbartolome/scriba-contracts/compile-export`. No import from the graph-runner module. |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | edit | Imports `compileDefinitions` from `./tools/compile-tools` and the three services from the compile-export entry file (after line 24). The constructor (lines 42 to 50) gains `private readonly manuscript: ManuscriptService`, `private readonly preflight: PreflightService` and `private readonly exporter: ExportService`. Lines 53 to 58 build `this.tools` from `[...builtinTools(files, search, store, projects), ...compileDefinitions({ store, manuscript, preflight, exporter })]`. `startRun` is unchanged. |
| `apps/api/src/modules/agent-loop/agent-runs.service.ts` | edit | Lines 77 to 79: `'compile'` is added to both arrays (D4). |
| `apps/api/src/modules/agent-loop/agent-loop.module.ts` | edit | Imports `CompileExportModule` from `../compile-export/compile-export.module` (after line 5) and adds it to `imports` (lines 37 to 42) (D12). |
| `apps/api/test/agent-loop-compile.test.ts` | new | Criteria AC1 to AC3 (section 4). |
| `apps/api/test/agent-loop-run.test.ts` | edit | The two expected lists of offered tools: research off at lines 373 to 380, research on at lines 391 to 398 (the names are at 374 to 379 and 392 to 397). Each gains the three compile names in sorted order (section 5). Line 382 does not change. |

Unchanged on purpose: `tools/builtin-tools.ts`, `tools/tool-types.ts` and `tools/tool-run.ts` (D6, D8); `agent-prompt.ts`; the compile-export module (no change to its code); `packages/contracts` (the three names are reserved at `constants.ts` lines 40 to 42, and the family is at line 13); `apps/web` (the family is in `agent-contract.ts` lines 59 to 65, and the card renders output); `eslint.config.mjs`; `app.module.ts` (it imports `CompileExportModule` already, line 29).

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`. Work in a new worktree at `/Users/bbartolome/workspace/scriba-prototype-wt/AGL-24` on branch `unit/AGL-24`, created from `main` (`git worktree add <path> -b unit/AGL-24 main`). Record the `main` head used. Record `node -v` and `npm -v` beside each result (v26.13.0 and 11.20.0 at planning). Do not push. The code commit does not change `units/`, `modules/` or `plans/`.

1. **Runtime and worktree.** `node -v` prints `v26.x` and `npm -v` prints `11.x`. The worktree exists and is on `unit/AGL-24`.
2. **Install and build.** In the worktree: `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`, then `npm run build -w @bbartolome/scriba-api`. Expected: each exits 0.
3. **Baseline.** From `apps/api`: `npx vitest run test/agent-loop-*.test.ts`. Expected: every file passes. Record the file and test counts.
4. **Red tests.** Create `apps/api/test/agent-loop-compile.test.ts` (section 4). From `apps/api`: `npx vitest run test/agent-loop-compile.test.ts`. Expected on main: AC1, AC2 and AC3 fail, because no compile tool is offered. Record the output and the number of mock records in the AC3 scenario (assumption A2, section 7).
5. **Compile tools.** Create `tools/compile-tools.ts` (section 2; D1 to D10). Expected: `grep -n "graph-runner" apps/api/src/modules/agent-loop/tools/compile-tools.ts` prints nothing, and each relative import is one of the entry files named in section 2.
6. **Service.** Edit `agent-tools.service.ts` (section 2). Expected: `grep -n "compileDefinitions\|exporter" apps/api/src/modules/agent-loop/agent-tools.service.ts` shows the import, the constructor parameter and the list line.
7. **Families.** Edit `agent-runs.service.ts` lines 77 to 79. Expected: `grep -n "'compile'" apps/api/src/modules/agent-loop/agent-runs.service.ts` prints two lines.
8. **Module.** Edit `agent-loop.module.ts`. Expected: `grep -n "CompileExportModule" apps/api/src/modules/agent-loop/agent-loop.module.ts` prints the import and the entry in `imports`.
9. **Expected lists.** Edit the two lists in `agent-loop-run.test.ts` (section 5). Expected: `git diff -- apps/api/test/agent-loop-run.test.ts` changes only lines inside those two lists.
10. **New tests.** From `apps/api`: `npx vitest run test/agent-loop-compile.test.ts`. Expected: AC1, AC2 and AC3 pass.
11. **Agent-loop suite.** From `apps/api`: `npx vitest run test/agent-loop-*.test.ts`. Expected: every file passes, and the test count equals step 3 plus three. Step 8 changes the module graph that `agent-loop-tools.test.ts` (line 35, which boots `AgentLoopModule` on its own) and `agent-loop-grounding.kit.ts` (line 59) use, so both must still boot.
12. **Gates.** From the root: `npm run lint`, then `npm run build -w @bbartolome/scriba-api`. Then `npx prettier --check apps/api/src/modules/agent-loop apps/api/test/agent-loop-compile.test.ts apps/api/test/agent-loop-run.test.ts`, then `npm test -w @bbartolome/scriba-api`. Expected: each exits 0. If the API run fails for load reasons (DECISIONS line 6392 records web timeouts under load on another unit), record it and rerun the API workspace.
13. **Scope and commit.** `git status --short` lists only the section 2 paths. Commit with `feat(AGL-24): compile tools assemble_manuscript, run_preflight and export_manuscript`. Record the hash.
14. **Mutations.** On the committed tree, make each change below, run the named check, record the failing test, and restore with `git checkout -- <path>`. After each restore, `git status --short` is empty.
    - M1 (family not offered): remove `'compile'` from both arrays in `agent-runs.service.ts`. Expected: AC1 and AC2 fail, and both lists in `agent-loop-run.test.ts` fail.
    - M2 (export not awaited): in `compile-tools.ts`, the export handler passes `exporter.export(format)` without `await`. Expected: AC2 fails (the summary reads `Exported undefined` and the output is `{}`).
    - M3 (fifth check dropped): in `compile-tools.ts`, the preflight output keeps only the first four checks. Expected: AC1 fails.
    - M4 (import of the Graph runner): add `import '../../graph-runner/graph-runner.module';` to `compile-tools.ts`. Expected: `npm run lint` fails on R2 (`eslint.config.mjs` line 69), and AC3 still passes, so lint is the detection for this change. Restore before step 15.
15. **Record.** The Node and npm versions, each command's output and the test counts. A criterion is marked passed only when its row in section 4 passes.

## 4. Acceptance criteria and tests

All three tests are in one file, `apps/api/test/agent-loop-compile.test.ts`, and run with `npx vitest run test/agent-loop-compile.test.ts` from `apps/api`. Each test boots its own app with `openHarness` (`agent-loop-run.test.ts` lines 84 to 116), which uses `buildProjectsLibrary` (`apps/api/test/project-store-projects.kit.ts` lines 30 to 60: a `book` project with `project.yaml`, title `Book`, `genrePack: nonfiction`, and `sources/outline.md`). Each test then writes its drafts into `h.fixture.library/book` before `startRun`, as `prepare` does (`agent-loop-grounding.test.ts` line 37). Each test closes its app, mock and library through `h.close()`.

The helpers are copied from `agent-loop-run.test.ts`, as AGL-21 and AGL-22 do: `providersSection` (line 44), `settingsText` (line 64), `openHarness` (84 to 116), `post` (118), `startRun` (130), `readUntilEnded` (140), `toolNamesOf` (168), `chatBodies` (172) and `toolContents` (177). The SSE stream comes from `observeEvents` (line 218). `recordsOf` comes from `providers-client.kit.ts` line 61. `toolCallStep` is copied from `agent-loop-diff-preview.test.ts` lines 204 to 209.

| Criterion (unit line) | Test name and seam | Command | Pass condition |
|---|---|---|---|
| "Run the preflight" returns the five checks as a card. (line 23) | `AC1: "Run the preflight" returns the five checks as a card.` Scenario: turn 0 `toolCallStep(0, 'run_preflight', '{}')`, turn 1 `{ kind: 'stream', deltas: ['Done.'] }`. Intent `Run the preflight`. The draft `book/drafts/ch01.md` holds one short paragraph. | from `apps/api`: `npx vitest run test/agent-loop-compile.test.ts -t "AC1"` | The events hold a `tool-call-started` with name `run_preflight` and family `compile`. A `tool-call-result` with the same `callId` has `output.checks` whose ids are exactly `PREFLIGHT_CHECK_IDS` in order (contract `constants.ts` lines 57 to 63). Each check has a `status` and a `findings` array. Its summary starts `Ran the preflight:`. The run ends. The second chat request's tool message holds the five ids. |
| An export started by the agent produces the same result as one started from the manuscript view. (line 24) | `AC2: An export started by the agent produces the same result as one started from the manuscript view.` Draft as AC1; project title `Book`. Scenario: turn 0 `toolCallStep(0, 'export_manuscript', '{"format":"md"}')`, turn 1 `Done.`. Run 1 is the agent's, read to its end. Its file is read from disk before run 2, because `keepOnly` (`export.service.ts` lines 358 to 372) deletes the older `md` file. Then `post(h, EXPORT_ROUTE, { format: 'md' })`, which is the manuscript-view path. | from `apps/api`: `-t "AC2"` | The two results match on `format`, `bytes`, `warnings`, `preflight.errors`, `preflight.warnings`, `preflight.infos`, `preflight.revision` and `downloadUrl`. The two files, in `book/.scriba/compile-export/exports/` (`modules/compile-export.md` line 53), have the same bytes. Each `fileName` ends in `.md`. `preflight.ranAt` is not compared. |
| No agent tool starts a recipe run or calls the Graph runner (lint and a request-log assertion). (line 25) | `AC3: No agent tool starts a recipe run or calls the Graph runner.` The project also gets `book/graphs/story.json`, a story graph with one node `ch01` (path `drafts/ch01.md`) and no edges. It is built with `storyGraph` (`compile-export-manuscript.kit.ts` line 92), a pure function; the kit module is not booted. Scenario: turn 0 `assemble_manuscript` with `{}`, turn 1 `run_preflight` with `{}`, turn 2 `export_manuscript` with `{"format":"md"}`, turn 3 `Done.`. | from `apps/api`: `-t "AC3"`; and from the root, `npm run lint` (step 12); and mutation M4 (step 14) | Three `tool-call-result` events, one for each compile name, and no `tool-call-error` for them. `GET /api/graph-runner/runs/current`, sent with the session cookie, answers `{"run":null}`. The graph file has the same bytes before and after the run. `recordsOf(mock, scenario)` has exactly four records, one per scripted chat turn, and the first request offers the three compile names. `npm run lint` exits 0. |

Notes on the table:

- The two lists in `agent-loop-run.test.ts` (section 5) are not new criteria. They pin D4, so they change with it.
- Decision D4 has no separate test: the two lists cover it.
- The parity test uses `md` only (D15).

## 5. Downstream and parallel agreement

**Downstream.** None. The unit's `unblocks` is empty (unit line 9). The inverse holds: `units/AGL-08-file-tools-chat-gate.md` line 9, `units/CEX-09-assembly-preflight-gate.md` line 9 and `units/CEX-15-export-gate-image-smoke.md` line 9 each name AGL-24 in `unblocks`.

**Blockers, checked on main.** AGL-08: `plans/AGL-08.md` status done. CEX-09: `plans/CEX-09.md` status done (merged, DECISIONS lines 6576 to 6581). CEX-15: `plans/CEX-15.md` status done, and `3f02bfa` is an ancestor of main (DECISIONS lines 7152 to 7159). Its criterion 2 is still unticked, which does not affect the phase gate (`units/README.md` line 69).

**Parallel with AGL-21.** AGL-21 is merged (`3c94f37` is an ancestor of main; `plans/AGL-21.md` status done). The earlier note that it was "planned" is out of date. Its lines are already on main: `agent-tools.service.ts` lines 24, 32, 40, 59 and 97 to 106, and `agent-runs.service.ts` line 153. This plan does not edit those lines. It edits the constructor (lines 42 to 50) and the list (lines 53 to 58) on the main that includes AGL-21.

**Parallel with AGL-22.** AGL-22 is a draft (`plans/AGL-22.md` line 3) and is not merged. The shared files:

1. **`apps/api/test/agent-loop-run.test.ts`.** Both change the expected lists. The final lists are the sorted union, whichever merges second. Research off (lines 373 to 380): `assemble_manuscript`, `check_grounding`, `edit_file`, `export_manuscript`, `list_files`, `read_file`, `run_preflight`, `search_notes`, `write_file`. Research on (lines 391 to 398), with AGL-22 merged: the same nine names plus `fetch_page`, which sorts after `export_manuscript` and before `list_files`. AGL-22's P16 (`plans/AGL-22.md` line 45) says "after `edit_file`", which is its position without AGL-24. The list is sorted because `toolNamesOf` sorts (`agent-loop-run.test.ts` line 169). Whichever plan merges second writes the sorted list.
2. **`apps/api/src/modules/agent-loop/tools/builtin-tools.ts`.** AGL-22 appends `fetchPageDefinition()` to the list at lines 407 to 414 (`plans/AGL-22.md` P2). This plan does not touch that file, so no line is shared. AGL-22's section 5 (line 126) says to keep both items if both append there; this plan avoids the list, so nothing needs keeping.
3. **`apps/api/src/modules/agent-loop/agent-tools.service.ts`.** AGL-22 edits it only if its open point 1 adds a constructor input (`plans/AGL-22.md` section 2, seam row). This plan changes the constructor parameters (lines 42 to 50) and the list (lines 53 to 58). If both land, a constructor hunk may conflict. Keep both: AGL-22's input and this plan's three services. Step 6 checks that the constructor holds both.
4. **`agent-runs.service.ts`, `agent-loop.module.ts`, `tools/tool-types.ts`, `tools/tool-run.ts`.** AGL-22 does not edit them (`plans/AGL-22.md` section 2, "unchanged on purpose", and P2). This plan edits `agent-runs.service.ts` only at lines 77 to 79. No conflict.

**Parallel with AGL-23** (research gate, no plan). AGL-23 is a gate and waits on AGL-22. Its check "With the setting off, the model request contains no research tools" (unit line 17) must allow the three compile names in the request, as the lists of this section do.

**CEX-20** (milestone gate, draft). `plans/CEX-20.md` names none of the files of section 2 (a grep for those paths finds nothing). It is not in this unit's `parallel_with`.

**AGL-25** (manual eval script, done). Its script under `scripts/eval-agent` runs outside CI. This plan does not change it. A real-model run will see three more tools in the list.

## 6. Open points

1. **An export by an agent run (for the Navigator).** `export_manuscript` leads Compile & export to write `<project>/.scriba/compile-export/exports/<file>` (`export.service.ts` lines 186 to 204; `modules/compile-export.md` lines 41 and 53). `modules/agent-loop.md` line 54 says the only direct writes are to `logs/`, and `units/README.md` line 139 says agent changes to book content become pending changes. An export is neither a `logs/` record nor a pending change. This plan follows unit line 17, where the tool calls the API. AC2 needs an answer: if an agent-started export may not write this file, AC2 cannot pass as written, and the unit has to change.
2. **Export refusals count as invalid calls (for the Navigator).** `ExportService.export` throws `ModuleError` for an empty manuscript (`export.service.ts` lines 158 to 164), an export already running (lines 145 to 151), an invalid template (`templateOf`), and a Pandoc failure (`pandoc-runner.ts` lines 142 to 159). The dispatcher counts every `ModuleError` as an invalid call at path `/path` (`tool-run.ts` lines 190 to 194). The third in a row withdraws the tool for the run (`tool-run.ts` lines 213 to 244, `WITHDRAW_AT` at line 28). This plan lets them propagate unchanged. The options: (a) accept that; (b) AGL-24 waits for AGL-22's `ToolFailure` (`plans/AGL-22.md` P10), which changes this unit's blockers; (c) AGL-24 adds a second non-counting failure class, which repeats AGL-22's change to `tool-types.ts` and `tool-run.ts` and conflicts with it.
3. **"As a card" (for the Navigator).** Unit line 17 says the five checks come back "as a card". The existing tool-call card shows object output as a JSON tree (`tool-call-card.ts` lines 186 to 200; `chat-state.ts` lines 438 to 445). This plan uses that card and changes no web file. A dedicated preflight card would be a Shell change (SHL-10 owns the card) and sits outside this unit. Whether the JSON tree is enough is for the Navigator.
4. **A stop waits for an export (for the Navigator).** `stop()` aborts the run's controller (`agent-run.ts` lines 173 to 180), and the dispatch receives that signal (lines 327 to 330). `ExportService.export` takes no signal, so the handler ignores it. The loop reaches its abort checks only after the call returns (lines 222 to 242, read and not run; assumption A9). The run would then end after the export does. Accept that, or add a signal to the compile-export service, which is a change outside this unit.

## 7. Facts checked and facts assumed

Checked on `main` at e5a0111 by reading. The planner ran no build and no test.

**Unit and module files**

- `units/AGL-24-compile-tools.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9 empty); line 14 (closes `phase:compile-tools`); decisions lines 17 to 20; criteria lines 23 to 25.
- `units/README.md`: line 57 (seam parenthetical), lines 59 to 64 (blocker notation), line 69 (phase gates), lines 117 to 118 (phase rows), lines 131 to 141 (conventions), line 139 (agent writes become pending changes).
- `modules/agent-loop.md`: line 11, line 50 (never calls the Graph runner), line 52 (reserved names), line 54 (only direct writes to `logs/`), lines 61 to 63 (testing; line 63 names the requests the mock receives), line 62 (primary seam), line 74 (out of scope: reorder, snapshot, settings), line 81 (compile tools land at M7).
- `modules/compile-export.md`: line 39 (in-process services), line 41 (export output written with plain `fs`), line 42 (never runs a graph, never calls a model), line 53 (exports folder), line 74 (agent reorder out of scope).
- `plans/DECISIONS.md`: no entry names AGL-24 (grep). Entries used: lines 4280 to 4283 (AGL-10 seam rule), 6392 (web timeouts under load), 6576 to 6581 (CEX-09 merged), 6651 (no Pandoc on the host), 7093 to 7099 (AGL-21 split), 7137 to 7142 (AGL-22 open point), 7152 to 7159 (CEX-15 merged).
- Git: `3c94f37` (AGL-21), `74b107a`, `3f02bfa` (CEX-15) and `abfd1f5` (CEX-14) are ancestors of main. `826fa40` (the AGL-21 branch head) is not.
- Plan status lines (line 3): AGL-08 done; AGL-21 done; AGL-22 draft; AGL-25 done; CEX-09 done; CEX-10 done; CEX-15 done; CEX-20 draft. No plan exists for AGL-23, AGL-24 or AGL-26.

**Shared code (file and line)**

- `apps/api/src/modules/agent-loop/tools/builtin-tools.ts`: line 18 (family comment), lines 125 to 130 (`builtinTools` signature), line 363 (`check_grounding`'s grounding family), lines 407 to 414 (the list; no research or compile tool).
- `apps/api/src/modules/agent-loop/agent-tools.service.ts`: lines 1 to 25 (imports), 27 to 33 (`StartRunOptions`), 37 to 40 (class and fields; `webSearchValidate` on line 40 is AGL-21's), 42 to 60 (constructor; list at 53 to 58; line 59 is AGL-21's), 63 to 112 (`startRun`; the AGL-21 branch at 97 to 106).
- `apps/api/src/modules/agent-loop/agent-runs.service.ts`: lines 77 to 79 (families), line 97 (check-grounding families `['grounding']`), lines 149 to 154 (`startRun` call; `searchEndpoint` on line 153).
- `apps/api/src/modules/agent-loop/agent-loop.module.ts`: lines 2 to 5 (imports), 37 to 42 (`imports` array), line 63 (exports).
- `apps/api/src/modules/agent-loop/tools/tool-types.ts`: lines 17 to 25 (`ToolArgumentError`), 27 to 34 (`ToolSchemaProperty`, no `enum`), 37 to 42 (`ToolArgumentSchema`), 72 to 79 (`ToolDefinition`).
- `apps/api/src/modules/agent-loop/tools/tool-run.ts`: line 28 (`WITHDRAW_AT`), lines 88 to 93 (family filter), lines 190 to 194 (`ModuleError` counted as invalid), lines 195 to 197 (`ToolArgumentError`), lines 213 to 244 (`invalid`).
- `apps/api/src/modules/agent-loop/tools/web-search.ts`: lines 36 to 41 (the AGL-21 definition pattern).
- `apps/api/src/modules/agent-loop/agent-run.ts`: lines 173 to 180 (stop), line 325 (`tool-call-started` with name and family), line 329 (dispatch with the controller's signal), lines 361 to 364 (`tool-call-result` with `callId`, `summary`, `output`), lines 222 to 242 (abort checks).
- `apps/api/src/modules/compile-export/compile-export.module.ts`: lines 2 to 4 (imports), 18 to 22 (entry comment and re-exports), line 26 (`imports`), lines 43 to 48 (exports).
- `apps/api/src/modules/compile-export/export.service.ts`: lines 104 to 118 (`summaryOf`, not exported by the entry), lines 143 to 152 (`export` and busy check), lines 158 to 165 (empty check, view, assembly), lines 186 to 188 (`md` write), lines 190 to 197 (Pandoc), line 204 (`keepOnly` call), lines 329 to 331 (exports folder under `stateDir`), lines 358 to 372 (`keepOnly`), lines 377 to 379 (active project).
- `apps/api/src/modules/compile-export/manuscript.service.ts`: lines 73 to 75 (`view`), lines 92 to 93 (`compose` reads the active project), lines 177 to 178 (`activeProjectId`).
- `apps/api/src/modules/compile-export/preflight.service.ts`: lines 64 to 66 (`run(now)`, active project).
- `apps/api/src/modules/compile-export/assembly.service.ts`: line 92 (the document date comes from `now`).
- Controllers: `export.controller.ts` lines 29 to 35 (POST calls `exports.export(body.format)`); `manuscript.controller.ts` lines 28 to 31 (GET view); `preflight.controller.ts` lines 13 to 17 (POST, no body).
- `apps/api/src/modules/project-store/project-store.service.ts`: lines 126 to 141 (`requireActive`, two `ModuleError`s).
- `packages/contracts/src/agent-loop/constants.ts`: lines 9 to 15 (families; `compile` on line 13), lines 31 to 43 (reserved names; the compile names on lines 40 to 42).
- `packages/contracts/src/compile-export/`: `routes.ts` line 4 (`MANUSCRIPT_ROUTE`) and line 17 (`EXPORT_ROUTE`); `constants.ts` lines 44 to 45 (`EXPORT_FORMATS`, `exportFormatSchema`) and 57 to 63 (`PREFLIGHT_CHECK_IDS`); `export.ts` lines 6 to 8 (`exportRequestSchema`) and 11 to 18 (`exportResultSchema`); `preflight.ts` lines 27 to 39 (check and result shapes); `order.ts` lines 52 to 59 (`manuscriptViewSchema`).
- `apps/web/src/app/features/agent-loop/agent-contract.ts` lines 59 to 65 (`TOOL_FAMILY_VALUES`, which includes `compile`); `apps/web/src/app/shell/tool-call-card.ts` lines 186 to 200 (output section); `chat-state.ts` lines 438 to 445 (`outputOf`).
- `apps/api/src/modules/graph-runner/runs.controller.ts` line 21 (POST start) and line 30 (GET current); `runs.service.ts` lines 325 to 330 (`current()` returns `{ run: ... ?? null }`).
- `apps/api/src/app.module.ts` line 17 (graph-runner import), lines 21 to 29 (`COMPOSED_MODULES`, with `GraphRunnerModule` on line 28 and `CompileExportModule` on line 29).
- `apps/api/test/create-test-app.ts` lines 9 to 15 (options; `modules` replaces `COMPOSED_MODULES` when set).
- `apps/api/test/agent-loop-run.test.ts`: line 44 (`providersSection`), line 64 (`settingsText`), lines 84 to 116 (`openHarness`), line 118 (`post`), line 130 (`startRun`), line 140 (`readUntilEnded`), lines 168 to 170 (`toolNamesOf`, sorted), line 172 (`chatBodies`), line 177 (`toolContents`), line 218 (`observeEvents`), line 275 (`recordsOf`), lines 373 to 380 (research-off list), line 382 (comment), lines 391 to 398 (research-on list).
- `apps/api/test/agent-loop-tools.test.ts` line 35 (`modules: [PlatformModule, AgentLoopModule, kit]`); `agent-loop-tools.kit.ts` line 45 (`enabledFamilies: ['project']`); `agent-loop-grounding.kit.ts` line 59 (`imports: [PlatformModule, AgentLoopModule]`).
- Other test helpers: `agent-loop-diff-preview.test.ts` lines 204 to 209 (`toolCallStep`); `agent-loop-grounding.test.ts` line 37 (`prepare`); `project-store-projects.kit.ts` lines 30 to 60 (`buildProjectsLibrary`); `compile-export-manuscript.kit.ts` line 92 (`storyGraph`, pure); `providers-client.kit.ts` line 61 (`recordsOf`).
- `e2e/fixtures/mock-openai/server.mjs`: line 117 (`turnIndex` matcher), lines 239 to 245 (`GET /__mock/scenarios/<name>/requests`).
- `eslint.config.mjs`: line 50 (R1: a module imports another only through its entry file), line 69 (R2: agent-loop and graph-runner never import each other).
- Exact tool lists in tests: a grep over `apps/api/test` found full offered-list assertions for normal runs only in `agent-loop-run.test.ts` (lines 373 to 380 and 391 to 398). The lists at `agent-loop-tools.test.ts` lines 300 to 301 and 355 to 357 come from the project-only kit (its line 45). `agent-loop-history.test.ts` line 101 and `agent-loop-trim.test.ts` line 77 assert the calls made, not the offered list.

**Assumed, not checked** (each is checked by a named step):

- A1. The exports folder is `book/.scriba/compile-export/exports/`, from `compile-export.md` line 53 and `export.service.ts` lines 329 to 331. Step 4 or 10 confirms it.
- A2. The mock writes one record per chat request, so AC3 expects four records. Step 4 records the count.
- A3. `agent-loop-tools.test.ts` still boots when `AgentLoopModule` pulls in `CompileExportModule` (and so Setup & auth). Step 11 checks it.
- A4. The tool-call card shows the five checks in a readable form. Not run. No criterion depends on the look (open point 3).
- A5. `GET /api/graph-runner/runs/current` answers `{"run":null}` when no run exists. Read from `runs.service.ts` lines 325 to 330, not run. Step 10 checks it.
- A6. No e2e spec or eval case asserts the full offered list. `e2e/specs/journey.e2e.ts` only looks up card names. Partly checked by grep.
- A7. Pandoc is absent on this host. Recorded at DECISIONS line 6651 (CEX-15 run, 2026-11-20). Not re-checked. It matters only for D15.
- A8. The compile services have no request scope, so `AgentToolsService` may inject them. The compile-export module already exports them for this purpose (`compile-export.module.ts` lines 43 to 48). Read, not run.
- A9. The agent loop awaits `runCall` before its next abort check (`agent-run.ts` lines 222 to 242 and 318 to 330). Read, not run. It matters only for open point 4.
