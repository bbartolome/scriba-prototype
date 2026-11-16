---
id: SAU-13
title: /setup Preferences step
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-09, SAU-11]
parallel_with: [SAU-12, SAU-14, SAU-15]
unblocks: [SAU-16]
---

# SAU-13 — Preferences step

## Decisions
- Fields: author display name, default genre pack for new projects (choices from the built-in packs: `nonfiction`, `fiction`, plus user packs if listed by the Tool registry; free text fallback).
- Shows the Shell's **device-local** theme toggle (embedded Shell component; not stored server-side).
- Saves only changed fields (preferences POST) and marks the step `done`, or `skipped`.

## Acceptance criteria
- [x] Prefills saved values; changing only the genre pack sends only that field.
- [x] The theme toggle is the Shell's component and makes no server call.
