---
id: CEX-17
title: Manuscript route — outline with drag reorder, status and part controls, totals, indicators, phone layout
module: compile-export
phase: phase:manuscript-snapshots
milestone: M5
blocked_by: [CEX-01, "Frontend shell phase:core (SHL-09)"]
parallel_with: [CEX-02, CEX-03, CEX-08, CEX-09, CEX-10, CEX-16]
unblocks: [CEX-18, CEX-19, CEX-20]
---

# CEX-17 — Manuscript outline UI

Built against the Shell's fakes from contract types; merges once CEX-03 is in.

## Decisions
- Lazy route `/projects/:projectId/manuscript` (one Shell route-table entry, project-scoped, minimum class `phone`, nav).
- Outline grouped **Front / Body / Back**; each row: file name, **status chip** (editable), **part** control, word count, **graph-ordered badge** (those rows can't be dragged), open-file link (`/projects/:projectId/files?path=…`).
- Totals bar (body and manuscript), **order-source indicator**, and the **graph-cycle** / invalid-graph / stale-entry warnings.
- **Drag and drop** with Angular CDK on tablet and desktop; a drop sends reorder with the current `revision`; a conflict response shows a reload prompt.
- Subscribes to `compile-export` events and refetches on `manuscript-updated`; also refetches on the Project store's `files-changed` touching `drafts/` or `project.yaml`.
- **Phone:** outline, counts and statuses read-only (download allowed in CEX-18).

## Acceptance criteria (Vitest + fakes)
- [ ] A drag sends a reorder with the current `revision`; graph-ordered rows can't be dragged.
- [ ] A conflict response shows the reload prompt; `manuscript-updated` refetches.
- [ ] Status and part changes send their requests.
- [ ] The phone viewport is read-only.
