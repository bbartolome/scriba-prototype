---
id: AGL-10
status: draft
title: search_notes project tool
unit: units/AGL-10-search-notes.md
base: main at 07ebb8d, working tree clean (revised; drafted at a04eb7d)
---
# AGL-10 plan - search_notes project tool

Agent loop, `phase:narrative-tools`, M2. Unit `units/AGL-10-search-notes.md`: front matter at lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9), Decisions at line 15, acceptance criteria at lines 18 and 19.

Base. This plan was drafted at `main` `a04eb7d`. The queue and the blockers were first read at `7ebc225`; `main` gained one commit in between, which appends 7 lines at the end of `plans/DECISIONS.md` (`git diff --stat 7ebc225 a04eb7d`). Every citation below holds at `a04eb7d`.

Revision (2026-11-15, at `main` `07ebb8d`). `git diff --name-only a04eb7d 07ebb8d` lists only `apps/web/src/app/features/providers/**` (MPR-10), `plans/MPR-10.md`, `units/MPR-10-connection-test-ui-hints.md` and this file. `git diff --stat a04eb7d main -- apps/api packages modules units/AGL-* eslint.config.mjs package-lock.json apps/api/package.json` prints nothing, so every code, unit and module citation below still holds at `07ebb8d` (re-read by the reviser where section 11 says so). The revision log is section 11.

Tags: **checked** means the planner read the file and line, or confirmed it by grep, git or a probe. **assumed** means a belief not checked here (section 9). The planner changed no file except this one and ran no build, install or test in the repository. Two probes ran in `/tmp`, outside the repository (section 8).

## 0. Summary

- Adds one built-in tool, `search_notes {query, limit?, scope?}`, to the Agent loop's dispatcher. It calls the Project store's `SearchService.search` in-process on the run's project and returns the ranked passages, with project-relative paths, as the tool result. The name is already reserved and the family `project` already exists (checked: `packages/contracts/src/agent-loop/constants.ts` lines 9 to 15 and 36).
- Availability (checked). `plans/QUEUE.md` line 7: `AGL-10 | M2 | available: yes | M2 demo path; all blockers done`. `plans/AGL-10.md` did not exist. Both blockers are done and on `main`: AGL-02 (`plans/AGL-02.md` line 3 `status: done`; commits `0066c97` and `d831067` are ancestors of `main`) and PST-13 (`plans/PST-13.md` line 3 `status: done`; commits `12d33c6`, `e96dc98` and `39d3b58` are ancestors of `main`). The unit file has no status field, and nothing marks it done or blocked.
- Change set: three existing files in `apps/api/src/modules/agent-loop/` and one new test file. No route, no contract, no dependency and no module wiring change. The composed app and its invariant sweeps are unchanged.
- Criterion 1 says "a scripted turn". The loop (AGL-03) is not on `main` and has no plan, so the test calls the dispatcher through the AGL-02 test-only kit, the seam that AGL-02 D9 names until AGL-03 exists. AGL-10's criteria heading (unit line 17) has no seam parenthetical, so by `units/README.md` line 57 the module default applies (composed app, mock server, scripted turns; `modules/agent-loop.md` line 62). Whether the kit seam may stand for "a scripted turn" is a reading of criterion text and is open for the Navigator (open point 1). It is the only open point.
- Two tests, one per acceptance criterion (section 4).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contracts, DECISIONS and earlier plans

- **D-1. Shape of the tool (unit line 15).** `search_notes {query, limit?, scope?}` calls the Project store search contract in-process on the bound project and returns ranked passages `{path, offset, snippet, score}` with project-relative paths.
- **D-2. Name and family (`constants.ts` line 36; AGL-02 plan D15, line 42).** `search_notes` is one of the eleven reserved names. Its family is `project` (`AGENT_TOOL_FAMILIES`, lines 9 to 15), as for AGL-02's tools.
- **D-3. Argument schema and readable errors (`modules/agent-loop.md` line 53; AGL-02 plan S1, S2, S3, S5).** JSON Schema checked by Ajv, `additionalProperties: false`, with the renderer and the expected-arguments line that AGL-02 already has. No new error code (AGL-02 plan D11).
- **D-4. Counting (AGL-02 plan S6, S7, S8).** An invalid call is a counted attempt, and the third consecutive one withdraws the tool. Each AC2 case therefore runs in its own agent run.
- **D-5. Meaning of `valid` (DECISIONS, entry "AGL-02 — Sonnet code review", line 4204).** A call whose arguments fail the schema answers `valid: false`. AC2 asserts that.
- **D-6. Search contract (`packages/contracts/src/project-store/search.ts` lines 5 to 9 and 12 to 20; PST-13 plan S8).** `query` is a string of at least one character. `limit` is an integer of at least 1. `scope` is an array of `sources` and `entities`. A result is an array of `{path, offset, snippet, score}`, best first.
- **D-7. Service behaviour (`search.service.ts` lines 95 to 117 and 199 to 200; PST-13 plan P10, P15, P16, P17).** `search(projectId, request)` is synchronous and in-process. It checks the active project first (`project-store.service.ts` lines 66 to 80; a non-active project gives `PROJECT_NOT_ACTIVE`). An absent `limit` gives 20, with no maximum (`search.service.ts` lines 24 and 109). An absent or empty `scope` means both folders (lines 30 to 32).
- **D-8. Indexed roots (PST-13 plan S2 and P3).** The index holds only files under `sources/` and `entities/`. The query adds the same prefix test (`search.service.ts` lines 27 and 30 to 39). `drafts/` never appears in a result.
- **D-9. Import rule (`eslint.config.mjs` line 50, rule R1; AGL-02 plan D10).** `agent-loop` imports the Project store only through `project-store.module.ts`. That file exports `SearchService` (line 24) and lists it in `exports` (line 64). `agent-loop.module.ts` already imports `ProjectStoreModule` (line 28), so the module file does not change.
- **D-10. Test seam (`units/README.md` line 136; `modules/agent-loop.md` lines 61 and 62; AGL-02 plan D9).** External behaviour only, through the HTTP harness on a temp library. Unit tests never read `examples/`.

