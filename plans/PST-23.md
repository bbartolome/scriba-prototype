---
id: PST-23
status: draft
---
# PST-23 plan — lazy, backed-up file migrations and the migrator registry

Batch: [PST-23] (Project store, `phase:migrations`, M7), a batch of one. Draft by the planner at main `9d1d995` (HEAD when read; the working tree was clean). Revision 1. Ten open points (section 7) need the Navigator; each names the default this plan uses until the Navigator rules.

## 1. Decisions this plan obeys

### 1a. From the unit (`units/PST-23-lazy-migrations.md`)
- **U1. Gate and blocker.** Merging closes `phase:migrations` (line 14). `blocked_by: [PST-16]` (line 7). PST-16 is `status: done` (`plans/PST-16.md` line 2).
- **U2. Registry.** Per-file `schemaVersion`, a migration registry keyed by file kind and version. The Project store owns the mechanism and the `project.yaml` migrators. Other modules call `registerMigrator(kind, pathPattern, {fromVersion → step}, currentVersion)` on the provider. Registering a current version sets the kind's too-new threshold (line 20).
- **U3. Lazy, POST-only.** Activation migrates `project.yaml` (line 21). Other files migrate on their first write through the module (write, edit, apply, restore) or on an owning module's POST (line 21).
- **U4. GET.** A GET of an older file returns an in-memory upgraded view, marked `upgraded`, and writes nothing (line 22).
- **U5. Backup and log.** Each migration writes a backup and appends a line to `logs/migrations.log` through `appendLog`. A migration is not a pending change (line 23). The backup path is changed by 1b.
- **U6. YAML document.** `project.yaml` migrations operate on the YAML document so comments survive (line 24).
- **U7. Out of scope.** `settings.yaml` and its eager hook (Platform) (line 25; module line 72).
- **U8. Criteria.** Lines 28 to 32. Section 4 tests them. This plan changes no criterion.
- **U9. Why.** Line 17: upgrade automatically with a backup and a log entry (40); refuse newer files (41, shipped in PST-06); keep `project.yaml` comments (42).

### 1b. Changed by a recorded Navigator decision (open point 1)
- **N1.** `plans/DECISIONS.md` line 4041 (PST-07 point 6, option B): PST-23's backups go to `<project>/.scriba/project-store/backups/<UTC>/<path>`, through a folder owned by `project-store`. The same record is in `plans/PST-07.md` lines 25 and 181. The unit's line 23 still reads `.scriba/backups/`. DECISIONS says a PST-23 reviser makes that reword when PST-23 is planned. This plan uses the option B path and does not edit the unit.

### 1c. From the module (`modules/project-store.md`)
- **M1.** Line 46: GETs never mutate; migrations run on POSTs.
- **M2.** Line 48: the active-project rule. The exception is `appendLog` for any `ok` project, so the migration's log line is allowed at activation, before the switch.
- **M3.** Line 49: only project-relative paths in logs, tool results and errors. The log line and the backup path it names are project-relative.
- **M4.** Line 50: hashes are `sha256:` plus the lower-case hex of the UTF-8 bytes. A GET's `hash` stays the hash of the disk bytes, so the next write's `baseHash` matches the disk.
- **M5.** Line 51: atomic writes (temp file, then rename).
- **M6.** Line 52: no import of another module's implementation; modules register migrators at runtime.
- **M7.** Line 53: the in-process provider runs the same path checks, active check and validators as HTTP.
- **M8.** Line 45: `resolvePath` is the one path check.
- **M9.** Lines 57 to 59: external behaviour only (HTTP, files on disk), a temp library, and no reads of `examples/`.
- **M10.** Line 9: this unit needs apply (PST-16), not the whole review phase.

### 1d. From the README (`units/README.md`)
- **R1.** Line 138: persisted formats carry their own `schemaVersion`.
- **R2.** Line 139: the app's own records are written directly; agent and recipe changes to book content are pending. A migration is an app write, so it is not a pending change.
- **R3.** Line 135: error codes carry the `PROJECT_` prefix. `PROJECT_SCHEMA_TOO_NEW` (409) and `PROJECT_INVALID` (422) already exist (`packages/contracts/src/project-store/errors.ts` lines 72 and 73).
- **R4.** Line 102: `phase:migrations` is required before any file kind ships `schemaVersion` 2.
- **R5.** Line 141: testing convention (Vitest, the composed app, a temp library, no reads of `examples/`).

