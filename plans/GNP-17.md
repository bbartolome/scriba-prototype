---
id: GNP-17
status: planned
---
# GNP-17 plan — plot_manager check tool, golden test and eval case

Batch: [GNP-17] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `25578b3` (HEAD when read; the working tree was clean). The unit file was read in full (lines 1 to 21). It has no change note: it has no "Moved to", "Removed by revision", "Loosened by" or "Reworded by" line, and `git log -- units/GNP-17-plot-manager.md` shows only the two repository-wide unit commits `2fed3f4` and `098add9`. `plans/DECISIONS.md` has no line that names GNP-17 (`grep -n "GNP-17"`, run at `c52b2b4`; the 15 lines added since, read as a diff at `25578b3`, concern PLT-23 only).

The planner changed no file except this one, committed nothing except this one, and ran no build, test, lint or npm command. It used `node -e` only to read JSON.

**Revision 1 (Opus reviser, 2026-11-19, at main `7be006d`).** Every citation of this plan was checked against the files on main at `7be006d`; the ones that were right are kept as they are. Corrections: D6 (the DECISIONS entry it cites is a decision for GNP-04, used by GNP-20 as a precedent); A1 and A2 moved to the facts checked (the contracts are built on main and the fixture's graph parses); T2 now parses the fixture's `outline` with `graphFileSchema` in the test itself, so the words "a story-graph JSON fixture" of criterion 1 are tested, not only checked by hand; step 0 base `7be006d`; step 10 counts two `plot_manager` golden files, not three; step 12 (root gates) now keeps the gate strict, as GNP-16 step 13 does, and does not tolerate the intermittent `tool-registry-save.test.ts` failure (an open Navigator question); step 13 runs the four `/tools` specs in one run, as GNP-16 step 14 does, so the user rows of `tools-editor.e2e.ts` are in the list; step 15 names the paths; open point 1 is settled as C13 (no new relation); section 6 names the `unit/GNP-15` branch; a section "Review parts" is added. No unit file was changed: nothing in GNP-17 or GNP-19 is in the way of a correct plan.

## 1. Decisions this plan obeys

Labels: **U** = the unit; **M** = `modules/genre-packs.md`; **D** = a settled decision of another plan or of the code; **C** = a smaller choice made here (the simplest option, recorded).

- **U1 Tool, output, enabled.** `packages/packs/fiction/tools/plot_manager.yaml`, name `plot_manager`, output `check`, `enabled: true`. Source: unit line 15; M output kinds, module line 52.
- **U2 Description.** Verbatim: "Check beats, setups and payoffs for gaps and loose ends." It is 56 characters (under `DESCRIPTION_LIMIT` 120, `packages/packs/test/checks.ts` line 44) and starts with `check`, the first entry of `VERBS` (checks.ts line 49; the rule of module line 45). Source: unit line 15.
- **U3 Inputs.** `outline` (text port, required) and `entityIds` (entity port list). No other input. Source: unit line 16. A tool whose output is `check` takes only the subset that makes sense, as listed per unit (module line 66). A beat or scene is content on a text port, not an entity (module line 53, which names Plot manager).
- **U4 Prompt.** List findings: each setup without a payoff, each payoff without a setup, the beat gaps and the loose ends, citing story-node labels or entity IDs, with no rewriting. Check results show inline and in logs and are not written by output nodes in v1. Source: unit line 17. The output-node rule is in code: `UNWRITABLE_OUTPUT_KINDS` holds `claims` and `check` (`apps/api/src/modules/graph-runner/graph-validation.ts` line 16).
- **U5 Criteria.** Two criteria, copied in section 5 (unit lines 20 and 21).
- **M1 Common inputs are for draft tools only.** The identity check runs on the draft tools: `checks.ts` line 97 filters `output === 'draft'` and line 98 calls `checkCommonInputs(drafts)`. So `plot_manager` has none of the five common inputs. Source: module line 56 (heading: "every draft-producing narrative tool").
- **M2 Entity kinds.** `x-scriba-entity-kinds` only where the input means a definite set of kinds (module line 66). `entityIds` takes none: a beat can name a character, a place or a rule. Same as `cold_open`'s `entityIds` (cold_open.yaml lines 13 to 19).
- **M3 Golden convention.** One mock scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json` (unit GNP-02 line 20); fixture and golden under `packages/packs/test/golden/<tool>/`; the kit reads `<name>.fixture.json` (`apps/api/test/packs/golden.kit.ts` lines 129 and 133) and uses scenario `pack-${tool}` (line 142). Goldens change only in the PR of the prompt edit (module line 87).
- **M4 Testing principles.** External behaviour only; no wording assertions beyond the golden snapshot (module line 85); no e2e step added (module line 89); manual eval cases go into the Agent loop's eval data, and no model runs in CI (module line 90).
- **D1 Blockers.** GNP-02 and GNP-13 are both `status: done` (`plans/GNP-02.md` line 3; `plans/GNP-13.md` line 4). The unit's `blocked_by` (unit line 7) is met. The queue agrees (`plans/QUEUE.md` line 11).
- **D2 The check-tool precedent.** `core/throughline_check` (GNP-20, done) is the nearest shape: output `check`, two text inputs, a golden, an eval case and a tool-list test. Its shape is copied here where the unit allows (`plans/GNP-20.md` D1 to D11; `packages/packs/core/tools/throughline_check.yaml`).
- **D3 Name and test precedent.** Golden test file, fixture case and eval data test follow GNP-16 and GNP-20 (`plans/GNP-16.md` C1 and section 3.4; `plans/GNP-20.md` section 3, steps 5 and 9).
- **D4 Story-graph file.** A story node is `entity`, `scene` or `beat` with `label`, optional `path` and `position`; an edge has `from`, `to` and a free-text `relation`, with the vocabulary `order`, `causality` and `containment` (`packages/contracts/src/graph-runner/graph.ts` lines 39 to 66; `constants.ts` line 37). The graph file is `graphFileSchema` (graph.ts line 183). The canonical file text is `JSON.stringify(value, null, 2)` plus a final newline (`packages/contracts/src/graph-runner/examples.ts` line 5).
- **D5 Sort order of the catalogue.** `[...names].sort()` (`apps/api/src/modules/tool-registry/catalog.service.ts` line 467). `plot_manager` sorts after `numbers_to_people` and before `propose_graph` (C9).
- **D6 Prompt skeleton for a non-draft tool.** The module skeleton (module lines 46 to 50) is followed in part: a role line, the material, the steps and the constraints. The `TK` and style-profile clauses are left out, and the citation clause is kept only in the form the unit asks for (entity IDs as `[@id]`, C6), because this tool drafts no factual sentence and has no style input. The Navigator made this choice for GNP-04, a non-draft tool: `plans/DECISIONS.md` line 5144, entry "2026-11-16 — GNP-04, GNP-07 — Navigator decisions", "GNP-04 point 2, skeleton constraint 4: option (a). Keep only "use only the material" ... Drop the citation, `TK` and style-profile/length clauses." (checked by the reviser). That decision was not made for GNP-20 or GNP-17. GNP-20 (done, approved) applied it to a `check` tool as a precedent and says so (`plans/GNP-20.md` D5, line 23: "that decision is a precedent for GNP-20, not a decision recorded for it"). This plan follows the same precedent; "use only the material" is kept ("Use only the outline and the material above").
- **C1 Names.** Tool `plot_manager`; file `plot_manager.yaml`; golden folder `packages/packs/test/golden/plot_manager/`; fixture case `late-boat` (`late-boat.fixture.json`, `late-boat.golden.json`); scenario `pack-plot_manager.json`; golden test file `apps/api/test/packs/plot-manager.test.ts`; eval case id `plot-manager` (`scripts/eval-agent/cases/plot-manager.json`); data test `scripts/eval-case-plot-manager.test.mjs`. The id matches `^[a-z0-9][a-z0-9-]*$` (`scripts/eval-cases.test.mjs` line 13; `scripts/eval-agent/run.mjs` line 35).
- **C2 Property order.** `outline`, then `entityIds`. This fixes the order of the catalogue ports (`template.ts` lines 557 to 568, as cited by GNP-16 C2) and the order of `sourcesUsed`.
- **C3 entityIds block.** Copied as it is in `cold_open.yaml` lines 13 to 19 (title "Entities", items string, `x-scriba-type: entity`, `x-scriba-port: true`), with no kinds (M2).
- **C4 outline block.** A text port with the hints of `coreIdea` in `cold_open.yaml` lines 7 to 12 (`x-scriba-type: text`, `x-scriba-port: true`, `x-scriba-control: textarea`), title "Outline". It is required (unit line 16).
- **C5 invalidWithout.** `outline`. The kit drops it for the invalid call (`golden.kit.ts` line 205 and `goldenCase` lines 241 to 259). The kit makes one invalid call, so no second call is needed here (unlike GNP-16, which needed one for `characterIds`).
- **C6 Prompt constraints.** Findings are cited this way: each beat or scene by its label in double quotes, exactly as the outline spells it; each entity by its ID in the form `[@id]`, the module's citation form. No `TK` line, because no fact is drafted. Output format is the executor's `check` system message (`executor.service.ts` lines 39 and 40): one finding per line, and `No findings.` when there are none.
- **C7 Fixture.** The `outline` argument is the text of a story graph file (D4), with five nodes and four `order` edges, written as in 3.2. The two entities are the two character entries of `packages/packs/test/golden/dialogue/keepers-exchange.fixture.json` (GNP-16, on main), copied as they are. Original text; no real person.
- **C8 Mock reply.** Two findings, one line each, in 3.3.
- **C9 Catalogue line.** One line, between `- numbers_to_people:` and `- propose_graph:` (D5), in the format of the lines in section 3.6.
- **C10 Golden test timeout.** 60000 ms, as `throughline-check.test.ts` uses for its one golden case.
- **C11 Eval case.** Keys `sample`, `intent`, `expect` only; `expect` holds `reason` and `tools`. `citations` is left out, as GNP-16 C8 and GNP-20 D9 do: module line 90 names a citation check for the workhorses and a voice check for Dialogue, and `plot_manager` has neither. `sample` is `fiction`, which GNP-18 adds to `examples/samples.yaml`; the data test does not need that entry, and a real run waits for it (GNP-16 C8 says the same).
- **C12 End-to-end.** No e2e file changes (module line 89). The `/tools` list grows by one fiction row, and the viewport of `e2e/specs/tools-preview.e2e.ts` line 23 is 3200 px, which leaves room for it (`plans/GNP-14.md` C12 and line 466). The e2e check is step 13 of section 4.
- **C13 No setup or payoff relation (open point 1 of the draft, settled by the reviser).** This unit adds no relation to the story graph and changes no contract. The unit asks only that the prompt find setups without payoffs and payoffs without setups (unit line 17); it names no edge, relation or graph change, and its criterion 1 needs only a story-graph JSON fixture (unit line 20). The module needs none either: an edge's `relation` is free text, and "Any other non-empty string is allowed as a relation" (`packages/contracts/src/graph-runner/constants.ts` lines 33 to 41; `graph.ts` lines 63 and 68), and the module adds no new vocabulary (module line 99 replaces the beat entity type with story nodes, nothing more). So an author can already write a `setup` or `pays off` edge, and the prompt reads every edge with its relation as written (its step 1). The simplest option the module allows is to add nothing. Not a Navigator point: no unit text asks for a relation.

## 2. Facts checked and facts assumed

### Facts checked

Unit, module, index and queue:
- `units/GNP-17-plot-manager.md`: front matter lines 2 to 9 (`blocked_by: [GNP-02, GNP-13]` line 7; `parallel_with: [GNP-12, GNP-14, GNP-15, GNP-16, GNP-18]` line 8; `unblocks: [GNP-19]` line 9); Spec lines 15 to 17; the criteria heading at line 19; the criteria at lines 20 and 21.
- The inverse rule (`units/README.md` line 64): `unblocks` of GNP-02 (`units/GNP-02-golden-harness.md` line 9) and GNP-13 (`units/GNP-13-fiction-entity-types.md` line 9) name GNP-17; `units/GNP-19-fiction-gate.md` line 7 names GNP-17 in `blocked_by`, and no other unit does. Symmetry: `parallel_with` of GNP-12 (line 8), GNP-14 (line 8), GNP-15 (line 8), GNP-16 (line 8) and GNP-18 (line 8) each name GNP-17. GNP-17 is not paired with any unit it depends on, directly or transitively (GNP-19 is not in its `parallel_with`).
- `modules/genre-packs.md`: line 42 (tool-spec content rules heading), line 43 (fields), line 44 (names), line 45 (descriptions), lines 46 to 50 (prompt skeleton), line 52 (output kinds), line 53 (scene and beat on text ports; Plot manager named), lines 56 to 64 (common inputs, draft tools), line 66 (entity kinds; subset for `check`), line 85 (no wording assertions), line 87 (golden tests), line 89 (system seam), line 90 (manual eval cases), line 99 (scene and plot beat entity types replaced by story nodes).
- `units/README.md`: unit format lines 34 to 57; blocker notation lines 59 to 65; the `phase:fiction` row at line 109.
- Downstream units: `units/GNP-19-fiction-gate.md` line 7 (`blocked_by` names GNP-17), line 20 (criterion "All five tools pass the validation suite; every entity input names an existing entity type"), line 32 (demo step 6, "check my beats for loose ends"). `units/GNP-18-fiction-sample.md` line 7 (no GNP-17 in `blocked_by`) and line 8 (`parallel_with` names GNP-17); its Decisions give the sample's story graph (a label-only beat and a file-backed beat).
- `plans/DECISIONS.md`: no line names GNP-17 (checked at `c52b2b4`; the 15 lines added at `25578b3` are the PLT-23 entry, whose e2e facts are used in section 4 step 13).

Code and contracts, on main at `25578b3` (no file of these paths changed since `c52b2b4`, checked with `git diff --name-only`):
- `packages/packs/fiction/tools/` holds `character_builder.yaml`, `dialogue.yaml` and `world_builder.yaml`; no `plot_manager.yaml`; no `.gitkeep` (`ls -a`).
- `packages/packs/fiction/entity-types/` holds `character.yaml`, `place.yaml` and `world-rule.yaml` (GNP-13).
- `packages/packs/test/golden/` has no `plot_manager/`; `e2e/fixtures/mock-openai/scenarios/` has no `pack-plot_manager.json`; `scripts/eval-agent/cases/` has no `plot-manager.json`; `apps/api/test/packs/` has no `plot-manager.test.ts`; `scripts/` has no `eval-case-plot-manager.test.mjs`.
- `packages/packs/test/checks.ts`: `COMMON_INPUTS` line 35; `DESCRIPTION_LIMIT` line 44; `VERBS` lines 48 to 67 (`check` at line 49); `contentChecks` lines 83 to 102; the draft filter line 97; `checkCommonInputs(drafts)` line 98; `checkDescription` on every tool line 99.
- `packages/packs/test/real-packs.test.ts`: `it('the suite passes on the real packs')`, which asserts no error from `lintPacks` and `contentChecks(REAL_PACKS)` equal to `[]`.
- `packages/packs/package.json` line 7 (`test`: builds contracts and API, then `vitest run`). Root `package.json` line 25 (`test`), line 26 (`lint`), line 28 (`lint:packs`, builds contracts and API, then `scripts/lint-packs.mjs`), line 30 (`e2e`).
- `apps/api/test/packs/golden.kit.ts`: `PACKS_ROOT` line 29; `GOLDEN_ROOT` line 38; `goldenDir` line 129; fixture read line 133; scenario `pack-${options.tool}` line 142; `goldenCase` lines 241 to 259; the invalid call and its message check (the message must contain `invalidWithout`, line 255); one model call (line 256); then `check` (line 257).
- `apps/api/test/packs/throughline-check.test.ts`: the golden `it` with a 60000 ms timeout and the `renderedPrompt` helper; the `X2` tool-list test, which fetches `TOOLS_ROUTE` with `SCRIBA_PACKS_DIR` and parses `toolListSchema`.
- `scripts/eval-case-throughline-check.test.mjs`: the data test pattern (`node:test`, one case file, documented keys and values).
- `scripts/eval-cases.test.mjs`: `CASE_ID` line 13, `CASE_KEYS` line 14, `EXPECT_KEYS` line 15; it reads every `*.json` in `scripts/eval-agent/cases/` (its `readdirSync` filter) and asserts keys and values, with no count. `scripts/eval-agent/run.mjs`: `CASE_ID` line 35, `CASE_KEYS` line 36, `EXPECT_KEYS` line 37.
- `apps/api/src/modules/tool-registry/executor.service.ts`: `OUTPUT_SYSTEM_MESSAGES` lines 31 to 40 (`check` at lines 39 and 40: "Return only the findings, one per line, each naming the problem and where it occurs. If there are none, return the single line: No findings."); `sources` lines 159 and 160 (entity refs, style refs left out). The sources are computed for every output kind; the code does not branch on the kind there.
- `apps/api/src/modules/tool-registry/catalog.service.ts` line 467: `[...names].sort()`.
- `apps/api/src/modules/tool-registry/packs.ts`: the origin is passed per pack (lines 181 and 196).
- `packages/contracts/src/tool-registry/constants.ts` line 52: `TOOL_ORIGINS` is `core`, `nonfiction`, `fiction`, `user`. `OUTPUT_KINDS` at line 17 includes `check`.
- `packages/contracts/src/graph-runner/graph.ts`: `storyNodeSchema` line 39, `storyEdgeSchema` line 64 (with the free-text `relation` comment at line 63), `storyGraphShapeSchema` line 118, `graphFileSchema` line 183. `constants.ts`: `RELATION_VOCABULARY` line 37. `examples.ts` line 5 (canonical text) and lines 47 to 80 (a story graph with beat nodes and `order` edges).
- `apps/api/src/modules/graph-runner/graph-validation.ts` line 16 (`UNWRITABLE_OUTPUT_KINDS` = `claims`, `check`) and line 403 (its use).
- `packages/packs/nonfiction/tools/cold_open.yaml`: `coreIdea` hints at lines 7 to 12; `entityIds` at lines 13 to 19 (line 19 is `x-scriba-port: true`).
- `packages/packs/core/tools/throughline_check.yaml`: the `check` precedent (`output: check`, `enabled: true`, two text ports, `required: [chapterText, coreIdea]`).
- `packages/packs/test/golden/propose_graph/recipe.golden.json`: `messages[1].content` holds nine catalogue lines on main, one per line, in this order: `character_builder`, `cold_open`, `dialogue`, `mystery_question`, `myth_buster`, `numbers_to_people`, `propose_graph`, `throughline_check`, `world_builder`. The lines are `- <name>: <description> Output: <kind>. Inputs: <port> (<type>, <single|list>, <required|optional>); ...`.
- `packages/packs/test/golden/dialogue/keepers-exchange.fixture.json` exists on main (GNP-16).

Other plans and the e2e run:
- `plans/GNP-16.md` (done): section 3.4 (the test file pattern), section 3.5 (the eval case and data test), section 4 step 14 (the `/tools` e2e check), and the rebase rule for the recipe golden at its line 335.
- `plans/GNP-20.md` (done): D5 (check prompt), D7 and D8 (golden and catalogue), D9 (eval case); line 146 (remix's `targetShape` enum lists draft tools only, so a `check` tool is not in it); line 148 (the catalogue order of the fiction tools).
- `plans/GNP-14.md`: C12 (line 51) and line 466 (3200 px leaves room for the rows of GNP-15, GNP-16 and GNP-17).
- `plans/GNP-15.md` (draft, `status: draft` at line 3): line 361 names the same file set for GNP-17 that this plan names (`plot_manager.yaml`, golden, scenario, test, eval case, one catalogue line between `numbers_to_people` and `propose_graph`).
- `plans/GNP-02.md` line 134: the golden contract for GNP-14 to GNP-17 (the helper takes any output kind; each tool names its own required argument in `invalidWithout`). This plan follows it, and passes entities too (C7).
- `plans/DECISIONS.md`, the 2026-11-19 PLT-23 entry (added at `25578b3`, read as a diff): on main at `c52b2b4`, `e2e/specs/tools-preview.e2e.ts:169` ("TRG-05 C2") passes; the full e2e run is `npm run e2e -w @bbartolome/scriba-e2e -- --trace off`; the phone specs fail at that base (not the tools specs).

Checked by the reviser at main `7be006d` (the only commit after `25578b3` is this plan):
- `plans/DECISIONS.md` line 5144 (entry "GNP-04, GNP-07 — Navigator decisions"): GNP-04 point 2, option (a), drops the citation, `TK` and style-profile/length clauses for GNP-04. `grep -n "GNP-17" plans/DECISIONS.md` finds nothing. `grep -n "GNP-20"` finds lines 5155, 5260, 5854 to 5859 and 5870 to 5872 (its review and rebase records), none of which records a prompt decision for GNP-20.
- `plans/DECISIONS.md` lines 6745 to 6756: GNP-15 stopped at its root `npm test` on the intermittent `apps/api/test/tool-registry-save.test.ts` "C1" failure; the reviser replied NAVIGATOR on whether a gate may tolerate it (options (a) to (d)); no decision is recorded (nothing after line 6756 names GNP-15). `plans/GNP-16.md` step 13 (line 339) keeps its gate strict for that failure.
- `git log main..unit/GNP-15`: one commit `f3ccbf2` (merge base `ddb608c`), which changes `packages/packs/test/golden/propose_graph/recipe.golden.json` by one line (`git show --stat f3ccbf2`).
- `apps/api/test/packs/throughline-check.test.ts` lines 1 to 11 (imports, including `rmSync` from `node:fs`), lines 14 to 30 (`renderedPrompt`), lines 32 to 54 (the golden `it`, timeout 60000), lines 56 to 84 (X2). `apps/api/test/packs/dialogue.test.ts` lines 14 and 119 (reads a fixture through `GOLDEN_ROOT`); `apps/api/test/packs/propose-graph.test.ts` line 3 (imports `graphFileSchema` from `@bbartolome/scriba-contracts/graph-runner`).
- `apps/api/test/packs/golden.kit.ts` lines 29 and 38 (`PACKS_ROOT`, `GOLDEN_ROOT`, both exported), 129, 133, 136 to 140 (the fixture must hold the `invalidWithout` argument), 142, 203 to 211 (the invalid call drops only that key), 241 to 259.
- `apps/api/src/modules/tool-registry/template.ts` lines 557 to 568 (`formatCatalogEntry`: the catalogue line format of 3.6), line 533 ("Nothing is escaped", so the JSON quotes of the outline render as they are), line 596 (an entity renders as `<type> <ref> (<path>)` then its content).
- `packages/packs/test/checks.ts` lines 224 to 257 (`firstWord` lower-cases "Check"; the description is 56 characters, `wc -c`), line 100 (`checkRemix`, inactive without `core/tools/remix.yaml`; it counts draft tools only).
- `scripts/eval-cases.test.mjs` lines 25 to 53: every case file is checked for its id, keys, `reason` and `citations`; no `sample` list. Three case files already use `sample: fiction`.
- Root `package.json` line 25: `npm test --workspaces && node --test 'scripts/*.test.mjs'`, so the new data test runs in the root gate.
- `e2e/playwright.config.ts` lines 10 and 13 (`testDir: './specs'`, `workers: 1`); `plans/GNP-14.md` F5 (line 102): `tools-editor.e2e.ts` leaves two user rows that `tools-preview.e2e.ts` sees in a run of both.

### Facts assumed

- **A1 (checked by the reviser).** The fixture's story graph of 3.2 validates under `graphFileSchema`: at main `7be006d`, with `packages/contracts/dist/graph-runner/` built in the main tree, `node -e` with `require('@bbartolome/scriba-contracts/graph-runner').graphFileSchema.safeParse(graph).success` printed `true` (Node v26.13.0). A fresh worktree has no `dist`, so step 4 repeats the check after step 1's build, and T2 checks it in the test (3.4).
- **A2 (checked by the reviser).** `require('@bbartolome/scriba-contracts/graph-runner')` resolves from the repository root in `node -e` (the same run as A1; `packages/contracts/package.json` lines 30 to 32, the `./graph-runner` export).
- **A3.** `npm run e2e -w @bbartolome/scriba-e2e` accepts spec file names after `--`; GNP-14 step 16 and GNP-16 step 14 use that form (`... -- tools-preview.e2e.ts --trace off`; Playwright's `testDir` is `./specs`, `e2e/playwright.config.ts` line 10). Step 13 records the exact command it used.
- **A4.** The template renders an empty `{{#each entityIds}}` as nothing, as `cold_open` relies on. This plan's golden has entities, so the empty case is not covered by a test.
- **A5.** Prettier leaves the YAML block scalar of the prompt and the JSON files as written (GNP-16 A4). Steps 2, 4, 5 and 7 check it with `prettier --check`.
- **A6.** The tool list shows `plot_manager` with origin `fiction`, because the pack folder is `fiction` (`packs.ts` passes the origin per pack; `TOOL_ORIGINS` line 52). The X1 test checks it.

## 3. Files to change

Only the paths below change, with the content of 3.1 to 3.6. `plans/GNP-17.md` is written by the planner and not changed by the implementer.

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/fiction/tools/plot_manager.yaml` | new | the tool spec (3.1, step 2) |
| `packages/packs/test/golden/plot_manager/late-boat.fixture.json` | new | the fixture (3.2, step 4) |
| `packages/packs/test/golden/plot_manager/late-boat.golden.json` | created by the update run (step 7) | the golden request |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed by the update run (step 10): one inserted line | the catalogue gains `plot_manager` (3.6) |
| `e2e/fixtures/mock-openai/scenarios/pack-plot_manager.json` | new | the scripted reply (3.3, step 5) |
| `apps/api/test/packs/plot-manager.test.ts` | new | the tests of criterion 1 (golden, T2) and the tool-list test (X1) (3.4, step 6) |
| `scripts/eval-agent/cases/plot-manager.json` | new | the eval case (3.5, step 9) |
| `scripts/eval-case-plot-manager.test.mjs` | new | the test of criterion 2 (T3) (3.5, step 9) |

Not changed: every file under `packages/packs/{core,nonfiction}/`; `packages/packs/fiction/{entity-types,tools/character_builder.yaml,tools/dialogue.yaml,tools/world_builder.yaml}`; `packages/packs/package.json`; `packages/packs/test/*.ts` and `packages/packs/test/README.md`; `packages/packs/test/golden/propose_graph/story.*`; `packages/packs/test/golden/{dialogue,character_builder,world_builder,throughline_check,cold_open}/**`; `apps/api/src/**`; `apps/api/test/packs/golden.kit.ts` and the other packs tests; `apps/api/vitest.config.mts`; `apps/api/test/packs/propose-graph.test.ts`; `packages/contracts/**`; `e2e/**` (no spec, no server, no other scenario); `scripts/eval-cases.test.mjs`; `scripts/eval-agent/run.mjs`, its README and its test; `examples/**` (GNP-18 owns them); `package.json`; `package-lock.json`; `.prettierignore`; `units/**`; `modules/**`; `plans/**` (except this file, which the planner owns).

### 3.1 The tool spec `packages/packs/fiction/tools/plot_manager.yaml`

The `entityIds` block is copied from `packages/packs/nonfiction/tools/cold_open.yaml` lines 13 to 19 (C3). The `outline` block takes the hints of `coreIdea` (C4).

```yaml
schemaVersion: 1
name: plot_manager
description: Check beats, setups and payoffs for gaps and loose ends.
inputs:
  type: object
  properties:
    outline:
      type: string
      title: Outline
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
  required: [outline]
output: check
enabled: true
prompt: |
  You check the beats of a fiction story for gaps and loose ends: setups that never pay off, payoffs with no setup, and threads that no beat resolves.

  Outline:
  {{outline}}

  Material:
  {{#each entityIds}}
  {{entity this}}
  {{/each}}

  Steps:
  1. Read the outline. A story graph file lists its beats and scenes by label and its edges by relation. A beat list has one beat on each line.
  2. A setup is a beat that plants a detail the story needs later. A payoff is a beat that resolves an earlier setup. Find each setup with no later payoff, each payoff with no earlier setup, each beat that depends on a fact no earlier beat supplies, and each thread that no beat resolves.
  3. Write one line for each finding: the problem, then where it occurs. Cite each beat or scene by its label in double quotes, exactly as the outline spells it, and each entity by its ID in the form [@id].

  Constraints:
  - Use only the outline and the material above. Never invent a beat.
  - Do not rewrite any beat and do not suggest new beats or wording.
  - Return only the findings, one per line. If there are none, return the single line: No findings.
```

Then `npx prettier --write` on the file (step 2). The prompt block must not change under prettier (A5).

### 3.2 The fixture `packages/packs/test/golden/plot_manager/late-boat.fixture.json`

The fixture has two keys. `arguments` holds `outline` and `entityIds`. `entities` holds the two character entries of `packages/packs/test/golden/dialogue/keepers-exchange.fixture.json` (`nell-carrow` and `pim-dorey`), copied as they are.

```json
{
  "arguments": {
    "outline": "<the text of the story graph below, JSON.stringify(graph, null, 2) plus a final newline>",
    "entityIds": ["nell-carrow", "pim-dorey"]
  },
  "entities": [ "<the nell-carrow entry>", "<the pim-dorey entry>" ]
}
```

The story graph (`graph`, a story graph file, D4):

```json
{
  "schemaVersion": 1,
  "view": "story",
  "name": "The late boat",
  "nodes": [
    { "id": "hidden-page", "kind": "beat", "label": "Nell hides the logbook page", "position": { "x": 0, "y": 0 } },
    { "id": "storm-night", "kind": "scene", "label": "The storm night", "path": "drafts/the-storm.md", "position": { "x": 320, "y": 0 } },
    { "id": "boat-late", "kind": "beat", "label": "The supply boat is three weeks late", "position": { "x": 640, "y": 0 } },
    { "id": "telegram", "kind": "beat", "label": "Pim reads the sealed telegram", "position": { "x": 960, "y": 0 } },
    { "id": "signal", "kind": "beat", "label": "The keepers agree to send a signal", "position": { "x": 1280, "y": 0 } }
  ],
  "edges": [
    { "id": "e1", "from": "hidden-page", "to": "storm-night", "relation": "order" },
    { "id": "e2", "from": "storm-night", "to": "boat-late", "relation": "order" },
    { "id": "e3", "from": "boat-late", "to": "telegram", "relation": "order" },
    { "id": "e4", "from": "telegram", "to": "signal", "relation": "order" }
  ]
}
```

The graph holds the three kinds of finding the prompt asks for: "Nell hides the logbook page" is a setup with no payoff; "Pim reads the sealed telegram" is a payoff with no setup; "The keepers agree to send a signal" follows with no beat that gives the reason. The golden does not check the findings, which come from the mock (3.3). Step 4 checks the graph with `graphFileSchema` (A1, A2). Then `npx prettier --write` on the fixture (step 4).

### 3.3 The scenario `e2e/fixtures/mock-openai/scenarios/pack-plot_manager.json`

```json
{
  "steps": [
    {
      "match": { "endpoint": "chat" },
      "reply": {
        "kind": "stream",
        "deltas": [
          "Setup without payoff: \"Nell hides the logbook page\" never comes back.\n",
          "Payoff without setup: \"Pim reads the sealed telegram\" has no earlier plant."
        ]
      }
    }
  ]
}
```

Then `npx prettier --write` on it (step 5).

### 3.4 The golden test `apps/api/test/packs/plot-manager.test.ts`

- Imports as `throughline-check.test.ts` lines 1 to 11 do: `readFileSync` and `rmSync` from `node:fs`; `join` from `node:path`; `expect` and `it` from `vitest`; `graphFileSchema` from `@bbartolome/scriba-contracts/graph-runner` (as `propose-graph.test.ts` line 3); `TOOLS_ROUTE` and `toolListSchema` from `@bbartolome/scriba-contracts/tool-registry`; `createTestApp` and `type TestApp` from `../create-test-app`; `send` and `sessionCookie` from `../guard-request`; `LOOPBACK_HOST` and `LOOPBACK_ORIGIN` from `../invariant-sweep`; `makeLibrary` from `../settings.kit`; `goldenCase`, `GOLDEN_ROOT`, `PACKS_ROOT` and `type GoldenRunResult` from `./golden.kit`.
- The helper `renderedPrompt` is copied from `throughline-check.test.ts` (the user message of the recorded request, C7 of GNP-16). No shared helper changes.
- **T2 (criterion 1, golden).** One `it` with timeout 60000 whose body is `goldenCase({ tool: 'plot_manager', name: 'late-boat', expect: { kind: 'check', sourcesUsed: ['nell-carrow', 'pim-dorey'] }, invalidWithout: 'outline', check })`. The `check` asserts that the rendered prompt contains `Nell hides the logbook page`, `Pim reads the sealed telegram`, `nell-carrow` and `pim-dorey`, and that `result.content` contains `Nell hides the logbook page`. It also reads the fixture (`readFileSync(join(GOLDEN_ROOT, 'plot_manager', 'late-boat.fixture.json'), 'utf8')`, as `dialogue.test.ts` line 119 does), takes `arguments.outline` (a string), and asserts that `graphFileSchema.parse(JSON.parse(outline)).view` is `story`: this is the "story-graph JSON fixture as `outline`" of criterion 1, tested in the test and not only by hand in step 4. The `it` title starts with `AC 1:`. It asserts no wording of the instructions, because module line 85 allows wording only in the golden.
- **X1 (extra, tool list).** One `it`, as X2 of `throughline-check.test.ts`: `GET` the tools route with `SCRIBA_PACKS_DIR` set to `PACKS_ROOT`, then find the row with `name` `plot_manager` and `origin` `fiction`, and assert `toMatchObject({ enabled: true, valid: true, output: 'check' })` (A6).
- The file has no `any` and does not contain the text `examples/`.

### 3.5 The eval case and its data test

`scripts/eval-agent/cases/plot-manager.json`:

```json
{
  "sample": "fiction",
  "intent": "Check my beats for loose ends in the lighthouse story: name any setup that never pays off, and any payoff with no setup.",
  "expect": {
    "reason": "completed",
    "tools": ["plot_manager"]
  }
}
```

`scripts/eval-case-plot-manager.test.mjs`: the imports and the `CASE` path helper of `scripts/eval-case-throughline-check.test.mjs`, with the file name `plot-manager.json` and the comment changed to name this case. One `test(...)` (criterion 2, T3; its title starts with `AC 2:`) that reads the file and asserts: the keys are exactly `expect`, `intent`, `sample`; the keys of `expect` are exactly `reason`, `tools`; `sample` is `fiction`; `intent` is a non-empty string; `expect.tools` is `["plot_manager"]`; `expect.reason` is `completed`. It runs no model.

### 3.6 The catalogue line in the recipe golden

After the update run (step 10), the recipe golden gains exactly one line, between `- numbers_to_people:` and `- propose_graph:`:

`- plot_manager: Check beats, setups and payoffs for gaps and loose ends. Output: check. Inputs: outline (text, single, required); entityIds (entity, list, optional).`

The format is the one of the lines of section 2 (`Output: check.` as on the `throughline_check` line). If the line is absent after the run, the tool is not valid (a lint error or an unloaded spec): stop and report.

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-17`, cut from main by the orchestrator (no `-b` when the branch exists). Record `node -v` and `npm -v` beside each result. Do not push. Do not use `git add -A` or `git commit -a`. When `--update-goldens` is used, the file filter comes before `--`: `vitest run <file> -- --update-goldens` (`plans/DECISIONS.md` lines 5167 to 5174, as cited by GNP-16).

0. **Base.** `git rev-parse --short HEAD` prints `7be006d` or a later commit. `git status --short` prints nothing. `test ! -e packages/packs/fiction/tools/plot_manager.yaml` exits 0. `git ls-files packages/packs/test/golden/plot_manager apps/api/test/packs/plot-manager.test.ts scripts/eval-agent/cases/plot-manager.json scripts/eval-case-plot-manager.test.mjs e2e/fixtures/mock-openai/scenarios/pack-plot_manager.json` prints nothing. If HEAD is later than `7be006d`, run `git diff --quiet 7be006d HEAD -- packages/packs apps/api/test/packs scripts e2e/fixtures/mock-openai/scenarios e2e/specs apps/api/src/modules/graph-runner packages/contracts/src/graph-runner`; if it exits 1, re-read the changed files before editing. A change to the recipe golden is expected once other fiction tools merge (GNP-15's branch `unit/GNP-15` already changes it); that is not a stop: step 10 compares against this branch's own base.
1. **Runtime and baseline.** `node -v` prints `v26.x` and `npm -v` prints `11.x`. Run `npm ci` only if the worktree has no `node_modules/`. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs && (cd apps/api && npx vitest run test/packs)` exits 0 on the unchanged tree.
2. **Tool spec (U1 to U4, M2, C2 to C4).** Create `packages/packs/fiction/tools/plot_manager.yaml` with the text of 3.1. Then `npx prettier --write packages/packs/fiction/tools/plot_manager.yaml`, and check that the prompt block is unchanged (A5).
3. **Validation suite (criterion 1, first part; T1).** `npm run lint:packs` exits 0 and prints no finding that names `plot_manager`. Then `npm test -w @bbartolome/scriba-packs` exits 0, and "the suite passes on the real packs" passes.
4. **Fixture (M3, C7; A1, A2).** Create `packages/packs/test/golden/plot_manager/late-boat.fixture.json` as 3.2. Write the `outline` text from the story graph of 3.2 with `node -e` (`JSON.stringify(graph, null, 2) + "\n"`), and check it: `node -e` with `require('@bbartolome/scriba-contracts/graph-runner').graphFileSchema.parse(JSON.parse(text))` exits 0. Then `npx prettier --write` on the fixture.
5. **Scenario (M3).** Create `e2e/fixtures/mock-openai/scenarios/pack-plot_manager.json` as 3.3. Then `npx prettier --write` on it.
6. **Golden test and tool-list test (criterion 1, second part; T2 and X1; C10).** Create `apps/api/test/packs/plot-manager.test.ts` as 3.4.
7. **Update run (C8, M3).** `cd apps/api && npx vitest run test/packs/plot-manager.test.ts -- --update-goldens` exits 0 and creates `packages/packs/test/golden/plot_manager/late-boat.golden.json`. Read the file. `messages[0].content` equals `OUTPUT_SYSTEM_MESSAGES.check` (`executor.service.ts` lines 39 and 40). `messages[1].content` contains `Outline:` followed by the story graph's text, `Material:` followed by the two characters, each with its ID, the text `[@id]`, and the outline's labels; it contains no `{{`. Then `npx prettier --write packages/packs/test/golden/plot_manager`.
8. **Compare run (criterion 1).** `cd apps/api && npx vitest run test/packs/plot-manager.test.ts` exits 0 with two tests passed. In T2 the golden is `match`, the kind is `check`, `sourcesUsed` is exactly `["nell-carrow", "pim-dorey"]`, the call without `outline` returns 422 with `TOOL_ARGS_INVALID` and a message that contains `outline`, and one model call was made. The rendered prompt holds the four strings of T2.
9. **Eval case (criterion 2; T3, C11).** Create `scripts/eval-agent/cases/plot-manager.json` as 3.5 and `scripts/eval-case-plot-manager.test.mjs`. Then `npx prettier --write` on both. `node --test scripts/eval-case-plot-manager.test.mjs` exits 0, and `node --test scripts/eval-cases.test.mjs` exits 0 (it reads every case file).
10. **Catalogue of the propose_graph recipe golden (M7 of GNP-16, C9, 3.6).** `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens` exits 0. Then `git status --short --untracked-files=all packages/packs/test/golden` lists the two `plot_manager` golden files (`late-boat.fixture.json`, `late-boat.golden.json`) and `propose_graph/recipe.golden.json` and nothing else. Parse the base (`git show "$(git merge-base HEAD main)":packages/packs/test/golden/propose_graph/recipe.golden.json`) and the working copy as JSON in `node -e`, without writing a file. `messages[0]` is equal in both. In `messages[1].content` the two strings differ by exactly one inserted line, the text of 3.6, between `- numbers_to_people:` and `- propose_graph:`. Everything else is equal. If anything else differs, stop and report it. `git diff --quiet -- packages/packs/test/golden/propose_graph/story.golden.json` exits 0. Then `cd apps/api && npx vitest run test/packs/propose-graph.test.ts` exits 0.
    **Rule for a later rebase (either merge order).** If another tool unit (GNP-15, GNP-23) changed the recipe golden on main after this branch was cut, the rebase of the commit conflicts on `recipe.golden.json`, whose catalogue is one JSON line. Resolve it by regeneration, never by hand: take main's version (`git checkout --ours -- packages/packs/test/golden/propose_graph/recipe.golden.json`; during a rebase "ours" is main), run `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens`, then `npx prettier --write` on the file, then repeat the check of this step against `main`. The only difference must be the one inserted line of 3.6. Then `git add` the file and `git rebase --continue`. The other unit's line stays where main has it, and the result is the same in either merge order, because each line has its own place in the sorted catalogue.
11. **Format check (A5).** `npx prettier --check packages/packs/fiction/tools packages/packs/test/golden/plot_manager packages/packs/test/golden/propose_graph apps/api/test/packs scripts/eval-agent/cases scripts/eval-case-plot-manager.test.mjs e2e/fixtures/mock-openai/scenarios` exits 0. If a golden fails it, stop and report: the fix is a decision for the Navigator.
12. **API build, lint and root gates.** `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api` exit 0 (the build type-checks the new test file). From the root: `npm run build`, `npm run lint` and `npx prettier --check .` exit 0. `npm test -w @bbartolome/scriba-e2e` exits 0, which shows that the mock loads the new scenario. `node --test 'scripts/*.test.mjs'` exits 0. Then `npm test` from the root. If it exits 0, the gate is met. If it exits 1 and the only failing test is `apps/web` `canvas-page.spec.ts` "Loading the contract's example story graph and recipe and saving without edits produces byte-equivalent JSON" with "Test timed out in 5000ms" (`plans/GNP-14.md` F7), the gate is met only when all of these hold, each recorded with the load average (`uptime`): (a) `npm test -w @bbartolome/scriba-web` run alone exits 0; (b) `npm test` exits 0 for every other workspace (`-w @bbartolome/scriba-contracts`, `-w @bbartolome/scriba-api`, `-w @bbartolome/scriba-packs`, `-w @bbartolome/scriba-e2e`); (c) `node --test 'scripts/*.test.mjs'` exits 0; (d) `git diff --name-only main...HEAD -- apps/web packages/contracts` prints nothing. Any other failure (an `apps/api` timeout included, because this unit adds an `apps/api` test): stop and report it. Do not change any test, timeout, config or script to make it pass. This includes the intermittent `apps/api` failure that stopped GNP-15 (`test/tool-registry-save.test.ts`, "C1: save on a built-in writes the user-pack file and never touches the packs root"): whether a gate may tolerate it is an open Navigator question (`plans/DECISIONS.md` lines 6752 to 6756), so this plan does not tolerate it, as `plans/GNP-16.md` step 13 does not. If that failure occurs, stop and report it with the load average; if the Navigator has decided the question by then, the step is revised to match the decision before it is run again.
13. **The /tools specs in the running app (C12, A3).** With port 8080 free, run once: `npm run e2e -w @bbartolome/scriba-e2e -- tools-editor.e2e.ts tools-live-preview.e2e.ts tools-preview.e2e.ts tools-try.e2e.ts --trace off` (the form of `plans/GNP-16.md` step 14; `tools-editor.e2e.ts` runs first and leaves its two user rows in the list, `plans/GNP-14.md` F5, so the list is as long as in the full suite). Record the pass and fail counts, and for `tools-preview.e2e.ts` the TRG-05 C2 result (`tools-preview.e2e.ts:169` passed at `c52b2b4`, the PLT-23 entry in `plans/DECISIONS.md`). No spec changes. If a test fails, stop and report PLAN DOES NOT WORK with the test name, the person select's `boundingBox` and the viewport height; do not change `e2e/specs/tools-preview.e2e.ts` (module line 89; `plans/GNP-15.md` open point 2, line 372). If the browser cannot run here, record "not run" with the reason.
14. **Record.** Store the Node and npm versions and each command's output. A criterion in section 5 is marked passed only when its row's pass condition holds.
15. **Commit.** `git add -- packages/packs/fiction/tools/plot_manager.yaml packages/packs/test/golden/plot_manager packages/packs/test/golden/propose_graph/recipe.golden.json e2e/fixtures/mock-openai/scenarios/pack-plot_manager.json apps/api/test/packs/plot-manager.test.ts scripts/eval-agent/cases/plot-manager.json scripts/eval-case-plot-manager.test.mjs`, never `-A`. `git diff --cached --stat` lists exactly the eight paths of section 3 and no `plans/` or `units/` file. Commit with `feat(GNP-17): plot_manager check tool with golden case and eval case`. Keep the commits; do not squash. Do not push.

## 5. Acceptance criteria and tests

The criteria, word for word (unit lines 20 and 21):
1. "Passes the validation suite; golden test passes with a story-graph JSON fixture as `outline`."
2. "Manual eval case added."

Each criterion has at least one test (criterion 1 has T1 for its first part and T2 for its second). The tests run in this environment once the contracts and API are built (step 1); none needs a remote or a model.

| Criterion (unit line) | Test | Seam | Command | Pass condition |
|---|---|---|---|---|
| 1, first part: "Passes the validation suite" (line 20) | T1 | the content-check suite and `lintPacks` (`checks.ts`; `real-packs.test.ts`) | `npm run lint:packs` and `npm test -w @bbartolome/scriba-packs` | both exit 0; no finding names `plot_manager`; `plot_manager` is not a draft, so the common-input check does not run on it (M1), and its description starts with `check` (U2) |
| 1, second part: "golden test passes with a story-graph JSON fixture as `outline`" (line 20) | T2 | `goldenCase` through the composed app and the mock | `cd apps/api && npx vitest run test/packs/plot-manager.test.ts` | the golden is `match`; kind `check`; `sourcesUsed` `["nell-carrow", "pim-dorey"]`; the invalid call is 422 `TOOL_ARGS_INVALID`, naming `outline`; one model call; the four strings of 3.4 are in the prompt and the finding is in `result.content`; the fixture's `outline` parses with `graphFileSchema` as a `story` graph |
| 2: "Manual eval case added." (line 21) | T3 | the eval case data file | `node --test scripts/eval-case-plot-manager.test.mjs` and `node --test scripts/eval-cases.test.mjs` | the file has the documented keys and values; `sample` is `fiction`; `expect.tools` is `["plot_manager"]`; both exit 0 |
| Extra X1 | tool list | `GET` on the composed app | step 6 (in the T2 file) | the row of `plot_manager` with origin `fiction` is `{enabled: true, valid: true, output: 'check'}` |
| Extra X2 | catalogue | the recipe golden | step 10 | exactly one inserted catalogue line, in sorted position; the propose-graph test passes |
| Extra X3 | `/tools` e2e | the composed app and the browser | step 13 | the four `/tools` specs pass in one run, TRG-05 C2 included, or "not run" with the reason |

## 6. Downstream agreement

- **GNP-19 (fiction gate, `blocked_by` names GNP-17, unit line 7).** Its criterion "All five tools pass the validation suite; every entity input names an existing entity type" (unit line 20) holds for `plot_manager`, because its `entityIds` has no kinds (M2). Its demo step 6 ("check my beats for loose ends", unit line 32) depends on the agent choosing `plot_manager` from its description (U2) and on the agent passing the graph file's text, or a beat list, as `outline`. The unit allows either form, and module line 53 says the agent reads the file first in chat. The agent's choice belongs to the Agent loop and is not decided here. This plan changes no file of GNP-19.
- **GNP-18 (fiction sample, parallel, not blocked by GNP-17).** Its story graph (label-only beat, file-backed beat, `order` edges; its Decisions) is valid input for `outline` (D4). This plan names no GNP-18 file. Its `sample: fiction` eval case waits for GNP-18's entry in `examples/samples.yaml` (C11).
- **GNP-15 (scene_builder, draft, parallel).** GNP-15's section 6 (`plans/GNP-15.md` line 361) names the same file set for GNP-17, so the two plans agree. Its branch `unit/GNP-15` holds commit `f3ccbf2` (part 1, with its recipe golden line) and waits on the open Navigator question about the root gate (`plans/DECISIONS.md` lines 6752 to 6756); this plan's step 12 keeps the same strict gate, so the two plans do not disagree on it. The shared file is the recipe golden. GNP-15 inserts `scene_builder` between `propose_graph` and `throughline_check`; GNP-17 inserts `plot_manager` between `numbers_to_people` and `propose_graph`. The insertions are at different places in the sorted catalogue, and the rebase rule of step 10 gives the same result in either merge order. Both add one row to the `/tools` list; the 3200 px viewport leaves room for both (GNP-14 C12).
- **GNP-16 (dialogue, done).** Its catalogue line is on main (between `cold_open` and `mystery_question`), and its eval data test is the pattern of T3. No file is shared beyond the recipe golden.
- **GNP-20 (throughline_check, done).** It is the `check` precedent (D2, D6). Its catalogue line sorts after `propose_graph`; `plot_manager` sorts before it. Its remix-enum note (`plans/GNP-20.md` line 146) applies to `plot_manager` too: a `check` tool is not in remix's `targetShape` enum.
- **GNP-23 (remix, not started).** Its catalogue line sorts between `propose_graph` and `throughline_check`, so it does not touch `plot_manager`'s line. Its recipe golden change is covered by the rebase rule of step 10.
- **GNP-02, GNP-13 (done).** The golden kit and the entity types are used as they are; this plan adds no kind and changes no harness file.
- **Graph runner (`apps/api/src/modules/graph-runner/graph-validation.ts` line 16).** Output nodes cannot write a `check` result. The unit already says so (unit line 17), so `plot_manager` is wired to no writing output node. No change here.

## 7. Open points

1. **Setup and payoff as a relation of the story graph. Settled by the reviser: C13, no new relation.** The unit's text does not ask for one, and the free-text `relation` already lets an author write such an edge. No Navigator decision is needed.
2. **Real-model run of the eval case.** Not part of any criterion of this unit (criterion 2 says only "Manual eval case added."). Module line 90 puts each tool's manual eval case in the eval data and names the small and larger local model runs, with a citation check for the workhorses and a voice check for Dialogue; this unit's criterion asks only for the case in the data. A real run is optional and would be recorded as "not run" (`plans/GNP-20.md` line 164 says the same for its case). No decision needed.
3. **The chat path for the GNP-19 demo.** Whether the agent passes the whole graph file or a beat list as `outline` is not settled by this plan. The unit allows both and the golden uses the graph file. The choice belongs to the Agent loop and GNP-19's demo. It changes no file of this unit.

Nothing in this plan needs the Navigator to unblock it. The only Navigator question that touches it is GNP-15's open gate question (step 12), and it matters only if the intermittent `tool-registry-save.test.ts` failure occurs.

## Review parts

The plan is small: one part.

- **Part 1 — the tool spec, the golden case, the catalogue, the eval case, the gates and the commit.** Steps 0 to 15. Tests: criterion 1, first part, T1 (`packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs", with `npm run lint:packs`; step 3); criterion 1, second part, T2 (the `AC 1:` test of `apps/api/test/packs/plot-manager.test.ts`; steps 7 and 8); criterion 2, T3 (`scripts/eval-case-plot-manager.test.mjs`, with `scripts/eval-cases.test.mjs`; step 9); extras X1 (step 8), X2 (step 10) and X3 (step 13). Files: the eight paths of section 3. The reviewer checks the spec against 3.1 (the `entityIds` block byte for byte against `cold_open.yaml` lines 13 to 19, no `x-scriba-entity-kinds`), the fixture and scenario against 3.2 and 3.3, the test against 3.4, the golden's content against step 7, that the recipe golden differs from the branch base by exactly the line of 3.6, the case and its test against 3.5 and C11, the step 12 gate as written, the step 13 result (no file under `e2e/specs` changed), and that `git diff --stat main...HEAD` lists exactly the paths of section 3.
