---
id: TRG-15
status: draft
---
# TRG-15 plan — Live previews beside the tool editor, and render of an inline source

Revision 1, draft, written at main `b377601` by the planner. Status stays `draft` until the orchestrator sets it.

Summary: the Source tab of a tool's detail gets a live panel beside the YAML editor. The panel has four tabs: form, node, function schema and rendered prompt. It is fed by the editor's `linted` output (the views of each lint or save answer). The rendered prompt uses the render endpoint, which gains one optional field: an inline `source`, so an unsaved text renders. Nothing is saved, and no file is written.

## 1. Facts checked and facts assumed

### 1a. Checked

- CHECKED `units/TRG-15-live-previews.md`: `blocked_by: [TRG-03, TRG-12, TRG-14]`, `parallel_with: [TRG-16]`, `unblocks: [TRG-17]`. Decisions line 18. Criteria lines 21 and 22 (two criteria). The file has no change notes. Its only history is `2fed3f4` (the consolidation of the units).
- CHECKED blockers are done: `plans/TRG-03.md`, `plans/TRG-12.md` and `plans/TRG-14.md` read `status: done`. TRG-14 is on main at `df6d474`.
- CHECKED TRG-16 is no longer parallel. `plans/TRG-16.md` exists, with `status: done`, and its feature commit `40fc08c` is an ancestor of main. The brief said that file does not exist yet. The brief is wrong on this point, so this plan builds on the merged TRG-16 code (section 6).
- CHECKED main moved from `0db802c` to `b377601`. Only `plans/QUEUE.md` changed in that range (`git diff --stat 0db802c main -- units modules plans/DECISIONS.md` and the tool-registry source paths).
- CHECKED no other plan is `draft` or `planned`: `grep -l -E "^status: *(draft|planned)" plans/*.md` prints nothing.
- CHECKED `plans/DECISIONS.md` has no TRG-15 entry (`grep -n TRG-15`). Entries that name TRG-15: the 2026-11-16 TRG-13 apply step (around lines 5051 to 5059, "TRG-15 and TRG-17: not affected"); the 2026-11-14 Navigator decisions on TRG-01 open points 1 and 2 (lines 3403 and 3409): the toggle control, and an unreadable file with `spec` and `views` null.
- CHECKED `modules/tool-registry.md` (read in full). Its graph line 26 reads "TRG-15 ... (needs 03, 12)". The unit's `blocked_by` also names TRG-14. The plan follows the unit, because `units/README.md` makes `blocked_by` the source of truth.
- CHECKED `apps/web/src/app/features/tool-registry/tools-list.ts`. The detail has tabs `preview`, `source`, `compare` and `try` (the `DetailTab` type). The draft Source branch is at lines 297 to 304 (`@if (draft(); as current)`). The row Source branch is at lines 319 to 330 (`@if (tab() === 'source')`). The editor is bound without `(linted)`. The Preview tab shows `app-tools-preview` at line 308. The component has no `styles` block. `openRow` (line 646) and `openDraft` (line 657) reset the selection and the tab.
- CHECKED `tool-editor.ts`: the `linted` output is `{lint, views}` (lines 116 to 119). It is emitted from `lintSource` (line 204), `save` (line 224) and `saveFailed` (line 239). `lintSource` emits nothing when the text equals the loaded text (lines 186 to 193).
- CHECKED `tools-preview.ts`: exports `issuesOf`. Its node layout uses a handle template `<i class="handle" [attr.data-port] [attr.data-side]>`.
- CHECKED `tools-try.ts`: the helpers `isEntityField` (line 49), `isStyleField` (line 53), `idsOf` (line 58) and `isEmpty` (line 73) are module-private. `ENTITY_CONTROLS` is at line 41. The resolve chain is in the methods `run`, `fillStyle`, `resolve` and `execute`.
- CHECKED `tool-copy.ts` imports only types from the contract (its header comment says so). `TOOL_EXECUTE_PATH_TEMPLATE` is at line 32, `toolExecutePath` at 67 and `toolCallResultCopy` at 126. `tool-copy.spec.ts` has tests S1a (line 180), S3a (267) and S2a (285).
- CHECKED `project-store-copy.ts`: `ACTIVE_PROJECT_PATH` (14), `projectFilePath` (37), `entityResolvePath` (48), `entityResolutionCopy` (199), `styleProfileOf` (226).
- CHECKED `entity-picker.ts`: its offered list is a `computed` that reads `field().entityKinds` through `accepts` (around lines 250 to 258 and 365 to 370). A new descriptor re-filters the list. This is the TRG-04 rule P3 (`plans/TRG-04.md` line 46).
- CHECKED `tool-form.ts`: inputs `form` (required), `ports`, `layout`, `issues`, `handle`, `value` (model) and the output `submitted` (lines 483 to 496).
- CHECKED `packages/contracts/src/tool-registry/call.ts`: `toolCallRequestSchema` is at line 47. `toolRenderRequestSchema` is the same object (line 54: `= toolCallRequestSchema`), so render and execute share one shape today.
- CHECKED API `tools.controller.ts`: the render route (lines 144 to 152) passes the body to `executor.render(name, body)`. `executor.service.ts`: `render` at line 66; `prepare` at line 106. Step 1 is `catalog.entry(name)` and `enabledOf` (lines 108 and 109). Step 2 is `catalog.validate(name, ...)` (line 118). Step 3 is the entity checks (lines 126 to 148). Step 4 parses and renders the template.
- CHECKED `executor.service.ts` `render` makes no model call; only `execute` calls the model.
- CHECKED `catalog.service.ts`: `lint(source, name)` at line 250 calls `lintToolSource` with `entityKinds: this.kinds` and returns `{lint, views}`. `entry` is at line 303, `enabledOf` at 315, `validate` at 338 and `loaded` at 385. `loaded` throws `TOOL_INVALID` (422) for an invalid entry.
- CHECKED `validate.ts`: `createAjv` (line 36), `compileTool(spec, ajv)` (line 56) and `validateArguments(entry: {spec, compiled}, request)` (line 84).
- CHECKED `lint.ts`: `lintToolSource` is at line 1042. Its `views` are null when any error exists (lines 1101 to 1111). `packs.ts` `loadFile` (line 193) builds a `LoadedTool` as `{spec, source, origin, views, compiled}`.
- CHECKED `packages/contracts/src/tool-registry/errors.ts`: `TOOL_INVALID` maps to 422 (line 44).
- CHECKED `template.ts`: `renderEntity` writes `${type} ${ref} (${path})` and then the content (around line 596). The fixture `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` has the prompt at lines 50 to 54, with `{{#each entityIds}}{{entity this}}{{/each}}`.
- CHECKED the `cold_open` fixture: `coreIdea` port is at line 11. `entityIds` port is at line 19 and its kinds `[person]` at line 20.
- CHECKED `apps/api/test/tool-registry-executor.test.ts`: helpers `openApp`, `post`, `json` and `entity`; test C1 at line 125; fixture packs `EXECUTOR_PACKS` with `render_probe.yaml`.
- CHECKED `e2e/playwright.config.ts`: `testMatch` `**/*.e2e.ts`, `workers: 1`, `baseURL` `http://127.0.0.1:8080`. `e2e/specs/tools-preview.e2e.ts` has a `setUp` function, and its check (a) counts responses to `/api/tool-registry/tools/cold_open` (line 92).
- CHECKED `plans/TRG-14.md` C2: the Source tab never reads `GET /tools/:name`. C10: no lint request until the first edit, and a draft is linted once after the start delay. C16: `app-tool-editor` emits `linted` `{lint, views}`.
- CHECKED the `source` entity kind: `packages/packs/core/entity-types/source.yaml` (folder `sources`; required `title`, `citation`, `reliability`). A `place` entity type file exists only under `packages/packs/fiction/entity-types`, so the e2e does not use that kind. `apps/api/src/modules/project-store/entity-manifest.ts` line 16 names both roots, `entities` and `sources`, for entity files.
- CHECKED the web and the API import `@bbartolome/scriba-contracts` from its built output `packages/contracts/dist` (git-ignored, `plans/PLT-02.md` section 1). A contract change therefore needs `npm run build -w @bbartolome/scriba-contracts` before the web or API tests.
- CHECKED the run command for one e2e spec: `npm run e2e -w @bbartolome/scriba-e2e -- <spec file>` (used in the TRG-14 review entries of `plans/DECISIONS.md`, around line 5781). Port 8080 collisions with another stack were recorded there.

