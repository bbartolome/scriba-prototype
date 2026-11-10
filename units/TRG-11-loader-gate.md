---
id: TRG-11
title: Loader-validation gate — guard adoption and phase checklist
module: tool-registry
phase: phase:loader-validation
milestone: M2
blocked_by: [TRG-06, TRG-07, TRG-09, TRG-10, "Setup & auth phase:token-guard (SAU-08)"]
parallel_with: []
unblocks: [TRG-12, TRG-13, "Platform examples check pack layer (PLT-22)", "Agent loop narrative tools (AGL-09)", "Graph runner validation (GRR-03)"]
---

# TRG-11 — Loader gate

Merging this **closes Tool registry `phase:loader-validation`**.

## Scope
- Confirm every `/api/tool-registry` route is behind Setup & auth's guard; Setup & auth's invariant tests pass for them.
- `npm run lint:packs` wired into `npm run lint` and green in CI.
- The exported catalog service is documented for the Agent loop and Graph runner.

## Acceptance criteria (the `phase:loader-validation` checklist)
- [ ] TRG-06, TRG-07, TRG-09, TRG-10 criteria pass on `main`.
- [ ] Unauthenticated requests to registry routes are refused.
