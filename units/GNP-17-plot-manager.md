---
id: GNP-17
title: plot_manager tool (check output)
module: genre-packs
phase: phase:fiction
milestone: M6
blocked_by: [GNP-02, GNP-13]
parallel_with: [GNP-12, GNP-14, GNP-15, GNP-16, GNP-18]
unblocks: [GNP-19]
---

# GNP-17 — Plot manager

## Spec
- `fiction/tools/plot_manager.yaml`, output `check`, `enabled: true`. Description: "Check beats, setups and payoffs for gaps and loose ends."
- Inputs: `outline` [text port, required: the story graph file or a beat list], `entityIds` [entity port list].
- Prompt: list findings — each setup without a payoff, payoff without a setup, beat gaps and loose ends — citing story-node labels or entity IDs; no rewriting. (`check` results show inline and in logs; they're not written by output nodes in v1.)

## Acceptance criteria
- [ ] Passes the validation suite; golden test passes with a story-graph JSON fixture as `outline`.
- [ ] Manual eval case added.
