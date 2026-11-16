---
id: AGL-17
status: done
---

# AGL-17 plan — grounding wiring: check after drafts, check_grounding, the on-demand run, summary on pending changes, events

Revision 1, planner, from main at `5e0d94f` (clean tree when drafting began). Main moved to `b0dfa8d` while the plan was written: two PLT-22 commits (a Navigator decision in `plans/DECISIONS.md`, a unit tick). They change no file this plan names and no fact in section 2, so the facts hold at `b0dfa8d`. Status stays `draft` until the reviser and the orchestrator move it on.

Revision 2, reviser (Opus), on main at `c18662a` (only `plans/AGL-17.md` differs from `b0dfa8d`). Corrections: `agent-loop-tools.test.ts` is not changed (its kit offers only the `project` family); `agent-loop-narrative.test.ts` and `agent-loop-workhorses.test.ts` are added to step 3 (their draft outputs land under `drafts/`); `finish` keeps its status guard and has no `finishing` flag; the four open points are settled in section 7; section 8 gives the review parts. No unit file is changed. In-flight branches `unit/PST-15`, `unit/SAU-13`, `unit/TRG-07`, `unit/TRG-14` change no file of this plan (`git diff --name-only main...unit/<ID>`).

Revision 3, reviser (Opus), on main at `3ece6d3`, after the implementer's PLAN DOES NOT WORK report (`plans/DECISIONS.md`, 2026-11-16 AGL-17 implement entry). Corrections: test C1 (section 5) no longer reads a `contentHash` from the pending change (`pendingChangeSchema` has none); it checks the hash on the `grounding-result` event and the artefact, finds the pending change by `targetPath`, and checks its `proposed` text. Test C2 also checks the artefact's hash against the file's text, so section 6 (AGL-20 criterion 4) names the tests that really assert the hash. Every field the plan's tests and section 4 read was checked against its schema (2.1). No step, file, unit or review part changes.

AGL-17 wires the AGL-16 engine into the run. The engine's behaviour does not change: `GroundingEngine.check` keeps its input, its result and its artefact write, because AGL-16's tests and AGL-19's criterion 2 call it through the test kit. The run gains a `check_grounding` tool, one on-demand run behind `POST /api/agent-loop/grounding`, a check of every `drafts/` path at run end before the pending changes are filed, the grounding summary on those pending changes, the two grounding events, and the transcript lines that rebuild the grounding results after a restart.

## 1. Decisions this plan follows

| Rule | Source | How the plan obeys it |
|---|---|---|
| Automatic check after every `draft` output and for every `drafts/` path the overlay touched, before pending changes are created at run end. | Unit AGL-17 Decisions, first bullet (line 18) | `groundDrafts()` runs in `finish` after the intent and step lines and before `flushWrites` (4.2). Every draft output is an overlay entry under `drafts/` (routing refuses other folders, `narrative-tools.ts` line 204; `plans/AGL-13.md` line 104), so one filter covers both triggers. |
| On demand: `check_grounding(path)` for the model; a "Check grounding" action is `POST …/grounding {path}`, which starts an agent run whose only step is the check, subject to one active run. | Unit line 19; `modules/agent-loop.md` line 52 (`check_grounding` is reserved); `groundingRequestSchema` `{path}` (`grounding.ts`) | `check_grounding` built-in (family `grounding`, 4.1); `AgentRunsService.checkGrounding`; `AGENT_GROUNDING_ROUTE` in `agent-runs.controller.ts`; the same one-active-run refusal as `start`. |
| Events `grounding-started` and `grounding-result`; a `grounding` transcript section. | Unit line 20; `events.ts` lines 54 to 61 (payloads); `constants.ts` (kind `grounding` is in `AGENT_TRANSCRIPT_KINDS`); `plans/AGL-04.md` line 191 (the unit defines the payloads and the writer schema) | `AgentRun.groundOne` emits both; the transcript `grounding` line uses a payload schema in `transcript-entries.ts`. |
| Rebuilt run state includes grounding results when a transcript kind is added to the rebuilt state. | `plans/AGL-05.md` line 112 ("extends `TranscriptRun` and `transcript-run-state.ts`, with a test of the restart path") | `TranscriptRun.groundingResults` and `runStateOfTranscript`; restart test X1. |
| The draft's pending change carries `{supported, weak, unsupported, checkedAt}` in its `grounding` field. | Unit line 21; `project-store/pending.ts` lines 20 to 26 (`pendingGroundingSchema`) and `proposeInputSchema.grounding`; `plans/AGL-12.md` line 180 (AGL-17 adds the summary to the flush input, next to `provenance`) | `summaryOf(result)` is passed to `deps.propose` in `flushWrites`. |
| `finish` and `flushWrites` are synchronous today; the engine returns a promise, so AGL-17 must await the checks before the flush. | `plans/AGL-16.md` section 6 (AGL-17 paragraph); orchestrator note; `agent-run.ts` `finish` (388 to 404) and `flushWrites` (408 to 439) | `finish` becomes async and every call site awaits it (4.3, step 3). |
| The engine's contract for AGL-16 and AGL-19 holds: `GroundingEngine.check({projectId, runId, targetPath, overlay?, signal?})`, `GroundingFailure`, the kit route, the module exports. | `plans/AGL-16.md` sections 4.1 and 6; `plans/DECISIONS.md` lines 5407 to 5420 (2026-11-16 AGL-16 Navigator decision); orchestrator note | Engine behaviour unchanged. Two pure exports are added (4.1). The kit file, its route and the `GroundingEngine` and `GroundingFailure` exports stay. |
| The on-demand POST replies with the start response, `agentStartResponseSchema` `{runId, conversationId}`. | `plans/AGL-18.md` point 4 (line 131) and S10 (line 28); `plans/AGL-01.md` line 141; `runs.ts` `agentStartResponseSchema` | `checkGrounding` returns the same object `start` returns; test C2 parses it with that schema. |
| Grounding model calls are outside the step cap and stop cancels them; no new error code; per-tool model choice is out of scope. | `plans/AGL-16.md` section 6 (model calls outside the cap, cancelled by `signal`); `modules/agent-loop.md` lines 58 (four `AGENT_` codes) and 72 (per-tool model out of scope) | Grounding calls use the run's abort signal (`controller.signal`). No step line is written for a check. The four `AGENT_` codes are reused for refusals (`AGENT_RUN_ACTIVE`, `AGENT_NO_PROVIDER`, `AGENT_NO_ACTIVE_PROJECT`). |
| Only `sources/` is grounding evidence. | `modules/agent-loop.md` line 56; `plans/AGL-16.md` | Unchanged: the engine retrieves `sources/` only. |
| Test seam: the composed app with the mock OpenAI server and scripted turns; external behaviour only; no internal service in a test. | `modules/agent-loop.md` lines 61 and 62; `units/README.md` (testing convention) | The new tests use `openHarness` with the composed modules. They read SSE events, the pending list, files on disk and `requestsOf`. |
| The unit file records no change. The change that binds AGL-17 is the AGL-16 Navigator decision: AGL-17's plan retires the kit's use in favour of the real route; the kit file may stay. | `units/AGL-17-grounding-wiring.md` (25 lines, no note); `git log -- units/AGL-17-grounding-wiring.md` shows only `2fed3f4` and `098add9`; `plans/DECISIONS.md` line 5420 | New tests use the real route (test C2). The kit and the AGL-16 test file are not changed (open point 3). |
| Blockers `AGL-13` and `AGL-16` are merged; parallel units are AGL-15, AGL-18, AGL-19. | Unit front matter lines 7 and 8; `units/README.md` "Blocker notation" | Both blockers are used as they are on main. Section 6 gives each parallel unit's relation. |

