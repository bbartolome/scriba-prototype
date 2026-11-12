---
id: PLT-12
title: Scripted mock OpenAI-compatible server with scenarios
module: platform
phase: phase:test-harness
milestone: M1
blocked_by: [PLT-01]
parallel_with: [PLT-02, PLT-03, PLT-04, PLT-05, PLT-06, PLT-07, PLT-08, PLT-09, PLT-10, PLT-11, PLT-14]
unblocks: [PLT-13, "Genre packs golden harness (GNP-02)", "Graph runner run engine core (GRR-04)", "Model providers openai-compatible client (MPR-04)", "Tool registry executor (TRG-12)"]
---

# PLT-12 — Mock OpenAI server

Model providers, Agent loop, Tool registry, Graph runner and Genre packs gate their model-calling phases on `phase:test-harness` because of this server. It depends only on the workspace, so it can start on day one.

## Why
Module builders test model behaviour without a model (story 37), select a scenario via the base URL so parallel tests never share state (story 38), and assert on what their code sent (story 39).

## Decisions
- Lives at `e2e/fixtures/mock-openai/` (make `e2e/` a workspace if it needs its own dev deps).
- Serves `GET /v1/models` and `POST /v1/chat/completions`, streaming and non-streaming.
- **Scenario selected by base-URL path prefix:** `…/scenario/<name>/v1`.
- **A scenario is a data file** `e2e/fixtures/mock-openai/scenarios/<name>.json`: an ordered list of steps that match on the request (turn index, last message role/content, tool result present) and reply with one of: streamed content deltas; streamed tool calls (arguments split across chunks); an HTTP status with headers; a delay; a dropped connection.
- Every scenario **records the requests it received** (headers, body, attempt count); a test reads them back through a mock-only endpoint, and there is a per-scenario reset.
- Platform ships two scenarios: `tool-call` (a normal tool-call turn, then a final text answer after the tool result) and `malformed-tool-call` (invalid arguments on the first turn, valid on the retry). Modules add scenarios additively, one file each.
- Scenario paths naming files in the nonfiction sample are a contract with `examples/`: renaming a sample file updates the scenario in the same PR.
- Exported for in-process use by Vitest (start on an ephemeral port, return its base URL) and as `npm run mock:openai` for manual demos.
- Tested through the **official `openai` SDK** as a client.

## Acceptance criteria
- [x] The `openai` SDK pointed at `…/scenario/tool-call/v1` gets a streamed tool call with arguments split across chunks, then a final text answer after the tool result is sent.
- [x] `malformed-tool-call` returns invalid tool-call arguments on the first turn and valid ones on the retry.
- [x] A scenario can return a status with headers (e.g. 429 with `Retry-After`), delay, or drop the connection.
- [x] Recorded requests are readable and resettable per scenario.
- [x] Two tests using different scenarios in parallel don't interfere.
- [x] `npm run mock:openai` starts the server and prints its base URL.
