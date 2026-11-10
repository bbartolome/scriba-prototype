---
id: PLT-08
title: Drop direct connections from Tailscale-range peers
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-04]
parallel_with: [PLT-05, PLT-06, PLT-07]
unblocks: [PLT-11]
---

# PLT-08 — Tailnet-address connection filter

## Why
Tailnet devices must not reach the app's plain HTTP port directly, so nothing bypasses Serve's HTTPS and identity headers (story 10).

## Decisions (settled)
- The app listens on all interfaces (required for Docker's loopback publish), which also exposes plain HTTP on `tailscale0`. The HTTP server **drops connections whose peer address is in Tailscale's ranges**: `100.64.0.0/10` and `fd7a:115c:a1e0::/48` (including IPv4-mapped IPv6 forms of the former).
- Serve proxies from `127.0.0.1`, and the loopback publish arrives from the Docker gateway, so both pass.
- Setup & auth relies on the same distinction (trusts the tailnet identity header only from a loopback peer); it implements that itself.
- ST-1 (PLT-16) records the peer addresses actually seen on both paths.
- Testing exception: socket-level faking isn't possible, so the check is tested **as a predicate**, plus a test that the filter is installed on the server's `connection` event.

## Acceptance criteria
- [ ] The predicate refuses `100.64.0.1`, `100.127.255.254`, `::ffff:100.100.1.1` and `fd7a:115c:a1e0::1`.
- [ ] The predicate accepts `127.0.0.1`, `::1`, `::ffff:127.0.0.1`, `172.17.0.1` and `100.63.255.255` / `100.128.0.0` (range edges).
- [ ] A real loopback connection to the test app is served.
