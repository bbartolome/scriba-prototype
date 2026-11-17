---
id: GRR-06
status: draft
---
# GRR-06 plan — output nodes: pending changes with target precedence, captured base, origin, provenance and the graphs/ validator

Unit: GRR-06 (module graph-runner, phase:engine, M4). `units/GRR-06-output-nodes-pending-changes.md`: front matter lines 7 to 9 (`blocked_by` names GRR-04 and PST-15, with PST-22 as the gate; `parallel_with` GRR-05 and GRR-07; `unblocks` GRR-08 and GRR-13). Why line 15, Decisions lines 18 to 26, criteria lines 29 to 33. Drafted against main `081c35d` (GRR-05 is merged: `1a2416b`, `733f8d5`). Nothing was built, installed, run, committed or changed except this file. Tags: **checked** means read or grepped on main in this session; **assumed** means not checked here (section 7b).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contract and the done plans

- **D1 Who writes.** Only output nodes create pending changes; nothing a run produces touches files until the author accepts it. The write path is the Project store's in-process `propose`. Source: unit line 18 and line 25; module overview paragraph; PST-15 decision 1.
- **D2 Kind decides folder and extension.** The output kind of the tool wired into the output node (`catalog.ports(tool).output.kind`) decides the target: `draft` is a Markdown file in `drafts/`; `entity` is a Markdown file in `entities/`; `graph` is a JSON file in `graphs/`; `claims` and `check` are not writable (validation error, GRR-03). Source: unit lines 19 to 22; GRR-03 plan S15 and its table rows `output-kind-unwritable` (error, lines 101 to 103); `tool-registry/constants.ts` `OUTPUT_KINDS` (lines 16 to 23).
- **D3 Target precedence and folder check.** `targets[nodeId]`, then `params.path`, then the generated `<folder>/<graph-id>-<yyyymmdd-hhmm>.<ext>`. A target outside its kind's folder is `GRAPH_TARGET_INVALID`, checked before work starts. Source: unit line 23; module line 43 (the code); GRR-04 plan P3, which assigns the folder check to GRR-06.
- **D4 Captured base.** A target equal to a text input's file reference takes the run-start content as its base. Otherwise an existing target is read when the change is created, and a missing target is a create. Source: unit line 24; GRR-04 plan P5 and S7; PST-15 decisions 7 and 8 and its section 6 (GRR-06 entry).
- **D5 Propose.** The call is `PendingService.propose` with path, content, base (when D4 gives one), origin `{kind: 'recipe-run', runId, graphId, nodeId}` and provenance `{graphId, nodeId, entityIds, sourcesUsed}`, where the id lists are unions over every tool node upstream of the output node. The output node's result is `{pendingChangeId, path}`, and the ids go to the run state. Source: unit line 25; `project-store/pending.ts` (origin lines 5 to 17, `proposeInputSchema` lines 75 to 83, `provenance` passed through); `graph-runner/runs.ts` `outputNodeResultSchema` (lines 71 to 75), `nodeResultSchema` (lines 78 to 82), `runStateSchema.pendingChangeIds` (line 105).
- **D6 Validator.** The graph schema is the Project store's validator for `graphs/*.json`, so a proposed invalid graph is refused at propose time. Source: unit line 26; PST-15 decision 11 (pattern grammar, all matching validators run, first failure refuses); `graphFileSchema` is the schema every consumer uses (GRR-01 plan C2, line 81).
- **D7 Stop rules that GRR-06 must respect.** No pending change is created after a stop is received; a stop never removes a pending change that already exists; no `await` may sit between a stop check and a propose call. Source: GRR-05 plan section 6 (GRR-06 entry, both orders); GRR-05 unit line 19 (D2).
- **D8 Constraint from GRR-05 (merged).** `apps/api/test/graph-runner-stop.test.ts` stays unchanged and keeps passing. Its C2 step 8 (the pending list is empty after a stop during an output-bearing chain) must keep holding. Source: GRR-05 plan section 3 (test file), section 5 (C2 step 8), section 7 point 1.
- **D9 Failing output node.** A propose refusal in an output node follows the engine's fail-fast rule (GRR-05 unit line 18): the node becomes `error` with the error's code and message, queued nodes become `stopped`, the run ends `error`. Source: `runs.service.ts` lines 344 to 357 on main.
- **D10 Boundaries.** graph-runner imports another module only through its entry file, and never imports the Agent loop. Source: GRR-03 plan S12 (eslint R1 and R2); module, Cross-cutting decisions ("It never calls the Agent loop").
- **D11 Codes.** `GRAPH_TARGET_INVALID` (422) is already in the contract. No new contract code is added. Source: module line 43; GRR-01 plan line 239.
- **D12 Test seams.** External behaviour only (module lines 49 to 51; `units/README.md` line 139). In-process `propose` is reached through a test-only kit module, as PST-15 decision 20 and `project-store-pending.kit.ts` do.

### 1b. Choices this plan makes (names, layout, rule details)

