---
id: CEX-16
status: done
---
# CEX-16 plan — snapshot API: create, list, restore with pre-restore snapshot, manifest, events

Revision 2 (reviser), draft. Revision 1 was planned at main `d349a31`; revision 2 is checked at main `e7a97c0` with a clean tree. Unit: `units/CEX-16-snapshot-api.md` (module compile-export, phase:manuscript-snapshots, M5; `blocked_by: [CEX-03]`, which is on main and `done`). This plan changes no criterion, no module file and no unit file, and marks nothing passed.

Revision 2 corrections: the method runs in the implementer's worktree on `unit/CEX-16` with `npm ci` first, and the implementer does not tick the unit's boxes (the orchestrator does it at merge, prompt.md Step 3 item 8, line 168); S4 boots `[...COMPOSED_MODULES, pendingKitModule()]`, the order of the existing precedent; assumptions A-2 and A-3 are now checked; CEX-08 is `planned` (not `draft`) and the branches `unit/CEX-06`, `unit/CEX-07` and `unit/CEX-08` are checked against this plan's files; the five open points are decided (section 8); section 9 is rewritten.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contract and CEX-03

- **Layout.** `snapshots/<label>-<ts>/`. `label` is slugified to `[a-z0-9-]`, at most 40 characters, `snapshot` when empty; `ts` is UTC `YYYYMMDDTHHmmssZ`. The folder holds a copy of every top-level manuscript file under the same name, and `snapshot.yaml` `{schemaVersion, label, createdAt, appVersion, order, words: {body, total}}`. Never `drafts/.versions/`, other `project.yaml` keys or other folders. Writes go through the file API, file by file. Source: unit line 18; `packages/contracts/src/compile-export/snapshots.ts` lines 40–47; `constants.ts` line 84.
- **Create.** `POST {label}` returns the summary; immutable once written; the same label in the same second gets `-2`; publishes `snapshot-created`. Source: unit line 19; `events.ts` lines 22–25 (data) and 45–63 (members).
- **List and unreadable.** `GET` returns `{id, label, createdAt, fileCount, words}`, newest first. A missing or invalid manifest lists as `unreadable` and is never restorable (`COMPILE_SNAPSHOT_UNREADABLE`). An unknown id is `COMPILE_SNAPSHOT_NOT_FOUND`. Source: unit line 20; `errors.ts` lines 14–15, 28–29, 47–48; `snapshots.ts` lines 15–27.
- **Restore.** (1) automatic `pre-restore` snapshot; (2) write every snapshot file to `drafts/`; (3) delete top-level manuscript files absent from the snapshot; (4) write the manifest `order` into `project.yaml`; (5) publish `snapshot-restored` and `manuscript-updated`. Source: unit line 21; module line 54.
- **Author action.** Restore writes directly, is not a pending change, writes no draft versions, and leaves captured bases in open pending changes so the three-way check flags them. Source: unit line 22.
- **Out of scope.** Deleting or renaming snapshots; snapshot diffing; restore as an agent tool. Source: unit line 23; module line 71; `units/AGL-24-compile-tools.md` line 18; `modules/agent-loop.md` line 74.
- **Module rules.** Commands are POST and reads are GET with no side effects (module line 40). File access through the Project store's file API (module line 41). Never reads or writes `drafts/.versions/`, never runs a graph, never calls a model (module line 42). Membership is the top-level `.md` files of `drafts/` (module line 43). Events (module line 44). Error codes carry the `COMPILE_` prefix (`units/README.md` line 133). Testing is external behaviour only (module lines 57–62; README line 139).
- **Contract.** No contract change is needed. The routes (`routes.ts` lines 26–30), schemas, events and codes already exist on main. Source: CEX-01 plan lines 44, 301, 340, 343 (P13, the CEX-16 agreement, O5, O8).
- **CEX-03 writes.** `ManuscriptService.view()` and `orderField()` (`apps/api/src/modules/compile-export/manuscript.service.ts` lines 73–75 and 85–89) are public on main. The order rule of `order-write.ts` is `rowsOf` (lines 61–67), `extrasOf` (lines 92–94) and `materialise` (lines 98–114). CEX-03 writes only the `order` key through `updateProjectYaml` (CEX-03 unit line 22; `manuscript-write.service.ts` lines 162–172). CEX-03 plan line 130 says restore may import `materialise`.
- **DECISIONS.** `plans/DECISIONS.md` has no entry that names CEX-16 (grep). The CEX-03 review entries (lines 6165–6183) concern review only.

### 1b. Planner's choices (the simplest option the sources allow)

