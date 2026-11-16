---
id: PST-17
status: draft
---

# PST-17 plan - refresh (three-way merge) and accept anyway

Project store, phase:pending-review, M3. Unit `units/PST-17-refresh-accept-anyway.md`: front matter lines 1 to 10, Why line 15, Decisions lines 18 to 20, acceptance criteria lines 23 to 25 (three criteria). The unit has no Scope and no Demo section.

Planner's draft, checked against main `196e0cd`. The PST-16 code it builds on is on main (`a7995b5`, `927cc3b`), and PST-16 is `status: done` (`plans/PST-16.md` line 3). The working tree was clean when the facts were checked. Nothing was built, installed, run or changed except this file.

Tags: **F**n is a fact checked here (section 8a). **A**n is an assumption not checked here (section 8b). **D**n is a decision of this plan (section 1). "PST-16 D n" is a decision of `plans/PST-16.md`. Tests: **T1** to **T3** are the three criteria; **X1** to **X9** are extra tests for decisions that have no criterion of their own.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contracts and DECISIONS

- **D1. Both are POSTs behind the guard, and the project must be active.** Refresh is `POST .../pending/:id/refresh`; accept anyway is `POST .../pending/:id/accept-anyway`. Source: unit PST-17 lines 18 to 20; module `modules/project-store.md` lines 46 (GETs never mutate) and 48 (active rule). The route constants already exist (`routes.ts` lines 42 to 45, F8).
- **D2. Refresh with a clean merge.** The change gets the disk text as its new captured base and the merged text as `proposed`. The conflict clears, and `pending-updated` is published. Overlapping hunks leave the change conflicted. Source: unit line 18; criteria lines 23 and 24.
- **D3. Accept anyway saves the disk content first, then writes.** For a top-level file of `drafts/` the saved bytes are a version, `drafts/.versions/<name>/<stamp>.<ext>`, with the rule of PST-16 D5 and module line 75. For any other file they are a backup under `<project>/.scriba/backups/`, the location of section 1c. Then the proposal is written, or the supplied `content` in its place. Source: unit line 19; criterion line 25; module line 82 (the accept body may carry the edited `content`).
- **D4. Bodies.** Refresh takes no body. Accept anyway takes `pendingDecisionSchema` (`{content?}`, `pending.ts` lines 70 to 72) or no body, as accept does (PST-16 D21). No contract change is needed (F8, F9).

### 1b. Small decisions this plan makes (the unit leaves them open)

- **D5. The merge is a line merge.** The base, the proposal and the disk are each aligned with the line alignment that already exists (`alignLines`, `unified-diff.ts` line 64; section 2). A hunk is a run of changed lines: base lines `[start, end)` replaced by new lines. Two hunks from different sides conflict when they overlap or touch (a conservative rule: adjacent hunks conflict too). Two identical hunks (same base range, same new lines) count as one change. The algorithm, which the implementer follows:
  1. `ours` is the hunks of `alignLines(base, proposed)`; `theirs` is the hunks of `alignLines(base, disk)`. Each hunk records its side.
  2. Sort all hunks by `start`, then by `end`. Build clusters: a hunk joins the current cluster while its `start` is at most the largest `end` of the cluster.
  3. A cluster with hunks from one side only is applied in order (the hunks of one side never touch each other). A cluster with both sides is applied only when it is exactly one `ours` hunk and one `theirs` hunk with the same `start`, `end` and new lines, and then once. Any other cluster with both sides is a conflict: `mergeLines` returns `undefined`.
  4. The output is the base lines before each applied hunk, then the hunk's new lines, then the base lines after the last hunk. The result is `output.join('\n')`, which gives back the exact text, including a final LF.
  
  The criterion's "paragraphs" are runs of lines separated by a blank line, so edits to different paragraphs never touch. Open point 3 asks whether the Navigator wants paragraph granularity.
