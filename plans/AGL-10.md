---
id: AGL-10
status: planned
title: search_notes project tool
unit: units/AGL-10-search-notes.md
base: main at 53bda67 (AGL-03 merged at 13b505a), working tree clean (revised three times; drafted at a04eb7d); the branch unit/AGL-10 exists with test commit 2436b40
---
# AGL-10 plan - search_notes project tool

Agent loop, `phase:narrative-tools`, M2. Unit `units/AGL-10-search-notes.md`: front matter at lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9), Decisions at line 15, acceptance criteria at lines 18 and 19.

Base. This plan was drafted at `main` `a04eb7d`, revised at `07ebb8d`, and revised again at `d787da3` for the Navigator's seam decision (`plans/DECISIONS.md`, entry "2026-11-15 — AGL-10 — Navigator decision: test seam for criterion 1", line 4280; commit `6fa489a`). `git diff --name-only 07ebb8d d787da3` lists only `plans/AGL-10.md`, `plans/DECISIONS.md`, `plans/QUEUE.md`, `units/AGL-03-loop-core.md` and `units/AGL-10-search-notes.md`, so every code citation below still holds at `d787da3`. The revision log is section 11.

**Revision 3 (PLAN DOES NOT WORK at step 7).** AGL-03 is now on `main` (merged at `13b505a`; `main` at `53bda67`), and an implementer ran this plan on `unit/AGL-10` (test commit `2436b40`, source edits uncommitted in the worktree). The full suite failed: two existing tests assert the exact list of offered `project`-family tools, and `search_notes` joins that family (`plans/DECISIONS.md`, entry "2026-11-15 — AGL-10 — PLAN DOES NOT WORK"). This revision names both tests as changed (section 2) and adds step 7, which adds `search_notes` to their expected lists. `git diff --stat 1b8c367 main -- apps packages e2e` is empty, so the branch's base code equals `main`'s. The paragraph below is kept as history; its precondition now holds.

**Waits on AGL-03.** Commit `d787da3` adds AGL-03 to the unit's `blocked_by` (line 7) and AGL-10 to AGL-03's `unblocks` (`units/AGL-03-loop-core.md` line 9). AGL-03 is not on `main`: it has no plan, no `unit/AGL-03` branch, and `plans/QUEUE.md` line 2 says `available: no ... waits on MPR-08`. Both tests (section 4) are scripted turns through the loop's start route and SSE events, which AGL-03 adds. This plan is planned and complete, but **it cannot be run before AGL-03 is merged on `main`**. Step 0 of section 3 checks it. When AGL-03 lands, the implementer re-reads the AGL-03 citations of section 9 (marked "AGL-03") against its merged code before step 2, and the plan is revised if one of them differs.

Tags: **checked** means the planner read the file and line, or confirmed it by grep, git or a probe. **assumed** means a belief not checked here (section 9). The planner changed no code and ran no build, install or test in the repository. Probes ran in `/tmp`, outside the repository (section 8).

## 0. Summary

- Adds one built-in tool, `search_notes {query, limit?, scope?}`, to the Agent loop's dispatcher. It calls the Project store's `SearchService.search` in-process on the run's project and returns the ranked passages, with project-relative paths, as the tool result. The name is already reserved and the family `project` already exists (checked: `packages/contracts/src/agent-loop/constants.ts` lines 9 to 15 and 36).
- Blockers (checked). AGL-02 is done and on `main` (`plans/AGL-02.md` line 3 `status: done`; commits `0066c97` and `d831067` are ancestors of `main`). PST-13 is done and on `main` (`plans/PST-13.md` line 3 `status: done`; commits `12d33c6`, `e96dc98` and `39d3b58` are ancestors of `main`). **AGL-03 is not on `main`** (Base paragraph). AGL-10 waits for it.
- Change set: three existing files in `apps/api/src/modules/agent-loop/` and one new test file. No route, no contract, no dependency and no module wiring change. The composed app and its invariant sweeps are unchanged.
- Test seam (decided; open point 1, closed). Both criteria are scripted turns through the composed app (Platform's `create-test-app`, `COMPOSED_MODULES`) with Platform's mock OpenAI server (`e2e/fixtures/mock-openai/server.mjs`), the module's default seam (`modules/agent-loop.md` line 62; `units/README.md` line 57). The scripted turn calls `search_notes`; the assertions are the SSE events, the tool result and the mock's received requests (`modules/agent-loop.md` line 63). The AGL-02 test-only kit is not used.
- Two tests, one per acceptance criterion (section 4).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contracts, DECISIONS and earlier plans

- **D-1. Shape of the tool (unit line 15).** `search_notes {query, limit?, scope?}` calls the Project store search contract in-process on the bound project and returns ranked passages `{path, offset, snippet, score}` with project-relative paths.
- **D-2. Name and family (`constants.ts` line 36; AGL-02 plan D15, line 42).** `search_notes` is one of the eleven reserved names. Its family is `project` (`AGENT_TOOL_FAMILIES`, lines 9 to 15), as for AGL-02's tools.
- **D-3. Argument schema and readable errors (`modules/agent-loop.md` line 53; AGL-02 plan S1, S2, S3, S5).** JSON Schema checked by Ajv, `additionalProperties: false`, with the renderer and the expected-arguments line that AGL-02 already has. No new error code (AGL-02 plan D11).
- **D-4. Counting (AGL-02 plan S6, S7, S8).** An invalid call is a counted attempt, and the third consecutive one withdraws the tool. Each AC2 case therefore runs in its own agent run.
- **D-5. Meaning of `valid` (DECISIONS, entry "AGL-02 — Sonnet code review", line 4204).** A call whose arguments fail the schema answers `valid: false`. AC2 asserts that on the `tool-call-args` event.
- **D-6. Search contract (`packages/contracts/src/project-store/search.ts` lines 5 to 9 and 12 to 20; PST-13 plan S8).** `query` is a string of at least one character. `limit` is an integer of at least 1. `scope` is an array of `sources` and `entities`. A result is an array of `{path, offset, snippet, score}`, best first.
- **D-7. Service behaviour (`search.service.ts` lines 95 to 117 and 199 to 200; PST-13 plan P10, P15, P16, P17).** `search(projectId, request)` is synchronous and in-process. It checks the active project first (`project-store.service.ts` lines 66 to 80; a non-active project gives `PROJECT_NOT_ACTIVE`). An absent `limit` gives 20, with no maximum (`search.service.ts` lines 24 and 109). An absent or empty `scope` means both folders (lines 30 to 32).
- **D-8. Indexed roots (PST-13 plan S2 and P3).** The index holds only files under `sources/` and `entities/`. The query adds the same prefix test (`search.service.ts` lines 27 and 30 to 39). `drafts/` never appears in a result.
- **D-9. Import rule (`eslint.config.mjs` line 50, rule R1; AGL-02 plan D10).** `agent-loop` imports the Project store only through `project-store.module.ts`. That file exports `SearchService` (line 24) and lists it in `exports` (line 64). `agent-loop.module.ts` already imports `ProjectStoreModule` (line 28), so the module file does not change.
- **D-10. Test seam (Navigator decision, `plans/DECISIONS.md` line 4280, option B; `modules/agent-loop.md` lines 61 to 63; `units/README.md` lines 57 and 136).** External behaviour only. The composed app (`createTestApp` with `COMPOSED_MODULES`, `apps/api/src/app.module.ts` lines 19 to 26) on a temp library, Platform's mock OpenAI server with scenario files owned by the test, and scripted turns started on `POST /api/agent-loop/runs` (`AGENT_RUNS_ROUTE`, `packages/contracts/src/agent-loop/routes.ts` line 3). Assertions on the agent-loop SSE events (`packages/contracts/src/agent-loop/events.ts`), on the tool result they carry, and on the requests the mock received. The AGL-02 kit (`apps/api/test/agent-loop-tools.kit.ts`) is not used for AGL-10 (the decision: the kit allowance is only in AGL-02's own criteria heading, `units/AGL-02-tool-framework-file-reads.md` line 24). Unit tests never read `examples/`.

