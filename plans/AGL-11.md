---
id: AGL-11
status: draft
---
# AGL-11 plan — narrative gate (closes Agent loop `phase:narrative-tools`)

Revision 1, written by the planner at main `ad3a421`. The planner changed no code, unit, module or other plan, and ran no test. Status stays `draft` until the reviser approves. The working tree's only change, `units/SAU-12-providers-step.md`, is not ours and is not touched.

## 1. Decisions this plan follows

- **Criteria, quoted as written.** Two criteria: unit lines 21 and 22. Nothing is weakened. Source: `units/AGL-11-narrative-gate.md` lines 21 to 22.
- **Criterion 1 has two parts.** The mock part (`sourcesUsed` and provenance through the mock) is CI. The `[@id]` part is the manual eval. Real models are not in CI. Source: unit line 21; `modules/agent-loop.md` line 67.
- **The four workhorses** are the built-in tools `cold_open`, `mystery_question`, `myth_buster` and `numbers_to_people`. Source: unit line 21; `packages/packs/nonfiction/tools/*.yaml`.
- **Test seam: the composed app with Platform's mock OpenAI server and scripted turns.** The unit heading has no seam parenthetical, so the module default applies. Source: `units/README.md` line 57; `modules/agent-loop.md` line 62.
- **Drafts are shown in the chat with provenance at M2.** No pending change exists yet, so no test asserts one. Draft provenance is `{runId, toolCallId, tool, entityIds, sourcesUsed, model, at}`. Source: `units/AGL-09-narrative-tools.md` line 22; `modules/agent-loop.md` line 80; `packages/contracts/src/agent-loop/provenance.ts` line 6.
- **Enable and disable take effect on the next agent run.** A call to a tool disabled mid-run is refused by the executor (AGL-09 open point 4, settled; `plans/DECISIONS.md` entry of 2026-11-16, line 5112). Source: unit line 18.
- **Reserved names.** None of the four workhorses clashes with the reserved names. Source: `modules/agent-loop.md` line 52.
- **Unit tests never read `examples/`, and no test file may name `examples/`.** The sample's IDs and paths are written as literals in the test. Source: `units/README.md` line 138; `scripts/examples-check/m1.mjs` lines 201 to 216.
- **Blockers are done.** AGL-09, AGL-10, GNP-12 and PST-14 all have `status: done`. Source: unit line 7; section 2, item C2.
- **The demo gates no criterion.** Its disabled-tool step gets test T5 in this plan. Its live ask is not run here (open point 5). Source: unit lines 24 to 25.
- **The e2e extension is optional and is not made.** The journey's agent-run step belongs to AGL-08 (`e2e/specs/journey.e2e.ts` line 210), and no criterion needs more. Source: unit line 18; `plans/PLT-13.md` line 267 (the shared harness stays as it is).
- **Mock scenarios are built inside the test, in a temp folder,** as AGL-09 and AGL-10 do. They are not added to `e2e/fixtures/mock-openai/scenarios/`, which every test reads (`server.mjs` line 53). Source: this plan (smaller choice).
- **Criterion 2 is met by the existing tests of AGL-09 and AGL-10.** No new test. Source: unit line 22; `plans/AGL-09.md` section 4; `plans/AGL-10.md` section 4.

## 2. Facts checked and facts assumed

### CHECKED

