---
id: PST-15
status: draft
---
# PST-15 plan - propose, the pending-change store, path validators and the queue listing

Project store, phase:pending-review, M3. Unit `units/PST-15-propose-pending-store.md`: front matter lines 1 to 9, decisions lines 17 to 26, criteria lines 29 to 33 (five criteria). Planner's draft at main `f9c97f5`. Nothing was built, installed, run or changed except this file. The only commands were read-only (`git`, `grep`, `ls`, `cat`, and `npm view diff version`, which answered `9.0.0` and installed nothing).

Tags: **checked** means the planner read the file and line in this session. **assumed** means a belief not checked here (section 2).

## 1. Decisions this plan follows

1. **In-process only.** `PendingService.propose(input)` is a method of the provider, with no route (unit line 18; PST-01 plan lines 40 to 41, 48 to 49; PST-02 section 5 line 298). The input is parsed with `proposeInputSchema` (`packages/contracts/src/project-store/pending.ts` line 75). Source: unit line 18.
2. **Full text in, diff computed here.** `content` is the full new text; the module computes `diff` as a unified diff of the captured base against it (unit line 18; PST-01 plan line 41). Source: unit line 18.
3. **Active check exempt.** `propose` runs for any project whose status is `ok`, active or not, and never calls `requireActive` (unit line 19; module line 48; DECISIONS line 2297). Source: unit line 19.
4. **One status rule for propose and appendLog (decided here, N4 option A).** Missing folder: `PROJECT_NOT_FOUND` 404, `PROJECT_MESSAGES.NOT_FOUND`. `importable`: `PROJECT_NOT_FOUND` 404, "That folder has no project.yaml yet. Import it first." `invalid`: `PROJECT_INVALID` 422 with the issues as `details`. `too-new`: `PROJECT_SCHEMA_TOO_NEW` 409. Source: PST-07 plan line 78 (P10); DECISIONS line 4040 (N4, option A) and PST-07 plan line 180; the code is `files.service.ts` `appendLog`, lines 429 to 450. The rule moves into one helper (section 3).
5. **Path check.** The target goes through `ProjectStoreService.resolvePath`, which does syntax, reserved (lexical and real), and containment (unit line 22; `path-safety.ts` `resolveProjectPath`; PST-12 plan line 140). A target that is the root or an existing folder is `PROJECT_PATH_INVALID` with the `NOT_A_FILE` message. Source: unit line 22; `files.service.ts` `notAFile`.
6. **No internal mode for reserved paths.** The module writes `.scriba/pending/` with fixed names and does not go through the path function (PST-02 plan line 298, which says PST-15 "needs no mode"; PST-02 plan line 57, S6). Source: PST-02 plan lines 57 and 298.
7. **Captured base.** A caller base `{content}` is used instead of disk, and its hash is the `sha256:` of its UTF-8 bytes. Without a base, the target's disk bytes are captured at the first propose, with the same hash rule. A missing target gives `kind: create`, `capturedBase: null`. Source: unit line 20; module line 50 (hashes).
8. **`base: null` means "captured as missing"** (open point 1). It gives `kind: create`, `capturedBase: null`, even if the target exists at propose time. Source: AGL-12 unit line 19 (the captured base of a path is the disk content "the first time the agent run reads or writes that path", which for a missing file is "missing"). The input contract accepts `null` only after open point 1 is approved.
9. **Same-origin fold.** Two open changes fold when they have the same target path, the same `origin.kind`, the same `origin.runId`, and, for `recipe-run`, the same `origin.nodeId`. `toolCallId` is not part of the key. On a fold the change keeps its `id`, `createdAt`, `kind` and `capturedBase`, and takes the later call's `proposed`, `diff`, `origin`, `provenance` and `grounding` (absent when the later call omits them), with a new `updatedAt`. A `base` argument on a fold is ignored. Source: unit line 21; AGL-12 unit line 21 (the origin names "the call that last wrote the path"). Decided here (simplest reading).
10. **Validation order and codes.** Input parse, then project status, then path check, then the size cap (`FILE_SIZE_CAP_BYTES`, 5 MiB, `PROJECT_FILE_TOO_LARGE` 413), then per-path validators, then the fold lookup, then base capture, then the write. A failed validator is `PROJECT_VALIDATION_FAILED` (422) with the fixed message "The proposed content does not pass the check for that file.". A validator that throws counts as a failure. For root `project.yaml` the built-in check is `readYamlState` (`project-yaml.ts`); any state other than `ok` fails, and an `invalid` state adds its issues as `details`. Source: unit line 22; `errors.ts` (`PROJECT_VALIDATION_FAILED` 422). The throw rule is decided here, for GRR-06's `JSON.parse`.
11. **Validator registration.** `registerValidator(pattern, check)` on `PendingService`, with `check(content: string): boolean`. A pattern is a project-relative path in which `*` matches any run of characters except `/`, every other character is literal, and the whole path must match, case-sensitive. All matching validators run in registration order after the built-in check; the first failure refuses. Source: unit line 22 (`registerValidator(pattern, fn)`); GRR-06 unit line 26 (`graphs/*.json`). The grammar is decided here.
12. **Storage.** One file per open change: `<project>/.scriba/pending/<id>.json`, written with `writeFileAtomic` (`atomic-write.ts`, temp file `<id>.json.tmp` in the same folder), pretty-printed JSON with two-space indent and a final LF. The id is the UTC time as `YYYYMMDDTHHMMSSmmmZ` (the compact form of PST-16 unit line 24), then `-`, then six lowercase hex characters from `randomBytes(3)`. Ids sort by creation time to the millisecond; two changes made in the same millisecond sort by their random suffix, so tests must not assume creation order inside one millisecond. Ids need no escaping in a URL. Resolved changes move to `.scriba/pending/resolved/` (PST-16). Source: unit line 23; PST-02 plan line 298 (names are fixed, not `stateDir`). The id format is decided here.
13. **Folder containment.** Before any write, `.scriba` and `.scriba/pending` must resolve (`realpathSync.native`) to the project's own folders, as `stateDir` checks `.scriba/<owner>` in `files.service.ts`. A path that escapes gives `PROJECT_PATH_OUTSIDE`. Source: `files.service.ts` `stateDir`; PST-07 plan (`stateDir` pattern).
14. **Listing (GET).** Requires the active check (`requireActive`), then the lookup as `projectFor` does (`files.service.ts` line 525). Returns `{changes}`: the top-level `*.json` files of `.scriba/pending/`, in id order, with an optional `run` filter on `origin.runId`. It creates nothing: a missing folder is an empty list, and `.scriba` is not created. Source: unit line 24; module line 46 (GETs never mutate); PST-12 plan lines 140 to 150 (F3 name rule).
15. **Events.** `pending-created` for a new change and `pending-updated` for a fold, each with `{projectId, pendingChange}`, published after the write. No `files-changed` (the target is not touched). Source: unit line 25; `events.ts` `pendingEventDataSchema`.
16. **`conflict` is `null`** on every change PST-15 writes or lists. PST-16 computes it. Source: unit line 23 (PST-15) and PST-16 unit line 23.
17. **`provenance` and `grounding`** are stored as given (passthrough), `grounding` checked by `pendingGroundingSchema` through `proposeInputSchema`. Source: unit line 26.
18. **One shared status helper.** `requireOkProject` in a new `project-status.ts` replaces the switch inside `appendLog`, so both callers share the codes and texts of decision 4 (DECISIONS line 4040, "shared"). Decided here.
19. **No new dependency.** The line diff is written in the module (section 3, `unified-diff.ts`). Source: decided here; open point 4.
20. **Testing principles.** Tests use HTTP, SSE and files on disk. In-process calls reach the provider through a test-only kit module, as `filesKitModule` and `activeKitModule` do. Source: `modules/project-store.md` lines 55 to 59; DECISIONS line 2912 (no private helper in tests).

