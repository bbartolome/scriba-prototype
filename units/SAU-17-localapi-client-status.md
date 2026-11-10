---
id: SAU-17
title: Tailscale LocalAPI client and normalised status endpoint
module: setup-auth
phase: phase:tailnet
milestone: M3
blocked_by: [SAU-08]
parallel_with: [SAU-09, SAU-10, SAU-16]
unblocks: [SAU-18, SAU-20]
---

# SAU-17 — LocalAPI client and status

Built and tested against a fake LocalAPI Unix-socket server; real-tailnet verification happens in SAU-21.

## Why
The live login link in-app (15), the state (16), the tailnet URL (18), prerequisite warnings (19); no Tailscale CLI or extra privileges (48); loopback keeps working when tailscaled is missing (50).

## Decisions
- `GET /localapi/v0/status` over the Unix socket at `SCRIBA_TS_SOCKET` (default `/var/run/tailscale/tailscaled.sock`, the shared named volume; Platform's compose sets `TS_SOCKET` on the sidecar), with `Host: local-tailscaled.sock`. No Tailscale CLI in the image. The app only ever **reads** status.
- Fields read: `BackendState`; `AuthURL`; `Self.DNSName` (tailnet name, trailing dot removed); `CurrentTailnet.MagicDNSEnabled` and `CertDomains` (empty `CertDomains` = HTTPS certificates off); `Self.UserID` with the `User` map (owner login, for seeding the allowlist). The hostname is **never hard-coded** to `scriba` (Tailscale may assign `scriba-1`).
- **Normalised status** (contract shape): `available` (false when the socket is missing or the call is refused, as in plain `npm run dev`), `backendState`, `authURL`, `dnsName`, `tailnetURL` (`https://<dnsName>`), `magicDNSEnabled`, `httpsCertsEnabled`, `ownerLogin`. Cached briefly server-side; expose a rate-limited `refresh()` for the guard (SAU-18).
- `GET` Tailscale status endpoint (guarded). UIs poll it every few seconds while visible; no SSE.
- With an auth key in `.secret`, state reaches `Running` without interaction; the step shows done.
- **Test double:** a small fake Unix-socket server serving recorded payloads: logged out, `NeedsLogin` with `AuthURL`, `Running` with certs, `Running` without certs. It's the only double for tailscaled.

## Acceptance criteria
- [ ] Without a socket, status reads `available: false` and loopback access is unaffected.
- [ ] Against the fixtures: `NeedsLogin` exposes `authURL`; `Running` exposes `dnsName` (no trailing dot) and `tailnetURL`; empty `CertDomains` → `httpsCertsEnabled: false`; `ownerLogin` resolved from the `User` map.
- [ ] Repeated calls within the cache window hit the socket once.
