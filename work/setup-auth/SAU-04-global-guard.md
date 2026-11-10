---
id: SAU-04
title: Global default-deny guard — Host allowlist, cookie credential, Origin check, no CORS, anti-framing, identity accessor
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-02]
parallel_with: [SAU-03, SAU-05]
unblocks: [SAU-07, SAU-08, SAU-18]
---

# SAU-04 — The guard

## Why
Other websites can't reach the local port (11); unexpected Hosts are refused (12, DNS rebinding); one guard covers every module (42) with a typed identity accessor (43) and Platform-shaped errors (46).

## Decisions
- Registered as the **app's single global guard**, default for every route. **Default-deny:** a route skips the credential check only with an explicit public marker. Fixed public set: `/healthz`, the handshake endpoint, the identity endpoint (answers 401 without a credential), and the static Angular bundle (every non-`/api`, non-`/events` path). The static bundle still goes through the Host check.
- Order per request:
  1. **Host check** (all routes except `/healthz`, which the container healthcheck calls on the internal port): Host must exactly match an allowlist entry: `127.0.0.1:<SCRIBA_PORT>`, `localhost:<SCRIBA_PORT>`, plus each `SCRIBA_DEV_ORIGINS` entry's `host:port` (dev only). No wildcards, no short `scriba` name. (The tailnet name is added in SAU-18.) Failure → 403 `AUTH_HOST_REJECTED`.
  2. **Credential** on loopback Host: a valid session cookie (verify via SAU-02). A `Tailscale-User-Login` header on a loopback Host is **ignored**. Missing/invalid → 401 `AUTH_REQUIRED`.
  3. **Origin check on mutations** (every method other than GET/HEAD/OPTIONS): `Origin` must be present and equal the **full** expected origin for the Host, scheme included: `http://127.0.0.1:<port>` / `http://localhost:<port>` on loopback, plus `SCRIBA_DEV_ORIGINS` in dev. Missing or `null` → 403 `AUTH_ORIGIN_REJECTED`.
  4. **No CORS:** no response ever carries `Access-Control-*`; OPTIONS gets none, so cross-origin preflights fail.
- **Anti-framing:** every response (including static and errors) carries `Content-Security-Policy: frame-ancestors 'none'`.
- **Dev mode:** `SCRIBA_DEV_ORIGINS=http://localhost:4200` (set by `npm run dev`, never in the image) adds that origin to the Origin allowlist and `localhost:4200` to the Host allowlist. The Shell's proxy forwards Host and Origin unchanged (no `changeOrigin`).
- **Platform's guarded routes** (`/events`, version info, echo) adopt this guard; `/healthz` stays exempt.
- **Request-identity accessor** (NestJS provider/decorator) returning the contract identity shape.

## Acceptance criteria
- [ ] Without the cookie, every non-public API route returns 401 in Platform's error shape; `/events` too.
- [ ] Any Host outside the allowlist gets 403, except `/healthz`; static paths still get the Host check.
- [ ] A mutation with missing, `null`, foreign or wrong-scheme Origin gets 403.
- [ ] A loopback request with only a `Tailscale-User-Login` header gets 401.
- [ ] No response carries `Access-Control-*`; every response carries `frame-ancestors 'none'`.
- [ ] A test pins the public route set.
- [ ] With `SCRIBA_DEV_ORIGINS` set, the dev origin/Host pass; without it, they're rejected.
