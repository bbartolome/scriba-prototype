---
id: AGL-18
title: Grounding badges UI — summary chip and per-claim list
module: agent-loop
phase: phase:grounding
milestone: M3
blocked_by: [AGL-07]
parallel_with: [AGL-15, AGL-16, AGL-17, AGL-19]
unblocks: [AGL-20]
---

# AGL-18 — Grounding badges

## Why
Readable badges in sunlight and without colour vision (38), a one-line summary per draft card (39).

## Decisions
- A **summary chip** per draft card ("3 supported · 1 weak · 1 unsupported"), expanding to a per-claim list: verdict as **text + icon + colour**, the claim text, the cited passage snippet, and a link to open the source file (`/projects/:projectId/files?path=…`).
- A "Check grounding" action on draft cards and from the files view link (calls the on-demand endpoint).
- Phone: chip collapsed by default; tap targets ≥ 44 px.

## Acceptance criteria (Vitest + fakes)
- [x] Badges render with text labels at phone width.
- [x] The summary counts match a fake `grounding-result`; expanding shows passages with source links.