- **P1 Files.** A new pure file `output-targets.ts` holds the folder and extension rule (P3) and the generated name (P5). All other changes are in `runs.service.ts` and in the new test files. No contract file changes.
- **P2 Validator registration in the constructor.** `RunsService` takes `PendingService` as a new last constructor parameter. `PendingService` is exported by the project-store entry file (`project-store.module.ts` line 30), provided at line 66 and exported at line 77. The constructor registers once, next to the existing switch hook (`runs.service.ts` line 142): `this.pending.registerValidator('graphs/*.json', (content) => graphFileSchema.safeParse(JSON.parse(content)).success)`. A parse error throws inside the check, and `PendingService` counts a throw as a failure (`pending.service.ts` `checkContent`, lines 407 to 438).
- **P3 Folder and extension rule.** A path fits a writable kind when all of these hold. It splits on `/`. Its first segment is the kind's folder (`drafts`, `entities`, `graphs`). No segment is empty, `.` or `..`. Its last segment ends with the kind's extension (`.md` for draft and entity, `.json` for graph) and has at least one character before the extension. `drafts` and `graphs` accept exactly two segments (top level). `entities` accepts any depth. Reasons: the unit says "top level of `drafts/`", "in `entities/`", "in `graphs/`" (lines 19 to 21); the entity manifest walks `entities/` recursively (`entity-manifest.ts` `walk` and `collect`, lines 222 to 260); the validator pattern `graphs/*.json` matches only top-level files (PST-15 decision 11), and AGL-13 plan line 107 says every routed graph path is `graphs/<id>.json`. The extension rule is needed, because without it a `graph` output could target `graphs/x.md`, which the validator does not match, and skip the schema check.
- **P4 Effective targets are fixed at start.** In `start()`, after `scopeOf` and `orderOf` (`runs.service.ts` lines 170 and 171) and before the input loop (line 173), each in-scope output node gets its effective target: `body.targets[id]`, else `node.params.path`, else the generated name (P5). A target that fails P3 for the node's kind is `GRAPH_TARGET_INVALID` (422, before any read, mock call or registration). The kind comes from the one tool wired into the node's `in` port. Out-of-scope output nodes are not checked, because they produce nothing. The results are kept in `RunRecord.outputTargets`. This keeps GRR-04's refusal order (P2 step 4 before the inputs and before the active-run check).
- **P5 Generated name.** `<graphId>-<yyyymmdd-hhmm>` from the run's start instant in UTC (the `now` of `start()`, the same instant as `state.startedAt`), then the kind's extension. Collisions are open point 1.
- **P6 Captured base match.** A captured file (`RunRecord.files`, keyed by input node id) matches an output target when `CapturedFile.path === target`. `CapturedFile.path` is the normalized `relativePath` that `FilesService.read` returns (`files.service.ts` line 268). P3 accepts only paths with no empty, `.` or `..` segment, so equal strings name the same file. The base is `{content: captured.content}`. No match means no base, so propose reads the disk.
- **P7 Output text.** The text of a output node is the feeding tool's `output.content`. The executor's `finish()` strips a code fence for `graph` and does no JSON check (`executor.service.ts` lines 208 to 215), so an invalid graph reaches propose and is refused there.
- **P8 Code of a refused graph output.** A refused propose keeps its own code and message through `failureOf` (`runs.service.ts` lines 120 to 125): `PROJECT_VALIDATION_FAILED` (422) with "The proposed content does not pass the check for that file." No `GRAPH_` code is added. Criterion 4 names no code.
- **P9 Provenance.** `scopeOf(recipe, outputId)` (`run-scope.ts` line 11) gives the output node and its upstream nodes. The tool nodes among them, in run order, contribute. `entityIds` is the id list the tool step resolved (the `ids` of `toolStep`, style ids included), kept per tool node in `RunRecord.entityIds`. `sourcesUsed` is that tool result's `sourcesUsed` (the executor's unique non-style entity ids, `executor.service.ts` lines 149 to 151 and 98 to 101). Both lists are unions without duplicates.
- **P10 Output branch.** The engine's `else` branch (`runs.service.ts` lines 340 to 343) becomes two branches. The input branch is unchanged. The output branch does, in order: (1) if `record.stopReason` is set, `endStopped(record)` and return; (2) `proposeOutput`; (3) `record.state.pendingChangeIds.push(change.id)`; (4) `setStatus(record, id, 'done', {result: {pendingChangeId, path}})`. Step (1) cannot be reached in a test, because no `await` separates it from the previous check. It is written only so that the GRR-05 rule does not depend on that fact.
- **P11 Origin.** `{kind: 'recipe-run', runId: state.runId, graphId: state.graphId, nodeId: outputId}`.
- **P12 Test seam.** `apps/api/test/graph-runner-output.kit.ts` (new) holds fixtures and helpers, plus `graphOutputKitModule()`. That module imports `PlatformModule`, `ProjectStoreModule` and `GraphRunnerModule`, and has one controller at `api/graph-runner-test` with `POST propose`, which passes the body to `PendingService.propose`. It follows `project-store-pending.kit.ts` lines 22 to 40. C5 boots its own app with `createTestApp({modules: [graphOutputKitModule()]})`. `TestAppOptions.modules` replaces the composed modules (`create-test-app.ts` lines 9 to 13).
- **P13 One part.** The target rule, the output branch, the provenance and the validator share one `RunRecord` and one engine branch, so none can be reviewed without the others (same reasoning as GRR-05 section 8).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/graph-runner/output-targets.ts` | new | Pure functions: `fitsKindFolder(kind, path)` (P3) and `generatedTarget(kind, graphId, now)` (P5). Imports no Nest code and no other module |
| `apps/api/src/modules/graph-runner/runs.service.ts` | edit | (a) Imports: `graphFileSchema` as a value from `@bbartolome/scriba-contracts/graph-runner`; `PendingService` from `../project-store/project-store.module`; the pending types from `@bbartolome/scriba-contracts/project-store`; `fitsKindFolder` and `generatedTarget` from `./output-targets`. (b) `MESSAGES.OUTPUT_PATH_INVALID` (new text: "An output path must sit in the folder of its output kind, with that kind's extension."). (c) `RunRecord`: `outputTargets: Map<string, string>` and `entityIds: Map<string, string[]>`. (d) Constructor: `private readonly pending: PendingService` as the last parameter, and the validator registration (P2). (e) `start()`: `const now = new Date()`; the effective targets (P4); `startedAt` from `now`; both maps in the record. (f) `toolStep`: `record.entityIds.set(node.id, ids)` after the entity resolution succeeds. (g) `engine`: the output branch (P10). (h) New private methods `outputTargetsOf`, `kindOfOutput`, `proposeOutput`, `provenanceOf` |
| `apps/api/test/graph-runner-output.kit.ts` | new | Exports: `GR_GRAPH_YAML` (tool `gr_graph`, `output: graph`, the shape of `GR_TEXT_YAML` in `graph-runner-run.kit.ts` lines 47 to 68); `GR_PERSON_YAML` (tool `gr_person`: the text that `toolYaml('gr_person', {entity: true})` of `graph-runner-validation.test.ts` lines 70 to 110 produces, copied as text); `ENTITY_ADA` (`---\ntype: person\n---\n# Ada\n`, written to `book/entities/ada.md`); local recipe builders (`textInput`, `entityInput`, `toolNode`, `outputNode`, `recipe`, copies, because the GRR-04 kit keeps its builders private); `graphOutputKitModule()` (P12) |
| `apps/api/test/graph-runner-output.test.ts` | new | Tests C1 to C5 and the extra X1 (section 4) |
| `plans/GRR-06.md` | new | This plan. The orchestrator commits it |

