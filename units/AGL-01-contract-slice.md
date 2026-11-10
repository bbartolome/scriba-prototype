---
id: AGL-01
title: Publish @bbartolome/scriba-contracts/agent-loop
module: agent-loop
phase: phase:contract
milestone: M1
blocked_by: ["Platform phase:scaffold (PLT-11)", "Project store phase:contract (PST-01)"]
parallel_with: ["wave-1 contract phases"]
unblocks: [AGL-02, AGL-06, AGL-07, "Project store provenance display", "Compile & export contract slice (CEX-01)", "Compile & export unsupported claims and orphan scenes (CEX-06)"]
---

# AGL-01 — Contract slice

Merging this **closes Agent loop `phase:contract`**. Zod schemas and inferred TS types; no runtime logic beyond schemas and constants.

## Shapes
- **Start request** `{intent, conversationId?}` → `{runId, conversationId}`; **stop request** `{runId}`; on-demand grounding request `{path}`; continue = start with the same `conversationId`.
- **Stream events** under Platform's envelope (`module: 'agent-loop'`); every `data` carries `runId` and a per-run increasing `seq`:
  - `run-started`;
  - `token-delta` `{text}`;
  - `tool-call-started` `{callId, name, family: 'project'|'narrative'|'research'|'compile'|'grounding'}`;
  - `tool-call-args` `{callId, arguments, valid}` (final, validated or raw);
  - `tool-call-result` `{callId, summary, output?, diffPreview?: {path, base, proposed}, sourcesUsed?, provenance?}`;
  - `tool-call-error` `{callId, message, attempt, withdrawn?}`;
  - `grounding-started` `{targetPath}`; `grounding-result` (grounding result);
  - `step-cap-reached` `{step, cap}`;
  - `run-ended` `{reason: 'completed'|'stopped'|'capped'|'error'|'project-switched', message?, pendingChangeIds}`.
- **Current-run-state** `{runId, conversationId, status, step, cap, assistantText, cards: [...card state], groundingResults, pendingChangeIds, lastSeq, reason?}`; **conversation history** `{conversationId, turns: [{runId, intent, assistantText, cards, endedAt, reason}]}` and conversation list.
- **Grounding result / claims artefact** `{schemaVersion: 1, targetPath, contentHash, checkedAt, runId, claims: [{text, span: {start, end}, verdict: 'supported'|'weak'|'unsupported', passage?: {path, offset, snippet}, reason}]}`; `contentHash` in the Project store's `sha256:<hex>` format. **Path rule constant:** `logs/grounding/<targetPath>.json` (e.g. `logs/grounding/drafts/ch01.md.json`).
- **Grounding summary** `{supported, weak, unsupported, checkedAt}` (matches the Project store's `grounding` field).
- **Transcript entry** `{schemaVersion, at, runId, conversationId, seq, kind, data}`, `kind` ∈ `intent | step | assistant-text | tool-call | tool-result | tool-error | grounding | pending-change | run-end`; file path rule `logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl`.
- **Draft provenance** `{runId, toolCallId, tool, entityIds, sourcesUsed, model, at}`.
- **Agent settings** `{schemaVersion: 1, stepCap (default 12), research: {enabled (default false), searchEndpoint?}}`.
- **Route constants**, **error codes** (`AGENT_RUN_ACTIVE`, `AGENT_NO_PROVIDER`, `AGENT_NO_ACTIVE_PROJECT`, `AGENT_RUN_NOT_FOUND`), the **run-end reason enum** and the **reserved built-in tool names**.

## Acceptance criteria
- [ ] Every shape above is exported as a Zod schema with an inferred type; no runtime logic.
- [ ] Each event schema parses one valid and rejects one invalid example in contract tests.
- [ ] The Shell, Project store and Compile & export can import the slice from its subpath.
