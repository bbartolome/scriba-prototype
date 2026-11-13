---
id: MPR-07
status: planned
---
# MPR-07 plan — Staged connection test with author-facing hints

Unit: MPR-07 (module Model providers, phase:client, M1; blocked by MPR-04 and MPR-06; unblocks MPR-08 and MPR-10; `units/MPR-07-connection-test.md` lines 7 and 9). Base: `main` at 8471f80. Every line number below was checked at f038154 with cat -n, sed, awk or grep; the lines added by the rejection 1 corrections were checked with sed -n on the working tree. Since f038154 the only changed file is `plans/DECISIONS.md`, and its changes are appended entries after line 2073 (checked with `git diff f038154 main`), so no cited line moved; `apps`, `packages`, `e2e`, `units` and `modules` are identical at both commits. This plan changes no file except itself, writes no code and commits nothing. The working tree has an uncommitted change to `plans/PLT-16.md` that belongs to another unit; this unit does not touch it.

Each statement is tagged FACT (checked, with file and line; listed in section 7) or ASSUMED (listed in section 8). Decisions are not facts; they are tagged D1 to D15 in section 1b.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contracts, the earlier plans or DECISIONS

- **Scope.** The route sits under `/api/providers/`, behind Setup & auth's guard, with the body through Platform's pipe and errors in the base shape. FACT: `modules/providers.md` line 33; `units/README.md` line 126; `providers.controller.ts` lines 36 to 38.
- **Method.** A command, so POST. No SSE event. FACT: `modules/providers.md` line 39; `packages/contracts/src/providers/routes.ts` line 2.
- **Route constant and owner.** `CONNECTION_TEST_ROUTE` is `/api/providers/test`. FACT: `routes.ts` line 11. MPR-06 leaves it to this unit (FACT: `plans/MPR-06.md` line 50) and does not register it (FACT: `plans/MPR-06.md` line 157).
- **Request.** Two exclusive strict forms: saved `{providerId, key?}` or draft `{draft, key?}`. FACT: `connection-test.ts` lines 19 to 28. The draft is `providerConfigInputSchema` (FACT: `config.ts` lines 37 to 39), which has no `id` and no `keyRef` (FACT: `config.ts` lines 21 to 24). Unit line 18.
- **Test-only key.** Used for the test, never stored. FACT: `connection-test.ts` line 17; unit line 18; `modules/providers.md` line 36.
- **Result.** `{ok, stage, latencyMs, modelCount?, error?}`; stages `reach`, `list`, `chat` in that order; error `{code, message, hint?}` with a provider error code. FACT: `connection-test.ts` lines 6, 11 to 15 and 30 to 36. Unit line 20.
- **Codes and statuses.** No new code and no new status; the statuses come from the table only. FACT: `errors.ts` lines 5 to 16 and 38 to 49; `plans/MPR-06.md` line 74 (D14).
- **BAD_RESPONSE hint.** The Ollama hint stays bound to PROVIDER_UNREACHABLE. The unit gains a generic BAD_RESPONSE hint and a stage mapping. FACT: `plans/DECISIONS.md` lines 1867 to 1872, restated at line 1879. The unit names no BAD_RESPONSE hint today (FACT: unit line 21).
- **Hints named by the unit.** Unreachable Ollama: "is Ollama running on the host, listening on all interfaces?", with `OLLAMA_HOST=0.0.0.0` on Linux; outside Docker, `http://localhost:11434/v1`. Unauthorized: key rejected or out of credit. Model not found: pick from the list. Empty Ollama list: `ollama pull <model>` on the host. FACT: unit line 21.
- **Ollama rule.** A provider is Ollama when its baseURL uses port 11434 or its id starts with `ollama`. FACT: `providers.resolution.ts` lines 114 to 120; `plans/DECISIONS.md` line 1948.
- **First listed model.** The first model listed is the provider's own order, the auto choice. FACT: `plans/DECISIONS.md` line 1947; `providers.resolution.ts` lines 67 and 77.
- **Empty model in the list stage.** `listModels` ignores the target's model; `streamChat` refuses an empty model. FACT: `plans/DECISIONS.md` line 1887; `openai-compatible-client.ts` lines 154 to 158 and 184 to 187.
- **Timeout 0.** A limit of 300 000 ms, not no limit. FACT: `plans/DECISIONS.md` lines 1902 to 1905 (supersedes line 1889); `openai-compatible-client.ts` lines 29 to 30 and 195 to 200.
- **Client errors.** One fixed message per code, with no upstream text, no key and no details. FACT: `client/errors.ts` lines 19 to 30 (comment at line 19), lines 32 to 34.
- **Keyless calls.** A provider with no key sends the placeholder key. FACT: `openai-compatible-client.ts` lines 26 to 27 and 202 to 204.
- **Secrets.** Keys live in the secrets file only. `SecretsStore.get` is for in-process use. FACT: `secrets-store.ts` lines 58 to 60; `modules/providers.md` line 36.
- **Testing.** External behaviour only, through the composed app, a temp library and Platform's mock OpenAI server. FACT: `units/README.md` line 133; `modules/providers.md` lines 43 to 44.

### 1b. Decisions this plan makes

- **D1 Stages and their calls.**
  - list: `listModels` with the effective key (D2). It is the first request of the test. An empty list passes with `modelCount` 0 (the list stage does not fail on an empty list; the chat stage does).
  - reach: no request of its own. The code of the list call decides it (the mapping of `plans/MPR-04.md` line 181). PROVIDER_UNREACHABLE or PROVIDER_TIMEOUT means reach failed. Any other failure code means list failed and reach passed, because the server answered (PROVIDER_UNAUTHORIZED, PROVIDER_BAD_RESPONSE, PROVIDER_RATE_LIMITED). A reply with status 408 also gives PROVIDER_TIMEOUT (`client/errors.ts` line 114), so it reads as reach failed; this follows MPR-04's mapping and no test covers it. PROVIDER_NOT_CONFIGURED is raised by `assertConfigured` before any request (`openai-compatible-client.ts` line 158), so it is reported at list with no reach request; this is accepted.
  - Reason: the criterion needs a 401 to fail at `list` (unit line 24). `listModels` maps a 401 to PROVIDER_UNAUTHORIZED (`client/errors.ts` lines 99 to 101), so the code already shows that reach passed. A probe would repeat the call and is not needed.
  - chat: `streamChat` consumed by `collectStream` (FACT: `client/collect.ts` lines 10 to 12), with one user message and `maxTokens` 1. The model is the saved or draft model. When that is empty, the first listed id is used (FACT: `plans/DECISIONS.md` line 1947). When it is empty and the list is empty, the test fails at chat with PROVIDER_NOT_CONFIGURED before any request. The server decides whether a named model exists: the chat stage is where an unknown model fails, so the client does not check the list for membership.
