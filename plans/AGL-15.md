---
id: AGL-15
status: draft
unit: units/AGL-15-pending-writes-gate.md
sources: units/AGL-15-pending-writes-gate.md (21 lines, no change note, read in full); units/README.md (lines 64, 69, 113, 139 and the unit format); modules/agent-loop.md (read in full; lines 31, 54, 60 to 66, 82); units/AGL-12-write-overlay.md, AGL-13-output-routing.md, AGL-14-diff-previews-review-link.md, AGL-20-grounding-gate.md, PST-22-review-gate.md (read in full); units/AGL-16 to AGL-19 (front matter); plans/PLT-02.md (structure); plans/PST-22.md (sections 1b, 3, 4, 5, 7); plans/AGL-12.md, AGL-13.md, AGL-14.md, PST-22.md (status lines); plans/SAU-20.md, SAU-22.md, TRG-14.md (status lines and file tables); plans/DECISIONS.md (grep by AGL-15, AGL-13, PST-22 and PST-19 lines named in section 8 only); the code, tests, scenario and e2e files named in section 8, read at main 4e9c17c
---

# AGL-15 plan — pending-writes gate: the phase checklist on main and the accept step

Phase `phase:pending-writes` (M3), the gate of Agent loop. Unit `units/AGL-15-pending-writes-gate.md`. Written at main `4e9c17c`, with a clean tree before this file was written. Nothing was built, installed, run or changed except this file.

Tags: **D**n is a decision this plan follows (section 2a). **P**n is a choice this plan makes (section 2b). **OP**n is an open point (section 9). **F**n is a fact checked by reading a file (section 8). **A**n is a fact assumed or reported, not checked here (section 8).

Summary. AGL-15 adds no product code and no e2e code. The e2e accept step that the unit names is already on main, added by PST-22 (F14, F18). The unit's criterion 1 bundles the checks of AGL-12 and AGL-13, which are covered today by four separate tests. This plan adds one gate test file for criterion 1, and it verifies criterion 2 with the path-filtered journey run.

## 1. Status

Status `draft` (front matter above). The summary above is this plan's whole scope.

## 2. Decisions this plan follows

### 2a. Settled by the unit, the module, the README and the done plans

- **D1. Criteria stay as written.** Two criteria (unit lines 20 and 21). Each has exactly one test (section 5). Source: unit lines 19 to 21; the planner rules.
- **D2. Scope.** The unit's scope (line 17) names the e2e "accept change" step with the Project store and says to coordinate with PST-22, which owns the accept assertion. That step is on main (F14), and PST-22 is status `done` (F19). So AGL-15's e2e part is verification only. Source: unit line 17; `plans/PST-22.md` section 7, OP1.
- **D3. Writes.** Every agent write, and every draft, entity and graph output, becomes a pending change. The only direct writes are the app's own records under `logs/`: transcript lines (`appendLog`) and the claims artefact (`write`). Source: module line 54; F9.
- **D4. Accept.** `POST …/projects/:projectId/pending/:id/accept` takes an optional body; with no body it applies the proposal. Source: F10.
- **D5. Test seam.** External behaviour only (HTTP responses, SSE events, files on disk, and the requests the mock model receives). The composed app through `createTestApp`, a temp library, the mock OpenAI server with scripted turns. No fixture reads `examples/`. Source: module lines 61 to 63; README line 139.
- **D6. The full e2e suite is not run.** It fails on main at `e2e/specs/tools-preview.e2e.ts` line 167 (`TRG-05 C2`), recorded in `plans/DECISIONS.md` line 5506. Every e2e command in this plan carries a path filter. Source: task rule; F17.
- **D7. A gate test copies its helpers.** The new gate file copies the helpers of the test files it repeats; it does not import them. Source: `plans/PST-22.md` section 1b, P1, which made `apps/api/test/project-store-review-gate.test.ts` the same way (F20).
- **D8. Phase closure.** A phase closes when its gate unit is merged (README line 69). Merging AGL-15 closes `phase:pending-writes` (unit line 14; README line 113).

### 2b. Choices this plan makes (the unit leaves them open)

