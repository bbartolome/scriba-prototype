---
id: TRG-03
title: Angular tool-form component — form and node-body layouts, every control type, inline issues
module: tool-registry
phase: phase:form-renderer
milestone: M2
blocked_by: [TRG-01, "Frontend shell phase:core (SHL-09)"]
parallel_with: [TRG-02, TRG-08]
unblocks: [TRG-04, TRG-05, TRG-15, "Graph runner tool node (phase:canvas)"]
---

# TRG-03 — Tool-form renderer

## Why
Quick controls (8), required marks and defaults (9), messages next to fields (10); the canvas node shows typed ports with settings in its body (11), and fits inside an ngx-vflow node (45).

## Decisions
- One standalone component in `apps/web/src/app/features/tool-registry/`, Angular Material + signals, input: a **form descriptor** (and port descriptor). Exported as an Angular API for the Graph runner.
- **Two layouts:**
  - **Form:** all fields.
  - **Node body:** port rows with handles (the **Graph runner supplies the handle template** and owns wiring) plus `params` fields.
- Controls: `text`, `textarea`, `select`, `slider`, `number`, `toggle`, `entity-picker`, `style-picker` (the pickers are TRG-04; here they render a placeholder slot).
- Required marks, defaults prefilled; server-side `issues` shown inline next to their fields; emits the argument value and a submit event.

## Acceptance criteria (Vitest + Shell fakes)
- [ ] Each control type renders from a fixture descriptor and round-trips its value.
- [ ] Node-body layout shows port rows for port fields (in order) and params controls for the rest, with a supplied handle template.
- [ ] `issues` render next to their fields.
