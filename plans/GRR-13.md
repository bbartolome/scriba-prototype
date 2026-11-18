---
id: GRR-13
status: draft
---
# GRR-13 plan — run controls, input-values dialog, live status and results, read-only while running

Unit: `units/GRR-13-run-controls-status.md` (module graph-runner, phase:canvas, M4). Base: main `fe37bf1`. Revision 1, by the planner (draft stage). The unit file has no notes section. Its one recorded change is `098add9` (`parallel_with` gained GRR-16); its Decisions and criteria are the same at every commit. GRR-12's plan is `planned` at this base (revision 2, the text read here). Section 7 says what that plan must carry.

Nothing in this plan marks a criterion as passed.

## 2. Facts checked and facts assumed

### 2.1 Checked

Unit, module and plans:
- CHECKED: `units/GRR-13-run-controls-status.md` lines 1 to 9 (front matter: blocked by GRR-04, GRR-05, GRR-06, GRR-11 and PST-20; parallel with GRR-12, GRR-14, GRR-16; unblocks GRR-15 and GRR-17), lines 18 to 22 (Decisions: 18 controls, 19 dialog, 20 badges, 21 inline results, 22 read-only), lines 25 to 28 (four criteria).
- CHECKED: `units/README.md` (unit format, blocker notation, phase gates: `phase:canvas` closes when GRR-17 merges), `modules/graph-runner.md` (cross-cutting decisions: HTTP run routes, validation on the server; testing principles: UI seam with Shell fakes, gestures only where they are checked).
- CHECKED: `plans/PLT-02.md` (structure followed), `plans/GRR-11.md` (done; its C-16 Run control and C-17 form value are kept; its section 4 test convention is followed).
- CHECKED: statuses `done` in `plans/GRR-04.md`, `GRR-05.md`, `GRR-06.md`, `GRR-11.md`, `GRR-16.md` and `PST-20.md`. No plan exists for GRR-14, GRR-15 or GRR-17.
- CHECKED: `grep -l -E "^status: *(draft|planned)" plans/*.md` at fe37bf1 prints `plans/GRR-12.md` and `plans/TRG-15.md`. TRG-15's section 2 changes `tool-copy.ts`, `tool-editor.ts`, `tools-try.ts`, `tools-list.ts`, `tool-live-preview.ts` and their specs, plus `e2e/specs/tools-live-preview.e2e.ts`. It does not change `tool-registry.routes.ts`.
- CHECKED: `plans/GRR-12.md` revision 2 (planned): C-4 (`onChipDrop` takes the port id), C-8 (`removeChip`), C-15 (read-only: "whichever merges second makes `onChipDrop` and `removeChip` obey GRR-13's read-only state"), step 0, section 7 (GRR-13 row) and open point 1. It names no signal.
- CHECKED: DECISIONS.md, by grep for the ids only: lines 5885 and 5890 to 5898 (GRR-11 Run control, option A: GRR-13 adds the click, the input-values dialog and the run-in-progress disabled condition; the read-only rule is GRR-13 line 22); lines 4220 to 4224 (TRG-04 O7: chips are CDK drag and drop, one mechanism for mouse and touch); line 5144 (GNP-04 point 5: a tool node has no `params` until the author sets a value).

Contract, `packages/contracts/src/graph-runner`:
- CHECKED: `routes.ts` lines 16 to 19: `RUNS_ROUTE` `/api/graph-runner/runs` (POST start), `RUN_STOP_ROUTE` `/api/graph-runner/runs/stop` (POST), `RUN_CURRENT_ROUTE` `/api/graph-runner/runs/current` (GET).
- CHECKED: `runs.ts` lines 24 to 32 (input values: `{kind:'text', text}`, `{kind:'file', ref}`, `{kind:'entities', refs}`, `{kind:'style', ref}`), 43 to 49 (start request: `graphId`, `inputs`, optional `target: {nodeId}`, optional `targets`), 52 to 55 (start result `{runId}`, strict), 58 to 61 (stop request `{runId}`, strict), 70 to 82 (output result `{pendingChangeId, path}`; a node result is a tool result or an output result), 94 to 112 (run state; `{run}` or `null` before any run).
- CHECKED: `events.ts` lines 14 to 29 (node-status data: `runId`, `nodeId`, `status`, optional `result` and `error`; run-ended data: `runId`, `status`, optional `reason`) and 51 to 55 (three members).
- CHECKED: `constants.ts` line 50 (four run statuses), lines 53 to 57 (reasons `author`, `project-switched`, `interrupted`), lines 60 to 67 (six node statuses: `idle`, `queued`, `running`, `done`, `error`, `stopped`).
- CHECKED: `packages/contracts/src/platform/events.ts` line 18: the base envelope's `data` is `z.unknown()`, so the page must check event data itself.
- CHECKED: `packages/contracts/src/tool-registry/call.ts` lines 64 to 75: tool output `{kind, content}`; call result `{output, sourcesUsed}`. `packages/contracts/src/project-store/entities.ts` line 8: `entityRefSchema` is an id string. So `sourcesUsed` holds entity ids, not paths.
- CHECKED: `packages/contracts/src/project-store/files.ts` lines 15 to 20 (file entry: `path`, `kind` `file` or `dir`, `size`, `mtime`) and 23 to 26 (list query: `path`, optional `recursive`).
- CHECKED: `packages/contracts/src/platform/slugs.ts` lines 20 to 29: `graph-runner` is a publishing slug.

