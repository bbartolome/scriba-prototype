---
id: AGL-02
status: done
title: Built-in tool framework (Ajv, readable errors, two retries, withdrawal) and list_files / read_file
unit: units/AGL-02-tool-framework-file-reads.md
revision: 2
base: main at 813cd28, working tree clean
---
# AGL-02 plan - built-in tool framework and file reads

Agent loop, `phase:file-tools-chat`, M1. Unit `units/AGL-02-tool-framework-file-reads.md`: front matter at lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9), Decisions at lines 17 to 22, acceptance criteria at lines 24 to 27.

Revision 2 (reviser, Opus), checked at `main` `813cd28`. Revision 1 was the planner's draft. Section 6 records how each open point of revision 1 is settled; none is left for the Navigator. Section 10 holds the review parts.

Tags: **checked** means the planner read the file and line, or confirmed it by grep, ls or git. **assumed** means a belief not checked here (section 9). This plan was written from the local checkout on `main` only. Nothing was built, installed, run, committed or changed except this file.

## 0. Summary

- AGL-02 adds an in-process tool dispatcher to the Agent loop module and two read-only built-in tools, `list_files` and `read_file`. They call the Project store's `FilesService` (checked). It adds no route to the composed app, no contract and no dependency: `ajv` 8.20.0 is already in `apps/api/package.json` line 16 (checked).
- Both blockers are on `main`. PST-12 is done (`plans/PST-12.md` line 3; commits `4989d44` and `377a83c`). AGL-01 is done (`plans/AGL-01.md` line 3; the slice is in `packages/contracts/src/agent-loop/`). The parallel units AGL-06 and AGL-07 are done too.
- The unit leaves several behaviours open: whether refusals count as invalid calls, the third answer, what unexpected failures do, and which format registry errors use. Section 1b fixes each one for this plan. Section 6 records why each is settled by the unit files or is a small choice of this plan; no point is open for the Navigator.
- Tests use a test-only HTTP harness, which is the unit's own seam until AGL-03 exists. No draft or planned plan changes a file this plan changes (section 7).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the README, the contracts and earlier plans

- **D1. A tool registry inside the loop.** Each built-in tool has a name from the reserved list, a JSON Schema argument schema, a family and a handler. The loop dispatches through it. Narrative tools plug into the same dispatcher in AGL-09. Source: unit line 18; `modules/agent-loop.md` lines 17 and 51 to 53.
- **D2. Ajv validation and unparseable arguments.** The loop validates built-in arguments with Ajv and catches arguments that are not parseable JSON. The providers client passes the raw argument string on unparsed. Source: unit line 19; `apps/api/src/modules/providers/client/types.ts` lines 49 and 53; `openai-compatible-client.ts` line 382 ("never parsed").
- **D3. Readable error format, for built-in and registry tools alike.** One line per problem, `<argument path>: <what is wrong>`, then a short summary of the expected arguments. The text is the tool result the model receives and what the card shows with the attempt number. Source: unit line 20; `modules/agent-loop.md` line 53; `units/AGL-07-chat-panel-ui.md` line 19 (the card shows the attempt and a withdrawn marker).
- **D4. Retries.** Per tool, per agent run, counting consecutive invalid calls. On the third consecutive invalid call to the same tool, the answer is "this tool is unavailable for the rest of this agent run" and the tool leaves the schemas for the remaining steps. A valid call resets the count. Source: unit line 21.
- **D5. Validation failures and the step cap.** Unknown entity IDs and edit-text mismatches count as validation failures (AGL-09 and AGL-12 use this). Retries count towards the step cap. Source: unit line 21; `units/AGL-09-narrative-tools.md` line 20 (registry errors count as retries "under the AGL-02 policy").
- **D6. The two read tools.** `list_files {path?, recursive?}` and `read_file {path}` call the Project store's file API in-process, with project-relative paths only. Path safety is the Project store's. Refusals come back as readable tool errors. Source: unit line 22; `modules/agent-loop.md` line 17.
- **D7. Reads only.** M1 ships only `list_files` and `read_file`. Writes come later (AGL-12). The only direct writes of the loop are to `logs/`. Source: `modules/agent-loop.md` lines 54 and 80.
- **D8. One call at a time.** Tool calls in one reply run in order, one at a time. Source: `modules/agent-loop.md` line 75 (no parallel tool calls); `units/AGL-03-loop-core.md` line 22.
- **D9. Test seam.** The composed app with the mock once AGL-03 exists. Until then the dispatcher is tested through a test-only HTTP harness. Tests check external behaviour only (HTTP responses, files on disk, what the mock model receives); they never call the dispatcher class directly. Source: unit line 24 (heading); `units/README.md` line 136; `modules/agent-loop.md` lines 61 and 63.
- **D10. Module boundaries.** `agent-loop` imports another module only through its entry file (the `*.module.ts` file). It imports `ProjectStoreModule` and `PlatformModule` from their entry files, and never imports `tool-registry`. Source: `eslint.config.mjs` line 50 (rule R1); `project-store.module.ts` lines 18 to 21 (the entry exports `FilesService`).
- **D11. No new error code.** A tool refusal is a tool result, not an HTTP error. The four `AGENT_` codes do not cover it. Source: `modules/agent-loop.md` line 58; `packages/contracts/src/agent-loop/errors.ts`.
- **D12. Tool-call error shape.** The contract is `{callId, message, attempt, withdrawn?}`, with `attempt` an integer of at least 1. Source: `packages/contracts/src/agent-loop/events.ts` lines 47 to 51; `cards.ts` line 32. The meaning of `attempt` is fixed in S6, as `plans/AGL-01.md` line 123 asks.
- **D13. Structured issues.** The registry's structured issues have the shape `{path, message}`. `path` is a JSON Pointer, and the empty string means the whole argument set. Source: `packages/contracts/src/tool-registry/errors.ts` lines 56 to 59; `plans/TRG-02.md` line 49 (D7). The readable renderer works from these issues, so built-in and registry errors share one renderer.
- **D14. Validator settings.** No coercion, as the registry does. Source: `units/TRG-02-emission-validate.md` line 24 ("no coercion"); `plans/TRG-02.md` line 45 (the Ajv options, without `coerceTypes`).
- **D15. Families and reserved names.** The built-in names come from `AGENT_RESERVED_TOOL_NAMES` (`packages/contracts/src/agent-loop/constants.ts` lines 31 to 42; `list_files` and `read_file` are its first two entries). Families come from `AGENT_TOOL_FAMILIES` (line 9). Both tools are family `project`. Source: `plans/AGL-01.md` line 123.

