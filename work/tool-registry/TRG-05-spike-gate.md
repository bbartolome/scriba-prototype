---
id: TRG-05
title: Form-renderer spike gate — dev preview route, running-app check, spike note
module: tool-registry
phase: phase:form-renderer
milestone: M2
blocked_by: [TRG-02, TRG-03, TRG-04, "Project store phase:files (PST-12) for the running-app picker"]
parallel_with: [TRG-06, TRG-08]
unblocks: [TRG-07]
---

# TRG-05 — Spike gate

Merging this **closes Tool registry `phase:form-renderer`**.

## Scope
- A **dev preview route** on the Tools page (`/tools`, registered with one Shell route-table entry) that loads the cold-open fixture from the API and shows both layouts side by side, with submit → validate.
- A short **spike note** (in `docs/adr/` or the module docs) recording any hint the workhorse needed that the vocabulary lacks. Any vocabulary change is made through expand–contract in `/tool-registry` **before** `phase:loader-validation` closes (lint builds on it).

## Acceptance criteria (spike: one workhorse tool rendered end to end)
- [ ] In the running dev app, one API response for the cold-open fixture drives both a full form and a node body; the node body shows typed ports for the `entity`, `text` and `style` fields marked as ports, and the remaining controls as `params`.
- [ ] The entity picker offers only entities of the fixture's kind (e.g. `person`) and accepts a dropped entity chip.
- [ ] Submitting sends the arguments to `validate`: missing required fields and wrong enum values show readable messages inline; a valid submit shows the arguments with defaults applied.
- [ ] The emitted function schema has no `x-` key and passes the draft-07 meta-schema.
- [ ] The spike note is committed.
