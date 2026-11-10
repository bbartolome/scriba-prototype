---
id: AGL-03
title: Loop core — start, steps, step cap and continue, stop, one active agent run, project-switch stop, provider errors, events
module: agent-loop
phase: phase:file-tools-chat
milestone: M1
blocked_by: [AGL-02, AGL-06, "Model providers phase:client (MPR-08)", "Setup & auth phase:token-guard (SAU-08)"]
parallel_with: [AGL-07]
unblocks: [AGL-04, AGL-05, AGL-08]
---

# AGL-03 — Loop core

## Why
Type an intent (1) with a project summary (2), watch tokens stream (4) and cards (5), see "step 4 of 12" (7), stop at the cap (8) and continue (9), always-visible stop that cancels the model call (11–12), confined to the active project (13) and stopped on a switch (14); one agent run at a time (50); a clear message with no provider (51).

## Decisions
- **Start** `POST /api/agent-loop/runs` `{intent, conversationId?}` → `{runId, conversationId}` immediately; everything else over SSE. The agent run is **bound to the project active at start** (`AGENT_NO_ACTIVE_PROJECT` if none).
- **One active agent run per project:** a second start → `AGENT_RUN_ACTIVE`. An agent run and a recipe run may run concurrently, unaware of each other.
- **No provider configured** → `AGENT_NO_PROVIDER` before the agent run starts (resolution through the providers client).
- **Messages each step:** a fixed system prompt (role, confinement, "writes become pending changes", "cite sources with `[@id]`"), the **project summary** (plain text built at start from the Project store: title and genre pack from the project list, and per top-level folder its file count), the conversation so far (AGL-04 provides history), and the tool schemas for the families currently on.
- **Step:** one model call (streaming, through the providers client with the project id target). Tool calls in the reply run **in order, one at a time**; each result is appended; take another step. A reply with text and no tool calls ends with reason `completed`.
- **Step cap** from the `agent` settings (default 12). Reaching it emits `step-cap-reached` and ends with `capped`. **Continue** = a new agent run in the same conversation with a fresh cap.
- **Stop** `POST …/runs/stop {runId}` aborts the in-flight model call and any running tool, ends with `stopped`; stopping twice is a no-op; unknown run → `AGENT_RUN_NOT_FOUND`.
- **Project switch:** register with the Project store's `onProjectSwitched`; a switch stops the old project's agent run with reason `project-switched`.
- A provider failure after the client's retries ends with reason `error` and a readable message.
- **Events** (contract) with a per-run increasing `seq`: `run-started`, `token-delta`, `tool-call-started`, `tool-call-args`, `tool-call-result`, `tool-call-error`, `step-cap-reached`, `run-ended`.
- `run-ended` carries pending change IDs (empty until AGL-12).

## Acceptance criteria (mock OpenAI server)
- [ ] A list → read → text turn emits events in `seq` order matching the contract and ends `completed`.
- [ ] With the mock set to loop, the agent run ends at step 12 with `step-cap-reached` and `run-ended: capped`; Continue starts a new agent run in the same conversation.
- [ ] Stop ends an agent run within one second of the POST with `run-ended: stopped`; the mock sees the request aborted.
- [ ] A second start returns `AGENT_RUN_ACTIVE`; no provider returns `AGENT_NO_PROVIDER`.
- [ ] Switching the active project ends the agent run with `project-switched`.
- [ ] The mock's received request contains the system prompt, the project summary and only the enabled families' tools.
