---
id: GRR-04
title: Run engine core — scope, refusals, input values, run-start reads, sequential topological run, executor calls, run state, SSE
module: graph-runner
phase: phase:engine
milestone: M4
blocked_by: [GRR-02, GRR-03, "Tool registry phase:executor (TRG-12)", "Platform phase:test-harness (PLT-12)"]
parallel_with: [GRR-10, GRR-11]
unblocks: [GRR-05, GRR-06, GRR-07, GRR-13]
---

# GRR-04 — Run engine core

## Why
Run the whole recipe (26) or "Run to here" (27), see status (28) and inline results with citations (29), readable errors (30); one run at a time (38); keep going while the author is away and show it on another device (36–37).

## Decisions
- **Start run** (POST `/api/graph-runner/runs`): graph id, `inputs` per input node in scope, optional `target: {nodeId}`, optional `targets` per output node.
- **Scope:** no target → whole recipe; with a target → that node and everything upstream (wires followed backwards). Results are never reused. Output nodes outside scope produce nothing; if the target is a tool node, its result shows inline and no pending change is made.
- **Refusals before any work:** story graph → `GRAPH_VIEW_NOT_RUNNABLE`; blocking validation errors → `GRAPH_VALIDATION_FAILED`; missing or ill-typed input → `GRAPH_INPUT_MISSING` / `GRAPH_INPUT_INVALID`; unsafe or non-existent file reference → `GRAPH_INPUT_INVALID`; another active run in the project → `GRAPH_RUN_ACTIVE` (**one active run per project**).
- **Input values:** text `{kind:'text', text}` or `{kind:'file', ref}` (any file in the active project, path-safety checked, not limited to `drafts/`); entity `{kind:'entities', refs}`; style `{kind:'style', ref}`.
- **Reads at run start:** every file reference is read **once** through the Project store before any tool runs; path and content kept in run state for the run's lifetime (path + `sha256:` hash logged). That content is the **captured base** for any pending change the run makes to the same path (used by GRR-06).
- **Order:** nodes in scope run **one at a time** in topological order, ties broken by node id. Every in-scope node starts `queued`.
- **Tool node step:** gather port values (upstream results, pinned values, input values) and settings from `params`; resolve every entity reference (including style) to contents through the Project store; call the **Tool registry executor** (validates with Ajv, renders, calls the model via Model providers; cancellable); keep `{output, sourcesUsed}` as the node's result **in memory** — values between steps never touch disk.
- **Run state** (contract shape), held in memory; **current-run-state** GET returns the active run for the project or the most recent finished one (for reconcile on wake).
- **SSE:** `run-started`, `node-status` on every change, `run-ended`.
- Output nodes, stop/fail-fast, logs are GRR-06, GRR-05, GRR-07.

## Acceptance criteria (mock OpenAI server)
- [ ] A three-tool recipe emits `node-status` events in topological order (`queued` → `running` → `done`) and ends with `run-ended: done`.
- [ ] "Run to here" on a mid-recipe tool node runs only it and its upstream nodes; downstream nodes report `idle`; its result is in run state.
- [ ] Starting a run on a story graph returns `GRAPH_VIEW_NOT_RUNNABLE`; a second run while one is active returns `GRAPH_RUN_ACTIVE`; a recipe with blocking errors returns `GRAPH_VALIDATION_FAILED`.
- [ ] A file input is read once at start (a mid-run host edit doesn't change what downstream nodes see).
- [ ] Current-run-state returns the active run, then the last finished one.
