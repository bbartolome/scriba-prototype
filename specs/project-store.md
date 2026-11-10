# Spec: Project store

## Problem Statement

The author keeps a book as a plain folder of Markdown and YAML so they can open it in any editor and keep it in git. Scriba has to work on those folders without taking them over, and an LLM agent has to be kept from damaging them.

Today nothing connects the two. There is no library of projects, no safe way for the agent or a recipe to read and write a project's files, and no way to find the author's own research when a tool or the grounding check needs it. The author also has no single place to review, accept or reject what the agent proposes. Local models invent facts and make mistakes, so every agent or recipe write must wait for the author's approval, every draft must keep its history, and a file the author changed in another editor during a run must never be silently overwritten. The author also works from a phone and a tablet, so reviewing has to work on a small screen.

## Solution

The Project store is the module that owns the author's books on disk. It provides:

- **A library at `/books`.** This is the single bind mount of the host's `~/Books`. Every immediate non-dot subfolder that holds a `project.yaml` is a project. The author can create a new project (a scaffold), import an existing folder, or start from one of the samples baked into the image. Exactly one project is active at a time.
- **A path-safe file API.** List, read, write, and edit (exact old text to new text), with project-relative paths only. The author's own typing saves directly through it. Every agent or recipe write becomes a **pending change** instead.
- **Entity reference resolution.** Callers turn an entity ID into its file and contents.
- **Keyword search per project.** SQLite FTS5 over `sources/` and `entities/`, behind a backend-agnostic search contract that the Agent loop's tools and grounding check use.
- **A pending-changes queue.** Each change lives in `<project>/.scriba/pending/` and stores a diff against a **captured base**. A three-way check runs when the change is applied, so a host edit made in the meantime is flagged as a conflict instead of overwritten.
- **Per-draft versions.** When a pending change to a draft is applied, the previous content is saved under `drafts/.versions/`.
- **Author-facing UI.** A project picker, a files browser, a phone-friendly review queue that uses the Frontend shell's diff view, and a draft-version history.
- **Lazy, backed-up migrations** of project files. A file with a newer `schemaVersion` is refused.

## User Stories

