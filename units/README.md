# Scriba — units of work

Every file in this folder is one **unit of work**: one PR with self-contained context and its own acceptance criteria. The units replace the per-module specs (`specs/*.md`, deleted after conversion). This README is the single index: the shared conventions first, then one section per module with its ordering notes, dependency graph, parallelism and the decisions every unit in that module inherits.

## Modules

| Prefix | Module (as named in blockers) | Slug (contracts subpath, `/api/<slug>/…`, `features/<slug>/`) | Wave | Milestones |
|---|---|---|---|---|---|
| `PLT` | Platform | `platform` | 0 | M1–M2 (examples check through M6) |
| `SHL` | Frontend shell | `shell` (no API, no events, empty slice) | 1 | M1–M3, M7 |
| `SAU` | Setup & auth | `setup-auth` | 1 | M1–M3 |
| `MPR` | Model providers | `providers` (UI route `/providers`) | 1 | M1–M2 |
| `PST` | Project store | `project-store` | 1 | M1–M3, M7 |
| `TRG` | Tool registry | `tool-registry` | 1 | M2 |
| `GNP` | Genre packs | `genre-packs` (content only, empty slice) | 1 (nonfiction), 3 (fiction) | M2, M6, M7 |
| `AGL` | Agent loop | `agent-loop` | 2 | M1–M3, M7 |
| `GRR` | Graph runner | `graph-runner` | 2 (contract in wave 1) | M4 |
| `CEX` | Compile & export | `compile-export` | 2 | M5 |

## Waves and milestones

Wave 0 is Platform. Wave 1 is Frontend shell, Setup & auth, Model providers, Project store, Tool registry and Genre packs (nonfiction); they start as soon as Platform `phase:scaffold` closes. Platform `phase:test-harness` follows right after, because Model providers and the Agent loop need the mock server. Wave 2 is Agent loop, Graph runner and Compile & export (Graph runner's and Compile & export's contracts land early). Wave 3 is the fiction pack and polish. Platform `phase:examples-check` finishes last because it waits on wave-1 and wave-2 contracts.

| Milestone | Outcome |
|---|---|
| **M1** | Walking skeleton: the author types "summarize my outline" and gets a correct answer with visible tool calls |
| M2 | Tool registry, nonfiction workhorses, setup flow, provider settings, search |
| M3 | Review (pending changes) and grounding; phone review over the tailnet; editor |
| M4 | Canvas (story graphs and recipes) |
| M5 | Compile and export |
| **M6** | Fiction pack |
| M7 | Research and compile tools for the agent, remaining tool shapes, lazy migrations, PWA and polish |

## Unit file format

File name `<ID>-<slug>.md`, where `<ID>` is `<PREFIX>-<nn>`. Every unit has the same front matter, in this order:

```yaml
---
id: PST-10                      # matches the file name
title: One-line summary of the PR
module: project-store           # module slug
phase: phase:files              # the phase gate this unit belongs to (`none` if ungated)
milestone: M1                   # M<n>, optionally with a short timing note in parentheses
blocked_by: [PST-06, "Frontend shell phase:core (SHL-09)"]
parallel_with: [PST-07, PST-08]
unblocks: [PST-12, PST-14]
---
```

Then `# <ID> — <short title>` and these sections, in this order, each only when it applies:

