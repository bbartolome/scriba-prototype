---
id: PST-20
title: Review queue UI (phone-friendly, live, conflict actions)
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-16, PST-17, "Frontend shell read-only diff (SHL-12)"]
parallel_with: [PST-18, PST-19, PST-21, PST-23]
unblocks: [PST-22, "Graph runner run UI (GRR-13)"]
---

# PST-20 — Review queue UI

## Decisions
- Route `/projects/:projectId/review` (project-scoped, minimum class `phone`); `?run=<runId>` filters to one run's changes (the Agent loop links here).
- List grouped by origin run (agent run, or recipe run + output node), with conflict badges, the `grounding` chip when present, and `provenance` `entityIds` / `sourcesUsed` when present.
- Each change opens in the Shell's diff view: **read-only diff from Shell `phase:shared-components`**; adopt the `@codemirror/merge` view (edited text sent as accept `content`) once Shell `phase:editor` lands — the queue ships with the read-only diff if the merge view isn't ready.
- Actions: accept, reject, refresh, accept-anyway (with an explicit confirmation dialog).
- Live updates from `pending-created` / `pending-updated` / `pending-resolved` for the active project.
- Phone-friendly: one column, unified diff by default on narrow screens, sticky large action buttons.

## Acceptance criteria
- [x] Component tests (fake API/SSE): grouping by run, `?run=` filter, live insertion/update/removal from events, conflict badge, refresh and accept-anyway flows.
- [x] Narrow (phone) viewport test: list, diff, accept and reject work.
- [x] With the merge view present, edited text is sent as `content`.
