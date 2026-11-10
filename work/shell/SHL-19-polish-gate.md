---
id: SHL-19
title: Polish gate — accessibility pass, e2e phone-viewport check, M7 demo
module: shell
phase: phase:polish
milestone: M7
blocked_by: [SHL-10, SHL-11, SHL-12, SHL-13, SHL-14, SHL-15, SHL-16, SHL-17, SHL-18, "Project store phase:pending-review (PST-22)"]
parallel_with: []
unblocks: []
---

# SHL-19 — Polish gate

Merging this **closes Frontend shell `phase:polish`**.

## Scope
- **Accessibility pass:** labels, focus order, contrast in both themes, screen-reader-reachable controls, across nav, landing, notices, editor, diff and card.
- **Extend Platform's e2e:** a phone-viewport check that the bottom nav is shown and the review step works there.

## Acceptance criteria
- [ ] An automated accessibility check (e.g. axe via Playwright) of the Shell (nav, landing, notices, editor, diff, card) reports no serious violations in either theme.
- [ ] The e2e phone-viewport check passes.
- [ ] SHL-17 installability and cache-exclusion criteria pass on `main`.

**M7 "done when" for the Shell:** *the author installs Scriba on an iPad over the tailnet, drafts and saves a scene, and the file is byte-identical on disk to what was typed; a phone reviews and accepts a pending change from the installed app.*

## Demo (under 5 min)
1. On the iPad, open `https://scriba.<tailnet>.ts.net` and Add to Home Screen. Launch it.
2. Open a draft: the split view appears. Type a paragraph and wait for "saved".
3. On the Mac, `git diff` the file: only the paragraph changed.
4. On the phone, open the installed app: the bottom nav shows Review. Accept a pending change.
5. Toggle airplane mode on the phone and back: the indicator shows reconnecting, then current state.
