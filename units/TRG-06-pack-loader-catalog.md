---
id: TRG-06
title: Pack loader (built-ins + user pack, copy-on-write precedence, manifest re-scan, schemaVersion, entity types) and the catalog service
module: tool-registry
phase: phase:loader-validation
milestone: M2
blocked_by: [TRG-02]
parallel_with: [TRG-03, TRG-04, TRG-05, TRG-08]
unblocks: [TRG-07, TRG-09, TRG-10, TRG-11]
---

# TRG-06 — Loader and catalog

## Why
Customised copies win over built-ins (17); host-side user-pack edits show up without restart (29); invalid user files are listed, not fatal (30), and invalid copies fall back to the built-in (31); newer files are refused (32); a project sees core + its genre + user tools (34–35).

## Decisions
- **Packs root** `SCRIBA_PACKS_DIR` (default `/opt/scriba/packs`; dev → `packages/packs`; tests → fixtures). Built-in packs `core`, `nonfiction`, `fiction` (read-only, built from `packages/packs`; `core` holds propose-graph). Each pack holds `tools/` (one YAML per tool) and `entity-types/` (one YAML per entity-type schema).
- **User pack:** `${SCRIBA_BOOKS_DIR}/.scriba/packs/user/tools/` — tools only in v1. Files named `<name>.yaml`.
- Built-ins loaded **once at startup**. The user pack is **re-scanned when its `(path, mtime, size)` manifest changes**, checked before each list, get or call (mirrors the Project store's freshness rule; no watcher). A detected change emits `catalog-changed` (wired in TRG-10).
- **Precedence:** user > built-in by name. Two built-in packs defining the same name is a load error (CI pack lint catches it).
- **Invalid handling:** a user copy of a built-in that fails validation → the built-in is used and the list shows the user copy invalid with a warning. A user-only tool that fails → listed invalid, not offered or callable. A file that cannot be parsed, or is refused, is listed with the summary fields of TRG-01's option A: `output` null, `description` `''`, `enabled` false, and `error` `{code, message}` (the Navigator's decision of 2026-11-14 on TRG-01 open point 2, `plans/DECISIONS.md`).
- **`schemaVersion`:** newer → refused and listed with `TOOL_SCHEMA_VERSION_UNSUPPORTED`; older → migrated **in memory** on load (migration hook present even with a single version), written back only when the author saves from the editor.
- **Entity-type schemas** loaded and validated: envelope `{schemaVersion, kind, title, description, folder, fields}`; `fields` uses the tool-inputs subset **plus one extension** — an `array` whose `items` is an `object` with scalar properties, `required` and `additionalProperties: false` (one level only). Unknown front-matter keys allowed (`additionalProperties` treated as `true`). Reference fields carry `x-scriba-type: entity` and `x-scriba-entity-kinds` (no `x-scriba-port` / `x-scriba-control`). The loader exposes an **Ajv validator per kind** (used by Platform's examples check, PLT-22).
- **Catalog service** (exported in-process): list, get (spec + views), function schemas, port descriptors, validate; **project offering** = enabled, valid tools from `core`, the project's genre pack (from `project.yaml`) and the user pack.
- Replaces TRG-02's fixture source.

## Acceptance criteria (fixture packs)
- [x] The list includes core, genre and user tools; a user file with a built-in's name replaces it; deleting that file restores the built-in.
- [x] A user file with a newer `schemaVersion` is listed as refused and the other tools still load.
- [x] A file added to the user pack on the host appears in the next list without a restart.
- [x] An invalid user copy falls back to the built-in with a warning; an invalid user-only tool is listed but not offered.
- [x] An entity-type schema with a one-level array-of-objects field loads; its per-kind validator accepts/rejects front-matter fixtures.
- [x] A project with `genrePack: nonfiction` is offered core + nonfiction + user tools only.
