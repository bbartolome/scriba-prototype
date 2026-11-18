---
id: GNP-20
title: core/throughline_check tool
module: genre-packs
phase: phase:remaining-shapes
milestone: M7
blocked_by: [GNP-02, GNP-12]
parallel_with: [GNP-19, GNP-21, GNP-22, GNP-23]
unblocks: [GNP-24]
---

# GNP-20 — Throughline check

## Spec
- `core/tools/throughline_check.yaml`, output `check`, `enabled: true`. Description: "Flag any section of a chapter that drifts from its core idea."
- Inputs: `chapterText` [text port, required], `coreIdea` [text port, required].
- Prompt: split the chapter into sections/paragraphs, flag each one that drifts from the core idea with a short reason and a quote of its opening words; no rewriting.

## Acceptance criteria
- [x] Passes the validation suite; golden test passes with a fixture chapter containing one drifting paragraph.
- [x] Manual eval case added.
