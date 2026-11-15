---
id: MPR-08
status: planned
unit: units/MPR-08-client-gate.md
---
# MPR-08 plan — Client gate: guard check, secrecy suite, seam test and the M1 model-path check

Unit: MPR-08 (module Model providers, phase:client, M1; blocked by MPR-02 to MPR-07, SAU-08 and PLT-13; unblocks MPR-12, TRG-12 and AGL-03; `units/MPR-08-client-gate.md` lines 7 and 9). Base: `main` at 7e9469d. Every line number below was read at 7e9469d with cat -n, sed, grep or git (section 7). The planner ran only read commands and one probe of `127.0.0.1:11434`; it ran no test, no build and no install. Revision 1 was made at `main` 18b4f1b; `git diff --stat 7e9469d 18b4f1b` touches only `plans/DECISIONS.md`, `plans/MPR-08.md` and `plans/QUEUE.md`, so the line numbers of section 7 still hold. The revision changes this plan and adds one line to `modules/providers.md` (section 0, decision N3); the implementer changes only the path of section 2's implementer row. No code is written by the planner or the reviser, and nothing is committed by them.

Each statement is FACT (checked; section 7) or ASSUMED (section 8). Decisions are tagged D1 to D13 in section 1b. Navigator decisions are N1 to N3 in section 0.

## 0. Navigator decisions (2026-11-15, session `74b9c36bbaa14f72bbc4f657b25a613d`)

- **N1 — open point 1: option A.** The owner runs the manual check T2 (section 4.2, steps S1 to S6) on the Mac host before the criterion-2 box (unit line 23) is ticked. The unit stays in the pipeline until T2 passes. Fallback B (the unit is complete without criterion 2, the box stays unticked, the cause is recorded in this plan) applies only if the owner cannot run T2. Option C (a stand-in server on port 11434) is rejected. Source: `plans/DECISIONS.md` line 4011 to 4015.
- **N2 — open point 2: criterion 2 is the model path only.** The seeded `ollama` provider reaches Ollama on the host through the real compose stack, shown by T2 steps S3 to S6. The Agent loop's chat run ("summarize my outline") is AGL-08's and is not part of this criterion. Reason: the reverse reading is a cycle (MPR-08 → AGL-08 → AGL-03 → MPR-08: AGL-08 is blocked by AGL-03, `units/AGL-08-file-tools-chat-gate.md` line 7; AGL-03 is blocked by MPR-08, `units/AGL-03-loop-core.md` line 7). Source: `plans/DECISIONS.md` lines 4017 to 4020.
- **N3 — open point 3: T2 meets the module's real-model rule.** `modules/providers.md` gets an additive note after line 46 (now line 47): "Until AGL-25 exists, the MPR-08 T2 procedure (plans/MPR-08.md section 4.2) serves as the providers module's real-model check." Line 46 is not rewritten; AGL-25 remains the eventual canonical check. No second check is required. The note is made by the reviser in this revision, not by the implementer (section 2). Source: `plans/DECISIONS.md` lines 4022 to 4026.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the earlier plans, prompt.md or DECISIONS

