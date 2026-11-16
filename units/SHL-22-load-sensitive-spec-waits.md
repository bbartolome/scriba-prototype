---
id: SHL-22
title: Explicit wait timeouts in the specs that wait on a lazy load or an async settle
module: shell
phase: none
milestone: M1
blocked_by: []
parallel_with: []
unblocks: []
---

# SHL-22 — Load-sensitive spec waits

This unit is ungated (`phase: none`), like SHL-21 and AGL-25. It changes tests only. Every spec it touches is already on `main`, so nothing blocks it.

## Why
`landing.spec.ts` C1 and E1 waited on a lazy load with `vi.waitFor` at its 1000 ms default. Under CPU load the first wait timed out and C1 failed with "expected '/' to be '/setup'". Commit 1f1e234 (`fix(SHL-08)`) gives every wait there a 5000 ms timeout and raises the two tests' own timeouts to 20000 and 10000 ms; no assertion changed. REPORTED (the subagent run recorded in the 2026-11-15 correction entries of `plans/DECISIONS.md`): under load C1 failed 4 of 6 runs before the fix and passed 6 of 6 after, and the full `apps/web` suite passed (325 of 325). That flake held the step 3 checks of GRR-01 and AGL-05.

The same pattern is still in other specs. A grep of `vi.waitFor(` in every workspace that runs under the root `npm test` (`packages/contracts`, `apps/api`, `apps/web`, `packages/packs`, `e2e`), checked call by call at 1f1e234, finds these calls with no `timeout` option (default 1000 ms):

| File | Lines | What the wait covers |
|---|---|---|
| `apps/web/src/app/shell/project-route.spec.ts` | 88, 95, 98, 107, 129, 140, 151, 169, 175, 186, 192, 199, 210, 215, 222, 239, 245, 257, 263, 266, 274 (21 calls, 8 tests, one of them run twice by `it.each`) | Router navigation through `APP_ROUTES` to the lazy switch page and the lazy feature routes (`app.routes.ts` lines 20, 33, 48, 54, 72), then the page's render. The nearest sibling of the landing spec |
| `apps/web/src/app/shell/api-client.spec.ts` | 182 | T7: the 401 interceptor's navigation to `/setup` settles (the test route is not lazy; the wait is the async navigation) |
| `apps/web/src/app/shell/connection-status.spec.ts` | 162, 171 | The health probe's fetch stub settles, then the banner shows or clears (no lazy load; a macrotask chain) |
| `apps/api/test/providers-client-timeout-abort.test.ts` | 70, 117, 207 | The mock server records that the client closed the stream (`closedByClient`) |

Checked and not on the list:
- Calls that already carry a timeout: `apps/web/src/app/core-gate.spec.ts:48` (5000), `shell/landing.spec.ts` (1f1e234), `features/setup-auth/setup-page.spec.ts` (127, 217, 506; 5000), `features/setup-auth/settings-page.spec.ts` (147, 247, 262, 279; 5000), `shell/connection-status.spec.ts` (234, 246; 3000 and 4000), `e2e/fixtures/mock-openai/test/mock-openai.test.ts` (379, 436, 460).
- `apps/web/src/app/shell/notices.spec.ts:91` has an explicit `{ timeout: 1000 }`. It waits for a snackbar to close, not for a load, and its timeout equals the default. It is noted here and not changed.
- Local polling helpers with their own deadline: `apps/api/test/events-backpressure.test.ts` (`waitFor(condition, ms, what)`, 20000 and 2000), `apps/api/test/agent-loop-stop.test.ts` (`waitForRecords` 5000, `waitForClosed` 2000), `apps/api/test/invariant-sweep.ts` (`waitForBlock` 5000).
- The Playwright specs in `e2e/specs/` run under `npm run e2e`, not `npm test`, and use Playwright's own timeouts. `packages/contracts` and `packages/packs` have no `vi.waitFor`.
- Specs that load a lazy route and rely on `whenStable()` or the router's own tracking (`sample-chat.spec.ts`, `template-feature.spec.ts`, `project-picker.spec.ts`, `device-gate.spec.ts`) have no `vi.waitFor` and are not in this unit.

REPORTED, not a red test: a first load check at 1f1e234 (12 CPU-burning `node -e 'for(;;){}'` loops on a 6-core machine, three runs of `project-route.spec.ts`, `api-client.spec.ts` and `connection-status.spec.ts` together) passed all 24 tests each time. The three web specs are therefore sensitive by construction (a lazy load or async settle against a 1000 ms default), not shown to fail at that load. The load check below needs a heavier load to show a difference.

## Decisions
- Test-only change. No source file changes (`landing.ts`, the switch page, the API client and the providers client are correct as they are), and no assertion is touched.
- Each listed `vi.waitFor` gets `{ timeout: 5000 }`, the value 1f1e234, `setup-page.spec.ts`, `settings-page.spec.ts` and `core-gate.spec.ts` already use. A spec with many calls declares the option once as a named constant (as `LOAD_WAIT` in `landing.spec.ts`) and passes it to each call.
- Where the runner's default test timeout is shorter than the sum of a test's waits, the test also gets its own timeout, as 1f1e234 did (20000 for the test with three waits, 10000 for the one with one). The web tests run under `ng test` (`@angular/build:unit-test`), which sets no `testTimeout` in `apps/web/angular.json`; the values are chosen in this unit's plan. `apps/api/vitest.config.mts` already sets `testTimeout: 20000`, so the API spec needs no test-timeout change.
- A wait whose purpose is to show that something does not happen within the window is not lengthened. None of the listed calls is of that kind (each waits for something to appear, settle or close).

## Scope
- `apps/web/src/app/shell/project-route.spec.ts`, `apps/web/src/app/shell/api-client.spec.ts`, `apps/web/src/app/shell/connection-status.spec.ts`.
- `apps/api/test/providers-client-timeout-abort.test.ts`. This is the one file outside `apps/web`. It belongs to Model providers (MPR-04); it is in this unit because the change and the load check are the same, and the fix is the same one argument.
- Nothing else. In particular not `notices.spec.ts`, the specs that already carry timeouts, the polling helpers, the Playwright specs, or any sleep (`setTimeout`) used to yield a macrotask.

## Acceptance criteria (test seam: Vitest, `ng test` for the web specs and `vitest run` for the API spec)
- [x] Every call listed in the table above has an explicit wait timeout consistent with 1f1e234 (5000 ms), and a test whose waits can add up past the runner's default has its own raised timeout. After the change, a check of every `vi.waitFor(` call in `apps/web/src`, `apps/api/test` and `e2e` (multi-line calls included) finds none without a `timeout` option.
- [x] No assertion is removed, skipped or weakened: the diff changes only the wait-options arguments, the constant that holds them and the tests' own timeout arguments; every `expect(...)` and every `it`/`test` title is unchanged; no `it.skip`, `it.todo` or `describe.skip` is added.
- [x] The full suite passes: `npm test` at the repository root exits 0 (the web suite and the API suite included).
- [x] The load check passes: each of the four spec files, run alone six times while CPU-burning loops run (at least twice as many `node -e 'for(;;){}'` processes as cores, started before the first run and stopped after the last), passes every run. The web specs run with `npm test -w @bbartolome/scriba-web -- --include=<path relative to apps/web>`, the API spec with `npx vitest run test/providers-client-timeout-abort.test.ts` in `apps/api`. The plan picks a load heavy enough that the unfixed waits are seen to fail, or records that no load tried reproduced a failure.
