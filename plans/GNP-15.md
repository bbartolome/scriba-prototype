---
id: GNP-15
status: draft
---
# GNP-15 plan — scene_builder tool, golden case and eval case

Batch: [GNP-15] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `985d6bc` (HEAD when read; the working tree was clean). The unit file was read in full (lines 1 to 25). It has no change note: `units/GNP-15-scene-builder.md` has no "Moved to", "Removed by revision", "Loosened by" or "Reworded by" line, and neither do the unit files of its blockers (GNP-02, GNP-13) or its downstream units (GNP-19, GNP-23). `plans/DECISIONS.md` has no entry that names GNP-15 (`grep -n GNP-15 plans/DECISIONS.md` prints nothing).

The planner changed no file except this one, committed nothing except this one, and ran no build, test, lint or npm command.

## 1. Decisions this plan obeys

Labels: **U** = the unit; **M** = `modules/genre-packs.md`; **D** = a settled decision of `plans/DECISIONS.md` or of another plan; **C** = a smaller choice made here (the simplest option, recorded).

- **U1 Tool and output.** `packages/packs/fiction/tools/scene_builder.yaml`, output `draft`, `enabled: true`. Source: unit line 15; module line 52 (output kinds).
- **U2 Description.** Verbatim: "Draft a scene from its goal, conflict and outcome from one character's point of view." Source: unit line 16. It is 85 characters (under `DESCRIPTION_LIMIT` 120, `packages/packs/test/checks.ts` line 44) and starts with `draft`, which is in `VERBS` (checks.ts line 50). Source of the rule: module line 45.
- **U3 Inputs.** The five common inputs, then `sceneNotes` (text port), `pov` (entity port, kind `character`, required), and `goal`, `conflict`, `outcome` (params). Source: unit line 17. The common inputs are the table of module lines 56 to 64 (rows at lines 60 to 64).
- **U4 Prompt.** The skeleton of module lines 46 to 50: a role line; the material, each entity rendered with its ID; the shape steps (unit line 18: establish the POV character's goal, escalate the conflict, turn to the outcome, stay in the POV character's perception and voice); the constraints. This tool is a draft tool, so all four constraints of module line 50 apply: use only the material; cite with `[@id]`; write `TK (note)` for a missing fact; follow the style profile's tone, banned phrases and length. Source: unit line 18; module lines 46 to 50 and line 54 (first drafts).
- **U5 Criteria.** Three criteria, copied in section 5. Source: unit lines 21, 22 and 24.
- **M1 Common inputs of draft tools.** Each of the five must equal the first draft tool's in its schema, its hints and its `required` flag. `checkCommonInputs` (`packages/packs/test/checks.ts` lines 192 to 221, the rule of D8 at line 177) compares with the first draft in pack order, which is `cold_open` (`packages/packs/nonfiction/tools/cold_open.yaml`). Source: module lines 56 to 64; checks.ts lines 96 to 98.
- **M2 Entity kinds.** `pov` takes `x-scriba-entity-kinds: [character]`, because it means a definite kind (module line 66: "where the input means a definite set of kinds, they also carry `x-scriba-entity-kinds`"). The wording of line 66 is the Navigator's (`plans/DECISIONS.md` line 5144). `entityIds` takes no kinds hint, as in `cold_open`. The kind `character` is shipped by `packages/packs/fiction/entity-types/character.yaml` (line 2, `kind: character`), so the entity-kind promotion of checks.ts lines 86 to 95 passes.
- **M3 Scene content on text ports.** `sceneNotes` is a text port (module line 53). `goal`, `conflict` and `outcome` are params (no port), as the unit says.
- **M4 sourcesUsed.** Computed from the entity inputs, style profile excluded (module line 51; `executor.service.ts` lines 159 to 161, `!ref.style`). `pov` is an entity input, so it counts.
- **M5 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if}}` and `{{entity id}}` (module line 46). The field form `{{entity pov}}` is in the subset (`apps/api/src/modules/tool-registry/template.ts` lines 280 to 282).
- **M6 Golden convention.** One scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`; fixtures and goldens under `packages/packs/test/golden/<tool>/`; the helper `goldenCase` of `apps/api/test/packs/golden.kit.ts` (lines 241 to 259); the update flag `--update-goldens`. A golden changes only in the PR of the prompt edit. Source: module line 87; `plans/GNP-02.md` D5, D6, D9, D10.
- **M7 Catalogue.** `{{toolCatalog}}` renders every valid and enabled built-in tool, so this PR changes the recipe golden of `propose_graph` (one inserted line) and regenerates it in the same PR. Source: `plans/GNP-02.md` D18; `plans/GNP-14.md` M8 and C7.
- **M8 Eval cases.** A manual eval case per tool goes into the Agent loop's eval data; nothing runs it in CI. Source: module line 90; units/README.md line 139; unit line 24. The reading that a data test meets the criterion is the Navigator's (`plans/DECISIONS.md` lines 5219 to 5222, option a).
- **M9 System seam.** "The Playwright e2e is unchanged; this module adds no e2e step" (module line 89). This plan adds no e2e step and changes no e2e file; it runs the existing `/tools` specs once as a check (section 4, step 14).
- **D1 Blockers.** GNP-02 is `status: done` (`plans/GNP-02.md` line 3). GNP-13 is `status: done` (`plans/GNP-13.md` line 4). Both are on main.
- **D2 Required inputs.** `coreIdea` and `pov` are required; the prompt uses each of them (`plans/GNP-14.md` D3 states the template-unused rule, `lint.ts` line 817; checked by step 3).
- **D3 Tool name.** The name equals the file stem (`plans/GNP-14.md` D4; `packs.ts` line 156). `scene_builder` and `scene_builder.yaml`.
- **C1 Names.** Tool `scene_builder`; fixture case `lamp-room`; scenario `pack-scene_builder.json`; test file `apps/api/test/packs/scene-builder.test.ts`; eval case id `scene-builder`; data test `scripts/eval-case-scene-builder.test.mjs`. One data test file per unit, so the parallel fiction units do not share `scripts/eval-cases.test.mjs` (the GNP-14 choice C3, `plans/GNP-14.md` line 41).
- **C2 Optional params.** `goal`, `conflict` and `outcome` are optional. The unit marks `coreIdea` and `pov` as required and names the other three as params only.
- **C3 invalidWithout.** `pov`, the tool's own required input. The GNP-14 choice (C4 there) names a tool's own required input for the same reason. The Ajv message names `pov` (`apps/api/src/modules/tool-registry/validate.ts` lines 218 to 246, as `plans/GNP-02.md` section 7 states).
- **C4 Property order.** `coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`, `sceneNotes`, `pov`, `goal`, `conflict`, `outcome`. This order fixes the catalogue line (ports in property order, `template.ts` lines 556 to 567) and the order of `sourcesUsed`, because the entity refs are collected in field order (`validate.ts` lines 108 to 125; `inputs.ts` lines 146 to 155).
- **C5 Control.** `sceneNotes` carries `x-scriba-control: textarea`, as `coreIdea` does in `cold_open` (line 12). Multi-line notes need it.
- **C6 Fixture.** Original text. Entities: `mara-quill` (character, the POV), `ivo-renn` (character), `skerry-light` (place), `plain-spoken` (style-profile). No real person is named.
- **C7 Helper.** `renderedPrompt` is copied from `apps/api/test/packs/character-world-builder.test.ts` lines 4 to 21. No shared helper changes, so `golden.kit.ts` is not edited.
- **C8 Eval intent.** The intent names no entity ID, because GNP-18 has not fixed the IDs of the fiction sample (the GNP-14 choice C8).
- **C9 Catalogue line.** The exact text of section 3.6. Its position is between `propose_graph` and `throughline_check`, because the catalogue is sorted with plain `[...names].sort()` (`apps/api/src/modules/tool-registry/catalog.service.ts` line 467).

