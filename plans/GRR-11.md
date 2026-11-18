---
id: GRR-11
status: draft
---
# GRR-11 plan — tool nodes from the registry, palette, input and output nodes, typed wires, live validation

Unit: `units/GRR-11-tool-nodes-wires.md` (module graph-runner, phase:canvas, M4). Base: main `89219dd`; the code and unit files read here are unchanged since `9181313`, the state the planner first read. The unit file has no notes section. Its one change is `bb76e4a` (line 19: the palette lists `enabled && valid`), and this plan follows the changed text. Revision 1, by the planner.

## 1. Decisions this plan follows

Settled by the unit, the module, DECISIONS or GRR-10 (obeyed):

- **Tool nodes are generated.** Input rows follow the descriptor's `inputs` order, then the `output` row; each row has one GRR-10 handle. Source: unit line 18; module line 22; `packages/contracts/src/tool-registry/views.ts` `portDescriptorSchema` (lines 41 to 46).
- **The tool-form in node-body layout** draws the non-port settings, bound to `params`. Source: unit line 18; `apps/web/src/app/features/tool-registry/tool-form.ts` line 505 (node-body keeps the fields with `!field.port`).
- **Palette and error state.** The palette lists tools with `enabled && valid`, one line each with its description. Disabled, unknown or invalid tools on an existing graph render an error state. Source: unit line 19 as changed by `bb76e4a`; DECISIONS "2026-11-14 — TRG-01 — the Navigator's decision on open point 2 (unreadable files), option A" (line 3409) and "2026-11-14 — TRG-01 — revision 5 draft and corrections of the unit effects (orchestrator)" (line 3470).
- **Input and output nodes.** Input: `text | entity | style`, a label, optional `entityKind`, one output `out`. Output: optional label and `path`, one input `in`. Source: unit line 20; `packages/contracts/src/graph-runner/graph.ts` lines 72 to 82; module line 45.
- **Output target.** `params.path` is the default target, then the generated name. So `path` is an optional field, and an empty field writes no key. Source: module line 45 (target precedence); unit GRR-13 line 19 ("default from `params.path` or the generated name").
- **Connection validator.** It refuses mismatched types, a second wire into an input and a wire into a pinned port; a refused connection emits no wire. Source: unit line 21; module line 42 (wire-type rejection stays client-side); GRR-03 unit line 20 (the same rules on the server).
- **Live validation.** A debounced call to the validate endpoint with the unsaved graph; the issues are listed, the node, wire or port is highlighted, and Run is disabled with the reasons while blocking errors exist. Source: unit line 22; module line 42; GRR-03 unit line 18 (the endpoint accepts an unsaved body and writes nothing).
- **Ports are re-derived when a graph loads.** Source: unit line 23.
- **Validation rules live on the server.** The browser repeats only the wire rules, which need the port descriptors. Source: module line 42.
- **No palette and no Run on a story graph.** Source: module line 39; GRR-14 unit line 20.
- **A tool node has no `params` until the author sets a value on the canvas.** Source: DECISIONS "2026-11-16 — GNP-04, GNP-07 — Navigator decisions: points 2 to 5 of GNP-04…" (point 5). Open point 2 depends on it.
- **Port keys and ids.** Input node `out`, output node `in`, tool `output`; a port id is `<nodeId>.<key>`; the graph id is the file stem. Source: module line 45; `graph.ts` line 22; GRR-10 S12.
- **A pinned value** is a key present in the node's `params`. Source: `apps/api/src/modules/graph-runner/graph-validation.ts` lines 350 and 351 (`Object.hasOwn`); GRR-03 unit line 20.
- **Port types.** An input node's out type is its `params.type`; an output node's in type is `text`; a tool's output type is `text` in v1; a tool's input type is its descriptor's `type`. Source: `graph-validation.ts` lines 282 to 303; `views.ts` lines 22 to 27 (`portOutputSchema`, literal `text`).
- **Test seams.** UI seam (Vitest, lazy route, Shell fakes) for criteria 1 and 3; canvas-gesture Playwright spec for criterion 2; unit tests never read `examples/`. Source: module lines 52, 53 and 55; GRR-10 S17.
- **Browser copies** are hand-written, import types only from the contract, and are checked by a spec. Source: GRR-10 S18; the header of `graph-runner-contract.ts`.
- **GRR-10 decisions kept:** the file is the state (C3); a position change writes only the file's `position` (C4); ids `<kind>-<n>`, `e<n>`, `w<n>` (C5); the node template and the handle template (C12, C13); `[view]="'auto'"` (C15); the issues panel (C9); no dirty tracking (C11). Source: `plans/GRR-10.md` section 1.2.

