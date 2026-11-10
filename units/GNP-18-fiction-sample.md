---
id: GNP-18
title: Fiction sample project (examples/fiction) and its samples.yaml entry
module: genre-packs
phase: phase:fiction
milestone: M6
blocked_by: [GNP-03, GNP-13, GNP-16, "Graph runner phase:contract (GRR-01)", "Project store start-from-sample (PST-05)"]
parallel_with: [GNP-14, GNP-15, GNP-17]
unblocks: [GNP-19]
---

# GNP-18 — Fiction sample

## Decisions
An original short piece about two lighthouse keepers, kept small (3–6 entities, 2–3 drafts of a few hundred words). Entry added to `examples/samples.yaml`.
- `project.yaml`: `genrePack: fiction`, `styleProfile` reference, **no `order`** (compile order comes only from the story graph's `order` edges; the nonfiction sample demos the `project.yaml` order field).
- `entities/` (five): two `character`s with clearly distinct voices and relationship notes (a terse veteran keeper and a talkative relief keeper), one `place` (the lighthouse island), one `world-rule` (e.g. "the supply boat comes only on a spring tide"), one `style-profile`.
- `drafts/`: `arrival.md` (two scenes), `the-storm.md` (one scene), `ledger.md` (a short file-backed beat). Alphabetical order (arrival, ledger, the-storm) differs from story order.
- `graphs/` **story graph**: two scene nodes both pointing at `drafts/arrival.md`; one scene node for `drafts/the-storm.md`; a **label-only beat** contained in the storm scene; a **file-backed beat** pointing at `drafts/ledger.md`; entity nodes for the characters and the place; `order` edges (arrival scenes → storm → ledger beat), one `containment` edge (storm scene → beat), one `causality` edge (label-only beat → ledger beat), and one free-text relation from a scene to its POV character.
- `graphs/` **recipe**: text Input (scene file reference) + entity Input (characters) + style Input → `dialogue` tool node → Output node (`draft`).
- Expected compile order: `arrival.md`, `the-storm.md`, `ledger.md`.
- Wholly original text; no `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/`.

## Acceptance criteria
- [ ] The fiction sample validates in Platform's examples check (graph schema, `project.yaml`, entity types, recipe tool references and params).
- [ ] Every story-node `path` exists; two scene nodes share `drafts/arrival.md`; there is one label-only beat and one file-backed beat.
