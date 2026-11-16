---
unit: GNP-09
status: draft
module: genre-packs
milestone: M2
blocked_by: [GNP-02, GNP-03, GNP-06]
unblocks: [GNP-12, GNP-23]
---
# GNP-09 plan — myth_buster nonfiction draft tool, golden case and eval case

Batch: [GNP-09] (Genre packs, phase:nonfiction-workhorses, M2), a batch of one. Planner draft at main `e510387`. The working tree holds only `units/SAU-12-providers-step.md` (modified, not this plan's). No `plans/GNP-09.md` existed, and no `unit/GNP-09` branch exists. The unit `units/GNP-09-myth-buster.md` has no change note (lines 1 to 24 read in full; no "by revision" line). `unit/GNP-08` exists and is in progress; it was not touched. The planner changed no file except this plan, committed nothing and ran no build, install or test.

## 1. Decisions this plan obeys

Labels: **U** = unit file; **M** = module file; **D** = a settled decision of a done unit or plan on main; **C** = a smaller choice made by this plan (recorded here, not in `plans/DECISIONS.md`). `grep -n -i "GNP-09\|myth\|claimIds" plans/DECISIONS.md` finds no entry, so no Navigator decision names this unit.

- **U1 Spec and file.** `packages/packs/nonfiction/tools/myth_buster.yaml`; `name` `myth_buster`; `schemaVersion: 1`; `output: draft`; `enabled: true`; description "State a common belief, then take it apart with evidence." Source: U lines 15 and 16; M lines 44 and 45.
- **U2 Inputs.** The five common inputs, then `belief` (text port, required) and `claimIds` (entity port list, kind `claim`, required). `required: [coreIdea, belief, claimIds]`. Source: U line 17; M lines 56 to 66.
- **U3 Prompt.** The skeleton of M line 46: role line; material (`claimIds`, then `entityIds`, each `{{entity this}}`; style profile under `{{#if styleProfile}}`); the four steps in the unit's order (state the belief fairly, show why people hold it, take it apart claim by claim, say what is true instead); constraints. Source: U line 18; M lines 46 to 50.
- **U4 Criteria.** Four (U lines 21 to 24). Each gets one test in section 6.
- **M1 Common inputs verbatim.** The five blocks are identical to `packages/packs/nonfiction/tools/cold_open.yaml` (M line 56; `packages/packs/test/checks.ts` `checkCommonInputs`).
- **M2 Entity kinds.** `claimIds` carries `x-scriba-entity-kinds: [claim]`, because it means a definite set of kinds (M line 66). `entityIds` carries no hint (M line 66; `plans/GNP-07.md` C1 and N2).
- **M3 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if}}` and `{{entity X}}` (M line 46). No `{{toolCatalog}}`.
- **M4 `sourcesUsed`.** Computed by the Tool registry from entity-ID inputs; style refs excluded; the prompt never asks for sources (M line 51).
- **M5 Testing.** Golden test through `POST /api/tool-registry/tools/:name/execute` with `create-test-app`, `SCRIBA_PACKS_DIR=packages/packs` and the mock server (M line 87). Goldens change only in the PR of the prompt edit (M line 87). No unit test reads `examples/` (M line 88). Eval cases go into the Agent loop's eval data (M line 90).
- **M6 Names and descriptions.** Lower snake_case tool name; camelCase input keys; one sentence, under about 120 characters, starting with a verb (M lines 44 and 45). `state` is in `VERBS`.
- **M7 Citations and placeholders.** `[@id]` in each factual sentence; `TK (note)` for a missing fact; style tone, banned phrases and length (M line 46).
- **M8 Entity kind shipped.** `claim`: `packages/packs/nonfiction/entity-types/claim.yaml` (M line 76). `plans/GNP-06.md` line 177 and `plans/GNP-11.md` line 225 agree with this unit.
- **D1 Golden harness (GNP-02, done).** `goldenCase` and `runGoldenCase`, `invalidWithout`, `check` (`plans/GNP-02.md` D4, D10). Scenario `pack-<tool>.json` (D5). Fixture and golden under `packages/packs/test/golden/<tool>/` (D6). What a golden holds (D7). Comparison by value (D8). Update flag (D9). One model call (D17). Goldens that render the catalogue change with it (D18).
- **D2 Entity kinds (GNP-03, GNP-06, done).** `source`, `style-profile` and `claim` are shipped (`plans/GNP-03.md`, `plans/GNP-06.md`).
- **D3 Pattern (GNP-07, done).** `plans/GNP-07.md` C2 to C4 (tone, length, control), C6 and C9 (eval data and its test), C7 (names and timeout), C10 (merge rule with the catalogue golden).
- **D4 Catalogue golden (GNP-04, done).** `packages/packs/test/golden/propose_graph/recipe.golden.json` renders the catalogue; `story.golden.json` does not (`plans/GNP-04.md` N1).
- **C1 Invalid-argument key is `belief`.** It is the tool's own required input, which no other test checks (as `plans/GNP-08.md` C1 does for `puzzle`).
- **C2 Length and tone.** `length`: integer, default 800, minimum 200, maximum 2000. `tone`: free text (`plans/GNP-07.md` C2, C3).
- **C3 Controls.** `coreIdea` carries `x-scriba-control: textarea`, as `cold_open.yaml`. `belief` carries none.
- **C4 No `minItems`.** The unit says `required` for `claimIds` and sets no minimum. `validate.ts` supports `minItems` (line 187), but this plan does not add one. Open point 2.
- **C5 `sourcesUsed`.** The non-style entity IDs passed, in property order: `entityIds`, then `claimIds`. The evidence sources of a claim are not expanded, because the registry uses only the IDs given (M4).
- **C6 Prompt order.** Claims are rendered before the other entities, because they are what the passage takes apart.
- **C7 Names.** Case `belief-claims`; entity IDs `notes-a`, `claim-a`, `claim-b`, `style-a`; test file `apps/api/test/packs/myth-buster.test.ts`; one `it` for AC 2 and one for AC 3, timeout 60000 ms (as `plans/GNP-07.md` C7).
- **C8 Seam of AC 3.** `createTestApp` and the HTTP execute route, with inline entities, in the same test file. `goldenCase` expects status 200, and `golden.kit.ts` does not export `post`. `golden.kit.ts` is not changed.
- **C9 Seam of AC 4.** One new `test` in `scripts/eval-cases.test.mjs` that reads `scripts/eval-agent/cases/` and runs no model (`plans/GNP-07.md` C6 and C9).
- **C10 Eval values.** `sample` `nonfiction`. `intent` "Bust the myth that ten thousand hours of practice make anyone an expert, using my notes." Chapter 3, "The Ten-Thousand-Hour Idea" (`examples/nonfiction/sources/outline.md` lines 26 to 31), is the myth's chapter. `expect`: `reason` `completed`, `tools` `["myth_buster"]`, `citations` `present`. GNP-08 uses chapter 4, so the two cases do not share a chapter.
- **C11 Catalogue line position.** By name order (`apps/api/src/modules/tool-registry/catalog.service.ts` line 436). See section 3.

## 2. Facts checked and assumed

### Checked (repository on main at `e510387`)

- `units/GNP-09-myth-buster.md`: front matter lines 1 to 10 (`blocked_by` GNP-02, GNP-03, GNP-06; `unblocks` GNP-12, GNP-23; `parallel_with` GNP-05, 07, 08, 10, 11, 13); Spec lines 14 to 18; criteria lines 20 to 24.
- `units/README.md`: "Blocker notation" (`unblocks` is the inverse of `blocked_by`; `parallel_with` is symmetric). `units/GNP-12-workhorses-gate.md` line 7 and `units/GNP-23-remix.md` line 7 name GNP-09 in `blocked_by`. GNP-05, 07, 08, 10, 11 and 13 name GNP-09 in `parallel_with`. Consistent.
- `modules/genre-packs.md`: lines 44 to 46 (names, descriptions, prompt templates), 51 (`sourcesUsed`), 56 to 66 (common inputs, entity inputs), 76 (`claim` row), 82 (content interfaces), 84 to 90 (testing principles, line 84 heading).
- `plans/GNP-08.md`: read in full (status `planned`). Its shared-file steps are in section 3.
- `plans/GNP-02.md` lines 20 to 34 (D4 to D18) and section 5 line 133 (GNP-09's kind check comes from the executor, and GNP-09's own test covers it).
- `plans/GNP-07.md` lines 23 to 40 (N2, C1 to C10) and procedure lines 222 to 237.
- `plans/GNP-06.md` line 177; `plans/GNP-11.md` line 225 (both agree with this unit).
- Status `done` on main: `plans/GNP-02.md`, `GNP-03`, `GNP-04`, `GNP-05`, `GNP-06`, `GNP-07`, `GNP-11`.
- `plans/PLT-02.md` front matter (format).
- `packages/packs/nonfiction/tools/cold_open.yaml`: the five common-input blocks (lines 7 to 33) and the prompt skeleton. `packages/packs/nonfiction/tools/` holds only `cold_open.yaml`; no `.gitkeep` there, so nothing is deleted.
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` (line 35), `DESCRIPTION_LIMIT` (line 44), `VERBS` (line 48, contains `state`), `checkCommonInputs` (from line 192), `firstWord` (lower-cases the first word) and `checkDescription` (from line 236).
- `packages/packs/test/real-packs.test.ts`: `real packs` > `the suite passes on the real packs`.
- `scripts/lint-packs.mjs`: runs `apps/api/dist/modules/tool-registry/pack-lint.js`, so the API build comes first.
- `apps/api/src/modules/tool-registry/executor.service.ts` `prepare`: step 3 (lines 123 to 150) checks each entity ref's kind against the field's `x-scriba-entity-kinds`, returns 422 `TOOL_ENTITY_KIND_MISMATCH`, and sets `sources` to the unique non-style refs (lines 149 and 150).
- `apps/api/src/modules/tool-registry/validate.ts`: entity refs in field order, list items in order (lines 100 to 125); `argsInvalid` writes `- <field>: <message>.` per issue (lines 218 to 240); `minItems` supported (line 187).
- `apps/api/src/modules/tool-registry/lint.ts`: entity-kinds rules (lines 420 to 490, 825 to 835); `template-unused` warning for a required input the prompt does not use (line 817).
- `apps/api/src/modules/tool-registry/template.ts` `formatCatalogEntry` (lines 557 to 568): `- <name>: <description> Output: <kind>. Inputs: <key> (<type>, single|list, required|optional); ...`, ports only. `catalog.service.ts` line 436 sorts the names.
- `apps/api/test/packs/golden.kit.ts`: exports `PACKS_ROOT`, `GOLDEN_ROOT`, `UPDATE_GOLDENS`, `goldenCase`, `runGoldenCase`, `GoldenRunResult`; `post` is not exported. `cold-open.test.ts`: the `renderedPrompt` helper and the `it` shape. `golden-harness.test.ts`: no folder enumeration. `nonfiction-entity-types.test.ts` line 99: boots the app on the real packs. `core-gate.test.ts`: finds `propose_graph` by name only.
- `apps/api/test/tool-registry-executor.test.ts`: the wrong-kind case (b) (`TOOL_ENTITY_KIND_MISMATCH`, zero mock records) and its `openApp` pattern.
- `apps/api/vitest.config.mts`: `include: ['test/**/*.test.ts']`; `SCRIBA_UPDATE_GOLDENS` is set from `process.argv.includes('--update-goldens')`.
- `apps/api/test/fixtures/packs/nonfiction/tools/myth_buster.yaml`: a test fixture with the same name. It is read only by tests that pass the fixture root (`tool-registry-executor`, `-loader`, `-save`, `-read-enable`, `agent-loop-narrative`). Nothing reads `packages/packs` for it. No conflict. Not changed.
- `packages/packs/nonfiction/entity-types/claim.yaml` (`statement`, `evidence` of kind `source`, `status`); `concept.yaml`, `person.yaml`; `packages/packs/core/entity-types/source.yaml`, `style-profile.yaml`.
- `packages/packs/test/golden/propose_graph/recipe.golden.json`: the catalogue is in the `content` string of the user message, which is one JSON line; `story.golden.json` has no catalogue.
- `e2e/fixtures/mock-openai/server.mjs` (loads every `.json` in `scenarios/`, lines 18 to 19 and 52 to 83); `e2e/fixtures/mock-openai/test/mock-openai.test.ts` line 72; `apps/api/test/providers-client.kit.ts` (`/__mock/scenarios/<name>/requests`, lines 66 and 76). `e2e/fixtures/mock-openai/scenarios/pack-cold_open.json` is the pattern. No `pack-myth_buster.json` exists yet.
- `scripts/eval-cases.test.mjs` (read in full): test at line 34 (`AC 3: the cold-open eval case ...`); constants `CASE_KEYS`, `EXPECT_KEYS`, `RUN_END_REASONS`, `CITATION_MODES`; `loadCases`. `scripts/eval-agent/README.md`: case keys and values; the run needs a model and is not in CI. `scripts/eval-agent/cases/` holds `cold-open.json` and `summarize-outline.json`.
- `examples/samples.yaml` id `nonfiction`. `examples/nonfiction/entities/hours-figure-is-average.md` and `plateau-is-reorganising.md` are `type: claim`.
- `e2e/specs/tools-preview.e2e.ts` selects rows by `data-tool` and `data-origin` and asserts no count of all rows.
- Root `package.json`: `test` (`node --test 'scripts/*.test.mjs'` and the workspaces), `lint` (includes `lint:packs` and `prettier --check .`). `packages/packs/package.json` `test` (builds contracts and API, then `vitest run`). `apps/api/package.json` `test` (`build && vitest run`), `lint`. `e2e/package.json` `test` (`vitest run`).
- Worktrees (filesystem listing of `/Users/bbartolome/workspace/scriba-prototype-wt`; not touched): `GNP-01`, `GNP-08`, `PST-15`, `SAU-13`, `TRG-07`.
- Other references to myth-buster, read only: `units/GRR-16-sample-recipe.md` line 19, `units/GRR-17-canvas-gate.md` line 30, `units/TRG-17-editor-ui-gate.md` line 18, `units/AGL-11-narrative-gate.md` lines 21 and 25, `units/GNP-12-workhorses-gate.md` line 27.

