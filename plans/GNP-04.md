---
id: GNP-04
status: done
---
# GNP-04 plan — core/propose_graph tool with golden tests for both views

Batch: [GNP-04] (Genre packs, phase:core-propose-graph, M2), a batch of one. Draft by the planner at main `490aa4c`; revised at main `adc57b8` (2026-11-16); revised again at main `e8f2227` (2026-11-16) to apply the Navigator decision on open point 1 (N1); revised a third time at main `2e8eed0` (2026-11-16) to apply the Navigator decisions on open points 2 to 5 (N2 to N5) and on the place of the `includeCatalogue` sentence (N6). The only modified file in the working tree that is not this revision's is `units/SAU-12-providers-step.md`, not touched. The unit file was read in full (lines 1 to 25). Its only change note is on line 16 (`includeCatalogue`, Navigator decision of 2026-11-16, made with this revision). Nothing is built, installed or tested.

All open points are settled by the Navigator: point 1 (N1) and points 2 to 5 (N2 to N5), each with option (a). The steps below follow these options (C8, C10, G1, G2). Section 6 keeps the options with the chosen one marked.

## 0. Navigator decisions applied

- **N1 (Navigator, 2026-11-16, point 1, option (i); `plans/DECISIONS.md`, entry "GNP-04 — Navigator decision: point 1, the view-dependent prompt (option i)").** The five carry-forward lines, kept as recorded:
  1. The recipe catalogue is gated by a model-sent boolean tool input `includeCatalogue` (required).
  2. Unit line 16 gains the input.
  3. The prompt gates the catalogue block with `{{#if includeCatalogue}}...{{/if}}`.
  4. The tool description says: set to true when `view` is `recipe`, false when it is `story`.
  5. No executor, TRG-08 or TRG-12 change.
- Accepted risk (Navigator): the model could send a flag that disagrees with `view`.
- How the plan applies line 4: the tool's own `description` is fixed by unit line 15 and by the module rule (one sentence, under about 120 characters), so the sentence goes in the `description` of the `includeCatalogue` input. That description reaches the model: `apps/api/src/modules/tool-registry/emit.ts` lines 81 to 90 (`functionProperty`) keeps a property's `description` in the function schema; `lint.ts` line 68 allows `description` on every property. The Navigator decided this (N6): the sentence belongs in the input's `description`.
- Entry for N2 to N6: `plans/DECISIONS.md`, "GNP-04, GNP-07 — Navigator decisions: points 2 to 5 of GNP-04, the kinds of entityIds (module line 66 reworded), and where the includeCatalogue sentence goes" (Navigator, 2026-11-16).
  - **N2 (point 2, option (a)).** Skeleton constraint 4 keeps only "use only the material", made concrete as the path rule; the citation, `TK` and style-profile/length clauses are dropped (C8).
  - **N3 (point 3, option (a)).** No `x-scriba-entity-kinds` on `entityIds`, as the reworded module line 66 allows (C10).
  - **N4 (point 4, option (a)).** No catalogue filter and no prompt line: the catalogue lists `propose_graph` itself, and a recipe may use it (G1).
  - **N5 (point 5, option (a)).** A tool node has no `params`; the author sets its settings on the canvas (G2).
  - **N6 (the place of the N1 sentence).** "Set to true when view is recipe, false when view is story." stays in the `description` of the `includeCatalogue` input (unit line 16; step 2). The tool-level description (unit line 15) stays one sentence. "The tool description says" in N1 is read as the input's description.

## 1. Decisions this plan follows

Labels: **N** = a Navigator decision (section 0), **U** = the unit, **M** = the module, **G** = a settled decision of another unit or of the contract, **C** = a smaller choice made by this plan (recorded here, not in `plans/DECISIONS.md`).

