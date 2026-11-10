---
id: TRG-01
title: Publish @bbartolome/scriba-contracts/tool-registry
module: tool-registry
phase: phase:contract
milestone: M2
blocked_by: ["Platform phase:scaffold (PLT-11; strictly PLT-02)", "Project store phase:contract (PST-01)"]
parallel_with: ["other contract phases"]
unblocks: [TRG-02, TRG-03, TRG-08, "Genre packs content authoring", "Graph runner phase:contract (GRR-01)", "Model providers client tools input"]
---

# TRG-01 — Contract slice

Merging this **closes Tool registry `phase:contract`**. Changes afterwards only through expand–contract.

## Shapes and constants
- **Tool-spec envelope** (Zod + TS): `{schemaVersion, name, description, inputs, output, enabled, prompt}`; supported-version constant (`1`).
  - `name`: lower snake case, 1–64 chars, starts with a letter (`^[a-z][a-z0-9_]{0,63}$`); file name must be `<name>.yaml`.
  - `description`: one line, ≤ 200 chars.
  - `inputs`: JSON Schema object (validated structurally by lint, typed loosely here).
  - `output`: **exactly** `draft | entity | claims | graph | check` (final).
  - `prompt`: string (block scalar in YAML).
- **Hint vocabulary constants** (closed): `x-scriba-type` (`text | entity | style`), `x-scriba-port` (boolean), `x-scriba-entity-kinds` (string list), `x-scriba-control` (`text | textarea | select | slider | number | toggle | entity-picker | style-picker`).
- **Port-type enum** — exactly `text | entity | style`. **Output port key** `output`.
- **Port-descriptor shape** `{inputs: [{key, type, list, required, title}], output: {key: 'output', type: 'text', kind}, params: string[]}`, with the **derivation rule as a doc comment**: input ports are properties with `x-scriba-port: true`, in property order; `type` from `x-scriba-type`; `list` when the schema type is array; `required` when in `required`; exactly one output port (key `output`, type `text` in v1, carrying the output kind; may be widened via expand–contract); everything else is `params`; port ids are `<nodeId>.<key>`; port types are element types (an entity `list` port accepts a list); wires carry one value per input; shapes are checked by Ajv when a run starts.
- **Form-descriptor shape:** ordered fields `{key, title, description, control, required, default, enum?, minimum?, maximum?, minLength?, maxLength?, list, entityKinds?, port, elementType?}`.
- **Function-schema shape:** `{type: 'function', function: {name, description, parameters}}`.
- **Entity-type schema envelope:** `{schemaVersion, kind, title, description, folder: 'sources'|'entities', fields}`; `kind` lower kebab-case, file `<kind>.yaml`.
- **Lint result:** `[{severity: 'error'|'warning', rule, message, line, column}]`. The **lint response** also carries the three emitted views when there are no errors (for the editor's live previews).
- **API shapes:** tool summary `{name, description, output, enabled, origin: 'core'|'nonfiction'|'fiction'|'user', overrides?, valid, lintCounts}` (list, with optional genre-pack filter); get `{spec, source, origin, lint, views: {functionSchema, form, ports}}`; builtin; functions; entity-types; lint; save; delete; enabled `{enabled}`; validate request `{arguments, mode: 'full'|'params'}` and result `{arguments (defaults applied), entityRefs: [{field, id, style}]}`; render request/result; **tool-call request** `{arguments, entities: [{ref, type, path, content}]}` (built from the Project store entity reference plus content) and **result** `{output: {kind, content}, sourcesUsed: EntityRef[]}`.
- **Error codes:** `TOOL_NOT_FOUND`, `TOOL_DISABLED`, `TOOL_INVALID`, `TOOL_ARGS_INVALID` (with `issues: [{path, message}]` in details), `TOOL_ENTITY_UNRESOLVED`, `TOOL_ENTITY_KIND_MISMATCH`, `TOOL_SPEC_LINT_FAILED`, `TOOL_BUILTIN_READONLY`, `TOOL_SCHEMA_VERSION_UNSUPPORTED`, `TOOL_MODEL_ERROR`.
- **Route constants** and the **`catalog-changed`** SSE member `{names: string[]}`.
- `tools` settings-section shape `{schemaVersion: 1, enabled: Record<string, boolean>}`.

## Acceptance criteria
- [ ] The slice builds and is importable from NestJS and Angular with no other subpath than `/project-store` and `/platform`.
- [ ] Zod tests accept a cold-open-shaped fixture envelope and reject a wrong output kind, a bad name and a missing `prompt`.
- [ ] The output enum has exactly five values; the port-type enum exactly three.
- [ ] Genre packs, Agent loop and Graph runner can reference every type they consume (a compile-only test imports them).
