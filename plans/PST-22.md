---
id: PST-22
status: planned
unit: units/PST-22-review-gate.md
sources: units/PST-22-review-gate.md (33 lines, no change note, read in full); units/README.md (all lines); modules/project-store.md; modules/agent-loop.md (line 66); plans/PLT-02.md (structure); plans/PST-14.md, PST-15.md, PST-16.md, PST-17.md, PST-18.md, PST-19.md, PST-20.md, PST-21.md (code-facing sections and the tests they name); plans/PST-11.md (line 160), PST-34.md (line 151), AGL-08.md, AGL-12.md, AGL-14.md (line 103), AGL-19.md (line 140), PLT-13.md (lines 19, 104 to 139, 265) (file and test references); plans/SAU-19.md, SAU-22.md, TRG-14.md (the planned and draft plans, file lists); units/PST-23-lazy-migrations.md, GRR-06, GRR-08, AGL-15, CEX-20, SHL-19 (unit files, read in full); plans/DECISIONS.md (grep by unit id only: the PST-07 entry at lines 4035 and 4041, and the PST-17 to PST-22 lines, 4891 to 4893, 5499 to 5506); the code, tests, scenarios and sample named in section 8a, read at main a8b00d0. Revision 1 (Opus reviser, 2026-11-17, main b550cd5): also apps/api/src/modules/agent-loop/agent-run.ts (lines 199 to 215, 445 to 482), conversation-history.ts (lines 18 to 49), transcript-reader.ts (lines 244 to 255), grounding-engine.ts (lines 101 to 172), grounding-prompts.ts (lines 8, 9, 16, 32 to 42), apps/web/src/app/features/agent-loop/chat-page.ts (lines 721 to 725), apps/web/src/app/features/project-store/review-page.ts (lines 196 to 213), e2e/fixtures/mock-openai/server.mjs (lines 103 to 139), scenarios/grounding-claims.json and tool-call.json, plans/PLT-13.md (line 145), apps/api/src/modules/project-store/backups.ts (lines 8 to 17), DECISIONS lines 4035 to 4042 and 5499 to 5506
---

# PST-22 plan — review gate: the e2e accept step and the gate tests

Project store, phase `phase:pending-review` (M3). Unit `units/PST-22-review-gate.md`. Written against main `a8b00d0` and revised against main `b550cd5` (`git branch --show-current` prints `main`; `git status --short` prints nothing). Nothing was built, installed, run or changed except this file.

Tags: **D**n is a decision this plan follows (section 1a). **P**n is a small choice this plan makes (section 1b). **OP**n is an open point (section 7). **F**n is a fact checked (section 8a). **A**n is an ASSUMED fact, not checked (section 8b). Criteria are **C1** to **C5** (the five checklist lines of the unit, lines 21 to 25). New tests are **G1** to **G3**.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the README and the done plans

- **D1. Scope.** Turn on the e2e "accept change" step (`e2e/specs/journey.e2e.ts` line 282 at main; the owner comment on line 281 stays, as the live steps keep theirs and PLT-13 counts the `// Owner:` comments, `plans/PLT-13.md` line 145). Accepting the agent's pending change writes the draft and creates a version under `drafts/.versions/<name>/`. Verify the phase checklist on main. No other code changes. Source: unit lines 16 to 18; journey lines 281 and 282 (F13).
- **D2. Five criteria, five tests.** The checklist (unit lines 21 to 25) is kept as written. Each criterion has exactly one test (section 4). No criterion is weakened or removed. Source: unit lines 20 to 25; the planner rules.
- **D3. The demo is manual.** Demo steps 1 to 4 (unit lines 29 to 33) are not criteria. They are run by hand once (step 10). Source: unit lines 29 to 33.
- **D4. Accept.** `POST …/projects/:projectId/pending/:id/accept` takes `{content?}` or no body. It applies `content ?? proposed` after the three-way check, saves the replaced text as a version when the target is a top-level draft, and publishes `pending-resolved` and then `files-changed`. Source: PST-16 D1, D5, D6, D12, D21 (plan lines 15, 19, 20, 26, 35); module line 82; route `routes.ts` line 38; controller `pending.controller.ts` line 41.
- **D5. Conflicts.** A refused accept answers 409 `PROJECT_PENDING_CONFLICT` with `details.reason`. The list computes conflicts in memory and never writes. Source: PST-16 D1, D4, D14 (plan lines 15, 18, 28); module line 46 (GETs never mutate).
- **D6. Refresh and accept anyway.** Refresh is `POST …/pending/:id/refresh`. Accept anyway is `POST …/pending/:id/accept-anyway`, with an optional body. Accept anyway saves the disk bytes first: as a version for a top-level draft, otherwise as a backup under `<project>/.scriba/backups/<stamp>[-n]/<path>`. Conflicts are found by paragraph reach. Source: PST-17 D1, D3, D5, D10, D11 and section 1c (plan lines 18 to 54); routes `routes.ts` lines 42 and 44.
- **D7. Restore.** `POST …/versions/restore` with `{draftPath, id}` saves the current text as a version, then writes the restored text through `FilesService.write`. A restore of a missing draft answers 404 and writes nothing. Source: PST-18 D3, D11, D12, D17, D22 (plan lines 22, 30, 32, 40, 45); route `routes.ts` line 51; controller `draft-versions.controller.ts` line 53.
- **D8. Watcher.** `SCRIBA_WATCHER` defaults to `true` in production. It only refreshes the UI. The API test base env sets it to `false`. Source: PST-19 D3 and R1 (plan lines 15, 87); module lines 78 and 80; `packages/contracts/src/platform/env.ts` line 16; `apps/api/test/create-test-app.ts` line 85 (F1).
- **D9. Active rule.** Accept, refresh, accept anyway and restore need the active project. Propose is allowed into any `ok` project. Source: module line 48 (the exception for propose); PST-16 D8; PST-17 D1; PST-18 D9.
- **D10. Same-origin fold.** Two open changes fold when the target path, `origin.kind`, `origin.runId` and (for `recipe-run`) `origin.nodeId` match. The change keeps its `id`, `createdAt`, `kind` and `capturedBase`, and takes the later `proposed`. Source: PST-15 decision 9 (plan line 21).
- **D11. Tests.** External behaviour only. API tests boot the composed app through `createTestApp` against a temp library, and no fixture reads `examples/`. A test that involves a model uses the mock OpenAI server. Source: README line 139; module lines 57 and 59.
- **D12. Agent writes are pending.** The agent's `write_file` and `edit_file` never touch disk. A run proposes once per touched path when it ends, with origin `agent-run`. Source: README line 137; AGL-12 unit lines 18 to 21; module line 79; `builtin-tools.ts` lines 203 and 247 (F12).
- **D13. Events.** Events are `{module, type, data}` on `/events`, with no replay. Source: README line 134.
- **D14. A second run in the chat continues the conversation.** The chat page sends its `conversationId` with each later Send (`chat-page.ts` lines 721 to 725), and a run replays the finished runs of its conversation before its intent (`agent-run.ts` lines 201 to 215; `conversation-history.ts` lines 18 to 49; `transcript-reader.ts` lines 244 to 255). The mock's `turnIndex` counts the assistant messages of the request (`server.mjs` lines 117 to 121), so in the accept step's run it starts at 3, not 0. The new scenario matches on `lastMessageContent` and `lastMessageRole` instead (P4).
- **D15. A run that edits a draft runs the automatic grounding check at its end.** `finish` calls `groundDrafts` before it files the writes (`agent-run.ts` lines 452 to 454, 471 to 482). The check sends an extract request to the same provider, with the last user message starting `Task: extract claims.` (`grounding-engine.ts` lines 163 to 171; `grounding-prompts.ts` line 8), and retries up to 3 times (line 16) when the reply is not a claim list. An empty list `{"claims":[]}` is valid (`grounding-prompts.ts` lines 32 to 42) and sends no judge request. A failed check does not stop the run, but the scenario answers it so that the run is clean (P4). Source: AGL-17 (done); `scenarios/grounding-claims.json` (the same matcher).

