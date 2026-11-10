# Spec: Tool registry

## Problem Statement

The author wants narrative tools such as cold open, mystery question, myth-buster and numbers-to-people that draw on their own material, cite what they used, and can be changed without touching code. Each tool has to be usable in three places: the agent picks it as a function, the author fills it in as a form, and a recipe places it on the canvas as a tool node with typed ports. If those three views are written by hand they drift apart. A small local model would then get a function schema that no longer matches the form, or a tool node would accept a wire the tool can't use.

Small local models also send malformed arguments. If those arguments are not checked against the tool's schema and turned into an error the model can read, the model either silently gets a bad draft or the run ends with a stack trace. The author also needs a way to switch off tools they don't want the agent to see. And when they customise a built-in tool, an image update must not overwrite that copy.

## Solution

The Tool registry treats every narrative tool as data. A tool is one YAML **tool spec**: a name, a one-line description, inputs written as a conservative JSON Schema draft-07 subset with `x-scriba-*` hints, an output kind from the fixed enum, an `enabled` default, a prompt template and a `schemaVersion`. The registry turns that one document into all three views:

- **the model function schema**, with every `x-` key stripped;
- **a form descriptor**, which the registry's Angular form renderer draws as a form or as the body of a tool node;
- **a port descriptor** for the canvas: typed input ports from the fields marked `x-scriba-port`, the non-port controls as `params`, and one output port.

The registry loads built-in packs from the image (`/opt/scriba/packs/{core,nonfiction,fiction}`) and the author's user pack from `/books/.scriba/packs/user/`. Editing a built-in tool saves a copy in the user pack, and the user copy wins by name. Every save is linted, and errors block it.

The registry also **calls tools** (see "Who calls whom"). It validates the arguments with Ajv and returns a readable error if they are bad. It renders the pure Handlebars-like template with entity contents the caller has already resolved, calls the model through the Model providers client, and returns `{output, sourcesUsed}`. Sources used are computed from the input entity IDs. The Agent loop and the Graph runner both call the registry and never each other.

Authors get a Tools page. It lists every tool with a per-tool enable switch, and it has a YAML editor that lints on save. Beside the editor are live previews of the form, the tool node, the function schema and the rendered prompt, plus a Try panel that calls the tool against the active project.

## User Stories

