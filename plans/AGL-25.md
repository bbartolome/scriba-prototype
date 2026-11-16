---
id: AGL-25
status: draft
---
# AGL-25 plan — manual real-model eval script (`npm run eval:agent`)

Batch: [AGL-25] (Agent loop, no phase, M1, ungated). Batch of one. Base: `main` at `5c544f6`. Status `draft`; the orchestrator moves it. The unit file has no change note (`grep -c "by revision" units/AGL-25-manual-eval-script.md` prints 0). The planner ran only read commands and two read-only checks (a `node -e` glob test and `prettier --file-info`). It ran no install, build or test.

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
- **Provider.** `POST /api/providers` (201; `apps/api/src/modules/providers/providers.controller.ts` lines 55 to 56). Body: `label` `eval-model-<n>`, `kind` `openai-compatible`, `baseURL`, `model`, and the five `PROVIDER_DEFAULTS` values typed literally (`packages/contracts/src/providers/defaults.ts` lines 4 to 10; `config.ts` lines 7 to 17 and 53 to 63). The literals follow the e2e, which has no contracts dependency. Then `POST /api/providers/app-default` with `{providerId, model}` (200; `providers.controller.ts` line 73; `packages/contracts/src/providers/model.ts` line 5).
- **Base URL.** Default `http://127.0.0.1:11434/v1`. The Ollama preset's `http://host.docker.internal:11434/v1` (`defaults.ts` line 38) is for the compose container, not for an API on the host. `--base-url` overrides it.
- **Project.** `POST /api/project-store/projects/start-from-sample` with `{sampleId, folderName, title}` (201). Its comment says the answer does not activate the project (`apps/api/src/modules/project-store/samples.controller.ts` line 14). Then `POST /api/project-store/active` with `{projectId}` (`active-project.controller.ts` line 26). `folderName` is `<case-id>-<n>`, which matches `PROJECT_FOLDER_NAME_PATTERN` (`packages/contracts/src/project-store/constants.ts` line 14). The project id is the `id` of the summary (`project.ts` line 40).
- **Run and outcome.** `POST /api/agent-loop/runs` with `{intent}` (`packages/contracts/src/agent-loop/routes.ts` line 3; `runs.ts` line 8) answers `{runId, conversationId}`. The script polls `GET /api/agent-loop/conversations/<conversationId>` once a second until a turn has that `runId` (`routes.ts` lines 6 to 9; `apps/api/src/modules/agent-loop/agent-conversations.controller.ts` lines 29 to 36). The conversation lists finished turns of the active project only, so activation comes first. Each turn gives `reason`, `assistantText` and `cards` (`runs.ts` line 40; `transcript-reader.ts` lines 277 to 285). Polling was chosen over the SSE stream because it needs no event client.
- **Failure modes from the cards.** `agentCardSchema` (`packages/contracts/src/agent-loop/cards.ts` from line 17; `error` at line 29) carries `error: {message, attempt, withdrawn?}`. `malformedCalls` = cards with an `error`, the withdrawn one included. `withdrawals` = cards with `error.withdrawn === true`. `stepCapped` = `reason === 'capped'` (run-end reasons at `constants.ts` line 20).
- **Citation presence.** The citation form is `[@id]` (`apps/api/src/modules/agent-loop/agent-prompt.ts` line 11). Count the matches of `/\[@[^\]\s]+\]/g` in `assistantText` plus `JSON.stringify(cards)`. Drafts written by `write_file` or by a narrative tool sit in a card's `arguments` and `output` (`transcript-entries.ts` lines 50 and 59), so both are searched. The count is presence only (open point 4).
- **Expectations** (case key `expect`). `reason`: a run-end reason. `tools`: names that must appear on a card with status `done`. `citations`: `present`, `absent` or `any`. A key that the case omits gives `unchecked`. Otherwise the result is `pass` or `fail`.
- **Case file.** Keys `sample`, `intent`, `expect`. The case id is the file name without `.json`, and must match `^[a-z0-9][a-z0-9-]*$`. No `schemaVersion`, because a case is a hand-written input, not a persisted format.
- **Report.** `eval-reports/<UTC yyyymmddThhmmssZ>/report.json` and `eval-reports/<stamp>/library/`, under the repository root. The report carries `schemaVersion: 1` (`units/README.md`, "Conventions shared by every module": persisted formats carry their own `schemaVersion`). The new `.gitignore` line is `eval-reports/`, after `e2e/test-results/` (`.gitignore` line 8).
- **Library after the run.** After the API stops, the script deletes `<library>/.scriba/` (the library's settings, token and setup URL). The project folders stay, with their `logs/agent-runs/` transcripts, for the author to read.
- **Timing.** At most 10 minutes per run. The poll is every second.
- **Exit codes.** 0: the report is written and no run errored. 1: a run errored (its `error` names the cause), or the API did not start (then no report is written). 2: usage, an invalid case file, an unknown `--case`, or port 8080 in use. A failed expectation never changes the exit code. The script records and does not gate.
- **Dependencies.** Node built-ins only. The root `engines` is `>=26 <27` (root `package.json` lines 11 to 13). The script imports no contracts package.
- **Options.** `--model <name>` (repeatable, at least one, no default). `--base-url <url>`. `--case <id>` (repeatable; default all cases). `--cases-dir <dir>` (default `scripts/eval-agent/cases`). `--reports-dir <dir>` (default `eval-reports` at the repository root). The tests use the last two.
- **Report keys.** `schemaVersion`, `startedAt`, `finishedAt`, `baseUrl`, `library`, `results[]`. Each result has `case`, `model`, `runId`, `conversationId`, `reason`, `assistantText`, `citations` (a count), `cards` (copied from the turn, unchanged), `failureModes` (`malformedCalls`, `withdrawals`, `stepCapped`), `expect` (`reason`, `tools`, `citations`) and `error` (a string, or null).

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
8. **Repository gates.** `npm run lint` (Prettier, which covers the new files, and `lint:examples`, which covers the test file's wording), `npm test`, `npm run build`. Expected: exit 0 each. Then `npm test 2>&1 | grep -c eval-agent` prints `0`, which shows the script's test is outside CI.
9. **Ignore check.** `mkdir eval-reports && git check-ignore -v eval-reports/probe` prints `.gitignore:9:eval-reports/`. `git status --short` lists nothing under `eval-reports/`. `rmdir eval-reports`.
10. **Real-model check (manual, owner).** Not run by the implementer. Section 4 gives the procedure. Record: "not run: no Ollama on this host (`command -v ollama` prints nothing; `127.0.0.1:11434` did not answer)."
11. **Commit and fresh clone.** Stage by name: `scripts/eval-agent/run.mjs`, `scripts/eval-agent/cases/summarize-outline.json`, `scripts/eval-agent/README.md`, `scripts/eval-agent/run.test.mjs`, `package.json`, `.gitignore`. Commit on `unit/AGL-25` with `feat(AGL-25): manual eval script for the tool-calling loop`. Then `git clone --branch unit/AGL-25 /Users/bbartolome/workspace/scriba-prototype <empty directory under /tmp>`, and in it `npm ci && npm run lint && npm test && npm run build`. Expected: exit 0 each.
12. **Record.** Node and npm versions; the exit code of each command; the test counts; the number of results and the `reason` of the T1 report; the status of the manual check (step 10).

## 4. Acceptance criteria and tests

Nothing is marked passed by this plan. T1 to T3 are in `scripts/eval-agent/run.test.mjs`, run by `node --test scripts/eval-agent/run.test.mjs` after the two builds of step 2. The file starts the mock with `startMockOpenAI` from `e2e/fixtures/mock-openai/server.mjs` (`scenariosDir` defaults to the shipped folder, which holds `summarize-outline.json`) and closes it after the tests. Each test runs `scripts/eval-agent/run.mjs` in a child process with `--reports-dir` set to a temp folder. The tests run one after another, so only one API holds port 8080 at a time. The file names no folder of `examples/` and no test path with `examples/` (rules R1 and R2).

| Criterion (unit lines) | Test (file and name) | Seam | Command | Pass condition |
|---|---|---|---|---|
| 1. "The script runs the 'summarize my outline' case against a configured provider and writes a report" (line 20) | `scripts/eval-agent/run.test.mjs`, **T1 runs the summarize-outline case against a provider and writes a report** | CLI; the API the script boots; the mock's `summarize-outline` scenario as the provider (`--base-url <mock>/scenario/summarize-outline/v1`, `--model mock-model`, `--case summarize-outline`) | `node --test scripts/eval-agent/run.test.mjs` | Exit 0. The temp reports folder holds one `<stamp>` folder with `report.json`. The report has one result: case `summarize-outline`, model `mock-model`, `reason` `completed`, `error` null, cards `list_files` and `read_file` with status `done`, `assistantText` containing `The outline has six chapters`, and all three `expect` entries `pass` |
| 1 (manual, real model) | **M1 (manual, owner)** | Ollama on the owner's Mac host | `npm run eval:agent -- --model <small> --model <larger>` | Exit 0. `eval-reports/<stamp>/report.json` has two `summarize-outline` results, one per model; in each, `error` is null and `reason` is not null. The owner reads the outcomes there. Not run here (step 10). The box stays unticked until M1 is recorded (open point 6) |
| 2. "Adding a case is a single data file, documented in the script's README" (line 21) | **T2 a case added as one data file runs with no code change** | CLI with `--cases-dir` set to a temp folder holding two files: `summarize-outline.json` and `summarize-outline-copy.json`, both copied from the case file of step 3 | `node --test scripts/eval-agent/run.test.mjs` | Exit 0. The report's results name both case ids, each with `reason` `completed`. The test does not edit `run.mjs` |
| 2 (README) | **T3 the README documents the case file keys** | Text of `scripts/eval-agent/README.md` | same | The README contains `one file`, `npm run eval:agent`, and each of `sample`, `intent`, `expect`, `reason`, `tools`, `citations` |

Extra check, not a criterion: step 8's grep shows the script's test is not run by `npm test`. The real-model check M1 is the only part that needs a real model. Its absence here is recorded, not waived.

## 5. Downstream agreement

- **Genre packs per-tool cases** (GNP-07, GNP-08, GNP-09, GNP-10, GNP-15, GNP-16, GNP-23; each has the criterion "A manual eval case (small and larger local model) is added to the Agent loop's eval script data", line 24). They need: the folder `scripts/eval-agent/cases/`; one file per case (criterion 2); the keys of section 1; two `--model` values per run; and the citation count. Gaps: draft text for voice checks (GNP-19, line 24) is only in the cards (open point 3); `[@id]` validity (GNP-12 line 20, AGL-11 line 21) is presence only (open point 4).
- **Genre packs, gate wording.** GNP-12 and AGL-11 need "the draft contains `[@id]` citations whose IDs are among the input entities and sources", checked "through the manual eval". That is an ID check, not the presence check of this plan (open point 4).
- **Blocker wording.** None of the GNP units above names AGL-25 in `blocked_by` (grep of `units/` for `AGL-25` finds only AGL-08, AGL-09, AGL-10, AGL-12, AGL-25, SHL-21, SHL-22 and `units/README.md`). AGL-25's `unblocks` entry is quoted text, which `units/README.md` line 65 calls informative only (open point 7).
- **Model providers.** AGL-25 is the canonical real-model check (section 1). This script uses the provider through the loop and the app default. It does not call `POST /api/providers/test` or the model list, which MPR-08's T2 steps S5 and S6 check (open point 5).
- **AGL-08 (done).** AGL-25 reads its scenario and changes nothing there. `plans/AGL-08.md` section 5 says AGL-25 "adds no case file" and that its case "uses the same intent text as the journey step". Both still hold.
- **AGL-09, AGL-12 (`parallel_with` lists AGL-25, unit line 8 of each), AGL-10 (its plan, line 204, names no overlap).** This plan adds nothing under `apps/`, `packages/` or `e2e/`. AGL-09 and AGL-12 have no plan yet, so their files are not known.

## 6. Other draft or planned plans that change the same files

The `status:` of every `plans/*.md` was read. Three plans are not `done`: `plans/MPR-11.md` (planned), `plans/MPR-12.md` (draft) and `plans/PLT-21.md` (planned). None of them changes a file of section 2.

- **MPR-11** (planned). Its section 2 table lists `apps/web/...` and `e2e/specs/providers-phone.e2e.ts` (new). Its "must not change" list names the root `package.json`, the lockfile, and `e2e/playwright.config.ts`, `e2e/harness/**` and the other specs. It does not touch any file of this plan. Either sequence is correct: AGL-25 touches no file of MPR-11.
- **MPR-12** (draft). Its section 2 table lists `packages/contracts/src/providers/model.ts`, `apps/api/src/modules/providers/*.ts` and `apps/api/test/providers-*.test.ts`. The project-model override (its D5) is not set by this script, which makes a new project and sets only the app default. So the resolution the script sees is the same before and after MPR-12. Either sequence is correct.
- **PLT-21** (planned). Its section 2 table lists `scripts/examples-check/graph.mjs` (new), `scripts/examples-check/index.mjs`, `scripts/examples-check/lib.mjs` and `scripts/examples-check-graph.test.mjs` (new). Its "must not change" list names `package.json`, because PLT-21 adds no script. Either sequence is correct: `lint:examples` checks both layers, and the new test file of this plan names no `examples/`, so either merge order passes `npm run lint`.
- **Root `package.json`.** AGL-25 adds one key after `"e2e"`. No other draft or planned plan edits the root `package.json` (MPR-11 forbids it, PLT-21 adds none). If a unit merged later adds a script at the same place, git reports a textual conflict. The resolution keeps both lines.
- **`.gitignore`.** None of the three plans lists it.

## 7. Open points

All open. The planner has not decided any of them.

1. **Models.** Which small and which larger model the owner runs (for example, two Ollama tags). The plan requires `--model` with no default list. Owner and Navigator.
2. **CI membership of T1 to T3.** The plan keeps them out of `npm test`, because the unit says "Not part of CI". If the Navigator decides they join CI, the root `test` script changes (or the file moves to `scripts/*.test.mjs`), and CI boots the API and the mock. Navigator.
3. **Draft text in the report.** Draft text is in the cards only (`arguments` for writes, `output` for narrative tools). GNP-19's voice check needs readable draft text, and the report holds no pending-change text. Navigator: add pending-change text to the report, or keep the cards only.
4. **Depth of the citation check.** Presence only (unit wording; the plan's choice) or also a check that each `[@id]` names an entity or source of the project (GNP-12 and AGL-11 wording). Navigator.
5. **Provider coverage.** Whether AGL-25 also calls `POST /api/providers/test` and the model list, as MPR-08's T2 does (steps S5 and S6), so that AGL-25 is the providers module's complete real-model check. The plan: no. Navigator.
6. **Expectations of the summarize case and the tick rule.** Whether the summarize case expects `citations` `present` (the plan has `any`), and whether criterion 1 is ticked on T1 alone or only after M1 is recorded (the plan waits for M1, as the MPR-08 N1 precedent did). Owner and Navigator.
7. **Units with no blocker.** The GNP units that need eval cases do not name AGL-25 in `blocked_by` (section 5). Whether any unit file must change for that is for the Navigator or the orchestrator. The planner does not edit `units/`.

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
