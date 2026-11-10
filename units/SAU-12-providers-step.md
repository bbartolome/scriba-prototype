---
id: SAU-12
title: /setup Model providers step (embedded panel)
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-11, "Model providers phase:contract (MPR-01)", "Model providers phase:settings-ui (to embed; link to /providers until then)"]
parallel_with: [SAU-13, SAU-14, SAU-15]
unblocks: [SAU-16]
---

# SAU-12 — Providers step

## Decisions
- Embeds the Model providers module's exported settings panel (an Angular API). Until Model providers `phase:settings-ui` lands, the step links to `/providers` instead.
- **Never reimplements** provider forms, model listing or the connection test. Ollama is seeded by Model providers.
- Marks the `providers` step `done` when the author continues with a usable provider, or `skipped`.

## Acceptance criteria
- [ ] The step renders the Model providers component (a stub of it in tests) and contains no provider form of its own.
- [ ] Before the panel exists, the step shows a link to `/providers`.
