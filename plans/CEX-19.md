---
id: CEX-19
status: draft
---
# CEX-19 plan — snapshots panel: create with label, list, restore behind confirmation

Revision 1 (planner), draft. Checked at main `a5f0f32` with a clean tree. Unit: `units/CEX-19-snapshots-panel.md` (module compile-export, phase:manuscript-snapshots, M5; `blocked_by: [CEX-16, CEX-17]`, both `status: done` on main; `unblocks: [CEX-20]`). This plan changes no unit, module, contract, API or e2e file, writes nothing to `plans/DECISIONS.md`, and marks nothing passed. The planner ran no build, test, install or lint command.

Tags: `D<n>` is a decision the plan obeys, `P<n>` is a planner's choice (the simplest option the sources allow), `F<n>` is a checked fact (section 2a), `A<n>` is an assumed fact (section 2b), `O<n>` is an open point (section 7).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contract and CEX-16

- **D1 Web panel only.** The snapshot API and its contract are on main (CEX-16, done). The unit asks for no server change, so no API or contract file changes. Source: unit lines 15 to 17; F6, F7.
- **D2 Create with a label.** POST `/api/compile-export/snapshots` with `{label}`, answered by a snapshot summary. The server slugifies the label. Source: unit line 15; `packages/contracts/src/compile-export/snapshots.ts` lines 30 to 32; module line 40 (snapshot create is a POST); F6, F7.
- **D3 List newest first.** Each row shows the label, the time, the file count and the words. Unreadable rows are marked and cannot be restored. The server sorts the list and marks unreadable ones (`words: null`, `unreadable: true`). Source: unit line 15; F6, F7.
- **D4 Restore behind a confirm dialog that names the pre-restore snapshot.** The server takes the `pre-restore` snapshot first. Source: unit line 16; CEX-16 unit, Decisions, Restore bullet; F7.
- **D5 Refresh on `snapshot-created` and `snapshot-restored`.** Source: unit line 17; module line 44 (events); `events.ts` lines 22 and 28 (data schemas); F6.
- **D6 Acceptance criteria and seam.** Two criteria (unit lines 20 and 21). The heading says "Vitest + fakes", which is the module's UI seam: the manuscript route under Angular's Vitest runner, against the Shell's fakes. Source: unit lines 19 to 21; module lines 58 to 62; F10.
- **D7 Phone is read-only for writes.** The outline is read-only on phone (CEX-17 unit, Decisions, Phone bullet; `plans/CEX-17.md` D14). The unit does not mention phone. This plan applies the same rule to create and restore (P9, O5). Source: `units/CEX-17-manuscript-route-outline.md`, Decisions, Phone bullet.
- **D8 Also re-read on the Shell's reconcile tick.** Reconnecting clients reconcile through state endpoints, because the stream has no replay. Source: `units/README.md` line 134; DECISIONS 2026-11-16, MPR-13 Navigator decisions, point 2 (line 4761). This is the planner's reading of the convention (O3).
- **D9 No runtime zod in the browser.** Contract values the browser needs are hand-written copies, imported from the contract as types only, and checked by a parity spec in Node. Source: DECISIONS 2026-11-13, zod entry (line 1084); `apps/web/src/app/features/compile-export/manuscript-contract.ts` line 11.
- **D10 Placement.** The panel sits on the existing route `/projects/:projectId/manuscript`, under the outline. No new route. Source: module line 39; CEX-20 unit, Demo steps 4 and 8 (Snapshot and Restore are done from the Manuscript view).

### 1b. Planner's choices