- **P1 Files.** `snapshot-names.ts` (pure helpers), `snapshot.service.ts` (`SnapshotService` with `list()`, `create(label)`, `restore(id)`) and `snapshot.controller.ts`. `compile-export.module.ts` gets the controller and the provider. `exports` stays unchanged, so restore is not reachable from the agent.
- **P2 Slug.** `label` is normalised with NFKD, combining marks are removed, it is lower-cased, each run of characters outside `[a-z0-9]` becomes one `-`, leading and trailing `-` are removed, it is cut to 40 characters, and a trailing `-` is removed again. An empty result is `snapshot`.
- **P3 Ids and collisions.** The id is the folder name `<slug>-<ts>`. When the name is taken, `-2`, `-3` and so on follow, as PST-16's version names do (`draft-versions.ts`, `versionNameFor`; the expectation at `project-store-pending-apply.test.ts` lines 637 onward). The manifest `label` is the slug, the same value as the folder's label part.
- **P4 Manifest.** `schemaVersion` 1; `createdAt` is the instant of the call as ISO; `appVersion` is `BUILD_INFO.version` (OP-2); `order` is `materialise(rowsOf(view.entries), extrasOf(orderField()))`, the same rule as CEX-03's writes; `words` is `{body: totals.body, total: totals.manuscript}`. The manifest is checked against `snapshotManifestSchema` before it is written. `snapshot.yaml` is written last, so an interrupted create leaves a folder that lists as unreadable and never one that looks valid.
- **P5 Copies.** Each member's text is read with `read` and written with `write`. The bytes round-trip for valid UTF-8 without NUL, because `decodeText` keeps the BOM (`files.service.ts` lines 93–102). Only view members are copied. Subfolders, `.versions`, non-`.md` files and hidden files are not. A member that is not text already fails GET manuscript (`manuscript.service.ts` line 135), so it fails create the same way.
- **P6 fileCount.** The number of `.md` files in the folder, not counting `snapshot.yaml`. For a readable snapshot it equals the member count at capture.
- **P7 Readable.** `snapshot.yaml` exists, parses as YAML and passes `snapshotManifestSchema`, and the file name of every `order` path is an `.md` file in the folder. Anything else is unreadable. The last clause goes beyond the unit's "missing or invalid manifest" (OP-5): a restore from a folder with a missing file would leave the manuscript without that file.
- **P8 List.** Each directory directly under `snapshots/` is one snapshot. An unreadable one has `label` set to its folder name without a trailing `-<ts>` (and `-n`), `createdAt` set to the folder's `mtime` from the listing (`files.ts` lines 15–20), `words` null and `unreadable: true`. The list is sorted by `createdAt` descending, then `id` descending. A missing `snapshots/` folder gives an empty list. The root listing is checked first, as `ManuscriptService.members()` does (`manuscript.service.ts` lines 212–217), because `files.list` refuses a missing folder (`files.service.ts` line 239). GET never creates the folder.
- **P9 Restore id and checks.** The id must be one of the directory names under `snapshots/`; no path is built from the request. The checks run before any write: unknown gives 404 `COMPILE_SNAPSHOT_NOT_FOUND`, unreadable gives 409 `COMPILE_SNAPSHOT_UNREADABLE`. A refused restore therefore writes nothing, not even the pre-restore snapshot. The unit's step (1) comes after these checks.
- **P10 Restore writes.** (1) create `pre-restore`; (2) write each snapshot `.md` to `drafts/<same name>` with `write` and no `baseHash`; (3) delete each current top-level member whose name is not in the snapshot, with `delete`; (4) `updateProjectYaml(projectId, {order: manifest.order})`; (5) publish `snapshot-restored` `{projectId, snapshotId}`, then `manuscript-updated` with the revision of a fresh `view()`. The file API's `write` and `delete` save no draft versions. Only `pending.service.ts` (lines 190 and 220) and `draft-versions.service.ts` (line 86) call `saveVersion`.
- **P11 Responses.** Create returns 200 with `snapshotSummarySchema`; command POSTs return 200 (CEX-03 P10). Restore returns 200 with `manuscriptViewSchema` (the fresh view of P10 step 5), as CEX-03's writes do (`manuscript-write.service.ts` `commit`, lines 162–172). The contract, the unit and the module name no restore response (OP-4, decided).
- **P12 Events.** Create publishes `snapshot-created` `{projectId, snapshot}`, including for the automatic `pre-restore` snapshot, so the panel of CEX-19 refreshes. Restore publishes `snapshot-restored`, then `manuscript-updated`.
- **P13 Between requests.** Every file call the handlers use is synchronous (`list` line 232, `read` 257, `write` 272, `delete` 328, `updateProjectYaml` 402 in `files.service.ts`), so a create or restore cannot interleave with another request. Restore has no revision check, because the unit gives none. Across files restore is not atomic (OP-3).
- **P14 Errors.** Fixed messages that echo no input (CEX-03 P12). Codes come from `COMPILE_ERROR_CODES` and statuses from `COMPILE_ERROR_STATUS` (`errors.ts` lines 14–15, 47–48). Refusals are `ModuleError`s (`platform.module.ts` line 17).
- **P15 Clock in tests.** Tests freeze `Date` only, with `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime`, as `project-store-pending-apply.test.ts` lines 637–638 do.

## 2. Facts checked and facts assumed

### 2a. Checked

