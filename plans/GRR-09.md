---
id: GRR-09
status: draft
unit: units/GRR-09-graphs-route-list.md
module: graph-runner
---
# GRR-09 plan — graphs route, graph list with latest run status, create/rename/delete UI, phone gate

Draft revision 2: planned against main `7c58d9b` by the planner, revised against main `312ccd4` by the reviser (the commits between them change only `plans/`). Nothing is implemented. "CHECKED" means read or grepped on main, with the file and line. "ASSUMED" means not checked here (section 3b). The open points of section 8 are settled by the reviser, and the steps and tests use those answers.

## 2. Decisions this plan obeys

### 2a. Settled by the unit, the module and the record

- **D1 Route entry.** One Shell route-table entry at `/projects/:projectId/graphs`: project-scoped, minimum class `phone`, a nav item. The list shows name, view, node count, validity, a pending-change badge and each recipe's latest run status (read-only). Source: `units/GRR-09-graphs-route-list.md` line 15; `modules/shell.md` line 64 (route row); `apps/web/src/app/app.routes.ts` lines 11 to 51 (`PROJECT_ROUTES`).
- **D2 Canvas child.** The child `:graphId` hosts the canvas (GRR-10) and is gated with `deviceClassGuard('tablet')`. A phone gets the "needs a larger screen" page at the same URL. Source: unit line 16; `modules/shell.md` lines 65 and 70; `plans/DECISIONS.md` line 2723 (2026-11-14, SHL-09 review, item 3, which names this route as GRR-09's).
- **D3 Actions.** Create (name, view), rename and delete are offered on tablet and desktop only. Source: unit line 17.
- **D4 Run status.** Read-only. It comes from current-run-state (`GET /api/graph-runner/runs/current`) and is refreshed on `graph-runner` events and on reconcile ticks. Source: unit line 15; `packages/contracts/src/graph-runner/runs.ts` lines 110 to 113 (`currentRunSchema`: one run per project, or `null`); `units/GRR-04-run-engine-core.md` line 25 (the active run or the most recent finished one); `apps/web/src/app/shell/sse-client.ts` lines 13 to 14 (features re-fetch their run state on each tick).
- **D5 Pending-change badge.** Its source is the Project store's pending list (`GET /api/project-store/projects/:projectId/pending`), matched on `targetPath` `graphs/<id>.json`. The graph-runner list row has no such field and gets none. Source: unit line 15; `units/GRR-02-graph-crud.md` line 23; `plans/GRR-02.md` line 151 (section 6, O1, decided as (a)) and line 142.
- **D6 Active project and verbs.** Every route acts on the active project. Reads are GET and never mutate; commands are POST. Source: `modules/graph-runner.md` lines 40 and 41. The page renders only after the Shell's `activeProjectGuard` has confirmed the URL's project is active (CHECKED, section 3a).
- **D7 Story graphs.** A story graph never runs, so a story row shows no run status. Source: `modules/graph-runner.md` line 39.
- **D8 Files.** The feature folder is `apps/web/src/app/features/graph-runner/`. Its entry file `graph-runner.routes.ts` is the only file other code imports. Source: `modules/graph-runner.md` line 37; `eslint.config.mjs` lines 39 to 42 (entry files `features/*/*.routes.ts`) and 49 to 66 (a feature imports another only through its entry file).
- **D9 Test seam.** UI only: the lazy route rendered with Angular's Vitest runner against the Shell's fakes (SHL-07). Assertions are on external behaviour: requests sent, rendered text, fake envelopes pushed. Source: `modules/graph-runner.md` lines 49 and 52.
- **D10 Guard in tests.** A test that renders through `APP_ROUTES` must answer `GET /api/project-store/active`. Source: `plans/DECISIONS.md` line 2557 (2026-11-14, SHL-08 review, rejection 3, item 3).
- **D11 Gate wiring.** `withDeviceGate` gates every route with `data.scope` at any depth, and wraps each `loadChildren`, so the lazily loaded `graphsRoutes` is gated too. This is already on main. Source: `apps/web/src/app/shell/device-class.ts` lines 148 to 172 and 197 to 198; `plans/DECISIONS.md` line 1320 (the SHL-05 review item that required the wrap).
- **D12 Demo wording.** On a phone the graphs list stays in the bottom nav, and the canvas URL shows the larger-screen page in place. Source: `plans/DECISIONS.md` lines 1307 and 1308 (SHL-09 demo step 4).
- **D13 No API, contract or module change.** The routes, schemas and run-state read exist on main (section 3a). Source: `packages/contracts/src/graph-runner/routes.ts` lines 5 to 19.

### 2b. Planner's choices (the simplest option; names, layout and test structure)

- **C1 Nav item.** Label `Graphs`, icon `account_tree`, `order: 35`. The orders in use are Chat 10, Projects 20, Review 25, Files 30, Tools 40, Providers 50, Settings 90, Core gate 100 (`apps/web/src/app/app.routes.ts` lines 18, 121, 44, 31, 134, 147, 108, 83). The number 35 is the first free slot between Files (30) and Tools (40).
- **C2 Names.** `graph-runner.routes.ts` (exports `graphsRoutes`); `graph-list-page.ts` (class `GraphListPage`, selector `app-graph-list-page`); `canvas-placeholder-page.ts` (class `CanvasPlaceholderPage`, selector `app-canvas-placeholder-page`); `graph-runner-contract.ts`; `graph-list-page.spec.ts`; `graph-runner-contract.spec.ts`. The same layout as `plans/AGL-07.md` line 36 (D1).
- **C3 Refresh.** On load and after each create, rename or delete, the page re-reads all three sources (graph list, current run, pending list). On each `graph-runner` envelope it re-reads the current run only. On each reconcile tick it re-reads all three. Event data is not folded into state.
- **C4 Controls.** Create form: a text input labelled `Graph name`, a select labelled `View` with options `Story` (value `story`) and `Recipe` (value `recipe`), a `Create` button. Each row has a `Rename` button (reveals an input labelled `New name` and a `Save name` button) and a `Delete` button. Shown only when `DeviceClassService.deviceClass()` is not `phone` (`apps/web/src/app/shell/device-class.ts` line 71).
- **C5 Delete body.** The delete request sends `{}`. The controller takes no body (`apps/api/src/modules/graph-runner/graphs.controller.ts` lines 70 to 72), and `ApiClient.post` needs a value.
- **C6 Contract copy.** Literal paths and response schemas are written by hand in `graph-runner-contract.ts`, with a spec that checks them against the contract. This follows `apps/web/src/app/features/project-store/files-contract.ts` lines 1 to 6, which explain that the browser ships no runtime zod. `apps/web/src/contracts-boot.ts` imports the contracts only as a build-time check (its header, lines 1 to 2), so it does not change this.
- **C7 Failed read.** A failed read keeps the last shown state and shows one plain error line. The page does not throw.

## 3. Facts checked and assumed

### 3a. CHECKED

- **Base.** `git rev-parse --short HEAD` is `312ccd4` (main; `git log 7c58d9b..312ccd4` shows only `docs(GRR-08)` and `docs(GRR-09)` commits). `git status --short` was empty at revision time. No `unit/GRR-09` or `unit/GRR-10` branch exists, and `apps/web/src/app/features/graph-runner/` does not exist on main. The worktrees (`scriba-prototype-wt/GRR-08`, `PST-15`, `PST-17`, `SAU-13`, `TRG-07`, `TRG-14`) have no diff to any path in section 4: `git diff --stat main...<branch> -- apps/web/src/app/app.routes.ts apps/web/src/app/shell/index.ts apps/web/src/app/features/graph-runner apps/api/src/modules/graph-runner packages/contracts/src/graph-runner` is empty for each branch.
- **GRR-02 is on main** (`git merge-base --is-ancestor` of `0eaedd0` and `48ddaaf` against main: both true). The module exists: `apps/api/src/modules/graph-runner/graphs.controller.ts` (`@Get(GRAPHS_ROUTE)` line 31, `@Post(GRAPH_CREATE_ROUTE)` line 41, `@Post(GRAPH_RENAME_ROUTE)` line 61, `@Post(GRAPH_DELETE_ROUTE)` line 70 with `delete(): void` at line 72). `graph-runner.service.ts` `list()` at line 101, `summaryOf()` at line 279.
- **GRR-04 is done** (`plans/GRR-04.md` status `done`). `apps/api/src/modules/graph-runner/runs.controller.ts` line 30: `@Get(RUN_CURRENT_ROUTE)`.
- **Routes.** `packages/contracts/src/graph-runner/routes.ts`: `GRAPHS_ROUTE` line 5, `GRAPH_CREATE_ROUTE` line 7, `GRAPH_RENAME_ROUTE` lines 11 and 12, `GRAPH_DELETE_ROUTE` lines 13 and 14, `RUN_CURRENT_ROUTE` line 19. Path params are `:id` (lines 6, 10, 12, 14).
- **Graph shapes.** `packages/contracts/src/graph-runner/catalog.ts`: `graphSummarySchema` lines 11 to 19 (`id`, `name`, `view` nullable, `nodeCount` nullable, `mtime`, `valid`); `graphListSchema` lines 22 to 25 (`{graphs}`); `graphCreateSchema` lines 35 to 38 (`name`, `view`); `graphRenameSchema` lines 42 to 45 (`{name}` or `{newId}`); `graphIdResultSchema` lines 49 to 52 (`{id}`).
- **Run shapes.** `packages/contracts/src/graph-runner/runs.ts`: `runStateSchema` lines 94 to 107 (`runId`, `graphId`, `target?`, `status`, `reason?`, `startedAt`, `endedAt?`, `inputs`, `targets`, `nodes`, `pendingChangeIds`); `currentRunSchema` lines 110 to 113 (`{run: RunState | null}`). Run status values: `RUN_STATUSES` in `constants.ts` line 50 (`running`, `done`, `error`, `stopped`).
- **Events.** `packages/contracts/src/graph-runner/events.ts`: `nodeStatusDataSchema` lines 14 to 21, `runEndedDataSchema` lines 24 to 29 (`runId`, `status`, `reason?`), `graphRunnerEventSchema` lines 51 to 56 (`run-started`, `node-status`, `run-ended`).
- **Pending list.** `packages/contracts/src/project-store/routes.ts` lines 36 and 37 (`PROJECT_PENDING_ROUTE` `/api/project-store/projects/:projectId/pending`). `packages/contracts/src/project-store/pending.ts`: `pendingChangeSchema` lines 37 to 58 (`targetPath` line 40, `status`); line 64 comment "the open changes"; `pendingListSchema` lines 65 to 67 (`{changes}`). Served on main by `apps/api/src/modules/project-store/pending.controller.ts` line 31.
- **Project store events.** `packages/contracts/src/project-store/events.ts`: `pending-created` lines 25 and 26, `pending-updated` lines 31 and 32, `pending-resolved` lines 37 and 38.
- **Shell route table.** `apps/web/src/app/app.routes.ts`: `PROJECT_ROUTES` lines 11 to 51 (`chat` 12 to 24, `files` 25 to 37, `review` 38 to 50, closing `];` line 51); the pathMatch rule in the comment, lines 53 to 56 ("each owned path uses `pathMatch: 'full'` unless it has a child route"); `APP_ROUTES = withDeviceGate([` line 57; `projects/:projectId` with `canActivate: [activeProjectGuard]` and `children: [...PROJECT_ROUTES, ...]` lines 72 to 76.
- **Device gate.** `apps/web/src/app/shell/device-class.ts`: `DeviceClassService` line 57; `deviceClass` signal line 71; phone and tablet mapping lines 100 and 101; `deviceClassGuard` lines 128 to 131; `withDeviceGate` lines 148 to 150; `gateRoute` line 152 (its `canMatch` line 164, its children and loader recursion lines 165 to 167); `fallbackFor` line 184 (a route with children or a loader gets a `**` child showing `LargerScreenPage`); `wrapLoader` lines 197 and 198.
- **Shell barrel.** `apps/web/src/app/shell/index.ts`: line 2 (`ShellRouteData` type), line 3 (`API_CLIENT`, `SSE_CLIENT`), line 10 (`DeviceClassService`, `deviceClassGuard`), line 11 (`ActiveProjectSignal`). No barrel change is needed.
- **Shell API client.** `apps/web/src/app/shell/api-client.ts` line 13 (the `ApiPath` type, a string that starts with `/`); `ApiClient` lines 24 to 35 (`get(path, schema, params?)`, `post(path, body, schema)`).
- **Shell SSE.** `apps/web/src/app/shell/sse-client.ts` lines 13 and 14 (reconcile reasons; "Features re-fetch their current run state on each tick"), line 59 (`reconcile$`), line 78 (`stream(slug)`). `apps/web/src/app/shell/sse-envelope.ts` line 23 (`'graph-runner'` is a publishing slug).
- **Platform envelope.** `packages/contracts/src/platform/events.ts` lines 15 to 19: `module`, `type`, `data`. `isPlatformEnvelope` in `sse-envelope.ts` is what `FakeEventSource.push` checks (`apps/web/src/app/shell/testing/test-doubles.ts` line 130, inside `push` at line 129).
- **Shell fakes.** `apps/web/src/app/shell/testing/test-doubles.ts`: `RecordedRequest` line 24; `FakeApiClient` line 43; `requests` line 45; `respond(method, path, body)` line 49 (keyed by the exact path string, so tests use concrete paths such as `/api/graph-runner/graphs/chapter-opening/rename`); `fail` line 54; `FakeEventSource` line 110; `stream` line 124; `push` line 129; `tick(reason)` line 159; `ShellTestDoubles` line 165 (`api`, `events`, `providers`); `createShellTestDoubles` line 187. An unanswered request throws `No canned response for ...` (lines 89 to 92).
- **Match media.** `apps/web/src/app/shell/testing/match-media.ts`: `stubMatchMedia(width, height)` line 67 (call before TestBed is configured); `restoreMatchMedia` line 99. Viewports used by existing specs: 390x844, 820x1180, 1280x800, 1024x768.
- **Larger-screen page.** `apps/web/src/app/shell/larger-screen.ts` line 12: `<h2>This page needs a larger screen</h2>`. This is the "gate message" the criterion names.
- **Nav.** `apps/web/src/app/shell/app-nav.ts`: phone form `bottom` with accessible label `Bottom navigation` (line 31); `navItem` lines 36 to 44 (`min` defaults to `tablet`); `navItems` lines 52 to 69, with the project children listed at lines 55 to 63 and their href `/projects/<id>/<child.path>`. A child route with `data.nav` gets a nav item, so the new `graphs` entry does; its `:graphId` child (no `nav`) does not.
- **Active-project guard.** `apps/web/src/app/shell/active-project-guard.ts` lines 13 to 33: reads `ACTIVE_PROJECT_PATH` (`apps/web/src/app/shell/project-store-copies.ts` line 15, `/api/project-store/active`), answers `{active}` (lines 18 to 23), returns `true` when the URL's project is the active one (lines 27 to 29), and otherwise redirects to the switch page.
- **Active project signal.** `apps/web/src/app/shell/project-scope.ts`: `ActiveProjectSignal` class at line 75; `projectId` at line 78; `projectIdOf` lines 11 to 20 (reads the route params).
- **Route data.** `apps/web/src/app/shell/route-data.ts` line 2 (`DeviceClass = 'phone' | 'tablet' | 'desktop'`); line 17 (`minDeviceClass?`).
- **Feature conventions.** `apps/web/src/app/features/project-store/project-store.routes.ts`: lines 1 to 3 (import note), line 5 ("Other code imports only from here (ESLint boundaries)"), lines 16 to 26 (`filesRoutes`: a lazy `loadComponent`, no static import of the page). `apps/web/src/app/features/project-store/files-contract.ts` lines 1 to 6 (type-only imports; the copies are checked by `files-contract.spec.ts`), lines 12 to 17 (`projectFilesPath`, `encodeURIComponent` on the id).
- **Lint boundaries.** `eslint.config.mjs`: web-feature element lines 27 to 37; entry files lines 39 to 42; the R1 policy (a feature imports another only through an entry file) lines 49 to 66; the agent-loop and graph-runner features may not import each other (R2, from line 69 on).
- **Build and test scripts.** Root `package.json` line 23 (`build` runs `npm run build -w @bbartolome/scriba-web` among others), line 25 (`test`: `npm test --workspaces`). `apps/web/package.json` line 6 (`build`: `ng build`), line 8 (`test`: `ng test --watch=false`).
- **Canvas route in GRR-10.** `units/GRR-10-vflow-adapter.md` line 22 ("The canvas route component under the `:graphId` child route"). GRR-10 has no plan: `ls plans` lists no `GRR-10.md` or `GRR-11.md`.
- **Manuscript route (CEX-17).** `modules/shell.md` line 66 (the row). It has no plan. `plans/AGL-07.md` line 79 lists GRR-09 and CEX-17 among the units that append to `PROJECT_ROUTES`, and states the rule: each append is anchored on text and keeps the others.
- **Other plans with open status.** `plans/GRR-08.md` status `planned`; its line 20 (D4) says it changes no code. `plans/TRG-14.md` status `planned`; its line 95 lists `apps/web/src/app/app.routes.ts` as not changing. `plans/SAU-22.md` status `draft`; a grep finds no path of this plan in it. `plans/SHL-14.md` is `done` (front matter line 7).
- **Phone e2e.** `e2e/specs/phone-toolbar.e2e.ts` does not count nav items (a grep for `toHaveCount`, `length` and `nth` finds none). The phone nav gains one link.
- **DECISIONS entries.** Lines 1307 and 1308 (SHL-09 demo step 4, Navigator decision, 2026-11-13); lines 1320 to 1324 (SHL-05 review, rejection 2, items 2 and 3: the lazy-child wrap); lines 2557 and 2723 (see D10 and D2).
- **Nothing reads graph-runner REST yet.** `grep -rn "api/graph-runner" apps/web/src` finds no match. The only web references to the module are `apps/web/src/contracts-boot.ts` lines 10 and 22 (a build-time import) and `apps/web/src/app/shell/sse-envelope.ts` line 23.

### 3b. ASSUMED

- **A1.** `npm test -w @bbartolome/scriba-web -- --include src/app/features/graph-runner/graph-list-page.spec.ts` runs one spec with the Angular unit-test builder. Not run here.
- **A2.** Angular's `HttpClient` returns `null` for an empty JSON reply body. The delete reply is therefore read with a schema that accepts `null`. Not run here.
- **A3.** The icon name `account_tree` exists in the bundled `@fontsource/material-icons` font. Not checked.
- **A4.** Rendering `App` at `APP_ROUTES` needs no reply beyond `GET /api/project-store/active` and the page's own reads. The same is true for `core-gate.spec.ts`, which uses the same pattern for its C2 test. Not run.
- **A5.** On the graphs route, `ActiveProjectSignal.projectId()` is the URL's project id (CHECKED: `project-scope.ts` lines 70 to 72 and 78 to 85, with an initial value from the router snapshot), and the URL's project is the active one because `activeProjectGuard` has run first (CHECKED, section 3a). That the signal is already set when the page is created is not run; the page follows `apps/web/src/app/features/project-store/review-page.ts` lines 406 to 412 (a read with an `undefined` project id is skipped).
- **A6.** The Angular version in use is 22 (`apps/web/package.json` line 15 pins `@angular/core` `22.2.5`; `modules/shell.md` line 3 says Angular 22).

## 4. Files to change

| Path | Change | Notes |
|---|---|---|
| `apps/web/src/app/features/graph-runner/graph-runner.routes.ts` | New. Exports `graphsRoutes: Routes`: `''` (`pathMatch: 'full'`, lazy `GraphListPage`) and `':graphId'` (`canMatch: [deviceClassGuard('tablet')]`, lazy `CanvasPlaceholderPage`). | Entry file. Imports `deviceClassGuard` from `'../../shell'`. |
| `apps/web/src/app/features/graph-runner/graph-list-page.ts` | New. `GraphListPage`, selector `app-graph-list-page`. | Section 5, step 5. |
| `apps/web/src/app/features/graph-runner/canvas-placeholder-page.ts` | New. `CanvasPlaceholderPage`, selector `app-canvas-placeholder-page`. | Template `<p>The canvas is not built yet.</p>` (OP-1). GRR-10 replaces it. |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.ts` | New. Literal paths and hand-written response schemas. | Step 1. |
| `apps/web/src/app/features/graph-runner/graph-runner-contract.spec.ts` | New. Checks each copy against the contract. Not a criterion (convention, C6). | Step 2. |
| `apps/web/src/app/features/graph-runner/graph-list-page.spec.ts` | New. The criterion tests and the extra tests of section 6. | Step 7. |
| `apps/web/src/app/app.routes.ts` | Changed. One entry appended to `PROJECT_ROUTES` after the `review` entry (after its closing `},` at line 50, before `];` at line 51). | Step 6. |

Not changed: `packages/contracts/**`, `apps/api/**`, `apps/web/src/app/shell/**` (including `shell/index.ts`), `units/**`, `modules/**`, `plans/DECISIONS.md`, `apps/web/src/app/features/project-store/**`, and every other `apps/web/src/app/features/**` folder.

## 5. Procedure

Each step lists the check that ends it. Steps 0 to 10 are the implementer's, and step 11 is the hand-off. The orchestrator ticks the criteria after review (the precedent is the MPR-08 case named in `plans/GRR-08.md` line 9); the implementer does not tick.

0. **Base check and branch.** Run `git rev-parse --short HEAD` (must be `312ccd4` or a descendant). Run `git diff --quiet 312ccd4 HEAD -- apps/web/src/app/app.routes.ts apps/web/src/app/features/graph-runner packages/contracts/src/graph-runner apps/api/src/modules/graph-runner`; it must exit 0. If it does not exit 0 only because GRR-10 has merged `features/graph-runner/`, follow section 7b, second case, in steps 3 and 4; for any other difference, stop and report it. Create branch `unit/GRR-09` from main in its own worktree. If `node_modules` is missing, run `npm ci` once at the repo root. Check: the branch exists and the diff check exits 0.

1. **Contract copy (`graph-runner-contract.ts`).** Export: `GRAPHS_PATH` (`/api/graph-runner/graphs`), `RUN_CURRENT_PATH` (`/api/graph-runner/runs/current`), `GRAPH_CREATE_PATH` (`/api/graph-runner/graphs/create`), functions `graphRenamePath(id)` and `graphDeletePath(id)` (the `:id` segment with `encodeURIComponent`), and `pendingPath(projectId)` (`/api/project-store/projects/<encoded>/pending`). Export one `ResponseSchema` copy each for: the graph list (`graphListCopy`, the row fields of `graphSummarySchema`), the current run (`currentRunCopy`, `null` or a run with the fields of `runStateSchema`), the pending list (`pendingListCopy`, `changes` with the fields of `pendingChangeSchema`), the create result (`graphIdCopy`, `{id}`), and the empty reply (`noBodyCopy`, accepts `null`, see A2). Import only types from `@bbartolome/scriba-contracts/*`. Check: `npx tsc -p apps/web/tsconfig.app.json --noEmit` passes for this file (or the Angular build in step 10 does).

2. **Contract spec (`graph-runner-contract.spec.ts`), extra test X3.** For each copy, a list of contract-accepted samples and a list of contract-refused samples: each sample gets the same verdict from the copy as from the contract's own schema (`graphListSchema`, `currentRunSchema`, `pendingListSchema`, `graphIdResultSchema`). Check: `npm test -w @bbartolome/scriba-web -- --include src/app/features/graph-runner/graph-runner-contract.spec.ts` passes.

3. **Placeholder page (`canvas-placeholder-page.ts`).** Standalone component `CanvasPlaceholderPage` with the template `<p>The canvas is not built yet.</p>` (OP-1). Check: the file compiles in step 10.

4. **Entry file (`graph-runner.routes.ts`).** Export `graphsRoutes`: `[{path: '', pathMatch: 'full', loadComponent: () => import('./graph-list-page').then((f) => f.GraphListPage)}, {path: ':graphId', canMatch: [deviceClassGuard('tablet')], loadComponent: () => import('./canvas-placeholder-page').then((f) => f.CanvasPlaceholderPage)}]`. The page imports stay lazy (no static import), as in `project-store.routes.ts` lines 16 to 26. The `:graphId` child carries no `data`, so `withDeviceGate` adds its fallback (section 3a, `fallbackFor`). Check: step 7's spec finds the route.

5. **List page (`graph-list-page.ts`).** Standalone component `GraphListPage`. Inject `API_CLIENT`, `SSE_CLIENT`, `ActiveProjectSignal` (for `projectId`) and `DeviceClassService` (for `deviceClass()`). On creation: read the three sources (C3), subscribe to `events.stream('graph-runner')` (re-read the current run on each envelope) and to `events.reconcile$` (re-read all three on each tick). Rows: name (a `routerLink` to `./<id>`), view label (`Story` or `Recipe`), node count (`Nodes: <n>`, shown when not null), `Invalid` when `valid` is false, `Pending change` when the pending list has a change with `targetPath` `graphs/<id>.json`, and the run status (the status word) only on the row whose id equals the current run's `graphId` (OP-2). Controls on tablet and desktop only (C4), with the reply handling of C5 and C7. Rename sends `{name: <New name>}` to `graphRenamePath(id)` (OP-4). Delete sends its request on the click of `Delete`, with no confirmation step (OP-3). After each of the three commands, the page re-reads the three sources (C3). The pending list is read on load, after each command and on each reconcile tick only (OP-5). Check: step 7's spec.

6. **Route entry (`app.routes.ts`).** Append inside `PROJECT_ROUTES`, after the `review` entry (anchored on text, not line numbers, per `plans/AGL-07.md` line 79). The entry has no `pathMatch` because it has child routes (`app.routes.ts` lines 55 and 56). It is:
   ```
   {
     path: 'graphs',
     data: {
       scope: 'project',
       minDeviceClass: 'phone',
       nav: { label: 'Graphs', icon: 'account_tree', order: 35 },
     } satisfies ShellRouteData,
     loadChildren: () =>
       import('./features/graph-runner/graph-runner.routes').then(
         (feature) => feature.graphsRoutes,
       ),
   },
   ```
   Check: `git diff -- apps/web/src/app/app.routes.ts` shows one added block and no other change.

7. **Page spec (`graph-list-page.spec.ts`).** Covers criteria AC1 and AC2 (section 6), plus extra tests X1 and X2. Every test renders the real `App` at `APP_ROUTES` (`provideRouter(APP_ROUTES)` and `...doubles.providers`), calls `stubMatchMedia` before TestBed is configured, and calls `restoreMatchMedia` in `afterEach`. Every test answers `GET /api/project-store/active` with `{active: 'p1'}` (D10). The fixtures are: graphs `chapter-opening` (name `Chapter opening`, recipe, valid, 3 nodes), `story-one` (name `Story one`, story, valid, 2 nodes) and `broken` (name `broken`, `valid` false, view and node count null), each with an ISO `mtime`; a pending list with one change to `graphs/chapter-opening.json` (every required field of `pendingChangeSchema`); a current run with `runId` `run-1`, `graphId` `chapter-opening`, status `running` (every required field of `runStateSchema`, with empty `inputs`, `targets`, `nodes` and `pendingChangeIds`). The fixtures must pass the copies of step 1. Check: `npm test -w @bbartolome/scriba-web -- --include src/app/features/graph-runner/graph-list-page.spec.ts` passes.

8. **Whole web suite.** Run `npm test -w @bbartolome/scriba-web`. Existing specs that render `APP_ROUTES` (`app.routes.spec.ts`, `core-gate.spec.ts`, `device-gate.spec.ts`, `app-nav.spec.ts`) must still pass. Check: zero failures.

9. **Lint and format.** Run `npx eslint apps/web/src/app/features/graph-runner apps/web/src/app/app.routes.ts` (the boundary rules of `eslint.config.mjs` must pass) and `npx prettier --check apps/web/src/app/features/graph-runner apps/web/src/app/app.routes.ts`. Check: both exit 0.

10. **Build.** Run `npm run build -w @bbartolome/scriba-web`. Check: it exits 0, and the build output lists the graph-runner page and placeholder as separate lazy chunks, not in the initial bundle.

11. **Hand-off.** Leave `unit/GRR-09` committed for review. The orchestrator sets the plan's status and ticks AC1 and AC2 in `units/GRR-09-graphs-route-list.md` after review. The implementer changes no file under `units/`.

## 6. Acceptance criteria and tests

The unit has two criteria. They are quoted exactly from `units/GRR-09-graphs-route-list.md` lines 20 and 21. The unit has no ids, so this plan calls them AC1 and AC2.

### AC1

> Component tests (fakes): list renders, create/rename/delete call the API, latest run status follows fake events.

Test file: `apps/web/src/app/features/graph-runner/graph-list-page.spec.ts` (step 7). Viewport 1280x800 (desktop), so the controls of D3 are shown. Command: the `--include` line of step 7 (A1).

- **C1.1 list renders.** Render `/projects/p1/graphs`. Assert: the `chapter-opening` row shows `Chapter opening`, `Recipe`, `Nodes: 3` and a `Pending change` badge; the `story-one` row shows `Story` and no badge; the `broken` row shows `Invalid`. The rows are found by their link to `/projects/p1/graphs/<id>`.
- **C1.2 create calls the API.** Type `Chapter two` into `Graph name`, choose `Recipe`, click `Create`. Assert: `doubles.api.requests` contains `{method: 'POST', path: '/api/graph-runner/graphs/create', body: {name: 'Chapter two', view: 'recipe'}}`, and a `GET /api/graph-runner/graphs` follows it (the list is re-read). The create reply is answered with `{id: 'chapter-two'}`.
- **C1.3 rename calls the API.** The rename reply is answered with `{id: 'chapter-opening'}`. Click `Rename` on `chapter-opening`, type `Opening scene` into `New name`, click `Save name`. Assert: `requests` contains `{method: 'POST', path: '/api/graph-runner/graphs/chapter-opening/rename', body: {name: 'Opening scene'}}` (OP-4), and a `GET /api/graph-runner/graphs` follows it.
- **C1.4 delete calls the API.** The delete reply is answered with `null` (the empty body, A2). Click `Delete` on `story-one` (no confirmation step, OP-3). Assert: `requests` contains `{method: 'POST', path: '/api/graph-runner/graphs/story-one/delete', body: {}}`, and a `GET /api/graph-runner/graphs` follows it.
- **C1.5 latest run status follows fake events.** The current run is answered as `running` for `chapter-opening`. Assert: the row shows `running`. Then the current-run answer is replaced with `status: 'done'`, and `doubles.events.push({module: 'graph-runner', type: 'run-ended', data: {runId: 'run-1', status: 'done'}})` is called. Assert: after `whenStable`, the row shows `done`, `running` is gone from that row, and `requests` has a second `GET /api/graph-runner/runs/current` after the push. The row is the matching one (OP-2).

### AC2

> A phone-sized viewport shows the list and run status, and the canvas route shows the gate message.

Test file: the same spec (step 7). Viewport 390x844 (phone).

- **C2.1 phone shows the list and run status.** Render `/projects/p1/graphs`. Assert: the three rows are shown; the `chapter-opening` row shows `running`; the bottom navigation (`nav[aria-label="Bottom navigation"]`, `app-nav.ts` line 31) has a link labelled `Graphs`. Also assert (derived from D3, not from the criterion) that no `Create`, `Rename` or `Delete` control is rendered.
- **C2.2 canvas route shows the gate message.** Render `/projects/p1/graphs/chapter-opening` at 390x844. Assert: the `h2` text `This page needs a larger screen` (`larger-screen.ts` line 12) is shown, and `router.url` stays `/projects/p1/graphs/chapter-opening`.

### Extra tests (not criteria; derived from the decisions)

- **X1 reconcile tick re-reads the run (D4).** At 1280x800, render the list with the current run answered as `running`, then replace the answer with `status: 'done'`, call `doubles.events.tick('visible')`, and assert the matching row shows `done` after `whenStable`.
- **X2 tablet canvas is not gated (D2, D3).** At 820x1180, render `/projects/p1/graphs/chapter-opening`. Assert: the gate text of C2.2 is absent, the text `The canvas is not built yet.` is shown (OP-1), and `router.url` is unchanged.
- **X3 contract copies (C6).** Step 2's spec, in `graph-runner-contract.spec.ts`.

## 7. Agreement with downstream units and other plans

### 7a. Downstream: GRR-17 (canvas gate)

- `units/GRR-17-canvas-gate.md` line 7 lists GRR-09 in `blocked_by`, and line 22 requires "GRR-09…GRR-16 criteria pass on `main`". AC1 and AC2 are GRR-09's criteria, so they are that requirement.
- GRR-17's demo step 1 (line 29) starts "open **Graphs**". The nav label `Graphs` (C1) matches it.
- GRR-17 names no file, route or test of this plan. No change to GRR-17 is needed.

### 7b. Parallel: GRR-10 (ngx-vflow adapter, `parallel_with` GRR-09)

- GRR-10 puts the canvas component under `:graphId` (`units/GRR-10-vflow-adapter.md` line 22). GRR-09 owns the `graphs` entry, the entry file `graph-runner.routes.ts` and the tablet-gated `:graphId` child route (GRR-09 unit lines 15 and 16; `plans/DECISIONS.md` line 2723: the route is GRR-09's, the component is GRR-10's; `modules/graph-runner.md` line 37: one lazy `Routes` array). GRR-10 owns only the component and the `loadComponent` of that child (OP-6). GRR-10 has no plan (section 3a), and its `blocked_by` does not name GRR-09, so this section gives the rule for both merge orders, anchored on text.
- **If GRR-09 merges first (the case this plan builds):** GRR-10 changes only the `loadComponent` of the `:graphId` child in `graph-runner.routes.ts`, replacing `CanvasPlaceholderPage`. It keeps the `canMatch: [deviceClassGuard('tablet')]` line, which is GRR-09's gate (D2), and it does not touch `app.routes.ts`.
- **If GRR-10 merges first (GRR-10 then had to create the entry file to host its component):** GRR-09 rebases onto GRR-10's `graph-runner.routes.ts`. It keeps GRR-10's `:graphId` loader, adds the `''` list child and the `canMatch` tablet gate where they are missing, and does not create `canvas-placeholder-page.ts`; X2 then asserts the gate text absent and the URL unchanged, and not the placeholder text. If GRR-10 already added a `graphs` entry to `app.routes.ts`, GRR-09 brings it to the form of step 6 instead of adding a second one; otherwise GRR-09 appends it after the `review` entry. Note for GRR-10's planner: the export name is `graphsRoutes`, and the `canMatch` line is GRR-09's.
- Either order leaves one `graphsRoutes` with a `''` list child and a tablet-gated `:graphId` child, and one `graphs` entry.

### 7c. Other plans and units that touch the same files

- **`plans/GRR-08.md` (planned).** Changes no code (its D4, line 20). No overlap in either order.
- **`plans/TRG-14.md` (planned).** Its line 95 lists `apps/web/src/app/app.routes.ts` as not changing. No overlap in either order.
- **`plans/SAU-22.md` (draft).** A grep finds no path of this plan. No overlap.
- **CEX-17 (manuscript route, no plan).** It appends its own `PROJECT_ROUTES` entry (`modules/shell.md` line 66; `plans/AGL-07.md` line 79). Both appends are anchored on text: each goes after the last entry on main and keeps the others (the rule is `plans/AGL-07.md` line 76; line 79 applies it to `PROJECT_ROUTES`). Either merge order is correct, and the second to merge rebases with no overlapping hunk.
- **In-progress branches.** None of the worktree branches changes `app.routes.ts`, `shell/index.ts`, `features/graph-runner`, `apps/api/src/modules/graph-runner` or `packages/contracts/src/graph-runner` (section 3a).
- **Shell barrel.** SHL-14 and SHL-15/16 add lines to `shell/index.ts`. GRR-09 adds none, so no overlap.
- **Done plans relied on.** `plans/GRR-02.md` (graph CRUD and list), `plans/GRR-04.md` (current run), the Project store's pending list (served on main; `plans/GRR-02.md` section 6, O1, names the PST-22 gate as done), `plans/SHL-09.md` (the Shell core gate, status `done`). Each is on main and unchanged by this plan.

## 8. Open points (all settled by the reviser; none is left for the Navigator)

Each point is settled with the simplest option that the unit, the module file and the code allow. No unit file, module file or criterion changes.

- **OP-1 What the tablet `:graphId` child shows before GRR-10. Decided: (a), a placeholder page** `CanvasPlaceholderPage` with `<p>The canvas is not built yet.</p>`. Reason: the Shell's `NotFoundPage` is not exported by `shell/index.ts` (lines 1 to 22), so (b) would need a Shell barrel change or a lint exception; (a) stays inside the feature folder, and GRR-10 replaces one `loadComponent`. Steps 3 and 4, X2.
- **OP-2 Run status for a recipe other than the latest run's. Decided: (a), the matching row only.** Reason: the unit names current-run-state as the source (unit line 15), which returns one run per project (`runs.ts` lines 110 to 113; GRR-04 unit line 25); (b) would add a read to the module and its contract, which no unit owns. Other recipe rows show no status. Step 5, C1.5, C2.1.
- **OP-3 Delete. Decided: (a), delete on click, no confirmation step.** Reason: the unit asks only for a delete action (line 17), and no criterion or module decision asks for a confirmation; it is the smallest UI. Step 5, C1.4.
- **OP-4 Rename. Decided: (a), the display name only, body `{name}`.** Reason: one input; the id (the file stem, module line 45) stays, so links to `/projects/:projectId/graphs/<id>` and the pending badge's `targetPath` keep working; `graphRenameSchema` accepts it (`catalog.ts` lines 42 to 45). Step 5, C1.3.
- **OP-5 Pending-badge refresh. Decided: (a), on load, after each command and on each reconcile tick.** Reason: the unit names only `graph-runner` events and reconcile ticks as refresh triggers (line 15); a pending change made while the page is open shows at the next tick or visit. Step 5 (C3).
- **OP-6 Who creates `graph-runner.routes.ts`. Decided: GRR-09.** Reason: the units settle the boundary: GRR-09 owns the route entry and the gated `:graphId` child (unit lines 15 and 16), GRR-10 owns only the canvas component under that child (GRR-10 line 22), as `plans/DECISIONS.md` line 2723 records. Section 7b gives the rule for both merge orders. Not a Navigator point: no unit text has to change.

## 9. Review parts

One part. The plan is small: six files and two criteria.

- **Part 1 (the whole unit).** Steps 0 to 11 (section 5). Tests: C1.1, C1.2, C1.3, C1.4, C1.5, C2.1, C2.2, X1, X2, X3 (section 6). Each step and each test is in this part only.
