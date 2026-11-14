---
id: SHL-11
title: Markdown preview component (front matter hidden, sanitised)
module: shell
phase: phase:shared-components
milestone: M1
blocked_by: [SHL-09]
parallel_with: [SHL-10, SHL-12, SHL-13, SHL-17, SHL-18]
unblocks: [SHL-15, SHL-19, "Project store files preview (PST-10)", "Compile & export reading", "Agent loop"]
---

# SHL-11 — Markdown preview

## Why
Reading panes render cleanly without raw front matter (30) and never run scripts or raw HTML from files or agent output (31).

## Decisions
- Renders through `ngx-markdown` (root-configured in SHL-01, sanitisation on, no raw-HTML pass-through).
- Hides a leading YAML front-matter block in reading panes — display only, never written back.
- Input: Markdown string; no file I/O.

## Acceptance criteria
- [x] A draft with front matter renders without the front-matter block.
- [x] Fixtures with `<script>`, `onerror` attributes and `javascript:` links: nothing executes or renders as active HTML.
