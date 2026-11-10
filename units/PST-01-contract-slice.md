---
id: PST-01
title: Publish @bbartolome/scriba-contracts/project-store
module: project-store
phase: phase:contract
milestone: M1
blocked_by: ["Platform phase:scaffold (PLT-11; strictly PLT-02)"]
parallel_with: ["other wave-1 contract phases"]
unblocks: [PST-02, PST-11, "Tool registry phase:contract (TRG-01)", "Graph runner phase:contract (GRR-01)", "Genre packs", "Agent loop phase:contract (AGL-01)", "Compile & export phase:contract (CEX-01)", "Model providers project override API (MPR-12)", "Platform examples check, M1 layer (PLT-20)", "Setup & auth first-project step (SAU-14)", "Frontend shell landing and project routes (SHL-08)", "Frontend shell editor wrapper (lossless) (SHL-13)", "Tool registry pickers (TRG-04)"]
---

# PST-01 — Contract slice

Merging this **closes Project store `phase:contract`**. Zod schemas and TS types only; no runtime deps beyond Zod; nothing imported from `/providers` (avoids a wave-1 contract cycle).

## Shapes

**`project.yaml`:** `{schemaVersion, title, genrePack, styleProfile?, export?, model?, order?}`
- `schemaVersion` integer ≥ 1.
- `genrePack`: pack name (`nonfiction`, `fiction` or a user pack).
- `styleProfile`: optional entity reference.
- `export`: passthrough object until Compile & export's contract narrows it.
- `model`: per-project override `{providerId, model}`, defined **here** (Model providers asserts compatibility with its `ModelChoice`).
- `order`: **reserved from day one**, optional list whose entries are passthrough until Compile & export narrows them (its `OrderEntry` is `{path, status?, part?}`).
- Unknown keys are preserved (passthrough) so newer optional fields survive an older app.

**Projects:** project summary `{id, title?, genrePack?, active, status, error?}` with status enum `ok | invalid | too-new | importable` (`invalid` carries the schema error); project list; requests: new `{folderName?, title, genrePack?}` (folder name a slug `^[a-z0-9][a-z0-9-]*$`, derived from title by default; `genrePack` default `nonfiction`), import `{projectId}`, start-from-sample `{sampleId, folderName, title}`, activate `{projectId}`; active-project response `{active: projectId | null}`; sample list `[{id, title, description}]`.

**Paths & files:** project-relative POSIX path type and **file reference** (a project-relative path string). File API requests/responses:
- list `{path, recursive?}` → entries `{path, kind: 'file'|'dir', size, mtime}`;
- read → `{path, content, hash, mtime}` (plus an `upgraded?` marker for in-memory migrated views);
- write `{path, content, baseHash?}`; edit `{path, old, new}`; delete `{path, baseHash?}`; move `{from, to}`;
- in-process propose input `{projectId, path, content, base?: {content}, origin, provenance?, grounding?}`.

**Entities:** entity reference `^[a-z0-9][a-z0-9-]*$`; generic entity front-matter base `{id?, type, links?: EntityRef[]}` (passthrough for unknown keys); resolution request (`ids` repeated query param) and result `{resolved: [{id, type, path, content}], errors: [{id, code: unknown|duplicate, paths?}]}`; entity list (filterable by `type`) `{entities: [{id, type, path, title?}], invalid: [{path, reason}]}`.

**Search:** request `{query, limit?, scope?: ('sources'|'entities')[]}` → ranked passages `[{path, offset, snippet, score}]` (higher score is better). Names no FTS5 concept.

**Pending change:** `{id, projectId, targetPath, kind: create|modify, diff, capturedBase: {hash, content} | null, proposed, origin, provenance?, grounding?, status, conflict, createdAt, updatedAt}`
- `origin`: `{kind:'agent-run', runId, toolCallId?}` | `{kind:'recipe-run', runId, graphId, nodeId}`.
- `provenance`: optional passthrough object (Graph runner stores `{graphId, nodeId, entityIds, sourcesUsed}`; the queue shows `entityIds`/`sourcesUsed` when present).
- `grounding`: optional `{supported, weak, unsupported, checkedAt}` (integer counts).
- `status`: `pending|accepted|rejected`; `conflict`: `null | {reason: 'base-changed'|'target-missing'|'target-exists', detectedAt}`.
- Requests: accept `{content?}`, reject, refresh, accept-anyway.

**Draft versions:** listing `{draftPath, versions: [{id, createdAt, size}]}`; version read; restore request.

**SSE members** (in Platform's envelope, `module: 'project-store'`): `pending-created`, `pending-updated`, `pending-resolved` (each `{projectId, pendingChange}`), `files-changed {projectId, paths}`, `project-switched {from, to}`.

**Constants:** entity-ID pattern; `[@id]` in-body citation pattern (also `[@id1; @id2]`) — the one in-body entity-reference syntax (Genre packs emits it, Compile & export scans it); content-hash format description `sha256:<lowercase hex>`; reserved paths (`.scriba/`, `drafts/.versions/`); file size cap (5 MB); route constants; `projects` settings-section shape `{schemaVersion: 1, active}`.

**Error codes** (`PROJECT_` prefix, Platform convention): `PROJECT_PATH_INVALID`, `PROJECT_PATH_OUTSIDE`, `PROJECT_PATH_RESERVED`, `PROJECT_NOT_FOUND`, `PROJECT_NOT_TEXT`, `PROJECT_FILE_TOO_LARGE`, `PROJECT_FILE_EXISTS`, `PROJECT_WRITE_CONFLICT`, `PROJECT_EDIT_NO_MATCH`, `PROJECT_EDIT_AMBIGUOUS`, `PROJECT_NO_ACTIVE`, `PROJECT_NOT_ACTIVE`, `PROJECT_EXISTS`, `PROJECT_INVALID`, `PROJECT_SCHEMA_TOO_NEW`, `PROJECT_ENTITY_NOT_FOUND`, `PROJECT_ENTITY_DUPLICATE`, `PROJECT_PENDING_CONFLICT`, `PROJECT_PENDING_NOT_OPEN`, `PROJECT_VALIDATION_FAILED`.

## Acceptance criteria
- [ ] The slice builds and is importable from both `apps/api` and `apps/web`, with no runtime dependencies beyond Zod, and imports nothing from `/providers`.
- [ ] Schema tests accept a valid `project.yaml` (with and without `order`), reject a missing `schemaVersion`, and preserve unknown keys.
- [ ] Pending-change, search and entity-reference schemas have round-trip tests; the ID and citation patterns have positive/negative cases.
- [ ] Platform's sample check (PLT-20) can import the `project.yaml` schema and the entity base.