### 1b. Small choices this plan makes

- **C-1. Output.** `output` is `{passages}`, the search result as returned, with the contract's fields including `score`. The summary is `Found <n> passages for "<query>".`, with `passage` when n is 1. The model text is the default `JSON.stringify(output)` (AGL-02 plan S10; `tool-run.ts` line 132).
- **C-2. Scope default.** An absent `scope` searches both folders, which is the service default (D-7). Source: unit line 15 (the tool "calls the Project store search contract", which gives no other default); `search.service.ts` lines 30 to 32; PST-13 plan P15. `modules/agent-loop.md` line 56 limits grounding evidence, not note search, to `sources/`, and AGL-16 passes `scope: ['sources']` itself (its decision 2, line 19).
- **C-3. Refusal attribution.** AGL-02 plan S18 maps a `ModuleError` to the one issue `path`, because both AGL-02 tools take `path`. `search_notes` has no `path` argument. The handler therefore catches the `ModuleError` from `search` and throws `ToolArgumentError([{path: '', message}])` (AGL-02 plan S17; AGL-02 plan line 186), which renders as `arguments: <message>` and counts under AGL-02 plan S7 (d). `tool-run.ts` is not changed. No criterion covers it, and the plan adds no test beyond the two criteria (open point 6).
- **C-4. Schema.** Properties in this order: `query` (type string, `minLength: 1`, required); `limit` (type integer, `minimum: 1`, no maximum, as D-7 and PST-13 P15); `scope` (type array, `items: {type: 'string', enum: ['sources', 'entities']}`). `required: ['query']` and `additionalProperties: false` (AGL-02 plan S1, O7). Ajv rejects every key but these three, so the handler passes its argument object to `search` unchanged.
- **C-5. Widened property type.** `ToolSchemaProperty` (`tool-types.ts` lines 27 to 30) gains `'array'` in its `type` union, and three optional members: `items?: {type: 'string'; enum: readonly string[]}`, `minimum?: number` and `minLength?: number`. The change is additive (section 5).
- **C-6. Descriptions.** The tool: "Search the project's notes, the sources and the entities, for a text. Returns the best passages with their project-relative paths. Drafts are never searched." `query`: "The words to look for." `limit`: "The most passages to return. Twenty when left out." `scope`: "The folders to search: sources, entities or both. Both when left out."
- **C-7. Test helpers.** The new test file uses the shared test helpers as they are: `createTestApp` (`create-test-app.ts` line 65), `buildProjectsLibrary` (`project-store-projects.kit.ts` line 30), `putFile` (`project-store-files.kit.ts` line 70), `sessionCookie` and `send` (`guard-request.ts`, line 80), `LOOPBACK_HOST` (`invariant-sweep.ts` line 38), `openSse` and `dataOf` (`sse.ts` lines 31 and 66), and `startMockOpenAI` and `recordsOf` (`providers-client.kit.ts` lines 16 and 61). Helpers that only this file needs (the settings text, the scenario files, the run-and-collect helper of section 4) are written in the test file. If AGL-03 merges its own run helper into a shared kit, the test uses it instead and keeps the assertions of section 4.
- **C-8. Header comment.** `builtin-tools.ts` lines 4 and 5 describe the tools as "the built-in read tools of M1". The edit keeps that sentence true for `search_notes`, which reads the index and writes nothing.
- **C-9. Scenario files owned by the test.** The two scripted turns are scenario files that the test writes to a temp folder and passes as `startMockOpenAI({scenariosDir})` (the pattern of `providers-connection-test.test.ts` lines 182 to 191). No file is added under `e2e/fixtures/mock-openai/scenarios/`, so the mock's own tests and the bundled scenarios do not change.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/tools/tool-types.ts` | edit | `ToolSchemaProperty`: `'array'` in the type union, and optional `items`, `minimum` and `minLength` (C-5) |
| `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` | edit | line 1 also imports `SearchService`; line 2 also imports `ToolArgumentError` (a value); new imports of `ModuleError` (from `../../platform/platform.module`) and the type `SearchResult` (from `@bbartolome/scriba-contracts/project-store`); header comment (lines 4 and 5, C-8); signature (line 24) gains `search: SearchService` as its second parameter; one new definition `searchNotes`; the returned array (line 82) ends with `searchNotes` |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | edit | line 4 also imports `SearchService` from `../project-store/project-store.module`; the constructor (line 21) gains `search: SearchService` after `files`; line 24 becomes `builtinTools(files, search)` |
| `apps/api/test/agent-loop-search.test.ts` | new | the two tests AC1 and AC2, scripted turns through the composed app with the mock OpenAI server (section 4) |
| `apps/api/test/agent-loop-tools.test.ts` | edit (step 7) | AGL-02's test AC3: the two exact offered-tool lists (lines 299 and 349 to 352) gain `'search_notes'` (section 3, step 7) |
| `apps/api/test/agent-loop-run.test.ts` | edit (step 7) | AGL-03's test C6: the two exact offered-tool lists (lines 362 and 373) gain `'search_notes'` (section 3, step 7) |

Line numbers in the three source files are those at `d787da3`. AGL-03 may change `agent-tools.service.ts` or `builtin-tools.ts` when it lands; the implementer applies the same edits to the merged lines (section 5, merge rules).

Not changed (checked, section 7): `tools/tool-run.ts`, `tools/readable-error.ts`, `agent-loop.module.ts`, `apps/api/test/agent-loop-tools.kit.ts`, every other line of `agent-loop-tools.test.ts` and `agent-loop-run.test.ts`, every other test file (`grep -rn "'list_files'" apps/api/test` finds exact tool lists only at the four lines of step 7; `agent-loop-start.test.ts` and `agent-loop-stop.test.ts` assert no tool list), everything under `apps/api/src/modules/project-store/`, `apps/api/test/invariant-sweep.ts` and `create-test-app.ts` (no route is added, so no sweep entry is needed), `e2e/fixtures/mock-openai/**` (C-9), `packages/contracts/**`, `apps/web/**`, `units/**`, `modules/**`, and `plans/**` other than this file.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on `main`. Record `node -v` (expected `v26.x`) and `npm -v` beside each result. Do not push, do not open a pull request, and do not add a remote.

