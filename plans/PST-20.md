---
id: PST-20
status: draft
unit: units/PST-20-review-queue-ui.md
sources: units/PST-20-review-queue-ui.md (last changed by 098add9); units/README.md; modules/project-store.md; modules/shell.md; prompt.md (Draft); plans/PLT-02.md (structure); plans/PST-14.md and plans/PST-10.md (route, Shell and phone-test precedents); done plans read for the contract they set: plans/PST-16.md, PST-17.md, PST-19.md, SHL-12.md, SHL-16.md, SHL-07.md, AGL-14.md; planned plan read for file overlap: plans/TRG-14.md; plans/DECISIONS.md lines 941, 2557, 4084, 4864; downstream units PST-21, PST-22, PST-23, GRR-13, GRR-06, AGL-07
---
# PST-20 plan — review queue UI (route, grouped list, live events, actions, merge view)

Base: `main` at `6be7616`. Every fact in section 8a was read at that commit. Since `a870668` the only changed files are `plans/QUEUE.md` and `plans/SAU-18.md` (`git diff --name-only a870668 HEAD`), and neither names a path of this plan. The planner ran no build and no test; it only read files and ran `git log`, `git diff` and `grep`.

The unit file has no notes section. Its last change is commit `098add9` (it added GRR-13 to `unblocks`). The change records that name PST-20 are `plans/DECISIONS.md` line 4084 and `plans/SHL-16.md` lines 24 and 112. All three were read and are used below.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the contracts

- Route `/projects/:projectId/review`, project-scoped, minimum class `phone`. `?run=<runId>` limits the list to one run. Source: unit line 15; `modules/shell.md` line 62, which also says "Nav: yes".
- Grouping by origin: `agent-run` by `runId`; `recipe-run` by `runId` and `nodeId`. Source: unit line 16; `packages/contracts/src/project-store/pending.ts` lines 6 to 19 (origin union); `apps/api/src/modules/project-store/pending.service.ts` lines 71 to 77 (`sameOrigin`, the same rule on the server).
- Conflict badge; the `grounding` chip when present; `provenance` `entityIds` and `sourcesUsed` when present. Source: unit line 16. `grounding` is counts only (`pending.ts` lines 21 to 27). `provenance` is `z.looseObject({})` (`pending.ts` line 51), so its keys are read defensively.
- Each change opens in the Shell's diff view, the editable merge view. Source: unit line 17. `apps/web/src/app/shell/diff-view.ts`: selector line 231, class line 289, inputs `path`, `base`, `proposed`, `conflict`, `conflictMessage`, `editable` at lines 290 to 295, output `contentChange` at line 296 (emits the whole edited text). The merge view is on `main` (SHL-16 merged: commits `fbbedc2` and `f30dd4f`), so the unit's "adopt once Shell phase:editor lands" is met.
- Actions: accept, reject, refresh, accept-anyway with an explicit confirmation. Source: unit line 18. Routes in `packages/contracts/src/project-store/routes.ts` lines 36 to 44. Controller `apps/api/src/modules/project-store/pending.controller.ts`: list line 31, accept line 41, reject line 52, accept-anyway line 62, refresh line 74.
- Live updates from `pending-created`, `pending-updated` and `pending-resolved` for the active project. Source: unit line 19. Payload `{projectId, pendingChange}` (`packages/contracts/src/project-store/events.ts` lines 7 to 11; the three types at lines 26, 32 and 38).
- Phone: one column, unified diff by default, sticky large action buttons. Source: unit line 20. `DiffView` already picks unified on `phone` (`diff-view.ts` lines 304 to 306, `device()` at line 308).

### 1b. Settled by the module, DECISIONS and the done plans

