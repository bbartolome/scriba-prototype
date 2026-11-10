---
id: AGL-24
title: Compile tools — assemble_manuscript, run_preflight, export_manuscript
module: agent-loop
phase: phase:compile-tools
milestone: M7
blocked_by: [AGL-08, "Compile & export phase:assembly-preflight (CEX-09)", "Compile & export phase:export (CEX-15)"]
parallel_with: [AGL-21, AGL-22, AGL-23]
unblocks: []
---

# AGL-24 — Compile tools

Merging this **closes Agent loop `phase:compile-tools`**.

## Decisions
- `assemble_manuscript`, `run_preflight` and `export_manuscript` call the Compile & export API in-process (manuscript view model, preflight request/result, export request/result), on the bound project, with result cards.
- Read and produce only: **reorder** (writes `project.yaml`) and **snapshot restore** are not agent tools.
- Compile & export reads only the story graph's `order` edges and never runs a graph, so "the loop never calls the runner" holds.
- Offered only once this unit lands.

## Acceptance criteria
- [ ] "Run the preflight" returns the five checks as a card.
- [ ] An export started by the agent produces the same result as one started from the manuscript view.
- [ ] No agent tool starts a recipe run or calls the Graph runner (lint and a request-log assertion).
