---
unit: GNP-08
status: draft
module: genre-packs
milestone: M2
blocked_by: [GNP-02, GNP-03, GNP-06]
unblocks: [GNP-12, GNP-23]
---
# GNP-08 plan — mystery_question nonfiction draft tool, golden case and eval case

Batch: [GNP-08] (Genre packs, phase:nonfiction-workhorses, M2), a batch of one. Planner draft at main `9e4a879` (HEAD when read). The working tree holds only `units/SAU-12-providers-step.md` (modified, not this plan's). No `unit/GNP-08` branch and no GNP-08 worktree exist. The unit file was read in full (lines 1 to 24). It has no change note: a search of `units/GNP-08-mystery-question.md` for "revision", "Removed by", "Loosened by", "Reworded by" and "Moved to" finds nothing. The planner changed no file, committed nothing and ran no build, install or test.

## 1. Decisions this plan obeys

Labels: **U** = unit file; **M** = module file; **D** = a settled decision of a done unit or plan on main; **C** = a smaller choice made by this plan (recorded here, not in `plans/DECISIONS.md`). `grep -n "GNP-08" plans/DECISIONS.md` finds no entry, so no Navigator decision names this unit.

- **U1 Spec and file.** `packages/packs/nonfiction/tools/mystery_question.yaml`; `name` `mystery_question`; `schemaVersion: 1`; `output: draft`; `enabled: true`; description "Open with a puzzle, then unravel it to a surprising finding." Source: U lines 15 and 16; M lines 44 (names) and 45 (descriptions).
- **U2 Inputs.** The five common inputs, then `puzzle` (text port, required) and `surprisingFinding` (text port). `required` is `[coreIdea, puzzle]`. The unit writes no `required` on `surprisingFinding`, so it is optional (the same reading the unit gives `entityIds`). Source: U line 17; M lines 56 to 64.
- **U3 Prompt.** The skeleton of M line 46: a role line; the material (`{{#each entityIds}}` with `{{entity this}}`, and the style profile under `{{#if styleProfile}}`); the steps in the unit's order (pose the puzzle, deepen it, unravel it, land the surprising finding, tie it to the idea; U line 18); the constraints (use only the material, `[@id]`, `TK (note)`, tone, banned phrases, length). The prompt does not use `{{toolCatalog}}`. Source: U line 18; M lines 46 to 50.
- **M1 Common inputs verbatim.** Each of the five common inputs is identical on every draft tool. The content check `checkCommonInputs` in `packages/packs/test/checks.ts` compares the property and the `required` flag of each with the first draft tool in pack order. Pack files are read in name order (`yamlFilesIn`, sorted), so the first draft is `cold_open.yaml` for every merge order. The five blocks are copied from it (C5). Source: M line 56 ("repeated verbatim; CI asserts identity").
- **M2 Entity inputs.** `x-scriba-entity-kinds` only where an input means a definite set of kinds (M line 66). `entityIds` means "entities and sources" and gets no hint, as on `cold_open.yaml` and per the settled kind decision of `plans/GNP-07.md` N2. This unit has no single-kind entity input. Source: U line 17 ("[entity list]").
- **M3 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if field}}`, `{{entity X}}` and `{{toolCatalog}}` (M line 46; `plans/TRG-08.md` C5 and C12, as `plans/GNP-07.md` M3).
- **M4 `sourcesUsed`.** Computed by the Tool registry from entity-ID inputs, style refs excluded (M line 51; `apps/api/src/modules/tool-registry/executor.service.ts` `prepare`, lines 135 and 149 to 150). The prompt never asks for sources.
- **M5 Testing.** Golden test through `POST /api/tool-registry/tools/:name/execute` with `goldenCase` (M line 87). Goldens change only in the PR of the prompt edit (M line 87; `plans/GNP-02.md` D18). No unit test reads `examples/` (M line 88; `plans/GNP-02.md` D11). Manual eval cases go into the Agent loop's eval data (M line 90).
- **D1 Golden harness (GNP-02, done).** `goldenCase` and `runGoldenCase` in `apps/api/test/packs/golden.kit.ts`; scenario `pack-<tool>.json` (D5); fixture and golden at `packages/packs/test/golden/<tool>/<case>.fixture.json` and `.golden.json` (D6); the helper's standard assertions and its `check` hook (D10). Source: `plans/GNP-02.md` D5, D6, D10, D11, D12, D18.
- **D2 Entity types (GNP-03 and GNP-06, done).** The fixture uses kinds `source` (`packages/packs/core/entity-types/source.yaml`), `claim` (`packages/packs/nonfiction/entity-types/claim.yaml`) and `style-profile` (`packages/packs/core/entity-types/style-profile.yaml`). Source: `plans/GNP-03.md`; `plans/GNP-06.md`.
- **D3 Neighbour tool (GNP-07, done, on main).** The pattern of the `cold_open` case: the same five common-input blocks, the golden and fixture layout, the eval case, the eval-data test in `scripts/eval-cases.test.mjs`, and the rule that a new tool regenerates the catalogue golden (`plans/GNP-07.md` sections 1, 3 and 5; its C9 and C10).
- **D4 Catalogue golden (GNP-04, done).** `packages/packs/test/golden/propose_graph/recipe.golden.json` renders `{{toolCatalog}}` and holds the `cold_open` line. `packages/packs/test/golden/propose_graph/story.golden.json` does not render it. Adding this tool changes the recipe golden only (`plans/GNP-04.md` N1; `plans/GNP-02.md` D18).
- **C1 Invalid-argument key is `puzzle`.** The golden's invalid call drops `puzzle`, the tool's own required input. `plans/GNP-02.md` section 5 suggests `coreIdea` for GNP-08 (as for GNP-07); that is a suggestion of a done plan, not a decision of this unit. `puzzle` is the input this unit adds and no other test checks it. The 422 message names the key (`apps/api/src/modules/tool-registry/validate.ts`, `argsInvalid`, lines 218 to 240: `- puzzle: required, ...`).
- **C2 `surprisingFinding` is optional and may be given.** When the author gives it, the prompt says so and the model lands on it. When it is absent, the model takes the finding from the material. The golden fixture gives it, so its text is in the rendered prompt.
- **C3 Length and tone.** `length` has the bounds of `cold_open.yaml` (200 to 2000, default 800), as `plans/GNP-07.md` C3. `tone` is free text, as `plans/GNP-07.md` C2.
- **C4 Control hints.** `coreIdea` carries `x-scriba-control: textarea`, as `cold_open.yaml`. `puzzle` and `surprisingFinding` carry no control hint, as `cold_open`'s `moment`.
- **C5 Common-input blocks.** Copied verbatim from `packages/packs/nonfiction/tools/cold_open.yaml` (the full spec is in procedure step 2).
- **C6 Eval chapter.** Sample `nonfiction`; chapter 4, "The Plateau Is Not the End", which reads `Draft: not started.` in `examples/nonfiction/sources/outline.md`, so no existing draft conflicts. Its notes are `sources/learning-plateaus-notes.md`.
- **C7 Names.** Case `puzzle-finding`; entity IDs `notes-a`, `claim-a`, `style-a` (they match `^[a-z0-9][a-z0-9-]*$`); test file `apps/api/test/packs/mystery-question.test.ts`; one `it` with timeout 60000 ms, as `plans/GNP-07.md` C7.
- **C8 Seam of AC 3.** One new `test` in `scripts/eval-cases.test.mjs`, the file that GNP-07 created. The existing test is unchanged. The new test reads only `scripts/eval-agent/cases/` and runs no model.

## 2. Facts checked and assumed

### Checked (repository on main at `9e4a879`)

- Unit `units/GNP-08-mystery-question.md`: front matter (`blocked_by` GNP-02, GNP-03, GNP-06; `unblocks` GNP-12, GNP-23; `parallel_with` GNP-05, 07, 09, 10, 11, 13); Spec lines 15 to 18; criteria at lines 21, 22 and 24.
- Front matter against `units/README.md` lines 59 to 65 (blocker notation: `blocked_by` is the source; `unblocks` is its inverse; `parallel_with` is symmetric). The units whose `blocked_by` names GNP-08 are GNP-12 (line 7) and GNP-23 (line 7), and both are listed in `unblocks`. The `parallel_with` lists of GNP-05, 07, 09, 10, 11 and 13 name GNP-08 back.
- Module `modules/genre-packs.md`: lines 42 to 52 (tool-spec content rules), 56 to 64 (common inputs), 66 (entity inputs), 84 to 90 (testing).
- Plan statuses (front matter): GNP-01, 02, 03, 04, 05, 06, 07, 11 and AGL-25 are `done`. No plan has front-matter `status: draft` or `planned`, so no in-flight plan changes these files.
- Pack tree: `packages/packs/nonfiction/tools/` holds only `cold_open.yaml` (its `.gitkeep` is gone); `packages/packs/core/tools/` holds `propose_graph.yaml`.
- `packages/packs/nonfiction/tools/cold_open.yaml`: the five common-input blocks; the prompt layout (`{{#if moment}}` and `{{#each entityIds}}`) that this plan follows.
- `packages/packs/test/checks.ts`: `COMMON_INPUTS`; `checkCommonInputs` (property and `required` flag against the first draft); `VERBS` includes `open`; `DESCRIPTION_LIMIT` is 120; `checkRemix` (line 261) activates only with `core/tools/remix.yaml`. `packages/packs/test/real-packs.test.ts`: `describe('real packs')` and `it('the suite passes on the real packs')`.
- `apps/api/test/packs/golden.kit.ts`: `goldenCase` asserts golden status (`match`, or `written` in update mode), kind, exact `sourcesUsed`, 422 with `TOOL_ARGS_INVALID`, a message that contains `invalidWithout`, one model call, then `check(result)`. `runGoldenCase` reads `<name>.fixture.json`, posts to the execute route and reads scenario `pack-<tool>`.
- `apps/api/test/packs/cold-open.test.ts`: the `renderedPrompt` helper and the `it` shape this plan copies.
- `apps/api/src/modules/tool-registry/validate.ts` `argsInvalid` (lines 218 to 240): the message has one line per field issue, `- <field>: required, expected <type>, received nothing.`
- `apps/api/src/modules/tool-registry/executor.service.ts`: style refs checked against `style-profile` (line 135); `sources` are the unique non-style refs (lines 149 and 150).
- `apps/api/src/modules/tool-registry/catalog.service.ts` `rows()` iterates `[...names].sort()` (line 436). `template.ts` `formatCatalogEntry` (lines 557 to 568): `- <name>: <description> Output: <kind>. Inputs: <key> (<type>, single|list, required|optional); ...`, ports only.
- `packages/packs/test/golden/propose_graph/recipe.golden.json`: the user message has `Tools for a recipe:` with the `cold_open` line, then the `propose_graph` line. `story.golden.json` has no `cold_open` text. `apps/api/test/packs/propose-graph.test.ts` checks the `propose_graph` line with `toContain`, so an added line keeps it passing.
- `packages/packs/test/golden/cold_open/person-moment.golden.json`: system message `OUTPUT_SYSTEM_MESSAGES.draft`; user message holds `Length: 800 words.`
- `e2e/fixtures/mock-openai/server.mjs` (lines 8 and 18 to 19) loads every `.json` in `scenarios/`. `e2e/fixtures/mock-openai/scenarios/pack-cold_open.json` is the pattern.
- `scripts/eval-cases.test.mjs`: one test, `AC 3: the cold-open eval case ...`, reading `scripts/eval-agent/cases/` only; constants `CASE_KEYS`, `EXPECT_KEYS`, `RUN_END_REASONS`, `CITATION_MODES`. `scripts/eval-agent/README.md`: the case keys; the run needs `--model` and is not part of CI.
- `examples/samples.yaml` has the id `nonfiction`. `examples/nonfiction/entities/plateau-is-reorganising.md` exists.
- Root `package.json`: `test` runs `node --test 'scripts/*.test.mjs'`; `lint:packs` runs `scripts/lint-packs.mjs`; `lint` runs `prettier --check .`. `packages/packs/package.json` `test` builds contracts and API, then `vitest run`. `apps/api/package.json` has `build`, `test` and `lint`. `apps/api/vitest.config.mts` includes `test/**/*.test.ts` and sets `SCRIBA_UPDATE_GOLDENS` from `--update-goldens`. `e2e/package.json` `test` is `vitest run`.
- No test counts the built-in tools: `apps/api/test/packs/core-gate.test.ts` finds `propose_graph` by name; `real-packs.test.ts` asserts no error and no content finding.
- Worktrees: `git worktree list` shows `PST-15`, `SAU-13` and `TRG-07` only. `git branch --list 'unit/GNP*'` is empty.

### Assumed (each one is checked by the step named)

- **A1** Node v26.x and npm 11.x are on the PATH (step 1).
- **A2** `sourcesUsed` is `['notes-a', 'claim-a']`: entity refs follow argument order, and `entityIds` comes before `styleProfile` in the property order (steps 5 and 6).
- **A3** `{{length}}` renders `800` for the default, because Ajv applies `useDefaults` (step 6; as `plans/GNP-07.md` A9).
- **A4** `lint.ts` gives no error or warning for the new spec (step 10).
- **A5** The catalogue line is exactly the line of step 7 (step 7 reads the diff).
- **A6** The update run writes JSON that Prettier then formats; the golden comparison is by value, so formatting does not change a result (steps 6 and 7).

## 3. Files to change

Only the paths below change. Not changed: `units/**`, `modules/**`, `plans/**` (except this plan, written by the planner), `plans/DECISIONS.md`, `packages/packs/test/checks.ts`, `packages/packs/test/real-packs.test.ts`, `packages/packs/core/**`, `packages/packs/nonfiction/entity-types/**`, `packages/packs/test/golden/cold_open/**`, `packages/packs/test/golden/propose_graph/story.golden.json`, `apps/api/src/**`, `apps/api/test/packs/golden.kit.ts`, `apps/api/test/packs/propose-graph.test.ts`, `scripts/eval-agent/run.mjs`, `scripts/eval-agent/README.md`, `scripts/eval-agent/run.test.mjs`, `e2e/**` specs, `examples/**`, `package-lock.json`.

| Path | Change | Reason |
|---|---|---|
| `packages/packs/nonfiction/tools/mystery_question.yaml` | new | the tool spec (step 2) |
| `packages/packs/test/golden/mystery_question/puzzle-finding.fixture.json` | new | the case's arguments and entities (step 3) |
| `packages/packs/test/golden/mystery_question/puzzle-finding.golden.json` | new, written by the update run (step 6) | the recorded request |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by the update run (step 7) | the catalogue gains the `mystery_question` line (D4) |
| `e2e/fixtures/mock-openai/scenarios/pack-mystery_question.json` | new | one scripted reply (step 4) |
| `apps/api/test/packs/mystery-question.test.ts` | new | the test of AC 2 (step 5) |
| `scripts/eval-agent/cases/mystery-question.json` | new | the eval case (step 8) |
| `scripts/eval-cases.test.mjs` | one `test` added; the existing test unchanged | the test of AC 3 (step 9) |

The file `packages/packs/nonfiction/tools/.gitkeep` does not exist on main, so nothing is deleted.

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Create the branch with `git switch -c unit/GNP-08` from `main`. Record `node -v` and `npm -v` with each result. Do not push. Do not use `git add -A` or `git commit -a`.

0. **Base.** `git rev-parse --short HEAD` (expected `9e4a879`, or a later main that still holds GNP-07 and GNP-04). `test ! -e packages/packs/nonfiction/tools/mystery_question.yaml` exits 0. `ls packages/packs/nonfiction/tools` lists only `cold_open.yaml`. If a check fails, re-read the changed files before editing.
1. **Runtime and build.** `npm ci` if `node_modules/` is absent. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Expected: exit 0; `node -v` prints `v26.x` (A1).
2. **Tool spec (U1 to U3, M1 to M3, C1, C2, C4, C5).** Create `packages/packs/nonfiction/tools/mystery_question.yaml` with this content. The five common-input properties are copied verbatim from `cold_open.yaml`. Then `npx prettier --write` on the file.

```yaml
schemaVersion: 1
name: mystery_question
description: Open with a puzzle, then unravel it to a surprising finding.
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
    puzzle:
      type: string
      title: Puzzle
      x-scriba-type: text
      x-scriba-port: true
    surprisingFinding:
      type: string
      title: Surprising finding
      x-scriba-type: text
      x-scriba-port: true
  required: [coreIdea, puzzle]
output: draft
enabled: true
prompt: |
  You write a nonfiction passage that opens with a puzzle and unravels it to a surprising finding.

  Core idea: {{coreIdea}}
  Puzzle: {{puzzle}}
  {{#if surprisingFinding}}Surprising finding: {{surprisingFinding}}
  {{/if}}Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}
  Material:
  {{#each entityIds}}
  {{entity this}}
  {{/each}}
  {{#if styleProfile}}
  {{entity styleProfile}}
  {{/if}}

  Steps:
  1. Pose the puzzle: state it in the opening lines, in the words given above.
  2. Deepen it: show why the puzzle is harder than it looks, using only the material.
  3. Unravel it: work through the material step by step toward the answer.
  4. Land the surprising finding: state the finding the material supports. When a surprising finding is given above, land on that one.
  5. Tie it to the idea: end by connecting the finding to the core idea, in plain words.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

3. **Fixture (D1, C7).** Create `packages/packs/test/golden/mystery_question/puzzle-finding.fixture.json`:

```json
{
  "arguments": {
    "coreIdea": "Expertise grows from planned practice, not from the hours alone.",
    "entityIds": ["notes-a", "claim-a"],
    "styleProfile": "style-a",
    "puzzle": "Why do two people with the same hours reach different levels?",
    "surprisingFinding": "The hours were never the difference; the planning was."
  },
  "entities": [
    {
      "ref": "notes-a",
      "type": "source",
      "path": "sources/notes-a.md",
      "content": "Notes A say that each practice session was planned in advance, with a teacher setting the task."
    },
    {
      "ref": "claim-a",
      "type": "claim",
      "path": "entities/claim-a.md",
      "content": "Claim A says that the practice hours alone did not predict the level that people reached in the study."
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

   Then `npx prettier --write` on it. The arguments omit `length` and `tone`, so the default applies (A3).
4. **Scenario (D1).** Create `e2e/fixtures/mock-openai/scenarios/pack-mystery_question.json`, one step matched on the chat endpoint, as `pack-cold_open.json`:

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["Two people kept the same hours, yet one of them pulled ahead [@claim-a]."]
      }
    }
  ]
}
```

   Then `npx prettier --write` on it.
5. **Golden test (AC 2, C1, C7).** Create `apps/api/test/packs/mystery-question.test.ts`. It imports `it` and `expect` from `vitest` and `goldenCase` and `type GoldenRunResult` from `./golden.kit`, and copies the `renderedPrompt` helper of `cold-open.test.ts`. It has one `it` (timeout 60000) whose body is `goldenCase({ tool: 'mystery_question', name: 'puzzle-finding', expect: { kind: 'draft', sourcesUsed: ['notes-a', 'claim-a'] }, invalidWithout: 'puzzle', check })`. The `check` reads `renderedPrompt(result)` and asserts that it contains `notes-a`, `claim-a`, `style-a`, `[@`, `TK (`, `Puzzle: Why do two people with the same hours reach different levels?`, `Surprising finding: The hours were never the difference; the planning was.`, `Length: 800 words` and `game-changer`. No `any`. The file does not contain the text `examples/`.
6. **Golden update run (A2, A3, A6).** `cd apps/api && npx vitest run -- --update-goldens test/packs/mystery-question.test.ts` exits 0 and writes `packages/packs/test/golden/mystery_question/puzzle-finding.golden.json`. Read it: `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft`; `messages[1].content` holds the check's strings and `Length: 800 words.`, and no `Tools for a recipe`. Then `npx prettier --write packages/packs/test/golden/mystery_question`.
7. **Catalogue golden (D4, A5).** `cd apps/api && npx vitest run -- --update-goldens test/packs/propose-graph.test.ts`, then `npx prettier --write packages/packs/test/golden/propose_graph` and `git diff -- packages/packs/test/golden/propose_graph`. Expected: `recipe.golden.json` gains exactly one line, placed by name order (`catalog.service.ts` line 436) after `cold_open` and before `propose_graph`. The line is:

   `- mystery_question: Open with a puzzle, then unravel it to a surprising finding. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); puzzle (text, single, required); surprisingFinding (text, single, optional).`

   `story.golden.json` shows no diff. Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0. If GNP-09 or GNP-10 is on main when this runs, their lines are already in the golden, and this line still goes in name order.
8. **Eval case (AC 3, C6).** Create `scripts/eval-agent/cases/mystery-question.json`:

```json
{
  "sample": "nonfiction",
  "intent": "Open chapter 4 with a puzzle about why progress stalls, using my notes.",
  "expect": {
    "reason": "completed",
    "tools": ["mystery_question"],
    "citations": "present"
  }
}
```

   Then `npx prettier --write` on it.
9. **Eval test (AC 3, C8).** Add one `test` to `scripts/eval-cases.test.mjs`, after the existing one, named `AC 3: the mystery-question eval case is in the eval data and uses the documented keys and values`. It calls `loadCases()`, finds the case with id `mystery-question`, and asserts: every key of the file is in `CASE_KEYS`; every `expect` key is in `EXPECT_KEYS`; `reason` is in `RUN_END_REASONS`; `citations` is in `CITATION_MODES`; `sample` is `nonfiction`; `intent` is a non-empty string; `expect.tools` deep-equals `['mystery_question']`; `expect.reason` is `completed`; `expect.citations` is `present`. The existing test is not changed. Then `npx prettier --write scripts/eval-cases.test.mjs`.
10. **Pack checks (AC 1, A4).** From the root, `npm run lint:packs` exits 0 and prints no finding that names `mystery_question`. Then `npm test -w @bbartolome/scriba-packs` exits 0: the real-packs test and the content checks pass (common inputs identical to `cold_open`; the description starts with `Open` and is under 120 characters).
11. **Type check, lint and API pack tests.** `npm run build -w @bbartolome/scriba-api && npm run lint -w @bbartolome/scriba-api` exit 0. `cd apps/api && npx vitest run test/packs` exits 0: the core-gate, propose-graph, cold-open, nonfiction-entity-types and the new test all pass.
12. **Eval test run.** `node --test scripts/eval-cases.test.mjs` exits 0 with two tests passed (GNP-07's and the new one).
13. **Format and root gates.** `npx prettier --check packages/packs/nonfiction/tools/mystery_question.yaml packages/packs/test/golden/mystery_question packages/packs/test/golden/propose_graph e2e/fixtures/mock-openai/scenarios/pack-mystery_question.json apps/api/test/packs/mystery-question.test.ts scripts/eval-agent/cases/mystery-question.json scripts/eval-cases.test.mjs` exits 0. From the root, `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario.
14. **Commit (implementer only).** `git add` each path of section 3 by name. `git diff --cached --stat` lists only those paths, and no `plans/` or `units/` file. Commit with `feat(GNP-08): mystery_question nonfiction draft tool, golden case and eval case`. Do not push.

## 5. Tests

Each acceptance criterion has exactly one test. The text is copied from `units/GNP-08-mystery-question.md`, lines 21, 22 and 24. Nothing is marked passed in this plan.

**AC1: Passes `npm run lint:packs` and the content-check suite.**
- Test file: `packages/packs/test/real-packs.test.ts` (existing, not changed), test `real packs > the suite passes on the real packs`.
- Command: `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (step 10).
- Pass condition: both exit 0, and no finding names `mystery_question`.

**AC2: Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.**
- Test file: `apps/api/test/packs/mystery-question.test.ts` (new). Test name: `AC 2: the mystery_question golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, and sourcesUsed leaves out the style profile`.
- Command: `cd apps/api && npx vitest run test/packs/mystery-question.test.ts` (steps 5 and 6, and again after step 6).
- Pass condition: one test passes. The golden status is `match`; the kind is `draft`; `sourcesUsed` is `['notes-a', 'claim-a']`; the call without `puzzle` returns 422 `TOOL_ARGS_INVALID` with a message that contains `puzzle`; there is one model call; and the `check` of step 5 passes.

**AC3: A manual eval case (small and larger local model) is added to the Agent loop's eval script data.**
- Test file: `scripts/eval-cases.test.mjs` (one new test). Test name: `AC 3: the mystery-question eval case is in the eval data and uses the documented keys and values`.
- Command: `node --test scripts/eval-cases.test.mjs` (step 12).
- Pass condition: the test passes. The run with two models is not tested here (open point 1).

## 6. Agreement with downstream units

- **GNP-12 (workhorses gate; `blocked_by` names GNP-08, line 7).** It needs from GNP-08: the tool shipped as a draft and enabled; the five common inputs identical to the other drafts (its criterion 1, M1); a golden test that passes (its criterion 2, the AC 2 test); and the manual eval case, which its "done when" uses with a real model (its criterion 4; AC 3 adds the case, and the run is open point 1). The plan provides all of these. Agreed; GNP-12 is not changed.
- **GNP-23 (remix; `blocked_by` names GNP-08, line 7).** It needs `mystery_question` in its `targetShape` enum, which requires the name `mystery_question`, `output: draft` and `enabled: true`; `checkRemix` (`packages/packs/test/checks.ts` line 261) then holds it to the list. The plan provides the name, the file `mystery_question.yaml` and those fields. Agreed; GNP-23 is not changed.
- **GRR-16 (sample recipe; no plan; `units/GRR-16-sample-recipe.md` line 19).** It names "mystery question into cold open" on text ports. The new tool's text ports are `coreIdea` (required), `puzzle` (required), `surprisingFinding` (optional), and its output is a draft. `cold_open`'s text ports are `coreIdea` and `moment`. The plan provides these; the choice of keys is GRR-16's (open point 2).
- **TRG-17 (editor UI gate; demo step 1 switches `mystery_question` off, `units/TRG-17-editor-ui-gate.md` line 21).** It needs a shipped nonfiction tool with an enable switch. The plan provides it; the gate is reached after GNP-12.
- **GNP-09 and GNP-10 (parallel; each adds a catalogue line and the same common inputs).** The rule of `plans/GNP-07.md` C10 applies: the second of the three PRs to merge regenerates the recipe golden at rebase, and the M1 reference stays `cold_open.yaml` in every order. Agreed.
- **Done units used as they are:** GNP-02 (helper and conventions), GNP-03 and GNP-06 (entity kinds), GNP-04 (catalogue golden), GNP-07 (pattern, the common-input blocks, the eval-data test). No change to them.

## 7. Open points

1. **AC 3, the run with a small and a larger local model.** This part of the criterion is not tested and is not run here. It needs a local model server (`scripts/eval-agent/README.md`: `npm run eval:agent -- --model <small> --model <larger>`), and the eval is not part of CI. The test covers the data part, "is added to the Agent loop's eval script data", as `plans/GNP-07.md` C9 did for GNP-07. The run is recorded as not run. GNP-12's "done when" with a real model depends on it, so the orchestrator must schedule it.
2. **GRR-16 port keys.** Which port keys GRR-16 wires between the workhorses is not decided here. Cause: GRR-16 has no plan, and the unit names the tools only as "e.g.". Owner: GRR-16.
3. **Example recipe in the contracts package.** `packages/contracts/src/graph-runner/examples.ts` uses `mystery_question` at line 114 with `text` and `output` ports (lines 132 and 133), and `cold-open.question`, `cold-open.people`, `cold-open.style` and a `words` param. The shipped specs have none of these (`cold_open` has `person`, `styleProfile` and `moment`; the length param is `length`). The mismatch predates GNP-08, the contract tests check only the schema, and this plan does not change the file. Owner: GRR-01 and GRR-16.
4. **Done plan statement.** `plans/GNP-06.md` line 176 says GNP-08 "uses only the common inputs". The unit also adds `puzzle` and `surprisingFinding`. The statement is wrong, but it has no effect: text ports need no entity kind from GNP-06. Not changed here (done plan).

Sections 1 to 7 are complete.
