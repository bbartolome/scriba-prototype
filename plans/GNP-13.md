---
id: GNP-13
title: Fiction entity types — character, place, world-rule
status: draft
---
# GNP-13 plan — fiction entity types: character, place and world-rule

Batch: [GNP-13] (Genre packs, phase:fiction, M6), a batch of one. Draft written by the planner at main `ac41d18`. The unit file was read in full (lines 1 to 22). It has no change note: `plans/DECISIONS.md` has no GNP-13 entry, and the only search hit for "GNP-13" is the 2026-11-16 GNP-06 Navigator decision on module line 31 (`grep -n "GNP-13" plans/DECISIONS.md`). No `unit/GNP-13` branch, no GNP-13 worktree and no `plans/GNP-13.md` existed before this draft. The planner ran read-only commands only (`git`, `grep`, `sed`, `Read`). It ran no build, no test and no lint.

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken.

**D1 Kinds, files and folder.** `packages/packs/fiction/entity-types/character.yaml` (kind `character`), `place.yaml` (kind `place`) and `world-rule.yaml` (kind `world-rule`). All three have folder `entities`. Source: unit lines 15 to 17; module lines 78 to 80 (fiction rows, folder column); module line 37 (`entity-types/<kind>.yaml` layout). The kind `world-rule` matches `ENTITY_KIND_PATTERN` (`packages/contracts/src/tool-registry/constants.ts` line 11, `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`), and `ENTITY_FOLDERS` (line 58) holds `entities`.

**D2 Field names and types.** `character`: `name`, `want`, `need`, `flaw`, `voice` (strings) and `relationships` (a list of objects `{character, note}`). `place`: `name` (string) and `rules` (a list of strings, each a `world-rule` ref). `world-rule`: `statement` (string) and `appliesTo` (a list of strings, each a `place` ref). Source: unit lines 15 to 17; module lines 78 to 80; module line 82 (entity-type names and fields are stable once shipped). `voice` is a string, because the module writes it as "(notes)" and no source gives it a structure. Plan choice for the type.

**D3 Every field is required.** Each listed field is in its kind's `required`, and each relationship item requires `character` and `note`. Source: unit lines 15 and 17 mark no field as optional, and the module table marks none with `?` (module lines 78 to 80; compare `url?` on line 73). Plan choice, as GNP-06 D5.

**D4 Reference hints.** `place.rules` carries `x-scriba-type: entity` and `x-scriba-entity-kinds: [world-rule]` on the array node. `world-rule.appliesTo` carries `x-scriba-type: entity` and `x-scriba-entity-kinds: [place]` on the array node. In `character.relationships`, the item property `character` carries `x-scriba-type: entity` and `x-scriba-entity-kinds: [character]`. Source: unit lines 15 to 17 (the character ref with its two hints); module line 69 (reference fields carry both hints). Module line 66 governs tool inputs, not entity fields, so it is not the source. Placement: the array-node hints follow GNP-06 D4 and the tool convention. The item-property hints follow the loader and the lint, which both check hints on each item property (`checkObjectItems` in `apps/api/src/modules/tool-registry/entity-types.ts` line 87, and `checkEntityItems` in `lint.ts` line 847).

**D5 The one-level object list.** `relationships` is `type: array` with `items: {type: object, properties: {character, note}, required: [character, note], additionalProperties: false}`. Each property is a scalar, and there is no third level. Source: unit line 15 ("one-level array of objects", `required`, `additionalProperties: false`); module line 69 ("the one-level array-of-objects extension"). The loader and the lint both refuse a list item without `additionalProperties: false`, and refuse a property that is not a scalar: `checkObjectItems` (entity-types.ts line 87) and `checkEntityItems` (lint.ts line 847). The loader test E6 (`apps/api/test/tool-registry-loader.test.ts` line 696) shows that refusal on fixtures.

**D6 Envelope.** `schemaVersion: 1`, `kind` (equal to the file stem), `title`, `description` (one line that says what the body holds), `folder: entities` and `fields` (an object schema with `type: object`). Source: module line 69 (envelope and description rule); `entityTypeSchema` (`packages/contracts/src/tool-registry/spec.ts` lines 74 to 81, a strict object); the kind-equals-stem check in `loadEntityType` (`entity-types.ts` line 200 onward). The titles and the wording of the descriptions are plan choices.

