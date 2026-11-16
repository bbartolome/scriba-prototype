---
id: GNP-03
title: Core entity types — source and style-profile
module: genre-packs
phase: phase:core-propose-graph
milestone: M2
blocked_by: [GNP-01]
parallel_with: [GNP-04, GNP-13]
unblocks: [GNP-05, GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-18, "Compile & export assembled Markdown (CEX-04)", "Compile & export entity links and banned phrases (CEX-07)"]
---

# GNP-03 — Core entity types

## Decisions
- `core/entity-types/source.yaml` — kind `source`, folder `sources`, fields `title`, `citation`, `url?`, `reliability` (short note); body: quotes and notes. Front matter is optional on `sources/` files (the Project store treats such a file as `source`), but samples always carry it so the bibliography works.
- `core/entity-types/style-profile.yaml` — kind `style-profile`, folder `entities`, fields `tone`, `targetLength` (words, integer), `bannedPhrases` (list of strings); body: sample paragraphs.
- Fixed field names: Compile & export reads `source.citation`, `source.url` and `style-profile.bannedPhrases`.

## Acceptance criteria
- [ ] Both lint clean and load in the Tool registry's entity-types list.
- [ ] Their per-kind validators accept valid front-matter fixtures and reject a missing `citation` / a non-list `bannedPhrases`.
