---
id: MPR-04
title: openai-compatible streaming client — tool-call assembly, collect helper, abort, coded errors, transport retries, timeout
module: providers
phase: phase:client
milestone: M1
blocked_by: [MPR-01, "Platform phase:test-harness (PLT-12 mock OpenAI server)"]
parallel_with: [MPR-02, MPR-03]
unblocks: [MPR-05, MPR-07, MPR-08]
---

# MPR-04 — The client

## Why
The Agent loop gets one streaming call with text deltas and assembled tool calls (34), raw argument strings (35), abort (36) and coded errors (38); flaky networks are retried (28); hung models time out (29); stop cancels immediately (30).

## Decisions
- Built on the official `openai` SDK with explicit `baseURL` and `apiKey` (placeholder key for keyless providers). Takes a **resolved** target `{config, key?, model}`; resolution is MPR-05.
- **Input:** messages (system/user/assistant/tool, including assistant tool calls and tool results), optional tool function schemas (the Tool registry's model function-schema shape, passed through), optional tool choice, the model target, an abort signal. Sends `temperature` and `max_tokens` (verify `max_tokens` vs `max_completion_tokens` against the OpenAI API reference; if needed later, add a per-provider flag — expand, not a new kind).
- **Output:** async stream of events: `text-delta`; `tool-call` `{id, name, arguments: rawString}` once complete; `finish` `{reason: 'stop'|'tool-calls'|'length'|'aborted'}`; `usage` when reported. Tool-call fragments assembled **by index**; arguments are **not** parsed or validated.
- **Collect helper:** gathers the stream into `{text, toolCalls, finishReason, usage?}`.
- **Errors** (coded, keys never in messages): unreachable, unauthorized (401/403), model not found (404 / unknown-model replies), timeout, rate limited (429 after retries), bad response, aborted, not configured.
- **Transport retries** owned by the client: connection errors, timeouts before the first byte, 408, 409, 429 and 5xx, up to `retries` with exponential backoff, honouring `Retry-After`. Map onto the SDK's retry option where it matches; the client owns the policy either way. **Only before the first streamed chunk** — after tokens reached the caller, a failure ends the stream with a coded error. Other 4xx never retried. Abort never retried.
- **Timeout:** `timeout` bounds the wait for the first byte **and every idle gap between chunks** (a slow but progressing local model isn't cut off). Verify the SDK's stream timeout semantics; enforce in the client if they differ.
- Exported in-process TypeScript types for messages and events.
- **Mock OpenAI scenarios** added to `e2e/fixtures/mock-openai/scenarios/` (one file each): models non-empty / empty / failing; streamed text; streamed tool call with split arguments; malformed tool call; 401 without the expected key; 503-then-200; persistent 503; 429 with `Retry-After`; stall; long stream for abort.

## Acceptance criteria
- [ ] A streamed chat yields text deltas, then a tool call whose split arguments arrive assembled as one raw string, then a finish event.
- [ ] A malformed tool call is passed through as its raw string (no client parse error).
- [ ] 503-then-200 succeeds within `retries` (mock sees two attempts); persistent 503 beyond `retries` fails with the matching coded error; 401 fails immediately with `PROVIDER_UNAUTHORIZED` and one attempt.
- [ ] 429 with `Retry-After` waits at least that long before the retry.
- [ ] A stalled response fails with `PROVIDER_TIMEOUT` after `timeout`; a slow stream with gaps under `timeout` completes.
- [ ] Abort mid-stream ends with `PROVIDER_ABORTED` and the mock sees the connection close.
- [ ] The mock sees the key only in `Authorization`; with `OPENAI_API_KEY`/`OPENAI_BASE_URL` set in the env, they are not used.
