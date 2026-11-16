---
id: AGL-09
status: draft
---
# AGL-09 plan — narrative tools: enabled registry tools as functions, entity resolution, citations, draft provenance

Revision 1, written from main at `52b63f8`. Main had moved to `28b88c4` by the time the plan was committed: the GNP-02 and GNP-11 merges came in between, and neither touches a file of this plan (section 5). The planner changed no code and ran no test. The working tree had one change that is not part of this plan (`units/SAU-12-providers-step.md`), and it is not touched. Status stays `draft` until a reviewer changes it.

## 1. Decisions this plan follows

Source names: "unit" is `units/AGL-09-narrative-tools.md`, "module" is `modules/agent-loop.md`, "AGL-02", "TRG-11" and "TRG-12" are the blocker plans, "DECISIONS" is `plans/DECISIONS.md`. "PC" marks a Plan choice: a small choice that no source settles, where the simplest option is taken. Section 6 holds the questions that are not settled.

The unit has no change notes. A search of the unit file for "Moved", "Removed", "Loosened", "Reworded" and "Changed by revision" finds none, so no unit text is overridden.

**Offered tools and schemas**
- At the start of each agent run, the loop offers the registry's enabled, valid tools for the project's genre. Source: unit line 18. `CatalogService.functions(genrePack)` gives exactly that (`apps/api/src/modules/tool-registry/catalog.service.ts` lines 320 to 335).
- A tool that is enabled or disabled during a run keeps its offer for that run. The next run uses the new switch. Source: unit line 18. Calls to a tool disabled mid-run are open point OP4.
- The registry already strips the `x-` keys from the function schemas it emits (`emit.ts` `functionProperty`, `inputs.ts` `stripExtensions`, lines 172 to 178). The loop passes the schemas on as they are. Source: unit line 18.
- A registry tool whose name is in `AGENT_RESERVED_TOOL_NAMES` (contract `agent-loop/constants.ts`) is left out, and its name is reported once in the transcript. Source: unit line 18; module line 52. The transcript report is open point OP2.

**Arguments and resolution**
- Entity and style arguments are found from the form descriptor: `views.form.fields[].elementType` is `entity` or `style` (the `x-scriba-type` value, `emit.ts` `formField`; `inputs.ts` `isEntity` and `isStyle`, lines 33 to 34). Source: unit line 19; TRG-02 plan line 184.
- An empty style field is filled with the project's `styleProfile`. The caller fills it, not the executor. Source: unit line 19; TRG-12 plan section 1, line 18.
- IDs are resolved in process through `EntitiesService.resolve` (`apps/api/src/modules/project-store/entities.service.ts` line 36). Source: unit line 19.
- The executor is `ExecutorService.execute(name, request, signal)` (TRG-12). The signal is the run's abort signal: `AgentRun.runCall` passes `this.controller.signal` to `ToolRun.dispatch`, and dispatch passes it on as `ctx.signal`. A stop therefore aborts the model request. Source: unit line 19; TRG-12 plan section 5 (the AGL-09 row).

**Errors and retries**
- `TOOL_ARGS_INVALID`, `TOOL_ENTITY_UNRESOLVED` and `TOOL_ENTITY_KIND_MISMATCH` are rendered in the readable format and count as retries, under the AGL-02 policy. An unknown entity ID does the same. Source: unit line 20; AGL-02 S7 (d) and S17.
- `EntitiesService.resolve` does not throw for an unknown ID. It returns it in `errors` with code `unknown`. The plan turns that into a readable issue. A duplicate (two files with one ID) is refused too, with its paths. The comment above `resolve` says that a duplicate "is never guessed". PC5.
- Any other executor error (`TOOL_DISABLED`, `TOOL_MODEL_ERROR`, and so on) is not a retry. AGL-02 S7 lists what counts, and an unexpected exception neither counts nor resets. PC4 makes these errors unexpected exceptions.

**Citations and provenance**
- `sourcesUsed` is the executor's value: the entity-typed references, de-duplicated, with style profiles excluded (TRG-12 plan C6). Source: unit line 21.
- Draft provenance is `{runId, toolCallId, tool, entityIds, sourcesUsed, model, at}`, the shape of `packages/contracts/src/agent-loop/provenance.ts`. It goes on the `tool-call-result` event (`events.ts` already has the optional `sourcesUsed` and `provenance` fields, lines 38 to 45), on the card state (`cards.ts`), and in the transcript `tool-result` payload (`transcript-entries.ts` lines 55 to 64 already allow both fields). Source: unit line 21. The provenance is not written into the draft file. Source: module line 55.

