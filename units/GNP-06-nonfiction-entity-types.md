---
id: GNP-06
title: Nonfiction entity types — person, claim, concept
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-01, GNP-03]
parallel_with: [GNP-04, GNP-05, GNP-13]
unblocks: [GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-12, GNP-21, GNP-22]
---

# GNP-06 — Nonfiction entity types

## Decisions
Blocker corrected on 2026-11-16: GNP-03 added to blocked_by, because the source entity kind is defined by GNP-03. The old blocked_by was [GNP-01]. See plans/GNP-03.md, open point 1.

- `nonfiction/entity-types/person.yaml` — fields `name`, `role`, `sources` (list of `source` refs: `x-scriba-type: entity`, `x-scriba-entity-kinds: [source]`); body: what happened.
- `claim.yaml` — fields `statement`, `evidence` (list of `source` refs), `status` enum **`supported | weak | unsupported`** (matches the Agent loop's grounding verdicts; replaces `unsourced`); body: discussion.
- `concept.yaml` — fields `name`, `definition` (one line); body: examples and where it's used.
- All folder `entities`.

## Acceptance criteria
- [ ] All three lint clean; reference fields are recognised as entity references with kind `source`.
- [ ] Per-kind validators reject a claim with `status: unsourced`.
