---
id: AGL-23
status: planned
---
# AGL-23 plan — research gate: the phase checklist on main

Unit `units/AGL-23-research-gate.md` (module Agent loop, phase:research, M7; the gate of `phase:research`). Planned on `main` at 3611904, with a clean working tree. Revision 1, planner. Revision 2, reviser, checked on `main` at e922ded (no code changed since 766479c): open point 1 settled and the unit heading (line 16) amended as section 6 records; condition 4 quoted as DECISIONS records it; the copied refusal constant traced to its source; AC3's two apps stated; AGL-24's file list completed; the DECISIONS fact of section 7 corrected; section 8 lists each step and test. Status stays draft until the orchestrator sets `planned`. The unit has no Why, Decisions, Scope or Demo section, so its decisions come from the module, `units/README.md` and the plans of its three blockers (AGL-20, AGL-21 and AGL-22, all `done` on main).

## 1. Decisions this plan follows

### Settled by the unit, the module, the README and the blockers

- **Gate.** Merging AGL-23 closes Agent loop `phase:research`. Source: unit line 14; `units/README.md` line 117 (the phase row names AGL-23 as the gate and says it does not wait on AGL-26); README line 69 (a phase closes when its gate is merged). Nothing waits on AGL-23: `unblocks: []` (unit line 9).
- **Blockers.** `blocked_by: [AGL-20, AGL-21, AGL-22]` (unit line 7). All three are on main and `done` (`plans/AGL-20.md`, `plans/AGL-21.md` and `plans/AGL-22.md`, line 3 of each). Each of the three units names AGL-23 in its `unblocks` (line 9), so the two sides agree. `plans/QUEUE.md` line 4 lists AGL-23 as available.
- **Criteria.** Four criteria, unit lines 17 to 20, all unticked. Each gets one test (section 4). Each test name carries the criterion's wording word for word, with the `ACn:` prefix that AGL-21 and AGL-22 use. Criterion 4 reads "until it is accepted into `sources/`" (unit line 20). AGL-22's line 26 reads "until accepted", so the wording of AGL-23 is the one used.
- **No production change.** The behaviour the gate checks exists on main. The research family is added only when `settings.research.enabled` is true (`apps/api/src/modules/agent-loop/agent-runs.service.ts` lines 77 to 79, in `start`). `ToolRun` offers only the tools of enabled families (`tools/tool-run.ts` line 91). `web_search` is offered only when research is on and an endpoint is set (`agent-tools.service.ts` line 112). `fetch_page` is in the built-in list (`tools/builtin-tools.ts` line 420), with the refusals, caps and untrusted mark of `tools/fetch-page.ts` and `tools/fetch-address.ts`. Grounding reads `sources/` only (`grounding-engine.ts` line 112; `modules/agent-loop.md` line 56). The gate proves these and changes none of them.
- **Testing.** External behaviour only. The composed app with the mock model is the primary seam. Research tests use a local HTTP server and a SearXNG-shaped stub, never the internet (`modules/agent-loop.md` lines 61, 62 and 64; `units/README.md` line 141).
- **Test seam (Navigator, option A).** The test-only kit `apps/api/test/agent-loop-fetch.kit.ts` gives `FetchPolicy` an allowance for the stub's own `127.0.0.1` address and port. Tests boot `[...COMPOSED_MODULES, kit]` through `TestAppOptions.modules` (`apps/api/test/create-test-app.ts` line 13). Source: `plans/DECISIONS.md` lines 7203 to 7210. Condition 4 reads "AGL-23 uses the same kit" (line 7206). The kit is the allowance and the stub together: `agentLoopFetchKitModule` and `startPageStub` are in the one kit file, whose header says "AGL-23 imports this file and does not copy it" (`agent-loop-fetch.kit.ts` line 12; `plans/AGL-22.md` P17, line 47). Conditions 1 to 3, written for AGL-22, are kept here too: (1) the kit is never in the composed app, and this plan adds no production file; (2) the allowance stays narrow (`isAllowedHop` in `tools/fetch-page.ts` lines 97 to 106); (3) the literal refusal rows run without the kit. Condition 5 is the heading of AGL-22 only; this unit's heading follows the same precedent (next bullet).
- **Kit rule (AGL-10).** A test-only kit is allowed only where the unit's own heading names it: `plans/DECISIONS.md` lines 4283 to 4284 and 5419 (the AGL-16 entry repeats the rule). `units/README.md` line 57 says the heading names the seam when it differs from the module default. The heading of AGL-23 (unit line 16) named no seam, so it is amended to name the test-only allowance, as condition 5 did for AGL-22 under the AGL-16 precedent (DECISIONS line 5412). Section 6 gives the old and new text. With it, AC2 to AC4 may use the kit.

