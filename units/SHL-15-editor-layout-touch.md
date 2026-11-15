---
id: SHL-15
title: Editor layout — split view with live preview, phone edit/preview toggle, tablet touch checks
module: shell
phase: phase:editor
milestone: M3
blocked_by: [SHL-11, SHL-13]
parallel_with: [SHL-14, SHL-16]
unblocks: [SHL-19, "Project store Files editor adoption (PST-34)"]
---

# SHL-15 — Editor layout and touch

## Why
Source editor with live preview on tablet/desktop (22); one-tap edit/preview toggle on phones (23); iPad touch, on-screen and hardware keyboards (29).

## Decisions
- Split view (source + SHL-11 preview) is the default on tablet and desktop; phones get an edit/preview toggle for light edits.
- Tablet touch, the on-screen keyboard and a hardware keyboard all work. No feature depends on a hardware-only shortcut (the save button covers Cmd/Ctrl-S).

## Acceptance criteria
- [ ] Tablet and desktop show the split view with a live preview; phones show the toggle.
- [ ] On a tablet viewport with touch emulation (Playwright): tap to place the cursor, select by touch, type with the on-screen keyboard, and save, all without a hardware key.
