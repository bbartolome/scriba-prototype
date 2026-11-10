---
id: PST-09
title: Project picker UI, nav slot and the e2e "project from sample" step
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-03, PST-04, PST-05, PST-11, "Frontend shell phase:core"]
parallel_with: [PST-06, PST-07, PST-08, PST-10]
unblocks: [PST-12]
---

# PST-09 — Project picker UI

UI work can start against a fake API built from the PST-01 contract types as soon as Shell `phase:core` lands; it merges once its API units are in.

## Decisions
- Feature folder `apps/web/src/app/features/project-store/`, shipping a lazy `Routes` array registered with one entry in the Shell's route table.
- Route `/projects` — app-level, minimum device class `phone`.
- The picker:
  - lists projects with their status (`ok`, `invalid` with the issue, `too-new`, `importable`);
  - offers **New** (title → derived folder slug, optional genre pack), **Import** (for `importable`/`invalid`) and **Start from sample** (sample cards with title and short description; author chooses folder name and title);
  - switches the active project (activate POST);
  - shows the active project in the Shell's nav slot;
  - is usable at phone width.
- Reacts to `project-switched` from the Shell's SSE client (another device switching updates this tab).
- **Extends Platform's e2e** (PLT-13): turns on the "project from sample" step — start from the nonfiction sample through the picker and land in the project. If `phase:test-harness` hasn't closed yet, add the step in the first PR after it closes.

## Acceptance criteria
- [ ] Component tests (Angular Vitest, fake API/SSE): list with each status, New, Import with an error shown verbatim, Start from sample, switching, and an external `project-switched` updating the active marker.
- [ ] Narrow (phone) viewport test: all actions reachable.
- [ ] The e2e "project from sample" step passes against the real nonfiction sample.
