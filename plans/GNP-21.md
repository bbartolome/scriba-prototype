---
id: GNP-21
status: planned
module: genre-packs
milestone: M7
blocked_by: [GNP-02, GNP-06, GNP-12]
unblocks: [GNP-23, GNP-24]
---
# GNP-21 plan — named_concept, comparison_set and objection_handler (shipped disabled)

Batch: [GNP-21] (Genre packs, phase:remaining-shapes, M7), a batch of one. Planner draft at main `fd51cd9` (HEAD when read). The unit file (25 lines) was read in full. It has no notes section and no change note, so no unit change is recorded. The planner changed no file except this plan, committed nothing, and ran no build, install, test or npm command. Only read-only git and file reads were used.

Revised by the Opus reviser at main `5d7e0e3` (the draft commit; the working tree was clean). No `unit/GNP-21`, `unit/GNP-22`, `unit/GNP-23` or `unit/GNP-24` branch exists, and there is no `plans/GNP-22.md`, `plans/GNP-23.md` or `plans/GNP-24.md`. `plans/DECISIONS.md` has no entry that names GNP-21 except the GNP-12 record (G8), so there is no PLAN DOES NOT WORK report for it. The reviser made no unit change and changed no file except this plan. Corrections: open points 1 to 8 are all settled (section 7); C3 is the decision, not a default, with the evidence that it changes no other unit's result; C2 now fixes the exact contract of the `enable` option, so that GNP-22 uses it as written, and step 0 handles either merge order; criterion 2 has one test (one `it` that awaits the three golden bodies, the GNP-14 rule C5), not three; the claim fixture carries `evidence`, a required field of the shipped `claim` type; A9 is a checked fact; A10 (the `/tools` list height in `tools-preview.e2e.ts`) is new; step 15 names the failure route of the e2e gate; section 8, the review parts, is new.

Two findings change the unit's plan as written. (1) Two of the three descriptions start with words that the content suite's verb list does not contain, so AC 1 fails on the code as it stands (open point 1). (2) A shipped-disabled tool cannot be executed, so the golden helper needs an enable step, and the eval runner cannot call the tools until they are enabled (open points 2 and 3).

## 1. Decisions this plan obeys

Labels: **U** = the unit file (line numbers); **M** = `modules/genre-packs.md`; **G** = a settled decision of a done unit or plan, or of a Navigator record on main; **C** = a smaller choice made by this plan, recorded here and not in `plans/DECISIONS.md`.

