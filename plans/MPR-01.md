---
id: MPR-01
status: done
---
# MPR-01 plan — providers contract slice (closes Model providers phase:contract)

Batch: MPR-01 alone (Model providers, phase:contract, M1, main track; the gate unit of its phase, units/README.md line 88). Revision 2: applies the Opus rejection of revision 1 (plans/DECISIONS.md, "2026-11-13 — MPR-01 — Opus plan review of revision 1", commit 2a9f664), approved by Opus with four text fixes (commit 81203f1). Later text changes: c1d4804 and the coordinator entry (DECISIONS line 1843, D-a, D-b, D-c) applied in sections 1b (SD3, SD14), 2 (config.ts, defaults.ts and examples.ts bullets), 3 (resume state, stop rule (c), step 13), 4 (the SD3 test row), 4a, 5 (MPR-02, MPR-06, MPR-09 rows), open point 5, 7a and 7b. The error statuses (1bef5ff) are in sections 1a, 1b (SD10), 2, 3, 4, 4a, 5 and open point 1. Written against `main` at `2a9f664`; `main` head is `cd0fd53` (section 7a lists the commits). The branch `unit/MPR-01` exists at `50c66c2` (section 3). Nothing was built, installed, tested, committed or pushed while writing this revision. Status is `draft`; the orchestrator sets `planned` after Opus approves.

Revision 2 changes, by the rejection's item number:
- Item 1 (criterion 3): a type-level test over every response type, with a recursive deep-key helper; a runtime walk through object, array, optional, nullable and union wrappers; `effectiveModelQuerySchema` in the request-side check. Section 4, criterion 3, and SD19.
- Item 2 (three GET responses): `providerListSchema`, `presetListSchema`, `appDefaultSchema`, each with a type, a section 4a name and an example. SD17. Command responses are fixed too (SD18), because a key-set response is a response type.
- Item 3 (timeout): `timeout` is an integer ≥ 0. Section 1a, SD4, a new test, and open point 8.
- Item 4 (connection-test error): `{code: providerErrorCodeSchema, message, hint?}`, with a test that rejects a non-PROVIDER code. SD9, section 4.
- Item 5 (open point 1): the edits each option makes to sections 2, 4 and 4a. No option was chosen in revision 2; the Navigator settled it afterwards (open point 1).
- Item 6 (MPR-10): Ollama detection by port 11434 or the `ollama` id prefix, no contract change. Section 5.
- Item 7 (CommonJS citation): DECISIONS 2026-11-11 lines 172 to 174. Sections 1a and 7a.
- Item 8 (type list): `KeyClearRequest`, `EffectiveModelQuery` and `ProviderErrorCode` added. SD19 and section 4.

Source tags used below: **unit** = `units/MPR-01-contract-slice.md` (line numbers); **module** = `modules/providers.md`; **DEC** = `plans/DECISIONS.md`. Section 7 marks each fact as checked (7a) or assumed (7b).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, or the repo

- Contract slice only: Zod schemas, inferred TS types, shapes and constants. No runtime logic beyond them. Source: unit 14.
- Provider config is a Zod discriminated union on `kind`, one member `openai-compatible` in v1, with fields `{id, kind, baseURL, model, temperature, contextSize, maxTokens, timeout, retries, keyRef?}`. Source: unit 17; module 35.
- `id` is a unique slug chosen at creation (preset id plus a suffix if taken) and stable thereafter. The creation logic belongs to MPR-02. Source: unit 18.
- `model` may be empty, meaning the provider's own default. Source: unit 19, 32.
- `temperature` and `maxTokens` are sent per request. `contextSize` is metadata for budgeting and the Ollama hint, and is not sent. Source: unit 20.
- `timeout` (ms) is an integer ≥ 0, and `retries` is an integer ≥ 0. Source: unit 21 ("`timeout` (ms) ≥ 0, `retries` ≥ 0 integers"). The plural covers both fields, as the Opus rejection reads it.
- `keyRef` is an opaque reference into the secrets file, absent for keyless providers. Source: unit 22; module 36.
- Read view is the config plus `keySet: boolean` and `keyHint?` (last four characters). No raw key field. Source: unit 23; module 36.
- Defaults constants: temperature 0.7, contextSize 64000, maxTokens 4096, timeout 120000, retries 2. Source: unit 24.
- Four presets, each `{id, label, baseURL, keyRequired, hints}`: Ollama `http://host.docker.internal:11434/v1`, no key; LM Studio `http://host.docker.internal:1234/v1`, no key; OpenAI `https://api.openai.com/v1`, key; OpenRouter `https://openrouter.ai/api/v1`, key. Source: unit 25 to 29.
- Model list response: sorted model ids. Source: unit 30.
- Connection test: request `{providerId} | {draft: ProviderConfigInput}` plus an optional test-only `key`. Result `{ok, stage: 'reach'|'list'|'chat', latencyMs, modelCount?, error?: {code, message, hint?}}`. Source: unit 31.
- `ModelChoice` is `{providerId, model}`. It is the app default request and the per-project override set request. Effective-model response is `{choice, source: 'project'|'app'|'auto', contextSize, warning?}`. Source: unit 32.
- Write-only key requests: set `{providerId, key}`, clear `{providerId}`. Source: unit 33.
- `providers` settings section `{schemaVersion: 1, list: ProviderConfig[], appDefault: ModelChoice | null}`, and a contract example of the seeded section. Source: unit 34; module 37.
- Error codes: `PROVIDER_UNREACHABLE`, `PROVIDER_UNAUTHORIZED`, `PROVIDER_MODEL_NOT_FOUND`, `PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMITED`, `PROVIDER_BAD_RESPONSE`, `PROVIDER_ABORTED`, `PROVIDER_NOT_CONFIGURED`, `PROVIDER_DEFAULT_IN_USE` (409) and `PROVIDER_NOT_FOUND`. Statuses (Navigator option A): `PROVIDER_UNREACHABLE` 502, `PROVIDER_UNAUTHORIZED` 502, `PROVIDER_MODEL_NOT_FOUND` 502, `PROVIDER_TIMEOUT` 504, `PROVIDER_RATE_LIMITED` 503, `PROVIDER_BAD_RESPONSE` 502, `PROVIDER_ABORTED` 409, `PROVIDER_NOT_CONFIGURED` 409, `PROVIDER_DEFAULT_IN_USE` 409, `PROVIDER_NOT_FOUND` 404. No PROVIDER code is 401. Source: unit lines 39 to 48 (statuses) and unit line 35 (codes); DECISIONS line 1765. Format is platform's `errorCodeSchema`; modules/platform.md line 37 (SCREAMING_SNAKE with a module prefix); platform `ERROR_CODE_PREFIXES` includes PROVIDER (src/platform/errors.ts line 8).
- Route constants under `/api/providers/`. Source: unit 51.
- Acceptance criteria are unit 54 to 57 (heading at unit line 53). Section 4 maps each to tests.
- No SSE events in v1. Source: module 39.
- Client interface types (messages, stream events) are in-process TypeScript and are not part of this slice. MPR-04 owns them. Source: module 40.
- The project override `{providerId, model}` is defined by the Project store (PST-01) and must match `ModelChoice`, with the type-level test in MPR-12. The Project store must not import `/providers`. Source: module 38; PST-01 unit 14 and 23.
- Methods: reads are GET and never mutate; every command is POST; no PUT, PATCH or DELETE. Source: module 39; src/platform/http.ts line 6.
- Keys live only in the secrets file. No API returns a key. Reads show `keySet` and a masked hint. Source: module 36.
- Zod is the package's only runtime dependency. Source: PLT-02 criterion 3 (plans/PLT-02.md section 4); test/package-deps.test.ts lines 40 to 52; DEC 2026-11-10 zod entry.
- Output format is CommonJS. Source: DEC 2026-11-11 lines 172 to 174 (Navigator decision, option A; the heading at line 170 carries no ruling).
- Shell browser code imports contracts type-only, so no runtime zod enters the browser bundle. Source: DEC 2026-11-13 line 1084. Its effect on `/providers` consumers is open point 3.
- The package `build` and `test` scripts do not change. Source: packages/contracts/package.json lines 48 and 49.
- Every response type of this slice is covered by the type-level test and the runtime walk of criterion 3. Source: unit 56.

### 1b. Small decisions made here (the unit and module do not settle them)

