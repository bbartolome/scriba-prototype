---
id: TRG-08
title: Pure Handlebars-like template engine (parser with positions + renderer)
module: tool-registry
phase: phase:executor
milestone: M2
blocked_by: [TRG-01]
parallel_with: [TRG-02, TRG-03, TRG-05, TRG-06]
unblocks: [TRG-07, TRG-12]
---

# TRG-08 — Template engine

Pure and dependency-free, so it is built first and reused by lint (TRG-07) and the executor (TRG-12).

## Why
The template language is small and pure: rendering can never read files, call the network or run code (story 50).

## Decisions
- The registry's **own small parser and renderer**, not the Handlebars runtime (keeps prototype access, partials and custom helpers out of reach; gives exact line/column positions for lint).
- Supported:
  - `{{field}}` — inserts a scalar as plain text with **no escaping**; joins an array with ", "; renders nothing when absent;
  - `{{#each field}} … {{this}} … {{@index}} … {{/each}}`;
  - `{{#if field}} … {{else}} … {{/if}}`;
  - `{{entity id}}` where `id` is a field or `this` inside `each` — inserts the resolved entity as a short header line (kind, id, project-relative path) followed by the file's content;
  - `{{toolCatalog}}` — inserts the catalogue of currently enabled tools (name, one-line description, port keys with port types, output kind); reads **registry data only** (passed in by the caller), never project files. The core pack's propose-graph needs it;
  - `{{!-- comments --}}`.
- Nothing else parses. Parse errors carry line/column.
- API: `parse(template) → AST | diagnostics`, `variables(AST)` (for lint), `render(AST, {args, entities, toolCatalog}) → string`. Rendering takes only validated arguments, caller-supplied entity contents and catalogue data.

## Acceptance criteria (tested through a test harness rendering fixture templates; the HTTP seam lands in TRG-12)
- [x] `{{field}}`, arrays, absent fields, `#each` with `this`/`@index`, `#if/else`, comments and `{{toolCatalog}}` render as specified.
- [x] `{{entity id}}` inside `#each` inserts each entity's header and content.
- [x] Unbalanced blocks and unsupported syntax (partials, helpers, `{{{triple}}}`, `../`) produce positioned errors.
- [x] `__proto__`/`constructor` lookups render nothing.
