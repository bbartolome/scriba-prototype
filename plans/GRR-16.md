---
id: GRR-16
status: draft
unit: units/GRR-16-sample-recipe.md
module: graph-runner
---
# GRR-16 plan — nonfiction sample recipe `graphs/chapter-opening.json`, its mock scenario, and a start-from-sample run test

Draft, planned by the planner against main `526c134` (`git rev-parse --short HEAD`; the working tree was clean). "CHECKED" means read or grepped on main, with the file and line. "ASSUMED" means not run here (section 3b). The unit has no change notes; the only commit that touches `units/GRR-16-sample-recipe.md` is `2fed3f4` (a move).

## 1. Summary

The unit adds one recipe to the nonfiction sample, one mock scenario for it, a checked-in copy of the sample parts that a run needs, and one API test. No code changes. Criterion 1 is the CI sample check (`npm run lint:examples`). Criterion 2 is an API test that starts the sample, runs the recipe with input values against the mock, and checks the result. Two tests in all (section 7).

## 2. Decisions this plan obeys

### 2a. Settled by the unit, the module and the record

- **D1 Location and name.** One file, `examples/nonfiction/graphs/chapter-opening.json`. The graph id is the file stem, `chapter-opening` (`units/GRR-16-sample-recipe.md` line 15; `modules/graph-runner.md` line 45; `GRAPH_ID_PATTERN` in `packages/contracts/src/graph-runner/constants.ts` line 22).
- **D2 Content.** A recipe, not a story graph: input, tool and output nodes only, joined by typed wires (`modules/graph-runner.md` line 60). No story graph, and no `logs/`, `.scriba/`, `snapshots/` or `drafts/.versions/` (`units/GRR-16-sample-recipe.md` lines 15 to 22). `examples/nonfiction/project.yaml` is not changed; its `order` field belongs to CEX-08 (`units/CEX-08-nonfiction-sample-order.md` line 15).
- **D3 Node kinds and params.** Input params are `{type, label, entityKind?}`, with `type` one of `text | entity | style`. Output params are `{label?, path?}`. Tool params are the settings plus the pinned port values, keyed by the spec's names (`packages/contracts/src/graph-runner/graph.ts` lines 72 to 108; `PORT_TYPES` in `packages/contracts/src/tool-registry/constants.ts` line 26).
- **D4 Ports follow the workhorse specs** (`units/GRR-16-sample-recipe.md` line 21). The specs are `packages/packs/nonfiction/tools/{cold_open,mystery_question,myth_buster,numbers_to_people}.yaml`. Their ports, read from each file's `inputs.properties` and `required:` list:

  | Tool | Required | Other text | Entity | Style |
  |---|---|---|---|---|
  | `cold_open` | `coreIdea` (text), `person` (entity, kind `person`) | `moment` | `entityIds` (list) | `styleProfile` |
  | `mystery_question` | `coreIdea`, `puzzle` (text) | `surprisingFinding` | `entityIds` | `styleProfile` |
  | `myth_buster` | `coreIdea`, `belief` (text), `claimIds` (entity list, kind `claim`) | | `entityIds` | `styleProfile` |
  | `numbers_to_people` | `coreIdea`, `statistic` (text), `person` (entity, kind `person`) | | `entityIds` | `styleProfile` |

  Each tool's output is `draft` (`output: draft` in each file).