- **U1 Tools.** `named_concept` (nonfiction, output `entity`; inputs `pattern` text port, required, and `examples` entity port list). `comparison_set` (nonfiction, output `draft`; the five common inputs plus `cases` entity port list, required, and `variables` param, list of strings). `objection_handler` (nonfiction, output `draft`; the five common inputs plus `claimIds` entity port list, kind `claim`, required). All three ship with `enabled: false`. Source: U lines 14 and 17 to 19.
- **U2 Criteria.** Three (U lines 22 to 24). Criterion 2 names one golden test per tool, so it has three tests; each criterion has one test in section 5.
- **U3 No unit text is changed.** The planner does not edit the unit; open point 1 names the one unit change that an alternative would need.
- **M1 Common inputs verbatim.** The five keys are repeated verbatim on every draft tool, and CI asserts identity (M lines 56 to 64). The check compares the property schema, the hints, the title and the membership in `required` against the first draft tool in pack order (`checkCommonInputs`, `packages/packs/test/checks.ts` line 192; GNP-01 D8, `plans/GNP-01.md` line 28). The first draft is `cold_open.yaml`, because `cold_open.yaml` sorts before `comparison_set.yaml`.
- **M2 Entity hints.** `x-scriba-entity-kinds` only where the input means a definite set of kinds (M line 66). `claimIds` takes `[claim]` (U line 19). `examples` and `cases` take no hint (C6).
- **M3 Entity output takes a subset.** "Tools whose output is `entity`, `check` or `graph` take only the subset that makes sense (listed per unit)" (M line 66). So `named_concept` takes no common inputs, and the common-input check applies only to the two draft tools.
- **M4 Skeleton.** A first-draft template of a draft tool follows the four-part skeleton: role line, material with IDs, shape steps, constraints (M lines 46 to 50). For an entity-output prompt, see G5.
- **M5 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if}}`, `{{entity X}}` and `{{toolCatalog}}` (M line 46). These prompts use no `{{toolCatalog}}`.
- **M6 Output kinds and sourcesUsed.** Every output is `draft | entity | claims | graph | check` (M line 52; `OUTPUT_KINDS`, `packages/contracts/src/tool-registry/constants.ts` lines 17 to 23). `sourcesUsed` is computed from entity-ID inputs, style profile excluded. Prompts never ask for sources (M line 51).
- **M7 Names and descriptions.** Lower snake_case tool names and camelCase input keys (M line 44). A description is one sentence, under about 120 characters, plain words, starting with a verb (M line 45).
- **M8 Testing.** Assert behaviour: the spec loads and validates; the request sent to the model; the output kind and `sourcesUsed`; no wording assertions beyond golden snapshots (M line 85). Golden tests run through `POST /api/tool-registry/tools/:name/execute` on `create-test-app`, with the mock OpenAI server (M line 87). Manual eval cases go into the eval data (M line 90). A unit test names no `examples/` path (M line 88; `scripts/examples-check/m1.mjs`, checkTestFiles at line 203).
- **M9 Citations and TK.** Draft prompts cite each factual sentence as `[@id]` and write `TK (note)` for a missing fact (M line 50).
- **G1 GNP-01 (done): the verb list.** A description passes when its first word, or that word without a final `s`, is in `VERBS` (`packages/packs/test/checks.ts` lines 48 to 67; `checkDescription`, line 236). Its open point 2 chose the explicit list, and says "a new verb is one line in a reviewed file" (`plans/GNP-01.md` line 131). The length limit is 120 (`DESCRIPTION_LIMIT`, line 44).
- **G2 GNP-02 (done): the golden harness.** The conventions of `plans/GNP-02.md` (D1 to D18) and `packages/packs/test/README.md`. The helper cannot enable a tool: `runGoldenCase` boots the app, opens the session, and calls execute, with no step between them (`apps/api/test/packs/golden.kit.ts` lines 173 to 174).
- **G3 GNP-06 (done): entity kinds.** `concept` (fields `name`, `definition`; body examples and where used), `claim` (`statement`, `evidence`, `status`), `person` and `source` are shipped (`plans/GNP-06.md`; `packages/packs/nonfiction/entity-types/`, `packages/packs/core/entity-types/source.yaml`).
- **G4 GNP-14 (done), C3: one test file per unit.** A unit with two tools has one golden test file and one eval-data test file (`apps/api/test/packs/character-world-builder.test.ts`; `scripts/eval-case-character-world-builder.test.mjs`; `plans/GNP-14.md` line 41). This plan follows it.
- **G5 GNP-14 (done), C10: entity-output prompts.** Constraint 4 is `Use only the material above.` and nothing more. The skeleton's citation, TK, style and length clauses are left out (`plans/GNP-14.md` line 48; the Navigator decision for `propose_graph`, `plans/DECISIONS.md` entry "2026-11-16 — GNP-04, GNP-07 — Navigator decisions", point 2, option (a)). `character_builder.yaml` line 53 and `world_builder.yaml` line 41 use it.
- **G6 GNP-14 (done): eval keys for entity outputs.** The eval cases of the two entity tools have no `citations` key (`scripts/eval-agent/cases/character-builder.json`, `world-builder.json`, checked by grep).
- **G7 Navigator reading of the eval criterion (DECISIONS entry "2026-11-16 — GNP-08, GNP-09, GNP-10 — Navigator decision: reading of the eval-data criterion").** A criterion "eval case is added" is met by the case in the eval data, with a passing data test. The real-model run is recorded as not run. This plan applies the same reading to AC 3 (open point 3).
- **G8 GNP-12 (done) and the unblocking record (DECISIONS entry "2026-11-16 — GNP-12 — Navigator decision (session `a2095714b1104371933fd5b36dd705e1`, option a)").** GNP-20, GNP-21, GNP-22, AGL-11 and TRG-17 are unblocked when GNP-12 closes. GNP-12 criterion 4 carries the real-model runs of the four workhorses, not of these three tools.
- **C1 Names.** Tools `named_concept`, `comparison_set` and `objection_handler` (U lines 17 to 19). File `packages/packs/nonfiction/tools/<name>.yaml` (M line 37). Golden folders `packages/packs/test/golden/<tool>/`. Case names `pattern-examples`, `winners-cases` and `claim-objections`. Scenarios `pack-<tool>.json`. Eval ids `named-concept`, `comparison-set` and `objection-handler`. Test files: `apps/api/test/packs/tier2-shapes.test.ts` (AC 2, one test that awaits three golden bodies, G4 and C11), `packages/packs/test/tier2-shapes.test.ts` (AC 1) and `scripts/eval-case-tier2-shapes.test.mjs` (AC 3, G4). `tier2-shapes` is the short form of the unit slug `tier2-entity-and-argument-shapes`. GNP-22 must not use this name.
- **C2 The shipped-disabled golden: an `enable` option.** A new optional `enable` on `goldenCase` and `runGoldenCase` calls the public route `POST /api/tool-registry/tools/:name/enabled` (`TOOL_ENABLED_ROUTE`, `packages/contracts/src/tool-registry/routes.ts`; body `toolEnabledRequestSchema`, `{enabled: boolean}`, `catalog.ts` line 80). The route writes the author's switch into the test's temporary library only (`tools.controller.ts` line 98; `catalog.service.ts` `setEnabled`). The shipped `enabled: false` stays. Rejected: a `userTool` copy, which would test a copy of the spec and not the shipped prompt; a second helper, which would duplicate `goldenCase`. **The contract, shared with GNP-22 (open point 2):** `enable?: boolean` on both `GoldenRunOptions` and `GoldenCaseOptions`; absent or `false` changes nothing (every existing case is unchanged); `true` makes `runGoldenCase`, after the session cookie and before the valid execute call, post `{enabled: true}` to `TOOL_ENABLED_ROUTE` with `:name` replaced by `options.tool`, and assert status 200. The switch lives in the case's temporary library (settings section `tools`, `tool-switches.service.ts` lines 11 to 26), which is deleted in the `finally` block, so no other case and no shipped file sees it. The invalid call runs in the same app and library, so it also sees the tool enabled. The option works with `userTool` too (the switch is keyed by name). The README bullet of step 8 documents it. GNP-22's golden tests pass `enable: true` and add no enable step of their own.
- **C3 The verb list.** Add `'coin'`, `'contrast'` and `'raise'` to `VERBS`, after `'face'` (checks.ts line 66). This is the one-line-per-verb rule of G1. Settled by the reviser (open point 1): option (a). Evidence that it changes no other result: `VERBS` is read only by `isVerb` (checks.ts lines 228 to 233), which is called only by `checkDescription` (line 236), and no other file in the repository names `VERBS` or `checkDescription` (grep over `apps`, `packages`, `scripts`, `e2e`). Adding a word only widens what passes. The only test of a failing first word, `content-checks.test.ts` "a description whose first word is not a verb is a finding", uses "The", which stays out of the list; no fixture of `packages/packs/test/fixtures` starts with `coin`, `contrast` or `raise` (grep). No other draft or planned plan changes `checks.ts` (GNP-15 reads it only; GNP-22, GNP-23 and GNP-24 have no plan), and every description of GNP-22 and GNP-23 (`Rewrite`) starts with a word already in the list, so their results are the same in either merge order. GNP-01's list was meant to hold "the 18 distinct first words that the units use" (`plans/GNP-01.md` line 131); `coin`, `contrast` and `raise` are first words of GNP-21's unit descriptions that it missed. The list is a small plan choice of GNP-01, not a Navigator decision, and its own text names the change ("a new verb is one line in a reviewed file"). Option (b) would change the Specs text of the unit, which is not a Decisions section, so no reviser action covers it, and it is not needed because (a) gives a correct plan.
- **C4 The catalogue golden does not change.** `{{toolCatalog}}` renders only valid and enabled tools (`executor.service.ts` line 173: `.filter((row) => row.valid && row.enabled)`). The three tools ship disabled, so `packages/packs/test/golden/propose_graph/recipe.golden.json` and `story.golden.json` stay as they are. No step regenerates them (checked in step 14).
- **C5 Prompts.** The unit gives descriptions and inputs but no prompt steps, so this plan writes the first drafts. Drafts use the M4 skeleton. `named_concept` uses the G5 rule. The author may tune them through copy-on-write (M line 54).
- **C6 Kinds.** `examples` and `cases`: no `x-scriba-entity-kinds` (the unit names none; M line 66). `claimIds`: `[claim]`.
- **C7 `variables`.** `type: array` with `items: {type: string}`, no port, no `x-scriba-type`, no control. The server gives a list-of-strings input the `text` control and the `list` flag (`apps/api/src/modules/tool-registry/inputs.ts` lines 105 to 115; `emit.ts` `controlOf`), and the web form renders a list field as a list (`apps/web/src/app/features/tool-registry/tool-form.ts` line 89). `CONTROL_TYPES` has no list-of-strings control (`constants.ts` lines 32 to 41), and none is needed.
- **C8 Eval values.** `named-concept`: no `citations` key (G6). `comparison-set` and `objection-handler`: `citations: present`. Intents use the sample: chapters 2 to 4 (`examples/nonfiction/sources/outline.md`), the claim `hours-figure-is-average` and the concept `deliberate-practice` (`examples/nonfiction/entities/`). The sample is read here for planning; no test reads it.
- **C9 Fixtures.** Entity IDs `person-a`, `person-b`, `notes-a`, `claim-a` and `style-a` (each matches `^[a-z0-9][a-z0-9-]*$`). Each fixture passes the argument that the invalid call drops (`invalidWithout`), as the `goldenCase` helper requires.
- **C10 Update command.** `cd apps/api && npx vitest run test/packs/tier2-shapes.test.ts -- --update-goldens`. The file filter goes before `--`, so the update run rewrites only this file's goldens (`plans/GNP-10.md` C10).
- **C11 One test for criterion 2.** `goldenCase` returns the body of one `it` (`golden.kit.ts` lines 241 to 259). The one test of criterion 2 awaits the three bodies in turn, so each criterion has exactly one test. This is the GNP-14 rule (`plans/GNP-14.md` C5, line 43; `apps/api/test/packs/character-world-builder.test.ts` line 55).
- **C12 The real-model run of the three eval cases.** Not run, and no unit carries it; recorded in the implementer report as "not run: the three tools ship disabled, and the eval runner boots a fresh temporary library (`scripts/eval-agent/run.mjs` lines 534 to 537) with no enable step and no per-case enable key (lines 100 to 134), so the agent is not offered the tools (`catalog.service.ts` line 359)". Who and when: a person with a local model server, once the runner can turn a tool on in its library or once the author ships a tool enabled; neither is in the scope of this unit. Open point 3 gives the reasons.

## 2. Facts checked and facts assumed

### Checked (read-only, at main `fd51cd9`)

Unit and module:
- `units/GNP-21-tier2-entity-and-argument-shapes.md`: front matter lines 1 to 10 (`blocked_by` GNP-02, GNP-06, GNP-12; `unblocks` GNP-23, GNP-24; `parallel_with` GNP-19, GNP-20, GNP-22); line 14 (`enabled: false`); Specs lines 17 to 19; criteria lines 22 to 24. No notes section.
- `modules/genre-packs.md`: lines 37, 44 to 52, 54, 56 to 66, 85 to 90 (as cited in section 1).
- `units/README.md` lines 34 to 65 (format and blocker notation) and lines 131 to 141 (conventions).
- `plans/PLT-02.md` (the structure of this plan, section numbering from its six sections).

Units and plans that depend on or run alongside GNP-21:
- `units/GNP-23-remix.md`: line 7 `blocked_by` includes GNP-21. Criterion 1: the enum equals the shipped draft tools minus `remix`.
- `units/GNP-24-remaining-shapes-gate.md`: line 7 `blocked_by` includes GNP-21. Criterion 1: "The twelve nonfiction shapes ship disabled." Criterion 2: one golden test per tool.
- `units/GNP-22-tier2-3-draft-shapes.md`: line 8 `parallel_with` includes GNP-21; line 7 does not name it. No plan exists.
- `units/GNP-19-fiction-gate.md`: line 8 `parallel_with` includes GNP-21 (symmetric). `units/GNP-20-throughline-check.md`: line 8 includes GNP-21 (symmetric).
- `unblocks` of GNP-02 (line 9), GNP-06 (line 9) and GNP-12 (line 9) each name GNP-21 (the inverse of `blocked_by` holds).
- `plans/DECISIONS.md`: the only entry that names GNP-21 is the GNP-12 Navigator record at line 5260 (G8). The GNP-08/09/10 record (lines 5219 to 5225) is G7.
- `plans/QUEUE.md` line 13: GNP-21 is available (its blockers are done).
- Draft and planned plans with paths that may overlap (`plans/CEX-14.md`, `GNP-15.md`, `GNP-18.md`, `GRR-15.md`, `PLT-23.md`, `SHL-23.md`): checked by grep for the paths of section 3. Only `plans/GNP-15.md` is related. Its `scene_builder` is enabled, so it changes the catalogue golden (not GNP-21's); it uses `scripts/eval-case-scene-builder.test.mjs` and does not change `golden.kit.ts` (its C7, line 40). No path of GNP-21 is changed by any draft or planned plan. Both merge orders hold.

Code and data (read-only):
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` (lines 35 to 41); `DESCRIPTION_LIMIT` (44); `VERBS` (lines 48 to 67: check, draft, expand, flag, open, rewrite, sketch, state, turn, write, set, paint, move, ask, explain, tell, break, face). `contentChecks` (83), `drafts` built from all loaded tools with no enabled filter (line 97), `checkDescription` (236). **`coin`, `contrast` and `raise` are not in `VERBS`** (grep). The three GNP-21 descriptions start with those words, so the description check fails for each as the code stands. The nine GNP-22 descriptions start with verbs already in the list (set, paint, move, ask, turn, explain, tell, break, face).
- `packages/packs/test/real-packs.test.ts`: runs `lintPacks` and `contentChecks` on the real packs and expects no error. `packages/packs/test/checks.ts` imports `parse` from `yaml`; the packs package has `yaml` 2.9.1 as a devDependency (`packages/packs/package.json`), so the new AC 1 test may use it.
- `apps/api/test/packs/golden.kit.ts`: `GoldenRunOptions` lines 70 to 78 (`userTool` 75, `update` 77); `GoldenCaseOptions` lines 90 to 96 (`userTool` 95); session and execute lines 173 and 174; `goldenCase` lines 241 to 259. The import of `TOOL_EXECUTE_ROUTE` is at line 15.
- `apps/api/src/modules/tool-registry/executor.service.ts`: `OUTPUT_SYSTEM_MESSAGES` (line 31; the `entity` message says "Return one Markdown file: YAML front matter between two lines of ---, then the Markdown body."); step 1 refuses a disabled tool with `TOOL_DISABLED` (line 119: `if (source === undefined && !this.catalog.enabledOf(tool))`); the toolCatalog filter (line 173); `finish` returns the trimmed model text and does not parse entity output.
- `apps/api/src/modules/tool-registry/catalog.service.ts`: `functions()` offers only enabled, valid tools (line 359 `enabledWith(entry.tool, switches) &&`), so the agent cannot call a disabled tool. `setEnabled` (line 232) writes the override through `ToolSwitchesService` (`tool-switches.service.ts`, the settings section `tools`).
- `apps/api/src/modules/tool-registry/tools.controller.ts`: `@Post(TOOL_ENABLED_ROUTE)` at line 98, with `setEnabled`.
- `packages/contracts/src/tool-registry/`: `routes.ts` exports `TOOL_ENABLED_ROUTE` (`/api/tool-registry/tools/:name/enabled`); `index.ts` re-exports `routes.js`; `catalog.ts` line 80 `toolEnabledRequestSchema`.
- `apps/api/src/modules/tool-registry/lint.ts`: `ITEM_TYPES` (line 78: string, integer, number); `template-unused` warning for an unused required input (lines 813 to 818); `entity` helper needs an entity or style input (lines 802 to 807); hint rules (lines 440 to 500, including `x-scriba-entity-kinds` only on entity fields); control fit (lines 556 to 600).
- `apps/api/src/modules/tool-registry/template.ts`: `{{this}}` renders a scalar item (`case 'this'` at line 621, `scalarText(frames.at(-1)?.item)`); `{{#each}}` over a non-array renders nothing (the `each` case, line 631); `{{#if}}` uses `isTruthy` (line 645). The plan does not use `{{#if}}` on a list.
- `packages/contracts/src/tool-registry/constants.ts`: `OUTPUT_KINDS` (17 to 23); `PORT_TYPES` (26); `CONTROL_TYPES` (32 to 41).
- `packages/packs/nonfiction/tools/cold_open.yaml`: the five common inputs (lines 7 to 33 in the file as read; `coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`), `required: [coreIdea, person]`, `output: draft`, `enabled: true`. The other nonfiction draft tools carry the same five blocks.
- `packages/packs/nonfiction/tools/myth_buster.yaml` line 46 and `cold_open.yaml` line 39 show `x-scriba-entity-kinds` in a list-of-entities or single-entity input.
- `packages/packs/fiction/tools/character_builder.yaml` and `world_builder.yaml`: `output: entity` (the precedent of G5, G6).
- `scripts/eval-cases.test.mjs`: two tests. The first loops over every file in `scripts/eval-agent/cases/`, checks the id pattern `^[a-z0-9][a-z0-9-]*$`, the keys (`sample`, `intent`, `expect`), the `expect` keys (`reason`, `tools`, `citations`) and their values. A new case file passes it if its keys and values are valid.
- `scripts/eval-agent/run.mjs`: the case keys (lines 108 to 134: `sample`, `intent`, `expect`); there is no per-case enable key. The judge (lines 361 to 385): `tools` passes only when a card with that name has status `done`; `citations: present` counts citations in the turn's text and cards.
- `e2e/fixtures/mock-openai/scenarios/pack-cold_open.json`: `{"steps": [{"match": {"endpoint": "chat"}, "reply": {"kind": "stream", "deltas": [...]}}]}`. The mock loads every `.json` file in `scenarios/` (checked in `plans/GNP-10.md`).
- No test counts the built-in tool list. Checked: the `apps/api/test/packs/*.test.ts` files; `apps/api/test/tool-registry-save.test.ts` (per-tool lint counts on the fixture packs); `apps/api/test/tool-registry-lint.test.ts` (filters by name); `e2e/specs/tools-*.e2e.ts` (no total count; a comment at `tools-preview.e2e.ts` line 21 says the list grows); `scripts/lint-packs.test.mjs` (no tool count).
- The sample (`examples/nonfiction/`): entities `deliberate-practice` (type concept), `hours-figure-is-average` (type claim), `k-anders-ericsson` (person), `plateau-is-reorganising` (claim), `book-style` (style-profile); sources `deliberate-practice-notes.md`, `ten-thousand-hours-notes.md`, `learning-plateaus-notes.md`; outline chapters 2 to 4.
- Commit history: `fd51cd9` is HEAD on `main`; `git status` is clean.

