---
id: GRR-12
title: Entity side list and chip drop onto entity/style ports
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-11, "Project store entity list (PST-08, via phase:files)"]
parallel_with: [GRR-08, GRR-13, GRR-14, GRR-16]
unblocks: [GRR-15, GRR-17]
---

# GRR-12 — Entity chips

## Why
Drag a chip onto an entity port with no typing (15), refused with a reason on the wrong port (16), removable (17).

## Decisions
- Side list of the project's entities (Project store entity list), searchable, grouped by type, as draggable chips; works with mouse and touch.
- Dropping a chip onto an entity or style port **pins** it in the tool node's `params`, after checking (app logic, since the library only renders JSON): port type matches (entity chip on entity port; style-profile chip on style port), the port's entity-kind filter, and that the port has **no wire**. Refusals show a short reason.
- Pinned chips can be removed from the port.

## Acceptance criteria
- [x] Dropping a matching chip pins it with no typing (saved `params` contain the reference).
- [x] Dropping on a text port, a port filtered to another kind, or a wired port is refused with a reason and the file is unchanged.
- [x] Removing a pinned chip clears it from `params`.
- [x] Drop rules are tested as the drop handler's observable outcome on the saved graph (Vitest) and as a real gesture (Playwright).
