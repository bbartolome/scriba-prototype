---
id: GNP-19
status: draft
---
# GNP-19 plan — fiction gate: the fiction-order check and the phase:fiction checklist

Batch: [GNP-19] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `6ba9642` (HEAD when read; the working tree was clean). The planner changed only this file, and ran no build, test, lint or npm command.

The unit file was read in full (lines 1 to 32). It has no change note: no "Moved to", "Removed by revision", "Loosened by" or "Reworded by" line, and no DECISIONS entry names a change to it. The unit is the spec. Its five criteria are copied in section 5 unchanged.

What this unit adds: one committed API test (the fiction-order check), the byte-copy fixture that it runs on, and the checkbox and status edits at merge. It changes no product code, route, contract, pack, e2e spec or module file. Four of its five criteria are tests that earlier units already committed or that CI already runs; section 5 names each one.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the README

- **G1 Scope.** One committed API test and its fixture. No product code, route, contract, pack, e2e spec or module file changes. Source: unit lines 16 and 17 (the Scope lists only the fiction-order check); `modules/genre-packs.md` line 89 ("this module adds no e2e step").
- **G2 Unit tests never read `examples/`.** The committed test reads a checked-in copy under `apps/api/test/fixtures/`, never the shipped sample. Source: `units/README.md` line 141; `modules/genre-packs.md` line 88.
- **G3 Test seam.** API tests boot the composed app with `createTestApp` against a temp library and assert external behaviour only (HTTP responses, files). Source: `units/README.md` line 141; `modules/genre-packs.md` line 85.
- **G4 The order is read through the real flow.** Start from sample (POST), activate the new project (POST `ACTIVE_PROJECT_ROUTE`), then GET the manuscript of Compile & export. Source: unit line 17; `MANUSCRIPT_ROUTE` (`packages/contracts/src/compile-export/routes.ts` line 4).
- **G5 The criteria stand.** Each criterion keeps its text and gets the test of section 5. None is weakened, split away or reworded. Source: unit lines 20 to 24.
- **G6 Blockers.** `blocked_by` (unit line 7) names GNP-13 to GNP-18, CEX-09 and GRR-17. All of them have `status: done` (section 2a, F2).
- **G7 Unblocks.** `unblocks: [GNP-24]` (unit line 9) is the exact inverse: GNP-24's `blocked_by` (`units/GNP-24-remaining-shapes-gate.md` line 7) names GNP-19, and no other unit names GNP-19 in `blocked_by`. Source: `units/README.md` line 64.
- **G8 Parallel units.** `parallel_with` (unit line 8) names GNP-20, GNP-21 and GNP-22. All three are `status: done`. Source: `plans/GNP-20.md`, `plans/GNP-21.md`, `plans/GNP-22.md` (line 3 of each).
- **G9 Real-model eval.** The "small and a larger local model" run is the Agent loop's manual eval. It is not automated, and its voice judgement is a person's. Source: `modules/genre-packs.md` line 90; `plans/AGL-25.md` section 5 (the reader judges voice from the report). It cannot be run here; see section 7, point 1.

### 1b. Settled by DECISIONS and other plans

- **DECISIONS line 6774 (2026-11-19, GNP-16 review):** the real-model run of the dialogue tool is carried by GNP-19. Criterion 5 is therefore open here.
- **DECISIONS lines 7528 to 7534 (2026-11-20, GRR-17):** a criterion that cannot be tested locally stays unticked, and the unit completes (option (a)). GRR-17 merged on that basis and unblocks GNP-19 (line 7623). This is the precedent for criterion 5. The Navigator decides the GNP-19 case.
- **DECISIONS lines 7194 to 7198 (2026-11-20, GNP-18):** a check that reads `examples/` is a recorded run on the real files, not a committed test. Precedent for criterion 3.
- **`plans/GRR-16.md` line 49 (C5):** the test copy of a sample is a checked-in byte copy under `apps/api/test/fixtures/`. Precedent for the fixture (D2).
- **`plans/GNP-18.md` sections 3 to 5:** GNP-18's T1 and T2 are the tests of criterion 3, and GNP-18 says GNP-19 needs no change to its files.
- **DECISIONS lines 7042 to 7048 (2026-11-20, GNP-15):** a rerun rule for an unrelated flaky `apps/api` failure. It is a decision for GNP-15 only (section 7, point 6).

