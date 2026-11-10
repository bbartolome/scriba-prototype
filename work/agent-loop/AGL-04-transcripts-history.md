---
id: AGL-04
title: Transcripts in logs/, conversation history across devices, context trimming
module: agent-loop
phase: phase:file-tools-chat
milestone: M1
blocked_by: [AGL-03]
parallel_with: [AGL-05, AGL-07]
unblocks: [AGL-08]
---

# AGL-04 — Transcripts and history

## Why
Every agent run as a plain-file transcript (44) with project-relative paths and no keys (45); chat history carries across agent runs and devices (46).

## Decisions
- One JSON Lines file per agent run at `logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl` (UTC start), written through the Project store's in-process `appendLog` (allowed for any `ok` project, so a run stopped by a switch can finish its log). Each line is a contract transcript entry (`intent`, `step`, `assistant-text`, `tool-call`, `tool-result`, `tool-error`, `grounding`, `pending-change`, `run-end`).
- Paths are project-relative; keys and auth headers are never written; very long tool results are truncated with a marker and the original length.
- **Conversation history** is rebuilt **from the transcripts** (no separate store), so any device can continue. `GET` conversation list and `GET` conversation history.
- **Context trimming:** when history exceeds the resolved provider's `contextSize`, shorten the oldest tool results first, then drop the oldest turns. The current intent and system prompt are always kept.
- `logs/` is the source of truth; a run-log index is deferred.

## Acceptance criteria
- [ ] A transcript file in `logs/` matches the contract entry schema line by line.
- [ ] A follow-up start with the same `conversationId` sends the earlier turns to the mock.
- [ ] With a tiny `contextSize`, the oldest tool results are shortened before turns are dropped; the system prompt and current intent remain.
- [ ] No transcript line contains an absolute container path or a configured key.