0. **Preconditions.** `git status --short` prints nothing. **AGL-03 is on `main`:** `plans/AGL-03.md` exists and its line 3 is `status: done`, and `grep -rn "AGENT_RUNS_ROUTE" apps/api/src/modules/agent-loop` prints the start route's controller. If either fails, stop: AGL-10 is not available yet (Base paragraph). Then re-read the AGL-03 items of section 9 against the merged code; if one differs, stop and ask for a plan revision. `grep -n "export { SearchService }" apps/api/src/modules/project-store/project-store.module.ts` prints line 24. `grep -n '^status: done' plans/AGL-02.md plans/PST-13.md` prints both. Dependencies: run `npm ci` at the root. Expected: exit 0, then `cd apps/api && node -p "require('ajv/package.json').version"` prints `8.20.0` (`package-lock.json` line 52; section 8).
1. **Branch.** `git switch -c unit/AGL-10` from the clean `main`. Expected: `Switched to a new branch 'unit/AGL-10'`. If the branch exists (revision 3: it does, with `2436b40` and the uncommitted edits of steps 3 to 5 in the worktree), continue on it: steps 0 to 6 that its commits and worktree already satisfy are checked, not redone, and the work resumes at step 7.
2. **Red tests.** Write `apps/api/test/agent-loop-search.test.ts` as section 4 describes, with the helpers of C-7 and the scenario files of C-9. From `apps/api`, run `npx vitest run test/agent-loop-search.test.ts`. Expected: both tests fail, and the reason is the missing tool: the first chat request the mock records offers no `search_notes` function, and the scripted call gets a `tool-call-error` whose message is `This tool is not available in this agent run.` (AGL-02 plan S8; `tool-run.ts` line 97), with `valid: false` on `tool-call-args`. Then `git add apps/api/test/agent-loop-search.test.ts` and `git commit -m "test(AGL-10): add failing search_notes tests (AC1, AC2)" -- apps/api/test/agent-loop-search.test.ts`.
3. **Schema type.** Edit `tool-types.ts` as C-5. Expected: the diff adds `'array'`, `items`, `minimum` and `minLength` and changes no other line.
4. **Tool.** Edit `builtin-tools.ts` (section 2). The definition, with the schema of C-4 and the descriptions of C-6:

    ```ts
    const searchNotes: ToolDefinition = {
      name: 'search_notes',
      family: 'project',
      description: "<C-6 text>",
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1, description: 'The words to look for.' },
          limit: { type: 'integer', minimum: 1, description: 'The most passages to return. Twenty when left out.' },
          scope: { type: 'array', items: { type: 'string', enum: ['sources', 'entities'] }, description: 'The folders to search: sources, entities or both. Both when left out.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      handler: async (ctx, args) => {
        const input = args as SearchNotesArgs; // { query: string; limit?: number; scope?: ('sources' | 'entities')[] }
        let passages: SearchResult = [];
        let refusal: string | undefined;
        try {
          passages = search.search(ctx.run.projectId, input);
        } catch (error) {
          if (!(error instanceof ModuleError)) throw error;
          refusal = error.message;
        }
        // The throw is outside the catch, so the lint rule preserve-caught-error has nothing to flag (PST-13 plan S16).
        if (refusal !== undefined) throw new ToolArgumentError([{ path: '', message: refusal }]);
        return {
          summary: `Found ${passages.length} ${passages.length === 1 ? 'passage' : 'passages'} for "${input.query}".`,
          output: { passages },
        };
      },
    };
    ```

    The function signature becomes `builtinTools(files: FilesService, search: SearchService)` (plus any parameter AGL-03 added, kept), and the return lists `searchNotes` after the existing definitions. Expected: `grep -n "name: 'search_notes'" apps/api/src/modules/agent-loop/tools/builtin-tools.ts` prints one line.
5. **Service.** Edit `agent-tools.service.ts` (section 2). Expected: `grep -rn "tool-registry" apps/api/src/modules/agent-loop` prints only what is on `main` before this step (D-9; AGL-02 plan step 5).
6. **Green.** From `apps/api`, run `npx vitest run test/agent-loop-search.test.ts`. Expected: 2 passed.
7. **Existing tests that list the offered tools.** `search_notes` has family `project` (D-2), and both the AGL-02 kit (`agent-loop-tools.kit.ts` line 45) and the loop of AGL-03 enable the `project` family for a run, so `search_notes` is offered in every run where `list_files` and `read_file` are. Two existing tests assert the exact offered list and must gain `search_notes`. The edit only adds the string `'search_notes'` to four expected arrays; no assertion, line or test is removed, and no other expectation changes.
    - `apps/api/test/agent-loop-tools.test.ts`, test `AC3: a tool is withdrawn on the third consecutive invalid call, and a valid call resets the count` (AGL-02). The helper `offeredTools` (line 87) returns `ToolRun.schemas()` names in definition order (`tool-run.ts` lines 77 to 89; the kit route at lines 65 to 71), which is `list_files`, `read_file`, `search_notes` (step 4).
      - Line 299: `expect(await offeredTools(app, first)).toEqual(['list_files']);` becomes `expect(await offeredTools(app, first)).toEqual(['list_files', 'search_notes']);` (read_file is withdrawn; the other two are still offered).
      - Lines 349 to 352: `expect(await offeredTools(app, second)).toEqual(['list_files', 'read_file']);` (as written over four lines) becomes `.toEqual(['list_files', 'read_file', 'search_notes'])`. The run stops at line 299 today, so this line has not yet failed, but it fails next for the same reason.
    - `apps/api/test/agent-loop-run.test.ts`, test `C6: the request has the system prompt, the project summary and the enabled tools` (AGL-03). The helper `toolNamesOf` (line 168) sorts the names, and `search_notes` sorts last.
      - Line 362: `expect(toolNamesOf(first)).toEqual(['list_files', 'read_file']);` becomes `expect(toolNamesOf(first)).toEqual(['list_files', 'read_file', 'search_notes']);`.
      - Line 373: `expect(toolNamesOf(records[1])).toEqual(['list_files', 'read_file']);` becomes `expect(toolNamesOf(records[1])).toEqual(['list_files', 'read_file', 'search_notes']);`. The comment at line 371 ("the offered tools are still the project family's: no research tool exists at M1") stays true and is not changed.
    - Run `npx prettier --write apps/api/test/agent-loop-tools.test.ts apps/api/test/agent-loop-run.test.ts` from the root (the arrays may be rewrapped). Then from `apps/api`, run `npx vitest run test/agent-loop-tools.test.ts test/agent-loop-run.test.ts`. Expected: every test of both files passes. `git diff --stat -- apps/api/test/agent-loop-tools.test.ts apps/api/test/agent-loop-run.test.ts` shows only these four expectations changed (insertions of `'search_notes'`, plus any line wrapping by Prettier), and `git diff -- <the two files> | grep '^-' | grep -v '^---'` shows only the old forms of the four expected arrays.
8. **Full API suite.** Run `npm test -w @bbartolome/scriba-api` (the build, then every Vitest file). Expected: exit 0, including the AGL-02 and AGL-03 test files (with the step 7 edits) and the invariant tests. No route is added, so `invariant-sweep.ts` is not edited.
9. **Lint and format.** Run `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api/src/modules/agent-loop apps/api/test/agent-loop-search.test.ts apps/api/test/agent-loop-tools.test.ts apps/api/test/agent-loop-run.test.ts`. Expected: both exit 0. If a lint rule flags the code, fix the code and keep the behaviour in section 4.
10. **Commit the source.** `git commit -m "feat(AGL-10): search_notes project tool" -- apps/api/src/modules/agent-loop/tools/tool-types.ts apps/api/src/modules/agent-loop/tools/builtin-tools.ts apps/api/src/modules/agent-loop/agent-tools.service.ts`. Then commit the step 7 edits on their own: `git commit -m "test(AGL-10): offer search_notes in the expected project-family tool lists (AGL-02 AC3, AGL-03 C6)" -- apps/api/test/agent-loop-tools.test.ts apps/api/test/agent-loop-run.test.ts`. Commit before the mutation checks, so that `git checkout -- <file>` restores committed source (the AGL-02 plan step 9 rule).
11. **Mutation checks.** One at a time: make the change, run the named test file, undo it with `git checkout -- <file>`. Expected: the named test fails under each change.
    - M1: remove `additionalProperties: false` from the schema. Expected failure: AC2 case f.
    - M2: remove `minimum: 1` from `limit`. Expected failure: AC2 case d.
    - M3: remove `enum` from `items`. Expected failure: AC2 case e.
    - M4: pass `{...input, scope: ['entities']}` to `search`. Expected failure: AC1.
    - M5: return the passages reversed. Expected failure: AC1 (the order and the strict decrease).
    - The `ModuleError` conversion (C-3) has no mutation check, because no criterion covers it (open point 6).
