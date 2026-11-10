---
id: GNP-08
title: mystery_question tool
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-02, GNP-03, GNP-06]
parallel_with: [GNP-07, GNP-09, GNP-10, GNP-11]
unblocks: [GNP-12, GRR-16]
---

# GNP-08 — mystery_question tool

## Spec
- File `nonfiction/tools/mystery_question.yaml`, output `draft`.
- Description: "Open with a puzzle, then unravel it to a surprising finding."
- Inputs: the five **common inputs** (`coreIdea` [text, required], `entityIds` [entity list], `styleProfile` [style], `length` (param, default 800), `tone` (param, optional)) plus `puzzle` [text port, required], `surprisingFinding` [text port]. `enabled: true`.
- Prompt: the shared skeleton (role line; material with each entity rendered with its ID; shape steps; constraints — only the material, `[@id]` citations, `TK (note)` for missing facts, style profile's tone, banned phrases and length). Shape steps: pose the puzzle, deepen it, unravel it, land the surprising finding, tie it to the idea.

## Acceptance criteria
- [ ] Passes `npm run lint:packs` and the content-check suite.
- [ ] Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.

- [ ] A manual eval case (small and larger local model) is added to the Agent loop's eval script data.
