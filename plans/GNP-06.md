---
id: GNP-06
title: Nonfiction entity types — person, claim, concept
status: draft
---
# GNP-06 plan — nonfiction entity types: person, claim and concept

Batch: [GNP-06] (Genre packs, phase:nonfiction-workhorses, M2), a batch of one. Draft by the planner (Haiku 5.5, effort xhigh), checked against main at `57e9f3a`. The unit file was read in full (lines 1 to 24). It has one change note, the blocker correction of commit `c45cd5e` (its Decisions line 15): `blocked_by` is `[GNP-01, GNP-03]` and `parallel_with` is `[GNP-04, GNP-05, GNP-13]`. Both blockers are `status: done` on main: GNP-01 (`plans/GNP-01.md` line 4) and GNP-03 (`plans/GNP-03.md` line 4; its code is `f303689` on main). No `unit/GNP-06` branch, no worktree and no `plans/GNP-06.md` existed before this draft.

Revision 1 (Opus reviser, 2026-11-16, checked at main `099f556`; the commits after `57e9f3a` change only `plans/SAU-16.md`, `plans/QUEUE.md` and this file). Each statement of the draft was compared with the unit file and the code on main; the line references hold. Corrections: AC1 (v) also asserts that the kind `source` named by the hints is in the list, because no lint or loader check ties an entity type's `x-scriba-entity-kinds` to a shipped kind (`pack-lint.ts` lines 50 to 53 pass the kinds to the tool lint only; `packages/packs/test/checks.ts` lines 86 to 93 promote only the tool lint's `entity-kind` warnings); D5 gains the module's `?` notation as a source; open points 2 to 6 are settled at plan level (section 6), and open point 1 stays with the Navigator. No unit change (Remove, Loosen, Reword or Split) was needed.

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

**D1 Kinds and files.** `packages/packs/nonfiction/entity-types/person.yaml` (kind `person`), `claim.yaml` (kind `claim`) and `concept.yaml` (kind `concept`). All three have folder `entities`. Source: unit lines 17 to 20; module table lines 75 to 77; module line 37 (the `entity-types/<kind>.yaml` layout).

**D2 Fixed kind and field names.** `person`: `name`, `role`, `sources`. `claim`: `statement`, `evidence`, `status`. `concept`: `name`, `definition`. Kind and field names are stable once shipped (module line 82). `claim` is the kind that the Agent loop's grounding-claims draft uses (module line 82). `named_concept` (GNP-21) returns a `concept` file with `name` and `definition` (`units/GNP-21-tier2-entity-and-argument-shapes.md` line 17). Source: unit lines 17 to 19; module lines 75 to 77 and 82.

**D3 Status values.** `claim.status` is an enum of `supported`, `weak`, `unsupported`. These are the words of the grounding verdicts (`GROUNDING_VERDICTS`, `packages/contracts/src/agent-loop/constants.ts` line 73). `unsourced` is not a value. Source: unit line 18; module line 76.

**D4 Reference fields.** `person.sources` and `claim.evidence` are arrays of strings. Each array node carries `x-scriba-type: entity` and `x-scriba-entity-kinds: [source]`, not `items`. This is the placement of tool input `entityIds`, which carries its hints on the array node (`apps/api/test/fixtures/packs/core/tools/cold_open.yaml` lines 13 to 19). The values are entity IDs: the front-matter `id`, or the file stem when there is none, and resolution covers `sources/` (`units/PST-08-entity-resolution.md` lines 22 and 29). Source: unit lines 17 and 18; module line 69. Placement: plan choice, following the tool convention. The loader accepts the hints on a property (`apps/api/src/modules/tool-registry/entity-types.ts` `checkHints` line 54, called by `checkField` line 131). The lint accepts them on the field node (`lint.ts` `checkEntityHints` line 826, called by `checkEntityField` line 939 before the array branch).

**D5 Required keys.** Every listed field is in `required`. Plan choice: the unit marks no field optional, and the module table marks an optional field with `?` (`url?`, module line 73) and marks none of these, so the rule of `plans/GNP-03.md` D3 applies. No `minItems` on `sources` or `evidence`, because neither the unit (lines 17 and 18, "list of `source` refs") nor the module (lines 75 and 76, "source refs") sets one; an empty list is valid (open point 2, settled). Source: unit lines 17 to 19; module lines 73 to 77.

