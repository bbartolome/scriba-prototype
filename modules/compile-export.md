## Compile & export

Compile & export turns every top-level `.md` file in `drafts/` into one manuscript: it computes the **effective order** (`project.yaml` order field, story-graph `order` relations as a leading block, alphabetical fallback), runs five **model-free preflight checks**, **exports** Markdown, DOCX (standard manuscript layout), EPUB and PDF (Typst) through Pandoc 3.13, manages **snapshots** of the manuscript, and ships the **manuscript view**.

### Ordering

Gates are unchanged. Inside phases, units wait only on what they use: the five preflight checks split into three parallel units over one shared endpoint; DOCX, EPUB and PDF each get their own unit over one shared Pandoc runner; the snapshot API needs only order writes (not the export phase); the manuscript UI is built against the Shell's fakes in parallel with the API. The milestone gate (CEX-20) still waits on `phase:export`.

### Dependency graph

```
CEX-01 contract slice + project.yaml order/export narrowing  ══> phase:contract
 ├─ CEX-02 module, membership, effective order, parts, word counts, GET manuscript (PST-12, SAU-08)
 │    ├─ CEX-03 reorder / status / part writes with revision, manuscript-updated
 │    ├─ CEX-04 assembled-Markdown builder (metadata, matter, bibliography) (GNP-03)
 │    └─ CEX-05 preflight endpoint + placeholders check
 │         ├─ CEX-06 unsupported-claims + orphan-scenes checks (AGL-01, GRR-01)
 │         └─ CEX-07 entity-links + banned-phrases checks
 ├─ CEX-08 nonfiction sample order field, statuses, export settings (PST-11)
 └─ CEX-17 manuscript route UI: outline, drag, status/part, totals, phone (Shell core; fakes)
 CEX-09 assembly-preflight gate + exported in-process service  ══> phase:assembly-preflight
 CEX-10 Pandoc runner, md export, download, busy/timeout/errors, CI Pandoc+Typst (needs 04, 05)
  ├─ CEX-11 DOCX + standard-manuscript reference doc │ CEX-12 EPUB + stylesheet │ CEX-13 PDF via Typst + spike ADR
  └─ CEX-14 template overrides, copy default, export settings endpoints (needs 03)
 CEX-15 export gate: image smoke step (PLT-15, PLT-19)  ══> phase:export
 CEX-16 snapshot API: create, list, restore, manifest, pre-restore (needs 03)
 CEX-18 preflight panel, export buttons + confirm, export settings panel (needs 17)
 CEX-19 snapshots panel (needs 17)
 CEX-20 milestone gate: e2e manuscript step, Word/EPUB check, demo (PST-22)  ══> phase:manuscript-snapshots
```

### Parallelism
- After CEX-01: CEX-02, CEX-08, CEX-17 in parallel.
- After CEX-02: CEX-03, CEX-04, CEX-05 in parallel; after CEX-05: CEX-06, CEX-07 in parallel.
- After CEX-10: CEX-11, CEX-12, CEX-13 (and CEX-14 once CEX-03 is in) in parallel.
- CEX-16 runs alongside the export phase; CEX-18 and CEX-19 in parallel after CEX-17.

### Cross-cutting decisions
- **Module shape:** NestJS `@Module` at `apps/api/src/modules/compile-export/` (one import in the composition root) exporting an in-process service (view model, preflight, export) for the Agent loop's compile tools; lazy `Routes` at `apps/web/src/app/features/compile-export/` registered at `/projects/:projectId/manuscript` (minimum class `phone`).
- **HTTP:** `/api/compile-export/…`, behind Setup & auth's guard. GET/HEAD never mutate; reorder, status, part, preflight (a command even though it writes nothing), export, settings, snapshot create and restore are POSTs.
- **File access** goes through the Project store's in-process file API and path safety: `list`, `read`, `write`, `delete` for drafts and snapshots (file by file), and `updateProjectYaml` for the `order` and `export` keys. The one exception: export output is written with plain `fs` under `stateDir(projectId, 'compile-export')`.
- **Never** reads or writes `drafts/.versions/`; **never** runs a graph (reads only story-graph `order` edges); **never** calls a model.
- **Manuscript membership:** every top-level regular file with a `.md` extension in `drafts/`; subfolders (including `.versions/`) and hidden files are skipped; non-Markdown files are left out (reference them from Markdown).
- **Events** (Platform envelope, `module: 'compile-export'`): `manuscript-updated`, `export-finished`, `snapshot-created`, `snapshot-restored`.

### Settled decisions (do not reopen)
- Graph-ordered files form a **leading block** ahead of the other body files.
- **All story graphs** in `graphs/` are unioned.
- **Status and part live on order entries** (not front matter).
- **Every order write materialises the full order.**
- Front/back matter via `part`; title page and dedication from export settings; generated bibliography — no new folders.
- Membership limited to `.md` files.
- Exports kept under `<project>/.scriba/compile-export/exports/`.
- Restore deletes newer files, with a pre-restore snapshot as the safety net.
- Preflight is model-free and reads recorded grounding results.

### Testing principles
- External behaviour only: HTTP responses, SSE events, files on disk — never internal services, the topological-sort helper alone, or Pandoc's argument list. The order algorithm is tested through `GET` manuscript against fixture projects.
- Primary seam: the module in Platform's `create-test-app` with Setup & auth's guard, a temp library per test, fixture projects built in the test (drafts, `project.yaml` variants, story graphs including a branch, a same-file edge and a cycle, a grounding-result artefact, entities with broken references, a style profile with banned phrases). The mock OpenAI server runs only to prove no model calls. Unit tests never read `examples/`.
- Pandoc-dependent tests use real Pandoc 3.13 and Typst; locally they skip with a message when a binary is missing; CI sets a flag that turns the skip into a failure. DOCX and EPUB are checked structurally (XML, styles, spine, nav, metadata), never by byte goldens; PDF by header and engine; Markdown against a golden.
- UI seam: the manuscript route with Angular's Vitest runner against the Shell's fakes.
- Manual: the "done when" (three-chapter sample opened in Word and an EPUB reader) and the Typst spike review.

### Out of scope
- Reordering scenes inside a file, per-scene breaks (a file is one unit).
- Reading or restoring `drafts/.versions/` (Project store).
- Running graphs; writing to the story graph from the manuscript view.
- Starting a grounding check from preflight.
- A per-project placeholder list; CSL/citeproc; an index; cross-references.
- A TeX Live PDF image (the Typst spike may recommend it as follow-up only).
- Deleting/renaming snapshots in the app; snapshot diffing.
- Export in the Playwright e2e; epubcheck (no Java in the image).
- Publishing-platform uploads.
- Agent-initiated reorder (if ever exposed, any `project.yaml` write must become a pending change).
- Replaced: assembly from chapter files in outline order → effective-order rules over every top-level `drafts/` file; no `structure/` folder and no Chapter or Scene entity type; React/Fastify → Angular/NestJS; Zod tool inputs → JSON Schema + Ajv.

### Known cost
Renaming a draft file drops its order entry and status, and orphans its older versions in `drafts/.versions/`. A stable id could fix both later without breaking the versioning layout.