### 1e. From other plans, DECISIONS and merged code
- **X1.** `plans/PST-04.md` line 22 (D7) and line 30 (D15): the migration call goes at step (3) of activation, before the hooks. `active-project.service.ts` line 69 holds the comment that marks the place.
- **X2.** `plans/PST-16.md` line 33 (D19) and line 182: accept writes the target through `writeProposal` (`pending.service.ts` lines 440 to 443), and PST-23 adds its migration before that write. Line 26 (D12): a failed write leaves the open change open. Line 27 (D13): accept writes content as given. PST-23 adds only the too-new and migration rules.
- **X3.** `plans/PST-24.md` lines 143 to 145 (R1 to R3): a bytes payload is never migrated; too-new is refused for a bytes write too; a bytes write triggers neither the backup nor the log line.
- **X4.** `plans/PST-06.md` line 53 (P13): the too-new check is one function of the relative path, which PST-23 extends. Line 142: registering a current version sets the threshold.
- **X5.** Test precedent: `apps/api/test/project-store-pending.kit.ts` lines 22 to 47 is a test-only controller that calls an in-process provider (route at line 34 registers a validator for `graphs/*.json`). `apps/api/test/create-test-app.ts` line 13 takes a `modules` option, used at `project-store-pending-propose.test.ts` line 70.
- **X6.** `units/GRR-02-graph-crud.md` line 22 and `plans/GRR-02.md` line 17: graph migrators come later, and v1 has none.

### 1f. Planner's choices (the simplest option; each is recorded here)
- **C1. Registry and default.** A new `migrations.ts` holds the types, the validation, the version reader and the upgrade. `ProjectStoreService` holds the list. The list starts with one entry: kind `project-yaml`, pattern `project.yaml`, no steps, current version `PROJECT_YAML_SCHEMA_VERSION` (1, `project-yaml.ts` line 5). Registering a kind that is already listed replaces its entry. Lookup takes the first entry, in registration order, whose pattern matches. The pattern syntax is PST-15's (`patternToRegExp`, `pending-store.ts` line 93): `*` matches within one path segment.
- **C2. Steps.** A step is `(doc: Document) => void` on a `yaml` Document, keyed by `fromVersion`. After each step the registry sets `schemaVersion` to the next version. `newMigrator` throws unless the step keys are exactly 1 to `currentVersion` − 1.
- **C3. Version of a file.** The top-level `schemaVersion` integer. A file with no integer version, and text that does not parse, is neither migrated nor refused. Text that does not parse is stored as given, and the existing `project.yaml` check in `commit` still refuses it, as today.
- **C4. Serialisation.** YAML: `doc.toString({lineWidth: 0})`, through the existing `keepFraming` (`files.service.ts` lines 209 to 212). A `.json` file: `JSON.stringify(doc.toJS(), null, 2) + '\n'`.
- **C5. Too-new.** A version above the current one is refused with `PROJECT_SCHEMA_TOO_NEW` (409) on read, write, edit and accept, for the disk file and for incoming text. The message is `PROJECT_MESSAGES.TOO_NEW` for `project.yaml` (unchanged) and a new `FILE_MESSAGES` text for other kinds.
- **C6. GET.** `content` is the upgraded text and `upgraded: true` is set. `hash` and `mtime` are the disk file's. Nothing is written, backed up or logged. Without a migration the response has no `upgraded` key.
- **C7. Write rule for text.** The stored text is at the current version. Incoming text that is older than current is upgraded before it is stored. If the disk file is older than current, its bytes are backed up first, then the stored text is written, then the log line is appended. A bytes payload is never migrated and triggers no backup and no log line (X3).
- **C8. Edit.** `old` is matched against the upgraded view, which is the text a GET returns. Then C7 applies to the result.
- **C9. Accept.** `writeProposal` applies C7 to the proposed or edited text. The three-way check and the conflict come first, as now (`pending.service.ts` lines 173 to 198). A too-new file refuses before any write, and the change stays open (X2, D12).
- **C10. Activation.** `ActiveProjectService.activate` step (3) calls `FilesService.upgradeProjectYaml(project)`. It applies C7 to the disk text, then calls `ProjectStoreService.notifyFilesChanged` for `project.yaml`. That hook rechecks the open changes (`pending.service.ts` lines 334 to 340). The migration publishes no SSE event. A step that throws gives `PROJECT_INVALID` (422) with a new message; nothing is written and the switch does not happen (open point 7).
- **C11. Backup folder.** `saveBackup` (`backups.ts` line 11) takes an optional `segments` argument, default `['.scriba', 'backups']`, which keeps PST-17's callers unchanged. A migration passes `['.scriba', 'project-store', 'backups']`. The folder comes from `ownFolder` (`own-folder.ts` line 11), which applies the same containment check as `stateDir`. The name is `versionNameFor(compactStamp(now), '', …)` (`draft-versions.ts` lines 13 to 15 and 19). Open point 2 says why `stateDir` is not called.
- **C12. Log line.** One line appended with `FilesService.appendLog` to `logs/migrations.log`: `<ISO UTC> <path> migrated from schemaVersion <from> to <to>; backup .scriba/project-store/backups/<name>/<path>`. `appendLog` publishes nothing.
- **C13. Owning modules.** There is no separate entry point. An owning module's POST writes through `FilesService.write` or `PendingService.accept`, and C7 runs there (U3).
- **C14. Contracts unchanged.** `projectYamlSchema` (`packages/contracts/src/project-store/project.ts` line 22) accepts any integer of at least 1. `fileReadSchema.upgraded` already exists (`files.ts` line 38). No route and no error code is added.
- **C15. New projects.** `newProjectYaml` keeps writing `PROJECT_YAML_SCHEMA_VERSION` (`project-yaml.ts` lines 55 to 64). This unit ships no v2 file kind.

