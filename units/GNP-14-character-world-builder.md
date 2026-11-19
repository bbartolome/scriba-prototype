---
id: GNP-14
title: character_builder and world_builder tools (entity outputs)
module: genre-packs
phase: phase:fiction
milestone: M6
blocked_by: [GNP-02, GNP-13]
parallel_with: [GNP-12, GNP-15, GNP-16, GNP-17, GNP-18]
unblocks: [GNP-19]
---

# GNP-14 — Character builder and World-builder

## Specs
- **`fiction/tools/character_builder.yaml`**, output `entity`, `enabled: true`. Description: "Draft a character from a seed: want, need, flaw and voice." Inputs: `seed` [text port, required], `role` (param), `coreIdea` [text port, required], `entityIds` [entity port list]; **no** `styleProfile` or `length`. Prompt: return a Markdown entity file with `character` front matter (`name`, `want`, `need`, `flaw`, `voice`, `relationships` to supplied characters only) and a backstory body.
- **`fiction/tools/world_builder.yaml`**, output `entity`, `enabled: true`. Description: "Expand a place or world rule and flag contradictions with the others." Inputs: `ruleIds` [entity port list, kinds `place` and `world-rule`, required], `coreIdea` [text port]. Prompt: return the expanded place or rule as a Markdown entity file; put any contradictions with the other supplied rules under a fixed **"Contradictions"** heading in the body (the author sees them in review).

## Acceptance criteria
- [x] Both pass the validation suite; every entity input names an existing entity type.
- [x] Golden tests for both (rendered prompt with entities and IDs; output kind `entity`; `sourcesUsed`); world_builder's golden includes the Contradictions instruction.
- [x] Manual eval cases added.