1. As an author, I want Scriba to find every book project in my `~/Books` folder automatically, so that I don't have to register projects one by one.
2. As an author, I want folders whose names start with a dot (including Scriba's own `.scriba/`) to be ignored by discovery, so that app state and hidden folders never appear as books.
3. As an author, I want subfolders of my library that lack a `project.yaml` to be offered for import, so that an existing manuscript folder can become a Scriba project.
4. As an author, I want to create a new project from a title, so that I get a ready-to-use folder without building the layout by hand.
5. As an author, I want a new project to contain `project.yaml`, `sources/`, `entities/`, `drafts/`, `graphs/` and `logs/`, so that every Scriba feature knows where my material lives.
6. As an author, I want a new project to include a `.gitignore` that covers `.scriba/`, so that pending changes and other machine state stay out of my git history.
7. As an author, I want importing a folder to validate its `project.yaml`, or create a minimal one if it has none, without touching my other files, so that importing is safe on a folder I care about.
8. As an author, I want import to tell me exactly what is wrong with an invalid `project.yaml`, so that I can fix it in my own editor.
9. As an author, I want to start a new project from the nonfiction sample, so that I can try every feature on realistic material before using my own book.
10. As an author, I want the samples to be copied only when I ask, so that my library never fills with demo projects.
11. As an author, I want to choose the folder name and title when I start from a sample, so that I can keep several experiments apart.
12. As an author, I want exactly one active project, with switching available from a picker, so that I always know which book the agent is working on.
13. As an author, I want the active project to be remembered across restarts and to match on every device and tab, so that my phone and my Mac agree on which book is open.
14. As an author, I want the agent's file tools to be confined to the active project, so that a confused model can never read or change another book or anything outside my library.
15. As an author, I want paths that use `..`, absolute paths, or symlinks pointing outside the project to be rejected, so that path tricks can't escape the project.
16. As an author, I want Scriba to show only project-relative paths in the UI, logs and tools, so that container paths never leak into my notes or the model's context.
17. As an author, I want to browse the files of the active project as a tree, so that I can see what the agent and I have written.
18. As an author, I want to open any text file in the shared Markdown editor and have my typing save directly to disk, so that editing feels like a normal editor and not like a review queue.
19. As an author, I want a save to be refused with a clear message if the file changed on disk since I opened it, so that I don't silently overwrite an edit I made in another editor.
20. As an author, I want files to be written atomically, so that a crash or power loss never leaves a half-written chapter.
21. As an author on my phone, I want to read files in the files browser, so that I can check a chapter away from my desk.
22. As an author, I want every write from the agent or from a recipe run to land in a pending-changes queue, so that nothing reaches my book without my approval.
23. As an author, I want to see each pending change as a diff against the text it was based on, so that I know exactly what would change.
24. As an author, I want pending changes to show where they came from (which agent run or which recipe run and Output node), so that I can trace a proposal back to the run that produced it.
25. As an author, I want to accept or reject each pending change, so that I keep full control of my text.
26. As an author, I want a pending change to be flagged as a conflict when the file on disk no longer matches the base it was made against, so that my host edits are never overwritten without my say.
27. As an author, I want to refresh a conflicted change, and have it merged cleanly when my edits and the proposal touch different parts, so that small host edits don't force me to throw proposals away.
28. As an author, I want to be able to accept a conflicted change anyway after an explicit confirmation, with my on-disk text saved first, so that I can still choose the proposal without losing anything.
29. As an author on my phone, I want the review queue to work at phone width, with large accept and reject buttons and a readable diff, so that I can review the agent's work away from my desk.
30. As an author, I want the review queue to update live when new changes arrive, are resolved, or become conflicted, so that every open tab and device shows the same queue.
31. As an author, I want pending changes to live inside the project folder, so that they travel with the book when I move or copy it.
32. As an author, I want the previous text of a draft to be saved automatically when I accept a change to it, so that every draft is versioned as the brief promises.
33. As an author, I want to list the versions of a draft, view one, and diff it against the current draft, so that I can see how a chapter evolved.
34. As an author, I want to restore an older version of a draft, with the current text saved as a version first, so that rolling back is itself reversible.
35. As an author, I want draft versions to be kept in `drafts/.versions/`, separate from my current drafts, so that the manuscript only ever contains current drafts.
36. As an author, I want to search my sources and entities by keyword, so that I can find a quote or a study quickly.
37. As an author, I want search to reflect files I just edited on the host without a manual rebuild, so that results never go stale.
38. As an author, I want to be able to rebuild a project's search index, so that I can recover if something looks wrong.
39. As an author, I want my drafts kept out of the search index, so that the grounding check compares claims against my sources and never against my own prose.
40. As an author, I want Scriba to open a project made by an older version of Scriba and upgrade its files automatically, with a backup and a log entry, so that updates don't break my books.
41. As an author, I want Scriba to refuse a file written by a newer version instead of corrupting it, so that rolling back to an older image is safe.
42. As an author, I want my comments and key order in `project.yaml` to survive any change Scriba makes to it, so that the file stays mine.
43. As an author, I want an optional file watcher to refresh the files view and the review queue when I edit on the host, so that the UI stays current without a reload.
44. As the Agent loop, I want list, read, write, edit and search operations scoped to the active project, so that I can expose them as project tools to the model.
45. As the Agent loop, I want my writes and edits to become pending changes tagged with my run, and later edits in the same run to build on my earlier pending text, so that a multi-step run behaves coherently without touching disk.
46. As the Agent loop and the Tool registry's callers, I want to resolve entity IDs to their file paths and contents in one call, so that tool templates receive the resolved content and citations stay accurate.
47. As the Agent loop's grounding check, I want ranked passages `{path, offset, snippet, score}` from `sources/`, so that the model can judge each claim against a cited passage.
48. As the Graph runner, I want to create a pending change with a captured base I recorded at run start, so that an author edit during the run is flagged by the three-way check.
49. As the Graph runner, I want to register a validator for graph files, so that a proposed graph that fails the graph schema is rejected before it reaches the queue.
50. As Compile & export, I want the `project.yaml` order field reserved in the schema from day one, so that I can own its meaning without a schema migration.
51. As Setup & auth, I want to create a first project (new or from a sample) during `/setup` through the same API the picker uses, so that there is one way to create projects.
52. As Model providers, I want a per-project model override field in `project.yaml`, so that a book can pin its own model.
53. As Genre packs, I want a generic entity front-matter base (`id`, `type`, `links`), so that each pack's entity types extend one shared shape.
54. As a maintainer, I want CI to validate the samples in `examples/` against the published schemas, so that a sample can never ship broken.

## Implementation Decisions

### Library and discovery
- The library root is `/books` inside the container, bound to the host's `~/Books`. The path can be configured through a `SCRIBA_*` env name that Platform lists.
- A project is every **immediate, non-dot subfolder** of the library that contains `project.yaml`. Discovery never recurses and never follows a symlinked top-level folder that points outside the library.
- The **project id** is the folder name. The search index file is named after the project id, percent-encoded so that any legal folder name is safe as a file name. When the author renames a folder on the host, the project gets a new id. The old index is disposable and is pruned at startup.
- The project list reports, for each folder: id, title, genre pack, whether it is active, and a status: `ok`, `invalid` (with the schema error), `too-new` (a newer `schemaVersion`), or `importable` (no `project.yaml`).

### Creating projects
- **New** takes a folder name and a title. The folder name is limited to a slug of lowercase letters, digits and hyphens, derived from the title by default. New fails with a "project exists" error if the folder already exists. It scaffolds the brief's layout **minus `structure/`**: `project.yaml`, `sources/`, `entities/`, `drafts/`, `graphs/`, `logs/`, plus a `.gitignore` that contains `.scriba/`. New does not create `snapshots/`, which Compile & export creates on first use, and it adds no scene or beat folders.
- **Import** applies to an `importable` or `invalid` folder. Import validates `project.yaml`, or creates a minimal one (title from the folder name, `schemaVersion` 1). It appends `.scriba/` to the `.gitignore` if that line is missing. It never moves, renames or rewrites any other file, and it never creates the layout folders. Missing folders are created lazily on the first write.
- **Start from sample** copies a sample that is baked into the image (read-only, beside the built-in packs under `/opt/scriba/`) into a new library folder whose name and title the author chooses. Samples are **never auto-copied**. The copy excludes `.scriba/`, `logs/`, `snapshots/` and `drafts/.versions/`, although the samples ship none of these anyway.
- All three operations are POSTs behind Setup & auth's guard. Setup & auth's `/setup` flow calls the same endpoints to create the first project.

### One active project
- Exactly one project is active, library-wide. It is persisted in app state under `/books/.scriba/` (as a Project store key in `settings.yaml`), so every device and tab agrees on it. Switching is a POST. It publishes a `project.switched` SSE event and re-scopes the agent's file tools.
- Every file-API, search, resolution and pending-change request names the `projectId` it expects. A request for a project that is not active fails with a "project not active" error, so a run started before a switch can never write into the newly active project.
- Activating a project validates `project.yaml`. A `too-new` project cannot be activated. Activation is also where the project's lazy migrations run (see Migrations).

### Path safety (invariant)
Every path that enters the module is checked through one function, used by every endpoint and every in-process caller:
- Paths are project-relative POSIX strings. Absolute paths, `..` segments, backslashes, NUL bytes and empty segments are rejected.
- The path is joined to the project root and canonicalised, and symlinks are resolved: the real path of the target, or of its nearest existing ancestor when the target does not exist yet. The result must have the real project root as a prefix. A symlink inside the project that points outside it is rejected.
- **Reserved paths** cannot be reached through the public file API: `.scriba/` (pending changes, backups) and `drafts/.versions/`. Only the module's own pending-change and version operations touch them. Story-node pointers and file references never target a version.
- The bind mount may be case-insensitive (macOS hosts), so the prefix check compares real paths and does not depend on letter case in the input.

### File API
- **list** takes a directory and an optional recursive flag and returns entries `{path, kind: file|dir, size, mtime}`. Dot-entries are hidden by default.
- **read** returns `{path, content, hash, mtime}`, where `hash` is a content hash used as the base for later checks. The API serves UTF-8 text only. A file over a size cap (5 MB in v1) or a non-text file is refused with a typed error, though it still appears in `list`.
- **write** (an author save) takes `{path, content, baseHash?}`. When `baseHash` is given and the file on disk no longer matches it, the write fails with a write-conflict error, so the Shell editor can warn about a host edit. Writes are atomic (a temp file in the same folder, then a rename) and create missing parent folders.
- **edit** (an author edit) takes `{path, old, new}`. It applies an exact replacement and fails with distinct errors when `old` matches zero times or more than once.
- **Agent and recipe writes are never direct.** The module exposes a separate **propose** operation (`write` or `edit` semantics plus an `origin`) that creates or updates a pending change instead of touching disk. The Agent loop maps its write and edit tools to propose. The direct `write` and `edit` are only for the author's own UI actions.
- A propose **read overlay**: a read that names an origin run returns that run's proposed content for any target it already has pending. Within one run, a later propose to the same target updates that run's existing pending change and keeps its original captured base. Different runs never merge. Each run gets its own pending change.
- `project.yaml` writes are validated against the schema and preserve the author's comments and key order (edited as a YAML document, not re-serialised from an object).
- Endpoints that read are GETs and never mutate (a cross-module invariant). Search, index rebuild, activation and every write are POSTs, because they may refresh the index or migrate files.
- The same operations are exported as an injectable NestJS provider for in-process callers (Agent loop, Graph runner, Compile & export). The provider goes through the same path checks, active-project check and validators as the HTTP routes.

### `project.yaml` schema (published in `/project-store`)
`{schemaVersion, title, genrePack, styleProfile?, export?, model?, order?}`
- `schemaVersion` is an integer that starts at 1.
- `genrePack` is a pack name (`nonfiction`, `fiction` or a user pack).
- `styleProfile` is an optional entity reference.
- `export` holds export settings. Its inner keys (Pandoc template path and the like) are owned by Compile & export and are kept as a passthrough object until that module's contract phase narrows it.
- `model` is the per-project model override. Its shape is the per-project model choice type from Model providers' `/providers` slice.
- `order` is **reserved from day one** as an optional list whose entries are kept as a passthrough until Compile & export's contract phase narrows them (Compile & export's `OrderEntry` is `{path, status?, part?}`). Compile & export owns its meaning, its writes (the reorder request) and the sample's order content. The Project store owns only the field in the schema.
- Unknown keys are preserved on round trip, so newer optional fields survive an older app.