## 2. Files to create or change

Only these paths change. No file under `units/`, `modules/`, `packages/contracts/` or `plans/` changes, except that this plan is the planner's own file.

Changed:
- `apps/api/src/modules/project-store/project-store.service.ts`: a registry field that starts with the `project-yaml` entry (C1); `registerMigrator(kind, pathPattern, steps, currentVersion)`, `migratorFor(relativePath)` and `projectYamlVersion()`. The constructor is at lines 35 to 38.
- `apps/api/src/modules/project-store/project-yaml.ts`: `readYamlState(text, currentVersion = PROJECT_YAML_SCHEMA_VERSION)`. The too-new test at lines 31 to 37 reads the argument.
- `apps/api/src/modules/project-store/project-discovery.ts`: line 106 passes `store.projectYamlVersion()`.
- `apps/api/src/modules/project-store/samples.service.ts`: line 86 passes `this.store.projectYamlVersion()`.
- `apps/api/src/modules/project-store/backups.ts`: `saveBackup` gets the optional `segments` argument (C11). Its `ownFolder` call is at line 17.
- `apps/api/src/modules/project-store/files.service.ts`: `FILE_MESSAGES` (lines 49 to 64) gets two entries (a too-new text for other kinds; an upgrade failure). `tooNew` (lines 82 to 84) takes the message. `isRootProjectYaml` (lines 104 to 107) keeps its name and becomes the migrator lookup, as P13 asks. `isTooNewText` (lines 109 to 111) compares with the current version. `read` (262 to 274), `write` (277 to 299), `edit` (302 to 333), `updateProjectYaml` (411 to 441) and `commit` (533 to 574) follow C5 to C9. New: `upgradeProjectYaml(project)` (C10), and private `planText` and `writeUpgraded`.
- `apps/api/src/modules/project-store/active-project.service.ts`: injects `FilesService` (constructor at lines 21 to 26). Line 69 becomes the call (C10).
- `apps/api/src/modules/project-store/pending.service.ts`: injects `FilesService` (constructor at lines 85 to 89). `applyContent` (231 to 237) passes `project` to `writeProposal` (440 to 443), which applies C9. `checkContent` (409 to 422) uses the version. The imports at lines 26 (`isRootProjectYaml`), 30 (`writeText`) and 46 (`readYamlState`) change with them.

