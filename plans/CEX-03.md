---
id: CEX-03
status: draft
---
# CEX-03 plan — reorder, status and part writes with revision checks and full materialisation

Revision 1, draft, written by the planner at main `77eb7f4` (the commit read; the tree was clean). Unit: `units/CEX-03-order-writes.md` (module compile-export, phase:assembly-preflight, M5; `blocked_by: [CEX-02]`, which is merged at `05c582f` and `done`). The plan changes no criterion, no module file and no unit file, and marks nothing passed. Section 6 has two open points that decide what a write may do to the module's leading-block decision. The implementer must not start the graph rule until both are settled.

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the module, the contract and CEX-02

- **Routes and bodies.** `POST` reorder `{revision, front, body, back}` (`MANUSCRIPT_REORDER_ROUTE`), `POST` status `{revision, path, status}` (`MANUSCRIPT_STATUS_ROUTE`), `POST` part `{revision, path, part}` (`MANUSCRIPT_PART_ROUTE`). Bodies are the contract schemas. Sources: unit line 18; module line 40; `packages/contracts/src/compile-export/routes.ts` lines 6, 9, 12; `order.ts` lines 62, 70, 77.
- **Stale revision.** A `revision` that is not the current one gives `COMPILE_ORDER_CONFLICT` (409) and writes nothing. Sources: unit line 19; `errors.ts` line 39.
- **Revision scope.** The revision is the hash of the order value and the set of manuscript files (CEX-02 unit line 32; CEX-02 plan P19). A hand edit that changes neither (a comment, or the `export` key) is not a conflict. Story-graph edits are not in it either (CEX-02 plan section 7, point 2).
- **Permutation.** Each list must hold, once each, exactly the current files of its part; otherwise `COMPILE_INVALID_REORDER` (422). Source: unit line 20.
- **Graph-ordered files.** Moving them relative to one another is `COMPILE_GRAPH_ORDERED_MOVE` (422). The exact rule is open (OP-1). Sources: unit line 20; criterion 3.
- **Full materialisation.** Every write writes one entry for every current manuscript file, in effective order (front, body, back), and drops entries for missing files. Sources: unit line 21; module line 50; CEX-02 plan P20.
- **Only the `order` key.** Written through `FilesService.updateProjectYaml` (`apps/api/src/modules/project-store/files.service.ts` line 402). Sources: unit line 22; module line 41. The store keeps comments, key order and other keys (its test U1, `apps/api/test/project-store-files-helpers.test.ts` line 105).
- **Event.** `manuscript-updated` with data `{projectId, revision}` (`packages/contracts/src/compile-export/events.ts` lines 9 to 12), published after every successful write. Sources: unit line 23; module line 44; CEX-01 unit line 25.
- **Where status and part live.** On order entries, not in front matter (module line 49). The graph-ordered block leads the body; only `order` edges count, from all graphs (module lines 47 and 48).
- **No side effects beyond the write.** No model call, no graph run, no read or write of `drafts/.versions/` (module line 42). Membership is the top-level `.md` files of `drafts/` (module line 43).
- **Error codes.** `COMPILE_` prefix (`units/README.md` line 133). The codes are in `errors.ts` lines 5 to 16, with statuses in lines 38 to 49.
- **Out of scope.** Agent-initiated reorder (it must become a pending change, module line 74); reordering scenes inside a file (module line 65).
- **Testing.** External behaviour only: HTTP, files on disk; a temp library per test; no reads of `examples/` (module lines 58 and 59; CEX-02 plan section 5).

No DECISIONS entry names CEX-03. The CEX-02 approval (`plans/DECISIONS.md` lines 5862 to 5876) gives blocker status only.

### 1b. Planner's choices (the simplest option the sources allow)

