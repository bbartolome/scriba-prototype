---
id: CEX-04
title: Assembled-Markdown builder — metadata block, matter placement, front-matter stripping, dedication, bibliography
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-02, "Genre packs core entity types (GNP-03; source.citation, source.url)", "Setup & auth preferences reader (SAU-09)"]
parallel_with: [CEX-03, CEX-05]
unblocks: [CEX-09, CEX-10]
---

# CEX-04 — Assembled Markdown

## Why
Front matter stripped (14); title page from metadata (15); dedication (16); front/back matter (17, 20); bibliography (18–19); native footnotes (21).

## Decisions
- One Pandoc Markdown document in this order:
  1. a generated YAML metadata block (title, subtitle, author, language, date, rights, identifier — a stable id derived from the project);
  2. front matter files;
  3. the dedication, if set (`.unnumbered .unlisted`);
  4. body files;
  5. back matter files;
  6. the generated bibliography, if enabled.
- Each file's own YAML front matter is stripped; files joined with blank lines so every file starts a new block.
- Chapter structure comes from the author's headings; compile injects no headings except the generated "Bibliography" heading.
- Front and back matter files get Pandoc classes (`.unnumbered`) to stay out of chapter numbering; writers place them per format.
- Title page from metadata; standard manuscript layout also needs the contact block and an approximate body word count rounded to the nearest 1,000 (passed as metadata for the reference DOCX).
- **Export settings** read from `project.yaml` with read-time defaults; `author` falls back to Setup & auth's `authorName` preference (in-process preferences reader), then to nothing.
- **Bibliography** (enabled by default when the genre pack is `nonfiction`): entries from `source` entities rendered from `citation` plus `url` when present, sorted alphabetically by citation. **All** (default): every Source entity. **Cited only**: Sources referenced from a manuscript file by an entity reference in the body (`[@id]`) or by the file's draft provenance (Agent loop format, where available). No citeproc/CSL in v1.
- **Notes:** the author's Markdown footnotes, rendered natively by Pandoc (footnotes in DOCX/PDF, endnotes in EPUB).
- Exposed as an internal builder; tested here through a test-only route or the in-process service, and through `md` export in CEX-10.

## Acceptance criteria
- [x] The assembled document has the metadata block, matter in the right places and no per-file front matter (golden Markdown for a fixture project).
- [x] Bibliography `all` lists every Source; `cited` lists only cited ones; `off` omits the heading.
- [x] `author` falls back to the preference reader when unset.
