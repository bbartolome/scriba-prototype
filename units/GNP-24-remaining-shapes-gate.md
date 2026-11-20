---
id: GNP-24
title: Remaining-shapes gate — M7 checklist and demo
module: genre-packs
phase: phase:remaining-shapes
milestone: M7
blocked_by: [GNP-19, GNP-20, GNP-21, GNP-22, GNP-23]
parallel_with: []
unblocks: []
---

# GNP-24 — Remaining-shapes gate

Merging this **closes Genre packs `phase:remaining-shapes`**.

## Acceptance criteria (the phase checklist)
- [x] All fourteen tools pass the validation suite. The twelve nonfiction shapes ship disabled; Throughline check and Remix ship enabled.
- [x] One golden test per tool through the mock OpenAI server.
- [x] Remix's `targetShape` enum matches the shipped draft tools.
- [x] Enabling a disabled shape through the Tool registry makes it callable by the agent and available as a canvas node.

## Demo (under 5 min)
1. Run Throughline check on a sample chapter with one drifting paragraph and see it flagged.
2. Remix that chapter's cold open as a Mystery question and compare the two in the review diff.
3. Type an intent and get a proposed recipe (`propose_graph`, `view: recipe`) as a pending change.
4. Accept it, then open it on the canvas.
