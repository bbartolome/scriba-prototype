---
id: AGL-20
status: done
---
# AGL-20 plan — grounding gate: the phase checklist on main

Revision 1, planner, from main at `231c698` (tree clean when the work began; `plans/SAU-21.md` is changed by another agent and is not part of this plan). Main has since moved to `e9691c3` (`docs(SAU-21)`), which changes only `plans/SAU-21.md` (F21). No fact below changes. Nothing was built, installed, tested, run or changed except this file. Only read-only commands were run. No test, `npm install`, e2e run, container or remote command was run.

Revision 2, reviser (Opus), from main at `fb55b88` (tree clean; `8f281fb` added this draft, `fb55b88` changes only the status line of `plans/SAU-21.md`, which is now `planned`). The reviser read the unit, the module, the README, the downstream units, the three other draft and planned plans, the code and tests named below, and `plans/DECISIONS.md` by the id AGL-20 (no PLAN DOES NOT WORK report for AGL-20; lines 5414 and 5420 only name it). Corrections of revision 2: the C3 claim 1 text and span (section 4.2); the fixture library's `sources/outline.md` in the no-shared-word arguments (sections 4.1 and 4.2, F22); the PST-14 line (F4); SAU-21 is `planned` (section 7, F17); open points OP1, OP5 and OP8 are settled by the reviser from the README and the module, and none is left for the Navigator (section 9); section 10, "Review parts", is new. No unit file and no module file changed. Only read-only commands were run.

Tags: **D**n is a decision this plan follows (section 1). **F**n is a fact checked by reading a file (section 8). **A**n is a fact assumed, not checked (section 8). **OP**n is an open point (section 9).

Summary. AGL-20 is the gate of Agent loop `phase:grounding` (`units/AGL-20-grounding-gate.md` line 14; `units/README.md` line 114). It changes no product code. The five criteria are already built and tested on main by AGL-16 to AGL-19. This plan adds one gate test file with two tests, for criteria 1 and 3, both through the production check route. It verifies criterion 2 with the sample test T2 of AGL-19 (path-filtered), criterion 4 with the AGL-17 test C2, and criterion 5 with the AGL-18 test G1. No criterion text changes.

## 1. Decisions this plan follows

- **D1. Criteria stay as written.** Five criteria, unit lines 17 to 21. Each has one test (section 4). Only the boxes change, in the docs commit. Source: unit lines 16 to 21.
- **D2. Gate scope.** Merging AGL-20 closes `phase:grounding`. A phase closes when its gate unit is merged (`units/README.md` line 69), and the phase row names AGL-20 as gate (README line 114). The gate waits on AGL-15, AGL-16, AGL-17, AGL-18, AGL-19 and PST-14 (unit line 7). All six are `status: done` on main (F4). Source: unit lines 7 and 14; README lines 69, 114.
- **D3. Test seam.** External behaviour only: HTTP responses, SSE events, files on disk, and the requests the mock model receives. The composed app, a temp library, and Platform's mock OpenAI server with scripted turns. No test reads `examples/`. Source: `modules/agent-loop.md` lines 61 and 62; `units/README.md` line 139; `plans/AGL-19.md` section 4.1.
- **D4. UI seam.** Criterion 5 is tested in Angular's Vitest runner against the Shell's fakes. Source: `modules/agent-loop.md` line 65. AGL-18's G1 uses the fake `stubMatchMedia(390, 844)` (F11).
- **D5. Only `sources/` grounds a claim.** The engine's retrieval scope is `['sources']` (grounding-engine.ts line 112). Source: `modules/agent-loop.md` line 56.
- **D6. Artefact path rule.** `logs/grounding/<targetPath>.json`, with the three constants of the contract. Source: `modules/agent-loop.md` lines 54 and 82; `packages/contracts/src/agent-loop/constants.ts` lines 82 to 86.
- **D7. The full e2e suite is not run.** Every e2e command carries a path filter. The full suite fails on main at `e2e/specs/tools-preview.e2e.ts:167` (`TRG-05 C2`), recorded in `plans/DECISIONS.md` line 5506 (F13). Source: task rule; DECISIONS line 5506.
- **D8. The gate tests call the production route.** `POST /api/agent-loop/grounding` exists on main (F7). The AGL-16 test kit is test-only, and AGL-17 retires its use in favour of the real route. Source: `plans/DECISIONS.md` line 5420 (2026-11-16, AGL-16 Navigator decision); `plans/AGL-17.md` line 303 (section 7, point 3).
- **D9. A gate file copies its helpers.** It does not import a helper from another test file. Source: `plans/AGL-15.md` line 32 (D7), which made `agent-loop-pending-writes-gate.test.ts` the same way.
- **D10. No new e2e spec.** A new spec in the shared e2e library must sort after `verdicts-sample.e2e.ts`, or it changes the order the journey depends on. AGL-20 adds none, so the rule is not triggered. Source: `plans/AGL-19.md` line 28 (D-ORDER); `e2e/specs/verdicts-sample.e2e.ts` lines 6 to 8.
- **D11. Mock, not a live model.** The sample check runs against the scripted `grounding-claims` scenario. Real models are not in the gates. Source: `modules/agent-loop.md` line 67; `plans/AGL-19.md` section 4.2.
- **D12. No assertion is weakened.** Existing tests keep their assertions. A new test asserts only what its criterion says. Source: `plans/AGL-15.md` section 4, step 4 (line 72: "Do not weaken an assertion").

## 2. Files to change

