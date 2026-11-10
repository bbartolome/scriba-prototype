---
id: GNP-10
title: numbers_to_people tool
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-02, GNP-03, GNP-06]
parallel_with: [GNP-05, GNP-07, GNP-08, GNP-09, GNP-11, GNP-13]
unblocks: [GNP-12, GNP-23]
---

# GNP-10 — numbers_to_people tool

## Spec
- File `nonfiction/tools/numbers_to_people.yaml`, output `draft`.
- Description: "Turn one statistic into the story of one person behind it."
- Inputs: the five **common inputs** (`coreIdea` [text, required], `entityIds` [entity list], `styleProfile` [style], `length` (param, default 800), `tone` (param, optional)) plus `statistic` [text port, required], `person` [entity port, kind `person`, required]. `enabled: true`.
- Prompt: the shared skeleton (role line; material with each entity rendered with its ID; shape steps; constraints — only the material, `[@id]` citations, `TK (note)` for missing facts, style profile's tone, banned phrases and length). Shape steps: state the statistic, introduce the person behind it, tell their story, return to what the number means.

## Acceptance criteria
- [ ] Passes `npm run lint:packs` and the content-check suite.
- [ ] Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.

- [ ] A manual eval case (small and larger local model) is added to the Agent loop's eval script data.
