---
id: PLT-06
title: Multiplexed /events SSE stream, publisher, hello, heartbeat and echo diagnostic
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-04]
parallel_with: [PLT-05, PLT-07, PLT-08]
unblocks: [PLT-11]
---

# PLT-06 — `/events` stream and publisher

## Why
Module builders need an injectable publisher that puts their events on every open stream inside the shared envelope, so nobody writes SSE plumbing (story 33). Streaming chat and run status must arrive token by token on every device, including over the tailnet (story 12).

## Decisions
- **One multiplexed stream per tab:** `GET /events`, `text/event-stream`. Commands are POSTs on module routes; nothing on the stream is a command.
- **Envelope** `{module, type, data}` from `/platform` (see PLT-02).
- **Wire format:** every envelope is a default (unnamed) SSE message whose `data:` line is the JSON envelope (one `onmessage` handler suffices). `retry: 3000` on connect. A comment heartbeat every 15 s. `Cache-Control: no-cache, no-transform`; never compressed.
- **No replay:** no `id:` lines, no `Last-Event-ID` buffer. Reconnecting tabs reconcile through module state endpoints.
- **Fan-out:** the publisher broadcasts every envelope to every open stream. Project-scoped data carries its project id so clients filter.
- **Backpressure:** if a client's write buffer passes a limit, the server closes that stream; the client reconnects and reconciles.
- **Platform members:** `platform/hello {streamId, version, serverTime}` first on every connection; `platform/echo {seq, sentAt}` broadcast by `POST /api/platform/echo {count, intervalMs}` (guarded once Setup & auth's guard lands). ST-2 and the Shell's SSE-client tests use echo to measure latency.
- **Auth:** native `EventSource` sends the cookie or rides the Serve identity; the stream is guarded like any other route once the guard exists.
- On SIGTERM, open streams are closed (hook into PLT-04's shutdown).
- The publisher is exported from the platform `@Module` (DI) — modules never import its internal file.

## Scope
- Stream controller, publisher service, hello, heartbeat, echo endpoint, backpressure close, `create-test-app` SSE helper wired to the real stream.

## Acceptance criteria
- [ ] A client on `/events` gets `platform/hello` first, preceded by `retry: 3000`.
- [ ] `POST /api/platform/echo {count:3, intervalMs:50}` delivers three `platform/echo` envelopes in `seq` order to **each of two** open streams.
- [ ] A heartbeat comment arrives at least every 15 s (fake timers or a configurable interval in test).
- [ ] Responses carry `Cache-Control: no-cache, no-transform` and no `Content-Encoding`.
- [ ] A stream whose client stops reading is closed once the buffer limit is passed; other streams keep receiving.
- [ ] No `id:` lines are ever sent.
- [ ] Every message validates against the `/platform` envelope schema.
