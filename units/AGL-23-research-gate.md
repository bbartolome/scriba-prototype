---
id: AGL-23
title: Research gate
module: agent-loop
phase: phase:research
milestone: M7
blocked_by: [AGL-20, AGL-21, AGL-22]
parallel_with: [AGL-24]
unblocks: []
---

# AGL-23 — Research gate

Merging this **closes Agent loop `phase:research`**.

## Acceptance criteria (the phase checklist; local test servers, never the internet; the successful fetches reach the page stub through a test-only allowance for its own address and port)
- [ ] With the setting off, the model request contains no research tools.
- [ ] With it on, a search and a fetch run against a local test server.
- [ ] Fetching loopback, private, tailnet or `host.docker.internal` addresses is refused, including after a redirect.
- [ ] Fetched text never appears as grounding evidence until it is accepted into `sources/`.
