---
id: GNP-22
status: planned
module: genre-packs
milestone: M7
blocked_by: [GNP-02, GNP-06, GNP-12]
unblocks: [GNP-23, GNP-24]
---
# GNP-22 plan — nine tier 2–3 draft tools (shipped disabled)

Batch: [GNP-22] (Genre packs, phase:remaining-shapes, M7), a batch of one. Planner draft at main `5d7e0e3` (HEAD when read). Main moved to `8b174d3` before this plan was written, by documentation commits only (the GNP-21 revision at `e163977` and the reviser's READY at `8b174d3`, and a GNP-18 review entry in `plans/DECISIONS.md`); no code, unit or module file changed, so every code fact below holds at `8b174d3`. The unit file (34 lines) was read in full. The planner changed no file except this plan, committed nothing, and ran no build, install, test or npm command. Only read-only git and file reads were used.

Two findings shape the plan (the unit's text stays as it is). (1) The nine tools ship disabled, so their golden cases need the `enable` option that GNP-21 adds to the golden helper. This plan uses that option with GNP-21's contract, and handles either merge order (section 4, step 3). (2) The `/tools` list grows by nine rows, the largest growth in this phase, and the e2e spec `tools-preview.e2e.ts` keeps its person picker inside a fixed viewport (assumption A7; open point 3).

The structure follows `plans/PLT-02.md`, with a section 2 for the facts checked and assumed, as `plans/GNP-21.md` has.

Revised by the Opus reviser at main `13ba93a` (the draft commit is `0277f22`; the later commits on main change only `plans/` files: GNP-18 done, SHL-23 planned, and the GNP-21 review record). The reviser re-checked the facts of section 2 against the files and made no unit change, no code change, and no change to a file other than this plan. No `unit/GNP-22`, `unit/GNP-23` or `unit/GNP-24` branch exists; `unit/GNP-21` exists and carries the `enable` option as C2 states it (APPROVED, `plans/DECISIONS.md` "GNP-21 — record review APPROVED"). `plans/DECISIONS.md` has no PLAN DOES NOT WORK report for GNP-22. Corrections: G2 now quotes GNP-21's C2 contract word for word, and step 3b also checks the README bullet, as GNP-21's step 0 does; open point 1 is closed; the root `npm test` does not run the Playwright suite (`e2e/package.json` `test` is `vitest run`), so step 13 runs the four `/tools` specs explicitly, and the claim that no browser is available is replaced by the GNP-18 run of 2026-11-20; A7 (GNP-21 calls the same fact A10) is decided: no e2e file changes, and a picker off screen is a PLAN DOES NOT WORK report with the measured position (open point 3); open points 6 and 8 are settled; section 8, the review parts, is new.

Revision 2 by an Opus reviser at main `494292f`, after the PLAN DOES NOT WORK report of 2026-11-20 at section 4 step 13 (`plans/DECISIONS.md`, "GNP-22 — PLAN DOES NOT WORK at section 4 step 13"). The reviser examined `unit/GNP-22` (base `a12af54`; commits `9758d0f`, `bf7d6c8`, `5ca387c`, `ed9a27e`, `f270600`): its 50 changed paths are exactly the paths of section 3 (rows 1 to 10), no `e2e/specs` file changed, and its `golden.kit.ts` and README edit is byte-identical to GNP-21's edit on main (`git diff a12af54..unit/GNP-22` and `git diff a12af54..main` of the two files are equal), so a rebase keeps one copy. Cause: with the nine rows, the TRG-05 C2 person picker centre is at y 3767.4 (x 346), and the ada chip centre at y 3161.6, in the fixed 1280 by 3200 viewport (spec alone). The chip sits at the bottom edge, the drag never starts, and the picker is off screen (A7). Correction: the reviser applies the rule that the earlier plans set for this spec and that open point 3 named as option (b): raise the height in `test.use` (line 23) only, to 6000 px (C6; new step 12a; step 13 measures and checks the margin). The assertions, the drag and the comment lines 20 to 22 do not change. No unit change, no criterion change and no change of a settled module decision (open point 3).

## 1. Decisions this plan follows

Labels: **U** = the unit file (line numbers); **M** = `modules/genre-packs.md` (line numbers); **G** = a settled decision of a done unit or plan, or a DECISIONS entry; **C** = a smaller choice made by this plan, recorded here and not in `plans/DECISIONS.md`.

- **U1 Tools.** Nine nonfiction tools: `contrast`, `profile`, `zoom`, `reader_challenge`, `framework_builder`, `method_first`, `timeline`, `flashback`, `stockdale_tension`. Each has output `draft`, `enabled: false`, the five common inputs and the extra inputs of its table row. Descriptions are copied verbatim. Source: U lines 14 and 16 to 26.
- **U2 Criteria.** Four (U lines 31 to 34). Each criterion has one test in section 5.
- **U3 No unit text is changed.** The planner changes no unit. Section 7 says no unit change is needed.
- **M1 Common inputs verbatim.** The five keys (`coreIdea`, `entityIds`, `styleProfile`, `length`, `tone`) are repeated verbatim on every draft tool, and the content suite checks identity against the first draft tool in pack order (M lines 56 to 64; `checkCommonInputs` in `packages/packs/test/checks.ts`). The first draft is `cold_open.yaml`: `core` holds no draft tool (`propose_graph` is `graph`, `throughline_check` is `check`), and `cold_open` sorts before each name of this unit.
- **M2 Entity hints.** `x-scriba-entity-kinds` only where the input means a definite kind (M line 66). `profile.person` takes `[person]` (the `person` block of `cold_open.yaml`), `framework_builder.claimIds` takes `[claim]` (U line 22). No hint on `entityIds`.
- **M3 Names and descriptions.** Lower snake_case tool names, camelCase input keys, a one-sentence description under 120 characters that starts with a verb (M lines 44 and 45; `DESCRIPTION_LIMIT` 120). The nine descriptions are 45 to 62 characters. Their first words are `Set`, `Paint`, `Move`, `Ask`, `Turn`, `Explain`, `Tell`, `Break` and `Face`, all in `VERBS` (checks.ts lines 48 to 67). So this plan changes no verb list (G3).
- **M4 Skeleton and template subset.** Each first draft follows the four-part skeleton: role line, material with IDs, shape steps, constraints (M lines 46 to 50). Only `{{field}}`, `{{#each}}`, `{{#if}}` and `{{entity X}}` are used (M line 46). Constraint 4 is the full draft text (M line 50).
- **M5 Output kinds and sourcesUsed.** `draft` is one of `OUTPUT_KINDS` (M line 52). `sourcesUsed` is the entity IDs of the entity inputs, de-duplicated, in property order, with style profiles left out (`executor.service.ts`, `prepare`, lines 159 to 161; `validate.ts` lines 108 to 135). Prompts never ask for sources (M line 51).
- **M6 Names are stable.** A tool name is an interface that the Remix enum lists (M line 44; GNP-23 section 6 below). Names here are final once merged.
- **M7 Testing.** Assert behaviour: the spec loads and validates; the request the mock recorded; the output kind and `sourcesUsed`; the function list and the callable tool. No wording assertions beyond golden snapshots (M lines 85 to 87). Unit tests do not name the `examples/` folder (M line 88). Manual eval cases go to the Agent loop's eval data, one case per tool (M line 90), so nine cases.
- **G1 Golden convention (GNP-02).** `goldenCase` (`apps/api/test/packs/golden.kit.ts` lines 241 to 259). Fixtures and goldens under `packages/packs/test/golden/<tool>/`. The scenario of a tool is `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`, because `runGoldenCase` calls `pack-${tool}` (golden.kit.ts line 142). A draft golden has no `tools` key (`packages/packs/test/README.md`).
- **G2 The `enable` option (GNP-21, `plans/GNP-21.md` section 1, C2, `status: planned` at `e163977`; DECISIONS "2026-11-20 — GNP-21 — plan revised", finding 2).** Owned by GNP-21. GNP-22 reuses it and adds no enable step and no second helper of its own. The contract, quoted word for word from GNP-21's C2: "`enable?: boolean` on both `GoldenRunOptions` and `GoldenCaseOptions`; absent or `false` changes nothing (every existing case is unchanged); `true` makes `runGoldenCase`, after the session cookie and before the valid execute call, post `{enabled: true}` to `TOOL_ENABLED_ROUTE` with `:name` replaced by `options.tool`, and assert status 200. The switch lives in the case's temporary library (settings section `tools`, `tool-switches.service.ts` lines 11 to 26), which is deleted in the `finally` block, so no other case and no shipped file sees it. The invalid call runs in the same app and library, so it also sees the tool enabled. The option works with `userTool` too (the switch is keyed by name). The README bullet of step 8 documents it. GNP-22's golden tests pass `enable: true` and add no enable step of their own." GNP-22's golden cases pass `enable: true`. The edit of step 3a is GNP-21's step 7 and 8, text for text; it is done only when GNP-21 is not on main (GNP-21's step 0 mirrors it for the other order). `unit/GNP-21` (`git diff main...unit/GNP-21 -- apps/api/test/packs/golden.kit.ts packages/packs/test/README.md`) has exactly this edit.
- **G3 Verb list (GNP-21, section 1, C3).** GNP-21 may add `coin`, `contrast` and `raise` to `VERBS`. This plan needs no verb change and removes none, so its results are the same in either merge order.
- **G4 Catalogue unchanged (GNP-21, C4).** `{{toolCatalog}}` renders only valid and enabled tools (`executor.service.ts`, the `toolCatalog` filter). The nine tools ship disabled, so `packages/packs/test/golden/propose_graph/*` does not change (step 12).
- **G5 Test file names (GNP-21, C1).** GNP-21 uses `tier2-shapes`. This plan does not use that name. It uses `tier2-3-shapes`.
- **G6 One test per criterion (GNP-14, C5; GNP-21, C11).** `goldenCase` returns the body of one `it`. The one test of criterion 2 awaits the nine bodies in turn. `apps/api/test/packs/character-world-builder.test.ts` does the same with two.
- **G7 Eval data reading (DECISIONS 2026-11-16, "reading of the eval-data criterion", lines 5219 to 5226; GNP-21, G7).** "Manual eval cases added" is met by the case in the eval data, with a passing data test. The real-model run is recorded as not run. This plan applies the same reading (open point 4). The entry names neither GNP-21 nor GNP-22; it is read because GNP-21 cites it for the same criterion.
- **G8 Unblocking (DECISIONS 2026-11-16, GNP-12 Navigator decision, line 5260).** GNP-22 is unblocked when GNP-12 closes, which has happened. It is the only DECISIONS entry that names GNP-22 (grep of `plans/DECISIONS.md`).
- **C1 Names (chosen here).** The case name is `basic` in every golden folder (one case per tool). Files: `basic.fixture.json`, `basic.golden.json`. Eval ids are the tool names in kebab case. Test files: `apps/api/test/packs/tier2-3-shapes.test.ts`, `packages/packs/test/tier2-3-shapes.test.ts`, `scripts/eval-case-tier2-3-shapes.test.mjs`. This is the simplest option: one case name, and the unit's slug without `draft`.
- **C2 The enable path test (AC 3).** It uses the enable override (the unit allows it; the copy-on-write user-pack copy is not used), the tool `contrast` (no entity input), the active project and the function list route (section 5, AC 3).
- **C3 Fixtures.** Entity IDs `notes-a`, `notes-b`, `person-a`, `claim-a` and `style-a`, each matching `^[a-z0-9][a-z0-9-]*$`. `claim-a` carries `evidence`, a required field of the shipped `claim` type (`packages/packs/nonfiction/entity-types/claim.yaml`; GNP-21 section 1 and its fixture). `style-a` has the banned phrase `game-changer`.
- **C4 Prompts and fixtures are first drafts.** The unit gives no shape steps (U line 28). Section 4 gives them. The author may tune them through copy-on-write (M line 54).
- **C5 Optional inputs.** `zoom.bigPicture` and `framework_builder.claimIds` are not in `required`. The unit's table gives them `[text]` and `[entity list, kind claim]`, without the word "required" that the other entries carry. Section 7, open point 6.
- **C6 The viewport of `tools-preview.e2e.ts` (revision 2; open point 3).** Line 23 becomes `test.use({ viewport: { width: 1280, height: 6000 } });`. Nothing else in the file changes. This is the rule of `plans/TRG-13.md` step 11, `plans/TRG-14.md` step 9 and GNP-14 C12 (DECISIONS "GNP-14 — Plan revised after the step 16 failure": raise the height in `test.use` only; no step, assertion or drag change), and the rule that GNP-15 open point 2 names for the next reviser. The value: the measured picker centre is 3767.4 with the nine rows, on a base without GNP-21's three rows, in the spec run alone. The rows still to come before the gate are GNP-21's three (on main now), GNP-15's one, GNP-23's `remix`, and the two user rows that `tools-editor.e2e.ts` leaves until PLT-23 lands: seven rows. An upper bound per row is 163 px: GNP-14 measured the picker at y 2302 alone with fewer rows (DECISIONS line 6545), so the nine rows moved it at most 3767 − 2302 = 1465 px. So the picker stays at or below about 3767 + 7 × 163 ≈ 4909, and 6000 leaves at least about 1090 px. The width stays 1280, and a portrait viewport at 1280 px is the CDK `Web` class at both heights (`device-class.ts` uses width and orientation only), so the layout class does not change.

## 2. Facts checked and facts assumed

### Checked (read-only, at main `5d7e0e3`; re-checked by the reviser at `13ba93a`)

Unit and module:
- `units/GNP-22-tier2-3-draft-shapes.md`, read in full: front matter lines 1 to 10 (`blocked_by` GNP-02, GNP-06, GNP-12; `unblocks` GNP-23, GNP-24; `parallel_with` GNP-19, GNP-20, GNP-21); the table at lines 16 to 26; the skeleton sentence at line 28; criteria at lines 30 to 34. No notes section and no change note.
- `modules/genre-packs.md`, read in full, with the lines cited in section 1 (line 7 says that Remix comes last because its `targetShape` enum lists every shipped draft tool).
- `units/README.md`: format and blocker notation (lines 34 to 65), conventions (lines 131 to 141).
- `plans/PLT-02.md`: the structure of this plan.
- Units whose `blocked_by` names GNP-22 (grep of the front matter): `units/GNP-23-remix.md` line 7 and `units/GNP-24-remaining-shapes-gate.md` line 7. The `unblocks` lists of GNP-02 (line 9), GNP-06 (line 9) and GNP-12 (line 9) name GNP-22, so the inverse holds. `plans/QUEUE.md` line 14 lists GNP-22 as available.

Plans:
- `plans/GNP-21.md`, read in its revised text, now committed at `e163977` with `status: planned` (799 lines; the reviser's READY is at `8b174d3`): section 1 (C1 to C12), section 4 (steps 0, 7 and 8), section 6 (the GNP-22 bullet) and section 7 (open points 1 to 8). Settled there: verb option (a); the `enable` contract of C2; step 0 for either merge order; one test per criterion (C11); the claim fixture with `evidence`. The DECISIONS entry "2026-11-20 — GNP-21 — plan revised (Opus reviser, READY)" says that GNP-22 reuses the option and adds no enable step or second helper, and that GNP-22's plan must be reconciled with the planned contract. This plan does both.
- Draft and planned plans (status from the front matter, re-read by the reviser at `13ba93a`): `plans/CEX-14.md` (draft), `plans/GNP-15.md` (draft; branch `unit/GNP-15`), `plans/GNP-21.md` (planned; branch `unit/GNP-21`, review APPROVED), `plans/GRR-15.md` (planned), `plans/PLT-23.md` (planned), `plans/SHL-23.md` (planned). `plans/GNP-18.md` is now done. A grep of the section 3 paths gives: GNP-15 changes `packages/packs/test/golden/propose_graph/recipe.golden.json` (its M7) and adds `scene_builder` files; it does not change `golden.kit.ts`, `checks.ts` or the packs README (its C7). GRR-15 reads `cold_open.yaml`. CEX-14 and SHL-23 name none of the paths. No other draft or planned plan changes a path of section 3.
- `e2e/specs/tools-preview.e2e.ts` (a path of this plan since revision 2, line 23 only): `plans/PLT-23.md` (planned; `unit/PLT-23` has no commit beyond main) changes its comment lines 20 to 22 only and does not change line 23 (its section 1: "Keep the viewport of tools-preview at 3200 px", because GNP-15 and GNP-16 rely on the margin). `plans/GNP-15.md` (draft, open point 2) changes no e2e file in its unit, and names the rule for a picker off screen: the reviser raises the height in `test.use` only (TRG-13 step 11, TRG-14 step 9, GNP-14 C12). `modules/genre-packs.md` line 89: "the Playwright e2e is unchanged; this module adds no e2e step". GNP-14, a unit of this module, raised the same line from 2100 to 3200 under that line with no unit change (DECISIONS "GNP-14 — Plan revised after the step 16 failure"), so a height change of the existing spec, with no new step and no new assertion, is read as within it.
- Revision 2: `unit/GNP-22` at `f270600` changes the 50 paths of section 3 and no `e2e/specs` file; line 23 of the spec on the branch and on main `494292f` is `test.use({ viewport: { width: 1280, height: 3200 } });`. GNP-21 is on main (`4178985`), with three nonfiction rows. `apps/web/src/app/shell/device-class.ts` lines 63 and 100 to 101 use the CDK `Handset`, `Tablet` and `Web` breakpoints, which test width and orientation only. A git test of two branches that change lines 20 to 22 and line 23 of one file gives a rebase conflict in either order (adjacent hunks).
- The root `npm test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'` (`package.json` line 25), and the `e2e` workspace's `test` script is `vitest run` (`e2e/package.json` line 8). So the root `npm test` does not run Playwright; `npm run e2e -w @bbartolome/scriba-e2e` does (line 10).
- A browser runs here: the GNP-18 review record of 2026-11-20 (`plans/DECISIONS.md`) gives an e2e run with 20 passed and 4 failed, the four (history-phone, journey, review-phone, search-phone) identical to the main baseline and owned by PLT-23 and SHL-23. PLT-23 step 1b records `tools-preview` C2 passing on main.

Code and data:
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` (lines 35 to 41), `DESCRIPTION_LIMIT` (44), `VERBS` (48 to 67; the nine first words are in it, and `face` is at line 66), `contentChecks` (drafts are all loaded tools with `output: draft`, with no enabled filter), `checkCommonInputs`, `checkDescription` with `firstWord` and `isVerb`, and `checkRemix` (active only when `core/tools/remix.yaml` exists; it reads every draft tool, disabled ones included).
- `packages/packs/test/real-packs.test.ts`: the suite on the real packs, failing on errors only.
- `packages/packs/nonfiction/tools/cold_open.yaml`: the five common blocks at lines 7 to 33 (copied in section 4); `output: draft`; `enabled: true`; the `person` input (`x-scriba-type: entity`, `x-scriba-port: true`, `x-scriba-entity-kinds: [person]`); the `moment` text port, with no control.
- `packages/packs/core/tools/`: `propose_graph.yaml` (`output: graph`) and `throughline_check.yaml` (`output: check`).
- `apps/api/test/packs/golden.kit.ts`: `PACKS_ROOT` (line 29), `GOLDEN_ROOT` (38), `UPDATE_GOLDENS` (40), `README_TERMS` (44), `GoldenRunOptions` (70 to 78), `GoldenCaseOptions` (90 to 97), `post` (101 to 114), `runGoldenCase` (126; `startMockOpenAI` and the scenario name at 142 to 143; the provider block at 144 to 161; `sessionCookie` at 173; `path` at 174), `goldenCase` (241 to 259). The text `enable` does not occur (`grep -c "enable"` prints 0).
- `apps/api/test/packs/cold-open.test.ts`: the `renderedPrompt` helper, and the assertion `Length: 800 words`.
- `apps/api/test/packs/character-world-builder.test.ts`: two `goldenCase` bodies awaited in one `it` with timeout 120000 (lines 23 to 60).
- `apps/api/src/modules/tool-registry/executor.service.ts`: step 1 refuses a disabled tool with `TOOL_DISABLED` (lines 117 to 124); step 2 is Ajv in full mode; step 3 resolves entities and checks their kinds (lines 136 to 151); `sources` (159 to 161); the `toolCatalog` filter `valid && enabled`; `OUTPUT_SYSTEM_MESSAGES.draft` (line 32).
- `packages/contracts/src/tool-registry/errors.ts`: `TOOL_DISABLED` is code and status 409 (line 41).
- `apps/api/src/modules/tool-registry/catalog.service.ts`: `enabledWith` (83); `offeredOrigins` (67 to 71: `core` and `user`, plus the genre pack when it is built in); `setEnabled` (229 to 245); `functions(genrePack)` (around 351 to 365: valid, enabled tools of the offered origins); `list` (every row, with its enabled flag).
- `apps/api/src/modules/tool-registry/tools.controller.ts`: `@Get(FUNCTIONS_ROUTE)` (line 73), which reads the active project's genre pack; `@Post(TOOL_ENABLED_ROUTE)` (98).
- `apps/api/src/modules/tool-registry/active-genre.service.ts`: the genre pack comes from the active project's `project.yaml`; with no active project, only core and user tools are offered.
- `packages/contracts/src/tool-registry/routes.ts`: `FUNCTIONS_ROUTE` is `/api/tool-registry/functions`; `TOOL_ENABLED_ROUTE` and `TOOL_EXECUTE_ROUTE` are as named.
- `apps/api/test/project-store-projects.kit.ts`: `buildProjectsLibrary({ settings })` writes `book/project.yaml` with `genrePack: nonfiction`, `sources/outline.md`, and `.scriba/settings.yaml` from `settings` (lines 30 to 85).
- `apps/api/test/project-store-active.test.ts` (C1): a POST to `ACTIVE_PROJECT_ROUTE` with `{ projectId: 'book' }` answers `{ active: 'book' }`.
- `apps/api/test/tool-registry-read-enable.test.ts`: `functionNames` reads `entry.function.name` from `functionListSchema`; the `get` and `post` helpers are at lines 92 to 110.
- `apps/api/test/agent-loop-narrative.test.ts`, T1: the chat request's `tools` (an alternative seam, not used here).
- `apps/api/test/create-test-app.ts`: `libraryDir` and `env` (lines 9 to 12). Its default `SCRIBA_PACKS_DIR` is the library's `packs` folder, so the AC 3 test passes `PACKS_ROOT`, as the golden helper does.
- `scripts/eval-cases.test.mjs`: the first test loops over every case file (id pattern, keys `sample`, `intent`, `expect`, the `expect` keys and values). The second test reads two named cases. The nine new files pass the loop with no edit.
- `scripts/eval-agent/run.mjs`: no per-case enable key, and a fresh library for each run (GNP-21 section 2, cited there).
- `e2e/specs/tools-preview.e2e.ts`: `test.use({ viewport: { width: 1280, height: 3200 } })` (line 23, before step 12a); the person picker is `section[data-key="person"] select` (line 182) in the tool's form; `const target = await centerOf(personPicker);` (line 209) and `toHaveValue('ada')` (line 213); the spec's comment says the picker "sits below the tools list and the chips" and that the list "grows with each built-in tool".
- The `/tools` list shows every row, disabled ones included (`catalog.service.ts` `list`; `tools-list.ts` lines 210 to 240, one `<li>` per row with a name, a description, a meta line and a switch). The margin history: GNP-14 measured the picker target at y=2302 with the branch alone and set the height to 3200, leaving "about 900 px" for the two user rows of `tools-editor.e2e.ts` and the rows of GNP-15, GNP-16 and GNP-17 (`plans/GNP-14.md` C12; DECISIONS lines 6545 and 6586). GNP-16 and GNP-17 are on main since then.
- `e2e/fixtures/mock-openai/scenarios/pack-cold_open.json`: `{"steps": [{"match": {"endpoint": "chat"}, "reply": {"kind": "stream", "deltas": [...]}}]}`.
- `examples/nonfiction/entities/` holds `k-anders-ericsson`, `deliberate-practice`, `hours-figure-is-average`, `plateau-is-reorganising` and `book-style`. `examples/nonfiction/sources/` holds `ten-thousand-hours-notes.md`, `learning-plateaus-notes.md`, `deliberate-practice-notes.md` and `outline.md`. The eval intents name them; no test reads them.
- `plans/GNP-14.md`, C5 (line 43), the rule of one test per criterion.
- Name collisions: no existing tool, eval case, scenario, golden folder or test file has one of the nine names (`ls` and grep of `packages/packs`, `scripts/eval-agent/cases/`, `e2e/fixtures/mock-openai/scenarios/`, `apps/api/test/packs/`). The existing eval ids are `cold-open`, `mystery-question`, `myth-buster`, `numbers-to-people`, `character-builder`, `world-builder`, `dialogue`, `plot-manager`, `throughline-check` and `summarize-outline`.
- Working tree: clean except this file `plans/GNP-22.md` (the orchestrator commits it). Main at `13ba93a` differs from `5d7e0e3` in no path of this plan (the reviser checked `git log --oneline 5d7e0e3..13ba93a`: plan and DECISIONS commits of GNP-18, GNP-21, GNP-22 and SHL-23, and the GNP-18 merge; `git diff --stat 5d7e0e3 13ba93a -- . ':!plans'` lists only `examples/fiction/**`, `examples/samples.yaml` and the unit files of GNP-18 and SHL-23, none of the paths of section 3). `grep -c enable apps/api/test/packs/golden.kit.ts` prints `0` on main.

### Assumed (each one is checked by the step named in section 4)
- A1 Node v26.x and npm 11.x are on the PATH (step 1).
- A2 Ajv's message for a missing required key names the key, which the goldens' `invalid.message` check needs (the existing cases rely on it; step 8 reads the result).
- A3 `{{#each}}` over an absent list renders nothing (`template.ts`, the `each` case). Not exercised by this plan: every valid call passes the lists its tool names, and the one optional list (`claimIds`) is passed in its tool's valid call. Recorded for a reader who omits it.
- A4 The packs lint accepts the nine specs; warnings are allowed (step 10).
- A5 Prettier keeps the prompt text. If it changes the text, keep its form and record the change (step 4).
- A6 `buildProjectsLibrary` plus the activation call gives a nonfiction active project, and the function list then includes an enabled nonfiction tool (step 7; the AC 3 test shows it).
- A7 (GNP-21's A10, the same fact) The `/tools` list grows by nine rows. Revision 1 assumed that the person picker stays inside the 3200-pixel viewport; the implementer measured it at y 3767.4 (PLAN DOES NOT WORK, 2026-11-20), so the assumption is false. Revision 2 assumes instead that the picker centre stays below 6000 − 1000 = 5000 with the nine rows (C6). Step 13 measures it in the four-spec run and the spec run alone; if a logged target y is at or above 5000, the implementer stops and reports PLAN DOES NOT WORK with the numbers.
- A8 `vitest` provides `__dirname` in the packs and API test files (existing tests use it; step 10).
- A9 `sourcesUsed` follows property order. It is checked in the code, and in `cold_open`'s golden (`['notes-a', 'notes-b', 'researcher-a']`). Each expected value of section 4 step 5 follows it; step 9 confirms it.

## 3. Files to change

| Path | Change | Reason |
|---|---|---|
| `packages/packs/nonfiction/tools/contrast.yaml`, `profile.yaml`, `zoom.yaml`, `reader_challenge.yaml`, `framework_builder.yaml`, `method_first.yaml`, `timeline.yaml`, `flashback.yaml`, `stockdale_tension.yaml` | new (nine) | the tool specs, output `draft`, disabled (step 4; U1; M1 to M4) |
| `packages/packs/test/golden/<tool>/basic.fixture.json` | new (nine) | the arguments and entities of each case (step 5; C3) |
| `packages/packs/test/golden/<tool>/basic.golden.json` | new (nine), written by the update run | the recorded request (step 8) |
| `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json` | new (nine) | one scripted reply per tool (step 6; G1) |
| `apps/api/test/packs/golden.kit.ts` | changed only if the option is absent (step 3a) | the `enable` option, GNP-21's C2 contract (G2) |
| `packages/packs/test/README.md` | changed only if step 3a | one bullet for `enable` (step 3c) |
| `apps/api/test/packs/tier2-3-shapes.test.ts` | new | AC 2 (one test over nine bodies) and AC 3 (one test) (step 7) |
| `packages/packs/test/tier2-3-shapes.test.ts` | new | AC 1 (step 10) |
| `scripts/eval-agent/cases/<id>.json` (nine: `contrast`, `profile`, `zoom`, `reader-challenge`, `framework-builder`, `method-first`, `timeline`, `flashback`, `stockdale-tension`) | new (nine) | the eval cases (step 11; AC 4) |
| `scripts/eval-case-tier2-3-shapes.test.mjs` | new | AC 4, one test (step 11) |
| `e2e/specs/tools-preview.e2e.ts` | line 23 only: height 3200 → 6000 | the nine rows push the TRG-05 C2 person picker below 3200 px (step 12a; C6; A7) |

Not changed, and why: `packages/packs/test/checks.ts` (no verb is needed, G3); `packages/packs/test/golden/propose_graph/*` (G4); `scripts/eval-cases.test.mjs` (its first test covers the new files); `scripts/eval-agent/run.mjs` and its README (no enable key is added, open point 4); `packages/packs/test/real-packs.test.ts`; `packages/packs/nonfiction/tools/cold_open.yaml` and the other existing tools; `apps/api/src/**` (no product code changes); `packages/contracts/**`; `e2e/specs/**` other than line 23 of `tools-preview.e2e.ts` (its comment lines 20 to 22, its steps and assertions stay; PLT-23 owns lines 20 to 22; open point 3); `e2e/playwright.config.*` and the other e2e files; `examples/**`; `package-lock.json`; `units/**`; `modules/**`; `plans/**` other than this plan. `golden.kit.ts` and the README change only in step 3a, and only when GNP-21 has not merged.

## 4. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-22`, created from `main`. Record `node -v` and `npm -v` with each result. Do not push. Do not use `git add -A` or `git commit -a`.

**Continuation (revision 2).** `unit/GNP-22` already holds steps 0 to 12 (commits `9758d0f` to `f270600`, base `a12af54`; step 3a was applied). The new implementer keeps those commits, does not repeat steps 0 to 12 (the `test ! -e` checks of step 0 no longer hold, by design), and runs step 1's runtime checks (`node -v`, `npm -v`, `npm ci` if `node_modules/` is absent, the two builds), then step 12a, step 13 in full and step 14. Do not rebase; the orchestrator rebases onto main later.

0. **Base.** Seam: read-only git and the filesystem. `git rev-parse --short HEAD` (expected `13ba93a` or a later `main`). `git status --short` on a clean tree. `test ! -e` for each of the nine YAML specs, for `apps/api/test/packs/tier2-3-shapes.test.ts`, `packages/packs/test/tier2-3-shapes.test.ts` and `scripts/eval-case-tier2-3-shapes.test.mjs`; all exit 0. `grep -c "enable" apps/api/test/packs/golden.kit.ts` prints `0` on this base (step 3a), or more when GNP-21 has merged (step 3b). If a check fails, re-read the file before editing.

1. **Runtime and baseline.** `node -v` prints `v26.x`, and `npm -v` prints `11.x` (A1). Run `npm ci` only if `node_modules/` is absent. `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api` exits 0. `npm test -w @bbartolome/scriba-packs` and `cd apps/api && npx vitest run test/packs` exit 0 before any change. Record both test counts.

2. **Branch.** `git switch -c unit/GNP-22` on a clean tree from `main`.

3. **The `enable` option (G2; the merge-order rule of GNP-21 step 0).**
   - **3a. The option is absent** (step 0 printed `0`). Edit `apps/api/test/packs/golden.kit.ts` exactly as GNP-21 section 4, step 7, states it:
     - add `TOOL_ENABLED_ROUTE` to the import from `'@bbartolome/scriba-contracts/tool-registry'`, next to `TOOL_EXECUTE_ROUTE`;
     - in `GoldenRunOptions` and in `GoldenCaseOptions`, after the `userTool` line, add `enable?: boolean;` with the comment `// Turns the tool on in the case's temporary library first; the shipped spec keeps its value.`;
     - in `runGoldenCase`, after `const cookie = await sessionCookie(app, library);` and before `const path = ...`, add:

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

     - in `goldenCase`, pass `enable: options.enable` to `runGoldenCase`.
     Then do 3c. Expected: `cd apps/api && npx vitest run test/packs/golden-harness.test.ts` exits 0, and no existing test changes.
   - **3b. The option is present** (GNP-21 merged first, or its branch is in). Check that `GoldenRunOptions` and `GoldenCaseOptions` each have `enable?: boolean`, that `goldenCase` passes it on, that `runGoldenCase` posts `TOOL_ENABLED_ROUTE` with `{ enabled: true }` before the execute call and asserts 200, and that the README bullet of 3c is in `packages/packs/test/README.md`. If all four hold, change neither file and skip 3c. If the option differs from G2, stop and report PLAN DOES NOT WORK. This is the check of GNP-21's step 0, for the other merge order.
   - **3c. The README bullet** (only with 3a). In `packages/packs/test/README.md`, after the `goldenCase` bullet, add: "`enable: true` (optional) turns the tool on in the case's temporary library, through `POST /api/tool-registry/tools/:name/enabled`, before the call. The shipped spec keeps its `enabled` value; use the option only for a tool that ships disabled."

4. **Tool specs (U1, M1 to M4, C4).** Create the nine files below. Each file is the header and the tool's own inputs, with the five common blocks inserted where `<<COMMON>>` stands. The five blocks are copied verbatim from `packages/packs/nonfiction/tools/cold_open.yaml` lines 7 to 33:

```yaml
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
```

   Every `prompt` ends with the same constraints block, copied verbatim:

```
  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

   Every `prompt` starts with the same lines after its role line: `Core idea: {{coreIdea}}`, `Length: {{length}} words.`, `{{#if tone}}Tone: {{tone}}.` and `{{/if}}`; then its own lines; then `Material:` with `{{#each entityIds}}`, `{{entity this}}`, `{{/each}}`, `{{#if styleProfile}}`, `{{entity styleProfile}}`, `{{/if}}`.

   **`packages/packs/nonfiction/tools/contrast.yaml`**

```yaml
schemaVersion: 1
name: contrast
description: Set two things side by side so the difference makes the point.
inputs:
  type: object
  properties:
<<COMMON>>
    subjectA:
      type: string
      title: Subject A
      x-scriba-type: text
      x-scriba-port: true
    subjectB:
      type: string
      title: Subject B
      x-scriba-type: text
      x-scriba-port: true
  required: [coreIdea, subjectA, subjectB]
output: draft
enabled: false
prompt: |
  You write a nonfiction passage that sets two things side by side, so that the difference makes the point.

  Core idea: {{coreIdea}}
  Length: {{length}} words.
  {{#if tone}}Tone: {{tone}}.
  {{/if}}Subject A: {{subjectA}}
  Subject B: {{subjectB}}
  Material:
  {{#each entityIds}}
  {{entity this}}
  {{/each}}
  {{#if styleProfile}}
  {{entity styleProfile}}
  {{/if}}

  Steps:
  1. Name the two subjects in plain words, using the material.
  2. Set subject A beside subject B, on the same points.
  3. Show the one difference that matters most to the core idea, and where the material shows it.
  4. End on what the difference shows about the core idea, in plain words.

  Constraints:
  - Use only the material above.
  - Cite each factual sentence with its entity or source ID in the form [@id].
  - Where a needed fact is missing, write TK with a short note in brackets, for example TK (year of the study). Do not invent it.
  - Follow the tone of the style profile, avoid its banned phrases, and keep to the length above.
```

   **`packages/packs/nonfiction/tools/profile.yaml`**: the header with `name: profile` and `description: Paint one person in depth to embody the idea.`; the common block; then

```yaml
    person:
      type: string
      title: Person
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [person]
  required: [coreIdea, person]
```

   `output: draft`, `enabled: false`. Prompt: role line "You write a nonfiction passage that paints one person in depth, so that the person embodies the core idea."; the common lines; then `Material:` followed by `{{entity person}}` and then the entity block. Steps: 1. Introduce the person by the role the material gives them. 2. Paint what the person did, in the detail the material holds, over time. 3. Show the one choice or habit that embodies the core idea. 4. End on what the person's case shows about the core idea, in plain words. Then the constraints block.

   **`packages/packs/nonfiction/tools/zoom.yaml`**: `name: zoom`, `description: Move from a close-up detail out to the big picture and back.`; the common block; then

```yaml
    detail:
      type: string
      title: Detail
      x-scriba-type: text
      x-scriba-port: true
    bigPicture:
      type: string
      title: Big picture
      x-scriba-type: text
      x-scriba-port: true
  required: [coreIdea, detail]
```

   Prompt: role line "You write a nonfiction passage that moves from a close-up detail out to the big picture, and back again."; then `Detail: {{detail}}`, then `{{#if bigPicture}}Big picture: {{bigPicture}}` and `{{/if}}Material:`. Steps: 1. Open on the close-up detail, in the terms the material gives it. 2. Pull back to the big picture that the detail belongs to. 3. Return to the detail, now read in the light of the big picture. 4. End on what the detail and the big picture together show about the core idea.

   **`packages/packs/nonfiction/tools/reader_challenge.yaml`**: `name: reader_challenge`, `description: Ask the reader to test their own assumption before the reveal.`; the common block; `question` (title `Question`, text port, `x-scriba-type: text`, `x-scriba-port: true`); `required: [coreIdea, question]`. Prompt: role line "You write a nonfiction passage that asks the reader to test their own assumption before the reveal."; then `Question for the reader: {{question}}`. Steps: 1. Put the question to the reader in plain words, as the assumption it tests. 2. Let the reader weigh that assumption against the facts the material gives. 3. Reveal what the material shows, and where the assumption holds or fails. 4. End on the core idea, in plain words.

   **`packages/packs/nonfiction/tools/framework_builder.yaml`**: `name: framework_builder`, `description: Turn a pattern into a small named framework with steps.`; the common block; then

```yaml
    pattern:
      type: string
      title: Pattern
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
  required: [coreIdea, pattern]
```

   Prompt: role line "You write a nonfiction passage that turns a pattern into a small named framework with steps."; then `Pattern: {{pattern}}`; then `Material:` followed by `{{#each claimIds}}`, `{{entity this}}`, `{{/each}}` and then the entity block. Steps: 1. Describe the pattern in plain words, using the material. 2. Give the framework a short name of two or three words that is easy to repeat. 3. Set out its steps in order, each a short line that the material supports. 4. End on how a reader applies the framework, and where it stops working.

   **`packages/packs/nonfiction/tools/method_first.yaml`**: `name: method_first`, `description: Explain how the evidence was gathered before what it showed.`; the common block; `method` (title `Method`, text port); `required: [coreIdea, method]`. Prompt: role line "You write a nonfiction passage that explains how the evidence was gathered before what it showed."; then `Method: {{method}}`. Steps: 1. Say how the evidence was gathered, in the order the work was done, using the material. 2. Say what the method could capture, and what it could not. 3. Only then, set out what the evidence showed, from the material. 4. End on what the reader can trust, and what remains open.

   **`packages/packs/nonfiction/tools/timeline.yaml`**: `name: timeline`, `description: Tell events in order to show how the idea unfolded.`; the common block; `events` (title `Events`, text port); `required: [coreIdea, events]`. Prompt: role line "You write a nonfiction passage that tells events in order, to show how the idea unfolded."; then `Events: {{events}}`. Steps: 1. List the events in the order they happened, using the events given above and the material. 2. Tell each event in one or two sentences, with its date where the material gives one. 3. Show how each event changed what came next. 4. End on what the sequence shows about the core idea.

   **`packages/packs/nonfiction/tools/flashback.yaml`**: `name: flashback`, `description: Break from the present moment to a past one that explains it.`; the common block; `present` (title `Present`, text port) and `past` (title `Past`, text port); `required: [coreIdea, present, past]`. Prompt: role line "You write a nonfiction passage that breaks from the present moment to a past one that explains it."; then `Present: {{present}}` and `Past: {{past}}`. Steps: 1. Open in the present moment given above. 2. Break to the past moment given above, in the terms the material gives it. 3. Show how the past explains what the present shows. 4. Return to the present, and end on the core idea, in plain words.

   **`packages/packs/nonfiction/tools/stockdale_tension.yaml`**: `name: stockdale_tension`, `description: Face the hardest fact while holding on to the hope beside it.`; the common block; `hardFact` (title `Hard fact`, text port) and `hope` (title `Hope`, text port); `required: [coreIdea, hardFact, hope]`. Prompt: role line "You write a nonfiction passage that faces the hardest fact while holding on to the hope beside it."; then `Hard fact: {{hardFact}}` and `Hope: {{hope}}`. Steps: 1. State the hardest fact plainly, without softening it, using the material. 2. State the hope beside it, and the ground the material gives for it. 3. Hold both in the same passage: the hope must not hide the fact, and the fact must not cancel the hope. 4. End on the core idea, in plain words.

   Then `npx prettier --write` on the nine files. Expected: each is reported as written, and `git status --short` lists the nine new files and nothing else.

5. **Fixtures (G1, C3).** Create the nine `basic.fixture.json` files. The table gives each case's arguments, the entities it names, its `invalidWithout` and its expected `sourcesUsed`. The `entities` list of each fixture holds exactly the entities that the arguments name, in the order of the table, each as `{ "ref", "type", "path", "content" }`, with the path `entities/<ref>.md`, or `sources/<ref>.md` for a source. The entity contents are:
   - `notes-a` (source): "Notes A say that each practice session in the study was planned in advance, with a teacher setting the task."
   - `notes-b` (source): "Notes B say that the practice hours in the study were estimates made from memory."
   - `person-a` (person): "Person A set the practice tasks in the study and kept the results in a notebook."
   - `claim-a` (claim): "---\ntype: claim\nstatement: The practice hours in the study were estimates made from memory.\nevidence: [notes-a]\nstatus: weak\n---\n\nClaim A is the strongest objection to the hours figure."
   - `style-a` (style-profile): "---\ntype: style-profile\ntone: Plain and direct\ntargetLength: 800\nbannedPhrases: [game-changer]\n---\n\nSay what the evidence shows, and say where it stops."

   Every case has `coreIdea` "Expertise grows from planned practice, not from the hours alone." and `styleProfile` "style-a".

| Tool (folder) | Other arguments of the valid call | Entities named | `invalidWithout` | Expected `sourcesUsed` | Text the prompt must hold (besides IDs and `game-changer`) |
|---|---|---|---|---|---|
| `contrast` | `entityIds` ["notes-a"]; `subjectA` "Practice planned in advance, with a teacher"; `subjectB` "Practice alone, from a list chosen beforehand" | notes-a, style-a | `subjectA` | `["notes-a"]` | both subject values |
| `profile` | `entityIds` ["notes-b"]; `person` "person-a" | notes-b, person-a, style-a | `person` | `["notes-b", "person-a"]` | `person-a` (ID) |
| `zoom` | `entityIds` ["notes-a"]; `detail` "One lamp, turned down by a single notch each night"; `bigPicture` "A whole service kept running by small, repeated checks" | notes-a, style-a | `detail` | `["notes-a"]` | both values |
| `reader_challenge` | `entityIds` ["notes-a"]; `question` "Does doubling the hours double the skill?" | notes-a, style-a | `question` | `["notes-a"]` | the question value |
| `framework_builder` | `entityIds` ["notes-a"]; `pattern` "Planned practice, a teacher, and feedback after each attempt"; `claimIds` ["claim-a"] | notes-a, claim-a, style-a | `pattern` | `["notes-a", "claim-a"]` | the pattern value |
| `method_first` | `entityIds` ["notes-b"]; `method` "Each session was planned in advance and written in a notebook" | notes-b, style-a | `method` | `["notes-b"]` | the method value |
| `timeline` | `entityIds` ["notes-a", "notes-b"]; `events` "Year one: the study starts. Year two: the first results. Year three: the follow-up." | notes-a, notes-b, style-a | `events` | `["notes-a", "notes-b"]` | the events value |
| `flashback` | `entityIds` ["notes-a"]; `present` "The student now plays the piece without errors."; `past` "Years earlier, the same student practised the piece alone." | notes-a, style-a | `past` | `["notes-a"]` | both values |
| `stockdale_tension` | `entityIds` ["notes-b"]; `hardFact` "Most of the hours in the study were estimates made from memory."; `hope` "The planned sessions in the notes can still be counted." | notes-b, style-a | `hardFact` | `["notes-b"]` | both values |

   The valid call of every case has the five common keys and the arguments named above; no case passes `tone`, and `length` takes its default. The `expect.kind` of every case is `draft`. The `sourcesUsed` order follows the property order of the spec (A9).

   Example, `packages/packs/test/golden/contrast/basic.fixture.json`:

```json
{
  "arguments": {
    "coreIdea": "Expertise grows from planned practice, not from the hours alone.",
    "entityIds": ["notes-a"],
    "styleProfile": "style-a",
    "subjectA": "Practice planned in advance, with a teacher",
    "subjectB": "Practice alone, from a list chosen beforehand"
  },
  "entities": [
    {
      "ref": "notes-a",
      "type": "source",
      "path": "sources/notes-a.md",
      "content": "Notes A say that each practice session in the study was planned in advance, with a teacher setting the task."
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

   Then `npx prettier --write` on the nine fixture files.

6. **Scenarios (G1).** Create the nine `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json` files. Each has one step: `match` on the `chat` endpoint and a `stream` reply with one delta. The delta is one sentence of the passage that cites one of the call's entity IDs as `[@id]`. The example for `contrast`:

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": ["Planned practice set the task in advance, with a teacher [@notes-a]. Practice alone followed a list chosen beforehand [@notes-a]."]
      }
    }
  ]
}
```

   Then `npx prettier --write` on the nine files.

7. **Test file (AC 2, AC 3).** Create `apps/api/test/packs/tier2-3-shapes.test.ts`, then `npx prettier --write` on it. The file contains no `any`, and no text `examples/`.
   - Imports: `expect` and `it` from `vitest`; `goldenCase`, `GOLDEN_ROOT`, `PACKS_ROOT` and `type GoldenRunResult` from `./golden.kit`; `createTestApp` and `type TestApp` from `../create-test-app`; `send`, `sessionCookie` and `type Reply` from `../guard-request`; `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` from `../invariant-sweep`; `recordsOf` and `startMockOpenAI` from `../providers-client.kit`; `buildProjectsLibrary` from `../project-store-projects.kit`; `PROVIDER_DEFAULTS` from `@bbartolome/scriba-contracts/providers`; `ACTIVE_PROJECT_ROUTE` from `@bbartolome/scriba-contracts/project-store`; the tool-registry routes and schemas (`FUNCTIONS_ROUTE`, `TOOL_ENABLED_ROUTE`, `TOOL_EXECUTE_ROUTE`, `functionListSchema`, `toolCallRequestSchema`, `toolCallResultSchema`); `errorBodySchema` from `@bbartolome/scriba-contracts/platform`; `stringify` from `yaml`; `readFileSync` from `node:fs`; `join` from `node:path`.
   - `renderedPrompt`: copied from the `cold-open.test.ts` helper of the same name.
   - One shared check, `promptHolds(result, texts)`: the prompt holds each string of `texts` and the banned phrase `game-changer`. Each case passes the texts of the table above (the entity IDs of the call and the text values).
   - Nine `const` bodies, one per tool, each `goldenCase({ tool, name: 'basic', enable: true, expect: { kind: 'draft', sourcesUsed }, invalidWithout, check: (result) => promptHolds(result, texts) })`, with the values of the table in step 5.
   - **AC 2 (one test).** `it('AC 2: the nine tier 2-3 golden cases match once each tool is enabled in its temporary library; each prompt holds its entities and its text; each output is a draft with the expected sourcesUsed; and each invalid call returns a readable Ajv error', async () => { await contrast(); await profile(); ...; await stockdaleTension(); }, 300000);`. The timeout is a plan choice: nine cases, each with its own app and mock.
   - **AC 3 (one test).** `it('AC 3: an enabled tool is callable through execute and present in the function list', ...)`. Steps, in one app, with a mock whose provider base URL is `${mock.baseUrl}/scenario/pack-contrast/v1`:
     1. `buildProjectsLibrary({ settings: stringify(...) })`, where the settings are the object that `runGoldenCase` stringifies (`golden.kit.ts` lines 144 to 161: `schemaVersion: 1`; `providers` with `schemaVersion: 1`, a `list` of one entry `{ id: 'mock', kind: 'openai-compatible', baseURL: \`${mock.baseUrl}/scenario/pack-contrast/v1\`, model: 'mock-model', ...PROVIDER_DEFAULTS }`, and `appDefault: { providerId: 'mock', model: 'mock-model' }`). `createTestApp({ libraryDir: fixture.library, env: { SCRIBA_PACKS_DIR: PACKS_ROOT } })`; `sessionCookie(app, fixture.library)`.
     2. POST `ACTIVE_PROJECT_ROUTE` with `{ projectId: 'book' }`. Expected: 200, `{ active: 'book' }`.
     3. GET `FUNCTIONS_ROUTE`. Expected: `functionListSchema` names do not include `contrast`.
     4. POST `TOOL_EXECUTE_ROUTE` (`:name` = `contrast`) with the fixture `packages/packs/test/golden/contrast/basic.fixture.json`, parsed with `toolCallRequestSchema`. Expected: 409, `errorBodySchema` code `TOOL_DISABLED`.
     5. POST `TOOL_ENABLED_ROUTE` with `{ enabled: true }`. Expected: 200.
     6. GET `FUNCTIONS_ROUTE`. Expected: the names include `contrast`.
     7. POST `TOOL_EXECUTE_ROUTE` again. Expected: 200; `toolCallResultSchema` gives `output.kind` `draft` and `sourcesUsed` `['notes-a']`; `recordsOf(mock, 'pack-contrast')` has length 1.
     - `finally`: `await app?.close()`, `await mock.close()`, `fixture.remove()`.
   - The `get` and `post` helpers follow `apps/api/test/tool-registry-read-enable.test.ts` (the GET sends no Origin; the POST sends the loopback Origin).

8. **Update run (G1).** `cd apps/api && npx vitest run test/packs/tier2-3-shapes.test.ts -- --update-goldens` exits 0 and writes nine `basic.golden.json` files. Read each one. `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.draft` (`executor.service.ts` line 32, the system message the executor sends for kind `draft`). The user message holds each argument value and each entity ID, and the banned phrase `game-changer`. It has no `tools` key. Then `npx prettier --write` on the nine golden folders. `git status --short` shows only the fixture, golden, spec, scenario, and test files of this plan.

9. **Compare run.** `cd apps/api && npx vitest run test/packs/tier2-3-shapes.test.ts` exits 0, with two tests passed (AC 2 and AC 3). Each golden status is `match` (A9 is confirmed by this run).

10. **Pack checks (AC 1).** Create `packages/packs/test/tier2-3-shapes.test.ts` (section 5, AC 1), then `npx prettier --write` on it. `npm run lint:packs` exits 0 and prints no finding that names one of the nine tools. `npm test -w @bbartolome/scriba-packs` exits 0, and the count rises by one from the step 1 baseline. The test passes with the verb list of GNP-21 either merged or not.

11. **Eval data (AC 4).** Create the nine case files in `scripts/eval-agent/cases/` (intents below), then `npx prettier --write` on them. Then create `scripts/eval-case-tier2-3-shapes.test.mjs` (section 5, AC 4) and `npx prettier --write` on it. `node --test scripts/eval-case-tier2-3-shapes.test.mjs` exits 0 with one test passed. `node --test scripts/eval-cases.test.mjs` exits 0 with two tests passed.

   Each file has the keys `sample` (`"nonfiction"`), `intent` and `expect` (`reason` `"completed"`, `tools` `["<tool>"]`, `citations` `"present"`). The intents, in table order:
   - `contrast`: "Set deliberate practice beside simply repeating an activity, using my notes, so the difference makes the point."
   - `profile`: "Paint K. Anders Ericsson in depth, using my notes, so that he embodies the idea that practice is planned."
   - `zoom`: "Move from one close-up practice session in my notes out to the big picture of expertise, and back."
   - `reader-challenge`: "Ask the reader to test the assumption that more hours always make an expert, before the reveal, using my notes."
   - `framework-builder`: "Turn the planned-practice pattern in my notes into a small named framework with steps, using my claims."
   - `method-first`: "Explain how the hours figure was gathered before what it showed, using my notes and my claims."
   - `timeline`: "Tell the events of the study in order, to show how the idea unfolded, using my notes."
   - `flashback`: "Break from a learner's present plateau to a past practice session that explains it, using my notes."
   - `stockdale-tension`: "Face the hardest fact about the hours figure while holding on to the hope beside it, using my claims."

12. **Catalogue unchanged (G4).** `git diff --stat -- packages/packs/test/golden/propose_graph` prints nothing. `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0 without `--update-goldens`.

12a. **The viewport of the TRG-05 spec (C6; revision 2).** In `e2e/specs/tools-preview.e2e.ts`, replace line 23, `test.use({ viewport: { width: 1280, height: 3200 } });`, with `test.use({ viewport: { width: 1280, height: 6000 } });`. Change no other line: the comment at lines 20 to 22 stays word for word (it names no number, and PLT-23 rewrites it), and no step, assertion, wait or drag changes. Then `npx prettier --check e2e/specs/tools-preview.e2e.ts` exits 0, and `git diff -- e2e` shows exactly one changed line (`-` 3200, `+` 6000). Commit it alone: `git add e2e/specs/tools-preview.e2e.ts`, then `git commit -m "test(GNP-22): raise the tools-preview viewport to 6000 px for the nine new rows"`.

13. **Format and root gates.** `npx prettier --check` on every new and changed file of section 3 exits 0. `npm run build -w @bbartolome/scriba-api` exits 0, since it type-checks the test files. From the root, `npm run build`, `npm test`, `npm run lint` and `npx prettier --check .` exit 0; a failure already on the base is reported, not fixed. `cd apps/api && npx vitest run test/packs` exits 0, with the step 1 baseline plus two. `npm run lint -w @bbartolome/scriba-e2e` exits 0. The root `npm test` does not run Playwright (section 2), so run the `/tools` specs explicitly, with port 8080 free, and measure the margin of C6:
   - Add one temporary line `console.log('C2 target', JSON.stringify(target));` after `const target = await centerOf(personPicker);` (line 209). Do not commit it.
   - Run `npm run e2e -w @bbartolome/scriba-e2e -- tools-preview.e2e.ts --trace off`, then the four-spec run `npm run e2e -w @bbartolome/scriba-e2e -- tools-editor.e2e.ts tools-live-preview.e2e.ts tools-preview.e2e.ts tools-try.e2e.ts --trace off` (the run of GNP-15 step 14).
   - Remove the line. `git diff -- e2e` prints nothing (the step 12a change is committed), and `git status --short -- e2e` is empty.
   - Expected: the spec alone, 2 passed; the four-spec run, all passed (7 tests, as in the report of 2026-11-20). TRG-05 C2 passes in both. Record the two logged targets, the pass and fail counts, and the viewport (1280 by 6000).
   - If a logged target y is at or above 5000 (the C6 margin of 1000 px is not kept), stop and report PLAN DOES NOT WORK with the numbers (A7). If C2 or another test fails for another cause, report it with the failing line and the logged target. If the browser cannot run, record "e2e not run" in the report.

14. **Commit (the orchestrator asks).** In the continuation, the earlier commits and the step 12a commit hold every path of section 3: `git status --short` is empty, and `git diff --stat a12af54..HEAD` lists the 50 paths of the earlier commits and `e2e/specs/tools-preview.e2e.ts` (one line), nothing else. For a fresh run of the plan: `git add` each path of section 3 by name. `git diff --cached --stat` lists only those paths, and no `plans/` or `units/` file. Commit with `feat(GNP-22): nine tier 2-3 draft tools, shipped disabled`. Do not push.

## 5. Acceptance criteria and tests

Each criterion has one test. Nothing is marked passed in this plan.

**AC 1: All nine pass the validation suite with identical common inputs and ship disabled.** (U line 31)
- Test file: `packages/packs/test/tier2-3-shapes.test.ts` (new). Test name: `AC 1: the nine tier 2-3 tools pass the suite on the real packs, ship with enabled false, and have output draft`.
- Content: `lintPacks(REAL_PACKS)` has no error; `contentChecks(REAL_PACKS)` is empty; for each of the nine names, the spec at `nonfiction/tools/<name>.yaml` (parsed with `yaml`) has `enabled` `false` and `output` `draft`. `REAL_PACKS` is `resolve(__dirname, '..')`, as in `real-packs.test.ts`. The identity of the common inputs is checked by `checkCommonInputs` through `contentChecks`, and the descriptions by `checkDescription`; this test relies on both.
- Command: `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` (steps 10 and 13).
- Pass: both exit 0, and the test passes.

**AC 2: One golden test per tool.** (U line 32)
- Test file: `apps/api/test/packs/tier2-3-shapes.test.ts` (new). The one `it` awaits nine `goldenCase` bodies, each with `enable: true` (G2, G6). Test name in step 7.
- Command: `cd apps/api && npx vitest run test/packs/tier2-3-shapes.test.ts` (steps 8 and 9).
- Pass: each body passes. The golden status is `match` (or `written` in the update run). The kind is `draft`. `sourcesUsed` is the value of the table, step 5. The call without `invalidWithout` returns 422 with `TOOL_ARGS_INVALID`, and the message names that argument. Exactly one model request is recorded. The `check` passes.

**AC 3: Enabling one through the Tool registry makes it callable via execute and present in the function list.** (U line 33)
- Test file: `apps/api/test/packs/tier2-3-shapes.test.ts`, the second `it`. Test name in step 7. It uses the enable override, the tool `contrast`, and the active nonfiction project (C2, A6).
- Command: `cd apps/api && npx vitest run test/packs/tier2-3-shapes.test.ts` (step 9).
- Pass: the steps of step 7 hold: the tool is absent from the function list and answers `TOOL_DISABLED` (409) before enabling; after enabling, it is in the list and execute answers 200 with kind `draft`, and the mock records one request.

**AC 4: Manual eval cases added.** (U line 34)
- Test file: `scripts/eval-case-tier2-3-shapes.test.mjs` (new). Test name: `AC 4: the nine tier 2-3 eval cases are in the eval data and use the documented keys and values`.
- Content: for each of the nine ids (kebab case) and its tool name, the file `scripts/eval-agent/cases/<id>.json` parses; its keys are exactly `expect`, `intent`, `sample`; `sample` is `nonfiction`; `intent` is a non-empty string; `expect.tools` is `[tool]`; `expect.reason` is `completed`; `expect.citations` is `present`. The test reads the case files and runs no model.
- Command: `node --test scripts/eval-case-tier2-3-shapes.test.mjs` (steps 11 and 13).
- Pass: one test passes. The real-model run of the nine cases is not part of this test (open point 4).

## 6. Agreement with the downstream units and the sibling plan

- **GNP-23 (remix; `blocked_by` names GNP-22, `units/GNP-23-remix.md` line 7).** Its `targetShape` enum must list every shipped draft tool except `remix`. All nine of this unit's tools have `output: draft`, so the enum takes all nine names, exactly: `contrast`, `profile`, `zoom`, `reader_challenge`, `framework_builder`, `method_first`, `timeline`, `flashback`, `stockdale_tension`. `checkRemix` reads every draft tool with no enabled filter, so the nine count while disabled. The names are final once merged (M6). GNP-23 is not changed.
- **GNP-24 (remaining-shapes gate; `blocked_by` names GNP-22, `units/GNP-24-remaining-shapes-gate.md` line 7).** Its criterion 1 needs "the twelve nonfiction shapes" shipped disabled. This unit supplies nine and GNP-21 supplies three, so the total is twelve, and both sets are disabled. Its criterion 2 needs one golden test per tool, which section 5 AC 2 provides for the nine. Its criterion 4 (enabling a disabled shape makes it callable by the agent and available as a canvas node) needs the enable path, which AC 3 tests for one tool; the canvas node is GNP-24's to check. Agreed.
- **GNP-21 (sibling, planned; `parallel_with` names GNP-21 in this unit's front matter; `unit/GNP-21` APPROVED).** Shared: the `enable` option of `golden.kit.ts`, and the README bullet. GNP-21 owns the option (its C2; G2 here). Merge order: (a) GNP-21 first (the likely order: its branch is approved), then this plan skips steps 3a and 3c (step 3b checks the contract and the bullet); (b) this plan first, then GNP-21 skips its own steps 7 and 8, by its step 0, which runs the same four checks. Step 3a's text equals GNP-21's steps 7 and 8, so in either order one copy of the option remains, with the same text. No other file is shared. No name collides: `tier2-3-shapes` differs from `tier2-shapes`; the golden folders, scenarios and eval ids differ. The verb list is not shared in effect (G3). GNP-22 does not change `checks.ts`. Revision 2: GNP-21 is now done and on main (`4178985`), so order (b) no longer arises. `unit/GNP-22` applied step 3a on base `a12af54`; its edit of the two files is byte-identical to GNP-21's, so the orchestrator's rebase keeps one copy (identical changes on both sides), and step 3b's four checks then hold on the rebased branch.
- **GNP-15 (draft; `scene_builder` enabled).** It changes `propose_graph/recipe.golden.json` (its M7); this unit does not (G4). It adds `pack-scene_builder.json` and `scripts/eval-agent/cases/scene-builder.json`; no name collides. It changes no e2e file (its open point 2), so no file is shared. Its section 2 reads line 23 at 3200 px; after this unit the value is 6000. Its step 14 (the four `/tools` specs, no spec change) then runs with a larger margin, and its one row fits (C6). Its own rule for a picker off screen (raise the height in `test.use` only) is the rule this plan applies.
- **GNP-19 and GNP-20 (`parallel_with` names GNP-22; the relation is symmetric).** No file is shared. GNP-20 is done.
- **GNP-02, GNP-06 and GNP-12 (done; the `blocked_by` of GNP-22).** Their `unblocks` lists name GNP-22, so the inverse holds. This plan uses the golden harness as it is (plus the option of GNP-21), the `person` and `claim` kinds, and the gate. No change to them.
- **E2E `/tools` list (A7) and PLT-23 (planned).** The nine new rows add to the list above the person picker of `tools-preview.e2e.ts`. GNP-21's three rows are on main; GNP-15 adds one and GNP-23 (`remix`) one. The effect is cumulative. With the nine rows the picker was measured at y 3767.4 in the 3200 px viewport, so this plan raises line 23 to 6000 px (C6, step 12a), with the margin of C6 for the rows still to come. PLT-23 (planned; `unit/PLT-23` has no commit) changes the comment lines 20 to 22 only and does not change line 23. The two changes are correct in either order: PLT-23's comment names no height, and this plan keeps lines 20 to 22. Their hunks are adjacent, so the unit that lands second gets a rebase conflict in this file (checked with a git test, section 2). The resolution, in either order: lines 20 to 22 from PLT-23's text (`plans/PLT-23.md` section 4), line 23 from this plan (`height: 6000`), no other line. PLT-23's statement "Keep the viewport of tools-preview at 3200 px" means that PLT-23 does not change line 23; its reason (the margin of GNP-15 and GNP-16) still holds with 6000. If PLT-23 lands first, its removal of the two leftover user rows only adds margin here.
- **Eval runner (`scripts/eval-agent/`).** The nine case files are data. The runner and its README are not changed. The judge's rules (`run.mjs` lines 361 to 385) apply as they are. A disabled tool is not offered to the agent (`catalog.service.ts`), which is why the cases need the tool enabled to be run (open point 4).
- **Agent loop (AGL).** The same reason: the function list holds enabled tools only. AGL-11 and TRG-17 are not affected by this unit.

## 7. Open points

All points are settled by the reviser; none is open for the Navigator, and none changes a unit, a criterion or a settled decision.

1. **The GNP-21 `enable` contract. Closed.** GNP-21 is `planned` at `e163977`, its C2 is quoted in G2, and its approved branch carries exactly that text. Step 3a equals GNP-21's steps 7 and 8.
2. **Merge order. Settled: either order, no unit change.** Steps 0 and 3 handle either order (section 6). The second unit to merge keeps one copy of the option and takes the merged version of `golden.kit.ts` on rebase. Adding GNP-21 to this unit's `blocked_by` is not done: a correct plan exists without it, so the first YAGNI condition fails.
3. **The `/tools` list and the e2e person picker (A7; GNP-21's A10). Settled in revision 2: option (b), raise the height in `test.use` (line 23) to 6000 px (C6, step 12a).** Revision 1 chose (a), no e2e file change, with a PLAN DOES NOT WORK report if the picker is off screen. That report came (picker y 3767.4, chip y 3161.6, viewport 1280 by 3200), so (a) gives no correct plan: AC 1 to AC 4 pass, but the unit cannot leave TRG-05 C2 failing, and a C2 change would weaken a test. (b) is the rule of `plans/TRG-13.md` step 11, `plans/TRG-14.md` step 9 and GNP-14 C12, and the rule that GNP-15 open point 2 names for this case. It changes no step, assertion or drag of C2, so C2 is not weakened. Module line 89 ("the Playwright e2e is unchanged; this module adds no e2e step") stays as it is: the change adds no e2e step and no assertion, and GNP-14 of this module made the same kind of change under it. Rejected: a scroll or a changed drag in C2 (GNP-14 rejected both; they change the test); a filter of the `/tools` list (product code, outside this unit); a Playwright config change (wider than one line of one spec). The cost of (b): a one-file rebase conflict with PLT-23 on adjacent lines, resolved as section 6 states. No criterion and no settled module decision changes, and no unit changes, so this is not a Navigator point.
4. **The nine eval cases cannot be run yet.** Settled: AC 4 is met by the data and its data test (G7). The runner has no per-case enable key and boots a fresh library (`run.mjs`, GNP-21 section 2), and the agent is offered only enabled tools. A run before enabling records the `tools` expectation as failed, and the exit code stays 0 (`scripts/eval-agent/README.md` lines 81 to 86). The plan reads AC 4 under G7: the case in the eval data and its data test. The real-model run is recorded as not run, with the reason of GNP-21 C12. Who runs it and when: a person with a local model server, once the runner can enable a tool or the author ships one enabled. No unit carries it (GNP-12 criterion 4 covers the four workhorses only).
5. **The prompts and fixtures are first drafts (C4).** Settled: kept as written. The unit gives no shape steps. The author may tune them through copy-on-write (M line 54).
6. **Optional inputs (C5). Settled: not required.** `zoom.bigPicture` and `framework_builder.claimIds` are not in `required`, because the unit's table marks every other required input with "required" and these two without it (U lines 20 and 22). This is the literal reading; it adds no requirement. Both valid calls still pass the two inputs, so the goldens show them rendered.
7. **The function list seam (AC 3).** Settled: the functions route. The test reads `GET /api/tool-registry/functions` after activating a nonfiction project, because the route filters by the active project's genre pack. The alternative is the `tools` of an Agent-loop chat request as the mock records it (`agent-loop-narrative.test.ts`, T1). The functions route is the simpler seam and matches the unit's words.
8. **One test for AC 2 with nine bodies (G6). Settled.** The unit says "one golden test per tool". The repository rule (GNP-14 C5; GNP-21 C11) gives one test per criterion, with one golden body per tool, so each of the nine tools has its own golden case and the criterion has one test.
9. **Assumed facts A1 to A9** (section 2) are each checked by the step named there. None is blocking unless a step fails. A7 has its own failure route (step 13: a logged target at or above y 5000).

Unit change: none. The planner and the two revisers changed no unit; this plan needs none (a correct plan exists with the unit as written, so the first YAGNI condition fails for every action).

## 8. Review parts

The plan has two parts. Each step of section 4 and each test of section 5 is in exactly one part.

- **Part 1 — the nine specs, the `enable` option, the golden and enable-path tests, the pack checks, and the gates.** Steps 0 to 10, 12, 12a, 13 and 14. Tests: AC 1 (`packages/packs/test/tier2-3-shapes.test.ts`, "AC 1: the nine tier 2-3 tools pass the suite on the real packs, ship with enabled false, and have output draft"), AC 2 and AC 3 (`apps/api/test/packs/tier2-3-shapes.test.ts`, the two `it`s named in step 7). Files: the nine specs, the nine fixtures and nine goldens, the nine scenarios, `apps/api/test/packs/golden.kit.ts` and `packages/packs/test/README.md` (only if step 3a ran), and the two test files. The reviewer checks: that the code changes only the files of section 3; that, if `golden.kit.ts` changed, its diff is GNP-21's C2 text exactly (G2) and the golden cases pass `enable: true` with no other enable step; that the five common blocks equal `cold_open.yaml` lines 7 to 33; that `propose_graph/*` and `checks.ts` are unchanged (step 12; G3); that the only e2e change is line 23 of `e2e/specs/tools-preview.e2e.ts`, height 3200 to 6000, with lines 20 to 22 and every step and assertion unchanged (step 12a; C6), and no temporary log line is committed; and that the report gives the step 13 e2e result (counts, TRG-05 C2 passing, and the two logged targets below y 5000) or "e2e not run".
- **Part 2 — the eval cases.** Step 11. Test: AC 4 (`scripts/eval-case-tier2-3-shapes.test.mjs`, "AC 4: the nine tier 2-3 eval cases are in the eval data and use the documented keys and values"). Files: the nine case files in `scripts/eval-agent/cases/` and the data test. The reviewer checks that the implementer report records the real-model run as not run, with the reason of open point 4.