## 2. Facts checked and facts assumed

### Facts checked

Unit and module, and the index:
- `units/GNP-15-scene-builder.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Spec lines 15 to 18; criteria at lines 21, 22 and 24. Line 23 is blank.
- `modules/genre-packs.md`: lines 22 (graph: GNP-15 under GNP-13), 33 (parallelism), 46 to 54 (template skeleton and draft rules), 56 to 64 (common inputs), 66 (entity inputs and kinds), 85 to 90 (testing principles, golden tests, sample checks, system seam, real models), 95 to 102 (out of scope).
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65 (inverse rule line 64); the phase row of `phase:fiction` at line 108; testing line 138; real models line 139.
- Inverse rule: `units/GNP-19-fiction-gate.md` line 7 and `units/GNP-23-remix.md` line 7 each name GNP-15 in `blocked_by`, and no other unit does. `units/GNP-02-golden-harness.md` line 9 and `units/GNP-13-fiction-entity-types.md` line 9 name GNP-15 in `unblocks`. Symmetry: `parallel_with` of GNP-12 (line 8), GNP-14 (line 8), GNP-16 (line 8), GNP-17 (line 8) and GNP-18 (line 8) each name GNP-15.
- Transitivity (units/README.md line 64): GNP-15 is blocked by GNP-02 and GNP-13 only. GNP-18 is blocked by GNP-16, not by GNP-15, so no parallel pair is a dependency pair.

Blockers and the state of main:
- Git: `HEAD` and `main` are `985d6bc`; `git status` is clean; `git merge-base --is-ancestor 7c4b8b3 HEAD` succeeds (GNP-14 is on main, `plans/DECISIONS.md` line 6598). No `unit/GNP-15` branch and no GNP-15 worktree exist.
- `packages/packs/fiction/tools/` holds `character_builder.yaml` and `world_builder.yaml` (GNP-14) and no `.gitkeep` (GNP-14 deleted it, `plans/GNP-14.md` section 3). No `scene_builder.yaml` exists, and `grep -rn scene_builder` over `packages`, `apps`, `e2e`, `scripts`, `plans` and `units` finds only `units/GNP-15-scene-builder.md` (checked).
- `packages/packs/test/golden/` holds `character_builder/`, `cold_open/`, `golden_probe/`, `mystery_question/`, `myth_buster/`, `numbers_to_people/`, `propose_graph/`, `throughline_check/` and `world_builder/`. No `scene_builder/`.
- `e2e/fixtures/mock-openai/scenarios/` holds `pack-character_builder.json`, `pack-cold_open.json`, `pack-golden_probe.json`, `pack-mystery_question.json`, `pack-myth_buster.json`, `pack-numbers_to_people.json`, `pack-propose_graph.json`, `pack-throughline_check.json` and `pack-world_builder.json`. No `pack-scene_builder.json`.
- `scripts/eval-agent/cases/` holds `character-builder.json`, `cold-open.json`, `mystery-question.json`, `myth-buster.json`, `numbers-to-people.json`, `summarize-outline.json`, `throughline-check.json` and `world-builder.json`. No `scene-builder.json`.
- `apps/api/test/packs/` holds `character-world-builder.test.ts` (GNP-14), `golden.kit.ts` (GNP-02) and the other packs tests. No `scene-builder.test.ts`.
- `packages/packs/nonfiction/tools/cold_open.yaml`: the five common inputs at lines 7 to 33 (`coreIdea` 7 to 12, `entityIds` 13 to 19, `styleProfile` 20 to 24, `length` 25 to 30, `tone` 31 to 33); `output: draft` line 46; prompt lines 48 to 75. The `person` input (lines 34 to 39) is the precedent for a single entity input with `x-scriba-entity-kinds`.
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` lines 35 to 41; `DESCRIPTION_LIMIT` line 44; `VERBS` lines 48 to 67; the promotion of `entity-kind` warnings to errors lines 86 to 95; `drafts` line 97; `checkCommonInputs` lines 192 to 221; `checkDescription` lines 236 to 257; `checkRemix` lines 261 to 288, active only when `core/tools/remix.yaml` exists.
- `packages/packs/test/real-packs.test.ts`: `it('the suite passes on the real packs')` at line 9; it asserts no error from `lintPacks` and `contentChecks(REAL_PACKS)` equal to `[]`.
- `scripts/lint-packs.mjs` line 73: `process.exitCode = main()`.
- `packages/packs/fiction/entity-types/character.yaml` line 2 (`kind: character`); `packages/packs/core/entity-types/style-profile.yaml` (the style kind, as the fixture of `cold_open` uses `type: style-profile`).

