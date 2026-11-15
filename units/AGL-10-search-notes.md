---
id: AGL-10
title: search_notes project tool
module: agent-loop
phase: phase:narrative-tools
milestone: M2
blocked_by: [AGL-02, AGL-03, "Project store phase:search (PST-13)"]
parallel_with: [AGL-09, AGL-12, AGL-25]
unblocks: [AGL-11, AGL-16]
---

# AGL-10 — `search_notes`

## Decisions
- `search_notes {query, limit?, scope?}` calls the Project store search contract (`query → ranked passages {path, offset, snippet, score}`) in-process on the bound project, and returns passages as the tool result (project-relative paths).

## Acceptance criteria
- [ ] A scripted turn calling `search_notes` gets ranked passages from a temp project's `sources/`, with `drafts/` never present.
- [ ] Invalid arguments get the readable error.
