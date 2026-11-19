---
id: GNP-16
status: done
---
# GNP-16 plan — dialogue tool, golden tests and eval case

Batch: [GNP-16] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `7f58c59` (HEAD when read; the working tree was clean). The unit file was read in full (lines 1 to 24). It has no change note: `units/GNP-16-dialogue.md` has no "Moved to", "Removed by revision", "Loosened by" or "Reworded by" line, and neither do its blockers (`units/GNP-02-golden-harness.md`, `units/GNP-13-fiction-entity-types.md`) or its downstream units (`units/GNP-18-fiction-sample.md`, `units/GNP-19-fiction-gate.md`, `units/GNP-23-remix.md`) (checked by grep). `plans/DECISIONS.md` has no line that names GNP-16 or "dialogue" (checked by grep).

The planner changed no file except this one, committed nothing except this one, and ran no build, test, lint or npm command.

Revised by the Opus reviser at main `c2225ee` (the draft commit is `d13d636`; the three later commits `08d2685`, `03cf287` and `c2225ee` change only `plans/DECISIONS.md` and `plans/GNP-15.md`; the working tree was clean). The reviser checked the facts of section 2 against the files, corrected the state of GNP-15 (it is back to `status: draft`), made step 9 and the merge-order rule independent of the merge order, marked A3 and A6 as checked, and decided open points 1 to 3 (no unit or module change; none is in the way of this plan). The reviser made no unit change, ran no build, test, lint or npm command, and changed no file except this one.

## 1. Decisions this plan obeys

Labels: **U** = the unit; **M** = `modules/genre-packs.md`; **D** = a settled decision of `plans/DECISIONS.md` or of another plan; **C** = a smaller choice made here (the simplest option, recorded).

