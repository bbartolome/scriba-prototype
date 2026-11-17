---
id: GRR-03
status: done
---
# GRR-03 plan — recipe and story validation against the tool registry, and the validate endpoint

Unit: GRR-03 (module graph-runner, phase:engine, M4). `units/GRR-03-validation.md`: front matter lines 2 to 9 (`blocked_by` line 7: GRR-01, TRG-11; `parallel_with` line 8: GRR-02, GRR-10; `unblocks` line 9: GRR-04, GRR-08, GRR-11), body lines 12 to 30 (Why 14 to 15, Decisions 17 to 24, criteria 26 to 30). The unit was read in full and has no note that records a change (no "by revision" line). Draft by the planner, checked against main `944590d`. Nothing was built, installed, run, committed or changed except this file. Tags: "checked" means the planner read or grepped the file and line at `944590d`; "ASSUMED" means a belief not checked here (section 8b). Line numbers refer to `944590d`.

Revised on 2026-11-17 by the reviser against main `45f0496` (`git diff --stat 944590d 45f0496` lists only this file, so every line number above still holds). The reviser decided O1 (option (a), with a pre-pass instead of a second schema: P22) and O2 (option (a)), made each C1 fixture produce exactly one issue (rows 10, 11 and 23; P9 and P21), fixed the ids of `missing-port` and `cycle` (P8), and wrote section 7. No unit, module or contract file changes.

GRR-02 (`plans/GRR-02.md`, status done, commit `0eaedd0`) is on main. This plan extends its seam `issuesOf(graph)` (GRR-02 P13, S16). The GRR-02 test file `apps/api/test/graph-runner-graph-crud.test.ts` must keep passing.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contract and the done plans

- **S1 Pure check.** One check of a graph against the current tool registry. It runs on get, on save, at run start (GRR-04 calls it) and through the validate endpoint. Source: unit line 18; module line 42 ("the server rules are the only implementation").
- **S2 Issue shape and codes.** `{code, severity, nodeId?, edgeId?, portId?, message}`, codes from the contract: 14 error codes (`constants.ts` lines 90 to 105) and 8 warning codes (lines 119 to 128), all codes in `GRAPH_ISSUE_CODES` (lines 130 to 134). Shape `validationIssueSchema` (`issues.ts` lines 13 to 21); response `validationResultSchema` `{issues}` (`issues.ts` lines 24 to 27). Source: unit line 19; GRR-01 plan C13 (section 1.3).
- **S3 Severity split.** Recipe errors block a run (unit line 20); recipe warnings (line 21); story graphs have warnings only (line 22). Errors and warnings are not HTTP errors: rule failures are answered with 200 and `issues`.
- **S4 Port derivation from the registry.** Input ports, element types, list flags, required flags and the output type come from the Tool registry; the runner never reads raw JSON Schema. Source: unit line 23.
- **S5 Ajv is not validation.** Argument shapes are checked when a tool node runs (GRR-04, executor). A failure there is a node error, not an issue. Source: unit line 24.
- **S6 Validate endpoint.** `POST /api/graph-runner/graphs/validate` (`GRAPH_VALIDATE_ROUTE`, `routes.ts` line 8). It accepts an unsaved graph body and writes nothing. Source: unit lines 18 and 30; module line 41; GRR-01 plan C11.
- **S7 Shape of the body.** The validate body is parsed with `graphFileShapeSchema` (`graph.ts` line 174), so a duplicate id reaches the rules (GRR-01 plan C2). Source: GRR-01 plan C2 and section 5 (GRR-03 (b)).
- **S8 Duplicate ids** are a recipe error (unit line 20, last item). The story rules list (line 22) does not name them, so a story graph gets no `duplicate-id` issue (O2, decided: option (a)).
- **S9 Active project.** Every route acts on the active project (module line 40; GRR-02 S2). Get, save and validate therefore need one (decided here, P2).
- **S10 Save writes first.** A save is a direct write of the canonical text (GRR-02 S4, S11, P10); the issues of the written graph go in the response (GRR-02 S10, `{issues}`). Criterion 2 (unit line 28) depends on this order.
- **S11 Seam.** `GraphRunnerService.issuesOf(graph)` is the one function GRR-03 replaces (GRR-02 P13, S16, `graph-runner.service.ts` lines 182 to 186). Get and save already call it.
- **S12 Boundaries.** graph-runner imports another module only through its entry file (eslint R1, `eslint.config.mjs` line 50) and never imports agent-loop (R2, line 69). The tool-registry entry file is `apps/api/src/modules/tool-registry/tool-registry.module.ts`, which re-exports `CatalogService` (lines 16 to 23).
- **S13 Disabled tools are not refused by validate.** TRG-09 plan lines 118 and 120: "the validate endpoint never refuses a disabled tool"; GRR-03 reads the switch (`enabledOf` or the `enabled` of the list summary) and calls params-mode validate. TRG-11 plan line 119 and section 7 point 7 (line 136) list the same catalog methods as GRR-03's needs.
- **S14 Port types.** GRR-03 compares port `type` values (`PortInput.type`, `views.ts` line 14). Element types and the TRG-01 `valueType` decision do not change GRR-03 (DECISIONS 2026-11-14, TRG-01, Navigator decision on open point 1, lines 3403 to 3407, "GRR-03 (line 23) reads `PortInput.type`"). The TRG-01 decision on unreadable files (lines 3409 to 3413) names GRR-03 as unchanged.
- **S15 Claims and check outputs.** An output node fed by a tool whose output kind is `claims` or `check` is a validation error (unit line 20; GRR-06 unit line 22 "claims, check → not writable in v1 (validation error, GRR-03)"). The GNP-04 and GNP-07 Navigator entry (DECISIONS lines 5144 to 5161) relies on the same line 20.
- **S16 Entity references.** A pinned entity or style value is an entity id (`validate.ts` lines 107 to 110 check entity and style values as entity ids). A pinned entity whose file is gone is a warning (unit line 21). The Project store's `EntitiesService.resolve` reports `unknown` for an id with no readable file (`entities.service.ts` lines 44 and 59).

### 1b. Small choices this plan makes (names, layout, rule details)

- **P1 Files.** `graph-validation.ts`: pure rules (no Nest import, no I/O). `graph-validator.service.ts`: class `GraphValidatorService`, which gathers the facts (tool facts from the catalog, path status from the Project store, pinned entity status) and calls the pure rules. `graph-runner.service.ts`: `issuesOf(graph)` keeps its signature and calls the validator with the active project id; a new `validate(body)` method. `graphs.controller.ts`: one POST route. `graph-runner.module.ts`: imports `ToolRegistryModule` from `../tool-registry/tool-registry.module`, adds the validator to providers.
- **P2 No active project.** Get, save and validate answer 409 `PROJECT_NO_ACTIVE` through GRR-02's `activeProjectId()` (`graph-runner.service.ts` lines 189 to 199). Reason: S9. The rules need the project for story paths and pinned entities.
- **P3 Body of validate.** The order is: the active project (P2, 409 `PROJECT_NO_ACTIVE`); the illegal-kind pre-pass (P22); then GRR-02's `checkValue(rest, true)` (`graph-runner.service.ts` lines 250 to 264) on the rest of the body: a newer `schemaVersion` gives 409 `GRAPH_SCHEMA_VERSION_UNSUPPORTED`, a body that fails `graphFileShapeSchema` gives 422 `GRAPH_SCHEMA_INVALID` (the pre-pass issues are then dropped). Otherwise the route answers 200 with `{issues}`: the pre-pass issues, then `issuesOf(graph)` (GRR-02 P8: every other POST is 200).
- **P4 Tool facts (per tool node, through `CatalogService`).**
  - `entry(name)` (catalog lines 303 to 306). `TOOL_NOT_FOUND` (404) or `TOOL_INVALID` (422) makes the tool "unknown": one `unknown-tool` issue, and no port, parameter or output-kind rule for that node. Reason: an invalid tool cannot run, and the code list has no other code for it.
  - Otherwise, `enabledOf(tool)` (lines 315 to 317) false gives `disabled-tool`. The ports are `tool.views.ports`, which `ports(name)` returns (lines 309 to 311). The port rules run for an enabled and for a disabled valid tool.
  - Parameters: `validate(name, {arguments: params ?? {}, mode: 'params'})` (lines 338 to 341). The call throws `TOOL_ARGS_INVALID` (422) with `details.issues` (`validate.ts` line 242; `ToolArgsInvalidDetails`, contract `tool-registry/errors.ts` lines 63 to 68). Each issue becomes one `tool-params-invalid` issue on the node. The message names the setting key from the issue's `path` when there is one (P14). Any other error is rethrown.
  - Every `entry` and `validate` call re-scans the user pack (`refresh()`, TRG-11 plan section 9a). The validator calls `entry` once per tool node. The re-scan may publish `catalog-changed`; it writes no file (TRG-11 plan section 7 point 5, option A).
