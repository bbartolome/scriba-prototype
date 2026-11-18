---
id: GNP-20
status: draft
---
# GNP-20 plan — core/throughline_check tool

Batch: [GNP-20] (Genre packs, phase:remaining-shapes, M7), a batch of one. Revision 1, written against main at e7d7d3f. Status is `draft`: the plan is not reviewed.

Merge order: the plan holds whether GNP-20 merges before or after GNP-21, GNP-22, GNP-19 and the fiction tool units. Those units are parallel to GNP-20 and have no plan file yet. The only path they share with this plan is the propose_graph recipe golden. Step 7 regenerates that golden on the branch as rebased onto main, and step 8 compares it with main. So each merge order gives the same result (section 5).

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

**D1 Spec and place.** `core/tools/throughline_check.yaml`, name `throughline_check`, `output: check`, `enabled: true`. Source: GNP-20 unit line 15 (the file and its output); GNP-24 unit line 17 (Throughline check ships enabled).

**D2 Description.** The unit's sentence: "Flag any section of a chapter that drifts from its core idea." It is 62 characters, under the 120 limit, and starts with `flag`, which is in the verb list. Source: GNP-20 unit line 15; packages/packs/test/checks.ts line 44 (`DESCRIPTION_LIMIT`), line 52 (`flag` in `VERBS`) and line 99 (`checkDescription` on every tool); GNP-01 plan, open point 2 (the verb list); module "Tool-spec content rules" (one sentence, under about 120 characters, starts with a verb).

**D3 Inputs.** `chapterText` and `coreIdea`, both text ports, both required (GNP-20 unit line 16). The chapter is a text port, not an entity: the module's "Tool-spec content rules" say Throughline check takes chapter content on `text` ports, and "Out of scope" drops the Chapter entity type. No other common input: the module's "Common inputs" say a tool whose output is `check` takes only the subset that makes sense, as listed per unit. The identity rule covers draft tools only (packages/packs/test/checks.ts lines 97 and 98); GNP-12 plan line 110 agrees. `coreIdea` copies the hints of the common input in `packages/packs/nonfiction/tools/mystery_question.yaml` (type text, port, textarea, title "Core idea"). `chapterText` uses the same hints with the title "Chapter text" (plan choice).

**D4 Output and effects.** `check`: a card only, with no file (AGL-13 unit, Decisions, the `check` bullet; DECISIONS 2026-11-16, AGL-09 OP3, line 5118). With no entity inputs, `sourcesUsed` is `[]`. The module says the Tool registry computes `sourcesUsed` from entity-ID inputs.

**D5 Prompt.** The module's skeleton applies in part: a role line, the material, the steps, and the constraints. The material is the core idea and the chapter. The chapter is not an entity, so nothing is rendered with an ID. The steps are GNP-20 unit line 17, made concrete: one section for each paragraph; a section drifts when it makes a point the core idea does not carry, or argues against it; each drifting section gets one finding, a short reason and the opening words in double quotes. Constraints: "use only the chapter" and "never invent a section" (the skeleton's "use only the material", made concrete); "do not rewrite" (unit line 17); and the executor's own `check` format, one finding per line and the line `No findings.` when none (apps/api/src/modules/tool-registry/executor.service.ts lines 38 and 39, the `check` system message). The skeleton's citation, `TK` and style-profile clauses are left out, because the tool has no entity and no fact to cite. Source: module "Tool-spec content rules"; DECISIONS 2026-11-16, "GNP-04, GNP-07 — Navigator decisions", point 2, option (a) (line 5144); plans/GNP-04.md line 64, which names GNP-20 line 17 as a non-draft unit with its own prompt rules. The sections are the paragraphs (plan choice; unit line 17 says "sections/paragraphs").

**D6 Argument, not entity.** The chapter and the core idea are fixture arguments, and `entities` is `[]`. Source: plans/GNP-02.md line 134 (GNP-17 and GNP-20 pass fixture text as arguments); packages/contracts/src/tool-registry/call.ts lines 47 to 49 (`entities` is a required array).

**D7 Golden case.** One golden case in `apps/api/test/packs/`, with the fixture and the golden under `packages/packs/test/golden/throughline_check/`, and one mock scenario `pack-throughline_check.json`. Source: GNP-02 unit, Decisions; packages/packs/test/README.md, "Golden cases" and "Files and where they live". `invalidWithout` is `chapterText` (plan choice).

