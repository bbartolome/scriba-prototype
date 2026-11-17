---
id: SAU-19
title: Owner allowlist — toggle, auto-seed, lockout protection, 403 messages
module: setup-auth
phase: phase:tailnet
milestone: M3
blocked_by: [SAU-18]
parallel_with: [SAU-16, SAU-20]
unblocks: [SAU-21]
---

# SAU-19 — Owner allowlist

## Why
People the node is shared with can't use Scriba unless added (21); the author can't lock out their current device (22).

## Decisions
- Off by default. Stored at `setupAuth.allowlist` `{enabled, logins[]}` (field-level merge).
- Turning it on when the list is empty **seeds** it with the tailnet owner's login (`ownerLogin` from SAU-17).
- A change made **over the tailnet** is refused (`SETUP_ALLOWLIST_LOCKOUT`) if it would exclude the login making it.
- When on, a tailnet login not in the list → 403 `AUTH_TAILNET_NOT_ALLOWED`.
- **Loopback cookie access ignores the allowlist**: the Mac plus the setup URL is always the way back in.
- GET/POST endpoints under `/api/setup-auth/`.

## Acceptance criteria
- [x] With the allowlist on, a login not in the list gets 403 with `AUTH_TAILNET_NOT_ALLOWED`.
- [x] Enabling from a login that wouldn't be included is refused; enabling with an empty list seeds the owner.
- [x] Loopback with a cookie still works with the allowlist on.