**D6 Envelope.** `schemaVersion: 1`, `kind`, `title`, `description`, `folder`, `fields`, with no other top-level key. `kind` equals the file stem. The base `type` is not a field, because the Project store base carries it (as `plans/GNP-03.md` D4 and D5). `description` is one line and says what the Markdown body holds (module line 69). Source: module line 69; `packages/contracts/src/tool-registry/spec.ts` lines 74 to 81 (`entityTypeSchema`, a strict object); `entity-types.ts` lines 236 to 241 (kind equals stem).

**D7 Subset.** `status` is `type: string` with `enum`; `enum` is allowed on a string (`lint.ts` `TYPE_KEYWORDS`, lines 59 to 76). `sources` and `evidence` are `type: array` with `items: {type: string}`, a list of scalars (`entity-types.ts` `checkField`, lines 131 to 153; `lint.ts` `checkItems` line 340 takes only `type` in items). Source: module line 69; `plans/GNP-03.md` D6 and D7.

**D8 Lint clean.** "Lint clean" means that `lintPacks` returns no finding at all for the three files, neither an error nor a warning. Plan choice, the stricter reading of unit line 23, as `plans/GNP-03.md` D10. Source: `apps/api/src/modules/tool-registry/pack-lint.ts` lines 17 to 74.

**D9 Load and list.** The three kinds load at boot with the other built-in types; a fault in one stops boot (`entity-types.ts` `readEntityTypes`, lines 259 to 275). The list `GET /api/tool-registry/entity-types` returns the kinds sorted by kind (`catalog.service.ts` `entityTypes`, lines 329 to 335). Source: unit line 23; `plans/GNP-03.md` D11.

**D10 Per-kind validator seam.** The test reaches the per-kind validator through a test-only kit: `CatalogService.entityValidator(kind)` (`catalog.service.ts` lines 337 to 341; `entityValidatorOf`, `entity-types.ts` line 296), in `createTestApp` with `modules: [PlatformModule, ToolRegistryModule, <kit>]`. The kit is the one of `apps/api/test/packs/core-entity-types.test.ts` (on main, from GNP-03), copied into this plan's test file and not shared, so that file is not edited. Source: unit line 24; module line 85 ("never Tool registry internals"); `plans/GNP-03.md` D12, which names this seam as a plan choice and says that GNP-06 and GNP-13 may use it. It is not a Navigator decision (`grep -n "GNP-06" plans/DECISIONS.md` finds only lines 4924 and 4925, on the blocker). Plan choice, following GNP-03; the kit is copied, not shared, so this unit does not edit a file of a `done` unit (open point 5, settled).

**D11 Recognition seam.** "Reference fields are recognised as entity references with kind `source`" (unit line 23) is read as: the two hints of the reference fields appear in the entity-type list that the Tool registry serves (D9). Plan choice. No code on main reads entity-type field hints except the loader (`entity-types.ts` line 54) and the lint (`lint.ts` line 826). A search of `apps/web/src` for `x-scriba`, `entity-types` and `ENTITY_TYPES_ROUTE` found nothing. The list is the Tool registry's public route (`tools.controller.ts` lines 66 to 68), its `fields` keep the `x-` keys (`spec.ts` line 80, `z.record(z.string(), z.unknown())`), and the module says these hints are what restricts the form, canvas and Ajv (module line 66). The test also asserts that the kind `source` is in the same list, so the reference names a shipped kind. This reading tests the criterion's words as written, locally, and changes no criterion (open point 3, settled).

**D12 Test file and root.** `apps/api/test/packs/nonfiction-entity-types.test.ts`, the folder of the tests that run the real packs (module line 87). The packs root is `resolve(__dirname, '..', '..', '..', '..', 'packages', 'packs')`, as `plans/GNP-03.md` D14. Plan choice for the file name.

**D13 Dependencies.** None changes; `package-lock.json` does not change. Source: `plans/GNP-03.md` D15 (`ajv` is already a dependency of `apps/api`). Plan choice.

**D14 `.gitkeep`.** `packages/packs/nonfiction/entity-types/.gitkeep` (0 bytes) is deleted, because the folder holds files now. Source: unit GNP-01 line 15 ("with `.gitkeep` until content lands"); `plans/GNP-03.md` D16. Plan choice.

**D15 Commit message.** `feat(GNP-06): nonfiction entity types person, claim and concept`, in the form of `plans/GNP-03.md` D17 and the style of `prompt.md` (Commit messages). Plan choice.