### 1b. Assumed (the implementer checks each; a failure is a stop, with a report)

- ASSUMED lint accepts `x-scriba-port: false` on `coreIdea` (the edit in e2e E1). If lint refuses it, stop and report.
- ASSUMED the Project store lists the `source` entity written by E1 and E2 (front matter `type: source`, `title`, `citation`, `reliability`, under `sources/`). If it does not, stop and report.
- ASSUMED Playwright can replace the whole editor text with Control+A followed by `keyboard.insertText`, in CodeMirror.
- ASSUMED Node and npm are those of the repo: record `node -v` and `npm -v` at step 0, as `plans/PLT-02.md` does.
- ASSUMED the e2e library is shared by the specs of one run. Each spec removes the file it writes.
- ASSUMED port 8080 is free when the e2e runs.

## 2. Decisions the plan obeys

- **D1 Placement.** The live panel sits beside the editor in the Source tab, not in the outer tab strip. Source: unit line 18 ("Preview tabs beside the editor"). Acceptance criterion 1 (unit line 21) needs the node preview to change while the author types. An outer tab would unmount the editor and lose the unsaved text (`tools-list.ts` tab `@if`). `plans/TRG-14.md` section 6 says TRG-15 needs "the tab strip for its preview tabs". This plan reads that as the panel's own strip, which sits inside the Source tab. `plans/TRG-13.md` line 118 foresaw TRG-15's previews "in the tab strip of C3". The unit's later wording ("beside the editor") and criterion 1 (live while typing) decide for the panel's own strip. The outer strip is unchanged.
- **D2 The four preview tabs** are form, node, function schema and rendered prompt, as unit line 18 lists them. The panel's strip is `div role="tablist"` of `button role="tab"` with `data-live-tab="form|node|function|prompt"`. Form is first and selected by default.
- **D3 Views from the editor.** The panel's views come from the editor's `linted` output. The browser parses no YAML. Source: unit line 18; TRG-14 C16. This plan adds one field to that output: `source`, the text that was linted or saved (D11 needs it). The addition is additive.
- **D4 A row's first views** come from its source read: `GET …/builtin` for a built-in, `GET …/user` for a user copy (`ToolSourceView.views`). The Source tab never reads `GET /tools/:name`. Source: TRG-14 C2, and the TRG-05 e2e check (a).
- **D5 A draft** has no views until its first lint. The editor lints a draft once after the start delay (TRG-14 C10). Until then the panel says there is nothing to preview.
- **D6 The TRG-05 Preview tab stays unchanged.** It reads `GET /tools/:name` and validates through `validate`. `tools-preview.spec.ts`, the TRG-05 e2e and TRG-13 C3 depend on it. Source: `plans/TRG-13.md` line 118 ("TRG-13 does not change them").
- **D7 Render accepts an optional inline `source`.** The source is the YAML text, parsed by the server. The render request gains `source: z.string().optional()`. The change is expand-only (`units/README.md` contract rule). Sources: unit line 18 ("if needed, render accepts an inline spec in addition to :name, an expand-only change to /tool-registry"); `plans/TRG-12.md` line 218; `plans/TRG-10.md` line 124. Text rather than a parsed spec, because the browser parses no YAML (unit line 18).
- **D8 Meaning of an inline source.** When `source` is present: the path segment `:name` is not looked up, because a draft is not saved; the author's enabled switch is ignored, because unsaved text has no switch; the source is linted with `lintToolSource(source, {entityKinds})` with no file name. A lint error answers `TOOL_INVALID` (422). Warnings do not block. Execute ignores `source`: its schema strips unknown keys, and it is not changed.
- **D9 Rendered prompt inputs.** Sample values are the Form tab's values (the defaults prefilled by `ToolForm`, and what the author types). Entities are resolved in the browser through the Project store's resolution GET (`entityResolvePath`), with `ref = id`, as TRG-16 C6. An empty style field takes the project's style profile first (`projectFilePath`, `styleProfileOf`), as TRG-16 C4 to C8. Source: unit line 18 ("the preview form's values and entities resolved through the Project store").
- **D10 No write.** Render writes nothing, and the panel never saves. Source: `modules/tool-registry.md` ("it writes no files"; "agent/recipe writes still always become pending changes").
- **D11 Pickers.** The picker reads the kinds from the field descriptor reactively (section 1a, `entity-picker.ts`; `plans/TRG-04.md` P3). Criterion 1's second clause is therefore met by passing the new views to the Form tab. The node layout has no picker: its ports are rows with handles.
- **D12 Shared helpers.** The four pure helpers of `tools-try.ts` are exported (`isEntityField`, `isStyleField`, `idsOf`, `isEmpty`) and reused. The resolve chain is written again in the panel (about 40 lines). The chain is a component state machine with its own tests (TRG-16 Y1 to Y8), so it is not moved. This is the simplest option that changes no behaviour of TRG-16.
- **D13 Node layout.** The panel uses the same handle template as the TRG-05 Preview (`<i class="handle" [attr.data-port] [attr.data-side]>`).
- **D14 Conventions.** HTTP under `/api/tool-registry`; the render command stays a POST; errors use the `TOOL_*` codes (`units/README.md`, Conventions; `modules/tool-registry.md`, HTTP).
- **D15 Testing.** External behaviour only. API seam: `create-test-app` with `EXECUTOR_PACKS`. UI seam: Angular's Vitest runner with the Shell fakes (`createShellTestDoubles`, `respond(method, path, body)`), as in `tools-try.spec.ts`. The two acceptance criteria are checked in the running app with Playwright (section 5). Sources: `units/README.md`, Testing; `modules/tool-registry.md`, Testing principles.
- **D16 Unit history.** The unit has no change notes (section 1a), so no change of the unit needs to be applied.
- **D17 Order.** Blockers TRG-03, TRG-12 and TRG-14 are done. TRG-16, the parallel unit, is merged (section 1a). TRG-15 is built on main as it is.

