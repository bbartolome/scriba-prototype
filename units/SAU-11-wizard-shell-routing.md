---
id: SAU-11
title: /setup wizard shell, Access step, skip, completion and landing routing
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-06, SAU-09, "Frontend shell phase:core (SHL-09)"]
parallel_with: [SAU-10, SAU-15]
unblocks: [SAU-12, SAU-13, SAU-14, SAU-20]
---

# SAU-11 — Wizard shell

## Decisions
- Steps in order: **1. Access** (shows current identity), **2. Tailscale** (placeholder showing "unavailable" until SAU-20), **3. Model providers**, **4. Preferences**, **5. First project**. Every step except Access can be skipped. Finishing (or explicitly skipping the rest) sets `complete`.
- Each step loads current values as defaults and writes only fields the author changed, through the owning module's API.
- **Routing:** the SPA sends an authenticated author to `/setup` until `complete` is set (the Shell's landing route reads this module's status), and to the main app afterwards. Re-running `/setup` is always allowed.
- Works at phone width, including over the tailnet (finishing a skipped step from the phone).
- Replaces the minimal M1 page's Continue with the wizard's own completion (keeping the "skip the rest" path).

## Acceptance criteria
- [ ] Component tests (fake API): step order, skip, completion, prefilled defaults on re-run.
- [ ] Landing routing: incomplete → `/setup`; complete → app.
- [ ] Phone viewport renders and completes the flow.
