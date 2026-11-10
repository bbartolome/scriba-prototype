---
id: SHL-16
title: Editable merge view (proposed side editable, emits edited text)
module: shell
phase: phase:editor
milestone: M3
blocked_by: [SHL-12]
parallel_with: [SHL-13, SHL-14, SHL-15]
unblocks: [SHL-19]
---

# SHL-16 — Editable merge view

Merging this with SHL-13…SHL-15 **closes Frontend shell `phase:editor`**.

## Why
Edit the proposed side of a diff before accepting (21).

## Decisions
- Extends SHL-12 on `@codemirror/merge`: an `editable` input makes the proposed side editable and the component emits the edited text. The Project store's accept request carries it as optional `content` (decided in PST-01 / PST-16).
- Uses the same lossless line-separator handling as SHL-13 for the proposed side.
- Read-only mode is unchanged.

## Acceptance criteria
- [ ] With `editable`, the proposed side accepts edits and the component emits the edited text, byte-preserving untouched content.
- [ ] Without it, behaviour matches SHL-12 exactly (its tests still pass).
