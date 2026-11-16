---
id: GNP-02
status: draft
---
# GNP-02 plan — golden-test harness and the per-tool mock fixture convention

Batch: [GNP-02] (Genre packs, phase:core-propose-graph, M2), a batch of one. Revision 1 (planner), checked at main `aebc9f6`. Every fact of section 7 holds at that commit: `git diff --name-only 3f55c04 aebc9f6` lists only `plans/GNP-11.md`. The unit file was read in full (lines 1 to 25). It records no change of the unit in its text; its last change in git (`098add9`) added GNP-05 to `unblocks`.

Blockers, all merged: TRG-12 (`plans/TRG-12.md` line 3 `status: done`; commit `6594663` on main), PLT-04 (`plans/PLT-04.md` line 3 `status: done`; `apps/api/test/create-test-app.ts` exists), PLT-12 (`plans/PLT-12.md` line 3 `status: done`; `e2e/fixtures/mock-openai/server.mjs` exists). GNP-01 is `parallel_with` this unit and is merged (`plans/GNP-01.md` line 4).

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken. The two open points of section 6 concern D2 and D12.

- **D1 Suite home.** `apps/api/test/packs/`, the folder of the GNP-03 and GNP-06 tests. Source: unit line 15; module line 87.
- **D2 Boot.** Each case boots the composed app with `createTestApp` (`apps/api/test/create-test-app.ts` lines 65 to 87) against a temporary library and one mock scenario. Real tools use `SCRIBA_PACKS_DIR` = `packages/packs`. Source: unit line 16; module line 87. The one test-only tool is the exception: see D12 and open point 2.
- **D3 The call.** `POST /api/tool-registry/tools/:name/execute` with fixture arguments and fixture resolved entities, which is the `ToolCallRequest` shape (`packages/contracts/src/tool-registry/call.ts` lines 47 to 50). Source: unit line 16; `plans/TRG-12.md` line 216.
- **D4 What each case asserts.** (a) The request the mock recorded matches a checked-in golden. (b) `output.kind` and `sourcesUsed` equal the values the case declares. (c) Invalid arguments (here, the same call without `coreIdea`) return HTTP 422 with code `TOOL_ARGS_INVALID` and a message that names the field. Source: unit lines 17 to 19. The "no model call" check of (c) is a plan choice: `ExecutorService.prepare` throws before the model is called (`apps/api/src/modules/tool-registry/executor.service.ts` lines 77 and 117 to 121).
- **D5 Scenario convention.** One scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`, reached at `/scenario/pack-<tool>/v1`. Source: unit line 20; `plans/PLT-12.md` decision 6 (line 16) for the file shape.
- **D6 Golden and fixture files.** `packages/packs/test/golden/<tool>/<case>.fixture.json` (the `ToolCallRequest`) and `packages/packs/test/golden/<tool>/<case>.golden.json`. Source: unit line 15; module line 87. The file suffixes are a plan choice.
- **D7 What a golden holds.** The chat request's `messages`, and `tools` when the request has them. No other wire field: the client takes `model`, `temperature` and `max_tokens` from the provider config (`apps/api/src/modules/providers/client/openai-compatible-client.ts` lines 242 to 249), so they must not change a golden. Source: unit line 17 ("rendered prompt and function schema / system message"). The exclusion is a plan choice.
- **D8 Comparison and writing.** The golden is compared by value (`isDeepStrictEqual` of the parsed file), so the file's bytes do not matter to the test. The writer emits `JSON.stringify(value, null, 2)` and a final newline. Plan choice.
- **D9 The update flag.** `--update-goldens` makes the helper write goldens instead of comparing them. It is run as `cd apps/api && npx vitest run -- --update-goldens`. The vitest config maps the flag to the variable `SCRIBA_UPDATE_GOLDENS=1` for the test workers, because vitest rejects the flag unless it follows `--`, and the workers do not receive the flag in `process.argv` (section 7, experiment E1 to E4). Source: unit line 20 (the flag is documented). The mechanism is a plan choice. Goldens change only on purpose, in the same PR as the prompt edit. Source: module line 87; unit line 20.
- **D10 The helper.** `goldenCase(...)` returns the body of one `it(...)`, so a case is declared in a few lines. Source: unit line 20. Names are a plan choice.
- **D11 Fixtures are the tests' own.** No test reads `examples/`. Source: unit line 21; module line 88; `units/README.md` line 138.
- **D12 The test-only tool.** `golden_probe`, a draft tool with one required text input `coreIdea` and an entity list `entityIds` of kind `person`. Its spec is `packages/packs/test/golden/golden_probe/packs/core/tools/golden_probe.yaml`, a packs root of its own. Source: unit line 24 (a test-only fixture tool is needed). Where the tool is loaded from is open point 2; D12 is the default.
- **D13 Shared scenario folder.** The probe's scenario sits beside the other scenarios, as the unit's convention and TRG-12's `tool-execute-draft.json` do. Source: unit line 20; plan choice.
- **D14 Prettier.** The new JSON and YAML files pass `prettier --check`. `.prettierignore` does not change: `plans/DECISIONS.md` line 92 and line 104 ask for `.prettierignore` entries for byte-exact fixtures only, and these goldens are compared by value. Source: DECISIONS lines 92 and 104; `.prettierignore` lines 1 to 5; plan choice.
- **D15 Documentation.** `packages/packs/test/README.md` is a new file that states the convention. AC 2 tests it. Source: unit line 25; `plans/GNP-01.md` lines 66 and 121 (GNP-02 owns this README and the golden folder).
- **D16 Wiring.** No change to `packages/packs/package.json`. The golden tests run under apps/api's vitest, whose `include` is `test/**/*.test.ts` (`apps/api/vitest.config.mts`). Source: module line 87; plan choice.
- **D17 One model call.** A successful execute makes one model request, so each case expects exactly one recorded request. Source: `executor.service.ts` lines 87 to 103; `openai-compatible-client.ts` lines 115 to 116 (retries only before the first chunk); `e2e/fixtures/mock-openai/server.mjs` line 302 (one record per request).

## 2. Files to create or change

| Path | Action | What changes |
|---|---|---|
| `apps/api/test/packs/golden.kit.ts` | create | The helper of step 4: `PACKS_ROOT`, `GOLDEN_ROOT`, `UPDATE_GOLDENS`, `runGoldenCase`, `goldenCase`. Not a test file (vitest includes `test/**/*.test.ts` only) |
| `apps/api/test/packs/golden-harness.test.ts` | create | The four tests of section 4 |
| `apps/api/vitest.config.mts` | edit | Adds one `env` entry to `test` that maps the flag to `SCRIBA_UPDATE_GOLDENS` (D9), with a comment. Nothing else |
| `packages/packs/test/README.md` | create | The convention (D15) |
| `packages/packs/test/golden/golden_probe/packs/core/tools/golden_probe.yaml` | create | The test-only tool (D12), content in step 2 |
| `packages/packs/test/golden/golden_probe/two-people.fixture.json` | create | The fixture: arguments and two entities (step 2) |
| `packages/packs/test/golden/golden_probe/two-people.golden.json` | create by the update run (step 7) | The golden request of the probe case |
| `e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json` | create | The probe's scenario (D13), content in step 2 |

Not changed: `packages/packs/package.json`; `packages/packs/core/**`, `packages/packs/nonfiction/**`, `packages/packs/fiction/**`; the GNP-01 files `packages/packs/test/{broken-specs,checks,content-checks,real-packs,smoke}.test.ts` and `packages/packs/test/fixtures/**`; the GNP-03 and GNP-06 tests `apps/api/test/packs/{core,nonfiction}-entity-types.test.ts`; `apps/api/src/**`; `packages/contracts/**`; `e2e/fixtures/mock-openai/server.mjs`; `.prettierignore`; `package-lock.json`; `examples/**`; `units/**`; `modules/**`; `plans/DECISIONS.md`; `plans/QUEUE.md`; `units/SAU-12-providers-step.md` and `plans/TRG-13.md`, which have changes of other units.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on the branch the orchestrator names (`main` if it names none). Record `node -v` and `npm -v` with each result. Do not push. Change only the files of section 2.

0. **Base.** `git rev-parse --short HEAD` prints `aebc9f6`, or a later commit that changes only `plans/` and `units/`. `git diff --quiet aebc9f6 HEAD -- apps packages e2e scripts package.json .prettierignore` exits 0. `git ls-files packages/packs/test/README.md packages/packs/test/golden apps/api/test/packs/golden.kit.ts e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json` prints nothing. If a check fails, re-read the changed files before editing.
1. **Runtime and baseline.** `node -v` prints `v26.x` and `npm -v` prints `11.x` (assumption A1). Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && (cd apps/api && npx vitest run test/packs test/tool-registry-executor.test.ts)` exits 0, with the GNP-03, GNP-06 and TRG-12 tests passing.
2. **Test-only tool, fixture and scenario (D12, D13, D14).** Create three files:
   - `packages/packs/test/golden/golden_probe/packs/core/tools/golden_probe.yaml`:

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

     The shape follows `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml` (lines 1 to 27).
   - `packages/packs/test/golden/golden_probe/two-people.fixture.json`: `arguments` = `{"coreIdea": "Engines reward patience", "entityIds": ["person-a", "person-b"]}`; `entities` = two `ResolvedEntity` objects, `{"ref": "person-a", "type": "person", "path": "entities/person-a.md", "content": "Person A keeps a notebook."}` and the same for `person-b` with the content "Person B checks the notebook.".
   - `e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json`: `{"steps": [{"match": {"endpoint": "chat"}, "reply": {"kind": "stream", "deltas": ["Person A and Person B agree."]}}]}`.

   Then `npx prettier --write` on the three files, and `npx prettier --check` on them exits 0 (assumption A4).
3. **Config (D9).** Edit `apps/api/vitest.config.mts`: inside `test`, after `testTimeout`, add a comment and the line `env: { SCRIBA_UPDATE_GOLDENS: process.argv.includes('--update-goldens') ? '1' : '0' },`. The comment says that vitest reads the flag in the main process and that the test workers see only this variable. `npx prettier --check apps/api/vitest.config.mts` exits 0.
4. **Helper (D2 to D11, D17).** Create `apps/api/test/packs/golden.kit.ts`. It exports:
   - `PACKS_ROOT`, computed as in `apps/api/test/packs/nonfiction-entity-types.test.ts` lines 27 to 35 (four levels up, then `packages/packs`); `GOLDEN_ROOT` = `PACKS_ROOT/test/golden`; `UPDATE_GOLDENS` = `process.env.SCRIBA_UPDATE_GOLDENS === '1'`.
   - `runGoldenCase(options)`, where `options` is `{ tool, name, expect: { kind, sourcesUsed }, packsRoot?, goldenDir?, update? }`. The defaults are `PACKS_ROOT`, `GOLDEN_ROOT/<tool>` and `UPDATE_GOLDENS`. It returns `{ kind, sourcesUsed, golden, request, invalid: { status, code, message }, modelCalls }`, where `golden` is `'match' | 'differs' | 'missing' | 'written'`. Its steps, in order:
     a. Parse `<goldenDir>/<name>.fixture.json` with `toolCallRequestSchema` from the `tool-registry` subpath of the contracts.
     b. Start `startMockOpenAI()` (from `apps/api/test/providers-client.kit.ts`). Build the library with `makeLibrary`, as `apps/api/test/tool-registry-executor.test.ts` does (lines 48 to 65), with one provider `mock` whose `baseURL` is `${mock.baseUrl}/scenario/pack-${tool}/v1`. Start `createTestApp({ libraryDir, env: { SCRIBA_PACKS_DIR: packsRoot } })` and `sessionCookie(app, libraryDir)` (the same test, lines 75 to 81).
     c. `POST` the fixture to `TOOL_EXECUTE_ROUTE` with `:name` = `tool`, with the loopback host and origin of `apps/api/test/tool-registry-executor.test.ts` lines 92 to 106. Require status 200. Read `output.kind` and `sourcesUsed`.
     d. `recordsOf(mock, 'pack-' + tool)` holds exactly one record. `request` is `{ messages }`, plus `tools` when the record's body has it (D7).
     e. Golden. With `update` true, write `<goldenDir>/<name>.golden.json` as `JSON.stringify(request, null, 2) + '\n'` and report `'written'`. With `update` false, report `'missing'` if the file does not exist, `'match'` if `isDeepStrictEqual(JSON.parse(file), request)`, and `'differs'` otherwise. An update never runs when `update` is false, so the negative test cannot overwrite a golden.
     f. Invalid call: the same entities, with `arguments` minus `coreIdea`. Record the reply's status, `error.code` and `error.message`.
     g. `modelCalls` = the number of records after step f.
     h. Close the app, the mock and the temporary library in a `finally`.
   - `goldenCase(options)`, where `options` is `{ tool, name, expect, packsRoot? }`. It returns an async body for `it(...)`. The body runs `runGoldenCase` with the defaults and asserts: `golden` is `'written'` when `UPDATE_GOLDENS`, else `'match'`; `kind` and `sourcesUsed` equal `expect`; `invalid.status` is 422, `invalid.code` is `TOOL_ARGS_INVALID` and `invalid.message` contains `coreIdea`; `modelCalls` is 1.

   The file uses no `any`. Step 10 type-checks it, because the `apps/api` build checks `test` (`apps/api/tsconfig.json` line 8).
5. **Tests (section 4).** Create `apps/api/test/packs/golden-harness.test.ts`, with `PROBE_PACKS = join(GOLDEN_ROOT, 'golden_probe', 'packs')` and `PROBE_EXPECT = { kind: 'draft', sourcesUsed: ['person-a', 'person-b'] }`. It holds the four tests of section 4, with the names given there.
6. **README (D15).** Create `packages/packs/test/README.md`. It states, in plain words, every term that the AC 2 test checks (section 4): the layout of D6, the scenario name, the helper and its file, the command of D9 (`cd apps/api && npx vitest run -- --update-goldens`), the rule that goldens change only in the PR of the prompt edit, the invalid-argument check (`TOOL_ARGS_INVALID`), the rule on `examples/`, and the test-only tool folder `golden/<tool>/packs/`. Then `npx prettier --write packages/packs/test/README.md`.
7. **Write the probe golden (D9).** `cd apps/api && npx vitest run -- --update-goldens test/packs/golden-harness.test.ts` exits 0 and creates `packages/packs/test/golden/golden_probe/two-people.golden.json`. Read that file: `messages[0].content` is the draft system message (`executor.service.ts` lines 31 and 32), and `messages[1].content` contains `Core idea: Engines reward patience.` and both IDs, `person-a` and `person-b`. `git status --short packages/packs/test/golden` lists only the new file.
8. **Compare run and idempotence (D8, D9).** `cd apps/api && npx vitest run test/packs/golden-harness.test.ts` exits 0 with four tests passed, and AC 1 passes in compare mode (`golden` is `'match'`). Then repeat the command of step 7 and check that `git status --short packages/packs/test/golden` still lists only the new file with the same content (the writer reproduces the checked-in golden).
9. **Prettier (D14, assumption A3).** `npx prettier --check packages/packs/test apps/api/test/packs apps/api/vitest.config.mts e2e/fixtures/mock-openai/scenarios` exits 0. If the golden fails this check, stop and report: assumption A3 is false, and the fix (a `.prettierignore` entry) is a decision for the Navigator.
10. **Type check and lint.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0.
11. **Root gates and the e2e mock (assumption A5).** From the root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock still loads the new scenario file.
12. **Commit.** `git add` the paths of section 2 by name. `git diff --cached --stat` must list only them, and must not list `units/SAU-12-providers-step.md` or `plans/TRG-13.md`. Commit with `feat(GNP-02): golden-test harness and the per-tool mock fixture convention`. Do not use `git add -A` or `git commit -a`. Do not push.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-02-golden-harness.md` lines 24 and 25. Each criterion has one test. Extra tests X1 and X2 are plan choices: X1 checks the invalid-argument rule for the probe, and X2 checks the update path in a temporary folder, so that the flag is tested without changing the repository.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "A sample golden case against a test-only fixture tool passes, and fails when the template changes without updating the golden." (24) | `apps/api/test/packs/golden-harness.test.ts`, "AC 1: the sample golden case passes, and fails when the template changes without updating the golden" | `cd apps/api && npx vitest run test/packs/golden-harness.test.ts` | Part 1: the body from `goldenCase({ tool: 'golden_probe', name: 'two-people', packsRoot: PROBE_PACKS, expect: PROBE_EXPECT })` passes. Part 2: in a temporary copy of `PROBE_PACKS`, the test replaces `Core idea:` with `Core theme:` in the spec (it asserts that the text was found first), then calls `runGoldenCase` with `update: false`; `golden` is `'differs'`. The repository golden is not written. |
| "The convention is documented in `packages/packs/test/README.md`." (25) | "AC 2: the convention is documented in packages/packs/test/README.md" | same | The README contains each of these terms: `goldenCase`, `apps/api/test/packs/`, `--update-goldens`, `pack-<tool>.json`, `golden/<tool>/`, `.fixture.json`, `.golden.json`, `SCRIBA_PACKS_DIR`, `TOOL_ARGS_INVALID`, `examples/`, `same PR`. |
| Extra X1 (plan choice): "X1: invalid arguments return TOOL_ARGS_INVALID naming the missing field, and make no model call" | same file | same | `runGoldenCase` with `update: false` on the probe: `invalid.status` is 422, `invalid.code` is `TOOL_ARGS_INVALID`, `invalid.message` contains `coreIdea`, and `modelCalls` is 1. |
| Extra X2 (plan choice): "X2: a golden written by the update path is the checked-in golden" | same file | same | `runGoldenCase` with `update: true` and `goldenDir` set to a temporary folder that holds only the fixture returns `'written'`; the written file equals the checked-in golden by value; a second run in that folder with `update: false` returns `'match'`. |

Expected: four tests pass, none is skipped. Without the flag, AC 1 expects `'match'`. With the flag (step 7), it expects `'written'`.

## 5. Downstream agreement

- **GNP-04 (propose_graph; unit line 25 names the goldens).** Needs: `goldenCase` for the story view and for the recipe view, with the default packs root, and `pack-propose_graph.json`. Both cases share one scenario file, since the convention is one scenario per tool (unit line 20). So that file needs matchers: `lastMessageRole` and `lastMessageContent` (`e2e/fixtures/mock-openai/server.mjs` lines 103 to 131, with `plans/PLT-12.md` decision 8 at line 18) pick each view's reply by a substring of that case's own prompt. The helper does not write these matchers; GNP-04 does. The recipe golden depends on open point 1. GNP-04's Scope and Decisions need nothing else from this plan.
- **GNP-05 (core gate; unit line 21).** Needs only GNP-04's goldens. Nothing from this plan beyond GNP-04.
- **GNP-07, GNP-08, GNP-09, GNP-10 (nonfiction draft tools; unit line 22 each).** Each declares `goldenCase` with a fixture of the five common inputs and its entity inputs, with `expect.sourcesUsed` as the non-style entity IDs of that fixture (style profile excluded). The helper gives the invalid-argument check and the one-call check. The clause "the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions" is a check of the golden's content, which the tool's own test can add, since `runGoldenCase` returns `request`. GNP-09's kind check on `claimIds` (`TOOL_ENTITY_KIND_MISMATCH`) comes from the executor (`executor.service.ts` lines 140 to 146), and GNP-09's own test covers it.
- **GNP-14 to GNP-17 and GNP-20 to GNP-23 (their golden criteria: GNP-14 line 20, GNP-15 line 22, GNP-16 lines 22 and 23, GNP-17 line 20, GNP-20 line 20, GNP-21 line 23, GNP-22 line 32, GNP-23 line 24).** The same contract. GNP-14 needs `entity` output kind and `sourcesUsed` (the helper takes any kind). GNP-16 also needs a second invalid call ("calling it with one character fails Ajv", `units/GNP-16-dialogue.md` line 23); the helper checks only the call without `coreIdea`, so GNP-16 writes that check itself. GNP-17 and GNP-20 pass fixture text as arguments, which the helper accepts as it is.
- **PLT-04, PLT-12 and TRG-12 (upstream, done).** They provide what this plan uses: the environment override of `createTestApp` (`apps/api/test/create-test-app.ts` lines 65 to 87), the records and reset endpoints of the mock (`e2e/fixtures/mock-openai/server.mjs` lines 239 to 256), and the execute route and its result (`packages/contracts/src/tool-registry/routes.ts` lines 22 to 23; `call.ts` lines 47 to 75; `apps/api/src/modules/tool-registry/tools.controller.ts` lines 157 to 169). Nothing is missing.
- **GNP-01 (done).** `plans/GNP-01.md` lines 66 and 121 say that GNP-02 owns `packages/packs/test/README.md` and `packages/packs/test/golden/`. This plan creates both and changes nothing that GNP-01 created.
- **GNP-03 and GNP-06 (done).** They share `apps/api/test/packs/` and no helper (`plans/GNP-03.md` line 160). No conflict.
- **PLT-14 (done).** The image copies `packages/packs` whole (`plans/PLT-14.md` line 231). The registry reads only the `core`, `nonfiction` and `fiction` tool folders of the packs root (`apps/api/src/modules/tool-registry/packs.ts` line 318), so `golden/golden_probe/packs` is not loaded in the image.
- **TRG-08 and TRG-12 (done).** Their plans say that the goldens pin the header and catalogue lines (`plans/TRG-08.md` line 165) and the system messages (`plans/TRG-12.md` lines 210 and 235). This plan's goldens pin them through `messages`.
- **In-flight plans that change the same files.** Only `plans/GNP-11.md` (draft) and `plans/TRG-13.md` (planned) are draft or planned. GNP-11's section 2 lists only `examples/**`. TRG-13's section 2 lists only `apps/web/**` and `e2e/specs/tools-preview.e2e.ts`. No other in-flight plan names `apps/api/vitest.config.mts`, `e2e/fixtures/mock-openai/scenarios/` or `packages/packs/test/`. So the two plans can merge in either order.
- **Module.** `modules/genre-packs.md` line 87 agrees with D1, D2, D5, D6 and D9. Its line 13 is incomplete (inconsistency I3 of section 7).

## 6. Open points

1. **The recipe golden of propose_graph changes with every tool.** The `{{toolCatalog}}` value lists every enabled and valid tool of the packs root (`executor.service.ts` lines 161 to 168). So a golden that includes it changes whenever another tool is added, renamed or disabled. GNP-04's criterion (unit line 25) requires the recipe golden to include the catalogue. Module line 87 says that goldens change only in the PR of the prompt edit. Options: (a) the PR that changes the catalogue also regenerates the `propose_graph` recipe golden, and the reviewer checks that in the golden diff; (b) the recipe case boots a packs root with a fixed tool set, which needs a second packs root per case and departs from D2. Effect: GNP-04 and every later tool PR. This plan does not depend on the answer. Navigator decides.
2. **Where the test-only tool is loaded from.** Unit line 16 and module line 87 say that every test boots with `SCRIBA_PACKS_DIR` = `packages/packs`. Unit line 24 needs a test-only fixture tool, which cannot sit in `packages/packs/core/tools` without shipping in the image and in the tool list. Options: (a) plan default (D12): a packs root of its own under `packages/packs/test/golden/golden_probe/packs`, as TRG-12's test does with `apps/api/test/fixtures/executor/packs`; (b) copy the spec into the temporary library's `packs/` folder, which `createTestApp` uses by default (`apps/api/test/create-test-app.ts` line 80); (c) put the spec in `packages/packs/core/tools` and remove it before the phase closes. Effect: (c) adds the probe to every `{{toolCatalog}}` golden (open point 1) and to the production tool list; (a) and (b) affect no other unit. The plan is written with (a). Navigator confirms it or chooses (b).

## 7. Facts checked and facts assumed

### Facts checked

Unit and module:
- `units/GNP-02-golden-harness.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Decisions lines 15 to 21; criteria lines 24 and 25.
- `units/README.md`: unit format lines 34 to 49; blocker notation lines 59 to 65 (inverse rule line 64; quoted entries line 65); testing rule line 138.
- `modules/genre-packs.md`: line 7 (ordering), line 13 (graph, GNP-02 blockers), line 31 (parallelism), line 85 (testing principles), lines 87 to 89 (golden tests, sample checks, system seam).
- Inverse rule: the fourteen units whose `blocked_by` names GNP-02 (lines 7 of GNP-04, 05, 07, 08, 09, 10, 14, 15, 16, 17, 20, 21, 22 and 23) are exactly the `unblocks` list of GNP-02 (line 9). `parallel_with` is symmetric: GNP-01 line 8 names GNP-02.
- `plans/DECISIONS.md` lines 92 and 104 (byte-exact fixtures need `.prettierignore` entries, owner decides; names GNP-02); line 673 (TRG-12 approval names GNP-02 downstream). No DECISIONS entry records a GNP-02 decision.
- `plans/QUEUE.md` line 2: GNP-02 `available: yes`.
- Plan structure: `plans/PLT-02.md` front matter lines 1 to 4 (keys `id`, `status`); sections at lines 11, 35, 60, 77, 89 and 95. `plans/GNP-01.md` front matter lines 2 to 4, section 7 for facts.

Code and tests on main:
- Execute route: `packages/contracts/src/tool-registry/routes.ts` lines 22 and 23; `apps/api/src/modules/tool-registry/tools.controller.ts` lines 157 to 169.
- Contracts: `call.ts` line 7 (`toolArgumentsSchema` = a record), lines 47 to 50 (`toolCallRequestSchema`), lines 64 to 68 (`toolOutputSchema`: `kind`, `content`), lines 71 to 75 (`toolCallResultSchema`: `output`, `sourcesUsed`); `index.ts` exports `call.js` and `routes.js` and `errors.js`.
- Executor: `executor.service.ts` lines 30 to 40 (one system message per output kind; `draft` at lines 31 and 32); lines 72 to 103 (`execute`: `prepare` first, then the resolver, then messages `[system, user]` at lines 87 to 90, output at lines 99 to 102; `sourcesUsed` are entity IDs); lines 117 to 121 (Ajv full-mode check); lines 140 to 146 (kind mismatch); lines 161 to 168 (`toolCatalog` = valid and enabled tools).
- Errors: `packages/contracts/src/tool-registry/errors.ts` line 10 (`ARGS_INVALID` = `TOOL_ARGS_INVALID`), line 45 (HTTP 422). `apps/api/src/modules/tool-registry/validate.ts` lines 218 to 246 (lead line names the tool; one line per field issue).
- Chat request body: `openai-compatible-client.ts` lines 242 to 249 (`model`, `messages`, `temperature`, `max_tokens`, `stream: true`, `tools` and `tool_choice` only when set). Retries only before the first chunk: lines 115 and 116.
- Pack loader: `apps/api/src/modules/tool-registry/packs.ts` lines 276 to 285 (`yamlFilesIn`: regular, non-hidden `.yaml` files), line 318 (built-in packs `core`, `nonfiction`, `fiction`), lines 341 to 354 (`readBuiltinTools`). `catalog.service.ts` lines 164 and 167 read `SCRIBA_PACKS_DIR`.
- Template: the probe's `{{#each entityIds}} [{{entity this}}]{{/each}}` form is the one of `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml` line 27.
- Precedent: `apps/api/test/tool-registry-executor.test.ts` lines 27 to 29 (fixture packs roots), lines 46 to 86 (`openApp`: library, mock, app, cookie), lines 92 to 106 (`post` helper). Its scenario `tool-execute-draft.json` sits in the shared folder.
- Test helpers: `apps/api/test/providers-client.kit.ts` line 16 (exports `startMockOpenAI`) and lines 61 to 70 (`recordsOf`); `apps/api/test/guard-request.ts` line 27 (`send`) and line 80 (`sessionCookie`); `apps/api/test/settings.kit.ts` line 60 (`makeLibrary`); `apps/api/test/invariant-sweep.ts` lines 38 and 39 (loopback host and origin); `apps/api/test/create-test-app.ts` lines 65 to 87, with `SCRIBA_PACKS_DIR` default at line 80.
- Mock server: `e2e/fixtures/mock-openai/server.mjs` line 19 (`scenariosDir`, read per server instance at lines 17 and 18), line 211 (`/scenario/<name>/v1/chat/completions`), line 239 (`GET /__mock/scenarios/<name>/requests`), lines 248 and 254 (`POST …/reset`), lines 103 to 131 (matchers, including `lastMessageContent`), line 302 (one record per request, `body` parsed JSON).
- Scenario folder: 17 files on main. `plans/PLT-12.md` decision 12 (line 37) says exactly two shipped scenarios; main was changed after that plan. The e2e test `e2e/fixtures/mock-openai/test/mock-openai.test.ts` lists no folder.
- Vitest: `apps/api/vitest.config.mts` is 11 lines (`include` `test/**/*.test.ts`, `testTimeout` 20000). `apps/api/package.json` line 7 (`"test": "npm run build && vitest run"`). `apps/api/tsconfig.json` line 8 (`include` `src` and `test`). No vitest binary under `apps/api/node_modules/.bin`; the root vitest is 5.1.0.
- `.prettierignore` lines 1 to 5: `/units/`, `/modules/`, `/plans/`, `/package-lock.json`, `/apps/api/test/fixtures/lint/`. No golden or packs entry.
- `packages/packs/test/` holds `broken-specs.test.ts`, `checks.ts`, `content-checks.test.ts`, `fixtures/`, `real-packs.test.ts` and `smoke.test.ts`. No `README.md`, no `golden/` (GNP-02 creates both).
- `apps/api/test/packs/` holds `core-entity-types.test.ts` (GNP-03) and `nonfiction-entity-types.test.ts` (GNP-06; `PACKS_ROOT` at lines 27 to 35). No helper is shared.
- Blockers: `plans/TRG-12.md`, `plans/PLT-04.md`, `plans/PLT-12.md`, `plans/GNP-01.md`, `plans/GNP-03.md` and `plans/GNP-06.md`, each `status: done` on line 3 or 4. `plans/PLT-14.md` line 231 (the image copies `packages/packs`). `plans/GNP-01.md` lines 66 and 121 (GNP-02 owns the README and the golden folder). `plans/PLT-12.md` lines 16 to 18 (decisions 6 to 8), 35 and 36 (records and reset), 42 (decision 15), 192 (the GNP-02 needs). `plans/TRG-12.md` lines 210, 216 and 235. `plans/TRG-08.md` line 165. `plans/GNP-03.md` line 160.
- Other plans: `grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/GNP-11.md` and `plans/TRG-13.md` only. GNP-11's section 2 lists `examples/**` only; TRG-13's section 2 lists `apps/web/**` and `e2e/specs/tools-preview.e2e.ts` only.
- Git: `HEAD` is `aebc9f6`. `git status --short` shows only ` M units/SAU-12-providers-step.md`.

Experiments (planner, in `/tmp/gnp02-flag-probe`, no repository file changed; vitest 5.1.0 from the root `node_modules`):
- E1 `vitest run --update-goldens` fails with `CACError: Unknown option --updateGoldens`.
- E2 `vitest run -- --update-goldens` is accepted. The test worker's `process.argv` does not contain the flag.
- E3 A `vitest.config.mjs` that sets a test env variable from `process.argv.includes('--update-goldens')` gives `'1'` in the worker with the flag and `'0'` without it.
- E4 `npm run t -- --update-goldens` (a script that runs `vitest run`) fails the same way as E1, because npm appends the flag without `--`.

### Facts assumed

- A1. Node 26 and npm 11 are on PATH, as the other plans state. Step 1 checks it.
- A2. A variable set by the config's `test.env` is in `process.env` when a test file is loaded. E3 shows it for the worker, and step 7 checks it for this repository.
- A3. `JSON.stringify(request, null, 2) + '\n'` for `{ messages: [...] }` is Prettier-clean, because Prettier keeps the line breaks of objects that have them and breaks arrays that hold objects. Not run. Step 9 checks it.
- A4. After `prettier --write`, the hand-written YAML and JSON of step 2 keep their content. Not run. Step 2 checks it.
- A5. The e2e mock tests do not depend on the number of scenario files. Checked by reading them; step 11 confirms it.
- A6. `apps/api` test run by `vitest run` picks up `apps/api/vitest.config.mts` from the package folder, not from the root. Assumed from the file location; step 8 confirms it, because the flag works only if the config is read.

### Inconsistencies found in the unit files (not fixed)

- I1. `units/GNP-02-golden-harness.md` line 16 (every test boots with `SCRIBA_PACKS_DIR` = `packages/packs`) and line 24 (a test-only fixture tool) do not say where the test-only tool is loaded from. Module line 87 repeats line 16. Open point 2.
- I2. `units/GNP-02-golden-harness.md` line 20 asks for a documented `--update-goldens` flag. vitest accepts it only after `--`, and npm does not add that `--` (E1, E4). The flag works as `vitest run -- --update-goldens` (D9), but the unit names no command.
- I3. `modules/genre-packs.md` line 13 gives GNP-02's blockers as TRG-12 and PLT-12 only. `units/GNP-02-golden-harness.md` line 7 also names PLT-04 (create-test-app).
- I4. `units/GNP-02-golden-harness.md` line 7 puts two units in one quoted entry ("Platform create-test-app (PLT-04) and mock OpenAI server (PLT-12)"). `units/README.md` lines 62 and 63 describe one unit or one phase per quoted entry. Form only.
- I5. `units/GNP-04-propose-graph.md` line 25 (the recipe golden includes the tool catalogue) and `units/GNP-02-golden-harness.md` line 20 with `modules/genre-packs.md` line 87 (goldens change only in the PR of the prompt edit) conflict when another tool changes the catalogue. Open point 1.
