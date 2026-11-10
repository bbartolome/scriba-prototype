# Spec: Model providers (BYOK)

## Problem Statement

Scriba is model-agnostic and local first: the author wants to write with a local model (Gemma 4 through Ollama or LM Studio on their own Mac) and sometimes switch to a hosted model. Every part of Scriba that thinks (the Agent loop's tool-calling chat, every narrative tool the Tool registry executes, the grounding check's claim judging) needs one reliable way to talk to "the model". Without this module each caller would hand-roll HTTP calls, retries, streaming and tool-call parsing, and keys would end up wherever was convenient.

The author's side of the problem is just as real:

- The app runs in a container, so `localhost` is not the author's Mac. Pointing it at the Ollama they already run is confusing.
- Ollama's OpenAI-compatible endpoint silently uses a small context window, which breaks agent runs in ways that look like model stupidity.
- The author doesn't know which model names a server offers, and typos fail late, in the middle of a run.
- API keys for hosted providers must not leak into logs, settings files the author may share, the browser, or the book folders that travel with the book.
- Different books may want different models (a big hosted model for the nonfiction book, a local one for the fiction draft) without re-configuring the app each time.

## Solution

A Model providers module that owns the whole "talk to a model" concern behind one client interface, plus the settings the author uses to configure it.

- **One provider kind in v1, `openai-compatible`**, implemented with the official `openai` SDK and a custom `baseURL`. A `kind` field on every provider config leaves room for native adapters later.
- **A client interface** that streams chat completions with tool calls. The Agent loop and the Tool registry call it; neither knows about the SDK. **Transport retries live in the client; schema-validation retries live in the Agent loop**.
- **A provider registry**: a list of named provider configs in `settings.yaml`, with keys held only in the secrets file.
- **Ollama works out of the box**: the first start seeds `http://host.docker.internal:11434/v1` with no key, reachable from the container through the compose `extra_hosts` entry that Platform's ST-3 smoke test verifies.
- **The BYOK settings UI**: presets for Ollama, LM Studio, OpenAI and OpenRouter; a model picker filled from `GET /v1/models` with free text as a fallback; a connection test; an `OLLAMA_CONTEXT_LENGTH` ≥ 64000 hint and a "pull a model" hint; write-only, masked keys. The `/setup` route's providers step reuses the same UI.
- **Model choice**: an app default model plus an optional per-project override stored in `project.yaml`. Per-tool model choice is deferred.

## User Stories

