---
id: AGL-25
title: Manual real-model eval script for the tool-calling loop
module: agent-loop
phase: none
milestone: M1 (lands right after AGL-08; not in a gate)
blocked_by: [AGL-08]
parallel_with: [AGL-09, AGL-10, AGL-12]
unblocks: ["Genre packs per-tool manual eval cases"]
---

# AGL-25 — Manual eval script

## Decisions
- A script (e.g. `npm run eval:agent`) that runs the loop against a real local model — a small one and a larger one — over a set of cases, and records which failure modes the retries handled (malformed calls, withdrawals, step caps), citation presence, and outcomes. **Not part of CI.**
- Cases are data files (one per case: intent, project fixture, expectations), so Genre packs adds per-tool cases (citation presence for the workhorses, voice separation for Dialogue) without code changes.
- Output: a Markdown or JSON report under a git-ignored folder.

## Acceptance criteria
- [x] The script runs the "summarize my outline" case against a configured provider and writes a report.
- [x] Adding a case is a single data file, documented in the script's README.
