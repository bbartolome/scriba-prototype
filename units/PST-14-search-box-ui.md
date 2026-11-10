---
id: PST-14
title: Search box in the files UI
module: project-store
phase: phase:search
milestone: M2
blocked_by: [PST-10, PST-13]
parallel_with: [PST-15, PST-16, PST-17]
unblocks: [PST-22]
---

# PST-14 — Search box UI

Merging this (with PST-13) **closes Project store `phase:search`**.

## Decisions
- A search box in the files page calling the search POST for the active project, with an optional scope toggle (`sources` / `entities`).
- Results show project-relative path and snippet; selecting one opens the file (`?path=`) scrolled near the passage offset.
- Works at phone width.

## Acceptance criteria
- [ ] Component test (fake API): typing a query shows ranked results; selecting a result opens that path.
- [ ] Scope toggle restricts the request.
- [ ] Phone viewport test passes.

**M2 note.** Search gives the workhorse tools and the Agent loop a way to look things up. M2's "done when" (each workhorse produces a draft citing its source files) is demoed by the Tool registry, Genre packs and the Agent loop, citing via entity resolution (PST-08) and this search.