Repository and unit
- HEAD `e7a97c0` (revision 2), tree clean. No `unit/CEX-16`, `unit/CEX-19` or `unit/CEX-20` branch, and no `plans/CEX-19.md` or `plans/CEX-20.md`. `plans/QUEUE.md` line 18 lists CEX-16 as available.
- `units/CEX-16-snapshot-api.md`: front matter lines 1–10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Why line 15; Decisions lines 17–23; criteria lines 26–29. No "Moved to", "Loosened by", "Reworded by" or "Removed by revision" note (grep).
- `modules/compile-export.md`: intro line 3; HTTP line 40; file access line 41; side effects line 42; membership line 43; events line 44; settled decisions lines 46–55 (restore line 54); testing lines 57–62; out of scope lines 64–75 (snapshot deletion and rename line 71).
- `units/README.md`: blocker notation line 64; error prefix line 133; testing line 139; CEX phase row line 123.
- Downstream units: `units/CEX-19-snapshots-panel.md` line 7 (`blocked_by: [CEX-16, CEX-17]`) and criteria lines 20–21; `units/CEX-20-milestone-gate.md` line 7, criteria line 20, demo step 8 line 32; `units/CEX-17-manuscript-route-outline.md` line 8 (`parallel_with` names CEX-16).
- Blocker: `units/CEX-03-order-writes.md` line 9 (`unblocks` names CEX-16), criteria ticked at lines 26–29; `plans/CEX-03.md` line 3 `status: done`.
- `plans/PST-16.md` and `plans/PST-17.md` line 3: `status: done`. `units/PST-16-apply-three-way-check.md` criterion line 31 (a host edit before apply flags `base-changed`) is ticked. Neither CEX-03 nor CEX-02 depends on PST-16, directly or transitively.
- Pipeline (prompt.md Step 3 item 8, line 168; Step 2 "Implement"): the orchestrator ticks the unit's boxes on `unit/<ID>` at merge, not the implementer. The implementer works in its own worktree on `unit/<ID>`, runs `npm ci` first, and commits after each part.

Contract (`packages/contracts/src/`)
- `compile-export/routes.ts` lines 26–30: `SNAPSHOTS_ROUTE` (GET list, POST create) and `SNAPSHOT_RESTORE_ROUTE` (POST).
- `compile-export/snapshots.ts`: id 6; words 9–12; summary 15–22; list 25–27; create body 30–32; restore body 35–37; manifest 40–47 (loose object).
- `compile-export/events.ts`: `snapshotCreatedDataSchema` 22–25; `snapshotRestoredDataSchema` 28–31; members 45–63.
- `compile-export/errors.ts`: codes 14–15 and 28–29; statuses 47–48 (404 and 409).
- `compile-export/constants.ts` line 84: `SNAPSHOT_SCHEMA_VERSION = 1`. `compile-export/index.ts` line 8 re-exports `snapshots.js`.
- `project-store/constants.ts` lines 17–20: reserved prefixes are `.scriba/` and `drafts/.versions/` only, so `snapshots/` is writable through the file API.
- `project-store/files.ts` lines 15–20 (`fileEntrySchema`: `kind`, `size`, `mtime`), 42–46 (write body, optional `baseHash`), 63–66 (delete body).
- `project-store/order-export.ts` lines 6–11 (`MANUSCRIPT_STATUSES`; `'final'` at line 10), line 14 (`MANUSCRIPT_PARTS`), lines 25–30 (`orderEntrySchema`, loose).
- `project-store/pending.ts`: `pendingOriginSchema` lines 6–19; `pendingConflictSchema` lines 29–33 (reasons `base-changed`, `target-missing`, `target-exists`); `pendingStatusSchema` line 34; `proposeInputSchema` lines 75–83 (`projectId`, `path`, `content`, `origin` required).

Project store (`apps/api/src/modules/project-store/`)
- `files.service.ts`: `hashOf` 87; `decodeText` 93–102 (`ignoreBOM: true`); `writeText` 154; `list` 232–255, with the missing-folder refusal at 239; `read` 257; `write` 272; `delete` 328–355 (publish at 346); `updateProjectYaml` 402–432; `commit` 523–555 (publish at 547). No caller of `saveVersion` in this file.
- `atomic-write.ts` line 7: `mkdirSync(dirname(target), { recursive: true })`. A file write creates missing folders, so the first write creates `snapshots/<id>/`.
- `pending.service.ts`: `onFilesChanged` registration line 91; `list` 102–119 (`conflictOf` at 112); `conflictReason` 143–169 (returns `base-changed` when the disk differs from the captured base); `refresh` 277; `recheck` 322–332 (persists conflicts only, never merges); `recheckQuietly` 334–340; `persistConflict` 368. The captured base is the caller's text, or else the disk at the first propose (comment at line 506).
- `saveVersion` callers: `pending.service.ts` lines 190 and 220; `draft-versions.service.ts` line 86.
- `project-folders.ts` line 8: Compile & export creates `snapshots/` on first use.
- `project-store.module.ts` entry exports `ProjectStoreService`, `FilesService`, `PendingService` (the entry-file rule).

