---
id: GNP-21
title: named_concept, comparison_set and objection_handler (shipped disabled)
module: genre-packs
phase: phase:remaining-shapes
milestone: M7
blocked_by: [GNP-02, GNP-06, GNP-12]
parallel_with: [GNP-20, GNP-22]
unblocks: [GNP-23, GNP-24]
---

# GNP-21 — Named concept, Comparison set, Objection handler

All three ship with **`enabled: false`** (the author turns them on later).

## Specs
- **`named_concept`** (nonfiction, output `entity`): "Coin a memorable label and one-line definition for a pattern." Inputs: `pattern` [text port, required], `examples` [entity port list]. Prompt returns a `concept` entity file (`name`, `definition`, body with examples).
- **`comparison_set`** (nonfiction, `draft`): "Contrast winners with matched cases that didn't win." Common inputs plus `cases` [entity port list, required], `variables` (param, list of strings).
- **`objection_handler`** (nonfiction, `draft`): "Raise the strongest objections to a claim and answer each fairly." Common inputs plus `claimIds` [entity port list, kind `claim`, required].

## Acceptance criteria
- [ ] All three pass the validation suite and ship disabled; the two draft tools carry the identical common inputs.
- [ ] One golden test per tool.
- [ ] Manual eval cases added.