1. As an author, I want every narrative tool to be a plain YAML file, so that I can read and change a tool without writing code.
2. As an author, I want each tool to carry a one-line plain description, so that the model chooses tools well and I can scan the list quickly.
3. As an author, I want a tool's inputs declared once, so that the agent's function, my form and the canvas node always agree.
4. As an author, I want a new tool spec to give me a form, a tool node and an agent function automatically, so that adding a tool is a single file and not a code change.
5. As an author, I want entity inputs to show a picker that lists only the right kind of entity (people for cold open, claims for myth-buster), so that I never pick the wrong kind of file.
6. As an author, I want inputs that take several entities to let me pick several, so that a tool can draw on two people or three claims at once.
7. As an author, I want a style-profile input that defaults to my project's style profile, so that tools write in my voice without my choosing it every time.
8. As an author, I want controls such as tone and length to appear as selects, sliders or short text fields, so that filling in a tool is quick on desktop and tablet.
9. As an author, I want required fields marked and defaults pre-filled, so that I know what I must supply.
10. As an author, I want a bad value in a form to show a clear message next to the field, so that I can fix it before calling the tool.
11. As an author, I want a tool node on the canvas to show typed input ports for its text, entity and style inputs and to keep its other settings in the node body, so that I can wire entities and drafts in and set tone and length on the node itself.
12. As an author, I want a wire to connect only ports of matching type, with one wire per input, so that the canvas stops me from building a recipe that can't run.
13. As an author, I want to drag a character or claim chip onto the matching port of a tool node, so that I can fill entity inputs with no typing.
14. As an author, I want to switch a tool off, so that the agent no longer sees it and recipes report it clearly instead of calling it.
15. As an author, I want the enable switch to survive app updates, so that an image update doesn't turn my disabled tools back on.
16. As an author, I want to open a built-in tool read-only and choose Customize, so that my edit becomes a copy in my user pack and the built-in stays intact.
17. As an author, I want my customised copy to win over the built-in of the same name, so that the agent and my recipes use my version everywhere.
18. As an author, I want Revert to built-in on a customised tool, so that I can drop my copy and return to the shipped version.
19. As an author, I want to compare my copy with the current built-in, so that I can see what an update changed in a tool I customised.
20. As an author, I want to create a new tool from a blank template or by duplicating an existing one, so that I can grow my own tool library.
21. As an author, I want to delete a tool I created, so that I can keep my user pack tidy.
22. As an author, I want my tool spec linted when I save, so that I learn about a broken schema, an unknown hint or a template typo straight away.
23. As an author, I want lint errors to block the save and warnings to let it through, so that a broken tool can never reach the agent while minor issues don't stop me.
24. As an author, I want each lint message tied to a line in the YAML editor, so that I can find the problem quickly.
25. As an author, I want a live preview of the form, the tool node and the function schema while I edit, so that I can see how a change affects all three views.
26. As an author, I want to preview the rendered prompt with sample values and real entities, so that I can check the template before calling the model.
27. As an author, I want a Try panel that calls the tool against my active project and shows the output and the sources used, so that I can test a tool while I edit it.
28. As an author, I want every tool result to list the entity files it drew from, so that I can trace any sentence back to its inputs.
29. As an author, I want a host-side edit to a file in my user pack to show up without a restart, so that I can edit tool specs in my own editor too.
30. As an author, I want an invalid file in my user pack to be listed with its errors rather than crash the app, so that one typo doesn't break every tool.
31. As an author, I want an invalid customised copy to fall back to the built-in, with a warning, so that the agent keeps working while I fix my copy.
32. As an author, I want a tool file written by a newer version of Scriba to be refused with a clear message, so that an older app never misreads it.
33. As an author on a phone, I want to see the tool list and flip enable switches, so that I can manage which tools the agent uses away from my desk.
34. As an author, I want tools from my project's genre pack, the core pack and my user pack to be the ones offered in a project, so that fiction tools don't clutter a nonfiction book.
35. As the agent (Agent loop), I want the function schemas of every enabled tool available to the active project, so that I can offer them to the model.
36. As the agent, I want a function schema with no `x-` keys and plain descriptions that say what kind of entity ID a field takes, so that the model gets standard JSON Schema and knows which IDs to pass.
37. As the agent, I want malformed arguments rejected with a short readable error that names each bad field and what it expected, so that I can return it to the model for one of its two retries.
38. As the agent, I want to learn which entity IDs a valid call references, so that I can resolve them through the Project store before calling the tool.
39. As the agent, I want the registry to report an unknown or wrong-kind entity ID in words the model can act on, so that the model can pick a valid ID on retry.
40. As the agent, I want one call that renders the template, calls the model and returns `{output, sourcesUsed}`, so that I only record citations and turn the output into a pending change.
41. As the agent, I want a tool call to stop when the author presses stop, so that a long model call doesn't keep running after a run is cancelled.
42. As the Graph runner, I want a port descriptor for each tool (input ports with key, type, list flag and required flag, plus one output port), so that I can draw tool nodes and check wires without reading JSON Schema myself.
43. As the Graph runner, I want to validate a tool node's `params` on their own, without its port inputs, so that I can flag a bad recipe when it loads and before it runs.
44. As the Graph runner, I want to call a tool with the values carried by its wires and its `params`, so that each tool node in a run becomes one tool call.
45. As the Graph runner, I want the registry's form component to fit inside an ngx-vflow node, so that a tool node hosts the same fields and entity picker as the form.
46. As a Genre packs author, I want a documented pack layout, field list and hint vocabulary, so that I can write the workhorse tools and entity-type schemas against a stable target.
47. As a Genre packs author, I want CI to lint every built-in pack file, so that a broken shipped tool fails the build instead of reaching authors.
48. As a Genre packs author, I want entity kinds named in `x-scriba-entity-kinds` checked against the known entity types, so that a typo in a kind is caught.
49. As a developer, I want the tool-spec shape, hint vocabulary, port-type enum, output enum and API shapes published in the contracts package first, so that Genre packs, Agent loop and Graph runner can start before the registry is implemented.
50. As a developer, I want the template language small and pure, so that rendering can never read files, call the network or run code.
51. As a developer, I want the registry to emit a `catalog-changed` event on the shared stream, so that open forms, canvases and tool lists refresh after a save or toggle.

## Implementation Decisions

**Module shape.** The registry is one NestJS `@Module` in `apps/api` and one lazy `Routes` array in `apps/web`. Each module lives in `apps/api/src/modules/<module>/` and `apps/web/src/app/features/<module>/`, and features register additively: the API root imports the `@Module`, and the web route table lazy-loads the `Routes` array through one entry. The API module exports two in-process services that the Agent loop and the Graph runner inject: the catalog (list, get, function schemas, port descriptors, validate) and the executor (render, call the tool). The web feature exports an Angular tool-form component, which renders as a full form or as a tool-node body, for the Graph runner's canvas to host. That component is an Angular API, not a contract.

**Pack layout and loading.**
- Built-in packs are read-only in the image under `/opt/scriba/packs/{core,nonfiction,fiction}`, built from `packages/packs`. `core` holds propose-graph.
- Each pack folder holds `tools/` (one YAML file per tool) and `entity-types/` (one YAML file per entity-type schema).
- The user pack is `/books/.scriba/packs/user/tools/`. In v1 the user pack holds tools only, not entity types. Tool YAML files are named `<name>.yaml`.
- The packs root is configurable through a `SCRIBA_PACKS_DIR` env name, defaulting to `/opt/scriba/packs`. Platform registers the name, and tests point it at fixtures.
- Built-in packs are loaded once at startup. The user pack is re-scanned whenever its `(path, mtime, size)` manifest changes, which is checked before each list, get or call. This mirrors the Project store's freshness rule, and no watcher is required.
- Name resolution is user > built-in. Two built-in packs that define the same name are a load error, and CI's pack lint catches it.
- If a user copy of a built-in tool fails lint, the built-in is used, and the list shows the user copy as invalid with a warning. A user-only tool that fails lint is listed as invalid and is not offered or callable.
- Tools offered for a project are the enabled, valid tools from `core`, from the project's genre pack (from `project.yaml`) and from the user pack.

