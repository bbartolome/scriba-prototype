---
id: PLT-03
title: Generated Angular + Material placeholder app and dev proxy
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-01]
parallel_with: [PLT-02, PLT-09, PLT-10, PLT-12]
unblocks: [PLT-11]
---

# PLT-03 — `apps/web` bootstrap

## Why
`npm run dev` must work end to end before the Frontend shell exists, and the Shell needs a generated root to take over.

## Decisions
- Platform generates the **bare Angular + Material app** (`@bbartolome/scriba-web`) and the minimal dev proxy entry for `/api`, `/healthz` and `/events`.
- **Ownership of the web composition root, route table and proxy passes to the Frontend shell at its `phase:core`.** Platform doesn't edit them after that.
- Angular uses its default Vitest runner.
- Feature folders live at `apps/web/src/app/features/<m>/` (the boundaries rule in PLT-09 covers them).
- The production bundle is served by NestJS (`@nestjs/serve-static`, PLT-04) on the same origin as `/api`; no CORS.

## Scope
- Generated Angular app with Material, one placeholder page that identifies itself (e.g. "Scriba" heading) so the e2e app-loads check (PLT-13) has something to assert.
- `proxy.conf` mapping `/api`, `/healthz`, `/events` to the API on 8080 (SSE must not be buffered by the proxy).
- An empty `src/app/features/` folder.

## Acceptance criteria
- [ ] `npm run build -w @bbartolome/scriba-web` produces a static bundle with `index.html`.
- [ ] `npm test -w @bbartolome/scriba-web` runs one passing Vitest component test of the placeholder page.
- [ ] The proxy config covers exactly `/api`, `/healthz` and `/events`.
