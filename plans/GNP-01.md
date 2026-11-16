---
id: GNP-01
title: packages/packs scaffold and the pack content-check suite
status: done
---
# GNP-01 plan — packs scaffold and the pack content-check suite

Batch: [GNP-01] (Genre packs, phase:core-propose-graph, M2), a batch of one. Revision 2 (reviser), checked against main at `b819204`; revision 1 was written against `046f7ce`, and the only commit between them adds this file. The reviser made no unit change. Status is `planned`: the Navigator decided open point 1 on 2026-11-16 (DECISIONS). The unit file records no change: it was read in full (lines 1 to 26), and so was the module file. Blockers, both merged: PLT-11 (the `phase:scaffold` gate, DECISIONS line 645) and TRG-07 (commits d1f644a, 8309318 and c043338 on main).

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

**D1 Folders.** `packages/packs/{core,nonfiction,fiction}/{tools,entity-types}/`, each with an empty `.gitkeep` (six files). Source: unit line 15; module lines 37 and 38. Checked: `git ls-files packages/packs` lists only `package.json`, `tsconfig.json`, `src/.gitkeep` and `test/smoke.test.ts`.

**D2 Suite home and runner.** The content-check suite lives in `packages/packs/test/`, is written in Vitest, and runs under `npm test`. The root `test` script is `npm test --workspaces && node --test 'scripts/*.test.mjs'` (root package.json line 25), and `packages/packs` has `"test": "vitest run"` (packages/packs/package.json line 7). Source: unit line 16; module line 86.

**D3 Library entry.** The suite loads the built pack-lint library, `apps/api/dist/modules/tool-registry/pack-lint.js`, with `createRequire` from `apps/api/package.json`, as `scripts/lint-packs.mjs` does (line 57). It uses `lintPacks(root)` (`pack-lint.ts` line 17) and the type `PackFinding` (line 11). It uses no other Tool registry export or file. Source: unit line 16; module lines 85 and 86 ("never Tool registry internals"); TRG-07 plan section 1, D9 (lines 68 to 74), and section 6, GNP-01 paragraph (line 256). The output of the API build is CommonJS, because `apps/api/package.json` has no `"type"` field.

**D4 Build before load.** The suite's `test` script builds contracts, then the API, then runs `vitest run`. The API build must come first because `apps/api/dist` is absent on main. The chain is the one of root `lint:packs` (root package.json line 28). Source: TRG-07 plan section 6, GNP-01 paragraph (line 256), and section 7, point 10 (line 283). Plan choice: a script chain, not the `before()` hook of `scripts/lint-packs.test.mjs` (line 22), because the chain shows the order on one line; this is the PLT-02 choice (PLT-02 plan, section 1, bullet 18).

**D5 Contracts.** Each tool file is parsed with `yaml` and validated with `toolSpecSchema` from `@bbartolome/scriba-contracts/tool-registry` (`packages/contracts/src/tool-registry/spec.ts` line 54). The type `LintDiagnostic` comes from the same subpath (`packages/contracts/src/tool-registry/lint.ts` line 17). Source: unit line 16. Plan choice: a file that fails `toolSpecSchema` is a finding of the check (`spec`); no check skips a file silently.

**D6 Zero errors.** Every real pack lints with zero errors: no finding with `severity: 'error'`. Warnings do not fail the suite. Source: unit line 17.

**D7 Entity kinds.** Every `entity-kind` warning of the library is a failure of the suite. The library keeps it a warning (`lint.ts` line 496; TRG-07 plan section 1, D6), and the unit makes it an error in this suite (unit line 18).

**D8 Common inputs.** The five keys `coreIdea`, `entityIds`, `styleProfile`, `length` and `tone` are identical on every tool whose `output` is `draft`. Identity means that, for each key, the property subschema (deep equal, including the `x-scriba-*` hints and `title`) and the membership in `inputs.required` equal those of the first draft tool in file order. A missing key is a finding. Source: unit line 19; module lines 56 to 64 (the table, "repeated verbatim; CI asserts identity"). Plan choice: the membership in `required` is compared, because the table's Required column belongs to the verbatim row (open point 3).

