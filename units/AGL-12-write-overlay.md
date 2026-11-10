---
id: AGL-12
title: write_file and edit_file through the run overlay, captured base, propose at run end
module: agent-loop
phase: phase:pending-writes
milestone: M3
blocked_by: [AGL-02, AGL-08, "Project store propose (PST-15)"]
parallel_with: [AGL-09, AGL-10, AGL-11, AGL-25]
unblocks: [AGL-13, AGL-14, AGL-15, AGL-16, "Project store review gate (PST-22)"]
---

# AGL-12 — Write overlay

## Why
Every agent write becomes a pending change (15); later reads see earlier writes (16); edit mismatches are clear (17); all writes reach the queue at the end, even when stopped (19).

## Decisions
- `write_file {path, content}` and `edit_file {path, old, new}` **never write to disk**. Each agent run keeps a **run overlay** (proposed content per path); later `read_file` calls in the same agent run see the overlay.
- **Captured base** for a path: the on-disk content the first time the agent run reads or writes that path.
- `edit_file`: `old` must occur exactly once in the overlay or on-disk content; zero or several matches → readable error (counts as a retry).
- **At run end, for any reason** (completed, stopped, capped, error, project-switched): call the Project store's in-process `propose` once per touched path with the overlay content, the captured base, origin `{kind: 'agent-run', runId, toolCallId?}` (the call that last wrote the path), the draft provenance in `provenance` (when the content came from a narrative tool), and for `drafts/` paths the grounding summary in `grounding` (from AGL-17). Propose is allowed into the bound project even if no longer active. Then emit `run-ended` with the pending change IDs. The Project store's three-way check handles host edits in the meantime.

## Acceptance criteria
- [ ] No agent write changes a file on disk before the author accepts it (asserted on disk).
- [ ] Two edits to one file in one agent run yield one pending change against the first captured base; a read between them sees the first edit.
- [ ] A stopped agent run still creates its pending changes; a project-switched one creates them in the original project.
- [ ] Edit with zero and with two matches returns distinct readable errors.