**Tool-spec format (YAML, one file per tool).** Fields:
- `schemaVersion`: an integer, currently `1`. A file with a newer version is refused and listed with an error. Older versions migrate in memory when loaded, and are written back only when the author saves from the editor. The loader has the migration hook even though v1 has a single version.
- `name`: the identity and the model function name. Pattern: lower snake case, 1–64 characters, starting with a letter. The file name must be `<name>.yaml`.
- `description`: one plain line, at most 200 characters (lint error beyond that, and a lint error on newlines).
- `inputs`: a JSON Schema (draft-07 subset, below) whose root is `type: object`.
- `output`: one of `draft | entity | claims | graph | check`. This enum is final.
- `enabled`: a boolean default. The author's switch overrides it (see below).
- `prompt`: a block scalar holding the template.

**JSON Schema subset for `inputs`.**
- Root: `type: object`, `properties`, `required`, and `additionalProperties`, which is always treated as `false` (lint warns if the author sets it to `true`).
- Property types: `string` (`enum`, `minLength`, `maxLength`, `pattern`), `integer` / `number` (`minimum`, `maximum`), `boolean`, and `array` of string, integer or number items (`minItems`, `maxItems`, `uniqueItems`).
- Annotations: `title`, `description`, `default`.
- Not allowed: `$ref`, `oneOf` / `anyOf` / `allOf` / `not`, `if/then/else`, nested objects, `patternProperties`, and formats. Any keyword outside the subset is a lint error. This keeps every compliant schema valid for Ajv, for OpenAI-compatible function calling and for the form renderer.
- Property order in the YAML is the field order in the form and the port order on the node.
- The property key `output` is reserved for the output port.

**`x-scriba-*` hint vocabulary (closed: an unknown `x-scriba-*` key is a lint error).**
- `x-scriba-type`: `text | entity | style`, the element type of the field. `entity` requires `type: string` (one ID) or an array of string (a list of IDs). `style` requires `type: string` and means one style-profile entity ID. `text` requires `type: string`.
- `x-scriba-port`: `true` makes the field an input port on the tool node. It requires `x-scriba-type`. Fields without it are the node's `params`.
- `x-scriba-entity-kinds`: a list of entity kinds (the front-matter `type` value, e.g. `person`, `claim`) that the picker filters by and the executor enforces. It is only legal with `x-scriba-type: entity`. Lint warns when a kind isn't declared by any loaded entity-type schema.
- `x-scriba-control`: `text | textarea | select | slider | number | toggle | entity-picker | style-picker` overrides the control the renderer would pick. Lint rejects a control that doesn't fit the field's type, such as `slider` on a string.
- Other `x-` keys that don't start with `x-scriba-` get a lint warning and are stripped like the rest.

**Port derivation rule (owned here, consumed by the Graph runner).**
- Input ports are the properties carrying `x-scriba-port: true`, in property order.
- Each port has the property key, the port type taken from `x-scriba-type`, a `list` flag (true when the schema type is array), a `required` flag (true when the key is in `required`) and a display title.
- There is exactly one output port, with key `output` and type `text` in v1, and it carries the tool's output kind. The Graph runner builds port ids `<nodeId>.<key>` from these keys.
- Everything else becomes a `params` field. Port types are element types, so an entity port with `list` accepts a list. Wires carry one value per input, and the shape is checked by Ajv when the run starts.
- The output port type may be widened later through expand–contract. For example, an `entity` output could become an `entity` port.

**Emission: three views from one document.**
- **Function schema:** the OpenAI-compatible `{type: 'function', function: {name, description, parameters}}`.
  - `parameters` is `inputs` with every `x-` key removed and `additionalProperties: false`.
  - For entity and style fields, the emitter appends a short plain hint to the field description, e.g. "Entity ID(s) of kind person." or "Style-profile entity ID; defaults to the project's style profile." This keeps the kind information the model would otherwise lose when the `x-` keys are stripped.
  - Style fields are never required in the function schema.
- **Form descriptor:** an ordered list of fields, each with key, title, description, control, required, default, enum options, numeric bounds, the list flag, entity kinds, port flag and element type. The renderer needs nothing else.
- **Port descriptor:** the derivation above, plus the params field keys.
- All three are computed when a spec loads and are returned by get, so the web app never parses YAML or JSON Schema itself.

