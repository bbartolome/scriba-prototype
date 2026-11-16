---
id: AGL-16
unit: units/AGL-16-grounding-engine.md
status: done
date: 2026-11-16
---

# AGL-16 plan — grounding engine: extract, retrieve, judge, result and claims artefact

Revision 1, planner, from main at `26cba33`. Revision 2, reviser, from main at `5b528ac`: facts re-checked, open points 2 to 8 settled, open point 1 sent to the Navigator, section 9 "Review parts" added. Revision 3, reviser, from main at `dc5f898`: the Navigator decision on the test seam (`plans/DECISIONS.md` entry "2026-11-16 — AGL-16 — Navigator decision: test seam for the four criteria, and the AGL-19 dependency") applied; the unit, AGL-19 and module changes it lists are committed in `dc5f898`; the plan now uses a test-only HTTP kit and exports the engine. The working tree has an unrelated change to `units/SAU-12-providers-step.md`; this plan does not touch it and the implementer must not stage it.

AGL-16 adds one Nest provider, `GroundingEngine`, to the Agent loop module. It runs the grounding check for one target file: extract the claims, retrieve `sources/` passages per claim, judge the claims in batches, build the result, and write the claims artefact. It adds no route, no event, no transcript line and no change to the run loop. AGL-17 wires it into the run. Because no route exists before AGL-17, the tests reach the engine over HTTP through a test-only kit, `apps/api/test/agent-loop-grounding.kit.ts`, in the AGL-02 style (open point 1, settled by the Navigator).

## 1. Sources

