---
id: PST-22
title: Review gate — e2e "accept change" step and M3 demo
module: project-store
phase: phase:pending-review
milestone: M3
blocked_by: [PST-14, PST-17, PST-18, PST-19, PST-20, PST-21, "Agent loop write overlay (AGL-12; produces the pending change)"]
parallel_with: [PST-23]
unblocks: ["Graph runner phase:engine (GRR-08)", "Agent loop phase:pending-writes (AGL-15)", "Compile & export milestone gate (CEX-20)", "Graph runner output nodes (GRR-06)", "Frontend shell polish gate (SHL-19)"]
---

# PST-22 — Review gate

Merging this **closes Project store `phase:pending-review`** (requires `phase:search` closed).

## Scope
- **Extend Platform's e2e** (PLT-13): turn on the "accept change" step — accepting the agent's pending change writes the draft and creates a version under `drafts/.versions/<name>/…`.
- Verify the phase checklist on `main`.

## Acceptance criteria (the `phase:pending-review` checklist)
- [x] Propose never touches disk; same-origin fold; non-active `ok` project propose — pass.
- [x] Listing with a host edit is side-effect free.
- [x] Accept with edited content; apply with version; `base-changed` refusal; refresh clean/overlapping; accept-anyway backup; validator rejection; restore saves current first — pass.
- [x] Review queue works at phone width.
- [x] The e2e "accept change" step passes.

**M3 "done when"** (shared with the Agent loop's grounding check): *an invented statistic in a draft is flagged as unsupported.* The Project store's part is search over `sources/` and the reviewable, versioned draft the agent proposes; the grounding half is demonstrated by AGL-20, which closes after this gate.

## Demo (under 5 min)
1. In the sample, ask the agent to tighten a chapter 1 draft. A pending change appears live in the review queue on desktop and phone.
2. On the phone, open the diff and accept. Show the new draft and the previous text in `drafts/.versions/<name>/…` on the host.
3. Ask for a second edit, then edit the same paragraph on the host. The queue flags a conflict; Refresh keeps it conflicted; Reject clears it.
4. Open the draft's history and restore the first version.