**Validation (Ajv).**
- Each valid spec's `inputs` is compiled once with Ajv in draft-07 mode, with `allErrors`, `useDefaults` and `strict`, and with no type coercion. Coercion stays off so that what the model sent is what gets checked.
- Bad arguments produce the `TOOL_ARGS_INVALID` error. It carries a model-readable `message` with a lead line naming the tool, then one line per issue naming the field, what was expected and what was received. Unknown fields are reported together with the list of allowed fields. It also carries a structured `issues` list `{path, message}` for forms.
- The two retries live in the Agent loop. The registry never retries.
- A successful validate returns the arguments with defaults applied, plus the entity IDs the caller must resolve. Each is tagged with its field and with whether it is a style field.
- A `params` mode validates only the non-port fields: port keys are removed from the input before validation (so a Graph runner tool node's pinned port values in `params` are neither rejected as unknown nor checked here; they are checked at run time in full mode), and required ports are ignored. The Graph runner uses it on recipe load, and the samples CI check uses it for recipes' tool references.

**Entity-type schemas.** The loader also reads each pack's entity-type schemas (`entity-types/<kind>.yaml`) and validates them. The envelope is `{schemaVersion, kind, title, description, folder, fields}`:
- `kind` is the front-matter `type` value (lower kebab-case, for example `style-profile`), and the file name must be `<kind>.yaml`;
- `folder` is `sources` or `entities`, the folder files of that kind live in;
- `fields` is a JSON Schema (`type: object`) over the front-matter keys the type adds on top of the Project store's base `{id, type, links}`. It uses the same subset as tool inputs, **plus one extension**: an `array` whose `items` is an `object` with scalar (`string | integer | number | boolean`) properties, `required` and `additionalProperties: false` (one level only; for lists such as a character's relationships). Unknown front-matter keys are allowed (`additionalProperties` is treated as `true` for entity front matter).
- Reference-valued fields carry `x-scriba-type: entity` and `x-scriba-entity-kinds`, the same hints as tool inputs (`x-scriba-port` and `x-scriba-control` are not allowed here).

