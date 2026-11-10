---
id: SHL-01
title: Take over apps/web — app config, root route table, feature-registration pattern, dev proxy, not-found page
module: shell
phase: phase:core
milestone: M1
blocked_by: ["Platform phase:scaffold (PLT-11; web root handed over from PLT-03)"]
parallel_with: []
unblocks: [SHL-02, SHL-03, SHL-04]
---

# SHL-01 — Composition root

From this unit on, the Shell owns `apps/web`'s composition root, route table and proxy; Platform no longer edits them.

## Decisions
- **App configuration:** zoneless, standalone, signals-first; providers for the router, HTTP client, Material theme, `ngx-markdown` (configured **once at the root**, Angular sanitisation on, no raw-HTML pass-through), and placeholders for the API and SSE clients (filled by SHL-02/03).
- **Feature-registration pattern:** each feature exports standalone lazy `Routes` arrays. The root table holds **one entry per top-level path a feature owns**, whose `loadChildren` loads that feature's routes; most features own one path, some two (see the Frontend shell route table in `units/README.md`). Features add their own entries in their own PRs — adding a feature is additive. The Shell never imports feature code eagerly.
- **Route `data` type** (exported): nav label, Material icon, nav order, **minimum device class** (`phone | tablet | desktop`, default `tablet`), scope (`app | project`). App-level features mount at the top level; project-scoped ones under the Shell-owned parent `projects/:projectId/`.
- **Dev proxy** covers `/api`, `/healthz` and `/events`; the events route streams **unbuffered** (no compression, no response buffering). It forwards `Host` and `Origin` **unchanged** (no `changeOrigin`), because Setup & auth's guard checks them; `npm run dev` sets `SCRIBA_DEV_ORIGINS=http://localhost:4200` and `SCRIBA_SETUP_URL_BASE` to that origin (Platform's script).
- **Not-found page** owned by the Shell.

## Acceptance criteria
- [ ] `npm run dev` serves the Shell; through the proxy `/healthz` answers and an `EventSource` on `/events` receives `platform/hello`; `platform/echo` envelopes from `POST /api/platform/echo` arrive with no buffering delay.
- [ ] The proxy forwards Host and Origin unchanged (asserted on a request echo).
- [ ] An unknown path renders the not-found page.
- [ ] The route `data` type is exported for features.