## 3. Files to change

Only the paths below change. Generated output (`packages/contracts/dist/`, `e2e/test-results/`) is rebuilt or written by runs and is not committed.

| Path | Change | Purpose |
|---|---|---|
| `packages/contracts/src/tool-registry/call.ts` | changed | `toolRenderRequestSchema` becomes `toolCallRequestSchema.extend({ source: z.string().optional() })`. Execute's schema is unchanged (D7, D8) |
| `packages/contracts/test/tool-registry.schema.test.ts` | changed | adds test R0 (section 5.2). Existing tests keep their assertions |
| `apps/api/src/modules/tool-registry/catalog.service.ts` | changed | adds `compileSource(source): LoadedTool`, placed after `lint` (line 250). It lints with `entityKinds: this.kinds`. Null spec, null views or any error answers `TOOL_INVALID` (422). Otherwise it returns `{spec, source, origin: 'user', views, compiled: compileTool(spec, createAjv())}`. It does not re-scan the disk |
| `apps/api/src/modules/tool-registry/executor.service.ts` | changed | `prepare` takes the resolved tool. For `request.source` set, the tool is `catalog.compileSource(source)` and the enabled check is skipped. Otherwise the tool is `catalog.entry(name)` and the enabled check is as today. Validation calls `validateArguments(tool, {arguments, mode: 'full'})` for both paths. Steps 3 and 4 are unchanged. `execute` keeps `catalog.entry(name)` and never reads `source` |
| `apps/api/test/tool-registry-executor.test.ts` | changed | adds tests R1 and R2 (section 5.2). Tests C1 to C5 and X1 keep their assertions |
| `apps/web/src/app/features/tool-registry/tool-copy.ts` | changed | adds `TOOL_RENDER_PATH_TEMPLATE` (`/api/tool-registry/tools/:name/render`), `toolRenderPath(name)` (name encoded as one segment, as `toolExecutePath`), and `toolRenderCopy: ResponseSchema<{prompt: string}>`, hand-written. Adds `ToolRenderResult` to the type import. Runtime imports stay empty |
| `apps/web/src/app/features/tool-registry/tool-copy.spec.ts` | changed | adds test S4a. Existing tests keep their assertions |
| `apps/web/src/app/features/tool-registry/tool-editor.ts` | changed | the `linted` output becomes `{lint, views, source}`. `source` is the text linted (line 204), or saved (line 224), or the text of the failed save (line 239). Behaviour otherwise unchanged |
| `apps/web/src/app/features/tool-registry/tool-editor.spec.ts` | changed | adds test T7 (section 5.2). Existing tests keep their assertions |
| `apps/web/src/app/features/tool-registry/tools-try.ts` | changed | adds `export` to `isEntityField`, `isStyleField`, `idsOf` and `isEmpty`. No other change (D12) |
| `apps/web/src/app/features/tool-registry/tools-list.ts` | changed | the draft branch (line 297) and the row Source branch (line 319) become a two-part split: the editor with `(linted)="onLinted($event)"`, and `<app-tool-live-preview [tool] [source] [views]>`. Adds the state `live` (undefined, or `{source, views}`), `onLinted`, and a `liveOf(row)` or draft equivalent: `live() ?? {source: view.source, views: view.views}` for a row, `live() ?? {source: draft.source, views: null}` for a draft. `openRow` and `openDraft` reset `live`. Adds the import and a `styles` block for the split (the component has none today). The tab strip, the Preview branch and the Try branch are unchanged |
| `apps/web/src/app/features/tool-registry/tool-live-preview.ts` | new | the component `ToolLivePreview`, selector `app-tool-live-preview` (section 4, step 6) |
| `apps/web/src/app/features/tool-registry/tool-live-preview.spec.ts` | new | tests V1 to V6 (section 5.2) |
| `e2e/specs/tools-live-preview.e2e.ts` | new | tests E1 and E2 (section 5.1) |

