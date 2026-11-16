---
id: AGL-16
title: Grounding engine — extract, retrieve, judge; result and claims artefact
module: agent-loop
phase: phase:grounding
milestone: M3
blocked_by: [AGL-10, AGL-12]
parallel_with: [AGL-13, AGL-14, AGL-15, AGL-18]
unblocks: [AGL-17, AGL-19, AGL-20]
---

# AGL-16 — Grounding engine

## Why
Each claim marked supported, weak or unsupported (33), citing a `sources/` passage (34); an invented statistic flagged (35); the latest result kept for Compile & export (37).

## Decisions
1. **Extract:** one model call with a fixed prompt returns the draft's factual claims as JSON (`text`, character `span`). Validated with the same two retries.
2. **Retrieve:** for each claim, Project store search returns the top passages, **scope `sources`** only.
3. **Judge:** one model call per batch of claims judges each `supported | weak | unsupported` against its passages. Supported and weak verdicts **must cite** one of the retrieved passages `{path, offset, snippet}`; a verdict citing a passage outside the retrieved set is **downgraded to `unsupported`**. A claim with no retrieved passages is `unsupported` without asking the model.
- **Result** (contract shape) with `contentHash` (`sha256:<hex>` over the checked text — the overlay content for a draft the run proposed, otherwise the file on disk).
- **Claims artefact:** the latest result per draft written as JSON to `logs/grounding/<targetPath>.json` through the Project store's in-process `write`, overwritten by each check.
- Grounding model calls don't count towards the step cap; stop cancels them.
- Fetched web pages and entities are **not** evidence.

## Acceptance criteria (mock extract and judge turns; the engine is tested through a test-only HTTP harness until AGL-17 exists)
- [x] A verdict citing a passage that wasn't retrieved is downgraded to `unsupported`.
- [x] A claim with no retrieved passages is `unsupported` and no judge call covers it.
- [x] The claims artefact matches the contract, sits at the path rule, and carries the checked text's content hash.
- [x] Malformed extract JSON is retried twice, then the check fails readably.