### 1c. Decided here (the simplest option the sources allow)

- **D1 Test file.** `apps/api/test/packs/fiction-gate.test.ts`, one `it`, beside `core-gate.test.ts` (the GNP-05 gate test, line 13 of that file).
- **D2 Fixture.** `apps/api/test/fixtures/fiction-sample/` holds `samples.yaml` (a byte copy of `examples/samples.yaml`) and `fiction/` (a byte copy of the eleven files of `examples/fiction/`). The nonfiction folder is not copied, because the test never starts it. Byte identity is checked in steps 3 and 8.
- **D3 Writes stay in temp folders.** The test copies the fixture into a temp samples folder, builds a temp library with `book/project.yaml`, and calls `withSamplesApp` (`apps/api/test/project-store-samples.kit.ts` line 110). Precedent: `apps/api/test/graph-runner-sample-recipe.test.ts` line 31 (`FIXTURE_SAMPLE`, copied with `cpSync`) and `apps/api/test/compile-export-gate.test.ts` line 387 (`buildGateSamples`).
- **D4 Assertions.** The manuscript paths are `drafts/arrival.md`, `drafts/the-storm.md` and `drafts/ledger.md`, in that order. The `drafts/` prefix is the form of `MANUSCRIPT_PATH_PATTERN` (`packages/contracts/src/project-store/order-export.ts` lines 21 and 22). Each entry has `graphOrdered` true, because the order comes from the story graph. `warnings` is `[]`, so no graph was dropped as invalid. Not asserted: `orderSource`, `status`, `part`, `words` and `revision`, because the criterion does not name them.
- **D5 Tests for criteria 1 to 3.** They are existing tests, named in section 5. This unit adds none of them.
- **D6 Negative control for criterion 4.** Step 5b edits only the fixture copy: with the order edges e2 and e3 removed, the manuscript falls back to alphabetical order, so the committed test must fail. This shows the test does not pass by alphabetical accident.
- **D7 Ticks.** A checkbox is ticked only when its test passed on `unit/GNP-19`. This plan ticks nothing.

## 2. Facts checked and facts assumed

### 2a. Facts checked

Commands used: `cat`, `sed -n`, `grep -n`, `grep -l`, `find`, `git log`, `git status` and `git worktree list`, all read-only, at main `6ba9642`. No build, test, lint or npm command was run.