- **D2 Config and key.**
  - Saved form: `registry.find(providerId)` (FACT: `providers.registry.ts` lines 31 to 34; an unknown id throws NOT_FOUND through `indexOf`, lines 147 to 158). Key: the request's `key` when it is non-empty; otherwise `secrets.get(keyRef)` when the provider has a keyRef (FACT: `secrets-store.ts` lines 58 to 60); otherwise none.
  - Draft form: config is `{id: 'draft', ...draft}`. Key: the request's `key` when non-empty; otherwise none, because a draft has no keyRef.
  - An empty `key` string is no key (the same rule as the client: FACT `openai-compatible-client.ts` lines 188 to 191 and 204).
  - The service calls only `find` and `get`. It never calls `registry.create`, `update`, `delete` or `setKeyRef`, `secrets.put` or `secrets.delete`. Reads write nothing (FACT: `settings.service.ts` lines 58 to 62).
- **D3 Copies and limits.**
  - Each stage uses a copy of the config with `retries: 0`; chat also has `maxTokens: 1`. The stored config is never changed. FACT: the retry rule is `retry.ts` lines 46 to 53; `maxTokens` is read from the config at `openai-compatible-client.ts` line 245.
  - Reason: one attempt per stage gives the author the first failure at once, and the author presses the button again to retry.
  - The config's `timeout` is kept. A silent server holds one stage for up to that timeout (120 000 ms by default: FACT `defaults.ts` line 8). No separate test timeout is added; the waiting state is MPR-10's (section 5).
- **D4 Result.**
  - ok: `{ok: true, stage: 'chat', latencyMs, modelCount}`.
  - failure: `{ok: false, stage, latencyMs, modelCount?, error: {code, message, hint?}}`. `modelCount` is present only when the list stage passed, including when it is 0.
  - `message` is the client's fixed text (FACT: `ModuleError.message`, `module-error.ts` lines 2 to 17) or a fixed local text. No upstream text, no key.
  - `latencyMs`: the rounded elapsed time from `performance.now()` (imported from `node:perf_hooks`), from the start of the list call to the end of the last stage run. The contract has one field for it.
  - HTTP status: 200 for every test result, ok or not (the contract types a failure as `ok: false`, so a failed test is an answer, not a transport error). 404 PROVIDER_NOT_FOUND for an unknown saved id (from `find`). 400 PLATFORM_VALIDATION_FAILED for a body that matches neither form, including both forms at once and an invalid draft (FACT: the pipe at `zod-validation.pipe.ts` lines 5 to 10; the filter maps a ZodError at `platform-exception.filter.ts` lines 52 to 60).
- **D5 Hints (exact text).** A hint is chosen by stage, code and two facts: whether the provider is Ollama (`isOllamaProvider`, D13, D14) and `modelCount` (0 or above 0).

  | Hint | Stage | Code and condition | Text |
  |---|---|---|---|
  | H1 | reach | PROVIDER_UNREACHABLE, Ollama | "Is Ollama running on the host, and listening on all interfaces? On Linux, start it with OLLAMA_HOST=0.0.0.0. Outside Docker, try http://localhost:11434/v1 as the base URL." |
  | H2 | reach | PROVIDER_UNREACHABLE, not Ollama | "The server could not be reached. Check the base URL and that the server is running." |
  | H3 | any | PROVIDER_TIMEOUT | "The provider did not answer in time. Check the base URL and the timeout setting." |
  | H4 | list or chat | PROVIDER_UNAUTHORIZED | "The provider rejected the key. Check the key. If the key is right, the account may be out of credit." |
  | H5 | list | PROVIDER_NOT_CONFIGURED (keyRef with no stored key) | "No key is stored for this provider. Set one, or type a key for this test." |
  | H6 | list or chat | PROVIDER_BAD_RESPONSE | "The provider's answer was not usable. Check the base URL. A hosted account that is out of credit may get this answer too." |
  | H7 | list or chat | PROVIDER_RATE_LIMITED | "The provider refused the request: rate limited, or out of credit. Wait, or add credit." |
  | H8 | chat | PROVIDER_MODEL_NOT_FOUND, modelCount above 0 | "The provider does not know this model. Pick one from the list." |
  | H9 | chat | Ollama, modelCount 0 (MODEL_NOT_FOUND or NOT_CONFIGURED) | The Ollama preset's pull line, exactly: "Pull a model on the host with `ollama pull <model>`." (FACT: `defaults.ts` line 42; D13) |
  | H10 | chat | PROVIDER_MODEL_NOT_FOUND, not Ollama, modelCount 0 | "The provider lists no models. Check the model id." |
  | H11 | chat | PROVIDER_NOT_CONFIGURED, not Ollama | "Set a model id for this provider." |

  H6 is the only BAD_RESPONSE hint, for list and chat, so a chat 402 gets the credit sentence too. Codes not in the table get no hint. H1, H2, H9, H10 and H11 are chosen by `isOllamaProvider` on the provider's id and baseURL (for a draft, the id `draft` and its baseURL, so only the port rule; `providers.resolution.ts` lines 114 to 120; D14). A draft has no keyRef (`providerConfigInputSchema` omits it, `config.ts` lines 21 to 24), so H5 can never apply to a draft.
