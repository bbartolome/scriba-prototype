---
id: PST-21
status: draft
unit: units/PST-21-version-history-ui.md
sources: units/PST-21-version-history-ui.md (20 lines, no change note; its only commit is 2fed3f4); units/README.md; modules/project-store.md; modules/shell.md; units/PST-22-review-gate.md; units/PST-10 to PST-20 and PST-23 front matter by grep; plans/PST-10.md, PST-14.md, PST-18.md, PST-19.md, PST-34.md, SHL-12.md, AGL-18.md (done, read for the files page, the API and the Shell); plans/PST-20.md (planned, overlap in section 6); plans/TRG-14.md and plans/SAU-22.md (planned and draft, file tables); plans/DECISIONS.md lines 941, 2557, 4086 to 4092, 4886 to 4895 (grep by PST-21 and PST-22); plans/PLT-02.md and plans/PST-20.md (structure); packages/contracts/src/project-store/{routes,drafts,events,index}.ts; apps/api/src/modules/project-store/{draft-versions,draft-versions.controller,draft-versions.service,pending.service,files.service}.ts; apps/web/src/app/features/project-store/{files-page,files-page.spec,files-contract,files-contract.spec,project-store.routes}.ts; apps/web/src/app/shell/{index,diff-view,device-class,api-client,project-store-copies,testing/test-doubles,testing/match-media}.ts; e2e/specs/search-phone.e2e.ts
---
# PST-21 plan - draft version history in the files page

Base: `main` at `8319213` (`git rev-parse --short HEAD`). The tree was clean (`git status --short` printed nothing). The planner read the sources above and checked the cited lines with reads and grep only. It ran no build, test or install, and changed no file except this one.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the Shell and the done plans

- **Scope.** In the files page, a top-level draft shows its version history: the list, a version's view, the diff of a version against the current draft (the Shell's read-only diff), and restore with confirmation. Source: unit line 15.
- **Refresh.** The history refreshes on `files-changed`. Source: unit line 16.
- **Blockers.** PST-10, PST-18 and SHL-12 (unit line 7). All three are `status: done` (`plans/PST-10.md`, `plans/PST-18.md`, `plans/SHL-12.md` front matter). The unit is therefore available.
- **Parallel units.** PST-19, PST-20 and PST-23 (unit line 8) name PST-21 back in their `parallel_with` (PST-19 line 8, PST-20 line 8, PST-23 line 8). PST-21 depends on none of them (assumption A3).
- **Route.** No route is added or changed. The page stays `/projects/:projectId/files`, and `?path=` opens a file. Source: `modules/shell.md` line 63; `plans/PST-10.md` U1 (line 32).
- **Top-level draft.** A file `drafts/<name>` with no further folder. The API rule is `isTopLevelDraft` (`apps/api/src/modules/project-store/draft-versions.ts` lines 8 to 10), and the API refuses any other path with 400 (`draft-versions.service.ts` lines 115 to 118). Source: unit line 15; `modules/project-store.md` line 75.
- **The API on main.** `GET .../versions?draftPath=` answers `{draftPath, versions: [{id, createdAt, size}]}`, newest first. `GET .../versions/read?draftPath=&id=` answers `{draftPath, id, content}`. `POST .../versions/restore` takes the body `{draftPath, id}` and answers `{draftPath, id, content}`. Restore saves the current text as a version and then writes through `FilesService.write`, which publishes `files-changed` for the draft. Sources: `packages/contracts/src/project-store/routes.ts` lines 47 to 52; `drafts.ts` lines 5 to 34; `draft-versions.controller.ts` lines 35 to 60; `draft-versions.service.ts` lines 47 to 63 and 80 to 96; `files.service.ts` lines 545 to 549; `plans/PST-18.md` D1 (line 20), D3 (line 22), D11 (line 30), D18 (line 41).
- **Events of versions.** Accept publishes `files-changed` for its target (`pending.service.ts` lines 245 to 253). A version write publishes nothing (`plans/PST-19.md` line 76). A refresh on `files-changed` therefore picks up the versions that accept and restore create.
- **Panel placement.** The panel sits beside the preview: a sibling of `section.preview` inside `.layout`, after it. Sources: `plans/PST-14.md` line 127 and lines 132 to 134 (the merge rule of the shared file); `plans/PST-10.md` P14 (line 81) and line 153; `plans/PST-34.md` line 148.
- **Copies.** Hand-written copies of the routes and schemas go in a new file, not in `files-contract.ts`, and import only types from the contract (`plans/PST-14.md` P10, line 52; `apps/web/src/app/features/project-store/files-contract.ts` lines 7 to 9).
- **The open editor.** On tablet and desktop an outside change does not reload the editor. The history promises nothing about the editor, and a restore is such a change. Sources: `plans/PST-34.md` D16 (line 32) and section 7 (line 148); `plans/DECISIONS.md` line 4886 (OP-B).
- **Phone.** On the phone class the files page is read-only, with no editor (`plans/PST-10.md` U4, line 35; test T9, `files-page.spec.ts` lines 305 to 325). Unit line 20 says "read-only list and diff" at phone width. The diff is unified on phone (`diff-view.ts` lines 304 to 306).
- **Read-only diff.** `DiffView` takes `path`, `base` and `proposed`. `editable` defaults to false, and the view emits nothing in that mode (`apps/web/src/app/shell/diff-view.ts` lines 290 to 296). Sources: `modules/shell.md` line 86; `plans/SHL-12.md` line 251 (the caller chooses which text is `base`).
- **Seam.** The criterion headings carry no seam parenthetical, so the module default applies: UI tests render lazy routes with Angular's Vitest runner against the Shell's fakes (`units/README.md` lines 57 and 139; `modules/shell.md` line 92; `modules/project-store.md` line 58).
- **Routes in tests.** The tests render `filesRoutes` directly, as `files-page.spec.ts` does, so they need no answer to `GET .../active` (`plans/DECISIONS.md` line 2557).
- **Exports.** One `routes` export per feature (`plans/DECISIONS.md` line 941). This plan adds none.
- **Module rules.** GETs never mutate, commands are POST, every request names its `projectId`, and only project-relative paths reach the UI (`modules/project-store.md` lines 46, 48 and 49).

