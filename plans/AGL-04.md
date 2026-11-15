---
id: AGL-04
status: done
unit: units/AGL-04-transcripts-history.md
---
# AGL-04 plan — Transcripts, conversation history, context trimming

Unit: AGL-04 (module Agent loop, `phase:file-tools-chat`, M1; `units/AGL-04-transcripts-history.md` front matter: blocked by AGL-03, unblocks AGL-08, parallel with AGL-05 and AGL-07). Base: `main` at b1cf97b (drafted); revised at 9edda3c, which adds only this plan. The tree was clean at the start, there is no `unit/AGL-04` branch, and the only other worktree is `unit/GRR-01`. The planner ran only read commands (`git`, `grep`, `sed`, `cat`, `wc`, `node -e` to read package.json files). It ran no test, build, install or server.

The unit file has no change notes. The whole file (29 lines) was read; it has no "changed" or "revised" section.

Each fact below is CHECKED (read by the planner; section 7), CITED (taken from another plan or DECISIONS entry, not re-read; section 8) or ASSUMED (section 8).

## 1. Decisions this plan obeys and makes

### 1a. Settled before this plan (obeyed)

| # | Decision | Source |
|---|---|---|
| O1 | One JSON Lines file per agent run at `logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl` (UTC start), written only through the Project store's in-process `appendLog`, which accepts any `ok` project. | unit line 18; `packages/contracts/src/agent-loop/constants.ts` lines 89 to 92 (template and pattern); `apps/api/src/modules/project-store/files.service.ts` lines 428 to 488 (`appendLog`) |
| O2 | Each line is a contract transcript entry `{schemaVersion: 1, at, runId, conversationId, seq, kind, data}`. The nine kinds: `intent, step, assistant-text, tool-call, tool-result, tool-error, grounding, pending-change, run-end`. The contract types `data` as `z.unknown()`. | unit line 18; `packages/contracts/src/agent-loop/transcript.ts`; `constants.ts` lines 58 to 68 (kinds) and 79 (schema version) |
| O3 | Paths are project-relative. Keys and auth headers are never written. Very long tool results are truncated with a marker and the original length. | unit line 19 |
| O4 | Conversation history is rebuilt from the transcripts, with no separate store, so any device can continue. Two GET routes: the conversation list and one conversation's history. GET never mutates. | unit line 20; `packages/contracts/src/agent-loop/routes.ts` lines 6 to 8; `modules/agent-loop.md` line 49 |
| O5 | Context trimming: when history exceeds the resolved provider's `contextSize`, shorten the oldest tool results first, then drop the oldest turns. The current intent and the system prompt are always kept. | unit line 21 |
| O6 | `logs/` is the source of truth. No run-log index. | unit line 22; `modules/agent-loop.md` line 72 (run-log index out of scope) |
| O7 | The four acceptance criteria, as written. | unit lines 25 to 28 |
| O8 | Events leave the loop at one point, `emit`, which assigns `seq`, updates the state and publishes. The transcript line for an event is written from the same call sites, so the stream and the file cannot diverge. | `apps/api/src/modules/agent-loop/agent-run.ts` lines 261 to 270 (comment: "The one place an event leaves the loop") |
| O9 | `seq`: the first event of a run is 1; `lastSeq` 0 means no event yet. The transcript `seq` is the same per-run counter as the stream's. | `plans/AGL-01.md` D3 (line 39) and D10 |
| O10 | Per-kind payloads are left to this unit. The contract types `data` as unknown; AGL-04 writes it and AGL-05 reads it. | `plans/AGL-01.md` open point 3 (line 140) and its section 5 entry for AGL-04 (line 130) |
| O11 | A conversation's history lists finished turns only; the active run is in the run state. The list entry is `{conversationId, intent, updatedAt, turnCount}` with `turnCount` at least 1. | `plans/AGL-01.md` D9 (line 45); `packages/contracts/src/agent-loop/runs.ts` lines 40 to 66 |
| O12 | The history goes between the project summary and the current intent in the model messages. | `units/AGL-03-loop-core.md` line 21 ("the conversation so far (AGL-04 provides history)"); `agent-run.ts` lines 145 to 149 |
| O13 | The budget uses the resolved provider's `contextSize`, carried by `ResolvedModel.contextSize`. | `plans/MPR-05.md` line 114; `apps/api/src/modules/providers/providers.resolution.ts` lines 24 to 31 and 159 |
| O14 | The agent writes nothing to the book except through pending changes. Its only direct writes are to `logs/`. | `modules/agent-loop.md` line 54 |
| O15 | `appendLog` refuses a project that is not `ok`. The transcript writer must handle that refusal and must not crash the run. | `plans/PST-07.md` line 165 (names AGL-04 and the ok-only rule); `files.service.ts` lines 435 to 449 (status cases) |
| O16 | Test seam: the composed app with real neighbours, a temp library, Platform's mock OpenAI server. Assertions on files on disk, transcript lines, SSE events and the mock's received requests. | `units/README.md` line 136; `modules/agent-loop.md` lines 60 to 63 |
| O17 | Module shape, route prefix, error codes. | `modules/agent-loop.md` lines 49 and 58; `units/README.md` lines 129 to 131 |

### 1b. Decisions this plan makes (a reviewer may overturn them; each names its reason)

- **D1. Payload schemas are internal.** The per-kind zod schemas live in `apps/api/src/modules/agent-loop/transcript-entries.ts`. The contract `transcript.ts` does not change, and `data` stays `z.unknown()` there. Reason: the only writer and reader are in this module (AGL-01 open point 3 says so). A typed union in the contract would be an expand later.

