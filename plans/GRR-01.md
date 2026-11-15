---
id: GRR-01
status: draft
---
# GRR-01 plan — graph-runner contract slice (closes Graph runner phase:contract)

Unit: GRR-01 (module graph-runner, phase:contract, M4, lands in wave 1). `units/GRR-01-contract-slice.md`: front matter lines 2 to 9, body lines 12 to 39. Revision 1, status draft, written at main `0495afc`. Nothing is implemented and nothing is reviewed. Line numbers in this plan refer to `0495afc`.

Blockers, all done: PLT-11 (`plans/PLT-11.md` line 3, `status: done`), TRG-01 (`plans/TRG-01.md` line 3, `status: done`), PST-01 (`plans/PST-01.md` line 3, `status: done`).

Scope in one line: one new Zod slice, `packages/contracts/src/graph-runner/`, with shapes and constants only, its contract tests, and two example files. No other module, no app, no package config changes.

## 1. Decisions this plan follows

### 1.1 Settled decisions (from the unit and the module) and where the plan obeys them

| # | Decision | Source | Obeyed by |
|---|---|---|---|
| D1 | Zod and TS, shapes and constants only. Imports port types only from `/tool-registry`, file and entity references only from `/project-store`, the envelope only from `/platform` | unit line 14 | section 2 (imports of each file); test E12 (no function exported) |
| D2 | Graph file `{schemaVersion, view, name, nodes, edges}`; discriminated union on `view`; unknown keys rejected; `schemaVersion: 1` | unit line 17 | `graph.ts`: strict objects, `z.literal(GRAPH_SCHEMA_VERSION)` |
| D3 | Node id pattern `^[a-z0-9][a-z0-9-]*$` (no dots); node ids and edge ids unique within a graph | unit line 18 | `NODE_ID_PATTERN`; uniqueness in `graphFileSchema` (choice C2) |
| D4 | Story node `{id, kind, label, path?, position: {x, y}}`; kinds `entity`, `scene`, `beat`; `path` is project-relative | unit line 19 | `storyNodeSchema` |
| D5 | Recipe node `{id, kind, position, tool?, params?}`; kinds `input`, `tool`, `output`; `tool` required on tool nodes and forbidden on the others; input params `{type, label, entityKind?}`; output params `{label?, path?}`; tool params are settings plus pinned port values | unit line 20 | `recipeNodeSchema`, `inputParamsSchema`, `outputParamsSchema`, `toolParamsSchema` |
| D6 | Legal kinds per view are constants; no kind is legal in both views | unit line 21 | `STORY_NODE_KINDS`, `RECIPE_NODE_KINDS` (test E1) |
| D7 | Edge `{id, from, to, relation?}`. Story: node ids, free-text `relation`. Recipe: a wire between port ids, `relation` forbidden | unit line 22 | `storyEdgeSchema`, `recipeWireSchema` |
| D8 | Port id `<nodeId>.<key>`, split on the first dot. Input node output key `out`; output node input key `in`; tool output key from the Tool registry | unit line 23; module line 45 | constants; `portIdSchema` (test E5) |
| D9 | Relation vocabulary `order` (from precedes to), `causality` (from causes to), `containment` (from contains to); any other non-empty string allowed; Compile & export reads only `order` | unit line 24 | `RELATION_VOCABULARY`; `storyEdgeSchema` (test E3) |
| D10 | CRUD shapes: summary `{id, name, view, nodeCount, mtime, valid}`; create `{name, view}`; save is the whole file; rename `{name?} or {newId?}`; validation issue `{code, severity, nodeId?, edgeId?, portId?, message}`; issue codes | unit line 25 | `catalog.ts`, `issues.ts` (tests E2, E6, E7) |
| D11 | Run start `{graphId, inputs: {[inputNodeId]: InputValue}, target?: {nodeId}, targets?: {[outputNodeId]: path}}` returns `{runId}`; stop `{runId}`; `InputValue` has four kinds | unit line 26; GRR-05 line 19 | `runs.ts` (test E9) |
| D12 | Run state `{runId, graphId, target?, status, reason?, startedAt, endedAt?, inputs, targets, nodes, pendingChangeIds}`; input values carry no file contents | unit line 27 | `runStateSchema` (test E9) |
| D13 | Node-run-status exactly `idle, queued, running, done, error, stopped`; run status exactly four | unit line 28 | `NODE_RUN_STATUSES`, `RUN_STATUSES` (test C4) |
| D14 | SSE members of module `graph-runner`: `run-started` (run state), `node-status` `{runId, nodeId, status, result?, error?}` (result is a tool result or an output result), `run-ended` `{runId, status, reason?}` | unit line 29; GRR-06 line 50 | `events.ts` (test E10) |
| D15 | Run-log entry union for `logs/recipe-runs/<runId>.jsonl`: run start, node status, tool call (validated arguments, output, sourcesUsed), error, pending change, run end | unit line 30; GRR-07 line 76 | `log.ts` (test E10) |
| D16 | Routes and the `GRAPH_*` codes: `/api/graph-runner/graphs` (list, get, create, save, rename, delete, validate) and `/api/graph-runner/runs` (start, stop, current run state); reads are GET, commands are POST; the ten codes | unit line 31; module lines 41 and 43 | `routes.ts`, `errors.ts` (test E8, E11) |
| D17 | Example fixtures: one story graph and one recipe file, used by contract tests | unit line 32 | `test/fixtures/graph-runner/` (choice C16) |
| D18 | Acceptance criteria 1 to 5 | unit lines 35 to 39 | section 4 |
| D19 | The story graph is never run; all file access goes through the Project store; validation rules live only on the server | module lines 39, 40, 42 | no runner code here; `graph.ts` keeps file rules out of the schema (choice C3) |
| D20 | Graph id is the file stem; node ids are slugs; fixed port keys `out` and `in`; pinned port values live in `params`; logs in `logs/recipe-runs/` | module line 45 | constants; `toolParamsSchema`; `RUN_LOG_FOLDER` |
| D21 | Contract tests run Vitest over the Zod schemas with the example graph files; unit tests never read `examples/`; external behaviour only | module lines 49, 51, 55 | section 4; fixtures under `test/fixtures/` |
| D22 | Contracts change by expand-contract once published; persisted formats carry their own `schemaVersion` | `units/README.md` line 133 | the graph file carries `schemaVersion` (D2) |

### 1.2 Facts checked on main (file and line)

Unit and conventions:
- `units/GRR-01-contract-slice.md`: front matter lines 2 to 9 (`blocked_by` line 7: PLT-11, TRG-01, PST-01; `unblocks` line 9: GRR-02, GRR-03, GRR-10, GRR-16, PLT-21, AGL-13, CEX-01, CEX-06, GNP-04, GNP-18). The file ends at line 39. It has no change notes (the last commit touching it is a move, `2963a22`).
- Inverse rule (`units/README.md` line 64): `grep -rn "GRR-01" units/*.md` finds exactly these ten units with GRR-01 in `blocked_by` (line 7 of each): GRR-02, GRR-03, GRR-10, GRR-16, PLT-21, AGL-13, CEX-01, CEX-06, GNP-04, GNP-18. The `unblocks` list of GRR-01 matches them.
- Blockers: `plans/PLT-11.md`, `plans/TRG-01.md` and `plans/PST-01.md` each have `status: done` at line 3.
- `units/README.md` line 136 (testing: external behaviour only); line 133 (expand-contract).