- **D6. Refresh, case by case.** (1) Read the stored change and resolve its target again with `resolvePath`; a path refusal is returned unchanged (PST-16 D11). (2) Compute the conflict with `conflictReason` (PST-16 D9 and D10). When it is `null`, nothing is merged: a stored conflict is cleared through `persistConflict` (PST-16 D4), and otherwise the change is returned with no write. (3) When it is `target-missing` or `target-exists`, or when the captured base is `null`, nothing is merged: the conflict is persisted as usual and the change is returned. (4) When it is `base-changed`: if the disk file is larger than `FILE_SIZE_CAP_BYTES`, or its bytes are not text (`decodeText` gives `undefined`), nothing is merged and the conflict is kept as in (3). Otherwise run `mergeLines(base, proposed, diskText)`. (5) If it gives `undefined`, keep the conflict as in (3). (6) If it gives text, the merged text goes through the checks of D7; a failed check refuses the refresh, and nothing is written. (7) Otherwise rewrite the change with `capturedBase` = `{hash: hashOf(diskBytes), content: diskText}`, `proposed` = the merged text, `diff` = `unifiedDiff(targetPath, diskText, merged)`, `conflict` = `null` and `updatedAt` = now (D8), and publish `pending-updated` with the new change. The answer is the change, with status 200, in every case that is not refused.
- **D7. The proposal checks apply to the merged text.** The merged text is a new `proposed`, so it passes the checks that `propose` runs: the size cap, the state of a root `project.yaml`, then the registered validators for the target path (PST-15 decision 10; the code is `pending.service.ts` lines 344 to 371). The checks move into one private method, `checkContent(target, content)`, in the same order, and `propose` calls it where it runs them now. `propose`'s behaviour does not change. A failed check refuses with the code `propose` gives: `PROJECT_FILE_TOO_LARGE` (413) for the size, `PROJECT_VALIDATION_FAILED` (422) for an invalid root `project.yaml` and for a validator (`errors.ts` lines 64 and 78). Accept's edited text is still not checked (PST-16 D13), because the author chose it.
- **D8. `updatedAt` on a clean refresh.** A clean refresh changes the proposal, so `updatedAt` becomes the time of the refresh, as PST-16 D15 says of a proposal. A refresh that only changes the stored conflict keeps `updatedAt`, as PST-16 D15 says.
- **D9. Overlap keeps the change unchanged, except for the conflict flag.** "Leaving the change unchanged" is read as: `proposed`, `capturedBase`, `diff`, `status`, `createdAt` and `updatedAt` stay as they were. The stored `conflict` becomes `base-changed` (with the PST-16 D15 `detectedAt` rule) and is persisted, as PST-16 D4 requires of a POST that touches the target. Refresh writes no file on disk and publishes no `files-changed`.
- **D10. Accept anyway runs no three-way check.** It saves the disk content whenever the target is an existing file, for any kind of change. PST-16 D5 gives versions to `modify` changes only; this plan follows the unit's "keeps the overwritten disk content", so for a `create` whose target now exists (the host wrote it), the host's file is saved too. The content is not checked (as accept, PST-16 D13). A folder at the target, or the root, is refused with `notAFile()` (`files.service.ts` lines 78 to 80, `PROJECT_PATH_INVALID`, 400) before anything is saved. The proposal is written through `writeProposal`, so PST-23's migration seam (PST-16 D19) runs for accept anyway too, as PST-23's unit line 21 requires.
- **D11. Backups never overwrite each other.** Each backup claims a new folder `.scriba/backups/<stamp>`, and `-2`, `-3`, ... is added when the name is taken. The rule is the one of the version names (`versionNameFor`, `draft-versions.ts` lines 19 to 29, with an empty extension). Two accept-anyways in the same millisecond therefore keep both backups.
- **D12. One apply path.** Accept and accept anyway end in one private method, `applyContent(project, change, target, content, now)`. It does what PST-16 D12 steps 2 to 6 do: write the target through `writeProposal`, write the resolved record (`resolveChange`, PST-16 D22), remove the open file, publish `pending-resolved` (status `accepted`) and then `files-changed`, and call the store hook. Accept keeps its conflict check and its version (PST-16 D5), so its behaviour does not change. Accept anyway runs its refusals and path check, then saves the disk content (D3, D10, D11), then calls `applyContent`. A failed write leaves the change open, and the saved copy may remain, as PST-16 D12 says.
- **D13. Refusals of the id are PST-16's.** An unknown or malformed id is `PROJECT_NOT_FOUND` (404); a resolved change is `PROJECT_PENDING_NOT_OPEN` (409); a project that is not active is `PROJECT_NOT_ACTIVE` (409) (PST-16 D3 and D8). Both new routes go through `openChangeOf`, as accept does.
- **D14. Responses.** Refresh and accept anyway answer `200` with a `pendingChangeSchema` object, and both routes carry `@HttpCode(200)`, as accept and reject do (`pending.controller.ts` lines 39 to 57). Accept anyway uses the pipe `pendingDecisionSchema.optional()` and passes `body ?? {}` (PST-16 D21). Refresh has no body and no pipe.

### 1c. The backup location (the open decision of the brief)

The brief named two sources that disagree. The unit (line 19) says `<project>/.scriba/backups/<UTC timestamp>/<path>`. DECISIONS (`plans/DECISIONS.md` line 4041, point 6 of the entry at line 4035, "2026-11-15 — PST-07 — Navigator decisions") says PST-23's backups go to `<project>/.scriba/project-store/backups/<UTC>/<path>`, through `stateDir(projectId, 'project-store')`. What was checked:

- No DECISIONS entry names PST-17 (`grep -n "PST-17" plans/DECISIONS.md` prints nothing, F4). Point 6 is about PST-23's migration backups. It says that the change of PST-23's unit line 23 is made by PST-23's reviser when PST-23 is planned.
- PST-23's unit line 23 says `.scriba/backups/<UTC timestamp>/<path>`, the same text as PST-17 line 19 (F5). The two units agree today.
- The module file does not mention backups (F7). No project-store code writes a backup: `apps/` and `packages/` hold only tests and installer comments that use the word (`apps/api/test/settings.kit.ts` line 73, `apps/api/test/installer-harness.ts` line 30).
- A helper for a folder under `.scriba/` already exists: `ownFolder(project, ['.scriba', 'pending'], create)` (`own-folder.ts` line 11; `pending-store.ts` line 26; `draft-versions.ts` lines 33 to 43 for versions). `stateDir` (`files.service.ts` line 479) is a method of `FilesService`, and `PendingService` does not inject `FilesService` (`pending.service.ts` lines 83 to 87). Option B would need that injection, or a second path helper.
- Both places are under `.scriba/`, which `RESERVED_PATH_PREFIXES` makes unreachable through the file API (`constants.ts` lines 17 to 20, F9). Neither choice changes who can read a backup.

