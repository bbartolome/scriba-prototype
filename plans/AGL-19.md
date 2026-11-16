---
id: AGL-19
status: draft
---
# AGL-19 plan — grounding-claims draft and its mock turns

Revision 1, planner, from main at `78a6056` (tree clean). Status stays `draft` until the Navigator settles open points 1 to 3 (section 7). The planner changed no file except this one, and ran only read-only checks: no test, lint or e2e run.

AGL-19 adds one draft (chapter 4 of the sample), one line of the outline that names it, and the scripted extract and judge turns that the mock serves for it. Criterion 1 is the examples check. Criterion 2 is an e2e test on the real stack, because no committed unit test may read `examples/` (section 4.1 explains; open point 1 asks the Navigator to confirm the seam).

## 1. Decisions this plan follows

The last bullet, "Small choices", lists the planner's choices that DECISIONS does not settle. They are recorded here only.

- **Content.** One draft whose claims the sources support, weakly support and do not support, with one invented statistic that appears in no source. One check shows all three verdicts. Source: unit line 15.
- **Claims versus statuses.** `plateau-is-reorganising` has `status: weak` (`examples/nonfiction/entities/plateau-is-reorganising.md` line 5). `hours-figure-is-average` has `status: supported` (`…/hours-figure-is-average.md` line 5). The draft states the first claim, verbatim, with a weak verdict, and does not mention the ten-thousand-hour figure. Source: unit line 16; `units/GNP-11-nonfiction-sample-entities.md` line 18 ("coordinate when that draft lands"); DECISIONS line 5042.
- **Chapter.** The draft takes one chapter marked `not started`, from 4 to 6. It begins with that chapter's `# Chapter N: Title` line and updates its `Draft:` line in `sources/outline.md`. Source: DECISIONS line 3097; `plans/PST-11.md` line 39 (D9) and line 67 (drafts start with `# Chapter N: Title`).
- **Count.** Four drafts in all (PST-11's three plus this one). CEX-08 says 2 to 4 drafts; CEX-20 says four chapters. Source: DECISIONS lines 3060 and 3061; `units/CEX-08-nonfiction-sample-order.md` line 17; `units/CEX-20-milestone-gate.md` lines 22 and 25.
- **Blockers on main.** `AGL-16` (its plan's status is done, and its engine and kit are on main), `PST-11` and `GNP-11` (plans done). Source: unit line 7; DECISIONS lines 5407 to 5420.
- **Mock contract (the sample paths and markers are the contract).** Markers `Task: extract claims.` and `Task: judge claims.` (`apps/api/src/modules/agent-loop/grounding-prompts.ts` lines 8 and 9). `RETRIEVAL_LIMIT` 5 (line 12), `JUDGE_BATCH_SIZE` 10 (line 14), `MODEL_ATTEMPTS` 3 (line 16). The extract request's user message is the marker, a blank line, then the draft (`grounding-engine.ts` line 165). The judge request's user message is the marker, a blank line, then `Claim <index>: <text>` and `Passage <path> at <offset>: <snippet>` lines (lines 195 to 199). The index is the claim's global position in the extract list. A judge reply gives exactly one verdict per claim of its batch (AGL-16 plan section 4.1, open point 2). A `supported` or `weak` verdict must cite a retrieved passage, or it is downgraded to `unsupported` (AGL-16 plan section 4.1, step 6). Source: `plans/AGL-16.md` section 4.1.
- **Evidence.** Only `sources/` grounds a claim. The artefact is `logs/grounding/<path>.json` (`packages/contracts/src/agent-loop/constants.ts` lines 82 and 83; `grounding-engine.ts` line 151). Source: `modules/agent-loop.md` lines 54 and 56.
- **Check-only run.** `POST /api/agent-loop/grounding {path}` requires an active project, no active run and a provider (`apps/api/src/modules/agent-loop/agent-runs.service.ts` lines 90 to 100 and 103 to 120). The run it starts has `checkPath` and no model loop; its only step is the check (`agent-run.ts` lines 53 and 54, 197 and 198). `plans/AGL-17.md` line 273 lets AGL-19 use the real route once AGL-17 merges.
- **Style and citations.** Plain, short sentences, no banned phrase (`examples/nonfiction/entities/book-style.md` lines 3 and 5). The draft has no `[@id]`: an unknown id fails the examples check (`scripts/examples-check/pack.mjs` lines 133 to 138), and CEX-07 checks the same. Drafts have no front matter (`plans/PST-11.md` line 67).
- **Sample rules.** A sample ships no `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions` (`scripts/examples-check/m1.mjs` line 19). A scenario that names a sample file is a contract with `examples/` (`units/PLT-12-mock-openai-server.md` line 26).
- **Test rules.** Unit tests never read `examples/` (`units/README.md` line 138; `modules/project-store.md` line 59). A `*.test.*` or `*.spec.*` file that names `examples/` fails the examples check (`m1.mjs` lines 25 and 26, 30 to 33, 201 to 222). E2e specs (`*.e2e.ts`, `e2e/playwright.config.ts` line 11) are outside that scan.
- **Small choices.** Chapter 4, because it is the only not-started chapter whose research note exists (`sources/outline.md` line 36 names `sources/learning-plateaus-notes.md`). File `drafts/the-plateau-is-not-the-end.md`, by the slug rule of the three existing drafts. Scenario name `grounding-claims`. Spec `e2e/specs/grounding-sample.e2e.ts`. Project folder `grounding-sample`. Claims spans are UTF-16 offsets, `end` exclusive. The four judge reasons are the sentences in section 4.2.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `examples/nonfiction/drafts/the-plateau-is-not-the-end.md` | new | Chapter 4 draft: the four claims of section 4.2 |
| `examples/nonfiction/sources/outline.md` | edit, line 34 only | `Draft: not started.` becomes ``Draft: `drafts/the-plateau-is-not-the-end.md`.`` |
| `e2e/fixtures/mock-openai/scenarios/grounding-claims.json` | new | Two steps: the extract turn and the judge turn, each matched on its marker |
| `e2e/specs/grounding-sample.e2e.ts` | new | Test T2 (section 4.3) |
| `units/AGL-19-grounding-sample-draft.md` | edit, last commit only | Ticks the two boxes; no text changes (as AGL-16 step 6) |
| `plans/AGL-19.md` | edit, last commit only | `status: done` |

Not changed: `examples/nonfiction/project.yaml` (CEX-08 owns `order`); `examples/samples.yaml`; the other drafts, sources and entities; `apps/api/**` (no code, and the AGL-16 kit stays as it is); `e2e/fixtures/mock-openai/server.mjs` and the other scenarios; `scripts/**`; `packages/**`; `modules/**`; `plans/DECISIONS.md`; every other unit.

## 3. Procedure (code stage)

0. **Worktree.** From `main`, `git worktree add <path> -b unit/AGL-19`, then `npm ci` in the worktree before step 7. Record `git rev-parse --short HEAD` as `<base>`. Expected: `git status --short` prints nothing.
1. **Outline.** Edit line 34 of `examples/nonfiction/sources/outline.md` as section 2 says. Expected: `git diff` changes that one line.
2. **Draft.** Write `examples/nonfiction/drafts/the-plateau-is-not-the-end.md` to the constraints of section 4.2, then `npx prettier --write` it. Expected: `grep -c '^# Chapter 4: The Plateau Is Not the End$'` prints 1; `grep -c '\[@'` prints 0; `grep -ci 'game-changer\|unlock your potential'` prints 0; the body is 250 to 350 words.
3. **Spans.** For claims 0 to 3 of section 4.2, record `start`, the UTF-16 index of the claim's first character in the file as written (a read-only `node -e` with `indexOf`), and `end` = `start` + the claim's length. Each claim must occur once in the file. Expected: four pairs, all inside the draft.
4. **Commit 1 (content).** `git add -- examples/nonfiction/drafts/the-plateau-is-not-the-end.md examples/nonfiction/sources/outline.md`, then `git commit -m "feat(AGL-19): add the chapter 4 grounding draft to the sample"`.
5. **Scenario.** Write `e2e/fixtures/mock-openai/scenarios/grounding-claims.json` with the two steps of section 4.2, using the spans of step 3. Then `npx prettier --write` it. Expected: `npx prettier --check` on the file passes. The mock loads every scenario file at start and throws on invalid JSON or an unknown reply kind (`server.mjs` lines 51 to 84).
6. **Spec.** Write `e2e/specs/grounding-sample.e2e.ts` (T2, section 4.3), then `npx prettier --write` it. Expected: `npm run lint -w @bbartolome/scriba-e2e` exits 0, and `npm run build` typechecks it.
7. **T1.** `npm run lint:examples`. Expected: exit 0, and the line `examples check passed: 1 sample(s), …`.
8. **T2.** `npm run e2e -w @bbartolome/scriba-e2e -- grounding-sample`. Expected: the one test passes. If the citation assertion (T2 step 9b) fails for an offset, read the judge request the mock recorded (the test prints the recorded `Passage` lines for that claim), choose a retrieved passage of the same file that supports the same verdict, change that offset in the scenario, and run again. If no retrieved passage supports the verdict, stop and report. Do not change a verdict to fit the retrieval.
9. **Base comparison.** Run `npm run e2e` on `<base>` and on the branch, and compare the pass and fail list. The e2e library is shared, so a new project could change another spec. Expected: the only difference is the new test.
10. **Root gates.** `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0, and `prettier --check .` covers the new files.
11. **Commit 2 (scenario and spec).** `git add -- e2e/fixtures/mock-openai/scenarios/grounding-claims.json e2e/specs/grounding-sample.e2e.ts`, then `git commit -m "test(AGL-19): mock extract and judge turns and the grounding sample check"`.
12. **Record and close.** Store the output of T1 and T2 and the Node and npm versions. In a last commit, tick the two boxes of the unit file (text unchanged) and set this plan to `status: done`: `docs(AGL-19): criteria checked, plan status done`.

## 4. Acceptance criteria and tests

### 4.1 Seam and route for criterion 2 (choice and reason)

Criterion 2 needs the check of the sample's draft, on a temp copy. A vitest API test in `apps/api/test/` cannot do that. It would need the draft and the sources, which exist only in `examples/`, and a test file that names `examples/` fails the examples check (section 1, test rules). A helper file that reads `examples/` for a unit test breaks the same rule in another file, so it is not used.

The e2e harness is where the product reads the sample. `e2e/harness/global-setup.ts` line 81 starts the API with `SCRIBA_EXAMPLES_DIR` set to the repository's `examples/`. The spec copies the sample into the e2e library through `POST /api/project-store/projects/start-from-sample`, which gives the temp copy the criterion asks for. E2e specs are not in the examples check's scan.

Route: the **real route**, `POST /api/agent-loop/grounding` with `{path}`, not the kit. The kit (`apps/api/test/agent-loop-grounding.kit.ts`, routes at lines 20 and 24) is test-only: it is not in the app that e2e boots (`apps/api/dist/main.js`). The real route is the production "Check grounding" path. It takes one POST and one file read, which is the simplest route that this seam allows. `plans/AGL-17.md` line 273 allows the real route after AGL-17 merges, and AGL-17 is done.

The choice of this seam needs the Navigator (open point 1). The route follows from it.

### 4.2 The draft and the scripted turns

Draft constraints: the file of section 2; the H1 `# Chapter 4: The Plateau Is Not the End`; 250 to 350 words; 4 to 6 paragraphs; no list, no front matter, no link, no image and no `[@id]`; plain, short sentences; original prose. The only figures are `1897` and `1899` (`sources/learning-plateaus-notes.md` line 12) and `six weeks`, which is the invented statistic. The draft does not mention hours, chapter 3 or the ten-thousand-hour figure. Each claim below is a full sentence, ASCII, verbatim, once, in this order:

| Index | Claim (verbatim) | Verdict | Cited passage (path, offset) | Basis |
|---|---|---|---|---|
| 0 | `Bryan and Harter studied people learning telegraphy in 1897 and 1899.` | supported | `sources/learning-plateaus-notes.md`, 350 | Block at line 12 of the notes |
| 1 | `The studies covered telegraph learners, not the adults this book is written for.` | supported | `sources/learning-plateaus-notes.md`, 1027 | Block at line 20 of the notes |
| 2 | `A learning plateau can be a stage of reorganising rather than an end.` | weak | `sources/learning-plateaus-notes.md`, 853 | Block at line 18 of the notes; the same statement as `plateau-is-reorganising.md` line 3, whose status is weak |
| 3 | `Most learners break through a plateau within six weeks.` | unsupported | none (`passage` null) | The notes give no durations (line 18) |

The offsets are the UTF-16 positions of the first non-space character of each block, in the file as on disk. The body blocks of `learning-plateaus-notes.md` start at 252, 282, 350, 513, 646, 853, 1027 and 1275 (the heading, the opening line, then the paragraphs of lines 12 to 22). They were computed read-only with the rules of `apps/api/src/modules/project-store/search-index.ts` lines 70 to 77 and 81 to 107 (section 8). All four claims share at least one word with a source, so all four go to the judge in one batch (4 is at most 10). The judge reply therefore lists indices 0 to 3, once each.

The scripted turns, in `grounding-claims.json`, are two steps in this order:
- Step 1: `match` `{"endpoint": "chat", "lastMessageContent": "Task: extract claims."}`; `reply` `{"kind": "stream", "deltas": [S1]}`, where S1 is the JSON string `{"claims": [...]}`. The list has the four claims in the order above, each `{"text": <claim>, "span": {"start": <start>, "end": <end>}}` with the spans of procedure step 3.
- Step 2: `match` `{"endpoint": "chat", "lastMessageContent": "Task: judge claims."}`; `reply` `{"kind": "stream", "deltas": [S2]}`, where S2 is `{"verdicts": [...]}` with four entries, each `{"claim": <index>, "verdict": <verdict>, "passage": {"path": <path>, "offset": <offset>} or null, "reason": <text>}`. The reasons: 0, "The notes date the telegraph studies to 1897 and 1899."; 1, "The notes say the studies are narrow: telegraph learners only."; 2, "The notes state the idea, but only for telegraph learners and from memory."; 3, "No source gives a duration for a plateau."

The mock uses the first step whose matchers all hold (`server.mjs` lines 133 to 139). The marker is in the last message, so each step matches only its own request. A request that matches neither step gets HTTP 500 (lines 305 to 307), which fails the check visibly.

### 4.3 Criteria and tests

The unit has two criteria (unit lines 21 and 22). Each has one test. No criterion text changes.

| Criterion (unit line) | Test | Command | Pass condition |
|---|---|---|---|
| "Platform's examples check still passes." (21) | **T1.** The examples check. | `npm run lint:examples` (`package.json` line 27, which runs `scripts/examples-check/index.mjs`) | Exit 0, and the line `examples check passed: 1 sample(s), …` (`index.mjs` lines 87 and 88). The draft adds no issue: the per-sample checks read project.yaml and the entity and source folders (`m1.mjs` lines 45 to 52), the test-file scan finds no `examples/` name (lines 201 to 222), and the draft has no citation (`pack.mjs` lines 133 to 138). |
| "A check of the draft against the mock yields at least one claim of each verdict, every supported/weak verdict citing a retrieved `sources/` passage (asserted on a temp copy, not `examples/`)." (22) | **T2.** One test, in `e2e/specs/grounding-sample.e2e.ts`: "the grounding-claims draft yields all three verdicts, and each supported or weak verdict cites a retrieved sources passage". | `npm run e2e -w @bbartolome/scriba-e2e -- grounding-sample` | The test passes (steps and assertions below). |

T2 steps:
1. Sign in as `e2e/specs/tools-try.e2e.ts` does (its `setUp`, lines 32 to 35: read `<library>/.scriba/setup-url`, then `page.goto`). Copy the helper; do not import it from another spec (as `plans/TRG-14.md` line 110 does for its helper).
2. Read the active project: `GET /api/project-store/active`.
3. `POST /api/project-store/projects/start-from-sample` with `{sampleId: "nonfiction", folderName: "grounding-sample", title: "Grounding sample"}` and the origin header of the other specs. Expected: 201 (`samples.controller.ts` lines 24 and 25). The new project is not activated (`samples.service.ts` line 79).
4. `POST /api/project-store/active` with `{projectId: "grounding-sample"}` (`activateRequestSchema`, `packages/contracts/src/project-store/project.ts` line 72). Expected: a 2xx status.
5. Provider, as `tools-try.e2e.ts` lines 95 to 103 and 113 to 119: `POST /api/providers` with `baseURL` `<SCRIBA_E2E_MOCK_URL>/scenario/grounding-claims/v1` and model `mock-model`, then `POST /api/providers/app-default` with that provider. Keep the prior app default for step 10.
6. Reset the mock's record of this scenario: `POST <mock>/__mock/scenarios/grounding-claims/reset`. Expected: 204 (`server.mjs` lines 248 to 257).
7. `POST /api/agent-loop/grounding` with `{path: "drafts/the-plateau-is-not-the-end.md"}`. Expected: 200 (`agent-runs.controller.ts` lines 43 to 50).
8. Poll (`expect.poll`) until `<SCRIBA_E2E_LIBRARY>/grounding-sample/logs/grounding/drafts/the-plateau-is-not-the-end.md.json` exists, then parse it as JSON. The e2e package does not depend on the contracts package, so the test does not schema-parse it. The file is written by the engine (`grounding-engine.ts` line 151).
9. Assertions:
   - (a) The verdicts include at least one `supported`, one `weak` and one `unsupported` (`constants.ts` line 73).
   - (b) Each `supported` or `weak` claim has a `passage.path` that starts with `sources/`, and the judge request the mock recorded (`GET <mock>/__mock/scenarios/grounding-claims/requests`, the record whose last message contains `Task: judge claims.`) contains the line `Passage <path> at <offset>: ` for that passage. That line is the retrieved passage as the judge saw it, so this is the test of "retrieved".
   - (c) The claim `A learning plateau can be a stage of reorganising rather than an end.` has verdict `weak`, which is the status GNP-11 gave its entity.
10. In `finally`: restore the prior app default, as `tools-try.e2e.ts` does at line 148. If a project was active before the test, activate it again. If none was active, leave the project active, as the other specs do.

## 5. Downstream agreement

- **AGL-20 (grounding gate; `blocked_by` includes AGL-19, unit line 7).** Its criterion 2 (unit line 18) is the check that T2 runs. Its demo (line 24) opens `drafts/the-plateau-is-not-the-end.md`, and its "invented statistic marked unsupported" is claim 3. Its criterion 3 (the downgrade) is AGL-16's test G1, not AGL-19's. AGL-20 needs nothing from this plan beyond the file name and the verdicts.
- **CEX-08 and CEX-20 (four chapters).** The draft is the fourth chapter and the outline names it, so the sample has four drafts. `modules/compile-export.md` line 62 and CEX-20 demo step 1 (unit line 25) then hold. CEX-08 says "2 to 4 drafts of a few hundred words" (unit line 17); 250 to 350 words fits. CEX-08's line 18 says to keep "any file paths used by the mock OpenAI scenarios unchanged". The scenario names `sources/learning-plateaus-notes.md`, which this plan does not rename. CEX-08 owns `order` in `project.yaml`, which must list the fourth draft (open point 3).
- **CEX-06 (unsupported and weak findings).** It reads `logs/grounding/<path>.json` (`units/CEX-06-claims-orphans-checks.md` line 15). `unsupported` gives an error and `weak` a warning (line 16). CEX-20 demo step 3 (unit line 27) expects "the unsupported-claims finding from the grounding-claims draft". The draft provides it, after a check, through claim 3 (error) and claim 2 (warning).
- **CEX-07 (entity links and banned phrases).** The draft has no entity reference and no banned phrase, so it passes both checks.
- **GNP-11 (done; unit line 18 asks for coordination).** The statuses agree. Claim 2 is weak, and no claim contradicts `hours-figure-is-average` (supported). This section is the coordination GNP-11 asked for.
- **PST-11 (done).** D9 holds (`plans/PST-11.md` line 39): each `drafts/` file is named by exactly one outline chapter, and that chapter's heading matches the file's first line. The outline's chapter 4 Draft line now names the new file. Chapters 5 and 6 stay `not started`.
- **AGL-16 and AGL-17 (done).** T2 uses the markers, formats and limits of AGL-16 section 4.1, and the real route and artefact of AGL-17. `plans/AGL-17.md` lines 267 to 273 name the three paths AGL-19 changes (`examples/nonfiction/drafts/**`, `e2e/fixtures/mock-openai/scenarios/**`, `sources/outline.md`). This plan changes exactly those three, and adds the e2e spec, which AGL-17 does not name. No change to either plan.
- **AGL-18 (done).** Its badges read the result shape. No change.
- **PLT-12 (done) and the scenario contract.** A later edit of the draft, of the outline's chapter 4 line, or of the three cited blocks of `learning-plateaus-notes.md` updates the scenario in the same PR (`units/PLT-12-mock-openai-server.md` line 26).
- **GRR-16 (unit, no plan).** Its recipe reads `drafts/` and uses a temp copy from "start from sample" (`units/GRR-16-sample-recipe.md` line 27). No conflict; the draft is one more file there.
- **AGL-08 (done).** Its scenario `summarize-outline` reads `sources/outline.md` and must not reuse its name (`plans/AGL-08.md` line 164). The name `grounding-claims` is unused. The outline change does not affect that scenario's static reply.

## 6. Other plans and units that touch the same files

Plans with status `draft` or `planned` (`grep -l "^status: \(draft\|planned\)" plans/*.md`): only `plans/TRG-14.md` (line 3). It changes `apps/web/src/app/features/tool-registry/**`, `apps/web/package.json` and `package-lock.json`. It has no file in common with AGL-19, so either order is correct.

Units and done plans with files in common:

| Unit or plan | Status | Files it changes or reads | Change it makes | How both orders stay correct |
|---|---|---|---|---|
| CEX-08 | unit, no plan | `examples/nonfiction/project.yaml` (adds `order` and export settings) | Adds the `order` list | AGL-19 does not touch project.yaml. Whichever merges later, the `order` list must name `drafts/the-plateau-is-not-the-end.md` (open point 3) |
| AGL-15 | unit, no plan | The e2e "accept change" step; "the agent edits a draft" (unit line 17) | An agent edit of a draft | If it edits `drafts/the-plateau-is-not-the-end.md`, the spans and offsets go stale. Its PR must name another draft or update the scenario (open point 5) |
| GNP-08 | done | `plans/GNP-08.md` line 36 and `scripts/eval-agent/cases/mystery-question.json` line 3 (intent "Open chapter 4 with a puzzle…") | Manual eval case; not run in CI | The case still runs; open point 4 |
| PST-22 | unit | `drafts/born-to-it.md` (chapter 1 only) | Tightens chapter 1 | No file in common |
| PST-11 | done | `sources/outline.md` Draft lines (D9); the three drafts | Predicted this change (`plans/PST-11.md` line 158) | This is the change PST-11 predicted |
| AGL-17 | done | `plans/AGL-17.md` lines 267 to 273 name AGL-19's paths | None | Consistent |
| PLT-12 | done | `e2e/fixtures/mock-openai/scenarios/` | None | The new scenario name is unique |

## 7. Open points for the Navigator

1. **Seam for criterion 2 (decide before the code stage).** The unit asks for the check "on a temp copy, not `examples/`". Unit tests may not read `examples/` (`units/README.md` line 138; `modules/project-store.md` line 59), and the examples check fails any test file that names it (`m1.mjs` lines 25, 26 and 201 to 222). Plan default: the e2e spec of section 4.3, on the real route. This adds an e2e step that `modules/agent-loop.md` line 66 does not list (it lists the agent-run and accept-change steps). Options: (a) the default; (b) a recorded command, as GNP-11 D9 (`plans/GNP-11.md` line 48) and PST-11 D11 (`plans/PST-11.md` line 41) did, with the API booted outside a test (heavier, and manual); (c) exempt one test file from the rule, as `scripts/examples-check*.test.mjs` is exempt (`m1.mjs` line 26). Option (c) changes PLT-20's rule and is not recommended.
2. **Whether `npm run e2e` runs in the implementer's environment.** Chromium is cached (`plans/TRG-14.md` line 79); the planner did not run e2e. If it cannot run, the Navigator decides (GNP-11 open point 2 is the precedent).
3. **Who lists the fourth draft in `project.yaml` `order`.** CEX-08 owns `order` and is not blocked by AGL-19. CEX-20 demo step 1 (unit line 25) needs four chapters in `order`. Plan default: CEX-08 lists `drafts/the-plateau-is-not-the-end.md`, whichever merges later must cover it, and AGL-19 does not edit `project.yaml`. The Navigator confirms or assigns this.
4. **GNP-08's chapter 4 assumption and the manual eval case.** GNP-08 (plan line 36) assumed that chapter 4 has no draft, and the manual case `scripts/eval-agent/cases/mystery-question.json` (line 3) asks the agent to open chapter 4. No CI check reads either. The Navigator decides whether the case changes. Low priority.
5. **AGL-15 and the chapter 4 draft.** AGL-15 has no plan, and its scope says "the agent edits a draft" without naming one. The Navigator names a different draft for it, or accepts a scenario update in its PR. Low priority until AGL-15 is planned.

## 8. Facts checked and assumed

### 8.1 Checked (file and line)

Unit and module:
- `units/AGL-19-grounding-sample-draft.md`: front matter line 7 (`blocked_by`, with "AGL-16"), line 8 (`parallel_with`), line 9 (`unblocks`); Decisions lines 15 to 18; criteria heading line 20; criteria lines 21 and 22.
- `units/AGL-20-grounding-gate.md`: line 7 (`blocked_by`); criteria lines 17 to 21; demo line 24.
- `modules/agent-loop.md`: line 11 (ordering), line 44 (AGL-19 after its content gates and AGL-16), line 54 (writes only to `logs/`), line 56 (only `sources/` grounds), line 61 (external behaviour), line 62 (primary seam), line 66 (system seam: agent run and accept change).
- `units/README.md` line 138 (unit tests never read `examples/`); lines 59 to 65 (blocker notation).
- `modules/project-store.md` line 59 (tests never read `examples/`); `modules/compile-export.md` line 62 (manual: four-chapter sample).
- `units/CEX-06-claims-orphans-checks.md` lines 15 and 16; `units/CEX-08-nonfiction-sample-order.md` lines 17, 18 and 22; `units/CEX-20-milestone-gate.md` lines 22, 25 and 27.
- `units/GNP-11-nonfiction-sample-entities.md` line 18; `units/PST-11-nonfiction-sample-skeleton.md` line 26; `units/PLT-12-mock-openai-server.md` line 26; `units/GRR-16-sample-recipe.md` line 27.

Decisions and plans:
- `plans/DECISIONS.md`: lines 3060 and 3061 (four chapters; CEX-08 2 to 4 drafts); line 3097 (AGL-19 hand-off: a not-started chapter, heading, Draft line); line 5042 (claim statuses handed to AGL-19); lines 5407 to 5420 (AGL-16 test seam: the kit "until AGL-17 exists", and AGL-19 waits for AGL-16); lines 5422 to 5425 (harness boot list).
- `plans/AGL-16.md`: front matter `status: done`; section 4.1 (formats, limits, retry rules); section 4.1 step 6 (downgrade); section 6 (AGL-19 notes); section 8 point 2.
- `plans/AGL-17.md`: `status: done` (line 3); lines 267 to 273 (AGL-19 notes; real route after AGL-17).
- `plans/PST-11.md`: `status: done` (line 3); line 39 (D9); line 41 (D11); line 67 (drafts start with `# Chapter N: Title`); line 158 (AGL-19 hand-off).
- `plans/GNP-11.md`: `status: done` (line 3); line 48 (D9, no committed test). `plans/GNP-08.md`: `status: done` (line 3); line 36 (C6). `plans/AGL-08.md` line 164. `plans/TRG-14.md`: `status: planned` (line 3); line 79 (browsers); line 110 (copied helper).

Sample:
- `examples/nonfiction/sources/outline.md`: line 32 (chapter 4 heading); line 34 (`Draft: not started.`); line 36 (chapter 4 purpose, naming `learning-plateaus-notes.md`); lines 40 and 46 (chapters 5 and 6 `not started`); lines 16, 22 and 28 (Draft lines of chapters 1 to 3).
- `examples/nonfiction/drafts/`: three files (`born-to-it.md`, `what-counts-as-practice.md`, `the-ten-thousand-hour-idea.md`), each with `# Chapter N: Title` on line 1. No chapter 4 file.
- `examples/nonfiction/sources/learning-plateaus-notes.md`: line 4 (citation); line 5 (reliability: from memory); line 12 (Bryan and Harter block); line 14 (speed block); line 16 (change-of-method block); line 18 (chapter 4 block, "The notes give no rates or durations"); line 20 (narrow-subject block); line 22 (verification status). No CR characters.
- `examples/nonfiction/entities/plateau-is-reorganising.md`: line 3 (statement); line 5 (`status: weak`). `hours-figure-is-average.md`: line 5 (`status: supported`). `book-style.md`: line 3 (tone) and line 5 (`bannedPhrases`).
- `examples/nonfiction/project.yaml`: lines 1 to 4, no `order`. `examples/samples.yaml` line 1 (`id: nonfiction`).
- `grep` over `examples/` for "weeks": no match (exit 1).

Code, mock and harness:
- `e2e/fixtures/mock-openai/server.mjs`: lines 51 to 84 (scenarios loaded by file name, validated); 103 to 131 (matchers; `lastMessageContent` at 124 and 125); 133 to 139 (first matching step); 211 (scenario route); 245 (records); 248 to 257 (reset); 305 to 307 (no step: HTTP 500); 319 to 345 (reply rendering); 359 to 370 (stream items).
- `e2e/harness/global-setup.ts`: line 25 (`SCRIBA_E2E_LIBRARY`); line 31 (default mock); line 33 (`SCRIBA_E2E_MOCK_URL`); lines 60 to 72 (builds); lines 74 to 85 (API started with `SCRIBA_EXAMPLES_DIR` at the repository's examples, line 81).
- `e2e/playwright.config.ts`: line 11 (`testMatch` `**/*.e2e.ts`); line 13 (`workers: 1`).
- `e2e/specs/tools-try.e2e.ts`: lines 32 to 35 (`setUp`); lines 95 to 103 (provider); lines 113 to 119 (app default); line 148 (restore).
- `e2e/package.json`: no dependency on `@bbartolome/scriba-contracts`.
- `apps/api/src/modules/agent-loop/grounding-prompts.ts`: lines 8 and 9 (markers); line 12 (`RETRIEVAL_LIMIT` 5); line 14 (`JUDGE_BATCH_SIZE` 10); line 16 (`MODEL_ATTEMPTS` 3).
- `apps/api/src/modules/agent-loop/grounding-engine.ts`: line 151 (artefact path); line 165 (extract message); lines 195 to 199 (judge message).
- `apps/api/src/modules/agent-loop/agent-runs.service.ts`: lines 90 to 100 (`checkGrounding`); lines 103 to 120 (`admit`); line 182 (`current`).
- `apps/api/src/modules/agent-loop/agent-run.ts`: lines 53 and 54 (`checkPath`); lines 197 and 198 (the check is the only step).
- `apps/api/src/modules/agent-loop/agent-runs.controller.ts`: lines 28 to 32 (GET current); lines 43 to 50 (POST grounding, 200).
- `apps/api/test/agent-loop-grounding.kit.ts`: lines 20 and 24 (route under `api/agent-loop-test`).
- `apps/api/test/create-test-app.ts` line 81 (`SCRIBA_EXAMPLES_DIR` default in tests).
- `apps/api/src/modules/project-store/search-index.ts`: lines 70 to 77 (`blockPassage`); lines 81 to 107 (`chunkText`: front-matter values and body blocks).
- `apps/api/src/modules/project-store/search.service.ts` line 103 (FTS `snippet()`, an excerpt, not the block text).
- `packages/contracts/src/agent-loop/routes.ts` lines 5 and 10; `grounding.ts` lines 50 to 53 (`{path}`); `constants.ts` line 73 (verdicts) and lines 82 and 83 (artefact prefix and suffix).
- `packages/contracts/src/project-store/routes.ts` lines 9 to 12 (start-from-sample, samples, active) and lines 31 and 32 (search); `project.ts` lines 65 to 69 (`startFromSampleRequestSchema`) and line 72 (`activateRequestSchema`); `search.ts` lines 12 to 20 (passage and result array).
- `apps/api/src/modules/project-store/samples.controller.ts` lines 24 and 25 (201); `samples.service.ts` line 79 (not activated).
- `scripts/examples-check/index.mjs` lines 81 to 96 (layers and output); `m1.mjs` lines 19 (excluded paths), 25 and 26 (test pattern and exemption), 30 to 33 (name patterns), 45 to 52 (per-sample checks), 201 to 222 (test-file scan); `pack.mjs` lines 133 to 138 (citations in drafts); `package.json` line 27 (`lint:examples`).
- `scripts/eval-agent/cases/mystery-question.json` line 3.

### 8.2 Assumed (not checked)

- A1. `npm run e2e` runs here. Chromium is cached (TRG-14 plan line 79); the planner did not run e2e.
- A2. The offsets 350, 853 and 1027 are the block starts that the running API computes. They follow the rules of `search-index.ts` lines 70 to 107, applied read-only. The built code was not run.
- A3. Each cited passage is among the top 5 results for its claim. The ranking was not computed. T2 step 9(b) tests it, and procedure step 8 is the fallback.
- A4. Each claim shares at least one word with a `sources/` passage, so all four go to the judge. Expected from the notes' wording; T2's recorded judge request shows it.
- A5. `start-from-sample` copies the sample's files unchanged (`units/PST-05-start-from-sample.md`; not read in full). The folder name `grounding-sample` passes the project folder-name pattern in `project.ts` (not read).
- A6. A new project in the shared e2e library does not change other specs' results (procedure step 9 checks it).
- A7. The POST requests need the origin header that the other specs send (`tools-try.e2e.ts` constants, not re-read).
- A8. The engine joins the stream's text deltas into one string (AGL-16 plan, assumption A3). AGL-16's tests exercise this path on main; the planner did not run them.
