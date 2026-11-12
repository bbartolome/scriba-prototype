---
id: PLT-12
status: planned
---
# PLT-12 plan — scripted mock OpenAI-compatible server with scenarios

Batch: [PLT-12] (Platform, phase:test-harness, M1); batch of one. Revision 3, written against `main` at `339c716`. Revisions 1 and 2 were rejected by Opus; the changes of each are listed at the top of section 6. PLT-11 is already on `main` (`4f9007b` is an ancestor of `main`). Opus approved revision 3 (DECISIONS record `2e1a7df`). The five text edits made after the approval are applied in place, and the status is `planned`.

## 1. Decisions this plan follows

1. **Location and workspace.** The code lives under `e2e/fixtures/mock-openai/`. `e2e/` becomes an npm workspace named `@bbartolome/scriba-e2e`, so its Vitest tests run under root `npm test` without editing the root `test` line. Source: unit line 20 ("make `e2e/` a workspace if it needs its own dev deps"); PLT-01 unit line 23; PLT-01 plan section 5 (PLT-12 bullet, line 113); DECISIONS 2026-11-11 "root test script: one quoted glob" (line 164: PLT-12 adds its own test file and does not edit the `test` line).
2. **Dependencies.** The e2e workspace has two devDependencies. `openai` is pinned exact at the latest tag at implementation (`7.55.0` on 2026-11-12, section 7). `@types/node` is `^26.6.6`, the version already in the lock for `apps/api`, so it adds no new lock entry. The mock server itself uses only `node:http`, `node:fs`, `node:path` and `node:url`. Source: unit line 28 (tested through the official `openai` SDK); exact pins follow the root devDependencies, which are all exact; `package-lock.json` entry `node_modules/@types/node` 26.6.6.
3. **Language and module type.** The server and the CLI are plain ESM `.mjs` files, so `npm run mock:openai` runs with `node` and needs no build. The tests are TypeScript run by Vitest. `e2e/package.json` sets `"type": "module"`. Without it, NodeNext compiles the `.ts` tests as CommonJS, and `import.meta.url` fails to type-check (TS1470, probe in section 7). Source: simplest option; unit line 27 (`npm run mock:openai`); `modules/platform.md` line 58 (Vitest everywhere).
4. **Routes.** `POST /scenario/<name>/v1/chat/completions` and `GET /scenario/<name>/v1/models` serve a scenario. `GET /__mock/scenarios/<name>/requests` returns that scenario's records as a JSON array. `POST /__mock/scenarios/<name>/reset` clears them and returns 204. An unknown scenario or any other path returns 404 with a JSON body. Source: unit lines 21, 22 and 24; `units/README.md` line 126 (reads are `GET` and never mutate, commands are `POST`).
5. **Listening and API.** The server listens on `127.0.0.1` on an ephemeral port (`listen(0)`). `startMockOpenAI({ scenariosDir? })` resolves to `{ baseUrl, close() }`, typed in `server.d.mts` (section 2). `close()` closes every open connection first, so a test never hangs on an aborted request. Source: unit line 27 (started on an ephemeral port, returns its base URL); loopback is the simplest choice (open point 13).
6. **Scenario file.** A scenario is `<name>.json` with the shape `{ "steps": [ ... ] }`. At start the server loads every `*.json` in its scenario directory. It throws if a file does not parse or a reply has an unknown kind. The base path `…/scenario/<name>/v1` selects the scenario. Source: unit lines 22 and 23.
7. **Step selection and the matching rule.** Each step is `{ "match"?: {...}, "delayMs"?: number, "reply": {...} }`. The first step whose `match` holds is used. An absent match field matches any request. **A matcher on a field the request does not have never matches.** Chat requests always have `messages`. Models requests have none, so `turnIndex`, `lastMessageRole`, `lastMessageContent` and `toolResultPresent` never match a models request. `endpoint` and `attempt` apply to both endpoints. `header` applies to any request that carries the named header. If no step matches, the reply is HTTP 500 with `{"error":"no scenario step matches"}`, and the record is kept with `step: null`. Source: unit line 23 ("an ordered list of steps that match on the request").
8. **Matchers.** Each matcher is tested by a case in section 4.
   - `endpoint`: `"chat"` or `"models"`.
   - `attempt`: the 1-based count of requests to this scenario on the same endpoint since the last reset, this request included.
   - `turnIndex`: the number of `assistant` messages in the body (chat requests only).
   - `lastMessageRole`: the role of the last message, exact.
   - `lastMessageContent`: a substring of the last message's text. The text is the string when `content` is a string. When `content` is an array of parts, it is the `text` fields of the parts joined in order with no separator; a part without a string `text` adds nothing. When `content` is `null` or absent, the text is empty.
   - `toolResultPresent`: a message with role `tool` exists.
   - `header`: `{ "name", "value" }`, an exact value match on the request header, with a case-insensitive name.

   Source: unit line 23 lists turn index, last message role and content, and tool result present. `attempt` is also needed by criterion 2, because the retry has the same turn index as the first turn. `endpoint` and `header` are added here because MPR-04 needs model-list scenarios and a 401 for a missing key (section 5). Open point 6 lists which matchers a criterion exercises.
9. **Reply kinds.** The unit lists five reply kinds. This plan makes the delay a step field, so that a stall is a step with a long `delayMs`. The four reply kinds are:
   - `stream` `{ "deltas": [...], "chunkDelayMs"? }`. Chat with `stream: true` sends one content chunk per delta, waiting `chunkDelayMs` before each, then `finish_reason` `stop`. Chat with `stream: false` returns one completion whose content is the deltas joined.
   - `toolCalls` `{ "deltas"?: [...], "calls": [ { "id"?, "name", "argumentChunks": [...] } ] }`. Streamed, the content deltas come first, one content chunk each, so text streams before the tool call. Then each call is sent on its own `index` (its position in `calls`), with the first chunk carrying its `id`, `type`, name and an empty arguments string, followed by its argument fragments (decision 23). `finish_reason` is `tool_calls`. Non-streamed, the reply is one completion (decision 24). The mock never parses arguments, so invalid JSON passes through unchanged. Source: MPR-04 unit line 29 (text deltas, then a tool call, then a finish event) and line 20 (fragments assembled by index).
   - `status` `{ "status", "headers"?, "body"? }`. Any endpoint. Sends the status, the headers and the JSON body (empty if absent).
   - `drop` `{}`. Destroys the socket with no response.

   Source: unit line 23 (streamed content deltas, streamed tool calls with arguments split across chunks, HTTP status with headers, delay, dropped connection).