**D16 Body and descriptions.** The Markdown body is not validated. The kind `description` and the field descriptions say what the body holds and what "one line" means for `definition`. No check enforces "one line" (the unit states none). Source: module lines 69 and 73 to 77. Plan choice for the wording.

## 2. Files to create or change

Only the paths below change. No other file in the repository changes.

| Path | Action | What changes |
|---|---|---|
| `packages/packs/nonfiction/entity-types/person.yaml` | create | The `person` entity type (text below, D1 to D7) |
| `packages/packs/nonfiction/entity-types/claim.yaml` | create | The `claim` entity type (text below, D1 to D7) |
| `packages/packs/nonfiction/entity-types/concept.yaml` | create | The `concept` entity type (text below, D1 to D7) |
| `packages/packs/nonfiction/entity-types/.gitkeep` | delete (`git rm`) | D14 |
| `apps/api/test/packs/nonfiction-entity-types.test.ts` | create | The two tests of section 4, with the kit of D10 |

Not changed: `packages/packs/package.json`, `packages/packs/tsconfig.json`, `packages/packs/test/**` (the GNP-01 suite), `packages/packs/nonfiction/tools/**` (GNP-07 and later), `packages/packs/core/**` (GNP-03), `apps/api/test/packs/core-entity-types.test.ts` (GNP-03), `apps/api/test/fixtures/**` (see open point 4), `apps/api/src/**`, `packages/contracts/**`, `examples/**`, `package-lock.json`, `plans/DECISIONS.md`, `plans/QUEUE.md`, `units/**` and `modules/**`.

Text of `packages/packs/nonfiction/entity-types/person.yaml`:

```yaml
schemaVersion: 1
kind: person
title: Person
description: A person the book describes; the body holds what happened.
folder: entities
fields:
  type: object
  properties:
    name:
      type: string
      title: Name
    role:
      type: string
      title: Role
    sources:
      type: array
      title: Sources
      description: The source files that tell about this person.
      x-scriba-type: entity
      x-scriba-entity-kinds: [source]
      items:
        type: string
  required: [name, role, sources]
```

Text of `packages/packs/nonfiction/entity-types/claim.yaml`:

```yaml
schemaVersion: 1
kind: claim
title: Claim
description: A statement the book makes, with the sources for it; the body holds the discussion.
folder: entities
fields:
  type: object
  properties:
    statement:
      type: string
      title: Statement
    evidence:
      type: array
      title: Evidence
      description: The source files that back the statement.
      x-scriba-type: entity
      x-scriba-entity-kinds: [source]
      items:
        type: string
    status:
      type: string
      title: Status
      enum: [supported, weak, unsupported]
  required: [statement, evidence, status]
```

Text of `packages/packs/nonfiction/entity-types/concept.yaml`:

```yaml
schemaVersion: 1
kind: concept
title: Concept
description: A named idea the book explains; the body holds examples and where it is used.
folder: entities
fields:
  type: object
  properties:
    name:
      type: string
      title: Name
    definition:
      type: string
      title: Definition
      description: One line.
  required: [name, definition]
```

## 3. Method

The code stage runs in its own worktree on `unit/GNP-06`, cut from main by the driver (`prompt.md`, Implement: the branch is made from `main` when it does not exist). Run every command from the worktree unless it says otherwise. Record `node -v` and `npm -v` beside each result. Do not push. Use Node 26 (`node -v` prints `v26.x`).