**Choice: `<project>/.scriba/backups/<stamp>[-n]/<path>`**, the unit's text (option A). Reasons: (1) it is this unit's own decision, and this plan may not change a unit's decision, so option B would be a unit change, which is not this plan's to make; (2) it matches PST-23's unit line 23, so no unit text conflicts; (3) DECISIONS point 6 does not name PST-17, and its change to PST-23 is pending; (4) it needs no new mechanism (D11, D12).

**What the choice does not settle.** If the Navigator applies point 6 to PST-23 alone, the two backup kinds end in different folders (open point 1). The change to this plan would then be one path segment in `backups.ts`, plus the paths of T3 and X8.

## 2. Files to create or change

Paths are under the worktree root (section 3, step 0). The names and the layout are this plan's choices.

**New files**

| Path | Steps | Purpose |
|---|---|---|
| `apps/api/src/modules/project-store/three-way-merge.ts` | 2 | `mergeLines(base, ours, theirs): string \| undefined`, the algorithm of D5. It imports `alignLines` and `linesOf` from `./unified-diff`. It returns `undefined` on any conflict. |
| `apps/api/src/modules/project-store/backups.ts` | 6 | `saveBackup(project, relativePath, bytes, now): string`. It takes `ownFolder(project, ['.scriba', 'backups'], true)`, names the folder with `versionNameFor(compactStamp(now), '', taken)` (D11), writes the bytes with `writeText` at `<folder>/<relativePath>`, and returns the folder name. It imports `compactStamp` and `versionNameFor` from `./draft-versions`. |
| `apps/api/test/project-store-pending-refresh.test.ts` | 4, 8 | Tests T1 to T3 and X1 to X9 (section 4). Each test builds its own temp library with `bookLibrary()` and removes it in a `finally`. |

**Edited files**

| Path | Steps | Change |
|---|---|---|
| `apps/api/src/modules/project-store/unified-diff.ts` | 2 | Export only, no behaviour change: `export type Tag` (line 3), `export interface Op` (line 5), `export function linesOf` (line 17), `export function alignLines` (line 64). |
| `apps/api/src/modules/project-store/pending.service.ts` | 3, 4, 6 | (a) Step 3: the checks of `propose` (lines 344 to 371) move into `private checkContent(target, content)`, and `propose` calls it at the same point. (b) Step 4: `refresh(projectId, id)` and its helpers (D6 to D9). (c) Step 6: `acceptAnyway(projectId, id, body)`; the private `applyContent(...)` takes lines 195 to 210 out of `accept`, which keeps its conflict check and its version (lines 186 to 194) and returns `applyContent(...)`. `writeProposal` (lines 319 to 321) does not change. No message constant is added. |
| `apps/api/src/modules/project-store/pending.controller.ts` | 4, 7 | Step 4: `@Post(PROJECT_PENDING_REFRESH_ROUTE)` with `@HttpCode(200)`, `@Param('projectId')` and `@Param('id')`, calling `refresh`. Step 7: `@Post(PROJECT_PENDING_ACCEPT_ANYWAY_ROUTE)` with `@HttpCode(200)`, the same parameters, and `@Body(new ZodValidationPipe(pendingDecisionSchema.optional()))`, calling `acceptAnyway(projectId, id, body ?? {})`. The constants and the schema come from `@bbartolome/scriba-contracts/project-store`. |
| `apps/api/test/invariant-sweep.ts` | 5, 7 | `FIXTURE_PATHS` entries after the `reject` entry (lines 123 to 125): `'/api/project-store/projects/:projectId/pending/:id/refresh'` (step 5) and `'/api/project-store/projects/:projectId/pending/:id/accept-anyway'` (step 7), each with a `no-such-project` path. A route template with `:` fails by name without an entry (lines 223 to 229, F21). |

**Not changed (checked):** everything under `packages/contracts/` (the route constants, the schemas and the error codes already exist); `pending-store.ts`; `draft-versions.ts` (`saveVersion`, `versionNameFor` and `compactStamp` are reused as they are); `own-folder.ts`; `files.service.ts` (`writeText`, `hashOf`, `decodeText` and `notAFile` are reused, and `writeText` is already exported); `project-store.service.ts` (`notifyFilesChanged` exists); `project-store.module.ts` (`PendingController` and `PendingService` are already listed, F12); `atomic-write.ts`; `path-safety.ts`; the PST-15 and PST-16 tests and kits; `project-store-files-gate.test.ts` (its F2 pairs list no pending route, and its F2 loop sends every route the app lists, F22, so the two new routes are covered); `package.json` and the lockfile; `plans/DECISIONS.md`; every unit file and module file.

