---
id: AGL-12
status: draft
title: write_file and edit_file through the run overlay, captured base, propose at run end
unit: units/AGL-12-write-overlay.md
revision: 1
base: main at 730f96a
---
# AGL-12 plan - write overlay: write_file and edit_file, captured base, propose at run end

Unit AGL-12, base main at 730f96a (`git rev-parse --short HEAD`), status draft.

Agent loop, `phase:pending-writes`, M3. Unit `units/AGL-12-write-overlay.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9), Why line 15, Decisions lines 18 to 21, acceptance criteria lines 24 to 27. The unit has no Scope section. Its git history is two consistency commits (`2fed3f4`, `098add9`) and no change note.

Nothing was built, installed, run or changed except this file. Reads were done with `cat`, `grep`, `sed`, `ls` and read-only `git log`.

Tags: **checked** means the planner read the file and line in this session. **assumed** means a belief not checked here (section 7).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, earlier plans, DECISIONS, or the code on main

- **D1. Writes never touch disk.** `write_file {path, content}` and `edit_file {path, old, new}` never write to disk. Each agent run keeps a run overlay (proposed content per path); a later `read_file` in the same run sees it. Source: unit line 18; module line 54 (the only direct writes are to `logs/`).
- **D2. Captured base.** The captured base of a path is the on-disk content at the run's first read or write of that path. Source: unit line 19.
- **D3. edit_file match rule.** `old` must occur exactly once in the overlay or on-disk content. Zero or several matches give a readable error, and that error counts as a retry. Source: unit line 20; AGL-02 plan S7 (a `ToolArgumentError` is an invalid call that counts) and D4 (retries and withdrawal).
- **D4. Run-end propose.** At run end, for any reason (completed, stopped, capped, error, project-switched), propose once per touched path with the overlay content, the captured base, origin `{kind: 'agent-run', runId, toolCallId}` (the call that last wrote the path), the draft provenance in `provenance` when the content came from a narrative tool, and the grounding summary for `drafts/` paths from AGL-17. Propose is allowed in the bound project when it is no longer active. Then `run-ended` carries the pending change IDs. Source: unit line 21; PST-15 plan section 1, decision 3 (propose is exempt from the active check) and decision 9 (same-origin fold); `apps/api/src/modules/project-store/pending.service.ts` lines 325 to 469 (`propose`), line 336 (`requireOkProject`).
- **D5. Host edits.** A host edit made during the run is the three-way check's work. That check is PST-16's and is on main. Source: unit line 21; `pending.service.ts` lines 141 to 167 (`conflictReason`) and 171 to 212 (`accept`).
- **D6. Names and family.** `write_file` and `edit_file` are reserved built-in names (`packages/contracts/src/agent-loop/constants.ts` lines 34 and 35) and belong to family `project`, as the read tools do. Source: `constants.ts` lines 31 to 42; AGL-02 plan D15; module line 52.
- **D7. Dispatch rules.** The AGL-02 rules apply unchanged to the new tools: one readable line per problem (`<argument>: <problem>`) and the expected-arguments line; consecutive invalid calls are counted per tool; the third one withdraws the tool for the run; a valid call resets the count; a refusal from the Project store and a `ToolArgumentError` both count; no new error code. Source: AGL-02 plan D3, D4, S2, S6, S7, D11; module line 58 (error codes).
- **D8. Module boundaries.** `agent-loop` imports other modules only through their entry files (rule R1). The rule covers imports between API modules; `eslint.config.mjs` does not mention the contracts package (checked by grep), and `agent-run.ts` already imports contracts. Source: `eslint.config.mjs` line 50 (rule R1, checked); `project-store.module.ts` lines 21 to 29 (the entry file).
- **D9. Transcript kind.** The transcript kind `pending-change` is written by this unit, and this unit defines its payload. Source: `apps/api/src/modules/agent-loop/transcript-entries.ts` line 30 ("The grounding and pending-change kinds are not written here (AGL-16, AGL-12)"); AGL-04 plan line 53 and line 191.
- **D10. Restart state.** A restarted run takes `pendingChangeIds` from the `run-end` line. A unit that adds a transcript kind to the rebuilt state must extend `transcript-run-state.ts` (AGL-05 rule). This unit adds the kind to the file only, not to the rebuilt state. Source: `transcript-reader.ts` line 203 (run-end ids) and lines 206 to 207 (the default branch keeps `pending-change` and `grounding` lines out of turns); AGL-05 plan line 112.
- **D11. Test seam.** The composed app with Platform's mock OpenAI server and scripted turns. The criteria heading has no seam parenthetical, so the module default applies. Source: unit line 23; `units/README.md` line 57; module lines 60 to 62 (testing principles, primary seam).
- **D12. Stop and switch stay as they are.** A stop or a project switch calls `requestEnd` (`agent-run.ts` lines 142 to 148). A project switch ends the old project's active run with reason `project-switched` (`agent-runs.service.ts` lines 163 to 170). `finish` ends the run and emits `run-ended` (`agent-run.ts` lines 342 to 357). This unit adds the flush inside `finish`. Source: as stated.
- **D13. Overlay location.** The overlay lives on `ToolRun`. Source: AGL-02 plan section 5, row AGL-12 ("AGL-12 keeps the overlay on the ToolRun"); AGL-02 plan S14 (`ToolRun` is the only holder of per-run state).

### 1b. Decisions this plan makes

Each choice is the simplest one that satisfies the unit. Where the choice changes a settled decision, it is marked as an open point in section 6.

- **P1. Files.** A new plain class `WriteOverlay` in `tools/write-overlay.ts` (no Nest code). `ToolRun` gets `readonly overlay = new WriteOverlay()`. Reason: D13.
- **P2. Keys and order.** The overlay is keyed by the canonical project-relative path (`ResolvedProjectPath.relativePath`, `apps/api/src/modules/project-store/path-safety.ts` lines 13 to 18). It holds two maps: the captured bases (`string | null`, one per path, set at the first touch only), and the written entries (`content`, `callId` of the last write, optional `provenance`), listed in first-write order. Reason: one propose per path (D4); the origin is the last write (D4).
- **P3. Capture.** The first read or write of a path captures it. For an existing file the base is `FilesService.read(projectId, path).content`, which refuses non-text files and files over the 5 MiB cap. For a missing file the base is `null` (kind `create`). A read that fails captures nothing. Reason: AGL-02 plan section 5, row AGL-12 ("the on-disk text on the first read or write, read through `FilesService.read`").
- **P4. read_file.** The handler checks the overlay first, by canonical path. An entry gives `{path, content}` from the overlay. Otherwise the handler reads through `FilesService.read` and captures the result. The output shape and the summary stay as AGL-02 S11 defines them, so AGL-02 AC1 case 5 holds.
- **P5. Call-time checks for write_file and edit_file.** Before any change to the overlay, in this order: (a) `ProjectStoreService.requireActive(projectId)`, the same check `FilesService.read` makes; (b) `ProjectStoreService.resolvePath(root, path)` with `root` from `ProjectsService.find(projectId)` (a project that `find` does not return after the active check gives a plain error, which does not count, as AGL-02 S7 says for unexpected failures), so path refusals arrive as readable errors (AGL-02 S18); (c) a target that is the root or an existing folder is refused with `path: The path names a folder, so no file can be written there.`; (d) content over `FILE_SIZE_CAP_BYTES` is refused with `content: The text is larger than the 5 MiB limit.` Reason: a refusal at run end reaches no model turn, so the same checks at call time let the model correct the call. The unit does not name these checks.
- **P6. edit_file.** It matches `old` against the overlay content when the path has an entry. Otherwise it matches against the captured base, capturing first when the path is not captured yet. The captured base is the disk text at the first touch, the text the agent read, so the match uses the same text the change diffs from. A missing file with no entry gives `path: No file was found at that path.` Zero matches give `old: The text to replace was not found in the file.` Two or more give `old: The text to replace occurs more than once in the file. It must occur exactly once.` All three are `ToolArgumentError`s (they count). The replacement is done by index with `slice`, so a `$` in `new` stays literal.
- **P7. Schemas, order, outputs.** `write_file`: `path` (string, `minLength` 1) and `content` (string), both required. `edit_file`: `path` (string, `minLength` 1), `old` (string, `minLength` 1) and `new` (string), all required. Both schemas set `additionalProperties: false` (AGL-02 S1). `builtinTools` returns `[listFiles, readFile, searchNotes, writeFile, editFile]`. Outputs are `{path}` with summary `Wrote <path>.` (write) and `Edited <path>.` (edit). The model text is the default `JSON.stringify(output)` (AGL-02 S10). Descriptions are one sentence each, written in the unit's style.
- **P8. list_files is unchanged.** It reads the disk only, so a file that exists only in the overlay is not listed. Settled by the planner (the decisions name `read_file` only). Point 3 in section 6.
- **P9. No-op writes are proposed.** A write whose text equals its base is still an overlay entry and is still proposed, with an empty diff. Reason: the unit says "once per touched path" (line 21).
- **P10. Run-end flush.** `AgentRun.finish` runs the flush after `writeIntent` and `writeStepText`, and before the state becomes `ended` and before `run-ended` is emitted. For each entry in first-write order it calls `deps.propose` with the input of D4. On success it appends the transcript line `pending-change` with `{path, pendingChangeId}` and pushes the id onto `state.pendingChangeIds`. On a throw it appends `pending-change` with `{path, refusal}` (the `ModuleError` message, or the fixed text `The change could not be filed.` for any other error) and pushes nothing. The loop goes on with the next path. `run-ended` carries `state.pendingChangeIds` in order, and the `run-end` transcript line carries the same list. Reason: a throw must not stop `run-ended` (unit line 21, "for any reason"), and the author needs the ids.
- **P11. Race guard.** An entry whose captured base is `null` is refused, without a propose call, when `deps.targetExists(projectId, path)` is true at run end. The refusal is the transcript line `pending-change` with `{path, refusal: "The file was created during the run, so this change is not filed."}`. Reason: a propose without base would take the host's new file as the base (PST-15 plan decision 8), and accepting would then overwrite it without a conflict. Point 1 in section 6.
- **P12. Transcript payload.** `transcriptPayloadSchemas['pending-change']` is `z.object({path: z.string().min(1), pendingChangeId: z.string().min(1).optional(), refusal: z.string().min(1).optional()})`. The reader validates such lines (`transcript-reader.ts` line 94) and keeps them out of turns (lines 206 to 207). No rebuilt-state change (D10).
- **P13. Provenance plumbing.** `WriteOverlay.put` takes an optional `DraftProvenance` (`packages/contracts/src/agent-loop/provenance.ts` lines 6 to 14). The flush passes it to `propose` as `provenance` when it is set. No AGL-12 code path sets it; AGL-13 does. No test in this unit covers it.
- **P14. Run-end dependencies.** `AgentRunDeps` (`agent-run.ts` lines 45 to 51) gains `propose(input: ProposeInput): PendingChange` and `targetExists(projectId: string, path: string): boolean`. `AgentRunsService` binds them: `propose` to `PendingService.propose`; `targetExists` to `ProjectsService.find` plus `ProjectStoreService.resolvePath(root, path).exists`, returning false when the project is not found. The closure lives in the service, so `AgentRun` keeps no Nest code (`agent-run.ts` lines 43 to 44).
- **P15. Tests.** One new file, `apps/api/test/agent-loop-writes.test.ts`, with its own helpers, as `agent-loop-stop.test.ts` and `agent-loop-narrative.test.ts` do. No kit file.
- **P16. Offered-tool assertions.** Four assertions that list the exact offered tools change (section 2). They list the exact project family, which grows by two. Precedent: `plans/DECISIONS.md` entry "2026-11-15 — AGL-10 — PLAN DOES NOT WORK" (line 4407), where the same cause stopped AGL-10.
- **P17. System prompt.** `agent-prompt.ts` does not change. The unit does not ask for it.
- **P18. Module wiring.** `agent-loop.module.ts` does not change. `ProjectStoreModule` is already imported (line 37), and the entry file exports `ProjectStoreService` (line 22) and `ProjectsService` (line 28). `AgentToolsService` gains two constructor parameters; `AgentRunsService` gains one (`PendingService`, line 27 of the entry file).

## 2. Files to change

Paths are relative to the repository root. Nothing outside this table changes.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/tools/write-overlay.ts` | new | `WriteOverlay` (P1, P2, P13): `isCaptured`, `capture`, `baseOf`, `contentOf`, `put`, `entriesInOrder`. Plain class, no Nest import. |
| `apps/api/src/modules/agent-loop/tools/tool-run.ts` | edit | One field on `ToolRun`: `readonly overlay = new WriteOverlay()` (P1). `dispatch`, `schemas` and the counts are unchanged. |
| `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` | edit | `builtinTools(files, search, store, projects)`; `read_file` overlay-first and capture (P3, P4); `write_file` and `edit_file` (P5 to P7); exported helpers `targetOf(store, projects, projectId, path)` and `captureOf(run, files, projectId, target)` that AGL-13 reuses (section 5). |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | edit | Constructor gains `store: ProjectStoreService` and `projects: ProjectsService`, imported from the project-store entry file, and passes them to `builtinTools` (line 45 today). |
| `apps/api/src/modules/agent-loop/agent-run.ts` | edit | `AgentRunDeps` gains `propose` and `targetExists` (P14). `finish` gets the flush (P10, P11) before the state becomes `ended`. The `run-ended` data carries the ids (line 352 today sets `pendingChangeIds: []`). |
| `apps/api/src/modules/agent-loop/agent-runs.service.ts` | edit | Constructor gains `pending: PendingService` (entry import). The `AgentRun` deps (lines 106 to 112) gain the two bound functions (P14). |
| `apps/api/src/modules/agent-loop/transcript-entries.ts` | edit | `pending-change` payload schema added to `transcriptPayloadSchemas` (P12). |
| `apps/api/test/agent-loop-writes.test.ts` | new | Four tests, one per criterion (section 4). |
| `apps/api/test/agent-loop-tools.test.ts` | edit | The two offered-tool lists at lines 299 to 302 and 352 to 356 gain `write_file` and `edit_file`, in registration order (P16). |
| `apps/api/test/agent-loop-run.test.ts` | edit | The two `toolNamesOf` lists at lines 373 to 377 and 388 to 392 gain `edit_file` and `write_file`, in sorted order (P16). |

