---
id: SAU-02
title: Module skeleton, setup token, setup-url, cookie signing and the setupAuth section
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-01]
parallel_with: []
unblocks: [SAU-03, SAU-04, SAU-05]
---

# SAU-02 — Token store and setup URL

## Why
The installer finishes by printing one URL (story 1); the URL is in a private file (4) and in the logs every start (5); it keeps working (6, 8); a leaked token can be replaced (9).

## Decisions
- Module skeleton at `apps/api/src/modules/setup-auth/`, one `@Module` import in Platform's composition root.
- **Token:** generated on first start only when none exists: ≥ 256 bits from a CSPRNG, base64url. Persisted in `${SCRIBA_BOOKS_DIR}/.scriba/setup-token`, mode 0600 (directory 0700) — the same floor as the secrets file: guards against other OS users and casual reading, not strong encryption.
- **`setup-url`** (0600, single line) is **rewritten on every start** from the persisted token and `SCRIBA_SETUP_URL_BASE` (default `http://127.0.0.1:${SCRIBA_PORT}`; `npm run dev` sets it to the Angular dev-server origin). The port can change between starts, so the file is never the source of the token. The URL points at the handshake endpoint with the token as a query parameter (a fragment can't be used: the server must see it). The file's location and single-line format are the interface Platform's installer reads.
- The setup URL is printed to stdout on first start and on every later start (Docker access already means host control).
- **Cookie signing:** a stateless signed value holding the issue time; signing key derived from the setup token (HMAC with a key derived from the token). Replacing the token invalidates all cookies. Expose sign/verify for SAU-03 (issue) and SAU-04 (verify).
- **Cookie name** includes the port (cookies aren't isolated by port; other local apps on `127.0.0.1` would collide). `__Host-` can't be used (requires `Secure`).
- Tokens compared in constant time; failed attempts logged without the token value.
- Registers the **`setupAuth`** section with Platform's hook (PLT-07): version 1, default `{schemaVersion: 1, steps: {access: 'pending', tailscale: 'pending', providers: 'pending', preferences: 'pending', firstProject: 'pending'}, complete: false, preferences: {}, allowlist: {enabled: false, logins: []}}`. All writes to it are **field-level merges** via Platform's section read/write.

## Acceptance criteria
- [ ] First start creates the token (0600, dir 0700) and a 0600 `setup-url`, and prints the URL to stdout.
- [ ] A restart keeps the same token and rewrites `setup-url` with the current port.
- [ ] Deleting the token file and restarting creates a new token and a new `setup-url`.
- [ ] The token value never appears in logs other than the setup URL line.