- **D6 Route and pipe.** `ProvidersController` gains `@Post(CONNECTION_TEST_ROUTE)` with `@HttpCode(200)` and `@Body(new ZodValidationPipe(connectionTestRequestSchema))`, returning the service's result. No `@Public()`. The path has no `:`, so the invariant sweep needs no fixture (FACT: the fixture rule at `invariant-sweep.ts` line 4; `FIXTURE_PATHS` is at lines 73 to 84, its providers entries at lines 75 to 83).
- **D7 Module wiring.** `ConnectionTestService` joins the `providers` list (FACT: `providers.module.ts` lines 25 to 39). The `exports` line (line 40) does not change. Only the controller uses the service.
- **D8 Mock scenarios.** The test writes seven scenario files into a temp directory (section 4) and starts a second mock on it with `startMockOpenAI({scenariosDir})` (FACT: `server.mjs` lines 17 to 19; `server.d.mts` lines 1 to 3). The bundled scenarios cannot serve the criteria: `models-non-empty.json` has no chat step and `unknown-model.json` has no models step (FACT: both files). A request with no matching step gets a 500 (FACT: `server.mjs` line 306). The fixture folder `e2e/fixtures/mock-openai/` does not change.
- **D9 Unreachable server.** A mock is started on the temp directory and closed, and its base URL is then used. This is the technique of FACT `providers-client-errors.test.ts` lines 68 to 77.
- **D10 Test file.** One new file. The helpers of `providers-api.test.ts` (keyless helper lines 68 to 77; `get` lines 120 to 122; `post` lines 125 to 139; `withApp` lines 143 to 159) are copied, not imported: test files export nothing. A shared kit is not justified for two files.
- **D11 Sweep cost.** The new route adds a GET template and a HEAD template to each `sweepGetHead` (FACT: `invariant-sweep.ts` lines 406 to 409, which plan a GET and a HEAD per template). Each planned request waits the 200 ms window (FACT: `EVENT_WAIT_MS` at line 102, used at line 464). Over the three sweeps (FACT: `invariant-get-head.test.ts` lines 77, 101 and 137) that is 1.2 s. The stop rule is in section 3, step 8.
- **D12 Client.** No change. The service calls `listModels` and `streamChat` (through `collectStream`) as they stand, and no file under `client/` changes. The reach stage is read from the code of the list call (D1). The client is the only code that holds the SDK, the timers and the header filter (FACT: `openai-compatible-client.ts` lines 33 to 45, 202 to 235), so the module adds no SDK call of its own.
- **D13 Pull line.** `ollamaPullHint` (FACT: `providers.resolution.ts` line 123, not exported today) is exported with the keyword `export`. Its text is the Ollama preset's pull line (FACT: `defaults.ts` line 42), so H9 and the resolver's empty-list hint share one source.
- **D14 Draft Ollama rule.** A draft's id is `draft`, so only the port rule of `isOllamaProvider` applies to a draft (FACT: `providers.resolution.ts` lines 114 to 120). The id rule covers saved providers only.
- **D15 Non-goals.** No change to the contract (every shape and the route constant are published: FACT `connection-test.ts`, `routes.ts` line 11). No retry in the test (D3). No probe request (D1). No per-stage timings (one `latencyMs`). No client-side model membership check (D1). No UI text (MPR-10). No context-length hint (MPR-10 unit line 16).

## 2. Files to create or change

