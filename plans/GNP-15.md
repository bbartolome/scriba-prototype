---
id: GNP-15
status: planned
---
# GNP-15 plan — scene_builder tool, golden case and eval case

Batch: [GNP-15] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `985d6bc` (HEAD when read; the working tree was clean). The unit file was read in full (lines 1 to 25). It has no change note: `units/GNP-15-scene-builder.md` has no "Moved to", "Removed by revision", "Loosened by" or "Reworded by" line, and neither do the unit files of its blockers (GNP-02, GNP-13) or its downstream units (GNP-19, GNP-23). `plans/DECISIONS.md` has no entry that names GNP-15 (`grep -n GNP-15 plans/DECISIONS.md` prints nothing).

The planner changed no file except this one, committed nothing except this one, and ran no build, test, lint or npm command.

Revised by the Opus reviser at main `576e1e3` (the draft commit; `git diff --name-only 985d6bc 576e1e3` lists only `plans/GNP-15.md`; the working tree was clean). `plans/DECISIONS.md` still has no entry that names GNP-15, so there is no PLAN DOES NOT WORK report for it. No `unit/GNP-15`, `unit/GNP-19` or `unit/GNP-23` branch exists, and there is no `plans/GNP-19.md` or `plans/GNP-23.md`. Corrections: A2 is now a checked fact (the function is `readInputs`, not `propertiesOf`); the `units/README.md` line numbers; the number of catalogue lines in 3.6; the `git status` form of step 9 (untracked files are listed one per file); the root `npm test` rule of step 13 (the GNP-14 rule, copied); the failure route of step 14; the source of the criterion 1 test in section 5; the reason for leaving out `expect.citations` (C8); the three open points of section 7, all settled by the reviser; and section 8, the review parts. The reviser made no unit change. The reviser ran, outside the repository, `npx prettier` on the YAML and JSON blocks of 3.1, 3.2 and 3.5 (output unchanged) and `node scripts/lint-packs.mjs --root` on a copy of `packages/packs` in `/tmp` with the 3.1 file added (exit 0, no finding).

