---
id: PLT-23
title: Fix the two e2e tests that fail only in the full suite on main
module: platform
phase: none
milestone: M4 (needed before GRR-15 step 13 is rerun)
blocked_by: [SHL-23]
parallel_with: []
unblocks: []
---

# PLT-23 — Full-suite e2e failures

This unit is ungated (`phase: none`), like SHL-22. Platform owns the Playwright harness (PLT-13: `e2e/playwright.config.ts`, `e2e/harness/global-setup.ts`), and the cause is in how the full run shares state, so the unit is Platform's. Everything it touches is already on `main`, so nothing blocks it. GRR-15's step 13 (full e2e with zero failures) waits for it, per the user's decision of 2026-11-19 (option (b)); `unblocks` stays empty because GRR-15's unit file does not name it.

## Why
On main at cc82fb0, `npm run e2e -w @bbartolome/scriba-e2e -- --trace off` exits 1 with 2 failed and 22 passed (`plans/DECISIONS.md`, 2026-11-19, "GRR-15 — Step 13 failures verified on main cc82fb0"):

- `e2e/specs/journey.e2e.ts` "journey: setup, project from sample, agent run, accept change, manuscript › project from sample": `expect(received).toEqual(expected)` (deep equality).
- `e2e/specs/tools-preview.e2e.ts` "TRG-05 C2: the picker offers person entities only and takes a dropped person chip": `expect(locator).toHaveValue(expected)`.

Each spec passes when run alone. The full run has one worker, one API on port 8080 and one temp library (`SCRIBA_E2E_LIBRARY`) that `global-setup.ts` creates once for every spec, so specs that write to the library or change server state (active project, settings, user packs) can affect specs that run after them. The cause is order or shared state in the full run, not the code of any unit.

Criterion 3 also needs SHL-23 on main (the Navigator decision of 2026-11-19; plans/DECISIONS.md).

## Decisions
- Find the actual cause first (which earlier spec, and which state it leaves behind), and record it in the plan before any change.
- Fix the isolation, not the assertion: for example, a spec cleans up or resets the state it changes, a spec sets up the state it relies on, or the harness gives specs the isolation they need. The plan chooses the smallest fix that removes the dependency on order.
- If the cause is a real product bug that the order exposes, the plan records it and the fix goes where the bug is, named in the plan.

## Scope
- The specs in `e2e/specs/` and, if needed, `e2e/harness/global-setup.ts` and `e2e/playwright.config.ts`.
- Not: GRR-15's code, any change to what the two tests check, or other flakes not seen in the full run above.

## Acceptance criteria (test seam: Playwright, `npm run e2e -w @bbartolome/scriba-e2e -- --trace off`)
- [x] The cause of each failure is named in the plan (the earlier spec and the state it leaves), with the evidence.
- [x] In the full suite run, both tests pass: journey "project from sample" and tools-preview "TRG-05 C2".
- [x] The full run exits 0 with 0 failed, on a fresh checkout of the branch, and each of the two specs still passes when run alone.
- [x] No test is weakened, skipped or given a longer timeout just to pass: every `expect(...)` and every test title in the two specs is unchanged, no `test.skip`, `test.fixme` or `test.only` is added, no timeout is raised, and no retries are added in `playwright.config.ts`.
- [x] The root `npm test` exits 0.
