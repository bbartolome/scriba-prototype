---
id: AGL-20
title: Grounding gate — M3 done-when and demo
module: agent-loop
phase: phase:grounding
milestone: M3
blocked_by: [AGL-15, AGL-16, AGL-17, AGL-18, AGL-19, "Project store phase:search (PST-14)"]
parallel_with: [AGL-21, AGL-22]
unblocks: [AGL-23, "Project store review gate demo (PST-22)", "Compile & export unsupported-claims preflight"]
---

# AGL-20 — Grounding gate

Merging this **closes Agent loop `phase:grounding`**.

## Acceptance criteria (the phase checklist)
- [ ] **Done when** an invented statistic in a draft is flagged as unsupported.
- [ ] A check of the sample grounding-claims draft yields at least one claim of each verdict, and every supported or weak verdict cites a retrieved `sources/` passage.
- [ ] A verdict citing a passage that wasn't retrieved is downgraded to `unsupported`.
- [ ] The claims artefact matches the contract and carries the draft's content hash.
- [ ] Badges render with text labels at phone width.

## Demo (under 5 min)
Start from the sample and open the grounding-claims draft. Tap "Check grounding" and watch claims get their badges, the invented statistic marked unsupported. Expand a supported claim and open its cited source. Ask the agent to draft a paragraph and see the check run on its own.