- **P5 Port ids and keys.** A port id is `<nodeId>.<key>`, split on the first dot (GRR-01 C5; `graph.ts` line 22). The keys are fixed: an input node's output port is `out` (`constants.ts` line 25); an output node's input port is `in` (line 28); a tool node's output port is `output` (line 31), and its inputs are `ports.inputs` (views.ts lines 12 to 18).
- **P6 Port types.** An input node's output has the type of its `params.type`. A tool's output has type `text` (`views.ts` line 24, the only type of the output port). An output node's input has type `text`, the type of a tool output. A wire is a type mismatch when the two types differ; the list flag is not compared (one value per input, `views.ts` line 38).
- **P7 Duplicates.** The first occurrence of a node id or an edge id is used by every rule. In a recipe, a later occurrence is reported by `duplicate-id` and is otherwise ignored; a wire that names a repeated node id uses the first occurrence. In a story graph a later occurrence is ignored and not reported (O2, option (a)).
- **P8 Which ids an issue carries.** `missing-port` carries `edgeId` and `portId` = the port id of the missing end (`from` or `to`); a wire with two missing ends gives two issues. `port-type-mismatch` and `multiple-wires-into-port` carry `edgeId` and `portId` = the wire's `to`. `port-wired-and-pinned`, `required-port-unfed` and `pinned-entity-missing` carry `nodeId` and `portId`. Output-node issues carry `nodeId` (the output node) and `edgeId` when a wire is involved. `cycle` gives one issue per graph, with `nodeId` = the first node in node order that can reach itself over usable wires (P21). Story path issues carry `nodeId`; `unknown-edge-node` carries `edgeId`. An issue carries no other id key.
- **P9 Dead steps.** `dead-step` applies to a tool node, or to an input node with at least one usable wire out, that has no path over usable wires (P21) to an output node (unit line 21, "a node with no path to any output"). An input node with no wire out is reported by `input-unwired` only (the unit's more specific rule), so that the fixture of each of the two rules gives exactly one issue (criterion 1). An output node is never a dead step.
- **P10 Required ports.** A tool input port with `required: true` (`views.ts` line 16) and no wire into it and no pinned value (`params` has no key of that port) gives `required-port-unfed`. A wired port that is also pinned gives `port-wired-and-pinned`.
- **P11 Pinned entities.** For every tool input port of type `entity` or `style` with a pinned value (a string, or an array of strings for a list port), the validator calls `EntitiesService.resolve(projectId, ids)` (`entities.service.ts` line 36) once per validate call, and only when such a value exists. Each id with `code: 'unknown'` gives `pinned-entity-missing` (warning, `nodeId` and `portId`). A `duplicate` entity id is not reported (the entity exists).
- **P12 Story paths.** For each story node with a `path`:
  1. If the path, lower-cased, starts with `drafts/.versions/`, the issue is `path-in-versions`, and the path is not read (the Project store reserves that folder: `packages/contracts/src/project-store/constants.ts` lines 17 to 20, so a read would give a different code).
  2. Otherwise `files.read(projectId, path)` (`files.service.ts` lines 257 to 270): `PROJECT_NOT_FOUND` gives `path-missing` (a missing file, or a folder: `readFileAt` lines 140 to 141); `PROJECT_PATH_INVALID`, `PROJECT_PATH_OUTSIDE` or `PROJECT_PATH_RESERVED` give `path-unsafe`; `PROJECT_NOT_TEXT` and `PROJECT_FILE_TOO_LARGE` mean the file exists (no issue); any other error is rethrown.
  3. `entity-path-outside-entities` is lexical and independent of 1 and 2: an `entity` node whose path does not start with `entities/`.
  Step 1 short-circuits step 2 for the same path.
- **P13 Unknown edge endpoints.** A story edge whose `from` or `to` is not the id of a story node gives one `unknown-edge-node` issue (`edgeId`).
- **P14 Messages.** Each code has a fixed message template. Ids may appear in it; a graph value (a pinned value, a setting value, a path) is never echoed. For `tool-params-invalid` the template names the setting key (from the issue `path`, without its leading `/`) when there is one. The same rule as GRR-02 P14.
- **P15 Order of issues.** The response lists issues in this order: duplicate ids; per tool node (unknown or disabled tool, then parameter issues, then pinned entities); per wire in wire order (missing port, type mismatch, multiple wires); per node (wired and pinned, then required unfed); cycle; output nodes; input nodes; dead steps. A story lists per node (path rules), then per edge. Tests compare sorted lists, so the order is documented but not asserted.
- **P16 Writable kinds.** `UNWRITABLE_OUTPUT_KINDS = ['claims', 'check']` is exported from `graph-validation.ts` for GRR-06, which must refuse the same kinds at run time (section 5).
- **P17 Issues of get.** Get returns the same issues as the validator (GRR-02 P13). A GET never mutates; the validator only reads (`files.read`, `EntitiesService.resolve`, the catalog's read methods).
- **P18 Keeping the GRR-02 tests.** GRR-02 K1 asserts only that `issues` is an array (GRR-02 plan section 4); K2 and K3 are decided before validation (GRR-02 plan section 5). Nothing there changes.
- **P19 Scope of `tool-params-invalid`.** Every params-mode issue is reported, not only missing required settings: a missing setting and a setting of the wrong value both make a node fail at run time, and the registry's params-mode check reports both (`validate.ts` lines 98 to 105).
- **P20 Enabling and disabling in the test.** The test toggles a tool with the registry's own route `POST /api/tool-registry/tools/:name/enabled` with body `{enabled}` (`tools.controller.ts` lines 98 to 106; contract `catalog.ts` lines 80 to 83). No file is edited by hand.
- **P21 Usable wires.** A wire (first occurrence of its id) is usable when it has no `missing-port` issue. An end has a `missing-port` issue when its node id names no node, or its key is not a port of that node on that side (from: `out` of an input node, `output` of a tool node; to: `in` of an output node, an input key of the tool). For a tool node whose tool is unknown (P4) the key is not checked, so its wires stay usable and its node takes part in the graph rules. The rules `port-type-mismatch` (skipped when an end is on an unknown tool), `multiple-wires-into-port`, `port-wired-and-pinned`, `required-port-unfed`, `cycle`, `output-unwired`, `output-not-fed-by-tool`, `output-kind-unwritable` (skipped when the feeding tool is unknown) and `dead-step` read usable wires only. `input-unwired` reads every wire: an input node is unwired when no wire has it as its `from` node.
- **P22 Illegal node kinds (O1, option (a)).** The contract parse cannot carry a node whose kind the view does not allow (`graph.ts` lines 39 and 88 are discriminated on `kind`). GRR-01 plan C13 (line 92) leaves to GRR-03 how it produces `illegal-node-kind`. The validate route therefore runs a pure pre-pass, `splitIllegalKinds(body)` in `graph-validation.ts`, before the shape parse: when the body is an object with `view: 'recipe'` and an array `nodes`, each item that is an object with a string `id` matching `NODE_ID_PATTERN` (`constants.ts` line 19) and a string `kind` not in `RECIPE_NODE_KINDS` (line 16) is left out of a copy of the body and gives one `illegal-node-kind` issue (error, `nodeId`). The body itself is not mutated. Any other item stays in, so a malformed node still gives 422. A left-out node takes part in no other rule; a wire to it gives `missing-port` (P21). A story body is not pre-passed: unit line 20 lists the rule under recipe errors and line 22 says story graphs get warnings only, so a story body with a recipe kind stays 422. Get, save and run start (GRR-04, `readGraph`) still refuse a file with an illegal kind with 422 `GRAPH_SCHEMA_INVALID` (GRR-02 S9); no contract file changes.

### 1c. Facts checked on main

The full list with file and line is in section 8a.

## 2. Files to create or change

Only these paths change. Nothing under `packages/`, `apps/web/`, `units/`, `modules/` or `plans/` (other than this file) changes. No contract change (O1 is decided with option (a), P22).

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/graph-runner/graph-validation.ts` | new | Pure rules: `storyIssues(graph, pathStatus)` and `recipeIssues(graph, toolFacts, missingEntities)`, both returning `ValidationIssue[]`; the pre-pass `splitIllegalKinds(body: unknown): {rest: unknown; issues: ValidationIssue[]}` (P22); the constant `UNWRITABLE_OUTPUT_KINDS` (P16). The types of the facts it takes are declared here. No import from Nest, project-store or tool-registry. |
| `apps/api/src/modules/graph-runner/graph-validator.service.ts` | new | Class `GraphValidatorService`, `@Injectable()`, with `issues(projectId, graph)`. Injects `CatalogService` (from `../tool-registry/tool-registry.module`), `FilesService` and `EntitiesService` (from `../project-store/project-store.module`). Gathers the facts of P4, P11 and P12 and calls the two pure rules. |
| `apps/api/src/modules/graph-runner/graph-runner.service.ts` | edit | Injects `GraphValidatorService`. `issuesOf(graph)` (lines 182 to 186) returns `this.validator.issues(this.activeProjectId(), graph)` and loses its `eslint-disable` comment (line 183). New method `validate(body: unknown): ValidationResult`: `this.activeProjectId()`, then `const {rest, issues} = splitIllegalKinds(body)`, then `{issues: [...issues, ...this.issuesOf(this.checkValue(rest, true))]}` (P3, P22). All calls are synchronous, as `issuesOf` is today (catalog, `files.read` and `EntitiesService.resolve` are synchronous). |
| `apps/api/src/modules/graph-runner/graphs.controller.ts` | edit | One route: `@Post(GRAPH_VALIDATE_ROUTE) @HttpCode(200) validate(@Body() body: unknown): ValidationResult`. The body is not piped (as save, P9 of GRR-02). Imports `GRAPH_VALIDATE_ROUTE` and `ValidationResult` from `@bbartolome/scriba-contracts/graph-runner`. |
| `apps/api/src/modules/graph-runner/graph-runner.module.ts` | edit | `imports: [PlatformModule, ProjectStoreModule, ToolRegistryModule]` (the last from `../tool-registry/tool-registry.module`); `providers: [GraphRunnerService, GraphValidatorService]`. Exports stay empty (GRR-02 P15). |
| `apps/api/test/graph-runner-validation.test.ts` | new | Tests C1 to C4 (section 4). Vitest collects it through `test/**/*.test.ts`. |
| `plans/GRR-03.md` | new | This plan. The orchestrator commits it. |

Checked and not changed, on purpose: `packages/contracts/**` (every name needed exists: `GRAPH_ISSUE_CODES`, `validationResultSchema`, `GRAPH_VALIDATE_ROUTE`, `graphFileShapeSchema`); `apps/api/src/app.module.ts` (`GraphRunnerModule` is already registered, lines 17 and 27); `apps/api/test/invariant-sweep.ts` (the new route has no `:`, so it needs no `FIXTURE_PATHS` entry; `concretePath` at `invariant-sweep.ts` line 251 throws "No fixture path for route template" at line 256); `apps/api/src/modules/tool-registry/**` and `apps/api/src/modules/project-store/**` (read only); `apps/web/**`; `apps/api/src/modules/graph-runner/graph-files.ts` (unchanged).

### 2a. The rules (the codes of section 2 of the contract, with their ids)

| Code | Severity | Rule (unit line) | Ids in the issue |
|---|---|---|---|
| `illegal-node-kind` | error | a recipe node whose kind is not `input`, `tool` or `output`, found by the validate pre-pass (20; P22) | `nodeId` |
| `unknown-tool` | error | a tool node whose tool is not found or not valid (20) | `nodeId` |
| `disabled-tool` | error | a tool node whose valid tool is disabled (20) | `nodeId` |
| `missing-port` | error | a wire endpoint whose node or port does not exist; from-side ports: `out` on an input node, `output` on a tool; to-side: `in` on an output node, an input key of the tool; keys on an unknown tool are not checked (20; P21) | `edgeId`, `portId` (the missing port) |
| `port-type-mismatch` | error | a wire whose two port types differ (20) | `edgeId`, `portId` (`to`) |
| `multiple-wires-into-port` | error | the second and later wire into one input (20) | `edgeId` (the later wire), `portId` |
| `port-wired-and-pinned` | error | an input port that is wired and has a pinned value (20) | `nodeId`, `portId` |
| `required-port-unfed` | error | a required input port with no wire and no pinned value (20) | `nodeId`, `portId` |
| `tool-params-invalid` | error | a params-mode issue of the tool: a missing required setting or a wrong value (20; P19) | `nodeId` |
| `cycle` | error | the wires form a cycle (20) | `nodeId` (P8) |
| `output-unwired` | error | an output node with no wire into `in` (20) | `nodeId` |
| `output-not-fed-by-tool` | error | an output node whose wire comes from a node that is not a tool (20) | `nodeId`, `edgeId` |
| `output-kind-unwritable` | error | an output node fed by a tool whose output kind is `claims` or `check` (20, S15) | `nodeId`, `edgeId` |
| `duplicate-id` | error | the second and later occurrence of a node id or an edge id (20, S8, P7) | `nodeId` or `edgeId` |
| `dead-step` | warning | a tool node, or a wired input node, with no path to an output (21; P9) | `nodeId` |
| `input-unwired` | warning | an input node with no wire out (21) | `nodeId` |
| `pinned-entity-missing` | warning | a pinned entity or style value whose entity is unknown (21; P11) | `nodeId`, `portId` |
| `path-missing` | warning | a story path that does not exist (22; P12) | `nodeId` |
| `path-unsafe` | warning | a story path the Project store refuses (22; P12) | `nodeId` |
| `path-in-versions` | warning | a story path inside `drafts/.versions/` (22; P12) | `nodeId` |
| `unknown-edge-node` | warning | a story edge to a node that does not exist (22; P13) | `edgeId` |
| `entity-path-outside-entities` | warning | an entity node whose path is outside `entities/` (22; P12) | `nodeId` |

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on a branch `unit/GRR-03` created from `main`. Record `node -v` and `npm -v` beside each result. Do not push. Commit only the implementer's files; the plan is committed by the orchestrator. Do not tick the unit's boxes.

0. **Preconditions.** `grep -m1 '^status' plans/GRR-01.md plans/GRR-02.md plans/TRG-11.md` prints `status: done` three times. `git branch --list 'unit/GRR-03'` prints nothing. O1 and O2 are decided (section 6); nothing waits on the Navigator.
1. **Runtime and branch.** `node -v` prints `v26.x`. `git switch -c unit/GRR-03` on a clean tree. Expected: `Switched to a new branch 'unit/GRR-03'`.
2. **Baseline.** `npm run build -w @bbartolome/scriba-contracts` (exit 0), then `npm test -w @bbartolome/scriba-api`. Expected: exit 0. Record the file and test counts as the starting count.
3. **Pure rules.** Write `graph-validation.ts` with the rules of section 2a and P4 to P16, P21 and P22 (the pure parts). Expected: `grep -n "@nestjs\|project-store\|tool-registry" apps/api/src/modules/graph-runner/graph-validation.ts` prints nothing.
4. **Validator.** Write `graph-validator.service.ts`: `issues(projectId, graph)` gathers the facts (P4, P11, P12) and calls the rules. Expected: `grep -n "agent-loop" apps/api/src/modules/graph-runner/*.ts` prints nothing (S12).
5. **Service.** Edit `graph-runner.service.ts` as section 2 says (`issuesOf` delegates; `validate(body)`). Expected: `grep -n "eslint-disable" apps/api/src/modules/graph-runner/graph-runner.service.ts` prints nothing.
6. **Controller.** Edit `graphs.controller.ts`: the validate route (P3, P9 of GRR-02).
7. **Module.** Edit `graph-runner.module.ts` (imports and providers as section 2). Expected: `git status --short` lists only the five `apps/api/src/modules/graph-runner/` paths of section 2 (three ` M` edits, two `??` new files) and no other path.
8. **Tests.** Write `apps/api/test/graph-runner-validation.test.ts` with C1 to C4 (section 4). Its setup, repeated for each of the four tests (each test boots its own app on a fresh library and removes it, as GRR-02's `withGraphApp`, `graph-runner-graph-crud.test.ts` lines 57 to 77, so C3's switch never reaches another test): `bookLibrary()` (`project-store-files.kit.ts` lines 44 to 46) for the temp library with `book` active; the project files of section 4 written with `putFile(library, 'book/<path>', text)` (library-relative, so under the project folder `book/`); the four user tools written as YAML files into `<library>/.scriba/packs/user/tools/` before `createTestApp({libraryDir, staticRoot})`, with `staticRoot` the fixture folder of `graph-runner-graph-crud.test.ts`; `sessionCookie` for the cookie; every POST sends `origin: LOOPBACK_ORIGIN`, `host: LOOPBACK_HOST` (`invariant-sweep.ts` lines 38 and 39) and the cookie. The tool YAML is the pattern of `toolYaml` (`tool-registry-loader.test.ts` lines 113 to 133) with the extra inputs and settings of section 4. The file names no examples folder. Expected: `grep -n -i "examples" apps/api/test/graph-runner-validation.test.ts` prints nothing.
9. **Format.** `npx prettier --write` on the new and edited files of section 2 (the test file included). Expected: each file is reported as written; `npx prettier --check` on them exits 0.
10. **New tests and the regressions.** `npm test -w @bbartolome/scriba-api -- graph-runner-validation` (exit 0; 4 tests pass). Then `npm test -w @bbartolome/scriba-api -- graph-runner-graph-crud invariant-get-head invariant-mutation-guard token-guard-gate` (exit 0): GRR-02 K1 to K4 and the three invariant files, with the new route mounted. A message `No fixture path for route template` would be a route with `:`; there is none, so none is expected.
11. **Mutation evidence (not committed).** Save a copy of each file before a change, then restore it from the copy (the new files are untracked, so no `git checkout`). M1: in `graph-validation.ts`, skip the port-type check. Expected: C1 fails on the port-type row. M2: in `graph-validator.service.ts`, treat every tool as enabled. Expected: C3 fails. M3: in `graph-runner.service.ts`, make `issuesOf` return `[]`. Expected: C1 and C2 fail. M4: in `graph-runner.service.ts`, drop the pre-pass from `validate` (pass `body` to `checkValue`). Expected: C1 fails on row 23 (422 instead of 200). After each restore, rerun step 10 and expect all to pass.
12. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0. `npm run lint` ends with Prettier's `All matched files use Prettier code style!`. The boundaries tests run inside `npm test`.
13. **Commit.** On `unit/GRR-03`, `git add` each file of section 2 by name, then `git commit -m "feat(GRR-03): validate recipes and stories against the tool registry, and the validate endpoint"`. Do not push.
14. **Record.** Store the Node and npm versions, the exit code of each command of steps 2, 10, 11 and 12, and the test counts. Report to the orchestrator; stop.

## 4. Acceptance criteria and tests

The four criteria are checked by `apps/api/test/graph-runner-validation.test.ts`, one test each, through the composed app with a temp library (the default seam, module line 50). None needs a real model, a browser, a Docker host or a credential. Test names use the prefix `graph validation, C<n>:`. Every answer is checked for its HTTP status. Every issue list is compared as an exact list: each issue is reduced to `{code, severity, nodeId?, edgeId?, portId?}` (a key the issue does not carry is absent, P8), the list is sorted by code, `nodeId`, `edgeId`, `portId`, and it must equal the expected list; the severity of each expected issue is the one of section 2a. Each `message` is checked to be a non-empty string; its text is not compared (P14).

**Common fixtures.** Four user tools, written as YAML into `<library>/.scriba/packs/user/tools/<name>.yaml`, all with one text input port `topic` (`x-scriba-port: true`, required) and one setting `words` (integer, minimum 1, required, no `default`, so Ajv's `useDefaults`, `validate.ts` line 37, cannot fill it), output `draft` and `enabled: true` unless stated:
- `gr_text`: as above.
- `gr_off`: as `gr_text`, `enabled: false`.
- `gr_claims`: as `gr_text`, output `claims`.
- `gr_entity`: input port `person` (`type: string`, `x-scriba-type: entity`, `x-scriba-port: true`, not required), input port `topic` (text, not required), setting `words` (required).

The C1 test first checks, with `GET /api/tool-registry/tools`, that the four tools are listed with `valid: true` and the `enabled` values above (assumption A4).

**R0 (valid recipe).** Nodes `in1` (input: `type` text, `label` "Topic"), `n1` (tool `gr_text`, `params` `{"words": 40}`), `out1` (output, no params). Wires `w1` `in1.out` to `n1.topic`, `w2` `n1.output` to `out1.in`.

**S0 (valid story).** Entity `e1` (`path` `entities/ada.md`), scene `s1` (`path` `drafts/ch01.md`), edge `e2` from `e1` to `s1` with relation `order`. The project files `entities/ada.md` (text `---\ntype: person\n---\n# Ada\n`, assumption A5) and `drafts/ch01.md` (text `# Chapter 1\n`) are written before the app starts, in every test, with `putFile(library, 'book/entities/ada.md', ...)` and `putFile(library, 'book/drafts/ch01.md', ...)` (`project-store-files.kit.ts` line 70: the path is library-relative).

| Test | Criterion | Seam and fixture | Pass condition |
|---|---|---|---|
| **C1** `graph validation, C1: every rule has a fixture that produces exactly its issues` | "Each error and warning rule has a fixture that produces exactly that issue with the right ids." (unit line 27) | `POST /api/graph-runner/graphs/validate` with each body below (unsaved) | Each row answers 200 and `issues`, sorted, equals the expected list exactly. The rows are: |

C1 rows (each is R0 with the change shown; "add" and "remove" are edits to R0 unless stated):

| # | Code | Change | Expected issues |
|---|---|---|---|
| 1 | unknown-tool | `n1.tool` is `gr_missing` | unknown-tool `n1` |
| 2 | disabled-tool | `n1.tool` is `gr_off` | disabled-tool `n1` |
| 3 | missing-port | add `w3` from `in1.out` to `n1.nope` | missing-port `w3`, `n1.nope` |
| 4 | port-type-mismatch | `in1.params.type` is `entity` | port-type-mismatch `w1`, `n1.topic` |
| 5 | multiple-wires-into-port | add input `in2` (text) and `w3` from `in2.out` to `n1.topic` | multiple-wires-into-port `w3`, `n1.topic` |
| 6 | port-wired-and-pinned | `n1.params` is `{"words": 40, "topic": "pinned"}` | port-wired-and-pinned `n1`, `n1.topic` |
| 7 | required-port-unfed | remove `in1` and `w1` | required-port-unfed `n1`, `n1.topic` |
| 8 | tool-params-invalid | `n1.params` is `{}` | tool-params-invalid `n1` |
| 9 | cycle | nodes `n1` and `n2` (both `gr_text`, `words` 40), `out1`; wires `n1.output` to `n2.topic`, `n2.output` to `n1.topic`, `n2.output` to `out1.in` | cycle `n1` |
| 10 | output-unwired | add output `out2` (no params), no wire | output-unwired `out2` |
| 11 | output-not-fed-by-tool | add output `out2` and `w4` from `in1.out` to `out2.in` | output-not-fed-by-tool `out2`, `w4` |
| 12 | output-kind-unwritable | `n1.tool` is `gr_claims` | output-kind-unwritable `out1`, `w2` |
| 13 | duplicate-id (node) | add a second node `n1` (a copy of `n1`) after the first | duplicate-id `n1` |
| 14 | duplicate-id (edge) | add a second edge `w1` (same ends) after `w1` | duplicate-id edge `w1` |
| 15 | input-unwired | add input `in2` (text), no wire | input-unwired `in2` |
| 16 | dead-step | add `n3` (`gr_text`, `words` 40) with `w3` from `in1.out` to `n3.topic`; no wire out of `n3` | dead-step `n3` |
| 17 | pinned-entity-missing | a graph of `n4` (`gr_entity`, params `{"words": 40, "person": "no-such-person"}`) and `out1`, wire `n4.output` to `out1.in` | pinned-entity-missing `n4`, `n4.person` |
| 18 | path-missing (story) | S0 with `e1.path` `entities/nobody.md` (no file) | path-missing `e1` |
| 19 | path-unsafe (story) | S0 with `e1.path` `entities/../secret.md` | path-unsafe `e1` |
| 20 | path-in-versions (story) | S0 with `s1.path` `drafts/.versions/ch01.md` | path-in-versions `s1` |
| 21 | unknown-edge-node (story) | S0 with `s1` without path and `e2` to node `ghost` | unknown-edge-node edge `e2` |
| 22 | entity-path-outside-entities (story) | S0 with `e1.path` `drafts/ch01.md` (the file exists) | entity-path-outside-entities `e1` |
| 23 | illegal-node-kind | add, after `out1`, the node `{"id": "x1", "kind": "scene", "label": "Scene", "position": {"x": 0, "y": 0}}` (no wire) | illegal-node-kind `x1` |
| C-ok-1 | control | R0 unchanged | `[]` |
| C-ok-2 | control | S0 unchanged | `[]` |
| C-ok-3 | control | a graph of `n5` (`gr_entity`, `person` `ada`) and `out1` | `[]` (the pinned entity `ada` exists; the file `entities/ada.md` is written for it) |

Each of rows 1 to 23 produces exactly one issue, the one its rule names, and the controls produce none. This is the strict reading of criterion 1 ("exactly that issue with the right ids"). The rows were checked by hand against P4 to P22: row 1 keeps `w1` and `w2` usable (P21), so no `missing-port`, `output-unwired` or `dead-step` follows from the unknown tool; row 3's `w3` is not usable, so `in1` is still wired and alive; row 9 leaves `n1` and `n2` on the cycle and `out1` fed by `n2`, so nothing is dead, and `n1` is the first node in node order that can reach itself (P8); rows 10 and 11 add a second output beside the intact R0, so no node is dead; rows 13 and 14 report the second occurrence and ignore it (P7); row 19's path starts with `entities/`, so the lexical outside rule does not fire (P12 step 3); row 23's node is left out by the pre-pass and has no wire (P22).

| Test | Criterion | Seam and fixture | Pass condition |
|---|---|---|---|
| **C2** `graph validation, C2: a save with a type-mismatched wire succeeds and lists an error for that wire` | "Saving a schema-valid recipe with a type-mismatched wire succeeds and the response lists an `error` issue for that wire." (unit line 28) | `POST /api/graph-runner/graphs/create` (`{name: "Chapter", view: "recipe"}`), then `POST .../chapter/save` with R0 whose `in1.params.type` is `entity` | Create answers 201 `{id: "chapter"}`. Save answers 200 with `issues` equal to exactly `[port-type-mismatch, error, edgeId w1, portId n1.topic]`. `graphs/chapter.json` on disk equals the canonical text of the body (`JSON.stringify(value, null, 2) + "\n"`). |
| **C3** `graph validation, C3: disabling a tool makes its nodes report disabled-tool` | "Disabling a tool in the registry makes its nodes report 'disabled tool'." (unit line 29) | Recipe RB: `in1` (text) with wires to `n1.topic` and `n2.topic`; `n1` and `n2` both `gr_text` (`words` 40); `out1` fed by `n1.output`, `out2` fed by `n2.output`. The tool is switched with `POST /api/tool-registry/tools/gr_text/enabled` `{enabled: false}`, then `{enabled: true}` | Validate of RB answers `[]`; after the switch off, `[disabled-tool n1, disabled-tool n2]` and nothing else; after the switch on again, `[]`. Each switch answers 200. |
| **C4** `graph validation, C4: the validate endpoint accepts an unsaved graph and writes nothing` | "The validate endpoint accepts an unsaved graph and writes nothing." (unit line 30) | Recipe R0 with `n1.tool` `gr_missing`, never saved. `snapshotLibrary(library)` (`invariant-sweep.ts` line 330) is taken after the tool files are written, the app is started and the session cookie is taken, immediately before the validate call | Validate answers 200 `{issues: [unknown-tool n1]}`. `snapshotLibrary` taken right after the call equals the snapshot before it. Then `GET /api/graph-runner/graphs` answers `{graphs: []}`. |

The events published by a catalog re-scan are not checked; the criterion is about files.

## 5. Downstream agreement

- **GRR-04, run engine core (`blocked_by` GRR-03, line 7).** Its run start must refuse with `GRAPH_VALIDATION_FAILED` when a blocking error exists (GRR-04 unit line 20; criterion line 32). A file with an illegal node kind never reaches it: `readGraph` refuses it with 422 `GRAPH_SCHEMA_INVALID` (P22). What it needs: `GraphRunnerService.issuesOf(graph)`, the same function that get, save and validate use, on the shape-parsed graph from `readGraph(id)` (GRR-02 P13). The refusal is `issues.some((issue) => issue.severity === 'error')`. GRR-04 adds no rule of its own. GRR-04 adds its providers to `graph-runner.module.ts`; the `ToolRegistryModule` import of P1 is already there, so GRR-04 adds no second import. The executor (`ExecutorService`) is exported by the same entry file (`tool-registry.module.ts` line 18 and line 63).
- **GRR-08, engine gate (`blocked_by` GRR-03, line 7).** Its criterion "every `/api/graph-runner` route is behind the guard; Setup & auth's invariant tests pass for them" (GRR-08 unit line 18) holds if the three invariant files pass after GRR-03 (step 10). The validate route has no `:` and needs no `FIXTURE_PATHS` entry. Its criterion "no import between `graph-runner` and `agent-loop`" (line 19) holds (step 4 grep).
- **GRR-11, tool nodes and wires, live validation (`blocked_by` GRR-03, line 7).** The canvas calls `POST /api/graph-runner/graphs/validate` with the unsaved graph (GRR-11 unit line 22). What it needs: the response `{issues}` (S2); `nodeId`, `edgeId`, `portId` to highlight the element (P8); `severity` to disable Run with the reasons (any `error`). Its palette lists `enabled && valid` from the list summaries (GRR-11 line 19), not from validate. The validate body is a graph the canvas builds, so the pre-pass of P22 does not change its normal flow; a recipe node with an illegal kind comes back as an `illegal-node-kind` issue with its `nodeId`. The validate endpoint needs an active project (P2); the canvas runs inside a project. Its client-side wire checks (line 21) are not GRR-03's.
- **GRR-06, output nodes (not in `unblocks`; it uses GRR-03's line 20 rule).** It must refuse the same kinds at run time: `UNWRITABLE_OUTPUT_KINDS` (P16) is exported for it. Its `blocked_by` (GRR-04, PST-15) is unchanged.
- **GRR-10, ngx-vflow adapter (`parallel_with` GRR-03, line 8).** It shows the save issues in a panel (GRR-10 line 21), which GRR-03 fills. Its byte-equivalence criterion (line 25) is unaffected: save writes the canonical text before it computes issues (S10). GRR-10 and GRR-03 change no path in common: GRR-03 changes only `apps/api/**`, and GRR-10 is web work (`apps/web/src/app/features/graph-runner/`, GRR-10 line 22).
- **GRR-09, graphs route and list (no plan, no branch; not in GRR-03's `parallel_with`).** Its list rows and its create, rename and delete calls are unchanged. Its `get` now carries issues (GRR-02 shape, unchanged). Its badge (GRR-09 line 15) is not GRR-03's (GRR-02 plan O1). If its planner adds API files under `apps/api/src/modules/graph-runner/`, that planner must rebase on this plan's changes to `graphs.controller.ts`, `graph-runner.service.ts` and `graph-runner.module.ts` (section 2).
- **GRR-02 (done).** Changed: `issuesOf` now does real work and the module gets one import and one provider. K1 to K4 pass unchanged (P18); K4's GETs stay side-effect free because the validator only reads.
- **GRR-01 (done).** No contract change: O1 is decided with option (a) (P22), which C13 (GRR-01 plan line 92) leaves to GRR-03; the rest of the validate body is still parsed with `graphFileShapeSchema` (GRR-01 section 5, GRR-03 (b)). The rules use its codes (S2), its shape schema (S7) and its route constant (S6).
- **TRG-11 (done) and the Tool registry.** GRR-03 uses `entry`, `enabledOf`, `validate` in params mode and the `TOOL_NOT_FOUND`, `TOOL_INVALID` and `TOOL_ARGS_INVALID` codes, all as published (TRG-11 plan section 5, GRR-03 row). No tool-registry file changes.
- **Draft and planned plans (`plans/SAU-22.md` draft, line 3; `plans/TRG-14.md` planned, line 3).** Neither changes a path of section 2. SAU-22 changes the platform env, the request policy, `setup-auth.guard.ts`, `bootstrap.ts`, `package.json`, `README.md` and its own tests (SAU-22 lines 82 to 91). TRG-14 changes `apps/web/**` and `e2e/specs/tools-editor.e2e.ts` and states that `apps/api/**` does not change (TRG-14 line 95). Both merge orders give the same tree. The only effect of SAU-22 on GRR-03's tests is the guard, which the tests run with dev mode off (default), so the same behaviour is seen.
- **Other plans and in-progress branches.** `grep -l "^status: \(draft\|planned\)" plans/*.md` finds only those two. The unit branches of `git branch --list 'unit/*'` at `944590d` are `unit/PST-15`, `unit/PST-17`, `unit/SAU-13`, `unit/TRG-07`, `unit/TRG-14` (and two old backups). `git diff --name-only main...unit/<ID>` for each names none of the GRR-03 paths of section 2 (no graph-runner file, no `invariant-sweep.ts`, no `app.module.ts`, no tool-registry catalog or validate file). `unit/TRG-14` changes 11 files, none of them in the GRR-03 list. Step 0 repeats this check.

## 6. Open points

No point is open. O1 and O2 were decided by the reviser on 2026-11-17; neither decision changes a criterion, a unit, a module file or the contract. The planner's text is kept below, followed by each decision.

1. **O1 (decided by the reviser: option (a), implemented as the pre-pass of P22): how `illegal-node-kind` is produced.** The rule is in the unit (line 20, first item) and in the contract (`constants.ts` line 75). It cannot be produced now: `recipeNodeSchema` (`graph.ts` line 88) and `storyNodeSchema` (line 39) are discriminated on `kind`, and `graphFileShapeSchema` (line 174) refuses a node whose kind the view does not allow, so the rules never see the node. The validate route answers 422 first (P3). Criterion 1 (unit line 27) needs a fixture that produces the issue. Options:
   - (a) The validate route parses the body with a GRR-03 local schema that accepts any string as a node kind; the rules report `illegal-node-kind` (error, `nodeId`) and skip that node; other shape errors stay 422. The contract is unchanged. Get and save still refuse such a file with 422.
   - (b) As (a), but the lenient schema is published in `packages/contracts/src/graph-runner/graph.ts` as an expand change. This changes a contract file that the unit does not list, and GRR-01 is done.
   - (c) The validate route maps the Zod failure on a node `kind` (the discriminator error of the shape parse) to `illegal-node-kind` (error, `nodeId`) and answers 200 with that issue. The other shape failures stay 422. The contract is unchanged. Under (c) the rest of the graph is not checked when a kind is illegal, because the body does not parse; under (a) it is.
   - (d) No route produces the issue. The code stays unused, and criterion 1 cannot be met as written for this rule. Only the Navigator can change a criterion.
   Blocked: row 23 of the C1 table only. The rest of the plan does not depend on the answer.
   **Decision: (a), without a second schema.** Reason: GRR-01 plan C13 (line 92) leaves "how it produces that issue" to GRR-03, so this is a plan choice, not a Navigator point. (a) and (c) keep criterion 1 and the contract as written; (b) changes a contract file of a done unit and (d) leaves criterion 1 unmet, so both are out. (a) is chosen over (c) because (c) depends on the path and code of Zod's discriminator issue (a library detail) and skips every other rule of the body, whereas (a) checks the rest of the graph. A second, lenient copy of the recipe schema is not needed: the pre-pass (P22) removes the illegal nodes from a copy of the body, and the rest is parsed with the contract's `graphFileShapeSchema` as before (S7). Effects: no change for GRR-04 (it reads files, which never hold an illegal kind), GRR-08 (no new route beyond validate) or GRR-11 (it gets one more issue with a `nodeId` to highlight).
2. **O2 (decided by the reviser: option (a)): duplicate ids in a story graph.** The unit lists `duplicate ids` as a recipe error (line 20) and lists only path and edge warnings for stories (line 22: "Story graphs — warnings only"). A story file with a repeated id is refused on save (GRR-02 S4), but a hand-edited one is readable. Options: (a) the literal reading: no issue for a story (planned default; the tests do not cover it); (b) a `duplicate-id` warning for a repeated story node or edge id (adds a story warning the unit does not list). Blocked: nothing in section 4 (the default is implemented).
   **Decision: (a).** Reason: unit line 22 gives the complete list of story checks ("warnings only") and does not name duplicate ids; line 20 puts them under recipe errors. (b) would add a story rule that no unit, criterion or downstream unit asks for (GRR-09, GRR-10, GRR-11 and GRR-14 do not read story issues by code), and the save refuses a story with a repeated id anyway (GRR-02 S9, `graphFileSchema`). P7 is the rule: a later story occurrence is ignored and not reported.

Points decided by this plan with the simplest option are P2 (active project), P4 (an invalid tool is unknown), P7 (first occurrence rule), P9 (dead steps: tool nodes and wired input nodes), P21 (usable wires), P22 (illegal-kind pre-pass), P11 (style values count as entities), P12 (path order), P15 (issue order), P19 (every params issue is `tool-params-invalid`) and P20 (enable route in the test).

## 7. Review parts

One part. The plan is one set of pure rules, one validator, one route and one test file, and every test needs all of them: C1 and C4 call the validate route, C2 calls save, and C3 calls validate after a registry switch, so no group of steps can be checked by its own tests alone.

| Part | Steps | Tests (criteria) |
|---|---|---|
| R1 | 0 to 14 (preconditions, baseline, pure rules, validator, service, controller, module, tests, format, test runs, mutation evidence, root gates, commit, record) | C1 (criterion 1, rows 1 to 23 and the three controls), C2 (criterion 2), C3 (criterion 3), C4 (criterion 4) |

The reviewer of R1 checks:
- the rule table of section 2a against the unit lines 20 to 22 and the 22 codes of `constants.ts` (every code appears once);
- each fixture row of section 4 by hand against P4 to P22: the change to R0 or S0 and the one expected issue;
- that `graph-validation.ts` imports nothing from Nest or the other modules, and that `splitIllegalKinds` does not mutate its argument;
- the outputs of steps 3, 5, 7, 10, 11 (M1 to M4) and 12.

## 8. Facts

### 8a. Checked on main `944590d` (file and line)

Unit and module:
- `units/GRR-03-validation.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); body lines 12 to 30; Decisions 18 to 24; criteria 27 to 30. No change note.
- Inverse of `blocked_by` (`units/README.md` lines 63 to 65): `GRR-03` appears in `blocked_by` of GRR-04 (`units/GRR-04-run-engine-core.md` line 7), GRR-08 (`units/GRR-08-engine-gate.md` line 7) and GRR-11 (`units/GRR-11-tool-nodes-wires.md` line 7). `parallel_with` is symmetric: GRR-02 (`units/GRR-02-graph-crud.md` line 8) and GRR-10 (`units/GRR-10-vflow-adapter.md` line 8) name GRR-03.
- `modules/graph-runner.md`: line 14 (GRR-03 in the dependency graph), 32 (parallelism), 40 (active project), 41 (HTTP), 42 (validation in one place), 43 (`GRAPH_` codes), 45 (design choices), 49 to 55 (testing).
- `units/README.md` line 139 (testing: external behaviour; unit tests never read `examples/`).
- Blockers: `plans/GRR-01.md` line 3 (`status: done`), `plans/TRG-11.md` line 4 (`status: done`), `plans/GRR-02.md` line 3 (`status: done`). Git: `0eaedd0 feat(GRR-02)` on main.

Contract (`packages/contracts/src/graph-runner/`):
- `constants.ts`: `INPUT_NODE_OUTPUT_KEY` line 25 (`out`), `OUTPUT_NODE_INPUT_KEY` line 28 (`in`), `TOOL_NODE_OUTPUT_KEY` line 31, `GRAPH_ID_PATTERN` line 22; `GRAPH_ERROR_ISSUE_CODES` with the rule of each code, lines 72 to 105; `GRAPH_WARNING_ISSUE_CODES`, lines 107 to 128; `GRAPH_ISSUE_CODES`, lines 130 to 134.
- `issues.ts`: `validationIssueSchema` lines 13 to 21; `validationResultSchema` lines 24 to 27 (strict object `{issues}`).
- `graph.ts`: `portIdSchema` line 22; `storyNodeSchema` line 39; `recipeNodeSchema` line 88; `recipeWireSchema` line 111 (strict, no relation); `recipeGraphShapeSchema` line 127; `graphFileShapeSchema` line 174; `graphFileSchema` line 183.
- `routes.ts` line 8: `GRAPH_VALIDATE_ROUTE` (`/api/graph-runner/graphs/validate`).

Tool registry (`packages/contracts/src/tool-registry/` and `apps/api/src/modules/tool-registry/`):
- `packages/contracts/src/tool-registry/views.ts`: `portInputSchema` lines 12 to 18 (`key`, `type`, `list`, `required` line 16, `title`); `portOutputSchema` lines 22 to 27 (`type` literal `'text'` line 24, `kind`); `portDescriptorSchema` lines 41 to 46 (`inputs`, `output`, `params` line 44); the derivation comment lines 29 to 40 (element type line 38).
- `packages/contracts/src/tool-registry/errors.ts`: codes lines 7 to 10 (`TOOL_NOT_FOUND`, `TOOL_DISABLED`, `TOOL_INVALID`, `TOOL_ARGS_INVALID`); statuses lines 40 to 45 (`TOOL_NOT_FOUND` 404, `TOOL_INVALID` 422, `TOOL_ARGS_INVALID` 422); `toolArgsIssueSchema` lines 56 to 61; `ToolArgsInvalidDetails` lines 63 to 68.
- `packages/contracts/src/tool-registry/call.ts`: validate request lines 33 to 37 (`mode` required); validate result lines 40 to 44 (`arguments`, `entityRefs`); `toolOutputSchema` lines 64 to 67.
- `packages/contracts/src/tool-registry/constants.ts`: `OUTPUT_KINDS` lines 17 to 23 (`draft`, `entity`, `claims`, `graph`, `check`).
- `packages/contracts/src/tool-registry/catalog.ts`: `toolSummarySchema` lines 26 to 37 (`enabled` line 30, `valid` line 33); `toolEnabledRequestSchema` lines 80 to 83.
- `apps/api/src/modules/tool-registry/tool-registry.module.ts`: entry re-exports lines 16 to 23 (`CatalogService`, `ExecutorService`, types); `exports` line 63.
- `apps/api/src/modules/tool-registry/catalog.service.ts`: `enabledWith` line 83; `summaryOf` line 95; `list` line 189; `entry` lines 303 to 306; `ports` lines 309 to 311 (`this.entry(name).views.ports`); `enabledOf` lines 315 to 317; `validate` lines 338 to 341; `refresh()` called by `list`, `entry`, `functions`, `validate` (TRG-11 plan section 9a).
- `apps/api/src/modules/tool-registry/packs.ts`: `LoadedTool` lines 35 to 39 (`spec`, `source`, `origin`, `views`); `userToolsDir` lines 88 to 90 (`<booksDir>/.scriba/packs/user/tools`).
- `apps/api/src/modules/tool-registry/validate.ts`: `compileTool` lines 56 to 80 (params validator without port keys, line 69); `validateArguments` lines 84 to 136: params mode drops port keys lines 93 to 99; Ajv issues lines 101 to 105; entity and style values checked as entity ids lines 107 to 132; throws at line 133; `argsInvalid` line 219 builds the details `{issues}` at line 242.
- `apps/api/src/modules/tool-registry/tools.controller.ts`: enable route lines 98 to 106.
- Built-in tool folder: `tool-registry.module.ts` lines 28 and 29 say the built-in packs are under `SCRIBA_PACKS_DIR`, and `apps/api/test/create-test-app.ts` line 81 sets it to `join(library, 'packs')`, so a temp library has no built-in tools unless a test writes them.
- `apps/api/test/tool-registry-loader.test.ts`: `toolYaml` lines 113 to 133.
- Behaviour of disabled tools: `plans/TRG-09.md` lines 118 and 120; `plans/TRG-11.md` line 119 (section 5, GRR-03 row), line 136 (section 7 point 7), section 7 point 5 (line 134: re-scan and `catalog-changed`).

Project store:
- `apps/api/src/modules/project-store/project-store.module.ts` lines 24 to 32 (entry exports: `ProjectStoreService`, `FilesService`, `EntitiesService`, `EntityManifest`, `SearchService`, `PendingService`, `ProjectsService`, type `ResolvedProjectPath`).
- `project-store.service.ts`: `resolvePath` line 46; `activeId` line 51.
- `files.service.ts`: `readFileAt` lines 135 to 147 (not a file, or missing: `PROJECT_NOT_FOUND` lines 140 to 141; too large: `PROJECT_FILE_TOO_LARGE` lines 143 to 145); `read` lines 257 to 270 (`resolvePath` then `readFileAt`; `PROJECT_NOT_TEXT` on decode).
- `apps/api/src/modules/project-store/path-safety.ts`: `PATH_MESSAGES` lines 21 to 34; `fail` lines 45 to 47; `resolveProjectPath` line 118; the `..` refusal line 138 (`PROJECT_PATH_INVALID`).
- `packages/contracts/src/project-store/errors.ts`: codes lines 6 to 11 (`PATH_INVALID`, `PATH_OUTSIDE`, `PATH_RESERVED`, `NOT_FOUND`, `NOT_TEXT`, `FILE_TOO_LARGE`), line 16 (`NO_ACTIVE`).
- `packages/contracts/src/project-store/constants.ts` lines 17 to 20: `RESERVED_PATH_PREFIXES` (`.scriba/`, `drafts/.versions/`).
- `apps/api/src/modules/project-store/entities.service.ts`: `resolve` lines 36 to 60; `code: 'unknown'` at lines 44 and 59; `code: 'duplicate'` at lines 48 to 53.
- `apps/api/src/modules/project-store/entity-manifest.ts`: the entity id is the front-matter `id` or the file stem (lines 304 to 305); a missing type is refused (line 29).
- `apps/api/src/modules/platform/errors/module-error.ts` lines 2 to 5: `ModuleError` with `code`, `status`, `details`.

Graph runner on main (GRR-02):
- `apps/api/src/modules/graph-runner/graph-runner.module.ts` lines 9 to 13 (imports `PlatformModule`, `ProjectStoreModule`; providers `GraphRunnerService`).
- `graph-runner.service.ts`: `list` lines 97 to 104; `get` lines 107 to 110 (calls `issuesOf`); `readGraph` lines 113 to 117; `create` lines 120 to 142; `save` lines 145 to 154 (writes at line 149, `issuesOf` at line 153); `rename` lines 157 to 173; `delete` lines 176 to 180; `issuesOf` lines 182 to 186 (stub, `eslint-disable` line 183); `activeProjectId` lines 189 to 199; `requireGraph` lines 217 to 226; `checkValue` lines 250 to 264.
- `graphs.controller.ts`: class lines 25 to 67; `save` lines 47 to 51 (`@Body() body: unknown`, no pipe). No validate route yet.
- `apps/api/src/app.module.ts` lines 16 to 17 (import of `GraphRunnerModule`) and line 27 (`COMPOSED_MODULES`).
- `apps/api/test/graph-runner-graph-crud.test.ts` lines 1 to 14 (imports: `createTestApp`, `send`, `sessionCookie`, `LOOPBACK_HOST`, `snapshotLibrary`, `bookLibrary`, `putFile`, `postJson`).
- `apps/api/test/invariant-sweep.ts`: `LOOPBACK_HOST` line 38, `LOOPBACK_ORIGIN` line 39, `snapshotLibrary` line 330 (fingerprints of every file and folder, with settings bytes), "No fixture path for route template" line 256 (`concretePath`).
- `apps/api/test/project-store-files.kit.ts`: `bookLibrary` lines 44 to 46; `putFile` line 70.
- `eslint.config.mjs`: R1 line 50, R2 line 69.

Decisions and plans:
- `plans/DECISIONS.md`: entries naming GRR-03 at lines 2978 to 2989 (TRG-01 revision 1, items 2 and 8), 3345 to 3352 (TRG-01 revision 2, item 4), 3403 to 3407 (valueType: GRR-03 unchanged), 3409 to 3413 (unreadable files: GRR-03 unchanged), 5144 to 5161 (GNP-04 and GNP-07; GRR-03 line 20 cited at 5153 and 5155). Found by `grep -n "GRR-03" plans/DECISIONS.md`. No other entry names it.
- `plans/GRR-01.md` lines 81 (C2), 84 (C5), 89 (C10), 90 (C11), 92 (C13), 237 (section 5, GRR-03).
- `plans/GRR-02.md` S2 (line 14), S4 (16), S10 (22), S16 (28), P2 (33), P5 (36), P8 (39), P10 (41), P13 (44), section 4 (lines 121 to 133).
- `units/GRR-06-output-nodes-pending-changes.md` line 22 (claims and check not writable, validation error, GRR-03).
- `units/GRR-04-run-engine-core.md` lines 18 to 25 (line 20: `GRAPH_VALIDATION_FAILED`); `units/GRR-08-engine-gate.md` lines 17 to 19; `units/GRR-11-tool-nodes-wires.md` lines 18 to 22 and 25 to 28 (line 19: palette `enabled && valid`); `units/GRR-10-vflow-adapter.md` lines 21 and 25; `units/GRR-09-graphs-route-list.md` line 15 (badge).
- Draft and planned plans (`grep -l "^status: \(draft\|planned\)" plans/*.md` finds only these two): `plans/SAU-22.md` line 3 (`status: draft`), lines 82 to 91 (changed paths); `plans/TRG-14.md` line 3 (`status: planned`), line 95 (`apps/api/**` does not change), lines 99 to 110 (changed paths).

Checked by the reviser on main `45f0496` (2026-11-17):
- `git diff --stat 944590d 45f0496`: only `plans/GRR-03.md`, so the line numbers above hold. `git status`: clean.
- `packages/contracts/src/graph-runner/constants.ts` line 16 (`RECIPE_NODE_KINDS`), line 19 (`NODE_ID_PATTERN`); `graph.ts` lines 39 to 61 and 88 to 108 (both unions discriminated on `kind`), lines 170 to 177 (the shape schema's comment: detail and validate use it); `plans/GRR-01.md` line 92 (C13: GRR-03 decides how it produces `illegal-node-kind`), line 237 (section 5 (a) and (b)).
- `packages/contracts/src/project-store/files.ts` line 9: `fileReferenceSchema` is `z.string()`, so a story path with `..` or into `drafts/.versions/` passes the shape parse and reaches the rules (rows 19 and 20).
- `apps/api/src/modules/tool-registry/validate.ts` line 37: Ajv with `allErrors: true, useDefaults: true` (row 8 gives one issue for the one missing setting, which has no default); lines 96 to 99 drop port keys in params mode (row 6 and row 17 give no params issue).
- `apps/api/src/modules/tool-registry/inputs.ts` line 124: a port is `x-scriba-port: true`; lines 141 and 142: `isEntity` and `isStyle` from `x-scriba-type`.
- `apps/api/src/modules/tool-registry/catalog.service.ts` lines 303 to 341 and `entities.service.ts` line 36, `files.service.ts` line 258: every call the validator makes is synchronous, as `issuesOf` is (`graph-runner.service.ts` line 184).
- `apps/api/test/project-store-projects.kit.ts` lines 44 to 48: the fixture library's project is the folder `book/` (genre pack `nonfiction`), so `putFile` paths are `book/...`.
- `apps/api/test/graph-runner-graph-crud.test.ts` lines 57 to 77 (`withGraphApp`, one app per test), line 142 (the only `issues` assertion: an array).
- `packages/contracts/src/project-store/errors.ts` line 69 (`PROJECT_NO_ACTIVE: 409`); `packages/contracts/src/graph-runner/errors.ts` lines 41 and 44 (409 and 422).
- `apps/api/test/invariant-sweep.ts` lines 141 to 152: `FIXTURE_PATHS` has the four `:id` graph routes; the validate route has no `:`.
- Branches `unit/PST-15`, `unit/PST-17`, `unit/SAU-13`, `unit/TRG-07`, `unit/TRG-14`: `git diff --name-only main...unit/<ID>` names no path of section 2 and none of the files the validator reads (`files.service.ts`, `entities.service.ts`, `entity-manifest.ts`, `path-safety.ts`, `catalog.service.ts`, `validate.ts`, `inputs.ts`, `tools.controller.ts`) or the test kits it uses. No `plans/GRR-04.md`, `GRR-08.md`, `GRR-09.md`, `GRR-10.md` or `GRR-11.md` exists; no `unit/GRR-*` branch exists.
- `plans/SAU-22.md` lines 82 to 91 and `plans/TRG-14.md` line 95: no path in common with section 2 (confirmed).

### 8b. ASSUMED (not checked here; the step named checks it)

- A1. Node 26 and npm 11 are the runtime (as in GRR-02 A1). Step 1.
- A2. The baseline of `npm test -w @bbartolome/scriba-api` passes on main. Step 2.
- A3. Ajv's required-property error for a missing setting makes `validate` throw `TOOL_ARGS_INVALID` with at least one issue (read in `validate.ts` lines 84 to 136 and 219 to 245; not run). Step 10 (row 8).
- A4. The four YAML tools of the common fixtures, written as in `toolYaml` plus the extra input and setting, are valid under TRG-06 (`valid: true`). The C1 precondition checks it; if not, the YAML is corrected, not the rules.
- A5. An entity file `entities/<id>.md` with front matter `type: person` is an entity of the Project store (the type rule is `entity-manifest.ts` line 29; the file is parsed by the manifest; not run). Row 17 control and row 22's file.
- A6. `files.read` on a folder answers `PROJECT_NOT_FOUND` (`readFileAt` lines 140 to 141: `!stats.isFile()`), so a folder path is `path-missing`. Row 18 does not test a folder; the rule is read, not run.
- A7. The validate route's cost (repeated catalog re-scans per tool node, one `resolve` per validate call, one `files.read` per story path) is small for the sizes in the tests. Not measured.
- A8. `snapshotLibrary` (`invariant-sweep.ts` line 330) detects a new graph file and any changed byte of an existing file. Step 10 and C4.
- A10. The entity manifest of `book` lists `entities/ada.md` (front matter `type: person`) as the entity `ada` under the genre pack `nonfiction`, and resolving `no-such-person` gives `code: 'unknown'` (rows 17 and C-ok-3). Step 10.
- A9. A user tool whose YAML is written before the app starts is listed by the catalog without a restart (`refresh()` re-scans the user folder on each call, TRG-11 plan section 9a). Checked by reading only.
