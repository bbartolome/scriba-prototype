---
id: MPR-10
title: Connection-test UI with staged results, Ollama context-length and pull-a-model hints
module: providers
phase: phase:settings-ui
milestone: M2
blocked_by: [MPR-07, MPR-09]
parallel_with: [MPR-12]
unblocks: [MPR-11]
---

# MPR-10 — Connection test UI and hints

## Decisions
- A "Test connection" button in the panel's edit form (works for saved and unsaved drafts, with the typed key used only for the test). Shows the staged result: passed stages, the failing stage, its message and hint, latency and model count.
- **`OLLAMA_CONTEXT_LENGTH` ≥ 64000 hint** for any provider created from the Ollama preset or whose baseURL uses port 11434 — static guidance (the compatible endpoint can't report or set it).
- **"Pull a model" hint** (`ollama pull <model>` on the host) when an Ollama provider's model list is empty.

## Acceptance criteria
- [x] The test shows the failing stage and its hint for unreachable, unauthorized and unknown-model results.
- [x] An Ollama provider shows the context-length hint; an empty model list shows the pull hint; a non-Ollama provider shows neither.