Not changed, on purpose:

- `graph-runner.module.ts`: `RunsService` is already provided, `ProjectStoreModule` is already imported, and the module exports nothing.
- `runs.controller.ts`: no route is added.
- `graph-runner.service.ts`, `run-scope.ts`, `graph-validation.ts`, `graph-validator.service.ts`.
- `packages/contracts/**`: every name used here already exists (`outputNodeResultSchema`, `pendingChangeIds`, `graphFileSchema`, `GRAPH_TARGET_INVALID`, the pending origin and provenance).
- `apps/api/src/modules/project-store/**` and `tool-registry/**` (read only; PST-15 and PST-16 are merged and stay as they are).
- `apps/api/test/invariant-sweep.ts`: no route of the composed app is added, and the C5 route sits in a kit module that the composed app does not contain.
- `apps/api/test/graph-runner-run.kit.ts`, `graph-runner-run.test.ts` and `graph-runner-stop.test.ts`: GRR-04's and GRR-05's files stay as merged (D8).
- `units/`, `modules/`, `plans/DECISIONS.md`, `plans/QUEUE.md`.

GRR-07 is parallel and has no plan. Its unit names no file. The shared lines in `runs.service.ts` are the constructor, the engine's output branch, `setStatus` and `finish`; section 5 gives the merge notes.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GRR-06`, created from `main` (which contains GRR-05). Record `node -v` and `npm -v` beside each result. Do not push. The implementer commits only the paths of section 2, by name.

