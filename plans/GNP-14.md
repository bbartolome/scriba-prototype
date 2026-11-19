---
id: GNP-14
status: draft
---
# GNP-14 plan — character_builder and world_builder entity tools, golden cases and eval cases

Batch: [GNP-14] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `27ccbae` (HEAD when read; the working tree was clean). The unit file was read in full (lines 1 to 21). It has no change note: the file has 21 lines, and none of them records a move, a loosening, a rewording or a removal. `plans/DECISIONS.md` has no GNP-14 entry; its only hit for "GNP-14" is line 5155, an orchestrator check of unit line 15 inside the GNP-04 entry.

The planner changed no file except this one, committed nothing, and ran no build, test, lint or npm command. Two points are open (section 8), so the status stays `draft`.

## 1. Decisions this plan obeys

Labels: **U** = the unit; **M** = the module `modules/genre-packs.md`; **D** = a settled decision of `plans/DECISIONS.md` or of another plan; **C** = a smaller choice made here (the simplest option, recorded, for a name, a file layout, a test structure or a field shape that no source settles).

- **U1 Tools and output.** Two tool specs, `packages/packs/fiction/tools/character_builder.yaml` and `packages/packs/fiction/tools/world_builder.yaml`, with output `entity` and `enabled: true`. Source: unit lines 15 and 16.
- **U2 character_builder inputs.** `seed` (text port, required), `role` (param), `coreIdea` (text port, required), `entityIds` (entity port list). No `styleProfile` and no `length`. Source: unit line 15.
- **U3 world_builder inputs.** `ruleIds` (entity port list, kinds `place` and `world-rule`, required) and `coreIdea` (text port). The unit does not mark `coreIdea` as required, so it is optional here. Source: unit line 16. M1 below explains why the common-input row of the module does not override this.
- **U4 Descriptions.** The two descriptions of the unit, verbatim (unit lines 15 and 16). Each must start with a verb of the content check's list and be under 120 characters: `DESCRIPTION_LIMIT` is 120 (`packages/packs/test/checks.ts` line 44), and `draft` (line 50) and `expand` (line 51) are in `VERBS` (line 48).
- **U5 Prompt content.** character_builder returns a Markdown entity file with the front matter `name`, `want`, `need`, `flaw`, `voice` and `relationships` (to supplied characters only) and a backstory body. world_builder returns the expanded place or rule as an entity file and puts any contradictions with the other supplied rules under a fixed heading `Contradictions` in the body. Source: unit lines 15 and 16.
- **U6 Criteria.** The three criteria, copied word for word in section 5. Source: unit lines 19 to 21.
- **M1 Common inputs apply to draft tools.** The common-input table (module lines 56 to 64) is for draft-producing narrative tools. The content check that compares common inputs looks at `draft` tools only (`packages/packs/test/checks.ts` lines 96 and 97). For tools whose output is `entity`, the module says that they "take only the subset that makes sense (listed per unit)" (module line 66). So neither tool carries the five common inputs.
- **M2 Entity-kind hints.** An entity input carries `x-scriba-type: entity`, and carries `x-scriba-entity-kinds` only "where the input means a definite set of kinds" (module line 66, as reworded at commit `2e8eed0`; `plans/DECISIONS.md` entry of 2026-11-16 "GNP-04, GNP-07 — Navigator decisions", line 5144). So `ruleIds` takes `[place, world-rule]`, and `entityIds` of character_builder takes no hint, as `plans/GNP-07.md` C1 and N2 settled for the common `entityIds` (lines 24 and 23).
- **M3 Output kinds.** `entity` is one of the five kinds (module line 52). The executor sends the fixed system message of the kind, `OUTPUT_SYSTEM_MESSAGES.entity` (`apps/api/src/modules/tool-registry/executor.service.ts` line 34): one Markdown file, YAML front matter, then the body. So each prompt names the front matter keys and the body, and no format rule beyond that.
- **M4 Prompt skeleton.** Each template follows the skeleton of module lines 46 to 50: a role line; the material, each entity rendered with its ID (`{{entity this}}`); the steps; the constraints. Constraint 4 is open (section 8, point 1). The style-profile and length clauses are left out in either option, because neither tool has a `styleProfile` or a `length` input (unit line 15 for character_builder; unit line 16 for world_builder).
- **M5 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if}}` and `{{entity id}}` (module line 46). Neither prompt uses `{{toolCatalog}}`.
- **M6 Entity fields.** The keys of the front matter follow the fiction entity types of GNP-13 (module lines 78 to 80): `character` (`name`, `want`, `need`, `flaw`, `voice`, `relationships` as a list of `{character, note}`), `place` (`name`, `rules`) and `world-rule` (`statement`, `appliesTo`). The kinds `place` and `world-rule` are shipped by `packages/packs/fiction/entity-types/place.yaml` and `world-rule.yaml`, and `character` by `character.yaml` (GNP-13, status `done`).
- **M7 Golden convention.** One scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json` (module line 87; `plans/GNP-02.md` D5); fixtures and goldens under `packages/packs/test/golden/<tool>/` (D6); the helper `goldenCase` of `apps/api/test/packs/golden.kit.ts` (D10); the update flag `--update-goldens` (D9). A golden changes only in the PR of the prompt edit (module line 87; unit line 20).
- **M8 Catalogue.** `{{toolCatalog}}` renders every valid and enabled tool of the packs root (`plans/GNP-02.md` D18). So this PR changes the catalogue of the recipe golden of `propose_graph` (`plans/GNP-04.md` N1 and C9; `plans/GNP-07.md` G3 and C10). The story golden does not render the catalogue (`apps/api/test/packs/propose-graph.test.ts` line 45 onward asserts that the story prompt does not contain the catalogue heading).
- **M9 Testing principles.** Behaviour, not wording, except the golden snapshots (module line 85). Content checks run through the pack-lint library (module line 86). The unit's criterion that the world_builder golden includes the Contradictions instruction is a check of the golden's rendered prompt, as the unit names it (unit line 20).
- **M10 Eval cases.** Manual eval cases per tool go into the Agent loop's manual eval script (module line 90). Cases are data files, one per case (`units/AGL-25-manual-eval-script.md`, Decisions: "Cases are data files"). Nothing runs them in CI (module line 90; `units/README.md` line 138).
- **D1 Blockers.** GNP-02 is `status: done` (`plans/GNP-02.md` line 9), and GNP-13 is `status: done` (`plans/GNP-13.md` line 4; its commit `6c3b363` is on main).
- **D2 Entity-kind checks.** An undeclared kind in `x-scriba-entity-kinds` is a lint warning (`apps/api/src/modules/tool-registry/lint.ts` line 496). The content-check suite promotes that warning to an error (`packages/packs/test/checks.ts` lines 86 to 95), and `packages/packs/test/content-checks.test.ts` line 81 tests it. So a kind that no built-in entity type ships fails the suite.
- **D3 Template check.** A required input that the prompt does not use is a lint warning (`lint.ts` line 817). So each prompt names every required input.
- **D4 Loader.** A tool's `name` must equal its file stem (`apps/api/src/modules/tool-registry/packs.ts` line 156).
- **C1 `role`.** A free-text string, optional, with no port and no enum. The unit gives neither a type nor values. This follows GNP-07 C2 for `tone`.
- **C2 Textarea.** `seed` and `coreIdea` carry `x-scriba-control: textarea`, as GNP-07 C4 gives `coreIdea`.
- **C3 Names.** The tool names are the unit's. Fixture cases `keeper-seed` (character_builder) and `skerry-rules` (world_builder). Scenarios `pack-character_builder.json` and `pack-world_builder.json`. Test file `apps/api/test/packs/character-world-builder.test.ts`. Eval case ids `character-builder` and `world-builder`.
- **C4 `invalidWithout`.** `seed` for character_builder (a required input that only this tool has) and `ruleIds` for world_builder (its only required input).
- **C5 One test for criterion 2.** `goldenCase` returns a body for one `it` (`apps/api/test/packs/golden.kit.ts` lines 241 to 259). The one test of criterion 2 awaits the two bodies in turn, so each criterion has one test.
- **C6 Seam of criterion 1.** The existing test "the suite passes on the real packs" of `packages/packs/test/real-packs.test.ts` (line 9) is the test, as `plans/GNP-07.md` section 4 did for its criterion 1. A new test would only repeat it.
- **C7 Catalogue placement.** The catalogue is sorted by plain `[...names].sort()` (`apps/api/src/modules/tool-registry/catalog.service.ts` line 467; `plans/GNP-20.md` line 187). So `character_builder` comes before `cold_open`, and `world_builder` after `throughline_check`. `plans/GNP-20.md` line 148 says the same.
- **C8 Eval values.** `expect.reason` is `completed`, and `expect.tools` names the one tool of the case. The intents are plan choices. The sample and the citation value depend on section 8.