| Path | Change | Why |
|---|---|---|
| `apps/api/test/agent-loop-grounding-gate.test.ts` | new | The two new gate tests, C1 (criterion 1) and C3 (criterion 3), through `POST /api/agent-loop/grounding` on the composed app with the mock. |
| `units/AGL-20-grounding-gate.md` | ticks only, in the docs commit after review | Lines 17 to 21: `- [ ]` becomes `- [x]`. No text changes (the AGL-15 precedent). |
| `plans/AGL-20.md` | status only, in the docs commit | `status: done`. |

Not changed, on purpose:
- `apps/api/src/modules/agent-loop/**`. The engine, the run, the route and the summary already do the checks (F6, F7).
- `apps/api/test/agent-loop-grounding.test.ts`, `agent-loop-grounding-wiring.test.ts`, `agent-loop-grounding.kit.ts`, `agent-loop-transcript.kit.ts`. The tests G1 and C2 are named, not copied (OP3).
- `e2e/**`. T2 is AGL-19's test, unchanged, and no spec is added (D10).
- `e2e/fixtures/mock-openai/**`, `examples/**`. The sample and its scenario are contracts of AGL-19 (`plans/AGL-19.md` section 1).
- `apps/web/**`. G1 is AGL-18's test.
- `packages/contracts/**`, `package.json`, `package-lock.json`.
- `units/CEX-06-claims-orphans-checks.md` and every other unit file (OP1).
- `plans/DECISIONS.md`. Only the orchestrator writes it.

## 3. Procedure

Run from the repository root in a worktree of `main`, on branch `unit/AGL-20`. Do not push. Stage explicit paths only. Record `node -v` (expected `v26.x`; `v26.13.0` on this machine, F20) and `npm -v` (expected `11.20.0`, F20) with each result.

**Step 0. Worktree.** `git worktree add -b unit/AGL-20 <path> main`. Expected: `git status --short` prints nothing, and `git log --oneline -1` prints the main head.

**Step 1. Install and build.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: both exit 0. The API tests import the contracts from `dist`.

**Step 2. Baseline of the tests the gate names.** From the root, `npm test -w @bbartolome/scriba-api -- agent-loop-grounding`. The filter matches G1 to G4 (AGL-16), and C1, C2, C2b, X1 to X4 (AGL-17). Expected: every test passes; record the counts. If one fails, stop and report. The gate cannot pass on a broken base.

**Step 3. Write the new test file.** Create `apps/api/test/agent-loop-grounding-gate.test.ts` with the two tests C1 and C3 of section 4.1. Name the plan in the header comment. Copy the helpers the tests need from `apps/api/test/agent-loop-grounding-wiring.test.ts` (the fixture writer of lines 48 to 57, `extractStep` and `judgeStep` of lines 60 to 72, `resultOf` and `artefactOf` of lines 126 to 139, `lastTextOf` of lines 142 to 145), and adapt them. Do not import them (D9). Each test has its own scenario name (`agl20-c1`, `agl20-c3`), opens its own harness with `openHarness({scenario, steps, prepare})` (`apps/api/test/agent-loop-transcript.kit.ts` lines 65 to 72 and 87), calls `observe(h)` before the POST, and closes the harness in `finally`. Expected: one new file with two tests.

**Step 4. Run the new file.** `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-gate`. Expected: 2 tests passed. If one fails, report its assertion. Do not weaken it.

**Step 5. Mutation check (evidence, not committed).** The two tests must fail when the rule they guard is broken. In `apps/api/src/modules/agent-loop/grounding-engine.ts`:
- (M1) line 234: change `verdict: 'unsupported',` to `verdict: 'supported',`. Run `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-gate -t "C1 an invented"`. Expected: C1 fails. Revert with `git checkout -- apps/api/src/modules/agent-loop/grounding-engine.ts`.
- (M2) line 247: change `if (retrieved === undefined) {` to `if (false) {`. Run `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-gate -t "C3 a verdict"`. Expected: C3 fails. Revert with the same `git checkout --`.
Then `git status --short` prints nothing. If a mutation survives, the test is too weak: report it, do not change the criterion.

**Step 6. Format and lint.** `npx prettier --write apps/api/test/agent-loop-grounding-gate.test.ts`, then `npx prettier --check apps/api/test/agent-loop-grounding-gate.test.ts` and `npm run lint -w @bbartolome/scriba-api`. Expected: each exits 0.

**Step 7. Criterion 2, the sample check.** From the root, `npm run e2e -w @bbartolome/scriba-e2e -- specs/verdicts-sample.e2e.ts`. The `--` passes the path filter to `playwright test` (AGL-15 step 6 precedent, `plans/AGL-15.md` line 76). Expected: exit 0, and the list reporter shows `grounding-claims: the draft yields all three verdicts, and each supported or weak verdict cites a retrieved sources passage` as passed. The harness builds the three workspaces itself (`e2e/harness/global-setup.ts` lines 60 to 72). If Playwright cannot find a browser, set `SCRIBA_E2E_CHROMIUM=/usr/bin/chromium-browser` first (`e2e/playwright.config.ts` line 24). Never run `npm run e2e` without a path (D7).

**Step 8. Criterion 4, the artefact.** `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-wiring -t "C2 the on-demand"`. Expected: 1 test passed, the others skipped.

**Step 9. Criterion 5, the badges.** `npm test -w @bbartolome/scriba-web -- --include src/app/features/agent-loop/chat-page.spec.ts`. Expected: exit 0, and G1 (`G1 at phone width ...`) passes with the rest of the file. The `--include` form is the precedent of `plans/AGL-09.md` line 148.

**Step 10. API suite.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. The total is the total of step 2 plus two, and no test fails.