Current slice on main:
- `packages/contracts/src/graph-runner/index.ts` line 1: `export {};` (placeholder, created by PLT-02).
- `packages/contracts/package.json`: `./graph-runner` export lines 30 to 33 (types and default into `dist/graph-runner/`); `build` line 48; `test` line 49; `dependencies.zod` `^4.6.7` line 53; `devDependencies["@types/node"]` line 56.
- `packages/contracts/node_modules/zod` version 4.6.7 (checked). It is the copy the package resolves.
- `packages/contracts/tsconfig.json` line 4: `"types": ["node"]`. `tsconfig.build.json` lines 8 to 13: `rootDir` `src`, `outDir` `dist`, `declaration` true.
- Platform (`packages/contracts/src/platform/`): `events.ts` lines 19 to 25 (base envelope `sseEnvelopeSchema`: `module` is `z.enum(PUBLISHING_MODULE_SLUGS)`, `type` matches the kebab pattern, `data: z.unknown()`; lines 19 and 20 say `data` is required); `errors.ts` lines 73 to 83 (`ERROR_CODE_PREFIXES` includes `GRAPH`); line 90 `errorCodeSchema`; `slugs.ts` lines 138 to 147 (`PUBLISHING_MODULE_SLUGS` includes `graph-runner`, line 145).
- Tool registry (`packages/contracts/src/tool-registry/`): `constants.ts` line 36 `PORT_TYPES` (`text`, `entity`, `style`), line 39 `OUTPUT_PORT_KEY` (`output`); `spec.ts` line 18 `portTypeSchema`; `views.ts` lines 12 to 18 `portInputSchema`, lines 22 to 27 `portOutputSchema`, lines 41 to 46 `portDescriptorSchema`; `call.ts` line 84 `toolArgumentsSchema`, lines 141 to 145 `toolOutputSchema` (`kind`, `content`), lines 148 to 152 `toolCallResultSchema` (`output`, `sourcesUsed: entityRefSchema.array()`); `call.ts` line 2 imports from `../project-store/index.js` (the cross-slice import form); `errors.ts` lines 39 to 50 `TOOL_ERROR_STATUS` (the per-code status map this plan copies); `events.ts` lines 91 to 95 (the `sseEnvelopeSchema.extend` member pattern this plan copies).
- Project store (`packages/contracts/src/project-store/`): `files.ts` line 17 `projectPathSchema` (`z.string()`); lines 15 and 16 say path rules belong to the module's path function, not to the contract; lines 19 and 20 `fileReferenceSchema` (`z.string()`, with the comment that the graph runner imports it under this name); line 23 `contentHashSchema`; `entities.ts` line 104 `entityRefSchema`; `constants.ts` line 4 `ENTITY_ID_PATTERN`; `pending.ts` lines 15 and 16 (`recipe-run` origin `{runId, graphId, nodeId}`); line 38 pending change `id` is a non-empty string.
- Earlier plans on the same slice: `plans/TRG-01.md` line 188 (the C4 row for the graph runner: port types, output key, routes) and line 222 (the GRR-01 row: this slice imports port types only from `/tool-registry`; the node result is `toolCallResultSchema`; the run-log tool call is `toolOutputSchema`; the slice imports nothing from `/graph-runner`). `plans/PST-01.md` line 53 (`fileReferenceSchema` is a `z.string()` second export) and line 161 (GRR-01 row: file and entity references come from project-store; pending ids are strings).
- Tests already present: `packages/contracts/test/boot.test.ts` line 12 and `test/fixtures/nest-style/consumer.cjs` line 14 already list `graph-runner`. Pattern for the export test: `test/tool-registry.exports.test.ts` lines 15 and 16 (`ALLOWED_FOLDERS`), lines 22 to 111 (names list), from line 147 (CJS consumer, loaded folders, specifier check).
- Consumers of the subpath on main: `apps/web/src/contracts-boot.ts` line 10 (namespace import; the file is a build-time check, lines 1 to 3). `apps/web/angular.json` lines 51 to 56: the `contracts-boot` configuration, `budgets: []`, `allowedCommonJsDependencies: ["@bbartolome/scriba-contracts"]`. `plans/DECISIONS.md` line 1040: the production build has no `scriba-contracts` in its bundle. No file in `apps/` or `e2e/` imports `@bbartolome/scriba-contracts/graph-runner` except `contracts-boot.ts`. `apps/api` does not import it yet.
- Lint and format: `eslint.config.mjs` lines 69 to 106 (rule R2: agent-loop and graph-runner never import each other). Root `package.json` line 23 (`build`), line 25 (`test`), line 26 (`lint`). `.prettierignore` lists `/units/`, `/modules/`, `/plans/` and `/package-lock.json`, so the JSON fixtures under `packages/contracts/test/` are checked by `prettier --check .`.
- Module `modules/graph-runner.md`: line 37 (ownership), 39 (story graphs never run), 40 (file access through Project store), 41 (HTTP routes), 42 (validation in one place), 43 (GRAPH_ codes), 45 (design choices), 49 and 51 (testing seams), 55 (unit tests never read examples).
- Precedent for two decisions below: `plans/DECISIONS.md` line 3409 (TRG-01, unreadable files keep a list row with nullable fields, option A) and lines 602 and 726 (criteria that cannot run without a remote are left unticked, PLT-11 and PLT-13).
- Other plans with status draft or planned: `plans/SAU-09.md` line 65 (only the setup-auth paths change; `packages/contracts` does not change), `plans/SAU-10.md` lines 62 and 85 (only apps/api paths; `packages/contracts/**` not changed), `plans/MPR-08.md` line 50 (two paths: an apps/api test and `modules/providers.md`), `plans/TRG-03.md` line 47 (three apps/web paths). None names a path that GRR-01 changes (section 5b).

Downstream units (what they need from this slice): section 5.

Toolchain and Zod probes (run at planning time, with `node -e` against `packages/contracts/node_modules/zod`, no file written):
- Node `v26.13.0`, npm `11.20.0`.
- Zod 4.6.7: (a) the parsed object's keys follow the schema's shape order, not the input's order; (b) a `superRefine`d `z.strictObject` works as a member of `z.discriminatedUnion`; (c) a `z.strictObject` refuses an unknown key; (d) `z.number()` refuses `Infinity` and `NaN`; (e) `z.literal(1)` refuses `2`; (f) `z.iso.datetime()` accepts a `Z` timestamp; (g) `z.record(regex, ...)` refuses a key that does not match; (h) the platform `errorCodeSchema` pattern accepts `GRAPH_VIEW_NOT_RUNNABLE`; (i) `z.union([strictObject({name}), strictObject({newId})])` accepts exactly one of the two keys and refuses both or `{}`; (j) an envelope object with a `z.unknown()` key and no `data` key is refused (matches PLT-02).

### 1.3 Small choices made by this plan (names, layout, shapes the unit leaves open)