### 1b. Choices this plan makes (the unit leaves them open)

- **P1. One new gate test file.** The five criteria are bundles. Their parts are tested in other files: PST-15 P1 to P3 (titles at `project-store-pending-propose.test.ts` lines 113, 151 and 211), PST-16 A1 to A5 (plan lines 153 to 157), PST-17 T1 to T3 and X6, and PST-18 V2. One test per criterion needs one new file, `apps/api/test/project-store-review-gate.test.ts`, with G1 (C1), G2 (C2) and G3 (C3). Its helpers are copied from `project-store-pending-apply.test.ts` (lines 39 to 160), as PST-17 section 4 did, so no existing test file changes.
- **P2. Criterion 4 uses the existing e2e test.** The test `the review queue fits 390 by 844: list, diff, accept and reject work` in `e2e/specs/review-phone.e2e.ts` (line 47, viewport at line 8) is the one test for C4. It is not edited.
- **P3. The accept step drives the review page.** The step opens `/projects/demo-book/review`, clicks the row's Open button, then Accept, with the names used by `review-phone.e2e.ts` (lines 136 to 156). The disk and API checks are the assertions.
- **P4. The agent edit for the accept step.** The step's agent run uses a new mock scenario, `e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json` (section 2). The model's first reply in the run is one `edit_file` on `drafts/born-to-it.md`, the chapter 1 draft that AGL-19 (plan line 140) and PST-11 (plan line 160) name for PST-22. Its reply after the tool result is a final text. The run-end grounding extract gets an empty claim list (D15). The steps match on the last message, not on `turnIndex`, because the run continues the agent-run step's conversation (D14); the scenario is thus correct with or without the replayed history, and with or without a later "New conversation" in the step. The `old` text is the sentence on line 13 of `examples/nonfiction/drafts/born-to-it.md`, which occurs once (`grep -c` prints 1). The `new` text is `This chapter sets up the harder question.` The word count of the file goes from 305 to 302 (F14), which CEX-20 needs (unit line 17 of CEX-20).
- **P5. A second provider.** The accept step creates a provider labelled `Mock edit`, pointed at the new scenario, and makes it the app default. It uses the same calls as the agent-run step (journey lines 213 to 236). The first provider stays as it is.
- **P6. "The first version" (demo step 4).** This plan reads it as the oldest version, the one the demo's accept of step 2 wrote. The PST-21 hand-over note (plan line 136) asked for this choice. On the demo's path there is one version, so both readings give the same result.
- **P7. One part.** The plan covers one unit and one PR, with five tests. It is one part (section "Review parts").
- **P8. The restore test seeds its version on disk.** G3(i) writes the version file into the temp library, as PST-18's V2 does (plan section 4).
- **P9. The accept-anyway backup location is asserted as on main.** G3(f) asserts `<project>/.scriba/backups/`, as PST-17 section 1c settles and the code on main does (`apps/api/src/modules/project-store/backups.ts` lines 8 to 17). OP2 is decided (section 7).

## 2. Files to create or change

Only the paths below change, plus the two files of step 11.

| Path | New or modified | Purpose |
|---|---|---|
| `apps/api/test/project-store-review-gate.test.ts` | new | Tests G1 (C1), G2 (C2) and G3 (C3). Helpers are copied from `project-store-pending-apply.test.ts` (lines 39 to 160), not imported. Every test builds its own temp library with `bookLibrary()` and removes it in a `finally`. |
| `e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json` | new | The scenario of the accept step (P4, step 3). Three steps in the form of `summarize-outline.json`: the grounding extract (an empty claim list), the intent (one `edit_file` call), and the final text after the tool result. Matched on `lastMessageContent` and `lastMessageRole` (D14, D15). |
| `e2e/specs/journey.e2e.ts` | modified | Replaces line 282 (`await test.step('accept change', () => pending(testInfo, 'accept change'));`) with the live accept step of section 4 (C5). The owner comment on line 281, the test title, the other steps and the `pending` helper stay. After the change one `pending(testInfo, …)` call remains, for `manuscript` (line 285). |
| `units/PST-22-review-gate.md` | modified, in the docs commit (step 11) | The five criteria are ticked `[x]`, as PST-17 and PST-21 did. |
| `plans/PST-22.md` | modified, in the docs commit (step 11) | Status `done`. |