- **P1. One new file, `apps/api/test/agent-loop-pending-writes-gate.test.ts`.** Its name follows the `*-gate.test.ts` files of `apps/api/test/` (F20). Source: D7; OP4.
- **P2. Criterion 1 is one `it` with three sub-checks, (a) to (c).** Each sub-check has its own mock scenario and its own app, as the AGL-12 and AGL-13 tests do (F11). Source: section 5.
- **P3. The disk check covers the book folder, not `logs/` or `.scriba/`.** Source: OP3.
- **P4. The `it` takes a 60000 ms timeout as its third argument.** It boots three apps and waits out one 5 s stall. The config timeout is 20000 ms (F13). Precedent: `apps/api/test/setup-auth-localapi.test.ts` line 148.
- **P5. Criterion 1 covers the stopped run and not the project switch.** The criterion names only a stopped run. The project-switched case stays in AGL-12's test (F11), so it is not repeated here.
- **P6. Criterion 2 is the existing journey test, unchanged.** No file under `e2e/` changes.

## 3. Files to change

| Path | New or changed | Why |
|---|---|---|
| `apps/api/test/agent-loop-pending-writes-gate.test.ts` | new | The one test of criterion 1, with sub-checks (a) to (c) of section 5. |
| `units/AGL-15-pending-writes-gate.md` | ticks only, in the docs commit | Lines 20 and 21 ticked `[x]` after verification, as PST-22 did (orchestrator commit). |
| `plans/AGL-15.md` | status only, in the docs commit | status `done` (orchestrator commit). |

Not changed, on purpose (each checked):
- `e2e/specs/journey.e2e.ts`: the accept step is PST-22's, lines 281 to 410 (F14). A second agent edit or accept would duplicate it (OP1).
- `e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json`: it exists, with the three matchers the step needs (F16).
- `apps/api/src/**`: the AGL-12 and AGL-13 code on main already does the checklist (F7, F8). No gap was found.
- `packages/contracts/**`: the routes and schemas exist (F10).
- `apps/api/test/agent-loop-writes.test.ts` and `apps/api/test/agent-loop-output-routing.test.ts`: kept as they are; the new test repeats their checks.
- `plans/DECISIONS.md`: only the orchestrator writes it.

## 4. Procedure

Run from the repository root in a worktree of `main`, on branch `unit/AGL-15`. The orchestrator gives the worktree path. Do not push. Stage explicit paths only. Record `node -v` (expected `v26.x`) and `npm -v` (expected `11.20.0`) with each result.

**Step 0. Worktree.** `git worktree add -b unit/AGL-15 <path> main`. Expected: `git status --short` prints nothing, and `git log --oneline -1` prints the main head.

**Step 1. Install and build.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0. The API tests import the contracts from `dist` (F21).

**Step 2. Baseline of the tests the new file repeats.** From `apps/api`, run `npx vitest run test/agent-loop-writes.test.ts test/agent-loop-output-routing.test.ts`. Expected: all pass (writes AC1 to AC4, routing AC1 to AC3). Record the counts. If one fails, stop and report it; the gate cannot pass on a broken base.

**Step 3. Write the new test file.** Create `apps/api/test/agent-loop-pending-writes-gate.test.ts` with one `it` named as in section 5 (C1), with sub-checks (a) to (c). Copy the helpers listed in section 5 from the two files (do not import them). In `openHarness`, make `packs` optional: when it is absent, do not set `SCRIBA_PACKS_DIR`, as `agent-loop-writes.test.ts` line 109 does. Use `PACKS_ROOT` only in sub-check (c). Pass 60000 as the third argument of the `it` (P4). Expected: one file, one `it`, no other file changed.

**Step 4. Run the new file three times.** From `apps/api`, run `npx vitest run test/agent-loop-pending-writes-gate.test.ts` three times. Expected: 1 passed each time. If it fails, report the sub-check (a), (b) or (c) that failed and its assertion. Do not weaken an assertion.

**Step 5. Format and lint.** `npx prettier --write apps/api/test/agent-loop-pending-writes-gate.test.ts`, then `npx prettier --check apps/api/test/agent-loop-pending-writes-gate.test.ts` and `npm run lint -w @bbartolome/scriba-api`. Expected: each exits 0.

