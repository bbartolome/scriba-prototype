---
id: PST-11
title: examples/ nonfiction skeleton and samples.yaml
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-01]
parallel_with: [PST-02, PST-03, PST-04, PST-05, PST-06, PST-07, PST-08]
unblocks: [PST-09, PST-12, "Genre packs nonfiction sample entities (GNP-11)", "Agent loop file-tools-chat gate (AGL-08)", "Agent loop grounding-claims sample (AGL-19)", "Compile & export sample order and export settings (CEX-08)"]
---

# PST-11 — Nonfiction sample skeleton

Pure content; parallel with all API work. The Project store owns `examples/`, `examples/samples.yaml` and the nonfiction skeleton.

## Decisions
- `examples/samples.yaml` lists `{id, title, description}`; at M1 one entry `nonfiction` (Genre packs adds `fiction` at M6). It sits outside every sample folder.
- `examples/nonfiction/`:
  - `project.yaml`: `schemaVersion: 1`, a title, `genrePack: nonfiction`, **no `order`** (Compile & export adds it at M5).
  - `sources/`: 3–5 short source documents, one of them the author's outline notes **`sources/outline.md`** (so the M1 "summarize my outline" demo has an outline without a `structure/` folder).
  - `drafts/`: 2–3 top-level draft files of a few hundred words each.
  - `.gitignore` containing `.scriba/`.
  - No `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/`.
- Topic: **practice and expertise**, so intents like "draft the cold open for chapter 3 from my notes on the 10,000 hour idea" make sense. Text is public domain or written for the sample.
- The nonfiction sample is the e2e fixture: its file paths are a contract with `e2e/fixtures/mock-openai/` (renaming a sample file updates the mock scenario in the same PR).
- Later additions by others: `entities/` (Genre packs, M2), grounding-claims draft (Agent loop, M3), recipe (Graph runner, M4), `order` (Compile & export, M5).

## Acceptance criteria
- [x] `project.yaml` validates against the PST-01 schema; Platform's examples check (PLT-20, once landed) passes.
- [x] `sources/outline.md` exists and outlines the book's chapters, consistent with the drafts.
- [x] No excluded folders are present.
