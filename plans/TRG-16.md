---
id: TRG-16
status: draft
---
# TRG-16 plan — Try panel: run a tool against the active project

Revision 1, written at main `eef0286` by the planner. Summary: TRG-16 adds a **Try** tab to the detail of the Tools list (TRG-13), for a valid row. The tab holds a new component `ToolsTryPanel` (`app-tools-try`). It draws the tool's form, resolves the chosen entities in the browser, calls `execute` and shows the output and its sources. It changes no API, contract, Shell or package file, and adds no dependency. Status stays `draft` until the orchestrator sets it.

## 1. Decisions this plan follows

Settled by the unit, the module, the README or merged decisions (source given):

- **D1** Try is a tab of the detail view. Source: unit line 15; `modules/tool-registry.md` ("Authors get a Tools page ... and a Try panel").
- **D2** The form's pickers work on the active project; the chosen entities are resolved in the browser through the Project store's GET resolution endpoint; an empty style field is filled with the project's style profile first; then `execute` is called; `output` and `sourcesUsed` are shown. Source: unit line 15; `modules/tool-registry.md` cross-cutting decisions ("the Try panel uses its GET resolution endpoint").
- **D3** Try never creates a pending change and writes no file. The only POST it makes is `execute`. Source: unit line 16; `modules/tool-registry.md` ("it writes no files, so agent/recipe writes still always become pending changes").
- **D4** `TOOL_*` errors are shown readably, model errors included. A `TOOL_MODEL_ERROR` (502) carries the provider's message. Source: unit line 17; `packages/contracts/src/tool-registry/errors.ts`; `plans/TRG-12.md` section 1 (provider failures wrap as `TOOL_MODEL_ERROR`).
- **D5** The Try tab is hidden on an invalid row. Source: unit line 18; `plans/DECISIONS.md`, entry "2026-11-16 — TRG-13 — the Navigator's decision on open point 2" (line 5049; the Try bullet at line 5051).
- **D6** The execute request is `{arguments, entities}`. The caller resolves the entities and fills an empty style field. Source: `packages/contracts/src/tool-registry/call.ts` (`toolCallRequestSchema`); `plans/TRG-12.md` section 1 (the caller fills a style field; the executor never resolves).
- **D7** On a phone there is no detail, so there is no Try. Source: `units/TRG-13-tools-page-list.md` line 17; `plans/TRG-13.md` C8.
- **D8** Test seams: UI tests use the Shell's fakes under Angular's Vitest runner; the running-app check goes through the e2e harness; no real model runs in CI. Source: `modules/tool-registry.md` ("Testing principles"); `units/README.md` ("Testing").
- **D9** `blocked_by`: TRG-12, TRG-13, PST-12. `unblocks`: TRG-17. Source: unit front matter; `units/README.md` ("Blocker notation").

Choices this plan makes (the simplest option; each changes no criterion and no settled decision):

