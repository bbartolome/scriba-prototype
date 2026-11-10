---
id: CEX-05
title: Preflight endpoint, result shape and the placeholders check
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-02]
parallel_with: [CEX-03, CEX-04]
unblocks: [CEX-06, CEX-07, CEX-09, CEX-10, CEX-18]
---

# CEX-05 — Preflight framework and placeholders

## Why
Preflight on demand and before every export (32), placeholders flagged with file and line (33), links to locations (40), never blocking (41), no model calls (42).

## Decisions
- `POST /api/compile-export/preflight` returns `{ranAt, revision, checks: [{id, status, findings}]}` over the **assembled manuscript files** (in effective order). Checks are pluggable; CEX-06 and CEX-07 add the other four. Every finding carries `path` and `line` (and `offset`/`length` where useful) so the UI can link to the location.
- **Placeholders (error):** contract pattern constants — whole-word `TK`, `TKTK`, `TODO`, `FIXME`, `XXX` (case-sensitive), plus unrendered `{{…}}`. Fenced and inline code are skipped. Per-project lists are out of scope.
- All checks are deterministic and **never call a model**.
- Preflight never blocks; it writes nothing.

## Acceptance criteria
- [ ] A fixture with `TK`, `TODO` in prose and `TODO` inside code reports exactly the prose occurrences with correct lines.
- [ ] A clean fixture passes.
- [ ] The mock OpenAI server receives no request during preflight.
