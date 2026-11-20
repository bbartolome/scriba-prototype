---
id: GNP-23
status: draft
module: genre-packs
---
# GNP-23 plan — core/tools/remix and the shape-list consistency check

Batch: [GNP-23] (Genre packs, phase:remaining-shapes, M7), a batch of one. Revision 1 (draft). Planned against main at `2303ee0`. The unit file records no change (read in full, 25 lines). All nine blockers are `status: done` on main (section 7). The Remix consistency check already exists in `packages/packs/test/checks.ts` (GNP-01), so this unit adds the tool, its tests and its data, and no check code.

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a choice that no source settles; the simplest option is taken.

**D1 Spec file and envelope.** `packages/packs/core/tools/remix.yaml`, `schemaVersion: 1`, `name: remix`, `output: draft`, `enabled: true`, and the description `Rewrite a passage in another tool's shape for side-by-side comparison.` (71 characters; its first word `Rewrite` is in `VERBS`, `checks.ts` line 48). Source: unit Spec line 15; module lines 40 (core is always active), 43 (fields), 45 (one sentence, under about 120 characters, starts with a verb); `units/GNP-24` criterion 1 (Remix ships enabled).

**D2 Inputs.** Property order, which also fixes the order of the catalogue line (D8):
- `coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`: the five common inputs, copied byte for byte from the blocks of `packages/packs/nonfiction/tools/cold_open.yaml` (from `coreIdea:` up to, not including, `person:`). Source: module lines 56 to 64 ("repeated verbatim; CI asserts identity"). `required` membership must match cold_open's: `coreIdea` is required, the other four are not (cold_open `required: [coreIdea, person]`). The identity check compares each property and the `required` membership (`checks.ts` `checkCommonInputs`, line 195). Remix is the first draft in load order (core is loaded first, and remix is the only draft in `core/tools`), so remix becomes the reference of that check and every other draft is compared with it. Identity is symmetric, so the outcome is the same.
- `passage`: `type: string`, `title: Passage`, `x-scriba-type: text`, `x-scriba-port: true`, `x-scriba-control: textarea`; required. Source: unit Spec line 16 ("passage [text port, required]"); the text-port form of module line 58 to 64 (the common table, `passage` is a text input like `coreIdea`).
- `targetShape`: `type: string`, `title: Target shape`, `enum` (D3), `x-scriba-control: select`, no port hint (it is a param, as `length` and `tone` are); required. Source: unit Spec line 16 ("required, param"); `propose_graph.yaml` uses the same `enum` plus `x-scriba-control: select` form.
- `required: [coreIdea, passage, targetShape]`.

**D3 The enum.** `targetShape.enum` lists the 17 names of the shipped `output: draft` tools except `remix`, in plain sorted order, as a YAML block sequence (one name per line, so Prettier keeps it). Source: unit Spec line 16 ("every shipped `draft` tool except `remix`"); module line 7 ("its `targetShape` enum must list every shipped draft tool"); `checks.ts` `checkRemix` (line 264; the D10 comment is line 262) reads every draft tool with no `enabled` filter, so the 11 disabled shapes belong in the enum; `plans/GNP-22.md` line 471 says the same for the nine tier 2-3 shapes. The 17 names, verified on main (section 7):

`cold_open, comparison_set, contrast, dialogue, flashback, framework_builder, method_first, mystery_question, myth_buster, numbers_to_people, objection_handler, profile, reader_challenge, scene_builder, stockdale_tension, timeline, zoom`

Enabled on main: cold_open, dialogue, mystery_question, myth_buster, numbers_to_people, scene_builder (6). Disabled: the other 11.

**D4 Prompt.** The skeleton of module lines 46 to 51: a role line; the material (the passage, the core idea, the target shape, the length, the tone, each entity with `{{entity this}}`, the style profile); a single literal list with one line per shape; the steps; the constraints. The template uses only the Tool registry subset. Source: unit Spec line 17 (one line per shape, "or a single list the model reads"). Plan choice: a literal list, not `{{toolCatalog}}`. The catalogue renders only enabled, valid tools (`executor.service.ts` lines 171 to 178) and every such tool regardless of output kind, so it would omit the 11 disabled shapes and add `propose_graph`, `throughline_check`, `plot_manager`, `character_builder` and `world_builder`. The literal list is the 17 lines of section 3, step 4, `- <name>: <description>`, with each description copied verbatim from its tool file. Constraints and steps do not start a line with `- <name>: ` (the test X1 relies on this).