New:
- `apps/api/src/modules/project-store/migrations.ts`: types `MigrationStep` and `Migrator`; `PROJECT_YAML_KIND`; `newMigrator` (validation, C2); `versionOf(doc)`; `upgradeDocument(migrator, doc, from)`.
- `apps/api/test/project-store-migrations.kit.ts`: `migrationsKitModule()`, a test-only controller under `api/project-store-test` with the route `migrations/register` (body `{kind, pattern, currentVersion}`). It registers one fixed step, from 1 to 2, which sets `upgradedBy: test-migrator`. It imports `ProjectStoreModule`, as `pendingKitModule` does. It reuses `bookLibrary`, `putFile`, `fileUrl`, `sha256Of` and `isUtcTimestamp` from `project-store-files.kit.ts`, and `buildProjectsLibrary` and `withProjectsApp` from `project-store-projects.kit.ts`.
- `apps/api/test/project-store-migrations.test.ts`: five tests, one per criterion (section 4).

Not changed: `packages/contracts/**`, `pending-store.ts`, `draft-versions.ts`, `project-status.ts`, `project-store.module.ts` (both services are already providers), and every existing test. The PST-06, PST-07, PST-16, PST-17 and PST-24 tests must pass unchanged.

## 3. Procedure

1. **Setup.** Work in a new worktree on branch `unit/PST-23` created from `main`. There run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Record `node -v` and `npm -v`. Expected: exit 0.
2. **Baseline.** From `apps/api`, `npx vitest run test/project-store-*.test.ts`. Expected: every file passes. Record the file and test counts.
3. **Red tests.** Create the kit and the test file (section 4). Run `npx vitest run test/project-store-migrations.test.ts`. Expected: all five tests fail at the registration step, because `registerMigrator` does not exist on main.
4. **Registry.** Create `migrations.ts` (C1 to C4). Add the registry field, the default entry and the three methods to `project-store.service.ts`. Expected: `npm run build -w @bbartolome/scriba-api` exits 0.
5. **Version threading.** Edit `project-yaml.ts`, `project-discovery.ts` and `samples.service.ts` (section 2). Expected: `npx vitest run test/project-store-discovery.test.ts test/project-store-samples.test.ts test/project-store-active.test.ts` passes, as in step 2.
6. **Backups.** Edit `backups.ts` (C11). Expected: `npx vitest run test/project-store-files-helpers.test.ts test/project-store-pending-*.test.ts` passes, as in step 2.
7. **File API.** Edit `files.service.ts` (section 2: C5 to C9 and the `upgradeProjectYaml` method of C10). Expected: `npx vitest run test/project-store-files-*.test.ts` passes, as in step 2.
8. **Activation.** Edit `active-project.service.ts` (C10). Expected: `npx vitest run test/project-store-active.test.ts` passes, as in step 2.
9. **Accept.** Edit `pending.service.ts` (C9). Expected: `npx vitest run test/project-store-pending-*.test.ts test/project-store-review-gate.test.ts` passes, as in step 2.
10. **Criteria.** `npx vitest run test/project-store-migrations.test.ts`. Expected: five tests pass. Record the output.
11. **Whole API suite.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. No test that passed before fails. Record the total.
12. **Gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Also `npx prettier --check` on the section 2 paths. Expected: each exits 0.
13. **Scope.** `git status --short` lists only the section 2 paths. Ignored build output is not listed.
14. **Commit.** Commit on `unit/PST-23`. A test commit first, then the feature commit, as PLT-02 did: `feat(PST-23): lazy, backed-up file migrations and the migrator registry`. Do not squash. Record the hashes.
15. **Fresh clone.** Clone `unit/PST-23` into an empty directory and there run `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
16. **Mutation checks.** On the committed tree, make each change, run the named test, then restore with `git checkout -- <path>`. (M1) In `writeUpgraded`, skip the backup: C1 and C5 fail. (M2) In `read`, write the upgraded text back to disk: C2 fails. (M3) In `isTooNewText`, compare with 1 instead of the registered version: C3 fails. (M4) Serialise the upgraded `project.yaml` from a plain object instead of the Document: C4 fails. Expected after each restore: `git status --short` is empty.
17. **Record.** The Node and npm versions, each command's output, the mutation results, and the commit hashes.

## 4. Acceptance criteria and tests

All five run with `npx vitest run test/project-store-migrations.test.ts` from `apps/api`, after the contracts build. Each test boots `createTestApp({ libraryDir, modules: [migrationsKitModule()] })`, as `project-store-pending-propose.test.ts` does, and takes the session cookie as `withProjectsApp` does. Each test builds its own temp library with `buildProjectsLibrary` and never reads `examples/`. Registration is a POST to the kit route. The assertions are HTTP responses and files on disk.

| Criterion (unit line) | Test | Seam | Pass condition |
|---|---|---|---|
| C1 (28): activating a v1 project rewrites `project.yaml` to v2, writes a backup and a log line, and creates no pending change | `C1: activation upgrades project.yaml with a backup, a log line and no pending change` | HTTP and disk | The kit registers `project-yaml` with pattern `project.yaml` and current version 2. The default `book` fixture (no active project) holds the v1 bytes B1. `POST /api/project-store/active` with `{projectId: 'book'}` gives 200 and `{active: 'book'}`. On disk, `project.yaml` has `schemaVersion: 2` and `upgradedBy: test-migrator`. `.scriba/project-store/backups/<stamp>/project.yaml` equals B1, where the stamp matches `/^\d{8}T\d{9}Z(-\d+)?$/`. `logs/migrations.log` has exactly one line, and it contains `project.yaml migrated from schemaVersion 1 to 2`. `GET /api/project-store/projects/book/pending` gives `changes: []`. |
| C2 (29): a GET of a v1 file returns the upgraded view and leaves the file byte-identical | `C2: GET returns the upgraded view and writes nothing` | HTTP and disk | The kit registers `notes` with pattern `notes/*.yaml` and current version 2. `book/notes/a.yaml` holds the v1 bytes B1. `GET` of the file route with `path=notes/a.yaml` gives 200. Its content has `schemaVersion: 2` and `upgradedBy`, and `upgraded` is `true`. Its `hash` equals `sha256Of(B1)`. The disk bytes equal B1 (a Buffer comparison). There is no `.scriba` folder and no `logs/migrations.log`. |
| C3 (30): a file with a too-new version is refused for read and write | `C3: a too-new file is refused for read and write` | HTTP and disk | The kit registers `notes` with current version 2. `notes/b.yaml` holds `schemaVersion: 3` (bytes B3). `GET` of it gives 409 `PROJECT_SCHEMA_TOO_NEW`. A write of it gives 409 and B3 is unchanged. `notes/c.yaml` holds v1 on disk. A write of it with content `schemaVersion: 3` gives 409 `PROJECT_SCHEMA_TOO_NEW`, and its disk bytes are unchanged. |
| C4 (31): comments in `project.yaml` survive a migration | `C4: comments in project.yaml survive a migration` | HTTP and disk | `project.yaml` is `# The book record. Comments must survive.`, then `schemaVersion: 1`, then `title: Book # working title`, then `genrePack: nonfiction`. The kit registers `project-yaml` with current version 2. Activation gives 200. The file keeps both comment lines, keeps the trailing comment on the title line, keeps the key order, and gains `schemaVersion: 2` and `upgradedBy`. |
| C5 (32): a test migrator registered for another file kind runs on that file's first write | `C5: a registered kind is upgraded on its first write, and only once` | HTTP and disk | The kit registers `notes` with current version 2. `notes/d.yaml` holds B1. A write of `notes/d.yaml` with B1's text and `baseHash` `sha256Of(B1)` gives 200. On disk the file has `schemaVersion: 2` and `upgradedBy`. `.scriba/project-store/backups/<stamp>/notes/d.yaml` equals B1. `logs/migrations.log` has one line naming `notes/d.yaml`. A second write of the stored text, with its current hash as `baseHash`, gives 200 and adds no backup and no log line. |

The existing PST-06 tests for a too-new `project.yaml` (`project-store-files-write.test.ts` lines 191 to 205, and `project-store-active.test.ts` from line 132) keep covering `project.yaml` and must pass unchanged.

## 5. Downstream agreement

- **Graph runner (GRR-02 unit line 22; `plans/GRR-02.md` line 17; `modules/graph-runner.md` line 40).** It will register `graphs/*.json` with `registerMigrator(kind, pathPattern, steps, currentVersion)`, the signature of unit line 20. This plan provides that signature, with steps on a YAML Document (C2) and JSON written back as JSON (C4). Graph file access goes through the file API, so its saves and reads get C5 to C7 without change. It must decide which code wins for a newer graph once a current version is registered (open point 9).
- **Any file kind's `schemaVersion` 2 (README line 102).** Unblocked by this unit. No v2 kind ships here, and `newProjectYaml` stays at version 1 (C15).
- **PST-16 (done).** This unit fills its seam, `writeProposal` (D19), and keeps D12 and D13 (X2).
- **PST-17 (done).** Accept-anyway keeps its PST-17 backup in `.scriba/backups/` (`pending.service.ts` line 222). If the disk file is also older than current, PST-23 adds a second backup in `.scriba/project-store/backups/`. That is open point 1.
- **PST-18 (done).** Restore writes through `FilesService.write` (`draft-versions.service.ts` line 87), so it gets C5 to C7 with no change.
- **PST-19, PST-20, PST-21, PST-22.** No change. The Shell's copies already carry the `upgraded` field (`apps/web/src/app/shell/project-store-copies.ts` lines 122 to 137).
- **PST-24 (done).** Keeps R1 to R3 (X3). The bytes branch of `commit` (`files.service.ts` lines 558 to 562) is unchanged. The too-new check applies to bytes writes as the existing check does, now for any registered kind.
- **PST-04, PST-06, PST-07 (done).** PST-04's step (3) and PST-06's P13 are filled in. `stateDir` (P12) is unchanged. `updateProjectYaml` gets C7 through `commit`.
- **Compile & export and the Agent loop.** They read through the file API, so they receive upgraded views (C6) with no change.
- **Unit `unblocks` (line 9).** Its entries are quoted, so they are informative. No unit's `blocked_by` names PST-23 (section 8), so the README inverse rule needs no unit change.

## 6. Other plans that change the same files

- Checked: the draft and planned plans are AGL-22 (draft), SHL-18 (draft), CEX-15 (planned), GNP-15 (planned) and GRR-15 (planned). Section 2 of each lists no path this plan changes. GNP-15's mention of `files.service.ts` (`plans/GNP-15.md` line 74) describes the diff already on main from PST-24. It is not a planned change.
- Result: no draft or planned plan changes a file this plan changes, so the merge order does not matter for them.
- Merged work that must stay true: PST-24's bytes branch (X3) and PST-16's `writeProposal` seam (X2). Both are kept as described in section 1e.
- Units with no plan yet (for example CEX-18, GRR-17, AGL-23, AGL-24, GNP-19, GNP-23, GNP-24, SHL-19, CEX-20, from `plans/QUEUE.md`) were not checked for overlap, because they have no plan file.

## 7. Open points

1. **Backup path (N1).** The plan uses `.scriba/project-store/backups/` from DECISIONS line 4041 (option B). Unit line 23 still says `.scriba/backups/`, and the reword is due from a PST-23 reviser (DECISIONS line 4041; `plans/PST-07.md` line 181). Accept-anyway keeps `.scriba/backups/` (PST-17), so an older file replaced by accept-anyway gets two backups in two folders. Navigator: confirm option B, confirm the reword happens before implementation, and confirm the two locations. Default: as written here.
2. **Mechanism for the backup folder.** `FilesService.stateDir` calls `projectFor`, which requires the project to be active (`files.service.ts` lines 488 to 489 and 521 to 522). Activation step (3) runs before the switch, so `stateDir` would refuse the migration. Default: `ownFolder` with the same containment check, giving the same path (C11). Navigator: confirm, or name another place.
3. **Format of non-YAML kinds.** Steps receive a YAML Document for every kind. `.json` files are written back as JSON with two-space indentation and a final newline (C4). No criterion uses a `.json` kind. Navigator: confirm before the Graph runner registers `graphs/*.json`.
4. **What a write stores (C7; the reading of criterion 5).** The plan reads "runs on that file's first write" as: the incoming text is upgraded before it is stored, and an older disk file is backed up and logged. Alternative: store the incoming text as sent, and migrate only the disk file (backup and log). Under the alternative the migrator never runs on stored text. Navigator: confirm the reading. Default: C7.
5. **Edit base (C8).** `edit` matches `old` against the upgraded view, the text a GET returns, not against the disk bytes. Alternative: the disk text. Navigator: confirm. Default: C8.
6. **Registry replacement (C1).** A second registration of a kind replaces the first, including the default `project-yaml` entry, which C1, C3 and C4 need. Alternative: refuse a second registration, and reach a v2 `project.yaml` some other way in the tests. Navigator: confirm. Default: replacement.
7. **Activation failure and hook (C10).** A migrator step that throws gives `PROJECT_INVALID` (422) with a new message, and nothing is written. Activation calls the files-changed hook but publishes no SSE event. No test covers the throw, because it is not a criterion. Navigator: confirm the status and the no-event choice.
8. **Test seam for registration.** The kit route calls the public `registerMigrator` on the provider. This is set-up, as `pending/register-graph-validator` is (`project-store-pending.kit.ts` line 34). The assertions are HTTP and disk only. Navigator: confirm this is the seam the Testing convention allows. Default: as written.
9. **Code precedence for graphs (for the Graph runner's migrator plan).** Once the Graph runner registers `graphs/*.json` with a current version, this module refuses a newer graph with `PROJECT_SCHEMA_TOO_NEW` before the Graph runner's `GRAPH_SCHEMA_VERSION_UNSUPPORTED` check (GRR-02 unit line 22). Not decided here. Navigator: route it to the GRR migrator plan. This plan changes no graph code.
10. **New projects after a v2 kind ships.** `newProjectYaml` writes version 1 (C15). The unit that ships a v2 kind must make it write the current version. Navigator: note only.

## 8. Facts checked and facts assumed

### Facts checked (main at `9d1d995`; read with `cat -n`, `sed`, `grep`)
- `units/PST-23-lazy-migrations.md`: all 32 lines (front matter lines 2 to 9; sections 12 to 32; no change note). Blockers and phase: lines 5 to 9 and 14.
- `units/PST-23-lazy-migrations.md` is the only unit file with the PST-23 id. `grep -rn PST-23 units/` finds only `parallel_with` entries (PST-17 to PST-22), the README row (`units/README.md` line 102), `GRR-02` line 22, and `PST-04` line 21. No unit's `blocked_by` names PST-23.
- `modules/project-store.md`: lines 9, 42, 45 to 59, 72, 75 to 82.
- `units/README.md`: lines 64, 102, 135 to 141.
- `plans/PLT-02.md` lines 1 to 4 (front matter format).
- `plans/DECISIONS.md`: `grep PST-23` gives line 4041 only; `migrat` gives 4041 and the PST-01 `upgraded` entries (2286, 2294); the PST-07 entries are 4035 to 4043.
- Plan statuses: PST-04, PST-06, PST-07, PST-16, PST-17, PST-18, PST-24, GRR-02 are `done`. Draft: AGL-22, SHL-18. Planned: CEX-15, GNP-15, GRR-15.
- `apps/api/src/modules/project-store/files.service.ts`: lines 46, 49 to 64, 82 to 84, 104 to 111, 135 to 171, 209 to 212, 230 to 234, 262 to 274, 277 to 299, 302 to 333, 411 to 441, 445 to 484, 488 to 518, 521 to 528, 533 to 574 (the whole file read).
- `active-project.service.ts`: lines 17 to 28, 38 to 61, 63 to 67, 69 (the PST-23 comment), 72 to 73, 76 to 86; constructor 21 to 26.
- `pending.service.ts`: lines 26, 30, 46; constructor 85 to 89; `onFilesChanged` 91; `accept` 173 to 198; `acceptAnyway` 203 to 227 (saveBackup at 222); `applyContent` 231 to 255; `recheck` 322 to 331 (no active check); `recheckQuietly` 334 to 340; `checkContent` 409 to 422; `writeProposal` 440 to 443 (its comment says PST-23 adds its migration before this call).
- `project-yaml.ts`: lines 5, 21 to 46, 31 to 37 (threshold), 55 to 64 (`newProjectYaml`).
- `project-discovery.ts`: lines 10, 23 to 27, 72 to 106 (readYamlState at 106).
- `projects.service.ts`: lines 31, 34 to 43 (TOO_NEW and INVALID messages), 48, 55 to 61.
- `project-store.service.ts`: lines 31 to 38 (constructor), 40 to 43, 45 to 48, 50 to 56, 76 to 80 (`notifyFilesChanged`), 82 to 99 (`requireActive`).
- `project-store.module.ts`: lines 59 and 63 list `ProjectStoreService` and `FilesService` as providers.
- `backups.ts`: lines 3 to 4 (imports), 11 to 23 (`saveBackup`; `ownFolder` at 17, `writeText` at 21).
- `own-folder.ts` line 11 (`ownFolder`, with create). `draft-versions.ts` lines 13 to 15 (`compactStamp`), 19 (`versionNameFor`), 47 to 60 (`saveVersion`). `pending-store.ts` lines 93 to 99 (`patternToRegExp`). `atomic-write.ts` line 6.
- `samples.service.ts`: lines 31 (import), 50 to 53 (constructor, with the store), 86 (`readYamlState`).
- `packages/contracts/src/project-store/project.ts` lines 21 to 29 (`projectYamlSchema`, `schemaVersion` integer at 22). `errors.ts` lines 5 to 26 and 58 to 79 (`PROJECT_INVALID` 422 at 72, `PROJECT_SCHEMA_TOO_NEW` 409 at 73). `files.ts` lines 32 to 38 (`upgraded` at 38). `routes.ts` lines 12, 16 to 19, 36 to 37. `pending.ts` lines 65 to 67 (`changes` array).
- `packages/contracts/src/platform/slugs.ts`: `project-store` is in `MODULE_SLUGS` (line 8 area) and in the publishing list (line 24 area).
- Test kits and tests: `create-test-app.ts` line 13 (`modules`); `project-store-projects.kit.ts` lines 30 (`buildProjectsLibrary`, default: `book` with v1 project.yaml, no settings file, so no active project) and 89 (`withProjectsApp`, which calls `createTestApp({libraryDir})` only); `project-store-files.kit.ts` lines 65 (`isUtcTimestamp`), 70 (`putFile`), 181 (`filesKitModule`), 277 (`state-dir`); `project-store-pending.kit.ts` lines 22 and 34; `project-store-pending-propose.test.ts` lines 8 and 70; `project-store-files-write.test.ts` lines 191 to 205 (too-new `project.yaml` refused on write and read); `project-store-active.test.ts` line 132 (too-new activation).
- `apps/api/package.json` lines 6 to 8 (`build`, `test`, `lint`).
- `modules/graph-runner.md` line 40 (graph file access goes through the Project store's file API).
- `apps/web/src/app/shell/project-store-copies.ts` lines 122 to 137 (the copy carries `upgraded`).
- `apps/api/src/modules/project-store/draft-versions.service.ts` line 87 (restore calls `this.files.write`).

### Facts assumed (not run here; the implementer checks them)
- The `yaml` library keeps comments through `Document.set` on an existing key, and through `toString({lineWidth: 0})`. The PST-07 test U1 relies on this path. M4 in step 16 checks it.
- `ownFolder` with `create: true` makes `.scriba` and `.scriba/project-store` and `backups` one level at a time, even when `.scriba` already exists (`own-folder.ts` lines 18 to 30, read in part).
- The `sessionCookie` helper used by `withProjectsApp` can be imported by the new test file. Its export was not checked.
- `compactStamp` keeps milliseconds, so two backups in the same millisecond get `-n` (`draft-versions.ts` comment lines 17 and 18).
- `npx vitest run test/<file>` from `apps/api` runs one file, as AGL-22's plan assumes.
- The existing project.yaml too-new tests keep passing, because the default version stays 1.
- Node 26 is on PATH, as PLT-02's plan step 1 records. Not checked here.
