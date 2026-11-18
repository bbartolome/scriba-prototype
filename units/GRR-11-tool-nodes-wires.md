---
id: GRR-11
title: Tool nodes generated from the registry, palette, input/output nodes, typed-wire rejection, live validation display
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-03, GRR-10, "Tool registry phase:form-renderer (TRG-05; tool-form component)"]
parallel_with: [GRR-04, GRR-08, GRR-09, GRR-14, GRR-16]
unblocks: [GRR-12, GRR-13, GRR-15, GRR-17]
---

# GRR-11 — Tool nodes and wires

## Why
A tool node for every enabled tool with no setup (7), a palette with descriptions (8), the registry's form fields on the node (9), typed ports (10), input nodes (11) and output nodes (12); mismatched or duplicate wires refused as the author drags (13–14).

## Decisions
- **Tool nodes are generated** from the registry (`GET /api/tool-registry/tools/:name` port and form descriptors): one row per derived port (handle from GRR-10's template), plus the Tool registry's **tool-form component in node-body layout** for the non-port settings, bound to `params`. Ports show their type by colour and icon; list ports show pinned chips.
- **Palette** listing tools with `enabled` and `valid` both true (`enabled && valid`), one line each, with one-line descriptions; disabled/unknown tools on an existing graph still render with an error state.
- **Input nodes:** choose `text | entity | style`, a label, optional `entityKind`; single output port `out`. **Output nodes:** optional label and default `path`; single input port `in`.
- **Connection validator** (client-side, from port descriptors) refuses mismatched types, a second wire into an input, and a wire into a pinned port — **no wire is ever emitted** for those.
- **Live validation:** debounced call to the validate endpoint with the unsaved graph; issues listed and the node/wire/port highlighted; **Run disabled with reasons** while blocking errors exist.
- Ports are re-derived when a graph loads (live update while open is not required in v1).

## Acceptance criteria
- [x] Adding a tool from the palette renders its ports and settings form; editing settings updates `params`.
- [x] Drawing a text→entity wire is refused, and so is a second wire into the same input; neither changes the saved file (Playwright gesture spec).
- [x] Issues from validate highlight the concerned element and disable Run with the reasons listed.