## 2. Facts checked and facts assumed

Each fact is marked CHECKED (read in this session on main at `5e0d94f`, or in an approved plan of a done unit, as stated; the two later commits of `b0dfa8d` were checked with `git diff 5e0d94f b0dfa8d`) or ASSUMED (section 2.3).

### 2.1 Checked

Unit, module, plans, decisions:
- [CHECKED] `units/AGL-17-grounding-wiring.md`: front matter lines 1 to 10 (`blocked_by` AGL-13, AGL-16; `parallel_with` AGL-15, AGL-18, AGL-19; `unblocks` AGL-20). Decisions lines 18 to 21. Criteria lines 24 and 25 (criterion 1: an agent-drafted paragraph triggers a check and its pending change carries the summary; criterion 2: `check_grounding` and the on-demand endpoint both produce a `grounding-result` and an artefact). No note records a change of the unit.
- [CHECKED] `units/AGL-15`, `units/AGL-18`, `units/AGL-19`: each lists AGL-17 in `parallel_with`, so the pairs are symmetric. AGL-20 lists AGL-17 in `blocked_by`, so `unblocks` is its exact inverse.
- [CHECKED] `modules/agent-loop.md`: line 52 (reserved names, including `check_grounding`), line 54 (only `logs/` is written directly), line 56 (only `sources/` grounds), line 58 (four error codes), lines 61 and 62 (testing principles and the primary seam), line 72 (per-tool model choice is out of scope), line 82 (claims artefact in `logs/`).
- [CHECKED] `plans/AGL-16.md`: section 4.1 (engine interface, `GroundingFailure`, the algorithm), section 6 (AGL-17 paragraph, lines 255 to 268), section 8 point 5 (line 311: how a failed check shows is AGL-17's choice), section 9.
- [CHECKED] `plans/AGL-18.md`: point 4 (line 131), S10 (line 28), D8 (line 44: the grounding POST sends `{path}` and the page records the run with the label `Check grounding: <path>`), D9 (line 45: `grounding-started` sets a checking entry; nothing clears it at run end), D10 (line 46), D14 (line 50), point 7 (line 134: the UI offers the check for `drafts/` only). Status `done`.
- [CHECKED] `plans/AGL-05.md` line 112 (rule for transcript kinds and restart). `plans/AGL-04.md` line 191 (writer schemas belong to the unit that writes the kind). `plans/AGL-12.md` line 180 (AGL-17 adds the summary to the flush input). `plans/AGL-13.md` lines 15 and 104 (draft outputs are overlay entries with provenance, grounded after by AGL-17). `plans/AGL-01.md` line 141 (on-demand POST reuses the start response).
- [CHECKED] `plans/TRG-14.md` is the only plan with status `draft` or `planned` (grep `^status: *(draft|planned)`). Its file table (section 3) lists web and e2e files and no `apps/api/**` file.
- [CHECKED] No `unit/AGL-15`, `unit/AGL-17` or `unit/AGL-19` branch exists (`git branch -a`). `plans/DECISIONS.md` has no AGL-17 entry (grep). The AGL-16 entries are at lines 5407 (test seam) and 5422 (harness boot list); the AGL-13 Navigator decision is at line 5365.
- [CHECKED] `units/README.md`: the blocker notation (a bare id must be merged) and the rule that `unblocks` is the exact inverse of `blocked_by`.

Contracts (`packages/contracts/src/agent-loop/` and `project-store/`), no change needed:
- [CHECKED] `grounding.ts`: `groundingResultSchema`, `groundingSummarySchema` (the `GroundingSummary` type), `groundingRequestSchema` `{path}`.
- [CHECKED] `runs.ts`: `agentStartResponseSchema` `{runId, conversationId}`; `agentRunStateSchema` has `groundingResults`.
- [CHECKED] `events.ts`: `groundingStartedDataSchema` (base plus `targetPath`, lines 54 to 56), `groundingResultDataSchema` (result plus `seq`, lines 58 to 61); the ten members of `agentLoopEventSchema` include both.
- [CHECKED] `routes.ts` line 10: `AGENT_GROUNDING_ROUTE` `/api/agent-loop/grounding`.
- [CHECKED] `constants.ts`: `check_grounding` is in `AGENT_RESERVED_TOOL_NAMES`; `grounding` is in `AGENT_TOOL_FAMILIES`; `grounding` is in `AGENT_TRANSCRIPT_KINDS`; `GROUNDING_RESULT_SCHEMA_VERSION` is 1; the artefact path constants.
- [CHECKED] `errors.ts`: four `AGENT_` codes, with `AGENT_RUN_ACTIVE` 409, `AGENT_NO_PROVIDER` 409, `AGENT_NO_ACTIVE_PROJECT` 409, `AGENT_RUN_NOT_FOUND` 404.
- [CHECKED] `transcript.ts`: `transcriptEntrySchema` has `data: z.unknown()`, so each kind's payload is checked by the reader's own schemas (`transcript-entries.ts`).
- [CHECKED] `project-store/pending.ts`: `pendingGroundingSchema` (lines 21 to 26); `pendingChangeSchema` (lines 37 to 57) has `targetPath` (line 40), `proposed` (line 49), optional `grounding` (line 52) and no content hash: its only hash is `capturedBase.hash` (line 45), and `capturedBase` is null for a new file; `proposeInputSchema` (lines 75 to 83) names the file `path` (line 77) and has optional `grounding` (line 82). (reviser, revision 3)
- [CHECKED] (reviser, revision 3) `grounding.ts` `groundingResultSchema` (lines 33 to 40) has `targetPath` and `contentHash`; `grounding-engine.ts` line 126 computes `contentHash` as `sha256:` plus the hex SHA-256 of the checked text (UTF-8); `contentHashSchema` is `^sha256:[0-9a-f]{64}$` (`project-store/constants.ts` line 11). `runEndedDataSchema` has `pendingChangeIds` (`events.ts` line 71). `WriteOverlay` entries carry `path` and `content` (`write-overlay.ts` lines 5 to 7). `pending.service.ts` `propose` destructures `grounding` (line 334) and stores it (lines 400 and 460).

Agent-loop code on main (`apps/api/src/modules/agent-loop/`):
- [CHECKED] `agent-run.ts`: `AgentRunInit` lines 36 to 46; `AgentRunDeps` lines 51 to 59 (`resolver`, `events`, `summarize`, `released`, `transcripts`, `propose`, `targetExists`); `messageOf` lines 98 to 102 (a `ModuleError` gives its message, anything else `FAILED_MESSAGE`); the class at 112; `controller` line 119 (private); `tools` line 121 (private); constructor lines 128 to 148; `execute` lines 166 to 224, with `this.finish(...)` at lines 175, 198, 202, 203, 209, 217 and 222 (the last in `catch`, not awaited); `runCall` lines 296 to 383 (`tool-call-started` is emitted before dispatch, `tool-call-args` after it); `finish` lines 388 to 404 (synchronous); `flushWrites` lines 408 to 439 (synchronous, calls `deps.propose`); `emit` lines 482 to 491; `apply` lines 494 to 536; `writeIntent` lines 453 to 461.
- [CHECKED] `agent-runs.service.ts`: constructor lines 44 to 57 (injects `ProjectStoreService`, `ProjectsService`, `FilesService`, `ModelResolver`, `AgentSettingsService`, `AgentToolsService`, `EventsPublisher`, `AgentTranscriptsService`, `PendingService`); `start` lines 61 to 129 (refusals in the order NO_ACTIVE_PROJECT, RUN_ACTIVE, NO_PROVIDER; `enabledFamilies` lines 86 to 88; `TranscriptWriter` lines 89 to 96; `AgentRun` lines 97 to 124; `begin` and `void execute` lines 126 and 127); `current` lines 135 to 149; `release` lines 185 to 189.
- [CHECKED] `agent-runs.controller.ts`: class lines 18 to 49; `current` GET 24 to 29; `start` POST 31 to 38 (`@HttpCode(200)`, `ZodValidationPipe`); `stop` POST 40 to 48.
- [CHECKED] `agent-loop.module.ts`: providers lines 48 to 62 (`GroundingEngine` line 59); exports line 63 (`AgentSettingsService`, `AgentToolsService`, `GroundingEngine`); the comment at lines 33 to 35 says "Grounding: its engine is registered here; the wiring of the checks lands in a later unit."; the entry file exports `GroundingEngine` and `GroundingFailure` (line 19).
- [CHECKED] `grounding-engine.ts`: `GroundingCheckInput` lines 40 to 46; `GroundingFailure` lines 49 to 51; `check` lines 83 to 137 (the checked text is `overlay?.contentOf(path)` or `files.read(...).content`, lines 84 to 86; the hash is line 126; the artefact `files.write` is lines 131 to 135; it emits no event and writes no transcript line).
- [CHECKED] `tools/tool-run.ts`: `overlay` is public and readonly (line 69); `dispatch` passes the signal to the handler; its `catch` is at line 164 (a `ModuleError` becomes an invalid call at `/path`; a `ToolArgumentError` an invalid call; any other error the generic `FAILED` answer, not counted).
- [CHECKED] `tools/tool-types.ts`: `ToolContext` lines 44 to 48 (`run`, `callId`, `signal?`); `ToolDefinition.name` is `AgentReservedToolName`, so `check_grounding` is a valid name.
- [CHECKED] `tools/builtin-tools.ts`: `targetOf` exported at line 67; `builtinTools` at line 120; the return at line 354 gives five tools, in the order list_files, read_file, search_notes, write_file, edit_file.
- [CHECKED] `tools/write-overlay.ts`: `contentOf` (the latest proposed text), `entriesInOrder`, `baseOf`.
- [CHECKED] `tools/narrative-tools.ts` lines 204 to 205: a draft or entity target must be inside its folder (`drafts/`), so draft outputs are always under `drafts/`.
- [CHECKED] `transcript-entries.ts`: line 30 comment ("The grounding kind is not written here (AGL-16)."); `intentPayloadSchema` lines 33 to 37 (`intent`, optional `excludedTools`); `transcriptPayloadSchemas` maps kinds to payload schemas.
- [CHECKED] `transcript-reader.ts`: `runOf` builds a `TranscriptRun` from the lines; its `switch` has `case 'run-end'` at line 198; its `default` branch keeps grounding and pending-change lines out of the turns. `TranscriptRun` has no grounding field.
- [CHECKED] `transcript-run-state.ts` line 18: `groundingResults: []`.
- [CHECKED] `transcript-writer.ts`: `append(kind, seq, data)`; strings in the payload are scrubbed and cut to 8192 characters (`mapStrings`), so a result stays schema-valid.
- [CHECKED] `conversation-history.ts` `replayTurns` (line 21): each run's intent becomes a user message, then its steps.
- [CHECKED] `project-store/files.service.ts`: `readFileAt` lines 139 to 142 throws `NOT_FOUND` for a missing file; `read` refuses a non-text file with `NOT_TEXT` (line 263); `refuse` (line 70) returns a `ModuleError` (line 75).
- [CHECKED] `apps/web/src/app/features/agent-loop/chat-state.ts` `applyStart` lines 374 to 388: a start reply sets the page's `conversationId` to the reply's.

Tests and kits:
- [CHECKED] `apps/api/test/agent-loop-transcript.kit.ts`: `openHarness` (line 87; `modules` option lines 65 to 73, added by AGL-16); `post` (149), `get` (160), `observe` (169), `startRun` (174), `readUntilEnded` (184, reads until `run-ended` and parses each `agent-loop` envelope with `agentLoopEventSchema`), `requestsOf` (219); `Harness.restart` (lines 74 to 82).
- [CHECKED] `apps/api/test/agent-loop-grounding.kit.ts`: `POST /api/agent-loop-test/grounding` calls `GroundingEngine.check({projectId, runId, targetPath, overlay})` and answers the result or `{failure}`. It imports `AgentLoopModule`, `GroundingEngine`, `GroundingFailure` from the entry file and `WriteOverlay` from `tools/write-overlay`.
- [CHECKED] `apps/api/test/agent-loop-grounding.test.ts` (AGL-16, approved): G1 to G4 use the kit, the scenario steps `{match: {endpoint:'chat', lastMessageContent: EXTRACT_MARKER | JUDGE_MARKER}, reply: {kind:'stream', deltas:[json]}}`.
- [CHECKED] Tests that assert the full list of tool names offered to the model in a composed run: `agent-loop-run.test.ts` lines 374 and 391 (`toolNamesOf` sorts the names). `agent-loop-tools.test.ts` lines 303 and 359 list the tools of the AGL-02 kit's `ToolRun`, which the kit starts with `enabledFamilies: ['project']` (`agent-loop-tools.kit.ts` line 45); `ToolRun` offers only tools of an enabled family (`tool-run.ts` constructor), so `check_grounding` (family `grounding`) is not in those lists and that file does not change (reviser). `agent-loop-narrative.test.ts` line 323 uses `arrayContaining` and does not change.
- [CHECKED] (reviser) Runs whose narrative `draft` output lands at a generated `drafts/` path (AGL-13 routing): `agent-loop-narrative.test.ts` T2 and T4 (`draftSteps`, line 230: `cold_open` with no `target`); `agent-loop-workhorses.test.ts` C1 (`it.each`, line 284: each workhorse's `draft` output, with no `target`). Their turn steps match by `turnIndex: 0` or `toolResultPresent: false`, which an extract request (no assistant and no tool message) also matches, so without an extract step listed first the run-end extract gets a tool-call reply and fails after three attempts. Workhorses C1 asserts `records` has length 3 (line 387) and reads `bodies[0]` and `bodies[2]`. Narrative T3 writes no draft (its calls are refused), T1 calls no tool.
- [CHECKED] (reviser) `readUntilEnded` (`agent-loop-transcript.kit.ts` line 184) gives up after 5 s, and keeps only `agent-loop` envelopes.
- [CHECKED] (reviser) The mock's steps are not consumed: `findStepIndex` picks the first matching step on each request (`server.mjs` lines 133 to 139), so one extract step answers every extract request of a scenario.
- [CHECKED] Tests that write `drafts/` through a run: `agent-loop-writes.test.ts` (`drafts/new-chapter.md`), `agent-loop-diff-preview.test.ts` (`drafts/new-note.md`, `drafts/long-note.md`, `drafts/chapter-one.md`), `agent-loop-output-routing.test.ts` (AC1 at line 280 and its later scenarios, `drafts/chapter-one.md`). `agent-loop-search.test.ts` mentions `drafts/` only in a fixture and in an assertion that drafts never appear (it writes none). `agent-loop-output-routing.test.ts` helper `filesOf` (line 250) skips `logs`, so the artefact does not disturb its tree comparisons.
- [CHECKED] Event-sequence assertions (`typesOf` and `events.map(...)`) exist in `agent-loop-run.test.ts` (line 223), `agent-loop-history.test.ts` (line 327) and `agent-loop-search.test.ts` (lines 302 and 338); none of these runs writes `drafts/`.
- [CHECKED] Mock server `e2e/fixtures/mock-openai/server.mjs`: matchers `turnIndex` counts the assistant messages of the request (lines 117 to 121), `lastMessageContent` checks the last message (lines 103 to 131); `findStepIndex` takes the first matching step in list order (lines 133 to 139); a request with no matching step gets HTTP 500 `no scenario step matches` (lines 305 to 306); a step's `delayMs` is honoured before its reply (after line 306).
- [CHECKED] The provider client's retry policy: `providers/client/retry.ts` line 52 (a retry only before the first chunk, while the failure is retryable and the attempt is within `retries`); backoff 500 ms, doubling, capped at 8000 ms (lines 3 to 8).

Other units' outputs used as they are on main:
- [CHECKED] AGL-16 section 4.1 (algorithm steps 1 and 2) says the engine reads the checked text through the overlay's `contentOf` and resolves the model once per check; the AGL-16 implementation on main matches (`grounding-engine.ts` lines 84 to 87).
- [CHECKED] AGL-18 (done) reads `grounding-started`, `grounding-result` and `groundingResults` from the run state; its web code is not in this plan's file list.

### 2.2 Decisions made by the planner and the reviser (smaller choices, not recorded in DECISIONS)

- Automatic checks run at run end, one per `drafts/` path, on the final overlay text (settled by the reviser, section 7 point 2).
- A check whose result for the same path and the same text already exists in the run is not repeated.
- A failed check emits no grounding event (the contract has none; settled, section 7 point 1).
- A grounding-only run gets a new conversation id, because `groundingRequestSchema` has no `conversationId` (settled, section 7 point 4).
- The endpoint accepts any existing text file of the project. The UI offers only `drafts/` (AGL-18 point 7).
- A stopped or project-switched run (its signal aborted) files its pending changes without a check (reviser: the abort cancels model work; `agent-loop-writes.test.ts` AC1 and AC3 end this way and keep their assertions).

### 2.3 Assumed

- [ASSUMED] A1. `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-wiring` runs only the new test file (vitest treats the argument as a filename filter), as AGL-16 A1. Not run.
- [ASSUMED] A2. A mock 500 for an unmatched request is retryable, so the provider client retries it with the backoff of `retry.ts` before it fails. The classification of 500 as `retryable` was not read. No test of this plan depends on it: step 3 gives every scenario whose run checks a `drafts/` path an extract step listed first (reviser).
- [ASSUMED] A3. The existing agent-loop tests that are not named in sections 3 and 4.3 pass unchanged after step 2 (the added `check_grounding` tool) and step 3 (run-end checks). The affected files were found by `grep -l "drafts/"`, by the narrative `draft` outputs (`cold_open`, the workhorses) and by the full tool-name assertions (2.1). Not run.
- [ASSUMED] A4. Vitest's default timeout is enough for a run that makes two more model calls at run end. Not measured.
- [ASSUMED] A5. The first `sources/notes.md` block has passage offset 0, as in AGL-16's approved tests G1 to G3 (they assert offset 0; the approval is CHECKED, the run is ASSUMED here).
- [ASSUMED] A6. The Playwright e2e suite is not part of this plan's gate. Whether an e2e scenario writes `drafts/` through an agent run was checked for `e2e/specs/journey.e2e.ts` (no such write) and `e2e/fixtures/mock-openai/scenarios/` (only `pack-propose_graph.json` names `drafts/`, a graph-pack fixture, not an agent write). Not run.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/grounding-engine.ts` | edit (additive; behaviour unchanged) | Exports `contentHashOf(text)` (`sha256:` plus hex, the same expression as line 126) and `summaryOf(result): GroundingSummary` (counts of `result.claims` by verdict, plus `result.checkedAt`). `check` uses `contentHashOf`. `check`, `GroundingCheckInput` and `GroundingFailure` are unchanged (the kit and AGL-19 use them) |
| `apps/api/src/modules/agent-loop/agent-run.ts` | edit | `AgentRunInit.checkPath?`; `AgentRunDeps.ground`; `ToolRun.groundingCheck` set in the constructor; `messageOf` also answers a `GroundingFailure`'s message; `groundOne`, `groundDrafts`, `groundingOf`; `finish` async with the checks before `flushWrites`; `flushWrites` passes `grounding`; `execute` runs the check path; `apply` adds grounding results to the state; transcript `grounding` lines |
| `apps/api/src/modules/agent-loop/agent-runs.service.ts` | edit | Injects `GroundingEngine`; binds `deps.ground`; chat runs offer the `grounding` family; `start` and `checkGrounding` share a private `launch` |
| `apps/api/src/modules/agent-loop/agent-runs.controller.ts` | edit | `@Post(AGENT_GROUNDING_ROUTE)`, `@HttpCode(200)`, body through `ZodValidationPipe(groundingRequestSchema)`, reply `AgentStartResponse` |
| `apps/api/src/modules/agent-loop/agent-loop.module.ts` | edit (comment only) | Lines 33 to 35 say the engine is wired into the runs by `AgentRunsService`. Providers and exports unchanged |
| `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` | edit | Adds `check_grounding` (family `grounding`) as the sixth built-in, returned last |
| `apps/api/src/modules/agent-loop/tools/tool-run.ts` | edit | Adds the public `groundingCheck?` property; `dispatch`'s `catch` answers a `GroundingFailure` with an error outcome carrying its readable message (valid call, not counted) |
| `apps/api/src/modules/agent-loop/transcript-entries.ts` | edit | `intent` payload gains optional `checkPath`; new `grounding` payload `{targetPath, result?, failure?}` in `transcriptPayloadSchemas` |
| `apps/api/src/modules/agent-loop/transcript-reader.ts` | edit | `TranscriptRun` gains `groundingResults` and `checkPath?`; `runOf` fills them; the `default` comment names the grounding lines as read |
| `apps/api/src/modules/agent-loop/transcript-run-state.ts` | edit | `groundingResults: run.groundingResults` (line 18) |
| `apps/api/src/modules/agent-loop/conversation-history.ts` | edit | `replayTurns` skips a run with `checkPath` (a check run has no model turn) |
| `apps/api/test/agent-loop-grounding-wiring.test.ts` | new | Tests C1, C2, C2b, X1 to X4 (section 5) |
| `apps/api/test/agent-loop-run.test.ts` | edit | The two tool-name lists (lines 374 and 391) gain `check_grounding` in sorted position (first) |
| `apps/api/test/agent-loop-writes.test.ts` | edit | Each scenario whose run writes a `drafts/` path gets the empty-claims extract step (4.3, step 3) |
| `apps/api/test/agent-loop-diff-preview.test.ts` | edit | Same rule |
| `apps/api/test/agent-loop-output-routing.test.ts` | edit | Same rule |
| `apps/api/test/agent-loop-narrative.test.ts` | edit | Same rule, in `draftSteps` (T2 and T4) |
| `apps/api/test/agent-loop-workhorses.test.ts` | edit | Same rule, in the C1 scenario; the request count at line 387 becomes 4, and `bodies[3]` is the extract request (its last message contains `EXTRACT_MARKER`) |
| `units/AGL-17-grounding-wiring.md` | edit, last commit only | The two `- [ ]` boxes become `- [x]`; no text changes |
| `plans/AGL-17.md` | edit, last commit only | `status: done` |

Not changed:
- `packages/contracts/**`: every schema, route, constant and kind this plan needs exists (2.1).
- `apps/api/test/agent-loop-grounding.kit.ts`, `apps/api/test/agent-loop-grounding.test.ts` (AGL-16's file), `apps/api/test/create-test-app.ts`, `apps/api/test/agent-loop-transcript.kit.ts`.
- `apps/api/test/agent-loop-tools.test.ts` and its kit (the kit's runs offer the `project` family only, 2.1).
- `apps/web/**` (AGL-18 is done and reads the events and the start reply as they are).
- `e2e/**`, `examples/**`, `packages/packs/**`, `package.json`, `package-lock.json`.
- `apps/api/src/modules/project-store/**`, `providers/**`, `tool-registry/**`.
- `units/**` except the step-6 tick, `modules/**`, `plans/DECISIONS.md`.

## 4. Procedure

### 4.1 Names, values and small choices

- Engine additions in `grounding-engine.ts`: `export function contentHashOf(text: string): string` and `export function summaryOf(result: GroundingResult): GroundingSummary`.
- `check_grounding` (in `builtin-tools.ts`, family `grounding`): arguments `{path: string}` (minLength 1; `additionalProperties: false`). The handler calls `targetOf(store, projects, ctx.run.projectId, path)` (the Project store's path check; a refusal is an invalid call at `/path`), then `ctx.run.groundingCheck(target.relativePath, ctx.signal)`. Its `summary` is `Checked <path>: N supported, N weak, N unsupported.`; its `output` is the `GroundingSummary`; its `modelText` is `JSON.stringify({targetPath, supported, weak, unsupported, claims: [{text, verdict, reason, source?}]})`, where `source` is `passage.path` when the claim has one. It is the last built-in, so it is offered last.
- `ToolRun.groundingCheck?: (path: string, signal?: AbortSignal) => Promise<GroundingResult>` (in `tool-run.ts`). `AgentRun`'s constructor sets it to `(path, signal) => this.groundOne(path, signal ?? this.controller.signal)`. Outside a run it is undefined; the handler then throws a plain error (the generic `FAILED` answer).
- `ToolRun.dispatch` `catch` (line 164): a `GroundingFailure` returns `{arguments, valid: true, outcome: {kind: 'error', message: error.message, attempt: Math.max(1, count)}}` and does not count as an invalid call. The model reads the readable text.
- `AgentRunInit.checkPath?: string`. A run with a `checkPath` is a check run: its loop is replaced by one `groundOne(checkPath)`.
- `AgentRunDeps.ground: (input: GroundingCheckInput) => Promise<GroundingResult>`, bound in `AgentRunsService` to `this.grounding.check(input)`. The run holds no Nest code (the pattern of `propose` and `targetExists`).
- `AgentRun.groundOne(path, signal)`, in this order:
  1. `emit('grounding-started', {targetPath: path})`.
  2. `result = await deps.ground({projectId, runId, targetPath: path, overlay: this.tools.overlay, signal})`.
  3. On a throw: `transcript.append('grounding', seq, {targetPath: path, failure: messageOf(error)})`, then rethrow.
  4. On success: `emit('grounding-result', {...result})` (the event adds `runId` and `seq`), then `transcript.append('grounding', seq, {targetPath: path, result})`; return the result.
  `apply` for `grounding-result` pushes a copy of the result, without `seq`, to `state.groundingResults`. The branch goes before the card lookup of `apply` (line 510 today), because that lookup returns early for an event with no `callId`.
- `AgentRun.groundingOf(path, content): GroundingResult | undefined`: the last entry of `state.groundingResults` whose `targetPath` is `path` and whose `contentHash` is `contentHashOf(content)`.
- `AgentRun.groundDrafts()`: when the run is not aborted, for each overlay entry whose path starts with `drafts/` and for which `groundingOf` finds nothing, `await groundOne(path, controller.signal)`. Each `groundOne` is in its own `try`/`catch`: a throw is already in the transcript; the loop continues with the next path, and stops when the run is aborted. `groundDrafts` never rejects.
- `flushWrites`: for each entry, `grounding = groundingOf(entry.path, entry.content)`; when found, the propose input gets `grounding: summaryOf(result)`, next to `provenance`. Nothing else in `flushWrites` changes.
- `finish(reason, message?)` becomes `async` and returns `Promise<void>`. It keeps its one guard: it returns at once when `state.status === 'ended'`. There is no `finishing` flag (reviser: `execute` is the only caller and awaits each call, so no second call can overlap; a flag set before a throw inside `finish` would make the `catch`'s `finish('error')` return at once and leave the run active with its slot held). Then: `writeIntent`, `writeStepText`, `await groundDrafts()`, `flushWrites()`, then the existing order (state ended, `released`, `run-ended`, transcript `run-end`). Every `return this.finish(...)` in `execute` becomes `return await this.finish(...)`, and the `catch` becomes `await this.finish('error', messageOf(error))`.
- `messageOf(error)`: a `GroundingFailure` gives `error.message`; the rest is as now.
- `AgentRunsService`:
  - `start` keeps its refusals and its order (NO_ACTIVE_PROJECT, RUN_ACTIVE, NO_PROVIDER). Its `enabledFamilies` become `['project', 'narrative', 'grounding']`, plus `'research'` when research is enabled. The body from the `TranscriptWriter` to `return` moves into `private launch(options)`, which `start` and `checkGrounding` both call.
  - `checkGrounding(body: GroundingRequest): AgentStartResponse`: the same first three refusals; then `this.files.read(projectId, body.path)`, which refuses a missing or non-text file before any slot is taken; then `launch` with a new `randomUUID()` conversation, the intent `Check grounding: <path>`, `enabledFamilies: ['grounding']` and `checkPath: body.path`.
  - The constructor gains `private readonly grounding: GroundingEngine` (from `./grounding-engine`).
- The transcript:
  - `intent` payload: optional `checkPath` (written only by a check run).
  - `grounding` payload: `{targetPath: string, result?: groundingResultSchema, failure?: string}`.
  - `TranscriptRun.groundingResults: GroundingResult[]` is filled from the `grounding` lines that carry a `result`, in order; `TranscriptRun.checkPath?` from the intent line.
  - `runStateOfTranscript` returns `groundingResults: run.groundingResults`.
  - `replayTurns` skips a run with `checkPath`. Its turn stays in `turns()` and in `conversations()`, which the UI shows.
- The on-demand route answers the start response. Its refusals reuse the start codes. A missing file is the Project store's own readable error.
- The events are `grounding-started` (`{runId, seq, targetPath}`) and `grounding-result` (the result plus `runId` and `seq`), as `groundingResultDataSchema` says.
- Check runs write an `intent` line, `grounding` lines and a `run-end` line, and no `step` line. Their `state.step` stays 0.

### 4.2 Flow

1. Run end (chat run): the loop ends, `finish` runs. For each `drafts/` path of the overlay with no result for its final text, `groundOne` emits `grounding-started`, calls the engine (its extract and judge model calls use the run's signal), emits `grounding-result`, and writes the transcript line. Then `flushWrites` files each path with the summary of its result, if any. Then `run-ended`.
2. `check_grounding` (model call inside a chat run): `tool-call-started` (family `grounding`), then the handler calls `groundOne` for the path, which emits the two events, then `tool-call-args`, then `tool-call-result` with the summary and the model text. A failure is a `tool-call-error` with the readable text.
3. On-demand run: `POST /api/agent-loop/grounding {path}` runs the refusals, reads the file, launches a run with `checkPath`. The run emits `run-started` before the reply, resolves the model, writes the intent line, calls `groundOne`, then `finish('completed')`. A failed check ends the run with reason `error` and the readable text as `message`.
4. Both checks write the artefact through the engine (unchanged), at `logs/grounding/<targetPath>.json`.

### 4.3 Steps (one commit each, as AGL-16)

Step 0 (no commit). Create branch `unit/AGL-17` from `main`. The tree must be clean.

Step 1. Commit `test(AGL-17): add the grounding wiring tests`.
- Create `apps/api/test/agent-loop-grounding-wiring.test.ts` with C1, C2, C2b, X1 to X4 (section 5). Helpers, defined in the file as AGL-16's test does: `prepare` (`sources/notes.md` = `Harbour traffic doubled in 1900.\n`; `drafts/ch01.md` = the same sentence and newline), `extractStep(claims)`, `judgeStep(verdicts)`, `writeCallStep` and `checkCallStep` (`turnIndex` 0 tool calls), `textStep` (`turnIndex` 1). Every scenario lists the grounding steps first (see the matcher note in 4.4).
- Run `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-wiring`. Expected: every test fails.

Step 2. Commit `feat(AGL-17): check_grounding and the run's grounding check`.
- `grounding-engine.ts`: add `contentHashOf` and `summaryOf`; `check` uses `contentHashOf`.
- `tools/tool-run.ts`: `groundingCheck?` and the `GroundingFailure` branch of `dispatch`'s `catch`.
- `tools/builtin-tools.ts`: `check_grounding`.
- `agent-run.ts`: `AgentRunDeps.ground`, `AgentRunInit.checkPath` (declared, not yet used), `ToolRun.groundingCheck` in the constructor, `messageOf`, `groundOne`, `apply` for `grounding-result`, the transcript `grounding` lines.
- `agent-runs.service.ts`: inject `GroundingEngine`, bind `deps.ground`, offer the `grounding` family in `start`.
- `agent-loop.module.ts`: comment lines 33 to 35.
- Update the tool-name lists of `agent-loop-run.test.ts` (lines 374 and 391): `check_grounding` is added first (`toolNamesOf` sorts the names). `agent-loop-tools.test.ts` is not changed (2.1).
- Run `npx tsc --noEmit -p apps/api/tsconfig.json`, then `npm test -w @bbartolome/scriba-api -- agent-loop`. Expected: C2b passes; C1, C2, X1 to X4 still fail; the other agent-loop tests pass (A3 checked here).

Step 3. Commit `feat(AGL-17): check drafts at run end and attach the summary to their pending changes`.
- `agent-run.ts`: `finish` async (status guard only, no flag); `groundDrafts`; `groundingOf`; `flushWrites` passes `grounding`; `execute` awaits `finish` at every call site and in `catch`.
- In each scenario of `agent-loop-writes.test.ts`, `agent-loop-diff-preview.test.ts`, `agent-loop-output-routing.test.ts`, `agent-loop-narrative.test.ts` (`draftSteps`) and `agent-loop-workhorses.test.ts` (C1) whose run puts a `drafts/` path in the overlay (a `write_file` or `edit_file` to `drafts/`, or a narrative `draft` output), add as the FIRST step `{match: {endpoint: 'chat', lastMessageContent: EXTRACT_MARKER}, reply: {kind: 'stream', deltas: ['{"claims":[]}']}}` (the import of `EXTRACT_MARKER` is from `../src/modules/agent-loop/grounding-prompts`). With no claims there is no judge call, and the artefact is written with zero counts. Without this step the extract request matches a turn step (`turnIndex: 0` or `toolResultPresent: false`) or none (HTTP 500, A2), and the check fails.
- The only existing assertion that changes: `agent-loop-workhorses.test.ts` line 387, `toHaveLength(3)` becomes `toHaveLength(4)`, with an added assertion that the last message of `bodies[3]` contains `EXTRACT_MARKER` (the run-end extract comes after the agent's last turn, so `bodies[0]` and `bodies[2]` keep their meaning). No other existing assertion changes.
- Run `npm test -w @bbartolome/scriba-api -- agent-loop`. Expected: C1 passes; the rest as before.

Step 4. Commit `feat(AGL-17): the on-demand grounding run`.
- `agent-runs.service.ts`: `checkGrounding` and the private `launch`.
- `agent-runs.controller.ts`: the POST route.
- `agent-run.ts`: the `checkPath` branch of `execute` (after the model is resolved and the intent is written, it calls `groundOne(checkPath, controller.signal)` and then `finish('completed')`; a throw reaches `catch`).
- Run `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-wiring`. Expected: C1, C2, C2b, X2 and X3 pass; X1 and X4 still fail (they need step 5).

Step 5. Commit `feat(AGL-17): grounding transcript lines rebuild the run state; check runs are not replayed`.
- `transcript-entries.ts`: `checkPath` in the intent payload; the `grounding` payload.
- `transcript-reader.ts`: `groundingResults` and `checkPath` in `TranscriptRun`, filled by `runOf`.
- `transcript-run-state.ts`: `groundingResults` from the run.
- `conversation-history.ts`: `replayTurns` skips a run with `checkPath`.
- Run `npm test -w @bbartolome/scriba-api` (the whole API suite, with its build). Expected: every test of this plan passes, the AGL-16 test file passes unchanged (G1 to G4), the AGL-04 and AGL-05 restart tests pass. Run `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check` on each changed file.

Step 6. Commit `docs(AGL-17): criteria checked, plan status done`.
- `units/AGL-17-grounding-wiring.md`: the two `- [ ]` boxes become `- [x]`; no text changes.
- `plans/AGL-17.md`: `status: done`.

### 4.4 Matcher note for the tests

The `turnIndex` matcher counts assistant messages, and a grounding request has none, so `turnIndex: 0` also matches an extract or judge request. Grounding steps must come before the turn steps in each scenario. The extract and judge steps match by `lastMessageContent` markers, which only grounding requests carry.

Gate for the whole unit (after step 5, and before the orchestrator's review): `npm run build`, `npm test` and `npm run lint` at the root, each exits 0. The Playwright e2e suite is not in this gate (A6).

## 5. Tests

One test for each acceptance criterion of `units/AGL-17-grounding-wiring.md`. Criterion 1 has test C1. Criterion 2 has test C2 (the on-demand endpoint) and test C2b (`check_grounding`); the criterion names both. Every test opens its own harness with `openHarness({scenario, steps, prepare})` (default composed modules, no kit), observes the stream with `observe(h)` before the first request (the stream does not replay events), and closes it in `finally`. No test reads a service inside the app.

| Criterion (quoted from the unit) | Test | What the test asserts |
|---|---|---|
| "An agent-drafted paragraph triggers a check automatically; its pending change carries the summary." (line 24) | **C1** `a paragraph the agent writes to drafts/ is checked at run end, and its pending change carries the summary` | Steps: the extract step (one claim, `Harbour traffic doubled in 1900.`), the judge step (claim 0 `supported`, citing `sources/notes.md` at offset 0), then turn 0 `write_file` to `drafts/ch02.md` with the sentence and a newline, then turn 1 text. After `readUntilEnded`: `grounding-started` (`targetPath` `drafts/ch02.md`) and `grounding-result` (one claim, verdict `supported`, `passage.path` `sources/notes.md`) appear before `run-ended`, both with the run's `runId`. The `grounding-result` event's `contentHash` equals `sha256:` plus the hex SHA-256 of the sentence and newline (UTF-8), computed in the test; the artefact `book/logs/grounding/drafts/ch02.md.json` parses with `groundingResultSchema` and has the same `contentHash`. `GET PROJECT_PENDING_ROUTE` (projectId `book`) parsed with `pendingListSchema` has exactly one change whose `targetPath` is `drafts/ch02.md`; its `id` is in `run-ended.pendingChangeIds`, its `proposed` equals the sentence and newline (the text the hash covers), and its `grounding` equals `{supported: 1, weak: 0, unsupported: 0, checkedAt: <the grounding-result's checkedAt>}`. A pending change has no content hash of its own (`pendingChangeSchema`, 2.1), so the test reads none from it. |
| "`check_grounding` and the on-demand endpoint both produce a `grounding-result` and an artefact." (line 25), on-demand part | **C2** `the on-demand endpoint answers a start reply, runs only the check, and writes the artefact` | `prepare` writes `drafts/ch01.md`. Steps: extract and judge only. `POST /api/agent-loop/grounding` with `{path: 'drafts/ch01.md'}` answers 200, and its body parses with `agentStartResponseSchema`. The events, in order, are `run-started`, `grounding-started`, `grounding-result`, `run-ended`, with `run-ended.reason` `completed`. The `grounding-result` has `targetPath` `drafts/ch01.md` and the reply's `runId`. The file `book/logs/grounding/drafts/ch01.md.json` exists, parses with `groundingResultSchema`, matches `GROUNDING_ARTEFACT_PATH_PATTERN`, its `contentHash` equals `sha256:` plus the hex SHA-256 of the text `prepare` wrote to `drafts/ch01.md`, and its JSON equals the `grounding-result` data without `seq`. `requestsOf(h)` holds exactly two requests (extract and judge). |
| same criterion, `check_grounding` part | **C2b** `check_grounding in an agent run emits the same events, shows a card, and writes the artefact` | Steps: extract and judge first; turn 0 calls `check_grounding` with `{"path":"drafts/ch01.md"}`; turn 1 text. The events include `tool-call-started` (`name` `check_grounding`, `family` `grounding`), `grounding-started` and `grounding-result` (with the run's `runId`), then `tool-call-result` for the same `callId`, and `grounding-result` comes before `run-ended`. The `tool-call-result` summary is `Checked drafts/ch01.md: 1 supported, 0 weak, 0 unsupported.`. The artefact exists and equals the event. The requests show the tool's `modelText` with the verdict `supported` in the turn-1 request. |
| (extra, not a criterion) the restart path of AGL-05 | **X1** `after a restart, the run state of an on-demand check still holds its grounding result` | Runs the C2 scenario, then `h.restart()`. `GET AGENT_RUN_CURRENT_ROUTE` parsed with `agentRunStateSchema` has `groundingResults` of length 1 whose `targetPath` is `drafts/ch01.md`, and `status` `ended`. |
| (extra) the refusal path of the grounding check | **X2** `a check whose extract reply is never a claim list ends the on-demand run with the readable failure and writes no artefact` | Steps: every extract request gets the reply `not a claim list`. `POST` as in C2 answers 200. `run-ended.reason` is `error`, and `run-ended.message` equals `EXTRACT_FAILED_MESSAGE`. No `grounding-result` event. `logs/grounding/` does not exist under `book`. `requestsOf` holds three extract requests and no judge request. |
| (extra) one active run | **X3** `an on-demand check is refused while another run is active` | Steps: turn 0 with `delayMs: 1000` and a text reply. `startRun` (`{intent: 'Hello'}`), then `POST` `{path: 'drafts/ch01.md'}` answers 409 with `error.code` `AGENT_RUN_ACTIVE`. After `readUntilEnded`, the run ends normally. |
| (extra) history of a check run | **X4** `a later run in the check's conversation does not replay the check to the model` | Steps: extract and judge, then a text reply for the second run. Runs C2 and reads the `conversationId` of the reply. `startRun` with `{intent: 'Next question', conversationId}`. The request whose last message is `Next question` has no message whose content contains `Check grounding`. |

Notes on the test data: the sentence `Harbour traffic doubled in 1900.` shares words with `sources/notes.md` only, so the retrieval finds that file. Offsets are the search passages' offsets (A5).

Existing tests changed by this plan (listed in 3 and 4.3): the tool-name lists (step 2), and the drafts-writing scenarios (step 3). Nothing else in the existing suites is expected to change; A3 says the implementer checks it by running the full API suite in step 5.

## 6. Agreement with downstream and parallel units

### AGL-18 (done; grounding badges), point 4 confirmed

- The grounding POST replies with `agentStartResponseSchema` (`{runId, conversationId}`), which is the web's `startReply` (AGL-18 S10). Test C2 asserts it. AGL-18 point 4 and the AGL-01 open point 4 are answered: no change to AGL-18.
- The web posts `{path}`, which is `groundingRequestSchema`. The intent label the server writes, `Check grounding: <path>`, is the label AGL-18 D8 shows for the run.
- The events and the run state match AGL-18's readers: `grounding-started` (`targetPath`), `grounding-result` (the result plus `seq`), and `groundingResults` in the run state (D10). The chip reads `summary` counts from `claims`.
- Known effect (not a criterion): AGL-18's `applyStart` moves the page to the check run's conversation (`chat-state.ts` line 386). The next intent of the page then starts in that conversation (open point 4).
- Known effect (not a criterion): after a failed automatic check, AGL-18's chip keeps its `Checking` entry until reload, because AGL-18 D9 clears nothing at run end (open point 1).

### AGL-19 (sample draft and mock scripts; `blocked_by` AGL-16; parallel with AGL-17)

- AGL-19's criterion 2 runs the engine through the AGL-16 kit (`POST /api/agent-loop-test/grounding`, body `{projectId, runId, targetPath, overlay?}`). This plan keeps the kit file, its route, `GroundingEngine.check`'s signature and behaviour, the `GroundingEngine` and `GroundingFailure` exports, and `WriteOverlay.put`. The kit works whether AGL-19 merges before or after AGL-17.
- AGL-19's mock scripts must match the message formats of AGL-16 section 4.1 (markers, the extract and judge JSON, the claim index, `RETRIEVAL_LIMIT`, `JUDGE_BATCH_SIZE`). This plan does not change those formats.
- Files: AGL-19 changes `examples/nonfiction/drafts/**`, `e2e/fixtures/mock-openai/scenarios/**` and the sample's `sources/outline.md`. This plan changes none of them and its tests use inline scenarios. No file in common.
- Interplay: once AGL-17 is on main, an e2e run that writes `drafts/` gets extract and judge calls at run end. A scenario must list its extract and judge steps before its turn steps (4.4), else an extract request takes a `turnIndex: 0` step's reply or the mock's 500, and the check fails (the run and its pending change still complete, with no summary). Either merge order is correct for both units.
- AGL-19's heading says the engine is tested through the kit "until AGL-17 exists". After AGL-17 merges, AGL-19's plan may use the real route (test C2 shows the reply, the events and the artefact it would read) or the kit, which stays.

### AGL-20 (grounding gate; `blocked_by` AGL-15, AGL-16, AGL-17, AGL-18, AGL-19, PST-14)

- "Ask the agent to draft a paragraph and see the check run on its own" (demo): C1.
- "Tap 'Check grounding'" (demo): the route of C2; the web's button posts to it (AGL-18 D8, D14).
- "The claims artefact matches the contract and carries the draft's content hash" (criterion 4): C1 and C2 assert `groundingResultSchema` and the artefact's `contentHash` against the draft's text; C2 asserts the path rule; C2b asserts that the artefact equals the event.
- "A verdict citing a passage that wasn't retrieved is downgraded" and "an invented statistic is flagged": the engine's behaviour, AGL-16 tests G1 and G2, unchanged here.
- "Expand a supported claim and open its cited source": each supported claim carries `passage` from the run's search (AGL-16 section 4.1, step 6).

### AGL-15 (pending-writes gate; no plan; parallel)

- AGL-15 is e2e only, with no `unit/` branch. It shares no file with this plan. Its scope ("the agent edits a draft") writes a `drafts/` path through an agent run, so if AGL-17 merges first, its scenario needs an extract step listed first (same note as AGL-19). The accept step is unchanged. Either order is correct. AGL-15's criterion 1 names the AGL-12 and AGL-13 tests, which this plan changes only by adding that step.

### AGL-16 kit, AGL-16 tests and CEX-06

- The AGL-16 test file stays on the kit (open point 3). Its assertions read the engine's reply, which the real route does not return (the route returns the start response and the result is in the events and the artefact).
- CEX-06 (no plan) reads `logs/grounding/<path>.json` and compares its `contentHash` with the file's hash. The artefact written at run end hashes the overlay text the pending change proposes, so the comparison holds once that text is accepted unchanged. This plan does not change the hash rule.

### Other plans and units

- `plans/TRG-14.md` (planned) changes only web, e2e and lock files (section 3 of that plan). No overlap.
- Units with no plan and no branch (AGL-15, AGL-19) are covered above. No `draft` or `planned` plan other than TRG-14 exists.

## 7. Open points (settled by the reviser, revision 2)

None is left for the Navigator: no settled decision of the module, no criterion, no protected decision and no code of a done unit has to change. Each default of revision 1 is kept.

1. **How a failed check shows (AGL-16 open point 5).** Settled: the revision 1 default. A failure is a `grounding` transcript line with `failure`; a `check_grounding` failure is a `tool-call-error` with the readable text; an on-demand failure ends the run with reason `error` and that text as `message` (X2); an automatic check's failure leaves the pending change without a summary, and the run goes on. No grounding event is sent for a failure. Source: `plans/AGL-16.md` section 8 point 5 makes this AGL-17's choice; the contract has no failure event, and no criterion of AGL-17 or AGL-20 tests a failure. Known effect, not a defect of a criterion: AGL-18 (done) keeps its `Checking <path>` chip after a failed check until reload (AGL-18 D9, D10). Options (a) (an AGL-18 web change) and (b) (a new event and a contract expand) change a done unit or a contract that nothing needs now, so they are not taken (YAGNI).
2. **Timing of automatic checks.** Settled: one check per `drafts/` path at run end, on the final overlay text, before `flushWrites`. The unit's text ("after every `draft` tool output and for every `drafts/` path the overlay touched, **before** pending changes are created at run end") is met: every draft output is an overlay entry under `drafts/` (`narrative-tools.ts` lines 204 and 205), the check comes after every output and before the pending change, and the text checked is the text proposed, so the summary describes the change it sits on (criterion 1, test C1). Module line 3 ("runs a grounding check after any draft") agrees. A check after each output would check texts that are never proposed.
3. **AGL-16's four tests stay on the kit.** Settled: `agent-loop-grounding.test.ts` and the kit are not changed. Source: `plans/DECISIONS.md` line 5420 ("AGL-17's plan retires the kit's use in favour of the real `POST …/grounding` route, and the kit file may remain, as AGL-02's does"). AGL-02's kit still serves AGL-02's tests (`agent-loop-tools.test.ts` line 35), which is the precedent named. This plan's tests use the real route only (C2, X1 to X4), so the kit gains no new use. Moving AGL-16's tests would change a done unit's approved tests with no criterion needing it.
4. **Whether a grounding-only run joins the author's conversation.** Settled: the check run gets a new conversation id; `replayTurns` skips a check run (X4). Source: `groundingRequestSchema` is `{path}` only (`grounding.ts` line 51) and AGL-18 (done) posts `{path}` and records the run with `applyStart` (AGL-18 D8). Adding `conversationId` would expand the contract and change done AGL-18 code, which no criterion needs. Known effect: the page continues in the check run's conversation after a check (AGL-18 `applyStart`, `chat-state.ts` line 386).

## 8. Review parts

One part. Step 1 writes every test of this plan in one new file, and steps 2 to 5 all change `agent-run.ts`, so the steps cannot be reviewed apart without splitting that file's change.

| Part | Steps | Tests |
|---|---|---|
| P1 — grounding wiring | 0, 1, 2, 3, 4, 5, 6 (4.3) | C1 (criterion 1); C2 and C2b (criterion 2); X1, X2, X3, X4 (extra); the existing-test edits of steps 2 and 3 |
