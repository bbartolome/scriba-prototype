---
id: GNP-18
status: done
---
# GNP-18 plan — fiction sample project (examples/fiction) and its samples.yaml entry

Batch: [GNP-18] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `28a07e2`. Revision 1 by the Opus reviser at main `fd51cd9` (the draft commit; the working tree was clean). The reviser changed no file except this one, made no unit change, ran no build, test, lint or npm command, and committed nothing.

Revision 1 notes (reviser, 2026-11-19):
- **Open point 1 settled without a unit change.** A text value pinned on `coreIdea` in the `dialogue` node's `params` is accepted by the validator, the examples check and the runner (facts in section 1a, "Text pin"). The recipe now has exactly the nodes of unit line 20 (three inputs, the tool node, the output node); the `idea` input of the draft is removed. GNP-16's done plan (lines 359 and 386) names the same pin.
- **One test per criterion.** Criterion 1: T1 (`npm run lint:examples`, committed and automated, in CI through `npm run lint`). Criterion 2: T2 (one recorded run that checks the whole criterion, paths included). The draft's split of criterion 2 into T2a and T2b, and the control N1, are removed.
- **R3 deleted before the root gates.** The draft deleted the throwaway test in step 10, after `npm test` in step 9 would have run it without its environment variable. It is now deleted in the same step that runs it. R3 also sets `SCRIBA_PACKS_DIR` to the repo's `packages/packs`, without which the test app has no `dialogue` tool.
- **e2e expectation made independent of the merge order.** On main the full e2e suite fails until SHL-23 and PLT-23 land (`plans/PLT-23.md` step 1b). The draft expected exit 0. Now the e2e result after the change must equal the baseline on main (step 2).
- **Open points 2 to 8 decided** (section 6). Open point 5 goes to the orchestrator (a module file change).
- **Section 7 "Review parts"** added.

The unit file was read in full (lines 1 to 27). It has no change note: no "Moved to", "Removed by revision", "Loosened by" or "Reworded by" line. `plans/DECISIONS.md` has one line that names GNP-18 (line 6602, in the GNP-14 merge entry: the GNP-14 manual run waits for GNP-18). No DECISIONS entry decides a GNP-18 matter. The GNP-19 entries (line 6774 and the GNP-16 review) only say that GNP-19 carries the real-model eval run.

## 1. Decisions this plan follows

Unit lines are those of `units/GNP-18-fiction-sample.md`. Decisions G1 to G14 are the planner's choices, each with its source; G9, G10 and G12 were changed or confirmed by the reviser.