### Assumed (each one is checked by the step named)

- **A1** Node v26.x and npm 11.x are on the PATH (step 1).
- **A2** `sourcesUsed` is `['notes-a', 'claim-a', 'claim-b']` (step 6).
- **A3** `{{length}}` renders `800`, because Ajv applies the default (step 6; as `plans/GNP-07.md` A9).
- **A4** `lint.ts` gives no error for the spec; a warning may print (step 11).
- **A5** The catalogue line is the one in step 8 (step 8 reads it from the regenerated golden).
- **A6** `npx vitest run <file> -- --update-goldens` sets the flag in `vitest.config.mts` (step 6; the golden status is `written`).
- **A7** The entity-kind hint on a list field applies to each item (step 7 and the AC 3 test).
- **A8** `{{entity this}}` inside `{{#each}}` renders the entity with its ID (step 6).

## 3. Shared files with GNP-08

Both units add files at new paths; the paths of section 4 and GNP-08's section 3 do not overlap. Three shared files: the recipe golden, the eval-cases test file, and (only by convention) the eval case folder. The rule for each:

1. **`packages/packs/test/golden/propose_graph/recipe.golden.json`.** Each tool unit adds one catalogue line to the `content` of the user message (one JSON line). Name order: `cold_open` (main), `mystery_question` (GNP-08), `myth_buster` (this unit), `numbers_to_people` (GNP-10), `propose_graph`. The golden is never merged by hand: after a rebase, the implementer runs step 8 again on the base as it is. Whichever of the two units merges second regenerates the golden. Both orders give the same file.
2. **`scripts/eval-cases.test.mjs`.** Each unit appends one `test` after the last existing `test`, under its own name. No existing test is changed or renumbered. On a textual conflict at the end of the file, keep every test on the base, then add this one. The file then holds GNP-07's test, then the others in merge order. The count: 2 tests with GNP-07 only; 3 with GNP-08 (or GNP-10) on the base.
3. **Names.** This unit: `myth_buster.yaml`, `pack-myth_buster.json`, `myth-buster.json`, `myth-buster.test.ts`, case `belief-claims`. GNP-08: `mystery_question.yaml`, `pack-mystery_question.json`, `mystery-question.json`, `mystery-question.test.ts`, case `puzzle-finding`. No name is shared.