**D7 Body.** The Markdown body is not validated. Each description says what the body holds: backstory (`character`), description (`place`), consequences and exceptions (`world-rule`). Source: module lines 78 to 80. Plan choice for the wording.

**D8 "Lint clean".** It means that `lintPacks` gives no finding at all for the three files: neither an error nor a warning. Source: unit line 21 ("All three lint clean"). Plan choice, the stricter reading that GNP-03 D10 and GNP-06 D8 also use.

**D9 No other fields.** The three kinds have exactly the fields of D2. No `scenes` field, because "links to scenes are story-graph relations". Source: unit line 18.

**D10 Blocker and base.** Only GNP-01 blocks this unit (unit line 7). GNP-01 is `status: done` on main (`plans/GNP-01.md` line 4). The folders `packages/packs/fiction/entity-types/` and `packages/packs/fiction/tools/` exist on main, each with a `.gitkeep`. Source: unit line 7; module line 7 (entity types need GNP-01, and GNP-02 is needed only for tools). Note: module line 31 starts the group "After GNP-01 + GNP-02". The unit's `blocked_by` governs (`units/README.md`, blocker notation: `blocked_by` is the source of truth). GNP-02 is done, and this plan uses no harness, so both readings give the same result.

**D11 Test file and seam.** The file is `apps/api/test/packs/fiction-entity-types.test.ts`. It boots the app on the real packs root with a test-only kit, copied (not shared) from `apps/api/test/packs/nonfiction-entity-types.test.ts`, which is `done`. Source: unit line 22 (per-kind validators); module line 85 (external behaviour, never Tool registry internals); module line 86 (content checks use the pack-lint library entry point); module line 87 (real-packs tests in `apps/api/test/packs/`); GNP-03 D12 and GNP-06 D10 (the same kit). The file name is a plan choice.

**D12 No dependencies.** `package-lock.json` and every `package.json` stay as they are. Source: GNP-06 D13 (the same case); plan choice.

**D13 Commit message.** `feat(GNP-13): fiction entity types character, place and world-rule`. It carries the unit id, as `prompt.md` requires for code commits. Plan choice, the form of GNP-06 D15.

**D14 Scope limit.** No tool, golden, sample or fixture is added. Source: module line 3 (content only); module lines 95 to 96 (out of scope); the unit's Decisions name only the three entity types. The fiction tools (GNP-14 to GNP-17) and the fiction sample (GNP-18) are other units.

## 2. Files to change

Only the paths below change. No other file in the repository changes.

| Path | Action | What changes |
|---|---|---|
| `packages/packs/fiction/entity-types/character.yaml` | create | The `character` entity type (text below, D1 to D7) |
| `packages/packs/fiction/entity-types/place.yaml` | create | The `place` entity type (text below, D1 to D7) |
| `packages/packs/fiction/entity-types/world-rule.yaml` | create | The `world-rule` entity type (text below, D1 to D7) |
| `packages/packs/fiction/entity-types/.gitkeep` | delete (`git rm`) | D10. The folder holds files now (GNP-01 unit line 15: "with `.gitkeep` until content lands") |
| `apps/api/test/packs/fiction-entity-types.test.ts` | create | The two tests of section 4, with the kit of D11 |

Not changed: `packages/packs/fiction/tools/**` (GNP-14 to GNP-17), `packages/packs/core/**` (GNP-03), `packages/packs/nonfiction/**` (GNP-06 and later), `packages/packs/test/**` (the GNP-01 suite), `apps/api/test/packs/nonfiction-entity-types.test.ts` (GNP-06), `apps/api/test/packs/core-entity-types.test.ts` (GNP-03), `apps/api/test/fixtures/**`, `apps/api/src/**`, `packages/contracts/**`, `examples/**`, `package.json` (root and workspaces), `package-lock.json`, `plans/DECISIONS.md`, `plans/QUEUE.md`, `units/**` and `modules/**`.