Read only (checked; not changed): `units/AGL-12-write-overlay.md`, `units/README.md`, `modules/agent-loop.md`, `plans/PLT-02.md`, `plans/AGL-02.md`, `plans/PST-15.md`, `plans/AGL-08.md`, `packages/contracts/src/agent-loop/*.ts`, `packages/contracts/src/project-store/pending.ts`, `packages/contracts/src/project-store/routes.ts`, `apps/api/src/modules/project-store/*` (the files named in section 7), `apps/api/src/modules/agent-loop/agent-loop.module.ts`, `transcript-reader.ts`, `transcript-run-state.ts`, `apps/api/test/agent-loop-stop.test.ts`, `apps/api/test/agent-loop-narrative.test.ts`, `e2e/fixtures/mock-openai/server.mjs`, `eslint.config.mjs`.

Not changed, on purpose: contracts (no new event, route or error code; the transcript payload is module-internal); Project store code; `agent-loop.module.ts`; `agent-prompt.ts`; the web app; `e2e/**`; `units/**`; `modules/**`; `plans/**` other than this file; `plans/DECISIONS.md`; `plans/QUEUE.md`; `package.json` and `package-lock.json`.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` in a worktree on branch `unit/AGL-12`, created from `main` (`git worktree add -b unit/AGL-12 <path> main`). Do not push. Commit by explicit paths only. Use Node 26 and record `node -v` and `npm -v` beside each result.

0. **Preconditions.** `grep -m1 '^status' plans/PST-15.md plans/AGL-02.md plans/AGL-08.md` prints `status: done` for each. `git status --short` prints nothing. `npm ci` at the root exits 0. Expected: all three hold.
1. **Red first.** Write `apps/api/test/agent-loop-writes.test.ts` with the four tests of section 4. Run `npx vitest run test/agent-loop-writes.test.ts` in `apps/api`. Expected: all four fail, because `write_file` and `edit_file` are not offered and each call answers `This tool is not available in this agent run.`. Commit this file alone: `feat(AGL-12): add failing write-overlay tests (AC1 to AC4)`.
2. **Overlay.** Write `tools/write-overlay.ts` (P1, P2, P13). Expected: `grep -n "@nestjs" apps/api/src/modules/agent-loop/tools/write-overlay.ts` prints nothing.
3. **ToolRun.** Add the `overlay` field (P1). Expected: `git diff -- apps/api/src/modules/agent-loop/tools/tool-run.ts` shows one added field and its import, and nothing else.
4. **Built-in tools.** Edit `builtin-tools.ts`: `read_file` overlay-first (P4); `write_file` (P5, P7); `edit_file` (P5 to P7); exports `targetOf` and `captureOf`. Expected: `builtinTools` returns five definitions in the order of P7. Tests: AC1 (the overlay gets the write and disk is untouched), AC2 (the read sees the edit), AC4 (both edit errors).
5. **Service.** Edit `agent-tools.service.ts` (P18). Expected: `grep -n "builtinTools(" apps/api/src/modules/agent-loop/agent-tools.service.ts` shows four arguments.
6. **Transcript payload.** Edit `transcript-entries.ts` (P12). Expected: `transcriptPayloadSchemas` has a `pending-change` key.
7. **Run end.** Edit `agent-run.ts` (P10, P11, P14): `AgentRunDeps` gains the two functions; `finish` runs the flush before the ended state, and `run-ended` carries the ids. Tests: AC1 (no disk change while the run is open, and one pending change per written path), AC2 (one change, first base), AC3 (stop and switch).
8. **Wiring.** Edit `agent-runs.service.ts` (P14): inject `PendingService`; bind `propose` and `targetExists`. Expected: `grep -n "PendingService" apps/api/src/modules/agent-loop/agent-runs.service.ts` shows the import and the constructor parameter. Tests: AC3 (the switched run lands in `book`).
9. **Run the new tests.** `npx vitest run test/agent-loop-writes.test.ts` in `apps/api`. Expected: four tests pass (AC1, AC2, AC3, AC4).
10. **Existing offered-tool tests.** Update the four lists (P16). Run `npx vitest run test/agent-loop-tools.test.ts test/agent-loop-run.test.ts`. Expected: exit 0. This covers the AGL-02 criteria in `agent-loop-tools.test.ts` (AC1 to AC3) and the AGL-03 criterion in `agent-loop-run.test.ts` (C6 and its neighbours).
11. **Full API suite.** `npm test -w @bbartolome/scriba-api` (build, then all Vitest files). Expected: exit 0. The `run-ended` assertions with `pendingChangeIds: []` (for example `agent-loop-stop.test.ts` line 216, `agent-loop-run.test.ts` lines 256 and 420) still hold, because those runs write nothing.
12. **Lint and format.** `npm run lint -w @bbartolome/scriba-api` (ESLint, rule R1, `preserve-caught-error`) and `npx prettier --check` on the changed source and test files. Expected: both exit 0.
13. **Mutation checks.** Commit the source first (`feat(AGL-12): write_file and edit_file through the run overlay, propose at run end`), so that `git checkout -- <file>` restores the committed version. Then one mutation at a time, each followed by the test file of step 9. Expected failures: M1, `write_file` calls `FilesService.write`: AC1. M2, `edit_file` replaces the first match instead of counting: AC4. M3, `read_file` ignores the overlay: AC2. M4, the flush runs only when the reason is `completed`: AC3 (stopped). M5, the flush uses the active project id instead of `run.projectId`: AC3 (switched). M6, `edit_file` matches the disk text instead of the overlay: AC2.
14. **Changed paths.** `git status --short` lists exactly the section 2 paths, with `??` for the new files and ` M` for the edited ones. No other path changes.
15. **Record.** Store the Node and npm versions and the output of each command. A criterion in section 4 counts as passed only when its test passes in step 9 and step 10 holds.

## 4. Acceptance criteria and tests

The unit's four criteria, with their text quoted from `units/AGL-12-write-overlay.md` lines 24 to 27. All four run in this environment: the composed app, Platform's mock OpenAI server in `e2e/fixtures/mock-openai/server.mjs`, and a temp library. No criterion needs GitHub Actions, a pull request, a real model server or Docker. **Nothing in this section is marked passed by the planner.**

Shared setup for the file `apps/api/test/agent-loop-writes.test.ts`:
- One temp library from `buildProjectsLibrary` (`project-store-projects.kit.ts`) with `book` active. `book/sources/outline.md` holds `# Outline\n`. Settings point the `providers` section at the mock (the `settingsText` pattern of `agent-loop-narrative.test.ts` lines 78 to 87).
- One scenario file per test in a temp folder, loaded by `startMockOpenAI({scenariosDir})`. Turns are matched with `match: {endpoint: 'chat', turnIndex: N}` (`server.mjs` lines 117 to 118). A stalled turn uses `delayMs: 5000` (`server.mjs` lines 310 to 311), as `STALL_STEPS` does in `agent-loop-stop.test.ts` lines 38 to 44.
- The composed app through `createTestApp`, a session cookie through `sessionCookie`, requests through `send` with `LOOPBACK_HOST`, and events through `observeEvents` (`invariant-sweep.ts`) read with `dataOf` (`sse.ts`).
- Pending changes are read with `GET` on `PROJECT_PENDING_ROUTE` (`/api/project-store/projects/book/pending`) and parsed with `pendingListSchema`.
- Each test removes its temp folders and closes the app and the mock.

