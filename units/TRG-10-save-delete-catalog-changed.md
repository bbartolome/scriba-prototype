---
id: TRG-10
title: Lint, save (copy-on-write) and delete endpoints, and the catalog-changed event
module: tool-registry
phase: phase:loader-validation
milestone: M2
blocked_by: [TRG-06, TRG-07]
parallel_with: [TRG-09]
unblocks: [TRG-11]
---

# TRG-10 — Save, delete, catalog-changed

## Why
Customize a built-in into a user copy (16), revert (18), create and delete own tools (20–21), lint blocks broken saves (23); open views refresh after changes (51).

## Decisions
- `POST /api/tool-registry/lint` — lints submitted YAML, **writes nothing**; returns diagnostics and, when there are no errors, the three emitted views (for live previews).
- `POST …/tools/:name/save` — lint, then write `/books/.scriba/packs/user/tools/<name>.yaml` (atomic). **Copy-on-write for built-ins**; never touches the packs root. Lint errors → **422 `TOOL_SPEC_LINT_FAILED`** with the lint result in `details`, no file written; warnings save. Saving migrates an older `schemaVersion` to current.
- `POST …/tools/:name/delete` — removes a user copy (revert to built-in) or a user-only tool; a built-in with no user copy → `TOOL_BUILTIN_READONLY`.
- **`catalog-changed {names}`** published after save, delete, toggle (TRG-09) or a host-side user-pack change detected by the manifest re-scan.

## Acceptance criteria
- [ ] `save` on a built-in writes the user-pack file and never touches the packs root.
- [ ] Saving YAML with an unknown `x-scriba-*` key, a template variable that isn't an input, or an out-of-subset keyword returns 422 with line-numbered diagnostics and writes no file.
- [ ] `delete` of a user copy restores the built-in; delete of a plain built-in returns `TOOL_BUILTIN_READONLY`.
- [ ] `catalog-changed` arrives on `/events` after save, delete, toggle and a host-side file add.
- [ ] `lint` writes nothing and returns views for valid YAML.
