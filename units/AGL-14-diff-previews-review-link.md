---
id: AGL-14
title: Write-card diff previews and the review-queue link
module: agent-loop
phase: phase:pending-writes
milestone: M3
blocked_by: [AGL-07, AGL-12, "Frontend shell read-only diff (SHL-12)"]
parallel_with: [AGL-11, AGL-13, AGL-16]
unblocks: [AGL-15]
---

# AGL-14 — Diff previews

## Decisions
- `tool-call-result` for `write_file`, `edit_file` and file-producing narrative outputs carries `diffPreview {path, base, proposed}`; the card renders it with the Shell's read-only diff view (unified on phones).
- At `run-ended`, a link to `/projects/:projectId/review?run=<runId>`; refresh it on the Project store's queue-update events.

## Acceptance criteria
- [ ] Component test: a write card shows the diff; the review link appears with pending change IDs.
- [ ] Phone viewport: the diff is unified and the card collapsed by default.
