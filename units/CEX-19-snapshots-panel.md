---
id: CEX-19
title: Snapshots panel — create with label, list, restore behind confirmation
module: compile-export
phase: phase:manuscript-snapshots
milestone: M5
blocked_by: [CEX-16, CEX-17]
parallel_with: [CEX-15, CEX-18]
unblocks: [CEX-20]
---

# CEX-19 — Snapshots UI

## Decisions
- Create with a label; list newest first with label, time, file count and words (unreadable ones marked and not restorable).
- Restore behind a confirm dialog that names the `pre-restore` snapshot it will create.
- Refreshes on `snapshot-created` / `snapshot-restored`.

## Acceptance criteria (Vitest + fakes)
- [x] Restore needs confirmation; the dialog names the pre-restore snapshot.
- [x] Unreadable snapshots can't be restored.
