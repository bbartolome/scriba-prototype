---
id: GRR-14
status: draft
---
# GRR-14 plan — story view pickers (relation, file, missing-file badge, Open file) and Arrange

Unit: `units/GRR-14-story-view-arrange.md` (module graph-runner, phase:canvas, M4). Base: main `4962762`. GRR-10 (`d006352`, `2bf5586`, `c9d875f`) and GRR-11 (`1bac3a2`, `0bf1b28`) are on main, so GRR-14 is unblocked (`plans/QUEUE.md` line 6). Revision 1, by the planner (draft stage, 2026-11-18). Nothing outside `plans/GRR-14.md` is changed.

## 1. Front matter and scope

- `id: GRR-14`, `status: draft` (this block).
- The unit file has no notes section. Its git history: `2fed3f4` (consolidation) and `098add9` (changed `parallel_with` and `unblocks`). The text read here is the one after `098add9`.
- The four criteria of the unit are the scope. Recipe Arrange is in scope because the unit's Decisions say recipes are arranged by topological depth.

## 2. Facts checked and facts assumed

### 2.1 Checked

Unit, module and conventions:
- CHECKED: `units/GRR-14-story-view-arrange.md` front matter lines 2 to 9 (`blocked_by: [GRR-10]`, `parallel_with: [GRR-08, GRR-09, GRR-11, GRR-12, GRR-13, GRR-16]`, `unblocks: [GRR-15, GRR-17]`); Why line 15; Decisions lines 18 to 21 (story nodes and file picker line 18, relation picker line 19, no Run line 20, Arrange line 21); criteria lines 24 to 27 (four criteria, no parenthetical, so the default seam applies).
- CHECKED: `units/README.md` line 119 (phase:canvas: GRR-09 to GRR-17, gate GRR-17), lines 63 to 65 (blocker notation), line 139 (testing: UI seam is the lazy route with the Shell's fakes).
- CHECKED: `modules/graph-runner.md` lines 3 (canvas), 7 (ordering), 39 (never runs a story graph), 40 (graph files through the Project store), 41 (HTTP), 42 (validation in one place), 45 (port keys and graph id), 49 to 55 (testing seams; unit tests never read `examples/`), 66 (Arrange is the only auto-layout), 71 (graph JSON is the contract).
- CHECKED: `plans/PLT-02.md` (plan structure); `plans/GRR-10.md` (done; decisions S1 to S22 and C1 to C16, and its section 5 that names GRR-14); `plans/GRR-11.md` (done; C-1 to C-17, section 5 names GRR-14).
- CHECKED: `plans/DECISIONS.md`, searched with grep for GRR-14, GRR-10, GRR-12, GRR-13 and GRR-17. No entry names GRR-14. GRR-11 records at lines 5882 to 5896 (decisions C-16 and C-17) and 5924 to 5961 (implementer and review).

Parallel and downstream units:
- CHECKED: `units/GRR-15-touch-styling-perf.md` line 7 (`blocked_by` includes GRR-14). `units/GRR-17-canvas-gate.md` line 7 (`blocked_by` includes GRR-14), criteria lines 21 to 24, demo step 6 (line 34: two scene nodes on `drafts/` files, a beat, `order` and `containment` edges, "Run isn't offered").
- CHECKED: parallel symmetry. GRR-08 line 8, GRR-09 line 8, GRR-11 line 8, GRR-12 line 8, GRR-13 line 8 and GRR-16 line 8 list GRR-14 in `parallel_with`; GRR-10 does not (correct, GRR-14 depends on it).
- CHECKED: `plans/GRR-12.md` front matter reads `status: draft` at the time of reading (an earlier grep showed `planned`; another agent is revising it). Its section 4 changes `canvas-page.ts`, `canvas-page.spec.ts` and `graph-runner-contract.ts`; its section 7 (GRR-14 paragraph) says the recipe branch and the vflow wrapper belong to GRR-12 and the story branch and Arrange to GRR-14.
- CHECKED: `plans/GRR-13.md` front matter reads `status: draft`. Its C-12 and C-13 add `projectFilesPath` and `fileListCopy` to `graph-runner-contract.ts` (the same names as this plan's C-13). Its step 5h and test R3 make Arrange on a recipe read-only during a run (its D20). Being revised by another agent; this plan reads the text as it is now.
- CHECKED: `plans/TRG-15.md` is `status: planned`; no line of it names graph-runner files (grep).
- CHECKED: `plans/PST-34.md` is `status: done`; line 152 says `?path=` links (GRR-14 among them) still open the file.

Contract (`packages/contracts/src/graph-runner/`):
- CHECKED: `graph.ts` lines 33 to 38 (story node `path`: entity nodes into `entities/`, scene and beat nodes into `drafts/`, several nodes may share a file, no `path` means label-only; the schema does not check the folders, the validator does); lines 39 to 61 (`storyNodeSchema`, strict, `label` required, `path` optional); lines 63 to 69 (`storyEdgeSchema`: `relation` optional, `min(1)` when present); lines 117 to 124 (`storyGraphShapeSchema`); lines 183 to 186 (`graphFileSchema`, unique ids).
- CHECKED: `constants.ts` lines 33 to 41 (`RELATION_VOCABULARY`: `order` "from precedes to", `causality` "from causes to", `containment` "from contains to"; any other non-empty string is allowed); lines 107 to 128 (`GRAPH_WARNING_ISSUE_CODES`, `path-missing` at line 113 = "a story `path` that does not exist").
- CHECKED: `examples.ts` lines 68 to 77 (story edges with `order` and `containment`). The browser does not read it; unit tests do not read the repository's `examples/` (module line 55).

Project store (file listing and open):
- CHECKED: `packages/contracts/src/project-store/files.ts` line 9 (`fileReferenceSchema` is `z.string()`), `fileEntrySchema` (`path`, `kind` `file` or `dir`, `size`, `mtime` ISO UTC with Z), `fileListQuerySchema` (`path`, `recursive` as `stringbool`), `fileListSchema` (`entries`).
- CHECKED: `packages/contracts/src/project-store/routes.ts` lines 14 to 15 (`PROJECT_FILES_ROUTE` = `/api/project-store/projects/:projectId/files`).
- CHECKED: `apps/api/src/modules/project-store/files.controller.ts` lines 43 to 49 (GET list with the query schema); `files.service.ts` lines 232 to 254 (`list`), lines 238 to 239 (a missing folder answers 404, `NOT_FOUND`), line 568 (`collect` skips every name that starts with `.`, so `.versions` is never listed, also in recursion).
- CHECKED: `apps/web/src/app/features/project-store/files-page.ts` lines 456 to 458 (the page reads `?path=` from `queryParamMap`), line 218 (`[queryParams]="{ path: row.path }"`). `project-store.routes.ts` lines 16 to 26 (`filesRoutes`, the files page lazy-loaded). `apps/web/src/app/app.routes.ts` lines 26 to 37 (`files` under `projects/:projectId`, line 85).
- CHECKED: `apps/web/src/app/features/project-store/files-contract.ts` lines 1 to 9 (the copy pattern: hand-written copies, type imports only, the files page's copy is not importable from graph-runner under rule R1) and lines 53 to 72 (`fileListCopy` in that file, the copy this plan mirrors).

Server, story issues:
- CHECKED: `apps/api/src/modules/graph-runner/graph-validation.ts` lines 121 to 124 (`path-missing` message), lines 455 to 471 (`storyIssues`: `path-missing`, `path-unsafe`, `path-in-versions` and `entity-path-outside-entities` each carry `nodeId`; `path-missing` at line 464).
- CHECKED: `graph-validator.service.ts` line 68 (story graphs use `storyIssues`). `graph-runner.service.ts` lines 111 to 114 (`get` returns `{graph, issues}`, so `path-missing` is on the load), lines 187 to 193 (`validate` returns the issues of the unsaved body). No server change is needed.

Web (main):
- CHECKED: `apps/web/src/app/features/graph-runner/canvas-page.ts`: `STORY_KINDS` line 85; `VALIDATE_DELAY_MS` line 92; `labelOf` lines 119 to 130 (story label is `node.label`); `newNodeOf` lines 133 to 163 (story branch lines 141 to 143: `{id, kind, label, position}`, no `path`); the palette lines 220 to 231 (`!isStory()`); the controls lines 232 to 293 (Save line 284; Run only under `!isStory()`, lines 285 to 292); `<vflow>` lines 294 to 303 with `[view]="'auto'"` (line 295); the nodeHtml template lines 304 to 362 (story handles lines 314 to 317, no `data-port`); styles lines 366 to 405 (`.vnode` `min-width` 160 px, line 375); `connection` computed lines 510 to 522 (story: `{}`); `onConnect` 551 to 558 (story edge without `relation`); `onMove` 561 to 571; `add` 581 to 598; `deleteSelected` 637 to 656; `save` 659 to 675; `onSettings` 710 to 725; `scheduleValidation` 734 to 736; `validate` 739 to 745; `setIssues` 748 to 751; `rebuildEdges` 753 to 756; `load` 758 to 795; `readTools` 801 to 833.
- CHECKED: `vflow-adapter.ts`: `vflowNodeOf` 31 to 38 (`point` and `data` are signals), `vflowNodesOf` 41, `vflowEdgesOf` 46 to 69 (story edge gets `edgeLabels` only when `relation` is set, lines 57 to 68), `replaceNode` 72 to 79, `labelWires` 85 to 98 (recipe wires only), `withPosition` 104 to 124, `withNode` 127, `withoutNodes` 132, `withoutEdges` 158, `withConnection` 173 to 193, `nextNodeId` 196, `nextEdgeId` 202.
- CHECKED: `graph-runner.routes.ts` lines 14 to 20 (the `:graphId` child, `canMatch: [deviceClassGuard('tablet')]`).
- CHECKED: `graph-runner-contract.ts` exports: `TOOLS_PATH` line 59, `toolPath` 62, `graphPath` 34, `graphSavePath` 39, `graphValidatePath` 54, `graphDetailCopy` 300, `validationResultCopy` 247, `toolListCopy` 353, `toolViewsCopy` 409 (all type-only copies; the header comment at lines 20 to 22 says so).
- CHECKED: `apps/web/src/app/shell/index.ts` line 11 exports `ActiveProjectSignal`. `shell/project-scope.ts` lines 66 (`projectTarget`, NOT exported from the Shell's index) and 75 to 90 (`ActiveProjectSignal.projectId`, the id of the URL). The files page takes its id from `ActiveProjectSignal`.
- CHECKED: `apps/web/src/app/shell/api-client.ts` lines 13 to 30 (`ApiPath`, `ResponseSchema`, `get<T>(path, schema, params?)`).
- CHECKED: `apps/web/src/app/shell/testing/test-doubles.ts` lines 43 to 100 (`FakeApiClient` records every request with `params` when given; canned answers by method and path only, so params do not select an answer; an unregistered route throws a plain `Error`, lines 90 to 93).
- CHECKED: `apps/web/src/app/features/graph-runner/canvas-page.spec.ts`: stubs lines 27 to 75; `render` lines 83 to 97; `until` 99 to 106; `buttonNamed` 109 to 116; `respondTools` 278 to 299; `postsTo` 301 to 306; test 1 (byte-equivalence) at line 314; T1 at 358; T3 at 437; line 510 asserts `root.querySelector('vflow')?.textContent` contains an edge label (GRR-11 T3, a recipe edge label rendered in jsdom).
- CHECKED: `apps/web/package.json` line 33 (`ngx-vflow` `2.7.0`, exact). `graph-runner-contract.spec.ts` and `tool-nodes.spec.ts` exist (the spec patterns).
- CHECKED: `e2e/specs/graph-canvas.e2e.ts` lines 35 to 100 (helpers `openCanvas`, `centreOf`, `hitsAtCentre`, `drag`, `saveAndStatus`). Not used by this plan's tests.

Environment:
- CHECKED: the root `node_modules` exists (376 entries) and has no `ngx-vflow` (`ls node_modules/ngx-vflow` fails). The implementer runs `npm ci` first (as GRR-11 step 0 did).
- STATED BY THE TASK (not checked by this planner): port 8080 is held by another process. This plan runs no e2e test, so it is not needed here; step 7 of section 5 is the only e2e step, and it stops if the port is still held.

### 2.2 Assumed (each is checked at the step named)

- A1. ASSUMED: the library draws a story edge's centre label in the `vflow` element's text under jsdom, as it does for recipe edges (GRR-11 T3, line 510). The story edge uses the same `edgeLabels` signal (`vflowEdgesOf`, lines 57 to 68). Checked by test S1.
- A2. ASSUMED: setting a vflow node's `point` signal in place moves the node, and the position change that the library may emit then equals the file's position, so `withPosition` writes nothing extra. Checked by test S4 (the saved body).
- A3. ASSUMED: `FilesPage` (the target of Open file) does not fail test S2 when its own reads are not canned. Checked at step 4. If it fails, S2 answers the file read with a canned typed error (`fail`) and the plan records it; the test checks only the route.
- A4. ASSUMED: jsdom delivers `change` events on a `select` and an `input` set through `value` as the existing tests deliver `input` events (`fieldOf` helper). Checked by S1 and S2.
- A5. ASSUMED: the story handles stay default library circles (GRR-10 C12, no `data-port`), so no test of this plan uses them (open point 1).
- A6. ASSUMED: the existing e2e specs of GRR-10 and GRR-11 keep passing with the Arrange button added to the recipe controls (step 7, if port 8080 is free).

## 3. Decisions this plan obeys

### 3.1 Settled by the unit, module, contract, DECISIONS or done units (obeyed)

| # | Decision | Source | Obeyed by |
|---|---|---|---|
| D1 | Story nodes are `scene`, `beat` and `entity` with a label; created by the controls (already on main). | unit line 18; GRR-10 C6 (`newNodeOf`, canvas-page.ts lines 141 to 143) | step 3 keeps the controls |
| D2 | A story node's `path` is picked from a file picker: scene and beat into `drafts/`, entity into `entities/`. Several nodes may share a file. | unit line 18; `graph.ts` lines 33 to 38 | C-3, C-7 |
| D3 | A node whose file is missing shows a warning badge, from the validation warnings. | unit line 18; `constants.ts` line 113; `graph-validation.ts` lines 464 and 121 to 124 | C-5 |
| D4 | "Open file" navigates to `/projects/:projectId/files?path=<path>`. | unit line 18; `files-page.ts` lines 456 to 458; PST-34 line 152 | C-4 |
| D5 | The relation picker suggests `order`, `causality`, `containment` with their meanings and accepts free text; a present relation is non-empty. | unit line 19; `constants.ts` lines 33 to 41; `graph.ts` lines 63 to 69 | C-2 |
| D6 | Story graphs never offer Run. | unit line 20; module line 39; canvas-page.ts line 285 (`@if (!isStory())`) | the Run button stays recipe-only; test S3 |
| D7 | Arrange is a simple layered layout: recipes by topological depth, story graphs by `order` edges then insertion order; it rewrites `position` only; the author saves the result like any edit. | unit line 21; module line 66 | C-8, C-9 |
| D8 | A story file has no recipe-only fields (no `params`, no `tool`, no port ids) and parses against the contract. | unit criterion 1 (line 24); `graph.ts` lines 39 to 69 | test S1 |
| D9 | The file is the state; each change returns a new file object; a position change writes only `position`; ids are `<kind>-<n>` and `e<n>`; the issues panel shows the server's issues; browser copies are type-only. | GRR-10 plan C3, C4, C5, C9, C10, S18 | C-10, C-13 |
| D10 | A node edit sets the vflow node's `data` in place; the `nodes` array is rebuilt only on add and remove; edges are rebuilt on connect and remove. | GRR-11 plan C-13; GRR-10 plan C3 | C-9, C-10 |
| D11 | Live validation: one debounced (300 ms) POST of the unsaved file after a change; its issues replace the panel's list. | GRR-11 plan C-10; canvas-page.ts line 92 | C-5 (the badge follows the validate answer) |
| D12 | No new route and no server change. Reads are GET, commands POST, behind Setup & auth's guard. | module lines 41 and 55 | section 4 (no `apps/api` file) |
| D13 | Browser copies import types only from the contract and are checked by a spec; the browser has no runtime zod. | GRR-10 plan S18; `graph-runner-contract.ts` lines 20 to 22; `files-contract.ts` lines 7 to 9 | C-13, test KS1 |
| D14 | Each feature stays in its folder and imports other features only through their entry files (rule R1). | GRR-10 plan S19; `eslint.config.mjs` lines 27 to 69 | section 4; no import from `project-store/` |
| D15 | Test seams: the criteria use the UI seam (the lazy route rendered with the Shell's fakes); pure rules use Vitest unit specs; unit tests never read `examples/`. | README line 139; module lines 52 to 55 | section 6 |
| D16 | No dependency is added; exact pins stay. | GRR-10 plan S21; `apps/web/package.json` | section 4 |
| D17 | A recipe is read-only while its run is active, and Arrange on a recipe is an edit under that rule. | GRR-13 unit line 22 (settled text); GRR-13 plan D20 (draft) | section 7 (merge rule) |

### 3.2 Choices made here (names, layout and shapes the unit leaves open)

- C-1 Files. Two pure modules with no library or Angular import: `story-view.ts` (the folder rule, the file choices, the path and relation setters, the relation options) and `layout.ts` (`arrangeOf`). Each has a spec. `canvas-page.ts` holds the page. `vflow-adapter.ts` is not changed: its `replaceNode`, `vflowEdgesOf` and `withPosition` cover the needs. `layout.ts` imports `nodeIdOfPort` from `./vflow-adapter`.
- C-2 Relation picker. A list of the story's edges, one row each (`data-story-edge="<edgeId>"`, with `from -> to` text and an `input` with `list="relation-options"`). A `<datalist id="relation-options">` holds `order`, `causality` and `containment`, and a line of text under the list gives their meanings. The value applies on `change`. An empty value removes the `relation` key. No selection is used, so the picker works without library selection. (Reason: no selection is needed, so the tests do not depend on a library edge click, which is not checked in jsdom.)
- C-3 File picker. A list of the story's nodes (`data-story-node="<nodeId>"`, the label text, and a `<select data-path-picker>`). Its options: `""` labelled "No file", then the folder's files, then the node's current `path` when it is not in the folder's list (so a missing file stays selected and visible). The value applies on `change`; an empty value removes the `path` key.
- C-4 Open file. A `<button data-open-file>` with the text "Open file" in the node's row, shown only when the node has a `path`. It calls `Router.navigate(['/projects', projectId, 'files'], {queryParams: {path}})`, with `projectId` from `ActiveProjectSignal`. Nothing happens when the id is undefined.
- C-5 Missing-file badge. In the canvas node template of a story node, a `<span class="badge" data-badge="path-missing">File missing</span>` shows when the page's current issues hold a `path-missing` issue whose `nodeId` is that node. The issues come from the load (`get`) or from the latest validate answer.
- C-6 File lists. For a story graph, `load` reads `projectFilesPath(projectId)` twice with the params `{path: 'drafts', recursive: 'true'}` and `{path: 'entities', recursive: 'true'}`, joined with the tool reads by `forkJoin`. Each read is caught: a failed read, and the 404 of a missing folder (`files.service.ts` line 239), gives an empty list. A file choice is an entry with `kind` `file`, a path that starts with the folder and `/`, and no name that starts with `.`. Choices are sorted. If `projectId` is undefined, no list is read. A recipe reads no list.
- C-7 Folder rule. `folderOfKind`: `scene` and `beat` give `drafts`; `entity` gives `entities` (`graph.ts` lines 33 to 38).
- C-8 Layout (`arrangeOf`). Nodes are taken in file order. The ordering links are: story graphs, the edges whose `relation` is exactly `order` (from to to); recipes, every wire (its two node ids, from `nodeIdOfPort`). Links with an unknown endpoint are ignored. Layers come from Kahn's algorithm with a first-in first-out queue that starts from the nodes with no incoming link, in file order: a node's layer is the longest path to it. Nodes that Kahn never reaches (on or after a cycle) form one extra column after the highest processed layer (column 0 when none is processed), in file order. Within a column, nodes stack in file order. Positions: `x = 40 + layer * 320`, `y = 40 + rank * 200`. Each node is copied with its `position` replaced, so the key order of the file is kept and nothing else changes. The constants are exported and can be widened.
- C-9 Arrange on the page. A `<button data-arrange>Arrange</button>` in the controls of both views. The handler replaces the file (`arrangeOf`), sets each vflow node's `point` and `data` signals in place (no rebuild, so tool forms stay mounted), and schedules one validation. It does not save.
- C-10 Setters. `withPath` and `withRelation` return the same object when nothing changes. A path change uses `replaceNode`, sets the vflow node's `data`, and schedules a validation. A relation change rebuilds the edges (`rebuildEdges`, as `onConnect` does) so the label is drawn, and schedules a validation. An empty value deletes the key; the key is never set to `undefined`.
- C-11 Placement. The story panel is a `<section aria-label="Story details">` between the controls and the `<vflow>` element, outside `vflow`. It is shown only when `isStory()`. (GRR-12 keeps its wrapper around `vflow` and its aside under `!isStory()`.)
- C-12 Test helpers in `canvas-page.spec.ts`. `respondFiles()` answers the file-list GET (the same body answers both folder reads; the page keeps each folder's entries). `respondValidate()` answers the validate POST with `{issues: []}`, so a validation after a change does not fail. Both sit next to `respondTools()`.
- C-13 Names. `projectFilesPath(projectId: string): ApiPath` (the id encoded with `encodeURIComponent`) and `fileListCopy: ResponseSchema<FileList>`, with the same names and signatures as GRR-13's draft C-12 and C-13, so the second merge keeps one copy (section 7). Type-only imports from `@bbartolome/scriba-contracts/project-store`.
- C-14 Constants. `ARRANGE_MARGIN` 40, `ARRANGE_COLUMN` 320, `ARRANGE_ROW` 200. They clear the 160 px minimum node width (canvas-page.ts line 375). GRR-15 may change them with its styling.
- C-15 Relation vocabulary copy. `RELATION_OPTIONS` in `story-view.ts` is a literal copy of `RELATION_VOCABULARY` (name and meaning), checked against the contract by `story-view.spec.ts`. The browser does not import the contract's value.

## 4. Files to change

Only these paths are changed by the implementer. Nothing else changes, and this plan file is not changed by the implementer.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/graph-runner/story-view.ts` | new | Pure rules (C-2, C-3, C-7, C-10, C-15): `folderOfKind`, `fileChoicesOf`, `pathChoicesOf`, `withPath`, `withRelation`, `RELATION_OPTIONS`. Type imports only |
| `apps/web/src/app/features/graph-runner/story-view.spec.ts` | new | Supporting checks W-S1 (section 6) |
| `apps/web/src/app/features/graph-runner/layout.ts` | new | Pure rules (C-8): `arrangeOf`, and the constants of C-14. Imports `nodeIdOfPort` from `./vflow-adapter` |
| `apps/web/src/app/features/graph-runner/layout.spec.ts` | new | Supporting checks W-L1 (section 6) |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.ts` | edit | Adds `projectFilesPath` and `fileListCopy` (C-6, C-13). Type imports only |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.spec.ts` | edit | Supporting checks KS1 and KS2 (section 6) |
| `apps/web/src/app/features/graph-runner/canvas-page.ts` | edit | The file-list reads in `load` (C-6); the story panel with the node rows, the file picker and Open file (C-3, C-4); the relation list and its datalist (C-2); the missing-file badge in the story node template (C-5); the Arrange button and handler in the controls (C-8, C-9); the setters (C-10); `ActiveProjectSignal`, `Router` and the new styles |
| `apps/web/src/app/features/graph-runner/canvas-page.spec.ts` | edit | New tests S1 to S4 (section 6) and the helpers of C-12. The existing tests keep their pass conditions |

Not changed: `vflow-adapter.ts` and its callers, `tool-nodes.ts` and its spec, `graph-list-page.ts` and its spec, `graph-runner.routes.ts`, `app.routes.ts`, `apps/web/package.json`, `package-lock.json`, `packages/**`, `apps/api/**`, `e2e/**`, `examples/**`, `units/**`, `modules/**`, `plans/**` other than this file, and `plans/DECISIONS.md`. Nothing is generated and committed beyond the one commit of step 8.

## 5. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v` and `npm -v` beside each result. Do not push, and do not start, stop or kill any process. Port 8080 is not used by this procedure.

0. **Preconditions.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GRR-14 -b unit/GRR-14 main` (or a new branch on a clean tree). Expected: the worktree is created. `git log --oneline 4962762..main -- apps/web/src/app/features/graph-runner packages/contracts/src/graph-runner apps/api/src/modules/graph-runner e2e/specs` prints nothing. If it prints a commit, read it and check it against sections 2 and 4 before going on. `grep -m1 '^status:' plans/GRR-10.md plans/GRR-11.md` prints `status: done` for both. In the worktree, `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0, and `ls node_modules/ngx-vflow` lists the package.
1. **Pure rules (C-2, C-3, C-7, C-8, C-10, C-15).** Write `story-view.ts`, `story-view.spec.ts`, `layout.ts` and `layout.spec.ts` as sections 3 and 6 say. Expected: `npm test -w @bbartolome/scriba-web -- story-view layout` passes.
2. **Copies (C-6, C-13).** In `graph-runner-contract.ts`, add `projectFilesPath` and `fileListCopy` (type imports only). Add KS1 and KS2 to `graph-runner-contract.spec.ts`. Expected: KS1 and KS2 pass with the existing copy tests.
3. **Page (C-2 to C-6, C-8 to C-11).** Edit `canvas-page.ts` in this order: (a) `load`: the file-list reads for a story graph, joined with the tool reads, and the state they set; (b) the story panel: the node rows with the file picker and Open file, placed between the controls and the `<vflow>` element; (c) the relation list and the datalist with its meaning line; (d) the badge in the story node template; (e) the Arrange button in the controls, for both views; (f) the handlers `setPath`, `setRelation`, `openFile` and `arrange`; (g) the styles of the panel and the badge. Expected: `npm run build -w @bbartolome/scriba-web` passes after step 4.
4. **Page tests (S1 to S4, C-12).** Add the helpers `respondFiles` and `respondValidate` next to `respondTools`, and tests S1 to S4 to `canvas-page.spec.ts`. Run `npm test -w @bbartolome/scriba-web`. Expected: every test passes, including GRR-10 test 1, GRR-11 T1 and T3 (unchanged). If S2 fails only because `FilesPage` fails its own read (A3), apply the fallback named in section 2 and record it.
5. **Format, lint, build.** `npx prettier --write` on the section 4 files; `npm run lint -w @bbartolome/scriba-web`; `npx prettier --check .` at the root; `npm run build -w @bbartolome/scriba-web`. Expected: each exits 0 and the budgets of `angular.json` hold. Record the chunk sizes and the chunk of `canvas-page`, and that `canvas-page` is out of the initial bundle. Then commit (step 8).
6. **Root gates.** From the root of the worktree: `npm run lint`, `npm test` and `npm run build`. Expected: each exits 0. A failure that main also has is recorded and not counted against this unit (as GRR-11 step 8).
7. **Regression e2e (optional).** Only if port 8080 is free: `npm run e2e -w @bbartolome/scriba-e2e -- graph-canvas graph-wires`, with `SCRIBA_E2E_CHROMIUM` when the default lookup fails. Expected: both specs pass (A6). If port 8080 is held, stop at this step, keep the output, and report it. Do not stop the other process.
8. **Commit.** One commit on `unit/GRR-14`: `feat(GRR-14): story view pickers, relation picker, missing-file badge, Open file and Arrange`. Expected: `git log --oneline main..unit/GRR-14` prints that commit. Fresh clone: clone `unit/GRR-14` into an empty folder outside the repository, and there run `npm ci && npm run lint && npm test && npm run build`. Expected: each exits 0. Remove the folder afterwards.

## 6. Acceptance criteria and tests

One test per criterion. The test name is the criterion text as written in the unit (lines 24 to 27). Nothing in this plan marks a criterion as passed. All four tests use the UI seam: the lazy route rendered by the App with the Shell's fakes (`createShellTestDoubles`), and the POST bodies and the router state that the fakes and the router record.

| Criterion (unit line) | Test | File and seam | Command | Pass condition |
|---|---|---|---|---|
| 24: "The story view creates scene, beat and entity nodes and labelled relations, and saves a file that parses against the contract with no recipe-only fields." | S1, named as the criterion | `canvas-page.spec.ts`; UI seam. Seed `story-pickers`: nodes `scene-1` (scene, "Arrival", `drafts/arrival.md`) and `entity-1` (entity, "Mara"), edge `e1` from `entity-1` to `scene-1` with no relation. Canned: active project, detail, tools, file lists, validate. Steps: add a beat "Storm" (`beat-1`), a scene "Dock" (`scene-2`) and an entity "Keeper" (`entity-2`) with the controls; set `[data-story-edge="e1"] input` to `causality` and fire `change`; click Save | `npm test -w @bbartolome/scriba-web` | One save POST. Its body: the node kinds are `scene`, `entity`, `beat`, `scene`, `entity` in that order, with the labels typed; edge `e1` has `relation` `causality`; `graphFileSchema.safeParse(body).success` is true; every node's keys are within `id`, `kind`, `label`, `path`, `position` and every edge's within `id`, `from`, `to`, `relation` (no `params`, no `tool`); `root.querySelector('vflow')?.textContent` contains `causality` (A1) |
| 25: "A node pointing at a deleted file shows the warning badge; Open file navigates to the files route." | S2, named as the criterion | `canvas-page.spec.ts`; UI seam. Seed `story-missing`: `ch-1` (scene, `drafts/gone.md`) and `ch-2` (scene, `drafts/arrival.md`). Canned detail with one issue `{code: 'path-missing', severity: 'warning', message: 'A path does not point to a file in the project.', nodeId: 'ch-1'}`; the file list holds `drafts/arrival.md` only | same | `[data-node="ch-1"] [data-badge="path-missing"]` exists; `[data-node="ch-2"] [data-badge]` does not exist; `[data-story-node="ch-1"] select` has the value `drafts/gone.md` (C-3, the missing file kept as a choice); after a click on `[data-story-node="ch-1"] [data-open-file]`, `router.parseUrl(router.url)` has the path `/projects/p1/files` and the query `path` equal to `drafts/gone.md` (the parsed query, not the raw string) |
| 26: "No Run control appears on a story graph." | S3, named as the criterion | `canvas-page.spec.ts`; UI seam. Seed `story-no-run` (any story with one scene). Positive control: a recipe `recipe-run` with an input `chapter-notes` (text) and an output `draft`, with the canned tools | same | On the story: `root.querySelector('[data-run]')` is null, and no button has the text `Run`. On the recipe (positive control, proves the selector): `[data-run]` exists |
| 27: "Arrange lays out overlapping nodes left to right without changing anything but `position`." | S4, named as the criterion | `canvas-page.spec.ts`; UI seam. Seed `story-arrange`: `a` (scene, "A"), `b` (scene, "B") and `c` (beat, "C"), all at `{x: 40, y: 40}`; edges `e1` `a` to `b` with `order` and `e2` `b` to `c` with `order`. Steps: click Arrange; click Save | same | One save POST. Its nodes: `x(a) < x(b) < x(c)`; the body with every `position` removed deep-equals the seed with every `position` removed (so nothing else changed, and the key order of each node is the seed's); `graphFileSchema.safeParse(body).success` is true |

Supporting checks (not criteria; each is a Vitest spec, and none is in the criteria count):

- **W-S1** (`story-view.spec.ts`): `folderOfKind` gives `drafts` for scene and beat and `entities` for entity. `fileChoicesOf` keeps the files under the folder, drops directories, other folders and names with a dot segment, and sorts them. `pathChoicesOf` adds a current path that is not listed and keeps the list otherwise. `withPath` sets the key; an empty value removes the key (the key is absent, not `undefined`); it returns the same object when nothing changes; other nodes and the edges are unchanged. `withRelation` does the same for `relation` on edges. `RELATION_OPTIONS` names and meanings equal the contract's `RELATION_VOCABULARY` (the spec imports the contract value).
- **W-L1** (`layout.spec.ts`): a chain of three `order` edges, all at one point, gives columns 0, 1 and 2 (x increasing) and the same y. A `containment` edge does not move a node. Story nodes with no `order` edge stack in column 0 in file order (the choice of open point 2). A recipe with one input feeding two tools that both feed one output gives three columns, and the two tools share column 1 and stack in file order. An `order` cycle `a` and `b` with an unconnected `d` gives finite positions for all three, `d` in column 0 and `a` and `b` in column 1, in file order. Edges with an unknown endpoint are ignored without error. The result differs from the input only in `position` (deep equal after removing `position`), and each node keeps its key order.
- **KS1** (`graph-runner-contract.spec.ts`): `fileListCopy` accepts `{entries: []}` and an entry list with a file and a directory, and refuses `{}`, an `entries` that is not a list, an entry with `kind` `link`, and an `mtime` with an offset instead of `Z`. Each sample agrees with `fileListSchema.safeParse` from `@bbartolome/scriba-contracts/project-store`.
- **KS2** (`graph-runner-contract.spec.ts`): `projectFilesPath('p 1')` is `/api/project-store/projects/p%201/files`.

## 7. Agreement with the downstream and the parallel units

Downstream:
- **GRR-15 (blocked by GRR-14; touch, styling, large graphs).** Its hooks are `data-story-node`, `data-path-picker`, `data-open-file`, `data-story-edge`, `data-arrange`, `[data-badge]` and the classes `badge` and `story-panel`. GRR-14 adds no theme token and no visual styling beyond the minimum (C-14 and step 3g). Its touch criterion does not need the panel: the panel uses buttons and selects, not gestures. GRR-15 may change `ARRANGE_COLUMN` and `ARRANGE_ROW`.
- **GRR-17 (canvas gate, blocked by GRR-14).** Its demo step 6 (story graph: two scene nodes on `drafts/` files, a beat, `order` and `containment`, no Run) is covered by C-2, C-3 and S3. Its criterion "GRR-09 to GRR-16 pass on main" needs S1 to S4 to pass. GRR-17 adds no file of this plan; its e2e extension is its own.
- **Compile & export (CEX-*, which reads `order` edges).** The picker writes the relation text exactly as typed or picked; the choices are `order`, `causality` and `containment`, and the `order` text is exact (`storyEdgeSchema`, `RELATION_VOCABULARY`).
- **GRR-16 (done).** The sample has no story graph (its unit line 22), so the story tests use fixtures inside the spec. No file is shared.

Parallel:
- **GRR-12 (draft, `status: draft` at reading).** Both change `canvas-page.ts`, `canvas-page.spec.ts` and `graph-runner-contract.ts`. GRR-12 changes the recipe branch (the aside under `!isStory()`, the wrapper around `vflow`, the drop targets on tool input rows); GRR-14 changes the story branch, the load's file reads, the controls (Arrange, both views) and the spec's helpers. Either merge order is correct. The second merge rebases: it keeps GRR-12's wrapper around `vflow` (GRR-14's panel sits outside `vflow` and outside the wrapper), keeps one copy of each helper name, and keeps the `ActiveProjectSignal` injection once. No name collides (GRR-12's `entitiesPath` and `entityListCopy`; GRR-14's `projectFilesPath` and `fileListCopy`).
- **GRR-13 (draft, `status: draft` at reading).** GRR-13 makes the canvas read-only during a recipe run (unit line 22; its D20). Arrange on a recipe is an edit under that rule, and GRR-13's plan (step 5h, test R3) already names it. Merge rule, the same in either order: the Arrange handler begins with the guard `if (!this.editable()) return;` and its button takes `[disabled]="!editable()"` on a recipe (`editable` is always true on a story, as GRR-13's agreement says, so the story panel and its handlers need no guard). If GRR-13 merged first, GRR-14's implementer adds that guard to `arrange`. If GRR-14 merged first, GRR-13's implementer adds it (its step 5h). Shared names: `projectFilesPath(projectId)` and `fileListCopy` (C-13) are the same in both plans; the second merge keeps one copy. Both inject `ActiveProjectSignal` once. GRR-13's `forkJoin` of the run state is separate from GRR-14's file reads, so both can join `load` without a conflict.
- **GRR-08 and GRR-09 (done; GRR-09 owns the graphs list and the tablet gate).** No shared file. The canvas route stays gated (`graph-runner.routes.ts` is unchanged).
- **GRR-11 (done; the base).** C-13 (`replaceNode`, `data` in place), C-16 (the Run button stays recipe-only) and C-17 (`formValueOf`) are kept. GRR-14 uses the same jsdom label assertion as GRR-11 T3.
- **GRR-16 (done).** No file is shared.
- **TRG-15 (planned).** Its plan names no graph-runner file (grep). Either order is correct.
- **PST-34 (done).** The `?path=` link still opens the file (line 152), so Open file works without change.

## 8. Open points

1. **Gesture check for a story wire, and the hook it would need.** The story handles are default library circles with no `data-port` (GRR-10 C12). A Playwright check that draws a story wire would need a selector for the circle, so a template and a `data-port` for story handles, which changes the settled handle decision of GRR-10. The simplest option is taken: no gesture test for story wires. Test S1 seeds the edge and checks the relation through the picker, and GRR-17's demo step 6 covers the gesture by hand. Why it is not decided here: whether a done unit's handle template may change is the reviser's call, and criterion 1 ("creates ... labelled relations") can be read as needing the gesture.
2. **"Left to right" for story nodes with no `order` edge.** Unit line 21 orders story graphs by `order` edges, then by insertion order, and criterion 4 says overlapping nodes are laid out left to right. The simplest option is taken (C-8): nodes with no `order` edge stack in column 0, in file order, so S4 uses a chain of `order` edges and passes under that reading. Under a literal reading of the criterion, unconnected overlapping nodes would each get a column in file order, which the layered rule of line 21 does not say. Why it is not decided here: the unit's two sentences disagree for that case, and changing the rule changes `layout.spec.ts` (W-L1) and S4's pass condition is not affected.

Not checked (stated so the reviser can weigh them):
- No test was run and no server or e2e was started. Port 8080 was not touched.
- `ngx-vflow` is not installed in this checkout, so the library facts of this plan are the ones GRR-10 recorded from the npm tarball (`plans/GRR-10.md` section 1.3). A1 and A2 are checked by S1 and S4 when the implementer runs them.
- GRR-12 and GRR-13 are drafts being revised by other agents. Section 7 reads their current text; their final text can change the merge rule's details, not its shape.