## 2. Facts checked and facts assumed

### Facts checked

Unit and module:
- `units/GNP-14-character-world-builder.md`: front matter lines 2 to 9 (`blocked_by: [GNP-02, GNP-13]` line 7; `parallel_with: [GNP-12, GNP-15, GNP-16, GNP-17, GNP-18]` line 8; `unblocks: [GNP-19]` line 9); Specs lines 15 and 16; criteria lines 19 to 21.
- Inverse rule: `units/GNP-19-fiction-gate.md` line 7 names GNP-14 in `blocked_by`, and no other unit names GNP-14 in `blocked_by`. Symmetry: GNP-12 (line 8), GNP-15 (line 8), GNP-16 (line 8), GNP-17 (line 8) and GNP-18 (line 8) each list GNP-14 in `parallel_with`.
- `modules/genre-packs.md`: layout line 37; spec fields line 43; skeleton lines 46 to 50; `sourcesUsed` line 51; output kinds line 52; templates line 54; common inputs lines 56 to 64; entity inputs line 66; entity envelope line 69; fiction rows lines 78 to 80; testing lines 85 to 90.
- GNP-19 criterion (line 20): "All five tools pass the validation suite; every entity input names an existing entity type."

Blockers and their files on main:
- `apps/api/test/packs/golden.kit.ts` exists. `PACKS_ROOT` line 29, `GOLDEN_ROOT` line 38, `UPDATE_GOLDENS` line 40 (read from `SCRIBA_UPDATE_GOLDENS`), `runGoldenCase` line 126 (expects status 200 at line 177 and one recorded request at line 183), `goldenCase` lines 241 to 259 (asserts the golden status, the kind, the exact `sourcesUsed`, status 422, code `TOOL_ARGS_INVALID`, a message containing `invalidWithout`, and one model call).
- `packages/packs/fiction/entity-types/` holds `character.yaml`, `place.yaml` and `world-rule.yaml` (commit `6c3b363`).

