---
id: TRG-04
title: Entity picker (kind-filtered, multi, chip drop) and style picker (project default)
module: tool-registry
phase: phase:form-renderer
milestone: M2
blocked_by: [TRG-03, "Project store phase:contract (PST-01) for types; Project store entity list (PST-08) in the running app"]
parallel_with: [TRG-02, TRG-06]
unblocks: [TRG-05]
---

# TRG-04 — Pickers

## Why
Entity inputs list only the right kind (5), allow several (6); the style input defaults to the project's style profile (7); drag a chip onto a port (13).

## Decisions
- **Entity picker** lists the active project's entities from the Project store's entity list (`{id, type, path, title?}`), **filtered by `x-scriba-entity-kinds`**. Single-ID or chips for list fields. Accepts **dropped entity chips** (the Graph runner's drag-to-input chips).
- **Style picker** lists style-profile entities and **defaults to the project's `styleProfile`** from `project.yaml`.
- Component tests use the Shell's fake API; the running app uses the real Project store.

## Acceptance criteria
- [x] With a fixture of mixed entity types, the picker offers only entities of the field's kinds.
- [x] List fields accept several and render chips; a dropped chip of the right kind is added, a wrong-kind chip is refused.
- [x] The style picker preselects the project's style profile.