### 1b. Choices this plan makes (the unit leaves them open)

- **C1 Diff.** `base` is the draft's saved text, which the panel reads (C4). `proposed` is the version's text, so the diff reads as what restore would change. Viewing a version is that diff, which shows the version's text (assumption A2). Open point 1.
- **C2 Restore on phone.** No restore control on the phone class. Open point 2.
- **C3 Confirmation.** An inline group (`role="group"`) with the text "Restore this version? The current text is saved as a new version first.", the button "Confirm restore" and the button "Cancel". No native `<dialog>`, no `alertdialog` role and no focus move. Confirm is disabled while the POST is in flight. The text follows the server, which saves the current text before it writes (`plans/PST-18.md` D17, step 5).
- **C4 Current text.** The panel reads the draft itself: `GET /api/project-store/projects/:projectId/file` with `{path: draftPath}` and `readCopy` (`apps/web/src/app/shell/project-store-copies.ts` lines 84 and 119). It does not receive the page's `content` signal, so it stays self-contained. The cost is one more GET of the draft per refresh.
- **C5 Refresh.** The panel re-lists and re-reads its current text (a) on each `files-changed` for its project, whatever the paths; (b) on each reconcile tick (`SSE_CLIENT.reconcile$`); (c) on a successful restore answer; and (d) once on creation. The tree refreshes the same way (`files-page.ts` lines 397 to 414).
- **C6 Identity.** The page renders the panel in a `@for` keyed by project and path, so a change of draft or project creates a new panel. No reset logic is needed.
- **C7 Rows.** Each version is a button that shows its `createdAt` string as sent (UTC ISO) and its size in bytes, in the server's order. The selected version's button has `aria-pressed="true"`. The empty state "No versions yet." shows only after the first answer.
- **C8 Errors.** A failed list shows its message in a `role="alert"` and no rows. A failed read shows its message in a `role="alert"`. A failed restore shows its message in a `role="alert"`, closes the confirmation and does not refresh. The message is the `ApiError`'s own message, else "The request failed.", as `files-page.ts` lines 114 to 116 do.
- **C9 Layout.** The panel's `:host` is `display: block; flex: 1 1 16rem; min-width: 0`. Its buttons have `min-height: 44px`, the touch size of AGL-18 (`plans/AGL-18.md` D13, line 49). The page's own styles do not change.

