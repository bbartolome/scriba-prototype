---
id: MPR-11
title: /providers route and settings-ui gate
module: providers
phase: phase:settings-ui
milestone: M2
blocked_by: [MPR-09, MPR-10]
parallel_with: [MPR-12]
unblocks: [MPR-13, "Setup & auth phase:setup-flow providers embed"]
---

# MPR-11 — `/providers` route

Merging this **closes Model providers `phase:settings-ui`**.

## Decisions
- Lazy feature route `/providers` (app-level, minimum device class `phone`, nav entry) — one entry in the Shell's route table — hosting the providers panel.
- Responsive: usable on phone for checking and switching the app default over the tailnet (story 31); desktop-first otherwise.

## Acceptance criteria (the `phase:settings-ui` checklist)
- [ ] MPR-09 and MPR-10 criteria pass on `main`.
- [ ] The route is lazy-loaded, appears in nav, and is usable at phone width for switching the app default.
