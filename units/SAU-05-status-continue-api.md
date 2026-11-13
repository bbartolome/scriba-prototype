---
id: SAU-05
title: Setup status endpoint and Continue (access-only)
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-02, SAU-03]
parallel_with: [SAU-04, SAU-07]
unblocks: [SAU-06, SAU-08]
---

# SAU-05 — Status and Continue

## Decisions
- `GET /api/setup-auth/status` returns the contract setup status. In this phase only the Access step exists: `access: done` once authenticated; the others `pending`. It carries the compose-version status (placeholder `unknown` until SAU-10 if needed, but shape-complete).
- **Continue** (POST) marks remaining `pending` steps `skipped` and sets `complete: true`, so the Shell's landing redirect lets the author into the app at M1.
- Writes are field-level merges into the `setupAuth` section only.

## Acceptance criteria
- [x] A fresh library's status is incomplete with `access: done` for an authenticated caller and other steps `pending`.
- [x] After Continue it is `complete`, and `settings.yaml` differs only in the `setupAuth` section.
- [x] Status GET is side-effect free.
