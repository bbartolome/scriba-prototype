---
id: CEX-15
title: Export gate — image smoke step exporting the sample to all four formats
module: compile-export
phase: phase:export
milestone: M5
blocked_by: [CEX-10, CEX-11, CEX-12, CEX-13, CEX-14, "Platform phase:image-compose (PLT-15)", "Platform phase:ci-publish (PLT-19)"]
parallel_with: [CEX-16, CEX-18, CEX-19]
unblocks: [CEX-20, "Agent loop compile tools (AGL-24)"]
---

# CEX-15 — Export gate

Merging this **closes Compile & export `phase:export`**.

## Scope
- An additive step in Platform's image smoke job: inside the built image, export the nonfiction sample to `md`, `docx`, `epub` and `pdf` on both amd64 and arm64.

## Acceptance criteria (the phase checklist)
- [x] Each format exports the fixture project through the HTTP API; the download GET returns the bytes with no side effects.
- [x] CEX-10…CEX-14 criteria pass on `main` with real Pandoc and Typst in CI.
- [x] The image smoke step exports all four formats on amd64 and arm64.
- [x] The Typst spike ADR is merged.
