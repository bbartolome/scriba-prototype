---
id: PST-18
title: Draft versions — list, read, restore
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-16]
parallel_with: [PST-17, PST-19, PST-20, PST-23]
unblocks: [PST-21, PST-22]
---

# PST-18 — Draft versions API

## Why
List, view and diff versions (33); restore reversibly (34).

## Decisions
- Listing (GET) `{draftPath, versions: [{id, createdAt, size}]}` for a top-level draft; reading a version (GET) returns its content. These are the only public routes that read `drafts/.versions/`.
- **Restore** (author action, POST): saves the current content as a new version, then writes the restored text directly (not a pending change). Publishes `files-changed`.
- Versions belong to their draft by file name; renaming a draft orphans its versions (known cost; stable IDs deferred).
- `drafts/.versions/` is **not** git-ignored (history travels with the book). Only this module reads it; Compile & export assembles top-level drafts only.

## Acceptance criteria
- [x] Listing returns versions newest first with sizes; reading returns exact stored content.
- [x] Restore saves the current content as a version before writing.
- [x] Version paths remain unreachable through the general file API.
