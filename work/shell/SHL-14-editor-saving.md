---
id: SHL-14
title: Editor saving — debounce, explicit save, coalescing, save state, conflict, unsaved-changes guards
module: shell
phase: phase:editor
milestone: M3
blocked_by: [SHL-13]
parallel_with: [SHL-15, SHL-16]
unblocks: ["Project store files editing (PST-10)", "Compile & export manuscript editing"]
---

# SHL-14 — Editor saving

## Why
Auto-save after a pause plus save/Cmd-Ctrl-S (25); visible save state (26); warn before leaving with unsaved text (27); never silently overwrite a file changed elsewhere (28).

## Decisions
- The author's typing is written **straight through the Project store file API** (`write`), not through pending changes.
- Saves after a debounce (~1.5 s idle), on explicit save (button + Cmd/Ctrl-S), on blur and before route leave. **One save in flight**; later edits coalesce into one follow-up save.
- Each save sends `baseHash` (the `hash` from the last read or successful save) and keeps the returned hash as the next base.
- A write-conflict error (Project store's distinct code) → `conflict` state; never overwrites. Any other failure → `failed`, text kept.
- A `canDeactivate` guard and a `beforeunload` prompt warn about unsaved text.

## Acceptance criteria
- [ ] Typing then pausing saves once after the debounce; Cmd/Ctrl-S and the button save at once; saves during an in-flight save coalesce into one follow-up.
- [ ] State moves `unsaved → saving → saved`; a failed write shows `failed` and keeps the text; a conflict shows `conflict` and doesn't overwrite.
- [ ] Navigating away or closing the tab with unsaved text prompts first.
- [ ] The second save carries the hash returned by the first.