0. **Preconditions.** `git status --short` prints nothing. `git branch --list 'unit/GRR-06'` prints nothing. `test -f apps/api/test/graph-runner-stop.test.ts` exits 0. `grep -c "RUN_STOP_ROUTE" apps/api/src/modules/graph-runner/runs.controller.ts` prints `1`. `ls plans/GRR-06.md` before this write found no file, so this is the first plan of the unit. Expected: as stated.
1. **Runtime and baseline.** `node -v` prints `v26.x`. `npm run build -w @bbartolome/scriba-contracts` exits 0. `npm test -w @bbartolome/scriba-api` exits 0. Record the file and test counts as the starting count (A1, A2).
2. **Branch.** `git switch -c unit/GRR-06` on a clean tree. Expected: `Switched to a new branch 'unit/GRR-06'`.
3. **Pure rules.** Write `output-targets.ts` (P3, P5). Expected: `grep -n "@nestjs\|project-store\|tool-registry\|platform" apps/api/src/modules/graph-runner/output-targets.ts` prints nothing.
4. **Kit.** Write `graph-runner-output.kit.ts` (P12, fixtures, builders and `graphOutputKitModule()`). Expected: `grep -n -i "examples" apps/api/test/graph-runner-output.kit.ts` prints nothing.
5. **Tests first.** Write `graph-runner-output.test.ts` with X1 and C1 to C5 (section 4). Expected: six test names, each starting `run outputs, `.
6. **Format.** `npx prettier --write` on the three new files. Expected: exit 0.
7. **Red run.** `npm test -w @bbartolome/scriba-api -- graph-runner-output`. Expected: all six tests fail. If any test passes on main, stop and report before editing, because the main code then differs from D1, D4 or D9 as this plan reads it.
8. **Validator.** In `runs.service.ts`, add the `PendingService` constructor parameter and the `registerValidator` call (P2). Expected: C5 passes; the other five still fail. This is the first green step, and it shows that the kit and the registration work.
9. **Start.** In `runs.service.ts`, `start()`: `now`, `outputTargetsOf` (P4), the two record maps, the `startedAt` from `now`. Expected: the refusal part of C3 is reached and passes; C3 still fails at its precedence part, which needs step 10. C1, C2, C4 and X1 still fail.
10. **Engine.** In `runs.service.ts`: the `toolStep` entity ids (f), the output branch (P10), `kindOfOutput`, `proposeOutput`, `provenanceOf` and the message. Expected: `grep -c "abort()" apps/api/src/modules/graph-runner/runs.service.ts` prints `1`, the GRR-05 call of `requestEnd` only, so no new abort was added.
11. **Green.** `npm test -w @bbartolome/scriba-api -- graph-runner-output`. Expected: exit 0, six of six pass.
12. **Regressions.** `npm test -w @bbartolome/scriba-api -- graph-runner-stop graph-runner-run graph-runner-graph-crud graph-runner-validation invariant-get-head invariant-mutation-guard token-guard-gate` exits 0. Then `npm test -w @bbartolome/scriba-api` exits 0, with the file and test counts of step 1 plus one file and six tests. Then `git diff --quiet main -- apps/api/test/graph-runner-stop.test.ts` exits 0 (D8).
13. **Mutation evidence (not committed).** Before each change, copy the file to `/tmp/grr06-mut/`; make the change; run `npm test -w @bbartolome/scriba-api -- graph-runner-output`; restore from the copy; `cmp` against the copy. M1, `fitsKindFolder` returns true for every path: C3 fails. M2, `outputTargetsOf` reads `params.path` before `targets`: C3 fails. M3, the base match always gives no base: C2 fails. M4, `provenanceOf` gives an empty `entityIds`: C1 fails. M5, remove the `registerValidator` call: C4 and C5 fail. M6, the output branch sets `done` without `proposeOutput`: C1 fails.
14. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Each exits 0. The lint ends with `All matched files use Prettier code style!`.
15. **Commit.** `git add` each path of section 2 by name, then `git commit -m "feat(GRR-06): output nodes create pending changes, with target precedence, captured base, origin, provenance and the graphs/ validator"`. Do not push.
16. **Record.** Node and npm versions; the exit codes and counts of steps 1, 7, 8, 11, 12, 13 and 14. Report, and stop.

## 4. Acceptance criteria and tests

The file is `apps/api/test/graph-runner-output.test.ts`. Test names start `run outputs, C<n>:`. One test per criterion (C1 to C5). X1 is an extra, not a criterion. Every HTTP answer's status is checked. Responses are parsed with `runStartResultSchema`, `currentRunSchema` and `pendingListSchema`.

**Shared setup.** `openRunHarness({steps, prepare})` (`graph-runner-run.kit.ts` lines 82 to 143) writes the mock scenario, the mock, the library with the `book` project active, the `gr_text` tool, and then calls `prepare(library)` before the app boots. `prepare` writes `gr_graph.yaml` and `gr_person.yaml` into `.scriba/packs/user/tools/`, and `ENTITY_ADA` to `book/entities/ada.md`, as needed. `putGraph` (line 145) writes each recipe. `postRun` (line 271) and `getRun` (line 288) call the routes. A local copy of `pollUntil` (graph-runner-run.test.ts lines 64 to 70) waits for the run to end: it polls `GET runs/current` until `status` is not `running`, with a 10 s bound. `recordsOf` (`providers-client.kit.ts` line 61) counts the mock's requests. `putFile` (`project-store-files.kit.ts`) writes host edits, synchronously (A7). Scenarios: `OK_STEPS` for C1, C3, C4 and X1; `slowFirstSteps(1000)` for C2.

**Recipes** (builders in the new kit; ids are the graph ids).