- C1. Branch `main`. The only uncommitted change is `units/SAU-12-providers-step.md` (`git status --short`). The unit file has one commit (`2fed3f4`) and no change note; its full text was read (26 lines).
- C2. `status: done` in `plans/AGL-09.md`, `plans/AGL-10.md`, `plans/GNP-12.md`, `plans/PST-14.md`. No plan has `status: draft` or `planned` apart from this one (`grep` over `plans/*.md`; `plans/DECISIONS.md` and `plans/QUEUE.md` have no status key). `plans/AGL-11.md` did not exist.
- C3. The four tools: `packages/packs/nonfiction/tools/{cold_open,mystery_question,myth_buster,numbers_to_people}.yaml`, each with `enabled: true` and `output: draft`. Required inputs: cold_open `[coreIdea, person]`; mystery_question `[coreIdea, puzzle]`; myth_buster `[coreIdea, belief, claimIds]`; numbers_to_people `[coreIdea, statistic, person]`. Each prompt has one `[@` citation rule. Entity inputs: `entityIds` (all four), `person` of kind `person` (cold_open, numbers_to_people), `claimIds` of kind `claim` (myth_buster), `styleProfile` of style kind (all four).
- C4. Built-in origins are `core`, `nonfiction`, `fiction` (`packages/contracts/src/tool-registry/constants.ts` line 55). A project with `genrePack: nonfiction` is offered `core` and `nonfiction` (`apps/api/src/modules/tool-registry/catalog.service.ts` lines 65 to 69). `packages/packs/fiction/` has empty `tools` and `entity-types`. `core/tools/propose_graph.yaml` is `enabled: true` and is offered too (its output kind is not re-checked here).
- C5. Sample entities in `examples/nonfiction/entities/`: `book-style` (style-profile), `deliberate-practice` (concept), `hours-figure-is-average` (claim), `k-anders-ericsson` (person), `plateau-is-reorganising` (claim). Sample sources in `examples/nonfiction/sources/`: `deliberate-practice-notes`, `learning-plateaus-notes`, `outline`, `ten-thousand-hours-notes`, each with `type: source`.
- C6. `examples/nonfiction/project.yaml` has no `styleProfile` key (`grep -c` gives 0).
- C7. `sourcesUsed` is the unique non-style entity-ref IDs in field order (`apps/api/src/modules/tool-registry/executor.service.ts` lines 149 to 151). The narrative handler's `entityIds` are the unique IDs of all entity and style fields in field order (`apps/api/src/modules/agent-loop/tools/narrative-tools.ts`, `referencesOf` and line 151). An empty style field takes the project's `styleProfile` (`filledArguments`, around lines 66 to 84).
- C8. The golden test of cold_open expects `sourcesUsed` `['notes-a', 'notes-b', 'researcher-a']` (entityIds, then person) and checks that the prompt holds each ID and `[@` (`apps/api/test/packs/cold-open.test.ts`).
- C9. Provenance is built for draft results in `provenanceOf` (`apps/api/src/modules/agent-loop/agent-run.ts` line 242, called at line 277). The `tool-call-error` emit is at line 299. The not-offered answer is `{kind: 'error', message: 'This tool is not available in this agent run.', attempt: 1}` (`apps/api/src/modules/agent-loop/tools/tool-run.ts` lines 18 and 119).
- C10. Mock matchers (`e2e/fixtures/mock-openai/server.mjs` lines 103 to 140): `endpoint`, `turnIndex` (count of assistant messages), `lastMessageContent` (substring of the last message), `toolResultPresent`. Every JSON file in the scenario folder is loaded (line 53). `toolCalls` replies take `calls: [{name, argumentChunks}]` (format of `e2e/fixtures/mock-openai/scenarios/tool-call.json`).
- C11. Helpers exist: `apps/api/test/create-test-app.ts`, `guard-request.ts`, `invariant-sweep.ts` (`observeEvents`), `project-store-projects.kit.ts` (`buildProjectsLibrary`), `providers-client.kit.ts` (`recordsOf`, `startMockOpenAI`), `sse.ts` (`dataOf`). Routes: `TOOL_ENABLED_ROUTE` is `/api/tool-registry/tools/:name/enabled` (`packages/contracts/src/tool-registry/routes.ts` lines 15 to 16); `AGENT_RUNS_ROUTE` is `/api/agent-loop/runs` (`packages/contracts/src/agent-loop/routes.ts` line 3).
- C12. The tests named in criterion 2 exist. `apps/api/test/agent-loop-narrative.test.ts`: T1 (line 286), T2 (335), T3 (390), T4 (458). `apps/api/test/agent-loop-search.test.ts`: AC1 (331), AC2 (422). `apps/web/src/app/features/agent-loop/chat-page.spec.ts`: W1 (536). `apps/web/src/app/features/agent-loop/agent-contract.spec.ts`: W2 (370).
- C13. Helper lines to copy from `apps/api/test/agent-loop-narrative.test.ts`: the imports (lines 1 to 42, only those used), `FIXTURE_PACKS` (line 48), `SettingsOptions` to `settingsText` (lines 50 to 87), `Harness` (lines 89 to 96), `openHarness` (lines 117 to 153), `post`, `get`, `startRun`, `readUntilEnded` (lines 155 to 200), and the chat-body helpers `WireMessage`, `ChatBody`, `toolNamesOf`, `chatBodies`, `toolContents` (lines 202 to 229). Do not copy `writeNarrativeProject` (lines 98 to 115), `draftSteps`, `DRAFT_ARGS`, `runDraft` or the tests.
- C14. No real-model server here. `command -v ollama` finds nothing. `127.0.0.1:11434` and `127.0.0.1:8080` do not answer (HTTP 000). Same finding as GNP-12 plan section 2, item 13.
- C15. The eval cases of the four workhorses exist: `scripts/eval-agent/cases/{cold-open,mystery-question,myth-buster,numbers-to-people}.json`. The script checks citation presence, not the IDs (`scripts/eval-agent/README.md`; GNP-12 plan section 2, item 12).
- C16. GNP-12's criteria 1 and 2 are ticked, and criteria 3 and 4 (lines 19 and 20) are not (`units/GNP-12-workhorses-gate.md` lines 17 to 20). The merge closed the phase with lines 19 and 20 open. `plans/DECISIONS.md` line 5260 says that AGL-11's own done-when still needs a real-model `[@id]` run.
- C17. No unit's `blocked_by` names AGL-11 (`grep` over `units/`). AGL-12, AGL-13 and AGL-14 name AGL-11 only in `parallel_with`. `plans/DECISIONS.md` names AGL-11 only at line 5260.
- C18. The mock names every scenario by its file name, and `recordsOf(mock, name)` returns its requests in arrival order (`apps/api/test/providers-client.kit.ts` line 61).

