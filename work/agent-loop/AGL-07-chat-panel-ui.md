---
id: AGL-07
title: Chat panel UI — conversations, streaming text, tool-call cards, stop, step counter, settings sheet, phone layout
module: agent-loop
phase: phase:file-tools-chat
milestone: M1
blocked_by: [AGL-01, "Frontend shell phase:core (SHL-09)", "Shell tool-call card (SHL-10)"]
parallel_with: [AGL-02, AGL-03, AGL-04, AGL-05, AGL-06]
unblocks: [AGL-08, AGL-14, AGL-18]
---

# AGL-07 — Chat panel

Built against the Shell's fakes (SHL-07) from contract types; merges once the API exists.

## Decisions
- Lazy route `/projects/:projectId/chat` (one Shell route-table entry, project-scoped, minimum class `phone`, nav). On desktop it may dock beside the editor if the Shell offers a slot.
- Conversation list, message stream (tokens append from `token-delta`), intent box, **stop button** (visible only while an agent run is active), **step counter** ("step 4 of 12"), "Continue" after `capped`, and a **settings sheet** (step cap; research toggles and endpoint, used from AGL-21).
- **Tool-call cards** use the Shell's shared card; this module maps events onto its view model and supplies per-family bodies: arguments, result, error with the attempt number and "withdrawn" marker, sources-used links (from AGL-09).
- **Reconnect:** on the Shell's reconcile tick, fetch current-run-state, replace the view, then apply only events with `seq > lastSeq`.
- **Phone:** one column, cards collapsed to one line by default, stop button and intent box reachable with the keyboard open, tap targets ≥ 44 px.
- Clear messages for `AGENT_NO_PROVIDER` (link to `/providers`) and `AGENT_RUN_ACTIVE`.
- At `run-ended`, a link to `/projects/:projectId/review?run=<runId>` when pending change IDs exist.

## Acceptance criteria (Vitest + fakes)
- [ ] Tokens append; cards move from started to result or error with the attempt number.
- [ ] Stop appears only while an agent run is active.
- [ ] A reconnect replaces the view from run-state and ignores events at or below `lastSeq`.
- [ ] The phone breakpoint shows one column with collapsed cards.
