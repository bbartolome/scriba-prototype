---
id: CEX-16
title: Snapshot API — create, list, restore with pre-restore snapshot, manifest, events
module: compile-export
phase: phase:manuscript-snapshots
milestone: M5
blocked_by: [CEX-03]
parallel_with: [CEX-09, CEX-10, CEX-11, CEX-12, CEX-13, CEX-14, CEX-15, CEX-17]
unblocks: [CEX-19, CEX-20]
---

# CEX-16 — Snapshots

## Why
One-click labelled snapshots (52), listed newest first (53), exact restore (54) with a pre-restore safety snapshot (55), `.versions/` untouched (56), plain folders (57).

## Decisions
- **Layout** `snapshots/<label>-<ts>/`: `label` slugified (lowercase `[a-z0-9-]`, ≤ 40 chars, `snapshot` if empty); `ts` UTC `YYYYMMDDTHHmmssZ`. Holds copies of every top-level manuscript file (same names) and `snapshot.yaml` `{schemaVersion, label, createdAt, appVersion, order, words: {body, total}}` (`order` = effective order and statuses at capture). Never includes `drafts/.versions/`, other `project.yaml` settings, or other folders. All writes through the Project store file API, file by file.
- **Create** `POST {label}` → summary; immutable once written; same label in the same second gets `-2`. Publishes `snapshot-created`.
- **List** `GET` → `{id, label, createdAt, fileCount, words}` newest first; missing/invalid manifest → listed `unreadable`, never restorable (`COMPILE_SNAPSHOT_UNREADABLE`); unknown id → `COMPILE_SNAPSHOT_NOT_FOUND`.
- **Restore** `POST {id}`: (1) take an automatic `pre-restore` snapshot; (2) write every snapshot file back to `drafts/`; (3) **delete** top-level manuscript files absent from the snapshot (the pre-restore snapshot holds them); (4) write the manifest's `order` into `project.yaml`; (5) publish `snapshot-restored` and `manuscript-updated`.
- Restore is an **author action** and writes directly (not pending changes). Pending changes targeting restored files keep their captured base, so the Project store's three-way check flags them. Restore writes no draft versions.
- Deleting snapshots in the app is out of scope.

## Acceptance criteria
- [ ] A created snapshot matches `snapshots/<label>-<ts>/` with the top-level drafts and a valid manifest; the list returns it newest first.
- [ ] Restore brings back drafts, order and statuses, removes files created after the snapshot, and creates a `pre-restore` snapshot.
- [ ] `drafts/.versions/` is byte-identical before and after restore.
- [ ] A pending change against a restored file shows as a conflict.
