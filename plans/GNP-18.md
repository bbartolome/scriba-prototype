---
id: GNP-18
status: draft
---
# GNP-18 plan — fiction sample project (examples/fiction) and its samples.yaml entry

Batch: [GNP-18] (Genre packs, phase:fiction, M6), a batch of one. Draft by the planner at main `28a07e2` (HEAD when read; the working tree was clean). The planner changed no file except this one, ran no build, test, lint or npm command, and committed nothing. Revision 0 (draft).

The unit file was read in full (lines 1 to 27). It has no change note: it has no "Moved to", "Removed by revision", "Loosened by" or "Reworded by" line, and `git log -- units/GNP-18-fiction-sample.md` shows one commit, 2fed3f4 (the consolidation). `plans/DECISIONS.md` has one line that names GNP-18 (`grep -n GNP-18`, line 6602), in the GNP-14 entry, which says the GNP-14 manual run waits for GNP-18. No DECISIONS entry decides a GNP-18 matter.

## 1. Decisions this plan follows

Unit lines are those of `units/GNP-18-fiction-sample.md`. Decisions G1 to G14 are the planner's choices, each with its source.

- **G1 Sample id and folder.** The sample id is `fiction`, the folder is `examples/fiction/`, the title is `Fiction`. The entry is appended after `nonfiction`, so nonfiction stays first. Sources: unit line 3 (`examples/fiction`) and line 15; PLT-20 D6 and D7; PST-11 line 17 (`fiction` at M6); the four fiction eval cases name `sample: fiction` (`scripts/eval-agent/cases/character-builder.json`, `dialogue.json`, `plot-manager.json`, `world-builder.json`).
- **G2 project.yaml.** `schemaVersion: 1`, `title: The Lamp Keepers`, `genrePack: fiction`, `styleProfile: book-style`. No `order` key and no `export` key. Sources: unit line 16; `packages/contracts/src/project-store/project.ts` (`projectYamlSchema`); PST-05 plan check (c); PLT-20 D8 and D9.
- **G3 Entities.** Five files in `entities/`. The id is the file stem; the front matter has no `id` key. Files: `veteran-keeper.md` (character), `relief-keeper.md` (character), `lighthouse-island.md` (place), `supply-boat-rule.md` (world-rule), `book-style.md` (style-profile). Sources: unit line 17; module lines 78 to 80 (type table, folder `entities/`); `ENTITY_ID_PATTERN` (`packages/contracts/src/project-store/constants.ts` line 4: lower-case letters, digits, hyphens); the pack layer's stem rule (`scripts/examples-check/pack.mjs`, `targetIndex`); PLT-20 D10.
- **G4 Front matter.** Exactly the required keys of each type. Character: `name`, `want`, `need`, `flaw`, `voice`, `relationships` (each item has `character`, an id of a character, and `note`). Place: `name`, `rules` (ids of world-rules). World-rule: `statement`, `appliesTo` (ids of places). Style-profile: `tone`, `targetLength` (an integer), `bannedPhrases` (a list). Sources: `packages/packs/fiction/entity-types/character.yaml`, `place.yaml`, `world-rule.yaml`; `packages/packs/core/entity-types/style-profile.yaml`.
- **G5 Names and voices.** Characters: "Tomas Vell" (the veteran, terse, short sentences, few words of address) and "Ada Quill" (the relief keeper, talkative, long sentences, names people). Place: "Gannet Skerry". Each character's relationship note is written in both directions. The `voice` fields carry those notes, so the two voices differ as dialogue step 2 needs (`packages/packs/fiction/tools/dialogue.yaml`). Sources: unit lines 15 and 17; module line 78 (`voice` notes).
- **G6 Drafts.** `drafts/arrival.md`: two scenes, about 300 words in all, the first from Ada Quill's point of view. `drafts/the-storm.md`: one scene, about 250 words, in which the lamp fails. `drafts/ledger.md`: a short file-backed beat, about 80 words. Drafts have no front matter and no `[@id]` citations. Sources: unit line 18; unit line 22 (original text); module line 93 (sample sourcing). PLT-20 D10 reads front matter only in `entities/` and `sources/`.
- **G7 Story graph.** `graphs/story.json`, view `story`, nodes and edges as in section 2.2. Sources: unit line 19; `packages/contracts/src/graph-runner/graph.ts` (a story node needs `label` and `position`; `path` is optional and its absence makes a node label-only; a story edge's `relation` is free text); `constants.ts` (`RELATION_VOCABULARY`: `order`, `causality`, `containment`).
- **G8 Order chain.** Edges e1 (`arrival-1` to `arrival-2`), e2 (`arrival-2` to `storm`) and e3 (`storm` to `ledger`), all `order`. The unit's "arrival scenes → storm → ledger beat" is read as this chain (open point 3). Compile & export drops an order edge whose two ends name the same path (`apps/api/src/modules/compile-export/manuscript.service.ts`, `pairsOf`: the `from === to` test after line 54). So e1 has no effect on the manuscript. The projected pairs are (arrival, the-storm) and (the-storm, ledger). Kahn's sort in `effective-order.ts` (`topological`) then gives arrival, the-storm, ledger, the order of unit line 21. The alphabetical default (arrival, ledger, the-storm) is what the graph overrides.
- **G9 Recipe.** `graphs/dialogue-scene.json`, view `recipe`, nodes and wires as in section 2.3. The text input `scene` (the scene file is a run-time value, never stored in the graph) feeds `dialogue.sceneText`. A second text input `idea` feeds `dialogue.coreIdea`. The entity input `keepers` (`entityKind: character`) feeds `dialogue.characterIds`. The style input `style` feeds `dialogue.styleProfile`. The tool node `dialogue` has no `params`. The output node `draft` is fed by `dialogue.output`. Sources: unit line 20; `dialogue.yaml` (`required: [coreIdea, characterIds]`); `runs.ts` (`inputValueSchema`: a text input takes a text or a file value at run start, an entity input takes `refs`, a style input takes `ref`); GRR-03 line 20 (a required port with neither a wire nor a pinned value blocks a run, code `required-port-unfed`); the nonfiction precedent `examples/nonfiction/graphs/chapter-opening.json` feeds `coreIdea` from a text input (wires w1 to w4). The `idea` node is the one deviation from unit line 20 (open point 1).
- **G10 Output node.** `draft` has no `params.path`. The run chooses the target (`targets` in `runs.ts`). Without a target, GRR-06 line 23 gives a generated file in `drafts/`. GNP-19 demo step 5 reads the Dialogue pending change, which this allows (open point 4).
- **G11 Excluded and reserved paths.** The sample has no `.gitignore`, no `.scriba/`, `logs/`, `snapshots/`, `drafts/.versions/`, no `sources/` and no symbolic link. Sources: unit line 22; PLT-20 D11 and D12; PST-05 plan check (d). Check (e) is informative: a copy holds a `.gitignore` only when the sample ships one, and the unit names none.
- **G12 Tests.** No test file is committed. Unit tests never read `examples/` (`units/README.md` line 141; module line 88). The examples check's test-file rule refuses a test that names `examples/` (PLT-20 D13, patterns R1 and R2). The criteria are checked by the examples check (automated) and by recorded runs. Precedent: PST-11 D11, whose criterion 2 was a recorded run with no committed test.
- **G13 Prettier.** `examples/` is not in `.prettierignore`, so `prettier --check .` (the root `lint` script) reads each sample Markdown, YAML and JSON file. The new files must be Prettier-clean. Sources: `.prettierignore`; root `package.json` (`lint`); PLT-20 plan line 138.
- **G14 Original text.** All prose and names are written for Scriba. There are no quotations and no real people. Sources: unit line 22; module line 93.

### 1a. Facts checked (by reading; the planner ran no command that builds or tests)

- **Blockers are done.** GNP-03, GNP-13, GNP-16, GRR-01 and PST-05 have `status: done` in their plans. `plans/QUEUE.md` line 12 agrees. GNP-18 can be built now.
- **Downstream units.** `grep -l GNP-18 units/*.md` finds GNP-19 as the only unit whose `blocked_by` names GNP-18 (line 7). GNP-19 line 22 is "The fiction sample validates and its structural checks pass (GNP-18)". Its demo steps 2, 4 and 5 use the shared file, both beats, the order edges, the storm scene with both keepers, and the Dialogue pending change. `unblocks: [GNP-19]` (unit line 9) is the exact inverse. `parallel_with` is symmetric: GNP-14, GNP-15 and GNP-17 each name GNP-18 (line 8), and GNP-16 does not, because GNP-18 is blocked by it. GNP-18 is paired with no unit it depends on.
- **Units that consume the sample's output.** GNP-14 (manual run waits, `plans/GNP-14.md` line 90 and the DECISIONS entry at line 6602), GNP-15, GNP-16 and GNP-17 (eval cases with `sample: fiction`), PST-05 (its check list, `plans/PST-05.md` lines 109 to 135), PLT-20 line 140, PLT-21 line 126, GRR-01 line 247, PST-11 line 165, GNP-13 line 196 and GNP-03 line 153.
- **Draft and planned plans.** `plans/CEX-14.md`, `GNP-15.md`, `GRR-15.md`, `PLT-23.md` and `SHL-23.md` are the plans with `status: draft` or `planned`. None lists `examples/` or `samples.yaml` as a changed file. GNP-15 changes `packages/packs/fiction/tools/scene_builder.yaml` and the catalogue only. So there is no shared file and the plan is correct in either merge order.
- **The examples check.** `package.json` script `lint:examples` runs `scripts/examples-check/index.mjs`, whose layers are `m1.mjs` (`samples.yaml`, sample folders, `project.yaml`, entity front matter, links, excluded paths, the test-file rule), `graph.mjs` (JSON parse, `graphFileSchema`, story-path existence, D6) and `pack.mjs` (recipe tool names and params in params mode, entity front matter against the type schema, top-level references, citations in drafts).
- **What the examples check does not read.** Recipe wires (no wire is read). Shared files and beat counts (no rule). Nested references inside `relationships` (`pack.mjs` `checkReferences` reads top-level fields only).
- **Contracts.** `graph.ts`, `constants.ts`, `runs.ts`, `project.ts`, `files.ts` and `entities.ts`. Port types are `text`, `entity`, `style` (`packages/contracts/src/tool-registry/constants.ts` line 26).
- **Fiction pack.** `dialogue.yaml` (inputs; `required: [coreIdea, characterIds]`; `characterIds` has `minItems: 2` and `x-scriba-entity-kinds: [character]`); `character.yaml`, `place.yaml`, `world-rule.yaml`; core `style-profile.yaml`.
- **Validation and routes.** GRR-03 lines 20 and 21 (error and warning rules); GRR-06 line 23 (target precedence); `packages/contracts/src/graph-runner/routes.ts` (`GRAPH_VALIDATE_ROUTE`); `apps/api/test/graph-runner-validation.test.ts` (boots `createTestApp` and posts to the validate route).
- **Image and tests.** `Dockerfile` line 60 copies `/src/examples` into the image. The API tests that touch samples use fixture folders (`apps/api/test/project-store-samples.kit.ts`), not the repo's `examples/`.
- **Nonfiction conventions.** `examples/nonfiction/project.yaml` (a leading comment, `schemaVersion: 1`); `chapter-opening.json`; `entities/book-style.md` (front matter with `type: style-profile`).

### 1b. Facts assumed (not checked, or checked only in part)

- **A.** `npm run lint:examples` passes on main today. The implementer's baseline run (method step 2) confirms it.
- **B.** The first-project step and the e2e journey take the first option of the sample list as the default. `e2e/specs/journey.e2e.ts` lines 113 to 140 were not read in full. Appending keeps nonfiction first either way.
- **C.** The runner accepts a text pin on a port. Not chosen (open point 1). GRR-01 line 20 describes pinned values as entity references, so a text pin is not confirmed.
- **D.** The validate route reports `required-port-unfed` for the unit's three-node recipe. Read from GRR-03 line 20; not run.
- **E.** GNP-19's fiction-order check passes once GNP-18 lands. Read from `pairsOf` and `topological`; not run.
- **F.** `yaml` (root devDependency, 2.9.1) can be required from the repo root for the one-off checks. Read from `package.json`; not run.

### 1c. Simplest-option choices

- Names: the file stems are the entity ids; the graphs are `story.json` and `dialogue-scene.json`; the node ids are the short names in section 2.
- Layout: only `entities/`, `drafts/` and `graphs/` under the sample folder, as the unit says.
- Test structure: no committed test (G12). The examples check is the automated test; the shape and reference checks are recorded one-off runs.

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

Each character's front matter has `type: character`, the six required keys (G4), and `relationships` with one item naming the other character and a note. The veteran's item is `character: relief-keeper`; the relief keeper's is `character: veteran-keeper`. The body of each entity file holds a short backstory or description (prose). Front matter values are the planner's choice within G4 and G5.

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

`pov` is the one free-text relation: a scene to its point-of-view character (unit line 19). Its label-only beat has no `path`, so the beat is not a file.

### 2.3 Recipe (`graphs/dialogue-scene.json`)

Header: `schemaVersion: 1`, `view: "recipe"`, `name: "Dialogue scene"`.

| id | kind | params | value at run start (not in the file) |
|---|---|---|---|
| `scene` | input | `type: text`, `label: Scene` | a file reference, for example `drafts/the-storm.md` |
| `idea` | input | `type: text`, `label: Core idea` | text (added; open point 1) |
| `keepers` | input | `type: entity`, `label: Both keepers`, `entityKind: character` | two character refs |
| `style` | input | `type: style`, `label: House style` | `book-style` |
| `dialogue` | tool (`tool: dialogue`) | no `params` | none |
| `draft` | output | `label: Scene draft`, no `path` | the target of the run (G10) |

| id | from | to |
|---|---|---|
| `w1` | `scene.out` | `dialogue.sceneText` |
| `w2` | `idea.out` | `dialogue.coreIdea` |
| `w3` | `keepers.out` | `dialogue.characterIds` |
| `w4` | `style.out` | `dialogue.styleProfile` |
| `w5` | `dialogue.output` | `draft.in` |

### 2.4 Prettier

Run `npx prettier --write examples/fiction examples/samples.yaml` after the files are written (method step 4). The JSON and Markdown in this sample are read by `prettier --check .`.

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/GNP-18`, created from `main`. Record `node -v` and `npm -v` beside each result. Do not push. Use `Write` for the new files, not `echo` redirection. Scratch copies go under `/tmp`, outside the repository.

0. Runtime. `node -v` prints `v26.x` (`package.json` `engines`: `>=26 <27`). `npm -v` prints `11.20.0` (`packageManager`).
1. Branch. `git switch -c unit/GNP-18` on a clean tree. Expected: `Switched to a new branch 'unit/GNP-18'`.
2. Baseline. `npm run lint:examples` on main. Expected: exit 0 and a stdout line beginning `examples check passed: 1 sample(s)`. Record the line. If it fails, stop and report; do not write any sample file (assumption A).
3. Write. The samples.yaml entry (G1) and the eleven new files of section 2, exactly as specified. Keep the final newline in `samples.yaml`.
4. Prettier. `npx prettier --write examples/fiction examples/samples.yaml`, then `npx prettier --check examples/fiction examples/samples.yaml`. Expected: exit 0 with `All matched files use Prettier code style!`.
5. Criterion 1 test (T1). `npm run lint:examples`. Expected: exit 0 and `examples check passed: 2 sample(s), ...`. No issue line names `examples/fiction`.
6. Criterion 2 path test (T2a) and its negative control (N1). T2a is part of step 5, in the graph layer. For N1: `mkdir -p /tmp/gnp18-neg && cp -R examples /tmp/gnp18-neg/`, delete `/tmp/gnp18-neg/examples/fiction/drafts/ledger.md`, then `node scripts/examples-check/index.mjs --root /tmp/gnp18-neg`. Expected: exit 1, and stderr has a line naming `examples/fiction/graphs/story.json` with `node "ledger": path "drafts/ledger.md" is not an existing file in this sample`. This shows the path rule is live.
7. Criterion 2 shape test (T2b, recorded run R1), and the reference check R2. Two `node -e` one-liners from the repository root, reading the files and writing nothing. R1 parses `examples/fiction/graphs/story.json` and asserts the counts in section 4. Expected output: `R1 ok: scenes 3, on drafts/arrival.md 2, label-only beats 1, file-backed beats 1, order edges 3, pov edges 1`. R2 parses the front matter of each file in `examples/fiction/entities/` with `yaml` (assumption F) and asserts that each character's `relationships[].character` is a character id, each place's `rules` items are world-rule ids, and each world-rule's `appliesTo` items are place ids. Expected: `R2 ok: characters 2, places 1, world-rules 1, references 5`.
8. Wiring check (R3, recorded, not committed). Create a throwaway file `apps/api/test/tmp-gnp18-recipe.test.ts`. It reads the recipe path from the environment variable `GNP18_RECIPE`, so the file never names `examples/`. It boots `createTestApp` and signs in as `apps/api/test/graph-runner-validation.test.ts` does, posts the parsed recipe to `GRAPH_VALIDATE_ROUTE`, and expects zero issues. Run it with `GNP18_RECIPE=examples/fiction/graphs/dialogue-scene.json npx vitest run apps/api/test/tmp-gnp18-recipe.test.ts` (or the api workspace's Vitest). Expected: passes with zero issues. Delete the file afterwards (step 10). Record the output. Failure means the recipe is not valid: stop and report (open point 1).
9. Root gates. `npm run build`, `npm test`, `npm run lint`, and `npm run e2e`. The e2e harness reads the repository's `examples/`, so it sees the new sample. Expected: each exits 0. Record the counts of each suite, before and after if the e2e count changes.
10. Tree check. `git status --short` lists exactly the twelve paths of section 2 (`examples/samples.yaml` modified; eleven new under `examples/fiction/`). `find examples/fiction -type l` prints nothing. `find examples/fiction \( -name .scriba -o -name logs -o -name snapshots -o -name .versions \)` prints nothing. `apps/api/test/tmp-gnp18-recipe.test.ts` does not exist.
11. Commit. On `unit/GNP-18`: `feat(GNP-18): fiction sample project and samples.yaml entry`. Do not squash later.
12. Record. The Node and npm versions, each command's exit code and output lines named above, and R1, R2, R3 and N1 results. A criterion is marked passed only when its pass condition in section 4 holds.

## 4. Acceptance criteria and tests

Unit lines 25 and 26 are the criteria. The unit heading has no seam parenthetical, so the module's default seam applies (the examples check).

| Criterion | Test and seam | Command | Pass condition |
|---|---|---|---|
| 1. "The fiction sample validates in Platform's examples check (graph schema, `project.yaml`, entity types, recipe tool references and params)." | T1: the examples check, all three layers (M1 for `project.yaml` and the sample list, graph for the graph schema, pack for entity types and recipe tool references and params). No new test file. | `npm run lint:examples` (step 5) | Exit 0; stdout `examples check passed: 2 sample(s), ...`; no issue line names `examples/fiction` |
| 2. "Every story-node `path` exists" | T2a: the graph layer's story-path rule (`graph.mjs` D6), part of T1. Control N1 (step 6) shows the rule is live. | T1; N1 | T1 exit 0; N1 exit 1, naming the story graph and the missing `drafts/ledger.md` |
| 2. "two scene nodes share `drafts/arrival.md`; there is one label-only beat and one file-backed beat" | T2b: recorded run R1 (step 7). No committed test (G12, open point 2). | `node -e` over `examples/fiction/graphs/story.json` | Prints `R1 ok` with scenes 3, two on `drafts/arrival.md`, label-only beats 1, file-backed beats 1 |

R1 asserts, for `graphs/story.json`: `view` is `story`; scene nodes are 3, of which 2 have `path` `drafts/arrival.md`; beat nodes with no `path` are 1, and beat nodes with a `path` are 1 with `path` `drafts/ledger.md`; each `path` resolves to a file under `examples/fiction`; order edges are 3; containment edges are 1; causality edges are 1; the one edge with a relation outside `order`, `containment` and `causality` is `pov`, from a scene to an entity.

The other checks are not criteria. R2 (step 7) and R3 (step 8) are recorded for the implementer's own confidence and for GNP-19. R3 is the only check that catches an unwired required port.

No test file is added to the repository. The automated tests that run in the root gates are unchanged and are not extended.

## 5. Downstream agreement

- **GNP-19 (fiction gate; `blocked_by` line 7).** Its criterion "The fiction sample validates and its structural checks pass" is T1, with R1 and R2 recorded. Its demo step 2 (the shared file, both beats, the order edges) matches G7. Its demo step 4 (run the recipe with the storm scene and both keepers) needs four run-time values: a file value for `scene` (`drafts/the-storm.md`), a text value for `idea`, the two character refs for `keepers`, and the ref `book-style` for `style`. The fiction-order check (manuscript order arrival.md, the-storm.md, ledger.md) follows from G8 (assumption E). Its demo step 5 reads the Dialogue pending change, whose target is the run's (G10).
- **Eval cases (GNP-14, GNP-15, GNP-16, GNP-17).** Their `sample: fiction` matches G1. Their intents name no entity id, so they need no id from this plan. Their real-model runs wait for this merge. Their intents ("the two keepers", "the supply boat", "the lighthouse island") match the entities of G3 to G5 in meaning.
- **GNP-14 criterion 3 (manual run).** Waits for this merge. No plan change.
- **PST-05 (done; start-from-sample), its check list.** (a) The list item has `id`, `title` and `description` (G1). (b) Nested folders are copied (G3, G6, G7). (c) `project.yaml` has no `order`, and the copy changes only the title (G2). (d) No excluded path (G11). (e) The folder name equals the id, the folder is real and has no link (G1, G11). All hold.
- **PST-09 and SAU-14 (sample pickers).** They read `GET /api/project-store/samples` and show the new entry with no code change. The first-project step's default is assumption B.
- **PLT-20, PLT-21 and PLT-22 (examples check layers, done).** The M1 layer accepts the folder (D6 to D12). The graph layer accepts the two graph files and the story paths (D5, D6). The pack layer resolves entity types, top-level references and the `dialogue` node's params (D6, D7, D10). No rule changes.
- **GRR-01 (graph schema, done).** Both graph files parse with `graphFileSchema` (T1 proves it). Node kinds, edge relations and input params follow GRR-01's schemas.
- **GNP-03, GNP-13 and GNP-16 (done).** The entity types and the `dialogue` ports are used as their spec files define. The coreIdea gap noted in `plans/GNP-16.md` (lines 359 and 386) is closed by G9.
- **CEX-09 (done; assembly order).** The order chain is read by `pairsOf` (G8). No Compile & export change.
- **Image.** `Dockerfile` line 60 copies `examples/`, so the sample ships in the image. No change.
- **Module.** `modules/genre-packs.md` lines 23 and 33 draw GNP-18 under GNP-13 with GRR-01 and PST-05 only. The unit's `blocked_by` (GNP-03, GNP-13, GNP-16, GRR-01, PST-05) is the source of truth (`units/README.md` line 64), so this plan follows the unit. The module's graph needs a fix (open point 5).

## 6. Open points

1. **Recipe `coreIdea` (unit change needed).** Unit line 20 wires a text input into `dialogue` but does not wire `coreIdea`. `dialogue.yaml` requires it (`required: [coreIdea, characterIds]`), and an unwired required port blocks a run (GRR-03 line 20). This plan adds a second text input, `idea`, wired to `coreIdea`, as the nonfiction recipe does (G9). The alternative is a text pin in `dialogue`'s params. GRR-01 line 20 describes pins as entity references, so a text pin is not confirmed (assumption C). Unit change: unit line 20 should name the `idea` input. The Navigator may instead accept the pin.
2. **Criterion 2's shape clause has no committed test.** Unit tests never read `examples/` (`units/README.md` line 141; module line 88), and the examples check refuses a test that names `examples/` (PLT-20 D13). This plan records one run (R1), as PST-11 D11 did. The alternative, a shape rule in the examples check's graph layer, changes a done unit's file (PLT-21). Not proposed here.
3. **Order chain.** The unit's "arrival scenes → storm → ledger beat" is read as e1, e2, e3 (G8). If the author meant only that both arrival scenes precede the storm, with no edge between them, drop e1 and add `arrival-1` to `storm`. The manuscript order is the same either way.
4. **Output node with no path.** The Dialogue output goes to the run's target (G10). The nonfiction recipe sets a path. Confirm the choice, or name a path such as `drafts/the-storm.md`, which would replace the storm scene.
5. **Module graph.** `modules/genre-packs.md` lines 23 and 33 leave GNP-03 and GNP-16 out of GNP-18's blockers. The unit lists them. No plan impact. A module edit is requested, not made.
6. **Nested references.** The pack layer reads top-level references only (`pack.mjs`, `checkReferences`). `relationships[].character` is covered only by R2. A later rule in PLT-22 could cover it. Not in this unit.
7. **R3 uses a throwaway test.** It is deleted before the commit (step 10). If the Navigator prefers, drop R3 and rely on GNP-19's demo. The recipe would then go unchecked until GNP-19.
8. **Simplest-option names and text.** The ids, file names and graph names are as in section 1c and section 2. The implementer may change the prose, not the ids or file names. If a name must change, the plan changes first.
