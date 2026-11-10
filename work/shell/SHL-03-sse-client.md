---
id: SHL-03
title: SSE client — one EventSource, per-module demultiplexing, connection state, reconnect, reconcile tick
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-01]
parallel_with: [SHL-02, SHL-04]
unblocks: [SHL-06, SHL-07, SHL-08]
---

# SHL-03 — SSE client

## Why
Live tokens, cards, node statuses and queue updates (9); catch-up after the iPad sleeps (10); features subscribe only to their own events (39) and re-fetch run state in one place (40).

## Decisions
- **One native `EventSource` per tab** on Platform's events route constant, opened once at app start; relies on the cookie or Serve identity.
- Each message parsed with Platform's envelope schema `{module, type, data}`; demultiplexed by `module` into a **per-module stream/signal**. The feature parses `data` with its own slice's schemas. Unknown modules and types are **ignored and logged at debug level** (forward-compatible under expand–contract).
- **Connection state** signal: `connecting | open | reconnecting | closed`.
- **Reconnect:** native retry handles network drops. When the stream reaches `CLOSED` (e.g. after an HTTP error), recreate it with **capped backoff**, first checking `/healthz` and auth (a 401 routes to `/setup`).
- **Reconcile tick:** emitted once when the stream re-opens after a drop, when the page becomes visible (`visibilitychange`), on `online`, and on `pageshow` from the back/forward cache. Features register a reconcile callback that fetches their own "current run state" endpoint. No event replay is relied on.

## Acceptance criteria (via a stubbed global `EventSource`)
- [ ] Envelope events for module A reach only A's subscribers; unknown modules and types are ignored without error.
- [ ] Simulated drop then re-open, `visibilitychange` to visible, `online` and `pageshow` each emit exactly one reconcile tick.
- [ ] A `CLOSED` stream is recreated with capped backoff after a `/healthz` check.
- [ ] The connection-state signal transitions correctly through each case.
