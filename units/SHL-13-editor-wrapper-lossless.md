---
id: SHL-13
title: CodeMirror 6 Markdown editor wrapper — lossless load/save and the byte-level round-trip suite
module: shell
phase: phase:editor
milestone: M3
blocked_by: [SHL-09, "Project store phase:contract (PST-01; file reference, read/write requests, baseHash, write-conflict code)"]
parallel_with: [SHL-10, SHL-11, SHL-12, SHL-16, SHL-17, SHL-18]
unblocks: [SHL-14, SHL-15, SHL-19]
---

# SHL-13 — Editor wrapper (lossless)

## Why
A file opened and saved without changes stays byte-identical — front matter, emphasis style, line endings, trailing newline — so git shows no noise (24).

## Decisions
- Thin standalone wrapper around a CodeMirror 6 view with Markdown language support. Inputs: a project **file reference**, a read-only flag, the save mode. Outputs: dirty state, save state (`saved | saving | unsaved | failed | conflict`), errors. Loads via the Project store file API `read` (through the typed API client).
- **Lossless by construction:** untouched text goes back exactly as loaded. Detect the file's line separator and set CodeMirror's line-separator facet to it so CRLF and mixed endings survive. Never trim, reformat, or add/remove the trailing newline. Keep a BOM if the file API returns one. Front matter is plain text in the editor.
- Saving mechanics are SHL-14; layout is SHL-15. This unit exposes a "current content" output and a minimal manual save used by the round-trip test.

## Acceptance criteria
- [ ] **Round trip:** load then save with no edits sends a file-API write whose content is **byte-identical** to the loaded content, over fixtures: YAML front matter, `_emphasis_` and `*emphasis*`, CRLF endings, mixed endings, no trailing newline, a leading BOM, trailing whitespace. Kept as a regression test.
- [ ] A targeted edit changes only the edited range; all other bytes match.
- [ ] Read-only mode prevents edits.
