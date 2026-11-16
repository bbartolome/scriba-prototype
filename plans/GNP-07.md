---
id: GNP-07
status: draft
---
# GNP-07 plan — cold_open nonfiction draft tool, golden case and eval case

Batch: [GNP-07] (Genre packs, phase:nonfiction-workhorses, M2), a batch of one. Draft by the planner at main `2774d91` (HEAD when read). The session began at `e8f2227`; `2774d91` (the Navigator's decision on GNP-04) landed during planning, and this plan reads it. The unit file was read in full (lines 1 to 24). It has no note that records a change of the unit: a search of `units/GNP-07-cold-open.md` for "Removed by", "Loosened by", "Reworded by", "Moved to" and "revision" finds nothing. The planner changed no file, committed nothing, and ran no build, install, test or npm command. The only modified file in the working tree is `units/SAU-12-providers-step.md`, which is not this plan's.

Each fact is either checked (read in the repository at `2774d91`) or marked ASSUMED, with the step that checks it (section 7).

## 1. Decisions this plan follows

Labels: **U** = the unit, **M** = the module, **G** = a settled decision of another unit, plan or the contract, **N** = a Navigator decision, **C** = a smaller choice made by this plan (recorded here, not in `plans/DECISIONS.md`).

- **U1 Spec and file.** `packages/packs/nonfiction/tools/cold_open.yaml`, output `draft`, `enabled: true`, description "Open mid-scene with one person at one moment, then pull back to the idea.", `name` `cold_open`, `schemaVersion: 1`. Source: unit lines 15 and 16; module line 37 (`tools/<name>.yaml`); module line 43 (spec fields).
- **U2 Inputs.** The five common inputs, then `person` (entity port, kind `person`, required) and `moment` (text port, optional). `required` is `[coreIdea, person]`. Source: unit line 17; module lines 56 to 64 (common inputs; `coreIdea` and `entityIds` rows at 60 and 61).
- **M1 The common inputs are verbatim and identical on every draft tool.** Source: module line 56 ("repeated verbatim; CI asserts identity"). The content check `checkCommonInputs` in `packages/packs/test/checks.ts` compares, for each of the five keys, the whole property and the `required` flag with the first draft tool's, in pack order. The block in section 2 is therefore the reference that every sibling draft copies (section 5).
- **M2 Entity inputs carry `x-scriba-type: entity` and, where one kind is meant, `x-scriba-entity-kinds`.** Source: module line 66. Applied to `person`, which takes `[person]`.
- **C1 `entityIds` carries no kind hint.** `entityIds` is a common input, so its schema must be the same on every draft tool, fiction drafts included. A list of kinds that suits every draft cannot be shipped: the fiction kinds are not shipped and the content check refuses an unshipped kind (GNP-01 unit line 18). The units of the siblings GNP-08, GNP-09, GNP-10 and GNP-15 write `entityIds` as "[entity list]" with no kinds (their unit line 17). The module's common-input row says "Entities and sources to draw from" (line 61), so source refs must be accepted there too. This is the choice GNP-04 makes for `entityIds` (its C10). It departs from the generic sentence of module line 66; open point 1.
- **C2 `tone` is a free-text string, with no enum.** The module gives no values (line 64, "Optional tone override"). The style profile's own `tone` is a free string (`packages/packs/core/entity-types/style-profile.yaml`, property `tone`, `type: string`). The registry's cold-open fixture and contract test use `enum: [warm, dry]`; that enum is not copied. Open point 2.
- **C3 `length` bounds.** `type: integer`, `default: 800`, `minimum: 200`, `maximum: 2000`, taken from the registry's cold-open fixture (`apps/api/test/fixtures/packs/core/tools/cold_open.yaml`). The module gives the default only (module line 63). Open point 3.
- **C4 Control hint.** `coreIdea` carries `x-scriba-control: textarea`, which `plans/TRG-02.md` line 193 says GNP-07 may set. No other input carries a control hint; the form derives the controls (`plans/TRG-02.md` D3 and D10, as the fixture does).
- **U3 Prompt.** The skeleton of module lines 46 to 50: a role line; the material (`{{entity person}}`, `{{#each entityIds}}`, and the style profile entity under `{{#if styleProfile}}`); the steps, in the order the unit gives: the moment, the person, the pull-back, the idea (unit line 18); the constraints: use only the material, `[@id]` citations, `TK (note)` for missing facts, the style profile's tone and banned phrases, and the length. The prompt does not use `{{toolCatalog}}`.
- **M3 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if field}}`, `{{entity X}}` and `{{toolCatalog}}` are used (`plans/TRG-08.md` C5 and C12, as GNP-04 U11 cites them). The entity header that `{{entity X}}` renders is `<type> <ref> (<path>)`, followed by the file's text (`apps/api/src/modules/tool-registry/template.ts` `renderEntity`; `plans/TRG-08.md` C12).
- **G1 `sourcesUsed` is computed by the registry.** It is the de-duplicated, non-style entity refs of the arguments, in property order. The model is never asked for sources (module line 51; `executor.service.ts`, `prepare`). For the golden case below this gives `['notes-a', 'notes-b', 'researcher-a']`.
- **G2 Golden case through the GNP-02 helper.** One case, `person-moment`, run by `goldenCase` in `apps/api/test/packs/golden.kit.ts` with `invalidWithout: 'coreIdea'` (GNP-02 plan section 5 names it for GNP-07) and a `check`. Goldens and fixture under `packages/packs/test/golden/cold_open/`; the mock scenario `pack-cold_open.json` (GNP-02 D5, D6, D12). No test reads `examples/` (GNP-02 D11; module line 88).
- **G3 The catalogue of the recipe view.** `{{toolCatalog}}` renders one line for every valid, enabled tool of the packs root (`executor.service.ts`, `prepare`; `template.ts` `formatCatalogEntry`). Adding `cold_open` therefore changes the recipe golden of `propose_graph` (GNP-04 U12 and U14, and GNP-02 D18). Section 5 gives both merge orders.
- **N1 The catalogue of `propose_graph` is gated by `includeCatalogue`** (Navigator, 2026-11-16). Only the recipe golden of GNP-04 holds the catalogue; the story golden does not (`plans/GNP-04.md` N1 and C9, lines 13 to 19 and 59; `units/GNP-04-propose-graph.md` line 16). This is the input that G3 depends on.
- **U4 Eval case.** One case file in the Agent loop's eval data, `scripts/eval-agent/cases/cold-open.json`. The operator runs it with a small and a larger local model (`--model` twice) through the manual script `npm run eval:agent` (unit line 24; module line 90; `scripts/eval-agent/README.md`). Nothing runs it in CI (unit README line 138).
- **C5 Eval values.** `sample` `nonfiction`. `intent` "Draft the cold open of chapter 3 about K. Anders Ericsson, using my notes." Chapter 3 has no cold open yet (`plans/PST-11.md` line 33), and `K. Anders Ericsson` is the sample's `person` entity `k-anders-ericsson` (`examples/nonfiction/entities/k-anders-ericsson.md`). `expect`: `reason` `completed`, `tools` `["cold_open"]`, `citations` `present` (`scripts/eval-agent/README.md`, the keys and values).
- **C6 Seam of AC 3.** A new top-level file `scripts/eval-cases.test.mjs`. Root `npm test` runs `node --test 'scripts/*.test.mjs'` (root `package.json` line 25), so the file runs in CI. It reads the case files and checks the keys and values that `scripts/eval-agent/README.md` documents. It runs no model. It is not placed in `scripts/eval-agent/`, because that folder is outside the root glob.
- **C7 Names and timeout.** Case `person-moment`. Entity IDs `researcher-a`, `notes-a`, `notes-b` and `style-a`, which match `^[a-z0-9][a-z0-9-]*$`. Test file `apps/api/test/packs/cold-open.test.ts`. Timeout 60000 ms for the one test, as GNP-04 C7 does for its tests.
- **C8 The folder's placeholder.** `packages/packs/nonfiction/tools/.gitkeep` is deleted, because the folder now holds a file (GNP-06 D14 precedent; GNP-04 C1).

## 2. Files to create or change

Only these paths change. The `propose_graph` golden in section 5 changes only if GNP-04 is already on the base.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/nonfiction/tools/cold_open.yaml` | new | The tool spec (step 2) |
| `packages/packs/nonfiction/tools/.gitkeep` | delete (`git rm`) | C8 |
| `packages/packs/test/golden/cold_open/person-moment.fixture.json` | new | The arguments and four entities of the case (step 3) |
| `packages/packs/test/golden/cold_open/person-moment.golden.json` | created by the update run (step 7) | The recorded request |
| `e2e/fixtures/mock-openai/scenarios/pack-cold_open.json` | new | One scripted reply (step 4) |
| `apps/api/test/packs/cold-open.test.ts` | new | The test of AC 2 (step 5) |
| `scripts/eval-agent/cases/cold-open.json` | new | The eval case (step 6) |
| `scripts/eval-cases.test.mjs` | new | The test of AC 3 (step 6) |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by the update run, only when GNP-04 is on the base (step 9) | The recipe golden gains the `cold_open` catalogue line (section 5) |