- **P1 Files.** Two new files: `order-write.ts` (pure helpers) and `manuscript-write.service.ts` (`ManuscriptWriteService`). The controller and the module are edited. CEX-02's `manuscript.service.ts` is not edited.
- **P2 Current state.** The write service reads `ManuscriptService.view()`: its entries (path, part, status, graphOrdered) in effective order, and its `revision`. There is no second read path. Source: CEX-02 plan P19, P24 and section 6 (CEX-03 consumes the view).
- **P3 Active project.** The write service reads `ProjectStoreService.activeId()` and refuses a null id with the same `PROJECT_NO_ACTIVE` refusal as CEX-02 P6. It does not call the view's private helper, so CEX-02's file stays unchanged.
- **P4 Order of checks.** (1) Body shape: 400 through `ZodValidationPipe`, as `graphs.controller.ts` line 44. (2) Revision: 409. (3) Content: 422 for a reorder; 404 for a status or part path that is not a current manuscript file. (4) The graph rule. (5) Write, publish, respond. A stale request is a conflict whatever its content.
- **P5 Permutation test.** For each part, the sorted requested list equals the sorted current list of that part. Duplicates, missing files, extra paths and cross-part moves all fail it.
- **P6 Unknown path.** A status or part request for a path that is not a current manuscript file gets `PROJECT_NOT_FOUND` (404) with a fixed message. The store uses the same code for a missing file (`files.service.ts` line 141). No `COMPILE_` code fits, and a new one would be a contract change this unit does not list.
- **P7 Materialised entry.** `{path}`, plus `status` when it is not `draft` and `part` when it is not `body` (defaults in `constants.ts` lines 32 and 33). Entries are written in the order front, body, back. Reason: CEX-02 P9 says defaults are applied in the view and never written.
- **P8 Parts and positions.** A reorder never changes a part, because each list must equal the current files of its part. A part change moves the file to the end of its new part's list. A status change keeps every position.
- **P9 Status on graph-ordered files.** Allowed, since a status change moves nothing. Part changes of graph-ordered files are OP-2.
- **P10 Response.** `200` with the new `ManuscriptView` (`order.ts` line 53). Command POSTs return 200 (`@HttpCode(200)`, `graphs.controller.ts` lines 50, 56, 62). No contract change.
- **P11 Write and event.** One `updateProjectYaml(projectId, {order})` call. The store checks the result before it writes (`files.service.ts` lines 532 to 543) and publishes its own `files-changed` (line 547). Then `manuscript-updated` is published with the revision of a second `view()` call. Nothing is published on refusal. A write that changes nothing still writes and publishes.
- **P12 Messages.** Fixed strings; no input value is echoed (as CEX-02's `manuscript.service.ts` lines 33 to 35).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/order-write.ts` | new | Pure helpers, no I/O: `partsOf(entries)` groups view entries into `{front, body, back}` path lists; `samePerPart(current, requested)` (P5); `movePart(lists, path, part)` (P8); `materialise(entries)` (P7). `keepsGraphOrder` is added only when OP-1 is settled. |
| `apps/api/src/modules/compile-export/manuscript-write.service.ts` | new | `ManuscriptWriteService` with `reorder(request)`, `setStatus(request)`, `setPart(request)`. Each runs P3, P4 and P11 and returns the new view. The three share one private `commit(projectId, entries)`. |
| `apps/api/src/modules/compile-export/manuscript.controller.ts` | edit | Three `@Post` handlers with `@HttpCode(200)` and `ZodValidationPipe` on the matching contract schema. The constructor gains `ManuscriptWriteService`. The GET is unchanged. |
| `apps/api/src/modules/compile-export/compile-export.module.ts` | edit | `ManuscriptWriteService` is added to `providers`. `exports` is unchanged. |
| `apps/api/test/compile-export-order.test.ts` | new | Four tests, C1 to C4 (section 4). |

Imports: request and view schemas, route constants, `COMPILE_ERROR_CODES`, `COMPILE_ERROR_STATUS`, `MANUSCRIPT_STATUS_DEFAULT`, `MANUSCRIPT_PART_DEFAULT` from `@bbartolome/scriba-contracts/compile-export`; `PROJECT_ERROR_CODES`, `PROJECT_ERROR_STATUS` from `@bbartolome/scriba-contracts/project-store`; `ModuleError`, `ZodValidationPipe`, `EventsPublisher` from `../platform/platform.module`; `FilesService`, `ProjectStoreService` from `../project-store/project-store.module`; `ManuscriptService` from `./manuscript.service`. Only entry files are imported across modules (eslint rule R1, `eslint.config.mjs` lines 40 and 50).

Not changed: `manuscript.service.ts` (CEX-02); `packages/contracts/**` (no contract change); `apps/api/src/app.module.ts` (CEX-02 registered the module); `apps/api/test/invariant-sweep.ts` (the new routes have no `:` parameter, so the sweeps need no fixture entry); `apps/api/test/compile-export-manuscript.kit.ts` (its exports are reused, not edited); `files.service.ts`; `apps/web/**`; `e2e/**`; `examples/**`; `units/**`; `modules/**`; `plans/**` except this file.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/CEX-03`, created from main. Record `node -v` (Node 26; root `package.json` lines 11 to 13) and `npm -v` beside each result. Do not push and do not open a pull request.

0. **Preconditions.** `git status` is clean. `git diff --name-only 77eb7f4 -- apps/api/src/modules/compile-export packages/contracts/src/compile-export apps/api/test` prints nothing. If it prints anything, re-read this plan against the change before going on. OP-1 and OP-2 are settled and recorded in this file.
1. `git switch -c unit/CEX-03`. Expected: `Switched to a new branch 'unit/CEX-03'`.
2. `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
3. Write `order-write.ts` (P5, P7, P8; `keepsGraphOrder` per OP-1).
4. Write `manuscript-write.service.ts` (P1 to P4, P10 to P12).
5. Edit `manuscript.controller.ts` and `compile-export.module.ts`.
6. Write `compile-export-order.test.ts` (section 4). Every POST sends the session cookie, `origin: LOOPBACK_ORIGIN` and a JSON body. Without an Origin the guard answers 403 (`invariant-sweep.ts` lines 707 onward).
7. Verify, in this order:
   - (a) `cd apps/api && npx vitest run test/compile-export-order.test.ts`: four pass.
   - (b) `cd apps/api && npx vitest run test/compile-export-manuscript.test.ts`: CEX-02's six still pass.
   - (c) `npm test -w @bbartolome/scriba-api`: build and the whole API suite, including the Setup & auth sweeps over the new routes.
   - (d) `npm run lint -w @bbartolome/scriba-api`: eslint, including the PLT-09 boundaries.
   - (e) From the root: `npm run build`, `npm test`, `npm run lint`. Each exits 0.
   - Stop rule: if C2's byte check fails, the store rewrote text outside `order`. Stop and report. Do not splice the file by hand, because writes go through `updateProjectYaml` (module line 41).
8. Tick the four boxes in `units/CEX-03-order-writes.md` (lines 26 to 29) only when step 7 passes, and set this plan's status to `done`.
9. Commit on `unit/CEX-03`. Name each path: `git add -- <path>` for each path of section 2, then `git commit -m "feat(CEX-03): reorder, status and part writes with revision checks"`. Never `git add -A` or `git commit -a`.

## 4. Acceptance criteria and tests

The four criteria are unit lines 26 to 29. Each has one test in `apps/api/test/compile-export-order.test.ts`. The test uses `manuscriptLibrary`, `withManuscript`, `getManuscript`, `manuscriptOf` and `storyGraph` from `compile-export-manuscript.kit.ts` (exports at lines 20, 48, 70, 79 and 85); `send` (`guard-request.ts`, options lines 7 to 18, function line 27); and `observeEvents`, `EVENT_WAIT_MS`, `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` (`invariant-sweep.ts` lines 412, 208, 38 and 39). Files are read from the temp library with `readFileSync`.

The observer is opened before the POST and read with `take(EVENT_WAIT_MS)` after it. It keeps events whose `module` is `compile-export` and `type` is `manuscript-updated`, and reads their `data` as `{projectId, revision}`.

| Criterion | Test | Fixture | Expected |
|---|---|---|---|
| 1. Reordering with a stale `revision` returns a conflict and leaves `project.yaml` byte-identical. | C1 | `project.yaml` with `order` for `drafts/a.md` and `drafts/b.md`; files `a`, `b`, `c`. GET gives r0. The test then hand-edits `project.yaml` on disk, adding `status: final` under `b`. The order changes, so the revision changes. | POST reorder `{revision: r0, front: [], body: [b, a, c], back: []}` gives 409 with `error.code` `COMPILE_ORDER_CONFLICT`. The file bytes equal the hand-edited text, and no `manuscript-updated` is observed. A GET then gives r1, and the same body with r1 gives 200, so the refusal was the revision alone. |
| 2. A valid reorder writes every file's entry and keeps comments and other keys byte-identical. | C2 | `project.yaml` as below, with files `a`, `b`, `c`, `z`. `z` is `part: back`. There is no file for `gone`. | POST reorder with body `[c, b, a]` and back `[z]` gives 200. The view's paths are `c, b, a, z`. The file text starts with its text up to and including the `# Manuscript order.` line, and ends with its text from the `# Model choice.` line. The parsed `order` is exactly `[{path: c}, {path: b, status: final}, {path: a}, {path: z, part: back}]`, so the stale `gone` entry is gone. One `manuscript-updated` is observed, with the response's revision. |
| 3. Moving graph-ordered files relative to each other is refused; a non-permutation is refused. | C3 | Files `a`, `b`, `c`; no `order` key; `graphs/plot.json` from `storyGraph` with nodes `c1` (`drafts/c.md`), `b1` (`drafts/b.md`), `a1` (`drafts/a.md`) and edge `c1` to `b1`, relation `order`. View order `c, b, a`. | (a) Body `[b, c, a]` gives 422 `COMPILE_GRAPH_ORDERED_MOVE`, and this is refused under both options of OP-1. (b) Four requests, each 422 `COMPILE_INVALID_REORDER`: body `[c, b, a, a]`; body `[c, b]`; body `[c, b, a, drafts/x.md]` (x is not a member); front `[a]` with body `[c, b]`. In every case the file bytes are unchanged and nothing is published. |
| 4. Status and part writes materialise the full order; `manuscript-updated` is published after each. | C4 | `project.yaml` with no `order` key; files `a`, `b`, `c`, `d`. View order `a, b, c, d`. | (a) POST status `{r0, drafts/c.md, final}` gives 200. The file gains `order` `[a, b, {c, status final}, d]`, and one event carries the new revision. (b) POST part `{r1, drafts/d.md, front}` gives 200. `order` is `[{d, part front}, a, b, {c, status final}]`, and one event is observed. (c) POST status for `drafts/gone.md` with the current revision gives 404 `PROJECT_NOT_FOUND`, and no event. |

The `project.yaml` text of C2 is the fixture; the test writes it exactly:

```yaml
# The book record.
schemaVersion: 1
title: Book # working title
genrePack: nonfiction
export:
  author: A. Writer # byline
# Manuscript order.
order:
  - path: drafts/b.md
    status: final
  - path: drafts/gone.md
# Model choice.
model:
  providerId: test-provider
  model: test-value
```

## 5. Downstream agreement and other plans

- **CEX-14 (blocked by CEX-03).** Its export-settings write `{revision, settings}` should refuse a stale revision with the same code and check (P4). For CEX-14's planner: the revision covers order and files only (CEX-02 plan P19), so a stale edit of the `export` key is not caught by it. CEX-14 unit line 15 asks for "revision conflicts as in CEX-03". That gap is for CEX-14 to settle; this plan changes nothing there.
- **CEX-16 (blocked by CEX-03).** Its restore writes the manifest's `order` into `project.yaml` (CEX-16 unit line 21, step 4). That is a full materialisation, so it may import `materialise` from `order-write.ts`. The import is within one module and does not touch rule R1. Its snapshot `order` and statuses come from `ManuscriptService.view()` (CEX-16 unit line 18). Its restore also publishes `manuscript-updated` (unit line 21, step 5).
- **CEX-17 (parallel; UI).** Its drag sends the reorder with the current revision, and a 409 shows the reload prompt (unit line 20). The success body is `manuscriptViewSchema` (P10), so the UI needs no second GET. Its unit line 14 says "merges once CEX-03 is in", but its `blocked_by` (line 7) does not name CEX-03, and the README says `blocked_by` is the source of truth. That mismatch is for CEX-17's owner to fix. This plan changes nothing there.
- **CEX-04 and CEX-05 (parallel; API).** Both add providers or controllers to `compile-export.module.ts`. On a merge conflict, keep both entries, as CEX-02 plan section 6 does for `app.module.ts`. Neither touches `order-write.ts` or the write service.
- **CEX-08 (parallel).** Its `order` entries must pass `orderEntrySchema` (`order-export.ts` lines 26 to 30). P7 writes only valid entries.
- **CEX-09 (gate).** Its first criterion requires CEX-03's criteria on main. The four tests in section 4 are that check.
- **Other plans with status draft or planned.** `plans/GRR-13.md` and `plans/TRG-17.md` are the only ones (`grep -l -E "^status: *(draft|planned)" plans/*.md`). Neither names a compile-export, `app.module.ts`, `files.service.ts`, `invariant-sweep.ts` or compile-export contract path. The branches `unit/GRR-13` and `unit/TRG-17` have no such path in `git diff --name-only main...<branch>`, so there is no overlap in either merge order. The branches `unit/TRG-14` and `unit/GRR-11` (both `done`) have no overlap either.
- **Blocker consistency.** CEX-03's `blocked_by` (CEX-02), `unblocks` (CEX-09, CEX-14, CEX-16) and `parallel_with` (CEX-04, CEX-05, CEX-17) are the exact inverses of the other units' entries (CEX-02 line 9; CEX-09 line 7; CEX-14 line 7; CEX-16 line 7; CEX-04 line 8; CEX-05 line 8; CEX-17 line 8). `plans/QUEUE.md` line 5 lists CEX-03 as available.
- **Merge order.** This plan uses only code on main (CEX-02 merged at `05c582f`). It works in either order with CEX-04, CEX-05, CEX-08 and CEX-17.

## 6. Open points

Both points decide what a write may do to the module's settled leading-block decision (module line 47). The planner did not settle them, and they are left open for the orchestrator's decision.

**OP-1. Which reorder rule keeps the graph-ordered block fixed?**
Sources: unit line 20 ("must not move graph-ordered files relative to one another — the graph-ordered block is fixed"); criterion 3 ("Moving graph-ordered files relative to each other is refused"); module line 47 ("graph-ordered files form a leading block").
- Option A. The graph-ordered files keep their relative order, and a non-graph file may sit between them. This is the literal reading of criterion 3. Consequence: such a write is accepted, but the next view places the non-graph file after the block (CEX-02 unit line 22), so the author sees the drop not take effect.
- Option B. The graph-ordered files stay one contiguous block at the head of the body, in their current order. A request that puts a non-graph file inside the block is refused with `COMPILE_GRAPH_ORDERED_MOVE`. This is the literal reading of module line 47 and of "the block is fixed". It refuses a request that criterion 3 does not name.

Test impact: C3(a) is refused under both options, so the tests do not depend on the answer. The `keepsGraphOrder` helper does.

**OP-2. May a part change move a graph-ordered file?**
Sources: unit line 15 ("graph-ordered files locked (25)"); module line 47; CEX-02 plan P13 (only body files count in the projection).
- Option a. Refuse with `COMPILE_GRAPH_ORDERED_MOVE` (422). A graph-ordered file keeps its place in the block.
- Option b. Allow it. The file moves to front or back, its edges stop counting, and the block shrinks.

## 7. Facts checked and assumed

### 7a. CHECKED

Repository state
- Branch `main`, HEAD `77eb7f4`; working tree clean. `git diff --name-only 8c156c3 HEAD` lists only `plans/DECISIONS.md`.
- `ls plans | grep CEX` lists only `CEX-01.md` and `CEX-02.md`: no plan exists yet for CEX-03, CEX-04, CEX-05, CEX-08, CEX-14, CEX-16 or CEX-17.

Units and module
- `units/CEX-03-order-writes.md`: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Why line 15; Decisions lines 17 to 23; criteria lines 25 to 29. The file has no notes section.
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65; phase gates lines 67 to 69; shared conventions lines 129 to 139.
- `modules/compile-export.md`: module shape line 39; HTTP line 40; file access line 41; side effects line 42; membership line 43; events line 44; settled decisions lines 46 to 54; testing lines 57 to 62; out of scope lines 64 and 65; agent reorder line 74; known cost lines 77 and 78.
- Downstream units: CEX-02 line 9 (`unblocks` CEX-03); CEX-04 line 8 and CEX-05 line 8 (`parallel_with` CEX-03); CEX-09 line 7; CEX-14 lines 7 and 15; CEX-16 lines 7, 18 and 21; CEX-17 lines 7, 8, 14 and 20; CEX-01 lines 21, 25 and 26; CEX-02 lines 22, 23 and 32.
- `plans/CEX-02.md`: status `done` (line 3); P6 line 50; P8 line 52; P9 line 53; P13 line 57; P19 line 63; P20 line 64; P24 line 68; section 3 `manuscript.service.ts` row line 78; section 5 lines 112 to 124; section 6 CEX-03 bullet line 157; section 7 point 2 line 173.
- `plans/PLT-02.md`: front matter lines 1 to 4; section headings at lines 11, 35, 60, 77, 89 and 95.
- `plans/DECISIONS.md`: no line names CEX-03. CEX-02 entries at lines 5862 to 5876.
- `plans/QUEUE.md` line 5: CEX-03 available.
- Other plans: `plans/GRR-13.md` and `plans/TRG-17.md` have status `planned` (line 2 of each). Their `grep` for compile-export, app.module, invariant-sweep and files.service paths found none. `plans/TRG-14.md` and `plans/GRR-11.md` have status `done`.
- Branches: `git diff --name-only main...unit/GRR-13`, `...unit/TRG-17`, `...unit/TRG-14` and `...unit/GRR-11` contain no path of section 2.

Contract (`packages/contracts/src/`)
- `compile-export/routes.ts`: `MANUSCRIPT_ROUTE` line 4; `MANUSCRIPT_REORDER_ROUTE` line 6; `MANUSCRIPT_STATUS_ROUTE` line 9; `MANUSCRIPT_PART_ROUTE` line 12.
- `compile-export/order.ts`: `manuscriptRevisionSchema` line 24; `manuscriptEntrySchema` lines 27 to 34; `manuscriptViewSchema` lines 53 to 59; `manuscriptReorderRequestSchema` lines 62 to 67; status request lines 70 to 74; part request lines 77 to 81.
- `compile-export/constants.ts`: `MANUSCRIPT_STATUS_DEFAULT` line 32; `MANUSCRIPT_PART_DEFAULT` line 33.
- `compile-export/errors.ts`: `COMPILE_ERROR_CODES` lines 5 to 16; `COMPILE_ERROR_STATUS` lines 38 to 49 (`COMPILE_ORDER_CONFLICT` 409 at line 39; `COMPILE_INVALID_REORDER` 422 at line 40; `COMPILE_GRAPH_ORDERED_MOVE` 422 at line 41).
- `compile-export/events.ts`: `manuscriptUpdatedDataSchema` lines 9 to 12; the union lines 58 to 63.
- `project-store/order-export.ts`: `MANUSCRIPT_FOLDER` line 18; `manuscriptPathSchema` line 23; `orderEntrySchema` lines 26 to 30.
- `project-store/errors.ts`: `NOT_FOUND` = `PROJECT_NOT_FOUND` line 9; its status 404 line 62.
- `platform/errors.ts`: `PLATFORM_VALIDATION_FAILED` 400 line 45.
- `platform/events.ts`: `sseEnvelopeSchema` lines 15 to 19, with `data: z.unknown()`; `SseEnvelope` line 21.

API (`apps/api/src/`, merged CEX-02 code)
- `modules/compile-export/manuscript.service.ts`: messages lines 33 to 35; class line 66; `view()` line 73; entries lines 121 to 128; totals and revision lines 130 to 140; `activeProjectId` lines 145 to 155 (P6); `projectOrder` lines 158 to 177; `members` lines 180 to 191; `storyGraphs` lines 194 to 226; `revisionOf` lines 229 to 234.
- `modules/compile-export/manuscript.controller.ts`: lines 9 to 16 (`@Controller()` with no prefix; `@Get` on line 13).
- `modules/compile-export/compile-export.module.ts`: lines 8 to 13.
- `modules/compile-export/effective-order.ts`: `effectiveOrder` line 89; `cycle` line 102; `usablePairs` line 103 (empty under a cycle, so no graph-ordered flags).
- `modules/project-store/files.service.ts`: `hashOf` line 87; missing-file refusal `PROJECT_ERROR_CODES.NOT_FOUND` with `FILE_MESSAGES.NO_FILE` line 141; `updateProjectYaml` lines 402 to 427 (synchronous, no `async`; `doc.set` line 425; `return this.commit` line 427); `commit` lines 523 to 554 (validation lines 532 to 543; `writeText` line 543; `files-changed` publish line 547).
- `modules/project-store/project-store.service.ts`: `activeId()` lines 51 to 57.
- `modules/platform/platform.module.ts`: line 17 exports `ModuleError` and `ZodValidationPipe`; line 18 exports `EventsPublisher`; line 40 `exports: [EventsPublisher, SettingsService]`.
- `modules/platform/events/events.publisher.ts`: `publish(envelope: SseEnvelope)` line 61.
- `modules/platform/errors/module-error.ts`: `class ModuleError` line 2; constructor `(code, status, message, details?)`.
- `modules/graph-runner/graphs.controller.ts`: `ZodValidationPipe` use line 44; `@HttpCode(200)` lines 50, 56 and 62.
- `modules/agent-loop/agent-runs.controller.ts` lines 35, 45 and 54: `@HttpCode(200)` on command POSTs.
- `eslint.config.mjs` lines 40 and 50: rule R1 (cross-module imports only through `*.module.ts`).
- `apps/api/vitest.config.mts` line 8: `include: ['test/**/*.test.ts']`.
- `apps/api/package.json` scripts lines 6 to 8 (`build`, `test`, `lint`); root `package.json` engines lines 11 to 13 (Node `>=26 <27`), scripts `build` line 23, `test` line 25, `lint` line 26.
- `.prettierignore` line 3: `/plans/`.

Test seam
- `apps/api/test/project-store-files-helpers.test.ts` line 105: U1, which asserts that `updateProjectYaml` keeps comments, key order and other keys (fixture with comments, a trailing comment and a nested key).
- `apps/api/test/compile-export-manuscript.kit.ts`: exports at lines 16 (`STATIC_ROOT`), 20 (`manuscriptLibrary`), 48 (`withManuscript`), 70 (`getManuscript`), 79 (`manuscriptOf`) and 85 (`storyGraph`).
- `apps/api/test/guard-request.ts`: `RequestOptions` lines 7 to 18 (`method`, `origin`, `cookie`, `body`, `contentType`); `send` line 27; `sessionCookie` line 80.
- `apps/api/test/invariant-sweep.ts`: `LOOPBACK_ORIGIN` line 39; `FIXTURE_PATHS` lines 73 to 100 (no compile-export entry); `concretePath` line 251; `Observer` line 405; `observeEvents` line 412; `EVENT_WAIT_MS` line 208; `expandRoutes` line 598; `sweepMutations` lines 679 to 707 (requests without an Origin are refused with 403 before the handler).

### 7b. ASSUMED

- A-1. Beyond what U1 asserts, `updateProjectYaml` leaves the text of the other keys unchanged, including a comment directly above the edited key (C2's fixture). This is checked by C2 at step 7(a); the implementer stops if it fails (section 3, stop rule).
- A-2. The rendering of the written `order` block is not asserted. C2 and C4 check parsed values and the prefix and suffix bytes only.
- A-3. The Setup & auth mutation sweep passes for the three new POST routes without any edit, because the guard answers before the handler. Not run here.
- A-4. An event published by a handler that answers within `EVENT_WAIT_MS` (200 ms) is seen by `take()`. The sweeps and CEX-02's C6 rely on the same window. Not run here.
- A-5. The implementer's environment has Node 26 and the installed workspace dependencies (root `engines`, lines 11 to 13).
- A-6. The planner ran no build, test or lint command, and no git command that writes. Every fact in 7a was read from the files, not run.
