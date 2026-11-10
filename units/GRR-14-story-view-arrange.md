---
id: GRR-14
title: Story view extras — relation picker, path picker, missing-file badge, Open file — and Arrange
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-10]
parallel_with: [GRR-11, GRR-12, GRR-13]
unblocks: [GRR-15]
---

# GRR-14 — Story view and Arrange

## Why
Add scene, beat and entity nodes with labels (41), point them at files and get warned when files vanish (42), share a chapter file (43), relations with suggestions or free text (44), `order` drives manuscript order (45), open the file (46), no Run on story graphs (47); readable layout for proposed graphs (49).

## Decisions
- Story nodes: create `scene`, `beat`, `entity` with a label; **file picker** for `path` (scenes/beats → `drafts/`, entities → `entities/`; several nodes may share a file); **missing-file warning badge** (from validation warnings); **"Open file"** navigates to `/projects/:projectId/files?path=<path>`.
- **Relation picker** suggests `order`, `causality`, `containment` (with their meanings) and accepts free text.
- Story graphs **never offer Run**.
- **Arrange:** a simple layered layout — recipes by topological depth, story graphs by `order` edges then insertion order — that rewrites `position`; the author saves the result like any edit.

## Acceptance criteria
- [ ] The story view creates scene, beat and entity nodes and labelled relations, and saves a file that parses against the contract with no recipe-only fields.
- [ ] A node pointing at a deleted file shows the warning badge; Open file navigates to the files route.
- [ ] No Run control appears on a story graph.
- [ ] Arrange lays out overlapping nodes left to right without changing anything but `position`.