12. **Changed paths.** `git diff --name-status main...HEAD` lists exactly: `M` `tool-types.ts`, `M` `builtin-tools.ts`, `M` `agent-tools.service.ts`, `A` `agent-loop-search.test.ts`, `M` `agent-loop-tools.test.ts`, `M` `agent-loop-run.test.ts`. Expected: no other path (the orchestrator's own `plans/` and `units/` commits on the branch, if any, are excluded).
13. **Record.** Store the Node and npm versions and each command's output. A criterion passes only when its test passes at step 6 and the full suite passes at step 8.

## 4. Acceptance criteria and tests

Both tests are in `apps/api/test/agent-loop-search.test.ts`, and both are scripted turns through the composed app with Platform's mock OpenAI server (D-10).

**Common setup.**
- **Mock.** `beforeAll` writes the two scenario files below to a temp folder and starts `startMockOpenAI({scenariosDir})` (C-9); `afterAll` closes it and removes the folder.
- **Library.** Each test builds its library with `buildProjectsLibrary({settings})` (`project-store-projects.kit.ts` line 30), where `settings` is the YAML text of `{schemaVersion: 1, projects: {schemaVersion: 1, active: 'book'}, providers: {schemaVersion: 1, list: [provider], appDefault: {providerId: 'mock', model: 'mock-model'}}}`. That is the active-project text of `ACTIVE_BOOK_SETTINGS` (`project-store-files.kit.ts` line 40) with a providers section in the shape of `providers-resolution.test.ts` lines 75 to 98. `provider` is a keyless `openai-compatible` config `{id: 'mock', kind: 'openai-compatible', baseURL: <mock.baseUrl>/scenario/<scenario>/v1, model: 'mock-model', ...PROVIDER_DEFAULTS}`, with the test's own scenario. The `agent` section is left to its defaults (step cap 12). Files are written with `putFile(library, 'book/...', text)` (`project-store-files.kit.ts` line 70).
- **App.** `createTestApp({libraryDir: library})` with the default `COMPOSED_MODULES`. A session cookie comes from `sessionCookie(app, library)` (`guard-request.ts` line 80). Each test closes the app and removes the library in a `finally`.
- **One scripted turn** (a helper in the test file): open `openSse(app.baseUrl + '/events', {host: LOOPBACK_HOST, cookie})`; `POST /api/agent-loop/runs` with the loopback Host, the cookie and body `{intent}`; expect HTTP 200 with `{runId, conversationId}` (AGL-03 unit, decision "Start"); read blocks with `dataOf` until the `agent-loop` `run-ended` event with that `runId`; return that run's agent-loop events in arrival order. Every event parses with `agentLoopEventSchema` (`events.ts` line 135), the `seq` values are 1, 2, 3 and so on without gaps, and the turn ends with `run-ended` `reason: 'completed'` and `pendingChangeIds: []`. The next turn starts only after `run-ended`, so one active agent run per project is never hit.
- **Mock records.** `recordsOf(mock, scenario)` (`providers-client.kit.ts` line 61) gives the requests the mock received, in arrival order. The test reads the `endpoint: 'chat'` records.

**Scenario files** (the format of `e2e/fixtures/mock-openai/scenarios/tool-call.json`; matchers of `server.mjs` lines 103 to 139; the streamed tool call of lines 372 to 395):
- `search-notes-ac1.json`: step 0 `{match: {endpoint: 'models'}}` answers the model list of `tool-call.json` step 0; step 1 `{match: {endpoint: 'chat', toolResultPresent: false}}` answers `{kind: 'toolCalls', calls: [{name: 'search_notes', argumentChunks: ['{"query":', '"gamma"}']}]}`; step 2 `{match: {endpoint: 'chat', toolResultPresent: true}}` answers `{kind: 'stream', deltas: ['Three passages found.']}`.
- `search-notes-ac2.json`: step 0 the same models step; then one step per case `x` in a to g, `{match: {endpoint: 'chat', toolResultPresent: false, lastMessageContent: 'case-x'}}`, answering `{kind: 'toolCalls', calls: [{name: 'search_notes', argumentChunks: [<the case's raw arguments>]}]}`; last, `{match: {endpoint: 'chat', toolResultPresent: true}}` answering `{kind: 'stream', deltas: ['Noted.']}`. The intent of case x is `Search the notes, case-x.`, and the matcher reads the last message, which is the intent on the first request of a turn (section 9, AGL-03).

### AC1 (unit line 18): a scripted turn calling `search_notes` gets ranked passages from `sources/`, with `drafts/` never present

Test name: `AC1: a scripted turn calling search_notes gets ranked passages from sources/, and drafts/ never appears`.

Fixture: `book/sources/quotes.md` = `Gamma rays and gamma bursts.\n`; `book/sources/light.md` = `Gamma gamma gamma light.\n`; `book/sources/notes.md` = `A gamma note.\n`; `book/drafts/chapter-1.md` = `Gamma in a chapter draft.\n`. The draft holds the query word, so its absence from the result means something. `buildProjectsLibrary` also writes `book/sources/outline.md` = `# Outline\n` (`project-store-projects.kit.ts` line 48), which is indexed and does not match; it changes the bm25 averages, so the order was probed again with all four rows (section 8). Provider scenario: `search-notes-ac1`.

One scripted turn with intent `Find gamma in my notes.`

Expected, SSE events (in `seq` order): `run-started`; then for the one call `tool-call-started` with `name: 'search_notes'` and `family: 'project'`; `tool-call-args` with the same `callId`, `arguments` equal to `{query: 'gamma'}` and `valid: true`; `tool-call-result` with the same `callId`; no `tool-call-error` event in the turn; `token-delta` events whose texts join to `Three passages found.`; `run-ended` with `reason: 'completed'`.

Expected, tool result (the `tool-call-result` data): `summary` is exactly `Found 3 passages for "gamma".`; `output.passages` has three entries whose paths are, in order, `sources/light.md`, `sources/quotes.md` and `sources/notes.md`; their scores are strictly decreasing; every path starts with `sources/`, so none starts with `drafts/` and none is written with a `book/` prefix.

Expected, mock's received requests: exactly two chat records. The first (step 1) has a `tools` array with a function named `search_notes` whose `parameters` are the C-4 schema, with property keys `query`, `limit` and `scope` and `required: ['query']`. The second (step 2) carries the tool call and its result: an assistant message whose `tool_calls` hold one call with `function.name: 'search_notes'`, `function.arguments` `{"query":"gamma"}` and `id` equal to the events' `callId`, followed by a message with `role: 'tool'`, the same `tool_call_id`, and `content` equal to `JSON.stringify(output)` of the `tool-call-result` event (C-1). The content parses to passages with the same three paths, so no `drafts/` path reaches the model either.

The order and the distinct scores were checked by a probe on the same four rows in FTS5 (section 8). The test confirms them through the service and the loop.

### AC2 (unit line 19): invalid arguments get the readable error

Test name: `AC2: invalid search_notes arguments in a scripted turn get the readable error`.

Fixture: the library of the common setup, no further file. Provider scenario: `search-notes-ac2`. Each case is one scripted turn with intent `Search the notes, case-x.`, so each case is its own agent run and counts do not carry between cases (D-4).

Expected line, the same in every case: `Expected arguments for search_notes: query (string, required), limit (integer, optional), scope (array, optional).`

| Case | Raw arguments the mock streams | Problem line |
|---|---|---|
| a | `{}` | `query: is required` |
| b | `{"query":3}` | `query: must be a string` |
| c | `{"query":""}` | `query: must NOT have fewer than 1 characters` |
| d | `{"query":"gamma","limit":0}` | `limit: must be >= 1` |
| e | `{"query":"gamma","scope":["drafts"]}` | `scope/0: must be equal to one of the allowed values` |
| f | `{"query":"gamma","extra":1}` | `extra: is not an argument of this tool` |
| g | `{"query": ` (cut short) | `arguments: is not valid JSON` |

Expected for every case, SSE events: `tool-call-started` with `name: 'search_notes'`; `tool-call-args` with `valid: false` (D-5); `tool-call-error` with the same `callId`, `attempt: 1`, no `withdrawn`, and `message` exactly the problem line, then a newline, then the expected line; no `tool-call-result` event in the turn; `run-ended` with `reason: 'completed'` after the mock's `Noted.` reply. In cases a to f the `tool-call-args` `arguments` is the parsed object; in case g it is the raw string (`events.ts` line 30).

Expected for every case, mock's received requests: the case's turn adds exactly two chat records (the test compares the record count before and after the turn). The first offers `search_notes` in `tools`. The second carries the assistant tool call with `function.name: 'search_notes'` and the case's raw arguments, and a `role: 'tool'` message with the same `tool_call_id` whose `content` contains the problem line and the expected line (section 9, AGL-03: the error text is what goes back to the model).

The problem lines come from the renderer of AGL-02 (`readable-error.ts` lines 54 to 58 and 70 to 72, and the `type` branch at lines 47 to 53) applied to Ajv 8.20.0 errors (section 8). Case g is `argumentIssues` in `tool-run.ts` line 47.

## 5. Downstream agreement

| Unit | What it needs from AGL-10 or from the shared files | Agreement |
|---|---|---|
| **AGL-02** tool framework (done; `plans/AGL-02.md` line 3) | Its section 5 AGL-10 row (line 186) expects one definition in `builtin-tools.ts` and says "No other AGL-02 file changes". | This plan also edits `tool-types.ts` (C-5: `ToolSchemaProperty` has no `'array'`, lines 27 to 30, so `scope` cannot be typed) and `agent-tools.service.ts` (the constructor takes only `FilesService`, line 21, so `SearchService` must be injected). Both edits are additive. Line 186 is a forecast in a done plan, not a decision that done code relies on. AGL-02's kit does not change, and AGL-10 does not use the kit (D-10). AGL-02's test AC3 asserts the exact offered list, so step 7 adds `search_notes` to its two expected lists (`agent-loop-tools.test.ts` lines 299 and 349 to 352); the withdrawal and reset behaviour it checks is unchanged and every assertion stays. |
| **AGL-03** loop core (now a blocker of AGL-10: unit line 7; AGL-03 `unblocks` line 9; no plan) | AGL-10 needs from AGL-03: the start route, the agent-loop SSE events, the providers-client step through the mock, the tool schemas of the `project` family in the request, and the tool results and errors appended as `role: 'tool'` messages (AGL-03 unit decisions; section 9). AGL-03 needs from AGL-10: nothing. AGL-03 is done and merged (`13b505a`). | AGL-03's test C6 asserts the exact offered tools of a run, so step 7 adds `search_notes` to its two expected lists (`agent-loop-run.test.ts` lines 362 and 373); nothing else in C6 changes. AGL-03 calls `AgentToolsService.startRun` and does not build `AgentToolsService` itself, so the new constructor parameter does not reach it. If AGL-03 edits the same constructor or `builtin-tools.ts`, AGL-10 lands after it and applies its edits to the merged lines, keeping AGL-03's parameters. |
| **AGL-11** narrative gate (`blocked_by` line 7; criterion line 22) | "AGL-09 and AGL-10 criteria pass on `main`." | AC1 and AC2 stay on `main` as written, already as mock turns through the composed app, so AGL-11 needs no further version of them. AGL-11 changes no file of this plan. |
| **AGL-16** grounding engine (`blocked_by` line 7; decision 2, line 19) | Passages of `sources` only, from the in-process search: `SearchService.search(projectId, {query, scope: ['sources']})`. | AGL-10 changes no part of the service and adds no export, so AGL-16 needs nothing from AGL-10. Its `blocked_by` is left as it is (open point 5). |
| **AGL-09** narrative tools (parallel with AGL-10; decisions line 18) | Registry tools added at run start. A registry tool with a reserved name is left out (`modules/agent-loop.md` line 52). Registry errors rendered readably. | Either order. `search_notes` is reserved already (`constants.ts` line 36), so AGL-09 leaves out a registry tool of that name whether or not AGL-10 has landed. If AGL-09 widens `tool-types.ts`, it keeps the members of C-5. |
| **AGL-12** write overlay (parallel with AGL-10; decisions lines 18 to 21) | `write_file` and `edit_file` added to `builtin-tools.ts`; `read_file` reads the run overlay. | Either order, by the merge rule below. Its tests call `read_file`, `write_file` and `edit_file`, not `search_notes`. |
| **AGL-25** eval script (parallel with AGL-10; ungated) | Nothing from this plan. | No overlap: it adds a script and data files. |
| **PST-14** search box UI (`blocked_by` PST-10, PST-13; no plan) | The POST search route and the ranking of the service. | Unchanged by AGL-10. |

**Merge rule for `builtin-tools.ts` and `agent-tools.service.ts` (either order).** Each unit adds its own imports, its own parameters (AGL-10 adds `search` after the existing parameters) and its own definitions to the returned array. After the second merge the file has the imports of both, the parameters of both, and every definition in the array (for example `[listFiles, readFile, searchNotes, writeFile, editFile]`). The textual conflicts sit on the import, signature and return lines, and the resolution keeps both sides. Nothing in one unit's tests depends on the other unit's definitions, except that AGL-10's tests run through AGL-03's loop.

**Merge rule for `tool-types.ts` (either order).** AGL-10 adds `'array'`, `items`, `minimum` and `minLength`. Any other unit that widens `ToolSchemaProperty` adds its members to the same union or as optional keys. No unit removes a member. `expectedSummary` (`readable-error.ts` lines 76 to 86) reads only `type`, so an array property shows as `(array, optional)`.

## 6. Open points

Revision status: all points are closed. Point 1 was closed by the Navigator; points 2 to 6 by the earlier revision with the simplest option.

1. **Closed by the Navigator (option B). Seam of criterion 1 ("a scripted turn").** Source: `plans/DECISIONS.md` line 4280, "2026-11-15 — AGL-10 — Navigator decision: test seam for criterion 1" (session `d7484d0c3c21484d913089ae0bad89b1`, commit `6fa489a`). AGL-10's criteria heading (unit line 17) has no seam parenthetical, so `units/README.md` line 57 gives the module default, `modules/agent-loop.md` line 62; the AGL-02 kit allowance (`units/AGL-02-tool-framework-file-reads.md` line 24) is AGL-02's own and is not borrowed. Applied: AGL-03 added to AGL-10's `blocked_by` and AGL-10 to AGL-03's `unblocks` (commit `d787da3`); both criteria are scripted turns through the composed app with the mock OpenAI server (D-10, section 4); the kit procedure is removed. Options A (kit call as the scripted turn) and C (split criterion 1 into AGL-26) were rejected. Effect: AGL-10 is not runnable until AGL-03 is on `main` (Base paragraph).
2. **Closed. AGL-10's blocker text.** `units/AGL-10-search-notes.md` line 7 writes `"Project store phase:search (PST-13)"`; `units/README.md` line 63 gives the form `"Project store search (PST-13)"` for one unit of a phase. The blocking unit is the same (PST-13, done), so nothing is in the way. No unit change (YAGNI).
3. **Closed. Default scope.** Both folders, the contract's and the service's default (C-2).
4. **Closed. Ajv wording.** Keep AGL-02 plan S2: `readable-error.ts` is done code (AGL-02, `plans/AGL-02.md` line 3) and its default case passes Ajv's message (lines 54 to 58). Cases c, d and e keep Ajv's wording. No renderer change.
5. **Closed. AGL-16's blocker on AGL-10.** Not in the way of this plan; AGL-16's own planner may revisit it. No unit change (YAGNI).
6. **Closed. The refusal path is untested.** Accepted gap: C-3 stays (correct attribution for a tool without `path`, as AGL-02 plan line 186 forecasts), and no third test is added, because the plan has one test per criterion. There are five mutation checks (M1 to M5), and C-3 has none.

## 7. Shared files with draft and planned plans

`grep -l '^status: \(draft\|planned\)' plans/*.md` at `d787da3` gives `plans/AGL-10.md` (this plan), `plans/GRR-01.md` and `plans/MPR-08.md`. Their paths to change are `packages/contracts/src/graph-runner/**` and `packages/contracts/test/**` (GRR-01, its "only these paths change" line), and `apps/api/test/providers-gate.test.ts` (MPR-08: `git diff --name-only main...unit/MPR-08`). None of those is a path of this plan. `grep -ln "builtin-tools\|tool-types\|agent-tools.service\|agent-loop-search" plans/*.md` gives only `plans/AGL-02.md` (done), `plans/AGL-10.md` and `plans/DECISIONS.md`. No overlap in either order.

Units without a plan that touch the same files are AGL-03, AGL-09, AGL-12, AGL-16 and PST-14. Their changes are taken from their unit files, as section 5 states. AGL-03 lands first by the new blocker, so its changes are on `main` when AGL-10 runs (step 0). The plans that exist for the agent loop (AGL-01, AGL-02, AGL-06, AGL-07) are done and change none of the files of this plan beyond AGL-02's own: AGL-02 created `builtin-tools.ts`, `tool-types.ts` and `agent-tools.service.ts`, which this plan edits.

## 8. Facts checked

Unit, module and decision:
- `units/AGL-10-search-notes.md`: front matter lines 1 to 10 (`blocked_by` line 7 now `[AGL-02, AGL-03, "Project store phase:search (PST-13)"]`); Decisions line 15; criteria heading line 17 (no parenthetical); criteria lines 18 and 19.
- `units/AGL-03-loop-core.md`: `blocked_by` line 7 (AGL-02, AGL-06, MPR-08, SAU-08); `unblocks` line 9 now `[AGL-04, AGL-05, AGL-08, AGL-10]`; decisions (start route, binding to the active project, no provider, messages each step, step, events, `run-ended` pending change IDs); criteria heading "(mock OpenAI server)".
- `plans/DECISIONS.md` line 4280 (the Navigator decision, option B), line 4204 (the `valid` reading).
- `plans/QUEUE.md` line 2 (`AGL-03 | M1 | available: no | M1 demo path; waits on MPR-08 (planned)`).
- `units/README.md` line 57 (seam parenthetical rule), line 63 (blocker form), line 136 (testing).
- `units/AGL-02-tool-framework-file-reads.md` line 24 (the kit allowance, AGL-02 only).
- `modules/agent-loop.md` lines 49 (module shape), 51 (dependencies), 52 (reserved names), 53 (JSON Schema, Ajv, readable errors), 56 (only `sources/` is grounding evidence), 61 to 63 (testing: external behaviour, primary seam, assertions), 67 (real models).
- `modules/project-store.md` line 48 (a search names the active project; a non-active project fails).
- `units/AGL-09-narrative-tools.md` (decisions line 18); `units/AGL-11-narrative-gate.md` (`blocked_by` line 7; criterion line 22); `units/AGL-12-write-overlay.md` (decisions lines 18 to 21); `units/AGL-16-grounding-engine.md` (`blocked_by` line 7; decision 2 at line 19); `units/PST-14-search-box-ui.md` (`blocked_by` line 7).

Plans:
- `plans/AGL-02.md`: status line 3; D9 line 36; D10 line 37; D11 line 38; D15 line 42; S1 line 48; S2 line 49; S5 line 58; S6 line 62; S7 line 67; S8 line 68; S10 line 70; S17 line 81; S18 line 82; the AGL-10 row of section 5 at line 186.
- `plans/PST-13.md`: status line 3; S2 line 19; P3 line 39; P10 line 46; P15 line 51; P16 line 52; P17 line 53; S16 line 33.
- No `plans/AGL-03.md` exists.

Code (at `d787da3`; unchanged since `a04eb7d`):
- `packages/contracts/src/project-store/search.ts` lines 5 to 9 (request), 12 to 17 (passage), 20 (result).
- `packages/contracts/src/agent-loop/constants.ts` lines 9 to 15 (families), 31 to 43 (reserved names; `search_notes` at line 36).
- `packages/contracts/src/agent-loop/routes.ts` line 3 (`AGENT_RUNS_ROUTE = '/api/agent-loop/runs'`).
- `packages/contracts/src/agent-loop/events.ts`: lines 12 to 15 (base `runId`, `seq`), 24 to 28 (`tool-call-started`: `callId`, `name`, `family`), 30 to 35 (`tool-call-args`: `arguments` parsed or raw, `valid`), 38 to 45 (`tool-call-result`: `summary`, `output`), 47 to 52 (`tool-call-error`: `message`, `attempt`, `withdrawn?`), 68 to 72 (`run-ended`: `reason`, `pendingChangeIds`), 135 to 146 (`agentLoopEventSchema`, module `agent-loop`). `ids.ts` line 9 (`seq` starts at 1).
- `apps/api/src/app.module.ts` lines 19 to 26 (`COMPOSED_MODULES`, including `ProvidersModule`, `ProjectStoreModule` and `AgentLoopModule`).
- `apps/api/test/create-test-app.ts` lines 9 to 27 (options and `TestApp`), line 65 (`createTestApp`).
- `apps/api/test/sse.ts` line 31 (`openSse(url, headers)`), line 66 (`dataOf`). `apps/api/test/guard-request.ts` line 80 (`sessionCookie`). `apps/api/test/invariant-sweep.ts` line 38 (`LOOPBACK_HOST`).
- `apps/api/test/providers-client.kit.ts` lines 9 to 16 (re-export of `startMockOpenAI` from `e2e/fixtures/mock-openai/server.mjs`), line 61 (`recordsOf`, `GET /__mock/scenarios/<name>/requests`).
- `apps/api/test/providers-resolution.test.ts` lines 75 to 98 (a keyless mock provider at `<baseUrl>/scenario/<scenario>/v1`, and a `settings.yaml` with `providers: {schemaVersion: 1, list, appDefault}`). `packages/contracts/src/providers/model.ts` lines 5 to 8 (`appDefault` is `{providerId, model}`).
- `apps/api/test/providers-connection-test.test.ts` lines 182 to 191 (a test-owned `scenariosDir`).
- `e2e/fixtures/mock-openai/server.mjs`: line 17 (`startMockOpenAI({scenariosDir})`), lines 51 to 83 (scenario files: `{steps}`, name from the file name), lines 103 to 139 (matchers `endpoint`, `attempt`, `turnIndex`, `lastMessageRole`, `lastMessageContent`, `toolResultPresent`; the first matching step wins), lines 264 to 312 (every request is recorded with its body and step), lines 372 to 395 (a streamed tool call; the id defaults to `call_mock_<index>`). `server.d.mts` (`MockOpenAIRecord`). `scenarios/tool-call.json` (the models step and the tool-call then stream pattern).
- `project-store-projects.kit.ts` line 30 (`buildProjectsLibrary({settings})`), line 48 (`book/sources/outline.md`). `project-store-files.kit.ts` line 40 (`ACTIVE_BOOK_SETTINGS`), line 70 (`putFile`).
- `apps/api/src/modules/project-store/project-store.module.ts`: line 24 (entry export of `SearchService`), lines 59 to 65 (`exports`, `SearchService` at line 64).
- `apps/api/src/modules/project-store/search.service.ts`: line 24 (`DEFAULT_LIMIT`), line 27 (`SCOPE_PREFIXES`), lines 30 to 39 (`scopeClause`), lines 95 to 117 (`search`), lines 199 to 210 (`projectFor`; line 200 `requireActive`).
- `apps/api/src/modules/project-store/project-store.service.ts` lines 66 to 80 (`requireActive`).
- `apps/api/src/modules/agent-loop/agent-loop.module.ts`: line 28 (imports `PlatformModule` and `ProjectStoreModule`), line 42 (`exports`).
- `apps/api/src/modules/agent-loop/agent-tools.service.ts`: line 4, line 21 (constructor), line 24 (`builtinTools(files)`).
- `apps/api/src/modules/agent-loop/tools/builtin-tools.ts`: lines 1, 2, 4 and 5, 24, 82.
- `apps/api/src/modules/agent-loop/tools/tool-types.ts`: lines 17 to 25 (`ToolArgumentError`), 27 to 30 (`ToolSchemaProperty`), 33 to 38, 46 to 50 (`modelText?`), 53 to 60, 76 and 77 (`result` and `error` outcomes).
- `apps/api/src/modules/agent-loop/tools/tool-run.ts`: line 2, line 47 (`is not valid JSON`), line 97 (`NOT_OFFERED`), line 132 (`modelText` default `JSON.stringify(output)`), lines 136 to 145.
- `apps/api/src/modules/agent-loop/tools/readable-error.ts`: lines 8 to 15, 47 to 53, 54 to 58, 70 to 72, 76 to 86.
- `eslint.config.mjs` line 50 (rule R1). `tsconfig.base.json` line 3 (`strict: true`).
- `apps/api/package.json` lines 6 to 8 (scripts) and line 16 (`"ajv": "8.20.0"`). `package-lock.json` line 52 (`apps/api/node_modules/ajv` at 8.20.0) and line 5618 (`node_modules/ajv` at 6.15.0).
- Git: `main` at `d787da3`; `git status --short` prints nothing.

Probes, run in `/tmp` and outside the repository (earlier revision, unchanged inputs):
- Ajv 8.20.0 (the `ajv-formats` copy) with the service's options `{allErrors: true, strict: true}` (`agent-tools.service.ts` line 23) and the C-4 schema gave one error for each of the six schema cases a to f, with the messages that the renderer turns into the problem lines of AC2. Case g is `argumentIssues` in `tool-run.ts` line 47.
- FTS5 on Node v26.13.0 with the passages table of `search-index.ts` line 140 and four rows (the three AC1 sources and `sources/outline.md`), with the service's query (`search.service.ts` lines 101 to 109) and MATCH `"gamma"`: order `sources/light.md` (1.497e-6), `sources/quotes.md` (1.194e-6), `sources/notes.md` (1.032e-6), distinct scores.

## 9. Assumed (not checked here)

AGL-03 (re-read against its merged code at step 0; AGL-03 has no plan and no code yet):
- `POST /api/agent-loop/runs` with `{intent}`, the loopback Host and the session cookie answers 200 with `{runId, conversationId}`, and the run is bound to the active project `book` (AGL-03 unit, decision "Start").
- The loop resolves the provider from the `providers` section's `appDefault` through the providers client, streams the chat request to the mock, and publishes the agent-loop events of `events.ts` on `/events` with a per-run `seq` from 1 (AGL-03 unit, decisions "Step" and "Events").
- The loop enables the `project` family for each run, as the AGL-02 kit does (kit line 45), so `search_notes` is in the request's `tools` with its schema as `parameters` (AGL-02 plan S13 to S15, `ToolRun.schemas()`).
- The intent is the last message of the first chat request of a turn (AGL-03 unit, decision "Messages each step": system prompt, project summary, conversation, then the intent), so the `lastMessageContent` matcher selects the AC2 case.
- After a tool call the loop sends a second chat request with the assistant message carrying `tool_calls` (the provider's `id`, `function.name`, `function.arguments` as streamed) and one `role: 'tool'` message per call with `tool_call_id` equal to the event `callId`; its `content` is the outcome's `modelText` for a result and contains the readable error `message` for an error (module line 3: malformed calls are retried, so the error text goes back to the model).
- A text reply with no tool calls ends the run with `reason: 'completed'` and `pendingChangeIds: []` (AGL-03 unit decisions "Step" and "`run-ended`").
- `/events` accepts the loopback Host and the session cookie as other guarded routes do.

Other:
- The AC1 and AC2 expected strings hold in the test run. Section 8 checked them by reading the renderer and by the Ajv probe, not by running the test.
- The probe's ranking holds for the service (chunking by `chunkText` gives one passage per one-line file, `search-index.ts` lines 81 to 107; the full service path is not run).
- `npm ci` at step 0 installs `apps/api/node_modules/ajv` at 8.20.0, as the lockfile says. It was not run here.
- `search` throws a `ModuleError` for a project that is not active, as read at `project-store.service.ts` lines 66 to 80. No test exercises it.
- The future changes of AGL-09 and AGL-12 are as their unit files state. Neither has a plan.

## 10. Review parts

One part, because the plan is small (three edited source files, one new test file, four expected arrays in two existing test files). Each step and each test is in exactly this part.

**AGL-03.** AGL-03 is merged on `main` (`13b505a`), so the part can be implemented and reviewed against running code.

- **Part 1: the tool, its schema, the two scripted-turn tests and the two existing offered-tool lists.** Steps 0 to 13 (preconditions including AGL-03 on `main`, branch, red tests, the three source edits, green, the step 7 edits of the existing tests AGL-02 AC3 and AGL-03 C6, full suite, lint and format, source and test commits, mutation checks, changed paths, record). Tests: AC1 (`AC1: a scripted turn calling search_notes gets ranked passages from sources/, and drafts/ never appears`) and AC2 (`AC2: invalid search_notes arguments in a scripted turn get the readable error`); the changed existing tests `AC3: a tool is withdrawn on the third consecutive invalid call, and a valid call resets the count` (`agent-loop-tools.test.ts`) and `C6: the request has the system prompt, the project summary and the enabled tools` (`agent-loop-run.test.ts`).

## 11. Revision log

### Revision 1 (2026-11-15, reviser, at `main` `07ebb8d`)

Checked by the reviser (cat -n, grep, git, probes): unit lines 7, 15, 17 to 19; `units/README.md` lines 57, 63; `modules/agent-loop.md` lines 49 to 58 and 61 to 67; `units/AGL-02-tool-framework-file-reads.md` line 24; downstream units AGL-11 and AGL-16 and the parallel units AGL-09 and AGL-12; `plans/AGL-02.md` lines 3, 30 to 45 and 186; `plans/DECISIONS.md` by grep; the agent-loop tool sources, `search.service.ts`, `project-store.service.ts`, `project-store.module.ts`, the search contract, the AGL-02 kit and test, the project-store kits; the two probes of section 8.

Corrections: base moved to `07ebb8d`; the AC1 fixture gained the indexed `sources/outline.md` and the ranking was probed again; AC2 strings re-probed with the service's Ajv options; section 5 gained an AGL-02 row; open points 2 to 6 closed; open point 1 restated with three options for the Navigator; section 7 re-checked. Unit changes: none.

### Revision 2 (2026-11-15, reviser, at `main` `d787da3`): the Navigator's seam decision

Decision applied: `plans/DECISIONS.md` line 4280, option B (commit `6fa489a`).

Unit change, committed first and on its own as `d787da3` (`docs(AGL-10,AGL-03): add AGL-03 to the blockers of AGL-10 (navigator seam decision)`): `units/AGL-10-search-notes.md` line 7 gains AGL-03; `units/AGL-03-loop-core.md` line 9 (`unblocks`) gains AGL-10, so the two stay exact inverses. No acceptance criterion text changed.

Plan changes:
1. Front matter: `status: planned`; base `d787da3`, with the note that the plan runs only once AGL-03 is on `main`.
2. Base paragraph: the third base, the diff since `07ebb8d`, and a "Waits on AGL-03" paragraph.
3. Section 0: the availability bullet now names AGL-03 as an open blocker; the seam bullet states the decision instead of open point 1.
4. Section 1: D-5 names the `tool-call-args` event; D-10 rewritten to the composed app, the mock OpenAI server and scripted turns, kit not used; C-1 cites `tool-run.ts` line 132; C-7 rewritten (shared helpers, not copies of the kit test's helpers); C-9 added (test-owned scenario files).
5. Section 2: the test file's purpose; a note on line numbers after AGL-03 lands; the "Not changed" list adds `e2e/fixtures/mock-openai/**`.
6. Section 3: step 0 checks that AGL-03 is on `main` and re-reads the AGL-03 assumptions, and drops the earlier `node_modules` notes that are only needed for `npm ci`; step 2's red reason is restated for a turn; steps 4, 5 and 7 allow for AGL-03's merged code.
7. Section 4: rewritten. Common setup (mock with test-owned scenarios, library with a providers section, composed app, one scripted turn helper, mock records); two scenario files; AC1 and AC2 as scripted turns with assertions on the SSE events, the tool result and the mock's received requests. The fixture (AC1: `sources/quotes.md`, `sources/light.md`, `sources/notes.md`, `drafts/chapter-1.md` and the `outline.md` that the library builder writes) and the AC2 cases a to g with their problem lines and expected line are kept. One test per criterion. The kit-based procedure is removed.
8. Section 5: the AGL-02 row notes the kit is not used; an AGL-03 row as a blocker; the AGL-11 row no longer depends on an open point.
9. Section 6: open point 1 closed with the decision and its source.
10. Section 7: re-checked at `d787da3`; AGL-03 lands before AGL-10.
11. Section 8: adds the decision, AGL-03's unit lines, the queue line, the events and routes contracts, the composed modules, the SSE, guard and providers test helpers, and the mock server's scenario format, matchers and records.
12. Section 9: an AGL-03 group of assumptions to re-read at step 0; the kit assumption is replaced.
13. Section 10: states that the part waits on AGL-03 on `main`.

Checked by the reviser at `d787da3` (cat -n, grep, git): `plans/DECISIONS.md` lines 4280 to 4285; `units/AGL-10-search-notes.md` and `units/AGL-03-loop-core.md` in full, before and after the unit commit; `modules/agent-loop.md` lines 1 to 83; `units/README.md` lines 55 to 58; `plans/QUEUE.md` lines 1 to 5, 37 and 59; `git diff --name-only 07ebb8d d787da3`; `apps/api/src/app.module.ts` lines 15 to 35; `apps/api/test/create-test-app.ts` lines 1 to 80; `sse.ts` in full; `guard-request.ts` lines 75 to 100; `providers-client.kit.ts` in full; `providers-resolution.test.ts` lines 70 to 140; `providers-connection-test.test.ts` lines 55 to 75 and 180 to 200; `project-store-files.kit.ts` lines 30 to 80; `project-store-projects.kit.ts` lines 30 to 42; `e2e/fixtures/mock-openai/server.mjs` lines 1 to 200 and 256 to 460, `server.d.mts`, `scenarios/tool-call.json` and `scenarios/malformed-tool-call.json`; `packages/contracts/src/agent-loop/events.ts` lines 1 to 150, `routes.ts`, `ids.ts`; `packages/contracts/src/providers/model.ts` lines 5 to 8; `tool-types.ts` and `tool-run.ts` by grep for the outcome shapes and `modelText`; `agent-loop-tools.kit.ts` lines 36 to 72 (to confirm what the kit did and that it is no longer used). No probe was re-run: the fixture and the AC2 inputs are unchanged.

Not checkable now: everything AGL-03 will add (section 9, AGL-03 group). Step 0 makes the implementer re-read it.

### Revision 3 (2026-11-15, reviser, at `main` `53bda67`): PLAN DOES NOT WORK at step 7 (now step 8)

Cause (`plans/DECISIONS.md`, entry "2026-11-15 — AGL-10 — PLAN DOES NOT WORK"): the full suite failed in two existing tests that assert the exact offered `project`-family tools, `agent-loop-tools.test.ts` AC3 (line 299) and `agent-loop-run.test.ts` C6 (line 362). The plan listed `agent-loop-tools.test.ts` as not changed and did not name `agent-loop-run.test.ts` (added by AGL-03 after the plan's base).

Plan changes:
1. Front matter: `status: planned`; base `53bda67`, AGL-03 merged, branch `unit/AGL-10` with `2436b40`.
2. Base: a revision 3 paragraph.
3. Section 2: two rows for the two existing test files; the "Not changed" list narrowed accordingly.
4. Section 3: step 1 notes how to continue on the existing branch; new step 7 adds `'search_notes'` to the four exact expected lists (lines 299 and 349 to 352 of `agent-loop-tools.test.ts`; lines 362 and 373 of `agent-loop-run.test.ts`; line 349 was not yet reached by the failed run but fails next for the same reason). Old steps 7 to 12 become 8 to 13; step 10 also commits the two test files on their own; step 12 lists the two `M` paths; step 13 refers to step 8.
5. Section 5: the AGL-02 and AGL-03 rows name the changed tests.
6. Section 10: the part covers step 7 and the two changed tests; AGL-03 is merged.
No acceptance criterion text changed, and no test is weakened: the edits only add one name to four expected arrays.

Checked by the reviser (sed, grep, git): `plans/DECISIONS.md` lines 4395 to 4412; `agent-loop-tools.test.ts` lines 87 to 94, 271 to 360; `agent-loop-run.test.ts` lines 168 to 170, 335 to 380; `agent-loop-tools.kit.ts` lines 40 to 71; `tool-run.ts` lines 57 to 89 (offered order is definition order); `grep -rn "'list_files'" apps/api/test` (only the four lines); the worktree diff of `unit/AGL-10` (the three source edits, which match steps 3 to 5); `git merge-base main unit/AGL-10` (`1b8c367`) and an empty code diff from it to `main`. Unit changes: none.