- **Why** — the user stories the unit serves (numbers refer to the original spec's stories).
- **Decisions** — settled design for this unit. Some units add topic sections (e.g. **Shapes** in contract slices, **Spec** for a Genre packs tool spec, or named algorithm sections).
- **Scope** — what the PR contains, when that isn't obvious from the decisions.
- **Demo** — the milestone demo script (gate units).
- **Acceptance criteria** — a checklist; a parenthetical on the heading names the test seam when it differs from the module's default.

## Blocker notation

- A bare id (`PST-06`) is a unit; it must be merged.
- An external dependency is a quoted string `"<Module> phase:<name> (<gate unit>[; note])"`, e.g. `"Project store phase:files (PST-12)"`. The phase is closed when its gate unit is merged.
- When only part of a phase is needed, name the unit instead: `"Frontend shell read-only diff (SHL-12)"`, `"Project store propose (PST-15)"`.
- `parallel_with` and `unblocks` may also name things that aren't units (`"wave-1 modules"`, `"Agent loop M1 demo"`); they are informative only.

## Phase gates

A phase **closes when its gate unit is merged** (the gate is the phase's last unit and waits on the rest; Frontend shell's `phase:shared-components` and `phase:editor` have no gate unit and close when all their units are merged). By convention a producer's first phase is `phase:contract`, a single unit that publishes the module's slice of `@bbartolome/scriba-contracts` (Platform's is `phase:scaffold`; Frontend shell and Genre packs have none). Inside a phase, units wait only on what they use, so many start before the previous phase's gate closes; each module's **ordering note** lists the cases.

| Module | Phase | Milestone | Units | Gate | Notes |
|---|---|---|---|---|---|
| Platform | `phase:scaffold` | M1 | PLT-01 … PLT-11 | PLT-11 | Platform's contract phase; publishes `/platform`. Every module's first phase names it |
| Platform | `phase:test-harness` | M1 | PLT-12, PLT-13 | PLT-13 | Mock OpenAI server and Playwright e2e harness |
| Platform | `phase:image-compose` | M1 | PLT-14, PLT-15 | PLT-15 | Release track |
| Platform | `phase:smoke` | M1 | PLT-16 | PLT-16 | Release track; ST-1 outcome may change compose |
| Platform | `phase:installer` | M1 | PLT-17, PLT-18 | PLT-18 | Release track |
| Platform | `phase:ci-publish` | M1 | PLT-19 | PLT-19 | Release track |
| Platform | `phase:examples-check` | M1 → M2 (extended through M6) | PLT-20 … PLT-22 | PLT-22 | |
| Frontend shell | `phase:core` | M1 | SHL-01 … SHL-09 | SHL-09 | The gate every feature UI names |
| Frontend shell | `phase:shared-components` | M1, M2 | SHL-10 … SHL-12 | all three | Card and preview may merge first and are usable at M1; read-only diff at M2. Consumers adopt each component as soon as its unit merges |
| Frontend shell | `phase:editor` | M3 | SHL-13 … SHL-16 | all four | |
| Frontend shell | `phase:polish` | M7 | SHL-17 … SHL-19 | SHL-19 | |
| Setup & auth | `phase:contract` | M1 | SAU-01 | SAU-01 | |
| Setup & auth | `phase:token-guard` | M1 | SAU-02 … SAU-08 | SAU-08 | "Setup & auth minimal token" |
| Setup & auth | `phase:setup-flow` | M2 | SAU-09 … SAU-16 | SAU-16 | |
| Setup & auth | `phase:tailnet` | M3 | SAU-17 … SAU-21 | SAU-21 | Phone review over the tailnet |
| Model providers | `phase:contract` | M1 | MPR-01 | MPR-01 | |
| Model providers | `phase:client` | M1 | MPR-02 … MPR-08 | MPR-08 | Ollama default works |
| Model providers | `phase:settings-ui` | M2 | MPR-09 … MPR-11 | MPR-11 | |
| Model providers | `phase:project-override` | M2 | MPR-12, MPR-13 | MPR-13 | |
| Project store | `phase:contract` | M1 | PST-01 | PST-01 | |
| Project store | `phase:files` | M1 | PST-02 … PST-12 | PST-12 | |
| Project store | `phase:search` | M2 | PST-13, PST-14 | PST-14 | |
| Project store | `phase:pending-review` | M3 | PST-15 … PST-22 | PST-22 | |
| Project store | `phase:migrations` | M7 | PST-23 | PST-23 | Required before any file kind ships `schemaVersion` 2 |
| Tool registry | `phase:contract` | M2 | TRG-01 | TRG-01 | |
| Tool registry | `phase:form-renderer` | M2 | TRG-02 … TRG-05 | TRG-05 | Spike; deliberately first |
| Tool registry | `phase:loader-validation` | M2 | TRG-06, TRG-07, TRG-09 … TRG-11 | TRG-11 | |
| Tool registry | `phase:executor` | M2 | TRG-08, TRG-12 | TRG-12 | |
| Tool registry | `phase:editor-ui` | M2 | TRG-13 … TRG-17 | TRG-17 | |
| Genre packs | `phase:core-propose-graph` | M2 | GNP-01 … GNP-05 | GNP-05 | propose_graph demoed at M4 and M7 |
| Genre packs | `phase:nonfiction-workhorses` | M2 | GNP-06 … GNP-12 | GNP-12 | |
| Genre packs | `phase:fiction` | M6 | GNP-13 … GNP-19 | GNP-19 | |
| Genre packs | `phase:remaining-shapes` | M7 | GNP-20 … GNP-24 | GNP-24 | |
| Agent loop | `phase:contract` | M1 | AGL-01 | AGL-01 | |
| Agent loop | `phase:file-tools-chat` | M1 | AGL-02 … AGL-08 | AGL-08 | |
| Agent loop | `phase:narrative-tools` | M2 | AGL-09 … AGL-11 | AGL-11 | |
| Agent loop | `phase:pending-writes` | M3 | AGL-12 … AGL-15 | AGL-15 | |
| Agent loop | `phase:grounding` | M3 | AGL-16 … AGL-20 | AGL-20 | |
| Agent loop | `phase:research` | M7 | AGL-21 … AGL-23 | AGL-23 | |
| Agent loop | `phase:compile-tools` | M7 | AGL-24 | AGL-24 | |
| Graph runner | `phase:contract` | M4 (lands in wave 1) | GRR-01 | GRR-01 | |
| Graph runner | `phase:engine` | M4 | GRR-02 … GRR-08 | GRR-08 | |
| Graph runner | `phase:canvas` | M4 | GRR-09 … GRR-17 | GRR-17 | Milestone demo |
| Compile & export | `phase:contract` | M5 (lands early in wave 2) | CEX-01 | CEX-01 | |
| Compile & export | `phase:assembly-preflight` | M5 | CEX-02 … CEX-09 | CEX-09 | Assembly order needed by Genre packs' fiction gate |
| Compile & export | `phase:export` | M5 | CEX-10 … CEX-15 | CEX-15 | |
| Compile & export | `phase:manuscript-snapshots` | M5 | CEX-16 … CEX-20 | CEX-20 | Milestone demo |

Ungated: AGL-25 (manual real-model eval script), which lands right after Agent loop `phase:file-tools-chat`.

## Conventions shared by every module

- **Module shape:** one NestJS `@Module` at `apps/api/src/modules/<slug>/`, registered with one import in Platform's composition root; one lazy `Routes` array at `apps/web/src/app/features/<slug>/`. Platform's boundaries lint (PLT-09) bans cross-module implementation imports; modules talk through contract types and exported in-process providers.
- **HTTP:** routes under `/api/<slug>/…`, behind Setup & auth's global guard. Reads are `GET` and never mutate; every command is a `POST`; no other verbs.
- **Errors:** Platform's base shape `{error: {code, message, details?}}`; codes are SCREAMING_SNAKE with the module's prefix (`PLATFORM_`, `SETUP_`/`AUTH_`, `PROVIDER_`, `PROJECT_`, `TOOL_`, `AGENT_`, `GRAPH_`, `COMPILE_`).
- **Events:** Platform's SSE envelope `{module, type, data}` on `/events`; no replay — reconnecting clients reconcile through state endpoints.
- **`settings.yaml`:** Platform owns the envelope and the startup migration hook (PLT-07); each module owns its section (`projects`, `providers`, `tools`, `agent`, `setupAuth`) and its migration steps.
- **Contracts** change by expand–contract once published. Persisted formats carry their own `schemaVersion`.
- **Agent and recipe changes to book content** always become pending changes (Project store); the author's own typing saves directly. The app's own records (e.g. `logs/`) are written directly.
- **Decisions** are recorded as ADRs in `docs/adr/`.
- **Testing:** external behaviour only (HTTP responses, SSE events, files on disk, rendered UI, what the mock model received), never internal services or private helpers. Vitest everywhere (NestJS via `unplugin-swc`). API tests boot the composed app with Platform's `create-test-app` against a temp library (and Platform's mock OpenAI server when a model is involved); UI tests render lazy routes with Angular's Vitest runner against the Shell's fakes (SHL-07). Unit tests never read `examples/`. Real models are checked only by the Agent loop's manual eval script (AGL-25), never in CI.


---

## Platform

Platform is **wave 0**: it lands first and owns everything shared (workspace, contracts package, API composition root, SSE stream, test harness, image, compose, installer, CI/publishing).

### Dependency graph

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

### Parallelism

- After PLT-01: PLT-02, PLT-03, PLT-09, PLT-10, PLT-12 run in parallel.
- After PLT-04: PLT-05, PLT-06, PLT-07, PLT-08 run in parallel (each touches its own folder under `apps/api/src/modules/platform/`; each adds its own provider to the platform module).
- The release track (PLT-14 → PLT-19) touches only Platform-owned files (`Dockerfile`, `deploy/`, `.github/workflows/publish.yml`) and runs alongside wave 1 and alongside PLT-13.
- PLT-21 and PLT-22 run in parallel once their external gates close.

### Settled decisions (do not reopen)

- **Tailnet-address filter.** Listening on all interfaces is required for Docker's loopback publish but exposes plain HTTP on `tailscale0`; the server drops peers in Tailscale ranges. Setup & auth additionally trusts `Tailscale-User-Login` only from a loopback peer (SAU-18 implements this).
- **The events route is `/events`.** A constant, cheap to move.
- **Error codes are SCREAMING_SNAKE with a module prefix** (matches Model providers' `PROVIDER_*`).
- **Install folder is the current directory, kept outside the library,** so the app can't read `.secret`.
- **semantic-release runs inside `publish.yml`**: plan first, publish images, tag last. No GitHub App or PAT.
- **No SSE replay.** Reconnecting clients reconcile through state endpoints.
- **`settings.yaml` ownership.** Platform owns the file envelope and the eager startup hook; modules own their sections and migration steps.
- **ST-1 changes compose**, which is why smoke precedes installer: the installer ships the compose ST-1 approved.
- Cookie `Secure` on `http://127.0.0.1` is Setup & auth's to verify. Platform only guarantees one origin per access path.
- The app controls tailscaled through the shared socket; accepted for a single owner and stated in the README's security notes.

### Out of scope

- Owned by other modules: the web composition root, route table, proxy, API/SSE clients and theming after handover (Frontend shell); the setup token, guard, cookie, Origin and Host checks, GET-never-mutates test, Tailscale login UI and compose-mismatch warning UI (Setup & auth); `settings.yaml` section contents and the secrets file (Model providers, Setup & auth); lazy per-project file migrations, `examples/` content, "start from sample" and the nonfiction skeleton (Project store; later sample additions belong to Genre packs M2/M6, Agent loop M3, Graph runner M4, Compile & export M5); app-level export, the Typst quality spike and any TeX Live derived image (Compile & export).
- The manual real-model eval script (Agent loop; Genre packs adds cases).
- ST-4 userspace networking (deferred).
- LAN mode / host `0.0.0.0` publishing, a second no-sidecar compose topology, an installer UI container, auto-update or Watchtower, an "update available" notice, a CLI reset-token, per-user image layers.
- pnpm, Yarn, Nx, Turborepo, nginx, Caddy, WebSockets, OpenAPI codegen.
- Replaced proposals: Angular + Material and NestJS (not React/Vite/Fastify/Hono); always published on loopback, optionally `https://scriba.<tailnet>.ts.net` on 443 only (not "runs on localhost"); SQLite only for FTS5 (run-log index deferred, `logs/` is source of truth); tool inputs are JSON Schema not Zod (Platform's own contracts remain Zod); decisions go in `docs/adr/` (not `DECISIONS.md`).

### Testing principles

- Tests exercise external behaviour only (HTTP responses, SSE envelopes, files on disk, process exit codes, emitted scripts), never internal services or private functions. The one exception is the tailnet-address check, tested as a predicate and confirmed by ST-1.
- Vitest everywhere; NestJS via `unplugin-swc`.
- Prior art: none in this repo. Tride's (`bbartolome/tride`) `ci.yml`, `publish.yml`, `setup.sh` and installer compose are reference for structure only, as is the canvas spike's `e2e/spike.cjs`.


---

## Frontend shell

The Shell is the Angular 22 + Angular Material web app's composition root and shared UI kit. It owns `apps/web`'s root (app configuration, lazy route table, dev proxy — handed over from Platform's PLT-03) and gives every feature: a typed API client, one multiplexed SSE client per tab with reconnect and reconcile ticks, theming, navigation, a breakpoint gate, a notices service, shared components (tool-call card, diff view, Markdown preview, lossless CodeMirror 6 editor, editable merge view) and test doubles. At M7 it adds PWA install and polish.

The Shell publishes **no contract slice** (`/shell` stays empty): its shared pieces are Angular APIs, versioned with the app.

### Ordering

Consumers may adopt an individual component as soon as its unit merges (e.g. the Agent loop uses the tool-call card from SHL-10; the Tool registry's Compare uses the read-only diff from SHL-12; the Project store review queue adopts the merge view from SHL-16).

The spec made phases serial. Gates are unchanged, but units wait only on what they use: the editor wrapper (SHL-13) and the merge view (SHL-16) need the core gate plus the relevant shared component, not each other; PWA and polish work (SHL-17, SHL-18) may start after the core gate, but the polish gate (SHL-19) waits for the editor phase because its accessibility pass covers the editor.

### Dependency graph

```
SHL-01 composition root, route table + registration pattern, dev proxy, not-found
 ├─ SHL-02 typed API client
 ├─ SHL-03 SSE client (demux, connection state, reconnect, reconcile tick)
 ├─ SHL-04 theming + theme toggle + notices service
 │    ├─ SHL-05 device class, breakpoint gate, nav (bottom/rail/side)
 │    └─ SHL-06 connection indicator + server-unreachable banner (needs 03)
 └─ SHL-07 test doubles: fake API client + fake event source (needs 02, 03)
       └─ SHL-08 active project, landing redirect, project-route reconciliation (needs 02, 03; SAU-01, PST-01)
 SHL-09 core gate (dummy lazy feature, e2e, demo)  ══> phase:core
 SHL-10 tool-call card │ SHL-11 Markdown preview │ SHL-12 read-only diff   ══> phase:shared-components
 SHL-13 editor wrapper, lossless round trip (needs 09, PST-01)
  ├─ SHL-14 saving, save state, conflict, unsaved guards
  └─ SHL-15 split view / phone toggle + touch checks (needs 11)
 SHL-16 editable merge view (needs 12)                                  ══> phase:editor (13–16)
 SHL-17 PWA manifest, service worker, reload prompt (needs 09)
 SHL-18 about panel, shortcuts, skeletons, empty states (needs 09)
 SHL-19 polish gate: a11y pass, e2e phone check, M7 demo (needs editor phase, 17, 18, PST-22)  ══> phase:polish
```

### Parallelism
- After SHL-01: SHL-02, SHL-03, SHL-04 in parallel; then SHL-05, SHL-06, SHL-07 in parallel.
- After SHL-09: SHL-10, SHL-11, SHL-12, SHL-13, SHL-17, SHL-18 all in parallel.
- After SHL-13: SHL-14 and SHL-15 in parallel; SHL-16 runs alongside them.

### Cross-cutting decisions
- Angular 22, standalone components, signals-first and zoneless. Angular Material + CDK (layout, `BreakpointObserver`).
- Feature UIs live in `apps/web/src/app/features/<m>/`, each owned by its module. The Shell's own code lives outside `features/`. Platform's boundaries lint rule (PLT-09) applies.
- The Shell consumes only `/platform`, the setup-status route + schema from `/setup-auth`, and the active-project/activate/`project-switched` and file-API read/write shapes from `/project-store`. It never consumes `/agent-loop`, `/graph-runner` or `/compile-export`; shared components take Shell-local inputs.
- Reads are `GET`, commands `POST` (Platform's method convention); no other verbs.
- In production NestJS serves the built bundle on the same origin (`@nestjs/serve-static`), so cookies and `EventSource` need no CORS.

### Route table (paths are fixed here; each owner registers its own entry)

| Path | Owner | Scope | Min. class | Nav |
|---|---|---|---|---|
| `/setup` | Setup & auth | app | phone | no |
| `/settings` | Setup & auth | app | phone | yes |
| `/providers` | Model providers | app | phone | yes |
| `/tools` | Tool registry | app | phone | yes |
| `/projects` | Project store (picker) | app | phone | yes |
| `/projects/:projectId/chat` | Agent loop | project | phone | yes |
| `/projects/:projectId/review` (`?run=<runId>`) | Project store | project | phone | yes |
| `/projects/:projectId/files` (`?path=<path>`) | Project store | project | phone | yes |
| `/projects/:projectId/graphs` | Graph runner (graph list, latest run status) | project | phone | yes |
| `/projects/:projectId/graphs/:graphId` | Graph runner (canvas; child route of the same entry) | project | tablet (child-level gate) | no |
| `/projects/:projectId/manuscript` | Compile & export | project | phone | yes |

Pages with richer layouts on larger screens (files editing, the Tools editor) declare `phone` and switch layout on the device-class signal. The canvas child route is gated with the exported `deviceClassGuard('tablet')` (`canMatch`).

### Angular APIs provided to features

| API | Consumers | Unit |
|---|---|---|
| Route-table entry pattern + route `data` (nav label, icon, order, minimum device class, scope) | every feature UI | SHL-01, SHL-05 |
| Typed API client (Zod-parsed responses, typed error, 401 → `/setup`) | every feature UI | SHL-02 |
| SSE client: per-module stream, connection-state signal, reconcile tick | Agent loop, Graph runner, Project store | SHL-03 |
| Device-class signal, breakpoint gate, `deviceClassGuard` | every feature UI | SHL-05 |
| Active-project signal | project-scoped features | SHL-08 |
| Notices service; theme toggle component | Setup & auth (compose warning, preferences step), any feature | SHL-04 |
| Fake API client + fake event source | every feature's route tests | SHL-07 |
| Tool-call card | Agent loop chat (M1); optionally Graph runner node results | SHL-10 |
| Markdown preview | Compile & export, Project store, Agent loop | SHL-11 |
| Read-only diff view | Tool registry Compare (M2), Project store review (M3), Agent loop write previews (M3) | SHL-12 |
| Markdown editor (lossless, saves through file API) | Project store drafts, Compile & export manuscript editing | SHL-13–15 |
| Editable merge view | Project store review queue | SHL-16 |

### Testing principles
- External behaviour only: what the author sees and does in a rendered route, and what goes over the wire (HTTP requests, `EventSource` messages). Never private services, signal wiring or component internals.
- Seam: rendered routes with Angular's Vitest runner against the fake API client and fake event source (SHL-07), which every feature module uses too.
- SSE client tested through a stubbed global `EventSource`; breakpoints by driving `matchMedia` / `BreakpointObserver`.
- System: Platform's Playwright e2e runs against the dev server, exercising the proxy, SSE through the proxy and nav on every run.
- Prior art: the canvas library evaluation's headless-Chromium touch synthesis (reference for tablet touch checks); the Markdown round-trip probe (model for the editor fixture suite).

### Out of scope
- Feature pages (chat, review queue, canvas, manuscript, settings, `/setup`, tool-spec pages) belong to their modules.
- The canvas (`ngx-vflow`, Graph runner); the Shell only gates it to `tablet`+.
- "Current run state" endpoints (Agent loop, Graph runner); the Shell only emits the reconcile tick.
- Pending-change semantics (Project store); the diff view renders strings.
- WYSIWYG editing (TipTap, Milkdown ruled out); offline editing or write queues; a native app; server-side per-user preferences; an "update available" notice against published images; read-only reviewer access; i18n.
- Superseded: React + Vite (now Angular 22 + Material); CodeMirror-or-TipTap (CodeMirror 6 only); React Flow (`ngx-vflow` in the Graph runner). Agent/recipe writes to `drafts/` still go through pending changes; the author's own typing saves straight to the file.

### Further notes
- The remix comparison view (M7) belongs to the module that ships Remix (a Genre packs tool). It can reuse the side-by-side diff layout; extending the diff view to more than two variants would be an additive Shell change requested by that module.
- **iOS Safari** drops `EventSource` when backgrounded; the reconcile tick on `visibilitychange` and `pageshow` keeps phone and iPad correct. No replay (`Last-Event-ID`) is relied on; Platform may add it later without Shell changes.
- **Breakpoints** follow the CDK's `Handset`/`Tablet`/`Web` sets. Canvas touch checks were synthesised in headless Chromium and didn't cover real tablets or Safari. If real devices show a misclassification, adjust the mapping in the Shell. Features declare only a class, never pixel widths.


---

## Setup & auth

Setup & auth gives Scriba one way in and one guard: a reusable setup token and handshake that sets a stateless session cookie on loopback; Tailscale Serve identity on the tailnet; one default-deny global guard (Host allowlist, credential, full-Origin check on mutations, no CORS, `frame-ancestors 'none'`); the `/setup` wizard and settings page; the owner allowlist; the compose-version warning; and the cross-module GET/HEAD-never-mutate and mutation-guard invariant tests.

### Ordering

API work for `phase:token-guard` starts before Frontend shell `phase:core`; only the minimal `/setup` page (SAU-06) needs it. In `phase:tailnet`, the LocalAPI client, the tailnet guard path and the allowlist are built and tested against a fake LocalAPI socket, so they may start once `phase:token-guard` closes; only the gate (SAU-21) waits on Platform `phase:image-compose` and `phase:smoke` (ST-1 outcome) for real-tailnet verification.

### Dependency graph

```
SAU-01 contract slice  ══> phase:contract
 └─ SAU-02 module skeleton, token store, setup-url, cookie signing, setupAuth section
     ├─ SAU-03 handshake, cookie issue, sign-out, identity endpoint, Secure-flag matrix
     ├─ SAU-04 global guard (default-deny, Host, cookie credential, Origin, no CORS, CSP, accessor)
     │    └─ SAU-07 cross-module invariant tests
     ├─ SAU-05 status endpoint + Continue (access-only)
     └─ SAU-06 minimal /setup page + sign-in notice   (needs 05 + Shell phase:core)
 SAU-08 token-guard gate (e2e setup step, demo)  ══> phase:token-guard
 SAU-09 setup-flow API (steps, preferences, preferences reader) ─┐
 SAU-10 compose-version status ──────────────────────────────────┤
 SAU-11 wizard shell + Access step + routing (needs 09, 06) ──┬─ SAU-12 providers step (Model providers phase:settings-ui to embed)
                                                              ├─ SAU-13 preferences step
                                                              └─ SAU-14 first-project step (Project store phase:contract; PST-12 to run)
 SAU-15 settings page + recovery docs (needs 09, 10, 06)
 SAU-16 setup-flow gate (e2e leg via /setup first-project, demo)  ══> phase:setup-flow
 SAU-17 LocalAPI client + normalised status (fake socket; needs 08)
  ├─ SAU-18 tailnet guard path (Host from DNSName, identity header, https Origin)
  │    └─ SAU-19 owner allowlist
  └─ SAU-20 Tailscale UI in /setup and settings (needs 11, 15)
 SAU-21 tailnet gate (socket smoke, Serve verification, docs, late login; Platform phase:image-compose + phase:smoke)  ══> phase:tailnet
```

### Parallelism
- After SAU-02: SAU-03, SAU-04, SAU-05 in parallel; SAU-06 once Shell `phase:core` lands; SAU-07 after SAU-04.
- After SAU-08: SAU-09, SAU-10 and SAU-17 in parallel. After SAU-11: SAU-12, SAU-13, SAU-14 in parallel; SAU-15 in parallel with SAU-11.
- After SAU-17: SAU-18 and SAU-20 in parallel.

### Cross-cutting decisions
- One vertical module: `apps/api/src/modules/setup-auth/` (NestJS `@Module`, one import in the composition root) and `apps/web/src/app/features/setup-auth/` (lazy `Routes`) with two app-level routes, `/setup` and `/settings` (both minimum device class `phone`; `/settings` has a nav entry, `/setup` doesn't). API routes under `/api/setup-auth/…`.
- **In-process exports** (NestJS providers, not contract members): the global guard with its public marker, the request-identity accessor, and a read-only preferences reader (`authorName`, `defaultGenrePack`; Compile & export's fallback author name).
- Errors use Platform's base error shape and code convention. The Shell's API client sends 401s to the sign-in notice on `/setup`.
- This module publishes **no SSE events** in v1; UIs poll.
- The identity is for display and logs only: no user table, no per-user data, never used to partition data.

### Settled decisions (do not reopen)
The token is reusable; loopback requires a cookie; the tailnet is trusted. `frame-ancestors 'none'`, port-suffixed cookie names, the stateless cookie keyed from the token (replacing the token revokes all cookies), and the peer-address check on the identity header (with a dedicated Serve listener as the fallback if ST-1 disproves it) are adopted. Where a manual check (the `Secure` matrix, the socket-permission smoke test, Serve Host preservation) could disprove an assumption, apply the named fallback and record the result instead of stopping.

### Testing principles
- External behaviour only: HTTP status codes, headers, cookies, redirects, files on disk, rendered UI — never internal services, the token store or the signing helper.
- Primary seam: the composed NestJS app (Platform's `create-test-app`) against a temp library folder.
- LocalAPI seam: a small fake Unix-socket server serving recorded `status` payloads is the only test double for tailscaled.
- UI seam: lazy routes with Angular's Vitest runner against a fake API client built from `/setup-auth` contract types.
- Vitest everywhere (NestJS via `unplugin-swc`). Tride's guard is reference only; **its `http://`-only origin assumption must not be copied**.

### Out of scope
- A CLI reset-token command and in-app token rotation (deferred).
- Accounts, a user table, per-user data, read-only reviewer access (reviewers may be added later as long as no per-user identity is built in).
- LAN mode, `0.0.0.0` publishing and a plain `http://scriba` short name.
- A separate installer UI container; host bootstrap, `.env`/compose writing and the update one-liner (Platform). This module only writes `setup-url` and reads `SCRIBA_COMPOSE_VERSION`.
- Provider forms, key storage, model listing, connection test (Model providers). Project creation, import and sample templates (Project store; this module only calls them).
- An "update available" notice and auto-update.
- Tailscale userspace mode (ST-4, deferred) and auth-key management beyond what the installer writes.
- SSE events from this module.
- Replaced designs: an unauthenticated localhost-only design; React and Fastify.


---

## Model providers

The module owns "talk to a model": one `openai-compatible` provider kind on the official `openai` SDK, an in-process streaming client with tool calls used by the Agent loop and the Tool registry, a provider registry in `settings.yaml` with keys only in a 0600 secrets file, zero-config Ollama seeding, model resolution (project override → app default → provider model → first listed), and the BYOK settings UI (also embedded by `/setup`).

### Ordering

Gates are unchanged from the original spec. Within `phase:client`, the SDK client (MPR-04) is built against a resolved config and needs only the contract and Platform's mock server, so it runs in parallel with the registry and secrets work. The override API (MPR-12) needs the client gate and Project store `phase:files`, not the settings UI; only the project model panel (MPR-13) waits for the settings route.

### Dependency graph

```
MPR-01 contract slice  ══> phase:contract
 ├─ MPR-02 module skeleton, registry in settings.yaml, Ollama seeding
 ├─ MPR-03 secrets file helper (0600/0700, atomic, tighten/warn) + log redaction
 └─ MPR-04 openai-compatible client: streaming, tool-call assembly, abort, errors, retries, timeout (needs PLT-12)
      MPR-05 model resolution + model list (needs 02, 03, 04)
       └─ MPR-06 HTTP API: CRUD, keys, app default, model list, effective model (needs 02, 03, 05)
            └─ MPR-07 connection test (needs 04, 06)
 MPR-08 client gate (guard, secrecy suite, M1 real-Ollama check)  ══> phase:client
 MPR-09 providers panel component (needs 06 + Shell phase:core)
  └─ MPR-10 connection-test UI + hints (needs 07)
 MPR-11 /providers route + settings-ui gate  ══> phase:settings-ui
 MPR-12 project override: resolution + set/clear API (needs 08 + Project store phase:files)
 MPR-13 project model panel + effective-model readout (needs 11, 12)  ══> phase:project-override
```

### Parallelism
- After MPR-01: MPR-02, MPR-03, MPR-04 in parallel.
- MPR-09 can start against the Shell's fake API as soon as Shell `phase:core` closes; it merges once MPR-06 is in.
- MPR-12 runs in parallel with the settings UI (MPR-09…11).

### Cross-cutting decisions
- **Module shape:** NestJS `@Module` at `apps/api/src/modules/providers/` (one import in the composition root) and lazy feature routes at `apps/web/src/app/features/providers/`. Publishes `/providers`; exposes the client in-process; serves `/api/providers/…` behind Setup & auth's guard; ships the BYOK UI.
- **SDK confinement:** the `openai` SDK is used only inside this module. The client always passes `baseURL` and `apiKey` explicitly so the SDK never falls back to `OPENAI_API_KEY` / `OPENAI_BASE_URL` from the environment; keyless providers get a fixed placeholder key (the SDK requires a non-empty one).
- **`kind`** is a Zod discriminated-union key with one member (`openai-compatible`) in v1; native adapters later add members behind the same client interface (expand–contract).
- **Secrets:** keys live only in `/books/.scriba/secrets.yaml` (0600 in 0700). `settings.yaml` holds only `keyRef`. No API ever returns a key; reads return `keySet` and a masked hint (last four characters). Keys never appear in logs, transcripts, errors or the event stream. This is a permissions floor, not a vault. If a later module needs a secret, it reuses this module's secrets-file helper rather than adding a second file. Setup & auth stores nothing there.
- **`settings.yaml`:** this module owns the `providers` section `{schemaVersion: 1, list: ProviderConfig[], appDefault: ModelChoice | null}` and its migration, registered with Platform's hook (PLT-07).
- **`project.yaml` override** is defined by the Project store slice (PST-01) as `{providerId, model}`; it must match `ModelChoice` (type-level test in MPR-12). The Project store slice must not import `/providers`.
- **Methods:** GET/HEAD never mutate; commands are POSTs. **No SSE events** in v1 (run-time model errors reach the author through the Agent loop's and Graph runner's events).
- **Client interface types** (messages, stream events) are in-process TypeScript, not part of the HTTP slice. If they ever go on the wire, add them to `/providers` via expand–contract.

### Testing principles
- External behaviour only: HTTP responses, the stream events a caller receives, files on disk (contents and modes), and what the mock OpenAI server received (headers, body, attempt count). Never internal services or SDK internals.
- Primary seam: the module in Platform's `create-test-app` against a temp library and Platform's mock OpenAI server (PLT-12).
- UI seam: routes and the panel with Angular's Vitest runner against the Shell's fake API client (SHL-07) built from `/providers` types.
- Real-model check: the Agent loop's manual eval script, not CI.

### Out of scope
- Native adapters (Ollama `/api/chat` with `num_ctx`, Anthropic, Google) — deferred; `kind` leaves room.
- Per-tool model choice (deferred). The per-tool enable switch is the Tool registry's `enabled` field.
- Schema-validation retries for tool-call arguments (the Agent loop's: two retries with a readable error to the model).
- Setting Ollama's context length from Scriba (impossible over the compatible endpoint; hint only). Pulling models from the UI (hint only).
- Embeddings / vector-search providers. Strong encryption of keys. Running Ollama inside the compose stack (it stays on the host).
- Replaced designs: a single settings page with endpoint/model/temperature/context/per-tool switch → registry with presets, write-only keys, app default and per-project override. Default endpoints for Ollama on 11434 and LM Studio on 1234 → one seeded Ollama provider at `host.docker.internal` plus an LM Studio preset (the app runs in a container).

### Further notes
- **Running outside Docker** (`npm run dev`): `host.docker.internal` may not resolve on Linux. The seed stays the same; the unreachable hint suggests `http://localhost:11434/v1`.
- **ST-3** (Platform PLT-16) makes zero-config Ollama real on Mac and Linux. If it fails on Linux, the fallback is guidance in the hint, not a different seed. On Linux, Ollama bound to `127.0.0.1` isn't reachable via `host-gateway`; the unreachable hint mentions `OLLAMA_HOST=0.0.0.0`.


---

## Project store

The Project store owns the author's books on disk: the library at `/books`, discovery and the one active project, a path-safe file API, entity resolution, FTS5 keyword search, the pending-changes queue with a three-way check, per-draft versions, lazy file migrations, the `examples/` samples, and the picker / files / review UI.

### Ordering

Every unit is gated on Platform `phase:scaffold` (PLT-11) through PST-01.

The original spec made phases strictly serial. Phase *gates* are unchanged, but units only wait on what they actually use: the pending-changes units (PST-15+) need the file API, not search, so they may start once `phase:files` closes, in parallel with `phase:search`. `phase:pending-review` still closes only after PST-22, and PST-22 requires `phase:search` closed (the M3 demo uses search-backed grounding). The migrations unit needs apply (PST-16), not the whole review phase.

### Dependency graph

```
PST-01 contract slice  ══> phase:contract
 ├─ PST-11 examples/ nonfiction skeleton + samples.yaml (content; parallel with all API work)
 └─ PST-02 module skeleton + path safety
     ├─ PST-03 discovery, list, new, import ─┬─ PST-04 active project + switching
     │                                       └─ PST-05 start from sample + sample list
     ├─ PST-06 file API core (list/read/write/edit, atomic, too-new)   (needs 04)
     │    └─ PST-07 delete/move + in-process helpers (updateProjectYaml, appendLog, stateDir)
     ├─ PST-08 entity resolution + entity list + manifest              (needs 04)
     ├─ PST-09 project picker UI + e2e "project from sample"           (needs 03,04,05,11 + Shell phase:core)
     └─ PST-10 files UI (tree, preview, editor, stale-base)            (needs 06 + Shell core/shared-components)
 PST-12 files gate (guard, GET-invariant, demo)  ══> phase:files
 PST-13 FTS5 search (needs 08) ─ PST-14 search box UI (needs 10)  ══> phase:search
 PST-15 propose + pending store + validators (needs 12)
  └─ PST-16 apply/accept/reject + three-way check + versions-on-apply + eager conflicts
      ├─ PST-17 refresh (3-way merge) + accept-anyway
      ├─ PST-18 draft versions list/read/restore API
      ├─ PST-19 optional watcher
      ├─ PST-20 review queue UI (needs 17 + Shell shared-components; merge view at Shell editor)
      ├─ PST-21 version history UI (needs 18, 10)
      └─ PST-23 migrations  ══> phase:migrations
 PST-22 review gate (e2e "accept change", demo; needs 17–21, phase:search)  ══> phase:pending-review
```

### Parallelism
- PST-11 (sample content) runs in parallel with everything after PST-01.
- After PST-03: PST-04 and PST-05 in parallel; after PST-04: PST-06 and PST-08 in parallel; after PST-06: PST-07.
- UI units (PST-09, PST-10) run in parallel with API units once their Shell gates close; they test against a fake API built from contract types, so they need only PST-01 to start and their API units to finish.
- After PST-16: PST-17, PST-18, PST-19, PST-23 in parallel; PST-20/21 follow their API units.

### Cross-cutting decisions
- **Path safety** (PST-02) is the single function every endpoint and in-process caller uses.
- **GETs never mutate** (Setup & auth's cross-module invariant). Search, rebuild, activation and every write are POSTs because they may refresh a cache or migrate files. Only `GET` and `POST` are used.
- **Routes:** `/api/project-store/…`; project-scoped ones are `/api/project-store/projects/:projectId/…`. All behind Setup & auth's guard once `phase:token-guard` lands.
- **Active-project rule:** every file-API, search, resolution and pending-change request names the `projectId` it expects; a non-active project fails with "project not active". Exception: `propose` and `appendLog` are allowed for any `ok` project.
- **Only project-relative paths** appear in UI, logs, tool results and errors; container paths never leak.
- **Hashes** everywhere are `sha256:` + lowercase hex SHA-256 of the file's UTF-8 bytes.
- **Atomic writes:** temp file in the same folder, then rename; missing parent folders created.
- The Project store never imports another module's implementation; other modules register validators/migrators at runtime.
- The same operations are exported as an injectable NestJS provider (from the module's `@Module`) for in-process callers (Agent loop, Graph runner, Compile & export, Model providers), going through the same path checks, active-project check and validators as HTTP.

### Testing principles
- External behaviour only: HTTP responses, SSE events, files on disk; never private helpers. Tests survive behaviour-preserving refactors.
- Primary seam: the composed NestJS app (or the module in Platform's `create-test-app`) against a **temp library folder**. No mock OpenAI server (this module never calls a model).
- UI seam: lazy routes rendered with Angular's Vitest runner against a fake API/SSE client built from contract types.
- Fixtures: tests build their own temp projects and **never read `examples/`**.
- Vitest everywhere (NestJS via `unplugin-swc`).

### Out of scope
- A `structure/` folder. Chapters and scenes are whole Markdown files at the top level of `drafts/` (several scene nodes may share one chapter file); a beat is a label-only story node or points at a whole `drafts/` file; the outline is an ordinary source (`sources/outline.md` in the sample). No scene or beat folders.
- Routing the author's own writes through pending changes — the author's typing saves directly; only agent and recipe changes are pending.
- React, Fastify and a SQLite run-log index (Angular + Material, NestJS, `logs/` is the source of truth).
- Vector/semantic search (the search contract allows it later); git integration (the image ships no git).
- More than one active project, multi-user editing, cloud sync.
- Folder delete/rename, delete/move from the files UI, binary files (single-file `delete`/`move` exist in the API for other modules' author actions).
- Stable draft IDs (renaming a draft orphans its versions; deferred).
- Per-project `tools/`, the `snapshots/` mechanism, the meaning and writes of `order`, and the `logs/` transcript format (Compile & export, Agent loop).
- Sample content owned by other modules: nonfiction entities (Genre packs, M2), the grounding-claims draft (Agent loop, M3), the recipe (Graph runner, M4), the order field (Compile & export, M5), the fiction sample (Genre packs, M6).
- `settings.yaml` and its startup migration (Platform PLT-07; this module only registers its `projects` section).

### Settled decisions (do not reopen)
- Version sub-path `drafts/.versions/<draft file name>/<UTC timestamp>.<ext>` stores the replaced content.
- Samples ship no `.scriba/`, `logs/`, `snapshots/` or `.versions/`. Sample source text is public domain or written for the sample. The outline lives in `sources/outline.md`.
- The `projects` section of `settings.yaml` is `{schemaVersion: 1, active: <projectId> | null}`.
- Env names: Platform's `SCRIBA_BOOKS_DIR` (library), `SCRIBA_EXAMPLES_DIR` (samples), `SCRIBA_WATCHER` (watcher toggle).
- **Agent overlay:** the Agent loop keeps each run's in-memory overlay and proposes once per touched path at run end. The Project store has no read overlay.
- **Bind-mount caveat:** file-watch events from macOS hosts through Docker Desktop can be delayed or dropped, which is why the watcher is optional and only refreshes the UI.
- The `order` field's shape is a placeholder Compile & export narrows via expand–contract; it stays optional so the nonfiction skeleton is valid without it until M5.
- The accept request carries optional edited `content` (the Shell's merge view relies on this).


---

## Tool registry

The Tool registry treats every narrative tool as data: one YAML **tool spec** (name, one-line description, JSON Schema draft-07-subset `inputs` with `x-scriba-*` hints, an output kind, an `enabled` default, a pure Handlebars-like prompt template, `schemaVersion`). From that one document it emits three views — the **model function schema**, a **form descriptor** and a **port descriptor** — loads built-in packs plus the author's user pack (copy-on-write), lints every save, validates arguments with Ajv into model-readable errors, and **executes** tools (render → model call → `{output, sourcesUsed}`). Authors get a Tools page with enable switches, a YAML editor, live previews and a Try panel.

### Ordering

The spike stays first on purpose: it is the riskiest part of "one document, three views" and validates the hint vocabulary before lint and the editor build on it. Lint (TRG-07) therefore waits for the spike gate. Units that don't depend on the vocabulary start earlier: the loader (TRG-06) needs only emission (TRG-02), and the **template engine (TRG-08, part of `phase:executor`) is pure and needs only the contract**, so it is built first and reused by lint. `phase:executor` still closes only with TRG-12, which waits for `phase:loader-validation`.

### Dependency graph

```
TRG-01 contract slice  ══> phase:contract
 ├─ TRG-02 emission (function schema, form & port descriptors) + Ajv full validate + fixture GET
 ├─ TRG-03 Angular tool-form renderer (form + node-body layouts, all controls, inline issues)  (Shell phase:core)
 │    └─ TRG-04 entity picker + style picker
 ├─ TRG-08 template engine (pure parser + renderer)                ── phase:executor
 TRG-05 spike gate (dev preview route, running app, spike note)  ══> phase:form-renderer
 TRG-06 pack loader + catalog service (needs 02)
 TRG-07 full lint + pack-lint CLI + library entry (needs 05, 06, 08)
 TRG-09 read endpoints, functions, params validate, enabled overrides (needs 06)
 TRG-10 lint/save/delete endpoints (copy-on-write) + catalog-changed (needs 06, 07)
 TRG-11 loader gate (guard, checklist)  ══> phase:loader-validation
 TRG-12 executor service + render/execute endpoints (needs 08, 11 + Model providers phase:client)  ══> phase:executor
 TRG-13 Tools page list, toggles, phone view (needs 11 + Shell core)
  ├─ TRG-14 YAML editor + Customize/Revert/Compare/New/Duplicate/Delete (Shell read-only diff)
  │    └─ TRG-15 live previews (form, node, function schema, rendered prompt) (needs 03, 12)
  └─ TRG-16 Try panel (needs 12 + Project store phase:files)
 TRG-17 editor-ui gate, M2 demo (needs Genre packs phase:nonfiction-workhorses)  ══> phase:editor-ui
```

### Parallelism
- After TRG-01: TRG-02, TRG-03 (once Shell core is in) and TRG-08 in parallel.
- After TRG-02: TRG-06 in parallel with the UI spike.
- After TRG-06: TRG-09 in parallel with lint; TRG-10 follows lint.
- After TRG-11/12: TRG-13 then TRG-14 and TRG-16 in parallel.

### Cross-cutting decisions
- **Module shape:** NestJS `@Module` at `apps/api/src/modules/tool-registry/` exporting two in-process services the Agent loop and Graph runner inject — the **catalog** (list, get, function schemas, port descriptors, validate) and the **executor** (render, call). Web feature at `apps/web/src/app/features/tool-registry/` exporting the **tool-form component** (Angular API, not a contract) for the Graph runner's canvas.
- **Who calls whom:** the Agent loop and the Graph runner both call the registry and never each other.
- **Tool inputs are JSON Schema**, with no Zod-to-JSON-Schema conversion; the `inputs` schema is the source for every view (no `z.toJSONSchema()`). The contract envelope itself is Zod.
- **Function names** are lower snake case, valid for every OpenAI-compatible endpoint including Ollama and LM Studio.
- **HTTP:** all under `/api/tool-registry`, behind Setup & auth's guard; GET never mutates; every command is a POST. Per-tool routes sit under `/tools/:name` so no tool name collides with a fixed route.
- **`settings.yaml`:** this module owns the `tools` section `{schemaVersion: 1, enabled: {<toolName>: boolean}}` (only overridden tools appear), registered with Platform's hook (PLT-07).
- **SSE:** one member on Platform's envelope: `{module: 'tool-registry', type: 'catalog-changed', data: {names}}`.
- The entity picker uses the Project store's entity list (`{id, type, path, title?}`, filterable by `type`); the Try panel uses its GET resolution endpoint. `SCRIBA_PACKS_DIR` is in Platform's env names. The output port is always `text` in v1.
- The execute endpoint exists so the Try panel and the HTTP test seam use the same path as in-process callers; it writes no files, so agent/recipe writes still always become pending changes.

### Testing principles
- External behaviour only: HTTP responses, SSE events, files on disk, rendered UI — never the loader's, parser's or emitter's internals.
- Primary seam: the module in Platform's `create-test-app` with Setup & auth's guard, a temp library, `SCRIBA_PACKS_DIR` pointed at **fixture packs**, and Platform's mock OpenAI server. The template subset is tested through the render endpoint; emission through `GET /tools/:name`.
- UI seam: the Tools route and the tool-form component with Angular's Vitest runner against the Shell's fakes (SHL-07).
- Unit tests keep their own fixtures (including the cold-open fixture) and **never read `examples/` or the real packs**. The real packs are linted in CI by `npm run lint:packs`.
- System seam: Platform's e2e needs no registry-specific step; the Agent loop extends it with a registry tool call at M2.

### Out of scope
- Pack content (workhorse and fiction prompts, descriptions, entity-type schemas) — Genre packs.
- Per-project `tools/` folders; per-tool model choice (deferred). Entity types in the user pack.
- A field DSL over tool specs; Zod for tool inputs.
- Schema-validation retries (the Agent loop's: two retries).
- Resolving entity IDs to contents, recording citations, draft provenance, turning output into pending changes — callers (Agent loop, Graph runner) with the Project store.
- Canvas wiring, run state, graph JSON validation including propose-graph output (Graph runner).
- Streaming tool output (v1 tool calls are non-streaming).
- Nested-object inputs, `$ref` and combinators in tool inputs.
- Canvas and records: Angular-native canvas (no React Flow); each tool node is the Angular form component in an ngx-vflow node; recipe nodes are `input`, `tool`, `output` only (no Merge, Compare, Gate or entity nodes); a tool node is `{id, kind, position, tool?, params?}` with ports derived here. Decisions are ADRs in `docs/adr/`, not `DECISIONS.md`.

### Further notes
- The canvas needs a small custom-node API, and derivation provides it: a new tool spec automatically gets a tool node, a form and a function schema, with no per-tool code.


---

## Genre packs

Genre packs is a **content module**: three built-in packs of tool specs and entity-type schemas in `packages/packs` (`core`, `nonfiction`, `fiction`), validated by the Tool registry, plus the nonfiction sample's `entities/` (M2) and the whole fiction sample (M6). It has no runtime code — only content and tests. It publishes **no contract slice** (`/genre-packs` stays empty) and therefore has no `phase:contract`.

### Ordering

Phase gates are unchanged, but content units wait only on what they use. Entity types and tools need the pack scaffold and content suite (GNP-01) plus, for tools, the golden harness (GNP-02); so nonfiction and fiction entity types and tools can be authored in parallel once those land. Content authoring can start against the Tool registry contract (TRG-01) earlier; a unit merges only when its suites run. Remix (GNP-23) comes last because its `targetShape` enum must list every shipped draft tool. Gates still close in order: workhorses after core-propose-graph, fiction after workhorses, remaining-shapes after fiction's draft tools.

### Dependency graph

```
GNP-01 packages/packs scaffold + content-check suite (TRG-07 pack-lint library)
GNP-02 golden-test harness (TRG-12 execute, PLT-12 mock server)
 ├─ GNP-03 core entity types: source, style-profile
 ├─ GNP-04 propose_graph + goldens (GRR-01)
 GNP-05 core gate (image read-only check, PLT-14)  ══> phase:core-propose-graph
 GNP-06 nonfiction entity types: person, claim, concept
  ├─ GNP-07 cold_open │ GNP-08 mystery_question │ GNP-09 myth_buster │ GNP-10 numbers_to_people
  └─ GNP-11 nonfiction sample entities (PST-11)
 GNP-12 workhorses gate  ══> phase:nonfiction-workhorses
 GNP-13 fiction entity types: character, place, world-rule
  ├─ GNP-14 character_builder + world_builder │ GNP-15 scene_builder │ GNP-16 dialogue │ GNP-17 plot_manager
  └─ GNP-18 fiction sample project (GRR-01, PST-05)
 GNP-19 fiction gate (Compile & export assembly order, Graph runner phase:canvas)  ══> phase:fiction
 GNP-20 throughline_check │ GNP-21 named_concept, comparison_set, objection_handler │ GNP-22 nine tier 2–3 shapes
 GNP-23 remix + shape-list consistency check (needs all draft tools)
 GNP-24 remaining-shapes gate  ══> phase:remaining-shapes
```

### Parallelism
- After GNP-01 + GNP-02: GNP-03, GNP-04, GNP-06, GNP-13 in parallel.
- After GNP-06: the four workhorses and the sample entities in parallel.
- After GNP-13: the four fiction tool units and the fiction sample in parallel.
- GNP-20, GNP-21, GNP-22 in parallel once GNP-12 closes.

### Pack layout and shipping
- `packages/packs/{core,nonfiction,fiction}/`, each with `tools/<name>.yaml` (one per tool) and `entity-types/<kind>.yaml` (one per entity type) — the layout the Tool registry loader reads.
- The image ships them read-only at `/opt/scriba/packs/{core,nonfiction,fiction}` via Platform's Dockerfile copy of `packages/packs` (PLT-14); Genre packs only verifies it.
- Loading, name resolution (user > built-in), copy-on-write editing into `/books/.scriba/packs/user/`, and lint-on-save belong to the Tool registry.
- `core` is always active. A project is offered `core` plus the pack named by `project.yaml`'s genre pack (filtering implemented by the Tool registry and Agent loop).

### Tool-spec content rules (all tool units)
- Fields: `name`, one-line `description`, `inputs` (JSON Schema subset with `x-scriba-*` hints), `output`, `enabled`, `prompt` (block scalar), `schemaVersion: 1`.
- **Names** lower snake_case, stable; file `<name>.yaml`. **Input keys** camelCase, stable (recipes address ports as `<nodeId>.<key>`). Renaming a tool or input key is breaking: expand–contract plus updating every sample recipe in the same PR.
- **Descriptions:** one sentence, under ~120 characters, plain words, start with a verb, name the shape (not genre theory).
- **Prompt templates** use only the Tool registry's subset (`{{field}}`, `{{#each}}`, `{{#if}}`, `{{entity id}}`, `{{toolCatalog}}`) and stay pure. Every first-draft template follows one skeleton:
  1. a role line;
  2. the material, each entity rendered with its ID;
  3. the shape's steps;
  4. constraints: use only the material; cite each factual sentence with its entity or source ID in Pandoc citation form `[@id]`; where a needed fact is missing write `TK` with a short note (e.g. `TK (year of the study)`) rather than invent; respect the style profile's tone, banned phrases and the requested length.
- **`sourcesUsed`** is computed by the Tool registry from entity-ID inputs. Prompts never ask the model to list its sources.
- Every `output` is in `draft | entity | claims | graph | check`. No built-in tool produces `claims` (claim extraction is the Agent loop's grounding step).
- **Scene and beat are not entity references.** Scene builder, Dialogue, Plot manager and Throughline check take scene/chapter content on `text` ports (in a recipe, a text input node holds a file reference read at run start; in chat, the agent reads the file first).
- Templates are first drafts the author is expected to tune through copy-on-write.

#### Common inputs (every draft-producing narrative tool, repeated verbatim; CI asserts identity)

| Key | Meaning | Required | Port |
|---|---|---|---|
| `coreIdea` | The idea the passage serves, in one or two sentences | yes | `text` |
| `entityIds` | Entities and sources to draw from (a list) | no | `entity` |
| `styleProfile` | One Style profile entity | no | `style` |
| `length` | Target length in words (default 800) | no | none (`params` control) |
| `tone` | Optional tone override for this passage | no | none (`params` control) |

Tools whose output is `entity`, `check` or `graph` take only the subset that makes sense (listed per unit). Entity inputs carry `x-scriba-type: entity` with `x-scriba-entity-kinds` so the form, canvas and Ajv restrict them.

### Entity types (envelope from the Tool registry)
`{schemaVersion, kind, title, description, folder, fields}`; `fields` is JSON Schema over front-matter keys added on top of the Project store base (`id`, `type`, `links`), using the tool-input subset plus the one-level array-of-objects extension. Reference fields carry `x-scriba-type: entity` and `x-scriba-entity-kinds`. `description` is one line that also says what the Markdown body holds. `kind` is the front-matter `type` value tools filter by.

| Type (`type`) | Pack | Folder | Front-matter fields | Body |
|---|---|---|---|---|
| Source (`source`) | core | `sources/` | `title`, `citation`, `url?`, `reliability` (short note) | quotes and notes |
| Style profile (`style-profile`) | core | `entities/` | `tone`, `targetLength` (words), `bannedPhrases` (list) | sample paragraphs |
| Person (`person`) | nonfiction | `entities/` | `name`, `role`, `sources` (source refs) | what happened |
| Claim (`claim`) | nonfiction | `entities/` | `statement`, `evidence` (source refs), `status` (`supported \| weak \| unsupported`) | discussion |
| Concept (`concept`) | nonfiction | `entities/` | `name`, `definition` (one line) | examples and where used |
| Character (`character`) | fiction | `entities/` | `name`, `want`, `need`, `flaw`, `voice` (notes), `relationships` (list of `{character, note}`, `character` a character ref) | backstory |
| Place (`place`) | fiction | `entities/` | `name`, `rules` (world-rule refs) | description |
| World rule (`world-rule`) | fiction | `entities/` | `statement`, `appliesTo` (place refs) | consequences and exceptions |

Content interfaces held stable with expand–contract: pack folders; tool names and input keys; entity-type names and fields (Compile & export reads `source.citation`, `source.url` and `style-profile.bannedPhrases`; the Agent loop's grounding-claims draft uses `claim`); the `[@id]` citation convention; Compile & export's `TK` placeholder.

### Testing principles
- Assert behaviour other modules and the model see: a spec loads and validates; a call with given arguments and entity contents sends a given request to the model; the result has the right output kind and `sourcesUsed`; samples resolve. No wording assertions beyond golden snapshots; never Tool registry internals.
- **Content checks** (`packages/packs/test/`, Vitest, using the pack-lint library entry point and the contracts package) on top of `npm run lint:packs`.
- **Golden tests** (`apps/api/test/packs/`, goldens and fixtures under `packages/packs/test/golden/`) through `POST /api/tool-registry/tools/:name/execute` with `create-test-app`, `SCRIBA_PACKS_DIR=packages/packs`, a temp library and the mock OpenAI server. Golden files change only on purpose, in the same PR as the prompt edit.
- **Sample checks:** Platform's CI sample check (PLT-20…22) validates sample files against contracts and these entity-type schemas. Unit tests never read `examples/`.
- **System seam:** the Playwright e2e is unchanged; this module adds no e2e step (nonfiction file paths used by the mock script stay stable).
- **Real models:** manual eval cases per tool go into the Agent loop's manual eval script (small and larger local model): citation presence for workhorses, voice separation for Dialogue. If the script doesn't exist yet, add the cases as a data file the script will read.

### Sample sourcing
All sample prose and entity text is original writing for Scriba under the repo's licence. Nonfiction sources follow the Project store's skeleton (may use public-domain excerpts); nonfiction entities only summarise and cite those sources, never adding facts they lack. The fiction sample is wholly original. No copyrighted excerpts and no invented quotes from real living people. Both samples exclude `.scriba/`, `logs/`, `snapshots/` and `drafts/.versions/`.

### Out of scope
- Loading, copy-on-write editing, lint-on-save, the tool-spec UI, view emission (Tool registry); running tools, citations, provenance, grounding (Agent loop); running recipes (Graph runner).
- Per-project `tools/`, a field DSL, per-tool model choice (deferred). New output kinds; screenplay or memoir packs; tier-4 tools.
- A dedicated Remix comparison view (comparison uses the review diff). A nonfiction story graph.
- Replaced: Zod for tool inputs → JSON Schema; Scene and Plot beat entity types → story nodes; `structure/` → `drafts/`; Merge/Compare/Gate and entity nodes in recipes → input/tool/output only; React/React Flow node components → registry-derived nodes on ngx-vflow; Chapter entity type → dropped (a chapter is a `drafts/` file; order lives in `project.yaml` or `order` relations; status in Compile & export's manuscript view; throughline passed as `coreIdea`).

### Further notes
- `[@id]` is Pandoc citation syntax, so Compile & export can later render citations with citeproc and the broken-entity-link preflight can check them; this module requires neither.
- Propose-graph is in the first phase although M7 also demos it; that phase lays the pack foundation M2 depends on. If Graph runner's contract lags, that phase is M2's critical path.


---

## Agent loop

The Agent loop is a plain tool-calling loop over the Model providers client behind a phone-friendly chat panel. The author types an intent; the loop sends it with a project summary and tool schemas, runs tool calls (project, narrative, research, compile families), streams tokens and tool-call cards over the shared SSE stream, retries malformed calls twice, turns every write into a **pending change**, runs a **grounding check** after any draft (extract → retrieve from `sources/` → judge), writes transcripts to `logs/`, and exposes current-run-state for devices that slept.

**Glossary.** A **run** (recipe run) is one execution of a recipe. One pass of this loop is always an **agent run**, never a bare "run". Code identifiers may use `run` (e.g. `runId`) since they're scoped to `agent-loop`.

### Ordering

AGL-25 (the manual real-model eval script) is not in a gate; it lands right after `phase:file-tools-chat` so Genre packs can add per-tool cases.

Gates are unchanged. Units wait only on what they use: `search_notes` (AGL-10) needs only Project store search; the write overlay (AGL-12) needs the loop and the Project store's `propose` (PST-15), not the narrative phase; the grounding engine (AGL-16) needs search and the overlay; research tools (AGL-21/22) need only the loop and settings, while the research gate still waits for `phase:grounding`. Content (the grounding-claims sample, AGL-19) and UI pieces built against the Shell's fakes run in parallel with their API units.

### Dependency graph

```
AGL-01 contract slice  ══> phase:contract
 ├─ AGL-02 built-in tool framework (Ajv, readable errors, retries, withdrawal) + list_files / read_file (PST-12)
 ├─ AGL-06 agent settings section + settings API
 └─ AGL-07 chat panel UI (Shell core + tool-call card SHL-10; fakes)
 AGL-03 loop core: start, steps, cap, continue, stop, one-active, project switch, events (needs 02, 06, MPR-08)
  ├─ AGL-04 transcripts, conversation history, context trimming
  └─ AGL-05 current-run-state + seq reconcile
 AGL-08 file-tools-chat gate (mock "summarize my outline", e2e agent-run step)  ══> phase:file-tools-chat
 AGL-25 manual eval script
 AGL-09 narrative tools: registry functions, entity resolution, citations, provenance (TRG-12)
 AGL-10 search_notes (PST-13)
 AGL-11 narrative gate (GNP-12)  ══> phase:narrative-tools
 AGL-12 write_file / edit_file overlay, captured base, propose at end (PST-15)
 AGL-13 output routing by kind + target arg + graph validation (needs 09, 12, GRR-01)
 AGL-14 diff previews on write cards + review link (SHL-12)
 AGL-15 pending-writes gate (e2e accept change, PST-22)  ══> phase:pending-writes
 AGL-16 grounding engine: extract → retrieve → judge, result, claims artefact (needs 10, 12)
 AGL-17 grounding wiring: auto after drafts, check_grounding, on-demand action, summary on pending change
 AGL-18 grounding badges UI
 AGL-19 sample grounding-claims draft + mock scripts (PST-11, GNP-11)
 AGL-20 grounding gate  ══> phase:grounding
 AGL-21 web_search (SearXNG) + research toggles │ AGL-22 fetch_page with network refusals
 AGL-23 research gate  ══> phase:research
 AGL-24 compile tools (Compile & export phase:assembly-preflight + phase:export)  ══> phase:compile-tools
```

### Parallelism
- After AGL-01: AGL-02, AGL-06, AGL-07 in parallel; after AGL-03: AGL-04, AGL-05 in parallel.
- After AGL-08: AGL-09, AGL-10, AGL-12, AGL-25 in parallel; AGL-19 any time after its content gates.
- After AGL-12: AGL-13, AGL-14, AGL-16 in parallel; AGL-18 against fakes any time after AGL-07.
- AGL-21 and AGL-22 in parallel after AGL-08.

### Cross-cutting decisions
- **Module shape:** NestJS `@Module` at `apps/api/src/modules/agent-loop/`, lazy `Routes` at `apps/web/src/app/features/agent-loop/`. API under `/api/agent-loop/…`, behind Setup & auth's guard; GET never mutates; commands are POSTs. Chat UI route `/projects/:projectId/chat` (project-scoped, minimum class `phone`).
- **It never calls the Graph runner and is never called by it** (Platform's boundaries lint bans the imports). Graphs only arrive as `graph` outputs that become pending changes; the agent never starts, stops or watches a recipe run.
- **Dependencies:** Model providers client (resolution of per-project override or app default; transport retries live there, the loop adds none); Project store file, search, pending-change API and in-process helpers; Tool registry catalog and executor; later Compile & export API.
- **Reserved built-in function names:** `list_files`, `read_file`, `write_file`, `edit_file`, `search_notes`, `check_grounding`, `web_search`, `fetch_page`, `assemble_manuscript`, `run_preflight`, `export_manuscript`. A registry tool clashing with one is left out and reported once in the transcript.
- **Built-in tool argument schemas** are JSON Schema, Ajv-validated, with the same readable-error format as registry tools.
- **Writes:** every agent write, and every draft/entity/graph output, becomes a pending change. The **only** direct writes are to `logs/` (transcripts via `appendLog`, claims artefacts via `write`) — the app's own records, not book content.
- **Provenance** lives on the pending change and in the transcript, not in draft front matter (scene files need no front matter; Compile reads drafts as they are). An optional front-matter block could be added later via expand–contract.
- **Only `sources/` is grounding evidence.** Fetched web pages and entities never ground a claim until saved into `sources/` through a pending change.
- **`settings.yaml`:** this module owns the `agent` section `{schemaVersion: 1, stepCap, research: {enabled, searchEndpoint?}}`. Per-tool enable switches belong to the Tool registry.
- Error codes (Platform convention): `AGENT_RUN_ACTIVE`, `AGENT_NO_PROVIDER`, `AGENT_NO_ACTIVE_PROJECT`, `AGENT_RUN_NOT_FOUND`.

### Testing principles
- External behaviour only: HTTP responses, SSE events, files on disk, and the requests the mock model receives — never internal services or message-building helpers.
- Primary seam: the composed app (Platform's `create-test-app`) with real neighbours against a temp library and Platform's mock OpenAI server, with scripted turns (normal list → read → text; malformed arguments; endless tool-call loop; slow stream; narrative tool with entity IDs; write and edit; propose-graph valid/invalid; grounding extract and judge).
- Assertions: SSE events in `seq` order matching the contract; the mock's received request (tool list, with research and disabled tools absent); pending changes in the Project store with untouched files on disk; transcript lines matching the schema; claims artefacts; current-run-state mid-run; `AGENT_RUN_ACTIVE` on a second start.
- Research tests use a local HTTP server and a local SearXNG-shaped stub, never the internet.
- UI seam: the chat route with Angular's Vitest runner against the Shell's fakes (SHL-07).
- System seam: this module turns on the e2e "agent run" step (M1) and, with the Project store, the "accept change" step (M3).
- Real models: the manual eval script (AGL-25), not CI.

### Out of scope
- Executing tools (Tool registry); path safety, the three-way check, applying pending changes, draft versions and the review queue UI (Project store); the tool-call card and diff components (Shell).
- Anything to or from the Graph runner beyond creating graph pending changes.
- Per-tool model choice, native provider adapters, vector/semantic search; a run-log index over `logs/`.
- Promoting grounding verdicts into Claim entities automatically (the author can ask the agent to write Claim entities, which become pending changes).
- Agent tools for reorder, snapshot create/restore, or settings changes.
- Parallel tool calls, sub-agents, more than one active agent run per project.
- Grounding against web pages or entities.
- Replaced: Zod tool inputs → JSON Schema + Ajv; React/Fastify → Angular/NestJS; `structure/` folder → `drafts/` files and story-graph beats, order from `project.yaml` or `order` edges; a canvas grounding Gate node → grounding as a built-in loop step; SQLite run-log index → `logs/` as source of truth; pending changes only for `drafts/` → for any folder (the author's own typing still saves directly).

### Further notes
- M3 is split into `phase:pending-writes` and `phase:grounding`: writes can't exist before the Project store's review phase, so M1 ships only `list_files` and `read_file`, and M2 shows drafts in the chat until M3 routes them to pending changes.
- Compile tools are in v1 but land at M7, after research; they need Compile & export's implementation (M5) and no earlier demo needs them.
- The claims artefact lives in `logs/` so Compile & export's preflight reads it as a file, with no Agent loop dependency; Compile & export consumes the grounding result shape from `/agent-loop`.
- Fetched pages are untrusted; even if one steers the model, every resulting write still needs the author's acceptance, and grounding never trusts them.


---

## Graph runner

The Graph runner gives the author an `ngx-vflow` canvas with two views over one JSON graph file format in `graphs/`: an inert **story graph** (entity, scene and beat nodes joined by relations, pointing at real files) and a runnable **recipe** (input, tool and output nodes joined by typed wires). It owns the graph schema, port-id convention, relation vocabulary, graph CRUD, recipe validation, the sequential run engine, run state, node-status events, run logs and the canvas UI. Output nodes create **pending changes** with a captured base; nothing a run produces touches files until the author accepts it.

### Ordering

Phase gates are unchanged. Inside `phase:engine`, graph CRUD and validation need only Project store `phase:files` and the Tool registry catalog, so they start before the Project store's review phase closes; output nodes (GRR-06) need the Project store's `propose` (PST-15) to build, and the engine gate waits for Project store `phase:pending-review` (PST-22). Inside `phase:canvas`, the adapter layer and story view need only the contract and Shell `phase:core`, so they run alongside the engine; the sample recipe is content and runs alongside everything once the workhorses ship.

### Dependency graph

```
GRR-01 contract slice + example fixtures  ══> phase:contract
 ├─ GRR-02 module, graph CRUD, newer-version refusal (PST-12, SAU-08)
 ├─ GRR-03 recipe & story validation + validate endpoint (TRG-11 catalog)
 │    └─ GRR-04 run engine core: scope, refusals, inputs, reads, topo run, executor calls, run state, SSE (TRG-12, PLT-12)
 │         ├─ GRR-05 stop, fail-fast, project-switch stop
 │         ├─ GRR-06 output nodes → pending changes + graphs/ validator registration (PST-15)
 │         └─ GRR-07 run logs + restart recovery
 GRR-08 engine gate (PST-22)  ══> phase:engine
 GRR-09 graphs route, list, latest run status, phone gate (needs 02 + Shell core)
 GRR-10 ngx-vflow adapter layer, both views, save (needs 01 + Shell core)
  ├─ GRR-11 tool nodes from registry, palette, typed handles, wire rejection, live validation (TRG-05, 03)
  │    ├─ GRR-12 entity side list + chip drop
  │    └─ GRR-13 run controls, input-values dialog, live status & results (04–06, PST-20)
  └─ GRR-14 story view extras + Arrange
 GRR-15 touch, Material styling, large-graph measurement (needs 11, 12, 14)
 GRR-16 nonfiction sample recipe (Genre packs phase:nonfiction-workhorses, PLT-21)
 GRR-17 canvas gate: e2e extension, iPad check, demo  ══> phase:canvas
```

### Parallelism
- After GRR-01: GRR-02, GRR-03, GRR-10 in parallel (each behind its own external gate); GRR-16 authoring can start once the workhorse specs exist.
- After GRR-04: GRR-05, GRR-06, GRR-07 in parallel.
- After GRR-10: GRR-11 and GRR-14 in parallel; after GRR-11: GRR-12 and GRR-13 in parallel.

### Cross-cutting decisions
- **Ownership:** one NestJS `@Module` at `apps/api/src/modules/graph-runner/` and one lazy `Routes` array at `apps/web/src/app/features/graph-runner/`.
- **It never calls the Agent loop, and the Agent loop never calls it** (Platform's boundaries lint enforces the import ban). The only bridge is a graph file: propose-graph output arrives as a pending change through the Project store and, once accepted, is an ordinary graph file.
- **It never runs a story graph.** Compile & export reads story graphs itself using the published schema (only edges whose relation is exactly `order`).
- All graph file access goes through the Project store's in-process file API (`read`, `list`, `write`, `delete`, `move`), so path safety applies. All routes act on the active project.
- **HTTP:** `/api/graph-runner/graphs` (list, get, create, save, rename, delete, validate) and `/api/graph-runner/runs` (start, stop, current run state). Reads are GETs and never mutate; every command is a POST. Behind Setup & auth's guard.
- **Validation in one place.** The canvas's live validation calls the module's validate endpoint (debounced POST with the unsaved graph) instead of duplicating the rules in the browser, so the server rules are the only implementation. Wire-type rejection while dragging and chip-drop checks stay client-side, because they only need the port descriptors.
- **Errors** (`GRAPH_` prefix): `GRAPH_NOT_FOUND`, `GRAPH_SCHEMA_INVALID`, `GRAPH_SCHEMA_VERSION_UNSUPPORTED`, `GRAPH_VALIDATION_FAILED`, `GRAPH_VIEW_NOT_RUNNABLE`, `GRAPH_RUN_ACTIVE`, `GRAPH_RUN_NOT_FOUND`, `GRAPH_INPUT_MISSING`, `GRAPH_INPUT_INVALID`, `GRAPH_TARGET_INVALID`.
- **Model providers:** used only indirectly, through the Tool registry executor.
- **Design choices** (each the simplest option, widenable via expand–contract): six node statuses; nodes run one at a time; fail-fast on error; one active run per project; fixed port keys `out`/`in` and the tool-node `output` key from the Tool registry; output target precedence (request → `params.path` → generated name); pinned port values in `params`; `logs/recipe-runs/` as the log location; graph id = file stem.
- **Provenance:** every recipe draft records the entity IDs and tool run behind it via the pending change's `recipe-run` origin (`runId`, `graphId`, `nodeId`), its `provenance` (`entityIds`, `sourcesUsed`) and the run log.

### Testing principles
- External behaviour only: HTTP responses, SSE events, files on disk, the rendered route — never internal services, scheduler data structures or `ngx-vflow` internals.
- API seam: the composed app (Platform's `create-test-app`) against a temp library with an active project and Platform's mock OpenAI server; scripted mock turns supply success, malformed-argument and slow responses.
- Contract seam: Vitest over the Zod schemas with the example graph files; Platform's CI check validates `examples/` graphs (PLT-21, PLT-22).
- UI seam: the lazy route with Angular's Vitest runner against the Shell's fakes (SHL-07).
- Gesture checks: the DOM test environment has no layout, so real gestures (wires, drops, touch) are checked by a canvas-gesture Playwright spec (desktop and touch-emulated) and this module's e2e step.
- Manual: a real-iPad Safari check and one recorded large-graph measurement.
- Prior art: the throwaway canvas spike (`spike/canvas-library-8` branch, `prototypes/canvas-spike/e2e/spike.cjs`) is reference only; its story and recipe fixtures were filler, not semantics. Unit tests never read `examples/`.

### Out of scope
- Running story graphs, or running a scene through an attached recipe.
- Saved links between the views (no story node inside a recipe or vice versa); the only bridge is choosing a file as an input value.
- Merge, Compare and Gate nodes, entity nodes in recipes, note nodes, branch or loop nodes (recipes have input, tool and output nodes only; entity values arrive as input values or pinned chips).
- Reusing results from earlier runs; running independent branches in parallel.
- Output nodes for `claims` and `check` outputs (inline and logged only in v1 — writing them into `drafts/` would put them in the manuscript; the smallest later addition is a mapping to a report folder outside `drafts/`, additive to validation and output mapping with no schema change).
- Generating graphs from typed intent (propose-graph in Genre packs' core pack, called by the Agent loop).
- Sections or heading anchors inside a scene file; `scenes/`, `beats/` or `structure/` folders.
- A SQLite run-log index (deferred; `logs/` is the source of truth).
- Smart auto-layout beyond the layered Arrange; collaborative editing; canvas editing on phones.
- Replaced: React + React Flow (now Angular + `ngx-vflow`); Zod tool inputs (now JSON Schema + Ajv from the Tool registry); `DECISIONS.md` (now `docs/adr/`); output nodes writing drafts directly (now pending changes).

### Risks carried into `phase:canvas`
- Real tablets and Safari, Material styling, large graphs and layout weren't tested in the canvas library evaluation; each is an acceptance criterion or recorded check.
- Slower `ngx-vflow` releases and its open reports are an accepted cost. The graph JSON is the contract, so the renderer can be swapped as a UI change; `@foblex/flow` also passed every check and is the fallback.
- Whether a node updates live when its tool spec changes wasn't tested; the canvas re-derives ports when it loads a graph. Live update while a graph is open is not required in v1.


---

## Compile & export

Compile & export turns every top-level `.md` file in `drafts/` into one manuscript: it computes the **effective order** (`project.yaml` order field, story-graph `order` relations as a leading block, alphabetical fallback), runs five **model-free preflight checks**, **exports** Markdown, DOCX (standard manuscript layout), EPUB and PDF (Typst) through Pandoc 3.13, manages **snapshots** of the manuscript, and ships the **manuscript view**.

### Ordering

Gates are unchanged. Inside phases, units wait only on what they use: the five preflight checks split into three parallel units over one shared endpoint; DOCX, EPUB and PDF each get their own unit over one shared Pandoc runner; the snapshot API needs only order writes (not the export phase); the manuscript UI is built against the Shell's fakes in parallel with the API. The milestone gate (CEX-20) still waits on `phase:export`.

### Dependency graph

```
CEX-01 contract slice + project.yaml order/export narrowing  ══> phase:contract
 ├─ CEX-02 module, membership, effective order, parts, word counts, GET manuscript (PST-12, SAU-08)
 │    ├─ CEX-03 reorder / status / part writes with revision, manuscript-updated
 │    ├─ CEX-04 assembled-Markdown builder (metadata, matter, bibliography) (GNP-03)
 │    └─ CEX-05 preflight endpoint + placeholders check
 │         ├─ CEX-06 unsupported-claims + orphan-scenes checks (AGL-01, GRR-01)
 │         └─ CEX-07 entity-links + banned-phrases checks
 ├─ CEX-08 nonfiction sample order field, statuses, export settings (PST-11)
 └─ CEX-17 manuscript route UI: outline, drag, status/part, totals, phone (Shell core; fakes)
 CEX-09 assembly-preflight gate + exported in-process service  ══> phase:assembly-preflight
 CEX-10 Pandoc runner, md export, download, busy/timeout/errors, CI Pandoc+Typst (needs 04, 05)
  ├─ CEX-11 DOCX + standard-manuscript reference doc │ CEX-12 EPUB + stylesheet │ CEX-13 PDF via Typst + spike ADR
  └─ CEX-14 template overrides, copy default, export settings endpoints (needs 03)
 CEX-15 export gate: image smoke step (PLT-15, PLT-19)  ══> phase:export
 CEX-16 snapshot API: create, list, restore, manifest, pre-restore (needs 03)
 CEX-18 preflight panel, export buttons + confirm, export settings panel (needs 17)
 CEX-19 snapshots panel (needs 17)
 CEX-20 milestone gate: e2e manuscript step, Word/EPUB check, demo (PST-22)  ══> phase:manuscript-snapshots
```

### Parallelism
- After CEX-01: CEX-02, CEX-08, CEX-17 in parallel.
- After CEX-02: CEX-03, CEX-04, CEX-05 in parallel; after CEX-05: CEX-06, CEX-07 in parallel.
- After CEX-10: CEX-11, CEX-12, CEX-13 (and CEX-14 once CEX-03 is in) in parallel.
- CEX-16 runs alongside the export phase; CEX-18 and CEX-19 in parallel after CEX-17.

### Cross-cutting decisions
- **Module shape:** NestJS `@Module` at `apps/api/src/modules/compile-export/` (one import in the composition root) exporting an in-process service (view model, preflight, export) for the Agent loop's compile tools; lazy `Routes` at `apps/web/src/app/features/compile-export/` registered at `/projects/:projectId/manuscript` (minimum class `phone`).
- **HTTP:** `/api/compile-export/…`, behind Setup & auth's guard. GET/HEAD never mutate; reorder, status, part, preflight (a command even though it writes nothing), export, settings, snapshot create and restore are POSTs.
- **File access** goes through the Project store's in-process file API and path safety: `list`, `read`, `write`, `delete` for drafts and snapshots (file by file), and `updateProjectYaml` for the `order` and `export` keys. The one exception: export output is written with plain `fs` under `stateDir(projectId, 'compile-export')`.
- **Never** reads or writes `drafts/.versions/`; **never** runs a graph (reads only story-graph `order` edges); **never** calls a model.
- **Manuscript membership:** every top-level regular file with a `.md` extension in `drafts/`; subfolders (including `.versions/`) and hidden files are skipped; non-Markdown files are left out (reference them from Markdown).
- **Events** (Platform envelope, `module: 'compile-export'`): `manuscript-updated`, `export-finished`, `snapshot-created`, `snapshot-restored`.

### Settled decisions (do not reopen)
- Graph-ordered files form a **leading block** ahead of the other body files.
- **All story graphs** in `graphs/` are unioned.
- **Status and part live on order entries** (not front matter).
- **Every order write materialises the full order.**
- Front/back matter via `part`; title page and dedication from export settings; generated bibliography — no new folders.
- Membership limited to `.md` files.
- Exports kept under `<project>/.scriba/compile-export/exports/`.
- Restore deletes newer files, with a pre-restore snapshot as the safety net.
- Preflight is model-free and reads recorded grounding results.

### Testing principles
- External behaviour only: HTTP responses, SSE events, files on disk — never internal services, the topological-sort helper alone, or Pandoc's argument list. The order algorithm is tested through `GET` manuscript against fixture projects.
- Primary seam: the module in Platform's `create-test-app` with Setup & auth's guard, a temp library per test, fixture projects built in the test (drafts, `project.yaml` variants, story graphs including a branch, a same-file edge and a cycle, a grounding-result artefact, entities with broken references, a style profile with banned phrases). The mock OpenAI server runs only to prove no model calls. Unit tests never read `examples/`.
- Pandoc-dependent tests use real Pandoc 3.13 and Typst; locally they skip with a message when a binary is missing; CI sets a flag that turns the skip into a failure. DOCX and EPUB are checked structurally (XML, styles, spine, nav, metadata), never by byte goldens; PDF by header and engine; Markdown against a golden.
- UI seam: the manuscript route with Angular's Vitest runner against the Shell's fakes.
- Manual: the "done when" (three-chapter sample opened in Word and an EPUB reader) and the Typst spike review.

### Out of scope
- Reordering scenes inside a file, per-scene breaks (a file is one unit).
- Reading or restoring `drafts/.versions/` (Project store).
- Running graphs; writing to the story graph from the manuscript view.
- Starting a grounding check from preflight.
- A per-project placeholder list; CSL/citeproc; an index; cross-references.
- A TeX Live PDF image (the Typst spike may recommend it as follow-up only).
- Deleting/renaming snapshots in the app; snapshot diffing.
- Export in the Playwright e2e; epubcheck (no Java in the image).
- Publishing-platform uploads.
- Agent-initiated reorder (if ever exposed, any `project.yaml` write must become a pending change).
- Replaced: assembly from chapter files in outline order → effective-order rules over every top-level `drafts/` file; no `structure/` folder and no Chapter or Scene entity type; React/Fastify → Angular/NestJS; Zod tool inputs → JSON Schema + Ajv.

### Known cost
Renaming a draft file drops its order entry and status, and orphans its older versions in `drafts/.versions/`. A stable id could fix both later without breaking the versioning layout.