Packs and tests on main:
- `packages/packs/fiction/tools/` holds only `.gitkeep` (0 bytes).
- `packages/packs/core/tools/` holds `propose_graph.yaml` and `throughline_check.yaml`. `packages/packs/nonfiction/tools/` holds `cold_open.yaml`, `mystery_question.yaml`, `myth_buster.yaml` and `numbers_to_people.yaml`.
- The recipe golden `packages/packs/test/golden/propose_graph/recipe.golden.json` is the only golden that contains catalogue lines (`Output: ` is found only there). Parsed with `node`, its `messages[1].content` holds six catalogue lines in this order: `cold_open`, `mystery_question`, `myth_buster`, `numbers_to_people`, `propose_graph`, `throughline_check`. The story golden has none.
- `packages/packs/test/real-packs.test.ts` line 9: the test "the suite passes on the real packs" asserts no error from `lintPacks` and an empty `contentChecks` on `packages/packs`.
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` line 35; `DESCRIPTION_LIMIT` line 44; `VERBS` line 48 (`draft` line 50, `expand` line 51); `contentChecks` line 83; the drafts filter lines 96 and 97; the promotion of `entity-kind` lines 86 to 95.
- `apps/api/test/packs/cold-open.test.ts` (the precedent: one `it` with a 60000 ms timeout, `renderedPrompt` lines 4 to 21, the test lines 23 to 45).
- `apps/api/test/packs/propose-graph.test.ts`: the test "AC 2: the story and recipe goldens match..." at line 45, with timeout 120000 at line 75.
- `apps/api/test/packs/` holds `cold-open.test.ts`, `fiction-entity-types.test.ts`, `golden.kit.ts`, `propose-graph.test.ts` and the others. No `character-world-builder.test.ts` exists.

Executor and lint:
- `executor.service.ts`: `OUTPUT_SYSTEM_MESSAGES` lines 31 to 40 (`entity` at line 34); the messages of one call at lines 87 to 90; `finish` lines 218 to 225 (only `graph` output is changed).
- `lint.ts`: the `entity-kind` warning at line 496; `template-unused` at line 817.
- `catalog.service.ts`: `offeredOrigins` lines 64 to 72 (core, user and the genre pack only); the sort at line 467.

Eval and samples:
- `scripts/eval-agent/cases/` holds six files: `cold-open.json`, `mystery-question.json`, `myth-buster.json`, `numbers-to-people.json`, `summarize-outline.json` and `throughline-check.json`.
- `scripts/eval-cases.test.mjs` holds two tests, at lines 34 and 65 (the cold-open and the mystery-question cases). Its first test reads every case file and checks the keys and values.
- `scripts/eval-agent/run.mjs`: `CASE_KEYS` line 36; `sample` must be a non-empty string (line 108); the runner starts a project from the sample id (line 436).
- `examples/samples.yaml` holds one entry, `nonfiction`.
- `units/GNP-18-fiction-sample.md` line 7 (`blocked_by` includes GNP-16) and line 15 (the sample adds an entry to `examples/samples.yaml`). The unit does not name the entry's id.
- `plans/QUEUE.md` line 18 lists GNP-14 with its blockers done (GNP-02 and GNP-13).

Other plans and status:
- `grep -l '^status: *(draft|planned)' plans/*.md` gives `plans/CEX-07.md`, `plans/CEX-17.md` and `plans/GRR-15.md` (section 7).
- `plans/GNP-14.md`, the two tool specs, the two fixtures, the two scenarios, `apps/api/test/packs/character-world-builder.test.ts` and the two eval cases do not exist on main.

### Facts assumed

- **A1.** Node 26 and npm 11 are on the PATH, as the other plans state. Step 1 checks it.
- **A2.** The update run writes goldens to the paths of the helper (`plans/GNP-02.md` D9; `plans/GNP-07.md` step 7 used it). Step 9 checks it.
- **A3.** The two new catalogue lines have this text (the format of the six lines on main, with ports in property order; `plans/GNP-07.md` section 5 gives the format): `- character_builder: Draft a character from a seed: want, need, flaw and voice. Output: entity. Inputs: seed (text, single, required); coreIdea (text, single, required); entityIds (entity, list, optional).` and `- world_builder: Expand a place or world rule and flag contradictions with the others. Output: entity. Inputs: ruleIds (entity, list, required); coreIdea (text, single, optional).` Step 11 reads the regenerated golden.
- **A4.** `{{#if role}}` and `{{#if coreIdea}}` leave out their text when the value is absent (`plans/GNP-07.md` A4). Step 9 reads the golden.
- **A5.** When no other fiction tool is on the base, the regenerated recipe golden differs from the base only by the two catalogue lines. Step 11 checks it, and stops if not.
- **A6.** Prettier accepts the YAML block scalars and the JSON files as written (`plans/GNP-07.md` A5). Step 14 checks it. The comparison of goldens is by value (`plans/GNP-02.md` D8).
- **A7.** The tool lint gives no finding for the two specs, given the textarea rule on strings, the entity hints on the array nodes, and the uses of the required inputs in the prompts (D2, D3, M2). Step 5 checks it.
- **A8.** The `apps/api` build type-checks its test files, so the new test file must type-check. Step 12 checks it.
- **A9.** The e2e workspace has a test command and a `tools-preview.e2e.ts` spec, as `plans/GNP-02.md` step 11 and `plans/GNP-07.md` step 14 use them. Steps 15 and 16 check them.
- **A10.** No test counts the built-in tools of the real packs. The grep of `apps/api/test`, `e2e/specs` and `scripts` for the tool names (`propose_graph`, `cold_open`, `throughline_check`, `mystery_question`) found only fixture-based tests, `toContain` checks, and the propose-graph test. Steps 15 and 16 check the rest.

Not verified: no build, test or lint has run. Steps 1 to 17 check the facts above.

## 3. Files to change

Only the paths below change, with the content of the two tool specs, the fixtures and the scenarios given in this section. `plans/GNP-14.md` is written by the orchestrator, not by the implementer.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/fiction/tools/character_builder.yaml` | new | the tool spec (step 2) |
| `packages/packs/fiction/tools/world_builder.yaml` | new | the tool spec (step 3) |
| `packages/packs/fiction/tools/.gitkeep` | delete (`git rm`, step 4, only if present) | the folder holds files now |
| `packages/packs/test/golden/character_builder/keeper-seed.fixture.json` | new | the fixture (step 6) |
| `packages/packs/test/golden/character_builder/keeper-seed.golden.json` | created by the update run (step 9) | the golden request |
| `packages/packs/test/golden/world_builder/skerry-rules.fixture.json` | new | the fixture (step 6) |
| `packages/packs/test/golden/world_builder/skerry-rules.golden.json` | created by the update run (step 9) | the golden request |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by the update run (step 11) | the catalogue gains the two lines |
| `e2e/fixtures/mock-openai/scenarios/pack-character_builder.json` | new | the scripted reply (step 7) |
| `e2e/fixtures/mock-openai/scenarios/pack-world_builder.json` | new | the scripted reply (step 7) |
| `apps/api/test/packs/character-world-builder.test.ts` | new | the test of criterion 2 (step 8) |
| `scripts/eval-agent/cases/character-builder.json` | new | the eval case (step 13) |
| `scripts/eval-agent/cases/world-builder.json` | new | the eval case (step 13) |
| `scripts/eval-cases.test.mjs` | edit: one `test(...)` added at the end | the test of criterion 3 (step 13) |

Not changed: `packages/packs/fiction/entity-types/**` (GNP-13); `packages/packs/core/**`; `packages/packs/nonfiction/**`; `packages/packs/test/*.ts` and `packages/packs/test/README.md` (GNP-01 and GNP-02); `packages/packs/test/golden/propose_graph/story.*` and its fixture; `packages/packs/test/golden/golden_probe/**`; `apps/api/src/**`; `apps/api/test/packs/golden.kit.ts`; `apps/api/vitest.config.mts`; `packages/contracts/**`; `e2e/fixtures/mock-openai/server.mjs`; `examples/**` (GNP-18 owns `examples/samples.yaml`); `scripts/eval-agent/run.mjs`, its `README.md` and `run.test.mjs`; `package.json`; `package-lock.json`; `.prettierignore`; `units/**`; `modules/**`; `plans/**` (except `plans/GNP-14.md`, by the orchestrator).

### The tool spec `packages/packs/fiction/tools/character_builder.yaml`

Prompt lines marked OPEN POINT 1 are replaced by the lines chosen there (section 8) before the file is written. Nothing else in the file depends on that choice.

```yaml
schemaVersion: 1
name: character_builder
description: Draft a character from a seed: want, need, flaw and voice.
inputs:
  type: object
  properties:
    seed:
      type: string
      title: Seed
      x-scriba-type: text
      x-scriba-port: true
      x-scriba-control: textarea
    role:
      type: string
      title: Role
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
  required: [seed, coreIdea]
output: entity
enabled: true
prompt: |
  You write a character for a fiction story: one Markdown file with the character's front matter and a backstory.

  Seed: {{seed}}
  {{#if role}}Role: {{role}}
  {{/if}}Core idea: {{coreIdea}}

  Material:
  {{#each entityIds}}
  {{entity this}}
  {{/each}}

  Steps:
  1. Name the character, and give the want, the need and the flaw, so that together they show the core idea.
  2. Describe the voice in notes: how the character speaks.
  3. List relationships only with the characters in the material, each with a short note.
  4. Write the backstory in the body, from the seed and the material.

  Return the file: front matter with the keys name, want, need, flaw, voice and relationships (a list of character and note), then the backstory.

  Constraints:
  - Use only the material above.
  OPEN POINT 1: the citation and TK lines, or none.
```

Then `npx prettier --write` on the file. `prettier` must not change the prompt text; if it does, keep its form and record the change.

### The tool spec `packages/packs/fiction/tools/world_builder.yaml`

```yaml
schemaVersion: 1
name: world_builder
description: Expand a place or world rule and flag contradictions with the others.
inputs:
  type: object
  properties:
    ruleIds:
      type: array
      title: Places and rules
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [place, world-rule]
    coreIdea:
      type: string
      title: Core idea
      x-scriba-type: text
      x-scriba-port: true
      x-scriba-control: textarea
  required: [ruleIds]
output: entity
enabled: true
prompt: |
  You expand one place or world rule of a fiction story, and you check it against the other rules supplied.

  {{#if coreIdea}}Core idea: {{coreIdea}}
  {{/if}}Material:
  {{#each ruleIds}}
  {{entity this}}
  {{/each}}

  Steps:
  1. Name the place or rule, and state it in one sentence.
  2. Expand it: for a place, its description; for a rule, its consequences and exceptions.
  3. Check it against each other rule in the material. Under a heading named Contradictions in the body, list each contradiction and the rule it conflicts with.

  Return the file: front matter with the keys of its kind (for a place, name and rules; for a world rule, statement and appliesTo), then the body.

  Constraints:
  - Use only the material above.
  OPEN POINT 1: the citation and TK lines, or none.
```

Then `npx prettier --write` on the file.

### The fixtures

`packages/packs/test/golden/character_builder/keeper-seed.fixture.json`:

```json
{
  "arguments": {
    "seed": "A keeper who has never once left the rock, and who counts the boats that do not come.",
    "role": "keeper",
    "coreIdea": "Duty can outlast the reasons for it.",
    "entityIds": ["tomas-reyes", "skerry-light"]
  },
  "entities": [
    {
      "ref": "tomas-reyes",
      "type": "character",
      "path": "entities/tomas-reyes.md",
      "content": "Tomas Reyes keeps the lamp and trusts the supply boat to come on time."
    },
    {
      "ref": "skerry-light",
      "type": "place",
      "path": "entities/skerry-light.md",
      "content": "Skerry Light is a lamp on a bare rock, reached only on a spring tide."
    }
  ]
}
```

`packages/packs/test/golden/world_builder/skerry-rules.fixture.json`:

```json
{
  "arguments": {
    "ruleIds": ["skerry-light", "spring-tide-only"],
    "coreIdea": "The island keeps its own calendar."
  },
  "entities": [
    {
      "ref": "skerry-light",
      "type": "place",
      "path": "entities/skerry-light.md",
      "content": "Skerry Light is a lamp on a bare rock, reached only on a spring tide."
    },
    {
      "ref": "spring-tide-only",
      "type": "world-rule",
      "path": "entities/spring-tide-only.md",
      "content": "The supply boat comes only on a spring tide."
    }
  ]
}
```

The text is original, and names no real person. The expected `sourcesUsed` are the entity refs of the arguments in property order: `["tomas-reyes", "skerry-light"]` for character_builder, and `["skerry-light", "spring-tide-only"]` for world_builder.

### The scenarios

`e2e/fixtures/mock-openai/scenarios/pack-character_builder.json`:

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["---\nname: Tomas Reyes\n---\n\nTomas Reyes keeps the lamp."]
      }
    }
  ]
}
```

`e2e/fixtures/mock-openai/scenarios/pack-world_builder.json`:

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["---\ntype: world-rule\nstatement: The supply boat comes only on a spring tide.\n---\n\nContradictions\n\nNone."]
      }
    }
  ]
}
```

### The eval cases

`scripts/eval-agent/cases/character-builder.json`:

```json
{
  "sample": "<the fiction sample id, OPEN POINT 2>",
  "intent": "Draft a new character for my story from the seed in my notes.",
  "expect": {
    "reason": "completed",
    "tools": ["character_builder"],
    "citations": "<any or present, OPEN POINT 1>"
  }
}
```

`scripts/eval-agent/cases/world-builder.json`:

```json
{
  "sample": "<the fiction sample id, OPEN POINT 2>",
  "intent": "Expand the world rule I have written for my story and flag any contradictions with my other rules.",
  "expect": {
    "reason": "completed",
    "tools": ["world_builder"],
    "citations": "<any or present, OPEN POINT 1>"
  }
}
```

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`, on branch `unit/GNP-14` cut from `main` by the orchestrator (as for GNP-13: the branch and the worktree are made before the implementer starts; no `-b` when the branch exists). Record `node -v` and `npm -v` beside each result. Do not push. Do not use `git add -A` or `git commit -a`.

0. **Base.** `git rev-parse --short HEAD` prints `27ccbae` or a later commit. `git diff --quiet 27ccbae HEAD -- packages/packs apps/api/test/packs scripts e2e/fixtures/mock-openai/scenarios` exits 0; if not, re-read the changed files before editing. `git status --short` prints nothing. `test ! -e packages/packs/fiction/tools/character_builder.yaml` and the same for `world_builder.yaml` exit 0. `git ls-files packages/packs/test/golden/character_builder packages/packs/test/golden/world_builder apps/api/test/packs/character-world-builder.test.ts scripts/eval-agent/cases/character-builder.json` prints nothing.
1. **Runtime and baseline.** `node -v` prints `v26.x` and `npm -v` prints `11.x` (A1). Run `npm ci` if the worktree has no `node_modules/`. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs && (cd apps/api && npx vitest run test/packs)` exits 0 on the unchanged tree.
2. **character_builder spec (U1 to U5, M2 to M6, C1, C2).** Create `packages/packs/fiction/tools/character_builder.yaml` with the text of section 3. Leave the OPEN POINT 1 line as the placeholder until section 8, point 1 is decided.
3. **world_builder spec (U1 to U5, M2 to M6, C2).** Create `packages/packs/fiction/tools/world_builder.yaml` with the text of section 3, under the same rule for the OPEN POINT 1 line.
4. **Folder and format.** `git rm -- packages/packs/fiction/tools/.gitkeep` if the file exists (it does on main; skip the step when it is gone). Then `npx prettier --write packages/packs/fiction/tools/character_builder.yaml packages/packs/fiction/tools/world_builder.yaml`.
5. **Pack gate (criterion 1, D2, D3, A7).** `npm run lint:packs` exits 0 with no finding for the two files. Then `npm test -w @bbartolome/scriba-packs` exits 0, with the test "the suite passes on the real packs" passing. Note the output: the entity-kind rule must show no finding for `place` or `world-rule`.
6. **Fixtures (C3, U5).** Create `packages/packs/test/golden/character_builder/keeper-seed.fixture.json` and `packages/packs/test/golden/world_builder/skerry-rules.fixture.json` with the text of section 3. Then `npx prettier --write` on both.
7. **Scenarios (M7).** Create `e2e/fixtures/mock-openai/scenarios/pack-character_builder.json` and `pack-world_builder.json` with the text of section 3. Then `npx prettier --write` on both.
8. **Golden test (criterion 2, C4, C5).** Create `apps/api/test/packs/character-world-builder.test.ts`. It imports `expect` and `it` from `vitest` and `goldenCase` and `type GoldenRunResult` from `./golden.kit`. It copies the `renderedPrompt` helper of `apps/api/test/packs/cold-open.test.ts` (lines 4 to 21). It builds two bodies with `goldenCase`: `character` (tool `character_builder`, name `keeper-seed`, `expect` `{ kind: 'entity', sourcesUsed: ['tomas-reyes', 'skerry-light'] }`, `invalidWithout: 'seed'`, and a `check` that asserts that the rendered prompt contains `tomas-reyes` and `skerry-light`) and `world` (tool `world_builder`, name `skerry-rules`, `expect` `{ kind: 'entity', sourcesUsed: ['skerry-light', 'spring-tide-only'] }`, `invalidWithout: 'ruleIds'`, and a `check` that asserts that the rendered prompt contains `skerry-light`, `spring-tide-only` and `Contradictions`). Then one `it` with the name of section 5, whose body awaits `character()` and then `world()`, with timeout 120000. The file has no `any` and does not contain the text `examples/`.
9. **Update run (A2, A4, M7).** `cd apps/api && npx vitest run -- --update-goldens test/packs/character-world-builder.test.ts` exits 0 and creates `packages/packs/test/golden/character_builder/keeper-seed.golden.json` and `packages/packs/test/golden/world_builder/skerry-rules.golden.json`. Read both. In each, `messages[0].content` equals the entity system message (`OUTPUT_SYSTEM_MESSAGES.entity`, executor.service.ts line 34). In the character golden, `messages[1].content` contains `Seed: A keeper who has never once left the rock`, `Role: keeper`, `Core idea: Duty can outlast the reasons for it.` and both IDs. In the world golden, it contains `Core idea: The island keeps its own calendar.` and both IDs, and the word `Contradictions`.
10. **Compare run and format (M7).** `cd apps/api && npx vitest run test/packs/character-world-builder.test.ts` exits 0 with one test passed, and both goldens are `match` (the test asserts it). Then `npx prettier --write packages/packs/test/golden/character_builder packages/packs/test/golden/world_builder`, and run step 10 again: it still passes, because the comparison is by value.
11. **Catalogue of the propose_graph recipe golden (M8, C7, A3, A5).** `cd apps/api && npx vitest run -- --update-goldens test/packs/propose-graph.test.ts` exits 0. Then `git diff --quiet -- packages/packs/test/golden/propose_graph/story.golden.json` exits 0, and `git diff --name-only -- packages/packs/test/golden/propose_graph` lists only `recipe.golden.json`. Parse the base and the working copy of the recipe golden as JSON (`git show HEAD:<path>` through `child_process` in `node -e`, without writing a file). `messages[0]` is equal in both. In `messages[1].content`, the two strings differ by exactly two inserted lines: `- character_builder: ...` before the `- cold_open:` line, and `- world_builder: ...` after the `- throughline_check:` line, with the text of A3. Everything else is equal. If anything else differs, stop and report it. Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0.
12. **API build and lint (A8).** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0. The build type-checks the new test file.
13. **Eval data and its test (criterion 3, M10, C8, section 8 points 1 and 2).** Create `scripts/eval-agent/cases/character-builder.json` and `scripts/eval-agent/cases/world-builder.json` with the text of section 3, with the placeholders replaced by the values of section 8. Then add the test of section 5 to the end of `scripts/eval-cases.test.mjs`, after the mystery-question test, with the same helper `loadCases()`. Then `npx prettier --write` on the two JSON files and on `scripts/eval-cases.test.mjs`, and `node --test scripts/eval-cases.test.mjs` exits 0 with three tests passed.
14. **Format check (A6).** `npx prettier --check packages/packs/fiction/tools packages/packs/test/golden apps/api/test/packs scripts/eval-agent/cases scripts/eval-cases.test.mjs e2e/fixtures/mock-openai/scenarios` exits 0. If a golden fails this check, stop and report it; the fix is a decision for the Navigator, not for this unit.
15. **Root gates and e2e mock (A9, A10).** From the root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock still loads the new scenario files.
16. **Tools preview in the running app (A9).** `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts` passes, as `plans/GNP-07.md` step 14 expects. If the browser cannot run here, record it as not run.
17. **Commit.** `git add --` the paths of section 3 by name (the deletion of step 4 is already staged). `git diff --cached --stat` lists exactly those paths and the deletion, and no `plans/` or `units/` file. Commit with `feat(GNP-14): character_builder and world_builder entity tools with golden and eval cases`. Do not push.
18. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 5 holds.

## 5. Acceptance criteria and tests

The criteria text is copied from `units/GNP-14-character-world-builder.md` lines 19 to 21. Each criterion has exactly one test. No other test is added.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "Both pass the validation suite; every entity input names an existing entity type." (19) | `packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs" (existing; C6) | `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (step 5) | Both exit 0. The test asserts no error from `lintPacks` and an empty `contentChecks` on `packages/packs`. The entity-kind promotion of D2 makes an unknown kind in `x-scriba-entity-kinds` a finding, so each kind of the two tools (`place`, `world-rule`) must be shipped. The tools' presence is shown by criterion 2, where each execute returns status 200 on `PACKS_ROOT` (`golden.kit.ts` line 177). |
| "Golden tests for both (rendered prompt with entities and IDs; output kind `entity`; `sourcesUsed`); world_builder's golden includes the Contradictions instruction." (20) | `apps/api/test/packs/character-world-builder.test.ts`, "AC 2: the character_builder and world_builder golden cases match, their prompts hold each entity with its ID, each output is an entity with the expected sourcesUsed, and the world_builder prompt holds the Contradictions instruction" | `cd apps/api && npx vitest run test/packs/character-world-builder.test.ts` (steps 9 and 10) | One `it` with timeout 120000, whose body awaits the two `goldenCase` bodies (C5). For each tool: the golden is `match` (`written` in update mode); the kind is `entity`; `sourcesUsed` is exactly as given; the call without `invalidWithout` returns 422 with code `TOOL_ARGS_INVALID` and a message that names the field; one model call. The `check` of character_builder: the rendered user message contains `tomas-reyes` and `skerry-light`. The `check` of world_builder: it contains `skerry-light`, `spring-tide-only` and `Contradictions`. |
| "Manual eval cases added." (21) | `scripts/eval-cases.test.mjs`, "AC 3: the character-builder and world-builder eval cases are in the eval data and use the documented keys and values" | `node --test scripts/eval-cases.test.mjs` (step 13) | Both files exist in `scripts/eval-agent/cases/`. Each has a non-empty `intent`. `sample` is the fiction sample id that section 8, point 2 fixes. `expect.tools` is `["character_builder"]` and `["world_builder"]`. `expect.reason` is `completed`. `expect.citations` is one of `present`, `absent` and `any`, and is the value that section 8, point 1 selects. The first test of the file already checks the keys of every case. The manual run is not part of the criterion (`plans/GNP-07.md` C9). |

## 6. Downstream agreement

- **GNP-19 (fiction gate; `blocked_by` line 7 includes GNP-14).** Its criterion (line 20) "All five tools pass the validation suite; every entity input names an existing entity type" needs the two tools of this unit, enabled, with output `entity`, and their goldens. It runs the same check as criterion 1 here. This plan gives it nothing else. Agrees.
- **GNP-14 `unblocks: [GNP-19]`** (line 9) is the exact inverse of GNP-19's `blocked_by` (section 2). Agrees.
- **GNP-02 (done).** Its section 5 (the GNP-14 to GNP-17 bullet) says that each fiction tool names its own required argument in `invalidWithout`, and that the golden helper takes any output kind. This plan does both (C4, step 8). Agrees.
- **GNP-13 (done).** Its section 5 (GNP-14 bullet) says that the tools use the names and fields of its three entity types, and that `relationships` takes `{character, note}`. This plan follows that. GNP-13 changes nothing here. Agrees.
- **GNP-04 and GNP-07 (done).** Their rule that a golden with the catalogue is regenerated in the PR that adds a tool (`plans/GNP-04.md` N1 and C9; `plans/GNP-07.md` G3 and C10) is followed in step 11. GNP-07's rebase rule is also followed: a later rebase onto a base that holds another fiction tool regenerates the golden again. Agrees.
- **GNP-20 (done).** Its catalogue order (`plans/GNP-20.md` line 148: `character_builder` sorts before `throughline_check`, `world_builder` after it; line 187: the plain sort) matches C7. GNP-20's step 8 checks that one line is inserted; step 11 of this plan checks two lines, one for each new tool. Agrees.
- **AGL-25 (done).** Its unit names "Genre packs per-tool manual eval cases" as an unblocked unit (`units/AGL-25-manual-eval-script.md` front matter, `unblocks`). Its case format is followed (step 13; `plans/GNP-07.md` section 3 step 6 uses the same keys). Agrees.
- **GNP-12, GNP-15, GNP-16, GNP-17 and GNP-18 (`parallel_with` line 8 of each names GNP-14).** None of them is blocked by this unit, so none depends on its files. GNP-18 supplies the fiction sample that the eval cases need (section 8, point 2). GNP-15, GNP-16 and GNP-17 are fiction tools that also add a catalogue line; their PRs regenerate the same golden (section 7). Agrees.
- **GNP-01 (done).** Its content checks read the new specs without a change (`packages/packs/test/checks.ts`). Agrees.

## 7. Other plans and units on the same files

Draft and planned plans (`grep -l '^status: *(draft|planned)' plans/*.md`): `plans/CEX-07.md`, `plans/CEX-17.md`, `plans/GRR-15.md`.

- **`plans/CEX-07.md`** changes `apps/api/src/modules/compile-export/markdown-text.ts`, `preflight-checks.ts`, `preflight.service.ts`, `preflight-links-phrases.ts` (new), and two test files of compile-export (its file table, lines 92 to 98). It mentions `packages/packs/core/entity-types/style-profile.yaml` and the nonfiction sample without changing them. None of its paths is a path of section 3. No overlap.
- **`plans/CEX-17.md`** changes the `apps/web` manuscript feature and `apps/web/src/app/app.routes.ts` (its file table, lines 136 to 142). None of its paths is a path of section 3. No overlap.
- **`plans/GRR-15.md`** changes the `apps/web` canvas feature and the e2e graph specs `graph-theme.e2e.ts`, `graph-touch.e2e.ts` and `graph-large.e2e.ts` (its file table, lines 88 to 94). It mentions `packages/packs/nonfiction/tools/cold_open.yaml` as existing (line 55) and changes nothing in it. No overlap.

Units without a plan that change the same files (their paths are not in any draft or planned plan):

- **GNP-15 (`scene_builder`), GNP-16 (`dialogue`), GNP-17 (`plot_manager`).** Each adds a fiction tool, so each adds a catalogue line to the recipe golden, each deletes `packages/packs/fiction/tools/.gitkeep` if it is still there, and each adds a scenario, a fixture, a golden, a test and eval cases in its own paths. Their catalogue lines also sort among the six on main and the two new ones (`plans/GNP-20.md` line 148 gives the order of `dialogue`, `plot_manager` and `scene_builder` against `throughline_check`). Their PRs regenerate the recipe golden at rebase.
- **GNP-18 (fiction sample).** It adds the entry to `examples/samples.yaml` (unit line 15). No file of this plan is in that path. Its id decides section 8, point 2.
- **GNP-19 (fiction gate).** It changes no file of this plan.

Done plans whose files this plan changes or extends:

- **`plans/GNP-04.md`** (the recipe golden and the catalogue of `propose_graph`). Its golden is regenerated by step 11.
- **`plans/GNP-07.md`** (`scripts/eval-cases.test.mjs`, `scripts/eval-agent/cases/`). This plan adds two case files and one test to the same file.
- **`plans/GNP-20.md`** (the catalogue order of the recipe golden). Step 11 keeps its order.
- **`plans/GNP-02.md`** (the helper, the scenario convention) and **`plans/GNP-13.md`** (the entity types). Used as they are.

Either order on main (the orchestrator merges the units separately):

- If this unit merges first, GNP-15, GNP-16 and GNP-17 regenerate the recipe golden on their own PRs, and their step 11 equivalent is the same as step 11 here.
- If one of them merges first, step 11 of this plan runs on the base that has its catalogue line, and the regenerated golden holds both sets of lines. The check of step 11 then compares the base with the working copy, so that only the lines of this PR are new.
- `packages/packs/fiction/tools/.gitkeep`: whichever PR merges first deletes it. Step 4 deletes it only if present, so the rebase is clean. Two deletions of one file do not conflict.
- `scripts/eval-cases.test.mjs`: a later eval test at the end of the file is a textual conflict. It is resolved by keeping both tests.

## 8. Open points

1. **The constraint lines of the entity prompts (M4).** Constraint 4 of the skeleton (module line 50) reads: "use only the material; cite each factual sentence with its entity or source ID in Pandoc citation form `[@id]`; where a needed fact is missing write `TK` with a short note ...; respect the style profile's tone, banned phrases and the requested length." The module states the skeleton for "every first-draft template" (module line 46). The unit gives no citation, `TK` or style instruction for either tool (unit lines 15 and 16). Both tools lack a `styleProfile` and a `length` input, so the style and length clauses are out in either option.
   - The precedent is `plans/GNP-04.md` open point 2, which the Navigator settled for `propose_graph` (a graph output) as option (a): keep "use only the material" and leave out the citation, `TK` and style-profile and length clauses (`plans/GNP-04.md` line 216; `plans/DECISIONS.md` entry of 2026-11-16 at line 5144). That decision covers a graph output only.
   - Option (a): as GNP-04, the constraints are `Use only the material above.` and nothing more. Option (b): keep `Use only the material above.` and also the citation and `TK` lines of module line 50, without the style and length clauses.
   - The choice decides the constraint lines of both YAML files (section 3), the golden prompts (step 9) and the `citations` value of both eval cases (`present` under (b), `any` under (a)). The check of criterion 2 does not depend on it.
   - The planner did not decide it.
2. **The sample of the two eval cases (criterion 3).** The runner starts a project from the sample id of the case (`scripts/eval-agent/run.mjs` line 436), and it must be a non-empty string (line 108). The fiction tools are offered only in fiction projects (`catalog.service.ts` lines 64 to 72), so each case needs a fiction sample. On main, `examples/samples.yaml` holds only `nonfiction`. GNP-18 adds the fiction sample (unit line 15), but it has no plan, it is blocked by GNP-16 (unit line 7), and its unit does not name the id.
   - Option (a): fix the id now (for example `fiction`, by analogy with `nonfiction`), write both cases with it, and have GNP-18 use that id. Criterion 3 can then merge before GNP-18, and the cases can run only after GNP-18 lands.
   - Option (b): write the two cases in a later PR, after GNP-18 merges. Criterion 3 is then not met by this PR.
   - The choice decides whether criterion 3 can merge before GNP-18. It needs the orchestrator's or the Navigator's decision.
   - The planner did not decide it.

## 9. Review parts

The plan has two parts. Each step of section 4 and each test of section 5 is in exactly one part.

- **Part 1 — the two tools, their golden test and the catalogue.** Steps 0 to 12. Tests: criterion 1 (`real-packs.test.ts`, "the suite passes on the real packs") and criterion 2 (`character-world-builder.test.ts`, "AC 2: ..."). Files: the two specs, the two fixtures, the two scenarios, the test file, the two goldens and `propose_graph/recipe.golden.json`, and the `.gitkeep` deletion. The reviewer of part 1 checks that step 11 adds exactly the two catalogue lines.
- **Part 2 — the eval cases, the gates and the commit.** Steps 13 to 18. Test: criterion 3 (`scripts/eval-cases.test.mjs`, "AC 3: the character-builder and world-builder eval cases ..."). Files: the two eval case files and the test file, and the commit of step 17, which the reviewer of part 2 checks against section 3.
