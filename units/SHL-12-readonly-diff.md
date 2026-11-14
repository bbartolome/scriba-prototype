---
id: SHL-12
title: Read-only diff view on @codemirror/merge
module: shell
phase: phase:shared-components
milestone: M2
blocked_by: [SHL-09]
parallel_with: [SHL-10, SHL-11, SHL-13, SHL-17, SHL-18]
unblocks: [SHL-16, SHL-19, "Project store review queue (PST-20, M3)", "Agent loop diff previews (AGL-14)", "Project store version history UI (PST-21)", "Tool registry YAML editor and actions (TRG-14)"]
---

# SHL-12 — Read-only diff view

## Why
A clear diff of current vs proposed text (18); unified on phones, side by side on tablet/desktop (19); whitespace, line-ending and front-matter changes visible (20).

## Decisions
- Inputs: path, base text, proposed text, optional conflict flag/message. It knows nothing about pending changes — callers feed strings.
- Built on `@codemirror/merge`. Unified on phones, side by side on tablet and desktop, with a toggle override.
- Shows whitespace-only, line-ending-only and front-matter-only changes as changes; identical inputs show "no changes".
- Designed so SHL-16 can make the proposed side editable without changing the read-only API.

## Acceptance criteria
- [x] Shows insertions, deletions and changed lines for fixture pairs.
- [x] Unified on phones, side by side on tablet/desktop; the toggle overrides.
- [x] Whitespace-only, LF→CRLF-only and front-matter-only changes are visible; identical inputs show "no changes".
