---
id: GNP-05
title: Core gate — image read-only check, registry lists propose_graph
module: genre-packs
phase: phase:core-propose-graph
milestone: M2
blocked_by: [GNP-01, GNP-02, GNP-03, GNP-04, "Platform phase:image-compose (PLT-14; image build)"]
parallel_with: [GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-13]
unblocks: [GNP-12]
---

# GNP-05 — Core gate

Merging this **closes Genre packs `phase:core-propose-graph`**.

## Scope
- A check (in Platform's image smoke or a local image test script) that the built image contains `/opt/scriba/packs/{core,nonfiction,fiction}` and the app user cannot write there.

## Acceptance criteria (the `phase:core-propose-graph` checklist)
- [ ] CI runs the pack validation suite on every push and fails on its broken-spec fixtures (GNP-01).
- [x] `propose_graph` validation and both-view goldens pass (GNP-04).
- [x] The built image contains `/opt/scriba/packs/core`, and the app user cannot write to it.
- [x] The Tool registry's list includes `propose_graph` from the built-in `core` pack.
