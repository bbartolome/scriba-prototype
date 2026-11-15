---
id: PST-34
title: Files editor adoption — CodeMirror 6 direct save and stale-base warning
module: project-store
phase: phase:files
milestone: M1 (editing at M3 when Shell phase:editor lands)
blocked_by: [PST-10, "Frontend shell editor saving (SHL-14)", "Frontend shell editor layout (SHL-15)", "Frontend shell editable merge view (SHL-16)"]
parallel_with: []
unblocks: []
---

# PST-34 — Files editor adoption

## Decisions
- Opening a file: on desktop and tablet, the Shell's CodeMirror 6 editor with **direct save** through the file API `write` carrying `baseHash` (the `hash` from the last read or successful save); `PROJECT_WRITE_CONFLICT` shows the stale-base warning. **Until Shell `phase:editor` lands, files open read-only in the Shell's Markdown preview**; adopt the editor in a follow-up PR when it lands (not blocking this unit).
- On the `phone` device class the page switches to the read-only preview.

## Scope
- The follow-up PR of PST-10's editor decision: on desktop and tablet, the Files page opens a file in the Shell's editor with direct save; a save sends `baseHash`; `PROJECT_WRITE_CONFLICT` shows the stale-base warning; on `phone` the read-only preview stays.

## Acceptance criteria
- [ ] When the editor is present: a save sends `baseHash`, and a write-conflict response shows the warning without losing the author's text.
