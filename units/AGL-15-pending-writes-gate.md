---
id: AGL-15
title: Pending-writes gate — e2e accept-change step with the Project store
module: agent-loop
phase: phase:pending-writes
milestone: M3
blocked_by: [AGL-12, AGL-13, AGL-14, "Project store phase:pending-review (PST-22)"]
parallel_with: [AGL-16, AGL-17, AGL-18, AGL-19]
unblocks: [AGL-20]
---

# AGL-15 — Pending-writes gate

Merging this **closes Agent loop `phase:pending-writes`**.

## Scope
- With the Project store, the e2e **"accept change"** step: the agent edits a draft, the pending change appears, it's accepted, and the draft (and its version) is on disk. Coordinate with PST-22, which owns the accept assertion.

## Acceptance criteria (the phase checklist)
- [x] No agent write touches disk before acceptance; two edits → one pending change against the first base; a stopped agent run still creates its changes; propose-graph valid/invalid handling (AGL-12, AGL-13).
- [x] The e2e accepts an agent-made change and sees it in the draft.