**D9 Descriptions.** Every tool's `description` is under 120 characters (`description.length < 120`) and starts with a verb. The verb test is open point 2. Source: unit line 20; module line 45 ("one sentence, under ~120 characters, plain words, start with a verb").

**D10 Remix.** When `core/tools/remix.yaml` exists, its `inputs.properties.targetShape.enum`, sorted, equals the sorted names of the draft tools except `remix`. Without the file the check is inactive. The check takes the packs root as a parameter, so GNP-23 can run it on a temporary root. Source: unit line 21; GNP-23 unit lines 16, 19, 22 and 23.

**D11 Broken-spec fixtures.** Five cases, each with one fault, owned by the suite under `packages/packs/test/fixtures/broken-specs/` (unit line 22). The rule each case must raise: `output` (`lint.ts` line 280); `hint-unknown` (lines 376 and 404); `template-variable` (line 796); `duplicate-name` (`pack-lint.ts` lines 40 and 60); `description`, from the zod issue mapping (`lint.ts` line 279) of the line-break regex in `toolDescriptionSchema` (`spec.ts` line 47). The fixtures of TRG-07 under `apps/api/test/fixtures/lint/` are not reused: the unit says the suite owns its fixtures.

**D12 Real packs.** The suite reads `packages/packs`. Unit line 26 requires it, and module line 86 names the content checks as Vitest tests of `packages/packs/test/`. The rule "unit tests never read the real packs" in `modules/tool-registry.md` belongs to the Tool registry; TRG-07 plan section 6 (line 256) says it does not bind Genre packs.

**D13 Types.** `packages/packs/tsconfig.json` gets `"compilerOptions": { "types": ["node"] }`, as `packages/contracts/tsconfig.json` (line 4) and `apps/api/tsconfig.json` (lines 3 and 4) have. The suite imports `node:` modules. Source: PLT-02 plan, section 1, bullet 21 (line 21): TypeScript 6.0.3 does not load `@types/*` packages on its own.

**D14 Fixtures and Prettier.** The fixtures are written prettier-clean, and `.prettierignore` does not change. The root `lint` runs `prettier --check .` (root package.json line 26). `.prettierignore` (lines 1 to 5) does not cover `packages/packs`. The DECISIONS rule that gives a `.prettierignore` entry to the owner of byte-exact fixtures (plans/DECISIONS.md lines 92 and 104) does not apply: the suite parses these files and never compares their bytes.

**D15 CI and the root gates.** No CI file changes. `.github/workflows/ci.yml` runs `npm run lint` (line 27) and `npm test` (line 29) on pull requests and on push to `main` (lines 3 to 6). `lint:packs` is already in the root `lint` chain (root package.json line 26), wired by TRG-07 (commit d1f644a). Source: unit line 16 ("alongside `npm run lint:packs`").

**D16 Dependencies.** `packages/packs` gains three devDependencies, each at a pin the repo already uses: `@bbartolome/scriba-contracts` `0.0.0` (the workspace version, contracts package.json line 3), `@types/node` `^26.6.6` (contracts line 56, api line 25) and `yaml` `2.9.1` (root line 42, api line 20). The lock records each workspace only by name and version (`package-lock.json` lines 11118 to 11121), so the change stays inside that entry. Source: plan choice, from the pins above.

## 2. Files to create or change

