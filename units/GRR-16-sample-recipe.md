---
id: GRR-16
title: Nonfiction sample recipe (graphs/chapter-opening.json)
module: graph-runner
phase: phase:canvas
milestone: M4
blocked_by: [GRR-01, "Genre packs phase:nonfiction-workhorses (workhorse port names)", "Platform examples check graph layer (PLT-21) and pack layer (PLT-22)"]
parallel_with: [GRR-09, GRR-10, GRR-11, GRR-12, GRR-13, GRR-14, GRR-15]
unblocks: [GRR-17]
---

# GRR-16 — Sample recipe

## Decisions
- Adds **one recipe** to `examples/nonfiction/graphs/`, e.g. `chapter-opening.json`:
  - a text input node "Chapter notes" (meant to be fed a `drafts/` file);
  - an entity input node "Key people and claims";
  - a style input node;
  - the nonfiction workhorse tools (cold open, mystery question, myth-buster, numbers-to-people) chained on their text ports (e.g. mystery question into cold open);
  - one output node writing a draft.
  - Exact ports follow the Genre packs workhorse specs.
- The sample ships **no story graph** (draft order stays set by `project.yaml`'s order field), and no `logs/`, `.scriba/`, `snapshots/` or `.versions/`.
- Its path is a contract with `e2e/fixtures/mock-openai/`: add the mock scenario for running it; renaming the file updates the scenario in the same PR.

## Acceptance criteria
- [ ] The recipe passes Platform's CI sample check (graph schema, tool references and `params`).
- [ ] It runs end to end from "start from sample" against the mock OpenAI server (API-level test using a temp copy of the sample, not reading `examples/` in unit tests).
