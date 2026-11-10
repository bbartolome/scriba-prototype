---
id: GNP-04
title: core/propose_graph tool with golden tests for both views
module: genre-packs
phase: phase:core-propose-graph
milestone: M2
blocked_by: [GNP-01, GNP-02, "Graph runner phase:contract (GRR-01)"]
parallel_with: [GNP-03, GNP-06, GNP-13]
unblocks: [GNP-05, "Agent loop graph proposal"]
---

# GNP-04 — `propose_graph`

## Spec
- `core/tools/propose_graph.yaml`, output `graph`, `enabled: true`. Description: "Sketch a story graph or a recipe from a plain-language intent."
- Inputs: `intent` [text port, required], `view` (`story | recipe`, string enum, **required**), `entityIds` [entity port, list], `files` (array of project-relative path strings, param).
- Prompt describes the Graph runner's graph file shape `{schemaVersion, view, name, nodes, edges}`:
  - story view: nodes `entity | scene | beat` with `label` and optional `path`; edges carry free-text relations (suggested `order`, `causality`, `containment`);
  - recipe view: nodes `input | tool | output` with `{id, kind, position, tool?, params?}`; wires connect port ids `<nodeId>.<key>`; one wire per input; types must match; node ids `^[a-z0-9][a-z0-9-]*$`.
- For recipe view, the template inserts `{{toolCatalog}}` (enabled tools with port keys and types). Paths for scene and entity nodes come only from `files` and `entityIds`; the prompt **forbids inventing paths**. Return JSON only.
- The Agent loop writes the result as a pending change aimed at `graphs/`, validated against the graph schema (retry on failure is the Agent loop's).

## Acceptance criteria
- [ ] `propose_graph` validates; calling it without `view` returns an Ajv error naming `view`.
- [ ] Golden tests: with the mock scripted to return a story graph and a recipe, each output parses against the Graph runner's graph schema, and the rendered prompt matches its golden (the recipe-view golden includes the tool catalogue).
