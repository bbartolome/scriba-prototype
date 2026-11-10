---
id: MPR-12
title: Per-project model override — resolution, set/clear API, ModelChoice compatibility test
module: providers
phase: phase:project-override
milestone: M2
blocked_by: [MPR-05, MPR-08, "Project store phase:contract (PST-01)", "Project store phase:files (PST-12; file reads, updateProjectYaml from PST-07)"]
parallel_with: [MPR-09, MPR-10, MPR-11]
unblocks: [MPR-13]
---

# MPR-12 — Project override API

## Why
Override the model per book (22), saved in `project.yaml` so it travels with the book (23), with a fallback warning if its provider was deleted (24).

## Decisions
- Resolution reads the `model` field of the project's `project.yaml` through the Project store's file API (in-process provider) as the first step of the order.
- An override naming a **missing provider** falls back to the app default and returns a `warning`.
- **Set/clear** override POSTs act on the **active** project and fail with the Project store's `PROJECT_NO_ACTIVE` when none is active. They write via the Project store's in-process `updateProjectYaml` (comment-preserving, `model` key only) — an author action, not a pending change.
- Switching the active project changes what project-id resolution returns (no caching across switches; subscribe to `onProjectSwitched` if a cache exists).
- **Type-level test** asserting the Project store's `project.yaml` `model` shape is compatible with `ModelChoice`.

## Acceptance criteria
- [ ] Setting an override writes only the `model` field of `project.yaml` (other bytes untouched) and the next resolution for that project uses it (`source: 'project'`).
- [ ] Clearing it returns the project to the app default.
- [ ] An override naming a deleted provider resolves to the app default with a warning.
- [ ] Switching the active project changes the effective model.
- [ ] A `project.yaml` with no override (like the nonfiction sample) validates and resolves to the app default.
- [ ] The type-level compatibility test compiles.
