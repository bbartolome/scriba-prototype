---
id: SHL-09
title: Core gate — dummy lazy feature, e2e still green, M1 demo
module: shell
phase: phase:core
milestone: M1
blocked_by: [SHL-01, SHL-02, SHL-03, SHL-04, SHL-05, SHL-06, SHL-07, SHL-08]
parallel_with: []
unblocks: [SHL-10, SHL-11, SHL-12, SHL-13, SHL-17, SHL-18, "every feature UI phase naming Frontend shell phase:core"]
---

# SHL-09 — Core gate

Merging this **closes Frontend shell `phase:core`**.

## Acceptance criteria (the `phase:core` checklist)
- [ ] `npm run dev` serves the Shell; proxy, `/healthz` and unbuffered `/events` verified.
- [ ] A dummy feature registered with one route-table entry is lazy-loaded (its own chunk), shown in the nav with its label and icon, and absent from the initial bundle (checked on the build stats).
- [ ] Breakpoint gate, nav forms, API client, SSE demux, reconcile ticks, landing redirect, project-route reconciliation and theming criteria (SHL-02…SHL-08) all pass on `main`.
- [ ] The feature route-test template runs under Vitest.
- [ ] Platform's Playwright e2e still passes: its first step loads the Shell.

**M1 "done when":** *the author types "summarize my outline" and gets a correct answer with visible tool calls.* The Shell is the substrate; the Agent loop's chat route and the tool-call card (SHL-10) complete it.

## Demo (Shell part, under 5 min)
1. `npm run dev`, open the app.
2. Check the landing page's version and health.
3. Toggle dark mode and reload; the choice persists.
4. Switch dev tools to a phone viewport: the bottom nav appears and the canvas entry is hidden. Open the canvas URL directly: the "larger screen" page.
5. Stop the API: reconnecting indicator, then the "server unreachable" banner.
6. Start the API: it reconnects and fires a reconcile tick (visible in the debug log).
