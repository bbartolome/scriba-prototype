---
id: AGL-21
status: planned
---
# AGL-21 plan — `web_search` against a SearXNG-compatible endpoint, behind the research switch

Unit `units/AGL-21-web-search.md` (module Agent loop, phase:research, M7). Planned on `main` at dd1b4f1. Revision 2, reviser, checked on `main` at c78db0f. Corrections of revision 2: criterion 2 ("With research on and no endpoint, only `fetch_page` is offered.") moved word for word to the new unit `units/AGL-26-research-no-endpoint.md` (commit a44b9cf, a split; the unit file now has the change note "Moved to AGL-26 by revision on 2026-11-20"); the AC2 test is replaced by the decision test D1 (endpoint gate, section 4); mutation M1 now targets D1; open points 1 and 2 are settled (section 6); section 8, "Review parts", is new. AGL-21 now has two criteria (unit lines 24 and 26).

## 1. Decisions this plan follows

Settled by the unit and the module:

- **Research switch.** `agent.research.enabled` defaults to `false`. With it off, no research tool is offered. Source: unit line 18; `units/AGL-06-agent-settings.md` line 15 (default); `modules/agent-loop.md` line 57 (the section). On `main` the family is already gated: `apps/api/src/modules/agent-loop/agent-runs.service.ts` lines 77 to 79 add `research` only when enabled, and `ToolRun` offers only tools of enabled families (`tools/tool-run.ts` lines 88 to 93). So criterion 1 holds today and must still hold when `web_search` lands.
- **`web_search` is offered only when research is on and `searchEndpoint` is set.** There is no default endpoint. Source: unit line 19; `plans/AGL-06.md` line 90 (the rule belongs to this unit).
- **Request and reply.** `GET <endpoint>?q=<query>&format=json`, no key. The reply's `results[].{title, url, content}` are read. Source: unit line 19. Keyed search APIs are out of scope. Source: unit line 19.
- **No refusal on the search endpoint.** The endpoint is author-configured and exempt from `fetch_page`'s private-network refusal. This unit has no refusal, so the exemption holds by construction. Source: unit line 20; the refusal itself is AGL-22's (`units/AGL-22-fetch-page.md` line 19).
- **Settings controls are AGL-07's.** This unit adds no UI. Source: unit line 21. Checked: `apps/web/src/app/features/agent-loop/chat-page.ts` lines 292 to 295 (the research checkbox) and 700 to 712 (the save of `research`).
- **Names and family already exist.** `web_search` is a reserved built-in name, and `research` is one of the five tool families. Source: `modules/agent-loop.md` line 52; `packages/contracts/src/agent-loop/constants.ts` lines 12 and 38. No contract changes.
- **Search results never ground a claim.** Only `sources/` is grounding evidence. Source: `modules/agent-loop.md` line 56. The retrieval scope `['sources']` at `apps/api/src/modules/agent-loop/grounding-engine.ts` line 112 is unchanged by this plan.
- **Search results are not marked untrusted (open point 2, settled).** The unit asks for no marking. The module's untrusted rule (`modules/agent-loop.md` line 83) is about fetched pages, and its protection is that writes need the author's acceptance and grounding reads only `sources/` (line 56); both hold for search results without a mark. The marking of fetched text is AGL-22's (unit AGL-22 line 21). The tool description (P8) says a result is not a source.
- **Settings are read at the start of each run.** The loop reads the research settings once per run. Source: `units/AGL-06-agent-settings.md` line 17; `plans/AGL-06.md` line 32 (D6).

Small decisions the planner makes (simplest option; recorded here, not in `plans/DECISIONS.md`):

