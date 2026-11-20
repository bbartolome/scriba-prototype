---
id: AGL-21
title: Research toggles and web_search against a SearXNG-compatible endpoint
module: agent-loop
phase: phase:research
milestone: M7
blocked_by: [AGL-06, AGL-08]
parallel_with: [AGL-20, AGL-22, AGL-24]
unblocks: [AGL-23, AGL-26]
---

# AGL-21 — `web_search`

## Why
Nothing leaves the machine unless the author switches research on (40).

## Decisions
- `agent.research.enabled` defaults to `false`; when false, **no research tools** are in the tool list.
- `web_search(query)` calls the configured **SearXNG-compatible JSON endpoint** (`GET <endpoint>?q=<query>&format=json`, reading `results[].{title, url, content}`), no key. `agent.research.searchEndpoint` has **no default**: `web_search` is offered only when research is on **and** an endpoint is set. Keyed search APIs are out of scope for v1.
- The search endpoint itself is author-configured and exempt from `fetch_page`'s private-network refusal (it is commonly a local SearXNG).
- Settings sheet controls in the chat panel (AGL-07).

## Acceptance criteria
- [x] With research off, the mock's received request contains no research tools.
- Moved to AGL-26 by revision on 2026-11-20 (old text: "With research on and no endpoint, only `fetch_page` is offered."; it names AGL-22's tool, and AGL-21 is not blocked by AGL-22).
- [x] With both, a search runs against a local SearXNG-shaped stub and returns titles, URLs and snippets.