### 1b. Small choices this plan makes

- **C-1. Output.** `output` is `{passages}`, the search result as returned, with the contract's fields including `score`. The summary is `Found <n> passages for "<query>".`, with `passage` when n is 1. The model text is the default `JSON.stringify(output)` (AGL-02 plan S10).
- **C-2. Scope default.** An absent `scope` searches both folders, which is the service default (D-7). Source: unit line 15 (the tool "calls the Project store search contract", which gives no other default); `search.service.ts` lines 30 to 32; PST-13 plan P15. `modules/agent-loop.md` line 56 limits grounding evidence, not note search, to `sources/`, and AGL-16 passes `scope: ['sources']` itself (its decision 2, line 19). Decided by revision (open point 3, closed).
- **C-3. Refusal attribution.** AGL-02 plan S18 maps a `ModuleError` to the one issue `path`, because both AGL-02 tools take `path`. `search_notes` has no `path` argument. The handler therefore catches the `ModuleError` from `search` and throws `ToolArgumentError([{path: '', message}])` (AGL-02 plan S17; AGL-02 plan line 186: "Its handler throws `ToolArgumentError` for bad input"), which renders as `arguments: <message>` and counts under AGL-02 plan S7 (d). `tool-run.ts` is not changed. The path is reachable: `search` refuses a project that is not active (`project-store.service.ts` lines 66 to 80) or not found (`search.service.ts` lines 199 to 210), and a run stays bound to its project (unit line 15; `units/AGL-12-write-overlay.md` line 21). No criterion covers it, and the plan adds no test beyond the two criteria (open point 6, closed by revision).
- **C-4. Schema.** Properties in this order: `query` (type string, `minLength: 1`, required); `limit` (type integer, `minimum: 1`, no maximum, as D-7 and PST-13 P15); `scope` (type array, `items: {type: 'string', enum: ['sources', 'entities']}`). `required: ['query']` and `additionalProperties: false` (AGL-02 plan S1, O7). Ajv rejects every key but these three, so the handler passes its argument object to `search` unchanged.
- **C-5. Widened property type.** `ToolSchemaProperty` (`tool-types.ts` lines 27 to 30) gains `'array'` in its `type` union, and three optional members: `items?: {type: 'string'; enum: readonly string[]}`, `minimum?: number` and `minLength?: number`. The change is additive (section 5).
- **C-6. Descriptions.** The tool: "Search the project's notes, the sources and the entities, for a text. Returns the best passages with their project-relative paths. Drafts are never searched." `query`: "The words to look for." `limit`: "The most passages to return. Twenty when left out." `scope`: "The folders to search: sources, entities or both. Both when left out."
- **C-7. Test helpers are copied.** The new test file copies the helpers it needs from `apps/api/test/agent-loop-tools.test.ts` lines 19 to 85 (the constants, `withToolsApp`, `post`, `startRun`, `call` and `callResult`). One test file cannot import helpers from another without changing AGL-02's file.
- **C-8. Header comment.** `builtin-tools.ts` lines 4 and 5 describe the tools as "the built-in read tools of M1". The edit keeps that sentence true for `search_notes`, which reads the index and writes nothing.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/agent-loop/tools/tool-types.ts` | edit | `ToolSchemaProperty`: `'array'` in the type union, and optional `items`, `minimum` and `minLength` (C-5) |
| `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` | edit | line 1 also imports `SearchService`; line 2 also imports `ToolArgumentError` (a value); new imports of `ModuleError` (from `../../platform/platform.module`) and the type `SearchResult` (from `@bbartolome/scriba-contracts/project-store`); header comment (lines 4 and 5, C-8); signature (line 24) gains `search: SearchService` as its second parameter; one new definition `searchNotes`; the returned array (line 82) ends with `searchNotes` |
| `apps/api/src/modules/agent-loop/agent-tools.service.ts` | edit | line 4 also imports `SearchService` from `../project-store/project-store.module`; the constructor (line 21) gains `search: SearchService` after `files`; line 24 becomes `builtinTools(files, search)` |
| `apps/api/test/agent-loop-search.test.ts` | new | the two tests AC1 and AC2 (section 4) |

Not changed (checked, section 7): `tools/tool-run.ts`, `tools/readable-error.ts`, `agent-loop.module.ts`, `agent-loop-tools.kit.ts`, `agent-loop-tools.test.ts`, everything under `apps/api/src/modules/project-store/`, `apps/api/test/invariant-sweep.ts` and `create-test-app.ts` (no route is added, so no sweep entry is needed), `packages/contracts/**`, `apps/web/**`, `units/**`, `modules/**`, and `plans/**` other than this file.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on `main` at the base. Record `node -v` (expected `v26.x`) and `npm -v` beside each result. Do not push, do not open a pull request, and do not add a remote.

0. **Preconditions.** `git status --short` prints nothing. `grep -n "export { SearchService }" apps/api/src/modules/project-store/project-store.module.ts` prints line 24. `grep -n '^status: done' plans/AGL-02.md plans/PST-13.md` prints both. Dependencies: `apps/api/node_modules` is empty and the root `node_modules/ajv` is 6.15.0, while `package-lock.json` line 52 pins `apps/api/node_modules/ajv` at 8.20.0 (section 8). Run `npm ci` at the root. Expected: exit 0, then `cd apps/api && node -p "require('ajv/package.json').version"` prints `8.20.0`.
1. **Branch.** `git switch -c unit/AGL-10` from the clean `main`. Expected: `Switched to a new branch 'unit/AGL-10'`.
2. **Red tests.** Write `apps/api/test/agent-loop-search.test.ts` as section 4 describes, with the helpers of C-7. From `apps/api`, run `npx vitest run test/agent-loop-search.test.ts`. Expected: both tests fail, and the reason is the missing tool: each reply is `This tool is not available in this agent run.` with `valid: false` (AGL-02 plan S8). Then `git add apps/api/test/agent-loop-search.test.ts` and `git commit -m "test(AGL-10): add failing search_notes tests (AC1, AC2)" -- apps/api/test/agent-loop-search.test.ts`.
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

    The function signature becomes `builtinTools(files: FilesService, search: SearchService)`, and the return is `[listFiles, readFile, searchNotes]`. Expected: `grep -n "name: 'search_notes'" apps/api/src/modules/agent-loop/tools/builtin-tools.ts` prints one line, and the return line lists three definitions.
5. **Service.** Edit `agent-tools.service.ts` (section 2). Expected: `grep -rn "tool-registry" apps/api/src/modules/agent-loop` prints nothing (D-9; AGL-02 plan step 5).
6. **Green.** From `apps/api`, run `npx vitest run test/agent-loop-search.test.ts`. Expected: 2 passed.
7. **Full API suite.** Run `npm test -w @bbartolome/scriba-api` (the build, then every Vitest file). Expected: exit 0, including the AGL-02 test file and the invariant tests. No route is added, so `invariant-sweep.ts` is not edited.
8. **Lint and format.** Run `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api/src/modules/agent-loop apps/api/test/agent-loop-search.test.ts`. Expected: both exit 0. If a lint rule flags the code, fix the code and keep the behaviour in section 4.
9. **Commit the source.** `git commit -m "feat(AGL-10): search_notes project tool" -- apps/api/src/modules/agent-loop/tools/tool-types.ts apps/api/src/modules/agent-loop/tools/builtin-tools.ts apps/api/src/modules/agent-loop/agent-tools.service.ts`. Commit before the mutation checks, so that `git checkout -- <file>` restores committed source (the AGL-02 plan step 9 rule).
10. **Mutation checks.** One at a time: make the change, run the named test file, undo it with `git checkout -- <file>`. Expected: the named test fails under each change.
    - M1: remove `additionalProperties: false` from the schema. Expected failure: AC2 case f.
    - M2: remove `minimum: 1` from `limit`. Expected failure: AC2 case d.
    - M3: remove `enum` from `items`. Expected failure: AC2 case e.
    - M4: pass `{...input, scope: ['entities']}` to `search`. Expected failure: AC1.
    - M5: return the passages reversed. Expected failure: AC1 (the order and the strict decrease).
    - The `ModuleError` conversion (C-3) has no mutation check, because no criterion covers it (open point 6, closed: accepted gap).
11. **Changed paths.** `git diff --name-status main...HEAD` lists exactly: `M` `tool-types.ts`, `M` `builtin-tools.ts`, `M` `agent-tools.service.ts`, `A` `agent-loop-search.test.ts`. Expected: no other path.
12. **Record.** Store the Node and npm versions and each command's output. A criterion passes only when its test passes at step 6 and the full suite passes at step 7.

## 4. Acceptance criteria and tests

Both tests are in `apps/api/test/agent-loop-search.test.ts`. Each boots `createTestApp({libraryDir, modules: [PlatformModule, AgentLoopModule, agentLoopToolsKitModule()]})` on `bookLibrary()` (`project-store-files.kit.ts` line 44), whose `ACTIVE_BOOK_SETTINGS` make `book` the active project. Files are written with `putFile(fixture.library, 'book/...', text)` (`project-store-files.kit.ts` line 70). Each agent run starts with `POST /api/agent-loop-test/runs` and body `{projectId: 'book'}`, and each call goes to `POST /api/agent-loop-test/runs/:runId/calls` (`agent-loop-tools.kit.ts` lines 36 to 63; the run has the `project` family, line 45). No model is involved. Each test removes its fixture in a `finally`. The scripted call stands for the scripted turn (open point 1).

### AC1 (unit line 18): ranked passages from `sources/`, and `drafts/` never present

Test name: `AC1: search_notes returns ranked passages from sources/, and drafts/ never appears`.

Fixture: `book/sources/quotes.md` = `Gamma rays and gamma bursts.\n`; `book/sources/light.md` = `Gamma gamma gamma light.\n`; `book/sources/notes.md` = `A gamma note.\n`; `book/drafts/chapter-1.md` = `Gamma in a chapter draft.\n`. The draft holds the query word, so its absence from the result means something. `bookLibrary()` also writes `book/sources/outline.md` = `# Outline\n` (`project-store-projects.kit.ts` line 48), which is indexed and does not match; it changes the bm25 averages, so the order was probed again with all four rows (section 8).

One run, one call: `search_notes` with `{"query":"gamma"}`.

Expected: HTTP 200; `valid: true`; `outcome.kind: 'result'`; `outcome.summary` is exactly `Found 3 passages for "gamma".`; `outcome.output.passages` has three entries whose paths are, in order, `sources/light.md`, `sources/quotes.md` and `sources/notes.md`; their scores are strictly decreasing; every path starts with `sources/`, so none starts with `drafts/` and none is written with a `book/` prefix.

The order and the distinct scores were checked by a probe on the same three rows in FTS5 (section 8). The test confirms them through the service.

### AC2 (unit line 19): invalid arguments get the readable error

Test name: `AC2: invalid search_notes arguments get the readable error`.

Each case is its own agent run, so counts do not carry between cases (D-4). Every case: `valid: false`, `outcome.kind: 'error'`, `outcome.attempt: 1`, no `withdrawn`, and `outcome.message` exactly the problem line, then a newline, then the expected line:

Expected line, the same in every case: `Expected arguments for search_notes: query (string, required), limit (integer, optional), scope (array, optional).`

| Case | Arguments sent as the raw string | Problem line |
|---|---|---|
| a | `{}` | `query: is required` |
| b | `{"query":3}` | `query: must be a string` |
| c | `{"query":""}` | `query: must NOT have fewer than 1 characters` |
| d | `{"query":"gamma","limit":0}` | `limit: must be >= 1` |
| e | `{"query":"gamma","scope":["drafts"]}` | `scope/0: must be equal to one of the allowed values` |
| f | `{"query":"gamma","extra":1}` | `extra: is not an argument of this tool` |
| g | `{"query": ` (cut short) | `arguments: is not valid JSON` |

In case f the reply's `arguments` is the parsed object; in case g it is the raw string. The problem lines come from the renderer of AGL-02 (`readable-error.ts` lines 54 to 58 and 70 to 72, and the `type` branch at lines 47 to 53) applied to Ajv 8.20.0 errors (section 8).

## 5. Downstream agreement

| Unit | What it needs from AGL-10 or from the shared files | Agreement |
|---|---|---|
| **AGL-02** tool framework (done; `plans/AGL-02.md` line 3) | Its section 5 AGL-10 row (line 186) expects one definition in `builtin-tools.ts` and says "No other AGL-02 file changes". | This plan also edits `tool-types.ts` (C-5: `ToolSchemaProperty` has no `'array'`, lines 27 to 30, so `scope` cannot be typed) and `agent-tools.service.ts` (the constructor takes only `FilesService`, line 21, so `SearchService` must be injected). Both edits are additive. Line 186 is a forecast in a done plan, not a decision that done code relies on; AGL-02's tests do not change. |
| **AGL-11** narrative gate (`blocked_by` line 7; criterion line 22) | "AGL-09 and AGL-10 criteria pass on `main`." | AC1 and AC2 stay on `main` as written. The mock-turn version depends on the Navigator's answer to open point 1. AGL-11 changes no file of this plan. |
| **AGL-16** grounding engine (`blocked_by` line 7; decision 2, line 19) | Passages of `sources` only, from the in-process search: `SearchService.search(projectId, {query, scope: ['sources']})`. | AGL-10 changes no part of the service and adds no export, so AGL-16 needs nothing from AGL-10. Its `blocked_by` is left as it is (open point 5, closed: not in the way of this plan). |
| **AGL-09** narrative tools (parallel with AGL-10; decisions line 18) | Registry tools added at run start. A registry tool with a reserved name is left out (`modules/agent-loop.md` line 52). Registry errors rendered readably. | Either order. `search_notes` is reserved already (`constants.ts` line 36), so AGL-09 leaves out a registry tool of that name whether or not AGL-10 has landed. If AGL-09 widens `tool-types.ts`, it keeps the members of C-5. |
| **AGL-12** write overlay (parallel with AGL-10; decisions lines 18 to 21) | `write_file` and `edit_file` added to `builtin-tools.ts`; `read_file` reads the run overlay. | Either order, by the merge rule below. Its tests call `read_file`, `write_file` and `edit_file`, not `search_notes`. |
| **AGL-25** eval script (parallel with AGL-10; ungated) | Nothing from this plan. | No overlap: it adds a script and data files. |
| **AGL-03** loop core (`blocked_by` AGL-02, AGL-06, MPR-08, SAU-08; no plan) | `AgentToolsService.startRun`, `ToolRun.schemas()` and `ToolRun.dispatch()` (AGL-02 plan S13 to S15). | AGL-03 calls `startRun` and does not build `AgentToolsService` itself, so the new constructor parameter does not reach it. If AGL-03 edits the same constructor, the merge keeps both parameters. |
| **PST-14** search box UI (`blocked_by` PST-10, PST-13; no plan) | The POST search route and the ranking of the service. | Unchanged by AGL-10. |

**Merge rule for `builtin-tools.ts` and `agent-tools.service.ts` (either order).** Each unit adds its own imports, its own parameters (AGL-10 adds `search` after the existing parameters) and its own definitions to the returned array. After the second merge the file has the imports of both, the parameters of both, and every definition in the array (for example `[listFiles, readFile, searchNotes, writeFile, editFile]`). The textual conflicts sit on the import, signature and return lines, and the resolution keeps both sides. Nothing in one unit's tests depends on the other unit's definitions.

**Merge rule for `tool-types.ts` (either order).** AGL-10 adds `'array'`, `items`, `minimum` and `minLength`. Any other unit that widens `ToolSchemaProperty` adds its members to the same union or as optional keys. No unit removes a member. `expectedSummary` (`readable-error.ts` lines 76 to 86) reads only `type`, so an array property shows as `(array, optional)`.

## 6. Open points

Revision status: points 2 to 6 are closed by the revision with the simplest option (source given for each). Point 1 is open for the Navigator, because it is a reading of criterion text.

1. **OPEN, for the Navigator. Seam of criterion 1 ("a scripted turn").** Unit line 18 says "A scripted turn calling `search_notes`". The criteria heading (unit line 17) has no seam parenthetical, unlike AGL-02's (`units/AGL-02-tool-framework-file-reads.md` line 24: "through the composed app and mock server once AGL-03 exists; the dispatcher is tested through a test-only HTTP harness until then"). By `units/README.md` line 57, AGL-10's seam is therefore the module default: the composed app with the mock OpenAI server and scripted turns (`modules/agent-loop.md` line 62). A scripted turn needs the loop, AGL-03, which is not on `main`, has no plan and no `unit/AGL-03` branch, and waits on MPR-08 (`plans/QUEUE.md` line 2). This plan calls the dispatcher through the AGL-02 kit (D-10), which is not a turn. Options: (A) the kit call stands for the scripted turn in AGL-10, as AGL-02's heading allows for AGL-02 (no plan change; the mock-turn version is left to AGL-11 line 22 or AGL-08); (B) AGL-10 waits for AGL-03: `blocked_by` gains AGL-03, and AC1 and AC2 become scripted mock turns through the composed app (section 4 rewritten, kit not used); (C) split: AC1 moves unchanged to a new unit AGL-26 blocked by AGL-10 and AGL-03, and AGL-10 keeps AC2 through the kit (AC2 still falls under the module default seam, so this needs the same reading as A for AC2). The plan as written follows A.
2. **Closed. AGL-10's blocker text.** `units/AGL-10-search-notes.md` line 7 writes `"Project store phase:search (PST-13)"`; `units/README.md` line 63 gives the form `"Project store search (PST-13)"` for one unit of a phase. The blocking unit is the same (PST-13, done), so nothing is in the way. No unit change (YAGNI).
3. **Closed. Default scope.** Both folders, the contract's and the service's default (C-2).
4. **Closed. Ajv wording.** Keep AGL-02 plan S2: `readable-error.ts` is done code (AGL-02, `plans/AGL-02.md` line 3) and its default case passes Ajv's message (lines 54 to 58). Cases c, d and e keep Ajv's wording. No renderer change.
5. **Closed. AGL-16's blocker on AGL-10.** Not in the way of this plan; AGL-16's own planner may revisit it. No unit change (YAGNI).
6. **Closed. The refusal path is untested.** Accepted gap: C-3 stays (correct attribution for a tool without `path`, as AGL-02 plan line 186 forecasts), and no third test is added, because the plan has one test per criterion. The draft's reference to a "mutation M6" was wrong: there are five mutation checks (M1 to M5), and C-3 has none.

## 7. Shared files with draft and planned plans

`grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/MPR-08.md` and `plans/GRR-01.md`. Their paths to change are `apps/api/test/providers-gate.test.ts` and `modules/providers.md` (MPR-08, as AGL-02 plan section 7 recorded them), and `packages/contracts/src/graph-runner/**` and `packages/contracts/test/**` (GRR-01, its "only these paths change" line). None of those is a path of this plan. `grep -n "agent-loop\|project-store\|tools/\|search" plans/GRR-01.md plans/MPR-08.md` matches only text in GRR-01 (for example lines 11, 23, 60 to 62 and 82), which cites other slices' files as sources. GRR-01's change set (line 108 and the rows at lines 114 to 119) is under `packages/contracts/src/graph-runner/` and `packages/contracts/test/`. MPR-08 has no match. So there is no overlap in either order.

Revision check at `07ebb8d`: `grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/AGL-10.md` (this plan), `plans/GRR-01.md` and `plans/MPR-08.md`. `git diff --name-only main...unit/GRR-01` lists only `packages/contracts/src/graph-runner/**` and `packages/contracts/test/**` paths, and `git diff --name-only main...unit/MPR-08` lists only `apps/api/test/providers-gate.test.ts`. `grep -ln "builtin-tools\|tool-types\|agent-tools.service\|agent-loop-search" plans/*.md` gives only `plans/AGL-02.md` (done), `plans/AGL-10.md` and `plans/DECISIONS.md`. `plans/AGL-02.md` is `status: done` (line 3), not planned. No overlap.

Units without a plan that touch the same files are AGL-03, AGL-09, AGL-12, AGL-16 and PST-14. Their changes are taken from their unit files, as section 5 states. The plans that exist for the agent loop (AGL-01, AGL-02, AGL-06, AGL-07) are done and change none of the files of this plan beyond AGL-02's own: AGL-02 created `builtin-tools.ts`, `tool-types.ts` and `agent-tools.service.ts`, which this plan edits. AGL-02 plan line 186 expects only `builtin-tools.ts` to change; the two further edits are explained in the AGL-02 row of section 5.

## 8. Facts checked

Unit and module:
- `units/AGL-10-search-notes.md`: front matter lines 1 to 10; Decisions line 15; criteria lines 18 and 19.
- `units/README.md` line 63 (blocker form for a unit inside a phase), line 136 (testing), and the phase table row for `phase:search` (PST-13 and PST-14; gate PST-14).
- `modules/agent-loop.md` lines 49 (module shape), 51 (dependencies), 52 (reserved names), 53 (JSON Schema, Ajv, readable errors), 56 (only `sources/` is grounding evidence), 61 and 62 (testing), 67 (real models).
- `modules/project-store.md` line 48 (a search names the active project; a non-active project fails).
- `units/AGL-09-narrative-tools.md` (decisions line 18; `blocked_by` line 7); `units/AGL-11-narrative-gate.md` (`blocked_by` line 7; criterion line 22); `units/AGL-12-write-overlay.md` (decisions lines 18 to 21); `units/AGL-16-grounding-engine.md` (`blocked_by` line 7; decision 2 at line 19); `units/AGL-25-manual-eval-script.md` (`parallel_with` line 8); `units/PST-14-search-box-ui.md` (`blocked_by` line 7); `units/AGL-03-loop-core.md` (`blocked_by` line 7).
- No unit names `builtin-tools`, `tool-types` or `agent-tools` except AGL-02 and the units cited in section 5 (grep over `units/`).

Plans:
- `plans/AGL-02.md`: status line 3; D9 line 36; D10 line 37; D11 line 38; D15 line 42; S1 line 48; S2 line 49; S5 line 58; S6 line 62; S7 line 67; S8 line 68; S10 line 70; S17 line 81; S18 line 82; the AGL-10 row of section 5 at line 186.
- `plans/PST-13.md`: status line 3; S2 line 19; P3 line 39; P10 line 46; P15 line 51; P16 line 52; P17 line 53; S16 line 33; section 5 AGL-10 bullet line 117; open point 8 at line 142.
- `plans/DECISIONS.md` line 4204 (the `valid` reading). The entry at line 4199 is the AGL-02 review.
- `plans/QUEUE.md` line 7 (`AGL-10 | M2 | available: yes`).
- `plans/` has plans only for AGL-01, AGL-02, AGL-06 and AGL-07 among the agent-loop units. MPR-08 and GRR-01 are the only plans with `status: planned` or `draft`.

Code at `a04eb7d`:
- `packages/contracts/src/project-store/search.ts` lines 5 to 9 (request), 12 to 17 (passage), 20 (result).
- `packages/contracts/src/agent-loop/constants.ts` lines 9 to 15 (families), 31 to 43 (reserved names; `search_notes` at line 36).
- `apps/api/src/modules/project-store/project-store.module.ts`: line 24 (entry export of `SearchService`), lines 59 to 65 (`exports`, `SearchService` at line 64).
- `apps/api/src/modules/project-store/search.service.ts`: line 24 (`DEFAULT_LIMIT`), line 27 (`SCOPE_PREFIXES`), lines 30 to 39 (`scopeClause`; an empty scope gives both roots, lines 31 and 32), lines 95 to 117 (`search`; line 100 returns `[]` for no terms; line 109 the default limit), lines 199 to 210 (`projectFor`; line 200 `requireActive`).
- `apps/api/src/modules/project-store/project-store.service.ts` lines 66 to 80 (`requireActive`; the `NOT_ACTIVE` error at lines 76 to 79).
- `apps/api/src/modules/agent-loop/agent-loop.module.ts`: line 28 (imports `PlatformModule` and `ProjectStoreModule`), line 42 (`exports`).
- `apps/api/src/modules/agent-loop/agent-tools.service.ts`: line 4 (`FilesService` import from the project-store entry), line 21 (constructor), line 24 (`builtinTools(files)`).
- `apps/api/src/modules/agent-loop/tools/builtin-tools.ts`: line 1 (import of `FilesService`), line 2 (type import of `ToolDefinition`), lines 4 and 5 (header comment), line 24 (signature), line 82 (return).
- `apps/api/src/modules/agent-loop/tools/tool-types.ts`: lines 17 to 25 (`ToolArgumentError`, whose constructor takes issues and no cause), lines 27 to 30 (`ToolSchemaProperty`), lines 33 to 38 (`ToolArgumentSchema`, `additionalProperties: false`), lines 53 to 60 (`ToolDefinition`).
- `apps/api/src/modules/agent-loop/tools/tool-run.ts`: line 2 (`ModuleError` import from the platform entry), lines 136 to 142 (a `ModuleError` becomes the issue at `/path`), lines 143 to 145 (a `ToolArgumentError` keeps its issues).
- `apps/api/src/modules/agent-loop/tools/readable-error.ts`: lines 8 to 15 (`TYPE_PHRASES`, with `array` at line 14), lines 47 to 53 (the `type` case), lines 54 to 58 (the default case: the Ajv message), lines 76 to 86 (`expectedSummary`, which reads `property.type`).
- `apps/api/test/agent-loop-tools.kit.ts`: lines 36 to 49 (`startRun`; `enabledFamilies: ['project']` at line 45), lines 52 to 63 (`dispatch`), lines 65 to 72 (`offered`).
- `apps/api/test/agent-loop-tools.test.ts`: lines 19 to 85 (constants and helpers); `withToolsApp` at line 29; `callResult` from line 75.
- `apps/api/test/project-store-files.kit.ts`: line 44 (`bookLibrary`), line 70 (`putFile`). `apps/api/test/project-store-projects.kit.ts` lines 19 to 23 (`ProjectsLibrary`).
- `eslint.config.mjs` line 50 (rule R1).
- `tsconfig.base.json` line 3 (`strict: true`); no `exactOptionalPropertyTypes`.
- `apps/api/package.json` lines 6 to 8 (scripts; `test` runs the build first) and line 16 (`"ajv": "8.20.0"`).
- `package-lock.json` line 52 (`apps/api/node_modules/ajv` at 8.20.0) and line 5618 (`node_modules/ajv` at 6.15.0).
- Checkout: `apps/api/node_modules` has no entries. The root `node_modules/ajv` reports 6.15.0. `node_modules/ajv-formats/node_modules/ajv` and `node_modules/@angular-devkit/core/node_modules/ajv` report 8.20.0.
- Git: `main` at `a04eb7d`; `git status --short` prints nothing; `git diff --stat 7ebc225 a04eb7d` lists `plans/DECISIONS.md` only (7 lines appended).

Probes, run in `/tmp` and outside the repository:
- Revision probe (reviser, `/tmp/agl10probe`): Ajv 8.20.0 (the `ajv-formats` copy) with the service's options `{allErrors: true, strict: true}` (`agent-tools.service.ts` line 23) and the C-4 schema gave the same single error for each of the six schema cases a to f as listed below. Case g is `argumentIssues` in `tool-run.ts` line 47 (`is not valid JSON` at path `''`).
- Revision probe (reviser, `/tmp/agl10probe`): FTS5 on Node v26.13.0 with the passages table of `search-index.ts` line 140 and four rows, the three AC1 sources and `sources/outline.md` (`# Outline`) from `bookLibrary()`, with the service's query (`search.service.ts` lines 101 to 109) and MATCH `"gamma"`. Order `sources/light.md` (1.497e-6), `sources/quotes.md` (1.194e-6), `sources/notes.md` (1.032e-6): the same order, distinct scores.
- Ajv 8.20.0 (the copy under `ajv-formats`, the same version as the lockfile) compiled with the schema of C-4 and checked seven inputs. The messages were: `required` at `""`, property `query`, reads `must have required property 'query'` (rendered as `query: is required`); `type` at `/query`, reads `must be string` (rendered as `query: must be a string`); `minLength` at `/query`, reads `must NOT have fewer than 1 characters`; `minimum` at `/limit`, reads `must be >= 1`; `enum` at `/scope/0`, reads `must be equal to one of the allowed values`; `additionalProperties` with `additionalProperty` `extra`, reads `must NOT have additional properties` (rendered as `extra: is not an argument of this tool`). Each input gave one error, so each AC2 line is the only problem line. A string for `scope` gives a `type` error at `/scope` (rendered `must be an array`), and `limit: 2.5` gives `must be integer` (rendered `must be an integer`).
- FTS5 with `porter unicode61` on Node v26.13.0 (`node:sqlite`), with the three rows of the AC1 fixture as `sources/quotes.md`, `sources/light.md` and `sources/notes.md`, and the MATCH text `"gamma" OR "gamma"` (one quoted term, the same match as `"gamma"`, PST-13 P11). The rows came back in the order `sources/light.md` (score 3.14e-6), `sources/quotes.md` (2.57e-6), `sources/notes.md` (2.23e-6), and the scores are distinct.

## 9. Assumed (not checked here)

- The AC1 and AC2 expected strings hold in the test run. Section 8 checked them by reading the renderer and by the Ajv probe, not by running the test.
- The probe's ranking holds for the service (the revision probe used the service's table, query and the fourth fixture row; chunking by `chunkText` gives one passage per one-line file, read at `search-index.ts` lines 81 to 107, but the full service path is not run). The service uses the same rows, tokenizer and `bm25` ordering (PST-13 P4, P10), but the test run confirms it.
- `npm ci` at step 0 installs `apps/api/node_modules/ajv` at 8.20.0, as the lockfile says. It was not run here.
- The Ajv copy under `ajv-formats` gives the same messages as the copy `apps/api` will use (same version, 8.20.0).
- `search` throws a `ModuleError` for a project that is not active, as read at `project-store.service.ts` lines 66 to 80. No test exercises it.
- AGL-03, when it lands, enables the `project` family for each run, as the AGL-02 kit does (kit line 45). AGL-03's plan will confirm it.
- The future changes of AGL-09 and AGL-12 are as their unit files state. Neither has a plan.

## 10. Review parts

One part, because the plan is small (three edited source files, one new test file). Each step and each test is in exactly this part.

- **Part 1: the tool, its schema and the two tests.** Steps 0 to 12 (preconditions, branch, red tests, the three source edits, green, full suite, lint and format, source commit, mutation checks, changed paths, record). Tests: AC1 (`AC1: search_notes returns ranked passages from sources/, and drafts/ never appears`) and AC2 (`AC2: invalid search_notes arguments get the readable error`).

## 11. Revision log (2026-11-15, reviser, at `main` `07ebb8d`)

Checked by the reviser (cat -n, grep, git, probes): unit lines 7, 15, 17 to 19; `units/README.md` lines 57, 63; `modules/agent-loop.md` lines 49 to 58 and 61 to 67; `units/AGL-02-tool-framework-file-reads.md` line 24; downstream units AGL-11 and AGL-16 (the only units whose `blocked_by` names AGL-10) and the parallel units AGL-09 and AGL-12; `plans/AGL-02.md` lines 3, 30 to 45 and 186; `plans/DECISIONS.md` by grep (no AGL-10 entry; line 4204 on `valid`; no Navigator entry on the AGL-10 seam); `tool-types.ts`, `builtin-tools.ts`, `agent-tools.service.ts`, `readable-error.ts`, `tool-run.ts` lines 1 to 50 and 100 to 175; `search.service.ts` lines 1 to 45, 95 to 117, 199 to 210; `project-store.service.ts` lines 66 to 80; `project-store.module.ts` lines 20 to 26 and 55 to 66; `packages/contracts/src/project-store/search.ts`; `agent-loop-tools.kit.ts` lines 1 to 80; `agent-loop-tools.test.ts` lines 1 to 90; `project-store-files.kit.ts` lines 40 to 80; `project-store-projects.kit.ts` lines 30 to 70; the two probes of section 8. Assumed: section 9, unchanged except the ranking note.

Corrections:
1. Base moved to `07ebb8d`; the commits since `a04eb7d` touch no path this plan cites (front matter and the Revision paragraph at the top).
2. AC1 fixture: `bookLibrary()` adds an indexed `book/sources/outline.md`. The ranking was probed again with four rows and the service's query; the expected order and strict decrease hold (section 4, section 8).
3. AC2 strings re-probed with the service's Ajv options (`allErrors: true, strict: true`); unchanged (section 8).
4. Section 5 gains an AGL-02 row: AGL-02 plan line 186 says "No other AGL-02 file changes", but this plan edits `tool-types.ts` and `agent-tools.service.ts` too; both edits are needed and additive. Section 7 now cites this instead of "as line 186 expects".
5. Open points 2 to 6 closed with the simplest option and a source (section 6, C-2, C-3). The draft's "mutation M6" did not exist; fixed.
6. Open point 1 restated with the rule that makes it a criterion question (`units/README.md` line 57) and three options. It is the only open point, so the status stays `draft`.
7. Section 7 re-checked at `07ebb8d` (the GRR-01 and MPR-08 branches); `plans/AGL-02.md` is done, not planned.

Unit changes: none.
