---
id: SAU-05
title: Setup status endpoint and Continue (access-only)
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-02]
parallel_with: [SAU-03, SAU-04]
unblocks: [SAU-06, SAU-09]
---

# SAU-05 — Status and Continue

## Decisions
- `GET /api/setup-auth/status` returns the contract setup status. In this phase only the Access step exists: `access: done` once authenticated; the others `pending`. It carries the compose-version status (placeholder `unknown` until SAU-10 if needed, but shape-complete).
- **Continue** (POST) marks remaining `pending` steps `skipped` and sets `complete: true`, so the Shell's landing redirect lets the author into the app at M1.
- Writes are field-level merges into the `setupAuth` section only.

## Acceptance criteria
- [ ] A fresh library's status is incomplete with `access: done` for an authenticated caller and other steps `pending`.
- [ ] After Continue it is `complete`, and `settings.yaml` differs only in the `setupAuth` section.
- [ ] Status GET is side-effect free.
