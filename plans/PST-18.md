---
id: PST-18
status: draft
---

# PST-18 plan - draft versions: list, read and restore

Project store, phase:pending-review, M3. Unit `units/PST-18-draft-versions-api.md`: front matter lines 1 to 10 (`blocked_by: [PST-16]` at line 7), Why line 15, Decisions lines 18 to 21 (four bullets), acceptance criteria lines 24 to 26 (three criteria). The unit has no Scope and no Demo section (F1).

Planner's draft (Haiku), checked against main `4b93f96`. The tree was clean when the facts were checked. The code this unit builds on is on main: PST-16 (`a7995b5`, `fef1f47`) and PST-17 (`bcbfb13`, `e0fb37d`, `49e72e4`) (F29). Nothing was built, installed, run or changed except this file; the checks were reads and grep.

Tags: **Fn** is a fact checked by the planner (section 7a). **An** is an assumption not checked (section 7b). **Dn** is a decision of this plan. "PST-16 Dn" is a decision of `plans/PST-16.md`, "PST-17 Dn" of `plans/PST-17.md`. "(plan choice)" marks a decision that is not in the unit, the module or an earlier plan.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contracts, the README and the done plans

- **D1. The list.** `GET /api/project-store/projects/:projectId/versions?draftPath=<top-level draft>` answers `{draftPath, versions}`, where `versions` is a list of `{id, createdAt, size}`, newest first. Source: unit line 18 (shape) and line 24 (newest first, with sizes); route `PROJECT_VERSIONS_ROUTE` (F5); `draftVersionListSchema` (F6); PST-01 plan line 79 (query `draftPath`).
- **D2. The read.** `GET .../versions/read?draftPath=...&id=...` answers `{draftPath, id, content}` with the stored text. Source: unit line 18; route at routes.ts lines 49 to 50 (F5); `draftVersionReadQuerySchema` and `draftVersionReadSchema` (F6); PST-01 plan line 80. Unit line 18 says these are the only public routes that read `drafts/.versions/`. Restore also reads one version (D17, step 3), so the set is the two GETs and the restore, and nothing else in the API reads that folder.
- **D3. Restore.** `POST .../versions/restore` with body `{draftPath, id}` (`draftRestoreSchema`, F6; route at routes.ts lines 51 to 52, F5). It saves the current content as a new version, then writes the restored text directly (not a pending change), and publishes `files-changed`. Source: unit lines 19 and 25.
- **D4. Names, ids and dates of versions.** A version's `id` is its file name, `<stamp>[-n]<ext>`. The stamp is `YYYYMMDDTHHMMSSmmmZ` (19 characters). `-n` (n from 2) marks a name that was taken. `<ext>` is the extension of the draft's name, and is empty when the name has none. `createdAt` is the UTC time that the first 19 characters of the id give. Newest first means by stamp, then by n, with no suffix counting as 1. `size` is the byte count of the file. Source: PST-16 D5 (plan line 19); PST-16 plan section 6, PST-18 bullet (line 179), and section 10 item 7 (line 238); the naming code `compactStamp` and `versionNameFor` (F8); module line 75 (settled path).
- **D5. Only top-level drafts have versions.** A version belongs to `drafts/<name>`, a file with no further folder. Source: `isTopLevelDraft` (F8); PST-16 D5; unit line 18 ("for a top-level draft"); unit line 21 ("Compile & export assembles top-level drafts only").
- **D6. Versions belong to their draft by file name.** The folder is `drafts/.versions/<draft file name>/`. Renaming a draft orphans its versions (known cost; stable IDs are deferred). Source: unit line 20; module line 69; module line 75.
- **D7. Folders are reached by `versionFolderOf`, not by a new path mode.** `versionFolderOf(project, draftPath, create)` (F8) builds `drafts/.versions/<name>` with `ownFolder` (F9), which checks real paths inside the project. No reserved-path mode is added to `path-safety.ts`. Source: PST-16 D18 (plan line 32), which settles the choice that PST-02 item 6 left open (PST-02 plan line 313; F24). See section 6, open point 2.
- **D8. Reserved paths stay unreachable through the file API.** `drafts/.versions/` is in `RESERVED_PATH_PREFIXES` (F16). `resolveProjectPath` refuses it lexically and by real location (F17). Every path that PST-18 takes from a caller goes through `ProjectStoreService.resolvePath` (F11) before any use. Source: unit line 26; module line 45 ("path safety is the one function").
- **D9. Active rule and lookup.** Every route first calls `requireActive(projectId)` (F11), then looks the project up with `ProjectsService.find` (F14), in the order of `PendingService.openChangeOf` (F12). A project that is not active gives `PROJECT_NOT_ACTIVE` (409, F15). Source: module line 48; PST-16 D8.
- **D10. GETs never mutate.** The list and the read create nothing. The folder is looked up with `create` false, and `ownFolder` returns undefined for a missing folder (F9). Source: module line 46; `units/README.md` line 131 (F4).
- **D11. Restore's write is the file API's save.** Restore writes through `FilesService.write` (F10). Its `commit` writes the file, publishes `files-changed` with `{projectId, paths: [target]}`, and calls `ProjectStoreService.notifyFilesChanged` (F10, F11), which runs the recheck of open changes that `PendingService` registers (F12). Source: unit line 19 (publishes `files-changed`); PST-16 D4 (a POST that touches the target persists its conflicts; unit PST-16 line 23); PST-16 D17.
  This departs from the sketch in PST-16 plan section 6 (line 179), which has restore call `writeText`, then publish and notify itself. Reason: `commit` already does those three things, and a second publish would send `files-changed` twice. See section 5.