- **U1 Spec.** `packages/packs/core/tools/propose_graph.yaml`, output `graph`, `enabled: true`, description "Sketch a story graph or a recipe from a plain-language intent." Source: unit line 15.
- **U2 Inputs.** `intent` (text port, required), `view` (string enum `story | recipe`, required, a param, not a port), `includeCatalogue` (boolean, required, a param, not a port; sent by the model: true when `view` is `recipe`, false when `view` is `story`), `entityIds` (entity port, list, not required), `files` (array of project-relative path strings, a param, not a port). Source: unit line 16 (as changed by N1). `boolean` is a type of the subset with no extra keyword (`lint.ts` lines 74 and 77), and `x-scriba-control: toggle` needs a boolean (`lint.ts` lines 555 to 557).
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
- **U12 Catalogue contents.** `{{toolCatalog}}` lists every valid and enabled tool of the packs root (`executor.service.ts` lines 161 to 168, no other filter). One line per tool: `- <name>: <description> Output: <kind>. Inputs: <key> (<type>, list|single, required|optional); ...` (`template.ts` lines 557 to 568). Only ports are listed, so `propose_graph`'s line names `intent` and `entityIds` and not `view`, `includeCatalogue` or `files`.
- **U13 Golden mechanics.** `goldenCase` and `runGoldenCase` in `apps/api/test/packs/golden.kit.ts` (lines 241 and 126), the scenario `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`, the goldens and fixtures in `packages/packs/test/golden/<tool>/`, the `--update-goldens` flag (`apps/api/vitest.config.mts`, `test.env`). A case with `update: false` and no golden file returns `golden: 'missing'` and does not fail inside the helper (`golden.kit.ts` lines 186 to 196). Source: module Testing principles (golden tests); `plans/GNP-02.md` D1 to D12.
- **U14 Catalogue change and goldens.** Any change to the catalogue changes the rendered prompt of every golden that renders `{{toolCatalog}}`, and the PR of that change regenerates it. Source: `plans/GNP-02.md` D18 (line 34) and section 5 (line 131). Under N1 only the recipe golden renders it; the story golden does not change when the catalogue changes.
- **U15 Test location and wording.** Tests in `apps/api/test/packs/`; a unit test does not name the `examples/` folder (`golden.kit.ts` lines 40 to 43). Source: `plans/GNP-02.md` D1 and D11; `units/README.md` line 138.
- **U16 Entity ids and kinds.** Entity ids match `^[a-z0-9][a-z0-9-]*$` (`packages/contracts/src/project-store/constants.ts` line 4). A kind check on an entity argument runs only when the input has `x-scriba-entity-kinds` (`executor.service.ts` line 140: `kinds !== undefined`). The hint is optional for lint (`lint.ts` lines 420 to 496 check it only when present).
- **U17 Control hint for `view`.** `x-scriba-control: select` needs an enum (`lint.ts` lines 559 to 561); `enum` is an allowed keyword of a string property (`lint.ts` line 71). Same pattern as the fixture `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` (`tone`).
- **U18 Required inputs.** A required input that the prompt does not name is a lint warning (`lint.ts` lines 813 to 818, `template-unused`). The prompt names `intent` and `view` (and also `entityIds` and `files`); `includeCatalogue` is used by `{{#if includeCatalogue}}`, which counts as a use (`template.ts` line 511, usage `if`).
- **U19 Entity kinds shipped.** Shipped on main: `core` `source`, `style-profile`; `nonfiction` `claim`, `concept`, `person`; `fiction` none (only `.gitkeep`; GNP-13 has no plan). A kind in `x-scriba-entity-kinds` must name a shipped type (`units/GNP-01-packs-scaffold-content-checks.md` line 18).
- **U20 Pack folders.** `core` is always active. Source: `modules/genre-packs.md`, Pack layout and shipping.
- **G1 Recipes may use a graph-output tool (point 4, settled by the Navigator (option a), N4; `plans/DECISIONS.md`, entry "GNP-04, GNP-07 — Navigator decisions: points 2 to 5 of GNP-04, the kinds of entityIds (module line 66 reworded), and where the includeCatalogue sentence goes").** A tool whose output is `graph` may feed an output node, which writes a JSON file in `graphs/` (`units/GRR-06-output-nodes-pending-changes.md` line 21); only `claims` and `check` are not writable (line 22; `units/GRR-03-validation.md` line 20). So the catalogue needs no filter, and `propose_graph` may appear in a recipe (point 4, N4).
- **G2 Tool settings are set on the canvas (point 5, settled by the Navigator (option a), N5; same `plans/DECISIONS.md` entry as G1).** A tool node's non-port settings are edited in its node body and bound to `params` (`units/GRR-11-tool-nodes-wires.md` line 18). A missing required setting is a run-blocking recipe error, not a graph-schema error (`units/GRR-03-validation.md` line 20); AGL-13 checks a proposed graph only against the graph file schema (`units/AGL-13-output-routing.md` line 21). So a proposal with no tool `params` is a valid graph file that the author completes on the canvas (point 5, N5).
- **C1 Files.** One tool file in `core/tools/`. The `.gitkeep` of the folder is deleted (precedent: `plans/GNP-06.md` D14, line 42).
- **C2 Case names.** Two cases, `story` and `recipe`, with fixtures `<case>.fixture.json` and goldens `<case>.golden.json` (`plans/GNP-02.md` D6).
- **C3 Test structure.** One file, `apps/api/test/packs/propose-graph.test.ts`, with one `it` per acceptance criterion (two tests in all). The second `it` runs the two cases in turn.
- **C4 Mock scenario.** One scenario file, two steps. Each step matches its case by `lastMessageContent` with that case's intent sentence (`e2e/fixtures/mock-openai/server.mjs` lines 124 to 125: `textOf(last).includes(expected)`; `findStepIndex` lines 133 to 139 takes the first matching step). Story intent: `Map how the keeper meets the assistant on the night of the storm.` Recipe intent: `Turn the chapter notes into a recipe that sketches a story graph.` Neither contains the other, and neither occurs in the prompt template text or in the catalogue line, so each step matches only its own case's prompt.
- **C5 Scripted replies (revision: exact JSON).** These are fixtures; the check parses them with the schema and does not run them.
  - Story: `{"schemaVersion":1,"view":"story","name":"The storm night","nodes":[{"id":"keeper","kind":"entity","label":"The keeper","path":"entities/keeper.md","position":{"x":0,"y":0}},{"id":"assistant","kind":"entity","label":"The assistant","path":"entities/assistant.md","position":{"x":0,"y":160}},{"id":"arrival","kind":"scene","label":"Arrival","path":"drafts/arrival.md","position":{"x":320,"y":80}},{"id":"first-meeting","kind":"beat","label":"They meet at the door","position":{"x":640,"y":80}}],"edges":[{"id":"e1","from":"arrival","to":"first-meeting","relation":"containment"},{"id":"e2","from":"keeper","to":"arrival","relation":"appears in"},{"id":"e3","from":"assistant","to":"arrival","relation":"appears in"}]}`. The scene path is the fixture's `files` entry; the entity paths are the fixture entities' paths.
  - Recipe: `{"schemaVersion":1,"view":"recipe","name":"Chapter notes to story graph","nodes":[{"id":"notes","kind":"input","position":{"x":0,"y":0},"params":{"type":"text","label":"Chapter notes"}},{"id":"cast","kind":"input","position":{"x":0,"y":160},"params":{"type":"entity","label":"Cast","entityKind":"person"}},{"id":"sketch","kind":"tool","position":{"x":320,"y":80},"tool":"propose_graph"},{"id":"story-graph","kind":"output","position":{"x":640,"y":80},"params":{"label":"Story graph"}}],"edges":[{"id":"w1","from":"notes.out","to":"sketch.intent"},{"id":"w2","from":"cast.out","to":"sketch.entityIds"},{"id":"w3","from":"sketch.output","to":"story-graph.in"}]}`. The tool node uses `propose_graph` because it is the only tool in the catalogue on main (G1, N4); it has no `params`, as the prompt asks (G2, N5). The reply is a fixture only: the test parses it with the graph file schema.