- `entity-out` (C1, X1): input `in2` (`params` `{type: 'entity', label: 'Person'}`); tool `n1` (`gr_person`, `params` `{words: 40}`); output `out1` (no params); output `out2` (`params` `{path: 'drafts/second.md'}`). Wires `w1` `in2.out` to `n1.person`, `w2` `n1.output` to `out1.in`, `w3` `n1.output` to `out2.in`. Inputs `{in2: {kind: 'entities', refs: ['ada']}}`.
- `file-out` (C2): input `in1` (`params` `{type: 'text', label: 'Chapter'}`); tool `n1` (`gr_text`, `words` 40); output `out1` (`params` `{path: 'drafts/chapter.md'}`). Wires `w1` `in1.out` to `n1.topic`, `w2` `n1.output` to `out1.in`. Inputs `{in1: {kind: 'file', ref: 'drafts/chapter.md'}}`. `prepare` writes `book/drafts/chapter.md` with the text `ORIGINAL TEXT\n`.
- `precedence` (C3): input `in1`; tool `n1` (`gr_text`, `words` 40); outputs `out1` (`params` `{path: 'drafts/from-params.md'}`), `out2` (`params` `{path: 'drafts/second.md'}`) and `out3` (no params), each fed by `n1.output`. Request `targets` `{out1: 'drafts/from-request.md'}`.
- `graph-out` (C4): input `in1`; tool `n1` (`gr_graph`, `words` 40); output `out1` (no params).

**C1** `run outputs, C1: a run creates one pending change per in-scope output node, with origin recipe-run and provenance`

- Criterion (unit line 29, verbatim): "A run creates exactly one pending change per in-scope output node, with origin `recipe-run`, the output node id, and provenance `entityIds`/`sourcesUsed`."
- Seam: `entity-out`, its inputs, the `ok` scenario, the entity file and the tool.
- Check: start answers 200. The run ends `done`. `GET runs/current` shows two `pendingChangeIds`. `nodes.out1.result` and `nodes.out2.result` each hold `pendingChangeId` and `path`; `nodes.out2.result.path` is `drafts/second.md`; `nodes.out1.result.path` matches `^drafts/entity-out-\d{8}-\d{4}\.md$`. `GET` the pending list of `book` answers two changes. Each has `origin` `{kind: 'recipe-run', runId, graphId: 'entity-out', nodeId}`, where `nodeId` is `out1` or `out2`, and `provenance` `{graphId: 'entity-out', nodeId, entityIds: ['ada'], sourcesUsed: ['ada']}`. The mock recorded exactly 1 chat request.

**X1** (extra) `run outputs, X1: a run to out1 proposes for out1 only`

- Start `entity-out` with `target` `{nodeId: 'out1'}`: 200. The run ends `done`. `pendingChangeIds` has one id. `nodes.out2.status` is `idle`. The pending list holds one change, with `nodeId` `out1`.

**C2** `run outputs, C2: a text input fed a file keeps its run-start content as the captured base, and accepting after a mid-run host edit answers a conflict`

- Criterion (unit line 30, verbatim): "With a text input fed a file and an output targeting that same file, the pending change's captured base equals the run-start content even if the file changes mid-run; accepting it through the Project store reports a conflict."
- Seam: `file-out` with `slow-first` (delay 1000 ms).
- Steps: start answers 200. Poll the mock until it has 1 record. Write `book/drafts/chapter.md` with `EDITED TEXT\n` through `putFile`. Wait for the run to end. Expected run status `done`.
- Check: the pending list holds one change with `targetPath` `drafts/chapter.md`, `kind` `modify`, `capturedBase.content` `ORIGINAL TEXT\n` and `proposed` `ok`. `POST` accept on that change (`PROJECT_PENDING_ACCEPT_ROUTE`, with `book` and the change id) answers 409 with `error.code` `PROJECT_PENDING_CONFLICT` and `details.reason` `base-changed` (`pending.service.ts` `accept`, lines 173 to 201; PST-22 D5). The file on disk still reads `EDITED TEXT\n`.

**C3** `run outputs, C3: request target, params.path and generated name are honoured in that order, and a target outside its kind's folder is refused before the run starts`

- Criterion (unit line 31, verbatim): "Target precedence (request, params, generated name) is honoured; a target outside the kind's folder is refused before work."
- Seam: `precedence` with the request `targets` above; `ok` scenario.
- Part (a): start answers 200. The run ends `done`. The pending list holds three changes: `out1` at `drafts/from-request.md`, `out2` at `drafts/second.md`, and `out3` at a path matching `^drafts/precedence-\d{8}-\d{4}\.md$`.
- Part (b), on the same app: start `precedence` with `targets` `{out1: 'entities/notes.md'}` answers 422 with `error.code` `GRAPH_TARGET_INVALID`. The mock still has exactly 1 record. `GET runs/current` shows the part (a) run's `runId`, so the refused start registered nothing.

**C4** `run outputs, C4: a graph output whose content fails the graph schema errors the output node`

