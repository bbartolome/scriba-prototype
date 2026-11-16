---
id: AGL-08
title: File-tools-chat gate — "summarize my outline" mock script, e2e agent-run step, M1 demo
module: agent-loop
phase: phase:file-tools-chat
milestone: M1
blocked_by: [AGL-02, AGL-03, AGL-04, AGL-05, AGL-06, AGL-07, "Platform phase:test-harness (PLT-13)", "Project store nonfiction skeleton (PST-11)", "Frontend shell tool-call card (SHL-10)"]
parallel_with: []
unblocks: [AGL-09, AGL-12, AGL-21, AGL-22, AGL-24, AGL-25]
---

# AGL-08 — File-tools-chat gate

Merging this **closes Agent loop `phase:file-tools-chat`** (M1).

## Scope
- Mock OpenAI scenario for the **"summarize my outline"** turn (list → read `sources/outline.md` → text), referencing nonfiction sample paths (a contract with `examples/`).
- **Turn on the e2e "agent run" step** (PLT-13): configure a provider through the Model providers API pointing at the mock scenario URL, start from the sample, send the intent, assert the cards and the answer.

## Acceptance criteria (the phase checklist)
- [x] **Done when** the author types "summarize my outline" in the nonfiction sample and gets a correct answer with visible tool calls.
- [x] Step cap, stop timing, outside-path refusal, malformed-turn withdrawal, reload-restores-state and transcript-schema criteria (AGL-02…AGL-07) pass on `main`.
- [ ] The e2e agent-run step passes in CI.

## Demo (under 5 min)
1. Start from the nonfiction sample.
2. Type "summarize my outline": the `list_files` and `read_file` cards appear and the answer streams in.
3. Open the same chat on a phone and see the same conversation.
4. Start "read every file twice" and press stop.
5. Open `logs/` and show the transcript.