- **C6 Schema check.** The golden test's `check` parses `content` with `graphFileSchema` (`@bbartolome/scriba-contracts/graph-runner`), as `plans/GRR-01.md` line 246 says GNP-04 does.
- **C7 Timeouts.** 60000 ms for the first test and 120000 ms for the second.
- **C8 Prompt skeleton (point 2, settled by the Navigator (option a), N2; same `plans/DECISIONS.md` entry as G1).** The module skeleton is followed: (1) a role line; (2) the material, each entity rendered with its ID through `{{entity this}}`; (3) the steps (the graph shape); (4) constraints. Constraint 4 keeps "use only the material" (made concrete as "never invent a path", unit line 20). Its citation, `TK` and style-profile clauses have no object here: a graph file has labels, not factual sentences (unit line 20, "Return JSON only"), and the tool has no style-profile or length input (unit line 16; module: tools whose output is `entity`, `check` or `graph` take only the subset that makes sense). Same practice as the non-draft units `units/GNP-14-character-world-builder.md` line 15 and `units/GNP-20-throughline-check.md` line 17, which give their own prompt rules.
- **C9 The catalogue is gated by `includeCatalogue` (N1, settled by the Navigator, open point 1).** The prompt renders the heading of the tool list and `{{toolCatalog}}` inside `{{#if includeCatalogue}}...{{/if}}`. The input `includeCatalogue` is a required boolean param whose `description` is "Set to true when view is recipe, false when view is story." The story fixture sends `false`, the recipe fixture `true` (step 4). So the recipe golden holds the catalogue line and the story golden does not (step 7, T2). Source: N1; unit lines 16 and 20; `template.ts` lines 542 to 555 (`isTruthy`: `false` is falsy). The executor, TRG-08 and TRG-12 do not change.
- **C10 No kind hint on `entityIds` (point 3, settled by the Navigator (option a), N3; same `plans/DECISIONS.md` entry as G1).** `entityIds` carries `x-scriba-type: entity` and `x-scriba-port: true` and no `x-scriba-entity-kinds`, so any entity kind is accepted (U16). Source: unit line 16 names no kinds; a story graph is a fiction artefact (module Out of scope: "A nonfiction story graph"), whose entities are the fiction kinds that are not shipped (U19) and that the content check refuses until then (GNP-01 line 18); a list of the shipped kinds would refuse `character`, `place` and `world-rule` with no unit to add them later; the recipe view takes material of any kind. Module line 66, as reworded by the Navigator at `2e8eed0`, asks for the hint only "where the input means a definite set of kinds"; `entityIds` means entities and sources of any kind, so no hint.

