---
id: PST-04
title: One active project — persistence, activation, switching, not-active check
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-03]
parallel_with: [PST-05, PST-11]
unblocks: [PST-06, PST-08, PST-09, PST-12]
---

# PST-04 — Active project

## Why
Exactly one active project, remembered across restarts and identical on every device and tab (stories 12–13); agent tools confined to it (story 14).

## Decisions
- Persisted in the `projects` section of `settings.yaml` as `{schemaVersion: 1, active: <projectId> | null}` via Platform's section read/write (PLT-07).
- `GET` returns `{active}`. **Activate/switch is a POST** `{projectId}`:
  - validates `project.yaml`; a `too-new` (or `invalid`) project cannot be activated;
  - is where `project.yaml` lazy migrations will run (hook point for PST-23);
  - calls every in-process `onProjectSwitched(handler)` **synchronously before** publishing;
  - publishes `project-switched {from, to}` on Platform's stream (Agent loop and Graph runner stop their active runs via the hook).
- **Active-project check** helper used by every file-API, search, resolution and pending-change request: no active project → `PROJECT_NO_ACTIVE`; named project ≠ active → `PROJECT_NOT_ACTIVE`. Exceptions (`propose`, `appendLog`) are allowed for any `ok` project and implemented in their own units.
- `onProjectSwitched` is part of the exported provider.

## Acceptance criteria
- [ ] Activating persists to `settings.yaml`; a restarted app (new `create-test-app` on the same temp library) reports the same active id.
- [ ] Switching calls registered hooks before `project-switched` is observed on `/events`, with correct `{from, to}`.
- [ ] A `too-new` project cannot be activated (`PROJECT_SCHEMA_TOO_NEW`); an `invalid` one fails `PROJECT_INVALID`.
- [ ] A request naming a non-active project fails `PROJECT_NOT_ACTIVE`; with none active, `PROJECT_NO_ACTIVE`.
