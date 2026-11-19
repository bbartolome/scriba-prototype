---
id: CEX-11
title: DOCX export with the standard-manuscript reference document
module: compile-export
phase: phase:export
milestone: M5
blocked_by: [CEX-10]
parallel_with: [CEX-12, CEX-13, CEX-16]
unblocks: [CEX-14, CEX-15]
---

# CEX-11 — DOCX

## Decisions
- `--to=docx --reference-doc=<template>`.
- Built-in **reference DOCX** encodes standard manuscript layout: Times New Roman 12 pt, double spacing, 1-inch margins, a running header of surname / short title / page number, chapter headings on a new page, a first-line indent, and a title page with the contact block and the rounded word count. Ships in the image with the module.

## Acceptance criteria (structural, unzipped)
- [x] Chapters appear in effective order; styles come from the reference doc (and from an override when set, via CEX-14).
- [x] The title page carries the author, the contact block and the rounded word count.
- [x] Front matter, dedication and back matter appear in their places.