Checked: `plans/DECISIONS.md` (`grep -n 'GNP-04'`) gives line 4950 (about GNP-06), the Navigator entry at line 5137 (N1) and the Navigator entry at line 5144 (N2 to N6). No `unit/GNP-04` branch exists. No PLAN DOES NOT WORK report exists for GNP-04.

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

0. **Base.** `git diff --quiet e8f2227 HEAD -- packages/packs apps/api/test/packs apps/api/src e2e/fixtures/mock-openai/scenarios packages/contracts/src/graph-runner` exits 0. If it does not, re-read the changed files before editing; in particular, if any other tool spec landed in `packages/packs/*/tools/`, the catalogue line of the goldens (step 7) holds it too.
1. **Baseline.** `npm ci` (a new worktree), then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && (cd apps/api && npx vitest run test/packs)` exits 0.
2. **Tool spec (N1, U1 to U5, U9 to U12, U16 to U18, C8 to C10).** Create `packages/packs/core/tools/propose_graph.yaml` with exactly this content:

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
       includeCatalogue:
         type: boolean
         title: Include the tool catalogue
         description: Set to true when view is recipe, false when view is story.
         x-scriba-control: toggle
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
     required: [intent, view, includeCatalogue]
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
        - A tool node has "tool", the name of one tool in the tool list below, and no params: the author sets each tool's settings on the canvas. Its input ports are the input keys the list gives; its output port has key output and type text.
        - An output node has optional params {"label", "path"} and one input port with key in.
        - Each edge is a wire {"id", "from", "to"} with no relation. from and to are port ids written <nodeId>.<key>. Each input port takes at most one wire, and the two ports of a wire have the same type.

     {{#if includeCatalogue}}
     Tools for a recipe:
     {{toolCatalog}}
     {{/if}}

     Constraints:
     - Use only the material above.
     - Give a path only where the material gives it: an entity node takes the path in its entity's header line, and a scene or beat node takes a path from the files list. Never invent a path; leave path out when none fits.
     - Return JSON only: one graph file, with no prose before or after it.
   ```

   The prompt contains no `{{` other than the tags shown. The tool-node line (step 5 of the prompt) follows N5, and the three constraint lines follow N2. `entityIds` has no `x-scriba-entity-kinds` (N3), and the prompt has no line that forbids `propose_graph` in a recipe (N4). Then `npx prettier --write packages/packs/core/tools/propose_graph.yaml`; if prettier changes the prompt text, keep prettier's form and record it.
