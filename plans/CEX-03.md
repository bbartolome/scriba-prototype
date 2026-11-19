---
id: CEX-03
status: done
---
# CEX-03 plan — reorder, status and part writes with revision checks and full materialisation

Revision 2, draft. Revision 1 was written by the planner at main `77eb7f4` and committed as `2fd25bb`; revision 2 is the reviser's correction at main `2fd25bb` (tree clean). Unit: `units/CEX-03-order-writes.md` (module compile-export, phase:assembly-preflight, M5; `blocked_by: [CEX-02]`, which is merged at `05c582f` and `done`). The plan changes no criterion, no module file and no unit file, and marks nothing passed. The two open points of revision 1 (OP-1, OP-2) are settled in section 6 from the unit, the module and CEX-02's code; neither changes a module decision or a criterion.

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the module, the contract and CEX-02

- **Routes and bodies.** `POST` reorder `{revision, front, body, back}` (`MANUSCRIPT_REORDER_ROUTE`, `/api/compile-export/manuscript/reorder`), `POST` status `{revision, path, status}` (`MANUSCRIPT_STATUS_ROUTE`, `…/manuscript/status`), `POST` part `{revision, path, part}` (`MANUSCRIPT_PART_ROUTE`, `…/manuscript/part`). Bodies are the contract schemas. Sources: unit line 18; module line 40; `packages/contracts/src/compile-export/routes.ts` lines 6, 9, 12; `order.ts` lines 62, 70, 77.
- **Stale revision.** A `revision` that is not the current one gives `COMPILE_ORDER_CONFLICT` (409) and writes nothing. Sources: unit line 19; `errors.ts` line 39.
- **Revision scope.** The revision is the hash of the order value and the set of manuscript files (CEX-02 unit line 32; CEX-02 plan P19, line 63). A hand edit that changes neither (a comment, or the `export` key) is not a conflict. Story-graph edits are not in it either (CEX-02 plan section 7, point 2, line 173); the graph rule is checked against the graphs as they are at write time (CEX-02 plan line 157).
- **Permutation.** Each list must hold, once each, exactly the current files of its part; otherwise `COMPILE_INVALID_REORDER` (422). Source: unit line 20.
- **Graph-ordered files.** Moving them relative to one another is `COMPILE_GRAPH_ORDERED_MOVE` (422); "the graph-ordered block is fixed". Sources: unit line 20; criterion 3 (unit line 28); Why (unit line 15: "graph-ordered files locked (25)"). The exact rule is P13 (section 6).
- **Full materialisation.** Every write writes one entry for every current manuscript file, in effective order (front, body, back), and drops entries for missing files. Sources: unit line 21; module line 50; CEX-02 plan P20 (line 64).
- **Only the `order` key.** Written through `FilesService.updateProjectYaml` (`apps/api/src/modules/project-store/files.service.ts` lines 402 to 432). Sources: unit line 22; module line 41. The store keeps comments, key order and other keys (its test U1, `apps/api/test/project-store-files-helpers.test.ts` line 105).
- **Event.** `manuscript-updated` with data `{projectId, revision}` (`packages/contracts/src/compile-export/events.ts` lines 9 to 12), published after every successful write. Sources: unit line 23; module line 44; CEX-01 unit line 25.
- **Where status and part live.** On order entries, not in front matter (module line 49). The graph-ordered block leads the body; only `order` edges count, from all graphs (module lines 47 and 48). In CEX-02's code the block is sorted by the graph alone (topological, ties by path) and always placed first in the body, whatever `project.yaml` says (`effective-order.ts` lines 104 to 107 and 131).
- **Unknown keys of order entries survive.** `orderEntrySchema` is a loose object so newer entry keys survive an older app (`order-export.ts` lines 25 to 30; PST-01 unit line 25; CEX-01 plan P9, line 40).
- **No side effects beyond the write.** No model call, no graph run, no read or write of `drafts/.versions/` (module line 42). Membership is the top-level `.md` files of `drafts/` (module line 43).
- **Error codes.** `COMPILE_` prefix (`units/README.md` line 133). The codes are in `errors.ts` lines 5 to 16, with statuses in lines 38 to 49.
- **Out of scope.** Agent-initiated reorder (it must become a pending change, module line 74); reordering scenes inside a file (module line 65); writing to the story graph (module line 67).
- **Testing.** External behaviour only: HTTP, SSE events, files on disk; a temp library per test; no reads of `examples/` (module lines 58 and 59; CEX-02 plan section 5).

