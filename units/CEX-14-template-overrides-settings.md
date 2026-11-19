---
id: CEX-14
title: Per-project template overrides, "copy default into project", export settings endpoints
module: compile-export
phase: phase:export
milestone: M5
blocked_by: [CEX-03, CEX-10, CEX-11]
parallel_with: [CEX-12, CEX-13, CEX-16]
unblocks: [CEX-15, CEX-18]
---

# CEX-14 — Templates and export settings

## Decisions
- Export settings `GET` and `POST {revision, settings}` (revision conflicts as in CEX-03); writes only the `export` key via `updateProjectYaml`; defaults applied at read time, never written.
- Overrides `docxReferenceDoc`, `epubCss`, `typstTemplate`: project-relative references checked by path safety and required to exist. An invalid or missing template → `COMPILE_TEMPLATE_INVALID` **before Pandoc runs**.
- **"Copy default into project"** `POST {format, path}` writes the built-in file to the author's chosen path (suggested default: the project root, e.g. `reference.docx`, so no folder is added) through the Project store file API.

## Acceptance criteria
- [ ] A missing override returns the template error without calling Pandoc.
- [ ] Copy default writes the built-in file; setting it as the override makes DOCX use its styles.
- [ ] A settings write with a stale revision is refused; a valid one changes only the `export` key.
