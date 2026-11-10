---
id: TRG-15
title: Live previews — form, tool node, function schema, rendered prompt
module: tool-registry
phase: phase:editor-ui
milestone: M2
blocked_by: [TRG-03, TRG-12, TRG-14]
parallel_with: [TRG-16]
unblocks: [TRG-17]
---

# TRG-15 — Live previews

## Why
See how a change affects all three views while editing (25); preview the rendered prompt with sample values and real entities (26).

## Decisions
- Preview tabs beside the editor, fed by the debounced `lint` response's emitted views (no YAML parsing in the browser): **form** and **node** (the tool-form component in both layouts), **function schema** (JSON), **rendered prompt** (`render` endpoint with the preview form's values and entities resolved through the Project store; unsaved specs render via the lint result's views plus the submitted template — if needed, `render` accepts an inline spec in addition to `:name`, an expand-only change to `/tool-registry`).

## Acceptance criteria
- [ ] Editing a field's `x-scriba-port` updates the node preview's ports live; changing `x-scriba-entity-kinds` changes what the picker offers.
- [ ] The rendered-prompt tab shows the template rendered with sample values and a real entity.
