---
id: GNP-11
title: Nonfiction sample entities/ and Source front matter on skeleton sources
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-03, GNP-06, "Project store nonfiction skeleton (PST-11)"]
parallel_with: [GNP-05, GNP-07, GNP-08, GNP-09, GNP-10]
unblocks: [GNP-12, "Agent loop grounding-claims sample (AGL-19)", PLT-22]
---

# GNP-11 — Nonfiction sample entities

## Decisions
- Changed by the Navigator's decision on open point 1 (2026-11-16): PLT-22 added to `unblocks` (line 9). The old text was: `unblocks: [GNP-12, "Agent loop grounding-claims sample (AGL-19)"]`. See plans/DECISIONS.md.
- Five entities in `examples/nonfiction/entities/` on the skeleton's topic (practice and expertise): one `person`, two `claim`s, one `concept`, one `style-profile`.
- Every reference resolves to a source in the skeleton's `sources/`. Entities only summarise and cite those sources; they never add facts the sources lack. No invented quotes from real living people.
- The claims' statuses must not contradict the Agent loop's grounding-claims draft (M3); coordinate when that draft lands.
- If skeleton sources lack Source front matter (`title`, `citation`, `url?`, `reliability`), add it in this PR.
- File paths already used by the mock OpenAI script stay unchanged.

## Acceptance criteria
- [ ] Sample entities validate against their types (Platform's examples check, pack layer), and every entity reference resolves to an existing file in the sample.
- [x] Platform's examples check passes; the e2e still passes unchanged.