Not changed: `tools-preview.ts`, `tool-form.ts`, `entity-picker.ts`, `tool-registry.routes.ts`, `tools.controller.ts`, `tools-list.spec.ts`, `tools-try.spec.ts`, every file under `units/`, `modules/`, and `plans/` (including `plans/DECISIONS.md`).

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Each step ends with its expected result.

0. Start. Clean tree on `main`. `git switch -c unit/TRG-15`. Record `node -v` and `npm -v`. Expected: `Switched to a new branch 'unit/TRG-15'`; the stop checks of section 1b are noted.
1. Contract. Edit `packages/contracts/src/tool-registry/call.ts` (section 3). Add test R0. Run `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-contracts`. Expected: exit 0; `tool-registry.exports.test.ts` unchanged and passing.
2. API service. Add `CatalogService.compileSource` and change `ExecutorService.prepare` as section 3 says. Expected: the root `npm test` still passes C1 to C5 and X1, unchanged.
3. API tests. Add R1 and R2 to `tool-registry-executor.test.ts`, following test C1's pattern. Expected: R1 and R2 pass.
4. Web copies. Edit `tool-copy.ts`, add S4a. Expected: S1a to S4a pass.
5. Web helpers. Add `export` to the four helpers in `tools-try.ts`. Expected: `tools-try.spec.ts` (Y1 to Y8) passes unchanged.
6. Editor and panel. Edit `tool-editor.ts` (`source` in `linted`), add T7 to `tool-editor.spec.ts`. Create `tool-live-preview.ts` and `tool-live-preview.spec.ts`. The panel's inputs are `tool` (the name used in the render path), `source` (the YAML text) and `views` (`ToolViews | null`). Its tabs and DOM hooks are in section 5.2. Its Prompt tab reads the active project, fills an empty style field, resolves the entity IDs, and posts to `toolRenderPath(tool)` with `{arguments, entities, source}`, as the Try chain does (TRG-16 C4 to C8). A resolution error shows its message and posts nothing. `TOOL_ARGS_INVALID` shows its issues by `issuesOf`. Any other failure shows its message. The Node tab uses `layout="node-body"` with `ports`. The Function tab shows `views.functionSchema` as JSON. With `views` null, the panel shows one note and no tabs. Expected: V1 to V5 pass.
7. List wiring. Edit `tools-list.ts` (section 3), with V6 in `tool-live-preview.spec.ts`. Expected: V6 passes; TRG-13's L1 to L8, TRG-14's tests and TRG-16's Y1 to Y9 pass unchanged.
8. E2E. Create `e2e/specs/tools-live-preview.e2e.ts` (section 5.1). Setup as `e2e/specs/tools-preview.e2e.ts` `setUp`, with project `tools-live`: `project.yaml` with `genrePack: nonfiction`; entities `entities/ada.md` (`type: person`) and `sources/field-notes.md` (front matter `type: source`, `title`, `citation`, `reliability`); a user copy `live_probe.yaml`, which is the `cold_open` fixture with `name: cold_open` replaced by `name: live_probe`. `afterAll` removes `live_probe.yaml`. Expected: E1 and E2 pass.
9. Gates. Root `npm run build`, `npm test` and `npm run lint` (Prettier included). Then each e2e spec in its own invocation, serially, with port 8080 free: `npm run e2e -w @bbartolome/scriba-e2e -- tools-live-preview.e2e.ts`, then `tools-editor.e2e.ts`, `tools-preview.e2e.ts`, `tools-try.e2e.ts`. Expected: all exit 0. The `tools-preview.e2e.ts` check (a) still counts one read of `cold_open`.
10. Record. Commit on `unit/TRG-15` with the message `feat(TRG-15): live previews beside the tool editor and render of an inline source`. Record each command's output and the section 1b results. Do not push.

