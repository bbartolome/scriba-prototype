---
id: SAU-03
title: Token handshake, session cookie, sign-out, identity endpoint and the Secure-flag matrix
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-02]
parallel_with: []
unblocks: [SAU-04, SAU-05, SAU-08]
---

# SAU-03 — Handshake and cookie

## Why
One click signs in without a password (2); the token leaves the address bar (3); long-lived session (10); clear invalid-link page (7); sign out (13); both `localhost` and `127.0.0.1` work (14).

## Decisions
- `GET /api/setup-auth/handshake?token=…` (public): valid token → sets the session cookie and answers **303** to `/setup`, or `/` once setup is complete. Response carries `Referrer-Policy: no-referrer`; the `Location` never contains the token.
- **The handshake changes no server state** (stateless cookie), so it doesn't violate GET-never-mutates.
- Invalid token → an explanatory page ("this link is not valid") with the command to print the current URL (`cat ~/Books/.scriba/setup-url`), and no cookie.
- Cookies are issued **only on loopback Hosts**. On the tailnet name, redirect without a cookie (the tailnet identity is the credential there).
- **Attributes:** HttpOnly, SameSite=Strict, `Path=/`, no `Domain` (host-only), long `Max-Age` (≈ 400 days, browser max), port-suffixed name.
- **`Secure` flag — verify first.** Record a check in Safari, Chrome and Firefox on macOS on `http://127.0.0.1` and `http://localhost`. Expected outcome and fallback: set `Secure` only on HTTPS responses — in practice no `Secure`, since cookies are only issued on loopback. Record the matrix in the module docs.
- **SameSite=Strict and the first redirect:** the post-handshake navigation from a terminal link is cross-site and may not carry the cookie. That's fine: the static bundle needs no credential, and the SPA calls the API with same-origin `fetch`/`EventSource`, which send it. Guarded resources are only fetched by the SPA, never as top-level navigations.
- **Sign out this browser:** a POST that expires the cookie.
- **Identity endpoint** `GET /api/setup-auth/identity` (public marker, but answers 401 with no credential): `{via: 'loopback'}` or `{via: 'tailnet', login}`.

## Acceptance criteria
- [x] Opening the setup URL sets an HttpOnly, SameSite=Strict, host-only, port-suffixed cookie and 303s to `/setup` with no token in `Location`; `Referrer-Policy: no-referrer` present.
- [x] A wrong token gets the explanatory page and no cookie.
- [x] Both `127.0.0.1:<port>` and `localhost:<port>` Hosts work.
- [x] After the token is replaced, an old cookie gets 401.
- [x] Sign-out expires the cookie; the identity endpoint then returns 401.
- [ ] The `Secure` matrix is recorded in the module docs, and the cookie attributes match it.
