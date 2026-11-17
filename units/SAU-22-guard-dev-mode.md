---
id: SAU-22
title: Guard dev mode — skip cookie and Origin checks for local runs
module: setup-auth
phase: none
milestone: M1
blocked_by: []
parallel_with: []
unblocks: []
---

# SAU-22 — Guard dev mode

## Why
Running the app locally with `npm run dev` requires the signed setup cookie (a handshake through the setup URL) before any API call works. A dev mode removes that step for local work without weakening the production guard.

## Decisions
- New boolean env `SCRIBA_DEV_AUTH`, parsed in `apps/api/src/modules/platform/boot/env.ts` and carried on `REQUEST_POLICY` (`request-policy.ts`, `buildRequestPolicy`) as `devAuth`. Unset means false.
- `SetupAuthGuard.canActivate` with `devAuth` true:
  - skips the cookie credential check and sets `req.identity = {via: 'loopback'}`;
  - skips the Origin check on mutations.
- Still enforced in dev mode: the Host allowlist (`hostFrameMiddleware`, the DNS-rebinding defence), no `Access-Control-*` headers, and `frame-ancestors 'none'`.
- Safety: boot fails with `BootError` (exit 1, like a malformed `SCRIBA_DEV_ORIGINS`) when `SCRIBA_DEV_AUTH` is set with `NODE_ENV=production`. A loud startup warning is logged whenever dev mode is active. The flag is never set in the image or compose files.
- The root `package.json` `dev` script sets `SCRIBA_DEV_AUTH=1` next to `SCRIBA_DEV_ORIGINS`.
- Existing guard tests (`setup-auth-guard`, `token-guard-gate`, `invariant-*`) run with the flag unset and stay unchanged, so they keep proving production behaviour.

## Acceptance criteria
- [ ] With `SCRIBA_DEV_AUTH` unset, a request without the cookie gets 401 and a mutation with a bad Origin gets 403, as before.
- [ ] With it set, a cookie-less GET to a guarded route succeeds, and a POST with no Origin succeeds.
- [ ] With it set, a Host outside the allowlist still gets 403, no response carries `Access-Control-*`, and every response carries `frame-ancestors 'none'`.
- [ ] With it set and `NODE_ENV=production`, `main.js` exits with status 1.
- [ ] `npm run dev` serves the app locally with no setup URL step.
- [ ] The README documents the flag as local-only.