Code on main:
- `apps/api/src/modules/tool-registry/executor.service.ts`: `OUTPUT_SYSTEM_MESSAGES` lines 31 to 40 (`draft:` at line 32, `entity:` at line 34); the entity-kind check lines 136 to 151; `sources` lines 159 to 161 (`!ref.style`); the render with `args`, `entities` and `toolCatalog` from line 166 on.
- `apps/api/src/modules/tool-registry/validate.ts`: `for (const field of fields)` at line 110; entity refs pushed with `style: field.isStyle` at lines 119 to 123; the return at line 135.
- `apps/api/src/modules/tool-registry/inputs.ts`: the properties in property order, `Object.entries(properties)`, lines 146 to 155.
- `apps/api/src/modules/tool-registry/template.ts`: `{{entity id}}` with a field id at lines 280 to 282; the catalogue line format at lines 556 to 567 (ports as `name (type, single|list, required|optional)`, then `- name: description Output: kind. Inputs: ...`).
- `apps/api/src/modules/tool-registry/catalog.service.ts` line 467: `for (const name of [...names].sort())`.
- `apps/api/test/packs/golden.kit.ts`: `PACKS_ROOT` line 29; `GOLDEN_ROOT` line 38; `UPDATE_GOLDENS` line 40; `GoldenRunOptions.invalidWithout` line 74 and `userTool` line 75; `GoldenCaseOptions.check` line 96; `runGoldenCase` line 126; `goldenCase` lines 241 to 259 (asserts status, kind, `sourcesUsed`, 422, `TOOL_ARGS_INVALID`, the message containing `invalidWithout`, and one model call, then the `check`).
- `apps/api/test/packs/character-world-builder.test.ts`: the `renderedPrompt` helper at lines 5 to 21 (the comment starts at line 4); `goldenCase` bodies at lines 23 and 39; the `it` at line 55 with timeout 120000.
- `scripts/eval-cases.test.mjs`: `CASE_KEYS` line 14; the first test at line 34, which reads every case file and checks its keys, its `reason` and its `citations` if present; the second test at line 65.
- `scripts/eval-agent/run.mjs`: `CASE_KEYS` line 36 (`sample`, `intent`, `expect`).
- `scripts/eval-case-character-world-builder.test.mjs` (GNP-14, on main): one `test` that reads `character-builder.json` and `world-builder.json` and asserts their exact keys and values; it runs no model.
- `e2e/specs/tools-preview.e2e.ts`: the comment at lines 20 to 22 and `test.use({ viewport: { width: 1280, height: 3200 } })` at line 23 (the GNP-14 change, C12).
- `e2e/specs/tools-editor.e2e.ts`, `tools-live-preview.e2e.ts`, `tools-try.e2e.ts`: the `/tools` specs; none of the count assertions found by `grep` (`toHaveCount`) counts tool rows.
- The recipe golden `packages/packs/test/golden/propose_graph/recipe.golden.json`: `messages[1].content` holds eight catalogue lines on main, in this order: `character_builder`, `cold_open`, `mystery_question`, `myth_buster`, `numbers_to_people`, `propose_graph`, `throughline_check`, `world_builder`. The story golden holds no catalogue (`plans/GNP-14.md` section 2).
- The description length: `node -e` counts 85 characters for the U2 text.

