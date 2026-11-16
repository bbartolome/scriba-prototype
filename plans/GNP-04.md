---
id: GNP-04
status: draft
---
# GNP-04 plan — core/propose_graph tool with golden tests for both views

Batch: [GNP-04] (Genre packs, phase:core-propose-graph, M2), a batch of one. Draft by the planner at main `490aa4c`; revised at main `adc57b8` (2026-11-16). The only modified file in the working tree is `units/SAU-12-providers-step.md`, not touched. The unit file was read in full (lines 1 to 25). It has no note that records a change of the unit (a search for "Removed by", "Loosened by", "Reworded by", "Moved to" and "revision" finds nothing). Nothing is built, installed or tested.

The five open points of the draft are settled by the reviser from the unit, the module, the done units and the code on main (section 6). The plan has no wait point.

## 1. Decisions this plan follows

Labels: **U** = the unit, **M** = the module, **G** = a settled decision of another unit or of the contract, **C** = a smaller choice made by this plan (recorded here, not in `plans/DECISIONS.md`).

- **U1 Spec.** `packages/packs/core/tools/propose_graph.yaml`, output `graph`, `enabled: true`, description "Sketch a story graph or a recipe from a plain-language intent." Source: unit line 15.
- **U2 Inputs.** `intent` (text port, required), `view` (string enum `story | recipe`, required, a param, not a port), `entityIds` (entity port, list, not required), `files` (array of project-relative path strings, a param, not a port). Source: unit line 16.
- **U3 Graph file shape.** `{schemaVersion, view, name, nodes, edges}`. Story nodes `entity | scene | beat` with `label` and optional `path`; story edges with free-text relations (suggested `order`, `causality`, `containment`). Recipe nodes `input | tool | output`; wires connect `<nodeId>.<key>`, one wire per input; node ids `^[a-z0-9][a-z0-9-]*$`. Source: unit lines 17 to 19. The contract agrees: `packages/contracts/src/graph-runner/constants.ts` line 19 (`NODE_ID_PATTERN`), lines 37 to 41 (`RELATION_VOCABULARY`); `graph.ts` line 22 (`portIdSchema`), lines 38 to 69 (story node and edge), line 118 (`storyGraphShapeSchema`), line 127 (`recipeGraphShapeSchema`), line 183 (`graphFileSchema`).
- **U4 Fields the unit does not list, which the contract requires.** An input node needs `params` with `type` (`text | entity | style`) and `label`, optional `entityKind` (`graph.ts` lines 72 to 77 `inputParamsSchema`; lines 88 to 94, input member, `params` not optional). A tool node needs `tool`, optional `params`. An output node has optional `params` (`label`, `path`). Every node needs `position` `{x, y}` (`graph.ts` lines 28 to 31). A recipe wire has `id`, `from`, `to` and no `relation` (`graph.ts` lines 111 to 115, strict). The prompt tells the model these.
- **U4b Port keys (revision).** Input node output key `out`, output node input key `in`, tool node output key `output`; tool input keys are the ports the catalogue lists. Source: `packages/contracts/src/graph-runner/constants.ts` (`INPUT_NODE_OUTPUT_KEY = 'out'`, `OUTPUT_NODE_INPUT_KEY = 'in'`, `TOOL_NODE_OUTPUT_KEY = OUTPUT_PORT_KEY`); `units/GRR-01-contract-slice.md` line 23; `units/GRR-11-tool-nodes-wires.md` line 20. A tool's output port has type `text` (`plans/TRG-08.md` C13, line 46). Without these keys the model cannot write a valid wire, so the prompt states them.
- **U5 Paths.** Scene and entity nodes take their paths only from `files` and `entityIds`; the prompt forbids inventing paths. Source: unit line 20. The entity header that `{{entity X}}` renders is `<type> <ref> (<path>)` (`plans/TRG-08.md` C12, line 45), so an entity node's path comes from that header. Entity nodes point into `entities/`, scene and beat nodes into `drafts/` (`graph.ts` lines 33 to 37; `units/GRR-01-contract-slice.md` line 19).
- **U6 Output.** "Return JSON only." The model's text is the output; the executor does not parse it. Source: unit line 20; `apps/api/src/modules/tool-registry/executor.service.ts` line 37 (`OUTPUT_SYSTEM_MESSAGES.graph`), lines 205 to 214 (`finish`: one enclosing code fence is removed for `graph`, nothing is parsed; `GRAPH_FENCE` line 46); `units/TRG-12-executor.md` line 28.
- **U7 Graph output is a pending change, validated by the Agent loop.** Source: unit line 21; `units/AGL-13-output-routing.md` lines 21 and 28 (not this unit's work).
- **U8 Acceptance criteria.** Unit lines 24 and 25; section 4 of this plan.
- **U9 Tool-spec rules.** Names lower snake_case; description one sentence, under about 120 characters, starts with a verb (`Sketch`, 62 characters); output in `draft | entity | claims | graph | check`; `sourcesUsed` is computed by the Tool registry, prompts never list sources. Source: `modules/genre-packs.md` (Tool-spec content rules: names, descriptions, `sourcesUsed`, output kinds); `packages/packs/test/checks.ts` line 55 (`'sketch'` in `VERBS`).
- **U10 Spec keys.** `toolSpecSchema` is strict: `schemaVersion`, `name`, `description`, `inputs`, `output`, `enabled`, `prompt` (`packages/contracts/src/tool-registry/spec.ts` lines 54 to 62).
- **U11 Template subset.** `{{field}}`, `{{#each}}`, `{{#if field}}` (a field name only, truthiness), `{{entity X}}`, `{{toolCatalog}}`. Source: `plans/TRG-08.md` C5 (line 38), C9 (line 42), C12 (line 45), C13 (line 46). Code: `apps/api/src/modules/tool-registry/template.ts` line 199 (only `#each` and `#if` blocks).
- **U12 Catalogue contents.** `{{toolCatalog}}` lists every valid and enabled tool of the packs root (`executor.service.ts` lines 161 to 168, no other filter). One line per tool: `- <name>: <description> Output: <kind>. Inputs: <key> (<type>, list|single, required|optional); ...` (`template.ts` lines 557 to 568).
- **U13 Golden mechanics.** `goldenCase` and `runGoldenCase` in `apps/api/test/packs/golden.kit.ts` (lines 241 and 126), the scenario `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`, the goldens and fixtures in `packages/packs/test/golden/<tool>/`, the `--update-goldens` flag (`apps/api/vitest.config.mts`, `test.env`). A case with `update: false` and no golden file returns `golden: 'missing'` and does not fail inside the helper (`golden.kit.ts` lines 186 to 196). Source: module Testing principles (golden tests); `plans/GNP-02.md` D1 to D12.
- **U14 Catalogue change and goldens.** Any change to the catalogue changes the rendered prompt of every golden that uses `{{toolCatalog}}`, and the PR of that change regenerates it. Source: `plans/GNP-02.md` D18 (line 34) and section 5 (line 131).
- **U15 Test location and wording.** Tests in `apps/api/test/packs/`; a unit test does not name the `examples/` folder (`golden.kit.ts` lines 40 to 43). Source: `plans/GNP-02.md` D1 and D11; `units/README.md` line 138.
- **U16 Entity ids and kinds.** Entity ids match `^[a-z0-9][a-z0-9-]*$` (`packages/contracts/src/project-store/constants.ts` line 4). A kind check on an entity argument runs only when the input has `x-scriba-entity-kinds` (`executor.service.ts` line 140: `kinds !== undefined`). The hint is optional for lint (`lint.ts` lines 420 to 496 check it only when present).
- **U17 Control hint for `view`.** `x-scriba-control: select` needs an enum (`lint.ts` lines 559 to 561); `enum` is an allowed keyword of a string property (`lint.ts` line 71). Same pattern as the fixture `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` (`tone`).
- **U18 Required inputs.** A required input that the prompt does not name is a lint warning (`lint.ts` lines 813 to 818, `template-unused`). The prompt names `intent` and `view` (and also `entityIds` and `files`).
- **U19 Entity kinds shipped.** Shipped on main: `core` `source`, `style-profile`; `nonfiction` `claim`, `concept`, `person`; `fiction` none (only `.gitkeep`; GNP-13 has no plan). A kind in `x-scriba-entity-kinds` must name a shipped type (`units/GNP-01-packs-scaffold-content-checks.md` line 18).
- **U20 Pack folders.** `core` is always active. Source: `modules/genre-packs.md`, Pack layout and shipping.
- **G1 Recipes may use a graph-output tool (revision).** A tool whose output is `graph` may feed an output node, which writes a JSON file in `graphs/` (`units/GRR-06-output-nodes-pending-changes.md` line 21); only `claims` and `check` are not writable (line 22; `units/GRR-03-validation.md` line 20). So the catalogue needs no filter, and `propose_graph` may appear in a recipe (open point 4).
- **G2 Tool settings are set on the canvas (revision).** A tool node's non-port settings are edited in its node body and bound to `params` (`units/GRR-11-tool-nodes-wires.md` line 18). A missing required setting is a run-blocking recipe error, not a graph-schema error (`units/GRR-03-validation.md` line 20); AGL-13 checks a proposed graph only against the graph file schema (`units/AGL-13-output-routing.md` line 21). So a proposal with no tool `params` is a valid graph file that the author completes on the canvas (open point 5).
- **C1 Files.** One tool file in `core/tools/`. The `.gitkeep` of the folder is deleted (precedent: `plans/GNP-06.md` D14, line 42).
- **C2 Case names.** Two cases, `story` and `recipe`, with fixtures `<case>.fixture.json` and goldens `<case>.golden.json` (`plans/GNP-02.md` D6).
- **C3 Test structure.** One file, `apps/api/test/packs/propose-graph.test.ts`, with one `it` per acceptance criterion (two tests in all). The second `it` runs the two cases in turn.
- **C4 Mock scenario.** One scenario file, two steps. Each step matches its case by `lastMessageContent` with that case's intent sentence (`e2e/fixtures/mock-openai/server.mjs` lines 124 to 125: `textOf(last).includes(expected)`; `findStepIndex` lines 133 to 139 takes the first matching step). Story intent: `Map how the keeper meets the assistant on the night of the storm.` Recipe intent: `Turn the chapter notes into a recipe that sketches a story graph.` Neither contains the other, and neither occurs in the prompt template text or in the catalogue line (both prompts carry the same template text and catalogue under C9, so only the intent tells them apart).
- **C5 Scripted replies (revision: exact JSON).** These are fixtures; the check parses them with the schema and does not run them.
  - Story: `{"schemaVersion":1,"view":"story","name":"The storm night","nodes":[{"id":"keeper","kind":"entity","label":"The keeper","path":"entities/keeper.md","position":{"x":0,"y":0}},{"id":"assistant","kind":"entity","label":"The assistant","path":"entities/assistant.md","position":{"x":0,"y":160}},{"id":"arrival","kind":"scene","label":"Arrival","path":"drafts/arrival.md","position":{"x":320,"y":80}},{"id":"first-meeting","kind":"beat","label":"They meet at the door","position":{"x":640,"y":80}}],"edges":[{"id":"e1","from":"arrival","to":"first-meeting","relation":"containment"},{"id":"e2","from":"keeper","to":"arrival","relation":"appears in"},{"id":"e3","from":"assistant","to":"arrival","relation":"appears in"}]}`. The scene path is the fixture's `files` entry; the entity paths are the fixture entities' paths.
  - Recipe: `{"schemaVersion":1,"view":"recipe","name":"Chapter notes to story graph","nodes":[{"id":"notes","kind":"input","position":{"x":0,"y":0},"params":{"type":"text","label":"Chapter notes"}},{"id":"cast","kind":"input","position":{"x":0,"y":160},"params":{"type":"entity","label":"Cast","entityKind":"person"}},{"id":"sketch","kind":"tool","position":{"x":320,"y":80},"tool":"propose_graph"},{"id":"story-graph","kind":"output","position":{"x":640,"y":80},"params":{"label":"Story graph"}}],"edges":[{"id":"w1","from":"notes.out","to":"sketch.intent"},{"id":"w2","from":"cast.out","to":"sketch.entityIds"},{"id":"w3","from":"sketch.output","to":"story-graph.in"}]}`. The tool node uses `propose_graph` because it is the only tool in the catalogue on main (G1 permits it); it has no `params`, as the prompt asks (G2).
- **C6 Schema check.** The golden test's `check` parses `content` with `graphFileSchema` (`@bbartolome/scriba-contracts/graph-runner`), as `plans/GRR-01.md` line 246 says GNP-04 does.
- **C7 Timeouts.** 60000 ms for the first test and 120000 ms for the second.
- **C8 Prompt skeleton (revision, open point 2).** The module skeleton is followed: (1) a role line; (2) the material, each entity rendered with its ID through `{{entity this}}`; (3) the steps (the graph shape); (4) constraints. Constraint 4 keeps "use only the material" (made concrete as "never invent a path", unit line 20). Its citation, `TK` and style-profile clauses have no object here: a graph file has labels, not factual sentences (unit line 20, "Return JSON only"), and the tool has no style-profile or length input (unit line 16; module: tools whose output is `entity`, `check` or `graph` take only the subset that makes sense). Same practice as the non-draft units `units/GNP-14-character-world-builder.md` line 15 and `units/GNP-20-throughline-check.md` line 17, which give their own prompt rules.
- **C9 One prompt for both views (revision, open point 1).** The template renders `{{toolCatalog}}` in both views, under a heading that says the tools are for the recipe view only. Source: unit line 20 asks that the recipe view insert the catalogue, which this does; it does not forbid it in the story view. Criterion line 25 requires the catalogue only in the recipe golden. The subset cannot test the value of `view` (U11), and the other two options change TRG-08 (done) or the unit's inputs. Effect: the story golden also changes when the catalogue changes (U14).
- **C10 No kind hint on `entityIds` (revision, open point 3).** `entityIds` carries `x-scriba-type: entity` and `x-scriba-port: true` and no `x-scriba-entity-kinds`, so any entity kind is accepted (U16). Source: unit line 16 names no kinds; a story graph is a fiction artefact (module Out of scope: "A nonfiction story graph"), whose entities are the fiction kinds that are not shipped (U19) and that the content check refuses until then (GNP-01 line 18); a list of the shipped kinds would refuse `character`, `place` and `world-rule` with no unit to add them later; the recipe view takes material of any kind. The module's sentence on entity inputs ("so the form, canvas and Ajv restrict them") has nothing to restrict for a tool that accepts every kind.

Checked and not applicable: `plans/DECISIONS.md` has no entry for GNP-04 (`grep -n 'GNP-04'` gives only line 4950, which is about GNP-06). No `unit/GNP-04` branch exists. No PLAN DOES NOT WORK report exists for GNP-04.

## 2. Files to create or change

Only these paths change. The shared scenario folder (other files), the golden helper, the README of the packs test folder, the vitest config and all of `apps/` (other than the new test), `packages/contracts/`, `packages/packs/{nonfiction,fiction}/`, `units/`, `modules/` and `plans/` do not change.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/core/tools/propose_graph.yaml` | new | The tool spec (step 2) |
| `packages/packs/core/tools/.gitkeep` | delete (`git rm`) | C1 |
| `packages/packs/test/golden/propose_graph/story.fixture.json` | new | Story arguments and two entities (step 4) |
| `packages/packs/test/golden/propose_graph/recipe.fixture.json` | new | Recipe arguments and one entity (step 4) |
| `packages/packs/test/golden/propose_graph/story.golden.json` | created by the update run (step 7) | The recorded request of the story case |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | created by the update run (step 7) | The recorded request of the recipe case; includes the catalogue line |
| `e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json` | new | Two scripted replies, matched by intent (step 5) |
| `apps/api/test/packs/propose-graph.test.ts` | new | Tests T1 and T2 of section 4 (step 6) |

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` (or the worktree of `unit/GNP-04`) on branch `unit/GNP-04`. Record `node -v` (expected `v26.x`) and `npm -v` (expected `11.x`) with each result (assumption A1). Do not push. Do not use `git add -A` or `git commit -a`.

0. **Base.** `git diff --quiet adc57b8 HEAD -- packages/packs apps/api/test/packs apps/api/src e2e/fixtures/mock-openai/scenarios packages/contracts/src/graph-runner` exits 0. If it does not, re-read the changed files before editing; in particular, if any other tool spec landed in `packages/packs/*/tools/`, the catalogue line of the goldens (step 7) holds it too.
1. **Baseline.** `npm ci` (a new worktree), then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && (cd apps/api && npx vitest run test/packs)` exits 0.
2. **Tool spec (U1 to U5, U9 to U12, U16 to U18, C8 to C10).** Create `packages/packs/core/tools/propose_graph.yaml` with exactly this content:

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
       files:
         type: array
         title: Files
         items:
           type: string
     required: [intent, view]
   output: graph
   enabled: true
   prompt: |
     You sketch a Scriba graph file from the author's intent.

     Intent: {{intent}}
     View: {{view}}

     Material:
     {{#each entityIds}}
     {{entity this}}
     {{/each}}
     {{#if files}}
     Files:
     {{#each files}}
     - {{this}}
     {{/each}}
     {{/if}}

     Steps:
     1. Read the intent and the material.
     2. Write one graph file with the keys schemaVersion (always 1), view (the view above), name (a short title), nodes and edges.
     3. Node ids and edge ids are unique and match ^[a-z0-9][a-z0-9-]*$. Every node has a position {"x": <number>, "y": <number>}.
     4. If the view is story: each node is {"id", "kind", "label", "path" (optional), "position"} with kind entity, scene or beat. Each edge is {"id", "from", "to", "relation" (optional)}, where from and to are node ids and relation is free text. Suggested relations: order (from precedes to), causality (from causes to), containment (from contains to).
     5. If the view is recipe: each node is {"id", "kind", "position", "tool" (tool nodes only), "params"} with kind input, tool or output.
        - An input node has params {"type": "text", "entity" or "style", "label", "entityKind" (optional)} and one output port with key out.
        - A tool node has "tool", the name of one tool in the list below, and no params: the author sets each tool's settings on the canvas. Its input ports are the input keys the list gives; its output port has key output and type text.
        - An output node has optional params {"label", "path"} and one input port with key in.
        - Each edge is a wire {"id", "from", "to"} with no relation. from and to are port ids written <nodeId>.<key>. Each input port takes at most one wire, and the two ports of a wire have the same type.

     Tools for a recipe (use them only when the view is recipe):
     {{toolCatalog}}

     Constraints:
     - Use only the material above.
     - Give a path only where the material gives it: an entity node takes the path in its entity's header line, and a scene or beat node takes a path from the files list. Never invent a path; leave path out when none fits.
     - Return JSON only: one graph file, with no prose before or after it.
   ```

   The prompt contains no `{{` other than the tags shown. Then `npx prettier --write packages/packs/core/tools/propose_graph.yaml`; if prettier changes the prompt text, keep prettier's form and record it.
3. **Folder.** `git rm -- packages/packs/core/tools/.gitkeep`.
4. **Fixtures (C2, C4).** Create `story.fixture.json`: `arguments` = `{"intent": "Map how the keeper meets the assistant on the night of the storm.", "view": "story", "entityIds": ["keeper", "assistant"], "files": ["drafts/arrival.md"]}`; `entities` = two `ResolvedEntity` objects (`{ref, type, path, content}`), `keeper` and `assistant`, both of type `person`, paths `entities/keeper.md` and `entities/assistant.md`, and original content of one sentence each. Create `recipe.fixture.json`: `arguments` = `{"intent": "Turn the chapter notes into a recipe that sketches a story graph.", "view": "recipe", "entityIds": ["keeper"], "files": ["drafts/chapter-notes.md"]}`; `entities` = the `keeper` object. Then `npx prettier --write` on both.
5. **Scenario (C4, C5).** Create `e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json` with two steps. Each step has `"match": {"endpoint": "chat", "lastMessageContent": "<that case's intent sentence of C4>"}` and `"reply": {"kind": "stream", "deltas": ["<that case's graph JSON of C5, as one string>"]}`. Then `npx prettier --write` on the file.
6. **Tests (section 4, C3, C6, C7).** Create `apps/api/test/packs/propose-graph.test.ts` with the two `it`s of section 4. It imports `goldenCase` and `runGoldenCase` from `./golden.kit` and `graphFileSchema` from `@bbartolome/scriba-contracts/graph-runner`. It has no `any`, and it does not contain the text `examples/` (U15). Read the user message of the recorded request with a typed schema, not a cast to `any`.
7. **Update run (U13, U14).** `cd apps/api && npx vitest run -- --update-goldens test/packs/propose-graph.test.ts` exits 0. It writes `story.golden.json` and `recipe.golden.json`. Read both: `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.graph` (`executor.service.ts` line 37). Both goldens' `messages[1].content` contain the catalogue line of section 4 (C9; only `propose_graph` is in the catalogue at this point, A7). The story golden's user message contains `entities/keeper.md` and `drafts/arrival.md`. `git status --short packages/packs/test/golden` lists only the two fixtures and the two goldens.
8. **Compare run and idempotence.** `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0 with two tests passed. Record the `sha256sum` of both goldens, run step 7 again, and check the hashes are equal.
9. **Format.** `npx prettier --check packages/packs/core/tools/propose_graph.yaml packages/packs/test/golden/propose_graph e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json apps/api/test/packs/propose-graph.test.ts` exits 0 (assumption A3). If a golden fails the check, stop and report.
10. **Pack checks.** From the root, `npm run lint:packs` exits 0 with no error and no `template-unused` warning for `propose_graph`. `npm test -w @bbartolome/scriba-packs` exits 0; the GNP-01 suite now also reads `propose_graph` (description, verb; it has no entity-kinds hint; the common-inputs check applies to draft tools only, so it skips this tool).
11. **Type check and lint.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0.
12. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario.
13. **Commit.** `git add` each path of section 2 by name (the `git rm` of step 3 is already staged). `git diff --cached --stat` lists only the section 2 paths and no `units/` or `plans/` file. Commit with `feat(GNP-04): core/propose_graph tool with golden tests for both views`. No model identifier in the message. Do not push.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-04-propose-graph.md` lines 24 and 25. There is one test per criterion and no other test (C3). Command for both: `cd apps/api && npx vitest run test/packs/propose-graph.test.ts`.

| Criterion (unit line) | Test file and test name | Pass condition |
|---|---|---|
| T1. "`propose_graph` validates; calling it without `view` returns an Ajv error naming `view`." (24) | `apps/api/test/packs/propose-graph.test.ts`, "AC 1: propose_graph validates, and a call without view returns an Ajv error naming view" | `runGoldenCase({tool: 'propose_graph', name: 'story', expect: STORY_EXPECT, invalidWithout: 'view', update: false})`. Inside the helper the valid call returns 200 (so the tool is loaded, valid and enabled). The test asserts: `kind` is `graph`; `invalid.status` is 422, `invalid.code` is `TOOL_ARGS_INVALID`, `invalid.message` contains `view`; `modelCalls` is 1. It does not assert `golden` (it may be `missing` before step 7). |
| T2. "Golden tests: with the mock scripted to return a story graph and a recipe, each output parses against the Graph runner's graph schema, and the rendered prompt matches its golden (the recipe-view golden includes the tool catalogue)." (25) | `apps/api/test/packs/propose-graph.test.ts`, "AC 2: the story and recipe goldens match, each output parses as a graph file, and the recipe golden holds the tool catalogue" | `goldenCase({tool: 'propose_graph', name: 'story', expect: STORY_EXPECT, invalidWithout: 'view', check})()` then the same for `recipe` with `RECIPE_EXPECT`. Each passes the helper's assertions: golden `match` (or `written` in update mode), kind `graph`, `sourcesUsed` as expected, the invalid call, one model call. Each `check` parses `content` with `graphFileSchema` (success required) and requires `view` to equal its case. The recipe `check` also requires the recorded user message to contain `- propose_graph: Sketch a story graph or a recipe from a plain-language intent. Output: graph. Inputs: intent (text, single, required); entityIds (entity, list, optional).` |

`STORY_EXPECT` is `{kind: 'graph', sourcesUsed: ['keeper', 'assistant']}`; `RECIPE_EXPECT` is `{kind: 'graph', sourcesUsed: ['keeper']}`. Timeouts: C7. If the catalogue line rendered on main differs from the line above (for example, in port order), the golden is the source: use the line that step 7 writes and record the difference.

Criterion "validates" also has the lint gate of step 10 (`npm run lint:packs`). That gate is not a test of this unit and adds none.

## 5. Downstream agreement

- **GNP-05 (core gate, `blocked_by` includes GNP-04).** Its criteria (lines 21 and 23) need the two-view goldens and `propose_graph` in the registry list from `core`. Both are delivered here. No change.
- **GNP-24 (remaining-shapes gate, unit line 25).** Its demo asks for a recipe proposal (`view: recipe`). The prompt gives the recipe shape, the port keys (U4b) and the catalogue (C9). Tool settings are left to the author on the canvas (G2).
- **AGL-13 (output routing, `blocked_by` AGL-09, AGL-12, GRR-01; not GNP-04).** Consumes the `graph` output. The contract here: `content` is the JSON document with at most one enclosing code fence removed (`executor.service.ts` lines 205 to 214), and the scripted outputs parse with `graphFileSchema`. AGL-13 validates only against the graph file schema (line 21), so a proposal with no tool `params` is accepted (G2). Unit line 9's `unblocks` entry "Agent loop graph proposal" names no unit; it is not in the way of this plan and is not changed (I2).
- **GRR-03, GRR-06, GRR-11 (no plan, no branch).** Used as sources only (G1, G2). Nothing here changes them.
- **GRR-01 (done).** Its plan (line 246) names GNP-04 as a user of `graphFileSchema`. Agreed; nothing in `packages/contracts/` changes.
- **GNP-13 (fiction entity types) and GNP-18/GNP-19.** `entityIds` has no kind hint (C10), so the fiction kinds are accepted as soon as they ship; no later change of `propose_graph` is needed.
- **Draft tools of later units (GNP-07 to GNP-10, GNP-14 to GNP-17, GNP-20 to GNP-22) and GNP-23 (remix).** Each adds a line to `{{toolCatalog}}`, so both goldens of this plan (C9) change in that unit's PR, which regenerates them (U14; `plans/GNP-02.md` section 5). Two such units in parallel conflict on the goldens at rebase; the rebase regenerates them. GNP-23's `targetShape` enum lists only draft tools (`units/GNP-01-packs-scaffold-content-checks.md` line 21); `propose_graph` has output `graph`, so it is not in that enum.
- **GNP-01, GNP-02, GNP-03, GNP-06, GNP-11 (done).** The content suite reads `core/tools/*.yaml` and must pass for the new file (step 10). The golden helper and the scenario convention are used as they are.
- **TRG-08 and TRG-12 (done).** The template subset (U11) and the executor (U6, U12) are used as they are; neither changes.
- **Platform and e2e.** `e2e/harness/global-setup.ts` line 80 sets `SCRIBA_PACKS_DIR` to the real packs, so the e2e run lists `propose_graph` from now on. No e2e spec counts built-in tools.
- **In-flight plans.** `grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/AGL-09.md` and this plan. AGL-09's section 2 names only `apps/api/src/modules/agent-loop/**`, `apps/web/**`, `packages/contracts/src/agent-loop/constants.ts` and its own test `apps/api/test/agent-loop-narrative.test.ts`, which boots with the shared fixture packs `apps/api/test/fixtures/packs` (AGL-09 plan line 137), not the real packs. No shared path and no dependence on the real `core/tools`, so either order is correct.

## 6. Open points (all settled by the reviser, 2026-11-16)

1. **The view-dependent prompt. Settled: one prompt, catalogue in both views (C9).** Sources: unit line 20 (the recipe view inserts the catalogue; no "only"); criterion line 25 (requires the catalogue in the recipe golden only); `plans/TRG-08.md` C5 and C9 (no value test). Neither other option is needed: (B) would change TRG-08 (done) and the module subset, (C) the unit's inputs.
2. **The prompt skeleton. Settled: parts 1 to 3, and constraint 4's "use only the material" with the unit's path rule (C8).** Sources: module Tool-spec content rules (skeleton; tools whose output is `graph` take only the subset that makes sense); unit lines 16 and 20; GNP-14 line 15 and GNP-20 line 17 (non-draft tools with their own prompt rules). The module text does not change.
3. **The kinds of `entityIds`. Settled: no `x-scriba-entity-kinds` (C10).** Sources: unit line 16; module Out of scope ("A nonfiction story graph"); GNP-01 line 18; `executor.service.ts` line 140; U19.
4. **The catalogue lists the tool itself. Settled: no filter; a recipe may use `propose_graph` (G1).** Sources: GRR-06 lines 18 to 22; GRR-03 line 20; `executor.service.ts` lines 161 to 168.
5. **Tool settings are not in the catalogue. Settled: the prompt asks for no tool `params` (G2).** Sources: unit line 20 (catalogue = port keys and types); `plans/TRG-08.md` C13; GRR-11 line 18; GRR-03 line 20; AGL-13 line 21.

## 7. Facts checked and facts assumed

### Facts checked (read; nothing was run)

Unit and module:
- `units/GNP-04-propose-graph.md` lines 1 to 25. No change notes.
- `units/README.md` lines 34 to 65 and 128 to 138.
- `modules/genre-packs.md`: dependency graph, parallelism, pack layout, tool-spec content rules (skeleton, entity-input hint), testing principles, out of scope.

Plans:
- `plans/GNP-02.md` (D1 to D18; section 5), `plans/TRG-08.md` (C5, C9, C12, C13), `plans/GRR-01.md` (line 246), `plans/GNP-01.md` (open point 3), `plans/GNP-06.md` (D14), `plans/AGL-09.md` (section 2; line 137).
- `plans/DECISIONS.md`: searched by `GNP-04` only (line 4950, about GNP-06).
- Plan statuses: only `plans/AGL-09.md` and this plan are `draft`; no `planned` plan. No plan file for GRR-03, GRR-06, GRR-11, GNP-13. No `unit/GNP-04` branch.

Code and contracts on main (`adc57b8`):
- `packages/contracts/src/graph-runner/constants.ts` (`NODE_ID_PATTERN`, `INPUT_NODE_OUTPUT_KEY`, `OUTPUT_NODE_INPUT_KEY`, `TOOL_NODE_OUTPUT_KEY`, `RELATION_VOCABULARY`); `graph.ts` lines 22, 28 to 31, 38 to 69, 72 to 115, 118, 127, 183.
- `packages/contracts/src/project-store/files.ts` line 9 (`fileReferenceSchema` is a plain string).
- `apps/api/src/modules/tool-registry/executor.service.ts` lines 37, 46, 138 to 142, 161 to 176, 205 to 214.
- `apps/api/src/modules/tool-registry/template.ts` lines 199, 269, 557 to 568, 628.
- `apps/api/src/modules/tool-registry/lint.ts` lines 420 to 496, 559 to 561, 813 to 818.
- `apps/api/test/packs/golden.kit.ts` lines 126 to 235, 241 to 250.
- `e2e/fixtures/mock-openai/server.mjs` lines 124 to 125, 133 to 139, 291.
- `packages/packs/test/checks.ts` line 55. `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` (hint conventions).
- Real packs: `core/tools` holds only `.gitkeep`; `core/entity-types` `source.yaml`, `style-profile.yaml`; `nonfiction/entity-types` `claim.yaml`, `concept.yaml`, `person.yaml`; `fiction/*` `.gitkeep` only.

Units read for the downstream check: AGL-13 (lines 7, 21, 28), GRR-01 (lines 9, 18 to 24), GRR-03 (line 20), GRR-06 (lines 18 to 22), GRR-11 (lines 18, 20), GNP-05 (lines 7, 21, 23), GNP-24 (line 25), GNP-01 (lines 18, 21), GNP-13, GNP-14 (line 15), GNP-20 (line 17), TRG-12 (line 28).

### Facts assumed (not run)

- A1. Node v26 and npm 11 are on PATH. Step 1 checks it.
- A2. The `view` property with `x-scriba-control: select` and `enum`, and the `files` array with no hint, pass lint. Step 10 checks it.
- A3. `prettier --check` accepts the scenario JSON and the golden files. Step 9 checks it.
- A4. The mock returns the stream deltas as the reply text, and `finish` returns them unparsed for `graph`. Step 7 checks it.
- A5. Each intent sentence appears once in its own rendered prompt and not in the other. Step 8 and the mock matcher check it.
- A6. `toolArgumentsSchema` accepts the `files` array of strings and the `view` string. Step 6 checks it through the valid call.
- A7. The catalogue has only `propose_graph` when the goldens are written. Step 0 and step 7 check it.

### Inconsistencies in the unit files (not changed, not in the way)

- **I1 (closed).** Unit line 20 and the subset: resolved by C9 without a unit change.
- **I2.** Unit line 9 lists `"Agent loop graph proposal"` in `unblocks`; that entry names no unit, and AGL-13 is not blocked by GNP-04 (`units/AGL-13-output-routing.md` line 7). It does not stop any step of this plan, so the reviser does not change it (prompt.md: do not change a part that is not in the way). Left for the orchestrator or the Navigator.
- **I3.** Unit line 19 omits the input-node `params` and the port keys; the prompt gives them (U4, U4b). Nothing blocks.

## 8. Changes of other files

None. No unit, module or other plan changes for this plan.

## 9. Review parts

One part (a small plan).

- **Part 1: the tool, its fixtures, goldens and tests.** Steps 0 to 13, with tests T1 and T2 of section 4.