0. **Base.** In the main checkout, `git rev-parse --short HEAD` prints `57e9f3a`, or a later commit. `git diff --quiet 57e9f3a HEAD -- packages/packs apps/api/test/packs apps/api/src/modules/tool-registry packages/contracts/src/tool-registry packages/contracts/src/agent-loop` exits 0. If not, re-read the lines that section 7 cites for the changed files before editing. The driver runs `git branch unit/GNP-06 main`, then `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GNP-06 unit/GNP-06` (no `-b`). In the worktree `git status --short` prints nothing.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.x`.
2. **Install.** `npm ci`. Expected: exit 0, and `git status --short` still prints nothing. This checks assumption A1.
3. **Baseline.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs`. Expected: exit 0 on the unchanged tree. Record the file and test counts. The contracts build comes first because the API tests import the built subpaths.
4. **Entity types (D1 to D7, D14).** Write the three YAML files of section 2. Then `git rm -- packages/packs/nonfiction/entity-types/.gitkeep`. Expected: `git status --short` lists the three new files and the deletion, and nothing else.
5. **Test file (section 4, D10 to D12).** Create `apps/api/test/packs/nonfiction-entity-types.test.ts`. Its imports, `PACKS_ROOT`, the kit module (`validatorKitModule`), `withRealPacks`, `kitPost` and `json` are copied from the block before the first `it(` of `apps/api/test/packs/core-entity-types.test.ts`, unchanged except for `PACKS_ROOT`, which keeps the same expression (D12). Add the two tests of section 4, with the names given there.
6. **Format.** `npx prettier --write packages/packs/nonfiction/entity-types apps/api/test/packs`, then `npx prettier --check packages/packs apps/api/test/packs`. Expected: exit 0.
7. **New tests.** From `apps/api`: `npx vitest run test/packs`. Expected: 4 passed, 0 failed (the two new tests and the two of GNP-03). This checks assumptions A4 to A7.
8. **Mutation checks (each reverted before the next).** Before each change, copy the file to a directory outside the repository, and restore it with `cp` after the run. (a) In `claim.yaml`, change `enum: [supported, weak, unsupported]` to `enum: [supported, weak, unsourced]`: AC2 must fail. (b) In `person.yaml`, remove `x-scriba-type: entity` from `sources`: AC1 must fail. (c) In `concept.yaml`, change `folder: entities` to `folder: sources`: AC1 must fail. (d) In `claim.yaml`, change `x-scriba-entity-kinds: [source]` to `[claim]`: AC1 must fail. After each restore, the file equals its copy, and `git status --short` matches step 4.
9. **Lint.** From the root: `npm run lint:packs`, then `npm run lint -w @bbartolome/scriba-packs` and `npm run lint -w @bbartolome/scriba-api`. Expected: each exits 0, with no finding for the three files. This checks assumptions A2 and A3.
10. **Packs suite.** `npm test -w @bbartolome/scriba-packs`. Expected: exit 0. The GNP-01 suite, including `real-packs.test.ts` (zero lint errors on `packages/packs`), still passes with the three files.
11. **Root gates.** From the root: `npm run build`, `npm test` and `npm run lint`, then `npx prettier --check .`. Expected: each exits 0.
12. **Commit.** `git add -- packages/packs/nonfiction/entity-types/person.yaml packages/packs/nonfiction/entity-types/claim.yaml packages/packs/nonfiction/entity-types/concept.yaml apps/api/test/packs/nonfiction-entity-types.test.ts`. Then `git diff --cached --stat`, which must list exactly these four files and the deletion of `packages/packs/nonfiction/entity-types/.gitkeep`. Commit with `git commit -m "feat(GNP-06): nonfiction entity types person, claim and concept" -- <the four files and the .gitkeep path>`. Do not use `git add -A` or `git commit -a`. Do not push.
13. **Fresh clone.** `git clone --branch unit/GNP-06 /Users/bbartolome/workspace/scriba-prototype <tmp>` into an empty folder, then in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
14. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 4 holds. The unit file's checkboxes are ticked by the orchestrator at merge, not by this plan.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-06-nonfiction-entity-types.md` lines 23 and 24. Each criterion has one test, in `apps/api/test/packs/nonfiction-entity-types.test.ts`. The file has no other test. Both tests boot the app on the real packs root with `createTestApp` and the module list of D10 (not the composed app), as `plans/GNP-03.md` section 4 does. The tests run with `npx vitest run` from `apps/api`.

| Criterion (unit line) | Test name | Command | Pass condition |
|---|---|---|---|
| "All three lint clean; reference fields are recognised as entity references with kind `source`." (23) | "AC1: person, claim and concept lint clean, load, and their reference fields name kind source" | `npx vitest run test/packs/nonfiction-entity-types.test.ts` from `apps/api` | (i) `lintPacks(PACKS_ROOT)` (`pack-lint.ts`) has no finding whose `file` starts with `nonfiction/entity-types/` (D8). (ii) The app boots on the real packs root (a fault in one of the files stops boot, D9). (iii) `GET /api/tool-registry/entity-types` (`ENTITY_TYPES_ROUTE`, sent with `host: LOOPBACK_HOST`) answers 200; its list parses with `entityTypeListSchema`, and contains `person` with folder `entities`, `claim` with folder `entities` and `concept` with folder `entities`. (iv) In the entry of `person`, `fields.properties.sources` has `x-scriba-type` `entity` and `x-scriba-entity-kinds` `['source']`; in the entry of `claim`, `fields.properties.evidence` has the same two values (D11). (v) The same list contains an entry with kind `source` (from GNP-03), so the kind that the hints name is a loaded kind (D11). The test asserts these values only, not the whole schema. |
| "Per-kind validators reject a claim with `status: unsourced`." (24) | "AC2: the per-kind validators accept valid fixtures and reject a claim with status unsourced" | same | Through the kit's `POST /api/tool-registry-test/entity-validate` (D10). A `person` with `name`, `role` and `sources: ['ten-thousand-hours-notes']` is valid; a `concept` with `name` and `definition` is valid. A `claim` with `statement`, `evidence: ['deliberate-practice-notes']` and each of `status` `supported`, `weak` and `unsupported` is valid. A `claim` with `status: 'unsourced'` is invalid, with an issue whose `path` is `/status`. The test asserts `valid` for each valid case and the `path` of the issue for the invalid case, and no message text (module line 85). The fixtures use no real person. |