Note for GNP-08 (not changed here): its procedure step 12 says the eval file passes "with two tests". If this unit lands first, the count is three. GNP-08's implementer should read the count from the file on the base.

Either order applies cleanly: the second unit to merge rebases, applies rule 1 or 2, and reruns its own steps 8 and 13.

## 4. Files to change

| Path | Change | Reason |
|---|---|---|
| `packages/packs/nonfiction/tools/myth_buster.yaml` | new | the tool spec (step 2) |
| `packages/packs/test/golden/myth_buster/belief-claims.fixture.json` | new | the case's arguments and entities (step 3) |
| `packages/packs/test/golden/myth_buster/belief-claims.golden.json` | new, written by step 6 | the recorded request |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by step 8 | the catalogue gains the `myth_buster` line (D4, C11) |
| `e2e/fixtures/mock-openai/scenarios/pack-myth_buster.json` | new | one scripted reply (step 4) |
| `apps/api/test/packs/myth-buster.test.ts` | new | the tests of AC 2 and AC 3 (step 5) |
| `scripts/eval-agent/cases/myth-buster.json` | new | the eval case (step 9) |
| `scripts/eval-cases.test.mjs` | one `test` appended; existing tests unchanged | the test of AC 4 (step 10) |

Not changed: `units/**`, `modules/**`, `plans/**` (except this plan), `plans/DECISIONS.md`, `packages/packs/test/checks.ts`, `packages/packs/test/real-packs.test.ts`, `packages/packs/test/golden/propose_graph/story.golden.json`, `packages/packs/test/golden/cold_open/**`, `packages/packs/nonfiction/entity-types/**`, `apps/api/src/**`, `apps/api/test/packs/golden.kit.ts`, `apps/api/test/fixtures/**` (including the fixture `myth_buster.yaml`), `scripts/eval-agent/run.mjs`, `scripts/eval-agent/README.md`, `e2e/**` specs, `examples/**`, `package-lock.json`, and the GNP-08 files and branch.