- **D12. Restore saves with the function that accept uses.** Restore saves the current bytes with `saveVersion` (F8). Accept (F12, line 190) and accept-anyway (F12, line 220) use the same function, so there is one naming rule (PST-16 D5).
- **D13. Git and readers.** `drafts/.versions/` is not git-ignored (unit line 21). The repository's `.gitignore` has no rule for it (F27), so nothing changes there. Only this module reads it (unit line 21).

### 1b. Small decisions this plan makes (plan choice)

- **D14. Id form.** `VERSION_ID_PATTERN = /^\d{8}T\d{9}Z(?:-\d+)?(?:\.[^./\\\0]+)?$/`. Every name that `saveVersion` writes matches it, because `extname` never contains a dot or a slash. An id that does not match, or that names no file in the folder, gives `PROJECT_NOT_FOUND` (404) with the message "No version of this draft has that id." This is the code PST-16 D3 uses for a malformed pending id. The check runs before any disk access.
- **D15. The list.** `draftPath` passes `resolvePath` (refusals as in D8) and `isTopLevelDraft`. Any other path gives `PROJECT_PATH_INVALID` (400) with the message "Versions belong to a top-level draft in drafts/." A missing folder gives `versions: []`. The list counts only regular files (`lstat`) whose names match D14, and skips folders and other names. The list does not require the draft file to exist.
- **D16. The read.** The version file must be a regular file (`lstat`), or the answer is 404. A file over `FILE_SIZE_CAP_BYTES` (F16) gives 413, as `readFileAt` does (F10, lines 143 to 145). Bytes that `decodeText` refuses give `PROJECT_NOT_TEXT` (415; F10, line 93). The content is the decoded text. `decodeText` keeps a BOM (F10, line 91), so the stored bytes round-trip.
- **D17. Restore, in this order, with no `await`.** (1) `requireActive` and the lookup (D9). (2) `draftPath` is a top-level draft (D5) and the id has the form of D14. (3) The version file exists and reads as text (D16), so every refusal comes before any write. (4) The draft exists and reads: `readFileAt` on the draft (F10, lines 135 to 150), which gives 404 when it is missing and 413 when it is over the cap. (5) `saveVersion(project, draftPath, currentBytes, new Date())` (F8). (6) `files.write(projectId, {path: draftPath, content: restoredText})` (D11). (7) The answer (D18). The steps are synchronous, so no other request of the process interleaves (PST-16 D20). If step 6 fails, the saved version stays (PST-16 D12). A restore whose text equals the current text still saves the version (no special case, PST-16 D23).
- **D18. The restore answer.** `{draftPath, id, content}`, the `draftVersionReadSchema` shape (F6). `id` is the id of the restored version, and `content` is the restored text. PST-01 plan line 81 calls the restore answer "read shape". The id of the saved current version is not returned. PST-21 needs only the refresh.
- **D19. Status and pipes.** The routes follow the files controller and the pending controller. The POST carries `@HttpCode(200)`, as the other POSTs do (F13, `files.controller.ts` line 60; `pending.controller.ts` line 42). The restore body goes through `ZodValidationPipe(draftRestoreSchema)`. The list query is `draftVersionReadQuerySchema.pick({draftPath: true})`, the same `pick` pattern as `files.controller.ts` line 35. The read query is `draftVersionReadQuerySchema`.
- **D20. Names and layout.** Service `DraftVersionsService` in `draft-versions.service.ts` (`@Injectable()`; it injects `ProjectStoreService`, `ProjectsService` and `FilesService`). Controller `DraftVersionsController` in `draft-versions.controller.ts`. The id and name helpers go into the existing `draft-versions.ts`. The controller is registered after `PendingController`, and the service after `PendingService` (F14). The service is not exported, because no other module needs it. One file per unit follows PST-02 open point 4 (PST-02 plan line 311).
- **D21. Events.** Restore adds no event of its own. Its events are the ones that D11 gives: `files-changed`, and `pending-updated` as a consequence of the recheck (PST-16 D6). Lists and reads publish nothing (module line 46).
- **D22. A restore of a missing draft.** It is refused at step 4 of D17, with the file API's "no file" message and code 404. This is the default until the Navigator decides (section 6, open point 1).

## 2. Files to create or change

