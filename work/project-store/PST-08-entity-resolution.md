---
id: PST-08
title: Entity resolution, entity list and the shared file manifest
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-02, PST-04]
parallel_with: [PST-05, PST-06, PST-07, PST-11]
unblocks: [PST-12, PST-13]
---

# PST-08 — Entity resolution and entity list

## Why
Callers turn entity IDs into files and contents in one call (story 46); pickers and the Graph runner's drag-to-input chips need an entity list; the Tool registry's Try panel calls resolution from the browser.

## Decisions
- **Which files are entities:** every Markdown file directly or recursively under `entities/` and `sources/`.
  - In `entities/`: must have YAML front matter with a `type`; otherwise listed as an invalid entity (with a reason) and not resolvable.
  - In `sources/`: may have no front matter (type `source`); front matter without `type` is also `source`.
- Front matter parsed with the generic base `{id?, type, links?}`; unknown keys pass through. Pack-specific schemas are the Tool registry's business; this module reads only the base.
- **Resolution:** front-matter `id` wins; no `id` → file stem. An effective ID not matching `^[a-z0-9][a-z0-9-]*$` makes the file an invalid entity. Returns `{id, type, path, content}` per ID, plus typed errors for unknown IDs (`PROJECT_ENTITY_NOT_FOUND`) and duplicates (`PROJECT_ENTITY_DUPLICATE`, listing paths — never guessed).
- **Entity list** (filterable by `type`): `{id, type, path, title?}` (title from `title` or `name` front matter) plus invalid entities with reasons.
- Both are **GETs** (resolution takes `ids` as a repeated query parameter) and are on the provider.
- The ID→path map is rebuilt from a **`(path, mtime, size)` manifest** of `entities/` and `sources/`, diffed against disk on each request, so host edits are picked up. Build the manifest as a reusable component; search (PST-13) reuses it.

## Acceptance criteria
- [ ] Resolution returns contents for IDs in `entities/` (by front-matter id and by stem) and `sources/` (with and without front matter).
- [ ] Unknown and duplicate IDs are reported with typed errors; duplicates list both paths.
- [ ] An `entities/` file without `type`, or with an ID failing the pattern, appears in `invalid` and isn't resolvable.
- [ ] A host edit adding an entity is visible on the next request with no rebuild.
- [ ] Both GETs are side-effect free.
