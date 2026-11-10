---
id: MPR-08
title: Client gate — guard adoption, secrecy suite, M1 real-Ollama check, demo
module: providers
phase: phase:client
milestone: M1
blocked_by: [MPR-02, MPR-03, MPR-04, MPR-05, MPR-06, MPR-07, "Setup & auth phase:token-guard (SAU-08)", "Platform phase:test-harness (PLT-13)"]
parallel_with: []
unblocks: [MPR-12, "Tool registry phase:executor (TRG-12)", "Agent loop loop core (AGL-03)"]
---

# MPR-08 — Client gate

Merging this **closes Model providers `phase:client`** (the Agent loop's M1 chat and the Tool registry's executor need the implementation, not just the contract).

## Scope
- Confirm all `/api/providers` routes are behind the guard (Setup & auth's invariant tests pass for them).
- **Secrecy suite** end to end: after setting a key, it appears in no GET response, no `settings.yaml` byte, no captured stdout line and no error body; the mock sees it in `Authorization` only.
- **System seam:** the Playwright e2e's "agent run" step configures its provider through this real API, pointing at a mock scenario URL (coordinate with the Agent loop, which owns the step).

## Acceptance criteria (the `phase:client` checklist)
- [ ] Seeding, streaming/tool-call assembly, malformed pass-through, retry/401, timeout/abort, key storage and `auto` resolution criteria (MPR-02…MPR-07) pass on `main`.
- [ ] **Milestone part (M1):** with the real compose stack and Ollama on the host, the Agent loop's M1 run reaches the model through the seeded provider with no provider configuration. (M1 *done when* "the author types 'summarize my outline' and gets a correct answer with visible tool calls" is owned by the Agent loop; this phase supplies the model path.)

## Demo (under 5 min)
1. On the host: `OLLAMA_CONTEXT_LENGTH=64000 OLLAMA_HOST=0.0.0.0 ollama serve` and `ollama pull <model>`.
2. Install Scriba with the one-liner on a fresh `~/Books`; open the setup URL.
3. Show `~/Books/.scriba/settings.yaml`: the seeded `ollama` provider, no key.
4. Call the connection test for `ollama` (dev tools or the API with the session cookie): `ok: true`, model count > 0.
5. Open the sample project, type "summarize my outline" in chat (Agent loop M1): tokens stream and tool-call cards appear.
