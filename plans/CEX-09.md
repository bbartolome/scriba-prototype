---
id: CEX-09
status: done
---
# CEX-09 plan — assembly-preflight gate: module re-exports and the gate tests

Revision 2, by the reviser, at main `7e941b5` (revision 1 by the planner at `db5c695`; the one commit between them, `7e941b5`, adds this plan only). Unit: `units/CEX-09-assembly-preflight-gate.md` (module compile-export, phase:assembly-preflight, M5). The unit can be planned as written: the reviser changed no unit, module, contract, DECISIONS or e2e file. The open points of revision 1 are settled in section 8. This plan marks nothing passed. Status stays `draft` until a reviewer approves it.

Tags: `F<n>` is a fact checked in section 2a, with its file and line. `A<n>` is an assumption in section 2b. `D<n>` is a decision of this plan. Line numbers were read with `cat -n`, `sed -n` or `grep -n` at main `7e941b5`.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the README

- **D1 Scope.** A gate unit: no new HTTP route, no contract change, no event, no Pandoc. Source: unit lines 14 and 16 to 18; `modules/compile-export.md` line 39 (the in-process service) and line 42 (never calls a model, never runs a graph).
- **D2 The in-process services are exported from the module.** Source: unit line 17; `modules/compile-export.md` line 39. On main, `compile-export.module.ts` line 25 already exports `ManuscriptService`, `AssemblyService` and `PreflightService` from the Nest module (F6); D10 adds the class re-exports that another module needs to import them.
- **D3 Preflight is model-free and makes no outbound HTTP call.** Source: unit line 23; `modules/compile-export.md` lines 42 and 55; F7.
- **D4 Unit tests never read `examples/`; tests check external behaviour (HTTP responses, files), never internal services.** Source: `units/README.md` line 139; `modules/compile-export.md` lines 58 and 59.
- **D5 Guard coverage is automatic.** Setup & auth's invariant sweep enumerates the router, so the compile-export routes are covered without a list. Source: unit line 18; `units/README.md` line 132; F15.
- **D6 One test or check per criterion.** Source: unit lines 21 to 24; `units/README.md` lines 67 to 69 (a phase closes when its gate unit is merged).

### 1b. Settled by other units and by DECISIONS

- **D7 Four drafts in the sample.** The Navigator's option B (2026-11-14) sets four chapters for the milestone sample. The criterion-4 assertions are the four drafts in authored order with statuses `final`, `revised`, `draft`, `draft`. Source: `plans/DECISIONS.md` lines 3058 to 3062; `examples/nonfiction/project.yaml` lines 5 to 13 (F19); `plans/CEX-08.md` section 5, C2 (lines 148 to 157).
- **D8 Criterion 4 has two parts: a committed fixture test and a recorded run on a temp copy of the real sample.** Both are required for the criterion to pass.
  - The committed test (T4, section 5) points `SCRIBA_EXAMPLES_DIR` at a fixture samples folder built in the test, with the order block of the real sample. Reason: `modules/compile-export.md` line 59 (a settled testing principle of the module) and `units/README.md` line 139 say "Unit tests never read `examples/`", and no committed test reads it (`plans/CEX-08.md` F14, line 58). `plans/CEX-08.md` D7 (line 38) gives the same reason.
  - The recorded run (section 4, step 7) starts the real sample from a temp copy of `examples/`, which is what `units/CEX-08-nonfiction-sample-order.md` line 22 records ("tested in CEX-09 on a temp copy") and what `plans/CEX-08.md` line 151 describes as the seam. The run is not committed, as in `plans/CEX-08.md` step 7, so no committed test reads `examples/`.
  - This settles revision 1's open point 1 from the sources; it is not a point for the Navigator. The module file outranks a seam line in a done unit's plan, and the temp-copy run satisfies CEX-08's note.

### 1c. Decided here (the simplest option the sources allow)

