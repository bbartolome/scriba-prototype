---
id: CEX-03
title: Reorder, status and part writes with revision conflicts and full materialisation
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-02]
parallel_with: [CEX-04, CEX-05, CEX-17]
unblocks: [CEX-09, CEX-14, CEX-16]
---

# CEX-03 — Order writes

## Why
Drag to reorder (24), graph-ordered files locked (25), status per file (26) stored in `project.yaml` (27), conflicting edits refused (28), other tabs refresh (29).

## Decisions
- `POST` reorder `{revision, front, body, back}`; `POST` status `{revision, path, status}`; `POST` part `{revision, path, part}`.
- **Optimistic concurrency:** a `revision` mismatch → `COMPILE_ORDER_CONFLICT`, nothing written (covers hand edits on the host and other devices).
- Reorder must be a **permutation** of the current files per part (`COMPILE_INVALID_REORDER`) and must not move graph-ordered files relative to one another — the graph-ordered block is fixed (`COMPILE_GRAPH_ORDERED_MOVE`).
- **Every write materialises the whole effective order:** one entry for every current manuscript file, in effective order (otherwise a single new entry would jump ahead of unnamed files appended alphabetically). Entries pointing at missing files are dropped on write.
- Writes change only the `order` key through the Project store's `updateProjectYaml` (comments, key order and other keys preserved).
- After every successful write, publish `manuscript-updated`.

## Acceptance criteria
- [x] Reordering with a stale `revision` returns a conflict and leaves `project.yaml` byte-identical.
- [x] A valid reorder writes every file's entry and keeps comments and other keys in `project.yaml` byte-identical.
- [x] Moving graph-ordered files relative to each other is refused; a non-permutation is refused.
- [x] Status and part writes materialise the full order; `manuscript-updated` is published after each.