### Entity references and front matter
- **Entity reference** is a string ID. The **generic entity front-matter base** is `{id, type, links?}`, where `links` is a list of entity IDs. Genre packs extend it per entity type. The Tool registry validates those schemas, and the Project store only reads the base.
- **Resolution** maps IDs to files across `entities/` and `sources/` (Source entities live in `sources/`). The front-matter `id` wins. A file with no `id` resolves by its file stem. Resolution returns `{id, type, path, content}` for each ID, plus typed errors for unknown IDs and for duplicate IDs (the same ID in two files is reported, never guessed).
- An **entity list** (filterable by `type`) serves pickers and the Graph runner's drag-to-input chips.
- The ID→path map is rebuilt from the same `(path, mtime, size)` manifest that search uses, so host edits are picked up on the next request.

### Search (FTS5)
- One disposable database per project at `/books/.scriba/index/<project-id>.db`, through `node:sqlite`. It indexes **`sources/` and `entities/` only**. `drafts/` is excluded so the grounding check never matches the author's prose.
- **Passages** are paragraphs: blocks split on blank lines, with front-matter values indexed as their own passage. A passage records its file and its character offset in the file. The tokenizer is `porter unicode61`.
- **Freshness**: a `(path, mtime, size)` manifest stored in the database is diffed against disk when a project is activated and before each query. Only changed, added or removed files are re-indexed. A full rebuild is a POST. A `PRAGMA user_version` that differs from the module's index-format constant triggers a rebuild on open.
- **Query**: the author's text is turned into a safe FTS5 query (terms quoted, joined with OR, so long claims still retrieve) and ranked by BM25. The **search contract** is `{query, limit?, scope?: ('sources'|'entities')[]} → ranked passages {path, offset, snippet, score}`. Higher `score` is better (negated BM25), and the snippet comes from FTS5's snippet function. The contract names no FTS5 concept, so vector search can be added behind it later.