Not changed (checked): `packages/contracts/**` (every route and schema already exists; `routes.ts` lines 36 to 51, F7); `apps/api/src/**` (no code change); `apps/web/**` (no web file changes, so F4 has no overlap to resolve); `e2e/harness/global-setup.ts` (the API env keeps no `SCRIBA_WATCHER`, F1); `apps/api/test/create-test-app.ts`; `e2e/fixtures/mock-openai/server.mjs` (it loads every `.json` in the folder, F15); the existing test files; `plans/DECISIONS.md` (only the orchestrator writes it); every other unit file.

## 3. Procedure

Run from the repository root in a worktree of `main` on branch `unit/PST-22`. Use a new path that the orchestrator gives, never a path under `/Users/bbartolome/workspace/scriba-prototype-wt/` that belongs to another unit. Do not push. Stage explicit paths only (`git add -- <paths>`). Record `node -v` (`v26.x`) and `npm -v` (`11.20.0`) with each result.

**Step 0. Worktree.** `git worktree add -b unit/PST-22 <path> main`. Expected: `git status --short` prints nothing, and `git log --oneline -1` prints the main head at the start (`b550cd5` when this plan was revised, or a later commit of documents only).

**Step 1. Install and build.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0.

**Step 2. Baseline.** From `apps/api`, run `npx vitest run test/project-store-pending-propose.test.ts test/project-store-pending-list.test.ts test/project-store-pending-apply.test.ts test/project-store-pending-refresh.test.ts test/project-store-draft-versions.test.ts test/project-store-files-gate.test.ts test/invariant-get-head.test.ts test/invariant-mutation-guard.test.ts`. Expected: all pass. From the worktree root, run `npm run e2e -w @bbartolome/scriba-e2e -- journey review-phone`. If Playwright cannot find a browser, set `SCRIBA_E2E_CHROMIUM` to the cached Chromium first (the PLT-13 and SAU-08 note). Expected: exit 0; the journey has two `pending` annotations, `accept change` and `manuscript`; record the journey's duration from `e2e/test-results/report.json`.

**Step 3. The mock scenario.** Create `e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json` with three steps, in this order, in the `{steps: [{match, reply}]}` form of `summarize-outline.json` and `grounding-claims.json`. The mock takes the first step whose matchers all hold (`server.mjs` lines 133 to 139), so the order matters. No `turnIndex` matcher is used (D14).
- Step index 0 (the grounding extract, D15): match `{endpoint: "chat", lastMessageContent: "Task: extract claims."}`; reply `{kind: "stream", deltas: ["{\"claims\":[]}"]}`.
- Step index 1 (the intent): match `{endpoint: "chat", lastMessageContent: "tighten chapter 1"}`; reply `{kind: "toolCalls", calls: [{name: "edit_file", argumentChunks: [<one chunk>]}]}`. The chunk is the JSON text of the object with `path` `drafts/born-to-it.md`, `old` `The rest of this chapter sets up the harder question.` and `new` `This chapter sets up the harder question.`.
- Step index 2 (after the tool result): match `{endpoint: "chat", lastMessageRole: "tool"}`; reply `{kind: "stream", deltas: ["I tightened the last sentence of chapter 1."], chunkDelayMs: 150}`.

Expected: the file is valid JSON, and the mock server loads it at its next start (F15). No existing scenario file changes.

**Step 4. The gate tests.** Create `apps/api/test/project-store-review-gate.test.ts` with G1, G2 and G3 (section 4). From `apps/api`, run `npx vitest run test/project-store-review-gate.test.ts`. Expected: 3 tests pass. Run it twice more, and record the three results.

**Step 5. The accept step.** In `e2e/specs/journey.e2e.ts`, replace line 282 (`await test.step('accept change', () => pending(testInfo, 'accept change'));`; anchor by text) with the step of section 4 (C5). Keep the owner comment on line 281 (`// Owner: Project store review, M3 (PST-22; AGL-15).`), the test title and every other line. Then run `npx prettier --write e2e/specs/journey.e2e.ts e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json`. Expected: each file is reported as written, and exactly one `pending(testInfo, …)` call remains (for `manuscript`).