- **D2. Payloads per kind.** Each mirrors the stream event of the same name without `runId` and `seq` (contract comment in `transcript.ts`), plus the fields marked "added".

  | kind | payload | source and note |
  |---|---|---|
  | `intent` | `{intent}` | no stream event (`runStartedDataSchema` carries no fields, `events.ts` line 18) |
  | `step` | `{step, cap}` | no stream event; written before each model call |
  | `assistant-text` | `{step, text}` | no stream event; the text of one model call, written only when the call produced text |
  | `tool-call` | `{step, callId, name, family?, arguments, rawArguments, valid}` | `tool-call-started` (callId, name, family) plus `tool-call-args` (arguments, valid). `family` is absent for a call that is not offered. Added: `step`, `rawArguments` (the exact string the provider sent; the replay needs it, because `arguments` is the parsed value or the raw string when parsing fails, see `tool-run.ts` `parseArguments`) |
  | `tool-result` | `{step, callId, summary, output, modelText, diffPreview?, sourcesUsed?, provenance?}` | `tool-call-result`. Added: `step`, `modelText` (the text the model received, `outcome.modelText`, `agent-run.ts` lines 240 to 242). The three optional fields use the contract schemas (`diffPreviewSchema` in `cards.ts`, `draftProvenanceSchema` in `provenance.ts`, `entityRefSchema`) so AGL-09 adds values without a schema change |
  | `tool-error` | `{step, callId, message, attempt, withdrawn?}` | `tool-call-error`. Added: `step` |
  | `run-end` | `{reason, pendingChangeIds, message?}` | `run-ended` (`events.ts` lines 68 to 73) |
  | `grounding`, `pending-change` | not written by AGL-04 | AGL-16/17 and AGL-12 define them. The reader accepts such lines and keeps them out of turns |

- **D3. `seq` of every line is `state.lastSeq` at the moment the line is written.** No new numbers are created, so the stream's counter is unchanged. The intent line is written after `run-started`, so it has seq 1. The `run-end` line has the seq of `run-ended`, which is the largest seq of a finished run. AGL-05 rebuilds `lastSeq` as the largest seq in the transcript, and this rule makes that equal to the stream's value.

- **D4. Write points in the loop.**
  - `intent`: written once the resolve settles (resolved, aborted or failed), before anything else, so the resolved key is known to the scrubber (D7). An idempotent `writeIntent()` is called right after the resolve and again at the top of `finish()`, so every transcript starts with its intent even when the resolve is aborted or throws. (Revised: the draft wrote it before the resolve, when the key is not yet known, so a key typed in the intent would have been written unscrubbed.)
  - `step`: before each model call.
  - `assistant-text`: when a model call ends, if the call produced text. A stop that lands mid-stream still writes the text received so far (D9).
  - `tool-call` then `tool-result` or `tool-error`: for every call the loop dispatches, offered or not, after `runCall` has emitted its stream events. A call the loop never dispatches (a stop between calls) gets no lines. So a finished turn never holds a tool call without its answer.
  - `run-end`: after `run-ended` is published, with `pendingChangeIds` (empty until AGL-12) and `message` for `error`. Both the publish and this write run synchronously inside `finish()`, so a follow-up start never sees a finished run without its `run-end`.
  - No line for `token-delta`, `run-started`, `step-cap-reached` (the `run-end` reason `capped` says it) or for the tool stream events on their own.

- **D5. The writer.** `TranscriptWriter` (transcript-writer.ts) builds one line `JSON.stringify({schemaVersion: 1, at: new Date().toISOString(), runId, conversationId, seq, kind, data})`, after scrubbing and truncating `data` (D7, D8), and calls `files.appendLog(projectId, path, line)`. `JSON.stringify` escapes CR and LF inside strings, so the single-line rule in `appendLog` holds. Any error is caught. The first failure is logged once on the server, later lines of that run are not attempted, and the loop goes on. The writer never throws into the loop (settled open point 3).

- **D6. Path.** `AgentRunsService.start()` computes the path from the UTC start: `new Date().toISOString()` with `-` and `:` removed, the first 15 characters (`yyyymmddThhmmss`), then `Z`. Example: `20261115T163000Z`. The file name is `<stamp>-<runId>.jsonl` inside `logs/agent-runs/`. It matches `AGENT_TRANSCRIPT_PATH_PATTERN` (constants.ts line 91 to 92).

- **D7. Scrubbing.** Every string in `data`, at any depth, including the author's intent, has two replacements: the resolved key (`ResolvedModel.key`, when set) becomes `<key>`, and the library root becomes `<library>`. The library root is `ProjectStoreService.libraryRoot` (project-store.service.ts line 36, the configured `SCRIBA_BOOKS_DIR`, not realpathed) and also its `realpath`. The longer of the two is replaced first (on macOS the realpath `/private/var/...` contains the configured `/var/...`). An empty or absent key is not replaced. Reason: AC4, and the library root is the absolute container path in production. In the test harness `SCRIBA_BOOKS_DIR` is the temp library (`create-test-app.ts` line 79; A11 now checked).

- **D8. Truncation, structure kept.** A string longer than `TRANSCRIPT_TEXT_LIMIT` (8,192 characters, proposed; open point 1) is replaced by its first 8,192 characters followed by ` … [truncated: original length N characters]`. Objects and arrays keep their shape, so a narrative output `{kind, content}` keeps `kind`. Only the transcript copy is truncated; the stream and the live state are not. The replay uses the stored text, so a follow-up sees the truncated text.

- **D9. Per-step text buffer.** `AgentRun` keeps `stepText`, the text of the model call in progress. `apply()` adds to it on each `token-delta`, and the call resets it. `assistant-text` is written when the call ends normally, or flushed by `finish()` before `run-end` when a stop or an error ends the run mid-call. This does not depend on how the provider client reports an abort mid-stream (section 8, A6).

- **D10. Replay.** `replayTurns(finishedRuns)` in conversation-history.ts. For each finished run, in run order:
  - `{role: 'user', content: intent}`;
  - for each step in ascending order: `{role: 'assistant', content: text or ''}`, with `toolCalls: [{id: callId, name, arguments: rawArguments}]` when the step has tool-call lines; then one `{role: 'tool', toolCallId, content}` per call, where `content` is `modelText` (tool-result) or `message` (tool-error).
  - A step with no text and no calls adds nothing.
  - A completed run's final answer is a step with text and no calls, so it is included. The live loop does not push it, because the run ends; the history must hold it.
  This reproduces the messages the live loop sent (`agent-run.ts` lines 165 to 172 and 240 to 242).

- **D11. Trimming.** `trimHistory(messages, contextSize)` in conversation-history.ts. The estimate of a message is `Math.ceil(length / 4)` over its `content` and `rawArguments` (section 8, A3). While the estimate of the history exceeds `contextSize`:
  1. shorten the oldest tool message that is longer than `SHORTENED_TEXT_LIMIT` (200 characters, proposed; open point 1) and not yet shortened: keep its first 200 characters and append ` … [shortened: original length N characters]`; re-check;
  2. when no tool message is left to shorten, drop the oldest turn (its user message and everything up to the next user message); re-check.
  Stop when the estimate fits or the history is empty. The system prompt, the project summary and the current intent are not in the history list, so they are never dropped. The budget applies to the history alone (open point 2).

