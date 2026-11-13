---
id: MPR-05
title: Model resolution (app default, provider model, auto) and the model-list proxy
module: providers
phase: phase:client
milestone: M1
blocked_by: [MPR-02, MPR-03, MPR-04]
parallel_with: []
unblocks: [MPR-06, MPR-08, MPR-12]
---

# MPR-05 — Resolution and model list

## Why
Pick from the server's list (3); see which model a run uses and where it came from (25); the Agent loop budgets with `contextSize` (39); the Tool registry and Agent loop agree on the model (37).

## Decisions
- **Resolution call** (in-process, consumed by the Agent loop and the Tool registry): input an explicit `ModelChoice` or a project id; output the effective provider config (minus secrets), model, `contextSize`, `source` and any warning (the effective-model response shape). The streaming client takes the target this call produces; it does not call resolution itself.
- **Order:** project override (added in MPR-12) → app default → provider's own `model` → **first model listed** by `GET /v1/models` (`source: 'auto'`). `auto` is never written to disk. An empty list → `PROVIDER_NOT_CONFIGURED` with the "pull a model" hint (for Ollama). No app default and no override → `PROVIDER_NOT_CONFIGURED`.
- **Model list:** proxies the provider's `GET /v1/models`, returns sorted ids; never changes state; failures return a coded error (the UI falls back to free text).

## Acceptance criteria
- [x] With an empty model, resolution picks the first listed model as `auto` and `settings.yaml` is unchanged.
- [x] An explicit provider model wins over `auto`; the app default's model wins over the provider's.
- [x] An empty Ollama model list yields `PROVIDER_NOT_CONFIGURED` with the pull hint.
- [x] A chat through the client, where the target is produced by resolving a project id, uses the resolved model (mock sees it in the body).
