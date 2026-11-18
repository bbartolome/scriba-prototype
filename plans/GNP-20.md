---
id: GNP-20
status: done
---
# GNP-20 plan — core/throughline_check tool

Batch: [GNP-20] (Genre packs, phase:remaining-shapes, M7), a batch of one. Revision 2 (the Opus revision), checked against main at ef60970. No unit file changes.

Merge order: the plan holds whether GNP-20 merges before or after GNP-19, GNP-21, GNP-22, GNP-23 and the fiction tool units GNP-14 to GNP-17. None of them has a plan file or a `unit/` branch yet. The only path they share with this plan is the propose_graph recipe golden. The enabled tools among them (GNP-14 `character_builder` and `world_builder`, GNP-15 `scene_builder`, GNP-16 `dialogue`, GNP-17 `plot_manager`, GNP-23 `remix`) each add a catalogue line, in name order, some before and some after `throughline_check` (`world_builder` sorts after it). Step 7 regenerates that golden on the branch as rebased onto main, and step 8 checks it against main by name order, not by a fixed neighbour line. So each merge order gives the same result (sections 5 and 6).

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

**D1 Spec and place.** `core/tools/throughline_check.yaml`, name `throughline_check`, `output: check`, `enabled: true`. Source: GNP-20 unit line 15 (the file and its output); GNP-24 unit line 17 (Throughline check ships enabled).

**D2 Description.** The unit's sentence: "Flag any section of a chapter that drifts from its core idea." It is 62 characters, under the 120 limit, and starts with `flag`, which is in the verb list. Source: GNP-20 unit line 15; packages/packs/test/checks.ts line 44 (`DESCRIPTION_LIMIT`), line 52 (`flag` in `VERBS`) and line 99 (`checkDescription` on every tool); GNP-01 plan, open point 2 (the verb list); module "Tool-spec content rules" (one sentence, under about 120 characters, starts with a verb).

**D3 Inputs.** `chapterText` and `coreIdea`, both text ports, both required (GNP-20 unit line 16). The chapter is a text port, not an entity: the module's "Tool-spec content rules" say Throughline check takes chapter content on `text` ports, and "Out of scope" drops the Chapter entity type. No other common input: the module's "Common inputs" say a tool whose output is `check` takes only the subset that makes sense, as listed per unit. The identity rule covers draft tools only (packages/packs/test/checks.ts lines 97 and 98); GNP-12 plan line 110 agrees. `coreIdea` copies the hints of the common input in `packages/packs/nonfiction/tools/mystery_question.yaml` (type text, port, textarea, title "Core idea"). `chapterText` uses the same hints with the title "Chapter text" (plan choice).

**D4 Output and effects.** `check`: a card only, with no file (AGL-13 unit, Decisions, the `check` bullet; DECISIONS 2026-11-16, AGL-09 OP3, line 5118). With no entity inputs, `sourcesUsed` is `[]`. The module says the Tool registry computes `sourcesUsed` from entity-ID inputs.

**D5 Prompt.** The module's skeleton applies in part: a role line, the material, the steps, and the constraints. The material is the core idea and the chapter. The chapter is not an entity, so nothing is rendered with an ID. The skeleton's step 4 clauses that have no object here are left out, as GNP-04 C8 did for a non-draft tool under the Navigator's option (a) for GNP-04; that decision is a precedent for GNP-20, not a decision recorded for it. The steps are GNP-20 unit line 17, made concrete: one section for each paragraph; a section drifts when it makes a point the core idea does not carry, or argues against it; each drifting section gets one finding, a short reason and the opening words in double quotes. Constraints: "use only the chapter" and "never invent a section" (the skeleton's "use only the material", made concrete); "do not rewrite" (unit line 17); and the executor's own `check` format, one finding per line and the line `No findings.` when none (apps/api/src/modules/tool-registry/executor.service.ts lines 38 and 39, the `check` system message). The skeleton's citation, `TK` and style-profile clauses are left out, because the tool has no entity and no fact to cite. Source: module "Tool-spec content rules"; DECISIONS 2026-11-16, "GNP-04, GNP-07 — Navigator decisions", point 2, option (a) (line 5144); plans/GNP-04.md line 64, which names GNP-20 line 17 as a non-draft unit with its own prompt rules. The sections are the paragraphs (plan choice; unit line 17 says "sections/paragraphs").

