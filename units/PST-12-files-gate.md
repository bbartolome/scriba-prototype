---
id: PST-12
title: Files gate — guard adoption, GET-never-mutates, M1 demo
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-03, PST-04, PST-05, PST-06, PST-07, PST-08, PST-09, PST-10, PST-11, "Setup & auth phase:token-guard (SAU-08)"]
parallel_with: []
unblocks: [PST-13, PST-15, "Agent loop tool framework and file reads (AGL-02)", "Compile & export effective order and the view model (CEX-02)", "Graph runner graph CRUD (GRR-02)", "Model providers project override API (MPR-12)", "Setup & auth first-project step (SAU-14)", "Tool registry spike gate (TRG-05)", "Tool registry try panel (TRG-16)"]
---

# PST-12 — Files gate

Merging this **closes Project store `phase:files`**. API work in PST-02…PST-08 can proceed before Setup & auth's guard exists; routes ship publicly only once this unit confirms they sit behind it.

## Scope
- Confirm every Project store route is behind Setup & auth's single global guard.
- Run Setup & auth's GET-never-mutates invariant test over every Project store GET.
- Verify the `phase:files` checklist end to end on `main`.

## Acceptance criteria (the `phase:files` checklist)
- [x] Discovery lists exactly the non-dot immediate subfolders with `project.yaml` and marks the others `importable`.
- [x] New creates the layout without `structure/` and with `.gitignore` containing `.scriba/`; Import leaves every other file byte-identical.
- [x] Start from sample copies the nonfiction sample under a chosen name; nothing is copied at startup.
- [x] The path-safety table passes **over HTTP**.
- [x] Requests naming a non-active project fail (propose is tested in PST-15); switching publishes `project-switched` after the in-process hooks.
- [x] `delete`/`move`, `updateProjectYaml` byte-identity, `edit` distinct failures, stale `baseHash` conflict, entity resolution with unknown/duplicate reporting, `too-new` listing and activation refusal all pass.
- [x] Every GET is side-effect free (Setup & auth's invariant test passes for these routes).
- [x] Unauthenticated requests to Project store routes are refused by the guard.

**M1 "done when"** (shared with the Agent loop): *the author types "summarize my outline" and gets a correct answer with visible tool calls.* The Project store's part is the file API the agent's tools call and `sources/outline.md`.

## Demo (under 5 min)
1. Picker → **Start from sample → Nonfiction**, named `demo-book`.
2. Show `demo-book/` on the host: no `structure/`, `.gitignore` lists `.scriba/`.
3. Browse `sources/outline.md` in files (read-only preview at M1).
4. With `curl`, read the file's `hash`, edit the file on the host, send a write with the old `baseHash`: write-conflict.
5. Send a `..` path: rejected.
6. In chat, "summarize my outline" (Agent loop).
