---
id: SHL-20
title: Toolbar fits a 390 px phone with the connection label showing
module: shell
phase: phase:phone-toolbar
milestone: M1
blocked_by: [SHL-09]
parallel_with: []
unblocks: ["Setup & auth minimal `/setup` (SAU-06)"]
---

# SHL-20 — Phone toolbar

Merging this **closes Frontend shell `phase:phone-toolbar`**.

## Why
The review of Setup & auth's phone check (SAU-06, its C2, check (iv)) found the toolbar wider than a 390 px screen while the connection label shows. The label is `white-space: nowrap` (`shell/connection-status.ts` line 18), the theme toggle follows it in the toolbar (`app.html` lines 1 to 4), and the document is 417 px wide (REPORTED: the reviewer's measurement, `plans/DECISIONS.md`, the revision-7 review of SAU-06 and the Navigator's decision of 2026-11-14). Phones are the device class that the Shell's nav and layout serve first (SHL-05's Why, stories 2 and 4). SAU-06 waits for this unit.

## Decisions
- The toolbar keeps its three items in their order: the `Scriba` heading, the connection label and the theme toggle. The heading stays the only `h1`.
- The label shows exactly when it shows now (`reconnecting` and `closed`, SHL-06). Its texts, `role="status"` and `data-state` stay as they are (`connection-status.spec.ts` asserts them). At a phone width the label's text stays visible: on a phone it is the only sign that the connection is lost.
- The change is in the toolbar's own styles. It adds no route, no API call, no contract and no change to any feature.
- A narrower layout, if one is needed, reads the device class the Shell already provides (`data-device` on the layout, `app.html` line 6). It adds no pixel breakpoint.
- How the toolbar fits (wrapping, spacing, the toggle's size) is chosen in this unit's plan. The criterion below is the requirement.

## Scope
- `apps/web/src/app/app.html` (the toolbar's markup or styles), `apps/web/src/app/shell/connection-status.ts` (its styles) and, only if the toggle's own width needs it, `apps/web/src/app/shell/theme-toggle.ts` and its spec.
- One e2e spec file that runs the criterion.
- Not in scope: the nav (SHL-05), the notices and banner area (SHL-04, SHL-06), the wording of the labels and any new toolbar item.

## Acceptance criteria (test seam: Playwright e2e at 390 by 844)
- [ ] At 390 by 844, with the connection label showing ("Reconnecting" or "Connection lost, retrying"), the page does not scroll sideways, and the heading, the label and the theme toggle are each fully inside the viewport.
