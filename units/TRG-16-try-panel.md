---
id: TRG-16
title: Try panel — run a tool against the active project
module: tool-registry
phase: phase:editor-ui
milestone: M2
blocked_by: [TRG-12, TRG-13, "Project store phase:files (PST-12)"]
parallel_with: [TRG-14, TRG-15]
unblocks: [TRG-17]
---

# TRG-16 — Try panel

## Decisions
- In the detail view: fill the tool form (pickers on the active project), resolve the chosen entities **in the browser** through the Project store's GET resolution endpoint (fill an empty style field with the project's style profile first), call `execute`, show `output` and `sourcesUsed`.
- **Never creates a pending change** and writes no files.
- Shows `TOOL_*` errors readably (including model errors).
- The Try tab is hidden on an invalid row. Added by the Navigator's decision on TRG-13 open point 2 (2026-11-16). See plans/DECISIONS.md.

## Acceptance criteria
- [x] Component test (fakes): resolution request carries the chosen IDs; execute is called with resolved entities; output and sources render.
- [x] In the running app, Try produces output and no file appears under `.scriba/pending/`.
