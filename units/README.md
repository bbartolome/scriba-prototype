# Scriba — units of work

Every file in this folder is one **unit of work**: one PR with self-contained context and its own acceptance criteria. The units replace the per-module specs (`specs/*.md`, deleted after conversion). This README is the single index: the shared conventions and the phase table. Each module has its own file in [`modules/`](../modules/) at the repo root (linked from the table below) with its ordering notes, dependency graph, parallelism and the decisions every unit in that module inherits.

## Modules

| Prefix | Module (as named in blockers) | Slug (contracts subpath, `/api/<slug>/…`, `features/<slug>/`) | Wave | Milestones |
|---|---|---|---|---|---|
| `PLT` | [Platform](../modules/platform.md) | `platform` | 0 | M1–M2 (examples check through M6) |
| `SHL` | [Frontend shell](../modules/shell.md) | `shell` (no API, no events, empty slice) | 1 | M1–M3, M7 |
| `SAU` | [Setup & auth](../modules/setup-auth.md) | `setup-auth` | 1 | M1–M3 |
| `MPR` | [Model providers](../modules/providers.md) | `providers` (UI route `/providers`) | 1 | M1–M2 |
| `PST` | [Project store](../modules/project-store.md) | `project-store` | 1 | M1–M3, M7 |
| `TRG` | [Tool registry](../modules/tool-registry.md) | `tool-registry` | 1 | M2 |
| `GNP` | [Genre packs](../modules/genre-packs.md) | `genre-packs` (content only, empty slice) | 1 (nonfiction), 3 (fiction) | M2, M6, M7 |
| `AGL` | [Agent loop](../modules/agent-loop.md) | `agent-loop` | 2 | M1–M3, M7 |
| `GRR` | [Graph runner](../modules/graph-runner.md) | `graph-runner` | 2 (contract in wave 1) | M4 |
| `CEX` | [Compile & export](../modules/compile-export.md) | `compile-export` | 2 | M5 |

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
- `blocked_by` is the source of truth. `unblocks` is its exact inverse: every unit whose `blocked_by` names this unit (bare id in the same module, `"<Module> <title> (<ID>)"` across modules). `parallel_with` is symmetric and never pairs a unit with one it depends on, directly or transitively.
- Quoted entries without a unit id (`"wave-1 modules"`, `"Agent loop M1 demo"`) are informative only.

## Phase gates

A phase **closes when its gate unit is merged** (the gate is the phase's last unit and waits on the rest; Platform's `phase:examples-check` and Frontend shell's `phase:shared-components` and `phase:editor` have no gate unit and close when all their units are merged). By convention a producer's first phase is `phase:contract`, a single unit that publishes the module's slice of `@bbartolome/scriba-contracts` (Platform's is `phase:scaffold`; Frontend shell and Genre packs have none). Inside a phase, units wait only on what they use, so many start before the previous phase's gate closes; each module's **Ordering** section lists the cases.

