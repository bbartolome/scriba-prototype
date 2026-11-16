---
id: AGL-13
title: Output routing by kind (draft, entity, graph, claims, check), target argument, graph validation
module: agent-loop
phase: phase:pending-writes
milestone: M3
blocked_by: [AGL-09, AGL-12, "Graph runner phase:contract (GRR-01)"]
parallel_with: [AGL-11, AGL-14, AGL-16]
unblocks: [AGL-15, AGL-17]
---

# AGL-13 — Output routing

## Why
Drafts become pending changes in `drafts/` or a named file (28), entities in `entities/` (29), proposed graphs in `graphs/` valid for the Graph runner (30).

## Decisions
- For tools whose output writes a file, add an optional **`target`** argument to the function schema; it must sit in the kind's folder.
- `draft` → overlay at `target` or a new `drafts/<tool-name>-<yyyymmdd-hhmm>.md` (UTC; `-2`, `-3`, … on collision); a grounding check follows (AGL-17).
- `entity` → overlay in `entities/` (same rule, default `entities/<tool-name>-<yyyymmdd-hhmm>.md`).
- `graph` → validate against the Graph runner's graph file schema; valid → overlay in `graphs/` (default `graphs/<slug-of-name>.json`), becoming a pending change aimed at `graphs/` (the Graph runner's registered validator also checks it at propose time); invalid → readable validation error to the model with the same retries.
- `claims` → shown as a card only; the claims artefact is AGL-16's.
  Reworded by revision of AGL-13 on 2026-11-16. The old text was: "`claims` → a claims artefact (grounding-result shape) shown as a card (and written to `logs/grounding/…` for its target if one is given)." See plans/DECISIONS.md.
- `check` → a card only, no file.
- Provenance from AGL-09 flows to the pending change via the overlay entry.

## Acceptance criteria
- [x] A `draft` output with no target lands at the generated path; a target outside `drafts/` is refused readably.
- [x] Propose-graph output becomes a pending change aimed at `graphs/` that parses with the Graph runner schema; an invalid graph returns a readable error and is retried.
- [x] `check` output creates no file.
