---
id: CEX-08
title: Nonfiction sample — project.yaml order field, mixed statuses, export settings
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-01, "Project store nonfiction skeleton (PST-11)"]
parallel_with: [CEX-02, CEX-17]
unblocks: [CEX-09, CEX-20]
---

# CEX-08 — Sample order and export settings

## Decisions
- Add the `order` field to `examples/nonfiction/project.yaml` in an order that **differs from alphabetical**, with mixed statuses (e.g. `final`, `revised`, `draft`), preserving existing comments and keys.
- Add export settings with an author name and a dedication. The bibliography comes from the sample's Source entities (default `all` for nonfiction).
- The sample stays small (2–3 drafts of a few hundred words). The milestone's "done when" needs **three chapters**: if the skeleton ships fewer than three drafts, add the third (original text, consistent with `sources/outline.md`). No front or back matter file; no `snapshots/`.
- Keep any file paths used by the mock OpenAI scenarios unchanged.

## Acceptance criteria
- [ ] Platform's examples check passes with the order field and export settings.
- [ ] The sample, started from "start from sample", returns its authored non-alphabetical order with its statuses (tested in CEX-09 on a temp copy).