No DECISIONS entry names CEX-03, CEX-09, CEX-14 or CEX-16 (`grep`); the CEX-17 hit (line 2557) is about SHL route tests, not this unit. The CEX-02 entries (`plans/DECISIONS.md` lines 5862 to 5876) give its review and merge only.

### 1b. Planner's choices (the simplest option the sources allow)

- **P1 Files.** Two new files: `order-write.ts` (pure helpers) and `manuscript-write.service.ts` (`ManuscriptWriteService`). The controller and the module are edited. CEX-02's `manuscript.service.ts` gets one additive edit (P2); its `view()` behaviour and its GET are unchanged.
- **P2 Current and candidate state.** All reads go through `ManuscriptService`; there is no second read path. Its `view()` body moves to a private method that takes an optional order override; `view()` calls it with none (unchanged result). Two public methods are added:
  - `preview(order: OrderEntry[]): ManuscriptView` — the view computed as if `order` were the order field (same members, same graphs; `revision` is still that of the file on disk). It is the candidate state of a write.
  - `orderField(): OrderEntry[]` — the valid entries of the file's `order`, first occurrence per path, naming members (the list `view()` builds at lines 80 to 91), with their unknown keys.
  CEX-02's six tests are the regression check (step 7b). Reason for the edit: the graph pairs that decide the block are computed inside `view()` only, and P13 and unit line 21 need the effective order of the order about to be written.
