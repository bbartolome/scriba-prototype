---
id: AGL-22
title: fetch_page with private-network refusals, size and time caps, untrusted marking
module: agent-loop
phase: phase:research
milestone: M7
blocked_by: [AGL-02, AGL-08]
parallel_with: [AGL-20, AGL-21, AGL-24]
unblocks: [AGL-23, AGL-26]
---

# AGL-22 — `fetch_page`

## Why
A hostile page can't steer the agent into the local network, tailnet or host services (42); fetched pages stay out of grounding (41).

## Decisions
- Offered whenever research is on. Only `http(s)`.
- **Refuses** loopback, link-local, private ranges, the tailnet CGNAT range (`100.64.0.0/10`, and `fd7a:115c:a1e0::/48`), `host.docker.internal`, and **any name that resolves to them**, checked **after every redirect** (resolve, check, then connect to the checked address).
- Caps response size and total time; returns readable text (HTML stripped to text).
- Fetched text is **marked untrusted data** in the tool result. To keep it, the agent writes it into `sources/` with `write_file` (a pending change); only then can it ground a claim.

## Acceptance criteria (local test HTTP server, never the internet; the successful fetches reach it through a test-only allowance for its own address and port)
- [ ] Fetching loopback, private, tailnet or `host.docker.internal` addresses is refused, including after a redirect into a refused range.
- [ ] Oversized and slow responses are cut off with a readable error.
- [ ] Fetched text never appears as grounding evidence until accepted into `sources/`.
