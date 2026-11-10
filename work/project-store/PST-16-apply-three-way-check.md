---
id: PST-16
title: Accept/reject, three-way check on apply, eager conflict detection, versions on apply
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-15]
parallel_with: [PST-13, PST-14]
unblocks: [PST-17, PST-18, PST-19, PST-20, PST-23]
---

# PST-16 — Apply and the three-way check

## Why
Accept or reject each change (25); flag a conflict when disk no longer matches the base (26); the queue updates live everywhere (30); the previous text of a draft is saved on accept (32, 35).

## Decisions
- **Accept** (POST, active-project required) `{content?}`: three-way check — base vs. pending vs. disk:
  - disk matches the captured base (or is absent for a create) → write `content ?? proposed` atomically (edited `content` comes from the Shell's merge view);
  - otherwise flag the conflict (`base-changed`; `target-missing` when a modify target is gone; `target-exists` when a create target now exists) and refuse with `PROJECT_PENDING_CONFLICT`.
- **Reject** (POST): marks `rejected` and moves to `resolved/`.
- Accept/reject on a resolved change → `PROJECT_PENDING_NOT_OPEN`.
- **Eager conflict detection:** listing (GET) computes each change's conflict **in memory** and returns it, but never writes the pending file and never publishes. Every POST that touches the target (and the watcher, PST-19) persists a changed flag and publishes `pending-updated`.
- **Versions on apply:** applying to a **top-level file in `drafts/` that already exists** first saves the replaced content to `drafts/.versions/<draft file name>/<UTC timestamp>.<ext>` — timestamp compact ISO-8601 basic with milliseconds, numeric suffix on collision (e.g. `drafts/.versions/ch03.md/20261104T231500123Z.md`). Creating a new draft writes no version. Author direct saves write no version.
- Successful apply publishes `pending-resolved` and `files-changed`.
- Accept/reject are POSTs behind the guard.

## Acceptance criteria
- [ ] Accepting with edited `content` writes that content.
- [ ] Applying a change whose base matches disk writes the proposal and, for an existing top-level draft, writes the previous content to `drafts/.versions/<name>/…`; a new draft writes no version.
- [ ] Editing the target on the host before apply flags `base-changed` and apply is refused; deleting it flags `target-missing`; creating a create-target flags `target-exists`.
- [ ] Listing after a host edit returns the conflict but leaves `.scriba/pending/` byte-identical and publishes nothing.
- [ ] Event sequence: `pending-updated` on persisted conflict, `pending-resolved` + `files-changed` on apply, `pending-resolved` on reject.