## 2. Facts checked and facts assumed

**Checked (read in this session):**

- Unit `units/PST-15-propose-pending-store.md`, whole file. `git log -- units/PST-15-propose-pending-store.md` shows two commits (`2fed3f4`, `098add9`) and no change note in the unit.
- `modules/project-store.md`, lines 45 to 59 and 74 to 82 (path safety, GETs never mutate, active rule, hashes, atomic writes, provider, testing, settled decisions).
- Contracts already on main: `pending.ts` (`pendingOriginSchema`, `pendingGroundingSchema`, `pendingConflictSchema`, `pendingChangeSchema` with `diff: z.string()`, `capturedBase` nullable, `pendingListQuerySchema`, `pendingListSchema`, `pendingDecisionSchema`, `proposeInputSchema` at line 75 with `base: {content}` optional); `events.ts` (`pendingEventDataSchema` and the three pending members); `errors.ts` (`PROJECT_PENDING_CONFLICT` 409, `PROJECT_PENDING_NOT_OPEN` 409, `PROJECT_VALIDATION_FAILED` 422); `routes.ts` lines 36 to 45 (`PROJECT_PENDING_ROUTE` and the four `:id` routes); `constants.ts` (`RESERVED_PATH_PREFIXES`, `FILE_SIZE_CAP_BYTES`); `files.ts` (`projectPathSchema` is `z.string()`, so the path check is left to `resolvePath`). No contract test covers `proposeInputSchema`.
- `apps/api/src/modules/project-store/files.service.ts`: `FILE_MESSAGES.NOT_A_PROJECT` (line 60); `decodeText` exported (line 93); `readFileAt` private (line 135: a non-file is `PROJECT_NOT_FOUND`, a file over the cap is `PROJECT_FILE_TOO_LARGE`); `appendLog` (lines 428 to 472; its lookup and status switch are at 429 to 450); `projectFor` (line 525: active check, then lookup); `commit` (line 536: cap, project.yaml check, `writeText`, `files-changed`); `stateDir` (containment via `realpathSync.native`).
- `path-safety.ts`: `resolveProjectPath` steps 1 to 7 (syntax, reserved lexical, real root, segment walk with links, real reserved check); `isReservedPath`; `PATH_MESSAGES`.
- `atomic-write.ts`: `writeFileAtomic` makes the folders, writes `${target}.tmp`, renames, removes the temp on failure.
- `project-discovery.ts`: `DiscoveredProject { id, root, summary, yaml }`; `readProjectYamlFile` gives `importable` for a missing file. `project-yaml.ts`: `readYamlState(text)` gives `too-new`, `ok` or `invalid` for the text of a file.
- `projects.service.ts`: `PROJECT_MESSAGES` (`NOT_FOUND`, `INVALID`, `TOO_NEW`); `find` lists the library; `appendGitignoreLine` is called at New (line 87) and Import (line 134) only.
- `project-store.module.ts`: entry re-exports lines 20 to 25; `controllers` at 34; `providers` at 42; `exports` at 60.
- `platform/events/events.publisher.ts` line 61: `publish(envelope)` does not validate. `events.controller.ts` is in `PlatformModule`. `setup-auth.module.ts` line 52: the guard is `APP_GUARD`, so every route is guarded.
- Tests: `project-store-files.kit.ts` (`filesKitModule`, controller `api/project-store-test`, plain POST); `project-store-active.kit.ts` (`activeKitModule` imports `PlatformModule` and `ProjectStoreModule`; `postJsonPlain`); `project-store-projects.kit.ts` (`buildProjectsLibrary`: `book` is active via settings, `draft-only` is `ok` and not active, `bare` importable, `bad` invalid, `broken` invalid YAML, `later` too-new, `gi-done`, `link-in`, `outward`; `withProjectsApp`); `sse.ts` (`openSse`, `dataOf`); `events-hello.test.ts` line 16 (`openSse(app.baseUrl + '/events')`); `createTestApp` (`modules` replaces the composed modules; a given `libraryDir` is not removed on close); `invariant-sweep.ts` (`FIXTURE_PATHS` at line 73; the project-store entries run from `files` to `rebuild`, with `rebuild` at lines 114 to 116; a template with `:` and no entry fails by name); `project-store-files-gate.test.ts` (`F3_ROWS` at lines 415 to 461; F3 fails by name for a GET with no row); `project-store-files-helpers.test.ts` (test `L1` at line 207 and test `H1` at line 388 cover appendLog's refusals of importable, invalid and too-new).
- Plans. Every plan that names these files is `status: done`: the list was built with `grep -l` over `plans/*.md` for `invariant-sweep.ts`, `project-store.module.ts`, `files.service.ts`, `project-store-files-gate`, `project-store.service.ts` and `pending.ts`. The `draft` and `planned` plans are `MPR-13` (draft), `SAU-13`, `SAU-14`, `TRG-07` (planned). None names these files, and `git diff --stat main unit/SAU-13 -- apps/api packages/contracts/src modules`, the same for `unit/SAU-14` and `unit/TRG-07`, prints nothing. No plan exists for PST-16 to PST-23 (units only).
- PST-13 plan lines 126 to 127: the module arrays and `FIXTURE_PATHS` take independent entries, so each unit adds its own keys. PST-12 plan lines 140 to 150: PST-15 adds one F3 row, in the same change as its `FIXTURE_PATHS` entry.
- Downstream units: `units/AGL-12-write-overlay.md` lines 18 to 21 and 24 to 27; `units/GRR-06-output-nodes-pending-changes.md` lines 18 to 26 and 29 to 33; `units/PST-16-apply-three-way-check.md` lines 18 to 26; `units/PST-18-draft-versions-api.md` lines 18 to 21.
- DECISIONS entries: line 2297 (exemption), line 2912 (PST-02 finding 1: no private helper in tests), line 4040 (N4, option A).
- `apps/api/vitest.config.mts` line 8: `include: ['test/**/*.test.ts']`.

**Assumed (not checked here):**

- The kit app built with `createTestApp({libraryDir, modules: [pendingKitModule()]})` serves `GET /events` and `openSse` reads it, as `events-hello.test.ts` does for the composed app. `PlatformModule` is imported by the kit, as `activeKitModule` does.
- Node 26.x and npm 11.20.0 are available in the implementer's worktree (as PLT-02 step 1 required).
- The eslint boundaries config accepts new files under `apps/api/src/modules/project-store/` that import only `../platform/platform.module`, the contracts and sibling files, as the existing files do.
- The fixture `draft-only` has no `.scriba/` line in its `.gitignore` (checked: `buildProjectsLibrary` writes `node_modules/` only). That is the basis of open point 5.

## 3. Files to change

Names and layout are the simplest option of this plan (decided here).

**New files:**

| Path | Part | Purpose |
|---|---|---|
| `apps/api/src/modules/project-store/project-status.ts` | 1 | `requireOkProject(found: DiscoveredProject \| undefined): DiscoveredProject`: the four refusals of decision 4, with the codes, statuses and texts of `appendLog` today. The message "That folder has no project.yaml yet. Import it first." moves here from `FILE_MESSAGES`. |
| `apps/api/src/modules/project-store/pending-store.ts` | 1 | `pendingFolder(project, create)` (containment, and `mkdir` only when `create`), `newPendingId(now)`, `readOpenChanges(folder \| undefined)` (top-level `*.json`, id order, each parsed with `pendingChangeSchema`; a failure is a plain `Error` with no name or content), `writeChange(folder, change)`, `patternToRegExp(pattern)`. |
| `apps/api/src/modules/project-store/unified-diff.ts` | 1 | `unifiedDiff(path, base: string \| null, proposed: string): string`, the rules of section 4, step 5. |
| `apps/api/src/modules/project-store/pending.service.ts` | 1 (propose, registerValidator), 2 (list) | `PendingService` (provider): `propose(input: ProposeInput): PendingChange`, `registerValidator(pattern, check)`, `list(projectId, query): PendingList`. Type `PendingValidator = (content: string) => boolean`. |
| `apps/api/src/modules/project-store/pending.controller.ts` | 2 | `PendingController`: `@Get(PROJECT_PENDING_ROUTE)` with `ZodValidationPipe(pendingListQuerySchema)`. |
| `apps/api/test/project-store-pending.kit.ts` | 1 | `pendingKitModule()`: imports `PlatformModule` and `ProjectStoreModule`; controller `api/project-store-test` with `POST pending/propose` (calls `propose` with the body) and `POST pending/register-graph-validator` (registers `graphs/*.json` with a check that parses JSON and needs `schemaVersion === 1`; a parse error throws). Not in the composed app. |
| `apps/api/test/project-store-pending-propose.test.ts` | 1 | Tests P1 to P5 and E1 to E4 (section 5). |
| `apps/api/test/project-store-pending-list.test.ts` | 2 | Test L1 (section 5). |

**Edited files:**

| Path | Part | Change |
|---|---|---|
| `apps/api/src/modules/project-store/files.service.ts` | 1 | (a) `readFileAt` gets the `export` keyword (line 135). (b) `appendLog` replaces its lookup and status switch (lines 429 to 450) with `requireOkProject(this.projects.find(projectId))`, then keeps its own path and log checks. (c) `NOT_A_PROJECT` is removed from `FILE_MESSAGES` (line 60) and moves to `project-status.ts`. No other change. |
| `apps/api/src/modules/project-store/project-store.module.ts` | 1 and 2 | Part 1: `PendingService` is added to `providers` (after `EntitiesService`) and to `exports` (after `EntityManifest`); `export { PendingService } from './pending.service';` is added to the entry file (after line 25). Part 2: `PendingController` is added to `controllers` (after `EntitiesController`). Each is a new array entry, so the entries of PST-13 stay. |
| `apps/api/test/invariant-sweep.ts` | 2 | `FIXTURE_PATHS` gets the key `'/api/project-store/projects/:projectId/pending'` with `path: '/api/project-store/projects/no-such-project/pending'`, after the `rebuild` entry (lines 114 to 116). |
| `apps/api/test/project-store-files-gate.test.ts` | 2 | `F3_ROWS` (line 415) gets one row: `template: PROJECT_PENDING_ROUTE`, and `request` sends `GET fileUrl(PROJECT_PENDING_ROUTE, BOOK)` with the loopback host and the cookie. `PROJECT_PENDING_ROUTE` is added to the import list. |
| `packages/contracts/src/project-store/pending.ts` | 1 | Only if open point 1 is approved: `proposeInputSchema.base` becomes `z.object({ content: z.string() }).nullable().optional()`, with a comment that `null` means the target was missing when the caller captured it. Then `npm run build -w @bbartolome/scriba-contracts`. |

**Not changed:** the contract routes, events and errors (already on main); `package.json` and `package-lock.json`; `.gitignore`; any unit file; `plans/DECISIONS.md`; `plans/QUEUE.md`.

**Merge order.** No `draft` or `planned` plan changes these files (section 2). The later units add entries to the same arrays and to the entry file, and PST-16 and PST-18 add their own `FIXTURE_PATHS` keys and F3 rows, so each keyed entry is distinct and keeping every entry gives the same result in either merge order, as PST-13 plan lines 126 and 127 say. PST-16 adds `accept` and `reject` to `PendingService` and its own controller; it is blocked by PST-15, so it merges after this plan.

## 4. Procedure

Run in a worktree on branch `unit/PST-15`, created from `main` (`git worktree add -b unit/PST-15 <path> main`). Do not push. Commit by explicit paths only; never `git add -A` or `git commit -a`. Use Node 26 (`node -v` prints `v26.x`) and record it with each result.

### Part 1: propose and the validators

**Step 1. Setup.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0.

**Step 2. Input widening (open point 1, only if approved).** Edit `packages/contracts/src/project-store/pending.ts` as in section 3, then rebuild the contracts. Expected: exit 0. If open point 1 is not approved, skip this step and test P4c, and record the skip.

**Step 3. Shared status helper.** Create `project-status.ts` with `requireOkProject` (the lookup and switch of `appendLog`, lines 429 to 450): an absent project gives `PROJECT_NOT_FOUND` with `PROJECT_MESSAGES.NOT_FOUND`; `importable` gives `PROJECT_NOT_FOUND` with the NOT_A_PROJECT text; `invalid` gives `PROJECT_INVALID` 422 with `PROJECT_MESSAGES.INVALID` and the issues; `too-new` gives `PROJECT_SCHEMA_TOO_NEW` 409 with `PROJECT_MESSAGES.TOO_NEW`; `ok` returns the project. Its errors are `new ModuleError(code, PROJECT_ERROR_STATUS[code], message, details?)`. Edit `files.service.ts` as in section 3. Run `npx vitest run test/project-store-files-helpers.test.ts` in `apps/api`. Expected: all its tests pass unchanged, including `H1` and `L1`.

**Step 4. Storage helpers (`pending-store.ts`).**
- `pendingFolder(project, create)`: take `realRoot = realpathSync.native(project.root)`. If `<root>/.scriba` exists and its real path is not `<realRoot>/.scriba`, throw `PROJECT_PATH_OUTSIDE` (`PATH_MESSAGES.OUTSIDE`). When `create` is true, `mkdirSync('.scriba/pending', {recursive: true})`; any errno is a plain `Error` with the errno only, as `stateDir` does. When `create` is false and `.scriba/pending` is missing, return `undefined` and create nothing. If the pending folder exists, its real path must be `<realRoot>/.scriba/pending`, else `PROJECT_PATH_OUTSIDE`.
- `newPendingId(now: Date)`: `now.toISOString().replace(/[-:.]/g, '')`, then `-`, then `randomBytes(3).toString('hex')`.
- `readOpenChanges(folder)`: `[]` for `undefined`; otherwise the entries that are files whose name ends in `.json`, sorted by name, each parsed with `JSON.parse` and `pendingChangeSchema.safeParse`. A failure throws `new Error('A pending change file could not be read.')` with no name and no content. Entries in `resolved/` and `*.json.tmp` are not read.
- `writeChange(folder, change)`: `writeFileAtomic(join(folder, change.id + '.json'), JSON.stringify(change, null, 2) + '\n')`.
- `patternToRegExp(pattern)`: escape every regex character except `*`, replace each `*` by `[^/]*`, anchor with `^` and `$`.

Expected: the file compiles (`npx tsc --noEmit -p apps/api/tsconfig.json`).

**Step 5. Unified diff (`unified-diff.ts`).** `unifiedDiff(path, base, proposed)`:
- An empty text has no lines. Any other text is split at each LF with `split('\n')`, with no trimming, so a text ending in LF ends with an empty line. `base === null` has no lines.
- If both sides have the same lines, the result is `''`.
- Otherwise the result is a unified diff with 3 lines of context, hunks numbered and merged as `diff -u` does, followed by one LF.
- The first header line is `--- a/<path>`, or `--- /dev/null` when `base` is null. The second is `+++ b/<path>`.
- Common leading and trailing lines are removed first. The middle is compared with an LCS only when its two lengths multiply to at most 4,000,000. Above that bound the middle is one hunk: every old middle line marked `-`, then every new middle line marked `+`, with the header counts of the two middles and the start line of the first middle (1 when there is no leading context).
- Expected for `base = 'a\nb'`, `proposed = 'a\nc'`, path `sources/x.md`:
  ```
  --- a/sources/x.md
  +++ b/sources/x.md
  @@ -1,2 +1,2 @@
   a
  -b
  +c
  ```

**Step 6. The provider (`pending.service.ts`, part 1 methods).** Constructor: `ProjectStoreService`, `ProjectsService`, `EventsPublisher`. Methods:
- `registerValidator(pattern, check)`: append `{regex: patternToRegExp(pattern), check}` to a list held by the instance.
- `propose(input)`, in this order:
  1. `proposeInputSchema.safeParse(input)`. A failure is `ModuleError(PLATFORM_ERROR_CODES.VALIDATION_FAILED, 400, "The proposed change is not valid.")`, with no echo of the input.
  2. `project = requireOkProject(this.projects.find(projectId))`.
  3. `target = store.resolvePath(project.root, path)`. If `target.isRoot`, or `target.exists` and the real path is a directory, throw `PROJECT_PATH_INVALID` with the NOT_A_FILE text.
  4. If `Buffer.byteLength(content, 'utf8') > FILE_SIZE_CAP_BYTES`, throw `PROJECT_FILE_TOO_LARGE` 413.
  5. Built-in check when `target.relativePath === 'project.yaml'`: `readYamlState(content)`. A status other than `ok` throws `PROJECT_VALIDATION_FAILED`, with `details` set to the issues when the status is `invalid`.
  6. For each registered validator whose regex matches `target.relativePath`, in registration order: call `check(content)` inside a `try`. A throw or a `false` result throws `PROJECT_VALIDATION_FAILED`.
  7. Fold lookup: `folder = pendingFolder(project, false)`, then `readOpenChanges(folder)`, then find the change with the same `targetPath`, and with `origin` matching under decision 9. If found, go to step 9.
  8. Base capture (no fold): `base === null` gives `kind 'create'` and `capturedBase null`; a `base` object gives `kind 'modify'` and `{hash, content}` from its bytes; an absent `base` with the target existing reads it with `readFileAt` and `decodeText` (`NOT_TEXT` when undefined), giving `kind 'modify'`; an absent `base` with the target missing gives `kind 'create'` and `null`.
  9. Build the change: a new id from `newPendingId(now)` (regenerated up to five times while a file with that name exists), `status: 'pending'`, `conflict: null`, `createdAt` and `updatedAt` = `now.toISOString()`, `diff = unifiedDiff(relativePath, capturedBase?.content ?? null, proposed)`, and `provenance` and `grounding` as given. On a fold, keep the `id`, `createdAt`, `kind` and `capturedBase` of the old change, with decision 9 for the rest.
  10. `folder = pendingFolder(project, true)`, then `writeChange`. Publish `pending-created` for a new change or `pending-updated` for a fold, with `{projectId: project.id, pendingChange}`. Return the change.

**Step 7. Module wiring for part 1.** Add `PendingService` to `providers` and `exports`, and the entry-file re-export, as section 3 says. Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` exits 0.

**Step 8. Kit, tests P1 to P5 and E1 to E4, and the part 1 commit.**
- Create `project-store-pending.kit.ts` as section 3 says. Use `bookLibrary()` from `project-store-files.kit.ts` for the fixture, `createTestApp({libraryDir, modules: [pendingKitModule()]})`, and `postJsonPlain` for the calls.
- Create `project-store-pending-propose.test.ts` with the tests of section 5, each building its own temp library and removing it.
- Run `npx vitest run test/project-store-pending-propose.test.ts test/project-store-files-helpers.test.ts` in `apps/api`. Expected: every test passes.
- Commit the part 1 files by path: `git commit -m "feat(PST-15): propose, pending store and validators" -- <the part 1 paths>`. Expected: one commit on `unit/PST-15`.

### Part 2: the listing and the gates

**Step 9. Listing.** Add `list(projectId, query)` to `PendingService`: `store.requireActive(projectId)`, then `this.projects.find(projectId)` (`PROJECT_NOT_FOUND` when absent, as `projectFor` does), then `readOpenChanges(pendingFolder(project, false))`, then the `run` filter on `origin.runId` when given. Answer `{changes}`. Create `pending.controller.ts` (section 3) and add `PendingController` to the module's `controllers`. Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` exits 0.

**Step 10. Gate rows.** Add the `FIXTURE_PATHS` entry and the F3 row of section 3. Run `npx vitest run test/project-store-files-gate.test.ts test/invariant-get-head.test.ts test/invariant-mutation-guard.test.ts` in `apps/api`. Expected: all pass. F3 must name no route without a row, and no GET may change the library or the event stream.

**Step 11. Listing test L1 (section 5).** Create `project-store-pending-list.test.ts`. Run it. Expected: passes.

**Step 12. Full gate and the part 2 commit.** From the repository root: `npm run build -w @bbartolome/scriba-contracts` then `npm test -w @bbartolome/scriba-api`, then `npm run lint -w @bbartolome/scriba-api`, then `npx prettier --check apps/api packages/contracts`. Expected: each exits 0. Run `git status --short`: only the section 3 paths appear. Commit the part 2 paths by path with `feat(PST-15): list the pending queue and gate the new route`. Record the Node and npm versions and each command's output.

## 5. Acceptance criteria and tests

Each criterion has one test, named as below. The tests are in `project-store-pending-propose.test.ts` (part 1) unless marked otherwise. The seam for propose is the kit app (`POST api/project-store-test/pending/propose`); the seam for the event stream is `GET /events` on the same app, read with `openSse` and `dataOf`; the seam for disk is the temp library.

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| AC1, line 29: a propose never changes the target; it creates exactly one pending file and one `pending-created` event | **P1**: `book` active; `sources/outline.md` exists. Read its SHA-256 before the call. Open the stream and read the hello block. Propose `sources/outline.md` with new content. | The target's SHA-256 is unchanged. `book/.scriba/pending/` holds exactly one `*.json` and no `.tmp`. The next block is one `pending-created` with `data.projectId` `book` and a `pendingChange` whose `targetPath` is `sources/outline.md`. A further read of 500 ms times out (no `files-changed` and no second event). |
| AC2, line 30: a second propose from the same origin updates the change and keeps the original base; a different run creates a separate change | **P2**: propose `sources/outline.md` with origin `agent-run` `r1` (content A). Then edit `sources/outline.md` on disk. Propose again with origin `r1` (content B). Propose with origin `r2` (content C). | After the first two calls there is one open change, its `capturedBase.content` is the text before the host edit, its `proposed` is B, and the second call's event is `pending-updated`. After the third call there are two open changes, and the `r2` change is new. |
| AC3, line 31: a propose naming a non-active `ok` project succeeds and lands in its queue | **P3**: `draft-only` is `ok` and not active (`book` is active). Propose `sources/notes.md` into `draft-only`. | The answer has `projectId` `draft-only`. `draft-only/.scriba/pending/` holds one `*.json`. `book/.scriba` does not exist. |
| AC4, line 32: a caller base is used instead of disk; a missing target gives `kind: create` with a null base | **P4**: (a) `sources/outline.md` on disk is `# Outline\n`; propose with base `Captured\n`. (b) `sources/new.md` is missing; propose with no base. (c) `sources/outline.md` exists; propose with `base: null` (needs open point 1). | (a) `capturedBase.content` is `Captured\n`, its `hash` is the SHA-256 of those bytes, `kind` is `modify`, and the `diff` is against `Captured\n`. (b) `kind` is `create`, `capturedBase` is `null`, and the diff has `--- /dev/null` with only `+` lines. (c) `kind` is `create` and `capturedBase` is `null`. |
| AC5, line 33: a file failing a registered validator is refused, and so are an invalid `project.yaml` and a reserved path | **P5**: register the `graphs/*.json` validator through the kit. Then: `graphs/bad.json` with `{"schemaVersion":2}`; `graphs/broken.json` with `{`; `graphs/good.json` with `{"schemaVersion":1}`; `project.yaml` of `book` with `schemaVersion: 1` and no title; `.scriba/pending/x.json`; `drafts/.versions/ch01.md/x.md`. | `bad.json` and `broken.json` give 422 `PROJECT_VALIDATION_FAILED`. `good.json` is accepted. The `project.yaml` gives 422 `PROJECT_VALIDATION_FAILED` with issues in `details`. The two reserved paths give 400 `PROJECT_PATH_RESERVED`. Only the file for `good.json` is in `.scriba/pending/` at the end. |

Extra tests (not criteria), part 1, in the same file:

- **E1** (decision 4, PST-07 P10): `bare` (importable), `bad` (invalid), `later` (too-new) and `nope` (missing) are refused as `PROJECT_NOT_FOUND` 404, `PROJECT_INVALID` 422 with issues, `PROJECT_SCHEMA_TOO_NEW` 409 and `PROJECT_NOT_FOUND` 404. No file is written in any of them. The codes match the refusals of `appendLog` in H1 (`project-store-files-helpers.test.ts`).
- **E2** (decision 9, recipe runs): two proposes with origin `recipe-run` `run1`, node `n1`, and the same target fold into one change. A third with node `n2` is a separate change. Both answers carry `provenance` as given.
- **E3** (decision 10 and section 4 step 5): the diff for `base = 'a\nb'` and `proposed = 'a\nc'` is exactly the four-line text of step 5.
- **E4** (section 4 step 5, bound): a 3000-line base with each line `old-<n>` and a 3000-line proposal with `new-<n>` give a diff whose first hunk header is `@@ -1,3000 +1,3000 @@`, with 3000 `-old-` lines and 3000 `+new-` lines.

Part 2 tests:

- **L1** (extra, unit line 24, decision 14), in `project-store-pending-list.test.ts`. Build a `bookLibrary()`. Use the kit app to propose three changes: two with origin `agent-run` `r1` on different targets, one with `r2`. Then close the kit app and boot the composed app with `withProjectsApp`. (a) `GET PROJECT_PENDING_ROUTE` for `book` returns three changes in ascending id order (the test sorts the ids it expects, because changes made in one millisecond sort by their random suffix), each parsing with `pendingChangeSchema`. (b) With `?run=r1` it returns two, and with `?run=none` it returns `[]`. (c) On `draft-only` it is refused with 409 `PROJECT_NOT_ACTIVE`. (d) On a fresh `bookLibrary()` with no proposes, the GET returns `{changes: []}`, and `book/.scriba` does not exist afterwards.
- **F3** (existing, `project-store-files-gate.test.ts`) with the row of section 3, and the existing invariant sweeps. Both must pass. They are not new tests.

## 6. Agreement with the downstream units

- **PST-16 (apply and reject, the three-way check).** Blocked by PST-15, so it reads this plan. PST-15 gives it: the file layout (`.scriba/pending/<id>.json`; `resolved/` is PST-16's); `pendingFolder`, `readOpenChanges` and `writeChange` from `pending-store.ts`; `requireOkProject`; `readFileAt` exported from `files.service.ts`; `PendingService` with `propose`, `registerValidator` and `list`; and `conflict: null` on every change PST-15 writes. PST-16 adds `accept`, `reject`, the in-memory conflict in `list`, and the `pending-updated`, `pending-resolved` and `files-changed` events, and it sets `status` to `accepted` or `rejected` when it moves a change to `resolved/`. PST-15 writes nothing under `resolved/`.
- **AGL-12 (write overlay).** At run end it calls `propose` once per touched path, with `origin: {kind: 'agent-run', runId, toolCallId}`, `provenance` for narrative tools, `grounding` for `drafts/` (AGL-17), and `base: {content}` for a path that existed at capture. For a path that was missing at capture it must pass `base: null` (open point 1); otherwise a file the author creates during the run is captured as the base. It needs the returned `id`s for `run-ended.pendingChangeIds`. `propose` runs for a project that is no longer active (decision 3). AGL-12 proposes once per path, so it never folds.
- **GRR-06 (output nodes).** It calls `propose` with `origin: {kind: 'recipe-run', runId, graphId, nodeId}` and `provenance: {graphId, nodeId, entityIds, sourcesUsed}`. The base is the run-start content when the target is a text input's file (`base: {content}`); a target that exists at run start and is not a text input is passed without a base; a target that is missing at run start is passed with `base: null`. Its result is `{pendingChangeId: change.id, path: change.targetPath}`. It registers `registerValidator('graphs/*.json', check)`, where `check` parses the content and runs the graph schema; a parse error is a refusal under decision 10. Its refusal of an invalid graph is `PROJECT_VALIDATION_FAILED` (422), which its output node turns into a node error.
- **PST-18 (draft versions).** Adds its own `FIXTURE_PATHS` key and F3 row (PST-12 plan line 142). Its paths are under `drafts/.versions/`, which this plan refuses through `resolvePath`, so no change here.
- **PST-13 (search, done).** It keeps its own module entries and keys (section 3).
- **PST-20 and PST-21 (UI).** They read `pendingChange` through the contract. No change here.
- **Web.** No web file changes in PST-15.

## 7. Open points

1. **`base: null` in the propose input (contract change).** Recommended: approve. It widens `proposeInputSchema.base` in PST-01's contract file to accept `null` (section 3, step 2). Without it, AGL-12 and GRR-06 cannot record that a target was missing when they captured it, so a file the author creates during a run is captured as the base and PST-16's check cannot flag it. If it is not approved, step 2 and test P4c are dropped, and AGL-12 and GRR-06 must accept that race.
2. **A caller base with a missing target.** The plan gives `kind: modify` with the caller's base content, and PST-16 then reports `target-missing` on apply. The alternative, `create`, would make the caller's base useless when the file is missing. Recommended: as the plan says.
3. **Error codes of validation.** The plan uses `PROJECT_VALIDATION_FAILED` for every failure, including an invalid `project.yaml` and a too-new one, as unit line 22 says. The file API gives `PROJECT_INVALID` (422) and `PROJECT_SCHEMA_TOO_NEW` (409) for the same content (`files.service.ts` `commit`). Recommended: follow the unit. The reviewer decides whether the file API's codes should win.
4. **The diff implementation.** The plan writes a small line diff with a size bound and no dependency. The alternative is the npm package `diff`, whose latest version is `9.0.0` (checked with `npm view diff version`), which would add a runtime dependency to `apps/api`. Recommended: no dependency, because `apps/api` pins its dependencies and the diff has one caller. The reviewer decides.
5. **`.scriba/` in `.gitignore`.** Projects made by New or Import have the line (`projects.service.ts` lines 87 and 134). A project without it, such as the fixture `draft-only`, would have its pending files visible to git. The plan does not edit `.gitignore` in `propose`, because AC1 needs exactly one file written. Recommended: leave it, and let PST-16 or a later unit decide whether the line is added on first propose.

## 8. Review parts

**Part 1 (steps 1 to 8).** Steps 1 to 8 of section 4. Tests P1 to P5 (criteria AC1 to AC5), E1 to E4, and the existing `project-store-files-helpers.test.ts` (step 3). Step 2 belongs to part 1 when open point 1 is approved.

**Part 2 (steps 9 to 12).** Steps 9 to 12 of section 4. Test L1, the existing F3 test and the existing invariant sweeps with the new row and fixture key, and the full gate (build, test, lint, Prettier).

Each step and each test is in exactly one part. A reviewer of part 1 checks AC1 to AC5 and the E tests. A reviewer of part 2 checks L1, the F3 row and the sweep entry, and the full gate.
