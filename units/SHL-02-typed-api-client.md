---
id: SHL-02
title: Typed API client — Zod-parsed responses, typed errors, 401 → /setup
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-01]
parallel_with: [SHL-03, SHL-04]
unblocks: [SHL-07, SHL-08]
---

# SHL-02 — Typed API client

## Why
Features never parse errors by hand (story 38); plain-language errors with the code available (14); an expired cookie sends the author to `/setup` (13).

## Decisions
- One root service over Angular's HTTP client. Same-origin, sends credentials (the loopback cookie; the tailnet's Serve identity is implicit), adds **no auth headers**.
- Callers pass the **Zod schema** for the response from their own contract slice; the client parses and **fails loudly** on a mismatch. The Shell imports no feature slice for this.
- Non-2xx responses are parsed with Platform's base error shape into one typed error `{status, code, message, details?}`.
- A **401** from any call routes the app to `/setup` (a fixed in-app path registered by Setup & auth; the Shell doesn't import it).
- Only `get` and `post` methods; no "GET with side effects" helper, no other verbs.

## Acceptance criteria
- [ ] Returns parsed data for a valid response; a typed error (status, code, message) for a Platform error body; a distinct failure for a schema mismatch.
- [ ] A 401 navigates to `/setup`.
- [ ] Requests are same-origin with credentials and no added auth headers.
