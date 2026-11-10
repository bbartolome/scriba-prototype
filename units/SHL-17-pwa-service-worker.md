---
id: SHL-17
title: PWA — manifest, icons, app-shell service worker with exclusions, reload prompt after server update
module: shell
phase: phase:polish
milestone: M7
blocked_by: [SHL-09]
parallel_with: [SHL-10, SHL-11, SHL-12, SHL-13, SHL-18]
unblocks: [SHL-19]
---

# SHL-17 — PWA

## Why
Install to the home screen and open full screen (32); the installed app loads fresh code after a server update (33).

## Decisions
- Web app manifest and icons; Angular's service worker used **only to cache the app shell's static assets**.
- **Never cached:** `/api`, `/healthz`, `/events`, and `/setup` (including the token URL). Offline use is limited to a "server unreachable" page.
- Installs over the tailnet HTTPS name; loopback (`127.0.0.1`) is a secure context, so it works there too.
- The service worker checks for a new bundle and **prompts a reload** when the server was updated. This is not an "update available" check against Docker Hub (out of v1).

## Acceptance criteria
- [ ] Passes the browser's installability checks on the tailnet HTTPS URL and on loopback; opens full screen.
- [ ] With the service worker active, no request to `/api`, `/healthz`, `/events` or `/setup` is served from cache; streaming still works after install.
- [ ] After the server is updated to a new build, an open installed app prompts a reload and then runs the new bundle.
