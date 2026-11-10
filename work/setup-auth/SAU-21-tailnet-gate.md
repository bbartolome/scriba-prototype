---
id: SAU-21
title: Tailnet gate — socket-permission smoke test, real Serve verification, late-login check, M3 demo
module: setup-auth
phase: phase:tailnet
milestone: M3
blocked_by: [SAU-18, SAU-19, SAU-20, "Platform phase:image-compose (PLT-15)", "Platform phase:smoke (PLT-16; ST-1 outcome)"]
parallel_with: []
unblocks: []
---

# SAU-21 — Tailnet gate

Merging this **closes Setup & auth `phase:tailnet`**.

## Scope
- **Socket-permission smoke test**, run as the app's non-root UID (compose `user:` is `${SCRIBA_UID:-1000}:${SCRIBA_GID:-1000}`) on macOS (Docker Desktop) and Linux: the socket is reachable and `status` succeeds; also record whether write endpoints are allowed, for information. Add it to Platform's manual pre-release checklist next to ST-1…ST-3. **Fallback** if it fails: a sidecar entrypoint step that relaxes socket permissions; last resort, a `/setup` hint to run `docker compose logs tailscale`.
- **Real-tailnet verification** (recorded in module docs): Serve forwards the original Host (the tailnet name) to `127.0.0.1:8080`; it injects `Tailscale-User-Login` only for proxies to localhost and strips client copies; observed peer addresses match the SAU-18 assumption (else apply the dedicated-listener fallback). Align with whichever Serve variant ST-1 shipped.
- **Docs:** the app can control tailscaled through the shared socket (log out, change prefs, edit Serve config); it only reads status; a compromised app process could disconnect or re-point the node. Accepted for a single owner.

## Acceptance criteria (the `phase:tailnet` checklist)
- [ ] Without tailscaled (dev), status reads "unavailable", loopback works, and the tailnet Host is not allowed.
- [ ] LocalAPI fixture states render correctly (SAU-17, SAU-20).
- [ ] Tailnet header path, loopback-ignores-header, and `http://` Origin 403 pass (SAU-18).
- [ ] Allowlist refusal, lockout protection and loopback bypass pass (SAU-19).
- [ ] **Late login:** starting logged out, logging in through the shown link makes `https://<tailnet name>` work without restarting the app.
- [ ] The socket smoke test passes as the non-root UID on macOS and Linux, and the result is recorded.

## Demo (under 5 min)
Open settings on the Mac, click the Tailscale login link and approve. Watch the state turn `Running` and the tailnet URL appear. Open that URL on the phone, with no token, and see the review queue. Turn on the allowlist, try from a shared-in user and see the refusal, then turn it off.
