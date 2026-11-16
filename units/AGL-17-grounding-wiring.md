---
id: AGL-17
title: Grounding wiring — automatic after drafts, check_grounding tool, on-demand action, summary on pending changes, events
module: agent-loop
phase: phase:grounding
milestone: M3
blocked_by: [AGL-13, AGL-16]
parallel_with: [AGL-15, AGL-18, AGL-19]
unblocks: [AGL-20]
---

# AGL-17 — Grounding wiring

## Why
A check runs automatically after any draft (32), on demand (36), and the review queue shows the summary.

## Decisions
- **Automatic:** after every `draft` tool output and for every `drafts/` path the overlay touched, **before** pending changes are created at run end.
- **On demand:** `check_grounding(path)` for the model, and a "Check grounding" UI action — `POST …/grounding {path}` starts an agent run whose only step is the check (subject to one-active-run).
- Events `grounding-started` and `grounding-result`; a `grounding` transcript section.
- The draft's pending change carries the grounding summary `{supported, weak, unsupported, checkedAt}` in the Project store's `grounding` field.

## Acceptance criteria
- [x] An agent-drafted paragraph triggers a check automatically; its pending change carries the summary.
- [x] `check_grounding` and the on-demand endpoint both produce a `grounding-result` and an artefact.