Revision 2 by an Opus reviser at main `bbe7824`, after the PLAN DOES NOT WORK report of 2026-11-19 at step 13 (`plans/DECISIONS.md`, "GNP-15 — PLAN DOES NOT WORK at step 13") and the open NAVIGATOR question that followed it ("GNP-15 — the reviser's NAVIGATOR reply", no decision recorded). The reviser examined `unit/GNP-15`: one commit, `f3ccbf2` (part 1: the spec, fixture, golden, scenario, test and the recipe golden), on base `ddb608c`; the worktree holds the two eval files of 3.5, untracked. Since `ddb608c`, main gained GNP-16 (`dialogue`), GNP-17 (`plot_manager`), GNP-18 (the fiction sample), GNP-21 (three nonfiction tools shipped disabled, and the `enable` option of `golden.kit.ts`), SHL-23 and a project-store change; `apps/api/src/modules/tool-registry/**` and `modules/genre-packs.md` did not change (`git diff --stat ddb608c main`). Corrections:
- **The cause (revision 1 step 13, now step 14; open point 3).** The gate rule now follows `prompt.md` step 3 ("Continue only when the three checks pass on the last commit") and the repository's record of reruns on an unchanged commit (`plans/DECISIONS.md` lines 4543, 5077 to 5081, 5919, 6209 and 6219): a failure of a test outside this unit's files allows a rerun of the root `npm test` on the same commit; the gate is met only by an exit 0. The workspace-by-workspace exception of revision 1 is removed, because it met the gate without an exit 0. The orchestrator did not accept that the reviser settles a gate policy (`plans/DECISIONS.md`, entry "GNP-15 — Opus revision 2 (READY reply) committed as draft"); the Navigator then decided option (b) with the same rule (entry "GNP-15 — Navigator decision: the root `npm test` gate ...", 2026-11-20). See revision 3.
- **Step 0: rebase.** The implementer rebases `unit/GNP-15` onto main first, so the tests run on main's packs. The recipe golden conflicts (one JSON line, changed by GNP-16, GNP-17 and `f3ccbf2`); it is resolved to main's file, and step 9 makes it again. Steps 2, 4, 5 and 6 now check the files of `f3ccbf2` against 3.1 to 3.4 instead of creating them.
- **The `/tools` viewport (open point 2, new step 13; the e2e run is now step 15).** Revision 1 changed no e2e file. GNP-22 measured the TRG-05 C2 picker at y 3767.4 with nine more rows on base `a12af54`, which did not have GNP-21's three rows (`plans/DECISIONS.md` lines 6892 to 6896), and GNP-14 measured it at y 2302 with eleven fewer rows (line 6545). That is about 133 px per row. Main has GNP-21's three rows now, so with this row the picker is estimated near y 3100 alone, and near y 3370 in the four-spec run (+270 px for the two user rows that `tools-editor.e2e.ts` leaves, the difference of GNP-22's two runs at line 6924). Both values are above the 2200 px that GNP-22's margin rule allows in 3200 px, and the second one is off screen. So line 23 becomes 6000, byte for byte GNP-22's line (`plans/GNP-22.md` C6), unless main already has it. The two plans then agree in either merge order.
- **Facts brought up to date:** ten catalogue lines on main (3.6, step 9); line numbers of `checks.ts` (+3 after line 66, GNP-21's verbs) and `golden.kit.ts` (GNP-21's `enable` option); `units/README.md` (+2); the eval intent of 3.5 now fits the fiction sample on main (GNP-18): the veteran keeper Tomas Vell keeps the lamp and the relief keeper Ada Quill is "her", so revision 1's "the keeper who keeps the lamp ... from her point of view" named the wrong keeper; section 6 (GNP-16, GNP-17, GNP-18 and GNP-21 done; GNP-22 and PLT-23 planned).
- **No unit change.** Nothing in a unit is in the way of a correct plan.

Revision 3 by a reviser at main `fdfd4fb` (the working tree was clean; `unit/GNP-15` is still `f3ccbf2` on `ddb608c`, and its worktree still holds the two untracked eval files). `plans/DECISIONS.md` has no new PLAN DOES NOT WORK report for GNP-15; the report of 2026-11-19 is answered by step 14. Since `bbe7824`, main gained GNP-22 (done: nine nonfiction draft tools shipped disabled, their goldens, scenarios, eval cases and two tests, and `tools-preview.e2e.ts` line 23 at 6000 px, commit `aee3cd4`), PLT-23 (done: `tools-preview.e2e.ts` lines 20 to 22 reworded, and `tools-editor.e2e.ts` removes its user tools in an `afterAll`), CEX-14, SHL-17 (done) and the GNP-18 module-line correction (`modules/genre-packs.md` lines 23 and 33; no line moved). No change under `apps/api/src/modules/tool-registry/`, in `packages/packs/test/checks.ts`, `apps/api/test/packs/golden.kit.ts`, the recipe golden, `cold_open.yaml`, `examples/`, `scripts/eval-cases.test.mjs`, `units/README.md`, the root `package.json` or the three unit files (`git diff --stat bbe7824 fdfd4fb`). Corrections:
- **The root `npm test` gate (step 14, open point 3).** The Navigator decided it on 2026-11-20 (option (b), `plans/DECISIONS.md` entry "GNP-15 — Navigator decision: the root `npm test` gate after an unrelated intermittent failure"). Step 14 already states that rule (the stop list of files, each failing file run alone, at most two reruns of the unchanged commit with `uptime` before each run, gate met only by an exit 0, the stop on two failed reruns or the same test failing three times); it is kept, and now cites the decision. The flaky `test/tool-registry-save.test.ts` is not added to any tolerated list. Open point 3 and the revision 2 note no longer say the reviser settled it.
- **The viewport line (C10, M9, step 13, open point 2).** Main has `test.use({ viewport: { width: 1280, height: 6000 } });` at line 23 (GNP-22), so this unit changes no e2e file. Step 13 becomes a check of line 23 after the rebase, with no commit; the row of `e2e/specs/tools-preview.e2e.ts` leaves section 3; the Review parts no longer name it.
- **A9 and step 15.** GNP-22 measured the picker target at y 3787.4 alone and 4057.4 in the four-spec run at 6000 px (`plans/DECISIONS.md`, GNP-22 entries); the four-spec run held the two user rows that PLT-23 now removes. With this unit's one row (about 133 px), the estimate is about y 3920 in both runs, below the 5000 limit.
- **Section 6.** GNP-22 and PLT-23 are done; No other `draft` or `planned` plan (GRR-15 is the only planned one) names a path of section 3.

## 1. Decisions this plan obeys

Labels: **U** = the unit; **M** = `modules/genre-packs.md`; **D** = a settled decision of `plans/DECISIONS.md` or of another plan; **C** = a smaller choice made here (the simplest option, recorded).

- **U1 Tool and output.** `packages/packs/fiction/tools/scene_builder.yaml`, output `draft`, `enabled: true`. Source: unit line 15; module line 52 (output kinds).
- **U2 Description.** Verbatim: "Draft a scene from its goal, conflict and outcome from one character's point of view." Source: unit line 16. It is 85 characters (under `DESCRIPTION_LIMIT` 120, `packages/packs/test/checks.ts` line 44) and starts with `draft`, which is in `VERBS` (checks.ts line 50). Source of the rule: module line 45.
- **U3 Inputs.** The five common inputs, then `sceneNotes` (text port), `pov` (entity port, kind `character`, required), and `goal`, `conflict`, `outcome` (params). Source: unit line 17. The common inputs are the table of module lines 56 to 64 (rows at lines 60 to 64).
- **U4 Prompt.** The skeleton of module lines 46 to 50: a role line; the material, each entity rendered with its ID; the shape steps (unit line 18: establish the POV character's goal, escalate the conflict, turn to the outcome, stay in the POV character's perception and voice); the constraints. This tool is a draft tool, so all four constraints of module line 50 apply: use only the material; cite with `[@id]`; write `TK (note)` for a missing fact; follow the style profile's tone, banned phrases and length. Source: unit line 18; module lines 46 to 50 and line 54 (first drafts).
- **U5 Criteria.** Three criteria, copied in section 5. Source: unit lines 21, 22 and 24.
- **M1 Common inputs of draft tools.** Each of the five must equal the first draft tool's in its schema, its hints and its `required` flag. `checkCommonInputs` (`packages/packs/test/checks.ts` lines 195 to 224, the rule of D8 at line 180) compares with the first draft in pack order, which is `cold_open` (`packages/packs/nonfiction/tools/cold_open.yaml`). Source: module lines 56 to 64; checks.ts line 100 (`drafts`).
- **M2 Entity kinds.** `pov` takes `x-scriba-entity-kinds: [character]`, because it means a definite kind (module line 66: "where the input means a definite set of kinds, they also carry `x-scriba-entity-kinds`"). The wording of line 66 is the Navigator's (`plans/DECISIONS.md` line 5144). `entityIds` takes no kinds hint, as in `cold_open`. The kind `character` is shipped by `packages/packs/fiction/entity-types/character.yaml` (line 2, `kind: character`), so the entity-kind promotion of checks.ts lines 85 to 98 passes.
- **M3 Scene content on text ports.** `sceneNotes` is a text port (module line 53). `goal`, `conflict` and `outcome` are params (no port), as the unit says.
- **M4 sourcesUsed.** Computed from the entity inputs, style profile excluded (module line 51; `executor.service.ts` lines 159 to 161, `!ref.style`). `pov` is an entity input, so it counts.
- **M5 Template subset.** Only `{{field}}`, `{{#each}}`, `{{#if}}` and `{{entity id}}` (module line 46). The field form `{{entity pov}}` is in the subset (`apps/api/src/modules/tool-registry/template.ts` lines 280 to 282).
- **M6 Golden convention.** One scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`; fixtures and goldens under `packages/packs/test/golden/<tool>/`; the helper `goldenCase` of `apps/api/test/packs/golden.kit.ts` (lines 255 to 274); the update flag `--update-goldens`. A golden changes only in the PR of the prompt edit. Source: module line 87; `plans/GNP-02.md` D5, D6, D9, D10.
- **M7 Catalogue.** `{{toolCatalog}}` renders every valid and enabled built-in tool, so this PR changes the recipe golden of `propose_graph` (one inserted line) and regenerates it in the same PR. Source: `plans/GNP-02.md` D18; `plans/GNP-14.md` M8 and C7.
- **M8 Eval cases.** A manual eval case per tool goes into the Agent loop's eval data; nothing runs it in CI. Source: module line 90; units/README.md line 141; unit line 24. The reading that a data test meets the criterion is the Navigator's (`plans/DECISIONS.md` lines 5219 to 5222, option a).
- **M9 System seam.** "The Playwright e2e is unchanged; this module adds no e2e step" (module line 89). This plan adds no e2e step, no assertion and no spec, and changes no e2e file: the viewport of `e2e/specs/tools-preview.e2e.ts` line 23 is already 6000 px on main (GNP-22, C10, step 13). It runs the existing `/tools` specs once as a check (step 15).
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
- **C8 Eval intent and keys.** The intent names no entity ID (the GNP-14 choice C8, kept by `dialogue.json` and `plot-manager.json` on main after GNP-18). It names the keepers by role, as the fiction sample on main describes them: the relief keeper Ada Quill (`examples/fiction/entities/relief-keeper.md`, "her") tells the veteran keeper Tomas Vell (`veteran-keeper.md`, who keeps the lamp) that the supply boat is late again (`supply-boat-rule.md`). `expect.citations` is left out, so the report shows it as `unchecked`: module line 90 asks for citation presence only for the workhorses (and voice separation for Dialogue). `expect` is `reason` and `tools`, as in `character-builder.json` and `dialogue.json`.
- **C10 The tools-preview viewport (revision 2; open point 2; revision 3).** Line 23 of `e2e/specs/tools-preview.e2e.ts` must be `test.use({ viewport: { width: 1280, height: 6000 } });`. Main has that line (GNP-22, `aee3cd4`), and PLT-23's comment at lines 20 to 22, so this unit changes no line of the file; step 13 only checks it. Reason for 6000 px: at 3200 px the picker would be near y 3900 (revision 2 note and A9). The margin rule is GNP-22's: each logged picker target is below y 5000.
- **C9 Catalogue line.** The exact text of section 3.6. Its position is between `propose_graph` and `throughline_check`, because the catalogue is sorted with plain `[...names].sort()` (`apps/api/src/modules/tool-registry/catalog.service.ts` line 467).

## 2. Facts checked and facts assumed

### Facts checked

Revision 3, checked at main `fdfd4fb`:
- `git log main..unit/GNP-15` lists only `f3ccbf2` (parent `ddb608c`); `git diff --name-only ddb608c main` and `git diff --name-only ddb608c unit/GNP-15` share only `packages/packs/test/golden/propose_graph/recipe.golden.json` (A10 holds). The worktree lists only the two untracked eval files.
- `e2e/specs/tools-preview.e2e.ts` on main: line 23 `test.use({ viewport: { width: 1280, height: 6000 } });`; `const target = await centerOf(personPicker);` line 209; `toHaveValue('ada')` line 213.
- The recipe golden on main still holds the ten catalogue lines of the revision 2 list (GNP-22's nine tools ship disabled).
- `packages/packs/test/tier2-3-shapes.test.ts` (GNP-22) asserts no lint error and an empty `contentChecks` on the real packs, and `enabled: false` for its nine tools only; `scene_builder` does not affect it.
- `package-lock.json` differs between `ddb608c` and main (SHL-17), so step 1 runs `npm ci`.
- Plan status: GNP-22, PLT-23, CEX-14, SHL-17 `done`; GRR-15 `planned` (`unit/GRR-15` changes only `apps/web/src/app/features/graph-runner/*` and `e2e/specs/graph-{large,theme,touch}.e2e.ts`); no other plan is `draft` or `planned`.
- `plans/DECISIONS.md`: the Navigator decision on the root `npm test` gate (2026-11-20, option (b)) and GNP-22's merge entry (gates on `aee3cd4`, 6000 px on main).

Revision 2, checked at main `bbe7824` (the other facts below were checked at `985d6bc` and re-checked where this list says so):
- Git: `main` is `bbe7824`, the working tree is clean. `unit/GNP-15` is `f3ccbf2`, one commit on `ddb608c` (`git log main..unit/GNP-15`); its six paths are the first six rows of section 3. Its worktree `scriba-prototype-wt/GNP-15` holds `scripts/eval-agent/cases/scene-builder.json` and `scripts/eval-case-scene-builder.test.mjs`, untracked (`git status --short`); the case file has the revision 1 intent. No `unit/GNP-19` or `unit/GNP-23` branch and no `plans/GNP-19.md` or `plans/GNP-23.md` exist.
- `f3ccbf2`: the five common-input blocks of `scene_builder.yaml` (lines 7 to 33) equal `cold_open.yaml` lines 7 to 33 (`diff`, no output); the prompt equals 3.1; `scene-builder.test.ts` equals 3.4.
- `git diff --stat ddb608c main`: no change under `apps/api/src/modules/tool-registry/`, in `modules/genre-packs.md`, in `units/GNP-15-scene-builder.md`, in `package.json` or in `package-lock.json`. Changed: `packages/contracts/src/project-store/files.ts` and `apps/api/src/modules/project-store/files.service.ts` (project store), so step 1 builds the contracts again; `apps/api/test/packs/golden.kit.ts` (GNP-21's `enable` option, lines 78, 100, 179 to 187 and 263); `packages/packs/test/checks.ts` (three verbs after line 66); the recipe golden (one JSON line: GNP-16's `dialogue` and GNP-17's `plot_manager` catalogue lines).
- `packages/packs/test/checks.ts` on main: `PACKS = ['core', 'nonfiction', 'fiction']` line 32, so the first draft is still `cold_open` (core has no draft tool; `cold_open` sorts before `comparison_set`); `VERBS` lines 48 to 70; `drafts` line 100; D8 comment line 180; `checkCommonInputs` lines 195 to 224; `checkDescription` line 239; `checkRemix` line 264. `dialogue.yaml` lines 7 to 33 equal `cold_open.yaml` lines 7 to 33.
- `apps/api/test/packs/golden.kit.ts` on main: `PACKS_ROOT` line 30; `GOLDEN_ROOT` line 39; `UPDATE_GOLDENS` line 41; `GoldenRunOptions.invalidWithout` line 75 and `userTool` line 76; `GoldenCaseOptions.check` line 101; `runGoldenCase` line 131; `goldenCase` lines 255 to 274. The `enable` option is optional; this plan does not pass it (the tool ships `enabled: true`).
- The recipe golden on main holds ten catalogue lines: `character_builder`, `cold_open`, `dialogue`, `mystery_question`, `myth_buster`, `numbers_to_people`, `plot_manager`, `propose_graph`, `throughline_check`, `world_builder`. GNP-21's three tools ship disabled and are not in it. The 3.6 line still goes between `propose_graph` and `throughline_check`.
- `packages/packs/fiction/tools/` on main: `character_builder.yaml`, `dialogue.yaml`, `plot_manager.yaml`, `world_builder.yaml`. `packages/packs/nonfiction/tools/` adds `comparison_set`, `named_concept`, `objection_handler` (GNP-21).
- The fiction sample on main (GNP-18): `examples/fiction/entities/veteran-keeper.md` (Tomas Vell, "he", keeps the lamp), `relief-keeper.md` (Ada Quill, "her"), `supply-boat-rule.md`, `lighthouse-island.md`, `book-style.md`. `scripts/eval-agent/cases/dialogue.json` and `plot-manager.json` name no entity ID.
- `e2e/specs/tools-preview.e2e.ts` on main: comment lines 20 to 22, `test.use({ viewport: { width: 1280, height: 3200 } });` line 23; `const target = await centerOf(personPicker);` line 209; `toHaveValue('ada')` line 213. On `unit/GNP-22` (`1efdf03`), line 23 is `test.use({ viewport: { width: 1280, height: 6000 } });` and no other line of the file differs (`git diff main...unit/GNP-22 -- e2e/specs`).
- Root `package.json` line 25: `"test": "npm test --workspaces && node --test 'scripts/*.test.mjs'"`. The e2e workspace's `test` is Vitest (the mock), not Playwright (`plans/DECISIONS.md` line 6870).
- Status of the related plans (front matter): GNP-14, GNP-16, GNP-17, GNP-18, GNP-20, GNP-21 `done`; GNP-22 `planned` (code on `unit/GNP-22`, review pending, `plans/DECISIONS.md` lines 6920 to 6928); PLT-23 `planned`.
- `plans/DECISIONS.md`: lines 6745 to 6750 (the PLAN DOES NOT WORK report: run 1 at load 3.09 failed one test, `apps/api` `test/tool-registry-save.test.ts` C1, ZodError; that file alone passed 11 of 11; run 2 at load 1.53 passed all); lines 6752 to 6756 (the NAVIGATOR question, options (a) to (d), no decision); lines 4543, 5077 to 5081, 5919, 6209 and 6219 (a root `npm test` failure outside the unit, followed by an exit 0 rerun on the same commit, accepted as the gate); lines 6892 to 6896 and 6924 (GNP-22's measured picker targets: 3767.4 at 3200 px alone; 3787.4 alone and 4057.4 in the four-spec run at 6000 px); line 6545 (GNP-14: y 2290, target 2302).

Unit and module, and the index:
- `units/GNP-15-scene-builder.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Spec lines 15 to 18; criteria at lines 21, 22 and 24. Line 23 is blank.
- `modules/genre-packs.md`: lines 22 (graph: GNP-15 under GNP-13), 33 (parallelism), 46 to 54 (template skeleton and draft rules), 56 to 64 (common inputs), 66 (entity inputs and kinds), 85 to 90 (testing principles, golden tests, sample checks, system seam, real models), 95 to 102 (out of scope).
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65 (inverse rule line 64); the phase row of `phase:fiction` at line 110; the ungated eval script AGL-25 at line 127; the testing convention, with "Real models are checked only by the Agent loop's manual eval script (AGL-25), never in CI", at line 141 (line numbers re-checked at `bbe7824`).
- Inverse rule: `units/GNP-19-fiction-gate.md` line 7 and `units/GNP-23-remix.md` line 7 each name GNP-15 in `blocked_by`, and no other unit does. `units/GNP-02-golden-harness.md` line 9 and `units/GNP-13-fiction-entity-types.md` line 9 name GNP-15 in `unblocks`. Symmetry: `parallel_with` of GNP-12 (line 8), GNP-14 (line 8), GNP-16 (line 8), GNP-17 (line 8) and GNP-18 (line 8) each name GNP-15.
- Transitivity (units/README.md line 64): GNP-15 is blocked by GNP-02 and GNP-13 only. GNP-18 is blocked by GNP-16, not by GNP-15, so no parallel pair is a dependency pair.

Blockers and the state of main at `985d6bc` (the draft; the revision 2 list above gives main now):
- Git: `HEAD` and `main` are `985d6bc`; `git status` is clean; `git merge-base --is-ancestor 7c4b8b3 HEAD` succeeds (GNP-14 is on main, `plans/DECISIONS.md` line 6598). No `unit/GNP-15` branch and no GNP-15 worktree exist.
- `packages/packs/fiction/tools/` holds `character_builder.yaml` and `world_builder.yaml` (GNP-14) and no `.gitkeep` (GNP-14 deleted it, `plans/GNP-14.md` section 3). No `scene_builder.yaml` exists, and `grep -rn scene_builder` over `packages`, `apps`, `e2e`, `scripts`, `plans` and `units` finds only `units/GNP-15-scene-builder.md` (checked).
- `packages/packs/test/golden/` holds `character_builder/`, `cold_open/`, `golden_probe/`, `mystery_question/`, `myth_buster/`, `numbers_to_people/`, `propose_graph/`, `throughline_check/` and `world_builder/`. No `scene_builder/`.
- `e2e/fixtures/mock-openai/scenarios/` holds `pack-character_builder.json`, `pack-cold_open.json`, `pack-golden_probe.json`, `pack-mystery_question.json`, `pack-myth_buster.json`, `pack-numbers_to_people.json`, `pack-propose_graph.json`, `pack-throughline_check.json` and `pack-world_builder.json`. No `pack-scene_builder.json`.
- `scripts/eval-agent/cases/` holds `character-builder.json`, `cold-open.json`, `mystery-question.json`, `myth-buster.json`, `numbers-to-people.json`, `summarize-outline.json`, `throughline-check.json` and `world-builder.json`. No `scene-builder.json`.
- `apps/api/test/packs/` holds `character-world-builder.test.ts` (GNP-14), `golden.kit.ts` (GNP-02) and the other packs tests. No `scene-builder.test.ts`.
- `packages/packs/nonfiction/tools/cold_open.yaml`: the five common inputs at lines 7 to 33 (`coreIdea` 7 to 12, `entityIds` 13 to 19, `styleProfile` 20 to 24, `length` 25 to 30, `tone` 31 to 33); `output: draft` line 46; prompt lines 48 to 75. The `person` input (lines 34 to 39) is the precedent for a single entity input with `x-scriba-entity-kinds`.
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` lines 35 to 41; `DESCRIPTION_LIMIT` line 44; `VERBS` lines 48 to 70; the promotion of `entity-kind` warnings to errors lines 85 to 98; `drafts` line 100; `checkCommonInputs` lines 195 to 224; `checkDescription` lines 239 to 260; `checkRemix` from line 264, active only when `core/tools/remix.yaml` exists (line numbers of main `bbe7824`).
- `packages/packs/test/real-packs.test.ts`: `it('the suite passes on the real packs')` at line 9; it asserts no error from `lintPacks` and `contentChecks(REAL_PACKS)` equal to `[]`.
- `scripts/lint-packs.mjs` line 73: `process.exitCode = main()`.
- `packages/packs/fiction/entity-types/character.yaml` line 2 (`kind: character`); `packages/packs/core/entity-types/style-profile.yaml` (the style kind, as the fixture of `cold_open` uses `type: style-profile`).

Code on main:
- `apps/api/src/modules/tool-registry/executor.service.ts`: `OUTPUT_SYSTEM_MESSAGES` lines 31 to 40 (`draft:` at line 32, `entity:` at line 34); the entity-kind check lines 136 to 151; `sources` lines 159 to 161 (`!ref.style`); the render with `args`, `entities` and `toolCatalog` from line 166 on.
- `apps/api/src/modules/tool-registry/validate.ts`: `for (const field of fields)` at line 110; entity refs pushed with `style: field.isStyle` at lines 119 to 123; the return at line 135.
- `apps/api/src/modules/tool-registry/inputs.ts`: `readInputs` at line 147 returns the properties in property order, `Object.entries(properties)`, lines 146 to 157. `validate.ts` line 57 sets `const fields = readInputs(spec)`, so the entity refs of line 110 are collected in property order, and `sourcesUsed` (executor lines 159 to 161, `unique` keeps the first order) is `entityIds` in argument order, then `pov` (was assumption A2; checked by the reviser).
- `apps/api/test/packs/golden.kit.ts` line 41 reads `SCRIBA_UPDATE_GOLDENS`, which `apps/api/vitest.config.mts` lines 10 to 13 set from `--update-goldens` in the arguments; `goldenCase` (lines 255 to 274) asserts `result.invalid.message` contains `invalidWithout`. The Ajv lead line (`validate.ts` line 223) names the tool, not the field, so the text `pov` comes only from the field line.
- `apps/api/src/modules/tool-registry/template.ts`: `{{entity id}}` with a field id at lines 280 to 282; the catalogue line format at lines 556 to 567 (ports as `name (type, single|list, required|optional)`, then `- name: description Output: kind. Inputs: ...`).
- `apps/api/src/modules/tool-registry/catalog.service.ts` line 467: `for (const name of [...names].sort())`.
- `apps/api/test/packs/golden.kit.ts` (line numbers of main `bbe7824`): `PACKS_ROOT` line 30; `GOLDEN_ROOT` line 39; `UPDATE_GOLDENS` line 41; `GoldenRunOptions.invalidWithout` line 75 and `userTool` line 76; `GoldenCaseOptions.check` line 101; `runGoldenCase` line 131; `goldenCase` lines 255 to 274 (asserts status, kind, `sourcesUsed`, 422, `TOOL_ARGS_INVALID`, the message containing `invalidWithout`, and one model call, then the `check`).
- `apps/api/test/packs/character-world-builder.test.ts`: the `renderedPrompt` helper at lines 5 to 21 (the comment starts at line 4); `goldenCase` bodies at lines 23 and 39; the `it` at line 55 with timeout 120000.
- `scripts/eval-cases.test.mjs`: `CASE_KEYS` line 14; the first test at line 34, which reads every case file and checks its keys, its `reason` and its `citations` if present; the second test at line 65.
- `scripts/eval-agent/run.mjs`: `CASE_KEYS` line 36 (`sample`, `intent`, `expect`).
- `scripts/eval-case-character-world-builder.test.mjs` (GNP-14, on main): one `test` that reads `character-builder.json` and `world-builder.json` and asserts their exact keys and values; it runs no model.
- `e2e/specs/tools-editor.e2e.ts`, `tools-live-preview.e2e.ts`, `tools-try.e2e.ts`: the `/tools` specs; none of the count assertions found by `grep` (`toHaveCount`) counts tool rows.
- The recipe golden `packages/packs/test/golden/propose_graph/recipe.golden.json`: its ten catalogue lines on main are in the revision 2 list above. The story golden holds no catalogue (`plans/GNP-14.md` section 2).
- The description length: `node -e` counts 85 characters for the U2 text.

Plans and DECISIONS:
- `plans/GNP-14.md` (done, on main): section 3 (its files); line 462 (GNP-15 adds one catalogue line and one scenario, fixture, golden, test and eval case); line 466 (3200 px leaves room for three more fiction rows); lines 479 and 480 (the `.gitkeep` and the `scripts/eval-agent/cases/` rule).
- `plans/GNP-12.md` (done): line 3 `status: done`; its file table (lines 65 and 66) names only `units/GNP-12-workhorses-gate.md` and `plans/GNP-12.md`. No path in common with this plan.
- At `985d6bc` no plan file existed for GNP-16, GNP-17 or GNP-18. At `bbe7824` all three are `done` (revision 2 list above).
- `plans/DECISIONS.md`: line 5144 (the kinds of `entityIds`, module line 66 reworded); lines 5219 to 5222 (the Navigator's data-only reading of the eval-data criterion); lines 5255 to 5259 (the criterion 4 precedent of GNP-12: an unticked box while a model server is absent); line 5949 ("TRG-05 C2 is not weakened", the viewport rule of TRG-14); line 6545 (the GNP-14 picker at y=2290); line 6587 (GNP-14 choice C12, 3200 px); line 6547 (the root `npm test` times out in `apps/web` `canvas-page.spec.ts` under load); lines 6598 to 6604 (GNP-14 merged).

### Facts assumed

- **A1.** Node 26 and npm 11 are on the PATH, as the other plans state. Step 1 checks it.
- **A2.** Moved to the checked facts by the reviser (`readInputs`, `inputs.ts` line 147; `validate.ts` line 57). Step 8 still asserts the exact `sourcesUsed`.
- **A3.** A `{{#if x}}` block leaves out its text when `x` is absent, as `cold_open`'s prompt relies on (`cold_open.yaml` lines 52 to 55). Step 7 reads the golden.
- **A4.** The rendered prompt holds each entity's ID for `{{entity this}}` and for `{{entity field}}`. The GNP-14 test relies on the same rendering (`character-world-builder.test.ts` line 23 onward). Step 7 checks it.
- **A5.** The lint rules D2 and D3 act as `plans/GNP-14.md` states (`lint.ts` lines 496 and 817, not re-read here). Step 3 checks them.
- **A6.** `lint:packs` and `npm test -w @bbartolome/scriba-packs` run from main as the other plans describe (`package.json` line 28; `packages/packs/package.json` line 7). Step 1 checks them.
- **A7.** Prettier accepts the YAML block scalar and the JSON files as written. Steps 2, 4, 5 and 10 check it.
- **A8.** The browser can run the `/tools` e2e specs here (GNP-22 ran them on 2026-11-20). If not, step 15 records "e2e not run".
- **A9 (revision 2, estimate updated in revision 3).** With line 23 at 6000 px, each logged picker target of step 15 is below y 5000. GNP-22 measured y 3787.4 alone and 4057.4 in the four-spec run on its branch (the extra 270 px were the two user rows that PLT-23 now removes). With this unit's one row (about 133 px) on main `fdfd4fb`, the estimate is about y 3920 alone and in the four-spec run. Step 15 measures it; at or above 5000 is a PLAN DOES NOT WORK report.
- **A10 (revision 2).** The rebase of step 0 conflicts only in `packages/packs/test/golden/propose_graph/recipe.golden.json`. Step 0 checks it; any other conflict stops the implementer.

## 3. Files to change

Only the paths below change, with the content of 3.1 to 3.6. `plans/GNP-15.md` is not changed by the implementer. The first six rows are already in `f3ccbf2` on `unit/GNP-15` (the recipe golden is made again after the rebase, step 9); the two eval files are in the worktree, untracked, and are rewritten from 3.5 (step 10).

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

Not changed: every file under `packages/packs/{core,nonfiction}/`; `packages/packs/fiction/{entity-types,tools/character_builder.yaml,tools/world_builder.yaml}`; `packages/packs/package.json`; `packages/packs/test/*.ts` and `packages/packs/test/README.md`; `packages/packs/test/golden/propose_graph/story.*`; `packages/packs/test/golden/**` other than `scene_builder/` and `propose_graph/recipe.golden.json`; every other tool spec under `packages/packs/fiction/tools/`; `apps/api/src/**`; `apps/api/test/packs/golden.kit.ts` and the other packs tests; `apps/api/vitest.config.mts`; `apps/api/test/packs/propose-graph.test.ts`; `packages/contracts/**`; `e2e/specs/**` (line 23 of `tools-preview.e2e.ts` is already 6000 px on main, C10); `e2e/fixtures/mock-openai/server.mjs`; `scripts/eval-cases.test.mjs`; `scripts/eval-agent/run.mjs`, its README and its test; `examples/**` (GNP-18's, done); `package.json`; `package-lock.json`; `.prettierignore`; `units/**`; `modules/**`; `plans/**` (this file belongs to the planner; the implementer does not change it).

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
  "intent": "Draft the scene for my lighthouse story where the relief keeper tells the veteran keeper that the supply boat is late again, from her point of view.",
  "expect": {
    "reason": "completed",
    "tools": ["scene_builder"]
  }
}
```

The file in the worktree has the revision 1 intent; step 10 writes the text above over it.

`scripts/eval-case-scene-builder.test.mjs`: the imports and the `CASES` path helper of `scripts/eval-case-character-world-builder.test.mjs` (GNP-14), with the comment line changed to name this case. One `test(...)` with the name in section 5 (criterion 3). It reads `scene-builder.json` and asserts: the keys are exactly `expect`, `intent`, `sample`; the keys of `expect` are exactly `reason`, `tools`; `sample` is `fiction`; `intent` is a non-empty string; `expect.tools` is `["scene_builder"]`; `expect.reason` is `completed`. It runs no model.

### 3.6 The catalogue line in the recipe golden

After the update run (step 9) the recipe golden must contain exactly one new line, placed between `- propose_graph:` and `- throughline_check:`:

`- scene_builder: Draft a scene from its goal, conflict and outcome from one character's point of view. Output: draft. Inputs: coreIdea (text, single, required); entityIds (entity, list, optional); styleProfile (style, single, optional); sceneNotes (text, single, optional); pov (entity, single, required).`

The format is `template.ts` lines 556 to 567; the ports are listed in property order and only the ports (no params), as the ten catalogue lines on main show (for example the `cold_open` line). If the line is absent after the run, the tool is not valid (a lint error or an unloaded spec): stop and report.

## 4. Procedure

Run in the worktree `/Users/bbartolome/workspace/scriba-prototype-wt/GNP-15` on branch `unit/GNP-15` (the orchestrator's worktree; the branch exists, so no `-b`). Record `node -v` and `npm -v` beside each result. Do not push. Do not use `git add -A` or `git commit -a`.

0. **Rebase onto main (A10).** Before: `git branch --show-current` prints `unit/GNP-15`; `git log --oneline main..HEAD` lists `f3ccbf2` (and no other commit, or only later `GNP-15` commits of an earlier implementer); `git status --short` lists only `?? scripts/eval-agent/cases/scene-builder.json` and `?? scripts/eval-case-scene-builder.test.mjs`, or nothing. Then `git rebase main`. If it stops with a conflict in `packages/packs/test/golden/propose_graph/recipe.golden.json` only: `git checkout --ours -- packages/packs/test/golden/propose_graph/recipe.golden.json` (in a rebase, "ours" is main's side), `git add -- packages/packs/test/golden/propose_graph/recipe.golden.json`, `GIT_EDITOR=true git rebase --continue`. Step 9 makes this file again. If any other file conflicts: `git rebase --abort`, and stop and report the conflict. After: `git merge-base --is-ancestor main HEAD` exits 0; `git diff --name-only main HEAD` lists exactly `apps/api/test/packs/scene-builder.test.ts`, `e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json`, `packages/packs/fiction/tools/scene_builder.yaml`, `packages/packs/test/golden/scene_builder/lamp-room.fixture.json` and `packages/packs/test/golden/scene_builder/lamp-room.golden.json` (and `propose_graph/recipe.golden.json` only if git merged it without a conflict; then step 9 checks it against main all the same). `test ! -e packages/packs/fiction/tools/.gitkeep` exits 0.
1. **Runtime and baseline (A1, A6).** `node -v` prints `v26.x` and `npm -v` prints `11.x`. Run `npm ci` if the worktree has no `node_modules/`, or if `git diff --quiet ddb608c HEAD -- package-lock.json` fails. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs` exits 0 (the contracts changed on main since `ddb608c`, so they are built again).
2. **Tool spec (U1 to U4, M1 to M5, C2, C4, C5).** `packages/packs/fiction/tools/scene_builder.yaml` is in the tree from `f3ccbf2`. It equals the text of 3.1: write 3.1 to a file outside the repository, run `npx prettier --write` on that copy, and `diff` it with the tracked file prints nothing. If the file is missing, create it from 3.1 and run `npx prettier --write` on it. The prompt block must equal 3.1 after prettier (A7); if prettier changed it, keep prettier's form and record the change.
3. **Pack gate (criterion 1; M1, M2, D2, D3, A5).** `npm run lint:packs` exits 0 and prints no finding that names `scene_builder`. Then `npm test -w @bbartolome/scriba-packs` exits 0, and "the suite passes on the real packs" passes.
4. **Fixture (M6, C6).** `packages/packs/test/golden/scene_builder/lamp-room.fixture.json` equals 3.2 after prettier (checked as in step 2). If missing, create it from 3.2 and run `npx prettier --write` on it.
5. **Scenario (M6).** `e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json` equals 3.3 after prettier (checked as in step 2). If missing, create it from 3.3 and run `npx prettier --write` on it.
6. **Golden test (criterion 2; C1, C3, C7).** `apps/api/test/packs/scene-builder.test.ts` is as section 3.4 describes. If missing, create it.
7. **Update run (A2, A3, A4, M6).** `cd apps/api && npx vitest run test/packs/scene-builder.test.ts -- --update-goldens` exits 0 and writes `packages/packs/test/golden/scene_builder/lamp-room.golden.json`. Then `npx prettier --write packages/packs/test/golden/scene_builder`. `git diff --quiet -- packages/packs/test/golden/scene_builder` should exit 0 (the golden of `f3ccbf2` is the same request); if it does not, record the diff. Read the file. `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft` (`executor.service.ts` lines 32 and 33). `messages[1].content` contains the lines `Core idea: Waiting can be a way of hoping.`, `Goal: Get Ivo to agree to light the lamp alone.`, `Conflict: Ivo insists that the boat will come.`, `Outcome: Mara lights the lamp herself.`, `Scene notes: Night.`, `Length: 600 words.` and `Tone: spare.`; it contains each of `mara-quill`, `ivo-renn`, `skerry-light` and `plain-spoken`, the text `[@id]` and the text `TK`; and it contains no `{{`.
8. **Compare run (criterion 2).** `cd apps/api && npx vitest run test/packs/scene-builder.test.ts` exits 0 with one test passed. `goldenCase` asserts that the golden is `match`, the kind is `draft`, `sourcesUsed` is exactly `["ivo-renn", "skerry-light", "mara-quill"]` (A2), the call without `pov` returns 422 with `TOOL_ARGS_INVALID` and a message that contains `pov`, and one model call was made.
9. **Catalogue of the propose_graph recipe golden (M7, C9, 3.6).** `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens` exits 0. Then `npx prettier --write packages/packs/test/golden/propose_graph/recipe.golden.json`. `git diff --name-only main -- packages/packs/test/golden` lists the two `scene_builder` files and `propose_graph/recipe.golden.json` and nothing else. Parse main's file (`git show main:packages/packs/test/golden/propose_graph/recipe.golden.json`) and the working copy as JSON in `node -e`, without writing a file. `messages[0]` is equal in both. In `messages[1].content`, the two strings differ by exactly one inserted line, the text of 3.6, after `- propose_graph:` and before `- throughline_check:`. Everything else is equal. If anything else differs, stop and report it. `git diff --quiet main -- packages/packs/test/golden/propose_graph/story.golden.json` exits 0. Then `cd apps/api && npx vitest run test/packs` exits 0 (every packs golden case, without the update flag).
10. **Eval data and its test (criterion 3; C1, C8; M8).** Write `scripts/eval-agent/cases/scene-builder.json` and `scripts/eval-case-scene-builder.test.mjs` as section 3.5 describes, over the untracked files of the worktree. Then `npx prettier --write` on both. `node --test scripts/eval-case-scene-builder.test.mjs` exits 0 with one test passed. `node --test scripts/eval-cases.test.mjs` exits 0 with its two tests passed.
11. **Format check (A7).** `npx prettier --check packages/packs/fiction/tools packages/packs/test/golden apps/api/test/packs scripts/eval-agent/cases scripts/eval-case-scene-builder.test.mjs e2e/fixtures/mock-openai/scenarios` exits 0. If a golden fails it, stop and report: the fix is a decision for the Navigator, not for this unit.
12. **Commit part 2.** `git add -- packages/packs/test/golden/scene_builder packages/packs/test/golden/propose_graph/recipe.golden.json scripts/eval-agent/cases/scene-builder.json scripts/eval-case-scene-builder.test.mjs` and any file of steps 2 to 6 that was created or changed there. `git diff --cached --name-only` lists only paths of section 3, and no `plans/`, `units/` or `e2e/specs/` file. Commit with `feat(GNP-15): scene_builder catalogue line and eval case`. If nothing is staged, make no commit.
13. **The viewport line of `tools-preview.e2e.ts` (M9, C10; open point 2).** Read line 23 of `e2e/specs/tools-preview.e2e.ts`. It is `test.use({ viewport: { width: 1280, height: 6000 } });` (main's line, GNP-22). Change nothing and record it. `git diff --name-only main HEAD -- e2e/specs` prints nothing. If line 23 is any other text, stop and report it.
14. **Builds, lint and the root `npm test` gate (open point 3; the Navigator decision of 2026-11-20, option (b)).** These run on the last commit of the branch, after step 12. `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0 (the build type-checks the new test file). From the root: `npm run build`, `npm run lint` and `npx prettier --check .` exit 0. Then the root `npm test` on the committed tree (`git status --short` prints nothing), with `uptime` recorded before each run:
    - Run 1 exits 0: the gate is met.
    - Run 1 exits non-zero: list every failing test and its file. If a failing test is in a file that `git diff --name-only main HEAD` lists, or in `apps/api/test/packs/`, or `packages/packs/test/`, or `scripts/eval-case*.test.mjs`, the failure may come from this unit: stop and report it with the output. Otherwise run each failing file alone and record the result. Then run the root `npm test` again on the same commit, with no change to any file in between (at most two reruns; wait for a lower load average if other suites are running). The gate is met when a rerun exits 0. If both reruns fail, or the same test fails in all three runs, stop and report the three outputs and load averages.
    - Never change a test, a timeout, a config or a script to make a run pass. The report gives every run: exit code, failing tests, load average and log path.
15. **The `/tools` specs in the running app (M9, C10, A9; open point 2).** With port 8080 free, add one temporary line `console.log('C2 target', JSON.stringify(target));` just after `const target = await centerOf(personPicker);` (line 209). Run `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts --trace off`, then `npm run e2e -w @bbartolome/scriba-e2e -- tools-editor.e2e.ts tools-live-preview.e2e.ts tools-preview.e2e.ts tools-try.e2e.ts --trace off`. Remove the temporary line; `git status --short -- e2e` prints nothing. Expected: the spec alone 2 passed; the four-spec run all passed, with TRG-05 C2 passing in both, and each logged target y near 3920 (A9). Record the counts, the two logged targets and the viewport (1280 by 6000). If a logged target y is at or above 5000, or C2 fails, stop and report PLAN DOES NOT WORK with the numbers. If another test fails, report it with the failing line. If the browser cannot run, record "e2e not run".
16. **Final check.** `git status --short` prints nothing. `git diff --name-only main...HEAD` lists only paths of section 3. `git log --oneline main..HEAD` shows only commits whose messages contain `GNP-15`. Do not push.
17. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 5 holds.

## 5. Acceptance criteria and tests

The criteria text is copied from `units/GNP-15-scene-builder.md` lines 21, 22 and 24. Each criterion has exactly one test. No other test is added.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "Passes `npm run lint:packs` and the content-check suite." (21) | `packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs" (existing, line 9; the same test for the same criterion in `plans/GNP-14.md` section 5, criterion 1) | `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (steps 1 and 3) | Both exit 0. The test asserts no error from `lintPacks` and an empty `contentChecks` on `packages/packs`. Over the real folders, that holds the five-input identity (checks.ts lines 195 to 224), the description rule (lines 239 to 260) and the entity-kind promotion (lines 85 to 98) for `scene_builder`. |
| "Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error." (22) | `apps/api/test/packs/scene-builder.test.ts`, "AC 2: the scene_builder golden case matches, its prompt holds each input entity with its ID and the citation and placeholder instructions, its output is a draft with the expected sourcesUsed, and invalid arguments return an Ajv error that names pov" | `cd apps/api && npx vitest run test/packs/scene-builder.test.ts` (steps 7 and 8) | One `it`, timeout 120000. The golden is `match` (`written` in the update run). The kind is `draft`. `sourcesUsed` is exactly `["ivo-renn", "skerry-light", "mara-quill"]`, which excludes `plain-spoken`. The call without `pov` returns 422 with `TOOL_ARGS_INVALID` and a message that contains `pov`, with one model call. The `check` finds `mara-quill`, `ivo-renn`, `skerry-light`, `plain-spoken`, `[@id]` and `TK` in the rendered user message. |
| "A manual eval case (small and larger local model) is added to the Agent loop's eval script data." (24) | `scripts/eval-case-scene-builder.test.mjs`, "AC 3: the scene-builder eval case is in the eval data and uses the documented keys and values" | `node --test scripts/eval-case-scene-builder.test.mjs` (step 10), and `node --test scripts/eval-cases.test.mjs` (existing, reads every case) | The file `scene-builder.json` exists in `scripts/eval-agent/cases/`. Its keys are exactly `expect`, `intent`, `sample`; the keys of `expect` are exactly `reason`, `tools`; `sample` is `fiction`; `intent` is non-empty; `expect.tools` is `["scene_builder"]`; `expect.reason` is `completed`. The real-model run with a small and a larger local model is not part of the criterion (the Navigator's data-only reading, `plans/DECISIONS.md` lines 5219 to 5222); it is recorded as not run (open point 1). |

## 6. Agreement with the downstream units and the parallel plans

**Downstream.**

- **GNP-19 (fiction gate; `blocked_by` line 7 names GNP-15).** Its criterion (`units/GNP-19-fiction-gate.md` line 20): "All five tools pass the validation suite; every entity input names an existing entity type." This plan gives it `scene_builder` enabled, output `draft`, and `pov` with kind `character`, which is shipped (`character.yaml` line 2). It runs the check of criterion 1 here. This plan gives GNP-19 nothing else. Agrees.
- **GNP-23 (remix; `blocked_by` line 7 names GNP-15).** Its `targetShape` enum must list every shipped draft tool except `remix` (`units/GNP-23-remix.md` line 16; `checkRemix` in `checks.ts` from line 264, which counts only `output: draft`). Once this unit is on main, `scene_builder` is a shipped draft tool, so GNP-23's enum must contain `scene_builder`. This plan keeps `output: draft` (unit line 15), so the enum entry is stable. GNP-23 writes the enum; this plan writes nothing in it. Agrees.
- **Inverse rules.** `unblocks: [GNP-19, GNP-23]` (unit line 9) is the exact inverse of their `blocked_by` (lines 7). GNP-02 (line 9) and GNP-13 (line 9) list GNP-15 in `unblocks`. Agrees.
- **The module's dependency graph (line 22) and parallelism (line 33)** place GNP-15 under GNP-13 with GNP-14, GNP-16 and GNP-17. Agrees.

**Parallel units and their plans.**

- **GNP-14, GNP-16, GNP-17, GNP-18 and GNP-21 (all `done`, on main).** Their changes to the shared files are the base after step 0: the recipe golden holds the `character_builder`, `world_builder`, `dialogue` and `plot_manager` lines (GNP-21's tools ship disabled and add none); `packages/packs/fiction/tools/.gitkeep` is gone; the scenario and eval-case folders hold their files; `golden.kit.ts` has GNP-21's optional `enable` option, which this plan does not use; `checks.ts` has GNP-21's three verbs (this plan's verb `draft` was already there). `dialogue.yaml` repeats the five common inputs of `cold_open.yaml` (`diff` of lines 7 to 33, no output), so the M1 identity holds with this tool too. This unit's catalogue line goes in at its sorted place; the rebase conflict on the one JSON line of the recipe golden is resolved by main's file plus the update run (step 0, step 9; `plans/GNP-02.md` D18). Agrees.
- **GNP-12 (`plans/GNP-12.md`, done).** Its file table (lines 65 and 66) names only `units/GNP-12-workhorses-gate.md` and `plans/GNP-12.md`. No path in common. Agrees.
- **GNP-22 (`plans/GNP-22.md`, done, on main at `6939e66`).** Nine nonfiction draft tools shipped disabled, with goldens, scenarios, eval cases and two tests (`packages/packs/test/tier2-3-shapes.test.ts`, `apps/api/test/packs/tier2-3-shapes.test.ts`); it did not change the recipe golden (its G4), and its pack test asserts `enabled: false` for its nine tools only. It set `tools-preview.e2e.ts` line 23 to the 6000 line (`aee3cd4`), which this plan keeps and does not change (C10, step 13). Its rows are part of the base after step 0; step 15 measures the picker with them (A9, about y 3920). Agrees.
- **PLT-23 (`plans/PLT-23.md`, done, on main).** It reworded the comment lines 20 to 22 of `tools-preview.e2e.ts` and added an `afterAll` to `tools-editor.e2e.ts` that removes the user tools it saves, so the four-spec run has no extra rows. This plan changes neither file. Agrees.
- **GRR-15 (planned; `unit/GRR-15`).** Its branch changes only `apps/web/src/app/features/graph-runner/*` and `e2e/specs/graph-{large,theme,touch}.e2e.ts`; `graph-large.e2e.ts` builds 150 `cold_open` nodes and counts nodes, not tools. No path in common, in either merge order. CEX-14, SHL-17 (done) and SHL-14 share no path either. Agrees.
- **Unit file check (not fixed here).** `units/GNP-15-scene-builder.md` line 23 is blank between the checkbox of criterion 2 (line 22) and that of criterion 3 (line 24). This is cosmetic: the three items are still checkboxes under the heading, as `units/README.md` lines 51 to 57 describe. Otherwise the unit agrees with `modules/genre-packs.md` (the skeleton, the five common inputs, the entity kind of `pov`, the output kind, the eval-case and golden rules) and with `units/README.md` (the front matter, the blocker and `parallel_with` symmetry, the inverse of `unblocks`, the phase row). One point reads as ambiguous rather than inconsistent: the unit does not say whether `goal`, `conflict` and `outcome` are required; this plan treats them as optional (C2).

## 7. Open points

None open. Point 3 is settled by the Navigator decision of 2026-11-20; points 1 and 2 change no criterion text, settled module decision or unit file.

1. **Who carries the real-model run of the scene case. Settled: no carrier is needed for this unit; record "not run".** Criterion 3 asks that the case "is added to the Agent loop's eval script data". Under the Navigator's data-only reading of the same criterion text (`plans/DECISIONS.md` lines 5219 to 5222, option a), the criterion is met when the case is in the data and the data test passes. The implementer report records the real-model run as "not run: no local model server", as GNP-14, GNP-16, GNP-17 and GNP-21 did for the same criterion text (`plans/DECISIONS.md` line 6602 for GNP-14). The fiction sample (GNP-18) is on main now, so a person with a local model server can run the case with `scripts/eval-agent/run.mjs`. Module line 90 and `units/README.md` line 141 put real models in the manual eval script and never in CI; neither makes this unit run the case.

2. **The `/tools` e2e specs and the person picker. Settled: this unit changes no e2e file, because main already has line 23 of `tools-preview.e2e.ts` at 6000 px (GNP-22, `aee3cd4`; C10, step 13).** At 3200 px the picker would have been below the viewport (GNP-22 measured y 3767.4 with its nine rows, `plans/DECISIONS.md` lines 6892 to 6896). At 6000 px, with this unit's row and without the user rows that PLT-23 removes, the estimate is about y 3920 (A9). No step, assertion, wait or drag of TRG-05 C2 changes (M9). Step 15 measures the targets; at or above y 5000, or a C2 failure, is a PLAN DOES NOT WORK report with the numbers.

3. **The root `npm test` gate after a failure outside this unit (the question of `plans/DECISIONS.md` lines 6752 to 6756). Settled by the Navigator on 2026-11-20: option (b), a rerun of the unchanged commit (entry "GNP-15 — Navigator decision: the root `npm test` gate after an unrelated intermittent failure"; step 14).** The report of 2026-11-19 (lines 6745 to 6750): run 1 at load 3.09 failed one test, `apps/api` `test/tool-registry-save.test.ts` "C1: save on a built-in writes the user-pack file and never touches the packs root" (ZodError: `tools` undefined), a file that this unit does not change; that file alone passed 11 of 11; run 2 at load 1.53 passed everything. Step 14 states the Navigator's rule: if run 1 exits non-zero, list every failing test and its file; a failing file in `git diff --name-only main HEAD`, `apps/api/test/packs/`, `packages/packs/test/` or `scripts/eval-case*.test.mjs` stops the implementer with a report; otherwise each failing file is run alone and recorded, and the root `npm test` is run again on the same commit with no file changed (at most two reruns, `uptime` before each run); the gate is met when a rerun exits 0; two failed reruns, or the same test failing in all three runs, stop the implementer with the three outputs and load averages. No test, timeout, config or script changes. The flaky test is not added to any tolerated list; its fix on main is separate and not part of this unit.

## Review parts

- **Part 1 — the tool spec, the golden case and the catalogue.** Steps 0 to 9. Tests: criterion 1 (`packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs", with `npm run lint:packs`; step 3) and criterion 2 (`apps/api/test/packs/scene-builder.test.ts`, the AC 2 test; steps 7 and 8). Files: `packages/packs/fiction/tools/scene_builder.yaml`, `packages/packs/test/golden/scene_builder/lamp-room.fixture.json`, `packages/packs/test/golden/scene_builder/lamp-room.golden.json`, `packages/packs/test/golden/propose_graph/recipe.golden.json`, `e2e/fixtures/mock-openai/scenarios/pack-scene_builder.json`, `apps/api/test/packs/scene-builder.test.ts`. The reviewer checks: that the code changes only the files of section 3; the spec against 3.1 (the five common inputs byte for byte against `cold_open.yaml` lines 7 to 33); the fixture and scenario against 3.2 and 3.3; the test against 3.4; the golden's content against step 7; that the branch is on main (step 0) and the recipe golden differs from main's by exactly the line of 3.6 (step 9).
- **Part 2 — the eval case, the viewport check, the gates and the `/tools` check.** Steps 10 to 17. Test: criterion 3 (`scripts/eval-case-scene-builder.test.mjs`, the AC 3 test; step 10). Files: `scripts/eval-agent/cases/scene-builder.json`, `scripts/eval-case-scene-builder.test.mjs`. The reviewer checks: the case (with the revision 2 intent) and its test against 3.5 and C8; that the branch changes no e2e file (line 23 of `tools-preview.e2e.ts` stays main's 6000 line) and no temporary log line is committed (steps 13 and 15); the step 14 gate as the Navigator decision of 2026-11-20 sets it (every root `npm test` run with exit code, failing tests and load average, and an exit 0 on the last commit, by run 1 or by a rerun of the unchanged commit); the step 15 result (counts, TRG-05 C2 passing, both logged targets below y 5000) or "e2e not run"; the real-model run recorded as not run (open point 1).
