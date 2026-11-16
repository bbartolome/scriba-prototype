---
id: AGL-25
status: done
---
# AGL-25 plan — manual real-model eval script (`npm run eval:agent`)

Batch: [AGL-25] (Agent loop, no phase, M1, ungated). Batch of one. Base: `main` at `5c544f6` (draft); revised at `main` `5475399`, which adds only this file after `5c544f6`. Status `draft`; the orchestrator moves it. The unit file has no change note (`grep -c "by revision" units/AGL-25-manual-eval-script.md` prints 0). The planner ran only read commands and two read-only checks (a `node -e` glob test and `prettier --file-info`). It ran no install, build or test.

## 1. Decisions this plan follows

### Settled by the unit, the module and the other docs

- **A script that runs the loop against a real local model, not CI.** Small and larger model, a set of cases, records the failure modes the retries handled (malformed calls, withdrawals, step caps), citation presence and outcomes. Source: unit line 15; `units/README.md` line 138 ("Real models are checked only by the Agent loop's manual eval script (AGL-25), never in CI"); `modules/agent-loop.md` line 67.
- **Cases are data files.** One file per case: intent, project fixture, expectations. A new case needs no code change. Source: unit line 16; criterion 2 (unit line 21).
- **Report under a git-ignored folder.** The unit allows Markdown or JSON (unit line 17). Choice: JSON only. Source: unit line 17.
- **Command name** `eval:agent`. Source: unit line 15 ("e.g.").
- **AGL-25 is the canonical real-model check.** `modules/providers.md` line 46 gives the providers module's real-model check to this script. `plans/DECISIONS.md` line 4024 says AGL-25 "remains the eventual canonical check". `plans/DECISIONS.md` line 4473 says real-model checks "belong to AGL-25" (AGL-08 revision, point 4). MPR-08's T2 is the transitional check (`modules/providers.md` line 47).
- **Blocker.** `blocked_by: [AGL-08]` (unit line 7). AGL-08 is `status: done` (`plans/AGL-08.md` line 3). Its scenario `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` is on `main`.
- **Fixture and intent.** Sample `nonfiction` (`examples/samples.yaml`), intent `summarize my outline` (unit criterion 1, line 20).
- **No test names `examples/`.** `units/README.md` line 138. Enforced by `scripts/examples-check/m1.mjs`: `checkTestFiles` (line 203) scans every `*.test.*` and `*.spec.*` file in the repository, except `scripts/examples-check*.test.mjs` (patterns at lines 25, 26, 30 and 32).
- **What CI runs.** `npm run lint`, `npm test`, `npm run build`, `npm run e2e` (`.github/workflows/ci.yml` lines 27, 29, 31, 35). Root `npm test` ends with `node --test 'scripts/*.test.mjs'` (root `package.json` line 25). A test file in `scripts/eval-agent/` is not matched by that glob (checked, section 8). So the script's own files run in none of the CI steps.
- **Testing principle.** External behaviour only: HTTP responses, files on disk, the mock's received requests (`units/README.md` line 138; `modules/agent-loop.md` lines 60 to 66).

### Chosen here (small choices)