Criterion 1 covers the lint, the load and the recognition of the reference fields, as the unit's one line says. Criterion 2 covers the per-kind validator of `claim` (the rejection the unit names) and, in the same test, the acceptance of the valid fixtures of the other two kinds, because the criterion speaks of per-kind validators.

## 5. Downstream agreement

Each unit below is in `unblocks` of GNP-06 (the exact inverse of the `blocked_by` entries that name GNP-06: GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-12, GNP-21, GNP-22; checked by grep of the front matter). Each one is read in full, except as noted.

- **GNP-07 (`cold_open`).** Its `person` input is an entity port of kind `person` (`units/GNP-07-cold-open.md` line 17). This plan provides kind `person` in folder `entities`, with `name`, `role` and `sources`. Agrees.
- **GNP-08 (`mystery_question`).** It uses only the common inputs, so it needs no kind of this plan, and needs the nonfiction pack to load and lint clean. This plan gives both. Agrees.
- **GNP-09 (`myth_buster`).** Its `claimIds` input is an entity port list of kind `claim` (line 17), and only `claim` entities are accepted (line 23). This plan provides kind `claim`. The GNP-01 rule (every `x-scriba-entity-kinds` value names a shipped kind, `units/GNP-01-packs-scaffold-content-checks.md` line 18) holds once `claim.yaml` is on main. Agrees.
- **GNP-10 (`numbers_to_people`).** Its `person` input is an entity port of kind `person` (line 17). Agrees.
- **GNP-11 (nonfiction sample entities).** It writes one `person`, two `claim`s and one `concept` in `examples/nonfiction/entities/` (line 15). The front matter uses this plan's names: `person` (`name`, `role`, `sources`), `claim` (`statement`, `evidence`, `status` with the three values) and `concept` (`name`, `definition`). Its reference values are IDs that resolve in `sources/` (D4; PST-08 line 29). GNP-11 chooses the IDs in its own plan. `examples/nonfiction/` has no `entities/` folder on main (checked). Agrees.
- **GNP-12 (workhorses gate).** It needs the four workhorses and the sample, and nothing from this plan beyond its merge. Agrees.
- **GNP-21 (`named_concept`, `comparison_set`, `objection_handler`).** `named_concept` returns a `concept` file with `name` and `definition` (line 17). The `concept` validator accepts those keys (`required: [name, definition]`; extra keys are allowed at the root, as `entity-types.ts` `compileFields` sets `additionalProperties: true` at line 188). `objection_handler` takes `claimIds` of kind `claim` (line 19). Agrees.
- **GNP-22 (nine tier 2 to 3 shapes).** `profile` takes a `person` input (line 19). `framework_builder` takes `claimIds` of kind `claim` (line 22). Agrees.
- **Not in `unblocks`, read for consistency.** `units/AGL-19-grounding-sample-draft.md` line 16 says that the sample's claims must not contradict the `claim` entities' statuses (GNP-11 owns that). The three verdicts of the grounding engine (`units/AGL-16-grounding-engine.md` lines 15 and 20) and of the preflight (`units/CEX-06-claims-orphans-checks.md` lines 14 to 16) are verdicts on checked claims, not the `status` of a `claim` entity. The words are the same, so the values agree. No change.
- **GNP-04, GNP-05, GNP-13 (`parallel_with`).** GNP-04 (front matter read only) changes `core/tools` and the golden tests. GNP-05 changes the image check. GNP-13 changes `packages/packs/fiction/entity-types/` (its unit names no nonfiction path). None changes a GNP-06 path. Each lists GNP-06 in `parallel_with`, so the lists are symmetric. Agrees.
- **Other draft and planned plans.** `grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/SAU-16.md` only. Its section 2 (lines 35 to 37) names `apps/api/test/setup-flow-gate.test.ts`, `e2e/specs/journey.e2e.ts` and `plans/SAU-16.md`. None of them is a GNP-06 path, so the change of that plan and this one can come in either order. No `planned` plan exists. A later plan for GNP-02 or GNP-13 must use other file names (for example `fiction-entity-types.test.ts` for GNP-13), and the same order-independence holds.