**Step 6. Criterion 2: the journey.** From the repository root, run `npm run e2e -w @bbartolome/scriba-e2e -- specs/journey.e2e.ts`. The `--` passes the path filter to `playwright test`. Expected: exit 0; the list reporter shows `journey: setup, project from sample, agent run, accept change, manuscript` as passed; `e2e/test-results/report.json` holds exactly one `pending` annotation, `manuscript`. If Playwright cannot find a browser, set `SCRIBA_E2E_CHROMIUM` to the cached Chromium first (`e2e/playwright.config.ts` line 24, F15). Do not edit the journey.

**Step 7. The API suite.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0 and every test passes. Record the total; it is the total of the suite before the new file, plus one.

**Step 8. Code commit.** `git add -- apps/api/test/agent-loop-pending-writes-gate.test.ts`, then `git commit -m "feat(AGL-15): gate test for the pending-writes checklist" -- apps/api/test/agent-loop-pending-writes-gate.test.ts`. Expected: one commit on `unit/AGL-15`.

**Step 9. Docs commit (orchestrator, after review).** Tick the two criteria in `units/AGL-15-pending-writes-gate.md` (lines 20 and 21) and set `plans/AGL-15.md` to status `done`. Commit with `docs(AGL-15): mark the acceptance criteria and set the plan to done`. Expected: `git commit -- units/AGL-15-pending-writes-gate.md plans/AGL-15.md` only.

**Step 10. Verify on main (after the merge, orchestrator).** On main, run step 4 and step 6 again. Expected: both pass. This closes `phase:pending-writes` on main.

## 5. Acceptance criteria and tests

The two criteria of unit lines 20 and 21, one test each.

| Criterion (unit line) | Test file | Test name | Command (cwd) | Pass condition |
|---|---|---|---|---|
| C1: "No agent write touches disk before acceptance; two edits → one pending change against the first base; a stopped agent run still creates its changes; propose-graph valid/invalid handling (AGL-12, AGL-13)." (20) | `apps/api/test/agent-loop-pending-writes-gate.test.ts` (new) | `C1: no agent write reaches the book before acceptance; a stopped run keeps its change; two edits fold into one change on the first base; an invalid graph is retried and a valid one is filed under graphs/` | `npx vitest run test/agent-loop-pending-writes-gate.test.ts` (cwd `apps/api`) | Sub-checks (a) to (c) all hold, in one run of the `it`. |
| C2: "The e2e accepts an agent-made change and sees it in the draft." (21) | `e2e/specs/journey.e2e.ts` (existing, unchanged) | `journey: setup, project from sample, agent run, accept change, manuscript` (line 12); its step `accept change` (lines 282 to 410) | `npm run e2e -w @bbartolome/scriba-e2e -- specs/journey.e2e.ts` (cwd repository root) | The journey passes; the accept step has no `pending` annotation; `manuscript` is the only one. |

### C1 test: the helpers, then the three sub-checks

Helpers are copied, not imported (D7). From `agent-loop-writes.test.ts`: `EXTRACT_MARKER` import (line 41), `readUntil` (262 to 279), `hasEnded` (281), `hasResults` (284), `stallAt` (290), `emptyExtractStep` (299), `writeCall` (306). From `agent-loop-output-routing.test.ts`: `PACKS_ROOT` (55), `settingsText` (62), `openHarness` (92 to 135, with `packs` made optional as in step 3), `post` (155), `startRun` (166), `readUntilEnded` (173), `eventsOf` (193), `get` (200), `pendingOfBook` (210, one copy, which reads `PROJECT_PENDING_ROUTE` as `agent-loop-writes.test.ts` line 252 does), `chatBodies` (236), `toolContents` (380), and the graph constants `GRAPH_WITH_BAD_ID` and `GRAPH_VALID` (387 to 390).

A new helper `bookFiles(book)` returns a map from each file path under `book` to its sha256. It skips every path that starts with `logs/` or `.scriba/` (P3, OP3). It is used before and after each run, to check that nothing in the book changed.

Each sub-check opens its own `observeEvents` stream and closes it, and closes its own app and mock, in `finally` blocks, as the two source files do.