Text of `packages/packs/fiction/entity-types/character.yaml`:

```yaml
schemaVersion: 1
kind: character
title: Character
description: A character of the story, with the want, need, flaw, voice and relationships; the body holds the backstory.
folder: entities
fields:
  type: object
  properties:
    name:
      type: string
      title: Name
    want:
      type: string
      title: Want
      description: What the character is trying to get.
    need:
      type: string
      title: Need
      description: What the character has to learn or gain.
    flaw:
      type: string
      title: Flaw
      description: The fault that works against the character.
    voice:
      type: string
      title: Voice
      description: Notes on how the character speaks.
    relationships:
      type: array
      title: Relationships
      description: The other characters this one has a relationship with, each with a note.
      items:
        type: object
        properties:
          character:
            type: string
            title: Character
            x-scriba-type: entity
            x-scriba-entity-kinds: [character]
          note:
            type: string
            title: Note
        required: [character, note]
        additionalProperties: false
  required: [name, want, need, flaw, voice, relationships]
```

Text of `packages/packs/fiction/entity-types/place.yaml`:

```yaml
schemaVersion: 1
kind: place
title: Place
description: A setting of the story, with the world rules that hold there; the body holds the description.
folder: entities
fields:
  type: object
  properties:
    name:
      type: string
      title: Name
    rules:
      type: array
      title: Rules
      description: The world rules that hold in this place.
      x-scriba-type: entity
      x-scriba-entity-kinds: [world-rule]
      items:
        type: string
  required: [name, rules]
```

Text of `packages/packs/fiction/entity-types/world-rule.yaml`:

```yaml
schemaVersion: 1
kind: world-rule
title: World rule
description: A rule that holds in the story world, in the places it applies to; the body holds its consequences and exceptions.
folder: entities
fields:
  type: object
  properties:
    statement:
      type: string
      title: Statement
      description: The rule in one sentence.
    appliesTo:
      type: array
      title: Applies to
      description: The places where this rule holds.
      x-scriba-type: entity
      x-scriba-entity-kinds: [place]
      items:
        type: string
  required: [statement, appliesTo]
```

## 3. Method

The code stage runs in its own worktree on `unit/GNP-13`, cut from main by the driver (`prompt.md`, Implement). Run every command from the worktree unless it says otherwise. Record `node -v` and `npm -v` beside each result. Use Node 26 (`node -v` prints `v26.x`). Do not push.

