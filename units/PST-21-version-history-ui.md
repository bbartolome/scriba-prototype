---
id: PST-21
title: Draft version history UI in files
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-10, PST-18, "Frontend shell read-only diff (SHL-12)"]
parallel_with: [PST-19, PST-20, PST-23]
unblocks: [PST-22]
---

# PST-21 — Version history UI

## Decisions
- In the files page, a top-level draft shows its version history: list, view a version, diff it against the current draft (Shell's read-only diff), and restore (with confirmation).
- Refreshes on `files-changed`.

## Acceptance criteria
- [x] Component tests: list renders, selecting a version shows the diff against current, restore calls the restore POST and refreshes.
- [x] Works at phone width (read-only list and diff).