### Checked by the reviser (read-only, at main `5d7e0e3`)
- `VERBS` (checks.ts lines 48 to 67) has the 18 words listed above and no `coin`, `contrast` or `raise`. Its only reader is `isVerb` (lines 228 to 233), called only by `checkDescription` (lines 236 to 257); a grep for `VERBS` and `checkDescription` over the repository (without `node_modules` and `dist`) finds only `checks.ts`. `apps/api/src/modules/tool-registry/checks.ts` does not exist; no API code checks a description's verb. `content-checks.test.ts` lines 155 to 171 test a failing first word with "The". The broken-spec fixtures all start with "Draft".
- `golden.kit.ts`: imports at lines 14 to 20 (`TOOL_EXECUTE_ROUTE` at 15); `GoldenRunOptions` lines 70 to 78; `GoldenCaseOptions` lines 90 to 97; `post` lines 101 to 114 (passes the loopback host and origin); `runGoldenCase` from line 126, `sessionCookie` line 173, `path` line 174; `goldenCase` lines 241 to 259, which passes `userTool` and no other option to `runGoldenCase`. The text `enable` does not occur in `golden.kit.ts` or (outside line 33, which says "enabled") in `packages/packs/test/README.md`. `README_TERMS` (line 44) lists terms that the README must hold; step 8 removes none.
- `tools.controller.ts` lines 98 to 106: `@Post(TOOL_ENABLED_ROUTE)`, `@HttpCode(200)`, body `toolEnabledRequestSchema`, returns `catalog.setEnabled(name, body.enabled)`. `catalog.service.ts` `setEnabled` (lines 229 to 245) writes the override through `toolSwitches.save`, which writes the `tools` section of the library's `settings.yaml` (`tool-switches.service.ts` lines 11 to 26). Existing tests already post this route with a session cookie (`apps/api/test/tool-registry-executor.test.ts` line 300; `tool-registry-save.test.ts` line 335).
- `executor.service.ts` line 119 refuses a disabled tool with `TOOL_DISABLED` (no inline source in a golden call); lines 145 to 156 check only an entity's `type` against `x-scriba-entity-kinds`, not its front matter; lines 172 to 179 build `toolCatalog` from `list().tools.filter((row) => row.valid && row.enabled)`. So the propose_graph goldens, which run in their own temporary library with no switch, do not list the three disabled tools, and a golden case of this unit that enables its own tool does so in a separate library. C4 holds.
- `catalog.service.ts` `functions()` lines 351 to 365 offers only valid and enabled tools.
- `scripts/eval-agent/run.mjs`: `parseCase` lines 100 to 134 (no enable key); `loadCases` lines 137 to 175; a fresh library at lines 534 to 537. `scripts/eval-agent/README.md` lines 81 to 86: a failed expectation does not change the exit code. So the three cases fail their `tools` expectation in a run of every case until the tools can be enabled there, and the exit code stays 0.
- `packages/packs/nonfiction/entity-types/claim.yaml`: `required: [statement, evidence, status]`; `concept.yaml`: `required: [name, definition]`. The claim fixture of step 5 carries all three.
- `cold_open.yaml` lines 7 to 33 are the five common blocks as copied in step 4 (compared line by line). `packages/packs/core/tools/` holds `propose_graph.yaml` and `throughline_check.yaml`, neither `output: draft`, so the first draft tool in pack order is `cold_open`.
- `real-packs.test.ts` uses `__dirname` (A9 checked); `packages/packs/package.json` has `yaml` 2.9.1 and runs `vitest run` with no config file.
- `plans/DECISIONS.md`: GNP-01 entries at lines 4903 and 4910; GNP-02 line 5083; GNP-08/09/10 Navigator reading lines 5217 to 5222; GNP-12 lines 5255, 5263 and 5269; GNP-14 lines 6540 to 6598. None names GNP-22. None makes `VERBS` a Navigator decision.
- In-flight plans: `CEX-14`, `GNP-15` (draft, branch `unit/GNP-15`), `GNP-18` (planned, branch `unit/GNP-18`), `GRR-15`, `PLT-23` and `SHL-23`. Grep for `golden.kit.ts`, `packages/packs/test/checks.ts`, `packages/packs/test/README.md`, `propose_graph/*.golden.json`, `eval-agent/cases`, `mock-openai/scenarios`, `packages/packs/nonfiction` and `eval-cases.test.mjs`: GNP-15 names `golden.kit.ts`, `checks.ts` and the README only as read or "Not changed" (its C7 and section 3), and changes `propose_graph/recipe.golden.json` (its M7), which this plan does not change; GNP-18 adds fiction eval cases in other files; GRR-15 reads `cold_open.yaml`. No path of section 3 is changed by another plan.
- `units/GNP-22-tier2-3-draft-shapes.md`: nine draft tools, descriptions starting with set, paint, move, ask, turn, explain, tell, break and face (all in `VERBS`); criterion 3 needs an enabled tool to be callable via execute and in the function list. One of its tools is named `contrast`; a tool name and a verb of the list do not interact.
- `e2e/specs/tools-preview.e2e.ts` line 23: viewport height 3200, raised from 2100 by GNP-14 (C12 there) because two new rows moved the person picker below the viewport.

