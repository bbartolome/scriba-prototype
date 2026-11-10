---
id: SAU-01
title: Publish @bbartolome/scriba-contracts/setup-auth
module: setup-auth
phase: phase:contract
milestone: M1
blocked_by: ["Platform phase:scaffold (PLT-11; strictly PLT-02)"]
parallel_with: ["other wave-1 contract phases"]
unblocks: [SAU-02, "Frontend shell phase:core (landing redirect reads setup status)"]
---

# SAU-01 — Contract slice

Merging this **closes Setup & auth `phase:contract`**. Zod + TS, shapes and constants only; no runtime code.

## Shapes
- **Setup status:** `{steps: {access, tailscale, providers, preferences, firstProject}: 'pending'|'done'|'skipped', complete: boolean, compose: ComposeVersionStatus}` (the compose flag lets the Shell show a global banner).
- **Token handshake:** request `{token}` (query param) and response/redirect semantics (303 to `/setup`, or `/` once complete; `Referrer-Policy: no-referrer`).
- **Identity:** `{via: 'loopback'} | {via: 'tailnet', login: string}`.
- **Tailscale status (normalised):** `{available, backendState, authURL?, dnsName?, tailnetURL?, magicDNSEnabled?, httpsCertsEnabled?, ownerLogin?}` with `backendState` enum `NoState | NeedsLogin | NeedsMachineAuth | Stopped | Starting | Running`; `dnsName` is the tailnet name with the trailing dot removed.
- **Allowlist settings:** `{enabled: boolean, logins: string[]}`.
- **Preferences:** `{authorName?, defaultGenrePack?}` (theme is device-local and not here).
- **`setupAuth` settings section:** `{schemaVersion: 1, steps, complete, preferences, allowlist}`.
- **Compose-version status:** `{state: 'ok'|'mismatch'|'unknown', expected, actual?}`.
- **Route constants** under `/api/setup-auth/`: status, continue, step updates, handshake (`GET /api/setup-auth/handshake?token=…`), identity (`GET /api/setup-auth/identity`), sign-out, Tailscale status, allowlist, preferences.
- **Error codes** (Platform convention, `AUTH_`/`SETUP_` prefixes): `AUTH_REQUIRED` (401), `AUTH_HOST_REJECTED` (403), `AUTH_ORIGIN_REJECTED` (403), `AUTH_TAILNET_IDENTITY_MISSING` (403), `AUTH_TAILNET_NOT_ALLOWED` (403), `SETUP_TOKEN_INVALID`, `SETUP_ALLOWLIST_LOCKOUT`.
- **Example payloads** for contract tests.

## Acceptance criteria
- [ ] The subpath exports every shape above and builds as part of the contracts package.
- [ ] Zod schemas accept the example payloads and reject malformed ones (wrong `BackendState`, missing login on a tailnet identity, unknown step state).
- [ ] No runtime code beyond schemas and constants.
