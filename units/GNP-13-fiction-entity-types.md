---
id: GNP-13
title: Fiction entity types — character, place, world-rule
module: genre-packs
phase: phase:fiction
milestone: M6
blocked_by: [GNP-01]
parallel_with: [GNP-03, GNP-04, GNP-05, GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-12]
unblocks: [GNP-14, GNP-15, GNP-16, GNP-17, GNP-18, GNP-19]
---

# GNP-13 — Fiction entity types

## Decisions
- `fiction/entity-types/character.yaml` — fields `name`, `want`, `need`, `flaw`, `voice` (notes), `relationships`: a **one-level array of objects** `{character, note}` where `character` is a `character` ref (`x-scriba-type: entity`, `x-scriba-entity-kinds: [character]`), `required: [character, note]`, `additionalProperties: false`; body: backstory.
- `place.yaml` — fields `name`, `rules` (list of `world-rule` refs); body: description.
- `world-rule.yaml` — fields `statement`, `appliesTo` (list of `place` refs); body: consequences and exceptions.
- No "linked scenes" fields: links to scenes are story-graph relations.

## Acceptance criteria
- [ ] All three lint clean (the registry accepts `relationships` as the one-level extension).
- [ ] Per-kind validators accept valid fixtures and reject a relationship missing `note`.