- **U1 Tool and output.** `packages/packs/fiction/tools/dialogue.yaml`, output `draft`, `enabled: true`. Source: unit line 15; module line 52 (output kinds).
- **U2 Description.** Verbatim: "Write an exchange between characters, each in their own voice." Source: unit line 16. It is 62 characters (under `DESCRIPTION_LIMIT` 120, `packages/packs/test/checks.ts` line 44) and starts with `write`, which is in `VERBS` (checks.ts line 58). Source of the rule: module line 45.
- **U3 Inputs.** The five common inputs, then `characterIds` (entity port list, kind `character`, `minItems` 2, required), `sceneText` (text port), and `subtext` and `goal` (params). Source: unit line 17. The common inputs are the table of module lines 56 to 64 (rows at lines 60 to 64).
- **U4 Prompt.** The skeleton of module lines 46 to 50: a role line; the material, each entity rendered with its ID; the shape steps; the constraints. The shape steps are unit line 18: render each character's full entity (`voice` and `relationships` included) through `{{#each characterIds}}` and `{{entity this}}`; give each speaker distinct diction and keep to the relationship notes; carry the subtext under the lines. All four constraints of module line 50 apply, because this is a draft tool (module line 54: first drafts).
- **U5 Criteria.** Four criteria, copied in section 5. Source: unit lines 21 to 24.
- **M1 Common inputs of draft tools.** Each of the five must equal the first draft tool's in its schema, its hints and its `required` flag. `checkCommonInputs` (`packages/packs/test/checks.ts` lines 192 to 221, the rule of line 177) compares with the first draft in pack order, which is `packages/packs/nonfiction/tools/cold_open.yaml`. Source: module lines 56 to 64; checks.ts lines 96 to 98.
- **M2 Entity kinds.** `characterIds` takes `x-scriba-entity-kinds: [character]`, because it means a definite set of kinds (module line 66; unit line 17). `entityIds` takes no kinds hint, as in `cold_open` (DECISIONS lines 5144 to 5150 and 5156 to 5161, the Navigator decisions on `entityIds`). The kind `character` is shipped by `packages/packs/fiction/entity-types/character.yaml` (line 2), so the promotion of checks.ts lines 86 to 95 passes.
- **M3 Scene content on text ports.** `sceneText` is a text port (module line 53). `subtext` and `goal` are params (open point 4).
- **M4 sourcesUsed.** Computed from the entity inputs in argument order, with the style profile left out (module line 51; `executor.service.ts` lines 159 to 161, `!ref.style`). The entity refs are collected in field order (`validate.ts` lines 108 to 132; `inputs.ts` lines 147 to 158), so `sourcesUsed` is `entityIds`, then `characterIds`, with duplicates removed (`unique`, executor line 238).
- **M5 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if}}` and `{{entity id}}` (module line 46). `{{entity this}}` is allowed only inside `{{#each}}` (`apps/api/src/modules/tool-registry/template.ts` lines 345 to 358).
- **M6 Golden convention.** One scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`; fixtures and goldens under `packages/packs/test/golden/<tool>/`; the helper `goldenCase` of `apps/api/test/packs/golden.kit.ts`; the update flag `--update-goldens`. A golden changes only in the PR of the prompt edit. Source: module line 87; `plans/GNP-02.md` D4, D9, D10 (lines 20, 25, 26).
- **M7 Catalogue.** `{{toolCatalog}}` renders every valid and enabled built-in tool, so this PR adds one line to the recipe golden of `propose_graph` and regenerates it in the same PR. Source: `plans/GNP-02.md` D18 (line 34).
- **M8 Eval cases.** A manual eval case per tool goes into the Agent loop's eval data; nothing runs it in CI. Source: module line 90; `units/README.md` line 139; unit line 24. The reading that a data test meets the criterion is the Navigator's (`plans/DECISIONS.md` lines 5219 to 5222, option a).
- **M9 System seam.** "The Playwright e2e is unchanged; this module adds no e2e step" (module line 89). This plan changes no file under `e2e/specs`; step 14 runs the existing `/tools` specs once as a check.
- **D1 Blockers.** GNP-02 is `status: done` (`plans/GNP-02.md` line 3). GNP-13 is `status: done` (`plans/GNP-13.md`, front matter). Both are on main.
- **D2 Required inputs.** `coreIdea` and `characterIds` are required (unit line 17; module line 60). The prompt uses both, so the template lint's `template-unused` warning (`apps/api/src/modules/tool-registry/lint.ts` line 817) does not fire.
- **D3 Tool name.** The name equals the file stem: `dialogue` and `dialogue.yaml` (`plans/GNP-14.md` D4).
- **D4 Ajv `minItems`.** The validator is strict Ajv with all errors (`validate.ts` lines 36 to 38), it supports `minItems` (line 187), and its readable message is `expected at least 2 items, received [...]` under the field line `- characterIds: ...` (lines 187 to 188; `fieldOf`, lines 252 to 261).
- **C1 Names.** Tool `dialogue`; fixture case `keepers-exchange`; scenario `pack-dialogue.json`; golden test file `apps/api/test/packs/dialogue.test.ts`; eval case id `dialogue`; data test `scripts/eval-case-dialogue.test.mjs`. One data test file per unit, so the parallel fiction units do not share a data test (as GNP-15 C1 does).
- **C2 Property order.** `coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`, `characterIds`, `sceneText`, `subtext`, `goal`. This order fixes the catalogue line (ports in property order, `template.ts` lines 557 to 568) and the order of `sourcesUsed`.
- **C3 invalidWithout.** `coreIdea`, the common required input that the kit drops for the invalid call (`plans/GNP-02.md` line 133 names `coreIdea` for the common inputs of the nonfiction tools). The one-character call is a second call (C4).
- **C4 The one-character call.** The kit makes one invalid call (`golden.kit.ts` lines 203 to 211). `plans/GNP-02.md` line 134 says that GNP-16 writes its own second call. The test file does this with the pattern of `apps/api/test/packs/myth-buster.test.ts` lines 89 to 177. `golden.kit.ts` is not edited.
- **C5 Two `it`s, one per criterion.** Criterion 2 is one `it` with `goldenCase` and a `check` for the IDs, the citation and the placeholder. Criterion 3 is one `it` that runs `goldenCase` with a `check` for the voices, the relationships and the distinct-voice instruction, and then makes the one-character call. Both use one fixture and one golden. Each `it` makes the valid request once, so the same request is made in two tests, with two app boots. This is accepted.
- **C6 Fixture.** Original text. Characters `nell-carrow` (the terse keeper) and `pim-dorey` (the talkative relief keeper); place `skerry-light`; style profile `plain-spoken`. No real person is named.
- **C7 Helper.** `renderedPrompt` is copied from `apps/api/test/packs/character-world-builder.test.ts` lines 4 to 21. No shared helper changes.
- **C8 Eval intent and keys.** The intent names no entity ID, because GNP-18 has not fixed the IDs of the fiction sample (the GNP-14 choice C8). `expect.citations` is left out, as in GNP-15 C8: module line 90 asks for citation presence for the workhorses only. `expect` is `reason` and `tools`. `sample: fiction` names the sample that GNP-18 adds to `examples/samples.yaml` (`scripts/eval-agent/README.md` line 51); until then the manual run of this case cannot start, which the data test does not need (the GNP-14 cases `character-builder.json` and `world-builder.json` on main do the same).
- **C9 Catalogue line.** The text of section 3.6. Its position is between `cold_open` and `mystery_question`, because the catalogue is sorted with `[...names].sort()` (`apps/api/src/modules/tool-registry/catalog.service.ts` line 467).
- **C10 Distinct-voice check.** The test asserts the phrase `distinct diction`, the key phrase of step 2 of the template. This is the precedent of the GNP-14 test, which asserts the keyword `Contradictions` (`apps/api/test/packs/character-world-builder.test.ts` line 49). The golden holds the full text (open point 6).

## 2. Facts checked and facts assumed

### Facts checked

Unit and module, and the index:
- `units/GNP-16-dialogue.md`: front matter lines 2 to 9 (`blocked_by` line 7 `[GNP-02, GNP-13]`; `parallel_with` line 8 `[GNP-12, GNP-14, GNP-15, GNP-17]`; `unblocks` line 9 `[GNP-18, GNP-19, GNP-23]`); Spec lines 15 to 18; the criteria heading at line 20; criteria at lines 21 to 24.
- `modules/genre-packs.md`: line 22 (graph: GNP-16 under GNP-13), line 33 (parallelism), lines 46 to 50 (the skeleton), line 51 (`sourcesUsed`), line 52 (output kinds), line 53 (scene content on text ports), lines 56 to 64 (the common inputs), line 66 (entity inputs and kinds), line 85 (no wording assertions beyond golden snapshots), line 87 (golden tests), line 89 (system seam), line 90 (manual eval cases; "voice separation for Dialogue").
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65 (line 64: `unblocks` is the exact inverse of `blocked_by`, and `parallel_with` is symmetric); the `phase:fiction` row at line 108; testing at line 139.
- Inverse rule: `units/GNP-18-fiction-sample.md`, `units/GNP-19-fiction-gate.md` and `units/GNP-23-remix.md` each name GNP-16 in `blocked_by` (line 7 of each). `units/GNP-02-golden-harness.md` line 9 and `units/GNP-13-fiction-entity-types.md` line 9 name GNP-16 in `unblocks`.
- Symmetry: `parallel_with` of GNP-12 (line 8), GNP-14 (line 8), GNP-15 (line 8) and GNP-17 (line 8) each name GNP-16. GNP-18 (line 8) does not, because GNP-18 is blocked by GNP-16 (`units/GNP-18-fiction-sample.md` line 7).
- Transitivity (`units/README.md` line 64): GNP-16 depends on GNP-02, GNP-13 and, through them, GNP-01, PLT-04, PLT-12 and TRG-12. None of GNP-12, GNP-14, GNP-15 or GNP-17 is a dependency of GNP-16, and GNP-16 is not one of theirs.

Blockers and the state of main:
- Git: HEAD and `main` were `7f58c59` for the planner and are `c2225ee` for the reviser; `git status --short` prints nothing. No `unit/GNP-16`, `unit/GNP-17` or `unit/GNP-18` branch and no worktree for them exists (`git branch --list`, `git worktree list`).
- `packages/packs/fiction/tools/` holds `character_builder.yaml` and `world_builder.yaml` (GNP-14) and no `dialogue.yaml`. `packages/packs/fiction/entity-types/` holds `character.yaml`, `place.yaml` and `world-rule.yaml` (GNP-13).
- `packages/packs/test/golden/` has no `dialogue/` folder. `e2e/fixtures/mock-openai/scenarios/` has no `pack-dialogue.json`. `scripts/eval-agent/cases/` has no `dialogue.json`. `apps/api/test/packs/` has no `dialogue.test.ts`. `grep -rn dialogue packages apps e2e scripts examples` finds nothing.
- `packages/packs/nonfiction/tools/cold_open.yaml`: the five common inputs at lines 7 to 33 (`coreIdea` 7 to 12, `entityIds` 13 to 19, `styleProfile` 20 to 24, `length` 25 to 30, `tone` 31 to 33); `required: [coreIdea, person]` line 45; `output: draft` line 46.
- `packages/packs/fiction/tools/world_builder.yaml`: the list entity port with kinds, `ruleIds` (lines 7 to 14), and `required: [ruleIds]` (line 21). This is the precedent for `characterIds`.
- `packages/packs/test/golden/character_builder/keeper-seed.fixture.json`: the fixture format (`arguments`, and `entities` with `ref`, `type`, `path`, `content`).
- `packages/packs/test/golden/propose_graph/recipe.golden.json`: `messages[1].content` is one JSON string on one physical line. Its catalogue holds eight lines in this order: `character_builder`, `cold_open`, `mystery_question`, `myth_buster`, `numbers_to_people`, `propose_graph`, `throughline_check`, `world_builder`.
- `packages/packs/test/real-packs.test.ts` line 9: `it('the suite passes on the real packs')`, which asserts no error from `lintPacks` and `contentChecks(REAL_PACKS)` equal to `[]`.
- Root `package.json` line 28: `lint:packs` builds contracts and the API, then runs `node scripts/lint-packs.mjs`. `checks.ts` lines 24 to 29 load the pack-lint library from `apps/api/dist`.

Code on main:
- `apps/api/src/modules/tool-registry/validate.ts`: `createAjv` lines 36 to 38 (`allErrors`, `useDefaults`, `strict`); `objectSchema` lines 41 to 53 (`additionalProperties: false`; extension keys stripped); `validateArguments` lines 84 to 136; the entity refs of each field and each list item, in order, lines 108 to 132; Ajv errors to issues lines 103 to 105; the `minItems` message lines 187 to 188; the issue path is the Ajv `instancePath` (lines 161 to 164); the lead line and the field line lines 219 to 249.
- `apps/api/src/modules/tool-registry/inputs.ts`: `readInputs` lines 147 to 158 returns the fields in property order.
- `apps/api/src/modules/tool-registry/executor.service.ts`: `OUTPUT_SYSTEM_MESSAGES.draft` lines 31 to 33; the entity-kind check lines 136 to 158 (the kinds are `x-scriba-entity-kinds`, lines 145 to 149); `sources` lines 159 to 161; `unique` at line 238.
- `apps/api/src/modules/tool-registry/template.ts`: `{{entity this}}` only inside `{{#each}}` (lines 345 to 358); `renderEntity` lines 575 to 597, which returns `${type} ${ref} (${path})` and then the entity's `content` verbatim (line 596). A character's `voice` and `relationships` therefore reach the prompt through the fixture's content text. The catalogue line format is `formatCatalogEntry` lines 557 to 568.
- `apps/api/src/modules/tool-registry/catalog.service.ts` line 467: the names are sorted.
- `apps/api/src/modules/tool-registry/lint.ts`: `ARRAY` keywords at line 75 (`minItems`, `maxItems`, `uniqueItems`, `items`); the `template-unused` warning at line 817; the entity hints check, which requires `x-scriba-type: entity` for `x-scriba-entity-kinds` (lines 415 to 500).
- `packages/packs/test/checks.ts`: `contentChecks` lines 83 to 102; `COMMON_INPUTS` lines 35 to 41; `DESCRIPTION_LIMIT` line 44; `VERBS` lines 48 to 67 (`write` at line 58); `loadTools` lines 148 to 175 (packs in the order core, nonfiction, fiction; files sorted), so the first draft is `cold_open`; `checkCommonInputs` lines 192 to 221; `checkDescription` lines 236 to 257.
- `apps/api/test/packs/golden.kit.ts`: `PACKS_ROOT` line 29; `GOLDEN_ROOT` line 38; `UPDATE_GOLDENS` line 40; `GoldenRunOptions` lines 70 to 78; `runGoldenCase` line 126; the invalid call lines 203 to 211 (the fixture's entities, the arguments without `invalidWithout`); `goldenCase` lines 241 to 259 (the golden status line 250, `kind` 251, `sourcesUsed` 252, status 422 at 253, `TOOL_ARGS_INVALID` at 254, the message contains `invalidWithout` at 255, one model call at 256, then `check` at 257). The kit exports no helper for a second call.
- `apps/api/vitest.config.mts`: `include` is `test/**/*.test.ts` (line 8); the `env` mapping of `--update-goldens` to `SCRIBA_UPDATE_GOLDENS` is at lines 12 to 13.
- `apps/api/test/packs/character-world-builder.test.ts`: `renderedPrompt` lines 4 to 21; the `goldenCase` with a `check` lines 23 to 37; the `it` lines 55 to 58 with timeout 120000.
- `apps/api/test/packs/myth-buster.test.ts`: the second-call pattern of AC 3, lines 89 to 177 (`createTestApp` with `SCRIBA_PACKS_DIR`, `sessionCookie`, `post`, `startMockOpenAI`, `recordsOf`, `makeLibrary`, and `errorBodySchema` for the error body).
- `scripts/eval-agent/run.mjs` line 36 (`CASE_KEYS`: `sample`, `intent`, `expect`). `scripts/eval-cases.test.mjs` line 14 (`CASE_KEYS`) and line 15 (`EXPECT_KEYS`: `reason`, `tools`, `citations`).
- `scripts/eval-case-character-world-builder.test.mjs` (GNP-14): the pattern of the data test (read the case file, assert its keys and values, run no model).
- `e2e/fixtures/mock-openai/scenarios/pack-character_builder.json`: the scenario format (`steps`, `match` with `endpoint: chat`, `reply` with `kind: stream` and `deltas`).
- `e2e/specs/tools-preview.e2e.ts` line 23: `test.use({ viewport: { width: 1280, height: 3200 } })`, the GNP-14 choice C12 (`plans/GNP-14.md` line 51). `plans/GNP-14.md` line 466 says that 3200 leaves room for the rows of GNP-15, GNP-16 and GNP-17.
- Note from GNP-13 about `dialogue`: `plans/GNP-13.md` line 194 names `characterIds` as an entity port list of kind `character` with `minItems` 2, and states that the prompt renders each character's `voice` and `relationships`.

Plans and in-flight work:
- `plans/GNP-15.md`: `status: draft` (line 3) since `03cf287`. It was `planned` at `ddb608c`; its implementer stopped at its step 13 (the root `npm test`) on one intermittent apps/api failure, `test/tool-registry-save.test.ts` "C1: save on a built-in writes the user-pack file and never touches the packs root" (a ZodError; it passed alone and in a second root run), and a reviser replied NAVIGATOR on the gate rule (`plans/DECISIONS.md` lines 6745 to 6756). That question is open. Its section 3 file list and section 3.6 catalogue line are unchanged by `03cf287` (the diff from `ddb608c` is the status line only). Its branch `unit/GNP-15` has one commit, `f3ccbf2`, and six files (`git --no-pager diff --stat main...unit/GNP-15`): `packages/packs/fiction/tools/scene_builder.yaml`, `packages/packs/test/golden/scene_builder/lamp-room.fixture.json`, `packages/packs/test/golden/scene_builder/lamp-room.golden.json`, `packages/packs/test/golden/propose_graph/recipe.golden.json` (one line changed), `e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json` and `apps/api/test/packs/scene-builder.test.ts`. Its eval case and data test (its step 10) are not on the branch. Its section 3 table (lines 106 to 115) is the file list. Its section 6 (lines 359 to 363) already names the GNP-16 changes.
- `plans/GNP-14.md`, `plans/GNP-12.md`, `plans/GNP-02.md`, `plans/GNP-13.md`, `plans/GNP-20.md` and `plans/AGL-25.md` are `status: done`.
- Planned or draft plans other than GNP-15: `plans/GRR-15.md` (planned; its file list names only `e2e/specs/graph-*.e2e.ts` and no path of this plan) and `plans/CEX-14.md` (draft; no path of this plan). `grep` found no `packages/packs`, golden, eval or `e2e/specs/tools-preview` path in either.
- GNP-17 and GNP-18 have no plan file (`ls plans/`).

### Facts assumed

- **A1.** Node 26 and npm 11 are on the PATH, as the other plans state. Step 1 checks it.
- **A2.** `lint:packs` loads the pack-lint library from `apps/api/dist`, so the API must be built before it runs (checks.ts lines 24 to 29). Step 1 builds it.
- **A3 (checked by the reviser).** The mock reports zero recorded requests for a call that stops before the model (the one-character call): each scenario starts with `records: []` (`e2e/fixtures/mock-openai/server.mjs` lines 76 to 80), and `recordsOf` returns that list (`apps/api/test/providers-client.kit.ts` lines 61 to 69; `server.mjs` line 245). `validateArguments` throws before the executor reaches the model (`validate.ts` line 133). Step 8 confirms it.
- **A4.** Prettier leaves the YAML block scalar and the JSON files as written. Steps 2, 4, 5 and 10 check it.
- **A5.** The template parser accepts the layout of section 3.1, which follows the layout of `cold_open` and of GNP-15's spec. Step 3 checks it through the lint.
- **A6 (checked by the reviser).** The contracts' `toolSpecSchema` accepts `minItems` on an array property: its `inputs` is a loose record (`packages/contracts/src/tool-registry/spec.ts` lines 50 and 58), and the lint's `TYPE_KEYWORDS.array` allows `minItems` (lint.ts line 75). Step 3 confirms it through `npm test -w @bbartolome/scriba-packs`.
- **A7.** The rendered prompt lists the `characterIds` entities in argument order (`{{#each}}` over the array). Step 7 reads the golden.
- **A8.** The browser can run the `/tools` e2e specs here. If not, step 14 records "not run".

## 3. Files to change

Only the paths below change, with the content of 3.1 to 3.6. `plans/GNP-16.md` is written by the planner now and not changed by the implementer.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/fiction/tools/dialogue.yaml` | new | the tool spec (3.1, step 2) |
| `packages/packs/test/golden/dialogue/keepers-exchange.fixture.json` | new | the fixture (3.2, step 4) |
| `packages/packs/test/golden/dialogue/keepers-exchange.golden.json` | created by the update run (step 7) | the golden request |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by the update run (step 9): one inserted line | the catalogue gains `dialogue` (3.6) |
| `e2e/fixtures/mock-openai/scenarios/pack-dialogue.json` | new | the scripted reply (3.3, step 5) |
| `apps/api/test/packs/dialogue.test.ts` | new | the tests of criteria 2 and 3 (3.4, step 6) |
| `scripts/eval-agent/cases/dialogue.json` | new | the eval case (3.5, step 10) |
| `scripts/eval-case-dialogue.test.mjs` | new | the test of criterion 4 (3.5, step 10) |

Not changed: every file under `packages/packs/{core,nonfiction}/`; `packages/packs/fiction/{entity-types,tools/character_builder.yaml,tools/world_builder.yaml}`; `packages/packs/package.json`; `packages/packs/test/*.ts` and `packages/packs/test/README.md`; `packages/packs/test/golden/propose_graph/story.*`; `packages/packs/test/golden/{character_builder,world_builder,golden_probe,cold_open}/**`; `apps/api/src/**`; `apps/api/test/packs/golden.kit.ts` and the other packs tests; `apps/api/vitest.config.mts`; `apps/api/test/packs/propose-graph.test.ts`; `packages/contracts/**`; `e2e/specs/**`; `e2e/fixtures/mock-openai/server.mjs`; `scripts/eval-cases.test.mjs`; `scripts/eval-agent/run.mjs`, its README and its test; `examples/**` (GNP-18 owns them); `package.json`; `package-lock.json`; `.prettierignore`; `units/**`; `modules/**`; `plans/**` (except this file, which the planner owns).

### 3.1 The tool spec `packages/packs/fiction/tools/dialogue.yaml`

The five common-input blocks (`coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`) are copied byte for byte from `packages/packs/nonfiction/tools/cold_open.yaml` lines 7 to 33. The content check D8 (checks.ts lines 192 to 221) compares them, so copy them from that file and do not retype them.

```yaml
schemaVersion: 1
name: dialogue
description: Write an exchange between characters, each in their own voice.
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
    characterIds:
      type: array
      title: Characters
      items:
        type: string
      minItems: 2
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [character]
    sceneText:
      type: string
      title: Scene
      x-scriba-type: text
      x-scriba-port: true
      x-scriba-control: textarea
    subtext:
      type: string
      title: Subtext
    goal:
      type: string
      title: Goal
  required: [coreIdea, characterIds]
output: draft
enabled: true
prompt: |
  You write one exchange of dialogue in a fiction story: a short scene in which two or more characters speak, each in their own voice.

  Core idea: {{coreIdea}}
  {{#if goal}}Goal: {{goal}}
  {{/if}}{{#if sceneText}}Scene: {{sceneText}}
  {{/if}}{{#if subtext}}Subtext: {{subtext}}
  {{/if}}Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}
  Characters:
  {{#each characterIds}}
  {{entity this}}
  {{/each}}
  Material:
  {{#each entityIds}}
  {{entity this}}
  {{/each}}
  {{#if styleProfile}}
  {{entity styleProfile}}
  {{/if}}

  Steps:
  1. Give each character lines in the exchange, in the order the scene needs.
  2. Give each speaker distinct diction: their own word choice, sentence length and forms of address, as their voice notes say.
  3. Keep each speaker to the relationship notes: how they speak to each other character.
  4. Carry the subtext under the lines, so that what the characters do not say shows.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (the year the light was built). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

Then `npx prettier --write` on the file (step 2). The prompt text must not change under prettier.

### 3.2 The fixture `packages/packs/test/golden/dialogue/keepers-exchange.fixture.json`

```json
{
  "arguments": {
    "coreIdea": "Two keepers can disagree and still share the same light.",
    "entityIds": ["skerry-light"],
    "styleProfile": "plain-spoken",
    "length": 600,
    "tone": "spare",
    "characterIds": ["nell-carrow", "pim-dorey"],
    "sceneText": "Night. The supply boat is three weeks late. The two keepers sit at the table with the logbook open between them.",
    "subtext": "Each of them is afraid of being the first to say the boat will not come.",
    "goal": "Agree whether to send a signal to the mainland."
  },
  "entities": [
    {
      "ref": "nell-carrow",
      "type": "character",
      "path": "entities/nell-carrow.md",
      "content": "---\ntype: character\nname: Nell Carrow\nwant: To keep the light lit without help.\nneed: To accept that the light is shared.\nflaw: Pride in doing everything alone.\nvoice: Terse. Short sentences, no greetings, numbers before names.\nrelationships:\n  - character: pim-dorey\n    note: Her relief keeper. She tolerates his talk and does not answer it.\n---\n\nNell Carrow has kept the light for nineteen winters."
    },
    {
      "ref": "pim-dorey",
      "type": "character",
      "path": "entities/pim-dorey.md",
      "content": "---\ntype: character\nname: Pim Dorey\nwant: To be trusted with the light.\nneed: To stop filling silences.\nflaw: Talks when afraid.\nvoice: Talkative. Long run-on sentences, questions, first names for everyone.\nrelationships:\n  - character: nell-carrow\n    note: His senior keeper. He wants her approval and fills the silence she leaves.\n---\n\nPim Dorey arrived on the last supply boat and has not stopped talking since."
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

The expected `sourcesUsed` is `["skerry-light", "nell-carrow", "pim-dorey"]`: `entityIds` in argument order, then `characterIds`, with `plain-spoken` left out because it is a style ref (M4). The expected rendered prompt holds `Core idea: Two keepers can disagree and still share the same light.`, `Goal: Agree whether to send a signal to the mainland.`, `Subtext: Each of them is afraid of being the first to say the boat will not come.`, `Scene: Night.`, `Length: 600 words.` and `Tone: spare.`

Then `npx prettier --write` on the file (step 4).

### 3.3 The scenario `e2e/fixtures/mock-openai/scenarios/pack-dialogue.json`

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["Nell Carrow closed the logbook. Send the signal, she said. Pim Dorey began to answer, then stopped."]
      }
    }
  ]
}
```

Then `npx prettier --write` on it (step 5).

### 3.4 The golden tests `apps/api/test/packs/dialogue.test.ts`

- Imports: `rmSync` from `node:fs`; `expect` and `it` from `vitest`; `stringify` from `yaml`; `errorBodySchema` from `@bbartolome/scriba-contracts/platform`; `PROVIDER_DEFAULTS` from `@bbartolome/scriba-contracts/providers`; `TOOL_EXECUTE_ROUTE` from `@bbartolome/scriba-contracts/tool-registry`; `createTestApp` and `type TestApp` from `../create-test-app`; `send`, `sessionCookie` and `type Reply` from `../guard-request`; `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` from `../invariant-sweep`; `recordsOf` and `startMockOpenAI` from `../providers-client.kit`; `makeLibrary` from `../settings.kit`; `PACKS_ROOT`, `goldenCase` and `type GoldenRunResult` from `./golden.kit`.
- The helpers `renderedPrompt` (copied from `character-world-builder.test.ts` lines 4 to 21, C7) and `post` (copied from `myth-buster.test.ts` lines 47 to 62).
- **Golden case A** (`dialogue`, name `keepers-exchange`, `expect` `{ kind: 'draft', sourcesUsed: ['skerry-light', 'nell-carrow', 'pim-dorey'] }`, `invalidWithout` `coreIdea`). Its `check` asserts that the rendered prompt contains each of `skerry-light`, `nell-carrow`, `pim-dorey` and `plain-spoken`, the text `[@` and the text `TK (`.
- **Golden case B** (the same case, `expect` and `invalidWithout` as in A). Its `check` asserts that the rendered prompt contains `voice: Terse.` and `voice: Talkative.`, the two relationship notes (`She tolerates his talk` and `He wants her approval`), and the text `distinct diction`.
- **Test AC 2** is one `it` with timeout 120000 whose body is case A. Its name is in section 5.
- **Test AC 3** is one `it` with timeout 120000. Its body runs case B, then makes one more call: the fixture's arguments with `characterIds` reduced to `["nell-carrow"]`, the fixture's entities unchanged, through a new app and a new mock (the myth-buster pattern). It asserts: status 422; `error.code` is `TOOL_ARGS_INVALID`; `error.message` contains `characterIds` and `at least 2 items`; the new mock has recorded no request (`recordsOf` returns an empty list).
- The file has no `any` and does not contain the text `examples/`.

### 3.5 The eval case and its data test

`scripts/eval-agent/cases/dialogue.json`:

```json
{
  "sample": "fiction",
  "intent": "Write a short exchange for my lighthouse story where the two keepers argue about sending a signal about the late supply boat, each in their own voice.",
  "expect": {
    "reason": "completed",
    "tools": ["dialogue"]
  }
}
```

`scripts/eval-case-dialogue.test.mjs`: the imports and the `CASES` path helper of `scripts/eval-case-character-world-builder.test.mjs` (GNP-14), with the comment line changed to name this case. One `test(...)` with the name in section 5 (criterion 4). It reads `dialogue.json` and asserts: the keys are exactly `expect`, `intent`, `sample`; the keys of `expect` are exactly `reason`, `tools`; `sample` is `fiction`; `intent` is a non-empty string; `expect.tools` is `["dialogue"]`; `expect.reason` is `completed`. It runs no model.

### 3.6 The catalogue line in the recipe golden

After the update run (step 9) the recipe golden must contain exactly one new line, placed between `- cold_open:` and `- mystery_question:`:

`- dialogue: Write an exchange between characters, each in their own voice. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); characterIds (entity, list, required); sceneText (text, single, optional).`

The format is `formatCatalogEntry` (template.ts lines 557 to 568). Only ports are listed, in property order (C2), as the `cold_open` line on main shows. If the line is absent after the run, the tool is not valid (a lint error or an unloaded spec): stop and report.

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-16`, cut from `main` (the orchestrator makes the branch and any worktree; no `-b` when the branch already exists). Record `node -v` and `npm -v` beside each result. Do not push. Do not use `git add -A` or `git commit -a`. When `--update-goldens` is used, the file filter comes before `--`: `vitest run <file> -- --update-goldens`. The other order runs the whole API suite (`plans/DECISIONS.md` lines 5167 to 5174).

0. **Base.** `git rev-parse --short HEAD` prints `c2225ee` or a later commit. `git status --short` prints nothing. `test ! -e packages/packs/fiction/tools/dialogue.yaml` exits 0. `git ls-files packages/packs/test/golden/dialogue apps/api/test/packs/dialogue.test.ts scripts/eval-agent/cases/dialogue.json scripts/eval-case-dialogue.test.mjs e2e/fixtures/mock-openai/scenarios/pack-dialogue.json` prints nothing. If HEAD is later than `c2225ee`, run `git diff --quiet c2225ee HEAD -- packages/packs apps/api/test/packs scripts e2e/fixtures/mock-openai/scenarios e2e/specs`; if it exits 1, re-read the changed files before editing (it is expected to exit 1 once GNP-15 or GNP-17 is on main, because each changes the recipe golden; that is not a stop).
1. **Runtime and baseline (A1, A2).** `node -v` prints `v26.x` and `npm -v` prints `11.x`. Run `npm ci` only if the worktree has no `node_modules/`. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs && (cd apps/api && npx vitest run test/packs)` exits 0 on the unchanged tree.
2. **Tool spec (U1 to U4, M1 to M5, C2).** Create `packages/packs/fiction/tools/dialogue.yaml` with the text of 3.1, copying the five common-input blocks from `cold_open.yaml` lines 7 to 33. Then `npx prettier --write packages/packs/fiction/tools/dialogue.yaml`. Check that the prompt block is unchanged after prettier (A4); if it changed, keep prettier's form and record the change.
3. **Pack gate (criterion 1; M1, M2, D2, D4, A5, A6).** `npm run lint:packs` exits 0 and prints no finding that names `dialogue`. Then `npm test -w @bbartolome/scriba-packs` exits 0, and "the suite passes on the real packs" passes.
4. **Fixture (M6, C6).** Create `packages/packs/test/golden/dialogue/keepers-exchange.fixture.json` with the text of 3.2. Then `npx prettier --write` on it.
5. **Scenario (M6).** Create `e2e/fixtures/mock-openai/scenarios/pack-dialogue.json` with the text of 3.3. Then `npx prettier --write` on it.
6. **Golden tests (criteria 2 and 3; C1, C3 to C5, C7, C10).** Create `apps/api/test/packs/dialogue.test.ts` as section 3.4 describes: the two `it`s of AC 2 and AC 3.
7. **Update run (A7, M6).** `cd apps/api && npx vitest run test/packs/dialogue.test.ts -- --update-goldens` exits 0 and creates `packages/packs/test/golden/dialogue/keepers-exchange.golden.json`. Read the file. `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft` (`executor.service.ts` line 32). `messages[1].content` contains the lines `Core idea: Two keepers can disagree and still share the same light.`, `Goal: Agree whether to send a signal to the mainland.`, `Subtext: Each of them is afraid of being the first to say the boat will not come.`, `Scene: Night.`, `Length: 600 words.` and `Tone: spare.`; it contains `Characters:` followed by the two characters, each with its `voice:` and `relationships:` text; it contains each of `skerry-light`, `nell-carrow`, `pim-dorey` and `plain-spoken`, the text `[@id]`, the text `TK` and the text `distinct diction`; and it contains no `{{`. Then `npx prettier --write packages/packs/test/golden/dialogue`.
8. **Compare run (criteria 2 and 3).** `cd apps/api && npx vitest run test/packs/dialogue.test.ts` exits 0 with two tests passed. In both cases the golden is `match`, the kind is `draft`, `sourcesUsed` is exactly `["skerry-light", "nell-carrow", "pim-dorey"]`, the call without `coreIdea` returns 422 with `TOOL_ARGS_INVALID` and a message that contains `coreIdea`, and one model call was made. The one-character call returns 422 with `TOOL_ARGS_INVALID`, a message that contains `characterIds` and `at least 2 items`, and no recorded model request (A3).
9. **Catalogue of the propose_graph recipe golden (M7, C9, 3.6).** `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens` exits 0. Then `git status --short --untracked-files=all packages/packs/test/golden` lists the two new `dialogue` files and `propose_graph/recipe.golden.json` and nothing else. Parse the base (`git show "$(git merge-base HEAD main)":packages/packs/test/golden/propose_graph/recipe.golden.json`, the commit this branch's tree is built on, whatever has merged to main since) and the working copy as JSON in `node -e`, without writing a file. `messages[0]` is equal in both. In `messages[1].content`, the two strings differ by exactly one inserted line, the text of 3.6, after `- cold_open:` and before `- mystery_question:`. Everything else is equal. If anything else differs, stop and report it. `git diff --quiet -- packages/packs/test/golden/propose_graph/story.golden.json` exits 0. Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0.
   **Rule for a later rebase (either merge order).** If another tool unit (GNP-15, GNP-17) has changed the recipe golden on main after this branch was cut, the rebase of the step 15 commit conflicts on `recipe.golden.json` (its catalogue is one JSON line). Resolve it by regeneration, never by hand: take main's version of the file (`git checkout --ours -- packages/packs/test/golden/propose_graph/recipe.golden.json`; during a rebase, "ours" is the branch being rebased onto, that is main), run `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens`, then `npx prettier --write packages/packs/test/golden/propose_graph/recipe.golden.json`, then repeat the JSON check of this step against `main` (`git show main:...` as the base): the only difference is the one inserted line of 3.6 between `- cold_open:` and `- mystery_question:`. Then `git add` the file and `git rebase --continue`. The other unit's line, already on main, stays where main has it. If this unit merges first, the other unit applies the same rule on its own rebase. The result is the same in either order, because each line has its own place in the sorted catalogue.
10. **Eval data and its test (criterion 4; C1, C8; M8).** Create `scripts/eval-agent/cases/dialogue.json` and `scripts/eval-case-dialogue.test.mjs` as section 3.5 describes. Then `npx prettier --write` on both. `node --test scripts/eval-case-dialogue.test.mjs` exits 0 with one test passed. `node --test scripts/eval-cases.test.mjs` exits 0 with its two tests passed.
11. **Format check (A4).** `npx prettier --check packages/packs/fiction/tools packages/packs/test/golden apps/api/test/packs scripts/eval-agent/cases scripts/eval-case-dialogue.test.mjs e2e/fixtures/mock-openai/scenarios` exits 0. If a golden fails it, stop and report: the fix is a decision for the Navigator, not for this unit.
12. **API build and lint.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0. The build type-checks the new test file.
13. **Root gates and the e2e mock.** From the root: `npm run build`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario. `node --test 'scripts/*.test.mjs'` exits 0. Then `npm test` from the root. If it exits 0, the gate is met. If it exits 1 and the only failing test is `apps/web` `canvas-page.spec.ts` "Loading the contract's example story graph and recipe and saving without edits produces byte-equivalent JSON" with "Test timed out in 5000ms" (`plans/GNP-14.md` F7), the gate is met only when all of these hold, each recorded with the load average (`uptime`): (a) `npm test -w @bbartolome/scriba-web` run alone exits 0; (b) `npm test` exits 0 for every other workspace (`-w @bbartolome/scriba-contracts`, `-w @bbartolome/scriba-api`, `-w @bbartolome/scriba-packs`, `-w @bbartolome/scriba-e2e`); (c) `node --test 'scripts/*.test.mjs'` exits 0; (d) `git diff --name-only main...HEAD -- apps/web packages/contracts` prints nothing. Any other failure (an `apps/api` timeout included, because this unit adds an `apps/api` test): stop and report it. Do not change any test, timeout, config or script to make it pass. This includes the intermittent `apps/api` failure that stopped GNP-15 (`test/tool-registry-save.test.ts`, "C1: save on a built-in writes the user-pack file and never touches the packs root"): whether a gate may tolerate it is an open Navigator question (`plans/DECISIONS.md` lines 6752 to 6756), so this plan does not tolerate it. If that failure occurs, stop and report it with the load average; if the Navigator has decided the question by then, the step is revised to match the decision before it is run again.
14. **The /tools specs in the running app (M9).** With port 8080 free, run once: `npm run e2e -w @bbartolome/scriba-e2e -- tools-editor.e2e.ts tools-live-preview.e2e.ts tools-preview.e2e.ts tools-try.e2e.ts --trace off`. Record the pass and fail counts, and for `tools-preview.e2e.ts` the TRG-05 C2 result. No spec changes. This unit adds one row to the fiction group of the `/tools` list, inside the margin that GNP-14 C12 set (3200 px, `e2e/specs/tools-preview.e2e.ts` line 23). If a test fails, stop and report PLAN DOES NOT WORK with the test name, the person select's `boundingBox` and the viewport height; do not change `e2e/specs/tools-preview.e2e.ts`. If the browser cannot run, record "not run".
15. **Commit.** `git add -- packages/packs/fiction/tools/dialogue.yaml packages/packs/test/golden/dialogue packages/packs/test/golden/propose_graph/recipe.golden.json e2e/fixtures/mock-openai/scenarios/pack-dialogue.json apps/api/test/packs/dialogue.test.ts scripts/eval-agent/cases/dialogue.json scripts/eval-case-dialogue.test.mjs`. `git diff --cached --stat` lists exactly these paths and no `plans/` or `units/` file. Commit with `feat(GNP-16): dialogue tool with golden and eval cases`. Do not push.
16. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 5 holds.

## 5. Acceptance criteria and tests

The criteria text is copied from `units/GNP-16-dialogue.md` lines 21 to 24. Each criterion has exactly one test (criterion 2 and criterion 3 each have one `it`). No other test is added.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "Passes `npm run lint:packs` and the content-check suite." (21) | `packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs" (existing, line 9) | `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (steps 1 and 3) | Both exit 0. The test asserts no error from `lintPacks` and an empty `contentChecks` on `packages/packs`. Over the real folders, that holds the five-input identity with `cold_open` (checks.ts lines 192 to 221), the description rule (lines 236 to 257: 62 characters, first word `write`) and the entity-kind promotion (lines 86 to 95) for `dialogue`. |
| "Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error." (22) | `apps/api/test/packs/dialogue.test.ts`, "AC 2: the dialogue golden case matches, its prompt holds each input entity with its ID and the citation and placeholder instructions, its output is a draft with the expected sourcesUsed, and invalid arguments return an Ajv error that names coreIdea" | `cd apps/api && npx vitest run test/packs/dialogue.test.ts` (steps 7 and 8) | One `it`, timeout 120000. The golden is `match` (`written` in the update run). The kind is `draft`. `sourcesUsed` is exactly `["skerry-light", "nell-carrow", "pim-dorey"]`, which excludes `plain-spoken`. The call without `coreIdea` returns 422 with `TOOL_ARGS_INVALID` and a message that contains `coreIdea`, with one model call. The `check` finds `skerry-light`, `nell-carrow`, `pim-dorey`, `plain-spoken`, `[@` and `TK (` in the rendered user message. |
| "Golden: the rendered prompt contains both characters' `voice` and `relationships` plus the distinct-voice instruction; calling it with one character fails Ajv." (23) | `apps/api/test/packs/dialogue.test.ts`, "AC 3: the rendered prompt holds both characters' voice and relationship notes and the distinct-voice instruction, and a call with one character returns an Ajv error that names characterIds" | same file (steps 7 and 8) | One `it`, timeout 120000. Case B's golden is `match`, and its `check` finds `voice: Terse.`, `voice: Talkative.`, `She tolerates his talk`, `He wants her approval` and `distinct diction` in the rendered user message. The one-character call returns 422 with `TOOL_ARGS_INVALID`, a message that contains `characterIds` and `at least 2 items`, and no recorded model request. |
| "A manual eval case (small and larger local model) is added to the Agent loop's eval script data." (24) | `scripts/eval-case-dialogue.test.mjs`, "AC 4: the dialogue eval case is in the eval data and uses the documented keys and values" | `node --test scripts/eval-case-dialogue.test.mjs` (step 10), and `node --test scripts/eval-cases.test.mjs` (existing, reads every case) | The file `dialogue.json` exists in `scripts/eval-agent/cases/`. Its keys are exactly `expect`, `intent`, `sample`; the keys of `expect` are exactly `reason`, `tools`; `sample` is `fiction`; `intent` is non-empty; `expect.tools` is `["dialogue"]`; `expect.reason` is `completed`. The real-model run with a small and a larger local model is not part of the criterion (the Navigator's data-only reading, `plans/DECISIONS.md` lines 5219 to 5222). It is recorded as not run, and its carrier is GNP-19's done-when (unit line 24; open point 7). |

## 6. Agreement with the downstream units and the parallel plans

**Downstream.**

- **GNP-18 (fiction sample; `blocked_by` line 7 names GNP-16).** Its recipe uses `dialogue` (`units/GNP-18-fiction-sample.md` line 20): a text Input, an entity Input (the characters) and a style Input, into a `dialogue` tool node, into an Output node. This plan agrees on the names and the ports the recipe reaches: `sceneText` (text), `characterIds` (entity list of kind `character`) and `styleProfile` (style). The recipe as the unit describes it wires no input to `coreIdea`, which is required (module line 60; unit line 17), and `units/GRR-03-validation.md` line 20 makes a required port with neither a wire nor a pinned value a recipe error that blocks a run. This does not conflict with this plan: a tool node's `params` hold "the non-port settings and the pinned port values" (`packages/contracts/src/graph-runner/graph.ts` lines 84 to 85), and GNP-18's recipe decision (line 20) lists the nodes and wires, not the tool node's params, so GNP-18's plan can pin `coreIdea` on the `dialogue` node without a unit change. The GNP-18 planner must do so (open point 1). This plan does not change the GNP-18 unit.
- **GNP-19 (fiction gate; `blocked_by` line 7 names GNP-16).** Its criterion 2 (`units/GNP-19-fiction-gate.md` line 21): "Dialogue's golden test passes; one-character calls fail Ajv." Tests AC 2 and AC 3 of section 5 are that check. Its done-when (line 24) carries the real-model run (open point 7). Its demo (line 30) runs the recipe with both keepers, which needs open point 1 settled. This plan gives GNP-19 nothing else.
- **GNP-23 (remix; `blocked_by` line 7 names GNP-16).** Its `targetShape` enum must list every shipped draft tool except `remix` (`units/GNP-23-remix.md` line 16; `checkRemix`, `packages/packs/test/checks.ts` lines 261 to 288, which counts only `output: draft`). This plan keeps `output: draft` (unit line 15), so `dialogue` must appear in that enum. GNP-23 writes the enum; this plan writes nothing in it.
- **Inverse rules.** `unblocks: [GNP-18, GNP-19, GNP-23]` (unit line 9) is the exact inverse of their `blocked_by` (line 7 of each). `GNP-02` (line 9) and `GNP-13` (line 9) list GNP-16 in `unblocks`. Agrees. `parallel_with` is symmetric with GNP-12, GNP-14, GNP-15 and GNP-17 (line 8 of each), and GNP-16 is not paired with any unit it depends on. Agrees.
- **Module.** The graph (module line 22) and the parallelism line (module line 33) place GNP-16 under GNP-13, alongside GNP-14, GNP-15 and GNP-17. Agrees. See the inconsistency below for line 33.

**Parallel plans that change the same files.**

- **GNP-15 (`plans/GNP-15.md`, `status: draft` since `03cf287`; branch `unit/GNP-15` at `f3ccbf2`, stopped at its step 13 and waiting for the Navigator, `plans/DECISIONS.md` lines 6745 to 6756).** The two plans share one file that is certain to conflict: `packages/packs/test/golden/propose_graph/recipe.golden.json`. Its catalogue is one JSON string on one physical line, so each plan's insertion rewrites the same line (`f3ccbf2` changes one line of the file). GNP-15 inserts `scene_builder` between `propose_graph` and `throughline_check` (its section 3.6); this plan inserts `dialogue` between `cold_open` and `mystery_question`. The two insertions sit at different places in the sorted catalogue, so the final file is the same in either merge order. Whichever plan merges second resolves the conflict on its rebase by regeneration (the rule after step 9: main's file, the update run, then the check against `main` that the only difference is its own line); the first plan's line, already on main, is kept by the regeneration because its tool is on the rebased tree. Step 9 itself compares with `git merge-base HEAD main`, so it holds on a branch cut before or after GNP-15 merges. The other files differ: GNP-15 adds `scene_builder`-named files, and this plan adds `dialogue`-named files. Neither changes `apps/api/test/packs/golden.kit.ts`, `packages/packs/test/real-packs.test.ts` or `e2e/specs/`. Agrees in either order.
- **GNP-15 open point 2 and the margin of `tools-preview.e2e.ts`.** GNP-15 and this plan each add one fiction row to the `/tools` list. GNP-14 set 3200 px with room for the rows of GNP-15, GNP-16 and GNP-17 (`plans/GNP-14.md` line 466). If GNP-15 is on main first, step 14 of this plan runs with two new rows. Same rule either way.
- **GNP-15's open gate question.** GNP-15 stopped on an intermittent `apps/api` failure that this plan's step 13 also does not tolerate. This plan keeps the strict rule (step 13) and does not decide the question.
- **GNP-17 (plot_manager; no plan file, no branch, no worktree).** Its output is `check` (`units/GNP-17-plot-manager.md` line 15), and it will add a catalogue line between `numbers_to_people` and `propose_graph`. The same regeneration rule applies in either order.
- **GNP-14 (`plans/GNP-14.md`, done, on main).** It already changed the recipe golden (`character_builder` and `world_builder` lines), the viewport (3200 px, line 23 of the spec), and removed `packages/packs/fiction/tools/.gitkeep`. This plan starts from that state. It needs nothing else from GNP-14.
- **GNP-12 (`plans/GNP-12.md`, done).** Its files are two units and two plans (`units/GNP-12-workhorses-gate.md` and `plans/GNP-12.md`). No path in common.
- **GNP-18 (no plan file).** It adds `examples/fiction/**` and an entry in `examples/samples.yaml` (unit lines 15 and 20). It changes no `packages/packs` file and no catalogue. No path in common. GNP-18 must come after this unit (its `blocked_by`).
- **GRR-15 (`plans/GRR-15.md`, planned) and CEX-14 (`plans/CEX-14.md`, draft).** Their file lists name no path of this plan (section 2). No conflict.
- **GNP-20 and AGL-25 (done).** GNP-20 already put the `throughline_check` line into the recipe golden, and AGL-25 defined the eval data format. This plan follows both and changes neither.

**Unit and module consistency (not fixed here).**

- `modules/genre-packs.md` line 33 says: "After GNP-13: the four fiction tool units and the fiction sample in parallel." Module line 23 draws the fiction sample under GNP-13 with GRR-01 and PST-05 only. `units/GNP-18-fiction-sample.md` line 7 (`blocked_by`) names GNP-03, GNP-13, GNP-16, GRR-01 and PST-05. The unit waits for GNP-16 and GNP-03, and the module does not show it. The unit is right for this plan's purposes (the unit's `unblocks` of GNP-16 matches). This mismatch is not in the way of this plan, so no action is taken here (open point 3).
- `units/GNP-16-dialogue.md` line 17 reads "`subtext`, `goal` (params)", which does not say whether `subtext` is a port. This is ambiguous, not inconsistent. Open point 4 decides it.

## 7. Open points

Each point gives the choice and the reason. Points 1 to 3 were decided by the reviser: none changes a criterion, a settled module decision or a unit, and none is in the way of this plan. Points 4 to 7 are decided here or settled by a precedent, and none changes a criterion, a settled module decision or a downstream unit.

1. **GNP-18's recipe does not wire the required `coreIdea` (decided: no unit change; a note for the GNP-18 planner).** The unit wires a text Input, an entity Input and a style Input into the `dialogue` node (`units/GNP-18-fiction-sample.md` line 20). `coreIdea` is required (`units/GNP-16-dialogue.md` line 17; module line 60). The Graph runner's recipe validation makes a required port with neither a wire nor a pinned value a run-blocking error (`units/GRR-03-validation.md` line 20). A tool node's `params` may hold pinned port values (`packages/contracts/src/graph-runner/graph.ts` lines 84 to 85), and GNP-18 line 20 does not forbid tool-node params, so GNP-18's plan pins `coreIdea` on the `dialogue` node (or adds a text Input for it). GNP-19's demo (line 30, "run it") depends on that. This plan is correct either way and does not change GNP-18 (no YAGNI action applies: nothing in GNP-18 is in the way of this plan).
2. **Voice separation has no key in the eval data (decided: no new key).** Module line 90 asks the manual eval to check "voice separation for Dialogue". The eval data takes only `reason`, `tools` and `citations` (`scripts/eval-cases.test.mjs` line 15; `scripts/eval-agent/run.mjs` line 37). The case records `reason` and `tools`, its intent asks for each keeper in their own voice, and a person reads the voices in the manual run that GNP-19's done-when names (`units/GNP-19-fiction-gate.md` line 24). Reason: criterion 4 asks only that the case is added to the eval data (the Navigator's data-only reading, `plans/DECISIONS.md` line 5222); the eval format belongs to AGL-25 (done) and this unit does not change it; the module's line 90 says what the manual run looks at, which this choice keeps.
3. **Module lines 23 and 33 against GNP-18's `blocked_by` (decided: no action here).** See section 6. The mismatch concerns GNP-18's place in the module graph, not this unit; this unit's front matter agrees with the module (line 22) and with `units/README.md` line 64. No reviser action may change a module file, and no part of this unit is in the way. The GNP-18 planner or reviser carries it to the Navigator if it is in the way of GNP-18.
4. **`subtext` and `goal` as params, `sceneText` as a text port (decided here).** The unit lists `subtext` and `goal` under "(params)" (`units/GNP-16-dialogue.md` line 17), so both are params. `sceneText` is a text port, as module line 53 requires for scene content. Reason: no criterion asks for a port here, and no downstream unit wires `subtext` (GNP-18's recipe wires text, entity and style inputs only, unit line 20). If the Navigator reads `subtext` as a port, the change is one line in `dialogue.yaml` plus the catalogue line of 3.6, and the golden is regenerated.
5. **The one-character call (decided here).** The kit makes only the call without one required argument (`golden.kit.ts` lines 203 to 211). The test file makes the second call itself, with the pattern of `myth-buster.test.ts` lines 89 to 177 (C4). Reason: `plans/GNP-02.md` line 134 says that GNP-16 writes that check itself, and `golden.kit.ts` is a shared helper of a done unit that this unit does not change.
6. **The distinct-voice assertion (decided here, with a precedent).** Module line 85 says "no wording assertions beyond golden snapshots". Criterion 3 names the distinct-voice instruction as part of the rendered prompt. The test asserts the phrase `distinct diction` and the golden holds the full text (C10). Reason: the GNP-14 test already asserts the keyword `Contradictions` in the same way (`apps/api/test/packs/character-world-builder.test.ts` line 49), and it passed review. If the Navigator reads module line 85 strictly, the keyword line can be removed; the golden match then carries the instruction alone, which still proves the rendered prompt contains it.
7. **The real-model run (recorded as not run; settled by precedent).** Criterion 4 is met by the data test under the Navigator's data-only reading (`plans/DECISIONS.md` lines 5219 to 5222, option a). The small and larger local model run is not part of the criterion. Simplest choice: the implementer records "not run: no local model server" in the report, as GNP-12 and GNP-14 did. The carrier of the run is GNP-19's done-when (`units/GNP-19-fiction-gate.md` line 24). No new decision.

## Review parts

- **Part 1 — the tool spec, the golden tests and the catalogue.** Steps 0 to 9. Tests: criterion 1 (`packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs", with `npm run lint:packs`; step 3), criterion 2 (the AC 2 test of `apps/api/test/packs/dialogue.test.ts`; steps 7 and 8) and criterion 3 (the AC 3 test of the same file; steps 7 and 8). Files: `packages/packs/fiction/tools/dialogue.yaml`, `packages/packs/test/golden/dialogue/keepers-exchange.fixture.json`, `packages/packs/test/golden/dialogue/keepers-exchange.golden.json`, `packages/packs/test/golden/propose_graph/recipe.golden.json`, `e2e/fixtures/mock-openai/scenarios/pack-dialogue.json` and `apps/api/test/packs/dialogue.test.ts`. The reviewer checks the spec against 3.1 (the five common inputs byte for byte against `cold_open.yaml` lines 7 to 33), the fixture and scenario against 3.2 and 3.3, the test against 3.4, the golden's content against step 7, and that the recipe golden differs from `git merge-base HEAD main` (after a rebase: from `main`) by exactly the line of 3.6, placed between `- cold_open:` and `- mystery_question:`, whatever other catalogue lines main holds (step 9 and its rebase rule).
- **Part 2 — the eval case, the gates, the /tools check and the commit.** Steps 10 to 16. Test: criterion 4 (`scripts/eval-case-dialogue.test.mjs`; step 10). Files: `scripts/eval-agent/cases/dialogue.json` and `scripts/eval-case-dialogue.test.mjs`. The reviewer checks the case and its test against 3.5 and C8, the step 13 gate as written, the step 14 result (no file under `e2e/specs` changed), and that `git diff --stat main...HEAD` lists exactly the paths of section 3.
