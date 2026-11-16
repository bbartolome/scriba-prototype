---
id: AGL-11
title: Narrative-tools gate — M2 done-when with the workhorses, demo
module: agent-loop
phase: phase:narrative-tools
milestone: M2
blocked_by: [AGL-09, AGL-10, "Genre packs phase:nonfiction-workhorses (GNP-12)", "Project store phase:search (PST-14)"]
parallel_with: [AGL-12, AGL-13, AGL-14]
unblocks: ["Genre packs workhorses demo", "Tool registry editor-ui demo step 5"]
---

# AGL-11 — Narrative gate

Merging this **closes Agent loop `phase:narrative-tools`**.

## Scope
- Mock scenarios for an agent-driven call of each workhorse (nonfiction sample paths and entity IDs).
- Extend the e2e with a registry tool call if useful (optional; Platform's harness).

## Acceptance criteria
- [ ] **Done when** each of the four workhorses (cold open, mystery question, myth-buster, numbers-to-people), called by the agent from an intent, produces a draft that cites its source files (asserted via `sourcesUsed` and provenance with the mock; via `[@id]` citations in the manual eval).
- [x] AGL-09 and AGL-10 criteria pass on `main`.

## Demo (under 5 min)
Ask "draft a cold open about the person in my notes on the 10,000 hour idea". Show the card's entity IDs and sources used. Disable myth-buster in the registry, ask for one, and show the agent can't call it.