**Step 11. Root gates.** From the root, `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0. The root test runs every workspace; the root lint runs `prettier --check .`.

**Step 12. Code commit.** `git add -- apps/api/test/agent-loop-grounding-gate.test.ts`, then `git commit -m "test(AGL-20): gate tests for the grounding checklist" -- apps/api/test/agent-loop-grounding-gate.test.ts`. The prefix `test(AGL-20)` follows the main history (`test(AGL-15)` in `plans/DECISIONS.md` line 5592). Expected: one commit on `unit/AGL-20`.

**Step 13. Docs commit (orchestrator, after review).** Tick the five boxes of `units/AGL-20-grounding-gate.md` (lines 17 to 21) and set `plans/AGL-20.md` to `status: done`. Commit with `docs(AGL-20): mark the acceptance criteria and set the plan to done`, with `git commit -- units/AGL-20-grounding-gate.md plans/AGL-20.md` only.

**Step 14. Verify on main (orchestrator, after the merge).** Run steps 4, 7, 8 and 9 on main. Expected: all pass. This closes `phase:grounding`.

## 4. Acceptance criteria and tests

One test per criterion, five in all. Two are new (C1 and C3). Three are existing tests on main that cover their criterion; the gate runs them with the commands below. None of the five is weakened. The criterion text is quoted from the unit.

| Criterion (unit line) | Test file | Test name | Command (cwd) | Pass condition |
|---|---|---|---|---|
| 1. "Done when an invented statistic in a draft is flagged as unsupported." (17) | `apps/api/test/agent-loop-grounding-gate.test.ts` (new) | `C1 an invented statistic in a draft is flagged as unsupported by the check route, and no model call covers it` | `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-gate -t "C1 an invented"` (root) | Section 4.1. |
| 2. "A check of the sample grounding-claims draft yields at least one claim of each verdict, and every supported or weak verdict cites a retrieved `sources/` passage." (18) | `e2e/specs/verdicts-sample.e2e.ts` (existing, unchanged; AGL-19's T2) | `grounding-claims: the draft yields all three verdicts, and each supported or weak verdict cites a retrieved sources passage` (line 84) | `npm run e2e -w @bbartolome/scriba-e2e -- specs/verdicts-sample.e2e.ts` (root) | The test passes. Its step 9(a) (lines 193 to 197) asserts all three verdicts. Its step 9(b) (lines 199 to 230) asserts that each supported or weak claim cites a `sources/` passage that is listed in the judge request for that claim. |
| 3. "A verdict citing a passage that wasn't retrieved is downgraded to `unsupported`." (19) | `apps/api/test/agent-loop-grounding-gate.test.ts` (new) | `C3 a verdict citing a passage that was not retrieved is downgraded to unsupported by the check route, and a verdict on a retrieved passage stays` | `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-gate -t "C3 a verdict"` (root) | Section 4.2. |
| 4. "The claims artefact matches the contract and carries the draft's content hash." (20) | `apps/api/test/agent-loop-grounding-wiring.test.ts` (existing, AGL-17) | `C2 the on-demand endpoint answers a start reply, runs only the check, and writes the artefact` (line 220) | `npm test -w @bbartolome/scriba-api -- agent-loop-grounding-wiring -t "C2 the on-demand"` (root) | The artefact at `logs/grounding/drafts/ch01.md.json` parses with `groundingResultSchema`, equals the `grounding-result` event (`seq` aside), sits at the path rule of the constants, and its `contentHash` is `sha256:` plus the SHA-256 of the draft's text (lines 245 to 258). |
| 5. "Badges render with text labels at phone width." (21) | `apps/web/src/app/features/agent-loop/chat-page.spec.ts` (existing, AGL-18) | `G1 at phone width the summary chip shows text labels, and the claim list is collapsed until the chip is tapped` (line 665) | `npm test -w @bbartolome/scriba-web -- --include src/app/features/agent-loop/chat-page.spec.ts` (root) | At 390 by 844 (`stubMatchMedia(390, 844)`, line 667) the chip reads `1 supported · 1 weak · 1 unsupported`, `aria-expanded` is `false`, and no claim item is shown. After the tap, the three badges' `span.label` texts are `Supported`, `Weak` and `Unsupported`, the icon check follows (the labels are asserted at lines 716 to 720; the `aria-hidden` icons at lines 722 and after). |

### 4.1 C1: the invented statistic (criterion 1)

- Scenario `agl20-c1`. Fixture (`prepare`): `sources/notes.md` is `Harbour traffic doubled in 1900.\n`; `drafts/ch01.md` is `Harbour traffic doubled in 1900. Zarquon quasars rose 97 percent.\n`. Create the folders with `mkdirSync(..., { recursive: true })`.
- Mock steps, listed first: extract, returning the claims `Harbour traffic doubled in 1900.` (span 0 to 32) and `Zarquon quasars rose 97 percent.` (span 33 to 65); judge, returning one verdict, for claim 0 only: `supported`, citing `sources/notes.md` at offset 0, reason `The notes say so.`.
- Request: `observe(h)`, then `post(h, AGENT_GROUNDING_ROUTE, { path: 'drafts/ch01.md' })`. Expected status 200, and the body parses with `agentStartResponseSchema`. Then `readUntilEnded(stream)`.
- Assertions:
  - (a) The `grounding-result` event, parsed with `groundingResultSchema`, has claim 0 `supported` with `passage.path` `sources/notes.md`. Claim 1 has `text` `Zarquon quasars rose 97 percent.`, verdict `unsupported`, and no `passage` key.
  - (b) The artefact at `logs/grounding/drafts/ch01.md.json` parses with `groundingResultSchema` and equals the parsed event result.
  - (c) `requestsOf(h)` holds exactly one request whose last message contains `Task: judge claims.`. That request contains `Claim 0: Harbour` and does not contain `Zarquon`. The invented statistic never reaches the model.
- Why this is the criterion. The claim shares no word with any file in `sources/`: the fixture's `sources/notes.md` and the library's own `book/sources/outline.md` (`# Outline`, `apps/api/test/project-store-projects.kit.ts` line 48; F22) (the query is the claim's words joined with `OR`, `apps/api/src/modules/project-store/search-index.ts` lines 111 to 118, and the search covers `sources/` only, grounding-engine.ts line 112). So no passage is retrieved and the claim is `unsupported` by the engine's rule, without a model call (grounding-engine.ts lines 233 to 234 and 122 to 124).

