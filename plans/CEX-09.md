---
id: CEX-09
status: draft
---
# CEX-09 plan — assembly-preflight gate: module re-exports and the gate tests

Revision 1, by the planner, at main `db5c695` (the session started at `3e33e75`; the one commit between them, `db5c695`, changes only `plans/QUEUE.md`, checked with `git show --stat`). Unit: `units/CEX-09-assembly-preflight-gate.md` (module compile-export, phase:assembly-preflight, M5). This plan changes no unit, module, contract, DECISIONS or e2e file, and marks nothing passed. Status stays `draft` until a reviewer approves it.

Tags: `F<n>` is a fact checked in section 2a, with its file and line. `A<n>` is an assumption in section 2b. `D<n>` is a decision of this plan. Line numbers were read with `cat -n`, `sed -n` or `grep -n` at main `db5c695`.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the README

- **D1 Scope.** A gate unit: no new HTTP route, no contract change, no event, no Pandoc. Source: unit lines 14 and 16 to 18; `modules/compile-export.md` line 39 (the in-process service) and line 42 (never calls a model, never runs a graph).
- **D2 The in-process services are exported from the module.** Source: unit line 17; `modules/compile-export.md` line 39. On main, `compile-export.module.ts` line 25 already exports `ManuscriptService`, `AssemblyService` and `PreflightService` (F6).
- **D3 Preflight is model-free and makes no outbound HTTP call.** Source: unit line 23; `modules/compile-export.md` line 42; F7 (no module file of compile-export imports a provider or makes a request).
- **D4 Unit tests never read `examples/`; tests check external behaviour (HTTP responses, files), never internal services.** Source: `units/README.md` line 139; `modules/compile-export.md` lines 58 and 59.
- **D5 Guard coverage is automatic.** Setup & auth's invariant sweep enumerates the router, so the compile-export routes are covered without a list. Source: unit line 18; `units/README.md` line 132; F15.
- **D6 One test or check per criterion.** Source: unit lines 21 to 24; `units/README.md` lines 67 to 69 (a phase closes when its gate unit is merged).

### 1b. Settled by other units and by DECISIONS

- **D7 Four drafts in the sample.** The Navigator's option B (2026-11-14) sets four chapters for the milestone sample. The criterion-4 test asserts the four drafts of the sample in authored order with statuses `final`, `revised`, `draft`, `draft`. Source: `plans/DECISIONS.md` lines 3058 to 3062; `examples/nonfiction/project.yaml` lines 5 to 13 (F19); `plans/CEX-08.md` section 5, C2 (lines 148 to 157).
- **D8 The committed criterion-4 test uses a fixture sample, not the real `examples/`.** `plans/CEX-08.md` line 151 planned a temporary copy of the real `examples/` as the seam. That conflicts with `units/README.md` line 139 and with the precedent of committed tests, which point `SCRIBA_EXAMPLES_DIR` at a fixture folder (`plans/CEX-08.md` line 58, F14; `apps/api/test/project-store-samples.kit.ts` lines 52 and 110). This plan follows the precedent. The real sample is checked by a recorded run at this gate (section 4, step 7), as `plans/CEX-08.md` step 7 does. Open point 1.

### 1c. Decided here (the simplest option the sources allow)