### AC1: "No agent write changes a file on disk before the author accepts it (asserted on disk)."

Test name: `AC1: no agent write changes a file on disk before the author accepts it`.

Scenario `writes-disk`: turn 0 is a `write_file` call with `{"path":"drafts/new-chapter.md","content":"# Chapter\n"}`; turn 1 is an `edit_file` call with `{"path":"sources/outline.md","old":"# Outline","new":"# Changed"}`; turn 2 is a stalled text reply (`delayMs: 5000`), so the run is still open when the disk is read.

Steps: start the run; wait on the stream for the two `tool-call-result` events; read the disk while the run is open; `POST` the stop route; wait for `run-ended`; read the disk again; list the pending changes.

Assertions:
- While the run is open, `drafts/new-chapter.md` does not exist, and `sources/outline.md` is still `# Outline\n`.
- After `run-ended`, the same two disk checks hold.
- The list holds two open changes: one of kind `create` for `drafts/new-chapter.md` with `capturedBase` null, and one of kind `modify` for `sources/outline.md` with `capturedBase.content` `# Outline\n`.

Pass: all disk assertions hold before and after the stop, and the list has the two changes.

### AC2: "Two edits to one file in one agent run yield one pending change against the first captured base; a read between them sees the first edit."

Test name: `AC2: two edits to one file in one run yield one pending change against the first base, and a read between them sees the first edit`.

