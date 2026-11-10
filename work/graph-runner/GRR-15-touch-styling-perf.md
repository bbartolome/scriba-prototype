---
id: GRR-15
title: Tablet touch, Material styling in both themes, large-graph measurement
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-11, GRR-12, GRR-13, GRR-14]
parallel_with: [GRR-16]
unblocks: [GRR-17]
---

# GRR-15 — Touch, styling, performance

## Decisions
- **Touch:** pan, zoom, move nodes, draw wires and drop chips by touch on tablets (story 50).
- **Material styling** of nodes, chips, dialogs and badges using the Shell's theme tokens, light and dark (story 52).
- **Large graphs:** measure a 150-node generated recipe once on desktop and record it.

## Acceptance criteria
- [ ] Touch: connect, move a node and drop a chip pass in Playwright's touch emulation at a tablet viewport.
- [ ] Nodes, chips, dialogs and badges render with theme tokens in both themes (visual check recorded in the PR).
- [ ] A 150-node generated recipe opens and pans without the main thread blocking more than 200 ms (measured once and recorded).
