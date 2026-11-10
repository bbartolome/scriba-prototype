---
id: GRR-08
title: Engine gate — phase:engine checklist
module: graph-runner
phase: phase:engine
milestone: M4
blocked_by: [GRR-02, GRR-03, GRR-04, GRR-05, GRR-06, GRR-07, "Project store phase:pending-review (PST-22)", "Setup & auth phase:token-guard (SAU-08)"]
parallel_with: [GRR-10, GRR-11, GRR-12, GRR-14]
unblocks: [GRR-17]
---

# GRR-08 — Engine gate

Merging this **closes Graph runner `phase:engine`**.

## Acceptance criteria (the `phase:engine` checklist)
- [ ] GRR-02…GRR-07 criteria pass on `main`.
- [ ] Every `/api/graph-runner` route is behind the guard; Setup & auth's invariant tests pass for them.
- [ ] Platform's boundaries lint confirms no import between `graph-runner` and `agent-loop`.