| Module | Phase | Milestone | Units | Gate | Notes |
|---|---|---|---|---|---|
| Platform | `phase:scaffold` | M1 | PLT-01 … PLT-11 | PLT-11 | Platform's contract phase; publishes `/platform`. Every module's first phase names it |
| Platform | `phase:test-harness` | M1 | PLT-12, PLT-13 | PLT-13 | Mock OpenAI server and Playwright e2e harness |
| Platform | `phase:image-compose` | M1 | PLT-14, PLT-15 | PLT-15 | Release track |
| Platform | `phase:smoke` | M1 | PLT-16 | PLT-16 | Release track; ST-1 outcome may change compose |
| Platform | `phase:installer` | M1 | PLT-17, PLT-18 | PLT-18 | Release track |
| Platform | `phase:ci-publish` | M1 | PLT-19 | PLT-19 | Release track |
| Platform | `phase:examples-check` | M1 → M2 (extended through M6) | PLT-20 … PLT-22 | all three | PLT-21 (graph layer) and PLT-22 (pack layer) run in parallel; the phase closes when both are merged |
| Frontend shell | `phase:core` | M1 | SHL-01 … SHL-09 | SHL-09 | The gate every feature UI names |
| Frontend shell | `phase:shared-components` | M1, M2 | SHL-10 … SHL-12 | all three | Card and preview may merge first and are usable at M1; read-only diff at M2. Consumers adopt each component as soon as its unit merges |
| Frontend shell | `phase:editor` | M3 | SHL-13 … SHL-16 | all four | |
| Frontend shell | `phase:polish` | M7 | SHL-17 … SHL-19 | SHL-19 | |
| Frontend shell | `phase:phone-toolbar` | M1 | SHL-20 | SHL-20 | The toolbar fits 390 px with the connection label showing; Setup & auth's phone unit (SAU-06) waits for it |
| Frontend shell | none (ungated) | M1 | SHL-21 | — | The Shell's contract loader reads the CommonJS default export; Setup & auth's gate (SAU-08) waits for it |
| Frontend shell | none (ungated) | M1 | SHL-22 | — | Explicit wait timeouts in the specs that wait on a lazy load or an async settle; test-only, nothing waits for it |
| Frontend shell | none (ungated) | M4 | SHL-23 | — | The phone bottom nav fits its ten items at 390 px (links shrink, labels truncate); blocked by SHL-05; Platform's PLT-23 waits for it |
| Setup & auth | `phase:contract` | M1 | SAU-01 | SAU-01 | |
| Setup & auth | `phase:token-guard` | M1 | SAU-02 … SAU-08 | SAU-08 | "Setup & auth minimal token" |
| Setup & auth | `phase:setup-flow` | M2 | SAU-09 … SAU-16 | SAU-16 | |
| Setup & auth | `phase:tailnet` | M3 | SAU-17 … SAU-21 | SAU-21 | Phone review over the tailnet |
| Setup & auth | none (ungated) | M1 | SAU-22 | — | Dev mode (`SCRIBA_DEV_AUTH`) skips the guard's cookie and Origin checks for local runs; nothing waits for it |
| Model providers | `phase:contract` | M1 | MPR-01 | MPR-01 | |
| Model providers | `phase:client` | M1 | MPR-02 … MPR-08 | MPR-08 | Ollama default works |
| Model providers | `phase:settings-ui` | M2 | MPR-09 … MPR-11 | MPR-11 | |
| Model providers | `phase:project-override` | M2 | MPR-12, MPR-13 | MPR-13 | |
| Project store | `phase:contract` | M1 | PST-01 | PST-01 | |
| Project store | `phase:files` | M1 | PST-02 … PST-12, PST-34 | PST-12 | PST-12 (the gate) does not wait on PST-24 or PST-34; PST-34 lands when Shell phase:editor closes (M3). |
| Project store | `phase:files` | M5 | PST-24 | PST-24 | PST-24 (byte-safe write) is needed by Compile & export's copy operations (CEX-14). |
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
| Agent loop | `phase:research` | M7 | AGL-21 … AGL-23, AGL-26 | AGL-23 | AGL-23 (the gate) does not wait on AGL-26 (split from AGL-21 on 2026-11-20); AGL-26 lands after AGL-21 and AGL-22. |
| Agent loop | `phase:compile-tools` | M7 | AGL-24 | AGL-24 | |
| Graph runner | `phase:contract` | M4 (lands in wave 1) | GRR-01 | GRR-01 | |
| Graph runner | `phase:engine` | M4 | GRR-02 … GRR-08 | GRR-08 | |
| Graph runner | `phase:canvas` | M4 | GRR-09 … GRR-17 | GRR-17 | Milestone demo |
| Compile & export | `phase:contract` | M5 (lands early in wave 2) | CEX-01 | CEX-01 | |
| Compile & export | `phase:assembly-preflight` | M5 | CEX-02 … CEX-09 | CEX-09 | Assembly order needed by Genre packs' fiction gate |
| Compile & export | `phase:export` | M5 | CEX-10 … CEX-15 | CEX-15 | |
| Compile & export | `phase:manuscript-snapshots` | M5 | CEX-16 … CEX-20 | CEX-20 | Milestone demo |

Ungated: AGL-25 (manual real-model eval script), which lands right after Agent loop `phase:file-tools-chat`.
SHL-21 (the Shell's contract loader reads the CommonJS default export), which lands after Frontend shell `phase:core` and unblocks Setup & auth's gate SAU-08.
SHL-22 (explicit wait timeouts in the load-sensitive specs), which blocks nothing and can land at any time.

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