### Pending changes
**Shape** (published in `/project-store`):

`{id, projectId, targetPath, kind: create|modify, diff, capturedBase: {hash, content} | null, proposed, origin, status, conflict, createdAt, updatedAt}`

- `origin` is `{kind:'agent-run', runId, toolCallId?}` or `{kind:'recipe-run', runId, nodeId}`.
- `status` is `pending|accepted|rejected`.
- `conflict` is `null` or `{reason: 'base-changed'|'target-missing'|'target-exists', detectedAt}`.
- `diff` is a unified diff of the captured base against `proposed`, for display. The base and proposed contents are kept in full, because the three-way check and the merge need them.

**Storage.** One JSON file per change in `<project>/.scriba/pending/`, with sortable, time-based IDs. Resolved changes move to `.scriba/pending/resolved/`, so the queue lists only open ones. All of it is git-ignored through the scaffolded `.gitignore`.

**Captured base.**
- A caller may supply a base: the Graph runner supplies the content it read at run start.
- Otherwise the Project store captures the target's current disk content when the change is first proposed. A missing target means `kind: create` with a `null` base.

**Validation on propose.** The target must pass path safety and must not be reserved. Content is checked by per-path validators:
- `project.yaml` is checked against its own schema.
- Other modules register validators by path pattern. The Graph runner registers the graph schema for `graphs/`, so an invalid proposed graph is refused.
- The Project store never imports another module's implementation.

**Three-way check on apply**: base vs. pending vs. disk.
- If disk matches the captured base (or is absent for a create), the proposed content is written atomically.
- Otherwise the change is flagged as a conflict and apply is refused with a typed error.
- Conflicts are also detected eagerly: when the queue is listed, when the watcher sees a change, and before apply. A `pending.updated` event is published when the flag changes.

**Conflict resolution.** Three author actions:
- **reject**.
- **refresh**: a three-way merge of base, proposed and disk. If the merge is clean, the same change gets disk as its new base and the merged text as `proposed`, and the conflict clears. Overlapping hunks leave the change conflicted.
- **accept anyway**: an explicit confirmation is required. The current disk content is saved first, as a draft version for top-level `drafts/` files or under `<project>/.scriba/backups/` for anything else, and then the proposal is written.

**Events.** These are `project-store` members of Platform's SSE envelope `{module, type, data}`:
- `pending.created`, `pending.updated` and `pending.resolved`: the queue-update events.
- `files.changed` with `{paths}`.
- `project.switched`.

**Access.** Accept, reject, refresh and accept-anyway are POSTs behind Setup & auth's guard.

### Draft versions
- Versions are written **only when a pending change is applied** to a **top-level file in `drafts/`** that already exists. The content being replaced is saved as the new version. Creating a new draft writes no version. The author's direct saves write no version, but their result is captured by the next apply.
- **Sub-path shape (decided here):** `drafts/.versions/<draft file name>/<UTC timestamp>.<ext>`. The folder is the draft's full file name, extension included. The timestamp is compact ISO-8601 basic format with milliseconds, with a numeric suffix on collision. Example: `drafts/.versions/ch03.md/20261104T231500123Z.md`. Versions belong to their draft by file name, so renaming a draft orphans its versions. This is the known cost recorded in the decision on current draft versus older versions, and a stable ID can be added later.
- The **draft-version listing** returns `{draftPath, versions: [{id, createdAt, size}]}`. Reading a version returns its content. **Restore** is an author action (POST): it saves the current content as a version, then writes the restored text directly.
- Only the Project store reads `drafts/.versions/`. Compile & export assembles top-level `drafts/` files only and never reads versions. `drafts/.versions/` is **not** git-ignored, so the history travels with the book.