## 5. Tests

### 5.1 Acceptance tests (one per criterion)

| Criterion (unit line) | Test | Seam | Pass condition |
|---|---|---|---|
| Line 21: editing a field's `x-scriba-port` updates the node preview's ports live; changing `x-scriba-entity-kinds` changes what the picker offers | `e2e/specs/tools-live-preview.e2e.ts`, test E1 "the node preview loses coreIdea's port row and the picker of entityIds offers only the source kind, after the lint answer, with no save". Setup: section 4 step 8. Opens `live_probe` (user row) on the Source tab and reads `live_probe.yaml`. In the editor, line 11 `x-scriba-port: true` becomes `false` (coreIdea), and line 20 `x-scriba-entity-kinds: [person]` becomes `[source]` (entityIds). Waits for the `POST /api/tool-registry/lint` answer | Rendered UI in the running app (Playwright). Real lint, real Project store | Node tab: `[data-port="coreIdea"]` count 0, `[data-port="entityIds"]` count 1. Form tab: the entityIds picker lists `field-notes`, not `ada`. The file on disk is unchanged after the test |
| Line 22: the rendered-prompt tab shows the template rendered with sample values and a real entity | `e2e/specs/tools-live-preview.e2e.ts`, test E2 "Render shows the cold-open template with the Form values and the chosen entity". Opens `live_probe` on the original text. Fills Core idea with `Engines reward patience`, chooses `ada` for entityIds, selects the Prompt tab, clicks Render | Rendered UI in the running app (Playwright). The real render endpoint and the real entity | `[data-prompt]` contains `Core idea: Engines reward patience`, `person ada (entities/ada.md)` and `Ada.` |