3. **Folder.** `git rm -- packages/packs/core/tools/.gitkeep`.
4. **Fixtures (C2, C4).** Create `story.fixture.json`: `arguments` = `{"intent": "Map how the keeper meets the assistant on the night of the storm.", "view": "story", "includeCatalogue": false, "entityIds": ["keeper", "assistant"], "files": ["drafts/arrival.md"]}`; `entities` = two `ResolvedEntity` objects (`{ref, type, path, content}`), `keeper` and `assistant`, both of type `person`, paths `entities/keeper.md` and `entities/assistant.md`, and original content of one sentence each. Create `recipe.fixture.json`: `arguments` = `{"intent": "Turn the chapter notes into a recipe that sketches a story graph.", "view": "recipe", "includeCatalogue": true, "entityIds": ["keeper"], "files": ["drafts/chapter-notes.md"]}`; `entities` = the `keeper` object. Then `npx prettier --write` on both.
5. **Scenario (C4, C5).** Create `e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json` with two steps. Each step has `"match": {"endpoint": "chat", "lastMessageContent": "<that case's intent sentence of C4>"}` and `"reply": {"kind": "stream", "deltas": ["<that case's graph JSON of C5, as one string>"]}`. Then `npx prettier --write` on the file.
6. **Tests (section 4, C3, C6, C7).** Create `apps/api/test/packs/propose-graph.test.ts` with the two `it`s of section 4. It imports `goldenCase` and `runGoldenCase` from `./golden.kit` and `graphFileSchema` from `@bbartolome/scriba-contracts/graph-runner`. It has no `any`, and it does not contain the text `examples/` (U15). Read the user message of the recorded request with a typed schema, not a cast to `any`.
7. **Update run (U13, U14).** `cd apps/api && npx vitest run -- --update-goldens test/packs/propose-graph.test.ts` exits 0. It writes `story.golden.json` and `recipe.golden.json`. Read both: `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.graph` (`executor.service.ts` line 37). The recipe golden's `messages[1].content` contains `Tools for a recipe:` and the catalogue line of section 4 (C9; only `propose_graph` is in the catalogue at this point, A7). The story golden's `messages[1].content` contains neither (C9, `includeCatalogue: false`). The story golden's user message contains `entities/keeper.md` and `drafts/arrival.md`. `git status --short packages/packs/test/golden` lists only the two fixtures and the two goldens.
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
| T1. "`propose_graph` validates; calling it without `view` returns an Ajv error naming `view`." (24) | `apps/api/test/packs/propose-graph.test.ts`, "AC 1: propose_graph validates, and a call without view returns an Ajv error naming view" | `runGoldenCase({tool: 'propose_graph', name: 'story', expect: STORY_EXPECT, invalidWithout: 'view', update: false})`. Inside the helper the valid call returns 200 (so the tool is loaded, valid and enabled). The test asserts: `kind` is `graph`; `invalid.status` is 422, `invalid.code` is `TOOL_ARGS_INVALID`, `invalid.message` contains `view`; `modelCalls` is 1. It does not assert `golden` (it may be `missing` before step 7). The story fixture's valid call carries `includeCatalogue: false`, so only `view` is missing from the invalid call. |
| T2. "Golden tests: with the mock scripted to return a story graph and a recipe, each output parses against the Graph runner's graph schema, and the rendered prompt matches its golden (the recipe-view golden includes the tool catalogue)." (25) | `apps/api/test/packs/propose-graph.test.ts`, "AC 2: the story and recipe goldens match, each output parses as a graph file, and the recipe golden holds the tool catalogue" | `goldenCase({tool: 'propose_graph', name: 'story', expect: STORY_EXPECT, invalidWithout: 'view', check})()` then the same for `recipe` with `RECIPE_EXPECT`. Each passes the helper's assertions: golden `match` (or `written` in update mode), kind `graph`, `sourcesUsed` as expected, the invalid call, one model call. Each `check` parses `content` with `graphFileSchema` (success required) and requires `view` to equal its case. The story `check` also requires the recorded user message not to contain `Tools for a recipe:` (C9, `includeCatalogue: false`). The recipe `check` also requires the recorded user message to contain `Tools for a recipe:` and `- propose_graph: Sketch a story graph or a recipe from a plain-language intent. Output: graph. Inputs: intent (text, single, required); entityIds (entity, list, optional).` |

`STORY_EXPECT` is `{kind: 'graph', sourcesUsed: ['keeper', 'assistant']}`; `RECIPE_EXPECT` is `{kind: 'graph', sourcesUsed: ['keeper']}`. Timeouts: C7. If the catalogue line rendered on main differs from the line above (for example, in port order), the golden is the source: use the line that step 7 writes and record the difference.

Criterion "validates" also has the lint gate of step 10 (`npm run lint:packs`). That gate is not a test of this unit and adds none.

## 5. Downstream agreement