Choices made by this plan (names, layout and shapes the unit leaves open):

- **C-1 Files.** A pure module `tool-nodes.ts` with no library import holds the rules, so its spec runs without the library. `canvas-page.ts` keeps the page. No npm dependency is added.
- **C-2 Form import.** `ToolForm` comes from the tool-registry entry `tool-registry.routes.ts`, which already re-exports it (lines 8 to 12). Nothing else of tool-registry is imported (rule R1 of `eslint.config.mjs`).
- **C-3 Port rows are GRR-11's.** The tool-form gets no `ports` input, so its own port rows are empty (`tool-form.ts` line 512). The form draws only the settings. Reason: the form's rows show the type as text (lines 246 to 249) and cannot carry the colour, the icon or the chips the unit asks for. GRR-10 plan section 5(b) expected the form's handle input; that input stays unbound. TRG-03's node-body rows are left unused, not changed.
- **C-4 Port look.** Each row shows a glyph (`T` text, `E` entity, `S` style) with a `title` that names the type, and a class per type for the colour. Theme colours are GRR-15's.
- **C-5 Chips.** Each pinned value of a port is a read-only chip on its row (one chip per item of a list port). Removing a chip is GRR-12's.
- **C-6 Controls.** Input: a type select (`text`, `entity`, `style`) and, for `entity`, an entity-kind input (empty writes no key). Output: a path input (empty writes no key). The label rules of GRR-10 C6 stay.
- **C-7 Tool node.** Added from the palette as `{id: 'tool-<n>', kind: 'tool', tool, position}`, with no `params` key. Position `x = y = 40 * (node count + 1)`, as GRR-10 C6.
- **C-8 Tool states.** The list is read without `genrePack`, so every origin is listed (`apps/api/src/modules/tool-registry/catalog.service.ts` lines 189 to 196). A name's effective row is its `user` row when there is one, else its built-in row (the list holds both; `rowOf`, lines 417 to 426). States: `ready` (enabled and valid), `disabled`, `invalid`, `unknown` (no row, or the detail answers `TOOL_NOT_FOUND`, 404), `unavailable` (a read failed). Only `ready` tools have their detail read and draw port rows and the form. Each other state shows its line (`Disabled tool`, `Invalid tool`, `Unknown tool`, `Tool could not be read`) and draws no port rows. The server agrees: a tool that is not valid is unknown to the port checks (`graph-validation.ts` line 294).
- **C-9 Connection rules.** The validator is set on the recipe view only; the story view keeps the library's defaults. It refuses a connection when a handle is not a port of the ready descriptor, when the source and target types differ, when the target port already has a wire in the file, or when the target key is in its node's `params`. The library's defaults still refuse self connections and two handles of one type. A cycle is not refused on the client; the server reports it.
- **C-10 Live validation.** Each change of the file (add, delete, connect, a setting edit, a move that changes a position) schedules one POST of the whole unsaved file to `/api/graph-runner/graphs/validate` after 300 ms without another change; a later schedule cancels the earlier request. The response's issues replace the panel's list and the highlights. A failed validate keeps the previous list. Both views.
- **C-11 Highlights.** A node whose id is an issue's `nodeId` gets the class `issue`. A port circle whose id is an issue's `portId` gets the class `issue`. A recipe wire whose id is an issue's `edgeId` shows the issue's code as its edge label. ngx-vflow has no class input for edges (`edge.interface.d.ts`), so the label carries the wire's highlight. Each recipe edge's `edgeLabels` signal is set in place; edges are not rebuilt.
- **C-12 Nodes in another state** draw no handles, so their wires are not drawn (the library marks them detached, GRR-10 facts).
- **C-13 In-place edits.** A setting edit replaces that file node (`replaceNode`) and sets its vflow node's `data` signal. The `nodes` array is not rebuilt, so the form stays mounted. An add appends one vflow node, built by `vflowNodeOf`, which `vflowNodesOf` also uses.
- **C-14 Load.** The graph, the list and one detail per `ready` name are read before the canvas is set (`forkJoin`, each read caught). Adding a tool reads its detail first, then adds the node.
- **C-15 Copies.** `graph-runner-contract.ts` gets its own copies of the tool list (`toolListCopy`) and of a detail's `views` (`toolViewsCopy`), because `tool-copy.ts` is not an entry file. Both import types only.
- **C-16 Run.** Depends on open point 1.

## 2. Files to change