Plans and DECISIONS:
- `plans/GNP-14.md` (done, on main): section 3 (its files); line 462 (GNP-15 adds one catalogue line and one scenario, fixture, golden, test and eval case); line 466 (3200 px leaves room for three more fiction rows); lines 479 and 480 (the `.gitkeep` and the `scripts/eval-agent/cases/` rule).
- `plans/GNP-12.md` (done): line 3 `status: done`; its file table (lines 65 and 66) names only `units/GNP-12-workhorses-gate.md` and `plans/GNP-12.md`. No path in common with this plan.
- No plan file exists for GNP-16, GNP-17 or GNP-18 (`ls plans/` lists GNP-01 to GNP-14 and GNP-20 only; `plans/GNP-15.md` did not exist before this draft).
- `plans/DECISIONS.md`: line 5144 (the kinds of `entityIds`, module line 66 reworded); lines 5219 to 5222 (the Navigator's data-only reading of the eval-data criterion); lines 5255 to 5259 (the criterion 4 precedent of GNP-12: an unticked box while a model server is absent); line 5949 ("TRG-05 C2 is not weakened", the viewport rule of TRG-14); line 6547 (the root `npm test` times out in `apps/web` `canvas-page.spec.ts` under load); lines 6598 to 6604 (GNP-14 merged).

### Facts assumed

- **A1.** Node 26 and npm 11 are on the PATH, as the other plans state. Step 1 checks it.
- **A2.** `fields` in `validate.ts` (line 110) is the `propertiesOf` list of `inputs.ts` (lines 146 to 155), in property order, so `sourcesUsed` is `entityIds` then `pov`. Not read end to end. Step 7 checks the order in the golden's test result (the exact `sourcesUsed` of section 5).
- **A3.** A `{{#if x}}` block leaves out its text when `x` is absent, as `cold_open`'s prompt relies on (`cold_open.yaml` lines 52 to 55). Step 7 reads the golden.
- **A4.** The rendered prompt holds each entity's ID for `{{entity this}}` and for `{{entity field}}`. The GNP-14 test relies on the same rendering (`character-world-builder.test.ts` line 23 onward). Step 7 checks it.
- **A5.** The lint rules D2 and D3 act as `plans/GNP-14.md` states (`lint.ts` lines 496 and 817, not re-read here). Step 3 checks them.
- **A6.** `lint:packs` and `npm test -w @bbartolome/scriba-packs` run from main as the other plans describe (`package.json` line 28; `packages/packs/package.json` line 7). Step 1 checks them.
- **A7.** Prettier accepts the YAML block scalar and the JSON files as written. Steps 2, 4, 5 and 10 check it.
- **A8.** The browser can run the `/tools` e2e specs here. If not, step 14 records "not run".

## 3. Files to change

Only the paths below change, with the content of 3.1 to 3.6. `plans/GNP-15.md` is written by the planner now and not changed by the implementer.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/fiction/tools/scene_builder.yaml` | new | the tool spec (3.1, step 2) |
| `packages/packs/test/golden/scene_builder/lamp-room.fixture.json` | new | the fixture (3.2, step 4) |
| `packages/packs/test/golden/scene_builder/lamp-room.golden.json` | created by the update run (step 7) | the golden request |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by the update run (step 9): one inserted line | the catalogue gains `scene_builder` (3.6) |
| `e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json` | new | the scripted reply (3.3, step 5) |
| `apps/api/test/packs/scene-builder.test.ts` | new | the test of criterion 2 (3.4, step 6) |
| `scripts/eval-agent/cases/scene-builder.json` | new | the eval case (3.5, step 10) |
| `scripts/eval-case-scene-builder.test.mjs` | new | the test of criterion 3 (3.5, step 10) |

Not changed: every file under `packages/packs/{core,nonfiction}/`; `packages/packs/fiction/{entity-types,tools/character_builder.yaml,tools/world_builder.yaml}`; `packages/packs/package.json`; `packages/packs/test/*.ts` and `packages/packs/test/README.md`; `packages/packs/test/golden/propose_graph/story.*`; `packages/packs/test/golden/{character_builder,world_builder,golden_probe}/**`; `apps/api/src/**`; `apps/api/test/packs/golden.kit.ts` and the other packs tests; `apps/api/vitest.config.mts`; `apps/api/test/packs/propose-graph.test.ts`; `packages/contracts/**`; `e2e/specs/**` (open point 2 covers a change, which this plan does not make); `e2e/fixtures/mock-openai/server.mjs`; `scripts/eval-cases.test.mjs`; `scripts/eval-agent/run.mjs`, its README and its test; `examples/**` (GNP-18 owns them); `package.json`; `package-lock.json`; `.prettierignore`; `units/**`; `modules/**`; `plans/**` (this file belongs to the planner; the implementer does not change it).

### 3.1 The tool spec `packages/packs/fiction/tools/scene_builder.yaml`

The five common-input blocks (the keys `coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`) are copied byte for byte from `packages/packs/nonfiction/tools/cold_open.yaml` lines 7 to 33, as the text below shows. The content check D8 (checks.ts lines 192 to 221) compares them.

```yaml
schemaVersion: 1
name: scene_builder
description: Draft a scene from its goal, conflict and outcome from one character's point of view.
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
    styleProfile:
      type: string
      title: Style
      x-scriba-type: style
      x-scriba-port: true
    length:
      type: integer
      title: Length
      default: 800
      minimum: 200
      maximum: 2000
    tone:
      type: string
      title: Tone
    sceneNotes:
      type: string
      title: Scene notes
      x-scriba-type: text
      x-scriba-port: true
      x-scriba-control: textarea
    pov:
      type: string
      title: Point of view
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [character]
    goal:
      type: string
      title: Goal
    conflict:
      type: string
      title: Conflict
    outcome:
      type: string
      title: Outcome
  required: [coreIdea, pov]
output: draft
enabled: true
prompt: |
  You write one scene of a fiction story: a passage in the perception and voice of one character.

  Core idea: {{coreIdea}}
  {{#if goal}}Goal: {{goal}}
  {{/if}}{{#if conflict}}Conflict: {{conflict}}
  {{/if}}{{#if outcome}}Outcome: {{outcome}}
  {{/if}}{{#if sceneNotes}}Scene notes: {{sceneNotes}}
  {{/if}}Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}
  Material:
  {{entity pov}}
  {{#each entityIds}}
  {{entity this}}
  {{/each}}
  {{#if styleProfile}}
  {{entity styleProfile}}
  {{/if}}

  Steps:
  1. Establish the goal of the point-of-view character in this scene.
  2. Escalate the conflict against that goal.
  3. Turn to the outcome.
  4. Stay in the point-of-view character's perception and voice throughout.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (the year the light was built). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

Then `npx prettier --write` on the file (step 2). The prompt text must not change under prettier.

### 3.2 The fixture `packages/packs/test/golden/scene_builder/lamp-room.fixture.json`

```json
{
  "arguments": {
    "coreIdea": "Waiting can be a way of hoping.",
    "entityIds": ["ivo-renn", "skerry-light"],
    "styleProfile": "plain-spoken",
    "length": 600,
    "tone": "spare",
    "sceneNotes": "Night. The lamp has failed once already. Mara has to tell Ivo that the supply boat is late again.",
    "pov": "mara-quill",
    "goal": "Get Ivo to agree to light the lamp alone.",
    "conflict": "Ivo insists that the boat will come.",
    "outcome": "Mara lights the lamp herself."
  },
  "entities": [
    {
      "ref": "mara-quill",
      "type": "character",
      "path": "entities/mara-quill.md",
      "content": "Mara Quill keeps the logbook and speaks in short sentences."
    },
    {
      "ref": "ivo-renn",
      "type": "character",
      "path": "entities/ivo-renn.md",
      "content": "Ivo Renn trusts the supply boat and believes in its timetable."
    },
    {
      "ref": "skerry-light",
      "type": "place",
      "path": "entities/skerry-light.md",
      "content": "Skerry Light is a lamp on a bare rock, reached only on a spring tide."
    },
    {
      "ref": "plain-spoken",
      "type": "style-profile",
      "path": "entities/plain-spoken.md",
      "content": "---\ntype: style-profile\ntone: Plain and direct\ntargetLength: 800\nbannedPhrases: [game-changer]\n---\n\nSay what the scene shows, and let the silences do the rest."
    }
  ]
}
```

The expected `sourcesUsed` is `["ivo-renn", "skerry-light", "mara-quill"]`: `entityIds` in argument order, then `pov`, and `plain-spoken` left out because it is a style ref (C4, M4).

### 3.3 The scenario `e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json`

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["Mara Quill set the logbook down and lit the lamp herself."]
      }
    }
  ]
}
```

Then `npx prettier --write` on it (step 5).

### 3.4 The golden test `apps/api/test/packs/scene-builder.test.ts`

- Imports: `expect` and `it` from `vitest`; `goldenCase` and `type GoldenRunResult` from `./golden.kit`.
- The `renderedPrompt` helper, copied from `character-world-builder.test.ts` lines 4 to 21 (C7).
- One `goldenCase` body, named `lampRoom`: `tool` `scene_builder`; `name` `lamp-room`; `expect` `{ kind: 'draft', sourcesUsed: ['ivo-renn', 'skerry-light', 'mara-quill'] }`; `invalidWithout` `pov` (C3); and a `check` that asserts that the rendered prompt contains each of `mara-quill`, `ivo-renn`, `skerry-light`, `plain-spoken`, the citation instruction `[@id]` and the placeholder `TK`.
- One `it` with the name in section 5 (criterion 2), whose body awaits `lampRoom()`, with timeout 120000.
- The file has no `any` and does not contain the text `examples/`.

### 3.5 The eval case and its data test

`scripts/eval-agent/cases/scene-builder.json`:

```json
{
  "sample": "fiction",
  "intent": "Draft the scene for my lighthouse story where the keeper who keeps the lamp tells the other keeper that the supply boat is late again, from her point of view.",
  "expect": {
    "reason": "completed",
    "tools": ["scene_builder"]
  }
}
```

`scripts/eval-case-scene-builder.test.mjs`: the imports and the `CASES` path helper of `scripts/eval-case-character-world-builder.test.mjs` (GNP-14), with the comment line changed to name this case. One `test(...)` with the name in section 5 (criterion 3). It reads `scene-builder.json` and asserts: the keys are exactly `expect`, `intent`, `sample`; the keys of `expect` are exactly `reason`, `tools`; `sample` is `fiction`; `intent` is a non-empty string; `expect.tools` is `["scene_builder"]`; `expect.reason` is `completed`. It runs no model.

### 3.6 The catalogue line in the recipe golden

After the update run (step 9) the recipe golden must contain exactly one new line, placed between `- propose_graph:` and `- throughline_check:`:

`- scene_builder: Draft a scene from its goal, conflict and outcome from one character's point of view. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); sceneNotes (text, single, optional); pov (entity, single, required).`

The format is `template.ts` lines 556 to 567; the ports are listed in property order and only the ports (no params), as the other six lines show. If the line is absent after the run, the tool is not valid (a lint error or an unloaded spec): stop and report.

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-15`, cut from `main` (the orchestrator makes the branch and any worktree; no `-b` when the branch already exists). Record `node -v` and `npm -v` beside each result. Do not push. Do not use `git add -A` or `git commit -a`.

0. **Base.** `git rev-parse --short HEAD` prints `985d6bc` or a later commit. `git merge-base --is-ancestor 7c4b8b3 HEAD` exits 0. `git diff --quiet 985d6bc HEAD -- packages/packs apps/api/test/packs scripts e2e/fixtures/mock-openai/scenarios e2e/specs` exits 0; if not, re-read the changed files before editing. `git status --short` prints nothing. `test ! -e packages/packs/fiction/tools/scene_builder.yaml` and `test ! -e packages/packs/fiction/tools/.gitkeep` exit 0. `git ls-files packages/packs/test/golden/scene_builder apps/api/test/packs/scene-builder.test.ts scripts/eval-agent/cases/scene-builder.json scripts/eval-case-scene-builder.test.mjs e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json` prints nothing.
1. **Runtime and baseline (A1, A6).** `node -v` prints `v26.x` and `npm -v` prints `11.x`. Run `npm ci` only if the worktree has no `node_modules/`. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs && (cd apps/api && npx vitest run test/packs)` exits 0 on the unchanged tree.
2. **Tool spec (U1 to U4, M1 to M5, C2, C4, C5).** Create `packages/packs/fiction/tools/scene_builder.yaml` with the text of 3.1. Then `npx prettier --write packages/packs/fiction/tools/scene_builder.yaml`. Check that the prompt block is unchanged after prettier (A7); if it changed, keep prettier's form and record the change.
3. **Pack gate (criterion 1; M1, M2, D2, D3, A5).** `npm run lint:packs` exits 0 and prints no finding that names `scene_builder`. Then `npm test -w @bbartolome/scriba-packs` exits 0, and "the suite passes on the real packs" passes.
4. **Fixture (M6, C6).** Create `packages/packs/test/golden/scene_builder/lamp-room.fixture.json` with the text of 3.2. Then `npx prettier --write` on it.
5. **Scenario (M6).** Create `e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json` with the text of 3.3. Then `npx prettier --write` on it.
6. **Golden test (criterion 2; C1, C3, C7).** Create `apps/api/test/packs/scene-builder.test.ts` as section 3.4 describes.
7. **Update run (A2, A3, A4, M6).** `cd apps/api && npx vitest run test/packs/scene-builder.test.ts -- --update-goldens` exits 0 and creates `packages/packs/test/golden/scene_builder/lamp-room.golden.json`. Read the file. `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft` (`executor.service.ts` lines 32 and 33). `messages[1].content` contains the lines `Core idea: Waiting can be a way of hoping.`, `Goal: Get Ivo to agree to light the lamp alone.`, `Conflict: Ivo insists that the boat will come.`, `Outcome: Mara lights the lamp herself.`, `Scene notes: Night.`, `Length: 600 words.` and `Tone: spare.`; it contains each of `mara-quill`, `ivo-renn`, `skerry-light` and `plain-spoken`, the text `[@id]` and the text `TK`; and it contains no `{{`. Then `npx prettier --write packages/packs/test/golden/scene_builder`.
8. **Compare run (criterion 2).** `cd apps/api && npx vitest run test/packs/scene-builder.test.ts` exits 0 with one test passed. `goldenCase` asserts that the golden is `match`, the kind is `draft`, `sourcesUsed` is exactly `["ivo-renn", "skerry-light", "mara-quill"]` (A2), the call without `pov` returns 422 with `TOOL_ARGS_INVALID` and a message that contains `pov`, and one model call was made.
9. **Catalogue of the propose_graph recipe golden (M7, C9, 3.6).** `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens` exits 0. Then `git status --short packages/packs/test/golden` lists the two new `scene_builder` files and `propose_graph/recipe.golden.json` and nothing else. Parse the base (`git show HEAD:packages/packs/test/golden/propose_graph/recipe.golden.json`) and the working copy as JSON in `node -e`, without writing a file. `messages[0]` is equal in both. In `messages[1].content`, the two strings differ by exactly one inserted line, the text of 3.6, after `- propose_graph:` and before `- throughline_check:`. Everything else is equal. If anything else differs, stop and report it. `git diff --quiet -- packages/packs/test/golden/propose_graph/story.golden.json` exits 0. Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0.
10. **Eval data and its test (criterion 3; C1, C8; M8).** Create `scripts/eval-agent/cases/scene-builder.json` and `scripts/eval-case-scene-builder.test.mjs` as section 3.5 describes. Then `npx prettier --write` on both. `node --test scripts/eval-case-scene-builder.test.mjs` exits 0 with one test passed. `node --test scripts/eval-cases.test.mjs` exits 0 with its two tests passed.
11. **Format check (A7).** `npx prettier --check packages/packs/fiction/tools packages/packs/test/golden apps/api/test/packs scripts/eval-agent/cases scripts/eval-case-scene-builder.test.mjs e2e/fixtures/mock-openai/scenarios` exits 0. If a golden fails it, stop and report: the fix is a decision for the Navigator, not for this unit.
12. **API build and lint.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0. The build type-checks the new test file.
13. **Root gates and the e2e mock.** From the root: `npm run build`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario. `node --test 'scripts/*.test.mjs'` exits 0. Then `npm test` from the root: record the result. If it fails, follow open point 3; do not change any file to make it pass.
14. **The /tools specs in the running app (M9; open point 2).** With port 8080 free, run once: `npm run e2e -w @bbartolome/scriba-e2e -- tools-editor.e2e.ts tools-live-preview.e2e.ts tools-preview.e2e.ts tools-try.e2e.ts --trace off`. Record the pass and fail counts, and for `tools-preview.e2e.ts` the TRG-05 C2 result. No spec changes. If a test fails, stop and report the test name, the person select's `boundingBox` and the viewport height. If the browser cannot run, record "not run".
15. **Commit.** `git add -- packages/packs/fiction/tools/scene_builder.yaml packages/packs/test/golden/scene_builder packages/packs/test/golden/propose_graph/recipe.golden.json e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json apps/api/test/packs/scene-builder.test.ts scripts/eval-agent/cases/scene-builder.json scripts/eval-case-scene-builder.test.mjs`. `git diff --cached --stat` lists exactly these paths and no `plans/` or `units/` file. Commit with `feat(GNP-15): scene_builder tool with golden and eval cases`. Do not push.
16. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 5 holds.

## 5. Acceptance criteria and tests

The criteria text is copied from `units/GNP-15-scene-builder.md` lines 21, 22 and 24. Each criterion has exactly one test. No other test is added.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "Passes `npm run lint:packs` and the content-check suite." (21) | `packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs" (existing, line 9; C6 precedent) | `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (steps 1 and 3) | Both exit 0. The test asserts no error from `lintPacks` and an empty `contentChecks` on `packages/packs`. Over the real folders, that holds the five-input identity (checks.ts lines 192 to 221), the description rule (lines 236 to 257) and the entity-kind promotion (lines 86 to 95) for `scene_builder`. |
| "Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error." (22) | `apps/api/test/packs/scene-builder.test.ts`, "AC 2: the scene_builder golden case matches, its prompt holds each input entity with its ID and the citation and placeholder instructions, its output is a draft with the expected sourcesUsed, and invalid arguments return an Ajv error that names pov" | `cd apps/api && npx vitest run test/packs/scene-builder.test.ts` (steps 7 and 8) | One `it`, timeout 120000. The golden is `match` (`written` in the update run). The kind is `draft`. `sourcesUsed` is exactly `["ivo-renn", "skerry-light", "mara-quill"]`, which excludes `plain-spoken`. The call without `pov` returns 422 with `TOOL_ARGS_INVALID` and a message that contains `pov`, with one model call. The `check` finds `mara-quill`, `ivo-renn`, `skerry-light`, `plain-spoken`, `[@id]` and `TK` in the rendered user message. |
| "A manual eval case (small and larger local model) is added to the Agent loop's eval script data." (24) | `scripts/eval-case-scene-builder.test.mjs`, "AC 3: the scene-builder eval case is in the eval data and uses the documented keys and values" | `node --test scripts/eval-case-scene-builder.test.mjs` (step 10), and `node --test scripts/eval-cases.test.mjs` (existing, reads every case) | The file `scene-builder.json` exists in `scripts/eval-agent/cases/`. Its keys are exactly `expect`, `intent`, `sample`; the keys of `expect` are exactly `reason`, `tools`; `sample` is `fiction`; `intent` is non-empty; `expect.tools` is `["scene_builder"]`; `expect.reason` is `completed`. The real-model run with a small and a larger local model is not part of the criterion (the Navigator's data-only reading, `plans/DECISIONS.md` lines 5219 to 5222); it is recorded as not run (open point 1). |

## 6. Agreement with the downstream units and the parallel plans

**Downstream.**

- **GNP-19 (fiction gate; `blocked_by` line 7 names GNP-15).** Its criterion (`units/GNP-19-fiction-gate.md` line 20): "All five tools pass the validation suite; every entity input names an existing entity type." This plan gives it `scene_builder` enabled, output `draft`, and `pov` with kind `character`, which is shipped (`character.yaml` line 2). It runs the check of criterion 1 here. This plan gives GNP-19 nothing else. Agrees.
- **GNP-23 (remix; `blocked_by` line 7 names GNP-15).** Its `targetShape` enum must list every shipped draft tool except `remix` (`units/GNP-23-remix.md` line 16; `checkRemix` in `checks.ts` lines 261 to 288, which counts only `output: draft`). Once this unit is on main, `scene_builder` is a shipped draft tool, so GNP-23's enum must contain `scene_builder`. This plan keeps `output: draft` (unit line 15), so the enum entry is stable. GNP-23 writes the enum; this plan writes nothing in it. Agrees.
- **Inverse rules.** `unblocks: [GNP-19, GNP-23]` (unit line 9) is the exact inverse of their `blocked_by` (lines 7). GNP-02 (line 9) and GNP-13 (line 9) list GNP-15 in `unblocks`. Agrees.
- **The module's dependency graph (line 22) and parallelism (line 33)** place GNP-15 under GNP-13 with GNP-14, GNP-16 and GNP-17. Agrees.

**Parallel units and their plans.**

- **GNP-14 (`plans/GNP-14.md`, done, on main).** It already changed the shared files: the recipe golden holds its two catalogue lines; `e2e/specs/tools-preview.e2e.ts` is at 3200 px (line 23); `packages/packs/fiction/tools/.gitkeep` is gone; the scenario folder and the `scripts/eval-agent/cases/` folder hold its files. This plan starts from that state. Its change to the recipe golden is one inserted line, placed by sort order, so it is correct whichever of GNP-14 and GNP-15 is on main first. Agrees.
- **GNP-12 (`plans/GNP-12.md`, done).** Its file table (lines 65 and 66) names only `units/GNP-12-workhorses-gate.md` and `plans/GNP-12.md`. No path in common. Agrees.
- **GNP-16 (dialogue), GNP-17 (plot_manager) and GNP-18 (fiction sample): no plan file exists.** Their changes, from their unit files:
  - GNP-16 adds `packages/packs/fiction/tools/dialogue.yaml` (draft; `units/GNP-16-dialogue.md` line 15 for the file and line 17 for the inputs: the five common inputs, `characterIds` as a list of kind `character` with `minItems 2`, `sceneText` text port, and `subtext` and `goal` params); a golden folder `dialogue/`; a scenario `pack-dialogue.json`; its own test and eval case; and one catalogue line in the recipe golden, sorted between `cold_open` and `mystery_question`. Its unit names the same five common inputs (its line 17), so the identity check of M1 holds with or without this plan.
  - GNP-17 adds `packages/packs/fiction/tools/plot_manager.yaml` (`units/GNP-17-plot-manager.md` line 15 for the file and output `check`, line 16 for the inputs: `outline` text port, required, and `entityIds`); its golden, scenario, test and eval case; and one catalogue line, sorted between `numbers_to_people` and `propose_graph`. Its output is `check`, so `checkRemix` does not count it.
  - GNP-18 adds `examples/fiction/**` and an entry in `examples/samples.yaml` (`units/GNP-18-fiction-sample.md` lines 15 and 20). Its recipe uses `dialogue`, not `scene_builder` (line 20). It changes no `packages/packs` file and no catalogue.
  - In either order, each fiction tool inserts its own line at its sorted place. A rebase that conflicts on the recipe golden is resolved by regenerating it with the update command (`plans/GNP-02.md` D18). Step 9 checks that this PR's change is only its own line.
- **Unit file check (not fixed here).** `units/GNP-15-scene-builder.md` line 23 is blank between the checkbox of criterion 2 (line 22) and that of criterion 3 (line 24). This is cosmetic: the three items are still checkboxes under the heading, as `units/README.md` lines 51 to 57 describe. Otherwise the unit agrees with `modules/genre-packs.md` (the skeleton, the five common inputs, the entity kind of `pov`, the output kind, the eval-case and golden rules) and with `units/README.md` (the front matter, the blocker and `parallel_with` symmetry, the inverse of `unblocks`, the phase row). One point reads as ambiguous rather than inconsistent: the unit does not say whether `goal`, `conflict` and `outcome` are required; this plan treats them as optional (C2).

## 7. Open points

1. **Who carries the real-model run of the scene case.** The data test meets criterion 3 (M8; `plans/DECISIONS.md` lines 5219 to 5222). The run itself needs a small and a larger local model, which this environment does not have. GNP-12's criterion 4 carries only the nonfiction workhorses (`plans/DECISIONS.md` lines 5255 to 5259), and GNP-19's done-when names only the dialogue run (`units/GNP-19-fiction-gate.md` line 24). Nothing carries the scene run. **Simplest choice:** record "not run" at merge, as GNP-14 did for its eval cases (`plans/GNP-14.md` section 5, criterion 3 row), and let the Navigator name the carrier. **Reason:** naming a carrier edits GNP-19's criteria or the module, which is the Navigator's decision.

2. **The /tools e2e specs if the longer list pushes the person picker out of view.** One more fiction row is added to the `/tools` list. `e2e/specs/tools-preview.e2e.ts` line 23 sets a 3200 px viewport, which GNP-14 chose with room for three more rows (`plans/GNP-14.md` line 466). This plan expects it to fit, and step 14 checks it. **Simplest choice:** change no e2e file. If TRG-05 C2 fails, stop and report the `boundingBox`, the viewport height and the failing line. **Reason:** module line 89 says the e2e is unchanged, and the viewport change of GNP-14 (C12, `plans/DECISIONS.md` line 5949) was an orchestrator decision. Any further change is for the Navigator. If the browser cannot run, the step records "not run" and this point stays open.

3. **Whether the root `npm test` failure of an untouched workspace blocks the merge.** The root `npm test` has failed on timeouts in `apps/web` `canvas-page.spec.ts` and in `apps/api` under load (`plans/DECISIONS.md` lines 6372 and 6547). GNP-14 accepted a rule for this (`plans/GNP-14.md` section 4, step 15). **Simplest choice:** run step 13 as written; if the only failure is a timeout in a test this unit does not touch, run that workspace alone and record both results, then report to the Navigator. Do not change the other test to pass. **Reason:** whether a known timing failure blocks a merge is a gate decision, and the Navigator should confirm the GNP-14 rule for this unit as well.