| Path | Action | What changes |
|---|---|---|
| `packages/packs/core/tools/.gitkeep`, `packages/packs/core/entity-types/.gitkeep`, `packages/packs/nonfiction/tools/.gitkeep`, `packages/packs/nonfiction/entity-types/.gitkeep`, `packages/packs/fiction/tools/.gitkeep`, `packages/packs/fiction/entity-types/.gitkeep` | create (six empty files) | keep the empty pack folders in git (D1) |
| `packages/packs/package.json` | edit | `scripts.test` becomes `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && vitest run` (D4); `devDependencies` gets the three entries of D16. `build` and `lint` are unchanged |
| `packages/packs/tsconfig.json` | edit | adds `"compilerOptions": { "types": ["node"] }` (D13); `extends` and `include` unchanged |
| `package-lock.json` | changed by npm install (step 4) | additive, and only the `packages/packs` entry (D16) |
| `packages/packs/test/checks.ts` | create | the library loader (D3), `contentChecks(packsRoot)` (D5, D7 to D10), and the constants `COMMON_INPUTS`, `DESCRIPTION_LIMIT` (120) and `VERBS` (open point 2). It is not a test file: Vitest runs `*.test.ts` files only |
| `packages/packs/test/real-packs.test.ts` | create | the AC 2 test (section 4) |
| `packages/packs/test/broken-specs.test.ts` | create | the AC 1 test (section 4) |
| `packages/packs/test/content-checks.test.ts` | create | the extra tests X1 to X4 (section 4). Each test writes its packs to a temporary folder and removes it |
| `packages/packs/test/fixtures/broken-specs/output-kind/core/tools/bad_output.yaml` | create | `output: summary` (rule `output`) |
| `packages/packs/test/fixtures/broken-specs/unknown-hint/core/tools/unknown_hint.yaml` | create | `x-scriba-colour` on a property (rule `hint-unknown`) |
| `packages/packs/test/fixtures/broken-specs/template-undeclared/core/tools/undeclared_input.yaml` | create | a prompt that names `{{missing}}` (rule `template-variable`) |
| `packages/packs/test/fixtures/broken-specs/duplicate-name/core/tools/dup_tool.yaml` and `packages/packs/test/fixtures/broken-specs/duplicate-name/nonfiction/tools/dup_tool.yaml` | create (two files) | the same name in two packs (rule `duplicate-name`, at the nonfiction file) |
| `packages/packs/test/fixtures/broken-specs/multi-line-description/core/tools/multi_line.yaml` | create | a `description` with a line break (rule `description`) |

Each valid fixture has `schemaVersion: 1`, a `name` equal to its file stem, a one-line description, `output: draft`, `enabled: true`, a `|` prompt, and `inputs` with one required text property `coreIdea`. Each fixture carries only its own fault.

Not changed: root `package.json` (`lint:packs` exists), `.prettierignore`, `.github/workflows/ci.yml`, `apps/api/**`, `packages/contracts/**`, `packages/packs/src/.gitkeep`, `packages/packs/test/smoke.test.ts` (kept, because PLT-01 requires each workspace to run tests), and the files that GNP-02 owns: `packages/packs/test/README.md` and `packages/packs/test/golden/`. Also `units/**`, `modules/**`, `plans/DECISIONS.md`, `plans/QUEUE.md` and `units/SAU-12-providers-step.md`.

## 3. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype` on the branch the orchestrator names (`main` if it names none). Record `node -v` and `npm -v` with each result. Do not push. Change only the files of section 2.

