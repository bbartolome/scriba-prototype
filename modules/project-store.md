## Project store

The Project store owns the author's books on disk: the library at `/books`, discovery and the one active project, a path-safe file API, entity resolution, FTS5 keyword search, the pending-changes queue with a three-way check, per-draft versions, lazy file migrations, the `examples/` samples, and the picker / files / review UI.

### Ordering

Every unit is gated on Platform `phase:scaffold` (PLT-11) through PST-01.

The original spec made phases strictly serial. Phase *gates* are unchanged, but units only wait on what they actually use: the pending-changes units (PST-15+) need the file API, not search, so they may start once `phase:files` closes, in parallel with `phase:search`. `phase:pending-review` still closes only after PST-22, and PST-22 requires `phase:search` closed (search over `sources/` is the Project store's part of the M3 "done when") and the Agent loop's write overlay (AGL-12), whose pending change the e2e "accept change" step accepts. The grounding half of the M3 demo is AGL-20's, which closes after this gate. The migrations unit needs apply (PST-16), not the whole review phase.

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
          └─ PST-34 files editor adoption (direct save, stale-base)     (needs 10 + Shell SHL-14, SHL-15, SHL-16; lands at M3, PST-12 does not wait)
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
 PST-22 review gate (e2e "accept change", demo; needs 17–21, phase:search, AGL-12)  ══> phase:pending-review
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
- Folder delete/rename, delete/move from the files UI, binary files (read and list remain text-only; a byte-safe write exists for other modules' copy operations, PST-24) (single-file `delete`/`move` exist in the API for other modules' author actions).
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