**Output at this milestone**
- Draft outputs are shown in the chat with their provenance. They become pending changes in AGL-13. Source: unit line 22; module line 80.
- AGL-09 writes no file. The only direct write of the agent loop stays the transcript. Source: module line 54.
- Outputs of other kinds (entity, graph, claims, check) are open point OP3.

**Family and validation**
- Registry tools are in the family `narrative` (`AGENT_TOOL_FAMILIES`). The dispatcher offers a family only when it is enabled for the run (AGL-02 S8). PC2: the loop always enables `narrative`.
- Built-in tools stay Ajv-validated. Registry arguments are validated by the executor's full-mode check, which gives the same readable format. Source: module line 53; unit line 20. PC3: the loop runs no Ajv on registry tools.

**Model**
- The executor resolves the model through the active project. Source: TRG-12 plan C3; DECISIONS 2026-11-13, MPR-05 entry (line 1945). PC7: the provenance `model` is the run's own resolved model, because the executor's result carries no model.

**Blockers.** `plans/AGL-08.md`, `plans/TRG-11.md` and `plans/TRG-12.md` all have `status: done`. TRG-12 is merged at `ac13917` (DECISIONS 2026-11-16).
- AGL-08 gives the dispatcher (`tools/tool-run.ts`) and the run loop (`agent-run.ts`) that this plan extends. DECISIONS 2026-11-16 (AGL-08 review entry, line 4491) leaves AGL-08's criterion 3 unticked, because its CI run was not seen. This does not block AGL-09.
- TRG-11 gives `functions(genrePack)`, `entry` and `enabledOf`.
- TRG-12 gives the executor, its error codes and HTTP statuses (`packages/contracts/src/tool-registry/errors.ts`), `sourcesUsed` (C6), the style kind (C5), the abort (C12), and the resolver, which takes no signal (point O5; DECISIONS 2026-11-15, MPR-08 entry, line 4015).

**Plan choices**
- PC1 Genre and style profile. Both come from `project.yaml`, read the way `ActiveGenreService` reads the genre: `FilesService.read(projectId, 'project.yaml')`, then `projectYamlSchema.safeParse` (`packages/contracts/src/project-store/project.ts`, where `styleProfile` is optional, line 24). A missing or invalid file gives no genre and no style profile. `ActiveGenreService` is not exported from the tool-registry entry file, so no tool-registry file changes.
- PC2 Family. The families of every run gain `narrative`: `['project', 'narrative']`, plus `research` when research is on.
- PC3 Validation. The loop does not run Ajv on registry tools. The dispatcher checks only that the arguments are a JSON object. The executor's full-mode check is the validator, and it returns readable issues (TRG-12 C13). This avoids compiling registry schemas in the loop.
- PC4 Error mapping. Section 3, step 5 has the table. Only the three named codes, unknown IDs, duplicate IDs and Project store refusals count as retries. Every other error becomes a plain error, which the dispatcher answers with its generic failure line without counting it (AGL-02 S7).
- PC5 Unknown and duplicate IDs. Each unknown ID gives one issue at the path of the first field that names it: `Entity "<id>" is not in this project.` Each duplicate gives `Entity "<id>" is in more than one file: <paths>.`
- PC6 Empty style field. An absent style field is left alone. An empty one (`''` or `null`) is filled when the project has a `styleProfile`. When the project has none, the empty key is removed, so the executor sees the field as absent. If the tool requires that field, the executor's readable "is required" refusal applies.
- PC7 Provenance. The loop builds it in `runCall`, for outputs of kind `draft` only (OP3 covers the others). `entityIds` lists every ID passed in `request.entities`, in field order, without duplicates, and this includes the style profile. `sourcesUsed` is the executor's value. `model` is `this.target.model`. `at` is `new Date().toISOString()` at completion.
- PC8 Names. A registry definition's `name` is a plain `string`. Only built-ins are typed with `AgentReservedToolName` (AGL-02 S16). Registry names are checked against the reserved list when the run starts.
- PC9 Summary. `Drafted with <name>.` for a draft, and `Ran <name>.` for other kinds. The model receives the default `JSON.stringify(output)` text (AGL-02 S10).
- PC10 Order. Entity and style fields are read in the property order of the form descriptor.

## 2. Files to create or change

