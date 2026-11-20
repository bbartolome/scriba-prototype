---
id: AGL-26
title: Research on with no search endpoint offers only fetch_page
module: agent-loop
phase: phase:research
milestone: M7
blocked_by: [AGL-21, AGL-22]
parallel_with: []
unblocks: []
---

# AGL-26 — Research on, no endpoint

Split from AGL-21 by revision on 2026-11-20: criterion 2 of AGL-21 moved here word for word, because it names `fetch_page` (AGL-22) and AGL-21 is not blocked by AGL-22. The decisions below are copied word for word from AGL-21 (bullets 1 and 2) and AGL-22 (bullet 1); they stay in those units.

## Decisions
- `agent.research.enabled` defaults to `false`; when false, **no research tools** are in the tool list.
- `web_search(query)` calls the configured **SearXNG-compatible JSON endpoint** (`GET <endpoint>?q=<query>&format=json`, reading `results[].{title, url, content}`), no key. `agent.research.searchEndpoint` has **no default**: `web_search` is offered only when research is on **and** an endpoint is set. Keyed search APIs are out of scope for v1.
- Offered whenever research is on. Only `http(s)`. (AGL-22, about `fetch_page`.)

## Acceptance criteria
- [ ] With research on and no endpoint, only `fetch_page` is offered.
