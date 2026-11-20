---
id: GNP-19
title: Fiction gate — fiction-order check, M6 done-when and demo
module: genre-packs
phase: phase:fiction
milestone: M6
blocked_by: [GNP-13, GNP-14, GNP-15, GNP-16, GNP-17, GNP-18, "Compile & export phase:assembly-preflight (CEX-09; assembly order)", "Graph runner phase:canvas (GRR-17)"]
parallel_with: [GNP-20, GNP-21, GNP-22]
unblocks: [GNP-24]
---

# GNP-19 — Fiction gate

Merging this **closes Genre packs `phase:fiction`**.

## Scope
- **Fiction-order check:** create a project through the real "start from sample" HTTP flow and assert the manuscript order from Compile & export's API is `arrival.md`, `the-storm.md`, `ledger.md`.

## Acceptance criteria (the `phase:fiction` checklist)
- [x] All five tools pass the validation suite; every entity input names an existing entity type.
- [x] Dialogue's golden test passes; one-character calls fail Ajv.
- [x] The fiction sample validates and its structural checks pass (GNP-18).
- [x] The fiction-order check passes.
- [ ] **Done when:** a dialogue scene between two characters keeps each voice distinct and respects their relationship notes — checked by the manual eval with a small and a larger local model, and by the author in the demo.

## Demo (under 5 min)
1. Start from the fiction sample.
2. Open the story graph: the shared chapter file, both beats and the `order` edges.
3. Open the manuscript and confirm the graph order.
4. Open the recipe and run it with the storm scene and both keepers.
5. Read the Dialogue pending change for voice and relationship.
6. Ask the agent to "check my beats for loose ends" (Plot manager).