## 2. Files to create or change

Only these paths change. Nothing else changes.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/project-store/versions-contract.ts` | new | Route helpers `draftVersionsPath(projectId)`, `draftVersionReadPath(projectId)` and `draftRestorePath(projectId)`, each encoding the id and returning `ApiPath`. Response copies `draftVersionListCopy` (`ResponseSchema<DraftVersionList>`) and `draftVersionReadCopy` (`ResponseSchema<DraftVersionRead>`). `isTopLevelDraftPath(path)`, the rule `/^drafts\/[^/]+$/` of `draft-versions.ts` line 9. Type-only imports from `@bbartolome/scriba-contracts/project-store`. The UTC datetime copy is `files-contract.ts` lines 23 to 33 |
| `apps/web/src/app/features/project-store/versions-contract.spec.ts` | new | K1 and K2 (section 4) |
| `apps/web/src/app/features/project-store/version-history.ts` | new | `VersionHistory`, standalone, selector `app-version-history`. Inputs `projectId` and `draftPath` (both `input.required<string>()`). The state, reads, refreshes and restore of C3 to C9 (step 4). Imports `DiffView`, `DeviceClassService`, `API_CLIENT`, `SSE_CLIENT` and `ApiError` from `'../../shell'`, `projectFilePath` and `readCopy` from `'../../shell/project-store-copies'`, and the copies from `./versions-contract` |
| `apps/web/src/app/features/project-store/version-history.spec.ts` | new | Tests H1 to H8 (section 4) |
| `apps/web/src/app/features/project-store/files-page.ts` | edit, four anchored edits | (a) import `VersionHistory` from `./version-history` and `isTopLevelDraftPath` from `./versions-contract`, after the `SearchPanel` import (line 37). (b) `imports` (line 141) becomes `[VersionHistory, EditorLayout, MarkdownPreview, RouterLink, SearchPanel]`. (c) A computed `histories` after `checkId` (after line 280): `{key, projectId, draftPath}` when `selected()` is a top-level draft and `projectId()` is known, else `[]`. (d) Inside `.layout`, after `</section>` (line 251): `@for (history of histories(); track history.key) { <app-version-history [projectId]="history.projectId" [draftPath]="history.draftPath" /> }` |

Not changed: `project-store.routes.ts` (the page stays lazy through `filesRoutes`), `app.routes.ts`, `files-page.spec.ts` (its tests stay as they are), every file under `apps/web/src/app/shell/`, `packages/contracts/`, `apps/api/`, `e2e/`, `package.json` and the lockfile (PST-21 adds no dependency). No unit, module or DECISIONS file is edited.

The panel is imported only by `files-page.ts`, so it lands in the lazy chunk of the page.

## 3. Procedure

Work in a worktree on branch `unit/PST-21`, made from `main`. First check that neither exists (`git worktree list`, `git branch --list unit/PST-21`), then run `git worktree add -b unit/PST-21 /Users/bbartolome/workspace/scriba-prototype-wt/PST-21 main`. Record `node -v` and `npm -v` beside each result. Do not push. Stage explicit paths only.

Part 1 (steps 1 to 8).

1. **Dependencies.** In the worktree, `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0.
2. **Baseline.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0. Record the test count. If it fails, stop and report.
3. **Copies.** Write `versions-contract.ts` and `versions-contract.spec.ts` (section 2). Run `npm test -w @bbartolome/scriba-web -- --include src/app/features/project-store/versions-contract.spec.ts`. Expected: K1 and K2 pass.
4. **Component.** Write `version-history.ts` with the choices C1 to C9. Its state is `versions`, `loaded`, `listFailure`, `current`, `currentFailure`, `selected`, `version`, `versionFailure`, `confirming`, `restoring` and `restoreFailure`. Its computed values are `diff` (`{base, proposed}` once both texts are loaded) and `restorable` (`deviceClass() !== 'phone'`, from `DeviceClassService.deviceClass`, `apps/web/src/app/shell/device-class.ts` line 71).
   - Four `Subject`s: the list and the current text use `switchMap`; a version read uses `switchMap` by id, and its answer applies only while that id is `selected()` (as `files-page.ts` lines 382 and 383 do for the file); restore uses `exhaustMap`, so a second click is ignored while a POST is in flight.
   - Reads start in `ngOnInit`, when the inputs are set. The subscriptions to `events.stream('project-store')` (only `files-changed` whose `data.projectId` equals `projectId()`) and to `events.reconcile$` use `takeUntilDestroyed`.
   - Request forms: the list `api.get(draftVersionsPath(p), draftVersionListCopy, {draftPath})`; the current text `api.get(projectFilePath(p), readCopy, {path: draftPath})`; a version `api.get(draftVersionReadPath(p), draftVersionReadCopy, {draftPath, id})`; restore `api.post(draftRestorePath(p), {draftPath, id}, draftVersionReadCopy)`. The restore body has exactly those two keys.
   - Template: a `section` labelled by an `h3` "Version history"; the list `ul[aria-label="Versions"]`; the diff `<app-diff-view [path]="draftPath()" [base]="texts.base" [proposed]="texts.proposed" />` inside `@if (diff(); as texts)`; the button "Restore this version" inside `@if (restorable())`; the group with "Confirm restore" and "Cancel".
   - Its own `:host` style is C9. The helpers `failureMessage` and `outcomeOf` are copied from `files-page.ts` lines 114 to 132.
