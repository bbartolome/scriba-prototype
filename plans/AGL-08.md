---
id: AGL-08
status: draft
---
# AGL-08 plan — file-tools-chat gate: summarize-outline scenario, the e2e agent-run step, two scripted turns

Batch: [AGL-08] (Agent loop, `phase:file-tools-chat`, M1; the gate that closes the phase). Batch of one. Revision 1, a draft, written against `main` at `6ba3516`. The unit file has no change note (`grep -n -i "by revision" units/AGL-08-file-tools-chat-gate.md` finds none). Status stays `draft` until the reviser moves it.

## 1. Decisions this plan follows

Unit and module

- **Scope.** One mock scenario for the "summarize my outline" turn (`list_files`, then `read_file` of `sources/outline.md`, then text), referencing the nonfiction sample, and the e2e "agent run" step. Source: unit lines 17 and 18; module line 66 (system seam).
- **Criterion 1 is proven only in the e2e.** Unit tests never read `examples/`. The examples check fails any `*.test.ts` or `*.spec.ts` file that names `examples/` (rules R1 and R2). Source: `units/README.md` line 138; `scripts/examples-check/m1.mjs` lines 24 to 33.
- **Two scripted turns that AGL-02 assigns to this unit.** An outside-path refusal and a malformed-turn withdrawal, through the composed app and the mock. Source: `plans/AGL-02.md` line 201 (O5: "AGL-08's planner adds the two scripted turns"); `modules/agent-loop.md` line 62 (primary seam: composed app with scripted turns).
- **The other named criteria are existing tests.** Section 4 maps each criterion named in unit line 22 to a test already on `main`. Source: unit line 22; the criteria of `units/AGL-02-tool-framework-file-reads.md` lines 25 to 27, `units/AGL-03-loop-core.md` lines 31 to 36, `units/AGL-04-transcripts-history.md` line 25, `units/AGL-05-current-run-state.md` lines 23 to 25 and `units/AGL-07-chat-panel-ui.md` line 28.
- **No other file changes.** The mock server, the harness, the Playwright config, CI, the contracts and the web app stay as they are. Source: `plans/PLT-13.md` line 260 (AGL-08 "needs" a scenario file and the step body, nothing else); `.github/workflows/ci.yml` lines 32 to 35 already run `npm run e2e`.
- **No fix in source code.** If a composed-app test fails on `main`, the plan stops and reports it. The owner unit fixes it. Source: unit line 22 (criteria "pass on `main`"); the owner of each criterion is its own unit (`units/README.md` line 110).

Scenario

- **File and folder.** `e2e/fixtures/mock-openai/scenarios/summarize-outline.json`, beside the shipped files. The mock loads every `*.json` in its default folder at start (`e2e/fixtures/mock-openai/server.mjs` lines 51 to 84), and the e2e starts it with that folder (`e2e/harness/global-setup.ts` line 31). Source: `plans/PLT-12.md` line 37 (decision 12) and line 207 (AGL-08 needs "a scenario file in `scenarios/`, beside the two shipped files"). PLT-12 decision 15 (line 42) named two shipped files; the folder now holds more, which does not change the rule that a new scenario is one additive file.
- **Sample path rule.** The scenario names `sources/outline.md`. If that sample file is renamed, this scenario changes in the same PR. Source: `plans/PLT-12.md` line 41 (decision 14).
- **Matchers.** Each step names `endpoint: "chat"` and `turnIndex` 0, 1 and 2. The turn index counts `assistant` messages in the body (`server.mjs` lines 117 to 121). Matcher names are typed exactly, because the loader does not reject an unknown name (`plans/DECISIONS.md` line 688), and a step that names only a header also matches models requests (`plans/DECISIONS.md` line 689). Source: `server.mjs` lines 103 to 139.
- **Answer.** One sentence that is not in the outline, so the e2e can tell the answer from the card text: "The outline has six chapters: ...". The six chapter headings are at `examples/nonfiction/sources/outline.md` lines 7, 13, 19, 25, 31 and 37. `chunkDelayMs` is 150, so the stream lasts about one second and a person can press Stop in the demo. Source: `server.mjs` lines 359 to 370 (`streamItems` waits `chunkDelayMs` before each delta).

E2E step (`e2e/specs/journey.e2e.ts`)