- **GNP-05 (core gate, `blocked_by` includes GNP-04).** Its criteria (lines 21 and 23) need the two-view goldens and `propose_graph` in the registry list from `core`. Both are delivered here. No change.
- **GNP-24 (remaining-shapes gate, unit line 25).** Its demo asks for a recipe proposal (`view: recipe`). The agent's call then also sends `includeCatalogue: true`, as the input's description says (N1; the Navigator accepted the risk of a disagreeing flag). The prompt gives the recipe shape, the port keys (U4b) and the catalogue (C9). Tool settings are left to the author on the canvas (G2, N5). No change to GNP-24.
- **AGL-13 (output routing, `blocked_by` AGL-09, AGL-12, GRR-01; not GNP-04).** Consumes the `graph` output. The contract here: `content` is the JSON document with at most one enclosing code fence removed (`executor.service.ts` lines 205 to 214), and the scripted outputs parse with `graphFileSchema`. AGL-13 validates only against the graph file schema (line 21), so a proposal with no tool `params` is accepted (G2). Unit line 9's `unblocks` entry "Agent loop graph proposal" names no unit id; no unit is guessed for it, it is not in the way of this plan, and it is not changed (I2).
- **GRR-03, GRR-06, GRR-11 (no plan, no branch).** Used as sources only (G1, G2). Nothing here changes them.
- **GRR-01 (done).** Its plan (line 246) names GNP-04 as a user of `graphFileSchema`. Agreed; nothing in `packages/contracts/` changes.
- **GNP-13 (fiction entity types) and GNP-18/GNP-19.** Under N3 (C10), `entityIds` has no kind hint, so the fiction kinds are accepted as soon as they ship; no later change of `propose_graph` is needed.
- **Draft tools of later units (GNP-07 to GNP-10, GNP-14 to GNP-17, GNP-20 to GNP-22) and GNP-23 (remix).** Each adds a line to `{{toolCatalog}}`, so the recipe golden of this plan (C9; the story golden does not render the catalogue) changes in that unit's PR, which regenerates them (U14; `plans/GNP-02.md` section 5). Two such units in parallel conflict on the goldens at rebase; the rebase regenerates them. GNP-23's `targetShape` enum lists only draft tools (`units/GNP-01-packs-scaffold-content-checks.md` line 21); `propose_graph` has output `graph`, so it is not in that enum.
- **GNP-01, GNP-02, GNP-03, GNP-06, GNP-11 (done).** The content suite reads `core/tools/*.yaml` and must pass for the new file (step 10). The golden helper and the scenario convention are used as they are.
- **TRG-08 and TRG-12 (done).** The template subset (U11) and the executor (U6, U12) are used as they are; neither changes.
- **Platform and e2e.** `e2e/harness/global-setup.ts` line 80 sets `SCRIBA_PACKS_DIR` to the real packs, so the e2e run lists `propose_graph` from now on. No e2e spec counts built-in tools.
- **In-flight plans.** At main `2e8eed0`, `grep -l '^status: \(draft\|planned\)' plans/*.md` gives this plan and `plans/GNP-07.md` (draft). GNP-07 adds the `cold_open` tool, so it adds a catalogue line to this plan's recipe golden. Its plan handles both merge orders (its C10, step 9 and section 5): if GNP-04 is first, GNP-07 regenerates `packages/packs/test/golden/propose_graph/recipe.golden.json` and the story golden does not change; if GNP-07 is first, this plan's step 0 and step 7 write the recipe golden with both lines (A7 is then false, as step 0 says). T2's recipe `check` asserts that the `propose_graph` line is contained, so it holds with two lines. GNP-07 also writes `entityIds` with no kind hint (N3 settles its open point 1 the same way). No other `draft` or `planned` plan changes a path of section 2.

## 6. Open points (all settled)

Point 1 is settled by the Navigator (N1, section 0). Points 2 to 5 are settled by the Navigator, each with option (a) (N2 to N5, section 0; `plans/DECISIONS.md`, entry "GNP-04, GNP-07 — Navigator decisions: points 2 to 5 of GNP-04, the kinds of entityIds (module line 66 reworded), and where the includeCatalogue sentence goes"). Each point keeps its options; the chosen option is marked. The steps follow the chosen options. No point changes a criterion, a test count or a file of section 2.

