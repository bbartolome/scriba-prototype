---
id: CEX-01
title: Publish @bbartolome/scriba-contracts/compile-export and narrow project.yaml order/export
module: compile-export
phase: phase:contract
milestone: M5 (lands early in wave 2)
blocked_by: ["Platform phase:scaffold (PLT-11)", "Project store phase:contract (PST-01)", "Graph runner phase:contract (GRR-01)", "Agent loop phase:contract (AGL-01)"]
parallel_with: ["wave-2 work"]
unblocks: [CEX-02, CEX-08, CEX-17, "Agent loop compile tools (AGL-24)"]
---

# CEX-01 — Contract slice

Merging this **closes Compile & export `phase:contract`**. Zod schemas + TS types + constants only.

## Shapes
- `ManuscriptStatus` = `outline | draft | revised | final` (default `draft`); `ManuscriptPart` = `front | body | back` (default `body`).
- `OrderEntry` `{path: FileReference (must be in drafts/), status?, part?}` — the content of `project.yaml`'s `order`.
- `ExportSettings` (all optional): `author`, `penName`, `contact` (multi-line), `subtitle`, `lang` (default `en`), `rights`, `dedication`, `bibliography` (`off | all | cited`; default `all` for genre pack `nonfiction`, else `off`), `docxReferenceDoc`, `epubCss`, `typstTemplate` (project-relative file references). Defaults are applied at read time, never written back.
- **Manuscript view model:** entries `{path, part, status, words, graphOrdered, inOrderField}`; totals `{body, manuscript}`; `orderSource: 'alphabetical' | 'project' | 'graph+project'`; warnings (`graphCycle {files}`, `invalidGraph {path}`, `staleEntry {path}`); `revision`.
- **Requests** with `revision`: reorder `{revision, front: path[], body: path[], back: path[]}`; status `{revision, path, status}`; part `{revision, path, part}`; export settings write `{revision, settings}`; copy-default `{format, path}`.
- **Preflight:** request; result `{ranAt, revision, checks: [{id, status: 'pass'|'warn'|'fail', findings}]}`; finding `{check, severity: 'error'|'warning'|'info', path, line?, offset?, length?, message, ref?}`; `PreflightCheckId` = `placeholders | unsupported-claims | orphan-scenes | entity-links | banned-phrases`; **placeholder pattern constants** (whole-word `TK`, `TKTK`, `TODO`, `FIXME`, `XXX`, case-sensitive; unrendered `{{…}}`).
- **Export:** `ExportFormat` = `md | docx | epub | pdf`; request `{format}`; result `{format, fileName, bytes, downloadUrl, preflight: summary, warnings: string[]}`.
- **Snapshots:** summary `{id, label, createdAt, fileCount, words, unreadable?}`; create `{label}`, list, restore `{id}`; `snapshot.yaml` manifest `{schemaVersion, label, createdAt, appVersion, order: OrderEntry[], words: {body, total}}`.
- **SSE members:** `manuscript-updated`, `export-finished`, `snapshot-created`, `snapshot-restored`.
- **Route constants** and **error codes** (Platform convention): `COMPILE_ORDER_CONFLICT`, `COMPILE_INVALID_REORDER`, `COMPILE_GRAPH_ORDERED_MOVE`, `COMPILE_EXPORT_BUSY`, `COMPILE_PANDOC_FAILED`, `COMPILE_PANDOC_TIMEOUT`, `COMPILE_TEMPLATE_INVALID`, `COMPILE_EMPTY_MANUSCRIPT`, `COMPILE_SNAPSHOT_NOT_FOUND`, `COMPILE_SNAPSHOT_UNREADABLE`.
- **Expand-only change in `/project-store`** (coordinated with the Project store): narrow the reserved `order` and `export` fields of the `project.yaml` schema to `OrderEntry[]` and `ExportSettings` (both still optional).

## Acceptance criteria
- [ ] The subpath builds, exports only shapes and constants, and is importable from `apps/api` and `apps/web`.
- [ ] Zod rejects an unknown status or part, an order entry with a path outside `drafts/`, a reorder that isn't lists of paths, and an unknown export format.
- [ ] The `project.yaml` schema accepts files with and without `order` and `export`; the nonfiction sample still passes Platform's CI sample check.