**Step 6. The journey.** Run `npm run e2e -w @bbartolome/scriba-e2e -- journey`. Expected: exit 0; the list reporter shows the test as passed; `e2e/test-results/report.json` holds exactly one `pending` annotation, `manuscript`; the accept step passes. Record the duration. (The accept step's first statement already extends the test timeout by 30 s, section 4 C5 step 0, because the default 30 s timeout (A2) covers the whole journey and the step adds a second run and up to four 15 s waits.)

**Step 7. The phone test.** Run `npm run e2e -w @bbartolome/scriba-e2e -- review-phone`. Expected: exit 0. This is C4, and the file is not changed.

**Step 8. Unit and lint gates.** Run `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-api`, `npm run lint -w @bbartolome/scriba-api`, and `npx prettier --check apps/api/test e2e/specs e2e/fixtures/mock-openai/scenarios`. From the root, run `npm run lint`, which also runs `lint:examples` (F16). Expected: each exits 0. Record `git status --short`, which must show only the paths of section 2 and the paths of step 11.

**Step 9. The full e2e (record only).** Run `npm run e2e`. Expected: the journey and `review-phone` pass. If another spec fails, record its name and line. The known failure `TRG-05 C2` at `e2e/specs/tools-preview.e2e.ts` line 167 may appear (DECISIONS line 5506, PST-19 review, 2026-11-17). It is not PST-22's, and it does not decide C5 (OP3, decided). Any other failure that the journey or `review-phone` does not show is recorded with its name and line, and is not fixed in this unit.

**Step 10. The demo (manual, not gating).** Run demo steps 1 to 4 once on a local stack with the default settings, the watcher on. Record each step's result in the PR. Step 4 runs on tablet or desktop, because restore is not offered on the phone class (PST-21 I4, plan line 135). Expected: each step is done. No assertion is attached to the demo.

**Step 11. Commits.** Code commit: `git add -- apps/api/test/project-store-review-gate.test.ts e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json e2e/specs/journey.e2e.ts`, then `git commit -m "feat(PST-22): accept the agent's change in the e2e journey, and the review gate tests" -- <those three paths>`. Docs commit: tick the five criteria in `units/PST-22-review-gate.md` and set `plans/PST-22.md` to `status: done`, then `git commit -m "docs(PST-22): mark the acceptance criteria and set the plan to done" -- units/PST-22-review-gate.md plans/PST-22.md`. Expected: two commits on `unit/PST-22`, and no `git add -A`.

**Step 12. Verify on main (after the merge; run by the orchestrator).** On the merged main, run step 4 (`npx vitest run test/project-store-review-gate.test.ts` in `apps/api`), step 6 (the journey) and step 7 (`review-phone`). Expected: all pass. This is the unit's "verify the phase checklist on main" (unit line 18).

## 4. Acceptance criteria and tests

The five criteria, one test each. The seams are the composed app through `createTestApp`, with the kit module `pendingKitModule()` for propose (`project-store-pending.kit.ts` lines 22 to 52); the real routes for everything else; `GET /events` read with `openSse` (`sse.ts` line 31); temp libraries from `bookLibrary()` (`project-store-files.kit.ts` line 44); and the mock OpenAI server and the real browser for C5.

| Criterion (unit line) | Test | Where | Pass condition |
|---|---|---|---|
| C1 "Propose never touches disk; same-origin fold; non-active `ok` project propose — pass." (21) | **G1** | `apps/api/test/project-store-review-gate.test.ts` | Steps 2 to 4 below all hold. |
| C2 "Listing with a host edit is side-effect free." (22) | **G2** | same file | Steps 6 to 8 below all hold. |
| C3 "Accept with edited content; apply with version; `base-changed` refusal; refresh clean/overlapping; accept-anyway backup; validator rejection; restore saves current first — pass." (23) | **G3** | same file | Sub-checks (a) to (i) all hold. |
| C4 "Review queue works at phone width." (24) | the existing test `the review queue fits 390 by 844: list, diff, accept and reject work` | `e2e/specs/review-phone.e2e.ts` line 47 (not edited) | Step 7 of section 3 exits 0. |
| C5 "The e2e "accept change" step passes." (25) | the existing test `journey: setup, project from sample, agent run, accept change, manuscript` with the live accept step | `e2e/specs/journey.e2e.ts` line 12 | Step 6 of section 3 exits 0; the accept step has no `pending` annotation; `manuscript` is still pending. |

### G1 (C1): propose and fold

Name: `G1: a propose leaves the target unchanged, folds a second propose from the same origin, and lands in a non-active ok project's queue`.

1. `const fixture = bookLibrary()`. Before the boot, `addOkProject(fixture.library, 'second')` (`project-store-active.kit.ts` line 71; as `project-store-pending-propose.test.ts` line 214 does). Boot `createTestApp({libraryDir: fixture.library, modules: [pendingKitModule()]})`. In `book`, `sources/outline.md` is `# Outline\n` (the fixture writes it, `project-store-projects.kit.ts` line 48). Record the sha256 of its bytes. The app is closed and `fixture.remove()` runs in a `finally`; the same holds for G2 and G3.
2. Propose `book`, path `sources/outline.md`, content `# Outline\n\nFirst proposal.\n`, origin `{kind: 'agent-run', runId: 'run-g1'}`.
3. Propose the same path and origin with content `# Outline\n\nSecond proposal.\n`.
4. Propose `second`, path `notes.md`, content `Note\n`, origin `{kind: 'agent-run', runId: 'run-g1-second'}`, while `book` is the active project.

Expected: step 2 answers 200 with `status` `pending`. The file's sha256 equals the recorded one, and `book/.scriba/pending/` holds exactly one `.json` file. Step 3 answers 200 with the same `id` as step 2, the same `capturedBase` as step 2, and `proposed` equal to `# Outline\n\nSecond proposal.\n`. `book/.scriba/pending/` still holds one file. Step 4 answers 200. `second/.scriba/pending/` holds exactly one `.json` file, and `second/notes.md` does not exist. (PST-15 P1, P2 and P3; decision 9.)

### G2 (C2): listing side effects

Name: `G2: listing after a host edit returns the conflict, leaves .scriba/pending/ byte-identical, and publishes nothing`.

1. `bookLibrary()`, then boot `createTestApp({libraryDir, modules: [pendingKitModule()]})` with no other env. The base env turns the watcher off (`create-test-app.ts` line 85).
2. `sources/outline.md` is `# Outline\n`. Propose content `P\n` to it with origin `{kind: 'agent-run', runId: 'run-g2'}`.
3. Open `GET /events` with `openSse`, and read the hello block.
4. The host writes `H\n` to `book/sources/outline.md`.
5. Take a snapshot of `book/.scriba/pending/`: every file, recursively, with its name and sha256.
6. `GET /api/project-store/projects/book/pending`.
7. Take the snapshot again.
8. Read the stream with `next(500)`.

Expected: step 6 answers 200, and its one change has `conflict.reason` `base-changed`. The snapshot of step 7 equals the one of step 5. Step 8 rejects with a timeout, so nothing was published. The file still holds `H\n`. (PST-16 A4, plan line 156.)

### G3 (C3): the accept, refresh, backup, validator and restore checks

Name: `G3: accept with edited content, apply with a version, base-changed refusal, refresh clean and overlapping, accept-anyway backup and version, validator rejection, and restore saves the current text first`.

One boot and one temp library. Each sub-check uses its own path. The app is closed and the library removed in a `finally`.

- **(a) Accept with edited content (PST-16 A1).** `sources/a.md` is `A0\n`. Propose `A1\n`. Accept with `{content: 'Edited\n'}`. Expected: 200, `status` `accepted`, the file is `Edited\n`, and the open folder holds no file for the change.
- **(b) Apply with a version (PST-16 A2).** `drafts/ch01.md` is `Old\n`. Propose `New\n` (kind `modify`). Accept with no body. Expected: 200, the file is `New\n`, and `drafts/.versions/ch01.md/` holds exactly one file, named `^\d{8}T\d{9}Z\.md$`, whose bytes are `Old\n`.
- **(c) base-changed refusal (PST-16 A3).** `sources/c.md` is `C0\n`. Propose `C1\n`. The host writes `C2\n`. Accept with `{}`. Expected: 409 `PROJECT_PENDING_CONFLICT` with `details.reason` `base-changed`. The file is `C2\n`, and the change is still open with `conflict.reason` `base-changed`.
- **(d) Refresh, clean (PST-17 T1).** `sources/para.md` is `# Outline\n\nFirst point.\n\nSecond point.\n\nThird point.\n`. Propose the same text with `Third point.` changed to `Third point, revised.`. The host writes `First point, host edit.` in place of `First point.`. `POST …/refresh`. Expected: 200, `conflict` null, and `proposed` equal to `# Outline\n\nFirst point, host edit.\n\nSecond point.\n\nThird point, revised.\n`. Then accept with `{}`: the file equals `proposed`.
- **(e) Refresh, overlapping, same paragraph (PST-17 X10; demo step 3).** `sources/alpha.md` is `# Outline\n\nAlpha one.\nAlpha two.\n\nBeta.\n`. Propose the same text with `Alpha two.` changed to `Alpha two, agent.`. The host writes `Alpha one, host.` in place of `Alpha one.`. `POST …/refresh`. Expected: 200, `conflict.reason` `base-changed`, and `proposed`, `capturedBase` and `updatedAt` equal their values before the refresh.
- **(f) Accept-anyway backup (PST-17 T3b).** `sources/back.md` is `O\n`. Propose `P\n`. The host writes `H\n`. Accept with `{}`: 409, as in (c). Then `POST …/accept-anyway` with no body. Expected: 200, `status` `accepted`, the file is `P\n`, `book/.scriba/backups/` holds exactly one folder, and `<that folder>/sources/back.md` is `H\n`.
- **(g) Accept-anyway version (PST-17 T3a).** `drafts/ch02.md` is `Old2\n`. Propose `New2\n`. The host writes `Host2\n`. Accept anyway with no body. Expected: 200, the file is `New2\n`, and `drafts/.versions/ch02.md/` holds exactly one file, whose bytes are `Host2\n`.
- **(h) Validator rejection (PST-15 P5; PST-17 D7).** `POST /api/project-store-test/pending/register-graph-validator` (the kit registers the `graphs/*.json` check, which needs `schemaVersion` 1). Propose `graphs/a.json` with content `{"schemaVersion": 2}\n`. Expected: 422 `PROJECT_VALIDATION_FAILED`, and no change file is created.
- **(i) Restore saves the current text first (PST-18 V2).** `drafts/ch03.md` is `Current\n`. Write `drafts/.versions/ch03.md/20261104T231500123Z.md` with `Old\n` (P8). `POST …/versions/restore` with `{draftPath: 'drafts/ch03.md', id: '20261104T231500123Z.md'}`. Expected: 200 with `{draftPath, id, content: 'Old\n'}`, and the draft's bytes are `Old\n`. `GET …/versions?draftPath=drafts/ch03.md` lists two entries. The first (newest) is not the seeded id, and its read gives `Current\n`.

### C5: the accept step of the journey

The step replaces journey line 282; the owner comment on line 281 stays above it. It runs after the agent-run step, in the same test and on the same chat page, on `demo-book` (the copy the project-from-sample step made, which is the active project).

0. The first statement of the step's callback is `testInfo.setTimeout(testInfo.timeout + 30_000);` (the AGL-08 rule, its plan line 134). Collect `pageerror` events into a list, as the agent-run step does.
1. Read `<SCRIBA_E2E_LIBRARY>/demo-book/drafts/born-to-it.md`. Call the text `before`.
2. Create a provider with label `Mock edit`, kind `openai-compatible`, `baseURL` `${mock}/scenario/edit-chapter-one/v1`, model `mock-model`, and the numeric settings of journey lines 223 to 227. Send it with the origin header (`http://127.0.0.1:8080`) and expect 201. Then `POST /api/providers/app-default` with `{providerId: <its id>, model: 'mock-model'}` and the origin header, and expect 200.
3. Fill the `Intent` textbox with `tighten chapter 1`, and click `Send`. Expect the `Messages` region to contain `I tightened the last sentence of chapter 1.` (15 s), and the `Stop` button to have count 0 (15 s). The run ends after its grounding extract (D15), so the count 0 also means the change is filed.
4. `expect.poll` (15 s) on `GET /api/project-store/projects/demo-book/pending` until `changes` holds exactly one entry. Its `targetPath` is `drafts/born-to-it.md`, its `status` is `pending`, its `conflict` is null, and its `origin.kind` is `agent-run`. Keep its `proposed`.
5. The file on disk still equals `before`. Nothing is written before the accept.
6. `GET ${mock}/__mock/scenarios/edit-chapter-one/requests`: the `step` of each record whose `endpoint` is `chat`, in order, is `[1, 2, 0]` (intent, tool result, grounding extract). This proves that each request matched its step (an unmatched request records `step: null`, `server.mjs` line 299).
7. Go to `/projects/demo-book/review`. Expect the heading `Review`. In the `li` whose `code` element is exactly `drafts/born-to-it.md`, click `Open`, and then `Accept` (the labels of `review-phone.e2e.ts` lines 136 to 156; the Open button has no width condition, `review-page.ts` lines 196 to 213).
8. Expect the text `No open changes.` to be visible.
9. The file equals the `proposed` text of step 4, and it contains `This chapter sets up the harder question.` and no longer contains `The rest of this chapter sets up the harder question.`.
10. `drafts/.versions/born-to-it.md/` holds exactly one file, named `^\d{8}T\d{9}Z\.md$`, whose text equals `before`.
11. The `pageerror` list is empty.

Expected: the step passes. The report holds exactly one `pending` annotation, `manuscript`.

## 5. Downstream agreement

- **GRR-08 (engine gate; blocked_by line 7; criteria lines 17 to 19).** Needs `phase:pending-review` closed, which PST-22's merge does. PST-22 changes no code that GRR-08 uses. Met.
- **GRR-06 (output nodes; blocked_by line 7; criterion line 30).** Needs propose with origin `recipe-run` (PST-15, on main) and the accept refusal `base-changed` (PST-16 D1, pinned by G3(c)). PST-22 changes no API code. Met.
- **AGL-15 (pending-writes gate; blocked_by line 7; scope line 17; criterion line 21).** Its e2e wording asks for the agent's edit, its accept, and the draft and version on disk. C5 already makes that check on main once PST-22 merges, so AGL-15's e2e part holds before AGL-15 starts; AGL-15's planner verifies it on main and adds to the same step only what AGL-15 needs beyond it (its unit line 17: "Coordinate with PST-22, which owns the accept assertion"). AGL-15's text stays correct as written, so no unit change (OP1, decided). The step's owner comment already names AGL-15 (journey line 281).
- **CEX-20 (manuscript gate; blocked_by line 7; scope line 17; done-when line 22).** Needs the accepted file to be a top-level draft of the nonfiction sample, with a changed word count, and then its manuscript step. PST-22 accepts `drafts/born-to-it.md`, which goes from 305 to 302 words (F14). Met, if CEX-20's check reads that file. The manuscript step stays pending until CEX-20, which inserts its block after the accept step (lines 284 and 285 at main; they move down by the length of the new step).
- **SHL-19 (polish gate; blocked_by line 7; scope line 18; demo step 4 line 31).** Needs the phase closed. Its phone review check is PST-20's `review-phone.e2e.ts` test, which PST-22 does not change. Met.
- **PST-23 (migrations; parallel_with line 8).** Its unit line 23 names migration backups only (F2, OP2). It shares no file with PST-22. The two can merge in either order.

## 6. Other draft and planned plans, and done plans that touch the same files

The plans with status `draft` or `planned` are `plans/SAU-19.md` (planned, line 3), `plans/SAU-22.md` (draft, line 3) and `plans/TRG-14.md` (planned, line 3). A grep of the plans for a draft or planned status finds only these three (F17). Each is checked against the files of section 2.

- **SAU-19 (planned).** Its K13 row (line 55) names `e2e/specs/setup-phone.e2e.ts` lines 141 to 146, and its setup-auth code and tests. It shares no file with PST-22. Either merge order is correct.
- **SAU-22 (draft).** Its guard and dev-mode files. Its plan says `create-test-app.ts` is not changed (lines 93 and 239), so it shares no file with PST-22. Either merge order is correct.
- **TRG-14 (planned).** Its web tool-editor files, `apps/web/package.json`, the lockfile, and a new `e2e/specs/tools-editor.e2e.ts` (its file table, line 110). It shares no file with PST-22. Either merge order is correct.
- **Done plans on `e2e/specs/journey.e2e.ts`.** AGL-08 (the agent-run block, lines 209 to 279), PST-09 (project from sample), SAU-08 and SAU-16 (setup), and PLT-13 (which created the file). PST-22 edits only line 282, which AGL-08 names as disjoint (AGL-08 plan line 165). AGL-08's step 6 (plan line 134) expects two `pending` annotations, `accept change` and `manuscript`. After PST-22 there is one, `manuscript`. The expectation is in a done plan, not in a repository test: no file under `e2e/` reads the annotations (`grep -rn annotation e2e --include=*.ts` finds only journey lines 8 and 22), so nothing fails. The agent-run step's own checks (the `summarize-outline` requests `[0, 1, 2]` and the one transcript) run before the accept step and are not changed by it; the accept step's run writes a second transcript later, which no check reads.
- **Units with no plan that touch the same journey file.** CEX-20 (manuscript block, lines 284 and 285) and AGL-15 (accept block; OP1). Neither has a plan file or a `unit/` branch at b550cd5.

## 7. Open points

All three are decided by the reviser (revision 1, 2026-11-17). None goes to the Navigator, and no unit file changes.

- **OP1. Who owns the agent edit in the accept step. Decided: PST-22 adds it (the planner's option A), with no reword of AGL-15.** PST-22's scope (unit line 17) says the step accepts "the agent's pending change", and C5 needs the step to pass on main, which a change made by `propose` alone would not meet (option B contradicts unit line 17 and module line 9). AGL-15 is blocked by PST-22, so it cannot add the edit first. AGL-15's scope (line 17) and criterion 2 (line 21) stay correct word for word once PST-22 merges: the e2e does accept an agent-made change, and AGL-15 "coordinates with PST-22". No part of AGL-15 is in the way of this plan, so the YAGNI test's first condition fails and the reviser rules allow no reword or loosening of AGL-15. The agent-loop module line 66 is a module file and is not changed by a reviser; it stays true ("with the Project store"). Hand-over for AGL-15's planner: its e2e part is on main; do not add a second agent edit to the journey.
- **OP2. Where accept-anyway backups go. Decided: `<project>/.scriba/backups/<stamp>[-n]/<path>` (option A).** PST-17 settled it (section 1c; D3, D11), PST-17 is done, and the code on main writes there (`backups.ts` lines 8 to 17). DECISIONS line 4041 (point 6) names PST-23's migration backups only. C3's text ("accept-anyway backup") names no location. Option B would reopen a done unit's decision that code on main uses, which no reviser action allows and nothing needs. G3(f) asserts the location on main.
- **OP3. What "passes" means for criterion 5. Decided: the journey test alone (option A).** C5 is "The e2e "accept change" step passes" (unit line 25): it names one step of the journey, not the whole e2e run. Step 6 runs that test, and step 9 records the full run. The known `TRG-05 C2` failure (`tools-preview.e2e.ts` line 167; DECISIONS line 5506) is outside this step and outside PST-22's files. No criterion is weakened: the step must pass as written.

## 8. Facts checked and assumed

### 8a. Checked (file and line, or the command)

- **F1 (watcher, CONFIRMED).** `apps/api/test/create-test-app.ts` line 85 sets `SCRIBA_WATCHER: 'false'`, with the reason in the comment at line 84 ("Off so host writes in tests give no watcher events"). The production default is `packages/contracts/src/platform/env.ts` line 16, `SCRIBA_WATCHER: 'true'`. `apps/api/src/modules/platform/boot/env.ts` lines 64 and 65 define `defaultOf` as `SCRIBA_ENV_DEFAULTS[name]`, and lines 123 to 127 read `SCRIBA_WATCHER` with `defaultOf`. `e2e/harness/global-setup.ts` lines 77 to 82 give the API child only `PATH`, `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR`. So the e2e runs with the watcher on. PST-19 F30 says the same.
- **F2 (PST-17 reviser decisions, PARTLY CONFIRMED).** (1) NOT CONFIRMED as stated: DECISIONS line 4041 names PST-23's backups, and PST-23's unit line 23 defines them as migration backups. No text moves accept-anyway backups. PST-17 section 1c (lines 42 to 54) and D3 (line 20) keep them at `.scriba/backups/`, and `backups.ts` line 17 writes there. See OP2 (decided). (2) CONFIRMED: PST-17 line 167 (open point 2) gives no server field; the body is `pendingDecisionSchema` (`packages/contracts/src/project-store/pending.ts` line 70). (3) CONFIRMED: PST-17 D5 (lines 25 to 31, paragraph reach), test X10 (line 134), open point 3 (line 168).
- **F3 (PST-18 reviser decisions, CONFIRMED).** No reserved-path mode, following PST-16 D18: PST-18 D7 (line 26). A restore of a missing draft is a 404 with no write: D17 step 4 (line 40) and D22 (line 45). No migration in PST-18: D11 (line 30) says restore writes through `FilesService.write`, and PST-18 lines 138 and 149 say this plan adds no migration call. PST-23's unit line 21 covers write, edit, apply and restore.
- **F4 (PST-21 on main, CONFIRMED).** `git log --oneline main` lists `01d0091 feat(PST-21): version history panel` and `9bb0f52 feat(PST-21): phone e2e for the version history panel`, and `plans/PST-21.md` has `status: done`. PST-22's change set (section 2) has no web file, so there is no overlap to resolve.
- **F5 (the watcher and the criteria, CONFIRMED by analysis).** No criterion needs the watcher. C1 and C3 are propose and accept paths, which need none. C2 is a GET, which writes nothing with the watcher on or off (PST-16 D4, plan line 18). C2's test needs the watcher off for a deterministic snapshot: with it on, a host edit makes the watcher persist the conflict flag (PST-19 W2, line 63), which is the watcher's write and not the GET's. C4 uses the PST-20 phone test, which has no watcher. C5 has no watcher dependency; the queue's live insert comes from `pending-created` (PST-20 R3), published by the propose itself. Demo step 3 ("the queue flags a conflict") shows the flag on the next list with the watcher on or off (PST-19 W3, line 64). The live update without a reload needs the watcher, which is on by default in production (D8) and in the e2e (F1). The bind-mount caveat (module line 80) can delay it on macOS, so the reload is the fallback. Demo steps are manual (D3).
- **F6 (the unit file).** Front matter lines 1 to 10: `blocked_by` line 7 (PST-14, PST-17, PST-18, PST-19, PST-20, PST-21 and AGL-12), `parallel_with` line 8 (PST-23), `unblocks` line 9 (GRR-08, AGL-15, CEX-20, GRR-06, SHL-19). Scope lines 16 to 18. Criteria lines 20 to 25. Demo lines 29 to 33. The file has no change note. The blocker inverse holds: the units whose `blocked_by` names PST-22 are AGL-15, CEX-20, GRR-06, GRR-08 and SHL-19 (grep of the front matter).
- **F7 (routes).** `packages/contracts/src/project-store/routes.ts` lines 36 (`PENDING`), 38 (`ACCEPT`), 40 (`REJECT`), 42 (`REFRESH`), 44 (`ACCEPT_ANYWAY`), 47 (`VERSIONS`), 49 (`VERSION`), 51 (`VERSION_RESTORE`). Controllers: `pending.controller.ts` lines 31, 41, 52, 62 and 74; `draft-versions.controller.ts` lines 35, 44 and 53.
- **F8 (merged units).** `git log --oneline main` has one or two `feat(<id>)` commits each for PST-14, PST-15, PST-16, PST-17, PST-18, PST-19, PST-20, PST-21, AGL-08 and AGL-12. Their plans are `status: done` (front matter line 3; checked for PST-14, PST-16, PST-17 and PST-21, and the others by the same grep).
- **F9 (the kit and the helpers).** `apps/api/test/project-store-pending.kit.ts` lines 22 to 52 (`pendingKitModule`, the propose route and the graph-validator route). `project-store-files.kit.ts` line 44 (`bookLibrary`) and line 60 (`sha256Of`). `project-store-active.kit.ts` line 71 (`addOkProject`) and line 81 (`postJsonPlain`). `sse.ts` line 2 (`readSse`), line 31 (`openSse`), line 66 (`dataOf`). `project-store-pending-apply.test.ts` line 165 holds A4, and lines 39 to 160 hold the helpers.
- **F10 (contracts shapes).** `packages/contracts/src/project-store/pending.ts`: `proposeInputSchema` lines 75 to 83 (`projectId`, `path`, `content`, optional `base`, `origin`, optional `provenance` and `grounding`); `pendingListSchema` lines 65 to 67 (`{changes: [...]}`); `pendingDecisionSchema` line 70.
- **F11 (the review page's labels).** `e2e/specs/review-phone.e2e.ts` line 47 (the test), lines 98 to 124 (reaching the page), lines 136 to 156 (`Open`, `Accept`, `Reject`), lines 157 to 170 (the version check), and `No open changes.` (line 187). PST-20 C3 (plan line 69) names the Open button.
- **F12 (the agent tools).** `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` line 203 (`write_file`) and line 247 (`edit_file`). `edit_file` requires `path`, `old` and `new` (line 269). `packages/contracts/src/agent-loop/constants.ts` lines 34 and 35 list both names.
- **F13 (the journey).** `e2e/specs/journey.e2e.ts`: imports lines 1 to 4; the `pending` helper lines 7 to 10; the test title line 12; setup lines 35 to 110; project from sample lines 113 to 207; agent run lines 209 to 279 (provider lines 213 to 236, Intent and Send lines 238 to 241, assertions lines 242 to 253, requests lines 255 to 266, transcript lines 268 to 277); accept change lines 281 (owner comment, kept) and 282 (the placeholder, replaced); manuscript lines 284 to 285.
- **F14 (the sample).** `examples/nonfiction/drafts/born-to-it.md` is chapter 1. Line 13 holds `The rest of this chapter sets up the harder question.`, which occurs once (`grep -c` prints 1). `wc -w` prints 305. With that sentence replaced by `This chapter sets up the harder question.`, `sed` to stdout and `wc -w` print 302. No file was written.
- **F15 (the mock).** `e2e/fixtures/mock-openai/server.mjs` lines 52 to 83 load every `.json` file in the `scenarios` folder at start, sorted, and key each one by its file name. The summarize-outline scenario matches on `endpoint` and `turnIndex`. `e2e/fixtures/mock-openai/test/mock-openai.test.ts` names its scenarios one by one and lists no folder (`grep -n readdir` finds nothing). No scenario contains `write_file` or `edit_file` (`grep -l` over `e2e/fixtures/mock-openai`), so the current agent run makes no pending change.
- **F16 (scripts).** Root `package.json`: `e2e` runs `npm run e2e -w @bbartolome/scriba-e2e`; `lint` runs the workspace lints, `lint:examples` and `prettier --check .`. `apps/api/package.json`: `test` is `npm run build && vitest run`; `lint` is `eslint .`. `apps/api/vitest.config.mts` includes `test/**/*.test.ts`. `e2e/package.json` runs `playwright test`. `e2e/playwright.config.ts` line 11 `testMatch`, line 13 `workers: 1`, lines 19 to 26 `use` (base URL and browser path only, no viewport and no timeout).
- **F17 (other plans).** `grep -l` over `plans/*.md` for `status: draft` or `planned` lists `SAU-19` (planned), `SAU-22` (draft) and `TRG-14` (planned), and no other. SAU-19 K13 names `e2e/specs/setup-phone.e2e.ts` lines 141 to 146 (SAU-19 plan line 55). SAU-22 plan lines 93 and 239 say `create-test-app.ts` is not changed. TRG-14 plan line 110 names `e2e/specs/tools-editor.e2e.ts` as new.
- **F18 (the fixed items).** `plans/DECISIONS.md` line 5506 (known failure `TRG-05 C2`, PST-19 review, header line 5499). Line 4891 to 4893 (PST-21 and PST-22 Navigator note; it says `blocked_by` lists six units, but the unit's `blocked_by` on line 7 has seven entries). Line 4041 (point 6).
- **F20 (revision 1: the conversation and the run end).** See D14 and D15 for the lines. Checked at b550cd5: the chat page posts `{intent, conversationId}` once it has a conversation (`chat-page.ts` lines 721 to 725); the run's preamble holds the replayed finished runs of that conversation (`agent-run.ts` lines 201 to 215); `turnIndex` counts assistant messages (`server.mjs` lines 117 to 121), so the planner's `turnIndex` 0 and 1 would not match the second run's requests. `finish` grounds every `drafts/` path of the overlay before it files the writes (`agent-run.ts` lines 452 to 454, 471 to 482), with an extract request whose last message starts `Task: extract claims.` (`grounding-prompts.ts` line 8; `grounding-engine.ts` lines 163 to 166). `grounding-claims.json` matches the same marker with `lastMessageContent`. The slot is released before `run-ended` (`agent-run.ts` line 458), so a Send after the Stop button is gone is not refused with `AGENT_RUN_ACTIVE`.
- **F21 (revision 1: the owner comments).** `journey.e2e.ts` lines 34, 112, 209, 281 and 284 hold the five `// Owner:` comments; the live steps keep theirs; PLT-13's criterion 3 counts them (`plans/PLT-13.md` line 145).
- **F19 (the pending-review gate's other units).** PST-14 plan line 113 says PST-22 uses no search. PST-20 plan line 136 says PST-22 needs the route, the list with conflicts, accept, refresh and reject. PST-21 plan lines 131 to 137 say PST-22 needs the restore route and the "first version" note (P6). AGL-12 plan line 178 says the accept step is PST-16's and on main.

### 8b. ASSUMED (not checked here)

- **A1.** (Checked in revision 1, no longer assumed.) The matchers are `endpoint`, `attempt`, `header`, `turnIndex`, `lastMessageRole`, `lastMessageContent` (a substring of the last message's text) and `toolResultPresent` (`server.mjs` lines 103 to 131); the first step whose matchers all hold answers (lines 133 to 140).
- **A2.** Playwright's default test timeout of 30 s applies to the journey, because the config sets none (AGL-08 plan line 257).
- **A3.** (Checked in revision 1 for Open.) The Open button has no width condition in the template (`review-page.ts` lines 196 to 213). Desktop was not run.
- **A4.** Start from sample copies `drafts/born-to-it.md` byte for byte, so the `old` sentence occurs once in the demo copy.
- **A5.** The Send button can be used again after the first run ends. The agent-run step does not repeat it. (The server side is checked, F20.)
- **A6.** The journey runs at Playwright's default desktop viewport, because the config sets none.
- **A7.** The provider settings of the accept step match the agent-run step's, with a different label (`Mock edit`), so the label does not collide.

## Review parts

### Part 1 — Review gate: the e2e accept step and the gate tests

This part holds every step and every test of this plan, as P7 chooses.

Steps: 0 (worktree), 1 (install and build), 2 (baseline), 3 (mock scenario), 4 (gate tests G1 to G3), 5 (accept step), 6 (journey run), 7 (phone test), 8 (unit and lint gates), 9 (full e2e, record only), 10 (manual demo), 11 (commits), 12 (verify on main, by the orchestrator).

Tests: G1 (C1), G2 (C2), G3 (C3), the existing review-phone test (C4), and the journey test with the accept step (C5). Each test is in this part only.

Reviewer checks: the agent edit of the accept step and its scenario (P4, D14, D15: three steps, no `turnIndex`, the request steps `[1, 2, 0]`); the owner comment on line 281 kept; the accept-anyway backup location (OP2, decided); no change to AGL-15 or to any unit file other than the ticks of step 11 (OP1, decided); and the `old` text, which must match line 13 of the sample chapter (A4).
