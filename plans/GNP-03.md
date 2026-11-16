---
id: GNP-03
title: Core entity types — source and style-profile
status: planned
---
# GNP-03 plan — core entity types: source and style-profile

Batch: [GNP-03] (Genre packs, phase:core-propose-graph, M2), a batch of one. Revision 2 (reviser, 2026-11-16), checked against main at `c45cd5e`. Revision 1 was checked at `d144a95`. Between `d144a95` and `c45cd5e` only `plans/GNP-03.md` (`16a8705`) and the two unit files of the blocker correction (`c45cd5e`, open point 1) changed, so every code line number below still holds; the reviser re-checked each one it relies on (section 7, "Re-checked by the reviser"). The unit file now has `parallel_with: [GNP-04, GNP-13]` and `GNP-06` in `unblocks` (lines 8 and 9); its Decisions and criteria (lines 14 to 21) are unchanged, so the unit line numbers below hold. Revision 1 text follows, corrected in place. The first check was made at `b15ede6`. The TRG-10 merge (`01955c1`, with its plan commits up to `d144a95`) came later and changed `catalog.service.ts`, `tools.controller.ts`, `tool-registry.module.ts` and `invariant-sweep.ts`. The line numbers below are those of `d144a95`; the entity-type files that the plan cites are unchanged since `b15ede6`. The unit file records no change: it has no notes section, and it was read in full (lines 1 to 21). Its blockers hold: GNP-01 is done (commits `80bdbea` and `0309137` on main). `plans/QUEUE.md` line 2 lists GNP-03 as available.

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

**D1 Files and kinds.** `packages/packs/core/entity-types/source.yaml` has kind `source`, folder `sources`, fields `title`, `citation`, `url` (optional) and `reliability` (a short note); its body holds quotes and notes. `packages/packs/core/entity-types/style-profile.yaml` has kind `style-profile`, folder `entities`, fields `tone`, `targetLength` (an integer, in words) and `bannedPhrases` (a list of strings); its body holds sample paragraphs. Source: unit lines 15 and 16; module lines 73 and 74; module lines 37 and 38 (the `entity-types/<kind>.yaml` layout).

**D2 Fixed names.** Compile & export reads `source.citation`, `source.url` and `style-profile.bannedPhrases`, so these names do not change. Source: unit line 17; module line 82; `units/CEX-04-assembled-markdown.md` line 30 (bibliography from `citation` and `url`); `units/CEX-07-entity-links-banned-phrases.md` line 19 (`bannedPhrases`).

**D3 Required and optional fields.** The unit marks only `url` with `?`. Plan choice, from that marker: `title`, `citation`, `reliability`, `tone`, `targetLength` and `bannedPhrases` are required fields of their schemas; `url` is optional. Source: unit lines 15 and 16.

**D4 Envelope.** `schemaVersion: 1`, `kind`, `title`, `description`, `folder` and `fields`, with no other top-level key (the envelope is strict). `folder` is `sources` or `entities`. `kind` must equal the file stem. Source: module line 69; `packages/contracts/src/tool-registry/spec.ts` lines 69 to 82 (`entityFolderSchema` at 70, `entityTypeSchema` a `z.strictObject` at 74 to 81, its type at 82); `apps/api/src/modules/tool-registry/entity-types.ts` lines 236 to 241 (the kind must match the file name).

**D5 `type` is not a field.** The Project store base `{id?, type, links?}` carries `type` on every entity file, so the `fields` of a kind list only the kind's own keys. Source: `units/PST-01-contract-slice.md` line 35; module line 69.

