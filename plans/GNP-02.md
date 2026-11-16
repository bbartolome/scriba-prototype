---
id: GNP-02
status: planned
---
# GNP-02 plan — golden-test harness and the per-tool mock fixture convention

Batch: [GNP-02] (Genre packs, phase:core-propose-graph, M2), a batch of one. Revision 2 (reviser), checked at main `c91ca2d`. `git log --oneline c91ca2d..HEAD` is empty at the time of the revision, and `c91ca2d` changes only `plans/GNP-02.md` after `aebc9f6`. The unit file was read in full (lines 1 to 25). It has no note that records a change of the unit; its last change in git (`098add9`) made the dependency fields consistent.

Blockers, all merged: TRG-12 (`plans/TRG-12.md` line 4 `status: done`; commit `6594663` on main), PLT-04 (`plans/PLT-04.md` `status: done`; `apps/api/test/create-test-app.ts` exists), PLT-12 (`plans/PLT-12.md` `status: done`; `e2e/fixtures/mock-openai/server.mjs` exists). GNP-01 is `parallel_with` this unit and is merged (`plans/GNP-01.md` `status: done`).

Revision 2 changes (reviser): open point 2 is settled by the rules (D12: the test-only tool is a user-pack tool of the temporary library, so every case boots with `SCRIBA_PACKS_DIR` = `packages/packs`, as unit line 16 and module line 87 say); open point 1 is settled by the rules (D18); the helper takes the name of the required argument that the invalid call drops (`invalidWithout`, D4) and an optional extra check (`check`, D10), because the downstream tools have no common required argument (GNP-04's `propose_graph` has no `coreIdea`) and GNP-04, GNP-07 to GNP-10 need extra assertions on the result; the probe's packs root, the `packsRoot` option and the `golden/<tool>/packs/` folder are gone; section 8 "Review parts" is new.

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

- **D1 Suite home.** `apps/api/test/packs/`, the folder of the GNP-03 and GNP-06 tests. Source: unit line 15; module line 87.
- **D2 Boot.** Each case boots the composed app with `createTestApp` (`apps/api/test/create-test-app.ts` lines 65 to 87) with `SCRIBA_PACKS_DIR` = `packages/packs`, against a temporary library and the mock OpenAI server. This holds for every case, the probe included (D12). Source: unit line 16; module line 87.
- **D3 The call.** `POST /api/tool-registry/tools/:name/execute` with fixture arguments and fixture resolved entities, which is the `ToolCallRequest` shape (`packages/contracts/src/tool-registry/call.ts` lines 47 to 50). Source: unit line 16; `plans/TRG-12.md` line 216.
- **D4 What each case asserts.** (a) The request the mock recorded matches a checked-in golden. (b) `output.kind` and `sourcesUsed` equal the values the case declares. (c) Invalid arguments return HTTP 422 with code `TOOL_ARGS_INVALID` and a message that names the field. The invalid call is the case's own call with one required argument removed; the case names that argument in `invalidWithout` (for the probe, `coreIdea`; for GNP-04's `propose_graph`, for example `view`). Source: unit lines 17 to 19; `units/GNP-04-propose-graph.md` lines 16 and 24 (no `coreIdea`; `view` is required). The "no model call" check of (c) is a plan choice: `ExecutorService.prepare` throws before the model is called (`apps/api/src/modules/tool-registry/executor.service.ts` lines 77 and 117 to 121).
- **D5 Scenario convention.** One scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`, reached at `/scenario/pack-<tool>/v1`. Source: unit line 20; `plans/PLT-12.md` decision 6 (line 16) for the file shape.
- **D6 Golden and fixture files.** `packages/packs/test/golden/<tool>/<case>.fixture.json` (the `ToolCallRequest`) and `packages/packs/test/golden/<tool>/<case>.golden.json`. Source: unit line 15; module line 87. The file suffixes are a plan choice.
- **D7 What a golden holds.** The chat request's `messages`, and `tools` when the request has them. No other wire field: the client takes `model`, `temperature` and `max_tokens` from the provider config (`apps/api/src/modules/providers/client/openai-compatible-client.ts` lines 242 to 249), so they must not change a golden. Source: unit line 17 ("rendered prompt and function schema / system message"). The exclusion is a plan choice.
- **D8 Comparison and writing.** The golden is compared by value (`isDeepStrictEqual` of the parsed file), so the file's bytes do not matter to the test. The writer emits `JSON.stringify(value, null, 2)` and a final newline. Plan choice.
- **D9 The update flag.** `--update-goldens` makes the helper write goldens instead of comparing them. It is run as `cd apps/api && npx vitest run -- --update-goldens`. The vitest config maps the flag to the variable `SCRIBA_UPDATE_GOLDENS=1` for the test workers, because vitest rejects the flag unless it follows `--`, and the workers do not receive the flag in `process.argv` (section 7, experiments E1 to E4). Source: unit line 20 (the flag is documented). The mechanism is a plan choice. Goldens change only on purpose, in the same PR as the prompt edit. Source: module line 87; unit line 20.
- **D10 The helper.** `goldenCase(...)` returns the body of one `it(...)`, so a case is declared in a few lines. It takes an optional `check(result)` that runs after the standard assertions, for a tool's own assertions on the result (for example GNP-04's graph-schema parse of `content`, or GNP-07's check that the rendered prompt holds each entity ID). Source: unit line 20; `units/GNP-04-propose-graph.md` line 25; `units/GNP-07-cold-open.md` line 22. Names are a plan choice.
- **D11 Fixtures are the tests' own.** No test reads `examples/`. Source: unit line 21; module line 88; `units/README.md` line 138.
- **D12 The test-only tool.** `golden_probe`, a draft tool with one required text input `coreIdea` and an entity list `entityIds` of kind `person`. Its spec is the fixture file `packages/packs/test/golden/golden_probe/golden_probe.yaml`. The helper copies it, before boot, into the temporary library's user pack, `<library>/.scriba/packs/user/tools/golden_probe.yaml` (`userToolsDir`, `apps/api/src/modules/tool-registry/packs.ts` lines 88 to 90; read at boot by `catalog.service.ts` lines 171 and 172). So the probe exists only in the probe's own temporary library: it is not in `packages/packs/{core,nonfiction,fiction}/tools`, not in the image's tool list, and not in any other case's `{{toolCatalog}}`. `catalog.entry` does not filter by origin (`catalog.service.ts` lines 303 to 306), and the `person` kind is declared by `packages/packs/nonfiction/entity-types/person.yaml`, so the probe loads without a lint warning. Source: unit lines 16 and 24 (both hold); precedent for a user-pack fixture: `apps/api/test/tool-registry-loader.test.ts` lines 139 to 155. The place is a plan choice.
- **D13 Shared scenario folder.** The probe's scenario sits beside the other scenarios, as the unit's convention and TRG-12's `tool-execute-draft.json` do. Source: unit line 20; plan choice.
- **D14 Prettier.** The new JSON and YAML files pass `prettier --check`. `.prettierignore` does not change: `plans/DECISIONS.md` lines 92 and 104 ask for `.prettierignore` entries for byte-exact fixtures only, and these goldens are compared by value. Source: DECISIONS lines 92 and 104; `.prettierignore` lines 1 to 5; plan choice.
- **D15 Documentation.** `packages/packs/test/README.md` is a new file that states the convention. AC 2 tests it. Source: unit line 25; `plans/GNP-01.md` lines 66 and 121 (GNP-02 owns this README and the golden folder).
- **D16 Wiring.** No change to `packages/packs/package.json`. The golden tests run under apps/api's vitest, whose `include` is `test/**/*.test.ts` (`apps/api/vitest.config.mts`). Source: module line 87; plan choice.
- **D17 One model call.** A successful execute makes one model request, so each case expects exactly one recorded request. Source: `executor.service.ts` lines 87 to 103; `openai-compatible-client.ts` lines 115 to 116 (retries only before the first chunk); `e2e/fixtures/mock-openai/server.mjs` line 302 (one record per request).
- **D18 Goldens that include the tool catalogue.** `{{toolCatalog}}` renders every valid and enabled tool of the packs root (`executor.service.ts` lines 161 to 168). With D2, a golden whose template uses it (GNP-04's recipe view, `units/GNP-04-propose-graph.md` line 25) changes when a built-in tool is added, removed, renamed, enabled or disabled, or changes its description or ports. Such a PR changes that rendered prompt, so it is the PR of the prompt edit: it regenerates the golden with `--update-goldens` in the same PR, and the reviewer sees the change in the golden's diff. The README states this rule. Source: module line 87 and unit line 20 (goldens change in the same PR as the prompt edit), module line 87 and unit line 16 (`SCRIBA_PACKS_DIR=packages/packs`, so a fixed tool set per case is not allowed), GNP-04 line 25 (the recipe golden includes the catalogue). This settles former open point 1; the sources give the answer, so no Navigator decision is needed.

## 2. Files to create or change

| Path | Action | What changes |
|---|---|---|
| `apps/api/test/packs/golden.kit.ts` | create | The helper of step 4: `PACKS_ROOT`, `GOLDEN_ROOT`, `UPDATE_GOLDENS`, `runGoldenCase`, `goldenCase`. Not a test file (vitest includes `test/**/*.test.ts` only) |
| `apps/api/test/packs/golden-harness.test.ts` | create | The four tests of section 4 |
| `apps/api/vitest.config.mts` | edit | Adds one `env` entry to `test` that maps the flag to `SCRIBA_UPDATE_GOLDENS` (D9), with a comment. Nothing else |
| `packages/packs/test/README.md` | create | The convention (D15, D18) |
| `packages/packs/test/golden/golden_probe/golden_probe.yaml` | create | The test-only tool spec (D12), content in step 2 |
| `packages/packs/test/golden/golden_probe/two-people.fixture.json` | create | The fixture: arguments and two entities (step 2) |
| `packages/packs/test/golden/golden_probe/two-people.golden.json` | create by the update run (step 7) | The golden request of the probe case |
| `e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json` | create | The probe's scenario (D13), content in step 2 |

Not changed: `packages/packs/package.json`; `packages/packs/core/**`, `packages/packs/nonfiction/**`, `packages/packs/fiction/**`; the GNP-01 files `packages/packs/test/{broken-specs,content-checks,real-packs,smoke}.test.ts`, `packages/packs/test/checks.ts` and `packages/packs/test/fixtures/**`; the GNP-03 and GNP-06 tests `apps/api/test/packs/{core,nonfiction}-entity-types.test.ts`; `apps/api/src/**`; `packages/contracts/**`; `e2e/fixtures/mock-openai/server.mjs`; `.prettierignore`; `package-lock.json`; `examples/**`; `units/**`; `modules/**`; `plans/**`; `units/SAU-12-providers-step.md`, which has a change of another unit in the working tree.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on the branch the orchestrator names (`main` if it names none). Record `node -v` and `npm -v` with each result. Do not push. Change only the files of section 2.

0. **Base.** `git merge-base --is-ancestor c91ca2d HEAD` exits 0. `git diff --quiet c91ca2d HEAD -- apps packages e2e scripts package.json .prettierignore` exits 0. `git ls-files packages/packs/test/README.md packages/packs/test/golden apps/api/test/packs/golden.kit.ts e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json` prints nothing. If a check fails, re-read the changed files before editing. If `packages/packs/{core,nonfiction,fiction}/tools` now hold a tool, that is expected and changes nothing here.
1. **Runtime and baseline.** `node -v` prints `v26.x` and `npm -v` prints `11.x` (assumption A1). Run `npm ci` if the worktree has no `node_modules/`. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && (cd apps/api && npx vitest run test/packs test/tool-registry-executor.test.ts)` exits 0, with the GNP-03, GNP-06 and TRG-12 tests passing.
2. **Test-only tool, fixture and scenario (D12, D13, D14).** Create three files:
   - `packages/packs/test/golden/golden_probe/golden_probe.yaml`:

     ```yaml
     schemaVersion: 1
     name: golden_probe
     description: Answer one question from its core idea and the people it names.
     inputs:
       type: object
       properties:
         coreIdea:
           type: string
           title: Core idea
           x-scriba-type: text
           x-scriba-port: true
           x-scriba-control: textarea
         entityIds:
           type: array
           title: Entities
           items:
             type: string
           x-scriba-type: entity
           x-scriba-port: true
           x-scriba-entity-kinds: [person]
       required: [coreIdea]
     output: draft
     enabled: true
     prompt: 'Core idea: {{coreIdea}}.{{#each entityIds}} [{{entity this}}]{{/each}}'
     ```

     The shape follows `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml` (lines 1 to 27). The file name stem equals `name`, as the loader's file-name rule needs.
   - `packages/packs/test/golden/golden_probe/two-people.fixture.json`: `arguments` = `{"coreIdea": "Engines reward patience", "entityIds": ["person-a", "person-b"]}`; `entities` = two `ResolvedEntity` objects, `{"ref": "person-a", "type": "person", "path": "entities/person-a.md", "content": "Person A keeps a notebook."}` and the same for `person-b` with the content "Person B checks the notebook.".
   - `e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json`: `{"steps": [{"match": {"endpoint": "chat"}, "reply": {"kind": "stream", "deltas": ["Person A and Person B agree."]}}]}`.

   Then `npx prettier --write` on the three files, and `npx prettier --check` on them exits 0 (assumption A4).
3. **Config (D9).** Edit `apps/api/vitest.config.mts`: inside `test`, after `testTimeout`, add a comment and the line `env: { SCRIBA_UPDATE_GOLDENS: process.argv.includes('--update-goldens') ? '1' : '0' },`. The comment says that vitest reads the flag in the main process and that the test workers see only this variable. `npx prettier --check apps/api/vitest.config.mts` exits 0.
4. **Helper (D2 to D12, D17).** Create `apps/api/test/packs/golden.kit.ts`. It exports:
   - `PACKS_ROOT`, computed as in `apps/api/test/packs/nonfiction-entity-types.test.ts` lines 27 to 35 (four levels up, then `packages/packs`); `GOLDEN_ROOT` = `PACKS_ROOT/test/golden`; `UPDATE_GOLDENS` = `process.env.SCRIBA_UPDATE_GOLDENS === '1'`.
   - `runGoldenCase(options)`, where `options` is `{ tool, name, expect: { kind, sourcesUsed }, invalidWithout, userTool?, goldenDir?, update? }`. `invalidWithout` is the key of one required argument of the fixture. `userTool` is the path of a tool spec file that is installed in the temporary library's user pack (D12); real pack tools omit it. The defaults are `goldenDir` = `GOLDEN_ROOT/<tool>` and `update` = `UPDATE_GOLDENS`. It returns `{ kind, content, sourcesUsed, golden, request, invalid: { status, code, message }, modelCalls }`, where `golden` is `'match' | 'differs' | 'missing' | 'written'` and `content` is `output.content`. Its steps, in order:
     a. Parse `<goldenDir>/<name>.fixture.json` with `toolCallRequestSchema` from the `tool-registry` subpath of the contracts. Require that `arguments` has the key `invalidWithout`.
     b. Start `startMockOpenAI()` (from `apps/api/test/providers-client.kit.ts`). Build the library with `makeLibrary`, as `apps/api/test/tool-registry-executor.test.ts` does (lines 48 to 65), with one provider `mock` whose `baseURL` is `${mock.baseUrl}/scenario/pack-${tool}/v1`. When `userTool` is given, create `<library>/.scriba/packs/user/tools` (recursive) and copy the file there as `<tool>.yaml`. Start `createTestApp({ libraryDir, env: { SCRIBA_PACKS_DIR: PACKS_ROOT } })` and `sessionCookie(app, libraryDir)` (the same test, lines 75 to 81).
     c. `POST` the fixture to `TOOL_EXECUTE_ROUTE` with `:name` = `tool`, with the loopback host and origin of `apps/api/test/tool-registry-executor.test.ts` lines 92 to 106 (`LOOPBACK_HOST`, `LOOPBACK_ORIGIN` from `apps/api/test/invariant-sweep.ts` lines 38 and 39). Require status 200. Parse the body with `toolCallResultSchema`; read `output.kind`, `output.content` and `sourcesUsed`.
     d. `recordsOf(mock, 'pack-' + tool)` holds exactly one record. `request` is `{ messages }`, plus `tools` when the record's body has it (D7).
     e. Golden. With `update` true, write `<goldenDir>/<name>.golden.json` as `JSON.stringify(request, null, 2) + '\n'` and report `'written'`. With `update` false, report `'missing'` if the file does not exist, `'match'` if `isDeepStrictEqual(JSON.parse(file), request)`, and `'differs'` otherwise. An update never runs when `update` is false, so the negative test cannot overwrite a golden.
     f. Invalid call: the same entities, with `arguments` minus the key `invalidWithout`. Record the reply's status, `error.code` and `error.message`.
     g. `modelCalls` = the number of records after step f.
     h. Close the app, the mock and the temporary library in a `finally`.
   - `goldenCase(options)`, where `options` is `{ tool, name, expect, invalidWithout, userTool?, check? }`. It returns an async body for `it(...)`. The body runs `runGoldenCase` with the defaults and asserts: `golden` is `'written'` when `UPDATE_GOLDENS`, else `'match'`; `kind` and `sourcesUsed` equal `expect`; `invalid.status` is 422, `invalid.code` is `TOOL_ARGS_INVALID` and `invalid.message` contains `invalidWithout`; `modelCalls` is 1. Then it awaits `check(result)` when `check` is given.

   The file uses no `any`. Step 10 type-checks it, because the `apps/api` build checks `test` (`apps/api/tsconfig.json` line 8).
5. **Tests (section 4).** Create `apps/api/test/packs/golden-harness.test.ts`, with `PROBE_SPEC = join(GOLDEN_ROOT, 'golden_probe', 'golden_probe.yaml')` and `PROBE_EXPECT = { kind: 'draft', sourcesUsed: ['person-a', 'person-b'] }`. It holds the four tests of section 4, with the names given there. Each probe call passes `tool: 'golden_probe'`, `name: 'two-people'`, `invalidWithout: 'coreIdea'` and `userTool` (`PROBE_SPEC`, or the changed copy of AC 1 part 2).
6. **README (D15, D18).** Create `packages/packs/test/README.md`. It states, in plain words, every term that the AC 2 test checks (section 4): the layout of D6, the scenario name, the helper and its file, `invalidWithout` and `check`, the command of D9 (`cd apps/api && npx vitest run -- --update-goldens`), the rule that goldens change only in the PR of the prompt edit, the rule of D18 for goldens that include `{{toolCatalog}}`, the invalid-argument check (`TOOL_ARGS_INVALID`), the rule on `examples/`, and the test-only tool installed in the temporary library's user pack (`.scriba/packs/user/tools`). Then `npx prettier --write packages/packs/test/README.md`.
7. **Write the probe golden (D9).** `cd apps/api && npx vitest run -- --update-goldens test/packs/golden-harness.test.ts` exits 0 and creates `packages/packs/test/golden/golden_probe/two-people.golden.json`. Read that file: `messages[0].content` is the draft system message (`executor.service.ts` lines 31 and 32), and `messages[1].content` contains `Core idea: Engines reward patience.` and both IDs, `person-a` and `person-b`. `git status --short packages/packs/test/golden` lists only the new files of section 2.
8. **Compare run and idempotence (D8, D9).** `cd apps/api && npx vitest run test/packs/golden-harness.test.ts` exits 0 with four tests passed, and AC 1 passes in compare mode (`golden` is `'match'`). Then repeat the command of step 7 and check that the golden's content is unchanged (`git diff --no-index` against a copy taken before the run, or `git diff` after the file is staged, prints nothing).
9. **Prettier (D14, assumption A3).** `npx prettier --check packages/packs/test apps/api/test/packs apps/api/vitest.config.mts e2e/fixtures/mock-openai/scenarios` exits 0. If the golden fails this check, stop and report PLAN DOES NOT WORK: assumption A3 is false, and the fix (a `.prettierignore` entry) is a decision for the Navigator.
10. **Type check and lint.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0.
11. **Root gates and the e2e mock (assumption A5).** From the root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock still loads the new scenario file.
12. **Commit.** `git add` the paths of section 2 by name. `git diff --cached --stat` must list only them, and must not list `units/SAU-12-providers-step.md` or any `plans/` file. Commit with `feat(GNP-02): golden-test harness and the per-tool mock fixture convention`. Do not use `git add -A` or `git commit -a`. Do not push.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-02-golden-harness.md` lines 24 and 25. Each criterion has one test. Extra tests X1 and X2 are plan choices: X1 checks the invalid-argument rule (unit line 19) for the probe, and X2 checks the update path in a temporary folder, so that the flag is tested without changing the repository.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "A sample golden case against a test-only fixture tool passes, and fails when the template changes without updating the golden." (24) | `apps/api/test/packs/golden-harness.test.ts`, "AC 1: the sample golden case passes, and fails when the template changes without updating the golden" | `cd apps/api && npx vitest run test/packs/golden-harness.test.ts` | Part 1: the body from `goldenCase({ tool: 'golden_probe', name: 'two-people', expect: PROBE_EXPECT, invalidWithout: 'coreIdea', userTool: PROBE_SPEC })` passes. Part 2: the test writes a copy of `PROBE_SPEC` to a temporary file with `Core idea:` replaced by `Core theme:` (it asserts that the text was found first), then calls `runGoldenCase` with that file as `userTool` and `update: false`; `golden` is `'differs'`. The repository golden is not written. |
| "The convention is documented in `packages/packs/test/README.md`." (25) | "AC 2: the convention is documented in packages/packs/test/README.md" | same | The README contains each of these terms: `goldenCase`, `golden.kit.ts`, `apps/api/test/packs/`, `--update-goldens`, `pack-<tool>.json`, `golden/<tool>/`, `.fixture.json`, `.golden.json`, `SCRIBA_PACKS_DIR`, `invalidWithout`, `TOOL_ARGS_INVALID`, `toolCatalog`, `.scriba/packs/user/tools`, `examples/`, `same PR`. |
| Extra X1 (plan choice): "X1: invalid arguments return TOOL_ARGS_INVALID naming the missing field, and make no model call" | same file | same | `runGoldenCase` with `update: false`, `invalidWithout: 'coreIdea'` and `userTool: PROBE_SPEC` on the probe: `invalid.status` is 422, `invalid.code` is `TOOL_ARGS_INVALID`, `invalid.message` contains `coreIdea`, and `modelCalls` is 1. |
| Extra X2 (plan choice): "X2: a golden written by the update path is the checked-in golden" | same file | same | `runGoldenCase` with `update: true`, `userTool: PROBE_SPEC` and `goldenDir` set to a temporary folder that holds only a copy of the fixture returns `'written'`; the written file equals the checked-in golden by value; a second run in that folder with `update: false` returns `'match'`. |

Expected: four tests pass, none is skipped. Without the flag, AC 1 expects `'match'`. With the flag (step 7), it expects `'written'`.

## 5. Downstream agreement

- **GNP-04 (propose_graph; unit lines 24 and 25).** Not in the pipeline (no `plans/GNP-04.md`, no `unit/GNP-04` branch). Needs: two `goldenCase` calls for `propose_graph`, one per view (fixtures `story` and `recipe` under `golden/propose_graph/`), with `invalidWithout: 'view'` (which also gives its criterion 1, "calling it without `view` returns an Ajv error naming `view`"), a `check` that parses `content` with the Graph runner's graph schema, and `pack-propose_graph.json`. Both cases share one scenario file, since the convention is one scenario per tool (unit line 20). So that file needs matchers: `lastMessageRole` and `lastMessageContent` (`e2e/fixtures/mock-openai/server.mjs` lines 103 to 131, with `plans/PLT-12.md` decision 8 at line 18) pick each view's reply by a substring of that case's own prompt. The helper does not write these matchers; GNP-04 does. The recipe golden includes the catalogue of `packages/packs` (D2), and it changes with the catalogue under the rule of D18. GNP-04's Spec and criteria need nothing else from this plan.
- **GNP-05 (core gate; unit line 21).** Needs only GNP-04's goldens. Nothing from this plan beyond GNP-04.
- **GNP-07, GNP-08, GNP-09, GNP-10 (nonfiction draft tools; unit line 22 each).** None is in the pipeline. Each declares `goldenCase` with a fixture of the five common inputs and its entity inputs, `invalidWithout: 'coreIdea'` (a required common input) and `expect.sourcesUsed` as the non-style entity IDs of that fixture (style profile excluded; `executor.service.ts` filters style refs). The helper gives the invalid-argument check and the one-call check. The clause "the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions" is a check of the request, which the tool's `check` makes on `request`. GNP-09's kind check on `claimIds` (`TOOL_ENTITY_KIND_MISMATCH`, unit line 23) comes from the executor (`executor.service.ts` lines 140 to 146), and GNP-09's own test covers it. Each of these units, if it merges after GNP-04, changes the `{{toolCatalog}}` of the `propose_graph` recipe golden and regenerates that golden in its own PR (D18). Two of them that run in parallel conflict on that golden at rebase; the rebase regenerates it.
- **GNP-14 to GNP-17 and GNP-20 to GNP-23 (their golden criteria: GNP-14 line 20, GNP-15 line 22, GNP-16 lines 22 and 23, GNP-17 line 20, GNP-20 line 20, GNP-21 line 23, GNP-22 line 32, GNP-23 line 24).** The same contract, and the same D18 rule. GNP-14 needs `entity` output kind and `sourcesUsed` (the helper takes any kind). Each names its own required argument in `invalidWithout`. GNP-16 also needs a second invalid call ("calling it with one character fails Ajv", `units/GNP-16-dialogue.md` line 23); the helper makes only the call without one required argument, so GNP-16 writes that check itself. GNP-17 and GNP-20 pass fixture text as arguments, which the helper accepts as it is.
- **PLT-04, PLT-12 and TRG-12 (upstream, done).** They provide what this plan uses: the environment override of `createTestApp` (`apps/api/test/create-test-app.ts` lines 65 to 87), the records and reset endpoints of the mock (`e2e/fixtures/mock-openai/server.mjs` lines 239 to 256), and the execute route and its result (`packages/contracts/src/tool-registry/routes.ts` lines 22 to 23; `call.ts` lines 47 to 75; `apps/api/src/modules/tool-registry/tools.controller.ts` lines 157 to 169). Their `unblocks` name GNP-02. Nothing is missing.
- **GNP-01 (done).** `plans/GNP-01.md` lines 66 and 121 say that GNP-02 owns `packages/packs/test/README.md` and `packages/packs/test/golden/`. This plan creates both and changes nothing that GNP-01 created. The content checks of GNP-01 read only `packages/packs/{core,nonfiction,fiction}` (`packages/packs/test/checks.ts`, `yamlFilesIn` per pack), so `golden/golden_probe/golden_probe.yaml` is not a pack tool for them.
- **GNP-03 and GNP-06 (done).** They share `apps/api/test/packs/` and no helper (`plans/GNP-03.md` line 160). No conflict.
- **PLT-14 (done).** The image copies `packages/packs` whole (`plans/PLT-14.md` line 231). The registry reads only the `core`, `nonfiction` and `fiction` tool folders of the packs root (`apps/api/src/modules/tool-registry/packs.ts` line 318; `BUILTIN_ORIGINS`), so `golden/golden_probe/golden_probe.yaml` is not loaded in the image.
- **TRG-08 and TRG-12 (done).** Their plans say that the goldens pin the header and catalogue lines (`plans/TRG-08.md` line 165) and the system messages (`plans/TRG-12.md` lines 210 and 235). This plan's goldens pin them through `messages`.
- **In-flight plans that change the same files.** Only `plans/GNP-11.md` (draft) and `plans/TRG-13.md` are draft or planned (`grep -l '^status: \(draft\|planned\)' plans/*.md`). GNP-11's section 2 lists only `examples/**`. TRG-13's section 2 lists only `apps/web/**` and `e2e/specs/tools-preview.e2e.ts`. Neither names `apps/api/vitest.config.mts`, `apps/api/test/packs/`, `e2e/fixtures/mock-openai/scenarios/` or `packages/packs/test/` as a path it changes (GNP-11 cites `summarize-outline.json` only as a read source). So the plans can merge in either order.
- **Module.** `modules/genre-packs.md` line 87 agrees with D1, D2, D5, D6, D9 and D18. Its line 13 lists GNP-02's blockers without PLT-04 (inconsistency I3 of section 7; informative, no action).

## 6. Open points

None. Former open point 1 (the recipe golden of `propose_graph` changes with every tool) is settled by D18. Former open point 2 (where the test-only tool is loaded from) is settled by D12: the temporary library's user pack keeps `SCRIBA_PACKS_DIR` = `packages/packs` (unit line 16, module line 87) and gives a test-only tool (unit line 24), with no effect on other units.

## 7. Facts checked and facts assumed

### Facts checked

Unit and module:
- `units/GNP-02-golden-harness.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Decisions lines 15 to 21; criteria lines 24 and 25. No note of a unit change.
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65 (inverse rule line 64; quoted entries lines 62, 63 and 65); testing rule line 138.
- `modules/genre-packs.md`: line 7 (ordering), line 13 (graph, GNP-02 blockers), line 31 (parallelism), line 85 (testing principles), lines 87 to 89 (golden tests, sample checks, system seam).
- Inverse rule: the fourteen units whose `blocked_by` names GNP-02 are exactly the `unblocks` list of GNP-02 (line 9). `parallel_with` is symmetric: GNP-01 line 8 names GNP-02. `units/PLT-04-api-composition-root.md`, `units/PLT-12-mock-openai-server.md` and `units/TRG-12-executor.md` line 9 each name "Genre packs golden harness (GNP-02)" in `unblocks`.
- Downstream units read: `units/GNP-04-propose-graph.md` (lines 7, 16, 20, 24, 25), `units/GNP-05-core-gate.md` (line 21), `units/GNP-07-cold-open.md`, `units/GNP-08-mystery-question.md`, `units/GNP-09-myth-buster.md`, `units/GNP-10-numbers-to-people.md` (line 22 each; GNP-09 line 23). None has a plan file or a `unit/<ID>` branch (`ls plans`, `git branch --list 'unit/GNP-*'` prints nothing).
- `plans/DECISIONS.md`: searched by GNP-02, GNP-04, PLT-04, PLT-12 and TRG-12. Lines 92 and 104 (byte-exact fixtures need `.prettierignore` entries; names GNP-02); line 673 (PLT-12 approval names GNP-02 downstream). No entry records a Navigator decision on GNP-02 or GNP-04.

Code and tests on main (`c91ca2d`):
- Execute route: `packages/contracts/src/tool-registry/routes.ts` lines 22 and 23; `apps/api/src/modules/tool-registry/tools.controller.ts` lines 157 to 169.
- Contracts: `call.ts` lines 47 to 50 (`toolCallRequestSchema`), lines 64 to 68 (`toolOutputSchema`: `kind`, `content`), lines 71 to 75 (`toolCallResultSchema`: `output`, `sourcesUsed`).
- Executor: `executor.service.ts` lines 30 to 40 (one system message per output kind; `draft` at lines 31 and 32); lines 72 to 103 (`execute`: `prepare` first, then the resolver, then messages `[system, user]` at lines 87 to 90); lines 117 to 121 (Ajv full-mode check); lines 140 to 146 (kind mismatch); lines 149 to 151 (`sources` exclude style refs); lines 161 to 168 (`toolCatalog` = valid and enabled tools of `catalog.list()`).
- Errors: `packages/contracts/src/tool-registry/errors.ts` line 10 (`ARGS_INVALID` = `TOOL_ARGS_INVALID`), line 45 (HTTP 422). `apps/api/src/modules/tool-registry/validate.ts` lines 144 to 151 (a missing required key is an issue on that key) and lines 218 to 246 (one message line per field issue, naming the field).
- Chat request body: `openai-compatible-client.ts` lines 242 to 249. Retries only before the first chunk: lines 115 and 116.
- Pack loader: `packs.ts` lines 88 to 90 (`userToolsDir` = `<books>/.scriba/packs/user/tools`), lines 276 to 285 (`yamlFilesIn`), line 318 (loop over `BUILTIN_ORIGINS` = `core`, `nonfiction`, `fiction`, `packages/contracts/src/tool-registry/constants.ts` line 55), lines 341 to 354 (`readBuiltinTools`). `catalog.service.ts` lines 164 to 172 (built-ins from `SCRIBA_PACKS_DIR`, user pack from `SCRIBA_BOOKS_DIR`), lines 303 to 306 (`entry` re-scans the user pack and does not filter by origin). `lint.ts` lines 491 to 500 (an undeclared entity kind is a warning only).
- Real packs: `packages/packs/{core,nonfiction,fiction}/tools` hold only `.gitkeep`; `packages/packs/nonfiction/entity-types/person.yaml` exists.
- Template: the probe's `{{#each entityIds}} [{{entity this}}]{{/each}}` form is the one of `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml` line 27.
- Precedent: `apps/api/test/tool-registry-executor.test.ts` lines 1 to 19 (imports), lines 27 to 29 (fixture packs roots), lines 46 to 86 (`openApp`: library, mock, app, cookie), lines 92 to 106 (`post` helper). `apps/api/test/tool-registry-loader.test.ts` lines 139 to 155 (a user-pack tool written into a temporary library).
- Test helpers: `apps/api/test/providers-client.kit.ts` line 16 (exports `startMockOpenAI`) and lines 61 to 70 (`recordsOf`); `apps/api/test/guard-request.ts` line 27 (`send`) and line 80 (`sessionCookie`); `apps/api/test/settings.kit.ts` line 60 (`makeLibrary`); `apps/api/test/invariant-sweep.ts` lines 38 and 39; `apps/api/test/create-test-app.ts` lines 65 to 87, with `SCRIBA_PACKS_DIR` default at line 80.
- Mock server: `e2e/fixtures/mock-openai/server.mjs` lines 17 to 19 (scenarios loaded per server instance), lines 103 to 131 (matchers), line 211 (`/scenario/<name>/v1/chat/completions`), lines 239 to 256 (records and reset), line 302 (one record per request).
- Scenario folder: 17 files on main, among them `tool-execute-draft.json` (TRG-12).
- Vitest: `apps/api/vitest.config.mts` is 11 lines (`include` `test/**/*.test.ts`, `testTimeout` 20000). `apps/api/package.json` line 7 (`"test": "npm run build && vitest run"`). `apps/api/tsconfig.json` line 8.
- `.prettierignore` lines 1 to 5: no golden or packs entry.
- `packages/packs/test/` holds `broken-specs.test.ts`, `checks.ts`, `content-checks.test.ts`, `fixtures/`, `real-packs.test.ts` and `smoke.test.ts`. No `README.md`, no `golden/`. `checks.ts` reads `.yaml` files per pack folder only.
- `apps/api/test/packs/` holds `core-entity-types.test.ts` (GNP-03) and `nonfiction-entity-types.test.ts` (GNP-06; `PACKS_ROOT` at lines 27 to 35).
- Other plans: `grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/GNP-02.md`, `plans/GNP-11.md` and `plans/TRG-13.md`.
- Git: `HEAD` is `c91ca2d`. Apart from this plan, `git status --short` shows ` M units/SAU-12-providers-step.md` and ` M plans/GNP-11.md`, changes of other units that the commit of step 12 must not include.

Experiments (planner, revision 1, in `/tmp/gnp02-flag-probe`, no repository file changed; vitest 5.1.0 from the root `node_modules`):
- E1 `vitest run --update-goldens` fails with `CACError: Unknown option --updateGoldens`.
- E2 `vitest run -- --update-goldens` is accepted. The test worker's `process.argv` does not contain the flag.
- E3 A `vitest.config.mjs` that sets a test env variable from `process.argv.includes('--update-goldens')` gives `'1'` in the worker with the flag and `'0'` without it.
- E4 `npm run t -- --update-goldens` (a script that runs `vitest run`) fails the same way as E1, because npm appends the flag without `--`.

### Facts assumed

- A1. Node 26 and npm 11 are on PATH, as the other plans state. Step 1 checks it.
- A2. A variable set by the config's `test.env` is in `process.env` when a test file is loaded. E3 shows it for the worker, and step 7 checks it for this repository.
- A3. `JSON.stringify(request, null, 2) + '\n'` for `{ messages: [...] }` is Prettier-clean. Not run. Step 9 checks it.
- A4. After `prettier --write`, the hand-written YAML and JSON of step 2 keep their content. Not run. Step 2 checks it.
- A5. The e2e mock tests do not depend on the number of scenario files. Checked by reading them; step 11 confirms it.
- A6. `vitest run` in `apps/api` reads `apps/api/vitest.config.mts`. Step 8 confirms it, because the flag works only if the config is read.
- A7. A user-pack tool copied into the library before boot is executable with no active project (`catalog.entry` has no origin filter). Not run; AC 1 part 1 checks it.

### Inconsistencies found in the unit files

- I1. `units/GNP-02-golden-harness.md` line 16 (every test boots with `SCRIBA_PACKS_DIR` = `packages/packs`) and line 24 (a test-only fixture tool). Not a conflict: the probe is a user-pack tool of the temporary library (D12). No unit change.
- I2. `units/GNP-02-golden-harness.md` line 20 asks for a documented `--update-goldens` flag. vitest accepts it only after `--` (E1, E4). The flag works as `vitest run -- --update-goldens` (D9) and the README documents that command. Line 20 is not in the way. No unit change.
- I3. `modules/genre-packs.md` line 13 gives GNP-02's blockers as TRG-12 and PLT-12 only; `units/GNP-02-golden-harness.md` line 7 also names PLT-04. `blocked_by` is the source of truth (`units/README.md` line 64), and PLT-04 is done, so the plan is not affected. A module file changes only by the Navigator; reported, not changed.
- I4. `units/GNP-02-golden-harness.md` line 7 puts two units in one quoted entry. `units/README.md` lines 62 and 63 describe one unit or one phase per entry. Form only; not in the way. No unit change.
- I5. `units/GNP-04-propose-graph.md` line 25 (the recipe golden includes the tool catalogue) with unit line 20 and module line 87 (goldens change only in the PR of the prompt edit). Not a conflict under D18: a PR that changes the catalogue changes that rendered prompt and regenerates the golden. Line 25 is an acceptance criterion and is not in the way. No unit change.

## 8. Review parts

- **Part 1 (the whole plan).** Steps 0 to 12, with the tests AC 1, AC 2, X1 and X2 of section 4. The reviewer of this part also checks that the commit changes only the files of section 2.
