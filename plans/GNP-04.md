---
id: GNP-04
status: draft
---
# GNP-04 plan — core/propose_graph tool with golden tests for both views

Batch: [GNP-04] (Genre packs, phase:core-propose-graph, M2), a batch of one. Draft by the planner at main `490aa4c` (the only modified file in the working tree is `units/SAU-12-providers-step.md`, not touched). The unit file was read in full (lines 1 to 25). It has no note that records a change of the unit (a search for "Removed by", "Loosened by", "Reworded by", "Moved to" and "revision" finds nothing). Nothing is built, installed or tested.

Status `draft`. Steps 3 and 9 wait for open points 1 and 2 (the Navigator). Steps 3 to 6 also wait for open point 3 (entity kinds), and the file of step 3 must carry the settled values.

## 1. Decisions this plan follows

Labels: **U** = the unit, **M** = the module, **G** = a settled decision of another unit or of the contract, **C** = a smaller choice made by this plan (recorded here, not in `plans/DECISIONS.md`).

- **U1 Spec.** `packages/packs/core/tools/propose_graph.yaml`, output `graph`, `enabled: true`, description "Sketch a story graph or a recipe from a plain-language intent." Source: unit line 15.
- **U2 Inputs.** `intent` (text port, required), `view` (string enum `story | recipe`, required), `entityIds` (entity port, list, not stated as required), `files` (array of project-relative path strings, a param, not a port). Source: unit line 16.
- **U3 Graph file shape.** `{schemaVersion, view, name, nodes, edges}`. Story nodes `entity | scene | beat` with `label` and optional `path`; story edges with free-text relations (suggested `order`, `causality`, `containment`). Recipe nodes `input | tool | output`; wires connect `<nodeId>.<key>`, one wire per input; node ids `^[a-z0-9][a-z0-9-]*$`. Source: unit lines 17 to 19. The contract agrees: `packages/contracts/src/graph-runner/constants.ts` line 19 (`NODE_ID_PATTERN`), `graph.ts` line 22 (`portIdSchema`), line 118 (`storyGraphShapeSchema`), line 127 (`recipeGraphShapeSchema`), line 183 (`graphFileSchema`).
- **U4 Fields the unit does not list, which the contract requires.** An input node needs `params` with `type` (`text | entity | style`) and `label`, optional `entityKind` (`graph.ts` lines 72 to 77 `inputParamsSchema`; lines 88 to 95 `recipeNodeSchema`, input member). A tool node needs `tool`, optional `params`. An output node has optional `params` (`label`, `path`). Every node needs `position` `{x, y}` (`graph.ts` lines 28 to 33). A recipe wire has `id`, `from`, `to` and no `relation` (`graph.ts` line 111, strict). The prompt tells the model these; the unit text does not. Source of the requirement: `graph.ts` as cited.
- **U5 Paths.** Scene and entity nodes take their paths only from `files` and `entityIds`; the prompt forbids inventing paths. Source: unit line 20; module line 53 (scene and beat are not entity references). The entity header that `{{entity X}}` renders carries the project-relative path (`plans/TRG-08.md` C12, line 45), so entity node paths come from that header.
- **U6 Output.** "Return JSON only." The model's text is the output; the executor does not parse it. Source: unit line 20; `apps/api/src/modules/tool-registry/executor.service.ts` line 37 (`OUTPUT_SYSTEM_MESSAGES.graph`: "Return only a JSON document, with no prose before or after it."), lines 208 to 214 (`finish`: one enclosing code fence is removed for `graph`, nothing is parsed); `units/TRG-12-executor.md` line 28.
- **U7 Graph output is a pending change, validated by the Agent loop.** Source: unit line 21; `units/AGL-13-output-routing.md` lines 21 and 28 (not this unit's work).
- **U8 Acceptance criteria.** Unit lines 24 and 25; section 4 of this plan.
- **U9 Tool-spec rules.** Names lower snake_case (`propose_graph`, file `<name>.yaml`); description one sentence, under about 120 characters, starts with a verb (`Sketch`, 62 characters); output in `draft | entity | claims | graph | check`; `sourcesUsed` is computed by the Tool registry, prompts never list sources. Source: `modules/genre-packs.md` lines 42 to 53 and line 66; `packages/packs/test/checks.ts` line 55 (`'sketch'` in `VERBS`).
- **U10 Spec keys.** `toolSpecSchema` is strict: `schemaVersion`, `name`, `description`, `inputs`, `output`, `enabled`, `prompt` (`packages/contracts/src/tool-registry/spec.ts` lines 54 to 62).
- **U11 Template subset.** `{{field}}`, `{{#each}}`, `{{#if field}}` (a field name only, truthiness), `{{entity X}}` (inside `#each` over an entity input), `{{toolCatalog}}` (one line per tool: name, description, output kind, port keys and types; params are not listed). Source: `plans/TRG-08.md` C5 (line 38), C9 (line 42), C12 (line 45), C13 (line 46). Module line 46.
- **U12 Catalogue contents.** `{{toolCatalog}}` lists every valid and enabled tool of the packs root (`executor.service.ts` lines 161 to 168). Source: `plans/TRG-08.md` line 162 (how TRG-12 builds the entries); `plans/TRG-12.md` (done).
- **U13 Golden mechanics.** `goldenCase` and `runGoldenCase` in `apps/api/test/packs/golden.kit.ts` (lines 241 and 126), the scenario `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`, the goldens and fixtures in `packages/packs/test/golden/<tool>/`, the `--update-goldens` flag (`apps/api/vitest.config.mts`, `test.env`). Source: module line 87; `plans/GNP-02.md` D1 to D12 (lines 17 to 34).
- **U14 Catalogue change and goldens.** Any change to the catalogue changes the rendered prompt of a golden that uses `{{toolCatalog}}`, and the PR of that change regenerates the golden. Source: `plans/GNP-02.md` D18 (line 34) and section 5 (line 131).
- **U15 Test location and wording.** Tests in `apps/api/test/packs/`; a unit test does not name the `examples/` folder (`golden.kit.ts` lines 40 to 43 give the reason). Source: `plans/GNP-02.md` D1 and D11; module line 87; `units/README.md` line 138.
- **U16 Entity ids and kinds.** Entity ids match `^[a-z0-9][a-z0-9-]*$` (`packages/contracts/src/project-store/constants.ts` line 4). A kind check on an entity argument runs only when the input has `x-scriba-entity-kinds` (`executor.service.ts` line 140: `kinds !== undefined`). Source: as cited.
- **U17 Control hint for `view`.** `x-scriba-control: select` needs an enum (`apps/api/src/modules/tool-registry/lint.ts` lines 559 and 560); `enum` is an allowed keyword of a string property (`lint.ts` line 71); the control vocabulary is `packages/contracts/src/tool-registry/constants.ts` lines 32 to 41. An array of strings is accepted (`apps/api/src/modules/tool-registry/inputs.ts` line 107).
- **U18 Required inputs.** A required input that the prompt does not name is a lint warning (`lint.ts` line 817, `template-unused`). The prompt must name `intent` and `view`.
- **U19 Entity kinds shipped.** Shipped on main: `core` `source`, `style-profile`; `nonfiction` `claim`, `concept`, `person`; `fiction` none (only `.gitkeep`). Source: `ls packages/packs/*/entity-types`; `units/GNP-01-packs-scaffold-content-checks.md` line 18 (a kind in `x-scriba-entity-kinds` must name a shipped type).
- **U20 Pack folders.** `core` is always active; the registry reads only the `core`, `nonfiction` and `fiction` tool folders of the packs root. Source: `modules/genre-packs.md` lines 36 to 40 (pack layout and shipping); `apps/api/src/modules/tool-registry/packs.ts` line 318 (as cited in `plans/GNP-02.md` section 7).
- **C1 Files.** One tool file in `core/tools/`. The `.gitkeep` of the folder is deleted, because the folder then holds a file (precedent: `plans/GNP-06.md` D14, line 42).
- **C2 Case names.** Two cases, `story` and `recipe`, with fixtures `<case>.fixture.json` and goldens `<case>.golden.json` (`plans/GNP-02.md` D6).
- **C3 Test structure.** One file, `apps/api/test/packs/propose-graph.test.ts`, with one `it` per acceptance criterion (two tests in all). The second `it` runs the two cases in turn.
- **C4 Mock scenario.** One scenario file for the tool, two steps. Each step matches its case by `lastMessageContent` with that case's intent sentence (`e2e/fixtures/mock-openai/server.mjs` line 124). The intents are written so that neither contains the other.
- **C5 Scripted replies.** The story reply is a story graph with one entity node, one scene node whose path comes from `files`, and one beat node with no path. The recipe reply is a recipe with two input nodes, one tool node whose `tool` is `propose_graph` (the only tool in the catalogue on main), and one output node. These are fixtures: the check parses them with the schema and does not run them. The tool node uses `propose_graph` only because it is the only tool the catalogue holds at this point.
- **C6 Schema check.** The golden test's `check` parses `content` with `graphFileSchema` (`@bbartolome/scriba-contracts/graph-runner`), as `plans/GRR-01.md` line 246 says GNP-04 does.
- **C7 Timeouts.** 60000 ms for the first test and 120000 ms for the second, as the GNP-02 tests use 60000 ms per case.
- **C8 Prompt skeleton.** The first-draft skeleton of the module (role line; material; steps; constraints) is followed for parts 1 to 3. Its citation constraint is not used (open point 2).

Checked and not applicable: `plans/DECISIONS.md` has no entry for GNP-04 (`grep -n 'GNP-04'` gives only line 4950, which is about GNP-06). No `unit/GNP-04` branch exists.

## 2. Files to create or change

Only these paths change. The shared scenario folder, the golden helper, the README of the packs test folder, the vitest config and all of `apps/`, `packages/contracts/`, `packages/packs/{nonfiction,fiction}/` and `units/`, `modules/`, `plans/` (other than the plan file) do not change.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/core/tools/propose_graph.yaml` | new | The tool spec (step 3). Header fixed by this plan; prompt per open points 1 and 2 |
| `packages/packs/core/tools/.gitkeep` | delete (`git rm`) | C1 |
| `packages/packs/test/golden/propose_graph/story.fixture.json` | new | Story arguments and two entities (step 5) |
| `packages/packs/test/golden/propose_graph/recipe.fixture.json` | new | Recipe arguments and one entity (step 5) |
| `packages/packs/test/golden/propose_graph/story.golden.json` | created by the update run (step 8) | The recorded request of the story case |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | created by the update run (step 8) | The recorded request of the recipe case; includes the catalogue line |
| `e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json` | new | Two scripted replies, matched by intent (step 6) |
| `apps/api/test/packs/propose-graph.test.ts` | new | Tests T1 and T2 of section 4 (step 7) |

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-04`, created from `main` with `git switch -c unit/GNP-04`. Record `node -v` (expected `v26.x`) and `npm -v` (expected `11.x`) with each result (assumption A1). Do not push. Do not use `git add -A` or `git commit -a`.

0. **Base.** `git diff --quiet 490aa4c HEAD -- packages/packs apps/api/test/packs apps/api/src e2e/fixtures/mock-openai/scenarios` exits 0. If it does not, re-read the changed files before editing.
1. **Baseline.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && (cd apps/api && npx vitest run test/packs)` exits 0. The GNP-02, GNP-03 and GNP-06 tests pass.
2. **Wait point.** Open points 1 and 2 (and 3 for the `entityIds` hint) are settled by the Navigator. The settled values replace the bracketed items of step 3. Until then, do no further step.
3. **Tool spec (U1 to U4, U9, U10, U17, U18, C8).** Create `packages/packs/core/tools/propose_graph.yaml` with this header:

   ```yaml
   schemaVersion: 1
   name: propose_graph
   description: Sketch a story graph or a recipe from a plain-language intent.
   inputs:
     type: object
     properties:
       intent:
         type: string
         title: Intent
         x-scriba-type: text
         x-scriba-port: true
         x-scriba-control: textarea
       view:
         type: string
         title: View
         enum: [story, recipe]
         x-scriba-control: select
       entityIds:
         type: array
         title: Entities
         items:
           type: string
         x-scriba-type: entity
         x-scriba-port: true
         # x-scriba-entity-kinds: [open point 3]
       files:
         type: array
         title: Files
         items:
           type: string
     required: [intent, view]
   output: graph
   enabled: true
   prompt: |
     [open points 1 and 2]
   ```

   The prompt, once settled, has these parts in this order: a role line; the intent (`{{intent}}`) and the view (`{{view}}`); the material, with `{{#each entityIds}}` and `{{entity this}}` for each entity, and `{{#if files}}` with `{{#each files}}{{this}}{{/each}}` for the files; the story shape, stated in words (node kinds, `label`, `path` only as U5 allows, `position`, edges with `id`, `from`, `to` and an optional `relation`); the recipe shape (node kinds with the params of U4, wires `{id, from, to}` with port ids `<nodeId>.<key>`, one wire per input, types must match, node ids as U3); the constraints (JSON only; no invented paths; no prose); and, for the recipe view, `{{toolCatalog}}` (open point 1). Then `npx prettier --write packages/packs/core/tools/propose_graph.yaml`.
4. **Folder.** `git rm -- packages/packs/core/tools/.gitkeep`.
5. **Fixtures (C2, C4).** Create `story.fixture.json`: `arguments` = `{"intent": "<story intent sentence>", "view": "story", "entityIds": ["keeper", "assistant"], "files": ["drafts/arrival.md"]}`; `entities` = two `ResolvedEntity` objects (`{ref, type, path, content}`, TRG-08 M4), `keeper` and `assistant`, both of type `person`, paths `entities/keeper.md` and `entities/assistant.md`, and original content of one sentence each. Create `recipe.fixture.json`: `arguments` = `{"intent": "<recipe intent sentence>", "view": "recipe", "entityIds": ["keeper"], "files": ["drafts/chapter-notes.md"]}`; `entities` = the `keeper` object. The two intent sentences differ and neither contains the other. Then `npx prettier --write` on both.
6. **Scenario (C4, C5).** Create `e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json` with two steps. Each step has `"match": {"endpoint": "chat", "lastMessageContent": "<that case's intent sentence>"}` and `"reply": {"kind": "stream", "deltas": ["<the graph JSON as one string>"]}`. The story reply and the recipe reply are the graphs of C5. Each reply must parse with `graphFileSchema`. Then `npx prettier --write` on the file.
7. **Tests (section 4, C3, C6, C7).** Create `apps/api/test/packs/propose-graph.test.ts` with the two `it`s of section 4. It imports `goldenCase` and `runGoldenCase` from `./golden.kit` and `graphFileSchema` from `@bbartolome/scriba-contracts/graph-runner`. It has no `any`, and it does not contain the text `examples/` (U15). Read the user message with a typed schema, not a cast to `any`.
8. **Update run (U13, U14).** `cd apps/api && npx vitest run -- --update-goldens test/packs/propose-graph.test.ts` exits 0. It writes `story.golden.json` and `recipe.golden.json`. Read both: `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.graph` (`executor.service.ts` line 37). The recipe golden's `messages[1].content` contains the catalogue line of section 4 (only `propose_graph` is in the catalogue at this point). `git status --short packages/packs/test/golden` lists only the two fixtures and the two goldens.
9. **Catalogue check (open point 1).** The recipe golden is the one of step 8. If the Navigator chose option A of open point 1, the story golden also holds the catalogue line, and the check of step 7 for the story case is extended by that line. Otherwise no change.
10. **Compare run and idempotence.** `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0 with two tests passed. Record the `sha256sum` of both goldens, run step 8 again, and check the hashes are equal.
11. **Format.** `npx prettier --check packages/packs/core/tools/propose_graph.yaml packages/packs/test/golden/propose_graph e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json apps/api/test/packs/propose-graph.test.ts` exits 0 (assumption A3). If a golden fails the check, stop and report.
12. **Pack checks.** From the root, `npm run lint:packs` exits 0 with no error (the new spec is linted with the others). `npm test -w @bbartolome/scriba-packs` exits 0; the GNP-01 suite now also reads `propose_graph` (description, verb, entity kinds; the common-inputs check applies to draft tools only, so it skips this tool).
13. **Type check and lint.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0.
14. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario (as GNP-02 step 11 does).
15. **Commit.** `git add` each path of section 2 by name (the `git rm` of step 4 is already staged). `git diff --cached --stat` lists only the section 2 paths and no `units/` or `plans/` file. Commit with `feat(GNP-04): core/propose_graph tool with golden tests for both views`. No model identifier in the message. Do not push.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-04-propose-graph.md` lines 24 and 25. There is one test per criterion and no other test (C3). Command for both: `cd apps/api && npx vitest run test/packs/propose-graph.test.ts`.

| Criterion (unit line) | Test file and test name | Pass condition |
|---|---|---|
| "`propose_graph` validates; calling it without `view` returns an Ajv error naming `view`." (24) | `apps/api/test/packs/propose-graph.test.ts`, "AC 1: propose_graph validates, and a call without view returns an Ajv error naming view" | `runGoldenCase({tool: 'propose_graph', name: 'story', expect: STORY_EXPECT, invalidWithout: 'view', update: false})`. Inside the helper the valid call returns 200 (so the tool is valid and enabled, `executor.service.ts` `prepare`, step 1), and the result kind is `graph`. The invalid call returns 422, `invalid.code` is `TOOL_ARGS_INVALID`, `invalid.message` contains `view`, and `modelCalls` is 1. |
| "Golden tests: with the mock scripted to return a story graph and a recipe, each output parses against the Graph runner's graph schema, and the rendered prompt matches its golden (the recipe-view golden includes the tool catalogue)." (25) | `apps/api/test/packs/propose-graph.test.ts`, "AC 2: the story and recipe goldens match, each output parses as a graph file, and the recipe golden holds the tool catalogue" | `goldenCase({...story, check})()` then `goldenCase({...recipe, check})()`, each with `invalidWithout: 'view'`. Each passes the helper's assertions: golden `match` (or `written` in update mode), kind `graph`, `sourcesUsed` as expected, the invalid call, one model call. Each `check` parses `content` with `graphFileSchema` and requires `view` to equal its case. The recipe `check` also requires the user message to contain `- propose_graph: Sketch a story graph or a recipe from a plain-language intent.` |

`STORY_EXPECT` is `{kind: 'graph', sourcesUsed: ['keeper', 'assistant']}`; `RECIPE_EXPECT` is `{kind: 'graph', sourcesUsed: ['keeper']}`. Timeouts: C7.

Criterion "validates" also has the lint gate of step 12 (`npm run lint:packs`). That gate is not a test of this unit and adds none.

## 5. Downstream agreement

- **GNP-05 (core gate, `blocked_by` includes GNP-04).** Needs the two-view goldens and the tool in the registry list from `core`. Both are delivered here, and its criterion 2 is AC 2 of this plan. No change.
- **GNP-24 (remaining-shapes gate, unit line 25).** Its demo asks for a recipe proposal (`view: recipe`). The quality of that proposal depends on open points 1, 4 and 5. The tests here do not change.
- **AGL-13 (output routing, `blocked_by` AGL-09, AGL-12, GRR-01; not GNP-04).** Consumes the `graph` output. The contract agreed here: `content` is the JSON document with at most one enclosing code fence removed (`executor.service.ts` lines 208 to 214; `units/TRG-12-executor.md` line 28), and it parses with `graphFileSchema`. AGL-13 line 28 needs a `propose_graph` tool when it is tested. See section 7, I2 for the `unblocks` entry.
- **GRR-01 (done).** Its plan (line 246) names GNP-04 as a user of `graphFileSchema`. Agreed; this plan changes nothing in `packages/contracts/`.
- **GNP-13 (fiction entity types) and the fiction kinds.** If open point 3 names only shipped kinds, the fiction kinds (`character`, `place`, `world-rule`) are not accepted by `entityIds` until a later change adds them. No unit names that change. Open point 3 records the gap.
- **Draft tools of later units (GNP-07 to GNP-10, GNP-14 to GNP-17, GNP-20 to GNP-22) and GNP-23 (remix).** Each adds a line to `{{toolCatalog}}`, so the recipe golden of this plan (and the story golden under option A of open point 1) changes in that unit's PR, and the PR regenerates it (U14; `plans/GNP-02.md` section 5). Two such units that run in parallel conflict on the golden at rebase; the rebase regenerates it. GNP-23's `targetShape` enum lists only draft tools (`units/GNP-01-packs-scaffold-content-checks.md` line 21); `propose_graph` has output `graph`, so it is not in that enum.
- **GNP-01, GNP-02, GNP-03, GNP-06 (done).** The content suite reads `core/tools/*.yaml` and must pass for the new file (step 12). The golden helper and the scenario convention are used as they are; `golden.kit.ts`, the README and the vitest config do not change.
- **TRG-08 and TRG-12 (done).** The template subset (U11) and the executor (U6, U12) are used as they are. Option B of open point 1 would change TRG-08 and is a Navigator decision.
- **Platform and e2e.** `e2e/harness/global-setup.ts` line 80 sets `SCRIBA_PACKS_DIR` to the real packs, so the e2e run lists `propose_graph` from now on. No e2e spec counts built-in tools (a search of `e2e/specs/` finds no count). The image copies `packages/packs` whole (`plans/GNP-02.md` section 5, line 138).
- **In-flight plans.** The only plan with `status: draft` is `plans/AGL-09.md`; its section 2 names only `apps/api/src/modules/agent-loop/**`, `apps/web` and its own test. No shared path, so either order is correct. No `planned` plan exists.

## 6. Open points

1. **The view-dependent prompt (blocks steps 3 and 9).** The unit (line 20) says that the recipe view inserts `{{toolCatalog}}`. The subset has `{{#if field}}` only, which tests the truthiness of a field (`plans/TRG-08.md` C5 line 38, C9 line 42), and `view` is always a non-empty string, so no template can select the catalogue by the value of `view`. Options: (A) one prompt for both views that names the shape by `{{view}}`, with `{{toolCatalog}}` rendered in both views (the story golden then also changes with the catalogue, `plans/GNP-02.md` D18); (B) add a value comparison to the template subset (a change of TRG-08 and of the module's subset, `modules/genre-packs.md` line 46); (C) add an input that carries the choice (a change of the unit's input list, unit line 16). The plan does not choose.
2. **The prompt skeleton (module line 46).** The skeleton's constraint 4 asks for citations `[@id]` and `TK` for prose. A graph reply is JSON with no prose. Does `propose_graph` follow parts 1 to 3 of the skeleton and replace constraint 4 with the unit's constraints (plan default: the unit's constraints, no citation)? Navigator.
3. **The kinds of `entityIds` (`x-scriba-entity-kinds`, unit line 16 names none).** Module line 66 says entity inputs carry the hint. Options: (a) omit the hint (any kind is accepted; `executor.service.ts` line 140 skips the check); (b) list the kinds shipped on main (`person`, `claim`, `concept`), with GNP-13 or a later change adding the fiction kinds; (c) list kinds that are not shipped yet (refused by the content check, U19). GNP-01 open point 3 covers the draft tools' common input only. Navigator.
4. **The catalogue lists the tool itself.** The recipe catalogue holds every valid and enabled tool (`executor.service.ts` lines 161 to 168; no filter), so `propose_graph` offers itself as a recipe tool. Should the catalogue leave out tools whose output is `graph`, or should a recipe be allowed to call `propose_graph`? This changes the recipe golden of step 8. Navigator.
5. **Tool settings are not in the catalogue.** `{{toolCatalog}}` lists port keys and types only (`plans/TRG-08.md` C13). The recipe model therefore cannot learn the settings of a tool, such as `view` and `files` of `propose_graph` or the keys of a tool node's `params`. The unit (line 20) asks for port keys and types only. Option: extend C13 (a TRG-08 change), or have the prompt tell the model to write no tool `params`. Plan default: the prompt asks for no tool `params`. Navigator.

## 7. Facts checked and facts assumed

### Facts checked (read in this session; nothing was run)

Unit and module:
- `units/GNP-04-propose-graph.md`: front matter lines 1 to 10 (`blocked_by` line 7; `parallel_with` line 8; `unblocks` line 9); Spec lines 14 to 21; criteria lines 23 to 25. No change notes. Last git touch `2fed3f4`.
- `units/README.md` lines 34 to 65 (unit format and blocker notation), 128 to 138 (conventions; testing line 138).
- `modules/genre-packs.md` lines 15 (graph), 31 (parallelism), 36 to 40 (pack layout), 42 to 53 (tool-spec rules), 66 (entity inputs and graph output), 84 to 94 (testing), 87 (golden tests).
- `prompt.md` lines 84 to 94 (draft stage rules).

Plans:
- `plans/PLT-02.md` (format), `plans/GNP-02.md` (D1 to D18, lines 17 to 34; section 5 lines 131 to 139), `plans/TRG-08.md` (C5 line 38, C9 line 42, C12 line 45, C13 line 46, section 5 line 165), `plans/GRR-01.md` (line 246), `plans/GNP-01.md` (section 5 line 116; open point 3 line 132), `plans/GNP-06.md` (D14 line 42), `plans/AGL-09.md` section 2 (paths listed above).
- `plans/DECISIONS.md`: searched by unit id only (`GNP-04`): one hit (line 4950, GNP-06 module line). `GNP-02`, `GRR-01`, `TRG-08` searched too; none records a GNP-04 decision.
- Plan statuses: `grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/AGL-09.md` only. Branches: no `unit/GNP-04`.

Code and contracts on main:
- `packages/contracts/src/graph-runner/constants.ts` line 19 (`NODE_ID_PATTERN`); `graph.ts` lines 22, 28 to 33, 39, 72 to 77, 88 to 95, 111, 118, 127, 183.
- `packages/contracts/src/tool-registry/spec.ts` lines 54 to 62 (`toolSpecSchema`); `constants.ts` lines 26, 29 (`PORT_TYPES`, `OUTPUT_PORT_KEY`), 32 to 41 (`CONTROL_TYPES`); `call.ts` lines 47 to 50 (`toolCallRequestSchema`).
- `packages/contracts/src/project-store/constants.ts` line 4 (`ENTITY_ID_PATTERN`).
- `apps/api/src/modules/tool-registry/executor.service.ts`: lines 30 to 37 (system messages; graph line 37), 140 (kind check), 149 (sources), 161 to 168 (catalogue), 208 to 214 (`finish`); `prepare` step 1.
- `apps/api/src/modules/tool-registry/lint.ts`: line 71 (`enum` for strings), line 560 (`select` needs an enum), line 817 (`template-unused`).
- `apps/api/src/modules/tool-registry/inputs.ts` line 107 (array items).
- `apps/api/test/packs/golden.kit.ts`: lines 40 to 43 (examples comment), 44 (`README_TERMS`), 126 (`runGoldenCase`), 241 (`goldenCase`); the fixture check requires `invalidWithout` in the arguments; the valid call expects 200.
- `apps/api/vitest.config.mts`: `test.env` sets `SCRIBA_UPDATE_GOLDENS` from the flag.
- `e2e/fixtures/mock-openai/server.mjs` lines 124 (`lastMessageContent`), 133 (`findStepIndex`), 291 (step use).
- `e2e/harness/global-setup.ts` line 80 (`SCRIBA_PACKS_DIR` set to `packages/packs`).
- `packages/packs/test/checks.ts` line 55 (`sketch` in `VERBS`).
- Real packs: `packages/packs/core/tools/.gitkeep` (0 bytes) is the only file; `core/entity-types` holds `source.yaml` and `style-profile.yaml`; `nonfiction/entity-types` holds `claim.yaml`, `concept.yaml`, `person.yaml`; `fiction/entity-types` and `fiction/tools` hold `.gitkeep` only.

Units read for the downstream check:
- `units/AGL-13-output-routing.md` lines 7 (`blocked_by`), 21 and 28.
- `units/GRR-01-contract-slice.md` line 9 (`unblocks` names GNP-04).
- `units/GNP-05-core-gate.md` lines 7, 21, 23.
- `units/GNP-24-remaining-shapes-gate.md` line 25.
- `units/GNP-01-packs-scaffold-content-checks.md` lines 18 and 21.
- `units/TRG-12-executor.md` line 28; `units/GRR-06-output-nodes-pending-changes.md` lines 21 and 26; `units/GNP-18-fiction-sample.md` lines 19 and 20.
- `grep -rln 'propose\|graphs/' units/` gives the list checked above; `grep -rn 'GNP-04' units/ modules/` gives GNP-05, GNP-06, GNP-13, GNP-03, GNP-02, GRR-01, GNP-01 and the module line 15.

### Facts assumed (not run)

- A1. Node v26 and npm 11 are on PATH, as the other plans state. Step 1 checks it.
- A2. The `view` property with `x-scriba-control: select` and `enum` passes lint (read from `lint.ts`, not run). Step 12 checks it.
- A3. `prettier --check` accepts the scenario JSON and the golden files, which are compared by value (D14 of GNP-02). Step 11 checks it.
- A4. The mock returns the stream deltas as the reply text, and `finish` returns them unparsed for `graph`. Step 8 checks the golden.
- A5. Each intent sentence appears once in its rendered prompt, and the two intents do not overlap. Step 10 and the mock matcher check it.
- A6. `toolArgumentsSchema` accepts the `files` array of strings and the `view` string. Not read; step 7 checks it through the valid call.
- A7. The catalogue has only `propose_graph` when the recipe golden is written (no other tool is in `core`, `nonfiction` or `fiction`, and the fixtures under `apps/api/test/fixtures/` are not in the real packs root). Checked by the folder listing above; step 8 checks the golden.

### Inconsistencies in the unit files and the module (not changed)

- **I1.** Unit line 20 says that for the recipe view the template inserts `{{toolCatalog}}`. The TRG-08 subset cannot select on the value of `view` (open point 1).
- **I2.** Unit line 9 lists `"Agent loop graph proposal"` in `unblocks`. That entry names no unit. The unit that does the routing, AGL-13, is not blocked by GNP-04 (`units/AGL-13-output-routing.md` line 7). By the inverse rule of `units/README.md` line 64, the entry must go, or AGL-13 must name GNP-04 in its `blocked_by`.
- **I3.** Unit line 19 omits the `params` that the recipe input node needs (`graph.ts` lines 72 to 77 and 88 to 95). The prompt will tell the model; the unit text is incomplete, but nothing blocks.
- **I4.** The unit names no kinds for `entityIds`, while module line 66 says entity inputs carry them (open point 3).
- **I5.** Module line 46 requires the citation constraint for first-draft templates; a graph reply has no prose (open point 2). This is a module point, not a unit point.

## 8. Changes of other files that this plan would need (none made)

- `units/GNP-04-propose-graph.md`: remove `"Agent loop graph proposal"` from `unblocks`, or give AGL-13 `GNP-04` in its `blocked_by` (I2). Reword line 20 to match the option of open point 1 (I1). Add the recipe input `params` to line 19 (I3, optional). Name the `entityIds` kinds on line 16 (open point 3).
- `units/AGL-13-output-routing.md`: only if the Navigator chooses to block AGL-13 on GNP-04 (I2).
- `modules/genre-packs.md`: only if open point 1 chooses option B (the subset) or open point 2 changes the skeleton text (I5).
- `units/TRG-08-template-engine.md` and `plans/TRG-08.md`: only if open point 1 chooses option B, or open point 5 extends C13.
- No change is needed in `units/GNP-05-core-gate.md` or `units/GNP-13-fiction-entity-types.md`.
