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
- After GNP-01 + GNP-02: GNP-03, GNP-04, GNP-13 in parallel; GNP-06 after GNP-03.
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

Tools whose output is `entity`, `check` or `graph` take only the subset that makes sense (listed per unit). Entity inputs carry `x-scriba-type: entity`; where the input means a definite set of kinds, they also carry `x-scriba-entity-kinds` so the form, canvas and Ajv restrict them.

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
