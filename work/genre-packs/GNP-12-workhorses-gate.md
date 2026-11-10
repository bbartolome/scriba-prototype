---
id: GNP-12
title: Workhorses gate — M2 done-when and demo
module: genre-packs
phase: phase:nonfiction-workhorses
milestone: M2
blocked_by: [GNP-05, GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11]
parallel_with: [GNP-13, GNP-14, GNP-15, GNP-16, GNP-17]
unblocks: [GNP-20, GNP-21, GNP-22, "Tool registry editor-ui gate (TRG-17)", "Graph runner sample recipe (GRR-16)", "Graph runner phase:canvas"]
---

# GNP-12 — Workhorses gate

Merging this **closes Genre packs `phase:nonfiction-workhorses`**.

## Acceptance criteria (the phase checklist)
- [ ] All four tools pass the validation suite, and their common inputs are identical.
- [ ] Each tool's golden test passes (entities with IDs, citation and placeholder instructions, `sourcesUsed` from entity inputs).
- [ ] Sample entities validate and every reference resolves.
- [ ] **Done when:** each of the four workhorses produces a draft that cites its source files — in CI through `sourcesUsed` and draft provenance; with a real model through the manual eval (the draft contains `[@id]` citations whose IDs are among the input entities and sources).

## Demo (under 5 min; needs Agent loop `phase:narrative-tools`)
1. Start from the nonfiction sample.
2. In chat, ask "draft a cold open for chapter 1 about <person> using my notes".
3. Watch the `cold_open` tool card with its inputs and sources.
4. Open the pending change and see the `[@id]` citations.
5. Repeat with "bust the myth that …" (Myth-buster).
6. Reject both changes.
