---
id: TRG-17
title: Editor-UI gate — M2 done-when with the shipped workhorses, demo
module: tool-registry
phase: phase:editor-ui
milestone: M2
blocked_by: [TRG-13, TRG-14, TRG-15, TRG-16, "Genre packs phase:nonfiction-workhorses (GNP-12)"]
parallel_with: []
unblocks: []
---

# TRG-17 — Editor-UI gate

Merging this **closes Tool registry `phase:editor-ui`**.

## Acceptance criteria (the `phase:editor-ui` checklist)
- [x] TRG-13…TRG-16 criteria pass on `main`.
- [x] **M2 done-when:** each of the four nonfiction workhorses (cold open, mystery question, myth-buster, numbers-to-people), as shipped by Genre packs, produces a draft that cites its source files.

## Demo (M2, under 5 min)
1. Open the nonfiction sample project, go to Tools. Show core, nonfiction and user groups; switch off `mystery_question`.
2. Open `cold_open` (built-in, read-only). Customize, change the description, add a `tone` select, save. The form preview, node preview and function schema all gained `tone`.
3. Add a typo `{{momnet}}` to the prompt and save: blocked, with the lint error on its line. Fix and save.
4. In Try, pick a person entity (the picker shows only people) and a moment, run. Show the draft and its sources used.
5. Optional, with the Agent loop's `phase:narrative-tools` in: ask "draft a cold open for chapter 1 from my notes on <person>". The tool card shows the same arguments, and `mystery_question` isn't offered.
6. Revert to built-in: the original description is back.