1. **The view-dependent prompt. Settled by the Navigator: option (i), the model-sent required boolean `includeCatalogue` gates the catalogue (N1, C9).**
2. **Skeleton constraint 4 (C8). Settled by the Navigator: option (a) (N2).**
   - (a) Keep "use only the material" (made concrete as the path rule of unit line 20) and leave out the citation, `TK` and style-profile/length clauses. **Chosen (N2).** Plan lines it needs: the three Constraints lines of step 2. Reason: the module skeleton is stated for "every first-draft template"; `propose_graph` outputs a graph file of labels in JSON only (unit line 20), so `[@id]` citations and `TK` notes have no place, and the tool has no style-profile or length input (unit line 16; module line 66: tools whose output is `graph` take only the subset that makes sense). GNP-14 line 15 and GNP-20 line 17 do the same for non-draft tools.
   - (b) Copy all four clauses of constraint 4. Against: citations or `TK` inside labels would put text the graph does not need into the JSON, and the style clause names an input the tool does not have.
   - (c) The Navigator rewords the module skeleton to exempt non-draft tools explicitly. Only the Navigator can change module text.
   - (b) and (c): not chosen; not applicable.
3. **The kinds of `entityIds` (C10). Settled by the Navigator: option (a) (N3).**
   - (a) No `x-scriba-entity-kinds`: any entity kind is accepted. **Chosen (N3).** Plan lines it needs: the `entityIds` block of step 2 with no `x-scriba-entity-kinds`, and step 10 (no entity-kinds hint). Reason: unit line 16 names no kinds; the story view is fiction-only (module line 98, "A nonfiction story graph" is out of scope) and the fiction kinds are not shipped (U19); GNP-01 line 18 makes a kind that is not shipped a content-check error; a hint is optional (`executor.service.ts` line 140; `lint.ts` lines 420 to 496). Module line 66, reworded by the Navigator at `2e8eed0`, asks for the hint only "where the input means a definite set of kinds"; `entityIds` means entities and sources of any kind, so (a) agrees with the module.
   - (b) A hint with the shipped kinds now (`source`, `claim`, `concept`, `person`, perhaps `style-profile`). Against: it refuses `character`, `place` and `world-rule`, the kinds a story graph needs, and no unit (GNP-13 included) is set to add them to `propose_graph` later; that would need a unit change.
   - (c) A hint with the fiction kinds. Not possible now: GNP-01 line 18 refuses kinds that are not shipped.
   - (b) and (c): not chosen; not applicable.
4. **The catalogue lists `propose_graph` itself (G1). Settled by the Navigator: option (a) (N4).**
   - (a) No filter: the catalogue lists every valid, enabled tool, `propose_graph` included, and a recipe may use it. **Chosen (N4).** Plan lines it needs: no filter and no prompt line in step 2; the recipe fixture of C5 uses a `propose_graph` tool node. Reason: the executor has no filter (`executor.service.ts` lines 161 to 168) and N1 forbids an executor change; a graph-output tool may feed an output node (GRR-06 line 21; only `claims` and `check` are not writable, GRR-06 line 22, GRR-03 line 20).
   - (b) A prompt line: "Do not use propose_graph in a recipe." Prompt-only; no code change. Against: no unit or module decision forbids it, so it adds a rule nothing needs.
   - (c) A catalogue filter for graph-output tools. Against: changes TRG-12 (done) and N1 line 5.
   - (b) and (c): not chosen; not applicable.
5. **Tool settings are not in the catalogue (G2). Settled by the Navigator: option (a) (N5).**
   - (a) The prompt asks for tool nodes with no `params`; the author sets each tool's settings on the canvas. **Chosen (N5).** Plan lines it needs: the tool-node line of step 2's prompt; the recipe fixture of C5 has no tool `params`. Reason: the catalogue gives port keys and types only (unit line 20; `template.ts` lines 557 to 568; `plans/TRG-08.md` C13), so the model cannot know setting keys; settings are edited in the node body (GRR-11 line 18); a missing required setting is a recipe error at run, not a graph-schema error (GRR-03 line 20), and AGL-13 checks a proposal against the graph file schema only (line 21).
   - (b) Let the model write `params` it guesses. Against: invented keys, which the run then refuses.
   - (c) Add settings to the catalogue. Against: changes unit line 20 and TRG-08/TRG-12 (done), and N1 line 5.
   - (b) and (c): not chosen; not applicable.

## 7. Facts checked and facts assumed

### Facts checked (read; nothing was run)