- **P1. Where the tool is built.** `AgentToolsService.startRun` builds the `web_search` definition per run, as it builds the narrative tools, because the endpoint belongs to the run's settings. Its argument validator is compiled once in the constructor. It is not added to `builtinTools`, which has no per-run input.
- **P2. How the endpoint arrives.** `StartRunOptions` gains `searchEndpoint?: string`. `AgentRunsService.launch` passes `settings.research.searchEndpoint`, from the settings read at its line 130 (the read that already gives the step cap). The field is optional, so the test kit's call (`apps/api/test/agent-loop-tools.kit.ts` lines 42 to 46) compiles unchanged.
- **P3. The query string.** The endpoint is parsed with `new URL`, then `q` and `format` are set with `searchParams.set`. An endpoint that already has other query parameters keeps them.
- **P4. The output.** `{query, results: [{title, url, snippet}]}`. `snippet` is the reply's `content`, or `''` when the reply omits it. All results of the reply are kept; no cap is added.
- **P5. Failures.** A non-2xx answer, a body that is not JSON, or a body without a `results` array makes the handler throw a plain `Error`. `ToolRun` answers the model with its standard failed text and does not count the call (`tools/tool-run.ts` lines 198 to 208). No new error code.
- **P6. Time and retries.** The search has no timer of its own. The run's stop signal reaches the request through `ctx.signal` (`agent-run.ts` line 329 passes `controller.signal` into `dispatch`). The search makes no retry. The module gives transport retries to the providers client and says the loop adds none (`modules/agent-loop.md` line 51). The search is not a model call, and it adds no retry either.
- **P7. Transport.** `globalThis.fetch`, as the providers client uses it (`apps/api/src/modules/providers/client/openai-compatible-client.ts` line 233). Redirects follow fetch's default.
- **P8. The model text.** The default `JSON.stringify(output)` (`tools/tool-run.ts` line 166). The tool description, in the planner's words: "Search the web through the author's search endpoint. Returns the title, URL and snippet of each result. A result is not a source and cannot ground a claim."
- **P9. The system prompt is unchanged.** `apps/api/src/modules/agent-loop/agent-prompt.ts` lines 7 to 12. The C6 test in `agent-loop-run.test.ts` pins parts of it.
- **P10. Tests stay local.** The stub is a `node:http` server on `127.0.0.1` with port 0. Source: `modules/agent-loop.md` line 64.

## 2. Files to create or change

Only these paths change. The planner changes none of them. `units/`, `modules/` and `plans/` are not touched by the implementer; the orchestrator ticks the unit's checkboxes at merge.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/tools/web-search.ts` | new | Exports `WEB_SEARCH_SCHEMA` (a `ToolArgumentSchema`: required string `query`, `minLength` 1, no extra keys) and `webSearchDefinition(endpoint: string): ToolDefinition` (name `web_search`, family `research`, the description of P8). The handler builds the URL (P3), calls `globalThis.fetch(url, {signal: ctx.signal, headers: {accept: 'application/json'}})`, throws on a non-2xx answer, parses the body with a zod schema `z.object({results: z.array(z.object({title: z.string(), url: z.string(), content: z.string().optional()}))})` (the body is read as `unknown`), and answers `{query, results}` with summary `Found N result(s) for "<query>".` |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | edit | `StartRunOptions.searchEndpoint?: string` (P2). The constructor adds `private readonly webSearchValidate: ValidateFunction`, set to `ajv.compile(WEB_SEARCH_SCHEMA)` next to the existing `builtinTools` compile (line 48 creates `ajv`). `startRun` (lines 58 to 98) builds an `extra: CompiledTool[]` and a `rejectedNames` list. The early return at lines 59 to 61 goes. The narrative code (lines 62 to 92) moves unchanged under `if (enabledFamilies.includes('narrative'))`. A new branch pushes `{definition: webSearchDefinition(searchEndpoint), validate: this.webSearchValidate}` when `enabledFamilies` includes `research` and `searchEndpoint` is not undefined. The return becomes `new ToolRun({runId, projectId, enabledFamilies, tools: [...this.tools, ...extra], rejectedNames})`. The `builtinTools` list is unchanged. |
| `apps/api/src/modules/agent-loop/agent-runs.service.ts` | edit | `launch` (line 149) passes `searchEndpoint: settings.research.searchEndpoint` to `this.tools.startRun`, using the `settings` read at line 130. `start` (lines 77 to 79) is unchanged. |
| `apps/api/test/agent-loop-web-search.test.ts` | new | The two criterion tests and the decision test D1 of section 4, a local SearXNG-shaped stub, and the harness helpers copied from `agent-loop-run.test.ts` (P10 and section 4). |
| `apps/api/test/agent-loop-run.test.ts` | edit (comment only) | Line 382 reads "no research tool exists at M1", which stops being true. It becomes "with no search endpoint, web_search is not offered". The two expected lists (lines 373 to 377 and 391 to 397) do not change. |

