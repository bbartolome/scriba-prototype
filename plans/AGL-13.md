---
id: AGL-13
status: draft
---
# AGL-13 plan — output routing by kind (draft, entity, graph, check); target argument; graph validation

Revision 1, written from main at `18e1c1c`. Unit `units/AGL-13-output-routing.md`: front matter lines 1 to 10, Decisions lines 17 to 24, criteria lines 26 to 29. The unit has no notes; its git history is two consolidation commits (`2fed3f4`, `098add9`). The planner changed no code, ran no test and touched no file except this one. The working tree holds an unrelated change to `units/SAU-12-providers-step.md`, which is not touched.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, earlier plans, DECISIONS and the code on main
- **D1. Target argument.** Only the narrative (registry) tools whose output is `draft`, `entity` or `graph` get an optional `target`. It must sit in the kind's folder (`drafts/`, `entities/`, `graphs/`). Source: unit line 18; module line 54.
- **D2. Draft.** Overlay at `target`, or a new `drafts/<tool-name>-<yyyymmdd-hhmm>.md` (UTC; `-2`, `-3` on collision). The grounding check after it is AGL-17. Source: unit line 19.
- **D3. Entity.** The same rule in `entities/`. Source: unit line 20.
- **D4. Graph.** Validated with the Graph runner's `graphFileSchema`. Valid goes to `graphs/` (default `graphs/<slug-of-name>.json`) as a pending change; invalid gives a readable error and the same retries. Source: unit line 21; `packages/contracts/src/graph-runner/graph.ts` lines 183 to 186.
- **D5. Claims and check.** Claims is a card with a claims artefact (open point 1). Check is a card and no file. Source: unit lines 22 to 23.
- **D6. Provenance.** Draft provenance reaches the pending change through the overlay entry. Source: unit line 24; AGL-09 OP3 (`plans/DECISIONS.md` line 5118; `plans/AGL-09.md` line 201).
- **D7. Flush and counting.** Overlay entries are proposed at run end by AGL-12's flush, unchanged. A refusal the model must fix is a `ToolArgumentError` raised in the handler, so the dispatcher counts it (AGL-02; `tools/tool-run.ts` lines 171 to 173; AGL-12 section 1a D7).
- **D8. Graph file.** The file stem is the graph id and matches `GRAPH_ID_PATTERN` (`packages/contracts/src/graph-runner/constants.ts` line 22; GRR-01 unit line 17). The agent loop imports the contract, never the Graph runner module (`eslint.config.mjs` line 69, R2; module line 50).
- **D9. Test seam.** The composed app with Platform's mock OpenAI server (module lines 60 to 62). The unit has no seam parenthetical.
- **D10. Contracts.** No new event, route, error code or contract field. Tool-call events and transcript kinds keep their shapes.

