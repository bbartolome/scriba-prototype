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