- **SD1 Layout.** Nine files under `packages/contracts/src/providers/`: `errors.ts`, `routes.ts`, `defaults.ts`, `config.ts`, `model.ts`, `connection-test.ts`, `keys.ts`, `settings.ts` and `examples.ts`. `index.ts` re-exports them with `export * from './<file>.js'`, as setup-auth does (src/setup-auth/index.ts lines 1 to 7). Placement: `presetListSchema` in `defaults.ts`; `providerListSchema` in `config.ts`; `appDefaultSchema`, `effectiveModelSourceSchema` and `effectiveModelQuerySchema` in `model.ts`; `connectionTestStageSchema` and `connectionTestErrorSchema` in `connection-test.ts`.
- **SD2 Input and stored shapes.** `openaiCompatibleSchema` is the stored member: all config fields, plus `id` and an optional `keyRef`. `openaiCompatibleInputSchema` has the config fields without `id` and `keyRef`, every field required, and no Zod defaults. The unit names `ProviderConfigInput` without defining it. Defaults are applied by the UI (MPR-09 prefills them) and by MPR-02's seeding, both from `PROVIDER_DEFAULTS`. `providerConfigInputSchema` is a one-member discriminated union of the input member.
- **SD3 Bodies.** Update body: `openaiCompatibleInputSchema.partial()`. Create body: `openaiCompatibleInputSchema` extended with an optional `presetId` and an optional `label` (Navigator decision, DECISIONS c1d4804). A body must carry at least one of them (D-a; the coordinator entry "MPR-01 — Coordinator decisions D-a, D-b and D-c on the create body", DECISIONS line 1843): `providerCreateSchema` is refined with `.refine(b => b.presetId !== undefined || b.label !== undefined)`, and a body with neither is refused. The refined schema stays a `ZodObject`, so the criterion 3 walk is unaffected (section 7b). `presetId` is one of the four preset ids (D-b): `z.enum(PROVIDER_PRESET_IDS)`, where `PROVIDER_PRESET_IDS` is `['ollama', 'lm-studio', 'openai', 'openrouter'] as const` in `defaults.ts`, the ids of `PROVIDER_PRESETS`. So `presetId: '!!!'` is refused. The stored config has no preset field (unit 17), so `presetId` is not stored, and `label` is not stored either. The id base is `presetId` when given, else the slug of `label`, normalized to the SD4 rule, with a suffix if taken (unit 18; `units/MPR-02-registry-seeding.md` line 23). The slug rule is ASCII-only (D-c): MPR-02 lowercases the label, turns each run of characters other than a–z and 0–9 into one hyphen, and trims leading and trailing hyphens. The contract requires a non-empty `label` with at least one ASCII letter or digit (`z.string().min(1).regex(/[A-Za-z0-9]/)`), so the slug of a valid label is never empty (decided by the coordinator; open point 5).
- **SD4 Bounds the unit does not give.** `id` matches `^[a-z0-9][a-z0-9-]*$`, the entity-id rule of PST-08 (unit line 22). `keyRef` is a non-empty string. `baseURL` is `z.url()`, as setup-auth/tailscale.ts lines 22 and 24 use; the scheme is not restricted (open point 6). `timeout` is `z.number().int().min(0)` (revision 2, item 3). `retries` is `z.number().int().min(0)`. `contextSize` and `maxTokens` are positive integers. `temperature` is a number with no range.
- **SD5 Read view.** `openaiCompatibleReadSchema` is the stored member extended with `keySet: boolean` and an optional `keyHint` (non-empty, at most four characters). `keyRef` stays in the read view, because it is config (unit 23) and an opaque reference, not a key.
- **SD6 Model list.** `modelListSchema` is `{models: string[]}`. The wrapper leaves room for later fields. Sorting is the server's job (MPR-05), not the schema's.
- **SD7 ModelChoice.** `providerId` is a non-empty string. `model` is a string and may be empty.
- **SD8 Effective model.** `EFFECTIVE_MODEL_SOURCES = ['project', 'app', 'auto'] as const`, with `effectiveModelSourceSchema = z.enum(EFFECTIVE_MODEL_SOURCES)`. `warning` is an optional string. `effectiveModelQuerySchema` is `{projectId?}` with a non-empty string.
- **SD9 Connection test.** The request is a union of two `z.strictObject`s: `{providerId, key?}` and `{draft: providerConfigInputSchema, key?}`. Strictness makes the two forms exclusive. The result is `{ok: boolean, stage, latencyMs, modelCount?, error?}`:
  - `stage` is `connectionTestStageSchema = z.enum(CONNECTION_TEST_STAGES)`, with `CONNECTION_TEST_STAGES = ['reach', 'list', 'chat'] as const`.
  - `latencyMs` is a number ≥ 0.
  - `modelCount` is an integer ≥ 0, optional.
  - `error` is `connectionTestErrorSchema = {code: providerErrorCodeSchema, message: string, hint?: string}` (revision 2, item 4). The code must be a PROVIDER code.

  The contract does not enforce that `ok` and `error` agree; MPR-07's tests do.
- **SD10 Error codes.** `PROVIDER_ERROR_CODES` maps short names to codes, as `SETUP_AUTH_ERROR_CODES` does (src/setup-auth/errors.ts lines 3 to 11): `UNREACHABLE`, `UNAUTHORIZED`, `MODEL_NOT_FOUND`, `TIMEOUT`, `RATE_LIMITED`, `BAD_RESPONSE`, `ABORTED`, `NOT_CONFIGURED`, `DEFAULT_IN_USE`, `NOT_FOUND`. `PROVIDER_ERROR_CODE_VALUES` is a separate `as const` tuple of the ten code strings, and `providerErrorCodeSchema = z.enum(PROVIDER_ERROR_CODE_VALUES)`. The tuple is separate because `z.enum` needs a literal tuple, and `Object.values` is not typed as one. The providers slice imports only zod. Platform's pattern is checked in the test instead. The status table is the Navigator's option A (plans/DECISIONS.md 1bef5ff), one status per code: `PROVIDER_UNREACHABLE` 502, `PROVIDER_UNAUTHORIZED` 502, `PROVIDER_MODEL_NOT_FOUND` 502, `PROVIDER_TIMEOUT` 504, `PROVIDER_RATE_LIMITED` 503, `PROVIDER_BAD_RESPONSE` 502, `PROVIDER_ABORTED` 409, `PROVIDER_NOT_CONFIGURED` 409, `PROVIDER_DEFAULT_IN_USE` 409, `PROVIDER_NOT_FOUND` 404. `PROVIDER_ERROR_STATUS` holds these values, keyed by the full code. No PROVIDER code is 401, because the Shell sends every HTTP 401 to `/setup` (apps/web/src/app/shell/api-client.ts lines 104 and 105).
- **SD11 Routes.** Twelve constants:
  - `PROVIDERS_ROUTE` `/api/providers` (GET list, POST create).
  - `PRESETS_ROUTE` `/api/providers/presets` (GET).
  - `APP_DEFAULT_ROUTE` `/api/providers/app-default` (GET read, POST set).
  - `PROVIDER_UPDATE_ROUTE` `/api/providers/:id/update` (POST).
  - `PROVIDER_DELETE_ROUTE` `/api/providers/:id/delete` (POST).
  - `MODELS_ROUTE` `/api/providers/:id/models` (GET).
  - `KEY_SET_ROUTE` `/api/providers/key/set` (POST, body `{providerId, key}`).
  - `KEY_CLEAR_ROUTE` `/api/providers/key/clear` (POST, body `{providerId}`).
  - `CONNECTION_TEST_ROUTE` `/api/providers/test` (POST).
  - `EFFECTIVE_MODEL_ROUTE` `/api/providers/effective-model` (GET, optional `projectId` query).
  - `PROJECT_MODEL_ROUTE` `/api/providers/project-model` (POST set on the active project, body `ModelChoice`).
  - `PROJECT_MODEL_CLEAR_ROUTE` `/api/providers/project-model/clear` (POST, no body).

  Reason: commands are POST (module 39), so update and delete take a suffix. The repo uses the same form for sub-actions, for example `POST …/runs/stop` (units/AGL-03 line 24). The override set and clear act on the active project (MPR-12, Decisions), so the path has no project id. `app-default` shares one path for GET and POST, as `PREFERENCES_ROUTE` does (src/setup-auth/routes.ts line 14). The GET and POST pair on preferences is stated in units/SAU-09 line 20.
