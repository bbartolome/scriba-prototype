---
id: SAU-09
title: Setup-flow API — all five steps, step updates, preferences, preferences reader
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-08]
parallel_with: [SAU-10, SAU-17]
unblocks: [SAU-11, SAU-13, SAU-15, "Compile & export assembled Markdown (CEX-04)"]
---

# SAU-09 — Setup-flow API

## Why
Skip any step but the token (26); re-runs show previous answers (31) and never overwrite untouched settings (32); preferences for author name and default genre pack (28).

## Decisions
- Status tracks all five steps (`access`, `tailscale`, `providers`, `preferences`, `firstProject`) as `pending | done | skipped`, plus `complete`, set when the author finishes or explicitly skips the remaining steps. Step-update POSTs set one step's state.
- `setupAuth` section `{schemaVersion: 1, steps, complete, preferences: {authorName?, defaultGenrePack?}, allowlist: {enabled, logins[]}}`. If the shape changed from the token-guard default, register a section migration step with Platform's hook.
- **Preferences endpoints:** GET and POST (field-level merge — only fields present in the request change). Author display name is the fallback author for Compile & export's title page; default genre pack is passed to Project store's New request. Theme is device-local (Shell local storage) and never stored server-side.
- **Preferences reader** (in-process NestJS provider): read-only `{authorName, defaultGenrePack}` for other modules.
- **Idempotent re-runs:** every write is a field-level merge; nothing is ever deleted, reset or re-seeded.

## Acceptance criteria
- [x] Each step can be set `done`/`skipped`; `complete` can be set with providers and preferences skipped.
- [x] A preferences POST with only `defaultGenrePack` leaves `authorName` and every other `settings.yaml` byte unchanged outside that field.
- [x] The preferences reader returns stored values in-process.
- [x] GETs are side-effect free.