### Small decisions the planner makes

Simplest option in each case. Recorded here, not in `plans/DECISIONS.md`.

- **P1. One new test file.** `apps/api/test/agent-loop-research-gate.test.ts`, with one `it` per criterion, named AC1 to AC4. It follows the pattern of `agent-loop-grounding-gate.test.ts` (AGL-20).
- **P2. Helpers copied; the kit imported.** The helpers of `agent-loop-fetch-page.test.ts` (lines 46 to 187) and the SearXNG-shaped stub of `agent-loop-web-search.test.ts` (lines 188 to 240) are not exported. The new file copies them and imports nothing from another test file, as `agent-loop-grounding-gate.test.ts` does (its header comment, line 30). It imports `agentLoopFetchKitModule`, `startPageStub` and `FETCHED_SENTENCE` from `agent-loop-fetch.kit.ts`, because condition 4 requires the same kit and the kit's header says "AGL-23 imports this file and does not copy it" (lines 10 to 12). Exporting the helpers from merged test files would change those files. A new helper kit would need its own heading parenthetical under the AGL-10 rule.
- **P3. Default caps.** The kit is booted with `allow` only, so the default caps apply (1 MiB and 15 s, `fetch-page.ts` lines 30 to 34). The gate has no cap test; AGL-22's AC2 covers the caps.
- **P4. Criterion 1 names only the two research names.** The test asserts that `web_search` and `fetch_page` are absent, not the exact tool list. `plans/AGL-24.md` (status `planned`, parallel with AGL-23) adds three `compile` names to a normal start (its D4, line 16; its line 140 says the same for this gate). An exact list would break when AGL-24 lands.
- **P5. Criterion 2 is one run.** One agent run calls `web_search` on turn 0, `fetch_page` on turn 1, and answers on turn 2. The mock's `turnIndex` matcher (`e2e/fixtures/mock-openai/server.mjs` lines 117 and 118) picks each turn. `web_search` uses `globalThis.fetch` (`tools/web-search.ts` line 47) and no refusal, so the search needs no allowance.
- **P6. Criterion 3 in two parts.** Part (a) runs in the composed app without the kit, with one run per refused address (AGL-22 does the same, `agent-loop-fetch-page.test.ts` lines 217 to 221, because the third consecutive invalid call withdraws the tool for the run, `tools/tool-run.ts` line 28). The rows are: `http://127.0.0.1:<page port>/page`, `http://localhost:<page port>/page`, `http://[::1]:<page port>/page`, `http://10.0.0.1/`, `http://192.168.1.1/`, `http://100.64.0.1/`, `http://[fd7a:115c:a1e0::1]/`, and `http://host.docker.internal:<page port>/page`. Part (b) runs in the kit app: a `localhost` row (the allowance admits no name) and the redirect row `http://127.0.0.1:<page port>/redirect-private`, which the stub sends to `[fd7a:115c:a1e0::1]/page`. The full thirteen-row matrix stays in AGL-22's AC1.
- **P7. Criterion 4 repeats AGL-22's AC3 flow.** Six steps, as in `agent-loop-fetch-page.test.ts` lines 294 to 398, with the distractor `sources/other.md` of that test. A gate proves the checklist on main, so the flow runs again rather than being cited.
- **P8. Intents do not contain each other.** The mock matches `lastMessageContent` by substring (`server.mjs` lines 124 and 125). Each run's intent is distinct, and no intent is a substring of another.
- **P9. No demo step.** The unit has no `## Demo` section. Other gates have none either: `units/AGL-15-pending-writes-gate.md`, `CEX-09`, `CEX-15`, `GNP-05`, `GRR-08`, `MPR-11`, `TRG-05` and `TRG-11` (checked by grep of `units/`). The plan adds no demo.
- **P10. Who ticks.** The implementer changes only the test file. The orchestrator ticks `units/AGL-23-research-gate.md` lines 17 to 20 and sets this plan's status after the review, as AGL-22's commit `025ab14` did.

