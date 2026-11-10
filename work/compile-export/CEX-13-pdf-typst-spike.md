---
id: CEX-13
title: PDF via Typst, built-in Typst template, and the Typst quality spike ADR
module: compile-export
phase: phase:export
milestone: M5
blocked_by: [CEX-10]
parallel_with: [CEX-11, CEX-12, CEX-14]
unblocks: [CEX-15]
---

# CEX-13 — PDF and the Typst spike

## Decisions
- `--to=typst --pdf-engine=typst` with a built-in Typst template (overridable via CEX-14). No TeX install.
- **Typst quality spike:** render the nonfiction sample plus a typographic stress fixture (footnotes, block quotes, smart quotes, em and en dashes, accented and non-Latin text, long headings, a TOC, a page break per chapter, an image) and compare against a written checklist. Record the outcome as an ADR in `docs/adr/`: keep Typst, or recommend the TeX Live derived image (`FROM bbartolome/scriba`) as follow-up work (not in v1).

## Acceptance criteria
- [ ] The PDF output starts with `%PDF-` and is produced via `--pdf-engine=typst`.
- [ ] The spike ADR is merged and states the decision.