- **D9 No signature change and no project parameter.** The in-process services keep their signatures and read the active project through `store.activeId()`: `ManuscriptService.view()` (`manuscript.service.ts` line 73), `AssemblyService.assemble(now: Date): string` (`assembly.service.ts` line 62), `PreflightService.run(now: Date): PreflightResult` (`preflight.service.ts` line 64). This agrees with AGL-24 ("on the bound project", `units/AGL-24-compile-tools.md` line 17): an agent run is bound to the project active at start (`units/AGL-03-loop-core.md` line 18), and a project switch stops that run (AGL-03 line 25). The three methods are synchronous (no `Promise`), so the active project cannot change during one call. While a run is alive its bound project is the active project, so a call from one of its tools reads the bound project. AGL-24 may still check `store.activeId() === run.projectId` before a call; that is its own choice. `plans/CEX-05.md` lines 144 and 162 left this question to CEX-09 or AGL-24; it is settled here.
- **D10 The only production change is three re-export lines.** After the imports of `compile-export.module.ts` (line 12), add a comment line `// Modules outside compile-export import these from this entry file only.` and `export { ManuscriptService } from './manuscript.service';`, `export { AssemblyService } from './assembly.service';` and `export { PreflightService } from './preflight.service';`, in the form of `project-store.module.ts` lines 24 to 27 and `setup-auth.module.ts` lines 23 and 24. Why: rule R1 of the boundary lint (`eslint.config.mjs` line 50) lets another api module import only a `*.module.ts` entry file (line 40), and `compile-export.module.ts` re-exports no class today (F6). Without the lines, the agent-loop module (AGL-24) cannot import the services. `ManuscriptWriteService` and `SnapshotService` are not re-exported: reorder and snapshot restore are not agent tools (`units/AGL-24-compile-tools.md` line 18; `plans/CEX-16.md` P1, line 28). No provider, controller or `exports` entry changes. Verified by the build, the lint and a throwaway lint probe (section 4, step 6), not by a committed test (open point 4).
- **D11 One new test file with one `it` per criterion 2 to 4.** `apps/api/test/compile-export-gate.test.ts`, following the `compile-export-*.test.ts` names. Seams are HTTP only: `POST` preflight, `POST` start from sample, `POST` active project, `GET` manuscript.
- **D12 Criterion 1 is a recorded check, not a new test.** No new code can test the earlier units' criteria beyond running their suites. The check covers the units the criterion names (CEX-02 to CEX-07) and CEX-08, which `blocked_by` (unit line 7) also names; it does not cover CEX-16 or CEX-17, which are only `parallel_with`. It is section 4, step 3, with the suite runs of steps 2 and 8, and its output is recorded.
- **D13 Guard coverage is a run, not a new list.** The two invariant test files run and pass (section 4, step 4); nothing is added to the sweep.
- **D14 Test layout.** Each fixture is a constant at the top of the test file; each `it` boots its own app (through `withManuscript`, `manuscriptLibrary` with `createTestApp`, or `withSamplesApp`). Helpers copied into the test file, because their test files do not export them: `postPreflight` (`compile-export-preflight.test.ts` lines 27 to 35), `checkOf` (`compile-export-claims-orphans.test.ts` lines 26 to 30), `hashOf`, `claimOf` and `artefactText` (same file, lines 33 to 35, 43 to 57 and 60 to 78). A local `keyOf(finding)` returns `{check, severity, path, line}`. Each `it` passes an explicit timeout of 60 000 ms, because criterion 2 boots the app six times (A7).
- **D15 A failure on main stops the gate.** If a gate test fails on main, the defect is in an earlier unit's code. The implementer stops and reports; it does not fix that code here.

## 2. Facts checked and facts assumed

### 2a. Facts checked

Unit, module and README