- **SD12 Presets and hints.** `PROVIDER_PRESETS` is an array of four `Preset` objects in unit order, with ids `ollama`, `lm-studio`, `openai` and `openrouter`. Hints are strings. Ollama: "Context length is set in Ollama, not in Scriba." and "Pull a model on the host with `ollama pull <model>`." LM Studio: "Start the local server and load a model in LM Studio." OpenAI and OpenRouter: none. The wording is a draft (open point 7).
- **SD13 Defaults.** `PROVIDER_DEFAULTS` is an `as const` object with the five keys in unit order.
- **SD14 Examples and example table.** `PROVIDERS_EXAMPLES` holds the example payloads used by the tests. The examples test pairs each key with its schema using the table below, and fails when a key of `PROVIDERS_EXAMPLES` has no row or a row has no key. `seededSection` is built from `PROVIDER_PRESETS` and `PROVIDER_DEFAULTS`, so it cannot drift from the constants. It holds one Ollama provider with id `ollama`, no `keyRef`, and `appDefault: {providerId: 'ollama', model: ''}`.

  | Example key | Schema | Value |
  |---|---|---|
  | `ollamaProvider` | `providerConfigSchema` | the seeded Ollama member: id `ollama`, the Ollama preset URL, empty model, the five defaults, no `keyRef` |
  | `openRouterProvider` | `providerConfigSchema` | id `openrouter`, the OpenRouter preset URL, the five defaults, `keyRef: 'openrouter-1'` |
  | `ollamaRead` | `providerReadSchema` | `ollamaProvider` plus `keySet: false` |
  | `openRouterRead` | `providerReadSchema` | `openRouterProvider` plus `keySet: true` and `keyHint: '3f9x'` |
  | `createFromPreset` | `providerCreateSchema` | `{presetId: 'openrouter', kind: 'openai-compatible', baseURL: 'https://openrouter.ai/api/v1', model: '', temperature: 0.7, contextSize: 64000, maxTokens: 4096, timeout: 120000, retries: 2}` |
  | `createFromLabel` | `providerCreateSchema` | `{label: 'My Local Llama', kind: 'openai-compatible', baseURL: 'http://localhost:9000/v1', model: '', temperature: 0.7, contextSize: 64000, maxTokens: 4096, timeout: 120000, retries: 2}` |
  | `updateModel` | `providerUpdateSchema` | `{model: 'llama3.1'}` |
  | `providerList` | `providerListSchema` | `{providers: [ollamaRead, openRouterRead]}` |
  | `seededSection` | `providersSectionSchema` | `{schemaVersion: 1, list: [ollamaProvider], appDefault: {providerId: 'ollama', model: ''}}` |
  | `presetList` | `presetListSchema` | `{presets: PROVIDER_PRESETS}` |
  | `appDefault` | `appDefaultSchema` | `{appDefault: {providerId: 'ollama', model: ''}}` |
  | `appDefaultUnset` | `appDefaultSchema` | `{appDefault: null}` |
  | `modelChoice` | `modelChoiceSchema` | `{providerId: 'ollama', model: ''}` |
  | `effectiveModelApp` | `effectiveModelSchema` | choice Ollama with empty model, `source: 'auto'`, `contextSize: 64000` |
  | `effectiveModelProject` | `effectiveModelSchema` | choice `{providerId: 'openrouter', model: 'openai/gpt-4o-mini'}`, `source: 'project'`, `contextSize: 64000` |
  | `effectiveModelWarning` | `effectiveModelSchema` | choice Ollama with empty model, `source: 'app'`, `warning` text |
  | `effectiveModelQuery` | `effectiveModelQuerySchema` | `{projectId: 'sample-project'}` |
  | `modelList` | `modelListSchema` | `{models: ['gemma3', 'llama3.1', 'qwen2.5']}`, sorted |
  | `keySetRequest` | `keySetRequestSchema` | `{providerId: 'openrouter', key: 'key-example-0001'}` |
  | `keyClearRequest` | `keyClearRequestSchema` | `{providerId: 'openrouter'}` |
  | `connectionTestById` | `connectionTestRequestSchema` | `{providerId: 'ollama'}` |
  | `connectionTestByDraft` | `connectionTestRequestSchema` | `{draft: the OpenRouter input with the five defaults, key: 'key-example-0001'}` |
  | `connectionTestOk` | `connectionTestResultSchema` | `{ok: true, stage: 'chat', latencyMs: 412, modelCount: 3}` |
  | `connectionTestUnreachable` | `connectionTestResultSchema` | `{ok: false, stage: 'reach', latencyMs: 2000, error: {code: 'PROVIDER_UNREACHABLE', message, hint}}` |

  The keys above are the complete `PROVIDERS_EXAMPLES`. The key example values use an obviously fake key.
- **SD15 Schema names.** Each exported schema has an inferred type with the PascalCase name, for example `providerConfigSchema` gives `ProviderConfig`. This follows setup-auth/settings.ts lines 31 to 33.
- **SD16 Not in this slice.** No event schemas (module 39). No client message or stream types (module 40).
- **SD17 GET responses (revision 2, item 2).** One wrapper per GET route, following SD6. The wrapper decision is mine; the rejection asked for it to be stated.
  - `providerListSchema = {providers: providerReadSchema[]}` for GET `/api/providers`. Type `ProviderList`. Examples `PROVIDERS_EXAMPLES.providerList` (one `ollamaRead`) and section 4a name `providerListSchema`.
  - `presetListSchema = {presets: presetSchema[]}` for GET `/api/providers/presets`. Type `PresetList`. Example `PROVIDERS_EXAMPLES.presetList` (the four presets). Section 4a name `presetListSchema`.
  - `appDefaultSchema = {appDefault: modelChoiceSchema | null}` for GET `/api/providers/app-default`. Type `AppDefault`. Examples `PROVIDERS_EXAMPLES.appDefault` (`{appDefault: {providerId: 'ollama', model: ''}}`) and `PROVIDERS_EXAMPLES.appDefaultUnset` (`{appDefault: null}`). Section 4a name `appDefaultSchema`.

  The wrapper keeps the `appDefault` body an object like the other GETs. A bare array would have no room for fields such as a count.
- **SD18 Command responses (revision 2, item 2).** Each command returns what the UI shows next, and only the response types of SD17 and this list appear:
  - Create (POST `/api/providers`) and update (POST `/api/providers/:id/update`) return `providerReadSchema`.
  - Key set and key clear return `providerReadSchema`, so the panel shows `keySet` and the masked hint at once (MPR-09 criterion).
  - App default set (POST `/api/providers/app-default`) returns `appDefaultSchema`.
  - Delete, project-model set and project-model clear return no body. The UI re-reads with GET.
  - Connection test returns `connectionTestResultSchema` (SD9).
  - Model list, presets, providers and effective model are GET only.
- **SD19 Type list (revision 2, item 8).** Section 4 asserts that each of these 25 exported types equals the inferred type of its schema: `ProviderConfig`, `OpenAICompatibleConfig`, `OpenAICompatibleInput`, `OpenAICompatibleRead`, `ProviderConfigInput`, `ProviderRead`, `ProviderList`, `ProviderCreate`, `ProviderUpdate`, `Preset`, `PresetList`, `ModelChoice`, `AppDefault`, `EffectiveModelSource`, `EffectiveModel`, `EffectiveModelQuery`, `ModelList`, `ConnectionTestStage`, `ConnectionTestError`, `ConnectionTestRequest`, `ConnectionTestResult`, `KeySetRequest`, `KeyClearRequest`, `ProvidersSection`, `ProviderErrorCode`.

## 2. Files to change

Only these paths change. Nothing else changes: `package.json`, `package-lock.json`, the tsconfig files, `src/platform/*`, `src/setup-auth/*`, the other `src/<slug>/` placeholders, `test/boot.test.ts`, `test/package-deps.test.ts`, `scripts/*`, `apps/*`, `e2e/*`, `units/*` and `plans/*`. The implementation driver records decisions in `plans/DECISIONS.md` and ticks the unit's criteria; neither is in this list.