Only these paths change.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/graph-runner/tool-nodes.ts` | new | Pure functions, no library import: `toolStateOf(rows, name, read)` (C-8), `effectiveRowOf(rows, name)`, `paletteOf(rows)` (ready rows, one per name), `portTypeOf(file, portId, ports)` for a source or a target, `acceptsWire(file, connection, ports)` (boolean, C-9), `pinnedValuesOf(params, key)`, `typeGlyphOf(type)`. Types from `@bbartolome/scriba-contracts/tool-registry` and `/graph-runner`, type imports only |
| `apps/web/src/app/features/graph-runner/tool-nodes.spec.ts` | new | Supporting check W1: the refusal cases, the state and palette rules (section 4) |
| `apps/web/src/app/features/graph-runner/vflow-adapter.ts` | edit | `vflowNodeOf(node)` (used by `vflowNodesOf` and by add); `replaceNode(file, node)`; a recipe edge gets `edgeLabels: signal({})`; `labelWires(edges, issues)` sets each recipe edge's label to its first issue's code, or clears it |
| `apps/web/src/app/features/graph-runner/canvas-page.ts` | edit | Palette; tool nodes in state `ready` (port rows with glyph, classes and chips, the form in node-body layout bound to `params`) or in another state (its line); input type, entity-kind and output path controls; the recipe connection validator; live validation (a Subject, `debounceTime(300)`, `switchMap`); highlights; the load reads the list and the details; Run as open point 1 decides |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.ts` | edit | `TOOLS_PATH`; `toolPath(name)` and `graphValidatePath()`, both with `encodeURIComponent` where a name is used; `toolListCopy` (`ResponseSchema<ToolList>`); `toolViewsCopy` (`ResponseSchema<{views: ToolViews \| null}>`). Types only |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.spec.ts` | edit | Supporting checks K3 and K4 (section 4) |
| `apps/web/src/app/features/graph-runner/canvas-page.spec.ts` | edit | GRR-10 test 1: its setup gains the canned tool list and the two canned details its example uses (pass condition unchanged). New tests T1 and T3 |
| `e2e/specs/graph-wires.e2e.ts` | new | T2 (criterion 2) and the supporting check E2. Copies the helpers of `e2e/specs/graph-canvas.e2e.ts`, not an import (as TRG-14 does) |

Not changed: `apps/web/package.json`, `package-lock.json`, `apps/web/src/app/features/tool-registry/*`, `graph-runner.routes.ts`, `app.routes.ts`, `packages/contracts/**`, `apps/api/**`, `examples/`, `e2e/specs/graph-canvas.e2e.ts`, `units/`, `modules/`, and every plan except this one. Nothing is generated and committed.

## 3. Method

Run in a new worktree of `main`, not in the main checkout: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GRR-11 -b unit/GRR-11 main`. Record `node -v` and `npm -v` beside each result. Do not push, and do not start, stop or kill any process.

0. **Preconditions.** Expected: the worktree is created on a clean tree. `git log --oneline <base>..main -- apps/web/src/app/features/graph-runner apps/web/src/app/features/tool-registry e2e/specs packages/contracts/src/graph-runner packages/contracts/src/tool-registry apps/api/src/modules/graph-runner apps/api/src/modules/tool-registry` (`<base>` is the commit the worktree starts from) prints nothing. If it prints a commit, read it and check it against section 2 and section 5 before going on. `grep -m1 '^status:' plans/GRR-10.md` prints `status: done`. In the worktree, `npm ci`: the root `node_modules` of the main checkout has no `ngx-vflow`. Then `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.

1. **Rules (C-1, C-8, C-9).** Write `tool-nodes.ts` with the functions of section 2, and `tool-nodes.spec.ts` (W1, section 4). Expected: W1 passes in `npm test -w @bbartolome/scriba-web`.

2. **Adapter (C-13, C-11).** Edit `vflow-adapter.ts` as section 2 says. `vflowNodesOf` output keeps its shape. Expected: no test changes behaviour.

3. **Copies (C-15).** Edit `graph-runner-contract.ts` and add K3 and K4 to its spec (section 4). Expected: K3 and K4 pass.

4. **Page (C-2 to C-14, C-16).** Edit `canvas-page.ts` in this order: (a) the load: the graph, the list and the details, and the states; (b) the palette, for the recipe view only; (c) the tool-node template: the state line, the port rows (C-3, C-4, C-5), and the form in node-body layout (`[form]`, `[value]`, `(valueChange)`); (d) the controls (C-6, C-7); (e) the connection validator (C-9) through `[connection]`; (f) live validation and the highlights (C-10, C-11); (g) the in-place setting edits (C-13). Steps (h) Run and the form's `valueChange` handler (open point 2) wait for the Navigator's decision; the other steps do not. Expected: `npm run build -w @bbartolome/scriba-web` passes after step 6.

5. **Page tests (T1, T3).** Update GRR-10 test 1's setup: the canned tool list and details for `cold_open` and `mystery_question`, hand-written with the fields the page reads. Add T1 and T3 to `canvas-page.spec.ts`. Run `npm test -w @bbartolome/scriba-web`. Expected: every test passes, except that T1's save check and T3's Run assertions follow the decision of open points 1 and 2.

6. **Lint, format, build.** `npx prettier --write` on the section 2 files; `npm run lint -w @bbartolome/scriba-web`; `npx prettier --check .` at the root; `npm run build -w @bbartolome/scriba-web`. Expected: each exits 0 and the budgets of `angular.json` hold. Record the chunk sizes and the chunk of `canvas-page`. The page imports `tool-registry.routes`, which imports the tools-list page; record where that code lands (a shared chunk or the canvas chunk), and that `canvas-page` stays out of the initial bundle (A7).

7. **Gesture spec (T2, E2).** Write `e2e/specs/graph-wires.e2e.ts` on the pattern of `graph-canvas.e2e.ts`: each test seeds its own project folder (`project.yaml` with `genrePack: nonfiction`) and the graph file `graphs/tool-wires.json`, as canonical text (`JSON.stringify(graph, null, 2)` and a final newline), with this graph: `name` `Tool wires`, `view` `recipe`; nodes `chapter-notes` (input, text, label `Chapter notes`, at x 40 y 120), `people` (input, entity, entityKind `person`, label `Key people`, at x 40 y 300), `others` (input, entity, entityKind `person`, label `Others`, at x 40 y 480), `cold-open` (tool `cold_open`, no `params`, at x 400 y 120); edges `w1` from `people.out` to `cold-open.person`. It opens the canvas, checks with `hitsAtCentre` that each circle it drags is the element hit at its centre, makes its drags with `page.mouse` (down, moves in steps, up), clicks Save, waits for the POST response, and reads the file. Run `npm run e2e -w @bbartolome/scriba-e2e -- graph-wires`, with `SCRIBA_E2E_CHROMIUM` when the default lookup fails. Port 8080 is held by another process, and the e2e base URL is `http://127.0.0.1:8080`. If the run cannot start because the port is taken, stop at this step, keep the output, and report it. Do not stop the other process. Expected: T2 and E2 pass.

8. **Root gates.** From the root: `npm run lint`, `npm test` and `npm run build`. Expected: each exits 0. A failure that main also has is recorded, not counted against this unit (as GRR-10 step 14).

9. **Fresh clone.** Clone `unit/GRR-11` into an empty folder outside the repository; there `npm ci && npm run lint && npm test && npm run build`. Expected: each exits 0. Remove the folder afterwards.

10. **Commits, by path.** Part A (steps 1 to 6): `feat(GRR-11): tool nodes from the registry, palette, typed wires and live validation`. Part B (step 7): `test(GRR-11): canvas-gesture Playwright spec for wire refusal`. Do not squash.

## 4. Acceptance criteria and tests

One test per criterion. The test name is the criterion text, as written in the unit (lines 26 to 28). Nothing in this plan marks a criterion as passed.

| Criterion (unit line) | Test | File and seam | Command | Pass condition |
|---|---|---|---|---|
| 26: "Adding a tool from the palette renders its ports and settings form; editing settings updates `params`." | T1, named as the criterion | `canvas-page.spec.ts`. UI seam: the lazy route rendered by the App with the Shell's fakes; the POST body the fake records | `npm test -w @bbartolome/scriba-web` | The recipe `chapter-notes` (text input) and `draft` (output) is canned. The canned tool list holds `cold_open` (enabled, valid) and `old_tool` (disabled). After the click on `li[data-tool="cold_open"] button`, `[data-node="tool-1"]` exists with six `[data-port]` circles, `tool-1.coreIdea`, `tool-1.entityIds`, `tool-1.styleProfile`, `tool-1.person`, `tool-1.moment` and `tool-1.output`, and the form has `[data-key="length"]`. There is no `li[data-tool="old_tool"]`. Setting `length` to 500 and clicking Save posts one save whose body has `params.length` 500 on `tool-1`, and the `chapter-notes` node is unchanged. Under open point 2 the form's default write may add keys; the pass condition holds under every option that keeps `length` as typed |
| 27: "Drawing a text→entity wire is refused, and so is a second wire into the same input; neither changes the saved file (Playwright gesture spec)." | T2, named as the criterion | `e2e/specs/graph-wires.e2e.ts`. Gesture seam: desktop Playwright, the real API, the file on disk | `npm run e2e -w @bbartolome/scriba-e2e -- graph-wires` | The seeded recipe (step 7) has the input nodes `chapter-notes` (text), `people` and `others` (both entity, `entityKind` `person`), the tool `cold-open` (`cold_open`), and the wire `w1` from `people.out` to `cold-open.person`. Before each drag, `hitsAtCentre` is true for the two circles of that drag. Drag 1: `chapter-notes.out` to `cold-open.entityIds` (text to an entity list port). Drag 2: `others.out` to `cold-open.person` (a second wire into a wired input). After both drags Save returns 200, and the file's text equals the seeded text byte for byte |
| 28: "Issues from validate highlight the concerned element and disable Run with the reasons listed." | T3, named as the criterion | `canvas-page.spec.ts`. UI seam, with the fake answering the validate POST | `npm test -w @bbartolome/scriba-web` | The recipe is `chapter-notes` → `w1` → `cold-open.coreIdea`, and `cold-open` (`cold_open`). Adding an input node makes the page POST the file. The canned answer holds an error `required-port-unfed` on `cold-open` / `cold-open.person`, an error `port-type-mismatch` on `w1` (`edgeId`, `portId` `cold-open.coreIdea`) and a warning `dead-step` on `cold-open`. Then `[data-node="cold-open"]` and `[data-port="cold-open.person"]` have the class `issue`; the edge label of `w1` reads `port-type-mismatch`; the two error messages are listed; the Run button is disabled with those messages beside it. A second answer with the warning only enables Run. (Assumes open point 1, option A) |

Supporting checks (not criteria):

- **W1** (`tool-nodes.spec.ts`): `acceptsWire` refuses a text output to an entity input, a second wire into an input, a wire into a pinned key (`Object.hasOwn`), a missing port, and accepts an entity wire into an entity list input and an output node's `in` from a tool's text output. `toolStateOf` gives `disabled` for an enabled-false row, `invalid` for an invalid row, `unknown` for no row or a 404, and `ready` only for a valid enabled row; `paletteOf` lists each name once, the user row when both exist.
- **K3 and K4** (`graph-runner-contract.spec.ts`): the accepted and refused samples of `toolListCopy` and `toolViewsCopy` agree with `toolListSchema` and `toolDetailSchema` (`views` null or the three views), and `toolPath` and `graphValidatePath` build the routes.
- **E2** (`graph-wires.e2e.ts`): a drag from `people.out` to `cold-open.entityIds` (entity to entity list) is accepted; Save leaves `w1` and adds `w2` with `from` `people.out` and `to` `cold-open.entityIds`, and no other change.
- **Test 1 of GRR-10** keeps its pass condition; its setup change is the only edit.
- **Lint, format, build, root gates, fresh clone** (steps 6, 8, 9).

## 5. Downstream agreement and parallel plans

- **GRR-12 (blocked by GRR-11).** Needs from GRR-11: the port rows with `data-port` set to the full port id, the chip rows, `replaceNode`, and `tool-nodes.ts` (its drop rules reuse `portTypeOf` and the pinned rule). GRR-12 adds the drops and the removal; its pins go through the same `replaceNode`. The validator refuses a wire into a pinned port and GRR-12's drop refuses a chip on a wired port; both are client-side (module line 42).
- **GRR-13 (blocked by GRR-11).** Needs: the Run control and its reasons (open point 1); the latest validate issues; the input node's `params` (`type`, `label`, `entityKind`) and the output node's `params` (`label`, `path`), which GRR-11 writes in the contract's shapes. Read-only while running is GRR-13's and does not touch GRR-11's rows.
- **GRR-14 (unit parallel with GRR-11; no plan yet).** Both change `canvas-page.ts` and `vflow-adapter.ts`: GRR-11 changes the recipe part and labels recipe wires only; GRR-14 changes the story part and uses relation labels on story edges only. Whichever merges second rebases; the shared functions (`vflowNodeOf`, `vflowEdgesOf`, `labelOf`, `newNodeOf`) are GRR-10's and keep their names.
- **GRR-15 (blocked by GRR-11).** Touch drags use the same validator. The classes `issue`, the port glyph and the chips are interim; GRR-15 sets the theme styling.
- **GRR-16 (done).** Its sample recipe is read through the detail route. The page reads tool details for the sample's tools; nothing in GRR-16 changes.
- **GRR-17 (blocked by GRR-11).** Its demo steps (wire refused into a text port; the chip drop; Run) use GRR-11's palette and validator as built here.
- **GRR-10 (done).** Its plan section 5(b) said GRR-11 would hand the port-row template to the form's `handle` input. This plan does not (C-3); the template is used by GRR-11's own rows.
- **TRG-03 and TRG-05 (done).** Unchanged. TRG-03's node-body port rows are not used by the canvas (C-3). TRG-05 names GRR-11 as its unblock (`units/TRG-05-spike-gate.md` line 9).
- **TRG-14 (planned, branch `unit/TRG-14`).** It edits `tool-registry.routes.ts` (adds `canDeactivate` to the `''` route), `tool-copy.ts`, `tools-list.ts`, `apps/web/package.json` and `package-lock.json`. GRR-11 imports `ToolForm` from `tool-registry.routes.ts`, does not edit that file, adds no dependency and imports nothing from `tool-copy.ts`. Either merge order is correct only if TRG-14 keeps the re-export lines 8 to 12 of `tool-registry.routes.ts`. TRG-14's plan (line 66) says the file has one export, `toolsRoutes`; that is wrong for main and is the reviser's to fix in TRG-14.
- **GNP-20 (planned).** It adds the core tool `throughline_check` and a golden line. No file of section 2 is shared. Once merged the palette lists the new tool; no test here depends on the list's length.
- **SAU-22 (planned).** It changes the root `package.json` `dev` script and the API env and contract files. No file of section 2 is shared, and the two orders are correct.
- **CEX-02 (planned).** It reads the graph contract and changes compile-export files only (its file table, `plans/CEX-02.md` lines 76 to 83). No shared file.

## 6. Open points

1. **Run control (T3; unit criterion 28; GRR-13).** The unit requires Run to be disabled with the reasons while blocking errors exist, but Run, Run to here and Stop are GRR-13's (GRR-13 unit lines 7 and 18 to 20), and GRR-13 is blocked by GRR-11. Options: (A) GRR-11 adds a `Run` button, disabled while an error-severity issue exists, with those messages beside it; enabled otherwise, and it does nothing until GRR-13 wires it. (B) GRR-11 adds no button; the panel lists the reasons under the line "Run is disabled", and GRR-13 adds the button and its state. (C) GRR-11 adds a `Run` button that stays disabled until GRR-13 enables it. A and C satisfy criterion 28 as written; B does not. The plan's T3 assumes A. Step 4(h) waits for the decision.

2. **The tool-form writes defaults into `params` when a tool node renders (T1, T2, GRR-10 test 1; decision of 2026-11-16).** `tool-form.ts` lines 560 to 575 write each non-port field's default into its value when the key is absent, in `ngOnInit`. The write goes through the model's `set` (line 574), and an Angular model's `set` emits its change output (`@angular/core` 22.2.5, `createModelSignal`, `core.mjs` lines 175 to 190). So rendering `cold_open` emits `valueChange` with `length: 800` (`cold_open.yaml` line 28). If the page writes that value, the saved file gains a key the author did not set. Consequences: GRR-10 test 1 fails, because the example's `cold-open` node has no `length` key (`examples.ts`, recipe, lines 87 to 175), and so does T2's byte check. It also conflicts with the decision that a tool node has no `params` until the author sets them (DECISIONS 2026-11-16, point 5). Options: (A) the page takes `valueChange` only for the author's own edits. No file names a mechanism; the write is synchronous in the node's first change detection, so a DOM listener on the node sees the author's `input` event after the form's own handler has emitted. (B) the page writes what the form emits: the file gains the defaults on Save, and GRR-10 test 1 must change, which changes a GRR-10 criterion or the contract example. (C) `tool-form.ts`, a TRG-03 file, stops writing defaults in the node-body layout or takes an input for it; this edits the tool-registry feature, whose form the tool preview and the tool list use, and whose existing specs may depend on the write (not checked). The options differ in effect on GRR-10, on the 2026-11-16 decision and on TRG-03. Step 4(i) and the pass conditions of T1 and T2 wait for the decision.

3. **Note for the Navigator; no GRR-11 decision.** The contract's example recipe does not match the registry's tool specs. Its wires name ports the specs do not have (`mystery.text`, `cold-open.question`, `cold-open.people`, `cold-open.style`), and its params name keys the specs do not have (`words`, `voice`). The shipped specs have `cold_open` (inputs `coreIdea`, `entityIds`, `styleProfile`, `person`, `moment`, and `length` with default 800) and `mystery_question` (`coreIdea`, `entityIds`, `styleProfile`, `puzzle`, `surprisingFinding`). After GRR-11, opening the example draws those wires as detached and a live validation of an edited example lists `missing-port`. S16 of GRR-10 keeps `examples/` out of unit tests, and GRR-11 changes no example. Whose file this is (GRR-01 or GRR-16) is for the Navigator to name.

## 7. Facts checked and assumed

### 7.1 Checked

Unit and module:
- `units/GRR-11-tool-nodes-wires.md`: front matter line 7 (`blocked_by` GRR-03, GRR-10, TRG-05), line 9 (`unblocks` GRR-12, GRR-13, GRR-15, GRR-17), lines 18 to 23 (decisions), 26 to 28 (criteria). No notes section. `git show bb76e4a` changed line 19 only.
- `modules/graph-runner.md`: line 22 (GRR-11 in the graph), 39, 42, 45, 49, 52, 53, 55, 71.
- Unit files that name GRR-11: GRR-12 line 7, GRR-13 line 7, GRR-15 line 7, GRR-17 line 7; GRR-14 line 8 (`parallel_with`). TRG-05 line 9 (`unblocks`).
- `plans/QUEUE.md` line 4: GRR-11 "available now, all blockers done".
- Statuses: TRG-03, TRG-05, GRR-02, GRR-03, GRR-09, GRR-10 and GRR-16 are `done`. Plans with status `draft` or `planned` at this base: `CEX-02`, `GNP-20`, `SAU-22` and `TRG-14`, all `planned` at `89219dd` (`CEX-02` was a draft until `9181313`).

Web (main `89219dd`):
- `canvas-page.ts`: the template, the `[view]="'auto'"` binding (lines 192 to 200), the bare `svg:circle` (lines 216 to 223), `portRowsOf` (lines 70 to 81), `newNodeOf` (lines 98 to 119), the `connection` field (lines 277 to 278), the `load` and `save` methods.
- `vflow-adapter.ts`: `vflowNodesOf`, `vflowEdgesOf` (the recipe branch has no `edgeLabels`), `withPosition`, `withNode`, `withoutNodes`, `withoutEdges`, `withConnection`, `nextNodeId`, `nextEdgeId`.
- `graph-runner-contract.ts`: `validationResultCopy` (line 230), `graphDetailCopy` (line 283), `graphPath` and `graphSavePath`.
- `canvas-page.spec.ts`: test 1 at line 118; its setup (lines 121 to 132) registers the active project, the graph GET and the save POST only.
- `tool-form.ts`: `ToolFormLayout` (line 27), `ToolFormPortRow` (lines 30 to 37), the inputs `form`, `ports`, `layout`, `handle`, `value` (lines 483 to 494), `fields` filters node-body fields with `!field.port` (line 505), `portRows` empty when `ports` is null (lines 510 to 512), the node-body template (lines 243 to 264), `ngOnInit` defaults (lines 560 to 575), `this.value.set(current)` in `write` (line 678).
- `tool-registry.routes.ts`: the `toolsRoutes` export and `export { ToolForm, type ToolFormLayout, type ToolFormPortRow } from './tool-form'` (lines 8 to 12).
- `app.routes.ts` lines 149 to 152: the tool-registry routes load lazily.
- `e2e/specs/graph-canvas.e2e.ts`: helpers `openCanvas`, `centreOf`, `hitsAtCentre` (lines 1 to 80 read).
- `e2e/harness/global-setup.ts` line 80: `SCRIBA_PACKS_DIR` is `packages/packs`, so the e2e API loads the built-in packs.
- Root `node_modules` has no `ngx-vflow` (`ls -d node_modules/*vflow*` prints nothing); `@angular/core` in it is 22.2.5.

Contract and server:
- `packages/contracts/src/graph-runner/routes.ts` line 8 (`GRAPH_VALIDATE_ROUTE`); `graph.ts` line 22 (`portIdSchema`), lines 64 to 69 (`storyEdgeSchema`, `relation` optional), lines 72 to 76 (`inputParamsSchema`), lines 79 to 82 (`outputParamsSchema`), line 85 (`toolParamsSchema`), lines 88 to 108 (`recipeNodeSchema`, the tool node's `params` optional), lines 111 to 115 (`recipeWireSchema`); `issues.ts` lines 13 to 27; `constants.ts` lines 90 (the error codes) and 131 (`GRAPH_ISSUE_CODES`).
- `packages/contracts/src/tool-registry/constants.ts` line 26 (`PORT_TYPES`: `text`, `entity`, `style`); `views.ts` lines 22 to 27 (`portOutputSchema`, literal `text`) and lines 41 to 46 (`portDescriptorSchema`); `catalog.ts` lines 26 to 37 (`toolSummarySchema`, the comment on two rows per name at lines 22 to 25), lines 46 to 49 (`toolListSchema`), lines 52 to 59 (`toolDetailSchema`); `errors.ts` lines 39 to 40 (`TOOL_NOT_FOUND` is 404).
- `apps/api/src/modules/graph-runner/graphs.controller.ts` lines 55 to 59 (the validate POST, `@HttpCode(200)`).
- `graph-runner.service.ts` lines 187 to 191 (`validate`: the body goes through `splitIllegalKinds`, then `checkValue(rest, true)`, which throws `GRAPH_SCHEMA_INVALID` on a shape error, lines 262 to 275), and no genre filter.
- `graph-validation.ts`: lines 282 to 283 (input out type), 287 to 290 (output in type `text`), 293 to 294 (a tool that is not valid counts as unknown), 297 and 303 (tool output `text`, input type), 324 to 330 (`port-type-mismatch`), 334 to 340 (`multiple-wires-into-port`), 350 to 351 (`port-wired-and-pinned`, `Object.hasOwn`).
- `catalog.service.ts`: `list` (lines 189 to 196, `genrePack` optional, `offeredOrigins` at line 67), `detail` (lines 204 to 206), `detailOf` (lines 398 to 415: `views` null only for an invalid entry), `rowOf` (lines 417 to 426, a user copy names its built-in).
- `tools.controller.ts` line 65 (`@Get(TOOLS_ROUTE)`) and line 83 (`@Get(TOOL_ROUTE)`).
- `packages/packs/nonfiction/tools/cold_open.yaml`: ports `coreIdea`, `entityIds`, `styleProfile`, `person`, `moment`; non-port fields `length` (line 28, default 800) and `tone`; `enabled: true`, `output: draft`. `mystery_question.yaml`: ports `coreIdea`, `entityIds`, `styleProfile`, `puzzle`, `surprisingFinding`.
- `examples.ts`: the recipe (lines 87 to 175), its `cold-open` params `voice` and `words`, and its wires `w1` to `w5` as quoted in section 1 and open point 3.

Library (ngx-vflow 2.7.0, read in `scriba-prototype-wt/live/node_modules/ngx-vflow`, read only):
- `lib/vflow/interfaces/connection-settings.interface.d.ts`: `ConnectionValidatorFn` returns `boolean`; `ConnectionSettings.validator` is optional.
- `fesm2022/ngx-vflow.mjs` lines 111 to 124: the library's own validators (no self connection; strict type rule; source and target handles) run before the custom validator; line 2894: the `connect` output is filtered by the validator.
- `edge.interface.d.ts`: `Edge` has no class input; `edgeLabels` is a writable signal.

Other records:
- DECISIONS: line 3409 and line 3470 (palette `enabled && valid`); line 5144 (GNP-04 point 5, a tool node has no `params`); lines 5836 to 5843 (GRR-10 review approved, 102 tests pass, the fresh clone).
- GRR-10 plan section 1.3 records that `FakeApiClient` refuses an unregistered route with a plain `Error` (`test-doubles.ts` lines 90 to 93) and that the jsdom stubs are in `canvas-page.spec.ts`.

### 7.2 Assumed, not checked

- A1. jsdom renders the library's handle circles and the form under test 1 and T3, as GRR-10's test 1 does on the branch (the review record of 2026-11-18 shows 102 tests passing). The implementer's step 5 checks it.
- A2. The library creates handles added after a node is created, and measures a node whose form changes its size. T2 and step 5 check the first; the drags check the second.
- A3. The library keeps an edge's selection when the edge objects are kept (C-11 keeps them). Not checked.
- A4. `cold_open` is valid in the built-in pack as the e2e API loads it (its spec says `enabled: true`; validity was not run). T2 depends on it.
- A5. The number input of the form takes a typed value through `valueAsNumber` under jsdom (as `tool-form.spec.ts` relies on). Step 5 checks it.
- A6. A Save with an unchanged file writes the same bytes as the seed, for the seeded graphs of T2 and E2 (the seeds are in canonical text). Under open point 2 option B this fails by design.
- A7. The port 8080 that the e2e run needs is free when step 7 runs. It is held now, so step 7 may stop (section 3).