0. **Base.** In the main checkout, `git rev-parse --short HEAD` prints `ac41d18`, or a later commit. `git diff --quiet ac41d18 HEAD -- packages/packs apps/api/test/packs apps/api/src/modules/tool-registry packages/contracts/src/tool-registry` exits 0. If not, re-read the lines that section 7 cites for the changed files before editing. The driver runs `git branch unit/GNP-13 main` (no branch exists yet), then `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GNP-13 unit/GNP-13` (no `-b`). In the worktree `git status --short` prints nothing.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.x`.
2. **Install.** `npm ci`. Expected: exit 0, and `git status --short` still prints nothing. This checks assumption A1.
3. **Baseline.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-api && npm test -w @bbartolome/scriba-packs`. Expected: exit 0 on the unchanged tree. Record the file and test counts. The contracts build comes first, because the API tests import the built subpaths.
4. **Entity types (D1 to D7, D10).** Write the three YAML files of section 2. Then `git rm -- packages/packs/fiction/entity-types/.gitkeep`. Expected: `git status --short` lists the three new files and the deletion, and nothing else.
5. **Test file (section 4, D8 to D11).** Create `apps/api/test/packs/fiction-entity-types.test.ts`. Copy lines 1 to 90 of `apps/api/test/packs/nonfiction-entity-types.test.ts` (the imports, `PACKS_ROOT`, `KIT`, `validatorKitModule`, `withRealPacks`, `kitPost` and `json`) unchanged. Then add the two tests of section 4, with the names given there.
6. **Format.** `npx prettier --write packages/packs/fiction/entity-types apps/api/test/packs/fiction-entity-types.test.ts`, then `npx prettier --check packages/packs apps/api/test/packs`. Expected: exit 0.
7. **New tests.** From `apps/api`: `npx vitest run test/packs/fiction-entity-types.test.ts`, expected 2 passed, 0 failed. Then `npx vitest run test/packs`, expected every file to pass, with the GNP-03 and GNP-06 files included. This checks assumptions A3 to A7.
8. **Mutation checks (each reverted before the next).** Before each change, copy the file to `/tmp/gnp13-copies/`, and restore it with `cp` after the run. Run from `apps/api`: `npx vitest run test/packs/fiction-entity-types.test.ts`. (a) In `character.yaml`, delete the line `additionalProperties: false` under the `relationships` items: AC1 must fail (the lint finding and the boot both fail). (b) In `character.yaml`, change `required: [character, note]` to `required: [character]`: AC2 must fail, because a relationship without a note is then valid. (c) In `character.yaml`, change the item property's `x-scriba-entity-kinds: [character]` to `[person]`: AC1 must fail at (iv). (d) In `place.yaml`, change `x-scriba-entity-kinds: [world-rule]` to `[world-rules]`: AC1 must fail at (v). The lint does not see this change, so only (v) catches it. (e) In `world-rule.yaml`, change `folder: entities` to `folder: sources`: AC1 must fail at (iii). After each restore, the file equals its copy, and `git status --short` matches step 4.
9. **Lint.** From the root: `npm run lint:packs`, `npm run lint:examples`, then `npm run lint -w @bbartolome/scriba-packs` and `npm run lint -w @bbartolome/scriba-api`. Expected: each exits 0, with no finding for the three YAML files or the test file. `lint:examples` loads the built packs (`scripts/examples-check/index.mjs` line 57), so a fault in a fiction file would stop it with exit 2. This checks assumptions A2 and A8.
10. **Packs suite.** `npm test -w @bbartolome/scriba-packs`. Expected: exit 0. `real-packs.test.ts` expects zero errors and `contentChecks` expects no finding on the real packs (`packages/packs/test/real-packs.test.ts`, the "suite passes on the real packs" test), so both must still hold with the three files.
11. **Root gates.** From the root: `npm run build`, `npm test` (the workspace tests and `node --test 'scripts/*.test.mjs'`) and `npm run lint` (which runs the workspace lints, `lint:examples`, `lint:packs` and `prettier --check .`). Expected: each exits 0.
12. **Commit.** `git add -- packages/packs/fiction/entity-types/character.yaml packages/packs/fiction/entity-types/place.yaml packages/packs/fiction/entity-types/world-rule.yaml apps/api/test/packs/fiction-entity-types.test.ts`. The deletion of `.gitkeep` is already staged by step 4. Then `git diff --cached --stat`, which must list exactly these four files and the deletion of `packages/packs/fiction/entity-types/.gitkeep`. Commit with `git commit -m "feat(GNP-13): fiction entity types character, place and world-rule" -- <the four files and the .gitkeep path>`. Do not use `git add -A` or `git commit -a`. Do not push.
13. **Fresh clone.** `git clone --branch unit/GNP-13 /Users/bbartolome/workspace/scriba-prototype <tmp>` into an empty folder outside the repository. In it, `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
14. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 4 holds. The unit file's checkboxes are ticked by the orchestrator at merge, not by this plan.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-13-fiction-entity-types.md` lines 21 and 22. Each criterion has one test, in `apps/api/test/packs/fiction-entity-types.test.ts`. The file has no other test. Both tests run with `npx vitest run test/packs/fiction-entity-types.test.ts` from `apps/api`. The AC2 test boots the app on the real packs root with `createTestApp` and the kit of D11, as GNP-06 does.

