---
id: SAU-07
title: Cross-module invariant tests — GET/HEAD never mutate; mutations are guarded
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-04]
parallel_with: [SAU-05, SAU-06]
unblocks: [SAU-08, "every module's 'GET is side-effect free' acceptance criterion"]
---

# SAU-07 — Invariant tests

Owned here, run in CI against the **composed** app, so they cover every module's routes automatically as modules register (stories 44, 45).

## Decisions
1. **GET/HEAD never mutate.** Enumerate every registered route. Authenticate. Fill path parameters from a seeded sample project (built in the test's temp library; tests never read `examples/`). Snapshot the library tree (paths, sizes, mtimes, hashes) and `settings.yaml`. Issue GET and HEAD to every route. Assert the snapshot is unchanged and no mutation-type SSE event was emitted. **Only exemption:** disposable derived caches — the per-project FTS index under `/books/.scriba/index/` — listed explicitly in the test.
2. **Mutations are guarded.** Every non-GET/HEAD/OPTIONS route rejects: no credential (401), foreign or missing Origin (403), unlisted Host (403). The set of public routes equals the fixed list (SAU-04).
- Route enumeration comes from the Nest router, so new modules are covered with no test edits. A module needing extra path-param seeding adds a fixture entry (documented).

## Acceptance criteria
- [ ] Both tests run in CI against the composed app and pass.
- [ ] A deliberately mutating GET in a test-only module makes test 1 fail; an unguarded test-only POST makes test 2 fail.