**D6 Argument, not entity.** The chapter and the core idea are fixture arguments, and `entities` is `[]`. Source: plans/GNP-02.md line 134 (GNP-17 and GNP-20 pass fixture text as arguments); packages/contracts/src/tool-registry/call.ts lines 47 to 49 (`entities` is a required array).

**D7 Golden case.** One golden case in `apps/api/test/packs/`, with the fixture and the golden under `packages/packs/test/golden/throughline_check/`, and one mock scenario `pack-throughline_check.json`. Source: GNP-02 unit, Decisions; packages/packs/test/README.md, "Golden cases" and "Files and where they live". `invalidWithout` is `chapterText` (plan choice).

**D8 Recipe catalogue.** An enabled, valid core tool is listed in `{{toolCatalog}}` (executor.service.ts line 163), so the propose_graph recipe golden changes in this PR, and this PR regenerates it. Source: packages/packs/test/README.md, "Goldens that include the tool catalogue"; plans/GNP-04.md line 204; precedents e43b77b (the GNP-09 catalogue line alone) and ba67272 (GNP-08). The propose-graph test asserts only its own catalogue line (apps/api/test/packs/propose-graph.test.ts line 14), so the new line does not break it. The mock matches `lastMessageContent` by substring (e2e/fixtures/mock-openai/server.mjs lines 124 and 125), so the existing scenarios still match.

**D9 Eval case.** One case file with the keys `sample`, `intent` and `expect`. `expect` holds `reason` and `tools` (scripts/eval-agent/README.md, "Cases"). `citations` is left out, because the prompt asks for no `[@id]`; the report then shows it as `unchecked` (same README). The criterion, "Manual eval case added." (unit line 21), names no model run, unlike GNP-08 to GNP-10's "(small and larger local model)". So the data test meets it word for word: the case is in the eval data and the data test passes. The Navigator's data-only reading for those units (DECISIONS 2026-11-16, session 8a43a36b415949f89ef1d21f4ea58eca, option (a), line 5222) agrees and is not needed here. A real-model run is not part of any GNP-20 criterion; it is optional and is recorded as not run (section 7, point 3). The data test is a new file, `scripts/eval-case-throughline-check.test.mjs`, in the form of `scripts/eval-case-myth-buster.test.mjs` (plan choice). It edits no shared file, so the parallel units cannot conflict on it.

**D10 What does not change.** No file under `examples/`, `units/`, `modules/` or `plans/`. Unit tests never read `examples/` (module "Testing principles"). `packages/packs/test/README.md`, the content suite, `scripts/eval-cases.test.mjs`, the Tool registry, the mock server and the package scripts do not change.

**D11 Test seams.** External behaviour only: the composed app's HTTP routes, the request the mock recorded, the golden files, and the eval data file (module "Testing principles"). No private helper and no executor internal. The module says "No wording assertions beyond golden snapshots" (modules/genre-packs.md line 85), so the test's own `check` asserts only that the inputs reach the model and the reply comes back; the wording of the prompt is held by the golden alone.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `packages/packs/core/tools/throughline_check.yaml` | new | the tool spec (step 2) |
| `packages/packs/test/golden/throughline_check/drifting-paragraph.fixture.json` | new | the fixture: a chapter with one drifting paragraph, the core idea, `entities: []` (step 3) |
| `packages/packs/test/golden/throughline_check/drifting-paragraph.golden.json` | new, generated | the expected chat request (step 6) |
| `packages/packs/test/golden/propose_graph/recipe.golden.json` | changed, regenerated | one catalogue line added (steps 7 and 8) |
| `e2e/fixtures/mock-openai/scenarios/pack-throughline_check.json` | new | the mock reply (step 4) |
| `apps/api/test/packs/throughline-check.test.ts` | new | tests T2 and X2 (step 5) |
| `scripts/eval-agent/cases/throughline-check.json` | new | the eval case (step 9) |
| `scripts/eval-case-throughline-check.test.mjs` | new | test T3 (step 9) |