### Assumed (each one is checked by the step named)
- **A1** Node v26.x and npm 11.x are on the PATH (step 1).
- **A2** `{{length}}` renders `800` for the default, because Ajv applies defaults (step 10; the same as GNP-10 A3).
- **A3** `{{#each variables}}` renders each string with `{{this}}` (step 10; the code path is checked above, not run).
- **A4** Ajv's message for a missing required key contains the key's name, as the `goldenCase` check `invalidWithout` needs (step 11; existing tests rely on it).
- **A5** The lint and the content suite accept `output: entity` with no extra fields, and a required input named in the prompt (step 12).
- **A6** The entity golden's system message is `OUTPUT_SYSTEM_MESSAGES.entity` (step 10; the draft one is checked by GNP-10).
- **A7** The `examples/` rule of `scripts/examples-check/m1.mjs` still scans test files only for the text `examples/` (step 15).
- **A8** Prettier keeps the prompt text. If it changes the text, keep its form and record the change (step 4).
- **A9** (now checked, see the reviser's list) Vitest provides `__dirname` in the packs and API test files, as `real-packs.test.ts` and `golden.kit.ts` already use it.
- **A10** The three new rows of the `/tools` list (and the one of GNP-15, if it is on main first) leave the person picker of `tools-preview.e2e.ts` inside its 3200-pixel viewport (step 15). GNP-14 measured two rows moving the picker from inside 2100 to y=2290, so about 1000 pixels are left. If the spec fails on the picker being off screen, this is the GNP-14 cause: stop and report PLAN DOES NOT WORK with the measured position; do not change the spec.

## 3. Files to change

| Path | Change | Reason |
|---|---|---|
| `packages/packs/nonfiction/tools/named_concept.yaml` | new | tool spec, output `entity`, disabled (step 4; C5, C6) |
| `packages/packs/nonfiction/tools/comparison_set.yaml` | new | tool spec, output `draft`, disabled (step 4; C5, C6, C7) |
| `packages/packs/nonfiction/tools/objection_handler.yaml` | new | tool spec, output `draft`, disabled (step 4; C5, C6) |
| `packages/packs/test/checks.ts` | changed: three words added to `VERBS` | AC 1 (step 3; C3; open point 1) |
| `packages/packs/test/golden/named_concept/pattern-examples.fixture.json` | new | the case's arguments and entities (step 5) |
| `packages/packs/test/golden/named_concept/pattern-examples.golden.json` | new, written by step 10 | the recorded request |
| `packages/packs/test/golden/comparison_set/winners-cases.fixture.json` | new | (step 5) |
| `packages/packs/test/golden/comparison_set/winners-cases.golden.json` | new, written by step 10 | |
| `packages/packs/test/golden/objection_handler/claim-objections.fixture.json` | new | (step 5) |
| `packages/packs/test/golden/objection_handler/claim-objections.golden.json` | new, written by step 10 | |
| `e2e/fixtures/mock-openai/scenarios/pack-named_concept.json` | new | one scripted reply (step 6) |
| `e2e/fixtures/mock-openai/scenarios/pack-comparison_set.json` | new | (step 6) |
| `e2e/fixtures/mock-openai/scenarios/pack-objection_handler.json` | new | (step 6) |
| `apps/api/test/packs/golden.kit.ts` | changed: the optional `enable` option (C2) | step 7; shared with GNP-22 (open point 2) |
| `apps/api/test/packs/tier2-shapes.test.ts` | new | AC 2, one test over three golden bodies (step 9; C11) |
| `packages/packs/test/tier2-shapes.test.ts` | new | AC 1 (step 12) |
| `packages/packs/test/README.md` | changed: one bullet for `enable` | the convention is documented here (step 8) |
| `scripts/eval-agent/cases/named-concept.json` | new | eval case (step 13) |
| `scripts/eval-agent/cases/comparison-set.json` | new | eval case (step 13) |
| `scripts/eval-agent/cases/objection-handler.json` | new | eval case (step 13) |
| `scripts/eval-case-tier2-shapes.test.mjs` | new | AC 3, one test (step 13) |

Not changed, and why: `packages/packs/test/golden/propose_graph/*` (C4); `scripts/eval-cases.test.mjs` (its first test loops over every case file, so the new files are checked without an edit); `scripts/eval-agent/run.mjs` and its README (no per-case enable key is needed; open point 3); `packages/packs/test/real-packs.test.ts`; `packages/packs/nonfiction/tools/cold_open.yaml` (the M1 reference); `apps/api/src/**`; `packages/contracts/**`; `e2e/specs/**`; `examples/**`; `package-lock.json`; `units/**`; `modules/**`; `plans/**` other than this plan.

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. The implementer works on the branch `unit/GNP-21` created from `main`, records `node -v` and `npm -v` with each result, does not push, and does not use `git add -A` or `git commit -a`.

0. **Base.** Seam: read-only git and the filesystem. `git rev-parse --short HEAD` (expected `fd51cd9` or a later main). `test ! -e packages/packs/nonfiction/tools/named_concept.yaml`, and the same for `comparison_set.yaml` and `objection_handler.yaml`, and `test ! -e scripts/eval-case-tier2-shapes.test.mjs`, all exit 0. `grep -c "'coin'" packages/packs/test/checks.ts` prints `0` (open point 1; if it prints `1`, the verb change of step 3 is already in). `grep -c "enable" apps/api/test/packs/golden.kit.ts` prints `0`. If it prints more, GNP-22 merged first with the option of C2: check that `GoldenRunOptions` and `GoldenCaseOptions` each have `enable?: boolean`, that `goldenCase` passes it on, and that `runGoldenCase` posts `TOOL_ENABLED_ROUTE` with `{ enabled: true }` before the execute call; if so, skip steps 7 and 8 (and check that the README bullet is there); if the option differs from C2, stop and report PLAN DOES NOT WORK. If another check fails, re-read the changed file before editing.
1. **Runtime and baseline.** Seam: the build and the packs API tests. `node -v` prints `v26.x` and `npm -v` prints `11.x` (A1). `npm ci` only if `node_modules/` is absent. `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api` exits 0. `cd apps/api && npx vitest run test/packs` exits 0 before any change. Record its test count.
2. **Branch.** `git switch -c unit/GNP-21` on a clean tree from `main`.
3. **Verb list (C3, G1).** Seam: the content suite, checked in step 12. In `packages/packs/test/checks.ts`, after `'face',` (line 66), add three lines: `'coin',`, `'contrast',` and `'raise',`. Expected: `grep -c "'coin'\|'contrast'\|'raise'" packages/packs/test/checks.ts` prints `3`. Open point 1 is settled as option (a). `npm test -w @bbartolome/scriba-packs` still passes the existing content-check tests (run in step 12).
4. **Tool specs (C1, C5 to C7, M1 to M9).** Seam: pack lint, checked in step 12. Create the three files below, then `npx prettier --write` on each. The five common-input blocks of `comparison_set` and `objection_handler` are copied verbatim from `cold_open.yaml` (lines 7 to 33). Their `required` lists differ from `cold_open`'s only in the non-common key (`cases` or `claimIds`); the common keys' membership in `required` is the same (`coreIdea` required, the rest not), which the check of M1 requires.

`packages/packs/nonfiction/tools/named_concept.yaml`:

```yaml
schemaVersion: 1
name: named_concept
description: Coin a memorable label and one-line definition for a pattern.
inputs:
  type: object
  properties:
    pattern:
      type: string
      title: Pattern
      x-scriba-type: text
      x-scriba-port: true
    examples:
      type: array
      title: Examples
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
  required: [pattern]
output: entity
enabled: false
prompt: |
  You coin a memorable label for one pattern and write it up as a concept entity.

  Pattern: {{pattern}}
  Material:
  {{#each examples}}
  {{entity this}}
  {{/each}}

  Steps:
  1. Name the pattern in plain words, using the material.
  2. Coin a short label for it, two or three words that are easy to repeat.
  3. Write the definition as one line that says what the pattern is.
  4. In the body, give the examples from the material, each with its entity ID, and say where the concept is used.

  Return one concept file: front matter with type: concept, name (the label) and definition (the one line), then the body.

  Constraints:
  - Use only the material above.
```

`packages/packs/nonfiction/tools/comparison_set.yaml`:

```yaml
schemaVersion: 1
name: comparison_set
description: Contrast winners with matched cases that didn't win.
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
    cases:
      type: array
      title: Matched cases
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
    variables:
      type: array
      title: Variables
      items:
        type: string
  required: [coreIdea, cases]
output: draft
enabled: false
prompt: |
  You write a nonfiction passage that sets the winners beside matched cases that did not win, so the difference makes the point.

  Core idea: {{coreIdea}}
  Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}{{#each variables}}Variable: {{this}}
  {{/each}}Material:
  {{#each entityIds}}
  {{entity this}}
  {{/each}}
  {{#each cases}}
  {{entity this}}
  {{/each}}
  {{#if styleProfile}}
  {{entity styleProfile}}
  {{/if}}

  Steps:
  1. Name the winners and the question they answered, using the material.
  2. Set each matched case that did not win beside a winner, on the same variables.
  3. Show the difference that the variables explain, case by case.
  4. End on what the contrast shows about the core idea, in plain words.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

`packages/packs/nonfiction/tools/objection_handler.yaml`:

```yaml
schemaVersion: 1
name: objection_handler
description: Raise the strongest objections to a claim and answer each fairly.
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
    claimIds:
      type: array
      title: Claims
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [claim]
  required: [coreIdea, claimIds]
output: draft
enabled: false
prompt: |
  You write a nonfiction passage that raises the strongest objections to a claim and answers each one fairly.

  Core idea: {{coreIdea}}
  Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}Material:
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
  1. State the claim being tested, in the words of the material.
  2. Raise the strongest objections to it, strongest first, using only the material.
  3. Answer each objection fairly: first say what it gets right, then give the answer the material supports.
  4. End on what remains open, in plain words, where the material stops.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