- **D12. Finished turns.** A run is a finished turn when its transcript has a `run-end` line. The current run is never in its own history. Unfinished transcripts (a crash, or a run still going) are excluded (open point 4).

- **D13. Reader.** `AgentTranscriptsService` (transcript-reader.ts). It lists `logs/agent-runs` through `FilesService.list`; a missing folder is an empty list. It keeps the names that match `AGENT_TRANSCRIPT_PATH_PATTERN`, reads each through `FilesService.read`, and parses each line with `transcriptEntrySchema` and the D2 payload schemas. A line that does not parse, such as a partial last line after a crash, is skipped. A file that the read refuses (over the 5 MiB cap, open point 7) is skipped. Cards are built the way `agent-run.ts` `apply()` builds them (lines 273 to 304): `status: 'done'` after a result, `status: 'error'` with `error: {message, attempt, withdrawn?}` after an error, `arguments` and `valid` from the call. A call without `family` makes no card. The reader is shared with AGL-05.

- **D14. Conversations.** Runs are ordered by the `at` of their intent line (millisecond precision), ties broken by file name. (Revised: the draft ordered by file stamp, which has one-second precision; two runs started in the same second, as in G1 and AC2, would then be ordered by their random run ids.) The list holds conversations with at least one finished run. For each: `intent` is the intent of the earliest run, `updatedAt` is the `at` of the latest run-end, and `turnCount` is the number of finished runs. The list is sorted by `updatedAt`, newest first. A history's turns are in run order, oldest first; the replay (D10) uses the same order. A turn is `{runId, intent, assistantText, cards, endedAt, reason}`: `assistantText` is the concatenation of the run's `assistant-text` texts in order (the same string the live state accumulates), `endedAt` is the `at` of its run-end, and `reason` is its reason.

- **D15. Routes and errors.** A new controller, `agent-conversations.controller.ts`, serves `GET AGENT_CONVERSATIONS_ROUTE` and `GET AGENT_CONVERSATION_ROUTE` (routes.ts lines 6 to 8). Both use the active project. With no active project: `AGENT_NO_ACTIVE_PROJECT` (409), checked with `store.activeId()` before any read (open point 11). An unknown conversation answers 200 with `turns: []` (open point 10). The GET writes nothing.

- **D16. Where history is loaded.** In `execute()`, after the resolve and the abort check, before the loop. Model messages are, in order: the system prompt, the project summary, the trimmed history, the user intent, then the run's own turn. A failed history read ends the run with `error` and its readable message, unless a stop was already requested (the requested end wins, as `finish()` does today).

- **D17. The run's own file is excluded.** Its file exists while the run is active (intent and step lines, no run-end), so it is unfinished and excluded by D12. The exclusion is also explicit, by `runId`, so the rule does not depend on the write order.

- **D18. The project summary is not changed.** `agent-prompt.ts` lists every top-level folder, `logs` included (line 26). After the first run the system message therefore shows the `logs` count. Open point 12.

- **D19. No contract change, no new route, no new error code.** `packages/contracts` is untouched. The existing routes and codes are used.

