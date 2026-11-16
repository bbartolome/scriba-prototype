---
id: GNP-07
title: cold_open tool
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-02, GNP-03, GNP-06]
parallel_with: [GNP-05, GNP-08, GNP-09, GNP-10, GNP-11, GNP-13]
unblocks: [GNP-12, GNP-23]
---

# GNP-07 — cold_open tool

## Spec
- File `nonfiction/tools/cold_open.yaml`, output `draft`.
- Description: "Open mid-scene with one person at one moment, then pull back to the idea."
- Inputs: the five **common inputs** (`coreIdea` [text, required], `entityIds` [entity list], `styleProfile` [style], `length` (param, default 800), `tone` (param, optional)) plus `person` [entity port, kind `person`, required], `moment` [text port]. `enabled: true`.
- Prompt: the shared skeleton (role line; material with each entity rendered with its ID; shape steps; constraints — only the material, `[@id]` citations, `TK (note)` for missing facts, style profile's tone, banned phrases and length). Shape steps: the moment, the person, the pull-back, the idea.

## Acceptance criteria
- [x] Passes `npm run lint:packs` and the content-check suite.
- [x] Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.

- [x] A manual eval case (small and larger local model) is added to the Agent loop's eval script data.
