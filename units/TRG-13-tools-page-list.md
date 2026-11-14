---
id: TRG-13
title: Tools page — list grouped by origin, enable toggles, phone view, live refresh
module: tool-registry
phase: phase:editor-ui
milestone: M2
blocked_by: [TRG-05, TRG-11, "Frontend shell phase:core (SHL-09)"]
parallel_with: [TRG-12]
unblocks: [TRG-14, TRG-16, TRG-17]
---

# TRG-13 — Tools list

## Decisions
- Route `/tools` (app-level, one Shell route-table entry, minimum class `phone`); replaces the dev preview route's placement (keep the preview as a detail tab).
- List grouped by origin (`core`, `nonfiction`, `fiction`, `user`) with validity, lint counts, "overrides built-in" marker, and **enable toggles**. Validity is derived from `output` being null (the Navigator's decision of 2026-11-14 on TRG-01 open point 2, `plans/DECISIONS.md`).
- On the `phone` device class, only the list and toggles are reachable (detail view switches to list-only).
- Refreshes on `catalog-changed`.

## Acceptance criteria
- [ ] Component tests: grouping, toggle posts `enabled`, invalid tools marked, a `catalog-changed` event refreshes.
- [ ] On a phone-sized viewport only the list and toggles are reachable.
