---
id: SHL-05
title: Device-class signal, breakpoint gate, deviceClassGuard and navigation (bottom/rail/side)
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-04]
parallel_with: [SHL-06, SHL-07, SHL-08]
unblocks: [SHL-09]
---

# SHL-05 — Breakpoint gate and nav

## Why
Phones get thumb nav with phone-suited views only (2, 4); tablets/desktop get a side nav (3); deep links to heavy views on phones get a clear page (5); rotating mid-task keeps the view and the unsaved text (6).

## Decisions
- **Device class** from the CDK's `Handset`, `Tablet` and `Web` query sets (orientation-aware): a phone in landscape stays `phone`; a 12.9-inch iPad in portrait counts as `desktop`. Exposed as a root signal.
- **Gate:** a `canMatch` guard on each feature entry plus nav filtering. A view whose minimum class is above the current device is hidden from nav; opening it directly shows a **"needs a larger screen" page** with a link back. Exported `deviceClassGuard(minClass)` lets features gate child routes (the canvas uses `'tablet'`).
- The gate is checked **at navigation**. An open view is **not** torn down when the class drops on resize/rotation; a dismissible notice appears instead (protects unsaved editor text).
- **Nav** built from route `data`: phone → bottom nav bar; tablet → compact side rail; desktop → expanded side nav.
- Default mapping guidance: chat, review, reading and light edits `phone`; canvas `tablet`; long-form editing is a layout switch inside `phone`-class pages.

## Acceptance criteria (driving `matchMedia` / `BreakpointObserver`)
- [x] A `tablet`-min feature is hidden from the phone nav; opening its URL on a phone viewport shows the "larger screen" page.
- [x] Resizing an open view below its class keeps it open and shows a notice.
- [x] Phone shows the bottom nav, tablet the rail, desktop the side nav.
- [x] `deviceClassGuard('tablet')` on a child route blocks phones and allows tablets.
