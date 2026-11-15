---
id: SAU-10
title: Compose-version mismatch status
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-08]
parallel_with: [SAU-09, SAU-11, SAU-17]
unblocks: [SAU-15]
---

# SAU-10 — Compose-version status

## Why
Notice when the install is out of date (story 39): the image updates with `docker compose pull`, but compose only changes when the installer re-runs.

## Decisions
- Compare `SCRIBA_COMPOSE_VERSION` (stamped by the installer into `.env`, passed by compose) with the expected compose version from Platform's version info (`composeVersion`).
- States: `ok`; `mismatch` with expected and actual; `unknown` when the variable is missing (as in plain `npm run dev`).
- Exposed in `GET /api/setup-auth/status` so `/setup`, the settings page and (optionally) the Shell's global banner can show it.
- The UI warning text includes the exact re-run-the-installer one-liner: `docker run --rm -e SETUP=true bbartolome/scriba | bash`.

## Acceptance criteria
- [x] Unset → `unknown`; older → `mismatch` with both values; equal → `ok`.
