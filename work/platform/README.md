# Platform — work units

Converted from `specs/platform.md` (deleted after conversion). Platform is **wave 0**: it lands first and owns everything shared (workspace, contracts package, API composition root, SSE stream, test harness, image, compose, installer, CI/publishing).

Each file in this folder is one committed unit of work: one PR, self-contained context, its own acceptance criteria. Units list their blockers as unit ids (`PLT-xx`) or as other modules' phases (`<Module> phase:<name>`), matching the phase vocabulary used in the remaining `specs/`.

## Phase gates (what the other specs reference)

Other specs name Platform phases as gates. A phase **closes when all its units are merged**.

| Phase (referenced as) | Milestone | Units | Closes when |
|---|---|---|---|
| `phase:scaffold` (Platform's contract phase; publishes `/platform`) | M1 | PLT-01 … PLT-11 | PLT-11 (scaffold gate) is merged |
| `phase:test-harness` | M1 | PLT-12, PLT-13 | both merged |
| `phase:image-compose` (release track) | M1 | PLT-14, PLT-15 | both merged |
| `phase:smoke` (release track) | M1 | PLT-16 | merged |
| `phase:installer` (release track) | M1 | PLT-17, PLT-18 | both merged |
| `phase:ci-publish` (release track) | M1 | PLT-19 | merged |
| `phase:examples-check` | M1 → M2 (extended through M6) | PLT-20, PLT-21, PLT-22 | PLT-22 (pack layer) merged |

**Phase naming deviation.** By convention a producer's first phase is `phase:contract`. Platform's is `phase:scaffold`, because it creates the package every slice lives in. Treat `phase:scaffold` as Platform's contract phase; it is the gate every other module's first phase names.

## Dependency graph

```
PLT-01 workspace
 ├─ PLT-02 contracts pkg + /platform slice ─┐
 ├─ PLT-03 web bootstrap ───────────────────┤
 ├─ PLT-09 boundaries lint                  │
 ├─ PLT-10 ci.yml                           │
 ├─ PLT-12 mock OpenAI server               │
 └─ PLT-04 API core (needs 02) ─┬─ PLT-05 errors + pipe
                                ├─ PLT-06 SSE /events + publisher + echo
                                ├─ PLT-07 settings.yaml migration hook
                                └─ PLT-08 tailnet-address filter
 PLT-11 scaffold gate (needs 02–10)  ══> phase:scaffold closed
 PLT-13 Playwright harness + e2e (needs 11, 12)  ══> phase:test-harness closed
 PLT-14 Dockerfile (needs 11) ─ PLT-15 compose ─ PLT-16 smoke ST-1..3 ─ PLT-17 dispenser/first install ─ PLT-18 update/rollback ─ PLT-19 publish.yml
 PLT-20 examples check M1 layer (needs 13 + Project store phase:contract)
 PLT-21 graph layer (needs 20 + Graph runner phase:contract)
 PLT-22 pack layer (needs 20 + Tool registry phase:loader-validation)
```

## Parallelism

- After PLT-01: PLT-02, PLT-03, PLT-09, PLT-10, PLT-12 run in parallel.
- After PLT-04: PLT-05, PLT-06, PLT-07, PLT-08 run in parallel (each touches its own folder under `apps/api/src/modules/platform/`; each adds its own provider to the platform module).
- The release track (PLT-14 → PLT-19) touches only Platform-owned files (`Dockerfile`, `deploy/`, `.github/workflows/publish.yml`) and runs alongside wave 1 and alongside PLT-13.
- PLT-21 and PLT-22 run in parallel once their external gates close.

## Waves (whole product)

Wave 0 is Platform. Wave 1 is Frontend shell, Setup & auth, Model providers, Project store, Tool registry and Genre packs (nonfiction); they start as soon as `phase:scaffold` closes. `phase:test-harness` follows right after, because Model providers and the Agent loop need the mock server. Wave 2 is Agent loop, Graph runner and Compile & export. Wave 3 is the fiction pack and polish. `phase:examples-check` finishes last because it waits on wave-1 and wave-2 contracts.

Milestones: **M1** walking skeleton (author types "summarize my outline" and gets a correct answer with visible tool calls), M2 tool registry, M3 review and grounding, M4 canvas, M5 compile and export, **M6** fiction pack.

## Settled decisions (do not reopen during implementation)

- **Tailnet-address filter.** Listening on all interfaces is required for Docker's loopback publish but exposes plain HTTP on `tailscale0`; the server drops peers in Tailscale ranges. Setup & auth additionally trusts `Tailscale-User-Login` only from a loopback peer (its spec implements this).
- **The events route is `/events`.** A constant, cheap to move.
- **Error codes are SCREAMING_SNAKE with a module prefix** (matches Model providers' `PROVIDER_*`).
- **Install folder is the current directory, kept outside the library,** so the app can't read `.secret`.
- **semantic-release runs inside `publish.yml`**: plan first, publish images, tag last. No GitHub App or PAT.
- **No SSE replay.** Reconnecting clients reconcile through state endpoints.
- **`settings.yaml` ownership.** Platform owns the file envelope and the eager startup hook; modules own their sections and migration steps.
- **ST-1 changes compose**, which is why smoke precedes installer: the installer ships the compose ST-1 approved.
- Cookie `Secure` on `http://127.0.0.1` is Setup & auth's to verify. Platform only guarantees one origin per access path.
- The app controls tailscaled through the shared socket; accepted for a single owner and stated in the README's security notes.

## Out of scope for Platform

- Owned by other specs: the web composition root, route table, proxy, API/SSE clients and theming after handover (Frontend shell); the setup token, guard, cookie, Origin and Host checks, GET-never-mutates test, Tailscale login UI and compose-mismatch warning UI (Setup & auth); `settings.yaml` section contents and the secrets file (Model providers, Setup & auth); lazy per-project file migrations, `examples/` content, "start from sample" and the nonfiction skeleton (Project store; later sample additions belong to Genre packs M2/M6, Agent loop M3, Graph runner M4, Compile & export M5); app-level export, the Typst quality spike and any TeX Live derived image (Compile & export).
- The manual real-model eval script (Agent loop; Genre packs adds cases).
- ST-4 userspace networking (deferred).
- LAN mode / host `0.0.0.0` publishing, a second no-sidecar compose topology, an installer UI container, auto-update or Watchtower, an "update available" notice, a CLI reset-token, per-user image layers.
- pnpm, Yarn, Nx, Turborepo, nginx, Caddy, WebSockets, OpenAPI codegen.
- Replaced proposals: Angular + Material and NestJS (not React/Vite/Fastify/Hono); always published on loopback, optionally `https://scriba.<tailnet>.ts.net` on 443 only (not "runs on localhost"); SQLite only for FTS5 (run-log index deferred, `logs/` is source of truth); tool inputs are JSON Schema not Zod (Platform's own contracts remain Zod); decisions go in `docs/adr/` (not `DECISIONS.md`).

## Testing principles (all units)

- Tests exercise external behaviour only (HTTP responses, SSE envelopes, files on disk, process exit codes, emitted scripts), never internal services or private functions. The one exception is the tailnet-address check, tested as a predicate and confirmed by ST-1.
- Vitest everywhere; NestJS via `unplugin-swc`.
- Prior art: none in this repo. Tride's (`bbartolome/tride`) `ci.yml`, `publish.yml`, `setup.sh` and installer compose are reference for structure only, as is the canvas spike's `e2e/spike.cjs`.