### 1b. Small decisions this plan makes

These are choices the unit does not settle in words. Section 6 gives the source or the reason for each one.

- **S1. Ajv setup.** One Ajv instance in the service with `allErrors` and `strict`, no `coerceTypes` and no `useDefaults`. A string `"yes"` for a boolean is refused and nothing is coerced. Both built-in schemas set `additionalProperties: false` (O7).
- **S2. Issue wording for built-in issues.** Registry issues keep the wording they bring. Built-in issues use:
  - missing required property: `<name>: is required`
  - wrong JSON type: `<name>: must be a <type>`, for example `must be a string` or `must be a boolean`
  - root value not an object: `arguments: must be an object`
  - unknown key: `<key>: is not an argument of this tool`
  - unparseable JSON: `arguments: is not valid JSON`
  - any other Ajv keyword: the Ajv message
- **S3. Path display.** A JSON Pointer loses its leading `/`, and `~1` and `~0` are unescaped. The empty pointer shows as `arguments`.
- **S4. Empty argument string.** An empty or whitespace-only argument string counts as `{}` (O7).
- **S5. Expected summary.** One last line, in schema property order. The two fixed texts are:
  - `Expected arguments for read_file: path (string, required).`
  - `Expected arguments for list_files: path (string, optional), recursive (boolean, optional).`
  A tool with no properties says `none` after the colon.
- **S6. Attempts and withdrawal.**
  - The first invalid call is attempt 1, the second attempt 2, and the third attempt 3 with `withdrawn: true`.
  - The third answer is the readable lines, then the expected summary, then `This tool is unavailable for the rest of this agent run.` (O2).
  - A later call to a withdrawn tool answers only that sentence, with `withdrawn: true` and `attempt: 3`. It is not counted.
  - A success resets the count to zero.