| Rule the plan obeys | Where it comes from | How the plan obeys it |
|---|---|---|
| Extract: one model call with a fixed prompt returns the draft's factual claims as JSON (`text`, character `span`), validated with the same two retries. | Unit `units/AGL-16-grounding-engine.md` line 18 | `GroundingEngine` extract step, up to three attempts (one try and two retries), reply parsed with the zod schema of section 4.1 |
| Retrieve: for each claim, Project store search returns the top passages, scope `sources` only. | Unit line 19; `modules/agent-loop.md` line 56 ("Only `sources/` is grounding evidence"); `plans/PST-13.md` P10 (scope `sources` is accepted) | `SearchService.search(projectId, {query, scope: ['sources'], limit: RETRIEVAL_LIMIT})` per claim |
| Judge: one model call per batch judges each claim `supported`, `weak` or `unsupported` against its passages. A `supported` or `weak` verdict must cite one retrieved passage. A verdict citing a passage outside the retrieved set is downgraded to `unsupported`. A claim with no retrieved passages is `unsupported` without asking the model. | Unit line 20 ("against its passages" makes the set per claim) | Judge batch = claims that have passages; verdict rules of section 4.1 |
| Result in the contract shape, with `contentHash` = `sha256:<hex>` over the checked text: the overlay content for a draft the run proposed, otherwise the file on disk. | Unit line 21; `packages/contracts/src/agent-loop/grounding.ts` lines 33 to 40; `packages/contracts/src/project-store/constants.ts` line 11 (hash pattern) | Result built and parsed with `groundingResultSchema` before it is written; hash over the UTF-8 bytes of the text that was checked |
| Claims artefact: the latest result per draft, JSON at `logs/grounding/<targetPath>.json`, written through the Project store's in-process write, overwritten by each check. | Unit line 22; `modules/agent-loop.md` line 54 (the only direct writes are to `logs/`) and line 82; `plans/AGL-01.md` line 47 (D11: callers join the constants; no path function in the contract) | `files.write` with `GROUNDING_ARTEFACT_PATH_PREFIX + targetPath + GROUNDING_ARTEFACT_PATH_SUFFIX` |
| Grounding model calls do not count towards the step cap; stop cancels them. | Unit line 23 | The engine is not in the loop, so it counts no step; the caller's `AbortSignal` is passed to every model call |
| Fetched web pages and entities are not evidence. | Unit line 24; `modules/agent-loop.md` line 56 | Retrieval scope is `sources` only; nothing else reaches the judge |
| Malformed extract JSON is retried twice, then the check fails readably. | Unit criterion 4 (line 30) | Three attempts, then `GroundingFailure` with a fixed readable text; no artefact is written |
| Test seam: mock extract and judge turns; the engine is tested through a test-only HTTP harness until AGL-17 exists. | Unit heading line 26 ("(mock extract and judge turns; the engine is tested through a test-only HTTP harness until AGL-17 exists)"); `modules/agent-loop.md` line 62 (composed app, Platform's mock OpenAI server, scripted grounding turns); line 61 (external behaviour only); `plans/DECISIONS.md` entry "2026-11-16 — AGL-16 — Navigator decision: test seam for the four criteria, and the AGL-19 dependency" | Mock scripts and `openHarness`; the engine is reached over HTTP through the kit route `POST /api/agent-loop-test/grounding`, booted with the composed modules plus the kit (section 4.2 step 1) |
| Dependencies: `blocked_by` AGL-10 and AGL-12, both `done`. The parts used are the Project store search and the write overlay. | Unit line 7; `plans/QUEUE.md` line 4 ("all blockers done on main"); `modules/agent-loop.md` line 11 | Uses `SearchService` (PST-13) and `WriteOverlay.contentOf` (AGL-12) as they are on main |
| Model resolution is the per-project override or the app default. The client adds transport retries; the loop adds none. | `modules/agent-loop.md` line 51 | `ModelResolver.resolve({projectId})` once per check. The two model-level retries of section 4.1 are the only retries in the engine |
| Per-tool model choice is out of scope. | `modules/agent-loop.md` line 72 | One resolved target per check |
| Agent loop imports other modules only through their entry files. | `apps/api/src/modules/agent-loop/tools/tool-types.ts` lines 122 to 123; `modules/agent-loop.md` line 51 | Imports from `project-store.module.ts` and `providers.module.ts` only |
| No new error code. The module's codes are the four `AGENT_` codes. | `modules/agent-loop.md` line 58; `packages/contracts/src/agent-loop/errors.ts` lines 5 to 10 | Engine failure is a plain `GroundingFailure`; Project store and provider refusals keep their own `ModuleError` codes |
| A claims tool output is a card only; the claims artefact is AGL-16's. | `plans/DECISIONS.md` entry "2026-11-16 — AGL-13 — Navigator decision: open point 1" (lines 5365 to 5370); `units/AGL-13-output-routing.md` line 22 | The engine is the only writer of `logs/grounding/` |
| Contract owns the schemas; the rule "supported and weak verdicts must cite" belongs to the engine. | `plans/AGL-01.md` line 48 (D12) | The rule is implemented in the engine, not in the schema |
| Downstream: AGL-17 (`blocked_by` AGL-13, AGL-16), AGL-19 (`blocked_by` gains AGL-16 in `dc5f898`) and AGL-20 (`blocked_by` AGL-16, among others). | `units/AGL-17-grounding-wiring.md` lines 7, 18 to 21; `units/AGL-19-grounding-sample-draft.md` lines 7, 20 to 22; `units/AGL-20-grounding-gate.md` lines 7, 17 to 21 | Section 6 |

## 2. Facts

### 2.1 Checked in the repository (main at 26cba33)

Unit and module:
- [CHECKED] `units/AGL-16-grounding-engine.md`: front matter lines 1 to 10 (`blocked_by` line 7: AGL-10, AGL-12; `parallel_with` line 8: AGL-13, AGL-14, AGL-15, AGL-18; `unblocks` line 9: AGL-17, AGL-19, AGL-20, as changed in `dc5f898`). Criteria heading line 26 names the test-only HTTP harness (`dc5f898`). Why line 15. Decisions lines 18 to 24. Criteria lines 27 to 30. The unit has no note that records a change; `git log -- units/AGL-16-grounding-engine.md` lists the consolidation commits, `098add9` (dependency fields) and `dc5f898` (the Navigator decision applied).
- [CHECKED] `units/README.md`: blocker notation (bare id is a unit that must be merged); `phase:grounding` is AGL-16 to AGL-20 (phase table row for Agent loop).
- [CHECKED] `modules/agent-loop.md`: line 11 (AGL-16 needs search and the overlay), line 45 (AGL-16 parallel with AGL-13, AGL-14), line 51 (dependencies), line 54 (only `logs/` writes), line 56 (only `sources/` grounds), line 58 (error codes), line 62 (test seam), line 72 (per-tool model out of scope), line 82 (claims artefact in `logs/`).
- [CHECKED] `units/AGL-17-grounding-wiring.md` lines 7 (`blocked_by` AGL-13, AGL-16), 18 (automatic check before pending changes), 19 (on-demand `POST …/grounding`), 20 (events and transcript section), 21 (summary on the pending change); criteria lines 24 to 25.
- [CHECKED] `units/AGL-20-grounding-gate.md` line 7 (`blocked_by` includes AGL-16 and AGL-19), criteria lines 17 to 21, demo line 24.
- [CHECKED] `units/AGL-19-grounding-sample-draft.md` line 7 (`blocked_by` ends with `"AGL-16"`, `dc5f898`), line 8 (`parallel_with` AGL-15, AGL-17, AGL-18), line 17 (adds the matching scripted extract and judge turns to `e2e/fixtures/mock-openai/`), line 20 (criteria heading names the test-only HTTP harness), line 22 (criterion 2: a check against the mock). No plan file and no `unit/AGL-19` branch exist.
- [CHECKED] `modules/agent-loop.md` line 44: "AGL-19 after its content gates and AGL-16." (`dc5f898`).
- [CHECKED] `units/CEX-06-claims-orphans-checks.md` line 15 (reads `logs/grounding/<path>.json`, compares `contentHash` with the current file hash) and 16 (never starts a check).

Contracts (`packages/contracts/src/agent-loop/`):
- [CHECKED] `grounding.ts`: `groundingPassageSchema` lines 14 to 18 (`path`, `offset`, `snippet`); `groundingClaimSchema` lines 21 to 30 (`text` min 1, `span` integers, `verdict`, optional `passage`, `reason`); `groundingResultSchema` lines 33 to 40 (`schemaVersion` 1, `targetPath`, `contentHash`, `checkedAt`, `runId`, `claims`); `groundingSummarySchema` lines 43 to 48; `groundingRequestSchema` lines 51 to 53.
- [CHECKED] `constants.ts`: `AGENT_TOOL_FAMILIES` includes `grounding` (line 14); `AGENT_RESERVED_TOOL_NAMES` includes `check_grounding` (line 37); `AGENT_TRANSCRIPT_KINDS` includes `grounding` (line 65); `GROUNDING_VERDICTS` lines 73 to 75; `GROUNDING_RESULT_SCHEMA_VERSION` = 1 (line 78); path constants lines 82 to 86 (`GROUNDING_ARTEFACT_PATH_PREFIX` = `logs/grounding/`, `…_SUFFIX` = `.json`, `…_PATTERN` line 86).
- [CHECKED] `events.ts`: `groundingStartedDataSchema` lines 54 to 56; `groundingResultDataSchema` lines 58 to 61 (result plus `seq`); members lines 110 to 120; `agentLoopEventSchema` lines 135 to 146 includes both.
- [CHECKED] `errors.ts`: `AGENT_ERROR_CODES` lines 5 to 10 (four codes); `AGENT_ERROR_STATUS` lines 25 to 30.
- [CHECKED] `packages/contracts/src/project-store/constants.ts` line 11: `CONTENT_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/`. `project-store/constants.ts` lines 17 to 20: reserved prefixes are `.scriba/` and `drafts/.versions/` only, so `logs/` is not reserved.
- [CHECKED] `packages/contracts/src/providers/defaults.ts` line 4: `PROVIDER_DEFAULTS`.

Agent loop code (`apps/api/src/modules/agent-loop/`):
- [CHECKED] `agent-run.ts`: `controller` private, line 119; `requestedEnd` line 118; `tools` (the `ToolRun`) private, line 121; the constructor lines 128 to 148; step cap check line 204; `askModel` lines 228 to 254 offers `this.tools.schemas()` as `tools`; `runCall` lines 296 to 383; `finish` lines 388 to 404 is synchronous; `flushWrites` lines 408 to 439 is synchronous and calls `deps.propose`.
- [CHECKED] `agent-runs.service.ts` lines 97 to 124: the run's deps are built here (`propose`, `targetExists`, `transcripts`); the service injects `FilesService`, `ModelResolver`, `PendingService`, `AgentToolsService` (lines 44 to 54).
- [CHECKED] `agent-loop.module.ts`: imports lines 1 to 13; comment lines 31 to 33 ("Grounding lands in a later unit."); providers lines 46 to 59; exports line 60 (`AgentSettingsService`, `AgentToolsService`); imports `ProjectStoreModule`, `ProvidersModule`, `ToolRegistryModule` lines 35 to 40.
- [CHECKED] `tools/write-overlay.ts`: class lines 15 to 55; `contentOf(path)` lines 34 to 37 (returns the proposed text or undefined); `put(path, content, callId, provenance?)` lines 40 to 49; `entriesInOrder()` lines 52 to 54.
- [CHECKED] `tools/tool-run.ts`: `overlay` is `readonly` and public, line 69; `dispatch` lines 112 to 187 passes the signal to the handler at line 146.
- [CHECKED] `tools/tool-types.ts`: `ToolContext` lines 44 to 48 (`run`, `callId`, `signal?`); comment lines 122 to 123 on the import rule.
- [CHECKED] `tools/builtin-tools.ts` line 354 returns five tools (`list_files`, `read_file`, `search_notes`, `write_file`, `edit_file`); no `check_grounding` exists on main.
- [CHECKED] `transcript-entries.ts` line 30: "The grounding kind is not written here (AGL-16)." `transcript-reader.ts` line 207: grounding and pending-change lines are kept out of the turns.
- [CHECKED] `transcript-run-state.ts` lines 18: `groundingResults: []`.

Project store (`apps/api/src/modules/project-store/`):
- [CHECKED] `project-store.module.ts`: `SearchService` exported (lines 26 and 72); `FilesService` exported (lines 23 and 68).
- [CHECKED] `search.service.ts`: `DEFAULT_LIMIT` = 20 (line 24); `SCOPE_PREFIXES` line 27; `scopeClause` lines 30 to 39 (an absent or empty scope means both folders); `search(projectId, request)` lines 95 to 117 returns `{path, offset, snippet, score}`; `projectFor` lines 199 to 210 calls `requireActive` (line 200).
- [CHECKED] `search-index.ts`: `buildMatchQuery` lines 111 to 118 quotes each whitespace-separated word and joins them with `OR`, so one shared word is a match; `chunkText` lines 81 to 106 splits on blank lines; `blockPassage` lines 70 to 77 gives the offset of the first non-space character of a block.
- [CHECKED] `files.service.ts`: `hashOf` lines 88 to 91 (`sha256:` plus hex of the bytes); `read(projectId, path)` lines 257 to 269 returns `{path, content, hash, mtime}` and refuses non-text; `write(projectId, request)` lines 272 to 290 (`path`, `content`, optional `baseHash`); `commit` lines 523 to 555 writes atomically and publishes `files-changed` (lines 545 to 549); `projectFor` lines 512 to 519 calls `requireActive` (line 513); `appendLog` lines 436 to 475 resolves a `logs/` path and creates its folders (`mkdirParent`, line 459).
- [CHECKED] `atomic-write.ts` line 7: `writeFileAtomic` creates the folders above the target.
- [CHECKED] `path-safety.ts` lines 116 to 190: `resolveProjectPath` checks syntax, reserved paths, the root and the links; `project-discovery.ts` line 38: a project's id is its folder name.

Providers:
- [CHECKED] `providers.module.ts`: exports `ModelResolver`, `streamChat`, `ChatMessage`, `ChatRequest`, `StreamEvent`, `ToolCall`, `ToolSchema` (lines 14 to 27); `ProvidersModule` exports `ModelResolver` (line 51).
- [CHECKED] `providers.resolution.ts`: `ResolutionInput` lines 23 to 25; `ResolvedModel` lines 40 to 46 (`config`, `key?`, `model`, `contextSize`, `source`, `warning?`); `resolve(input)` lines 70 to 98.
- [CHECKED] `client/types.ts`: `ChatMessage` lines 5 to 9; `ChatRequest` lines 31 to 39 (`messages`, optional `tools`, `toolChoice`, `signal`); `StreamEvent` lines 56 to 60.
- [CHECKED] `client/openai-compatible-client.ts`: `streamChat` line 116; `chatBody` lines 237 to 251 adds `tools` only when given; `providers/client/retry.ts` lines 46 to 53: a retry is allowed only before the first chunk.

Test kit and mock:
- [CHECKED] `apps/api/test/create-test-app.ts`: `TestAppOptions.modules` line 13 (replaces `COMPOSED_MODULES` when set), passed to `bootstrap` line 86; `TestApp` interface lines 22 to 27. Unchanged by this plan.
- [CHECKED] `apps/api/src/app.module.ts` lines 19 to 26: `COMPOSED_MODULES` (exported) includes `SetupAuthModule`; line 51 uses `options.modules ?? COMPOSED_MODULES`. `setup-auth.module.ts` line 58 registers the global default-deny guard (`APP_GUARD`).
- [CHECKED] `apps/api/test/agent-loop-tools.kit.ts` lines 23 to 81: the AGL-02 kit (a factory returning a `@Module` that imports `PlatformModule` and `AgentLoopModule`, one controller under `api/agent-loop-test`, imports from the agent-loop entry file). `apps/api/test/agent-loop-tools.test.ts` lines 33 to 36 boot it with `modules: [PlatformModule, AgentLoopModule, agentLoopToolsKitModule()]`.
- [CHECKED] `apps/api/test/guard-request.ts` lines 80 to 97: `sessionCookie` runs the setup handshake and throws without a session cookie, so it needs `SetupAuthModule` in the app.
- [CHECKED] `apps/api/src/modules/platform/errors/platform-exception.filter.ts` (`APP_FILTER`, `platform.module.ts` line 35): maps errors to the Platform envelope, so the kit answers a `GroundingFailure` in its own body rather than with an `HttpException`.
- [CHECKED] `apps/api/src/bootstrap.ts` line 30 (`bootstrap` returns `INestApplication`), line 60 (returns `app`).
- [CHECKED] `apps/api/test/agent-loop-transcript.kit.ts`: `HarnessOptions` lines 64 to 69 (`scenario`, `steps`, `prepare?`; no `modules` option); `Harness` lines 71 to 82 (`app`, `cookie`, `mock`, `fixture`, `scenario`, `close`, `restart`); `openHarness` line 84 calls `createTestApp({ libraryDir: fixture.library })` at lines 115 (restart) and 122 (open), then `sessionCookie` (lines 117, 123); `post(h, path, body)` lines 140 to 149 sends the cookie and the loopback origin; `requestsOf(h)` lines 210 to 212 returns the chat bodies the mock received (`messages`, each with `content`). So `openHarness` cannot take the kit modules without a change (section 3).
- [CHECKED] `apps/api/test/project-store-projects.kit.ts`: `buildProjectsLibrary` writes `book/project.yaml` (line 45, `genrePack: nonfiction`) and `book/sources/outline.md` (line 48, `# Outline`). It does not create `book/drafts/`.
- [CHECKED] `e2e/fixtures/mock-openai/server.mjs`: `matcherHolds` lines 103 to 131 (matchers `endpoint`, `attempt`, `header`, `turnIndex`, `lastMessageRole`, `lastMessageContent`, `toolResultPresent`); `attempts` counted per endpoint, line 284; `renderReply` lines 319 to 345 (`kind: 'stream'` with `deltas`, line 341); `streamItems` line 359.
- [CHECKED] `apps/api/vitest.config.mts`: `include: ['test/**/*.test.ts']`. `apps/api/package.json` line 7: `"test": "npm run build && vitest run"`. Root `package.json` line 23 (`build` order) and line 25 (`test` runs every workspace).

Plans, queue and decisions:
- [CHECKED] Plans with status `draft` or `planned` (`grep -l "^status: \(draft\|planned\)" plans/*.md`): only `plans/TRG-14.md` (`status: planned`, line 3).
- [CHECKED] No plan file exists for AGL-15, AGL-17 or AGL-19; `plans/AGL-16.md` does not exist before this revision.
- [CHECKED] Done on main (plan `status: done`): AGL-01, AGL-02, AGL-03, AGL-04, AGL-05, AGL-06, AGL-07, AGL-08, AGL-09, AGL-10, AGL-11, AGL-12, AGL-13, AGL-14, AGL-18, AGL-25. Main commits: AGL-12 `57aebf6`, AGL-13 `92442bd`, AGL-14 `5a027c4`, AGL-18 `ba23679`.
- [CHECKED] `plans/AGL-12.md` line 179 says AGL-16 adds an accessor in `agent-run.ts`; this plan does not (section 6 explains why).
- [CHECKED] `plans/AGL-14.md` line 104, `plans/AGL-13.md` line 106: AGL-16 uses `contentOf` for the hash and owns `logs/grounding/`.
- [CHECKED] `plans/AGL-04.md` line 53 and `plans/AGL-05.md` line 112: `grounding` transcript lines belong to AGL-16/17; AGL-16 writes none.
- [CHECKED] `plans/PLT-12.md` line 251: open point 17 (whether AGL-16 names PLT-12 in `blocked_by`). PLT-12 is `done`.
- [CHECKED] `plans/PST-13.md` line 118 and `plans/AGL-10.md` line 201: AGL-16 passes `scope: ['sources']`, which the search contract supports.

Git:
- [CHECKED] Branch `main`, HEAD `26cba33`. Working tree: ` M units/SAU-12-providers-step.md` (unrelated).

### 2.2 Assumed, not checked

- [ASSUMED] A1. `npm test -w @bbartolome/scriba-api -- agent-loop-grounding` runs only the new test file (vitest treats the argument as a filename filter). Not run.
- [ASSUMED] A2. Nest resolves the engine's three constructor dependencies (`ModelResolver`, `SearchService`, `FilesService`) inside `AgentLoopModule`, and the kit module resolves the exported `GroundingEngine`. The imports and exports are checked (section 2.1); the boot is not.
- [ASSUMED] A3. The mock returns a `kind: 'stream'` reply with `deltas: [text]` as one text-delta sequence, so the engine's concatenation returns the JSON exactly. The renderer is checked; the client's assembly was not run.
- [ASSUMED] A4. A file `sources/notes.md` whose first line is the paragraph gives a passage at offset 0. `blockPassage` is checked; the front-matter branch was not read, and the file has no front matter.
- [ASSUMED] A5. `resolveProjectPath` accepts `logs/grounding/drafts/ch01.md.json` when `logs/grounding/drafts/` does not exist yet. Checked by analogy: `appendLog` does the same with `logs/agent-runs/` (files.service.ts 445 to 459). Not checked in `resolveProjectPath`.
- [ASSUMED] A6. zod 4 (`apps/api` depends on `^4`) provides `.nullish()` and `z.enum` over a readonly tuple, as the contracts use them. Not checked in `node_modules`.
- [ASSUMED] A7. `npm run build` at the root (contracts first) is needed before the API tests, as the root build order shows. Not run.
- [ASSUMED] A8. Lint (`eslint`) and `prettier --check` run offline in this environment. Not run.
- [ASSUMED] A9. A long draft (up to the 5 MiB file cap) sent in one extract request is refused or cut off by the provider (its `max_tokens` or context limit), not by the engine. Not measured. Open point 7.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/grounding-engine.ts` | new | `GroundingEngine` (`@Injectable`), `GroundingCheckInput`, `GroundingFailure` |
| `apps/api/src/modules/agent-loop/grounding-prompts.ts` | new | Markers, the two system prompts, the fixed texts, the limits, the zod reply schemas |
| `apps/api/src/modules/agent-loop/agent-loop.module.ts` | edit | Imports `GroundingEngine` and lists it in `providers` and `exports` (next to `AgentSettingsService` and `AgentToolsService`); re-exports `GroundingEngine` and `GroundingFailure` from the entry file. Comment lines 31 to 33 change to say the engine is registered and its wiring lands later |
| `apps/api/test/agent-loop-grounding.kit.ts` | new | Test-only kit module and controller under the `api/agent-loop-test` prefix, never in the composed app |
| `apps/api/test/agent-loop-transcript.kit.ts` | edit (additive) | `HarnessOptions` gains `modules?: Type<unknown>[]`, passed to both `createTestApp` calls (lines 115 and 122). Why: `openHarness` boots the app itself and has no way to add the kit; without it the option is undefined and the behaviour is unchanged for the AGL-04/05 tests |
| `apps/api/test/agent-loop-grounding.test.ts` | new | The four criterion tests |
| `units/AGL-16-grounding-engine.md` | edit, last commit only | Ticks the four criteria boxes (step 6). Text unchanged |
| `plans/AGL-16.md` | edit, last commit only | `status: done` (step 6) |

Not changed by this unit:
- `agent-run.ts`, `agent-runs.service.ts`, `agent-tools.service.ts`, `tools/*` (including `builtin-tools.ts`, so no `check_grounding` tool), the `transcript-*.ts` files, `transcript-entries.ts`, `conversation-history.ts`.
- `packages/contracts/**` (every schema and constant the engine needs already exists).
- `apps/api/src/modules/project-store/**` and `providers/**` (their entry files already export what the engine uses).
- `e2e/**` and the mock server (AGL-19 owns the grounding scripts).
- `apps/web/**`, `examples/**`, `packages/packs/**`.
- `package.json` and `package-lock.json` (no new dependency: zod and `node:crypto` are already available).
- `apps/api/test/create-test-app.ts` (the kit goes through its existing `modules` option, line 13).
- `units/**` except the step-6 tick, `modules/**`, `plans/DECISIONS.md`.

## 4. Procedure

### 4.1 Names, values and formats (small choices made here, and settled values)

Engine interface, in `grounding-engine.ts`:
- `export interface GroundingCheckInput { projectId: string; runId: string; targetPath: string; overlay?: WriteOverlay; signal?: AbortSignal }`. `WriteOverlay` is imported from `./tools/write-overlay`.
- `export class GroundingFailure extends Error` with `name = 'GroundingFailure'`. It carries a readable message only.
- `@Injectable() export class GroundingEngine` with constructor `(resolver: ModelResolver, search: SearchService, files: FilesService)`, all private readonly. Imports: `ModelResolver`, `streamChat`, `ChatMessage`, `ResolvedModel` from `../providers/providers.module`; `SearchService`, `FilesService` from `../project-store/project-store.module`.
- `async check(input: GroundingCheckInput): Promise<GroundingResult>`.

Constants and texts, in `grounding-prompts.ts` (exact values):
- `EXTRACT_MARKER = 'Task: extract claims.'`
- `JUDGE_MARKER = 'Task: judge claims.'`
- `RETRIEVAL_LIMIT = 5` (small choice: the passages the judge sees per claim; the search default of 20 would make the judge prompt long)
- `JUDGE_BATCH_SIZE = 10` (small choice: claims per judge call)
- `MODEL_ATTEMPTS = 3` (one try and two retries; the same rule for extract and for judge, see open point 2)
- `EXTRACT_FAILED_MESSAGE = 'The claims of the draft could not be read. The model gave no valid claim list after three attempts.'`
- `JUDGE_FAILED_MESSAGE = 'The verdicts on the claims could not be read. The model gave no valid verdict list after three attempts.'`
- `NO_PASSAGE_REASON = 'No passage of sources/ matches this claim.'`
- `UNCITED_REASON = 'The verdict cited no passage retrieved for this claim, so it is unsupported.'`
- `EXTRACT_SYSTEM_PROMPT = 'You extract the factual claims of a text. A factual claim states something a source could confirm or contradict: a number, a date, a named event, a cause or an effect. Leave out opinions and questions. Reply with JSON only, in this form: {"claims": [{"text": "<the claim, copied from the text>", "span": {"start": <character offset where the claim starts in the text>, "end": <character offset where it ends>}}]}. Reply with {"claims": []} when the text has no factual claim. Reply with nothing but the JSON.'`
- `JUDGE_SYSTEM_PROMPT = 'You judge each numbered claim against the passages listed under it. Give each claim one verdict: "supported" when a passage confirms the claim, "weak" when a passage confirms it only in part or indirectly, "unsupported" when no passage confirms it. For "supported" and "weak", name one passage by its path and offset, copied exactly from the list. For "unsupported", use null for the passage. Reply with JSON only, in this form: {"verdicts": [{"claim": <claim number>, "verdict": "supported" | "weak" | "unsupported", "passage": {"path": "<path>", "offset": <offset>} | null, "reason": "<one short sentence>"}]}. Give exactly one verdict for each claim you were given. Reply with nothing but the JSON.'`
- `extractReplySchema = z.object({ claims: z.array(z.object({ text: z.string().min(1), span: z.object({ start: z.number().int().min(0), end: z.number().int().min(0) }) })) })`. Unknown keys are ignored.
- `judgeReplySchema = z.object({ verdicts: z.array(z.object({ claim: z.number().int().min(0), verdict: groundingVerdictSchema, passage: z.object({ path: z.string().min(1), offset: z.number().int().min(0) }).nullish(), reason: z.string() })) })`. `groundingVerdictSchema` comes from the contract.

Message formats (fixed, so AGL-19's mock scripts can match them):
- Extract request: system message `EXTRACT_SYSTEM_PROMPT`, then one user message `EXTRACT_MARKER + '\n\n' + checkedText`. The last message is the user message, so the mock's `lastMessageContent` matcher sees the marker.
- Judge request: system message `JUDGE_SYSTEM_PROMPT`, then one user message `JUDGE_MARKER + '\n\n'`, followed for each claim in the batch by the line `Claim <index>: <claim text>` and one line `Passage <path> at <offset>: <snippet>` per retrieved passage, then a blank line. `<index>` is the claim's 0-based position in the extract list (global, not per batch).
- No `tools` and no `toolChoice` in either request. Requests carry only `messages` and `signal`.

Retry and parse rules:
- The reply text is the concatenation of the `text-delta` events of `streamChat`. Tool-call events are ignored.
- A reply is parsed as `JSON.parse(reply.trim())`, then checked with the schema. A parse or schema failure is one failed attempt. The same messages are sent again on the retry (small choice: no feedback text).
- Extract: after `MODEL_ATTEMPTS` failed attempts, throw `new GroundingFailure(EXTRACT_FAILED_MESSAGE)`.
- Judge: the reply must cover each claim of the batch exactly once, with no other index; a reply that does not is a failed attempt. After `MODEL_ATTEMPTS` failed attempts, throw `new GroundingFailure(JUDGE_FAILED_MESSAGE)`. This rule is open point 2.
- Errors from `streamChat` (for example an abort) and from the resolver, `search` or `files` propagate unchanged. They are not retried.

`check(input)` algorithm, in this order:
1. Checked text: `input.overlay?.contentOf(input.targetPath) ?? files.read(projectId, targetPath).content`. A file that does not exist is refused by `files.read` with its own readable error.
2. Target: `resolver.resolve({ projectId })` once.
3. Extract: `claims = await extract(target, text, signal)`; each claim keeps its position in the list.
4. Retrieve: for each claim, `search.search(projectId, { query: claim.text, scope: ['sources'], limit: RETRIEVAL_LIMIT })`, mapped to `{path, offset, snippet}` (the score is dropped). The passages of claim `i` are `passages[i]`. `search.search`, `files.read` and `files.write` are synchronous on main (`search.service.ts` line 96, `files.service.ts` lines 257 and 272); they need no `await`.
5. Judge: the claims with `passages[i].length > 0`, in order, are cut into batches of `JUDGE_BATCH_SIZE`. Each batch is one judge request. A claim with no passages is never in a batch (criterion 2 holds by construction).
6. Verdicts, in claim order, for each claim `i`:
   - If `passages[i]` is empty: `{text, span, verdict: 'unsupported', reason: NO_PASSAGE_REASON}`.
   - Else take the judge's verdict `j` for `i`.
     - `j.verdict` is `unsupported`: `{text, span, verdict: 'unsupported', reason: j.reason}`.
     - `j.verdict` is `supported` or `weak`: if `j.passage` matches a retrieved passage of `i` by `path` and `offset`, keep `verdict`, `reason: j.reason`, and set `passage` to the retrieved passage object (the engine's snippet, not the model's). Otherwise (outside the retrieved set, or no passage): `{text, span, verdict: 'unsupported', reason: UNCITED_REASON}`, with no `passage`. The no-passage case is open point 3.
   - A `passage` key is present only when a passage is kept.
7. Result: `{schemaVersion: GROUNDING_RESULT_SCHEMA_VERSION, targetPath: input.targetPath, contentHash: 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex'), checkedAt: new Date().toISOString(), runId: input.runId, claims}`, then `groundingResultSchema.parse(result)`.
8. Artefact: `files.write(projectId, {path: GROUNDING_ARTEFACT_PATH_PREFIX + targetPath + GROUNDING_ARTEFACT_PATH_SUFFIX, content: JSON.stringify(result, null, 2) + '\n'})`. It overwrites the file of an earlier check.
9. Return `result`.

Engine input is a plain object; nothing is published and no event is emitted. The engine writes no transcript line.

### 4.2 Steps (one commit each)

Step 0 (no commit). Create branch `unit/AGL-16` from `main`. Do not stage `units/SAU-12-providers-step.md`.

Step 1. Commit `test(AGL-16): add the grounding criteria tests`.
- `apps/api/test/create-test-app.ts` is not edited.
- Edit `apps/api/test/agent-loop-transcript.kit.ts` (additive): add `modules?: Type<unknown>[];` to `HarnessOptions` (with the comment "Replaces the composed modules when set, as `TestAppOptions.modules`."), and pass `modules: options.modules` in both `createTestApp` calls (lines 115 and 122). `Type` is imported from `@nestjs/common` as a type.
- Create `apps/api/test/agent-loop-grounding.kit.ts`, modelled on `agent-loop-tools.kit.ts`: `export function agentLoopGroundingKitModule(): Type<unknown>` returns a `@Module({ imports: [PlatformModule, AgentLoopModule], controllers: [AgentLoopGroundingKitController] })`. The controller is `@Controller('api/agent-loop-test')` with one route `@Post('grounding') @HttpCode(200)`. Request body (JSON): `{projectId: string, runId: string, targetPath: string, overlay?: Record<string, string>}`. `overlay` is the simplest JSON form of a `WriteOverlay`: an object from target path to proposed content. When it is present the kit builds `new WriteOverlay()` and calls `put(path, content, 'kit-overlay')` for each entry; when absent it passes no overlay. It calls `GroundingEngine.check({projectId, runId, targetPath, overlay})` (no signal). Reply: on success, the `GroundingResult` JSON as the body; on a `GroundingFailure`, the body `{failure: <the failure's message>}` (status 200; an `HttpException` would be rewritten by the Platform filter). Any other error is rethrown and answered by the Platform filter. Comment: "A test-only HTTP harness for the grounding engine until AGL-17 exists. It is never in the composed app." Imports: `GroundingEngine`, `GroundingFailure`, `AgentLoopModule` from `../src/modules/agent-loop/agent-loop.module`; `WriteOverlay` from `../src/modules/agent-loop/tools/write-overlay`; `PlatformModule` from `../src/modules/platform/platform.module`.
- Create `apps/api/test/agent-loop-grounding.test.ts` with the four tests of section 5. It imports the markers and messages from `../src/modules/agent-loop/grounding-prompts`, `groundingResultSchema`, `GROUNDING_ARTEFACT_PATH_PREFIX`/`SUFFIX`/`PATTERN` from `@bbartolome/scriba-contracts/agent-loop`, `COMPOSED_MODULES` from `../src/app.module`, `agentLoopGroundingKitModule` from `./agent-loop-grounding.kit`, and `openHarness`, `post`, `requestsOf` from `./agent-loop-transcript.kit`. It imports no service. Each test opens its harness with `modules: [...COMPOSED_MODULES, agentLoopGroundingKitModule()]`: the composed app plus the kit, through `TestAppOptions.modules` (create-test-app.ts line 13), as `agent-loop-tools.test.ts` line 35 does for the AGL-02 kit. The list is the composed modules, not only `[PlatformModule, AgentLoopModule, kit]`, because `openHarness` gets its session cookie through the setup handshake (`guard-request.ts` lines 80 to 97), which needs `SetupAuthModule`; it also keeps the primary seam of `modules/agent-loop.md` line 62.
- A helper `check(h, body)` in the test file sends `post(h, '/api/agent-loop-test/grounding', {projectId: 'book', runId: 'run-agl16', ...body})` and returns the reply.
- Fixture for every test (written by `prepare(fixture)` into `fixture.library/book`): `sources/notes.md` = `Harbour traffic doubled in 1900.\n`; `sources/other.md` = `Unrelated oats and barley.\n`; `drafts/ch01.md` = `Harbour traffic doubled in 1900.\n` (create the folders with `mkdirSync(..., {recursive: true})`). The project is `book`, active by the harness settings.
- Scenario steps are built by two helpers in the test file: `extractStep(claims)` (`{match: {endpoint: 'chat', lastMessageContent: EXTRACT_MARKER}, reply: {kind: 'stream', deltas: [JSON.stringify({claims})]}}`) and `judgeStep(verdicts)` (the same with `JUDGE_MARKER` and `{verdicts}`). Each test gives its own scenario name, for example `agl16-downgrade`.
- Run the command of section 5. All four tests fail, because the engine module does not exist yet (the kit's imports do not resolve). Commit the test file, the kit file and the `agent-loop-transcript.kit.ts` edit only.

Step 2. Commit `feat(AGL-16): grounding prompts, limits and reply schemas`.
- Create `apps/api/src/modules/agent-loop/grounding-prompts.ts` with exactly the constants, prompts, messages formats and schemas of section 4.1. Export every name. No behaviour beyond the schemas.
- Run `npx tsc --noEmit -p apps/api/tsconfig.json` (or `npm run build -w @bbartolome/scriba-api`). The tests still fail (no engine).

Step 3. Commit `feat(AGL-16): extract claims with two retries and register the engine` (criterion 4 passes).
- Create `apps/api/src/modules/agent-loop/grounding-engine.ts`: the class, the input type, `GroundingFailure`, the constructor, and `check()` with algorithm steps 1, 2, 3, 6-as-unsupported and 7. In this step, step 6 gives every claim `unsupported` with `NO_PASSAGE_REASON` (temporary; step 4 replaces it). `check()` returns the result of step 7, with no artefact yet.
- Implement `extract(target, text, signal)` as section 4.1 (three attempts, `streamChat` with `{messages, signal}` only, `extractReplySchema`).
- Edit `apps/api/src/modules/agent-loop/agent-loop.module.ts`: import `GroundingEngine`, add it to `providers` after `AgentToolsService`, add it to the `exports` array next to `AgentSettingsService` and `AgentToolsService` (`exports: [AgentSettingsService, AgentToolsService, GroundingEngine]`), add `export { GroundingEngine, GroundingFailure } from './grounding-engine';` after line 17 of the entry file, and change the comment at lines 31 to 33 to: "Grounding: its engine is registered here; the wiring of the checks lands in a later unit."
- Run `npm test -w @bbartolome/scriba-api -- agent-loop-grounding`. Criterion 4 (test G4) passes; G1 to G3 fail.

Step 4. Commit `feat(AGL-16): retrieve from sources and judge, downgrade uncited verdicts` (criteria 1 and 2 pass).
- Replace the temporary step 6 with algorithm steps 4, 5 and 6 of section 4.1.
- Implement `judge(target, batch, signal)` as section 4.1 (`MODEL_ATTEMPTS` attempts, coverage check, `judgeReplySchema`).
- Run the test command. G1 and G2 pass; G3 fails; G4 still passes.

Step 5. Commit `feat(AGL-16): claims artefact at the path rule with the content hash` (criterion 3 passes).
- Add algorithm step 8 (the artefact write with the three constants) and make the result's `checkedAt` and `contentHash` the values of step 7.
- Run `npm test -w @bbartolome/scriba-api -- agent-loop-grounding`. All four pass.
- Run `npm test -w @bbartolome/scriba-api` (the whole API suite, with its build) to check the `agent-loop-transcript.kit.ts` change against the AGL-04 and AGL-05 tests and the `exports` change, and `npm run lint -w @bbartolome/scriba-api`. Run `npx prettier --check` on the six changed files.

Step 6. Commit `docs(AGL-16): criteria checked, plan status done`.
- In `units/AGL-16-grounding-engine.md`, change the four `- [ ]` boxes to `- [x]`. Change no criterion text.
- In `plans/AGL-16.md`, set `status: done`.

## 5. Tests

One test for each acceptance criterion of `units/AGL-16-grounding-engine.md` (heading line 26 "Acceptance criteria (mock extract and judge turns; the engine is tested through a test-only HTTP harness until AGL-17 exists)"). All four are in `apps/api/test/agent-loop-grounding.test.ts`. Each test builds its own harness with `openHarness` (one mock scenario, one temp library with `book` active, the composed app plus the kit through `modules`, section 4.2 step 1). Each test calls `await h.close()` in `finally`. Each check is an HTTP `POST /api/agent-loop-test/grounding` through the kit (open point 1, settled). The tests assert only on the HTTP reply status and body, the files on disk, and the requests the mock received (`requestsOf`). No test uses `h.app.nest.get` or any other internal service.

Command for every test: `npm test -w @bbartolome/scriba-api -- agent-loop-grounding` (builds the workspace, then runs the file). The single-test form is `npm test -w @bbartolome/scriba-api -- agent-loop-grounding -t "G1"`.

| Criterion (quoted from the unit) | Test | What the test asserts |
|---|---|---|
| "A verdict citing a passage that wasn't retrieved is downgraded to `unsupported`." | G1 `a verdict citing an unretrieved passage is downgraded` | Two claims, both retrieving `sources/notes.md`. The judge reply gives claim 0 `supported` citing `sources/other.md` at offset 0 (not retrieved, since it shares no word with claim 0). Reply 200; its body, parsed with `groundingResultSchema`, has claim 0 `unsupported` with no `passage`. Claim 1 (same reply shape, citing `sources/notes.md` at offset 0, retrieved) stays `supported` with `passage.path` `sources/notes.md`. Both claims' texts are the extract's. |
| "A claim with no retrieved passages is `unsupported` and no judge call covers it." | G2 `a claim with no retrieved passage is unsupported and no judge call covers it` | Claim 0 `Harbour traffic doubled in 1900.` (retrieved); claim 1 `Zarquon quasars rose 97 percent.` (no word of it is in any file). The judge reply gives only claim 0 `supported` citing `sources/notes.md`. Reply 200; in its body, claim 1 is `unsupported`, `reason` equals `NO_PASSAGE_REASON`. `(await requestsOf(h))` (it returns a promise, kit line 210) filtered to the requests whose last message contains `JUDGE_MARKER` has length 1, and that request's content contains `Harbour` and does not contain `Zarquon`. |
| "The claims artefact matches the contract, sits at the path rule, and carries the checked text's content hash." | G3 `the claims artefact matches the contract, the path rule and the content hash` | Kit check of `drafts/ch01.md` from disk (no `overlay`): reply 200, and the file `join(h.fixture.library, 'book', 'logs', 'grounding', 'drafts', 'ch01.md.json')` exists; `groundingResultSchema.parse(JSON.parse(text))` succeeds; `targetPath` is `drafts/ch01.md`; `runId` is `run-agl16`; `schemaVersion` is 1; `contentHash` equals `'sha256:' + sha256 of the draft's bytes`, computed in the test from the file on disk; the file's JSON equals the reply body. Then a second kit check with `overlay: {'drafts/ch01.md': 'Harbour traffic doubled in 1900. Changed in the run.\n'}`: the same file is overwritten, and its `contentHash` equals the hash of the overlay text. The path is also checked with `GROUNDING_ARTEFACT_PATH_PATTERN` from the contract. |
| "Malformed extract JSON is retried twice, then the check fails readably." | G4 `malformed extract JSON is retried twice, then the check fails readably` | Scenario: every extract request gets the reply `not a claim list`. The kit reply is 200 with the body `{failure: EXTRACT_FAILED_MESSAGE}` (the readable failure text). The requests of `await requestsOf(h)` whose last message contains `EXTRACT_MARKER` number exactly 3 (one try and two retries). No request contains `JUDGE_MARKER`. No file exists under `logs/grounding/`. |

Notes on the test data (checked against the search rules in section 2.1):
- `buildMatchQuery` matches any shared word, so claim and file words are chosen to avoid shared words where a test needs no match: `Zarquon quasars rose 97 percent.` shares no word with any file; `Unrelated oats and barley.` shares none with claim 0 of G1.
- `sources/outline.md` (`# Outline`) comes with the fixture and shares no word with the claims used here.

## 6. Agreement with downstream units

### AGL-17 (grounding wiring; `blocked_by` AGL-13, AGL-16)

What AGL-17 needs from AGL-16, and how the plan gives it:
- A callable engine with a stable input and output. Given by `GroundingEngine.check({projectId, runId, targetPath, overlay?, signal?})` returning `GroundingResult` (section 4.1). AGL-17 injects the engine in the same module (registered and exported in step 3; the export is for the kit). AGL-17's plan retires the kit's use in favour of the real `POST …/grounding` route; the kit file may remain, as AGL-02's does (`plans/DECISIONS.md` entry "2026-11-16 — AGL-16 — Navigator decision: test seam for the four criteria, and the AGL-19 dependency").
- Overlay and signal: the engine takes them as inputs. AGL-16 adds no accessor. The `check_grounding` handler gets both from its `ToolContext` (`tools/tool-types.ts` lines 44 to 48: `run`, `callId`, `signal`) and `ToolRun.overlay` (`tools/tool-run.ts` line 69). The automatic check in `finish` (AGL-17 line 18) has no such context: `AgentRun.tools` (line 121) and `controller` (line 119) are private. AGL-17 adds the accessors it needs. This replaces the expectation in `plans/AGL-12.md` line 179 that AGL-16 adds the accessor; AGL-16 does not need one.
- Synchronous `finish` (agent-run.ts lines 388 to 404) and `flushWrites` (lines 408 to 439). The engine returns a promise. AGL-17 must await the checks before `flushWrites` runs; that means an async path before `finish`, or an async `finish`. This is a constraint on AGL-17's plan, not a conflict.
- The summary `{supported, weak, unsupported, checkedAt}` (contract `groundingSummarySchema`, `grounding.ts` lines 43 to 48) is counted by AGL-17 from `result.claims` (the verdicts after the downgrade rules) and `result.checkedAt`. AGL-16 exports no summary function, so the counts have one place of truth in the result.
- Events `grounding-started` and `grounding-result` (contract `events.ts` lines 54 to 61): AGL-16 emits none. AGL-17 emits them with the result plus `seq`.
- Transcript `grounding` line: AGL-16 writes none (section 2.1, transcript-entries.ts line 30). AGL-17 writes it.
- The artefact for every successful check, including `check_grounding` and the on-demand run (AGL-17 criterion 2). The engine writes it in step 8, so AGL-17 does not write it.
- Model calls outside the step cap and cancelled by stop: by construction (the engine is not in the loop) and by `signal` (`streamChat` aborts with `PROVIDER_ABORTED`). AGL-17 passes the run's signal.
- Failure: `GroundingFailure` with a readable message (extract and judge, after three attempts), and the Project store's and providers' own errors (`ModuleError`). How AGL-17 shows them is open point 5.
- Project must be active (open point 6). Search and `files.write` both require it.
- The reserved name `check_grounding` (contract constants line 37) is for AGL-17's tool; the engine does not register it.

### AGL-20 (grounding gate; `blocked_by` AGL-15, AGL-16, AGL-17, AGL-18, AGL-19, PST-14)

What the gate's criteria need, and where the plan provides it:
- "Done when an invented statistic in a draft is flagged as unsupported." A statistic that no source contains gets no retrieved passage, and so `unsupported` without the model (rule of criterion 2, test G2). A statistic with shared words and a judge verdict `unsupported` also ends `unsupported`.
- "A check of the sample grounding-claims draft yields at least one claim of each verdict, and every supported or weak verdict cites a retrieved `sources/` passage." The engine guarantees the citation rule by construction (`supported`/`weak` only with a retrieved passage, otherwise `unsupported`, rule of test G1). The three verdicts need the sample's mock judge reply to give `supported`, `weak` and `unsupported` for claims that retrieve passages, or no passage at all. This depends on AGL-19 (section 7).
- "A verdict citing a passage that wasn't retrieved is downgraded to `unsupported`." Test G1.
- "The claims artefact matches the contract and carries the draft's content hash." Test G3 (the artefact is `groundingResultSchema`-valid, at the path rule, with `sha256:` of the checked text).
- "Badges render with text labels at phone width." AGL-18 (already on main) reads the `grounding-result` shape, which is the engine's result (`groundingResultSchema`). No change.
- Demo: "Expand a supported claim and open its cited source." Each `supported` claim carries `passage {path, offset, snippet}` from the search of this run (step 6 of section 4.1).

### Other units that name AGL-16

- AGL-19 (no plan; `blocked_by` now ends with AGL-16, `dc5f898`): its criterion 2 (a check of the draft against the mock) runs the engine through this plan's kit (`POST /api/agent-loop-test/grounding`, body `{projectId: string, runId: string, targetPath: string, overlay?: Record<string, string>}`, reply the `GroundingResult` or `{failure}`) until AGL-17 exists, so it needs AGL-16 on main (`plans/DECISIONS.md` entry "2026-11-16 — AGL-16 — Navigator decision: test seam for the four criteria, and the AGL-19 dependency"). Its mock scripts must match the formats of section 4.1 (markers, the extract and judge JSON, claim index = global position, passages by `path` and `offset` from the search, at most `RETRIEVAL_LIMIT` retrieved per claim, at most `JUDGE_BATCH_SIZE` claims per judge call). Section 7 records this.
- CEX-06 (no plan): reads `logs/grounding/<path>.json` and compares its `contentHash` with the file's `sha256:`. The engine's disk-checked hash is the file's hash, so the comparison holds for accepted text. The overlay hash is for a draft the run proposed, which is what the unit says.
- AGL-15 (no plan): no shared file (section 7).

## 7. Other in-pipeline plans

Plans with status `draft` or `planned` (only one, found by `grep -l "^status: \(draft\|planned\)" plans/*.md`), and units with no plan that touch the same area.

| Plan or unit | Status | Files it changes | Change it makes | Why AGL-16 and it are correct in either order |
|---|---|---|---|---|
| `plans/TRG-14.md` | planned (line 3) | `apps/web/src/app/features/tool-registry/**`, `apps/web/package.json`, `package-lock.json` (its scope line 95 keeps `apps/api/**` unchanged) | Web editor and actions only; adds two web dependencies | No file in common with AGL-16. The lock file change adds only web packages; AGL-16 adds none. Either order is correct |
| AGL-15 (unit, no plan) | not planned | e2e accept-change step (unit scope line 17) | e2e spec only | No file in common. `parallel_with` AGL-16 (unit line 8) |
| AGL-17 (unit, no plan) | not planned; `blocked_by` AGL-16 | `agent-run.ts`, `agent-runs.service.ts`, `tools/builtin-tools.ts` (`check_grounding`), transcript kinds, events, and the accessors of section 6 | Wires the engine into the run | Must come after AGL-16 by its `blocked_by`. The AGL-16 files it imports are the engine's entry, which this plan creates |
| AGL-19 (unit, no plan) | not planned; `blocked_by` AGL-16 (`dc5f898`) | `examples/nonfiction/drafts/**`, `e2e/fixtures/mock-openai/scenarios/**`, `sources/outline.md` of the sample | Sample draft and mock scripts for extract and judge; its criterion 2 runs the engine through the AGL-16 kit | Must come after AGL-16 by its `blocked_by` (the engine and the kit must be on main). No file in common with AGL-16 (its tests use temp scenario files). Its scripts must match the formats of section 4.1 |
| AGL-18 (done, `ba23679`) | done | `apps/web/**` | Badges | Web only; reads the result shape the engine produces (no change) |
| AGL-12 (done, `57aebf6`) | done | `tools/write-overlay.ts`, `tool-run.ts`, `agent-run.ts` (`finish`, deps) | Overlay and run-end propose | AGL-16 reads `contentOf` and writes nothing in those files. Its expectation of an accessor in `agent-run.ts` moves to AGL-17 (section 6) |
| AGL-13 and AGL-14 (done) | done | `agent-run.ts` (`runCall`, `diffPreviewOf`, `provenanceOf`), `tools/output-routing.ts` | Routed outputs, diffs | AGL-16 uses none of them |
| AGL-04 and AGL-05 (done) | done | `transcript-*.ts` | Transcript kinds, restart state | AGL-16 writes no transcript line, so their rule ("a unit that adds a transcript kind extends `TranscriptRun`", AGL-05 line 112) is not triggered |
| PST-13 and AGL-10 (done) | done | `search.service.ts`, `search-index.ts`, `builtin-tools.ts` (`search_notes`) | Search API | AGL-16 calls `search` unchanged with `scope: ['sources']` |
| PLT-12 (done) | done | `e2e/fixtures/mock-openai/**` | Mock matchers | AGL-16 uses the matchers as they are (`lastMessageContent`, `endpoint`, `stream` reply) |

## 8. Open points

Revision 2 settles points 2 to 8 in the plan. Point 1 is settled by the Navigator (revision 3). None of them changes an acceptance criterion's text or its test.

1. **Test seam before AGL-17 (settled, Navigator).** Settled by `plans/DECISIONS.md` entry "2026-11-16 — AGL-16 — Navigator decision: test seam for the four criteria, and the AGL-19 dependency" (option b): the four criterion tests use a test-only HTTP kit in the AGL-02 style, `apps/api/test/agent-loop-grounding.kit.ts`, under `api/agent-loop-test`, never in the composed app; `GroundingEngine` is in `AgentLoopModule`'s `exports`; `create-test-app.ts` is unchanged and the kit goes through `TestAppOptions.modules`; `TestApp.nest` is not used. The unit's criteria heading (line 26) now names the harness (`dc5f898`). AGL-19 is blocked by AGL-16. The plan applies this in sections 3, 4.2 (steps 1 and 3) and 5. One addition the decision does not name: `openHarness` gains an optional `modules` option (section 3), because it boots the app itself and its cookie handshake needs `SetupAuthModule`; the test therefore passes the composed modules plus the kit.
2. **Judge reply malformed or incomplete (settled).** The same rule as extract: `MODEL_ATTEMPTS` = 3, then `GroundingFailure(JUDGE_FAILED_MESSAGE)`; a reply that does not give exactly one verdict per batch claim is a failed attempt. Reason: unit decision 1 says "the same two retries", so the module's retry count is the rule for model JSON; a fallback to `unsupported` would show a model failure as an author-facing verdict. Small choice, no criterion depends on it.
3. **A `supported` or `weak` verdict that cites no passage (settled).** Downgraded to `unsupported` with `UNCITED_REASON`. Reason: unit decision 3 says supported and weak verdicts "must cite" a retrieved passage; AGL-20 criterion 2 needs every supported or weak verdict to cite one. This is the strict reading of the unit, not a new rule.
4. **Span validation (settled).** `extractReplySchema` checks the span as the contract does (`grounding.ts` lines 23 to 26: integers, at least 0) and nothing more. A span outside the text, or with `start > end`, is kept. Reason: the contract is the shape owner (AGL-01 D12); a stricter check would make a valid contract result a failed attempt, with no criterion or downstream unit needing it.
5. **How AGL-17 shows a failed or aborted check (settled for AGL-16: not its decision).** AGL-16 throws `GroundingFailure` (readable text) and lets the Project store and provider errors propagate (section 4.1). How a failure appears on the card, the run end or the events is AGL-17's plan's choice; AGL-17's planner must settle it. Nothing in AGL-16 changes with the answer.
6. **Project not active when a check runs (settled).** No special case: the check fails with the Project store's not-active refusal, and no artefact is written. Reason: module line 54 allows only Project store writes to `logs/`, and the store refuses a project that is not active; no criterion or downstream unit needs a check of an inactive project.
7. **Long drafts (settled).** No chunking. A draft too long for the provider fails at the provider, or as malformed JSON after three attempts (point 2). Reason: the unit says one extract call per check; chunking would be scope no criterion needs (YAGNI). A9 stays ASSUMED.
8. **PLT-12 in `blocked_by` (settled).** No change. PLT-12 is `done` on main, so a blocker entry would change nothing; `blocked_by` stays AGL-10, AGL-12.

## 9. Review parts

One part. The plan is small: one engine file, one prompts file, one module registration and export, one new test kit, one additive harness option, four tests. The kit and the harness option are in step 1, so the step list is unchanged.

| Part | Steps | Tests (criteria) |
|---|---|---|
| Part 1: grounding engine and its criteria | Steps 0 to 6 (section 4.2) | G1 (criterion 1), G2 (criterion 2), G3 (criterion 3), G4 (criterion 4) |