- **F1.** `units/GNP-19-fiction-gate.md`: front matter lines 1 to 10; Scope line 17; criteria lines 20 to 24; demo lines 27 to 32.
- **F2.** `grep -n "^status:"`: `plans/GNP-13.md` line 4, and `plans/GNP-14.md` to `GNP-18.md`, `CEX-09.md` and `GRR-17.md` line 3. All say `status: done`.
- **F3.** `grep -l "^status: \(draft\|planned\)" plans/*.md` printed nothing (exit 1). No other plan changes the same files. `plans/GNP-19.md` did not exist before this draft.
- **F4.** `grep -n "GNP-19" units/*.md`: GNP-19's `blocked_by` (line 7) names GNP-13 to GNP-18, CEX-09 and GRR-17 (the last two as quoted phases). GNP-24 line 7 names GNP-19. The `unblocks` lines of GNP-13 to GNP-18 (line 9 of each), CEX-09 (line 9) and GRR-17 (line 9) name GNP-19. The `parallel_with` lines of GNP-20, GNP-21 and GNP-22 (line 8 of each) name GNP-19.
- **F5.** `packages/packs/fiction/tools/` holds `character_builder.yaml`, `world_builder.yaml`, `scene_builder.yaml`, `dialogue.yaml` and `plot_manager.yaml`, each with `enabled: true`. `packages/packs/fiction/entity-types/` holds `character.yaml`, `place.yaml` and `world-rule.yaml`.
- **F6.** Entity-kind rule: `packages/packs/test/checks.ts` lines 89 to 96 turn the pack-lint `entity-kind` warning into an error in `contentChecks`. `packages/packs/test/real-packs.test.ts` line 9 asserts that `lintPacks` gives no error and `contentChecks` gives nothing on `packages/packs`. CLI: root `package.json` line 28 (`lint:packs`) and `scripts/lint-packs.mjs`.
- **F7.** `apps/api/test/packs/dialogue.test.ts`: `it(` at line 78 (AC 2, the golden) and at line 99 (AC 3, a one-character call returns an Ajv error that names `characterIds`).
- **F8.** Compile & export: `MANUSCRIPT_ROUTE` is `/api/compile-export/manuscript` (`packages/contracts/src/compile-export/routes.ts` line 4); `@Get(MANUSCRIPT_ROUTE)` at `apps/api/src/modules/compile-export/manuscript.controller.ts` line 28; `view()` at `manuscript.service.ts` line 73.
- **F9.** Membership: the top-level `.md` files directly in `drafts/` (`manuscript.service.ts` `members`, line 212). `find examples/fiction -type f` shows that the fiction sample's `drafts/` holds exactly `arrival.md`, `the-storm.md` and `ledger.md`.
- **F10.** Projection: `pairsOf` (`manuscript.service.ts` line 47) keeps only `order` edges whose two ends are different body files. In `examples/fiction/graphs/story.json`, e1 (`arrival-1` to `arrival-2`, both `drafts/arrival.md`) is dropped; e2 (`arrival-2` to `storm`) becomes arrival to the-storm; e3 (`storm` to `ledger`) becomes the-storm to ledger; e4 and e5 are not `order` edges; e6 (`pov`) ends at an entity node. Projected pairs: `[arrival, the-storm]` and `[the-storm, ledger]`.
- **F11.** Ordering: `effectiveOrder` (`apps/api/src/modules/compile-export/effective-order.ts` line 89) puts the graph block first, in Kahn order with the smallest path first (`topological`, line 66). With the pairs above the result is arrival, the-storm, ledger. With no pairs the rest is alphabetical: arrival, ledger, the-storm. `orderSource` is `graph+project` (the expression at line 136), not asserted.
- **F12.** Start from sample: the body has `sampleId`, `folderName` and `title` (`packages/contracts/src/project-store/project.ts` lines 66 to 70). The new project is not activated (`apps/api/src/modules/project-store/samples.service.ts` line 79). Activation is `POST ACTIVE_PROJECT_ROUTE` (`apps/api/src/modules/project-store/active-project.controller.ts` line 26).
- **F13.** Kits: `apps/api/test/project-store-samples.kit.ts` exports `SamplesFixture` (line 22), `withSamplesApp` (line 110) and `startFromSample` (line 135). `apps/api/test/project-store-projects.kit.ts` exports `postJson` (line 111). `apps/api/test/compile-export-manuscript.kit.ts` exports `getManuscript` (line 77) and `manuscriptOf` (line 86). `buildSamplesFixture` (line 52 of the samples kit) writes `book/project.yaml` as `schemaVersion: 1`, `title: Book`, `genrePack: nonfiction`.
- **F14.** Precedent: `apps/api/test/compile-export-gate.test.ts` line 449, "start from sample keeps the authored order and statuses of the nonfiction sample". Its temp samples folder is built by `buildGateSamples` (line 387).
- **F15.** Examples on main: `examples/samples.yaml` lists `nonfiction` then `fiction`. `examples/fiction/` holds eleven files (`drafts/` 3, `entities/` 5, `graphs/` 2, `project.yaml` 1) and no dot-files. Commit `198bd46` added them (`git log -- examples/fiction`).
- **F16.** Test-file rule: `scripts/examples-check/m1.mjs` lines 26 to 33 and 201 to 227 refuse a `*.test.*` file that names `examples/`, or that has a quoted `examples` on a line with root, repo, here, dirname or cwd.
- **F17.** Prettier: `.prettierignore` lists `/units/`, `/modules/`, `/plans/`, `/package-lock.json` and `/apps/api/test/fixtures/lint/`. The fixture copy is therefore checked by `prettier --check .`.
- **F18.** Eval: root `package.json` line 31 (`eval:agent`); `scripts/eval-agent/README.md` "Run it" (`--model`, `--case`, default `--base-url` `http://127.0.0.1:11434/v1`, reports in `eval-reports/`); `scripts/eval-agent/cases/dialogue.json` (sample `fiction`, `expect.reason` `completed`, `expect.tools` `["dialogue"]`).
- **F19.** Worktree layout: `git worktree list` shows the main checkout and worktrees under `/Users/bbartolome/workspace/scriba-prototype-wt/`, the layout that CEX-08 D8 follows.
- **F20.** Since `efbeed1`, the only commit on main is `6ba9642` (the queue file). No file under `examples/`, `apps/api` or `packages/packs` changed. The working tree was clean.