Unchanged on purpose: `packages/contracts` (the constants already name `research` and `web_search`); `apps/web` (the settings sheet is AGL-07's); `tools/builtin-tools.ts`, `tools/tool-run.ts`, `tools/tool-types.ts`; `agent-settings.service.ts` and `agent-settings.section.ts`; `agent-prompt.ts`; `agent-loop.module.ts`.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/AGL-21`. If the branch does not exist, make it from `main`. If it exists, continue from its commits (`git log main..unit/AGL-21`). Work in a new worktree: `git worktree add <path> -b unit/AGL-21 main` (or `git worktree add <path> unit/AGL-21` when the branch exists). Record `node -v` and `npm -v` beside each result. Do not push. Do not change `units/`, `modules/` or `plans/`.

1. **Runtime and install.** In the worktree, `node -v` prints `v26.x` (the root `engines` field is `>=26 <27`). Run `npm ci`. Expected: exit 0.
2. **Contracts build.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Expected: exit 0. The API resolves `@bbartolome/scriba-contracts/agent-loop` through the contracts `dist`, which git does not track.
3. **Baseline.** From `apps/api`, run `npx vitest run test/agent-loop-*.test.ts` before any edit. Expected: every file passes. Record the file and test counts.
4. **Red tests.** Create `apps/api/test/agent-loop-web-search.test.ts` as section 4 describes. Run `npx vitest run test/agent-loop-web-search.test.ts` from `apps/api`. Expected on `main`: AC1 and D1 pass (no research tool exists yet); AC3 fails, because no `web_search` is offered. Record the output.
5. **The tool.** Create `apps/api/src/modules/agent-loop/tools/web-search.ts` (section 2). Expected: the file has the two exports and no import from another module folder.
6. **The service.** Edit `agent-tools.service.ts` as section 2 describes. Expected: `grep -n "webSearchDefinition\|webSearchValidate\|searchEndpoint" apps/api/src/modules/agent-loop/agent-tools.service.ts` shows the import, the constructor line, the `StartRunOptions` field and the push.
7. **The launch.** Edit `agent-runs.service.ts` line 149 as section 2 describes. Expected: `grep -n "searchEndpoint" apps/api/src/modules/agent-loop/agent-runs.service.ts` shows one line.
8. **The comment.** Edit line 382 of `apps/api/test/agent-loop-run.test.ts`. Expected: `git diff -- apps/api/test/agent-loop-run.test.ts` shows only that comment line.
9. **The new tests.** From `apps/api`, run `npx vitest run test/agent-loop-web-search.test.ts`. Expected: AC1, D1 and AC3 pass.
10. **The agent-loop suite.** From `apps/api`, run `npx vitest run test/agent-loop-*.test.ts`. Expected: the same files pass as in step 3. The test counts match step 3, plus the three new tests.
11. **Gates.** From the root, `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api/src/modules/agent-loop apps/api/test/agent-loop-web-search.test.ts apps/api/test/agent-loop-run.test.ts`. Then `npm test -w @bbartolome/scriba-api`. Expected: each exits 0.
12. **Scope.** `git status --short` lists only the five paths of section 2. Ignored build output in `dist/` is not listed.
13. **Commit.** `git add` the five paths and commit with the message `feat(AGL-21): web_search against a SearXNG-compatible endpoint`. Expected: one commit on `unit/AGL-21`.
14. **Mutation checks.** On the committed tree, make each change below, run `npx vitest run test/agent-loop-web-search.test.ts`, record the failing test, then restore the file with `git checkout -- <path>`. Expected after each restore: `git status --short` is empty.
    - M1 (endpoint gate removed): in `agent-tools.service.ts`, drop `&& searchEndpoint !== undefined` and use `searchEndpoint ?? ''` as the endpoint. Expected: D1 fails.
    - M2 (research family always on): in `agent-runs.service.ts` `start` (lines 77 to 79), always include `'research'`. Expected: AC1 fails on its second run, where the endpoint is set and research is off.
    - M3 (wrong parameter name): in `web-search.ts`, set `query` instead of `q`. Expected: AC3 fails, because the stub answers 400.
15. **Record.** Store the Node and npm versions and each command's output with its exit code. A criterion is marked passed only when its pass condition in section 4 holds. Give the orchestrator the commit hash.

## 4. Acceptance criteria and tests

Both criteria of the unit (lines 24 and 26) run in this environment. Each needs only Node, the composed app, the mock OpenAI server and a local HTTP stub. None needs GitHub Actions, a pull request, Docker, a tailnet, credentials or a real model. The former criterion 2 is AGL-26's now (split, commit a44b9cf), and this plan has no test with its wording. The decision test D1 covers this unit's part of it: the endpoint gate of unit line 19.

Test file: `apps/api/test/agent-loop-web-search.test.ts`. Each criterion test's name is the criterion's wording with an `ACn:` prefix, where n is the criterion's original number (AC1, AC3); the decision test is `D1`. Harness, copied from `agent-loop-run.test.ts` as AGL-09 did: `providersSection` and `settingsText` (lines 44 to 70), `openHarness` (line 84), `post` (line 118), `startRun` (line 130), `readUntilEnded` (line 140), `toolNamesOf`, `chatBodies` and `toolContents` (lines 168 to 180). Each test has its own temp library, scenario folder and app, and removes them. The research names are `RESEARCH_NAMES = ['web_search', 'fetch_page']`.

The stub, `startSearxngStub()`: a `node:http` server on `127.0.0.1` with port 0. On `/search` it records the request URL. It answers 400 unless `q` is present and `format` is `json`. Otherwise it answers 200 with `{results: [...]}`, two results with a title, a URL and a `content` each. Its URL is `http://127.0.0.1:<port>/search`. It is closed after each test.

| Criterion (unit line) | Test and seam | Command | Pass condition |
|---|---|---|---|
| "With research off, the mock's received request contains no research tools." (line 24) | `AC1: With research off, the mock's received request contains no research tools.` Composed app, real `settings.yaml`, mock OpenAI with a one-reply scenario. Run 1 uses the default settings. Then `POST` `AGENT_SETTINGS_ROUTE` with `{research: {searchEndpoint: <stub URL>}}` (the merge keeps `enabled` false), and run 2. | from `apps/api`: `npx vitest run test/agent-loop-web-search.test.ts` | In the first chat request of each run, `toolNamesOf` contains neither `web_search` nor `fetch_page`. Run 2 has an endpoint set, so it shows that the switch, not the endpoint, gates the tool. |
| Decision test, unit line 19: "`web_search` is offered only when research is on **and** an endpoint is set." | `D1: With research on and no endpoint, web_search is not offered.` Settings `agent.research: {enabled: true}`, no endpoint, one-reply scenario. | same | `toolNamesOf` of the first chat request does not contain `web_search`. It asserts nothing about `fetch_page`, so it passes in both merge orders with AGL-22. |
| "With both, a search runs against a local SearXNG-shaped stub and returns titles, URLs and snippets." (line 26) | `AC3: With both, a search runs against a local SearXNG-shaped stub and returns titles, URLs and snippets.` Settings `research: {enabled: true, searchEndpoint: <stub URL>}`. Scenario: turn 0 is a `toolCalls` reply calling `web_search` with `{"query":"learning plateaus"}`; turn 1 is a `stream` reply "Done.". | same | The stub received one request on `/search` with `q` = `learning plateaus` and `format` = `json`. The second chat request has a `tool` message whose content contains each result's title, URL and snippet. The run ends (`readUntilEnded` returns a `run-ended`). |

Mutation checks are step 14 of section 3. Each one must turn a named test red, and the restore must leave the tree clean.

## 5. Downstream agreement

- **AGL-23, research gate** (`blocked_by` AGL-20, AGL-21, AGL-22; with AGL-26 since the split, one of the two units whose `blocked_by` names AGL-21; unit lines 7 and 17 to 20). It needs from this unit:
  - Line 17, "With the setting off, the model request contains no research tools.": AC1 of this plan, which holds in both merge orders because a switch that is off offers nothing.
  - Line 18, "With it on, a search and a fetch run against a local test server.": the search part is `web_search` at `GET <endpoint>?q=…&format=json`, offered only when `enabled` is true and an endpoint is set (section 1). AC3 of this plan proves it against a local stub. The fetch part is AGL-22's.
  - Line 19 (refusals) is AGL-22's. Line 20 (fetched text is not grounding evidence) is not changed here: `web_search` results are not in the `sources/` scope (grounding-engine.ts line 112).
  - The tool names `web_search` and `fetch_page` are the reserved names of the family `research` (constants.ts lines 12, 38 and 39), so AGL-23 can list them.
  - Agreement: AGL-23 must set both `enabled` and `searchEndpoint` in its scenario, as AC3 does. This plan gives it nothing else.
- **AGL-22, `fetch_page`** (parallel with AGL-21; no plan yet; `blocked_by` AGL-02 and AGL-08, unit line 7). Both units touch these files:
  - `tools/builtin-tools.ts`: AGL-22 appends `fetch_page` (family `research`, offered whenever research is on, unit line 18). AGL-21 does not touch that file.
  - `agent-tools.service.ts`: AGL-21 adds one constructor line after line 54 and changes `startRun`. AGL-22 touches neither, unless it adds a constructor line of its own; the two edits then sit on different lines and rebase cleanly.
  - `agent-loop-run.test.ts`: the expected list at lines 391 to 397 (research on, no endpoint) gains `fetch_page` when AGL-22 lands, so AGL-22 must update it. AGL-21 changes only the comment at line 382, which is above that list.
  - The search endpoint is not refused by AGL-22's private-network check (unit AGL-21 line 20). AGL-21 adds no check, so nothing is undone.
  - Merge orders: AGL-21 first, then AGL-22, which rebases with no overlapping line. AGL-22 first, then AGL-21, which rebases the same way. D1 and AC1 hold in both orders: D1 checks only that `web_search` is absent, and AC1 checks that both research names are absent with research off, which AGL-22 keeps (`fetch_page` is offered only when research is on).
  - AGL-22's `unblocks` gained AGL-26 in the split commit a44b9cf (front matter only; AGL-22 had no plan and no branch at that commit).
- **AGL-26, research on with no endpoint** (new, split from this unit, commit a44b9cf; `blocked_by` AGL-21 and AGL-22). It holds the former criterion 2 word for word. It needs from this unit only the endpoint gate of section 1 (P1, P2): with research on and `searchEndpoint` unset, `web_search` is absent. D1 proves that here. AGL-26 then asserts that the research list is exactly `['fetch_page']`. The gate AGL-23 does not wait on AGL-26 (`units/README.md` phase row).
- **AGL-24, compile tools** (parallel; no plan; unit `parallel_with` AGL-21, line 8). It may also add a family to the `extra` list of `startRun` (section 2). The `extra` list is the place for it, and the two edits sit on different lines.
- **AGL-20** (done). It changes no file this plan uses (`plans/AGL-20.md` line 137).
- **AGL-06 and AGL-07** (done). This plan reads `current().research` as `plans/AGL-06.md` line 90 names it, and it adds no UI. The settings sheet already has the checkbox and the endpoint field (`chat-page.ts` lines 292 to 295 and 700 to 712).
- **Other plans.** `plans/CEX-15.md`, `plans/CEX-18.md`, `plans/GNP-15.md` and `plans/GRR-15.md` are the only other non-done plans (status line, checked again at c78db0f). None names an agent-loop path (grep of their text for `agent-loop`), so no merge order with them changes this plan.

## 6. Open points

Both points are settled by the reviser. None is left for the Navigator.

1. **Criterion 2 names `fetch_page`, which is AGL-22's tool, and AGL-21 is not blocked by AGL-22. Settled by a split.** In the merge order AGL-21 before AGL-22, no correct plan could pass the criterion, and no unit fixes the order. Criterion 2 moved word for word to `units/AGL-26-research-no-endpoint.md` (`blocked_by` AGL-21 and AGL-22), commit a44b9cf. AGL-21's `unblocks` and AGL-22's `unblocks` gained AGL-26; the README phase row lists AGL-26 with the note that the gate AGL-23 does not wait on it. No criterion text changed. This plan keeps the endpoint gate as decision test D1.
2. **Untrusted marking of search results. Settled: not marked.** The unit does not ask for it; the module rule of line 83 names fetched pages, and its protections (pending changes, `sources/`-only grounding) hold for search results without a mark. See section 1. Adding a mark later is one field in the output and needs no criterion change.

## 7. Facts checked and facts assumed

Checked in the repository on `main` at dd1b4f1 (read-only; no build or test was run by the planner):

- Unit `units/AGL-21-web-search.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Decisions lines 18 to 21; criteria lines 24 to 26, unticked. At dd1b4f1 a grep for "Moved", "Removed", "Loosened", "Reworded", "revision" and "old text" found nothing. Since a44b9cf the unit has one change note: criterion 2 moved to AGL-26, with its old text.
- Module `modules/agent-loop.md`: lines 11 (research tools need only the loop and settings), 51 (dependencies; transport retries live in the providers client), 52 (reserved names), 56 (only `sources/` grounds), 57 (the `agent` section), 61 (testing principles), 64 (research tests use a local stub), 76 (grounding against web pages is out of scope), 83 (fetched pages are untrusted).
- Units naming AGL-21: `units/AGL-23-research-gate.md` line 7 was the only `blocked_by` that named it at dd1b4f1 (since a44b9cf, `units/AGL-26-research-no-endpoint.md` line 7 names it too) (lines 17 to 20 are its criteria). `units/AGL-06-agent-settings.md` line 9 and `units/AGL-08-file-tools-chat-gate.md` line 9 list it in `unblocks`. `units/AGL-20-grounding-gate.md` line 8, `units/AGL-22-fetch-page.md` line 8 and `units/AGL-24-compile-tools.md` line 8 list it in `parallel_with`. AGL-22's `blocked_by` (line 7) is AGL-02 and AGL-08. `units/AGL-22-fetch-page.md` lines 18 to 21 and 24 to 26 were read.
- `units/AGL-06-agent-settings.md` lines 15 and 17; `units/AGL-23-research-gate.md` lines 17 to 20.
- Plans: `plans/PLT-02.md` (structure); `plans/AGL-06.md` lines 32 and 90; `plans/AGL-07.md` line 133; `plans/AGL-09.md` lines 186 to 189 (the merge-order pattern); `plans/AGL-20.md` line 137; `plans/AGL-03.md` line 42 (D11, family filter); `plans/AGL-08.md` line 161. `plans/QUEUE.md` line 12 lists AGL-21 as available. `plans/DECISIONS.md` line 3480 is the only entry that names AGL-21 (an AGL-06 review line that says no change is needed). Non-done plans are CEX-15, CEX-18, GNP-15 and GRR-15; none names an agent-loop file.
- Code: `apps/api/src/modules/agent-loop/agent-tools.service.ts` lines 18 (import of `builtinTools`), 26 to 30 (`StartRunOptions`), 36 (`tools` field), 38 to 55 (constructor; `ajv` at 48), 58 to 98 (`startRun`; early return 59 to 61; narrative block 62 to 97). `agent-runs.service.ts` lines 24 (import of `AgentSettingsService`), 74 to 86 (`start`; families 77 to 79), 128 to 176 (`launch`; settings read 130; `startRun` call 149). `agent-settings.service.ts` lines 16 to 20 (`current`) and 23 to 32 (`update`; the merge at 28). `tools/tool-run.ts` lines 30 to 37 (`ToolRunOptions`), 84 to 94 (constructor and family filter), 107 to 118 (`schemas`), 121 to 210 (`dispatch`), 166 (default model text), 198 to 208 (the generic failure path, which neither counts nor resets). `tools/tool-types.ts` lines 37 to 42 (`ToolArgumentSchema`), 44 to 48 (`ToolContext`, with `signal` at 47), 72 to 79 (`ToolDefinition`), 92 to 95 (`CompiledTool`). `tools/builtin-tools.ts` line 125 (`builtinTools`), lines 407 to 414 (the returned list; no research tool). `agent-run.ts` line 43 (`AgentRunInit`), line 49 (`enabledFamilies`), lines 327 to 330 (`dispatch` with `controller.signal`). `agent-prompt.ts` lines 7 to 12.
- Contracts: `packages/contracts/src/agent-loop/constants.ts` lines 9 to 15 (families; `research` at 12), 31 to 43 (reserved names; `web_search` at 38, `fetch_page` at 39). `packages/contracts/src/agent-loop/settings.ts` lines 8 to 12 (defaults), 16 to 23 (`agentSettingsSchema`), 21 (`searchEndpoint` as `z.url` with an http(s) protocol). `packages/contracts/src/agent-loop/routes.ts` lines 3 and 11 (`AGENT_RUNS_ROUTE`, `AGENT_SETTINGS_ROUTE`).
- Web: `apps/web/src/app/features/agent-loop/chat-page.ts` lines 292 to 295 (research checkbox), 448 (`researchOn`), 700 to 712 (save of `research`), 790 to 791 (load).
- API test helpers: `apps/api/test/agent-loop-run.test.ts` lines 84 (`openHarness`), 118 (`post`), 130 (`startRun`), 140 (`readUntilEnded`), 168 to 180 (`toolNamesOf`, `chatBodies`, `toolContents`), 346 (the C6 test), 373 (first expected list), 382 (the comment to change), 391 (second expected list). `apps/api/test/agent-loop-tools.kit.ts` lines 38 to 47 (`startRun` with `enabledFamilies: ['project']`). `apps/api/test/providers-client.kit.ts` lines 16 (re-exports `startMockOpenAI`) and 61 (`recordsOf`). `e2e/fixtures/mock-openai/server.mjs` lines 15 (`REPLY_KINDS`), 104 to 120 (matchers; `turnIndex` counts assistant messages at 117 to 121).
- Nothing in `apps` or `packages` other than the contracts names `web_search` or `fetch_page` (grep), and `new ToolRun` is built only at `agent-tools.service.ts` lines 60 and 93.
- `apps/api/package.json`: `zod` `^4` (line 21) and `ajv` 8.20.0 (line 16). The providers client calls `globalThis.fetch` (`openai-compatible-client.ts` line 233).
- `apps/api/vitest.config.mts` includes `test/**/*.test.ts`. The root `package.json` sets `engines.node` to `>=26 <27`.

Assumed, not checked:

- That `npm ci` and the two builds succeed in a new worktree on Node 26, and that the existing suite passes on `main`. Steps 1 to 3 check them.
- That a `node:http` stub bound to `127.0.0.1` is reachable from the test process in this sandbox. Step 4 checks it.
- That the real SearXNG JSON has the `results[].{title, url, content}` shape the unit gives. The unit is the source; the real server was not consulted.
- That the numbers "(40)" (unit AGL-21 line 15) and "(41)" and "(42)" (unit AGL-22 line 15) refer to a numbered list that is not in this repository. Nothing here depends on them.

Checked by the reviser on `main` at c78db0f: `agent-tools.service.ts` lines 26 to 30, 48 to 54, 58 to 98; `agent-runs.service.ts` lines 74 to 86, 90 to 100 (`checkGrounding` launches with `['grounding']` only, so it never offers `web_search`), 128 to 149; `agent-settings.service.ts` lines 23 to 32 (the merge keeps `enabled` when only `searchEndpoint` is posted, as AC1 run 2 needs); `tools/tool-types.ts` (`ToolSchemaProperty` has `minLength`; `ToolContext.signal`); `tools/tool-run.ts` lines 84 to 94, 166, 198 to 208; `agent-loop-run.test.ts` lines 373 to 397; `openai-compatible-client.ts` line 233; `packages/contracts/src/agent-loop/settings.ts` lines 8 to 23.

## 8. Review parts

One part.

- **Part A (all steps, 1 to 15; tests AC1, D1, AC3, and mutations M1 to M3).** The tool file, the service and launch edits, the comment change, and the new test file. AC1 is unit criterion 1 (line 24); AC3 is unit criterion 3 (line 26); D1 is the decision test of unit line 19. The former criterion 2 is AGL-26's and is not in this plan.