## 5. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. The implementer creates the branch with `git switch -c unit/GNP-09` from main. Record `node -v` and `npm -v` with the results. Do not push. Do not use `git add -A` or `git commit -a`.

**Step 0. Base.** Seam: filesystem and read-only git. `git rev-parse --short HEAD` (expected `e510387` or a later main). `test ! -e packages/packs/nonfiction/tools/myth_buster.yaml` exits 0. `ls packages/packs/nonfiction/tools` lists only `cold_open.yaml` and, if GNP-08 has merged, `mystery_question.yaml`. `ls packages/packs/test/golden/propose_graph` lists four files. If a check fails, re-read the changed files before editing.

**Step 1. Runtime and build.** Seam: TypeScript build. `npm ci` if `node_modules/` is absent. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Expected: exit 0 (A1).

**Step 2. Tool spec (U1 to U3, M1 to M3, M6, M7, C2, C3).** Seam: pack lint, checked in step 11. Create `packages/packs/nonfiction/tools/myth_buster.yaml` with this content, then `npx prettier --write` on it. The five common-input properties are copied from `cold_open.yaml`.

```yaml
schemaVersion: 1
name: myth_buster
description: State a common belief, then take it apart with evidence.
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
    belief:
      type: string
      title: Belief
      x-scriba-type: text
      x-scriba-port: true
    claimIds:
      type: array
      title: Claims
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [claim]
  required: [coreIdea, belief, claimIds]
output: draft
enabled: true
prompt: |
  You write a nonfiction passage that states a common belief and takes it apart with evidence.

  Core idea: {{coreIdea}}
  Belief: {{belief}}
  Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}
  Material:
  {{#each claimIds}}
  {{entity this}}
  {{/each}}
  {{#each entityIds}}
  {{entity this}}
  {{/each}}
  {{#if styleProfile}}
  {{entity styleProfile}}
  {{/if}}

  Steps:
  1. State the belief fairly: give it in the words above, in the form people most often hold it.
  2. Show why people hold it: say what makes the belief persuasive, using only the material.
  3. Take it apart claim by claim: for each claim in the material, say what the evidence shows and where it stops.
  4. Say what is true instead: end on what the material supports, and tie it to the core idea in plain words.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

**Step 3. Fixture (D1, D6, C5, C7).** Seam: the golden fixture, parsed by `toolCallRequestSchema` in step 6. Create `packages/packs/test/golden/myth_buster/belief-claims.fixture.json`, then `npx prettier --write` on it.

```json
{
  "arguments": {
    "coreIdea": "Expertise comes from deliberate practice with feedback, not from a fixed number of hours.",
    "entityIds": ["notes-a"],
    "styleProfile": "style-a",
    "belief": "Ten thousand hours of practice make anyone an expert.",
    "claimIds": ["claim-a", "claim-b"]
  },
  "entities": [
    {
      "ref": "notes-a",
      "type": "source",
      "path": "sources/notes-a.md",
      "content": "Notes A say that the ten-thousand-hour figure is an average, and that individuals varied within each group."
    },
    {
      "ref": "claim-a",
      "type": "claim",
      "path": "entities/claim-a.md",
      "content": "Claim A says that the hours of practice alone did not predict the level that people reached."
    },
    {
      "ref": "claim-b",
      "type": "claim",
      "path": "entities/claim-b.md",
      "content": "Claim B says that the people who reached the top also practised with a teacher setting the task."
    },
    {
      "ref": "style-a",
      "type": "style-profile",
      "path": "entities/style-a.md",
      "content": "---\ntype: style-profile\ntone: Plain and direct\ntargetLength: 800\nbannedPhrases: [game-changer]\n---\n\nSay what the evidence shows, and say where it stops."
    }
  ]
}
```

The arguments omit `length` and `tone`, so the default applies (A3).

**Step 4. Scenario (D5).** Seam: the mock OpenAI server, which loads each `.json` in `scenarios/` (checked in step 13). Create `e2e/fixtures/mock-openai/scenarios/pack-myth_buster.json`, then `npx prettier --write` on it.

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["Ten thousand hours do not make anyone an expert on their own [@claim-a]."]
      }
    }
  ]
}
```