## 6. Open points

1. **Stale line of the module file (for the Navigator).** `modules/genre-packs.md` line 31 reads "After GNP-01 + GNP-02: GNP-03, GNP-04, GNP-06, GNP-13 in parallel." It contradicts `blocked_by: [GNP-01, GNP-03]` (unit line 7) after the orchestrator's correction `c45cd5e`, whose Navigator confirmation is still pending (`plans/DECISIONS.md` lines 4924 and 4925). Only the Navigator can change a module file. This plan is correct in either case: it needs the kind `source`, which is on main (GNP-03 is `done`), it does not edit the module file, and no step or test reads line 31.
2. **Empty lists (settled, plan level).** An empty `sources` or `evidence` passes validation. The unit (lines 17 and 18) and the module (lines 75 and 76) say only "source refs", and no criterion or downstream unit needs a non-empty list; GNP-11 needs only that each reference that exists resolves. A `claim` with `status: unsupported` and no evidence is a plausible entity. The simplest option is taken: no `minItems` (D5). No criterion and no module decision changes.
3. **Seam of criterion 1 (settled, plan level).** The hints are read from the Tool registry's public entity-type list, and the kind `source` is checked in the same list (D11, AC1 (iv) and (v)). This tests the criterion's words locally and changes no criterion.
4. **Fixture of the Tool registry tests (settled, plan level: not changed).** `apps/api/test/fixtures/packs/nonfiction/entity-types/claim.yaml` (`disputed` in the enum, `evidence` as a list of objects) is not a pack file. It is the fixture of the Tool registry loader's AC5 test (`apps/api/test/tool-registry-loader.test.ts` lines 642 to 694), which asserts `evidence` items as objects (`{ source, pages }`) and the paths `/evidence/0` and `/evidence/1`; it exercises the one-level array-of-objects extension. The unit names no fixture, and the fixture root is not the real packs root, so the two `claim` kinds never meet. A change would break a test of a `done` unit and is outside this unit's scope. The fixture stays as it is (section 2, "Not changed").
5. **Seam of criterion 2 (settled, plan level).** The kit is GNP-03's plan choice (`plans/GNP-03.md` D12), which names GNP-06 as a user of the same seam. It is copied into this unit's test file, not shared, so the `done` file `core-entity-types.test.ts` does not change (D10). No Navigator decision exists or is needed.
6. **"One line" for `definition` (settled, plan level).** The unit (line 19) and the module (line 77) say "(one line)" and give no check, and no criterion tests it. It stays a field description (D16); no `pattern` is added.

## Review parts

The plan is small (three YAML files, one deletion, one test file), so it has one part. Each step and each test is in this part.

| Part | Steps (section 3) | Tests (section 4) | Files |
|---|---|---|---|
| 1. Nonfiction entity types `person`, `claim` and `concept`, with their tests | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 | AC1 (i) to (v), AC2 | the five paths of section 2 |

The reviewer of part 1 also checks that the diff changes only the five paths of section 2.

## 7. Facts checked and facts assumed

### Facts checked

