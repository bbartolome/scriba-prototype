---
unit: GNP-10
status: draft
module: genre-packs
milestone: M2
blocked_by: [GNP-02, GNP-03, GNP-06]
unblocks: [GNP-12, GNP-23]
---
# GNP-10 plan — numbers_to_people nonfiction draft tool, golden case and eval case

Batch: [GNP-10] (Genre packs, phase:nonfiction-workhorses, M2), a batch of one. Planner draft at main `e896ec4` (HEAD when read). The unit file was read in full (lines 1 to 25). It has no change note: a search of `units/GNP-10-numbers-to-people.md` for "Removed by", "Loosened by", "Reworded by", "Moved to" and "revision" finds nothing. The working tree holds two modified files that are not this plan's: `units/SAU-12-providers-step.md` and `plans/GNP-09.md` (a reviser is editing it; see open point 3). The planner changed no file except this plan, committed nothing, and ran no build, install, test or npm command. Only read-only git was used.

## 1. Decisions this plan obeys

Labels: **U** = the unit file (it has no Decisions section; its Spec, lines 15 to 18, is the source); **M** = `modules/genre-packs.md`; **D** = a settled decision of a done unit or plan on main; **C** = a smaller choice made by this plan, recorded here and not in `plans/DECISIONS.md` (`grep -n "GNP-10" plans/DECISIONS.md` finds no entry).