### ASSUMED

- A1. The field order of the three workhorses other than cold_open is YAML property order, as the golden test shows for cold_open. The C1 table relies on it. The test checks it, and a mismatch stops the run (procedure step 10).
- A2. The AGL-09 and AGL-10 tests and the four golden tests pass on main. Not run by the planner. The implementer runs them in procedure step 2.
- A3. The app boots with `SCRIBA_PACKS_DIR` set to `packages/packs` and offers the four tools. Supported by the golden tests, which load the same root (`apps/api/test/packs/golden.kit.ts`; `apps/api/test/packs/core-entity-types.test.ts` line 69).
- A4. A not-offered call is returned to the model as a `tool` message, so the agent's second request has `toolResultPresent: true`. T5 checks it.
- A5. The `tool-call-error` event carries the outcome's `message` (C9). T5 checks it.

### Inconsistencies found (reported, not changed)

- I1. Unit `unblocks` (line 9) is not the exact inverse that `units/README.md` line 64 requires. No unit's `blocked_by` names AGL-11. Its two quoted entries are informative only (README line 65). "Tool registry editor-ui demo step 5" is not named by TRG-17 (`units/TRG-17-editor-ui-gate.md` line 7).
- I2. Unit `blocked_by` (line 7) names the whole gate "Project store phase:search (PST-14)". AGL-11 uses no Project store search directly. AGL-10 already names PST-13. `units/README.md` line 63 says to name the unit when only part of a phase is needed. `modules/agent-loop.md` line 11 says units wait only on what they use.
- I3. Unit criterion 1 says "cites its source files". `sourcesUsed` holds entity IDs (`packages/contracts/src/agent-loop/events.ts` line 43). For cold_open and numbers_to_people the IDs include a person, and for myth_buster a claim, as well as source IDs.
- I4. The module's dependency graph (`modules/agent-loop.md` line 27) shows AGL-11 blocked only by GNP-12. The unit names four blockers.
- I5. `examples/nonfiction/project.yaml` names no `styleProfile`, although the sample has the style entity `book-style` (C6). Owned by PST-11 / GNP-11, not this unit.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/test/agent-loop-workhorses.test.ts` | new | Criterion 1 (C1 test, four rows) and the demo test T5 |

Nothing else changes. Not changed: `units/**`, `modules/**`, other `plans/**`, `e2e/**` (including the scenario folder), `packages/packs/**`, `apps/api/src/**`, `scripts/**`, and `apps/api/test/agent-loop-narrative.test.ts` (its helpers are copied, not imported or edited). The orchestrator commits. The planner writes only `plans/AGL-11.md`.

## 4. Procedure

1. Check the state. `git branch --show-current` prints `main`. `git status --short` shows only `units/SAU-12-providers-step.md`. Do not stage or touch that file.
2. Criterion 2 first, before writing anything. From `apps/api`, run `npx vitest run test/agent-loop-narrative.test.ts test/agent-loop-search.test.ts`. Expected: 6 passed (T1 to T4, AC1, AC2). From the root, run `npm test -w @bbartolome/scriba-web -- --include src/app/features/agent-loop/chat-page.spec.ts` and the same with `agent-contract.spec.ts`. Expected: W1 and W2 pass. If any fails, stop and report "PLAN DOES NOT WORK" with the failing test name.
3. Create `apps/api/test/agent-loop-workhorses.test.ts`. Define `PACKS_ROOT = join(__dirname, '..', '..', '..', 'packages', 'packs')`.
4. Copy the helpers listed in C13 from `agent-loop-narrative.test.ts`. In `openHarness`, change the `env` to `{ SCRIBA_PACKS_DIR: PACKS_ROOT }`. Use `writeWorkhorseProject` (step 5) in place of `writeNarrativeProject`. Do not edit the old file.
5. Write `writeWorkhorseProject(library)`. It writes `book/project.yaml` as `schemaVersion: 1`, `title: Book`, `genrePack: nonfiction`, `styleProfile: book-style`. The test names the style so that the style field is filled (C6). It writes these entities, with ID = file name, and short literal bodies of the test's own:
   - `entities/book-style.md` (`type: style-profile`), `entities/k-anders-ericsson.md` (`type: person`), `entities/deliberate-practice.md` (`type: concept`), `entities/hours-figure-is-average.md` (`type: claim`), `entities/plateau-is-reorganising.md` (`type: claim`);
   - `sources/deliberate-practice-notes.md`, `sources/learning-plateaus-notes.md`, `sources/ten-thousand-hours-notes.md` (each with `type: source`).
   The IDs are the sample's IDs (C5). No file is read from `examples/`, and the word `examples/` appears nowhere in the file.
6. Define the table `WORKHORSE_CASES`. Each row has `tool`, `intent`, `coreIdea`, `arguments` and `sourcesUsed`. The intent must not contain the `coreIdea` text. The rows are in section 5, table 2.
7. Write the C1 test as `it.each(WORKHORSE_CASES)`, named `C1 %s: called by the agent from an intent, the workhorse returns a draft whose sourcesUsed and provenance name its sources`. For each row:
   a. Scenario `workhorse-<tool>`, steps in this order (the first match wins, and the executor's request also has `toolResultPresent: false`):
      - A: `{match: {endpoint: 'chat', lastMessageContent: <coreIdea>}, reply: {kind: 'stream', deltas: ['Scripted draft.']}}`;
      - B: `{match: {endpoint: 'chat', toolResultPresent: false}, reply: {kind: 'toolCalls', calls: [{name: <tool>, argumentChunks: [JSON.stringify(<arguments>)]}]}}`;
      - C: `{match: {endpoint: 'chat', toolResultPresent: true}, reply: {kind: 'stream', deltas: ['Drafted.']}}`.
   b. Open the harness with that scenario. Open the stream with `observeEvents`, start the run with `{intent}`, and read with `readUntilEnded`.
   c. Assert the events of the run: `run-started`; `tool-call-started` with `name` = tool and `family` `narrative`; `tool-call-args` with `valid: true`; `tool-call-result` with `output` `{kind: 'draft', content: 'Scripted draft.'}` and `sourcesUsed` equal to the row's `sourcesUsed` (exact order). Its `provenance` parses with `draftProvenanceSchema` and equals `{runId, toolCallId, tool, entityIds, sourcesUsed, model: 'mock-model', at}`, where `toolCallId` is the `callId` of `tool-call-started`, `sourcesUsed` is the row's list, and `entityIds` is the sorted list of the row's `sourcesUsed` plus `book-style` (compare sorted). `at` is an ISO time. Last, `run-ended` with `reason: 'completed'`.
   d. Read the mock's `chat` records. Expect three. Record 0 offers the tool in `tools`. Record 1 is the executor's request: its last user message contains the `coreIdea`, each `sourcesUsed` ID, and `[@`. Record 2 contains a `tool` message.
   e. Close the harness in a `finally`.
8. Write T5, named `T5 demo: a disabled myth_buster is not offered, and a scripted call to it is refused`. Steps:
   a. Scenario steps: (1) on `toolResultPresent: false`, `toolCalls` for `myth_buster` with arguments `{coreIdea: 'Myth check', belief: 'Ten thousand hours makes an expert', claimIds: ['hours-figure-is-average']}`; (2) on `toolResultPresent: true`, `stream` `Noted.`.
   b. Before the run, `POST` `TOOL_ENABLED_ROUTE` with `:name` replaced by `myth_buster` and body `{enabled: false}`, as T1 does.
   c. Start the run with intent `Bust the myth that ten thousand hours is a threshold.` Read until `run-ended`.
   d. Assert: record 0's tools contain `cold_open` and not `myth_buster`; a `tool-call-error` event has `message` `This tool is not available in this agent run.` and `attempt` 1; no `tool-call-result`; there are exactly two chat records, so no executor request was made.
9. Run `cd apps/api && npx vitest run test/agent-loop-workhorses.test.ts`. Expected: 5 passed (four C1 rows and T5).
10. If a C1 row's `sourcesUsed` or `entityIds` differs from the run, stop and report it, with the event and the row. Do not change the expected values to fit the code (A1).
11. Format and lint. From the root, run `npx prettier --check apps/api/test/agent-loop-workhorses.test.ts` and `npm run lint -w @bbartolome/scriba-api`. Run `grep -n "examples/" apps/api/test/agent-loop-workhorses.test.ts`, which must print nothing (the rule in `scripts/examples-check/m1.mjs`).
12. Gates. `npm test -w @bbartolome/scriba-api` exits 0. Root `npm test` and root `npm run lint` exit 0 (the lint includes `lint:examples`).
13. Report the results. List the C1 rows and T5 as passed. List criterion 2's six API tests and two web specs as passed. Record the `[@id]` part of criterion 1 as "not run: no model server", with the C14 evidence. Its box stays unticked unless the Navigator decides otherwise (open point 1).

## 5. Tests

Table 1. One test for each criterion, with the unit line.

| Criterion (unit line) | Test (file, name) | What it asserts | Runnable here |
|---|---|---|---|
| 21, mock part | `apps/api/test/agent-loop-workhorses.test.ts`, `C1 <tool>: ...` (`it.each`, four rows) | Procedure step 7 (c and d): the tool is offered and called from an intent; the `tool-call-result` has `draft` output, exact `sourcesUsed` and the provenance; the executor's prompt holds each ID and `[@` | Yes |
| 21, `[@id]` part | none in CI | The manual eval with a real model (GNP-12 plan section 8, point 2; `scripts/eval-agent`) | No: open point 1 |
| 22 | existing: `agent-loop-narrative.test.ts` T1, T2, T3, T4; `agent-loop-search.test.ts` AC1, AC2; `chat-page.spec.ts` W1; `agent-contract.spec.ts` W2 | The assertions of AGL-09 section 4 and AGL-10 section 4, as they stand | Yes |
| Demo step 2 (not a criterion) | `apps/api/test/agent-loop-workhorses.test.ts`, T5 | Procedure step 8 (d) | Yes |
| Demo steps 1 and 3 (not a criterion) | none | The live "draft a cold open" ask and the card's IDs | No: open point 5 |

Table 2. The four rows of `WORKHORSE_CASES`. All IDs are the sample's IDs (C5). Every `sourcesUsed` list includes at least one `source`-type ID (I3).

| Tool | Intent (the test's own text) | Arguments (besides `coreIdea`) | Expected `sourcesUsed`, exact order |
|---|---|---|---|
| `cold_open` | Draft a cold open about K. Anders Ericsson from my notes. | `entityIds: [deliberate-practice-notes, ten-thousand-hours-notes]`, `person: k-anders-ericsson` | `[deliberate-practice-notes, ten-thousand-hours-notes, k-anders-ericsson]` |
| `mystery_question` | Open a chapter with the puzzle of the ten thousand hour figure. | `entityIds: [deliberate-practice, learning-plateaus-notes]`, `puzzle: Why do some learners stall after years of practice` | `[deliberate-practice, learning-plateaus-notes]` |
| `myth_buster` | Bust the myth that ten thousand hours is a threshold. | `entityIds: [ten-thousand-hours-notes]`, `belief: Ten thousand hours makes an expert`, `claimIds: [hours-figure-is-average]` | `[ten-thousand-hours-notes, hours-figure-is-average]` |
| `numbers_to_people` | Turn the ten thousand hour figure into a person's story. | `entityIds: [ten-thousand-hours-notes]`, `statistic: A figure of ten thousand hours from one 1993 study`, `person: k-anders-ericsson` | `[ten-thousand-hours-notes, k-anders-ericsson]` |

Each row's `coreIdea` is a short phrase of the test's own, with no full stop, and it appears in no intent.

## 6. Agreement with downstream units

- **GNP-12** (closed by its merge; `units/GNP-12-workhorses-gate.md`). Criterion 4 of GNP-12 owes the same real-model run as criterion 1 here (GNP-12 plan section 8, point 2). This plan provides nothing new for it. The run is open point 1.
- **TRG-17** (`units/TRG-17-editor-ui-gate.md`). Its `blocked_by` does not name AGL-11, so it needs nothing from this gate. The unit's quoted unblocks entry is informative only (I1).
- **GNP-20, GNP-21, GNP-22** name only GNP-12 and the Genre packs gates. Nothing from AGL-11 is needed.
- **AGL-12, AGL-13, AGL-14** (`parallel_with` AGL-11). None of them names AGL-11 in `blocked_by`. AGL-12 is blocked by AGL-02, AGL-08 and PST-15; AGL-13 by AGL-09, AGL-12 and GRR-01; AGL-14 by AGL-07, AGL-12 and SHL-12. This plan changes only a new test file and no shared file, so no merge conflict is expected. Provided.
- **AGL-09 and AGL-10** (blockers). Their tests are run as they stand and are not changed. Provided.
- **AGL-25** (manual eval script). No change. The four existing eval cases are the manual part of criterion 1. Provided.
- **PLT-13 and the e2e journey** (`e2e/specs/journey.e2e.ts`). No change. Provided.
- **Phase `phase:pending-writes`** (AGL-12 to AGL-15). None of its units names `phase:narrative-tools` or AGL-11 in `blocked_by`. Nothing needed.

## 7. Open points

1. **Criterion 1, the `[@id]` part, cannot run here** (C14). Options: (a) a person with a local model server runs the procedure of GNP-12 plan section 8, point 2 (the same four cases, the same run), then ticks line 21; the merge goes in with line 21 unticked and "not run: no model server" as the cause, as the Navigator decided for GNP-12 (`plans/DECISIONS.md` line 5255 to 5260); (b) hold the merge until the run is recorded. This changes a criterion's state, so the planner does not decide it. Navigator to choose.
2. **Blocker `"Project store phase:search (PST-14)"`** (I2). Options: keep as written, or change it to the unit PST-13, which AGL-10 already reaches. A change of `blocked_by` is a unit change. All four blockers are done, so the plan does not wait on it.
3. **`unblocks` is not an exact inverse** (I1). Options: leave it, or the unit owner removes the quoted entries. Not a criterion.
4. **Reading of "cites its source files"** (I3). The test asserts exact `sourcesUsed` IDs, which include source IDs for each case, so both the strict and the loose reading pass. Navigator to confirm that this reading is the one meant.
5. **Demo steps 1 and 3** (the live ask and the card's IDs) need a real model and are not run here. The demo gates no criterion, and T5 covers its disabled-tool step. Navigator to confirm nothing more is owed at this gate.
6. **Module graph** (I4) is incomplete and is reported only.
