---
id: CEX-10
title: Pandoc runner, md export, download endpoint, busy/timeout/error mapping, CI Pandoc and Typst
module: compile-export
phase: phase:export
milestone: M5
blocked_by: [CEX-04, CEX-05, CEX-09, "Platform ci.yml (PLT-10)"]
parallel_with: [CEX-16, CEX-17]
unblocks: [CEX-11, CEX-12, CEX-13, CEX-14]
---

# CEX-10 — Export runner and Markdown

## Decisions
- `POST /api/compile-export/export {format}` → `{format, fileName, bytes, downloadUrl, preflight: summary, warnings}`. **Always runs preflight first** and attaches its summary; export still succeeds when preflight has errors.
- `GET` download (`downloadUrl`) streams the file with `Content-Disposition: attachment; filename=<fileName>`; no side effects.
- Output under `stateDir(projectId, 'compile-export')/exports/` with plain `fs`; keep only the latest file per format. `fileName` = `<title-slug>-<yyyymmdd-hhmm>.<ext>` (UTC). No `exports/` folder in the project layout.
- **Pandoc invocation** (shared by CEX-11…13): Pandoc 3.13 as a child process with an **argument array and no shell**, in a temp working dir; `--resource-path` = the project root; wall-clock timeout (default 120 s) → `COMPILE_PANDOC_TIMEOUT`; output size cap; **never** `--filter` or Lua filters from project content; **one export per project at a time** (second → `COMPILE_EXPORT_BUSY`); stderr warnings returned in `warnings`; non-zero exit → `COMPILE_PANDOC_FAILED` with the stderr tail. Empty manuscript → `COMPILE_EMPTY_MANUSCRIPT`.
- **`md`**: the assembled Markdown itself, without calling Pandoc (validated by a Pandoc parse in tests).
- Publish `export-finished`.
- **CI:** add Pandoc 3.13 and Typst installation to Platform's `ci.yml` (additive step). Export tests skip locally with a clear message when a binary is missing; CI sets a flag that turns the skip into a failure.

## Acceptance criteria
- [ ] `md` export returns the assembled document (golden) and the download GET returns the same bytes with no side effects.
- [ ] A second concurrent export returns busy; a forced Pandoc failure returns `COMPILE_PANDOC_FAILED` with the stderr tail; a stalled Pandoc returns the timeout error.
- [ ] Export attaches the preflight summary and succeeds when preflight has errors.
- [ ] CI runs the Pandoc-dependent tests with real binaries.
