---
id: PST-06
title: File API core — list, read, write (baseHash), edit, atomic writes, schema-too-new refusal
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-02, PST-04]
parallel_with: [PST-05, PST-08, PST-09, PST-11]
unblocks: [PST-07, PST-10, PST-12]
---

# PST-06 — File API core

## Why
Browse and edit files with direct saves (stories 17–18), refuse stale saves (19), atomic writes (20), and the Agent loop's list/read/write/edit operations (44). Refusing newer files makes rollback safe from v1 (41).

## Decisions
- HTTP (project-scoped) **and** the in-process provider, both through path safety and the active-project check.
- **list** `{path, recursive?}` → `{path, kind: file|dir, size, mtime}`; dot-entries hidden by default. GET.
- **read** → `{path, content, hash, mtime}`; `hash` is `sha256:<hex>`. UTF-8 text only: a file over **5 MB** → `PROJECT_FILE_TOO_LARGE`; non-text → `PROJECT_NOT_TEXT` (both still appear in `list`). Missing → `PROJECT_NOT_FOUND`. GET.
- **write** (author save, POST) `{path, content, baseHash?}`: if `baseHash` is given and disk no longer matches → `PROJECT_WRITE_CONFLICT` (the Shell editor maps this to its conflict state). Atomic (temp file in the same folder + rename), creates missing parents.
- **edit** (author, POST) `{path, old, new}`: exact replacement; zero matches → `PROJECT_EDIT_NO_MATCH`, more than one → `PROJECT_EDIT_AMBIGUOUS`.
- `project.yaml` writes through `write` are validated against the schema and preserve comments and key order (edited as a YAML document).
- **Schema-too-new refusal** ships here, before any migrator exists: a file whose `schemaVersion` is newer than supported (for `project.yaml` and any file kind with a registered max version) is refused for reads and writes with `PROJECT_SCHEMA_TOO_NEW`.
- Every successful write/edit publishes `files-changed {projectId, paths}`.
- Agent and recipe writes are **never** direct; those callers use `propose` (PST-15). `write`/`edit` are for author actions only.

## Acceptance criteria
- [x] Read returns `sha256:` hash; a `write` with a stale `baseHash` fails `PROJECT_WRITE_CONFLICT`; with the current one, it succeeds.
- [x] `edit` fails distinctly on zero and on multiple matches.
- [x] Files over 5 MB and binary files are refused on read but listed.
- [x] An interrupted write leaves either the old or new file (temp+rename verified: no partial content, no stray temp after success).
- [x] A `project.yaml` write with comments round-trips them; an invalid one fails validation.
- [x] A too-new file is refused for read and write.
- [x] `files-changed` arrives on `/events` after write and edit.
- [x] Every GET is side-effect free.