- `packages/contracts/src/providers/index.ts` (edit: replaces `export {};` on line 1 with re-exports of the nine files below)
- `packages/contracts/src/providers/errors.ts` (new: `PROVIDER_ERROR_CODES`, `PROVIDER_ERROR_CODE_VALUES`, `providerErrorCodeSchema`, and `PROVIDER_ERROR_STATUS`, the ten statuses of SD10: `PROVIDER_UNREACHABLE` 502, `PROVIDER_UNAUTHORIZED` 502, `PROVIDER_MODEL_NOT_FOUND` 502, `PROVIDER_TIMEOUT` 504, `PROVIDER_RATE_LIMITED` 503, `PROVIDER_BAD_RESPONSE` 502, `PROVIDER_ABORTED` 409, `PROVIDER_NOT_CONFIGURED` 409, `PROVIDER_DEFAULT_IN_USE` 409, `PROVIDER_NOT_FOUND` 404)
- `packages/contracts/src/providers/routes.ts` (new: the twelve route constants of SD11)
- `packages/contracts/src/providers/defaults.ts` (new: `PROVIDER_DEFAULTS`, `PROVIDER_PRESET_IDS`, `presetSchema`, `PROVIDER_PRESETS`, `presetListSchema`)
- `packages/contracts/src/providers/config.ts` (new: `openaiCompatibleSchema`, `openaiCompatibleInputSchema`, `openaiCompatibleReadSchema`, `providerConfigSchema`, `providerConfigInputSchema`, `providerReadSchema`, `providerListSchema`, `providerCreateSchema` (gains the optional `label` (non-empty, at least one ASCII letter or digit), the `presetId` enum (`PROVIDER_PRESET_IDS`) and the at-least-one refine (SD3; decision c1d4804 and the coordinator entry D-a, D-b and D-c, DECISIONS line 1843)), `providerUpdateSchema`)
- `packages/contracts/src/providers/model.ts` (new: `modelChoiceSchema`, `EFFECTIVE_MODEL_SOURCES`, `effectiveModelSourceSchema`, `effectiveModelSchema`, `effectiveModelQuerySchema`, `modelListSchema`, `appDefaultSchema`)
- `packages/contracts/src/providers/connection-test.ts` (new: `CONNECTION_TEST_STAGES`, `connectionTestStageSchema`, `connectionTestErrorSchema`, `connectionTestRequestSchema`, `connectionTestResultSchema`)
- `packages/contracts/src/providers/keys.ts` (new: `keySetRequestSchema`, `keyClearRequestSchema`)
- `packages/contracts/src/providers/settings.ts` (new: `PROVIDERS_SECTION_SCHEMA_VERSION`, `providersSectionSchema`)
- `packages/contracts/src/providers/examples.ts` (new: `PROVIDERS_EXAMPLES`, including the `createFromLabel` example of SD14)
- `packages/contracts/test/providers.exports.test.ts` (new: criterion 1, the CJS consumer tests; modelled on test/setup-auth.exports.test.ts)
- `packages/contracts/test/providers.schema.test.ts` (new: criteria 2 to 4 and the extra checks of section 4; modelled on test/setup-auth.schema.test.ts)
- `packages/contracts/test/fixtures/nest-style/providers-consumer.cjs` (new: CJS consumer that requires `@bbartolome/scriba-contracts/providers` by name and prints each export's name and kind; modelled on setup-auth-consumer.cjs)
- `packages/contracts/dist/` (generated by the build, git-ignored; not committed)

## 3. Method

Step 0 ran in the main checkout, `/Users/bbartolome/workspace/scriba-prototype`, where `git switch -c unit/MPR-01` created the branch from `main`. Steps 1 and 2 need `node_modules`, and steps 3 to 12 run in the worktree `/tmp/wt-MPR-01`, which holds `unit/MPR-01` (`git worktree list` shows it), because git will not check the branch out in the main checkout while the worktree holds it. The main checkout has no `packages/contracts/node_modules/zod`. Record `node -v` and `npm -v` beside each result. Node is v26.13.0 on this machine, and the root `packageManager` is `npm@11.20.0` (package.json line 14). Do not push.

Resume state (revision 3). Steps 0 to 2 are done. Step 0 (`git switch -c unit/MPR-01` from `main`) cannot be re-run. The branch `unit/MPR-01` now holds `50c66c2` on top of `82935a3`. That commit adds the nine source files of section 2 and the `index.ts` re-exports (ten files, 435 insertions, one deletion). Its `errors.ts` holds the ten codes and the value tuple, but not `PROVIDER_ERROR_STATUS`. The driver committed it before open point 1 and open point 5 were answered, and its message cites stop rules (a) and (c). Code continues from step 3 on this branch (DECISIONS line 1769), in the worktree `/tmp/wt-MPR-01`. Step 3 adds `PROVIDER_ERROR_STATUS` to `errors.ts`, as stop rule (a) says.

How `50c66c2` relates to step 13: stop rule (c) names only the step 13 commit. `50c66c2` is an intermediate commit, so rule (c) does not reach it. Step 13 adds the rest of section 2 on top of `50c66c2`, as a separate commit with the message `feat(MPR-01): publish the providers contract slice`. Keep `50c66c2` as recorded: do not squash or rewrite it, so that the branch shows what was committed before open points 1 and 5 were answered. Open point 5 is settled (DECISIONS c1d4804), so the `label` field is added before the step 13 commit, as rule (c) says, and it goes into that commit.

0. **Precondition.** `git status --short` is empty, then `git switch -c unit/MPR-01`. Expected: `Switched to a new branch 'unit/MPR-01'`. Done; not to be re-run.
1. **Install.** `npm ci` at the root. Expected: exit 0. This checkout has no zod in `node_modules` (section 7a), so the contracts tests cannot run before this. If the registry is unreachable, stop and report.
2. **Baseline.** `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-contracts`. Expected: both exit 0, and six test files pass: smoke, platform.schema, setup-auth.schema, setup-auth.exports, boot and package-deps. If not, stop. The failure is not MPR-01's.
3. **Source files.** Write `src/providers/` in this order: `errors.ts`, `routes.ts`, `defaults.ts`, `config.ts`, `model.ts`, `connection-test.ts`, `keys.ts`, `settings.ts`, `examples.ts`, then `index.ts`, which replaces `export {};`. Stop rules:
   - (a) The statuses are the Navigator's values in the SD10 table (unit lines 39 to 48); add `PROVIDER_ERROR_STATUS` to `errors.ts`.
   - (b) If Zod 4.6.7 rejects a one-member `z.discriminatedUnion` at module load, stop and report. Do not replace it with a plain object without a decision, because unit 17 says discriminated union.
   - (c) Open point 5 is settled (DECISIONS c1d4804). Before the step 13 commit, add the optional `label`, the at-least-one refinement and the `presetId` enum to `providerCreateSchema` (SD3), add `PROVIDER_PRESET_IDS` to `defaults.ts`, add the `createFromLabel` example to `examples.ts` (SD14), and cover them with the create-body test (section 4). The step 13 commit includes these changes.
4. **Tests and fixture.** Write `test/providers.exports.test.ts`, `test/providers.schema.test.ts` (section 4) and `test/fixtures/nest-style/providers-consumer.cjs`. The schema test defines the helper types and walk of section 4, criterion 3, in the file itself.
5. **Format.** `npx prettier --write packages/contracts/src/providers packages/contracts/test/providers.exports.test.ts packages/contracts/test/providers.schema.test.ts packages/contracts/test/fixtures/nest-style/providers-consumer.cjs`. Expected: each file is reported as written. Then `git status --short` lists only section 2 paths, and `git diff --stat -- packages/contracts/package.json` is empty.
6. **Build.** `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0. The first pass emits `dist/providers/*.js` and `.d.ts`. The second pass (`tsc --noEmit -p tsconfig.json`, which includes `test`) type-checks the `expectTypeOf` lines and the deep-key assertion of section 4. `ls packages/contracts/dist/providers` lists `index.js`, `index.d.ts` and the nine modules.
7. **Package tests.** `npm test -w @bbartolome/scriba-contracts`. Expected: exit 0, and eight files pass: the six of step 2 and the two new files. The package-deps test passes unchanged, because the built JS requires only `zod` from outside the package.
8. **API leg of criterion 1.** `node --test scripts/subpaths.test.mjs`, which needs step 6's `dist`. Expected: both tests pass. The first test checks that `apps/api` requires `@bbartolome/scriba-contracts/providers`.
9. **Web leg of criterion 1.** `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot`. Expected: exit 0. Record any CommonJS warning. The allowance on angular.json line 55 covers the package.
10. **Default web build unchanged.** `npm run build -w @bbartolome/scriba-web`, then `grep -l 'scriba-contracts' apps/web/dist/scriba-web/browser/*.js`. Expected: the build exits 0, and the grep prints nothing, as the SHL-01 check requires (plans/SHL-01.md line 88). No default-build file imports `/providers`. The output path is assumed (section 7b).
11. **Lint.** `npm run lint -w @bbartolome/scriba-contracts`, then `npm run lint` at the root (workspace lints plus `prettier --check .`). Expected: exit 0 for both.
12. **Root tests.** `npm test` at the root, which runs the workspace tests and `scripts/*.test.mjs`. Expected: exit 0.
13. **Commit and fresh clone** (after the `label` field and its test are in place; stop rule (c)). In the worktree `/tmp/wt-MPR-01`, stage only the section 2 paths and commit on `unit/MPR-01` with `feat(MPR-01): publish the providers contract slice`. Then, from the main checkout, `git clone --branch unit/MPR-01 /Users/bbartolome/workspace/scriba-prototype /tmp/mpr01-fresh` (worktrees share refs, so the clone sees the new commit) into an empty target, and in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
14. **Record.** Store the Node and npm versions and each command's exit code and key output. Tick a unit criterion only after its section 4 row passes, in a separate docs commit (`docs(MPR-01): tick the passed criteria`), as the repo did for SAU-07 (commit 9be4cfc).

## 4. Acceptance criteria and tests

Criterion 1 runs through steps 6, 8 and 9. Criteria 2 to 4 run through step 7 (`npm test -w @bbartolome/scriba-contracts`), and the compile-time checks run in step 6. This plan marks nothing passed.

| Criterion (unit line) | Test file | Test name | What it asserts |
|---|---|---|---|
| 1, "builds and is importable from both `apps/api` and `apps/web`" (54) | (build) | step 6 | `npm run build -w @bbartolome/scriba-contracts` exits 0; `dist/providers` is emitted; the second pass type-checks the test files |
| 1 | `providers.exports.test.ts` | the consumer exits 0 | `spawnSync(process.execPath, [fixture])` has status 0. The fixture `require`s `@bbartolome/scriba-contracts/providers` by name, which resolves through the exports map |
| 1 | `providers.exports.test.ts` | exports every shape, constant and route | the names in the consumer report include every name in section 4a |
| 1 | `providers.exports.test.ts` | exports no function; every export is an object, string, number or boolean | the slice is data and schemas only (unit 14) |
| 1 | `scripts/subpaths.test.mjs` (unchanged) | each contract subpath requires from apps/api | step 8. The API-runtime leg of PLT-11 criterion 3 |
| 1 | (Angular build) | step 9 | `contracts-boot` resolves and bundles the providers subpath (apps/web/src/contracts-boot.ts line 6) |
| 2, "Zod rejects an unknown kind, a non-URL baseURL, and a negative timeout/retries" (55) | `providers.schema.test.ts` | config schema › rejects an unknown kind | `providerConfigSchema.safeParse` of the seeded provider with `kind: 'anthropic'` fails |
| 2 | `providers.schema.test.ts` | config schema › rejects a non-URL baseURL | `baseURL: 'not a url'` fails |
| 2 | `providers.schema.test.ts` | config schema › rejects a negative timeout | `timeout: -1` fails |
| 2 | `providers.schema.test.ts` | config schema › rejects a negative retries | `retries: -1` fails |
| 2 | `providers.schema.test.ts` | config schema › accepts the seeded Ollama provider | the seeded provider passes (also criterion 4) |
| 3, "No response type can carry a raw key; a key appears only in the write-only key request and the connection-test request (a type-level test enumerates response schemas)." (56) | `providers.schema.test.ts` | type level › no response type carries a key at any depth | `type DeepKeys<T>` (below) over the union `ResponseTypes` of the response types in SD19 and SD17 (`ProviderRead`, `ProviderList`, `Preset`, `PresetList`, `ModelChoice`, `AppDefault`, `EffectiveModel`, `ModelList`, `ConnectionTestResult`, `ConnectionTestError`, `ProvidersSection`). `expectTypeOf<Extract<DeepKeys<ResponseTypes>, 'key' \| 'apiKey'>>().toEqualTypeOf<never>()`. Compiled in step 6 |
| 3 | `providers.schema.test.ts` | type level › the helper finds a key at depth (positive control) | `expectTypeOf<Extract<DeepKeys<{a: {b: [{key: string}]}}>, 'key'>>().toEqualTypeOf<'key'>()`. Shows the helper is not vacuous |
| 3 | `providers.schema.test.ts` | runtime walk › no response schema holds a key field at any depth | `keyNamesDeep(schema)` (below) for each response schema: `providerReadSchema`, `providerListSchema`, `presetSchema`, `presetListSchema`, `modelChoiceSchema`, `appDefaultSchema`, `effectiveModelSchema`, `modelListSchema`, `connectionTestResultSchema`, `providersSectionSchema`. None of the names is `key` or `apiKey` |
| 3 | `providers.schema.test.ts` | runtime walk › the walk finds a nested key (positive control) | `keyNamesDeep(z.object({a: z.array(z.object({key: z.string()}))}))` contains `key` |
| 3 | `providers.schema.test.ts` | request schemas › only the key requests carry a key, at any depth | `keyNamesDeep` run on each request schema: `keySetRequestSchema`, `keyClearRequestSchema`, `providerCreateSchema`, `providerUpdateSchema`, `providerConfigInputSchema`, `connectionTestRequestSchema`, `effectiveModelQuerySchema`. The schemas whose walk contains `key` are exactly `keySetRequestSchema` and `connectionTestRequestSchema`. The check sees `connectionTestRequestSchema` through its union (the `draft` member is walked too) |
| 3 | `providers.schema.test.ts` | read view › accepts keySet and a four-character keyHint | `PROVIDERS_EXAMPLES.ollamaRead` passes; `keyHint: 'abcde'` fails |
| 3 | `providers.schema.test.ts` | exported types match their schemas | `expectTypeOf<X>().toEqualTypeOf<z.infer<typeof xSchema>>()` for each of the 25 types in SD19. Compiled in step 6 |
| 4, "The four presets and the defaults are exported constants; the seeded-section example validates." (57) | `providers.schema.test.ts` | presets › lists the four presets in unit order | `PROVIDER_PRESETS.map(p => [p.id, p.baseURL, p.keyRequired])` equals `[['ollama', 'http://host.docker.internal:11434/v1', false], ['lm-studio', 'http://host.docker.internal:1234/v1', false], ['openai', 'https://api.openai.com/v1', true], ['openrouter', 'https://openrouter.ai/api/v1', true]]` |
| 4 | `providers.schema.test.ts` | presets › every preset validates | `presetSchema.array().safeParse(PROVIDER_PRESETS).success` is true |
| 4 | `providers.schema.test.ts` | defaults › the defaults are the five unit values | `PROVIDER_DEFAULTS` equals `{temperature: 0.7, contextSize: 64000, maxTokens: 4096, timeout: 120000, retries: 2}` |
| 4 | `providers.schema.test.ts` | seeded section › validates | `providersSectionSchema.safeParse(PROVIDERS_EXAMPLES.seededSection).success` is true |
| 4 | `providers.schema.test.ts` | seeded section › one keyless Ollama provider and an Ollama default | `list` has one entry with id `ollama`, the Ollama preset URL, the defaults and no `keyRef`; `appDefault` equals `{providerId: 'ollama', model: ''}` |

Other tests from the decisions above:

| Decision | Test file | Test name | What it asserts |
|---|---|---|---|
| SD2 | `providers.schema.test.ts` | config schema › the input member has no id and no keyRef | `Object.keys(providerConfigInputSchema.options[0].shape)` excludes `id` and `keyRef` |
| SD3 | `providers.schema.test.ts` | create body › accepts a label or a preset id; rejects a body with neither, an empty label, a label without an ASCII letter or digit, and a presetId outside the four ids (D-a, D-b, D-c: DECISIONS line 1843) | Each case starts from a full valid example, so only one field differs from a valid example. `providerCreateSchema` passes for `PROVIDERS_EXAMPLES.createFromLabel`. Refused: `createFromLabel` with `label` removed (neither presetId nor label; without the refine it would be accepted); `createFromLabel` with `label: ''` (min 1; the regex also refuses it); `createFromLabel` with `label: '!!!'` (regex); `createFromPreset` with `presetId: '!!!'` (enum). Accepted: `createFromPreset` with `presetId` set to `'ollama'` and no label. `PROVIDER_PRESET_IDS` equals the ids of `PROVIDER_PRESETS`. This is a create-body test in the Other tests table, not a criterion 3 row |
| SD4 | `providers.schema.test.ts` | config schema › rejects a non-integer timeout | `timeout: 1.5` fails (revision 2, item 3) |
| SD4 | `providers.schema.test.ts` | config schema › rejects a non-integer retries | `retries: 1.5` fails |
| SD6, SD8 | `providers.schema.test.ts` | responses › rejects a source other than project, app or auto | `effectiveModelSchema` fails with `source: 'other'` and passes with `auto` |
| SD9 | `providers.schema.test.ts` | connection test › accepts one form, rejects both or neither | the request passes with `providerId`, and with `draft`; it fails with both, and with neither |
| SD9 | `providers.schema.test.ts` | connection test › rejects an error code outside the PROVIDER codes | `connectionTestResultSchema` fails when `error.code` is `PLATFORM_NOT_FOUND` (revision 2, item 4) |
| SD17 | `providers.schema.test.ts` | responses › app default accepts null | `appDefaultSchema` passes with `{appDefault: null}` and with the set example |
| SD14 | `providers.schema.test.ts` | examples › every example validates through its schema | `it.each` over the table pairing each `PROVIDERS_EXAMPLES` key with its schema; a key with no row fails the test |
| SD10 | `providers.schema.test.ts` | error codes › every provider code passes platform's errorCodeSchema | `it.each(Object.values(PROVIDER_ERROR_CODES))`, using `errorCodeSchema` from `../src/platform/index.js` |
| SD10 | `providers.schema.test.ts` | error codes › the value tuple matches the codes | sorted `PROVIDER_ERROR_CODE_VALUES` equals sorted `Object.values(PROVIDER_ERROR_CODES)` |
| SD10, open point 1 (settled, option A) | `providers.schema.test.ts` | error codes › the status table has one key per code | the keys of `PROVIDER_ERROR_STATUS` equal the ten codes; `PROVIDER_DEFAULT_IN_USE` maps to 409 and `PROVIDER_UNAUTHORIZED` maps to 502 |
| SD10, open point 1 (settled, option A) | `providers.schema.test.ts` | error codes › each of the ten statuses matches the Navigator's table | `PROVIDER_ERROR_STATUS` equals `{PROVIDER_UNREACHABLE: 502, PROVIDER_UNAUTHORIZED: 502, PROVIDER_MODEL_NOT_FOUND: 502, PROVIDER_TIMEOUT: 504, PROVIDER_RATE_LIMITED: 503, PROVIDER_BAD_RESPONSE: 502, PROVIDER_ABORTED: 409, PROVIDER_NOT_CONFIGURED: 409, PROVIDER_DEFAULT_IN_USE: 409, PROVIDER_NOT_FOUND: 404}` |
| SD10, open point 1 (settled, option A) | `providers.schema.test.ts` | error codes › no PROVIDER code maps to 401 | every value of `PROVIDER_ERROR_STATUS` is other than 401 |
| SD11 | `providers.schema.test.ts` | routes › every route is under /api/providers and unique | each route equals `/api/providers` or starts with `/api/providers/`; the set size equals the count |

### 4-helpers. The type-level and runtime helpers of criterion 3

Type-level deep-key helper (in `providers.schema.test.ts`):

```ts
type DeepKeys<T> = T extends readonly (infer E)[]
  ? DeepKeys<E>
  : T extends object
    ? { [K in keyof T & string]-?: K | DeepKeys<NonNullable<T[K]>> }[keyof T & string]
    : never;
```

It distributes over unions, and it recurses through arrays, optional and nullable properties, and objects.

Runtime walk (in the same file), using the public Zod 4 accessors:

```ts
function keyNamesDeep(schema: z.core.$ZodType): string[] {
  if (schema instanceof z.ZodObject)
    return Object.entries(schema.shape).flatMap(([name, child]) => [name, ...keyNamesDeep(child as z.core.$ZodType)]);
  if (schema instanceof z.ZodArray) return keyNamesDeep(schema.element);
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) return keyNamesDeep(schema.unwrap());
  if (schema instanceof z.ZodUnion) return schema.options.flatMap(keyNamesDeep);
  return [];
}
```

`ZodArray.element` and `unwrap()` return `z.core.$ZodType`, not `z.ZodType`, so the parameter and the cast use `z.core.$ZodType`. This form compiles with exit 0 under zod 4.6.7 and typescript 6.0.3, and it runs (section 7b). Both schemas and the test use the same `zod` instance, resolved from `packages/contracts/node_modules` (section 7a), so `instanceof` holds. Step 4 repeats the class check in the repo. If a branch is missing, add its `instanceof` case.

### 4a. Required export names (for the CJS consumer test)

`providerConfigSchema`, `openaiCompatibleSchema`, `openaiCompatibleInputSchema`, `openaiCompatibleReadSchema`, `providerConfigInputSchema`, `providerReadSchema`, `providerListSchema`, `providerCreateSchema`, `providerUpdateSchema`, `PROVIDER_DEFAULTS`, `presetSchema`, `PROVIDER_PRESETS`, `PROVIDER_PRESET_IDS`, `presetListSchema`, `modelChoiceSchema`, `appDefaultSchema`, `EFFECTIVE_MODEL_SOURCES`, `effectiveModelSourceSchema`, `effectiveModelSchema`, `effectiveModelQuerySchema`, `modelListSchema`, `CONNECTION_TEST_STAGES`, `connectionTestStageSchema`, `connectionTestErrorSchema`, `connectionTestRequestSchema`, `connectionTestResultSchema`, `keySetRequestSchema`, `keyClearRequestSchema`, `PROVIDERS_SECTION_SCHEMA_VERSION`, `providersSectionSchema`, `PROVIDER_ERROR_CODES`, `PROVIDER_ERROR_CODE_VALUES`, `providerErrorCodeSchema`, `PROVIDER_ERROR_STATUS`, `PROVIDERS_ROUTE`, `PRESETS_ROUTE`, `APP_DEFAULT_ROUTE`, `PROVIDER_UPDATE_ROUTE`, `PROVIDER_DELETE_ROUTE`, `MODELS_ROUTE`, `KEY_SET_ROUTE`, `KEY_CLEAR_ROUTE`, `CONNECTION_TEST_ROUTE`, `EFFECTIVE_MODEL_ROUTE`, `PROJECT_MODEL_ROUTE`, `PROJECT_MODEL_CLEAR_ROUTE`, `PROVIDERS_EXAMPLES`.

## 5. Downstream agreement

Each row says what the unit needs from MPR-01 and how this plan provides it.

- **MPR-02, registry and seeding** (blocked_by MPR-01, line 7). Needs the section schema, the stored member, `modelChoiceSchema`, the Ollama preset values, `PROVIDER_DEFAULTS`, and the seeded example as its test oracle. Provided: `providersSectionSchema`, `PROVIDER_PRESETS`, `PROVIDER_DEFAULTS`, `PROVIDERS_EXAMPLES.seededSection`. Its id base is `presetId` when given, else the slug of `label` (SD3; decision c1d4804).
- **MPR-03, secrets file** (line 7). Needs `keyRef` as an opaque string. Provided by `openaiCompatibleSchema`. The hint rule is open point 4.
- **MPR-04, client** (line 7). Needs the member fields (baseURL, model, temperature, maxTokens, timeout, retries), `PROVIDER_DEFAULTS` and the code names `PROVIDER_UNAUTHORIZED`, `PROVIDER_TIMEOUT` and `PROVIDER_ABORTED` from its criteria. Provided. The status values are settled (SD10; plans/DECISIONS.md 1bef5ff). MPR-04 carries them when its codes reach HTTP. Its message and event types stay in apps/api (module 40).
- **MPR-05, resolution and model list** (MPR-02, 03, 04). Needs `effectiveModelSchema`, `EFFECTIVE_MODEL_SOURCES`, `modelListSchema`, `modelChoiceSchema` and `PROVIDER_ERROR_CODES.NOT_CONFIGURED`. Its model-list failure response takes the status of its code from the SD10 table, with no per-route choice. Provided.
- **MPR-06, HTTP API** (MPR-02, 03, 05). Needs the bodies (`providerCreateSchema`, `providerUpdateSchema`, `modelChoiceSchema` for the app default and the override, `keySetRequestSchema`, `keyClearRequestSchema`), the reads (`providerListSchema`, `providerReadSchema`, `presetListSchema`, `presetSchema`, `appDefaultSchema`, `modelListSchema`, `effectiveModelSchema`, `effectiveModelQuerySchema`), the command responses of SD18, the twelve routes, the error codes and their statuses (SD10). MPR-06 takes each status from the table; it does not choose a status per route. The create body carries `presetId` or `label` (D-a; DECISIONS line 1843), and MPR-06 passes the body through `providerCreateSchema` unchanged. Provided. The pipe must take a structural parameter type, `{parse(value: unknown): unknown}`. The contract schemas come from contracts' zod 4.6.7, and the root has zod 4.6.6, so a root-zod parameter type fails to compile. PLT-05 fixed this the same way (DEC 2026-11-12 lines 572 to 596; package-lock.json lines 10823 and 10842).
- **MPR-07, connection test** (MPR-04, 06). Needs `connectionTestRequestSchema` (both forms, with the test-only key), `connectionTestResultSchema`, `connectionTestErrorSchema`, `CONNECTION_TEST_STAGES`, `providerConfigInputSchema` for the draft and `providerErrorCodeSchema`. Provided.
- **MPR-08, client gate** (MPR-02 to 07). Needs every `/api/providers` route to be guarded and no response to carry a key. Provided by the route test and the key tests of section 4, which now walk every response type at any depth.
- **MPR-09, providers panel** (MPR-06). Needs `providerReadSchema`, `presetListSchema` (from `GET /api/providers/presets`), the create and update types, `keySetRequestSchema`, `modelChoiceSchema` and the connection-test types. Provided as types and constants. How the browser imports them is open point 3. The custom-URL add sends a `label` (units/MPR-09-providers-panel.md line 19 has no label field, so MPR-09 must add one; this plan names it as the source). The preset add sends `presetId`.
- **MPR-10, connection-test UI** (MPR-07, 09). Needs `connectionTestResultSchema` and `PROVIDER_ERROR_CODES` for the hints. Provided. Its Ollama detection (unit 16, 17) is not a contract matter. The contract stores no preset origin: `presetId` is a create-body field only (SD3), and `ProviderConfig` has no preset field (unit 17). MPR-10 therefore detects an Ollama provider by baseURL port 11434 or by an id starting with `ollama`. Its unit line 16 asks for "created from the Ollama preset or whose baseURL uses port 11434", and the id prefix is the nearest stored signal. The id prefix can misfire for a custom provider whose id begins `ollama`; MPR-10 owns that rule. No contract change.
- **MPR-11, `/providers` route** (MPR-09, 10). Needs nothing beyond MPR-09 and MPR-10.
- **MPR-12, project override** (MPR-05, MPR-08; PST-01). Needs the type-level compatibility test: PST-01's `project.yaml` `model` type against `ModelChoice`, whose inferred type is `{providerId: string; model: string}`. It also needs `PROJECT_MODEL_ROUTE` and `PROJECT_MODEL_CLEAR_ROUTE`. Provided. Compatibility is a type check, so PST-01's validator need not match.
- **MPR-13, project model panel** (MPR-11, 12). Needs `effectiveModelSchema`, `EFFECTIVE_MODEL_SOURCES`, `effectiveModelQuerySchema` and `EFFECTIVE_MODEL_ROUTE`. Provided.
- **SAU-12, providers step** (blocked_by MPR-01, line 7 of its unit). Needs only that phase:contract is closed. It embeds MPR-09's component and reads no contract shape. Provided by closing the phase.
- **AGL-01 and AGL-03, agent loop.** MPR-01 lists the agent-loop contract in `unblocks`, but AGL-01 does not list MPR-01 (open point 2). AGL-03 resolves the model through the providers client (its line 20), which is MPR-05 and MPR-08, not MPR-01.
- **PST-01, project store** (contract, parallel). Shares no file with MPR-01. It must not import `/providers` (PST-01 unit line 14). MPR-01 imports nothing from the project store.
- **PLT-11, scaffold gate** (blocker, done). Relied on for `contracts-boot`, `scripts/subpaths.test.mjs` and the root `dev` script. None of them changes.
- **PLT-16, release track.** No path in common. `plans/PLT-16.md` line 47 says `packages/contracts` and `apps/api` stay as they are. Its table (lines 51 to 59) lists deploy, docs, PLT-17 and DECISIONS paths, plus one conditional apps/api row for Platform's compose version. None is a path of MPR-01. Nothing to mirror. Both branches may append to `plans/DECISIONS.md`. Resolve by keeping both entries.

## 6. Open points

1. **SETTLED: the Navigator chose option A (plans/DECISIONS.md 1bef5ff). Error statuses.** Unit 35 gave 409 for `PROVIDER_DEFAULT_IN_USE` and no status for the other nine codes, before its status table was added (unit lines 39 to 48). PLT-05 needs a status for each thrown error (units/PLT-05 line 23), and setup-auth gives every code one (src/setup-auth/errors.ts lines 15 to 23). The Shell sends every HTTP 401 to `/setup` (apps/web/src/app/shell/api-client.ts lines 104 and 105), so no PROVIDER code is 401. The decided table is in SD10 and in unit lines 35 to 50 (rows 39 to 48): one status per code, held in `PROVIDER_ERROR_STATUS` in `errors.ts`.
   - Chosen, option A: each code takes the status of its meaning. Unreachable, unauthorized, model not found and bad response are 502. Rate limited is 503. Timeout is 504. Aborted, not configured and default in use are 409. Not found is 404.
   - Rejected, option B: per-route statuses. One code would then carry several statuses, because MPR-05 is surfaced by routes and by the Agent loop.
   - Rejected, option C: no status table. It contradicts PLT-05's rule that each module error carries its own status.

   Effects: MPR-05 and MPR-06 take the status from the table, with no per-route choice. The providers modules throw `ModuleError` with the status from `PROVIDER_ERROR_STATUS`, and PLT-05's filter passes it through (units/PLT-05 line 23; apps/api/src/modules/platform/errors/platform-exception.filter.ts lines 42 to 45). The thrower supplies the status, as apps/api/src/modules/setup-auth/setup-auth.guard.ts lines 59 to 62 do with `SETUP_AUTH_ERROR_STATUS.AUTH_REQUIRED`. The Shell's 401 handling is unaffected, because no PROVIDER code is 401. MPR-07's results remain HTTP 200 bodies. The driver challenged `PROVIDER_ABORTED` 409 as a judgement: the reason rules out 5xx but does not by itself give 409. The status is rarely sent, because an aborted request has no client left to receive it. The challenge is recorded, not a block, and 409 stands unless the Navigator changes it (DECISIONS line 1768).
2. **[Navigator] Agent loop link.** MPR-01's `unblocks` includes "Agent loop phase:contract (effective-model response)" (unit line 9). AGL-01 lists only PLT-11 and PST-01 as blockers (units/AGL-01 line 7), and it never names the providers module or the effective-model response. Options: (a) add MPR-01 to AGL-01's `blocked_by` and let the agent loop import the effective-model shape from `/providers`. PST-01 avoids this import to prevent a wave-1 contract cycle (PST-01 line 14). (b) Remove the entry from MPR-01's `unblocks`. (c) The agent loop states its own copy of the shape. Effects: the front matter of AGL-01 or MPR-01. MPR-01's shapes are the same under every option.
3. **[Navigator] Web use of `/providers`. CLOSED: option (b), hand-written copies with a parity spec (the Navigator, 2026-11-14; `plans/DECISIONS.md` entry "the Navigator's decision on the /providers contract route (option b)", commit 4430df5).** The subpath must carry zod, because the Zod schemas are the unit's deliverable. CommonJS cannot be tree-shaken, so any runtime value imported from `/providers` loads zod's CommonJS build, about 564 kB (DEC 2026-11-13 line 1084, which cites DECISIONS line 634 for the figure). SAU-01's plan states the same for setup-auth (plans/SAU-01.md section 6, point 3). The Shell chose type-only imports and hand-written copies (apps/web/src/app/shell/sse-envelope.ts lines 1 to 6; sse-client.ts line 23). Options: (a) extend that rule to the providers panel (MPR-09 onward). The panel uses type-only imports, presets come from `GET /api/providers/presets`, and route strings are copied. (b) Allow runtime imports in the lazy `/providers` feature, with an `allowedCommonJsDependencies` entry for its build. Effects: MPR-09, MPR-10, MPR-11, MPR-13 and SAU-12. MPR-01 is unchanged under either option.
4. **[Navigator] Key hint for short keys.** `keyHint` is the last four characters (module 36). A key of four characters or fewer would be shown whole, and the module says keys never appear in any output. Options: (a) the hint helper in MPR-03 returns no hint below a minimum length. (b) Accept the exposure for short keys. The contract already allows `keyHint` to be absent (SD5). Effects: MPR-03's hint criterion and the MPR-06 read view.
5. **SETTLED by the Navigator, option (a): an optional `label` in the create body, not stored (DECISIONS c1d4804). Custom-provider id base.** MPR-02 said the id is "preset id or slug", and unit 18 said "preset id plus a suffix if taken"; neither said where a custom provider's slug comes from. The id base is now `presetId` when given, else the slug of `label`, normalized to the SD4 rule, with a suffix if taken (SD3). Rejected: (b) a slug of the `baseURL` host, because two endpoints on one host collide and the id would come from a mutable field; (c) a client-chosen required `id`, because a client could create `ollama` and the suffix rule would overwrite the client's own id.

   Settled by the coordinator, D-a (DECISIONS line 1843): a create body must carry `presetId` or `label`. `providerCreateSchema` is refined so that at least one is present, and a body with neither is refused.

   Settled by the coordinator, D-b (DECISIONS line 1843): `presetId` is one of the four preset ids (`z.enum(PROVIDER_PRESET_IDS)`), so `presetId: '!!!'` is refused.

   Settled by the coordinator, D-c (DECISIONS line 1843): the label is lowercased, then each run of characters other than a–z and 0–9 becomes one hyphen; leading and trailing hyphens are trimmed; the label must contain at least one ASCII letter or digit (the regex), so an empty slug is refused by the contract. Examples: "My Local Llama" gives `my-local-llama`; "Café 2" gives `caf-2`; "日本語 1" gives `1`; "!!!" is refused.
6. **[Low] Base URL scheme.** `z.url()` accepts any scheme, such as `ftp://`. The unit refuses only a non-URL. Option: keep it, or restrict to `http` and `https`. The plan keeps `z.url()`. Effects: validation messages in MPR-06.
7. **[Low, for review] Preset hint wording.** The strings in SD12 are a draft. MPR-10 owns the connection-test hints. A change to the preset hints changes contract values and the example tests. Effects: MPR-09 and MPR-10 copy.
8. **[Low, for review] Numeric bounds.** SD4 sets bounds the unit does not give: positive integers for `contextSize` and `maxTokens`, and no range for `temperature`. Options: accept these, or tighten (for example `temperature` 0 to 2). Effects: MPR-06 validation and the UI.
9. **[Note, no change proposed] Providers in the publishing slugs.** `providers` is in `PUBLISHING_MODULE_SLUGS` (src/platform/slugs.ts line 23), but module 39 says there are no SSE events. This is the same as SAU-01's open point 7. The plan changes nothing here.

## 7. Facts checked and assumed

### 7a. Checked by reading and grep (no build, install or test was run)

- Git: `main` head is `cd0fd53`. The commits after `9be4cfc` are `684407b`, `2a9f664`, `0c6b8bb`, `81203f1`, `82935a3`, `1bef5ff`, `8bee3bd`, `c20e35e`, `4c7db80`, `b5e6fcf`, `905c483`, `4485ce2`, `141bc17`, `c1d4804` and `cd0fd53` (the last one changes only plans/DECISIONS.md). Most change only plans/DECISIONS.md. The exceptions: `82935a3` adds plans/MPR-01.md as a new file (333 lines, `status: planned`); `4c7db80` changes plans/MPR-01.md (the error-status text; the status stays `planned`, as `82935a3` already set it) and units/MPR-01-contract-slice.md (the status table); `b5e6fcf` changes plans/PLT-16.md as well as DECISIONS. The branch `unit/MPR-01` exists at `50c66c2` (parent `82935a3`), checked out in the worktree `/tmp/wt-MPR-01`; section 3 covers its use. This revision's uncommitted edits are to plans/MPR-01.md and units/MPR-02-registry-seeding.md. Node v26.13.0.
- Label decision: plans/DECISIONS.md line 1835 (heading), line 1837 (decision), line 1838 (rejected options b and c), line 1841 (process: text changes, then a targeted Opus review before the code adds the field and the step 13 commit).
- Status decision: plans/DECISIONS.md line 1763 (heading, "Navigator decision on open point 1 (error statuses): option A"), line 1765 (the ten statuses), line 1766 (options B and C rejected), line 1768 (the `PROVIDER_ABORTED` 409 judgement, accepted), line 1769 (the process: a text change, then a targeted Opus review before step 3).
- Rejection record: plans/DECISIONS.md line 1730, "2026-11-13 — MPR-01 — Opus plan review of revision 1 (`plans/MPR-01.md`, draft): NOT APPROVED (rejection 1)", with eight items. Open points 1 and 5 go to the Navigator.
- CommonJS ruling: plans/DECISIONS.md line 170 is the heading "2026-11-11 — PLT-02 — output format: CommonJS (Navigator decision, disposition of PLT-02 open point 1)". Lines 172 to 174 hold the decision, the rejected option and the reason. Line 176 is the driver note.
- Unit: front matter lines 1 to 10 (`blocked_by` line 7, `unblocks` line 9); shapes lines 16 to 51 (error-code table rows 39 to 48, note line 50, route constants line 51); line 21 is `timeout (ms) ≥ 0, retries ≥ 0 integers`; heading line 53; criteria lines 54 to 57.
- Module (`modules/providers.md`): cross-cutting decisions lines 33 to 40 (the points used here are 35 kind, 36 secrets, 37 section, 38 override, 39 methods and no SSE, 40 client types); out of scope lines 48 to 54.
- Blockers: `plans/PLT-02.md` line 3 and `plans/PLT-11.md` line 3 are `status: done`. PLT-11 criterion 5 (`ci.yml`) is unticked by Navigator decision (units/PLT-11 line 32; DEC 2026-11-12 line 602). Code the blockers provide, present on this checkout: `packages/contracts/package.json` line 14 (`./providers` exports entry), lines 48 and 49 (`build` and `test`), lines 52 and 53 (`dependencies.zod`); `scripts/subpaths.test.mjs` lines 32 to 52; `apps/web/src/contracts-boot.ts` line 6 (providers import); `apps/web/angular.json` lines 51 to 56 (contracts-boot, allowance line 55); root `package.json` line 24 (`dev` script).
- Current providers slice: `packages/contracts/src/providers/index.ts` line 1 is `export {};`.
- Contracts config: `packages/contracts/tsconfig.json` line 3 (`include` src and test) and line 4 (`types: ["node"]`); `tsconfig.build.json` line 8 (`include` src only).
- Precedent (setup-auth, done): `settings.ts` lines 4 to 5, 23 to 29, 31 to 33; `examples.ts` lines 10 to 49; `errors.ts` lines 3 to 11 and 15 to 23; `routes.ts` lines 3 to 14 and 25 to 27; `status.ts` lines 14 and 15 (`z.enum`); `tailscale.ts` lines 22 and 24 (`z.url()`); `index.ts` lines 1 to 7.
- Precedent tests: `setup-auth.exports.test.ts` lines 5 to 10 (fixture path, `__dirname`), 13 to 48 (required names), 58 to 89; `setup-auth.schema.test.ts` line 1 (`expectTypeOf` import), 183 to 193 (examples), 195 to 206 (error codes), 208 to 242 (shape details), 244 to 279 (type tests); `fixtures/nest-style/setup-auth-consumer.cjs` lines 1 to 13; `package-deps.test.ts` lines 28 and 40 to 52.
- Platform: `src/platform/errors.ts` lines 4 to 14 (prefixes; PROVIDER on line 8), 17 to 21 (pattern and `errorCodeSchema`), 36 to 41 and 44 to 49 (platform codes and statuses); `settings.ts` lines 7 to 13 (`providers` on line 9), line 22 (`z.strictObject`); `http.ts` line 6 (method convention); `slugs.ts` line 7 and line 23 (`providers` in both lists).
- Zod already used in the repo (Zod 4 forms): `z.url()` (setup-auth/tailscale.ts lines 22 and 24; apps/api/src/modules/platform/boot/env.ts line 59); `z.discriminatedUnion` with two or more members (platform/events.ts line 55; setup-auth/identity.ts line 5); `z.strictObject` (platform/settings.ts line 22); `z.enum` (setup-auth/status.ts lines 14 and 15); `.refine` (env.ts lines 44, 46, 56).
- Lockfile: `package-lock.json` line 10823 (root `node_modules/zod`, 4.6.6); line 10832 (`packages/contracts`, `zod ^4.6.7`); line 10842 (nested `packages/contracts/node_modules/zod`, 4.6.7).
- Installed state: no `node_modules/zod` at the root, and `packages/contracts/node_modules` holds no zod (`require.resolve('zod')` from `packages/contracts` fails). `node_modules/vitest`, `node_modules/typescript` and `node_modules/.bin/tsc` are present. No `node_modules/@angular/build` and no `node_modules/@angular/cli`, so the Angular output path cannot be checked here.
- Consumers: `apps/api/package.json` line 11 (contracts dependency); `apps/api/src/app.module.ts` lines 3 to 6 (platform import); `apps/web/src/app/shell/api-client.ts` line 104 (401 check) and line 105 (navigate to `/setup`); `apps/web/src/app/shell/sse-envelope.ts` lines 1 to 4 (type-only import) and line 6 (hand-written copies comment). Only `contracts-boot.ts` imports `/providers` in apps/web (grep).
- Other units: MPR-02, MPR-03, MPR-04 and SAU-12 line 7 (`blocked_by` MPR-01); AGL-01 line 7 (`blocked_by` PLT-11 and PST-01 only) and line 9 (`unblocks`); AGL-03 lines 18, 20 and 24 (POST start; `AGENT_NO_PROVIDER` through the providers client; POST stop); PST-01 unit lines 14, 23 and 55; PST-08 line 22 (entity-id rule); PLT-05 line 23 (typed errors carry code and status); SAU-09 line 20 ("Preferences endpoints: GET and POST"); MPR-10 lines 16 and 17 (Ollama hint and pull hint rules) and line 21 (criterion); `units/README.md` line 88 (MPR-01 is the gate of Model providers phase:contract).
- DEC entries read: line 170 heading and lines 172 to 174 (CommonJS), 212 (@types/node), 572 to 596 (duplicate zod and the structural pipe fix), 602 (PLT-11 criterion 5), 634 (cost of zod's CommonJS build, cited by line 1084), 1084 (Shell zod), 1417 (SAU-01 code review APPROVED), 363 (PLT-02 code review APPROVED), 1730 (MPR-01 rejection). A grep of DECISIONS for `MPR-01`, `PST-01`, `AGL-01`, `SAU-12`, `ModelChoice`, `keyHint` and `PROVIDER_` returned nothing before the rejection entry. No DECISIONS ruling covers this slice's shape.
- PLT-16: `plans/PLT-16.md` line 47 (only the listed paths change; `packages/contracts` and `apps/api` stay as they are) and the table lines 51 to 59.
- ESLint: `eslint.config.mjs` line 27 (`boundaries/elements`, which lists api-module and web-feature only). No contracts rule.
- SHL-01 production check: `plans/SHL-01.md` line 88 (`grep -l 'scriba-contracts' apps/web/dist/scriba-web/browser/*.js` prints nothing).

### 7b. Assumed (the steps check each one)

- Checked (scratch run, outside the repo, removed afterwards; zod 4.6.7): a `.refine` after `.extend` on a `z.object` stays a `ZodObject`, and its `.shape` lists `kind, baseURL, presetId, label`. A body with neither `presetId` nor `label` is refused. `presetId: 'ollama'` without a label is accepted, and `presetId: '!!!'` is refused. `label: 'My Local Llama'` is accepted, while `label: '!!!'` and `label: ''` are refused. The refine and the enum implement D-a and D-b (DECISIONS line 1843).
- Checked (scratch run, outside the repo, not a repo step): the revised `keyNamesDeep` of section 4 (4-helpers), with `schema: z.core.$ZodType` and `child as z.core.$ZodType`, compiles with exit 0 under zod 4.6.7, typescript 6.0.3 and the repo's `tsconfig.base.json` (strict, NodeNext). The probe used `/tmp/mpr01-zodcheck`, a scratch project with its own `package.json` and `tsconfig.json`, and it was deleted after the run. The emitted JavaScript ran under node with exit 0. It returned `["a","key"]` for the nested control. It also walked a one-member `z.discriminatedUnion`, a nullable wrapper, a discriminated union inside an array, and a union of strict objects. A one-member `z.discriminatedUnion` therefore constructs and walks, so stop rule (b) did not trigger.
- Zod 4.6.7 accepts a one-member `z.discriminatedUnion` and exposes `.options` and `.shape` on the union and object schemas. The scratch run checked this (above). Only multi-member unions appear in the repo. Step 4 repeats the check.
- The Zod 4.6.7 class hierarchy used by the runtime walk. The scratch run confirmed that the `ZodObject`, `ZodArray`, `ZodNullable`, `ZodUnion` and `ZodDiscriminatedUnion` branches each reach their children, so `z.discriminatedUnion` is a `ZodUnion` with `.options`, and `z.strictObject` is a `ZodObject`. The `ZodOptional` branch is not separately observed: the probe's optional key returns the same empty list as a fall-through, so step 4 covers it. The positive control proves the walk reaches nested keys.
- The type-level helper `DeepKeys` distributes and terminates on the Zod-inferred types of this slice, and `expectTypeOf<never>().toEqualTypeOf<never>()` is accepted by the installed `expect-type`. Step 6 checks this.
- Zod 4.6.7 accepts `z.url()` on `http://host.docker.internal:11434/v1` (the seeded example, step 7).
- `expectTypeOf` compiles in the second build pass, and vitest 5.1.0 provides `expectTypeOf` (setup-auth.schema.test.ts line 1 already uses it).
- `__dirname` works in vitest test files, as setup-auth.exports.test.ts line 6 relies on. SAU-01 was approved (DEC line 1417).
- `npm ci` completes with registry access (step 1).
- The six existing test files and the root tests pass on `main`. The reviews of PLT-02 (DEC line 363) and SAU-01 (DEC line 1417) are APPROVED. This plan did not re-run them.
- The default production build writes to `apps/web/dist/scriba-web/browser`. This is Angular's default. angular.json sets an `outputPath` only for contracts-boot (line 53), and the Angular packages are not installed here, so the path is assumed. Step 10 checks it.
- The downstream units were read for their `blocked_by`, `unblocks` and decision bullets. Their cited bullets are named, not line-numbered, except where a line is given above.
