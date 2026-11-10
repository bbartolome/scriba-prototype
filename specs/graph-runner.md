# Spec: Graph runner

## Problem Statement

The author thinks visually. They want to lay out how a piece of the book gets produced: which notes, which entities and which style go into which narrative tools, in what order, and what comes out. They want to do this by wiring boxes on a canvas instead of typing long instructions to the agent each time. Once a layout works for chapter 3, they want to reuse it for chapter 4 by choosing different inputs, not by rebuilding it.

They also want a map of the book's structure (scenes, beats and the entities in them, joined by relations such as order, causality and containment) that they can see and rearrange. That map should point at the real files and never hold a second copy of the text.

Today none of this exists. Tools can only be reached through the agent's chat. Nothing records a reusable chain of tool steps, nothing runs one, and there is nowhere to see the book's structure as a graph. Any canvas also has to respect Scriba's core rules. Files are the source of truth. Every write by a machine is a pending change the author reviews. Every result cites the files it drew on. Local models are slow and fail, so the author must see what is running, stop it, and understand what went wrong.

## Solution

The Graph runner gives the author a canvas, built on `ngx-vflow`, with two views over one graph file format in `graphs/`:

- **Story graph:** an inert map of story nodes (`entity`, `scene` and `beat`) joined by directed relations. A story node points at a project file through an optional `path`, or is label-only while nothing has been written yet. It is viewed and edited, never run.
- **Recipe:** a reusable graph of input nodes, tool nodes and output nodes joined by typed wires. It is the only kind of graph that runs.

Tool nodes are generated from the Tool registry's tool specs. Each tool node shows the registry's form fields for its settings, and one typed port for each input the tool spec marks as a port. Wires connect only ports of matching type (`text | entity | style`), with one wire per input. The canvas refuses a mismatched wire as the author draws it. The author can drag an entity chip from a side list straight onto an entity port, with no typing.

To run a recipe, the author presses Run (whole recipe) or "Run to here" on a node. A dialog asks for the value of each input node in scope: literal text or a project file for text, entities for entity ports, a style profile for style ports. Each node then shows its status and result inline as the run moves through it. Only output nodes produce anything lasting, and what they produce is a **pending change** the author reviews in the Project store's review queue. When an input value is a file reference, the content read at run start is the **captured base** for any pending change to that same file. If the author edits that file on the host during the run, the three-way check flags it instead of overwriting the edit. The author can stop a run at any time. Every run is logged in `logs/`.

The agent can also propose a graph through the core pack's propose-graph tool. That graph arrives as a pending change aimed at `graphs/`. Once the author accepts it, it opens on the canvas like any other graph.

The canvas works on desktop and tablet, including touch. On a phone, the Shell's breakpoint gate shows the graph list and the latest run state read-only, with a note to use a larger screen.

## User Stories

