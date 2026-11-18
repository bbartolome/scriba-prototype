---
id: TRG-14
title: YAML editor with lint diagnostics, Customize, Revert, Compare, New, Duplicate, Delete
module: tool-registry
phase: phase:editor-ui
milestone: M2
blocked_by: [TRG-13, "Frontend shell read-only diff (SHL-12)"]
parallel_with: [TRG-16]
unblocks: [TRG-15, TRG-17]
---

# TRG-14 — YAML editor and actions

## Decisions
- A **CodeMirror 6 YAML editor** built directly in this module (`@codemirror/lang-yaml` + the lint extension) — the Shell's editor wrapper is Markdown-only and saves through the Project store; tool specs save through this module's API.
- Diagnostics from **save** (422 details) and a **debounced lint while typing** (`POST /lint`), shown on their lines. An unreadable file opens from its `source` and `lint`, with `spec` and `views` null (the Navigator's decision of 2026-11-14 on TRG-01 open point 2, `plans/DECISIONS.md`). For an invalid user copy of a built-in, the detail's editor tab reads `GET …/tools/:name/user` (`TOOL_USER_ROUTE`, the Navigator's decision of 2026-11-14 on TRG-01 open point 8, `plans/DECISIONS.md`). Changed by the Navigator's decision on TRG-13 open point 2 (2026-11-16). The old text was: "An invalid user copy of a built-in opens from `GET …/tools/:name/user`". See plans/DECISIONS.md.
- Built-ins open **read-only** with **Customize** (opens an editable copy; save writes the user copy). **Revert to built-in** (delete the user copy). **Compare with built-in** (Shell's read-only diff of user copy vs `GET /builtin`). **New** (blank template), **Duplicate**, **Delete** (user-only tools).
- A failed save keeps the previous version active; a save with warnings succeeds and shows them.

## Acceptance criteria
- [x] Saving an invalid spec shows the diagnostics on their lines and keeps the previous version active; a spec with warnings saves and shows them.
- [x] Customize on a built-in opens an editable copy; after save the list shows it user-owned, overriding the built-in; Revert returns to the built-in.
- [x] Compare shows the diff between the user copy and the built-in.
- [x] New and Duplicate produce valid starting YAML; Delete removes a user-only tool.