Scenario `two-edits` (no stall): turn 0 is `edit_file` `{"path":"sources/outline.md","old":"# Outline","new":"# Outline A"}`; turn 1 is `read_file` `{"path":"sources/outline.md"}`; turn 2 is `edit_file` `{"path":"sources/outline.md","old":"Outline A","new":"Outline B"}`; turn 3 is a text reply.

Assertions:
- The `tool-call-result` of the read has `output.content` equal to `# Outline A\n`.
- `run-ended` has reason `completed` and `pendingChangeIds` of length 1.
- The list holds exactly one change: `targetPath` `sources/outline.md`, kind `modify`, `capturedBase.content` `# Outline\n`, `proposed` `# Outline B\n`, origin `{kind: 'agent-run', runId}` with `toolCallId` equal to the `callId` of the second edit.
- The file on disk is still `# Outline\n`.

Pass: all assertions hold.

### AC3: "A stopped agent run still creates its pending changes; a project-switched one creates them in the original project."

Test name: `AC3: a stopped agent run still creates its pending changes, and a project-switched one creates them in the original project`. One test, two runs.

Run A (stopped): scenario `stop-after-write`. Turn 0 is `write_file` `{"path":"drafts/stopped.md","content":"# Stopped\n"}`; turn 1 is a stalled text reply (`delayMs: 5000`). Start the run, wait for the `tool-call-result` of the write, `POST` the stop route, wait for `run-ended`.
- `run-ended` has reason `stopped` and `pendingChangeIds` of length 1.
- The list holds a change for `drafts/stopped.md` whose `origin.runId` is the run's id.

