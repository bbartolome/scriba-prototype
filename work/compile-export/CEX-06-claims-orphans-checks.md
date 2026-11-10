---
id: CEX-06
title: Preflight checks — unsupported claims and orphan scenes
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-05, "Agent loop phase:contract (AGL-01)", "Graph runner phase:contract (GRR-01)"]
parallel_with: [CEX-07]
unblocks: [CEX-09]
---

# CEX-06 — Unsupported claims and orphan scenes

## Unsupported claims (34–35)
- For each manuscript file read the claims artefact at `logs/grounding/<path>.json` (the Agent loop's path rule) and parse it with the Agent loop's grounding-result schema. Missing or unparseable → "not grounding-checked".
- `unsupported` claims → **error**; `weak` → **warning** (with claim text and cited passage as `ref`).
- No result → `info` "not grounding-checked"; current `sha256:<hex>` content hash ≠ artefact `contentHash` → `info` "changed since grounding check".
- Never starts a grounding check; the finding tells the author to run one from the Agent loop.

## Orphan scenes (36–37; warning)
- (a) a story node of kind `scene` or `beat` whose `path` is set but doesn't resolve to an existing top-level manuscript file (missing, in a subfolder such as `.versions/`, or outside `drafts/`);
- (b) an order entry whose `path` isn't a current manuscript file (stale entry);
- (c) `info` only, and only when at least one story graph exists: a body manuscript file no story node points at ("not on the story graph").
- Label-only story nodes are never orphans.

## Acceptance criteria
- [ ] A claims-artefact fixture in the Agent loop's format yields `unsupported` → error, `weak` → warning, and a changed file → `info`.
- [ ] Each orphan case (a), (b), (c) has a fixture producing the right severity; label-only nodes produce nothing.
