---
id: CEX-12
title: EPUB 3 export with stylesheet, TOC and stable identifier
module: compile-export
phase: phase:export
milestone: M5
blocked_by: [CEX-10]
parallel_with: [CEX-11, CEX-13, CEX-14, CEX-16]
unblocks: [CEX-15]
---

# CEX-12 — EPUB

## Decisions
- `--to=epub3 --split-level=1`, a TOC, title, author, language, a stable identifier derived from the project, and the built-in stylesheet (overridable via CEX-14).

## Acceptance criteria (structural, unzipped)
- [ ] The spine and nav follow effective order with front and back matter placed correctly.
- [ ] Metadata has title, author, language and identifier.
- [ ] The bibliography is present for a nonfiction fixture and absent when the mode is `off`.