| Criterion (unit line) | Test name | Command | Pass condition |
|---|---|---|---|
| "All three lint clean (the registry accepts `relationships` as the one-level extension)." (21) | "AC1: character, place and world-rule lint clean, load, and their reference fields name shipped kinds" | same | (i) `lintPacks(PACKS_ROOT)` (`apps/api/src/modules/tool-registry/pack-lint.ts`) has no finding whose `file` starts with `fiction/entity-types/` (D8). (ii) The app boots on the real packs root (a fault in one of the files stops boot, D10). (iii) `GET /api/tool-registry/entity-types` (`ENTITY_TYPES_ROUTE`, sent with `host: LOOPBACK_HOST`) answers 200; its list parses with `entityTypeListSchema`; the entries `character`, `place` and `world-rule` each have folder `entities`. (iv) For each of the three kinds, `fields.type` is `object`, the keys of `fields.properties` are exactly the D2 names, and `fields.required` names the same keys (D3, D9). In the `character` entry, `fields.properties.relationships.items` has `additionalProperties` `false` and `required` `['character', 'note']`, and its property `character` has `x-scriba-type` `entity` and `x-scriba-entity-kinds` `['character']`. In the `place` entry, `fields.properties.rules` has kinds `['world-rule']`. In the `world-rule` entry, `fields.properties.appliesTo` has kinds `['place']` (D4, D5). (v) The kinds that these hints name (`character`, `world-rule` and `place`) are all entries of the same list (the shipped kinds). The test asserts these values only, not the whole schema. |
| "Per-kind validators accept valid fixtures and reject a relationship missing `note`." (22) | "AC2: the per-kind validators accept valid fixtures and reject a relationship missing note" | same | Through the kit's `POST /api/tool-registry-test/entity-validate` (D11). A `character` with `name`, `want`, `need`, `flaw`, `voice` and `relationships: [{character: 'tomas-reyes', note: 'Her relief keeper; she trusts him slowly.'}]` is valid. The same `character` with `relationships: []` is valid (D3; no `minItems`, see open point 2). A `place` with `name: 'Skerry Light'` and `rules: ['spring-tide-only']` is valid. A `world-rule` with `statement: 'The supply boat comes only on a spring tide.'` and `appliesTo: ['skerry-light']` is valid. The same `character` with `relationships: [{character: 'tomas-reyes'}]` (no `note`) is invalid, with an issue whose `path` is `/relationships/0`. The same `character` with a relationship that has an extra key `weight: 2` next to `character` and `note` is invalid, with an issue whose `path` is `/relationships/0` (D5, `additionalProperties: false`). The test asserts `valid` for each valid case and the `path` of each issue, and no message text (module line 85). The missing `note` is the only change between the valid relationship and the invalid one, so the pair shows that `note` is the reason. The fixtures name no real person. |

## 5. Downstream agreement

Each unit below is in `unblocks` of GNP-13 (the exact inverse of the `blocked_by` entries that name GNP-13). Each `blocked_by` entry was checked by grep of the front matter. The units were read in full, except as noted.

