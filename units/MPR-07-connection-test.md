---
id: MPR-07
title: Staged connection test with author-facing hints
module: providers
phase: phase:client
milestone: M1
blocked_by: [MPR-04, MPR-06]
parallel_with: []
unblocks: [MPR-08, MPR-10]
---

# MPR-07 — Connection test

## Why
Find a wrong URL, key or model now (5), know which step failed (6), with the unreachable-Ollama reminder (7) and clear key/credit messages (32).

## Decisions
- `POST` connection test with either a saved provider id or an **unsaved draft** config, plus an optional key used **for the test only** (never stored).
- Stages: **reach** the server → **list** models (catches bad keys on hosted providers) → a minimal **one-token chat** with the chosen model.
- Result `{ok, stage, latencyMs, modelCount?, error?: {code, message, hint?}}`.
- Hints per failure: unreachable Ollama → "is Ollama running on the host, listening on all interfaces?" (mention `OLLAMA_HOST=0.0.0.0` on Linux); outside Docker → try `http://localhost:11434/v1`; unauthorized → key rejected or out of credit; model not found → pick from the list; empty Ollama list → `ollama pull <model>` on the host.

## Acceptance criteria
- [ ] Against mock scenarios: unreachable fails at `reach` with the Ollama hint; 401 fails at `list` with the key hint; unknown model fails at `chat`; success returns `ok`, `latencyMs` and `modelCount`.
- [ ] A draft config with a test-only key leaves `settings.yaml` and the secrets file unchanged.