Run B (switched): scenario `switch-after-write`, the same two turns. Create a second project `other` with a `project.yaml` (`schemaVersion: 1`, a title, `genrePack: nonfiction`), as `agent-loop-stop.test.ts` C5 does. Start the run, wait for the `tool-call-result` of the write, `POST` `ACTIVE_PROJECT_ROUTE` with `{projectId: "other"}`, wait for `run-ended`.
- `run-ended` has reason `project-switched` and `pendingChangeIds` of length 1.
- `POST` `ACTIVE_PROJECT_ROUTE` with `{projectId: "book"}`, then list the pending changes of `book`: the change for `drafts/switched.md` is there, with the run's `origin.runId`.

Pass: both runs hold.

### AC4: "Edit with zero and with two matches returns distinct readable errors."

Test name: `AC4: an edit with zero matches and an edit with two matches return distinct readable errors`.

Setup: `book/sources/notes.md` holds `a b a\n`. Scenario `edit-matches`: turn 0 is `edit_file` `{"path":"sources/notes.md","old":"missing","new":"x"}`; turn 1 is `edit_file` `{"path":"sources/notes.md","old":"a","new":"c"}`; turn 2 is a text reply.

Assertions, from the two `tool-call-error` events:
- The first has `attempt` 1, no `withdrawn`, and `message` equal to `old: The text to replace was not found in the file.` followed by a new line and `Expected arguments for edit_file: path (string, required), old (string, required), new (string, required).`
- The second has `attempt` 2, no `withdrawn`, and `message` equal to `old: The text to replace occurs more than once in the file. It must occur exactly once.` followed by the same expected-arguments line.
- The two messages differ.
- The file on disk is still `a b a\n`.

