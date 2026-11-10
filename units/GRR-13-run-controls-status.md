---
id: GRR-13
title: Run controls, input-values dialog, live node status and inline results, read-only while running
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-04, GRR-05, GRR-06, GRR-11, "Project store review route (PST-20)"]
parallel_with: [GRR-12, GRR-14, GRR-16]
unblocks: [GRR-15, GRR-17]
---

# GRR-13 — Run UI

## Why
The input-values dialog (21–25), Run / Run to here / Stop (26–27, 32), live status (28) with inline results and citations (29), readable errors (30), review links (33), status after wake or on another device (36–37), read-only while running (39).

## Decisions
- **Run**, **Run to here** (node action) and **Stop**.
- **Input-values dialog** lists the input nodes **and output nodes in scope**: text → typed text or a project file picker; entity → entity picker filtered by the receiving port's kind (and `entityKind`); style → style picker defaulting to the project's style profile (`project.yaml`); output → target path (default from `params.path` or the generated name).
- **Status badges** per node driven by signals from `graph-runner` SSE events, **reconciled from current-run-state** on load and on the Shell's reconcile tick.
- **Inline results:** an expandable preview of `output` with cited files (`sourcesUsed`); errors shown readably; output nodes link to `/projects/:projectId/review?run=<runId>`.
- The canvas is **read-only** while its recipe is running.

## Acceptance criteria
- [ ] Dialog tests (fakes): scope-aware fields for whole runs and Run to here, style default, target paths.
- [ ] Badges follow fake `node-status` events and show the correct state after a reload mid-run (reconcile).
- [ ] Stop posts and the canvas returns to editable after `run-ended`.
- [ ] Output nodes show their pending-change link.