### 1b. Decisions this plan makes (simplest option)
- **P1. Files.** A new `tools/output-routing.ts` with no Nest import: `routedFolder(kind)`, `stampOf(now)`, `slugOf(name)` and `checkGraph(content)`.
- **P2. Where checks run.** Target checks run in the narrative handler before the executor call; content checks run after it. A refused target never reaches the executor, so the model gets a readable line and no model call is spent.
- **P3. Return, then put.** The handler returns `written: {path, content}` on its result (new optional field on `ToolHandlerResult` and on the `result` outcome). `AgentRun.runCall` puts it into the overlay right after it builds the provenance (`agent-run.ts` line 292). The handler does not put it itself, because provenance is built in `runCall` (AGL-09 PC7).
- **P4. Issues at `/target`.** The dispatcher maps every `ModuleError` to `/path` (`tool-run.ts` lines 166 to 169). The handler therefore turns a `ModuleError` from `targetOf` into a `ToolArgumentError` at `/target`. A non-string target is refused at `/target` too.
- **P5. Target checks.** `targetOf` first (path safety, as AGL-12 P5). Then the resolved `relativePath` must start with `<folder>/` and name a file. A folder gets `FOLDER_MESSAGE`; anything else gets `The target must be a file in <folder>/.`
- **P6. Captured base.** A routed path is captured with `captureOf` before it is put (AGL-12 P3). Without it, an existing target would be proposed against `''` (`agent-run.ts` lines 412 to 417).
- **P7. Size.** Content over the cap is refused at `/content` with `SIZE_MESSAGE`, as `write_file` does (AGL-12 P5(d)).
- **P8. Default names.** `<folder>/<tool-name>-<stamp>.md` for drafts and entities, and `graphs/<slug>.json` for graphs. `stampOf` gives UTC `yyyymmdd-hhmm` from one clock read per call. `-2`, `-3`, ... is added until the path is free: not on disk, and not written earlier in this run (`overlay.contentOf`). Graph suffixes: open point 2.
- **P9. Graph checks.** `JSON.parse`, then `graphFileSchema.safeParse`. A parse failure is one issue at `/graph`. Each Zod issue is one issue at `/graph` plus its path, so the model reads `graph/nodes/0/id: ...`. The target's stem must match `GRAPH_ID_PATTERN`, or the target is refused at `/target`.
- **P10. Slug.** Lower case; each run of characters outside `a-z0-9` becomes one `-`; leading and trailing `-` are removed; `graph` when nothing is left. Open point 3.
- **P11. Schema copy.** For draft, entity and graph tools the schema the model sees is a copy of the registry's `parameters` with an optional `target` (type string, `minLength` 1, one-sentence description). The registry object is not changed (`emit.ts` line 121 sets `additionalProperties: false`). A tool whose own inputs already name `target` gets no routing argument and keeps its input.
- **P12. Stripping.** The handler reads and removes `target` only for the kinds that got the argument, before `filledArguments`. The executor's full Ajv check refuses unknown arguments (`executor.service.ts` lines 118 to 121), so the executor never sees it.
- **P13. Check and claims.** No `target` property and no `written`. Check output already creates no file on main, so AC3 is a regression guard.
- **P14. Tests.** One new file, `apps/api/test/agent-loop-output-routing.test.ts`, with its own helpers (AGL-12 P15 precedent). The check tool comes from a temp pack folder the test writes. The shared fixture packs stay as they are, because other tests compare the offered tools (`agent-loop-narrative.test.ts`).

## 2. Files to change
Paths are relative to the repo root. Nothing outside this table changes.

| Path | Change | Part |
|---|---|---|
| `apps/api/test/agent-loop-output-routing.test.ts` | new: AC1 and AC3 (part 1), AC2 (part 2), helpers | 1, 2 |
| `apps/api/src/modules/agent-loop/tools/output-routing.ts` | new: `routedFolder` and `stampOf` (part 1); `slugOf` and `checkGraph` (part 2) | 1, 2 |
| `apps/api/src/modules/agent-loop/tools/tool-types.ts` | edit: `written?` on `ToolHandlerResult` and on the `result` variant of `ToolOutcome` (P3) | 1 |
| `apps/api/src/modules/agent-loop/tools/tool-run.ts` | edit: `dispatch` copies `written` into the result outcome, one spread beside `citations` (lines 158 to 160) | 1 |
| `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` | edit: export `isFolder`, `isTooLarge`, `FOLDER_MESSAGE` and `SIZE_MESSAGE` (lines 48 to 50, 99 to 107); no behaviour change | 1 |
| `apps/api/src/modules/agent-loop/tools/narrative-tools.ts` | edit: `NarrativeDeps` gains `files`, `store`, `projects`; `narrativeDefinition` gains `kind`; the handler routes (P2 to P12) | 1, 2 |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | edit: `store` and `projects` become private fields (lines 44 to 45); `startRun` passes them and the kind; the schema copy (P11) | 1, 2 |
| `apps/api/src/modules/agent-loop/agent-run.ts` | edit: `runCall` puts `written` into the overlay right after the provenance is built (after line 292) | 1 |

Not changed: contracts; `flushWrites` and `baseFor` (AGL-12); `write_file` and `edit_file`; transcript kinds; the web app; `e2e/`; `units/`; `modules/`; every plan except this one.

