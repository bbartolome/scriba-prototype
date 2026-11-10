---
id: GRR-17
title: Canvas gate — e2e extension, real-iPad check, M4 demo
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-08, GRR-09, GRR-10, GRR-11, GRR-12, GRR-13, GRR-14, GRR-15, GRR-16]
parallel_with: []
unblocks: ["Genre packs fiction gate (GNP-19)"]
---

# GRR-17 — Canvas gate

Merging this **closes Graph runner `phase:canvas`**.

## Scope
- **Extend Platform's Playwright e2e:** open the sample recipe → run with input values → all nodes reach `done` → the pending change appears in the review queue.
- **Manual:** connect, move and chip drop checked by hand on a real iPad in Safari; result noted in this PR.

## Acceptance criteria (the `phase:canvas` checklist)
- [ ] On desktop, the author builds a recipe from an empty canvas with input, tool and output nodes using only mouse gestures, form fields and the input-values dialog, runs it end to end, and sees a pending change in the review queue.
- [ ] GRR-09…GRR-16 criteria pass on `main`.
- [ ] The e2e extension passes in CI.
- [ ] The real-iPad check is recorded.

**Done when:** *the author builds a chapter recipe visually and runs it end to end* — builds a recipe that produces a chapter's draft on the canvas, runs it, and gets a pending change.

## Demo (under 5 min)
1. Start from the nonfiction sample and open **Graphs**. Show `chapter-opening` with its input, tool and output nodes.
2. Try to wire "Key people and claims" into a text port: refused. Drag a claim chip onto the myth-buster's entity port (if on the canvas): it sticks.
3. Press **Run**. Pick the `drafts/` chapter notes file for "Chapter notes", two people as entities, keep the default style; target `drafts/ch02-opening.md`.
4. Watch badges go queued → running → done. Expand the cold open's inline result and its cited files.
5. Follow the output node's link to the review queue; show the diff and its origin (the recipe run). Accept it.
6. Open a new story graph. Add two scene nodes pointing at `drafts/` files and a beat, join them with `order` and `containment`. Run isn't offered.
7. Open `logs/recipe-runs/` and show the run log.