- **U1 Spec and file.** `numbers_to_people`; `schemaVersion: 1`; `output: draft`; `enabled: true`; description "Turn one statistic into the story of one person behind it." Source: U lines 15 and 16. The unit writes the path as `nonfiction/tools/numbers_to_people.yaml`; the path used is `packages/packs/nonfiction/tools/numbers_to_people.yaml` (M line 37, `tools/<name>.yaml` under the pack folder). See C11.
- **U2 Inputs.** The five common inputs, then `statistic` (text port, required) and `person` (entity port, kind `person`, required). `required: [coreIdea, statistic, person]`. Source: U line 17.
- **U3 Prompt.** The skeleton of M lines 46 to 50 (role line; material with each entity rendered with its ID; shape steps; constraints). The four shape steps are the unit's, in its order: state the statistic, introduce the person behind it, tell their story, return to what the number means. Source: U line 18.
- **U4 Criteria.** Three (U lines 21, 22 and 24). Each gets one test in section 6.
- **M1 Common inputs verbatim.** "Repeated verbatim; CI asserts identity" (M line 56). Checked by `checkCommonInputs` in `packages/packs/test/checks.ts` against the first draft tool in pack order, which is `nonfiction/tools/cold_open.yaml`.
- **M2 Entity hints.** `x-scriba-entity-kinds` only where an input means a definite set of kinds (M line 66). `person` takes `[person]`; `entityIds` takes no hint (D7).
- **M3 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if field}}`, `{{entity X}}` and `{{toolCatalog}}` (M line 46). This prompt uses no `{{toolCatalog}}`.
- **M4 `sourcesUsed`.** Computed by the Tool registry from entity-ID inputs, style refs excluded. The prompt never asks for sources (M line 51).
- **M5 Testing.** Golden test through `POST /api/tool-registry/tools/:name/execute` (M line 87); no unit test reads `examples/` (M line 88); manual eval cases go into the Agent loop's eval data (M line 90).
- **M6 Names and descriptions.** Lower snake_case name; camelCase input keys; one sentence under about 120 characters starting with a verb (M lines 44 and 45). `turn` is in `VERBS`.
- **M7 Citations and placeholders.** `[@id]` for each factual sentence; `TK (note)` for a missing fact; the style profile's tone, banned phrases and the length (M line 50).
- **D1 Golden harness (GNP-02, done).** `goldenCase` in `apps/api/test/packs/golden.kit.ts` with `invalidWithout` (D4) and `check` (D10); scenario `pack-<tool>.json` (D5); fixture and golden under `packages/packs/test/golden/<tool>/` (D6); one model call (D17); a golden that renders the catalogue changes with it (D18); the update flag (D9). Source: `plans/GNP-02.md`.
- **D2 Entity kinds (GNP-03 and GNP-06, done).** `person` (`packages/packs/nonfiction/entity-types/person.yaml`: kind `person`, folder `entities`, fields `name`, `role`, `sources`), `source`, `claim` and `style-profile` are shipped. Source: `plans/GNP-06.md` line 178 (the `person` input of this unit agrees).
- **D3 Pattern (GNP-07, done).** The five common-input blocks of `cold_open.yaml`; `tone` as free text and `length` bounds 200 to 2000 (C2, C3); `coreIdea` with `x-scriba-control: textarea` (C4); names and timeout (C7); the merge rule for the catalogue golden (C10). Source: `plans/GNP-07.md`. The seam of AC 3 is changed (C8).
- **D4 Catalogue golden (GNP-04, done).** `packages/packs/test/golden/propose_graph/recipe.golden.json` renders `{{toolCatalog}}`; `story.golden.json` does not (N1). Source: `plans/GNP-04.md`; `plans/GNP-02.md` D18.
- **D5 Sample person (GNP-11, done).** `examples/nonfiction/entities/k-anders-ericsson.md` (type `person`) is the person that the eval case uses. Source: `plans/GNP-11.md` line 224.
- **D6 Sibling seam (GNP-09, working tree, revision 1).** The AC 4 test of GNP-09 is its own new file and `scripts/eval-cases.test.mjs` is not shared. This plan follows the same choice (C8).
- **D7 Kind hint on `entityIds` (GNP-07 N2, Navigator).** `entityIds` carries no `x-scriba-entity-kinds`, because it is a common input and identical on every draft tool. Source: `plans/GNP-07.md` N2 and C1.
- **C1 The invalid-argument key is `statistic`.** It is the tool's own required input, which no other test checks, as GNP-08 C1 (`puzzle`) and GNP-09 C1 (`belief`) do.
- **C2 Controls and kinds.** `coreIdea` has `x-scriba-control: textarea`. `statistic` has no control hint (as `cold_open`'s `moment`). `person` has `x-scriba-entity-kinds: [person]`. `entityIds` has no hint (D7).
- **C3 Length and tone.** `length`: integer, default 800, minimum 200, maximum 2000. `tone`: free text. Source: D3.
- **C4 `sourcesUsed` order.** The entity inputs in property order: `entityIds` first, then `person`. The style profile is excluded. Result: `['notes-a', 'claim-a', 'person-a']`.
- **C5 Prompt layout.** The person is the subject, so `{{entity person}}` comes first in the material, then `{{#each entityIds}}`, then `{{#if styleProfile}}`. The layout is otherwise that of `cold_open.yaml`.
- **C6 Names.** Case `statistic-person`; entity IDs `person-a`, `notes-a`, `claim-a`, `style-a` (each matches `^[a-z0-9][a-z0-9-]*$`); test file `apps/api/test/packs/numbers-to-people.test.ts`; one `it` with timeout 60000 ms.
- **C7 Catalogue line position.** Name order (`apps/api/src/modules/tool-registry/catalog.service.ts` line 436, `[...names].sort()`): after `myth_buster` and before `propose_graph`. `numbers_to_people` sorts after `myth_buster` because `m`-`y`-`t` < `n`.
- **C8 Seam of AC 3.** A new file `scripts/eval-case-numbers-to-people.test.mjs` with one `test`. It reads `scripts/eval-agent/cases/numbers-to-people.json` and runs no model. `scripts/eval-cases.test.mjs` is not changed. GNP-07's existing test in that file loops over every case file, so this case is checked there too.
- **C9 Eval values.** `sample` `nonfiction`. `intent` "Turn the ten-thousand-hour figure in chapter 3 into the story of the person behind it, using my notes." `expect`: `reason` `completed`, `tools` `["numbers_to_people"]`, `citations` `present`. The figure is in `examples/nonfiction/sources/ten-thousand-hours-notes.md` line 14 ("about 10,000 hours of practice by age twenty"), and chapter 3 is listed at `examples/nonfiction/sources/outline.md` lines 26 to 31. Chapter 3 is also used by the cases of GNP-07 and GNP-09. This does not couple the cases, because each run creates a fresh project from the sample (`scripts/eval-agent/README.md`, "What a run does", step 1).
- **C10 Update command.** The file filter goes before `--`: `cd apps/api && npx vitest run <file> -- --update-goldens`. The implementer report of GNP-08 (`plans/DECISIONS.md` line 5199) records that a `--` before the file filter ran the whole API suite. An update run never runs without a file filter, because it rewrites every golden.
- **C11 Path.** `packages/packs/nonfiction/tools/numbers_to_people.yaml`, as M line 37 says. The unit's `nonfiction/tools/` is shorthand for it.

## 2. Facts checked and assumed

### Checked (repository on main at `e896ec4`, and the named working-tree files)

Unit and module:
- `units/GNP-10-numbers-to-people.md`: front matter lines 1 to 10 (`blocked_by` GNP-02, GNP-03, GNP-06; `unblocks` GNP-12, GNP-23; `parallel_with` GNP-05, 07, 08, 09, 11, 13); Spec lines 14 to 18; criteria at lines 21, 22 and 24.
- `units/README.md` lines 34 to 65 (unit format; blocker notation: `unblocks` is the inverse of `blocked_by`; `parallel_with` is symmetric). Checked by grep: GNP-02, GNP-03 and GNP-06 `unblocks` name GNP-10; GNP-12 and GNP-23 `blocked_by` name GNP-10; GNP-05, 07, 08, 09, 11 and 13 `parallel_with` name GNP-10. All consistent.
- `modules/genre-packs.md`: line 18 (graph names GNP-10 `numbers_to_people`), line 37 (pack layout), lines 42 to 52 (spec fields, names, descriptions, skeleton, `sourcesUsed`, output kinds), lines 56 to 66 (common inputs and entity inputs), lines 84 to 90 (testing).

Done units and plans:
- `plans/GNP-07.md` (the pattern: sections 1 to 4, C2 to C10, N2); `plans/GNP-02.md` (D4 to D18; section 5 line 133); `plans/GNP-06.md` line 178; `plans/GNP-11.md` line 224; `plans/GNP-03.md`.

Code and data:
- `packages/packs/nonfiction/tools/` holds only `cold_open.yaml`; `packages/packs/core/tools/` holds only `propose_graph.yaml`. No `.gitkeep` is left in either tools folder.
- `packages/packs/nonfiction/entity-types/person.yaml` (kind `person`, folder `entities`, fields `name`, `role`, `sources`).
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` line 35; `DESCRIPTION_LIMIT` line 44; `VERBS` line 48 (contains `turn`); `checkCommonInputs` line 192; `checkDescription` line 236. `yamlFilesIn` sorts the file names; packs are read in the order core, nonfiction, fiction.
- `packages/packs/test/real-packs.test.ts`: `real packs` > `the suite passes on the real packs` (zero errors; no content finding).
- `scripts/lint-packs.mjs`: exit 0 with warnings; exit 1 with an error.
- `apps/api/src/modules/tool-registry/lint.ts` lines 813 to 818: `template-unused` is a warning for a required input that the prompt does not use. The `used` set counts entity references too.
- `apps/api/src/modules/tool-registry/executor.service.ts` line 149: `sources` is the unique non-style refs.
- `apps/api/src/modules/tool-registry/template.ts` line 557: `formatCatalogEntry` (ports only, in property order).
- `apps/api/test/packs/golden.kit.ts`: exports `PACKS_ROOT`, `GOLDEN_ROOT`, `UPDATE_GOLDENS`, `runGoldenCase`, `goldenCase`, `GoldenRunResult`. `goldenCase` asserts the golden status, the kind, the exact `sourcesUsed`, 422 with `TOOL_ARGS_INVALID`, a message that contains `invalidWithout`, one model call, then `check(result)`. `post` is not exported.
- `apps/api/test/packs/cold-open.test.ts`: the `renderedPrompt` helper and the `it` shape, which this plan copies.
- `apps/api/vitest.config.mts`: `SCRIBA_UPDATE_GOLDENS` is set from `process.argv.includes('--update-goldens')`.
- `packages/packs/test/golden/propose_graph/recipe.golden.json`: the user message holds `Tools for a recipe:` and the lines `cold_open` and `propose_graph`, in that order. `story.golden.json` holds no catalogue.
- `apps/api/test/packs/propose-graph.test.ts`: checks the `propose_graph` line with `toContain`, so an added line keeps it passing.
- `e2e/fixtures/mock-openai/scenarios/pack-cold_open.json`: the scenario shape. `e2e/fixtures/mock-openai/server.mjs` lines 8 and 18 to 19 load every `.json` in `scenarios/`. No test counts the scenario files.
- `scripts/eval-cases.test.mjs`: one test on main (GNP-07's, line 34). `scripts/eval-agent/cases/` holds `cold-open.json` and `summarize-outline.json`.
- `scripts/eval-agent/README.md`: case keys `sample`, `intent`, `expect` (`reason`, `tools`, `citations`); the values; each case creates a fresh project (line 27); no model in CI.
- `scripts/examples-check/m1.mjs` lines 201 to 216: no unit test may name `examples/` (it scans `*.test.*` and `*.spec.*`). The new test files avoid the text.
- Root `package.json`: `test` runs `node --test 'scripts/*.test.mjs'` and the workspaces; `lint` includes `lint:packs` and `prettier --check .`.
- No test lists the built-in tools: `apps/api/test/packs/core-gate.test.ts` finds `propose_graph` by name; `real-packs.test.ts` asserts no error; `nonfiction-entity-types.test.ts` boots the app and checks entity types.
- `examples/nonfiction/entities/k-anders-ericsson.md` has `type: person`.
- `plans/DECISIONS.md`: no GNP-10 entry. The GNP-08 implementer report (lines 5198 and 5199) records `node --test scripts/eval-cases.test.mjs` with 2 of 2 passed, and the `--` before the file filter (C10).
- Sibling state: GNP-08 is approved by code review (`e896ec4`) and not on main (`packages/packs/nonfiction/tools/` holds only `cold_open.yaml`). GNP-09 is `status: planned` in its working tree; this plan reads that version (open point 3).

### Assumed (each one is checked by the step named)
- **A1** Node v26.x and npm 11.x are on the PATH (step 1).
- **A2** `sourcesUsed` is `['notes-a', 'claim-a', 'person-a']` (C4; step 8).
- **A3** `{{length}}` renders `800` for the default, because Ajv applies `useDefaults` (step 7).
- **A4** `lint.ts` gives no error or warning for the spec: the `person` hint names the shipped kind, and every required input is named in the prompt (step 11).
- **A5** The catalogue line is the line in step 12, read from the regenerated golden (step 12).
- **A6** `npx vitest run <file> -- --update-goldens` keeps the file filter and sets the flag (C10; step 7 checks with `git status`).
- **A7** `{{entity person}}` renders `person-a` with its header `<type> <ref> (<path>)`, as GNP-07 M3 says (step 7).
- **A8** `cold_open.yaml` stays the M1 reference in every merge order: it is the first draft in pack order, because it sorts before `mystery_question.yaml`, `myth_buster.yaml` and `numbers_to_people.yaml`.
- **A9** Prettier keeps the prompt text. If it changes the text, keep its form and record the change (step 3).
- **A10** The `tools-preview` e2e spec is unaffected, because it selects rows by origin (step 15).

## 3. Shared files with GNP-08 and GNP-09

**Rule.** GNP-10 adds its own new files and changes one existing file: the catalogue line of `packages/packs/test/golden/propose_graph/recipe.golden.json`. GNP-10 changes neither `scripts/eval-cases.test.mjs` nor any file that GNP-08 or GNP-09 adds. The catalogue golden is never merged by hand. The PR that merges second regenerates it on the base it is rebased onto (step 12). Any textual conflict on that golden is resolved only by the regeneration.

| Path | GNP-08 (`planned`, plan at `e510387`) | GNP-09 (working tree, revision 1, `planned`) | GNP-10 (this plan) |
|---|---|---|---|
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | regenerated; gains the `mystery_question` line | regenerated; gains the `myth_buster` line | regenerated; gains the `numbers_to_people` line |
| `scripts/eval-cases.test.mjs` | appends one `test` after the existing one | not changed | not changed |
| `scripts/eval-case-<id>.test.mjs` | none | new `eval-case-myth-buster.test.mjs` | new `eval-case-numbers-to-people.test.mjs` |
| `packages/packs/nonfiction/tools/` | new `mystery_question.yaml` | new `myth_buster.yaml` | new `numbers_to_people.yaml` |
| `apps/api/test/packs/` | new `mystery-question.test.ts` | new `myth-buster.test.ts` | new `numbers-to-people.test.ts` |
| `e2e/fixtures/mock-openai/scenarios/` | new `pack-mystery_question.json` | new `pack-myth_buster.json` | new `pack-numbers_to_people.json` |
| `scripts/eval-agent/cases/` | new `mystery-question.json` | new `myth-buster.json` | new `numbers-to-people.json` |
| `packages/packs/test/golden/<tool>/` | new folder | new folder | new folder |

**Catalogue after all three merge.** The recipe golden holds four lines, in this order, then the `propose_graph` line: `cold_open` (main), `mystery_question`, `myth_buster`, `numbers_to_people`. `mystery_question` sorts before `myth_buster` because `s` < `t`.
- GNP-10 first: its golden holds `cold_open` and `numbers_to_people`. The later PR regenerates the golden and adds its line in name order.
- GNP-10 after GNP-08 or GNP-09, or both: its step 12 regenerates the golden on the base and adds its line after `myth_buster` and `mystery_question` as they are present, and before `propose_graph`.

**Test counts.** `scripts/eval-cases.test.mjs` is not changed by GNP-10. It holds one test on main (GNP-07's). It holds two once GNP-08 merges, in either order, and GNP-10 does not change that. GNP-10's new file `scripts/eval-case-numbers-to-people.test.mjs` holds one test in every order. The sibling files hold one test each.

**Disagreement between the siblings (open point 2).** GNP-08's plan (step 9) appends a test to `scripts/eval-cases.test.mjs`; GNP-09's revision 1 uses its own file. This plan works in both cases, because it touches neither shared test file.

**Other lists of tool names (not changed by GNP-10).** `packages/contracts/src/graph-runner/examples.ts` names `mystery_question` and `cold_open` (GRR-01 and GRR-16 own it; GNP-08 open point 3). GNP-23's `targetShape` enum (later) must list `numbers_to_people`.

## 4. Files to change

| Path | Change | Reason |
|---|---|---|
| `packages/packs/nonfiction/tools/numbers_to_people.yaml` | new | the tool spec (step 3) |
| `packages/packs/test/golden/numbers_to_people/statistic-person.fixture.json` | new | the case's arguments and entities (step 4) |
| `packages/packs/test/golden/numbers_to_people/statistic-person.golden.json` | new, written by step 7 | the recorded request |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by step 12 | the catalogue gains the `numbers_to_people` line (D4, C7) |
| `e2e/fixtures/mock-openai/scenarios/pack-numbers_to_people.json` | new | one scripted reply (step 5) |
| `apps/api/test/packs/numbers-to-people.test.ts` | new | the test of AC 2 (step 6) |
| `scripts/eval-agent/cases/numbers-to-people.json` | new | the eval case (step 9) |
| `scripts/eval-case-numbers-to-people.test.mjs` | new | the test of AC 3 (step 10) |

Not changed: `units/**`; `modules/**`; `plans/**` other than this plan; `plans/DECISIONS.md`; `packages/packs/test/checks.ts`; `packages/packs/test/real-packs.test.ts`; `packages/packs/test/golden/propose_graph/story.golden.json`; `packages/packs/test/golden/cold_open/**`; `packages/packs/nonfiction/tools/cold_open.yaml` (the M1 reference); `packages/packs/nonfiction/entity-types/**`; `packages/packs/core/**`; `apps/api/src/**`; `apps/api/test/packs/golden.kit.ts`, `cold-open.test.ts` and `propose-graph.test.ts`; `apps/api/test/fixtures/**`; `scripts/eval-cases.test.mjs`; `scripts/eval-agent/run.mjs`, its README and its test; `e2e/**` specs; `examples/**`; `packages/contracts/**`; `package-lock.json`; the GNP-08 and GNP-09 files, branches and worktrees.

## 5. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. The implementer works on the branch `unit/GNP-10` created from `main`, records `node -v` and `npm -v` with the results, does not push, and does not use `git add -A` or `git commit -a`.

0. **Base.** Seam: read-only git and the filesystem. `git rev-parse --short HEAD` (expected `e896ec4` or a later main). `test ! -e packages/packs/nonfiction/tools/numbers_to_people.yaml` and `test ! -e scripts/eval-case-numbers-to-people.test.mjs` exit 0. `ls packages/packs/nonfiction/tools` lists `cold_open.yaml` and any sibling tool already on main; record which. `ls packages/packs/test/golden/propose_graph` lists four files. If a check fails, re-read the changed files before editing.
1. **Runtime and baseline.** Seam: TypeScript build and the API pack tests. `node -v` prints `v26.x` (A1). `npm ci` only if `node_modules/` is absent. `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api` exits 0. `cd apps/api && npx vitest run test/packs` exits 0 before any change.
2. **Branch.** Seam: git. `git switch -c unit/GNP-10` from `main`.
3. **Tool spec (U1 to U3, M1 to M3, M6, M7, C1 to C5, C11).** Seam: pack lint, checked in step 11. Create `packages/packs/nonfiction/tools/numbers_to_people.yaml` with the content below, then `npx prettier --write` on it. The five common-input properties are copied verbatim from `cold_open.yaml`; the content check of step 11 compares them (M1).

```yaml
schemaVersion: 1
name: numbers_to_people
description: Turn one statistic into the story of one person behind it.
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
    statistic:
      type: string
      title: Statistic
      x-scriba-type: text
      x-scriba-port: true
    person:
      type: string
      title: Person
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [person]
  required: [coreIdea, statistic, person]
output: draft
enabled: true
prompt: |
  You write a nonfiction passage that turns one statistic into the story of the person behind it.

  Core idea: {{coreIdea}}
  Statistic: {{statistic}}
  Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}
  Material:
  {{entity person}}
  {{#each entityIds}}
  {{entity this}}
  {{/each}}
  {{#if styleProfile}}
  {{entity styleProfile}}
  {{/if}}

  Steps:
  1. State the statistic: give the number in the words above, with what it counts.
  2. Introduce the person behind it: name the person and their part in the work that produced the number, using only the material.
  3. Tell their story: follow the person through the events the material gives, in order.
  4. Return to what the number means: end on what the statistic says about the core idea, in plain words.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

4. **Fixture (D6, C4, C6).** Seam: `toolCallRequestSchema` in `golden.kit.ts`, read by step 7. Create `packages/packs/test/golden/numbers_to_people/statistic-person.fixture.json` with the content below, then `npx prettier --write` on it. The arguments omit `length` and `tone`, so the default applies (A3).

```json
{
  "arguments": {
    "coreIdea": "Expertise grows from planned practice, not from the hours alone.",
    "entityIds": ["notes-a", "claim-a"],
    "styleProfile": "style-a",
    "statistic": "Seven of the twelve people in the study practised with a teacher setting the task.",
    "person": "person-a"
  },
  "entities": [
    {
      "ref": "person-a",
      "type": "person",
      "path": "entities/person-a.md",
      "content": "Person A set the practice tasks in the study and kept the results in a notebook."
    },
    {
      "ref": "notes-a",
      "type": "source",
      "path": "sources/notes-a.md",
      "content": "Notes A say that each practice session in the study was planned in advance, with a teacher setting the task."
    },
    {
      "ref": "claim-a",
      "type": "claim",
      "path": "entities/claim-a.md",
      "content": "Claim A says that the practice hours in the study were estimates made from memory."
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

5. **Scenario (D5).** Seam: the mock OpenAI server, which loads every `.json` in `scenarios/`. Create `e2e/fixtures/mock-openai/scenarios/pack-numbers_to_people.json` with the content below, then `npx prettier --write` on it.

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["Seven of the twelve people in the study practised with a teacher setting the task [@person-a]."]
      }
    }
  ]
}
```

6. **Golden test file (AC 2, C6).** Seam: `goldenCase` on `POST /api/tool-registry/tools/:name/execute`. Create `apps/api/test/packs/numbers-to-people.test.ts` with the content below, then `npx prettier --write` on it. Its `renderedPrompt` function is the one of `apps/api/test/packs/cold-open.test.ts`, copied unchanged. The file contains no `any` and does not contain the text `examples/`.

```ts
import { expect, it } from 'vitest';
import { goldenCase, type GoldenRunResult } from './golden.kit';

// The rendered prompt: the content of the user message in the request the mock recorded.
// (Copied unchanged from cold-open.test.ts.)
function renderedPrompt(result: GoldenRunResult): string {
  const user = result.request.messages.find(
    (message): message is { role: 'user'; content: string } =>
      typeof message === 'object' &&
      message !== null &&
      'role' in message &&
      message.role === 'user' &&
      'content' in message &&
      typeof message.content === 'string',
  );
  if (user === undefined) {
    throw new Error(
      'the recorded request has no user message with a string content',
    );
  }
  return user.content;
}

it(
  'AC 2: the numbers_to_people golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, sourcesUsed leaves out the style profile, and invalid arguments return a readable Ajv error',
  goldenCase({
    tool: 'numbers_to_people',
    name: 'statistic-person',
    expect: {
      kind: 'draft',
      sourcesUsed: ['notes-a', 'claim-a', 'person-a'],
    },
    invalidWithout: 'statistic',
    check: (result) => {
      const prompt = renderedPrompt(result);
      for (const id of ['person-a', 'notes-a', 'claim-a', 'style-a']) {
        expect(prompt, id).toContain(id);
      }
      expect(prompt).toContain('[@');
      expect(prompt).toContain('TK (');
      expect(prompt).toContain(
        'Statistic: Seven of the twelve people in the study practised with a teacher setting the task.',
      );
      expect(prompt).toContain('Length: 800 words');
      expect(prompt).toContain('game-changer');
    },
  }),
  60000,
);
```

7. **Golden update run (D1, C10, A3, A6, A7).** Seam: the golden helper's update mode. `cd apps/api && npx vitest run test/packs/numbers-to-people.test.ts -- --update-goldens` exits 0 and writes `packages/packs/test/golden/numbers_to_people/statistic-person.golden.json`. Read it: `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft` (`executor.service.ts`); `messages[1].content` contains `Core idea: Expertise grows from planned practice, not from the hours alone.`, the statistic line of step 6, `Length: 800 words.`, the four IDs, `game-changer`, `[@` and `TK (`; it contains no `Tools for a recipe`. Then `npx prettier --write packages/packs/test/golden/numbers_to_people`. `git status --short` shows no other golden changed.
8. **Compare run (D8).** Seam: golden comparison by value. `cd apps/api && npx vitest run test/packs/numbers-to-people.test.ts` exits 0 with one test passed and the golden status `match`.
9. **Eval case (AC 3, C9).** Seam: the eval data folder, read by step 10. Create `scripts/eval-agent/cases/numbers-to-people.json` with the content below, then `npx prettier --write` on it.

```json
{
  "sample": "nonfiction",
  "intent": "Turn the ten-thousand-hour figure in chapter 3 into the story of the person behind it, using my notes.",
  "expect": {
    "reason": "completed",
    "tools": ["numbers_to_people"],
    "citations": "present"
  }
}
```

10. **Eval data test (AC 3, C8).** Seam: `node:test` on the case file; no model. Create `scripts/eval-case-numbers-to-people.test.mjs` with the content below, then `npx prettier --write` on it. The file contains no `examples/` text. `node --test scripts/eval-case-numbers-to-people.test.mjs` exits 0 with one test passed.

```js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// AC 3 of GNP-10: the numbers-to-people case is in the Agent loop's eval data. It reads the case file and runs no model.
const CASE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
  'numbers-to-people.json',
);

test('AC 3: the numbers-to-people eval case is in the eval data and uses the documented keys and values', () => {
  const data = JSON.parse(readFileSync(CASE_FILE, 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
  assert.deepEqual(Object.keys(data.expect).sort(), ['citations', 'reason', 'tools']);
  assert.equal(data.sample, 'nonfiction');
  assert.equal(typeof data.intent, 'string');
  assert.ok(data.intent.length > 0, 'intent is not empty');
  assert.deepEqual(data.expect.tools, ['numbers_to_people']);
  assert.equal(data.expect.reason, 'completed');
  assert.equal(data.expect.citations, 'present');
});
```

11. **Pack checks (AC 1, A4).** Seam: `lintPacks` and `contentChecks` on the real packs (`packages/packs/test/real-packs.test.ts`), and the `lint-packs` CLI. `npm run lint:packs` exits 0 and prints no finding that names `numbers_to_people`. `npm test -w @bbartolome/scriba-packs` exits 0.
12. **Catalogue golden (D4, D18, C7, C10, A5).** Seam: `{{toolCatalog}}` in the `propose_graph` recipe golden. `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens`, then `npx prettier --write packages/packs/test/golden/propose_graph`. Expected: `git diff --stat -- packages/packs/test/golden/propose_graph` shows one line removed and one added in `recipe.golden.json` (the `content` line) and no change in `story.golden.json`. The added line is the one below, placed as C7 says. Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0. Repeat this step after each rebase (section 3).

`- numbers_to_people: Turn one statistic into the story of one person behind it. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); statistic (text, single, required); person (entity, single, required).`

13. **API build, lint and pack tests (AC 2).** Seam: the composed app booted on the real packs (`apps/api/test/packs/nonfiction-entity-types.test.ts`). `npm run build -w @bbartolome/scriba-api && npm run lint -w @bbartolome/scriba-api` exit 0. `cd apps/api && npx vitest run test/packs` exits 0.
14. **Format and root gates.** Seam: Prettier, the root scripts and the mock-openai test. `npx prettier --check packages/packs/nonfiction/tools/numbers_to_people.yaml packages/packs/test/golden/numbers_to_people packages/packs/test/golden/propose_graph e2e/fixtures/mock-openai/scenarios/pack-numbers_to_people.json apps/api/test/packs/numbers-to-people.test.ts scripts/eval-agent/cases/numbers-to-people.json scripts/eval-case-numbers-to-people.test.mjs` exits 0. From the root, `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0; a failure already on the base is reported, not fixed. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario.
15. **Tool list in the app (optional, A10).** Seam: the Playwright `tools-preview` spec. Run `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts` only if the browser is installed; otherwise record it as not run.
16. **Commit (implementer, when the orchestrator asks).** Seam: git index. `git add` each path of section 4 by name. `git diff --cached --stat` lists only those paths and no `plans/` or `units/` file. Commit with `feat(GNP-10): numbers_to_people nonfiction draft tool, golden case and eval case`. Do not push.

## 6. Tests

Each acceptance criterion has exactly one test. The text is copied from `units/GNP-10-numbers-to-people.md`. Nothing is marked passed in this plan.

**AC1: Passes `npm run lint:packs` and the content-check suite.** (unit line 21)
- Test file: `packages/packs/test/real-packs.test.ts` (existing, unchanged). Test name: `real packs > the suite passes on the real packs`.
- Command: `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (step 11).
- Pass: both exit 0; no finding names `numbers_to_people`. The tool is loaded from the real packs by the AC 2 test (its valid call returns 200 and its golden matches).

**AC2: Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.** (unit line 22)
- Test file: `apps/api/test/packs/numbers-to-people.test.ts` (new). Test name: `AC 2: the numbers_to_people golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, sourcesUsed leaves out the style profile, and invalid arguments return a readable Ajv error`.
- Command: `cd apps/api && npx vitest run test/packs/numbers-to-people.test.ts` (steps 7 and 8).
- Pass: one test passes. The golden status is `match`; the kind is `draft`; `sourcesUsed` is `['notes-a', 'claim-a', 'person-a']`; the call without `statistic` returns 422 `TOOL_ARGS_INVALID` with a message that contains `statistic`; one model call; the `check` of step 6 passes.

**AC3: A manual eval case (small and larger local model) is added to the Agent loop's eval script data.** (unit line 24)
- Test file: `scripts/eval-case-numbers-to-people.test.mjs` (new). Test name: `AC 3: the numbers-to-people eval case is in the eval data and uses the documented keys and values`.
- Command: `node --test scripts/eval-case-numbers-to-people.test.mjs` (steps 10 and 14).
- Pass: 1 test passes. The run with a small and a larger local model is not part of this test (open point 1).

## 7. Agreement with downstream units

- **GNP-12 (workhorses gate; `blocked_by` names GNP-10, `units/GNP-12-workhorses-gate.md` line 7).** It needs from GNP-10: the tool shipped as a draft and enabled (its criterion 1 names "all four tools", and GNP-10 is the fourth); the five common inputs identical to the other drafts (its criterion 1, which AC 1 and step 11 check); a golden test that passes, with entities, citations, placeholders and `sourcesUsed` (its criterion 2, which AC 2 checks); the eval case in the eval data, which its "done when" reads with a real model (its criterion 4; AC 3 adds the case, and the real run is open point 1). The plan provides all of these. Agreed; GNP-12 is not changed.
- **GNP-23 (remix; `blocked_by` names GNP-10, `units/GNP-23-remix.md` line 7).** It needs `numbers_to_people` in its `targetShape` enum, which requires the name `numbers_to_people`, `output: draft`, `enabled: true`, and the file in `packages/packs/nonfiction/tools/`. The plan provides all of these. `checkRemix` in `packages/packs/test/checks.ts` then holds GNP-23's enum to the set. Agreed; GNP-23 is not changed.
- **GNP-08 and GNP-09 (parallel).** Section 3.
- **Done units used as they are:** GNP-02 (helper and conventions), GNP-03 and GNP-06 (`person` kind), GNP-07 (pattern and common-input blocks), GNP-11 (the sample person for the eval case), GNP-04 (catalogue golden). No change to them.
- **Inverse links.** `unblocks` of GNP-02, GNP-03 and GNP-06 name GNP-10; `blocked_by` of GNP-12 and GNP-23 name GNP-10; `parallel_with` is symmetric with GNP-05, GNP-07, GNP-08, GNP-09, GNP-11 and GNP-13. Checked (section 2).

## 8. Open points

1. **AC 3, the run with a small and a larger local model, is not run here.** Cause: it needs a local model server (`npm run eval:agent -- --model <small> --model <larger>`, `scripts/eval-agent/README.md`) and it is not part of CI. The local test is the data test of AC 3, as `plans/GNP-07.md` C9 and `plans/GNP-08.md` open point 1 do. Owner: whoever runs the eval; GNP-12's "done when" reads this case with a real model.
2. **`scripts/eval-cases.test.mjs`: GNP-08 and GNP-09 disagree.** GNP-08's plan (step 9) appends a test to it; GNP-09's revision 1 uses its own file. This plan works with both, because GNP-10 touches neither shared test file. Owners: GNP-08 and GNP-09 plans; no action here.
3. **GNP-09's plan is being edited in the working tree.** `plans/GNP-09.md` is modified and not committed (the reviser's edit, 15:22). This plan reads that version. If the final version changes the shared-file rule of its section 3, the orchestrator must re-check section 3 of this plan before the implementer starts. Cause: a concurrent revision.

Sections complete: front matter, and sections 1 to 8 (decisions, facts and assumptions, shared files with GNP-08 and GNP-09, files, procedure, tests, downstream agreement, open points). All three acceptance criteria have one test each.