- Criterion (unit line 32, verbatim): "A `graph` output whose content fails the schema errors the output node."
- Seam: `graph-out` with `gr_graph` (output `graph`) and the `ok` scenario, so the output text is `ok`.
- Check: start answers 200. The run ends `error`. `nodes.n1.status` is `done`. `nodes.out1.status` is `error`, with `error.code` `PROJECT_VALIDATION_FAILED` and a non-empty `error.message`. `GET runs/current` holds no `pendingChangeIds`. The pending list of `book` is empty. `book/graphs/` holds no file whose name starts with `graph-out-`.

**C5** `run outputs, C5: a propose of an invalid graph file to graphs/ is refused by the registered validator`

- Criterion (unit line 33, verbatim): "A propose of an invalid graph file to `graphs/` through the Project store is refused by the registered validator."
- Seam: a `bookLibrary()` library (as `graph-runner-validation.test.ts` line 137 uses it), and an app from `createTestApp({libraryDir, staticRoot, modules: [graphOutputKitModule()]})`. Requests go to `POST api/graph-runner-test/propose`, with bodies whose `projectId` is `book` and whose origin is `{kind: 'agent-run', runId: 'r1'}`.
- Check: (a) `graphs/bad.json` with content `{"schemaVersion":1,"view":"recipe"}` answers 422 `PROJECT_VALIDATION_FAILED`. (b) `graphs/broken.json` with content `{` answers 422 `PROJECT_VALIDATION_FAILED`. (c) `graphs/good.json` with content `{"schemaVersion":1,"view":"story","name":"Good","nodes":[],"edges":[]}` answers 200. At the end `book/.scriba/pending/` holds exactly one `*.json` file, the one for `good.json`.

## 5. Downstream agreement and parallel units

- **GRR-05 (merged).** Constraints D7 and D8 are met. The output branch has no `await` after the last stop check, and P10 step (1) keeps the rule without relying on that. A stop never removes a pending change. `graph-runner-stop.test.ts` passes unchanged. Its C2 step 8 now runs against the real propose path: a stop received before the output node means no propose.
- **GRR-07 (parallel, no plan).** Shared lines in `runs.service.ts`: the constructor (GRR-07 may add a parameter too, so the second merge rebases that line), the engine's output branch (GRR-07 reads the output node's `done` event for `result.pendingChangeId` and `result.path`), `setStatus` and `finish` (unchanged by GRR-06). The log entries for pending changes are open point 2.
- **GRR-08 (engine gate).** Needs GRR-06's criteria passing on main, a route behind the guard (GRR-06 adds no route), and the boundaries lint (GRR-06 imports only the project-store entry file, and nothing from the Agent loop). Met.
- **GRR-13 (run UI).** Gets: `nodes.<output>.result` `{pendingChangeId, path}` once the output node is `done` (its criterion "output nodes show their pending-change link"); `pendingChangeIds` in run state; and the review link through the pending list's `run` filter (PST-15 decision 14). The dialog's output field takes the request `targets`, and `params.path` is its default. The generated name is fixed at start (P4) and appears in the node result after the run, so the dialog can show the rule before the run, not the exact name.
- **AGL-13 (agent loop, plan line 107).** That plan assumes a graph proposed under `graphs/<id>.json` falls under the validator GRR-06 registers. This holds only where `GraphRunnerModule` is composed. An app or test module that composes the Agent loop without the Graph runner gets no graph validator. AGL-13 should know this.
- **PST-15, PST-16, PST-22 (merged).** `propose`, `registerValidator`, the `base-changed` refusal (PST-22 D5 and its downstream line for GRR-06) are used as merged. No Project store file changes here.
- **GNP-04 (G1, plan line 53).** A graph-output tool may feed an output node. No change.

## 6. Open points

1. **Generated names that collide within one run.** Two in-scope output nodes of the same kind with no target get the same generated path when they start in the same UTC minute, because the unit's name has no node part. Options: (a) keep the unit's name as written (default: the two changes target the same path, and once the first is accepted, accepting the second answers a `target-exists` conflict, which PST-16 reports); (b) add `-2`, `-3` and so on, following the `suffixedId` pattern in `graph-files.ts`, when the run already holds the name. Neither option changes a criterion or a settled decision. The plan implements (a) unless the orchestrator chooses (b) before the implementation starts.
2. **Who writes the log lines for pending changes.** GRR-07's unit says "pending change ids (emitted by GRR-06 through this logger)". GRR-06's unit does not mention logging, and GRR-07 runs in parallel with no plan. Options: (a) GRR-07 writes the pending-change entries from the output nodes' `done` events (`result.pendingChangeId`, `result.path`) and from `pendingChangeIds` at the run end, so GRR-06 has no logging code (default); (b) GRR-06 calls a logger exported by GRR-07, which makes GRR-06 depend on GRR-07. The orchestrator must tell GRR-07's planner which applies. The plan implements (a).

## 7. Facts checked and facts assumed

### 7a. Checked (read or grepped on main `081c35d`, this session)