**(a) No write before acceptance, and a stopped run keeps its changes.** Scenario `gate-disk`, steps as in `agent-loop-writes.test.ts` lines 314 to 327: `emptyExtractStep()`, `write_file` to `drafts/new-chapter.md` (content `# Chapter\n`), `edit_file` on `sources/outline.md` (`# Outline` to `# Changed`), and `stallAt(2)`. Then:
1. Take `S0 = bookFiles(book)` before the run starts.
2. Start the run with intent `Write the chapter`. Read the stream until two `tool-call-result` events have arrived.
3. `bookFiles(book)` equals `S0`.
4. `POST` the stop route with `{runId}` and expect 200. Read the stream until `run-ended`. Expect reason `stopped` and two `pendingChangeIds`.
5. `bookFiles(book)` equals `S0`.
6. `pendingOfBook` holds two changes: `drafts/new-chapter.md` with kind `create`, `capturedBase` null, and origin `agent-run` with this `runId`; and `sources/outline.md` with kind `modify` and `capturedBase` content `# Outline\n`.
7. `POST` the accept route (`PROJECT_PENDING_ACCEPT_ROUTE`, project `book`, the id of the `drafts/new-chapter.md` change) with body `{}`. Expect 200. `drafts/new-chapter.md` now reads `# Chapter\n`, and `pendingOfBook` holds only the `sources/outline.md` change.

**(b) Two edits fold into one change on the first base.** Scenario `gate-two-edits`, steps as in `agent-loop-writes.test.ts` lines 373 to 388 (turn 0 edit to `# Outline A`; turn 1 read; turn 2 edit to `# Outline B`; turn 3 text `Done.`). Expectations as in lines 397 to 420: three tool results, the second result's output is `{path: 'sources/outline.md', content: '# Outline A\n'}`, the run ends `completed` with one `pendingChangeIds` entry, and `pendingOfBook` holds exactly one change for `sources/outline.md` with kind `modify`, `capturedBase` `# Outline\n`, `proposed` `# Outline B\n`, and `origin.toolCallId` equal to the call id of the second edit. The file on disk still reads `# Outline\n`.

**(c) Propose-graph: an invalid graph is retried, a valid one is filed.** Scenario `routing-graph`, packs `PACKS_ROOT`, steps as in `agent-loop-output-routing.test.ts` lines 393 to 441. Expectations as in lines 449 to 474: one `tool-call-error` at attempt 1 whose message contains `graph/nodes/0/id`; the mock's second request offers `propose_graph` again and carries that message as its tool message; one `tool-call-result`; one change with target `graphs/ada-and-the-engine.json` and kind `create`, whose `proposed` parses with `graphFileSchema`; and no `graphs/` folder on disk.

### C2 test: the accept step of the journey (existing)

Test `journey: setup, project from sample, agent run, accept change, manuscript` (line 12). Its step `accept change` (lines 282 to 410) already asserts, on main:
- One open change for `drafts/born-to-it.md`, with status `pending`, `conflict` null and origin `agent-run` (lines 340 to 365). The file is unchanged before the accept (line 366).
- The requests of the run are `[1, 2, 0]`: the intent, the tool result and the grounding extract (lines 368 to 380).
- The review page's `Open` and `Accept` for that row, then `No open changes.` (lines 382 to 394).
- After the accept, the file equals the proposed text, contains `This chapter sets up the harder question.`, and does not contain the old sentence. `drafts/.versions/born-to-it.md/` holds one file, named by the version pattern, whose text is the text before the edit (lines 396 to 408).

The step's owner comment (line 281) already names AGL-15. "Sees it in the draft" is read as the draft file on disk, as the unit's scope does (OP2).

## 6. Downstream agreement

