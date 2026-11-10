---
id: SHL-06
title: Connection indicator and "server unreachable" banner
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-03, SHL-04]
parallel_with: [SHL-05, SHL-07, SHL-08]
unblocks: [SHL-09]
---

# SHL-06 — Connection indicator

## Decisions
- A small, unobtrusive status indicator driven by the SSE connection-state signal (shown for `reconnecting` / `closed`, hidden when `open`).
- When `/healthz` can't be reached (during recreate checks or an API network failure), a plain **"server unreachable"** banner via the notices service, cleared on recovery — never a blank page.

## Acceptance criteria
- [ ] Stopping the API shows the reconnecting indicator, then the "server unreachable" banner; restarting clears both and fires a reconcile tick.
- [ ] Component tests drive the states through the fake event source.