5. **Fixtures (D9 of the golden convention, C9).** Seam: `toolCallRequestSchema` in `golden.kit.ts`, read by step 10. Create the three files below, then `npx prettier --write` on each. The arguments of each case pass the Ajv check and the kinds check of the executor: `claimIds` takes a `claim`, and the other entity inputs take any kind.

`packages/packs/test/golden/named_concept/pattern-examples.fixture.json`:

```json
{
  "arguments": {
    "pattern": "Practice planned in advance, with a teacher setting the task, improves more than repeating the same activity.",
    "examples": ["person-a", "notes-a"]
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
    }
  ]
}
```

`packages/packs/test/golden/comparison_set/winners-cases.fixture.json`:

```json
{
  "arguments": {
    "coreIdea": "Expertise grows from planned practice, not from the hours alone.",
    "entityIds": ["person-a", "notes-a"],
    "styleProfile": "style-a",
    "cases": ["person-b"],
    "variables": ["hours of planned practice", "teacher involvement"]
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
      "ref": "person-b",
      "type": "person",
      "path": "entities/person-b.md",
      "content": "Person B practised alone, from a list of tasks chosen before the study began."
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

`packages/packs/test/golden/objection_handler/claim-objections.fixture.json`:

```json
{
  "arguments": {
    "coreIdea": "Expertise grows from planned practice, not from the hours alone.",
    "entityIds": ["notes-a"],
    "styleProfile": "style-a",
    "claimIds": ["claim-a"]
  },
  "entities": [
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
      "content": "---\ntype: claim\nstatement: The practice hours in the study were estimates made from memory.\nevidence: [notes-a]\nstatus: weak\n---\n\nClaim A is the strongest objection to the hours figure."
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

6. **Scenarios (D5 of the golden convention).** Seam: the mock OpenAI server, which loads every `.json` file in `scenarios/`. Create the three files below, then `npx prettier --write` on each.

`e2e/fixtures/mock-openai/scenarios/pack-named_concept.json`:

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["---\ntype: concept\nname: Planned Practice\ndefinition: Practice set in advance by a teacher improves more than repetition alone.\n---\n\nThe study planned each session in advance [@notes-a]."]
      }
    }
  ]
}
```

`e2e/fixtures/mock-openai/scenarios/pack-comparison_set.json`:

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["Person A practised from planned sessions [@person-a]. The matched case, person B, practised from a list chosen before the study began [@person-b]."]
      }
    }
  ]
}
```