- **D9 No signature change and no project parameter.** The in-process services keep their signatures and read the active project through `store.activeId()`: `ManuscriptService.view()` (`manuscript.service.ts` line 73), `AssemblyService.assemble(now: Date): string` (`assembly.service.ts` line 62), `PreflightService.run(now: Date): PreflightResult` (`preflight.service.ts` line 64). `plans/CEX-05.md` lines 144 and 162 left the bound-project question to CEX-09 or AGL-24. Decided here: AGL-24 owns it, because the agent run's bound project is an AGL-24 rule (`units/AGL-03-loop-core.md` line 18). Open point 2.
- **D10 The only production change is three re-export lines.** After the imports of `compile-export.module.ts` (line 12), add `export { ManuscriptService } from './manuscript.service';`, `export { AssemblyService } from './assembly.service';` and `export { PreflightService } from './preflight.service';`, in the form of `project-store.module.ts` lines 25 to 27 and `setup-auth.module.ts` lines 23 and 24. Why: the boundary rule (`eslint.config.mjs` line 50, rule R1) lets another api module import only through a `*.module.ts` entry file, and `compile-export.module.ts` re-exports no class today (F6). Without the lines, the agent-loop module (AGL-24) cannot import the services. No provider, controller or `exports` entry changes. Verified by the build and the boundary lint, not by a test (open point 4).
- **D11 One new test file with one `it` per criterion.** `apps/api/test/compile-export-gate.test.ts`, following the `compile-export-*.test.ts` names. Seams are HTTP only: `POST` preflight, `POST` start from sample, `POST` active project, `GET` manuscript.
- **D12 Criterion 1 is a recorded check, not a new test.** No new code can test the earlier units' criteria beyond running their suites. The check is the list of section 4, step 3, and its output is recorded in the PR.
- **D13 Guard coverage is a run, not a new list.** The two invariant test files run and pass (section 4, step 4); nothing is added to the sweep.
- **D14 Test layout.** Each fixture is written inside its `it`, through `withManuscript` (`compile-export-manuscript.kit.ts` line 48). The preflight POST helper is copied from `compile-export-preflight.test.ts`, which does not export it. Each `it` passes an explicit timeout of 60 000 ms, because it boots the app more than once (A7).
- **D15 A failure on main stops the gate.** If a gate test fails on main, the defect is in an earlier unit's code. The implementer stops and reports; it does not fix that code here.

## 2. Facts checked and facts assumed

### 2a. Facts checked

Unit, module and README