## 2. Files to create or change

Only this path changes.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/test/agent-loop-research-gate.test.ts` | new | Four tests, AC1 to AC4 (section 4). Helpers copied from two test files (P2). Imports the kit `agent-loop-fetch.kit.ts` and the transcript kit `agent-loop-transcript.kit.ts`. |

Unchanged on purpose: all of `apps/api/src` (no production gap, section 1); `apps/api/test/agent-loop-fetch.kit.ts` (used as it is); `agent-loop-fetch-page.test.ts`, `agent-loop-web-search.test.ts`, `agent-loop-run.test.ts` and `agent-loop-grounding-gate.test.ts`; `apps/api/test/create-test-app.ts`; `apps/api/src/app.module.ts` (the kit is never composed, condition 1); `packages/contracts`; `apps/web`; `units/`; `modules/`; `plans/` other than this file; `plans/QUEUE.md`.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`. Create branch `unit/AGL-23` from `main`, and work in a worktree. Record `node -v` (v26.x) and `npm -v` beside each result (v26.13.0 and 11.20.0 were present when this plan was written). Do not push. Do not change `units/`, `modules/` or `plans/`.

1. **Worktree.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/AGL-23 -b unit/AGL-23 main`. Expected: the new worktree is on `unit/AGL-23`.
2. **Install and build.** In the worktree: `npm ci`, then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Expected: exit 0.
3. **Baseline.** From `apps/api`: `npx vitest run test/agent-loop-*.test.ts`. Expected: every file passes. Record the file and test counts.
4. **The test file.** Create `apps/api/test/agent-loop-research-gate.test.ts` as section 4 describes, with the helpers of P2. Then `npx prettier --write apps/api/test/agent-loop-research-gate.test.ts`. Expected: the file is reported as written.
5. **Run on the code of main.** From `apps/api`: `npx vitest run test/agent-loop-research-gate.test.ts`. Expected: four tests pass, because no production code changes. Record the output. If a test fails, stop and report the test and its output to the orchestrator. Do not change production code or the unit to make it pass.
6. **Gates.** From the root: `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api/test/agent-loop-research-gate.test.ts`, then `npm test -w @bbartolome/scriba-api`. Expected: each exits 0.
7. **Agent-loop suite.** From `apps/api`: `npx vitest run test/agent-loop-*.test.ts`. Expected: the same files pass as in step 3, and the test count is the step 3 count plus 4.
8. **Scope and commit.** `git status --short` lists only the test file. Condition 1 check: `grep -rn "agent-loop-fetch.kit" apps/api/src` prints nothing. Then `git add apps/api/test/agent-loop-research-gate.test.ts` and commit with the message `test(AGL-23): research gate tests for the phase checklist`. Expected: one commit on `unit/AGL-23`. Record the hash.
9. **Mutation checks.** On the committed tree, make each change below, run `npx vitest run test/agent-loop-research-gate.test.ts` from `apps/api`, record the failing test, and restore with `git checkout -- <path>`. Expected after each restore: `git status --short` is empty.
   - M1 (refusal off): `isRefusedAddress` in `tools/fetch-address.ts` (line 73) returns `false`. Expected: AC3 part (a) fails at its first row.
   - M2 (research family always on): in `agent-runs.service.ts` `start` (lines 77 to 79), `'research'` is always included. Expected: AC1 fails on run 1.
   - M3 (fetched text on disk before acceptance): in `agent-runs.service.ts` line 165, the `propose` function also writes `input.content` to `input.path` on disk when the path starts with `sources/`, with the write method of the Project store's files service (find it by grep under `apps/api/src/modules/project-store`). Expected: AC4 fails at its check after the write run, because the file exists before acceptance.
   - M4 (allowance admits names): `isAllowedHop` in `tools/fetch-page.ts` (lines 97 to 106) also admits `url.hostname === 'localhost'`. Expected: AC3 part (b) fails at its `localhost` row.
10. **Record.** Store the Node and npm versions and each command's output with its exit code. A criterion is marked passed only when its pass condition in section 4 holds. The orchestrator ticks the unit and sets the plan's status (P10).

## 4. Acceptance criteria and tests

Test file: `apps/api/test/agent-loop-research-gate.test.ts`, with four `it` blocks named AC1 to AC4. Run one with `npx vitest run test/agent-loop-research-gate.test.ts -t "AC<n>"` from `apps/api`. Each test opens its own app with the mock model and its own temp library through `openHarness` (`agent-loop-transcript.kit.ts` line 87); AC3 opens two, one per part, in turn. Each test closes its apps and its stubs. A stub starts before the app that needs its port.

Shared constants and helpers (copied per P2): `REFUSED_LOCAL` and `REFUSED_REDIRECT` (`agent-loop-fetch-page.test.ts` lines 46 to 49; the texts are `REFUSED_FIRST` and `REFUSED_REDIRECT` of `fetch-page.ts` lines 60 to 63, which are not exported), the step builders `fetchStep`, `writeStep`, `AFTER_TOOL`, `extractStep` and `judgeStep` (`agent-loop-fetch-page.test.ts` lines 64 to 108), `withStream`, `runIntent`, `enableResearch`, `toolNamesOf`, `lastTextOf`, `resultOf`, `checkDraft` and `judgeTextsOf` (lines 111 to 187), `allowed(port)` as a kit call with `allow` only (P3), and `startSearxngStub()` (`agent-loop-web-search.test.ts` lines 188 to 240). The text step of AC1 is `{match: {endpoint: 'chat'}, reply: {kind: 'stream', deltas: ['Done.']}}`, as `TEXT_STEPS` in that file (line 242).

| Criterion (unit line) | Test and seam | Command | Pass condition |
|---|---|---|---|
| "With the setting off, the model request contains no research tools." (line 17) | `AC1: With the setting off, the model request contains no research tools.` Composed app, no kit (`modules` not set), mock model, SearXNG-shaped stub. | from `apps/api`: `-t "AC1"` | Run 1 uses the default settings. Then `POST` to `AGENT_SETTINGS_ROUTE` with `{research: {searchEndpoint: <stub url>}}` (`enabled` stays false), and run 2. The two chat requests (`requestsOf`) each have neither `web_search` nor `fetch_page` in `tools`. The stub received no request. |
| "With it on, a search and a fetch run against a local test server." (line 18) | `AC2: With it on, a search and a fetch run against a local test server.` Kit app with `allow` for the page stub's port (`modules: [...COMPOSED_MODULES, agentLoopFetchKitModule({allow: {address: '127.0.0.1', port}})]`), SearXNG-shaped stub, mock model with three turns. | `-t "AC2"` | One run. `POST` settings `{research: {enabled: true, searchEndpoint: <stub url>}}` first. The stub received one request with `q` = `learning plateaus` and `format` = `json`. Three chat requests were received. The tool messages of the second contain both result titles (`Learning plateaus explained`, `Why progress stalls`). The tool messages of the third contain `FETCHED_SENTENCE` and `"untrusted":true`. The page stub's `/page` was hit once. The last event is `run-ended`. |
| "Fetching loopback, private, tailnet or `host.docker.internal` addresses is refused, including after a redirect." (line 19) | `` AC3: Fetching loopback, private, tailnet or `host.docker.internal` addresses is refused, including after a redirect. `` Part (a): composed app, no kit. Part (b): kit app with `allow` for the page stub's port. | `-t "AC3"` | Part (a): each of the eight runs (one per row of P6) has `REFUSED_LOCAL` in its tool message, and the page stub's `/page` has zero hits. Part (b): the `localhost` run has `REFUSED_LOCAL`; the redirect run has `REFUSED_REDIRECT`; `/page` has zero hits and `/redirect-private` has one. |
| "Fetched text never appears as grounding evidence until it is accepted into `sources/`." (line 20) | `` AC4: Fetched text never appears as grounding evidence until it is accepted into `sources/`. `` Kit app with `allow`, `prepare` writes `drafts/claim.md` (`Harbour traffic doubled in 1900.`) and `sources/other.md` (`Unrelated oats and barley.`), extract and judge steps as AGL-22's AC3. | `-t "AC4"` | Steps as in P7. After the fetch run and after the write run, before acceptance: the claim has no `passage` and is `unsupported`; no judge request carries the word `oats`; `sources/fetched.md` is not on disk. After the author accepts the pending change (`PROJECT_PENDING_ACCEPT_ROUTE`), the file is on disk with `FETCHED_SENTENCE` and the next check is `supported` with passage `sources/fetched.md`, offset 0, and a judge request carries that path. |

Notes on the four tests:

- **AC1** needs no kit. Its second run shows that the switch, not the endpoint, keeps the tools out.
- **AC2** uses turn-indexed steps: `{match: {endpoint: 'chat', turnIndex: 0}, reply: {kind: 'toolCalls', calls: [{name: 'web_search', argumentChunks: ['{"query":"learning plateaus"}']}]}}`, then the same shape for `fetch_page` with `{"url": "http://127.0.0.1:<page port>/page"}` at `turnIndex: 1`, then a text step at `turnIndex: 2`. The search is not refused, so the allowance covers only the fetch.
- **AC3** part (a) runs with `{research: {enabled: true}}` and no endpoint, as AGL-22's AC1 does. Each run's intent is a distinct string (P8).
- **AC4** follows AGL-22's AC3 steps (1) to (6). The judge verdict is scripted as `supported` with a passage in `sources/fetched.md`, so only the retrieval decides whether the verdict stands.

## 5. Downstream and parallel agreement

- **phase:research gate.** AGL-23 is the gate (`units/README.md` line 117), and no unit's `blocked_by` names it. AGL-26 (`units/AGL-26-research-no-endpoint.md`, `blocked_by` AGL-21 and AGL-22) may still be open when this gate closes, which the README allows. AGL-23 asserts no exact tool list (P4), so AGL-26's assertion of the list cannot conflict with it.
- **AGL-24 (parallel).** The two units name each other in `parallel_with` (`units/AGL-23-research-gate.md` line 8; `units/AGL-24-compile-tools.md` line 8). AGL-24's plan (`status: planned` on main; code on `unit/AGL-24`, approved, its rebase onto main pending, DECISIONS lines 7259 and 7272) edits `agent-runs.service.ts` lines 77 to 79, `agent-tools.service.ts`, `agent-loop.module.ts`, `agent-loop-tools.test.ts` and the lists of `agent-loop-run.test.ts`, and adds `tools/compile-tools.ts` and `agent-loop-compile.test.ts` (`plans/AGL-24.md` section 2, lines 43 to 49). AGL-23 changes none of these files, so this plan cannot create a rebase conflict with AGL-24. The compile names in the request are covered by P4, and `plans/AGL-24.md` line 140 agrees.
- **AGL-21 and AGL-22 (done).** This plan reads their tests and their kit and changes none of them. It uses the kit's allowance and stub as they are, and AGL-22's tool name `fetch_page` and family `research` unchanged.
- **AGL-20 (done).** AC4 uses the grounding route (`packages/contracts/src/agent-loop/routes.ts` line 10) and the extract and judge markers (`apps/api/src/modules/agent-loop/grounding-prompts.ts` lines 8 and 9). `plans/AGL-20.md` line 136 notes that criterion 4 depends on the retrieval scope `['sources']`, which AGL-20 leaves unchanged.
- **Unit metadata.** The `unblocks` lines of AGL-20, AGL-21 and AGL-22 (line 9 of each) name AGL-23, and AGL-23's `blocked_by` names all three. No unit file needs a change for this plan.

## 6. Open points

1. **The heading of the acceptance criteria (the AGL-10 rule). Settled by the reviser.** Sources: condition 4 of the AGL-22 Navigator decision (`plans/DECISIONS.md` line 7206: AGL-23 uses the same kit); the AGL-10 rule (lines 4283 to 4284; repeated at line 5419): a kit only where the unit's own heading names it; `units/README.md` line 57; the precedents of AGL-16 (line 5412) and AGL-22 (lines 7212 to 7219). Applied in `units/AGL-23-research-gate.md` line 16 (uncommitted, for the orchestrator to record):
   - Old: `## Acceptance criteria (the phase checklist)`
   - New: `## Acceptance criteria (the phase checklist; local test servers, never the internet; the successful fetches reach the page stub through a test-only allowance for its own address and port)`
   - Lines 17 to 20 are byte-identical (md5 of the four lines before and after: 84bec16a32d7f067f98fac7267bdfd9d). No criterion text and no module text changes.
   - YAGNI: not one of the four actions; it is the heading change that condition 4 and the AGL-10 rule direct, as condition 5 did for AGL-22.