- **S7. What counts as invalid (O1, O4).** Invalid calls are: (a) arguments that are not parseable JSON or not an object; (b) a schema violation; (c) any `ModuleError` refusal from the Project store, which becomes the readable line `path: <message>`; (d) a `ToolArgumentError` thrown by a handler (AGL-09, AGL-12). A success is a valid call. An unexpected exception (neither a `ModuleError` nor a `ToolArgumentError`) is neither: it does not count and does not reset. Its answer is the fixed text `The tool failed. Try again or use another tool.` with `attempt` set to the current count, or 1 when the count is zero.
- **S8. Calls that are not offered.** A name that is not a built-in, or whose family is not enabled for the run, answers `This tool is not available in this agent run.` with `attempt: 1` and `valid: false`. It is not counted (O8).
- **S9. Dispatch result.** Each call returns `{arguments, valid, outcome}`. `arguments` is the parsed value when the JSON parsed, and the raw string otherwise (the contract's `tool-call-args`). `valid` is true when the arguments parsed and passed the schema. `outcome` is either `{kind: 'result', summary, output, modelText}` or `{kind: 'error', message, attempt, withdrawn?}`. The model receives `modelText` for a result and `message` for an error.
- **S10. Model text.** `modelText` is `JSON.stringify(output)` unless the handler supplies its own text. AGL-22 uses this for the untrusted marking.
- **S11. Outputs and summaries.**
  - `list_files`: default path is `.` (the project root) when the path is omitted; `recursive` defaults to false. The output is the Project store's `FileList` (`{entries}`). The summary is `Listed <folder>.`, where the root is shown as `the project root`.
  - `read_file`: the output is `{path, content}`. The hash and mtime are left out to keep the model text short. The summary is `Read <path>.`
- **S12. Descriptions the model sees.**
  - `list_files`: "List the files and folders at a project-relative folder path. Leave the path out for the project root."
  - `read_file`: "Read the text of a project-relative file."
- **S13. Schema shape.** Each offered definition is sent as `{type: 'function', function: {name, description, parameters}}`, the shape of `ToolSchema` in `providers/client/types.ts` lines 12 to 19. It is written again in agent-loop, not imported, because of D10.
- **S14. Per-run state.** `AgentToolsService.startRun({runId, projectId, enabledFamilies})` returns a `ToolRun`. The `ToolRun` is the only holder of the counts, the withdrawn names, the project id and the families for one agent run. AGL-03 creates one per agent run.
- **S15. Dispatch shape.** `dispatch` is async. It takes the call (`callId`, `name`, `arguments` as the raw string) and an optional `AbortSignal`. Handlers receive `{run, callId, signal?}`, so they can read `run.projectId` and keep per-run state on the `ToolRun`. The two read tools ignore the signal.
- **S16. Reserved names by type.** Built-in definitions type their names with the contract's `AgentReservedToolName`, so a built-in cannot take a name outside the reserved list. This is a compile-time check, with no runtime guard.
- **S17. Handler errors.** `ToolArgumentError` carries `issues: {path, message}[]`, the same shape as D13. AGL-09 and AGL-12 use it, so handlers report validation failures in one format.
- **S18. Refusal attribution.** A `ModuleError` from the Project store maps to one issue at path `path`, with the refusal's message. Both built-in tools have exactly one argument, `path`, so no other attribution is needed.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/tools/tool-types.ts` | new | Types: `ToolDefinition` (name, family, description, schema, handler), `ToolContext`, `ToolHandlerResult`, `ToolOutcome`, `DispatchResult`, and `ToolArgumentError` with `issues`. |
| `apps/api/src/modules/agent-loop/tools/readable-error.ts` | new | The one renderer: Ajv error to issue (S2, S3), issues to lines, and the expected summary (S5). Used for built-in and registry issues (D13). |
| `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` | new | `builtinTools(files: FilesService)` returns the two definitions: schemas (S1), descriptions (S12), and handlers (S11) that call `FilesService.list` and `FilesService.read` with `run.projectId`. |
| `apps/api/src/modules/agent-loop/tools/tool-run.ts` | new | `ToolRun`: per-run counts, withdrawn names, families and project id; `schemas()` returns the offered, not withdrawn definitions as function schemas; `dispatch()` runs S6 to S9. A plain class with no Nest code. |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | new | `@Injectable() AgentToolsService`. Builds the Ajv instance, compiles each definition's schema once, and provides `startRun`. Injects `FilesService`. |
| `apps/api/src/modules/agent-loop/agent-loop.module.ts` | edit | `imports` gains `ProjectStoreModule`, from its entry file. `providers` and `exports` gain `AgentToolsService`. The entry file re-exports `AgentToolsService` and its types, as it does `AgentSettingsService` (lines 7 to 12). The settings registration stays as it is. |
| `apps/api/test/agent-loop-tools.kit.ts` | new | Test-only kit: `agentLoopToolsKitModule()`, with a controller at `api/agent-loop-test`. `POST runs` (body `{projectId}`, returns `{runId}`); `POST runs/:runId/calls` (body `{callId, name, arguments}`, returns `{arguments, valid, outcome}`); `GET runs/:runId/tools` (returns `{tools: [names]}` of the offered, not withdrawn tools). The runs live in a map in the kit. The kit is never in the composed app. |
| `apps/api/test/agent-loop-tools.test.ts` | new | Tests for AC1 to AC3 (section 4). |

Not changed (checked against the plans in section 7): `packages/contracts/**` (AGL-01 closed the slice); `apps/api/package.json` and `package-lock.json` (ajv is already a dependency); `apps/api/src/app.module.ts` (AgentLoopModule is already composed, lines 19 to 26); everything under `apps/api/src/modules/project-store/`, `tool-registry/` and `providers/`; `apps/api/test/create-test-app.ts`; `apps/api/test/invariant-sweep.ts`; `eslint.config.mjs`; `e2e/**`; `apps/web/**`; `units/**`; `modules/**`; and `plans/**` other than this file.

## 3. Procedure

0. **Preconditions.** `git status --short` prints nothing (checked: the tree is clean). `grep -n '^status:' plans/PST-12.md plans/AGL-01.md plans/AGL-06.md` prints `status: done` for each. `node_modules/ajv/package.json` is present at the repository root (checked: npm workspaces hoist `ajv`, and `apps/api/node_modules/ajv` does not exist); if not, run `npm ci` at the root (expected: exit 0). Expected: all three hold.
1. **Red first.** Write `agent-loop-tools.kit.ts` and `agent-loop-tools.test.ts` with the tests of section 4 and their exact strings. Run `npx vitest run test/agent-loop-tools.test.ts` in `apps/api`. Expected: the run fails, because the agent-tools service and the tools do not exist yet. Commit the two files only: `git add` both paths, then `git commit -m "feat(AGL-02): add failing tool tests (AC1 to AC3)" -- <both paths>`. AGL-06 used the same red-first commit (`8a58dce`).
2. **Renderer.** Write `tools/tool-types.ts` and `tools/readable-error.ts` (S2, S3, S5, S17, D13). Expected: neither file imports anything outside `agent-loop/tools/` except the contract types.
3. **Built-in tools.** Write `tools/builtin-tools.ts` (S1, S11, S12, S16). Expected: the `path` argument is the only argument of `read_file`, and `list_files` has `path` and `recursive`, both optional.
4. **Run state.** Write `tools/tool-run.ts` (S6 to S10, S13 to S15, S18). Expected: no import from `@nestjs/*` in this file.
5. **Service and module.** Write `agent-tools.service.ts` (S1, S14). Edit `agent-loop.module.ts` (imports, providers, exports, entry re-exports). Expected: `grep -rn "tool-registry" apps/api/src/modules/agent-loop` prints nothing (D10).
6. **Run the three tests.** In `apps/api`, run `npx vitest run test/agent-loop-tools.test.ts`. Expected: 3 tests pass, every assertion of section 4 holds.
7. **Full API suite.** Run `npm test -w @bbartolome/scriba-api` (build, then all Vitest files, including `invariant-get-head` and `invariant-mutation-guard`). Expected: exit 0, and no new route in the composed app.
8. **Lint and format.** Run `npm run lint -w @bbartolome/scriba-api` (ESLint, including the boundary rule R1) and `npx prettier --check apps/api/src/modules/agent-loop apps/api/test/agent-loop-tools.kit.ts apps/api/test/agent-loop-tools.test.ts`. Expected: both exit 0.
9. **Commit the source.** `git add` the section 2 source paths, then `git commit -m "feat(AGL-02): built-in tool framework, list_files and read_file" -- <paths>`. Commit before the mutation checks: `git checkout -- <file>` restores only tracked files, which is the lesson of `plans/DECISIONS.md` line 2900.
10. **Mutation checks.** One at a time, undo each with `git checkout -- <file>` and run the test file again. Expected: the named test fails under each mutation.
    - M1: a `ModuleError` refusal is swallowed and the call answers success. Expected failure: AC1.
    - M2: withdrawal at the second consecutive invalid call. Expected failure: AC3, case 1.
    - M3: a success does not reset the count. Expected failure: AC3, case 2.
    - M4: `coerceTypes: true` on the Ajv instance. Expected failure: AC2, case c.
    - M5: `additionalProperties: false` removed from `read_file`. Expected failure: AC2, case e.
    - M6: the expected summary dropped from the message. Expected failure: every AC2 case.
11. **Changed paths.** `git status --short` lists exactly the section 2 paths: the new files as `??` and `agent-loop.module.ts` as ` M`. Expected: no other path.

## 4. Acceptance criteria and tests

All tests are in `apps/api/test/agent-loop-tools.test.ts`. Each one boots `createTestApp({libraryDir, modules: [PlatformModule, AgentLoopModule, agentLoopToolsKitModule()]})` on `bookLibrary()` (`apps/api/test/project-store-files.kit.ts` line 44). That fixture makes project `book` active (lines 40 and 41) and holds `book/sources/outline.md` with the text `# Outline\n` (`project-store-projects.kit.ts` line 48). Requests go through `send()` (`guard-request.ts` line 27) with `LOOPBACK_HOST` (`invariant-sweep.ts` line 38). Each test removes its fixture. No test reads `examples/`.

The harness has no guard module, the same as the Project store's test kit `activeKitModule`, so no session cookie is needed. No model is involved in AC1 to AC3; the mock's view of the tool list is AGL-03's test.

Within a test, every case that is not the case under test runs in its own run, so no counts leak between cases. Counts are tested only in AC3.

### AC1: a path outside the project is refused with a readable error

Test name: `AC1: a path outside the project is refused with a readable error, and nothing outside is shown`.

Setup: a symlink `book/escape.md` that points to `outside/secret.md`, where `outside` is the temp folder `ProjectsLibrary.outside` (`project-store-projects.kit.ts` line 21), and `secret.md` holds `SECRET-OUTSIDE`. The symlink form follows `project-store-path-safety.kit.ts` line 50.

Each case is one run of project `book`:

1. `read_file` with `{"path":"../outside/secret.md"}`: `valid: false`, error outcome, no `withdrawn`, `attempt: 1`. Message, exactly: `path: The path must not contain a ".." segment.` then a newline and `Expected arguments for read_file: path (string, required).`
2. `read_file` with `{"path":"/etc/passwd"}`: message `path: The path must be relative to the project, not absolute.` and the same read summary line.
3. `read_file` with `{"path":"escape.md"}`: message `path: The path leads outside the project, or through a link that cannot be resolved.` and the same read summary line.
4. `list_files` with `{"path":"../"}`: message `path: The path must not contain a ".." segment.` and the line `Expected arguments for list_files: path (string, optional), recursive (boolean, optional).`
5. Control, a valid call: `list_files` with `{"path":"sources"}` gives a result, summary `Listed sources.`, and `output.entries` holds exactly one entry, `sources/outline.md` of kind `file`. Then `read_file` with `{"path":"sources/outline.md"}` gives a result, summary `Read sources/outline.md.`, and output `{path: "sources/outline.md", content: "# Outline\n"}`.

Across all replies: no body contains `SECRET-OUTSIDE`, and no body contains the path of the `outside` folder.

### AC2: unparseable JSON arguments and schema violations produce the readable format

Test name: `AC2: unparseable JSON and schema violations produce the readable format`.

Each case is its own run. Every case has `valid: false`, `attempt: 1` and no `withdrawn`:

- a. `read_file`, arguments `{"path": ` (cut short). Message: `arguments: is not valid JSON` then `Expected arguments for read_file: path (string, required).` The reply's `arguments` is the raw string.
- b. `read_file`, arguments `{}`. Message: `path: is required` then the read summary line.
- c. `list_files`, arguments `{"recursive": "yes"}`. Message: `recursive: must be a boolean` then `Expected arguments for list_files: path (string, optional), recursive (boolean, optional).` The string is not coerced.
- d. `read_file`, arguments `{"path": 3}`. Message: `path: must be a string` then the read summary line.
- e. `read_file`, arguments `{"path": "sources/outline.md", "extra": 1}`. Message: `extra: is not an argument of this tool` then the read summary line. The reply's `arguments` is the parsed object.
- f. `read_file`, arguments `[1]`. Message: `arguments: must be an object` then the read summary line. The reply's `arguments` is `[1]`.

### AC3: two readable errors, then the tool is withdrawn on the third consecutive invalid call; a valid call in between resets the count

Test name: `AC3: a tool is withdrawn on the third consecutive invalid call, and a valid call resets the count`.

Case 1, one run:

1. `read_file` with `{}`: `attempt: 1`, no `withdrawn`. Message: `path: is required` then the read summary line.
2. `read_file` with `{}`: `attempt: 2`, no `withdrawn`. Same message.
3. `read_file` with `{}`: `attempt: 3`, `withdrawn: true`. Message: `path: is required`, the read summary line, then `This tool is unavailable for the rest of this agent run.`
4. The tools endpoint returns `["list_files"]`: `read_file` has left the schemas.
5. `read_file` with `{"path":"sources/outline.md"}` (valid): `valid: true`, error outcome with message `This tool is unavailable for the rest of this agent run.`, `withdrawn: true`, `attempt: 3`.
6. `list_files` with `{"path":"sources"}`: still a result, so other tools are not affected.

Case 2, one run:

1. `read_file` with `{}`: `attempt: 1`.
2. `read_file` with `{}`: `attempt: 2`.
3. `read_file` with `{"path":"sources/outline.md"}`: a result, summary `Read sources/outline.md.`. The count is reset.
4. `read_file` with `{}`: `attempt: 1`, no `withdrawn`.
5. `read_file` with `{}`: `attempt: 2`, no `withdrawn`.
6. The tools endpoint includes `read_file`.
7. `read_file` with `{}`: `attempt: 3`, `withdrawn: true`.

## 5. Downstream agreement

| Unit | What it needs from AGL-02 | What AGL-02 provides | Agreement |
|---|---|---|---|
| **AGL-03** loop core (`blocked_by` line 7) | Schemas of the enabled families in each request (its criterion, "only the enabled families' tools"); one call at a time in order (its Step bullet, line 22); `tool-call-args` from `{arguments, valid}`; a result or an error from `outcome`. | `AgentToolsService.startRun`, `ToolRun.schemas()`, `ToolRun.dispatch()`. | AGL-03 creates one `ToolRun` per agent run and passes `runId`, `projectId` and the families from the settings. It sends each schema in the client's tool list unchanged (S13). The tool message to the model is `modelText` for a result and `message` for an error. Retries count as model steps (D5). AGL-03 owns the events and the `AGENT_*` codes. |
| **AGL-08** file-tools-chat gate (`blocked_by` line 7) | The `list_files` and `read_file` cards with their summaries (demo line 27); AC1 to AC3 "pass on `main`" (criterion line 22). | The summaries (S11) and the tests of section 4. | The AGL-02 tests stay in the repo as written. AGL-08 owns the re-run of AC1 to AC3 through the composed app and the mock (O5, section 6): its criterion line 22 names "outside-path refusal" and "malformed-turn withdrawal", and its `blocked_by` (line 7) holds AGL-03 and PLT-13. |
| **AGL-10** `search_notes` (`blocked_by` line 7) | A built-in `search_notes` with its reserved name, family `project`, and readable errors for invalid arguments (its criteria). | The reserved names, the renderer and `builtinTools(files)`. | AGL-10 adds one definition to the list in `builtin-tools.ts`, with a schema under S1. Its handler throws `ToolArgumentError` for bad input (S17). No other AGL-02 file changes. |
| **AGL-12** write overlay (`blocked_by` line 7; decisions lines 18 to 21) | `write_file` and `edit_file` as built-ins. `read_file` must see the run overlay. The captured base. `edit_file` with zero or two matches gives two distinct readable errors, which count (S7 (d)). | `ToolRun` is per agent run and reaches handlers as `ctx.run`. | AGL-12 keeps the overlay on the `ToolRun`. It changes the `read_file` handler and adds two definitions in `builtin-tools.ts`. The captured base is the on-disk text on the first read or write, read through `FilesService.read`. |
| **AGL-22** `fetch_page` (`blocked_by` line 7; decisions lines 18 to 21) | An async handler that can be aborted (`ctx.signal`). A family `research`, offered only when research is on. Untrusted marking in the tool result. Refusals as readable errors. | `dispatch` is async (S15); `signal` is passed through; `modelText` (S10); the `enabledFamilies` argument of `startRun`. | AGL-22 adds one definition with family `research`. Its refusals are `ModuleError` or `ToolArgumentError`, both counted under S7. |
| **AGL-09** narrative tools (blocked by AGL-08 and TRG-12, not AGL-02; line 20 applies the AGL-02 policy) | Registry definitions added to a run, and registry errors as readable errors. | Renderer (D13) and `ToolArgumentError` (S17). | The registry's `TOOL_ARGS_INVALID` already carries `details: {issues}` (contract `toolArgsInvalidDetailsSchema`, `packages/contracts/src/tool-registry/errors.ts` lines 63 to 66; `validate.ts` line 243 builds it), so TRG-12 needs nothing new. AGL-09 wraps `details.issues` in `ToolArgumentError`; for an entity error with no issues it makes one issue from the message (O3, section 6). |
| **AGL-01** contract (done) | Reserved names, families, `toolCallErrorDataSchema`. | Uses them unchanged. The meaning of `attempt` is fixed here (S6). | No change to the contract. |
| **AGL-06** settings and **AGL-07** chat panel (done, parallel) | AGL-06: the families are set from the agent settings at run start (AGL-03). AGL-07: the card shows the attempt and the withdrawn marker. | None needed. | No change. |

## 6. Open points, settled in revision 2

No point is left for the Navigator. A point goes to the Navigator only when the unit files, the module files and `plans/DECISIONS.md` give no answer and the options affect other units or are expensive to change (`prompt.md`, section "Navigator"). `plans/DECISIONS.md` has no entry for AGL-02 (checked by grep).

- **O1 (settled by the unit files).** Refusals count as invalid calls (S7 (c)). Sources: unit line 22 says refusals "come back as readable tool errors"; unit line 20 says that readable text is "shown on the card with the attempt number", so every readable error has an attempt in the count; unit line 21 already counts errors of argument values, not only of shape ("Unknown entity IDs and edit-text mismatches count as validation failures"); `units/AGL-09-narrative-tools.md` line 20 counts "Project store unknown-ID errors" as retries under the AGL-02 policy; unit line 15 says "a tool that keeps failing is withdrawn". A Project store refusal is the same class as an unknown ID: the argument value names something the store refuses. So a loop of `../` or missing files is withdrawn after three consecutive calls. The contract also needs `attempt` at least 1 on every `tool-call-error` (`events.ts` line 50).
- **O2 (small choice of this plan).** The third answer is the readable lines, the expected summary, then `This tool is unavailable for the rest of this agent run.` (S6). Unit line 21 says to "answer" the sentence; it does not say to drop the readable lines, and unit line 20 says the readable text is the tool result. No other unit reads this text; a change is one line in `tool-run.ts`.
- **O3 (settled by the unit and the contract).** Registry errors use the unit's format, rendered from structured issues. Sources: unit line 20 fixes one format "built-in and registry tools alike"; `modules/agent-loop.md` line 53 asks for "the same readable-error format" for both, which one renderer gives; the published contract already carries the issues of `TOOL_ARGS_INVALID` as `details: {issues}` (`packages/contracts/src/tool-registry/errors.ts` lines 63 to 66), and TRG-02's `validate.ts` line 243 fills them. TRG-02's own text (`validate.ts` lines 219 to 249) stays the registry's HTTP error message; this plan does not change it. No new requirement falls on TRG-12: its criterion (line 38) already returns `TOOL_ARGS_INVALID` from the same validation. AGL-09 (its line 20) renders `details.issues`, and for an entity error, whose details carry no issues, one issue at the empty path with the error's message. AGL-02 itself renders built-in issues only; the registry path is AGL-09's.
- **O4 (small choice of this plan).** An unexpected exception (neither a `ModuleError` nor a `ToolArgumentError`) does not count and does not reset (S7). Unit line 21 counts "invalid calls"; an internal fault is not an invalid call by the model. The step cap (unit line 21, AGL-03 line 23) still bounds a tool that keeps failing. AGL-22's cut-offs (its line 25: "a readable error") are refusals it throws as `ModuleError` or `ToolArgumentError`, so they count under S7.
- **O5 (settled by AGL-08).** AGL-08 owns the re-run of AC1 to AC3 through the composed app and the mock server. Sources: `units/AGL-08-file-tools-chat-gate.md` line 22 names "outside-path refusal" and "malformed-turn withdrawal" among the criteria (AGL-02 to AGL-07) that must pass on `main`; a "turn" is a scripted mock turn (`modules/agent-loop.md` line 62 lists the "malformed arguments" turn on the primary seam); AGL-08's `blocked_by` (line 7) holds AGL-03 and PLT-13, so the composed loop and the mock exist when it is planned. AGL-03's criteria (lines 31 to 36) do not name withdrawal, and adding a criterion or a scope item to AGL-03 is not one of the reviser's four actions, so AGL-03 is not changed. The AGL-02 harness tests stay on `main`; AGL-08's planner adds the two scripted turns (an outside path, three malformed calls) through the composed app. No unit change.
- **O6 (small choice of this plan).** No cap on what `read_file` or a recursive `list_files` returns. The Project store refuses files over 5 MiB (`files.service.ts` line 52). No criterion of AGL-02 needs a cap, and context trimming is AGL-04's (`modules/agent-loop.md` line 21).
- **O7 (small choice of this plan).** `additionalProperties: false` (S1) and an empty argument string read as `{}` (S4). AC2 case e tests the first. Each is one line.
- **O8 (small choice of this plan).** Attempt values of the answers that are not counted: 1 for a call that is not offered (S8), 3 for a call to a withdrawn tool (S6). The contract needs an integer of at least 1 (`events.ts` line 50).

## 7. Shared files with draft and planned plans

Draft and planned plans, found by `grep -n '^status:' plans/*.md` (every other plan is `done`): GRR-01 (`draft`, line 3), MPR-08 (`planned`) and TRG-06 (`planned`).

| Plan | Status | Paths it changes | Overlap with AGL-02 |
|---|---|---|---|
| `plans/GRR-01.md` | draft | `packages/contracts/src/graph-runner/**` and `packages/contracts/test/**`. Table lines 105 to 118; "only these paths change", line 101. | None. |
| `plans/MPR-08.md` | planned | `apps/api/test/providers-gate.test.ts` (new; row line 54) and one line in `modules/providers.md` (row line 55). Line 59: no change under `apps/api/src/**`. | None. |
| `plans/TRG-06.md` | planned | `apps/api/src/modules/tool-registry/**` (new `packs.ts` and `entity-types.ts`; edits to `catalog.service.ts` and `tool-registry.module.ts`; `cold-open.ts` deleted), `apps/api/test/fixtures/packs/**`, `apps/api/test/tool-registry-api.test.ts` (edit) and `apps/api/test/tool-registry-loader.test.ts` (new). Table lines 70 to 80. Its "not changed" list, line 66, names `apps/api/src/app.module.ts`, `apps/api/test/create-test-app.ts` and `apps/api/test/invariant-sweep.ts`. | None. |

**Result.** No draft or planned plan changes a path this plan changes. No change to a shared file is needed for either order. The shared files that AGL-02 reads are unchanged by those plans: `project-store.module.ts` (entry), `app.module.ts`, `project-store-projects.kit.ts`, `project-store-files.kit.ts`, `guard-request.ts` and `invariant-sweep.ts`.

Later: AGL-03 (blocked by AGL-02) will also edit `agent-loop.module.ts`. It is not planned yet. Its order after AGL-02 follows from its `blocked_by`.

Side note, not used by this plan: `plans/TRG-06.md` line 142 calls `plans/PST-12.md` "planned", but PST-12 is done (its line 3). No effect here.

## 8. Facts checked

Unit and module:
- Unit front matter lines 2 to 9; Decisions lines 17 to 22; criteria lines 24 to 27 (`units/AGL-02-tool-framework-file-reads.md`). The file has no note that records a change. Its only recorded change is commit `098add9`, which added AGL-08 to `unblocks`, and AGL-08's `blocked_by` (line 7) already names AGL-02.
- `modules/agent-loop.md`: lines 3, 17, 43 to 44, 51 to 54, 58, 61 to 63, 70, 74 to 75, 80.
- `units/README.md`: line 57 (the heading seam), lines 62 to 64 (blocker notation), line 136 (testing).
- `eslint.config.mjs` line 50 (rule R1: entry files only).
- `units/AGL-03-loop-core.md`: line 7 (`blocked_by`), line 21 (messages each step), line 22 (step: calls in order, one at a time), line 24 (stop), criteria after line 30.
- `units/AGL-08-file-tools-chat-gate.md`: line 7, line 22 (criterion), line 27 (demo, `list_files` and `read_file` cards).
- `units/AGL-09-narrative-tools.md`: line 7, line 20 (registry errors count as retries under the AGL-02 policy).
- `units/AGL-10-search-notes.md`: line 7, line 15 (decisions).
- `units/AGL-12-write-overlay.md`: line 7, lines 17 to 21 (decisions).
- `units/AGL-22-fetch-page.md`: line 7, lines 17 to 21 (decisions).
- `units/AGL-07-chat-panel-ui.md` line 19 (card attempt and withdrawn marker). `units/TRG-02-emission-validate.md` line 24 (no coercion, readable message).

Contracts (`packages/contracts/src/agent-loop/`):
- `constants.ts`: line 9 (`AGENT_TOOL_FAMILIES`), lines 31 to 42 (`AGENT_RESERVED_TOOL_NAMES`; `list_files` line 32, `read_file` line 33).
- `events.ts`: lines 47 to 51 (`toolCallErrorDataSchema`; `attempt` at line 50 has minimum 1).
- `cards.ts`: line 32 (card error: `attempt` minimum 1, `withdrawn`).
- `errors.ts`: four `AGENT_` codes and no tool error code.

Project store and platform:
- `files.service.ts`: `list` line 232, `read` line 257, `write` line 272, `refuse` line 70 (a `ModuleError`), `projectFor` line 525 (`requireActive` first), `collect` line 569 skips names that start with a dot (line 577), `FILE_MESSAGES` lines 49 to 52 (NO_FILE, NO_FOLDER, NOT_TEXT, TOO_LARGE).
- `project-store.service.ts`: `resolvePath` line 41, `activeId` line 46, `requireActive` line 66.
- `path-safety.ts`: the check order is empty (line 123), NUL, backslash, leading `/` (line 132, ABSOLUTE), then the segments: `..` gives DOTDOT (line 138), an empty segment, and `.` is skipped (line 143). `PATH_MESSAGES`: EMPTY line 22, ABSOLUTE line 25, DOTDOT line 26, OUTSIDE lines 29 and 30, RESERVED line 31.
- `project-store.module.ts`: the entry exports lines 18 to 21 (`FilesService` line 19); `exports` line 54.
- `packages/contracts/src/project-store/files.ts`: `fileListQuerySchema` `path` is a string; `FileList` entries have `path`, `kind`, `size` and `mtime`.
- `packages/contracts/src/project-store/constants.ts` line 23 (`FILE_SIZE_CAP_BYTES`, 5 MiB).
- `platform.module.ts` line 17 (re-exports `ModuleError`); `errors/module-error.ts` lines 2 to 5.

Providers and registry (code on main):
- `providers/client/types.ts`: lines 11 to 19 (`ToolSchema`), line 49 (raw arguments comment), lines 50 to 54 (`ToolCall`, `arguments: string`).
- `openai-compatible-client.ts` line 382 (tool-call fragments are never parsed).
- `tool-registry/validate.ts`: line 1 (Ajv import), lines 220 to 245 (`argsInvalid`: the lead line, the `- field` lines, the unknown-fields line, and `{issues}` details).
- `packages/contracts/src/tool-registry/errors.ts` lines 56 to 59 (`toolArgsIssueSchema`: `{path, message}`).
- `plans/TRG-02.md` line 45 (Ajv options: `allErrors`, `useDefaults`, `strict`; `coerceTypes` unset), lines 48 to 49 (D7: JSON Pointer paths, the empty string for the whole set, the message wording).

Agent-loop code and composition on main:
- `apps/api/src/modules/agent-loop/agent-loop.module.ts`: `@Module` line 17, `imports: [PlatformModule]` line 18, `providers` line 20, `exports` line 31, entry re-exports lines 7 to 12. No tools code exists yet.
- `apps/api/src/app.module.ts`: `COMPOSED_MODULES` lines 19 to 26 (includes `AgentLoopModule`), line 51 (`options.modules ?? COMPOSED_MODULES`).
- `apps/api/package.json` line 16: `"ajv": "8.20.0"`. `tool-registry/validate.ts` line 1 imports Ajv the same way AGL-02 will.

Test kit:
- `create-test-app.ts`: lines 9 to 14 (`TestAppOptions`; `modules` replaces the composed list), line 65 (`createTestApp`).
- `guard-request.ts`: line 27 (`send`), line 80 (`sessionCookie`).
- `invariant-sweep.ts` line 38 (`LOOPBACK_HOST`).
- `project-store-projects.kit.ts`: lines 19 to 23 (`ProjectsLibrary`: `library`, `outside`, `remove`), line 30 (`buildProjectsLibrary`), line 48 (`book/sources/outline.md`).
- `project-store-files.kit.ts`: lines 40 and 41 (`ACTIVE_BOOK_SETTINGS`, `active: book`), line 44 (`bookLibrary`), line 70 (`putFile`).
- `project-store-path-safety.kit.ts`: line 28 (the outside folder), line 50 (`symlinkSync`).
- `project-store-active.kit.ts`: `activeKitModule`, a test kit with an `api/project-store-test` controller and no guard (the precedent for the harness).

Revision 2 (reviser), re-checked at `813cd28`: unit lines 15 and 18 to 27; `modules/agent-loop.md` lines 21, 53 and 62; AGL-03 lines 7 and 23 to 36; AGL-08 lines 7 and 22; AGL-09 line 20; TRG-12 line 38; `packages/contracts/src/tool-registry/errors.ts` lines 56 to 66; `validate.ts` lines 220 and 243; `events.ts` line 50; `files.service.ts` lines 48 to 55, 232 to 269 and 525 to 532; `path-safety.ts` lines 21 to 33 and 123 to 145; the test kit lines of section 4; `grep -l '^status: \(draft\|planned\)' plans/*.md` gives GRR-01, MPR-08, TRG-06 and this file; no `plans/AGL-03.md` or `plans/AGL-08.md`; `plans/DECISIONS.md` has no AGL-02 entry.

Other plans and git:
- `plans/AGL-01.md` line 123 (the fixed `attempt` meaning is left to AGL-02). `plans/PST-12.md` line 3 (`status: done`). `plans/AGL-06.md` `status: done`; commit `8a58dce` (red-first precedent). `plans/DECISIONS.md` line 2900 (the mutation-check lesson). `plans/QUEUE.md` line 2 (AGL-02: available).
- Git: HEAD `303c14c`; `git status --short` prints nothing; PST-12 commits `4989d44` and `377a83c` are on `main`.

## 9. Assumed (not checked by this plan)

- The dependencies are installed in this checkout (root `node_modules`; `node_modules/ajv/package.json` is present, checked in revision 2). Step 0 covers the case where they are not.
- Ajv 8.20.0 in strict mode accepts the `description` keyword and the schema forms of S1. The TRG-02 scratch run (`plans/TRG-02.md` section 7a) found that only `x-` keywords are rejected; that run was not repeated here.
- The symlink in AC1 resolves outside the project as `path-safety.ts` says. This is the same case as `project-store-path-safety.kit.ts` line 50. No test was run.
- With `modules` set and the default static root, `createTestApp` works for a test module without a guard, as `activeKitModule` does.
- `npx vitest run` in `apps/api` runs the test file. `npm test -w @bbartolome/scriba-api` runs the build first (`apps/api/package.json`, `test` script).
- Provider behaviour for an empty argument string (S4) and the shape of the mock's tool calls are not checked. No fixture covers them in AGL-02.
- The implementer's Node version matches the root `engines` field (`>=26 <27`).

## 10. Review parts

Each step of section 3 and each test of section 4 is in exactly one part. Review part 1 before part 2; the test file of step 1 runs whole at step 6, because every test goes through the harness and both read tools.

- **Part 1: dispatcher, readable errors and counts.** Steps 0 (preconditions), 1 (red tests and the harness kit), 2 (types and renderer), 4 (`ToolRun`: dispatch, counts, withdrawal) and 5 (service and module wiring). Tests: AC2 (`AC2: unparseable JSON and schema violations produce the readable format`) and AC3 (`AC3: a tool is withdrawn on the third consecutive invalid call, and a valid call resets the count`).
- **Part 2: the two read tools and the checks.** Steps 3 (`list_files` and `read_file` on `FilesService`), 6 (the three tests), 7 (full API suite), 8 (lint and format), 9 (source commit), 10 (mutation checks M1 to M6) and 11 (changed paths). Test: AC1 (`AC1: a path outside the project is refused with a readable error, and nothing outside is shown`).
