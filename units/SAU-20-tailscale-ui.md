---
id: SAU-20
title: Tailscale step in /setup and Tailscale + allowlist sections in settings
module: setup-auth
phase: phase:tailnet
milestone: M3
blocked_by: [SAU-11, SAU-15, SAU-17]
parallel_with: [SAU-18, SAU-19]
unblocks: [SAU-21]
---

# SAU-20 — Tailscale UI

## Decisions
- Replaces the `/setup` Tailscale placeholder: shows the state (unavailable / logged out / waiting for login / running), the **login link** (`authURL`), the **tailnet URL** once `Running`, **prerequisites hints** (MagicDNS off; HTTPS certificates off when `CertDomains` is empty, pointing to the admin console), and a visible **skip** (Tailscale stays optional).
- Settings page gains: Tailscale status and login link again (reconnect after logout); the owner allowlist editor with on/off toggle and the lockout message (once SAU-19 lands; the section can ship read-only first).
- Both poll the status endpoint every few seconds while visible.

## Acceptance criteria
- [ ] Component tests (fake API) for each state: link shown for `NeedsLogin`, URL for `Running`, HTTPS hint for certs off, MagicDNS hint, "unavailable" in dev, skip.
- [ ] Allowlist toggle and lockout error rendering.
- [ ] Polling stops when the view is hidden.