5. **Component tests.** Write `version-history.spec.ts` with H1 to H8 (section 4). Run `npm test -w @bbartolome/scriba-web -- --include src/app/features/project-store/version-history.spec.ts`. Expected: 8 pass.
6. **Page.** Edit `files-page.ts` at the four anchors (a) to (d) of section 2 and nothing else. Run `npm test -w @bbartolome/scriba-web -- --include src/app/features/project-store/files-page.spec.ts`. Expected: every existing test passes, unchanged.
7. **Whole web suite.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0, with the count of step 2 plus the new tests. If an existing spec fails, correct `version-history.ts` or `files-page.ts`, not the spec.
8. **Mutation checks.** Before each change, copy the file aside, make one change, run the named test and expect it to fail. Then restore the copy and confirm with `cmp`.
   - M1: send the list GET without `params`. H1 fails.
   - M2: send the restore POST on the first click, with no confirmation. H3 fails.
   - M3: skip the refresh after the restore answer. H3 fails.
   - M4: drop the `files-changed` subscription. H4 fails.
   - M5: render the restore button on the phone class. H5 fails.

Part 2 (steps 9 to 13).

9. **Format and lint.** `npx prettier --write apps/web/src/app/features/project-store`, then `npm run lint` at the root. Expected: exit 0, ending with "All matched files use Prettier code style!".
10. **Build and lazy chunk.** `npm run build -w @bbartolome/scriba-web`. Expected: exit 0. Then `grep -l 'app-version-history' apps/web/dist/scriba-web/browser/*.js` must list at least one file, and none of the listed files may be a `main-*.js` file. An empty list fails the check.
11. **Root gates.** `npm run build`, `npm test` and `npm run lint` at the root. Expected: each exits 0.
12. **Regression e2e (not a criterion).** `npm run e2e -w @bbartolome/scriba-e2e -- search-phone.e2e.ts`. Expected: pass. The spec opens `sources/notes.md` at 390 px (`e2e/specs/search-phone.e2e.ts` lines 58 to 74), so no history panel shows, and the spec checks that the page fits. If the harness reports port 8080 in use, wait and run again. Do not change the harness.
13. **Commit.** `git add` the five section 2 paths by name, then `git commit -m "feat(PST-21): version history on the files page for top-level drafts"`. Expected: one commit, and `git status --short` empty. No push.

## 4. Acceptance criteria and tests

Criterion 1 (unit line 19) names three behaviours, and each has one test: H1, H2 and H3. Criterion 2 (unit line 20) has one test, H5, a DOM test at 390 by 844, as PST-10's phone criterion has its DOM test T9 (`plans/PST-10.md` line 147). The tests live in `version-history.spec.ts` and render the page's route: `provideRouter([{path: 'projects/:projectId/files', children: filesRoutes}])`, `provideMarkdown(...)` and `...createShellTestDoubles().providers`, as `files-page.spec.ts` lines 62 to 81 do. `stubMatchMedia(1280, 800)` is the default, and `restoreMatchMedia()` runs in `afterEach`. Fixtures are built in the spec, never from `examples/`.

