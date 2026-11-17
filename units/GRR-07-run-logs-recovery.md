---
id: GRR-07
title: Run logs in logs/recipe-runs and restart recovery
module: graph-runner
phase: phase:engine
milestone: M4
blocked_by: [GRR-04]
parallel_with: [GRR-05, GRR-06]
unblocks: [GRR-08]
---

# GRR-07 — Run logs and recovery

## Why
Every run is auditable later (40); a device or an API restart never shows a stale "running" (36).

## Decisions
- Log file `logs/recipe-runs/<runId>.jsonl` written through the Project store's in-process `appendLog`, one JSON line per entry (contract shape): run start (graph id, scope, input values with file path + `sha256:` hash); each node status change; each tool call's validated arguments, output and `sourcesUsed`; errors; pending change ids (emitted by GRR-06 through this logger); run end. `logs/` is the source of truth; the run-log index is deferred. The Agent loop's transcripts are a separate format.
- **Restart recovery:** on API start, the most recent run of the active project is rebuilt from its log; a run with no end entry is reported as `stopped` with reason `interrupted` (and an end entry is appended).
  Reworded by revision of GRR-07 on 2026-11-17. The old text was: "**Restart recovery:** on API start, the most recent run per project is rebuilt from its log; a run with no end entry is reported as `stopped` with reason `interrupted` (and an end entry is appended)." See plans/DECISIONS.md.

## Acceptance criteria
- [ ] After a run, the log holds start, per-node, tool-call, pending-change and end entries that parse against the contract.
- [ ] After an API restart mid-run, current-run-state reports that run as `stopped` with reason `interrupted`.