- **D5 Wire types.** A tool's one output port has type `text` in v1 (`packages/contracts/src/tool-registry/views.ts` lines 21 to 24; the tool's output kind is `draft`). A wire joins two ports, and the wire rule compares port types (`apps/api/src/modules/graph-runner/graph-validation.ts` line 71, "A wire joins ports of different types."). Kinds of entities are not compared by a wire (GRR-11 Decisions: the connection validator checks types only). So a tool output can feed a `text` port.
- **D6 Validation rules that shape the recipe** (`graph-validation.ts`). One wire into each input (`multiple-wires-into-port`, error). A required port needs one wire or one pinned value (error, line 83). A port may not be both wired and pinned (error, line 77). Each output is fed by a tool whose output kind is writable (`output-kind-unwritable`, error; `draft` is writable per GRR-06 Decisions). `dead-step` and `input-unwired` are warnings (lines 110 and 113).
- **D7 Output target.** Precedence: the run request's `targets[nodeId]`, then `params.path`, then a generated name. A `draft` goes to the top level of `drafts/`. A target outside its kind's folder is `GRAPH_TARGET_INVALID` (`units/GRR-06-output-nodes-pending-changes.md` Decisions).
- **D8 Run request.** `POST /api/graph-runner/runs` with `{graphId, inputs, target?, targets?}`. Input values are `text`, `file`, `entities` or `style` (`packages/contracts/src/graph-runner/runs.ts`, `runStartRequestSchema` and `inputValueSchema`; `units/GRR-04-run-engine-core.md` Decisions). Nodes run one at a time in topological order, ties by node id; one active run per project (GRR-04 Decisions).
- **D9 Sample check.** `npm run lint:examples` (root `package.json` line 27) runs `scripts/examples-check/index.mjs`. The graph layer parses every `graphs/` file with the graph schema (`units/PLT-21-examples-check-graph-layer.md` lines 16 and 21). The pack layer checks each recipe tool node: a built-in tool, and its `params` validated in `params` mode (`plans/PLT-22.md` D10, line 63). An output node's `params.path` is not checked (`plans/PLT-22.md` line 67; `plans/PLT-21.md` section 6, point 5).
- **D10 Test rules.** Unit tests never read `examples/` (`units/README.md` line 139; `modules/graph-runner.md` line 55). The examples check fails any `*.test.*` or `*.spec.*` file that names `examples/` (`scripts/examples-check/m1.mjs` lines 25 to 33 for the patterns and lines 201 to 222 for the scan; its message is "a unit test names examples/; use a temp folder"). A temp folder is the remedy (`units/PST-05-start-from-sample.md` line 23).
- **D11 Test seam.** The API seam: the composed app against a temp library, with the mock OpenAI server. External behaviour only: HTTP responses, files on disk, and what the mock received (`modules/graph-runner.md` lines 49 and 50; `units/README.md` line 139).
- **D12 Mock scenario contract.** A scenario is `e2e/fixtures/mock-openai/scenarios/<name>.json`, reached at `…/scenario/<name>/v1`. Steps match on `endpoint`, `attempt` and content (`units/PLT-12-mock-openai-server.md` lines 22 to 25). "Scenario paths naming files in the nonfiction sample are a contract with `examples/`: renaming a sample file updates the scenario in the same PR" (PLT-12 line 26; this unit's line 23).

### 2b. Planner's choices (the simplest option that the sources allow)

- **C1 Recipe content.** The graph of section 4: four workhorse tool nodes chained through their text ports (`mystery`, then `cold-open`, `myth-buster`, `numbers-to-people`, then `draft`), three inputs, one output. Every tool takes the `house-style` input on its `styleProfile`. The chain's content is a placeholder (open point 6).
- **C2 Pinned values.** The required ports with no wire are pinned in `params`: `mystery.puzzle` (text); `cold-open.person` and `numbers-to-people.person` (`k-anders-ericsson`, type `person`); `myth-buster.claimIds` (`hours-figure-is-average`, type `claim`). The ids are the file stems of `examples/nonfiction/entities/`.
- **C3 Output path.** `params.path` is `drafts/chapter-opening.md`, so the run's pending change has a known path. A run request may override it through `targets`.
- **C4 Scenario name.** `recipe-chapter-opening`, named after the recipe file (D12).
- **C5 Test copy.** A checked-in copy of the sample parts that the run reads, under `apps/api/test/fixtures/chapter-opening-sample/`. The test copies it into a temp folder. Reason: D10 forbids a test file that names `examples/`, and criterion 2 requires a temp copy. Open point 1.
- **C6 Test boot.** The test builds its own boot. The helpers of `apps/api/test/graph-runner-run.kit.ts` are local copies by design (its header), so the test copies the boot of `openRunHarness` (from line 82) and adds `env: {SCRIBA_EXAMPLES_DIR}` to `createTestApp`.

## 3. Facts checked and assumed

### 3a. CHECKED

- **Base.** `git rev-parse --short HEAD` is `526c134` (main). `git status --short` is empty. `examples/nonfiction/` has `drafts/` (4 files), `entities/` (5 files), `sources/` (4 files) and `project.yaml`, and no `graphs/`. `examples/samples.yaml` lists one sample, `nonfiction`.
- **Blockers are all done.** GRR-01 (`plans/GRR-01.md`, `status: done`). The workhorses gate is GNP-12 (`units/README.md` line 107; `plans/GNP-12.md`, `status: done`). PLT-21 and PLT-22 (`plans/PLT-21.md`, `plans/PLT-22.md`, both `status: done`). GRR-16 is available.
- **Blocker notation.** The `blocked_by` entry `"Genre packs phase:nonfiction-workhorses (workhorse port names)"` names no gate unit id (`units/GRR-16-sample-recipe.md` line 7). The entry `"Platform examples check graph layer (PLT-21) and pack layer (PLT-22)"` names two units in one quote, and `units/README.md` line 62 gives one gate per quote. `modules/graph-runner.md` line 27 names PLT-21 only. The plan does not depend on this notation (open point 4).
- **Specs.** The D4 table is read from the four YAML files in `packages/packs/nonfiction/tools/`.
- **Recipe contract.** `graph.ts`: input params (lines 72 to 76), output params (79 to 82), tool params (85), node union (88 to 108), wires (111 to 115), recipe shape (127 to 133), `graphFileSchema` (183 to 186). Node ids match `/^[a-z0-9][a-z0-9-]*$/` (`constants.ts` line 19). A port id is `<node>.<key>` (`graph.ts` line 22).
- **The contract's example recipe is not this recipe.** `packages/contracts/src/graph-runner/examples.ts` lines 87 to 138 use `mystery_question` with a `text` port, and `cold_open` with `question`, `people` and `style` ports, and params `words` and `voice`. None of these is in the specs. GNP-08 (`plans/GNP-08.md` lines 291 and 292) and GNP-10 (`plans/GNP-10.md` line 127) name GRR-01 and GRR-16 as its owners. This plan does not change the file (open point 5).
- **Validation severities.** `graph-validation.ts`: `duplicate-id` is an error (lines 53 to 57); `dead-step` is a warning (line 110); `input-unwired` is a warning (line 113); the rule messages are at lines 67 to 103. `UNWRITABLE_OUTPUT_KINDS` is described at line 15; its list was not read in full. Module line 62 names `claims` and `check`.
- **Params mode.** `apps/api/src/modules/tool-registry/validate.ts` lines 93 to 99: in `params` mode the port keys are removed before validation. So pinned port values are not checked by the CI pack layer (open point 3).
- **Examples check output.** `scripts/examples-check/index.mjs` prints `examples check passed: <n> sample(s), …` and exits 0 (lines 84 to 90). On issues it writes each to stderr, then the count, and exits 1 (lines 93 to 95).
- **Sample parts.** `entities/k-anders-ericsson.md`: `type: person`. `entities/hours-figure-is-average.md`: `type: claim`, `status: supported`. `entities/book-style.md`: `type: style-profile`. `drafts/the-ten-thousand-hour-idea.md` exists. `project.yaml` has `schemaVersion`, `title` and `genrePack`, and no `order` key.
- **Mock.** `e2e/fixtures/mock-openai/server.mjs`: `DEFAULT_SCENARIOS_DIR` is the shipped `scenarios/` folder (lines 6 to 9). `loadScenarios` loads every `*.json` by file name (lines 51 to 83). Step matchers are `endpoint`, `attempt`, `turnIndex`, `lastMessageRole`, `lastMessageContent`, `toolResultPresent` and `header` (lines 103 onward). `findStepIndex` takes the first step whose matchers all hold. The attempt counter is per endpoint per scenario (line 284). No matching step is HTTP 500 (line 306). The shipped `pack-cold_open.json` is one `chat` step with one `stream` reply.
- **Test helpers.** `apps/api/test/graph-runner-run.kit.ts`: `STATIC_ROOT` (line 21); `openRunHarness` (line 82 onward; the provider `baseURL` is `${mock.baseUrl}/scenario/${SCENARIO}/v1`, with `projects.active` and `providers.appDefault` in the settings); `postRun` (line 271); `getRun` (after it). `apps/api/test/project-store-samples.kit.ts`: `buildSamplesFixture` (line 52), `startFromSample` (line 135). `apps/api/test/providers-client.kit.ts`: `targetFor`, `recordsOf`, and `startMockOpenAI` (re-exported from the mock's `server.mjs`). `apps/api/test/create-test-app.ts` line 82 sets `SCRIBA_EXAMPLES_DIR` to `<library>/examples` unless the caller sets it.
- **Routes.** `packages/contracts/src/graph-runner/routes.ts`: `RUNS_ROUTE`, `RUN_CURRENT_ROUTE`. `packages/contracts/src/project-store/routes.ts`: `PROJECT_START_FROM_SAMPLE_ROUTE` (line 9), `SAMPLES_ROUTE` (line 11), `ACTIVE_PROJECT_ROUTE` (line 12; its `@Post` is in `apps/api/src/modules/project-store/active-project.controller.ts` line 26, the activation), `PROJECT_PENDING_ROUTE` (line 36). Run state (`runs.ts` lines 85 to 107): `nodes` is a record of `{status, result?, error?}`.
- **API test script.** `apps/api/package.json` line 7: `npm run build && vitest run`.
- **Prettier.** `.prettierignore` lists `/units/`, `/modules/`, `/plans/`, `/package-lock.json` and `/apps/api/test/fixtures/lint/`. So `prettier --check .` covers `examples/`, `e2e/fixtures/` and the new fixture.
- **Other plans and units on the same paths.** The grep of `plans/DECISIONS.md` finds no entry that names GRR-16. `plans/GRR-10.md` (planned at `526c134`) lists its paths at line 137; line 207 says it changes neither `examples/nonfiction/graphs/` nor `e2e/fixtures/mock-openai/`. `plans/SAU-22.md` and `plans/TRG-14.md` have no `examples/` or `mock-openai` path (grep count 0). `units/CEX-08-nonfiction-sample-order.md` line 15 changes `examples/nonfiction/project.yaml` only. `plans/PST-11.md` line 206 names GRR-16 as a later change under `examples/nonfiction/**`.

### 3b. ASSUMED (not run)

- **A1.** The executor sends one chat request per tool node, and the request body holds the rendered prompt, including the upstream text. Checked by T2 step 6, which reads what the mock received.
- **A2.** The wires force the run order: mystery, cold-open, myth-buster, numbers-to-people. Input nodes call no model. So the mock's attempts 1 to 4 are these four tools in this order.
- **A3.** A run reads only the entities named by its inputs and pins, not the `sources` or `evidence` references in front matter. If a run fails on a missing reference, the fixture also needs `sources/*.md`; add those files then.
- **A4.** The project folder is `<library>/<project-id>/`, and a pending change does not write its file (`modules/graph-runner.md` line 3).
- **A5.** `npm run lint:examples` passes on main with the new file. Not run.
- **A6.** `pendingChangeSchema` has `targetPath` and `origin` (`packages/contracts/src/project-store/pending.ts` lines 40 and 50), and `origin.kind` is `recipe-run` (GRR-06 Decisions).

## 4. The recipe

File: `examples/nonfiction/graphs/chapter-opening.json`. `schemaVersion: 1`, `view: "recipe"`, `name: "Chapter opening"`. Write it as `JSON.stringify(value, null, 2)` plus a final newline, then run `npx prettier --write` on it (Prettier collapses short arrays).

Nodes (`id`, `kind`, `params`, `position` as x, y):

| id | kind | params | position |
|---|---|---|---|
| `chapter-notes` | input | `{"type": "text", "label": "Chapter notes"}` | 0, 0 |
| `people` | input | `{"type": "entity", "label": "Key people and claims"}`, no `entityKind` | 0, 160 |
| `house-style` | input | `{"type": "style", "label": "House style"}` | 0, 320 |
| `mystery` | tool `mystery_question` | `{"puzzle": "Why does one figure about practice hours get quoted as a rule?"}` | 320, 0 |
| `cold-open` | tool `cold_open` | `{"person": "k-anders-ericsson"}` | 640, 0 |
| `myth-buster` | tool `myth_buster` | `{"claimIds": ["hours-figure-is-average"]}` | 960, 0 |
| `numbers-to-people` | tool `numbers_to_people` | `{"person": "k-anders-ericsson"}` | 1280, 0 |
| `draft` | output | `{"label": "Chapter draft", "path": "drafts/chapter-opening.md"}` | 1600, 0 |

Wires (`id`: `from` → `to`):

| id | from | to |
|---|---|---|
| w1 | `chapter-notes.out` | `mystery.coreIdea` |
| w2 | `chapter-notes.out` | `cold-open.coreIdea` |
| w3 | `chapter-notes.out` | `myth-buster.coreIdea` |
| w4 | `chapter-notes.out` | `numbers-to-people.coreIdea` |
| w5 | `mystery.output` | `cold-open.moment` |
| w6 | `cold-open.output` | `myth-buster.belief` |
| w7 | `myth-buster.output` | `numbers-to-people.statistic` |
| w8 | `people.out` | `cold-open.entityIds` |
| w9 | `house-style.out` | `mystery.styleProfile` |
| w10 | `house-style.out` | `cold-open.styleProfile` |
| w11 | `house-style.out` | `myth-buster.styleProfile` |
| w12 | `house-style.out` | `numbers-to-people.styleProfile` |
| w13 | `numbers-to-people.output` | `draft.in` |

Checked by hand (the procedure runs the real checks). Each required port has one wire or one pin, never both: `mystery` `coreIdea` by w1 and `puzzle` pinned; `cold-open` `coreIdea` by w2 and `person` pinned; `myth-buster` `coreIdea` by w3, `belief` by w6 and `claimIds` pinned; `numbers-to-people` `coreIdea` by w4, `statistic` by w7 and `person` pinned. Every input has a wire out. Every tool reaches `draft`, so there is no `dead-step` warning. No input has two wires. Node ids and wire ids are unique.

Mock scenario `e2e/fixtures/mock-openai/scenarios/recipe-chapter-opening.json` has four steps, `{"match": {"endpoint": "chat", "attempt": N}, "reply": {"kind": "stream", "deltas": ["<one sentence> <marker>"]}}` for N = 1 to 4. The markers are `mystery-reply`, `cold-open-reply`, `myth-reply` and `numbers-reply`. No reply contains `[@`.

## 5. Files to change

| Path | Change | Notes |
|---|---|---|
| `examples/nonfiction/graphs/chapter-opening.json` | new | Section 4. Creates the `graphs/` folder. |
| `e2e/fixtures/mock-openai/scenarios/recipe-chapter-opening.json` | new | Four `chat` steps, `attempt` 1 to 4. |
| `apps/api/test/fixtures/chapter-opening-sample/samples.yaml` | new | Byte copy of `examples/samples.yaml`. |
| `apps/api/test/fixtures/chapter-opening-sample/nonfiction/project.yaml` | new | Byte copy. |
| `apps/api/test/fixtures/chapter-opening-sample/nonfiction/graphs/chapter-opening.json` | new | Byte copy of the recipe of step 1. |
| `apps/api/test/fixtures/chapter-opening-sample/nonfiction/drafts/the-ten-thousand-hour-idea.md` | new | Byte copy. The chapter-notes file. |
| `apps/api/test/fixtures/chapter-opening-sample/nonfiction/entities/k-anders-ericsson.md` | new | Byte copy. |
| `apps/api/test/fixtures/chapter-opening-sample/nonfiction/entities/hours-figure-is-average.md` | new | Byte copy. |
| `apps/api/test/fixtures/chapter-opening-sample/nonfiction/entities/book-style.md` | new | Byte copy. |
| `apps/api/test/graph-runner-sample-recipe.test.ts` | new | Test T2 (criterion 2). Names no `examples/`. |

Not changed: `examples/samples.yaml`, `examples/nonfiction/project.yaml` and every other file under `examples/`; `packages/**`; `apps/web/**`; `apps/api/src/**`; the existing `apps/api/test/*.kit.ts` files; `e2e/fixtures/mock-openai/server.mjs` and the other scenarios; `e2e/specs/**`; `scripts/**`; `package.json`; `units/**`; `modules/**`; `plans/DECISIONS.md`.

## 6. Procedure

Each step lists the check that ends it. Steps 0 to 8 are the implementer's; step 9 is the hand-off. Run with Node 26 (`node -v` prints `v26.x`).

0. **Base and worktree.** `git rev-parse --short main` must be `526c134` or a descendant. Check that `main` has not changed the sources that the fixture copies: `git diff --quiet 526c134 main -- examples/samples.yaml examples/nonfiction/project.yaml examples/nonfiction/drafts/the-ten-thousand-hour-idea.md examples/nonfiction/entities/k-anders-ericsson.md examples/nonfiction/entities/hours-figure-is-average.md examples/nonfiction/entities/book-style.md` exits 0. If it does not, the fixture of step 3 is copied from `main` again. Check that none of the new paths of section 5 exists on main (`git cat-file -e main:<path>` fails). Create the branch and worktree: `git worktree add -b unit/GRR-16 /Users/bbartolome/workspace/scriba-prototype-wt/GRR-16 main`, then `npm ci` in that worktree. Check: the branch exists and `npm ci` exits 0.

1. **Recipe.** Write the recipe of section 4 to its file, then `npx prettier --write` it. Check: `node -e` parses the file with `JSON.parse`, exiting 0, and `npx prettier --check` on the file exits 0.

2. **Scenario.** Write the four-step scenario of section 4, then `npx prettier --write` it. Check: it parses as JSON, and `npx prettier --check` exits 0. The mock's loading is checked in step 6.

3. **Fixture.** Copy the eight paths of section 5 from `examples/` byte for byte (`cp`), so the fixture holds the recipe of step 1. Check: `cmp` on each pair of files exits 0.

4. **Test file (criterion 2).** Write `apps/api/test/graph-runner-sample-recipe.test.ts` as section 7, T2. Use the kit exports of section 3a. The file must not contain `examples/` in any text, including comments, nor a quoted lowercase `examples` on a line with `root`, `repo`, `here`, `dirname` or `cwd`. Check: `grep -n "examples/" <file>` prints nothing.

5. **Criterion 1 check.** From the worktree root, run `npm run lint:examples`. Check: exit 0, and stdout starts with `examples check passed: 1 sample(s)`.
   Then the negative control, which is not committed and shows that the check reads the recipe: `d=$(mktemp -d)`, `cp -R examples "$d/examples"`, change the `tool` of node `cold-open` in `"$d/examples/nonfiction/graphs/chapter-opening.json"` to `no_such_tool`, then `node scripts/examples-check/index.mjs --root "$d"`. Check: exit 1, and stderr names `examples/nonfiction/graphs/chapter-opening.json` (and the node, where the message gives it). Then `rm -rf "$d"`.

6. **Criterion 2 test.** Run `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-api -- test/graph-runner-sample-recipe.test.ts`. The workspace script is `npm run build && vitest run` (section 3a), so the path is the vitest filter. Check: the summary shows one file, with its tests passing and zero failures.

7. **Regression.** `npm run lint` at the root and `npm test -w @bbartolome/scriba-api` (the whole API suite) must exit 0. `npm run build` must exit 0.

8. **Commits.** Commit the files of steps 1 to 3 with `feat(GRR-16): add the chapter-opening sample recipe, its mock scenario and the sample fixture`. Commit the test of step 4 with `feat(GRR-16): run the chapter-opening recipe from start from sample against the mock`. Stage by path only (`git add <paths>`), never `git add -A`. Check: `git status --short` lists only the section 5 paths before each commit.

9. **Report.** COMPLETE, with each criterion, the output of T1 and T2, the negative control result, the four mock request checks of T2 step 6, and each difference from this plan. Do not tick the unit's checkboxes, and change no file under `units/` or `plans/`.

## 7. Acceptance criteria and tests

The unit has two criteria, quoted from `units/GRR-16-sample-recipe.md` lines 26 and 27. The unit has no ids, so this plan calls them C1 and C2 in the unit's order.

### C1 (CI sample check)

> The recipe passes Platform's CI sample check (graph schema, tool references and `params`).

**T1, for criterion 1.** Command: `npm run lint:examples` from the worktree root (step 5). Seam: the CI check itself. External behaviour: exit code and stdout. Pass: exit 0 with `examples check passed: 1 sample(s), …`. The negative control in step 5 shows that the check fails on a bad recipe and names the file, so the pass is not vacuous. The check reads `examples/` by design; it is not a unit test (D10).

### C2 (API, sample run)

> It runs end to end from "start from sample" against the mock OpenAI server (API-level test using a temp copy of the sample, not reading `examples/` in unit tests).

**T2, for criterion 2.** File: `apps/api/test/graph-runner-sample-recipe.test.ts`. Seam: the composed app (`createTestApp`) with a temp library, the mock OpenAI server, and a temp copy of the sample, which is the fixture copied into a temp folder by the test. Steps of the test:

1. Copy the fixture folder into a temp folder. Boot the app with `libraryDir` set to a temp library and `env: {SCRIBA_EXAMPLES_DIR: <temp folder>}`. Start the mock with `startMockOpenAI()` (the shipped scenarios). Set the provider `baseURL` to `${mock.baseUrl}/scenario/recipe-chapter-opening/v1`, as `openRunHarness` does.
2. `POST /api/project-store/projects/start-from-sample` with `{sampleId: 'nonfiction', folderName: 'chapter-run', title: 'Chapter run'}`. Expect 201 with the project summary.
3. `POST /api/project-store/active` with the body of `activateRequestSchema`, naming `chapter-run`. Expect a success status.
4. `POST /api/graph-runner/runs` with `{graphId: 'chapter-opening', inputs: {'chapter-notes': {kind: 'file', ref: 'drafts/the-ten-thousand-hour-idea.md'}, people: {kind: 'entities', refs: ['k-anders-ericsson']}, 'house-style': {kind: 'style', ref: 'book-style'}}}`. Expect 201 with `runId`.
5. Poll `GET /api/graph-runner/runs/current` until `run.status` is not `running` (bounded, for example 20 seconds). Assert `run.status` is `done`, and `run.nodes[id].status` is `done` for `mystery`, `cold-open`, `myth-buster`, `numbers-to-people` and `draft`.
6. Read the mock's records with `recordsOf(mock, 'recipe-chapter-opening')`. Assert four chat requests. Request 1 contains the first line of the chapter-notes file. Request 2 contains `mystery-reply`, request 3 contains `cold-open-reply`, and request 4 contains `myth-reply`. This is what the mock model received.
7. `GET /api/project-store/projects/chapter-run/pending` (`pendingListSchema`). Assert one change, with `targetPath` `drafts/chapter-opening.md` and `origin.kind` `recipe-run`.
8. Assert that `<library>/chapter-run/drafts/chapter-opening.md` does not exist on disk. Nothing is written until the author accepts the change.
9. Close the app and the mock, and remove the temp folders.

Pass: every assertion holds. Command: step 6 of section 6.

## 8. Agreement with downstream units and other plans

### 8a. Downstream: GRR-17 (canvas gate; `blocked_by` names GRR-16, `units/GRR-17-canvas-gate.md` line 7)

- Its demo (lines 29 to 33) uses this recipe: `chapter-opening`, with an input, a tool and an output node. Its step 2, a people entity wired into a text port, is refused by the wire-type rule (D5). Its claim chip on the myth-buster's entity port matches `claimIds`, which is pinned, so a second chip can be dropped on it (GRR-12). Its step 3, the chapter-notes file, two people, the default style and the target `drafts/ch02-opening.md`, matches the run request and `targets` (D7, D8).
- Its e2e extension (line 17) needs a provider wired to the scenario `recipe-chapter-opening`. No text change is needed in GRR-17. Its planner must use this scenario name.
- Its criterion `GRR-09…GRR-16 criteria pass on main` (line 22) is met when this unit merges.

### 8b. Done plans and units that the recipe relies on

- `plans/PLT-21.md` (done): the graph layer checks this file (`units/PLT-21-examples-check-graph-layer.md` lines 16 and 21; `plans/PLT-21.md` line 118). Its point 5 (line 139) says that the output `params.path` is not checked. This plan relies on both.
- `plans/PLT-22.md` (done): D10 (line 63) checks each recipe tool node's name and `params`. Pinned port values are not checked there (open point 3).
- `plans/PST-11.md` (done): the sample's owner. Line 206 expects GRR-16 to add files under `examples/nonfiction/**`. This plan adds only `graphs/`.
- `plans/AGL-19.md` (done): its criterion 2 is an e2e test on the real stack, because of D10 (line 11). This plan's C2 follows the API seam with a fixture (open point 1).
- `plans/GNP-07.md` line 277, `plans/GNP-08.md` lines 281 and 291, `plans/GNP-09.md` line 343 and `plans/GNP-10.md` line 127: each asks this unit to name the port keys. Section 4 names them: `cold_open.moment`; `mystery_question.coreIdea` and `puzzle`; `myth_buster.belief` and `claimIds`; `numbers_to_people.statistic` and `person`.
- `packages/contracts/src/graph-runner/examples.ts` (GRR-01, done): its recipe does not match the specs (section 3a). It is not changed here (open point 5).

### 8c. Parallel units and drafts on the same paths

- GRR-10 (planned at `526c134`): its files do not include `examples/` or the mock folder (`plans/GRR-10.md` lines 137 and 207). There is no overlap in either merge order. Its tests do not read `examples/` (`plans/GRR-10.md` S16).
- CEX-08 (no plan): changes `examples/nonfiction/project.yaml` (`order`) only. No overlap.
- SAU-22 (draft) and TRG-14 (planned): no path in common.
- GRR-11 to GRR-15 (no plans): the recipe uses the value kinds `file` (for a text input), `entities` and `style`, which `runs.ts` defines. No conflict.
- The scenario file is new and additive. Modules add scenarios one file each (`units/PLT-12-mock-openai-server.md` line 25). No overlap.

## 9. Review parts

One part. The unit has two criteria, nine new files (one recipe, one scenario, seven fixture files and one test file counted together as section 5 lists them), and no code change.

- **Part 1 (the whole unit).** Steps 0 to 9 of section 6. Tests T1 and T2. Each step and each test is in this part only.

## 10. Open points

1. **Criterion 2's copy.** The criterion asks for an API-level test that uses a temp copy of the sample, and for unit tests that do not read `examples/`. The examples check rejects a test file that names `examples/` (D10). The plan uses a checked-in copy under `apps/api/test/fixtures/chapter-opening-sample/`. The alternatives are an e2e spec on the real stack, as AGL-19 did (`plans/AGL-19.md` line 11; not API-level), or a helper that copies `examples/` at run time (passes the check, but against its intent). The Navigator decides. Default: the fixture.
2. **Fixture drift.** The fixture repeats the recipe and three entities, and does not follow later edits to `examples/`. The real file is checked by T1 (graph schema and tool references) and by GRR-17's e2e (a run on the real stack). Copy the fixture again when the recipe changes.
3. **Pinned values are not checked in CI.** `validate.ts` drops port keys in `params` mode, so a wrong pinned id in `examples/` passes `npm run lint:examples`. T2 runs the fixture copy and would catch a wrong id there. GRR-17's e2e covers the real file. The Navigator may ask for a pinned-value check in the pack layer later.
4. **Blocker notation.** The `blocked_by` entry for `phase:nonfiction-workhorses` names no gate unit id, and the PLT-21 and PLT-22 entry names two units in one quote (`units/README.md` line 62). `modules/graph-runner.md` line 27 names PLT-21 only. All of them are done, so the unit is available. No unit change is proposed. The Navigator may correct the notation.
5. **The contract's example recipe** (`examples.ts`, GRR-01) uses ports that no spec has. It is outside this unit's scope. GNP-08 and GNP-10 name GRR-01 as its owner. A later unit or the Navigator decides.
6. **Chain content.** The chain feeds each passage into the next tool's text port (`moment`, `belief`, `statistic`). This extends the unit's example to all four tools. The graph is valid, but the content is a placeholder. The Navigator may prefer another chain. A different chain changes the wires and the scenario's step order, not the tests' seam.