10. **Records.** Each request that matches a scenario is recorded before its reply is sent. The record has the shape of `MockOpenAIRecord` in `server.d.mts` (section 2): `{ attempt, endpoint, method, path, headers, body, step, closedByClient }`. `headers` has lower-case names. `body` is the parsed JSON, or the raw text if it does not parse. `step` is the 0-based index of the matched step, or `null`. `closedByClient` is true when the client closed the connection before the reply finished and the mock had not dropped it itself. A pending `delayMs` is cancelled when the client closes. Source: unit line 24 (headers, body and attempt count are recorded); the close is needed by MPR-04 and TRG-12 (section 5).
11. **Reset.** `POST …/reset` clears one scenario's records and both of its attempt counters. Other scenarios are not affected. Source: unit line 24 ("per-scenario reset").
12. **Shipped scenarios.** Exactly two: `tool-call` and `malformed-tool-call`. Source: unit line 25. Both start with a `models` step (status 200, one model, the body in section 2), so `GET …/v1/models` answers. Their chat steps name `"endpoint": "chat"`.
    - `tool-call`: step 0 is the models step. Step 1 (`toolResultPresent: false`) is a `toolCalls` reply with content delta `Let me check. `, and one call `echo_text` with chunks `{"text":` and ` "hello world"}`. Step 2 (`toolResultPresent: true`) is a `stream` reply with deltas `The tool returned: ` and `hello world.`.
    - `malformed-tool-call`: step 0 is the models step. Step 1 (`attempt: 1`) is a `toolCalls` reply with one call `echo_text` and the single chunk `{"text": "hello world` (invalid JSON). Step 2 (any later chat request) is a `toolCalls` reply with one call `echo_text` and the chunks `{"text":` and ` "hello world"}` (valid JSON).