- **C1 Main and tree.** `git log` head is `57e9f3a`. `git status --short` shows ` M units/SAU-12-providers-step.md` (not this unit's file; not touched) and ` M plans/SAU-16.md` (another draft's working copy; not touched). `git worktree list` shows PST-15, SAU-13 and TRG-07 worktrees, none on GNP-06. `git branch` has no `unit/GNP-06`. `ls plans/GNP-06.md` fails (no file).
- **C2 Unit file.** `units/GNP-06-nonfiction-entity-types.md`: front matter lines 2 to 9; the note of the blocker correction is line 15; criteria lines 23 and 24. `git show c45cd5e -- units/GNP-06-nonfiction-entity-types.md` shows the old `blocked_by` `[GNP-01]` and `parallel_with` with GNP-03.
- **C3 Graph.** GNP-01 and GNP-03 `unblocks` both name GNP-06 (`units/GNP-01-packs-scaffold-content-checks.md` line 9; `units/GNP-03-core-entity-types.md` line 9). Units naming GNP-06 in `blocked_by` are exactly GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-12, GNP-21 and GNP-22 (grep of front matter lines 1 to 10). GNP-04, GNP-05 and GNP-13 name GNP-06 in `parallel_with`, and GNP-06 names them back.
- **C4 Plan statuses.** `plans/GNP-01.md` and `plans/GNP-03.md` have `status: done`. `grep -rl '^status: \(draft\|planned\)' plans/` gives `plans/SAU-16.md` only.
- **C5 Pack folders.** `packages/packs/nonfiction/entity-types/` holds only `.gitkeep` (0 bytes). `packages/packs/core/entity-types/` holds `source.yaml` and `style-profile.yaml`, which GNP-03 put on main (commit `f303689`). `examples/nonfiction/` holds `drafts`, `project.yaml` and `sources`, and no `entities/`.
- **C6 Contracts.** `packages/contracts/src/tool-registry/constants.ts` line 11: `ENTITY_KIND_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` (accepts `person`, `claim`, `concept`). Line 58: `ENTITY_FOLDERS = ['sources', 'entities']`. `spec.ts` lines 74 to 81: `entityTypeSchema` is a `z.strictObject` with `fields: z.record(z.string(), z.unknown())` (line 80). `packages/contracts/src/agent-loop/constants.ts` line 73: `GROUNDING_VERDICTS = ['supported', 'weak', 'unsupported']`.
- **C7 Loader.** `apps/api/src/modules/tool-registry/entity-types.ts`: `checkHints` line 54 (only `x-scriba-type` `entity` and `x-scriba-entity-kinds` a list of strings are allowed on a property); `checkField` line 131 (a scalar, or a list of scalars, or a list of objects); `checkFields` line 156; `compileFields` line 180 (strict Ajv; root `additionalProperties: true` at line 188; extensions stripped); `loadEntityType` line 200 (kind equals stem, lines 236 to 241; the lint runs last, line 244); `readEntityTypes` line 259; `issueOf` line 279 (`path` is `instancePath`); `entityValidatorOf` line 296.
- **C8 Stripping.** `apps/api/src/modules/tool-registry/inputs.ts` `stripExtensions` lines 172 to 180 removes every `x-` key, recursively, before the Ajv compile.
- **C9 Lint.** `apps/api/src/modules/tool-registry/lint.ts`: `ROOT_KEYWORDS`, `ANNOTATIONS`, `TYPE_KEYWORDS` lines 59 to 76 (`enum` allowed on string; `items` allowed on array); `checkKeywords` line 308 (skips `x-` keys, line 327); `checkItems` line 340; `checkEntityHints` line 826; `checkEntityItems` line 847; `checkEntityField` line 939 (hints on the field node, then the object-items branch, else `checkKeywords`); `checkFields` line 968; `lintEntityTypeSource` line 1116.
- **C10 Catalog.** `apps/api/src/modules/tool-registry/catalog.service.ts`: `entityTypes()` lines 329 to 335 (sorted by kind); `entityValidator(kind)` lines 337 to 341.
- **C11 Pack lint.** `apps/api/src/modules/tool-registry/pack-lint.ts` `lintPacks` lines 17 to 74; its entity-type loop lints each file with `lintEntityTypeSource` and labels findings with the file label, which is `<pack>/entity-types/<stem>.yaml` (`entity-types.ts` line 205).
- **C12 Tool-input convention.** `apps/api/test/fixtures/packs/core/tools/cold_open.yaml` lines 13 to 19: `entityIds` is `type: array`, `items: {type: string}`, with `x-scriba-type: entity` and `x-scriba-port: true` on the array node.
- **C13 Existing kit.** `apps/api/test/packs/core-entity-types.test.ts` (on main) has the imports, `PACKS_ROOT`, `validatorKitModule`, `withRealPacks`, `kitPost` and `json` before its first `it(`, and two tests (AC1, AC2). Its AC1 filters `core/entity-types/` and uses `arrayContaining`, so new kinds do not break it.
- **C14 PST-08 IDs.** `units/PST-08-entity-resolution.md` line 22: the front-matter `id` wins, else the file stem; the ID pattern is `^[a-z0-9][a-z0-9-]*$`. Line 29: resolution covers `entities/` and `sources/`.
- **C15 Other tests on the real root.** `packages/packs/test/real-packs.test.ts` asserts zero lint errors on `packages/packs`. `grep` of `packages/packs/test` for `entity-types`, `entityTypes` and `nonfiction` finds no count of kinds. `grep` of `apps/api/test` finds no test on the real root other than `core-entity-types.test.ts`; the others use fixture or temporary roots.
- **C16 Fixture.** `apps/api/test/fixtures/packs/nonfiction/entity-types/claim.yaml` lines 9 to 15 (the `disputed` enum and the object list of evidence). `grep` of `apps/api/test` and `packages/packs/test` finds no `disputed` except this fixture.
- **C17 Web.** `grep` of `apps/web/src` for `x-scriba`, `entity-types` and `ENTITY_TYPES_ROUTE` finds nothing.
- **C18 Module.** `modules/genre-packs.md`: line 7 (entity types need GNP-01, GNP-02 only for tools); line 31 (the stale line, open point 1); line 37 (layout); line 69 (envelope, reference hints and the description rule); lines 73 to 77 (the source, style-profile, person, claim and concept rows); line 82 (stable names, `claim` used by the grounding draft); lines 85 and 87 (test principles and location).
- **C19 Other units.** `units/AGL-16-grounding-engine.md` lines 15 and 20; `units/AGL-19-grounding-sample-draft.md` line 16; `units/CEX-06-claims-orphans-checks.md` lines 14 to 16; `units/GNP-13-fiction-entity-types.md` (read in full, no shared file); `units/GNP-05-core-gate.md` (read in full); `units/GNP-04-propose-graph.md` (front matter only).
- **C20 DECISIONS.** `grep -n "GNP-06" plans/DECISIONS.md` finds lines 4924 and 4925 only, the 2026-11-16 GNP-03 revision 1 entry (the correction and the open module line). No PLAN DOES NOT WORK report exists for GNP-06.
- **C21 (revision 1) Kinds of entity-type hints are not linted.** `pack-lint.ts` lines 22 to 53: the entity-type lint gets only the stem; the set of kinds goes to `lintToolSource` only. `checkEntityHints` (`lint.ts` line 826) checks the form of `x-scriba-entity-kinds`, not its values. Hence AC1 (v).
- **C22 (revision 1) Plans on the same files.** At `099f556`, `grep -l '^status: \(draft\|planned\)' plans/*.md` gives `plans/GNP-06.md` and `plans/SAU-16.md`. SAU-16 names no path under `packages/packs`, `apps/api/test/packs` or `apps/api/test/fixtures/packs` (its only mention of `packages/packs`, line 82, is a reading). The worktrees PST-15, SAU-13 and TRG-07 are units whose plans are `done`.
- **C23 (revision 1) Entity lint warnings.** `lintEntityTypeSource` (`lint.ts` lines 1116 to 1163) and the entity checks it calls (lines 826 to 1040) report errors only; the `report.warning` calls (lines 383, 410, 495, 703, 816) are in the tool rules. So D8's "no finding" is met by an error-free file.

