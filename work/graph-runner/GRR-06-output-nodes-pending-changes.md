---
id: GRR-06
title: Output nodes → pending changes (target precedence, captured base, origin, provenance) and graphs/ validator registration
module: graph-runner
phase: phase:engine
milestone: M4
blocked_by: [GRR-04, "Project store propose + validator registration (PST-15; gate is Project store phase:pending-review, PST-22)"]
parallel_with: [GRR-05, GRR-07]
unblocks: [GRR-08, GRR-13]
---

# GRR-06 — Output nodes

## Why
Each finished output node creates a pending change with a link (33); a text-input file's pending change is based on run-start content so mid-run host edits are flagged (34); every draft records its entities and files (35); per-run target choice (25).

## Decisions
- Only output nodes create pending changes. The **output kind** of the tool wired in decides the target file kind:
  - `draft` → a Markdown file at the top level of `drafts/`;
  - `entity` → a Markdown entity file in `entities/`;
  - `graph` → a JSON file in `graphs/`; content must pass the graph schema or the output node errors;
  - `claims`, `check` → not writable in v1 (validation error, GRR-03).
- **Target precedence:** `targets[nodeId]` → `params.path` → generated `<folder>/<graph-id>-<yyyymmdd-hhmm>.<ext>`. The target must sit in its kind's folder (else `GRAPH_TARGET_INVALID`, checked before work starts).
- **Captured base:** if the target equals a text input's file reference → the run-start content; else if the target exists → its content read when the change is created; else a create.
- Call the Project store's in-process **`propose`** with the target path, content, captured base, origin `{kind: 'recipe-run', runId, graphId, nodeId}` (the output node) and `provenance: {graphId, nodeId, entityIds, sourcesUsed}` — unions over every tool node upstream of that output. Output node result `{pendingChangeId, path}`; ids collected in run state.
- **Validator registration:** register the graph schema as the Project store's per-path validator for `graphs/*.json`, so an invalid proposed graph (e.g. from propose-graph) is refused at propose time.

## Acceptance criteria
- [ ] A run creates exactly one pending change per in-scope output node, with origin `recipe-run`, the output node id, and provenance `entityIds`/`sourcesUsed`.
- [ ] With a text input fed a file and an output targeting that same file, the pending change's captured base equals the run-start content even if the file changes mid-run; accepting it through the Project store reports a conflict.
- [ ] Target precedence (request, params, generated name) is honoured; a target outside the kind's folder is refused before work.
- [ ] A `graph` output whose content fails the schema errors the output node.
- [ ] A propose of an invalid graph file to `graphs/` through the Project store is refused by the registered validator.