Only the paths below change. `package.json` and `package-lock.json` do not change (no dependency).

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/providers/providers.resolution.ts` | edit | `ollamaPullHint` (line 123) gets the `export` keyword (D13). No other change. |
| `apps/api/src/modules/providers/providers.connection-test.ts` | new | `ConnectionTestService` (`@Injectable()`), constructor `(registry: ProvidersRegistry, secrets: SecretsStore)`, method `run(request: ConnectionTestRequest): Promise<ConnectionTestResult>`. Holds D1 to D5. Imports only the platform entry file, the contracts, the module's own files and `node:perf_hooks`. |
| `apps/api/src/modules/providers/providers.controller.ts` | edit | constructor gains `private readonly connectionTest: ConnectionTestService`; new handler `@Post(CONNECTION_TEST_ROUTE) @HttpCode(200) test(@Body(new ZodValidationPipe(connectionTestRequestSchema)) body)` returning `this.connectionTest.run(body)` (D6). Imports gain `CONNECTION_TEST_ROUTE`, `connectionTestRequestSchema` and the `ConnectionTestRequest` type. |
| `apps/api/src/modules/providers/providers.module.ts` | edit | adds `ConnectionTestService` to `providers` (D7). `exports` and the re-exports (lines 11 to 17) do not change. |
| `apps/api/test/providers-connection-test.test.ts` | new | criteria C1 and C2 and extra tests E1 to E8 (section 4). |

Must not change:
- `packages/contracts/**`: the request, result, error and route shapes are published (FACT: `connection-test.ts`; `routes.ts` line 11).
- `apps/api/src/modules/providers/providers.registry.ts`, `providers.service.ts`, `providers.section.ts`, `providers.seeding.ts`: the calls used are `find` and `get` (FACT: `providers.registry.ts` lines 26 to 34).
- `apps/api/src/modules/providers/secrets/**`: `SecretsStore.get` is enough (FACT: `secrets-store.ts` lines 58 to 60).
- `apps/api/src/modules/providers/client/**`: no file changes (D12). The connection test calls `listModels`, `streamChat` and `collectStream` as they stand.
- `apps/api/src/modules/platform/**`, `apps/api/src/modules/setup-auth/**`, `apps/api/src/app.module.ts`.
- `apps/api/test/invariant-sweep.ts` and the invariant test files: the new route has no `:`, so the sweeps pick it up with no entry (D6, D11).
- Every existing test file and kit: `providers-api.test.ts`, `providers-client*.test.ts`, `providers-client.kit.ts`, `providers-resolution.*`, `providers-create.test.ts`, `providers-seeding.test.ts`, `providers-secrets-file.test.ts`, `providers-log-redaction.test.ts`, `secrets.kit.ts`, `settings.kit.ts`, `create-test-app.ts`, `guard-request.ts`.
- `e2e/**`: the mock fixtures stay as they are; the test writes its own scenario files (D8).
- `apps/web/**` (MPR-09 and MPR-10 are not started), `units/**`, `modules/**`, `plans/DECISIONS.md` (the coordinator appends the entries), and every other file in `plans/`, including the uncommitted `plans/PLT-16.md`.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/MPR-07`, created from `main`. Record `node -v` and `npm -v` beside each result. Do not push. Do not run docker. Do not add a remote. Stage only the paths of section 2.

0. **Base.** `git -C /Users/bbartolome/workspace/scriba-prototype rev-parse --short main` prints 8471f80, or a later commit. `git diff --stat f038154 -- apps packages e2e units modules` is empty, and `git diff f038154 -- plans/DECISIONS.md` changes only lines after 2073. If not, stop and report: the line numbers of this plan would be stale. `git status --short` shows ` M plans/PLT-16.md`; leave it unstaged.
1. **Branch.** `git switch -c unit/MPR-07` from `main`.
2. **Baseline.** `npm test -w @bbartolome/scriba-api` exits 0. Save the totals and the duration of `apps/api/test/invariant-get-head.test.ts` (the base for stop rule 2). If the baseline fails, stop and report.
3. **Red first.** Write `apps/api/test/providers-connection-test.test.ts` (section 4; ten tests). Run `npx vitest run test/providers-connection-test.test.ts` in `apps/api`. Expected: ten failures, each at the first request (404 for the missing route) or its first assertion, with no import or type error. Save the output.
4. **Client.** No change (D12). The service uses `listModels` and `streamChat` as they stand.
5. **Resolution.** Edit `providers.resolution.ts`: export `ollamaPullHint` (D13).
6. **Service.** Write `providers.connection-test.ts` (D1 to D5, D14).
7. **Controller and module.** Edit `providers.controller.ts` (D6) and `providers.module.ts` (D7).
8. **Green.** Run `npx vitest run test/providers-connection-test.test.ts` (expected: ten pass) and `npx vitest run test/invariant-` (expected: every file passes). Record the duration of `invariant-get-head.test.ts`.
   - Stop rule 1: if C1(b) shows reach failing on the 401, or any test finds the test-only key in a response body (error bodies included), stdout line, settings byte or secrets byte, or finds the stored key in a response body or stdout line (E1 checks this), stop and report.
   - Stop rule 2: if the duration of `invariant-get-head.test.ts` exceeds its step 2 baseline by more than 2.4 s (twice the 1.2 s allowance of D11), stop and report.
9. **Full API tests.** `npm test -w @bbartolome/scriba-api` (its script builds first). Expected: exit 0. Save the totals.
10. **Format.** `npx prettier --write` on the new and changed paths of section 2. Repeat step 9 if any file changed.
11. **Lint.** `npm run lint` at the root. Expected: exit 0 (the MPR-06 run recorded the same command: `plans/DECISIONS.md` line 2072). The boundary rule must report nothing for the providers files, which import only the platform entry file, the contracts and their own files.
12. **Paths.** `git status --short` shows the section 2 paths and ` M plans/PLT-16.md`, and nothing else.
13. **Commits.** Two commits on `unit/MPR-07`, not squashed. Commit 1 holds the code: `providers.resolution.ts`, `providers.connection-test.ts`, `providers.controller.ts`, `providers.module.ts`; message `feat(MPR-07): add the staged connection test`. Commit 2 holds `apps/api/test/providers-connection-test.test.ts`; message `test(MPR-07): cover the connection test stages, hints, drafts and the key`. No push.
14. **Fresh clone.** `git clone --branch unit/MPR-07 /Users/bbartolome/workspace/scriba-prototype /tmp/mpr07-fresh` into an empty target. In it, `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
15. **Record.** Store the Node and npm versions, each command's output and the invariant duration. A criterion is marked passed only when its row in section 4 has its pass condition met.

## 4. Acceptance criteria and tests

All ten tests are in `apps/api/test/providers-connection-test.test.ts`. Each boots `createTestApp({libraryDir})` with the default modules (D10) against a library from `makeLibrary` (FACT: `settings.kit.ts` line 60), and gets its cookie from `sessionCookie` (FACT: `guard-request.ts` line 80). Requests use the loopback host; POSTs also use the loopback origin (FACT: `invariant-sweep.ts` lines 38 and 39). The mock is started in `beforeAll` and closed in `afterAll`; `resetScenario` runs in `beforeEach` for each scenario the file uses (FACT: `providers-client.kit.ts` line 72). The test removes its library and its temp directory in `finally`.

Setup shared by the tests:
- Constants: `KEY = 'sk-test-abcdefgh1234WXYZ'` (as `providers-api.test.ts` line 39) and `KEY_TEST = 'sk-test-testonly5678QRST'` (the test-only key; hint `QRST`).
- Mock `mock` = `startMockOpenAI()` (bundled scenarios). FACT: `providers-client.kit.ts` line 16 re-exports it.
- Mock `listed` = `startMockOpenAI({scenariosDir: tempDir})`, where `tempDir` is created by `mkdtempSync` and holds seven files (each `{steps: [...]}`, FACT: `server.mjs` lines 53 to 55 read every `.json` file):
  - `listed-chat-ok.json`: models 200 with ids `qwen2.5`, `gemma3`, `llama3.1` in that order; chat 200 as a stream of `ok`.
  - `listed-unknown-model.json`: the same models step; chat 404 with the body of `unknown-model.json` (code `model_not_found`).
  - `empty-unknown-model.json`: models 200 with `data: []`; chat 404 with code `model_not_found`.
  - `models-html.json`: models 200 with `content-type: text/html` and the HTML body of `html-200.json` (FACT: `html-200.json` lines 5 to 9; `server.mjs` lines 347 to 350 let the reply's headers override the JSON type).
  - `listed-chat-402.json`: models 200 with the same ids as `listed-chat-ok`; chat 402 with a JSON error body.
  - `listed-chat-429.json`: the same models step; chat 429 with a JSON error body and no attempt match, so every chat request gets it.
  - `listed-models-delayed.json`: models 200 with the same ids, on a step with `delayMs` 2000 (`server.mjs` lines 310 to 311); no chat step.
- A closed base URL (D9): start a mock on `tempDir`, close it, and use its `baseUrl` plus `/scenario/<name>/v1`.
- Provider entries take the fields of `PROVIDER_DEFAULTS` (FACT: `defaults.ts` lines 4 to 10) and the `kind` field.

| Criterion (unit line) | Test name | Seam and what it asserts | Pass condition |
|---|---|---|---|
| 1 (line 24): against the mock scenarios, unreachable fails at `reach` with the Ollama hint; a 401 fails at `list` with the key hint; an unknown model fails at `chat`; success returns `ok`, `latencyMs` and `modelCount` | `C1: against the mock, an unreachable Ollama fails at reach with the Ollama hint, a 401 fails at list with the key hint, an unknown model fails at chat, and a listed model succeeds with ok, latencyMs and modelCount` | Settings: keyless `ollama` at the closed URL; keyless `mock-401` at `mock` scenario `models-failing`; keyless `mock-listed-missing` (model `missing-model`) at `listed-unknown-model`; keyless `mock-listed` (model empty) at `listed-chat-ok`. Each `POST /api/providers/test` with `{providerId}`. (a) `ollama`: 200, `stage` `reach`, `error.code` `PROVIDER_UNREACHABLE`, hint equal to H1. (b) `mock-401`: 200, `stage` `list`, `error.code` `PROVIDER_UNAUTHORIZED`, hint equal to H4, no `modelCount`; `recordsOf(mock, 'models-failing')` holds no chat record. (c) `mock-listed-missing`: 200, `stage` `chat`, `error.code` `PROVIDER_MODEL_NOT_FOUND`, `modelCount` 3, hint equal to H8. (d) `mock-listed`: 200, `ok` true, `stage` `chat`, `modelCount` 3, `latencyMs` an integer of 0 or more; the chat record in `recordsOf(listed, 'listed-chat-ok')` has `body.model` `qwen2.5` (the first listed id) and `body.max_tokens` 1. Every body parses with `connectionTestResultSchema` (FACT `connection-test.ts` lines 30 to 36). | Every assertion of (a) to (d) holds |
| 2 (line 25): a draft config with a test-only key leaves `settings.yaml` and the secrets file unchanged | `C2: a draft with a test-only key is tested with that key, and settings.yaml and secrets.yaml keep their bytes` | Default library (seeded, with `ollama`). Read the bytes of `settings.yaml` and `secrets.yaml` after boot. `POST /api/providers/test` with `{draft: {kind, baseURL: <listed>/scenario/listed-chat-ok/v1, model: '', ...PROVIDER_DEFAULTS}, key: KEY_TEST}` gives 200 with `ok` true. Then: both files have the same bytes as before; `GET /api/providers` lists the same providers as before; the one `models` record of `listed-chat-ok` (the list call's request, the only `models` request the test makes) carries `authorization` equal to `Bearer ` plus `KEY_TEST`, and the chat record is the second request and is not asserted; the response body and a `captureStdout` capture do not contain `KEY_TEST` | Every assertion holds |

Extra tests (decisions with no criterion of their own):

| Decision | Test name | Asserts |
|---|---|---|
| D2 | `E1: a test-only key for a saved provider replaces its stored key for that test only` | Provider `mock-keyed` at `listed-chat-ok`, given `KEY` through `POST /api/providers/key/set`. Test with `{providerId: 'mock-keyed', key: KEY_TEST}`: the `models` record that this call writes (the last one in `recordsOf(listed, 'listed-chat-ok')` after it) carries `Bearer KEY_TEST`. Test with `{providerId: 'mock-keyed'}`: the `models` record that the second call writes (the last one after it) carries `Bearer KEY`. Each call makes one `models` request and only that record is asserted; the chat request of each call is not asserted. Both test calls leave the settings and secrets bytes unchanged, and the secrets file still holds `KEY` under the keyRef; the response bodies of the two calls and a `captureStdout` capture of them do not contain `KEY` |
| D5 (H2), D1 | `E2: an unreachable provider that is not Ollama gets the generic reach hint and no Ollama text` | Provider `mock-down` (id not `ollama`, baseURL at the closed URL): 200, `stage` `reach`, `error.code` `PROVIDER_UNREACHABLE`, hint equal to H2; the hint does not contain `Ollama` |
| D5 (H9, H10, H11), D1 | `E3: an empty list gives the pull hint for Ollama at chat, and no pull hint for a provider that is not Ollama` | `ollama-empty` (model `missing-model`) at `empty-unknown-model`: `stage` `chat`, `error.code` `PROVIDER_MODEL_NOT_FOUND`, `modelCount` 0, hint equal to H9. `ollama-blank` with model empty (a second provider; its id starts with `ollama` and is not `ollama-empty`, because `find` returns the first provider with an id, `providers.registry.ts` lines 147 to 158, so a second `ollama-empty` would be unreachable): `stage` `chat`, `error.code` `PROVIDER_NOT_CONFIGURED`, `modelCount` 0, hint equal to H9. This call adds no chat record to `empty-unknown-model`: the number of chat records there is the same before and after the call (`ollama-empty` has already written one in this test, `server.mjs` line 302; records reset only in `beforeEach`). `plain-empty` (model `missing-model`) at `empty-unknown-model`: hint equal to H10, which does not contain `ollama`. `plain-blank` (model empty; a separate id that does not start with `ollama`, for the same `find` reason): `stage` `chat`, `error.code` `PROVIDER_NOT_CONFIGURED`, `modelCount` 0, hint equal to H11, and this call adds no chat record, by the same count |
| D4 | `E4: bodies that fail the schema or name no provider are refused, and no mock is reached` | (i) a draft with `baseURL: 'not a url'` and `key: KEY_TEST` gives 400 `PLATFORM_VALIDATION_FAILED`; the body does not contain `KEY_TEST`. (ii) `{providerId: 'ghost'}` gives 404 `PROVIDER_NOT_FOUND`. (iii) `{providerId: 'ollama', draft: {...}}` gives 400. (iv) `{count: 1, intervalMs: 0}` (the sweep's body, FACT `invariant-sweep.ts` line 44) gives 400. After the four requests, none of the seven `listed` scenarios (`listed-chat-ok`, `listed-unknown-model`, `empty-unknown-model`, `models-html`, `listed-chat-402`, `listed-chat-429`, `listed-models-delayed`) has a record |
| D5 (H6), D1 | `E5: a 200 reply that is not a model list fails at list with the bad-response hint` | Provider `mock-html` at `models-html`: 200, `stage` `list`, `error.code` `PROVIDER_BAD_RESPONSE`, hint equal to H6, no `modelCount` |
| D5 (H6), D1, D3 | `E6: a chat 402 fails at chat with BAD_RESPONSE and the credit hint` | Provider `mock-chat-402` (keyless, model empty) at `listed-chat-402`: 200, `ok` false, `stage` `chat`, `modelCount` 3, `error.code` `PROVIDER_BAD_RESPONSE`, hint equal to H6 (which contains "out of credit"); `recordsOf(listed, 'listed-chat-402')` holds one chat record (retries 0) |
| D5 (H7), D1, D3 | `E7: a chat 429 with retries 0 fails at chat with RATE_LIMITED and the rate-limit hint` | Provider `mock-chat-429` (keyless, model empty) at `listed-chat-429`: 200, `stage` `chat`, `modelCount` 3, `error.code` `PROVIDER_RATE_LIMITED`, hint equal to H7; `recordsOf(listed, 'listed-chat-429')` holds one chat record, so there is no second attempt |
| D5 (H3), D1, D3 | `E8: a models step delayed past a 300 ms timeout fails at reach with TIMEOUT and the timeout hint` | Provider `mock-slow` (keyless, model empty, `timeout` 300) at `listed-models-delayed`: 200, `ok` false, `stage` `reach`, `error.code` `PROVIDER_TIMEOUT`, hint equal to H3, no `modelCount`; `recordsOf(listed, 'listed-models-delayed')` holds one `models` record and no chat record |

Criteria covered: 2 of 2 (unit lines 24 and 25). Extra tests: 8 (E1 to E8). Total new tests: 10.

H5 is untested. The unit names no such hint (unit line 21), and a test would need a saved provider with a keyRef and no stored secret, which none of the ten tests sets up. It is the only hint in D5 with no test.

Test seam: external behaviour only, as `units/README.md` line 133 requires: HTTP responses, the mock's records (headers and bodies, FACT `server.mjs` lines 292 to 301), files on disk and captured stdout. The tests do not call the service, the client or the SDK directly.

## 5. Downstream agreement

- **MPR-08 (client gate, `units/MPR-08-client-gate.md`; blocked by MPR-07, line 7).**
  - Demo step 4 (unit line 29: connection test for `ollama` returns `ok: true` with a model count above 0) holds. The seeded `ollama` provider has model `''` (FACT: `providers.seeding.ts` line 67), so the chat stage uses the first listed model (D1).
  - Criterion line 22 reads "Seeding, streaming/tool-call assembly, malformed pass-through, retry/401, timeout/abort, key storage and `auto` resolution criteria (MPR-02…MPR-07) pass on `main`." C1 and C2 of this unit join that set. E1 to E8 have no criterion of their own (line 152).
  - Secrecy (line 18): C2 checks that no response body or stdout line carries the test-only key; E1 checks the key only in the mock's `models` records, and that the stored key is in no response body or stdout line. The mock sees the key in `Authorization` only.
  - Guard (line 17): the route is on the composed app, so the invariant sweeps reach it (D6, D11).
- **MPR-10 (connection-test UI, `units/MPR-10-*.md`; blocked by MPR-07, line 7).**
  - The result is the contract's type (FACT: `connection-test.ts` lines 30 to 36). When `ok` is false, the passed stages are the stages before `stage` in the order reach, list, chat.
  - The server's H9 text is the Ollama preset's pull line (D13), so the UI's pull hint (MPR-10 line 17) and the server's hint match. An empty list shows as `modelCount` 0 on a chat failure (D4).
  - The context-length hint (MPR-10 line 16) is UI-only and is not in this plan.
  - The failing stage and hint for unreachable, unauthorized and unknown-model results (MPR-10 line 20) come from H1 or H2, H4 and H8, or H9 or H10 when the list is empty.
  - MPR-10's waiting state for a silent server (D3) is the UI's concern.
- **MPR-06 (`plans/MPR-06.md`).** The eleven routes and their statuses (MPR-06 D2, line 34) are unchanged. This unit adds the twelfth route, which MPR-06 names as MPR-07's (line 50). MPR-06's tests are unchanged.
- **MPR-04 (client).** No change. `plans/MPR-04.md` line 181 records the stage mapping and "No change to MPR-04", and open point 4 (line 203) is closed as option a. The client's functions and tests of MPR-04 are unchanged, and this unit adds no file under `client/`.
- **MPR-05 (resolution).** `ollamaPullHint` gains an export (D13); this is the only change to MPR-05's file, and it is recorded here. The resolver's behaviour and tests are unchanged.

## 6. Open points

None. The choices the unit leaves open are decided in section 1b (D1 to D15).

## 7. Facts checked

Checked at f038154 with cat -n, sed, awk and grep. Each line is FACT.

- FACT: `units/MPR-07-connection-test.md` line 7 (blocked_by MPR-04, MPR-06), line 9 (unblocks MPR-08, MPR-10), line 15 (why), line 18 (request forms; test-only key), line 19 (stages), line 20 (result), line 21 (hints; no BAD_RESPONSE hint), lines 24 and 25 (criteria).
- FACT: `units/MPR-08-client-gate.md` line 7 (blocked_by MPR-07), line 17 (guard scope), line 18 (secrecy suite), line 22 (criterion on main), line 29 (demo step 4).
- FACT: `units/MPR-10-*.md` line 7 (blocked_by MPR-07), line 15 (test button, staged result), line 16 (context-length hint), line 17 (pull hint), lines 20 and 21 (criteria).
- FACT: `modules/providers.md` line 33 (module shape, guard), line 36 (secrets), line 39 (methods; no SSE), lines 43 and 44 (testing principles).
- FACT: `units/README.md` line 126 (HTTP), line 133 (testing).
- FACT: `plans/MPR-06.md` line 50 (CONNECTION_TEST_ROUTE is MPR-07's), line 74 (D14: no new codes or statuses), line 157 (section 5, MPR-07 bullet).
- FACT: `plans/MPR-04.md` line 181 (the stage mapping; "No change to MPR-04") and line 203 (open point 4, closed as option a).
- FACT: `apps/api/src/modules/providers/client/openai-compatible-client.ts` line 158 (`listModels` calls `assertConfigured(target, false)` before its request); `client/errors.ts` line 114 (status 408 gives PROVIDER_TIMEOUT).
- FACT: `plans/DECISIONS.md` lines 1867 to 1872 (Navigator decision 2 and its consequence for MPR-07), 1879 (restated), 1880 (keyHint threshold), 1887 (empty-model check applies to streamChat; the MPR-07 list stage for a draft depends on listModels ignoring the model), 1889 and 1902 to 1905 (timeout 0 means 300 000 ms), 1947 (first model listed is the provider's order), 1948 (pull hint applies to Ollama, by the MPR-10 rule), 2070 to 2074 (MPR-06 code approved; lint and fresh clone passed).
- FACT: `packages/contracts/src/providers/connection-test.ts` line 6 (stages), line 8 (`connectionTestStageSchema`), lines 10 to 15 (the error comment and schema: code, message, optional hint), lines 17 and 18 (test-only key; strict objects), lines 19 to 28 (request union), lines 30 to 36 (result), lines 38 to 41 (types).
- FACT: `packages/contracts/src/providers/routes.ts` line 2 (commands are POST), line 11 (`CONNECTION_TEST_ROUTE`).
- FACT: `packages/contracts/src/providers/errors.ts` lines 5 to 16 (codes), 38 to 49 (statuses; line 40 UNAUTHORIZED 502, 42 TIMEOUT 504, 43 RATE_LIMITED 503, 44 BAD_RESPONSE 502, 46 NOT_CONFIGURED 409, 48 NOT_FOUND 404).
- FACT: `packages/contracts/src/providers/config.ts` lines 7 to 18 (stored config; keyRef at line 17), lines 21 to 24 (input has no id or keyRef), lines 37 to 39 (`providerConfigInputSchema`, with `kind`).
- FACT: `packages/contracts/src/providers/defaults.ts` lines 4 to 10 (defaults: timeout 120000 at line 8, retries 2 at line 9), line 42 (the Ollama preset's pull line).
- FACT: `packages/contracts/src/providers/examples.ts` lines 129 to 133 (connection test by id and by draft), 134 to 139 (ok example with modelCount 3), 140 to 149 (unreachable example with a hint).
- FACT: `apps/api/src/modules/providers/client/openai-compatible-client.ts` line 1 (`import OpenAI from 'openai'`), lines 3 to 9 (imports from `./errors`), lines 26 to 27 (`KEYLESS_PLACEHOLDER`), lines 29 to 30 (`DEFAULT_ZERO_TIMEOUT_MS` 300 000), lines 33 to 45 (SDK header set), lines 49 to 102 (`AttemptScope`; `signal` getter at 69 to 71, `arm` at 73, `disarm` at 81, `state` at 88, `close` at 97), lines 116 to 151 (`streamChat`), lines 154 to 158 (`listModels` signature and its use of the target without the model), lines 159 to 182 (`listModels` body), lines 184 to 191 (`assertConfigured`: the model check at 185 to 187, the keyRef check at 189 to 191, the empty-key comment at line 188), lines 195 to 200 (`limitFor`), lines 202 to 218 (`clientFor`: key at 204, `maxRetries: 0` at 215), lines 222 to 235 (`ownHeadersFetch`), lines 237 to 252 (`chatBody`: model at 242, max_tokens from the config at 245), lines 323 to 350 (`listOnce`), lines 354 to 374 (`modelIds`).
- FACT: `apps/api/src/modules/providers/client/index.ts` lines 1 to 5 (named exports: `KEYLESS_PLACEHOLDER`, `listModels`, `streamChat`), line 6 (`collectStream`), line 7 (types).
- FACT: `apps/api/src/modules/providers/client/errors.ts` lines 1 to 5 (imports from `openai`), lines 19 to 30 (`MESSAGES`; the comment at line 19 says no upstream text, no key), lines 32 to 34 (`providerError`), line 36 (`Endpoint`), lines 39 to 43 (`Failure`), lines 46 to 50 (`AttemptState`), lines 96 to 120 (`statusFailure`: 401 and 403 at 99 to 101; 404 at 102 to 106; 429 at 110 to 112; 409 and 5xx at 116 to 118; other statuses at 119), lines 124 to 151 (`classifyFailure`: caller abort 125 to 127, timer 128 to 130, no error 131 to 133, timeouts 136 to 140, connection errors 141 to 146, status errors 147 to 149).
- FACT: `apps/api/src/modules/providers/client/collect.ts` lines 10 to 12 (`collectStream` signature).
- FACT: `apps/api/src/modules/providers/client/types.ts` lines 25 to 29 (`ProviderTarget`), lines 31 to 39 (`ChatRequest`; no max-tokens field, so the config supplies it).
- FACT: `apps/api/src/modules/providers/client/retry.ts` lines 46 to 53 (`mayRetry`: only before a chunk, and only while the attempt is at most `retries`).
- FACT: `apps/api/src/modules/providers/providers.resolution.ts` lines 42 to 78 (`resolve`; the provider's own model at 64 to 66; the empty-model `listModels` call at 68; the empty-list error with the pull hint in details at 69 to 76; the auto choice at 77), lines 81 to 95 (`modelList`; the sort at 94), lines 105 to 109 (`keyOf`), lines 114 to 120 (`isOllamaProvider`), lines 122 to 131 (`ollamaPullHint`, declared at line 123, not exported).
- FACT: `apps/api/src/modules/providers/providers.registry.ts` lines 26 to 28 (`get`), 31 to 34 (`find`), 94 to 102 (`setKeyRef`), 105 to 115 (`current`, which reads settings), 117 to 119 (`save`), 147 to 158 (`indexOf`; NOT_FOUND at 149 to 155).
- FACT: `apps/api/src/modules/providers/providers.service.ts` lines 49 to 52 (`remove`), 55 to 63 (`setKey`), 66 to 73 (`clearKey`), 100 to 111 (`toRead`).
- FACT: `apps/api/src/modules/providers/providers.controller.ts` lines 10 to 32 (imports), lines 36 to 38 (comment: the route rules and the statuses), line 39 (`@Controller()`), lines 40 to 41 (constructor), lines 89 to 92 (models route), lines 110 to 116 (effective-model route). No connection route exists on main.
- FACT: `apps/api/src/modules/providers/providers.module.ts` lines 11 to 17 (re-exports; `isOllamaProvider` at line 14), lines 22 to 41 (module), lines 25 to 39 (providers list), line 40 (exports).
- FACT: `apps/api/src/modules/providers/providers.seeding.ts` lines 64 (seeded id), 67 (model `''`), 71 (app default `{ollama, ''}`).
- FACT: `apps/api/src/modules/providers/secrets/secrets-store.ts` lines 49 to 55 (`put`; the empty key throws at 51), lines 58 to 60 (`get`), 63 to 66 (`delete`), 68 to 70 (`has`), 73 to 76 (`hint`), 79 to 82 (`save`).
- FACT: `apps/api/src/modules/platform/settings/settings.service.ts` lines 58 to 62 (`read`; no write).
- FACT: `apps/api/src/modules/platform/errors/module-error.ts` lines 2 to 17 (`ModuleError`: `code`, `status`, `message`, optional `details`).
- FACT: `apps/api/src/modules/platform/errors/zod-validation.pipe.ts` lines 5 to 10.
- FACT: `apps/api/src/modules/platform/errors/platform-exception.filter.ts` lines 43 to 51 (ModuleError passes through), lines 52 to 60 (ZodError becomes 400 PLATFORM_VALIDATION_FAILED with the issues as details).
- FACT: `apps/api/test/invariant-sweep.ts` line 4 (fixture rule), lines 38 and 39 (loopback host and origin), line 44 (`ECHO_BODY` is `{count: 1, intervalMs: 0}`), lines 73 to 84 (`FIXTURE_PATHS`; the providers entries at 75 to 83), line 102 (`EVENT_WAIT_MS` 200), line 104 (`RESPONSE_CAP_MS` 1000), lines 404 to 410 (`planGetHead`: GET and HEAD per template at 406 to 409), line 464 (the observer waits `EVENT_WAIT_MS`), lines 573 to 585 (`sweepMutations`; `ECHO_BODY` sent at 585), lines 595 to 617 (its requests: no cookie, 401; a missing or foreign Origin, or a foreign Host, 403).
- FACT: `apps/api/test/invariant-get-head.test.ts` lines 77, 101 and 137 (the three `sweepGetHead` calls).
- FACT: `apps/api/test/providers-client-errors.test.ts` lines 68 to 77 (a refused connection through a closed mock fails with PROVIDER_UNREACHABLE).
- FACT: `apps/api/test/providers-client.kit.ts` line 9 (import of `startMockOpenAI`), line 16 (re-export), line 61 (`recordsOf`), line 72 (`resetScenario`).
- FACT: `apps/api/test/providers-api.test.ts` lines 30 to 36 (imports from `secrets.kit`, including `captureStdout`), lines 39 and 40 (`KEY`, `OLLAMA_URL`), lines 54 to 66 (mock start, close and reset), lines 68 to 77 (keyless helper), lines 120 to 122 (`get`), lines 125 to 139 (`post`), lines 143 to 159 (`withApp`).
- FACT: `apps/api/test/secrets.kit.ts` line 102 (`scribaFolder`), 106 (`secretsFile`), 111 (`modeOf`), 139 (`captureStdout`).
- FACT: `apps/api/test/guard-request.ts` line 7 (`RequestOptions`), line 27 (`send`), line 80 (`sessionCookie`).
- FACT: `apps/api/test/settings.kit.ts` line 60 (`makeLibrary`), line 69 (`settingsFilePath`).
- FACT: `apps/api/test/create-test-app.ts` line 65 (`createTestApp`).
- FACT: `e2e/fixtures/mock-openai/server.mjs` lines 17 to 19 (`startMockOpenAI` reads `scenariosDir`), lines 53 to 55 (every `.json` file is loaded), lines 77 to 81 (scenario map), lines 292 to 301 (record: headers at 297, body at 298), line 302 (the push, made before the no-match check at lines 305 to 306, so a request to a known scenario is recorded even when no step matches; the step lookup is `findStepIndex` at line 291), line 306 (500 when no step matches), lines 310 to 311 (`step.delayMs`, waited before the reply), lines 321 to 322 (`status` reply), lines 347 to 350 (`sendStatus`: the reply's headers override the JSON content type).
- FACT: `e2e/fixtures/mock-openai/server.d.mts` lines 1 to 3 (`MockOpenAIOptions`), lines 5 to 14 (`MockOpenAIRecord`).
- FACT: the bundled scenarios: `models-failing.json` (models 401 with `invalid_api_key`; no chat step); `unknown-model.json` (chat 404 with `model_not_found`; no models step); `models-non-empty.json` (models 200 with `qwen2.5`, `gemma3`, `llama3.1`; no chat step); `models-empty.json` (models 200 with `data: []`; no chat step); `html-200.json` (chat 200 with `text/html`; lines 5 to 9); `text-stream.json` (chat stream); `tool-call.json` (models and chat).
- FACT: `node_modules/openai/package.json` version 7.55.0 and `apps/api/package.json` line 16 (`"openai": "7.55.0"`).
- FACT: git: `main` was at f038154 (MPR-06 code and docs) when the checks ran and is at 8471f80 or later (`git rev-parse --short main` printed 5b0a3e7 when read for this correction; e072c2b records rejection 3, and 5b0a3e7 records rejection 4); `e4e2d20` records this plan's rejection 1 and `26669bf` its rejection 2; `git diff --name-only f038154 main` lists only `plans/DECISIONS.md`; MPR-04 merged at 9bc46d4; the working tree has ` M plans/PLT-16.md`, and `plans/MPR-07.md` is untracked (this plan).
- FACT: `apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 58 to 64 (no verified cookie: 401 AUTH_REQUIRED), lines 65 to 73 (a mutation whose Origin is missing or is not the one its Host expects: 403 AUTH_ORIGIN_REJECTED); `apps/api/src/modules/setup-auth/host-frame.middleware.ts` lines 33 to 44 (a Host that is not allowed: 403 AUTH_HOST_REJECTED, from middleware registered with `app.use`, so before the guard, as line 23 says); `packages/contracts/src/setup-auth/errors.ts` lines 16 to 18 (the three statuses).
- FACT: `.nvmrc` holds `26`, and root `package.json` line 12 is `engines.node` `>=26 <27`, so Node is pinned at 26.

## 8. Assumed facts (not checked by running anything)

- ASSUMED: hosted providers answer an out-of-credit account with 402 (which the client maps to PROVIDER_BAD_RESPONSE at `statusFailure`, FACT `client/errors.ts` line 119) or with 429 (PROVIDER_RATE_LIMITED, FACT line 110). H6 carries the credit sentence for 402 and H7 carries it for 429. E6 (chat 402) and E7 (chat 429) check the mapping and the hints on the mock. The live-provider half, a hosted provider's real 402 or 429 reply, is untestable in CI (`units/README.md` line 133: real models are checked only by a manual eval, never in CI) and is recorded here as not checked against any live service.
- ASSUMED: the SDK throws an `APIError` with a numeric `status` for a non-2xx reply to `/models` (FACT for the branch that reads it: `client/errors.ts` lines 147 to 149; the SDK's throw is not read line by line). The stage split in D1 depends on it. C1(b) checks it: a 401 on the list call gives PROVIDER_UNAUTHORIZED at stage `list`. If it fails, stop rule 1 applies.
- ASSUMED: a closed local port refuses the connection at once on the machines that run the suite (the premise of FACT `providers-client-errors.test.ts` lines 68 to 77). If it does not, the attempt ends at the timeout with PROVIDER_TIMEOUT, so C1(a) and E2 fail: both assert PROVIDER_UNREACHABLE.
- ASSUMED: Nest routes `POST /api/providers/test` beside `POST /api/providers/:id/update` and `GET /api/providers/:id/models` with no conflict, since the segment counts differ. C1 and E4 exercise it.
- ASSUMED: the zod union in `connectionTestRequestSchema` refuses the sweep's `ECHO_BODY` (both members are strict objects, FACT `connection-test.ts` lines 19 to 28; the body at `invariant-sweep.ts` line 44), so an authorized request with that body gets 400. The mutation sweep never reaches the pipe: its requests get 401 or 403 from the guard (FACT `setup-auth.guard.ts` lines 58 to 73) or from the Host middleware (FACT `host-frame.middleware.ts` lines 33 to 44), per `invariant-sweep.ts` lines 595 to 617. E4(iv) checks the 400 for an authorized request.
- ASSUMED: the sweep's added requests (D11) cost about 200 ms each, because the 404 replies resolve at once. The 1.2 s figure is an estimate; step 8 measures it.
- ASSUMED: `performance.now()` from `node:perf_hooks` exists on Node 26 (the pin is FACT, section 7; the API was not checked in this session). C1(d) checks `latencyMs` on a successful run, so a missing function would fail it.
- ASSUMED: a seeded or saved provider's `timeout` (120 000 ms by default) bounds a silent stage in the test as it does in the client. E8 checks it: a saved provider with `timeout` 300 and a delayed models step gives TIMEOUT at reach.
- ASSUMED: a hosted provider answers the placeholder key that a keyless provider sends on `/models` with a 401, so a keyless hosted provider fails at list with H4. Not checked against any live service; C1(b) checks the mock's 401 only.
