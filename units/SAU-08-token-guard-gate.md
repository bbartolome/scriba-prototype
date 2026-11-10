---
id: SAU-08
title: Token-guard gate — e2e setup step and M1 demo
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-03, SAU-04, SAU-05, SAU-06, SAU-07]
parallel_with: []
unblocks: [SAU-09, SAU-10, SAU-17, PST-12, "every module phase that names Setup & auth phase:token-guard (Model providers phase:client, Tool registry, Graph runner phase:engine, ...)"]
---

# SAU-08 — Token-guard gate

Merging this **closes Setup & auth `phase:token-guard`**.

## Scope
- **Extend Platform's e2e** (PLT-13): the setup step reads `setup-url` from the temp library and opens it (the e2e authenticates exactly as the product does). If `phase:test-harness` hasn't closed, add it in the first PR after it closes.
- Verify the phase checklist end to end.

## Acceptance criteria (the `phase:token-guard` checklist)
- [ ] Token lifecycle (create, keep on restart, regenerate on delete → old cookies 401).
- [ ] Handshake cookie attributes and clean redirect; wrong token page.
- [ ] 401 for every non-public route without a cookie; Host 403 except `/healthz`; Origin 403 matrix.
- [ ] No `Access-Control-*`; `frame-ancestors 'none'` everywhere.
- [ ] Fresh status incomplete → `complete` after Continue; only `setupAuth` changed.
- [ ] `Secure` matrix recorded; attributes match.
- [ ] Both invariant tests pass in CI.
- [ ] The e2e setup step passes.

**Walking skeleton (M1) done when:** the author types "summarize my outline" and gets a correct answer with visible tool calls. This phase's share: the author reaches the chat only through the setup URL.

## Demo (under 5 min)
Run `npm run dev` (or the installer one-liner once Platform's release track has landed) and copy the printed URL. Open `http://127.0.0.1:8080/api/…` directly: 401. Open the setup URL: land on `/setup` with a clean address bar. Reload: still signed in. `curl -X POST` with a foreign Origin: 403. Sign out: the notice.