0. **Base (section 7).** `git rev-parse --short HEAD` prints `b819204`, or a later commit that changes only `plans/` and `units/`. `git diff --quiet b819204 HEAD -- packages/packs apps/api/src/modules/tool-registry apps/api/test/fixtures/lint scripts package.json .prettierignore .github` exits 0. If not, re-read the changed files before editing. `git status --short` shows only ` M units/SAU-12-providers-step.md`, which is not this unit's file and is not touched.
1. **Runtime.** `node -v` prints `v26.x` (v26.13.0 at planning). `npm -v` prints `11.x` (11.20.0 at planning). No decision applies.
2. **Baseline.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs` exits 0, with one test (the smoke test). Obeys D4 for the build order.
3. **Folders (D1).** Create the six empty `.gitkeep` files of section 2. Check: `find packages/packs -name .gitkeep` lists seven files (the six new ones and `src/.gitkeep`).
4. **Configuration and dependencies (D13, D16, D4).** Edit `packages/packs/tsconfig.json` and `packages/packs/package.json` as section 2 says. Run `npm install`. Check: `git diff -- package-lock.json` changes only the `"packages/packs"` entry, adds no `node_modules/` entry and changes no version (assumed A4). Check: `npx prettier --check packages/packs/package.json packages/packs/tsconfig.json` exits 0.
5. **Broken-spec fixtures (D11, D14).** Create the six YAML files of section 2, each with the one fault that D11 names. Check: `npx prettier --check packages/packs/test/fixtures` exits 0.
6. **Content checks (D3, D5, D7 to D10, open points 2 and 3).** Create `packages/packs/test/checks.ts`:
   - `lintPacks` loads the library as D3 says.
   - `contentChecks(packsRoot)` reads the `.yaml` files of `<pack>/tools` for `core`, `nonfiction` and `fiction`, in that order. It skips dot-files and reads only `.yaml` files, as `yamlFilesIn` in `packs.ts` (line 276) does; a missing folder gives no files. Each file is parsed with `yaml` and validated with `toolSpecSchema` (D5).
   - It returns a finding of check `entity-kind` for each `entity-kind` warning of `lintPacks` (D7); a finding of check `description` for each description of 120 characters or more, or whose first word is not in `VERBS` (D9); a finding of check `common-inputs` for each difference among draft tools (D8); and, when `core/tools/remix.yaml` exists, a finding of check `remix-shapes` if the enum differs (D10).
   - Use no `any`. Check: step 9 runs the type check and the lint.
7. **Tests (section 4).** Create `real-packs.test.ts` (AC 2), `broken-specs.test.ts` (AC 1) and `content-checks.test.ts` (X1 to X4). Use the names of section 4 exactly.
8. **Run the suite (D2, D4).** `npm test -w @bbartolome/scriba-packs` exits 0. The output lists the smoke test, the real-packs test, the five broken-spec cases and the X tests, with none failed and none skipped. Then run `npm test` from inside `packages/packs`; it exits 0 too. This step tests assumptions A1 (the second command: the `-w` builds in the `test` script resolve from inside the workspace), A2 (`checks.ts` imports `toolSpecSchema` from the built contracts subpath, and the suite has no Vitest config, so no swc plugin) and A5 (the five broken-spec rows pass). If A1 fails, stop and report: D4 is then wrong for a run from inside the workspace. If A2 fails, stop and report; do not add a Vitest config without a plan revision.
9. **Type check and lint (D13, A6).** `npm run build -w @bbartolome/scriba-packs` and `npm run lint -w @bbartolome/scriba-packs` exit 0.
10. **Root gates (D15).** From the root: `npm run build`, `npm test` and `npm run lint` exit 0, and `npx prettier --check .` exits 0. The `lint:packs` step inside `npm run lint` exits 0 on the empty real packs. Local proxy for the CI clause of AC 1 (labelled a proxy, not the CI run): the root `npm test` output includes the packs suite with its five broken-spec rows, and `node --test scripts/ci-workflow.test.mjs` passes, which shows that the workflow's Test step runs `npm test`.
11. **Fresh checkout (D4, assumption A7).** Clone the branch into an empty temporary folder, then run `npm ci && npm test -w @bbartolome/scriba-packs` there. It must exit 0 with no `apps/api/dist` present, which shows that D4 builds the API. If the npm registry cannot be reached, record "not attempted: no network".
12. **Commit (section 2).** `git add` the paths of section 2 by name, then check `git diff --cached --stat`, which must list only them. Commit with `feat(GNP-01): packs scaffold and the pack content-check suite`. Do not use `git add -A` or `git commit -a`. Do not push.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-01-packs-scaffold-content-checks.md` lines 25 and 26. Each criterion has one test. The extra tests X1 to X4 are plan choices: the real packs are empty, so without them the content checks would never see a tool.

| Criterion (unit line) | Test file and test name | Command | Pass condition |
|---|---|---|---|
| "CI runs the suite on every push, and it fails on each broken-spec fixture." (25) | `packages/packs/test/broken-specs.test.ts`, one `it.each` named "fails on each broken-spec fixture: <case>", five rows: `output-kind` gives `output`; `unknown-hint` gives `hint-unknown`; `template-undeclared` gives `template-variable`; `duplicate-name` gives `duplicate-name` (at `nonfiction/tools/dup_tool.yaml`); `multi-line-description` gives `description` | `npm test -w @bbartolome/scriba-packs` | In each row, `lintPacks(fixtureRoot)` has an error with that rule at the fixture's file. The clause "CI runs the suite on every push" cannot be tested locally (no GitHub Actions run; no push allowed) and conflicts with the trigger of the done PLT-10 (open point 1). The CI clause is recorded as untested under the Navigator decision of 2026-11-16 (DECISIONS). Step 10 gives a labelled local proxy only. The checkbox is not ticked: the Navigator decided on 2026-11-16 (DECISIONS) that the CI clause is recorded as untested locally. |
| "The suite passes on the (still empty) real packs." (26) | `packages/packs/test/real-packs.test.ts`, "the suite passes on the real packs" | same | `lintPacks(packages/packs)` has no finding with severity `error`, and `contentChecks(packages/packs)` returns `[]` |

