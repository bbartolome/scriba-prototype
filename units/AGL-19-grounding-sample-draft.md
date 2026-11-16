---
id: AGL-19
title: Nonfiction sample grounding-claims draft and its mock scripts
module: agent-loop
phase: phase:grounding
milestone: M3
blocked_by: ["Project store nonfiction skeleton (PST-11)", "Genre packs nonfiction sample entities (GNP-11)", "AGL-16"]
parallel_with: [AGL-15, AGL-17, AGL-18]
unblocks: [AGL-20]
---

# AGL-19 — Grounding-claims sample

## Decisions
- Adds a short draft to `examples/nonfiction/drafts/` whose claims the sample's `sources/` **support, weakly support and don't support**; at least one claim is an **invented statistic** that appears in no source. One check shows all three verdicts.
- Its claims must not contradict the `claim` entities' statuses (GNP-11).
- Adds the matching scripted **extract and judge** turns to `e2e/fixtures/mock-openai/` in the same PR (sample paths are a contract with the mock).
- Original text; no `.scriba/`, `logs/`, `snapshots/` or `.versions/`.

## Acceptance criteria (mock extract and judge turns; the engine is tested through a test-only HTTP harness until AGL-17 exists)
- [ ] Platform's examples check still passes.
- [ ] A check of the draft against the mock yields at least one claim of each verdict, every supported/weak verdict citing a retrieved `sources/` passage (asserted on a temp copy, not `examples/`).