Not changed: `packages/packs/package.json`; `packages/packs/core/**`; `packages/packs/nonfiction/entity-types/**`; `packages/packs/fiction/**`; `packages/packs/test/README.md` and the GNP-01 suite; `apps/api/src/**`; `apps/api/vitest.config.mts`; `apps/api/test/packs/golden.kit.ts`; `e2e/fixtures/mock-openai/server.mjs`; `e2e/**` specs; `scripts/eval-agent/run.mjs`, its README and `run.test.mjs`; `examples/**`; `.prettierignore`; `package-lock.json`; `units/**`; `modules/**`; `plans/**`; `units/SAU-12-providers-step.md`.

### The tool spec (`packages/packs/nonfiction/tools/cold_open.yaml`)

The five common-input blocks are the reference of M1. Copy them verbatim into any sibling draft tool.

```yaml
schemaVersion: 1
name: cold_open
description: Open mid-scene with one person at one moment, then pull back to the idea.
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
    person:
      type: string
      title: Person
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [person]
    moment:
      type: string
      title: Moment
      x-scriba-type: text
      x-scriba-port: true
  required: [coreIdea, person]
output: draft
enabled: true
prompt: |
  You write the cold open of a nonfiction chapter: a short passage that starts in the middle of one scene.

  Core idea: {{coreIdea}}
  {{#if moment}}Moment: {{moment}}
  {{/if}}Length: {{length}} words.
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
  1. The moment: open in the middle of one scene, at the moment given above when there is one, with the person in it.
  2. The person: show the person doing one thing in that moment, using only what the material says about them.
  3. The pull-back: step back from the scene to the question the chapter raises.
  4. The idea: end on the core idea, in plain words.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

Then `npx prettier --write` on the file. If Prettier changes the prompt text, keep its form and record the change.

### The fixture (`packages/packs/test/golden/cold_open/person-moment.fixture.json`)

The arguments omit `length` and `tone`, so the default applies and `tone` stays absent. The entity texts are original.

```json
{
  "arguments": {
    "coreIdea": "Expertise grows from planned practice, not from the hours alone.",
    "entityIds": ["notes-a", "notes-b"],
    "styleProfile": "style-a",
    "person": "researcher-a",
    "moment": "A lab bench at dusk, one stopwatch on the table and a notebook held open."
  },
  "entities": [
    {
      "ref": "researcher-a",
      "type": "person",
      "path": "entities/researcher-a.md",
      "content": "Researcher A times each practice session and writes the result in a notebook."
    },
    {
      "ref": "notes-a",
      "type": "source",
      "path": "sources/notes-a.md",
      "content": "Notes A say that each practice session was planned in advance, with a teacher setting the task."
    },
    {
      "ref": "notes-b",
      "type": "source",
      "path": "sources/notes-b.md",
      "content": "Notes B say that the practice hours in the study were estimates made from memory."
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

### The scenario (`e2e/fixtures/mock-openai/scenarios/pack-cold_open.json`)

One step, matched on the chat endpoint, as `pack-golden_probe.json` is.

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["The bench lamp was still on when the researcher opened the notebook [@researcher-a]."]
      }
    }
  ]
}
```

### The eval case (`scripts/eval-agent/cases/cold-open.json`)

```json
{
  "sample": "nonfiction",
  "intent": "Draft the cold open of chapter 3 about K. Anders Ericsson, using my notes.",
  "expect": {
    "reason": "completed",
    "tools": ["cold_open"],
    "citations": "present"
  }
}
```

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-07`, created from `main`. Record `node -v` (expected `v26.x`) and `npm -v` (expected `11.x`) with each result (assumption A1). Do not push. Do not use `git add -A` or `git commit -a`.

