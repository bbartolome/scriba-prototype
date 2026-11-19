---
id: CEX-07
title: Preflight checks — broken entity links and banned phrases
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-05, "Genre packs style-profile.bannedPhrases (GNP-03)"]
parallel_with: [CEX-06]
unblocks: [CEX-09]
---

# CEX-07 — Entity links and banned phrases

## Broken entity links (38; error)
- Every in-body entity reference (`[@id]`, including multi-citations `[@a; @b]`, using the Project store's citation pattern; code skipped) and every ID in a file's front-matter `links` must resolve through the Project store's resolution.
- Project-relative Markdown links and image paths must resolve to existing files inside the project; paths outside the project are errors.

## Banned phrases (39; warning)
- Read the style profile `project.yaml` references and its `bannedPhrases`. Case-insensitive, whole-phrase, whitespace-normalised matching; code skipped; **every occurrence** reported with its location.
- No style profile → the check passes with an `info` note.

## Acceptance criteria
- [x] Fixtures with an unknown `[@id]`, a multi-citation with one bad ID, a bad `links` entry, a missing image and an outside-project link each produce an error at the right line.
- [x] A banned phrase split across a line break is found; occurrences in code are not; no style profile gives an `info` pass.
