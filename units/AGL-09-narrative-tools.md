---
id: AGL-09
title: Narrative tools — enabled registry tools as functions, entity resolution, citations, draft provenance
module: agent-loop
phase: phase:narrative-tools
milestone: M2
blocked_by: [AGL-08, "Tool registry phase:executor (TRG-12; catalog TRG-11)"]
parallel_with: [AGL-10, AGL-12, AGL-25]
unblocks: [AGL-11, AGL-13]
---

# AGL-09 — Narrative tools

## Why
The agent calls enabled narrative tools (20), disabled ones are hidden (21), entity IDs are fetched by the app (22), unknown IDs are readable errors (23), every draft records its entities and tool run (26), with sources on the card (27).

## Decisions
- At the start of each agent run, read the registry's **enabled** tools offered to the project (catalog service) and add their model function schemas (`x-scriba-*` stripped). Enabling/disabling takes effect on the next agent run. Clashes with reserved names are left out and reported once in the transcript.
- Before executing, find every argument the tool's port/form descriptor marks as an entity or style reference (`x-scriba-type`), fill an empty style field with the project's `styleProfile`, resolve each ID through the Project store's resolution (in-process), and pass contents to the registry's **executor** (abortable by stop).
- Registry `TOOL_ARGS_INVALID` / `TOOL_ENTITY_UNRESOLVED` / `TOOL_ENTITY_KIND_MISMATCH` errors (and Project store unknown-ID errors) are rendered in the readable format and count as retries (AGL-02 policy).
- Record citations: entity IDs passed and `sourcesUsed`. Build **draft provenance** `{runId, toolCallId, tool, entityIds, sourcesUsed, model, at}`; put it on the `tool-call-result` event and in the transcript. The card shows sources used as links to the files route.
- At this milestone, `draft` outputs are shown in the chat with their provenance; they become pending changes in AGL-13.

## Acceptance criteria
- [x] A disabled tool is absent from the mock's received request.
- [x] A narrative call with entity IDs sends resolved contents to the executor and the card shows `sourcesUsed`.
- [x] An unknown entity ID returns a readable error and counts as a retry.
- [x] Every draft's card and transcript entry carry provenance.
