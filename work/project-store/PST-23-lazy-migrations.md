---
id: PST-23
title: Lazy, backed-up per-file migrations with a migrator registry
module: project-store
phase: phase:migrations
milestone: M7 (required before any file kind ships schemaVersion 2)
blocked_by: [PST-16]
parallel_with: [PST-17, PST-18, PST-19, PST-20, PST-21, PST-22]
unblocks: ["Graph runner graphs/ migrators (its lazy-migration hook)", "any file kind's schemaVersion 2"]
---

# PST-23 — Migrations

Merging this **closes Project store `phase:migrations`**.

## Why
Open a project made by an older Scriba and upgrade automatically with a backup and a log entry (40); refuse newer files (41, already shipped in PST-06); keep `project.yaml` comments (42).

## Decisions
- Per-file `schemaVersion` with a **migration registry keyed by file kind and version**. The Project store owns the mechanism and the `project.yaml` migrators; other modules register migrators for their file kinds (`registerMigrator(kind, pathPattern, {fromVersion → step}, currentVersion)` on the provider; e.g. Graph runner for `graphs/`). Registering a current version also sets that kind's too-new threshold used by PST-06's refusal.
- **Lazy, POST-only:** activation (PST-04) migrates `project.yaml`; other files migrate on their first write through the module (write/edit/apply/restore) or on an owning module's POST.
- A **GET** of an older file returns an in-memory upgraded view, marked `upgraded`, and writes nothing.
- Each migration writes a backup to `<project>/.scriba/backups/<UTC timestamp>/<path>` and appends a line to `logs/migrations.log` (via `appendLog`). A migration is **not** a pending change.
- `project.yaml` migrations operate on the YAML document so comments survive.
- `settings.yaml` is out of scope (Platform's eager hook).

## Acceptance criteria
- [ ] With a test migrator (v1→v2) registered, activating a v1 project rewrites `project.yaml` to v2, writes a backup and a log line, and creates no pending change.
- [ ] A GET of a v1 file returns the upgraded view and leaves the file byte-identical.
- [ ] A file with a too-new version is refused for read and write.
- [ ] Comments in `project.yaml` survive a migration.
- [ ] A test migrator registered for another file kind runs on that file's first write.
