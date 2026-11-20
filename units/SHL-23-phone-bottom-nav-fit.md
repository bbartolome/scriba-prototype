---
id: SHL-23
title: Phone bottom nav fits ten items at 390 px
module: shell
phase: none
milestone: M4
blocked_by: [SHL-05]
parallel_with: []
unblocks: [PLT-23]
---

# SHL-23 — Phone bottom nav fit

This unit is ungated (`phase: none`), like SHL-22. It changes the nav component of SHL-05, which stays done; this unit is additive. PLT-23 waits for it.

## Why
Since commit 6deb543 (CEX-17) the Manuscript route is a phone nav item, so the phone bottom nav has ten items. At 390 px the nav and the document are 431 px wide (368 px without Manuscript), so the document overflows and three phone e2e specs fail: history-phone, review-phone and search-phone. The Navigator decided this on 2026-11-19 (`plans/DECISIONS.md`, "2026-11-19 — PLT-23 — Navigator decision (session 0d1c12bad0f542fa9e19f3ae9457cc46)").

## Decisions
- Let the bottom nav's links shrink (`min-width: 0` on `nav.bottom a`) and truncate their labels (overflow hidden, `text-overflow: ellipsis`, `white-space: nowrap`), so that all ten items stay visible at 390 px.
- No sideways scroll inside the nav. No item is hidden.
- The module route table in `modules/shell.md` is not changed, and neither are the rail and side forms or the route data of CEX-17.

## Scope
- `apps/web/src/app/shell/app-nav.ts` (the production change, in this file only): the phone bottom nav form (`nav.bottom`) and its links. One new e2e spec, `e2e/specs/nav-phone.e2e.ts`, that tests criteria 1 and 2.
- Not: the route table, the route data of any feature, the tablet and desktop forms, and the existing e2e specs.

## Acceptance criteria
- [x] With the ten phone route-table items shown, at 390 px the document has no horizontal overflow: `document.documentElement.scrollWidth <= window.innerWidth`.
- [x] At 390 px all ten phone nav links stay visible: each is shrunk with its label truncated, none is hidden, and the nav does not scroll sideways.
- [x] The three phone specs pass: `npm run e2e -w @bbartolome/scriba-e2e -- specs/history-phone.e2e.ts specs/review-phone.e2e.ts specs/search-phone.e2e.ts --trace off` exits 0.
