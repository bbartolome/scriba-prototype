---
id: GNP-09
title: myth_buster tool
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-02, GNP-03, GNP-06]
parallel_with: [GNP-05, GNP-07, GNP-08, GNP-10, GNP-11, GNP-13]
unblocks: [GNP-12, GNP-23]
---

# GNP-09 — myth_buster tool

## Spec
- File `nonfiction/tools/myth_buster.yaml`, output `draft`.
- Description: "State a common belief, then take it apart with evidence."
- Inputs: the five **common inputs** (`coreIdea` [text, required], `entityIds` [entity list], `styleProfile` [style], `length` (param, default 800), `tone` (param, optional)) plus `belief` [text port, required], `claimIds` [entity port list, kind `claim`, required]. `enabled: true`.
- Prompt: the shared skeleton (role line; material with each entity rendered with its ID; shape steps; constraints — only the material, `[@id]` citations, `TK (note)` for missing facts, style profile's tone, banned phrases and length). Shape steps: state the belief fairly, show why people hold it, take it apart claim by claim citing evidence, say what is true instead.

## Acceptance criteria
- [x] Passes `npm run lint:packs` and the content-check suite.
- [x] Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.
- [x] Only `claim` entities are accepted on `claimIds` (wrong kind → `TOOL_ENTITY_KIND_MISMATCH`).
- [x] A manual eval case (small and larger local model) is added to the Agent loop's eval script data.