13. **Placeholders.** The tool name `echo_text` is a placeholder. The Tool registry does not exist yet, so the mock checks no tool names. Source: simplest option.
14. **Sample-file contract.** No shipped scenario names a file under `examples/`. `examples/` holds only `.gitkeep` (section 7), so the rename rule in unit line 26 has nothing to update yet. The first scenario that names a sample path is AGL-08's "summarize my outline" scenario (section 5), and the rule applies from then on. Source: unit line 26; AGL-08 unit line 17.
15. **Test-only scenarios.** `test/scenarios/faults.json`, `test/scenarios/slow.json` and `test/scenarios/matchers.json` are loaded by starting a second server with `scenariosDir` set to that folder. The platform's scenario folder keeps exactly the two shipped files. Source: unit line 25; simplest option.
16. **Tests.** Vitest in the e2e workspace (`vitest run`), in one file `test/mock-openai.test.ts`. Each test names its criterion or the matcher it covers. The tests use only the `openai` SDK and HTTP, and read records through the `/__mock` endpoints. The SDK client is built with `maxRetries: 0`, so 429s and dropped connections reach the test. Source: `units/README.md` line 133 (external behaviour only); `modules/platform.md` lines 57 and 58; unit line 28.
17. **Root wiring.** Root `package.json` gains `"e2e"` in `workspaces`, appended last, and the script `"mock:openai": "node e2e/fixtures/mock-openai/cli.mjs"`. The second command of the root `build` gains `-w @bbartolome/scriba-e2e`, so e2e is type-checked. The root `test`, `lint` and `dev` lines do not change. Source: unit line 27; PLT-01 unit line 31 (PLT-12 adds `mock:openai`); DECISIONS 2026-11-11 root test script entry (line 164).
18. **CLI.** `cli.mjs` starts the server on the shipped scenarios. It prints `mock OpenAI base URL: http://127.0.0.1:<port>` and an example line `scenario URL example: <base>/scenario/tool-call/v1`. It closes on SIGINT and SIGTERM. Source: unit lines 27 and 36.
19. **Workspace conventions and lint scope.** The e2e `package.json` has `"private": true` and `"version": "0.0.0"`. It has the scripts `build` (`tsc --noEmit -p tsconfig.json`, decision 25), `test` (`vitest run`) and `lint` (`eslint .`). Source: PLT-01 plan section 1 (line 23, the version is needed for npm's banner) and section 2 (line 40: the fan-out fails when a workspace lacks a script); `packages/packs/package.json` is the precedent. **ESLint applies no rules to the `.mjs` files.** The root config's rule objects match only `**/*.ts` (`eslint.config.mjs` lines 17 and 21). So `npm run lint` in e2e checks the `.ts` tests, and the `.mjs` files are checked by Prettier and by the tests. No rule is added for them.
20. **Formatting.** Prettier checks every e2e file, the JSON scenarios included. Source: PLT-01 plan section 1 (line 22, the root Prettier check covers the workspaces and the later additions); DECISIONS 2026-11-10 "Prettier scope" (line 48); PLT-01 plan section 5 (scenario JSON is reached by Prettier).
21. **Lockfile.** The change is additive, and no existing package entry changes `version`, `resolved` or `integrity`. A line npm re-emits in the root entry or in the new workspace entry is allowed (PLT-02 precedent). Source: DECISIONS entry "2026-11-11 — PLT-02 — lockfile gate at the batch collection".
22. **Unit front matter.** `blocked_by: [PLT-01]` and `parallel_with: [PLT-11, …]` stay as they are. `unblocks` names PLT-13, GNP-02, GRR-04, MPR-04 and TRG-12, and each of them names PLT-12 in `blocked_by` (section 7). Source: unit lines 2 to 9.
23. **Wire format for streamed replies.** Streamed replies are sent with `Content-Type: text/event-stream`. Each chunk is one `data: <json>` line followed by a blank line. The stream ends with `data: [DONE]` and a blank line. Every chunk has the fixed `id` `chatcmpl-mock`, the object `chat.completion.chunk`, the fixed `created` `1700000000`, and a `model` that echoes the request's `model` (or `mock-model` if absent).
    - **The first chunk of a streamed completion carries `delta.role` `"assistant"`**, whatever the chunk holds.
    - A call's first chunk carries `index` (its 0-based position in `calls`), `id` (its `id` field, or `call_mock_<i>` where `i` is that position), `type` `"function"`, `function.name` and `function.arguments` `""`. Each later chunk of that call carries only `index` and a `function.arguments` fragment.
    - The SDK's streaming helper throws without these fields: `missing role for choice 0` and `tool call snapshot missing \`type\`` (`lib/ChatCompletionStream.js` lines 1599 and 1088, section 7). So both are required.
    - The constants keep tests and goldens stable.

    Source: revision 3 item B1 (DECISIONS 2026-11-12, Opus rejection 2); unit line 23; decision 9.
24. **Non-streamed completions.** A non-streamed reply has `message.role` `"assistant"`. `message.content` is the joined deltas, or `null` when there are none. `tool_calls` lists every call, each with `type` `"function"`, its `id`, `function.name`, and `function.arguments` (the argument chunks joined). `finish_reason` is `tool_calls` for a `toolCalls` reply and `stop` for a `stream` reply. Non-streamed replies are sent with `Content-Type: application/json`. Source: revision 3 item B1; MPR-04 unit line 29; TRG-12 (non-streaming in v1).
25. **Type check.** The e2e workspace is type-checked by `npm run build -w @bbartolome/scriba-e2e`, which runs `tsc --noEmit -p tsconfig.json`. `e2e/tsconfig.json` extends `../tsconfig.base.json` (strict, NodeNext), sets `types` to `["node"]` and includes `fixtures`. Source: revision 2 item R3; `tsconfig.base.json`; `apps/api/tsconfig.json` (the `types` precedent).

## 2. Files to create or change

Only these paths change. `packages/**`, `apps/**`, `scripts/**`, `.github/**`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.base.json` and `README.md` do not change. `.github/workflows/ci.yml` already runs `npm test` and `npm run build` (section 7), so the e2e tests and the e2e type check reach CI without an edit.

| Path | Change | Purpose |
|---|---|---|
| `e2e/package.json` | new | `name` `@bbartolome/scriba-e2e`, `version` `0.0.0`, `private` `true`, `type` `module`; `scripts.build` `tsc --noEmit -p tsconfig.json`, `scripts.test` `vitest run`, `scripts.lint` `eslint .`; `devDependencies.openai` at the exact version of step 1 (decision 2) and `devDependencies["@types/node"]` `^26.6.6` (decision 2) |
| `e2e/tsconfig.json` | new | `extends` `../tsconfig.base.json`; `compilerOptions.types` `["node"]`; `include` `["fixtures"]` (decision 25) |
| `e2e/.gitkeep` | delete | the folder now holds files (the PLT-02 precedent for `packages/contracts/src/.gitkeep`) |
| `package.json` (root) | edit | `workspaces` gains `"e2e"`, appended last; the second command of `build` gains `-w @bbartolome/scriba-e2e`; `scripts["mock:openai"]` = `node e2e/fixtures/mock-openai/cli.mjs`, after `lint` |
| `package-lock.json` | changed by npm | adds the `e2e` workspace entry with its devDependencies, `node_modules/@bbartolome/scriba-e2e` and `node_modules/openai`. `@types/node` adds no new entry (`node_modules/@types/node` 26.6.6 already exists) |
| `e2e/fixtures/mock-openai/server.mjs` | new | exports `startMockOpenAI`: the loader and validator, the step matcher (decision 8), the stream and non-stream renderers (decisions 9, 23, 24), the records and the reset (decisions 4 to 11) |
| `e2e/fixtures/mock-openai/server.d.mts` | new | the type declarations of `server.mjs`, for the e2e type check and for apps/api imports (open point 5). Its content is below |
| `e2e/fixtures/mock-openai/cli.mjs` | new | the `npm run mock:openai` entry (decision 18); imports `startMockOpenAI` from `./server.mjs` |
| `e2e/fixtures/mock-openai/scenarios/tool-call.json` | new | shipped scenario, criterion 1 (decision 12) |
| `e2e/fixtures/mock-openai/scenarios/malformed-tool-call.json` | new | shipped scenario, criterion 2 (decision 12) |
| `e2e/fixtures/mock-openai/test/scenarios/faults.json` | new | test-only scenario, criterion 3: attempt 1 is a 429 with `Retry-After: 1`; attempt 2 is a `delayMs` of 400 then a `stream` of `ok`; attempt 3 is a `drop` |
| `e2e/fixtures/mock-openai/test/scenarios/slow.json` | new | test-only scenario, criterion 4 (the abort check): every chat request waits `delayMs` 5000, then replies with a `stream` of `late` |
| `e2e/fixtures/mock-openai/test/scenarios/matchers.json` | new | test-only scenario for the five matcher cases (section 4), with five steps in this order: header (`x-mock-case: header`), `turnIndex` 1, `lastMessageRole` `tool`, `lastMessageContent` `content-check`, and `lastMessageContent` `chunk-check` with `chunkDelayMs` 150 and three deltas |
| `e2e/fixtures/mock-openai/test/mock-openai.test.ts` | new | twelve test cases: seven for the criteria (criterion 5 as two concurrent cases; the helper check and the non-streamed check inside criterion 1) and five matcher cases (section 4) |

The declarations in `server.d.mts`:

```ts
export interface MockOpenAIOptions {
  scenariosDir?: string;
}

export interface MockOpenAIRecord {
  attempt: number;
  endpoint: 'chat' | 'models';
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  step: number | null;
  closedByClient: boolean;
}

export interface MockOpenAI {
  baseUrl: string;
  close(): Promise<void>;
}

export declare function startMockOpenAI(options?: MockOpenAIOptions): Promise<MockOpenAI>;
```

The models body of the shipped scenarios is `{"object":"list","data":[{"id":"mock-model","object":"model","owned_by":"scriba-mock"}]}`.

Nothing else changes. The root `README.md` gains no text, because no criterion asks for documentation (open point 15).

## 3. Method

Implement in a fresh worktree of `unit/PLT-12`, created from `339c716` by the driver (`git worktree add -b unit/PLT-12 <tmp>/plt12 339c716`), not in the main checkout. Main is now at `2e1a7df`, but every commit after `339c716` changes `plans/` only, so the worktree stays based on `339c716`. The main checkout's `node_modules` dates from 2026-11-10 and has no `@types/node` (section 7). Record `node -v` and `npm -v` with each result. The tests run under Node 26.

0. **Precondition.**
   - `git merge-base --is-ancestor 339c716 HEAD` exits 0, and `git diff --quiet 339c716 HEAD -- ':!plans'` exits 0. `plans/` is left out of the code check, because the plan files change without touching code. `git status --short -- ':!plans'` prints nothing.
   - `git ls-files e2e` prints only `e2e/.gitkeep`. `test -e e2e/fixtures/mock-openai` fails.
   - `node -v` prints `v26.x`. `npm -v` prints `11.20.0`.
   - If any check differs, stop and report.
1. **Pins (read-only).** `npm view openai dist-tags.latest` gives `<v>` (7.55.0 on 2026-11-12). `npm view openai@<v> engines` must admit Node 26 (`>=22.0.0`). Expected: both exit 0.
2. **Root wiring (files: `package.json`, `e2e/.gitkeep`).**
   - Append `"e2e"` to `workspaces`. Append `-w @bbartolome/scriba-e2e` to the second command of `build`. Add `"mock:openai": "node e2e/fixtures/mock-openai/cli.mjs"` to `scripts`, after `lint`.
   - `git rm e2e/.gitkeep`. No Prettier run here: `package.json` is formatted after the install, in step 9 (DECISIONS line 63).
   - Expected: `git diff -- package.json` shows only these three changes.
3. **Workspace (files: `e2e/package.json`, `e2e/tsconfig.json`).**
   - Create both files as in section 2. `e2e/package.json` lists `"openai": "<v>"` (exact, from step 1) and `"@types/node": "^26.6.6"` in `devDependencies`.
   - Run a plain `npm install` in the root, with no package argument. Expected: exit 0; `npm ls openai @types/node` shows one copy of each, `openai` at `<v>` and `@types/node` at 26.6.6.
   - The lock gate of step 4 decides the result. If the plain install changes any existing package entry (for example, it moves `node_modules/@types/node` off 26.6.6 because a newer 26.x exists), stop and report. Do not re-resolve by hand.
4. **Lock gate (file: `package-lock.json`).**
   - `git diff -- package-lock.json`: no existing package entry changes `version`, `resolved` or `integrity`. Removed lines may only be lines npm re-emits in the root entry or in the new workspace entry.
   - Expected new entries: `e2e`, `node_modules/@bbartolome/scriba-e2e` and `node_modules/openai`. `openai` has no runtime dependencies (section 7). `@types/node` adds no entry, so `node_modules/@types/node` is unchanged.
   - `npm ci` exits 0.
5. **Server and declarations (files: `e2e/fixtures/mock-openai/server.mjs`, `e2e/fixtures/mock-openai/server.d.mts`).** Write them as decisions 4 to 11, 23 and 24 state, and as the declarations of section 2. `server.mjs` imports only the four `node:` modules of decision 2.
6. **Scenarios (files: the five JSON files).** Write them as decision 12, section 2 and the matcher cases of section 4 state. Expected: each file parses with `JSON.parse`.
7. **CLI (file: `e2e/fixtures/mock-openai/cli.mjs`).** Write it as decision 18 states.
8. **Tests (file: `e2e/fixtures/mock-openai/test/mock-openai.test.ts`).** Write the twelve test cases of section 4.
9. **Format and type check.**
   - `npx prettier --write e2e package.json`, then `npx prettier --check e2e package.json`. Expected: exit 0.
   - `npm run build -w @bbartolome/scriba-e2e`. Expected: exit 0. This type-checks the test file against the `server.d.mts` declarations.
   - apps/api import check, in a file that is deleted after the check: add `apps/api/test/plt12-import-check.ts` with a static `import { startMockOpenAI } from '../../../e2e/fixtures/mock-openai/server.mjs'` and a call to it. Run `npm run build -w @bbartolome/scriba-contracts` immediately before the API build (`dist/` is git-ignored, and without it the import fails with TS2307). Then run `npm run build -w @bbartolome/scriba-api`, which type-checks `src` and `test` under strict. Expected: exit 0. Delete the file, and `git status --short -- apps` prints nothing.
10. **Cases.**
    - For N from 1 to 6, run `npm test -w @bbartolome/scriba-e2e -- -t "criterion N"`. Expected: exit 0, criterion 5 shows two passed, every other N shows one passed, and the other cases are skipped.
    - Run `npm test -w @bbartolome/scriba-e2e -- -t "matcher"`. Expected: exit 0, five passed.
    - Run `npm test -w @bbartolome/scriba-e2e`. Expected: twelve passed.
11. **Mutation checks (temporary edits).** Copy each file to `/tmp/plt12-mut/` first, edit it, run the check, restore the copy, and `cmp` the file against the copy.
    - (a) In `malformed-tool-call.json`, make the step 1 chunk valid JSON (`{"text": "hello world"}`). `criterion 2` must fail.
    - (b) In `server.mjs`, make the reset route do nothing. `criterion 4` must fail.
    - Record both results and both `cmp` outputs.
12. **Root gates (no file change).** From the root, run `npm run build`, `npm test` and `npm run lint`. Each must exit 0. Banner counts, each with e2e included, using the command `npm run build 2>&1 | grep -o '^> @bbartolome/scriba-[a-z0-9]*' | sort -u | wc -l` (the class `[a-z0-9]` is needed because `e2e` contains a digit; the same command with `npm test` and with `npm run lint`): each prints `5`.
13. **Commit and fresh clone.**
    - Commit on `unit/PLT-12`: `feat(PLT-12): add the scripted mock OpenAI server and npm run mock:openai`.
    - `git clone -b unit/PLT-12 --no-hardlinks /Users/bbartolome/workspace/scriba-prototype <tmp>/fresh`. In the clone, run `npm ci && npm run lint && npm test && npm run build`, in CI's order. Each must exit 0.
    - In the clone, `find . -name package-lock.json -not -path '*/node_modules/*'` lists one file.
14. **Record.** Store the Node and npm versions and each command's output. No push, no remote, no pull request.

## 4. Acceptance criteria and tests

Shared set-up, at file level in `mock-openai.test.ts`:
- `beforeAll` starts two servers. `shipped` = `startMockOpenAI()` (the shipped scenarios). `faults` = `startMockOpenAI({ scenariosDir: <test/scenarios> })`, which loads `faults`, `slow` and `matchers`. `afterAll` closes both.
- There is no shared `beforeEach`. Each test case resets the scenarios it uses as its first step, with `POST …/reset`. A case never resets a scenario it does not use. Criterion 5 relies on this, because its two cases run concurrently.
- A client is `new OpenAI({ apiKey: 'test-key', baseURL: <base>/scenario/<name>/v1, maxRetries: 0 })`.
- A helper `collectStream` reads a raw streamed response into `{ content, toolCalls: [{ index, id, type, name, arguments }], finishReason }`. The helper is test code, not part of the mock.
- Test titles begin with `criterion N:` or `matcher:`, and the describe names carry the same prefix, so `-t "criterion N"` and `-t "matcher"` select the right cases.

The criteria have seven cases: one per criterion, with criterion 5 as two concurrent cases. The helper check (c) and the non-streamed check (d) are assertions inside the criterion 1 case, not separate cases. The five matcher cases are additional, not PLT-12 criteria, and bring the total to twelve. The criterion text is copied from `units/PLT-12-mock-openai-server.md` lines 31 to 36.

| Criterion | Test title | Command | Assertions |
|---|---|---|---|
| 1. "The `openai` SDK pointed at `…/scenario/tool-call/v1` gets a streamed tool call with arguments split across chunks, then a final text answer after the tool result is sent." | `criterion 1: tool-call scenario streams a tool call split across chunks, then a final text answer` | `npm test -w @bbartolome/scriba-e2e -- -t "criterion 1"` | Resets `tool-call` on `shipped`. (a) `client.models.list()` returns a page whose `data[0].id` is `mock-model` (GET `…/v1/models`). (b) Raw streamed call, the first request with no tool result: the content deltas `Let me check. ` arrive before the first chunk that opens a tool call; that chunk carries `type` `function` and the name `echo_text`; at least two chunks carry argument fragments; their concatenation parses to `{"text":"hello world"}`; the last `finish_reason` is `tool_calls`. (c) Helper: `client.chat.completions.stream({ model, messages, tools }).finalChatCompletion()` on the same request returns `message.content` `Let me check. `, one call with `type` `function`, name `echo_text`, and arguments that parse to `{"text":"hello world"}`. (d) The same request, non-streamed: `message.role` is `assistant`, `message.content` is `Let me check. `, `tool_calls[0]` has `type` `function` and name `echo_text`, and `finish_reason` is `tool_calls`. (e) Second streamed call, with the messages user, assistant (same tool call id, name and arguments) and tool (`hello world`): the joined text deltas equal `The tool returned: hello world.`, and `finish_reason` is `stop`. |
| 2. "`malformed-tool-call` returns invalid tool-call arguments on the first turn and valid ones on the retry." | `criterion 2: malformed-tool-call returns invalid arguments first and valid ones on the retry` | `npm test -w @bbartolome/scriba-e2e -- -t "criterion 2"` | Resets `malformed-tool-call` on `shipped`. Non-streamed. Call 1: `message.tool_calls[0].type` is checked to be `function` first, because the SDK types each tool call as a union of function and custom calls (`resources/chat/completions/completions.d.ts` line 1461); then `message.tool_calls[0].function.arguments` makes `JSON.parse` throw. Call 2, the same request: the arguments parse to `{"text":"hello world"}`. Both calls name `echo_text`. |
| 3. "A scenario can return a status with headers (e.g. 429 with `Retry-After`), delay, or drop the connection." | `criterion 3: a scenario returns a status with headers, a delay, and a dropped connection` | `npm test -w @bbartolome/scriba-e2e -- -t "criterion 3"` | Resets `faults` on `faults`. Three non-streamed calls in order. Call 1 rejects with `RateLimitError`, whose `headers` is typed `Headers`; `status` is 429 and `headers.get('retry-after')` is `1`. Call 2 resolves with `ok` after at least 400 ms, measured around the call. Call 3 rejects with `APIConnectionError`. The `faults` records are three, with attempts 1 to 3. |
| 4. "Recorded requests are readable and resettable per scenario." | `criterion 4: recorded requests are readable and resettable per scenario` | `npm test -w @bbartolome/scriba-e2e -- -t "criterion 4"` | Resets `tool-call` and `malformed-tool-call` on `shipped`, and `slow` on `faults`. The two `tool-call` calls are the criterion 1 pair, the first request and then the request with the tool result, and one `malformed-tool-call` call. `GET …/tool-call/requests` gives two records, with attempts 1 and 2, steps 1 and 2, `headers.authorization` equal to `Bearer test-key`, and a `body.messages` array. The malformed list gives one record. `POST …/tool-call/reset` makes the `tool-call` list `[]`, and the malformed list still has one record. On `faults`: a `slow` call aborted through `signal` after 100 ms rejects. Within 2 s (polling), its record has `closedByClient: true`. After `POST …/slow/reset` the list is `[]`. |
| 5. "Two tests using different scenarios in parallel don't interfere." | `describe` `criterion 5: two scenarios used in parallel on one server do not interfere`, with `test.concurrent` cases `criterion 5: tool-call flow runs alongside the malformed flow` and `criterion 5: malformed flow runs alongside the tool-call flow` | `npm test -w @bbartolome/scriba-e2e -- -t "criterion 5"` (two passed) | Both cases use `shipped` and run at the same time, each with its own client. Case A resets only `tool-call` and runs the two streamed calls of criterion 1, asserting their streamed results. Case B resets only `malformed-tool-call` and runs the two calls of criterion 2. Each case then reads only its own scenario's records. Case A's records are two, with steps 1 and 2. Case B's records are two, with steps 1 and 2 and attempts 1 and 2. |
| 6. "`npm run mock:openai` starts the server and prints its base URL." | `criterion 6: npm run mock:openai starts the server and prints its base URL` | `npm test -w @bbartolome/scriba-e2e -- -t "criterion 6"` | Spawns `npm run mock:openai` from the repo root, detached, so the whole process group can be killed. Within 15 s, stdout has a line `mock OpenAI base URL: http://127.0.0.1:<port>`. `GET <base>/__mock/scenarios/tool-call/requests` returns 200 and `[]`. After the process group is killed, `GET <base>/` refuses the connection. Test timeout 30 s. |

Matcher cases (not PLT-12 criteria). They run on `faults`, reset `matchers` as their first step, and read the `matchers` records. Each request below matches exactly the step named, so the record's `step` is checked. Command for all five: `npm test -w @bbartolome/scriba-e2e -- -t "matcher"` (five passed).

| Matcher | Test title | Assertions |
|---|---|---|
| `header` | `matcher: header matches only when the named header is present` | Call A, with the request header `x-mock-case: header`, messages `[user "hi"]`, returns `header-step`; its record has step 0. Call B, the same body with no such header, matches no step: the SDK rejects with `InternalServerError` (status 500), and its record has `step: null`. |
| `turnIndex` | `matcher: turnIndex counts the assistant messages of a chat request` | Messages `[user "hi", assistant "ok", user "turn-check"]`: returns `turn-step`, and the record has step 1. |
| `lastMessageRole` | `matcher: lastMessageRole matches the role of the last message` | Messages `[user "hi", tool "result"]` (with `tool_call_id` `call_x`): returns `role-step`, and the record has step 2. |
| `lastMessageContent` | `matcher: lastMessageContent matches a string or the joined text of array parts` | Call A, messages `[user "content-check"]`, returns `content-step`. Call B, messages `[user]` whose `content` is the parts `[{type "text", text "content-"}, {type "text", text "check"}]`, returns `content-step`. Both records have step 3. |
| `chunkDelayMs` | `matcher: chunkDelayMs waits before each streamed chunk` | Streamed call with messages `[user "chunk-check"]`: the collected content is `abc`, the record has step 4, and the elapsed time is at least 400 ms (three chunks, 150 ms before each). |

The full suite is `npm test -w @bbartolome/scriba-e2e`. It must show twelve passed (step 10).

## 5. Downstream agreement

Each unit below was read for the word "mock" (section 7). The needs are what each unit's own text asks of PLT-12.

- **GNP-02 (golden harness).** Needs: an in-process start that returns a base URL; one scenario file per tool at `scenarios/pack-<tool>.json` that the server loads; the recorded request body (the rendered prompt and the function schema) readable; a reset between tests. Provided by decisions 5, 6, 10 and 11 and the `GET`/`POST` endpoints. Its golden helper and the `--update-goldens` flag are GNP-02's own work.
- **GRR-04 (run engine).** Its criteria sit under the heading "Acceptance criteria (mock OpenAI server)", and its tool nodes call the TRG-12 executor, which calls the model. Needs: an in-process start with a per-test scenario and reset. Provided by decisions 5, 6 and 11. GRR-04's criteria name no other mock behaviour.
- **MPR-04 (OpenAI-compatible client).** Its scenario list (unit line 26) and its criteria (unit lines 29 to 35) need these, each provided:
  - streamed text, then a tool call, then a finish event (line 29, with fragments assembled by index at line 20): `toolCalls` with `deltas`, one call per index, with the role and type fields of decisions 23 and 24 (the helper check of criterion 1);
  - model lists non-empty, empty and failing: `endpoint: models` with `status` replies (decisions 7, 8, 9);
  - streamed tool call with split arguments, and the malformed tool call with invalid argument chunks: `toolCalls` (decision 9);
  - 401 without the expected key: a `header` matcher on `authorization`, with a fallback `status` 401 (decisions 7, 8; matcher case `header`);
  - 503 then 200, and persistent 503: `attempt` matchers and `status` replies; the records give the attempt count (decisions 8, 10);
  - 429 with `Retry-After`: `status` with headers (decision 9);
  - stall: a `delayMs` step, cancelled when the client closes (decision 10);
  - long stream for abort, and the slow stream with gaps: `stream` with `chunkDelayMs` (decision 9; matcher case `chunkDelayMs`);
  - "the mock sees the connection close": `closedByClient` (decision 10; tested by criterion 4);
  - "the mock sees the key only in Authorization": the recorded `headers` (decision 10).
  MPR-04 writes its own scenario files and their tests. MPR-04's plan must also pin `openai` in `apps/api` at the exact version in `e2e/package.json` (7.55.0 at planning), so the repository keeps one copy under the root `node_modules` (`npm ls openai` shows one copy, step 3). MPR-04's unit text names no version (`units/MPR-04-openai-compatible-client.md` line 18, "the official `openai` SDK"), so this is a requirement on MPR-04's plan, recorded from DECISIONS 2026-11-12 (Opus rejection 2, text 7). If MPR-04 pins another version, the two versions must be reconciled before either lock gate passes.
- **TRG-12 (executor).** Needs: one scenario file for a tool execution; non-streamed completions (`stream: false`), which decisions 9 and 24 render for both reply kinds; the recorded body, to check that the per-kind system message comes before the rendered prompt; zero records after a reset, for "the mock received no request"; `closedByClient`, for "an aborted call stops the model request (mock sees the close)". All provided.
- **AGL-08 (file-tools-chat gate).** Its scope (unit line 17) is a scenario for the "summarize my outline" turn: list, then read `sources/outline.md`, then text. It needs: a scenario file in `scenarios/`, beside the two shipped files, because unit line 25 says modules add scenarios additively, one file each (decision 15 keeps only the two shipped files in this unit); matchers on the turn (`turnIndex`, `toolResultPresent`, `lastMessageRole`, matcher cases); and the examples contract, because the scenario names nonfiction sample paths. Decision 14 applies from this unit: renaming a sample file updates that scenario in the same PR. AGL-08 names PLT-13 in `blocked_by`, which names PLT-12, so the dependency is transitive. Provided.
- **AGL-16 (grounding engine).** Its criteria sit under the heading "Acceptance criteria (mock extract and judge turns)", and its extract step (unit line 18) retries malformed JSON twice (criterion 4 of AGL-16). It needs: `attempt` matchers for the retries; `lastMessageContent` matchers to tell the fixed extract prompt from the judge prompt; the recorded body. Provided. AGL-16's `blocked_by` names only AGL-10 and AGL-12, not PLT-12 (open point 17).
- **PLT-13 (Playwright harness).** Needs: the mock started by the harness, either in-process or with `npm run mock:openai` and the printed base URL; a provider pointed at `…/scenario/<name>/v1`. Both provided (decisions 5, 4, 18). PLT-13 closes `phase:test-harness` together with PLT-12 (PLT-13 line 14), so PLT-12 must merge first (its `blocked_by` names PLT-11 and PLT-12). Hazard for PLT-13, not decided here: Vitest's default include and Playwright's default `testMatch` both match `*.test.ts` and `*.spec.ts`, so PLT-13's Playwright specs under `e2e/` must be scoped in its own config. PLT-12 adds no Vitest config. PLT-13 also edits the e2e workspace's `package.json` and `tsconfig.json` if it adds Playwright, so it rebases on this unit.

Apps/api consumers (MPR-04, GNP-02, AGL-16) import `startMockOpenAI` from `e2e/fixtures/mock-openai/server.mjs` with a static relative import. The sibling `server.d.mts` gives it types, and the probe in section 7 showed that apps/api's strict check accepts this import (open point 5).

## 6. Open points

Revision 3 changes (Opus rejection 2, DECISIONS 2026-11-12). Each is applied where it is named.
- **B1.** Wire format. The first streamed chunk carries `role: "assistant"`. A call's first chunk carries `type: "function"`, `index`, `id`, `function.name` and `function.arguments: ""`. A non-streamed reply carries `message.role` and `type: "function"` on every call (decisions 9, 23, 24). Criterion 1 adds the `stream().finalChatCompletion()` check (section 4). Criterion 2 checks `type` before it reads `.function.arguments`.
- **T2.** Step 3 runs a plain `npm install` (`e2e/package.json` already lists `@types/node`). The lock gate stops the run if the resolution moves an existing entry (section 3, steps 3 and 4).
- **T3.** Implementation runs in a fresh worktree, not the main checkout (section 3, preamble).
- **T4.** Step 12 names the banner-count command: `grep -o '^> @bbartolome/scriba-[a-z0-9]*' | sort -u | wc -l`, expecting 5 for each root command.
- **T5.** Five matcher cases (`header`, `turnIndex`, `lastMessageRole`, `lastMessageContent` with the array-parts rule of decision 8, and `chunkDelayMs`) on the test-only `matchers.json`. The total is twelve (section 3 step 10; section 4). Found while checking this: AGL-08 and AGL-16 use the mock, so section 5 covers them.
- **T6.** Section 7 corrects the `core/error.d.ts` citation (generic `THeaders`, and `RateLimitError` is `Headers`).
- **T7.** Section 5 records that MPR-04's plan must pin `openai` 7.55.0 in `apps/api`, so the repository keeps one copy.

Revision 2 changes (Opus rejection 1). Each is applied where it is named.
- **R1.** `server.d.mts` added to section 2 with the declarations, and open point 5 closed (decision 5, section 2, section 5, section 7).
- **R2.** `toolCalls` extended to `deltas` and `calls` (one call per index), with the non-streamed form and a content-then-tool-call check in criterion 1 (decisions 9 and 24, section 4). The MPR-04 citation is lines 29 to 35 (section 5).
- **R3.** The e2e workspace is type-checked: `e2e/tsconfig.json`, the `build` script, `@types/node` `^26.6.6` (no new lock entry), `-w @bbartolome/scriba-e2e` in the root `build`, and the build banner count of 5 (decisions 2, 17, 25; sections 2 and 3; open points 1 and 2).
- **R4.** Criterion 5 is two `test.concurrent` cases in one `describe`, each resetting only its own scenario. The shared `beforeEach` is removed (section 4, open point 12).
- **R5.** Step 0 checks `git merge-base --is-ancestor 339c716 HEAD` and `git diff --quiet 339c716 HEAD -- ':!plans'`, and leaves `plans/` out of the status check (section 3 step 0).
- **R6.** Criterion 1 asserts `client.models.list()` (section 4).
- **R7.** The SSE format, with fixed ids, `created` and call ids, and the `[DONE]` ending (decision 23).
- **R8.** One matching rule: a matcher on a field the request lacks never matches (decision 7). Decision 8 no longer gives a turn index for models requests.
- **R9.** `.mjs` files get no ESLint rules, because the config applies to `**/*.ts` only. The rule is stated in decision 19, and no rule is added.

1. **`e2e/` is a workspace.** Chosen so that root `npm test` runs the new tests without editing the root `test` line (decision 1). Cost: the `build`, `test` and `lint` banners go from 4 to 5. The count of 4 that PLT-11 checked (its AC 2) was true when PLT-11 merged, and it is superseded by this change. PLT-01 section 1 says "exactly four" workspaces, and PLT-01 section 5 expects this change. No standing test counts workspaces: `scripts/boundaries.test.mjs` (line 156) only checks that the lint-fixture folder is not a workspace. Not chosen: a root `test` script change, which DECISIONS 2026-11-11 forbids for PLT-12.
2. **e2e has a `build` script, a type check.** Root `build` names its workspaces explicitly (PLT-11), so the second command gains e2e (R3). The e2e build type-checks the tests and the declarations, so the workspace has the build/test/lint trio that PLT-01 section 2 asks for. Simplest option that gives the test file a type check.
3. **Vitest, not `node:test`.** The e2e tests run under Vitest, as `units/README.md` line 133 says. The `scripts/*.test.mjs` files stay on `node:test` (repo tooling, PLT-09 and PLT-11 precedent). Simplest option.
4. **Plain JavaScript server.** `server.mjs` and `cli.mjs` are `.mjs` with no build step, so `npm run mock:openai` runs with `node`. The tests are `.ts`, typed against `server.d.mts`. Simplest option.
5. **How apps import the mock. Decided.** Downstream tests use a static relative import of `startMockOpenAI` from `e2e/fixtures/mock-openai/server.mjs`, typed by the sibling `server.d.mts`. The probe in section 7 showed that apps/api's strict check accepts it. The server has no `exports` entry and no package name, because a configuration with no criterion behind it is not needed (R1).
6. **Matchers and fields beyond the unit's list, and which cases exercise them.** The unit's list is turn index, last message role and content, and tool result present. Added here: `attempt` (criterion 2 needs it, because the retry has the same turn index), `endpoint` (the models step), `header` (the 401 case of MPR-04) and the field `chunkDelayMs` (the slow stream of MPR-04). Criteria exercise `attempt`, `endpoint: chat`, `toolResultPresent`, `status` with headers, `delayMs`, `drop`, `stream`, `toolCalls` (with `deltas`) and `closedByClient`. The five matcher cases (T5) exercise `header`, `turnIndex`, `lastMessageRole`, `lastMessageContent` and `chunkDelayMs`. Not chosen: leaving them to MPR-04's own expand-change of this server.
7. **Delay as a step field.** The unit lists "a delay" as a reply. This plan puts `delayMs` on any step, so a stall is a long delay (decision 9). Simplest option.
8. **Test-only scenarios in a folder.** `test/scenarios/` is passed as `scenariosDir`. The alternative, scenario objects passed in code, would make the test scenarios not data files. Simplest option that keeps the data-file rule.
9. **`/v1/models` has no criterion of its own.** Criterion 1 calls `client.models.list()` (R6), so the route is exercised. The model-list scenarios of MPR-04 are tested by MPR-04.
10. **Unmatched requests and unknown scenarios** return 500 and 404 (decision 7, section 1 routes). The 500 is also checked by the `header` matcher case. Simplest option.
11. **Attempt counts are per endpoint.** A models request does not change the chat attempt count, so `attempt: 1` means the first chat request after a reset. Simplest option that keeps the retry test independent of models requests.
12. **Criterion 5 runs two concurrent cases (R4).** The two cases share the `shipped` server and run at the same time. Each resets only its own scenario at its start. The shared `beforeEach` is removed, because a reset in a hook of one concurrent case could run during the other case's requests. The criterion's wording ("two tests") is met by two `test.concurrent` cases.
13. **Loopback only, ephemeral port, no port option.** The CLI prints the URL it got, and a manual demo uses that URL. Simplest option.
14. **Process-group kill in criterion 6.** Killing `npm` alone may leave its `node` child running (ASSUMED, section 8), so the test starts `npm` detached and kills the group.
15. **Root README.** No text is added for `npm run mock:openai`, because no criterion asks for it. If the Navigator wants a line in the README, it is a separate small edit.
16. **Test timeouts.** Criterion 6 needs 30 s (npm start and the 15 s wait). Other cases use the Vitest default.
17. **AGL-16 names no PLT-12 dependency.** AGL-16's criteria use the mock (its heading, unit line 26), but its `blocked_by` names AGL-10 and AGL-12 only (line 7). This plan does not change AGL-16. Not decided here: the Navigator decides whether AGL-16 names PLT-12 in `blocked_by`.
18. **`lastMessageContent` on array parts.** The rule of decision 8 (the joined `text` fields, with no separator) is a choice made here. The Chat Completions API's own text parts are the only part type the mock reads. Simplest option.

## 7. Facts checked

- `main` was at `339c716` when this plan was written, and is now at `2e1a7df` (DECISIONS records only). `339c716` is the last commit that changed code. `git merge-base --is-ancestor 4f9007b main` exits 0, so PLT-11 is on `main`. `git merge-base --is-ancestor 339c716 HEAD` exits 0, and `git diff --quiet 339c716 HEAD -- ':!plans'` exits 0. Only `plans/PLT-12.md` is untracked.
- `e2e/` holds only `.gitkeep` (`git ls-files e2e`). `examples/` holds only `.gitkeep` (`find examples`). `find apps packages scripts e2e examples -iname '*mock*'` finds nothing, and `grep -ril openai apps packages scripts e2e` (excluding `node_modules`) finds nothing, so no mock or OpenAI code exists yet. `node_modules/openai` is absent (`ls node_modules`). Installed: `vitest` 5.1.0, `typescript` 6.0.3.
- `node_modules/@types/node` is absent from the working tree (`ls node_modules/@types/node` fails), but `package-lock.json` line 4987 has `node_modules/@types/node` 26.6.6. The working tree's `node_modules` predates that lock entry, which is why implementation runs in a fresh worktree (section 3). The `types: ["node"]` setting is therefore type-checked at step 9, not here (ASSUMED in section 8).
- `tsconfig.base.json`: `strict`, `skipLibCheck`, `target` `ES2022`, `module` and `moduleResolution` `NodeNext`. `apps/api/tsconfig.json` extends it, sets `types` `["node"]`, and includes `src` and `test`. `apps/api/tsconfig.build.json` includes only `src`.
- Probe (temporary directory outside the repo, deleted afterwards, repo tsc 6.0.3, strict NodeNext, no `types` setting because of the point above):
  - A static import of a `.mjs` with a sibling `.d.mts`, from `apps/api/test/*.ts` (apps/api has no `type` field, so its `.ts` files are CommonJS): `tsc --noEmit -p apps/api/tsconfig.json` exits 0.
  - The same import from an e2e package with `"type": "module"`, with `import.meta.url`: exits 0.
  - The same file in an e2e package without `"type": "module"`: `error TS1470: The 'import.meta' meta-property is not allowed in files which will build into CommonJS output`. So `"type": "module"` is needed (decision 3).
- `eslint.config.mjs`: the two rule objects have `files: ['**/*.ts']` (lines 17 and 21). The root `eslint.config.mjs` ignores `**/dist/**`, `**/node_modules/**`, `**/.angular/**` and `lint-fixtures/**`.
- Root `package.json`: `workspaces` is `packages/contracts`, `apps/api`, `apps/web`, `packages/packs`. `build` is `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api -w @bbartolome/scriba-web -w @bbartolome/scriba-packs`. `test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'`. `lint` is `npm run lint --workspaces && prettier --check .`. `engines` is `>=26 <27`. There is no `mock:openai` script. Root devDependencies are exact.
- `packages/packs/package.json`: `test` is `vitest run`, `lint` is `eslint .`, and it has no `vitest` dependency of its own. `apps/api/package.json` uses ranges for most packages (`"@nestjs/common": "^12"`) and pins `"yaml": "2.9.1"` exactly; decision 2 cites only the root devDependencies.
- The fan-out needs every workspace to have the script. A probe in a temporary two-workspace project (npm 11.20.0) printed `npm error Missing script: "lint"` and exited 1 for `npm run lint --workspaces`.
- `scripts/pins.test.mjs` imports `node:test`. `grep -n workspace scripts/*.mjs` finds no workspace-count assertion; `scripts/boundaries.test.mjs` lines 145 to 159 check only that `lint-fixtures` is not a workspace.
- `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm test` and `npm run build` (lines 25 to 31), so the e2e tests and the e2e type check run in CI.
- `.prettierignore` lists `/units/`, `/modules/`, `/plans/` and `/package-lock.json`. `npx prettier --check package.json` passes.
- `openai` on npm: `dist-tags.latest` is `7.55.0`, with `engines` `{"node": ">=22.0.0"}` (`npm view`). The packed tarball (`npm pack openai@7.55.0`) has no `dependencies`. Its `peerDependencies` are all optional (`ws`, `zod`, `undici` and others). The package ships `index.d.mts`, so NodeNext ESM imports type-check.
- SDK facts, from the packed 7.55.0 tarball:
  - Streaming helper: `resources/chat/completions/completions.d.ts` line 138, `stream<Params …>(body, options?)`, and `finalChatCompletion` declared in `lib/AbstractChatCompletionRunner.d.ts`. The helper's checks are `lib/ChatCompletionStream.js` line 1599 (`missing role for choice ${index}`) and line 1088 (`tool call snapshot missing \`type\``).
  - Tool calls: `resources/chat/completions/completions.d.ts` line 1461, `ChatCompletionMessageToolCall = ChatCompletionMessageFunctionToolCall | ChatCompletionMessageCustomToolCall`.
  - Non-streamed and streamed create overloads: `stream?: false | null` at line 2210, `stream: true` at line 2223.
  - Per-request options: `internal/request-options.d.ts` line 32 `headers?: HeadersLike`, line 56 `signal?: AbortSignal`.
  - Errors, `core/error.d.ts`: line 4 declares `APIError<TStatus, THeaders extends Headers | undefined = Headers | undefined, TError …>`, and line 8 is `readonly headers: THeaders;`, a generic type parameter, so `headers` is `Headers | undefined` on a bare `APIError`. The subclasses fix it: `APIConnectionError` is `APIError<undefined, undefined, undefined>` (line 24), so its `headers` is `undefined`. `RateLimitError` is `APIError<429, Headers>` (line 47), and `InternalServerError` is `APIError<number, Headers>` (line 49), so their `headers` is `Headers`. `index.d.ts` line 7 exports `APIConnectionError`, `RateLimitError`, `InternalServerError` and `APIUserAbortError`.
  - `azure.js` line 25 documents `maxRetries` as defaulting to `2`.
- Unit lines: PLT-12 front matter (lines 2 to 9), Decisions (lines 20 to 28), criteria (lines 31 to 36). PLT-01 unit lines 23 (e2e), 26 (tooling), 27 (dev library) and 31 (scope, `mock:openai`). PLT-13 lines 7 (`blocked_by`), 14 (closes `phase:test-harness`) and 26 (root `e2e` script). GNP-02 line 7 (`blocked_by`) and lines 16 to 20 (mock, scenario convention). GRR-04 line 7 and line 29 (heading). MPR-04 line 7, line 18 (the official `openai` SDK, no version), line 20 (tool-call fragments assembled by index), line 26 (scenario list) and lines 29 to 35 (criteria, the first being text deltas, then a tool call, then a finish event). TRG-12 line 7, line 33 (scenario) and lines 37 to 39 (criteria). AGL-08 line 7 (`blocked_by` PLT-13 among others) and line 17 (the "summarize my outline" scenario, naming sample paths). AGL-16 line 7 (`blocked_by` AGL-10 and AGL-12 only), line 18 (extract step with two retries) and line 26 (heading "mock extract and judge turns"). Each of GNP-02, GRR-04, MPR-04, TRG-12 and PLT-13 names PLT-12 in `blocked_by`, which matches PLT-12's `unblocks`.
- `units/README.md` line 126 (HTTP convention) and line 133 (testing convention). `modules/platform.md` lines 57 and 58 (testing principles, Vitest everywhere).
- `plans/PLT-01.md` section 1 line 22 (Prettier scope) and line 23 (workspace versions), section 2 line 40 (fan-out without `--if-present`), section 5 line 113 (PLT-12: `e2e/` workspace or root test script).
- DECISIONS entries: "2026-11-10 — PLT-01 — Prettier scope" (line 48); "2026-11-11 — batch [PLT-02, PLT-03, PLT-09, PLT-10] — root test script: one quoted glob" (lines 162 and 164); "2026-11-11 — PLT-02 — lockfile gate at the batch collection" (the lockfile rule); "2026-11-12 — PLT-12 — Opus plan review of revision 2" (commit c1dac25, the rejection that this revision answers).
- Node `v26.13.0` and npm `11.20.0` are on the PATH.

## 8. Assumed

- ASSUMED: the `openai` SDK throws `APIConnectionError` for a socket destroyed before the response starts when `maxRetries` is 0. Criterion 3's case checks it.
- ASSUMED: the SDK's `signal` abort rejects the call. Criterion 4's case checks that it rejects and that the server records `closedByClient`.
- ASSUMED: Node's `res` emits `close` when the client disconnects, and `writableEnded` is false then. Criterion 4 checks it.
- ASSUMED: Vitest 5.1.0 runs `.ts` tests with `import.meta.url`, and `-t` takes a title substring that npm passes through after `--`. Checked at step 10.
- ASSUMED: `npm run` adds the root `node_modules/.bin` to the PATH of a workspace, so `vitest run` resolves in `e2e/` (the `packages/packs` precedent). Checked at step 12.
- ASSUMED: npm hoists `openai` to the root `node_modules`, so the test imports resolve. Checked at step 4.
- ASSUMED: a plain `npm install` (step 3) resolves `openai` to 7.55.0 and `@types/node` to 26.6.6 without moving any existing package entry. Checked by the lock gate of step 4, which stops the run if it does not hold.
- ASSUMED: `types: ["node"]` in `e2e/tsconfig.json` type-checks once `@types/node` 26.6.6 is installed, as the probe could not test it (the working tree lacks the package). Checked at step 9.
- ASSUMED: ESLint reports no error for the `.mjs` files that no config object matches, under `eslint .` in e2e. Checked at step 10 (the lint run of step 12).
- ASSUMED: killing a detached process group also stops the `node` child of `npm run mock:openai`. Checked by criterion 6's last assertion.
- ASSUMED: `client.chat.completions.stream(...).finalChatCompletion()` returns the accumulated `content` and `tool_calls` for the chunk shape of decision 23. Checked by criterion 1 (c).
- Not verified: no test has been run, and nothing is installed for `openai` yet. The Angular and CI results are outside this unit.