- **F1.** `units/CEX-09-assembly-preflight-gate.md`: front matter lines 2 to 9. `blocked_by` (line 7) names CEX-02 to CEX-08. `parallel_with` (line 8) names CEX-16 and CEX-17. `unblocks` (line 9) names CEX-10, GNP-19 and AGL-24. Scope lines 16 to 18. Criteria lines 21 to 24. No change note: `git log --oneline -- units/CEX-09-assembly-preflight-gate.md` shows one commit, `2fed3f4` (the consolidation of the units folder). Criterion 1 names CEX-02 to CEX-07, while `blocked_by` also names CEX-08, which is done.
- **F2.** `modules/compile-export.md`: line 39 (the module's in-process service and its route prefix), line 42 (never reads or writes `drafts/.versions/`, never runs a graph, never calls a model), lines 57 to 59 (testing principles: external behaviour only; "Unit tests never read `examples/`" on line 59).
- **F3.** `units/README.md`: line 64 (`unblocks` is the exact inverse of `blocked_by`), lines 67 to 69 (phase gates), line 121 (phase row CEX-02 to CEX-09, gate CEX-09), line 132 (routes behind Setup & auth's guard), line 139 (testing principles, including "Unit tests never read `examples/`").

Blockers and parallel units

- **F4.** Inverse check. `units/CEX-02-effective-order-view-model.md` line 9 (unblocks CEX-03, CEX-04, CEX-05, CEX-09). `units/CEX-03-order-writes.md` line 9 (CEX-09, CEX-14, CEX-16). `units/CEX-04-assembled-markdown.md` line 9 (CEX-09, CEX-10). `units/CEX-05-preflight-endpoint-placeholders.md` line 9 (CEX-06, CEX-07, CEX-09, CEX-10, CEX-18). `units/CEX-06-claims-orphans-checks.md` line 9 (CEX-09). `units/CEX-07-entity-links-banned-phrases.md` line 9 (CEX-09). `units/CEX-08-nonfiction-sample-order.md` line 9 (CEX-09, CEX-20). `parallel_with` on CEX-16 (line 8) and CEX-17 (line 8) names CEX-09. Every entry is symmetric; no unit file needs a change.
- **F5.** Every criterion box of `units/CEX-02-*.md` to `units/CEX-08-*.md` and `units/CEX-16-*.md` is `- [x]` (grep). Plans: `plans/CEX-02.md` to `plans/CEX-08.md` and `plans/CEX-16.md` have `status: done` on line 3. `plans/CEX-17.md` line 3 is `status: planned`.

Code on main

- **F6.** `apps/api/src/modules/compile-export/compile-export.module.ts` (27 lines): imports on lines 1 to 12 (`AssemblyService` line 5, `ManuscriptService` line 7, `PreflightService` line 10, `SnapshotService` line 12); line 16 `imports` (`PlatformModule`, `ProjectStoreModule`, `SetupAuthModule`); line 17 `controllers`; lines 18 to 24 `providers`; line 25 `exports: [ManuscriptService, AssemblyService, PreflightService]`. It has no `export {` re-export line (grep count 0). Its last change is `5444af4` (`feat(CEX-16): snapshot create and list`).
- **F7.** `apps/api/src/modules/project-store/project-store.module.ts` lines 25 to 32 re-export service classes and a type. `apps/api/src/modules/setup-auth/setup-auth.module.ts` lines 23 and 24 re-export `RequestIdentity` and `PreferencesReader`. The compile-export services import project-store and setup-auth only through these entry files (grep of `apps/api/src/modules`). No file under `apps/api/src/modules/compile-export/` contains `fetch(`, an `http` import or a providers import; the only match of `providers` is the word in the module's `providers` array (line 18).
- **F8.** `apps/api/src/modules/compile-export/assembly.service.ts`: line 62 `assemble(now: Date): string`; lines 49 and 50 (comment: "CEX-10 calls it with the export time"); lines 117 to 127 `activeProjectId()` through `store.activeId()`.
- **F9.** `apps/api/src/modules/compile-export/preflight.service.ts`: line 64 `run(now: Date): PreflightResult`; lines 38 to 44 `PREFLIGHT_RUNNERS` in the order placeholders, unsupported-claims, orphan-scenes, entity-links, banned-phrases; lines 47 to 51 `statusOf` (an error fails the check, a warning warns it, info keeps it passing); lines 138 to 148 `activeProjectId()`.
- **F10.** `apps/api/src/modules/compile-export/manuscript.service.ts`: line 73 `view(): ManuscriptView`; line 227 `storyGraphs(projectId)`.
- **F11.** Check ids and severities. `preflight-checks.ts` line 55 `placeholders` (error, line 66). `preflight-claims-orphans.ts` line 56 `unsupported-claims` (info on lines 67 and 76; error for `unsupported`, else warning, line 85); line 158 `orphan-scenes` (warning on lines 169 and 182; info on line 200). `preflight-links-phrases.ts` line 180 `entity-links` (error on line 211, info on line 244, warning on line 259); line 300 `banned-phrases` (warning on line 319).
- **F12.** Contract `packages/contracts/src/compile-export/preflight.ts`: lines 15 to 25 the finding (`check`, `severity`, `path`, optional `line`, `offset`, `length`, `message`, `ref`); line 41 `preflightSummarySchema`.

Existing tests named as sources of the fixtures

- **F13.** `apps/api/test/compile-export-preflight.test.ts`: the placeholders test at line 65 (fixture `C1_FILES` above it); the clean-fixture test at line 108 (every check's status is `pass`); "preflight makes no model call" at line 134 (mock provider; asserts `recordsOf(mock, 'text-stream')` is `[]`). `apps/api/test/compile-export-claims-orphans.test.ts`: claims at line 94, orphans (a) at line 237, orphans (b) at line 287, orphans (c) at line 323, label-only nodes at line 370. `apps/api/test/compile-export-links-phrases.test.ts`: entity links at line 65, banned phrases at line 138.
- **F14.** Kits. `compile-export-manuscript.kit.ts`: `manuscriptLibrary` line 20, `withManuscript` line 48, `getManuscript` line 70, `manuscriptOf` line 79. `project-store-samples.kit.ts`: `SamplesFixture` line 22, `buildSamplesFixture` line 52 (builds the library and a samples folder with fixed entries and no `nonfiction`), `withSamplesApp` line 110 (passes `env: { SCRIBA_EXAMPLES_DIR }` to `createTestApp`), `startFromSample` line 135. `project-store-projects.kit.ts`: `postJson` line 111. `providers-client.kit.ts`: `recordsOf` reads `/__mock/scenarios/<scenario>/requests` (line 66).
- **F15.** Invariant tests. `apps/api/test/invariant-mutation-guard.test.ts` line 52 (every mutation route refuses a request without a credential, a bad Origin or a bad Host); `apps/api/test/invariant-get-head.test.ts` lines 55, 88 and 125; `apps/api/test/invariant-sweep.ts` lines 58 and 59 (the fixed public routes, and "every other enumerated route") and line 672 (the verdict applies to every enumerated route).
- **F16.** Tooling. `apps/api/package.json` line 2 `"name": "@bbartolome/scriba-api"`; line 7 `"test": "npm run build && vitest run"`; line 6 `build`. `apps/api/vitest.config.mts` line 8 `include: ['test/**/*.test.ts']`. Root `package.json` line 26 `lint`, line 27 `lint:examples`.

Start from sample, activation, the sample

- **F17.** `apps/api/src/modules/project-store/samples.controller.ts` lines 24 to 26: `@Post` of the start route, `@HttpCode(201)` (line 25), body `startFromSampleRequestSchema`. `packages/contracts/src/project-store/project.ts` lines 66 to 70: `sampleId`, `folderName` (pattern), `title`. Lines 72 to 75: `activateRequestSchema` with `projectId`. `apps/api/src/modules/project-store/active-project.controller.ts` line 26: `@Post(ACTIVE_PROJECT_ROUTE)`.
- **F18.** `apps/api/src/modules/project-store/samples.service.ts`: line 60 reads `samples.yaml` from `SCRIBA_EXAMPLES_DIR`; line 79 states that the new project is not activated; lines 36 and 37 list the paths a copy leaves out.
- **F19.** `examples/samples.yaml` line 1 `- id: nonfiction`. `examples/nonfiction/project.yaml`: line 4 `genrePack: nonfiction`; lines 5 to 13 the `order:` block (born-to-it `final`, what-counts-as-practice `revised`, the-ten-thousand-hour-idea `draft`, the-plateau-is-not-the-end `draft`); line 14 `export:`. `examples/nonfiction/drafts/` holds those four files.
- **F20.** `plans/CEX-08.md`: D7 (line 38); F14 (line 58); step 7 with 7(b) and 7(d) (lines 120 to 124); section 5, C2 (lines 148 to 157), with the seam at line 151.

Settled decisions and other units

- **F21.** `plans/DECISIONS.md` (grep by unit id): line 2878 (the open chapter count, naming CEX-08, CEX-09 and CEX-20); lines 3058 to 3062 (the 2026-11-14 entry, option B; the "Agrees" lines for CEX-09 move to the four-chapter count); lines 6485 to 6538 (the CEX-07 entry; line 6538 says "CEX-09 is now available (no plan)"). Line 2557 names CEX-17 (SHL route tests, not this unit). Line 757 names CEX-10, CEX-13 and CEX-15 (Pandoc from a writable folder, not this unit).
- **F22.** Downstream units. `units/CEX-10-pandoc-runner-md-export.md` line 7 (`blocked_by` CEX-04, CEX-05, CEX-09, PLT-10), line 9 (`unblocks` CEX-11 to CEX-15 and CEX-18), line 15 (export always runs preflight first), line 17 (output folder), line 18 (Pandoc invocation). `units/AGL-24-compile-tools.md` line 7 (`blocked_by` AGL-08, CEX-09, CEX-15) and line 17 (the in-process calls on the bound project). `units/GNP-19-fiction-gate.md` line 7 (`blocked_by` names "Compile & export phase:assembly-preflight (CEX-09; assembly order)") and line 17 (fiction-order check through the real start-from-sample HTTP flow and the manuscript GET). `units/CEX-20-milestone-gate.md` line 7 (`blocked_by` CEX-08, CEX-15, CEX-16, CEX-17, CEX-18, CEX-19, PST-22; no CEX-09). `units/AGL-03-loop-core.md` line 18 (an agent run is bound to the project active at start).
- **F23.** Branches and plans in flight. `git branch --list 'unit/*'` shows unit/CEX-17 (0 commits ahead of main), unit/GNP-14 (0), unit/GRR-15 (5), unit/TRG-14 (0), unit/GRR-13 (0), unit/GRR-11 (0) and unit/CEX-08 (0). `git diff --name-only main...<branch>` for these lists no file of `compile-export`, `app.module`, `agent-loop` or `api/test/compile` (checked for each). Plans with status draft or planned: `plans/CEX-17.md`, `plans/GNP-14.md`, `plans/GRR-15.md`. None of the three names a path under `apps/api/src/modules/compile-export/`. `plans/CEX-17.md` lines 136 to 141 list only `apps/web` paths.
- **F24.** Main moved from `3e33e75` to `db5c695` after the session started. `git show --stat db5c695` lists `plans/QUEUE.md` only, so every fact above that is about code or units holds at both commits.

### 2b. Facts assumed, not checked

- **A1.** `npm ci` succeeds in the worktree and Node 26 is on PATH. The CEX-07 record gives Node v26.13.0 and npm 11.20.0; step 1 records both.
- **A2.** The API suite and the lint are green on main at `db5c695`. The planner ran no build, test or lint command; step 2 records the result.
- **A3.** Rule R1 in `eslint.config.mjs` (comment line 50; rule block lines 45 to 69) rejects an api-module import that is not an entry file. Step 6 confirms it with the lint run.
- **A4.** The fixtures of the four checks copied from the named tests (F13) still produce the findings those tests assert. The planner did not read those fixtures in full. Step 5 confirms them.
- **A5.** The mock records a request under its scenario path, and the test provider reaches only the `text-stream` scenario (F13, line 134 onward). The mock has no listing across scenarios.
- **A6.** Start from sample copies the whole sample tree except the excluded paths (F18). The criterion-4 fixture therefore needs only `samples.yaml`, `nonfiction/project.yaml` and the four drafts.
- **A7.** Vitest's default timeout is 5 seconds. The explicit 60 000 ms of D14 is a safe margin; it is not measured.
- **A8.** The start-from-sample answer is 201 (F17); the body is not checked by the criteria.
- **A9.** `plans/CEX-17.md` is revision 2 and has not merged; its file list (F23) is current.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/compile-export.module.ts` | edit, three lines | After the imports (line 12), add `export { ManuscriptService } from './manuscript.service';`, `export { AssemblyService } from './assembly.service';` and `export { PreflightService } from './preflight.service';` (D10). No provider, controller or `exports` entry changes. |
| `apps/api/test/compile-export-gate.test.ts` | new | Three `it` blocks, for criteria 2, 3 and 4 (D11, section 5), with local helpers (D14). |
| `plans/CEX-09.md` | new | This plan, committed by the planner. |

Not changed: `units/**` (the orchestrator ticks the boxes at merge, as in `plans/CEX-17.md` P13); `modules/**`; `plans/DECISIONS.md`; `packages/contracts/**`; `apps/web/**`; `e2e/**`; `examples/**`; the other compile-export source files; `eslint.config.mjs`; the existing kits (the gate test imports them and does not edit them).

## 4. Method

Run from a new worktree at `/Users/bbartolome/workspace/scriba-prototype-wt/CEX-09` on branch `unit/CEX-09`, created from main `db5c695`: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/CEX-09 -b unit/CEX-09 main`. Record `node -v` and `npm -v` beside each result. Do not push and do not open a pull request.

1. **Runtime and install.** `node -v` prints `v26.x`; `npm -v` prints `11.x`; `npm ci` exits 0. Expected: exit 0 (A1).
2. **Baseline.** `npm test -w @bbartolome/scriba-api` exits 0; record the file and test counts. `npm run lint -w @bbartolome/scriba-api` exits 0. Expected: both exit 0 (A2). If a baseline fails on main, stop and report.
3. **Criterion 1 check (no code).** From the worktree:
   - `grep -c '^- \[ \]' units/CEX-0[2-8]-*.md units/CEX-16-*.md` prints a count of 0 for every file.
   - `grep -l '^status: done' plans/CEX-0[2-8].md plans/CEX-16.md` lists all eight plans.
   Expected: every count 0 and eight paths listed. Record the output.
4. **Guard coverage.** `npm test -w @bbartolome/scriba-api -- invariant-` exits 0. Record the files run. A failure stops the gate and is reported.
5. **The gate tests.** Write `apps/api/test/compile-export-gate.test.ts` with the three `it` blocks of section 5. Run `npm test -w @bbartolome/scriba-api -- compile-export-gate`. Expected: all three pass on main, because the code exists; these are verifications, not a red-green cycle. Then two negative controls, which are not committed:
   - (a) criterion 4: remove the `order:` block from the test's fixture `project.yaml`; run; expect the order assertion to fail (`orderSource` `alphabetical`). Revert the edit.
   - (b) criterion 2: change the placeholders fixture to `# One`, a blank line and `A clean sentence.`; run; expect the placeholders finding to be missing. Revert the edit.
   Expected: both controls fail, and both reverts restore a passing run.
6. **Re-export.** Add the three lines of D10 to `compile-export.module.ts`. Run `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api`. Run `npx prettier --check apps/api/src/modules/compile-export/compile-export.module.ts apps/api/test/compile-export-gate.test.ts`. Expected: each exits 0 (A3).
7. **Real-sample evidence (not committed).** `T=$(mktemp -d) && cp -R examples "$T/examples"`. Write a throwaway `apps/api/test/tmp-cex09-real-sample.test.ts` that reads the folder from `CEX09_SAMPLES`, boots the app with `SCRIBA_EXAMPLES_DIR` set to it, and runs the criterion-4 assertions with folder `cex09` and title `CEX09` (the pattern of `plans/CEX-08.md` step 7(b)). Run `CEX09_SAMPLES="$T/examples" npm test -w @bbartolome/scriba-api -- tmp-cex09`: expected pass. Then remove the `order:` block from `$T/examples/nonfiction/project.yaml` with the `sed` of `plans/CEX-08.md` step 7(d) and run again: expected fail. Delete the throwaway test file before the commit. Record both results. This is the evidence for the real sample named in open point 1.
8. **Root gates.** From the worktree: `npm run build`, `npm test` and `npm run lint`. Expected: each exits 0. A "Test timed out" line in `scriba-web` is the cold-clone flake recorded in the CEX-07 entry of `plans/DECISIONS.md` (line 6485). Rerun once and record both runs.
9. **Commit.** `git status --short` lists exactly `apps/api/src/modules/compile-export/compile-export.module.ts` and `apps/api/test/compile-export-gate.test.ts`. Commit with `feat(CEX-09): assembly-preflight gate test and module re-exports`. Do not commit `units/` or `plans/`, and do not push.
10. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its pass condition (section 5) holds. The orchestrator ticks the boxes at merge; the implementer edits no unit file.

## 5. Acceptance criteria and tests

The four criteria are unit lines 21 to 24. Each has one test or check. The seams are HTTP and files only.

| Criterion | Test or check | File and seam | Pass condition |
|---|---|---|---|
| 1. CEX-02…CEX-07 criteria pass on main | Check C1 (section 4, step 3; no new test, D12) | recorded command output | every count of unchecked boxes is 0; the eight plans are `status: done`; the base `npm test` exits 0 |
| 2. Each of the five checks has a fixture ...; a clean fixture passes all five | `it('each of the five checks fires with its id, severity, path and line, and a clean fixture passes all five', ..., 60000)` | `compile-export-gate.test.ts`; one `withManuscript` per fixture; `POST` preflight | see the fixture list below |
| 3. Preflight makes no outbound HTTP call | `it('preflight runs all five checks and sends the mock OpenAI server no request', ..., 60000)` | same file; `startMockOpenAI`, `recordsOf` (F13, F14) | the response is 200; the five check ids are in the order of F9; `recordsOf(mock, 'text-stream')` is `[]` |
| 4. The nonfiction sample started via start from sample returns its authored, non-alphabetical order with its statuses | `it('start from sample keeps the authored order and statuses of the nonfiction sample', ..., 60000)` | a fixture samples folder through `SCRIBA_EXAMPLES_DIR`; `POST` start (201), `POST` active, `GET` manuscript | see the expected view below |

Criterion 2 fixtures. The test builds five single-check fixtures and one clean fixture. For each fixture, the response's `checks` contains the named check with a finding whose `check`, `severity`, `path` and `line` are as listed, and the check's status is `fail` for an error, `warn` for a warning, as `statusOf` gives (F9).

- **placeholders.** `drafts/a.md` = `# One`, a blank line, `The draft has a TK in prose.`. Expected finding: `placeholders`, `error`, `drafts/a.md`, line 3. Status `fail`.
- **unsupported-claims.** The fixture and the expected finding of the test at `compile-export-claims-orphans.test.ts` line 94 (the `unsupported` verdict). Copied, with its expected values (A4). Expected severity `error`; status `fail`.
- **orphan-scenes.** The fixture and the expected finding of case (a) at line 237. Expected severity `warning`; status `warn`.
- **entity-links.** The fixture and the expected finding of the test at `compile-export-links-phrases.test.ts` line 65 (an unknown reference). Expected severity `error`; status `fail`.
- **banned-phrases.** The fixture and the expected finding of the test at `compile-export-links-phrases.test.ts` line 138 (a split phrase). Expected severity `warning`; status `warn`.
- **Clean fixture.** `drafts/a.md` = `# Chapter one`, a blank line, `A clean sentence.`; `drafts/b.md` = `A second clean sentence.` (the fixture of `compile-export-preflight.test.ts` line 108). Expected: all five checks have status `pass`. Findings of severity `info` are allowed, because `info` keeps a check passing (F9).

Criterion 3 fixture. The placeholders fixture above, with the mock provider settings of `compile-export-preflight.test.ts` lines 134 onward: a `settings.yaml` whose only provider is the mock, with `PROVIDER_DEFAULTS`. The assertion that all five ids are present shows that all five checks ran, so the "no request" statement covers all five. The scope of the mock check is A5.

Criterion 4 fixture and expected view (D8). The test builds its own `{library, samples, remove}` object as `buildSamplesFixture` builds it (F14), but writes its own `samples.yaml` with one entry `- id: nonfiction` (title `Nonfiction`, a one-line description). The sample folder `nonfiction/` holds `project.yaml` with `schemaVersion: 1`, `title: The Long Apprenticeship`, `genrePack: nonfiction` and the `order:` block of `examples/nonfiction/project.yaml` lines 5 to 13 (the four paths and statuses of F19), and the four drafts, each a heading and one line. The test calls `startFromSample` with `{sampleId: 'nonfiction', folderName: 'gate-sample', title: 'Gate Sample'}` (201), then `POST` `ACTIVE_PROJECT_ROUTE` with `{projectId: 'gate-sample'}` (200), then `GET` the manuscript (200, parsed with `manuscriptOf`). Expected view:

- `paths`: `drafts/born-to-it.md`, `drafts/what-counts-as-practice.md`, `drafts/the-ten-thousand-hour-idea.md`, `drafts/the-plateau-is-not-the-end.md`, in this order.
- `statuses`, in the same order: `final`, `revised`, `draft`, `draft`.
- `orderSource` `project`; every entry has `inOrderField` true and `graphOrdered` false; `warnings` is empty.
- The list of paths is not equal to its sorted form.

No test reads the real `examples/` (D8); no test reads an internal service (D4).

## 6. Agreement with downstream units and later phases

- **CEX-10 (export; blocked by CEX-09).** Uses `AssemblyService.assemble(now)` (`assembly.service.ts` line 62; the comment on lines 49 and 50 names CEX-10) and `PreflightService.run(now)` (`preflight.service.ts` line 64; CEX-10 unit line 15 attaches the preflight summary, contract line 41). CEX-09 keeps both signatures. CEX-10 adds an `ExportService` to `providers` and `exports` and one line to the re-export block of D10. The two are sequential, since CEX-10 waits on CEX-09, so there is no conflict.
- **CEX-11, CEX-12, CEX-13 and CEX-15 (through CEX-10).** Depend on CEX-09 only through CEX-10's runner. No change.
- **CEX-14 (needs CEX-03).** Does not use the in-process services. No change.
- **CEX-18 (preflight panel and export buttons).** Uses the HTTP preflight (CEX-05) and the HTTP export (CEX-10), not the in-process services. No change.
- **CEX-20 (milestone gate).** Does not name CEX-09 in `blocked_by` (F22). Its e2e reads the sample through the manuscript route, and CEX-09 changes no sample file or route. No change.
- **AGL-24 (compile tools; blocked by CEX-09 and CEX-15).** Imports `CompileExportModule` and the three services from `compile-export.module.ts`, through the re-export of D10; that is the only import the boundary rule allows. `assemble_manuscript` uses `ManuscriptService.view()` (line 73), `run_preflight` uses `PreflightService.run(now)`, and `export_manuscript` uses CEX-10's export. The bound project is open point 2; CEX-09 changes no signature.
- **GNP-19 (fiction gate; blocked by CEX-09 for the assembly order).** Its fiction-order check uses the real start-from-sample HTTP flow and the manuscript `GET` (unit line 17). CEX-09 changes no route and no response shape. Criterion 4 covers the nonfiction sample only; the fiction check is GNP-19's own.
- **CEX-16 (done; on main at `5444af4`).** The module's providers, controllers and three exports come from that commit. D10 adds three lines to the same file. The plan is correct in either order, because CEX-16 is already merged and the three lines touch none of its lines.
- **CEX-17 (planned; parallel with CEX-09).** Changes `apps/web/src/app/app.routes.ts` and new files under `apps/web/src/app/features/compile-export/` (`plans/CEX-17.md` lines 136 to 141). It changes no API file and no `apps/api/test` file (F23), and it uses only HTTP routes. The two changes touch disjoint paths and neither reads the other's output, so either merge order is correct.
- **Other in-flight branches (F23).** None changes a compile-export, `app.module` or agent-loop file.

## 7. Other plans on the same files

- `apps/api/src/modules/compile-export/compile-export.module.ts`: changed by CEX-02 to CEX-05 and CEX-16, all merged (F6). CEX-10 changes it later, after CEX-09. No plan in draft or planned changes it now (F23).
- `apps/api/test/compile-export-gate.test.ts`: new. No other plan names it.
- `plans/CEX-17.md` section 7 calls CEX-16 "planned"; CEX-16 is done. This is stale text in that plan. It does not affect CEX-09.

## 8. Open points

1. **Criterion 4 and the real sample.** The unit's wording names the real sample. The README (line 139) forbids unit tests from reading `examples/`, and the committed tests of the repository use fixture folders (F14). CEX-08's plan planned a copy of the real `examples/` as the seam (`plans/CEX-08.md` line 151), which conflicts with both. This plan commits a fixture copy of the four-draft order (D8) and checks the real sample by the recorded run of section 4, step 7, with a negative control. The Navigator must confirm that this satisfies criterion 4. The other place for a committed real-sample check is the e2e manuscript step, which CEX-20 owns.
2. **Bound project of the in-process services.** Left open by `plans/CEX-05.md` (lines 144 and 162). Decided here: no project parameter (D9). AGL-24's plan must refuse an agent run whose bound project (`units/AGL-03-loop-core.md` line 18) is not the active project, or add a parameter itself. Owner: AGL-24's planner.
3. **Criterion 1 is a recorded check.** Its text names CEX-02 to CEX-07. `blocked_by` also names CEX-08 (done). Section 4, step 3 includes CEX-08 and CEX-16. The unit is not changed.
4. **The re-export is not tested.** It is verified by the build and the boundary lint (section 4, step 6). No criterion names it, and the testing principles (`units/README.md` line 139; `modules/compile-export.md` line 58) forbid tests of internal services. AGL-24's tests exercise it.
5. **Criterion 3 scope.** The mock keeps its records per scenario (A5). The test checks the `text-stream` scenario, the only one the test provider reaches. A check across all scenarios would need a mock listing that does not exist.
6. **Cold-clone flake.** The `scriba-web` timeout recorded in the CEX-07 entry of `plans/DECISIONS.md` (line 6485) may recur at section 4, step 8. It is recorded, not fixed here.
7. **Copied fixtures (A4).** The four fixtures copied from the named tests were not read in full by the planner. A mismatch between a copied fixture and its expected finding stops step 5, and is reported, not patched.