Only the paths below change. The tool-registry module, the Project store, `packages/contracts/**`, `e2e/**`, `apps/web/**` and every `package.json` do not change, unless an open point below says so.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/agent-loop.module.ts` | edit | Imports `ToolRegistryModule` from `../tool-registry/tool-registry.module` (an entry file, boundary rule R1). Exports nothing new |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | edit | Constructor gains `CatalogService` and `ExecutorService` (tool-registry entry file) and `EntitiesService` (project-store entry file). `startRun` (line 34) appends the narrative definitions when `narrative` is in `enabledFamilies`, and passes the reserved-name list |
| `apps/api/src/modules/agent-loop/tools/narrative-tools.ts` | new | `readProjectNarrativeSettings` (PC1); the narrative definition builder; the handler (section 3, step 5); the error table (PC4) |
| `apps/api/src/modules/agent-loop/tools/tool-types.ts` | edit | Adds `NarrativeToolDefinition` (`name: string`, `family: 'narrative'`, description, schema, handler). Adds `citations?: {entityIds: string[]; sourcesUsed: string[]}` to `ToolHandlerResult` and to the result outcome. `CompiledTool.definition` becomes `ToolDefinition \| NarrativeToolDefinition`, and `validate` becomes optional |
| `apps/api/src/modules/agent-loop/tools/tool-run.ts` | edit | `argumentIssues` (line 43): with no validator, only the JSON-object check. `ToolRunOptions.rejectedNames?` and a `rejectedNames` getter. `dispatch` (line 92) copies `citations` into the result outcome. The `ModuleError` branch (line 143) stays for built-ins |
| `apps/api/src/modules/agent-loop/agent-run.ts` | edit | `runCall` (line 240): builds the provenance (PC7); adds `sourcesUsed` and `provenance` to the `tool-call-result` emit (line 258) and to the transcript `tool-result` (line 282), only when present. `apply` (line 363): stores both on the card (line 384) |
| `apps/api/src/modules/agent-loop/agent-runs.service.ts` | edit | `enabledFamilies` (lines 84 to 86) gains `narrative` (PC2) |
| `apps/api/test/agent-loop-narrative.test.ts` | new | Tests T1 to T4 of section 4. Its harness is copied from `agent-loop-run.test.ts` |

Conditional rows. Each is made only when its open point is answered:

| Path | Change | Open point |
|---|---|---|
| `apps/web/src/app/features/agent-loop/chat-state.ts` | edit `cardView` (line 369) so that `sourcesUsed` reaches the card's `sources` as file paths | OP1 |
| `packages/contracts/src/agent-loop/constants.ts`, `transcript-entries.ts` and `transcript.ts` | add a transcript kind for the clash report | OP2 |

## 3. Method

Run in a worktree of `main`: `git worktree add <path> -b unit/AGL-09 main`. Record `node -v` (expected `v26.x`) and `npm -v` beside each gate result. Do not push, and do not add a remote.

Preconditions, checked before step 1: `plans/AGL-08.md`, `plans/TRG-11.md` and `plans/TRG-12.md` have `status: done`.

Open points and their steps: OP1 gates step 9, and OP2 gates the transcript line of step 8. OP3 and OP4 have defaults stated in section 6. If an answer changes a default, stop and report before the step that uses it.

1. Install. `npm ci` at the worktree root. Expected: exit 0.
2. Module wiring. In `agent-loop.module.ts`, import `ToolRegistryModule` from `../tool-registry/tool-registry.module` and add it to `imports`, next to `ProvidersModule`. Export nothing new. Expected: `agent-loop-tools.kit.ts` still builds, since it imports `AgentLoopModule`.
3. Types. In `tools/tool-types.ts`, make the changes of the section 2 row. Built-ins keep their `validate`, so they type-check without change. Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` passes after step 5, not before.
4. Dispatcher. In `tools/tool-run.ts`, make the changes of the section 2 row. The `argumentIssues` change: with no validator, return `[]` for a plain object and `[{path: '', message: 'must be an object'}]` otherwise. Expected: `agent-loop-tools.test.ts` passes without change.
5. Narrative definitions. Create `tools/narrative-tools.ts`.
   a. `readProjectNarrativeSettings(files, projectId)` returns `{genrePack?, styleProfile?}` (PC1). Any throw or failed parse returns `{}`.
   b. The handler, for one registry tool, with `fields` (the form descriptor fields captured at run start) and the run's `styleProfile`:
      1. Fill the style fields (PC6).
      2. Collect the IDs of every `entity` and `style` field, in field order. A scalar value is one ID, a list is its items, and a non-string item is skipped (the executor refuses it). Keep the first field that names each ID.
      3. If there are IDs, call `entities.resolve(projectId, ids)` with `projectId` from `ctx.run.projectId`. A `ModuleError` from it becomes a `ToolArgumentError` with one issue at `''`.
      4. Turn each `errors` entry into an issue (PC5), and throw `ToolArgumentError` with all of them when there are any.
      5. Map `resolved` to `{ref: id, type, path, content}` entries, in resolution order.
      6. Call `executor.execute(name, {arguments, entities}, ctx.signal)` and map its errors with the table below.
      7. Return `{summary, output: result.output, citations: {entityIds, sourcesUsed: result.sourcesUsed}}`, where `entityIds` is the list of step 2 with duplicates removed.

      Error table (PC4):

      | Thrown by | Becomes |
      |---|---|
      | `EntitiesService.resolve`, a `ModuleError` | `ToolArgumentError([{path: '', message}])`, which counts (AGL-02 S7 (c)) |
      | executor `TOOL_ARGS_INVALID` | `ToolArgumentError(details.issues)`, with `details` read by `toolArgsInvalidDetailsSchema`. If that parse fails, one issue at `''` with the message |
      | executor `TOOL_ENTITY_UNRESOLVED` or `TOOL_ENTITY_KIND_MISMATCH` | `ToolArgumentError([{path: '', message}])`, which counts |
      | any other `ModuleError` (`TOOL_DISABLED`, `TOOL_INVALID`, `TOOL_MODEL_ERROR`, ...) | `new Error(message)`. The dispatcher answers the generic failure line and does not count it |
      | anything else (for example an abort) | rethrown unchanged |

   c. The definition: `{name, family: 'narrative', description, schema: parameters as ToolArgumentSchema, handler}`, with the description and the schema from the registry's function schema.