Fixtures: `VERSIONS = '/api/project-store/projects/p1/versions'`, `VERSION_READ` (`.../versions/read`), `RESTORE` (`.../versions/restore`), and `LIST` and `READ` as in `files-page.spec.ts` lines 22 and 23. `v2 = {id: '20261104T231500124Z.md', createdAt: '2026-11-04T23:15:00.124Z', size: 11}` and `v1 = {id: '20261104T231500123Z.md', createdAt: '2026-11-04T23:15:00.123Z', size: 8}`. The list answer is `{draftPath: 'drafts/ch1.md', versions: [v2, v1]}`. The draft reads `Current\n`. A version read and the restore answer both give `Old one\n`. The count helper is `countOf` (`files-page.spec.ts` lines 112 to 114).

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| 19: list renders | H1 | The rows of `ul[aria-label="Versions"] li`, in order, read `2026-11-04T23:15:00.124Z, 11 bytes` and then `2026-11-04T23:15:00.123Z, 8 bytes`. The recorded requests contain `{method: 'GET', path: VERSIONS, params: {draftPath: 'drafts/ch1.md'}}` |
| 19: selecting a version shows the diff against current | H2 | After a click on the first row: the recorded version read has params `{draftPath: 'drafts/ch1.md', id: v2.id}`. `section[aria-label="Changes to drafts/ch1.md"]` exists and its `textContent` contains `Current` and `Old one`. The row has `aria-pressed="true"`. No POST was sent |
| 19: restore calls the restore POST and refreshes | H3 | Select the first row, click "Restore this version": no POST yet. Click "Confirm restore": one POST to `RESTORE` with the body `{draftPath: 'drafts/ch1.md', id: v2.id}`. Afterwards `countOf(VERSIONS)` is 2, the count of READ is one more than before the POST (the panel's own read; the page does not re-read on an answer), and the group is gone |
| 20: works at phone width (read-only list and diff) | H5 | `restoreMatchMedia()` then `stubMatchMedia(390, 844)` before the render. The list renders and the first row's diff shows: `section[aria-label="Changes to drafts/ch1.md"]` exists, and `[role="radio"][aria-checked="true"]` reads `Unified`. No button reads "Restore this version", and no POST was sent |

Supporting tests (decisions of unit line 16 and of section 1b; not criteria):

- **H4** (unit line 16, refresh on `files-changed`). A `files-changed` for `p1` takes `countOf(VERSIONS)` from 1 to 2. A `files-changed` for `p2` leaves it at 2.
- **H6** (C3 and C8, restore failure). With `fail('POST', RESTORE, new ApiError(409, 'PROJECT_NOT_ACTIVE', 'The project is not active.'))`, the restore shows that message in a `role="alert"`, the confirmation closes, and `countOf(VERSIONS)` stays 1.
- **H7** (C7 and C8, empty and failed lists). An empty list shows "No versions yet." and no rows. A failed list `ApiError(404, 'PROJECT_NOT_FOUND', 'No such draft.')` shows that message in a `role="alert"`, no rows, and no "No versions yet.".
- **H8** (scope). `?path=sources/outline.md` and `?path=drafts/sub/ch1.md` make no VERSIONS request and show no `ul[aria-label="Versions"]`.
- **K1** (`versions-contract.spec.ts`). The copies accept and refuse the fixtures that `draftVersionListSchema` and `draftVersionReadSchema` accept and refuse. Accepted: a list with no versions; a list with one version (`createdAt` `2026-11-04T23:15:00.123Z`, size 8); a read with empty content. Refused: a list with no `draftPath`; a size of -1; a `createdAt` without `Z`; a read with no `content`.
- **K2** (`versions-contract.spec.ts`). `draftVersionsPath('a b')` is `/api/project-store/projects/a%20b/versions`. The other two helpers equal `PROJECT_VERSION_ROUTE` and `PROJECT_VERSION_RESTORE_ROUTE` with the id encoded. `isTopLevelDraftPath` accepts `drafts/ch1.md` and refuses `drafts/sub/ch1.md`, `drafts/.versions/ch1.md/x` and `sources/outline.md`.

Regression: the existing `files-page.spec.ts` must pass unchanged (step 6). Two existing tests open a draft, F12 (line 380) and E7 (line 707). They now also see an unanswered versions GET, which the panel shows as its alert. Neither test checks for that alert or counts those requests. The existing alert and read-count assertions (lines 298, 529, 615 and 256, 277, 636 to 646) all concern `sources/` files.

Mutations M1 to M5 are in step 8.

## 5. Downstream agreement

- **PST-22, the review gate.** Its `blocked_by` names PST-21 (`units/PST-22-review-gate.md` line 7). Its demo step 4 (line 33) is "Open the draft's history and restore the first version", and its checklist (line 23) says "restore saves current first", which is PST-18's V2, not this unit's. PST-22 needs the following, and this plan provides each one.
  - I1: the history opens from the existing files route, `/projects/:projectId/files?path=drafts/<name>.md`, for any top-level draft. Provided by anchor (c) and (d) of section 2.
  - I2: the versions list newest first, with sizes (PST-18 D1 and D4). Provided by C7.
  - I3: restore is `POST /api/project-store/projects/:projectId/versions/restore` with `{draftPath, id}`, behind a confirmation. The list and the current text refresh at once on the answer (H3) and on `files-changed` (H4). The tree and the open file refresh on that event as well, because restore publishes it (PST-18 D11).
  - I4: restore is not shown on the phone class (C2, open point 2), so demo step 4 runs on tablet or desktop.
  - Hand-over note for PST-22: the list is newest first, so "the first version" of step 4 is the last row, the oldest version.
- **No other unit uses PST-21's output.** `grep -n "PST-21" units/*.md` finds PST-22 (`blocked_by`); PST-10 (line 20, a pointer to this unit); PST-19, PST-20 and PST-23 (`parallel_with`); and SHL-12 (`unblocks`, the Shell side).
- **Upstream, which this plan depends on.** PST-18's three routes and events (section 1a); PST-10's page (`files-page.ts`); SHL-12's `DiffView` (`diff-view.ts` lines 290 to 296). No code of PST-19, PST-20 or PST-23 is used.

## 6. Changes of other draft and planned plans to the same files

The draft and planned plans on `main` at `8319213` are `plans/PST-20.md` (planned), `plans/TRG-14.md` (planned) and `plans/SAU-22.md` (draft). Every other plan file is `done`, except `plans/DECISIONS.md` and `plans/QUEUE.md`, which carry no status.

- **PST-20 (planned).** Its file table (`plans/PST-20.md` lines 91 to 97) has `review-contract.ts` and its spec, `review-page.ts` and its spec (all new), `project-store.routes.ts` (adds `reviewRoutes`, line 95), `app.routes.ts` (adds the `review` entry after the `files` entry, line 96), and `e2e/specs/review-phone.e2e.ts` (new). This plan touches none of them, and it does not touch `files-page.ts`, which PST-20 does not change. The two share the read-only and editable uses of `DiffView`, and neither edits a Shell file. No line of either plan's files overlaps, so either order is correct and no rebase conflict arises. PST-20's section 6 (line 142) already says PST-21 "edits `files-page.ts` ... and needs no route", which holds.
- **TRG-14 (planned).** Its file table (`plans/TRG-14.md` lines 99 to 110) names tool-registry files, `apps/web/package.json`, `package-lock.json` and `e2e/specs/tools-editor.e2e.ts`. Its line 95 excludes `app.routes.ts`. None of these is a path of this plan, and this plan adds no dependency. Either order is correct.
- **SAU-22 (draft).** Its changed paths (`plans/SAU-22.md` lines 78 to 91) are `packages/contracts/src/platform/env.ts` and its test, `apps/api/` files, `package.json`, `README.md` and two test files. None is a path of this plan.
- **Done plans already on main that change `files-page.ts`.** PST-10 (the page), PST-14 (the search panel above `.layout`, line 199), PST-34 (the editor inside `section.preview`) and AGL-18 (commit `ba23679`, the Check grounding link at lines 221 to 228 and 273 to 280). This plan's anchors sit where those plans left the page (section 2), and this plan keeps every line of them.
- **Units with no plan.** PST-22 (no code). PST-23 changes the API write path (`plans/PST-18.md` F28, line 188), not the page.

## 7. Open points

Each point has the planner's best choice. None is a Navigator decision.

1. **Direction of the diff.** The unit does not say which text is `base`. Best choice: C1, the saved draft as `base` and the version as `proposed`, so the diff reads as what restore would change. `plans/SHL-12.md` line 251 leaves the choice to the caller.
2. **Restore at phone width.** Unit line 20 names "read-only list and diff". Best choice: no restore control on the phone class (C2, tested by H5, mutation M5). The files page is read-only on the phone (`plans/PST-10.md` U4). Consequence for PST-22: demo step 4 runs on tablet or desktop.
3. **Restore while the desktop editor holds unsaved text of the same draft.** The unit does not name this case. Best choice: allowed, with no extra check. The editor keeps its text (`plans/PST-34.md` D16; `plans/DECISIONS.md` line 4886), the file on disk changes, and the next save gets `PROJECT_WRITE_CONFLICT` with the stale-base warning. Restore sends no `baseHash` (`plans/PST-18.md` F34, line 195). Disabling restore while the editor is dirty would need a Shell signal that no unit names.
4. **Layout at 390 px.** Criterion 2 is tested as a DOM test (H5), following the module's UI seam (`units/README.md` line 139). The test does not check that the panel and the diff fit the width without sideways scroll. Best choice: no e2e test, because criterion 2 names what is read-only and does not name a layout. If the reviewer reads "works at phone width" as a layout claim, add a Playwright spec at 390 by 844 in the form of `e2e/specs/search-phone.e2e.ts`, as a new file and a new step.

## 8. Facts checked and assumed

### 8a. Checked (reads and grep, at `8319213`)

- Unit `units/PST-21-version-history-ui.md`: front matter lines 1 to 10; title line 12; Decisions lines 14 to 16; criteria lines 18 to 20. Its only commit is `2fed3f4`, and it has no change note.
- `units/README.md` lines 57 (seam parenthetical), 64 (`unblocks` is the inverse), 132 (HTTP) and 139 (testing).
- `modules/project-store.md` lines 46, 48, 49, 57, 58, 69 and 75. `modules/shell.md` lines 63, 70, 86 and 92.
- `plans/DECISIONS.md`: line 941 (one `routes` export per feature), line 2557 (the `GET .../active` rule for tests), lines 4086 to 4092 (the PST-10 split; line 4092 says PST-14 and PST-21 need "only the tree, `?path=` and the refresh on `files-changed`"), lines 4886 to 4895 (PST-34 OP-B). Grep by PST-21 and PST-22 found no other entry.
- Contracts: `packages/contracts/src/project-store/routes.ts` lines 47 to 52; `drafts.ts` lines 5 to 34; `events.ts` lines 42 to 46 (the `files-changed` data); `index.ts` line 9.
- API: `draft-versions.ts` lines 8 to 10; `draft-versions.controller.ts` lines 35 to 60 (the POST at 53 to 60, `@HttpCode(200)` at 54); `draft-versions.service.ts` lines 47 to 63 (list), 67 to 76 (read), 80 to 96 (restore, with `files.write` at 87 to 90), 115 to 118 (not a top-level draft); `files.service.ts` lines 543 to 553 (write, publish, notify); `pending.service.ts` lines 245 to 253 (accept publishes `files-changed` at 247).
- Web: `files-page.ts` lines 14, 26 to 37 (the imports; `SearchPanel` at 37), 114 to 116 (`failureMessage`), 125 to 132 (`outcomeOf`), 141 (`imports`), 197 to 253 (template; `.layout` at 203; `section.preview` at 220 to 251; `</div>` at 252), 273 to 280 (`checkId`, from AGL-18), 382 and 383 (the file answer applies to the selected path), 397 to 414 (`files-changed` and reconcile). `project-store.routes.ts` lines 18 to 26 (`filesRoutes`). `files-contract.ts` lines 7 to 9 (type-only rule), 11 to 17 and 23 to 33. `files-page.spec.ts` lines 22 and 23 (paths), 62 to 81 (render), 83 to 87 (settle), 112 to 114 (`countOf`), 116 to 123 (`push`), 195 to 218 (T4), 305 to 325 (T9, phone), 380 to 399 (F12), 596 to 626 (E4), 707 (E7). The READ counts at 256, 277 and 636 to 646 concern `sources/outline.md`.
- Shell: `index.ts` lines 3 to 5, 10, 11 and 13 (exports); `diff-view.ts` lines 231, 234, 290 to 296 and 304 to 306; `device-class.ts` line 71 (`deviceClass` signal); `api-client.ts` lines 13, 17 to 22 and 24 to 36; `project-store-copies.ts` lines 84 (`projectFilePath`) and 119 (`readCopy`); `testing/test-doubles.ts` lines 43 to 103 (`FakeApiClient`: canned answers by method and path at 49 to 56; params recorded only when given, 63 to 68; body always, 79; a path with no answer throws, 91 to 93), 110 to 162 (`FakeEventSource`), 187 to 199 (`createShellTestDoubles`); `testing/match-media.ts` lines 67 and 99.
- The Range stub is gone: `apps/web/src/app/shell/testing/` holds no `dom-range.ts`, and commit `bff0ceb` dropped it. The SHL-12 open point 6 (`plans/SHL-12.md` line 266) is void for this unit.
- Done plans: `plans/PST-10.md` lines 32, 35, 75, 81, 147 and 153; `plans/PST-14.md` lines 52, 127 and 132 to 134; `plans/PST-18.md` lines 20, 22, 30, 41, 134, 162, 188 and 195; `plans/PST-19.md` line 76; `plans/PST-34.md` lines 32 and 148; `plans/SHL-12.md` lines 251 and 266; `plans/AGL-18.md` line 49.
- Blocked and parallel units: PST-10, PST-18 and SHL-12 are `status: done`. PST-19, PST-20 and PST-23 name PST-21 in `parallel_with` (grep).
- Planned and draft plans: `plans/PST-20.md` lines 91 to 97 and 142 and 153; `plans/TRG-14.md` lines 95 and 99 to 110; `plans/SAU-22.md` lines 78 to 91.
- E2E: `e2e/specs/search-phone.e2e.ts` lines 58 to 74 (it opens `sources/notes.md` at phone width).
- Git: `git status --short` was empty; no `unit/PST-21` branch and no `plans/PST-21.md` existed before this file. `git log -- apps/web/src/app/features/project-store/files-page.ts` lists `ba23679` (AGL-18), `9ec2644` (PST-34) and `c1373c3` (PST-14) after the PST-10 commit.

### 8b. Assumed (A)

- **A1.** The web suite and the Angular CLI run in the new worktree after `npm ci`. Not run.
- **A2.** `DiffView` writes both texts in full into the DOM, so H2 and H5 can find `Current` and `Old one` in the diff section. The DiffView spec asserts the `.cm-*` lines of both sides (`apps/web/src/app/shell/diff-view.spec.ts` lines 125 to 138), which implies it. Not run.
- **A3.** PST-16 does not depend on PST-19, PST-20 or PST-23, because PST-16 unblocks them (`plans/PST-18.md` F2, line 162). This is what keeps the `parallel_with` list valid.
- **A4.** The selector `app-version-history` appears in the lazy chunk only, since only `files-page.ts` imports the component. Checked at step 10, not run.
- **A5.** Angular reads `input.required` values in `ngOnInit`, not in the constructor. The H-tests check the first list request.

## 9. Review parts

Two parts. Each step and each test is in exactly one part.

- **Part 1: copies, component, page and component tests (steps 1 to 8).** Files: `versions-contract.ts`, `versions-contract.spec.ts`, `version-history.ts`, `version-history.spec.ts`, `files-page.ts`. Tests: K1 and K2 (supporting); H1, H2 and H3 (criterion 1); H5 (criterion 2); H4, H6, H7 and H8 (supporting); mutations M1 to M5; the existing `files-page.spec.ts` unchanged; the whole web suite. The reviewer checks that the change touches exactly the five paths of section 2, that the page edit is the four anchors of section 2 and nothing else, that no restore request goes out before confirmation, that restore is absent on the phone class, and that no route file changed.
- **Part 2: format, lint, build, regression and commit (steps 9 to 13).** The reviewer checks that the lazy-chunk list is non-empty and holds no `main-*.js` file, that the root gates exit 0, and that the commit holds the five paths only, with no lockfile or `package.json` change.
