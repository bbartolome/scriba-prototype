---
id: TRG-12
title: Executor service, render and execute endpoints, entity kind checks, per-output system messages, model call
module: tool-registry
phase: phase:executor
milestone: M2
blocked_by: [TRG-08, TRG-11, "Model providers phase:client (MPR-08)", "Platform phase:test-harness (PLT-12)"]
parallel_with: [TRG-13]
unblocks: [TRG-15, TRG-16, "Agent loop narrative tools (AGL-09)", "Genre packs golden harness (GNP-02)", "Graph runner run engine core (GRR-04)"]
---

# TRG-12 — Executor

Merging this (with TRG-08) **closes Tool registry `phase:executor`**.

## Why
One call renders, calls the model and returns `{output, sourcesUsed}` (40); every result lists its entity files (28); wrong or unresolved IDs are explained (39); stop cancels (41); the Graph runner calls tools with wire values and params (44).

## Decisions
- **Exported executor service** (in-process) and `POST …/tools/:name/render` (no model call) and `POST …/tools/:name/execute`, sharing one path.
- Steps:
  1. Look up the tool: disabled → `TOOL_DISABLED`; invalid → `TOOL_INVALID`.
  2. Ajv-validate (full mode).
  3. Every referenced entity ID must have a resolved entity in the request (`TOOL_ENTITY_UNRESOLVED`), whose `type` is in the field's kinds (`TOOL_ENTITY_KIND_MISMATCH`); both with model-readable messages. **None of these errors call the model.**
  4. Render the template (TRG-08), with the catalogue for `{{toolCatalog}}`.
  5. Call the model through the Model providers client using the **active project's model choice** (resolution by project id): one registry-owned **system message per output kind** fixing the return format — Markdown prose for `draft`; a Markdown file with front matter for `entity`; one claim per line for `claims`; JSON only for `graph`; findings for `check` — then one user message, the rendered prompt.
  6. Return `{output: {kind, content}, sourcesUsed}`.
- `content` is the model's final text, trimmed, with a single enclosing code fence removed for `graph`; not parsed further (the Graph runner validates propose-graph output when it becomes a pending change).
- `sourcesUsed`: resolved entity references for IDs in **`entity`-typed** fields, de-duplicated, in property order; **style profiles excluded** (voice, not evidence).
- **Non-streaming** in v1; accepts an abort signal. Transport retries stay in the client; provider failures wrap as `TOOL_MODEL_ERROR` keeping the provider's message.
- A style field left empty is filled **by the caller** with the project's style-profile ref before resolving.
- **Never writes files.**
- Mock OpenAI scenario for a tool execution added to `e2e/fixtures/mock-openai/scenarios/`.

## Acceptance criteria
- [x] `render` with fixture arguments and resolved entities returns the expected prompt; `{{entity id}}` inside `#each` inserts each entity's header and content; an absent optional field renders nothing.
- [x] `execute` against the mock server returns `{output: {kind: 'draft', content}, sourcesUsed}`, with `sourcesUsed` exactly the de-duplicated entity references of entity-typed inputs and no style profile; the mock received the per-kind system message then the rendered prompt.
- [x] Malformed arguments → `TOOL_ARGS_INVALID` naming every bad field; wrong-kind and unresolved entities → their own readable errors; the mock received no request in each case.
- [x] A disabled tool → `TOOL_DISABLED`; an aborted call stops the model request (mock sees the close).
- [x] **M2 done-when, API level:** each workhorse-shaped fixture tool produces a draft that cites its source files through `sourcesUsed`.
