---
id: PLT-07
title: settings.yaml startup migration hook and section registration
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-04]
parallel_with: [PLT-05, PLT-06, PLT-08]
unblocks: [PLT-11]
---

# PLT-07 — `settings.yaml` startup migration hook

## Why
App settings must be migrated automatically at startup, with a backup (story 21); a rollback must never silently corrupt settings (story 22); and each module owns its section's shape without owning the file (story 36).

## Decisions
- Platform owns the file envelope and the eager startup hook. Modules own their sections and the steps that migrate them.
- File: `${SCRIBA_BOOKS_DIR}/.scriba/settings.yaml`. Top-level `schemaVersion` (envelope version, `1` in v1) plus one top-level section per module. **Each section carries its own `schemaVersion`** as its first key.
- Fixed section keys (from `/platform`): `projects` (Project store: active project id), `providers` (Model providers: provider configs and app default), `tools` (Tool registry: per-tool enable overrides), `agent` (Agent loop: step cap, research settings), `setupAuth` (Setup & auth: setup step status, preferences, owner allowlist).
- **Registration** through the platform module: a section key, a current version, a default value (used when absent; `null` = leave absent) and `{fromVersion → step}` migrations.
- **At boot, before listen** (after the app-state check): read the file (missing file = `{schemaVersion: 1}`). If any section is behind, write a timestamped backup next to the file (`settings.yaml.bak-<UTC timestamp>`) and apply that section's steps in order, then write atomically (temp file + rename). Unknown top-level keys are kept as is.
- A file whose envelope `schemaVersion`, or any registered section's `schemaVersion`, is **newer** than the app supports is refused: log the section and version found and how to roll back, exit non-zero.
- The hook exposes **atomic read/write of a section** to its owning module (injectable service).
- Not here: per-project files migrate lazily on open (Project store).

## Scope
- Registration API, boot hook, backup, atomic write, section read/write service, tests with a test-only section.

## Acceptance criteria
- [ ] A `settings.yaml` with a test section that's behind gets a `settings.yaml.bak-<timestamp>` backup and is migrated by that section's registered steps, in order, before `/healthz` answers.
- [ ] A missing file is treated as `{schemaVersion: 1}`; sections with non-null defaults are written; `null`-default sections stay absent.
- [ ] A file already current is not rewritten and no backup is created.
- [ ] An unknown top-level key survives a migration unchanged.
- [ ] A newer envelope `schemaVersion` and, separately, a newer section `schemaVersion` each make the app exit non-zero with a message naming the section (or envelope) and the version.
- [ ] Section write is atomic (temp file + rename) and round-trips through section read.