- **P3 Active project.** The write service reads `ProjectStoreService.activeId()` for the project id it passes to `updateProjectYaml` and the event. A null id gets the same `PROJECT_NO_ACTIVE` refusal as CEX-02 P6 (`manuscript.service.ts` lines 145 to 155).
- **P4 Order of checks.** (1) Body shape: 400 through `ZodValidationPipe`, as `graphs.controller.ts` line 44. (2) Revision: 409. (3) Content: 422 `COMPILE_INVALID_REORDER` for a reorder (P5); 404 for a status or part path that is not a current manuscript file (P6). (4) The graph rule (P13). (5) Write, publish, respond. A stale request is a conflict whatever its content.
- **P5 Permutation test.** For each part, the sorted requested list equals the sorted current list of that part. Duplicates, missing files, extra paths and cross-part moves all fail it.
- **P6 Unknown path.** A status or part request for a path that is not a current manuscript file gets `PROJECT_NOT_FOUND` (404) with a fixed message. The store uses the same code for a missing file (`files.service.ts` line 141); CEX-02 likewise uses Project store codes for its refusals (P6, P7). No `COMPILE_` code fits, and a new one would be a contract change this unit does not list.
- **P7 Materialised entry.** `{path}`, plus `status` when it is not `draft` and `part` when it is not `body` (defaults in `constants.ts` lines 32 and 33; CEX-02 P9: defaults are never written), plus the unknown keys of the file's current entry for that path (from `orderField()`). Entries are written in the candidate's effective order: front, body, back.
- **P8 Parts and positions.** The candidate order field is the current effective order with the change applied: a reorder uses the requested lists; a part change moves the file to the end of its new part's list; a status change keeps every position. A reorder never changes a part (P5).
- **P9 Status on graph-ordered files.** Allowed, since a status change moves nothing.
- **P10 Response.** `200` with the new `ManuscriptView` (`order.ts` line 53). Command POSTs return 200 (`@HttpCode(200)`, `graphs.controller.ts` lines 50, 56, 62). No contract change.
- **P11 Write and event.** One `updateProjectYaml(projectId, {order})` call. The store validates the result before it writes (`files.service.ts` lines 531 to 541), writes (line 542) and publishes its own `files-changed` (line 544). Then `manuscript-updated` is published with the revision of a fresh `view()` call, and that view is the response. Nothing is published on refusal. A write that changes nothing still writes and publishes. The whole handler is synchronous (`view`, `read`, `updateProjectYaml` and `publish` are not `async`), so two requests cannot interleave between the revision check and the write.
- **P12 Messages.** Fixed strings; no input value is echoed (as CEX-02's `manuscript.service.ts` lines 33 to 35).
- **P13 Graph rule (settles OP-1 and OP-2, section 6).** Let *block* be the paths with `graphOrdered` true, in view order. Let *candidate* be `preview(field)` for the candidate field of P8.
  - Reorder: the candidate's paths, in order, must equal `front ++ body ++ back` of the request. Since a reorder changes neither parts nor graphs, this holds exactly when the requested `body` starts with the current block, in its current order. Otherwise `COMPILE_GRAPH_ORDERED_MOVE`. This refuses moving graph-ordered files relative to one another (criterion 3) and placing a non-graph file inside or ahead of the block.
  - Part: the candidate's block must equal the current block. Otherwise `COMPILE_GRAPH_ORDERED_MOVE`. This refuses moving a graph-ordered file out of the body, and any part change whose edges would add a file to the block, reorder it or dissolve it (a front or back file with `order` edges entering the body; a cycle file leaving it).
  - Status: no check (P9).
  - The written entries are the candidate's entries (P7). Under P13 they are the effective order of the written field, so the next view shows exactly what was written (unit line 21).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/order-write.ts` | new | Pure helpers, no I/O: `partsOf(entries)` groups view entries into `{front, body, back}` path lists; `samePerPart(current, requested)` (P5); `movePart(lists, path, part)` (P8); `blockOf(view)` (P13); `materialise(entries, field)` (P7). |
| `apps/api/src/modules/compile-export/manuscript-write.service.ts` | new | `ManuscriptWriteService` with `reorder(request)`, `setStatus(request)`, `setPart(request)`. Each runs P3, P4, P13 and P11 and returns the new view. The three share one private `commit(projectId, entries)`. |
| `apps/api/src/modules/compile-export/manuscript.service.ts` | edit | Additive (P2): private `compose(override?)` holds the old `view()` body; `view()` calls `compose()`; new `preview(order)` and `orderField()`. Nothing else changes. |
| `apps/api/src/modules/compile-export/manuscript.controller.ts` | edit | Three `@Post` handlers with `@HttpCode(200)` and `ZodValidationPipe` on the matching contract schema. The constructor gains `ManuscriptWriteService`. The GET is unchanged. |
| `apps/api/src/modules/compile-export/compile-export.module.ts` | edit | `ManuscriptWriteService` is added to `providers`. `exports` is unchanged. |
| `apps/api/test/compile-export-order.test.ts` | new | Four tests, C1 to C4 (section 4). |

Imports: request and view schemas, route constants, `OrderEntry`, `COMPILE_ERROR_CODES`, `COMPILE_ERROR_STATUS`, `MANUSCRIPT_STATUS_DEFAULT`, `MANUSCRIPT_PART_DEFAULT` from `@bbartolome/scriba-contracts/compile-export`; `PROJECT_ERROR_CODES`, `PROJECT_ERROR_STATUS` from `@bbartolome/scriba-contracts/project-store`; `ModuleError`, `ZodValidationPipe`, `EventsPublisher` from `../platform/platform.module`; `FilesService`, `ProjectStoreService` from `../project-store/project-store.module`; `ManuscriptService` from `./manuscript.service`. Only entry files are imported across modules (eslint rule R1, `eslint.config.mjs` lines 40 and 50).

Not changed: `packages/contracts/**` (no contract change); `effective-order.ts`; `apps/api/src/app.module.ts` (CEX-02 registered the module); `apps/api/test/invariant-sweep.ts` (the new routes have no `:` parameter, so the sweeps need no fixture entry); `apps/api/test/compile-export-manuscript.kit.ts` and `compile-export-manuscript.test.ts` (reused, not edited); `files.service.ts`; `apps/web/**`; `e2e/**`; `examples/**`; `units/**` except the four ticks of step 8; `modules/**`; `plans/**` except this file.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/CEX-03`, created from main. Record `node -v` (Node 26; root `package.json` lines 11 to 13) and `npm -v` beside each result. Do not push and do not open a pull request.

0. **Preconditions.** `git status` is clean. `git diff --name-only 2fd25bb -- apps/api/src/modules/compile-export packages/contracts/src/compile-export apps/api/test` prints nothing. If it prints anything, re-read this plan against the change before going on.
1. `git switch -c unit/CEX-03`. Expected: `Switched to a new branch 'unit/CEX-03'`.
2. `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
3. Edit `manuscript.service.ts` (P2). Run `cd apps/api && npx vitest run test/compile-export-manuscript.test.ts`: CEX-02's six still pass.
4. Write `order-write.ts` (P5, P7, P8, P13).
5. Write `manuscript-write.service.ts` (P1 to P4, P6, P9 to P13); edit `manuscript.controller.ts` and `compile-export.module.ts`.
6. Write `compile-export-order.test.ts` (section 4). Every POST sends the loopback `host`, the route `path`, `method: 'POST'`, the session cookie, `origin: LOOPBACK_ORIGIN` and a JSON body. Without an Origin the guard answers 403 (`invariant-sweep.ts` lines 707 to 710).
7. Verify, in this order:
   - (a) `cd apps/api && npx vitest run test/compile-export-order.test.ts`: four pass.
   - (b) `cd apps/api && npx vitest run test/compile-export-manuscript.test.ts`: CEX-02's six still pass.
   - (c) `npm test -w @bbartolome/scriba-api`: build and the whole API suite, including the Setup & auth sweeps over the new routes.
   - (d) `npm run lint -w @bbartolome/scriba-api`: eslint, including the PLT-09 boundaries.
   - (e) From the root: `npm run build`, `npm test`, `npm run lint`. Each exits 0.
   - Stop rule: if C2's byte check fails, the store rewrote text outside `order`. Stop and report. Do not splice the file by hand, because writes go through `updateProjectYaml` (module line 41).
8. Tick the four boxes in `units/CEX-03-order-writes.md` (lines 26 to 29) only when step 7 passes. The orchestrator sets this plan's status.
9. Commit on `unit/CEX-03`. Name each path: `git add -- <path>` for each path of section 2 and the unit file, then `git commit -m "feat(CEX-03): reorder, status and part writes with revision checks"`. Never `git add -A` or `git commit -a`.

## 4. Acceptance criteria and tests

The four criteria are unit lines 26 to 29. Each has one test in `apps/api/test/compile-export-order.test.ts`. The test uses `withManuscript`, `getManuscript`, `manuscriptOf` and `storyGraph` from `compile-export-manuscript.kit.ts` (exports at lines 48, 70, 79 and 85; `manuscriptLibrary`, line 20, is used through `withManuscript`); `send` (`guard-request.ts`, `RequestOptions` lines 7 to 18 with required `host` and `path`, function line 27); and `observeEvents`, `EVENT_WAIT_MS`, `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` (`invariant-sweep.ts` lines 412, 208, 38 and 39). Files are read from the temp library (`<library>/book/…`) with `readFileSync`.

The observer is opened before the POST and read with `take(EVENT_WAIT_MS)` after it. `take` returns raw SSE blocks; the test parses each block's `data` line as JSON, keeps envelopes whose `module` is `compile-export` and `type` is `manuscript-updated`, and reads their `data` as `{projectId, revision}`.

| Criterion | Test | Fixture | Expected |
|---|---|---|---|
| 1. Reordering with a stale `revision` returns a conflict and leaves `project.yaml` byte-identical. | C1 | `project.yaml` with `order` for `drafts/a.md` and `drafts/b.md`; files `a`, `b`, `c`. GET gives r0. The test then hand-edits `project.yaml` on disk, adding `status: final` under `b`. The order value changes, so the revision changes. | POST reorder `{revision: r0, front: [], body: [b, a, c], back: []}` gives 409 with `error.code` `COMPILE_ORDER_CONFLICT`. The file bytes equal the hand-edited text, and no `manuscript-updated` is observed. A GET then gives r1, and the same body with r1 gives 200, so the refusal was the revision alone. |
| 2. A valid reorder writes every file's entry and keeps comments and other keys in `project.yaml` byte-identical. | C2 | `project.yaml` as below, with files `a`, `b`, `c`, `z`. `z` is `part: back` in the order; `b` has the unknown key `note: keep`; there is no file for `gone`. The view is `b, a, c, z`. | POST reorder `{front: [], body: [c, b, a], back: [z]}` with the current revision gives 200. The view's paths are `c, b, a, z`. The file text starts with its text up to and including the `# Manuscript order.` line, and ends with its text from the `# Model choice.` line. The parsed `order` is exactly `[{path: c}, {path: b, status: final, note: keep}, {path: a}, {path: z, part: back}]`, so every file has an entry, the stale `gone` entry is gone and `b`'s unknown key survives. One `manuscript-updated` is observed, with the response's revision. |
| 3. Moving graph-ordered files relative to each other is refused; a non-permutation is refused. | C3 | `project.yaml` with `order: [{path: drafts/f.md, part: front}]`; files `a`, `b`, `c`, `f`; `graphs/plot.json` from `storyGraph` with nodes `c1` (`drafts/c.md`), `b1` (`drafts/b.md`), `a1` (`drafts/a.md`), `f1` (`drafts/f.md`) and edges `c1`→`b1` and `b1`→`f1`, relation `order`. View `f, c, b, a`; `graphOrdered` true for `c` and `b` only (the `b`→`f` edge is dropped while `f` is front). GET gives r0. | (a) Each 422 `COMPILE_GRAPH_ORDERED_MOVE`, all with r0: reorder front `[f]` body `[b, c, a]` (relative move, the criterion); reorder front `[f]` body `[c, a, b]` and body `[a, c, b]` (non-graph file inside or ahead of the block, P13); part `{drafts/b.md, back}` (graph-ordered file leaves the body, P13); part `{drafts/f.md, body}` (the candidate block would be `c, b, f`, P13). (b) Each 422 `COMPILE_INVALID_REORDER`, all with r0: body `[c, b, a, a]`; body `[c, b]`; body `[c, b, a, drafts/x.md]` (x is not a member); front `[f, a]` with body `[c, b]`; front `[]` with body `[f, c, b, a]` (front lists `[f]` otherwise). In every case of (a) and (b) the file bytes are unchanged and no `manuscript-updated` is observed. (c) Controls: status `{r0, drafts/b.md, final}` gives 200, the view is still `f, c, b, a` with `b` graph-ordered (P9); then reorder front `[f]` body `[c, b, a]` with the new revision gives 200. |
| 4. Status and part writes materialise the full order; `manuscript-updated` is published after each. | C4 | `project.yaml` with no `order` key; files `a`, `b`, `c`, `d`; no graphs. View order `a, b, c, d`. | (a) POST status `{r0, drafts/c.md, final}` gives 200. The file gains `order` `[{path: a}, {path: b}, {path: c, status: final}, {path: d}]`, and exactly one event is observed, carrying the response's revision. (b) POST part `{r1, drafts/d.md, front}` gives 200. `order` is `[{path: d, part: front}, {path: a}, {path: b}, {path: c, status: final}]`, and exactly one event is observed, carrying the response's revision. (c) POST status for `drafts/gone.md` with the current revision gives 404 `PROJECT_NOT_FOUND`, the bytes are unchanged and no event is observed. |

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
    note: keep
  - path: drafts/gone.md
  - path: drafts/z.md
    part: back
# Model choice.
model:
  providerId: test-provider
  model: test-value
```

## 5. Downstream agreement and other plans

Pipeline check (reviser, main `2fd25bb`): no `plans/<ID>.md` and no `unit/<ID>` branch exists for CEX-04, CEX-05, CEX-09, CEX-14, CEX-16 or CEX-17. No downstream unit is changed by this plan.

- **CEX-14 (blocked by CEX-03).** Its settings write `{revision, settings}` refuses a stale revision with the same mechanism (409, nothing written). The settings revision is a separate value that CEX-14 defines (`packages/contracts/src/compile-export/settings.ts` line 11; CEX-01 plan O1, line 336), so a stale `export` edit is CEX-14's to catch, not this revision's. Nothing changes here.
- **CEX-16 (blocked by CEX-03).** Its restore writes the manifest's `order` into `project.yaml` (CEX-16 unit line 21, step 4); it may import `materialise` from `order-write.ts` (same module, rule R1 not touched). Its snapshot `order` and statuses come from `ManuscriptService.view()` (CEX-16 unit line 18). Its restore also publishes `manuscript-updated` (line 21, step 5). Restore is its own write; P13 does not bind it.
- **CEX-17 (parallel; UI).** Its drag sends the reorder with the current revision, and a 409 shows the reload prompt (unit line 20). The success body is `manuscriptViewSchema` (P10), so the UI needs no second GET. Graph-ordered rows cannot be dragged (line 18); under P13 a drop of another row inside or above the block, or a part change of a graph-ordered row, gets 422 `COMPILE_GRAPH_ORDERED_MOVE`; CEX-17's criteria (lines 25 to 28) do not name a 422, so they are unaffected. Its line 14 says "merges once CEX-03 is in" while `blocked_by` (line 7) omits CEX-03 and `parallel_with` (line 8) names it; that note is for CEX-17's owner (finding, section 7c).
- **CEX-09 (gate).** Its first criterion (line 21) requires CEX-02…CEX-07 criteria on main; the four tests of section 4 are CEX-03's share. It exports an in-process service (line 17); `preview` and `orderField` are additive and need not be exported.
- **CEX-04 and CEX-05 (parallel; API).** Both add providers or controllers to `compile-export.module.ts`. On a merge conflict, keep both entries. Neither touches `order-write.ts`, the write service or `manuscript.service.ts` by their unit text; if a later plan edits `manuscript.service.ts`, keep P2's additive methods.
- **CEX-08 (parallel).** Its `order` entries must pass `orderEntrySchema` (`order-export.ts` lines 26 to 30). P7 writes only valid entries.
- **Other plans with status draft or planned.** `plans/GRR-13.md` and `plans/TRG-17.md` (status at line 3 of each). GRR-13 changes only `apps/web/src/app/features/graph-runner/**` and `tool-registry.routes.ts` (its section 4; `git diff --name-only main...unit/GRR-13`); TRG-17 changes only its unit file (its section 2.1; `main...unit/TRG-17`). No overlap with section 2 in either merge order.
- **Blocker consistency.** CEX-03's `blocked_by` (CEX-02), `unblocks` (CEX-09, CEX-14, CEX-16) and `parallel_with` (CEX-04, CEX-05, CEX-17) are the exact inverses of the other units' entries (CEX-02 line 9; CEX-09 line 7; CEX-14 line 7; CEX-16 line 7; CEX-04 line 8; CEX-05 line 8; CEX-17 line 8). `plans/QUEUE.md` line 5 lists CEX-03 as available.
- **Merge order.** This plan uses only code on main (CEX-02 merged at `05c582f`). It works in either order with CEX-04, CEX-05, CEX-08 and CEX-17.

## 6. Open points

None open. Revision 1's two points are settled as follows; neither changes the module's leading-block decision (module line 47) or a criterion.

**OP-1 (settled: option B). Which reorder rule keeps the graph-ordered block fixed?**
The requested body must start with the current block in its current order (P13). Evidence: unit line 21 and module line 50 require every write to be the effective order; in CEX-02's code the block is ordered by the graph alone and always leads the body (`effective-order.ts` lines 104 to 107 and 131), so a written order that puts a non-graph file inside or ahead of the block is not the effective order: the next view would differ from what was written. Revision 1's option A (accept that write) therefore breaks unit line 21. Silently normalising the request to the effective order was also considered and rejected: it writes an order the author did not send, while unit line 20 says the block "is fixed" and refuses with `COMPILE_GRAPH_ORDERED_MOVE`. Criterion 3 is tested as written (C3(a), first case); option B refuses more, which weakens nothing.

**OP-2 (settled: option a, refuse). May a part change move a graph-ordered file?**
No: a part change whose result changes the block is refused with `COMPILE_GRAPH_ORDERED_MOVE` (P13). Evidence: unit Why line 15, "graph-ordered files locked (25)" (story 25 of the original spec: such a file "stay[s] locked in place, so that I know to change its position in the graph"); unit line 20, "the graph-ordered block is fixed"; and unit line 21, since a file that joins the block would otherwise be written at the end of the body while the view places it in the block. The extension to a file entering the body (C3(a), last case) follows from the same two lines. Writing to the story graph from the manuscript view is out of scope (module line 67), so the author changes the block in the graph.

## 7. Facts checked and assumed

### 7a. CHECKED

Repository state
- Revision 1: branch `main`, HEAD `77eb7f4`. Revision 2: HEAD `2fd25bb` (`docs(CEX-03): draft plan`, only this file changed), tree clean.
- `ls plans | grep CEX`: `CEX-01.md`, `CEX-02.md`, `CEX-03.md`. `git branch -a`: `unit/GRR-11`, `unit/GRR-13`, `unit/TRG-14`, `unit/TRG-17` and backup branches; no `unit/CEX-*`.

Units and module
- `units/CEX-03-order-writes.md`: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Why line 15; Decisions lines 17 to 23; criteria lines 25 to 29. No notes section.
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65 (line 64: `blocked_by` is the source of truth; `parallel_with` never pairs a dependency); phase gates lines 67 to 123 (CEX rows 120 to 123); shared conventions lines 129 to 139.
- `modules/compile-export.md`: module shape line 39; HTTP line 40; file access line 41; side effects line 42; membership line 43; events line 44; settled decisions lines 46 to 55; testing lines 57 to 62; out of scope lines 64 to 75 (scenes line 65, graph writes line 67, agent reorder line 74); known cost lines 77 and 78.
- Downstream units: CEX-02 line 9; CEX-04 line 8; CEX-05 line 8; CEX-09 lines 7, 17 and 21; CEX-14 lines 7 and 15; CEX-16 lines 7, 18 and 21; CEX-17 lines 7, 8, 14, 18, 20 and 25 to 28; CEX-02 unit lines 22 and 32.
- Original spec, `git show aa11eda…` history of `specs/compile-export.md` (deleted): story 25 "stay locked in place".
- `plans/CEX-02.md`: status `done` (line 3); P6 line 50; P8 line 52; P9 line 53; P13 line 57; P19 line 63; P20 line 64; P24 line 68; section 6 CEX-03 bullet line 157; section 7 points 2 and 4, lines 173 and 175.
- `plans/CEX-01.md`: P9 line 40; CEX-03 bullet line 292; O1 line 336.
- `plans/PLT-02.md`: section headings at lines 11, 35, 60, 77, 89 and 95 (format followed, with a review-parts section added).
- `plans/DECISIONS.md` (grep by id): no line names CEX-03, CEX-09, CEX-14 or CEX-16; CEX-17 only at line 2557 (SHL route tests); CEX-02 entries at lines 5862 to 5876.
- `plans/QUEUE.md` line 5: CEX-03 available.
- Other plans: `plans/GRR-13.md` and `plans/TRG-17.md`, `status: planned` at line 3; GRR-13 section 4 (line 138) and TRG-17 section 2.1 (line 27) list no path of section 2; branch diffs against main confirm it.

Contract (`packages/contracts/src/`)
- `compile-export/routes.ts`: `MANUSCRIPT_ROUTE` line 4; reorder line 6; status line 9; part line 12.
- `compile-export/order.ts`: `manuscriptRevisionSchema` line 24; `manuscriptEntrySchema` lines 27 to 34; `manuscriptViewSchema` lines 53 to 59; reorder request lines 62 to 67; status request lines 70 to 74; part request lines 77 to 81.
- `compile-export/constants.ts`: `MANUSCRIPT_STATUS_DEFAULT` line 32; `MANUSCRIPT_PART_DEFAULT` line 33.
- `compile-export/errors.ts`: `COMPILE_ERROR_CODES` lines 5 to 16; `COMPILE_ERROR_STATUS` lines 38 to 49 (409 line 39; 422 lines 40 and 41).
- `compile-export/events.ts`: `manuscriptUpdatedDataSchema` lines 9 to 12.
- `compile-export/settings.ts` line 11: the settings revision is separate from the manuscript revision.
- `project-store/order-export.ts`: `MANUSCRIPT_FOLDER` line 18; `manuscriptPathSchema` line 23; `orderEntrySchema` lines 25 to 30 (loose).
- `project-store/errors.ts`: `NOT_FOUND` line 9; `PROJECT_NOT_FOUND: 404` line 62.

API (`apps/api/src/modules/`)
- `compile-export/manuscript.service.ts`: messages lines 33 to 35; class line 66; `view()` lines 73 to 142 (order field lines 80 to 91; pairs lines 94 to 114; `effectiveOrder` line 116; revision line 140); `activeProjectId` lines 145 to 155; `projectOrder` lines 158 to 177; `members` lines 180 to 191; `storyGraphs` lines 194 to 226; `revisionOf` lines 229 to 234. All synchronous.
- `compile-export/effective-order.ts`: `topological` lines 66 to 85 (ties by path); `effectiveOrder` line 89; body pairs line 98; cycle lines 102 and 103; block lines 104 to 107; body = block then rest, line 131.
- `compile-export/manuscript.controller.ts` lines 9 to 16; `compile-export.module.ts` lines 8 to 13.
- `project-store/files.service.ts`: `hashOf` line 87; `NOT_FOUND` refusal line 141; `read` line 257 (sync); `updateProjectYaml` lines 402 to 432 (sync; `doc.set` line 425); `commit` lines 523 to 555 (validation lines 531 to 541; `writeText` line 542; `files-changed` publish line 544).
- `project-store/project-store.service.ts`: `activeId()` line 51.
- `platform/platform.module.ts`: line 17 `ModuleError`, `ZodValidationPipe`; line 18 `EventsPublisher`; line 40 exports. `platform/events/events.publisher.ts` line 61: `publish` is sync.
- `graph-runner/graphs.controller.ts`: `ZodValidationPipe` line 44; `@HttpCode(200)` lines 50, 56 and 62.
- `eslint.config.mjs` line 50: rule R1. `apps/api/vitest.config.mts` line 8. `apps/api/package.json` scripts lines 6 to 8. Root `package.json` engines lines 11 to 13.

Test seam
- `apps/api/test/project-store-files-helpers.test.ts` line 105: U1.
- `apps/api/test/compile-export-manuscript.kit.ts`: exports at lines 16, 20, 48, 70, 79 and 85; `manuscriptLibrary` writes files under `book/`.
- `apps/api/test/guard-request.ts`: `RequestOptions` lines 7 to 18 (`host`, `path` required; `method`, `origin`, `cookie`, `body`, `contentType`, `headers`, `headersOnly`); `send(baseUrl, options)` line 27; `sessionCookie` line 80.
- `apps/api/test/invariant-sweep.ts`: `LOOPBACK_HOST` line 38; `LOOPBACK_ORIGIN` line 39; `FIXTURE_PATHS` line 73; `EVENT_WAIT_MS` line 208; `concretePath` line 251; `Observer` line 405 (`take` returns raw blocks); `observeEvents(baseUrl, host, cookie)` line 412; missing-Origin 403 check lines 707 to 710.

### 7b. ASSUMED

- A-1. Beyond what U1 asserts, `updateProjectYaml` leaves the text of the other keys unchanged, including a comment directly above the edited key (C2's fixture). Checked by C2 at step 7(a); stop rule in section 3.
- A-2. The rendering of the written `order` block is not asserted. C2 and C4 check parsed values and the prefix and suffix bytes only.
- A-3. The Setup & auth mutation sweep passes for the three new POST routes without any edit, because the guard answers before the handler. Not run here.
- A-4. An event published by a handler that answers within `EVENT_WAIT_MS` (200 ms) is seen by `take()`. CEX-02's C6 relies on the same window. Not run here.
- A-5. The implementer's environment has Node 26 and the installed workspace dependencies.
- A-6. Neither the planner nor the reviser ran a build, test or lint command, or a git command that writes. Every fact in 7a was read from the files.

### 7c. Findings for other units (no change made)

- CEX-17 line 14 ("merges once CEX-03 is in") versus `blocked_by` line 7 (no CEX-03) and `parallel_with` line 8 (CEX-03). By README line 64 `blocked_by` rules; the UI is built against fakes, so line 14 is a merge-order note only. Not in CEX-03's way.
- CEX-14 line 15 ("revision conflicts as in CEX-03"): not a gap. The contract gives a separate settings revision (`settings.ts` line 11) that CEX-14 defines (CEX-01 plan O1, line 336).

## 8. Review parts

- **Part A (the only part).** Steps 0 to 9 and tests C1, C2, C3 and C4 (criteria 1 to 4). Every test needs the edited view service, the helpers, the write service and the routes, so the plan is one part. Review against section 2 (only the listed paths change) and P13.