- **C1 Names.** The names are in section 2. Each schema is named `<thing>Schema` and each type `z.infer` of it, as in the other slices.
- **C2 Uniqueness, two schemas.** `graphFileSchema` refuses a duplicate node id or edge id (D3). `graphFileShapeSchema` is the same schema without that rule. Save and the list's validity use `graphFileSchema`. The detail (GET) and the validate request use `graphFileShapeSchema`, so GRR-03 can report `duplicate-id` (GRR-03 line 49) on a file that is open in the canvas.
- **C3 Paths.** A story or recipe path is `fileReferenceSchema` (a string). The schema does not check `drafts/.versions/`, unsafe paths, or folders. Those are GRR-03 warnings (GRR-03 lines 50 and 51), and the project-store convention keeps path rules out of the contract (`files.ts` lines 15 and 16). Open point 1.
- **C4 Ids.** The graph id uses the node-id pattern (D20: the graph id is the file stem, and the unit calls it a lower-case slug, line 17). The edge id is a non-empty string (the unit gives no pattern for edges, line 18).
- **C5 Port id.** `portIdSchema` is `^[a-z0-9][a-z0-9-]*\..+$`: a node id (no dot), the first dot, and a non-empty key. The key may contain dots, because the split is on the first dot (unit line 23).
- **C6 Free strings.** A tool name (`tool`) and an entity kind (`entityKind`) are non-empty strings. The unit lets this slice import port types from the Tool registry and nothing else (D1). GRR-03 reports an unknown tool (GRR-03 line 49). Open point 6.
- **C7 Params.** Input node `params` is required, because `type` and `label` are needed to run (D5). Output and tool `params` are optional (unit line 20 writes `params?`). Tool `params` is `z.record(z.string(), z.unknown())`, because the setting keys come from the tool spec, which this slice does not read.
- **C8 Labels.** `label` is a `z.string()` with no minimum (story nodes and input params). Graph `name` is `z.string().min(1)`.
- **C9 Unreadable files in the list.** A file that fails `graphFileSchema` is still listed (GRR-02 line 28, "listed as invalid"). Its row has `valid: false`, `view: null`, `nodeCount: null`, and `name` set to the file stem. This follows TRG-01 option A (`plans/DECISIONS.md` line 3409). GRR-02 confirms (open point 2).
- **C10 Envelopes the unit does not name.** `graphListSchema` is `{graphs}`. `graphDetailSchema` is `{graph, issues}`. Save and validate return `{issues}`. Create and rename return `{id}`. Current run returns `{run: RunState | null}`. Delete has no body. Start returns `{runId}`. Stop takes `{runId}` (unit line 26; GRR-05 line 19). GRR-02 and GRR-04 confirm (open point 2).
- **C11 Routes.** The paths are in section 2 (`routes.ts`). Commands are POST and reads are GET (module line 41). The `:id` segment is the graph id.
- **C12 HTTP statuses.** `GRAPH_RUN_NOT_FOUND` and `GRAPH_NOT_FOUND` are 404. `GRAPH_SCHEMA_VERSION_UNSUPPORTED`, `GRAPH_VIEW_NOT_RUNNABLE` and `GRAPH_RUN_ACTIVE` are 409 (state conflicts). `GRAPH_SCHEMA_INVALID`, `GRAPH_VALIDATION_FAILED`, `GRAPH_INPUT_MISSING`, `GRAPH_INPUT_INVALID` and `GRAPH_TARGET_INVALID` are 422. This mirrors `TOOL_ERROR_STATUS` (`tool-registry/errors.ts` lines 39 to 50).
- **C13 Issue codes.** The unit says "issue codes" and names none. The plan names 13 error codes and 8 warning codes, one per GRR-03 rule (section 2, `constants.ts`). The names are kebab-case, like lint rule names. `illegal-node-kind` is not a code: the union refuses a recipe kind in a story graph and a story kind in a recipe, so the case cannot occur on a parsed file (GRR-03 line 49, first item).
- **C14 Run-log discriminator.** `type`, with the SSE member names: `run-started`, `node-status`, `tool-call`, `error`, `pending-change`, `run-ended`.
- **C15 Run-log content.** A file input in the log carries `hash` (`sha256:`) next to `ref` (GRR-04 line 22; GRR-07 line 76). The run-started entry records `target` (absent means the whole recipe, GRR-07's "scope").
- **C16 Fixtures.** `packages/contracts/test/fixtures/graph-runner/story.json` and `recipe.json`, written in canonical form: `JSON.stringify(value, null, 2)` plus a final newline, keys in schema order, and no array of primitive values (so Prettier keeps them unchanged). The unit gives no path (line 32). Unit tests never read `examples/` (module line 55). GRR-10 line 59 reuses the example files for a byte-equivalence check, so the canonical form is what it needs.
- **C17 Run-end status.** `run-ended` takes the four run statuses, as the unit lists them (lines 27 and 29). `running` is accepted there and never sent.

### 1.4 Assumed (not checked here)

- A1. CI runs `npm ci`, lint, test, build in that order (`plans/PLT-02.md` line 18, "CI order ... is unchanged"). The repository has no remote, so CI cannot run here (criterion 5).
- A2. Zod 4.6.7 and later 4.x keep the shape's key order (the byte-equal round trip in C3 depends on it). Test C3 would fail if this changed.
- A3. `contracts-boot` still builds with the new slice (it has an empty budget and an allow-list entry, `angular.json` lines 54 and 55). Step 10 checks it.
- A4. Prettier leaves the two canonical fixtures unchanged. Step 7 checks it.

## 2. Files to create or change

Only these paths change. Root `package.json`, `package-lock.json`, the tsconfig files, `eslint.config.mjs`, `.prettierignore`, `packages/contracts/package.json`, and everything under `src/platform`, `src/tool-registry`, `src/project-store`, `apps/`, `e2e/`, `units/`, `modules/` and `plans/` (other than this file) do not change. No dependency changes: zod and `@types/node` are already present.

| Path | Change | Purpose and exports (names are exact) |
|---|---|---|
| `packages/contracts/src/graph-runner/constants.ts` | new | `GRAPH_SCHEMA_VERSION` (1); `GRAPH_VIEWS` (`story`, `recipe`); `STORY_NODE_KINDS` (`entity`, `scene`, `beat`); `RECIPE_NODE_KINDS` (`input`, `tool`, `output`); `GRAPH_ID_PATTERN` and `NODE_ID_PATTERN` (both `/^[a-z0-9][a-z0-9-]*$/`); `INPUT_NODE_OUTPUT_KEY` (`out`); `OUTPUT_NODE_INPUT_KEY` (`in`); `TOOL_NODE_OUTPUT_KEY` (= `OUTPUT_PORT_KEY`, imported from `../tool-registry/index.js`); `RELATION_VOCABULARY` (`order`, `causality`, `containment`, each a meaning string); `GRAPH_FOLDER` (`graphs`); `RUN_LOG_FOLDER` (`logs/recipe-runs`); `RUN_STATUSES` (`running`, `done`, `error`, `stopped`); `RUN_REASONS` (`author`, `project-switched`, `interrupted`); `NODE_RUN_STATUSES` (`idle`, `queued`, `running`, `done`, `error`, `stopped`); `GRAPH_ISSUE_SEVERITIES` (`error`, `warning`); `GRAPH_ERROR_ISSUE_CODES` (13: `duplicate-id`, `missing-port`, `port-type-mismatch`, `multiple-wires-into-port`, `port-wired-and-pinned`, `required-port-unfed`, `unknown-tool`, `disabled-tool`, `tool-params-invalid`, `cycle`, `output-unwired`, `output-not-fed-by-tool`, `output-kind-unwritable`); `GRAPH_WARNING_ISSUE_CODES` (8: `dead-step`, `input-unwired`, `pinned-entity-missing`, `path-missing`, `path-unsafe`, `path-in-versions`, `unknown-edge-node`, `entity-path-outside-entities`); `GRAPH_ISSUE_CODES` (the 21, errors then warnings). Each code's rule is GRR-03 lines 49 to 51. The comments of this file carry the rule texts that test E12 checks: the port-id split ("first dot", `<nodeId>.<key>`) and the relation meanings ("from precedes to" and so on). |
| `packages/contracts/src/graph-runner/errors.ts` | new | `GRAPH_ERROR_CODES` (object, keys `NOT_FOUND`, `SCHEMA_INVALID`, `SCHEMA_VERSION_UNSUPPORTED`, `VALIDATION_FAILED`, `VIEW_NOT_RUNNABLE`, `RUN_ACTIVE`, `RUN_NOT_FOUND`, `INPUT_MISSING`, `INPUT_INVALID`, `TARGET_INVALID`, values `GRAPH_*`); `GRAPH_ERROR_CODE_VALUES` (the same ten as a literal tuple); `graphErrorCodeSchema`; `GRAPH_ERROR_STATUS` (one status per code, C12). Types `GraphErrorCode`. |
| `packages/contracts/src/graph-runner/graph.ts` | new | Imports `fileReferenceSchema` from `../project-store/index.js` and `portTypeSchema` from `../tool-registry/index.js`. Exports: `graphIdSchema`, `nodeIdSchema`, `portIdSchema`, `graphViewSchema`, `positionSchema`, `storyNodeSchema`, `storyEdgeSchema`, `recipeNodeSchema`, `recipeWireSchema`, `inputParamsSchema`, `outputParamsSchema`, `toolParamsSchema`, `storyGraphShapeSchema`, `recipeGraphShapeSchema`, `graphFileShapeSchema`, `storyGraphSchema`, `recipeGraphSchema`, `graphFileSchema`. Types: `GraphView`, `Position`, `StoryNode`, `StoryEdge`, `RecipeNode`, `RecipeWire`, `InputParams`, `OutputParams`, `StoryGraph`, `RecipeGraph`, `GraphFile`. The uniqueness rule is an internal function (not exported). The comment on `portIdSchema` carries the phrases that test E12 checks (`<nodeId>.<key>`, "first dot"). |
| `packages/contracts/src/graph-runner/issues.ts` | new | Imports `GRAPH_ISSUE_SEVERITIES`, `GRAPH_ISSUE_CODES` from `./constants.js`. Exports: `graphIssueSeveritySchema`, `graphIssueCodeSchema`, `validationIssueSchema` (`code`, `severity`, optional `nodeId`, `edgeId`, `portId` as non-empty strings, `message`), `validationResultSchema` (`{issues}`). Types: `GraphIssueCode`, `ValidationIssue`, `ValidationResult`. |
| `packages/contracts/src/graph-runner/catalog.ts` | new | Imports from `./graph.js` and `./issues.js`. Exports: `graphSummarySchema` (C9), `graphListSchema` (`{graphs}`), `graphDetailSchema` (`{graph: graphFileShapeSchema, issues}`), `graphCreateSchema` (`{name, view}`), `graphRenameSchema` (a union of strict `{name}` and strict `{newId}`), `graphIdResultSchema` (`{id}`). Types: `GraphSummary`, `GraphList`, `GraphDetail`, `GraphCreate`, `GraphRename`, `GraphIdResult`. |
| `packages/contracts/src/graph-runner/runs.ts` | new | Imports `toolCallResultSchema` from `../tool-registry/index.js`, `entityRefSchema` and `fileReferenceSchema` from `../project-store/index.js`, `errorCodeSchema` from `../platform/index.js`. Exports: `runStatusSchema`, `runReasonSchema`, `nodeRunStatusSchema`, `inputValueSchema`, `runTargetSchema`, `runStartRequestSchema`, `runStartResultSchema`, `runStopRequestSchema`, `runErrorSchema`, `outputNodeResultSchema`, `nodeResultSchema`, `nodeRunStateSchema`, `runStateSchema`, `currentRunSchema`. Types: `RunStatus`, `RunReason`, `NodeRunStatus`, `InputValue`, `RunTarget`, `RunStartRequest`, `RunStartResult`, `RunStopRequest`, `RunError`, `OutputNodeResult`, `NodeResult`, `NodeRunState`, `RunState`, `CurrentRun`. |
| `packages/contracts/src/graph-runner/events.ts` | new | Imports `sseEnvelopeSchema` from `../platform/index.js` and the run schemas from `./runs.js`. Exports: `nodeStatusDataSchema`, `runEndedDataSchema`, `graphRunnerEventSchema` (a discriminated union on `type` of the three members `run-started`, `node-status`, `run-ended`, each `sseEnvelopeSchema.extend({module: z.literal('graph-runner'), ...})`). Types: `NodeStatusData`, `RunEndedData`, `GraphRunnerEvent`. |
| `packages/contracts/src/graph-runner/log.ts` | new | Imports from `./runs.js`, `./graph.js`, `../project-store/index.js` (`contentHashSchema`, `entityRefSchema`), `../tool-registry/index.js` (`toolArgumentsSchema`, `toolOutputSchema`), `../platform/index.js` (`errorCodeSchema`). Exports: `runLogInputSchema` (discriminated on `kind`; the `file` kind carries `hash`), `runLogEntrySchema` (discriminated on `type`: `run-started`, `node-status`, `tool-call`, `error`, `pending-change`, `run-ended`). Types: `RunLogInput`, `RunLogEntry`. |
| `packages/contracts/src/graph-runner/routes.ts` | new | `GRAPHS_ROUTE` `/api/graph-runner/graphs` (GET list); `GRAPH_ROUTE` `/api/graph-runner/graphs/:id` (GET detail); `GRAPH_CREATE_ROUTE` `/api/graph-runner/graphs/create` (POST); `GRAPH_VALIDATE_ROUTE` `/api/graph-runner/graphs/validate` (POST); `GRAPH_SAVE_ROUTE` `/api/graph-runner/graphs/:id/save` (POST); `GRAPH_RENAME_ROUTE` `/api/graph-runner/graphs/:id/rename` (POST); `GRAPH_DELETE_ROUTE` `/api/graph-runner/graphs/:id/delete` (POST); `RUNS_ROUTE` `/api/graph-runner/runs` (POST start); `RUN_STOP_ROUTE` `/api/graph-runner/runs/stop` (POST, body `{runId}`); `RUN_CURRENT_ROUTE` `/api/graph-runner/runs/current` (GET). Each is `as const`. A comment states the GET and POST rule (module line 41). |
| `packages/contracts/src/graph-runner/index.ts` | edit | Replaces line 1 (`export {};`) with `export * from` each of the nine files above, in the order constants, errors, graph, issues, catalog, runs, events, log, routes. |
| `packages/contracts/test/graph-runner.schema.test.ts` | new | Criteria C2, C3, C4 and tests E1 to E11 (section 4). Imports `../src/graph-runner/index.js`. Negative cases are made from the example files by one edit each (use `structuredClone`). |
| `packages/contracts/test/graph-runner.exports.test.ts` | new | Criterion C1 and test E12 (section 4). Spawns `process.execPath` on the fixture, as `tool-registry.exports.test.ts` does. |
| `packages/contracts/test/fixtures/nest-style/graph-runner-consumer.cjs` | new | CJS consumer, modelled on `tool-registry-consumer.cjs`: requires `@bbartolome/scriba-contracts/graph-runner` by name; reports `Object.keys` with the `typeof` of each export, the loaded `dist` folders, and the `safeParse` success of the example story and recipe. Prints JSON. |
| `packages/contracts/test/fixtures/graph-runner/story.json` | new | Example story graph, canonical form (C16). Content in 2c. |
| `packages/contracts/test/fixtures/graph-runner/recipe.json` | new | Example recipe, canonical form (C16). Content in 2c. |

Generated, not committed: `packages/contracts/dist/` (git-ignored).

### 2a. Shapes, with the key order that C3 depends on

Keys are listed in the order of the Zod object definition, which is also the order of the example files. Every object is `z.strictObject` unless marked "object" (non-strict). Request bodies: save takes `graphFileSchema`; validate takes `graphFileShapeSchema`; create takes `graphCreateSchema`; rename takes `graphRenameSchema`; start takes `runStartRequestSchema`; stop takes `runStopRequestSchema`.

- `positionSchema`: `x`, `y` (`z.number()`).
- `storyNodeSchema`: discriminated on `kind` over three members `entity`, `scene`, `beat`. Keys: `id` (`nodeIdSchema`), `kind` (literal), `label` (`z.string()`), `path` (`fileReferenceSchema`, optional), `position` (`positionSchema`).
- `storyEdgeSchema`: `id` (`z.string().min(1)`), `from` and `to` (`nodeIdSchema`), `relation` (`z.string().min(1)`, optional).
- `recipeNodeSchema`: discriminated on `kind`:
  - `input`: `id`, `kind`, `position`, `params` (`inputParamsSchema`, required).
  - `tool`: `id`, `kind`, `position`, `tool` (`z.string().min(1)`, required), `params` (`toolParamsSchema`, optional).
  - `output`: `id`, `kind`, `position`, `params` (`outputParamsSchema`, optional).
- `inputParamsSchema`: `type` (`portTypeSchema`), `label` (`z.string()`), `entityKind` (`z.string().min(1)`, optional).
- `outputParamsSchema`: `label` (`z.string()`, optional), `path` (`fileReferenceSchema`, optional).
- `toolParamsSchema`: `z.record(z.string(), z.unknown())`.
- `recipeWireSchema`: `id` (`z.string().min(1)`), `from` and `to` (`portIdSchema`). No `relation` key (strict).
- `storyGraphShapeSchema`: `schemaVersion` (`z.literal(GRAPH_SCHEMA_VERSION)`), `view` (`z.literal('story')`), `name` (`z.string().min(1)`), `nodes` (array of `storyNodeSchema`), `edges` (array of `storyEdgeSchema`).
- `recipeGraphShapeSchema`: the same keys, with `view` `recipe`, `recipeNodeSchema` and `recipeWireSchema`.
- `graphFileShapeSchema`: `z.discriminatedUnion('view', [storyGraphShapeSchema, recipeGraphShapeSchema])`.
- `storyGraphSchema` and `recipeGraphSchema`: the shapes with `.superRefine` that adds an issue at a repeated node id (`nodes/<i>/id`) or a repeated edge id (`edges/<i>/id`).
- `graphFileSchema`: `z.discriminatedUnion('view', [storyGraphSchema, recipeGraphSchema])`.
- `validationIssueSchema` (object, `issues.ts`): `code` (`graphIssueCodeSchema`), `severity` (`graphIssueSeveritySchema`), `nodeId`, `edgeId`, `portId` (optional non-empty strings), `message` (`z.string()`).
- `graphSummarySchema` (object): `id` (`graphIdSchema`), `name` (`z.string()`), `view` (`graphViewSchema.nullable()`), `nodeCount` (`z.number().int().min(0).nullable()`), `mtime` (`z.iso.datetime()`), `valid` (boolean).
- `graphRenameSchema`: `z.union([strict {name: z.string().min(1)}, strict {newId: graphIdSchema}])`.
- `inputValueSchema`: discriminated on `kind`: `text` (`text: z.string()`), `file` (`ref: fileReferenceSchema`), `entities` (`refs: entityRefSchema` array), `style` (`ref: entityRefSchema`).
- `runTargetSchema` (object): `nodeId`.
- `runStartRequestSchema` (object): `graphId`, `inputs` (`z.record(nodeIdSchema, inputValueSchema)`), `target` (optional `runTargetSchema`), `targets` (optional `z.record(nodeIdSchema, fileReferenceSchema)`).
- `runErrorSchema` (object): `code` (`errorCodeSchema`), `message`.
- `outputNodeResultSchema` (object): `pendingChangeId` (non-empty string), `path` (`fileReferenceSchema`).
- `nodeResultSchema`: `z.union([toolCallResultSchema, outputNodeResultSchema])`.
- `nodeRunStateSchema` (object): `status` (`nodeRunStatusSchema`), `result` (optional `nodeResultSchema`), `error` (optional `runErrorSchema`).
- `runStateSchema` (object): `runId`, `graphId`, `target` (optional), `status` (`runStatusSchema`), `reason` (optional `runReasonSchema`), `startedAt` (iso), `endedAt` (optional iso), `inputs` (record of `inputValueSchema`), `targets` (record of `fileReferenceSchema`), `nodes` (record of `nodeRunStateSchema`), `pendingChangeIds` (array of non-empty strings).
- `currentRunSchema` (object): `run` (`runStateSchema.nullable()`).
- `nodeStatusDataSchema` (object): `runId`, `nodeId`, `status` (`nodeRunStatusSchema`), `result` (optional), `error` (optional).
- `runEndedDataSchema` (object): `runId`, `status` (`runStatusSchema`), `reason` (optional).
- `runLogInputSchema`: discriminated on `kind`: `text` (`text`), `file` (`ref`, `hash` = `contentHashSchema`), `entities` (`refs`), `style` (`ref`).
- `runLogEntrySchema`: discriminated on `type`; every member has `type`, `at` (iso) and `runId` first:
  - `run-started`: `graphId`, `target` (optional), `inputs` (record of `runLogInputSchema`).
  - `node-status`: `nodeId`, `status` (`nodeRunStatusSchema`), `error` (optional).
  - `tool-call`: `nodeId`, `arguments` (`toolArgumentsSchema`), `output` (`toolOutputSchema`), `sourcesUsed` (`entityRefSchema` array).
  - `error`: `nodeId` (optional), `code` (`errorCodeSchema`), `message`.
  - `pending-change`: `nodeId`, `pendingChangeId`, `path`.
  - `run-ended`: `status` (`runStatusSchema`), `reason` (optional).

### 2b. Export list for the C1 test (every name above that is a value)

`GRAPH_SCHEMA_VERSION`, `GRAPH_VIEWS`, `STORY_NODE_KINDS`, `RECIPE_NODE_KINDS`, `GRAPH_ID_PATTERN`, `NODE_ID_PATTERN`, `INPUT_NODE_OUTPUT_KEY`, `OUTPUT_NODE_INPUT_KEY`, `TOOL_NODE_OUTPUT_KEY`, `RELATION_VOCABULARY`, `GRAPH_FOLDER`, `RUN_LOG_FOLDER`, `RUN_STATUSES`, `RUN_REASONS`, `NODE_RUN_STATUSES`, `GRAPH_ISSUE_SEVERITIES`, `GRAPH_ERROR_ISSUE_CODES`, `GRAPH_WARNING_ISSUE_CODES`, `GRAPH_ISSUE_CODES`, `GRAPH_ERROR_CODES`, `GRAPH_ERROR_CODE_VALUES`, `GRAPH_ERROR_STATUS`, `graphErrorCodeSchema`, `graphIdSchema`, `nodeIdSchema`, `portIdSchema`, `graphViewSchema`, `positionSchema`, `storyNodeSchema`, `storyEdgeSchema`, `recipeNodeSchema`, `recipeWireSchema`, `inputParamsSchema`, `outputParamsSchema`, `toolParamsSchema`, `storyGraphShapeSchema`, `recipeGraphShapeSchema`, `graphFileShapeSchema`, `storyGraphSchema`, `recipeGraphSchema`, `graphFileSchema`, `graphIssueSeveritySchema`, `graphIssueCodeSchema`, `validationIssueSchema`, `validationResultSchema`, `graphSummarySchema`, `graphListSchema`, `graphDetailSchema`, `graphCreateSchema`, `graphRenameSchema`, `graphIdResultSchema`, `runStatusSchema`, `runReasonSchema`, `nodeRunStatusSchema`, `inputValueSchema`, `runTargetSchema`, `runStartRequestSchema`, `runStartResultSchema`, `runStopRequestSchema`, `runErrorSchema`, `outputNodeResultSchema`, `nodeResultSchema`, `nodeRunStateSchema`, `runStateSchema`, `currentRunSchema`, `nodeStatusDataSchema`, `runEndedDataSchema`, `graphRunnerEventSchema`, `runLogInputSchema`, `runLogEntrySchema`, `GRAPHS_ROUTE`, `GRAPH_ROUTE`, `GRAPH_CREATE_ROUTE`, `GRAPH_VALIDATE_ROUTE`, `GRAPH_SAVE_ROUTE`, `GRAPH_RENAME_ROUTE`, `GRAPH_DELETE_ROUTE`, `RUNS_ROUTE`, `RUN_STOP_ROUTE`, `RUN_CURRENT_ROUTE`.

Types are compile-time only and are checked by `tsc` (step 8) and by the schema test's `expectTypeOf` lines.

### 2c. Example content (both files in canonical form)

`story.json`, name "Lighthouse arrival". Nodes, in order: entity `veteran-keeper` (label "The veteran keeper", path `entities/veteran-keeper.md`); entity `lighthouse` (label "The lighthouse", path `entities/lighthouse.md`); scene `arrival-first` ("Arrival", `drafts/arrival.md`); scene `arrival-second` ("The supply boat", `drafts/arrival.md`, the same file); scene `the-storm` ("The storm", `drafts/the-storm.md`); beat `dread` ("Dread builds", no path); beat `ledger` ("The ledger", `drafts/ledger.md`). Edges, in order: `e1` `arrival-first` to `arrival-second`, relation `order`; `e2` `arrival-second` to `the-storm`, `order`; `e3` `the-storm` to `ledger`, `order`; `e4` `the-storm` to `dread`, `containment`; `e5` `dread` to `ledger`, `causality`; `e6` `veteran-keeper` to `arrival-first`, relation `POV` (free text).

`recipe.json`, name "Chapter opening". Nodes, in order: input `chapter-notes` (`type` text, label "Chapter notes"); input `people` (`type` entity, label "Key people", `entityKind` person); input `house-style` (`type` style, label "House style"); tool `mystery` (tool `mystery_question`, params `{"words": 40}`); tool `cold-open` (tool `cold_open`, params `{"voice": "veteran-keeper", "words": 400}`, the first value a pinned entity reference); output `draft` (params `{"label": "Chapter draft", "path": "drafts/chapter-opening.md"}`). Wires, in order: `w1` `chapter-notes.out` to `mystery.text`; `w2` `mystery.output` to `cold-open.question`; `w3` `people.out` to `cold-open.people`; `w4` `house-style.out` to `cold-open.style`; `w5` `cold-open.output` to `draft.in`. Every node has `position` `{x, y}` with integers.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GRR-01`, created from a clean `main`. Record `node -v` and `npm -v` beside each result. Do not push, add no remote, open no pull request. Commit only with the explicit paths of section 2 (never `git add -A` or `git commit -a`).

1. Runtime. `node -v` prints `v26.x`; `npm -v` prints `11.20.0`. Planning-time values: `v26.13.0` and `11.20.0`.
2. Branch. `git switch -c unit/GRR-01` on a clean tree. Expected: `Switched to a new branch 'unit/GRR-01'`.
3. No dependency change. `git diff --stat -- package.json packages/contracts/package.json package-lock.json` prints nothing. `npm ls zod @types/node -w @bbartolome/scriba-contracts` shows one copy of each.
4. Write the section 2 files under `packages/contracts/src/graph-runner/` and replace `index.ts`. Use the shapes of 2a and the exports of 2b. Expected: `git status --short` lists the section 2 paths only (so far).
5. Write `test/fixtures/graph-runner/story.json` and `recipe.json` with the content of 2c, formatted by `JSON.stringify(value, null, 2)` plus a final newline.
6. Write `test/graph-runner.schema.test.ts`, `test/graph-runner.exports.test.ts` and the CJS consumer (section 4 lists the tests).
7. Format. `npx prettier --write packages/contracts/src/graph-runner packages/contracts/test/graph-runner.schema.test.ts packages/contracts/test/graph-runner.exports.test.ts packages/contracts/test/fixtures/graph-runner packages/contracts/test/fixtures/nest-style/graph-runner-consumer.cjs`, then `npx prettier --check packages/contracts`. Expected: exit 0, and the two JSON fixtures are unchanged by the write (assumption A4). If Prettier changes a fixture's bytes, stop and record it.
8. Build. `npm run build -w @bbartolome/scriba-contracts` exits 0. `ls packages/contracts/dist` includes `graph-runner`. `grep -c '^export ' packages/contracts/dist/graph-runner/index.js` prints `0`. `npx tsc --noEmit -p packages/contracts/tsconfig.json` exits 0.
9. Package tests. `npm test -w @bbartolome/scriba-contracts` exits 0. Vitest runs every test file of the package, the two new ones included, with zero failures. Record the file and test counts.
10. Web consumer. `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` exits 0 (`apps/web/src/contracts-boot.ts` line 10; A3). The default production build (`npm run build -w @bbartolome/scriba-web`) also exits 0 (it is part of root `npm run build`).
11. Root gates. From the root: `npm run build`, `npm test` and `npm run lint` each exit 0. `npm test` also runs `scripts/pins.test.mjs`. `npm run lint` ends with Prettier's check passing.
12. Generated output is ignored. `npx prettier --file-info packages/contracts/dist/graph-runner/index.js` prints `"ignored": true` (PLT-02 step 9).
13. Runtime dependencies unchanged. `npm ls --omit=dev -w @bbartolome/scriba-contracts` shows the package with one child, `zod`.
14. Commit. `git add` each section 2 path by name, then `git commit -m "feat(GRR-01): publish the graph-runner contract slice"`. The commit message carries no model identifier.
15. Fresh clone. `git clone --branch unit/GRR-01 /Users/bbartolome/workspace/scriba-prototype <empty directory>`. In the clone: `npm ci && npm run build && npm test && npm run lint`. Each exits 0. The clone is local, so the working repository gets no remote.
16. Record. Store the Node and npm versions and the result line of each command. A criterion is marked passed only when its row in section 4 holds. Criterion 5 stays unticked (section 4).

## 4. Acceptance criteria and tests

The criteria are unit lines 35 to 39. This plan marks nothing passed. Commands run from the repository root unless stated; the package command is `npm test -w @bbartolome/scriba-contracts` after the build.

| Criterion (unit line) | Test file and name | Pass condition |
|---|---|---|
| C1 "The subpath exports everything above, importing only from `/tool-registry`, `/project-store` and `/platform`." (35) | `graph-runner.exports.test.ts`: "C1: the subpath resolves from a CJS consumer and exports every name of section 2b"; "C1: the built slice loads only platform, project-store and tool-registry, and requires only zod outside them" | The consumer exits 0. Every name of 2b is an export (`typeof` is not `undefined`). `loaded` contains `graph-runner` and no folder other than `graph-runner`, `platform`, `project-store`, `tool-registry`. The non-relative specifiers of the built graph-runner files are exactly `['zod']`. The relative specifiers leave the slice only into `platform`, `project-store` and `tool-registry`. |
| C2 "The union accepts the example story graph and recipe; rejects an unknown key, a recipe node in a story graph, a relation on a recipe wire, a tool node without `tool`, a node id containing a dot, and `schemaVersion` above 1." (36) | `graph-runner.schema.test.ts`: "C2: the union accepts the example story graph and the example recipe"; "C2: refuses an unknown key" (one extra key on `recipe.json`); "C2: refuses a recipe node in a story graph" (`kind` `tool` with `tool` on a node of `story.json`); "C2: refuses a relation on a recipe wire" (`relation` added to `w1`); "C2: refuses a tool node without tool" (delete `tool` from `mystery`); "C2: refuses a node id containing a dot" (the id `chapter.notes` on a node of `recipe.json`); "C2: refuses schemaVersion above 1" (`schemaVersion: 2` on `recipe.json`) | The accepts test: `graphFileSchema.safeParse` succeeds for both files. Each refusal: `safeParse` returns `success: false`. |
| C3 "The example files round-trip through parse and serialise without loss." (37) | `graph-runner.schema.test.ts`: "C3: each example file round-trips byte for byte through parse and serialise" | For each file: `JSON.stringify(graphFileSchema.parse(JSON.parse(text)), null, 2) + '\n'` equals the file text. The parsed value deep-equals `JSON.parse(text)`. |
| C4 "Node-run-status is exactly the six values; run status exactly four." (38) | `graph-runner.schema.test.ts`: "C4: node-run-status has exactly the six values, run status exactly four" | `NODE_RUN_STATUSES` equals `['idle','queued','running','done','error','stopped']` and `nodeRunStatusSchema.options` equals the same. `RUN_STATUSES` equals `['running','done','error','stopped']`. `failed` is refused by both schemas. |
| C5 "Contract tests pass in CI." (39) | Not testable here: the repository has no remote and no runner (the precedent is `plans/DECISIONS.md` lines 602 and 726). Local proxy only: steps 9 and 11, and the fresh clone of step 15, exit 0. | The checkbox stays unticked. The proxy result is recorded as "local proxy; CI not run". |
| E1 legal kinds | "E1: legal kinds per view are constants and disjoint": every `STORY_NODE_KINDS` value parses in a story graph and every `RECIPE_NODE_KINDS` value does not; the reverse holds for recipes | Both directions hold; no kind is in both lists. |
| E2 uniqueness | "E2: repeated node or edge ids are refused by graphFileSchema and accepted by graphFileShapeSchema" | The refined schema fails, with an issue at `nodes/<i>/id` or `edges/<i>/id`; the shape schema succeeds. |
| E3 relation | "E3: relation is optional and non-empty; the vocabulary has its three meanings" | A story edge without `relation` parses; `relation: ''` is refused; `RELATION_VOCABULARY` keys are `order`, `causality`, `containment` with the meanings of D9. |
| E4 params | "E4: input params need type and label; the input type is a port type; output and tool params are optional" | An input without `params` is refused; `type: 'number'` is refused; `type: 'entity'` is accepted; an output node with no `params` is accepted; a tool node with `params: {"x": 1}` is accepted. |
| E5 port ids | "E5: port ids are `<nodeId>.<key>`; INPUT_NODE_OUTPUT_KEY is out, OUTPUT_NODE_INPUT_KEY is in, TOOL_NODE_OUTPUT_KEY is output" | `notes.out` and `cold-open.output.extra` pass (the key may contain a dot); `notes` (no dot), `.out` and `Notes.out` (uppercase node id) are refused; the three constants have the values shown. |
| E6 CRUD | "E6: graph summary, create and rename shapes" | A summary with `view: null`, `nodeCount: null`, `valid: false` passes; create with `view: 'grid'` is refused; rename `{name: 'x'}` and `{newId: 'y'}` pass; `{}` and both keys are refused. |
| E7 issue codes | "E7: thirteen error codes and eight warning codes; severities are error and warning" | The three arrays have lengths 13, 8 and 21; the names of section 1.3 (C13) are present; `severity: 'info'` is refused. |
| E8 error codes | "E8: GRAPH error codes match the platform error-code pattern and each has a status" | Each value of `GRAPH_ERROR_CODE_VALUES` passes `errorCodeSchema`; `GRAPH_ERROR_STATUS` has one entry per value with 404, 409 or 422 (C12); the object and the tuple agree. |
| E9 runs | "E9: run requests, input values and run state" | A start request with a text, a file and an entities input passes; a `style` input with `refs` is refused; a run state with `status: 'failed'` is refused; a run state with a file input carries the file reference and no content; `currentRunSchema` accepts `{run: null}`. |
| E10 SSE and log | "E10: the three SSE members and the six log entries parse against their schemas" | A `run-started` envelope from the run-state example, a `node-status` and a `run-ended` envelope (with `module: 'graph-runner'`) pass `graphRunnerEventSchema`; a `module: 'shell'` envelope is refused; each log entry type from C14 has one passing example. |
| E11 routes | "E11: every route is under /api/graph-runner and the GET and POST names are as in section 2" | Each route constant starts with `/api/graph-runner/`; `GRAPH_ROUTE` contains `:id`; `RUN_STOP_ROUTE` is `/api/graph-runner/runs/stop`. |
| E12 exports data | "E12: every export is data (no function); the port-id rule and the relation vocabulary are in the built declarations" (exports test) | No export has kind `function`; `dist/graph-runner/graph.d.ts` contains `<nodeId>.<key>` and `first dot`; `dist/graph-runner/constants.d.ts` contains `order` and `from precedes to`. |

Negative tests start from the example files, so each refusal changes exactly one thing.

## 5. Downstream agreement

Each unit below is in `unblocks` (except where marked). The agreement is: what it needs from this slice, what this plan provides, and what it must confirm.

- **GRR-02, module skeleton and CRUD** (blocked by GRR-01, unit line 7). Needs `graphFileSchema` (save, list validity), `graphFileShapeSchema` (detail), `GRAPH_SCHEMA_VERSION`, the summary, list, create, rename and id-result shapes, the routes and the `GRAPH_*` codes. Agreement: (a) GRR-02 checks `schemaVersion` before parsing (GRR-02 line 22); the union refuses `2` with a generic issue, not with `GRAPH_SCHEMA_VERSION_UNSUPPORTED`. (b) Listing a file that fails the schema uses the nullable row of C9 (GRR-02 line 28). (c) The envelopes and routes of C10 and C11 are chosen here; GRR-02 confirms them (open point 2).
- **GRR-03, validation** (blocked by GRR-01, line 7). Needs the 21 issue codes and `validationIssueSchema`, the shape schema (for `duplicate-id`), port types from `/tool-registry` (GRR-03 line 52). Agreement: (a) `illegal-node-kind` is not a code: the union refuses it at parse, so the validator never sees it (C13). (b) GRR-03 has no rule for a scene or beat `path` outside `drafts/`, though the unit states that rule (unit line 19). GRR-03 decides whether to add a code (open point 5). (c) The path warnings of GRR-03 lines 50 and 51 come from the validator, not the schema (C3).
- **GRR-04, run engine** (blocked by GRR-02, GRR-03, TRG-12, PLT-12; GRR-01 is not in its `blocked_by` list but its shapes are used). Needs `runStartRequestSchema`, `runStartResultSchema`, `runStateSchema`, `nodeRunStateSchema`, `nodeResultSchema` (tool results are `toolCallResultSchema`, GRR-04 line 24), `nodeRunStatusSchema`, `graphRunnerEventSchema`, `runErrorSchema`. Agreement: the refusals of GRR-04 line 20 are the `GRAPH_*` codes; the file hash of GRR-04 line 22 is in `runLogInputSchema`.
- **GRR-05, GRR-06, GRR-07** (blocked by GRR-04 and, for GRR-06, PST-15; not in GRR-01's `unblocks`, but they use its shapes). GRR-05: `runEndedDataSchema` with reasons `author` and `project-switched` (GRR-05 lines 19 and 20). GRR-06: `outputNodeResultSchema` (line 50); the graph output is checked with `graphFileSchema` (line 46); the origin `recipe-run` is PST-01's `pendingOriginSchema` (`project-store/pending.ts` lines 15 and 16). GRR-07: the six log entries (line 76) and `reason: 'interrupted'` (line 77).
- **GRR-10, ngx-vflow adapter** (blocked by GRR-01, line 7). Needs both graph shapes and the example files. Agreement: the criterion at GRR-10 line 59 asks for byte-equivalent JSON after a save without edits. C3 makes the example files canonical (2-space JSON, a final newline, schema key order), so GRR-10's serialiser must write that form (or keep the loaded key order). GRR-10 line 60 (move changes only `position`) follows from the shapes.
- **GRR-16, sample recipe** (blocked by GRR-01, line 7, and the Genre packs and PLT-21 gates). Needs `graphFileSchema` (GRR-16 line 87). No contract change.
- **PLT-21, examples check, graph layer** (blocked by PLT-20 and GRR-01, line 7). Parses every `graphs/` file with `graphFileSchema` (PLT-21 line 104, which uses the same name). The story-node path check (PLT-21 line 105) is PLT-21's own rule, not the contract's (C3).
- **AGL-13, output routing** (blocked by GRR-01, line 7). Validates proposed graphs with `graphFileSchema` (AGL-13 line 21).
- **CEX-01, contract slice** (blocked by GRR-01, line 7). Needs no GRR name. Its `order` edges use `RELATION_VOCABULARY.order` (`order` is the only relation Compile & export reads, unit line 24 and module line 39).
- **CEX-06, preflight orphan checks** (blocked by GRR-01, line 7). Uses story node `kind` `scene` or `beat` with `path` (CEX-06 line 82), and label-only nodes (line 85), from `storyGraphSchema`.
- **GNP-04, `propose_graph`** (blocked by GRR-01, line 7). The golden tests parse the output with `graphFileSchema` (GNP-04 line 25).
- **GNP-18, fiction sample** (blocked by GRR-01, line 7). The sample graph passes `graphFileSchema` (GNP-18 line 51).

Not in GRR-01's `unblocks`: GRR-09 and GRR-13 use the shapes through GRR-02 and GRR-04.

### 5b. In-progress plans on the same files

No in-progress plan changes a path that GRR-01 changes, and no in-progress plan changes `packages/contracts`:

- `plans/SAU-09.md` (planned, setup-auth): changes apps/api setup-auth paths and `apps/api/test/invariant-sweep.ts` (`plans/SAU-09.md` line 65 and its table). It says `packages/contracts` does not change.
- `plans/SAU-10.md` (planned, setup-auth): changes three apps/api paths (`plans/SAU-10.md` lines 62 to 68); line 85 says `packages/contracts/**` is not changed.
- `plans/MPR-08.md` (planned, providers): changes `apps/api/test/providers-gate.test.ts` and `modules/providers.md` (`plans/MPR-08.md` line 50).
- `plans/TRG-03.md` (planned, form renderer): changes three apps/web paths (`plans/TRG-03.md` line 47).

Result: the five changes touch disjoint paths, so the merge order does not change the result of any of them. The only file outside the slice that imports the subpath is `apps/web/src/contracts-boot.ts`. None of the four changes it, and GRR-01 changes only what the subpath exports (step 10 checks that it still builds).

## 6. Open points

1. **Path rule conflict (C3).** Unit line 19 says a story `path` is "never `drafts/.versions/`". GRR-03 lines 50 and 51 make that a warning, with missing and unsafe paths. This plan follows GRR-03, because the schema does not check file rules (`files.ts` lines 15 and 16) and the warning must be reachable. Decision needed before GRR-03 is planned.
2. **Shapes the unit does not name (C9, C10, C11, C12).** The unreadable-file row, the response envelopes, the route paths and the HTTP statuses are chosen here. GRR-02 and GRR-04 confirm them before they are planned.
3. **Duplicate ids (C2).** `graphFileSchema` refuses duplicate ids (unit line 18), so save and the list reject them. GET and validate use the shape schema so GRR-03 can report `duplicate-id`. GRR-02 and GRR-03 must use the two schemas as C2 says.
4. **C5 is not testable here.** The repository has no remote, so CI cannot run. The local proxy is steps 9, 11 and 15. The checkbox stays unticked, as in the precedent cited in section 4.
5. **GRR-03 rule gaps.** The unit's scene and beat folder rule (line 19) has no GRR-03 rule. `illegal-node-kind` cannot occur on a parsed file (C13). GRR-03 decides.
6. **Free strings (C6).** A tool name and an entity kind are not checked against their patterns, because the unit allows port types only from `/tool-registry`. If the Navigator wants the patterns, `TOOL_NAME_PATTERN` and `ENTITY_KIND_PATTERN` would add two names from `/tool-registry` that are not port types.
7. **Pinned values (C7).** Tool `params` is loose. The shape of a pinned entity reference, and of a pinned list, is not fixed by the unit; GRR-12 line 47 pins a chip into `params`. GRR-12 and GRR-03 decide.
8. **Fixture location (C16).** The unit gives no path for the example files. They go under `packages/contracts/test/fixtures/graph-runner/`, because unit tests never read `examples/`.
9. **Run-end status (C17).** `run-ended` accepts `running`, because the unit lists four statuses for the run. It is never sent.
