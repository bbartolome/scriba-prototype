---
id: AGL-05
title: Current-run-state endpoint and seq-based reconcile
module: agent-loop
phase: phase:file-tools-chat
milestone: M1
blocked_by: [AGL-03]
parallel_with: [AGL-04, AGL-07]
unblocks: [AGL-08]
---

# AGL-05 — Current-run-state

## Why
A phone that slept catches up (48); two devices show the same agent run live (49).

## Decisions
- `GET /api/agent-loop/runs/current` returns the project's active agent run, or the most recent finished one: status, step and cap, accumulated assistant text, the cards with their state, grounding results so far, pending change IDs and **`lastSeq`**.
- A reconnecting client fetches it, **replaces its view**, then applies only events with `seq > lastSeq` (the Shell's reconcile tick triggers the fetch).
- State is held in memory for the active and the most recent agent run; after an API restart it is rebuilt from the latest transcript (a transcript without `run-end` reports `stopped`).

## Acceptance criteria
- [ ] Mid-run, current-run-state returns the same text and cards a live subscriber has accumulated, with the right `lastSeq`.
- [ ] After a restart, the last agent run is reported from its transcript.
- [ ] The GET is side-effect free.
