---
id: PST-17
title: Conflict resolution — refresh (three-way merge) and accept anyway
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-16]
parallel_with: [PST-18, PST-19, PST-23]
unblocks: [PST-20, PST-22]
---

# PST-17 — Refresh and accept anyway

## Why
Small host edits shouldn't force throwing proposals away (27); the author can still choose the proposal without losing anything (28).

## Decisions
- **Refresh** (POST): three-way merge of base, proposed and disk. Clean merge → the **same** change gets disk as its new captured base and the merged text as `proposed`; the conflict clears; `pending-updated`. Overlapping hunks leave it conflicted.
- **Accept anyway** (separate POST, explicit confirmation): first save the current disk content — as a draft version (same path rule as PST-16) for top-level `drafts/` files, otherwise under `<project>/.scriba/backups/<UTC timestamp>/<path>` — then write the proposal (or the supplied edited `content`).
- Both require the project to be active.

## Acceptance criteria
- [ ] Refresh clears a conflict when host edits and proposal touch different paragraphs, with merged text containing both.
- [ ] Refresh keeps the conflict when they overlap, leaving the change unchanged.
- [ ] Accept-anyway keeps the overwritten disk content as a version (draft) or a backup (other file), then writes the proposal.
