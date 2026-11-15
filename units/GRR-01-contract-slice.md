---
id: GRR-01
title: Publish @bbartolome/scriba-contracts/graph-runner with example graph fixtures
module: graph-runner
phase: phase:contract
milestone: M4 (lands in wave 1)
blocked_by: ["Platform phase:scaffold (PLT-11)", "Tool registry phase:contract (TRG-01)", "Project store phase:contract (PST-01)"]
parallel_with: ["wave-1 work"]
unblocks: [GRR-02, GRR-03, GRR-10, GRR-16, "Platform examples check graph layer (PLT-21)", "Agent loop output routing (AGL-13)", "Compile & export contract slice (CEX-01)", "Compile & export unsupported claims and orphan scenes (CEX-06)", "Genre packs `propose_graph` (GNP-04)", "Genre packs fiction sample (GNP-18)"]
---

# GRR-01 — Contract slice

Merging this **closes Graph runner `phase:contract`**. Zod + TS, shapes and constants only. Imports port types only from `/tool-registry`, file and entity references only from `/project-store`, the envelope only from `/platform`.

## Shapes
- **Graph file** `{schemaVersion, view: 'story' | 'recipe', name, nodes, edges}` — Zod discriminated union on `view`; **unknown keys rejected**; `schemaVersion: 1`. File `graphs/<id>.json`; the stem is the graph id (lower-case slug from the name, unique in `graphs/`, stable across renames of `name`).
- **Node-id pattern** `^[a-z0-9][a-z0-9-]*$` (no dots). Node ids and edge ids unique within a graph.
- **Story node** `{id, kind: 'entity'|'scene'|'beat', label, path?, position: {x, y}}`. `path` is project-relative to a current file (never `drafts/.versions/`); entity nodes → `entities/`, scene/beat → `drafts/` (several nodes may share a file). No `path` = label-only. Entity kind is an attribute of the entity file, not a node kind.
- **Recipe node** `{id, kind: 'input'|'tool'|'output', position, tool?, params?}`. `tool` required on tool nodes, forbidden on others. Tool-node `params`: non-port settings plus **pinned port values** (entity references dropped onto an unwired port; a port is fed by a wire or a pinned value, never both). Input-node `params` `{type: 'text'|'entity'|'style', label, entityKind?}`. Output-node `params` `{label?, path?}`.
- **Legal kinds per view** as constants; no kind is legal in both.
- **Edge** `{id, from, to, relation?}`: story — node ids, `relation` free text; recipe — a **wire** between port ids, `relation` forbidden.
- **Port-id convention** `<nodeId>.<key>`, split on the first dot. Tool-node output key = Tool registry's `output`; input node's single output key `out`; output node's single input key `in`; tool-node input keys = tool-spec properties the Tool registry derives as ports.
- **Relation vocabulary** constants with meanings: `order` (from precedes to), `causality` (from causes to), `containment` (from contains to). Any other non-empty string allowed. Compile & export reads only `order`.
- **CRUD:** graph summary/list `{id, name, view, nodeCount, mtime, valid}`, create `{name, view}`, save (whole file), rename `{name?} | {newId?}`, validation issue `{code, severity: 'error'|'warning', nodeId?, edgeId?, portId?, message}` and issue codes.
- **Runs:** start `{graphId, inputs: {[inputNodeId]: InputValue}, target?: {nodeId}, targets?: {[outputNodeId]: path}}` → `{runId}`; stop `{runId}`. `InputValue` = `{kind:'text', text} | {kind:'file', ref} | {kind:'entities', refs} | {kind:'style', ref}`.
- **Run state** `{runId, graphId, target?, status: 'running'|'done'|'error'|'stopped', reason?: 'author'|'project-switched'|'interrupted', startedAt, endedAt?, inputs, targets, nodes: {[nodeId]: {status, result?, error?}}, pendingChangeIds}` (input values, no file contents).
- **Node-run-status** exactly `idle | queued | running | done | error | stopped`.
- **SSE members** (module `graph-runner`): `run-started` (run state), `node-status` `{runId, nodeId, status, result?, error?}` (result = tool node `{output, sourcesUsed}` or output node `{pendingChangeId, path}`), `run-ended` `{runId, status, reason?}`.
- **Run-log entry** union for `logs/recipe-runs/<runId>.jsonl`: run start, node status, tool call (validated arguments, output, sourcesUsed), error, pending change, run end.
- **Routes** and the `GRAPH_*` error codes (see [`modules/graph-runner.md`](../modules/graph-runner.md)).
- **Example fixtures:** one story graph and one recipe file used by contract tests.

## Acceptance criteria
- [x] The subpath exports everything above, importing only from `/tool-registry`, `/project-store` and `/platform`.
- [x] The union accepts the example story graph and recipe; rejects an unknown key, a recipe node in a story graph, a `relation` on a recipe wire, a tool node without `tool`, a node id containing a dot, and `schemaVersion` above 1.
- [x] The example files round-trip through parse and serialise without loss.
- [x] Node-run-status is exactly the six values; run status exactly four.
- [ ] Contract tests pass in CI.
