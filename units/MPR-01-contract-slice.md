---
id: MPR-01
title: Publish @bbartolome/scriba-contracts/providers
module: providers
phase: phase:contract
milestone: M1
blocked_by: ["Platform phase:scaffold (PLT-11; strictly PLT-02)"]
parallel_with: ["other wave-1 contract phases"]
unblocks: [MPR-02, MPR-03, MPR-04, "Setup & auth providers step (SAU-12)", "Agent loop phase:contract (effective-model response)"]
---

# MPR-01 — Contract slice

Merging this **closes Model providers `phase:contract`**. Zod + TS, shapes and constants only.

## Shapes
- **Provider config** (Zod discriminated union on `kind`, one member): `{id, kind: 'openai-compatible', baseURL, model, temperature, contextSize, maxTokens, timeout, retries, keyRef?}`.
  - `id`: unique slug chosen at creation (preset id plus a suffix if taken), stable thereafter.
  - `model`: provider's default model; may be empty.
  - `temperature`, `maxTokens` are sent per request; `contextSize` is **not** sent (metadata for prompt budgeting and the Ollama hint).
  - `timeout` (ms) ≥ 0, `retries` ≥ 0 integers.
  - `keyRef`: opaque reference into the secrets file, absent for keyless providers.
- **Read view:** config plus `keySet: boolean` and `keyHint?` (last four characters). No raw key field.
- **Defaults constants:** temperature 0.7, contextSize 64000, maxTokens 4096, timeout 120000, retries 2 (constants; implementation may tune here).
- **Presets** `{id, label, baseURL, keyRequired, hints}`:
  - Ollama — `http://host.docker.internal:11434/v1`, no key, hints: context length, pull a model.
  - LM Studio — `http://host.docker.internal:1234/v1`, no key, hint: start the local server and load a model.
  - OpenAI — `https://api.openai.com/v1`, key required.
  - OpenRouter — `https://openrouter.ai/api/v1`, key required.
- **Model list response:** sorted model ids.
- **Connection test:** request `{providerId} | {draft: ProviderConfigInput}` plus optional test-only `key`; result `{ok, stage: 'reach'|'list'|'chat', latencyMs, modelCount?, error?: {code, message, hint?}}`.
- **`ModelChoice`** `{providerId, model}` (empty `model` = the provider's own default). App default request; per-project override set/clear requests; **effective-model response** `{choice, source: 'project'|'app'|'auto', contextSize, warning?}`.
- **Write-only key requests:** set `{providerId, key}`, clear `{providerId}`.
- **`providers` settings section** shape `{schemaVersion: 1, list, appDefault: ModelChoice | null}` and a contract example of the seeded section.
- **Error codes:** `PROVIDER_UNREACHABLE`, `PROVIDER_UNAUTHORIZED`, `PROVIDER_MODEL_NOT_FOUND`, `PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMITED`, `PROVIDER_BAD_RESPONSE`, `PROVIDER_ABORTED`, `PROVIDER_NOT_CONFIGURED`, plus `PROVIDER_DEFAULT_IN_USE` (409, delete refused) and `PROVIDER_NOT_FOUND`.
- **Route constants** under `/api/providers/`.

## Acceptance criteria
- [ ] The slice builds and is importable from both `apps/api` and `apps/web`.
- [ ] Zod rejects an unknown `kind`, a non-URL `baseURL`, and a negative timeout/retries.
- [ ] No response type can carry a raw key; a key appears only in the write-only key request and the connection-test request (a type-level test enumerates response schemas).
- [ ] The four presets and the defaults are exported constants; the seeded-section example validates.
