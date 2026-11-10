---
id: AGL-06
title: Agent settings section and settings API
module: agent-loop
phase: phase:file-tools-chat
milestone: M1
blocked_by: [AGL-01, "Platform phase:scaffold (PLT-11; settings hook PLT-07)"]
parallel_with: [AGL-02, AGL-07]
unblocks: [AGL-03, AGL-21]
---

# AGL-06 — Settings

## Decisions
- Register the **`agent`** section with Platform's hook: version 1, default `{schemaVersion: 1, stepCap: 12, research: {enabled: false}}`.
- `GET /api/agent-loop/settings` and `POST /api/agent-loop/settings` (field-level merge, validated: `stepCap` integer ≥ 1; `searchEndpoint` an http(s) URL or absent).
- Read by the loop at the start of each agent run (step cap, research families).

## Acceptance criteria
- [ ] A fresh library gets the default section; changing `stepCap` persists across restarts and changes only that field.
- [ ] An invalid value returns `PLATFORM_VALIDATION_FAILED`.