**D5 Enabled, so visible.** Remix ships enabled. It therefore appears in the recipe catalogue of `propose_graph` (D8), in the canvas palette, and in the tools offered to the agent in core projects. Source: module line 40; `packages/packs/test/README.md` lines 32 to 34.

**D6 Consistency check.** Already on main: `contentChecks` runs `checkRemix` when `core/tools/remix.yaml` exists (`checks.ts` lines 86 and 264; GNP-01 plan D10, `plans/GNP-01.md` line 32). GNP-23 changes no line of `checks.ts`. Source: unit Spec line 19 ("activates the content suite's Remix consistency check"); module line 85.

**D7 Golden case.** One case named `basic` (GNP-22 C1), through `goldenCase` (`apps/api/test/packs/golden.kit.ts` line 255) on `POST /api/tool-registry/tools/remix/execute`, with the real packs (`PACKS_ROOT`, line 30), the mock OpenAI server and the scenario `pack-remix`. `invalidWithout: 'targetShape'`. `enable` is not used: the shipped spec is enabled (`enable` is a switch for disabled tools, golden.kit.ts line 78). Source: module line 87 and "Testing principles"; `packages/packs/test/README.md` lines 10 to 19.

**D8 Recipe catalogue golden.** Adding an enabled built-in tool changes the recipe golden of `propose_graph`, and that change belongs to this PR (the rule of `packages/packs/test/README.md` lines 32 to 34; GNP-15 M7, `plans/GNP-15.md` line 41, which did the same for `scene_builder`). The catalogue sits in one JSON string on line 9 of `packages/packs/test/golden/propose_graph/recipe.golden.json`. The entry is sorted by name (`catalog.service.ts` line 467), so it goes between `propose_graph` and `scene_builder`. Its text follows `formatCatalogEntry` (`template.ts` line 557): ports only, in property order, so `targetShape`, `length` and `tone` do not appear.

`- remix: Rewrite a passage in another tool's shape for side-by-side comparison. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); passage (text, single, required).`

