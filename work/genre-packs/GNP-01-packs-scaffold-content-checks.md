---
id: GNP-01
title: packages/packs scaffold and the pack content-check suite
module: genre-packs
phase: phase:core-propose-graph
milestone: M2
blocked_by: ["Platform phase:scaffold (PLT-11)", "Tool registry pack-lint library (TRG-07)"]
parallel_with: [GNP-02]
unblocks: [GNP-03, GNP-04, GNP-06, GNP-13, "every content unit"]
---

# GNP-01 — Packs scaffold and content checks

## Scope
- `packages/packs/{core,nonfiction,fiction}/{tools,entity-types}/` (with `.gitkeep` until content lands). The workspace already exists (PLT-01).
- **Content-check suite** in `packages/packs/test/` (Vitest), using the Tool registry's pack-lint **library entry point** and the contracts package, run on every push alongside `npm run lint:packs`:
  - every pack lints with **zero errors**;
  - every `x-scriba-entity-kinds` value names a **shipped** entity type (an error here, not the registry's warning);
  - the five **common inputs** are identical (same schema and hints) on every `draft` tool;
  - descriptions are under 120 characters and start with a verb;
  - Remix's `targetShape` enum matches the shipped draft tools (the check is written here and becomes active when `remix` exists).
- **Broken-spec fixtures** owned by the suite (bad output kind, unknown hint, template naming an undeclared input, duplicate name, multi-line description) proving the pack-lint library rejects each.

## Acceptance criteria
- [ ] CI runs the suite on every push, and it fails on each broken-spec fixture.
- [ ] The suite passes on the (still empty) real packs.