- **Project.** The step uses `demo-book`, which the previous step creates and activates. No second folder is made. Source: `journey.e2e.ts` lines 77 and 83. `plans/PST-09.md` line 141 leaves the choice to AGL-08. This plan chooses reuse, because `Start from sample` with the same name gets `PROJECT_EXISTS`.
- **Provider through the API.** `POST /api/providers` (create, 201), then `POST /api/providers/app-default` (200). Source: `apps/api/src/modules/providers/providers.controller.ts` lines 55 to 56 and 73 to 74; routes in `packages/contracts/src/providers/routes.ts` lines 3 and 5; unit line 18 ("configure a provider through the Model providers API"). The route and URL form are the ones MPR-08 uses (`plans/MPR-08.md` line 40, D7).
- **The default must change.** The seeded app default is the Ollama preset (`apps/api/src/modules/providers/providers.seeding.ts` line 71). The step points the default at its own provider, so the run never reaches Ollama.
- **Create body.** `label` `Mock`, so the id is `mock` (`providers.registry.ts` lines 122 to 127 and 131 to 137; a clash would get a suffix, lines 139 to 145). Fields: `kind` `openai-compatible`, `baseURL` `${SCRIBA_E2E_MOCK_URL}/scenario/summarize-outline/v1`, `model` `mock-model`, and the five `PROVIDER_DEFAULTS` values typed literally: temperature 0.7, contextSize 64000, maxTokens 4096, timeout 120000, retries 2 (`packages/contracts/src/providers/defaults.ts` lines 4 to 10). Every field is required by `providerCreateSchema` (`packages/contracts/src/providers/config.ts` lines 53 to 63). The values are literal because the e2e workspace has no contracts dependency (`e2e/package.json` lines 12 to 16).
- **Origin.** The two POSTs send `origin: http://127.0.0.1:8080`. The guard refuses an unsafe method unless its Origin matches the Host's configured origin (`apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 65 to 72; `request-policy.ts` lines 14 to 19; `e2e/playwright.config.ts` line 20, `baseURL`).
- **Selectors.** Textbox `Intent` (`apps/web/src/app/features/agent-loop/chat-page.ts` lines 331 to 332); button `Send` (lines 338 to 340); button `Stop`, shown only while a run is active (lines 341 to 345); region `Messages` (line 305); article `Tool call: <name>` (`apps/web/src/app/shell/tool-call-card.ts` line 162). The card header holds the name, the status and the summary (lines 163 to 178, summary at 175 to 176), so the summary is readable with the card collapsed. These are the labels AGL-07 says AGL-08 names in its own plan (`plans/AGL-07.md` line 129).
- **Expected summaries.** `list_files` with `{}` answers `Listed the project root.` (`apps/api/src/modules/agent-loop/tools/builtin-tools.ts` lines 62 and 67, `folderName` at lines 29 to 34). `read_file` of `sources/outline.md` answers `Read sources/outline.md.` (line 91).
- **Waits.** The card, answer and Stop checks take an explicit 15 s timeout. Playwright's default `expect` timeout is 5 s, and `units/README.md` line 126 names explicit wait timeouts for load-sensitive specs.
- **Transcript.** After the run, the project's `logs/agent-runs` folder holds one file. Source: `apps/api/src/modules/agent-loop/transcript-reader.ts` line 20 (`TRANSCRIPT_FOLDER`); `units/AGL-04-transcripts-history.md` line 18. This is part of demo step 5.
- **Owner comment and other blocks.** The owner comment on line 95 stays unchanged, because criterion 3 of PLT-13 counts `// Owner:` comments (`plans/PLT-13.md` line 145). The "accept change" and "manuscript" steps stay pending.
- **State left behind.** The step leaves the app default on the mock. No later spec reads provider state: the setup wizard's providers text is static (`apps/web/src/app/features/setup-auth/step-body.ts` lines 22 to 24), and `e2e/specs/setup-phone.e2e.ts` line 240 checks only that text.

Composed-app tests (`apps/api/test/agent-loop-run.test.ts`)

- **Location.** The two tests are appended to the file that already holds the harness: `openHarness` (lines 84 to 116), `post` (118), `startRun` (130), `readUntilEnded` (140), `toolNamesOf` (168) and `chatBodies` (172). The tests need exactly that harness, so nothing is copied.
- **R1 (AC1 through the composed app).** The refusal's model text is the readable line followed by the summary line (`apps/api/test/agent-loop-tools.test.ts` lines 96 to 135, the assertion `${refusal.message}\n${refusal.summary}`). A tool message carries the outcome's message for an error (`apps/api/src/modules/agent-loop/agent-run.ts` lines 299 to 300).
- **W1 (AC2 and AC3 through the composed app).** The three malformed messages are `apps/api/test/agent-loop-tools.test.ts` lines 202 to 240. The third call's message is the readable lines, the summary and the withdrawn sentence (lines 271 to 300; `WITHDRAWN` at `apps/api/src/modules/agent-loop/tools/tool-run.ts` line 19, used in `readableMessage` at line 192).

Criteria mapping

- **"Reload-restores-state" (unit line 22)** is read as AGL-05's current-run-state criteria (`units/AGL-05-current-run-state.md` lines 19 and 23 to 24) and AGL-07's reconnect criterion (`units/AGL-07-chat-panel-ui.md` line 28; test `T3` at `apps/web/src/app/features/agent-loop/chat-page.spec.ts` line 292). Open point 2.
- **Demo.** Demo steps 3 to 5 of unit lines 25 to 30 are manual and outside the gate. Open point 3.

