---
id: TRG-14
title: YAML editor with lint diagnostics, Customize, Revert, Compare, New, Duplicate, Delete
module: tool-registry
phase: phase:editor-ui
milestone: M2
blocked_by: [TRG-13, "Frontend shell read-only diff (SHL-12)"]
parallel_with: [TRG-16]
unblocks: [TRG-15]
---

# TRG-14 — YAML editor and actions

## Decisions
- A **CodeMirror 6 YAML editor** built directly in this module (`@codemirror/lang-yaml` + the lint extension) — the Shell's editor wrapper is Markdown-only and saves through the Project store; tool specs save through this module's API.
- Diagnostics from **save** (422 details) and a **debounced lint while typing** (`POST /lint`), shown on their lines.
- Built-ins open **read-only** with **Customize** (opens an editable copy; save writes the user copy). **Revert to built-in** (delete the user copy). **Compare with built-in** (Shell's read-only diff of user copy vs `GET /builtin`). **New** (blank template), **Duplicate**, **Delete** (user-only tools).
- A failed save keeps the previous version active; a save with warnings succeeds and shows them.

## Acceptance criteria
- [ ] Saving an invalid spec shows the diagnostics on their lines and keeps the previous version active; a spec with warnings saves and shows them.
- [ ] Customize on a built-in opens an editable copy; after save the list shows it user-owned, overriding the built-in; Revert returns to the built-in.
- [ ] Compare shows the diff between the user copy and the built-in.
- [ ] New and Duplicate produce valid starting YAML; Delete removes a user-only tool.