- **Unit** `units/GRR-06-output-nodes-pending-changes.md`: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Why line 15; Decisions lines 17 to 26 (output kinds 18 to 22, target precedence and folder 23, captured base 24, propose 25, validator 26); criteria lines 29 to 33.
- **Module** `modules/graph-runner.md`: ordering paragraph (GRR-06 needs PST-15; the engine gate waits for PST-22); the overview paragraph (nothing a run produces touches files until accepted); Cross-cutting decisions (boundaries, errors, provenance); Testing principles.
- **Module-level GRR-05 plan** `plans/GRR-05.md`: section 1 (D1 to D3, unit lines 18 to 20), section 3 (the stop test file), section 5 (C2 step 8, line 170), section 6 (GRR-06 entry, lines 190 to 194: no await between a stop check and propose; a stop never removes pending changes; the test stays unchanged), section 7 point 1.
- **GRR-04 plan** `plans/GRR-04.md`: P2 (refusal order, step 4 targets, step 7 active), P3 (targets; folder check left to GRR-06), P5 and S7 (reads at start, captured content), P9 (fail-fast), P12 (`setStatus` and `finish`), P18 (no abort in GRR-04), P19 (test seam), P21 (the output step GRR-06 replaces), section 5 (GRR-06 and GRR-07 notes).
- **PST-15 plan** `plans/PST-15.md`: decisions 1 to 20 (lines 11 to 33), section 5 (tests, lines 173 to 195), section 6 (GRR-06 entry, line 197).
- **PST-22 plan** `plans/PST-22.md`: D4, D5 (accept and the 409 conflict), section 5 (GRR-06 entry).
- **GRR-03 plan** `plans/GRR-03.md`: S12 (boundaries), S15 (claims and check), the rule table rows for `output-unwired`, `output-not-fed-by-tool` and `output-kind-unwritable` (lines 101 to 103, severity error).
- **GRR-01 plan** `plans/GRR-01.md`: C2 (line 81, `graphFileSchema` is the schema every consumer uses); line 239 (GRR-06 uses `outputNodeResultSchema`, the graph check, `GRAPH_TARGET_INVALID`, and the recipe-run origin).
- **AGL-13 plan** `plans/AGL-13.md` line 107 (the graph validator assumption). **GNP-04 plan** `plans/GNP-04.md` line 53 (G1).
- **DECISIONS** (`plans/DECISIONS.md`): `grep -n "GRR-06"` finds no decision on GRR-06. The GRR-04 and GRR-05 review entries are at lines 5651 to 5661, the PST-15 entries at 4722 to 4785, the PST-22 review at 5565. No entry gives an output-node rule.
- **Plans present**: `ls plans` shows no `GRR-06.md` and no `GRR-07.md` before this write. `plans/QUEUE.md` lists GRR-06 as available.
- **Contract** (`packages/contracts/src/`): `graph-runner/runs.ts` `outputNodeResultSchema` (lines 71 to 75), `nodeResultSchema` (78 to 82), `nodeRunStateSchema` (85 to 90), `reason` (99), `pendingChangeIds` (105), `runStartRequestSchema` with `targets` a record of `fileReferenceSchema`. `graph-runner/graph.ts` `graphFileSchema` (the discriminated union of the unique-id schemas) and its index (`graph-runner/index.ts` re-exports `graph.js`). `graph-runner/constants.ts` `GRAPH_SCHEMA_VERSION` 1. `project-store/pending.ts` `pendingOriginSchema` (lines 5 to 17, `recipe-run` has `runId`, `graphId`, `nodeId`), `pendingChangeSchema` (`provenance` a loose object), `proposeInputSchema` (lines 75 to 83, `base` optional `{content}`). `project-store/files.ts` line 9 (`fileReferenceSchema = z.string()`). `project-store/routes.ts` lines 36 and 38 (`PROJECT_PENDING_ROUTE`, `PROJECT_PENDING_ACCEPT_ROUTE`). `tool-registry/constants.ts` `OUTPUT_KINDS` (16 to 23: draft, entity, claims, graph, check) and `OUTPUT_PORT_KEY` (29). `tool-registry/views.ts` `portOutputSchema` (21 to 27, with `kind`). `tool-registry/call.ts` `toolCallResultSchema` (71 to 74: `output`, `sourcesUsed`).
- **Main code, graph-runner**: `runs.service.ts`: `MESSAGES` (43 to 57); `failureOf` (120 to 125); `RunRecord` (80 to 92, `stopReason` at 90 to 91); constructor (132 to 143, the switch hook at 142); `start()` (146 to 244: targets 160 to 168, `scopeOf` and `orderOf` 170 to 171, inputs 173 to 190, reads 192 to 203, active check 205 to 208, state 210 to 220 with `startedAt` at 215, record 221 to 229, registration 230); `stop` (253 to 262); `requestEnd` (266 to 272); `onProjectSwitched` (275 to 283); `engine` (325 to 361: the input and output `else` branch at 340 to 343; the catch at 344 to 358); `toolStep` (365 to 403: entity ids 383, resolution 384 to 391, execute 398 to 402); `setStatus` (432 to 444); `endStopped` (447 to 455); `finish` (459 to 480). `run-scope.ts`: `nodeOfPort` (line 4), `scopeOf(recipe, target?)` (line 11), `orderOf` (line 31). `graph-files.ts`: `suffixedId` (open point 1). `graph-runner.module.ts` (lines 1 to 18: imports `PlatformModule`, `ProjectStoreModule`, `ToolRegistryModule`; providers include `RunsService`; no exports). `graph-validation.ts`: `UNWRITABLE_OUTPUT_KINDS` (line 16, claims and check); the output-node rules (about lines 386 to 406).
- **Main code, project-store**: `project-store.module.ts` (line 30 exports `PendingService` from the entry file; line 66 provides it; line 77 exports it). `project-store.service.ts` (`resolvePath` 46 to 48; `onProjectSwitched` 59 to 61; it has no project-root lookup). `files.service.ts` `read` (257 to 269, returns `path: target.relativePath` at 268, `hash` via `hashOf`). `pending.service.ts` (class 82; `registerValidator` 96 to 98; `list` 102; `accept` 173 to 201 with the `PENDING_CONFLICT` refusal; `checkContent` 407 to 438, where a throwing validator counts as failed; `propose` 447, which folds on same target and same origin). `entity-manifest.ts`: `ENTITY_SUFFIX` (19), the recursive `walk` and `collect` (222 to 260), the id rule (304 to 305: front matter `id`, else the file stem).
- **Main code, tool-registry**: `executor.service.ts` `execute` returns `{output: {kind, content}, sourcesUsed}` (98 to 101); `sources` are the unique non-style entity ids (149 to 151); `finish()` strips a `graph` fence and trims, with no JSON check (208 to 215). `catalog.service.ts` `ports(name)` (309 to 311).
- **Test code**: `graph-runner-run.kit.ts` exports `STATIC_ROOT` (21), `SCENARIO` (24), `OK_STEPS` (27), `slowFirstSteps` (30), `GR_TEXT_YAML` (47 to 68, `output: draft` at 64), `openRunHarness` (82 to 143), `putGraph` (145), `writeGraphs` (258), `postRun` (271), `getRun` (288). `graph-runner-run.test.ts` has no output node in any recipe (grep). `graph-runner-stop.test.ts` has `out1` at lines 124 to 131 (C2) and its output assertions at 248 and 257. `graph-runner-validation.test.ts`: `toolYaml` (70 to 110), the `book/entities/ada.md` fixture (140 to 143, front matter `type: person`). `create-test-app.ts` `TestAppOptions` (9 to 13: `libraryDir`, `modules`). `project-store-pending.kit.ts` `pendingKitModule` (22 to 40, the in-process route pattern). `invariant-sweep.ts` enumerates the composed app's routes (GRR-05 plan section 2a, line 58, and section 6, GRR-08 entry).
- **Boundaries**: GRR-03 plan S12 (graph-runner imports other modules only through entry files; no Agent-loop import).
- **Unit and module notes**: see 7c.

