---
id: TRG-02
title: Emission of the three views, Ajv full validate, fixture-backed GET /tools/:name
module: tool-registry
phase: phase:form-renderer
milestone: M2
blocked_by: [TRG-01, "Platform phase:scaffold (PLT-11)"]
parallel_with: [TRG-03, TRG-04, TRG-08]
unblocks: [TRG-05, TRG-06]
---

# TRG-02 — Emission and validation

## Why
One declaration drives the agent's function, the form and the canvas node (stories 3–4, 36, 42); malformed arguments become readable errors (37–38).

## Decisions
- Module skeleton at `apps/api/src/modules/tool-registry/` (one `@Module` import).
- **JSON Schema subset** for `inputs`: root `type: object`, `properties`, `required`, `additionalProperties` (always treated as `false`); property types `string` (`enum`, `minLength`, `maxLength`, `pattern`), `integer`/`number` (`minimum`, `maximum`), `boolean`, `array` of string/integer/number items (`minItems`, `maxItems`, `uniqueItems`); annotations `title`, `description`, `default`. Property order = form field order = port order. Key `output` is reserved. (Lint enforces the subset in TRG-07.)
- **Function schema:** `{type: 'function', function: {name, description, parameters}}` where `parameters` is `inputs` with **every `x-` key removed** and `additionalProperties: false`. Entity and style fields get a short appended description hint ("Entity ID(s) of kind person." / "Style-profile entity ID; defaults to the project's style profile."). Style fields are **never required** in the function schema.
- **Form descriptor:** ordered fields with key, title, description, control (from `x-scriba-control` or derived: enum → select, bounded number → slider or number, boolean → toggle, entity → entity-picker, style → style-picker, long text → textarea, else text), required, default, enum options, numeric bounds, list flag, entity kinds, port flag, element type, value type (`valueType`: `string | integer | number | boolean`, the property's JSON type, or its items' type for a list). The Ajv schema checks each input against `valueType` (an integer field sends an integer, a number field sends a number), so a value round-trips without coercion (the Navigator's decision of 2026-11-14 on TRG-01 open point 1, `plans/DECISIONS.md`, as corrected by the TRG-01 review of revision 4). The renderer needs nothing else.
- **Port descriptor:** the derivation rule from TRG-01.
- All three computed at load and returned by get, so the web app never parses YAML or JSON Schema.
- **Ajv:** each spec's `inputs` compiled once, draft-07, `allErrors`, `useDefaults`, `strict`, **no coercion**. Bad arguments → `TOOL_ARGS_INVALID`: a model-readable `message` with a lead line naming the tool, then one line per issue naming the field, what was expected and what was received; unknown fields reported together with the allowed fields; structured `issues` `{path, message}`. A valid validate returns the arguments with defaults applied plus the entity IDs to resolve, each tagged with its field and whether it's a style field. The registry never retries.
- **Fixture-backed** `GET /api/tool-registry/tools/:name` and `POST …/tools/:name/validate` serving a **registry-owned cold-open fixture** (a test fixture, not Genre packs content); the loader replaces the fixture source in TRG-06.

## Acceptance criteria
- [x] `GET /tools/cold_open` (fixture) returns the three views; the function schema contains no key starting with `x-` and passes Ajv's draft-07 meta-schema; form and port descriptors match the fixture's declared fields and order.
- [x] Missing required fields and wrong enum values return `TOOL_ARGS_INVALID` whose message names each bad field with expected and received; unknown fields list the allowed fields.
- [x] A valid validate returns defaults applied and the tagged entity IDs.
- [x] No coercion: `"3"` for an integer field is rejected.