### 2b. Facts assumed (not run)

- **A1.** The baseline tests named in section 5 pass on main (the packs suite, the `dialogue` file, the examples check, GNP-18's T2). Step 2 of section 4 confirms them.
- **A2.** The fiction start-from-sample flow and the manuscript GET work without a model and without a packs path, as the nonfiction order test of F14 does. Step 5 confirms.
- **A3.** `dialogue-scene.json` parses under `graphFileSchema`, so the manuscript view reports no `invalidGraph` warning. GNP-18's T1 checks this, and step 8 reruns it.
- **A4.** `npm ci` in a new worktree works (the GNP-15 and GNP-18 precedent).

## 3. Files to change

Only the paths below change. Thirteen paths are new: one test file and twelve fixture files.

| Path | Change | Content |
|---|---|---|
| `apps/api/test/packs/fiction-gate.test.ts` | new | one `it`: criterion 4 (section 5, C4) |
| `apps/api/test/fixtures/fiction-sample/samples.yaml` | new | byte copy of `examples/samples.yaml` (D2) |
| `apps/api/test/fixtures/fiction-sample/fiction/**` | new | byte copy of the eleven files of `examples/fiction/` (D2) |
| `units/GNP-19-fiction-gate.md` | edit before merge (step 13) | ticks the boxes whose tests passed; the criterion text and the front matter do not change |
| `plans/GNP-19.md` | edit before merge (step 13) | `status: done` |

Generated `dist/` and `node_modules/` are git-ignored (as PLT-02 section 2 states); step 11 checks that they add no status line. No other file changes.

## 4. Method

Run from the new worktree (step 1). Record `node -v` and `npm -v` beside each result. Do not push, merge or delete any branch.

0. Runtime: `node -v` prints `v26.x` (`package.json` `engines` `>=26 <27`); `npm -v` prints `11.20.0`.
1. Worktree: `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GNP-19 -b unit/GNP-19 main`, then `cd` there and run `npm ci`. Expected: exit 0.
2. Baseline, before any file is written. (a) `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`: exit 0. (b) `npm run lint:examples`: exit 0 with the stdout line `examples check passed: 2 sample(s)`. (c) `npm run lint:packs`: exit 0. (d) `npx vitest run --root apps/api test/packs/dialogue.test.ts`: exit 0, 2 passed. (e) `npm test -w @bbartolome/scriba-packs`: exit 0. (f) GNP-18's T2 script (`plans/GNP-18.md` section 3, step 6), run from the repository root: exit 0 and the `T2 ok` line. If any of these fails, stop and report; the failure is not this unit's.
3. Fixture copy: `mkdir -p apps/api/test/fixtures/fiction-sample`, then `cp examples/samples.yaml apps/api/test/fixtures/fiction-sample/samples.yaml` and `cp -R examples/fiction apps/api/test/fixtures/fiction-sample/fiction`. Then `diff -r examples/fiction apps/api/test/fixtures/fiction-sample/fiction` (exit 0, no output) and `cmp examples/samples.yaml apps/api/test/fixtures/fiction-sample/samples.yaml` (exit 0). Use `cp`, not an editor, so the bytes are identical.
4. Test file: write `apps/api/test/packs/fiction-gate.test.ts` with the Write tool. It imports from `node:fs`, `node:os`, `node:path` and `vitest`; `ACTIVE_PROJECT_ROUTE` from `@bbartolome/scriba-contracts/project-store` (the same import as `graph-runner-sample-recipe.test.ts`); and `getManuscript`, `manuscriptOf`, `postJson`, `startFromSample`, `withSamplesApp` and the type `SamplesFixture` from the three kits of F13. It sets `const FIXTURE = resolve(__dirname, '..', 'fixtures', 'fiction-sample')`. A helper `buildFictionSamples(): SamplesFixture` makes a temp library with `book/project.yaml` (the text of F13), copies `FIXTURE` into a temp samples folder with `cpSync(..., { recursive: true })`, and returns a `remove` that deletes both folders. The one `it`, named `start from sample orders the fiction sample by its order edges: arrival, the-storm, ledger`, has timeout 60000 and does the following inside `withSamplesApp`: `startFromSample` with `{ sampleId: 'fiction', folderName: 'lamp-keepers', title: 'The Lamp Keepers' }`, expecting 201; `postJson` to `ACTIVE_PROJECT_ROUTE` with `{ projectId: 'lamp-keepers' }`, expecting 200; `manuscriptOf(await getManuscript(app, cookie))`; then it expects the paths of D4, every `graphOrdered` to be `true`, and `warnings` to equal `[]`. A `finally` calls `fixture.remove()`. Do not write the text `examples/` in the file or its comments, and do not quote the word `examples` (F16).
5. Criterion 4 (C4): `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npx vitest run --root apps/api test/packs/fiction-gate.test.ts`. Expected: exit 0, 1 passed.
5b. Negative control (recorded, not a criterion). Edit only the copy, not `examples/`: remove the edges `e2` and `e3` from `apps/api/test/fixtures/fiction-sample/fiction/graphs/story.json`. Run the command of step 5. Expected: FAIL, with the manuscript paths `drafts/arrival.md`, `drafts/ledger.md`, `drafts/the-storm.md` (F11). Then restore the copy with `cp examples/fiction/graphs/story.json apps/api/test/fixtures/fiction-sample/fiction/graphs/story.json` and rerun the `diff -r` of step 3 (exit 0).
6. Criterion 1 (C1): `npm test -w @bbartolome/scriba-packs` (exit 0; `real-packs.test.ts` passes) and `npm run lint:packs` (exit 0).
7. Criterion 2 (C2): `npx vitest run --root apps/api test/packs/dialogue.test.ts`. Expected: exit 0, 2 passed.
8. Criterion 3 (C3): `npm run lint:examples` (exit 0, `examples check passed: 2 sample(s)`), then GNP-18's T2 script again (exit 0, the `T2 ok` line), then the two identity checks of step 3 (exit 0). These checks read `examples/`. They are the recorded run of criterion 3, not a committed test.
9. Prettier: `npx prettier --check apps/api/test/packs/fiction-gate.test.ts apps/api/test/fixtures/fiction-sample`. Expected: exit 0. If only the test file fails, run `npx prettier --write apps/api/test/packs/fiction-gate.test.ts` and rerun step 5. If the fixture fails, stop and report: the fixture is a byte copy of files that GNP-18 already formatted.
10. Root gates: `npm run build`, `npm test` and `npm run lint`, each exit 0. Record the test counts of each workspace. If a failure is in a file that this unit does not change, stop and report (section 7, point 6). Do not rerun to make it pass.
11. Tree check: `git status --short` lists exactly the thirteen paths of section 3 as untracked, and nothing else. `find apps/api/test/fixtures/fiction-sample -type l` prints nothing. `find apps/api/test/fixtures/fiction-sample \( -name .scriba -o -name logs -o -name snapshots -o -name .versions -o -name .gitignore \)` prints nothing. The step 5b edit is undone (the step 3 `diff -r` exits 0).
12. Commit: `git add -- apps/api/test/packs/fiction-gate.test.ts apps/api/test/fixtures/fiction-sample`, then `git commit -m "test(GNP-19): fiction-order check through the start-from-sample flow" -- apps/api/test/packs/fiction-gate.test.ts apps/api/test/fixtures/fiction-sample`. Do not squash later commits into it.
13. Gate record, on `unit/GNP-19` after the code review approves and before the orchestrator merges: one commit `docs(GNP-19): mark the criteria that passed` ticks the boxes of criteria 1 to 4 in `units/GNP-19-fiction-gate.md`, and criterion 5 stays `- [ ]`. Only a box whose test passed in steps 5 to 8 is ticked. A second commit `docs(GNP-19): set the plan to done` sets `status: done` in `plans/GNP-19.md`. Both commits are by path. The merge is the orchestrator's.
14. Record: the Node and npm versions, each command's exit code and output line, the result of the negative control, the two identity checks, and "criterion 5 not run".

## 5. Acceptance criteria and tests

Each criterion has one test, C1 to C5. The text is copied from unit lines 20 to 24. Where a criterion has two clauses, its one test checks both and names each clause.

| Criterion (unit line) | Test | Command (section 4 step) | Pass condition |
|---|---|---|---|
| 1. "All five tools pass the validation suite; every entity input names an existing entity type." (20) | C1: `packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs". Existing, committed, run by `npm test`. The entity-kind clause is the rule of `checks.ts` lines 89 to 96. | Step 6 | Exit 0 for both commands; the `it` passes; `lint:packs` prints no error line. |
| 2. "Dialogue's golden test passes; one-character calls fail Ajv." (21) | C2: `apps/api/test/packs/dialogue.test.ts`, "AC 2" (the golden, line 78) and "AC 3" (one-character call, line 99). Existing, committed. | Step 7 | 2 passed. |
| 3. "The fiction sample validates and its structural checks pass (GNP-18)." (22) | C3: GNP-18's T1 (`npm run lint:examples`, committed in CI through `npm run lint`) and GNP-18's T2 (a recorded run, `plans/GNP-18.md` section 3, step 6), both rerun at this merge. GNP-19 commits no test for it (G2). | Step 8 | Exit 0 for both, with the lines that GNP-18 section 3 steps 5 and 6 name. |
| 4. "The fiction-order check passes." (23) | C4: `apps/api/test/packs/fiction-gate.test.ts`, its one `it`. New, committed. | Steps 5 and 5b | Exit 0, 1 passed. In the control of step 5b the same test fails. |
| 5. "**Done when:** a dialogue scene between two characters keeps each voice distinct and respects their relationship notes — checked by the manual eval with a small and a larger local model, and by the author in the demo." (24) | C5: none that an automated agent can run. The named checks are the Agent loop's manual eval, `npm run eval:agent -- --model <small> --model <larger> --case dialogue`, read by a person from the report (`plans/AGL-25.md` section 5), and the author's demo (unit lines 27 to 32). | Not run here | OPEN (section 7, point 1). Not decided complete. The box stays `- [ ]`. |

## 6. Agreement with the downstream unit and the parallel work

- **GNP-24 (remaining-shapes gate; `blocked_by` names GNP-19, `units/GNP-24-remaining-shapes-gate.md` line 7).** Agrees. This unit's `unblocks: [GNP-24]` is its exact inverse (G7). GNP-24's criteria concern fourteen tools passing, the twelve nonfiction shapes shipping disabled, Throughline check and Remix shipping enabled, one golden test per tool, Remix's `targetShape` enum matching the shipped draft tools, and an enabled shape becoming callable and a canvas node. This unit changes no tool spec, no `enabled` flag, no enum and no golden, so none of those changes. GNP-24 does not use `apps/api/test/fixtures/fiction-sample`. The test file name `fiction-gate.test.ts` is not one that GNP-24 plans; GNP-24 has no plan file yet.
- **GNP-23 (remix; done).** Its enum must list the shipped draft tools, among them `dialogue` and `scene_builder`. This unit does not change it.
- **CEX-09 (done).** This unit's API flow is the flow of CEX-09's nonfiction order test (F14), applied to the fiction sample. No CEX-09 file changes.
- **GRR-17 (done).** This unit's demo uses the canvas, not the iPad check. GRR-17 left criteria 3 and 4 unticked (DECISIONS lines 7528 to 7534), and no criterion of this unit needs them. GRR-17 section 5 expected GNP-19 e2e specs, with the names `recipe-gate-*` reserved. This plan adds no e2e spec (G1), so those names stay free.
- **GNP-18 (done).** This unit's fixture copies its files. GNP-18 section 5 says GNP-19 needs no change to them, and this plan keeps that.
- **GNP-13 to GNP-17 (done).** The entity types and tools are used as shipped. No change.
- **Other plans on the same files.** None (F3). The parallel units GNP-20 to GNP-22 are done (G8).

## 7. Open points

1. **Criterion 5 cannot be tested or decided by an automated agent.** Cause: it needs a real local model server, and this environment has none (the default base URL is `http://127.0.0.1:11434/v1`, `scripts/eval-agent/README.md`). It also needs a person to judge the voices in the report (`plans/AGL-25.md` section 5) and the author's demo (unit lines 27 to 32). What is needed: the eval run with a small and a larger model, the dialogue report read by a person, and a dated DECISIONS entry by a person or the Navigator. Until then the box stays `- [ ]`. Whether the phase closes with it open is the Navigator's decision (precedent: DECISIONS lines 7528 to 7534, option (a)).
2. **The demo (under 5 minutes) is a person's check.** Demo steps 1, 2, 3 and 5 need the UI, and steps 4 and 6 need a model. No automated test covers them.
3. **The fixture is a copy, so drift is not caught by CI.** No committed test can read `examples/` (G2). A later edit to `examples/fiction` leaves the fixture behind unless step 3 is rerun, and the identity checks of step 8 hold only at this merge. Decided here: accept, as GRR-16 C5 did. A drift check would be a new script, outside this unit's scope.
4. **The fixture's `samples.yaml` lists nonfiction without its folder.** Decided here: keep it byte identical (D2), because the test never starts nonfiction. A fiction-only list would read more cleanly but would give up the byte identity.
5. **Criterion 3 has no committed clause for the shared file and the beats.** GNP-18's T1 keeps the path clause in CI. The shared-file and beat clauses are kept only by GNP-18's recorded T2, so a later edit could break them without failing CI. Decided here: no new test, because G2 forbids a unit test reading `examples/`, and criterion 3 is not to be reworded or weakened. The Navigator should know.
6. **Flaky root gate.** GNP-15 hit an unrelated `apps/api` failure (DECISIONS lines 6745 to 6756). The rerun rule of DECISIONS lines 7042 to 7048 applies to GNP-15 only. If step 10 fails in a file this unit does not change, the implementer stops and reports. This plan does not extend the rule; the Navigator decides whether it applies here.
7. **No e2e step.** The unit lists no e2e (G1), and the module adds none (`modules/genre-packs.md` line 89). If the orchestrator wants a fiction e2e spec, that is new scope, and this plan does not add it.
