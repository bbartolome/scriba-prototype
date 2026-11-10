---
id: PST-02
title: Project store NestJS module skeleton and the path-safety invariant
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-01]
parallel_with: [PST-11]
unblocks: [PST-03, PST-06, PST-08]
---

# PST-02 — Module skeleton and path safety

## Why
A confused model must never read or change another book or anything outside the library (stories 14–16).

## Decisions
- Module at `apps/api/src/modules/project-store/`, registered with one `@Module` import in Platform's composition root; routes under `/api/project-store/…`. Exports an injectable provider (the in-process API other modules use through DI).
- Library root is `SCRIBA_BOOKS_DIR` (default `/books`).
- **One path-check function**, used by every endpoint and every in-process caller:
  - Paths are project-relative POSIX strings. Reject absolute paths, `..` segments, backslashes, NUL bytes and empty segments → `PROJECT_PATH_INVALID`.
  - Join to the project root, canonicalise, resolve symlinks: the real path of the target, or of its nearest existing ancestor when the target doesn't exist. The result must have the **real** project root as prefix, else `PROJECT_PATH_OUTSIDE`. A symlink inside the project pointing outside is rejected; one pointing within is allowed.
  - **Reserved paths** unreachable through the public file API: `.scriba/` and `drafts/.versions/` → `PROJECT_PATH_RESERVED`. Only the module's own pending-change and version operations touch them. Story-node pointers and file references never target a version.
  - The bind mount may be case-insensitive (macOS hosts): the prefix check compares real paths and doesn't depend on letter case in the input.
- Errors returned to callers contain only project-relative paths.
- Registers the `projects` settings section with Platform's hook (PLT-07): version 1, default `{schemaVersion: 1, active: null}`.

## Acceptance criteria
- [ ] Table-driven suite (through a test-only route or the provider, using real temp folders and real symlinks): `..`, absolute, backslash, NUL, empty segment → invalid; symlink out → outside; symlink within → allowed; `.scriba/…` and `drafts/.versions/…` → reserved; a not-yet-existing nested target under a valid ancestor → allowed.
- [ ] No error message or response contains an absolute container path.
- [ ] The module boots in `create-test-app` and the `projects` section appears in `settings.yaml` with its default.
