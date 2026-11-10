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
- After AGL-02: AGL-10 once Project store search lands. After AGL-08: AGL-09, AGL-12, AGL-25 in parallel; AGL-19 any time after its content gates.
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
