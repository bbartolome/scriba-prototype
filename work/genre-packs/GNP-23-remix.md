---
id: GNP-23
title: core/remix tool and the shape-list consistency check
module: genre-packs
phase: phase:remaining-shapes
milestone: M7
blocked_by: [GNP-02, GNP-07, GNP-08, GNP-09, GNP-10, GNP-15, GNP-16, GNP-21, GNP-22]
parallel_with: [GNP-20]
unblocks: [GNP-24]
---

# GNP-23 — Remix

## Spec
- `core/tools/remix.yaml`, output `draft`, `enabled: true`. Description: "Rewrite a passage in another tool's shape for side-by-side comparison."
- Inputs: the common inputs plus `passage` [text port, required] and `targetShape` — a string **enum of the snake_case names of every shipped `draft` tool except `remix`** (required, param).
- The prompt carries one line per shape describing it (selected with `#if`-free literal lines keyed by `targetShape`, or a single list the model reads).
- The side-by-side comparison is the Project store's review diff of the resulting pending change (no Compare node, no dedicated view).
- Activates the content suite's **Remix consistency check** (GNP-01): CI fails if a draft tool is added or renamed without updating `targetShape`.

## Acceptance criteria
- [ ] Passes the validation suite; the enum equals the set of shipped draft tools minus `remix`.
- [ ] Adding a fixture draft tool without updating the enum fails the content suite.
- [ ] Golden test passes; manual eval case added.
