## Setup & auth

Setup & auth gives Scriba one way in and one guard: a reusable setup token and handshake that sets a stateless session cookie on loopback; Tailscale Serve identity on the tailnet; one default-deny global guard (Host allowlist, credential, full-Origin check on mutations, no CORS, `frame-ancestors 'none'`); the `/setup` wizard and settings page; the owner allowlist; the compose-version warning; and the cross-module GET/HEAD-never-mutate and mutation-guard invariant tests.

### Ordering

API work for `phase:token-guard` starts before Frontend shell `phase:core`; only the minimal `/setup` page (SAU-06) needs it. In `phase:tailnet`, the LocalAPI client, the tailnet guard path and the allowlist are built and tested against a fake LocalAPI socket, so they may start once `phase:token-guard` closes; only the gate (SAU-21) waits on Platform `phase:image-compose` and `phase:smoke` (ST-1 outcome) for real-tailnet verification.

### Dependency graph

```
SAU-01 contract slice  ══> phase:contract
 └─ SAU-02 module skeleton, token store, setup-url, cookie signing, setupAuth section
     └─ SAU-03 handshake, cookie issue, sign-out, identity endpoint, Secure-flag matrix
         ├─ SAU-04 global guard (default-deny, Host, cookie credential, Origin, no CORS, CSP, accessor)
         │    └─ SAU-07 cross-module invariant tests
         ├─ SAU-05 status endpoint + Continue (access-only)
         └─ SAU-06 minimal /setup page + sign-in notice   (needs 05 + Shell phase:core + SHL-20)
 SAU-08 token-guard gate (e2e setup step, demo)  ══> phase:token-guard
 SAU-09 setup-flow API (steps, preferences, preferences reader) ─┐
 SAU-10 compose-version status ──────────────────────────────────┤
 SAU-11 wizard shell + Access step + routing (needs 09, 06) ──┬─ SAU-12 providers step (Model providers phase:settings-ui to embed)
                                                              ├─ SAU-13 preferences step
                                                              └─ SAU-14 first-project step (Project store phase:contract; PST-12 to run)
 SAU-15 settings page + recovery docs (needs 09, 10, 06)
 SAU-16 setup-flow gate (e2e leg via /setup first-project, demo)  ══> phase:setup-flow
 SAU-17 LocalAPI client + normalised status (fake socket; needs 08)
  ├─ SAU-18 tailnet guard path (Host from DNSName, identity header, https Origin)
  │    └─ SAU-19 owner allowlist
  └─ SAU-20 Tailscale UI in /setup and settings (needs 11, 15)
 SAU-21 tailnet gate (socket smoke, Serve verification, docs, late login; Platform phase:image-compose + phase:smoke)  ══> phase:tailnet
```

### Parallelism
- After SAU-02: SAU-03. After SAU-03: SAU-04 and SAU-05 in parallel; SAU-06 once Shell `phase:core` and SHL-20 land; SAU-07 after SAU-04.
- After SAU-08: SAU-09, SAU-10 and SAU-17 in parallel. After SAU-11: SAU-12, SAU-13, SAU-14 in parallel; SAU-15 in parallel with SAU-11.
- After SAU-17: SAU-18 and SAU-20 in parallel.

### Cross-cutting decisions
- One vertical module: `apps/api/src/modules/setup-auth/` (NestJS `@Module`, one import in the composition root) and `apps/web/src/app/features/setup-auth/` (lazy `Routes`) with two app-level routes, `/setup` and `/settings` (both minimum device class `phone`; `/settings` has a nav entry, `/setup` doesn't). API routes under `/api/setup-auth/…`.
- **In-process exports** (NestJS providers, not contract members): the global guard with its public marker, the request-identity accessor, and a read-only preferences reader (`authorName`, `defaultGenrePack`; Compile & export's fallback author name).
- Errors use Platform's base error shape and code convention. The Shell's API client sends 401s to the sign-in notice on `/setup`.
- This module publishes **no SSE events** in v1; UIs poll.
- The identity is for display and logs only: no user table, no per-user data, never used to partition data.

### Settled decisions (do not reopen)
The token is reusable; loopback requires a cookie; the tailnet is trusted. `frame-ancestors 'none'`, port-suffixed cookie names, the stateless cookie keyed from the token (replacing the token revokes all cookies), and the peer-address check on the identity header (with a dedicated Serve listener as the fallback if ST-1 disproves it) are adopted. Where a manual check (the `Secure` matrix, the socket-permission smoke test, Serve Host preservation) could disprove an assumption, apply the named fallback and record the result instead of stopping.

### Secure-flag matrix
The check is whether each browser keeps a cookie that the server sets over plain `http` on each loopback Host. The matrix was not run, so the outcome is unknown:

| Browser | `127.0.0.1` | `localhost` | Status |
|---|---|---|---|
| Safari, macOS | not run | not run | Not run: this environment is a Linux container with Chromium only. |
| Chrome, macOS | not run | not run | Not run: the same reason. |
| Firefox, macOS | not run | not run | Not run: the same reason. |
| Firefox (Playwright build) | not run | not run | Not run: no run was made. |
| WebKit (Playwright build) | not run | not run | Not run: no run was made. |

Cookies are issued only on loopback, and they are issued without the `Secure` attribute (the handshake test for criterion 1 asserts this).

The no-`Secure` fallback is applied (module line 47). A Chromium probe, if run, is optional evidence, not a pass. No Chromium probe was run.

### Testing principles
- External behaviour only: HTTP status codes, headers, cookies, redirects, files on disk, rendered UI — never internal services, the token store or the signing helper.
- Primary seam: the composed NestJS app (Platform's `create-test-app`) against a temp library folder.
- LocalAPI seam: a small fake Unix-socket server serving recorded `status` payloads is the only test double for tailscaled.
- UI seam: lazy routes with Angular's Vitest runner against a fake API client built from `/setup-auth` contract types.
- Vitest everywhere (NestJS via `unplugin-swc`). Tride's guard is reference only; **its `http://`-only origin assumption must not be copied**.

### Out of scope
- A CLI reset-token command and in-app token rotation (deferred).
- Accounts, a user table, per-user data, read-only reviewer access (reviewers may be added later as long as no per-user identity is built in).
- LAN mode, `0.0.0.0` publishing and a plain `http://scriba` short name.
- A separate installer UI container; host bootstrap, `.env`/compose writing and the update one-liner (Platform). This module only writes `setup-url` and reads `SCRIBA_COMPOSE_VERSION`.
- Provider forms, key storage, model listing, connection test (Model providers). Project creation, import and sample templates (Project store; this module only calls them).
- An "update available" notice and auto-update.
- Tailscale userspace mode (ST-4, deferred) and auth-key management beyond what the installer writes.
- SSE events from this module.
- Replaced designs: an unauthenticated localhost-only design; React and Fastify.