Each criterion has one test, which is the test named in its row. The supporting tests of section 5.2 check the parts. They do not count as acceptance tests.

### 5.2 Supporting tests (not counted as criteria)

- R0, `packages/contracts/test/tool-registry.schema.test.ts`: a render request parses with and without `source`; a non-string `source` is refused; execute's schema is unchanged.
- R1, `apps/api/test/tool-registry-executor.test.ts`: render with an inline `source` for a name that is not saved (`unsaved_probe`), using the text of the `render_probe` fixture. Expected: 200 with the rendered prompt; the mock receives no request.
- R2, same file: an inline source with a lint error (`{{momnet}}` in the prompt) answers 422 `TOOL_INVALID`; the mock receives no request.
- S4a, `apps/web/src/app/features/tool-registry/tool-copy.spec.ts`: `toolRenderPath` and `toolRenderCopy` agree with the contract (as S3a does for execute).
- T7, `tool-editor.spec.ts`: after a debounced lint, `linted` carries `source` equal to the text that was linted. After a save, it carries the saved text.
- V1, `tool-live-preview.spec.ts`: a new `views` input moves the node-body port rows (`[data-port]`).
- V2: with fake entities (`ada` person, `field-notes` source), the Form tab's picker offers `ada` when kinds are `[person]`, and `field-notes` when they are `[source]`.
- V3: Render posts `{arguments, entities, source}` to `toolRenderPath`, with the resolved entity mapped as `ref = id`, and shows the answer in `[data-prompt]`.
- V4: a refused render (`TOOL_ARGS_INVALID`) shows each issue beside its field.
- V5: with `views` null, the panel shows its note, no tab and no request.
- V6, list level: in the Source tab, a typed change followed by the debounced lint answer (fake time, as `tool-editor.spec.ts` T1c) moves the node preview's port rows.