### 4.2 C3: the downgrade on the route (criterion 3)

- Scenario `agl20-c3`. Fixture: `sources/notes.md` is `Harbour traffic doubled in 1900.\n`; `sources/other.md` is `Unrelated oats and barley.\n`; `drafts/ch01.md` is `Harbour traffic doubled in 1900.\n`.
- Mock steps, listed first: extract, returning `Harbour traffic doubled in 1900.` (span 0 to 32) and `Harbour traffic doubled` (span 0 to 23, the exact text of the draft at that span; revision 2 corrected the draft's `Harbour traffic doubled.` with span 0 to 24, which is not the draft's text there. The engine does not check spans, grounding-engine.ts line 232, so this is a correctness fix of the fixture, not of the result); judge, returning claim 0 `supported` citing `sources/other.md` at offset 0, and claim 1 `supported` citing `sources/notes.md` at offset 0.
- Request and reply as in 4.1.
- Assertions:
  - (a) Claim 0 is `unsupported` with no `passage` key. `other.md` was not retrieved for claim 0, since the claim's words (`harbour`, `traffic`, `doubled`, `in`, `1900`) and the words of `Unrelated oats and barley.` have no word in common, so the retrieval of claim 0 holds `sources/notes.md` only (`sources/outline.md`, `# Outline`, shares no word either; F22). The cited passage is not among the retrieved ones (grounding-engine.ts lines 240 to 249).
  - (b) Claim 1 stays `supported`, with `passage` `sources/notes.md` at offset 0 (retrieved for claim 1; assumption A7).
  - (c) The artefact equals the parsed event result, as in 4.1 (b).
  - (d) `requestsOf(h)` holds exactly one judge request.

## 5. Criteria this environment cannot test

None of the five criteria needs a live model, CI, Docker, a tailnet, a real phone or real credentials. All five are tested in this environment. The sample check runs against the mock (D11, OP8).

Criterion 5 and the real browser (revision 2, OP5). Criterion 5 is not a criterion that this environment cannot run. The unit's criteria heading, "(the phase checklist)", names no test seam, so the module's default UI seam applies (`units/README.md` line 57; `modules/agent-loop.md` line 65: Angular's Vitest runner against the Shell's fakes). G1 renders the chat route at 390 by 844 through `stubMatchMedia` and asserts the three text labels. The chip has no width rule that a real viewport could change: `apps/web/src/app/features/agent-loop/grounding-chip.ts` has no `@media` rule and no `matchMedia` call, and its template always renders `span.label` (line 121; F23). So a real-browser run at 390 px would assert nothing that G1 does not. The criterion is not weakened: its text is unchanged and its test asserts labels at phone width. What no automated test does is the demo on a real phone (section 5, last paragraph): that is a manual demo step, not a criterion. The e2e harness starts the API and the mock as local processes and builds the workspaces itself (`e2e/harness/global-setup.ts` lines 20, 31 and 60 to 85). No container is involved.

Checked here, by reading only (F20): Node `v26.13.0` and npm `11.20.0`; the root `node_modules` is present (376 entries); Angular `22.2.5` whose unit-test builder accepts `include` (the `--include` form is used by a web step); the e2e browser revision of the root `playwright-core` is `1254`, and `~/.cache/ms-playwright/chromium-1254` and `/usr/bin/chromium-browser` both exist.

Not checked here. The implementer confirms them before the steps that need them (assumptions A1 to A3):
- `npm ci` in a fresh worktree needs the npm registry.
- Port 8080 is free when the e2e starts (`e2e/harness/global-setup.ts` line 20 fails if it is not).
- Playwright's default lookup finds `chromium-1254`. If not, `SCRIBA_E2E_CHROMIUM` names the cached browser (`e2e/playwright.config.ts` line 24).

Demo items that no criterion covers, and that this environment cannot show: the tap on Check grounding on a real phone, and expanding a claim to open its source there (`units/AGL-20-grounding-gate.md` lines 23 and 24). They are manual. The rendering they show is covered in Vitest by AGL-18 G1 and G2 (OP5 and OP6).

## 6. Agreement with downstream units and the phase gate