- **"A configured provider"** means the provider the script creates through the API from `--base-url`. It does not mean a provider the owner set up in the UI, so a run needs no UI state.
- **Calls go over HTTP to a booted API.** The script boots `apps/api/dist/main.js` with the environment of `e2e/harness/global-setup.ts` lines 74 to 85 (`PATH`, `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR`, `SCRIBA_EXAMPLES_DIR`). The API listens on fixed port 8080 (`apps/api/src/main.ts` line 8). A busy port 8080 exits 2, as `assertPortFree` (`global-setup.ts` line 44) does.
- **Sign-in.** The library's `.scriba/setup-url` (written by `apps/api/src/modules/setup-auth/setup-token.store.ts` line 108) is fetched with `redirect: 'manual'`. The 303 and its `Set-Cookie` come from `setup-session.controller.ts` lines 69 to 95, on a loopback Host. Every later request sends the cookie. Every POST also sends `origin: http://127.0.0.1:8080` (`setup-auth.guard.ts` lines 58 to 72). The setup URL, the token and the cookie never go to stdout, stderr or the report.
- **Provider.** `<n>` is the 1-based index of the `--model` value. `POST /api/providers` (201; `apps/api/src/modules/providers/providers.controller.ts` lines 55 to 56; the e2e journey step 'agent run', `e2e/specs/journey.e2e.ts` lines 102 to 121, sends the same body). Body: `label` `eval-model-<n>`, `kind` `openai-compatible`, `baseURL`, `model`, and the five `PROVIDER_DEFAULTS` values typed literally (`packages/contracts/src/providers/defaults.ts` lines 4 to 10; `config.ts` lines 7 to 17 and 53 to 63). The literals follow the e2e, which has no contracts dependency. The provider id is the `id` of the 201 answer (as in the journey). The API seeds the Ollama preset as the app default on first start (`providers.seeding.ts` line 71); the next request replaces it. Then `POST /api/providers/app-default` with `{providerId, model}` (200; `providers.controller.ts` line 73; `packages/contracts/src/providers/model.ts` line 5).
- **Base URL.** Default `http://127.0.0.1:11434/v1`. The Ollama preset's `http://host.docker.internal:11434/v1` (`defaults.ts` line 38) is for the compose container, not for an API on the host. `--base-url` overrides it.
- **Project.** `POST /api/project-store/projects/start-from-sample` with `{sampleId, folderName, title}` (201). Its comment says the answer does not activate the project (`apps/api/src/modules/project-store/samples.controller.ts` line 14). Then `POST /api/project-store/active` with `{projectId}` (`active-project.controller.ts` line 26). `folderName` is `<case-id>-<n>`, which matches `PROJECT_FOLDER_NAME_PATTERN` (`packages/contracts/src/project-store/constants.ts` line 14). The project id is the `id` of the summary (`project.ts` line 40).
- **Run and outcome.** `POST /api/agent-loop/runs` with `{intent}` (`packages/contracts/src/agent-loop/routes.ts` line 3; `runs.ts` line 8) answers `{runId, conversationId}`. The script polls `GET /api/agent-loop/conversations/<conversationId>` once a second until a turn has that `runId` (`routes.ts` lines 6 to 9; `apps/api/src/modules/agent-loop/agent-conversations.controller.ts` lines 29 to 36). The conversation lists finished turns of the active project only, so activation comes first. Each turn gives `reason`, `assistantText` and `cards` (`runs.ts` line 40; `transcript-reader.ts` lines 277 to 285). Polling was chosen over the SSE stream because it needs no event client.
- **Failure modes from the cards.** `agentCardSchema` (`packages/contracts/src/agent-loop/cards.ts` from line 17; `error` at line 29) carries `error: {message, attempt, withdrawn?}`. `malformedCalls` = cards with an `error`, the withdrawn one included. `withdrawals` = cards with `error.withdrawn === true`. `stepCapped` = `reason === 'capped'` (run-end reasons at `constants.ts` line 20).
- **Citation presence.** The citation form is `[@id]` (`apps/api/src/modules/agent-loop/agent-prompt.ts` line 11). Count the matches of `/\[@[^\]\s]+\]/g` in `assistantText` plus `JSON.stringify(cards)`, and list the distinct ids (the text between `[@` and `]`), in first-seen order, as `citationIds`. Drafts written by `write_file` or by a narrative tool sit in a card's `arguments` and `output` (`transcript-entries.ts` lines 50 and 59), so both are searched. The script checks presence only (the unit's word). It does not judge whether an id is valid; `citationIds` and the cards' `sourcesUsed` and `arguments` let the reader do that check in the report (settled point R4).
- **Expectations** (case key `expect`). `reason`: a run-end reason. `tools`: names that must appear on a card with status `done`. `citations`: `present`, `absent` or `any`. A key that the case omits gives `unchecked`. Otherwise the result is `pass` or `fail`.
- **Case file.** Keys `sample`, `intent`, `expect`. The case id is the file name without `.json`, and must match `^[a-z0-9][a-z0-9-]*$`. No `schemaVersion`, because a case is a hand-written input, not a persisted format.
- **Report.** `eval-reports/<UTC yyyymmddThhmmssZ>/report.json` and `eval-reports/<stamp>/library/`, under the repository root. The report carries `schemaVersion: 1` (`units/README.md`, "Conventions shared by every module": persisted formats carry their own `schemaVersion`). The new `.gitignore` line is `eval-reports/`, after `e2e/test-results/` (`.gitignore` line 8).
- **Library after the run.** After the API stops, the script deletes `<library>/.scriba/` (the library's settings, token and setup URL). The project folders stay, with their `logs/agent-runs/` transcripts, for the author to read.
- **Timing.** At most 10 minutes per run. The poll is every second. When a run passes 10 minutes, the script sends `POST /api/agent-loop/runs/stop` with `{runId}` (`AGENT_RUN_STOP_ROUTE`, `routes.ts` line 4; `agentStopRequestSchema`, `runs.ts`), polls up to 30 s more for the turn, and records `error: "timed out after 10 minutes"` (and the turn's data when it came). Then it continues with the next case, so no run is left active.
- **What `error` means.** `error` is set only when the script could not get a turn: an HTTP step that did not answer with its expected status (the message names the step and the status, never a cookie or token), or the timeout. A run that ends with `reason` `error`, `capped` or `stopped` is an outcome of the model, recorded in `reason` with `error` null.
- **Exit codes.** 0: the report is written and every result has `error` null. 1: a result has an `error`, or the API did not start (then no report is written). 2: usage, an invalid case file, an unknown `--case`, or port 8080 in use. A failed expectation never changes the exit code. The script records and does not gate.
- **Dependencies.** Node built-ins only. The root `engines` is `>=26 <27` (root `package.json` lines 11 to 13). The script imports no contracts package.
- **Options.** `--model <name>` (repeatable, at least one, no default). `--base-url <url>`. `--case <id>` (repeatable; default all cases). `--cases-dir <dir>` (default `scripts/eval-agent/cases`). `--reports-dir <dir>` (default `eval-reports` at the repository root). The tests use the last two.
- **Report keys.** `schemaVersion`, `startedAt`, `finishedAt`, `baseUrl`, `library`, `results[]`. Each result has `case`, `model`, `runId`, `conversationId`, `reason`, `assistantText`, `citations` (a count), `citationIds` (distinct ids, in first-seen order), `cards` (copied from the turn, unchanged), `failureModes` (`malformedCalls`, `withdrawals`, `stepCapped`), `expect` (`reason`, `tools`, `citations`) and `error` (a string, or null).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `scripts/eval-agent/run.mjs` | new | The script: options, case loading, API boot, sign-in, provider, runs, report, exit codes (section 1) |
| `scripts/eval-agent/cases/summarize-outline.json` | new | The one case: criterion 1 (content in step 3 of section 3) |
| `scripts/eval-agent/README.md` | new | How to run; the case file keys; how to add a case (criterion 2) |
| `scripts/eval-agent/run.test.mjs` | new | Tests T1 to T3 (section 4). Not matched by root `npm test` |
| `package.json` (root) | edit | One `scripts` entry, `"eval:agent"`, after the `"e2e"` entry (line 29): `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && node scripts/eval-agent/run.mjs`. npm appends the arguments after `--` to the last command of the chain |
| `.gitignore` | edit | One line, `eval-reports/`, after line 8 |
| `plans/AGL-25.md` | new | This plan (the planner's commit only) |

Not changed: `units/**`, `modules/**`, `plans/DECISIONS.md`, `.github/workflows/ci.yml`, `e2e/**` (the mock and its scenario are used as they are), `apps/**`, `packages/**`, `examples/**`, `scripts/examples-check/**`, and every `scripts/*.test.mjs`. The `dist/` builds are git-ignored.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`, or in the implementer's worktree. Do not push, add a remote or open a pull request. Stage files by name only, never `git add -A` or `git commit -a`.

1. **Worktree and install.** `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/AGL-25 -b unit/AGL-25 main`. In it, `npm ci`. Record `node -v` (v26.x) and `npm -v`. Expected: exit 0 each.
2. **Baseline.** In the worktree: `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`, then `npm test` and `npm run lint`. Expected: exit 0 each. Record the counts. The build is needed first because `apps/api/dist` is absent in a fresh checkout. If a step fails on `main`, stop and report.
3. **Red.** Create `scripts/eval-agent/cases/summarize-outline.json` with exactly this content (then Prettier formats it):

   ```json
   {
     "sample": "nonfiction",
     "intent": "summarize my outline",
     "expect": {
       "reason": "completed",
       "tools": ["list_files", "read_file"],
       "citations": "any"
     }
   }
   ```

   Create `scripts/eval-agent/run.test.mjs` with tests T1 to T3 (section 4). Run `node --test scripts/eval-agent/run.test.mjs`. Expected: all three fail, because `run.mjs` and the README do not exist yet. Save the output.
4. **Script.** Write `scripts/eval-agent/run.mjs` as section 1 describes. Order: (a) parse the options; (b) load and validate the case files (a bad file or an unknown `--case` exits 2 and names the file); (c) refuse if port 8080 is busy (exit 2); (d) make `<reports>/<stamp>/library/`; (e) spawn the API with the environment of section 1; (f) wait up to 60 s for `/healthz` to answer 200; (g) sign in as section 1 says; (h) for each `--model`: create its provider, set the app default, then for each case: start from the sample, activate, start the run, poll until the turn is there, build the result; (i) write `report.json`; (j) stop the API (SIGTERM, wait for exit) and delete `<library>/.scriba/`; (k) print the report path and one line per result; exit with the code of section 1. The script must not print or store the setup URL, the token or the cookie.
5. **README.** Write `scripts/eval-agent/README.md`. It must contain the words `one file`, the command `npm run eval:agent`, and each key `sample`, `intent`, `expect`, `reason`, `tools`, `citations`. It covers: what the script is and that it is not in CI; the run command with `--model` and Ollama on the host; the options; the case keys and their values; how to add a case (one new file in `cases/`, then `--case <id>`); the report location and keys; the exit codes; the mock check (T1's command).
6. **Green.** Run the two builds of step 2, then `node --test scripts/eval-agent/run.test.mjs`. Expected: T1, T2 and T3 pass. Save the output.
7. **Argument checks.** `npm run eval:agent` with no arguments prints the usage line and exits 2. `npm run eval:agent -- --model x --case nope` exits 2 and names `nope`. The second command also proves that npm forwards the arguments. Expected: exit 2 each.
8. **Repository gates.** `npm run lint` (Prettier, which covers the new files, and `lint:examples`, which covers the test file's wording), `npm test`, `npm run build`. Expected: exit 0 each. Then `npm test 2>&1 | grep -c eval-agent` prints `0` (grep exits 1 for zero matches; that exit is expected), which shows the script's test is outside CI.
9. **Ignore check.** `mkdir eval-reports && git check-ignore -v eval-reports/probe` prints a line that starts with `.gitignore:9:eval-reports/`. `git status --short` lists nothing under `eval-reports/`. `rmdir eval-reports`.
10. **Real-model check (manual, owner).** Not run by the implementer. Section 4 gives the procedure. Record: "not run: no Ollama on this host (`command -v ollama` prints nothing; `127.0.0.1:11434` did not answer)."
11. **Commit and fresh clone.** Stage by name: `scripts/eval-agent/run.mjs`, `scripts/eval-agent/cases/summarize-outline.json`, `scripts/eval-agent/README.md`, `scripts/eval-agent/run.test.mjs`, `package.json`, `.gitignore`. Commit on `unit/AGL-25` with `feat(AGL-25): manual eval script for the tool-calling loop`. Then make a fresh copy of the committed tree without a clone (a clone would record a remote): `mkdir <empty directory under /tmp> && git archive unit/AGL-25 | tar -x -C <that directory>`, and in it `npm ci && npm run lint && npm test && npm run build`. Expected: exit 0 each. (`lint` runs `prettier --check .`; the copy has no git metadata, which none of the four commands needs.)
12. **Record.** Node and npm versions; the exit code of each command; the test counts; the number of results and the `reason` of the T1 report; the status of the manual check (step 10).

## 4. Acceptance criteria and tests

Nothing is marked passed by this plan. T1 to T3 are in `scripts/eval-agent/run.test.mjs`, run by `node --test scripts/eval-agent/run.test.mjs` after the two builds of step 2. The file starts the mock with `startMockOpenAI` from `e2e/fixtures/mock-openai/server.mjs` (`scenariosDir` defaults to the shipped folder, which holds `summarize-outline.json`) and closes it after the tests. Each test runs `scripts/eval-agent/run.mjs` in a child process with `--reports-dir` set to a temp folder. The tests run one after another, so only one API holds port 8080 at a time. The file names no folder of `examples/` and no test path with `examples/` (rules R1 and R2).

| Criterion (unit lines) | Test (file and name) | Seam | Command | Pass condition |
|---|---|---|---|---|
| 1. "The script runs the 'summarize my outline' case against a configured provider and writes a report" (line 20) | `scripts/eval-agent/run.test.mjs`, **T1 runs the summarize-outline case against a provider and writes a report** | CLI; the API the script boots; the mock's `summarize-outline` scenario as the provider (`--base-url <mock>/scenario/summarize-outline/v1`, `--model mock-model`, `--case summarize-outline`) | `node --test scripts/eval-agent/run.test.mjs` | Exit 0. The temp reports folder holds one `<stamp>` folder with `report.json`. The report has `schemaVersion` 1 and one result: case `summarize-outline`, model `mock-model`, `reason` `completed`, `error` null, cards `list_files` and `read_file` with status `done`, `assistantText` containing `The outline has six chapters`, `citations` 0, `citationIds` `[]`, `failureModes` `{malformedCalls: 0, withdrawals: 0, stepCapped: false}`, and all three `expect` entries `pass`. The report text and the child's stdout and stderr do not contain the cookie name `scriba_setup_8080` nor the string `token=` |
| 1 (manual, real model) | **M1 (manual, owner)** | Ollama on the owner's Mac host | `npm run eval:agent -- --model <small> --model <larger>` | Exit 0. `eval-reports/<stamp>/report.json` has two `summarize-outline` results, one per model; in each, `error` is null and `reason` is not null. The owner reads the outcomes there. Not run here (step 10). It checks the unit's decision (a real local model), not the criterion text, and does not gate the tick (settled point R6) |
| 2. "Adding a case is a single data file, documented in the script's README" (line 21) | **T2 a case added as one data file runs with no code change** | CLI with `--cases-dir` set to a temp folder holding two files: `summarize-outline.json` and `summarize-outline-copy.json`, both copied from the case file of step 3 | `node --test scripts/eval-agent/run.test.mjs` | Exit 0. The report's results name both case ids, each with `reason` `completed`. The SHA-256 of `run.mjs`, read before and after the run, is the same |
| 2 (README) | **T3 the README documents the case file keys** | Text of `scripts/eval-agent/README.md` | same | The README contains `one file`, `npm run eval:agent`, and each of `sample`, `intent`, `expect`, `reason`, `tools`, `citations` |

Extra check, not a criterion: step 8's grep shows the script's test is not run by `npm test`. The real-model check M1 is the only part that needs a real model. Its absence here is recorded, not waived.

Tick rule (settled point R6): criterion 1 says "a configured provider"; the mock is an `openai-compatible` provider created through `POST /api/providers`, so T1 passing satisfies the criterion text. Criterion 2 is ticked when T2 and T3 pass.

T1's secret check: the test cannot see the cookie value, so it looks for the cookie name, `scriba_setup_<SCRIBA_PORT>` (`apps/api/src/modules/setup-auth/setup-cookie.signer.ts` line 19), which is `scriba_setup_8080` here, and for `token=`, the query key of the setup URL. After the run the library holds no `.scriba/` folder (T1 also checks this).

## 5. Downstream agreement

- **Genre packs per-tool cases.** GNP-07, GNP-08, GNP-09, GNP-10, GNP-15, GNP-16 (criterion "A manual eval case (small and larger local model) is added to the Agent loop's eval script data", line 24 of each), GNP-14, GNP-21, GNP-22 ("Manual eval cases added"), GNP-17, GNP-20 ("Manual eval case added") and GNP-23 ("manual eval case added"). They need: the folder `scripts/eval-agent/cases/`; one file per case (criterion 2); the keys of section 1; two `--model` values per run; the citation count. All are given.
- **GNP-19 (voice separation, line 24).** "checked by the manual eval with a small and a larger local model, and by the author". The script cannot judge voice; the reader judges it from the report. The draft text is in the report: each result copies the turn's `cards` unchanged, and a narrative tool's `output` has the `{kind, content}` shape (`cards.ts` line 16 comment), and a `write_file` card's `arguments` holds the written text. So no code change is needed for a Dialogue case (settled point R3).
- **GNP-12 (line 20) and AGL-11 (line 21).** "the draft contains `[@id]` citations whose IDs are among the input entities and sources", "via `[@id]` citations in the manual eval". The report gives `citations`, `citationIds`, and the cards with their `arguments` and `sourcesUsed`, so the reader compares the ids with the inputs. The unit's Decisions name only "citation presence" as what the script records; an automatic id check is not needed by any criterion of AGL-25 and is not added (settled point R4).
- **Blocker wording.** None of the GNP units above names AGL-25 in `blocked_by` (`grep -l "AGL-25" units/*.md` finds AGL-08, AGL-09, AGL-10, AGL-12, AGL-25, SHL-21, SHL-22 and `units/README.md`). AGL-25's `unblocks` entry is quoted text, which `units/README.md` line 65 calls informative only. This is not in the way of this plan; no unit change (settled point R7).
- **SHL-21, SHL-22.** They name AGL-25 only as the precedent of an ungated unit (line 14 of each). No dependency.
- **Model providers.** `modules/providers.md` line 46: "Real-model check: the Agent loop's manual eval script, not CI." Line 47 makes MPR-08's T2 the check "until AGL-25 exists". The module asks for a real-model check, not for the test-connection or model-list routes, so this script uses the provider through the loop and the app default only (settled point R5).
- **AGL-08 (done).** AGL-25 reads its scenario and changes nothing there. `plans/AGL-08.md` section 5 says AGL-25 "adds no case file" to AGL-08 and that its case "uses the same intent text as the journey step". Both still hold.
- **AGL-09, AGL-10, AGL-12** (`parallel_with` lists AGL-25, line 8 of each). This plan adds nothing under `apps/`, `packages/` or `e2e/`. None of them has a `draft` or `planned` plan now.

## 6. Other draft or planned plans that change the same files

At revision (`main` `5475399`), the plans that are not `done` are `plans/MPR-11.md` (planned) and `plans/MPR-12.md` (planned). PLT-21 is now `done` and on `main` (`3ff05b4`). Neither plan changes a file of section 2.

- **MPR-11** (planned). Its D10 and its "must not change" list name the root `package.json` and the lockfile; its files are under `apps/web/` and `e2e/specs/providers-phone.e2e.ts` (new). No shared file. Either sequence is correct.
- **MPR-12** (planned). Its section 2 lists `packages/contracts/src/providers/model.ts`, `packages/contracts/test/*`, `apps/api/src/modules/providers/*.ts` and two `apps/api/test/providers-*.test.ts` files. No shared file. Behaviour: after MPR-12, resolution reads a `model` key from the active project's `project.yaml` first (its D1). The `nonfiction` sample's `project.yaml` has no `model` key (`grep -rn model examples/*/project.yaml` prints nothing), and this script sets no project override, so the run uses the app default before and after MPR-12. The routes this script calls (`/api/providers`, `/api/providers/app-default`) keep their shape (MPR-12 D7 is an expand). Either sequence is correct.
- **PLT-21** (done). Its `lint:examples` graph layer is on `main`. The test file of this plan names no `examples/` folder, so `npm run lint` passes.
- **Root `package.json`, `.gitignore`.** No other draft or planned plan edits them.

## 7. Open points

None remain. The draft's seven open points are settled by the revision, within the unit's Decisions and the module file:

- **R1 Models** (draft point 1). `--model` is required and repeatable, with no default list. The owner names the small and the larger model at run time (README example: two Ollama tags). No code holds a model name.
- **R2 CI membership** (draft point 2). T1 to T3 stay out of `npm test` and CI. Source: the unit's "**Not part of CI.**" and `units/README.md` line 138.
- **R3 Draft text** (draft point 3). The cards, copied unchanged, carry it (section 5, GNP-19). No pending-change text is added.
- **R4 Citation depth** (draft point 4). Presence (count) plus the list of distinct ids; no validity check (section 5, GNP-12).
- **R5 Provider coverage** (draft point 5). No test-connection or model-list call (section 5, Model providers).
- **R6 Summarize expectations and tick rule** (draft point 6). The case keeps `citations: "any"`: a summary of the outline needs no source citation, and the mock answer has none. Criterion 1 is ticked on T1 (section 4); M1 is the owner's manual check of the decision and does not gate.
- **R7 Units with no blocker** (draft point 7). Informative `unblocks` entry; not in the way; no unit change.

## Review parts

- **Part 1: the script, the case and its run (criterion 1).** Steps 1, 2, 3 (the case file and the test file), 4, 6, 7, 8, 9, 10, 11 and 12; package.json and `.gitignore` edits. Tests: T1 and M1. The reviewer of this part also checks that the diff changes only the files of section 2.
- **Part 2: adding a case and the README (criterion 2).** Step 5. Tests: T2 and T3.

## 8. Facts checked and facts assumed

### Facts checked (how)

1. Unit AGL-25 read in full: front matter (lines 2 to 9), Decisions (lines 14 to 17), criteria (lines 20 and 21). No change note (`grep -c "by revision"` prints 0).
2. `units/README.md` read: format, blocker notation, conventions (persisted formats carry `schemaVersion`), line 138 (testing rule: no real models in CI, unit tests never read `examples/`).
3. `modules/agent-loop.md` read in full (lines 9, 44, 60 to 67). `modules/providers.md` lines 44 to 47 read.
4. `plans/PLT-02.md` read (structure). `plans/AGL-08.md` read in full (sections 1, 3 and 5 used): the provider body, the origin header, the scenario and the transcript path.
5. `plans/DECISIONS.md`: `grep -n "AGL-25"` only. Lines 4014, 4024 and 4473 read in full.
6. `status:` of every `plans/*.md` read (front matter). Draft or planned: MPR-11, MPR-12, PLT-21. Their section 2 tables and "must not change" lists read, and grepped for `package.json`, `gitignore`, `scripts/`, `README`, `eval`, `e2e/fixtures`.
7. Root `package.json` read (scripts at lines 22 to 29, `engines` at lines 11 to 13). `.gitignore` read (8 lines). `.prettierrc.json` read (`singleQuote`, `trailingComma: all`). `.prettierignore` read (`/units/`, `/modules/`, `/plans/`, `/package-lock.json`).
8. `.github/workflows/ci.yml`: `grep -n "run:"` (lines 23 to 35). `grep -n eval` on that file and on `README.md` prints nothing.
9. Glob scope: `node -e` with `path.matchesGlob`. `scripts/eval-agent/run.test.mjs` does not match `scripts/*.test.mjs` (false). `scripts/pins.test.mjs` does (true).
10. Examples check: `scripts/examples-check/m1.mjs` read at lines 1 to 60 and 60 to 200 (`TEST_FILE` line 25, `EXEMPT_TEST_FILE` line 26, `R1` line 30, `R2_QUOTED` line 32, `checkTestFiles` line 203). `scripts/examples-check/lib.mjs` `walk` read (lines 20 to 41). `scripts/examples-check/index.mjs` read (the `ctx.root` scan).
11. e2e harness: `e2e/harness/global-setup.ts` read (`assertPortFree` line 44, `buildWorkspaces` line 60, `startApi` lines 74 to 85, `checkMock` line 88, `stop` at the end). `e2e/specs/journey.e2e.ts` read lines 1 to 100 (the project-from-sample and agent-run steps).
12. Mock: `e2e/fixtures/mock-openai/server.mjs` lines 1 to 30 read (`startMockOpenAI(options)`, `options.scenariosDir`, default folder). `e2e/fixtures/mock-openai/cli.mjs` read. `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` read in full (three steps, `turnIndex` 0, 1 and 2, the answer text).
13. API boot: `apps/api/src/main.ts` line 8 (`app.listen(8080, '0.0.0.0')`). `apps/api/package.json` line 6 (build chain). `apps/api/tsconfig.build.json` line 5 (`outDir` `dist`). `apps/api/dist` is absent (`ls`).
14. Setup and auth: `setup-auth.guard.ts` lines 47 to 72 read. `setup-session.controller.ts` lines 66 to 100 read (handshake at line 69; `Set-Cookie` at line 94 on a loopback Host). `setup-token.store.ts` line 71 (`setupUrl`) and line 108 (`writeSetupUrl(join(dir, 'setup-url'), url)`) grepped. `request-policy.ts` grepped for `originFor` (lines 9 to 24).
15. Agent-loop contracts read: `routes.ts` (all), `runs.ts` lines 1 to 70, `cards.ts` lines 1 to 60, `constants.ts` lines 1 to 100, `events.ts` lines 1 to 140, `transcript.ts`. `agent-conversations.controller.ts` lines 20 to 40 read. `agent-runs.controller.ts` read. `transcript-reader.ts` line 20 (`TRANSCRIPT_FOLDER`) and lines 277 to 285 read. `transcript-entries.ts` lines 50 and 59 grepped. `agent-prompt.ts` line 11 grepped.
16. Project store: `samples.controller.ts` read (line 14 comment; route at line 24). `active-project.controller.ts` line 26 grepped. `project.ts` lines 39 to 46 grepped (`projectSummarySchema`) and lines 60 to 80 read. `constants.ts` line 14 grepped (`PROJECT_FOLDER_NAME_PATTERN`).
17. Providers: `providers.controller.ts` lines 50 to 80 read (create at 55 to 56; app default at 73 to 74). `defaults.ts` lines 1 to 60 read (`PROVIDER_DEFAULTS` line 4; Ollama preset `baseURL` line 38). `config.ts` lines 45 to 70 read (`providerCreateSchema` line 53) and lines 1 to 45 grepped (`openaiCompatibleSchema` line 7). `model.ts` line 5 grepped.
18. Ollama absent: `command -v ollama` prints nothing. `curl -m 3 http://127.0.0.1:11434/api/tags` prints `000`.
19. Versions: `node -v` prints `v26.13.0`, `npm -v` prints `11.20.0`.
20. Git state: `git status --short` prints nothing. `HEAD` is `5c544f6`. `plans/AGL-25.md` did not exist.
21. Ignore behaviour: `prettier --file-info e2e/test-results/x.json` prints `"ignored": true`. `git check-ignore -v e2e/test-results/x.json` names `.gitignore:8`.
22. Downstream units: `grep -n eval` on `units/GNP-07`, `GNP-08`, `GNP-09`, `GNP-10`, `GNP-12`, `GNP-15`, `GNP-16`, `GNP-19`, `GNP-23`, `AGL-11` (lines 20, 21 and 24 as cited). `grep -rln "AGL-25" units/` (section 5).
23. The unit's `parallel_with` entries of AGL-09, AGL-10 and AGL-12 (line 8 of each) read.

### Facts assumed (not checked)

1. The owner's Mac runs Ollama at `http://127.0.0.1:11434/v1` with the chosen models, and those models accept tool calls. Not checkable here.
2. Port 8080 is free on the owner's host when the script runs.
3. Node 26's `fetch` honours `redirect: 'manual'` (the 303 is returned with its `Set-Cookie`, readable through `headers.getSetCookie()`), and it sends a caller-set `origin` header. T1 checks both at step 6. If `fetch` refuses the header, the fallback is `node:http`.
4. `npm run build -w @bbartolome/scriba-api` writes `apps/api/dist/main.js`. The e2e relies on it. Not run.
5. The mock's `summarize-outline` steps match the script's requests: a new conversation starts at `turnIndex` 0. T1 checks it.
6. The conversation turn is written after the run ends, so the poll ends. `plans/AGL-08.md` section 1 says the run-end line is written after `run-ended` is published.
7. `SCRIBA_PORT` defaults to 8080 (the origin check uses it; the e2e relies on the default).
8. npm appends the arguments after `--` to the last command of an `&&` chain. Step 7 checks it.
9. Ten minutes per run and a one-second poll are enough for a summarize-length run on the owner's models.
10. A project folder `<case-id>-<n>` can be created from the sample in the temp library (the sample copy is writable). The e2e does the same with `demo-book`.

### Facts checked by the reviser (at `main` `5475399`)

1. Plan statuses: only MPR-11 and MPR-12 (both planned) are not `done`; PLT-21 is done. MPR-12 section 2 and D1, D7 read.
2. `grep -l "AGL-25" units/*.md`; the GNP and AGL-11 eval lines (`grep -n eval units/GNP-*.md units/AGL-11*.md`); SHL-21 and SHL-22 line 14.
3. Mock step choice: `turnIndex` counts the assistant messages of the request (`e2e/fixtures/mock-openai/server.mjs` lines 117 to 121), so each new conversation (a new project per case) starts at step 0; T2's two cases both run the full scenario.
4. Journey 'agent run' step (`e2e/specs/journey.e2e.ts` lines 96 to 121): the same provider body and the app-default call; the provider id is the `id` of the 201 answer.
5. The guard (`setup-auth.guard.ts` lines 45 to 79) needs a verified cookie and, for a POST, the origin; it does not need setup to be complete. The handshake sets the cookie on a loopback Host (`setup-session.controller.ts` lines 69 to 98); `SCRIBA_SETUP_URL_BASE` defaults to `http://127.0.0.1:<port>` (`env.ts` line 139); the URL's query key is `token` (`setup-token.store.ts` line 73); the cookie name is `scriba_setup_<SCRIBA_PORT>` (`setup-cookie.signer.ts` line 19).
6. The API boots without the web build: the root `dev` script builds only contracts and the API before `node apps/api/dist/main.js`.
7. Contracts: `agentStartRequestSchema`, `agentStopRequestSchema`, `conversationTurnSchema` (`runs.ts`), `AGENT_RUN_END_REASONS` and `AGENT_CARD_STATUSES` (`running`, `done`, `error`) in `constants.ts`, `startFromSampleRequestSchema` and `activateRequestSchema` (`project.ts` lines 65 to 74), `PROJECT_FOLDER_NAME_PATTERN`.
8. The sample `examples/nonfiction/project.yaml` has no `model` key. The seeded app default is the Ollama preset (`providers.seeding.ts` line 71).

