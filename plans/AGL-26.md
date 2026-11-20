---
id: AGL-26
status: done
---
# AGL-26 plan — research on, no endpoint: only `fetch_page` is offered

Unit `units/AGL-26-research-no-endpoint.md` (module Agent loop, phase:research, M7). Planned on `main` at 1baa7c7, clean tree. Revision 1, planner. Revision 2, reviser, checked on `main` at 4d9cd06 (the commit that adds this plan). Corrections of revision 2: the three open points are settled (section 6); the test's imports and its type-check gate are stated (P4, step 5); mutation M1 names the exact lines to replace; section 8 lists each step and test. No unit change. The unit's one note (line 14) records the split from AGL-21 (commit a44b9cf, 2026-11-20). The criterion (line 22) is word for word the old criterion 2 of AGL-21, which AGL-21's unit keeps at line 25.

## 1. Decisions this plan follows

Settled by the unit, the module, the README and the blockers:

- **Research switch.** `agent.research.enabled` defaults to `false`; with it off, no research tool is offered. Source: unit line 17 (copied from AGL-21's first bullet, `units/AGL-21-web-search.md` line 18); `packages/contracts/src/agent-loop/settings.ts` line 11; `apps/api/src/modules/agent-loop/agent-runs.service.ts` lines 77 to 79 (the research family is added only when enabled).
- **`web_search` needs an endpoint.** It is offered only when research is on **and** `searchEndpoint` is set; there is no default endpoint. Source: unit line 18 (copied from AGL-21's second bullet, AGL-21 unit line 19); `settings.ts` line 21 (`searchEndpoint` optional, no default); `apps/api/src/modules/agent-loop/agent-tools.service.ts` lines 121 to 127 (the push requires family `research` and `searchEndpoint !== undefined`).
- **`fetch_page` needs only research.** It is offered whenever research is on, and no endpoint is involved. Source: unit line 19 (copied from AGL-22's first bullet, `units/AGL-22-fetch-page.md` line 18); `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` line 420 (`fetchPageDefinition(fetchPolicy)` in the built-in list); `tools/fetch-page.ts` line 325 (family `research`); `apps/api/src/modules/agent-loop/tools/tool-run.ts` lines 89 to 91 (a tool is offered only when its family is enabled).
- **Names.** `web_search` and `fetch_page` are reserved built-in names of family `research`: `packages/contracts/src/agent-loop/constants.ts` lines 12, 38 and 39. No contract change.
- **Test seam.** External behaviour only, through the composed app and the mock model. The assertion reads the tool list the mock received. Source: `modules/agent-loop.md` lines 61 to 63.

Small decisions the planner makes (simplest option; recorded here, not in `plans/DECISIONS.md`):

- **P1. No production change.** The behaviour is on `main`: AGL-21 (`74b107a`, status done), AGL-22 (`834fb5c`, `025ab14`), AGL-23 (`9f3f304`) and AGL-24 (`ea878e1`) are merged. The criterion is verified by one new test. Nothing under `apps/api/src` changes.
- **P2. One new test file.** `apps/api/test/agent-loop-research-no-endpoint.test.ts`, with one `it`. Its name starts `AC1:`, the unit's own numbering (the unit has one criterion; the criterion was number 2 in AGL-21). The file name follows the unit slug.
- **P3. Reading of "only".** Settled by the reviser (open point 1, section 6): among the research family's names, only `fetch_page` is in the tool list, and the other families are not asserted. This is the reading AGL-23's P4 used.
- **P4. Helpers copied, not exported.** `withStream` (`apps/api/test/agent-loop-fetch-page.test.ts` lines 111 to 121), `enableResearch` (lines 146 to 151) and `toolNamesOf` (lines 154 to 156; the same body as `agent-loop-research-gate.test.ts` lines 161 to 163). `RESEARCH_NAMES` as in `agent-loop-web-search.test.ts` line 39. The test uses no kit and no stub, because no fetch or search runs in it. Imports: `expect` and `it` from `vitest`; `AGENT_SETTINGS_ROUTE` from `@bbartolome/scriba-contracts/agent-loop`; `observe`, `openHarness`, `post`, `readUntilEnded`, `requestsOf`, `startRun`, `type ChatBody` and `type Harness` from `./agent-loop-transcript.kit`; `type Observer` from `./invariant-sweep` (the same import lines as `agent-loop-fetch-page.test.ts` lines 1 to 39, without the names this test does not use). No unused import: `npm test` type-checks `test/` (`apps/api/package.json` line 6, `tsc --noEmit -p tsconfig.json`, which includes `test`), and `eslint` reports unused names.
- **P5. Duplicate coverage stays.** The same fact is already asserted by `apps/api/test/agent-loop-run.test.ts` (comment at line 385; the research-on list with `fetch_page` and no `web_search`, `fetch_page` at line 399) and by AGL-22's decision test D4 (`agent-loop-fetch-page.test.ts` lines 482 to 507). This plan changes neither (open point 3, settled by the reviser).
- **P6. Commit message.** `test(AGL-26): research on without endpoint offers only fetch_page`.

## 2. Files to create or change

Only this path changes in the implementation.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/test/agent-loop-research-no-endpoint.test.ts` | new | One test, AC1 (section 4). Helpers copied per P4. |

Unchanged on purpose: all of `apps/api/src` (P1); `apps/api/test/agent-loop-run.test.ts`, `agent-loop-fetch-page.test.ts`, `agent-loop-transcript.kit.ts` and `agent-loop-fetch.kit.ts` (P5 and the shared kits); `units/`, `modules/`, `plans/DECISIONS.md` and `plans/QUEUE.md`. The planner writes only `plans/AGL-26.md`.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`. Create branch `unit/AGL-26` from `main` in a worktree: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/AGL-26 -b unit/AGL-26 main`. Record `node -v` (v26.x) and `npm -v` beside each result. Do not push. Do not change `units/`, `modules/` or `plans/`.

1. **Install and build.** In the worktree: `npm ci`, then `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Expected: exit 0.
2. **Baseline.** From `apps/api`: `npx vitest run test/agent-loop-*.test.ts`. Expected: every file passes. Record the file and test counts.
3. **Test file.** Create `apps/api/test/agent-loop-research-no-endpoint.test.ts` as section 4 describes, with the helpers of P4. Then `npx prettier --write apps/api/test/agent-loop-research-no-endpoint.test.ts`. Expected: the file is reported as written.
4. **Run on the code of main.** From `apps/api`: `npx vitest run test/agent-loop-research-no-endpoint.test.ts`. Expected: the test passes, because no production code changes. If it fails, stop and report the test and its output to the orchestrator. Do not change production code or the unit.
5. **Gates.** From the root: `npm run lint -w @bbartolome/scriba-api` and `npx prettier --check apps/api/test/agent-loop-research-no-endpoint.test.ts`, then `npm test -w @bbartolome/scriba-api`. Expected: each exits 0. `npm test` first runs the build, whose `tsc --noEmit -p tsconfig.json` type-checks the new test file.
6. **Agent-loop suite.** From `apps/api`: `npx vitest run test/agent-loop-*.test.ts`. Expected: the same files pass as in step 2, and the test count is the step 2 count plus 1.
7. **Scope and commit.** `git status --short` lists only the test file. `git add apps/api/test/agent-loop-research-no-endpoint.test.ts`, then commit with the message of P6. Expected: one commit on `unit/AGL-26`. Record the hash.
8. **Mutation checks.** On the committed tree, make each change below, run `npx vitest run test/agent-loop-research-no-endpoint.test.ts` from `apps/api`, record the failing assertion, and restore with `git checkout -- <path>`. Expected after each restore: `git status --short` is empty.
   - M1 (`web_search` offered without an endpoint): in `agent-tools.service.ts`, replace the four lines 122 to 125 (`if (`, `options.enabledFamilies.includes('research') &&`, `options.searchEndpoint !== undefined`, `) {`) with the one line `if (options.enabledFamilies.includes('research')) {`; on line 127 (the `definition:` line) write `definition: webSearchDefinition(options.searchEndpoint ?? ''),`. Expected: the assertion fails with `['fetch_page', 'web_search']`.
   - M2 (`fetch_page` not built in): in `tools/builtin-tools.ts`, delete line 420 (`fetchPageDefinition(fetchPolicy),`). Expected: the assertion fails with `[]`. The now unused import stays; vitest does not type-check.
   - M3 (a default endpoint): in `agent-runs.service.ts`, line 153, write `searchEndpoint: settings.research.searchEndpoint ?? 'http://127.0.0.1:9/search'`. Expected: the assertion fails with `['fetch_page', 'web_search']`.
9. **Record.** Store the Node and npm versions and each command's output with its exit code. The criterion is marked passed only when its pass condition in section 4 holds.

## 4. Acceptance criteria and tests

One criterion (unit line 22), unticked. This plan marks nothing passed. It runs in this environment with Node, the composed app and the mock OpenAI server. It needs no kit, no stub, no network, no credentials and no real model.

Test file: `apps/api/test/agent-loop-research-no-endpoint.test.ts`, with the constant `RESEARCH_NAMES = ['web_search', 'fetch_page']` (as in `agent-loop-web-search.test.ts` line 39). The test follows the shape of D4 in `agent-loop-fetch-page.test.ts` (lines 482 to 507). It closes the app in a `finally`.

| Criterion (unit line) | Test and seam | Command | Pass condition |
|---|---|---|---|
| "With research on and no endpoint, only `fetch_page` is offered." (line 22) | `AC1: With research on and no endpoint, only \`fetch_page\` is offered.` Composed app with no `modules` option, so no kit. Mock model with one scenario (name `agl26-ac1`, one step `{match: {endpoint: 'chat'}, reply: {kind: 'stream', deltas: ['Done.']}}`), opened with `openHarness`. Then `enableResearch(h)`: a `POST` to `AGENT_SETTINGS_ROUTE` with `{research: {enabled: true}}` and no `searchEndpoint`. Then `withStream`: `startRun` with intent `AGL-26 research on, no endpoint`, and `readUntilEnded`. Then `const [first] = await requestsOf(h)` (the first chat request, `ChatBody`). | from `apps/api`: `npx vitest run test/agent-loop-research-no-endpoint.test.ts -t "AC1"` | `toolNamesOf(first).filter((name) => RESEARCH_NAMES.includes(name))` equals `['fetch_page']`. The settings `POST` returns 200. The run ends (`readUntilEnded` returns). |

## 5. Downstream and parallel agreement

- **`unblocks` is `[]` (unit line 9).** No unit's `blocked_by` names AGL-26. `grep -rn "AGL-26" units/` finds AGL-21 (line 9, `unblocks`), AGL-22 (line 9, `unblocks`), the README phase row and AGL-26's own unit. Nothing downstream needs a change.
- **Later phases that use its output.** AGL-26 produces no output beyond the tool list it checks. phase:compile-tools (AGL-24, merged) names no research tool. `grep -rln "research\|web_search\|fetch_page" units/` finds AGL-01, AGL-06, AGL-07 and PLT-07, which mention research only as settings or contract, and AGL-21, AGL-22, AGL-23 and AGL-26. None is in a later phase that uses the research list.
- **AGL-21 (merged).** Provides the endpoint gate this test relies on (`agent-tools.service.ts` lines 121 to 127). Its criterion 2 is this unit's. No change.
- **AGL-22 (merged).** Provides `fetch_page` (`builtin-tools.ts` line 420). Its decision test D4 asserts the same fact. No change to D4.
- **AGL-23 (phase:research gate, merged).** Its P4 asserts no exact tool list. This test asserts only the research names, so the two cannot conflict. The gate does not wait on AGL-26 (`units/README.md` phase row, `phase:research`).
- **AGL-24 (merged).** It adds compile names to the same test lists in `agent-loop-run.test.ts`. This test filters the research names only, so AGL-24's names do not affect it.
- **Draft or planned plans.** `grep -l -E '^status: (draft|planned)' plans/*.md` gives GNP-15, CEX-20, GRR-15 and SHL-19. None names the new test file or any file of section 2. A grep of their text for `agent-loop`, `agent-tools`, `builtin-tools`, `fetch_page`, `web_search` and `apps/api/test/agent` finds only CEX-20 lines 119 and 145, which say "No overlap" or name grounding code. SHL-19 is the other unit committing to `main`; its plan names no agent-loop path. No merge order needs fixing.

## 6. Open points

All three are settled by the reviser (revision 2). None goes to the Navigator.

1. **Reading of "only" (criterion text).** Settled: option (a). Among the research names (`web_search`, `fetch_page`), only `fetch_page` is in the tool list; the other families are not asserted. Sources: the unit's decisions (lines 17 to 19) are all about the research tools, and the criterion came from AGL-21, whose criterion 1 is "no research tools" (`units/AGL-21-web-search.md` line 24); the module's assertion principle is the tool list "with research and disabled tools absent" (`modules/agent-loop.md` line 63); the code always offers the project, narrative, grounding and compile families (`agent-runs.service.ts` lines 77 to 79), and `agent-loop-run.test.ts` lines 394 to 405 show ten tools with research on, so "only" over the whole list cannot be meant. Option (b) would also repeat the run test and break whenever a family adds a name (the cause of AGL-23's P4).
2. **Phase close and the landing of AGL-26.** Settled: option (a), no change. Source: `units/README.md` line 117 already says the gate AGL-23 "does not wait on AGL-26" and that AGL-26 "lands after AGL-21 and AGL-22"; the split entry in `plans/DECISIONS.md` (line 7095) placed AGL-26 in `phase:research`. Option (b) would change the unit's `phase` front matter, which none of the reviser's four actions allows, and is not needed for a correct plan.
3. **Duplicate coverage.** Settled: option (a), keep all three. Sources: `prompt.md`, "When a plan does not work" ("Do not make an acceptance criterion or a test weaker ... Do not delete one"); D4 is AGL-22's test of its own decision (`units/AGL-22-fetch-page.md` line 18; `plans/AGL-22.md` line 117), and the run-test assertion belongs to a done unit; both files are outside this plan's file list. This is a test-structure decision, which the reviser makes.

## 7. Facts checked and facts assumed

Checked by the planner with read-only commands on `main` at 1baa7c7 (`git status` clean). The planner ran no build and no test.

Unit and planning files:
- `units/AGL-26-research-no-endpoint.md`: front matter lines 2 to 9 (`blocked_by` line 7, AGL-21 and AGL-22; `parallel_with: []` line 8; `unblocks: []` line 9); the note at line 14; decisions at lines 17 to 19, copied word for word from AGL-21 (units lines 18 and 19) and AGL-22 (line 18); criterion line 22, unticked.
- `units/AGL-21-web-search.md`: `unblocks` (line 9) names AGL-23 and AGL-26; criterion 2 moved, with its old text, at line 25.
- `units/AGL-22-fetch-page.md`: `unblocks` (line 9) names AGL-23 and AGL-26; the decision at line 18.
- `units/AGL-23-research-gate.md`: `blocked_by` (line 7) names AGL-20, AGL-21 and AGL-22, not AGL-26.
- `units/README.md` `phase:research` row (line 117): AGL-21 to AGL-23 and AGL-26; the gate is AGL-23, which does not wait on AGL-26.
- `modules/agent-loop.md` lines 61 to 64 (testing principles, the tool list assertion, research tests).
- `plans/DECISIONS.md`: the split entry at lines 7093 to 7099; the note on AGL-26 at line 7270 (AGL-23 and AGL-26 available); line 4282 (AGL-26 named as a rejected option in the AGL-10 decision). Grep for `AGL-26` found nothing else.
- `plans/QUEUE.md` line 7: AGL-26 "available: yes | all blockers done".
- Plans: `plans/AGL-21.md` (done; section 5, the AGL-26 bullet), `plans/AGL-22.md` (done; section 5 says AGL-26's test is its own file), `plans/AGL-23.md` (done; P4; section 5), `plans/AGL-24.md` (done), `plans/PLT-02.md` (the section layout used here).

Code and tests on `main`:
- `packages/contracts/src/agent-loop/settings.ts` line 11 (`research: { enabled: false }`), line 21 (`searchEndpoint` optional, no default).
- `packages/contracts/src/agent-loop/constants.ts` line 12 (`research` family), lines 38 and 39 (`web_search`, `fetch_page`).
- `packages/contracts/src/agent-loop/routes.ts` line 11 (`AGENT_SETTINGS_ROUTE`).
- `apps/api/src/modules/agent-loop/agent-runs.service.ts` lines 77 to 79 (families), line 153 (`searchEndpoint: settings.research.searchEndpoint`).
- `apps/api/src/modules/agent-loop/agent-tools.service.ts` lines 121 to 127 (the `web_search` branch).
- `apps/api/src/modules/agent-loop/tools/builtin-tools.ts` line 420 (`fetchPageDefinition(fetchPolicy)`).
- `apps/api/src/modules/agent-loop/tools/fetch-page.ts` line 325 and `tools/web-search.ts` line 39 (family `research`).
- `apps/api/src/modules/agent-loop/tools/tool-run.ts` lines 89 to 91 (family filter).
- `apps/api/test/agent-loop-run.test.ts` line 385 (comment) and line 399 (`fetch_page` in the research-on list).
- `apps/api/test/agent-loop-fetch-page.test.ts`: `withStream` 111 to 121, `enableResearch` 146 to 151, `toolNamesOf` 154 to 156, D4 482 to 507.
- `apps/api/test/agent-loop-research-gate.test.ts`: `toolNamesOf` 161 to 163.
- `apps/api/test/agent-loop-web-search.test.ts`: `RESEARCH_NAMES` line 39.
- `apps/api/test/agent-loop-transcript.kit.ts`: `openHarness` 87, `post` 149, `observe` 169, `startRun` 174, `readUntilEnded` 184, `ChatBody` 209, `chatBodies` 214, `requestsOf` 219 (chat requests in arrival order).
- Neither `apps/api/test/agent-loop-research-no-endpoint.test.ts` nor `plans/AGL-26.md` exists before this plan.

Git: the status commits of the merged units are `74b107a` (AGL-21), `025ab14` and `834fb5c` (AGL-22), `9f3f304` (AGL-23) and `ea878e1` (AGL-24).

Assumed, not checked:
- `npm ci`, the two builds and the existing suite pass in a new worktree on Node 26. Steps 1 and 2 check them.
- One single-reply run makes exactly one chat request, so `requestsOf` returns one element for the test's run. D4 relies on the same count. Not run.
- `requestsOf` returns only chat requests, in arrival order (read at `agent-loop-transcript.kit.ts` lines 214 to 219). Not run.
- The D4 and run-test assertions pass on `main` now. The AGL-22 gate passed at 766479c (DECISIONS, 2026-11-20); not rerun here.

## 8. Review parts

One part.

- **Part 1 (the whole plan).** Steps 1 to 9 of section 3, the test AC1 of section 4 (the unit's only criterion, line 22), and the mutations M1 to M3 of step 8. The reviewer checks: the diff changes only `apps/api/test/agent-loop-research-no-endpoint.test.ts`; the test matches section 4 (no kit, no stub, `enableResearch` with no `searchEndpoint`, the filter over `RESEARCH_NAMES`, the app closed in a `finally`); the helpers are copied per P4 with no unused import; AC1 passed on the code of `main`; the gates of step 5 exited 0; each mutation turned the assertion red with the expected list and each restore left `git status --short` empty.