- **AGL-23, research gate (`units/AGL-23-research-gate.md` line 7).** It is blocked by AGL-20, so it starts after this gate. Its criterion 4 (line 20: fetched text is never grounding evidence until it is accepted into `sources/`) depends on the retrieval scope `['sources']` (grounding-engine.ts line 112; `modules/agent-loop.md` line 56). AGL-20 leaves that scope unchanged. Either way round, AGL-20 comes first by `blocked_by`.
- **AGL-21 and AGL-22, research tools (`units/AGL-21-web-search.md` line 8; `units/AGL-22-fetch-page.md` line 8).** Each lists AGL-20 in `parallel_with`, and AGL-20 lists both (unit line 8). Neither is blocked by AGL-20 (AGL-21 line 7 names AGL-06 and AGL-08; AGL-22 line 7 names AGL-02 and AGL-08). AGL-20 changes no file they use. The pairs are symmetric and no pair depends on the other.
- **CEX-06, unsupported-claims preflight (`units/CEX-06-claims-orphans-checks.md` lines 7, 15 and 16).** It is not blocked by AGL-20. It reads the claims artefact by the AGL-16 path rule and format, and it turns `unsupported` into an error and `weak` into a warning. AGL-20 changes neither the artefact nor the rule. AGL-20's `unblocks` entry for it, `"Compile & export unsupported-claims preflight"`, has no unit id (unit line 9). By `units/README.md` line 65, a quoted entry without a unit id is informative only, so it creates no inverse duty, and it agrees with `modules/agent-loop.md` line 82 (Compile & export reads the artefact "with no Agent loop dependency"). No unit change (OP1).
- **CEX-20, milestone gate (`units/CEX-20-milestone-gate.md` line 27).** Its demo expects the unsupported-claims finding from the sample draft. That finding comes from AGL-19's draft and AGL-16's engine on main. CEX-20 is not blocked by AGL-20 (its `blocked_by` at line 7 names no AGL unit).
- **Blockers of AGL-20.** Each blocker names AGL-20 in its own `unblocks`, as the exact inverse rule requires (`units/README.md` line 64): AGL-15 (unit line 9), AGL-16 (line 9), AGL-17 (line 9), AGL-18 (line 9), AGL-19 (line 9), and PST-14 (`units/PST-14-search-box-ui.md` line 9, which names "Agent loop grounding gate (AGL-20)"). AGL-19's `blocked_by` includes AGL-16 (`units/AGL-19-grounding-sample-draft.md` line 7).
- **PST-22 (`units/PST-22-review-gate.md` line 27).** It says the grounding half of the M3 done-when "is demonstrated by AGL-20, which closes after this gate". That holds transitively: AGL-15 is blocked by PST-22 (`units/AGL-15-pending-writes-gate.md` line 7), and AGL-20 is blocked by AGL-15.
- **Phase row.** `units/README.md` line 114: `Agent loop | phase:grounding | M3 | AGL-16 … AGL-20 | AGL-20`. AGL-20 is the last unit of the phase and waits on AGL-16 to AGL-19 by name (unit line 7). `modules/agent-loop.md` lines 36 and 80 agree. AGL-20 closes only `phase:grounding`. Milestone M3 also needs `phase:editor` (README line 82), `phase:tailnet` (line 90) and `phase:pending-review` (line 99).

## 7. Agreement with the other draft and planned plans

The draft and planned plans other than this one are `plans/SAU-21.md` (planned since `fb55b88`), `plans/SAU-22.md` (draft) and `plans/TRG-14.md` (planned), found by `grep -l "^status: \(draft\|planned\)" plans/*.md`. No file of AGL-20 (section 2) is in the file list of any of them. For each, the change it makes and why the two changes are correct in either order:

- **`plans/TRG-14.md` (planned, line 3).** Changes `apps/web/src/app/features/tool-registry/**`, `apps/web/package.json`, `package-lock.json`, and adds `e2e/specs/tools-editor.e2e.ts` (its file table, lines 99 to 110). AGL-20's web step runs `chat-page.spec.ts`, which uses none of TRG-14's new packages. If TRG-14 merges first, the fresh `npm ci` of step 1 installs its packages. The e2e spec sorts before `verdicts-sample.e2e.ts`, and AGL-20 runs only `specs/verdicts-sample.e2e.ts`, so its order does not matter here. T2's steps 2, 5 and 10 restore the active project and app default, which AGL-19 designed for this (`plans/AGL-19.md` section 6). Either order is correct.
- **`plans/SAU-21.md` (planned, line 3; read here for its file table only).** Changes `apps/api/test/setup-auth-tailnet-gate.test.ts` (new), `deploy/RUNBOOK.md`, `modules/setup-auth.md`, `docs/adr/0001-tailscale-serve-mechanism.md`, and, only if its socket test fails, `deploy/compose.yaml`, `deploy/compose-version` and `apps/api/src/modules/platform/compose-version.ts` (its table, lines 42 to 45, as revised in `e9691c3`, F21). No file in common with AGL-20. Either order is correct.
- **`plans/SAU-22.md` (draft).** Changes `packages/contracts/src/platform/env.ts`, `packages/contracts/test/platform.schema.test.ts`, `apps/api/src/modules/platform/boot/env.ts`, `apps/api/src/modules/setup-auth/request-policy.ts`, `apps/api/src/modules/setup-auth/setup-auth.guard.ts`, `apps/api/src/bootstrap.ts`, the `dev` script of root `package.json`, `README.md`, and adds `apps/api/test/setup-auth-dev-mode.test.ts` and `scripts/dev-auth-docs.test.mjs` (its section 3, rows 1 to 10). No file in common with AGL-20. AGL-20's tests boot the composed app through the setup-auth guard. SAU-22 changes the guard only when `SCRIBA_DEV_AUTH` is set, and it defaults to `0` (SAU-22 section 1, D1: "Unset means false"). So AGL-20's tests pass in either order. The contract change adds an env key, which step 1's build picks up.

No other unit or plan changes these files. `units/CEX-06-claims-orphans-checks.md` is not in any plan's file list, and no `draft` or `planned` plan names `agent-loop-grounding-gate.test.ts` (F16).

## 8. Facts checked and facts assumed

### 8.1 Checked by reading (path and line)

