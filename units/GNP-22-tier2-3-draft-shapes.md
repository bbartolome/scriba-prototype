---
id: GNP-22
title: Nine tier 2–3 nonfiction draft shapes (shipped disabled)
module: genre-packs
phase: phase:remaining-shapes
milestone: M7
blocked_by: [GNP-02, GNP-06, GNP-12]
parallel_with: [GNP-19, GNP-20, GNP-21]
unblocks: [GNP-23, GNP-24]
---

# GNP-22 — Tier 2–3 draft shapes

All nine are nonfiction, output `draft`, **`enabled: false`**, with the five common inputs plus:

| Tool | Description | Extra inputs |
|---|---|---|
| `contrast` | Set two things side by side so the difference makes the point. | `subjectA`, `subjectB` [text ports, required] |
| `profile` | Paint one person in depth to embody the idea. | `person` [entity port, kind `person`, required] |
| `zoom` | Move from a close-up detail out to the big picture and back. | `detail` [text, required], `bigPicture` [text] |
| `reader_challenge` | Ask the reader to test their own assumption before the reveal. | `question` [text, required] |
| `framework_builder` | Turn a pattern into a small named framework with steps. | `pattern` [text, required], `claimIds` [entity list, kind `claim`] |
| `method_first` | Explain how the evidence was gathered before what it showed. | `method` [text, required] |
| `timeline` | Tell events in order to show how the idea unfolded. | `events` [text, required] |
| `flashback` | Break from the present moment to a past one that explains it. | `present`, `past` [text, required] |
| `stockdale_tension` | Face the hardest fact while holding on to the hope beside it. | `hardFact`, `hope` [text, required] |

Each prompt follows the shared skeleton with its own shape steps.

## Acceptance criteria
- [x] All nine pass the validation suite with identical common inputs and ship disabled.
- [x] One golden test per tool.
- [x] Enabling one through the Tool registry (a copy-on-write user-pack copy, or the enable override) makes it callable via execute and present in the function list.
- [x] Manual eval cases added.