- **GNP-14 (`character_builder` and `world_builder`).** `character_builder` returns a `character` file with `name`, `want`, `need`, `flaw`, `voice` and `relationships` (its Specs). This plan gives those names, and `relationships` takes `{character, note}` objects, so the output of the prompt is valid. `world_builder` takes `ruleIds` with kinds `place` and `world-rule` (its Specs). Both kinds are shipped here, with the hints of D4. Agrees.
- **GNP-15 (`scene_builder`).** Its `pov` input is an entity port of kind `character`. This plan ships kind `character` in folder `entities`. Agrees.
- **GNP-16 (`dialogue`).** `characterIds` is an entity port list of kind `character` with `minItems` 2 (`units/GNP-16-dialogue.md` line 17). Its prompt renders each character's `voice` and `relationships`, which this plan gives as fields. Agrees.
- **GNP-17 (`plot_manager`).** Its inputs are `outline` and `entityIds`. It names no kind of this plan. Agrees.
- **GNP-18 (fiction sample).** Its `entities/` are two `character`s with relationship notes, one `place`, one `world-rule` and one `style-profile` (its Decisions). Each character must give all six required fields (D3), and each relationship must give `character` and `note` (D5). The place must give `name` and `rules`, and the world-rule must give `statement` and `appliesTo` (D3). These are constraints for the planner of GNP-18, which is not drafted yet. This plan changes no GNP-18 file. Agrees, with the constraint noted.
- **GNP-19 (fiction gate).** Its criterion "every entity input names an existing entity type" needs the kinds `character`, `place` and `world-rule`, which this plan ships. Agrees.
- **Units that name GNP-13 in `parallel_with`.** GNP-03, GNP-04, GNP-05, GNP-06, GNP-07, GNP-08, GNP-09, GNP-10 and GNP-12 each list GNP-13 back, so the lists are symmetric. GNP-11 neither lists GNP-13 nor is listed by it, which is consistent too. These units are `done` on main, and the fiction folders on main hold only `.gitkeep` files (`git ls-tree` of `packages/packs/fiction`), so none of them created a path of section 2. None of them changes a GNP-13 path. Agrees.
- **Other units that mention these kinds.** A grep of `units/` and `modules/` for `character`, `place`, `world-rule` and `relationship` finds only the GNP-13 to GNP-19 units and the module. No AGL or CEX unit uses these kinds. Agrees.
- **Draft and planned plans that change the same files.** `grep -l -E '^status: *(draft|planned)' plans/*.md` gives `plans/CEX-01.md`, `plans/GRR-10.md`, `plans/GRR-16.md`, `plans/TRG-14.md` and `plans/SAU-22.md`. None of them changes a path of section 2, and none names `packages/packs/fiction`, `apps/api/test/packs/`, `apps/api/test/fixtures/packs/`, `packages/packs/test/`, or the Tool registry's loader and lint files as a changed file. GRR-16 and TRG-14 read `packages/packs/nonfiction/tools/` and `packages/packs/core/tools/` only. GRR-16 mentions `apps/api/test/create-test-app.ts` only as a reference, and none of its lines lists that file as a changed file. So the change of this plan and the changes of those plans come in either order. A later plan for GNP-14 to GNP-18 uses other file names.

## 6. Open points

1. **Hint values of entity types are not checked by the content suite (for the Navigator; the plan follows option (a)).** GNP-01's scope says that "every `x-scriba-entity-kinds` value names a shipped entity type" (`units/GNP-01-packs-scaffold-content-checks.md` line 18). The code does not do this for entity types. `lintEntityTypeSource` (`lint.ts` line 1116) checks the form of the hints, not their values (`checkEntityHints`, line 826). `contentChecks` (`packages/packs/test/checks.ts` around line 86) promotes only the tool lint's `entity-kind` warnings. Option (a), this plan: AC1 (v) checks the three kinds of this unit, and the suite is unchanged. Option (b): the Navigator reopens GNP-01's suite, which is `done`, to check entity-type hints too. A change to that suite is not this plan's to make. The same gap holds for the GNP-06 kinds (`source`, `person`, `claim`, `concept`), which GNP-06 covers only in its own test.
2. **Empty lists are valid (settled at plan level; the reviser confirms).** `relationships`, `rules` and `appliesTo` have no `minItems`. The unit (lines 15 and 17) and the module (lines 78 to 80) set no minimum, and GNP-06 open point 2 settled the same question for `sources` and `evidence`. The only explicit `minItems` in the fiction units is GNP-16's `characterIds`, and its unit states it. If the Navigator wants a place to have at least one rule, that is a new decision. This plan does not make it.
3. **Seam of AC2 (settled at plan level; the reviser confirms).** No public route validates the front matter of an entity against its type. `entityValidator` (`catalog.service.ts` line 357) is called by no route; its only callers are the test kits (`apps/api/test/packs/core-entity-types.test.ts`, `apps/api/test/packs/nonfiction-entity-types.test.ts` and `apps/api/test/tool-registry-loader.test.ts`). So the test uses the test-only kit of D11, as GNP-03 D12 and GNP-06 D10 did.
4. **Place of the lint assertion (settled at plan level; the reviser confirms).** AC1 (i) calls `lintPacks` from `apps/api`, as GNP-06 does. `packages/packs/test/` could hold the same assertion, and module line 86 names that suite for content checks. This plan follows GNP-06, so that the two nonfiction and fiction units are alike. Either place gives the same result.
5. **Reading of "one-level" (settled by the loader).** A relationship property is a scalar, so the rule holds. A nested list or object inside a relationship would be refused at boot (E6). This plan does not add one.

No open point needs a unit change (Remove, Loosen, Reword or Split). No criterion is weakened.