- Route entry: one named export per owned path, here `reviewRoutes` in `project-store.routes.ts`, loaded by its own `PROJECT_ROUTES` entry. Source: `plans/DECISIONS.md` line 941 (the SHL-07 review's rule); `apps/web/src/app/app.routes.ts` line 11 ("Features append their entries here") and lines 25 to 37 (the `files` entry, which uses the same pattern).
- The route table requires a nav entry (`modules/shell.md` line 62). The label, icon and order are chosen in 1c.
- A web feature imports another feature only through its `*.routes.ts` entry file (`eslint.config.mjs` line 50, rule R1). So the review page cannot import the agent-loop grounding chip (`apps/web/src/app/features/agent-loop/grounding-chip.ts`). Source of the entry-file convention: `apps/web/src/app/features/project-store/project-store.routes.ts` line 5.
- The browser ships no runtime zod. A feature holds hand-written copies of its paths and response schemas, imports only types from the contract, and a K1 spec imports the real schema and runs the copies on the same fixtures. Source: `apps/web/src/app/features/project-store/files-contract.ts` lines 1 to 7; `files-contract.spec.ts` line 49 (K1).
- GETs never mutate; commands are POST; every request names its `projectId`; a non-active project is refused; only project-relative paths reach the UI. Source: `modules/project-store.md` lines 46, 48 and 49.
- A pending id has the form `^\d{8}T\d{9}Z-[0-9a-f]{6}$` (`apps/api/src/modules/project-store/pending-store.ts` line 17). Any other id is refused as not found (`pending.service.ts` lines 353 to 355). Test fixtures use this form.
- Accept body is optional `{content?}`. Without `content` the proposal is written; with it, the edited text is written after the validators run (`pending.ts` lines 70 to 72; `pending.controller.ts` lines 41 to 50; `pending.service.ts` lines 173 to 189 and the checks at line 409). Refresh takes no body (controller lines 73 to 74). Reject takes no body.
- A conflicted accept is refused 409 `PROJECT_PENDING_CONFLICT` with `details: {reason}` (`pending.service.ts` lines 176 to 186; codes at `errors.ts` lines 23 and 76). A validator refusal is 422 `PROJECT_VALIDATION_FAILED` (`pending.service.ts` lines 417 and 433).
- The list computes the conflict on every read (`pending.service.ts` lines 102 to 121). A `pending-updated` payload carries the conflict as stored, and the UI takes it as current until the next list (`plans/PST-16.md` line 181, D16).
- Refresh answers 200 and may carry a conflict; that is not an error (`plans/PST-17.md` line 144). Accept-anyway takes the same body as accept (`plans/PST-17.md` lines 144 and 167). The confirmation is UI only: the server has no field for it (`plans/PST-17.md` line 167).
- `?run=` filters on `origin.runId` for both origin kinds (`pending.service.ts` lines 115 to 120).
- The merge-view contract with this consumer (`plans/SHL-16.md` line 100): the consumer sends the emitted text as `content`, and when nothing was emitted it omits `content`. A line-ending-only change is visible in editable mode (`plans/DECISIONS.md` line 4864).
- The ruling of `plans/DECISIONS.md` line 4084: a criterion of a merge-view follow-up is split into a subunit only while its cause unit is not merged. SHL-16 is merged, so criterion 3 stays in PST-20 (open point 3).
- No Range stub is needed in jsdom. Commit `bff0ceb` dropped it, and `apps/web/src/app/shell/testing/` has no `dom-range.ts`. So `plans/SHL-12.md` open point 6 is void for PST-20 and this plan does not import it.
- Edit seam in jsdom: `EditorView.findFromDOM(dom).dispatch({changes})` (`apps/web/src/app/shell/diff-view-editable.spec.ts` lines 122 to 135).
- Fake seams: `FakeApiClient` (`apps/web/src/app/shell/testing/test-doubles.ts` line 43) records every request with its `params` when given; `FakeEventSource.push` (line 129) takes any project-store envelope (`plans/SHL-07.md` line 154); `createShellTestDoubles` (line 187); `stubMatchMedia` (`apps/web/src/app/shell/testing/match-media.ts` line 67).
- Route guard in tests: `plans/DECISIONS.md` line 2557 limits the `GET .../active` requirement to tests that render through `APP_ROUTES`. The PST-20 component tests render `reviewRoutes` directly, as `files-page.spec.ts` does (lines 62 to 75), so they need no guard answer.
- Phone viewport tests are Playwright at 390 by 844 (`plans/PST-14.md` S11, line 37; `e2e/specs/projects-phone.e2e.ts` line 7). The sign-in reads `.scriba/setup-url` (lines 24 to 26).
- A top-level draft accepted with a change writes its replaced text to `drafts/.versions/<name>/<UTC timestamp>.<ext>` (`modules/project-store.md` line 75).
- The nav link's accessible name is its text alone, because the icon is a `mat-icon` (`apps/web/src/app/shell/app-nav.ts` lines 154 to 166). `e2e/specs/providers-phone.e2e.ts` line 65 already selects a nav link with `exact: true`.

### 1c. Choices this plan makes (the unit leaves them open)

- **C1 Nav entry:** `{label: 'Review', icon: 'rate_review', order: 25}`. Order 25 sits between Projects (20) and Files (30); the orders are at `app.routes.ts` lines 18, 31, 70, 95, 108, 121 and 134. The icon name is an assumption (A1).
- **C2 Groups:** key `agent-run:<runId>` or `recipe-run:<runId>:<nodeId>`. Heading "Agent run <runId>" or "Recipe run <runId>, output <nodeId>". Groups appear in the order of their first change in the list, which is id order (`pending.service.ts` lines 100 to 101).
- **C3 One open change:** each row has an "Open" button (`aria-expanded`). The open change's diff and action bar appear below the list. The selection is component state, not a URL parameter.
- **C4 Texts:** `path` = `targetPath`; `base` = `capturedBase?.content ?? ''` (an empty base for a file that does not exist, as `plans/AGL-14.md` D2 has it); `proposed` = `proposed`. The `diff` string is not shown: `DiffView` draws its own diff. The page passes strings, so an unchanged text does not rebuild the editor.
- **C5 Edits:** `editable` is true for every open change. The page keeps the last emitted text per change id. Accept sends `{content}` only when an edit was emitted for that change, and `{}` otherwise. Reject and refresh send no body. An edit is dropped when the change's `proposed` changes (open point 5).
- **C6 Conflict copy:** a "Conflict" badge in the row, and by reason the message `base-changed`: "The file changed after this change was proposed."; `target-missing`: "The file this change would edit is missing."; `target-exists`: "A file already exists at this path." The same message goes to `DiffView`'s `conflictMessage`. The copy is the planner's (A2). Refresh and Accept anyway show only when `conflict` is not null. Accept and Reject show for every open change.
- **C7 Accept anyway:** pressing it opens an inline panel with `role="alertdialog"` and `aria-labelledby`. Its text says the disk content is saved first (version for a top-level draft, backup under `.scriba/backups/` otherwise; `plans/PST-17.md` line 167 and `pending.service.ts` lines 200 to 202). Buttons: "Confirm accept anyway" and "Cancel". No request is sent before Confirm. It is not a native `<dialog>`: `apps/web` has no dialog precedent (no `MatDialog`, `<dialog>` or `alertdialog` in `apps/web/src`), and jsdom's `showModal` is not checked (A3).
- **C8 Grounding chip:** a summary built in this feature from the counts: "Supported N, weak N, unsupported N", the `checkedAt` time, and a badge when `unsupported` is above 0. It is not the agent-loop chip (rule R1).
- **C9 Provenance:** `entityIds` and `sourcesUsed` are shown as lists, but only when they are arrays and only their string items. Other keys are ignored. The shapes come from `packages/contracts/src/agent-loop/provenance.ts` lines 5 to 13 and from the recipe provenance `{graphId, nodeId, entityIds, sourcesUsed}` (`units/GRR-06-output-nodes-pending-changes.md` line 25).
- **C10 Live events:** a change is kept only when `projectId` matches the active project, and, when `?run=` is set, only when `origin.runId` equals it. `pending-created` inserts; `pending-updated` replaces by id, or inserts when the id is absent; `pending-resolved` removes by id. Each action's response is applied the same way: a response whose status is not `pending` removes the row. The store is keyed by id, so a duplicate from the event and from the response is harmless.
- **C11 Reconcile:** a reconcile tick (`apps/web/src/app/shell/sse-client.ts` line 59) and a project switch re-read the list. The files page does the same (`apps/web/src/app/features/project-store/files-page.ts` lines 394 to 413).
- **C12 Busy and errors:** while a POST for a change is in flight, its buttons are disabled, so a double accept cannot reach the server (a second accept gets 409 `PROJECT_PENDING_NOT_OPEN`, `pending.service.ts` lines 343 to 361). A failed action shows the server's message (`ApiError.message`, `apps/web/src/app/shell/api-error.ts` lines 10 to 22; A4) and re-reads the list.
- **C13 Unsaved text:** while a change holds an edit that is not accepted, the page is an `UnsavedSource` registered with `UnsavedTextRegistry`. Its `flush()` returns `of(false)`, because only Accept saves an edit, so leaving the page asks the author. The `review` route gets `canDeactivate: [unsavedTextGuard]`, as the files route does (`project-store.routes.ts` line 22). The interface is `apps/web/src/app/shell/unsaved-text.ts` lines 6 to 10 and 41 to 49. Open point 2.
- **C14 Empty states:** "No open changes." and, with `?run=`, "No open changes from this run."

## 2. Files to create or change

Only these paths change. Nothing else is touched: no contract, no API file, no file under `apps/web/src/app/shell/`, no `package.json` or lockfile (the merge view and every dependency it needs are already in `apps/web/package.json` line 23), no unit, module or DECISIONS file.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/project-store/review-contract.ts` | new | Route helpers `pendingListPath(projectId)` and `pendingActionPath(projectId, id, action)`, which encode each segment and return `ApiPath`. Copies `pendingListCopy`, `pendingChangeCopy` and `pendingEventCopy` (the `{projectId, pendingChange}` data of the three events). Imports only types from `@bbartolome/scriba-contracts/project-store`. The ISO-datetime pattern is copied from `files-contract.ts` lines 23 to 27, and the hash pattern from `packages/contracts/src/project-store/files.ts` line 12 |
| `apps/web/src/app/features/project-store/review-contract.spec.ts` | new | K1: the copies accept and refuse the same fixtures as `pendingListSchema`, `pendingChangeSchema` and `pendingEventDataSchema`. K2: the path helpers equal the `PROJECT_PENDING_*` constants with the id encoded |
| `apps/web/src/app/features/project-store/review-page.ts` | new | `ReviewPage`, standalone, selector `app-review-page`. Reads `run` from `ActivatedRoute.queryParamMap`, the project from `ActiveProjectSignal.projectId()`. Holds the change list, groups, selection, edits, the accept-anyway panel and the busy set. Uses `API_CLIENT`, `SSE_CLIENT`, `UnsavedTextRegistry` and `DiffView` |
| `apps/web/src/app/features/project-store/review-page.spec.ts` | new | Tests R1 to R9 (section 4) |
| `apps/web/src/app/features/project-store/project-store.routes.ts` | edit | Adds `export const reviewRoutes: Routes` with one `''` route: `canDeactivate: [unsavedTextGuard]` and `loadComponent` for `./review-page` (`ReviewPage`). The existing exports are unchanged. The import of `unsavedTextGuard` at line 3 is reused |
| `apps/web/src/app/app.routes.ts` | edit | Adds a `review` entry to `PROJECT_ROUTES` after the `files` entry (lines 25 to 37), anchored on the text of the `files` entry. `pathMatch: 'full'`; `data: {scope: 'project', minDeviceClass: 'phone', nav: {label: 'Review', icon: 'rate_review', order: 25}} satisfies ShellRouteData`; `loadChildren` returning `feature.reviewRoutes` from `./features/project-store/project-store.routes` |
| `e2e/specs/review-phone.e2e.ts` | new | Criterion 2: Playwright at 390 by 844 (section 4) |

## 3. Procedure

Run in a worktree at `/Users/bbartolome/workspace/scriba-prototype-wt/PST-20` on branch `unit/PST-20`, created from `main` with `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/PST-20 -b unit/PST-20 main`. Record `node -v` and `npm -v` beside each result. Do not push.

1. **Baseline.** `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-web`. Expected: both exit 0. Record the number of passing tests. If the baseline fails, stop and report.
2. **Contract copies.** Write `review-contract.ts` and `review-contract.spec.ts` (section 2). Run `npm test -w @bbartolome/scriba-web -- --include apps/web/src/app/features/project-store/review-contract.spec.ts` (A5: the `--include` form works with `ng test` here). Expected: K1 and K2 pass.
3. **Page and routes.** Write `review-page.ts` with the choices of 1c. Add `reviewRoutes` to `project-store.routes.ts` and the `review` entry to `app.routes.ts`. Keep both edits anchored on text.
4. **Component tests.** Write `review-page.spec.ts` with tests R1 to R9. Render as `files-page.spec.ts` does: `provideRouter([{path: 'projects/:projectId/review', children: reviewRoutes}])`, `...createShellTestDoubles().providers`, `stubMatchMedia(1280, 800)` for the desktop split layout, and `RouterTestingHarness.create(url)` with `?run=` in the URL where a test needs it. Fixtures are built in the spec (never from `examples/`), with `HASH = sha256:` plus 64 `a` characters, as `files-page.spec.ts` line 26 has it. Expected: R1 to R9 pass. Run the whole web suite: no earlier test changes.
5. **Mutation checks.** Each mutation is made, its test run, and the change reverted. M1: drop `params: {run}` from the GET; expected R2 fails. M2: send `{}` after an edit; expected R7 fails. M3: ignore `pending-resolved`; expected R3 fails. M4: send `accept-anyway` on the first click; expected R6 fails. M5: keep events of other projects; expected R3 fails. Record each failing test name.
6. **Phone e2e.** Write `e2e/specs/review-phone.e2e.ts` (section 4, criterion 2). Run `npm run e2e -w @bbartolome/scriba-e2e -- review-phone.e2e.ts`. Expected: 1 passed. Then `npm run e2e` (all specs). Expected: exit 0. The phone-toolbar check (`phone-toolbar.e2e.ts` lines 20 to 21) must still pass with the one extra nav link.
7. **Format, lint, build.** `npx prettier --write apps/web/src/app/features/project-store apps/web/src/app/app.routes.ts e2e/specs/review-phone.e2e.ts`. Then `npm run lint` at the root (expected: exit 0, ending with "All matched files use Prettier code style!"). Then `npm run build -w @bbartolome/scriba-web` (expected: exit 0). Lazy-chunk check: `grep -l "ReviewPage"` over the built JavaScript (the output directory is `apps/web/dist`, A6) must list at least one file, and none whose name starts with `main`. An empty list passes trivially, so it must be non-empty.
8. **Root gates.** `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0.
9. **Commit.** `git add` by name the section 2 paths only, then one commit on `unit/PST-20`: `feat(PST-20): review queue route, grouped list, live events and actions`. No squash, and no other commit in this step.

## 4. Acceptance criteria and tests

Criterion 1 is a set of six behaviours. Each has its own test, so each is checked on its own.

| Criterion (unit line) | Test, file and seam | Command | Pass condition |
|---|---|---|---|
| 23: component tests, grouping by run | R1, `review-page.spec.ts`. Fake API: `respond('GET', LIST, …)` with three changes (two `agent-run` with `runId` `r1`, one `recipe-run` with `runId` `r2` and `nodeId` `n1`) | `npm test -w @bbartolome/scriba-web` | Two `h3` group headings, in that order, with the right change under each |
| 23: `?run=` filter | R2, same file. `RouterTestingHarness.create('/projects/p1/review?run=r1')` | same | The recorded GET has `params: {run: 'r1'}`; without `?run=` the GET has no `params`; a `pending-created` for `r2` adds no row |
| 23: live insertion, update and removal | R3, same file. `FakeEventSource.push` of `pending-created` (r1), `pending-updated` (same id, new `grounding.unsupported`), `pending-resolved` (status `accepted`), and one event with `projectId` `p2` | same | Row count after each push: 1, 1 (text changed), 0; the `p2` event changes nothing |
| 23: conflict badge | R4, same file | same | A change with `conflict: {reason: 'base-changed', …}` shows "Conflict" and its message; `conflict: null` shows neither; a `pending-updated` that sets a conflict shows the badge at once |
| 23: refresh flow | R5, same file | same | Refresh sends POST `…/pending/<id>/refresh` with no body. A response with the conflict kept keeps the badge; a second response with `conflict: null` removes it |
| 23: accept-anyway flow | R6, same file | same | "Accept anyway" shows the alertdialog and sends no POST; "Cancel" hides it and sends no POST; "Confirm accept anyway" sends POST `…/accept-anyway` with `{}`, and an `accepted` response removes the row |
| 23: reject and accept | R8, same file (it supports criterion 1's actions, unit line 18) | same | Reject sends POST `…/reject` with no body and removes the row; Accept on an unedited change sends `{}` and removes the row |
| 23: reconcile (decision C11) | R9, same file. `FakeEventSource.tick('reopen')` | same | The list GET is sent a second time |
| 24: narrow (phone) viewport test: list, diff, accept and reject | `e2e/specs/review-phone.e2e.ts`, Playwright at 390 by 844 (`test.use`, as `projects-phone.e2e.ts` line 7) | `npm run e2e -w @bbartolome/scriba-e2e -- review-phone.e2e.ts` | 1 passed. Steps: sign in as `projects-phone.e2e.ts` does; write project `phone-review` (`project.yaml` with `schemaVersion: 1`, `title`, `genrePack: nonfiction`), `drafts/ch1.md` and `drafts/ch2.md`, and `.scriba/pending/<id>.json` for each (valid `pendingChangeSchema`, `capturedBase.hash` computed with `node:crypto` from the file bytes); Switch to it on `/projects`; open "Review" from the bottom nav (exact name); two rows listed; Open change 1: the layout toggle's "Unified" button is pressed (A7); "Accept" (exact) removes the row, `drafts/ch1.md` equals the proposal, and a file exists under `drafts/.versions/ch1.md/`; Open change 2 and "Reject" (exact) removes the row, `drafts/ch2.md` is unchanged; `document.documentElement.scrollWidth` is at most `innerWidth` (the `phone-toolbar.e2e.ts` pattern); each button is in the viewport (`expectReachable`, defined at `projects-phone.e2e.ts` lines 10 to 14 and used from line 49) |
| 25: with the merge view present, edited text is sent as `content` | R7, `review-page.spec.ts`. Edit: `EditorView.findFromDOM(proposed side).dispatch({changes: {from: 0, insert: 'X'}})`, the seam of `diff-view-editable.spec.ts` lines 122 to 135 | same | Accept sends POST `…/accept` with `{content: <whole edited text>}`; a second, unedited change sends `{}` with no `content` key |

Contract copies (not a criterion, but required): K1 and K2 in `review-contract.spec.ts` (step 2).

## 5. Downstream agreement

- **PST-22, the review gate** (unit line 7 names PST-20; checklist line 24 "Review queue works at phone width"; demo steps 1 to 3, lines 30 to 32). PST-22 needs the route, the list with conflicts, accept, refresh and reject, and the three events. PST-20 provides all of them, and the phone e2e (criterion 2) is the checklist item. PST-22's accept-change step is Platform's e2e (PLT-13), not this unit's. PST-20 does not close `phase:pending-review`; PST-22 does.
- **GRR-13, the graph-runner run UI** (its unit line 7 names "Project store review route (PST-20)"; line 21 links output nodes to `/projects/:projectId/review?run=<runId>`). The URL is used exactly: path `review` under `projects/:projectId`, query key `run`. GRR-13 imports nothing from PST-20 (rule R1), so the route is the only contract. For a recipe run, `?run=` returns every output node's changes of that run (origin `recipe-run` has `runId` too). Open point 4.
- **AGL-07 and AGL-14, the agent chat link** (`units/AGL-07-chat-panel-ui.md` line 23; `apps/web/src/app/features/agent-loop/chat-page.ts` lines 394 to 395 and 512 to 517 build `<a href>` to `/projects/<project>/review?run=<run>` while a change of the run is open). On `main` that link leads to the not-found page (`plans/AGL-14.md` line 108). After this unit it works. No change in `chat-page.ts`.
- **SHL-12 and SHL-16, the diff view.** PST-20 uses `DiffView`'s inputs and `contentChange` as shipped. The line-ending-only mark in editable mode (`plans/DECISIONS.md` line 4864) is visible in the queue, as recorded there. No change in `apps/web/src/app/shell/`.
- **PST-16, PST-17 (plans lines 181, 144, 167).** The consumer behaviour of section 1b is agreed: accept body `{content?}` or no body; refresh and reject with no body; conflicts from `pending-updated` are taken as current; accept-anyway is a separate POST, and the confirmation is the UI's.
- **PST-19, the watcher** (`plans/PST-19.md` line 75). PST-19 is done, and it publishes the `pending-updated` events that this page takes. No dependency in either direction.
- **PST-21, the version history** (no plan; unit line 19). It shares `DiffView` and `project-store` but no file with this plan: it edits `files-page.ts`, and it needs no route.
- **Unit front matter.** The `blocked_by` and `unblocks` edges that name PST-20 are consistent: PST-16 and PST-17 name it in `unblocks`, SHL-12 names it in `unblocks`, PST-22 and GRR-13 name it in `blocked_by`. The planner checked each: PST-16 unit line 9, PST-17 unit line 9, SHL-12 unit line 9, PST-22 unit line 7, GRR-13 unit line 7.

## 6. Changes of other draft and planned plans to the same files

- Draft and planned plans on `main` at `6be7616`: `plans/TRG-14.md` (status planned) and `plans/SAU-18.md` (status planned). `plans/QUEUE.md` line 15 shows PST-20 as available, and line 84 says a planner was writing its plan.
- **TRG-14** changes `apps/web/src/app/features/tool-registry/*`, `apps/web/src/app/features/tool-registry/tool-registry.routes.ts`, `apps/web/package.json`, `package-lock.json` and `e2e/specs/tools-editor.e2e.ts` (its file table, `plans/TRG-14.md` lines 97 to 110). It changes none of this plan's files. It adds dependencies to `apps/web/package.json`; this plan adds none. Either merge order is correct, and no rebase is needed.
- **SAU-18** changes the API side only (`apps/api/...`, its plan lines 10 and 16 to 57). It names no path of this plan. Either order is correct.
- **Merged plans that changed `app.routes.ts`:** AGL-07 and SAU-06 (both done). `plans/AGL-07.md` line 79 says the project-scoped units that come later also append to `PROJECT_ROUTES`, and that the same rebase rule applies: each edit is anchored on text, so the second one to merge rebases with no conflict. This plan's edit is anchored on the `files` entry text, so it holds in any order.
- **Units with no plan:** PST-21 (`files-page.ts` only), PST-22 (no code), GRR-13 (graph-runner feature, no shared file). None changes a file of this plan.

## 7. Open points

1. **Nav entry on phone.** The route table requires a nav entry (`modules/shell.md` line 62), and the choice is C1. The bottom nav then has one more item at 390 px. Each link takes `flex: 1 1 0` (`app-nav.ts` line 132), so the labels may crowd. The phone e2e checks reachability and no sideways scroll. If it fails, a Shell change is needed, and that is outside this unit. Reviewer decides the label, icon and order.
2. **Unsaved text.** Default: C13 (the page registers, `flush()` returns `of(false)`, and leaving asks). Alternative: no registration, which loses an unaccepted edit silently. Reviewer decides.
3. **Blocker edge for criterion 3.** Criterion 3 uses the editable `DiffView` from SHL-16, which is on `main`. But PST-20's `blocked_by` (unit line 7) does not name SHL-16, and SHL-16's `unblocks` does not name PST-20 (`units/SHL-16-editable-merge-view.md` line 9). The DECISIONS line 4084 split is not needed, because the cause is merged. The edge should be written into the unit by a unit reviser. This plan changes no unit file, and its correctness does not depend on the edge.
4. **Node-level link.** GRR-13's output-node link (unit line 21) carries only `runId`, so the page shows every output node of that recipe run. A node filter would be a change to PST-20 that the GRR-13 reviser would have to ask for.
5. **Edits when the proposal changes.** A live update or a refresh that changes `proposed` rebuilds the view and drops the author's unaccepted edit (C5). The alternative keeps the edit and shows both texts. Reviewer decides.
6. **Accept-anyway dialog.** Default: the inline `role="alertdialog"` (C7). A native `<dialog>` would need jsdom's `showModal`, which is not checked (A3).
7. **Phone fixture.** Default: the e2e writes `.scriba/pending/<id>.json` directly, which is deterministic. `propose` is in-process only (`pending.ts` line 74: "It is not an HTTP route"), so driving the agent through the mock model is the other option, and it is slower. Reviewer decides.
8. **Grounding chip.** Default: a count summary (C8), because `grounding` holds counts only (`pending.ts` lines 21 to 27). Reviewer confirms the summary is what the unit means by "grounding chip".
9. **Criterion 1 granularity.** Criterion 1 is one checklist item with six behaviours. This plan gives each its own test (R1 to R6, plus R8 and R9), so the unit's "one test per criterion" rule holds per behaviour. Reviewer confirms that reading.

## 8. Facts checked and assumed

### 8a. Checked (on `main` at `6be7616`, by reading and `grep`)

- Unit `units/PST-20-review-queue-ui.md`: front matter lines 2 to 9; decisions lines 15 to 20; criteria lines 23 to 25. Last change `098add9`.
- `units/PST-22-review-gate.md` lines 7, 24, 30 to 32. `units/GRR-13-run-controls-status.md` lines 7, 21, 24. `units/AGL-07-chat-panel-ui.md` line 23. `units/GRR-06-output-nodes-pending-changes.md` line 25. `units/README.md` lines 62 to 64 (blocker rules) and 96 to 100 (phase table).
- `modules/project-store.md` lines 46, 48, 49, 75, 82. `modules/shell.md` line 62.
- `plans/DECISIONS.md` lines 941, 2557, 4084, 4864 (grep for PST-20, PST-21, PST-22; no other entry names PST-20 as a unit change).
- Contracts: `packages/contracts/src/project-store/pending.ts` (origin 6 to 19, grounding 21, conflict 29, status 34, change 37, provenance 51, list query 60, decision 70 to 72, propose comment 74 to 75); `routes.ts` 36 to 44; `events.ts` 7 to 11 and 26, 32, 38; `errors.ts` 23, 76 to 78; `files.ts` 6 and 12; `packages/contracts/src/agent-loop/provenance.ts` 5 to 13.
- API: `pending.controller.ts` 31, 41, 52, 62, 74; `pending.service.ts` 102 to 121 (list and run filter), 171 to 189 (accept), 203 (accept anyway), 258 (reject), 277 (refresh), 176 to 186 (conflict refusal), 343 to 361 (open-change lookup and not-open), 353 to 355 (id form), 409 (`checkContent`), 417 and 433 (validation refusals), 71 to 77 (`sameOrigin`); `pending-store.ts` 17 (id pattern) and 26 (folder `.scriba/pending`).
- Shell and web: `apps/web/src/app/app.routes.ts` 11, 18, 25 to 37, 60 to 62, orders at 18, 31, 70, 95, 108, 121, 134; `project-store.routes.ts` 3, 7, 18 to 24 (files route, `canDeactivate` at line 22), 28 (`ActiveProjectNav` export); `files-page.ts` 260, 282, 394, 409; `files-contract.ts` 1 to 7 and 23 to 27; `files-contract.spec.ts` 49; `diff-view.ts` 231, 289 to 296, 301, 304 to 308; `shell/index.ts` 13; `api-client.ts` 25 and 30 (interface), 61 and 75 (HTTP client); `api-error.ts` 10 to 22; `sse-client.ts` 38, 59, 78; `device-class.ts` 57, 71; `unsaved-text.ts` 6 to 10, 15, 41 to 49; `app-nav.ts` 132 (`nav.bottom a`), 154 to 166 (`mat-icon` and the label); `testing/test-doubles.ts` 43, 110, 129, 187; `testing/match-media.ts` 67; `diff-view-editable.spec.ts` 122, 132 to 135; `apps/web/package.json` 23 (`@codemirror/merge`).
- `apps/web/src/app/features/agent-loop/chat-page.ts` 394 to 395 and 512 to 517 (the review link); `grounding-chip.ts` lives in the agent-loop feature (its import is not allowed here).
- `eslint.config.mjs` line 50 (rule R1), line 69 (rule R2, not relevant here).
- E2E: `e2e/specs/projects-phone.e2e.ts` 7 (viewport), 10 to 14 (`expectReachable`), 24 to 26 (sign-in), 49 (first use); `phone-toolbar.e2e.ts` 20 to 21 (`scrollWidth`, `innerWidth`); `providers-phone.e2e.ts` 65 (exact nav link name).
- Done plans and their facts: `plans/PST-16.md` 181 (consumer contract, D16); `plans/PST-17.md` 144, 167; `plans/PST-19.md` 75; `plans/PST-14.md` 37 (S11), 52 (P10, contract copies in a new file); `plans/PST-10.md`; `plans/SHL-07.md` 154; `plans/SHL-12.md` 81 (jsdom seam), 250 and 266 (the PST-20 consumer lines and the Range stub, void); `plans/SHL-16.md` 24 (D14), 100, 112; `plans/AGL-14.md` 16 (empty base), 108 (the route is not on main); `plans/AGL-07.md` 79 (rebase rule for `PROJECT_ROUTES`).
- Planned plans: `plans/TRG-14.md` file table lines 97 to 110 and the "Only the paths below change" line 95; `plans/SAU-18.md` (API paths only).
- Git: `098add9` (last change of the unit file); `bff0ceb` (Range stub dropped); `fbbedc2` and `f30dd4f` (SHL-16 merged); commits of PST-16, PST-17 and PST-19 are on `main` (`git log main --grep`); `a870668..HEAD` changes only `plans/QUEUE.md` and `plans/SAU-18.md`.

### 8b. Assumed (A)

- **A1.** The Material Symbols name `rate_review` exists in the icon font the Shell loads.
- **A2.** The conflict copy of C6 is acceptable to the reviewer (it is the planner's wording, not the API's).
- **A3.** jsdom 30.1.3 does not implement `HTMLDialogElement.showModal` (not verified; the plan avoids it either way).
- **A4.** `ApiError.message` carries the server's message text (the Shell's `api-error.ts` takes it from the body; not read end to end).
- **A5.** `ng test --include <path>` works with this Angular version. The plan's command depends on it.
- **A6.** The web build output is `apps/web/dist`, and chunk file names differ from the `main` chunk (the check greps the file contents).
- **A7.** The Shell's `mat-button-toggle` for the layout sets `aria-pressed` on the pressed button (not read in the Material source).

Not checked: whether the Playwright harness runs in the implementer's environment (the PST-14 plan records the same gap as its A6); how the bottom nav renders with eight items at 390 px (not measured); whether `activeProjectGuard` behaves as assumed in the e2e when the project was switched in the same session (not read end to end); and whether a `pending-updated` payload always carries the full change (read from `pending.service.ts` lines 367 to 381 and `events.ts` only).
