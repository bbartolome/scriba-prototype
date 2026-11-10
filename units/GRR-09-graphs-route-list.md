---
id: GRR-09
title: Graphs route, graph list with latest run status, create/rename/delete UI, phone gate
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-02, "Frontend shell phase:core (SHL-09)"]
parallel_with: [GRR-10, GRR-11, GRR-14, GRR-16]
unblocks: [GRR-17]
---

# GRR-09 — Graphs list

## Decisions
- One Shell route-table entry at `/projects/:projectId/graphs` (project-scoped, minimum class `phone`, nav). It shows the graph list (name, view, node count, validity, pending-change badge) and each recipe's **latest run status read-only** (from current-run-state, refreshed on `graph-runner` events and reconcile ticks).
- Its child route `:graphId` hosts the canvas and is gated with the Shell's `deviceClassGuard('tablet')`, so a phone gets the "needs a larger screen" page there.
- Create (name, view), rename and delete actions on tablet/desktop.

## Acceptance criteria
- [ ] Component tests (fakes): list renders, create/rename/delete call the API, latest run status follows fake events.
- [ ] A phone-sized viewport shows the list and run status, and the canvas route shows the gate message.