Unit and module:
- F1. `units/AGL-20-grounding-gate.md`: front matter lines 1 to 10 (`phase` line 5, `blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); line 14 (closes `phase:grounding`); criteria lines 16 to 21; demo lines 23 and 24. No change note, no Decisions section.
- F2. `units/README.md`: line 64 (`unblocks` is the exact inverse of `blocked_by`); line 69 (a phase closes when its gate unit is merged); lines 82, 90, 99 (M3 phases); line 114 (the `phase:grounding` row); line 139 (testing principles).
- F3. `modules/agent-loop.md`: line 11 (ordering); line 36 (AGL-20 gate in the graph); lines 54 and 82 (writes and the artefact); line 56 (`sources/` only); lines 61, 62, 65, 66 (testing seams); line 67 (real models); line 80 (the M3 split).

Blockers and their status:
- F4. Units: `units/AGL-15-pending-writes-gate.md` line 9; `units/AGL-16-grounding-engine.md` line 9; `units/AGL-17-grounding-wiring.md` line 9; `units/AGL-18-grounding-badges-ui.md` line 9; `units/AGL-19-grounding-sample-draft.md` lines 7 and 9; `units/PST-14-search-box-ui.md` line 9 (revision 2; the draft said line 55). Status `done`: `plans/AGL-15.md` line 3; `plans/AGL-16.md` line 4; `plans/AGL-17.md` line 3; `plans/AGL-18.md` line 3; `plans/AGL-19.md` line 3; `plans/PST-14.md` line 3.

Downstream and related units:
- F5. `units/AGL-23-research-gate.md` lines 7 and 20; `units/AGL-21-web-search.md` lines 7 and 8; `units/AGL-22-fetch-page.md` lines 7 and 8; `units/CEX-06-claims-orphans-checks.md` lines 7, 15, 16, 27 (line 7 names CEX-05, AGL-01 and GRR-01, not AGL-20); `units/CEX-20-milestone-gate.md` lines 7 (no AGL unit) and 27; `units/PST-22-review-gate.md` line 27.

Code on main:
- F6. `apps/api/src/modules/agent-loop/grounding-engine.ts`: lines 101 to 104 (the checked text: the overlay or the file); line 105 (model resolved once); lines 108 to 120 (retrieval, scope line 112); lines 122 to 124 (only claims with passages are judged); lines 141 to 148 (the result, `contentHash` line 144); lines 149 to 153 (the artefact write); lines 190 to 223 (judge, exact cover); lines 227 to 256 (`verdictOf`: no passage gives `unsupported`, lines 233 and 234; an uncited verdict is downgraded, lines 247 to 249; a retrieved passage is kept, lines 250 to 255).
- F7. Route and run: `apps/api/src/modules/agent-loop/agent-runs.controller.ts` lines 43 to 51 (`POST` grounding, 200); `agent-runs.service.ts` lines 88 to 100 (`checkGrounding`, family `grounding` at line 97) and line 169 (the engine bound as `ground`); `agent-run.ts` lines 413 (`groundOne`), 445 to 453 (`finish` awaits `groundDrafts` at 453), 471 to 483 (`groundDrafts`), 503 and 519 (the summary on the pending change); `tools/builtin-tools.ts` line 362 (`check_grounding`).
- F8. `agent-loop.module.ts`: line 19 (the entry re-exports `GroundingEngine`), line 63 (`exports` includes `GroundingEngine`).

Contracts:
- F9. `packages/contracts/src/agent-loop/grounding.ts`: lines 14 to 18 (passage), 21 to 30 (claim), 33 to 40 (result, `contentHash` line 36), 51 to 53 (request). `constants.ts`: line 73 (verdicts), lines 82 to 86 (artefact prefix, suffix, template, pattern). `routes.ts` line 10 (`AGENT_GROUNDING_ROUTE`).
- F10. `apps/api/src/modules/project-store/search-index.ts` lines 111 to 118: `buildMatchQuery` splits on whitespace, quotes each piece, and joins with `OR`. So one shared word is a match.

Test kit and existing tests:
- F11. `apps/api/test/agent-loop-transcript.kit.ts`: `HarnessOptions` lines 65 to 72 (with the optional `modules`), `openHarness` line 87, `post` line 149, `observe` line 169, `readUntilEnded` line 184, `requestsOf` line 219. `apps/api/vitest.config.mts` line 8 (`include`) and line 9 (`testTimeout` 20000).
- F12. `apps/api/test/agent-loop-grounding.test.ts`: G1 line 105, G2 line 151, G3 line 190, G4 line 241. `apps/api/test/agent-loop-grounding-wiring.test.ts`: helpers lines 43 to 79 and 126 to 145; C1 line 157; C2 lines 220 to 264, with the artefact assertions at lines 245 to 258; C2b line 266; X1 line 324; X2 line 350; X3 line 388; X4 line 418. `apps/api/test/agent-loop-pending-writes-gate.test.ts` line 296 (the AGL-15 gate test, the precedent).
- F13. `e2e/specs/tools-preview.e2e.ts` line 167 is the test `TRG-05 C2`, which fails on main. `plans/DECISIONS.md` line 5506 records it.

Web:
- F14. `apps/web/src/app/features/agent-loop/chat-page.spec.ts`: G1 at line 665, `stubMatchMedia(390, 844)` at line 667, the label assertion at line 720. `grounding-chip.ts` exists in the same folder. `apps/web/angular.json` `sourceRoot` is `src`.

E2e and harness:
- F15. `e2e/specs/verdicts-sample.e2e.ts`: imports lines 1 to 3 (`node:fs/promises`, `node:path`, `@playwright/test`; no contracts import); header lines 5 to 8; the test at line 84; step 9(a) lines 193 to 197; step 9(b) lines 199 to 230; step 9(c) lines 232 to 234. `e2e/fixtures/mock-openai/scenarios/grounding-claims.json` exists with two steps, matched on `Task: extract claims.` and `Task: judge claims.`. `examples/nonfiction/drafts/the-plateau-is-not-the-end.md` exists.
- F16. `e2e/harness/global-setup.ts`: line 20 (`assertPortFree`), line 31 (`startMockOpenAI`), lines 60 to 72 (builds), lines 74 to 85 (`startApi`, with `SCRIBA_EXAMPLES_DIR` at line 81). `e2e/playwright.config.ts` line 13 (`workers: 1`), line 24 (`executablePath` from `SCRIBA_E2E_CHROMIUM`).

Other plans and decisions:
- F17. `grep -l "^status: \(draft\|planned\)" plans/*.md` returns `plans/AGL-20.md`, `plans/SAU-21.md` (planned since `fb55b88`), `plans/SAU-22.md` (draft) and `plans/TRG-14.md` (planned), each with status on line 3 (revision 2, at `fb55b88`). `plans/SAU-21.md` file table lines 42 to 46. `plans/TRG-14.md` file table lines 99 to 110. `plans/SAU-22.md` section 3, rows 1 to 10. No `plans/*.md` names `agent-loop-grounding-gate`.
- F18. `plans/DECISIONS.md`: line 5407 and 5420 (test seam and the kit's retirement); line 5483 (T2 passed on the AGL-19 branch); line 5506 (the `tools-preview` failure on main); lines 5586 to 5592 (AGL-15 review). `plans/AGL-15.md` line 32 (D7), line 76 (the path-filtered journey command), lines 90 to 93 (criteria table). `plans/AGL-17.md` line 303 (section 7, point 3). `plans/AGL-19.md` line 28 (D-ORDER), line 98 (the T2 row). `plans/AGL-09.md` line 148 (the `--include` form). `plans/AGL-16.md` line 307 (open point 1).
- F19. `git log --oneline -1` on the working tree prints `231c698 docs: update the sequence of candidate units`. The tree was clean at the start (the status snapshot).
- F21. Main at the end of the work is `e9691c3 docs(SAU-21): plan revised, status draft`. `git diff --stat 231c698 HEAD` lists only `plans/SAU-21.md`. Its revised file table (rows at lines 42 to 45) lists the same files as before, plus no AGL-20 file. `git status --porcelain` shows only `?? plans/AGL-20.md` from this work.

Environment (read only):
- F20. `node -v` prints `v26.13.0`; `npm -v` prints `11.20.0`; `ls node_modules` counts 376 entries; `node_modules/@angular/build` is `22.2.5`, and `node_modules/@angular/build/src/builders/unit-test/schema.json` has the `include` property; `node_modules/playwright-core/browsers.json` lists chromium revision `1254`; `~/.cache/ms-playwright/` holds `chromium-1254` and `chromium_headless_shell-1254`; `/usr/bin/chromium-browser` exists.

Added in revision 2:
- F22. `apps/api/test/project-store-projects.kit.ts` line 48 writes `book/sources/outline.md` as `# Outline\n` in every fixture library, so the retrieval of C1 and C3 also searches it. `apps/api/src/modules/agent-loop/grounding-prompts.ts` lines 32 to 42 (`extractReplySchema`: a span is two integers at least 0, not checked against the text) and grounding-engine.ts line 232 (the span is copied as it is).
- F23. `apps/web/src/app/features/agent-loop/grounding-chip.ts`: no `@media` and no `matchMedia`; line 121 renders `<span class="label">` for each claim. `apps/web/package.json` has `jsdom` (the Vitest runner's DOM). `units/README.md` line 57 (a heading parenthetical names the seam only when it differs from the module's) and line 65 (quoted entries without a unit id are informative only); line 139 (real models only in AGL-25, never in CI).
- F24. `e2e/specs/verdicts-sample.e2e.ts` signs in by itself (`signIn`, lines 63 to 70) and posts to the real route (`CHECK_PATH`, line 16; step 7, line 157). So a path-filtered run of this spec alone is complete. `e2e/playwright.config.ts` line 10 (`testDir: './specs'`). `e2e/package.json` script `e2e` is `playwright test`.
- F25. `units/AGL-23-research-gate.md` line 7 is the only `blocked_by` that names AGL-20. No `plans/CEX-06.md`, and no `unit/CEX-06` branch (`git branch --list`).

### 8.2 Assumed, not checked

- A1. `npm ci` in a fresh worktree succeeds, which needs the npm registry. Not run.
- A2. Port 8080 is free when the e2e starts. Not probed.
- A3. Playwright's default lookup finds `chromium-1254`. Not run. The fallback is in section 5.
- A4. `ng test --include <path>` runs only that file, per the AGL-09 precedent. Not run.
- A5. Vitest's `-t` matches a regular expression against the full test name, as `plans/AGL-16.md` section 5 (line 240) uses it. Not run.
- A6. C1 and C3 pass on main. They exercise the same engine rules as G1 and G2 (approved) and the route that C2 exercises (approved). Not run.
- A7. The search returns the passage of `sources/notes.md` at offset 0 for its first sentence. AGL-16's G1 asserts this and was approved, but it was not re-run here.
- A8. T2 passes on main at `231c698`. It passed on the AGL-19 branch (DECISIONS line 5483); main's e2e was not run here.
- A9. The test file name `agent-loop-grounding-gate.test.ts` is free. Checked with `ls` on `apps/api/test/` and a grep of the plans and units, which found only unit-name references.

## 9. Open points

- **OP1. Unblocks entry for the Compile & export preflight.** Unit line 9 lists `"Compile & export unsupported-claims preflight"` in `unblocks`. It names no unit id, and `units/CEX-06-claims-orphans-checks.md` line 7 does not name AGL-20 in its `blocked_by`. So `unblocks` is not the exact inverse of `blocked_by` (README line 64). Options: (a) add AGL-20 to CEX-06's `blocked_by`, which adds a wait CEX-06 does not need, since it reads the AGL-16 artefact format that is on main; (b) remove the entry from AGL-20's `unblocks`; (c) keep it as a label. Chosen: (c). This plan changes no unit file, and both orders are correct, because CEX-06 needs nothing from AGL-20. **Settled by the reviser (revision 2), not for the Navigator.** `units/README.md` line 65 makes a quoted entry without a unit id "informative only", so the exact-inverse rule of line 64 does not apply to it, and the unit already agrees with the README. `modules/agent-loop.md` line 82 says the preflight reads the artefact with no Agent loop dependency, so (a) would contradict the module. The entry is not in the way of this plan (YAGNI, first condition fails), and a front-matter edit is none of the four reviser actions; so no unit changes. CEX-06 is also not in the pipeline (F25), but no change is made.
- **OP2. Criterion 1 test: an inline draft, not the sample.** Options: (a) add to T2 an assertion that claim 3 of the sample (`Most learners break through a plateau within six weeks.`, `drafts/the-plateau-is-not-the-end.md`) is `unsupported`; T2 step 9(a) checks only that some claim is unsupported (`e2e/specs/verdicts-sample.e2e.ts` line 197); (b) a new gate test (C1) on the route, with an inline draft whose invented statistic shares no word with `sources/`. Chosen: (b). It tests the engine's rule on the production route, and it keeps unit tests off `examples/` (D3). In the sample, claim 3 shares words with its source, so its verdict is the script's, not the engine's. T2 is unchanged. Not a criterion change.
- **OP3. Criteria 2, 4 and 5 use existing tests.** Options: copy them into the gate file, or name them. Chosen: name them (section 4). C2 asserts the contract, the path and the hash on the production route (lines 245 to 258). G1 asserts the phone labels. T2 asserts the three verdicts and the citations. Copying would add maintenance and no assertion. Not a criterion change.
- **OP4. Criterion 3 test: on the route, not the kit.** Options: keep AGL-16's G1 (kit, `-t "G1"`) as the criterion test, or add C3 on the production route. Chosen: C3 (D8). G1 still runs in step 2 and stays valid. Not a criterion change.
- **OP5. Real-browser check at phone width for the badges.** Nothing on main renders the grounding chip in a browser at 390 px. `e2e/specs/search-phone.e2e.ts` does this for the PST-14 search, and only for search. Options: (a) no browser test: the module's UI seam is Vitest with the Shell's fakes (`modules/agent-loop.md` line 65), so G1 is the criterion's test (chosen); (b) a new Playwright spec at 390 by 844, whose name must sort after `verdicts-sample.e2e.ts` (D10). **Settled by the reviser (revision 2), not for the Navigator:** (a). The criteria heading names no seam, so the module's UI seam is the criterion's seam (README line 57; module line 65), and the chip has no width-dependent rule that only a real viewport would exercise (F23). The criterion is not one this environment cannot run, and it is not weakened (section 5). The plan adds no browser test. The real-phone demo stays manual (OP6).
- **OP6. Demo items no test covers.** The demo's phone steps (Check grounding, expanding a claim, opening its source; unit lines 23 and 24) are manual. Tests on main cover the parts: AGL-17 C1 (the automatic check) and C2 (the button's route), and AGL-18 G1 and G2 (the chip, expansion and source links, in Vitest). Chosen: no test added, and the demo stays manual. Not a criterion.
- **OP7. Mutation checks in step 5.** Options: skip them, or run two reverting mutations (chosen). A passing run alone does not show that C1 and C3 would catch a broken rule. The mutations are not committed and are reverted with `git checkout --`. Not a criterion change.
- **OP8. Mock versus live model for criterion 2.** The criterion is checked with the mock scenario (D11). A live-model run is the manual eval of AGL-25 (`modules/agent-loop.md` line 67). It is not a gate criterion, and this environment has no model credentials (not checked). Chosen: the mock. **Settled by the reviser (revision 2), not for the Navigator.** It is the simplest option, and the only one the rules allow: `units/README.md` line 139 and `modules/agent-loop.md` line 67 keep real models out of every automated check. It still tests the criterion as written: the criterion names "the sample grounding-claims draft", and T2 checks that draft, copied from `examples/` through "start from sample", through the production route and the real engine (F24). The engine's rules (retrieval from `sources/`, downgrade of an uncited verdict) are real; only the model's replies are scripted, and step 9(b) checks each citation against the passages the engine actually sent to the judge. Not a change of the criterion.

## 10. Review parts

A small plan: one part.

- **Part 1 — the gate tests and the phase checklist.** Steps 0 to 14 of section 3. Tests: C1 (criterion 1, new, section 4.1), T2 (criterion 2, existing, `e2e/specs/verdicts-sample.e2e.ts`), C3 (criterion 3, new, section 4.2), C2 (criterion 4, existing, `apps/api/test/agent-loop-grounding-wiring.test.ts`) and G1 (criterion 5, existing, `apps/web/src/app/features/agent-loop/chat-page.spec.ts`). The reviewer reads the one new file, `apps/api/test/agent-loop-grounding-gate.test.ts`, against sections 4.1 and 4.2, the mutation evidence of step 5, and the results of steps 2, 4 and 6 to 11. Steps 13 and 14 are the orchestrator's, after the review, and are in this part.