- **D20. One review part** (section 9). Three new test files (section 2). (Revised: the draft's two parts split step 5 between them and left steps 1 and 6 to 9 in no part.)

- **D21. The invariant sweep gets a fixture path for the history route.** `apps/api/test/invariant-sweep.ts` `FIXTURE_PATHS` (line 73) requires an entry for every route template with `:`; a template with no entry fails SAU-07's test 1 by name (lines 4 to 5 and 192 to 201). Entry: `'/api/agent-loop/conversations/:conversationId': { path: '/api/agent-loop/conversations/no-such-conversation' }`, no seed. (Revised: the draft did not name this file; `invariant-get-head.test.ts` would have failed.)

- **D22. Mock scripts for a follow-up.** The mock's `turnIndex` matcher counts the assistant messages of a request (`e2e/fixtures/mock-openai/server.mjs` lines 117 to 120), so a replayed history shifts it. In each follow-up test the run-B step is listed first and matches `{endpoint: 'chat', lastMessageRole: 'user', lastMessageContent: 'Second question'}`; run A's steps match `turnIndex` 0, 1, 2 as in `agent-loop-run.test.ts` lines 178 to 197. The first matching step wins (`findStepIndex`, line 134). (Revised: added.)

## 2. Files to change

Changed:
- `apps/api/src/modules/agent-loop/agent-run.ts`: the write points and the step text buffer (D4, D9) in `execute` (lines 137 to 178), `askModel` (181 to 205), `runCall` (208 to 243) and `finish` (247 to 258); the history load and trimming before the loop (D16); `AgentRunInit` gets the transcript path, and `AgentRunDeps` (lines 37 to 42) gets the writer factory, the history reader and the scrub inputs.
- `apps/api/src/modules/agent-loop/agent-runs.service.ts`: `start()` (lines 54 to 100) computes the path (D6) and passes the writer and history dependencies into `AgentRun`; the constructor gains the reader and the writer factory. `stop`, `release` (line 138) and the project-switch stop are unchanged.
- `apps/api/src/modules/agent-loop/agent-loop.module.ts`: registers `AgentTranscriptsService`, the writer factory and the new controller; the comment on line 29 ("Transcripts, history and grounding land in later units.") is updated.
- `apps/api/test/invariant-sweep.ts`: one `FIXTURE_PATHS` entry for `AGENT_CONVERSATION_ROUTE` (D21). Nothing else in the file changes.

Created:
- `apps/api/src/modules/agent-loop/transcript-entries.ts`: the D2 schemas, the kind-to-schema map, and the constants `TRANSCRIPT_TEXT_LIMIT` (8,192) and `SHORTENED_TEXT_LIMIT` (200), both proposed.
- `apps/api/src/modules/agent-loop/transcript-writer.ts`: `TranscriptWriter` (D5, D7, D8).
- `apps/api/src/modules/agent-loop/transcript-reader.ts`: `AgentTranscriptsService` (D13, D14). AGL-05 imports it.
- `apps/api/src/modules/agent-loop/conversation-history.ts`: `replayTurns`, `trimHistory`, `estimateTokens` (D10, D11). Pure functions.
- `apps/api/src/modules/agent-loop/agent-conversations.controller.ts`: the two GET routes (D15).
- `apps/api/test/agent-loop-transcript.test.ts`: AC1 and AC4.
- `apps/api/test/agent-loop-history.test.ts`: AC2, G1, G2, G3.
- `apps/api/test/agent-loop-trim.test.ts`: AC3, two cases (T3a, T3b).
- Optional shared harness: `apps/api/test/agent-loop-transcript.kit.ts`. The harness in `agent-loop-run.test.ts` is private to that file, so its helpers (`openHarness`, `post`, `startRun`, `readUntilEnded`) are copied into the kit, not imported.

Not changed: `packages/contracts/**`, `apps/web/**`, `apps/api/src/modules/project-store/**`, `apps/api/src/modules/providers/**`, `apps/api/test/agent-loop-*.test.ts` (existing files), `apps/api/src/modules/agent-loop/agent-prompt.ts` (settled open point 12), `units/**`, `modules/**`. The existing agent-loop tests (`agent-loop-run.test.ts`, `agent-loop-start.test.ts`, `agent-loop-stop.test.ts`, `agent-loop-tools.test.ts`, `agent-loop-search.test.ts`) and the SAU-07 invariant tests (`invariant-get-head.test.ts`, `invariant-mutation-guard.test.ts`) must pass unchanged. C6 (`agent-loop-run.test.ts` line 335) checks the prompt text, the summary's title line, `sources (1 file)` and the tool names of the first request; its second run starts a new conversation. The `logs` count changes none of them. C2 (line 285) continues a capped run with its `conversationId`: B now receives A's history (eleven answered `list_files` steps; the twelfth step's calls were never dispatched, so it adds nothing, D4 and D10); its mock entry matches only `endpoint: chat`, and it still asserts 12 then 24 requests, which history does not change. No agent-loop test takes a library snapshot around a run (checked by grep), so the transcript files change no existing assertion.

The planner writes only `plans/AGL-04.md`.

## 3. Procedure

0. **Preconditions.** Branch `unit/AGL-04` from `main`. `git status` clean. `npm ci`. Baseline: `npm test -w @bbartolome/scriba-api` (build, then vitest) passes. Record the file and test counts; the last recorded figure is 86 files and 275 API tests at AGL-03 (DECISIONS, 2026-11-15, AGL-03 review), and AGL-10 added tests since.
1. **Red.** Write the three test files (section 4) and the shared harness kit, run them against the current code (`npx vitest run test/agent-loop-transcript.test.ts test/agent-loop-history.test.ts test/agent-loop-trim.test.ts` in `apps/api`). Each criterion must fail for its reason: no file under `logs/agent-runs/`; no history messages in the mock's second request; no GET route. Commit as `test(AGL-04): ...` (the unit history uses this pattern: `0880786 test(AGL-10): add failing search_notes tests`).
2. **Payloads and writer.** `transcript-entries.ts` (D2, constants), then `transcript-writer.ts` (D5, D7, D8).
3. **Replay and trimming.** `conversation-history.ts` (D10, D11). Pure functions, so they can be checked through the AC2 and AC3 tests only (the testing rule is external behaviour).
4. **Reader and controller.** `transcript-reader.ts` (D12 to D14) and `agent-conversations.controller.ts` (D15), and the `FIXTURE_PATHS` entry in `apps/api/test/invariant-sweep.ts` (D21).
5. **Wiring.** `agent-runs.service.ts` (path, dependencies; D6), `agent-run.ts` (write points D4, buffer D9, history load and trimming D16, flush in `finish` D4), `agent-loop.module.ts` (providers, controller).
6. **Green.** The three new test files, the five existing agent-loop test files and the two invariant test files (section 2) pass, then `npm test -w @bbartolome/scriba-api`.
7. **Mutation checks.** Apply each change, run the named test, confirm it fails, then revert and confirm `git status` shows only the intended files:
   - (a) remove the scrubbing (D7): AC4 fails.
   - (b) build the history but do not insert it into the messages: AC2 fails.
   - (c) trim by dropping turns before shortening tool results: AC3 case T3a fails.
   - (d) skip the intent line: AC1 fails.
   - (e) treat an unfinished transcript as finished (D12): G2 fails. (Revised: AC2 does not fail, because D17 also excludes the current run by `runId`.)
   - (f) write `seq` as the line index instead of the stream's counter (D3): AC1 fails on the seq check.
8. **Checks.** `npm run lint -w @bbartolome/scriba-api` (eslint); `npm test -w @bbartolome/scriba-api`; then at the root `npm run build` and `npm run lint` (which includes prettier `--check .`). AGL-03's review ran lint, test and build the same way (DECISIONS, 2026-11-15, AGL-03 entry).
9. **Commits.** `test(AGL-04): ...` (red), `feat(AGL-04): ...` (green), `docs(AGL-04): ...` (acceptance criteria ticked, plan status done), following the unit history.

## 4. Acceptance criteria and tests

Seam (the module default, O16): the composed app with `createTestApp` (`apps/api/test/create-test-app.ts`), a temp library from `buildProjectsLibrary` (`project-store-projects.kit.ts`), the mock OpenAI scenario (`startMockOpenAI`, `recordsOf`, `providers-client.kit.ts` line 61), the SSE observer (`observeEvents`, `invariant-sweep.ts` line 354). Setup pattern: `agent-loop-run.test.ts` lines 83 to 111 and the helpers near lines 112 to 200. The fixture's `book/sources/outline.md` is `# Outline\n` (10 bytes; `project-store-projects.kit.ts` line 48). Each test writes its own larger source file where it needs one.

- **AC1. A transcript file in `logs/` matches the contract entry schema line by line.** (test T1, `agent-loop-transcript.test.ts`)
  - Setup: the mock script is `list_files`, then `read_file` of `sources/long.md` (a file the test writes, 20,000 characters), then text `Done.`. One start, intent `Read two files`.
  - Assertions: exactly one file in `book/logs/agent-runs/` matches `AGENT_TRANSCRIPT_PATH_PATTERN` and ends with `-<runId>.jsonl`; every line parses with `transcriptEntrySchema`; every `kind` is in `AGENT_TRANSCRIPT_KINDS`; the kinds, in order, are `intent, step, tool-call, tool-result, step, tool-call, tool-result, step, assistant-text, run-end`; each `data` parses with its D2 schema; the `tool-result` line of the long read has its long string truncated with the marker and the original length, in both `output` and `modelText`, and the list result is not truncated; the largest `seq` of the lines equals the `seq` of `run-ended` on the SSE stream, and the `seq` values never decrease.
  - Catches: a missing intent line, a wrong kind or order, an unmarked long result, a seq mismatch (mutations d, f).

- **AC2. A follow-up start with the same `conversationId` sends the earlier turns to the mock.** (test T2, `agent-loop-history.test.ts`)
  - Run A: intent `Say hello first`, mock: `list_files`, then `read_file` of `sources/outline.md`, then text `The outline is short.` Run B, after A has ended: `{intent: 'Second question', conversationId: <A's>}`, mock: text `Second answer.`
  - Mock steps as D22 (B's step first, matched on its intent; A's steps on `turnIndex` 0 to 2).
  - Assertions on B's request, in order: the system prompt; the project summary (role `system`, contains `Project: Book (genre pack: nonfiction).`; not compared with A's summary, whose `logs` count differs, D18); `user: Say hello first`; `assistant` (no text, tool calls `list_files` with id X); `tool` (`tool_call_id` X, content equal to A's list result as sent to the model); `assistant` (tool call `read_file` with id Y); `tool` (`tool_call_id` Y); `assistant: The outline is short.`; then `user: Second question` last. The ids X and Y equal the `callId`s of A's cards in `GET AGENT_CONVERSATION_ROUTE` (G1 checks that route).
  - Catches: mutation (b) and (e).

- **AC3. With a tiny `contextSize`, the oldest tool results are shortened before turns are dropped; the system prompt and the current intent remain.** (tests T3a and T3b, `agent-loop-trim.test.ts`)
  - Two cases, each with its own harness, because `contextSize` is set per provider at start. In both, run A is `list_files`, then `read_file` of `sources/long.md` (20,000 characters), then text `Done.`; run B (same conversation, intent `Second question`) is then sent.
  - Mock steps as D22. Both cases set `contextSize` in the provider section of the harness settings (the contract allows any positive integer, `providers/config.ts` line 13).
  - T3a, `contextSize` 1,000: the stored `modelText` of the long read is already cut by the writer to 8,192 characters plus the D8 marker, so its estimate is about 2,060 (revised: the draft said about 5,000), which exceeds the budget; shortening the tool messages, oldest first (the list result first when it is longer than 200 characters, then the read), brings the history to a few hundred tokens. Assert: B's request contains A's user intent, A's assistant tool calls, and A's `read_file` tool message (`tool_call_id` of the `read_file` call), whose content contains `[shortened: original length` and is at most 300 characters; the system prompt is the first message; the current intent is the last.
  - T3b, `contextSize` 20: the shortened history still exceeds 20, so A's turn is dropped and the history is empty. Assert: B's request is exactly three messages: the system prompt, the project summary, and `user: Second question`.
  - Catches: mutation (c) (T3a fails).

- **AC4. No transcript line contains an absolute container path or a configured key.** (test T4, `agent-loop-transcript.test.ts`)
  - Setup: the provider has a `keyRef` whose secret is `sk-test-AC4-SECRET`, written with the existing secrets helpers (`apps/api/test/secrets.kit.ts` line 106 `secretsFile`; `SecretsStore.put`, `providers/secrets/secrets-store.ts` line 49). The intent contains the fixture's absolute path to `sources/outline.md` and the key text `sk-test-AC4-SECRET`. The mock script is `read_file` of `sources/outline.md`, then text `Done.`, so tool lines are written too.
  - Assertions: the run ends `completed` (the key is resolved, so the scrubber has it); no line of the transcript contains the key, the absolute library root (the fixture's path, and its realpath), or the absolute project path. The intent line contains `<library>/book/sources/outline.md` and `<key>` with the placeholders. (Revised: the draft's intent held no key, so the key half of the criterion was not exercised by mutation (a).)
  - Catches: mutation (a).

Additional tests (not acceptance criteria; they check decisions D12, D13, D15, D5):
- **G1.** After run A (text only) and run B (list, read, text) in one conversation: `GET AGENT_CONVERSATIONS_ROUTE` returns one entry with `intent` = A's intent and `turnCount` 2, parsed with `conversationListSchema`; `GET AGENT_CONVERSATION_ROUTE` returns two turns in run order, parsed with `conversationHistorySchema`, with `reason: 'completed'`, cards in the live card shape (`status: 'done'`, `arguments`, `valid`, `summary`, `output`), and `assistantText` equal to the text the SSE token-deltas of the run carried. Both GETs leave the library unchanged (`snapshotLibrary`, `invariant-sweep.ts` line 272, before and after).
- **G2.** A partial last line (invalid JSON, no newline) is appended to a finished run's file, and an intent-only file with a valid name and a fresh run id is created in `logs/agent-runs/`. GET history still returns the finished turns and omits the unfinished one, without an error.
- **G3.** A regular file named `agent-runs` is created inside `book/logs/` before the run. The run completes with the usual events and `run-ended: completed`; no transcript is created; the history is empty; the start and the events are not affected (D5).

## 5. Agreement with downstream units

| Unit (state) | What it needs from AGL-04 | Agreement and action |
|---|---|---|
| AGL-05 (`units/AGL-05-current-run-state.md`; parallel; **no plan yet**) | The latest transcript of the project; `assistantText` (D14); cards (D13); `lastSeq` as the largest seq (D3); "no run-end means stopped" (unit line 20). | AGL-04 lands `AgentTranscriptsService`; AGL-05 imports it and writes no second parser. File overlap: `agent-runs.service.ts` (AGL-05's current-state method), `agent-runs.controller.ts` (AGL-05's `GET runs/current`; AGL-04 keeps its routes in a separate controller file), `agent-loop.module.ts` (both register providers). Whichever merges second rebases. `plans/AGL-05.md` does not exist; `plans/QUEUE.md` line 3 lists AGL-05 as available, so its plan is needed before it starts. Rules AGL-05's plan must keep (settled open point 4): history shows finished runs only, and a transcript without `run-end` is the run state's `stopped`; run order is the intent line's `at` (D14); `cap` comes from the `step` line (D2). |
| AGL-07 (merged; check B4 in `plans/AGL-07.md` line 137) | The web reads `conversationListReply` and `conversationHistoryReply` (`apps/web/src/app/features/agent-loop/agent-contract.ts` lines 22 to 34 and the parser near line 205) and maps history cards with `cardOfState` in `turnsOfHistory` (`chat-state.ts` lines 308 to 318). | D13 builds history cards in the live shape. G1 checks the shape with the contract schemas. The web's own parse is not run here (section 8, A5). |
| AGL-08 (`units/AGL-08-file-tools-chat-gate.md` line 7; blocked by AGL-04) | Demo step 3, the same conversation on a phone, is the history GET. Demo step 5, opening `logs/`, is the JSONL files. The "transcript-schema criteria" of AGL-08's line 22 are AC1 here. | Covered by AC1 and G1. |
| AGL-09 (`units/AGL-09-narrative-tools.md` line 21) | Provenance on the `tool-call-result` event and in the transcript. | D2 `tool-result` takes the optional `provenance`, `sourcesUsed`, `diffPreview`, copied from the event. No later change needed. |
| AGL-12 (write overlay) and AGL-16/17 (grounding; `units/AGL-17-grounding-wiring.md` line 20, "a grounding transcript section") | The `pending-change` and `grounding` kinds and their payloads. | Their units define the payloads and add the writer schemas (D2). The reader keeps those lines out of turns and does not fail on them. |
| AGL-03 (merged; `units/AGL-03-loop-core.md` line 21) | The insertion point of the history. | D16 puts it between the summary and the intent. The existing C6 (`agent-loop-run.test.ts` line 335) still passes. |
| AGL-10 (merged) | `search_notes` joins the project family. | Its calls carry `family: project` in `tool-call`. No change. |
| PST-07 (`plans/PST-07.md` line 165) | AGL-04 and GRR-07 write under `logs/` through `appendLog` and must handle the ok-only refusal. | D5. |
| GRR-07 (`units/GRR-07-run-logs-recovery.md` line 18) | The same `appendLog` pattern under `logs/recipe-runs/`. | No shared code. No plan exists yet. |
| MPR-05 (`plans/MPR-05.md` line 114) | Budgets use `ResolvedModel.contextSize`. | D11. |
| AGL-01 (`plans/AGL-01.md`) | The contract shapes: conversation list and history (D9), routes (D14), transcript entry (D10). Open point 3 (payloads). | D1 and D2 answer open point 3 for this unit. The contract is unchanged. |

## 6. Open points, settled by the reviser

All twelve are settled here with the simplest option. None changes a settled decision or a criterion, so none goes to the Navigator. The numbering is kept, so the references "open point N" above still hold.

1. **Limits and marker wording (D8, D11). Settled: as proposed.** `TRANSCRIPT_TEXT_LIMIT` 8,192 characters, `SHORTENED_TEXT_LIMIT` 200 characters, markers ` … [truncated: original length N characters]` and ` … [shortened: original length N characters]`. Module-internal constants in `transcript-entries.ts`; a later unit may tune them without a contract change.
2. **Budget scope (D11). Settled: the literal reading.** The history alone is compared with `contextSize`; the kept messages, tool schemas and a reply reserve are not counted. It is what the unit says, and AC3 only needs the order of trimming.
3. **A failed transcript write (D5). Settled: the run goes on.** The failure is logged once on the server; later lines of that run are not attempted. No new end message is needed, and the unit's own reason for `appendLog` on any ok project (so a stopped run can finish its log) favours keeping the run. G3 tests it.
4. **Unfinished transcripts (D12). Settled: excluded from history.** History lists finished turns only (O11, AGL-01 D9). This does not conflict with AGL-05: AGL-05 reports a transcript without `run-end` as `stopped` in the run state, which is a different view. AGL-05's plan must use the same reader and keep that rule; noted in section 5.
5. **Calls that are not offered (D4). Settled: recorded.** `tool-call` without `family`, then `tool-error` with the NOT_OFFERED text. Without them the replay would send an assistant tool call with no tool answer, which an OpenAI-compatible provider refuses.
6. **`rawArguments` (D2). Settled: added.** `ToolCall.arguments` is the raw string (`client/types.ts` line 53), and the replay must send it back as the model produced it; the parsed value cannot restore it.
7. **Read cap (D13). Settled: option (c).** A file over 5 MiB is skipped by the reader, and the plan says so (D13, A9). Each string is already cut to 8,192 characters (D8), so only a run with hundreds of tool calls can reach the cap. Options (a) and (b) add machinery or touch the Project store; YAGNI.
8. **Agent access to transcripts. Settled: no change.** The transcripts hold no keys and no absolute paths (D7), and their tool results already reach the model through the history. Hiding `logs/agent-runs` would touch the Project store or the tool registry, outside this unit.
9. **Scrub scope (D7). Settled: as proposed.** The key and both forms of the library root are replaced in every string, intent included, longer root first. `libraryRoot` is `SCRIBA_BOOKS_DIR` (checked, A11), the absolute books path in the container. The intent line is written after the resolve (D4), so the key is known when it is scrubbed. If the resolve itself fails no key is resolved, so none can be replaced; nothing in the run carries a key then.
10. **Unknown conversation (D15). Settled: 200 with `{conversationId, turns: []}`.** No new error code (D19). The contract allows an empty `turns` array (`runs.ts` line 52).
11. **GET with no active project (D15). Settled: `AGENT_NO_ACTIVE_PROJECT` (409)**, the code the start route uses (`agent-runs.service.ts` lines 55 to 61; `errors.ts` lists it), checked with `store.activeId()` before any read.
12. **The `logs` count in the project summary (D18). Settled: unchanged.** `agent-prompt.ts` is not touched. The count is true information, no existing test checks it (C6 checks `sources (1 file)` only), and the new tests assert the summary by its title line (AC2).

There are no open points left.

## 7. Facts checked

Read by the planner (files read, and commands run; all read-only):
- `git status` (clean), `git branch -a` (no `unit/AGL-04`), `git worktree list` (`main` and `unit/GRR-01` at ce6019e). `plans/AGL-04.md` did not exist. `plans/QUEUE.md` line 2 lists AGL-04 as available.
- `units/AGL-04-transcripts-history.md` (whole file, 29 lines: front matter, Why, Decisions, four criteria; no change notes).
- `modules/agent-loop.md` (lines 1 to 84, including the ordering, graph, cross-cutting decisions, testing principles, out of scope, notes).
- `units/README.md` (conventions, blocker notation, phase table, and the shared conventions at lines 126 to 136).
- `plans/DECISIONS.md`: searched for `AGL-04` (two hits: line 2901, the AGL-01 review; line 4404, availability) and `AGL-03` (21 hits). Read these entries only: lines 2895 to 2905 (AGL-01 review, E1 and transcript template), lines 4010 to 4016 (MPR-08 note on AGL-03 and providers), lines 4276 to 4290 (AGL-10 seam decision; AGL-03 blocks AGL-10), lines 4370 to 4418 (MPR-08 merge, GRR-01 hold, AGL-03 merge at line 4399 to 4404 with "AGL-04 available", AGL-10 plan failure, AGL-10 merge at 4418).
- `plans/AGL-03.md` front matter and headings (structure), and the "Review parts" section (lines 167 to 171).
- `units/AGL-03-loop-core.md` (whole file), `units/AGL-05-current-run-state.md` (whole file), `units/AGL-08-file-tools-chat-gate.md` (whole file), `units/AGL-07-chat-panel-ui.md` line 8.
- `plans/AGL-01.md` lines 38 to 51 (D2 to D15), lines 128 to 141 (downstream lines and open points 1 to 4), and the grep of its AGL-04 mentions.
- `plans/AGL-07.md` line 18 and line 137; `plans/AGL-02.md` line 202; `plans/AGL-10.md` line 232; `plans/MPR-05.md` line 114 and line 159; `plans/PST-07.md` lines 165 and 201; `plans/GRR-01.md` lines 11 and 60 to 67 (its files are graph-runner and contracts, no agent-loop or Project store files).
- Scan of `plans/*.md` for `status:` values: only GRR-01 is `planned`; no plan is `draft` (the scan matched `draft` or `planned`).
- `units/GRR-07-run-logs-recovery.md` line 18; `units/AGL-09-narrative-tools.md` line 21; `units/AGL-17-grounding-wiring.md` line 20; `units/AGL-03` lines 18 to 28.
- Contracts: `packages/contracts/src/agent-loop/transcript.ts` (whole file); `constants.ts` (lines 1 to 100: kinds 58 to 68, schema version 79, path template 89 to 90, pattern 91 to 92, step cap 6, grounding constants 71 to 87, enums); `routes.ts` (whole file, conversation routes at lines 6 to 8); `runs.ts` (lines 1 to 75: start and stop request, run state at 25, conversation turn at 40, history at 50, summary at 56, list at 64); `events.ts` (lines 1 to 74: base 12 to 15, run-started 18, step-cap-reached 63 to 66, run-ended 68 to 73; the list of event schemas 75 to 135); `cards.ts` (card schema); `ids.ts` (whole file); `index.ts` (whole file, exports `transcript.js`, `routes.js` and the rest).
- `packages/contracts/src/providers/defaults.ts` lines 1 to 14 (PROVIDER_DEFAULTS: contextSize 64,000, maxTokens 4,096, retries 2, timeout 120,000); `providers/config.ts` line 13 (contextSize) and line 17 (keyRef).
- `packages/contracts/src/project-store/constants.ts` line 23 (`FILE_SIZE_CAP_BYTES` = 5 MiB).
- Agent-loop code: `agent-runs.service.ts` (whole file: start 54 to 100, `onProjectSwitched` registration 49, `release` 138); `agent-run.ts` (whole file: `begin` 122, `requestEnd` 128, `execute` 137 to 178, the system and turn arrays 145 to 151, the loop 152 to 174, `askModel` 181 to 205, `runCall` 208 to 243, the content for the model 240 to 242, `finish` 247 to 258, `emit` 261 to 270, `apply` 273 to 304); `agent-runs.controller.ts` (whole file); `agent-loop.module.ts` (whole file; line 29 comment); `agent-prompt.ts` (whole file; the summary's folder list at line 26); `agent-tools.service.ts` (whole file); `tools/tool-run.ts` (lines 1 to 130; `NOT_OFFERED` at line 18; the not-offered branch at 96 to 103; `parseArguments`); `tools/tool-types.ts` (`ToolOutcome` at 79 to 81); `tools/builtin-tools.ts` (summary strings at lines 67, 91, 141).
- Project store: `files.service.ts` (`LOG_PATH` line 61; `list` line 232; `read` line 257 to 270; `readFileAt` lines 135 to 147 with the cap at 143; `appendLog` lines 428 to 488 with the status cases at 435 to 449, the `logs/` check at 459, and the line-break check at 451; `stateDir` lines 489 to 492; `projectFor` lines 525 to 532, with `requireActive` at 526); `project-store.service.ts` (`libraryRoot` getter at line 36); `project-folders.ts` (`LAYOUT_FOLDERS` at lines 9 to 15, `logs` at line 14); `samples.service.ts` line 37 (`EXCLUDED_PATHS` includes `logs`).
- Providers: `providers.resolution.ts` (`ResolvedModel` lines 24 to 31 with `contextSize` at 27; `resolved()` with `contextSize: provider.contextSize` at 159); `client/types.ts` (`ChatMessage` lines 5 to 9; `ToolCall`, `ChatRequest`); `openai-compatible-client.ts` (`streamChat` at 116; the pre-check on abort at 121 to 123); `secrets/secrets-store.ts` (`put` at 49, `get` at 59).
- Web: `apps/web/src/app/features/agent-loop/agent-contract.ts` (constants at 22 to 27, `conversationPath` at 31 to 34, the conversation parse near line 205); `chat-page.ts` (the history reply handler of `openConversation` is at line 502; the list call in `loadConversations` is at line 572); `chat-state.ts` (`turnsOfHistory` at 308 to 318).
- Tests: `apps/api/test/agent-loop-run.test.ts` (C1 at 202, C2 at 285, C6 at 335, S4 at 390; harness at 83 to 111; helpers from 112; `providersSection` near 43; the mock's `recordsOf` at line 264); `apps/api/test/providers-client.kit.ts` (exports `startMockOpenAI`, `recordsOf` at line 61); `apps/api/test/invariant-sweep.ts` (`snapshotLibrary` at 272, `observeEvents` at 354); `apps/api/test/secrets.kit.ts` (`secretsFile` at 106); `apps/api/test/project-store-projects.kit.ts` (line 48: `outline.md` is `# Outline\n`).
- Scripts: root `package.json` (`test`, `lint` with prettier, `build`); `apps/api/package.json` (`test` = build then vitest; `lint` = eslint). Dependencies: no tokenizer in root or API `package.json` (only `yaml` and `ajv` among the relevant ones); Zod major 4 in `package.json` and `apps/api/package.json`.
- Other plans and records: `plans/QUEUE.md` lines 2 and 4; `plans/AGL-10.md` line 232; `plans/PST-07.md` lines 165 and 201.
- Also checked: `keyRef` is an optional field of the provider config (`config.ts` line 17); `read` and `list` require an active project (`projectFor`), and `appendLog` does not (`appendLog` checks status only); the 5 MiB cap is enforced in `readFileAt`.

## 8. Assumed facts

- **A1 (checked, listed for clarity).** `plans/AGL-04.md` did not exist before the planner wrote it (section 7).
- **A2 (cited).** The mock and the client fill a missing tool-call id with `call_mock_<index>` (`plans/AGL-03.md` line 178, D8 correction 2). The planner did not re-read the client or the mock for this. The AC2 test relies on the ids being those the loop sent, which is what the loop always sends (`agent-run.ts` line 198, `randomUUID()`).
- **A3 (assumed).** `ceil(characters / 4)` is a usable token estimate. The repo has no tokenizer dependency (checked), so the estimate is a heuristic and is not calibrated to any provider. Open point 2.
- **A4 (checked by the reviser).** `z.iso.datetime()` in Zod 4 accepts the output of `Date.prototype.toISOString()` (with milliseconds and `Z`): `node -e` with the repo's `zod` printed `true`.
- **A5 (assumed).** The web's conversation parser accepts the shapes this plan returns, because they are the contract's shapes. The parser was read only in part (near line 205), and the web tests were not run.
- **A6 (assumed).** The provider client's `streamChat` ends an aborted stream by throwing or by returning. D9 does not depend on which. The planner did not read the abort path inside `AttemptScope`.
- **A7 (checked by reading the helper, not run).** The harness sets the `book` project active (`agent-loop-run.test.ts`, `settingsText`).
- **A8 (assumed).** The read result of `read_file` carries the file text as a string (`builtin-tools.ts`, around line 91, `summary: Read ...`). The test asserts the long string leaf, whichever key holds it, and fails if no truncated leaf is found.
- **A9 (assumed).** A typical run's file stays far below 5 MiB. Not measured.
- **A10 (assumed).** The fixture project `book` has a `logs/` folder (it is in `LAYOUT_FOLDERS`, checked), but the fixture builder was not read in full. G3 creates the blocking file itself and does not rely on this.
- **A11 (checked by the reviser).** In the test harness, `SCRIBA_BOOKS_DIR` is the library passed as `libraryDir` (`create-test-app.ts` lines 68 to 79), so `libraryRoot` is the absolute path AC4 checks.
- **A12 (assumed).** `FilesService.list` on `logs/agent-runs` when the folder is missing throws a NOT_FOUND refusal (the `list` code at line 232 checks `folder.exists`), and this plan treats that as an empty list. The branch was read, not executed.
- **A13 (assumed).** `EventsPublisher.publish` delivers to the SSE stream without awaiting I/O inside `emit`. D4 relies only on the writer call being synchronous within `finish()`, which the code shows.

## 9. Review parts

One part. Every criterion test starts runs through the start route and reads the transcript files or the mock's requests, so the writer, the reader, the replay and the wiring of step 5 cannot be checked apart; step 1 writes all the tests and step 5 wires both halves.

- **Part 1 — Transcripts and history.** Steps 0 to 9 of section 3. Tests: AC1 (T1) and AC4 (T4) in `agent-loop-transcript.test.ts`; AC2 (T2), G1, G2 and G3 in `agent-loop-history.test.ts`; AC3 (T3a, T3b) in `agent-loop-trim.test.ts`; the existing tests named in section 2, the two SAU-07 invariant tests included. Mutation checks (a) to (f) of step 7.

## 10. Revision log

- Draft at `main` b1cf97b, written by the planner (read-only; no test, build or install run).
- Revision 1 (reviser) at `main` 9edda3c. Corrections: the intent line is written after the resolve so the key is known to the scrubber (D4, D7, open point 9); root replacement order and empty key (D7); run order by the intent line's `at`, not the one-second file stamp (D14); the invariant sweep needs a `FIXTURE_PATHS` entry for the history route (D21, section 2, step 4); follow-up mock steps match on the intent because `turnIndex` counts replayed assistant messages (D22); AC2 compares the summary by its title line; T3a's estimate is about 2,060, not 5,000, and its assertion names the `read_file` tool message; T3b asserts exactly three messages; T4 puts the key text in the intent so the key half of AC4 is exercised; mutation (e) fails G2 only; one review part instead of two (D20, section 9); A4 and A11 checked; existing tests C2 and C6 and the invariant tests named. All twelve open points settled (section 6). No unit change.
- Checked in this revision: `agent-run.ts` lines 137 to 270; `agent-runs.service.ts` lines 54 to 140; `agent-runs.controller.ts`; `agent-prompt.ts`; `files.service.ts` lines 232 to 270 and 428 to 532; `project-store.service.ts` line 36; `client/types.ts` lines 5 to 54; `tools/tool-run.ts` lines 1 to 40; `tools/builtin-tools.ts`; `tools/tool-types.ts` lines 70 to 90; contracts `transcript.ts`, `routes.ts`, `runs.ts` lines 36 to 75, `ids.ts`, `errors.ts`, `constants.ts` lines 85 to 92, `providers/config.ts`, `project-store/constants.ts` lines 16 to 23; `apps/api/test/invariant-sweep.ts` lines 1 to 201; `invariant-get-head.test.ts` lines 50 to 140; `create-test-app.ts` lines 10 to 79; `agent-loop-run.test.ts` lines 178 to 197 and 285 to 385; `e2e/fixtures/mock-openai/server.mjs` lines 95 to 140; grep of agent-loop tests for library snapshots and `conversationId`; `units/AGL-05-current-run-state.md`, `units/AGL-08-file-tools-chat-gate.md`; `grep -l '^status: \(draft\|planned\)' plans/*.md` gives AGL-04 and GRR-01 (GRR-01 touches graph-runner and contracts only); `plans/DECISIONS.md` entries for AGL-03 and AGL-04 (lines 4399 to 4418).