Extra tests (plan choice), all in `packages/packs/test/content-checks.test.ts`, each in a temporary folder:
- X1 "an entity kind that no entity type ships is a finding": a tool with `x-scriba-entity-kinds: [no-such-kind]` and no entity types gives an `entity-kind` finding.
- X2 "draft tools whose common inputs differ are a finding", and "identical common inputs pass".
- X3 "a description of 120 characters or more is a finding", and "a description whose first word is not a verb is a finding".
- X4 "the Remix check is inactive without remix.yaml", and "the Remix check fails when the enum differs from the draft tools".

## Review parts

A small plan: one part.

- **Part 1 — scaffold, suite and fixtures.** Steps 0 to 12 (section 3). Tests: AC 1 (`broken-specs.test.ts`, five rows, plus the step 10 proxy for the CI clause), AC 2 (`real-packs.test.ts`), and the extra tests X1 to X4 (`content-checks.test.ts`). Assumptions A1, A2 and A5 at step 8; A3 and A6 at step 9; A4 at step 4; A7 at step 11.

## 5. Downstream agreement

For each unit that uses an output of GNP-01, what GNP-01 provides, and whether that unit's Scope and Decisions need anything else.

- **GNP-03 (core entity types).** GNP-01 provides `core/entity-types/` (D1) and the suite. GNP-03's Scope and Decisions need nothing else. Its criterion 21 ("per-kind validators accept valid front-matter fixtures") needs open point 4.
- **GNP-04 (propose_graph).** GNP-01 provides `core/tools/` and the suite. GNP-04's Scope and Decisions need nothing else. Its description, "Sketch a story graph or a recipe from a plain-language intent." (62 characters), starts with `Sketch`, which is in `VERBS`. Its `entityIds` kinds fall under open point 3.
- **GNP-05 (core gate).** GNP-01 provides the suite and its broken-spec fixtures. GNP-05's criterion 20 ("CI runs the pack validation suite on every push and fails on its broken-spec fixtures (GNP-01)") is the CI clause of this unit, open point 1 (decided by the Navigator on 2026-11-16, option (a)). Its image check belongs to PLT-14, not to GNP-01. The Dockerfile copies `packages/packs` whole (Dockerfile line 58), so the suite folder reaches the image too. This is harmless: the registry reads only `core`, `nonfiction` and `fiction`.
- **GNP-06 (nonfiction entity types).** GNP-01 provides `nonfiction/entity-types/` and the suite. GNP-06's Scope and Decisions need nothing else. Its criterion 22 ("per-kind validators reject a claim with `status: unsourced`") needs open point 4.
- **GNP-13 (fiction entity types).** GNP-01 provides `fiction/entity-types/` and the suite. GNP-13's Scope and Decisions need nothing else. Its criterion 22 ("per-kind validators accept valid fixtures and reject a relationship missing `note`") needs open point 4.
- **GNP-23 (remix).** GNP-01 provides `contentChecks(packsRoot)` and the Remix rule (D10). GNP-23's own test that a fixture draft tool fails the suite passes a temporary packs root to `contentChecks`. GNP-23's Scope and Decisions need nothing else.
- **GNP-02 (golden harness, parallel with this unit).** GNP-02 owns `packages/packs/test/README.md` and `packages/packs/test/golden/`; this unit creates neither. Both units write under `packages/packs/test/`. The unit of GNP-02 names no change to `packages/packs/package.json` (grep of `units/GNP-*.md`). If both change the `test` script, merge the two by hand.
- **Every content unit (GNP-07 to GNP-22).** GNP-01 provides `npm run lint:packs` (already in root `lint`, wired by TRG-07) and the suite. GNP-14 and GNP-19 ("every entity input names an existing entity type") rely on D7. GNP-12, GNP-21 and GNP-22 ("identical common inputs") rely on D8. Nothing else is needed.
- **TRG-07 (done).** GNP-01 calls `lintPacks` and changes no TRG-07 file.
- **PLT-11 (done).** The `./tool-registry` subpath exists (contracts package.json lines 22 to 25), and the root `lint` chain includes `lint:packs` (root line 26).

