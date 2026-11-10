---
id: SHL-04
title: Material theming (light/dark, device-local override), theme toggle, notices service
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-01]
parallel_with: [SHL-02, SHL-03]
unblocks: [SHL-05, SHL-06, SHL-09]
---

# SHL-04 — Theming and notices

## Decisions
- **Material 3** theming with light and dark schemes. Default follows `prefers-color-scheme`. A manual override is stored in **device-local storage** (devices are access points, not identities; no server-side preference).
- An exported **theme toggle component** (Setup & auth embeds it in its preferences step).
- **Notices service** (root): an app-wide banner area and snackbars. Features post notices (e.g. Setup & auth's compose-version mismatch warning); the connection indicator and the "server unreachable" banner (SHL-06) and the breakpoint "view below class" notice (SHL-05) use it. Notices can be dismissible.

## Acceptance criteria
- [ ] Light and dark themes follow the OS setting; the override persists across reloads on the same device and makes no server call.
- [ ] A feature-posted banner and snackbar render in the shared area and can be dismissed.