## 3. Procedure
Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/AGL-13`, in a worktree created from `main`. Record `node -v` and `npm -v` beside each result (Node 26). Do not push. Commit by explicit paths.

Part 1 (steps 1 to 7)
1. Preconditions. `git worktree add -b unit/AGL-13 <path> main`, then `npm ci` in the worktree. Expected: both exit 0, and `git -C <path> status --short` prints nothing (the unrelated SAU-12 change is not in the worktree).
2. Red tests. Write `apps/api/test/agent-loop-output-routing.test.ts` with the helpers of section 4 and the AC1 and AC3 tests. Run `npx vitest run test/agent-loop-output-routing.test.ts` in `apps/api`. Expected: AC1 fails; AC3 passes (guard). Commit the file alone: `test(AGL-13): add the draft-routing test (AC1) and the check guard (AC3)`.
3. Outcome plumbing. Edit `tool-types.ts` and `tool-run.ts` (P3). Expected: `npm run build -w @bbartolome/scriba-api` exits 0, and `agent-loop-tools.test.ts` still passes.
4. Helpers. Create `tools/output-routing.ts` with `routedFolder` (draft to `drafts`, entity to `entities`, other kinds undefined) and `stampOf` (P8). Expected: `grep -n "@nestjs"` on the file prints nothing.
5. Builtin exports. Export `isFolder`, `isTooLarge`, `FOLDER_MESSAGE` and `SIZE_MESSAGE` from `builtin-tools.ts`. Expected: the diff adds `export` keywords only, and `agent-loop-writes.test.ts` passes.
6. Narrative handler. Edit `narrative-tools.ts` for draft and entity kinds (P2 to P12): read and remove `target` after line 145; before the executor, the target checks (P4, P5); after it, the size check (P7), the default name with its suffix (P8), the capture (P6), and the `written` return. Expected: `grep -n "written" narrative-tools.ts` shows the return.
7. Wiring and check. Edit `agent-tools.service.ts` (private fields, the deps, `kind` from `this.catalog.entry(name).spec.output`, and the schema copy for draft and entity) and `agent-run.ts` (the put, P3). Run `npx vitest run test/agent-loop-output-routing.test.ts test/agent-loop-tools.test.ts test/agent-loop-narrative.test.ts test/agent-loop-writes.test.ts test/agent-loop-run.test.ts` in `apps/api`. Expected: exit 0, with AC1 and AC3 passing. Mutations, each restored with `git checkout -- <file>` after the source commit: M1, the folder check removed, makes AC1 fail; M2, `target` not stripped, makes AC1 fail (the valid-target call is refused by the executor). Commit: `feat(AGL-13): route draft and entity outputs through the overlay`.

Part 2 (steps 8 to 12)
8. Red test. Add the AC2 test. Run the file. Expected: AC2 fails (no pending change under `graphs/`). Commit: `test(AGL-13): add the propose-graph test (AC2)`.
9. Graph helpers. Add `slugOf` and `checkGraph` (P9, P10) to `output-routing.ts`, and make `routedFolder` return `graphs` for graph. Expected: `checkGraph` on the invalid fixture returns one issue at `/graph/nodes/0/id`.
10. Graph branch. In `narrative-tools.ts`, for the graph kind: the target checks with folder `graphs` and the stem rule (P9); after the executor, `checkGraph` with its issues raised as a `ToolArgumentError`; then the default `graphs/<slug>.json` with the suffix (P8), the capture (P6) and `written`. In `agent-tools.service.ts`, add the schema copy for graph. Expected: the file's AC1, AC2 and AC3 tests pass after step 11.
11. Mutations and commit. M3, `checkGraph` skipped: AC2 fails. M4, `written` returned for a check output: AC3 fails. Restore each with `git checkout -- <file>`. Then commit: `feat(AGL-13): validate proposed graphs against the graph file schema`.
12. Gates and record. `npm test -w @bbartolome/scriba-api` exits 0. `npm run lint` at the root exits 0 (boundaries R1 and R2 hold). `npx prettier --check` on the changed files exits 0. `git diff --stat main...HEAD` lists exactly the section 2 paths. Record the Node and npm versions and each command's output.

## 4. Acceptance criteria and tests
One test per criterion, all in `apps/api/test/agent-loop-output-routing.test.ts`. The criteria text is quoted from `units/AGL-13-output-routing.md` lines 27 to 29. This plan marks nothing passed.

Shared setup: a temp library from `buildProjectsLibrary` with `book` active, and a `providers` section that points at the mock (the pattern of `agent-loop-narrative.test.ts` lines 78 to 87; AGL-12 plan section 4). Each test writes its own scenario folder for the mock, and removes its temp folders and its app. The mock returns the first matching step and never consumes steps (`e2e/fixtures/mock-openai/server.mjs` lines 133 to 135). So the executor steps (matched by `lastMessageContent`) come first: an executor request has no assistant message and would also match `turnIndex: 0`. The agent turns follow, from the most specific to the least.

### AC1: "A `draft` output with no target lands at the generated path; a target outside `drafts/` is refused readably."
Test name: `AC1: a draft output with no target lands at the generated path; a target outside drafts/ is refused readably`. Uses the fixture tool `cold_open` (`apps/api/test/fixtures/packs`, through `SCRIBA_PACKS_DIR` as in `agent-loop-narrative.test.ts` line 145).
Scenario `routing-draft`: an executor step for `Core idea: Engines reward patience`. Agent turn 0 calls `cold_open` with `target: "sources/outline.md"`. Turn 1 calls it with no target. Turn 2 calls it with `target: "drafts/chapter-one.md"`. A final text step after the tool results.
Assertions: turn 0 answers `tool-call-error` with attempt 1, and its message contains `target` and `drafts/`. The mock received exactly two executor requests (none for the refused call). The turn 1 draft is a pending change with `targetPath` matching `^drafts/cold_open-\d{8}-\d{4}\.md$` and `provenance.tool` `cold_open`. Turn 2 answers `tool-call-result` (so the executor saw no `target`), and its pending change has `targetPath` `drafts/chapter-one.md`. `run-ended` lists the two ids in order. `sources/outline.md` is unchanged on disk.

### AC2: "Propose-graph output becomes a pending change aimed at `graphs/` that parses with the Graph runner schema; an invalid graph returns a readable error and is retried."
Test name: `AC2: a proposed graph becomes a pending change under graphs/ that parses with the graph schema; an invalid one gets a readable error and is retried`. Uses the real packs (`PACKS_ROOT` as in `agent-loop-workhorses.test.ts` line 40) and the tool `propose_graph` (`packages/packs/core/tools/propose_graph.yaml`: `output: graph` at line 36).
Scenario `routing-graph`: an executor step for `Intent: first sketch` returns a story graph whose node id is `a.b`. An executor step for `Intent: second sketch` returns a valid story graph named `Ada and the engine` (node `ada`, no edges). Agent turn 0 calls `propose_graph` with intent `first sketch`, view `story` and `includeCatalogue` false. Turn 1 makes the same call with `second sketch`. A final text step follows. The agent's own intent text must not contain either `Intent:` string.
Assertions: turn 0 answers `tool-call-error` whose message contains `graph/nodes/0/id`. The turn 1 request the mock recorded holds that text in a tool message. Turn 1 answers `tool-call-result`. Exactly one pending change exists, with `targetPath` `graphs/ada-and-the-engine.json` and kind `create`, and `graphFileSchema.parse(JSON.parse(proposed))` succeeds (`graphFileSchema` imported from `@bbartolome/scriba-contracts/graph-runner`).

### AC3: "`check` output creates no file."
Test name: `AC3: a check output creates no file`. A temp pack folder holds the test-only tool `check_draft` (`output: check`, one text input `text`, prompt `Check this text: {{text}}`), used as `SCRIBA_PACKS_DIR`.
Scenario `routing-check`: an executor step for `Check this text: Draft text` returns `No findings.`. Agent turn 0 calls `check_draft` with `{"text":"Draft text"}`. A final text step follows.
Assertions: the card's output is `kind: 'check'` with content `No findings.`. The pending list is empty. The project folder, excluding `logs/`, has the same file names and bytes before and after the run.

## 5. Downstream and parallel agreement
- **AGL-12 (done).** AGL-13 calls `WriteOverlay.put(path, content, callId, provenance)`, as AGL-12 section 1b P13 and section 5 (line 176) expect. `flushWrites` and `baseFor` are unchanged.
- **AGL-09 (done).** Provenance and citations are built in `runCall` (`agent-run.ts` lines 256 to 292). This plan only adds the put after them (`plans/AGL-09.md` line 182; OP3 at line 201).
- **AGL-15 (gate, unit line 20).** Its "propose-graph valid/invalid handling" is AC2 here. AGL-15 adds only the e2e accept step.
- **AGL-17 (after AGL-13; unit line 18).** It reads the overlay's `drafts/` entries and their provenance, which this plan creates. It adds its grounding summary to the flush input (`plans/AGL-12.md` line 180). Nothing in `flushWrites` changes here.
- **AGL-16 (parallel; unit lines 21 to 22).** It hashes a draft's overlay content, which this plan keeps as it is. The claims artefact is open point 1.
- **AGL-14 (parallel; unit lines 7 and 15).** Its narrative `diffPreview` needs the routed path and base. This plan provides `written`, and the captured base is in `overlay.baseOf`. Both units touch `runCall`: AGL-14 edits the event data, and this plan adds one put after the provenance. Either order merges by hand. Open point 6.
- **GRR-01 (done).** `graphFileSchema` and `GRAPH_ID_PATTERN` (section 1a D4, D8). **GRR-06 (not merged; unit line 26)** registers the same schema at propose time. Because it is the same schema, the two checks agree, and this plan needs no change for it.
- **GNP-04 (done; `plans/GNP-04.md` line 200).** Its `graph` output is the JSON text with its fence removed (`executor.service.ts` lines 208 to 215). AGL-13 validates that text.
- **TRG-01 (done; `plans/TRG-01.md` line 101).** The function schema's `parameters` is loose, so the `target` copy is allowed.

## 6. Open points
1. **Claims artefact (unit line 22).** The `claims` output is one claim per line (`executor.service.ts` lines 35 to 36). It has no verdict, span, content hash or run id, so it cannot be the grounding-result shape (`packages/contracts/src/agent-loop/grounding.ts` lines 33 to 40). Default here: a card only (the output rides the `tool-call-result`), with no artefact. The unit does not settle it. AGL-16 owns `logs/grounding/`, and CEX-06 reads it. Navigator decision.
2. **Graph default name collisions.** The unit gives a suffix rule for drafts and entities, but none for graphs. Default here: `-2`, `-3` as for drafts, so a default name never proposes a change to an existing graph. Affects GRR-02 (its create gives unique ids).
3. **Graph slug rule.** GRR-01 (line 17) and GRR-02 (line 20) say "slug from the name" and give no rule. Default: P10. GRR-02 must use the same rule, or one name gives two ids.
4. **Entity routing has no criterion.** No test covers it, because the rule is one test per criterion. The entity output is not checked, since the unit names no check. Navigator: add a test or a check.
5. **Collisions across runs.** The suffix check sees the disk and this run only. PST-15 folds same-run changes only (`plans/PST-15.md` decision 9, line 21), so an open change from an earlier run can share a generated path. Left to the review queue (PST-20).
6. **AGL-14 and the routed path.** AGL-14 has no blocker on AGL-13 (unit line 7). If AGL-14 merges first, its narrative diff previews cannot carry a path. The orchestrator orders them or adds the blocker.

## 7. Facts checked
Read-only commands only (`cat`, `grep`, `sed`, `ls`, `git log`, `git status`). No file changed, no test run.
- Unit `units/AGL-13-output-routing.md`: front matter lines 1 to 10; Decisions 17 to 24; criteria 26 to 29; no notes. `git log` shows `2fed3f4` and `098add9` only.
- `tools/write-overlay.ts`: class 15; `contentOf` 35 to 37; `put` 40 to 49 (provenance optional); `entriesInOrder` 52 to 54.
- `tools/tool-run.ts`: `overlay` 69; `dispatch` 112 to 186; result outcome 150 to 162; `ModuleError` to `/path` 166 to 169; `ToolArgumentError` 171 to 173; `invalid()` counts and withdraws 189 to 220.
- `tools/tool-types.ts`: `ToolArgumentError` 17 to 25; `ToolHandlerResult` 56 to 62; `NarrativeToolDefinition` 75 to 81; `ToolOutcome` 96 to 104.
- `tools/builtin-tools.ts`: `FOLDER_MESSAGE` 48 to 49; `SIZE_MESSAGE` 50; `targetOf` 67 to 79; `captureOf` 83 to 96; `isFolder` 99 to 103; `isTooLarge` 105 to 107; `readFile` overlay first 177 to 184; `writeFile` 197 to 239; `editFile` captures before the match (272).
- `tools/narrative-tools.ts`: `refusalOf` 111 to 128; `NarrativeDeps` 35 to 38; `narrativeDefinition` 132 to 203 (schema 143, handler 144, `filledArguments` 145, executor 188 to 192, return 196 to 201).
- `agent-tools.service.ts`: constructor 38 to 55 (`store` 44, `projects` 45, `builtinTools` 49); `startRun` 58 to 91; narrative loop 70 to 85; `entry(name)` 76; `narrativeDefinition` call 78 to 84.
- `agent-run.ts`: `AgentRunDeps` 50 to 58; `tools` 120; `provenanceOf` 256 to 273 (draft only); `runCall` 277 to 351 (dispatch 283 to 286, provenance 289 to 292, extras 293 to 298); `finish` 356 to 372 (`pendingChangeIds` 367); `flushWrites` 376 to 407; `baseFor` 412 to 418.
- Registry: `executor.service.ts` `OUTPUT_SYSTEM_MESSAGES` 30 to 40 (claims 35 to 36, graph 37), `execute` 72, `catalog.validate` 118 to 121, graph fence `finish` 208 to 215. `catalog.service.ts` `entry` 303, `functions` 320 to 334. `emit.ts` `additionalProperties: false` 121. `packs.ts` 277 (a missing folder gives no tools). `tool-registry/constants.ts` `OUTPUT_KINDS` 17.
- Contracts: `graph-runner/graph.ts` `graphFileShapeSchema` 174 to 177, `graphFileSchema` 183 to 186; `graph-runner/constants.ts` `GRAPH_ID_PATTERN` 22; `project-store/pending.ts` `proposeInputSchema` 75 to 83 (`provenance` is a loose object); `agent-loop/grounding.ts` 33 to 40.
- PST-15 code: `pending.service.ts` `sameOrigin` 70, `registerValidator` 94, `propose` 325, validators run 357 to 361, fold 376 to 381. `plans/PST-15.md` decisions 9 (line 21) and 10 (line 22).
- Packs: `packages/packs/core/tools/propose_graph.yaml` `output: graph` (36), `enabled: true` (37). `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` `output: draft` (48). The fixture packs have no `check` or `claims` tool.
- Tests: `agent-loop-narrative.test.ts` `SCRIBA_PACKS_DIR` 145, `draftSteps` 230 to 247, `runDraft` 260 to 266; `agent-loop-workhorses.test.ts` `PACKS_ROOT` 40; `agent-loop-tools.test.ts` `toEqual` on dispatch results 140 and 182.
- Mock: `e2e/fixtures/mock-openai/server.mjs` match cases 117 to 126 (`turnIndex` counts assistant messages); `findStepIndex` 133 to 135 (first match, no consumption).
- Boundaries: `eslint.config.mjs` R1 line 50 (an API module imports another only through its entry file); R2 line 69 (agent-loop and graph-runner never import each other).
- Units and modules: `units/AGL-14-diff-previews-review-link.md` lines 7 and 15; `units/AGL-15-pending-writes-gate.md` line 20; `units/AGL-16-grounding-engine.md` lines 21 to 22; `units/AGL-17-grounding-wiring.md` line 18; `units/GRR-01-contract-slice.md` line 17; `units/GRR-02-graph-crud.md` line 20; `units/GRR-06-output-nodes-pending-changes.md` line 26; `modules/agent-loop.md` lines 29, 45, 50, 52, 54, 80; `plans/QUEUE.md` line 4 (AGL-13 ready).
- Plans: `plans/AGL-12.md` section 1b P3, P5, P10, P11, P13 (line 53), P15; section 5 lines 176 to 182; `plans/AGL-09.md` lines 182 and 201; `plans/GNP-04.md` line 200; `plans/TRG-01.md` line 101; `plans/DECISIONS.md` line 5118 (AGL-09 OP3).
- Absence: `apps/api/src/modules` has no graph-runner module; the only `registerValidator` is its definition (`pending.service.ts` line 94).

## 8. Assumed
- The composed app, the mock and the packs load in this environment with Node 26 (not run).
- `buildProjectsLibrary` gives `book` the folders the tests write to (`drafts/`, `graphs/`). Not checked.
- A run started with `{intent}` alone has the narrative family enabled, as the narrative tests assume (`agent-loop-narrative.test.ts` lines 260 to 266). The start route was not read.
- The Zod issue paths from `graphFileSchema` are arrays of keys and indexes, as the pointer rule in P9 needs. The test in step 9 checks this; the planner did not.
- The `check_draft` YAML the test writes passes the registry's loader and lint, modelled on `cold_open.yaml`.
- Lint rules R1 and R2 accept the `@bbartolome/scriba-contracts/graph-runner` import, since the package is external to the API modules. Step 12 checks this.
- AGL-14 and AGL-16 have no plan on main (`ls plans/`), so their final file changes are taken from their unit files only.

## 9. Review parts
Two parts.
- **Part 1 (steps 1 to 7), tests AC1 and AC3.** Draft and entity routing, the target argument, the readable refusals, the `written` plumbing and the check guard. M1 and M2 are in step 7.
- **Part 2 (steps 8 to 12), test AC2.** Graph validation, the graph name and default path, mutations M3 and M4 (step 11), and the final gates and record (step 12).
Each step and each test is in exactly one part.