Platform
- `platform/platform.module.ts` lines 13–18 export `EXPECTED_COMPOSE_VERSION`, `ModuleError`, `ZodValidationPipe`, `EventsPublisher` and types. Line 40: `exports: [EventsPublisher, SettingsService]`. `BUILD_INFO` is not exported.
- `platform/build-info.ts` lines 1–6: `BUILD_INFO = {version, revision, builtAt}`, overwritten at image build (`Dockerfile` line 35 writes the same export name). `platform/version.controller.ts` line 14 reads `BUILD_INFO.version`.
- Precedent for a re-export added to the Platform entry by another module's unit: SAU-05 (`efb1f80`) added `export { EXPECTED_COMPOSE_VERSION } from './compose-version';`; MPR-03 (`cf939f7`) added `setKnownSecrets`. `modules/platform.md` has no rule against it; rule R1 requires it. No other `draft` or `planned` plan and no `unit/*` branch changes `platform.module.ts`.
- `platform/events/events.publisher.ts` line 61: `publish` is synchronous.
- `eslint.config.mjs` lines 40–41 (entry files are `*.module.ts`) and line 50 (rule R1: a module imports another only through its entry file).

Compile & export (`apps/api/src/modules/compile-export/`)
- `manuscript.service.ts`: class line 66; `view()` 73–75; `preview()` 79–81; `orderField()` 85–89; `compose` 92; totals 140–151; `activeProjectId` 177–187; `projectOrder` 190; `members()` 212–223; `isManuscriptFile` 278–288. Line 3 imports `parseDocument` from `yaml`.
- `manuscript-write.service.ts`: `begin` 128–139; `commit` 162–172, which calls `updateProjectYaml` and publishes `manuscript-updated` at 166–170.
- `order-write.ts`: `rowsOf` 61–67; `extrasOf` 92–94; `materialise` 98–114.
- `compile-export.module.ts`: `@Module` 13–23; `exports` line 22.
- `manuscript.controller.ts`: `@Controller()` line 21; GET 28–31; POST with `ZodValidationPipe` and `@HttpCode(200)` 33–40.

Test seams
- `compile-export-manuscript.kit.ts`: `STATIC_ROOT` line 16; `manuscriptLibrary` 20–45 (book project, `book` active); `withManuscript` 48–67; `getManuscript` 70–76; `manuscriptOf` 79–82.
- `project-store-files.kit.ts`: `ACTIVE_BOOK_SETTINGS` lines 40–41 (`active: book`); `putFile` line 70.
- `project-store-pending.kit.ts`: `pendingKitModule()` with `POST api/project-store-test/pending/propose`, which calls `PendingService.propose`.
- `project-store-pending-apply.test.ts`: `withKit` lines 61–74 (`modules: [pendingKitModule()]`); fake `Date` lines 637–638.
- `create-test-app.ts` line 13: `modules` replaces the composed modules. `app.module.ts` line 21: `COMPOSED_MODULES`, used at line 55. `providers-create.test.ts` lines 8 and 37 use it. `[...COMPOSED_MODULES, <kit>]` is the existing pattern for a kit behind the composed guard (`agent-loop-grounding.test.ts` line 109; `compile-export-assembly.test.ts` line 46). `pendingKitModule()` imports `PlatformModule` and `ProjectStoreModule` (kit lines 45–49). `withManuscript` takes no `modules` option (kit lines 48–67), so S4 boots its own app with `createTestApp` and `sessionCookie`.
- `invariant-sweep.ts` line 72: `FIXTURE_PATHS` needs an entry only for a template with `:` or `{`. The two snapshot routes have neither.
- `guard-request.ts`: `Reply` line 20; `send` line 27; `sessionCookie` line 80.
- `invariant-sweep.ts`: `LOOPBACK_HOST` 38; `LOOPBACK_ORIGIN` 39; `EVENT_WAIT_MS` 208; `snapshotLibrary` 330; `observeEvents` 412.
- `units/SAU-07-invariant-tests.md` line 17: the sweep checks that GET and HEAD never mutate.
- `compile-export-order.test.ts` (CEX-03) lines 1–75: the request helpers and the event parser to copy.

Other plans
- `plans/CEX-06.md` line 3 `status: planned`, table lines 95–101. `plans/CEX-07.md` line 3 `status: planned`, table lines 92–98. `plans/CEX-08.md` line 3 `status: planned` (commit `1e7fbbf`), table lines 79–80. `plans/GRR-15.md` line 3 `status: planned`, table lines 88–94. CEX-17 has no plan (`ls plans`).
- Branches in progress (`git diff --stat main...unit/<ID>`): `unit/CEX-06` changes `manuscript.service.ts` (only `storyGraphs`, from line 222 down: `private` dropped, `paths` added), `preflight-checks.ts`, `preflight.service.ts`, `preflight-claims-orphans.ts`, `compile-export-claims-orphans.test.ts`, `compile-export-preflight.test.ts`. `unit/CEX-07` changes `markdown-text.ts`, `preflight-checks.ts`, `preflight-links-phrases.ts`, `preflight.service.ts`, `compile-export-links-phrases.test.ts`, `compile-export-preflight.test.ts`. `unit/CEX-08` has no commit ahead of main. None of these is a file of this plan.

### 2b. Assumed, not checked

