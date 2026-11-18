---
id: GRR-12
status: draft
---
# GRR-12 plan — entity side list and chip drop onto entity and style ports

Unit: `units/GRR-12-entity-side-list-chips.md` (module graph-runner, phase:canvas, M4). Base: main `7568ec2`, working tree clean when this plan was written. Revision 1, by the planner (draft stage). The unit has no notes section. Its one recorded change is `098add9`, which set `parallel_with` and `unblocks` (`[GRR-08, GRR-13, GRR-14, GRR-16]` and `[GRR-15, GRR-17]`). Decisions and criteria are the same at every commit. The current front matter agrees with `units/GRR-15-touch-styling-perf.md` and `units/GRR-17-canvas-gate.md`, which both list GRR-12 in `blocked_by`.

## 2. Facts checked and facts assumed

### 2.1 Checked

Unit and module:
- CHECKED: `units/GRR-12-entity-side-list-chips.md`, front matter (blocked by GRR-11 and the Project store entity list PST-08; parallel with GRR-08, GRR-13, GRR-14, GRR-16; unblocks GRR-15, GRR-17) and its Why, Decisions and four criteria.
- CHECKED: `modules/graph-runner.md`, cross-cutting decisions "Validation in one place" (chip-drop checks stay client-side), "Ownership" (one lazy `Routes` array), "HTTP" (reads are GETs), and "Out of scope" (no Run and no palette on a story graph).
- CHECKED: `units/GRR-15-touch-styling-perf.md` (criterion 1: touch connect, move and chip drop in Playwright touch emulation; blocked by GRR-12) and `units/GRR-17-canvas-gate.md` (blocked by GRR-12; demo step 2 drops a claim chip on the myth-buster entity port).
- CHECKED: `units/GRR-13-run-controls-status.md`, `units/GRR-14-story-view-arrange.md`, `units/GRR-08-engine-gate.md`, `units/GRR-16-sample-recipe.md`: each lists GRR-12 in `parallel_with`. GRR-12 depends on none of them, directly or transitively.
- CHECKED: `units/README.md`, the blocker notation and the phase table. GRR-12 is in `phase:canvas`, which GRR-17 closes.

Prior units and status:
- CHECKED: `plans/GRR-11.md` has `status: done`. Its code is on main (commit `1bac3a2`, `feat(GRR-11)`; `090ab32`, criteria 26 to 28 passed). Commit `0bf1b28` set port rows to 40 px minimum height so that drop targets do not overlap.
- CHECKED: `plans/PST-08.md` has `status: done`. Its unit is `units/PST-08-entity-resolution.md`.
- CHECKED: `plans/GRR-08.md` and `plans/GRR-16.md` have `status: done`. `plans/GRR-10.md` has `status: done`.
- CHECKED: `plans/GRR-13.md`, `plans/GRR-14.md`, `plans/GRR-15.md`, `plans/GRR-17.md` do not exist. There is no plan for them yet.
- CHECKED: `grep -l -E "^status: *(draft|planned)" plans/*.md` returns only `plans/TRG-15.md`. Its section 2 changes tool-registry files (`tool-copy.ts`, `tools-list.ts`, `tool-editor.ts`, `tools-try.ts`, `tool-live-preview.ts`, and their specs) and one new e2e spec `e2e/specs/tools-live-preview.e2e.ts`. It changes no file of section 4 of this plan.

Contract and server:
- CHECKED: `packages/contracts/src/project-store/routes.ts` line 28, `PROJECT_ENTITIES_ROUTE` = `/api/project-store/projects/:projectId/entities`.
- CHECKED: `packages/contracts/src/project-store/entities.ts` lines 50 to 70 (the query at line 50, the response `entityListSchema` at lines 55 to 70). The list query takes an optional `type`. The response is `{entities: [{id, type, path, title?}], invalid: [{path, reason}]}`.
- CHECKED: `apps/api/src/modules/project-store/entities.controller.ts` (a GET, behind the guard) and `entities.service.ts`, `list()`. The service returns valid entities sorted by path, then the invalid files. It reads only and needs the project to be active.
- CHECKED: `apps/api/src/modules/project-store/entity-manifest.ts` lines 309 to 312. `title` comes from front matter `title`, else `name`.
- CHECKED: `packages/contracts/src/tool-registry/views.ts`. `portInputSchema` (lines 12 to 19) has no entity-kind field. `formFieldSchema` (line 66) has `entityKinds`. A port's entity-kind filter is on its matching form field (`field.port === true`, same key).
- CHECKED: `apps/api/src/modules/tool-registry/emit.ts` lines 71 and 72. `entityKinds` on a form field is copied from `x-scriba-entity-kinds`.
- CHECKED: `packages/packs/nonfiction/tools/cold_open.yaml`. Line 23: `styleProfile` is `x-scriba-type: style`. Line 39: `person` has `x-scriba-entity-kinds: [person]`. `entityIds` has no kinds.
- CHECKED: `packages/packs/nonfiction/tools/myth_buster.yaml` line 46: the entity port has `x-scriba-entity-kinds: [claim]`.
- CHECKED: `apps/api/src/modules/tool-registry/executor.service.ts` line 43, `STYLE_PROFILE_KIND = 'style-profile'`. Lines 135 to 147: a style ref takes only `style-profile`, and a field ref takes its `x-scriba-entity-kinds` only when that list is given (`kinds !== undefined`, line 140).
- CHECKED: `packages/contracts/src/project-store/project.ts` line 25: `project.yaml` `styleProfile` is an entity ref.
- CHECKED (not re-read here; taken from `plans/GRR-11.md` section 7.1): `graph-validation.ts` lines 350 and 351 (`port-wired-and-pinned`, `Object.hasOwn`). A pinned port is a key present in the tool node's `params`.
- CHECKED: `packages/contracts/src/graph-runner/graph.ts` line 85: `toolParamsSchema` is a record of unknown values. Lines 88 to 108: a tool node's `params` is optional, and it is `strictObject` otherwise.

