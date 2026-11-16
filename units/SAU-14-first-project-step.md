---
id: SAU-14
title: /setup First-project step
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-11, "Project store phase:contract (PST-01)", "Project store phase:files (PST-12) to run against the real API"]
parallel_with: [SAU-12, SAU-13, SAU-15]
unblocks: [SAU-16]
---

# SAU-14 — First-project step

## Decisions
- Calls the Project store API (the same endpoints its picker uses): list projects, **New** (passing the author's `defaultGenrePack`), **Import** an existing folder, **Start from sample** (samples from the Project store's baked templates and sample list).
- If projects already exist, lists them and offers to open (activate) one or create another. **Never re-creates anything.**
- Marks `firstProject` `done` when a project is active, or `skipped`.

## Acceptance criteria
- [x] Component tests (fake API): new/import/sample flows call the Project store requests with the right shapes; New carries the default genre pack.
- [x] On a re-run with existing projects, the step lists them and creates nothing unless asked.