6. Offered set. In `agent-tools.service.ts`, add the three constructor dependencies named in section 2. In `startRun` (line 34), when `options.enabledFamilies` includes `narrative`:
   a. read the settings of the run's project (PC1);
   b. take `catalog.functions(genrePack).functions`, and move every name in `AGENT_RESERVED_TOOL_NAMES` into `rejectedNames` (PC8);
   c. for each other function, build a definition (step 5 c) with `fields = catalog.entry(name).views.form.fields`;
   d. pass `[...builtins, ...narrative]` as `tools` and `rejectedNames` in the options.
   The method stays synchronous.
7. Run families. In `agent-runs.service.ts`, lines 84 to 86: `narrative` is added before `research` (PC2).
8. Loop. In `agent-run.ts`:
   a. In `runCall`, when the outcome is a `result` with `citations` and `output.kind === 'draft'`, build the provenance (PC7).
   b. Add `sourcesUsed` and `provenance` to the `tool-call-result` emit and to the transcript `tool-result` payload. Add each only when present, so built-in events keep their current fields.
   c. In `apply`, store both on the card for `tool-call-result`.
   d. The clash report (OP2) is not written. The names stay on the `ToolRun`.
   Expected: the built-in events and transcript lines are the same as before.
9. Card display (OP1). Not done unless OP1 is answered. Its default is no web change.
10. Test file. Create `apps/api/test/agent-loop-narrative.test.ts` with tests T1 to T4 of section 4. Copy the harness of `agent-loop-run.test.ts` (`openHarness`, `settingsText`, `post`, `startRun`, `readUntilEnded`, `chatBodies`, `toolNamesOf`), so that each test has its own scenario folder, library and app. Build the library with `buildProjectsLibrary` (`project-store-projects.kit.ts`, line 30), which makes the project `book` with genre `nonfiction`. Then write the files listed in section 4. Boot with `createTestApp({libraryDir, env: {SCRIBA_PACKS_DIR: FIXTURE_PACKS}})`, where `FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs')`, as `tool-registry-api.test.ts` line 19 does. Write each scenario JSON into the temp scenario folder, as `agent-loop-run.test.ts` does.
11. Gates, each with exit 0, in this order:
    - `npx prettier --check` on every changed and new file.
    - `npm run build` at the root.
    - `cd apps/api && npx vitest run test/agent-loop-narrative.test.ts`. Expected: T1 to T4 pass.
    - Regression, from `apps/api`: `npx vitest run test/agent-loop-run.test.ts test/agent-loop-tools.test.ts test/agent-loop-start.test.ts test/agent-loop-current.test.ts test/agent-loop-stop.test.ts test/agent-loop-transcript.test.ts test/agent-loop-search.test.ts test/agent-loop-history.test.ts test/agent-loop-trim.test.ts test/tool-registry-executor.test.ts test/tool-registry-api.test.ts`.
    - `npm test` at the root.
    - `npm run lint` at the root. Expected to end with `All matched files use Prettier code style!`.
