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