`e2e/fixtures/mock-openai/scenarios/pack-objection_handler.json`:

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["The strongest objection is that the hours were estimates made from memory [@claim-a]. The notes record the planned sessions that the answer rests on [@notes-a]."]
      }
    }
  ]
}
```

7. **Golden helper (C2, G2).** Seam: the golden kit, checked by the tests of steps 10 and 11. Edit `apps/api/test/packs/golden.kit.ts`:
   - Add `TOOL_ENABLED_ROUTE` to the import from `'@bbartolome/scriba-contracts/tool-registry'` (line 14 onwards, next to `TOOL_EXECUTE_ROUTE` on line 15).
   - In `GoldenRunOptions` (after the `userTool` line, 75) and in `GoldenCaseOptions` (after the `userTool` line, 95), add `enable?: boolean;`, with a one-line comment: `// Turns the tool on in the case's temporary library first; the shipped spec keeps its value.`
   - In `runGoldenCase`, after `const cookie = await sessionCookie(app, library);` (line 173) and before `const path = ...` (line 174), add:

```ts
    if (options.enable === true) {
      const switched = await post(
        app,
        cookie,
        TOOL_ENABLED_ROUTE.replace(':name', options.tool),
        { enabled: true },
      );
      expect(switched.status, switched.body).toBe(200);
    }
```

   - In `goldenCase` (lines 243 to 248), pass `enable: options.enable` to `runGoldenCase`.
   Expected: no existing test changes. `cd apps/api && npx vitest run test/packs/golden-harness.test.ts` exits 0.

8. **Convention note (C2).** Seam: the README is documentation; `packages/packs/test/README.md` has no test on this text except the terms of `README_TERMS` (`golden.kit.ts`), which stay. After the `goldenCase` bullet (line 10), add one bullet: "`enable: true` (optional) turns the tool on in the case's temporary library, through `POST /api/tool-registry/tools/:name/enabled`, before the call. The shipped spec keeps its `enabled` value; use the option only for a tool that ships disabled."

9. **Golden test file (AC 2, C1, C9).** Seam: `goldenCase` on `POST /api/tool-registry/tools/:name/execute`. Create `apps/api/test/packs/tier2-shapes.test.ts` with the content below, then `npx prettier --write` on it. The file contains no `any` and no text `examples/`.

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

// AC 2 of GNP-21: one golden test per tool, as one test that awaits the three golden bodies in turn (C11, the GNP-14
// rule). The three tools ship disabled, so each case turns its own tool on in its temporary library first (the
// `enable` option of golden.kit.ts).
const namedConcept = goldenCase({
  tool: 'named_concept',
  name: 'pattern-examples',
  enable: true,
  expect: { kind: 'entity', sourcesUsed: ['person-a', 'notes-a'] },
  invalidWithout: 'pattern',
  check: (result) => {
    const prompt = renderedPrompt(result);
    expect(prompt).toContain('Practice planned in advance');
    for (const id of ['person-a', 'notes-a']) {
      expect(prompt, id).toContain(id);
    }
  },
});

const comparisonSet = goldenCase({
  tool: 'comparison_set',
  name: 'winners-cases',
  enable: true,
  expect: {
    kind: 'draft',
    sourcesUsed: ['person-a', 'notes-a', 'person-b'],
  },
  invalidWithout: 'cases',
  check: (result) => {
    const prompt = renderedPrompt(result);
    for (const id of ['person-a', 'notes-a', 'person-b']) {
      expect(prompt, id).toContain(id);
    }
    expect(prompt).toContain('hours of planned practice');
    expect(prompt).toContain('game-changer');
  },
});

const objectionHandler = goldenCase({
  tool: 'objection_handler',
  name: 'claim-objections',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a', 'claim-a'] },
  invalidWithout: 'claimIds',
  check: (result) => {
    const prompt = renderedPrompt(result);
    for (const id of ['notes-a', 'claim-a']) {
      expect(prompt, id).toContain(id);
    }
    expect(prompt).toContain('game-changer');
  },
});

