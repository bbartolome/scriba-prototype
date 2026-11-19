---
id: CEX-09
title: Assembly-preflight gate and the exported in-process service
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-02, CEX-03, CEX-04, CEX-05, CEX-06, CEX-07, CEX-08]
parallel_with: [CEX-16, CEX-17]
unblocks: [CEX-10, "Genre packs fiction-order check (GNP-19)", "Agent loop compile tools (AGL-24)"]
---

# CEX-09 — Assembly-preflight gate

Merging this **closes Compile & export `phase:assembly-preflight`**.

## Scope
- Export an in-process service from the `@Module` (manuscript view model, preflight, and — once CEX-10 lands — export) for the Agent loop's `assemble_manuscript`, `run_preflight`, `export_manuscript`.
- Guard coverage confirmed; Setup & auth's invariant tests pass for these routes.

## Acceptance criteria (the phase checklist)
- [x] CEX-02…CEX-07 criteria pass on `main`.
- [x] Each of the five checks has a fixture project that triggers it with the right check id, severity, path and line; a clean fixture passes all five.
- [x] Preflight makes no outbound HTTP call (the mock OpenAI server received no request).
- [x] The nonfiction sample started via "start from sample" returns its authored, non-alphabetical order with its statuses.