No point is open.

## 7. Facts checked and facts assumed

Checked by the planner with read-only commands (`grep`, `sed`, `git log`, `git status`, `git branch`, `git worktree list`) on `main` at 3611904. The planner ran no build and no test. It ran `node -v` (v26.13.0) and `npm -v` (11.20.0).

Unit, module and README files:
- `units/AGL-23-research-gate.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); title line 12; gate sentence line 14; heading line 16; criteria lines 17 to 20, unticked. No Why, Decisions, Scope or Demo section.
- `units/AGL-22-fetch-page.md`: heading line 23 with the allowance; criteria lines 24 to 26 ticked; `unblocks` line 9 names AGL-23.
- `units/AGL-20-grounding-gate.md` and `units/AGL-21-web-search.md`: `unblocks` line 9 names AGL-23.
- `units/AGL-24-compile-tools.md` line 8: `parallel_with` names AGL-23.
- `units/AGL-26-research-no-endpoint.md`: `blocked_by` line 7 (AGL-21, AGL-22), `parallel_with: []` line 8.
- `units/README.md`: line 56 (Demo), line 57 (heading parenthetical), line 69 (gate rule), line 117 (`phase:research` row), line 141 (testing).
- `modules/agent-loop.md`: lines 11, 51, 52, 56, 57, 61, 62, 64 and 83.
- `plans/QUEUE.md` line 4: AGL-23 "available: yes".

Plans:
- `plans/AGL-22.md`: status line 3 (done); section 2 kit row (line 62); P17 (line 47); P18 (line 48); section 4 (lines 99 to 118); section 5 AGL-23 bullet (lines 122 to 126); section 6 open point 1 (lines 140 to 147).
- `plans/AGL-21.md`: status line 3 (done); section 4 (the AC1 and AC3 tests, the stub).
- `plans/AGL-20.md`: status line 3 (done); line 136 (the AGL-23 note).
- `plans/AGL-24.md`: status line 3 (planned); D4 (line 16); line 140 (the parallel note); section 2 (lines 43 to 49).
- `plans/PLT-02.md`: the section layout that this plan follows.

`plans/DECISIONS.md`:
- Lines 4280 to 4285: the AGL-10 seam decision; the kit rule at lines 4283 and 4284.
- Lines 5407 to 5420: the AGL-16 precedent (the test-only kit, the boot list, the heading); the rule at line 5419.
- Lines 7093 to 7099: the AGL-26 split, and the note for the AGL-22 planner.
- Lines 7137 to 7142: the point for the Navigator.
- Lines 7203 to 7210: the Navigator decision (option A, conditions 1 to 5 at line 7206).
- Lines 7212 to 7219: the heading change of AGL-22.
- Lines 7265 to 7268: AGL-22 on main at 025ab14; gates passed on 766479c.
- Entries that name AGL-23 (`grep`): lines 7095 and 7097 (AGL-26 split), 7140 (option A: AGL-23 must use the same kit), 7206 (condition 4), 7219 (AGL-23's heading named no kit), 7270 (AGL-23 available). None is a decision about AGL-23 other than condition 4.

Code, with file and line:
- `apps/api/src/modules/agent-loop/agent-runs.service.ts`: `start` 74 to 86, families 77 to 79; `launch` 128; settings read 130; `tools: this.tools.startRun({` 149 and `searchEndpoint` 153; `propose` 165.
- `apps/api/src/modules/agent-loop/agent-tools.service.ts`: `fetchPolicy` parameter 57; `builtinTools` call with `fetchPolicy ?? DEFAULT_FETCH_POLICY` 66; `searchEndpoint !== undefined` 112; the `web_search` push 115.
- `apps/api/src/modules/agent-loop/agent-run.ts`: `flushWrites` 498; `this.deps.propose` 504.
- `apps/api/src/modules/agent-loop/tools/tool-run.ts`: constructor 85; the family filter, `families.has`, 91.
- `apps/api/src/modules/agent-loop/tools/builtin-tools.ts`: `builtinTools` 130; `fetchPolicy` parameter 135; `fetchPageDefinition(fetchPolicy)` 420.
- `apps/api/src/modules/agent-loop/tools/web-search.ts`: `globalThis.fetch` 47.
- `apps/api/src/modules/agent-loop/tools/fetch-page.ts`: `FetchPolicy` 23 to 28 (`allow` line 27); `DEFAULT_FETCH_POLICY` 30 to 34; `FETCH_POLICY` 37; `NOTICE` 56; refusal texts 61 and 63; `isAllowedHop` 97 to 106; the allowance check at the hop 137 to 139; `fetchPageDefinition` 319 (name 324, family 325); `untrusted: true` 337.
- `apps/api/src/modules/agent-loop/tools/fetch-address.ts`: `RefusedAddressError` 45; `isRefusedAddress` 73; `isRefusedName` 81; `checkedLookup` 91.
- `apps/api/src/modules/agent-loop/tools/tool-types.ts`: `ToolFailure` 29 to 34; `ToolContext` 53 to 57.
- `apps/api/src/modules/agent-loop/grounding-engine.ts`: `scope: ['sources']` 112.
- `apps/api/src/modules/agent-loop/grounding-prompts.ts`: `EXTRACT_MARKER` 8; `JUDGE_MARKER` 9.
- `apps/api/src/app.module.ts`: `COMPOSED_MODULES` 21 to 30.
- `apps/api/test/create-test-app.ts`: `modules` option, line 13.
- `apps/api/test/agent-loop-transcript.kit.ts`: `HarnessOptions` 65 to 72 (`modules` 71); `openHarness` 87; `post` 149; `observe` 169; `startRun` 174; `readUntilEnded` 184; `chatBodies` 214; `requestsOf` 219 (in arrival order); `toolMessagesOf` 273.
- `apps/api/test/providers-client.kit.ts`: `recordsOf` 61, "in arrival order" on line 60.
- `apps/api/test/agent-loop-fetch.kit.ts`: header comment 10 to 12 ("AGL-23 imports this file and does not copy it", line 12); `agentLoopFetchKitModule` 13 to 29; `FETCHED_SENTENCE` 31; `PageStub` 50 to 54; `startPageStub` 56.
- `apps/api/test/agent-loop-fetch-page.test.ts`: constants and helpers 46 to 187; AC1 tests 189 and 232; AC2 262; AC3 294; D1 400; D5 509.
- `apps/api/test/agent-loop-web-search.test.ts`: `RESEARCH_NAMES` 39; `startSearxngStub` 188 to 240 (function at 196); `TEXT_STEPS` 242; AC1 255; D1 292; AC3 313.
- `apps/api/test/agent-loop-grounding-gate.test.ts`: header comment on helper copies, line 30.
- `apps/api/test/agent-loop-run.test.ts`: comment on web_search, line 382; the research-on list 391 to 398 (`fetch_page` at 394).
- `packages/contracts/src/agent-loop/settings.ts`: defaults 8 to 12 (`research.enabled` at 11); `agentSettingsSchema` 16 to 23 (`searchEndpoint` at 21); update schema 28 to 34 (`searchEndpoint` at 31).
- `packages/contracts/src/agent-loop/routes.ts`: `AGENT_RUNS_ROUTE` 3; `AGENT_GROUNDING_ROUTE` 10; `AGENT_SETTINGS_ROUTE` 11.
- `packages/contracts/src/project-store/routes.ts`: `PROJECT_PENDING_ROUTE` 36; `PROJECT_PENDING_ACCEPT_ROUTE` 38.
- `e2e/fixtures/mock-openai/server.mjs`: `turnIndex` 117 and 118; `lastMessageRole` 122 and 123; `lastMessageContent` 124 and 125.

Git:
- `git log 766479c..main` shows four commits (`025ab14`, `834fb5c`, `3090f06`, `3611904`), and each changes only `plans/`, `units/` or `plans/QUEUE.md`. No code changed after 766479c.
- No `unit/AGL-23` branch and no AGL-23 worktree exist. `unit/AGL-24` has a worktree at `scriba-prototype-wt/AGL-24`, unrelated to this plan's files.
- `plans/AGL-23.md` did not exist before this plan, and no other file names `agent-loop-research-gate`.

Assumed, not checked:
- The AGL-20, AGL-21 and AGL-22 test suites pass on main now. Their gates passed at 766479c (section 7, DECISIONS 7265 to 7268), and no code has changed since. Not re-run here.
- The mock records each tool-call reply as an assistant message in the next request, so `turnIndex` 0, 1 and 2 select the three turns of AC2. The matcher was read (`server.mjs` lines 117 and 118); the recording of tool-call messages was not read.
- The `localhost` and `host.docker.internal` refusals happen before any connection (AGL-22's AC1 rows b and m). Their tests were not re-run.
- The SearXNG-shaped stub on `127.0.0.1` is reachable from the test process (AGL-21's AC3). Not re-run.
- Retrieval for the claim in AC4 does not pick up `sources/other.md`, as in AGL-22's AC3, which passed at 766479c.

## 8. Review parts

One part, **Part 1: the research gate tests.** Steps 1 to 10 of section 3 (worktree, install and build, baseline, the test file, its run, the gates, the agent-loop suite, scope and commit, mutations M1 to M4, record) and the four tests AC1, AC2, AC3 (parts a and b) and AC4 of section 4. Reviewed on the four tests against section 4, on the helper copies (P2), on the kit used as it is (condition 4), and on condition 1 (the kit is not in `apps/api/src`).
