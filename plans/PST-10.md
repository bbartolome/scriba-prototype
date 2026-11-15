---
id: PST-10
status: draft
---
# PST-10 plan — Files UI: tree, Markdown preview, read-only files until the editor lands

Batch: [PST-10] (Project store, phase:files, M1); batch of one. Revision 2 (the reviser's correction of the draft `3ababdd`). Written against `main` at `5f98249`; `main` is now `3ababdd`, which changes only this plan, so every code citation holds at both. The reviser re-read the citations at `3ababdd`. Section 0 lists what revision 2 changed. Section 7 lists the facts checked (file:line) and the assumptions. Nothing was built, installed, run or tested while this plan was written.

## 0. Revision 2 changes

- R1. **P2: the page is loaded with `loadComponent`, not `component`.** PST-09's `app.ts` imports `ActiveProjectNav` statically from `project-store.routes.ts` (`plans/PST-09.md` D4 and section 2, the `app.ts` row), so that file is in the main bundle once PST-09 merges. A static `component: FilesPage` would then put the page, its copies and the preview into the main chunk and fail step 5's lazy-chunk check. With `loadComponent` the entry file has no static import of the page, and the page is lazy in either merge order (PST-09 D3 does the same for the picker).
- R2. **Shared entry file: one conflict rule, correct in either merge order** (P2, section 3 steps 0, 3 and 7, section 5).
- R3. **Criterion 2 keeps the DOM seam (T9); decided, open point 5 closed.** Reason in section 4.
- R4. **Line and offset parameters: decided, not in this unit (open point 3 closed).** Reason in section 5.
- R5. **Criterion 3: no test in this PR; who owns it is a Navigator point (open point 1).** Steps 6 and 8 no longer tick criteria or set the status: the orchestrator does both when the unit goes to `main` (`prompt.md`, Step 3 item 8).
- R6. Step 0 uses the orchestrator's worktree and checks only the cited paths, so a unit that lands on `main` first (PST-09) does not stop it. Citation F26 corrected (the root comment is `files.service.ts` line 230).
- R7. Section 8, "Review parts", is added.

## 1. Decisions this plan follows

"Unit" means `units/PST-10-files-ui.md`. Each decision names its source. Items marked **(planner's choice)** are the small decisions this plan makes; each takes the simplest option that meets the unit and changes no settled decision and no criterion.

### 1.1 Unit decisions

- **U1. Route.** `/projects/:projectId/files`, project-scoped, minimum class `phone`; `?path=` opens a file. Source: unit line 15; `modules/shell.md` line 61.
- **U2. Tree.** A tree of the active project; dot-entries hidden. Source: unit line 16; `plans/PST-06.md` line 150 (the list hides dot-entries always, because the contract has no option for it).
- **U3. Editor timing.** On desktop and tablet the page uses the Shell's editor with direct save, but **until Shell `phase:editor` lands, files open read-only in the Shell's Markdown preview**; the editor is adopted in a follow-up PR. Source: unit line 17. Fact: `phase:editor` is SHL-13 to SHL-16 ("all four", `units/README.md` line 82). SHL-13 is `status: done` (`plans/SHL-13.md` line 3). SHL-14, SHL-15 and SHL-16 have no plan file on `main` (`ls plans` lists only `SHL-13.md` in that range), so the phase is not closed. Consequence: in this PR every device class gets the preview. The reviser confirmed this reading against the unit (line 17 and the milestone note on line 6, "editing at M3 when Shell phase:editor lands") and `units/README.md` line 69 (`phase:editor` has no gate unit and closes when all its units are merged). The Shell's editor on `main` (SHL-13) does not change the reading. Open point 1 is only about who owns criterion 3.
- **U4. Phone.** On the `phone` class the page switches to the read-only preview. Source: unit line 18. In this PR the preview is used on every class (U3), so the rule holds without a device branch.
- **U5. Refresh.** Refetches on `files-changed` for the active project. Source: unit line 19; `plans/PST-06.md` line 130 (W5); the event data `{projectId, paths}` is `filesChangedDataSchema` in `packages/contracts/src/project-store/events.ts` lines 13-16.
- **U6. Out of scope.** The draft version history is PST-21 and the search box is PST-14. Source: unit line 20.
- **U7. Criteria.** Three criteria, unit lines 23 to 25; section 4 maps each to tests. Criterion 3 ("when the editor is present") does not apply to this PR (U3); see open point 1.
- **U8. Blockers and inverses.** `blocked_by` (unit line 7) is `PST-06`, `SHL-09` and `SHL-11`; all three are `status: done` (`plans/PST-06.md`, `plans/SHL-09.md`, `plans/SHL-11.md` front matter). `unblocks` (line 9) is PST-12, PST-14 and PST-21, and each names PST-10 in its own `blocked_by` (`units/PST-12-files-gate.md` line 7; `units/PST-14-search-box-ui.md` line 7; `units/PST-21-version-history-ui.md` line 7). `parallel_with` (line 8) is PST-07, PST-08 and PST-09; PST-09 is the only one that changes the same files (section 5).

### 1.2 Module and Shell decisions

- **M1. GET never mutates.** Reads are GET and commands POST (`modules/project-store.md` line 45; `units/README.md` line 129). This page sends only GET (test T10).
- **M2. Routes.** `/api/project-store/…`; project-scoped ones are `projects/:projectId/…` (`modules/project-store.md` line 46). The paths are `PROJECT_FILES_ROUTE` (`packages/contracts/src/project-store/routes.ts` lines 14-15) and `PROJECT_FILE_ROUTE` (lines 16-17).
- **M3. Active-project rule.** A request names the project it expects; a non-active project fails (`modules/project-store.md` line 47). The page sits under `projects/:projectId`, which `activeProjectGuard` guards (`apps/web/src/app/app.routes.ts` lines 46-50; `apps/web/src/app/shell/active-project-guard.ts` lines 13-33).
- **M4. Paths in the UI.** Only project-relative paths appear (`modules/project-store.md` line 48).
- **M5. Feature registration.** A feature's UI lives in `apps/web/src/app/features/<m>/`; it exports one named `Routes` per owned path, and each route-table entry loads only its own export (`plans/SHL-01.md` line 28, decision 9; `plans/DECISIONS.md` line 953). For this path the export is `filesRoutes`.
- **M6. Route table row.** `/projects/:projectId/files` (`?path=<path>`), owner Project store, scope project, minimum class phone, nav yes (`modules/shell.md` line 61).
- **M7. Layout switch.** Pages with richer layouts declare `phone` and switch layout on the device-class signal (`modules/shell.md` line 68). This PR has no layout switch, because there is no editor to switch to (U3); the follow-up PR adds it.
- **M8. The Markdown preview.** The Shell's `app-markdown-preview`, input `content` (`apps/web/src/app/shell/markdown-preview.ts` lines 94-95). It hides a leading front-matter block and renders raw HTML as text (`markdown-preview.ts` lines 20-42 and 44-52, with the providers at lines 61-69). The Angular API table lists it for Project store (`modules/shell.md` line 83).
- **M9. Test seam.** External behaviour only; UI tests render lazy routes under Angular's Vitest runner against the fake API and the fake event source (`modules/project-store.md` lines 56-58; `units/README.md` line 136). No test reads `examples/` (`modules/project-store.md` line 58).
- **M10. Events and reconcile.** Events carry no replay; reconnecting clients reconcile through state endpoints (`units/README.md` line 131). Used by P8.

### 1.3 Other units and plans that shape this unit

- **O1. The page's reads.** `plans/PST-06.md` line 130: the page takes `entries` from the list, `content`, `hash` and `mtime` from read, shows the read refusals 413 `PROJECT_FILE_TOO_LARGE` and 415 `PROJECT_NOT_TEXT` in the preview (the list shows those files), refetches on `files-changed` and hides dot-entries.
- **O2. No write, no delete, no move.** `plans/PST-07.md` line 169: PST-10 uses the read and write routes only, and the unit asks for no delete or move in the UI (`modules/project-store.md` line 67).
- **O3. The editor later.** `plans/SHL-13.md` line 164: PST-10 adopts the editor later; `reference` is `{projectId, path}`, and a save sends `baseHash`. Until the editor lands PST-10 shows the preview read-only, and SHL-13 does not change PST-10's plan.
- **O4. Test beds.** `plans/SHL-11.md` line 246 and open point 3 there: a test bed for the preview needs no markdown provider (ASSUMED A2 below). If one is added it is `provideMarkdown(...)` only, not `appConfig.providers`, because `appConfig` puts `APP_ROUTES` ahead of the test's own routes.
- **O5. Links into the page.** `plans/SHL-10.md` line 84: the Shell's source links are `/projects/<id>/files?path=<path>`, built with `routerLink` `['/projects', id, 'files']` and `queryParams` `{path}`. The page must accept exactly that form.
- **O6. The shared entry file.** `plans/PST-09.md` (revision 2) line 138: PST-09 adds `projectsRoutes` and the `ActiveProjectNav` export to `apps/web/src/app/features/project-store/project-store.routes.ts`, does not touch `PROJECT_ROUTES`, and says either merge order is correct. PST-09 edits `APP_ROUTES` above `'**'` (line 76), so the two plans share no line in `app.routes.ts`. The shared file is handled in section 3, steps 3 and 7.
- **O7. Precedent for the test route table.** `apps/web/src/app/features/agent-loop/chat-page.spec.ts` lines 82-87: a route table `{ path: 'projects/:projectId', children: PROJECT_ROUTES }` plus `provideMarkdown({ sanitize: ... })`. This plan's spec copies that setup.

### 1.4 Planner's choices (simplest option; none changes a settled decision or a criterion)

- **P1. The route entry.** One entry in `PROJECT_ROUTES` after the `chat` entry (`apps/web/src/app/app.routes.ts` line 24), shaped like the `setup` entry (lines 64-75):
  `path: 'files'`, `pathMatch: 'full'`, `data: { scope: 'project', minDeviceClass: 'phone', nav: { label: 'Files', icon: 'folder', order: 30 } } satisfies ShellRouteData`, and `loadChildren` of `filesRoutes` from `./features/project-store/project-store.routes`. The order 30 is free on `main`: chat is 10 (`app.routes.ts` line 18), PST-09 plans 20 for `projects` (`plans/PST-09.md` D2), and core-gate is 100 (line 57). The nav sorts by `order` (`apps/web/src/app/shell/app-nav.ts` line 188).
- **P2. The entry file.** `project-store.routes.ts` exports `filesRoutes: Routes = [{ path: '', pathMatch: 'full', loadComponent: () => import('./files-page').then((m) => m.FilesPage) }]`. The file has no static import of `FilesPage` (R1): PST-09's `app.ts` imports this file statically, so a static page import would land in the main chunk. This is the form PST-09 uses for `projectsRoutes` (`plans/PST-09.md` D3). It is the feature's only file that other code imports (ESLint boundaries, `eslint.config.mjs` lines 61-66).
  **Conflict rule for this file (both merge orders).** The file after both units merge holds, in this order: the `Routes` import; PST-09's own imports; `projectsRoutes`; `filesRoutes`; PST-09's `export { ActiveProjectNav }` line. Whichever unit merges second keeps every line of the other unit and adds only its own lines. Neither unit changes the other's export. If PST-10 merges first, the file holds only the `Routes` import and `filesRoutes`, and PST-09's rebase adds its lines (PST-09 section 5 says the same). If PST-09 merges first, step 3 adds only `filesRoutes` (no import line is needed, because `loadComponent` imports the page dynamically).
- **P3. The component.** `FilesPage` in `files-page.ts`, standalone, selector `app-files-page`.
- **P4. The tree.** One recursive list call, `GET …/files?path=.&recursive=true`. The root is `.`: the path check refuses `''` (`apps/api/src/modules/project-store/path-safety.ts` lines 123-125), `files.service.ts` line 230 names `.` as the root, and the API tests list `.` (`apps/api/test/project-store-files-read.test.ts` line 144). The rows are sorted by path **segment**, not by the server's string order. The server sorts whole strings (`files.service.ts` lines 232-256), and `-` (0x2D) sorts before `/` (0x2F), so `drafts-old` would sort between `drafts` and `drafts/ch1.md` and break the grouping. Rows are one flat list indented by depth, with no collapse state. A row with a dot segment is dropped; the API already skips them (`files.service.ts` line 577), so this is a defence only.
- **P5. The preview.** A file opens in `app-markdown-preview` on every device class (U3). The page does not import `MarkdownEditor`.
- **P6. Selection.** The selected file is the `?path=` query value, read through `ActivatedRoute`. A file row is a link with `queryParams` `{path}`. A directory row is not a link. A `?path=` that names a directory gets the server's not-found answer (`files.service.ts` lines 135-141), which the page shows.
- **P7. Reading and errors.** `GET …/file?path=<path>` with `readCopy` and `projectFilePath` from `apps/web/src/app/shell/project-store-copies.ts` (lines 119 and 84). The Shell index does not export them (`shell/index.ts` lines 1-21), so the page imports them from that file, as features already import Shell internals (P11). An `ApiError` shows its `message` verbatim in an element with `role="alert"`. Any other error shows `The request failed.`, the rule of `shell/switch-project.ts` lines 117-118.
- **P8. Refresh.** The tree refetches on a `files-changed` whose `projectId` is the URL's project (`ActiveProjectSignal`, `shell/project-scope.ts` lines 75-84), and on each reconcile tick (`SSE_CLIENT.reconcile$`, `shell/sse-client.ts` line 59). The tick refresh is this plan's addition, on the convention of M10; test T7 covers it, and the reviser confirmed it (open point 6). The open file is read again when a `files-changed` names its path. Requests are switched with `switchMap`, so an older reply cannot replace a newer one.
- **P9. Copies.** A new file `files-contract.ts` (not `project-store-contract.ts`, which PST-09 creates, so the two files never collide). It holds `projectFilesPath(projectId)`, built from `PROJECT_FILES_ROUTE` with the id encoded, and `fileListCopy`, a hand copy of `fileListSchema` (`packages/contracts/src/project-store/files.ts` lines 15-30). The UTC `mtime` check is the pattern of `shell/project-store-copies.ts` lines 102-108, copied. Features copy the schemas by hand and import only types from the contract (`plans/PST-09.md` D7). The Shell's one dynamic contract load is for setup-auth (`shell/contract-chunks.ts` lines 1-5), so the page's bundle must not import the contract at run time. The spec imports the schema at run time, as `shell/project-store-copies.spec.ts` does.
- **P10. Nav data.** Label `Files`, icon `folder` (Material; the bundled font is not checked, A3).
- **P11. Shell files.** The only Shell file this unit edits is `app.routes.ts`. The boundaries rule restricts features only (`eslint.config.mjs` lines 61-66), and features already import Shell internals (`apps/web/src/app/features/providers/providers-copies.spec.ts` line 20; `features/setup-auth/setup-page.spec.ts` line 26).
- **P12. Test route table.** `provideRouter([{ path: 'projects/:projectId', children: PROJECT_ROUTES }])` with `provideMarkdown({ sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML } })`, as O7 shows. The guard is not in these tests; it is already covered by the existing route specs, and T11 uses the real `PROJECT_ROUTES` entry.
- **P13. Phone test.** `stubMatchMedia(390, 844)` before TestBed, `restoreMatchMedia()` in `afterEach` (`shell/testing/match-media.ts` lines 67 and 99; `chat-page.spec.ts` lines 323-324).
- **P14. Layout slots.** A heading `Files`; the tree in a `<ul aria-label="Project files">`; the preview beside it on a wide screen and under it on a phone, with plain CSS. PST-14 puts its search box above the tree, and PST-21 puts its panel beside the preview (section 5). The empty state reads `Choose a file in the tree to read it.`

## 2. Files to create or change

Only the paths below change. Nothing under `packages/contracts/`, `apps/api/`, `e2e/`, `examples/`, `modules/`, `units/` or `plans/` changes, except `plans/PST-10.md` in this planning step.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/project-store/files-page.ts` | new | `FilesPage`, selector `app-files-page`: the tree, the read-only preview and the refreshes (P3 to P8, P14) |
| `apps/web/src/app/features/project-store/files-contract.ts` | new | `projectFilesPath`, `fileListCopy` (P9) |
| `apps/web/src/app/features/project-store/project-store.routes.ts` | new when PST-09 is not on `main`; an edit when it is | exports `filesRoutes` with `loadComponent` (P2); if the file exists, keeps every line it has and follows the conflict rule of P2 (O6) |
| `apps/web/src/app/app.routes.ts` | edit: one `files` entry inserted after the `chat` entry (lines 12-24), before the `];` on line 25 | P1 |
| `apps/web/src/app/features/project-store/files-page.spec.ts` | new | tests T1 to T11 (section 4) |
| `apps/web/src/app/features/project-store/files-contract.spec.ts` | new | tests K1 and K2 (section 4) |
Not changed by the implementer: the contract, the API, the e2e specs, the Shell's other files, `units/`, `plans/`. The checkboxes of `units/PST-10-files-ui.md` and the plan's `status: done` are set by the orchestrator when the unit goes to `main` (`prompt.md`, Step 3 item 8).

## 3. Method

Run from the repository root. Record `node -v` and `npm -v` with each result (expected: `v26.x` and `11.20.0`). Do not push, add a remote or open a pull request. Do not run the dev servers (`npm run dev`). Stage files by path only; do not use `git add -A` or `git commit -a`. Use one worktree of `unit/PST-10` for the whole unit.

0. **Precondition.** Work in the worktree of `unit/PST-10` that the orchestrator gives; run `npm ci` in it. Run `git diff --stat f0c9b15 HEAD -- apps/web packages/contracts/src/project-store apps/api/src/modules/project-store eslint.config.mjs`. If it prints nothing, every citation holds. If it prints files (for example PST-09's, if it merged first), re-check the citations of section 7 in those files; if a cited line has moved, use its new place; if a cited fact no longer holds, stop and report. Then run `npm run build -w @bbartolome/scriba-contracts`, because K1 and K2 import the contract at run time. Expected: both exit 0, and `ls packages/contracts/dist/project-store/index.js` lists the file. Check whether `apps/web/src/app/features/project-store/project-store.routes.ts` exists in the worktree, and record the answer, because step 3 depends on it.
1. **Red tests.** Create `files-contract.spec.ts` (K1, K2) and `files-page.spec.ts` (T1 to T11) as section 4 describes. Run `npm test -w @bbartolome/scriba-web`. Expected: the two new specs fail because their modules do not exist, and every existing spec passes. Commit with `test(PST-10): add the red tests of the files page`.
2. **Copies.** Create `files-contract.ts` (P9). Run K1 and K2. Expected: green.
3. **Page and entry.** Create `files-page.ts` (P3 to P8, P14). Then the entry, by the state recorded in step 0:
   - If `project-store.routes.ts` does not exist, create it with the `Routes` import and `filesRoutes` only (P2).
   - If it exists (PST-09 is on `main`), add `filesRoutes` after `projectsRoutes` and before the `ActiveProjectNav` export, and keep every existing line (the conflict rule of P2).

   Run T1 to T10 (T11 waits for step 4). Expected: green. If T3 fails only because the preview needs a provider, add the provider to the test bed as P12 says, not to `appConfig.providers`, and record it in the commit message body.
4. **Shell wiring.** Insert the `files` entry (P1) after the `chat` entry, in `PROJECT_ROUTES` of `apps/web/src/app/app.routes.ts`. Run T11, then the whole web suite. Expected: exit 0; `app.routes.spec.ts` still renders not-found for an unknown project sub-path; `app-nav.spec.ts` and `chat-page.spec.ts` still pass. Commit with `feat(PST-10): add the files page and its route`, staging the files by path.
5. **Format, lint and build.** Run `npx prettier --write apps/web/src/app/features/project-store apps/web/src/app/app.routes.ts`. Then run `npm run lint` at the root and `npm run build -w @bbartolome/scriba-web`. Expected: lint exits 0 and ends with `All matched files use Prettier code style!`; the build exits 0. Check that the page's empty-state text is in a lazy chunk and not in the main chunk: `grep -l "Choose a file in the tree" apps/web/dist/scriba-web/browser/*.js` must list a file that is not the main chunk (A5). Record the outputs.
6. **Criteria.** Do not edit `units/PST-10-files-ui.md`. Report criteria 1 and 2 with the outputs of T1 to T4 and T9, and report criterion 3 as not tested in this PR (section 4). The orchestrator ticks the checkboxes when the unit goes to `main`.
7. **Rebase (if the orchestrator asks for it).** If PST-09 merged after this branch was made, `project-store.routes.ts` has an add/add conflict. Resolve it by the conflict rule of P2: keep every line of PST-09 (its imports, `projectsRoutes`, the `ActiveProjectNav` export) and add `filesRoutes`; no import line is added for the page. If `app.routes.ts` conflicts, keep both entries (PST-09's is above `'**'` in `APP_ROUTES`, this unit's is in `PROJECT_ROUTES`). Then rerun steps 4 and 5, including the lazy-chunk check. Expected: exit 0 each time, and the empty-state text is still outside the main chunk.
8. **Record.** Store the commit hashes and the output of each command. The plan's status is set by the orchestrator.

## 4. Acceptance criteria and tests

The unit has three criteria (unit lines 23 to 25). Criteria 1 and 2 each have their tests here (C1: T1 to T4; C2: T9); criterion 3 has none in this PR (open point 1). The other tests are supporting checks. The test ids are used in sections 5 and 8. All tests run with `npm test -w @bbartolome/scriba-web` after the contract build. The tests are DOM tests with the fakes of M9 (`apps/web/src/app/shell/testing/test-doubles.ts`: `FakeApiClient` at line 43, `respond` at line 49, `fail` at line 54, `FakeEventSource` at line 110, `push` at line 129, `tick` at line 159, `createShellTestDoubles` at line 187).

| Criterion | Test | Pass condition |
|---|---|---|
| C1a "tree renders from list" (unit line 23) | T1 | the rows, in order, are `drafts`, `ch1.md`, `drafts-old`, `ch0.md`, `sources`, `outline.md`; `.scriba` is absent; the list request has params `{path: '.', recursive: 'true'}` |
| C1b "`?path=` opens that file" | T2 | the file request has params `{path: 'sources/outline.md'}`; the preview shows the heading `Outline`; the `outline.md` row has `aria-current="page"` |
| C1c "preview renders Markdown" | T3 | `app-markdown-preview` shows an `h1` with `Chapter One` and two list items `first` and `second` |
| C1d "a `files-changed` event refreshes the tree" | T4 | after a `files-changed` for `p1` with `paths: ['sources/new.md']`, the row `new.md` appears and the list was requested twice |
| C2 "Phone viewport: read-only preview, no editor" (unit line 24) | T9 | at 390 by 844, the file shows in the preview; `app-markdown-editor` is absent from the DOM; no button named `Save` |
| C3 "When the editor is present" (unit line 25) | none in this PR | Its condition is false in this PR (U3: the editor is adopted only after Shell `phase:editor` closes). No test is written here, and the criterion is not reported as passed. Who owns it is the Navigator point of open point 1. The test it needs, wherever it lands: against the fake API, a save sends `baseHash` equal to the hash of the last read or save; a canned `PROJECT_WRITE_CONFLICT` shows the warning, and the editor text stays as typed |
| Extra: read refusals shown (O1) | T8 | for 404, 413 and 415, the message appears in `role="alert"` and no preview is shown |
| Extra: GET only (M1) | T10 | every request recorded in T2, T4 and T7 has `method: 'GET'` |
| Extra: nav entry (M6, P1) | T11 | with the real `PROJECT_ROUTES`, the nav at 390 by 844 has a link `a[href="/projects/p1/files"]` with text `Files` |

The tests are these; each one's setup is stated so that the implementer writes it directly.

- **T1** (desktop, 1280 by 800). The fake list returns eight entries, each with `size`, `mtime` and `kind`: `drafts` (dir), `drafts/ch1.md` (file), `drafts-old` (dir), `drafts-old/ch0.md` (file), `sources` (dir), `sources/outline.md` (file), `.scriba` (dir) and `.scriba/state.json` (file). The `drafts-old` sibling checks the segment sort of P4.
- **T2.** The route is `/projects/p1/files?path=sources/outline.md`. The fake file read returns `{path, content: '# Outline\n\nThe rain began at noon.\n', hash, mtime}`, with `hash` `sha256:` and 64 lowercase hex digits and `mtime` in UTC with `Z`.
- **T3.** The content is `# Chapter One\n\n- first\n- second\n`. The test waits for the asynchronous render (the `settle` helper of `chat-page.spec.ts` lines 70-74).
- **T4.** The first list is `sources` and `sources/outline.md`. The second list adds `sources/new.md`. The test pushes `{module: 'project-store', type: 'files-changed', data: {projectId: 'p1', paths: ['sources/new.md']}}`.
- **T5.** As T4, but the push names project `p2`. The list request count stays at one.
- **T6.** The file `sources/outline.md` is open. The fake's file answer changes, and the push names `sources/outline.md`. The file request count becomes two and the new heading shows.
- **T7.** As T2, then `doubles.events.tick('reopen')`. The list request count becomes two, and the file is read again.
- **T8.** Three runs, each with `fail('GET', <file path>, new ApiError(status, code, message))`, for 404 `PROJECT_NOT_FOUND`, 413 `PROJECT_FILE_TOO_LARGE` and 415 `PROJECT_NOT_TEXT`. The message the fake gives must appear verbatim.
- **T9.** Phone, as T2. `stubMatchMedia(390, 844)` is set before TestBed is configured, and `restoreMatchMedia()` runs in `afterEach`.
- **T10.** After T2, a push and a tick, `api.requests` holds only GET entries.
- **T11.** A test bed with `provideRouter([{ path: 'projects/:projectId', children: PROJECT_ROUTES }])`. The page is opened at `/projects/p1/files`, and `AppNav` is created in the same injector at 390 by 844 (A6).
- **K1.** `fileListCopy` accepts and refuses the same fixtures as `fileListSchema`. Accepted: `{entries: []}`, and a list with one dir entry and one file entry with a fractional-second UTC `mtime`. Refused: `{}`; a kind `link`; a `size` of -1; a `size` of 1.5; an `mtime` with no `Z`; `entries` that is not an array.
- **K2.** `projectFilesPath('my book')` equals `PROJECT_FILES_ROUTE` with `:projectId` replaced by `my%20book`.

**Criterion 2's seam (decided).** T9 is the criterion test, a DOM test under Angular's Vitest runner. Reasons: (1) the criterion heading (unit line 22) has no seam parenthetical, so the module's default UI seam applies (`units/README.md` lines 57 and 136; `modules/project-store.md` line 57); (2) the criterion names which view renders ("read-only preview, no editor"), a fact of the DOM, not a layout fact such as fit or reachability; (3) the app takes the phone class only from `matchMedia` through the CDK `BreakpointObserver` (`shell/device-class.ts` lines 1 and 57-60), and `stubMatchMedia(390, 844)` feeds that same input. PST-09's criterion ("all actions reachable") and SAU-06's ("renders all of it") are layout facts, which is why those moved to e2e (`plans/PST-09.md` R1; `plans/DECISIONS.md` line 2872); that reason does not apply here, so the DOM seam does not weaken criterion 2.

## 5. Downstream agreement

- **PST-12, the files gate** (`units/PST-12-files-gate.md` line 7 names PST-10). Needs the route under Setup & auth's guard: the entry sits under `projects/:projectId`, which `app.routes.ts` lines 46-50 guard, and this plan does not change that. Needs the page to be GET-only (T10). Demo step 3, "browse `sources/outline.md` in files (read-only preview at M1)", is met by T2 and P5.
- **PST-14, the search box** (`units/PST-14-search-box-ui.md` line 7 names PST-10 and PST-13). Needs a place for the search box above the tree (P14), and a selected result must open `?path=` (P6, met). Its "scrolled near the passage offset" is PST-14's own decision (PST-14 unit line 17); its criterion 1 asks only that "selecting a result opens that path" (line 21), which `?path=` meets. PST-10's decision "`?path=` opens a file" (unit line 15) does not forbid a further query parameter, so PST-14 adds its offset parameter and the scroll when it edits `files-page.ts`; nothing in PST-10 is in its way (decided, open point 3).
- **PST-21, the version history** (`units/PST-21-version-history-ui.md` line 7 names PST-10). Needs the selected path from `?path=` (P6) and the refresh on `files-changed` (P8). Its panel goes beside the preview. PST-21 edits `files-page.ts`, which PST-14 also edits; the two plans must rebase in order.
- **The editor follow-up** (U3; `plans/SHL-13.md` line 164). Replaces the preview on desktop and tablet with `app-markdown-editor`. Its input `reference` is `{projectId, path}` and its `readOnly` input is in `markdown-editor.ts` lines 84-89. The editor already sends `baseHash` on save (`markdown-editor.ts` line 139) and maps `PROJECT_WRITE_CONFLICT` to the conflict state (line 44). On phone the preview stays (M7). No unit names the owner of this follow-up (open point 1, for the Navigator).
- **CEX-17, GRR-14, AGL-09 and SHL-10** link into the page with `/projects/<id>/files?path=…` (`units/CEX-17-manuscript-route-outline.md` line 18; `units/GRR-14-story-view-arrange.md` line 25; `units/AGL-09-narrative-tools.md` line 21; `plans/SHL-10.md` line 84). All of them use `?path=` only, which this page accepts (O5).
- **CEX-18, the preflight panel** links to "`/projects/:projectId/files?path=…` with line" (`units/CEX-18-preflight-export-panels.md` line 15). CEX-18 is not downstream of PST-10 (its `blocked_by` is `[CEX-17, CEX-05, CEX-10, CEX-14]`, line 7), its criteria do not test the line, and the line is CEX-18's own decision; like PST-14, it can add a parameter without a change to PST-10 (decided, open point 3).
- **PST-09, the picker** (revision 2, `plans/PST-09.md` line 138). Either merge order is correct. The two plans share the file `project-store.routes.ts` (O6) and no line of `app.routes.ts`, because PST-09 edits above `'**'` (line 76) and this plan edits `PROJECT_ROUTES` (lines 12-24). The second merge follows the conflict rule of P2 (section 3, steps 3 and 7); PST-09 section 5 states the same rule from its side ("keeps every line PST-10 added"). PST-09's plan calls the entry file "new"; if this unit merges first, PST-09's rebase meets an add/add conflict and resolves it by that rule. `filesRoutes` uses `loadComponent` (R1), so PST-09's static `app.ts` import of the entry file pulls no PST-10 code into the main chunk, and PST-09's own lazy-chunk check (`plans/PST-09.md` step 8) is not affected.
- **SHL-15, SHL-16 and SHL-19.** No change from this unit.

## 6. Open points

1. **Criterion 3 and its owner (U3, U7) — for the Navigator.** The gate reading is confirmed (U3): `phase:editor` closes only when SHL-13 to SHL-16 are all merged (`units/README.md` lines 69 and 82), so this PR shows the preview on every class and does not use the editor. Criterion 3 ("When the editor is present") is therefore not tested in this PR. The unit gives the editor to "a follow-up PR ... (not blocking this unit)" (unit line 17), but no unit owns that PR, and a unit is one PR (`units/README.md` line 3). A split to a subunit would get `phase:files` (the split rule), but the gate PST-12 "waits on the rest" of its phase (`units/README.md` line 69) and must not wait on Shell `phase:editor` (M3). The Navigator decides; the code of this PR is the same under each option, only the fate of criterion 3 differs.
2. (Merged into point 1.)
3. **Line and offset parameters — decided: not in this unit.** PST-14's offset (its decision, line 17) and CEX-18's line (its decision, line 15) belong to those units; PST-14's criterion 1 needs only the path, CEX-18 is not downstream of PST-10, and PST-10's `?path=` decision does not forbid a second parameter. No unit change (section 5).
4. **The shared entry file — decided:** the conflict rule of P2, correct in either merge order, with `loadComponent` (R1). PST-09's plan is in the pipeline and is not changed; its section 5 already keeps every line of the other unit.
5. **Criterion 2 seam — decided: the DOM test T9** (section 4, "Criterion 2's seam").
6. **Planner's choices — confirmed by the reviser.** The nav order 30 (free: chat 10, PST-09's `projects` 20, core-gate 100), the label `Files` and the icon `folder` (P1, P10; A3). The reconcile-tick refresh (P8, test T7), the same rule as PST-09's D8. The flat, indented tree with no collapse (P4). Non-Markdown files, such as `project.yaml`, are shown through the Markdown preview (U3 says the preview).
7. **Bottom nav width (risk).** The phone bottom bar gains one item. No test in this unit checks the fit at 390 px; the phone pass of SHL-19 covers it.

## 7. Facts checked and assumptions

### Facts checked (file:line, read on `main` at `5f98249`; no code path changed since `f0c9b15`)

Unit and blockers:
- F1. `units/PST-10-files-ui.md`: front matter lines 2 to 9 (`phase` line 5, `milestone` line 6, `blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); decisions lines 15 to 20; criteria lines 23 to 25.
- F2. `plans/PST-06.md`, `plans/SHL-09.md`, `plans/SHL-11.md`, `plans/SHL-13.md` front matter: `status: done`. `plans/PST-07.md` and `plans/PST-08.md`: `status: done`. `plans/PST-09.md` (revision 2): `status: planned`. `plans/MPR-08.md`: `status: planned` (no file overlap with this unit).
- F3. `ls plans` lists `SHL-13.md` and no `SHL-14.md`, `SHL-15.md` or `SHL-16.md`. `units/README.md` line 82: the `phase:editor` row, "SHL-13 … SHL-16, all four".
- F4. `units/PST-12-files-gate.md` line 7 (`blocked_by` names PST-10); `units/PST-14-search-box-ui.md` line 7 (`[PST-10, PST-13]`); `units/PST-21-version-history-ui.md` line 7 (`[PST-10, PST-18, SHL-12]`).

Route table and shell code:
- F5. `apps/web/src/app/app.routes.ts`: comment lines 7 to 10; `PROJECT_ROUTES` lines 11 to 25 with the `chat` entry at lines 12 to 24 (its `order: 10` at line 18); `APP_ROUTES` line 31; `setup` entry lines 64 to 75; `projects/:projectId` entry lines 46 to 50 with `canActivate: [activeProjectGuard]`; `core-gate` nav `order: 100` at line 57; `'**'` at line 76; `ShellRouteData` imported at line 5.
- F6. `apps/web/src/app/shell/index.ts`: line 2 (`ShellRouteData`), line 3 (`API_CLIENT`, `SSE_CLIENT`), line 4 (`ApiPath`, `ResponseSchema`), line 5 (`ApiError`), line 11 (`ActiveProjectSignal`), line 12 (`MarkdownPreview`), line 14 (`MarkdownEditor`). The copies of `project-store-copies.ts` are not exported.
- F7. `apps/web/src/app/shell/project-store-copies.ts`: lines 11 to 12 (the header: checked by the spec), line 15 (`ACTIVE_PROJECT_PATH`), line 77 (`PROJECT_FILE_PATH`), line 84 (`projectFilePath`), line 102 to 108 (the UTC pattern), line 119 (`readCopy`).
- F8. `apps/web/src/app/shell/project-scope.ts` lines 75 to 84 (`ActiveProjectSignal`). `apps/web/src/app/shell/active-project-guard.ts` lines 13 to 33.
- F9. `apps/web/src/app/shell/sse-client.ts` line 59 (`reconcile$`), line 78 (`stream(slug)`).
- F10. `apps/web/src/app/shell/markdown-preview.ts`: lines 20 to 42 (`stripFrontMatter`), 44 to 52 (`escapeHtml`), 59 (`@Component`), 61 to 69 (`providers`: `MarkdownService`, `MARKED_OPTIONS`), 94 (class), 95 (`content` input).
- F11. `apps/web/src/app/shell/markdown-editor.ts`: line 44 (`WRITE_CONFLICT`), 84 (class), 85 to 89 (inputs and outputs), 139 (save body `{ path, content, baseHash }`).
- F12. `apps/web/src/app/shell/api-error.ts` line 10 (`ApiError extends Error`, with `status`, `code`, `details`).
- F13. `apps/web/src/app/shell/switch-project.ts` lines 117 to 118 (`messageOf`: the message of an `Error`, else `The request failed.`).
- F14. `apps/web/src/app/shell/app-nav.ts` lines 52 to 73 (`navItems`), line 167 (the `nav-project` slot), line 188 (sort by `order`).
- F15. `apps/web/src/app/shell/device-class.ts` line 128 (`deviceClassGuard`), lines 139 to 148 (`withDeviceGate`; the comment on the gated route).
- F16. `apps/web/src/app/shell/testing/test-doubles.ts`: lines 43, 49, 54, 110, 129, 159, 187 (see section 4). `apps/web/src/app/shell/testing/match-media.ts`: line 67 (`stubMatchMedia`), line 99 (`restoreMatchMedia`).
- F17. `apps/web/src/app/features/agent-loop/agent-loop.routes.ts` lines 4 to 7 (`chatRoutes`); `features/setup-auth/setup-auth.routes.ts` lines 4 to 6 (`setupRoutes`).
- F18. `apps/web/src/app/features/agent-loop/chat-page.spec.ts` lines 82 to 87 (the test route table and `provideMarkdown`), 70 to 74 (`settle`), 323 to 324 (the phone stub).
- F19. `apps/web/src/app/features/providers/providers-copies.spec.ts` line 20 and `features/setup-auth/setup-page.spec.ts` line 26 (features importing Shell internals).
- F20. `eslint.config.mjs` line 34 (element `web-feature`), lines 40 to 41 (the entry patterns), lines 61 to 66 (the feature policy R1).
- F21. `apps/web/package.json` name `@bbartolome/scriba-web`; `apps/web/package.json` line 8, `"test": "ng test --watch=false"`. Root `package.json` line 26 (`lint`).

Contract and API:
- F22. `packages/contracts/src/project-store/routes.ts` lines 14 to 15 (`PROJECT_FILES_ROUTE`), 16 to 17 (`PROJECT_FILE_ROUTE`); `index.ts` re-exports all of them.
- F23. `packages/contracts/src/project-store/files.ts` lines 15 to 18 (`fileEntrySchema`), 23 to 26 (`fileListQuerySchema`, `recursive` as `stringbool`), 28 to 30 (`fileListSchema`), 33 to 39 (`fileReadSchema`).
- F24. `packages/contracts/src/project-store/events.ts` lines 13 to 16 (`filesChangedDataSchema`), lines 42 to 46 (the `files-changed` member).
- F25. `apps/api/src/modules/project-store/files.controller.ts` line 35 (`fileReadQuerySchema`), lines 43 to 49 (list), 51 to 57 (read).
- F26. `apps/api/src/modules/project-store/files.service.ts`: line 230 (the root is `.`), lines 232 to 256 (`list`; entries sorted by whole path string), lines 135 to 150 (`readFileAt`: a directory or a missing file is `PROJECT_NOT_FOUND`, lines 140 to 141; over 5 MB is `PROJECT_FILE_TOO_LARGE`), 257 to 270 (`read`), 344 to 346 (`files-changed` after delete), 381 to 383 (after move), 558 to 560 (in `commit`, which `write` at line 289 and `edit` at line 319 call), 577 (dot-entries skipped).
- F27. `apps/api/src/modules/project-store/path-safety.ts` lines 123 to 125 (an empty path is refused).
- F28. `apps/api/test/project-store-files-read.test.ts` line 144 (the list with `.`).

Plans and decisions:
- F29. `plans/PST-06.md` lines 130 and 150. `plans/PST-07.md` line 169. `plans/SHL-13.md` line 164. `plans/SHL-11.md` line 246 (open point 3, A16). `plans/SHL-10.md` line 84. `plans/PST-09.md` line 138 (revision 2) and D2 (the order 20).
- F30. `plans/DECISIONS.md` line 953 (the approved rule: one named `Routes` export per owned path, `filesRoutes` among them). `plans/DECISIONS.md` line 2872 (a phone viewport criterion needs a real viewport; the e2e placement). `plans/SHL-01.md` line 28 (decision 9).
- F31. `modules/shell.md` lines 45 (feature UIs), 61 (route row), 68 (richer layouts and the device-class switch), 83 (Markdown preview row). `modules/project-store.md` lines 40, 45 to 48, 56 to 58, 67. `units/README.md` lines 82, 129, 131, 136.
- F32. `e2e/specs/journey.e2e.ts`: the owner comments at lines 34, 68, 72, 75 and 78 name no PST-10 step.
- F33. Git: `git log --oneline -3` at `5f98249`; `git diff --stat f0c9b15 HEAD` lists only `plans/PST-09.md` and `plans/QUEUE.md`.

### Assumptions (not verified by running anything)

- A1. The two new specs run under the same Angular Vitest setup as the existing ones (precedent: `chat-page.spec.ts`).
- A2. The preview renders in a test bed with the fakes and the P12 provider only. `node_modules/ngx-markdown/fesm2022/ngx-markdown.mjs` line 120 injects `HttpClient` optionally, and line 157 injects `MARKED_OPTIONS` optionally, so no HTTP provider is needed. Read in the source, not run; step 3 checks it.
- A3. The Material icon `folder` is in the bundled font. Not checked.
- A4. `RouterTestingHarness.create('/projects/p1/files?path=sources/outline.md')` parses a slash in the query value. Not run. If it does not, the probe in step 1 switches to `%2F`.
- A5. The production build writes the browser chunks under `apps/web/dist/scriba-web/browser/`, as `plans/PST-09.md` step 8 assumes. Not checked.
- A6. `TestBed.createComponent(AppNav)` renders links from the test router's config (precedent: `shell/app-nav.spec.ts` renders the nav). Not run.
- A7. Node 26 and npm 11.20.0 are on the PATH (`plans/PLT-02.md` section 3). Not checked here.

## 8. Review parts

- **Part 1 (the whole unit; a small plan has one part).** Steps 0 to 8 of section 3. Tests: criterion 1 (T1 to T4), criterion 2 (T9), and the supporting checks T5 to T8, T10, T11, K1, K2, the lint and build of step 5 and its lazy-chunk check. Criterion 3 has no test in this PR (section 4; open point 1). The reviewer also checks that the code changes only the files of section 2, that `filesRoutes` uses `loadComponent` with no static import of `FilesPage` (P2, R1), and that `units/` and `plans/` are not changed.