Server, `apps/api/src/modules/graph-runner`:
- CHECKED: `runs.controller.ts` lines 21 to 43: the start POST answers `{runId}` with 200; `current()` is a GET; the stop POST answers `{}`.
- CHECKED: `runs.service.ts`: line 195 `start`; line 196 reads the graph at start; line 265 throws `RUN_ACTIVE`, the only occurrence of `RUN_ACTIVE` or `GRAPH_RUN` in the module (grep); line 301 publishes `run-started`; lines 325 to 329 `current()` (the active run of the active project, else the last, else the recovered one, else null); lines 334 to 345 `stop()`; line 390 `requestEnd`; line 742 publishes `node-status` (in `setStatus`); line 781 publishes `run-ended` (in `finish`); lines 750 to 758 `endStopped`.
- CHECKED: `run-scope.ts` lines 11 to 27 (`scopeOf`: the target and the nodes reached by walking wires backwards; no target means every node).
- CHECKED: `output-targets.ts` lines 31 to 44 (`generatedTarget` uses the UTC start instant of the run, so a browser cannot show the name the server will write).

Shell, `apps/web/src/app/shell`:
- CHECKED: `index.ts` line 3 (`API_CLIENT`, `SSE_CLIENT`), line 11 (`ActiveProjectSignal`). `api-error.ts` lines 10 to 22 (`ApiError` has `status`, `code`, `message`).
- CHECKED: `sse-client.ts` lines 13 to 14 (reconcile reasons), 59 (`reconcile$`), 78 to 80 (`stream(slug)`). `project-scope.ts` lines 75 to 85 (`ActiveProjectSignal.projectId`, read from the URL).
- CHECKED: `testing/test-doubles.ts` lines 43 to 103 (`FakeApiClient`: answers keyed by method and path, `params` not part of the key, an unregistered route fails with a plain Error) and 110 to 162 (`FakeEventSource`: `push` checks the envelope; `reopen()` and `tick()` emit reconcile ticks).
- CHECKED: `eslint.config.mjs` lines 49 to 66 (R1: a web feature imports another only through its `*.routes.ts` entry).
- CHECKED: `app.routes.ts` lines 39 to 48 (`review` route under `projects/:projectId`); `project-store/review-page.ts` lines 343 to 346 (reads the `run` query parameter).