- **F1.** `units/CEX-09-assembly-preflight-gate.md`: front matter lines 2 to 9. `blocked_by` (line 7) names CEX-02 to CEX-08. `parallel_with` (line 8) names CEX-16 and CEX-17. `unblocks` (line 9) names CEX-10, GNP-19 and AGL-24. Scope lines 17 and 18. Criteria lines 21 to 24. No change note: `git log --oneline -- units/CEX-09-assembly-preflight-gate.md` shows one commit, `2fed3f4` (the consolidation of the units folder). Criterion 1 names CEX-02 to CEX-07; `blocked_by` also names CEX-08, which is done.
- **F2.** `modules/compile-export.md`: line 39 (the module's in-process service and its route prefix), line 42 (never reads or writes `drafts/.versions/`, never runs a graph, never calls a model), line 55 (preflight is model-free, settled), lines 57 to 59 (testing principles: external behaviour only; "The mock OpenAI server runs only to prove no model calls. Unit tests never read `examples/`" on line 59).
- **F3.** `units/README.md`: line 64 (`unblocks` is the exact inverse of `blocked_by`), lines 67 to 69 (phase gates), line 121 (phase row CEX-02 to CEX-09, gate CEX-09), line 131 (modules talk through exported in-process providers; the boundaries lint bans implementation imports), line 132 (routes behind Setup & auth's guard), line 139 (testing principles, including "Unit tests never read `examples/`").

Blockers and parallel units

- **F4.** Inverse check. `units/CEX-02-effective-order-view-model.md` line 9 (unblocks CEX-03, CEX-04, CEX-05, CEX-09). `units/CEX-03-order-writes.md` line 9 (CEX-09, CEX-14, CEX-16). `units/CEX-04-assembled-markdown.md` line 9 (CEX-09, CEX-10). `units/CEX-05-preflight-endpoint-placeholders.md` line 9 (CEX-06, CEX-07, CEX-09, CEX-10, CEX-18). `units/CEX-06-claims-orphans-checks.md` line 9 (CEX-09). `units/CEX-07-entity-links-banned-phrases.md` line 9 (CEX-09). `units/CEX-08-nonfiction-sample-order.md` line 9 (CEX-09, CEX-20). `parallel_with` on CEX-16 (line 8) and CEX-17 (line 8) names CEX-09. Every entry is symmetric; no unit file needs a change.
- **F5.** Every criterion box of `units/CEX-02-*.md` to `units/CEX-08-*.md` is `- [x]` (grep: 25 boxes, all ticked). `plans/CEX-02.md` to `plans/CEX-08.md` have `status: done` on line 3. `plans/CEX-16.md` is `status: done`; `plans/CEX-17.md` is `status: planned`. CEX-08's criterion 1 is the examples check (`npm run lint:examples`, part of the root lint); every other criterion of CEX-02 to CEX-08 is an API test.

Code on main

- **F6.** `apps/api/src/modules/compile-export/compile-export.module.ts` (27 lines): imports on lines 1 to 12 (`AssemblyService` line 5, `ManuscriptService` line 7, `PreflightService` line 10, `SnapshotService` line 12); line 14 comment; line 16 `imports` (`PlatformModule`, `ProjectStoreModule`, `SetupAuthModule`); line 17 `controllers`; lines 18 to 24 `providers`; line 25 `exports: [ManuscriptService, AssemblyService, PreflightService]`. It has no `export {` re-export line.
- **F7.** `apps/api/src/modules/project-store/project-store.module.ts` line 24 (the comment "Modules outside project-store import these from this entry file only.") and lines 25 to 32 (re-exports). `apps/api/src/modules/setup-auth/setup-auth.module.ts` lines 23 and 24 re-export `RequestIdentity` and `PreferencesReader`. `eslint.config.mjs` line 40 (the `entry` category is `**/src/modules/*/*.module.ts`), line 50 (R1), lines 70 onward (R2: only agent-loop and graph-runner are barred from each other). No file under `apps/api/src/modules/compile-export/` contains `fetch(`, an `http` import or a providers import.
- **F8.** `apps/api/src/modules/compile-export/assembly.service.ts`: line 62 `assemble(now: Date): string`; lines 117 to 127 `activeProjectId()` through `store.activeId()`.
- **F9.** `apps/api/src/modules/compile-export/preflight.service.ts`: line 64 `run(now: Date): PreflightResult`; lines 38 to 44 `PREFLIGHT_RUNNERS` in the order placeholders, unsupported-claims, orphan-scenes, entity-links, banned-phrases; lines 47 to 51 `statusOf` (an error fails the check, a warning warns it, info keeps it passing); lines 138 to 148 `activeProjectId()`.
- **F10.** `apps/api/src/modules/compile-export/manuscript.service.ts`: line 73 `view(): ManuscriptView`; line 227 `storyGraphs(projectId)`.
- **F11.** Check ids and severities. `preflight-checks.ts` line 55 `placeholders` (error, line 66). `preflight-claims-orphans.ts` line 56 `unsupported-claims` (info on lines 67 and 76; error for `unsupported`, else warning, line 85); line 158 `orphan-scenes` (warning on line 169; the stale-entry warning on lines 179 to 186; info on line 200). `preflight-links-phrases.ts` line 180 `entity-links`; line 300 `banned-phrases`.
- **F12.** Contract `packages/contracts/src/compile-export/preflight.ts`: lines 15 to 25 the finding (`check`, `severity`, `path`, optional `line`, `offset`, `length`, `message`, `ref`); line 41 `preflightSummarySchema`.

Existing tests whose fixtures are copied (read in full by the reviser)

- **F13.** `apps/api/test/compile-export-preflight.test.ts`: `C1_FILES` lines 39 to 63, whose `drafts/a.md` line 3 is `The draft has a TK in prose.` (asserted at line 80, error, status `fail`); the clean fixture lines 111 and 112 (every check `pass`, lines 124 to 126); "preflight makes no model call" lines 134 to 176 (`manuscriptLibrary`, then `settings.yaml` overwritten at lines 139 to 158 with the mock provider at `${mock.baseUrl}/scenario/text-stream/v1`, then `createTestApp` with `STATIC_ROOT`; asserts `recordsOf(mock, 'text-stream')` is `[]`).
- **F13a.** `apps/api/test/compile-export-claims-orphans.test.ts`: the K1 fixture lines 80 to 113 (`K1_A`, `K1_A_PASSAGE`, `K1_B`, `K1_B_OLD_CLAIM`, and the files map at lines 95 to 113); its first asserted finding (lines 132 to 139) is `unsupported-claims`, `error`, `drafts/a.md`, line 1; status `fail` (line 120). Orphans (b), lines 287 to 321: `project.yaml` lines 288 to 296 (order `drafts/ch01.md`, `drafts/gone.md`) and `drafts/ch01.md`; one finding `orphan-scenes`, `warning`, `project.yaml`, at the line of `- path: drafts/gone.md`, which is line 6; status `warn`. (Orphans (a), the planner's choice, needs four more graph helpers and yields four findings; (b) needs none.)
- **F13b.** `apps/api/test/compile-export-links-phrases.test.ts`: `CH01` lines 30 to 52 and `E1_FILES` lines 54 to 63; first asserted finding (line 88) `drafts/ch01.md`, line 3, all `error` (lines 74 to 76), status `fail` (line 71). `A_MD` lines 106 to 121, `DEFAULT_PROJECT`/`HOUSE_PROJECT` lines 123 to 125, `HOUSE_STYLE` lines 127 to 136; with the house style, first finding `warning`, `drafts/a.md`, line 3 (line 183), status `warn` (line 169). The original writes `HOUSE_PROJECT` and the style file after boot with `putFile`; the gate fixture writes them before boot (A4).
- **F14.** Kits. `compile-export-manuscript.kit.ts`: `STATIC_ROOT` line 16, `manuscriptLibrary` line 20 (writes `project.yaml` from the map's `project.yaml` key, else a default, lines 32 to 35), `withManuscript` line 48, `getManuscript` line 70, `manuscriptOf` line 79. `project-store-samples.kit.ts`: `SamplesFixture` line 22, `buildSamplesFixture` line 52 (the library holds only `book/project.yaml`, lines 64 to 67), `withSamplesApp` line 110 (passes `env: { SCRIBA_EXAMPLES_DIR }` to `createTestApp`), `startFromSample` line 135. `project-store-projects.kit.ts`: `postJson` line 111. `providers-client.kit.ts`: `recordsOf` reads `/__mock/scenarios/<scenario>/requests` (line 66).
- **F14a.** Mock: `e2e/fixtures/mock-openai/server.mjs` records chat (line 211) and models (line 225) requests under their scenario (line 302) and serves them per scenario (lines 239 to 245). A request to any other path is not recorded. There is no listing across scenarios.
- **F15.** Invariant tests. `apps/api/test/invariant-mutation-guard.test.ts` line 52; `apps/api/test/invariant-get-head.test.ts` lines 55, 88 and 125; `apps/api/test/invariant-sweep.ts` lines 58 and 59 and line 672 (the verdict applies to every enumerated route).
- **F16.** Tooling. `apps/api/package.json` line 2 `"name": "@bbartolome/scriba-api"`; `build`, `test` (`npm run build && vitest run`), `lint` (`eslint .`). `apps/api/vitest.config.mts` line 8 `include: ['test/**/*.test.ts']`. Root `package.json` line 26 `lint` (includes `lint:examples`), line 27 `lint:examples`.

Start from sample, activation, the sample

- **F17.** `apps/api/src/modules/project-store/samples.controller.ts` lines 24 to 26: `@Post` of the start route, `@HttpCode(201)`. `packages/contracts/src/project-store/project.ts` lines 66 to 70 (`sampleId`, `folderName`, `title`), lines 72 to 75 (`activateRequestSchema`), lines 83 to 89 (`sampleSchema`: `id`, `title`, `description`). `active-project.controller.ts` line 26: `@Post(ACTIVE_PROJECT_ROUTE)`.
- **F18.** `apps/api/src/modules/project-store/samples.service.ts`: line 60 reads `samples.yaml` from `SCRIBA_EXAMPLES_DIR`; line 79 states that the new project is not activated; lines 36 and 37 list the paths a copy leaves out. `apps/api/test/graph-runner-sample-recipe.test.ts` lines 98 to 114: start from sample (201), then `postJson` to `ACTIVE_PROJECT_ROUTE` with the folder name as `projectId` (200).
- **F19.** `examples/samples.yaml` line 1 `- id: nonfiction`. `examples/nonfiction/project.yaml`: line 4 `genrePack: nonfiction`; lines 5 to 13 the `order:` block (born-to-it `final`, what-counts-as-practice `revised`, the-ten-thousand-hour-idea `draft`, the-plateau-is-not-the-end `draft`); line 14 `export:`.
- **F20.** `plans/CEX-08.md`: D7 (line 38); F14 (line 58); step 7 with 7(b) and 7(d) (lines 120 to 124); section 5, C2 (lines 148 to 157), with the seam at line 151. `units/CEX-08-nonfiction-sample-order.md` line 22: "(tested in CEX-09 on a temp copy)".

Settled decisions and other units

- **F21.** `plans/DECISIONS.md` (grep by unit id): line 2878 (the open chapter count); lines 3058 to 3062 (option B, four chapters); line 6491 and lines 6532 to 6533 (the recurring `scriba-web` cold-clone timeout); line 6538 ("CEX-09 is now available (no plan)"). No entry records a Navigator decision on CEX-09, CEX-10, AGL-24 or GNP-19 that this plan touches.
- **F22.** Downstream units. `units/CEX-10-pandoc-runner-md-export.md` line 7 (`blocked_by` CEX-04, CEX-05, CEX-09, PLT-10), line 15 (export always runs preflight first). `units/AGL-24-compile-tools.md` line 7 (`blocked_by` AGL-08, CEX-09, CEX-15), line 17 (in-process calls on the bound project), line 18 (reorder and restore are not agent tools). `units/GNP-19-fiction-gate.md` line 7 (`blocked_by` names CEX-09 for the assembly order) and scope line 17 (fiction order through the real start-from-sample HTTP flow and the manuscript GET). `units/CEX-20-milestone-gate.md` line 7 (no CEX-09). `units/AGL-03-loop-core.md` lines 18 and 25.
- **F23.** Branches and plans in flight, at `7e941b5`. `unit/CEX-17` is 3 commits ahead of main and changes only `apps/web/src/app/app.routes.ts` and five files under `apps/web/src/app/features/compile-export/`. `unit/GNP-14` (1 ahead) changes packs files, one API pack test and two new mock scenarios (`pack-character_builder.json`, `pack-world_builder.json`); `unit/GRR-15` (5 ahead) changes graph-runner web and e2e files. The other `unit/*` branches are 0 ahead. Plans with status draft or planned: `plans/CEX-17.md`, `plans/GNP-14.md`, `plans/GRR-15.md` and this plan. None of the others names a path under `apps/api/src/modules/compile-export/` or `apps/api/test/compile-export-*`.

### 2b. Facts assumed, not checked

- **A1.** `npm ci` succeeds in the worktree and Node 26 is on PATH. Step 1 records both.
- **A2.** The API suite and the lint are green on main. Step 2 records the result.
- **A4.** The banned-phrases fixture gives the same first finding when the style profile and `project.yaml` are written before boot rather than after it (F13b). Step 5 confirms it; a mismatch is reported (D15), not patched.
- **A5.** The provider client reaches the mock only through the chat and models endpoints of its configured scenario (F13, F14a).
- **A7.** Vitest's default timeout is 5 seconds. The explicit 60 000 ms of D14 is a safe margin; it is not measured.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/compile-export.module.ts` | edit, four lines | After the imports (line 12), the comment line and the three re-export lines of D10. No provider, controller or `exports` entry changes. |
| `apps/api/test/compile-export-gate.test.ts` | new | Three `it` blocks T2, T3 and T4, for criteria 2, 3 and 4 (D11, section 5), with the local helpers of D14. |

Not changed: `units/**` (the orchestrator ticks the boxes at merge); `modules/**`; `plans/**`; `packages/contracts/**`; `apps/web/**`; `e2e/**`; `examples/**`; the other compile-export source files; `eslint.config.mjs`; the existing kits and tests (the gate test imports the kits and does not edit them).

## 4. Method

Run from a new worktree at `/Users/bbartolome/workspace/scriba-prototype-wt/CEX-09` on branch `unit/CEX-09`, created from main: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/CEX-09 -b unit/CEX-09 main`. Record `node -v` and `npm -v` beside each result. Do not push and do not open a pull request.

1. **Runtime and install.** `node -v` prints `v26.x`; `npm -v` prints `11.x`; `npm ci` exits 0 (A1).
2. **Baseline.** `npm test -w @bbartolome/scriba-api` exits 0; record the file and test counts. `npm run lint -w @bbartolome/scriba-api` exits 0 (A2). If a baseline fails on main, stop and report (D15).
3. **Criterion 1 check (no code).** From the worktree:
   - `grep -c '^- \[ \]' units/CEX-0[2-8]-*.md` prints 0 for each of the seven files.
   - `grep -l '^status: done' plans/CEX-0[2-8].md` lists the seven plans.
   Expected: every count 0 and seven paths listed. Record the output.
4. **Guard coverage.** `npm test -w @bbartolome/scriba-api -- invariant-` exits 0. Record the files run. A failure stops the gate and is reported.
5. **The gate tests.** Write `apps/api/test/compile-export-gate.test.ts` with T2, T3 and T4 (section 5). Run `npm test -w @bbartolome/scriba-api -- compile-export-gate`. Expected: all three pass on main, because the code exists; these are verifications, not a red-green cycle. Then two negative controls, which are not committed:
   - (a) T4: remove the `order:` block from the test's fixture `project.yaml`; run; expect T4 to fail (`orderSource` `alphabetical`). Revert the edit.
   - (b) T2: change the placeholders fixture to `# Chapter one`, a blank line and `A clean sentence.`; run; expect T2 to fail on the missing placeholders finding. Revert the edit.
   Expected: both controls fail, and both reverts restore a passing run.
6. **Re-export.**
   - (a) Add the four lines of D10 to `compile-export.module.ts`. Run `npm run build -w @bbartolome/scriba-api` and `npm run lint -w @bbartolome/scriba-api`, and `npx prettier --check apps/api/src/modules/compile-export/compile-export.module.ts apps/api/test/compile-export-gate.test.ts`. Expected: each exits 0.
   - (b) Throwaway lint probe (not committed). Write `apps/api/src/modules/agent-loop/tmp-cex09-probe.ts` with `import { AssemblyService, ManuscriptService, PreflightService } from '../compile-export/compile-export.module';` and `export const probe = [AssemblyService, ManuscriptService, PreflightService];`. From `apps/api`, `npx eslint src/modules/agent-loop/tmp-cex09-probe.ts` exits 0. Change the first import to `import { ManuscriptService } from '../compile-export/manuscript.service';` (keep the other two from the module file); the same command exits 1 with a `boundaries/dependencies` error. Delete the probe file. Record both results. This shows that AGL-24 can import the three classes and only through the entry file.
7. **Criterion 4, real sample on a temp copy (not committed; D8).** `T=$(mktemp -d) && cp -R examples "$T/examples"`. Write a throwaway `apps/api/test/tmp-cex09-real-sample.test.ts`: the body of T4, but with `samples` set to `process.env.CEX09_SAMPLES` instead of the fixture samples folder, the library built as in T4, folder `cex09` and title `CEX09`. Run `CEX09_SAMPLES="$T/examples" npm test -w @bbartolome/scriba-api -- tmp-cex09`: expected pass. Then remove the `order:` block of the copy with the `sed` of `plans/CEX-08.md` step 7(d) (`sed -i.bak '/^order:/,/^export:/{/^export:/!d}' "$T/examples/nonfiction/project.yaml"`) and run again: expected fail. Delete the throwaway test file and `rm -rf "$T"`. Record both results.
8. **Root gates.** From the worktree: `npm run build`, `npm test` and `npm run lint` (which runs `lint:examples`, CEX-08's criterion 1). Expected: each exits 0. A "Test timed out" line in `scriba-web` is the cold-clone flake recorded in `plans/DECISIONS.md` (lines 6491 and 6532 to 6533). Rerun once and record both runs.
9. **Commit.** `git status --short -uall` lists exactly `apps/api/src/modules/compile-export/compile-export.module.ts` and `apps/api/test/compile-export-gate.test.ts` (no `tmp-cex09-*` file). `git add` those two paths and commit with `feat(CEX-09): assembly-preflight gate test and module re-exports`. Do not commit `units/` or `plans/`, and do not push.
10. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its pass condition (section 5) holds. The orchestrator ticks the boxes at merge; the implementer edits no unit file.

## 5. Acceptance criteria and tests

The four criteria are unit lines 21 to 24. Each has one test or check. The seams are HTTP and files only.

| Criterion | Test or check | File and seam | Pass condition |
|---|---|---|---|
| 1. CEX-02…CEX-07 criteria pass on `main` | C1: section 4, steps 2, 3 and 8 (no new test, D12) | recorded command output | step 3: every count 0 and seven plans `status: done`; step 2: the API suite exits 0; step 8: root `npm test` and `npm run lint` exit 0 |
| 2. Each of the five checks has a fixture project that triggers it with the right check id, severity, path and line; a clean fixture passes all five | T2 `it('each of the five checks fires with its id, severity, path and line, and a clean fixture passes all five', ..., 60000)` | `compile-export-gate.test.ts`; one `withManuscript` per fixture; `POST` preflight | see the fixture list below; step 5(b) fails |
| 3. Preflight makes no outbound HTTP call (the mock OpenAI server received no request) | T3 `it('preflight runs all five checks and sends the mock OpenAI server no request', ..., 60000)` | same file; `manuscriptLibrary`, `createTestApp`, `startMockOpenAI`, `recordsOf` | see the criterion 3 fixture below |
| 4. The nonfiction sample started via "start from sample" returns its authored, non-alphabetical order with its statuses | T4 `it('start from sample keeps the authored order and statuses of the nonfiction sample', ..., 60000)` and the recorded run of step 7 (D8) | a fixture samples folder through `SCRIBA_EXAMPLES_DIR`; `POST` start (201), `POST` active (200), `GET` manuscript | T4 passes and step 5(a) fails; step 7 passes on the copy of the real sample and fails without its order block |

Criterion 2 fixtures. For each fixture, the response is 200 and parses with `preflightResultSchema`; `checkOf(result, id).status` is as listed; `checkOf(result, id).findings.map(keyOf)` contains (`toContainEqual`) the listed `{check, severity, path, line}`. The fixtures are copied byte for byte from the named lines (F13, F13a, F13b).

- **placeholders.** `{'drafts/a.md': '# Chapter one\n\nThe draft has a TK in prose.\n'}` (the first three lines of `C1_FILES['drafts/a.md']`). Expected `{placeholders, error, drafts/a.md, 3}`; status `fail`.
- **unsupported-claims.** The K1 files map of `compile-export-claims-orphans.test.ts` lines 95 to 113, with `K1_A`, `K1_A_PASSAGE`, `K1_B`, `K1_B_OLD_CLAIM` and the helpers `hashOf`, `claimOf`, `artefactText` (D14). Expected `{unsupported-claims, error, drafts/a.md, 1}`; status `fail`.
- **orphan-scenes.** Orphans (b), lines 288 to 302: `project.yaml` = the six lines `schemaVersion: 1`, `title: Book`, `genrePack: nonfiction`, `order:`, `  - path: drafts/ch01.md`, `  - path: drafts/gone.md` and a final newline; `drafts/ch01.md` = `Chapter one.\n`. Expected `{orphan-scenes, warning, project.yaml, 6}`; status `warn`.
- **entity-links.** `E1_FILES` with `CH01` (`compile-export-links-phrases.test.ts` lines 30 to 63). Expected `{entity-links, error, drafts/ch01.md, 3}`; status `fail`.
- **banned-phrases.** `{'project.yaml': HOUSE_PROJECT, 'entities/house-style.md': HOUSE_STYLE, 'drafts/a.md': A_MD}` (lines 106 to 136). Expected `{banned-phrases, warning, drafts/a.md, 3}`; status `warn` (A4).
- **Clean fixture.** `{'drafts/a.md': '# Chapter one\n\nA clean sentence.\n', 'drafts/b.md': 'A second clean sentence.\n'}` (`compile-export-preflight.test.ts` lines 111 and 112). Expected: `result.checks.map((c) => c.id)` is the five ids, and every check has status `pass`. Findings of severity `info` are allowed, because `info` keeps a check passing (F9).

Criterion 3 fixture. The K1 claims fixture above, so that the check that reads grounding results runs on a real artefact. The setup is that of `compile-export-preflight.test.ts` lines 135 to 163: `startMockOpenAI()`, `manuscriptLibrary(K1 files)`, `settings.yaml` overwritten with `active: 'book'` and the single mock provider at `${mock.baseUrl}/scenario/text-stream/v1` with `PROVIDER_DEFAULTS` and `appDefault`, `createTestApp({libraryDir, staticRoot: STATIC_ROOT})`, `sessionCookie`; `finally` closes the app and the mock and removes the library. Expected: the response is 200; `result.checks.map((c) => c.id)` equals `['placeholders', 'unsupported-claims', 'orphan-scenes', 'entity-links', 'banned-phrases']` (F9), so all five checks ran; `checkOf(result, 'unsupported-claims').status` is `fail`; `await recordsOf(mock, 'text-stream')` is `[]`. The configured scenario is the only address of the mock the app knows, and the mock records both endpoints the provider client calls there (F14a, A5), so this covers the criterion's "the mock OpenAI server received no request".

Criterion 4 fixture and expected view (D8). The test builds its own `SamplesFixture` with `mkdtempSync`, as `buildSamplesFixture` does: the library holds only `book/project.yaml` (`schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n`); the samples folder holds `samples.yaml` with one entry (`- id: nonfiction`, `title: Nonfiction`, `description: The gate's copy of the nonfiction order.`), and `nonfiction/project.yaml` with `schemaVersion: 1`, `title: The Long Apprenticeship`, `genrePack: nonfiction` and the `order:` block of `examples/nonfiction/project.yaml` lines 5 to 13 byte for byte, and the four drafts named there, each `# Chapter N\n\nOne line.\n`. Inside `withSamplesApp`: `startFromSample` with `{sampleId: 'nonfiction', folderName: 'gate-sample', title: 'Gate Sample'}` (201); `postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {projectId: 'gate-sample'})` (200); `manuscriptOf(await getManuscript(app, cookie))`. `finally` calls `fixture.remove()`. Expected view:

- `entries.map((e) => e.path)`: `drafts/born-to-it.md`, `drafts/what-counts-as-practice.md`, `drafts/the-ten-thousand-hour-idea.md`, `drafts/the-plateau-is-not-the-end.md`, in this order.
- `entries.map((e) => e.status)`, in the same order: `final`, `revised`, `draft`, `draft`.
- `orderSource` `project`; every entry has `inOrderField` true and `graphOrdered` false; `warnings` is empty.
- The list of paths is not equal to its sorted form.

No committed test reads the real `examples/` (D8); no test reads an internal service (D4).

## 6. Agreement with downstream units and later phases

- **CEX-10 (export; blocked by CEX-09).** Uses `AssemblyService.assemble(now)` and `PreflightService.run(now)` inside its own module, so it needs no re-export. CEX-09 keeps both signatures. Unit scope line 17 says the export service is exported "once CEX-10 lands"; CEX-09 cannot export it now. Its re-export line belongs in the block of D10, added by CEX-10 or by AGL-24, whichever needs it first; this is a note for those planners, not a CEX-09 step. The two are sequential, so there is no conflict.
- **CEX-11 to CEX-15.** Depend on CEX-09 only through CEX-10. No change.
- **CEX-18.** Uses the HTTP preflight and export, not the in-process services. No change.
- **CEX-20.** Does not name CEX-09 in `blocked_by` (F22). CEX-09 changes no sample file or route. No change.
- **AGL-24 (compile tools; blocked by CEX-09 and CEX-15).** Imports the three classes from `compile-export.module.ts` through D10 (proved by the probe of step 6(b)). `assemble_manuscript` uses `ManuscriptService.view()` (and may use `AssemblyService.assemble(now)`), `run_preflight` uses `PreflightService.run(now)`, `export_manuscript` uses CEX-10's export. The bound project agrees (D9). Reorder and restore are not re-exported (D10), matching AGL-24 line 18. Agrees.
- **GNP-19 (fiction gate; blocked by CEX-09 for the assembly order).** Its fiction-order check uses the real start-from-sample HTTP flow and the manuscript GET (unit line 17). CEX-09 changes no route and no response shape; T4's seam is the same flow. Agrees.
- **CEX-16 (done).** D10 adds lines after the imports of a file CEX-16 changed, touching none of its lines, and keeps `SnapshotService` out of the re-exports (CEX-16 P1). Agrees.
- **CEX-17 (planned; parallel with CEX-09; branch 3 commits ahead).** Changes `apps/web/src/app/app.routes.ts` and files under `apps/web/src/app/features/compile-export/` only (F23; `plans/CEX-17.md` lines 136 to 144, "Not changed: … `apps/api/**`"). CEX-09 changes two API files only. Disjoint paths, and neither reads the other's output. CEX-17 first: CEX-09's root gates (step 8) also run CEX-17's web specs, which are on main then; nothing in CEX-09 affects them. CEX-09 first: CEX-17 rebases over two API files it never reads. Either order is correct.
- **Other in-flight branches (F23).** None changes a compile-export file. GNP-14's new mock scenarios do not touch `text-stream`, which T3 reads.

## 7. Other plans on the same files

- `apps/api/src/modules/compile-export/compile-export.module.ts`: changed by CEX-02 to CEX-05 and CEX-16, all merged (F6). CEX-10 changes it later, after CEX-09. No plan in draft or planned changes it now (F23).
- `apps/api/test/compile-export-gate.test.ts`: new. No other plan names it.

## 8. Open points (all settled by the reviser)

1. **Criterion 4 and the real sample.** Settled by D8: committed fixture test T4 plus the recorded temp-copy run of step 7; both are required.
2. **Bound project.** Settled by D9: no parameter; the active project is the bound project for a live run (AGL-03 lines 18 and 25; synchronous methods).
3. **Criterion 1 scope.** Settled by D12: CEX-02 to CEX-07 as named, plus CEX-08 from `blocked_by`; CEX-16 is dropped from the check (it is only `parallel_with`).
4. **The re-export is not a committed test.** No criterion names it, and the testing principles forbid tests of internal services (`modules/compile-export.md` line 58). It serves scope line 17 and is verified by the build, the lint and the throwaway probe of step 6(b). AGL-24's tests exercise it later.
5. **Criterion 3 scope.** Settled in section 5: the text-stream scenario is the only address the app has for the mock, and both provider endpoints there are recorded (F14a). The fixture is now the K1 claims fixture, so the grounding-results check runs on a real artefact.
6. **Copied fixtures.** Read in full (F13 to F13b). The orphans fixture is case (b), not (a), because it needs no graph helpers and gives one finding at a literal line. The banned-phrases fixture is written before boot (A4).
7. **Cold-clone flake.** The `scriba-web` timeout (F21) may recur at step 8. It is recorded, not fixed here.

## 9. Review parts

One part (a small plan).

- **Part 1.** Steps 1 to 10: the runtime and baseline (1, 2), C1 (3, with 2 and 8), guard coverage (4), T2, T3 and T4 with the negative controls (5), the re-export and its probe (6), the real-sample run for criterion 4 (7), the root gates (8), the commit and the record (9, 10). Tests: C1, T2, T3, T4 (criteria 1 to 4).
