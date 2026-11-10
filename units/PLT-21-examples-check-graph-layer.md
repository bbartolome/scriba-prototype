---
id: PLT-21
title: examples/ check — graph layer (graphs/ schema, story-node paths)
module: platform
phase: phase:examples-check
milestone: M2–M4 (lands when its gate closes)
blocked_by: [PLT-20, "Graph runner phase:contract (GRR-01)"]
parallel_with: [PLT-22]
unblocks: []
---

# PLT-21 — Examples check, graph layer

## Decisions
- Adds to the PLT-20 check:
  - every `graphs/` file in every sample parses with the Graph runner's graph schema (`@bbartolome/scriba-contracts/graph-runner`);
  - every story-node `path` resolves to an existing file in the same sample.
- Failures name the file path and the issue. Keeps passing as later milestones add content (nonfiction recipe at M4, fiction sample at M6).

## Acceptance criteria
- [ ] Every `graphs/` file parses with the Graph runner schema.
- [ ] A story node whose `path` points at a missing file fails with the graph file and node id.
- [ ] A graph fixture with a schema violation fails with the path and issue.
- [ ] Passes on a sample with no `graphs/` folder.