**Step 5. Test file (AC 2, AC 3, C7, C8).** Seam: `POST /api/tool-registry/tools/:name/execute` on the composed app (`createTestApp`, `SCRIBA_PACKS_DIR` = `packages/packs`), with the mock. Create `apps/api/test/packs/myth-buster.test.ts`:

- Imports `expect` and `it` from `vitest`; `goldenCase`, `type GoldenRunResult` and `PACKS_ROOT` from `./golden.kit`; copies the `renderedPrompt` helper of `cold-open.test.ts`. No `any`. The file does not contain the text `examples/`.
- **AC 2 `it`** (timeout 60000): `goldenCase({ tool: 'myth_buster', name: 'belief-claims', expect: { kind: 'draft', sourcesUsed: ['notes-a', 'claim-a', 'claim-b'] }, invalidWithout: 'belief', check })`. `check` asserts that the rendered prompt contains `notes-a`, `claim-a`, `claim-b`, `style-a`, `[@`, `TK (`, `Belief: Ten thousand hours of practice make anyone an expert.`, `Length: 800 words` and `game-changer`.
- **AC 3 `it`** (timeout 60000): opens its own app as `runGoldenCase` does (the mock's scenario `pack-myth_buster`, the same provider config, `makeLibrary`, `createTestApp` with `env: { SCRIBA_PACKS_DIR: PACKS_ROOT }`, `sessionCookie`, `send` with `LOOPBACK_HOST` and `LOOPBACK_ORIGIN`). Then:
  - (a) `claimIds: ['claim-a']` with `claim-a` of type `claim`, plus `coreIdea` and `belief`: HTTP 200, output kind `draft`.
  - (b) `claimIds: ['notes-a']` with `notes-a` of type `source`: HTTP 422, code `TOOL_ENTITY_KIND_MISMATCH`, message contains `notes-a`, `claimIds` and `claim`.
  - (c) `claimIds: ['concept-a']` with `concept-a` of type `concept`: HTTP 422, code `TOOL_ENTITY_KIND_MISMATCH`.
  - (d) `recordsOf(mock, 'pack-myth_buster')` has length 1: only (a) reached the model.
  - In `finally`: close the app and the mock; `rmSync` the library.

**Step 6. Update run (D9, A6, A8).** Seam: the golden helper's update mode. `cd apps/api && npx vitest run test/packs/myth-buster.test.ts -- --update-goldens` exits 0 and writes `packages/packs/test/golden/myth_buster/belief-claims.golden.json`. Read it: `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft` (`executor.service.ts`); the user message contains the step-5 strings, `Length: 800 words.` (A3) and the IDs, and does not contain `Tools for a recipe`. Then `npx prettier --write packages/packs/test/golden/myth_buster`. If vitest rejects this form, stop and report it.

**Step 7. Compare run (D8).** Seam: golden comparison by value. `cd apps/api && npx vitest run test/packs/myth-buster.test.ts` shows 2 tests passed, and the golden status is `match`.

**Step 8. Catalogue golden (D18, C11, A5).** Seam: `{{toolCatalog}}` in the `propose_graph` recipe golden. `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens`, then `npx prettier --write packages/packs/test/golden/propose_graph`. The `content` is one JSON line, so check it with `node`: parse the file, and the version at `HEAD` (`git show HEAD:packages/packs/test/golden/propose_graph/recipe.golden.json`), take the content of the user message (the one that holds `Tools for a recipe:`), split it by newline and compare. Expected: exactly one added line, starting with `- myth_buster:`, placed after the `cold_open` line (and after `mystery_question` when GNP-08 is on the base), before `propose_graph`. The story golden does not change. The line is:

`- myth_buster: State a common belief, then take it apart with evidence. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); belief (text, single, required); claimIds (entity, list, required).`

Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0.

**Step 9. Eval case (AC 4, C10).** Seam: the eval data, which step 10 reads. Create `scripts/eval-agent/cases/myth-buster.json`, then `npx prettier --write` on it.

```json
{
  "sample": "nonfiction",
  "intent": "Bust the myth that ten thousand hours of practice make anyone an expert, using my notes.",
  "expect": {
    "reason": "completed",
    "tools": ["myth_buster"],
    "citations": "present"
  }
}
```

**Step 10. Eval-data test (AC 4, C9).** Seam: `scripts/eval-cases.test.mjs`, which reads the case files and runs no model. Append one `test` after the last existing `test` (section 3, rule 2), named `AC 4: the myth-buster eval case is in the eval data and uses the documented keys and values`. It calls `loadCases()`, finds the case with id `myth-buster`, and asserts: every key of the file is in `CASE_KEYS`; every `expect` key is in `EXPECT_KEYS`; `reason` is in `RUN_END_REASONS`; `citations` is in `CITATION_MODES`; `sample` is `nonfiction`; `intent` is a non-empty string; `expect.tools` deep-equals `['myth_buster']`; `expect.reason` is `completed`; `expect.citations` is `present`. Existing tests are unchanged. Then `npx prettier --write scripts/eval-cases.test.mjs`.

**Step 11. Pack checks (AC 1, A4).** Seam: `lintPacks` and `contentChecks` on the real packs (`packages/packs/test/real-packs.test.ts`), and the `lint-packs` CLI. `npm run lint:packs` exits 0 and no finding names `myth_buster`. `npm test -w @bbartolome/scriba-packs` exits 0.

**Step 12. API build, lint and pack tests (AC 2, AC 3).** Seam: the composed app booted on the real packs (`nonfiction-entity-types.test.ts` line 99). `npm run build -w @bbartolome/scriba-api && npm run lint -w @bbartolome/scriba-api` exit 0. `cd apps/api && npx vitest run test/packs/myth-buster.test.ts` shows 2 tests passed. `cd apps/api && npx vitest run test/packs` exits 0.

**Step 13. Eval test and format and root gates.** Seam: `node --test` and the mock-openai test. `node --test scripts/eval-cases.test.mjs` exits 0; the pass count is 2, or 3 when GNP-08 is on the base (section 3). `npx prettier --check packages/packs/nonfiction/tools/myth_buster.yaml packages/packs/test/golden/myth_buster packages/packs/test/golden/propose_graph e2e/fixtures/mock-openai/scenarios/pack-myth_buster.json apps/api/test/packs/myth-buster.test.ts scripts/eval-agent/cases/myth-buster.json scripts/eval-cases.test.mjs` exits 0. From the root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0; an unrelated failure on the base is reported, not fixed. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario. The Playwright `tools-preview` spec is not required: it selects rows by tool and origin. Run it only if the browser is installed; otherwise record it as not run.

**Step 14. Commit (implementer only, when the orchestrator asks).** `git add` each path of section 4 by name. `git diff --cached --stat` lists only those paths, and no `plans/` or `units/` file. Commit with `feat(GNP-09): myth_buster nonfiction draft tool, golden case and eval case`. Do not push.

## 6. Tests

Each acceptance criterion has exactly one test. The text is copied from `units/GNP-09-myth-buster.md`, lines 21 to 24. Nothing is marked passed in this plan.

**AC1: Passes `npm run lint:packs` and the content-check suite.**
- Test file: `packages/packs/test/real-packs.test.ts` (existing, unchanged). Test name: `real packs > the suite passes on the real packs`.
- Command: `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (step 11).
- Pass: both exit 0; no finding names `myth_buster`.

**AC2: Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.**
- Test file: `apps/api/test/packs/myth-buster.test.ts` (new). Test name: `AC 2: the myth_buster golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, sourcesUsed leaves out the style profile, and invalid arguments return Ajv's readable error`.
- Command: `cd apps/api && npx vitest run test/packs/myth-buster.test.ts -t "AC 2"` (steps 5 to 7).
- Pass: golden `match`; kind `draft`; `sourcesUsed` `['notes-a', 'claim-a', 'claim-b']`; the call without `belief` returns 422 `TOOL_ARGS_INVALID` with a message that contains `belief`; one model call; the `check` passes.

**AC3: Only `claim` entities are accepted on `claimIds` (wrong kind → `TOOL_ENTITY_KIND_MISMATCH`).**
- Test file: `apps/api/test/packs/myth-buster.test.ts` (new). Test name: `AC 3: only claim entities are accepted on claimIds, and a source or a concept there is refused with TOOL_ENTITY_KIND_MISMATCH`.
- Command: `cd apps/api && npx vitest run test/packs/myth-buster.test.ts -t "AC 3"` (step 12).
- Pass: step 5's cases (a) to (d): the claim is accepted (200); the source and the concept are refused (422, `TOOL_ENTITY_KIND_MISMATCH`); one model record in total.

**AC4: A manual eval case (small and larger local model) is added to the Agent loop's eval script data.**
- Test file: `scripts/eval-cases.test.mjs` (one new test). Test name: `AC 4: the myth-buster eval case is in the eval data and uses the documented keys and values`.
- Command: `node --test scripts/eval-cases.test.mjs` (step 13).
- Pass: the test passes. The run with a small and a larger local model is not run here (open point 1).

## 7. Agreement with downstream units

- **GNP-12 (workhorses gate; `blocked_by` names GNP-09, `units/GNP-12-workhorses-gate.md` line 7).** It needs: `myth_buster` shipped as a draft and enabled (its demo step 5, "bust the myth that ..."); the five common inputs identical to the other drafts (its criterion 1, which is AC 1); its golden test passing (its criterion 2, which is AC 2); the eval case in the eval data, which its "done when" reads with a real model (its criterion 4, which is AC 4; the real run is open point 1). The plan provides all of these. Agreed; GNP-12 is not changed.
- **GNP-23 (remix; `blocked_by` names GNP-09, `units/GNP-23-remix.md` line 7).** It needs `myth_buster` in its `targetShape` enum, which requires the name `myth_buster`, `output: draft`, `enabled: true`, and the file in `packages/packs/nonfiction/tools/`. The plan provides all of these. Agreed; GNP-23 is not changed.
- **Informative, not blockers.** `units/GRR-16-sample-recipe.md` line 19 chains myth-buster "on its text ports"; this tool's text ports are `coreIdea` (required) and `belief` (required), and its entity port is `claimIds`. `units/GRR-17-canvas-gate.md` line 30 drops claim chips on the myth-buster's entity port; `claimIds` accepts claims. `units/AGL-11-narrative-gate.md` line 25 disables myth-buster and asks for one; the tool's `enabled` switch is provided. `units/TRG-17-editor-ui-gate.md` line 18 needs it as a shipped nonfiction tool; provided.
- **GNP-08 and GNP-10 (parallel).** Section 3.
- **GNP-06 and GNP-11 (done).** Their plans agree (`plans/GNP-06.md` line 177; `plans/GNP-11.md` line 225).

## 8. Open points

1. **AC 4, the run with a small and a larger local model, is not run here.** Cause: it needs a local model server (`scripts/eval-agent/README.md`), and it is not part of CI. The local check is the data test (as `plans/GNP-07.md` C9). Owner: whoever runs the eval; GNP-12's "done when" reads this case with a real model.
2. **An empty `claimIds` list passes validation.** Cause: the unit says `required` and sets no minimum; `validate.ts` supports `minItems`. This plan adds no `minItems` (C4). Question for the unit author: should an empty claim list be refused? If yes, `claimIds` gains `minItems: 1` and the AC 3 test gains one refusal case. No other file changes.

Sections complete: front matter, and sections 1 to 8 (decisions, facts and assumptions, shared files with GNP-08, files, procedure, tests, downstream agreement, open points). All four acceptance criteria have one test each.
