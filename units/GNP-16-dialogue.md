---
id: GNP-16
title: dialogue tool
module: genre-packs
phase: phase:fiction
milestone: M6
blocked_by: [GNP-02, GNP-13]
parallel_with: [GNP-14, GNP-15, GNP-17, GNP-18]
unblocks: [GNP-18, GNP-19, GNP-23]
---

# GNP-16 — dialogue tool

## Spec
- File `fiction/tools/dialogue.yaml`, output `draft`.
- Description: "Write an exchange between characters, each in their own voice."
- Inputs: the five **common inputs** (`coreIdea` [text, required], `entityIds` [entity list], `styleProfile` [style], `length` (param, default 800), `tone` (param, optional)) plus `characterIds` [entity port list, kind `character`, **minItems 2**, required], `sceneText` [text port], `subtext`, `goal` (params). `enabled: true`.
- Prompt: the shared skeleton (role line; material with each entity rendered with its ID; shape steps; constraints — only the material, `[@id]` citations, `TK (note)` for missing facts, style profile's tone, banned phrases and length). Shape steps: render **each character's full entity** (`voice` and `relationships` included) through `{{#each characterIds}}` and `{{entity this}}`; instruct the model to give each speaker distinct diction and to keep to the relationship notes; carry the subtext under the lines.

## Acceptance criteria
- [ ] Passes `npm run lint:packs` and the content-check suite.
- [ ] Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.
- [ ] Golden: the rendered prompt contains both characters' `voice` and `relationships` plus the distinct-voice instruction; calling it with one character fails Ajv.
- [ ] A manual eval case (small and larger local model) is added to the Agent loop's eval script data.