The gaps that the units do not settle are open points 3 and 4. Nothing else from GNP-01 is missing for a downstream unit.

## 6. Open points

1. **The CI clause: "CI runs the suite on every push". Resolved.** Decided by the Navigator, option (a), recorded in `plans/DECISIONS.md`, entry of 2026-11-16 (commit 7e34ca1). The CI clause is untested locally and its checkbox stays unticked. The step 10 proxy is the recorded local check. `ci.yml` is not changed.
2. **What counts as a verb (D9).** Options: (a) an explicit list `VERBS` in `checks.ts`; a first word passes when it, or the word without a final `s`, is in the list. Effect: a new verb is one line in a reviewed file. (b) A morphology rule, such as "the first word does not end in `-ing`, `-ed` or `-s`": it needs no list, but it rejects real verbs such as "address" and "process" and accepts nouns. (c) A part-of-speech tagger: accurate, but a new dependency. No unit decision settles the test (the unit has no Decisions section; module line 45 says only "start with a verb"), so this is a small plan choice, closed: (a), with the 18 distinct first words that the units use: check, draft, expand, flag, open, rewrite, sketch, state, turn, write, set, paint, move, ask, explain, tell, break and face.
3. **The kinds of the common `entityIds` input, and whether `required` counts (D8).** The module does not say which entity kinds the common `entityIds` input names, and the identity rule makes every draft tool carry the same list. The test-only fixtures already disagree: `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` lines 20 and 41 have `[person]`, and `apps/api/test/fixtures/packs/nonfiction/tools/myth_buster.yaml` line 20 has `[claim]`. Options: (a) GNP-01 names the list now. No source settles the list, so this plan does not choose it. (b) Identity only: the first content draft tool to land sets the list, and each later one copies it. Plan default: (b). Reviser check: the unit (line 19) and the module ("repeated verbatim; CI asserts identity") settle identity, not the list, so (b) adds no rule. Also open: whether `required` counts. The unit says "same schema and hints"; the module table says "repeated verbatim". Plan default: count it. Effect of not counting it: a draft tool could drop `coreIdea` from `required` and still pass.
4. **Per-kind validators for GNP-03, GNP-06 and GNP-13 (no seam).** Their criteria test per-kind validators on entity front matter (GNP-03 line 21, GNP-06 line 22, GNP-13 line 22). The validator is `entityValidatorOf` (`apps/api/src/modules/tool-registry/entity-types.ts` line 296), used by `CatalogService.entityValidator(kind)` (`catalog.service.ts` lines 280 to 282). The library `pack-lint.js` exports only `lintPacks` and `formatFinding`, and the suite validates entity-type files only (D5). So GNP-01 gives those units no way to reach a validator. Options: (a) those units test through the Tool registry's HTTP API, if an endpoint exposes entity validation (not checked here). (b) A later Tool registry unit exports a front-matter validator from the library, which changes TRG-07's files. Effect: the decision belongs to the planners of GNP-03, GNP-06 and GNP-13. GNP-01 does not change for it. Reviser check: none of those criteria names GNP-01 or its suite, and GNP-01's unit asks for no validator seam, so nothing is in GNP-01's way and no unit change is made (prompt.md: do not change a part that is not in the way). A third option for those planners: compile each entity type's `fields` with Ajv in their own test, which needs no Tool registry export.

## 7. Facts checked and facts assumed

### Facts checked

