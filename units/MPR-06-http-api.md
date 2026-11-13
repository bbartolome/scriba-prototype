---
id: MPR-06
title: Providers HTTP API — CRUD, presets, write-only keys, app default, model list, effective model
module: providers
phase: phase:client
milestone: M1
blocked_by: [MPR-02, MPR-03, MPR-05]
parallel_with: []
unblocks: [MPR-07, MPR-08, MPR-09]
---

# MPR-06 — HTTP API

## Decisions
Under `/api/providers/…`, behind Setup & auth's guard; bodies validated with `/providers` Zod schemas through Platform's pipe; errors in Platform's base shape.
- **GET:** list providers (read view with `keySet` + `keyHint`, never a key); presets; the app default; a provider's model list; the effective model for a project (app default / `auto` only until MPR-12).
- **POST:** create provider (optionally from a preset — a preset only pre-fills, after that it's an ordinary config); update provider; delete provider; set key (write-only; stores in the secrets file and sets `keyRef`); clear key; set app default.
- **Delete rules:** deleting the provider used by the app default is refused **409 `PROVIDER_DEFAULT_IN_USE`** until another default is chosen. Deleting a provider that project overrides use is allowed (those projects fall back with a warning). Deleting a provider deletes its secret entry.
- No SSE events.

## Acceptance criteria
- [x] A key set through the API is in the secrets file (0600 in 0700), `settings.yaml` holds only its `keyRef`, and no GET response, stdout line or error body contains the key; reads show `keySet: true` and the last four characters.
- [x] Clear key removes the secret entry and `keyRef`.
- [x] Deleting the app-default provider returns 409; after changing the default it succeeds and its secret is gone.
- [x] Every GET is side-effect free.
