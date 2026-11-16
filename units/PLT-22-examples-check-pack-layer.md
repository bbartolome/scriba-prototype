---
id: PLT-22
title: examples/ check — pack layer (recipe tool refs and params, entity types, reference resolution)
module: platform
phase: phase:examples-check
milestone: M2
blocked_by: [PLT-20, "Tool registry phase:loader-validation (TRG-11)", GNP-11]
parallel_with: [PLT-21]
unblocks: ["Graph runner sample recipe (GRR-16)"]
---

# PLT-22 — Examples check, pack layer

Merging this and PLT-21 (in either order) **closes `phase:examples-check`** (later milestones keep extending sample content; the check must keep passing).

## Decisions
- Changed by the Navigator's decision on GNP-11 open point 1 (2026-11-16): GNP-11 added to `blocked_by` (line 7). The old text was: `blocked_by: [PLT-20, "Tool registry phase:loader-validation (TRG-11)"]`. See plans/DECISIONS.md.
- Uses the Tool registry's own loader and Ajv validation through the **pack-lint CLI's library entry point** — no reimplementation.
- Adds to the PLT-20 check:
  - every recipe tool node names a tool that exists in the built-in packs (`packages/packs`), with params that validate under that tool's JSON Schema in `params` mode;
  - every entity file's front matter validates against its pack entity-type schema;
  - every entity reference in a sample resolves to an existing file or entity in the same sample: front-matter reference fields, story-node `path`s, and `[@id]` citations in drafts.
- Recipe checks apply once graph files exist (PLT-21 parses them); if PLT-21 hasn't landed, this unit reads recipe files through the Graph runner contract itself.

## Acceptance criteria
- [x] Every recipe tool node names a built-in tool, and its params validate against that tool's inputs.
- [x] Entity front matter validates against pack entity-type schemas.
- [x] An unresolved `[@id]` citation or reference field fails with the file path and the id.
- [x] A deliberately broken sample file fails CI with the file path and the schema issue.
- [x] The check passes on `examples/` with only the nonfiction skeleton and keeps passing as later milestones add content.