0. **Base.** `git rev-parse --short HEAD` and `git status --short` (expected: only `units/SAU-12-providers-step.md`, if it is still modified). `test ! -e packages/packs/nonfiction/tools/cold_open.yaml` exits 0. `ls packages/packs/nonfiction/tools packages/packs/core/tools` lists only `.gitkeep`, unless GNP-04 has merged (then `propose_graph.yaml` is listed; step 9 applies). `ls apps/api/test/packs` lists `golden.kit.ts`. If a check fails, re-read the changed files before editing.
1. **Runtime and baseline.** `npm ci` if the worktree has no `node_modules/`. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && (cd apps/api && npx vitest run test/packs)` exits 0, with the GNP-02, GNP-03 and GNP-06 tests passing.
2. **Tool spec (U1 to U3, M1 to M3, C1 to C4, C8).** Create `packages/packs/nonfiction/tools/cold_open.yaml` with the content of section 2. Then `git rm -- packages/packs/nonfiction/tools/.gitkeep`, and `npx prettier --write packages/packs/nonfiction/tools/cold_open.yaml`.
3. **Fixture (G2, C7).** Create `packages/packs/test/golden/cold_open/person-moment.fixture.json` with the content of section 2. Then `npx prettier --write` on it.
4. **Scenario (G2).** Create `e2e/fixtures/mock-openai/scenarios/pack-cold_open.json` with the content of section 2. Then `npx prettier --write` on it.
5. **Golden test (AC 2, C7).** Create `apps/api/test/packs/cold-open.test.ts` as section 4 describes. It imports `it` and `expect` from `vitest` and `goldenCase` from `./golden.kit`. It has no `any` and does not contain the text `examples/`.
6. **Eval data and its test (AC 3, U4, C5, C6).** Create `scripts/eval-agent/cases/cold-open.json` with the content of section 2, and `scripts/eval-cases.test.mjs` as section 4 describes. Then `npx prettier --write` on both.
7. **Update run (G2).** `cd apps/api && npx vitest run -- --update-goldens test/packs/cold-open.test.ts` exits 0 and writes `packages/packs/test/golden/cold_open/person-moment.golden.json`. Read the file. `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft` (`executor.service.ts`). `messages[1].content` contains `Core idea: Expertise grows from planned practice, not from the hours alone.`, `Moment: A lab bench at dusk`, `Length: 800 words.` (the default, ASSUMED A9 until this step), the four IDs, `game-changer`, `[@` and `TK (`. It contains no `Tools for a recipe`, because the `cold_open` template does not render the catalogue.
8. **Format and compare run (G2, D8 of GNP-02).** `npx prettier --write packages/packs/test/golden/cold_open`. Then `cd apps/api && npx vitest run test/packs/cold-open.test.ts` exits 0 with one test passed and golden `match`. The golden is compared by value, so the Prettier write does not change the result.
9. **Catalogue of GNP-04's recipe golden (G3, N1; only if GNP-04 is on the base).** Run `ls packages/packs/test/golden/propose_graph`. If the folder does not exist, skip this step and record "GNP-04 not on base". If it exists, run `cd apps/api && npx vitest run -- --update-goldens test/packs/propose-graph.test.ts` and then `git diff -- packages/packs/test/golden/propose_graph`. The recipe golden must gain exactly one catalogue line, the `cold_open` line of section 7 A3, and the story golden must not change (N1). Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0.
10. **Pack checks (AC 1).** From the root, `npm run lint:packs` exits 0 with no finding for `cold_open` (ASSUMED A6; if a warning appears, fix the YAML, not the rule). `npm test -w @bbartolome/scriba-packs` exits 0: the real-packs test and the content checks pass with `cold_open` in the real packs.
11. **Type check and API tests.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0. `cd apps/api && npx vitest run test/packs` exits 0. The GNP-06 test boots the app on the real packs, so it also shows that `cold_open` does not stop the boot.
12. **Eval test (AC 3).** `node --test scripts/eval-cases.test.mjs` exits 0 with one test passed.
13. **Format and root gates.** `npx prettier --check packages/packs/nonfiction/tools/cold_open.yaml packages/packs/test/golden/cold_open e2e/fixtures/mock-openai/scenarios/pack-cold_open.json apps/api/test/packs/cold-open.test.ts scripts/eval-agent/cases/cold-open.json scripts/eval-cases.test.mjs` exits 0. From the root, `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario.
14. **Tool list in the running app (A10).** `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts` gives 2 passed, as TRG-13's plan (line 84) expects. The real packs now list the built-in `cold_open` (origin `nonfiction`) beside the user copy, and the spec selects the user row by `data-origin`. If the browser cannot run here, record it as not run.
15. **Commit.** `git add` each path of section 2 by name (the `git rm` of step 2 is already staged; the `propose_graph` golden only if step 9 ran). `git diff --cached --stat` lists only those paths and no `plans/` or `units/` file. Commit with `feat(GNP-07): cold_open nonfiction draft tool, golden case and eval case`. Do not push.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-07-cold-open.md` lines 21, 22 and 24 (the blank line 23 is in the unit). There is one test per criterion and no other test. Each is run in the step named.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "Passes `npm run lint:packs` and the content-check suite." (21) | No new test. The existing `packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs", is the test; it asserts zero errors and no content finding on the real packs. The lint gate is `npm run lint:packs`. The test is not vacuous for `cold_open`: the valid call of AC 2 must return 200, which proves that the tool loads and is enabled from `packages/packs`. | `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (step 10) | Both exit 0. No finding names `cold_open`. |
| "Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error." (22, 23) | `apps/api/test/packs/cold-open.test.ts`, "AC 2: the cold_open golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, and sourcesUsed leaves out the style profile" | `cd apps/api && npx vitest run test/packs/cold-open.test.ts` (steps 7 and 8) | One `it` with the timeout 60000. Its body is `goldenCase({tool: 'cold_open', name: 'person-moment', expect: {kind: 'draft', sourcesUsed: ['notes-a', 'notes-b', 'researcher-a']}, invalidWithout: 'coreIdea', check})`. The helper asserts: golden `match` (`written` in update mode); kind `draft`; `sourcesUsed` exactly as given; the call without `coreIdea` returns 422, code `TOOL_ARGS_INVALID`, a message containing `coreIdea`; one model call. The `check` takes `JSON.stringify(result.request)` and asserts that it contains each of `researcher-a`, `notes-a`, `notes-b` and `style-a`, the citation `[@`, the placeholder `TK (`, `Length: 800 words` (the default) and `game-changer` (the style profile's banned phrase reaches the prompt through `{{entity styleProfile}}`). |
| "A manual eval case (small and larger local model) is added to the Agent loop's eval script data." (24) | `scripts/eval-cases.test.mjs`, "AC 3: the cold-open eval case is in the eval data and uses the documented keys and values" | `node --test scripts/eval-cases.test.mjs` (step 12) | Every `*.json` in `scripts/eval-agent/cases/` has an id matching `^[a-z0-9][a-z0-9-]*$`, only the keys `sample`, `intent` and `expect`, and `expect` keys only among `reason`, `tools` and `citations`, with `reason` one of `completed`, `stopped`, `capped`, `error`, `project-switched` and `citations` one of `present`, `absent`, `any`. `cold-open.json` has a non-empty `intent`, `sample` `nonfiction`, `expect.tools` `["cold_open"]`, `expect.reason` `completed` and `expect.citations` `present`. The manual run itself is not part of this test (open point 4). |

Expected: the AC 2 test and the AC 3 test pass; the AC 1 suite passes. None is skipped.

## 5. Downstream agreement and the other units that change the same files

Plans with status `draft` or `planned` at `2774d91` (`grep -l '^status: \(draft\|planned\)' plans/*.md`): only `plans/GNP-04.md`. Its paths overlap this plan only in `packages/packs/test/golden/` (different files) and in the content of `propose_graph`'s recipe golden, which G3 explains. No other draft or planned plan changes a path of section 2.

**GNP-04 (`plans/GNP-04.md`, draft, revision 2, with N1).** It adds `packages/packs/core/tools/propose_graph.yaml`, deletes `packages/packs/core/tools/.gitkeep`, and adds `packages/packs/test/golden/propose_graph/{story,recipe}.{fixture,golden}.json`, `e2e/fixtures/mock-openai/scenarios/pack-propose_graph.json` and `apps/api/test/packs/propose-graph.test.ts`. The recipe golden renders the catalogue (N1; its C9 and step 7), so this plan's `cold_open` line changes it. This plan's own golden does not render the catalogue, so GNP-04 changes nothing in it. The two merge orders:

| Order on main | What the second PR does | Result on main |
|---|---|---|
| GNP-04 first, then GNP-07 | GNP-07 runs step 9: `propose_graph/recipe.golden.json` gains the `cold_open` line; the story golden does not change. | The recipe golden holds both lines and the propose-graph test passes. |
| GNP-07 first, then GNP-04 | GNP-07 changes no GNP-04 file, because none is on main. GNP-04 must run its own step 7 again after the rebase, so that the recipe golden holds the `cold_open` line. The fact in its A7 ("only `propose_graph` is in the catalogue") then holds for its own base only. | The same as above. |

The second row needs a rule in `plans/GNP-04.md` that the draft does not yet state (open point 5). This plan does not change that file.

**Sibling draft units GNP-08, GNP-09 and GNP-10 (parallel_with, no plan, no branch) and GNP-14 to GNP-16.** Each adds a line to `{{toolCatalog}}`, so the same rule applies: whichever of the two PRs merges second regenerates the recipe golden of GNP-04 (GNP-04 section 5). Each also copies the five common-input blocks of section 2 verbatim, because the content check (M1) refuses any difference. If one of GNP-08, GNP-09 or GNP-10 is on main before this unit, this unit replaces its five blocks with that unit's blocks, verbatim, before its own merge, and records the replacement in its PR. If this unit is first, each sibling copies the blocks of section 2. The check of M1 uses the first draft in pack order (`packages/packs/test/checks.ts`), so the block of this unit is the reference while it is the only draft (ASSUMED A7).

**GNP-12 (workhorses gate, `blocked_by` line 7 includes GNP-07).** It needs this unit's golden, its identical common inputs, and a `cold_open` card with its inputs and sources (its demo, step 3). The card carries the executor's `sourcesUsed` (G1). Agreed; nothing here changes GNP-12.

**GNP-23 (remix, `blocked_by` line 7 includes GNP-07).** Its `targetShape` enum must list `cold_open`, because it is a shipped draft tool. GNP-23 owns that change, and `checkRemix` in `packages/packs/test/checks.ts` enforces it once `remix.yaml` exists. Agreed; nothing here changes GNP-23.

**GRR-16 (sample recipe, no plan; `units/GRR-16-sample-recipe.md` line 19).** It chains the workhorses on their text ports and names "mystery question into cold open". The text ports of `cold_open` are `coreIdea` (required) and `moment`. GRR-16 must name which one it wires. This plan provides both.

**Inverse rule.** `blocked_by` of GNP-07 (`GNP-02`, `GNP-03`, `GNP-06`) is consistent with the `unblocks` lists of those three units (`units/GNP-02-golden-harness.md` line 9, `units/GNP-03-core-entity-types.md` line 9, `units/GNP-06-nonfiction-entity-types.md` line 9). The `unblocks` of GNP-07 (`GNP-12`, `GNP-23`) matches their `blocked_by` (lines 7). The `parallel_with` entries are symmetric with GNP-05, GNP-08, GNP-09, GNP-10, GNP-11 and GNP-13 (line 8 of each).

**Done units and plans used as they are.** GNP-02 (helper, scenario convention, D18), GNP-03 and GNP-06 (entity types; the `person` kind), GNP-01 (the content checks; no change), TRG-02 and TRG-06 (`plans/TRG-02.md` lines 186 and 193; `plans/TRG-06.md` lines 162 and 171: both say that `cold_open` pack content is GNP-07's, and agree), AGL-25 (the eval script and its case keys; no change to its files), TRG-13 (`e2e/specs/tools-preview.e2e.ts`; see open point 7).

## 6. Open points

1. **The kinds of `entityIds` (C1).** Settled here by the identity rule (M1) and by the sibling units' wording (`entityIds` as "[entity list]"). It departs from the generic sentence of module line 66, and it is the same question as GNP-04's open point 3, which is still open there. Navigator confirmation is requested. If the answer is a kind list, the block changes on every draft tool, and the fiction kinds must be shipped first (GNP-01 line 18).
2. **The type of `tone` (C2).** Chosen here: free text. TRG-17's unit (line 22) says that the user adds a `tone` select to the built-in `cold_open`, which implies that the built-in has no `tone`. GNP-07's unit (line 17) includes `tone`. The orchestrator should align TRG-17's wording. If the Navigator wants an enum, its values come from the Navigator. Not in the way of this plan.
3. **The `length` bounds (C3).** 200 and 2000 come from the registry's fixture, not from a source. Confirm or drop before the block is copied by the siblings. Not in the way of this plan.
4. **The manual eval run (AC 3).** Its two runs need a local model (a small and a larger one), which this environment does not have. The test covers the data only. Under `prompt.md`, "Criteria that you cannot test", the Navigator decides whether the box is ticked at merge. The planner does not decide it.
5. **GNP-04's rebase rule.** `plans/GNP-04.md` (draft, revision 2) does not say that its step 7 runs again after a rebase on a main that holds `cold_open`. Its A7 would then be false. The GNP-04 reviser must add the rule of section 5, second row. This plan does not change `plans/GNP-04.md`.
6. **The catalogue is not filtered by genre pack.** `catalog.service.ts` `list()` with no query lists every built-in tool, so a fiction project's recipe catalogue would also show the nonfiction `cold_open` line. `functions(genrePack)` does filter by origin, for the model's function list, so the agent is offered `cold_open` only in nonfiction projects (`offeredOrigins`, lines 66 to 70). The catalogue behaviour is existing (GNP-02 D18). Changing it would touch TRG-12 and GNP-04's open point 4. Not changed here.
7. **Stale statement in a done plan.** `plans/TRG-13.md` section 7 (line 147) says that the built-in packs hold no tool at main. After this PR they hold `cold_open`. The e2e spec selects the user copy by `data-origin` (lines 104 and 176), so its assertions should hold; step 14 checks it. The done plan is not changed.

## 7. Facts checked and facts assumed

### Facts checked (read at `2774d91`; nothing was run)

Unit and module:
- `units/GNP-07-cold-open.md`: front matter lines 2 to 9 (`blocked_by` `[GNP-02, GNP-03, GNP-06]`, `parallel_with` `[GNP-05, GNP-08, GNP-09, GNP-10, GNP-11, GNP-13]`, `unblocks` `[GNP-12, GNP-23]`); Spec lines 14 to 18; criteria lines 21 to 24. No change note.
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65; manual eval in CI line 138.
- `modules/genre-packs.md`: lines 7 and 18 (ordering, graph), 37 and 40 (pack layout and offered packs), 43 to 52 (spec fields, names, descriptions, skeleton, `sourcesUsed`, output kinds), 56 to 66 (common inputs and entity inputs), 85 to 90 (testing, golden, sample checks, manual evals), 98 (out of scope).

Other units and plans:
- `units/GNP-12-workhorses-gate.md` line 7 and `units/GNP-23-remix.md` line 7 name GNP-07 in `blocked_by`. `units/GNP-08-mystery-question.md`, `units/GNP-09-myth-buster.md`, `units/GNP-10-numbers-to-people.md` and `units/GNP-15-scene-builder.md` line 17 each give the five common inputs with `entityIds` as "[entity list]".
- `plans/GNP-02.md`: status `done`; D5, D6, D8, D11, D12, D18 (line 34); section 5 (line 133, the GNP-07 bullet).
- `plans/GNP-03.md` and `plans/GNP-06.md` (`done`); `plans/GNP-06.md` line 175 (the `person` kind in `entities/`).
- `plans/GNP-04.md` at `2774d91`: N1 lines 13 to 19; C9 line 59; U12 line 38; U14 line 40; step 7 line 169; section 5 line 198; A7 line 267; open points 2 to 5 at lines 209 to 228, still open. `units/GNP-04-propose-graph.md` line 16 (`includeCatalogue`). `plans/DECISIONS.md` line 5137 (the N1 entry).
- `plans/TRG-02.md` lines 186 and 193; `plans/TRG-06.md` lines 162 and 171; `plans/TRG-08.md` C5, C12; `plans/TRG-13.md` lines 84 and 147; `plans/PST-11.md` line 33 (chapter 3 has no cold open); `plans/AGL-25.md` (eval script, `done`).
- `units/TRG-17-editor-ui-gate.md` line 22; `units/GRR-16-sample-recipe.md` line 19.

Code, tests and data on main:
- `apps/api/test/packs/golden.kit.ts` (merged): `goldenCase`, `runGoldenCase`, `PACKS_ROOT`, `GOLDEN_ROOT`, `UPDATE_GOLDENS`. `goldenCase` asserts the golden status, the kind, the exact `sourcesUsed`, the 422 and `TOOL_ARGS_INVALID` with a message that contains `invalidWithout`, one model call, and then `check(result)`. `runGoldenCase` asserts status 200 for the valid call and exactly one recorded request.
- `e2e/fixtures/mock-openai/server.mjs` lines 52 to 83: every `.json` file of the scenarios folder is loaded; the scenario name is the file name. `e2e/fixtures/mock-openai/scenarios/pack-golden_probe.json` is the shape of this plan's scenario. There is no `pack-cold_open.json` on main.
- `apps/api/src/modules/tool-registry/executor.service.ts`: `OUTPUT_SYSTEM_MESSAGES.draft` (lines 31 and 32); `prepare` checks the entity kinds only where `x-scriba-entity-kinds` is present, maps style refs to the `style-profile` kind, and computes `sources` as the unique non-style refs; `toolCatalog` is `catalog.list()` filtered to valid and enabled tools.
- `apps/api/src/modules/tool-registry/validate.ts`: Ajv with `useDefaults: true` (line 37); entity refs are pushed field by field in the compiled field order (lines 108 to 135).
- `apps/api/src/modules/tool-registry/template.ts`: `formatCatalogEntry` (lines 557 to 568: `- name: description Output: kind. Inputs: key (type, single|list, required|optional); ...`, ports only); scalars render with `String` (line 535); `#if` counts as a use (line 511).
- `apps/api/src/modules/tool-registry/lint.ts`: control rules (lines 555 to 590: `textarea` needs a string; `entity-picker` needs an entity field; `style-picker` needs a style field); hint rules (lines 419 to 500; `entity-kind` is a warning for an undeclared kind, line 496); `template-unused` for a required input the prompt does not name (lines 813 to 818).
- `apps/api/src/modules/tool-registry/catalog.service.ts`: `list(query)` lines 189 to 201 (no genre filter by default); `offeredOrigins` lines 66 to 70 (`core`, `user` and the genre pack).
- `apps/api/src/modules/project-store/entities.service.ts` lines 57 to 62 (`content` is the file's text from `readText`); `apps/api/src/modules/project-store/entity-manifest.ts` lines 204 to 217 (`readText` decodes the whole file, so the front matter of the style profile reaches the prompt).
- `packages/packs/test/checks.ts`: `COMMON_INPUTS`, `DESCRIPTION_LIMIT` (120), `VERBS` (includes `open`), `checkCommonInputs` (against the first draft in pack order), `checkDescription` (the first word and the length), `checkRemix` (inactive without `remix.yaml`). `packages/packs/test/real-packs.test.ts` asserts no error and no content finding on the real packs.
- `packages/packs/core/entity-types/style-profile.yaml`: `tone` is a string; `packages/packs/nonfiction/entity-types/person.yaml`: kind `person`, folder `entities`.
- `packages/packs/*/tools/`: only `.gitkeep` on main; `packages/packs/test/golden/` holds `golden_probe` only; `scripts/eval-agent/cases/` holds `summarize-outline.json` only; `scripts/eval-cases.test.mjs` does not exist.
- `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` (the registry's fixture: the same five common inputs, with `entityIds` kinds `[person]`, `tone` as an enum, and `length` bounds 200 to 2000); `packages/contracts/test/tool-registry.schema.test.ts` lines 14 to 76 (the cold-open envelope, with the same shape).
- `e2e/specs/tools-preview.e2e.ts` lines 104 and 176 (the user row by `data-origin`); lines 186 and 187 (pickers of the user copy). `e2e/harness/global-setup.ts` line 80 (`SCRIBA_PACKS_DIR` is the real packs).
- `scripts/eval-agent/run.mjs` lines 36 to 38 (`CASE_KEYS`, `EXPECT_KEYS`, `RUN_END_REASONS`); `scripts/eval-agent/README.md` (the keys, and the sample id from `examples/samples.yaml`). `examples/samples.yaml` has the id `nonfiction`; `examples/nonfiction/project.yaml` has `genrePack: nonfiction`; `examples/nonfiction/entities/k-anders-ericsson.md` has `type: person`; `examples/nonfiction/drafts/the-ten-thousand-hour-idea.md` exists.
- Root `package.json` line 25 (`node --test 'scripts/*.test.mjs'`), line 26 (`lint`), line 28 (`lint:packs`). The script tests that read other folders (`scripts/publish-scripts.test.mjs`, `scripts/publish-workflow.test.mjs`) do not list `scripts/`, so a new top-level test file breaks none.
- `apps/api/test/packs/nonfiction-entity-types.test.ts` filters the lint findings to `nonfiction/entity-types/`, so a finding in `nonfiction/tools/` does not break it.

### Facts assumed (ASSUMED)

- **A1.** Node 26 and npm 11 are on the PATH, as the other plans state. Step 1 checks it.
- **A2.** `sourcesUsed` is `['notes-a', 'notes-b', 'researcher-a']`, because the compiled fields follow the property order (`validate.ts` pushes entity refs in field order, and `executor.service.ts` says "in property order"). The test of AC 2 checks it; if the order differs, the expected array is wrong, not the rule.
- **A3.** The catalogue line for `cold_open` reads `- cold_open: Open mid-scene with one person at one moment, then pull back to the idea. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); person (entity, single, required); moment (text, single, optional).`, placed where `catalog.list()` puts it. Step 9 reads the line from the regenerated golden.
- **A4.** `{{#if moment}}`, `{{#if tone}}` and `{{#if styleProfile}}` leave out their text when the value is absent, and the block tags on their own lines leave only blank lines. Step 7 reads the golden.
- **A5.** Prettier accepts the YAML prompt and the JSON files as written, or `prettier --write` makes them accept. Step 8 checks the golden; the comparison is by value (GNP-02 D8), so a Prettier write does not change its result.
- **A6.** `lint.ts` gives no error and no warning for `cold_open`. Its `textarea` is on a string, its entity hints are on a single entity and an entity list, its style input has no control, and its required inputs (`coreIdea`, `person`) are named in the prompt. Step 10 checks it.
- **A7.** While `cold_open` is the only draft tool on main, it is the first draft in pack order, so its block is the reference of M1. Checked: no draft tool file is on main. This becomes false when a sibling merges first (section 5).
- **A8.** The nonfiction sample is offered `cold_open` by the Agent loop, because `offeredOrigins('nonfiction')` contains `nonfiction`. This is checked by reading; the eval run that would show it is not run here.
- **A9.** `{{length}}` renders `800` for the default, because Ajv applies the default to the copy of the arguments that the renderer reads (`validate.ts`, `useDefaults: true`). Step 7 confirms it.
- **A10.** The `tools-preview.e2e.ts` spec passes unchanged with the built-in row present (its selectors are by origin). Step 14 checks it.
