---
id: PST-10
title: Files UI — tree, Markdown preview, editor with direct save and stale-base warning
module: project-store
phase: phase:files
milestone: M1 (editing at M3 when Shell phase:editor lands)
blocked_by: [PST-06, "Frontend shell phase:core", "Frontend shell phase:shared-components (Markdown preview)"]
parallel_with: [PST-07, PST-08, PST-09]
unblocks: [PST-12, PST-14, PST-21]
---

# PST-10 — Files UI

## Decisions
- Route `/projects/:projectId/files` (project-scoped, minimum class `phone`); `?path=` opens a file (Graph runner links here).
- A tree of the active project (dot-entries hidden).
- Opening a file: on desktop and tablet, the Shell's CodeMirror 6 editor with **direct save** through the file API `write` carrying `baseHash` (the `hash` from the last read or successful save); `PROJECT_WRITE_CONFLICT` shows the stale-base warning. **Until Shell `phase:editor` lands, files open read-only in the Shell's Markdown preview**; adopt the editor in a follow-up PR when it lands (not blocking this unit).
- On the `phone` device class the page switches to the read-only preview.
- Refetches on `files-changed` for the active project.
- Draft version history UI is PST-21; the search box is PST-14.

## Acceptance criteria
- [ ] Component tests: tree renders from list, `?path=` opens that file, preview renders Markdown, a `files-changed` event refreshes the tree.
- [ ] Phone viewport: read-only preview, no editor.
- [ ] When the editor is present: a save sends `baseHash`, and a write-conflict response shows the warning without losing the author's text.