**New files**

| Path | Step | Purpose |
|---|---|---|
| `apps/api/src/modules/project-store/draft-versions.service.ts` | 3 | `DraftVersionsService` with `list(projectId, draftPath)`, `read(projectId, draftPath, id)` and `restore(projectId, body)`. Private: `projectFor` (D9), `draftOf` (D5, D8), `versionFile` (D14), `readVersion` (D16). |
| `apps/api/src/modules/project-store/draft-versions.controller.ts` | 4 | `DraftVersionsController`: `GET .../versions`, `GET .../versions/read`, `POST .../versions/restore` (`@HttpCode(200)` on the POST). |
| `apps/api/test/project-store-draft-versions.test.ts` | 7 | Tests V1, V2, V3 (the criteria) and X1 to X4 (section 4). Each test builds its own temp library with `bookLibrary()` and removes it in a `finally`. |

**Edited files**

| Path | Step | Change |
|---|---|---|
| `apps/api/src/modules/project-store/draft-versions.ts` | 2 | Exports only; the existing functions do not change: `VERSION_ID_PATTERN`, `isVersionId(id)`, `createdAtOf(id)` (the ISO time of the first 19 characters), `compareNewestFirst(a, b)` (D4). |
| `apps/api/src/modules/project-store/project-store.module.ts` | 4 | Import the controller and the service. Add `DraftVersionsController` to `controllers` (after line 44) and `DraftVersionsService` to `providers` (after line 62). `exports` does not change. |
| `apps/api/test/invariant-sweep.ts` | 5 | Three `FIXTURE_PATHS` entries after line 131 (section 3, step 5). |
| `apps/api/test/project-store-files-gate.test.ts` | 6 | Import `PROJECT_VERSIONS_ROUTE` and `PROJECT_VERSION_ROUTE`. Two `F3_ROWS` rows after the pending row (after line 470). In the F3 test, one seeded version after line 504. |

**Not changed (checked; F-numbers in section 7a).** `packages/contracts/` (the three routes and the five schemas already exist: routes.ts lines 47 to 52, drafts.ts lines 5 to 34, index.ts line 9; `packages/contracts/test/project-store.schema.test.ts` already imports `PROJECT_VERSION_RESTORE_ROUTE`, line 33). `files.service.ts` (`write`, `readFileAt`, `decodeText` and `writeText` are reused as they are). `pending.service.ts`, `project-store.service.ts`, `path-safety.ts` (no mode, D7), `own-folder.ts`, `.gitignore`. The kits: `pendingKitModule` is the test seam (section 4). `units/`, `modules/`, `plans/DECISIONS.md`, `plans/QUEUE.md`, and every plan except `plans/PST-18.md`.

**Merge order.** PST-18 adds keys to `FIXTURE_PATHS` and entries to the module's arrays. PST-19 and PST-23 may add the same kinds of entries (PST-16 plan section 3 and PST-17 plan section 2 name the same files). Each entry is distinct, so the merge is additive in either order.

## 3. Procedure

Work in a worktree on the branch `unit/PST-18`, made from `main`. The branch does not exist, and the worktree path is free (F30, F31): `git worktree add -b unit/PST-18 /Users/bbartolome/workspace/scriba-prototype-wt/PST-18 main`. Do not push. Stage explicit paths only (`git add -- <paths>`). Never `git add -A` or `git commit -a`. Record `node -v` (expected `v26.x`) and `npm -v` (expected `11.20.0`) with the results (A1).

**One commit.** The sweeps of step 5 need the entries of the new routes, and the F3 test of step 6 needs their rows. Without them the gates fail by name (F18, F19). So the code and the gate changes land in one commit.

**Step 0. Worktree and dependencies.** In the worktree, run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0.

**Step 1. Baseline.** In `apps/api`, run `npx vitest run test/project-store-files-gate.test.ts test/invariant-get-head.test.ts test/invariant-mutation-guard.test.ts test/project-store-pending-apply.test.ts test/project-store-files-delete-move.test.ts`. Expected: all pass before any change. Record the counts.