- **What the merge does.** Merging closes Model providers `phase:client`. This unit adds no route, no contract and no client code. Source: unit line 14; `units/README.md` line 91.
- **Guard.** Every `/api/providers` route sits behind Setup & auth's global guard, and none is `@Public()`. Source: unit line 17; `modules/providers.md` line 33; `plans/MPR-06.md` D16; FACT `providers.controller.ts` (12 handlers, no `@Public`).
- **Secrecy.** Keys live only in the secrets file. `settings.yaml` holds only `keyRef`. No GET response, no `settings.yaml` byte, no stdout line and no error body carries a key. The mock sees the key in `Authorization` only. Source: unit line 18; `modules/providers.md` line 36; `plans/MPR-06.md` C1; `plans/MPR-07.md` line 176 (its secrecy checks are C2 and E1, and the suite is MPR-08's).
- **Milestone check.** It is a real-stack check, with Ollama on the host, and not a CI test. Source: unit line 23; `modules/providers.md` line 46 (real-model check is not in CI) and line 47 (the transitional note of N3: T2 serves as the module's real-model check until AGL-25 exists).
- **Criteria that the local environment cannot test.** Criterion 2 cannot run on the implementer's machine. Per N1 it is not waived: the owner runs T2 on the Mac host, and the box is ticked only after a recorded pass. Fallback B (box unticked, cause recorded, as for SAU-08 in `plans/DECISIONS.md` lines 3946 to 3956) applies only if the owner cannot run T2. Source: `prompt.md` lines 275 to 281; N1.
- **Criterion 1 is a set.** It names the criteria of MPR-02 to MPR-07. Those are ticked on main in their unit files. Source: unit line 22; `units/MPR-02…07` acceptance sections.
- **Test style.** External behaviour only: HTTP responses, the mock's records, files on disk, captured stdout; through the composed app with a temp library and Platform's mock OpenAI server. Source: `units/README.md` line 136; `modules/providers.md` lines 43 to 46.
- **Demo.** Demo steps 1 to 4 are the model-path check of section 4.2. Step 5 (the chat run) is the Agent loop's. Source: unit lines 25 to 30; `e2e/specs/journey.e2e.ts` lines 72 and 73 (the agent-run step is pending, owner AGL-08).
- **System seam.** The e2e agent-run step is owned by the Agent loop, and this unit coordinates with it without writing it. Source: unit line 19; `e2e/specs/journey.e2e.ts` lines 72 and 73.

### 1b. Decisions this plan makes

- **D1 One new test file.** `apps/api/test/providers-gate.test.ts` holds G1 to G3 (section 4.3). Criterion 1 is a run of thirteen existing test files (T1, section 4.1). Criterion 2 is a procedure (T2, section 4.2). No code, no existing test and no e2e file changes. Reason: the code is done; "none weakened" means the MPR-02 to MPR-07 tests stay as they are.
- **D2 Name.** `providers-gate.test.ts`. Not `providers-client-gate`, because the `providers-client-*` files are MPR-04's client tests.
- **D3 Route list (G1).** The twelve method and path pairs of `providers.controller.ts`, listed in G1 (a). G1 asserts that each pair is in `app.routes()`, not that the two lists are equal. Reason: MPR-12 adds two project routes (`routes.ts` lines 13 to 15), and an equality check would break MPR-12 for a reason that is not MPR-12's.
- **D4 Log level and controls (G2).** G2 sets `SCRIBA_LOG_LEVEL` to `debug` through `env`. `createTestApp` uses `error` by default (`create-test-app.ts` line 82), and the levels are `debug`, `info`, `warn` and `error` (`env.ts` line 12), so `debug` gives the most stdout lines. G2 asserts that the captured stdout is not empty, so a silent capture cannot pass.
- **D5 Upstream echo (G2).** One mock scenario answers 401 with a body that quotes the key. This is synthetic: a real provider does not quote a key it never received. It tests the client's rule of no upstream text in errors (`client/errors.ts` lines 19 to 30; the comment at line 19).
- **D6 What "end to end" covers.** The composed app over real HTTP (`createTestApp` listens on `127.0.0.1` on an ephemeral port, `create-test-app.ts` line 88), the real client and the mock. Not the Playwright harness: its API child process is spawned with `stdio: 'inherit'` (`e2e/harness/global-setup.ts` line 83), so the test cannot capture that process's stdout.
- **D7 Seam without an e2e change (G3).** G3 creates a provider through `POST /api/providers` whose baseURL has the form the harness exports, `<mock base URL>/scenario/<name>/v1` (`global-setup.ts` lines 33 and 34; `plans/PLT-13.md` line 13), and then runs the connection test. The e2e step stays pending, owned by AGL-08 (`journey.e2e.ts` lines 72 and 73).
- **D8 Temp scenarios.** G2 and G3 write their own scenario files into a temp folder and start the mock with `startMockOpenAI({scenariosDir})`, as `plans/MPR-07.md` D8 does. Reason: the bundled `tool-call.json` answers the chat step with a tool call, which G3 does not test.
- **D9 Helpers.** Copied, not imported, from `providers-api.test.ts` and `providers-connection-test.test.ts`, because their helpers are not exported and test files export nothing (`plans/MPR-07.md` D10). Kits are imported where they export the helper: `providers-client.kit.ts` (`startMockOpenAI` line 16, `recordsOf` line 61, `resetScenario` line 72), `secrets.kit.ts` (`captureStdout` line 139, `stripAnsi` line 158), `settings.kit.ts` (`makeLibrary` line 60, `settingsFilePath` line 69), `guard-request.ts` (`send` line 27, `sessionCookie` line 80), `invariant-sweep.ts` (`LOOPBACK_HOST` line 38, `LOOPBACK_ORIGIN` line 39).
- **D10 Placeholder value.** G2 writes the keyless placeholder as the literal `scriba-keyless` (`client/openai-compatible-client.ts` line 27). The test checks the wire value, so it does not import the constant.
- **D11 No code change.** If a gate test fails, the cause is a defect in the code of MPR-02 to MPR-07, or in this plan. The implementer stops with PLAN DOES NOT WORK and does not change code in this unit. Reason: a gate that changes the code it gates is not a gate, and the fix belongs to the unit that owns the code.
- **D12 Evidence outside the repository.** T1's JSON report goes to `/tmp/mpr08-gate/`. No file in the repository changes for evidence.
- **D13 Image for T2.** T2 builds the image from the checked commit with the tag `bbartolome/scriba:latest` (`docker build -t bbartolome/scriba:latest .`), so that the one-liner of `README.md` line 28 finds it locally and does not pull. No registry is used. If the installer pulls anyway, the owner stops and records it.

## 2. Files to create or change

Two paths change:

| Path | Change | Who | Purpose |
|---|---|---|---|
| `apps/api/test/providers-gate.test.ts` | new | implementer, on `unit/MPR-08` | G1 (guard), G2 (secrecy suite), G3 (seam); section 4.3 |
| `modules/providers.md` | one line added after line 46 (new line 47) | reviser, in this revision (committed by the orchestrator with this plan) | N3: "Until AGL-25 exists, the MPR-08 T2 procedure (plans/MPR-08.md section 4.2) serves as the providers module's real-model check." Line 46 is unchanged. |

The module line is already in the working tree when the implementer starts (it lands on `main` with this plan). The implementer does not edit `modules/providers.md`.

Must not change (implementer): every other file in the repository. In particular: `apps/api/src/**` (the code of MPR-02 to MPR-07); the thirteen existing test files of T1 (section 4.1); `apps/api/test/invariant-sweep.ts` and the other invariant files; the kits (`providers-client.kit.ts`, `providers-resolution.kit.ts`, `secrets.kit.ts`, `settings.kit.ts`, `guard-request.ts`) and `create-test-app.ts`; `e2e/**`; `packages/contracts/**`; `apps/web/**`; `package.json` and `package-lock.json`; `units/**`; `modules/**` (the N3 line is the reviser's, above); `plans/**` except this plan; `plans/DECISIONS.md`; `prompt.md`.

Effect of the module line on other citations: lines 47 to 58 of `modules/providers.md` move to 48 to 59. Done records that cite them by number (`plans/PLT-16.md` line 233, "line 58"; `plans/DECISIONS.md` line 4014, "line 53") were true when written and are not edited. No `draft` or `planned` plan other than this one exists (section 7).

Orchestrator step 8 (`prompt.md` line 168) ticks the criteria in `units/MPR-08-client-gate.md` and sets this plan's status to `done` on the unit branch. Those changes are not the implementer's and are not listed here.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/MPR-08`, created from `main`. Record `node -v` (expected `v26.x`, as `.nvmrc` requires) and `npm -v` beside each result. Do not push. Do not add a remote. Do not run docker. Stage only the path of section 2.

0. **Base.** `git rev-parse --short main` prints 7e9469d, or a later commit. `git diff --stat 7e9469d -- apps packages e2e` is empty. If not, stop and report: the line numbers of section 7 may be stale.
1. **Branch.** `git switch -c unit/MPR-08` from `main`. Expected: `Switched to a new branch 'unit/MPR-08'`.
2. **Baseline.** `npm test -w @bbartolome/scriba-api` (it builds first). Expected: exit 0. Save the totals. If it fails, stop and report.
3. **Write the tests.** Create `apps/api/test/providers-gate.test.ts` with G1, G2 and G3 (section 4.3). Run `npx vitest run test/providers-gate.test.ts` in `apps/api`. Expected: three pass at the first run, because this unit adds no production code and the behaviour is already on main. Save the output. A failing test is a stop (D11).
4. **Criterion 1 run (T1).** In `apps/api`: `mkdir -p /tmp/mpr08-gate`, then `npx vitest run --reporter=json --outputFile=/tmp/mpr08-gate/t1.json` followed by the thirteen paths of section 4.1. Expected: exit 0. Check the report against the pass condition of section 4.1. Save the summary line. The field names of the JSON report are ASSUMED (section 8) and the first run confirms them.
5. **Setup & auth's invariant suites.** `npx vitest run test/invariant- test/token-guard-gate.test.ts test/setup-auth-guard.test.ts` in `apps/api`. Expected: every file passes. Save the output and the duration of `invariant-get-head.test.ts`. This unit adds no sweep, so no duration limit applies.
6. **Format.** `npx prettier --write apps/api/test/providers-gate.test.ts`, then `npx prettier --check apps/api/test/providers-gate.test.ts`. Expected: the file is written, then the check passes.
7. **Full API tests.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. Save the totals.
8. **Lint.** `npm run lint` at the root. Expected: exit 0, and the output ends with `All matched files use Prettier code style!`.
9. **Paths.** `git status --short` shows exactly `?? apps/api/test/providers-gate.test.ts`, and nothing else.
10. **Commit.** One commit on `unit/MPR-08` with the message `test(MPR-08): gate the providers API with the guard, secrecy and seam tests`. Do not push.
11. **Fresh clone.** `git clone --branch unit/MPR-08 /Users/bbartolome/workspace/scriba-prototype /tmp/mpr08-fresh` into an empty target. In it: `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
12. **Criterion 2 (T2) is not run by the implementer.** Record: "not run here: no Ollama on this host (`command -v ollama` prints nothing; `127.0.0.1:11434` did not answer at planning time); T2 is the owner's (N1)". Section 4.2 is the procedure for the owner, on the Mac host with Ollama. Per N1 the unit stays in the pipeline until the owner records a T2 pass; the box is not ticked before that. Only if the owner cannot run T2 does fallback B apply (box unticked, cause recorded in this plan).
13. **Record.** Store the Node and npm versions, each command's output, the T1 summary and the G1 to G3 output. A criterion is marked passed only when its row in section 4 has its pass condition met.

## 4. Acceptance criteria and tests

The unit has two criteria (unit lines 22 and 23). Each has one test here: T1 for criterion 1 and T2 for criterion 2. The three scope items of the unit (guard, secrecy suite, system seam; unit lines 17 to 19) have G1 to G3. They are not criteria, and they do not tick a box.

### 4.1 Criterion 1 (unit line 22): test T1, the gate run

The thirteen files, all in `apps/api/test/`, run together:

1. `providers-seeding.test.ts`
2. `providers-create.test.ts`
3. `providers-secrets-file.test.ts`
4. `providers-log-redaction.test.ts`
5. `providers-client-auth.test.ts`
6. `providers-client-errors.test.ts`
7. `providers-client-models.test.ts`
8. `providers-client-retry.test.ts`
9. `providers-client-stream.test.ts`
10. `providers-client-timeout-abort.test.ts`
11. `providers-resolution.test.ts`
12. `providers-api.test.ts`
13. `providers-connection-test.test.ts`

The rows below are the 25 sub-criteria of MPR-02 to MPR-07. Each row names the test that proves it, by the start of the test's title. Files 6 and 7 are not named by any row; all their tests must pass too.

| Row | Sub-criterion (its unit) | File | Test title starts with |
|---|---|---|---|
| 1 | MPR-02 criterion 1: fresh library seeded, second start changes nothing | `providers-seeding.test.ts` | "a fresh library gets the ollama provider" |
| 2 | MPR-02 criterion 2: an empty section is untouched at startup | `providers-seeding.test.ts` | "an existing providers section with an empty list" |
| 3 | MPR-02 criterion 3: a newer schemaVersion is refused | `providers-seeding.test.ts` | "a providers section at a newer schemaVersion" |
| 4 | MPR-02 criterion 4: two providers from one preset, distinct stable ids | `providers-create.test.ts` | "two providers created from one preset get distinct ids" |
| 5 | MPR-03 criterion 1: 0600 in 0700, loosened modes tightened with a warning | `providers-secrets-file.test.ts` | "a put creates secrets.yaml at mode 0600" and "a loosened secrets file is tightened on restart" |
| 6 | MPR-03 criterion 2: put and delete are atomic | `providers-secrets-file.test.ts` | "a partial temp file left by a crash" |
| 7 | MPR-03 criterion 3: hint is the last four characters | `providers-secrets-file.test.ts` | "hint returns the last four characters" |
| 8 | MPR-03 criterion 4: a logged Authorization header is redacted | `providers-log-redaction.test.ts` | "a logged request's Authorization header" |
| 9 | MPR-04 criterion 1: streamed text, one assembled tool call, finish | `providers-client-stream.test.ts` | "criterion 1: a streamed chat yields text deltas" |
| 10 | MPR-04 criterion 2: malformed tool call passed through | `providers-client-stream.test.ts` | "criterion 2: a malformed tool call" |
| 11 | MPR-04 criterion 3: 503 then 200 within retries; persistent 503; 401 at once | `providers-client-retry.test.ts` | "criterion 3: a 503 then a 200", "criterion 3: a persistent 503", "criterion 3: a 401 fails at once" |
| 12 | MPR-04 criterion 4: 429 with Retry-After waits | `providers-client-retry.test.ts` | "criterion 4: a 429 with Retry-After" |
| 13 | MPR-04 criterion 5: stalled response times out; slow stream completes | `providers-client-timeout-abort.test.ts` | "criterion 5: a stalled response", "criterion 5: a slow stream" |
| 14 | MPR-04 criterion 6: abort mid-stream ends with PROVIDER_ABORTED | `providers-client-timeout-abort.test.ts` | "criterion 6: abort mid-stream" |
| 15 | MPR-04 criterion 7: the key reaches the mock only in Authorization | `providers-client-auth.test.ts` | "criterion 7: the key reaches the mock only" |
| 16 | MPR-05 criterion 1: empty models resolve to the first listed, auto | `providers-resolution.test.ts` | "C1: an empty app-default model" |
| 17 | MPR-05 criterion 2: provider model beats auto; app default beats provider | `providers-resolution.test.ts` | "C2: a provider model wins over auto" |
| 18 | MPR-05 criterion 3: empty Ollama list gives NOT_CONFIGURED with the pull hint | `providers-resolution.test.ts` | "C3: an empty Ollama model list" |
| 19 | MPR-05 criterion 4: a chat with a project id target sends the resolved model | `providers-resolution.test.ts` | "C4: a chat whose target comes from resolving" |
| 20 | MPR-06 criterion 1: key stored at 0600 and never echoed | `providers-api.test.ts` | "C1: a key set through the API" |
| 21 | MPR-06 criterion 2: clear key removes the secret and the keyRef | `providers-api.test.ts` | "C2: clearing the key" |
| 22 | MPR-06 criterion 3: app-default delete is 409; then the secret is gone | `providers-api.test.ts` | "C3: deleting the app-default provider" |
| 23 | MPR-06 criterion 4: every GET leaves the library unchanged | `providers-api.test.ts` | "C4: every GET leaves the library unchanged" |
| 24 | MPR-07 criterion 1: reach, 401, unknown model and success results | `providers-connection-test.test.ts` | "C1: against the mock, an unreachable Ollama" |
| 25 | MPR-07 criterion 2: a draft's test-only key leaves the files unchanged | `providers-connection-test.test.ts` | "C2: a draft with a test-only key" |

Pass condition of T1:
- (a) vitest exits 0. In the JSON report `numFailedTests` is 0, and every test in the thirteen files has status `passed`. No test is `skipped`, `pending` or `todo`.
- (b) Each of the 25 rows has at least one test in the report, of its file, whose title starts with the text of the row, with status `passed`.
- (c) `git diff --stat 7e9469d -- <the thirteen files>` is empty on the branch. The criteria tests are not edited.

Criteria covered by T1: 25 sub-criteria, one test row each.

### 4.2 Criterion 2 (unit line 23): test T2, the model-path check on the host

Who runs it: the owner, on the Mac host, with Docker Desktop and Ollama installed (N1). Not the implementer (step 12). It runs on the build of `unit/MPR-08` (the code under test is the code on `main`, since this unit adds only a test file). The criterion-2 box is ticked only after the owner's recorded pass (N1).

What it proves: the seeded provider reaches Ollama on the host through the real compose stack, with no provider configured. The Agent loop's chat run ("summarize my outline") is AGL-08's and is not part of this check (N2).

This procedure is also the providers module's real-model check until AGL-25 exists (N3; `modules/providers.md` line 47).

Preconditions:
- Ollama on the host, started as in the unit's demo step 1: `OLLAMA_CONTEXT_LENGTH=64000 OLLAMA_HOST=0.0.0.0 ollama serve`, and `ollama pull <model>`. Record `<model>`.
- The image built from the checked commit: `docker build -t bbartolome/scriba:latest .` (D13).
- An empty install folder, and a library folder `~/Books` that does not exist yet.

Steps (`<P>` is the web port the installer reports; the default is 8080):
- S1. In the empty install folder, run the one-liner of `README.md` line 28: `docker run --rm -e SETUP=true bbartolome/scriba | bash`. Give the library folder `~/Books`, and keep the default port. Expected: the stack starts and the installer prints the web address. Record `<P>`.
- S2. Open the setup URL in `~/Books/.scriba/setup-url` in a browser and press Continue. Expected: the landing page (demo step 2). For curl checks, take the session cookie from the setup URL with `curl -c jar` and send it with `-b jar`.
- S3. Run `cat ~/Books/.scriba/settings.yaml`. Expected: `providers.list` holds an entry with `id: ollama` and `baseURL: http://host.docker.internal:11434/v1`, and no `keyRef` line; `appDefault` holds `providerId: ollama` and `model: ''` (MPR-02 criterion 1).
- S4. `curl -b jar -H 'Host: 127.0.0.1:<P>' http://127.0.0.1:<P>/api/providers`. Expected: the `ollama` entry has `keySet: false` and no `keyHint`.
- S5. `curl -b jar -H 'Host: 127.0.0.1:<P>' -H 'Origin: http://127.0.0.1:<P>' -H 'Content-Type: application/json' -d '{"providerId":"ollama"}' http://127.0.0.1:<P>/api/providers/test`. Expected: HTTP 200, `"ok":true`, `"stage":"chat"`, and `"modelCount"` at least 1 (demo step 4).
- S6. `curl -b jar -H 'Host: 127.0.0.1:<P>' http://127.0.0.1:<P>/api/providers/effective-model`. Expected: `choice.providerId` is `ollama`, `source` is `auto` (the seeded model is empty, so the list call at `providers.resolution.ts` line 68 supplies the first id, line 77), and `choice.model` equals the first id of `curl http://localhost:11434/v1/models` on the host, which is the provider's own order.
- S7. Stop the stack with `docker compose down` in the install folder.

Pass condition: S3 to S6 hold. No provider is created, edited or keyed in this check. The owner records every output. If S5 fails, the check fails: the owner records the stage and the error, and changes nothing in this check.

Note: the Mac leg of `host.docker.internal` was checked in the PLT-16 smoke run (`plans/PLT-16.md` line 213). The Linux leg is deferred under N3 (`plans/DECISIONS.md` line 967; `plans/PLT-16.md` line 216), so this check uses the Mac.

If the owner cannot run T2 at all, fallback B of N1 applies: the box stays unticked, and the reviser records criterion 2 and the cause in this section.

Criteria covered by T2: criterion 2, as read in N2 (the model path, S3 to S6).

### 4.3 Scope tests: new file `apps/api/test/providers-gate.test.ts`

Each test boots the composed app (`createTestApp` with the default modules, `COMPOSED_MODULES`, `app.module.ts` lines 18 to 24, which include `ProvidersModule` at line 21), on a temp library that it removes in `finally`. The session cookie comes from `sessionCookie`. The mock is started and closed inside the test.

| Test | Seam and what it asserts | Pass condition |
|---|---|---|
| G1: "every /api/providers route is on the composed app; each refuses a request without a session with 401 AUTH_REQUIRED, and each POST refuses a request with a session and no loopback Origin with 403 AUTH_ORIGIN_REJECTED" | Composed app over HTTP, `app.routes()`. (a) The list contains these twelve pairs (D3): GET and POST `/api/providers`; GET `/api/providers/presets`; GET and POST `/api/providers/app-default`; POST `/api/providers/:id/update`; POST `/api/providers/:id/delete`; GET `/api/providers/:id/models`; POST `/api/providers/key/set`; POST `/api/providers/key/clear`; GET `/api/providers/effective-model`; POST `/api/providers/test`. (b) For each pair, with `:id` replaced by `no-such-provider`, a request with Host `LOOPBACK_HOST` and no cookie gets 401 with `error.code` `AUTH_REQUIRED`. (c) For each POST pair, a request with the cookie and no Origin header gets 403 with `error.code` `AUTH_ORIGIN_REJECTED`. (d) Control: `GET /api/providers` with the cookie gets 200. | Every assertion holds. |
| G2: "after a key is set and used, no response, no error body, no settings.yaml byte and no stdout line holds it; the mock sees it only in Authorization" | Composed app over HTTP, the real client, the mock (`startMockOpenAI({scenariosDir})`), and captured stdout (`captureStdout`, started before the boot). KEY is `sk-test-abcdefgh1234WXYZ`. Scenario `secrecy-ok.json`: models 200 with `qwen2.5`, `gemma3`, `llama3.1`; chat `stream` with the delta `ok`. Scenario `secrecy-echo.json`: models 401 and chat 401, each with the body `{"error":{"message":"Incorrect API key provided: <KEY>"}}` (D5). Library: `ollama` keyless at the OLLAMA URL; `mock-keyed` keyless at `<mock>/scenario/secrecy-ok/v1`, model `llama3.1`; `mock-echo` keyless at `<mock>/scenario/secrecy-echo/v1`, model empty; appDefault `{mock-keyed, llama3.1}`. Boot with `env: {SCRIBA_LOG_LEVEL: 'debug'}` (D4). Steps: (a) POST key/set `{providerId: 'mock-keyed', key: KEY}` gives 200, `keySet` true, `keyHint` `WXYZ`. (b) GET list, app-default, presets, effective-model and `mock-keyed/models` each give 200. (c) GET `mock-echo/models` gives 502 with `error.code` `PROVIDER_UNAUTHORIZED`. (d) POST test with `{providerId: 'mock-keyed'}` gives 200, `ok` true, stage `chat`; with `{providerId: 'mock-echo'}` gives 200, `ok` false, stage `list`, `PROVIDER_UNAUTHORIZED`; with a draft `{kind: 'openai-compatible', baseURL: <mock-echo URL>, model: '', ...PROVIDER_DEFAULTS}` and `key: KEY` gives 200, `ok` false, stage `list`. (e) Refusals: POST key/set `{providerId: '', key: KEY}` gives 400; POST test with a draft whose baseURL is `not a url` and `key: KEY` gives 400 `PLATFORM_VALIDATION_FAILED`. (f) No reply body of (a) to (e) contains KEY. (g) `settings.yaml` contains no KEY and contains a `keyRef` line (control). (h) For every record of `secrecy-ok` and `secrecy-echo` (`recordsOf`): no header value other than `authorization`, and no JSON body, contains KEY; every `authorization` value is `Bearer <KEY>` or `Bearer scriba-keyless` (D10); at least one record has `Bearer <KEY>` (control). (i) `stripAnsi(stdout.text())` contains no KEY, and is not empty (control). | Every assertion holds. |
| G3: "a provider created through the API with a mock scenario URL in the harness's form passes the connection test" | Composed app over HTTP and the mock. Scenario `seam.json` in a temp folder: models 200 with `seam-model`; chat `stream` with the delta `ok`. Library: empty (`makeLibrary()`). Steps: (a) POST `/api/providers` with `{label: 'Seam', kind: 'openai-compatible', baseURL: <mock>/scenario/seam/v1, model: '', ...PROVIDER_DEFAULTS}` gives 201, `id` `seam`, `keySet` false. (b) POST `/api/providers/test` with `{providerId: 'seam'}` gives 200, `ok` true, stage `chat`, `modelCount` 1. (c) `recordsOf(mock, 'seam')` has one chat record whose body has `model` `seam-model` and `max_tokens` 1. | Every assertion holds. |

Controls: G1 (d), G2 (g), (h) and (i), and G3 (c) show that the cookie, the stored key, the mock's records and stdout were really present when the negative assertions ran. A control that fails is a stop (D11).

Criteria covered: none (scope items). Tests in the new file: three.

## 5. Downstream agreement

- **AGL-03 loop core (`blocked_by` MPR-08, line 7).** Needs the model call through the client with the project id target (unit line 22), and `AGENT_NO_PROVIDER` when no provider is configured (unit line 20; criterion line 34). MPR-08 changes neither. The client API is the one that MPR-04 and MPR-05 settled: `ModelResolver.resolve({projectId})`, then `streamChat(target, request)` (`plans/MPR-05.md` section 5, AGL-03 bullet).
- **AGL-03 and TRG-12: abort through resolve (not decided here).** `ResolutionInput` has only `projectId` (`providers.resolution.ts` lines 17 to 19), and `resolve` takes no signal (line 42). `ChatRequest` has `signal` (`client/types.ts` line 35). AGL-03 requires that Stop ends a run within one second (unit line 33), and TRG-12 says its call "accepts an abort signal" (unit line 30). The auto listing inside `resolve` can take about six minutes with the defaults (`plans/MPR-05.md` section 5, AGL-03 bullet). MPR-08 changes no code for this. Open point 5.
- **TRG-12 executor (`blocked_by` MPR-08, line 7).** Calls the model through the client with the active project's choice (unit line 26), and wraps provider failures as `TOOL_MODEL_ERROR` (unit line 30). Unchanged by this plan.
- **MPR-12 project override (`blocked_by` MPR-08, line 7).** Needs the client gate and the Project store. It adds the two project-model routes (`routes.ts` lines 13 to 15). G1 checks the twelve current pairs by presence (D3), so MPR-12's routes do not break it. MPR-12 owns the guard test for its own routes.
- **AGL-08 chat step and the e2e agent-run step (`e2e/specs/journey.e2e.ts` lines 72 and 73; `global-setup.ts` line 33).** The step configures its provider through the real API, at the mock URL. G3 tests the same route and URL form (D7). MPR-08 writes no e2e file.
- **AGL-25 manual eval script (`blocked_by` AGL-08, `units/AGL-25-manual-eval-script.md` line 7).** It is the module's named real-model check (`modules/providers.md` line 46). It lands after AGL-08, so it cannot be the check of criterion 2 here. Until it exists, T2 serves as the module's real-model check (N3; `modules/providers.md` line 47). AGL-25 remains the canonical check; nothing in AGL-25's unit changes.
- **SAU-08 (token guard, done) and PLT-13 (harness, done).** G1 relies on the guard of SAU-08 (`setup-auth.guard.ts` lines 58 to 73: 401 without a session, 403 for a mutation without the loopback Origin). G2 and G3 rely on the mock harness of PLT-12 and PLT-13 (`startMockOpenAI`).
- **MPR-09, MPR-10, MPR-11 (settings UI).** No contact: this unit changes no route, no contract and no UI.

## 6. Open points

1. **DECIDED (N1, Navigator, 2026-11-15, `plans/DECISIONS.md` lines 4011 to 4015): option (a).** The owner runs T2 before the box is ticked; the unit stays in the pipeline until T2 passes; (b) only if the owner cannot run T2; (c) rejected. Original text: **Criterion 2 cannot be run in this environment (Navigator).** The implementer cannot run T2: there is no Ollama on this machine, and the stack needs Docker Desktop and the owner's host. The options: (a) the owner runs section 4.2 on the Mac before the coordinator ticks the box, and the unit is complete when it passes; (b) the Navigator decides that the unit is complete without criterion 2, as for SAU-08 (`plans/DECISIONS.md` lines 3946 to 3956): the box stays unticked, the cause is recorded, and `phase:client` closes on criterion 1 and the gate tests; (c) a different local procedure: a stand-in OpenAI-compatible server on host port 11434 in place of Ollama. It would prove the compose path but not Ollama's answer, and the mock CLI has no port option (`e2e/fixtures/mock-openai/cli.mjs` lines 1 to 4), so it needs a change outside this unit. The planner recommends (a), with (b) as the fallback if the owner cannot run it before the merge.
2. **DECIDED (N2, Navigator, 2026-11-15, `plans/DECISIONS.md` lines 4017 to 4020): the model path only (T2 S3 to S6).** The chat run is AGL-08's; the reverse reading is a cycle. Original text: **Criterion 2 reads "the Agent loop's M1 run" (Navigator).** AGL-03 and AGL-08 are blocked by this unit (AGL-03 line 7), so that run cannot exist when MPR-08 merges. The unit's own parenthesis gives the model path to this phase, and the plan reads criterion 2 that way: T2 proves that the seeded provider reaches Ollama through the real API and the compose stack. The Navigator confirms this reading. If it does not, the phase cannot close without AGL-08, which waits for this unit.
3. **DECIDED (N3, Navigator, 2026-11-15, `plans/DECISIONS.md` lines 4022 to 4026): T2 meets the rule.** The transitional note is added as `modules/providers.md` line 47 in this revision (section 2); line 46 is unchanged. Original text: **The module's named real-model check (Navigator).** `modules/providers.md` line 46 gives the real-model check to the Agent loop's manual eval script (AGL-25), which is blocked by AGL-08 and so is not available at this unit. T2 is a manual procedure written in this plan. The Navigator confirms that T2 meets the module's rule, or names the other check.
4. **Abort path through resolve (informative; blocks nothing here).** Section 5, the AGL-03 and TRG-12 bullets. The decision belongs to the AGL-03 and TRG-12 planners, with the coordinator, and to the author of MPR-05's resolver. This plan needs no answer. The Navigator decides whether the question must be settled before those planners start.

Open point 4 stays informative and blocks nothing in this unit; the N1 entry of `plans/DECISIONS.md` (line 4015) records it for the AGL-03 and TRG-12 planners. No other point needs the Navigator. The choices in section 1b (D1 to D13) are the planner's and are recorded here.

## Review parts

The plan is small: one part. Each step of section 3 and each test of section 4 is in exactly one part.

### Part 1 — the gate (criteria 1 and 2, scope items)

- Steps: section 3, steps 0 to 13; the file row `apps/api/test/providers-gate.test.ts` of section 2. The `modules/providers.md` row of section 2 is the reviser's (N3) and is checked by this part's reviewer against the DECISIONS text: exactly one line added after line 46, line 46 unchanged.
- Tests: T1 (criterion 1, section 4.1, 25 rows over thirteen files); T2 (criterion 2, section 4.2, steps S1 to S7, pass on S3 to S6; an owner procedure run on the Mac host, not by the implementer, N1); G1, G2 and G3 (scope items, section 4.3).
- The reviewer of this part also checks that the implementer's diff changes only `apps/api/test/providers-gate.test.ts`, and that the criterion-2 box is not ticked without the owner's recorded T2 pass.

## 7. Facts checked (read at 7e9469d)

Each line is FACT, read with cat -n, sed, grep or git at 7e9469d. No test was run.

- git: `main` at 7e9469d; `git status --short` is empty at planning time; no `unit/*` branch exists; `git branch` lists `backup/PLT-16` and the remote-tracking `remotes/origin/main`, which this plan does not use.
- Plans: 63 files in `plans/`, all with `status: done` (grep of the front matter). No `draft` or `planned` plan exists, so no other unit touches the files of this plan. `plans/MPR-08.md` did not exist.
- Unit `units/MPR-08-client-gate.md` (30 lines, no change notes): line 7 (blocked_by), 9 (unblocks), 14 (merge closes phase:client), 16 to 19 (scope), 21 to 23 (criteria, unticked), 25 to 30 (demo).
- Inverse of `unblocks` (`units/README.md` rule): `units/AGL-03-loop-core.md` line 7, `units/TRG-12-executor.md` line 7 and `units/MPR-12-project-override-api.md` line 7 name MPR-08 in blocked_by. `units/MPR-02…07` line 9 each list MPR-08 in unblocks where they block it; `units/SAU-08-token-guard-gate.md` line 9 and `units/PLT-13-playwright-harness-e2e.md` line 9 do too.
- `units/README.md` line 91 (the phase row: MPR-02 … MPR-08, gate MPR-08), line 129 (HTTP rule), line 136 (testing rule).
- `modules/providers.md` line 19 (phase row), 33 (module shape and guard), 36 (secrets), 39 (methods), 42 to 46 (testing principles; line 46 real-model check).
- `packages/contracts/src/providers/routes.ts` lines 3 to 15 (route constants; `PROJECT_MODEL_ROUTE` line 13, `PROJECT_MODEL_CLEAR_ROUTE` lines 14 and 15).
- `apps/api/src/modules/providers/providers.controller.ts`: `@Controller()` line 43; route decorators at lines 50, 55, 63, 68, 73, 81, 90, 96, 101, 109, 117 and 125 (twelve handlers; the list of D3); no `@Public` in the file.
- `apps/api/src/app.module.ts` lines 18 to 24: `COMPOSED_MODULES` includes `ProvidersModule` (line 21).
- `apps/api/src/modules/platform/boot/env.ts` line 12: `LOG_LEVEL_NAMES` (`debug`, `info`, `warn`, `error`).
- `apps/api/src/modules/providers/providers.resolution.ts`: `ResolutionInput` lines 17 to 19 (`projectId` only); `resolve` lines 42 to 78. A non-empty app-default model gives source `app` (line 62); a non-empty provider model gives `app` (line 65); an empty model makes the list call (line 68); the empty-list error with the pull hint is at lines 69 to 76; the first listed id gives source `auto` (line 77).
- `apps/api/src/modules/providers/client/types.ts` line 35 (`signal?: AbortSignal` in `ChatRequest`, lines 31 to 39).
- `apps/api/src/modules/providers/client/openai-compatible-client.ts` line 27 (`KEYLESS_PLACEHOLDER = 'scriba-keyless'`).
- `apps/api/src/modules/providers/client/errors.ts` lines 19 to 30 (fixed messages; the comment at 19), lines 96 to 101 (401 and 403 map to PROVIDER_UNAUTHORIZED).
- `packages/contracts/src/providers/errors.ts` line 40 (`PROVIDER_UNAUTHORIZED: 502`); `packages/contracts/src/providers/defaults.ts` lines 4 to 10 (`PROVIDER_DEFAULTS`); `packages/contracts/src/providers/connection-test.ts` lines 30 to 36 (result).
- `packages/contracts/src/setup-auth/errors.ts` lines 4 to 6 (codes `AUTH_REQUIRED`, `AUTH_HOST_REJECTED`, `AUTH_ORIGIN_REJECTED`) and 16 to 18 (statuses 401, 403, 403).
- `apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 58 to 73 (no verified cookie: 401; a mutation without the exact Origin: 403), as read in `plans/MPR-07.md` section 7.
- `apps/api/test/invariant-sweep.ts` line 38 (`LOOPBACK_HOST`), line 39 (`LOOPBACK_ORIGIN`), line 73 (`FIXTURE_PATHS`, with the three providers entries for update, delete and models on `no-such-provider`).
- `apps/api/test/create-test-app.ts` line 65 (`createTestApp`), line 82 (`SCRIBA_LOG_LEVEL: 'error'` by default; `...options.env` after it), line 88 (`listen(0, '127.0.0.1')`).
- `apps/api/test/guard-request.ts` line 27 (`send`; sets `Origin` only when the option is given), line 80 (`sessionCookie`, which reads `.scriba/setup-url`).
- `apps/api/test/providers-client.kit.ts` line 16 (`startMockOpenAI` re-export), line 61 (`recordsOf`), line 72 (`resetScenario`).
- `apps/api/test/secrets.kit.ts` line 139 (`captureStdout`, a `vi.spyOn` of `process.stdout.write`), line 158 (`stripAnsi`).
- `apps/api/test/settings.kit.ts` line 60 (`makeLibrary`), line 69 (`settingsFilePath`).
- `apps/api/vitest.config.mts` line 7 (`include: ['test/**/*.test.ts']`).
- `apps/api/package.json` scripts: `test` is `npm run build && vitest run`; `build` is `tsc -p tsconfig.build.json && tsc --noEmit -p tsconfig.json`.
- The thirteen test files exist. Test titles checked by grep: `providers-seeding.test.ts` lines 16, 46, 77; `providers-create.test.ts` line 32; `providers-secrets-file.test.ts` lines 47, 72, 109, 155; `providers-log-redaction.test.ts` line 16; `providers-client-stream.test.ts` lines 64, 107, 158; `providers-client-retry.test.ts` lines 49, 65, 80, 96, 111; `providers-client-timeout-abort.test.ts` lines 54, 76, 94, 123, 143, 189; `providers-client-auth.test.ts` lines 73, 91, 118, 127; `providers-client-models.test.ts` lines 77 to 104; `providers-client-errors.test.ts` lines 44, 56, 68; `providers-resolution.test.ts` lines 156, 180, 216, 238; `providers-api.test.ts` lines 181, 272, 316, 377; `providers-connection-test.test.ts` lines 335, 411.
- `plans/MPR-07.md`: line 173 to 177 (its downstream bullet on MPR-08: demo step 4, the secrecy checks, the guard); line 176 (secrecy). Decisions D1, D3, D4, D5, D8 and D10 (lines 35 to 76 of the plan) are cited by number.
- `plans/MPR-06.md`: D16 (guard and sweep fixtures), C1 (secrecy), section 5 MPR-08 bullet (line 158).
- `plans/MPR-02.md` lines 131 to 135 (MPR-08 bullet). `plans/MPR-03.md` line 146 (MPR-08 row). `plans/MPR-05.md` section 5 (AGL-03 and TRG-12 bullets, the abort gap). `plans/PLT-13.md` lines 13 and 261 (the harness and the MPR-08 seam).
- `plans/DECISIONS.md`: line 967 (N3, Linux leg deferred), 1880 (keyHint threshold), 1887 (empty model check in streamChat), 1888 (SDK environment variables), 1902 (timeout 0), 1947 and 1948 (first listed model; pull hint), 1952 to 1954 (test route for C4), 2135 (MPR-07 review: secrecy checks left to MPR-08), 3946 to 3956 (SAU-08: unticked criteria precedent).
- `plans/PLT-16.md` line 213 (criterion 4a: `host.docker.internal` checked on the Mac), line 216 (criterion 4 unticked, Linux leg deferred), line 233 (MPR-08 depends on the Mac leg).
- `prompt.md` lines 84 to 94 (draft rules), line 168 (orchestrator step 8), lines 275 to 281 (criteria that cannot be tested).
- `e2e/specs/journey.e2e.ts` lines 72 and 73 (the agent-run step, owner AGL-08, pending). `e2e/harness/global-setup.ts` lines 33 and 34 (`SCRIBA_E2E_MOCK_URL`, mock check), line 83 (`spawn` with `stdio: 'inherit'`). `e2e/fixtures/mock-openai/cli.mjs` lines 1 to 4 (`startMockOpenAI()` with no options). `e2e/fixtures/mock-openai/scenarios/text-stream.json` line 6 (`"kind": "stream"`), `tool-call.json` (models step with `mock-model`; chat step is a tool call).
- `deploy/compose.yaml`: line 31 (`extra_hosts`), line 32 (`host.docker.internal:host-gateway`), line 33 (`ports`), line 34 (`127.0.0.1:${SCRIBA_PORT:-8080}:8080`), line 40 (`image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`), line 43 (`network_mode: service:tailscale`).
- `README.md` line 28 (the install one-liner `docker run --rm -e SETUP=true bbartolome/scriba | bash`).
- `.github/workflows/ci.yml`: the steps are Lint, Test, Build and E2E, in that order.
- `.prettierignore` lists `/plans/` and `/units/`, so this plan's prose is not checked by Prettier.
- `.nvmrc` holds `26`, as `plans/MPR-07.md` section 7 records.
- `units/AGL-03-loop-core.md` lines 20, 22, 33, 34 (AGENT_NO_PROVIDER, the model call, Stop within one second, the criteria). `units/TRG-12-executor.md` lines 26 and 30. `units/MPR-12-project-override-api.md` lines 18, 19 and 27.
- Revision 1 (read at 18b4f1b): `git diff --stat 7e9469d 18b4f1b` lists only `plans/DECISIONS.md`, `plans/MPR-08.md` and `plans/QUEUE.md`. `plans/DECISIONS.md` lines 4011 to 4026 (N1 to N3). `units/AGL-08-file-tools-chat-gate.md` line 7 (blocked_by includes AGL-03); `units/AGL-25-manual-eval-script.md` line 7 (`blocked_by: [AGL-08]`). `units/MPR-08-client-gate.md` lines 22 and 23 unchanged. `providers.controller.ts`: twelve `@Get`/`@Post` decorators, no `@Public`. `plans/MPR-08.md` is the only plan with `status: draft` or `planned`. `modules/providers.md` lines 47 to 58 were cited by `plans/PLT-16.md` line 233 (line 58) and `plans/DECISIONS.md` line 4014 (line 53).
- Machine: `uname` prints Linux on aarch64; `command -v docker` prints `/usr/bin/docker`; `command -v ollama` prints nothing; a probe of `127.0.0.1:11434/api/tags` with a 2 s timeout got no answer.

## 8. Assumed facts (not checked by running anything)

- ASSUMED: the thirteen test files pass on main at 7e9469d. Not run. Steps 2 and 4 check it.
- ASSUMED: vitest's JSON reporter writes Jest-style fields (`numFailedTests`, `testResults[].assertionResults[]` with `title` and `status`) and accepts `--outputFile`. Not checked; step 4 confirms the shape on the first run.
- ASSUMED: `createTestApp` with `SCRIBA_LOG_LEVEL: 'debug'` writes non-empty stdout during the boot, through `process.stdout.write`, which `captureStdout` spies on. The control in G2 (i) checks it when the test runs.
- ASSUMED: the guard runs before the body pipe, so a POST without a session gets 401 before the zod pipe. G1 (b) checks it.
- ASSUMED: the create body of G3 needs `kind`, `label` and every `PROVIDER_DEFAULTS` field (`plans/MPR-06.md` D10; `config.ts` lines 21 to 24 for the input shape). G3 (a) checks it.
- ASSUMED: a status reply's `body` can be a JSON object with a nested `error` (the shape of the shipped `tool-call.json`). G2 checks it when the test runs.
- ASSUMED: the Mac host runs Docker Desktop, and `host.docker.internal` resolves from the container with the `tailscale` network namespace (checked on the Mac in the PLT-16 smoke run; not re-checked here).
- ASSUMED: the `tailscale` service starts without a Tailscale login and publishes the app on `127.0.0.1:<P>`. Its Serve step waits for a login in a background subshell (the `command:` block of the service in `deploy/compose.yaml`), so it does not block the app. The owner confirms this in S1.
- ASSUMED: the one-liner of `README.md` line 28 uses a local image named `bbartolome/scriba:latest` without a pull (`docker run` pulls only when the image is missing, its default). The owner confirms this in S1 (D13).
- ASSUMED: Ollama on the Mac answers `/v1/models` with at least one model once `ollama pull <model>` has run.
- ASSUMED: the implementer's machine is this machine: the same OS, the same node and npm on PATH, and no Ollama.