**D8 Recipe catalogue.** An enabled, valid core tool is listed in `{{toolCatalog}}` (executor.service.ts line 163), so the propose_graph recipe golden changes in this PR, and this PR regenerates it. Source: packages/packs/test/README.md, "Goldens that include the tool catalogue"; plans/GNP-04.md line 204; precedents e43b77b (the GNP-09 catalogue line alone) and ba67272 (GNP-08). The propose-graph test asserts only its own catalogue line (apps/api/test/packs/propose-graph.test.ts line 14), so the new line does not break it. The mock matches `lastMessageContent` by substring (e2e/fixtures/mock-openai/server.mjs lines 124 and 125), so the existing scenarios still match.

**D9 Eval case.** One case file with the keys `sample`, `intent` and `expect`. `expect` holds `reason` and `tools` (scripts/eval-agent/README.md, "Cases"). `citations` is left out, because the prompt asks for no `[@id]`; the report then shows it as `unchecked` (same README). The criterion is read as data only: the case is in the eval data and its data test passes. Source: DECISIONS 2026-11-16, Navigator session 8a43a36b415949f89ef1d21f4ea58eca, option (a) (line 5222), which GNP-08, GNP-09 and GNP-10 already follow; the real-model run is recorded as not run (open point 3). The data test is a new file, `scripts/eval-case-throughline-check.test.mjs`, in the form of `scripts/eval-case-myth-buster.test.mjs` (plan choice). It edits no shared file, so the parallel units cannot conflict on it.

**D10 What does not change.** No file under `examples/`, `units/`, `modules/` or `plans/`. Unit tests never read `examples/` (module "Testing principles"). `packages/packs/test/README.md`, the content suite, `scripts/eval-cases.test.mjs`, the Tool registry, the mock server and the package scripts do not change.

**D11 Test seams.** External behaviour only: the composed app's HTTP routes, the request the mock recorded, the golden files, and the eval data file (module "Testing principles"). No private helper and no executor internal.

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
   - T2 (criterion 1, golden): `goldenCase({tool: 'throughline_check', name: 'drifting-paragraph', expect: {kind: 'check', sourcesUsed: []}, invalidWithout: 'chapterText', check})`, with a 60000 ms timeout. The `check` callback asserts that the rendered user prompt contains `Core idea: Expertise grows from planned practice, not from the hours alone.`, the text `Sourdough starters need feeding every twelve hours`, and `No findings.`, and that `result.content` contains `Sourdough starters need feeding`.
   - X2 (extra, the tool list): `GET` the tool-list route with the real packs root, as `core-gate.test.ts` does, and assert the row of `throughline_check` with origin `core` matches `{enabled: true, valid: true, output: 'check'}`.

6. Golden for the new case. `cd apps/api && npx vitest run test/packs/throughline-check.test.ts -- --update-goldens`. Expected: exit 0, and `packages/packs/test/golden/throughline_check/drifting-paragraph.golden.json` is written with a system message and a user message. Then `npx vitest run test/packs/throughline-check.test.ts` with no flag. Expected: exit 0, and the case reports `match`, so the second run checks the file rather than writing it.

7. Recipe golden. `cd apps/api && npx vitest run test/packs/propose-graph.test.ts -- --update-goldens`. Expected: exit 0. `git diff --stat -- packages/packs/test/golden/propose_graph/` shows `recipe.golden.json` changed and `story.golden.json` unchanged. The precedent e43b77b shows that the story golden is written byte for byte.