### Watcher (optional)
- A file watcher over the active project publishes `files.changed` (debounced) and re-checks conflict flags.
- It only refreshes the UI. Correctness never depends on it, because files are re-read on demand and the manifest diff covers search.
- It can be turned off through a `SCRIBA_*` env name that Platform lists, for hosts where bind-mount events are unreliable.

### Migrations
- Per-file `schemaVersion` with a migration registry keyed by file kind and version. The Project store owns the mechanism and the `project.yaml` migrators. Other modules register migrators for their file kinds (for example, the Graph runner for `graphs/`).
- Migrations run **lazily, and only from POSTs**. Activation migrates `project.yaml`. Other files migrate on their first write through the module, or on an owning module's POST. A GET read of an older file returns an in-memory upgraded view, marked as such, and writes nothing.
- Each migration writes a backup to `<project>/.scriba/backups/<timestamp>/<path>` and appends a line to `logs/migrations.log`. A migration is **not** a pending change.
- A file with a `schemaVersion` newer than the app supports is refused for reads and writes with a "schema too new" error. A project whose `project.yaml` is too new lists as `too-new` and cannot be activated. This refusal ships in `phase:files`, before any migrator exists, so rolling back to an older image is safe from v1.
- `settings.yaml` migrates eagerly at startup and belongs to its owner, not to this module.

### Samples (`examples/`)
- The Project store owns `examples/`, the start-from-sample mechanism, and the **nonfiction skeleton**:
  - `project.yaml` with `schemaVersion` 1, a title, `genrePack: nonfiction` and no `order`. Compile & export adds `order` at M5.
  - `sources/` with 3–5 short source documents. One of them is the author's outline notes, `sources/outline.md`, so that the M1 "summarize my outline" demo has an outline without a `structure/` folder.
  - `drafts/` with 2–3 draft files of a few hundred words each.
- Other modules add their pieces at their milestones: nonfiction `entities/` (Genre packs), the grounding-claims draft (Agent loop), the recipe (Graph runner), the order field (Compile & export), and the whole fiction sample (Genre packs).
- Source texts are public domain or written for the sample. The topic fits the brief's running example (practice and expertise), so intents like "draft the cold open for chapter 3 from my notes on the 10,000 hour idea" make sense.
- The nonfiction sample is the e2e fixture. Its file paths are a contract with `e2e/fixtures/mock-openai/`, so renaming a sample file updates the mock script in the same PR.

### UI (lazy route + NestJS module)
- **Project picker**:
  - Lists projects with their status.
  - Offers **New**, **Import** and **Start from sample** (sample cards with a short description).
  - Switches the active project.
  - Shows the active project in the Shell's nav slot.
  - Usable at phone width.
- **Files**:
  - A tree of the active project.
  - Opens a file in the Shell's CodeMirror 6 editor (desktop and tablet), with direct save and a stale-base warning.
  - Read-only Markdown reading on phone, through the Shell's breakpoint gate.
  - Shows each draft's version history, with a diff against the current draft and a restore action.
- **Review queue**:
  - A list grouped by origin run, with conflict badges.
  - Each change opens in the Shell's diff view: read-only from `phase:shared-components`, or the `@codemirror/merge` view once Shell's `phase:editor` lands.
  - Accept, reject, refresh and accept-anyway actions.
  - Live updates from SSE.
  - Phone-friendly: one column, unified diff by default on narrow screens, sticky large action buttons.
- The module ships a lazy `Routes` array and its own NestJS `@Module`, and adds its event members to the SSE stream.

### Errors
Typed error codes following Platform's convention, prefixed for this module and published in the slice:
- path invalid, path outside project, path reserved
- not found, not text, file too large
- write conflict, edit no match, edit ambiguous
- no active project, project not active, project exists, project invalid
- schema too new
- entity not found, entity duplicate ID
- pending conflict, pending not open
- validation failed

## Phases

Serial. Every phase is gated on Platform `phase:scaffold`.

### `phase:contract` (M1)
**Scope.** Publish `@bbartolome/scriba-contracts/project-store`. It holds Zod schemas and TS types, and nothing else:
- the `project.yaml` schema, with the reserved `order` field;
- the project summary/list and status enum, and the new/import/start-from-sample/activate requests;
- the project-relative path and **file reference** types, and the file-API requests and responses (list/read/write/edit/propose);
- the **entity reference** type and the generic entity front-matter base;
- the entity-resolution request and result;
- the search request and ranked passage `{path, offset, snippet, score}`;
- **pending change** (with captured base, origin, status, conflict), and the accept/reject/refresh/accept-anyway requests;
- the draft-version listing;
- the SSE event members (`pending.created|updated|resolved`, `files.changed`, `project.switched`);
- route constants and error codes.

**Consumes.** Platform's `/platform` (envelope, error base) and Model providers' `/providers` per-project model choice (its `phase:contract`).