### 7b. Assumed (not checked here; the step named checks it)

- A1. Node 26 and npm 11 are the runtime (step 1).
- A2. The API test baseline passes on main (step 1).
- A3. The `gr_graph` YAML (output `graph`) is valid under TRG-06 and runs (step 11).
- A4. The `gr_person` fixture (the copy of `toolYaml(entity: true)`) validates with the optional `person` entity port and the required `words` (step 11).
- A5. The executor passes `ada` as a resolved entity, so `sourcesUsed` is `['ada']` for `gr_person` (step 11). The read of `executor.service.ts` covers the rule, not a run.
- A6. `slowFirstSteps(1000)` leaves time to write the host edit before the run ends (step 11; GRR-04 A12 is the same risk).
- A7. `putFile` writes synchronously, as GRR-04 A14 assumed and its tests use it (step 11).
- A8. `bookLibrary()` gives an ok `book` project with a `project.yaml`, so that propose accepts it (step 11; PST-15 section 5 uses the same library).
- A9. The local `pollUntil` copy behaves as in `graph-runner-run.test.ts` lines 64 to 70 (step 11).

### 7c. Unit and module notes (no change to this plan)

- **U1 (checked, no effect on criteria).** GRR-06's `blocked_by` (unit line 7) lists PST-15 and then gives "gate is Project store phase:pending-review, PST-22" in the same quoted entry. The module's dependency graph (`modules/graph-runner.md`) lists GRR-06 under PST-15 only, and GRR-08 under PST-22. Both are done on main. This plan follows PST-15, and treats the PST-22 gate as satisfied.
- **U2 (checked).** GRR-07's unit says GRR-06 emits pending change ids "through this logger". GRR-06's unit does not. See open point 2.
- **U3 (checked).** GRR-06 unit line 21 ("a JSON file in `graphs/`") does not say top level, and line 20 ("a Markdown entity file in `entities/`") does not say any depth. P3 decides both (graphs top level; entities any depth), with the sources given there.

## 8. Review parts

One part (P13). The target rule, the output branch, the provenance and the validator share one `RunRecord` and one engine branch.
