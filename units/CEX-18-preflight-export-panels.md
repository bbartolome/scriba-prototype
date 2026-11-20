---
id: CEX-18
title: Preflight panel, export buttons with confirm dialog, export settings panel
module: compile-export
phase: phase:manuscript-snapshots
milestone: M5
blocked_by: [CEX-17, CEX-05, CEX-10, CEX-14]
parallel_with: [CEX-15, CEX-19]
unblocks: [CEX-20]
---

# CEX-18 — Preflight and export UI

## Decisions
- **Preflight panel:** run on demand; findings grouped by check, each linking to its location (`/projects/:projectId/files?path=…` with line).
- **Export buttons** for `md`, `docx`, `epub`, `pdf`. The server always runs preflight; when the last preflight has errors, show a confirm dialog ("N errors. Export anyway?") before exporting. Download via the returned `downloadUrl` (allowed on phone too). Pandoc errors shown with their message.
- **Export settings panel:** metadata (author, pen name, contact, subtitle, language, rights), dedication, bibliography mode, per-format template overrides with "copy default into project"; writes with `revision`.

## Acceptance criteria (Vitest + fakes)
- [x] Preflight errors open the confirm dialog before export; cancelling sends no export.
- [x] Findings link to their file and line.
- [x] The settings panel sends only changed fields with the current revision; copy-default posts the chosen path.
