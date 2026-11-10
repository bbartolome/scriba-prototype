---
id: GRR-03
title: Recipe and story-graph validation against the live tool registry, and the validate endpoint
module: graph-runner
phase: phase:engine
milestone: M4
blocked_by: [GRR-01, "Tool registry phase:loader-validation (TRG-11; catalog with derived ports and params-mode validate)"]
parallel_with: [GRR-02, GRR-10]
unblocks: [GRR-04, GRR-08, GRR-11]
---

# GRR-03 — Validation

## Why
List problems and highlight what's concerned (18), save anyway (19), disable Run with reasons (20); story graphs warn about missing files (42).

## Decisions
- A **pure check** of a graph against the current tool registry (catalog service). Runs on get, on save, at run start, and through `POST /api/graph-runner/graphs/validate` (accepts an unsaved graph body — the canvas calls it debounced for live feedback).
- Issue `{code, severity, nodeId?, edgeId?, portId?, message}`.
- **Recipe errors (block a run):** illegal node kind for the view; unknown or disabled tool; a wire to/from a non-existent port; mismatched port types; more than one wire into one input; a port both wired and pinned; a required port with neither wire nor pinned value; a required non-port setting missing from `params` (via the registry's **`params`-mode validate**); a cycle; an output node with no wire in; an output node fed by anything but a tool node, or by a tool whose output kind can't be written (`claims`, `check`); duplicate ids.
- **Recipe warnings:** a node with no path to any output (dead step); an input node with no wire out; a pinned entity whose file no longer exists.
- **Story graphs — warnings only:** a `path` that is missing, unsafe, or points into `drafts/.versions/`; an edge to an unknown node; an entity node whose `path` is outside `entities/`.
- **Port derivation comes from the Tool registry** (input ports, element types, list flags, output type). The runner never re-derives ports from raw JSON Schema.
- Ajv checks of actual argument shapes happen when each tool node runs (inside the executor); a failure there is a node `error`, not a validation issue.

## Acceptance criteria
- [ ] Each error and warning rule has a fixture that produces exactly that issue with the right ids.
- [ ] Saving a schema-valid recipe with a type-mismatched wire succeeds and the response lists an `error` issue for that wire.
- [ ] Disabling a tool in the registry makes its nodes report "disabled tool".
- [ ] The validate endpoint accepts an unsaved graph and writes nothing.
