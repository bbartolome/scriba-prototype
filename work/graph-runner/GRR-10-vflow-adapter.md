---
id: GRR-10
title: ngx-vflow adapter layer, both views rendered from graph JSON, edit and save
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-01, "Frontend shell phase:core (SHL-09)"]
parallel_with: [GRR-02, GRR-03, GRR-04, GRR-09]
unblocks: [GRR-11, GRR-14]
---

# GRR-10 — Adapter layer

## Decisions
- **One adapter layer** maps graph JSON ↔ `ngx-vflow` nodes and edges. The graph JSON stays the contract; library ids never leak into files. The four `ngx-vflow` workarounds live here:
  1. a custom SVG handle template carrying the port id, positioned from the handle's `point` context;
  2. each handle placed inside its own row;
  3. the connection directive imported through the `Vflow` tuple;
  4. new wires taken from the `connect` output, not `connectEnd`.
- **Both views** from the same format: story view (story nodes, labelled relation edges) and recipe view (input, tool and output nodes with typed handles — tool-node bodies come in GRR-11).
- Moving nodes, adding/removing nodes and edges, and **save** (whole-file save through the API; issues from the response displayed in a panel).
- The canvas route component under the `:graphId` child route.

## Acceptance criteria
- [ ] Loading the contract's example story graph and recipe and saving without edits produces byte-equivalent JSON (no library fields leak).
- [ ] Moving a node updates only its `position` in the saved file.
- [ ] A canvas-gesture Playwright spec (desktop) connects two handles and the saved wire uses `<nodeId>.<key>` port ids.