**Step 2. Helpers (D4, D14).** In `draft-versions.ts`, add the exports of section 2. Do not change `isTopLevelDraft`, `compactStamp`, `versionNameFor`, `versionFolderOf` or `saveVersion`. Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` exits 0.

**Step 3. The service (D9 to D17, D22).** Create `draft-versions.service.ts`.
- `list`: `projectFor`, then `draftOf`, then `versionFolderOf(project, draft.relativePath, false)`. An undefined folder gives `{draftPath, versions: []}`. Otherwise take the regular files whose names pass `isVersionId`, give each its `createdAtOf` and its byte size, and sort them with `compareNewestFirst`.
- `read`: `projectFor`, `draftOf`, `versionFile` (404 for a bad id, a missing folder or a missing file), then `readVersion`.
- `restore`: the seven steps of D17, with `files.write` as step 6.

Expected: tsc exits 0.

**Step 4. Controller and module (D19, D20).** Create `draft-versions.controller.ts` with the three routes. Register the controller and the service in `project-store.module.ts` (section 2). Expected: tsc exits 0.

**Step 5. Invariant sweep.** In `apps/api/test/invariant-sweep.ts`, add three entries after the accept-anyway entry (line 131), in the form of the pending entries (lines 117 to 131):
- `'/api/project-store/projects/:projectId/versions'`: path `/api/project-store/projects/no-such-project/versions`
- `'/api/project-store/projects/:projectId/versions/read'`: path `/api/project-store/projects/no-such-project/versions/read`
- `'/api/project-store/projects/:projectId/versions/restore'`: path `/api/project-store/projects/no-such-project/versions/restore`

Without them the sweep fails by name (`concretePath`, F18). Run `npx vitest run test/invariant-mutation-guard.test.ts test/invariant-get-head.test.ts`. Expected: all pass.

**Step 6. The files gate (F3).** In `project-store-files-gate.test.ts`:
- import the two constants;
- in the F3 test, after line 504, seed `book/drafts/.versions/ch01.md/20261104T231500123Z.md` with `putFile`, content `Old\n`;
- add two rows to `F3_ROWS`, after the pending row (lines 462 to 470), in its form: the list with `fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, {draftPath: 'drafts/ch01.md'})`, and the read with `fileUrl(PROJECT_VERSION_ROUTE, BOOK, {draftPath: 'drafts/ch01.md', id: '20261104T231500123Z.md'})`.

Both must answer 200 and leave the library unchanged. Without the rows, F3 fails by name (lines 518 to 524, F19). Run `npx vitest run test/project-store-files-gate.test.ts`. Expected: all pass.

**Step 7. The tests.** Write V1, V2, V3, X1, X2, X3 and X4 (section 4) in `project-store-draft-versions.test.ts`. Run `npx vitest run test/project-store-draft-versions.test.ts` in `apps/api`. Expected: 7 tests pass.

**Step 8. Full gate.** From the repository root in the worktree: `npm run build -w @bbartolome/scriba-contracts`, `npm test -w @bbartolome/scriba-api`, `npm run lint -w @bbartolome/scriba-api`, `npx prettier --check apps/api packages/contracts`, and `npm run lint` at the root (the root lint runs the examples check over every test file, as PST-17 step 9 did). Expected: each exits 0. `git status --short` shows only the paths of section 2.

**Step 9. Commit.** `git add -- <the new and edited paths of section 2>`, then `git commit -m "feat(PST-18): list, read and restore draft versions" -- <the same paths>`. Expected: one commit on `unit/PST-18`.

**Review parts.** One part. The reviewer checks: the order of restore (D17, steps 3 to 6); that restore's events come from `commit` and are not published twice (D11); the id form (D14) against the names that `saveVersion` writes (D4); and the rows and seed of step 6.

## 4. Acceptance criteria and tests

Each criterion has one test. The criterion text is copied from the unit file and is not changed.

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| "Listing returns versions newest first with sizes; reading returns exact stored content." (line 24) | **V1** in `apps/api/test/project-store-draft-versions.test.ts`, "V1: the list is newest first with byte sizes, and the read returns the stored text exactly" | Seed on disk: `book/drafts/ch01.md` = `Current\n`. In `book/drafts/.versions/ch01.md/`: `20261104T231500123Z.md` = `Old one\n` (8 bytes), `20261104T231500124Z.md` = `Second, é\n` (11 bytes), `20261104T231500124Z-2.md` = `Third\n` (6 bytes). GET the list: 200, `draftPath` `drafts/ch01.md`, ids in the order `20261104T231500124Z-2.md`, `20261104T231500124Z.md`, `20261104T231500123Z.md`; sizes 6, 11, 8; `createdAt` `2026-11-04T23:15:00.124Z` and `2026-11-04T23:15:00.123Z` for the last two. GET the read of `20261104T231500124Z.md`: 200, and `content` exactly `Second, é\n`. |
| "Restore saves the current content as a version before writing." (line 25) | **V2** in the same file, "V2: restore saves the current text as a new version and then writes the restored text to the draft" | Seed: draft `Current\n`; version `20261104T231500123Z.md` = `Old\n`. POST restore `{draftPath: 'drafts/ch01.md', id: '20261104T231500123Z.md'}`: 200 and body `{draftPath: 'drafts/ch01.md', id: '20261104T231500123Z.md', content: 'Old\n'}`. The draft bytes on disk are `Old\n`. The list has two entries. The newest is not the seeded id, and its read is `Current\n`. The test tells the order apart: a version saved after the write would hold `Old\n`. |
| "Version paths remain unreachable through the general file API." (line 26) | **V3** in the same file, "V3: the file API refuses drafts/.versions for read, list, write, edit, delete and move, and the version is unchanged" | Seed: draft `drafts/ch01.md` = `Current\n`; version `drafts/.versions/ch01.md/20261104T231500123Z.md` = `Old\n`. Each of these answers 400 with code `PROJECT_PATH_RESERVED`: GET file on the version path; GET files with `path=drafts/.versions`; POST file/write, POST file/edit (old `Old`) and POST file/delete on the version path; POST file/move from `drafts/ch01.md` to `drafts/.versions/ch01.md/new.md`; POST file/move from the version path to `drafts/x.md`. After them the version holds `Old\n`, the draft holds `Current\n`, and neither `new.md` nor `x.md` exists. |

Extra tests, for decisions that no criterion names:

- **X1** ("X1: list and read create no drafts/.versions folder, and a draft without versions lists as empty") (D10, D15). GET the list of `drafts/ch01.md` with no versions folder: 200 and `versions: []`, and `book/drafts/.versions` does not exist afterwards. GET a read with an id that is not there: 404 `PROJECT_NOT_FOUND`, and still no folder.
- **X2** ("X2: a path that is not a top-level draft, a malformed id, an inactive project and a missing draft are refused, and restore writes nothing") (D7, D9, D14, D15, D17). List `sources/outline.md` and `drafts/sub/ch01.md`: 400 `PROJECT_PATH_INVALID`. List `drafts/.versions/ch01.md`: 400 `PROJECT_PATH_RESERVED`. Read with the ids `../ch01.md` and `ch01.md`: 404 `PROJECT_NOT_FOUND`. Restore with the unknown id `20261104T231500999Z.md`: 404, and the draft and the versions folder are unchanged. Restore of `drafts/new.md` when `drafts/.versions/new.md/20261104T231500123Z.md` exists: 404 `PROJECT_NOT_FOUND`, and the folder still holds only that file. A second project made with `addOkProject` (project-store-active.kit.ts line 71), asked for its list and for a restore: 409 `PROJECT_NOT_ACTIVE`.
- **X3** ("X3: restore publishes files-changed for the draft, and then pending-updated for an open change of that draft") (D11, D21). Propose through the kit route `POST api/project-store-test/pending/propose`: a modify of `drafts/ch01.md` with content `Proposed\n` (the base is the disk text `Current\n`). Open `GET /events` with `openSse` (sse.ts line 31), and skip the `pending-created` block of the propose. Restore to `Old\n`. The next blocks are `files-changed` with `paths: ['drafts/ch01.md']`, then `pending-updated` whose `pendingChange.conflict.reason` is `base-changed`.
- **X4** ("X4: a version written by accept is listed, and its id and content are as the accept left them") (D4, D12; the check of PST-16's and PST-22's accept). Propose a modify of `drafts/ch01.md` (content `Proposed\n`, base `Current\n`), then accept it with body `{}`: 200. The list has one version whose id matches `^\d{8}T\d{9}Z\.md$`, and its read is `Current\n`.

Test seam: the kit app, `createTestApp({libraryDir, modules: [pendingKitModule()]})` (create-test-app.ts lines 9 to 14 and 65; project-store-pending.kit.ts lines 22 to 52, which imports `ProjectStoreModule` and has no guard, F20). HTTP through `fetch` or `postJsonPlain` (project-store-active.kit.ts lines 81 to 93). Events through `openSse` (sse.ts line 31) and `dataOf` (sse.ts line 66). Fixtures through `bookLibrary` (project-store-files.kit.ts lines 44 to 46), `putFile` (lines 70 to 78) and `addOkProject` (project-store-active.kit.ts lines 71 to 78). No test reads a private helper (module lines 56 to 58) or `examples/` (module line 59). The seven tests are V1 to V3 (the criteria) and X1 to X4.

## 5. Agreement with the downstream units

- **PST-21 (version history UI).** Its front matter (unit line 7) names PST-18 in `blocked_by`. Its decisions (lines 15 to 16) and criteria (lines 19 to 20) need: the list, newest first, with sizes (D1; V1); the read's `content`, for the diff against the current text (D2; V1); the restore POST with `{draftPath, id}` and a refresh on `files-changed` (D3, D11; V2, X3); and ids as opaque strings that the client passes back unchanged (D4, D14). The plan provides each of these. PST-21 need not use the restore answer (D18). The PST-34 entry of `plans/DECISIONS.md` (lines 4886 to 4895) says PST-21's scope is unchanged and that its list refreshes on `files-changed`, which D11 gives.
- **PST-22 (review gate).** Its front matter (line 7) names PST-18. Its checklist (line 23) has "restore saves current first", which is V2. Its demo step 4 (line 33) is "Open the draft's history and restore the first version", which D3, D11 and X3 cover. Its demo step 2 (line 31) shows the version that accept writes under `drafts/.versions/<name>/`. X4 checks that the list shows that version, with the name form of D14.
- **PST-16 (done, the base).** PST-16 plan section 6, the PST-18 bullet (line 179), gives PST-18 the list and read rules, the `createdAt` rule and the name form. This plan follows them (D4, D14). PST-16's sketch of restore (`writeText`, then its own publish and its own hook call) is replaced by `FilesService.write` (D11). This is the one departure from PST-16's plan, and its reason is in D11. The `files-changed` and `pending-updated` of restore come from `commit` and from the recheck, as PST-16 D4 and D6 describe.
- **PST-17 (done, the base).** PST-17 plan section 5 (line 146) says that restore saves with `saveVersion`, which PST-17 does not change (PST-17 plan section 2, line 77, lists `draft-versions.ts` as not changed). The versions that accept-anyway writes use the same naming (PST-17 D3, line 20), so the list reads them. X4 covers accept, and accept-anyway calls the same function.
- **PST-23 (migrations).** Its unit (line 21) migrates a file on its first write through "write/edit/apply/restore" (F28). Restore's write is `FilesService.write` (D11), the same path as write and edit. So one migration placed on that path covers restore as well, and this plan adds no migration call. Open point 3.
- **PST-19 and PST-20 (parallel).** No dependency on PST-18's code. PST-19's recheck is the hook that the restore's write triggers (D11). PST-20 reads the pending list and the accept and reject routes, not the versions.
- **Compile & export.** It assembles top-level drafts only (unit line 21). Nothing here changes that.

## 6. Open points

1. **Restore of a draft that does not exist (Navigator-level).** The unit does not say. Options: (a) refuse with 404 and write nothing, which is this plan's default (D17 step 4, D22); (b) write the draft from the chosen version, with no current version to save. The Navigator decides. Step 3 and test X2 change with the choice.
2. **Reserved-path access (settled by PST-16 D18; listed so that it is seen, not reopened).** PST-02 item 6 (plan line 313) recommended an internal mode in `path-safety.ts`. PST-16 D18 chose none, and its code is on main and was approved. This plan follows PST-16 D18 (D7). `plans/DECISIONS.md` line 2912 says PST-15 and PST-18 add an internal mode, but that line reviews PST-02's revision 1, which dropped the option (PST-02 plan line 20 and item 6 of revision 5, F24). If the Navigator wants the mode after all, step 3 and D7 change, and the PST-16 folder helpers (`versionFolderOf` and `pendingFolder`) would need to pass it too.
3. **Where PST-23 puts the restore migration (decided by PST-23's planner).** D11 makes the file write path the one seam for restore. If PST-23 wants its migration somewhere else, its plan must say so. This plan adds no migration.

## 7. Facts checked and assumed

### 7a. Checked by the planner (file and line on main `4b93f96`)

- **F1.** Unit PST-18: front matter lines 1 to 10 (`blocked_by: [PST-16]` at line 7, `parallel_with` at line 8, `unblocks: [PST-21, PST-22]` at line 9); Why line 15; Decisions lines 17 to 21; criteria lines 23 to 26. No Scope or Demo section.
- **F2.** Blocker consistency. PST-16's unit has `unblocks: [PST-17, PST-18, PST-19, PST-20, PST-23]` (line 9). PST-17, PST-19, PST-20 and PST-23 each have PST-18 in `parallel_with` (line 8). PST-21 (line 7) and PST-22 (line 7) name PST-18 in `blocked_by`.
- **F3.** Module `modules/project-store.md`: line 45 (path safety is the one function), 46 (GETs never mutate), 47 (routes), 48 (active rule), 55 to 59 (testing principles), 69 (stable draft IDs deferred), 74 (settled decisions), 75 (version sub-path).
- **F4.** `units/README.md`: line 131 (reads are GET and never mutate; commands are POST), 132 (error shape), 133 (events), 138 (testing seams).
- **F5.** `packages/contracts/src/project-store/routes.ts` lines 47 to 52: `PROJECT_VERSIONS_ROUTE` (GET `/versions`), `PROJECT_VERSION_ROUTE` (GET `/versions/read`), `PROJECT_VERSION_RESTORE_ROUTE` (POST `/versions/restore`).
- **F6.** `packages/contracts/src/project-store/drafts.ts`: `draftVersionSchema` lines 5 to 9 (`id` a string, `createdAt` `z.iso.datetime()`, `size` an integer of at least 0); `draftVersionListSchema` 12 to 15; `draftVersionReadQuerySchema` 18 to 21; `draftVersionReadSchema` 24 to 28 (`draftPath`, `id`, `content`); `draftRestoreSchema` 31 to 34 (`draftPath`, `id`).
- **F7.** PST-01 plan lines 79 to 81: the three version routes and their shapes. The restore row's answer is "read shape".
- **F8.** `apps/api/src/modules/project-store/draft-versions.ts`: import of `writeText` at line 5; `isTopLevelDraft` 8 to 10; `compactStamp` 13 to 15; `versionNameFor` 19 to 29; `versionFolderOf` 33 to 43; `saveVersion` 47 to 61.
- **F9.** `own-folder.ts`: `ownFolder` 11 to 37; a missing folder with `create` false gives undefined (line 21); a folder that resolves outside the root gives `PROJECT_PATH_OUTSIDE` (line 33).
- **F10.** `files.service.ts`: `refuse` 70 to 76; `notAFile` 78 to 80; `hashOf` 87; `decodeText` 93 (the comment at line 91 says NUL and invalid UTF-8 give undefined, and that a BOM is kept); `readFileAt` 135 to 150 (missing or not a file gives NOT_FOUND, lines 140 to 142; over the cap gives FILE_TOO_LARGE, 143 to 145); class 224, constructor 225 to 229; `write` 272 to 290 (public; the `baseHash` check at 283 to 288; the call to `commit` at 289); `projectFor` 512 to 519 (`requireActive` at 513, `find` at 514 to 517); `commit` 523 to 555 (`writeText` at 543, publish at 545 to 549, `notifyFilesChanged` at 550 to 553); `writeText` exported at line 154.
- **F11.** `project-store.service.ts`: `resolvePath` 46 to 48; `onFilesChanged` 71 to 73; `notifyFilesChanged` 76 to 80; `requireActive` 83 to 99. The `FilesChangedHandler` type is at line 21.
- **F12.** `pending.service.ts` on main: imports `isTopLevelDraft` and `saveVersion` at line 21; constructor 85 to 91, with the recheck registered at line 91; `list` 102 to 104 (`requireActive` at 103, `find` at 104); `accept` 173 to 198 (version save at 189 to 196, `saveVersion` at 190); the accept-anyway version save at line 220; `recheck` 322; `recheckQuietly` 334; `openChangeOf` 344 to 349 (`requireActive` at 348, `find` at 349); `writeProposal` 441.
- **F13.** `pending.controller.ts`: `ZodValidationPipe` imported at line 23; accept 41 to 50, with `body ?? {}` at line 49; refresh 74 to 81. `files.controller.ts`: `fileReadQuerySchema` by `pick` at line 35; list 43 to 49; read 51 to 57; write 59 to 66 (`@HttpCode(200)` at line 60).
- **F14.** `project-store.module.ts`: controllers 37 to 45 (`PendingController` at line 44); providers 46 to 64 (`PendingService` at line 62); exports 65 to 73. `projects.service.ts`: `find` 59 to 61.
- **F15.** `packages/contracts/src/project-store/errors.ts`: codes `PATH_INVALID` at line 6, `PATH_RESERVED` at 8, `NOT_FOUND` at 9, `NOT_TEXT` at 10, `NOT_ACTIVE` at 17; statuses 400 (lines 59 and 61), 404 (62), 415 (63), 409 (70).
- **F16.** `packages/contracts/src/project-store/constants.ts`: `RESERVED_PATH_PREFIXES` 16 to 20 (`.scriba/`, `drafts/.versions/`); `FILE_SIZE_CAP_BYTES` at line 23 (`5 * 1024 * 1024`).
- **F17.** `path-safety.ts`: `RESERVED_PATH_PREFIXES` imported at line 6; the reserved message at lines 31 to 32; the reserved check by segment at line 63 (`RESERVED_PATH_PREFIXES.some`); `resolveProjectPath` from line 116; the lexical reserved refusal at line 149; the reserved refusal by real location at lines 183 to 186.
- **F18.** `apps/api/test/invariant-sweep.ts`: `FIXTURE_PATHS` at line 73; the pending entries at lines 117 to 131 (accept-anyway at 129 to 131); `concretePath` 230 to 238 (throws without an entry, at 235); `planGetHead` 489 to 503; `sweepMutations` 658 to 724 (POST checks at 685 to 702, which look at the refusal and not at the code).
- **F19.** `apps/api/test/project-store-files-gate.test.ts`: F2 at 352 to 407 (the loop at 374 to 391 sends every listed route with no cookie, so new routes need no row); `F3_ROWS` 416 to 471 (the pending row at 462 to 470); the F3 test at 494 on (the seeding at 499 to 504; the unlisted-route check at 518 to 524; the status check at 537 to 543).
- **F20.** Kits. `project-store-pending.kit.ts` 22 to 52 (`imports: [PlatformModule, ProjectStoreModule]` at 46; propose route at 27 to 31). `project-store-active.kit.ts`: `addOkProject` 71 to 78, `postJsonPlain` 81 to 93. `project-store-files.kit.ts`: `bookLibrary` 44 to 46, `fileUrl` 49 to 57, `putFile` 70 to 78 (creates the folders, then writes). `sse.ts`: `openSse` at line 31, `dataOf` at line 66. `create-test-app.ts`: `TestAppOptions` 9 to 14, `createTestApp` at 65.
- **F21.** Existing coverage that the new tests do not replace: `project-store-path-safety.kit.ts` 162 to 167 (reserved paths, including `drafts/.versions/...`); `project-store-files-delete-move.test.ts` 113 (move into `drafts/.versions/`); `project-store-pending-propose.test.ts` 331 (propose refuses the version path).
- **F22.** `plans/PST-16.md`: D4 at line 18, D5 at 19, D6 at 20, D8 at 22, D12 at 26, D17 at 31, D18 at 32, D19 at 33, D20 at 34, D23 at 37. The section 3 row for `draft-versions.ts` is at line 93 ("for PST-18's reads"). Section 6, PST-18 bullet, line 179. Section 8, open point 1, line 202. Section 10, item 7, line 238.
- **F23.** `plans/PST-17.md`: D3 at line 20; section 2 "not changed" list at line 77; section 5, PST-18 bullet, line 146.
- **F24.** `plans/PST-02.md`: the R1.1 row at line 20 (the `allowReserved` option is dropped); S6 at line 57; P12 at line 79; open point 6 (item 6, "No internal mode for reserved paths") at line 313, which recommends a mode; line 298 (PST-16 and PST-18 decide how to reach `drafts/.versions/`); open point 4 at line 311.
- **F25.** `plans/DECISIONS.md`: no heading names PST-18. The one line that names PST-18 is line 2912, in the review of PST-02's revision 1. Entries for the downstream units: the PST-10 split at lines 4086 to 4095 (PST-21 needs the tree, `?path=` and `files-changed`); the PST-34 OP-B decision at lines 4886 to 4895 (PST-21's scope unchanged; PST-22 demo step 4 passes through the refreshed list). The PST-16 review at lines 4970 to 4976 and the PST-17 review at lines 5485 to 5490 (both approved).
- **F26.** `plans/QUEUE.md`: line 4 (PST-18 available: yes, its blockers are done), line 9 (PST-21 waits for PST-18), line 11 (PST-22 waits for PST-18).
- **F27.** `.gitignore` (repository root, 9 lines): no rule for `drafts/` or `.versions`.
- **F28.** `units/PST-23-lazy-migrations.md` line 21: other files migrate on their first write "through the module (write/edit/apply/restore)". `units/PST-22-review-gate.md`: line 7 (`blocked_by`), line 20 (checklist heading), line 23 (the restore criterion), lines 31 to 33 (demo steps 2 to 4). `units/PST-21-version-history-ui.md`: line 7 (`blocked_by`), lines 15 to 16 (decisions), lines 19 to 20 (criteria).
- **F29.** Code on main: `draft-versions.ts`, `own-folder.ts`, `three-way-merge.ts`, `backups.ts`, and `pending.service.ts` with accept, refresh and accept-anyway (F12). The PST-16 commits `a7995b5` and `fef1f47` and the PST-17 commits `bcbfb13`, `e0fb37d` and `49e72e4` are on main (`git log`).
- **F30.** Git state: `git status --short` printed nothing at the start. `unit/PST-18` does not exist (`git branch --list`). The worktrees are `scriba-prototype-wt/PST-15` and `scriba-prototype-wt/PST-17` (`git worktree list`); none is for PST-18.
- **F31.** The worktree path `/Users/bbartolome/workspace/scriba-prototype-wt/PST-18` is not in the list of F30.
- **F32.** The F2 and F3 tests loop over `app.routes()` (F19), so they count no fixed list. A grep over `apps`, `e2e` and `packages` for the constants of the pending and version routes found only `apps/api/src/modules/project-store/pending.controller.ts`, `packages/contracts/src/project-store/routes.ts`, `packages/contracts/test/project-store.schema.test.ts` and the built `packages/contracts/dist`. No file in `apps/api/test` imports them.

### 7b. Assumed, not checked here

- **A1.** The implementer's toolchain is Node `v26.x` and npm `11.20.0`, as the PST-16 and PST-17 plans assume.
- **A2.** `npm ci` succeeds in the new worktree, and the registry is reachable. No command was run.
- **A3.** The composed app's router lists the three new routes, so the F2, F3 and sweep loops see them. `ProjectStoreModule` registers the controller, and `enumerateRoutes` reads the Express stack (`create-test-app.ts` lines 39 to 51).
- **A4.** Zod 4's `pick` on `draftVersionReadQuerySchema` works as it does on `fileListQuerySchema` (`files.controller.ts` line 35). The same library and the same method on a `z.object`.
- **A5.** SSE blocks arrive in the order the code publishes them (X3): `files-changed` at `commit` line 545, then the recheck at line 550 publishes `pending-updated`. The timing of `openSse` in X3 is assumed.
- **A6.** `FilesService.write` with no `baseHash` (restore's call) runs the same checks as a draft save: the size cap in `commit` and the too-new check, which applies only to `project.yaml`. No draft restore is refused by a check that a draft write does not have.
- **A7.** The eslint boundaries config accepts the new files, which import only `../platform/platform.module` and sibling files, as PST-16 A6 assumed.
- **A8.** Each test's temp library can be removed in a `finally`, as the other project-store tests do.
- **A9.** The restore's saved version carries the current time, which is after 2026-11-04, so it sorts first. V2, X2 and X4 rely on it. It holds for any run date after 2026-11-04.
