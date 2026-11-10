---
id: PST-15
title: Propose, the pending-change store and per-path validator registration
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-12]
parallel_with: [PST-13, PST-14]
unblocks: [PST-16]
---

# PST-15 — Propose and the pending store

## Why
Every agent or recipe write lands in a pending queue (22), shown as a diff against its base (23) with its origin (24); pending changes live inside the project (31). The Agent loop proposes its overlay with a base it captured (45); the Graph runner proposes with a base recorded at run start (48) and registers a graph validator (49).

## Decisions
- **In-process only** `propose({projectId, path, content, base?, origin, provenance?, grounding?})` on the provider (no HTTP). `content` is always the full new file text; the module computes `diff` (unified, base vs proposed).
- **Allowed for any `ok` project**, active or not (never touches content files; lands in that project's queue), so a run stopped by a switch still files its changes.
- **Captured base:** caller-supplied `{content}` (hash computed), else the target's current disk content at first propose. Missing target → `kind: create`, `capturedBase: null`. Base and proposed are stored in full.
- **Same-origin fold:** within one origin (same `origin.kind` and `runId`, and for recipe runs the same `nodeId`), a later propose to the same target **updates** that origin's open change and keeps its **original captured base**. Different origins never merge.
- **Validation on propose:** target passes path safety and is not reserved. Content checked by per-path validators: `project.yaml` against its schema; other modules register validators by path pattern (`registerValidator(pattern, fn)` on the provider — the Graph runner registers the graph schema for `graphs/`). Failure → `PROJECT_VALIDATION_FAILED`. The Project store never imports another module's implementation.
- **Storage:** one JSON file per change in `<project>/.scriba/pending/`, sortable time-based IDs. Resolved changes move to `.scriba/pending/resolved/` (so the queue lists only open ones). All git-ignored via the scaffolded `.gitignore`.
- **Listing** the queue (GET, project-scoped, active-project check, optional `run` filter) returns open changes.
- Publishes `pending-created` (new change) / `pending-updated` (fold) with `{projectId, pendingChange}`.
- `provenance` stored verbatim (passthrough); `grounding` summary stored for the review chip.

## Acceptance criteria
- [ ] A propose never changes the target file on disk; it creates exactly one pending file and one `pending-created` event.
- [ ] A second propose to the same target from the same origin updates that change and keeps the original base; a different run creates a separate change.
- [ ] A propose naming a non-active `ok` project succeeds and lands in that project's queue.
- [ ] A caller-supplied base is used instead of disk; a missing target yields `kind: create` with `null` base.
- [ ] A proposed file failing a registered validator is refused (test with a test-registered validator for `graphs/`), as is an invalid `project.yaml` and a reserved path.