Lint uses them to check `x-scriba-entity-kinds`, the loader exposes an Ajv validator per kind (used by Platform's examples check), and they are listed read-only. Their content belongs to the Genre packs spec.

**Template subset (pure, Handlebars-like).** The registry has its own small parser and renderer, not the Handlebars runtime. That keeps prototype access, partials and custom helpers out of reach, and it lets lint report exact line and column positions. Supported:
- `{{field}}`, which inserts a scalar as plain text with no escaping, joins an array with ", ", and renders nothing when absent;
- `{{#each field}} … {{this}} … {{@index}} … {{/each}}`;
- `{{#if field}} … {{else}} … {{/if}}`, for optional inputs such as tone;
- `{{entity id}}`, where `id` is a field or `this` inside `each`. It inserts the resolved entity as a short header line (kind, id, project-relative path) followed by the file's content;
- `{{toolCatalog}}`, which inserts the catalogue of currently enabled tools: name, one-line description, port keys with their port types, and output kind. It reads registry data only, never project files, so templates stay pure. The core pack's propose-graph tool needs it to build recipes (Genre packs spec);
- `{{!-- comments --}}`.

Nothing else parses. Lint rejects any variable that is not an input key, any `entity` helper applied to a non-entity or non-style field, and unbalanced blocks. It warns when a required input is never used. Rendering takes only the validated arguments and the caller-supplied entity contents, so it cannot read files or reach the network.

**Tool executor ("Who calls whom").**
1. Look up the tool. A disabled tool fails with `TOOL_DISABLED`, an invalid one with `TOOL_INVALID`.
2. Ajv-validate the arguments.
3. Check that every referenced entity ID has a resolved entity in the request (`TOOL_ENTITY_UNRESOLVED` if not) and that its `type` is in the field's kinds (`TOOL_ENTITY_KIND_MISMATCH` if not). Both errors have model-readable messages.
4. Render the template.
5. Call the model through the Model providers client, using the active project's model choice (app default or project override). The call sends one user message, the rendered prompt. Before it goes a short system message owned by the registry, one per output kind, that fixes the return format: Markdown prose for `draft`, a Markdown file with front matter for `entity`, one claim per line for `claims`, JSON only for `graph`, and findings for `check`.
6. Return `{output, sourcesUsed}`.

Details:
- `output` is `{kind, content}`. `content` is the model's final text, trimmed, with a single enclosing code fence removed for `graph`. The registry doesn't parse it further. The Graph runner's schema validates propose-graph output when it becomes a pending change.
- `sourcesUsed` lists the resolved entity references for the IDs in the `entity`-typed fields, de-duplicated, in property order. Style profiles are excluded because they shape voice, not evidence.
- The executor is non-streaming in v1 and accepts an abort signal. Transport retries stay in the client. Provider failures are wrapped as `TOOL_MODEL_ERROR`, with the provider's message kept.
- The executor never writes files. Callers turn output into pending changes (Project store) and record citations and draft provenance (Agent loop).
- A style field left empty is filled by the caller with the project's style-profile ref before resolving. The function schema describes this default.

**Per-tool enable switch.**
- The spec's `enabled` is the default. The author's override is stored in the Tool registry's `tools` section of `/books/.scriba/settings.yaml`, shaped `{schemaVersion: 1, enabled: {<toolName>: boolean}}` (only overridden tools appear). Platform owns the file envelope and the startup migration hook; this module registers its section and that section's migration steps.
- Toggling never creates a copy-on-write fork.
- Disabled tools are left out of function schemas, refused by the executor, still listed and editable, and still shown on the canvas, where the Graph runner reports the refusal for that tool node.

**Registry HTTP API** (all under `/api/tool-registry`, behind the Setup & auth guard; GET never mutates; every command is a POST, per Platform's convention). Per-tool routes sit under `/tools/:name` so that no tool name can collide with a fixed route:
- `GET /api/tool-registry/tools`: tool summaries. Each has name, description, output kind, effective enabled state, origin (`core | nonfiction | fiction | user`), which built-in it overrides if any, validity, and lint counts. An optional genre-pack filter is available.
- `GET /api/tool-registry/tools/:name`: the effective spec, its YAML source, origin, lint result and the three emitted views.
- `GET /api/tool-registry/tools/:name/builtin`: the built-in original of a customised tool, used for compare and revert.
- `GET /api/tool-registry/functions`: the function schemas offered to the active project.
- `GET /api/tool-registry/entity-types`: the loaded entity-type schemas.
- `POST /api/tool-registry/lint`: lints submitted YAML and writes nothing.
- `POST /api/tool-registry/tools/:name/save`: lint, then write to the user pack. This is copy-on-write for built-ins. Lint errors return 422 with `TOOL_SPEC_LINT_FAILED` and the lint result in `details`.
- `POST /api/tool-registry/tools/:name/delete`: removes a user copy (revert) or a user-only tool. A built-in without a user copy returns `TOOL_BUILTIN_READONLY`.
- `POST /api/tool-registry/tools/:name/enabled`: `{enabled}` sets the override.
- `POST /api/tool-registry/tools/:name/validate`: full or `params` mode.
- `POST /api/tool-registry/tools/:name/render`: arguments plus resolved entities, returning the rendered prompt. No model call.
- `POST /api/tool-registry/tools/:name/execute`: arguments plus resolved entities, returning `{output, sourcesUsed}`. It writes no files. The Try panel and tests use it, and the in-process callers use the same service.

**SSE.** The registry publishes one event member on the Platform envelope: `{module: 'tool-registry', type: 'catalog-changed', data: {names}}`. It fires after a save, delete, toggle or host-side user-pack change.

**Error codes** (on Platform's base error shape): `TOOL_NOT_FOUND`, `TOOL_DISABLED`, `TOOL_INVALID`, `TOOL_ARGS_INVALID`, `TOOL_ENTITY_UNRESOLVED`, `TOOL_ENTITY_KIND_MISMATCH`, `TOOL_SPEC_LINT_FAILED`, `TOOL_BUILTIN_READONLY`, `TOOL_SCHEMA_VERSION_UNSUPPORTED`, `TOOL_MODEL_ERROR`.

**Lint result.** A list of diagnostics. Each has a severity (`error | warning`), a rule id, a message, and a line and column in the YAML source. Lint rules:
- YAML parse;
- envelope fields;
- name pattern, file-name match and uniqueness;
- one-line description;
- output enum;
- the inputs subset, and that the schema compiles in Ajv;
- hint vocabulary and its consistency;
- control and type fit;
- known entity kinds (warning);
- reserved `output` key;
- template syntax and variables;
- unused required inputs (warning);
- `schemaVersion` supported.

**Form renderer (web).** One standalone component renders a form descriptor, using Angular Material and signals. It has two layouts:
- **Form:** all fields.
- **Node body:** port rows with handles, plus `params` fields, for the Graph runner's ngx-vflow node. The Graph runner supplies the handle template and owns wiring.

Controls:
- The entity picker lists the active project's entities filtered by `x-scriba-entity-kinds`. It shows chips for list fields and accepts dropped entity chips.
- The style picker defaults to the project's style profile.
- Server-side `issues` show inline next to their fields.

**Tools page (web).**
- Route `/tools` (app-level, one entry in the Shell's route table, minimum device class `phone`; the detail view switches to list-only on the `phone` device class).
- A list grouped by origin, with enable toggles.
- On tablet and desktop, a detail view:
  - a CodeMirror 6 YAML editor with lint diagnostics from save, plus a debounced lint while typing;
  - Customize, Revert to built-in, Compare with built-in (the Shell's diff view), New, Duplicate and Delete;
  - preview tabs for the form, node, function schema and rendered prompt;
  - a Try panel. It resolves the chosen entities through the Project store file API in the browser, calls execute, and shows the output and sources used. It never creates a pending change.
- On phone, the list and toggles only, behind the Shell's breakpoint gate.

**CI.** The registry ships a **pack-lint CLI** (`npm run lint:packs`, part of `npm run lint`) with a library entry point. It loads a packs root exactly like the runtime loader, lints every tool spec and entity-type schema, and fails on any error or on duplicate names. Platform's examples check and Genre packs' content tests reuse the library entry point instead of re-implementing lint.

## Phases

Milestones referenced here: M2 is the tool-registry milestone: declarative tool specs, schema validation, and the four nonfiction workhorse tools (cold open, mystery question, myth-buster, numbers-to-people). M2 is done when each workhorse produces a draft that cites its source files.

### phase:contract (M2)
Blocked by: Platform `phase:scaffold`; Project store `phase:contract` (entity reference, file reference); Platform's `/platform` slice (error base, SSE envelope).

Scope:
- Publish `@bbartolome/scriba-contracts/tool-registry`: the tool-spec envelope (Zod + TS), the supported `schemaVersion` constant, the `x-scriba-*` key and control constants, the port-type enum `text | entity | style`, the output enum `draft | entity | claims | graph | check`, the output port key, and the port-derivation rule written as a doc comment on the port-descriptor shape.
- Also publish the form-descriptor, port-descriptor and function-schema shapes; the entity-type schema envelope; the lint-result shape; and the request and response shapes for list, get, lint, save, delete, enabled, validate (full and `params`), render and execute, including the resolved-entity input and `{output, sourcesUsed}`.
- Also publish the error codes, route constants and the `catalog-changed` SSE event member.
- `SCRIBA_PACKS_DIR` is listed in Platform's env names.

Acceptance criteria:
- [ ] The slice builds and is importable from NestJS and Angular with no other subpath.
- [ ] The Zod tests accept a cold-open-shaped fixture envelope and reject a wrong output kind, a bad name and a missing `prompt`.
- [ ] The output enum has exactly the five values. The port-type enum has exactly three.
- [ ] Genre packs, Agent loop and Graph runner can reference every type their specs consume.

### phase:form-renderer (M2): spike
Blocked by: `phase:contract`; Shell `phase:core`; Platform `phase:scaffold`; Project store `phase:files` (entity list for the picker in the running app; component tests use the Shell's fake API).

Scope:
- Server-side emission of the form descriptor, port descriptor and function schema from one spec.
- A fixture-backed `GET /api/tool-registry/tools/:name` serving a registry-owned cold-open fixture, a test fixture rather than the Genre packs content. The loader replaces it in the next phase.
- Ajv `validate` for the fixture.
- The Angular form renderer in both layouts with every control type, the entity picker filtered by kind, the style picker and inline issues.
- A dev preview route on the Tools page.

Acceptance criteria (spike: one workhorse tool rendered end to end):
- [ ] In the running dev app, one API response for the cold-open fixture drives both a full form and a node body. The node body shows typed ports for the `entity`, `text` and `style` fields marked as ports, and the remaining controls as `params`.
- [ ] The entity picker offers only entities of the fixture's kind (e.g. `person`) and accepts a dropped entity chip.
- [ ] Submitting sends the arguments to `validate`. Missing required fields and wrong enum values show the readable messages inline, and a valid submit shows the arguments with defaults applied.
- [ ] The emitted function schema contains no key starting with `x-`, and it passes Ajv's draft-07 meta-schema.
- [ ] A short spike note, written when the phase closes, records any hint the workhorse needed that the vocabulary lacks. Any vocabulary change is made through expand–contract before `phase:loader-validation`.

### phase:loader-validation (M2)
Blocked by: `phase:form-renderer`; Setup & auth guard (implementation).

Scope:
- Pack layout and the loader for built-ins plus the user pack, with copy-on-write precedence, the manifest re-scan, the `schemaVersion` refusal and migration hook, entity-type schema loading, and the invalid-copy fallback.
- The full lint rule set, the pack-lint CLI and its library entry point.
- The list, get, builtin, functions, entity-types, lint, save, delete and enabled endpoints, and the `tools` section overrides in `settings.yaml`.
- `params`-mode validate.
- The `catalog-changed` event.
- The exported catalog service.
- `npm run lint:packs` wired into `npm run lint`.

Acceptance criteria:
- [ ] With fixture packs, `GET /api/tool-registry/tools` lists core, genre and user tools. A user file with a built-in's name replaces it, and deleting that file restores the built-in.
- [ ] `save` on a built-in writes `/books/.scriba/packs/user/tools/<name>.yaml` and never touches the packs root.
- [ ] Saving YAML with an unknown `x-scriba-*` key, a template variable that isn't an input, or an out-of-subset keyword returns 422 with line-numbered diagnostics, and writes no file.
- [ ] A user file with a newer `schemaVersion` is listed as refused with `TOOL_SCHEMA_VERSION_UNSUPPORTED`, and the other tools still load.
- [ ] A file added to the user pack on the host appears in the next list without a restart, and a `catalog-changed` event is emitted.
- [ ] Disabling a tool removes it from `GET /api/tool-registry/functions`, and the switch persists across an app restart and a built-in update.
- [ ] `params`-mode validate passes a node whose only missing fields are ports.
- [ ] `npm run lint:packs` fails on a deliberately broken fixture pack, and its library entry point returns the same diagnostics.
- [ ] An entity-type schema with a one-level array-of-objects field loads, and one with a nested object field fails lint.

### phase:executor (M2)
Blocked by: `phase:loader-validation`; Model providers `phase:client` (implementation); Project store `phase:contract`.

Scope:
- The template engine (`{{field}}`, `#each`, `#if/else`, `{{entity id}}`, comments).
- The render and execute endpoints and the exported executor service.
- Entity resolution and kind checks.
- A system message per output kind.
- The model call through the providers client with the active project's model choice, abort support, and computed `sourcesUsed`.
- The refusal of disabled and invalid tools.
- A mock-OpenAI fixture for a tool call (added to `e2e/fixtures/mock-openai/` additively).

Acceptance criteria:
- [ ] `render` with fixture arguments and resolved entities returns the expected prompt text. `{{entity id}}` inside `#each` inserts each entity's header and content, and an absent optional field renders nothing.
- [ ] `execute` against the mock OpenAI server returns `{output: {kind: 'draft', content}, sourcesUsed}`. `sourcesUsed` lists exactly the resolved entity references for the entity-typed inputs, de-duplicated, and leaves out the style profile.
- [ ] Malformed arguments return `TOOL_ARGS_INVALID` with a message that names every bad field. A wrong-kind or unresolved entity returns its own readable error. None of these call the model.
- [ ] A disabled tool returns `TOOL_DISABLED`. An aborted call stops the model request.
- [ ] M2 done-when, at the API level: At the API level, each workhorse-shaped fixture tool produces a draft that cites its source files (through `sourcesUsed`).

### phase:editor-ui (M2)
Blocked by: `phase:executor`; Shell `phase:editor` and `phase:shared-components` (diff view); Project store `phase:files` (implementation, for the Try panel).

Scope:
- The Tools page: the list with enable toggles, the phone view, and the YAML editor with lint on save plus a debounced live lint.
- Customize, Revert, Compare, New, Duplicate and Delete.
- Previews of the form, node, function schema and rendered prompt.
- The Try panel.
- Live refresh on `catalog-changed`.

Acceptance criteria:
- [ ] Saving an invalid spec shows the diagnostics on their lines and keeps the previous version active. Saving a spec with warnings succeeds and shows the warnings.
- [ ] Customize on a built-in opens an editable copy. After a save the list shows it as user-owned, overriding the built-in, and Revert returns to the built-in.
- [ ] Editing a field's `x-scriba-port` updates the node preview's ports live, and changing `x-scriba-entity-kinds` changes what the picker offers.
- [ ] The Try panel runs a tool against the active project and shows the output and the sources used. No pending change is created.
- [ ] On a phone-sized viewport, only the list and the toggles are reachable.
- [ ] M2 done-when: Each of the four nonfiction workhorses (cold open, mystery question, myth-buster, numbers-to-people), once Genre packs ships them, produces a draft that cites its source files.

Demo script (M2, under 5 minutes):
1. Open the nonfiction sample project and go to Tools. Show core, nonfiction and user groups, and switch off `mystery_question`.
2. Open `cold_open`, a built-in, which is read-only. Click Customize, change the description and add a `tone` select. Save. Point out that the form preview, the node preview and the function schema all gained `tone`.
3. Add a typo `{{momnet}}` to the prompt and save. The save is blocked, with the lint error on its line. Fix the typo and save.
4. In Try, pick a person entity (the picker shows only people) and a moment, then run. Show the draft and its sources used.
5. Optional, with the Agent loop's `phase:narrative-tools` in: ask the agent "draft a cold open for chapter 1 from my notes on <person>". The tool card shows the same arguments, and `mystery_question` isn't offered.
6. Click Revert to built-in. The original description is back.

## Contracts

**Produces: `@bbartolome/scriba-contracts/tool-registry`** (published in `phase:contract`, changed later only through expand–contract):
- The tool-spec shape: the YAML envelope `name`, `description`, `inputs` (JSON Schema subset), `output`, `enabled`, `prompt` and `schemaVersion`, with the supported-version constant.
- The `x-scriba-*` hint vocabulary: `x-scriba-type`, `x-scriba-port`, `x-scriba-entity-kinds` and `x-scriba-control`, with the control enum.
- The **port-type enum `text | entity | style`**, the port-derivation rule and the port-descriptor shape. The descriptor holds the input ports `{key, type, list, required, title}`, one output port (key `output`, type `text`, output kind) and the params field keys.
- The **output enum `draft | entity | claims | graph | check`**.
- The model function-schema shape (OpenAI-compatible function) and the form-descriptor shape.
- The entity-type schema envelope.
- The lint-result shape.
- The registry list/get/builtin/functions/entity-types/lint/save/delete/enabled API, the validate request and result (full and `params` mode, including the referenced entity IDs), and the render request and result.
- The tool-call request (arguments plus resolved entities, each built from the Project store entity reference plus its content) and the tool-call result `{output, sourcesUsed}`, where `output` is `{kind, content}` and `sourcesUsed` is a list of entity references.
- Error codes, route constants and the `catalog-changed` SSE event member.

**Produces (Angular API, not a contract):** the tool-form component, in its form and node-body layouts, for the Graph runner's tool node.

**Produces (in-process NestJS services):** the catalog service and the executor service. The Agent loop and the Graph runner inject them.

**Consumes:**

| From | What | Gate |
|---|---|---|
| Platform | `/platform` base error shape, SSE envelope, `SCRIBA_*` env names (adds `SCRIBA_PACKS_DIR`), CI job and mock OpenAI server (additive steps and fixtures) | `phase:scaffold` |
| Setup & auth | the one API guard | `phase:token-guard`, before `phase:loader-validation` |
| Project store | `/project-store` entity reference, file reference, entity front-matter base (`type`), `project.yaml` genre pack and style-profile ref | `phase:contract` |
| Project store | file API: entity listing and reads for the picker and the Try panel; active project | `phase:files` (implementation), for the UI phases |
| Model providers | `/providers` app default and per-project model choice; the provider client | `phase:contract`; `phase:client` (implementation) before `phase:executor` |
| Frontend shell | API and SSE clients, route table, breakpoint gate, theming | `phase:core` |
| Frontend shell | CodeMirror 6 editor, diff view | `phase:editor`, `phase:shared-components` |

**Consumed by:**
- **Genre packs:** tool-spec format, vocabulary, entity-type envelope, pack lint. Blocked by this `phase:contract`.
- **Agent loop:** function schemas, validate, the readable error, execute, `{output, sourcesUsed}`.
- **Graph runner:** port-type enum, `x-scriba-port` / `x-scriba-type`, port derivation, `params` validate, execute, the tool-form component.
- **Platform:** the samples CI check uses `params` validate for recipes' tool references.

## Testing Decisions

- A good test exercises external behaviour only: HTTP responses, SSE events and files on disk, or the rendered UI. It never tests the loader's, parser's or emitter's internals.
- **Primary seam: the HTTP + SSE surface.** Boot the registry module, imported into a test app with the Setup & auth guard, against a temp library folder, with `SCRIBA_PACKS_DIR` pointed at fixture packs and the mock OpenAI server running. Assert on:
  - list, get, lint, save, delete and enabled responses, and on files appearing in or disappearing from `/books/.scriba/packs/user/tools/` and the `tools` section of `settings.yaml`;
  - `catalog-changed` events on the stream;
  - validate messages, exact enough to check the model-readable text;
  - render output, which is how the template subset is tested, through the endpoint and not the parser;
  - execute results and errors, and that the mock server received no request when validation failed.
- **Emission** is tested through `GET /api/tool-registry/tools/:name`. The function schema has no `x-` keys and passes the draft-07 meta-schema. The form and port descriptors match the fixture's declared fields and order.
- **UI seam:** the Tools route and the tool-form component are rendered with Angular's Vitest runner against a fake API/SSE client built from the contract types. Tests cover each control type, the kind-filtered picker, the node-body port rows, inline issues, lint diagnostics in the editor, Customize/Revert, and the phone gate.
- **Contract seam:** the Zod tests for the slice. Every built-in pack file is linted in CI through the registry's pack-lint step.
- **System seam:** the Platform-owned Playwright e2e needs no registry-specific step. The Agent loop extends it with a registry tool call at M2.
- Unit tests keep their own fixtures, including the cold-open fixture, and never read `examples/` or the real packs.
- Vitest everywhere, with NestJS via `unplugin-swc`. There is no prior art in the repo yet.

## Out of Scope

- Pack content: the workhorse and fiction prompts, descriptions and entity-type schemas belong to the Genre packs spec.
- Per-project `tools/` folders (deferred).
- A field DSL over tool specs, and Zod for tool inputs. **Tool inputs are JSON Schema, with no Zod-to-JSON-Schema conversion:** the `inputs` JSON Schema is the source for every view, and the registry does not call `z.toJSONSchema()`.
- Per-tool model choice (deferred).
- Schema-validation retries. They live in the Agent loop.
- Resolving entity IDs to file contents, recording citations, draft provenance, and turning output into pending changes. These belong to callers, the Agent loop and the Graph runner, with the Project store.
- Canvas wiring, run state and graph JSON validation, including validating propose-graph output (Graph runner).
- Streaming tool output token by token. v1 tool calls are non-streaming.
- Entity types in the user pack.
- Nested-object inputs, `$ref` and combinators in tool inputs.
- **Canvas and records:** the canvas is Angular-native, with no React Flow custom nodes or island. Each tool node is an Angular form component hosted in an ngx-vflow node. Recipe nodes are `input`, `tool` and `output` only, so recipes have no Merge, Compare, Gate or entity nodes. A tool node is `{id, kind, position, tool?, params?}` with ports derived here. Decisions are recorded as ADRs in `docs/adr/`, not in a single log file, `DECISIONS.md`.

## Further Notes

- The canvas needs a small custom-node API, and derivation provides it: a new tool spec automatically gets a tool node, a form and a function schema, with no per-tool code.
- The form renderer comes first on purpose. It is the riskiest part of "one document, three views", and the spike validates the hint vocabulary before the loader, lint and editor build on it.
- **Cross-spec assumptions:**
  - The enable overrides live in this module's `tools` section of `settings.yaml`. Platform owns the file envelope and its startup migration hook, and each module owns its own section, as set in the Platform spec.
  - The entity picker uses the Project store's entity list (`{id, type, path, title?}`, filterable by `type`), and the Try panel uses its GET resolution endpoint.
  - `SCRIBA_PACKS_DIR` is in Platform's env names.
  - The output port is always `text` in v1.
- The execute endpoint exists so the Try panel and the HTTP test seam use the same path as the in-process callers. It writes no files, so it stays inside the rule that writes from the agent or recipe runs always become pending changes.
- Function names use lower snake case so that they are valid for every OpenAI-compatible endpoint, including Ollama and LM Studio.