**Merge order.** PST-18, PST-19 and PST-23 are blocked by PST-16 and run in parallel with PST-17 (section 5). Each adds its own `FIXTURE_PATHS` keys, which are distinct text, so the merge is trivial in either order. PST-17 does not change the body of `writeProposal`, so a later change to it (PST-23's migration) does not clash with this plan.

## 3. Procedure

Run in a worktree on `unit/PST-17`, made from `main` (`git worktree add -b unit/PST-17 <path> main`, or the path the orchestrator gives). Do not push. Stage explicit paths only (`git add -- <paths>`), never `git add -A` or `git commit -a`. Record `node -v` (`v26.x`) and `npm -v` (`11.20.0`) with each result.

**Step 0. Worktree and dependencies.** `git branch --show-current` prints `unit/PST-17`, and `git status --short` prints nothing. Run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Both exit 0.

**Step 1. Baseline.** From `apps/api`, run `npx vitest run test/project-store-pending-propose.test.ts test/project-store-pending-list.test.ts test/project-store-pending-apply.test.ts test/project-store-files-gate.test.ts test/invariant-get-head.test.ts test/invariant-mutation-guard.test.ts`. Expected: all pass before any change. Record the counts.

### Part 1: refresh

**Step 2. The merge.** Export the four names of `unified-diff.ts` (section 2), and create `three-way-merge.ts` (D5). Run `npx tsc --noEmit -p apps/api/tsconfig.json` from the worktree root. Expected: exit 0.

**Step 3. The checks of propose.** Move lines 344 to 371 of `pending.service.ts` into `checkContent(target, content)`, in the same order, and call it from `propose` at the same point. Expected: the step 1 set passes unchanged.

**Step 4. Refresh.** Add `refresh` (D2, D6 to D9) and its route (section 2). Create the test file with T1, T2, X1 (the refresh part), X2 (the refresh part), X3, X4, X5, X6 and X9. Run `npx vitest run test/project-store-pending-refresh.test.ts`. Expected: these tests pass. Commit `feat(PST-17): refresh a pending change by a three-way merge` with the paths of part 1, by path.

**Step 5. Sweep.** Add the refresh `FIXTURE_PATHS` entry. Run `npx vitest run test/invariant-mutation-guard.test.ts test/invariant-get-head.test.ts test/project-store-files-gate.test.ts`. Expected: all pass.

### Part 2: accept anyway

**Step 6. Backups, the apply path and accept anyway.** Create `backups.ts` (D11). Add `applyContent` and make `accept` call it (D12), and add `acceptAnyway` (D3, D10, D14). Expected: `npx tsc --noEmit -p apps/api/tsconfig.json` exits 0, and the step 1 set still passes, which covers accept's behaviour (PST-16 tests included).

**Step 7. Route and sweep.** Add the accept-anyway route and its `FIXTURE_PATHS` entry. Run the step 5 set. Expected: all pass.

**Step 8. Tests.** Add T3, X7 and X8 to the test file, and the accept-anyway parts of X1 and X2. Run `npx vitest run test/project-store-pending-refresh.test.ts`. Expected: 12 tests pass (T1 to T3, X1 to X9). If X8 fails only because the fake clock does not reach the server (A2), drop X8 and report it; no criterion depends on it.

**Step 9. Full gate.** Run `npx prettier --write` on the new and changed files. From the root: `npm run build -w @bbartolome/scriba-contracts`, `npm test -w @bbartolome/scriba-api`, `npm run lint -w @bbartolome/scriba-api`, `npx prettier --check apps/api packages/contracts`, and `npm run lint` at the root (it runs the examples check over every test file; the new test file names no `examples/`). Expected: each exits 0, and `git status --short` shows only the paths of section 2.

**Step 10. Commit.** Stage the part 2 paths with `git add -- <paths>`, then `git commit -m "feat(PST-17): accept anyway, with the disk content saved first" -- <paths>`. Expected: two commits on `unit/PST-17` in total (steps 4 and 10).

## 4. Acceptance criteria and tests

Each criterion has one test. The seam is the composed kit app, `createTestApp({libraryDir, modules: [pendingKitModule()]})` (`create-test-app.ts` line 65; `project-store-pending.kit.ts` lines 22 to 52). Propose goes through the kit route. Refresh, accept anyway, accept and the list go through their real paths. Host edits are direct writes to the temp library, because no POST touches the target. The stored conflict therefore stays as it was until the next POST. The event stream is `GET /events`, read with `openSse` (`sse.ts` line 31) and `dataOf` (line 66), as PST-16's A5 does. The helpers `nextEvent`, `withKit`, `propose` and `openFiles` of `project-store-pending-apply.test.ts` (lines 53 to 107) are copied into the new file, not shared, so no existing test changes (the simplest choice).

| Criterion (unit line) | Test | Part | Pass condition |
|---|---|---|---|
| Line 23: "Refresh clears a conflict when host edits and proposal touch different paragraphs, with merged text containing both." | **T1** | 1 | The file `sources/outline.md` is `# Outline\n\nFirst point.\n\nSecond point.\n\nThird point.\n`. Propose `# Outline\n\nFirst point.\n\nSecond point.\n\nThird point, revised.\n`. Open `/events` and read the hello block. The host writes `First point, host edit.` in place of `First point.`. `POST …/refresh` answers 200 with `conflict` null, `proposed` equal to `# Outline\n\nFirst point, host edit.\n\nSecond point.\n\nThird point, revised.\n`, and `capturedBase` with `content` equal to the host text and `hash` equal to `sha256Of` of its bytes. The next event is `pending-updated` with the same change. The file still holds the host text. Accept with `{}` then answers 200, and the file equals the merged text. |
| Line 24: "Refresh keeps the conflict when they overlap, leaving the change unchanged." | **T2** | 1 | The same file. Propose the same text with `Second point.` replaced by `Second point, agent.`. The host writes `Second point, host.` on the same line. Refresh answers 200 with `conflict.reason` `base-changed`. `proposed`, `capturedBase`, `diff`, `status`, `createdAt` and `updatedAt` equal their values before the refresh (D9). Exactly one `pending-updated` arrives, because the stored reason changed from null. The file still holds the host text. Accept with `{}` then answers 409 `PROJECT_PENDING_CONFLICT` with `details.reason` `base-changed`. |
| Line 25: "Accept-anyway keeps the overwritten disk content as a version (draft) or a backup (other file), then writes the proposal." | **T3** | 2 | (a) `drafts/ch01.md` is `Old\n`. Propose `New\n` (modify). The host writes `Host\n`. Accept with `{}` answers 409. Accept anyway with `{}` answers 200 with `status` `accepted`. The file is `New\n`. `drafts/.versions/ch01.md/` holds exactly one file, named `^\d{8}T\d{9}Z\.md$`, with the bytes `Host\n`. (b) `sources/outline.md` is `# Outline\n`. Propose `P\n`. The host writes `H\n`. Accept anyway with `{}` answers 200. The file is `P\n`. `.scriba/backups/` holds exactly one folder, and the file `sources/outline.md` inside it holds `H\n`. `drafts/.versions` does not exist. |

**Extra tests** (the same file; none is a criterion).

- **X1** (D13). Refresh (part 1) and accept anyway (part 2) of a resolved change give 409 `PROJECT_PENDING_NOT_OPEN`. An unknown id of the right form gives 404 `PROJECT_NOT_FOUND`, and so does an id with a slash (`a%2Fb`), which never reaches the disk.
- **X2** (D1, D13). Propose into `second`, an ok project made by `addOkProject` (`project-store-active.kit.ts` line 71). Refresh (part 1) and accept anyway (part 2) with `projectId` `second` give 409 `PROJECT_NOT_ACTIVE`. Nothing in `second` changes, and the change stays open.
- **X3** (D6, case 3). (a) The host deletes a modify target: refresh answers 200 with `target-missing`; the file stays absent; `proposed` and `capturedBase` are unchanged. (b) A create whose target the host has written: refresh answers 200 with `target-exists`; the host file and `proposed` are unchanged.
- **X4** (D6, cases 2 and 1). (a) A refused accept stores `base-changed` and publishes `pending-updated`. The host restores the original bytes. Refresh answers 200 with `conflict` null, and `pending-updated` arrives with `conflict` null; `proposed` and `capturedBase` are unchanged. (b) With no stored conflict and the disk equal to the base, refresh answers 200, the change file is byte-identical before and after, and nothing is published (500 ms timeout).
- **X5** (D5). The host and the proposal make the same edit to one line. Refresh answers 200 with `conflict` null and `proposed` equal to the shared text, because identical hunks are not a conflict. Accept with `{}` then writes it.
- **X6** (D7). `graphs/a.json` is `{\n  "schemaVersion": 1,\n\n  "a": 1\n}\n`. The kit registers the `graphs/*.json` validator (`project-store-pending.kit.ts` lines 34 to 42). Propose the same text with `"a": 2` (it passes). The host writes `"schemaVersion": 2` in place of `1`, which is not checked. Refresh gives 422 `PROJECT_VALIDATION_FAILED`; the change file and the host file are unchanged.
- **X7** (part 2; D3, D10). (a) Accept anyway with no body (a `fetch` POST with no body and no content type) applies the proposal (200), and the host bytes are saved in a backup. (b) On a new change of the same file, accept anyway with `{content: 'Edited\n'}` writes `Edited\n`. (c) A create of `sources/new.md` whose target the host has written: accept anyway writes the proposal and saves the host bytes in a backup, with no version.
- **X8** (part 2; D11). `vi.useFakeTimers({toFake: ['Date']})` and `vi.setSystemTime` with one fixed instant. Two accept-anyways of `sources/outline.md`, each after a host edit and a new proposal. The backup folders are named `<stamp>` and `<stamp>-2`, and each holds its own host bytes. The real clock is restored in a `finally` (assumption A2).
- **X9** (D6, case 4). The host writes bytes with a NUL byte in the target. Refresh answers 200 with `base-changed` kept; `proposed` and the host file are unchanged.

**Existing tests that must still pass** (not new): PST-15's `project-store-pending-propose.test.ts` and `project-store-pending-list.test.ts`; PST-16's `project-store-pending-apply.test.ts` (accept, `applyContent` and `checkContent` are its regression set); `project-store-files-gate.test.ts`; `invariant-get-head.test.ts` and `invariant-mutation-guard.test.ts`.

The three criteria need only the temp library and the kit. No criterion is left untested, and none is weakened.

## 5. Agreement with the downstream units

None of PST-18, PST-19, PST-20, PST-22 or PST-23 has a plan or a `unit/` branch (`ls plans/` lists no such file; `plans/QUEUE.md` lines 8 and 10 say "no plan" for PST-20 and PST-22). Each row says what the unit reads from this plan.

- **PST-20 (review queue UI).** Its front matter (line 7) names PST-17. It needs refresh and accept anyway as routes that answer `pendingChangeSchema` (D14). A refresh answer of 200 may carry a `conflict`, which is not an error. The refusals are 409 `PROJECT_PENDING_NOT_OPEN` and `PROJECT_NOT_ACTIVE`, 422 `PROJECT_VALIDATION_FAILED`, 413 `PROJECT_FILE_TOO_LARGE` and 404 `PROJECT_NOT_FOUND` (D7, D13). Accept anyway takes the same body as accept, so the merge view's text is sent as `content`. The `pending-updated` payload carries the whole change (`events.ts` lines 30 to 34), so the UI can show a conflict between two lists. Its "explicit confirmation" dialog is its own (its unit line 18; open point 2).
- **PST-22 (review gate).** Its checklist (unit line 23) names "refresh clean/overlapping; accept-anyway backup". T1, T2 and T3 cover those. Its demo step 3 (unit line 32, "Refresh keeps it conflicted; Reject clears it") follows from T2 and from PST-16's reject.
- **PST-18 (draft versions API).** Its restore saves the current content with `saveVersion` (its unit line 19), which PST-17 does not change. The versions that accept anyway writes have the names PST-16 D5 gives, `<stamp>[-n]<ext>`, so PST-18's listing reads them as PST-16 says.
- **PST-19 (optional watcher).** It calls `ProjectStoreService.notifyFilesChanged` (`project-store.service.ts` line 76). The recheck that PST-16 registered (`pending.service.ts` lines 89 and 245 to 251) persists the flags and publishes `pending-updated`, as PST-19's unit line 15 says. Refresh does not notify (D9). PST-19 needs no edit to `pending.service.ts`.
- **PST-23 (migrations).** Its unit (line 21) runs migrations on apply. Accept anyway writes through `writeProposal`, inside `applyContent` (D12), so one seam covers both. Its backups go to `.scriba/backups/<UTC timestamp>/<path>` (its unit line 23), the same root as PST-17. The planner of PST-23 should claim its folder with `saveBackup` (`backups.ts`), so that the two units never write into one folder. If DECISIONS point 6 is applied, the location changes in `backups.ts` for both units (open point 1).
- **PST-14 (search box UI) and PST-21 (version history UI).** PST-14 is parallel to PST-17 (its front matter line 8) and shares no file. PST-21 reads PST-18 only.
- **SHL-16 (editable merge view).** Its accept sends the edited text as `content` (PST-16 plan, section 2, C22, citing `plans/SHL-16.md` line 100). Accept anyway takes the same body (D4).
- **PST-16 (done, the base).** PST-17 changes `accept` (the apply part moves to `applyContent`) and `propose` (the checks move to `checkContent`), with no change of behaviour. PST-16's tests are the regression set (section 4).

## 6. Changes of other draft or planned plans to the same files

The plans with status `draft` or `planned` are `plans/AGL-19.md` (`status: draft`, line 3) and `plans/TRG-14.md` (`status: planned`, line 3). `grep -l "^status: \(draft\|planned\)" plans/*.md` prints only these two (F27, F28). Neither touches a file of section 2:

- **AGL-19.** Its files (rows at lines 35 to 40) are `examples/nonfiction/drafts/the-plateau-is-not-the-end.md` (new), `examples/nonfiction/sources/outline.md` (line 34 only), `e2e/fixtures/mock-openai/scenarios/grounding-claims.json` (new), `e2e/specs/verdicts-sample.e2e.ts` (new), and its unit and plan at the last commit. Its section 2 says `apps/api/**` is not changed. No path is shared with PST-17, so the two changes are correct in either order. Its e2e spec does not call refresh or accept anyway.
- **TRG-14.** Its files (rows at lines 99 to 108) are under `apps/web/`, with `apps/web/package.json` (line 108), `package-lock.json`, and `e2e/specs/tools-editor.e2e.ts` (step 9). Its line 95 says `apps/api/**` does not change. No path is shared with PST-17, so the two changes are correct in either order.

The done plans that touch the same files are PST-15 (`plans/PST-15.md`) and PST-16 (`plans/PST-16.md`). Their code is the base of this plan (section 3, step 1), and this plan changes it only as section 2 says.

## 7. Open points

1. **Backup location, against DECISIONS point 6.** Point 6 (`plans/DECISIONS.md` line 4041, the PST-07 entry of 2026-11-15) moves PST-23's migration backups to `.scriba/project-store/backups/`. It does not name PST-17. This plan keeps PST-17 at the unit's `.scriba/backups/` (section 1c). For the Navigator: decide whether accept anyway's backup moves with PST-23's. If it does, PST-17's unit line 19 changes (a unit edit, not made here), and this plan changes in one path segment of `backups.ts` and in the paths of T3 and X8. Recommended: decide it together with point 6, for both units at once.
2. **A server-side "explicit confirmation" for accept anyway.** The unit's line 19 says "(separate POST, explicit confirmation)". This plan reads the confirmation as the separate route plus the dialog of PST-20 (its unit line 18), so the body is `{content?}`, as for accept. If the Navigator wants the server to require a field, `pendingDecisionSchema` changes (a contract change, expand–contract), and PST-20 and PST-22 change with it. Recommended: no field.
3. **Granularity of the merge (not blocking).** The criterion says "different paragraphs". This plan merges by lines (D5), so two edits to different lines of one paragraph merge cleanly. A paragraph-level merge would be stricter and would change only `three-way-merge.ts`. Recommended: keep lines, because the unit speaks of hunks.

## 8. Facts checked and assumed

### 8a. Checked (file and line on main `196e0cd`; the PST-16 code is on main at `a7995b5` and `927cc3b`)

- **F1.** Unit PST-17: front matter lines 1 to 10 (`blocked_by: [PST-16]` line 7, `parallel_with: [PST-14, PST-18, PST-19, PST-23]` line 8, `unblocks: [PST-20, PST-22]` line 9); Why line 15; Decisions lines 17 to 20; criteria lines 22 to 25. There is no Scope or Demo section.
- **F2.** Blocker consistency. PST-16 unit line 9 lists PST-17 in `unblocks`. PST-20 unit line 7 and PST-22 unit line 7 name PST-17 in `blocked_by`. PST-14, PST-18, PST-19 and PST-23 name PST-17 in `parallel_with` (line 8 of each). `grep -ln PST-17 units/*.md` finds no other unit.
- **F3.** PST-16 is `status: done` (`plans/PST-16.md` line 3). Its commits `927cc3b` and `a7995b5` are ancestors of `main` (`git merge-base --is-ancestor`). `git status --short` printed nothing.
- **F4.** `plans/DECISIONS.md`: `grep -n "PST-17"` finds nothing. `grep -n backups` finds only line 4041, point 6 of the entry at line 4035 (2026-11-15, PST-07, Navigator decisions). Its text is quoted in section 1c.
- **F5.** PST-23 unit line 21 (migration on first write through apply, restore or write) and line 23 (backup at `<project>/.scriba/backups/<UTC timestamp>/<path>`). PST-18 unit line 19 (restore saves the current content as a version). PST-19 unit line 15 (re-checks the conflict flags of touched targets).
- **F6.** PST-20 unit: line 7 (`blocked_by`), line 15 (route and list), line 18 (the actions, including accept-anyway "with an explicit confirmation dialog"), lines 23 to 25 (criteria). PST-22 unit line 7 (`blocked_by`), line 23 (the checklist), line 32 (demo step 3).
- **F7.** Module `modules/project-store.md`: line 45 (path safety is the one function), 46 (GETs never mutate), 47 (routes), 48 (active rule), 50 (hashes), 52 (no other module's implementation), 55 (testing), 74 (settled decisions), 75 (version path), 82 (accept carries the edited `content`). `grep -c -i backup modules/project-store.md` prints 0.
- **F8.** `packages/contracts/src/project-store/routes.ts`: accept and reject, lines 38 to 41; `PROJECT_PENDING_REFRESH_ROUTE`, lines 42 and 43; `PROJECT_PENDING_ACCEPT_ANYWAY_ROUTE`, lines 44 and 45.
- **F9.** `packages/contracts/src/project-store/pending.ts`: `pendingConflictSchema` lines 29 to 32; `pendingChangeSchema` lines 37 to 57 (`capturedBase`, nullable, lines 43 to 48); `pendingDecisionSchema` lines 70 to 72. `constants.ts` lines 17 to 20: `RESERVED_PATH_PREFIXES` is `.scriba/` and `drafts/.versions/`.
- **F10.** `packages/contracts/src/project-store/errors.ts`: `PROJECT_PENDING_CONFLICT` line 23 (409 at line 76); `PROJECT_PENDING_NOT_OPEN` line 24 (409 at line 77); `PROJECT_VALIDATION_FAILED` line 25 (422 at line 78); `PROJECT_NOT_FOUND` 404 at line 62; `PROJECT_FILE_TOO_LARGE` 413 at line 64. `events.ts`: `pendingEventDataSchema` lines 7 to 10; `pending-updated` lines 30 to 34.
- **F11.** `apps/api/src/modules/project-store/pending.service.ts` on main: the constructor and the hook registration, lines 83 to 90 (the hook at line 89); the `validators` field, line 81; `list`, lines 100 to 119; `conflictOf`, lines 123 to 136; `conflictReason`, lines 141 to 167 (a null base gives `base-changed` at line 154, before the existence check at line 155); `accept`, lines 171 to 212 (the edited content at line 186, the version at lines 187 to 194, `writeProposal` at line 195, the events and the hook at lines 197 to 210); `reject`, lines 215 to 229; `recheck`, lines 233 to 242; `recheckQuietly`, lines 245 to 251; `openChangeOf`, lines 255 to 276; `persistConflict`, lines 279 to 296; `resolveChange`, lines 299 to 316; `writeProposal`, lines 319 to 321; `propose`, lines 325 to 469, with the checks at lines 344 to 371 (size cap 344 to 346, root `project.yaml` 347 to 356, validators 357 to 371).
- **F12.** `pending.controller.ts`: accept, lines 38 to 48 (the optional pipe and `body ?? {}`); reject, lines 50 to 57. `project-store.module.ts`: `PendingController` on line 10 (import) and line 44 (`controllers`); `PendingService` on line 62 (`providers`) and line 71 (`exports`).
- **F13.** `pending-store.ts`: `PENDING_ID_PATTERN` line 17; `isPendingId` line 20; `pendingFolder` line 26 (`ownFolder` on `.scriba/pending`); `resolvedFolder` line 34; `newPendingId` line 42; `readOpenChanges` line 48; `readChange` line 67; `writeChange` line 84.
- **F14.** `draft-versions.ts`: `isTopLevelDraft` line 8; `compactStamp` line 13; `versionNameFor` lines 19 to 29 (`-n` from 2; an empty extension gives no extension); `versionFolderOf` lines 33 to 43; `saveVersion` lines 47 to 61.
- **F15.** `own-folder.ts`: `ownFolder(project, segments, create)` lines 11 to 37; a folder on the way that does not resolve under the real root gives `PROJECT_PATH_OUTSIDE` (line 33).
- **F16.** `files.service.ts`: `refuse` line 70 (`details` optional); `notAFile()` lines 78 to 80 (`PROJECT_PATH_INVALID`, `FILE_MESSAGES.NOT_A_FILE`); `hashOf` line 87; `decodeText` lines 93 to 102 (a NUL byte or invalid UTF-8 gives `undefined`; `ignoreBOM: true`, so the BOM is kept); `readFileAt` line 135; `writeText` line 154 (exported); `commit`, lines 523 to 555 (publish at 545, hook at 550); `stateDir` line 479 (a method of `FilesService`, which starts at line 224).
- **F17.** `atomic-write.ts` line 6 (`writeFileAtomic(target, text: string | Buffer)`) and line 7 (`mkdirSync` of the parent folder, recursive).
- **F18.** `unified-diff.ts`: `type Tag` line 3; `interface Op` line 5; `LCS_BOUND` line 14 (4,000,000 cells; above it the middle is one hunk); `linesOf` line 17 (not exported); `middleOps` lines 23 to 61; `alignLines` line 64 (not exported); `unifiedDiff` line 121 (exported).
- **F19.** `project-store.service.ts`: `libraryRoot` line 41; `resolvePath` line 46; `onFilesChanged` line 71; `notifyFilesChanged` line 76; `requireActive` line 83.
- **F20.** `projects.service.ts` line 59: `find(id)` runs discovery on each call, so a project found at the start of a request is current for that request.
- **F21.** `apps/api/test/invariant-sweep.ts`: `FIXTURE_PATHS` line 73; the pending entries at lines 117 to 125 (the `reject` entry ends at line 125); the failure for a template with no entry, lines 223 to 229.
- **F22.** `apps/api/test/project-store-files-gate.test.ts`: `F2_PAIRS` lines 333 to 349 (no pending row); the composed app's routes are listed at lines 358 to 360; the loop that sends every listed route with no cookie is at lines 374 to 382.
- **F23.** `apps/api/test/project-store-pending-apply.test.ts` (PST-16): header comment lines 35 to 37; constants lines 39 to 45; `nextEvent` line 53; `withKit` line 61; `propose` line 77; `openFiles` line 100; `changeFile` line 110. Its tests are A4 (line 165), A1 (202), A2 (232), A3 (273), A5 (341), X1 (398), X2 (434), X3 (469), X5 (503), X6 (537), X7 (574), X9 (626, with `vi.useFakeTimers`) and X10 (673).
- **F24.** `apps/api/test/project-store-pending.kit.ts`: `pendingKitModule` lines 22 to 52; the `graphs/*.json` validator route `register-graph-validator` lines 34 to 42.
- **F25.** Helpers: `sse.ts`, `OpenSse.next` line 25, `openSse` line 31, `dataOf` line 66. `project-store-active.kit.ts`: `addOkProject` line 71, `postJsonPlain` line 81. `project-store-files.kit.ts`: `bookLibrary` line 44, `fileUrl` line 49, `sha256Of` line 60, `putFile` line 70. `create-test-app.ts`: `createTestApp` line 65.
- **F26.** `packages/contracts/src/platform/slugs.ts`: `MODULE_SLUGS` starts at line 4 and includes `'project-store'` at line 8, the owner check of `stateDir`.
- **F27.** `plans/AGL-19.md`: `status: draft` (line 3); its file rows at lines 35 to 40; its section 2 says `apps/api/**` is not changed.
- **F28.** `plans/TRG-14.md`: `status: planned` (line 3); line 95 (`apps/api/**` does not change); its file rows at lines 99 to 108 (`apps/web/package.json` at line 108).
- **F29.** `plans/PST-15.md`: decision 10 (validation order) at line 22; decision 11 (validators) at line 23.
- **F30.** `apps/api/vitest.config.mts`: `include` at line 8 (`test/**/*.test.ts`); `testTimeout` at line 9 (20000 ms).
- **F31.** `plans/QUEUE.md` line 5: "PST-17 | M3 | yes | on path to demo; all blockers done on main".
- **F32.** `plans/PST-16.md` decisions D1 to D23 (section 1) and its section 2 (C1 to C29) are the reference for "PST-16 D n" and "PST-16 C n" in this plan. `units/PST-16-apply-three-way-check.md` lines 18 to 26 (decisions) and lines 29 to 33 (criteria) are the unit text it checks.

### 8b. Assumed, not checked here

- **A1.** The implementer's Node is 26 and npm is 11.20.0, as in the PST-16 plan.
- **A2.** `vi.useFakeTimers({toFake: ['Date']})` changes `new Date()` in the server code of the same test process (PST-16 A2). Only X8 depends on it.
- **A3.** `alignLines` on the largest middle that `LCS_BOUND` allows (4,000,000 cells) finishes within the 20 s `testTimeout` (F30). No test reaches that size. Above the bound a side's middle is one hunk, so any change of the other side inside that middle is a conflict; the merge never writes a wrong text, it may only refuse a clean merge.
- **A4.** A merged text that keeps both sides' edits is what the criterion means by "merged text containing both". T1 checks the exact text.
- **A5.** Each test app creates its own `PendingService`, so each has its own `validators` array (F11, line 81). The graph validator that X6 registers does not reach other tests.