Pass: all assertions hold.

## 5. Downstream and parallel agreement

Units that this unit unblocks, and the one that runs in parallel with it, read from `units/*.md` and `modules/agent-loop.md`. The parallel units are checked in section 7.

- **AGL-13 (output routing; `blocked_by` AGL-09, AGL-12, GRR-01).** Needs: an overlay write with an optional `provenance` and a `target`-checked path; the captured base; the same run-end flush. This plan provides `WriteOverlay.put(path, content, callId, provenance?)`, the exported helpers `targetOf` and `captureOf` in `builtin-tools.ts`, and the flush in `AgentRun.finish`. Agreement: AGL-13 calls `put` and does not add a second flush. Its claims artefact goes to `logs/` through the Project store's `write` (`modules/agent-loop.md` line 54) and is not an overlay entry, which matches D1.
- **AGL-14 (diff previews and review link; `blocked_by` AGL-07, AGL-12, SHL-12).** Needs: the base and the proposed text of a write for `diffPreview {path, base, proposed}`, and the ids at `run-ended`. This plan provides `WriteOverlay.baseOf(path)` and `contentOf(path)` after each call, and the ids in `run-ended`. Agreement: `write_file` and `edit_file` results carry no `diffPreview` in this unit; AGL-14 adds it where `tool-call-result` is emitted (`runCall`, `agent-run.ts` lines 263 to 337; the unit does not name the function), and this plan does not edit `runCall`. The `base` AGL-14 shows is the captured base, not the text before the call.
- **AGL-15 (pending-writes gate; `blocked_by` AGL-12, AGL-13, AGL-14, PST-22).** Needs: one pending change per written path, against the first captured base, with origin `agent-run`, and the ids at `run-ended`. This plan provides both (AC2, AC3). The accept step is PST-16's and is on main.
- **AGL-16 (grounding engine; `blocked_by` AGL-10, AGL-12).** Needs: the overlay content of a draft the run proposed, for the `contentHash` of a grounding result (unit AGL-16 line 21, the Result bullet). This plan provides `WriteOverlay.contentOf(path)` through `ToolRun.overlay`. Agreement: `AgentRun` keeps `tools` private, so AGL-16 adds its own accessor in `agent-run.ts`; this plan does not add one. The overlay stays on the `ToolRun` after the run ends (the run is kept as the project's most recent ended run, `agent-runs.service.ts` line 177).
- **AGL-17 (grounding wiring; `blocked_by` AGL-13, AGL-16).** Needs: the `grounding` summary in the propose input for `drafts/` paths (unit AGL-12 Decisions item 4). This plan passes no `grounding`. Agreement: AGL-17 adds it inside the flush's input, in the same place as `provenance`, without changing the flush's order.
- **PST-22 (review gate; `blocked_by` names this unit as the producer of the pending change).** Needs: a change created by `propose` with origin `agent-run` and status `pending`. This plan provides it. PST-22 needs no change here.
- **Parallel: AGL-13, AGL-14, AGL-16** (`modules/agent-loop.md` line 45). AGL-14 is expected to edit `runCall` (the unit does not name it), and this plan edits `finish`, the `AgentRunDeps` type and the imports of `agent-run.ts`. The two edits touch different functions; a merge conflict on the imports is possible and easy to resolve.

## 6. Open points

Points 1 to 3 are for the Navigator. Each one changes the effect of a settled decision or leaves the author without a visible result, and the unit does not settle it. Each has the planner's default, which this plan implements. Points 4 and 5 are settled by the planner with the simplest option.

1. **Captured base missing, file created during the run (for the Navigator).** The unit says the captured base is the on-disk content at the first touch (D2). For a file that did not exist, the base is "missing", and PST-15's `propose` cannot express "missing": with no `base`, it reads the disk at propose time (PST-15 plan decision 8, which keeps `base: null` out of the contract). If the host creates the file during the run, the change would then take the host's text as base, and accepting it would overwrite that text with no conflict. **Planner's default (P11):** refuse such a path at run end, without propose, and write the refusal to the transcript. The alternative is to propose without a base and let the review diff show the replacement. The Navigator decides.
2. **Run-end refusals are not visible to the author (for the Navigator).** A refusal at run end (invalid `project.yaml`, a registered validator, the size cap, a project that is no longer `ok`) reaches neither the review queue nor the chat, because no contract event carries it. **Planner's default (P10):** the transcript only. A visible result would need a new event in the contract, which the unit does not name. The Navigator decides whether that is in scope.
3. **list_files does not show overlay-only files (for the Navigator).** The Why line says "later reads see earlier writes" (line 15), while the Decisions name `read_file` only (line 18). **Planner's default (P8):** `list_files` reads the disk only. No criterion depends on it.
4. **Writes after a project switch (settled by the planner).** `write_file` and `edit_file` require the project to be active (P5 (a)), so a call after a switch is a readable refusal. Earlier writes are still filed into the original project at run end (AC3). Reason: the simplest rule that matches `read_file`.
5. **No-op writes and the provenance plumbing (settled by the planner).** A write that leaves the text unchanged is proposed with an empty diff (P9). `provenance` is passed through when set, but no test in this unit sets it (P13); AGL-13 tests it.

## 7. Facts checked and facts assumed

**Checked (read in this session):**

Unit and module:
- `units/AGL-12-write-overlay.md`: whole file. Front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Why line 15; Decisions lines 18 to 21; acceptance criteria lines 24 to 27. No Scope section. `git log` for the file shows `2fed3f4` and `098add9` only.
- `units/README.md`: line 57 (acceptance criteria bullet and the seam parenthetical rule); lines 34 to 57 (unit format); lines 59 to 65 (blocker notation); line 112 (phase table row for `phase:pending-writes`).
- `modules/agent-loop.md`: lines 11 (ordering: the overlay needs the loop and `propose`), 44 to 45 (parallelism), 49 to 58 (cross-cutting decisions: 49 module shape, 51 dependencies, 52 reserved names, 53 argument schemas, 54 writes, 58 error codes), 60 to 68 (testing principles; 62 primary seam).
- `eslint.config.mjs` lines 46 to 52 (rule R1 at line 50).
- Draft and planned plans: `grep -l '^status: *\(planned\|draft\)' plans/*.md` gives `plans/PLT-22.md` and `plans/TRG-14.md` only. Their file lists (`PLT-22.md` lines 81 to 88; `TRG-14.md` lines 99 to 110) do not overlap the section 2 paths.
- Done plans: `plans/PST-15.md` (status done; section 1 decisions 3, 8, 9, 10; section 3 files); `plans/AGL-02.md` (section 1a D1 to D15; section 1b S1 to S18; section 5 row AGL-12; O1 to O8); `plans/AGL-08.md` (status done; its `blocked_by` at unit line 7); `plans/PLT-02.md` (structure of the example plan).
- Downstream notes: `plans/AGL-04.md` lines 21, 53, 191; `plans/AGL-05.md` line 112; `plans/AGL-09.md` line 192; `plans/DECISIONS.md` line 4407 (AGL-10 precedent); `grep -c AGL-12 plans/DECISIONS.md` gives 0, so no DECISIONS entry concerns this unit.
- `blocked_by` status: AGL-02, AGL-08, PST-15 are all `status: done` (grep of every plan's front matter). `parallel_with` is symmetric with AGL-09, AGL-10, AGL-11 and AGL-25 (their unit files, line 8).

Contracts (`packages/contracts/src/`):
- `agent-loop/constants.ts`: lines 20 to 26 (`AGENT_RUN_END_REASONS`, which includes `project-switched`); lines 31 to 42 (reserved names; `write_file` line 34, `edit_file` line 35); lines 60 to 70 (transcript kinds; `pending-change` line 66).
- `agent-loop/events.ts`: lines 68 to 72 (`runEndedDataSchema`, `pendingChangeIds` line 71).
- `agent-loop/runs.ts` line 34 (`pendingChangeIds`). `agent-loop/provenance.ts` lines 6 to 14. `agent-loop/routes.ts` lines 3 to 5 (run routes).
- `project-store/pending.ts`: lines 37 to 57 (`pendingChangeSchema`); lines 65 to 67 (`pendingListSchema`); lines 75 to 83 (`proposeInputSchema`; `base` optional at line 79, no `null`).
- `project-store/constants.ts` line 23 (`FILE_SIZE_CAP_BYTES`, 5 MiB). `project-store/routes.ts` line 12 (`ACTIVE_PROJECT_ROUTE`) and lines 36 to 37 (`PROJECT_PENDING_ROUTE`).

Project store (`apps/api/src/modules/project-store/`):
- `pending.service.ts`: lines 60 to 67 (`PENDING_MESSAGES`); 70 to 76 (`sameOrigin`); 100 to 119 (`list`); 141 to 167 (`conflictReason`); 171 to 212 (`accept`, which versions and writes); 215 to 229 (`reject`); 325 to 469 (`propose`: validation 325 to 371, fold 375 to 409, base capture 411 to 431, write and `pending-created` 442 to 467); 336 (`requireOkProject`); 347 to 356 (`project.yaml` check).
- `project-store.module.ts`: lines 21 to 29 (entry exports: `ProjectStoreService` 22, `FilesService` 23, `PendingService` 27, `ProjectsService` 28); lines 35 to 64 (`@Module`); lines 65 to 73 (`exports`).
- `files.service.ts`: `read` lines 257 to 270 (text only; `projectFor`); `write` lines 272 to 291 and `edit` lines 293 to 326 (both write to disk, so this unit must not call them); `readFileAt` lines 135 to 152 (refuses non-files and files over the cap); `projectFor` lines 512 to 520 (`requireActive`, then `find`).
- `project-store.service.ts`: line 41 (`libraryRoot`); lines 46 to 48 (`resolvePath`); line 83 (`requireActive`, public).
- `project-discovery.ts` lines 15 to 20 (`DiscoveredProject`, with `root` on line 17). `path-safety.ts` lines 13 to 18 (`ResolvedProjectPath`).
- `projects.service.ts` line 59 (`find`).

Agent loop (`apps/api/src/modules/agent-loop/`):
- `tools/tool-types.ts`: lines 17 to 25 (`ToolArgumentError`); 27 to 34 (`ToolSchemaProperty`); 44 to 48 (`ToolContext`); 56 to 62 (`ToolHandlerResult`); 64 to 71 (`ToolDefinition`); 96 to 104 (`ToolOutcome`).
- `tools/tool-run.ts`: lines 18 to 23 (answers and `WITHDRAW_AT`); 64 to 82 (class and constructor); 95 to 106 (`schemas`, registration order); 109 to 183 (`dispatch`: reset at 146, `ModuleError` as a path issue at 163 to 167, `ToolArgumentError` at 168 to 170, other failures at 171 to 181); 186 to 217 (`invalid` and withdrawal).
- `tools/builtin-tools.ts`: line 36 (`builtinTools(files, search)`); lines 40 to 69 (`list_files`); lines 71 to 95 (`read_file`, handler 86 to 94); lines 97 to 145 (`search_notes`); line 147 (return).
- `tools/readable-error.ts`: `displayPath`, `issueOf` (Ajv keywords; the default message is Ajv's), `expectedSummary`, `readableMessage`.
- `tools/narrative-tools.ts` lines 132 to 204 (`narrativeDefinition`; citations at 200).
- `agent-tools.service.ts`: lines 30 to 49 (constructor; Ajv at line 44; `builtinTools` call at line 45); lines 52 to 85 (`startRun`; `ToolRun` built at 54 and 80).
- `agent-run.ts`: lines 45 to 51 (`AgentRunDeps`); 97 to 133 (class and constructor; `pendingChangeIds` at 130); 142 to 148 (`requestEnd`); 151 to 209 (`execute`); 242 to 259 (`provenanceOf`); 263 to 337 (`runCall`); 342 to 357 (`finish`: `released` at 349, `run-ended` with `pendingChangeIds: []` at 352 and emitted at 355, transcript `run-end` at 356).
- `agent-runs.service.ts`: lines 43 to 55 (constructor); 59 to 118 (`start`; deps at 106 to 112); 124 to 138 (`current`); 142 to 151 (`stop`); 163 to 170 (`onProjectSwitched`); 174 to 178 (`release`, which sets `slot.ended`).
- `agent-loop.module.ts`: line 37 (`ProjectStoreModule` in `imports`); line 60 (`exports`).
- `transcript-entries.ts`: line 30 (comment on `pending-change`); lines 78 to 82 (`runEndPayloadSchema`); lines 85 to 95 (`transcriptPayloadSchemas`).
- `transcript-reader.ts`: lines 80 to 98 (`parseLines`; the payload schema check at line 94); line 203 (`run.pendingChangeIds` from `run-end`); lines 206 to 207 (default branch).
- `transcript-run-state.ts` lines 9 to 22 (`runStateOfTranscript`; `pendingChangeIds` taken from the run).
- `transcript-writer.ts` line 73 (`append(kind, seq, data)`).
- `apps/api/test/agent-loop-tools.kit.ts`: lines 38 to 47 (`startRun` with `enabledFamilies: ['project']`); lines 66 to 72 (tools endpoint, in `schemas()` order).

Tests and mock:
- `apps/api/test/agent-loop-tools.test.ts`: line 87 (`offeredTools`); lines 299 to 302 and 352 to 356 (the two expected lists); line 169 (an entries count, unrelated).
- `apps/api/test/agent-loop-run.test.ts`: lines 168 to 170 (`toolNamesOf`, sorted); lines 373 to 377 and 388 to 392 (the two expected lists); line 130 (`startRun`).
- `apps/api/test/agent-loop-narrative.test.ts`: lines 78 to 87 (`settingsText`); lines 323 to 325 (`arrayContaining`, unaffected).
- `apps/api/test/agent-loop-stop.test.ts`: lines 38 to 44 (`STALL_STEPS`); lines 199 to 225 (C3, the stop); from line 227 (C5, the switch and the `other` project); line 216 (`pendingChangeIds: []`).
- `e2e/fixtures/mock-openai/server.mjs`: lines 117 to 118 (`turnIndex`, counted by assistant messages); lines 126 to 127 (`toolResultPresent`); line 206 (`closedByClient`); lines 310 to 311 (`delayMs`).
- `apps/api/test/invariant-sweep.ts` line 385 (`observeEvents`); `apps/api/test/sse.ts` line 66 (`dataOf`).
- `e2e/specs/journey.e2e.ts` lines 243 and 246 check only the `list_files` and `read_file` card names, so the new tools do not change it.

Repository state:
- `git rev-parse --short HEAD` prints `730f96a`. `git status --short` shows `M units/SAU-12-providers-step.md` (not part of this plan).
- `plans/AGL-12.md` did not exist before this file. `grep -n 'AGL-02\|AGL-08\|PST-15' plans/DECISIONS.md` was run (the lines are about other units; none is an AGL-12 decision).

**Assumed (not checked here):**

- Node 26 and npm 11 are available in the implementer's worktree (not checked).
- The mock server holds a stalled reply until the client aborts it, as `agent-loop-stop.test.ts` relies on. The code paths were read (`server.mjs` lines 206 and 310 to 311), but no test was run.
- Ajv 8's default messages for `minLength` and for the other keywords in P7 (the wording of the `old` lines in AC4 depends only on this plan's own messages, not on Ajv).
- `observeEvents` returns an observer whose `take` and `close` behave as `agent-loop-narrative.test.ts` uses them (checked by use, not by reading its body).
- `builtinTools` has no caller other than `agent-tools.service.ts` line 45 (checked by grep over `apps` and `packages`; no test calls it).
- A project's `root` from `ProjectsService.find` is valid for the whole run (`find` runs a discovery; the root is absolute, per `DiscoveredProject`).
