---
id: CEX-20
title: Manuscript-snapshots gate — e2e manuscript step, Word/EPUB check, M5 demo
module: compile-export
phase: phase:manuscript-snapshots
milestone: M5
blocked_by: [CEX-08, CEX-15, CEX-16, CEX-17, CEX-18, CEX-19, "Project store phase:pending-review (PST-22; e2e accept-change step)"]
parallel_with: []
unblocks: []
---

# CEX-20 — Milestone gate

Merging this **closes Compile & export `phase:manuscript-snapshots`** (the M5 milestone demo).

## Scope
- **Extend Platform's e2e:** after "accept change", open the manuscript view and assert the sample's files are in their `project.yaml` order and the accepted file's word count changed. **No export step in the e2e.**

## Acceptance criteria (the phase checklist)
- [x] CEX-16…CEX-19 criteria pass on `main`.
- [x] The e2e passes with the manuscript step.
- [ ] **Done when:** a four-chapter sample exports and opens cleanly in Word and an EPUB reader (manual, recorded in the PR).

## Demo (under 5 min)
1. Start a new project from the nonfiction sample and open **Manuscript**: four chapters in the sample's `project.yaml` order (not alphabetical), with statuses and word counts.
2. Drag chapter 3 above chapter 2; open `project.yaml` on the host and see the order updated. Set chapter 2 to `final`.
3. Type `TK` into chapter 1, return and run **Preflight**: the placeholder error with a link to the line, and the unsupported-claims finding from the grounding-claims draft.
4. Click **Snapshot**, label it `before-cut`.
5. Export **DOCX**, confirm past the preflight dialog, open in Word: standard manuscript layout, title page, dedication, chapters in the new order, bibliography.
6. Export **EPUB** and open it in Apple Books or Calibre: the TOC lists the chapters in order.
7. Export **PDF** and open it.
8. Delete chapter 3's file and restore `before-cut`: the chapter is back in place, and a `pre-restore` snapshot is listed.
