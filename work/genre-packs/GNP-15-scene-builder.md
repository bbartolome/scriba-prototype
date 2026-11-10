---
id: GNP-15
title: scene_builder tool
module: genre-packs
phase: phase:fiction
milestone: M6
blocked_by: [GNP-02, GNP-13]
parallel_with: [GNP-14, GNP-16, GNP-17, GNP-18]
unblocks: [GNP-19, GNP-23]
---

# GNP-15 — scene_builder tool

## Spec
- File `fiction/tools/scene_builder.yaml`, output `draft`.
- Description: "Draft a scene from its goal, conflict and outcome from one character's point of view."
- Inputs: the five **common inputs** (`coreIdea` [text, required], `entityIds` [entity list], `styleProfile` [style], `length` (param, default 800), `tone` (param, optional)) plus `sceneNotes` [text port], `pov` [entity port, kind `character`, required], `goal`, `conflict`, `outcome` (params). The scene's characters and place come in through `entityIds`. `enabled: true`.
- Prompt: the shared skeleton (role line; material with each entity rendered with its ID; shape steps; constraints — only the material, `[@id]` citations, `TK (note)` for missing facts, style profile's tone, banned phrases and length). Shape steps: establish the POV character's goal, escalate the conflict, turn to the outcome, stay in the POV character's perception and voice.

## Acceptance criteria
- [ ] Passes `npm run lint:packs` and the content-check suite.
- [ ] Golden test (GNP-02): the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; `sourcesUsed` equals the sources derived from the entity inputs (style profile excluded); invalid arguments return Ajv's readable error.

- [ ] A manual eval case (small and larger local model) is added to the Agent loop's eval script data.
