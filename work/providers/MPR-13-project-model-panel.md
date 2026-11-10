---
id: MPR-13
title: "This project" model panel and the effective-model readout
module: providers
phase: phase:project-override
milestone: M2
blocked_by: [MPR-11, MPR-12]
parallel_with: []
unblocks: []
---

# MPR-13 — Project model panel

Merging this **closes Model providers `phase:project-override`**.

## Decisions
- A **"This project"** section on the `/providers` page (no separate project-settings route). Acts on the active project, read from the Project store's active-project endpoint; hidden when no project is active.
- Choose a provider + model for this project, or **"Use app default"** (clear).
- **Effective-model readout:** model, source (`project`, `app` or `auto`), and the fallback warning when present (story 25).
- Refreshes on `project-store/project-switched`.

## Acceptance criteria
- [ ] Component tests: hidden with no active project; set and clear call the override requests; readout shows each source; the deleted-provider warning is shown.
- [ ] A `project-switched` event refreshes the section.