Nothing else changes. `package-lock.json` does not change.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`, on the branch `unit/GNP-20` created from main. Record `node -v` and `npm -v` beside each result. Do not push.

1. Preflight. `git status --short` prints nothing. `git switch -c unit/GNP-20` from main. `node -v` prints `v26.x`, and `npm -v` prints `11.x`. Then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Expected: each exits 0.

2. Spec. Create `packages/packs/core/tools/throughline_check.yaml` with this content:

   ```yaml
   schemaVersion: 1
   name: throughline_check
   description: Flag any section of a chapter that drifts from its core idea.
   inputs:
     type: object
     properties:
       chapterText:
         type: string
         title: Chapter text
         x-scriba-type: text
         x-scriba-port: true
         x-scriba-control: textarea
       coreIdea:
         type: string
         title: Core idea
         x-scriba-type: text
         x-scriba-port: true
         x-scriba-control: textarea
     required: [chapterText, coreIdea]
   output: check
   enabled: true
   prompt: |
     You check a chapter for drift: sections that no longer serve its core idea.

     Core idea: {{coreIdea}}

     Chapter:
     {{chapterText}}

     Steps:
     1. Split the chapter into sections, one for each paragraph.
     2. Decide for each section whether it serves the core idea above. A section drifts when it makes a point the core idea does not carry, or argues against it.
     3. For each section that drifts, write one finding: a short reason, then the opening words of the section in double quotes.

     Constraints:
     - Use only the chapter above. Quote the opening words exactly as they appear in it, and never invent a section.
     - Do not rewrite any section and do not suggest new wording.
     - Return only the findings, one per line. If no section drifts, return the single line: No findings.
   ```

3. Fixture. Create `packages/packs/test/golden/throughline_check/drifting-paragraph.fixture.json`. `arguments.coreIdea` is `Expertise grows from planned practice, not from the hours alone.` `arguments.chapterText` is three paragraphs separated by a blank line. Paragraph 1: "Practice hours get quoted as if they were the whole story. In the study, though, the hours alone did not separate the strongest students from the rest. The difference lay in how each session was planned." Paragraph 2 (the drifting one): "Sourdough starters need feeding every twelve hours, or they sour and lose their rise. A baker who skips a feeding loses a whole day of work." Paragraph 3: "Teachers who set each task in advance gave their students a clear target for every session. The students who worked toward those targets improved fastest." Then `"entities": []`.

4. Mock scenario. Create `e2e/fixtures/mock-openai/scenarios/pack-throughline_check.json`: one step, `match` `{"endpoint": "chat"}`, and `reply` `{"kind": "stream", "deltas": ["Drifts into baking, not planned practice: \"Sourdough starters need feeding every twelve hours\""]}`. The shape follows `pack-mystery_question.json`.

5. Test file. Create `apps/api/test/packs/throughline-check.test.ts` with two `it` blocks, following `mystery-question.test.ts` and `core-gate.test.ts`:
   - T2 (criterion 1, golden): `goldenCase({tool: 'throughline_check', name: 'drifting-paragraph', expect: {kind: 'check', sourcesUsed: []}, invalidWithout: 'chapterText', check})`, with a 60000 ms timeout. The `check` callback asserts that the rendered user prompt (the user message's content, found as `renderedPrompt` does in `mystery-question.test.ts`) contains the fixture's two input values, `Expertise grows from planned practice, not from the hours alone.` and `Sourdough starters need feeding every twelve hours, or they sour and lose their rise.`, and that `result.content` contains `Sourdough starters need feeding`. It asserts no template wording (D11).
   - X2 (extra, the tool list): `GET` the tool-list route with the real packs root, as `core-gate.test.ts` does, and assert the row of `throughline_check` with origin `core` matches `{enabled: true, valid: true, output: 'check'}`.

6. Golden for the new case. `cd apps/api && npx vitest run test/packs/throughline-check.test.ts -- --update-goldens`. Expected: exit 0, and `packages/packs/test/golden/throughline_check/drifting-paragraph.golden.json` is written with a system message and a user message. Then `npx vitest run test/packs/throughline-check.test.ts` with no flag. Expected: exit 0, and the case reports `match`, so the second run checks the file rather than writing it.

7. Recipe golden. `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens`. Expected: exit 0. `git diff --stat -- packages/packs/test/golden/propose_graph/` shows `recipe.golden.json` changed and `story.golden.json` unchanged. The precedent e43b77b shows that the story golden is written byte for byte.

8. Check X1. Parse `git show main:packages/packs/test/golden/propose_graph/recipe.golden.json` (the old file) and the working copy (the new file) as JSON, with `node --input-type=module -e`, and write no file. Expected: the two have the same keys; `messages[0]` is equal; `messages[1].content` of the new file is the old content with exactly one line inserted, inside the block that follows `Tools for a recipe:`, at the place where the catalogue lines stay in name order (after the last line whose tool name sorts before `throughline_check`, and before the first whose name sorts after it, such as `world_builder` if GNP-14 is on main). On main at ef60970 that place is after the `- propose_graph:` line. The inserted line is `- throughline_check: Flag any section of a chapter that drifts from its core idea. Output: check. Inputs: chapterText (text, single, required); coreIdea (text, single, required).` (predicted from the golden's existing lines). If the rendered line differs, stop and record the difference: it means the rendering rule is not the one this plan assumes.

9. Eval case. Create `scripts/eval-agent/cases/throughline-check.json` with `sample` `nonfiction`, `intent` `Check my draft the-ten-thousand-hour-idea against this core idea: expertise grows from planned practice, not from the hours alone. Flag any paragraph that drifts from it.`, and `expect` `{"reason": "completed", "tools": ["throughline_check"]}`. Create `scripts/eval-case-throughline-check.test.mjs` in the form of `scripts/eval-case-myth-buster.test.mjs`: the case file's top-level keys are exactly `expect`, `intent`, `sample`; the `expect` keys are exactly `reason` and `tools`; `sample` is `nonfiction`; `intent` is a non-empty string; `tools` is `["throughline_check"]`; `reason` is `completed`. Then `node --test scripts/eval-case-throughline-check.test.mjs scripts/eval-cases.test.mjs`. Expected: exit 0.

10. Format. `npx prettier --write` on the eight paths of section 2 (a golden's test is a parse comparison, not a byte comparison, so formatting cannot change a result), then `npx prettier --check` on the same paths. Expected: `All matched files use Prettier code style!`.

11. Validation suite (T1). `npm run lint:packs`, then `npm test -w @bbartolome/scriba-packs`. Expected: both exit 0, and `real-packs.test.ts` reports no error finding for the new spec.

12. Packs and agent tests. `cd apps/api && npx vitest run test/packs`. Expected: every case passes, including the propose-graph test and the two `throughline-check` tests. Then `npx vitest run test/agent-loop-output-routing.test.ts test/agent-loop-pending-writes-gate.test.ts test/agent-loop-workhorses.test.ts`. Expected: pass. These use the real packs and check the offered tools with `.some` or `toContain`, never a count, so a new core tool must not break them.

13. Repo gates. From the root: `npm run build`, `npm run lint` and `npm test`. Expected: each exits 0. Record the counts. CI runs the same commands.

14. Scope. `git status --short` lists exactly the eight paths of section 2. `git diff --stat main` shows nothing under `units/`, `modules/`, `examples/` or `plans/`.

15. Commit. `git add` the eight paths by name, not with `-A`, and commit with `feat(GNP-20): core throughline_check tool with golden case and eval case`.

16. Record, after the review is approved. Tick GNP-20 unit lines 20 and 21 and set the plan's status to `done`, in a separate docs commit, as GNP-13 did in e7d7d3f. The real-model run of the eval case is recorded as not run in the implementation report (open point 3).

## 4. Acceptance criteria and tests

Each criterion has one test at least. The extra tests X1 and X2 are not named in the criteria, and they are marked as extra.

| Criterion (unit lines) | Test | Seam | Command | Pass condition |
|---|---|---|---|---|
| 1, "Passes the validation suite" (line 20) | T1 | content suite and the pack-lint library, on the real packs | step 11 | both commands exit 0; `real-packs.test.ts` finds no error finding |
| 1, "golden test passes with a fixture chapter containing one drifting paragraph" (line 20) | T2 | `goldenCase` through the composed app and the mock | `cd apps/api && npx vitest run test/packs/throughline-check.test.ts` | the case reports `match` against the golden built from the fixture chapter with one drifting paragraph; `output.kind` is `check`; `sourcesUsed` is `[]`; the call without `chapterText` returns 422 `TOOL_ARGS_INVALID` naming it, with no model call; one model request was recorded; the prompt holds the core idea and the drifting paragraph; the result holds the mock's finding |
| 2, "Manual eval case added." (line 21) | T3 | the eval case data file | `node --test scripts/eval-case-throughline-check.test.mjs` | the file has the documented keys and values; `sample` is `nonfiction`; `tools` is `["throughline_check"]`; `reason` is `completed`. The real-model run is not part of this test (open point 3) |
| Extra X1 | recipe golden | the golden on main against the new one | step 8 | exactly one catalogue line is inserted, at its name-order place; `messages[0]` and the story golden are unchanged |
| Extra X2 | tool list | `GET` on the composed app | step 5 (in the T2 file) | the row of `throughline_check` with origin `core` is `{enabled: true, valid: true, output: 'check'}` |

## 5. Downstream and parallel units

- **GNP-24 (remaining-shapes gate; blocked by GNP-20).** Its criterion 1 needs Throughline check to ship enabled: met by D1. Its criterion 2 needs one golden test per tool: T2 provides it. Its criterion 3 (the Remix enum) is unaffected, because a `check` tool is not a draft (checks.ts lines 97 and 98). Its demo step 1 runs Throughline check on a sample chapter with one drifting paragraph. The demo is not a criterion of GNP-24, and the tool takes the chapter as text, so the demo can paste the fixture chapter of step 3 as `chapterText`. GNP-20 adds nothing to `examples/` (section 7, point 2).
- **GNP-23 (remix; parallel to GNP-20; ships enabled).** Its `targetShape` enum lists only draft tools (GNP-23 unit line 16). Throughline check has output `check`, so it is not in the enum. `remix` adds a catalogue line to the recipe golden; it sorts between `propose_graph` and `throughline_check`. Whichever of GNP-20 and GNP-23 merges second regenerates the recipe golden (section 6).
- **GNP-21 and GNP-22 (parallel; both ship disabled).** The catalogue lists valid and enabled tools only (executor.service.ts line 163), so shipped disabled they add no catalogue line and share no path with this plan.
- **GNP-14 to GNP-17 (fiction tools, all `enabled: true`) and GNP-19.** Each enabled fiction tool adds a catalogue line in name order: `character_builder`, `dialogue`, `plot_manager` and `scene_builder` sort before `throughline_check`, `world_builder` after it. Any of them merged to main before this branch is regenerated into the golden at step 7, and step 8 expects exactly one new line at the name-order place. If this branch merges first, they regenerate it in their own PR (plans/GNP-04.md line 204). A conflict on that file already happened at GNP-10 (DECISIONS line 5247), and the answer was the same regeneration. GNP-17's `plot_manager` is also a `check` tool with text inputs; nothing in this plan constrains it.
- **AGL-25 (the eval script).** It reads each case file, and it needs no change. Its per-case needs (plans/AGL-25.md line 110) are met by D9.
- **Tool registry (TRG-07, TRG-12).** No change. The spec uses the output kind and the hints that the registry already accepts.
- **AGL-13 (output routing).** A `check` output is shown as a card and writes no file (AGL-13 unit, Decisions). Nothing changes there.
- **Platform mock server (PLT-12).** One scenario file is added. The server does not change.

## 6. Procedure notes for a rebase

If the rebase conflicts on `packages/packs/test/golden/propose_graph/recipe.golden.json`, take main's version of the file, then run step 7 again, step 10 on that file, and check X1 again against the new main. Do not merge the two versions by hand. If git refuses the rebase because of the golden (the GNP-10 case, DECISIONS line 5247), reset the branch to main and cherry-pick the code commit, then do the same.

## 7. Open points

None of these needs the Navigator.

1. **Reading of criterion 2 (line 21), closed.** "Manual eval case added." names no model run, so the data test T3 meets it word for word (D9). The data-only reading of DECISIONS line 5222 agrees; no confirmation is needed.
2. **The demo chapter for GNP-24, for GNP-24's plan.** GNP-24's demo step 1 needs a chapter with one drifting paragraph. The demo is not a criterion, and no GNP-24 criterion or scope item needs a file in `examples/`. GNP-24's plan can paste the step 3 fixture chapter as `chapterText`, or choose another chapter. GNP-20 does not edit `examples/` (D10; not in its Spec).
3. **The real-model run of the eval case, optional.** No GNP-20 criterion and no other unit's criterion needs it (GNP-12 criterion 4 covers the four workhorses only). This environment has no local model server. The implementer records it as not run; anyone with a model server may run `throughline-check` as scripts/eval-agent/README.md describes.

## 8. Facts checked and facts assumed

Checked in this session:

- GNP-20 unit, all 21 lines. It has no Why or Decisions section and no change note. The Spec is at lines 14 to 17 and the criteria at lines 20 and 21.
- units/README.md: the front matter, the blocker notation and the phase table (GNP-20 to GNP-24 in `phase:remaining-shapes`).
- modules/genre-packs.md: "Tool-spec content rules", "Common inputs", "Entity types", "Testing principles" and "Out of scope".
- Blockers on main: GNP-02 (100ce27, with criteria checked in d3e6674) and GNP-12 (4af6ff5, criteria checked and plan done; its criterion 4 is open). GNP-01 is on main as 80bdbea.
- GNP-24 unit: line 7 names GNP-20 in `blocked_by`, and line 17 ships Throughline check enabled.
- GNP-12 plan line 110: the common-input rule does not apply to GNP-20 (`output: check`).
- GNP-04 plan line 64 and line 204; DECISIONS line 5144 (point 2, option (a)); DECISIONS line 5118 (AGL-09 OP3); DECISIONS line 5222 (data-only reading); DECISIONS line 5247 (the GNP-10 rebase conflict on the recipe golden).
- The executor: `OUTPUT_SYSTEM_MESSAGES` (executor.service.ts lines 30 to 39, with `check` at lines 38 and 39) and the catalogue filter at line 163 (valid and enabled).
- The content suite: checks.ts lines 44, 52, 97 to 99.
- The golden helper and the fixture schema: `apps/api/test/packs/golden.kit.ts`; call.ts lines 47 to 49.
- The recipe golden lists the five enabled tools in name order, with propose_graph last (golden line 9). The order comes from `rows()` in catalog.service.ts, which sorts the names (line 436); `list()` returns those rows (line 197), and the executor reads the enabled ones (executor.service.ts line 163).
- The mock matcher is a substring match (server.mjs lines 124 and 125). The vitest flag is read from argv (apps/api/vitest.config.mts line 13).
- Precedent commits: ba67272 (GNP-08) and 0c2b965 (GNP-10) touch the same kinds of files as this plan; e43b77b (GNP-09) changes only the recipe golden's catalogue line.
- The eval README's keys and the five case files on main (cold-open, mystery-question, myth-buster, numbers-to-people, summarize-outline), and `scripts/eval-cases.test.mjs` (it reads every case file).
- The packs and API tests that use the real `propose_graph`: `apps/api/test/packs/propose-graph.test.ts` (line 14), `core-gate.test.ts` (one row), `agent-loop-output-routing.test.ts` and `agent-loop-pending-writes-gate.test.ts` (`.some` checks). No test on main counts the offered core tools.
- Planned plans GRR-10, SAU-22 and TRG-14: none of them changes a path of this plan.
- GNP-14 to GNP-19 and GNP-21 to GNP-23 have no plan file and no `unit/` branch (revision 2, at ef60970). GNP-14, GNP-15, GNP-16, GNP-17 and GNP-23 ship enabled tools (their unit Spec lines); GNP-21 and GNP-22 ship disabled.
- The catalogue sort is plain `[...names].sort()` (catalog.service.ts line 436): `world_builder` sorts after `throughline_check`; `remix` and `scene_builder` between `propose_graph` and it.
- `apps/api/test/agent-loop-workhorses.test.ts` uses the real packs and checks offered tools with `toContain` (lines 395, 481, 482). `scripts/eval-cases.test.mjs` accepts any case with the documented keys, so a case without `citations` passes it.
- No PLAN DOES NOT WORK report for GNP-20 in plans/DECISIONS.md; the only DECISIONS mentions of GNP-20 are lines 5155 and 5260.
- `.prettierignore` covers `units/`, `modules/`, `plans/`, `package-lock.json` and `apps/api/test/fixtures/lint/` only.

Assumed, to be checked in the steps:

- Node 26 and npm 11 are on PATH (the PLT-02 precedent; step 1).
- The rendered catalogue line matches the one in step 8 (format taken from the `propose_graph` line of the golden). The sort order is checked above; step 8 confirms the position.
- `npx vitest run <file> -- --update-goldens` works from `apps/api` as packages/packs/test/README.md describes (step 6).
- The mock streams one delta for a `check` call in the same way as for the draft scenarios (step 6).
- The eval's copy of the nonfiction sample contains `drafts/the-ten-thousand-hour-idea.md`, as examples/nonfiction does.
- No local model server is available here, so the eval run is not done.

## 9. Review parts

Part 1 (the whole plan; the plan is small): steps 1 to 16, with tests T1 and T2 (criterion 1), T3 (criterion 2), and the extra tests X1 and X2. Each step and each test is in this one part.