- **G1 Sample id and folder.** The sample id is `fiction`, the folder is `examples/fiction/`, the title is `Fiction`. The entry is appended after `nonfiction`, so nonfiction stays first. Sources: unit line 3 (`examples/fiction`) and line 15; PLT-20 D6 and D7; PST-11 line 17 (`fiction` at M6); the four fiction eval cases name `sample: fiction` (`scripts/eval-agent/cases/character-builder.json`, `dialogue.json`, `plot-manager.json`, `world-builder.json`).
- **G2 project.yaml.** `schemaVersion: 1`, `title: The Lamp Keepers`, `genrePack: fiction`, `styleProfile: book-style`. No `order` key and no `export` key. Sources: unit line 16; `packages/contracts/src/project-store/project.ts` (`projectYamlSchema`); PST-05 plan check (c); PLT-20 D8 and D9.
- **G3 Entities.** Five files in `entities/`. The id is the file stem; the front matter has no `id` key. Files: `veteran-keeper.md` (character), `relief-keeper.md` (character), `lighthouse-island.md` (place), `supply-boat-rule.md` (world-rule), `book-style.md` (style-profile). Sources: unit line 17; module lines 78 to 80 (type table, folder `entities/`); `ENTITY_ID_PATTERN` (`packages/contracts/src/project-store/constants.ts` line 4); the pack layer's stem rule (`scripts/examples-check/pack.mjs`, `targetIndex`); PLT-20 D10.
- **G4 Front matter.** `type: <kind>` and exactly the required keys of each type. Character: `name`, `want`, `need`, `flaw`, `voice`, `relationships` (each item has `character`, an id of a character, and `note`). Place: `name`, `rules` (ids of world-rules). World-rule: `statement`, `appliesTo` (ids of places). Style-profile: `tone`, `targetLength` (an integer), `bannedPhrases` (a list). Sources (checked by the reviser): `packages/packs/fiction/entity-types/character.yaml` line 45, `place.yaml` line 20, `world-rule.yaml` line 21; `packages/packs/core/entity-types/style-profile.yaml` line 21; `examples/nonfiction/entities/book-style.md` (the `type:` key).
- **G5 Names and voices.** Characters: "Tomas Vell" (the veteran, terse, short sentences, few words of address) and "Ada Quill" (the relief keeper, talkative, long sentences, names people). Place: "Gannet Skerry". Each character's relationship note is written in both directions. The `voice` fields carry those notes, so the two voices differ as dialogue step 2 needs (`packages/packs/fiction/tools/dialogue.yaml`). Sources: unit lines 15 and 17; module line 78 (`voice` notes).
- **G6 Drafts.** `drafts/arrival.md`: two scenes, about 300 words in all, the first from Ada Quill's point of view. `drafts/the-storm.md`: one scene, about 250 words, in which the lamp fails. `drafts/ledger.md`: a short file-backed beat, about 80 words. Drafts have no front matter and no `[@id]` citations. Sources: unit line 18; unit line 22 (original text); module line 93 (sample sourcing). PLT-20 D10 reads front matter only in `entities/` and `sources/`.
- **G7 Story graph.** `graphs/story.json`, view `story`, nodes and edges as in section 2.2. Sources: unit line 19; `packages/contracts/src/graph-runner/graph.ts` (a story node needs `label` and `position`; `path` is optional and its absence makes a node label-only; a story edge's `relation` is free text; `storyGraphShapeSchema` needs `schemaVersion`, `view`, `name`, `nodes`, `edges`); `constants.ts` (`RELATION_VOCABULARY`: `order`, `causality`, `containment`).
- **G8 Order chain.** Edges e1 (`arrival-1` to `arrival-2`), e2 (`arrival-2` to `storm`) and e3 (`storm` to `ledger`), all `order`. The unit's "arrival scenes → storm → ledger beat" is read as this chain (open point 3, decided). Compile & export drops an order edge whose two ends name the same path (`apps/api/src/modules/compile-export/manuscript.service.ts`, `pairsOf`, line 58: `from === to`). So e1 has no effect on the manuscript. The projected pairs are (arrival, the-storm) and (the-storm, ledger). Kahn's sort in `effective-order.ts` (`topological`) then gives arrival, the-storm, ledger, the order of unit line 21. The alphabetical default (arrival, ledger, the-storm) is what the graph overrides. The manuscript reads every story-view graph in `graphs/` (`manuscript.service.ts`, `storyGraphs`, line 227 and the `view === 'story'` test at line 258), so the recipe file does not interfere.
- **G9 Recipe (changed by the reviser).** `graphs/dialogue-scene.json`, view `recipe`, nodes and wires as in section 2.3: the five nodes of unit line 20 and no other. The text input `scene` (the scene file is a run-time value, never stored in the graph) feeds `dialogue.sceneText`. The entity input `keepers` (`entityKind: character`) feeds `dialogue.characterIds`. The style input `style` feeds `dialogue.styleProfile`. The tool node `dialogue` has `params: { "coreIdea": "<text>" }`, a pinned text value on the required port `coreIdea`; the text is `Two keepers who barely speak must keep the lamp lit through a storm.` (the implementer may change the wording, not the key). The output node `draft` is fed by `dialogue.output`. Sources: unit line 20 (it lists nodes and wires and says nothing on the tool node's params); `dialogue.yaml` (`required: [coreIdea, characterIds]`; `coreIdea` is a port of type `text`); `graph.ts` lines 84 and 85 ("the params of a tool node: the non-port settings and the pinned port values", `z.record(z.string(), z.unknown())`); GRR-03 line 20 (a required port with neither a wire nor a pinned value blocks a run; the pin feeds it); the text-pin facts in section 1a; `plans/GNP-16.md` lines 359 and 386 (GNP-16, done: "GNP-18's plan can pin `coreIdea` on the `dialogue` node without a unit change"). Precedent for pinned values in a sample: `examples/nonfiction/graphs/chapter-opening.json` (`cold-open.params.person`, `myth-buster.params.claimIds`).
- **G10 Output node (confirmed by the reviser).** `draft` has `params: { "label": "Scene draft" }` and no `path`. The run chooses the target: `targets[nodeId]`, else `params.path`, else a generated `drafts/dialogue-scene-<yyyymmdd-hhmm>.md` (GRR-06 line 23; `runs.service.ts` line 424). Without a target the run proposes a new file, so the Dialogue pending change of GNP-19 demo step 5 never replaces a scene draft. The unit names no path (line 20). Open point 4, decided.
- **G11 Excluded and reserved paths.** The sample has no `.gitignore`, no `.scriba/`, `logs/`, `snapshots/`, `drafts/.versions/`, no `sources/` and no symbolic link. Sources: unit line 22; PLT-20 D11 and D12; PST-05 plan check (d).
- **G12 Tests (changed by the reviser).** No test file is committed. Unit tests never read `examples/` (`units/README.md` line 141; module line 88, a settled module decision), the module adds no e2e step (module line 89), and the examples check's test-file rule refuses a test that names `examples/` (PLT-20 D13, patterns R1 and R2; `scripts/examples-check/m1.mjs` lines 201 to 227). One test per criterion: criterion 1 is T1, the examples check run on the repository, which is committed and runs in CI (`npm run lint`, `package.json` line 26; `.github/workflows/ci.yml` line 27). Criterion 2 is T2, one recorded run on the real files. Precedent: PST-11 D11 (`plans/PST-11.md` line 41), whose criteria were tested by recorded commands with no committed test.
- **G13 Prettier.** `examples/` is not in `.prettierignore`, so `prettier --check .` (the root `lint` script) reads each sample Markdown, YAML and JSON file. The new files must be Prettier-clean. Sources: `.prettierignore`; root `package.json` line 26; PLT-20 D17.
- **G14 Original text.** All prose and names are written for Scriba. There are no quotations and no real people. Sources: unit line 22; module line 93.

### 1a. Facts checked (by reading; neither the planner nor the reviser ran a command that builds or tests)

- **Blockers are done.** GNP-03, GNP-13, GNP-16, GRR-01 and PST-05 have `status: done` in their plans (GNP-16 checked by the reviser: `plans/GNP-16.md` line 3). GNP-18 can be built now.
- **Text pin (reviser).** (1) Validation: a port is pinned when its key is present in the tool node's `params`, whatever the value (`apps/api/src/modules/graph-runner/graph-validation.ts` line 350, `Object.hasOwn(node.params ?? {}, port.key)`); a pinned required port gives no `required-port-unfed` (line 356). `pinnedEntityIds` (line 213) reads only entity and style ports, so a text pin gives no `pinned-entity-missing`. (2) Schema: tool-node `params` is `z.record(z.string(), z.unknown())` (`graph.ts` line 85). (3) Examples check: the pack layer validates tool-node params in params mode (`scripts/examples-check/pack.mjs` line 51), and params mode drops port keys before Ajv (`apps/api/src/modules/tool-registry/validate.ts` lines 93 to 99), so the pin is not refused. (4) Runner: `toolStep` starts the arguments from the node's params (`apps/api/src/modules/graph-runner/runs.service.ts` line 560, `{ ...(node.params ?? {}) }`), adds the wired values, then validates in full mode, where `coreIdea` must be a string. (5) Canvas: a pinned value shows as a removable chip on its port (`apps/web/src/app/features/graph-runner/tool-nodes.ts` lines 141 to 148 and 220; `canvas-page.ts` lines 634 to 648). GRR-01 line 20 describes pins as "entity references dropped onto an unwired port": that is how the canvas makes them, not a restriction of the format, which the code above does not impose.
- **Run-time inputs (reviser).** A text input accepts a text or a file value (`runs.service.ts` lines 128 to 139, `fits`); an entity input passes its refs as a list to a list port (`valueOf`, `list ? value.refs : value.refs[0]`); `characterIds` has `minItems: 2` (`dialogue.yaml`).
- **Downstream units.** `grep -l GNP-18 units/*.md` finds GNP-19 as the only unit whose `blocked_by` names GNP-18 (line 7). The other hits are `unblocks` (GNP-03, GNP-13, GNP-16, GRR-01, PST-05) and `parallel_with` (GNP-14, GNP-15, GNP-17) lines; each is the exact inverse or symmetric. GNP-19 line 22 is "The fiction sample validates and its structural checks pass (GNP-18)". Its demo steps 2, 4 and 5 use the shared file, both beats, the order edges, the storm scene with both keepers, and the Dialogue pending change. GNP-19 has no plan file and no branch.
- **Units that consume the sample's output.** GNP-14 (manual run waits, DECISIONS line 6602), GNP-15, GNP-16 and GNP-17 (eval cases with `sample: fiction`), PST-05 (its check list), PST-11 line 17.
- **Draft and planned plans (reviser).** In `plans/`, `CEX-14` and `GNP-15` and `SHL-23` are `status: draft`; `GRR-15` and `PLT-23` are `planned`. None changes a path of section 2. GNP-15 lists `examples/**` under "Not changed" ("GNP-18 owns them", `plans/GNP-15.md` line 117) and adds `packages/packs/fiction/tools/scene_builder.yaml`, which this plan does not read. PLT-23 changes `e2e/specs/` files and SHL-23 `apps/web/src/app/shell/app-nav.ts`; they fix the full e2e suite (see the next fact). GRR-15 changes the canvas only and names the nonfiction recipe as a size reference. So there is no shared file, and the plan is correct in either merge order, given the e2e rule of step 9.
- **e2e on main (reviser).** The full e2e suite fails on main today: journey "project from sample" at `e2e/specs/journey.e2e.ts:204`, and, before SHL-23 lands, three phone specs (`plans/PLT-23.md` section 2.1 and step 1b). Journey selects the `nonfiction` option by value (line 136); `projects-phone.e2e.ts` finds the region `Nonfiction` with `exact: true` (line 66); `verdicts-sample.e2e.ts` starts from `sampleId: 'nonfiction'` (line 109). A second sample changes none of these lookups.
- **The examples check.** `package.json` line 27: `lint:examples` builds the contracts and the API, then runs `scripts/examples-check/index.mjs`, whose layers are `m1.mjs` (`samples.yaml`, folders, `project.yaml`, entity front matter, excluded paths, links, the test-file rule), `graph.mjs` (JSON parse, `graphFileSchema`, story-path existence: `checkStoryPaths`, lines 68 to 82, skips label-only nodes) and `pack.mjs` (recipe tool names and params in params mode, entity front matter against the type schema, top-level references, citations in drafts).
- **What the examples check does not read.** Recipe wires and required ports. Shared files and beat counts. Nested references inside `relationships` (`pack.mjs` `checkReferences` reads top-level fields only).
- **Contracts.** `graph.ts`, `constants.ts`, `runs.ts`, `project.ts`. Port types are `text`, `entity`, `style` (`packages/contracts/src/tool-registry/constants.ts` line 26).
- **Test app and packs (reviser).** `createTestApp` sets `SCRIBA_PACKS_DIR` to a folder of its temp library (`apps/api/test/create-test-app.ts` line 81), so a test that needs the real `dialogue` passes `env.SCRIBA_PACKS_DIR` set to the repo's `packages/packs`, as `apps/api/test/graph-runner-sample-recipe.test.ts` line 34 does. The validate request helper is `validate` in `apps/api/test/graph-runner-validation.test.ts` line 203 (`postJson` to `/api/graph-runner/graphs/validate`).
- **Image.** `Dockerfile` line 60 copies `/src/examples` into the image.
- **Nonfiction conventions.** `examples/nonfiction/project.yaml` (a leading comment, `schemaVersion: 1`); `chapter-opening.json`; `entities/book-style.md`.

### 1b. Facts assumed (not checked, or checked only in part)

- **A.** `npm run lint:examples` passes on main today. Step 2 confirms it.
- **B.** The first-project step and the project picker list the samples in file order. Appending keeps nonfiction first either way, and the e2e specs select nonfiction by value or exact name.
- **D.** The validate route reports zero issues for the recipe of section 2.3. Read from `graph-validation.ts`; R3 (step 8) runs it.
- **E.** GNP-19's fiction-order check passes once GNP-18 lands. Read from `pairsOf` and `topological`; not run.
- **F.** `yaml` (root devDependency) can be required from the repo root for the one-off checks.

### 1c. Simplest-option choices

- Names: the file stems are the entity ids; the graphs are `story.json` and `dialogue-scene.json`; the node ids are the short names in section 2.
- Layout: only `entities/`, `drafts/` and `graphs/` under the sample folder, as the unit says.
- Test structure: no committed test (G12). T1 is the committed examples check; T2 is one recorded run.

## 2. Files to change

Only the paths below change. No package, script, test, pack or contract file changes. Twelve paths: one edit and eleven new.

### 2.1 Files

| Path | Change | Content |
|---|---|---|
| `examples/samples.yaml` | edit | Appends one list item after the nonfiction entry: `id: fiction`, `title: Fiction`, `description: A short original story about two lighthouse keepers, with characters, a place, a world rule, drafts and a story graph.` |
| `examples/fiction/project.yaml` | new | G2: a leading comment as in nonfiction, `schemaVersion: 1`, `title: The Lamp Keepers`, `genrePack: fiction`, `styleProfile: book-style` |
| `examples/fiction/entities/veteran-keeper.md` | new | character (G4, G5) |
| `examples/fiction/entities/relief-keeper.md` | new | character (G4, G5) |
| `examples/fiction/entities/lighthouse-island.md` | new | place: `name: Gannet Skerry`, `rules: [supply-boat-rule]` |
| `examples/fiction/entities/supply-boat-rule.md` | new | world-rule: `statement: The supply boat comes only on a spring tide.`, `appliesTo: [lighthouse-island]` |
| `examples/fiction/entities/book-style.md` | new | style-profile: `tone` (plain, spare, concrete), `targetLength: 800`, `bannedPhrases: [little did they know, suddenly]` |
| `examples/fiction/drafts/arrival.md` | new | two scenes (G6) |
| `examples/fiction/drafts/the-storm.md` | new | one scene (G6) |
| `examples/fiction/drafts/ledger.md` | new | a short file-backed beat (G6) |
| `examples/fiction/graphs/story.json` | new | the story graph of section 2.2 |
| `examples/fiction/graphs/dialogue-scene.json` | new | the recipe of section 2.3 |

Each character's front matter has `type: character`, the six required keys (G4), and `relationships` with one item naming the other character and a note. The veteran's item is `character: relief-keeper`; the relief keeper's is `character: veteran-keeper`. The body of each entity file holds a short backstory or description (prose). Front matter values are the implementer's choice within G4 and G5.

### 2.2 Story graph (`graphs/story.json`)

Header: `schemaVersion: 1`, `view: "story"`, `name: "Story"`. Node positions are `{x, y}` numbers laid out left to right; no check reads them.

| id | kind | label | path |
|---|---|---|---|
| `arrival-1` | scene | Arrival: the relief keeper climbs up | `drafts/arrival.md` |
| `arrival-2` | scene | Arrival: the handover | `drafts/arrival.md` |
| `storm` | scene | The storm | `drafts/the-storm.md` |
| `storm-lamp` | beat (label only) | The lamp goes out | none |
| `ledger` | beat (file-backed) | The supply ledger | `drafts/ledger.md` |
| `ada` | entity | Ada Quill | `entities/relief-keeper.md` |
| `tomas` | entity | Tomas Vell | `entities/veteran-keeper.md` |
| `island` | entity | Gannet Skerry | `entities/lighthouse-island.md` |

| id | from | to | relation |
|---|---|---|---|
| `e1` | `arrival-1` | `arrival-2` | `order` |
| `e2` | `arrival-2` | `storm` | `order` |
| `e3` | `storm` | `ledger` | `order` |
| `e4` | `storm` | `storm-lamp` | `containment` |
| `e5` | `storm-lamp` | `ledger` | `causality` |
| `e6` | `arrival-1` | `ada` | `pov` |

`pov` is the one free-text relation: a scene to its point-of-view character (unit line 19). The label-only beat has no `path` key at all (not an empty string), so the beat is not a file.

### 2.3 Recipe (`graphs/dialogue-scene.json`)

Header: `schemaVersion: 1`, `view: "recipe"`, `name: "Dialogue scene"`.

| id | kind | params | value at run start (not in the file) |
|---|---|---|---|
| `scene` | input | `type: text`, `label: Scene` | a file reference, for example `drafts/the-storm.md` |
| `keepers` | input | `type: entity`, `label: Both keepers`, `entityKind: character` | two character refs |
| `style` | input | `type: style`, `label: House style` | `book-style` |
| `dialogue` | tool (`tool: dialogue`) | `coreIdea: Two keepers who barely speak must keep the lamp lit through a storm.` (a pinned text value, G9) | none |
| `draft` | output | `label: Scene draft`, no `path` | the target of the run (G10) |

| id | from | to |
|---|---|---|
| `w1` | `scene.out` | `dialogue.sceneText` |
| `w2` | `keepers.out` | `dialogue.characterIds` |
| `w3` | `style.out` | `dialogue.styleProfile` |
| `w4` | `dialogue.output` | `draft.in` |

No wire goes to `dialogue.coreIdea`: a port is fed by a wire or a pinned value, never both (GRR-01 line 20; `port-wired-and-pinned`).

### 2.4 Prettier

Run `npx prettier --write examples/fiction examples/samples.yaml` after the files are written (method step 4).

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-18`, created from `main`. Record `node -v` and `npm -v` beside each result. Do not push. Use `Write` for the new files, not `echo` redirection. Scratch copies go under `/tmp`, outside the repository.

0. Runtime. `node -v` prints `v26.x` (`package.json` `engines`: `>=26 <27`). `npm -v` prints `11.20.0` (`packageManager`).
1. Branch. `git switch -c unit/GNP-18` on a clean tree. Expected: `Switched to a new branch 'unit/GNP-18'`.
2. Baseline, before any file is written. (a) `npm run lint:examples`. Expected: exit 0 and a stdout line beginning `examples check passed: 1 sample(s)`. If it fails, stop and report; do not write any sample file (assumption A). (b) `npm run e2e`. Record the exit code, the passed and failed counts, and the name and `file:line` of each failing test. A failure here is not this unit's; it is the baseline that step 9 compares with (section 1a, "e2e on main").
3. Write. The samples.yaml entry (G1) and the eleven new files of section 2, exactly as specified. Keep the final newline in `samples.yaml`.
4. Prettier. `npx prettier --write examples/fiction examples/samples.yaml`, then `npx prettier --check examples/fiction examples/samples.yaml`. Expected: exit 0 with `All matched files use Prettier code style!`.
5. Criterion 1 test (T1). `npm run lint:examples`. Expected: exit 0 and `examples check passed: 2 sample(s), ...`. No issue line names `examples/fiction`.
6. Criterion 2 test (T2, recorded run). One `node -e` script from the repository root that reads `examples/fiction/graphs/story.json` and writes nothing. It asserts: `view` is `story`; every node that has a `path` names a regular file under `examples/fiction` (`fs.lstatSync(...).isFile()`, so a link fails), and there are 7 such nodes; scene nodes are 3, of which exactly 2 have `path` `drafts/arrival.md`; beat nodes with no `path` key are exactly 1; beat nodes with a `path` are exactly 1, with `path` `drafts/ledger.md`. It also asserts the shape of section 2.2 (order edges 3, containment 1, causality 1, and the one other relation is `pov`, from a scene to an entity node). Expected output: `T2 ok: paths 7 exist, scenes 3, on drafts/arrival.md 2, label-only beats 1, file-backed beats 1, order 3, containment 1, causality 1, pov 1`, exit 0. Any assertion that fails prints its name and exits 1.
7. Reference check R2 (recorded, not a criterion test). One `node -e` script that parses the front matter of each file in `examples/fiction/entities/` with `yaml` (assumption F) and asserts that each character's `relationships[].character` is a character id, each place's `rules` items are world-rule ids, and each world-rule's `appliesTo` items are place ids. Expected: `R2 ok: characters 2, places 1, world-rules 1, references 4`. (Two relationship items, one `rules` item, one `appliesTo` item.)
8. Recipe check R3 (recorded, not a criterion test; the only check of the required ports). Create a throwaway file `apps/api/test/tmp-gnp18-recipe.test.ts`. It reads the recipe path from the environment variable `GNP18_RECIPE` (resolved against the repository root), so the file never names `examples/`. It boots `createTestApp` with `env: { SCRIBA_PACKS_DIR: <repo>/packages/packs }` (as `graph-runner-sample-recipe.test.ts` line 34 builds the path), takes a session cookie as `graph-runner-validation.test.ts` does, posts the parsed recipe to `/api/graph-runner/graphs/validate` (that file's `validate`, line 203), and expects an empty issue list. Run it with `GNP18_RECIPE=examples/fiction/graphs/dialogue-scene.json npx vitest run --root apps/api test/tmp-gnp18-recipe.test.ts` (the API's Vitest config, `apps/api/vitest.config.mts`). Expected: 1 passed, zero issues. Record the output. Then delete the file in this step, before step 9: `rm apps/api/test/tmp-gnp18-recipe.test.ts`. A non-empty issue list (for example `required-port-unfed` on `dialogue.coreIdea`) means the recipe is wrong: stop and report PLAN DOES NOT WORK with the issues.
9. Root gates. `npm run build`, `npm test`, `npm run lint`, and `npm run e2e`. Expected: build, test and lint exit 0. The e2e result equals the baseline of step 2(b): the same failing tests (none if the baseline had none), the same total count, and no new failure. The e2e harness reads the repository's `examples/` (`e2e/harness/global-setup.ts` line 81), so it sees the new sample. Record the counts of each suite.
10. Tree check. `git status --short` lists exactly the twelve paths of section 2 (`examples/samples.yaml` modified; eleven new under `examples/fiction/`). `find examples/fiction -type l` prints nothing. `find examples/fiction \( -name .scriba -o -name logs -o -name snapshots -o -name .versions -o -name .gitignore \)` prints nothing. `apps/api/test/tmp-gnp18-recipe.test.ts` does not exist.
11. Commit. On `unit/GNP-18`, by path: `git commit -m "feat(GNP-18): fiction sample project and samples.yaml entry" -- examples/samples.yaml examples/fiction` (after `git add examples/samples.yaml examples/fiction`). Do not squash later.
12. Record. The Node and npm versions, each command's exit code and the output lines named above, and the T1, T2, R2 and R3 results. A criterion is marked passed only when its pass condition in section 4 holds.

## 4. Acceptance criteria and tests

Unit lines 25 and 26 are the criteria. The unit heading has no seam parenthetical, so the module's default seam applies (the examples check, module line 88). Each criterion has exactly one test.

| Criterion | Test and seam | Committed and automated? | Command | Pass condition |
|---|---|---|---|---|
| 1. "The fiction sample validates in Platform's examples check (graph schema, `project.yaml`, entity types, recipe tool references and params)." (line 25) | T1: the examples check on the repository, all three layers (M1 for `project.yaml` and the sample list, graph for the graph schema, pack for entity types and recipe tool references and params). | Yes: `scripts/examples-check/` runs in every `npm run lint` and in CI (`ci.yml` line 27). No new test file; the check's own behaviour is covered by `scripts/examples-check*.test.mjs`. | `npm run lint:examples` (step 5) | Exit 0; stdout `examples check passed: 2 sample(s), ...`; no issue line names `examples/fiction` |
| 2. "Every story-node `path` exists; two scene nodes share `drafts/arrival.md`; there is one label-only beat and one file-backed beat." (line 26) | T2: one recorded run on `examples/fiction/graphs/story.json` (step 6). | No. A committed test cannot read `examples/` (G12: a settled module decision, module line 88, and PLT-20 D13). The criterion is a property of committed files, so it is tested as the unit states it by a run on those files, recorded at the merge. Its first clause is also enforced on every later commit by T1's graph layer (`checkStoryPaths`). | the `node -e` script of step 6 | Exit 0 and the `T2 ok` line of step 6 |

R2 (step 7) and R3 (step 8) are not criterion tests. They are recorded for the implementer's confidence and for GNP-19 (R3 is the only check that catches an unfed required port).

## 5. Downstream agreement

- **GNP-19 (fiction gate; `blocked_by` line 7).** Its criterion "The fiction sample validates and its structural checks pass" is T1 and T2. Its demo step 2 (the shared file, both beats, the order edges) matches G7. Its demo step 4 (run the recipe with the storm scene and both keepers) needs three run-time values: a file value for `scene` (`drafts/the-storm.md`), the two character refs for `keepers`, and the ref `book-style` for `style`; `coreIdea` is pinned (G9). The fiction-order check (manuscript order arrival.md, the-storm.md, ledger.md) follows from G8 (assumption E). Its demo step 5 reads the Dialogue pending change, a new file at the run's target (G10). GNP-19 needs no change.
- **Eval cases (GNP-14, GNP-15, GNP-16, GNP-17).** Their `sample: fiction` matches G1. Their intents name no entity id. Their real-model runs wait for this merge.
- **GNP-14 criterion 3 (manual run).** Waits for this merge. No plan change.
- **PST-05 (done; start-from-sample), its check list.** (a) The list item has `id`, `title` and `description` (G1). (b) Nested folders are copied. (c) `project.yaml` has no `order`. (d) No excluded path (G11). (e) The folder name equals the id, the folder is real and has no link. All hold.
- **PST-09, SAU-14 and SAU-16 (sample pickers).** They read `GET /api/project-store/samples` and show the new entry with no code change.
- **PLT-20, PLT-21 and PLT-22 (examples check layers, done).** No rule changes.
- **GRR-01 and GRR-03 (done).** Both graph files parse with `graphFileSchema` (T1). The text pin is a tool-node param as `graph.ts` line 84 defines it (section 1a).
- **GNP-03, GNP-13 and GNP-16 (done).** The entity types and the `dialogue` ports are used as their spec files define. The coreIdea point of `plans/GNP-16.md` (lines 359 and 386) is closed by the pin it names (G9).
- **CEX-09 (done; assembly order).** The order chain is read by `pairsOf` (G8). No Compile & export change.
- **Parallel plans.** CEX-14, GNP-15, GRR-15, PLT-23 and SHL-23 share no file with this plan (section 1a). Merge order: any. If PLT-23 and SHL-23 land first, the step 2(b) baseline is green and step 9 expects green; otherwise both have the same known failures.
- **Module.** `modules/genre-packs.md` lines 23 and 33 draw GNP-18 under GNP-13 with GRR-01 and PST-05 only. The unit's `blocked_by` is the source of truth (`units/README.md` line 64), so this plan follows the unit (open point 5, for the orchestrator).

## 6. Open points

Each point gives the decision and its reason. None changes a unit, a criterion or a module file.

1. **Recipe `coreIdea` (decided by the reviser: pin, no unit change).** A text value is pinned on `dialogue.coreIdea` in the tool node's params (G9). The validator, the examples check and the runner accept it (section 1a, "Text pin"); GNP-16's done plan names this pin. The recipe keeps exactly the nodes of unit line 20, so no unit change is needed. R3 (step 8) checks it.
2. **Criterion 2 has no committed test (decided).** A committed test cannot read `examples/` (module line 88, settled; PLT-20 D13), and a shape rule in the examples check would change a done unit's code (PLT-21). T2 is a recorded run, as PST-11 D11 did. The path clause is also kept by T1 in CI.
3. **Order chain (decided: e1, e2, e3).** The unit's "arrival scenes → storm → ledger beat" is read as a chain. The manuscript order is the same with or without e1 (G8), and GNP-19 asks only for "the `order` edges".
4. **Output node with no path (decided: no path).** The unit names none; GRR-06 line 23 then generates a new file in `drafts/`, so a run never overwrites a scene (G10).
5. **Module graph (for the orchestrator).** `modules/genre-packs.md` lines 23 and 33 leave GNP-03 and GNP-16 out of GNP-18's blockers; the unit lists them. No plan impact. A reviser may not change a module file.
6. **Nested references (decided: R2 only).** The pack layer reads top-level references only. `relationships[].character` is covered by R2 at the merge. No rule change in this unit.
7. **R3 uses a throwaway test (decided: keep, deleted in step 8).** It is the only check of the required ports before GNP-19. It never names `examples/` and does not exist at the root gates or at the commit.
8. **Names and text (decided).** The ids, file names and graph names are as in section 1c and section 2. The implementer may change the prose and the pinned `coreIdea` wording, not the ids, keys or file names.

## 7. Review parts

The plan is small: one part.

- **Part 1 — the fiction sample and its samples.yaml entry.** Steps 0 to 12 (runtime, branch, baseline, writing the twelve paths, Prettier, the checks R2 and R3, the root gates, the tree check, the commit and the record). Tests: T1 (criterion 1, step 5) and T2 (criterion 2, step 6). Files: the twelve paths of section 2.1. The reviewer checks the files against sections 2.1 to 2.3 and G1 to G14, the recorded T1, T2, R2 and R3 outputs, and that the step 9 e2e result equals the step 2(b) baseline.