Smaller decisions of this plan

- Names: scenario `summarize-outline`; provider label `Mock`; tests `R1` and `W1`; helper `toolContents`; constants `READ_SUMMARY` and `WITHDRAWN`, copied from the tools test (that file does not export them).
- Mock records are read with `fetch`, as `global-setup.ts` lines 88 to 96 do.
- The pending count is read from the Playwright JSON report (`e2e/playwright.config.ts` line 17, `test-results/report.json`), as PLT-13 criterion 2 does.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` | new | The three scripted steps (section 3, step 3). Formatted with Prettier (`plans/PLT-12.md` decision 20) |
| `e2e/specs/journey.e2e.ts` | edit | Replaces the one-line body of the agent-run step. Anchor by text: `await test.step('agent run', () => pending(testInfo, 'agent run'));`. The owner comment above it stays. `readdir` joins `readFile` in the `node:fs/promises` import on line 2 |
| `apps/api/test/agent-loop-run.test.ts` | edit | Adds the constants `READ_SUMMARY` and `WITHDRAWN` and the helper `toolContents` after `chatBodies` (anchor: `function chatBodies`). Appends tests `R1` and `W1` after the last test, `S4` |
| `plans/AGL-08.md` | new | This plan. The planner commits this file and nothing else |

Not changed: `e2e/package.json`, `e2e/tsconfig.json`, `e2e/playwright.config.ts`, `e2e/harness/global-setup.ts`, the mock server and its tests, `.github/workflows/ci.yml`, every `package.json`, `packages/contracts/**`, `apps/web/**`, `apps/api/src/**`, `units/**`, `modules/**`, `plans/DECISIONS.md` and `plans/QUEUE.md`.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Do not push and do not open a pull request.

1. **Worktree and install.** `git -C /Users/bbartolome/workspace/scriba-prototype worktree add /Users/bbartolome/workspace/scriba-prototype-wt/AGL-08 -b unit/AGL-08 main`. Then, in that worktree, `npm ci`. Record `node -v` (Node 26, per `.nvmrc`) and `npm -v`. Expected: exit 0 each.
2. **Baseline on main.** Before any edit, in the worktree: `npm test -w @bbartolome/scriba-api` and `npm test -w @bbartolome/scriba-web`. Expected: exit 0. Record the test counts. If either fails, stop and report. A criterion of AGL-02 to AGL-07 is red on `main`, and its owner unit fixes it.
3. **Scenario.** Create `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` with exactly these steps:

   ```json
   {
     "steps": [
       {
         "match": { "endpoint": "chat", "turnIndex": 0 },
         "reply": {
           "kind": "toolCalls",
           "calls": [{ "name": "list_files", "argumentChunks": ["{}"] }]
         }
       },
       {
         "match": { "endpoint": "chat", "turnIndex": 1 },
         "reply": {
           "kind": "toolCalls",
           "calls": [
             {
               "name": "read_file",
               "argumentChunks": ["{\"path\":\"sources/outline.md\"}"]
             }
           ]
         }
       },
       {
         "match": { "endpoint": "chat", "turnIndex": 2 },
         "reply": {
           "kind": "stream",
           "deltas": [
             "The outline has six chapters: ",
             "Born to It?, What Counts as Practice, ",
             "The Ten-Thousand-Hour Idea, The Plateau Is Not the End, ",
             "The Coach in the Room, and Practice for the Rest of Us."
           ],
           "chunkDelayMs": 150
         }
       }
     ]
   }
   ```

   Then `npx prettier --check e2e/fixtures/mock-openai/scenarios/summarize-outline.json`. Expected: pass.
4. **Composed-app tests.** Add the constants and the helper (section 2), then the tests `R1` and `W1` (section 4, rows C2c and C2d). Both use `openHarness`, `startRun`, `observeEvents`, `readUntilEnded` and `recordsOf` from the same file. Records are counted from 0: record 0 is the first chat request of the run.
   - `R1`, scenario name `outside`: turn 0 calls `read_file` with `{"path":"../secret.md"}`; turn 1 streams "I could not read that file.". Before the start, write `SECRET-OUTSIDE` to `secret.md` in the library folder (`h.fixture.library`), which is outside the project `book`. Expect the run to end `completed`, two records with steps `[0, 1]`, the tool message of record 1 to equal `path: The path must not contain a ".." segment.` followed by a newline and `Expected arguments for read_file: path (string, required).`, and `SECRET-OUTSIDE` to be absent from `JSON.stringify` of all records.
   - `W1`, scenario name `withdraw`: turns 0, 1 and 2 each call `read_file` with `{"path": ` (unparseable), `{}` and `{"path": 3}` in that order; turn 3 streams "I will use list_files instead.". Expect `completed`, four records, and the tool messages: after record 1, one message `arguments: is not valid JSON` plus the summary line; after record 2, two messages, the second `path: is required` plus the summary line; in record 3, three messages, the third `path: must be a string`, the summary line, then `This tool is unavailable for the rest of this agent run.`. Expect `read_file` in the tool names of record 2 and absent from record 3, and `list_files` present in record 3. Assert containment only, because the project tool family grows (AGL-10 added `search_notes`, commit `c08a51e`).
   
   Run `npm test -w @bbartolome/scriba-api -- agent-loop-run`. Expected: `C1`, `C2`, `C6`, `S4`, `R1` and `W1` pass. If `R1` or `W1` fails, stop and record the failure. Do not change `apps/api/src/**`.
5. **E2E step.** In `e2e/specs/journey.e2e.ts`, replace the agent-run body and keep the owner comment above it. Add `readdir` to the import on line 2. The body is one `test.step('agent run', async () => { ... })` with a `pageerror` listener, as the other steps have. In order:
   a. Read `SCRIBA_E2E_MOCK_URL` and the origin constant `http://127.0.0.1:8080`.
   b. `page.request.post('/api/providers', { headers: { origin }, data: { label: 'Mock', kind: 'openai-compatible', baseURL, model: 'mock-model', temperature: 0.7, contextSize: 64000, maxTokens: 4096, timeout: 120000, retries: 2 } })`. Expect status 201. Read `id` from the body.
   c. `page.request.post('/api/providers/app-default', { headers: { origin }, data: { providerId: id, model: 'mock-model' } })`. Expect status 200.
   d. Fill the textbox `Intent` with `summarize my outline` and click the button `Send`.
   e. Expect the article `Tool call: list_files` to contain `Listed the project root.`, and the article `Tool call: read_file` to contain `Read sources/outline.md.` (15 s each).
   f. Expect the region `Messages` to contain `The outline has six chapters` (15 s). Expect the button `Stop` to have count 0 (15 s).
   g. `fetch` `${mock}/__mock/scenarios/summarize-outline/requests`. Expect the `step` values `[0, 1, 2]`. Expect `JSON.stringify` of the third record's body to contain `Chapter 6: Practice for the Rest of Us`, which proves the right file reached the model.
   h. Expect `readdir` of `<library>/demo-book/logs/agent-runs` to have one entry.
   i. Expect the `pageerror` list to be empty.
   Then `npm run build -w @bbartolome/scriba-e2e`. Expected: exit 0.
6. **Run the e2e.** `npm run e2e`. Expected: exit 0. The list reporter shows `agent run` as passed. Read `e2e/test-results/report.json`: exactly two `pending` annotations, `accept change` and `manuscript`. Record the journey's duration. If it exceeds 20 s, add `test.setTimeout(60_000);` as the first statement of the journey callback and record that change (open point 7).
7. **Lint.** `npm run lint`. Expected: exit 0, including `lint:examples`. `R1` and `W1` do not name `examples/`, and the scenario is not a test file.
8. **Root gates.** From the root: `npm run build`, `npm test`, `npm run e2e`, `npm run lint`. Expected: each exits 0.
9. **Demo, by hand, not a gate.** Steps 1 and 2 of the demo are the e2e step. To repeat them by hand, run `npm run mock:openai` (it prints the base URL, `plans/PLT-12.md` decision 18), start the API with a temporary library as `e2e/harness/global-setup.ts` lines 74 to 85 do, add the provider of step 5b with `<base>/scenario/summarize-outline/v1`, and type the intent. Record what is seen for steps 3 (phone), 4 and 5. Step 4 presses Stop on the streamed answer (section 1, Answer), because no shipped scenario loops over file reads. Record step 4 as "not a read-twice run".
10. **Commit.** Two commits on `unit/AGL-08`. First `test(AGL-08): add the outside-path and malformed-turn scripted turns` (the `apps/api/test/agent-loop-run.test.ts` change). Then `feat(AGL-08): turn on the e2e agent-run step with the summarize-outline scenario` (the scenario and `journey.e2e.ts`). Stage files by name only. Never `git add -A` or `git commit -a`.
11. **Fresh clone.** `git clone --branch unit/AGL-08 /Users/bbartolome/workspace/scriba-prototype <empty directory under /tmp>`. In it: `npm ci && npm run lint && npm test && npm run build && npm run e2e`. Expected: each exits 0. This is local evidence only; criterion 3 is shown by CI on the pull request (section 4).
12. **Record.** Put the Node and npm versions, each command's exit code, the test counts and the report counts in the implementer's report. The implementer does not edit `units/` or `plans/DECISIONS.md`.

## 4. Acceptance criteria and tests

The plan marks nothing passed. Each row is a test that exists or is added here. The criterion column quotes unit lines 21 to 23.

| Criterion | Test (file and name) | Seam | Command | Pass condition |
|---|---|---|---|---|
| C1 "Done when the author types 'summarize my outline' in the nonfiction sample and gets a correct answer with visible tool calls" (line 21) | `e2e/specs/journey.e2e.ts`, step `agent run` (section 3, step 5) | Browser, composed app, mock, sample copy | `npm run e2e` | Steps b to i pass. The report has no pending annotation for `agent run` |
| C2 (line 22), a: step cap | `apps/api/test/agent-loop-run.test.ts`, `C2` (line 285) | Composed app and mock | `npm test -w @bbartolome/scriba-api` | Passes on `main` (section 3, step 2) and on the branch |
| C2, b: stop timing | `apps/api/test/agent-loop-stop.test.ts`, `C3` (line 199) | Composed app and mock | same | Passes |
| C2, c: outside-path refusal | `apps/api/test/agent-loop-tools.test.ts`, `AC1` (line 96); new `R1` in `agent-loop-run.test.ts` | Kit route (`AC1`); composed app and mock (`R1`) | same | Both pass. `R1`: run `completed`, tool message as specified, `SECRET-OUTSIDE` absent from every record |
| C2, d: malformed-turn withdrawal | `agent-loop-tools.test.ts`, `AC2` (line 202) and `AC3` (line 271); new `W1` | Kit route (`AC2`, `AC3`); composed app and mock (`W1`) | same | All pass. `W1`: messages as specified; `read_file` absent from the fourth request's tools |
| C2, e: reload-restores-state | `apps/api/test/agent-loop-current.test.ts`, `C1` (line 175) and `C2` (line 222); `apps/web/src/app/features/agent-loop/chat-page.spec.ts`, `T3` (line 292) | Composed app; Vitest with the Shell's fakes | `npm test -w @bbartolome/scriba-api` and `npm test -w @bbartolome/scriba-web` | Pass |
| C2, f: transcript-schema | `apps/api/test/agent-loop-transcript.test.ts`, `T1` (line 44) | Composed app | `npm test -w @bbartolome/scriba-api` | Passes |
| C3 "The e2e agent-run step passes in CI" (line 23) | The `E2E` step of `.github/workflows/ci.yml` (lines 32 to 35) runs `npm run e2e`, with C1 inside it | CI | The pull request's `ci` run. Locally: section 3, steps 6 and 11 | CI is green on the pull request with the `agent run` step passing. Not verifiable from this environment (open point 5) |

## 5. Downstream agreement

- **AGL-09 (narrative tools; `blocked_by` line 7 names AGL-08).** Needs the composed harness and the scenario pattern. This plan changes neither. Its test that a disabled tool is absent from the request can use `toolNamesOf` as it stands. `R1` and `W1` assert containment only, so the families it adds do not break them.
- **AGL-12 (write overlay; `blocked_by` line 7).** Changes the `read_file` handler to read the run overlay. `R1` pins the refusal text (the `..` message and the summary). AGL-12 must keep that text. `W1` pins only the withdrawal of `read_file` and the presence of `list_files`.
- **AGL-21 and AGL-22 (research; `blocked_by` line 7).** Add research families. Neither test here pins the whole tool list, so both hold.
- **AGL-24 (compile tools; `blocked_by` line 7).** No overlap with this plan.
- **AGL-25 (manual eval; `blocked_by` line 7; `phase: none`).** Needs the composed loop and its own case-file format. This plan adds no case file. Its "summarize my outline" case uses the same intent text as the journey step.
- **AGL-19 (grounding draft; `units/AGL-19-grounding-sample-draft.md` line 17).** Adds its own scripted files to `e2e/fixtures/mock-openai/`. It must not reuse the name `summarize-outline`, and it follows PLT-12 decision 14 for any sample path it names.
- **AGL-15 and PST-22 ("accept change" block, `journey.e2e.ts` lines 98 to 99 at `main`), CEX-20 ("manuscript" block, lines 101 to 102), SAU-16 (setup block, lines 34 to 66).** Each replaces its own block. Each anchors by text, and its lines are disjoint from the lines AGL-08 changes, so either order is correct. AGL-15 configures its own provider and app default. If it also uses the label `Mock`, its id becomes `mock-2` (`providers.registry.ts` lines 139 to 145), so it does not collide with this step.
- **PLT-13.** Its criterion 3 counts the `// Owner:` comments. This plan keeps the comment, so the count holds.
- **MPR-08 (done).** Its plan cites journey lines 72 and 73 (`plans/MPR-08.md` lines 29 and 193 to 194). Those lines move. MPR-08's check T2 is a manual host procedure (`plans/DECISIONS.md` 2026-11-15, N2), not the journey, so nothing breaks.
- **AGL-03, AGL-05, AGL-07 (done).** Unchanged. This plan only reads their tests.

## 6. Other draft or planned plans that change the same files

- `plans/SHL-22.md` is the only plan with status `planned` (line 3; checked by `grep '^status:' plans/*.md`). Its file list (its section 2, lines 40 to 43) names `apps/web/src/app/shell/project-route.spec.ts`, `apps/web/src/app/shell/api-client.spec.ts`, `apps/web/src/app/shell/connection-status.spec.ts` and `apps/api/test/providers-client-timeout-abort.test.ts`. None of them is in this plan's list. No overlap, so either merge order is correct.
- No plan has status `draft`.
- `plans/QUEUE.md` line 2 lists AGL-08 as available (commit `6ba3516`). This plan does not edit it.

## 7. Open points

1. **Reading of criterion 2 (unit line 22).** This plan reads the criterion as the six named items, each mapped in section 4. The procedure also runs the full API and web suites, so the stronger reading ("every criterion of AGL-02 to AGL-07") is covered too. The reviser confirms which reading is intended.
2. **"Reload-restores-state".** Mapped to AGL-05's current-run-state tests and AGL-07's reconnect test (section 1). The reviser confirms the mapping, because the unit names no test.
3. **Demo steps 3 to 5 (unit lines 25 to 30).** Manual, not gating. Step 4 ("read every file twice, then stop") needs a looping scenario. No shipped scenario loops, and adding one is a new shipped file. This plan does not add it, and step 4 is recorded as a stop on a streamed answer. The reviser confirms.
4. **"Gets a correct answer".** The answer is scripted. The e2e proves that the right file reached the model (step 5g), that the cards show, and that the answer renders. It does not prove that a real model summarises well; that is AGL-25's check. The reviser confirms this reading.
5. **Criterion 3 cannot be seen here.** No remote and no CI run are available in this environment. Local evidence is section 3, steps 6 and 11. The criterion is closed by the CI run on the pull request, which the orchestrator watches.
6. **Where R1 and W1 live.** This plan appends them to `agent-loop-run.test.ts`, which holds the harness. The alternative is a new file that copies about 80 lines of harness. The reviser confirms the choice.
7. **Playwright's default test timeout.** `e2e/playwright.config.ts` sets no `timeout`, so the one journey test has Playwright's default. Section 3, step 6 measures the duration. If it exceeds 20 s, the contingency is `test.setTimeout(60_000)` at the top of the journey callback. The reviser confirms that this one-line change is allowed outside the agent-run block.
8. **The app default stays on the mock after the step** (section 1). No later spec reads provider state, which the reviser may want to confirm before the step lands.

## 8. Facts checked

Unit and module
- `units/AGL-08-file-tools-chat-gate.md`: front matter lines 2 to 9 (`blocked_by` line 7 names AGL-02 to AGL-07, PLT-13, PST-11 and SHL-10; `unblocks` line 9 names AGL-09, AGL-12, AGL-21, AGL-22, AGL-24 and AGL-25); scope lines 17 and 18; criteria lines 21 to 23; demo lines 25 to 30. No change note.
- `units/AGL-09-narrative-tools.md`, `AGL-12-write-overlay.md`, `AGL-21-web-search.md`, `AGL-22-fetch-page.md`, `AGL-24-compile-tools.md`, `AGL-25-manual-eval-script.md`: each `blocked_by` line 7 names AGL-08, so `unblocks` is the exact inverse (`units/README.md` line 64). No unit names AGL-08 without also being in its `unblocks`.
- Each of AGL-02 to AGL-07 lists AGL-08 in `unblocks` (line 9 of each).
- `modules/agent-loop.md` lines 9 to 11 (ordering), 23 (graph), 44 and 46 (parallel after AGL-08), 62 (primary seam), 66 (system seam), 67 (real models).
- `units/README.md` lines 64 (blocker notation), 110 (phase table: AGL-02 to AGL-08), 126 (SHL-22 load-sensitive waits), 138 (unit tests never read `examples/`).
- No unit file carries a "by revision" note (grep of `units/AGL-08-file-tools-chat-gate.md`).

Prerequisites on `main` (commits)
- AGL-02 to AGL-07 plans are `status: done` (`plans/AGL-02.md` to `plans/AGL-07.md`, line 3 of each). `feat(AGL-03)` `0154edf`, `feat(AGL-04)` `0952e8a`, `feat(AGL-07)` `833b1b3`, `feat(AGL-06)` `59c5d44`, `feat(AGL-05)` `ce02ba2`.
- PLT-13 `3ee9519`, PLT-12 `f4703e6`, PST-11 `6756f0d`, PST-09 `efff1dc`, SAU-08 `db364c6`, SHL-10 `70383af`.

E2E and mock
- `e2e/specs/journey.e2e.ts`: imports lines 1 to 4; `pending` helper lines 6 to 10; project-from-sample lines 68 to 93 (`demo-book` at 77, URL at 83, `sources/outline.md` check at 87); agent-run owner comment line 95 and body line 96; accept change lines 98 to 99; manuscript lines 101 to 102.
- `e2e/harness/global-setup.ts`: `SCRIBA_E2E_LIBRARY` line 25; mock started with the default folder and `SCRIBA_E2E_MOCK_URL` set at lines 31 to 33; API env lines 74 to 85, `SCRIBA_EXAMPLES_DIR` at 81; `checkMock` on `tool-call` at lines 88 to 99.
- `e2e/playwright.config.ts`: `testMatch` line 11, one worker (line 13), JSON reporter at line 17, `baseURL` line 20, no `timeout`.
- `e2e/package.json`: scripts lines 6 to 10; devDependencies lines 12 to 16, with no contracts dependency. `e2e/tsconfig.json` includes `specs`.
- `e2e/fixtures/mock-openai/server.mjs`: default folder lines 6 to 9 and 17 to 20; `loadScenarios` lines 51 to 84; matchers lines 103 to 131; `turnIndex` lines 117 to 121; first-match rule lines 133 to 139; attempt counter 284; record push 302; no-match 500 at 305 to 307; `streamItems` with `chunkDelayMs` 359 to 370; records route 239 to 246.
- Existing shipped scenarios: `html-200`, `long-stream`, `malformed-tool-call`, `models-empty`, `models-failing`, `models-non-empty`, `rate-limited`, `stalled`, `stream-with-gaps`, `text-stream`, `tool-call`, `unauthorized-without-key`, `unavailable-persistent`, `unavailable-then-ok`, `unknown-model`; none is named `summarize-outline`.
- `e2e/fixtures/mock-openai/test/mock-openai.test.ts` lines 70 to 73 start the shipped folder (the default) and the test-only folder `test/scenarios`. The file asserts no count of the shipped folder; its `toHaveLength` checks are on recorded requests.
- `.github/workflows/ci.yml`: the `E2E` step at lines 32 to 35 (`SCRIBA_E2E_CHROMIUM`, `npm run e2e`); the trace upload follows.
- Root `package.json`: `build` line 23, `test` line 25, `lint` line 26, `mock:openai` line 28, `e2e` line 29.
- `plans/PLT-12.md`: decisions 7 (line 17), 12 (line 37), 14 (line 41), 15 (line 42), 16 (line 43), 18 (line 45), 20 (line 47); section 5 AGL-08 bullet (line 207); line 211 (apps/api imports the mock).
- `plans/PLT-13.md`: owner comment rule (line 145); AGL-08 bullet in section 5 (line 260).

Providers and contracts
- `apps/api/src/modules/providers/providers.controller.ts`: create at lines 55 to 56 (201); app default at lines 73 to 74 (200).
- `packages/contracts/src/providers/routes.ts` lines 3 and 5 (`/api/providers`, `/api/providers/app-default`).
- `packages/contracts/src/providers/config.ts`: `openaiCompatibleSchema` lines 7 to 18; `providerCreateSchema` lines 53 to 63; `providerUpdateSchema` line 67.
- `packages/contracts/src/providers/defaults.ts` lines 4 to 10 (`PROVIDER_DEFAULTS`).
- `apps/api/src/modules/providers/providers.registry.ts`: create uses `freeId` at line 42; `setAppDefault` validates the provider at line 86; `idBase` lines 122 to 127; `slug` lines 131 to 137; `freeId` lines 139 to 145.
- `apps/api/src/modules/providers/providers.seeding.ts` line 71 (seeded app default, `preset.id`, model `''`).
- `apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 65 to 72 (Origin check on unsafe methods); `request-policy.ts` lines 14 to 19 (loopback origins built from the port).

Web
- `apps/web/src/app/features/agent-loop/chat-page.ts`: template lines 221 to 355; `Messages` region line 305; card render lines 314 to 316; composer lines 326 to 353; `Intent` textarea lines 331 to 336; `Send` lines 338 to 340; `Stop` lines 341 to 345; `canSend` lines 378 to 380.
- `apps/web/src/app/shell/tool-call-card.ts`: `article` label line 162; header lines 163 to 178 with the summary at 175 to 176.
- `apps/web/src/app/features/setup-auth/step-body.ts` lines 22 to 24 (static provider text); `e2e/specs/setup-phone.e2e.ts` line 240.
- `apps/web/src/app/features/agent-loop/chat-page.spec.ts` line 292 (`T3`).

API tests and loop
- `apps/api/test/agent-loop-run.test.ts`: `ChatBody` interface line 163; `openHarness` lines 84 to 116; `post` line 118; `startRun` line 130; `readUntilEnded` line 140; `toolNamesOf` line 168; `chatBodies` line 172; `LIST_THEN_READ_THEN_TEXT` lines 176 to 200; tests `C1` (202), `C2` (285), `C6` (335), `S4` (390 to 421, end of file).
- `apps/api/test/agent-loop-tools.test.ts`: `RUNS` line 19; `AC1` line 96; `AC2` line 202; `AC3` line 271. `AC2` cases at lines 202 to 240.
- `apps/api/test/agent-loop-stop.test.ts` `C3` line 199. `apps/api/test/agent-loop-current.test.ts` `C1` line 175, `C2` line 222. `apps/api/test/agent-loop-transcript.test.ts` `T1` line 44.
- `apps/api/src/modules/agent-loop/tools/builtin-tools.ts`: `list_files` handler lines 60 to 68 (summary at 67); `folderName` lines 29 to 34; `read_file` handler lines 86 to 94 (summary at 91).
- `apps/api/src/modules/agent-loop/tools/tool-run.ts`: `WITHDRAWN` line 19; withdrawn call message line 114; `readableMessage` calls at lines 181 and 192.
- `apps/api/src/modules/agent-loop/agent-run.ts` lines 299 to 300 (the tool message content).
- `apps/api/src/modules/agent-loop/transcript-reader.ts` line 20 (`logs/agent-runs`).
- Built-in tools: `list_files`, `read_file` and `search_notes` are offered in the project family; `search_notes` came with AGL-10 (commit `c08a51e` changes the expected lists).

Sample and plans
- `examples/nonfiction/sources/outline.md` chapter headings at lines 7, 13, 19, 25, 31 and 37; last changed in `6756f0d` (PST-11).
- `examples/nonfiction/project.yaml`: `title: The Long Apprenticeship`, `genrePack: nonfiction` (lines 2 to 4).
- `scripts/examples-check/m1.mjs` lines 24 to 33 (test-file scan and rules R1 and R2).
- `plans/DECISIONS.md` lines 667 (matcher tests, PLT-12 review), 688 (note 3: loader does not reject unknown names), 689 (note 4: header-only step matches models), 4017 to 4020 (MPR-08 N2 and AGL-08's chat run).
- `plans/PST-09.md` line 141 (AGL-08 chooses the folder name); `plans/PST-11.md` line 157 (AGL-08 needs `sources/outline.md`; dot-entries are hidden from `list_files`); `plans/PST-12.md` line 93 (the summarise turn is AGL-08's); `plans/AGL-02.md` lines 185 and 201 (O5); `plans/AGL-03.md` line 118 (AGL-08 uses D8 and D10 and the real API); `plans/AGL-05.md` line 111; `plans/AGL-07.md` lines 129 (selectors); `plans/SHL-10.md` line 223 (card as article); `plans/SAU-08.md` line 123; `plans/SAU-11.md` line 75; `plans/MPR-08.md` lines 15, 29, 40, 193 to 194, 201 to 202.
- `plans/SHL-22.md` line 3 (`status: planned`), lines 40 to 43 (its files).
- `plans/QUEUE.md` line 2 (AGL-08 available: yes).
- `units/AGL-04-transcripts-history.md` line 18 (transcript path and content); `units/AGL-05-current-run-state.md` lines 19, 20, 23 to 25; `units/AGL-07-chat-panel-ui.md` line 28; `units/AGL-19-grounding-sample-draft.md` line 17; `units/AGL-15-pending-writes-gate.md` line 17; `units/CEX-20-milestone-gate.md` line 17; `units/SAU-16-setup-flow-gate.md` line 17.

Git state
- `HEAD` is `6ba3516` on `main`, a docs commit that changes `plans/QUEUE.md` only. The worktree `scriba-prototype-wt/SHL-22` is on `unit/SHL-22` at `6494491`. The main checkout was clean before this plan was written.

## 9. Facts assumed

1. Playwright's `page.request` uses the browser context's cookies, so the handshake cookie authorises the two POSTs of step 5b and 5c. The first run confirms it. If it does not, the fallback is a same-origin `fetch` inside `page.evaluate`, where the browser sends `Origin` itself.
2. The journey test's default Playwright timeout (30 s) applies to the one journey test. Section 3, step 6 checks it.
3. `SCRIBA_E2E_MOCK_URL`, set in `globalSetup`, reaches the worker, as `SCRIBA_E2E_LIBRARY` does at `journey.e2e.ts` line 29.
4. The loop sends one chat request per model step, and each assistant message with tool calls counts toward `turnIndex`. This is what the `C1` test at `agent-loop-run.test.ts` lines 176 to 200 relies on; it passes on `main` according to the AGL-03 plan, and section 3, step 2 confirms it.
5. The composed-app refusal and withdrawal messages match the kit-route messages, because both go through the same dispatcher (`tool-run.ts`) and files service. Section 3, step 4 confirms it.
6. The journey's sample copy is writable, and the agent run creates `logs/agent-runs` in it.
7. Card summaries render in the collapsed header (read at `tool-call-card.ts` lines 163 to 178), so the summary checks do not need the card expanded.
8. A local Chromium is available to Playwright (PLT-13 plan section 1, `~/.cache/ms-playwright`) and CI uses `/usr/bin/chromium` (PLT-13 plan section 5, sourced from the runner-image script there). Neither is checked in this environment.
9. The workspace test script passes a filter after `--` to Vitest (`npm test -w @bbartolome/scriba-api -- agent-loop-run`). Not checked.
10. The `apps/api` test helpers (`observeEvents`, `LOOPBACK_HOST`, `LOOPBACK_ORIGIN`, `sessionCookie`) keep their current behaviour.