Unit and module:
- `units/GNP-04-propose-graph.md` lines 1 to 25. One change note, on line 16 (`includeCatalogue`, N1).
- `units/README.md` lines 34 to 65 and 128 to 138.
- `modules/genre-packs.md`: dependency graph, parallelism, pack layout, tool-spec content rules (skeleton, entity-input hint; line 45, descriptions; line 66 as reworded at `2e8eed0`), testing principles, out of scope (line 98).

Plans:
- `plans/GNP-02.md` (D1 to D18; section 5), `plans/TRG-08.md` (C5, C9, C12, C13), `plans/GRR-01.md` (line 246), `plans/GNP-01.md` (open point 3), `plans/GNP-06.md` (D14), `plans/AGL-09.md` (section 2; line 137).
- `plans/DECISIONS.md`: searched by `GNP-04` only (line 4950, about GNP-06; lines 5137 to 5142, the Navigator decision N1; from line 5144, the Navigator decisions N2 to N6).
- Plan statuses at `2e8eed0`: this plan and `plans/GNP-07.md` are `draft`; no `planned` plan (AGL-09, PST-15, SAU-13, TRG-07 are `done`). `plans/GNP-07.md` read for its overlap with this plan (C10, step 9, section 5). No plan file for GNP-05, GRR-03, GRR-06, GRR-11, GNP-13. No `unit/GNP-04` branch.

Code and contracts on main (`adc57b8`; `git diff --stat e8f2227 2e8eed0 -- packages apps e2e` is empty; `git diff adc57b8 e8f2227` is empty for `packages/packs`, `apps/api/test/packs`, `apps/api/src/modules/tool-registry`, `e2e/fixtures/mock-openai/scenarios`, `packages/contracts/src/graph-runner`):
- For N1 (at `e8f2227`): `lint.ts` lines 59 to 77 (`description` annotation; `boolean` type) and 555 to 557 (`toggle` needs a boolean); `template.ts` lines 66 to 69 and 511 (`#if` counts as a use), 542 to 555 (`isTruthy`); `emit.ts` lines 81 to 90 (a property's `description` goes into the function schema); `packages/contracts/src/tool-registry/call.ts` line 7 (arguments are a record of unknown values, so a boolean passes).
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
- A2. The `view` property with `x-scriba-control: select` and `enum`, the `includeCatalogue` boolean with `description` and `x-scriba-control: toggle`, and the `files` array with no hint, pass lint. Step 10 checks it.
- A8. `{{toolCatalog}}` renders inside `{{#if includeCatalogue}}`, and a `false` value leaves the block out. Step 7 checks it (the story golden has no catalogue).
- A3. `prettier --check` accepts the scenario JSON and the golden files. Step 9 checks it.
- A4. The mock returns the stream deltas as the reply text, and `finish` returns them unparsed for `graph`. Step 7 checks it.
- A5. Each intent sentence appears once in its own rendered prompt and not in the other. Step 8 and the mock matcher check it.
- A6. `toolArgumentsSchema` accepts the `files` array of strings and the `view` string. Step 6 checks it through the valid call.
- A7. The catalogue has only `propose_graph` when the goldens are written. Step 0 and step 7 check it.

### Inconsistencies in the unit files (not changed, not in the way)

- **I1 (closed).** Unit line 20 and the subset: resolved by the Navigator (N1) with the unit change on line 16.
- **I2.** Unit line 9 lists `"Agent loop graph proposal"` in `unblocks`; that entry names no unit, and AGL-13 is not blocked by GNP-04 (`units/AGL-13-output-routing.md` line 7). It does not stop any step of this plan, so the reviser does not change it (prompt.md: do not change a part that is not in the way). Left for the orchestrator or the Navigator.
- **I3.** Unit line 19 omits the input-node `params` and the port keys; the prompt gives them (U4, U4b). Nothing blocks.

## 8. Changes of other files

- `units/GNP-04-propose-graph.md` line 16 gains `includeCatalogue` (N1, a Navigator decision, not a reviser action), committed with this plan. Old text: "- Inputs: `intent` [text port, required], `view` (`story | recipe`, string enum, **required**), `entityIds` [entity port, list], `files` (array of project-relative path strings, param)." The line carries a note that points to `plans/DECISIONS.md`.
- No other unit, no module file and no other plan changes. No downstream unit is changed (GNP-05 needs no change; "Agent loop graph proposal" names no unit id).

## 9. Review parts

One part (a small plan).

- **Part 1: the tool, its fixtures, goldens and tests.** Steps 0 to 13, with tests T1 and T2 of section 4.