**Acceptance criteria.**
- [ ] The slice builds and is importable from both `apps/api` and `apps/web`, with no runtime dependencies beyond Zod.
- [ ] Schema tests accept a valid `project.yaml` (with and without `order`), reject a missing `schemaVersion`, and preserve unknown keys.
- [ ] Pending-change, search and entity-reference schemas have round-trip tests.
- [ ] Platform's sample CI check can import the `project.yaml` schema.

### `phase:files` (M1)
**Scope.**
- Library discovery and the project list, including statuses.
- New, import and start from sample (`examples/` baked into the image), the one active project with switching and persistence, and the "project not active" check.
- The path-safety invariant and reserved paths.
- The file API (list/read/write with `baseHash`/edit, atomic writes) and the in-process provider.
- Entity reference resolution and entity list. `project.yaml` YAML-document editing.
- The "schema too new" refusal.
- The `examples/` nonfiction skeleton.
- The project picker and files UI (needs Shell `phase:core`). Editing in files needs Shell `phase:editor`, and until then files are read-only, rendered with `ngx-markdown`.
- `project.switched` events.
- Extending Platform's e2e with the "project from sample" step.

**Acceptance criteria.**
- [ ] Discovery lists exactly the non-dot immediate subfolders with `project.yaml`, and marks the others `importable`.
- [ ] New creates the layout without `structure/` and with a `.gitignore` containing `.scriba/`. Import leaves every other file byte-identical.
- [ ] Start from sample copies the nonfiction sample under a chosen name. Nothing is copied at startup.
- [ ] The path-safety table passes over HTTP: `..`, absolute, backslash, NUL, a symlink out (rejected), a symlink within (allowed), `.scriba/…` and `drafts/.versions/…` (reserved).
- [ ] Requests naming a non-active project fail, and switching publishes `project.switched`.
- [ ] `edit` fails distinctly on zero and on multiple matches. A `write` with a stale `baseHash` fails with a write conflict.
- [ ] Resolution returns contents for IDs in `entities/` and `sources/`, and reports unknown and duplicate IDs.
- [ ] A `project.yaml` with a higher `schemaVersion` lists as `too-new` and cannot be activated.
- [ ] Every GET is side-effect free (Setup & auth's invariant test passes for these routes).

**M1 "done when"** (shared with the Agent loop, which owns the chat): *the author types "summarize my outline" and gets a correct answer with visible tool calls.* The Project store's part is the file API the agent's tools call and the sample's `sources/outline.md`.

**Demo (under 5 min).**
1. Open the picker and choose **Start from sample → Nonfiction**, named `demo-book`.
2. Show `demo-book/` on the host. The layout has no `structure/`, and `.gitignore` lists `.scriba/`.
3. Browse `sources/outline.md` in files, edit a line, save, and show the change on the host.
4. Edit the same file on the host, then save in the browser. The stale-base warning appears.
5. Run a `..` path through the API and show the rejection.
6. In chat, type "summarize my outline" (Agent loop).

### `phase:search` (M2)
**Scope.**
- The FTS5 index per project at `/books/.scriba/index/<project-id>.db` over `sources/` and `entities/`.
- Paragraph passages and the manifest diff on activation and before queries.
- The full-rebuild POST, a rebuild on a `user_version` mismatch, and orphan index pruning.
- The search endpoint and provider implementing the backend-agnostic contract.
- A search box in the files UI.

**Acceptance criteria.**
- [ ] A query returns ranked `{path, offset, snippet, score}`, and the passage text sits at `offset` in the file.
- [ ] A file edited on the host appears in the next query's results with no manual rebuild. A deleted file disappears.
- [ ] Files in `drafts/` never appear in results.
- [ ] Replacing the index with one whose `user_version` differs triggers a rebuild, and results stay correct.
- [ ] A query with FTS5 syntax characters (`"`, `*`, `-`, `NEAR`) does not error.

**M2 note.** This phase gives the M2 workhorse tools and the Agent loop a way to look things up. M2's "done when" (each workhorse produces a draft that cites its source files) is demoed by the Tool registry, Genre packs and the Agent loop. Entity resolution from `phase:files` and this search are what they cite.

### `phase:pending-review` (M3)
**Scope.**
- Propose (write/edit with `origin`), and the per-run overlay read and fold.
- The pending-change store in `<project>/.scriba/pending/`, the captured base (caller-supplied or captured), and per-path validator registration.
- Eager conflict detection, the three-way check on apply, refresh (a clean three-way merge), accept-anyway with a backup, and reject.
- Draft versions written on apply to `drafts/.versions/<draft file name>/<timestamp>.<ext>`, with listing, read and restore.
- The queue-update SSE events and the optional watcher (`files.changed`).
- The review queue UI (needs Shell `phase:shared-components`, and `phase:editor` for the merge view) and the version history UI.
- Extending Platform's e2e: "accept change" writes the draft and a version.

**Acceptance criteria.**
- [ ] A propose never changes the target file on disk. It creates exactly one pending file and one `pending.created` event.
- [ ] A second propose to the same target from the same run updates that change and keeps the original base. A different run creates a separate change.
- [ ] Applying a change whose base matches disk writes the proposal and, for an existing top-level draft, writes the previous content to `drafts/.versions/<name>/…`.
- [ ] Editing the target on the host before apply flags a `base-changed` conflict (a `pending.updated` event) and apply is refused. Refresh clears it when the edits don't overlap and keeps it when they do.
- [ ] Accept-anyway keeps the overwritten disk content as a version or a backup.
- [ ] A proposed `graphs/` file that fails a registered validator is refused.
- [ ] The review queue works at phone width (UI test at a narrow viewport): list, diff, accept and reject.
- [ ] Restore saves the current content as a version before writing.

**M3 "done when"** (shared with the Agent loop's grounding check): *an invented statistic in a draft is flagged as unsupported.* The Project store's part is the search retrieval over `sources/` and the reviewable, versioned draft the agent proposes.

**Demo (under 5 min).**
1. In the sample, ask the agent to tighten `drafts/` chapter 1. A pending change appears live in the review queue on the desktop and on the phone.
2. On the phone, open the diff and accept it. Show the new draft and the previous text in `drafts/.versions/<name>/…` on the host.
3. Ask for a second edit, then edit the same paragraph on the host. The queue flags a conflict. Refresh keeps it conflicted, and Reject clears it.
4. Open the draft's history and restore the first version.
5. Run the grounding check on the claims draft (Agent loop) and show the unsupported statistic.

### `phase:migrations` (M7, and required before any file kind ships `schemaVersion` 2)
**Scope.**
- The migration registry (per file kind and version) with registration for other modules.
- Lazy, POST-only migration: `project.yaml` on activation, other kinds on first write.
- The in-memory upgraded view on GET.
- Backups under `<project>/.scriba/backups/<timestamp>/` and the `logs/migrations.log` entry.

**Acceptance criteria.**
- [ ] With a test migrator (v1→v2) registered, activating a v1 project rewrites `project.yaml` to v2, writes a backup and a log line, and creates no pending change.
- [ ] A GET of a v1 file returns the upgraded view and leaves the file byte-identical.
- [ ] A file with a too-new version is refused for read and write.
- [ ] Comments in `project.yaml` survive a migration.

## Contracts

### Produces: `@bbartolome/scriba-contracts/project-store` (in `phase:contract`)
| Shape | Consumers |
|---|---|
| `project.yaml` schema (`schemaVersion`, title, genre pack, style-profile ref, export settings, model override, reserved `order`) | Compile & export (order semantics, export settings), Model providers (per-project override), Setup & auth, Platform (sample CI check) |
| Project summary/list, new/import/start-from-sample/activate requests | Setup & auth (`/setup` first project), Frontend shell (active-project nav slot) |
| Project-relative path + **file reference**; file-API requests (list/read/write/edit/propose) | Agent loop (project tools), Graph runner (Input file references, reads), Compile & export (reads `drafts/`) |
| **Entity reference**, generic entity front-matter base `{id, type, links}`, resolution request/result, entity list | Agent loop, Graph runner, Tool registry (`x-scriba-*` entity hints), Genre packs (entity-type schemas) |
| Search contract `query → ranked passages {path, offset, snippet, score}` | Agent loop (search tool, grounding check) |
| **Pending change** (target path, diff, **captured base**, origin {agent run \| recipe run}, status, conflict), accept/reject/refresh/accept-anyway requests | Agent loop, Graph runner |
| Draft-version listing | (own UI) |
| SSE members: `pending.created`, `pending.updated`, `pending.resolved` (queue updates), `files.changed`, `project.switched` | Frontend shell's SSE client, Agent loop, Graph runner (switch awareness) |
| Route constants and error codes | all consumers above |

**Runtime services** (implementation, not contract):
- The in-process file-API/resolution/search/propose provider.
- Per-path validator registration (used by the Graph runner for `graphs/`).
- Migrator registration.

The Agent loop's M1 depends on `phase:files` running, and its grounding check depends on `phase:search`.

### Consumes
| Slice / API | Producer | Gate |
|---|---|---|
| SSE envelope `{module, type, data}`, error base, `SCRIBA_*` env names (library path, watcher toggle) | Platform | `phase:scaffold` |
| One auth guard on every route; GET-never-mutates invariant test | Setup & auth | `phase:contract` for the shape; its guard phase before `phase:files` ships routes publicly |
| Per-project model override shape `{providerId, model}` (for `project.yaml` `model`) | Defined here, not imported from `/providers`, to avoid a contract-phase cycle; Model providers asserts that it is compatible with its `ModelChoice` | none |
| Composition root, lazy route table, API + SSE clients, nav | Frontend shell | `phase:core` (picker and files UI) |
| Diff view (read-only), CodeMirror 6 editor with `@codemirror/merge` | Frontend shell | `phase:shared-components` (review queue), `phase:editor` (editing in files, merge view) |
| Graph-file validator and migrators (registered at runtime) | Graph runner | none for Project store's phases; the Graph runner registers them in its own phases |

## Testing Decisions

- **What makes a good test:** it exercises external behaviour only, meaning HTTP responses, SSE events and the files on disk, and never internal services or private helpers. A test should still pass after any refactor that keeps the behaviour.
- **Primary seam: the running API's HTTP + SSE surface.** Boot the composed NestJS app, or the Project store module imported into a test app, against a **temp library folder**. Assert on responses, on the SSE stream, and on the files under the temp folder. The mock OpenAI server is not needed, because this module never calls a model. Key suites:
  - **Discovery and creation:** dot-folders, `importable`, `too-new`, scaffold contents, import byte-identity, start-from-sample using a tiny test sample.
  - **Path safety:** a table-driven suite over every rejection rule, including real symlinks created in the temp folder that point in and out.
  - **File API:** atomic write, `baseHash` conflict, edit zero and multiple matches, size and text refusals, `project.yaml` comment preservation.
  - **Active project:** switching events, rejection of requests for a non-active project.
  - **Search:** host edits picked up through the manifest, drafts excluded, `user_version` mismatch rebuild (the test overwrites the disposable index file), hostile query syntax.
  - **Pending changes:** propose leaves disk untouched; run fold vs. separate runs; apply with versions; each conflict reason; refresh clean and overlapping; accept-anyway backup; validator rejection; event sequence.
  - **Migrations:** a test-only v1→v2 migrator, backup and log line, GET leaves the file untouched, too-new refusal.
- **UI seam:** the module's lazy route, rendered with Angular's Vitest runner against a fake API/SSE client built from the contract types. Covers the picker flows, the files tree and stale-base warning, and the review queue including a narrow (phone) viewport, live SSE updates and conflict actions.
- **Contract seam:** Zod schema tests in the contracts package. The Project store's `project.yaml` schema is what Platform's CI check validates `examples/` against.
- **System seam:** the single Playwright e2e owned by Platform. The Project store adds the "project from sample" step at M1 and the "accept change → draft written + version created" assertion at M3. The nonfiction sample's paths are kept in step with `e2e/fixtures/mock-openai/`.
- **Fixtures:** unit and integration tests build their own temp projects and never read `examples/`.
- **Tooling:** Vitest everywhere (NestJS via `unplugin-swc`). There is no prior art in the repo yet. Tride's tests and the canvas spike's e2e are reference only.

## Out of Scope

- **A `structure/` folder** (brief data model). Overridden by the decision on scene and beat files in the project layout: scenes and beats are files in `drafts/` or label-only story nodes, and Scene and Plot beat are story nodes, not entity types.
- **"Never write straight to `drafts/`" for the author.** Overridden by the decision on the Markdown editor component: only agent and recipe writes go through pending changes, and the author's typing saves directly.
- **The brief's stack** (React, Fastify, a SQLite run-log index). Overridden by the recorded design decisions: Angular, NestJS, and `logs/` as the source of truth, with the run-log index deferred.
- Vector or semantic search (the search contract allows it later), and git integration (the image ships no git).
- More than one active project at a time, multi-user editing, and cloud sync.
- Delete, rename and move through the file API, and binary files. The author does these in their own editor in v1.
- Stable draft IDs, which would let versions survive a rename (deferred by the decision on current draft versus older versions).
- Per-project `tools/`, the `snapshots/` mechanism (Compile & export), the meaning and writes of the `order` field (Compile & export), and `logs/` transcript format (Agent loop).
- The sample content owned by other modules: entities, the grounding-claims draft, the recipe, the order field, and the fiction sample.
- `settings.yaml` and its startup migration.

## Further Notes

- **Design decisions that override the brief for this module:** no `structure/`; author typing writes directly; pending changes live inside each project at `<project>/.scriba/pending/`; app state and the FTS index live in the library at `/books/.scriba/`; draft versions live in `drafts/.versions/`; there is no `DECISIONS.md` (decisions live in `docs/adr/` and the recorded design decisions).
- **Decided here, on the questions left to the specs by the decision on current draft versus older versions and the decision on sample project contents:**
  - The version sub-path is `drafts/.versions/<draft file name>/<UTC timestamp>.<ext>`, and it stores the replaced content.
  - The samples ship no `.scriba/`, `logs/`, `snapshots/` or `.versions/`.
  - Sample source text is public domain or written for the sample.
  - The outline lives in `sources/outline.md`.
- **Coordination points for review:**
  - The active-project key lives in this module's `projects` section of `settings.yaml`. Platform owns the file envelope and the startup migration hook, and each module owns its section.
  - The env names are Platform's `SCRIBA_BOOKS_DIR` (library path) and `SCRIBA_WATCHER` (watcher toggle).
  - Search, activation and rebuild are POSTs so that the GET-never-mutates invariant holds even though they refresh a cache or migrate files.
- **Bind-mount caveat:** file-watch events from macOS hosts through Docker Desktop can be delayed or dropped. That is why the watcher is optional and only refreshes the UI.
- The `order` field's shape (a list of project-relative paths) is a placeholder that Compile & export may narrow through expand–contract. It stays optional, so the nonfiction skeleton is valid without it until M5.