### Facts assumed (each one is tested at the step named)

- **A1.** `npm ci` in a new worktree succeeds with the committed lock. Step 2.
- **A2.** `checkItems` (`lint.ts` line 340) accepts `items: {type: string}`, and the hints on the array node pass `checkEntityHints` (line 826) and `checkKeywords` (line 308). Read, not run. Step 9.
- **A3.** `lintPacks` reports no finding for the three files. Step 9.
- **A4.** Ajv compiles the array nodes after `stripExtensions` (C8), so `x-scriba-*` keys do not reach Ajv in strict mode. Step 7.
- **A5.** The list route returns the `fields` object with its `x-` keys (C6, `spec.ts` line 80 keeps unknown values). Step 7, AC1 (iv).
- **A6.** An enum failure has `instancePath` `/status` (C7, `issueOf` line 279). Step 7, AC2.
- **A7.** The boot on the real packs root with the kit works as in GNP-03's test (C13). Step 7.
- **A8.** `real-packs.test.ts` still finds zero lint errors with the three files (C15). Step 10.
- **A9.** `npm run lint:packs`, `npm run lint -w @bbartolome/scriba-packs` and `npm run lint -w @bbartolome/scriba-api` exist as the root and workspace scripts (taken from `plans/GNP-03.md` section 7, checked there; not re-read here). Step 9.

### Not verified

- The planner ran no build, no test and no lint. It ran only read commands (`git`, `grep`, `sed`, `ls`, `Read`), and it wrote only this file. Steps 2 to 13 check everything above.
- Nothing was pushed. No remote exists.