- A-1. `read` of a missing file is refused. The plan does not depend on which code, because it checks the listing first.
- A-2. (Checked in revision 2; see `invariant-sweep.ts` line 72 above.)
- A-3. (Checked in revision 2: the `[...COMPOSED_MODULES, <kit>]` precedent above.)
- A-4. An event published before the response is seen by `take()` within `EVENT_WAIT_MS` (CEX-03's A-4).
- A-5. Draft text read and written back is byte-identical for the fixtures. The test checks it.
- A-6. `yaml` (`parse`, `stringify`) is available to apps/api, since `manuscript.service.ts` already imports `parseDocument` from it.
- A-7. The planner and the reviser ran no build, test, lint or write command. Every fact above was read from the files or from `git`.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/platform/platform.module.ts` | edit (one line) | `export { BUILD_INFO } from './build-info';` after line 16, so compile-export reads `appVersion` through an entry file (R1). Nothing else in Platform changes (OP-2) |
| `apps/api/src/modules/compile-export/snapshot-names.ts` | new | Pure helpers: `slugOf`, `stampOf`, `freeName`, `labelOfFolder`; the constant `PRE_RESTORE_LABEL` = `pre-restore` |
| `apps/api/src/modules/compile-export/snapshot.service.ts` | new | `SnapshotService`: `list()` and `create(label)` in Part A; `restore(id)` in Part B |
| `apps/api/src/modules/compile-export/snapshot.controller.ts` | new | GET list and POST create (Part A, `snapshotCreateRequestSchema`); POST restore (Part B, `snapshotRestoreRequestSchema`); each POST `@HttpCode(200)` |
| `apps/api/src/modules/compile-export/compile-export.module.ts` | edit | `SnapshotController` added to `controllers`; `SnapshotService` added to `providers`; `exports` unchanged |
| `apps/api/test/compile-export-snapshots.test.ts` | new | S1 and D1 (Part A); S2, S3, S4 and D2 (Part B) |

Not changed: the unit file (the orchestrator ticks its boxes at merge); `manuscript.service.ts` (CEX-06 edits it; CEX-16 only calls `view()` and `orderField()`); `order-write.ts` (imported, not edited); `packages/contracts/**` (no contract change); `project-store/**`; `pending.service.ts`; `invariant-sweep.ts`; `apps/web/**`; `examples/**`; `modules/**`; `plans/DECISIONS.md`.

## 4. Method

Run from the root of the implementer's own worktree on branch `unit/CEX-16` (the orchestrator creates the worktree and the branch from `main`; if the branch already has commits, continue from them). Record `node -v` (Node 26) and `npm -v` beside each result. Do not push, and do not open a pull request. Part A is steps A1 to A9; Part B is steps B1 to B6.

Part A (create and list)

- A1. Preconditions: `git branch --show-current` prints `unit/CEX-16`; `git status --short` prints nothing. Then `npm ci`. Expected: exit 0.
- A2. `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
- A3. Edit `platform.module.ts`: add `export { BUILD_INFO } from './build-info';` after line 16. Expected: `grep -n BUILD_INFO apps/api/src/modules/platform/platform.module.ts` shows that line.
- A4. Write `snapshot-names.ts`: `slugOf(label)` (P2); `stampOf(now)`, which is `toISOString()` cut to the seconds and reduced to `YYYYMMDDTHHmmssZ`; `freeName(base, taken)` (P3); `labelOfFolder(name)` (P8); `PRE_RESTORE_LABEL`.
- A5. Write `snapshot.service.ts` with `list()` and `create(label)` (P1, P4 to P8, P11 and P12 for create, P13, P14). It uses `ManuscriptService`, `FilesService`, `ProjectStoreService`, `EventsPublisher`, `BUILD_INFO`, `rowsOf`, `extrasOf`, `materialise` and the contract schemas.
- A6. Write `snapshot.controller.ts` with GET list and POST create, the create body checked by `ZodValidationPipe(snapshotCreateRequestSchema)`. Edit `compile-export.module.ts`: controller in `controllers`, service in `providers`, `exports` unchanged.
- A7. Write `apps/api/test/compile-export-snapshots.test.ts` with S1 and D1 (section 5). Fixtures come from `manuscriptLibrary` and `withManuscript`. `Date` is frozen with P15.
- A8. Verify, in order: (a) `cd apps/api && npx vitest run test/compile-export-snapshots.test.ts`: 2 of 2 pass. (b) `npx vitest run test/compile-export-*.test.ts`: every file passes with the counts it has on main. Stop rule: a failure in (b) means CEX-01 to CEX-03 behaviour changed; stop and report. (c) Mutation check: make `list()` return the snapshots oldest first; S1 goes red. The file is not committed yet, so undo the mutation by hand and rerun (a) green. Record the result.
- A9. Commit Part A: `git add -- apps/api/src/modules/platform/platform.module.ts apps/api/src/modules/compile-export/snapshot-names.ts apps/api/src/modules/compile-export/snapshot.service.ts apps/api/src/modules/compile-export/snapshot.controller.ts apps/api/src/modules/compile-export/compile-export.module.ts apps/api/test/compile-export-snapshots.test.ts`, then `git commit -m "feat(CEX-16): snapshot create and list"`. Never `git add -A` or `git commit -a`.

Part B (restore)

- B1. Extend `snapshot.service.ts` with `restore(id)` (P9, P10, P12 for restore, P13).
- B2. Extend `snapshot.controller.ts` with POST restore, `ZodValidationPipe(snapshotRestoreRequestSchema)`, `@HttpCode(200)`.
- B3. Extend the test file with S2, S3, S4 and D2 (section 5). S4 boots with `createTestApp({libraryDir, staticRoot: STATIC_ROOT, modules: [...COMPOSED_MODULES, pendingKitModule()]})`, takes the cookie with `sessionCookie(app, library)`, and closes the app and removes the library in `finally`.
- B4. Verify: (a) `npx vitest run test/compile-export-snapshots.test.ts`: 6 of 6 pass. (b) as A8(b). (c) `npm test -w @bbartolome/scriba-api`: the whole API suite, including the sweeps over the new routes. (d) `npm run lint -w @bbartolome/scriba-api`. (e) From the root: `npm run build`, `npm test` and `npm run lint`, each exit 0.
- B5. Mutation checks. The Part B work is not committed yet, so `git checkout --` would lose it: apply each mutation by hand, run the named test, undo it by hand, and rerun B4(a) green before the next one. (a) Restore skips the pre-restore snapshot: S2 goes red. (b) Restore also writes a file into `drafts/.versions/`: S3 goes red. (c) Restore skips the `order` write (step 4): S2 goes red. Record the result of each.
- B6. Commit Part B: `git add -- apps/api/src/modules/compile-export/snapshot.service.ts apps/api/src/modules/compile-export/snapshot.controller.ts apps/api/test/compile-export-snapshots.test.ts`, then `git commit -m "feat(CEX-16): snapshot restore with pre-restore snapshot"`. Do not edit the unit file: the orchestrator ticks the boxes at merge.

Stop rules. If S3 fails, a write reached `.versions/`: stop. If S4 shows `conflict` before restore, the captured base equals the restored text: check the fixture, not the code.

## 5. Acceptance criteria and tests

The four criteria are unit lines 26 to 29. Each has one test. D1 and D2 test settled decisions of the unit's Decisions section that no criterion names; they add no criterion. All tests send requests with the loopback `Host`, the session cookie and, for POST, `Origin` and a JSON body (`LOOPBACK_HOST`, `LOOPBACK_ORIGIN`). They read files from `<library>/book/...`. They import only contract schemas and route constants, never internal services (module line 58).

| Criterion | Test | File | What it asserts |
|---|---|---|---|
| 1. A created snapshot matches `snapshots/<label>-<ts>/` with the top-level drafts and a valid manifest; the list returns it newest first. | S1 (Part A) | `apps/api/test/compile-export-snapshots.test.ts` | Fixture: `drafts/ch01.md`, `drafts/ch02.md`, `drafts/notes.txt`, `drafts/sub/x.md`, `drafts/.versions/ch01.md/20261101T000000000Z.md`; `project.yaml` order puts `ch02` first with status `final`. With `Date` frozen at 2026-11-19T10:00:00.000Z, POST create `{label: "Before Cut"}` returns 200, id `before-cut-20261119T100000Z`, fileCount 2, words equal to the GET totals. The folder holds exactly `ch01.md`, `ch02.md`, `snapshot.yaml`; the two `.md` files are byte-equal to the drafts. `snapshot.yaml` parses against `snapshotManifestSchema`, with `label` `before-cut` and `order` `[{path: drafts/ch02.md, status: final}, {path: drafts/ch01.md}]`. One `snapshot-created` event is observed with that id. At 10:00:05 POST create `{label: "Later"}`; the list is `later-...` then `before-cut-...`, each with fileCount and words. |
| 2. Restore brings back drafts, order and statuses, removes files created after the snapshot, and creates a `pre-restore` snapshot. | S2 (Part B) | same | Create `base` from drafts `ch01` (A1) and `ch02` (B1) with the S1 order; keep the GET entries E0. Then write `ch01` as A2 on disk, create `ch03` as C1, and set `ch02` to `draft` with POST status (revision from GET). POST restore `{id: "base-..."}` returns 200. Afterwards: the top level of `drafts/` holds `ch01.md` and `ch02.md` only; `ch01` is A1; the GET entries equal E0 by path, part and status; `project.yaml` `order` equals the manifest order. One `snapshot-restored` (with `snapshotId`) and one `manuscript-updated` are observed. A `pre-restore-...` snapshot is listed, and its folder holds `ch03.md` as C1 and `ch01.md` as A2. |
| 3. `drafts/.versions/` is byte-identical before and after restore. | S3 (Part B) | same | Fixture with versions under `drafts/.versions/ch01.md/` and `drafts/.versions/ch02.md/`. Snapshot `base`. On disk, change `ch01` and delete `ch02`. Read every byte under `drafts/.versions/` (recursively, as a map from path to bytes). POST restore. Read again; the maps are equal. The `pre-restore` folder holds no `.versions`. |
| 4. A pending change against a restored file shows as a conflict. | S4 (Part B) | same; kit `project-store-pending.kit.ts` | Library from `manuscriptLibrary({'drafts/ch01.md': 'A1\n'})`, booted as in B3. The check is PST-16's, done on main (OP-1). Create `base` (ch01 is A1). Edit ch01 on disk to A2. POST `/api/project-store-test/pending/propose` with `{projectId: 'book', path: 'drafts/ch01.md', content: 'A3\n', origin: {kind: 'agent-run', runId: 'run-1'}}`; the captured base is A2. Before restore, GET `/api/project-store/projects/book/pending` shows one change, `status` `pending`, `conflict` null. POST restore `base`. The GET shows the same change, still `pending`, with `conflict.reason` `base-changed`. |
| (decision, not a criterion) | D1 (Part A) | same | Same-second collision: a second create `Before Cut` at the frozen time gives `before-cut-20261119T100000Z-2`. The label `!!!` gives an id starting `snapshot-`. On a library with no `snapshots/` folder, GET list returns `{snapshots: []}` and creates no folder. A folder `snapshots/broken-20261118T120000Z/` holding one `.md` and no manifest lists with `unreadable: true`, `words: null`, `label: "broken"`, `fileCount: 1`. A folder `snapshots/gap-20261118T130000Z/` with a valid `snapshot.yaml` whose `order` names `drafts/ch09.md`, and no `ch09.md`, also lists with `unreadable: true` (P7, OP-5). |
| (decision, not a criterion) | D2 (Part B) | same | Restore of an unknown id, and of `../drafts`, gives 404 `COMPILE_SNAPSHOT_NOT_FOUND`. Restore of the unreadable folder gives 409 `COMPILE_SNAPSHOT_UNREADABLE`; no `pre-restore-` folder appears and `drafts/` is unchanged. |

## 6. Agreement with downstream units and later phases

- **CEX-19 (blocked by CEX-16 and CEX-17).** It needs GET `{snapshots}` with `unreadable` and nullable `words` (`snapshots.ts` lines 15–27; P8); create with body `{label}` returning the summary; restore with body `{id}`; and the events, whose data carry what the panel needs (`events.ts`; P12). An unreadable snapshot gives 409 on restore (P9), which matches CEX-19's criterion at line 21. The dialog's text that names the pre-restore snapshot is UI text; the API creates `pre-restore-<ts>` (P10). CEX-19 refetches on the events and does not depend on the restore body.
- **CEX-20 (milestone gate).** Its criterion at line 20 requires CEX-16 to CEX-19 to pass on main. S1 to S4 and D1 to D2 are the CEX-16 part. Demo step 8 (line 32: delete chapter 3, restore `before-cut`, the chapter is back and a `pre-restore` snapshot is listed) is what S2 checks at API level.
- **CEX-17 (parallel, UI).** Its Decisions say it refetches on `manuscript-updated`, which restore publishes (P10). CEX-16 changes no web file.
- **CEX-14 (blocked by CEX-03, parallel with CEX-16).** Its settings write touches the `export` key (module line 41). Restore writes only the `order` key (P10 step 4), so the two do not collide.
- **CEX-03 and the order rule.** A snapshot's order uses CEX-03's `materialise` rule, so a restored order is a full effective order. The next view then shows what the manifest says, with the graph-ordered block first (CEX-03 P13). No CEX-03 file changes.
- **CEX-01 contract.** Used as it stands. The one response shape the contract lacks, restore's body, is OP-4 (decided: the manuscript view, no contract change).
- **PST-16 and PST-17.** Restore's `files-changed` events reach `recheckQuietly`, which persists conflicts and never merges (`pending.service.ts` lines 322–340). S4 relies on this.
- **AGL-24 (agent compile tools).** Restore is not an agent tool, and `SnapshotService` is not added to `exports` (P1).
- **Later phases.** The GET/HEAD sweep applies to the list (SAU-07 line 17). The list creates nothing (P8).

## 7. Other plans on the same files

The files of this plan are `platform.module.ts` (one line), `compile-export.module.ts`, the three new source files of section 3, and the test file. Plans with status draft or planned: CEX-06, CEX-07, CEX-08 and GRR-15 (all `planned`). CEX-17 has no plan; its unit names the same module's web UI only. No other plan and no `unit/*` branch changes `platform.module.ts` or `compile-export.module.ts` (section 2a, branches).

- **CEX-06 (planned; `unit/CEX-06` in progress).** Edits `manuscript.service.ts` (`storyGraphs`, from line 222 down: `private` dropped and `paths` added; `compose` unchanged), `preflight-checks.ts`, `preflight.service.ts`, and `compile-export-preflight.test.ts` (lines 70 to 76 and 119 to 121); adds `preflight-claims-orphans.ts` and its test (table lines 95–101). No file in common with CEX-16. CEX-16 calls only `view()` and `orderField()` (lines 73–89, above the CEX-06 hunks), and CEX-06 does not change either one's result. In either order, CEX-16's snapshots read the same view; the line numbers this plan cites in `manuscript.service.ts` below line 222 shift by at most 5 lines if CEX-06 lands first.
- **CEX-07 (planned; `unit/CEX-07` in progress).** Edits `markdown-text.ts`, `preflight-checks.ts`, `preflight.service.ts` (its constructor takes `EntitiesService`) and `compile-export-preflight.test.ts`; adds `preflight-links-phrases.ts` and its test (table lines 92–98). `compile-export.module.ts` is not in its table (its P1 and D5). In either order no file is shared.
- **CEX-08 (planned; `unit/CEX-08` has no commit ahead of main).** Edits `examples/nonfiction/project.yaml` only (table lines 79–80). CEX-16's tests use temp libraries and never read `examples/` (module line 59). No shared file in either order. With CEX-08 on main, CEX-20's demo step 8 snapshots the sample's order and restores it through P10 step 4.
- **GRR-15 (planned).** Touches `apps/web/src/app/features/graph-runner/**` and `e2e/**` only (table lines 88–94). No shared file.
- **CEX-17 (no plan).** Its unit names web feature files under `compile-export`, and no API file. CEX-16 changes no web file, so either order is valid; CEX-17's refetch on `manuscript-updated` works with CEX-16's restore event.

## 8. Open points (decided by the reviser, revision 2)

- **OP-1 Blocker for criterion 4. Decided: `blocked_by` stays `[CEX-03]`.** Criterion 4 and unit line 22 rely on the Project store's three-way check (`pending.service.ts` `conflictReason` lines 143–169, `list` lines 102–119, `recheck` lines 322–332). That check is PST-16's, and PST-16 is `done` on main (`plans/PST-16.md` line 3; its criterion at unit line 31 is ticked), so the plan works on main as it is and S4 runs. Adding a blocker is none of the reviser's four actions (remove, loosen, reword, split), and no plan needs it, so no unit changes. No criterion changes.
- **OP-2 `appVersion` from Platform's `BUILD_INFO`. Decided: the one re-export line in `platform.module.ts` (step A3).** Rule R1 (eslint line 50) forbids importing `platform/build-info.ts` directly and allows the entry file. Neither `modules/compile-export.md` nor `modules/platform.md` forbids another unit from adding a re-export to the Platform entry, and SAU-05 (`efb1f80`, `EXPECTED_COMPOSE_VERSION`) and MPR-03 (`cf939f7`, `setKnownSecrets`) did the same. The `Dockerfile` (line 35) rewrites `build-info.ts` with the same export name, so the line stays valid in the image. No other plan or branch edits the file.
- **OP-3 Restore is not atomic across files. Decided: no rollback.** No criterion of the unit and no settled decision of the module asks for atomicity; the module's settled decision (line 54) names the pre-restore snapshot as the safety net. A failure after step (2) leaves `drafts/` partly restored, and the pre-restore snapshot holds the earlier state.
- **OP-4 Restore response. Decided: 200 with `manuscriptViewSchema`, the fresh view of P10 step 5 (P11).** The contract (`snapshots.ts`, `routes.ts` lines 29–30), the unit and the module name no restore response. The view is what CEX-03's write commands return, it needs no contract change, and CEX-19 refetches on the events and does not read the body.
- **OP-5 Unreadable when a manifest file is missing. Decided: keep the clause (P7).** No criterion words the unreadable state: criteria 1 to 4 (unit lines 26–29) test create, list order, restore, `.versions/` and the conflict, and CEX-19's criterion (line 21) only needs that an unreadable snapshot is not restorable. The clause protects criterion 2 ("Restore brings back drafts"): a restore from a folder missing a file named by its order would delete that draft (step 3) and leave no copy to bring back. D1 covers the missing-manifest form; D2 covers the 409.

## 9. Review parts

Every step of section 4 and every test of section 5 is in exactly one part.

- **Part A: create and list (criterion 1).** Steps A1 to A9. Tests S1 (criterion 1) and D1. Files: `platform.module.ts` (the one `BUILD_INFO` line), `snapshot-names.ts`, `snapshot.service.ts` (`list`, `create`), `snapshot.controller.ts` (GET, POST create), `compile-export.module.ts`, `compile-export-snapshots.test.ts` (S1, D1). Review: P1 to P8, P11 and P12 for create, P13 to P15; the folder holds only the top-level `.md` members and `snapshot.yaml`, written last; the manifest passes `snapshotManifestSchema` and its `order` is `materialise(rowsOf(view.entries), extrasOf(orderField()))`; GET writes nothing and creates no folder; `exports` of `compile-export.module.ts` is unchanged; Platform gets the one line only; the A8(c) mutation went red; the commit uses explicit paths.
- **Part B: restore (criteria 2, 3 and 4).** Steps B1 to B6. Tests S2 (criterion 2), S3 (criterion 3), S4 (criterion 4) and D2. Files: `snapshot.service.ts` (`restore`), `snapshot.controller.ts` (POST restore), `compile-export-snapshots.test.ts` (S2 to S4, D2). Review: P9 (both refusals before any write; the id must be a listed folder name), P10 steps 1 to 5 in order, P11 and P12 for restore; no write under `drafts/.versions/` and no `saveVersion` call; restore writes no `baseHash`; S4 boots `[...COMPOSED_MODULES, pendingKitModule()]` and sees `conflict` null before and `base-changed` after; the three B5 mutations went red; B4 (c) to (e) pass; the unit file is not edited.