8. Check X1. Parse `git show main:packages/packs/test/golden/propose_graph/recipe.golden.json` (the old file) and the working copy (the new file) as JSON, with `node --input-type=module -e`, and write no file. Expected: the two have the same keys; `messages[0]` is equal; `messages[1].content` of the new file is the old content with one line inserted after the line that starts with `- propose_graph:`. The inserted line is `- throughline_check: Flag any section of a chapter that drifts from its core idea. Output: check. Inputs: chapterText (text, single, required); coreIdea (text, single, required).` (predicted from the golden's existing lines). If the rendered line differs, stop and record the difference: it means the rendering rule is not the one this plan assumes.

9. Eval case. Create `scripts/eval-agent/cases/throughline-check.json` with `sample` `nonfiction`, `intent` `Check my draft the-ten-thousand-hour-idea against this core idea: expertise grows from planned practice, not from the hours alone. Flag any paragraph that drifts from it.`, and `expect` `{"reason": "completed", "tools": ["throughline_check"]}`. Create `scripts/eval-case-throughline-check.test.mjs` in the form of `scripts/eval-case-myth-buster.test.mjs`: the case file's top-level keys are exactly `expect`, `intent`, `sample`; the `expect` keys are exactly `reason` and `tools`; `sample` is `nonfiction`; `intent` is a non-empty string; `tools` is `["throughline_check"]`; `reason` is `completed`. Then `node --test scripts/eval-case-throughline-check.test.mjs scripts/eval-cases.test.mjs`. Expected: exit 0.

10. Format. `npx prettier --write` on the eight paths of section 2 (a golden's test is a parse comparison, not a byte comparison, so formatting cannot change a result), then `npx prettier --check` on the same paths. Expected: `All matched files use Prettier code style!`.

11. Validation suite (T1). `npm run lint:packs`, then `npm test -w @bbartolome/scriba-packs`. Expected: both exit 0, and `real-packs.test.ts` reports no error finding for the new spec.

12. Packs and agent tests. `cd apps/api && npx vitest run test/packs`. Expected: every case passes, including the propose-graph test and the two `throughline-check` tests. Then `npx vitest run test/agent-loop-output-routing.test.ts test/agent-loop-pending-writes-gate.test.ts`. Expected: pass. These two use the real `propose_graph` and only check that it is offered, so a new core tool must not break them.

13. Repo gates. From the root: `npm run build`, `npm run lint` and `npm test`. Expected: each exits 0. Record the counts. CI runs the same commands.

14. Scope. `git status --short` lists exactly the eight paths of section 2. `git diff --stat main` shows nothing under `units/`, `modules/`, `examples/` or `plans/`.

15. Commit. `git add` the eight paths by name, not with `-A`, and commit with `feat(GNP-20): core throughline_check tool with golden case and eval case`.

16. Record, after the review is approved. Tick GNP-20 unit lines 20 and 21 and set the plan's status to `done`, in a separate docs commit, as GNP-13 did in e7d7d3f. The real-model run of the eval case is recorded as not run in the implementation report (open point 3).

## 4. Acceptance criteria and tests

Each criterion has one test at least. The extra tests X1 and X2 are not named in the criteria, and they are marked as extra.

| Criterion (unit lines) | Test | Seam | Command | Pass condition |
|---|---|---|---|---|
| 1, "Passes the validation suite" (line 20) | T1 | content suite and the pack-lint library, on the real packs | step 11 | both commands exit 0; `real-packs.test.ts` finds no error finding |
| 1, "golden test passes with a fixture chapter containing one drifting paragraph" (line 20) | T2 | `goldenCase` through the composed app and the mock | `cd apps/api && npx vitest run test/packs/throughline-check.test.ts` | the case reports `match`; `output.kind` is `check`; `sourcesUsed` is `[]`; the call without `chapterText` returns 422 `TOOL_ARGS_INVALID` naming it, with no model call; one model request was recorded; the prompt holds the core idea, the drifting paragraph's opening words and `No findings.` |
| 2, "Manual eval case added." (line 21) | T3 | the eval case data file | `node --test scripts/eval-case-throughline-check.test.mjs` | the file has the documented keys and values; `sample` is `nonfiction`; `tools` is `["throughline_check"]`; `reason` is `completed`. The real-model run is not part of this test (open point 3) |
| Extra X1 | recipe golden | the golden on main against the new one | step 8 | exactly one catalogue line is inserted, after the propose_graph line; `messages[0]` and the story golden are unchanged |
| Extra X2 | tool list | `GET` on the composed app | step 5 (in the T2 file) | the row of `throughline_check` with origin `core` is `{enabled: true, valid: true, output: 'check'}` |

## 5. Downstream and parallel units

- **GNP-24 (remaining-shapes gate; blocked by GNP-20).** Its criterion 1 needs Throughline check to ship enabled: met by D1. Its criterion 2 needs one golden test per tool: T2 provides it. Its criterion 3 (the Remix enum) is unaffected, because a `check` tool is not a draft (checks.ts lines 97 and 98). Its demo step 1 runs Throughline check on a sample chapter with one drifting paragraph. GNP-20 provides no such chapter (open point 2).
- **GNP-23 (remix; parallel to GNP-20).** Its `targetShape` enum lists only draft tools (GNP-04 plan line 204). Throughline check is not in the enum. GNP-20 changes nothing for GNP-23.
- **GNP-21 and GNP-22 (parallel; both ship disabled).** Each adds a catalogue line to the recipe golden when it is enabled, and a disabled tool adds nothing, since the catalogue lists enabled tools only. Shipped disabled, they add no line; if they are enabled later, the same rule applies. Whichever of the two units merges second rebases and regenerates the recipe golden (plans/GNP-04.md line 204). A conflict on that file already happened once, at GNP-10 (DECISIONS line 5247), and the answer was the same regeneration. Steps 7 and 8 compare with the main the branch is rebased onto, so the result is the same in either order.
- **GNP-19 and the fiction tool units (parallel or earlier).** The same rule for the recipe golden: any enabled tool merged to main before this branch is regenerated into the golden at step 7, and step 8 then expects exactly one new line.
- **AGL-25 (the eval script).** It reads each case file, and it needs no change. Its per-case needs (plans/AGL-25.md line 110) are met by D9.
- **Tool registry (TRG-07, TRG-12).** No change. The spec uses the output kind and the hints that the registry already accepts.
- **AGL-13 (output routing).** A `check` output is shown as a card and writes no file (AGL-13 unit, Decisions). Nothing changes there.
- **Platform mock server (PLT-12).** One scenario file is added. The server does not change.

## 6. Procedure notes for a rebase

If the rebase conflicts on `packages/packs/test/golden/propose_graph/recipe.golden.json`, take main's version of the file, then run step 7 again and check X1 again. Do not merge the two versions by hand.

## 7. Open points

1. **Reading of criterion 2 for GNP-20 (line 21).** The plan reads it as data only, as GNP-08, GNP-09 and GNP-10 do (DECISIONS 2026-11-16, Navigator session 8a43a36b415949f89ef1d21f4ea58eca, option (a), line 5222). The Navigator should confirm that the reading covers this line too. No new decision is opened here.
2. **The demo chapter for GNP-24.** GNP-24's demo step 1 needs a sample chapter with one drifting paragraph. No unit provides one. GNP-20 adds only test fixtures and does not edit `examples/`. Checked: `examples/nonfiction/drafts/` holds four chapters, and only the opening of `the-ten-thousand-hour-idea.md` was read. Which unit adds the chapter, or whether GNP-24's plan does, is for the Navigator.
3. **The real-model run of the eval case.** No unit's done-when carries it. GNP-12 criterion 4 covers the four workhorses only, and its real-model part is still unticked (DECISIONS 2026-11-16, lines 5255 to 5260). This environment has no local model server, so the run cannot be done here. The Navigator should say who runs `throughline-check` with two models, as the eval README describes, and where the result is recorded.

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
- GNP-21 and GNP-22 have no plan file. GNP-23 has none either.
- `.prettierignore` covers `units/`, `modules/`, `plans/`, `package-lock.json` and `apps/api/test/fixtures/lint/` only.

Assumed, to be checked in the steps:

- Node 26 and npm 11 are on PATH (the PLT-02 precedent; step 1).
- The rendered catalogue line matches the one in step 8. The sort order is checked above; step 8 confirms the position.
- `npx vitest run <file> -- --update-goldens` works from `apps/api` as packages/packs/test/README.md describes (step 6).
- The mock streams one delta for a `check` call in the same way as for the draft scenarios (step 6).
- The eval's copy of the nonfiction sample contains `drafts/the-ten-thousand-hour-idea.md`, as examples/nonfiction does.
- No local model server is available here, so the eval run is not done.

## 9. Review parts

Part 1 (the whole plan; the plan is small): steps 1 to 16, with tests T1, T2, T3, X1 and X2. Each step and each test is in this one part.