12. Commit on `unit/AGL-09` with the message `feat(AGL-09): narrative tools as functions, entity resolution, citations and provenance`. Record each gate's output and each criterion's result.

## 4. Acceptance criteria and tests

All four tests are in `apps/api/test/agent-loop-narrative.test.ts`. They run with the commands of section 3, step 11. Each test boots its own app against a temp library with the shared fixture packs (`apps/api/test/fixtures/packs`: `core/tools/cold_open.yaml`, which is offered in every genre, and `nonfiction/tools/myth_buster.yaml`, which is offered for `nonfiction`). The project `book` is `nonfiction`. Each test rewrites `book/project.yaml` to add `styleProfile: house-style`, and writes the entity files `book/entities/ada-lovelace.md` (`type: person`, body `Ada wrote the first program.`) and `book/entities/house-style.md` (`type: style-profile`). An entity's ID is its file name when the front matter has no `id` (`entity-manifest.ts`, lines 293 to 305).

Scenarios are written to the temp folder. Matchers are the ones of the mock (`e2e/fixtures/mock-openai/server.mjs`): `endpoint`, `turnIndex`, `toolResultPresent` and `lastMessageContent`, which matches a substring of the last message. The first step that matches wins. The executor's own request is a chat request to the same mock. It is matched by its rendered prompt, which contains `Core idea: Engines reward patience` (`cold_open.yaml`, the `prompt` field).