Web code (`apps/web/src/app/features/graph-runner/`):
- CHECKED: `canvas-page.ts`, class `CanvasPage` at line 407. Port rows at line 321 (`@for (row of rowsOf(...))`), which hold the handle, `svg:circle [data-port]`, a glyph, the title and the read-only `span.chip` values (no remove control yet). Recipe-only palette at line 220 and recipe-only Run at line 285. `<vflow>` at line 294. Members: `connection` at line 510, `constructor()` at 530, `addTool` at 604, `deleteSelected` at 637, `save` at 659, `rowsOf` at 678, `onSettings` at 710 (writes the file node with `replaceNode`, sets the vflow node's `data` in place, and schedules validation), `validate` at 739, `load` at 758, `readTools` at 801.
- CHECKED: `canvas-page.ts` imports `ToolForm` from `../tool-registry/tool-registry.routes` (an entry file, allowed by ESLint R1), and `API_CLIENT`, `ApiError` from `../../shell`. It does not yet inject `ActiveProjectSignal`.
- CHECKED: `tool-nodes.ts` (GRR-11, no library import). `splitPort` line 91, `portTypeOf` line 103, `isPinned` line 133, `pinnedValuesOf` line 141, `acceptsWire` line 155, `portRowsOf` line 184, `formValueOf` line 241 (copies every key of `params`, port keys included, and adds the defaults of the non-port fields), `paramsAfterEdit` line 260 (keeps the port keys of the file), `blockingIssuesOf` line 280.
- CHECKED: `vflow-adapter.ts`. `portIdOf` line 20, `vflowNodeOf` line 31, `replaceNode(file, node)` line 72.
- CHECKED: `graph-runner-contract.ts`. It imports only types from the contracts. `pendingPath` line 67 is a hand-written copy of a project-store route. `toolListCopy` line 353 and `toolViewsCopy` line 409 are copies of tool-registry response schemas.
- CHECKED: `apps/web/src/app/features/tool-registry/project-store-copy.ts` line 118, `entityListCopy`, a copy of `entityListSchema` (it is not an entry file, so this feature cannot import it).
- CHECKED: `apps/web/src/app/shell/project-scope.ts` line 75, `ActiveProjectSignal`. `projectId` is the id of the current URL (`/projects/:projectId/...`), not the server's active project.
- CHECKED: `apps/web/src/app/features/graph-runner/graph-list-page.ts` injects `ActiveProjectSignal` (line 131), reads `this.activeProject.projectId()` (line 135), and calls `pendingPath(project)` for a project-scoped read (line 293).
- CHECKED: `eslint.config.mjs` lines 49 to 66 (R1): a web feature imports another only through its `*.routes.ts` entry. Lines 67 to 141: `agent-loop` and `graph-runner` never import each other.
- CHECKED: CDK drag and drop precedent. `apps/web/src/app/features/tool-registry/tools-preview.ts` lines 126 (`cdkDropListGroup`), 149 to 151 (`cdkDropList` slot with `[cdkDropListSortingDisabled]`), 154 to 156 (`cdkDrag`, `[cdkDragData]="{ id: chip.id, type: chip.type }"`, `[attr.data-chip]`). `entity-picker.ts` lines 154 (`cdkDropListEnterPredicate`), 330 (`admits`), 343 (`drop`: duplicate in a list is a no-op, a scalar drop replaces). `apps/web/package.json` line 12: `@angular/cdk` 22.2.7 is a direct dependency.

Tests and e2e:
- CHECKED: `apps/web/src/app/features/graph-runner/canvas-page.spec.ts`: three tests (test 1 at line 314, GRR-11's T1 at line 358, T3 at line 437). `COLD_OPEN_VIEWS` at line 151, whose `person` field (line 165) has no `entityKinds`. `respondTools()` at line 278. `postsTo()` at line 301. The fake API (`apps/web/src/app/shell/testing/test-doubles.ts`, `answer`, line 92) returns an error observable for an unregistered route, so an unanswered new GET fails softly and does not throw.
- CHECKED: `e2e/specs/graph-wires.e2e.ts` (GRR-11) is on main with the helpers `openCanvas` (seeds `project.yaml` and the graph, switches the project, opens the canvas), `centreOf`, `hitsAtCentre` (`hit.matches(selector)`), `drag` (`page.mouse` down, move in 10 steps, up), `saveAndStatus`, and the canonical `SEEDED` text.
- CHECKED: `e2e/playwright.config.ts` line 20 (baseURL `http://127.0.0.1:8080`) and line 24 (`SCRIBA_E2E_CHROMIUM`). `e2e/harness/global-setup.ts` line 15 (the API binds 8080). Root `package.json` line 30 (`e2e` runs `npm run e2e -w @bbartolome/scriba-e2e`).

DECISIONS.md (searched by grep for the ids, not read whole):
- CHECKED: entry "2026-11-15 — TRG-04 — Navigator decision: O7 … option (b), Angular CDK drag and drop" (line 4220). It names GRR-12 as the consumer of the same mechanism.
- CHECKED: entry "2026-11-15 — TRG-05 — Plan revision 3 … correction of the PLAN DOES NOT WORK cause" (line 4326). Its observation (line 4331) names GRR-12.
- CHECKED: entries "2026-11-16 — GNP-04, GNP-07 — Navigator decisions" (line 5144), point 5 (a tool node has no `params` until the author sets a value), and "2026-11-18 — GRR-11 — Navigator decisions 1 and 2" (line 5890), which keep GRR-11's C-16 (Run) and C-17 (form value).
- CHECKED: no DECISIONS entry names GRR-12 as its own unit. GRR-13, GRR-14, GRR-15 and GRR-17 appear only as downstream names in the two TRG entries above.

### 2.2 Assumed (each is checked by the step named)

- ASSUMED A1: CDK drop lists inside the ngx-vflow node template are found by the `cdkDropListGroup` wrapper of the page (Angular DI follows the declaration of the template, not the library's DOM). Checked by the Playwright test P1. If it fails, step 3 uses `cdkDropListConnectedTo` with the row ids, and the plan records it.
- ASSUMED A2: Angular's `DebugElement.triggerEventHandler('cdkDropListDropped', event)` reaches the output listener on a row inside the library's node template (the fixture's debug tree includes embedded views). Checked by V1. If it does not, the test takes the `CdkDropList` instance with `By.directive` and calls the same handler.
- ASSUMED A3: CDK emits `cdkDropListDropped` with `isPointerOverContainer` false (and a container with no `portId`) when a chip is released outside every drop list. The guard in the handler covers both cases, so this assumption does not change the rules.
- ASSUMED A4: CDK starts a drag from `page.mouse` down, moves in steps and up, as GRR-11's drag helper does for vflow handles. Checked by P1 to P3.
- ASSUMED A5: `cold_open` is enabled and valid in the built-in pack that the e2e API loads (`SCRIBA_PACKS_DIR` is `packages/packs`, per GRR-11 section 7.1). This is checked by GRR-11's gesture spec, which passed at `090ab32`. The tool node in P1 to P3 depends on it.
- ASSUMED A6: with the tool node at y 120 to 300 and the side list in the aside, the chip and its target row are both inside the 1280 by 800 viewport at the same time. Checked by `hitsAtCentre` in P1 to P3. If not, the test scrolls before each measure (as `centreOf` does), and the plan records it.
- ASSUMED A7: the `[data-drop-port]` row is wide enough that its centre lies on the row itself. The handle circle sits at the row's left edge, so the row centre is used as the drag target, not the circle.
- ASSUMED A8: port 8080 is held by another process now, as the task statement says. This plan did not check it and did not touch it. If it is still held when step 6 runs, the e2e stops there (see step 6).

## 3. Decisions this plan obeys

### 3.1 Settled by the unit, the module or DECISIONS (obeyed)

- **D1. Side list.** The project's entities, searchable, grouped by type, as draggable chips, with mouse and touch. Source: unit Decisions, bullet 1.
- **D2. Mechanism.** Angular CDK drag and drop, one mechanism for mouse and touch (pointer events). Native HTML drag and drop is ruled out. Source: DECISIONS 2026-11-15 TRG-04 O7 (line 4220), which names GRR-12.
- **D3. Pinning.** A drop onto an entity or style port pins the value in the tool node's `params`, after three checks: the port type matches, the port's entity-kind filter, and the port has no wire. Source: unit Decisions, bullet 2; module "Validation in one place" (chip-drop checks stay client-side); module "Design choices" (pinned port values in `params`).
- **D4. Refusal.** A refusal shows a short reason and leaves the file unchanged. Source: unit criterion 2; DECISIONS 2026-11-15 TRG-04 O7 ("a refused drop shows the one-line reason and leaves `value` unchanged").
- **D5. Removal.** A pinned chip can be removed from its port, and removal clears it from `params`. Source: unit Decisions, bullet 3; criterion 3.
- **D6. Two seams for the drop rules.** The drop handler's outcome on the saved graph (Vitest), and the rules as a real gesture (Playwright). Source: unit criterion 4.
- **D7. Kind filter comes from the form field.** The entity-kind filter of a port is the `entityKinds` of its form field (same key, `port: true`). The port descriptor has none. Source: `views.ts` lines 12 to 19 and line 66; `emit.ts` lines 71 and 72.
- **D8. Style ports.** A style port takes a `style-profile` entity, the kind the executor checks for a style reference. Source: `executor.service.ts` lines 43 and 136.
- **D9. Writing.** A pin or a removal writes through the same path as a settings edit: `replaceNode`, the vflow node's `data` set in place (so the form stays mounted), and one scheduled validation. Source: GRR-11 plan, C-10 and C-13 (`plans/GRR-11.md` section 1).
- **D10. Drop targets.** Only the input rows of ready tool nodes take chips. A tool node that is not ready has no rows and so no targets. Source: GRR-11 plan, C-12 and C-3 (`plans/GRR-11.md` section 1).
- **D11. Recipe only.** Story graphs have no palette, no side list and no Run. Source: module "Cross-cutting decisions" ("It never runs a story graph"); GRR-14 unit Decisions ("Story graphs never offer Run"); GRR-11 plan section 1 (no palette on a story graph).
- **D12. Module boundaries.** The feature imports no file of tool-registry or project-store except the entry routes. It keeps its own copies of the routes and response schemas, and imports only types from the contracts. Source: `eslint.config.mjs` R1; the header comment of `graph-runner-contract.ts`.
- **D13. Read-only HTTP.** The entity list is a GET and only reads. The project id is the one in the URL. Source: module "HTTP"; PST-08 unit Decisions (both are GETs); `entities.controller.ts`.
- **D14. No refusal while dragging.** A refusal reason is written only in the drop handler, never in an enter predicate, and the receiving state changes no size. Source: DECISIONS 2026-11-15 TRG-05, observation (line 4331): a reason line written at drag start reflows the lists, and CDK's cached rectangles go stale.
- **D15. Duplicate on a list port is a no-op.** Source: TRG-04 picker precedent (`entity-picker.ts` line 343, and O7 "appends with no duplicate ID").
- **D16. Scalar drop replaces.** Source: DECISIONS 2026-11-15 TRG-04 O7 ("replaces in scalar mode").
- **D17. Run and read-only are GRR-13's.** Source: unit GRR-13 Decisions ("the canvas is read-only while its recipe is running"); GRR-11 plan C-16 (Run is GRR-13's action).
- **D18. A tool node has no `params` until set.** A removal that leaves nothing removes the `params` key. Source: DECISIONS 2026-11-16 GNP-04 point 5; GRR-11 plan C-17.

### 3.2 Choices made here (names, layout, shapes the unit leaves open)

- **C-1. Files.** A pure module `entity-chips.ts` with no library import and no Angular import. It holds `groupEntitiesOf(entities, query)`, `chipDropRefusalOf(file, portId, chip, views)`, `pinnedParamsAfterDrop(params, port, chip)`, `pinnedParamsAfterRemoval(params, key, list, index)` and `isPortTarget(data)`. It reuses `splitPort`, `isPinned` and `pinnedValuesOf` from `tool-nodes.ts`, which is not changed. Its spec runs without the library.
- **C-2. Read.** `entitiesPath(projectId)` (the id encoded) and `entityListCopy` in `graph-runner-contract.ts`. `load()` reads the entity list in the same `forkJoin` as the tool reads, for a recipe only, with the project id from `ActiveProjectSignal.projectId()`. A failed read leaves the list unavailable. An empty id shows "No active project". The list is read once per graph load; it does not refresh while the canvas is open (the unit does not require it).
- **C-3. Side list.** An `aside` beside the canvas in the recipe view. A search input (`data-entity-search`) filters by id or title, case-insensitively, by substring. Groups are sorted by type, and entries keep the server's order. Each chip is a `span[cdkDrag]` with `[cdkDragData]="{id, type}"` and `data-entity`, inside a `div[cdkDropList][cdkDropListSortingDisabled]` slot, the same shape as `tools-preview.ts` lines 146 to 160. Valid entities only; `invalid` entries are not shown.
- **C-4. Drop mechanism.** One `div[cdkDropListGroup]` wraps the aside and the vflow, so every row and chip is connected. The drop targets are the input rows of ready tool nodes: `div.port-row[cdkDropList]` with `[cdkDropListData]="{portId}"` and `data-drop-port`. There is no `cdkDropListEnterPredicate`. The handler `onChipDrop(event)` acts only when `event.isPointerOverContainer` is true and `isPortTarget(event.container.data)`; any other drop does nothing. No CSS changes the size of `.cdk-drop-list-receiving` or the `.cdk-drag-*` classes.
- **C-5. Refusal order and texts.** The first failing check gives the reason: (1) a text port: "Text ports take no entities."; (2) a style port and a chip whose type is not `style-profile`: "Style ports take style profiles."; (3) a port already wired (an edge's `to` equals the port id): "This port is already wired."; (4) a form field with `entityKinds` that does not list the chip's type: "This port takes {kinds} entities." with the kinds joined by " or "; (5) a port the views do not give: "This port takes no entities.". A duplicate on a list port is a no-op (D15), with no reason.
- **C-6. Accepted drops.** A scalar port: `params[key] = chip.id` (D16). A list port: `[...pinnedValuesOf(params, key), chip.id]`, unless the chip id is already there (no-op). A `style-profile` chip on an entity port with no `entityKinds` is accepted, which mirrors the executor's check (it applies a kind check only when the field lists kinds). A pin creates `params` when the node has none.
- **C-7. Writing.** As D9: `replaceNode(file, next)`, `vflowNode.data.set(next)` on the matching vflow node, `scheduleValidation()`. A refusal sets the reason signal only; it writes nothing.
- **C-8. Removal.** Each pinned value is `span.chip[data-pinned=<portId>]` with a `button[data-remove]` (its `aria-label` is "Remove" followed by the value). A scalar port loses its key. A list port loses the item at the chip's index, and its key goes when the list is empty. A `params` object left empty is removed (D18). Then the write and validation are as C-7.
- **C-9. Drop seam in Vitest.** The test finds the row's debug element by `[data-drop-port]` and calls `triggerEventHandler('cdkDropListDropped', fake)`, where `fake = {item: {data: {id, type}}, container: {data: {portId}}, previousContainer: {data: undefined}, isPointerOverContainer: true}`. A fallback (A2) is named in 2.2.
- **C-10. Attribute names.** `data-entity`, `data-drop-port`, `data-pinned`, `data-remove`, `data-entity-search` and `data-drop-reason`. None is named `data-port`: GRR-11's T1 counts `[data-port^="tool-1."]` and expects six.
- **C-11. Reason placement.** `p[role=status][data-drop-reason]` sits inside the aside, outside the vflow. It is set only after a drop (D14).
- **C-12. Fixtures.** Vitest: the canned entity list holds `anna` (person), `claim-1` (claim) and `house-style` (style-profile), each with `path` and `title`, and `invalid: []`. The canned `person` field of `COLD_OPEN_VIEWS` gets `entityKinds: ['person']`, as the real server emits it (`cold_open.yaml` line 39). e2e: entity files `entities/anna.md`, `entities/claim-1.md` and `entities/house-style.md`, each with front matter `id`, `type` and `title`. Graph files are canonical text (`JSON.stringify(graph, null, 2)` and a final newline).
- **C-13. Gesture.** The drag helper of GRR-11 (`page.mouse` down, move in steps, up). The target is the centre of the `[data-drop-port]` row. `hitsAtCentre` for a row uses `hit.closest(selector)`, because the element at the centre is usually a child of the row. The chip is measured with `hit.matches`.
- **C-14. Counting the criteria.** Criteria 1 to 3 each have a Vitest test and a Playwright test, because criterion 4 requires both seams for the rules. Criterion 4 has no test of its own; it holds when the six named tests pass. The stricter reading is chosen, and it is recorded here so that the reviser can see it.

## 4. Files to change

Only these paths may be changed by the implementer. Nothing else changes, and the plan file is not changed by the implementer.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/graph-runner/entity-chips.ts` | new | Pure rules (C-1): `groupEntitiesOf`, `chipDropRefusalOf` (C-5), `pinnedParamsAfterDrop` (C-6), `pinnedParamsAfterRemoval` (C-8), `isPortTarget`. Types from the contracts only, type imports only |
| `apps/web/src/app/features/graph-runner/entity-chips.spec.ts` | new | Supporting check W2 (section 6) |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.ts` | edit | `entitiesPath(projectId)` (C-2) and `entityListCopy` (`ResponseSchema<EntityList>`), a copy of `entityListSchema`. Types only |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.spec.ts` | edit | Supporting check K5 (section 6) |
| `apps/web/src/app/features/graph-runner/canvas-page.ts` | edit | The entity read in `load()` (C-2); the group wrapper, the aside, the search and the groups (C-3, C-4); the drop targets on the input rows of ready tool nodes (C-4); `onChipDrop` (C-4 to C-7); the chips with `data-remove` and `removeChip` (C-8); the reason line (C-11) |
| `apps/web/src/app/features/graph-runner/canvas-page.spec.ts` | edit | `respondTools()` answers the entity list (C-12); `COLD_OPEN_VIEWS` `person` gets `entityKinds`. New tests V1, V2, V3. The pass conditions of test 1, T1 and T3 do not change |
| `e2e/specs/graph-chips.e2e.ts` | new | Tests P1, P2, P3 (section 6). Helpers copied from `graph-wires.e2e.ts`, not imported (as GRR-11 did) |

Not changed: `tool-nodes.ts` and its spec, `vflow-adapter.ts`, `graph-list-page.ts`, `graph-runner.routes.ts`, `app.routes.ts`, `apps/web/src/app/features/tool-registry/**`, `apps/web/src/app/features/project-store/**`, `apps/web/package.json`, `package-lock.json`, `packages/**`, `apps/api/**`, `examples/**`, `e2e/specs/graph-wires.e2e.ts`, `e2e/specs/graph-canvas.e2e.ts`, `units/**`, `modules/**`, `plans/**` other than this plan, and `plans/DECISIONS.md`. Nothing is generated and committed.

## 5. Procedure

Run from a new worktree of `main` (`git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GRR-12 -b unit/GRR-12 main`), not from the main checkout. Record `node -v` and `npm -v` beside each result. Do not push. Do not start, stop or kill any process, and do not touch port 8080.

0. **Preconditions.** Expected: the worktree is clean. `git log --oneline <base>..main -- apps/web/src/app/features/graph-runner apps/web/src/app/features/tool-registry e2e/specs packages/contracts/src/graph-runner packages/contracts/src/project-store apps/api/src/modules/graph-runner apps/api/src/modules/project-store` (`<base>` is the commit the worktree starts from) prints nothing. If it prints a commit, read it and check it against sections 3 and 4 before going on. `grep -m1 '^status:' plans/GRR-11.md` prints `status: done`. In the worktree: `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.

1. **Rules (C-1, C-5, C-6, C-8).** Write `entity-chips.ts` and `entity-chips.spec.ts` (W2). Expected: W2 passes in `npm test -w @bbartolome/scriba-web`.

2. **Copies (C-2).** Add `entitiesPath` and `entityListCopy` to `graph-runner-contract.ts`, and K5 to its spec. Expected: K5 passes, and `entitiesPath('p1')` equals `PROJECT_ENTITIES_ROUTE` with `:projectId` replaced.

3. **Page (C-2 to C-11), in this order.**
   (a) Inject `ActiveProjectSignal`. In `load()`, for a recipe graph, read the entity list in the same `forkJoin` as `readTools`, with `catchError` to `undefined`. Add the `entities` and `entityQuery` signals and the `entityGroups` computed.
   (b) Template: wrap the aside and the vflow in `div[cdkDropListGroup]`. In the recipe view only, the aside holds the search input, the groups, the chip slots and the chips (C-3). Add the reason line (C-11). Import `CdkDrag`, `CdkDropList`, `CdkDropListGroup` from `@angular/cdk/drag-drop`.
   (c) Drop targets: on the input rows of ready tool nodes only, add `cdkDropList`, `[cdkDropListData]="{portId}"`, `(cdkDropListDropped)="onChipDrop($event)"` and `data-drop-port` to the `div.port-row` (C-4). No enter predicate.
   (d) Handler `onChipDrop` (C-4 to C-7). Expected behaviour is C-5 and C-6, with the file written as C-7.
   (e) Pinned chips (C-8): each value becomes `span.chip[data-pinned]` with its `button[data-remove]`, which calls `removeChip(nodeId, key, index)`.
   (f) Spec: `respondTools()` answers the entity list (C-12); `COLD_OPEN_VIEWS` `person` gets `entityKinds: ['person']`. Add V1, V2 and V3 (section 6).
   Expected: `npm run build -w @bbartolome/scriba-web` passes after step 5.
   If A1 fails in step 6, use `cdkDropListConnectedTo` with the row ids (C-4), and record it in the plan.

4. **Web tests.** Run `npm test -w @bbartolome/scriba-web`. Expected: every test passes, including test 1, GRR-11's T1 and T3, W2, K5, V1, V2 and V3. If A2 fails, use the `By.directive` fallback (C-9) and record it.

5. **Lint, format, build.** `npx prettier --write` on the section 4 files that are web files; `npm run lint -w @bbartolome/scriba-web`; `npx prettier --check .` at the root; `npm run build -w @bbartolome/scriba-web`. Expected: each exits 0, and the budgets of `angular.json` hold. Record the chunk sizes, and check that `canvas-page` and `entity-chips` are not in the initial bundle.

6. **Gesture spec (P1, P2, P3).** Write `e2e/specs/graph-chips.e2e.ts` on the pattern of `graph-wires.e2e.ts`. Each test seeds its own library project: `project.yaml` (`genrePack: nonfiction`), the three entity files (C-12), and its graph file. P1 seeds `chapter-notes` (text input) and `cold-open` (tool `cold_open`, no `params`), with the tool at x 400, y 120. P2 seeds the same plus `people` (entity input, `entityKind` `person`) and the wire `w1` from `people.out` to `cold-open.person`. P3 seeds the tool with `params: {person: 'anna'}`. Run `npm run e2e -w @bbartolome/scriba-e2e -- graph-chips`, with `SCRIBA_E2E_CHROMIUM` when the default lookup fails. Expected: P1, P2 and P3 pass. If the run cannot start because port 8080 is taken, stop at this step, keep the output, and report it. Do not stop the other process.

7. **Root gates.** From the root: `npm run lint`, `npm test`, `npm run build`. Expected: each exits 0. A failure that main also has is recorded, not counted against this unit.

8. **Fresh clone.** Clone `unit/GRR-12` into an empty folder outside the repository. There: `npm ci && npm run lint && npm test && npm run build`. Expected: each exits 0. Remove the folder afterwards.

9. **Commits, by path.** Part A (steps 1 to 5, the files of section 4 except the e2e file), committed at the end of step 5: `feat(GRR-12): entity side list, chip drop onto entity and style ports, chip removal`. Part B (the e2e file of step 6), committed at the end of step 6: `test(GRR-12): canvas-gesture Playwright spec for chip drops and removal`. Steps 7 and 8 run on the committed branch. Do not squash. Expected: `git log --oneline main..unit/GRR-12` prints the two commits.

## 6. Acceptance criteria and tests

One test name per criterion, as the criterion text is written in the unit. Nothing in this plan marks a criterion as passed. Criteria 1 to 3 each have a Vitest test and a Playwright test (C-14).

| Criterion | Test | File and seam | Command | Pass condition |
|---|---|---|---|---|
| 1. "Dropping a matching chip pins it with no typing (saved `params` contain the reference)." | V1 | `canvas-page.spec.ts`. Vitest UI seam: the lazy route rendered by the App with the shell fakes; the drop handler called through the row's `cdkDropListDropped` (C-9); the Save POST body | `npm test -w @bbartolome/scriba-web` | The recipe is `chapter-notes` and the tool `cold-open` (`cold_open`, no `params`). Dropping `anna` on `[data-drop-port="cold-open.person"]` shows `[data-pinned="cold-open.person"]` with `anna`. Save posts a body whose `cold-open` node has `params` exactly `{person: 'anna'}`. Dropping `anna` on `cold-open.entityIds` then gives `entityIds: ['anna']`, and dropping it there again leaves that unchanged |
| 1. (gesture) | P1 | `e2e/specs/graph-chips.e2e.ts`. Gesture seam: desktop Playwright, mouse, the real API, the file on disk | `npm run e2e -w @bbartolome/scriba-e2e -- graph-chips` | A mouse drag from `[data-entity="anna"]` to the centre of `[data-drop-port="cold-open.person"]` (C-13). Save returns 200. The file's `cold-open` node has `params` exactly `{person: 'anna'}`, and every other node and wire is unchanged |
| 2. "Dropping on a text port, a port filtered to another kind, or a wired port is refused with a reason and the file is unchanged." | V2 | `canvas-page.spec.ts`, Vitest UI seam as V1 | same | Two renders with fresh fakes. (a) Wired graph (`people` to `cold-open.person`): `anna` on `cold-open.coreIdea` shows "Text ports take no entities."; `anna` on `cold-open.styleProfile` shows "Style ports take style profiles."; `claim-1` on `cold-open.person` shows "This port is already wired.". (b) Unwired graph: `claim-1` on `cold-open.person` shows "This port takes person entities.". In each case `[data-drop-reason]` holds the reason, and Save posts a body deep-equal to the seeded graph |
| 2. (gesture) | P2 | `e2e/specs/graph-chips.e2e.ts`, gesture seam as P1 | same | A drag of `anna` to the centre of `[data-drop-port="cold-open.coreIdea"]` shows the reason "Text ports take no entities.". A drag of `claim-1` to the centre of `[data-drop-port="cold-open.person"]` shows "This port is already wired.". Save returns 200, and the file's text equals the seeded text byte for byte |
| 3. "Removing a pinned chip clears it from `params`." | V3 | `canvas-page.spec.ts`, Vitest UI seam | same | (a) The tool `cold-open` with `params: {person: 'anna', entityIds: ['anna', 'claim-1'], length: 500}`: clicking `[data-pinned="cold-open.person"] [data-remove]` and saving gives `{entityIds: ['anna', 'claim-1'], length: 500}`. Removing `entityIds` index 0 twice gives `{length: 500}`. (b) With `params: {person: 'anna'}` only, removing it leaves no `params` key |
| 3. (gesture) | P3 | `e2e/specs/graph-chips.e2e.ts`, gesture seam as P1 | same | Seeded with `params: {person: 'anna'}`. A click on `[data-pinned="cold-open.person"] [data-remove]` (C-13 for the centre), then Save returns 200. The file's `cold-open` node has no `params` key |
| 4. "Drop rules are tested as the drop handler's observable outcome on the saved graph (Vitest) and as a real gesture (Playwright)." | none of its own | holds when V1 to V3 (the Vitest seam) and P1 to P3 (the gesture seam) pass | as above | Both sets pass in the same run (C-14) |

Supporting checks (not criteria):
- **W2** (`entity-chips.spec.ts`): `groupEntitiesOf` filters by id or title (case-insensitive) and groups by type, sorted. `chipDropRefusalOf` gives each of the five reasons of C-5 in its order, and `undefined` for an accepted drop. `pinnedParamsAfterDrop` replaces a scalar value and appends to a list, without a duplicate. `pinnedParamsAfterRemoval` removes a scalar key, removes one list item, drops an empty list key, and returns `undefined` when nothing is left.
- **K5** (`graph-runner-contract.spec.ts`): `entityListCopy` agrees with `entityListSchema` on each sample (valid, extra key, missing `invalid`), and `entitiesPath` equals `PROJECT_ENTITIES_ROUTE` with the id encoded.
- **Existing tests**: test 1 (GRR-10), T1 and T3 (GRR-11) keep their pass conditions. Their setup gains the entity list and `entityKinds`; no assertion changes.
- **Lint, format, build, root gates, fresh clone** (steps 5, 7 and 8).

## 7. Agreement with the downstream and the parallel units

Downstream:
- **GRR-15 (blocked by GRR-12; touch, styling, large graphs).** GRR-15 criterion 1 is the touch check: connect, move and chip drop in Playwright's touch emulation. GRR-12 provides the mechanism that covers touch (CDK pointer events, D2) and the hooks GRR-15 needs: `data-entity`, `data-drop-port`, `data-pinned`, `data-remove`, `.chip`, `.port-row`. GRR-12 adds no theme token and no visual styling; GRR-15 owns both. D14 (no reflow during a drag) is a condition GRR-15 must keep when it restyles.
- **GRR-17 (blocked by GRR-12; canvas gate).** Demo step 2 drops a claim chip on the myth-buster's entity port. That port has `x-scriba-entity-kinds: [claim]` (`myth_buster.yaml` line 46), so the rule of C-5 (4) accepts it. GRR-17's first criterion requires "only mouse gestures", which P1 covers. GRR-17 adds no GRR-12 change. GRR-17's e2e extension is its own.
- **unblocks.** GRR-12's `unblocks` (GRR-15, GRR-17) match their `blocked_by`.

Parallel:
- **GRR-08 (engine gate, done).** It is in `parallel_with` and has no shared file. Its gate closed on main.
- **GRR-16 (sample recipe, done).** No shared file. If the sample pins a value on a tool port, that value shows as a chip after GRR-12 (the pinned chips of GRR-11 already did).
- **GRR-13 (run controls, no plan).** Both change `canvas-page.ts`, `canvas-page.spec.ts` and `graph-runner-contract.ts`. GRR-13 adds the run click, the input-values dialog, and the read-only state while a run is active. Agreement: while a recipe runs, chip drops and chip removal are refused the same way the other edits are. Whichever of the two merges second adds that guard to the handlers `onChipDrop` and `removeChip` (and the earlier ones) and gives it a test. The name and the trigger of the read-only state belong to GRR-13 (open point 1).
- **GRR-14 (story view and Arrange, no plan).** Both change `canvas-page.ts`. GRR-12 changes only the recipe branch (the aside under `!isStory()`, and drop targets on the input rows of tool nodes, which a story graph never has). GRR-14 changes only the story branch and Arrange. Either merge order is correct; the second one rebases.
- **TRG-15 (draft, another module).** It changes tool-registry files only, and none of section 4 of this plan. Either order is correct.

Upstream facts that this plan relies on (all done): PST-08 (the list route and its shape), GRR-11 (`replaceNode`, the port rows, the pinned-chip rendering, `formValueOf` and `paramsAfterEdit`, which keep the port keys of the file), TRG-04 (the chip payload `{id, type}` and its duplicate and replace rules), TRG-05 (its drag-start observation, D14).

## 8. Open points

1. **Who owns the read-only state while a run is active (GRR-13), and when it lands.** GRR-13 says the canvas is read-only while its recipe runs, and it has no plan yet. The simplest option for GRR-12 is to add no guard, and to agree (section 7) that whichever of GRR-12 and GRR-13 merges second adds the guard to every change handler. That is not enough to decide. The state's name, its trigger, and which handlers it covers are GRR-13's shape, and they cannot be set here without writing GRR-13's plan. The reviser (or the GRR-13 planner) must confirm the rule and the merge order, because a merge of GRR-12 alone would let a chip change the file during a run, which the unit's read-only rule forbids.
2. **How much of "works with mouse and touch" GRR-12 must prove.** The unit's Decisions say chips work with mouse and touch. Its four criteria name no touch check. This plan's Playwright tests are desktop mouse gestures (C-13), and GRR-15 criterion 1 is the only touch check in the unit set. The simplest option, which this plan takes, is to rely on CDK's pointer events and to test with the mouse here. That leaves the Decisions' touch claim unverified until GRR-15. Whether GRR-12 gets its own touch-emulation drag (one more Playwright test) changes the unit's test scope, so the reviser must decide it.

Points that the simplest option does decide, recorded for review and not left open: a style-profile chip on an entity port with no kinds is accepted (it mirrors the server, C-6); a duplicate on a list port is a no-op with no reason (D15); a removal that leaves nothing removes the `params` key (D18); the side list reads once per load and does not refresh (C-2); invalid entities are not shown (C-3); criterion 4 is read as needing both seams for the rules (C-14).