Hooks used by the tests (all defined here): `section[aria-label="Live preview"]`; `[data-live-tab="form|node|function|prompt"]` with `role="tab"`; `[data-live-panel]`; `[data-port]` on the handle; `[data-function]` on the function JSON; `[data-render]` on the Render button; `[data-prompt]`; `[data-live-note]`.

## 6. Agreement with downstream and parallel units

- **TRG-17 (the editor-UI gate).** Its criterion needs TRG-13 to TRG-16 to pass on main; this plan keeps their tests green (step 7). Its demo step 2 says that after Customize, a `tone` select and a save, "the form preview, node preview and function schema all gained `tone`". The save answer carries the views and `source`, so the panel shows `tone` in the Form tab, as a param in the Node tab, and in the Function tab. Demo step 3 (a typo blocks the save): the lint has an error, so the panel shows its note until the error is fixed. Demo step 4 (Try) is TRG-16's and is unchanged. Demo step 6 (Revert) closes the detail, as today.
- **TRG-16 (merged; `status: done`).** Shared file: `tools-list.ts`. TRG-16 owns the `try` case and the `tryOffered` rule. This plan edits only the two Source branches, the imports and the `styles` block. Shared file: `tools-try.ts`. This plan adds `export` to four helpers. The behaviour and tests of Y1 to Y8 are unchanged. The two edits touch disjoint lines. If the order were the other way round, the same edits would still merge: the Try branch and the Source branches share no state, and an added `export` does not change a file that TRG-16 uses. TRG-16's section 6 says that TRG-15 "names no file" and that its shared edits were not checked; this section checks them.
- **TRG-14 (merged).** The `linted` output gains one field (C16 is extended, not replaced). The Source tab reads only `/builtin` or `/user` (C2). Lint still waits for the first edit (C10). The save feedback (C12) and the diagnostics on their lines are unchanged.
- **TRG-13 and TRG-05.** The tab strip, the L1 to L8 tests and the Preview tab are unchanged. The e2e check (a) of `tools-preview.e2e.ts` still counts one read of `GET /tools/cold_open`, because the Source tab reads no detail (D4).
- **TRG-12 (done).** The render endpoint gains one optional field (D7). Execute is unchanged, and still writes no files. Plan text `plans/TRG-12.md` line 218 names this change as TRG-15's.
- **TRG-03 and TRG-04 (done).** The panel uses the form and node layouts through the descriptor (TRG-03). The picker re-filters from the descriptor (TRG-04 P3).
- **`modules/tool-registry.md`.** No change. Its graph line 26 says "needs 03, 12". The unit's `blocked_by` names TRG-14 too, and the plan follows the unit (section 1a).

## 7. Open points

None. Every choice above took the simplest option that the unit, the module and the merged plans allow, and each choice names its source (section 2). The reviser can overrule any of them. The facts the implementer must still check are listed in section 1b; a failed check stops the step, and the report says which check failed.