- **Reviser re-check (revision 2).** HEAD `b819204`; `git diff --stat 046f7ce HEAD` lists only `plans/GNP-01.md`. No `plans/GNP-0*.md` other than this one and no `unit/GNP-*` branch exist. The cited lines of `pack-lint.ts` (11, 17, 40, 60, 81), `lint.ts` (279, 280, 376, 404, 496, 796), `spec.ts` (47, 54), `packs.ts` (finding label `<pack>/<folder>/<file>`), `ci.yml` (3 to 6) and root `package.json` (23 to 28) match. The 18 first words of open point 2 match the first words of every tool description in `units/GNP-*.md` (12 `Description: "` lines and the nine rows of GNP-22's table).
- **Main and remote.** `git rev-parse --short HEAD` was `046f7ce` on branch `main` at planning. `git status --short` shows only ` M units/SAU-12-providers-step.md`. `git remote -v` lists `origin git@github.com:bbartolome/scriba-prototype.git`, and `git branch -vv` shows `main` ahead of `origin/main` by one commit. The task said the repo is local only; the planner did not use or change the remote.
- **Plans and queue.** `grep -h "^status:" plans/*.md | sort | uniq -c` gives 104 `status: done` and no `draft` or `planned` plan, so no plan in progress changes GNP-01's paths. `plans/GNP-01.md` did not exist. `plans/QUEUE.md` line 2: `GNP-01 | M2 | available: yes | all blockers done`.
- **Blockers merged.** PLT-11: DECISIONS line 645 (batch collected onto main); `units/PLT-11-scaffold-gate.md` lines 28 to 31 ticked, line 32 (`ci.yml` green on this PR) unticked. TRG-07: commits d1f644a, 8309318 and c043338 on main; `units/TRG-07-lint-pack-lint-cli.md` lines 24 to 28 ticked; DECISIONS lines 4709 to 4712.
- **Unit and module.** `units/GNP-01-packs-scaffold-content-checks.md`: front matter lines 2 to 9; scope lines 15 to 22; criteria lines 25 and 26. `modules/genre-packs.md`: lines 37, 38, 45, 52, 56 to 64, 66, 85 and 86. The units that name GNP-01 in `blocked_by` are GNP-03, GNP-04, GNP-05, GNP-06 and GNP-13 (grep of `units/GNP-*.md`), which matches `unblocks`. `units/README.md` line 64: `unblocks` is the exact inverse of `blocked_by`.
- **Packs package.** `packages/packs/package.json` lines 5 to 9: `build` is `tsc --noEmit -p tsconfig.json`, `test` is `vitest run`, `lint` is `eslint .`; it has no dependencies. `packages/packs/tsconfig.json` has no `compilerOptions`. `packages/packs/test/smoke.test.ts` has seven lines. `packages/packs/src/.gitkeep` is 0 bytes. No `core`, `nonfiction` or `fiction` folder exists in `packages/packs`.
- **Root package.json.** Line 8 lists `packages/packs` in `workspaces`; line 23 `build`; line 25 `test`; line 26 `lint` (it ends with `npm run lint:packs && prettier --check .`); line 28 `lint:packs`; line 41 `vitest` 5.1.0; line 42 `yaml` 2.9.1.
- **Lint script and test.** `scripts/lint-packs.mjs` line 57 calls `createRequire(join(API_ROOT, 'package.json'))(LIBRARY)`. `scripts/lint-packs.test.mjs` line 22 has the `before()` build.
- **Build state.** `ls apps/api/dist` fails: the built library is absent on main.
- **API package.** `apps/api/package.json` has no `"type"` field; `yaml` 2.9.1 at line 20; `@types/node` at line 25. `apps/api/tsconfig.json` lines 3 and 4 set `"types": ["node"]`.
- **Contracts package.** `packages/contracts/tsconfig.json` line 4 sets `"types": ["node"]`. `packages/contracts/package.json`: version line 3 `0.0.0`; `zod` line 53; `@types/node` line 56; exports `./tool-registry` at lines 22 to 25; no `"."` export.
- **Contracts sources.** `packages/contracts/src/tool-registry/spec.ts`: `toolDescriptionSchema` lines 42 to 47 (the regex `^[^\r\n]*$` is line 47); `toolSpecSchema` line 54. `lint.ts` line 17: `LintDiagnostic`. `constants.ts` line 55: `BUILTIN_ORIGINS`.
- **Library source.** `apps/api/src/modules/tool-registry/pack-lint.ts`: `PackFinding` line 11, `lintPacks` line 17, `duplicate-name` at lines 40 and 60, `formatFinding` line 81, imports `builtinFiles` at line 4. `lint.ts`: `description` mapping line 279, `output` mapping line 280, `hint-unknown` lines 376 and 404, `entity-kind` line 496, `template-variable` line 796, `lintToolSource` line 1042, `lintEntityTypeSource` line 1116. `packs.ts`: `yamlFilesIn` returns `[]` for a missing folder (lines 276 and 277); `builtinFiles` at line 314.
- **Entity validator.** `entity-types.ts` line 296 `entityValidatorOf`; `catalog.service.ts` line 280 `entityValidator(kind)`, which calls it at line 282.
- **CI.** `.github/workflows/ci.yml` lines 3 to 6 (triggers), line 27 `npm run lint`, line 29 `npm test`. `scripts/ci-workflow.test.mjs` line 45.
- **Prettier.** `.prettierignore` lines 1 to 5: `/units/`, `/modules/`, `/plans/`, `/package-lock.json`, `/apps/api/test/fixtures/lint/`. No `packages/packs` line.
- **Image.** `Dockerfile` line 58: `COPY --from=build /src/packages/packs /opt/scriba/packs`.
- **Fixture packs.** `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` lines 20 and 41 (`x-scriba-entity-kinds: [person]`); `apps/api/test/fixtures/packs/nonfiction/tools/myth_buster.yaml` line 20 (`[claim]`).
- **Vitest precedent.** `apps/api/test/tool-registry-loader.test.ts` lines 26 and 37 import contracts subpaths under Vitest. `apps/api/vitest.config.mts` adds the `unplugin-swc` plugin. `node_modules/vitest/dist/module-evaluator.js` lines 183 and 232 give modules `__dirname` and the CommonJS globals.
- **Descriptions.** `units/GNP-22-tier2-3-draft-shapes.md` lines 18 to 26: `profile` has an entity input of kind `person`; `framework_builder` has `claimIds` of kind `claim`. The first words of the descriptions in `units/GNP-*.md` (grep) are the 18 words of open point 2.
- **DECISIONS and TRG-07 plan.** DECISIONS lines 92 and 104 (`.prettierignore` entries for byte-exact fixtures). TRG-07 plan section 1, D6 (line 50), D9 (lines 68 to 74), D16 (line 92); section 3 rule table (lines 139 to 164); section 6, GNP-01 paragraph (line 256); section 7, point 10 (line 283). PLT-02 plan section 1, bullets 18 and 21 (lines 18 and 21).
- **Versions.** `node -v` prints v26.13.0; `npm -v` prints 11.20.0.
- **Root types.** `node_modules/@types/node` is version 26.6.6.

### Facts assumed (each one is tested at the step named)

- A1. `npm run build -w <name>` run from inside `packages/packs` resolves the workspace from the root. Tested at step 8.
- A2. Vitest loads a CommonJS build of contracts from a test file without the swc plugin. Tested at step 8.
- A3. The TypeScript 6 default for `types` does not load `@types/node`, so `types` must be set (PLT-02 plan, line 21). Tested at step 9.
- A4. `npm install` after the `package.json` edit changes only the `packages/packs` entry, because every package it needs is already in the lock. Tested at step 4.
- A5. The five fixtures raise the rules that D11 names; the rule ids and lines are read from code, not run. Tested at step 8.
- A6. The typescript-eslint recommended preset reports `any`. Tested at step 9.
- A7. The root `test` script runs the packs workspace after the API build when the workspaces run in order. The plan does not rely on it (D4). Tested at step 11.

### Not verified

- The planner ran no build, test or lint: `apps/api/dist` is absent, and a build would write files into the working tree. The library's behaviour on the five fixtures is read from code, not run.
- No GitHub run was made (no push). No fresh clone and no `npm ci` were run. Steps 8 and 11 check these.
