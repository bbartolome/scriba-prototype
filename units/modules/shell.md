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