## Review parts

The plan is small (three YAML files, one deletion and one test file with two tests), so it has one part. Each step and each test is in this part.

| Part | Steps (section 3) | Tests (section 4) | Files |
|---|---|---|---|
| 1. Fiction entity types `character`, `place` and `world-rule`, with their tests | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 | AC1 (i) to (v), AC2 | the five paths of section 2 |

The reviewer of part 1 also checks that the diff changes only the five paths of section 2.

## 7. Facts checked and facts assumed

### Facts checked

- **C1 Main and tree.** `git rev-parse --short HEAD` prints `ac41d18`. `git status --short` prints nothing. `git branch --list 'unit/GNP-13'` and the worktree list show no GNP-13 branch or worktree (the worktrees are CEX-01, GRR-10, GRR-16, TRG-14 and `live`). `plans/GNP-13.md` does not exist before this draft.
- **C2 Unit file.** `units/GNP-13-fiction-entity-types.md` lines 1 to 10 are the front matter: `blocked_by: [GNP-01]` (line 7), `parallel_with` (line 8), `unblocks: [GNP-14, GNP-15, GNP-16, GNP-17, GNP-18, GNP-19]` (line 9). Decisions are lines 14 to 18, the criteria lines 20 to 22. The file has no change note.
- **C3 Module.** `modules/genre-packs.md`: line 3 (content only), line 7 (entity types need GNP-01, tools also GNP-02), line 21 (the graph), line 31 (the Navigator's wording of the start of the group), line 33 (the four fiction tool units and the sample in parallel), line 37 (layout), line 66 (hints on tool inputs), line 69 (the envelope and the reference hints), lines 78 to 80 (the three fiction rows), line 82 (stable names), lines 85 to 87 (test principles, content checks, golden location), lines 95 to 96 (out of scope).
- **C4 Blocker.** `plans/GNP-01.md` on main has `status: done` (line 4). On main, `packages/packs/` holds `fiction/entity-types/.gitkeep` and `fiction/tools/.gitkeep`, and no `character`, `place` or `world-rule` file. GNP-02 to GNP-12 have `status: done` on main.
- **C5 Downstream.** `grep -l "GNP-13" units/*.md` finds the unblocks of section 5 (`blocked_by` names GNP-13 in GNP-14 to GNP-19) and the `parallel_with` lists. The fields and hints quoted in section 5 are in GNP-14 (the `character_builder` and `world_builder` specs), GNP-15 (`pov`), GNP-16 (`characterIds`, `minItems` 2, line 17; `voice` and `relationships`), GNP-17 and GNP-18 (the sample entities, Decisions).
- **C6 Loader.** `apps/api/src/modules/tool-registry/entity-types.ts`: `SCALAR_TYPES` line 20 (`string`, `integer`, `number`, `boolean`), `ITEM_TYPES` line 21 (`string`, `integer`, `number`), `FIELD_HINTS` line 23 (the two entity hints); `checkHints` line 54; `checkObjectItems` line 87 (`additionalProperties: false` required; each property a scalar with hints allowed; `required` a list of names); `checkField` line 131 (a list of objects is the one extension); `checkFields` line 156; `compileFields` line 180 (strict Ajv with `allErrors`, root `additionalProperties: true`); `loadEntityType` line 200 (the kind must equal the stem; the lint runs last, and its errors stop boot); `issueOf` line 279 (`path` is the instance path, so a missing `note` is at `/relationships/0`; an extra key is at the item too); `entityValidatorOf` line 296.
- **C7 Lint.** `apps/api/src/modules/tool-registry/lint.ts`: `checkEntityHints` line 826 (only the two hints, with a list of strings for the kinds); `checkEntityItems` line 847 (item keys limited to `type`, `properties`, `required`, `additionalProperties`, `title`, `description`; `additionalProperties: false` required; each property a scalar with its hints); `checkEntityField` line 939 (a list of objects goes to `checkEntityItems`; a list of scalars and a scalar go to `checkKeywords`); `lintEntityTypeSource` line 1116.
- **C8 Pack lint.** `apps/api/src/modules/tool-registry/pack-lint.ts` `lintPacks` line 35: entity-type files are linted first, with the label `<pack>/entity-types/<stem>.yaml`; each finding has its `file`. The kinds set for tools is built from the error-free entity types only. `packages/packs/test/checks.ts` line 77 wraps `lintPacks`, and `contentChecks` (line 83 onward) promotes only the tool lint's `entity-kind` warnings (comment at line 86).
- **C9 Contracts.** `ENTITY_KIND_PATTERN` (`packages/contracts/src/tool-registry/constants.ts` line 11) and `ENTITY_FOLDERS` (line 58, `sources` and `entities`). `entityTypeSchema` (`packages/contracts/src/tool-registry/spec.ts` lines 74 to 81) is a strict object, and `fields` is a loose record (line 80). `ENTITY_TYPES_ROUTE` is `/api/tool-registry/entity-types` (`routes.ts` line 11).
- **C10 Catalog.** `catalog.service.ts` `entityTypes()` line 349 and `entityValidator(kind)` line 357. `entityValidator` is called only by the test kits and by the catalog itself (`git grep` of `apps` and `packages`, excluding tests).
- **C11 Precedent tests.** `apps/api/test/packs/nonfiction-entity-types.test.ts` on main: 196 lines, the kit in lines 1 to 90, the first `it(` at line 92. `apps/api/test/packs/core-entity-types.test.ts` has the same kit. `apps/api/test/tool-registry-loader.test.ts` line 642 (AC5: an object list with `additionalProperties: false` and `required` loads, fixture `apps/api/test/fixtures/packs/nonfiction/entity-types/claim.yaml` lines 16 to 27) and line 696 (E6: a two-level object, a missing `additionalProperties: false`, and an object field each stop boot).
- **C12 Root scripts.** `package.json` scripts: `build`, `test` (workspaces, then `node --test 'scripts/*.test.mjs'`), `lint` (workspace lints, `lint:examples`, `lint:packs`, `prettier --check .`), `lint:examples` (`scripts/examples-check/index.mjs`, which loads `packages/packs` through `loadBuiltinPacks`, line 57), `lint:packs` (`scripts/lint-packs.mjs`, which runs the built library). The package names `@bbartolome/scriba-api` and `@bbartolome/scriba-packs` are in their `package.json` files.
- **C13 Create-test-app.** `apps/api/test/create-test-app.ts` accepts `env` and `modules` (lines 11 and 13 of the options). GNP-06's test uses both.
- **C14 Other drafts and plans.** The draft and planned plans are listed in section 5. `grep` of their section 2 and their text for `packages/packs/fiction`, `apps/api/test/packs`, `packages/packs/test` and the loader files finds no change to these paths.

### Facts assumed (each one is tested at the step named)

- **A1.** `npm ci` in a new worktree succeeds with the committed lock. Step 2.
- **A2.** The lint accepts `items` with `type: object`, `properties` of scalars with the two hints, `required`, and `additionalProperties: false`, as C7 reads. Read, not run. Step 9.
- **A3.** Ajv compiles the three schemas in strict mode after `stripExtensions` (`apps/api/src/modules/tool-registry/inputs.ts`, `stripExtensions` at line 172, which removes every `x-` key at every depth). The object-list precedent of C11 supports this. Step 7.
- **A4.** `GET /api/tool-registry/entity-types` returns the `fields` object with its `x-` keys, because `entityTypeSchema` keeps `fields` as a loose record (C9). Step 7, AC1 (iv).
- **A5.** An issue for a missing `note` has `path` `/relationships/0` (C6, `issueOf` line 279). Step 7, AC2.
- **A6.** The kit boots on the real packs root as in GNP-06's test (C11). Step 7.
- **A7.** `lintPacks` labels the findings with `fiction/entity-types/<stem>.yaml` (C8). Step 7, AC1 (i).
- **A8.** `real-packs.test.ts` and `content-checks.test.ts` still pass with the three files, because no tool check reads entity-type fields (C8). Step 10.

### Not verified

- The planner ran no build, no test and no lint. It ran only read commands and wrote only this file. Steps 2 to 13 check everything above.
- Nothing was pushed. No remote check was made.
