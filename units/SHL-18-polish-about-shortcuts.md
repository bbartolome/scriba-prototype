---
id: SHL-18
title: About panel, desktop keyboard shortcuts, loading skeletons, Shell empty states
module: shell
phase: phase:polish
milestone: M7
blocked_by: [SHL-09]
parallel_with: [SHL-10, SHL-11, SHL-12, SHL-13, SHL-17]
unblocks: [SHL-19]
---

# SHL-18 — Polish components

## Decisions
- **About panel:** app version from Platform's version info, health from `/healthz` (story 34).
- **Desktop keyboard shortcuts** for navigation and saving (story 35); every action also reachable without a hardware key.
- **Loading skeletons** for Shell-owned loading states; **empty states** the Shell owns (no project, no features registered, not found).

## Acceptance criteria
- [ ] The about panel shows version, revision and health.
- [ ] Documented shortcuts navigate between nav entries and trigger save in the editor.
- [ ] Component tests cover skeletons and empty states.