it('AC 2: the named_concept, comparison_set and objection_handler goldens match once each tool is enabled in its temporary library, each prompt holds its arguments and entity IDs, each output has its kind and sourcesUsed without the style profile, and invalid arguments return a readable Ajv error', async () => {
  await namedConcept();
  await comparisonSet();
  await objectionHandler();
}, 180000);
```

10. **Update run (D9 of the golden convention, C10).** Seam: the golden helper's update mode. `cd apps/api && npx vitest run test/packs/tier2-shapes.test.ts -- --update-goldens` exits 0 and writes the three `*.golden.json` files. Read each one. The `messages[0].content` of `named_concept` equals `OUTPUT_SYSTEM_MESSAGES.entity` (A6), and that of the two drafts equals `OUTPUT_SYSTEM_MESSAGES.draft`. The user message holds each argument value and each entity ID, and the style profile's banned phrase; it holds no line `Tools for a recipe`. Then `npx prettier --write packages/packs/test/golden/named_concept packages/packs/test/golden/comparison_set packages/packs/test/golden/objection_handler`. `git status --short` shows no other golden changed.
11. **Compare run (D1).** Seam: golden comparison by value. `cd apps/api && npx vitest run test/packs/tier2-shapes.test.ts` exits 0 with one test passed; `goldenCase` asserts the golden status `match` for each of the three bodies.
12. **Pack checks (AC 1, C3).** Seam: `lintPacks` and `contentChecks` on the real packs. Create `packages/packs/test/tier2-shapes.test.ts` with the content of section 5 (AC 1), then `npx prettier --write` on it. `npm run lint:packs` exits 0 and prints no finding that names the three tools. `npm test -w @bbartolome/scriba-packs` exits 0, and the new test passes; the count rises by one from the baseline. If the description check fails for a verb, the verb of step 3 is missing.
13. **Eval data (AC 3, C8).** Seam: the eval data folder, read by the data test; no model. Create the three case files below, then `npx prettier --write` on each. Then create `scripts/eval-case-tier2-shapes.test.mjs` with the content of section 5 (AC 3), and `npx prettier --write` on it. `node --test scripts/eval-case-tier2-shapes.test.mjs` exits 0 with one test passed. `node --test scripts/eval-cases.test.mjs` exits 0 with two tests passed; its first test also checks the three new case files.

`scripts/eval-agent/cases/named-concept.json`:

```json
{
  "sample": "nonfiction",
  "intent": "Give the difference between deliberate practice and simply doing the activity again a memorable name, with a one-line definition, using my notes.",
  "expect": {
    "reason": "completed",
    "tools": ["named_concept"]
  }
}
```

`scripts/eval-agent/cases/comparison-set.json`:

```json
{
  "sample": "nonfiction",
  "intent": "Set the planned-practice habit of the person in my notes beside a matched case that did not practise that way, and show the difference.",
  "expect": {
    "reason": "completed",
    "tools": ["comparison_set"],
    "citations": "present"
  }
}
```

`scripts/eval-agent/cases/objection-handler.json`:

```json
{
  "sample": "nonfiction",
  "intent": "Raise the strongest objections to the ten-thousand-hour claim in chapter 3 and answer each one fairly, using my claims.",
  "expect": {
    "reason": "completed",
    "tools": ["objection_handler"],
    "citations": "present"
  }
}
```

14. **Catalogue unchanged (C4).** Seam: git and the propose_graph golden. `git diff --stat -- packages/packs/test/golden/propose_graph` prints nothing. `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0 without `--update-goldens`.
15. **Format and root gates.** Seam: Prettier, the root scripts and the API build. `npx prettier --check` on every new and changed file of section 3 exits 0. `npm run build -w @bbartolome/scriba-api` exits 0, since it type-checks the test files. From the root, `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0; a failure already on the base is reported, not fixed. `cd apps/api && npx vitest run test/packs` exits 0, with the baseline count of step 1 plus one. The root `npm test` includes the e2e suite; if `tools-preview.e2e.ts` fails with the person picker off screen, follow A10 (stop, report PLAN DOES NOT WORK, do not change the spec).
16. **Commit (the orchestrator asks).** Seam: the git index. `git add` each path of section 3 by name; `git diff --cached --stat` lists only those paths and no `plans/` or `units/` file. Commit with `feat(GNP-21): named_concept, comparison_set and objection_handler, shipped disabled`. Do not push.

## 5. Acceptance criteria and tests

Each criterion has one test. AC 2 is one criterion whose text asks for one golden test per tool; its one test awaits the three golden bodies (C11), so each tool has its golden case and the criterion has one test. Nothing is marked passed in this plan.

**AC 1: All three pass the validation suite and ship disabled; the two draft tools carry the identical common inputs.** (unit line 22)
- Test file: `packages/packs/test/tier2-shapes.test.ts` (new). Test name: `AC 1: the three Tier 2 tools pass the suite on the real packs, ship with enabled false, and have their output kinds`.
- Content:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { contentChecks, lintPacks } from './checks';

// AC 1 of GNP-21: the three tools pass the validation suite, ship disabled, and have the output kinds of the unit.
const REAL_PACKS = resolve(__dirname, '..');
const SHAPES: Record<string, string> = {
  named_concept: 'entity',
  comparison_set: 'draft',
  objection_handler: 'draft',
};

describe('Tier 2 shapes', () => {
  it('AC 1: the three Tier 2 tools pass the suite on the real packs, ship with enabled false, and have their output kinds', () => {
    const errors = lintPacks(REAL_PACKS).filter(
      (finding) => finding.severity === 'error',
    );
    expect(errors).toEqual([]);
    expect(contentChecks(REAL_PACKS)).toEqual([]);
    for (const [name, output] of Object.entries(SHAPES)) {
      const spec = parse(
        readFileSync(
          resolve(REAL_PACKS, 'nonfiction', 'tools', `${name}.yaml`),
          'utf8',
        ),
      ) as { enabled: unknown; output: unknown };
      expect(spec.enabled, name).toBe(false);
      expect(spec.output, name).toBe(output);
    }
  });
});
```

- Command: `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (steps 12 and 15).
- Pass: both exit 0; the test passes. `contentChecks` covers the identity of the common inputs (`checkCommonInputs`, checks.ts line 192) and the descriptions (`checkDescription`, line 236). The test fails until the verb list holds `coin`, `contrast` and `raise` (open point 1).

**AC 2: One golden test per tool (GNP-02).** (unit line 23)
- Test file: `apps/api/test/packs/tier2-shapes.test.ts` (new), one test: `AC 2: the named_concept, comparison_set and objection_handler goldens match once each tool is enabled in its temporary library, ...`, with the name and content of step 9.
- Command: `cd apps/api && npx vitest run test/packs/tier2-shapes.test.ts` (steps 10 and 11).
- Pass: the test passes. For each of the three bodies, the golden status is `match`; the kind is `entity`, `draft` and `draft`; `sourcesUsed` is `['person-a', 'notes-a']`, `['person-a', 'notes-a', 'person-b']` and `['notes-a', 'claim-a']`; the call without `invalidWithout` returns 422 with `TOOL_ARGS_INVALID` and a message that contains that name; one model call; the `check` passes.

**AC 3: Manual eval cases added.** (unit line 24)
- Test file: `scripts/eval-case-tier2-shapes.test.mjs` (new). Test name: `AC 3: the three Tier 2 eval cases are in the eval data and use the documented keys and values`.
- Content:

```js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// AC 3 of GNP-21: the three Tier 2 cases are in the Agent loop's eval data. The test reads the case files and runs no model.
const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
);
// Each case names its tool. An entity output has no citations key (the GNP-14 precedent).
const EXPECTED = {
  'named-concept': { tool: 'named_concept', citations: undefined },
  'comparison-set': { tool: 'comparison_set', citations: 'present' },
  'objection-handler': { tool: 'objection_handler', citations: 'present' },
};

