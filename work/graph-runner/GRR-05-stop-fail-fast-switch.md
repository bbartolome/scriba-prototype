---
id: GRR-05
title: Stop, fail-fast on error, and stop on project switch
module: graph-runner
phase: phase:engine
milestone: M4
blocked_by: [GRR-04]
parallel_with: [GRR-06, GRR-07]
unblocks: [GRR-08, GRR-13]
---

# GRR-05 — Stop and failure handling

## Why
Remaining steps stop when one fails (31); Stop ends the run promptly and cancels the model call (32).

## Decisions
- **Fail-fast:** when a node fails it becomes `error` with a readable message; every node still `queued` becomes `stopped`; the run ends `error`. Pending changes already created stay in the queue.
- **Stop** (POST `{runId}`; unknown run → `GRAPH_RUN_NOT_FOUND`): aborts the model call in progress; the running node and every queued node become `stopped`; the run ends `stopped` with reason `author`. **No pending change is created after the stop is received.**
- **Project switch:** register with the Project store's in-process `onProjectSwitched` hook; a switch stops the old project's active run exactly like Stop, with reason `project-switched`.

## Acceptance criteria
- [ ] A mock tool failure marks that node `error`, queued nodes `stopped`, and ends the run `error`.
- [ ] Stop during a slow mock call ends the run `stopped` within 2 seconds, the mock sees the request aborted, and no pending change is created afterwards.
- [ ] Switching the active project mid-run ends the run `stopped` with reason `project-switched`.