**D9 Eval case.** One case file, `scripts/eval-agent/cases/remix.json`, with the keys `sample`, `intent` and `expect`: `sample` `nonfiction`, `expect.reason` `completed`, `expect.tools` `["remix"]`, `expect.citations` `present`. The id is `remix` (kebab case, GNP-22 C1). The data test `scripts/eval-case-remix.test.mjs` follows the form of `scripts/eval-case-tier2-3-shapes.test.mjs` (line 27). Sources: module line 90 (manual eval cases go to the Agent loop's eval data); the data-only reading of "manual eval case added" (DECISIONS, entry "2026-11-16 — GNP-08, GNP-09, GNP-10 — Navigator decision: reading of the eval-data criterion", line 5219). The real-model run is not part of the criterion (section 4 and open point 2).

**D10 Comparison.** The side-by-side comparison is the review diff of the pending change. No view, no Compare node. Source: unit Spec line 18; module line 98. GNP-23 adds nothing for it.

**D11 Names are final on merge.** `remix`, `passage`, `targetShape` and the 17-name enum. Source: module line 44 (renaming is breaking); `plans/GNP-22.md` line 33 ("names are final once merged").

**D12 Test seams.** Content tests in `packages/packs/test/` (Vitest, module lines 85 and 86); golden tests in `apps/api/test/packs/` (module line 87); the data test in `scripts/` (module line 90). The tests assert behaviour: a spec validates and its enum is the set of draft tools, the request the mock recorded, the output kind and `sourcesUsed`, and the eval data's keys and values. No test reads `examples/` (module line 88).

## 2. Files to create or change

Only the paths below change.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/core/tools/remix.yaml` | new | the spec (D1 to D4) |
| `packages/packs/test/remix.test.ts` | new | criteria 1 and 2, and extra test X1 (section 4) |
| `packages/packs/test/golden/remix/basic.fixture.json` | new | the request of the golden case (D7) |
| `packages/packs/test/golden/remix/basic.golden.json` | new, written by the update run | the recorded request (D7) |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by the update run: one line | the catalogue entry of D8 |
| `e2e/fixtures/mock-openai/scenarios/pack-remix.json` | new | the mock reply of the golden case, in the form of `pack-contrast.json` |
| `apps/api/test/packs/remix.test.ts` | new | criterion 3, the golden test (section 4) |
| `scripts/eval-agent/cases/remix.json` | new | the eval case (D9) |
| `scripts/eval-case-remix.test.mjs` | new | criterion 3, the eval data test (section 4) |

Not changed: `packages/packs/test/checks.ts` (D6); `real-packs.test.ts`, `content-checks.test.ts`, `broken-specs.test.ts` and the tier tests (they must pass unchanged); `apps/api/test/packs/golden.kit.ts`; `apps/api/test/packs/propose-graph.test.ts` (it must pass after the golden update, step 11); `scripts/eval-cases.test.mjs` (its loop reads the new file, step 12); `scripts/eval-agent/run.mjs` and its README; `packages/packs/test/README.md`; `e2e/specs/**` (no edit, section 3 step 14); the 12 disabled nonfiction tools (the 11 drafts and `named_concept`), and the other existing tools; `apps/api/src/**` (no product code); `packages/contracts/**`; every `package.json` and `package-lock.json` (no dependency is added); CI files; `units/**`; `modules/**`; `plans/**` other than this file.

## 3. Method

Work in a worktree of main on the branch `unit/GNP-23`, as GNP-21 and GNP-22 did: `git -C /Users/bbartolome/workspace/scriba-prototype worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GNP-23 -b unit/GNP-23 main`. Do not touch `scriba-prototype-wt/GRR-17`. Record `node -v` and `npm -v` beside each result. Do not push.

0. **Base.** `git rev-parse --short HEAD` on main is `2303ee0` or a later commit that changes only `plans/` and `units/`. `git diff --quiet 2303ee0 HEAD -- packages/packs apps/api scripts e2e` exits 0. If not, re-read the changed files before editing. For each blocker, `git show main:plans/<ID>.md | sed -n 3p` prints `status: done` (GNP-02, GNP-07, GNP-08, GNP-09, GNP-10, GNP-15, GNP-16, GNP-21, GNP-22).
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.x`. Expected: the versions of the repo's pins.
2. **Worktree and install.** Create the worktree (above). `npm ci` in it. Expected: exit 0.
3. **Baseline.** In the worktree: `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs` exits 0; `npm run lint:packs` exits 0; `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0 (the catalogue golden matches on the base).
4. **The spec (D1 to D4).** Create `packages/packs/core/tools/remix.yaml`:
   - the envelope of D1, with the description text exactly as in D1;
   - the properties of D2 in order, the five common blocks copied from cold_open (not retyped);
   - `required: [coreIdea, passage, targetShape]`, `output: draft`, `enabled: true`;
   - `prompt: |` with the skeleton of D4. The material holds `Passage: {{passage}}`, `Core idea: {{coreIdea}}`, `Target shape: {{targetShape}}`, `Length: {{length}} words.`, `{{#if tone}}Tone: {{tone}}.{{/if}}`, `{{#each entityIds}}{{entity this}}{{/each}}` and `{{#if styleProfile}}{{entity styleProfile}}{{/if}}`. The shape list has these 17 lines, each `- <name>: <description>`:

```text
- cold_open: Open mid-scene with one person at one moment, then pull back to the idea.
- comparison_set: Contrast winners with matched cases that didn't win.
- contrast: Set two things side by side so the difference makes the point.
- dialogue: Write an exchange between characters, each in their own voice.
- flashback: Break from the present moment to a past one that explains it.
- framework_builder: Turn a pattern into a small named framework with steps.
- method_first: Explain how the evidence was gathered before what it showed.
- mystery_question: Open with a puzzle, then unravel it to a surprising finding.
- myth_buster: State a common belief, then take it apart with evidence.
- numbers_to_people: Turn one statistic into the story of one person behind it.
- objection_handler: Raise the strongest objections to a claim and answer each fairly.
- profile: Paint one person in depth to embody the idea.
- reader_challenge: Ask the reader to test their own assumption before the reveal.
- scene_builder: Draft a scene from its goal, conflict and outcome from one character's point of view.
- stockdale_tension: Face the hardest fact while holding on to the hope beside it.
- timeline: Tell events in order to show how the idea unfolded.
- zoom: Move from a close-up detail out to the big picture and back.
```

   The steps and constraints follow the skeleton: rewrite the passage in the shape named by the target shape, using only that shape's line in the list; keep the passage's facts; use only the material; cite each factual sentence with `[@id]`; write `TK` with a short note where a fact is missing; follow the style profile's tone and banned phrases and keep to the length. The prompt must not contain `{{toolCatalog}}`.
5. **Check the copies (read-only, no file written).** With a one-off `node -e` that uses the repo's `yaml` package: the enum of `remix.yaml` equals the sorted names of the 17 draft files; each shape line of the prompt equals `- <name>: <description>` of that file's `description:`. Expected: both hold.
6. **Format.** `npx prettier --write packages/packs/core/tools/remix.yaml`, then `npx prettier --check` on it. Expected: exit 0.
7. **Packs checks (criteria 1 and 2).** Create `packages/packs/test/remix.test.ts` (section 4, tests A1, A2 and X1). `npm test -w @bbartolome/scriba-packs` exits 0; `npm run lint:packs` exits 0.
8. **Scenario and fixture.** Create `e2e/fixtures/mock-openai/scenarios/pack-remix.json`, in the form of `pack-contrast.json`: one step, `endpoint: chat`, one stream reply, a short rewritten passage that cites `[@notes-a]` and holds no banned phrase. Create `packages/packs/test/golden/remix/basic.fixture.json`: the arguments `coreIdea`, `entityIds: ["notes-a"]`, `styleProfile: "style-a"`, `passage` (an original two-sentence passage written for the fixture; no real text) and `targetShape: "mystery_question"`; the entities `notes-a` (type `source`) and `style-a` (type `style-profile`, banned phrase `game-changer`), copied in form from `packages/packs/test/golden/contrast/basic.fixture.json`. `npx prettier --write` on both.
9. **Golden test (criterion 3a).** Create `apps/api/test/packs/remix.test.ts`: a `goldenCase` with `tool: 'remix'`, `name: 'basic'`, `expect: { kind: 'draft', sourcesUsed: ['notes-a'] }`, `invalidWithout: 'targetShape'`, and a `check` that holds the passage text, `notes-a`, `style-a` and `game-changer` in the rendered prompt (copy the two helpers `renderedPrompt` and `promptHolds` from `apps/api/test/packs/tier2-3-shapes.test.ts`, lines 29 and 48; they are not exported). Then `cd apps/api && npx vitest run test/packs/remix.test.ts -- --update-goldens` writes `basic.golden.json`. Read it: `messages[0].content` equals the draft system message (`OUTPUT_SYSTEM_MESSAGES.draft`, `executor.service.ts` line 31); the user message holds the passage, `notes-a`, `style-a`, `game-changer` and the target shape; there is no `tools` key. Then `npx prettier --write packages/packs/test/golden/remix`, and `npx vitest run test/packs/remix.test.ts` without the flag exits 0.
10. **Catalogue golden (D8).** Before the update, `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` is expected to fail on the recipe case, because the golden now lacks the remix line. Run `npx vitest run test/packs/propose-graph.test.ts -- --update-goldens`. Then `git diff -- packages/packs/test/golden/propose_graph` shows one changed line, the one that adds the D8 entry between `propose_graph` and `scene_builder`, and the story golden is unchanged. Then the same test without the flag exits 0.
11. **Eval case (criterion 3b).** Create `scripts/eval-agent/cases/remix.json` (D9) with an intent that asks for the cold open to be rewritten as a mystery question, using the notes, so the two can be compared. Create `scripts/eval-case-remix.test.mjs` (section 4, test 3b). `npx prettier --write` on both. `node --test scripts/eval-case-remix.test.mjs` exits 0, and `node --test scripts/eval-cases.test.mjs` exits 0 (its loop covers the new file).
12. **Packs and API suites.** `npm run build -w @bbartolome/scriba-packs` (type check) and `npm run lint -w @bbartolome/scriba-packs` exit 0. `cd apps/api && npx vitest run test/packs` exits 0: the baseline plus the remix golden. `npm run lint:packs` exits 0.
13. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0. If `npm test` fails in an apps/api test that this unit does not touch, the rerun rule of DECISIONS, entry "2026-11-20 — GNP-15 — Navigator decision: the root `npm test` gate after an unrelated intermittent failure" (line 7042), applies: rerun the unchanged commit, at most twice, and record the load average. A failure that persists stops the unit.
14. **End-to-end regression (not a criterion).** Remix is an enabled palette tool, so the `/tools` list and the canvas palette change. Before the run, port 8080 must be free. Run `npm run e2e -w @bbartolome/scriba-e2e` once in the worktree, with no temporary edit to any e2e file (a temporary edit needed owner approval in GNP-15, DECISIONS, entry "2026-11-20 — GNP-15 — The owner approves one temporary edit", line 7424). A failing spec stops the unit: record its name, the error and the load average, and do not edit any spec (open point 1). The same rerun rule as step 13 applies. If the run cannot start on this host, record "e2e not run" and the reason. Record the baseline in the same way if a failure needs comparing with main.
15. **Record and commit.** `git add` the nine paths of section 2 by name. `git diff --cached --stat` lists only those paths. Commit with `feat(GNP-23): remix tool and the targetShape enum over the shipped draft tools`. Do not push. Tick the criteria of `units/GNP-23-remix.md` only when section 4 passes; criterion 3 is ticked under the data-only reading (section 4), and the real-model run is recorded as not run (open point 2).

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-23-remix.md` lines 22 to 24. Each criterion has at least one test. Criterion 3 has two clauses, so it has two tests. One extra test (X1) is a plan choice.

| Criterion (unit line) | Test file and test name | Seam | Command | Pass condition |
|---|---|---|---|---|
| 1. "Passes the validation suite; the enum equals the set of shipped draft tools minus `remix`." (22) | `packages/packs/test/remix.test.ts`, "AC 1: the real packs pass the validation suite, and the remix enum is the shipped draft tools minus remix" (A1) | the real packs root; `lintPacks` and `contentChecks` of `checks.ts`; the YAML files read with `yaml` in the test, not through `checks.ts` | `npm test -w @bbartolome/scriba-packs` | (i) `lintPacks(REAL_PACKS)` has no finding with severity `error`; (ii) `contentChecks(REAL_PACKS)` is `[]`; (iii) the sorted enum of `core/tools/remix.yaml` equals the sorted names of every `*.yaml` file of the three `tools` folders whose `output` is `draft`, except `remix`, and that list is not empty (so an empty enum cannot pass); (iv) `output` is `draft` and `enabled` is `true` |
| 2. "Adding a fixture draft tool without updating the enum fails the content suite." (23) | same file, "AC 2: a draft tool that the enum does not list makes the content suite fail, and listing it passes" (A2) | a temporary copy of the three packs' `tools` and `entity-types` folders; `contentChecks` on the copy | same | In the copy, a fixture draft tool (`nonfiction/tools/fixture_draft.yaml`, a copy of `contrast.yaml` with `name: fixture_draft`) gives `contentChecks` a finding `{severity: 'error', rule: 'remix-shapes', file: 'core/tools/remix.yaml'}`; after `fixture_draft` is added to the copy's enum, no `remix-shapes` finding remains. The real `remix.yaml` is not changed. The test does not run vitest on the copy: the content suite's own assertion (real-packs test (ii)) fails on the same input |
| 3a. "Golden test passes" (24) | `apps/api/test/packs/remix.test.ts`, "AC 3: the remix golden matches; the prompt holds the passage, its entity IDs, the banned phrase and the target shape; the output is a draft with sourcesUsed notes-a; the call without targetShape returns TOOL_ARGS_INVALID naming it" (C3a) | `goldenCase` through `POST /api/tool-registry/tools/remix/execute` on the composed app, the real packs, the mock OpenAI server | `cd apps/api && npx vitest run test/packs/remix.test.ts` | The four standard checks of `packages/packs/test/README.md` line 12 hold (the recorded request matches the golden; the output kind and `sourcesUsed`; the call without `targetShape` gives 422 `TOOL_ARGS_INVALID` naming it with no model call; one model request), and the `check` holds |
| 3b. "manual eval case added." (24) | `scripts/eval-case-remix.test.mjs`, "AC 3: the remix eval case is in the eval data and uses the documented keys and values" (C3b) | the case file in the Agent loop's eval data; `node:test`; no model run | `node --test scripts/eval-case-remix.test.mjs` and `node --test scripts/eval-cases.test.mjs` | the keys are exactly `expect`, `intent`, `sample`; `sample` is `nonfiction`; `intent` is a non-empty string; `expect.tools` is `["remix"]`; `expect.reason` is `completed`; `expect.citations` is `present`; the generic loop passes |
| extra X1 | same file as A1, "the remix prompt lists each shape on its own line" | the YAML prompt | same | the lines of the prompt that match `^- ([a-z][a-z0-9_]*): ` are exactly the enum, as sets; this guards the list, not the wording |

**Local testability.**
- Criterion 1: testable here (the content suite and `lint:packs`).
- Criterion 2: testable here, through the content check on a temporary copy, as the table says. Not tested: the CI sentence of unit line 19 ("CI fails if a draft tool is added or renamed without updating `targetShape`"). It is in the Spec, not in the criterion, and no CI run can exist before a push, which agents do not make. The Navigator decision for the same clause of GNP-01 (DECISIONS, entry "2026-11-16 — GNP-01 — acceptance criterion 1", line 4903, option (a)) applies. The local suite is evidence for the check, not a pass of the CI clause.
- Criterion 3a: testable here (mock OpenAI server, local app).
- Criterion 3b: the data-only reading (DECISIONS, line 5219) is testable here. The real-model run is not run: it needs a local model server, which this environment does not have (open point 2). No substitute is named as a pass.
- Not needed by any criterion: GitHub Actions, a pull request, Docker, the tailnet, credentials. The e2e run of step 14 is local, and it is not a criterion.

## 5. Downstream agreement

`units/GNP-24-remaining-shapes-gate.md` is blocked by GNP-19, GNP-20, GNP-21, GNP-22 and GNP-23. What GNP-23 must leave in place:

- `core/tools/remix.yaml` on main, `enabled: true`, `output: draft`. GNP-24 criterion 1 ("Throughline check and Remix ship enabled") is then met for Remix, and the 11 disabled drafts and the named-concept shape stay disabled.
- The 17-name enum of D3. GNP-24 criterion 3 ("Remix's `targetShape` enum matches the shipped draft tools") holds on main when GNP-23 is merged, provided no draft tool is added or renamed later. A later draft tool needs an enum change and a recipe-golden change in the same PR (`packages/packs/test/README.md` lines 32 to 34), and the consistency check fails otherwise.
- The golden case `basic` for remix (`apps/api/test/packs/remix.test.ts`, its fixture and golden, `pack-remix.json`). GNP-24 criterion 2 ("one golden test per tool") counts it.
- The recipe golden with the remix line (D8). GNP-24 must regenerate it in the same PR if its own change alters the shipped catalogue (for example, shipping a shape enabled instead of disabled). Enabling through the Tool registry in a user library does not change the shipped golden, because the golden cases use a temporary library.
- Names are final: `remix`, `passage`, `targetShape`.
- Demo step 2 ("Remix that chapter's cold open as a Mystery question and compare the two in the review diff") needs the tool to be callable with `targetShape: mystery_question`. The pending change and the review diff belong to the Agent loop and the Project store. GNP-23 adds no code for them.
- GNP-24 criterion 4 (the enable path and the canvas node) does not involve remix's spec; GNP-23 does not touch the enable path.
- Count mismatch, for the orchestrator (open point 3): GNP-24 criterion 1 says "All fourteen tools". Main holds 23 tool files, and 24 after GNP-23 (core 3, nonfiction 16, fiction 5). GNP-23 does not decide this count.

## 6. Open points

1. **A failing e2e spec: stop, or fix the spec?** Options: (a) stop and report PLAN DOES NOT WORK, with no spec change (the plan's choice, the simplest); (b) allow a spec-only fix, as GNP-15 did when the palette grew (DECISIONS, GNP-15 entry "Step 13 root causes", line 7475). Effect of (b): the spec files of other units (graph-touch from GRR-15, tools-preview from GNP-22 and TRG-05) change in this unit. Plan: (a). The orchestrator decides whether to allow (b) for later units.
2. **The real-model run of the remix eval case.** It is not run here, and no unit carries it, as GNP-22 open point 4 records for its nine cases. Options: (a) recorded as not run, carried by no unit (plan: this, the state of the other eval cases); (b) GNP-24's demo step 2 is the first manual run, and its result is recorded there. Effect of (b): GNP-24's demo and checklist text, which this unit does not change.
3. **GNP-24's "fourteen tools".** This is an inconsistency in another unit, not a choice of GNP-23. Options: (a) GNP-24's planner corrects the count to the actual count of 24 after GNP-23 (or states the set it means); (b) the orchestrator edits `units/GNP-24-remaining-shapes-gate.md`. Effect: GNP-24's checklist only. GNP-23 changes no unit file.
4. **The shape lines of remix's prompt copy the tools' descriptions.** Options: (a) copies, checked once by section 3 step 5 and, for names only, by test X1 (plan: this, the simplest); (b) a content check that each shape line equals its tool's description, which adds a rule to `checks.ts` (owned by GNP-01). Effect of (b): a future change to any draft tool's description fails the suite until remix's prompt and golden are updated; under (a) the copies drift silently. Plan: (a) now; the orchestrator decides whether to tighten it.
5. **The CI sentence of the Spec (unit line 19) is not tested locally.** It says CI fails when a draft tool is added or renamed without updating `targetShape`. It is in the Spec, not in the criteria, and no CI run can exist before a push. The local evidence is the content test A2 and the root `npm test`. This is the GNP-01 disposition (DECISIONS, line 4903, option (a)), recorded here, not a choice: CI is confirmed when the owner pushes, and the ticks of section 3 step 15 do not depend on it.

## 7. Facts checked and facts assumed

### Facts checked (main at `2303ee0`, read-only)

- **Unit and module.** `units/GNP-23-remix.md` read in full (25 lines): front matter (`blocked_by` at line 7, `parallel_with` at line 8, `unblocks` at line 9), Spec lines 14 to 19, criteria lines 21 to 24, no change note. `modules/genre-packs.md` read in full; the lines cited in section 1 are checked. `units/README.md` lines 34 to 65 (format and blocker notation) and `plans/PLT-02.md` (front matter lines 1 to 4, sections 1 to 6) for the plan's structure.
- **Blockers.** `status: done` in line 3 of `plans/GNP-02.md`, `GNP-07`, `GNP-08`, `GNP-09`, `GNP-10`, `GNP-15`, `GNP-16`, `GNP-21` and `GNP-22`. `plans/QUEUE.md` line 4: GNP-23 "available: yes".
- **Downstream.** `units/GNP-24-remaining-shapes-gate.md`: front matter (blocked by GNP-19, GNP-20, GNP-21, GNP-22, GNP-23); acceptance criteria 1 to 4; demo steps 1 to 4.
- **DECISIONS.** A search for `GNP-23`, `remix` and `targetShape` finds no entry. Entries that apply: line 4903 (GNP-01 CI clause, option (a)); line 5219 (data-only reading of the eval criterion); line 6892 (GNP-22, PLAN DOES NOT WORK at the e2e step); line 7042 (root `npm test` rerun rule); line 7424 (owner approval for one temporary e2e edit); line 7447 (GNP-15 e2e run on this host); line 7475 (graph-touch fixed in the spec after the palette grew).
- **Plans with draft or planned status.** A plain `grep "status: draft\|status: planned"` on main matches body text in many plans, DECISIONS included, so the orchestrator's expected "none" is not literal. By front matter (first six lines of each plan): 205 `done`, one `planned` (`plans/GRR-17.md`, another unit, in its own worktree), and one plan without a status line (`plans/SHL-14.md`). No file of this unit is in a plan in progress.
- **Shipped tools.** 23 tool files under `packages/packs/{core,nonfiction,fiction}/tools`. 17 have `output: draft`: 6 enabled (cold_open, dialogue, mystery_question, myth_buster, numbers_to_people, scene_builder) and 11 disabled (comparison_set, contrast, flashback, framework_builder, method_first, objection_handler, profile, reader_challenge, stockdale_tension, timeline, zoom). Their names and descriptions are as in section 3 step 4. No `remix.yaml` exists.
- **Blocker outputs.** The 17 draft tools are the outputs of GNP-07 (cold_open), GNP-08 (mystery_question), GNP-09 (myth_buster), GNP-10 (numbers_to_people), GNP-15 (scene_builder), GNP-16 (dialogue), GNP-21 (comparison_set, objection_handler) and GNP-22 (nine tier 2-3 tools). No other unit adds a draft tool.
- **Check code.** `packages/packs/test/checks.ts`: `PACKS` line 32; `COMMON_INPUTS` line 35; `VERBS` line 48 (contains `rewrite`); `contentChecks` line 86; `checkCommonInputs` line 195; the D10 comment line 262; `checkRemix` line 264, which reads `core/tools/remix.yaml` and every draft tool (no `enabled` filter). `packages/packs/test/real-packs.test.ts` (13 lines) asserts no error and `contentChecks` `[]`. `content-checks.test.ts` already has a test that the Remix check fails when the enum differs.
- **Common inputs.** `nonfiction/tools/cold_open.yaml`: the five blocks as copied in D2; `length` has `default: 800`, `minimum: 200`, `maximum: 2000`; `required: [coreIdea, person]`.
- **Golden kit.** `apps/api/test/packs/golden.kit.ts`: `PACKS_ROOT` line 30; `UPDATE_GOLDENS` line 41 (`SCRIBA_UPDATE_GOLDENS`, set from `--update-goldens` by `apps/api/vitest.config.mts` lines 10 to 13, as `plans/GNP-15.md` states); `enable?` lines 78 and 100; `runGoldenCase` line 131; `goldenCase` line 255. `packages/packs/test/README.md`: line 10 (`goldenCase` options), line 12 (the four checks), line 19 (one scenario per tool), lines 32 to 34 (goldens that include the catalogue change in the PR of the prompt edit).
- **Catalogue.** `apps/api/src/modules/tool-registry/executor.service.ts` lines 171 to 178 (enabled and valid rows only); `catalog.service.ts` line 467 (names sorted); `template.ts` line 557 (`formatCatalogEntry`, ports only, property order) and line 628 (`toolCatalog` rendered). `toolCatalog` appears only in `packages/packs/core/tools/propose_graph.yaml` among the packs.
- **Recipe golden.** `packages/packs/test/golden/propose_graph/recipe.golden.json` line 9 holds the catalogue, 11 entries in this order: character_builder, cold_open, dialogue, mystery_question, myth_buster, numbers_to_people, plot_manager, propose_graph, scene_builder, throughline_check, world_builder. The story golden holds no catalogue. `apps/api/test/packs/propose-graph.test.ts` line 13 has the `propose_graph` line of the catalogue as a constant.
- **Offered-tool assertions.** `apps/api/test/agent-loop-run.test.ts` line 373 asserts an exact list of nine agent-loop tools with no registry tool. Its app boots with the default packs folder `library/packs` (`apps/api/test/create-test-app.ts` line 81), not the real packs. The other offered-tool checks use `arrayContaining`, `toContain`, `not.toContain` or `some`. A search of `apps/api/test`, `e2e/specs` and `apps/web/src` finds no test that asserts a total count of shipped tools.
- **Scenario and eval formats.** `e2e/fixtures/mock-openai/scenarios/pack-contrast.json` (one step, `endpoint: chat`, one stream reply). `scripts/eval-cases.test.mjs` line 34 onward (a loop over every case file, plus two named tests). `scripts/eval-case-tier2-3-shapes.test.mjs` line 27 (the per-id data test). `scripts/eval-agent/cases/contrast.json` (keys `sample`, `intent`, `expect`).
- **E2E.** `e2e/specs/tools-preview.e2e.ts` line 23 is `height: 6000` (GNP-22). `e2e/specs/graph-touch.e2e.ts` line 222 says the tool palette is long and the canvas starts below the fold at 1024 by 768. Root `package.json` line 25 (`test`), 26 (`lint`), 28 (`lint:packs`), 30 (`e2e`, which runs `@bbartolome/scriba-e2e`). `e2e/package.json` line 2 (name) and line 10 (`playwright test`).
- **Plans cited.** `plans/GNP-01.md` line 32 (D10, the Remix rule). `plans/GNP-15.md` line 41 (M7, the catalogue rule) and line 56 (C9, the catalogue position). `plans/GNP-22.md` line 33 (names final), line 43 (C1, the golden and eval naming), line 471 (the GNP-23 note), line 477 (the e2e rows note).
- **Branches.** `unit/GRR-17` exists and is checked out in its own worktree; this plan does not touch it. The working tree of the main checkout was clean when the plan was written.

### Facts assumed

- The implementer's host can run `npm ci` (registry reachable) and the Playwright e2e run, as on this host for GNP-15 and GNP-22 (DECISIONS line 7447). Not re-checked here.
- `npx vitest run <file> -- --update-goldens` passes the flag through as GNP-22's step 8 did. Not re-run here.
- Prettier keeps a YAML block sequence and leaves a block scalar's text as written. The implementer checks with `prettier --check` (step 6).
- The golden kit writes `basic.golden.json` in `JSON.stringify(..., null, 2)` form plus a newline, which Prettier leaves as it is (GNP-22 step 8 did the same).
- The 17 `description:` lines of section 3 step 4 are unchanged between this plan and the implementation; step 5 re-checks them.
