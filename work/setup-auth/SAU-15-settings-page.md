---
id: SAU-15
title: Settings page and user-facing recovery documentation
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-06, SAU-09, SAU-10, "Frontend shell phase:core"]
parallel_with: [SAU-11, SAU-12, SAU-13, SAU-14]
unblocks: [SAU-16, SAU-20]
---

# SAU-15 — Settings page

## Decisions
- Route `/settings` (app-level, nav entry, minimum class `phone`).
- Sections: **how this device is connected** (loopback cookie, or tailnet identity and which login); **preferences** (same fields as the step); **providers section** (embeds the Model providers panel, or links to `/providers`); **versions** (app version and compose version from Platform's version info) with the **compose-mismatch warning** and the exact update one-liner; **recovery instructions**; **re-run setup**; **sign out this browser**. (Tailscale status and allowlist sections are added in SAU-20.)
- Optionally raises the Shell notices banner for a compose mismatch/unknown.
- **Recovery** (on the page and in user docs):
  1. Re-open the setup URL: `cat ~/Books/.scriba/setup-url`, or find it in `docker compose logs scriba`.
  2. Replace a leaked token: delete `~/Books/.scriba/setup-token` and restart — a new token, a rewritten `setup-url`, every existing cookie stops working.
  3. Last resort: wipe `~/Books/.scriba/` (removes settings, secrets, search indexes; projects untouched).
  4. Allowlist locked out a tailnet device: use the Mac and the setup URL.
- The docs state plainly that the app can control tailscaled through the shared socket (accepted for a single owner).

## Acceptance criteria
- [ ] Component tests: identity variants, versions, warning shown for `mismatch`/`unknown` with the one-liner and hidden for `ok`, re-run setup navigates to `/setup`, sign out posts.
- [ ] User docs contain the recovery steps above.