- **AGL-20, the grounding gate.** Its `blocked_by` names AGL-15 (`units/AGL-20-grounding-gate.md` line 7). It needs `phase:pending-writes` closed, with its checklist true on main. It uses no AGL-15 file or code. AGL-15 provides this with the C1 test (step 4) and the journey (step 6), both run on main at step 10. Met, with no change to AGL-20.
- **Units of the same phase that use AGL-15's output.** None. AGL-15 is the last unit of `phase:pending-writes` (README line 113, `AGL-12 … AGL-15`). Only AGL-20 names AGL-15 in a `blocked_by` (grep of `units/*.md`). AGL-16 to AGL-19 name it only in `parallel_with` (their line 8). Their dependencies do not reach AGL-15, and AGL-15's dependencies (AGL-12, AGL-13, AGL-14, PST-22) do not reach them (F4).
- **CEX-20, the manuscript gate (not in this unit's `unblocks`).** PST-22's plan (section 5) puts CEX-20's manuscript block after the accept step. AGL-15 changes no line of the journey, so that insertion is unaffected.

## 7. Other draft and planned plans that touch the same files

The plans with status `draft` or `planned` are `plans/SAU-20.md` (planned), `plans/SAU-22.md` (draft) and `plans/TRG-14.md` (planned) (F22; the status lines were checked by reading the front matter of every plan in `plans/`). None of their file tables contains a path of this plan (section 3).

- **SAU-20 (planned; file table lines 60 to 68).** Changes web files under `apps/web/src/app/features/setup-auth/` only. Its "not changed" list keeps `apps/api/**` and `e2e/**` (plan line 70). It shares no file with AGL-15. Either merge order is correct: the two change sets are disjoint, and neither changes the journey.
- **TRG-14 (planned; file table lines 99 to 110).** Changes the web tool-registry files, `apps/web/package.json`, the lockfile, and adds `e2e/specs/tools-editor.e2e.ts`. It shares no file with AGL-15. Either merge order is correct.
- **SAU-22 (draft; file table lines 82 to 91).** Changes the contracts env default, the boot env parser, the request policy, the guard, `bootstrap.ts`, the root `package.json`, the README, and adds `apps/api/test/setup-auth-dev-mode.test.ts` and `scripts/dev-auth-docs.test.mjs`. It shares no file with AGL-15. The new AGL-15 test sends the same host, origin and cookie as the existing gate tests, and SAU-22 keeps `SCRIBA_DEV_AUTH` off by default (its row 1), so the guard path the test takes is the same before and after SAU-22. Either merge order is correct.

## 8. Facts checked and assumed

### 8a. Checked by reading (file and line)

- **F1. Unit.** `units/AGL-15-pending-writes-gate.md`: front matter lines 2 to 9 (`blocked_by` line 7: AGL-12, AGL-13, AGL-14, PST-22; `parallel_with` line 8: AGL-16 to AGL-19; `unblocks` line 9: AGL-20). Scope line 17. Criteria lines 20 and 21, both unticked (`- [ ]`). The file is 21 lines and has no change note.
- **F2. Inverse blockers.** `units/AGL-12-write-overlay.md` line 9, `AGL-13-output-routing.md` line 9, `AGL-14-diff-previews-review-link.md` line 9, and `PST-22-review-gate.md` line 9 each list AGL-15 in `unblocks`. `units/AGL-20-grounding-gate.md` line 7 lists AGL-15 in `blocked_by`.
- **F3. Parallel symmetry.** `units/AGL-16-grounding-engine.md` line 8, `AGL-17-grounding-wiring.md` line 8, `AGL-18-grounding-badges-ui.md` line 8 and `AGL-19-grounding-sample-draft.md` line 8 each list AGL-15 in `parallel_with`. Symmetric.
- **F4. Blocker dependencies.** AGL-12 `blocked_by` names AGL-02, AGL-08, PST-15 (its line 7). AGL-13 names AGL-09, AGL-12, GRR-01 (line 7). AGL-14 names AGL-07, AGL-12, SHL-12 (line 7). PST-22 names PST-14, PST-17 to PST-21, AGL-12 (line 7). None of these reaches AGL-16 to AGL-19, so the `parallel_with` list does not pair a unit with its dependency.
- **F5. Module.** `modules/agent-loop.md`: line 31 (the AGL-15 node of the graph); line 54 (`Writes`: every agent write and every draft, entity or graph output becomes a pending change; the only direct writes go to `logs/`); lines 60 to 63 (testing principles: external behaviour, the composed app with the mock); line 66 (system seam: the "accept change" step with the Project store); line 82 (the claims artefact lives in `logs/`).
- **F6. README.** `units/README.md` line 64 (`blocked_by` is the source of truth; `unblocks` is its exact inverse; `parallel_with` is symmetric), line 69 (a phase closes when its gate unit is merged), line 113 (the `phase:pending-writes` row), line 139 (testing convention).
- **F7. Agent code on main, the overlay and the run end.** `apps/api/src/modules/agent-loop/tools/write-overlay.ts` lines 15 to 55 (the class; it holds text only; `capture` 25 to 27; `put` 40 to 49). `apps/api/src/modules/agent-loop/tools/builtin-tools.ts`: the `write_file` definition at line 202, the `overlay.put` at line 238; the `edit_file` `overlay.put` at line 301; the zero- and two-match messages at lines 57 and 59. `apps/api/src/modules/agent-loop/agent-run.ts`: `requestEnd` at 175 and 179; `finish` at 445 to 466 (`groundDrafts` at 453, `flushWrites` at 454, `pendingChangeIds` at 461, `emit('run-ended')` at 464); `groundDrafts` at 471; `flushWrites` at 498 (`deps.propose` at 504; `pendingChangeIds.push` at 521); `baseFor` at 538 to 544.
- **F8. Routing on main.** `apps/api/src/modules/agent-loop/tools/output-routing.ts`: `routedFolder` lines 9 to 20; `checkGraph` lines 39 to 53 (the issues are at `/graph/...` paths). Used by `apps/api/src/modules/agent-loop/tools/narrative-tools.ts` at line 286 (`routedFolder`) and line 370 (`checkGraph`).
- **F9. Direct writes to logs.** `apps/api/src/modules/agent-loop/transcript-writer.ts` line 93 (`files.appendLog`). `apps/api/src/modules/agent-loop/grounding-engine.ts` lines 149 to 153 (`this.files.write` to `GROUNDING_ARTEFACT_PATH_PREFIX` + target + suffix). `packages/contracts/src/agent-loop/constants.ts` lines 82 and 83 (`logs/grounding/` and `.json`). `apps/api/src/modules/project-store/files.service.ts` line 272 (`write`) and 436 (`appendLog`).
- **F10. Accept route and body.** `packages/contracts/src/project-store/routes.ts` line 36 (`PROJECT_PENDING_ROUTE`) and line 38 (`PROJECT_PENDING_ACCEPT_ROUTE`). `apps/api/src/modules/project-store/pending.controller.ts` line 40 (comment: the body is optional), line 41 (`@Post` accept), line 46 (`pendingDecisionSchema.optional()`), line 49 (`body ?? {}`). `apps/api/src/modules/project-store/pending.service.ts` line 173 (`accept`). `packages/contracts/src/project-store/pending.ts` lines 70 to 72 (`pendingDecisionSchema`: optional `content`). Agent stop route: `packages/contracts/src/agent-loop/routes.ts` lines 3 and 4 (`AGENT_RUNS_ROUTE`, `AGENT_RUN_STOP_ROUTE`).
- **F11. The tests that the new file repeats.** `apps/api/test/agent-loop-writes.test.ts`: line 41 (`EXTRACT_MARKER`); 53 to 72 (`settingsText`); 83 to 116 (`openHarness`); 109 (`createTestApp({libraryDir})`, no env); 118 to 127 (`post`); 129 to 133 (`startRun`); 151 to 224 (AC4); 252 (`pendingOfBook`); 262 to 279 (`readUntil`); 281 (`hasEnded`); 284 (`hasResults`); 290 (`stallAt`); 299 (`emptyExtractStep`); 306 (`writeCall`); AC1 at 313 to 370; AC2 at 372 to 427; AC3 at 429 to 526 (the stopped part at 431 to 471; the switched part at 474 to 525). `apps/api/test/agent-loop-output-routing.test.ts`: 54 to 55 (`PACKS_ROOT`); 62 to 81 (`settingsText`); 92 to 97 (`OpenOptions`); 100 to 135 (`openHarness`, `packs` required in its type); 155 to 164 (`post`); 166 to 170 (`startRun`); 173 (`readUntilEnded`); 193 (`eventsOf`); 200 (`get`); 210 to 217 (`pendingOfBook`); 225 to 238 (`ChatBody`, `chatBodies`); 380 to 384 (`toolContents`); 387 to 390 (the graph constants); AC2 at 392 to 481; AC3 at 483.
- **F12. Test app defaults.** `apps/api/test/create-test-app.ts` line 11 (`env` merges over the base); lines 79 to 81 (the base sets `SCRIBA_PACKS_DIR` to `<library>/packs`, which the routing test overrides with its `env`); line 85 (watcher off, not used by C1).
- **F13. Timeouts.** `apps/api/vitest.config.mts` line 9 (`testTimeout: 20000`). `apps/api/test/setup-auth-localapi.test.ts` line 148 (`}, 60000);`, a third-argument timeout).
- **F14. The journey on main.** `e2e/specs/journey.e2e.ts`: line 4 (imports); lines 7 to 10 (`pending` helper); line 12 (test title); lines 209 to 279 (agent run; the transcript path is `demo-book/logs/agent-runs`, lines 269 to 273); line 281 (owner comment `// Owner: Project store review, M3 (PST-22; AGL-15).`); lines 282 to 410 (accept step: 286 mock URL; 289 draft path; 303 to 323 second provider; 326 to 334 second run; 340 to 366 pending change and disk before accept; 369 to 380 requests `[1, 2, 0]`; 383 to 394 review page; 397 to 408 file and version after accept; 409 `expect(errors)`; 410 end of step); lines 412 to 413 (`manuscript`, the only `pending` call).
- **F15. e2e configuration.** `e2e/playwright.config.ts` line 10 (`testDir: './specs'`), 11 (`testMatch: '**/*.e2e.ts'`), 12 (`globalSetup`), 13 (`workers: 1`), 17 (JSON report at `e2e/test-results/report.json`), 24 (`SCRIBA_E2E_CHROMIUM`). `e2e/harness/global-setup.ts` line 21 (`buildWorkspaces`) and lines 60 to 67 (builds each workspace with `npm run build -w`, contracts first).
- **F16. Scenario.** `e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json` (42 lines): the extract matcher `Task: extract claims.` (line 6), the intent matcher `tighten chapter 1` (line 16), and the `lastMessageRole: tool` matcher (line 33).
- **F17. The known failure.** `e2e/specs/tools-preview.e2e.ts` line 167 (`test('TRG-05 C2: …')`). `plans/DECISIONS.md` line 5506 (PST-19 review: main already fails at this test).
- **F18. PST-22 on main.** `git log --oneline -20` shows `4f24417 feat(PST-22): accept the agent's change in the e2e journey, and the review gate tests` and `94d6bc8 docs(PST-22): mark the acceptance criteria and set the plan to done`. `plans/PST-22.md` line 2 (status `done`). `plans/DECISIONS.md` lines 5565 to 5573 (PST-22 review, APPROVED).
- **F19. PST-22 status.** `units/PST-22-review-gate.md` (criteria, read in full); `plans/PST-22.md` line 2 (status `done`).
- **F20. Precedent files.** `apps/api/test/project-store-review-gate.test.ts` (PST-22's gate file; the `*-gate.test.ts` names in `apps/api/test/`: `providers-gate.test.ts`, `setup-flow-gate.test.ts`, `token-guard-gate.test.ts`, `tool-registry-loader-gate.test.ts`, `project-store-files-gate.test.ts`). `plans/PST-22.md` section 1b, P1.
- **F21. Build of the contracts for the API tests.** `plans/PST-22.md` section 3, step 1 (the same `npm run build -w @bbartolome/scriba-contracts`), and `apps/api/package.json` line 7 (`test` runs `npm run build && vitest run`).
- **F22. Other draft and planned plans.** Status lines: `plans/SAU-20.md` `planned`, `plans/SAU-22.md` `draft`, `plans/TRG-14.md` `planned`; no other plan has a draft or planned status in its front matter. File tables: `plans/SAU-20.md` lines 60 to 68 and the "not changed" line 70; `plans/SAU-22.md` lines 82 to 91; `plans/TRG-14.md` lines 99 to 110.
- **F23. DECISIONS and AGL-15.** `plans/DECISIONS.md` has no AGL-15 decision entry. The grep of `AGL-15` finds three lines: line 5369 (the rejected AGL-13 option (c), which would have made AGL-15 wait for the grounding engine), and lines 5413 and 5416 (the AGL-16 and AGL-19 `parallel_with` edits, both already applied: `units/AGL-16-grounding-engine.md` line 8 and `units/AGL-19-grounding-sample-draft.md` line 8).

### 8b. Assumed or reported, not checked here

- **A1. The journey passes on main (reported).** `plans/DECISIONS.md` lines 5565 to 5573: the PST-22 reviewer ran `specs/journey.e2e.ts` with `--trace off` and got 2 passed, and the console showed only `pending: manuscript`. This planner did not run it, by rule.
- **A2. The API suite passes on main (reported).** The same DECISIONS entry: the PST-22 implementer reported `Test Files 123 passed (123)` and `Tests 465 passed (465)`. Not re-run here.
- **A3. The AGL-12 and AGL-13 tests pass on main.** Assumed from the DECISIONS entries for AGL-12 (2026-11-16, review APPROVED) and AGL-13 (2026-11-16, merged). Step 2 of section 4 checks it on the branch.
- **A4. Node 26 and npm 11.20.0 are on the implementer's machine.** Assumed from `plans/PLT-02.md` section 3, step 1.
- **A5. A browser is available to Playwright.** Assumed from `plans/PST-22.md` section 3, step 2, which names the cached Chromium and `SCRIBA_E2E_CHROMIUM`.
- **A6. Sub-check (a) stops the stalled run within the 5 s read deadline.** Assumed from `agent-loop-writes.test.ts` AC1 (lines 340 to 342), which relies on the same stop. Step 4 checks it.
- **A7. The new `it` finishes within 60 s.** An estimate: three app boots, one 5 s stall and a few short runs. Step 4 measures it.

## 9. Open points

Each point is a choice the unit or the module leaves open. Each has its options and the one this plan takes.

- **OP1. Who owns the agent-made edit and its accept in the journey.** Options: (A) AGL-15 adds a second agent edit and accept step to the journey; (B) AGL-15 verifies PST-22's step on main and adds nothing (chosen); (C) AGL-15's scope or criterion 2 is reworded to name the journey step. Chosen B. The step is on main (F14), PST-22 owns it (unit line 17; `plans/PST-22.md` section 7, OP1), and a second edit would duplicate it. Option C would change the unit's text, which is not this planner's decision. CEX-20 depends on the journey's step order (section 6), which B keeps.
- **OP2. What "sees it in the draft" means (criterion 2).** Options: (A) the draft file on disk equals the proposed text and holds the new sentence, and its version holds the previous text (journey lines 396 to 408), as the scope says ("the draft (and its version) is on disk", unit line 17) (chosen); (B) add a check in the Shell's draft editor, which is a separate phase (`phase:editor`, README line 82) and no unit of this phase names it. Chosen A.
- **OP3. What counts as "an agent write touching disk" (criterion 1).** Options: (A) every file under the book folder, except `logs/` and `.scriba/` (chosen); (B) every file under the library, including `logs/`. B cannot pass on main: the transcript is appended during the run (`transcript-writer.ts` line 93), and the claims artefact is written by the end-of-run grounding check (`agent-run.ts` line 453, which calls `grounding-engine.ts` lines 149 to 153). Module line 54 makes `logs/` the only direct-write area, and module line 82 says the artefact lives there for Compile & export's preflight. So A is the reading that keeps the module's rule. `.scriba/` holds the Project store's own pending state (`plans/PST-22.md` section 4, G1 step 2), and no agent write reaches it. Chosen A. Any later unit that writes under `logs/` (the grounding artefact is one, `grounding-engine.ts` lines 149 to 153) falls outside this check by the same rule.
- **OP4. The shape of criterion 1's test.** Options: (A) one new gate file with one `it` and three sub-checks, copying the helpers (chosen); (B) name the existing tests as the criterion's tests: `agent-loop-writes.test.ts` AC1, AC2 and AC3 and `agent-loop-output-routing.test.ts` AC2. B is the cheapest, and it adds no code, but it names four tests for one criterion, which breaks the one-test-per-criterion rule. The gate then checks the bundle on one flow on main. Chosen A. The existing tests stay unchanged.
- **OP5. The full e2e suite is not a gate condition.** Options: (A) run the full e2e suite and record its failure; (B) run only the journey with a path filter (chosen); (C) fix `TRG-05 C2` in this unit. The full suite fails on main at `tools-preview.e2e.ts` line 167 (F17). C is not this unit's work, and it would widen the change. Chosen B. The same choice PST-22 made (`plans/PST-22.md` section 7, OP3). The criterion ("the e2e accepts an agent-made change") is about the journey step, so B tests exactly that.