1. As an author, I want Scriba to talk to the Ollama I already run on my Mac without any configuration, so that my first chat works right after install.
2. As an author, I want the seeded Ollama provider to need no API key, so that I'm not asked for a secret a local server doesn't use.
3. As an author, I want to pick my model from the list my server reports, so that I don't have to remember or type exact model tags.
4. As an author, I want to type a model name by hand when the server doesn't list models (or lists them wrongly), so that an unusual server never blocks me.
5. As an author, I want a "Test connection" button, so that I find a wrong URL, key or model name now instead of in the middle of a run.
6. As an author, I want the connection test to tell me which step failed (can't reach the server, key rejected, model not found, timed out, unexpected reply), so that I know what to fix.
7. As an author, I want an unreachable-Ollama error to remind me that Ollama must be running on the host and listening for the container, so that I can fix the most common setup mistake myself.
8. As an author, I want a "pull a model" hint when my Ollama has no models, so that I know to run `ollama pull <model>` on my Mac.
9. As an author, I want a visible hint to set `OLLAMA_CONTEXT_LENGTH` to at least 64000 on the Ollama server, so that agent runs don't fail because Ollama quietly truncated the context.
10. As an author, I want presets for Ollama, LM Studio, OpenAI and OpenRouter, so that adding a provider is picking one and (for hosted ones) pasting a key.
11. As an author, I want to add any other OpenAI-compatible endpoint by URL, so that I'm not limited to the presets.
12. As an author, I want to keep several providers configured at once, so that I can switch between local and hosted models without re-typing settings.
13. As an author, I want to paste an API key once and never see it again in full, so that it can't be shoulder-surfed or copied out of the UI.
14. As an author, I want to see that a key is set (masked, with its last few characters), so that I can tell which key is in use without exposing it.
15. As an author, I want to replace or remove a provider's key, so that I can rotate a leaked key.
16. As an author, I want keys stored only in the secrets file in the library's `.scriba/` folder, so that `settings.yaml` and my book folders never contain secrets.
17. As an author, I want the secrets file readable only by the app's user, so that other OS users and casual browsing can't read my keys.
18. As an author, I want keys never to appear in logs, transcripts, errors or the event stream, so that sharing a log or a book folder never leaks a key.
19. As an author, I want to set temperature, context size, max tokens, timeout and retries per provider, so that I can tune for a slow local model or a fast hosted one.
20. As an author, I want sensible defaults for all of those settings, so that I only touch them when I have a reason.
21. As an author, I want an app default model, so that every project uses it unless I say otherwise.
22. As an author, I want to override the model for one project, so that each book can use the model that suits it.
23. As an author, I want the per-project model choice saved in the project's own `project.yaml`, so that it travels with the book.
24. As an author, I want a project whose override points at a provider I deleted to fall back to the app default with a clear warning, so that the book still works.
25. As an author, I want to see which model a run will use (and whether it came from the project or the app default), so that I'm never surprised by a run on the wrong model.
26. As an author, I want to choose my provider during `/setup` with the same screen as in settings, so that first-run setup and later changes feel identical.
27. As an author re-running setup, I want my existing providers kept as they are, so that re-running the installer never clobbers my configuration.
28. As an author, I want brief network blips and "server busy" replies retried automatically, so that a flaky Wi-Fi moment doesn't kill a long run.
29. As an author, I want a hung model to time out instead of spinning forever, so that I can retry or switch models.
30. As an author, I want the stop button to cancel the model call immediately, so that I don't wait for a long generation I no longer want.
31. As an author on my phone over the tailnet, I want to check and switch the app default model, so that I can fix a stuck setup away from my desk.
32. As an author, I want a clear message when a hosted provider rejects my key or I'm out of credit, so that I don't blame the app.
33. As an author, I want deleting the provider that the app default uses to be refused until I pick another default, so that I can't leave the app without a model.
34. As the Agent loop, I want one streaming chat call that yields text deltas and assembled tool calls, so that I can render tokens and tool-call cards without knowing the provider.
35. As the Agent loop, I want tool-call arguments handed to me as the raw string the model produced, so that I can validate them and feed a readable error back to the model for my schema retries.
36. As the Agent loop, I want to pass an abort signal, so that the stop button cancels the in-flight request.
37. As the Tool registry, I want to execute a tool's rendered prompt through the same client with the active project's model, so that tools and the agent always agree on the model.
38. As the Agent loop and Tool registry, I want typed, coded errors from the client (unreachable, unauthorized, model not found, timeout, rate limited, bad response, aborted), so that I can show the author the right message and decide what to do.
39. As the Agent loop, I want the provider's configured context size exposed with the resolved model, so that I can budget the prompt.
40. As the Setup & auth module, I want an embeddable providers settings component, so that the `/setup` providers step reuses this module's UI instead of duplicating it.
41. As a developer, I want the client testable against the mock OpenAI server, so that CI needs no real model.
42. As a developer, I want a `kind` field and a client interface that hides the SDK, so that native adapters (Ollama `/api/chat`, Anthropic, Google) can be added later without touching callers.

## Implementation Decisions

**Module shape.** A vertical module: a NestJS `@Module` in `apps/api` and a lazy feature route in `apps/web`. It publishes the `/providers` contract slice, exposes the client interface in-process to other API modules, serves an HTTP API under `/api/providers`, and ships the BYOK settings UI.

**Provider kind and SDK.**
- One kind, `openai-compatible`, built on the official `openai` npm SDK with a custom `baseURL`. The SDK is used only inside this module.
- The client always passes `baseURL` and `apiKey` explicitly, so the SDK never falls back to `OPENAI_API_KEY` / `OPENAI_BASE_URL` from the container environment. For keyless providers it passes a fixed placeholder key, because the SDK requires a non-empty key.
- The `kind` field is a Zod discriminated-union key with one member in v1. A native adapter later adds a member and an implementation behind the same client interface (expand–contract).
- Evidence: Ollama's and LM Studio's compatible endpoints both stream tool calls.

**Client interface (in-process, consumed by the Agent loop and the Tool registry).**
- One streaming chat call. Input: messages (system/user/assistant/tool, including assistant tool calls and tool results), optional tool function schemas (the Tool registry's model function-schema shape), optional tool choice, the **model target** (an explicit model choice, or a project id to resolve), and an abort signal.
- Output: an async stream of events: text delta; tool call completed (id, name, **raw argument string**); finish (reason: stop, tool calls, length, aborted); usage when the server reports it. The client assembles streamed tool-call argument fragments by index; it does **not** parse or validate the arguments (schema retries are the Agent loop's job).
- A convenience that collects the stream into one result (text + tool calls + finish reason) for callers that don't render tokens.
- A resolution call that returns the effective provider config (minus secrets) and model for a project, with its source (`project` or `app`) and any fallback warning. The Agent loop uses its `contextSize` for prompt budgeting.
- Errors are coded per Platform's error-code convention: `PROVIDER_UNREACHABLE`, `PROVIDER_UNAUTHORIZED`, `PROVIDER_MODEL_NOT_FOUND`, `PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMITED`, `PROVIDER_BAD_RESPONSE`, `PROVIDER_ABORTED`, `PROVIDER_NOT_CONFIGURED`. Messages never include keys.
- These message and stream types are in-process TypeScript exported by the module for API-side consumers. They are not part of the `/providers` HTTP contract slice (see Further Notes).

**Retry boundary.**
- **Transport retries in the client**: connection errors, timeouts before the first byte, 408, 409, 429 and 5xx, up to the provider's `retries` setting with exponential backoff, honouring `Retry-After`. This maps onto the SDK's own retry option where it matches; the client owns the policy either way.
- A retry happens only **before the first streamed chunk**. Once tokens have reached the caller, a failure ends the stream with a coded error, because replaying would duplicate output.
- 4xx errors other than 408/409/429 (bad key, unknown model, bad request) are never retried.
- **Schema retries are not here.** When tool-call arguments fail schema validation, the Agent loop returns a readable error to the model and lets it retry twice; those retries live in the Agent loop.
- **Timeout**: the provider's `timeout` bounds the wait for the first byte and every idle gap between chunks, so a slow but progressing local model isn't cut off. Phase `client` verifies the SDK's own timeout semantics for streams against this rule and enforces it in the client if the SDK differs.
- Abort cancels the HTTP request immediately and is never retried.

**Provider config (contract shape).** `{id, kind:'openai-compatible', baseURL, model, temperature, contextSize, maxTokens, timeout, retries, keyRef}`.
- `id`: a unique slug chosen at creation (preset id plus a suffix if taken), stable thereafter, referenced by model choices.
- `model`: the provider's default model; may be empty until the author picks one.
- `temperature` and `maxTokens` are sent with each request. `contextSize` is **not** sent: Ollama's compatible endpoint has no context-length field. It's metadata for prompt budgeting and the Ollama hint.
- `timeout` (ms) and `retries` drive the transport policy above.
- `keyRef`: an opaque reference into the secrets file, or absent for keyless providers.
- Defaults are contract constants: temperature 0.7, contextSize 64000 (matching the Ollama guidance), maxTokens 4096, timeout 120000 ms, retries 2. Implementation may tune the numbers in phase `contract`; they're constants, not decisions.

**Registry and storage.**
- Provider configs and the app default model choice live in the `providers` section of `settings.yaml` in `/books/.scriba/`, shaped `{schemaVersion: 1, list: ProviderConfig[], appDefault: ModelChoice | null}`. `settings.yaml` carries a `schemaVersion` and migrates eagerly at startup with a backup; this module registers its section's migration with that hook.
- **Keys live only in the secrets file** in `/books/.scriba/`: mode 0600 inside a 0700 directory. Writes are atomic (temp file, then rename, then mode check). On startup the module creates the directory and file with those modes if missing, and tightens and warns if they're looser. This is a floor against other OS users and casual reading, not strong crypto.
- `settings.yaml` holds only `keyRef`. Deleting a provider deletes its secret entry.
- **Write-only keys**: no API returns a key. Reads return `keySet: boolean` and a masked hint (the last four characters), computed from the secrets file at read time.
- Operational logs go to stdout and redact the `Authorization` header and any key-shaped value.

**First-start seeding.**
- When `settings.yaml` has no `providers` section, the module seeds one provider from the Ollama preset: id `ollama`, baseURL `http://host.docker.internal:11434/v1`, no key, empty model; and sets the app default to that provider.
- Seeding is idempotent and never clobbers: an existing section (even an empty provider list the author made deliberately) is left as is. Re-running setup keeps previous answers.
- `host.docker.internal` resolves because compose adds `extra_hosts: ["host.docker.internal:host-gateway"]` on the tailscale service and the app shares its network namespace. Platform's ST-3 smoke test proves this on Mac and Linux.
- **Empty model at M1**: while the effective provider's model is empty, the client resolves to the first model that provider's `GET /v1/models` lists and reports it as `source: 'auto'` in the resolution result. This makes M1 work before the settings UI exists; it never writes the choice to disk (an explicit pick in the UI does). If the list is empty, the error is `PROVIDER_NOT_CONFIGURED` with the "pull a model" hint.

**Model list and connection test.**
- **Model list**: `GET` on the module's API proxies the provider's `GET /v1/models` and returns sorted model ids. It never changes state. On failure it returns a coded error, and the UI falls back to free text.
- **Connection test**: a POST that accepts either a saved provider id or an unsaved draft config (plus an optional key that is used for the test only, not stored). Stages: reach the server → list models (catches bad keys on hosted providers) → a minimal one-token chat with the chosen model. Result: `{ok, stage, latencyMs, modelCount?, error?: {code, message, hint?}}`. Each failure stage maps to an author-facing hint (unreachable Ollama → "is Ollama running on the host, listening on all interfaces?"; outside Docker → try `http://localhost:11434/v1`).

**Presets.** Contract constants `{id, label, baseURL, keyRequired, hints}`:
- Ollama: `http://host.docker.internal:11434/v1`, no key, hints: context length, pull a model.
- LM Studio: `http://host.docker.internal:1234/v1`, no key, hint: start the local server and load a model.
- OpenAI: `https://api.openai.com/v1`, key required.
- OpenRouter: `https://openrouter.ai/api/v1`, key required.

A preset only pre-fills a new provider; after that it's an ordinary config.

**Hints.**
- The `OLLAMA_CONTEXT_LENGTH` ≥ 64000 hint is shown for any provider created from the Ollama preset or whose baseURL uses port 11434. It's static guidance: the compatible endpoint can't report or set the context length, so the module doesn't try to detect it (native adapter later).
- The "pull a model" hint (`ollama pull <model>` on the host) appears when an Ollama provider's model list is empty.

**Model choice.**
- `ModelChoice = {providerId, model}`. The app default is a `ModelChoice` in `settings.yaml`. An empty `model` means "the provider's own default model".
- The **per-project override** is an optional field in `project.yaml` with the same shape. **The Project store spec owns the `project.yaml` schema**; this module reads the field through the Project store's file API and writes it with the Project store's in-process `updateProjectYaml` helper (comment-preserving, `model` key only) when the author changes it (an author action, not an agent write, so not a pending change).
- **Resolution order**: project override → app default → provider's own `model` → first listed model (`auto`, above). An override pointing at a missing provider falls back to the app default and returns a warning.
- Deleting the provider used by the app default is refused (409) until another default is chosen. Deleting a provider that project overrides use is allowed; those projects fall back with a warning.
- **Per-tool model choice is deferred**. **The per-tool enable switch is the Tool registry's `enabled` field**, not this module's.

**HTTP API (under `/api/providers`, behind Setup & auth's guard).** GET/HEAD never mutate; commands are POSTs.
- GET: list providers (configs without secrets, with `keySet` and the masked hint), presets, the app default, a provider's model list, and the effective model choice for a project.
- POST: create provider (optionally from a preset), update provider, delete provider, set key (write-only), clear key, set app default, set project override, clear project override, connection test.
- Inputs validated with the contract's Zod schemas. Errors use Platform's base error shape.
- No SSE events in v1. Run-time model errors reach the author through the Agent loop's and Graph runner's own events.

**BYOK settings UI.**
- A lazy feature route at `/providers` (app-level, minimum device class `phone`, one entry in the Shell's route table) for provider settings: the provider list, add from preset, edit form, model picker (dropdown from the model list, free-text fallback), key field (password input, write-only; "replace" and "remove"), connection test with staged result, the Ollama hints, and the app default selector.
- A **project model panel** for the override, shown as a "This project" section of the `/providers` page. It acts on the active project (read from the Project store's active-project endpoint; hidden when no project is active), with a "Use app default" option and the effective-model readout. There is no separate project-settings route.
- The providers panel is exported as a standalone Angular component that Setup & auth's `/setup` providers step embeds.
- Responsive: usable on phone for checking and switching the default; desktop-first otherwise.
- Built with Angular Material and the Shell's API client.

## Phases

Serial. Each phase is sized to split into one-context-window tracer-bullet work items.

Milestones referenced here: M2 is the tool registry.

### `phase:contract` (M1)
Blocked by: Platform `phase:scaffold`.
Scope:
- Publish `@bbartolome/scriba-contracts/providers`: provider config (Zod discriminated union on `kind`, one member), defaults, presets, model list response, connection-test request/result, `ModelChoice`, app default + project override requests, effective-model response, write-only key request, provider error codes.
- A contract example for a seeded `providers` section.

Acceptance criteria:
- [ ] The slice builds and is importable from both `apps/api` and `apps/web`.
- [ ] Zod schemas reject a config with an unknown `kind`, a non-URL `baseURL`, or a negative timeout/retries.
- [ ] No schema in the slice has a field that can carry a raw key in a response type; the key appears only in the write-only key request (and the connection-test request).
- [ ] The four presets and the defaults are exported constants.

### `phase:client` (M1: Ollama default works)
Blocked by: `phase:contract`; Platform `phase:scaffold` (mock OpenAI server, API root); Setup & auth's guard for the HTTP API.
Scope:
- The `openai-compatible` client: streaming chat with tool calls, tool-call assembly, abort, coded errors, transport retries and timeout.
- The registry in `settings.yaml`, the secrets file (0600 in 0700, atomic writes), first-start seeding of Ollama, migration hook registration.
- Model resolution (app default and `auto`; project override reading lands in `phase:project-override`).
- The HTTP API for list/create/update/delete, key set/clear, model list, connection test and set app default.
- Mock OpenAI server fixtures added to Platform's server (see Testing Decisions).

Acceptance criteria:
- [ ] On a fresh library, startup writes a `providers` section with the `ollama` provider at `http://host.docker.internal:11434/v1`, no key, and app default `ollama`; a second startup changes nothing.
- [ ] A streamed chat against the mock server yields text deltas, then a tool call whose arguments were split across chunks arrives assembled as one raw string, then a finish event.
- [ ] A malformed tool call from the mock server is passed through as its raw string (no parse error from the client).
- [ ] 503-then-200 succeeds within `retries`; 503 beyond `retries` fails with `PROVIDER_UNREACHABLE` or the matching coded error; 401 fails immediately with `PROVIDER_UNAUTHORIZED` and no retry.
- [ ] A stalled mock response fails with `PROVIDER_TIMEOUT` after `timeout`; an abort mid-stream ends with `PROVIDER_ABORTED` and the mock sees the connection close.
- [ ] A key set through the API is in the secrets file (mode 0600, directory 0700), `settings.yaml` holds only its `keyRef`, and no GET response, stdout line or error message contains the key.
- [ ] With an empty model, resolution picks the first listed model as `auto` without writing to disk.
- [ ] **Milestone part (M1)**: with the real compose stack and Ollama running on the host, the Agent loop's M1 run reaches the model through the seeded provider without any provider configuration. M1 (walking skeleton) *done when*: "the author types 'summarize my outline' and gets a correct answer with visible tool calls" (owned by the Agent loop; this phase supplies the model path).

Demo script (under 5 minutes):
1. On the host: `OLLAMA_CONTEXT_LENGTH=64000 OLLAMA_HOST=0.0.0.0 ollama serve` and `ollama pull <model>`.
2. Install Scriba with the one-liner on a fresh `~/Books`; open the setup URL.
3. Show `~/Books/.scriba/settings.yaml`: the seeded `ollama` provider, no key.
4. Call the connection test for `ollama` from the browser's dev tools (or the API with the session cookie): `ok: true`, model count > 0.
5. Open the sample project, type "summarize my outline" in chat (Agent loop M1): tokens stream and tool-call cards appear.

### `phase:settings-ui` (M2)
Blocked by: `phase:client`; Frontend shell `phase:core`.
Scope:
- The BYOK settings route: provider list, add from preset, edit form, model picker with free-text fallback, write-only masked key field, connection test with staged result, Ollama context-length and "pull a model" hints, app default selector.
- The exported providers panel component for Setup & auth's `/setup` providers step.

Acceptance criteria:
- [ ] Adding OpenRouter from its preset, pasting a key and saving shows the key masked; reloading never shows the full key.
- [ ] The model picker lists the provider's models; when the list fails it switches to a free-text field with a short explanation.
- [ ] The connection test shows the failing stage and its hint for unreachable, unauthorized and unknown-model cases.
- [ ] An Ollama provider shows the `OLLAMA_CONTEXT_LENGTH` ≥ 64000 hint; an empty model list shows the "pull a model" hint.
- [ ] Deleting the app-default provider is refused with a message to pick another default first.
- [ ] The panel renders inside a host page (as `/setup` will embed it) with no dependency on the settings route.
- [ ] The route is usable at phone width for switching the app default.

### `phase:project-override` (M2)
Blocked by: `phase:settings-ui`; Project store `phase:contract` (the `project.yaml` model override field) and `phase:files` (file reads and `updateProjectYaml`).
Scope:
- Read the per-project override in resolution; set/clear it through the HTTP API, writing `project.yaml` via the Project store's file API.
- The project model panel and the effective-model readout (source `project`, `app` or `auto`, with fallback warning).

Acceptance criteria:
- [ ] Setting an override writes only the model-override field of `project.yaml` (other fields untouched) and the next run in that project uses it.
- [ ] Clearing it returns the project to the app default.
- [ ] An override naming a deleted provider resolves to the app default with a warning, shown in the project model panel.
- [ ] Switching the active project changes the effective model the client resolves.
- [ ] The nonfiction sample's `project.yaml` (no override) still validates and resolves to the app default.

## Contracts

**Produces: `@bbartolome/scriba-contracts/providers`** (published in `phase:contract`)
- Provider config `{id, kind:'openai-compatible', baseURL, model, temperature, contextSize, maxTokens, timeout, retries, keyRef}` (Zod discriminated union on `kind`), plus the read view with `keySet` and the masked hint.
- Defaults constants; presets `{id, label, baseURL, keyRequired, hints}` for Ollama, LM Studio, OpenAI, OpenRouter.
- Model list response.
- Connection-test request (saved id or draft config, optional test-only key) and result `{ok, stage, latencyMs, modelCount?, error?}`.
- `ModelChoice {providerId, model}`; app default request; per-project override set/clear requests; effective-model response `{choice, source:'project'|'app'|'auto', contextSize, warning?}`.
- Write-only key request (set/clear).
- Provider error codes (per Platform's convention).

**Produces (in-process, not a contract slice):** the client interface (streaming chat with tool calls, collect helper, resolution) as an injectable NestJS provider, consumed by the Tool registry (tool execution) and the Agent loop (chat loop, grounding judge). Also the exported providers panel Angular component, consumed by Setup & auth's `/setup` providers step.

**Consumes:**
- Platform: `/platform` base error shape and error-code convention, app composition root, the mock OpenAI server, compose `extra_hosts` + ST-3 (`phase:scaffold` and `phase:image-compose`).
- Setup & auth: `/setup-auth` guard for the HTTP API (`phase:token-guard`).
- Project store: `/project-store` `project.yaml` schema (the model override field) and the file API for reading and writing it (`phase:contract`, then `phase:files` for `phase:project-override`).
- Tool registry: `/tool-registry` model function-schema shape, passed through the client's `tools` input (`phase:contract`).
- Frontend shell: API client, theming, route table entry (`phase:core`).

**Consumers of this module:**
- Agent loop: client interface + `/providers` effective-model response. Its `phase:file-tools-chat` (M1) is blocked by this module's `phase:client` (implementation, not just contract).
- Tool registry: client interface for tool execution.
- Setup & auth: `/providers` slice + the providers panel for the `/setup` providers step (blocked by `phase:settings-ui`).
- Graph runner: indirectly, through the Tool registry.

## Testing Decisions

- **What makes a good test**: it exercises external behaviour only (HTTP responses, the stream events a caller receives, files on disk, bytes on the wire seen by the mock server), never internal services or the SDK's internals.
- **Primary seam: the running API's HTTP surface.** Boot the module imported into a test NestJS app (or the composed app) against a temp library folder and the mock OpenAI server. Assert on API responses, on `settings.yaml` and the secrets file on disk (contents and modes), and on what the mock server received (headers, body, number of attempts).
- **Client seam**: the in-process client interface is the module's API for other API modules; tests drive it the same way the Agent loop will (stream a chat, abort it) against the mock server, asserting on the events received.
- **Mock OpenAI server fixtures** (added additively to Platform's `e2e/fixtures/mock-openai/`): `GET /v1/models` (non-empty, empty, failing); a streamed text reply; a streamed tool call with arguments split across chunks; a malformed tool call; 401 without the expected key; 503-then-200 and persistent 503; 429 with `Retry-After`; a stall for timeouts; a long stream for abort.
- **Secrecy tests**: after setting a key, assert it appears in no GET response, no `settings.yaml` byte, no captured stdout line and no error body; the mock server sees it in `Authorization` only.
- **Seeding tests**: fresh library seeds once; an existing section (including an empty list) is untouched; a newer `schemaVersion` is refused, per the migration rules.
- **UI seam**: the settings route and the providers panel rendered with Angular's Vitest runner against a fake API client built from the `/providers` contract types: preset add, masked key, model-list fallback to free text, test result stages, hints, delete-default refusal, project override readout.
- **Contract seam**: Zod schema tests, and CI validating the samples' `project.yaml` model override (when present) against the Project store schema.
- **System seam**: the Platform-owned Playwright e2e runs against the mock OpenAI server configured as a provider. This module's milestone contribution is that the e2e's provider configuration goes through the real providers API (and from M2, the `/setup` providers step's panel).
- **Real-model check**: covered by the manual eval script, not CI.
- Vitest everywhere, NestJS via `unplugin-swc`. No prior art in the repo yet.

## Out of Scope

- **Native provider adapters** (Ollama `/api/chat` with `num_ctx`, Anthropic, Google). Deferred; the `kind` field leaves room.
- **Per-tool model choice**.
- **The per-tool enable switch**: it's the Tool registry's `enabled` field.
- **Schema-validation retries** for tool-call arguments: the Agent loop's.
- **Setting Ollama's context length from Scriba**: impossible over the compatible endpoint; v1 only shows the hint.
- **Pulling models from the UI**: v1 shows a hint; pulling needs Ollama's native API.
- **Embeddings / vector search** providers (later, without breaking the search contract).
- **Strong encryption of keys**: the secrets file is a permissions floor, not a vault.
- **Running Ollama inside the compose stack**: Ollama stays on the host.
- **Replaced earlier designs**: a settings page with an endpoint URL, model name, temperature, context size and a per-tool enable switch is replaced by a provider registry with presets and write-only keys, plus an app default and a per-project override; the per-tool switch is the Tool registry's `enabled` field. Default endpoints for Ollama on port 11434 and LM Studio on port 1234 are replaced by one seeded Ollama provider at `host.docker.internal` plus an LM Studio preset, because the app runs in a container. Two schema-validation retries stay in the Agent loop, not in this module.

## Further Notes

- **`settings.yaml` file ownership**: this module owns its `providers` section (configs and app default) and that section's migration. Platform owns the file envelope and the startup migration hook, and every module registers its section the same way (Platform spec).
- **Secrets file sharing**: this module creates and writes the secrets file (`/books/.scriba/secrets.yaml`) for provider keys. Setup & auth stores no secrets in it: the setup token has its own file under `/books/.scriba/`, and the Tailscale auth key stays in the installer's `.secret` outside the library. No other v1 module stores a secret. If a later module needs one, it reuses this module's secrets-file helper rather than adding a second file.
- **Project override shape alignment**: the `project.yaml` override field is defined by the Project store spec. It must match `ModelChoice {providerId, model}`; a type-level test in this module's `phase:project-override` asserts the two stay compatible. Project store's slice should not import `/providers` (avoids a contract-phase cycle in wave 1).
- **Client interface types**: chat messages and stream events are in-process types, not part of the HTTP contract slice. If a future need puts them on the wire (for example a "test prompt" in the UI), add them to `/providers` via expand–contract.
- **`max_tokens`**: the client sends `max_tokens`, which Ollama, LM Studio and OpenRouter accept. Some newer OpenAI models want `max_completion_tokens` instead; if that bites, the fix is a per-provider flag (expand), not a new kind. Verify against the OpenAI API reference in `phase:client`.
- **Running outside Docker** (`npm run dev`): `host.docker.internal` may not resolve on Linux. The seed stays the same; the unreachable hint suggests `http://localhost:11434/v1`.
- **ST-3** (Platform) is what makes the zero-config Ollama path real on both Mac and Linux. If it fails on Linux, the fallback is guidance in the hint, not a different seed.
- **Ollama listening address**: on Linux, Ollama bound to `127.0.0.1` isn't reachable via `host-gateway`; the unreachable hint mentions `OLLAMA_HOST=0.0.0.0`. Confirm during ST-3.