- **C1 Names.** Component `ToolsTryPanel`, selector `app-tools-try`, file `tools-try.ts`. Tab text `Try`, `data-tab="try"`. Output `[data-output]`; sources `li[data-source]`; resolution errors `[data-resolution-errors]`. The form's own `Submit` button (`tool-form.ts` line 271) is used.
- **C2 Reads.** Nothing is read on row selection. When the Try tab mounts, the panel reads the active project (`GET ACTIVE_PROJECT_PATH`), then the tool detail (`GET toolPath(name)`). A second read of the tool is accepted; TRG-14 C2 follows the same rule (a read happens when its tab opens, never on selection). At submit the panel reads `project.yaml` (only when a style field is empty), then the resolution, then `execute`.
- **C3 Field kinds.** An entity field is a field whose `control` is `entity-picker` or `style-picker`. A style field is one whose `control` is `style-picker`. The lint rule pairs `x-scriba-type` with these controls (`apps/api/src/modules/tool-registry/lint.ts` lines 588 to 589; `emit.ts` lines 39 to 40).
- **C4 Style fill.** At submit, when a style field's argument is `undefined`, `null` or `''`, the panel reads `project.yaml` (`GET projectFilePath(active)` with params `{path: 'project.yaml'}`, as `entity-picker.ts` line 389 does), takes `styleProfileOf(content)`, and sets it in the arguments (not in the form). A failed read or no line leaves the field empty. The picker's own preselect (TRG-04 P15) covers most cases; this fill covers a cleared field.
- **C5 Resolution.** IDs are the non-empty string values, or the non-empty items of an array value, of the entity and style fields, in form-field order, each ID once. With no IDs, no resolution is read and `entities` is `[]`. Otherwise one `GET` with the query in the path: `…/entities/resolve?ids=<id>&ids=<id>` (see section 2: the Shell's `get` cannot repeat a key). If the answer has any `errors`, the panel lists them (`No entity has the id "<id>".` for `unknown`; `More than one file has the id "<id>": <paths>.` for `duplicate`) and posts no execute.
- **C6 Entity mapping.** Each `resolved` item `{id, type, path, content}` becomes the call entity `{ref: id, type, path, content}`, because the call entity names the ID `ref`. The panel keeps `path` by `id` for the sources list.
- **C7 Refused runs.** `TOOL_ARGS_INVALID` shows its issues beside the fields, through the form's `issues` input, as `tools-preview.ts` does. Any other `ApiError` shows its server message in a `role="alert"` line. A failure that is not an `ApiError` shows `The tool could not be run.`
- **C8 No active project.** The panel posts nothing and shows `No active project, so the tool cannot run.` A failed active read shows `The active project could not be read.`
- **C9 Tab state.** A signal `detailTab` of type `DetailTab = 'preview' | 'try'`, starting at `'preview'`. `select(row)` sets it back to `'preview'` as its last statement. The Try tab is offered while the selected row is valid (D5).
- **C10 Submit while running.** A submit while a run is in flight is ignored. Not tested.
- **C11 Reuse.** `ACTIVE_PROJECT_PATH`, `activeCopy`, `projectFilePath`, `fileReadCopy` and `styleProfileOf` come from `project-store-copy.ts`. `issuesOf` is exported from `tools-preview.ts`. No copy is duplicated.
- **C12 Disabled and invalid tools.** A valid but disabled tool keeps its Try tab; the executor's `TOOL_DISABLED` message is shown (D4).

## 2. Facts checked and facts assumed

CHECKED means the planner read it in the repository at main `eef0286`. ASSUMED means it is not checked here; the step named in brackets checks it.

CHECKED:

- [CHECKED] Unit `units/TRG-16-try-panel.md`: front matter lines 1 to 10 (`blocked_by: [TRG-12, TRG-13, "Project store phase:files (PST-12)"]`, `parallel_with: [TRG-14, TRG-15]`, `unblocks: [TRG-17]`). Decisions lines 15 to 18. Criteria lines 21 and 22 (two). No Why or Scope section.
- [CHECKED] Blockers are done: `plans/TRG-12.md`, `plans/TRG-13.md` and `plans/PST-12.md` have `status: done`. TRG-12 merged as `6594663` and `ac13917`; TRG-13 as `e373e38` and `b628dd2`.
- [CHECKED] Inverse rule (`units/README.md`): TRG-12, TRG-13 and PST-12 name TRG-16 in `unblocks`; `units/TRG-17-editor-ui-gate.md` names TRG-16 in `blocked_by`. TRG-14 and TRG-15 name TRG-16 in `parallel_with` (symmetric). TRG-16's blockers do not depend on TRG-14 or TRG-15, and theirs do not depend on TRG-16.
- [CHECKED] Module `modules/tool-registry.md`: Ordering (TRG-13, then TRG-14 and TRG-16 in parallel), the graph (TRG-16 under TRG-13), cross-cutting decisions (GET resolution endpoint; execute writes no files), testing principles.
- [CHECKED] Call contract `packages/contracts/src/tool-registry/call.ts`: `resolvedEntitySchema` (line 12: `ref`, `type`, `path`, `content`); `toolCallRequestSchema` (line 47: `arguments`, `entities`); `toolCallResultSchema` (line 71: `output {kind, content}`, `sourcesUsed` of entity refs). The request has no project ID.
- [CHECKED] Resolution contract `packages/contracts/src/project-store/entities.ts`: `entityResolveQuerySchema` (line 23: `ids` is one ID or an array); `entityResolutionSchema` (line 31: `resolved` items `{id, type, path, content}`; `errors` items `{id, code: unknown | duplicate, paths?}`). Route `PROJECT_ENTITY_RESOLVE_ROUTE` in `packages/contracts/src/project-store/routes.ts` line 29. Controller `apps/api/src/modules/project-store/entities.controller.ts` line 28. Service `entities.service.ts` lines 35 to 64 returns the errors in the answer, not as a refusal.
- [CHECKED] Execute: route `TOOL_EXECUTE_ROUTE` in `packages/contracts/src/tool-registry/routes.ts` line 22; controller `apps/api/src/modules/tool-registry/tools.controller.ts` lines 157 to 168.
- [CHECKED] Errors `packages/contracts/src/tool-registry/errors.ts`: codes at lines 6 to 17; `TOOL_MODEL_ERROR` 502; `TOOL_ARGS_INVALID` 422 with `issues` (`toolArgsInvalidDetailsSchema`). Executor behaviour in `plans/TRG-12.md` (C4: provider errors keep the message; C10: first entry per ref kept; the four error tests of its criterion 3).
- [CHECKED] Shell client `apps/web/src/app/shell/api-client.ts`: `ApiClient.get(path, schema, params?: Record<string, string>)` (lines 24 to 29); `HttpApiClient.get` (lines 61 to 73). A repeated key cannot be sent through `params`, so the query goes in the path string. No Shell file changes.
- [CHECKED] Fakes `apps/web/src/app/shell/testing/test-doubles.ts`: `FakeApiClient` (lines 43 to 110) answers by method and full path string, and records `params` apart from the path; it throws for any request with no canned answer. `ShellTestDoubles` (line 165); `createShellTestDoubles` (line 187). `apps/web/src/app/shell/testing/match-media.ts` exports `stubMatchMedia` and `restoreMatchMedia`.
- [CHECKED] Form `apps/web/src/app/features/tool-registry/tool-form.ts`: inputs `form`, `ports`, `layout`, `issues` (lines 483 to 488); two-way `value` model (line 494) and output `submitted` (line 496); `<form novalidate>` (line 269); `Submit` button (line 271); submit emits `value()` (lines 659 to 661). The picker branch (line 86) covers `entity-picker` and `style-picker`.
- [CHECKED] Controls: `packages/contracts/src/tool-registry/constants.ts` `CONTROL_TYPES` (lines 32 to 41); `views.ts` `formFieldSchema` (lines 53 to 70: `key`, `control`, `list`, `entityKinds`, `elementType`).
- [CHECKED] `tools-list.ts` (284 lines): detail section lines 149 to 170; tab strip lines 151 to 153 (one literal Preview button with `aria-selected="true"`, no state); panel lines 155 to 167 (`@for` over `selectedList()`, `@if (row.valid)` draws `<app-tools-preview [tool]="row.name" />`, else the status); `selectedKey` line 189; `selectedList` lines 214 to 221; `select(row)` lines 250 to 253; import of `ToolsPreviewPage` line 25.
- [CHECKED] `tools-preview.ts`: `issuesOf` at line 56 (not exported); `refused()` lines 325 to 337 maps `TOOL_ARGS_INVALID` to the issues.
- [CHECKED] `tool-copy.ts`: imports from the contract are types only (lines 1 to 8); `TOOL_PATH_TEMPLATE` line 18; `toolPath` lines 52 to 57; `toolDetailCopy` lines 91 to 108.
- [CHECKED] `project-store-copy.ts`: `ACTIVE_PROJECT_PATH` line 13; `projectFilePath` lines 32 to 37; `activeCopy` lines 86 to 94; `fileReadCopy` lines 114 to 140; `styleProfileOf` lines 153 to 161.
- [CHECKED] `entity-picker.ts`: line 389 reads `projectFilePath(active)` with `{ path: 'project.yaml' }`; line 402 calls `styleProfileOf`; a failed read gives no preselect.
- [CHECKED] Tests to keep: `tools-list.spec.ts` L5 (line 403) asserts the selected tab is `Preview` and one `GET` of the detail; it uses `stubMatchMedia` (line 215) and `configureTestingModule({providers: [...doubles.providers]})` (line 217); its constants `ACTIVE_PATH`, `ENTITIES_PATH` and `FILE_PATH` are at lines 26 to 28. `tools-preview.spec.ts` line 176 uses `setInput('tool', 'cold_open')`; line 253 tests refusals beside their fields. `tool-copy.spec.ts` (route-path parity test at line 122; S1 tests from line 159). `project-store-copy.spec.ts` (route-path parity test at line 83).
- [CHECKED] E2e `e2e/specs/tools-preview.e2e.ts` (TRG-05): `setUp` copies the cold-open fixture to `.scriba/packs/user/tools/`, writes project `tools-spike` with `ada` and `bob` (person) and `paris` (place), and activates it through `/projects/<id>/switch`; the row selector `li[data-tool="cold_open"][data-origin="user"] [data-open]`; the picker selector `section[data-key="person"] select`; check (a) counts one `GET /api/tool-registry/tools/cold_open` while the page lives.
- [CHECKED] E2e providers: `e2e/specs/journey.e2e.ts` lines 209 to 236 create a provider with `POST /api/providers` (origin header; `kind: 'openai-compatible'`; `baseURL` `${SCRIBA_E2E_MOCK_URL}/scenario/<name>/v1`; `model`; `temperature`, `contextSize`, `maxTokens`, `timeout`, `retries`) and set it as the app default with `POST /api/providers/app-default`. `e2e/specs/providers-phone.e2e.ts` lines 36 to 122 reads the prior default and restores it with `POST`. `e2e/harness/global-setup.ts` line 33 sets `SCRIBA_E2E_MOCK_URL`.
- [CHECKED] E2e runner `e2e/playwright.config.ts`: `workers: 1`.
- [CHECKED] Mock scenario `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json` (one step: text `The cold open opens on the bench at dawn.`), used by `apps/api/test/tool-registry-executor.test.ts`.
- [CHECKED] Fixture `apps/api/test/fixtures/packs/core/tools/cold_open.yaml`: `required: [coreIdea, person]`; `styleProfile` optional, `x-scriba-type: style`; `entityIds` a list of person entities; `person` is an entity with kinds `[person]`.
- [CHECKED] Pending folder: `<library>/<project>/.scriba/pending` (`apps/api/test/project-store-pending-apply.test.ts` line 101).
- [CHECKED] Model choice: project override, then app default, then the provider's model (`plans/MPR-05.md` line 14). The execute request carries no project; the executor uses the active project.
- [CHECKED] `plans/TRG-14.md` (draft): all sections read; sections 1, 3, 4 and 6 in full. Its tab strip claim holds (tools-list.ts lines 150 to 151). It changes `tools-list.ts`, `tool-copy.ts`, `tool-copy.spec.ts`, `tool-registry.routes.ts`, `apps/web/package.json`, `package-lock.json`; it adds `tool-editor.ts`, `tool-template.ts`, two specs, and `e2e/specs/tools-editor.e2e.ts`. It does not list `project-store-copy.ts` or `tools-preview.ts`. Its step 6 gives no selected-tab state.

ASSUMED:

- [ASSUMED] A1. The e2e harness runs in the implementation environment (Playwright, the built API and web, a browser). The planner did not run anything. [step 12]
- [ASSUMED] A2. The `tool-execute-draft` reply serves a non-streamed `execute` in the running app, as the API test does. [step 12]
- [ASSUMED] A3. The e2e project has no `model` key in its `project.yaml`, so the app default applies. [step 9]
- [ASSUMED] A4. Each field is a `section[data-key]` (checked in the TRG-05 spec), and `coreIdea` is a `textarea` (checked in `cold_open.yaml` line 12). The selector of the control inside the section is not checked. [step 9]
- [ASSUMED] A5. ToolForm draws each refusal's issue inside the section of its field. The TRG-05 test (`tools-preview.spec.ts` line 253) shows this for the preview. [Y5]
- [ASSUMED] A6. Angular sends a URL that already carries a query unchanged when `params` is undefined. [step 12]

## 3. Files to change

Only the paths below change. No file under `apps/api/**`, `packages/**`, `apps/web/src/app/shell/**`, `apps/web/package.json`, `package-lock.json`, `tool-registry.routes.ts`, `units/**`, `modules/**`, `plans/DECISIONS.md`, `plans/AGL-11.md` or `units/SAU-12-providers-step.md` changes.

New:

| Path | Purpose |
|---|---|
| `apps/web/src/app/features/tool-registry/tools-try.ts` | `ToolsTryPanel`, selector `app-tools-try`, standalone, imports `ToolForm`. Input `tool`. Reads the active project, then the tool detail; draws the form; runs the chain of C4 to C8 on submit (C1, C2, C4 to C8, C10) |
| `apps/web/src/app/features/tool-registry/tools-try.spec.ts` | Tests Y1 to Y8 (section 5) |
| `e2e/specs/tools-try.e2e.ts` | Test E1 (criterion 2) |

Changed:

| Path | Change |
|---|---|
| `apps/web/src/app/features/tool-registry/tools-list.ts` | Adds `type DetailTab`, `detailTab` and `tryOffered`; the Preview button is bound to the state; a Try button; the panel becomes a `@switch`; `select()` resets the tab; imports `ToolsTryPanel` (C9). Details in section 3, shared files |
| `apps/web/src/app/features/tool-registry/tool-copy.ts` | Adds `TOOL_EXECUTE_PATH_TEMPLATE`, `toolExecutePath(name)`, `toolCallResultCopy`, and the type `ToolCallResult` in the type import (step 4) |
| `apps/web/src/app/features/tool-registry/tool-copy.spec.ts` | Adds test S3a. Existing tests keep their assertions |
| `apps/web/src/app/features/tool-registry/project-store-copy.ts` | Adds `PROJECT_ENTITY_RESOLVE_TEMPLATE`, `entityResolvePath(projectId, ids)`, `entityResolutionCopy`, and the type `EntityResolution` (step 3) |
| `apps/web/src/app/features/tool-registry/project-store-copy.spec.ts` | Adds test R1. Existing tests keep their assertions |
| `apps/web/src/app/features/tool-registry/tools-preview.ts` | `issuesOf` (line 56) gains `export`. Nothing else |

### Shared files with plans/TRG-14.md

TRG-14 (draft) changes what is listed in its section 3. Each shared file below is checked against it.

**`tools-list.ts`.** TRG-14 adds to the strip `Source` (`[data-tab="source"]`) and `Compare` (`[data-tab="compare"]`); the action bar; the New and Duplicate name form; the draft selection; the selection rules C9 (a selection moves after a save) and C13 (a confirm before a selection changes, where a refusal keeps the selection); and the phone rule. TRG-16 adds the `detailTab` state (`DetailTab` gains `'try'`), binds the Preview button to the state, adds the Try button (`data-tab="try"`) last in the strip, changes the panel to a `@switch` with `@case ('preview')` (the existing `app-tools-preview`) and `@case ('try')`, adds `detailTab.set('preview')` as the last statement of `select()`, and adds the import.

Why both are correct in either order: the state is one signal of one union type, and each plan adds its own members. The plan merged first creates the signal: TRG-16 as `'preview' | 'try'`, TRG-14 as `'preview' | 'source' | 'compare'`; the second adds its members to the union, its `@case`s and its buttons. The reset is the last statement of `select()`, so TRG-14's C13 early return (a refused confirm keeps the selection) skips it. TRG-14's C9 moves, which set `selectedKey` directly, must also set `detailTab` to `'preview'`; TRG-14's reviser must make this change. A draft selection is not a row, so Try is not offered on it. Textual conflicts are expected in the import block and the strip; keep both sides.

**`tool-copy.ts`.** TRG-14 adds its path constants and functions (builtin, user, save, delete, lint), `toolDeleteCopy`, `toolSourceCopy`, `lintResponseCopy`, `lintDetailsCopy`, `TOOL_NAME_PATTERN` and the types `LintDiagnostic` and `ToolViews`. TRG-16 adds the execute path, `toolCallResultCopy` and the type `ToolCallResult`. Both extend the type import at the top and append exports; neither changes an existing copy. Either order keeps both.

**`tool-copy.spec.ts`.** TRG-14 adds S2a to S2c; TRG-16 adds S3a. Both append, and neither edits an existing test.

**`tools-preview.ts`.** TRG-14 changes none of it (its section 3 says so). TRG-16 adds one keyword. No overlap.

**`tools-list.spec.ts`.** Neither plan changes it. TRG-14 requires L1 to L8 unchanged. TRG-16's list-level tests go to `tools-try.spec.ts`. Either order keeps L5: the Try component reads only when its tab mounts, and the Try button makes no request.

**E2e.** Each plan has its own spec file and its own project (`tools-try` here). The runner has one worker, so the specs do not overlap. Each sets its own active project and app default, and TRG-16 restores the prior default. Neither test depends on the absence of other user tools: rows are chosen by `data-tool` and `data-origin`.

**`project-store-copy.ts`, `tool-registry.routes.ts`, `apps/web/package.json`, `package-lock.json`.** TRG-14 changes the last three and not `project-store-copy.ts` (its section 3 does not list it); TRG-16 changes `project-store-copy.ts` and none of the others. No overlap.

## 4. Procedure

Run in a worktree of `main`: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/TRG-16 -b unit/TRG-16 main`. Record `node -v` and `npm -v` with each result. Do not push.

0. **Preconditions.** `grep -m1 '^status' plans/TRG-12.md plans/TRG-13.md plans/PST-12.md` prints `status: done` for each. `git branch --list unit/TRG-16` prints nothing. Expected: both hold.
1. **Install.** `npm ci` in the worktree. Expected: exit 0.
2. **Dependencies.** None. `git diff --quiet -- apps/web/package.json package-lock.json` exits 0 after the edits.
3. **Project-store copies** (`project-store-copy.ts`). Add `PROJECT_ENTITY_RESOLVE_TEMPLATE = '/api/project-store/projects/:projectId/entities/resolve'`. Add `entityResolvePath(projectId, ids)`: the template with `:projectId` replaced by the encoded ID, then `?` and `ids=<encoded id>` for each ID joined by `&`, cast to `ApiPath`. Add `entityResolutionCopy: ResponseSchema<EntityResolution>`: `resolved` is an array of objects with `id` matching `ENTITY_ID_PATTERN`, `type` a non-empty string, `path` and `content` strings; `errors` is an array of objects with `id` matching the pattern, `code` `unknown` or `duplicate`, and `paths` an optional array of strings. Import the type `EntityResolution` from `@bbartolome/scriba-contracts/project-store`. Expected: the file type-checks at steps 10 and 11.
4. **Tool copies** (`tool-copy.ts`). Add `TOOL_EXECUTE_PATH_TEMPLATE = '/api/tool-registry/tools/:name/execute'` and `toolExecutePath(name)`, as `toolPath` does. Add `toolCallResultCopy: ResponseSchema<ToolCallResult>`: `output` is a record with a string `kind` and a string `content`; `sourcesUsed` is an array of strings. Import the type `ToolCallResult`. Expected: type-checks at steps 10 and 11.
5. **Export** (`tools-preview.ts`). Add `export` to `function issuesOf` (line 56). Expected: `git diff` of that file shows one changed line.
6. **Panel** (`tools-try.ts`, new). `ToolsTryPanel`, selector `app-tools-try`, standalone, imports `ToolForm` from `./tool-form`. Input `tool` (required string).
   - On init: `GET ACTIVE_PROJECT_PATH` (`activeCopy`), then `GET toolPath(tool)` (`toolDetailCopy`). Keep `active` (ID or null) and the form (`views.form`). When `views` is null, or a read fails, show the failure text in a `role="alert"` line (`The tool could not be read.` or `The tool has no valid views to draw.`).
   - Template: `app-tool-form` with `[form]`, `layout="form"`, `[issues]`, `[(value)]` on a `formValue` signal (initially `{}`) and `(submitted)="run($event)"`; the active-project note; `[data-output]` (a `pre` with `output.kind` and `output.content`); `[data-sources]` with one `li[data-source]` per `sourcesUsed` ID, showing its path (from the resolution) or the ID; `[data-resolution-errors]`.
   - `run(args)`, as one chain with `takeUntilDestroyed`: (a) if `active` is null, show the C8 note and stop; if the active read failed, show its C8 text and stop. (b) Clear output, issues, errors and failure. Ignore the call while a run is in flight (C10). (c) If a style field's argument is `undefined`, `null` or `''`, read `project.yaml` (C4) and set the argument in a copy. (d) Collect the IDs (C5). (e) With no IDs, `entities` is `[]`. Otherwise `GET entityResolvePath(active, ids)` with `entityResolutionCopy`: with `errors`, show them and stop; else map each `resolved` item to `{ref, type, path, content}` (C6) and keep `path` by ID. A failed resolution read shows `The entities could not be resolved.` and stops. (f) `POST toolExecutePath(tool)` with `{arguments, entities}` and `toolCallResultCopy`. On success set the output. On error: `TOOL_ARGS_INVALID` sets `issues` from `issuesOf(error.details)`; another `ApiError` shows `error.message`; any other error shows `The tool could not be run.` (C7).
   - Nothing here writes a file or a pending change (D3).
   Expected: the file type-checks at steps 10 and 11.
7. **Tab strip** (`tools-list.ts`).
   - Import `ToolsTryPanel` from `./tools-try`. Add `type DetailTab = 'preview' | 'try';`, `protected readonly detailTab = signal<DetailTab>('preview');` (beside `selectedKey`), and `protected readonly tryOffered = computed(() => this.selectedList()[0]?.valid === true);`.
   - The Preview button: replace the literal `aria-selected="true"` with `[attr.aria-selected]="detailTab() === 'preview'"` and add `(click)="detailTab.set('preview')"`.
   - After it: `@if (tryOffered()) { <button type="button" role="tab" data-tab="try" [attr.aria-selected]="detailTab() === 'try'" (click)="detailTab.set('try')">Try</button> }`.
   - The panel: inside `@if (row.valid)`, `@switch (detailTab())` with `@case ('preview')` holding the existing `<app-tools-preview [tool]="row.name" />` and `@case ('try')` holding `<app-tools-try [tool]="row.name" />`. The status branch is unchanged.
   - `select(row)`: after `this.selectedKey.set(row.key);`, add `this.detailTab.set('preview');` as the last statement.
   Expected: `tools-list.spec.ts` L1 to L8 pass unchanged.
8. **Unit tests.** Add R1 to `project-store-copy.spec.ts` and S3a to `tool-copy.spec.ts`, as parity tests against the contract (`PROJECT_ENTITY_RESOLVE_ROUTE`, `TOOL_EXECUTE_ROUTE`, `entityResolutionSchema`, `toolCallResultSchema`; value imports from the contract are allowed in specs, as S1b does). Write `tools-try.spec.ts` with tests Y1 to Y8 (section 5), using `createShellTestDoubles()` and `TestBed.configureTestingModule({providers: [...doubles.providers]})`. The fixture form has no `default` values, and each test asserts only the keys it sets. Every request the panel or its pickers make must be answered (ACTIVE, the entity list, `project.yaml`, the detail, the resolution, execute), because `FakeApiClient` throws for an unanswered request. Panel tests use `setInput('tool', 'cold_open')`. Tab tests use `stubMatchMedia(1280, 800)` and `restoreMatchMedia()` after each test. Expected: `npm test -w @bbartolome/scriba-web` exits 0.
9. **E2e** (`e2e/specs/tools-try.e2e.ts`, E1). Its own `setUp`, as `tools-preview.e2e.ts` does (not imported): sign in with the setup URL from `.scriba/setup-url`; copy the cold-open fixture into `.scriba/packs/user/tools/`; write project `tools-try` with `project.yaml` (`schemaVersion: 1`, a title, `genrePack: nonfiction`) and `entities/ada.md` and `entities/bob.md` (`type: person`); activate it through `/projects/tools-try/switch`. Read the prior app default (`GET /api/providers/app-default`), create a provider (the body of `journey.e2e.ts` lines 213 to 223, with `baseURL` `${SCRIBA_E2E_MOCK_URL}/scenario/tool-execute-draft/v1`, `model: 'mock-model'`, with the `origin` header), set it as the app default, and restore the prior default in a `finally`. Before the run, list `<library>/tools-try/.scriba/pending` (ENOENT counts as an empty list). Then open `/tools`, open the `cold_open` user row, click the `Try` tab, fill `section[data-key="coreIdea"]` with `Engines reward patience`, select `ada` in `section[data-key="person"] select`, click `Submit`. Expect `[data-output]` to contain `The cold open opens on the bench at dawn.` and `li[data-source]` to read `entities/ada.md`. Expect that folder to hold no file after the run. Expected: E1 passes.
10. **Unit run.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0; TRG-13 L1 to L8 and the TRG-05 preview specs pass unchanged.
11. **Build.** `npm run build -w @bbartolome/scriba-web`. Expected: exit 0.
12. **E2e run.** `npm run e2e -w @bbartolome/scriba-e2e -- tools-try.e2e.ts`, then `-- tools-preview.e2e.ts`. Expected: E1 passes; the TRG-05 spec passes, including its single read of the tool (check (a)). If E1 cannot run here, record it as blocked; criterion 2 is then not passed (open point 1).
13. **Gates.** `npx prettier --write` on the changed `.ts` files. `git status --short` lists only the section 3 paths. From the root: `npm run build`, `npm test` and `npm run lint`. Expected: each exits 0; `npm run lint` ends with `All matched files use Prettier code style!`.
14. **Commit.** `git add` the section 3 paths by name, then commit on `unit/TRG-16` as `feat(TRG-16): Try panel in the tool detail`. Do not squash. Do not push.
15. **Record.** Node and npm versions, each gate's output, and the criteria marked passed only where their tests pass.

## 5. Tests

Unit tests run with `npm test -w @bbartolome/scriba-web`. Each criterion of the unit (lines 21 and 22) has at least one test. The extra tests cover this plan's decisions (C4 to C9).

| Criterion or decision | Test | File | Setup | Pass condition |
|---|---|---|---|---|
| 1, resolution carries the IDs; execute gets resolved entities (21) | Y1 `the resolution request carries each chosen ID once, in form order, and execute gets the resolved entities` | `tools-try.spec.ts` | Active `p1`; the detail with the form fixture (`coreIdea`, `entityIds` list of entity, `styleProfile` style, `person` entity, all defaults null). Resolution canned for `…/entities/resolve?ids=ada&ids=bob&ids=house-style` with `ada` (person, `entities/ada.md`, `Ada.`), `bob` (person) and `house-style` (style-profile, `styles/house-style.md`). Set `coreIdea`, `entityIds: ['ada','bob']`, `styleProfile: 'house-style'`, `person: 'ada'`; submit. Execute canned | Exactly one `GET` of the resolution path with that query. The only `POST` is to `/api/tool-registry/tools/cold_open/execute`, whose body has `arguments` with the four keys set (`coreIdea`, `entityIds`, `styleProfile`, `person`) and `entities` `[ada, bob, house-style]`, each as `{ref, type, path, content}` |
| 1, output and sources render (21) | Y2 `the output and the sources it cites render, each with its project path` | `tools-try.spec.ts` | As Y1, execute answering `{output: {kind: 'draft', content: 'The cold open opens on the bench at dawn.'}, sourcesUsed: ['ada','bob']}` | `[data-output]` contains the content. The `li[data-source]` texts are `entities/ada.md` then `entities/bob.md` |
| 2, running app, output and no pending change (22) | E1 `Try runs the tool through the mock model, shows the draft and its sources, and leaves no file under the pending folder` | `e2e/specs/tools-try.e2e.ts` | Step 9 | Output and source as in step 9; the pending folder has no file after the run |
| extra, C4 style fill (unit line 15) | Y3 `an empty style field takes the project's style profile before the resolution` | `tools-try.spec.ts` | As Y1 but `styleProfile` unset; `project.yaml` canned on the file route with `styleProfile: house-style` | The resolution path is `…?ids=ada&ids=bob&ids=house-style`; the execute body's `arguments.styleProfile` is `house-style` |
| extra, C5 errors (choice) | Y4 `a resolution that names an unknown or a duplicate ID shows it and posts no execute` | `tools-try.spec.ts` | Resolution answers `errors: [{id: 'ada', code: 'duplicate', paths: ['entities/ada.md', 'old/ada.md']}]` | `[data-resolution-errors]` names `ada` and both paths. No `POST` |
| extra, D4 and C7 (unit line 17) | Y5 `TOOL_ARGS_INVALID shows each issue beside its field, and TOOL_MODEL_ERROR shows the provider's message` | `tools-try.spec.ts` | Two runs. First: execute fails with 422 `TOOL_ARGS_INVALID`, details `{issues: [{path: '/coreIdea', message: 'must have required property'}]}`. Second: 502 `TOOL_MODEL_ERROR`, message `The model provider does not know the model.` | The issue text is inside `section[data-key="coreIdea"]`. The `role="alert"` line reads the provider's message |
| extra, C8 (choice) | Y6 `with no active project the panel posts nothing and says so` | `tools-try.spec.ts` | Active answers `{active: null}` | Submit posts no `POST` and reads no resolution. The note reads `No active project, so the tool cannot run.` |
| D5, hidden on an invalid row (unit line 18) | Y7a `the Try tab is absent on an invalid row` | `tools-try.spec.ts` | `ToolsListPage` with a row that is invalid, selected | No `[data-tab="try"]` in the detail |
| C2, C9: nothing read until opened (choice) | Y7b `on a valid row Try is absent until opened; opening it mounts the panel and reads the tool once more` | `tools-try.spec.ts` | `ToolsListPage` with a valid `cold_open` row; the list, detail, active, entity list and project file canned | After the row is selected, `GET` of the detail is 1 and `app-tools-try` is absent. After the Try tab is clicked, `app-tools-try` is present and the detail `GET` is 2 |
| C9 (choice) | Y8 `selecting another row returns the detail to Preview` | `tools-try.spec.ts` | Two valid rows (core `cold_open`, user `my_tool`), each detail canned; Try opened on the first | After clicking the second row's name, `app-tools-preview` is present and the selected tab reads `Preview` |
| S3a, copies match the contract (step 4) | S3a `toolExecutePath and toolCallResultCopy agree with the contract` | `tool-copy.spec.ts` | Value imports of `TOOL_EXECUTE_ROUTE` and `toolCallResultSchema` | `toolExecutePath('cold_open')` equals the route with `:name` replaced; the copy accepts a value the schema accepts and refuses one with no `sourcesUsed` |
| R1, copies match the contract (step 3) | R1 `entityResolvePath and entityResolutionCopy agree with the contract` | `project-store-copy.spec.ts` | Value imports of `PROJECT_ENTITY_RESOLVE_ROUTE` and `entityResolutionSchema` | `entityResolvePath('p1', ['a','b'])` ends with `…/projects/p1/entities/resolve?ids=a&ids=b`; `entityResolvePath('a b/c', ['x'])` encodes the project; the copy accepts a value with an `errors` entry that the schema accepts and refuses one with code `other` |

Totals: 2 criteria; 12 tests: 11 web unit tests (Y1 to Y8 with Y7a and Y7b, S3a, R1) and 1 e2e test (E1).

Existing tests that must pass unchanged: `tools-list.spec.ts` L1 to L8; `tool-copy.spec.ts` S1 (and S2a to S2c, if TRG-14 has merged); `tools-preview.spec.ts`; `e2e/specs/tools-preview.e2e.ts` (TRG-05 C1 and C2, and check (a)).

## 6. Agreement with downstream units

- **TRG-17, editor-UI gate** (`blocked_by` names TRG-16, unit line 7). Its criterion needs TRG-13 to TRG-16 to pass on `main`, so Y1 to Y8 and E1 must be in the suite. Its demo step 4 ("In Try, pick a person entity ... and a moment, run. Show the draft and its sources used") needs the Try tab, the entity picker (the `person` field's picker lists only person entities through its `entityKinds`), Submit, the output and the sources. Provided by this plan (C1, C5, step 6, step 7).
- **TRG-17's second criterion** (each of the four nonfiction workhorses produces a cited draft) is not TRG-16's. TRG-16 gives the UI path to run them; the executor's behaviour is TRG-12's and the packs are Genre packs'. Not provided here, and not needed here.
- **TRG-14** (parallel). Shared files and their order-independence: section 3.
- **TRG-15** (parallel; `blocked_by` TRG-14). It needs nothing from TRG-16. Its unit names no file, and its plan is not drafted, so any shared `tools-list.ts` edit is not checked here.
- **AGL-09 and GRR-04** call the executor directly and not through this tab (`plans/TRG-12.md` section 5). They are unaffected.

## 7. Open points

1. **Criterion 2 runs against the mock model.** The unit says "In the running app, Try produces output". E1 uses the mock OpenAI scenario `tool-execute-draft`, as TRG-12's tests do. The module keeps real models out of CI (`units/README.md`), and this environment has no checked model server. A real-model run is not in this plan and was not done. Reviser or Navigator: confirm that the mock run meets criterion 2, or name a real-model check and where it runs.
2. **Tab-state rule shared with TRG-14.** TRG-14's draft (section 4, step 6) gives a strip with Source and Compare but no selected-tab state, no `aria-selected` binding and no reset rule. Section 3 gives the rule this plan uses (`DetailTab` and `detailTab`, reset last in `select()`, Try last in the strip, reset on C9 moves). TRG-14's reviser must adopt it; otherwise the two plans conflict. Not a criterion change. Orchestrator: confirm.

Statements found wrong or inconsistent with the repository (not fixed here):

- `plans/TRG-14.md` section 4, step 6: it adds switching between Source, Compare and Preview without a selected-tab state (open point 2).
- `plans/PST-08.md` line 154 hands TRG-16 "The Shell's client must encode repeated `ids` keys". `ApiClient.get` takes `params?: Record<string, string>` (`apps/web/src/app/shell/api-client.ts` lines 24 to 29), so no repeated key can be sent through it. This plan puts the query in the path and changes no Shell file.
- The unit does not map the resolution's `id` to the call entity's `ref` (`entityResolutionSchema` against `resolvedEntitySchema`, `packages/contracts/src/tool-registry/call.ts` line 12). C6 gives the mapping.
