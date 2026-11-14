---
id: TRG-09
title: Read endpoints, functions, params-mode validate and per-tool enable overrides
module: tool-registry
phase: phase:loader-validation
milestone: M2
blocked_by: [TRG-06]
parallel_with: [TRG-07, TRG-10]
unblocks: [TRG-11]
---

# TRG-09 — Read endpoints and enable switch

## Why
Switch a tool off (14), surviving updates (15); the agent gets function schemas of enabled tools for the active project (35); the Graph runner validates `params` on recipe load (43).

## Decisions
- `GET /api/tool-registry/tools` (summaries; optional genre-pack filter), `GET …/tools/:name` (effective spec, YAML source, origin, lint result, three views; for an invalid tool, `spec` and `views` are null and `source` and `lint` are still returned, the Navigator's decision of 2026-11-14 on TRG-01 open point 2, `plans/DECISIONS.md`), `GET …/tools/:name/builtin` (the built-in original of a customised tool), `GET …/tools/:name/user` (`TOOL_USER_ROUTE`: the user copy's detail, valid or not; the Navigator's decision of 2026-11-14 on TRG-01 open point 8, `plans/DECISIONS.md`), `GET …/functions` (function schemas offered to the active project), `GET …/entity-types` (loaded entity-type schemas, read-only).
- `POST …/tools/:name/validate` in **full** or **`params`** mode. `params` mode validates only non-port fields: **port keys are removed from the input before validation** (so pinned port values in a tool node's `params` are neither rejected as unknown nor checked here; they're checked at run time in full mode), and required ports are ignored. Used by the Graph runner on recipe load and by Platform's examples check.
- **Enable switch:** the spec's `enabled` is the default; the author's override lives in the `tools` section `{schemaVersion: 1, enabled: {<toolName>: boolean}}` (register the section with Platform's hook; only overridden tools appear). `POST …/tools/:name/enabled {enabled}`. Toggling **never** creates a copy-on-write fork. Disabled tools are left out of function schemas, refused by the executor, still listed and editable, still shown on the canvas (where the Graph runner reports the refusal).

## Acceptance criteria
- [ ] Disabling a tool removes it from `GET /functions`; the switch persists across an app restart and a built-in update (replace the fixture pack file).
- [ ] Toggling writes only the `tools` section and creates no user-pack file.
- [ ] `params`-mode validate passes a node whose only missing fields are ports, and ignores pinned port values.
- [ ] GETs are side-effect free.
