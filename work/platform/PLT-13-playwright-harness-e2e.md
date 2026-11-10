---
id: PLT-13
title: Playwright harness, single e2e journey with five placeholder steps, e2e in CI
module: platform
phase: phase:test-harness
milestone: M1
blocked_by: [PLT-11, PLT-12]
parallel_with: [PLT-14, PLT-15]
unblocks: [PLT-20, "phase:test-harness gate for other modules"]
---

# PLT-13 — Playwright harness and e2e

Merging this (with PLT-12) **closes `phase:test-harness`**.

## Why
Module builders turn on their journey step at their milestone instead of writing a harness (story 40).

## Decisions
- The harness builds the web bundle, starts the API (serving that bundle on one origin, so no dev origins needed) against a temp library, starts the mock OpenAI server, then waits for `/healthz`.
- The harness does **not** configure a model provider: the "agent run" step does that through the Model providers API, pointing a provider at a mock scenario URL.
- **One e2e test with five named steps:** setup → project from sample → agent run → accept change → manuscript. Only the harness, the boot and an **app-loads check** are live here; the five steps are placeholders (reported as pending/skipped).
- Owners turning steps on: Setup & auth (setup), Project store (project from sample), Agent loop (agent run), Project store review (accept change), Compile & export (manuscript). A module whose phase "extends the e2e" adds its step in that phase if `phase:test-harness` has closed, otherwise in the first PR after it closes; the module's phase is not blocked on the harness.
- **Export stays out of the e2e.** Engine-level export is checked by the image smoke jobs (PLT-19).
- Use the pre-installed Chromium; run with `--trace off` by default, retain traces on failure in CI.
- `npm run e2e` script at the root.

## Scope
- `e2e/` Playwright config, harness global setup/teardown, the journey spec with placeholders, `npm run e2e`, and an `e2e` step appended to the single `ci.yml` job (after build) that uploads Playwright traces on failure.

## Acceptance criteria
- [ ] `npm run e2e` boots the app against a temp library and the mock server, passes the app-loads check, and reports the five journey steps as pending.
- [ ] CI runs the e2e and uploads Playwright traces on failure.
- [ ] Each placeholder step is a clearly named, independently enable-able block with a comment naming its owning module and milestone.