Graph runner, `apps/web/src/app/features/graph-runner`:
- CHECKED: `canvas-page.ts` (842 lines): palette `ul.palette` lines 220 to 230; `div.controls` lines 232 to 291 (Save at 284; Run `data-run` at 286; `data-run-reasons` at 287); `<vflow>` lines 294 to 363 (`[connection]` 298, `(connect)` 299, `(nodesChanges.position)` 300); vnode template from line 304; `app-tool-form` from line 352. Members: `runBlocked` 507; `connection` 510 to 522 (validator); `changes` Subject 528; constructor 530 to 549; `onConnect` 551; `onMove` 561; `add` 581; `addTool` 604; `deleteSelected` 637; `save` 659; `onSettings` 710; `validate` 739; `load` 758; `readTools` 801; `readDetail` 836.
- CHECKED: `vflow-adapter.ts` lines 31 to 38 (`vflowNodeOf`: an html-template node with `point` and `data` signals, no `draggable`) and 72 to 79 (`replaceNode`).
- CHECKED: `graph-runner-contract.ts` lines 20 to 22 (header: type imports only, copies checked by spec), 25 to 28 (`GRAPHS_PATH`, `RUN_CURRENT_PATH`), 34 to 69 (path helpers, `TOOLS_PATH`, `toolPath`, `graphValidatePath`), 137 to 165 (`currentRunCopy`), 223 to 229 (`noBodyCopy` accepts only `null`, so it cannot check the stop reply `{}`).
- CHECKED: `graph-list-page.ts` lines 129 to 131 (injects `SSE_CLIENT` and `ActiveProjectSignal`), 171 to 175 (a run shows only on its own recipe row), 188 to 197 (graph-runner events re-read the current run; reconcile ticks re-read every source). This is the precedent for the reconcile pattern.
- CHECKED: `tool-registry.routes.ts` lines 17 to 21 (the entry re-exports `ToolForm` and its types).
- CHECKED: `tool-registry/entity-picker.ts`: class `EntityPicker` at line 221 (not exported by the entry); inputs `field` (`FormField`, required, line 223), `describedBy` (225), `value` model (227); `ngOnInit` lines 290 to 298 (reads the active project); `accepts` lines 361 to 370 (a style picker takes `style-profile` chips; an entity picker takes the field's `entityKinds`, no filter when empty); style picker reads `project.yaml` and preselects `styleProfile` when the value is empty (lines 387 to 408, the commit at 407).
- CHECKED: `tool-registry/views.ts` lines 55 to 70 (`formFieldSchema`: `key`, `title`, `description`, `control`, `required`, `default`, `list`, `entityKinds`, `port`, ...). `tool-registry/constants.ts` lines 32 to 41 (control types include `entity-picker` and `style-picker`).
- CHECKED: `project-store/files-contract.ts` line 12 (`projectFilesPath`) and line 53 (`fileListCopy`, not importable under R1). `project-store/files-page.ts` lines 61 to 62 (the files page lists the whole tree with `{path: '.', recursive: 'true'}`).
- CHECKED: `canvas-page.spec.ts` lines 1 to 30 (imports), 83 to 96 (`render`: `App` with `APP_ROUTES` and the Shell doubles), 278 to 298 (`respondTools`), 301 to 305 (`postsTo`), 314 (GRR-10 test 1).
- CHECKED (library, read only): ngx-vflow 2.7.0, the version `apps/web/package.json` line 33 pins, in `/Users/bbartolome/workspace/scriba-prototype-wt/GRR-11/node_modules/ngx-vflow`: `fesm2022/ngx-vflow.mjs` line 1219 and 1230 (a node's `draggable` is a signal), 1550 (a given signal is used), 3833 and 3834 (`hostUndraggable` is `!draggable()`), 3849 to 3853 (the DOM drag is enabled or disabled from it); `lib/vflow/interfaces/node.interface.d.ts` line 29 (`draggable?: WritableSignal<boolean>`). The main checkout has no `node_modules/ngx-vflow`.

### 2.2 Assumed

- ASSUMED A1: `npm ci` in the new worktree installs ngx-vflow 2.7.0 and the Angular Material the picker uses. Step 0 checks it.
- ASSUMED A2: `EntityPicker`, rendered by the dialog outside `ToolForm`, behaves as it does inside it (its `ngOnInit` reads the active project and its entity list; a style picker preselects; its value model emits). T1 checks it.
- ASSUMED A3: jsdom renders `a[routerLink]` with an `href` under `provideRouter`. T4 checks the attribute. jsdom does not apply `fieldset[disabled]` to a button's `disabled` property, so T3 checks the `fieldset` attribute and the buttons' `disabled` property only.
- ASSUMED A4: jsdom renders the library's nodes and handles under the stubs of `canvas-page.spec.ts` lines 43 to 68 (GRR-11 A1).
- ASSUMED A5: the Platform envelope check accepts `{module: 'graph-runner', type: 'node-status', data}`. T2 checks it.
- ASSUMED A6: the canned bodies of T1 to T4 satisfy the copies they pass through (`currentRunCopy`, `validationResultCopy`, the entity list, the project file read, the file list). A body that fails its copy fails the test; it is not skipped.
- ASSUMED A7: no e2e run is needed for these criteria. All four name the rendered UI with fakes. The port 8080 stays untouched in this unit.

## 3. Decisions this plan obeys

### 3.1 Settled by the unit, the module, DECISIONS or the done units

- **D1. Controls.** Run (opens the input-values dialog, then starts), Run to here (a node action on tool and output nodes), Stop (posts the run id). Source: unit line 18; module "HTTP" bullet (run routes).
- **D2. Dialog fields.** Every input node and output node in scope: for a whole run, all of them; for Run to here, the target and its upstream. Source: unit line 19; GRR-04 unit line 19.
- **D3. Input values** use the server's shapes: text typed or a project file, entities as an id list, style as one id. Source: GRR-04 unit line 21; `runs.ts` lines 24 to 32.
- **D4. Entity filter.** The kinds of the receiving port: the tool's form field with the port's key and `port: true`, its `entityKinds`. When the input is not wired to a port that names kinds, the input node's `entityKind`. Source: unit line 19; `views.ts` line 66; `executor.service.ts` lines 135 to 147 (the server checks a field's kinds when they are given). The server checks no input `entityKind` (grep of `runs.service.ts` and `graph-validation.ts`), so the port's kinds are the filter that matters at run time.
- **D5. Style default.** The project's `styleProfile` from `project.yaml`, preselected. Source: unit line 19; `entity-picker.ts` lines 387 to 408.
- **D6. Output target.** The field shows `params.path`. An empty field sends no entry, and the server names the file (request, then `params.path`, then the generated name). Source: GRR-06 unit line 23; `output-targets.ts` lines 31 to 44. See open point 1.
- **D7. Status badges** come from `node-status` events, folded into the page state. The state is reconciled from the current run on load and on each reconcile tick. Source: unit line 20; `sse-client.ts` lines 13 to 14 and 59; precedent `graph-list-page.ts` lines 188 to 197.
- **D8. Inline results.** An expandable preview of the output content and of `sourcesUsed`; errors shown as their message; an output node with a pending change links to `/projects/:projectId/review?run=<runId>`. Source: unit line 21; `runs.ts` lines 70 to 82; PST-20 unit line 15; `review-page.ts` lines 343 to 346. See open point 2.
- **D9. Read-only.** The canvas is read-only while its recipe is running and editable again once that run has ended. Source: unit line 22 and criterion 3.
- **D10. One active run per project.** A second start is refused with `GRAPH_RUN_ACTIVE`; the dialog shows the server's message. Source: GRR-04 unit line 20; `runs.service.ts` line 265.
- **D11. Stop only posts.** The server marks running and queued nodes `stopped` and ends the run with reason `author`. Source: GRR-05 unit line 19; `runs.service.ts` lines 334 to 345 and 750 to 758.
- **D12. Run stays disabled while blocking issues exist** (GRR-11 C-16), and now also while the run is in progress. Source: GRR-11 plan C-16; GRR-11 unit line 22.
- **D13. Scope mirrors the server.** The target and its upstream; results are never reused. Source: GRR-04 unit line 19; `run-scope.ts` lines 11 to 27.
- **D14. Read-only is enforced in the browser only.** The run reads its graph at start (`runs.service.ts` line 196), so an edit after the start cannot change that run, and no server change is made. Source: this plan; no unit asks for a server guard. The module's run codes (`GRAPH_RUN_ACTIVE`, `GRAPH_RUN_NOT_FOUND`, module "Cross-cutting decisions", Errors bullet) cover starts and stops only; none covers a save.
- **D15. Import rule.** A web feature imports another only through its entry file (R1). The picker is reused through the tool-registry entry (C-6). Source: `eslint.config.mjs` lines 49 to 66.
- **D16. Browser copies.** The browser ships no zod values, so every contract copy is hand-written, type-imported, and checked by a spec. Source: `graph-runner-contract.ts` lines 20 to 22.
- **D17. Test seam.** The UI seam (the lazy route rendered by `App` with the Shell fakes), one test per criterion named as the criterion's text. Unit tests never read `examples/`. Source: module "Testing principles"; GRR-11 plan section 4.
- **D18. A run shows only on its own recipe.** Source: `graph-list-page.ts` lines 171 to 175.
- **D19. No run controls on a story graph.** Source: module "Out of scope" and GRR-14 unit line 20.

### 3.2 Choices made here (names, layout and shapes the units leave open)

- **C-1. Files.** `run-state.ts`, a pure module with no library and no Angular import, holds the rules (C-2, C-3, D2, D4, D13, the request of C-7). `run-dialog.ts` is the dialog component. Type imports only from the contract.
- **C-2. Run state.** A signal `run` holds `RunState | null` from the current-run GET (`currentRunCopy`). Events fold into it:
  - `node-status` whose `runId` equals the run's: that node's state becomes `{status, result?, error?}`. Other run ids are ignored. The data is checked by `nodeStatusDataCopy` (C-13).
  - `run-ended` whose `runId` matches: `status` and `reason` are set.
  - `run-started`: a read, because the event carries the full state and the read is the simpler path.
  - Every event increments `eventSeq`. Reads go through a Subject with `switchMap`, so the latest read wins. A read's answer is applied only if no event arrived after the read was sent; otherwise a new read starts.
  - Reads start on load, on every reconcile tick, on `run-started`, and after a successful start.
- **C-3. Lock.** `currentGraphId` is a signal set in `load()`. `running` is true when the page is a recipe and `runOfGraph(run, id)` has status `running`. `starting` is true from the Start click until the start POST answers. `editable = !running && !starting`. A story view is always editable.
- **C-4. Guards.** The connection validator returns false when not editable. `onConnect`, `onMove`, `add`, `addTool`, `deleteSelected`, `onSettings` and `save` each begin with `if (!this.editable()) return;`. Disabled controls: Add, Delete selected, Save, every palette button, Run (`runBlocked() || !editable()`), and Run to here (`!editable() || runBlocked()`). The `app-tool-form` of a node sits in `<fieldset [disabled]="!editable()">`. Each vnode's `draggable` signal follows `editable` in an effect (C-11).
- **C-5. Dialog.** `app-run-dialog` renders an inline `section[role=dialog][data-run-dialog]`, not a native `<dialog>`, because jsdom has no `showModal`. Inputs: `title`, `fields`, `projectId`, `busy`, `failure`. Outputs: `start` (the values) and `cancel`. Each field is `div[data-run-field=<nodeId>]`:
  - text input: a `select[data-text-mode]` (`text` or `file`), then a `textarea` for text or an `input` with a `datalist` of project files for a file;
  - entity input: `app-entity-picker` with a synthesized `FormField`: `control: 'entity-picker'`, `list: true`, `entityKinds` from D4, `port: false`, `required: false`, `default: undefined`;
  - style input: the same with `control: 'style-picker'`, `list: false`, no kinds;
  - output: `input[data-target]`, prefilled with `params.path`, with a hint that an empty field lets the server name the file.
  - `button[data-start]` is disabled while `busy`, when a file value is empty, or when a style input has no value. `button[data-cancel]` closes the dialog.
- **C-6. Reuse of the picker.** `tool-registry.routes.ts` gets one line, `export { EntityPicker } from './entity-picker';`, after the `ToolForm` re-export. The picker reads the active project, its entity list and `project.yaml` on its own, so GRR-13 adds no read for entities or style.
- **C-7. Start.** POST `RUNS_PATH` with `{graphId, inputs, target?, targets?}`. `inputs` covers the input nodes in scope; `targets` covers the output nodes in scope with a non-empty path; `target` is present only for Run to here. Reply `{runId}` (copy `runStartCopy`). On success: `starting` false, the dialog closes, a read starts. On failure: `starting` false, the dialog shows `ApiError.message` in `[data-run-error]`.
- **C-8. Stop.** POST `RUN_STOP_PATH` with `{runId}`. Reply `{}` (copy `stopCopy`). The page changes no state there; the `run-ended` event folds it.
- **C-9. Node additions (recipe view only).**
  - `span.badge[data-status]` in the vnode head, when a run for this graph exists.
  - `p[data-node-error]` with `error.message`, when the node has an error.
  - `details[data-result]` with a `summary` "Result", `pre[data-result-text]` (the output content) and `ul[data-sources]` (the `sourcesUsed` ids), when the node has a tool result.
  - `a[data-review-link]` with `routerLink` `['/projects', projectId, 'review']` and `queryParams {run: runId}`, when the node has an output result.
  - `button[data-run-to-here]` on tool and output nodes.
- **C-10. Controls.** `button[data-stop]`, shown only while running. `p[data-run-status]` with "Running", "Done", "Stopped" or "Error", and the reason when there is one. The existing `button[data-run]` gets its click, which opens the dialog for the whole run.
- **C-11. Draggable.** `vflowNodeOf` adds `draggable: signal(true)`. The effect of C-4 sets it from `editable`, so a node cannot be moved while the run is active (library lines 3833 and 3849).
- **C-12. Constants.** `RUNS_PATH` `/api/graph-runner/runs`; `RUN_STOP_PATH` `/api/graph-runner/runs/stop`; `projectFilesPath(projectId)` with the id encoded. `RUN_CURRENT_PATH` exists.
- **C-13. Copies** in `graph-runner-contract.ts`: `runStartCopy` (`{runId}`, strict); `stopCopy` (`{}`); `nodeStatusDataCopy` and `runEndedDataCopy` (the event data, checked on arrival); `fileListCopy` (entries with `path` and `kind` `file` or `dir`). The file list is read with `{path: '.', recursive: 'true'}`, as the files page does.
- **C-14. File suggestions.** The datalist lists every `kind: 'file'` entry, with no folder filter. Source: unit line 19 ("a project file picker"); GRR-04 unit line 21 ("not limited to `drafts/`").
- **C-15. The second-merge rule for GRR-12.** See section 7, GRR-12 row.
- **C-16. Test files.** The criterion tests and the supporting page test are appended to `canvas-page.spec.ts` (GRR-11 precedent). The pure rules have their own spec. The copies are checked in `graph-runner-contract.spec.ts`.

## 4. Files to change

Only these paths may be changed by the implementer. Nothing else changes, and the plan file is not changed by the implementer.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/graph-runner/run-state.ts` | new | Pure rules (C-1, C-2, C-3): `runOfGraph`, `foldNodeStatus`, `foldRunEnded`, `scopeOfRecipe`, `dialogFieldsOf`, `runRequestOf`. Type imports only |
| `apps/web/src/app/features/graph-runner/run-state.spec.ts` | new | Supporting check W3 (section 6) |
| `apps/web/src/app/features/graph-runner/run-dialog.ts` | new | The dialog component `app-run-dialog` (C-5) |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.ts` | edit | `RUNS_PATH`, `RUN_STOP_PATH`, `projectFilesPath`; the copies of C-13 |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.spec.ts` | edit | Supporting checks K6, K7 and K8 (section 6) |
| `apps/web/src/app/features/graph-runner/vflow-adapter.ts` | edit | `vflowNodeOf` gets `draggable: signal(true)` (C-11) |
| `apps/web/src/app/features/graph-runner/canvas-page.ts` | edit | Lock and guards (C-3, C-4); reads and folds (C-2); controls and node additions (C-9, C-10); dialog wiring, start and stop (C-7, C-8); the GRR-12 guard lines if GRR-12 is on main (procedure step 5f) |
| `apps/web/src/app/features/graph-runner/canvas-page.spec.ts` | edit | New tests T1 to T4 and the supporting check R (section 6). The existing tests keep their pass conditions |
| `apps/web/src/app/features/tool-registry/tool-registry.routes.ts` | edit | One line: `export { EntityPicker } from './entity-picker';` (C-6). Entry file of another feature, allowed by R1 |

Not changed: `apps/api/**` (no server change, D14); `packages/**`; `apps/web/package.json`; `package-lock.json`; `apps/web/src/app/shell/**`; `apps/web/src/app/features/tool-registry/**` except the entry file above; `apps/web/src/app/features/project-store/**`; `apps/web/src/app/features/graph-runner/tool-nodes.ts` and its spec; `graph-runner.routes.ts`; `app.routes.ts`; `e2e/**`; `examples/**`; `units/**`; `modules/**`; `plans/**` other than this plan; `plans/DECISIONS.md`. Nothing is generated and committed.

## 5. Procedure

Run in a new worktree of `main`, not in the main checkout: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GRR-13 -b unit/GRR-13 main`. Record `node -v` and `npm -v` beside each result. Do not push. Do not start, stop or kill any process. Do not touch port 8080. This unit has no e2e step.

0. **Preconditions.** Expected: the worktree is clean. `git log --oneline <base>..main -- apps/web/src/app/features/graph-runner apps/web/src/app/features/tool-registry apps/web/src/app/shell packages/contracts/src/graph-runner apps/api/src/modules/graph-runner` (`<base>` is the commit the worktree starts from) prints nothing; if it prints a commit, read it and check it against sections 3 and 4 before going on. `grep -m1 '^status:' plans/GRR-11.md` prints `status: done`. `grep -m1 '^status:' plans/GRR-12.md` prints `planned` or `done`; if `done`, step 5f applies. In the worktree: `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0, and `node_modules/ngx-vflow/package.json` shows version 2.7.0 (A1).

1. **Copies (C-12, C-13).** Add `RUNS_PATH`, `RUN_STOP_PATH`, `projectFilesPath`, `runStartCopy`, `stopCopy`, `nodeStatusDataCopy`, `runEndedDataCopy` and `fileListCopy` to `graph-runner-contract.ts`, with the type imports they need. Add K6, K7 and K8 to its spec (section 6). Expected: K6 to K8 pass in `npm test -w @bbartolome/scriba-web`.

2. **Rules (C-1, C-2, C-3).** Write `run-state.ts` and `run-state.spec.ts` (W3). The spec covers the scope, the dialog fields, the request and the folds without any library. Expected: W3 passes.

3. **Adapter and entry (C-6, C-11).** Add `draggable: signal(true)` to `vflowNodeOf`. Add the one-line `EntityPicker` re-export to `tool-registry.routes.ts`. Expected: no existing test changes its result.

4. **Dialog (C-5).** Write `run-dialog.ts`: the fields, the picker reuse, the datalist read through `projectFilesPath` (a GET with `{path: '.', recursive: 'true'}`), the Start and Cancel buttons, and the inputs and outputs of C-5. Expected: the file compiles in step 7.

5. **Page (C-2 to C-10), in this order.**
   (a) Inject `SSE_CLIENT` and `ActiveProjectSignal`. Add the signals `run`, `starting`, `dialog`, `currentGraphId`, and the counter `eventSeq`. Add the reads Subject and its pipeline (C-2).
   (b) Subscribe to `events.stream('graph-runner')`: increment `eventSeq`, then fold `node-status` and `run-ended` (C-2), and start a read on `run-started`. Subscribe to `events.reconcile$`: start a read. Start a read in `load()`.
   (c) Add `running`, `starting`, `editable` (C-3). Add the guards of C-4 to `onConnect`, `onMove`, `add`, `addTool`, `deleteSelected`, `onSettings`, `save` and to the connection validator. Add the effect that sets each vnode's `draggable` from `editable` (C-11).
   (d) Add the disabled bindings of C-4 to the controls and the `fieldset` around `app-tool-form`. Add `button[data-stop]`, `p[data-run-status]` and the Run binding of C-10.
   (e) Add the node additions of C-9 (badge, error, result, review link, Run to here) to the vnode template, for the recipe view only.
   (f) Dialog wiring: Run and Run to here open `app-run-dialog` with `dialogFieldsOf`; `start` posts through C-7; `cancel` closes. Stop posts through C-8.
   (g) If GRR-12 is on main (step 0): add `if (!this.editable()) return;` as the first statement of `onChipDrop` and `removeChip`, and `[cdkDragDisabled]="!editable()"` on each chip of its aside. Add a test R2 (section 6). Expected: no other change to GRR-12's code.
   Expected after step 7: `npm run build -w @bbartolome/scriba-web` passes.

6. **Page tests (T1 to T4, R).** Append to `canvas-page.spec.ts`. Each test answers the reads it needs (section 6). The setup of a test that does not use runs answers `GET RUN_CURRENT_PATH` with `{run: null}`; the page also tolerates an unanswered read (`catchError`). Run `npm test -w @bbartolome/scriba-web`. Expected: every test passes, including GRR-10 test 1 and GRR-11's T1 and T3, with their pass conditions unchanged.

7. **Lint, format, build.** `npx prettier --write` on the section 4 files; `npm run lint -w @bbartolome/scriba-web`; `npx prettier --check .` at the root; `npm run build -w @bbartolome/scriba-web`. Expected: each exits 0 and the budgets of `angular.json` hold. Record the chunk sizes and check that `canvas-page` stays out of the initial bundle. Record where the picker lands: the tool-registry entry now exports it, so it may move into a shared chunk; that is expected and not a failure.

8. **Root gates.** From the root: `npm run lint`, `npm test`, `npm run build`. Expected: each exits 0. A failure that main also has is recorded, not counted against this unit.

9. **Fresh clone.** Clone `unit/GRR-13` into an empty folder outside the repository; there `npm ci && npm run lint && npm test && npm run build`. Expected: each exits 0. Remove the folder afterwards.

10. **Commit.** One commit on `unit/GRR-13`: `feat(GRR-13): run controls, input-values dialog, live status and results, read-only while running`. Do not squash. Expected: `git log --oneline main..unit/GRR-13` prints that commit.

## 6. Acceptance criteria and tests

One test per criterion, named as the criterion's text (GRR-11 convention). The seam is the UI: the lazy canvas route rendered by `App` with the Shell fakes (D17). Command for all: `npm test -w @bbartolome/scriba-web`.

| Criterion (unit line) | Test | File and seam | Pass condition |
|---|---|---|---|
| 25: "Dialog tests (fakes): scope-aware fields for whole runs and Run to here, style default, target paths." | T1 | `canvas-page.spec.ts`; UI seam | Fixture graph `dialog-run`: input `chapter-notes` (text), input `people` (entity, `entityKind` `person`), input `look` (style), tool `cold-open` (`cold_open`, no params), output `draft` (`params.path` `drafts/ch02-opening.md`); wires `w1` `chapter-notes.out`→`cold-open.coreIdea`, `w2` `people.out`→`cold-open.person`, `w3` `look.out`→`cold-open.styleProfile`, `w4` `cold-open.output`→`draft.in`. Canned: active project `p1`; graph detail with `issues: []`; tools (`respondTools`); the entity list (`anna` person, `house-style` style-profile, both valid); `project.yaml` with `styleProfile: house-style`; the file list (one `drafts/ch01.md`); `GET RUN_CURRENT_PATH` `{run: null}`; the validate POST `{issues: []}`; the start POST `{runId: 'run-1'}`. (a) Whole run: `[data-run-field]` lists exactly `chapter-notes`, `people`, `look`, `draft`; `input[data-target]` of `draft` holds `drafts/ch02-opening.md`; the add select of `people` offers `anna` and not `house-style`. Type `Notes` into `chapter-notes`, add `anna`, press Start. The POST body has `inputs` `{chapter-notes: {kind:'text', text:'Notes'}, people: {kind:'entities', refs:['anna']}, look: {kind:'style', ref:'house-style'}}`, `targets` `{draft: 'drafts/ch02-opening.md'}` and no `target` key. (b) Run to here on `cold-open`: `[data-run-field]` lists exactly `chapter-notes`, `people`, `look` (no `draft`). Start: the POST body has `target` `{nodeId: 'cold-open'}`, the three `inputs` keys and no `targets` key |
| 26: "Badges follow fake `node-status` events and show the correct state after a reload mid-run (reconcile)." | T2 | `canvas-page.spec.ts`; UI seam; `FakeEventSource.push` and `reopen()` | (a) Reload mid-run: current run `run-1` running; nodes `chapter-notes` done, `cold-open` running, `draft` queued. Badges `[data-node="chapter-notes"] [data-status="done"]`, `[data-node="cold-open"] [data-status="running"]`, `[data-node="draft"] [data-status="queued"]`. (b) Push `node-status` for `cold-open`, done, with result `{output: {kind: 'draft', content: 'Opening text'}, sourcesUsed: ['anna']}`: badge `done`, `[data-result-text]` reads `Opening text`, `[data-sources]` contains `anna`. (c) Push `node-status` for `draft`, error, with an error of the contract's codes and message `The model did not answer.`: badge `error`, `[data-node-error]` reads that message. (d) Reload: a fresh render whose current run has `cold-open` done and `draft` running: both badges match. (e) Reconcile: the current run answers `draft` done, then `doubles.events.reopen()`: badge `done` |
| 27: "Stop posts and the canvas returns to editable after `run-ended`." | T3 | `canvas-page.spec.ts`; UI seam | (a) Current run `run-1` running, `cold-open` running. Before Stop: `button[data-stop]` present; Add, Save and Run disabled; `fieldset[disabled]` present in `[data-node="cold-open"]`. (b) Click `[data-stop]`: `postsTo(RUN_STOP_PATH)` has one body `{runId: 'run-1'}`. (c) The current run answers status `stopped`, reason `author`; push `run-ended` `{runId: 'run-1', status: 'stopped', reason: 'author'}`. After: `[data-stop]` absent; Add and Save enabled; Run enabled (no issues); no `fieldset[disabled]` |
| 28: "Output nodes show their pending-change link." | T4 | `canvas-page.spec.ts`; UI seam | Current run `run-1` done; `cold-open` done with a tool result; `draft` done with result `{pendingChangeId: 'pc-1', path: 'drafts/ch02-opening.md'}`. `[data-node="draft"] a[data-review-link]` has `href` `/projects/p1/review?run=run-1`; `[data-node="cold-open"]` has no `a[data-review-link]` |

Supporting checks (not criteria):
- **R** (`canvas-page.spec.ts`, UI seam): the read-only state. While running, a drop of a palette tool (`addTool`) and an Add change nothing: `postsTo(graphValidatePath())` and `postsTo(graphSavePath)` stay empty after the click. Covered by the pre-state of T3 for the disabled controls; R adds one click on a disabled Add and checks the file is unchanged.
- **R2** (only if GRR-12 is on main at step 5g): a chip drop with the run active leaves the file unchanged (no save POST). It uses GRR-12's `onChipDrop` path as its test seam (GRR-12 C-9).
- **W3** (`run-state.spec.ts`, pure): `scopeOfRecipe` gives the whole recipe with no target, and the target with its upstream otherwise (the output node's scope includes its feeder). `dialogFieldsOf` lists inputs and outputs in file order, with `entityKinds` from the wired port's field when it names kinds and from `entityKind` otherwise, and a style input with no kinds. `runRequestOf` omits `targets` for empty paths and includes `target` only for Run to here. `foldNodeStatus` changes only the node of the matching run id. `foldRunEnded` sets status and reason. `runOfGraph` returns undefined for another graph's run.
- **K6** (`graph-runner-contract.spec.ts`): `runStartCopy` accepts `{runId: 'r1'}` and refuses `{}` and an extra key; `stopCopy` accepts `{}` and refuses `{runId: 'r1'}`; `RUNS_PATH` and `RUN_STOP_PATH` equal the contract's constants.
- **K7**: `nodeStatusDataCopy` and `runEndedDataCopy` agree with `nodeStatusDataSchema` and `runEndedDataSchema` on a valid sample of each, and refuse a status outside the contract's lists and a missing `runId`.
- **K8**: `fileListCopy` agrees with `fileListSchema` on a sample of two entries, and refuses a `kind` of `link`; `projectFilesPath('p 1')` encodes the id.
- **Existing tests**: GRR-10 test 1, GRR-11 T1 and T3 keep their pass conditions. Their setups may gain `GET RUN_CURRENT_PATH` `{run: null}`; no assertion changes.

## 7. Agreement with the downstream and the parallel units

Downstream:
- **GRR-15 (no plan; blocked by GRR-11, GRR-12, GRR-13, GRR-14).** Its styling needs these hooks: `data-status`, `data-run`, `data-stop`, `data-run-to-here`, `data-run-status`, `data-run-dialog`, `data-run-field`, `data-target`, `data-start`, `data-result-text`, `data-sources`, `data-review-link`, `data-node-error`, and the classes `badge` and `run-reasons`. The theme styling is GRR-15's. Touch: nodes cannot be dragged while the run is active (C-11), so GRR-15's touch criterion (move a node) runs while idle. The dialog's chips are the picker's CDK chips, which GRR-15's touch check covers.
- **GRR-17 (no plan; the gate).** Its e2e (input values, run to done, pending change in the review queue) and its demo use C-5 to C-10 and PST-20's `?run=`. Demo step 3 maps to the datalist of C-14, the entity picker for two people, the style default and the target field. Step 4 maps to the badges and `[data-result-text]`; step 5 maps to `[data-review-link]`. The cited files wording of step 4 is open point 2.
- **PST-20 (done).** Consumes `?run=` unchanged.
- **GRR-04, GRR-05, GRR-06 (done).** No server change; the start, stop and current-run contracts are used as they are.

Parallel:
- **GRR-12 (planned, revision 2).** Both change `canvas-page.ts`, `canvas-page.spec.ts` and `graph-runner-contract.ts`. GRR-12 C-15 says that whichever merges second makes `onChipDrop` and `removeChip` obey the read-only state. This plan names it: `editable()` (C-3). The rule, correct in either order:
  - GRR-12 merged first: this unit's step 5g adds `if (!this.editable()) return;` as the first statement of `onChipDrop` and `removeChip`, adds `[cdkDragDisabled]="!editable()"` to the aside's chips, and adds test R2.
  - GRR-13 merged first: GRR-12's reviser writes the same first statement and attribute in GRR-12's plan (C-15 and step 3 of that plan), with the name `editable()`. GRR-12 alone allows no edit during a run, because no Run control exists before GRR-13 (GRR-12 C-15 says the same).
  - Merge text: both units add an `inject(ActiveProjectSignal)` and both append to `graph-runner-contract.ts`. The second merge keeps one injection and one copy of each name; the names do not collide (GRR-12's `entitiesPath` and `entityListCopy`; this unit's C-12 and C-13).
- **GRR-14 (no plan).** Both change `canvas-page.ts`. GRR-14 changes the story branch and Arrange; this unit changes the recipe branch only, and `editable` is always true for a story. Either order; the second merge rebases.
- **GRR-16 (done).** The dialog reads any input node of the sample; nothing changes there.
- **GRR-11 (done).** C-16 Run stays; its `[data-run]` gains the run-in-progress condition (C-4). Its `tool-nodes.ts` is not changed.
- **TRG-15 (planned).** It changes tool-registry files other than `tool-registry.routes.ts` (section 2.1), so the one-line re-export of C-6 does not conflict. Either order.

## 8. Open points

1. **The generated name in the dialog (unit line 19).** The unit says the output field defaults to `params.path` "or the generated name". This plan shows the field empty when `params.path` is unset, with a hint that the server names the file (C-5, D6). The simplest option cannot show the generated name: a browser copy of `generatedTarget` would use the browser's clock, not the server's start instant, so the shown name could differ from the file written; a server echo of the name would be a new field or route outside the module's HTTP list. The reviser decides whether the blank field and the hint meet unit line 19.
2. **"Cited files" (unit line 21; GRR-17 demo step 4).** `sourcesUsed` holds entity ids (`call.ts` lines 71 to 74; `entities.ts` line 8). C-9 shows the ids. Showing file paths or titles needs one entity lookup per id (`PROJECT_ENTITY_RESOLVE_ROUTE`, or the entity list the picker reads but does not share), which the unit does not name. The simplest option cannot decide whether ids meet "cited files" for the M4 demo; the reviser or the author decides.