| Criterion (unit line) | Test | Setup | Pass condition |
|---|---|---|---|
| 25: "A disabled tool is absent from the mock's received request." | T1 `a disabled registry tool is absent from the next request, and back after it is re-enabled` | `POST` `TOOL_ENABLED_ROUTE` for `cold_open` with `{enabled: false}`. Start a run with intent `Say done`. Scenario: one `stream` reply `Done.` to any chat request. Read until `run-ended`. Then re-enable `cold_open`, and start a second run | The first record's tool names, sorted, contain `myth_buster` and do not contain `cold_open`. The second record's tool names contain `cold_open`. The built-in names `list_files`, `read_file` and `search_notes` are offered in both records |
| 26: "A narrative call with entity IDs sends resolved contents to the executor and the card shows `sourcesUsed`." | T2 `a narrative call sends the resolved entity text to the executor and the card carries sourcesUsed` | Intent `Draft the cold open for the engines chapter`. Scenario: (1) match `lastMessageContent` `Core idea: Engines reward patience`, reply `stream` `The cold open opens on the bench at dawn.`; (2) match `turnIndex` 0, reply `toolCalls` with `cold_open` and arguments `{"coreIdea":"Engines reward patience","entityIds":["ada-lovelace"],"person":"ada-lovelace"}`; (3) match `toolResultPresent` true, reply `stream` `Drafted.` | The SSE stream has `tool-call-started` with family `narrative`, and a `tool-call-result` with `output` `{kind: 'draft', content: 'The cold open opens on the bench at dawn.'}` and `sourcesUsed` `['ada-lovelace']`. The mock has the executor's request, whose `messages[0].content` starts with `Write the answer as Markdown prose.` and whose `messages[1].content` contains `Ada wrote the first program.`. The run state from `AGENT_RUN_CURRENT_ROUTE` holds the card with `sourcesUsed` `['ada-lovelace']`. The style profile was filled, so the provenance `entityIds` of T4 contains `house-style` |
| 27: "An unknown entity ID returns a readable error and counts as a retry." | T3 `an unknown entity ID is a readable error, and a second one is attempt 2` | Intent `Draft the cold open`. Scenario: (1) match `turnIndex` 0, reply `toolCalls` with `cold_open` and `{"coreIdea":"Engines reward patience","entityIds":[],"person":"ghost-entity"}`; (2) match `turnIndex` 1, the same call again; (3) match `turnIndex` 2, reply `stream` `Stopping here.` | Two `tool-call-error` events, with `attempt` 1 and then 2. Each message names `person` and `ghost-entity`, says the entity is not in this project, and ends with `Expected arguments for cold_open:`. There is no `tool-call-result`. The mock has three records and none is the executor's request. The tool message in the second record equals the first error message |
| 28: "Every draft's card and transcript entry carry provenance." | T4 `a draft carries its provenance on the event, the card and the transcript` | The same run as T2 | The `tool-call-result` event's `provenance` parses with `draftProvenanceSchema` and equals `{runId: <the start reply's runId>, toolCallId: <the callId of tool-call-started>, tool: 'cold_open', entityIds: ['ada-lovelace', 'house-style'], sourcesUsed: ['ada-lovelace'], model: 'mock-model', at: <an ISO time>}`. The run state card's `provenance` deep-equals it. The file under `book/logs/agent-runs/` has one `tool-result` line whose `data.provenance` deep-equals it |

Criterion 2's "card" is the API card: the event and the run state. How the web shows the sources as links is open point OP1, and no test covers it here.

## 5. Agreement with the downstream and parallel units

- **AGL-11 (narrative gate, unblocked by AGL-09).** Its criterion 1 asserts `sourcesUsed` and draft provenance through the mock, and its demo disables a tool and asks for it. T1, T2 and T4 give those values with the same names. AGL-11 writes its own scenario files, so there is no file in common.
- **AGL-13 (output routing, blocked by AGL-09 and AGL-12).** It reads the draft provenance and the `citations` of the result outcome, which AGL-09 builds in `runCall` and puts on the outcome, to write overlay entries. It adds a `target` argument to the narrative definitions, which AGL-09 builds in one place (`agent-tools.service.ts`, `startRun`). It changes no name or shape that AGL-09 sets. Routing of the other output kinds depends on OP3.
- **AGL-17 (grounding wiring, after AGL-13).** It reads draft outputs and their paths from AGL-13's overlay. No change now.
- **GNP-12 (workhorses gate, `units/GNP-12-workhorses-gate.md` line 20).** It asks for `sourcesUsed` and draft provenance in CI. PC7 and T4 give that.
- **PST-20 (review queue UI).** It shows the `entityIds` and `sourcesUsed` of a pending change. The pending change's provenance comes from AGL-12 and AGL-13, not from this plan. No change.
- **AGL-12 (write overlay, parallel with AGL-09; no plan yet; unit read).** Both units change `tools/tool-run.ts`, `agent-tools.service.ts` and `agent-run.ts`. AGL-12 adds `write_file` and `edit_file` to `builtinTools`, an overlay to `ToolRun`, and a `propose` loop in `finish()`. Each merge order stays correct under these rules:
  - (a) `tool-run.ts`: AGL-09 changes `argumentIssues`, adds an optional `rejectedNames` option, and copies `citations` in `dispatch`. AGL-12 adds overlay state. The lines do not overlap, and the second merge rebases.
  - (b) `CompiledTool`: AGL-09 makes `validate` optional. AGL-12's built-ins keep theirs, so either order compiles.
  - (c) `agent-tools.service.ts`: AGL-09 appends the narrative definitions in `startRun`. AGL-12 appends its two built-ins to the constructor list. Either order compiles.
  - (d) `runCall`: AGL-09 adds `sourcesUsed` and `provenance` to the `tool-call-result` literal and to the transcript literal. AGL-12 adds its diff-preview field for writes, which the event schema already has. If the two literals conflict, the second merge keeps both fields.
  - (e) `finish()` is changed by AGL-12 only.
- **AGL-10 and AGL-25 (done).** No file in common, apart from the agent-loop tests listed in section 3, step 11.
- **In-flight plans.** At `52b63f8`, the only draft or planned plans were `plans/GNP-02.md` and `plans/GNP-11.md`. Both were merged after the base (`100ce27` and `d3e6674` for GNP-02; `36d5b42` and `28b88c4` for GNP-11), and both are `status: done` on main. They add `apps/api/test/packs/**`, `apps/api/vitest.config.mts`, `e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json`, `packages/packs/test/**` and `examples/nonfiction/**`. None of these is in section 2 of this plan (`git diff --stat 52b63f8 HEAD`). At the implementer's base, a fresh check with `grep -l '^status: \(draft\|planned\)' plans/*.md` is still needed.
- **TRG-16 and GRR-04.** They call the executor directly, not through the loop. This plan changes no file of the tool-registry module, so they are unaffected.

## 6. Open points

- **OP1. How a card gets a file link for each source.** Unit line 21 says the card shows sources "as links to the files route". `sourcesUsed` holds entity IDs (`events.ts`, `call.ts`). The Shell card's `sources` takes project-relative paths and links them to `/projects/:id/files?path=` (`apps/web/src/app/shell/tool-call-view.ts` lines 42 to 43; `tool-call-card.ts` lines 209 to 225). `cardView` (`apps/web/src/app/features/agent-loop/chat-state.ts` lines 369 to 378) does not map `sourcesUsed` at all. The options are: (a) the event also carries paths, which changes the contract; (b) the web resolves the IDs with `GET …/entities/resolve`, as TRG-16 does (TRG-16 unit line 15); (c) the link goes to the entity, not the file. Default: API level only. The web is not changed until this is answered, and T2 covers the API card.
- **OP2. Where the clash report goes.** Unit line 18 says the clash is "reported once in the transcript". `AGENT_TRANSCRIPT_KINDS` (contract `agent-loop/constants.ts`) has no notice kind. The options are: a new kind, which changes the transcript contract and the reader that AGL-04 owns; or an existing kind with a fixed payload, which none of the nine kinds fits. Default: the names stay on the `ToolRun`, and nothing is written until this is answered. No test covers it.
- **OP3. Outputs of other kinds at this milestone.** Unit line 22 and module line 80 settle only drafts: drafts are shown in the chat with their provenance. They do not say whether an `entity`, `graph`, `claims` or `check` output is shown in the M2 chat, or whether it carries provenance. Default: provenance only for `draft` (PC7). Other outputs pass through in the event unchanged. The contract's comment on the output field (`events.ts` line 37) already allows any output for a narrative tool. No criterion covers this.
- **OP4. A tool disabled after a run starts.** Unit line 18 says that enabling and disabling "take effect on the next agent run". The executor checks the switch at call time (TRG-12 `prepare`, step 1, `enabledOf`). So a call to a tool disabled mid-run is refused with `TOOL_DISABLED`. The dispatcher answers that with the generic failure line and does not count it (PC4). The options are: keep the executor's check, and read the unit as "not offered to later runs"; or check the switch as it was at run start, which changes TRG-12. Default: the executor is unchanged. No test covers it.

## 7. Facts checked and facts assumed

**Checked** (file and line on `main` at `52b63f8`):
- The unit (29 lines) and the module (84 lines) were read in full. The unit has no change notes (see section 1).
- `validate.ts` `validateArguments` copies the arguments before Ajv applies defaults, so the executor's defaults never change what the loop passes.
- `grep -rn AGL-09` over `plans`, `units`, `modules`, `docs` and `apps`, and the blocker IDs over `plans/DECISIONS.md`. The DECISIONS entries read: lines 1945, 2987 to 2988, 3406 to 3407, 4015, 4470 to 4500 and 5036 to 5045. No DECISIONS entry changes AGL-09's behaviour. Line 3406 settles `elementType` as `x-scriba-type`, which this plan uses.
- Plan statuses: `plans/AGL-08.md`, `plans/TRG-11.md` and `plans/TRG-12.md` are `done`. At `52b63f8` the draft and planned plans were `plans/GNP-02.md` and `plans/GNP-11.md`; both are `done` at `28b88c4`. `plans/QUEUE.md` lists AGL-09 as available.
- Main at `28b88c4` differs from `52b63f8` only in the files of the GNP-02 and GNP-11 merges (`git diff --stat 52b63f8 HEAD`) and in DECISIONS lines appended after line 5089. Every DECISIONS line cited here is unchanged.
- Registry: `catalog.service.ts` `entry` (303), `enabledOf` (315), `functions` (320), `validate` (338); `executor.service.ts` `execute` (72) and `prepare` (106); `emit.ts` `formField` (`elementType`) and `functionProperty`; `inputs.ts` `stripExtensions` (172 to 178) and the `isEntity` and `isStyle` flags; `validate.ts` `validateArguments` (84 to 137, the `entityRefs` list); `tool-registry.module.ts` exports `CatalogService` and `ExecutorService`; `ToolRegistryModule` is also in `app.module.ts`.
- Project store: `EntitiesService.resolve` (`entities.service.ts` 36 to 64) returns `resolved` and `errors`; `EntitiesService` is exported from `project-store.module.ts`; `FilesService.read` is used the same way by `ActiveGenreService`; `projectYamlSchema` has the optional `styleProfile` (contract `project.ts` line 24).
- Entity files: the ID defaults to the file's stem; the front matter is checked against the base entity schema only (`entity-manifest.ts` lines 293 to 305).
- Agent loop: `AgentToolsService` constructor (line 24) and `startRun` (34); `ToolRun` constructor filters by family; `dispatch` passes the signal in the context (line 92); the `ModuleError` branch at line 143 counts every `ModuleError`; `AgentRun.execute` sets `this.target` (158); `runCall` (240), the `tool-call-result` emit (258), the transcript `tool-result` (282), `apply` (363, 384); `agent-runs.service.ts` `enabledFamilies` (84 to 86); `transcriptPathOf` gives a project-relative `logs/agent-runs/…jsonl` path.
- Contracts: `call.ts` (`ResolvedEntity` is `{ref, type, path, content}`; `ToolCallResult` is `{output, sourcesUsed}`); `events.ts` (`tool-call-result` optional `sourcesUsed` and `provenance`); `cards.ts`; `provenance.ts`; `constants.ts` (`AGENT_TOOL_FAMILIES` has `narrative`; `AGENT_RESERVED_TOOL_NAMES` has the eleven names of module line 52; `AGENT_TRANSCRIPT_KINDS` has nine kinds); `routes.ts` (`AGENT_RUNS_ROUTE`, `AGENT_RUN_CURRENT_ROUTE`); `tool-registry/catalog.ts` `toolEnabledRequestSchema`.
- Web: `chat-state.ts` `outputOf` (353) maps a non-string output to JSON; `cardView` (369 to 378) has no `sources` or provenance; `tool-call-view.ts` `sources` (42 to 43) takes paths; `agent-contract.ts` accepts optional `sourcesUsed` and `provenance` on `tool-call-result` (lines 142 to 143, 306 to 307).
- Packs: `packages/packs/core/tools`, `packages/packs/nonfiction/tools` and `packages/packs/fiction/tools` are empty on main. Shared fixtures: `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` (`enabled: true`; entity kinds `person`; style `styleProfile`; required `coreIdea` and `person`; the prompt renders `Core idea: {{coreIdea}}` and the entities) and `nonfiction/tools/myth_buster.yaml` (`enabled: true`).
- Tests: `agent-loop-run.test.ts` lines 373 to 388 assert the exact tool names with an empty packs folder, so narrative tools do not appear there. `buildProjectsLibrary` (`project-store-projects.kit.ts` line 30) writes `book` with `genrePack: nonfiction`. `createTestApp` merges an `env` override (`create-test-app.ts` lines 77 to 82). `FIXTURE_PACKS` is `join(__dirname, 'fixtures', 'packs')` (`tool-registry-api.test.ts` line 19). The mock has `toolCalls` replies with `argumentChunks`, and `lastMessageContent` is a substring match (`server.mjs`, `matcherHolds`).
- Blocker state: AGL-08 is `done` with criterion 3 unticked (DECISIONS 2026-11-16, line 4491).

**Assumed** (each is checked by a named test or step):
- A1. The executor's request reaches the same mock as the agent's requests, because the test settings name one provider and the executor resolves the app default (TRG-12 C3). T2 reads the mock's records to confirm it.
- A2. `createTestApp` with `SCRIBA_PACKS_DIR` set to the shared fixture packs boots, with the `person` entity type left undefined. TRG-12's test relies on the same boot. Checked by T2.
- A3. `FilesService.read` throws for a missing `project.yaml`. PC1 catches every error, so the plan does not depend on which error it is.
- A4. The `toolCalls` reply with `argumentChunks` behaves as in `tool-call.json`. Checked by T3.

**Inconsistencies noticed** (reported, not changed):
- I1. Unit line 20 says the Project store's "unknown-ID errors" are refused. `EntitiesService.resolve` returns them in `errors` and throws only for project refusals (`entities.service.ts` 36 to 64). This is a wording point for the unit (see the unit change candidates below).
- I2. Unit line 21 says the card shows sources "as links to the files route". The IDs in `sourcesUsed` are not paths, and `cardView` does not map `sourcesUsed` (OP1).
- I3. Unit line 18 ("takes effect on the next agent run") and TRG-12's executor (refuses a tool disabled at call time) differ for calls within one run (OP4).
- I4. AGL-02 S7 (c) counts only Project store refusals as invalid calls. `tool-run.ts` line 143 counts every `ModuleError`. The narrative handler avoids the difference (PC4), but built-ins and later units see it. Not changed.
- I5. DECISIONS 2026-11-16, the GNP-11 planner entry (line 5045), says AGL-09 line 19 reads a `styleProfile` that `project.yaml` does not name. The contract (`project.ts` line 24) and PST-01 (unit line 18) both name it. Only `examples/nonfiction/project.yaml` lacks it.

**Unit change candidates** (not made; reported to the orchestrator): reword unit line 20 (the Project store returns unknown IDs in a list; it does not throw), and reword unit line 21 ("links to the files route") after OP1 is answered.
