---
id: PST-19
title: Optional file watcher for UI refresh and conflict re-check
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-16]
parallel_with: [PST-17, PST-18, PST-23]
unblocks: [PST-22]
---

# PST-19 — Watcher

## Decisions
- Watches the active project; publishes `files-changed` (debounced) and re-checks conflict flags of open pending changes for touched targets, persisting changes and publishing `pending-updated`.
- **UI refresh only:** correctness never depends on it (files are re-read on demand; the manifest diff covers search and entities).
- Toggled by `SCRIBA_WATCHER` (default `true`) for hosts where bind-mount events are unreliable (macOS via Docker Desktop can delay or drop them).
- Re-targets on `project-switched`; stops on shutdown.

## Acceptance criteria
- [ ] With the watcher on, a host edit produces one debounced `files-changed` and, for a pending target, a `pending-updated` with the conflict.
- [ ] With `SCRIBA_WATCHER=false`, no watcher runs and all other suites still pass.
