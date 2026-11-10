---
id: GRR-02
title: Module skeleton and graph CRUD through the Project store file API
module: graph-runner
phase: phase:engine
milestone: M4
blocked_by: [GRR-01, "Project store phase:files (PST-12)", "Setup & auth phase:token-guard (SAU-08)"]
parallel_with: [GRR-03, GRR-10]
unblocks: [GRR-04, GRR-08, GRR-09]
---

# GRR-02 — Graph CRUD

## Why
List graphs (story 1), create recipes and story graphs (2–3), direct saves (4), rename/delete (5), plain JSON (6), newer files refused (56).

## Decisions
- Module skeleton, one `@Module` import in the composition root.
- All routes act on the **active project**; reads/writes via the Project store's in-process file API.
- Operations (`/api/graph-runner/graphs`): **list** (id, name, view, node count, mtime, schema validity), **get** (with validation issues once GRR-03 lands), **create** (name, view → slug id, unique), **save** (whole-file replace), **rename** (change `name` with a save, or change the file id with the Project store's `move`; new id must be a free slug), **delete** (Project store `delete`).
- **Author saves are direct writes.** A save is refused only when the file fails the Zod schema (`GRAPH_SCHEMA_INVALID`, file unchanged); semantically flawed recipes save, with issues in the response.
- **`schemaVersion` checked before Zod parsing:** newer → `GRAPH_SCHEMA_VERSION_UNSUPPORTED`. v1 ships no migrators; when v2 is needed, migrators register with the Project store's migration registry (PST-23), which migrates lazily on POSTs with a backup and a `logs/migrations.log` entry, never as pending changes.
- The list may badge a graph id that has an open pending change (from the Project store's queue listing). The Graph runner never creates graph pending changes from the agent's side; an author save racing a pending change is handled by the Project store's three-way check on accept.

## Acceptance criteria
- [ ] Create, save, rename (name and id), list and delete over HTTP change files in `graphs/` as expected.
- [ ] A schema-invalid save returns `GRAPH_SCHEMA_INVALID` and leaves the file unchanged.
- [ ] A file with `schemaVersion: 2` is refused with `GRAPH_SCHEMA_VERSION_UNSUPPORTED` and listed as invalid.
- [ ] Renaming the id to an existing slug fails; GETs are side-effect free.