1. As an author, I want to see a list of every graph in my project's `graphs/` folder, with its name and whether it is a story graph or a recipe, so that I can find the one I need.
2. As an author, I want to create a new, empty recipe with a name, so that I can start building a production chain for a chapter.
3. As an author, I want to create a new, empty story graph with a name, so that I can start mapping my book's structure.
4. As an author, I want my changes to a graph saved straight to its file when I save, so that my own edits never wait in a review queue.
5. As an author, I want to rename and delete graphs, so that `graphs/` stays tidy.
6. As an author, I want graph files to be plain, readable JSON on disk, so that I can inspect them, put them under git, and keep them if I ever replace the canvas library.
7. As an author, I want a tool node to appear for every enabled tool in the registry, with no extra setup, so that a tool I add or edit is immediately usable on the canvas.
8. As an author, I want to add a tool node by picking a tool from a palette that shows each tool's one-line description, so that I can choose the right technique.
9. As an author, I want a tool node to show the same form fields the Tool registry renders for that tool (tone, length and the like), so that I set a step's fixed settings where I see it.
10. As an author, I want each tool node to show one labelled, typed input port per port input in its tool spec, and one output port, so that I can see what it accepts and produces.
11. As an author, I want to add an input node and choose whether it carries text, entities or a style profile, and give it a label such as "Chapter notes", so that I decide which values change from run to run.
12. As an author, I want to add an output node and wire a tool's result into it, so that I decide which results become pending changes.
13. As an author, I want to draw a wire from an output port to an input port only when their types match, with the canvas refusing a mismatch as I drag, so that I can't build a recipe that can never work.
14. As an author, I want a second wire into an input port that already has one to be refused, so that every input has exactly one source.
15. As an author, I want to drag an entity chip (a person, claim, character or style profile) from a side list onto an entity port, with no typing, so that I can pin "this claim" to the myth-buster node in one gesture.
16. As an author, I want a chip dropped on the wrong port (a claim on a text port, a character on a port filtered to claims, or any chip on a port that already has a wire) to be refused with a short reason, so that I understand why it didn't stick.
17. As an author, I want to remove a pinned entity from a port, so that I can change my mind.
18. As an author, I want the canvas to list validation problems (missing required inputs, unknown or disabled tools, an output node with nothing wired in, a cycle) and highlight the node or wire concerned, so that I can fix a recipe before running it.
19. As an author, I want to save a recipe that still has problems, so that I can stop half-way and come back later.
20. As an author, I want Run to be disabled, with the reasons shown, while a recipe has blocking problems, so that I never start a run that is bound to fail.
21. As an author, I want a dialog at run start that asks for the value of every input node in scope, labelled by the input node's label, so that one recipe works for any chapter.
22. As an author, I want a text input's value to be either text I type or a file I pick from my project, so that I can feed a scene's draft into a recipe without copying it.
23. As an author, I want an entity input's value picked from my entities, filtered by the kind the receiving port accepts, so that I only see sensible choices.
24. As an author, I want a style input to default to my project's style profile, so that I don't pick it every time.
25. As an author, I want to choose, for each output node in scope, which file its pending change targets, with a sensible default, so that a run for chapter 4 doesn't overwrite chapter 3.
26. As an author, I want to run the whole recipe, so that I get the full result in one go.
27. As an author, I want to run up to a single node ("Run to here"), which runs that node and everything upstream of it, so that I can check one step's result without producing the final output.
28. As an author, I want each node to show its status (idle, queued, running, done, error, stopped) as the run moves through the recipe, so that I can see where a slow local model is.
29. As an author, I want each finished tool node to show its result inline, with a short preview I can expand, plus the files it cited, so that I can judge each step.
30. As an author, I want a node that failed to show a readable error (invalid arguments, a model timeout, an unreadable file), so that I know what to fix.
31. As an author, I want the remaining steps to stop when one step fails, so that a broken result isn't fed into later tools.
32. As an author, I want a Stop button that ends the run promptly, cancelling the model call in progress, so that I'm never stuck waiting on a step I no longer want.
33. As an author, I want each output node that finishes to create a pending change in the review queue, and to show a link to it, so that nothing a run writes touches my files until I accept it.
34. As an author, I want the pending change for a file I fed in as a text input to be based on the content read when the run started, so that if I edit that file on my Mac during the run, the review flags the conflict instead of losing my edit.
35. As an author, I want every run's draft to record which entities and files it used, so that I can trace any sentence back to its inputs.
36. As an author, I want a run to keep going and its status to stay current when I switch to another screen or my tablet sleeps, so that I can come back and see where it got to.
37. As an author on a second device, I want the canvas to show the run in progress, with each node's status, when I open it, so that I can watch from wherever I am.
38. As an author, I want only one recipe run at a time in my project, with a clear message if I try to start a second, so that two runs don't race on the same files.
39. As an author, I want the canvas to be read-only while its recipe is running, so that what I see matches what is running.
40. As an author, I want each run logged in `logs/` (inputs, each step's arguments, results, cited sources, errors, and the pending changes created), so that I can audit what happened later.
41. As an author, I want to add scene, beat and entity story nodes to a story graph, each with a label, so that I can sketch structure before writing it.
42. As an author, I want to point a scene or beat node at a file in `drafts/`, or an entity node at a file in `entities/`, and to be warned when that file no longer exists, so that the map stays tied to the real files.
43. As an author, I want several scene nodes to point at the same chapter file, so that I can map scenes that share one draft.
44. As an author, I want to connect story nodes with directed relations, choosing from suggestions (order, causality, containment) or typing my own, so that the map says how things relate.
45. As an author, I want `order` relations between scene nodes to be what Compile & export uses for manuscript order, so that the map I draw is the order of my book.
46. As an author, I want to open the file a story node points at with one action, so that I can move from the map to the prose.
47. As an author, I want a story graph never to offer Run, so that it's clear the map is a picture, not a process.
48. As an author, I want a graph the agent proposed to arrive in my review queue, and to open on the canvas once I accept it, so that I can edit it before running it.
49. As an author, I want an "Arrange" action that lays out overlapping nodes left to right, so that a graph the agent proposed is readable without dragging every node.
50. As an author on a tablet, I want to pan, zoom, move nodes, draw wires and drop entity chips by touch, so that I can compose recipes on the iPad.
51. As an author on a phone, I want a clear message that the canvas needs a tablet or desktop, plus the graph list and the latest run's status, so that I can still check on a run.
52. As an author, I want the canvas to match the rest of the app's Material look, in light and dark themes, so that it doesn't feel bolted on.
53. As an author, I want a sample nonfiction recipe in the sample project, so that I can run one end to end before building my own.
54. As an agent (via the propose-graph tool), I want a published graph schema to validate my proposed graph against, so that what I propose is a well-formed file.
55. As the Compile & export module, I want the story graph schema and the meaning of an `order` relation published as contract constants, so that I can read order edges without depending on the runner.
56. As a maintainer, I want graph files with a newer `schemaVersion` refused and older ones migrated lazily with a backup, so that upgrades never corrupt an author's graphs.

## Implementation Decisions

### Ownership
- The Graph runner owns the graph file schema, the port-id convention, the relation vocabulary, graph CRUD in `graphs/`, recipe validation, the run engine, run state, node-run-status events, run logs, and the canvas UI.
- It ships one NestJS `@Module` (imported into Platform's API composition root) and one lazy `Routes` array (one entry in the Shell's route table). Server code lives under `apps/api` and UI under `apps/web`, in this module's slice.
- **It never calls the Agent loop, and the Agent loop never calls it**. The only bridge is a graph file. Propose-graph output arrives as a pending change through the Project store. Once accepted, it is an ordinary graph file.
- **It never runs a story graph**. Compile & export reads story graphs itself, using the published schema.

### Graph file schema
- Each graph is one JSON file `graphs/<id>.json`. The file stem is the graph's id. It is a lower-case slug from the name, unique within `graphs/`, and stable across renames of `name`. Renaming the file is a separate action.
- File shape: `{schemaVersion, view: 'story' | 'recipe', name, nodes, edges}`. This is a Zod discriminated union on `view`. Unknown keys are rejected. v1 is `schemaVersion: 1`.
- **Node ids** match `^[a-z0-9][a-z0-9-]*$`: no dots, so port ids parse unambiguously. Node ids are unique within a graph, and so are edge ids.
- **Story nodes**: `{id, kind: 'entity' | 'scene' | 'beat', label, path?, position: {x, y}}`.
  - `path` is project-relative and points at a current file, never into `drafts/.versions/`. Entity nodes point into `entities/`. Scene and beat nodes point into `drafts/`, where several nodes may share one file.
  - A node with no `path` is label-only. The graph never copies file text.
  - Entity kind (character, claim, …) is an attribute of the entity file, not a node kind.
- **Recipe nodes**: `{id, kind: 'input' | 'tool' | 'output', position: {x, y}, tool?, params?}`.
  - `tool`: the registry tool name. It is required on tool nodes and forbidden on the others.
  - `params` on a **tool node** holds non-port settings (tone, length, …) and any **pinned port values**: entity references dropped onto a port that has no wire. A port is fed by a wire or by a pinned value, never both.
  - `params` on an **input node**: `{type: 'text' | 'entity' | 'style', label, entityKind?}`. `entityKind` optionally narrows the picker.
  - `params` on an **output node**: `{label?, path?}`. `path` is an optional default target file.
- **No kind is legal in both views**. The legal kinds per view are published as constants.
- **One edge shape**: `{id, from, to, relation?}`.
  - In a **story graph**, `from` and `to` are node ids, and `relation` is free text.
  - In a **recipe**, an edge is a **wire**: `from` and `to` are port ids, and `relation` is forbidden.
- **Port-id convention**: `<nodeId>.<key>`, split on the first dot.
  - A tool node's single output port uses the Tool registry's reserved key `output` (`<id>.output`). An input node's single output port uses the fixed key `out` (`<id>.out`).
  - An output node has one input port with the fixed key `in`.
  - A tool node's input port keys are the tool-spec input property names that the Tool registry's port derivation marks as ports (`x-scriba-port` / `x-scriba-type`).
- **Relation vocabulary.** The suggested relations are `order` (from precedes to), `causality` (from causes to) and `containment` (from contains to, for example a scene containing a beat). They are published as constants with these one-line meanings. Any other non-empty string is allowed. Compile & export reads only edges whose relation is exactly `order`.
- **Migrations.** This module checks `schemaVersion` itself before Zod parsing: a file with a newer version is refused with `GRAPH_SCHEMA_VERSION_UNSUPPORTED`. v1 ships no migrators. When a v2 is needed, the migrators register with the Project store's migration registry (its `phase:migrations`), which migrates lazily on POSTs with a backup and a `logs/migrations.log` entry, never as pending changes.

### Graph CRUD
- All routes act on the active project. Reads and writes go through the Project store's in-process file API (`read`, `list`, `write`, `delete`, `move`), so path safety applies.
- Operations:
  - list graphs (id, name, view, node count, modified time, schema validity);
  - get a graph, returned with its validation issues;
  - create (name, view);
  - save (whole-file replace);
  - rename (change `name` with a save, or change the file id with the Project store's `move`; the new id must be a free slug);
  - delete (the Project store's `delete`).
- **Author saves are direct writes**. A save is refused only when the file fails the Zod schema. A schema-valid recipe with semantic problems is saved, and the response includes its validation issues.
- **Agent-proposed graphs** are pending changes aimed at `graphs/`, created by the Agent loop and reviewed in the Project store. The graph list may badge an id that has a pending change, using the Project store's queue listing. The Graph runner itself never creates graph pending changes from the agent's side.
- An author save that lands while a pending change targets the same graph file is handled by the Project store's three-way check when that change is accepted.

### Validation (recipes)
- Validation is a pure check of a recipe against the current tool registry. It runs on get, on save, and at run start, and the canvas runs the same rules live for immediate feedback.
- Each issue is `{code, severity: 'error' | 'warning', nodeId?, edgeId?, portId?, message}`.
- **Errors (block a run):**
  - a node kind that is illegal for the view;
  - an unknown or disabled tool;
  - a wire to or from a port that doesn't exist;
  - mismatched port types;
  - more than one wire into one input;
  - a port both wired and pinned;
  - a required port input with neither a wire nor a pinned value;
  - a required non-port setting missing from `params` (checked against the tool spec's JSON Schema);
  - a cycle;
  - an output node with no wire in;
  - an output node fed by anything but a tool node, or by a tool whose output kind can't be written (see Outputs);
  - duplicate ids.
- **Warnings:**
  - a node with no path to any output node (dead step);
  - an input node with no wire out;
  - a pinned entity whose file no longer exists.
- **Story graphs** get warnings only:
  - a `path` that is missing, unsafe, or points into `drafts/.versions/`;
  - an edge to an unknown node;
  - an entity node whose `path` is outside `entities/`.
- **Port derivation** comes from the Tool registry: the input ports, their element types and the output port type, and which inputs take lists (types are element types, so an entity port may carry a list). The runner never re-derives ports from raw JSON Schema itself.
- Ajv checks the actual argument shapes when each tool node runs, inside the Tool registry executor. A failure there is a node `error`, not a validation issue.

### Run engine
- **Start run** (POST) takes:
  - the graph id;
  - `inputs`: an input value per input node in scope;
  - an optional `target: {nodeId}`;
  - optional `targets`: a target file per output node in scope.
- **Scope**:
  - With no target, the whole recipe runs.
  - With a target, the target node and everything upstream of it run (wires followed backwards). "Run a node" and "run the branch ending at a node" are the same request, because results are never reused. The UI calls it "Run to here".
  - Output nodes outside the scope produce nothing. If the target is a tool node, its result is shown inline and no pending change is made.
- **Refusals before any work:**
  - a story graph (`view: 'story'`);
  - a recipe with blocking validation errors;
  - a missing or ill-typed input value;
  - an unsafe or non-existent file reference;
  - another run already active in the project. There is **one active run per project**.
- **Input values**:
  - text: `{kind: 'text', text}` or `{kind: 'file', ref}`. `ref` is a Project store file reference to any file in the active project, checked by path safety, not limited to `drafts/`.
  - entity: `{kind: 'entities', refs}`, a list of Project store entity references.
  - style: `{kind: 'style', ref}`, an entity reference to a style profile. The dialog defaults it to the project's style profile ref from `project.yaml`.
- **Reads at run start**: every file reference is read once, through the Project store file API, before any tool runs. The path and content are kept in run state for the run's lifetime, and the path plus a content hash are logged. That content is the **captured base** for any pending change the run makes to the **same path**.
- **Order:** nodes in scope run **one at a time** in topological order, with ties broken by node id. This is deterministic, it suits a single local model, and concurrency can be added later. Every in-scope node starts as `queued`.
- **Tool node step:**
  1. Gather port values from upstream results, pinned values and input values, and settings from `params`.
  2. Resolve every entity reference (including style) to file contents through the Project store file API.
  3. Call the **Tool registry executor**, which validates the arguments with Ajv, renders the template, calls the model through Model providers, and returns `{output, sourcesUsed}`. The model call is cancellable.
  4. Keep `{output, sourcesUsed}` in run state as the node's result. Values passed between steps never touch disk.
- **Outputs**: only output nodes create pending changes. The output kind of the tool wired into the output node decides the target file kind:
  - `draft`: a Markdown file, a top-level file in `drafts/`;
  - `entity`: a Markdown entity file in `entities/`;
  - `graph`: a JSON file in `graphs/`. The content must pass the graph schema, or the output node errors.
  - `claims` and `check`: **not writable by an output node in v1** (validation error). Their results show inline on the tool node and are logged. See Further Notes.
- **Choosing an output's target file:** the request's `targets[nodeId]` wins, then the output node's `params.path`, then a generated name `<folder>/<graph-id>-<yyyymmdd-hhmm>.<ext>`. The target must sit in its kind's folder.
- **Captured base for an output:**
  - If the target path equals a text input's file reference, the base is the run-start content.
  - Otherwise, if the target file exists, its content is read when the pending change is created and used as the base.
  - Otherwise the pending change creates a new file.
- **Creating the pending change:** the runner calls the Project store's in-process `propose` with the target path, the proposed content, the captured base, origin `{kind: 'recipe-run', runId, graphId, nodeId}` (the output node) and `provenance: {graphId, nodeId, entityIds, sourcesUsed}`, where `entityIds` and `sourcesUsed` are the unions over every tool node upstream of that output. That gives each draft the entity IDs and tool run behind it, so the author can trace any sentence back to its inputs. The output node's result is `{pendingChangeId, path}`.
- **Errors:** when a node fails, it becomes `error` with a readable message, every node still `queued` becomes `stopped`, and the run ends as `error`. Pending changes already created stay in the queue, because they are reviewable on their own.
- **Stop** (POST): aborts the model call in progress. The running node and every queued node become `stopped`, and the run ends `stopped` with reason `author`. No pending change is created after the stop is received.
- **Project switch.** The module registers with the Project store's in-process `onProjectSwitched` hook. A switch stops the old project's active run exactly like Stop, with reason `project-switched`.
- **Run state**: `{runId, graphId, target?, status: 'running' | 'done' | 'error' | 'stopped', reason?, startedAt, endedAt?, inputs, targets, nodes: {[nodeId]: {status, result?, error?}}, pendingChangeIds}`.
  - It reports the input values; file contents are not included.
  - The **current-run-state** endpoint (GET) returns the active run for the project, or the most recent finished one, so a device that slept can reconcile on wake.
  - Run state is held in memory. On API restart, the most recent run is rebuilt from its log, and a run with no end entry is reported as `stopped` with reason `interrupted`.
- **Node-run-status**: `idle | queued | running | done | error | stopped`.
  - `idle` means the node is outside the current run's scope, or there is no run.
  - `queued` means it is in scope and waiting.
  - `stopped` means the run was stopped or failed before the node finished.
- **SSE** (Platform envelope `{module: 'graph-runner', type, data}`):
  - `run-started` with the run state;
  - `node-status`, sent on every change, with `{runId, nodeId, status, result?, error?}`;
  - `run-ended` with `{runId, status, reason?}`, where `reason` is `author | project-switched | interrupted` for `stopped` runs and absent otherwise.
  - `result` is the tool node's `{output, sourcesUsed}`, or the output node's `{pendingChangeId, path}`.
- **Run logs** in `logs/recipe-runs/<runId>.jsonl` (`logs/` is the source of truth, and the run-log index is deferred), written through the Project store's in-process `appendLog`. File hashes use the Project store's `sha256:<hex>` format. Entries are appended one JSON line at a time:
  - run start (graph id, scope, input values with file path + hash);
  - each node status change;
  - each tool call's validated arguments, its output and `sourcesUsed`;
  - errors;
  - pending change ids;
  - run end.
  - The entry shape is published. The Agent loop's transcripts are a separate format in `logs/`.

### Canvas UI (ngx-vflow)
- **One adapter layer** maps graph JSON to `ngx-vflow` nodes and edges and back. The graph JSON stays the contract, and library ids never leak into files. The four adapter workarounds that `ngx-vflow` needs live in that layer:
  1. a custom SVG handle template that carries the port id, positioned from the handle's `point` context;
  2. each handle placed inside its own row;
  3. the connection directive imported through the `Vflow` tuple;
  4. new wires taken from the `connect` output, not `connectEnd`.
- **Both views** render from the same file format. The story view shows story nodes and labelled relation edges, with relation suggestions in a picker that also accepts free text. The recipe view shows input, tool and output nodes with typed handles.
- **Tool nodes are generated** from the registry: one row per derived port, plus the Tool registry's form renderer for the non-port settings, bound to `params`. Ports show their type by colour and icon, and a list port shows its pinned chips.
- **Wire rejection:** the connection validator refuses mismatched types, a second wire into an input, and a wire into a pinned port, so no wire is ever emitted for those.
- **Entity side list:** the project's entities (through the Project store file API), searchable and grouped by type, as draggable chips. Dropping a chip onto an entity or style port pins it in `params`, after checking the port type, the port's entity-kind filter, and that the port has no wire (these checks are app logic, because the canvas library only renders the graph JSON). It works with mouse and touch.
- **Inline status and results:** a status badge per node, driven by signals from the SSE stream and reconciled from current-run-state on load and on wake. Results show as an expandable preview with cited files. Output nodes link to their pending change in the review queue (`/projects/:projectId/review?run=<runId>`).
- **Run controls:** Run, Run to here (on a node), and Stop. Run opens the **input-values dialog**, which lists the input nodes and output nodes in scope (text or file picker, entity picker, style picker with the project default, output target path). The canvas is read-only while a run is active.
- **Story view extras:** a file picker for `path`, a missing-file warning badge, and "Open file", which navigates to the Project store's files route, `/projects/:projectId/files?path=<path>`.
- **Arrange:** a simple layered layout (recipes by topological depth, story graphs by `order` edges and then insertion order) that rewrites `position`. The author saves the result like any other edit.
- **Routes and breakpoints:** one Shell route-table entry at `/projects/:projectId/graphs` (minimum class `phone`) shows the graph list with each recipe's latest run status read-only. Its child route `:graphId` hosts the canvas and is gated to `tablet` with the Shell's `deviceClassGuard('tablet')`, so a phone gets the Shell's "needs a larger screen" page there.
- **Material styling** of nodes, chips, dialogs and badges uses the Shell's theme tokens, in light and dark.

### Sample content
- At M4 the Graph runner adds **one nonfiction recipe** to the nonfiction sample's `graphs/`, for example `graphs/chapter-opening.json`:
  - a text input node "Chapter notes" (meant to be fed a `drafts/` file);
  - an entity input node "Key people and claims";
  - a style input node;
  - the nonfiction workhorse tools (cold open, mystery question, myth-buster and numbers-to-people) chained (for example, mystery question into cold open) on their text ports;
  - one output node writing a draft.
  - Its exact ports follow the Genre packs workhorse specs.
- The sample ships **no story graph**, so draft order is set by the `project.yaml` order field and that path stays demonstrable. It ships no `logs/`, `.scriba/`, `snapshots/` or `.versions/`.
- The recipe must pass Platform's CI check against the graph schema and the registry's tool references. Its path is a contract with `e2e/fixtures/mock-openai/`: renaming it updates the mock script in the same PR.

### Routes and error codes
- REST under `/api/graph-runner/graphs` (list, get, create, save, rename, delete, validate) and `/api/graph-runner/runs` (start, stop, current run state). Reads are GETs and never mutate; every command (including save, rename and delete) is a POST.
- **Validator registration.** In `phase:engine` the module registers the graph schema as the Project store's per-path validator for `graphs/*.json`, so a proposed graph that fails the schema is refused at propose time.
- Route constants and error codes are published. Error codes are prefixed `GRAPH_`, following Platform's error-code convention:
  - `GRAPH_NOT_FOUND`
  - `GRAPH_SCHEMA_INVALID`
  - `GRAPH_SCHEMA_VERSION_UNSUPPORTED`
  - `GRAPH_VALIDATION_FAILED`
  - `GRAPH_VIEW_NOT_RUNNABLE`
  - `GRAPH_RUN_ACTIVE`
  - `GRAPH_RUN_NOT_FOUND`
  - `GRAPH_INPUT_MISSING`
  - `GRAPH_INPUT_INVALID`
  - `GRAPH_TARGET_INVALID`

## Phases

Milestones referenced in this spec, in build order: M1 walking skeleton (project folder, file tools, chat panel and agent loop); M2 tool registry (declarative tool specs, schema validation and the four nonfiction workhorse tools); M3 review and grounding (pending-changes queue, versioned drafts and the grounding check); M4 Graph runner and canvas.

Build waves: wave 0 is Platform; wave 1 is Frontend shell, Setup & auth, Model providers, Project store, Tool registry and Genre packs (nonfiction); wave 2 is Agent loop, Graph runner and Compile & export; wave 3 is the fiction pack and polish.

### `phase:contract` (M4; lands early, in wave 1, because Genre packs' propose-graph is blocked on it)
Blocked by: Platform `phase:scaffold`; Tool registry `phase:contract` (port types, output key); Project store `phase:contract` (file and entity references).

Scope:
- Publish `@bbartolome/scriba-contracts/graph-runner` (Zod + TS, shapes and constants only):
  - the graph file union, story and recipe node schemas, edge schema, node-id and port-id patterns, fixed port keys (`out` on input nodes, `in` on output nodes; tool nodes take the Tool registry's `output`), legal kinds per view, and relation constants with their meanings;
  - input value types and the run start/stop request and response;
  - run state, run status, the stopped-reason enum (`author | project-switched | interrupted`) and node-run-status enums, the SSE event members, and the run-log entry;
  - validation issue shape and codes, the graph list/summary, routes and error codes.
- Write example graph files (one story graph and one recipe) used as contract test fixtures.

Acceptance criteria:
- [ ] The subpath exports the schemas and constants above. It imports port types only from `/tool-registry`, file and entity references only from `/project-store`, and the envelope only from `/platform`.
- [ ] The Zod union accepts the example story graph and recipe, and rejects: an unknown key, a recipe node in a story graph, a `relation` on a recipe wire, a tool node without `tool`, a node id containing a dot, and `schemaVersion` above 1.
- [ ] The example story and recipe files round-trip through parse and serialise without loss.
- [ ] Node-run-status is exactly `idle | queued | running | done | error | stopped`, and run status is `running | done | error | stopped`.
- [ ] Contract tests pass in CI.

### `phase:engine` (M4)
Blocked by: `phase:contract`; Project store `phase:files` (file API, `delete`, `move`, `appendLog`, switch hook) and `phase:pending-review` (propose with a supplied base, validator registration); Tool registry `phase:executor`; Setup & auth `phase:token-guard`.

Scope:
- the NestJS module, graph CRUD through the Project store file API, lazy-migration hook and newer-version refusal;
- recipe validation using registry port derivation, and the validate endpoint;
- the run engine (scope, input values and run-start reads, sequential topological run, Tool registry executor calls with entity resolution, output nodes → pending changes with captured base and origin), stop, one active run per project;
- run state with the current-run-state endpoint, SSE events, run logs, and restart recovery from logs;
- the project-switch stop and the `graphs/` validator registration.

Acceptance criteria:
- [ ] Creating, saving, renaming, listing and deleting graphs over HTTP changes files in `graphs/` as expected. A schema-invalid save returns `GRAPH_SCHEMA_INVALID` and leaves the file unchanged.
- [ ] Saving a schema-valid recipe with a type-mismatched wire succeeds, and the response lists a `error` issue for that wire. Starting a run on it returns `GRAPH_VALIDATION_FAILED`.
- [ ] Starting a run on a story graph returns `GRAPH_VIEW_NOT_RUNNABLE`. Starting a second run while one is active returns `GRAPH_RUN_ACTIVE`.
- [ ] Against the mock OpenAI server, a three-tool recipe run emits `node-status` events in topological order (`queued` → `running` → `done`), ends with `run-ended: done`, and creates exactly one pending change per in-scope output node, with origin `recipe run` and the sources used.
- [ ] With a text input fed a file reference and an output targeting that same file, the pending change's captured base equals the content at run start, even if the file is changed on disk mid-run. Accepting it through the Project store then reports a conflict.
- [ ] "Run to here" on a mid-recipe tool node runs only that node and its upstream nodes, reports downstream nodes as `idle`, and creates no pending change.
- [ ] A mock tool failure marks that node `error` and the queued nodes `stopped`, and ends the run `error`.
- [ ] Stop during a slow mock call ends the run `stopped` within 2 seconds, and no pending change is created afterwards.
- [ ] `logs/recipe-runs/<runId>.jsonl` holds start, per-node, tool-call, pending-change and end entries that parse against the contract.
- [ ] After an API restart mid-run, current-run-state reports that run as `stopped`, with reason `interrupted`.
- [ ] Switching the active project mid-run ends the run `stopped` with reason `project-switched`.
- [ ] A propose of an invalid graph file to `graphs/` through the Project store is refused by the registered validator.

### `phase:canvas` (M4, milestone demo)
Blocked by: `phase:engine`; Frontend shell `phase:core`; Tool registry `phase:form-renderer` (the tool-form component); Project store `phase:pending-review` (review route for links); Genre packs `phase:nonfiction-workhorses` (tools used by the sample recipe).

Scope:
- the lazy route, the graph list, and the `ngx-vflow` adapter with the four workarounds;
- both views, tool nodes generated from the registry (hosting its form renderer), typed-port wire rejection, input and output nodes;
- the entity side list with chip drop, live validation display, run controls and the input-values dialog, inline status and results driven by SSE plus reconcile;
- story-node path picking with Open file, Arrange, Material styling, the phone gate, tablet touch;
- the nonfiction sample recipe;
- the M4 extension to Platform's Playwright e2e.

Done when: *the author builds a chapter recipe visually and runs it end to end.* That means the author builds a recipe that produces a chapter's draft on the canvas, runs it, and gets a pending change.

Acceptance criteria:
- [ ] On desktop, the author builds a recipe from an empty canvas with input, tool and output nodes, using only mouse gestures, form fields and the input-values dialog, then runs it end to end and sees a pending change in the review queue.
- [ ] Drawing a text→entity wire is refused, and so is a second wire into the same input. Neither changes the saved file.
- [ ] Dropping an entity chip onto a matching entity port pins it with no typing. Dropping it on a text port, a port filtered to another kind, or a wired port is refused with a reason.
- [ ] Node badges follow the run live, and they show the correct state after a page reload in the middle of a run.
- [ ] The story view creates scene, beat and entity nodes and labelled relations, and saves a file that parses against the contract with no recipe-only fields.
- [ ] Touch: connect, move a node, and drop a chip all pass in Playwright's touch emulation at a tablet viewport. They are also checked by hand on a real iPad in Safari, with the result noted in the phase's PR.
- [ ] A phone-sized viewport shows the gate message, the graph list and run status, and no canvas.
- [ ] A 150-node generated recipe opens and pans on desktop without the main thread blocking for more than 200 ms (measured once and recorded).
- [ ] The nonfiction sample has the recipe in `graphs/`, it passes the CI sample check, and it runs end to end from "start from sample" against the mock OpenAI server.
- [ ] The Playwright e2e is extended: open the sample recipe → run with input values → all nodes reach `done` → the pending change appears in the review queue.

Demo script (under 5 minutes):
1. Start from the nonfiction sample and open **Graphs**. Show `chapter-opening` with its input, tool and output nodes.
2. Try to wire the "Key people and claims" output into a text port: it is refused. Drag a claim chip from the side list onto the myth-buster's entity port, if that tool is on the canvas: it sticks.
3. Press **Run**. In the dialog, pick `drafts/` chapter notes as the file for "Chapter notes", two people as entities, and keep the default style. Pick the output target `drafts/ch02-opening.md`.
4. Watch the badges go queued → running → done. Expand the cold open's inline result and its cited files.
5. Follow the output node's link to the review queue and show the diff and its origin (the recipe run). Accept it.
6. Open a new story graph. Add two scene nodes pointing at `drafts/` files and a beat, then join them with `order` and `containment`. Show that Run isn't offered.
7. Open `logs/recipe-runs/` and show the run log.

## Contracts

### Produces: `@bbartolome/scriba-contracts/graph-runner` (in `phase:contract`)
- **Graph file schema**: `{schemaVersion, view: 'story' | 'recipe', name, nodes, edges}`, a Zod discriminated union on `view`.
  - Story node: `{id, kind: 'entity' | 'scene' | 'beat', label, path?, position}`.
  - Recipe node: `{id, kind: 'input' | 'tool' | 'output', position, tool?, params?}`.
  - Input-node params `{type, label, entityKind?}`; output-node params `{label?, path?}`.
  - Edge: `{id, from, to, relation?}`.
- **Port-id convention**: `<nodeId>.<key>`, with the node-id pattern, the fixed keys `out` (input node) / `in` (output node), and the Tool registry's reserved `output` key for tool nodes. Also the legal node kinds per view.
- **Relation vocabulary**: `order`, `causality`, `containment`, with their direction meanings (`order`: from precedes to). Free text is allowed.
- **Graph CRUD**: summary/list, create, save and rename requests, and the validation-issue shape and codes.
- **Run start**: `{graphId, inputs, target?: {nodeId}, targets?}`, with input values `{kind: 'text', text} | {kind: 'file', ref} | {kind: 'entities', refs} | {kind: 'style', ref}`. Response `{runId}`. **Stop**: `{runId}`.
- **Run state**: including input values, per-node status, results and pending change ids. Run status is `running | done | error | stopped`.
- **Node-run-status**: `{runId, nodeId, status, result?, error?}`, with status `idle | queued | running | done | error | stopped`. SSE members `run-started`, `node-status` and `run-ended` under module `graph-runner`.
- **Run-log entry** shape for `logs/recipe-runs/`.
- **Routes and `GRAPH_*` error codes.**

Consumers:
- **Genre packs**: propose-graph output must match the graph schema.
- **Agent loop**: validates a proposed graph against the schema before creating the pending change.
- **Compile & export**: reads story graphs and `order` edges.
- **Platform**: the CI sample check.

### Consumes
- **Platform** (`phase:scaffold`, `/platform`): the SSE envelope and stream endpoint, the base error shape and error-code convention, the API composition root, the Playwright harness, the mock OpenAI server, the CI sample check.
- **Setup & auth** (`phase:contract` + `phase:token-guard`): the single guard on every route.
- **Tool registry**:
  - (`phase:contract`, `/tool-registry`): the tool-spec shape, the port-type enum `text | entity | style`, the `x-scriba-port` / `x-scriba-type` vocabulary, the port derivation rule, the output enum `draft | entity | claims | graph | check`, and the tool-execution result `{output, sourcesUsed}`;
  - (`phase:loader-validation` and `phase:executor`, for `phase:engine`): the list/get API exposing derived ports, and the in-process executor;
  - (form-renderer phase, for `phase:canvas`): the Angular form renderer and the entity picker hosted inside tool nodes.
- **Project store**:
  - (`phase:contract`, `/project-store`): project-relative path and file reference, entity reference, the pending-change type (target path, diff, captured base, origin `recipe run`), the `project.yaml` style profile ref, and queue-update events;
  - (`phase:files`, M1, for `phase:engine`): the file API with path safety;
  - (`phase:pending-review`, M3, for `phase:engine` output nodes): creating pending changes with a supplied captured base;
  - (`phase:pending-review`'s review route, for `phase:canvas` links): the review queue route.
- **Model providers**: indirectly, through the Tool registry executor. No direct dependency.
- **Frontend shell** (`phase:core`): API and SSE clients, theming, breakpoint gate, lazy route table, nav.
- **Genre packs** (the nonfiction workhorse tools, M2): the tools used in the sample recipe.

## Testing Decisions

- **What makes a good test:** it exercises external behaviour only, through HTTP responses, SSE events and files on disk, or the rendered route. It never reaches into internal services, the scheduler's data structures or `ngx-vflow` internals.
- **Primary seam (API):** boot the composed NestJS app, or this module imported into a test app, against a temp library folder with an active project and Platform's mock OpenAI server. Cover:
  - graph CRUD;
  - validation responses;
  - run refusals;
  - event order on the SSE stream for whole-recipe and "Run to here" runs;
  - pending changes created through the Project store, including the captured base for file-reference inputs and the mid-run host-edit case;
  - error propagation;
  - stop timing;
  - one-run-per-project;
  - log file content;
  - restart recovery.

  Scripted mock turns supply success, malformed-argument and slow responses.
- **Contract seam:** Vitest over the Zod schemas, using the example graph files (valid and invalid), plus Platform's CI check that validates `examples/` graphs against the schema and the registry.
- **UI seam:** the lazy route rendered with Angular's Vitest runner against a fake API and SSE client built from the contract types. Cover:
  - the graph list;
  - the input-values dialog (scope-aware fields, style default, target paths);
  - status badges following fake `node-status` events, and reconcile from current-run-state;
  - validation issue display and the disabled Run button;
  - chip-drop refusal rules, as the drop handler's observable outcome on the saved graph;
  - the phone gate.
- **Gesture checks:** the DOM test environment has no layout, so real gestures (drawing wires, dropping on a port, touch) are checked by this module's step in the Platform Playwright e2e and a canvas-gesture Playwright spec, desktop and touch-emulated.
- **System seam:** the M4 extension of the single Playwright e2e (open sample recipe → run → pending change in the review queue), using Platform's harness and mock OpenAI.
- **Manual:** a real-iPad Safari check, plus one recorded large-graph measurement in `phase:canvas`. Neither was tested in the canvas library evaluation.
- **Prior art:** none in the repo. The canvas spike's `prototypes/canvas-spike/e2e/spike.cjs` (on the throwaway `spike/canvas-library-8` branch) is reference only. Vitest everywhere, with NestJS via `unplugin-swc`. Unit tests keep their own fixtures and never read `examples/`.

## Out of Scope

- **Running story graphs**, and running a scene through an attached recipe. Either can be added later without breaking anything.
- **Saved links between the views**: no story node inside a recipe, and no recipe node inside a story graph. The only bridge is choosing a file as an input value.
- **Merge, Compare and Gate nodes, entity nodes in recipes, note nodes, and branch or loop nodes.** Recipes have input, tool and output nodes only, replacing the earlier six-kind list (entity, tool, merge, compare, gate and output), and entity values arrive as input values or pinned chips. Remix comparison and gating steps, if they come back, return as tools or later node kinds through expand–contract.
- **Reusing results from earlier runs**, and running independent branches in parallel. Both can be added later.
- **Output nodes for `claims` and `check` outputs** (see Further Notes).
- **Generating graphs from a typed intent.** That is propose-graph (Genre packs, core pack) called by the Agent loop. The runner only receives the accepted file.
- **Sections or heading anchors inside a scene file**, and a `scenes/`, `beats/` or `structure/` folder.
- **A SQLite run-log index** (deferred; `logs/` is the source of truth).
- **Smart auto-layout** beyond the simple layered Arrange; collaborative or multi-user editing; canvas editing on phones.
- **Current choices that replace earlier proposals** (each bullet says what it replaces):
  - The canvas is built with Angular and `ngx-vflow` (replacing React and React Flow).
  - Tool inputs are described by JSON Schema from the Tool registry and validated with Ajv (replacing Zod).
  - Decisions are recorded in `docs/adr/` (replacing a single `DECISIONS.md` file that logged each choice).
  - Output nodes create pending changes and never write files directly (replacing an output that wrote a chapter or scene draft).

## Further Notes

- **Risks carried into `phase:canvas`**: real tablets and Safari, Material styling, large graphs, and layout were not tested in the canvas library evaluation. Each is an acceptance criterion or a recorded check above.
  - Slower `ngx-vflow` releases and its 32 open reports are an accepted cost. The graph JSON is the contract, so the renderer can be swapped later as a UI change, not a data migration. `@foblex/flow` also passed every check and remains the fallback.
  - The canvas library evaluation also did not test whether a node updates when its tool spec changes. The canvas re-derives ports when it loads a graph. Live update while a graph is open is not required in v1.
- **`claims` and `check` outputs:** The output enum decides the target file kind, but no file location is defined for claims lists or check reports. Writing them into `drafts/` would put them in the manuscript. This spec makes them inline-and-logged only in v1, rejected at output nodes by validation. If they are later written to files, the smallest addition is a mapping for these kinds (for example, a report folder outside `drafts/`). That is an additive change to validation and the output mapping, needing no schema change.
- **Design choices made in this spec:**
  - the six node statuses;
  - running nodes one at a time;
  - fail-fast on error;
  - one active run per project;
  - the fixed port keys `out` / `in`, and the tool-node output key `output` taken from the Tool registry;
  - output target precedence (request, then `params.path`, then a generated name);
  - pinned port values in `params`;
  - `logs/recipe-runs/` as the log location;
  - graph id = file stem.

  Each one is the simplest option that can be widened later through expand–contract.
- **Provenance:** every draft records the entity IDs and tool run behind it, so the author can trace any sentence back to its inputs. For recipe runs, this is carried on the pending change's `recipe-run` origin (`runId`, `graphId`, `nodeId`), its `provenance` field (`entityIds`, `sourcesUsed`), and the run log.
- **The canvas spike branch** (`spike/canvas-library-8`, `prototypes/canvas-spike/`) is throwaway. Its identical story and recipe fixtures were filler, not semantics.
- **Scheduling:** the contract phase should land during wave 1, because Genre packs' propose-graph is blocked on it. The engine and canvas phases are wave 2 and demo M4.