test('AC 3: the three Tier 2 eval cases are in the eval data and use the documented keys and values', () => {
  for (const [id, want] of Object.entries(EXPECTED)) {
    const data = JSON.parse(readFileSync(join(CASES, `${id}.json`), 'utf8'));
    assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
    assert.equal(data.sample, 'nonfiction');
    assert.equal(typeof data.intent, 'string');
    assert.ok(data.intent.length > 0, `${id}: intent is not empty`);
    assert.deepEqual(data.expect.tools, [want.tool]);
    assert.equal(data.expect.reason, 'completed');
    if (want.citations === undefined) {
      assert.equal('citations' in data.expect, false, `${id}: no citations key`);
    } else {
      assert.equal(data.expect.citations, want.citations, `${id}: citations`);
    }
  }
});
```

- Command: `node --test scripts/eval-case-tier2-shapes.test.mjs` (steps 13 and 15).
- Pass: 1 test passes. The real-model run of the three cases is not part of this test (open point 3).

## 6. Agreement with the downstream units

- **GNP-23 (remix; `blocked_by` names GNP-21, `units/GNP-23-remix.md` line 7).** It needs the enum of `targetShape` to list every shipped draft tool except `remix`. Of this unit's tools, the enum needs `comparison_set` and `objection_handler`, both `output: draft` and shipped disabled. The check `checkRemix` reads all loaded draft tools with no enabled filter (`packages/packs/test/checks.ts` line 97), so disabled tools count. `named_concept` is not in the enum (output `entity`). Agreed. GNP-23 is not changed.
- **GNP-24 (remaining-shapes gate; `blocked_by` names GNP-21, `units/GNP-24-remaining-shapes-gate.md` line 7).** Its criterion 1 needs "the twelve nonfiction shapes" shipped disabled; this unit supplies three of them, GNP-22 the other nine. Its criterion 2 needs one golden test per tool through the mock server; section 5, AC 2 provides it. Its criterion 4 (enabling a disabled shape makes it callable and a canvas node) needs the disabled spec and the enable path, both present; this unit does not test it. Agreed.
- **GNP-22 (not planned; `parallel_with` names GNP-21, `units/GNP-22-tier2-3-draft-shapes.md` line 8).** It is the same shape as this unit and needs the same test helper. (1) Its golden tests must use the `enable: true` option that step 7 adds to `golden.kit.ts`, with the contract of C2 (`enable?: boolean` on `GoldenRunOptions` and `GoldenCaseOptions`; `true` posts `{ enabled: true }` to `TOOL_ENABLED_ROUTE` for `options.tool` after the session and before the execute call, and asserts 200); it must not add its own enable step or a second helper. Its criterion 3 (an enabled tool is callable via execute and in the function list) is its own test; the option gives it the enable step for execute, and the function list is read from the Tool registry's functions route. (2) Whichever unit merges second rebases onto the first and keeps one copy of the option; if GNP-22 merges first with this contract, step 0 of this plan skips steps 7 and 8. (3) Its test file name must not be `tier2-shapes`. (4) Its descriptions start with verbs already in `VERBS` (set, paint, move, ask, turn, explain, tell, break, face), so it needs no verb change. (5) Its draft tools carry the five common inputs verbatim, as this unit's do.
- **GNP-19 and GNP-20 (`parallel_with` names GNP-21, both sides symmetric).** No file is shared. GNP-20 is done.
- **GNP-15 (draft; `scene_builder` enabled).** It changes the catalogue golden (`propose_graph/recipe.golden.json`); this unit does not (C4). It uses `scripts/eval-case-scene-builder.test.mjs` and does not edit `golden.kit.ts` (its C7). No conflict in either merge order.
- **GNP-02, GNP-06 and GNP-12 (done; `blocked_by` of GNP-21).** Their `unblocks` lists name GNP-21 (their line 9). The inverse holds. Their facts are used as they are: the golden harness (GNP-02), the `concept` and `claim` kinds (GNP-06), the gate (GNP-12). No change to them.
- **Eval runner (`scripts/eval-agent/`).** The three case files are data; the runner and its README are not changed. The judge's rules (lines 361 to 385) apply as they are.
- **Agent loop (AGL).** Disabled tools are not offered to the model (`catalog.service.ts` line 359). This is the intended behaviour of "ship disabled", and it is why the eval cases need the tools enabled (open point 3).

## 7. Open points

All eight are settled by the reviser; none is open for the Navigator, and none changes a unit, a criterion or a settled decision.

1. **The verb list. Settled: option (a), add `coin`, `contrast` and `raise` to `VERBS` (C3, step 3).** The unit's descriptions of `named_concept` ("Coin"), `comparison_set` ("Contrast") and `objection_handler` ("Raise") start with words that `VERBS` does not contain (checks.ts lines 48 to 67), so the description check fails for all three as the code stands. Option (a) is safe: `VERBS` is read only by `checkDescription`, adding words only widens what passes, the one negative test uses "The", and no other unit's result changes in either merge order (evidence in C3 and in the reviser's list of section 2). Option (b), rewording the three descriptions of the unit's Specs section, is rejected: the unit text is right (the words are verbs, as module line 45 asks), (a) gives a correct plan, so the first YAGNI condition fails and no unit change is allowed.
2. **The `enable` option is shared with GNP-22. Settled: GNP-21 adds it with the contract of C2; GNP-22 uses it as written.** GNP-22 has no plan and no branch. Its golden tests pass `enable: true` and add no other enable step (section 6). If GNP-22 merges first with the same option, step 0 of this plan skips steps 7 and 8. The orchestrator passes C2 to GNP-22's planner.
3. **The real-model run of the three eval cases. Settled: AC 3 is met by the data and the data test; the real-model run is recorded as not run, and no unit carries it (C12).** The Navigator's data-only reading of the eval criterion (DECISIONS lines 5217 to 5222, G7) applies to "Manual eval cases added", whose main clause is the same data operation. GNP-14 (DECISIONS line 6602) and GNP-15 (its open point 1) recorded "not run" for the same criterion with no carrier. GNP-12 criterion 4 covers the four workhorses only (G8), and no criterion of GNP-22, GNP-23 or GNP-24 runs the eval script. Module line 90 and `units/README.md` line 141 put real models in the manual script, never in CI, and neither makes a unit run each case. The cases cannot pass a real run today: the runner boots a fresh library with no enable step (`run.mjs` lines 534 to 537) and no per-case enable key (lines 100 to 134), and the agent is offered only enabled tools (`catalog.service.ts` line 359). They do not break a run of every case: a failed expectation does not change the exit code (`scripts/eval-agent/README.md` lines 81 to 86). Who and when: a person with a local model server, after the runner can enable a tool or the author ships one enabled; adding that to the runner is outside this unit (no criterion needs it; the runner belongs to the Agent loop). No criterion or settled decision changes, so this is not a Navigator matter.
4. **No kind hints for `examples` and `cases`. Settled: no hint (C6), the simplest option.** The unit names no kinds for them, and module line 66 asks for a hint only where the input means a definite set of kinds. If the author wants a set later, it is an expand-only spec change. No unit requirement is added.
5. **The prompt steps are first drafts (C5). Settled: kept as written.** The unit gives none. They follow the M4 skeleton (drafts) and the G5 rule (`named_concept`); the author may tune them through copy-on-write (M line 54). No unit requirement is added.
6. **The entity-output constraint (G5). Settled: the GNP-14 rule applies.** `named_concept` has output `entity`, as `character_builder` and `world_builder` do, so constraint 4 is `Use only the material above.` and nothing more (`plans/GNP-14.md` C10; the Navigator decision for `propose_graph`, 2026-11-16, point 2, option (a)).
7. **The entity output is not validated by the executor. Settled: recorded, no step.** `finish` returns the trimmed text. Whether a reply is a valid `concept` file is checked when the Agent loop routes the output, not in this unit; the golden test checks the request, as module line 85 asks.
8. **Assumed facts A1 to A8 and A10** (section 2) are each checked by the step named there; A9 is now checked. None is blocking unless a step fails; A10 has its own failure route.

Unit change: none. The reviser changed no unit.

## 8. Review parts

The plan has two parts. Each step of section 4 and each test of section 5 is in exactly one part.

- **Part 1 — the three specs, the verb list, the enable option and the golden test.** Steps 0 to 12, 14, 15 and 16. Tests: AC 1 (`packages/packs/test/tier2-shapes.test.ts`, "AC 1: the three Tier 2 tools pass the suite on the real packs, ship with enabled false, and have their output kinds") and AC 2 (`apps/api/test/packs/tier2-shapes.test.ts`, "AC 2: the named_concept, comparison_set and objection_handler goldens match ..."). Files: the three specs, `packages/packs/test/checks.ts`, the three fixtures and three goldens, the three scenarios, `apps/api/test/packs/golden.kit.ts`, `packages/packs/test/README.md` and the two test files. The reviewer checks that the `enable` option matches C2 word for word (it is the contract GNP-22 uses), that the `VERBS` diff is three added lines, that `propose_graph/*` is unchanged (step 14), and that no existing golden changed.
- **Part 2 — the eval cases.** Step 13. Test: AC 3 (`scripts/eval-case-tier2-shapes.test.mjs`, "AC 3: the three Tier 2 eval cases are in the eval data and use the documented keys and values"). Files: the three case files in `scripts/eval-agent/cases/` and the data test. The reviewer checks that the implementer report records the real-model run as not run, with the reason of C12.
