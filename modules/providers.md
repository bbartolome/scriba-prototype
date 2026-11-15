## Model providers

The module owns "talk to a model": one `openai-compatible` provider kind on the official `openai` SDK, an in-process streaming client with tool calls used by the Agent loop and the Tool registry, a provider registry in `settings.yaml` with keys only in a 0600 secrets file, zero-config Ollama seeding, model resolution (project override → app default → provider model → first listed), and the BYOK settings UI (also embedded by `/setup`).

### Ordering

Gates are unchanged from the original spec. Within `phase:client`, the SDK client (MPR-04) is built against a resolved config and needs only the contract and Platform's mock server, so it runs in parallel with the registry and secrets work. The override API (MPR-12) needs the client gate and Project store `phase:files`, not the settings UI; only the project model panel (MPR-13) waits for the settings route.

### Dependency graph

```
MPR-01 contract slice  ══> phase:contract
 ├─ MPR-02 module skeleton, registry in settings.yaml, Ollama seeding
 ├─ MPR-03 secrets file helper (0600/0700, atomic, tighten/warn) + log redaction
 └─ MPR-04 openai-compatible client: streaming, tool-call assembly, abort, errors, retries, timeout (needs PLT-12)
      MPR-05 model resolution + model list (needs 02, 03, 04)
       └─ MPR-06 HTTP API: CRUD, keys, app default, model list, effective model (needs 02, 03, 05)
            └─ MPR-07 connection test (needs 04, 06)
 MPR-08 client gate (guard, secrecy suite, M1 real-Ollama check)  ══> phase:client
 MPR-09 providers panel component (needs 06 + Shell phase:core)
  └─ MPR-10 connection-test UI + hints (needs 07)
 MPR-11 /providers route + settings-ui gate  ══> phase:settings-ui
 MPR-12 project override: resolution + set/clear API (needs 08 + Project store phase:files)
 MPR-13 project model panel + effective-model readout (needs 11, 12)  ══> phase:project-override
```

### Parallelism
- After MPR-01: MPR-02, MPR-03, MPR-04 in parallel.
- MPR-09 can start against the Shell's fake API as soon as Shell `phase:core` closes; it merges once MPR-06 is in.
- MPR-12 runs in parallel with the settings UI (MPR-09…11).

### Cross-cutting decisions
- **Module shape:** NestJS `@Module` at `apps/api/src/modules/providers/` (one import in the composition root) and lazy feature routes at `apps/web/src/app/features/providers/`. Publishes `/providers`; exposes the client in-process; serves `/api/providers/…` behind Setup & auth's guard; ships the BYOK UI.
- **SDK confinement:** the `openai` SDK is used only inside this module. The client always passes `baseURL` and `apiKey` explicitly so the SDK never falls back to `OPENAI_API_KEY` / `OPENAI_BASE_URL` from the environment; keyless providers get a fixed placeholder key (the SDK requires a non-empty one).
- **`kind`** is a Zod discriminated-union key with one member (`openai-compatible`) in v1; native adapters later add members behind the same client interface (expand–contract).
- **Secrets:** keys live only in `/books/.scriba/secrets.yaml` (0600 in 0700). `settings.yaml` holds only `keyRef`. No API ever returns a key; reads return `keySet` and a masked hint (last four characters). Keys never appear in logs, transcripts, errors or the event stream. This is a permissions floor, not a vault. If a later module needs a secret, it reuses this module's secrets-file helper rather than adding a second file. Setup & auth stores nothing there.
- **`settings.yaml`:** this module owns the `providers` section `{schemaVersion: 1, list: ProviderConfig[], appDefault: ModelChoice | null}` and its migration, registered with Platform's hook (PLT-07).
- **`project.yaml` override** is defined by the Project store slice (PST-01) as `{providerId, model}`; it must match `ModelChoice` (type-level test in MPR-12). The Project store slice must not import `/providers`.
- **Methods:** GET/HEAD never mutate; commands are POSTs. **No SSE events** in v1 (run-time model errors reach the author through the Agent loop's and Graph runner's events).
- **Client interface types** (messages, stream events) are in-process TypeScript, not part of the HTTP slice. If they ever go on the wire, add them to `/providers` via expand–contract.

### Testing principles
- External behaviour only: HTTP responses, the stream events a caller receives, files on disk (contents and modes), and what the mock OpenAI server received (headers, body, attempt count). Never internal services or SDK internals.
- Primary seam: the module in Platform's `create-test-app` against a temp library and Platform's mock OpenAI server (PLT-12).
- UI seam: routes and the panel with Angular's Vitest runner against the Shell's fake API client (SHL-07) built from `/providers` types.
- Real-model check: the Agent loop's manual eval script, not CI.
- Until AGL-25 exists, the MPR-08 T2 procedure (plans/MPR-08.md section 4.2) serves as the providers module's real-model check.

### Out of scope
- Native adapters (Ollama `/api/chat` with `num_ctx`, Anthropic, Google) — deferred; `kind` leaves room.
- Per-tool model choice (deferred). The per-tool enable switch is the Tool registry's `enabled` field.
- Schema-validation retries for tool-call arguments (the Agent loop's: two retries with a readable error to the model).
- Setting Ollama's context length from Scriba (impossible over the compatible endpoint; hint only). Pulling models from the UI (hint only).
- Embeddings / vector-search providers. Strong encryption of keys. Running Ollama inside the compose stack (it stays on the host).
- Replaced designs: a single settings page with endpoint/model/temperature/context/per-tool switch → registry with presets, write-only keys, app default and per-project override. Default endpoints for Ollama on 11434 and LM Studio on 1234 → one seeded Ollama provider at `host.docker.internal` plus an LM Studio preset (the app runs in a container).

### Further notes
- **Running outside Docker** (`npm run dev`): `host.docker.internal` may not resolve on Linux. The seed stays the same; the unreachable hint suggests `http://localhost:11434/v1`.
- **ST-3** (Platform PLT-16) makes zero-config Ollama real on Mac and Linux. If it fails on Linux, the fallback is guidance in the hint, not a different seed. On Linux, Ollama bound to `127.0.0.1` isn't reachable via `host-gateway`; the unreachable hint mentions `OLLAMA_HOST=0.0.0.0`.
