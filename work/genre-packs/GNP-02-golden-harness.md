---
id: GNP-02
title: Golden-test harness and the per-tool mock fixture convention
module: genre-packs
phase: phase:core-propose-graph
milestone: M2
blocked_by: ["Platform create-test-app (PLT-04) and mock OpenAI server (PLT-12)", "Tool registry phase:executor (TRG-12; execute endpoint)"]
parallel_with: [GNP-01]
unblocks: [GNP-04, GNP-07, GNP-08, GNP-09, GNP-10, GNP-14, GNP-15, GNP-16, GNP-17, GNP-20, GNP-21, GNP-22, GNP-23]
---

# GNP-02 — Golden harness

## Decisions
- Suite at `apps/api/test/packs/`; goldens and fixtures under `packages/packs/test/golden/<tool>/`.
- Each test boots the API with Platform's `create-test-app` (`SCRIBA_PACKS_DIR` → `packages/packs`) against a temp library and the mock OpenAI server, then calls `POST /api/tool-registry/tools/:name/execute` with **fixture arguments and fixture resolved entities**, and asserts:
  - the request the mock received (rendered prompt and function schema / system message) matches a checked-in golden;
  - the returned `{output, sourcesUsed}` matches the expected output kind and source IDs;
  - invalid arguments return Ajv's readable `TOOL_ARGS_INVALID` error.
- **Convention:** one mock scenario per tool at `e2e/fixtures/mock-openai/scenarios/pack-<tool>.json`; a helper to declare a golden case in a few lines; a documented `--update-goldens` flag (goldens change only on purpose, in the same PR as the prompt edit).
- Fixtures are the tests' own; never read `examples/`.

## Acceptance criteria
- [ ] A sample golden case against a test-only fixture tool passes, and fails when the template changes without updating the golden.
- [ ] The convention is documented in `packages/packs/test/README.md`.
