---
id: PLT-11
title: Scaffold gate — dev script, cross-runtime contracts boot test, end-to-end verification
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-02, PLT-03, PLT-04, PLT-05, PLT-06, PLT-07, PLT-08, PLT-09, PLT-10]
parallel_with: [PLT-12]
unblocks: [PLT-13, PLT-14, "every wave-1 module's first phase"]
---

# PLT-11 — Scaffold gate

Merging this unit **closes `phase:scaffold`** and publishes `/platform`. Every other module's first phase names this gate.

## Why
One command must give a working app with live reload (story 28), and contract subpaths must resolve in both runtimes (story 31).

## Decisions
- `npm run dev`: build contracts once, then `concurrently` runs the API in watch mode, the Angular dev server with its proxy, and `tsc --watch` on contracts. It sets `SCRIBA_DEV_ORIGINS` and `SCRIBA_SETUP_URL_BASE` to the Angular dev server's origin, and the dev library/packs/examples env defaults (see PLT-01).
- `npm run build`: contracts, then API and web.
- Boot test, Angular half: the Angular build imports every subpath (a build-time fixture) and succeeds.

## Scope
- `dev` script and `concurrently`; the Angular-build subpath boot test; README "getting started" for module builders (how to add a module: contract slice, one-line `@Module` import, route prefix, publisher, error codes, settings section, `create-test-app`).

## Acceptance criteria (the `phase:scaffold` checklist)
- [ ] On a fresh clone, `npm ci && npm run dev` serves the placeholder web app through the Angular dev server; `/api`, `/healthz` and `/events` are proxied to the API (SSE unbuffered).
- [ ] `npm run build`, `npm test` and `npm run lint` pass from the root and cover every workspace.
- [ ] All ten contract subpaths resolve in both the API runtime and the Angular build; no root barrel.
- [ ] PLT-04 … PLT-09 acceptance criteria all still pass on `main`.
- [ ] `ci.yml` is green on this PR.

## Demo (under 5 minutes)
1. `npm ci && npm run dev`, open the dev URL, see the placeholder app.
2. `curl localhost:8080/healthz`.
3. `curl -N localhost:8080/events` shows `platform/hello`; in another terminal `curl -X POST …/api/platform/echo -d '{"count":3,"intervalMs":500}'` and three echo envelopes stream in.
4. Copy a `settings.yaml` with a high `schemaVersion` into the dev library, restart, see the refusal message.