- **P1 Files.** Four new files and two edits (section 3). The panel is a standalone component `SnapshotsPanel`, selector `app-snapshots-panel`, in `snapshots-panel.ts`, the same shape as `ManuscriptPage`.
- **P2 Confirm dialog is `window.confirm`.** It is the existing practice for destructive actions in the web app. `apps/web/src/app/features/tool-registry/tools-list.ts` line 687 and `apps/web/src/app/shell/unsaved-text.ts` line 34 use it, and `apps/web/src` has no Material dialog. Open point O1.
- **P3 Dialog text.** `Restore <id>? The current manuscript is saved first as a pre-restore snapshot. Files that are not in this snapshot are deleted.` The word `pre-restore` comes from the copied constant `PRE_RESTORE_LABEL`. The text states both effects of the server's restore: the pre-restore snapshot and the deletions (F7).
- **P4 Create.** A text input with `aria-label="Snapshot label"` and a button with the text `Snapshot`. The button is disabled when the trimmed label is empty or the page is not editable. The trimmed label is sent. The panel does not change its list from the answer. The `snapshot-created` event (D5) refreshes it, and the server publishes that event on every create (F7).
- **P5 Restore.** A button with the text `Restore` and `aria-label="Restore <id>"`, drawn only on readable rows, and disabled when the page is not editable. The answer is a manuscript view. It is parsed with `manuscriptViewCopy` and not used, because the server publishes `manuscript-updated` for the page and `snapshot-restored` for the panel (F7).
- **P6 Rows.** Each row is `li[data-snapshot-id="<id>"]`. It shows the label, a `<time datetime>` holding `createdAt` as the server gives it (UTC ISO text), `N files`, and `Words: <total> (<body> in the body)`. An unreadable row shows `Unreadable: cannot be restored`, `Words: unknown` and no button. The rows keep the server's order; the panel does not sort them again.
- **P7 Reads are not gated on the project id.** The list read has no project id in its path, because the server uses the active project (F7). `ActiveProjectSignal.projectId()` can be `''` when a component is constructed (F11, F12). So the read is never gated, and the event filter compares the event's project id with `projectId()` when the event arrives, as the page does.
- **P8 Errors and writes.** Failures show in a `role="alert"` paragraph of the panel, with the `ApiError` message or `The request failed.`. The panel copies the page's `outcomeOf` and `failureMessage` helpers, which the page does not export (F8). There is no in-flight lock, as CEX-17 D11 has none.
- **P9 Phone.** Create and restore are disabled on phone, following D7 (O5).
- **P10 Copies.** `snapshot-contract.ts` holds the two route paths, the `PRE_RESTORE_LABEL` copy (the API's constant is not exported by the contract, F7), the list and summary copies with one shared entry guard, and the event-data guard. Open point O6.
- **P11 Tests in a new spec.** The panel's tests go in `snapshots-panel.spec.ts`, not into `manuscript-page.spec.ts`, so that CEX-18's tests on the same route do not collide with them. The new spec copies the page spec's small helpers.
- **P12 Harness.** The tests render `provideRouter([{ path: 'projects/:projectId/manuscript', children: manuscriptRoutes }])` with `createShellTestDoubles()` and no active-project guard, as the page spec's `renderPage` does (F9).

## 2. Facts checked and facts assumed

### 2a. Checked (with the file or command that shows it)

- **F1** Unit front matter (lines 2 to 9) and sections (lines 14 to 21): two criteria; `blocked_by: [CEX-16, CEX-17]`; `unblocks: [CEX-20]`; `parallel_with: [CEX-15, CEX-18]`. Both `parallel_with` partners list CEX-19 back (CEX-15 unit line 8, CEX-18 unit line 8). `git show 098add9 -- units/CEX-19-snapshots-panel.md` shows that commit changed only `parallel_with`; `blocked_by` was already `[CEX-16, CEX-17]`.
- **F2** `modules/compile-export.md`: line 39 (the lazy route at the manuscript path); line 40 (snapshot create and restore are POSTs); line 44 (events); lines 49 to 54 (settled decisions: restore deletes newer files with a pre-restore snapshot); lines 58 to 62 (testing principles, UI seam); line 71 (no deleting or renaming snapshots in the app).
- **F3** `units/README.md` line 64 (`blocked_by` is the source of truth); line 134 (events have no replay; reconnecting clients reconcile through state endpoints).
- **F4** CEX-16 and CEX-17 are done on main: `plans/CEX-16.md` and `plans/CEX-17.md` have `status: done`; DECISIONS entries "CEX-16 — Merged to main" (line 6413) and "CEX-17 — Merged to main" (line 6567); the criteria of `units/CEX-16-snapshot-api.md` are ticked.
- **F5** `grep -m1 '^status:' plans/*.md`: the only plans with status draft or planned are `plans/CEX-10.md` (draft) and `plans/GRR-15.md` (planned). There are no plans for CEX-15, CEX-18 or CEX-20.
- **F6** Contract on main: `packages/contracts/src/compile-export/routes.ts` line 27 (`SNAPSHOTS_ROUTE`) and line 29 (`SNAPSHOT_RESTORE_ROUTE`); `snapshots.ts` line 15 (`snapshotSummarySchema`, `words` nullable, `unreadable` optional), line 25 (`snapshotListSchema`), lines 30 to 32 (`snapshotCreateRequestSchema`, `label` min 1), line 35 (`snapshotRestoreRequestSchema`); `events.ts` line 22 (`snapshotCreatedDataSchema`) and line 28 (`snapshotRestoredDataSchema`); `project-store/files.ts` line 19 (`mtime` is an ISO datetime).
- **F7** API on main: `apps/api/src/modules/compile-export/snapshot.controller.ts` line 22 (GET list), lines 27 to 28 (POST create, 200), lines 36 to 37 (POST restore, 200, answers a `ManuscriptView`). `snapshot.service.ts`: `list()` sorts newest first; `create()` publishes `snapshot-created` after writing the manifest; `restore()` refuses not-found (404) and unreadable (409) at lines 131 to 140, before the pre-restore create at line 146, and publishes `snapshot-restored` (line 173) and `manuscript-updated` (line 178); `activeProjectId()` reads the active project. `snapshot-names.ts` line 4 (`PRE_RESTORE_LABEL = 'pre-restore'`).
- **F8** Web on main, `apps/web/src/app/features/compile-export/`: `compile-export.routes.ts` (one lazy child at `''`); `manuscript-page.ts` (393 lines; the `imports` array at line 143; the template from line 144 to line 228; the outline's `@for` closes at line 226 and its `@if` at line 227; the class `ManuscriptPage` at line 230; `failureMessage` and `outcomeOf` near the top, not exported); `manuscript-contract.ts` (hand copies; line 11 says the browser ships no runtime zod); `manuscript-contract.spec.ts` (K1 to K3); `manuscript-page.spec.ts` (473 lines). No snapshot file exists yet.
- **F9** `manuscript-page.spec.ts`: `beforeEach` at lines 87 to 89; `role="alert"` checks at lines 385 and 405 (M2 expects no alert after success); the request-method list at lines 466 to 468 (`expect(doubles.api.requests.map((request) => request.method)).toEqual(['GET'])`, in M4, the phone test); `requests.at(-1)` checks at lines 352, 420 and 428 (the last request is a write); `renderPage` at line 115.
- **F10** Shell fakes, `apps/web/src/app/shell/testing/test-doubles.ts`: `FakeApiClient.respond(method, path, body)` and `fail(method, path, error)`; a canned body is parsed with the caller's schema (`parseResponse`); an unanswered route throws `No canned response for <method> <path>.`; `FakeEventSource.push(envelope)`; `tick(reason)`; `stream(slug)` (line 124); `reconcile$` (line 121). `ReconcileReason` is `'reopen' | 'visible' | 'online' | 'pageshow'` (`apps/web/src/app/shell/sse-client.ts` line 14).
- **F11** `apps/web/src/app/shell/device-class.ts` line 71 (`deviceClass` is a signal). `apps/web/src/app/shell/project-scope.ts` lines 75 to 85: `ActiveProjectSignal.projectId` takes its initial value from the router snapshot and updates on `NavigationEnd`.
- **F12** DECISIONS, the 2026-11-17 GRR-09 entry (line 5718): the same signal read `''` when a page was constructed, so no read was sent. This is the implementer's report, not re-checked by the planner.
- **F13** `window.confirm` precedents: `apps/web/src/app/shell/unsaved-text.ts` line 34; `apps/web/src/app/features/tool-registry/tools-list.ts` line 687; the spec spy at `apps/web/src/app/features/tool-registry/tools-actions.spec.ts` line 162. `grep -rn MatDialog apps/web/src` finds nothing.
- **F14** Lint: `eslint.config.mjs` lines 35 to 41 (web feature element and entry files) and rule R1 (a feature imports another only through its entry file). The new files import only the Shell barrel (`apps/web/src/app/shell/index.ts`) and their own feature.
- **F15** `apps/web/package.json` line 8 (`"test": "ng test --watch=false"`); `apps/web/angular.json` line 76 (builder `@angular/build:unit-test`). `shell/index.ts` exports `API_CLIENT`, `SSE_CLIENT`, `ApiError`, `ApiPath`, `ResponseSchema`, `DeviceClassService`, `ActiveProjectSignal`.
- **F16** `touchesManuscript` in `manuscript-page.ts` matches only `project.yaml`, `drafts` and paths under `drafts/`. A snapshot write touches `snapshots/` only, so the page does not refetch because of it.
- **F17** `e2e/specs/journey.e2e.ts` line 413 is `test.step('manuscript', () => pending(testInfo, 'manuscript'))`: a placeholder that CEX-20 fills. This unit changes no e2e file.
- **F18** `git status --short` is empty at `a5f0f32`; `plans/CEX-19.md` does not exist before this plan.
- **F19** A fresh worktree has no `packages/contracts/dist`, so the web specs cannot resolve the contract until it is built (DECISIONS, the 2026-11-17 GRR-09 entry, line 5718).
- **F20** DECISIONS, entry "2026-11-19 — CEX-07 — Gate rework r1" (header line 6485; the timeout bullet at line 6491): a cold clone's `npm test` timed out in `preferences-step.spec.ts` (a recorded flake, not fixed).

### 2b. Assumed (not checked by the planner)

- **A1** `npx ng test --watch=false --include <file>` runs one spec file with the `@angular/build:unit-test` builder. The implementer confirms the flag at step 3; if it differs, the implementer uses the flag the builder accepts and records it.
- **A2** Zod 4's `z.iso.datetime()` refuses offsets other than `Z` by default. K1's refused fixture depends on this. If K1 shows a different answer, the copy follows the contract, not the fixture.
- **A3** Playwright dismisses a native dialog that has no listener. This matters only for CEX-20 if it ever restores in e2e.
- **A4** The web suite passes on main, as the CEX-16 and CEX-17 gate entries record. The planner did not re-run it.

## 3. Files to change

Paths are repository-relative. Only these files change.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/compile-export/snapshot-contract.ts` | new | `SNAPSHOTS_PATH` and `SNAPSHOT_RESTORE_PATH` (type `ApiPath`); `PRE_RESTORE_LABEL` = `'pre-restore'`; `snapshotSummaryCopy` and `snapshotListCopy` (one entry guard: `id`, `label`, `createdAt` as an ISO datetime ending in `Z`, `fileCount` a non-negative integer, `words` an object or null, `unreadable` optional boolean); `isSnapshotEventData(data): data is { projectId: string }` (a non-empty `projectId`). Imports from the contract are `import type` only (D9) |
| `apps/web/src/app/features/compile-export/snapshot-contract.spec.ts` | new | K1 to K3 (section 5) |
| `apps/web/src/app/features/compile-export/snapshots-panel.ts` | new | standalone `SnapshotsPanel` (selector `app-snapshots-panel`); design below |
| `apps/web/src/app/features/compile-export/snapshots-panel.spec.ts` | new | S1 to S4 (section 5) |
| `apps/web/src/app/features/compile-export/manuscript-page.ts` | edit, three places | after line 38, `import { SnapshotsPanel } from './snapshots-panel';`; line 143, `imports` gains `SnapshotsPanel`; after line 227 (the `@if` closes), the element `<app-snapshots-panel />` in the template. Nothing else in the class changes |
| `apps/web/src/app/features/compile-export/manuscript-page.spec.ts` | edit, three places | after line 27, import `SNAPSHOTS_PATH` from `./snapshot-contract`; in `beforeEach` (lines 87 to 89) answer `GET SNAPSHOTS_PATH` with `{ snapshots: [] }`; in M4 (lines 466 to 468) the expected list becomes `['GET', 'GET']`, with a comment that the second GET is the snapshot list read (O2) |

Panel design, for the implementer:
- Injects `API_CLIENT`, `SSE_CLIENT`, `ActiveProjectSignal` (its `projectId`), `DeviceClassService` and `DestroyRef`.
- Signals: `snapshots` (undefined until the first read), `failure`, `label`. A computed `editable` is true for `tablet` and `desktop`, as in the page.
- Reads: a `Subject` with `switchMap` over `api.get(SNAPSHOTS_PATH, snapshotListCopy)`, the page's pattern. The constructor calls `reads.next()` once.
- Triggers: `events.stream('compile-export')` where the type is `snapshot-created` or `snapshot-restored`, the data passes `isSnapshotEventData`, and `data.projectId === projectId()`; and `events.reconcile$` (any reason).
- `create()`: when editable and the trimmed label is not empty, `api.post(SNAPSHOTS_PATH, { label }, snapshotSummaryCopy)`.
- `restore(row)`: when editable and `window.confirm(message)` returns true, `api.post(SNAPSHOT_RESTORE_PATH, { id: row.id }, manuscriptViewCopy)`, where `manuscriptViewCopy` comes from `./manuscript-contract`.
- Template: a `<section>` with `<h2>Snapshots</h2>`, the label input, the Snapshot button, the alert, then either the list or `No snapshots yet.`

## 4. Procedure

Run from a worktree of `unit/CEX-19`. Record the Node and npm versions beside each result (Node 26 expected, as in PLT-02).

1. Worktree and install. `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/CEX-19 -b unit/CEX-19 main`, then `npm ci` inside it. Expected: both exit 0.
2. Contracts build. `npm run build -w @bbartolome/scriba-contracts` (F19). Expected: exit 0.
3. Baseline. On the untouched tree, `cd apps/web && npx ng test --watch=false --include 'src/app/features/compile-export/*.spec.ts'` (A1). Expected: the existing page and contract specs pass; record the counts. A failure here is not CEX-19's: stop and report it.
4. Write `snapshot-contract.ts` as in section 3. Expected: the only contract imports are `import type` lines (`grep -n "scriba-contracts" <file>`).
5. Write `snapshot-contract.spec.ts` (K1 to K3). Run it alone. Expected: 3 passed. If K1 disagrees with the contract on a fixture, change the copy, not the fixture (A2).
6. Write `snapshots-panel.ts` as the design in section 3 describes. Expected: the file compiles in step 9's run.
7. Edit `manuscript-page.ts` in its three places. Expected: `git diff --stat` shows that file with a few added lines and no removed lines.
8. Edit `manuscript-page.spec.ts` in its three places (O2). Expected: its existing tests pass; only M4's list changes, to two GETs.
9. Write `snapshots-panel.spec.ts` (S1 to S4). `beforeEach` answers `GET MANUSCRIPT_PATH` with a valid view and `GET SNAPSHOTS_PATH` with an empty list, so the page's own alert does not appear. `afterEach` runs `vi.restoreAllMocks()` and `restoreMatchMedia()`. Expected: 4 passed.
10. Run the three compile-export spec files together. Expected: every test passes (K1 to K3, S1 to S4, the page spec's tests, the contract spec's K1 to K3).
11. Mutation checks, as CEX-16 did. (a) In `snapshots-panel.ts`, remove the `window.confirm` check; S1 must fail. Undo. (b) Draw the Restore button on unreadable rows too; S2 must fail. Undo. Expected: each mutation is red, and after the undo the diff holds only the intended changes.
12. Lint and format. `npm run lint -w @bbartolome/scriba-web`, then `npx prettier --check apps/web/src/app/features/compile-export`. Expected: both exit 0.
13. Build. `npm run build -w @bbartolome/scriba-web`. Expected: exit 0 with no new budget warning. The page is a lazy chunk, so the initial bundle does not change. `grep -l ZodError` over the lazy chunk that holds `app-manuscript-page` prints nothing.
14. Full web suite. `npm test -w @bbartolome/scriba-web`. Expected: all pass. A timeout in an unrelated spec is the recorded cold-clone flake (F20): rerun it, and do not change any test to make it pass. The API is unchanged, so the orchestrator's gate run (prompt.md Step 3) covers the API.
15. Commit on `unit/CEX-19` with the message `feat(CEX-19): snapshots panel on the manuscript route, restore behind confirm`. The implementer does not tick the unit's boxes; the orchestrator ticks them at merge.

## 5. Acceptance criteria and tests

Seam for all: the rendered manuscript route under Angular's Vitest runner, with the Shell's fakes (`FakeApiClient`, `FakeEventSource`) and `window.confirm` spied where a dialog is involved. The author's view and the requests on the wire are what is observed.

| Criterion (unit lines) | Test | Pass condition |
|---|---|---|
| "Restore needs confirmation; the dialog names the pre-restore snapshot." (line 20) | S1 in `snapshots-panel.spec.ts` | The list answers one readable snapshot, and the restore answers a valid manuscript view. With `window.confirm` returning false: the spy is called once, its message contains `pre-restore`, and no POST to `SNAPSHOT_RESTORE_PATH` is sent. With it returning true: exactly one POST to `SNAPSHOT_RESTORE_PATH` with body `{ id }`, equal to the row's `data-snapshot-id`. |
| "Unreadable snapshots can't be restored." (line 21) | S2 in `snapshots-panel.spec.ts` | The list answers one unreadable snapshot (`words: null`, `unreadable: true`) and one readable one. The unreadable row shows `Unreadable` and contains no button. The readable row contains a button named `Restore <id>`. No POST to `SNAPSHOT_RESTORE_PATH` is sent. |

Tests for the decisions that are not criteria (D5, D7, D8):

| Test | What it checks | Pass condition |
|---|---|---|
| S3 | create and refresh | Typing ` before-cut ` and clicking Snapshot sends one POST with `{ label: 'before-cut' }`. The list answers again with the new snapshot first, then `snapshot-created` for this project refetches it (the new row is first). `snapshot-restored` for this project refetches it. A `reconcile$` tick refetches it. A `snapshot-created` for another project does not refetch. |
| S4 | phone is read-only | At 390 by 844: the label input, the Snapshot button and each Restore button are disabled, and no POST is sent. |

Contract parity (F6, D9), in `snapshot-contract.spec.ts`:

| Test | What it checks | Pass condition |
|---|---|---|
| K1 | list copy against `snapshotListSchema` | `snapshotListCopy` accepts and refuses what the schema accepts and refuses, on fixtures: a readable row, an unreadable row, an empty list; refused: `createdAt` without a trailing `Z`, `fileCount: -1`, a row without `words`, an empty `id`, `snapshots` not a list. |
| K2 | routes and bodies | `SNAPSHOTS_PATH` equals `SNAPSHOTS_ROUTE` and `SNAPSHOT_RESTORE_PATH` equals `SNAPSHOT_RESTORE_ROUTE`; the bodies the panel sends pass `snapshotCreateRequestSchema` and `snapshotRestoreRequestSchema`. |
| K3 | event guard | `isSnapshotEventData` accepts the complete `snapshot-created` and `snapshot-restored` data that the contract schemas accept, and refuses data with an empty or missing `projectId`. |

Count: 7 new tests (S1 to S4, K1 to K3). Two of them are the criteria tests (S1, S2). One existing assertion (M4 in `manuscript-page.spec.ts`) changes, as O2 describes.

## 6. Agreement with downstream units and with other plans

- **CEX-20 (milestone gate; blocked by CEX-19).** Its criterion "CEX-16 to CEX-19 criteria pass on main" is met by S1 and S2. Its demo step 4 needs a label input and a `Snapshot` button (P4); step 8 needs a Restore control and the list to show the `pre-restore` label (P5, P6). Its e2e manuscript step checks file order and word count, and the sample's empty snapshot list does not change them. If CEX-20 or a later e2e restores through the UI, it must accept the native dialog (O1, A3).
- **CEX-16 (done; blocker).** No server change. The panel uses the routes and the restore answer as the server gives them. It never calls restore on an unreadable row, because no such button exists.
- **CEX-17 (done; blocker).** This plan edits its page file and spec in the places listed in section 3. The page's behaviour and its tests stay, apart from M4's list (O2). CEX-17's page does not take the reconcile tick; D8 is the difference (O3).
- **CEX-18 (unit only, no plan; parallel with CEX-19).** Both units add elements and imports to `manuscript-page.ts` and tests on the route. Either merge order works, because each adds its own lines and no logic is shared. Two rules for CEX-18's plan, once this merges: (a) a test on the route that asserts an exact request list must count the snapshot list read (the fact behind O2); (b) its export confirm follows the same choice as O1.
- **CEX-10 (draft).** Changes `apps/api/src/modules/compile-export/compile-export.module.ts` and the export service (`plans/CEX-10.md` line 139). CEX-19 changes no API file, so the two merge in either order.
- **GRR-15 (planned).** Changes graph-runner web files and `e2e/specs/graph-*.e2e.ts` (its file table, `plans/GRR-15.md` lines 88 to 94). No file in common.
- **CEX-15 (unit only; parallel with CEX-19).** Its unit names the export gate and the image smoke step (PLT-15, PLT-19). With no plan, the check is only on the unit: no web file in common is expected.
- **Front matter.** `parallel_with` is symmetric for CEX-15, CEX-18 and CEX-19 (F1).

## 7. Open points

1. **O1 Confirm dialog kind.** Chosen: native `window.confirm` (P2), the existing practice (F13). The alternative is an in-page Material dialog, which would change S1's seam. The Navigator decides. CEX-18's export confirm should follow the same choice.
2. **O2 M4 expectation change (CEX-17's test).** M4 asserted that the only request is `GET`. The panel's list read adds a second `GET`, so the expected list becomes `['GET', 'GET']` (section 3). CEX-17's criterion 4, "the phone viewport is read-only", still holds: any POST would still fail the test. The Navigator confirms this is not a weakening. The alternative, no list read on phone, was rejected because the list is a read, not a write.
3. **O3 Reconcile tick.** D8 makes the snapshot list re-read on the reconcile tick (`units/README.md` line 134; MPR-13's precedent). CEX-17's page takes no tick (`plans/CEX-17.md` D13 and its section 8, open point 2). Simplest: keep this unit's refresh. The Navigator decides whether the manuscript page should take the tick too. That would change CEX-17's behaviour, so this plan does not make it.
4. **O4 Module text drift.** `modules/compile-export.md` names CEX-19 as `(needs 17)` in its dependency graph, and its Parallelism line puts CEX-18 and CEX-19 after CEX-17. The unit's `blocked_by` is `[CEX-16, CEX-17]` (F1), and the README makes the unit the source of truth (F3). This plan follows the unit. Simplest: the Navigator corrects the module's graph line to `(needs 16, 17)`. The module's settled decisions are not affected.
5. **O5 Phone rule for snapshots.** Chosen: create and restore are read-only on phone, as the outline is (D7, P9). The unit and the module are silent on it. A restore allowed on phone would change the route's phone rule, which is the Navigator's decision.
6. **O6 Copy of `PRE_RESTORE_LABEL`.** Chosen: a web copy with no automatic check against `snapshot-names.ts` (P10). The alternative is to export the constant from the contract (an additive change) and import it in `snapshot-names.ts`, which touches a CEX-16 file. The Navigator decides. CEX-19 passes either way.
