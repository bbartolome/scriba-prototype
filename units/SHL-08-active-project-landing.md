---
id: SHL-08
title: Active-project signal, landing redirect and project-route reconciliation
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-02, SHL-03, SHL-07, "Setup & auth phase:contract (SAU-01)", "Project store phase:contract (PST-01)"]
parallel_with: [SHL-05, SHL-06]
unblocks: [SHL-09]
---

# SHL-08 — Landing and project routes

## Decisions
- **Active-project signal** read from the `projects/:projectId` route parameter.
- **Landing (`/`):** reads Setup & auth's setup status (route constant + schema from `/setup-auth`). Not `complete` → `/setup`. Otherwise reads the Project store's active project: → `/projects/<active>/chat`, or `/projects` when none. Shows app version and health while loading.
- **Project-route reconciliation:** the server's active project is the source of truth. A `canActivate` guard on `projects/:projectId` compares the URL's id with the server's. Match → proceed. Mismatch → a **"Switch to <title>?"** page with **Switch** (POSTs the Project store's activate request, then proceeds) and **Go to the active project** (same child path under the active id).
- On a `project-store/project-switched` SSE event, every tab on a project-scoped route navigates to the same child path under the new id.
- Apart from the setup-status route and schema, the Shell imports nothing from `/setup-auth`.

## Acceptance criteria (with the fakes)
- [ ] Incomplete setup status sends `/` to `/setup`; complete with an active project → `/projects/<id>/chat`; with none → `/projects`.
- [ ] Opening `/projects/b/chat` while `a` is active shows the switch page; Switch POSTs activate and proceeds; "Go to the active project" goes to `/projects/a/chat`.
- [ ] A fake `project-switched` event moves an open `/projects/a/review` tab to `/projects/b/review`.
