---
id: SHL-10
title: Tool-call card component and view model
module: shell
phase: phase:shared-components
milestone: M1
blocked_by: [SHL-09]
parallel_with: [SHL-11, SHL-12, SHL-13, SHL-17, SHL-18]
unblocks: [SHL-19, "Graph runner inline node results (optional)", "Agent loop chat panel (AGL-07)", "Agent loop file-tools-chat gate (AGL-08)"]
---

# SHL-10 — Tool-call card

## Why
Each tool call in chat as a card with name, inputs, live status and output/error (15); collapsed on phones (16); the source files used (17).

## Decisions
- Presentational standalone component on a **Shell-local view model**: tool name; arguments (JSON shown as a key/value tree); status `pending | running | done | error`; output (Markdown via the preview component, or JSON); error text; sources used (project-relative paths); collapsed flag.
- **Collapsed by default on phones** (one-line summary, expands on tap).
- The Agent loop maps its stream events onto this model, so the Shell does **not** depend on `/agent-loop`. The Graph runner may reuse it for node results.
- Uses SHL-11's preview for Markdown output if available; otherwise plain text until SHL-11 lands (no blocking).

## Acceptance criteria
- [ ] Renders each status with tool name, arguments, output or error, and source paths.
- [ ] Collapsed by default on a phone viewport and expands on tap; expanded by default on tablet/desktop.
- [ ] A sample chat route built with the fake event source can render a run's tool calls using only the card's documented inputs.