**D6 Keyword subset.** The root of `fields` takes `type`, `properties`, `required`, `additionalProperties`, `title` and `description`. A property takes `type`, its annotations (`title`, `description`, `default`) and, per type, `enum`, `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `minItems`, `maxItems`, `uniqueItems` or `items`. `format` is outside the subset, so `url` is a plain string with no format. Source: `apps/api/src/modules/tool-registry/lint.ts` lines 59 to 76 (`ROOT_KEYWORDS`, `ANNOTATIONS`, `TYPE_KEYWORDS`).

**D7 Scalar list.** `bannedPhrases` is `type: array` with `items: {type: string}`. The loader accepts "a scalar, a list of scalars or a list of objects of scalars" (`entity-types.ts` lines 130 to 153). Source: unit line 16 ("list of strings").

**D8 Fixture style.** Each property carries a `title` annotation, as the claim fixture does. Source: `apps/api/test/fixtures/packs/nonfiction/entity-types/claim.yaml` lines 9 to 15. Plan choice.

**D9 Front matter on samples.** The Project store reads a `sources/` file without front matter as `source`, but samples always carry front matter. GNP-03 adds no Project store behaviour. Source: unit line 15; `units/PST-08-entity-resolution.md` lines 18 and 20.

**D10 Lint clean.** "Lint clean" means that `lintPacks` returns no finding at all for the two files, neither an error nor a warning. Plan choice: the stricter reading of unit line 20. Source: unit line 20; `apps/api/src/modules/tool-registry/pack-lint.ts` lines 17 to 74.

**D11 Load.** The Tool registry reads `core/entity-types` once at boot. A fault in an entity-type file stops boot (`entity-types.ts` lines 259 to 275). The list is `GET /api/tool-registry/entity-types` (`packages/contracts/src/tool-registry/routes.ts` line 11; `apps/api/src/modules/tool-registry/tools.controller.ts` lines 66 to 69). It returns `{entityTypes}` sorted by kind (`catalog.service.ts` lines 329 to 335, the comment at 329 and the method at 330; `packages/contracts/src/tool-registry/catalog.ts` lines 67 to 71). Source: unit line 20; `units/TRG-09-read-endpoints-enabled.md` line 18.

**D12 Per-kind validator seam.** The validator of a kind is `CatalogService.entityValidator(kind)` (`catalog.service.ts` lines 337 to 341; `entity-types.ts` lines 296 to 304). The test reaches it through a test-only kit module, as `apps/api/test/tool-registry-loader.test.ts` does (kit lines 56 to 110, its `entity-validate` route at lines 91 to 100; AC5 at lines 642 to 694). The boot is the loader test's: `createTestApp` with `modules: [PlatformModule, ToolRegistryModule, <kit module>]` (loader test line 175), which replaces the composed module list (`create-test-app.ts` line 13), so no Setup & auth guard sits in front of the kit or of the registry's own GET route; requests go through `send` with `host: LOOPBACK_HOST` (loader test lines 184 to 195). Revision 1 said "the composed app"; that was wrong, because the composed app puts the global guard in front of both routes. The source is `units/TRG-06-pack-loader-catalog.md` lines 24 and 33, which give the loader a per-kind Ajv validator and a test of it. This is the answer to GNP-01 open point 4 for GNP-03; GNP-06 and GNP-13 may use the same seam. The module line 85 says "never Tool registry internals". The kit calls the exported in-process catalog, not the loader's or the parser's internals, as the TRG-06 test does. Plan choice, following that precedent.

**D13 Test location.** The file goes to `apps/api/test/packs/`, the folder that the module names for tests that run the real packs (module line 87; `units/GNP-02-golden-harness.md` line 15). The file is not a golden test: it has no mock OpenAI server and no golden file. Plan choice.

**D14 Real packs root.** The API boots on `packages/packs` through `SCRIBA_PACKS_DIR`, as the module names for pack tests (module line 87; `units/GNP-02-golden-harness.md` line 16). From `apps/api/test/packs/` the path is `resolve(__dirname, '..', '..', '..', '..', 'packages', 'packs')`. Plan choice for the expression.

**D15 Dependencies.** None change. `ajv` is already a dependency of `apps/api` (`apps/api/package.json` line 16), and the test runs in `apps/api`. So `package-lock.json` does not change. Plan choice.

**D16 `.gitkeep`.** The `core/entity-types/.gitkeep` file (GNP-01 D1) is deleted, because the folder holds files now. Source: `units/GNP-01-packs-scaffold-content-checks.md` line 15 ("with `.gitkeep` until content lands"); the same rule as PLT-02 (`plans/PLT-02.md` section 2, the `src/.gitkeep` row). Plan choice.

**D17 Commit message.** `feat(GNP-03): core entity types source and style-profile`, in the form of GNP-01's commit (`plans/GNP-01.md` section 3, step 12). Plan choice.

## 2. Files to create or change

Only the paths below change. No other file in the repository changes.

| Path | Action | What changes |
|---|---|---|
| `packages/packs/core/entity-types/source.yaml` | create | The `source` entity type (text below, D1 to D7) |
| `packages/packs/core/entity-types/style-profile.yaml` | create | The `style-profile` entity type (text below, D1 to D7) |
| `packages/packs/core/entity-types/.gitkeep` | delete (`git rm`) | D16 |
| `apps/api/test/packs/core-entity-types.test.ts` | create | The two tests of section 4, with a test-only kit module (D12) |

Not changed: `packages/packs/package.json`, `packages/packs/tsconfig.json`, `packages/packs/test/**` (the GNP-01 suite, unchanged), `packages/packs/test/README.md` and `packages/packs/test/golden/` (GNP-02's), `apps/api/src/**`, `packages/contracts/**`, `examples/**`, `package-lock.json`, `plans/DECISIONS.md`, `units/**` and `modules/**`.

Text of `packages/packs/core/entity-types/source.yaml`:

```yaml
schemaVersion: 1
kind: source
title: Source
description: A source the book cites; the body holds quotes and notes.
folder: sources
fields:
  type: object
  properties:
    title:
      type: string
      title: Title
    citation:
      type: string
      title: Citation
    url:
      type: string
      title: URL
    reliability:
      type: string
      title: Reliability
      description: A short note on how far the source can be trusted.
  required: [title, citation, reliability]
```

Text of `packages/packs/core/entity-types/style-profile.yaml`:

```yaml
schemaVersion: 1
kind: style-profile
title: Style profile
description: The tone, length and banned phrases of a book or passage; the body holds sample paragraphs.
folder: entities
fields:
  type: object
  properties:
    tone:
      type: string
      title: Tone
    targetLength:
      type: integer
      title: Target length
      description: The target length in words.
    bannedPhrases:
      type: array
      title: Banned phrases
      items:
        type: string
  required: [tone, targetLength, bannedPhrases]
```

## 3. Method

The code stage runs in its own worktree on `unit/GNP-03`, cut from main by the driver, as the worktree convention of DECISIONS 2026-11-14, the PLT-20 review of revision 4, item 1 requires. Run every command from the worktree unless it says otherwise. Record `node -v` and `npm -v` beside each result. Do not push. Use Node 26 (`node -v` prints `v26.x`).

0. **Base.** In the main checkout, `git rev-parse --short HEAD` prints `d144a95`, or a later commit. `git diff --quiet d144a95 HEAD -- packages/packs apps/api/test/packs apps/api/src/modules/tool-registry/catalog.service.ts apps/api/src/modules/tool-registry/tools.controller.ts apps/api/src/modules/tool-registry/entity-types.ts packages/contracts/src/tool-registry` exits 0. If not, re-read the lines that section 7 cites for the changed files before editing. The driver runs `git branch unit/GNP-03 main`, then `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GNP-03 unit/GNP-03` (no `-b`). In the worktree `git status --short` prints nothing.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.x`.
2. **Install.** `npm ci`. Expected: exit 0, and `git status --short` still prints nothing (no dependency changes, D15). This checks assumption A1.
3. **Build and baseline.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-api`. Expected: exit 0 on the unchanged tree. Record the file and test counts. The contracts build comes first because the API tests import the built subpaths.
4. **Entity types (D1 to D7, D16).** Write the two YAML files of section 2. Then `git rm -- packages/packs/core/entity-types/.gitkeep`. Expected: `git status --short` lists the two new files and the deletion, and nothing else.
5. **Test file (section 4, D12 to D14).** Create `apps/api/test/packs/core-entity-types.test.ts` with the two tests of section 4 and the kit of D12. The kit is a test-only module with one route, `POST /api/tool-registry-test/entity-validate`, that calls `CatalogService.entityValidator(kind)` and answers with its result (404 for an unknown kind), as the loader test's kit does at lines 91 to 100. Use the imports of `apps/api/test/tool-registry-loader.test.ts` lines 13 to 45 (`send` and `Reply` from `../guard-request`, `LOOPBACK_HOST` from `../invariant-sweep`, `createTestApp` from `../create-test-app`, `PlatformModule` from `../../src/modules/platform/platform.module`, `CatalogService` and `ToolRegistryModule` from `../../src/modules/tool-registry/tool-registry.module`, `ENTITY_TYPES_ROUTE` and `entityTypeListSchema` from `@bbartolome/scriba-contracts/tool-registry`), and `lintPacks` from `../../src/modules/tool-registry/pack-lint`. Boot with `createTestApp({ env: { SCRIBA_PACKS_DIR: <real packs root, D14> }, modules: [PlatformModule, ToolRegistryModule, <kit module>] })` (D12) and close the app in a `finally`.
6. **Format.** `npx prettier --write packages/packs/core/entity-types apps/api/test/packs`, then `npx prettier --check packages/packs apps/api/test/packs`. Expected: exit 0. The packs YAML is checked by the root `prettier --check .` (root `lint` script), so it must be clean.
7. **New tests.** From `apps/api`: `npx vitest run test/packs/core-entity-types.test.ts`. Expected: 2 passed, 0 failed. This step checks assumptions A4 (the src import of the library under Vitest), A5 (the boot on the real packs root with no static root) and A6 (the Ajv issue paths).
8. **Mutation checks (each reverted before the next).** (a) Remove `citation` from `required` in `source.yaml`: AC2 must fail. (b) Change `bannedPhrases` to `type: string`: AC2 must fail. (c) Change `folder: sources` to `folder: entities` in `source.yaml`: AC1 must fail. After each revert, `git diff` against the state of step 4 must be empty.
9. **Lint.** From the root: `npm run lint:packs`, then `npm run lint -w @bbartolome/scriba-packs` and `npm run lint -w @bbartolome/scriba-api`. Expected: each exits 0, with no finding for the two files. This checks assumptions A2 and A3.
10. **Packs suite.** `npm test -w @bbartolome/scriba-packs`. Expected: exit 0. The GNP-01 suite (smoke, real-packs, broken-specs, content-checks) still passes with the two new files.
11. **Root gates.** From the root: `npm run build`, `npm test` and `npm run lint`, then `npx prettier --check .`. Expected: each exits 0.
12. **Commit.** `git add -- packages/packs/core/entity-types/source.yaml packages/packs/core/entity-types/style-profile.yaml apps/api/test/packs/core-entity-types.test.ts`. Then `git diff --cached --stat`, which must list exactly these three files and the deletion of `packages/packs/core/entity-types/.gitkeep`. Commit with `feat(GNP-03): core entity types source and style-profile`. Do not use `git add -A` or `git commit -a`. Do not push.
13. **Fresh clone.** Clone the branch into an empty temporary folder, `git clone --branch unit/GNP-03 /Users/bbartolome/workspace/scriba-prototype <tmp>`, then in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
14. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 4 holds. The unit file's checkboxes are ticked by the orchestrator after review, not by this plan.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-03-core-entity-types.md` lines 20 and 21. Each criterion has one test, in `apps/api/test/packs/core-entity-types.test.ts`. The file has no other test. Both tests boot the app on the real packs root (D14) with `createTestApp` and the module list of D12 (`PlatformModule`, `ToolRegistryModule`, the kit), not the full composed app (`apps/api/test/create-test-app.ts` lines 65 to 114; its `env` option overrides the packs root, line 83; its `modules` option replaces the composed list, lines 13 and 86). Both use a temp library, which the helper removes. The tests run with `npx vitest run` (`apps/api/vitest.config.mts` includes `test/**/*.test.ts`).

| Criterion (unit line) | Test name | Command | Pass condition |
|---|---|---|---|
| "Both lint clean and load in the Tool registry's entity-types list." (20) | "AC1: source and style-profile lint clean and load in the entity-types list" | `npx vitest run test/packs/core-entity-types.test.ts` from `apps/api` | (i) `lintPacks(packages/packs)` (`src/modules/tool-registry/pack-lint.ts`, the library entry point) has no finding whose `file` starts with `core/entity-types/` (D10). (ii) The app boots on the real packs root (a fault in either file would stop boot, D11). (iii) `GET /api/tool-registry/entity-types` (`ENTITY_TYPES_ROUTE`, the registry's own route, sent with `host: LOOPBACK_HOST`) answers 200, and its list parses with `entityTypeListSchema` and contains an entry with kind `source` and folder `sources`, and one with kind `style-profile` and folder `entities`. The test filters for these two kinds, not an exact list, because GNP-06 and GNP-13 add kinds later. |
| "Their per-kind validators accept valid front-matter fixtures and reject a missing `citation` / a non-list `bannedPhrases`." (21) | "AC2: the per-kind validators accept valid fixtures and reject a missing citation and a non-list bannedPhrases" | same | Through the kit's `POST /api/tool-registry-test/entity-validate` (D12): a `source` with `type`, `title`, `citation` and `reliability` is valid; the same with `url` is valid. A `source` without `citation` is invalid, with an issue whose `path` is empty and whose `message` contains `citation`. A `style-profile` with `type`, `tone`, `targetLength: 800` and `bannedPhrases: ['game-changer']` is valid. A `style-profile` whose `bannedPhrases` is the string `'game-changer'` is invalid, with an issue whose `path` is `/bannedPhrases`. The test asserts `valid` and `path` for each case, and for the missing `citation` also that `message` contains `citation`. For `bannedPhrases` it asserts the path only, because a type error's message is Ajv's own text (`issueOf`, `entity-types.ts` line 292), which does not name the field. It asserts no other wording (module line 85). |

The test seam of AC2 is the kit of D12. The validator is the registry's own: the kit calls `CatalogService.entityValidator`, which compiles the fields with Ajv (`entity-types.ts` lines 180 to 196), so the test does not repeat the compile.

## 5. Downstream agreement

Each unit below uses an output of GNP-03, or is in its `unblocks` list. The field names and kinds of this plan are the ones each unit assumes.

- **GNP-05 (core gate).** Its `blocked_by` names GNP-03 (`units/GNP-05-core-gate.md` line 7). This plan provides both kinds, and GNP-05's own criteria need nothing else from it. Agrees.
- **GNP-06 (nonfiction entity types).** Since `c45cd5e` its `blocked_by` is `[GNP-01, GNP-03]` (line 7), its `parallel_with` is `[GNP-04, GNP-05, GNP-13]` (line 8), and GNP-03's `unblocks` names it (open point 1, settled). Its `person.yaml` and `claim.yaml` reference kind `source` (`units/GNP-06-nonfiction-entity-types.md` lines 17 and 18, after the blocker note at line 15), which this plan's `source.yaml` declares, so GNP-01's `entity-kind` check passes for GNP-06 once GNP-03 is on main. GNP-06 may use the kit seam of D12 for its criterion 2. The field names agree. Agrees.
- **GNP-07, GNP-08, GNP-09, GNP-10 (workhorses).** Each names GNP-03 in `blocked_by` (line 7 of each). Each takes the style profile through the `style` port, not through a kind (for example GNP-07 line 17), and excludes the style profile from `sourcesUsed` (GNP-07 line 22). They read no field of GNP-03. Agrees.
- **GNP-11 (nonfiction sample entities).** It names GNP-03 in `blocked_by` (line 7). Its "add Source front matter (`title`, `citation`, `url?`, `reliability`)" (line 18) uses this plan's names. Hand-off: on main, all four files in `examples/nonfiction/sources/` have no front matter (checked). Once `citation` and `reliability` are required, GNP-11 must give front matter to all four files, not only to the ones it cites. PLT-22 will validate them (PLT-22 unit line 20). Its plan must say so.
- **GNP-18 (fiction sample).** It names GNP-03 in `blocked_by` (line 7) and needs one `style-profile` in `entities/` (line 17). Agrees.
- **CEX-04 (assembled Markdown).** It names GNP-03 for `source.citation` and `source.url` (line 7; the bibliography at line 30). Agrees. Hand-off to CEX-04's plan: a source without a `citation` field cannot be rendered from it. The samples always carry front matter (D9), so CEX-04 decides the case where they do not.
- **CEX-07 (banned phrases).** It names GNP-03 for `style-profile.bannedPhrases` (line 7; line 19). It reads the list through the Project store's resolution (`content` of the style-profile entity, PST-08). A list of strings (D3, D7). Agrees.
- **TRG-04 (done).** Its style picker lists style-profile entities by the kind name `style-profile` (`plans/TRG-04.md` line 24). Agrees.
- **PST-08 (done).** `sources/` files count as `source` (PST-08 lines 18 and 20). `entities/` files need a `type` (line 19). GNP-03's `folder` values agree. Agrees.
- **PLT-22 (examples check, pack layer; not planned).** Its line 17 says it uses "the Tool registry's own loader and Ajv validation through the pack-lint CLI's library entry point", and its line 20 says "every entity file's front matter validates against its pack entity-type schema". The library exports only `PackFinding`, `lintPacks` and `formatFinding` (`pack-lint.ts` lines 11, 17 and 81), and it has no validator (GNP-01 open point 4). So PLT-22's plan must choose a seam: the in-process `CatalogService.entityValidator` (as this plan's test does), or a later export of the library. This is a conflict with the unit as written, to be settled by PLT-22's planner. PLT-20 (done) fills `type` for `sources/` files (`plans/PLT-20.md` line 36), so PLT-22 gets `type` on them.
- **TRG-10 (merged in `01955c1`; plan done).** It changed `catalog.service.ts`, `tools.controller.ts`, `tool-registry.module.ts` and `invariant-sweep.ts`, and added `user-pack.ts` and `tool-registry-save.test.ts`. It touches no packs path and no entity-type file, so it does not overlap with this plan's paths. The GET route of D11 is still at the lines cited. Agrees.
- **GNP-02 (not planned).** It creates the `apps/api/test/packs/` folder and its own files there (its unit line 15). This plan adds one file to the folder and shares no helper. If GNP-02 lands first, no conflict. If GNP-03 lands first, GNP-02 adds its files beside it.
- **GNP-04 and GNP-13 (parallel).** GNP-04 changes `core/tools/` only, and GNP-13 changes `fiction/entity-types/` only (its unit names no `core/entity-types` path). No overlap. Both still list GNP-03 in `parallel_with` (GNP-04 line 8, GNP-13 line 8), and GNP-03 lists both, so the lists are symmetric. Neither depends on GNP-03, nor GNP-03 on them.
- **Other plans on the same files.** `grep -l '^status: \(draft\|planned\)' plans/*.md` gives only this file. No other plan changes these paths. The open worktrees (PST-15, SAU-13, TRG-07) belong to units whose plans are `done`.

## 6. Open points

1. **SETTLED on 2026-11-16, option (a), by the orchestrator; unit commit `c45cd5e` (`docs(GNP-03,GNP-06): GNP-06 blocked_by adds GNP-03 (source entity kind)`).** GNP-06's `blocked_by` is now `[GNP-01, GNP-03]` and its `parallel_with` drops GNP-03; GNP-03's `unblocks` gains GNP-06 after GNP-05, and its `parallel_with` drops GNP-06. GNP-06 carries a note with the old `blocked_by`. The `parallel_with` lists of GNP-04, GNP-05 and GNP-13 needed no change: they stay symmetric, and none pairs a unit with one it depends on. This plan changes nothing because of it (the plan was correct under either option). The original text of the point follows. **GNP-06 needs GNP-03 on main before it can merge (conflict).** GNP-01's suite fails an `entity-kind` warning (`plans/GNP-01.md` D7, line 26), and TRG-07 gives that warning when no loaded entity type declares the kind (`units/TRG-07-lint-pack-lint-cli.md` line 19). GNP-06's `x-scriba-entity-kinds: [source]` (lines 15 and 16) therefore fails GNP-01's suite until `source.yaml` is on main. GNP-06 lists GNP-03 only in `parallel_with` (line 8), and `units/README.md` line 64 says `parallel_with` never pairs a unit with one it depends on. Options: (a) GNP-06's `blocked_by` names GNP-03, GNP-03's `unblocks` names GNP-06, and GNP-06's `parallel_with` drops GNP-03 (unit edits by the orchestrator); (b) the units stay as they are, and the driver merges GNP-03 before GNP-06 (authoring in parallel stays allowed, module line 7). This plan is correct under either option, and it changes no unit file. Recommendation: (a), by the README rule.

## Review parts

The plan is small (two YAML files, one deletion, one test file), so it has one part.

| Part | Steps (section 3) | Tests (section 4) | Files |
|---|---|---|---|
| 1. Core entity types `source` and `style-profile`, with their tests | 0 to 14 | AC1, AC2 | the four paths of section 2 |

## 7. Facts checked and facts assumed

### Facts checked

- **Main and tree.** At the first check `git log` head was `b15ede6`; at the second check it was `d144a95`, which this plan cites. Before this plan was written, `git status --short` showed only ` M units/SAU-12-providers-step.md`, which is not this unit's file and is not touched. `git worktree list` showed four other worktrees (PST-15, SAU-13, TRG-07, TRG-10); none is on GNP-03.
- **Plans.** At `b15ede6`, of the plans in `plans/` only `TRG-10.md` had status `planned`, and none had `draft`. At `d144a95`, `plans/TRG-10.md` has status `done`, because TRG-10 merged in `01955c1`. No `plans/GNP-03.md` existed before this plan.
- **GNP-01 on main.** `packages/packs/core/entity-types/.gitkeep` exists, and so do `packages/packs/test/{checks.ts, real-packs.test.ts, broken-specs.test.ts, content-checks.test.ts}` and the broken-spec fixtures. `packages/packs/package.json` has `build`, `test` and `lint`, and a `devDependencies` block that starts with `@bbartolome/scriba-contracts` and `@types/node`.
- **Library.** `apps/api/src/modules/tool-registry/pack-lint.ts`: `PackFinding` (line 11), `lintPacks` (lines 17 to 74), `formatFinding` (lines 81 to 83). The `file` label of a finding is `<pack>/<folder>/<file>` (`plans/GNP-01.md` section 7, the `packs.ts` finding label).
- **Lint subset.** `lint.ts` lines 59 to 76 (`ROOT_KEYWORDS`, `ANNOTATIONS`, `TYPE_KEYWORDS`); lines 939 to 965 (`checkEntityField`: scalar, list of scalars, or list of objects); lines 968 to 1040 (`checkFields`, the Ajv compile as the last check); lines 1116 to 1162 (`lintEntityTypeSource`).
- **Loader.** `entity-types.ts`: `checkField` (lines 131 to 153), `compileFields` (lines 180 to 196; strict Ajv, root `additionalProperties: true`, extensions stripped), `loadEntityType` (lines 200 to 255; the kind-equals-stem rule at lines 236 to 241), `readEntityTypes` (lines 259 to 275), `issueOf` (lines 279 to 293; an issue is `{path, message}`), `entityValidatorOf` (lines 296 to 304).
- **Catalog and route.** `catalog.service.ts` (at `d144a95`): `entityTypes()` (lines 329 to 335), `entityValidator(kind)` (lines 337 to 341). `tool-registry.module.ts` line 15 exports `CatalogService`. `tools.controller.ts`: `GET` of `ENTITY_TYPES_ROUTE` (lines 66 to 69). `routes.ts` line 11. `catalog.ts`: `entityTypeListSchema` (lines 67 to 71). `spec.ts`: `entityKindSchema` (line 66), `entityFolderSchema` (line 70), `entityTypeSchema` (lines 74 to 81).
- **Existing test pattern.** `apps/api/test/tool-registry-loader.test.ts`: `FIXTURE_PACKS` (line 51), the kit with `entity-validate` (lines 56 to 110, route at lines 91 to 100), the imports of `send` and `LOOPBACK_HOST` (lines 44 and 45), and the AC5 test (lines 642 to 694). `apps/api/test/create-test-app.ts`: `createTestApp` (lines 65 to 114), the default packs root (line 80), and the `env` merge (line 83).
- **Fixture form.** `apps/api/test/fixtures/packs/nonfiction/entity-types/claim.yaml` (lines 1 to 28): envelope, `title` annotations, `required` at the root of `fields`.
- **Vitest.** `apps/api/vitest.config.mts` includes `test/**/*.test.ts`. `apps/api/package.json` line 16 lists `ajv` 8.20.0, and line 20 lists `yaml`.
- **Folders.** `apps/api/test/packs/` and `packages/packs/test/golden/` do not exist on main.
- **Sample sources.** `examples/nonfiction/sources/` holds `deliberate-practice-notes.md`, `learning-plateaus-notes.md`, `outline.md` and `ten-thousand-hours-notes.md`. Each starts with a `#` heading, and none has front matter (checked with `head`).
- **Unit graph (revision 1, at `d144a95`; superseded below).** The units whose `blocked_by` named GNP-03 were GNP-05, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-18, CEX-04 and CEX-07. GNP-06 and GNP-13 named GNP-03 in `parallel_with` only.
- **Unit graph (revision 2, at `c45cd5e`).** `grep -n 'GNP-03' units/*.md` on the front-matter lines: the units whose `blocked_by` names GNP-03 are GNP-05, GNP-06, GNP-07, GNP-08, GNP-09, GNP-10, GNP-11, GNP-18, CEX-04 and CEX-07, the exact list of GNP-03's `unblocks` (unit line 9). `parallel_with` naming GNP-03: GNP-04 and GNP-13 only, which GNP-03 names back (line 8).
- **Other facts.** `units/GNP-01-packs-scaffold-content-checks.md` line 15 (`.gitkeep` until content lands). `plans/GNP-01.md` lines 14, 18, 26, 34 (D1, D3, D7, D11), 115 (GNP-03's downstream list) and 133 (open point 4). `plans/PLT-20.md` lines 36 and 103 (sources rule; outline without front matter). `plans/PST-01.md` line 174 (the PST-08 hand-off). `plans/TRG-04.md` line 24. `plans/TRG-10.md` lines 40 and 58.
- **DECISIONS.** Searched by unit id only (GNP-01, GNP-03 and the downstream units). The GNP-03 entry is the PST-01 review of revision 3, item 3 (line 2287), which names GNP-03 and states the `sources/` hand-off to PLT-20. The PLT-20 sources rule is in `plans/PLT-20.md` D10 (line 36), not in DECISIONS. The GNP-01 entry of 2026-11-16 (line 4903) decides the CI clause, which does not touch GNP-03.

### Re-checked by the reviser (revision 2, at `c45cd5e`)

- `git diff --stat d144a95 16a8705` lists only `plans/GNP-03.md`; `c45cd5e` changes only the two unit files. No code path of this plan changed.
- Unit lines 14 to 21; module lines 7, 31, 37, 69, 73, 74, 82, 85 and 87; `units/README.md` line 64.
- `lint.ts` lines 59 to 76 (the keyword lists, read), 308 (`checkKeywords`), 939, 968 and 1116 (function starts).
- `entity-types.ts` lines 131, 156, 180 to 196 (strict Ajv, root `additionalProperties: true`, read), 200, 236 to 241 (stem rule, read), 259 to 275, 279 to 293 (`issueOf`, read), 296 to 304 (read).
- `catalog.service.ts` lines 329 to 341 (read); `tools.controller.ts` lines 66 and 67; `tool-registry.module.ts` lines 15 and 59 (`exports: [CatalogService]`); `routes.ts` line 11; `catalog.ts` lines 68 to 71; `spec.ts` lines 66, 70, 74 and 82; `pack-lint.ts` lines 11, 17 and 81; `packs.ts` line 325 (the finding label `${pack}/${folder}/${file}`).
- `create-test-app.ts` lines 9 to 14, 65 to 114 (read); `tool-registry-loader.test.ts` lines 1 to 112, 158 to 195 and 642 to 694 (read).
- `apps/api/package.json` lines 16 (`ajv` 8.20.0) and 20 (`yaml`); `vitest.config.mts` line 8; the three workspace names; root `package.json` lines 26 and 28 (`lint`, `lint:packs`).
- `git ls-files packages/packs/core` lists only the two `.gitkeep` files; `apps/api/test/packs/` does not exist; `packages/packs/test/checks.ts` lines 86 to 90 turn the `entity-kind` warning into an error; no test there reads `.gitkeep`.
- `examples/nonfiction/sources/*.md` start with a `#` heading (no front matter).
- Downstream units read in full: GNP-04, GNP-05, GNP-06, GNP-07 to GNP-11, GNP-13, GNP-18, CEX-04, CEX-07. No plan file exists for any of them (`ls plans/`), and no `unit/GNP-06` branch exists.
- `plans/DECISIONS.md` searched for GNP-01, GNP-03 and GNP-06: lines 2263, 2287, 4903 to 4912. No PLAN DOES NOT WORK report for GNP-03.
- `plans/GNP-01.md` lines 14, 115 and 133.

### Facts assumed (each one is tested at the step named)

- A1. `npm ci` in a new worktree reaches the registry and succeeds with the committed lock. Tested at step 2.
- A2. `checkKeywords` accepts `items: {type: string}` on a scalar list field, as D7 states. Tested at step 9 (lint).
- A3. `lintEntityTypeSource` and `lintPacks` report no finding for the two files. Tested at step 9.
- A4. Vitest with the swc plugin can import `apps/api/src/modules/tool-registry/pack-lint.ts` from a test file under `apps/api/test/packs/`. Tested at step 7.
- A5. The boot on the real packs root with no static root works as it does in `tool-registry-loader.test.ts`. Tested at step 7.
- A6. The issues are `missing required property "citation"` with an empty path (`issueOf`, `entity-types.ts` lines 280 to 284, checked) and Ajv's type error at `/bannedPhrases` (line 292; Ajv's text, expected `must be array`, not asserted). Tested at step 7; the test asserts the paths, and the field name only in the `citation` message.

### Not verified

- The planner ran no build, no test and no lint. It ran only read commands (`grep`, `sed`, `find`, `head`, `git log`, `git status`, `git worktree list`, `git diff`-free reads) and read files. Steps 2 to 13 check everything above.
- No GitHub run was made, and nothing was pushed.
