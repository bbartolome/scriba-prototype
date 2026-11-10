---
id: SAU-06
title: Minimal /setup page and the sign-in notice
module: setup-auth
phase: phase:token-guard
milestone: M1
blocked_by: [SAU-05, "Frontend shell phase:core (SHL-09)"]
parallel_with: [SAU-07]
unblocks: [SAU-08, SAU-11, SAU-15]
---

# SAU-06 — Minimal `/setup`

## Decisions
- Feature folder `apps/web/src/app/features/setup-auth/` with a lazy `Routes` array; registers `/setup` (no nav entry) in the Shell's route table; minimum device class `phone`.
- The page shows the current identity plus "you're in", and a **Continue** button (POST) that completes setup (SAU-05) and navigates into the app.
- **Sign-in notice** for 401s (the Shell's API client routes 401s here): on loopback, explains how to get in with the command `cat ~/Books/.scriba/setup-url` (and `docker compose logs scriba`); on the tailnet, explains identity and allowlist failures by error code.

## Acceptance criteria
- [ ] Component tests (fake API): identity shown; Continue posts and navigates; a 401 shows the loopback sign-in notice with the command; tailnet error codes show their explanations.
- [ ] Phone viewport renders all of it.
