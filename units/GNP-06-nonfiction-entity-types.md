---
id: GNP-06
title: Nonfiction entity types — person, claim, concept
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-01]
parallel_with: [GNP-03, GNP-04, GNP-13]
unblocks: [GNP-07, GNP-08, GNP-09, GNP-10, GNP-11]
---

# GNP-06 — Nonfiction entity types

## Decisions
- `nonfiction/entity-types/person.yaml` — fields `name`, `role`, `sources` (list of `source` refs: `x-scriba-type: entity`, `x-scriba-entity-kinds: [source]`); body: what happened.
- `claim.yaml` — fields `statement`, `evidence` (list of `source` refs), `status` enum **`supported | weak | unsupported`** (matches the Agent loop's grounding verdicts; replaces `unsourced`); body: discussion.
- `concept.yaml` — fields `name`, `definition` (one line); body: examples and where it's used.
- All folder `entities`.

## Acceptance criteria
- [ ] All three lint clean; reference fields are recognised as entity references with kind `source`.
- [ ] Per-kind validators reject a claim with `status: unsourced`.
