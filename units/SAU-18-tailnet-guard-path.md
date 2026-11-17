---
id: SAU-18
title: Tailnet guard path — tailnet Host, identity header from loopback peer, https Origin, late login
module: setup-auth
phase: phase:tailnet
milestone: M3
blocked_by: [SAU-04, SAU-17]
parallel_with: [SAU-16, SAU-20]
unblocks: [SAU-19, SAU-21]
---

# SAU-18 — Tailnet guard path

## Why
iPad and phone get in through their Tailscale identity with no pairing (20); clear messages for missing identity (23); late login works without restart (24).

## Decisions
- **Host allowlist** gains the tailnet name from `Self.DNSName` (trailing dot removed), with or without `:443`. When Tailscale is unavailable or logged out, only loopback entries apply. An unknown Host triggers **at most one rate-limited refresh** of Tailscale status before rejection, so late login works without a restart.
- **Credential on the tailnet Host:** `Tailscale-User-Login` (Serve strips client copies and injects its own). Trusted **only** when Host is the tailnet name **and** the socket's peer address is loopback (`127.0.0.1` or `::1`) — Serve proxies from `127.0.0.1` in the shared namespace, while the host's loopback publish arrives from the Docker gateway (see PLT-08, PLT-15), and Platform drops Tailscale-range peers. This stops a local non-browser process forging the header through the published port. **Fallback** if ST-1 shows published-port traffic can arrive from loopback on some Docker setup: a second, unpublished listener for Serve, with the header trusted only there.
- A tailnet request without the header → 403 `AUTH_TAILNET_IDENTITY_MISSING` explaining the device must be signed in to Tailscale as a user (tagged devices get no user identity from Serve).
- A session cookie on a tailnet Host is **not** a credential. Handshake on the tailnet Host redirects without a cookie (SAU-03).
- **Origin on tailnet mutations** must equal `https://<tailnet name>` (scheme compared).
- Identity accessor/endpoint return `{via: 'tailnet', login}`.

## Acceptance criteria
- [x] On the tailnet Host with an injected login from a loopback peer, API calls succeed with no cookie.
- [x] The same header on a loopback Host is ignored (401); on the tailnet Host from a non-loopback peer it isn't trusted.
- [x] A tailnet POST with an `http://` Origin gets 403.
- [x] A tailnet request with no header gets `AUTH_TAILNET_IDENTITY_MISSING`.
- [x] With the fake LocalAPI switching from logged-out to `Running`, a request on the new tailnet Host succeeds after one refresh, without restart; repeated unknown Hosts don't cause repeated refreshes within the rate limit.
