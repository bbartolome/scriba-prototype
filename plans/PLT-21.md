---
id: PLT-21
status: planned
---
# PLT-21 plan — examples/ check, graph layer (graphs/ schema, story-node paths)

Unit: PLT-21 (module Platform, phase:examples-check, M2 to M4; blocked by PLT-20 and Graph runner phase:contract (GRR-01); unblocks GRR-16; `units/PLT-21-examples-check-graph-layer.md` lines 7 and 9). Base: `main` at 418fe6f (`git rev-parse --short HEAD`; the commit of the draft of this plan, which changes only `plans/PLT-21.md` after 3f3e7ab), with a clean tree (`git status --short` prints nothing). Revised on 2026-11-15: the open points of the draft are settled in section 6, and the code facts of section 7 were checked again on 418fe6f. PLT-20 is merged: `b3841cb feat(PLT-20)` and `9190e75 docs(PLT-20)` are on main, and `plans/PLT-20.md` line 3 says `status: done`. The PLT-20 code on main differs from the PLT-20 plan in places (section 7 lists them), so this plan builds on the code on main. This plan changes no file except this one. Every fact is marked FACT (section 7) or ASSUMED (section 8).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contracts, the earlier plans or DECISIONS

- **Scope.** The PLT-21 check adds two rules to the PLT-20 check: every file under each sample's `graphs/` folder parses with the Graph runner's graph schema, and every story-node `path` resolves to an existing file in the same sample. Source: unit lines 15 to 17.
- **Failures and growth.** Failures name the file path and the issue. The check keeps passing as later milestones add content. Source: unit line 18.
- **Criteria.** Four, at unit lines 21 to 24. Section 4 gives one test for each.
- **Schema.** `graphFileSchema`, the save rule with unique node and edge ids. Source: `packages/contracts/src/graph-runner/graph.ts` lines 183 to 186; `plans/GRR-01.md` line 81 (C2: PLT-21 uses `graphFileSchema`, not the shape schema).
- **File layout.** A graph is `graphs/<id>.json`, and the stem is the graph id. Source: `units/GRR-01-contract-slice.md` line 17; `packages/contracts/src/graph-runner/constants.ts` line 44 (`GRAPH_FOLDER`).
- **Story paths.** `path` is project-relative to a current file. A node with no `path` is label-only. Several nodes may share a file. Source: `units/GRR-01-contract-slice.md` line 19; `graph.ts` lines 33 to 38 (the schema does not check these rules; the validator does).
- **The existence rule is not in the contract.** The schema accepts any string as a path, so existence is this check's own rule. Source: `plans/GRR-01.md` lines 82 and 242.
- **A missing `graphs/` folder is no issue.** Source: `plans/DECISIONS.md` line 2427 (item 3 of the PLT-20 review: PLT-21's layer must treat a missing `graphs/` folder as no issue; PLT-20 covers only a missing `examples/` folder).
- **Layer contract.** `LAYERS` in `scripts/examples-check/index.mjs` line 15 is appended to, not replaced. Each layer exports `check(ctx)` returning `[{file, message}]` (`scripts/examples-check/m1.mjs` line 16). Source: `plans/PLT-20.md` line 46 (D16). Each layer has its own test file, `scripts/examples-check-<layer>.test.mjs`, which the test-file rule exempts by the pattern on `m1.mjs` line 26. Source: `plans/DECISIONS.md` line 2368 (item 4).
- **Test seam.** External behaviour only: the CLI's exit code and its stdout and stderr text, on temp trees built with `mkdtemp`. No test reads `examples/`. Sources: `modules/platform.md` line 57; `units/README.md` line 138.
- **Blocker.** GRR-01 is merged (`0fe9f34 feat(GRR-01)` is on main; `plans/GRR-01.md` line 3 says `status: done`). Its unit names PLT-21 in `unblocks` (`units/GRR-01-contract-slice.md` line 9), which is the inverse of PLT-21's `blocked_by` (unit line 7). Source: `units/README.md` line 64.
- **Not this unit's.** The folder rules for story paths (entity nodes into `entities/`, scene and beat nodes into `drafts/`, nothing in `drafts/.versions/`) are validator warnings (GRR-03), not sample errors. Sources: `units/GRR-01-contract-slice.md` line 19; `constants.ts` lines 110 to 117; `plans/GRR-01.md` line 82.
- **Commit style.** Conventional Commits, with the unit id as the scope. Sources: `plans/PLT-20.md` line 22; `prompt.md` line 26.

### 1b. Decisions this plan makes

- **D1 Layout.** New `scripts/examples-check/graph.mjs` (the layer). Edited: `scripts/examples-check/index.mjs` (the import, `LAYERS`, the graph-runner contracts, the context field, one comment) and `scripts/examples-check/lib.mjs` (the contracts loader takes a subpath). Not edited: `m1.mjs`, `package.json`, `.github/workflows/ci.yml`. New test file: `scripts/examples-check-graph.test.mjs`. Reason: the layer contract (`plans/PLT-20.md` D16); PLT-22 adds a sibling file (section 5).
- **D2 Contracts loader.** `requireContracts(scriptRoot, subpath = 'project-store')` in `lib.mjs` requires `@bbartolome/scriba-contracts/${subpath}` from `apps/api/package.json`, as it does today. The default keeps every one-argument call valid. `index.mjs` loads `'graph-runner'` in the same try block as `'project-store'` (lines 35 to 43) and puts it in the context as `ctx.graphRunner`. The exit 2 message names both subpaths. Reason: the loader always uses the repository the script lives in, never `--root` (`lib.mjs` lines 8 and 9; `index.mjs` line 37).
- **D3 Which files.** Every regular file under `<sample>/graphs/`, at any depth, whatever its name (`walk` in `lib.mjs` lines 20 to 41, entries of kind `file`). A dot-named file such as `.gitkeep` is a `graphs/` file too, so it must parse (section 6, point 1). A symbolic link is skipped, because the M1 layer reports each link once and does not follow it (`m1.mjs` lines 143 to 147). Directories are walked. Other entry kinds are skipped. There is no file-name rule (section 6, point 2). Reason: the unit says "every `graphs/` file" (line 16).
- **D4 The `graphs/` entry itself.** Missing: no issue (`plans/DECISIONS.md` line 2427). A symbolic link: no issue from this layer, because the M1 layer reports it. A regular file: the issue `graphs must be a folder, not a file` on `examples/<id>/graphs`. This mirrors `m1.mjs` lines 37 to 42.
- **D5 Parsing.** `JSON.parse` of the file's UTF-8 text. A failure is one issue: `not valid JSON: <first line of the parser message>`. A success goes to `graphFileSchema.safeParse`. Each zod issue becomes an issue through `issueLines` (`lib.mjs` lines 102 to 108), in the form `<path joined by '.'>: <zod message>`, with `(root)` for an empty path. The check does not import zod, as in `plans/PLT-20.md` D5.
- **D6 Story-node paths.** Checked only for a graph that passed D5 and has `view: 'story'`. For each node that has a `path`, whatever its kind: `target = resolve(sample.dir, path)`. The path passes when the target is inside the sample (`target` starts with `sample.dir + sep`) and `lstat(target)` is a regular file. Otherwise there is one issue on the graph file: `node "<id>": path "<path>" is not an existing file in this sample`. One message covers a missing target, a folder, a symbolic link, and a target outside the sample (an absolute path or one with `..` that leaves it), because each is "not an existing file in the same sample" (unit line 17; section 6, points 3 and 4). Nodes without a `path` are skipped. Recipe graphs get no path check: a recipe output node's `params.path` names a file that a run writes, not one that must exist, and the unit names story-node paths only (section 6, point 5).
- **D7 Shared reader `graphFiles`.** `graph.mjs` exports `graphFiles(ctx, sample)`, which returns one record `{file, graph, issues}` for each file of D3, sorted by path: `file` is the repository-relative path, `issues` is the D5 issues of that file, and `graph` is the schema-parsed graph when `issues` is empty, else `null`. `check` uses it for every sample: it adds each record's `issues`, then applies D6 to each record whose `graph` is a story. So the export is used on main from the first commit, and PLT-22 can read the parsed recipes from it (`units/PLT-22-examples-check-pack-layer.md` line 22: "PLT-21 parses them") without a second parse rule. It follows the pattern of `entityFiles` (`m1.mjs` lines 57 to 59). Section 6, point 7.
- **D8 Output unchanged.** The pass line (`index.mjs` lines 58 to 64) and the stats are unchanged, because no criterion asks for a graph count. The only output change is the comment on `index.mjs` line 12, which after this unit names PLT-22 alone.
- **D9 Test file.** `scripts/examples-check-graph.test.mjs` has its own small valid-tree helper, a copy of the PLT-20 layout (`scripts/examples-check.test.mjs` lines 22 to 36), not an import. Reason: PLT-20's test file stays unchanged, so PLT-22's test file and this one do not conflict.
- **D10 Commits.** Two commits on `unit/PLT-21`, not squashed. Commit 1: `feat(PLT-21): add the graph layer to the examples check (graphs/ schema and story-node paths)`, covering `graph.mjs`, `index.mjs` and `lib.mjs`. Commit 2: `test(PLT-21): cover the graph layer criteria and extras`, covering the test file. Reason: the same split as `plans/PLT-20.md` D19.
- **D11 Repository gate.** `examples/nonfiction` has no `graphs/` folder (FACT), so `npm run lint:examples` passes on the repository with `1 sample(s)`.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `scripts/examples-check/graph.mjs` | new | `check(ctx)` for D3 to D6 (criteria 1 to 3) and `graphFiles(ctx, sample)` (D7) |
| `scripts/examples-check/index.mjs` | edit | Import `./graph.mjs` as `graph`; `LAYERS = [m1, graph]` (line 15); load `graph-runner` into `ctx.graphRunner` (D2, lines 35 to 53); the exit 2 message names both subpaths (line 40); the comment on line 12 names PLT-22 only |
| `scripts/examples-check/lib.mjs` | edit | `requireContracts(scriptRoot, subpath = 'project-store')` (lines 10 to 15, D2) |
| `scripts/examples-check-graph.test.mjs` | new | Criteria C1 to C4 and extras E1 to E6 (section 4) |

Must not change:
- `scripts/examples-check/m1.mjs`. Its line numbers are cited by `plans/AGL-08.md` lines 14 and 244.
- `scripts/examples-check.test.mjs`, PLT-20's test file (D9).
- `package.json`. No new script; `lint:examples` (line 27) already runs the check.
- `.github/workflows/ci.yml`, `packages/contracts/**` (GRR-01 owns the graph schema), `examples/**` (the sample content belongs to PST-11 and later units), `e2e/**`, `apps/**`, `lint-fixtures/**`.
- `units/**`, `modules/**`, `plans/DECISIONS.md`, and every other file in `plans/`.
- `packages/contracts/dist/**` is a build output (`.gitignore` line 2). The build changes it, and it is not committed.

## 3. Procedure

Every step runs in the implementer's own worktree on branch `unit/PLT-21` (`prompt.md` line 118). If the driver has not made the worktree, `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/PLT-21 -b unit/PLT-21 main` (the form of `plans/SHL-22.md` line 81). Do not switch branches in the main checkout. Record `node -v` and `npm -v` beside each result (`.nvmrc` line 1 is 26, FACT). Do not push. Do not add a remote, and do not use `origin`. Stage only the paths of section 2.

0. **Base.** `git branch --show-current` prints `unit/PLT-21`. `git log --oneline -1 main` prints `418fe6f`, or a later commit on main that changes only `plans/`, `units/` or `modules/`, or one that also holds PLT-22's merge (then section 5, "PLT-22 lands first", applies). Any other code change on main: stop and report. `git status --short -- ':!plans'` prints nothing. `git ls-files examples` lists `examples/samples.yaml` and the `examples/nonfiction/` files, with no `graphs/` (FACT). If anything differs, stop and report.
1. **Dependencies.** `npm ci` in the worktree. Expected: exit 0.
2. **Contracts build.** `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0, and `packages/contracts/dist/graph-runner/graph.js` exists. The `dist/graph-runner` folder in the main checkout holds only `index.js` and `index.d.ts` (FACT), so this build is needed before any run. Stop and report on failure.
3. **Baseline lint.** `npm run lint`. Expected: exit 0, ending with `All matched files use Prettier code style!`. Stop and report if it fails before any change.
4. **Red first.** Write `scripts/examples-check-graph.test.mjs` (section 4). Run `node --test scripts/examples-check-graph.test.mjs`. Expected: seven tests fail (C1, C2, C3, E1, E2, E3, E5) and three pass (C4, E4, E6, which guard current behaviour). The test file itself loads. Save the output.
5. **Green.** Edit `lib.mjs` (D2). Write `graph.mjs` (D3 to D7). Edit `index.mjs` (D1, D2, line 12). Run `node --test scripts/examples-check-graph.test.mjs`. Expected: 10 pass. Run `node --test scripts/examples-check.test.mjs`. Expected: every PLT-20 test still passes. Save the output.
6. **Repository run.** `node scripts/examples-check/index.mjs`. Expected: exit 0, and a pass line that starts `examples check passed: 1 sample(s)`. Record the wall time (ASSUMED under five seconds).
7. **Format and wire.** `npx prettier --write scripts/examples-check/graph.mjs scripts/examples-check/index.mjs scripts/examples-check/lib.mjs scripts/examples-check-graph.test.mjs`. Then `npm run lint:examples` (exit 0, the pass line of step 6), then `npm run lint` (exit 0, ending with the Prettier line).
8. **Repeat.** Formatting may change the code, so run the two test commands of step 5 and the repository run of step 6 again. Expected: the same results. Save the output.
9. **Full tests and build.** `npm test` at the root. Expected: exit 0, and the 10 new tests among the `scripts` results (`package.json` line 25). Then `npm run build`. Expected: exit 0.
10. **Paths.** `git status --short -- ':!plans'`. Expected: exactly the four paths of section 2.
11. **Commits.** Commit 1 and commit 2 as D10 says, not squashed. Expected: `git log --oneline -2` shows both messages.
12. **Fresh clone.** `git clone --branch unit/PLT-21 /Users/bbartolome/workspace/scriba-prototype <empty dir under /tmp>`. In the clone: `npm ci && npm run lint && npm test && npm run build`. Expected: each exits 0. The clone's remote is the local path, not `origin`, and nothing is pushed.

Stop rules:
- Step 2 or 3 fails: stop and report. The fault is not in this unit.
- Step 4: if C4, E4 or E6 fails, the current behaviour differs from section 7. Stop and report.
- Step 6 or 7 reports an issue on an existing test file: stop. The test-file rule is wrong for this tree; do not edit the existing test to satisfy it.
- Step 12 fails: do not push.

## 4. Acceptance criteria and tests

All tests are in `scripts/examples-check-graph.test.mjs`. Each builds its tree with `mkdtemp` under `os.tmpdir()` and removes it in `finally`. Each runs `spawnSync(process.execPath, [CLI, '--root', tree])`, where `CLI` is `scripts/examples-check/index.mjs` under the repository root. The seam is the exit code and the stdout and stderr text. The helpers `withTree`, `run`, `errorLines` and `hasLine` are copies of PLT-20's (D9). No test reads a repository file under `examples/`.

Fixtures:
- `VALID`: the PLT-20 layout. `examples/samples.yaml` has one `nonfiction` entry. `examples/nonfiction/project.yaml` has `schemaVersion: 1`, `title` and `genrePack: nonfiction`. It has `sources/outline.md`, `entities/style.md` (`type: style-profile`), `drafts/cold-open.md` and a `.gitignore` with `.scriba/`. It has no `graphs/` folder.
- `json(value)`: `JSON.stringify(value, null, 2) + '\n'`.
- `STORY`: `{schemaVersion: 1, view: 'story', name: 'Outline', nodes: [{id: 'ada', kind: 'entity', label: 'Ada', path: 'entities/style.md', position: {x: 0, y: 0}}, {id: 'opening', kind: 'scene', label: 'Opening', path: 'drafts/cold-open.md', position: {x: 200, y: 0}}], edges: [{id: 'e1', from: 'ada', to: 'opening', relation: 'containment'}]}`. Both paths exist in `VALID`.
- `RECIPE`: `{schemaVersion: 1, view: 'recipe', name: 'Notes', nodes: [{id: 'notes', kind: 'input', position: {x: 0, y: 0}, params: {type: 'text', label: 'Chapter notes'}}], edges: []}`.

Criteria (one test each):

| Criterion (unit line) | Test | Tree and expectation |
|---|---|---|
| 1 (line 21): every `graphs/` file parses with the Graph runner schema | C1: every file under `graphs/` must be a valid graph; a file that is not JSON fails, naming it | (a) `VALID` + `graphs/outline.json` = `json(STORY)` + `graphs/notes.json` = `json(RECIPE)` exits 0, and stdout matches `/examples check passed/`. (b) (a) + `graphs/readme.txt` = `not a graph` + newline exits 1, and a stderr line starts `examples/nonfiction/graphs/readme.txt: not valid JSON: ` |
| 2 (line 22): a story node whose path is missing fails with the graph file and node id | C2: a story node whose path names no file fails, naming the graph file and the node id; the same node with its file present passes | (a) `VALID` + `graphs/outline.json` = `json(STORY)` with a third node `{id: 'chapter-two', kind: 'beat', label: 'Chapter two', path: 'drafts/chapter-two.md', position: {x: 400, y: 0}}` and no file at that path exits 1. A stderr line starts `examples/nonfiction/graphs/outline.json: node "chapter-two": path "drafts/chapter-two.md" is not an existing file in this sample`. (b) the same tree + `examples/nonfiction/drafts/chapter-two.md` exits 0 |
| 3 (line 23): a graph with a schema violation fails with the path and the issue | C3: a graph with `schemaVersion: 2` fails, naming the graph file and the field | `VALID` + `graphs/bad.json` = `json({...STORY, schemaVersion: 2})` exits 1. A stderr line starts `examples/nonfiction/graphs/bad.json: schemaVersion: ` |
| 4 (line 24): passes on a sample with no `graphs/` folder | C4: a sample with no `graphs/` folder passes, and so does one with an empty `graphs/` folder | (a) `VALID` exits 0. (b) `VALID` + an empty `examples/nonfiction/graphs` directory (made with `mkdirSync`) exits 0 |

Extras (decisions with no criterion of their own):

| Decision | Test | Tree and expectation |
|---|---|---|
| D6 (leaves the sample; label-only nodes; shared file) | E1: a story path that leaves the sample fails, even when the file exists there; label-only nodes and two nodes sharing one file pass | (a) `VALID` + `examples/outside.md` (a real file next to the sample folder) + `graphs/escape.json` = a story whose `ada` path is `../outside.md` exits 1. A stderr line starts `examples/nonfiction/graphs/escape.json: node "ada": path "../outside.md" is not an existing file in this sample`. (b) `VALID` + `graphs/shared.json` = a story with nodes `scene-a` and `scene-b`, both at `drafts/cold-open.md`, and a beat `beat-label` with no path exits 0 |
| D6 (a folder is not a file) | E2: a story path that names a folder fails | `VALID` + `graphs/folder.json` = a story whose `opening` node has path `drafts` exits 1. A stderr line starts `examples/nonfiction/graphs/folder.json: node "opening": path "drafts" is not an existing file in this sample` |
| D4 (`graphs` is a file) | E3: a `graphs` entry that is a file, not a folder, fails once | `VALID` + a regular file at `examples/nonfiction/graphs` with the text `not a folder` + newline exits 1. `errorLines` has exactly two lines: the first starts `examples/nonfiction/graphs: graphs must be a folder`, and the last is `examples check failed: 1 issue(s)` |
| D4 (`graphs` is a link) | E4: a `graphs` symbolic link fails once, through the M1 layer | `VALID` + `examples/nonfiction/graphs` as a symlink to a temp folder (outside the tree) that holds a broken `{` file exits 1. Exactly one stderr line starts `examples/nonfiction/graphs: `, and it includes `symbolic link`. The last line is `examples check failed: 1 issue(s)` |
| D5 (schema: duplicate ids) | E5: duplicate node ids fail under the save rule, naming the path | `VALID` + `graphs/dup.json` = a story with two nodes both with id `ada` exits 1. A stderr line starts `examples/nonfiction/graphs/dup.json: nodes.1.id: ` and includes `Duplicate node id "ada"` |
| D3 (symlink file) | E6: a symbolic link file under `graphs/` fails once, through the M1 layer | `VALID` + `graphs/link.json` as a symlink to a valid recipe file in a temp folder (outside the tree) exits 1. Exactly one stderr line starts `examples/nonfiction/graphs/link.json: ` and includes `symbolic link`. The last line is `examples check failed: 1 issue(s)` |

The draft's E6 (broken JSON in a `.json` file) is dropped: it runs the same code path as C1 (b), the not-JSON case, and asserts the same prefix.

Criteria covered: 4 of 4 (C1 to C4, one named test each). Extras: 6 (E1 to E6). Total: 10.

## 5. Downstream and parallel agreement

- **GRR-16 (nonfiction sample recipe; `units/GRR-16-sample-recipe.md`, blocked by PLT-21 at line 7).** It adds `examples/nonfiction/graphs/chapter-opening.json` (line 15), a recipe with no story graph (line 22). PLT-21 checks its schema (the recipe shape, `graph.ts` lines 127 to 133). D6 does not apply to recipes. Its criterion at line 26 ("passes Platform's CI sample check (graph schema, tool references and `params`)") is met by PLT-21 for the schema and by PLT-22 for tool references and params (`units/PLT-22-examples-check-pack-layer.md` lines 19 and 25). Agrees. The name `chapter-opening.json` is accepted by D3, which has no name rule (section 6, point 2). Its output node "writing a draft" (line 20) may name a `params.path` that does not exist yet; D6 does not check it (section 6, point 5).
- **PLT-22 (pack layer; `units/PLT-22-examples-check-pack-layer.md`, parallel with PLT-21 at line 8, blocked by PLT-20 and Tool registry phase:loader-validation (TRG-11)).** PLT-22 has no plan on main, so the change below is the one its unit states (lines 18 to 22). PLT-22 adds its own layer module (its name is its choice, for example `scripts/examples-check/pack.mjs`), appends it to `LAYERS` in `index.mjs`, adds its own test file (`scripts/examples-check-pack.test.mjs`, exempt under the same pattern), and may use `ctx.graphRunner` (D2) and `graphFiles` (D7) once PLT-21 has landed (its line 22: "PLT-21 parses them; if PLT-21 hasn't landed, this unit reads recipe files through the Graph runner contract itself"). Its line 21 also lists "story-node `path`s" among the references that must resolve in the same sample. That is the rule of this unit's D6 and criterion 2, so a missing story path must give one issue, not one from each layer: PLT-22's plan meets that item through PLT-21's D6 when PLT-21 is on main, and if PLT-22 lands first with its own story-path check, PLT-21 (as the second merger) removes the duplicate so that D6's message is the one reported. Both changes must be correct in either order:
  - PLT-21 lands first. PLT-22 rebases. `LAYERS` becomes `[m1, graph, pack]`. The loader and `ctx.graphRunner` from D2 stay as they are, and PLT-22 uses them.
  - PLT-22 lands first. If PLT-22 needed the graph contract before PLT-21, it must load it under the name `graphRunner`, the name D2 uses, with one load line. PLT-21 then keeps that one load and adds no second. `LAYERS` becomes `[m1, pack, graph]`, with both kept. `requireContracts` called with one argument still works (the D2 default), so PLT-22's call is valid either way. If PLT-22 read the recipe files itself, it switches to `graphFiles` when it rebases, or keeps its reader; D7 is used by `check` in either case.
  - In either order, the `LAYERS` line and the line 12 comment conflict in text. The second merger keeps both entries, following the convention of `plans/PLT-20.md` line 141 (the TRG-07 row).
- **GRR-06 (output nodes and the graphs validator; `units/GRR-06-output-nodes-pending-changes.md` lines 21 and 26).** It registers the graph schema as the Project store's validator for `graphs/*.json`, and it checks content against the graph schema. Same schema. PLT-21 adds the existence rule at sample level, which the schema cannot express (`plans/GRR-01.md` line 82). Agrees.
- **GRR-03 (validation; `units/GRR-03-validation.md` line 22).** The validator reports missing and unsafe story paths as warnings on a saved graph (`constants.ts` lines 113 to 117). PLT-21 reports a missing story path as an error in the sample check. The places and severities differ, and neither changes the other. Agrees.
- **AGL-13 and GNP-04 (`units/AGL-13-output-routing.md` lines 21 and 28; `units/GNP-04-propose-graph.md` line 21).** Proposed graphs are written to `graphs/` after validation against the graph schema. PLT-21 checks sample files only. Agrees.
- **GNP-18 (fiction sample; `units/GNP-18-fiction-sample.md` lines 19 and 20).** Its story graph has two scene nodes on one file, a label-only beat, a file-backed beat and entity nodes. Its recipe has text, entity and style inputs and a `dialogue` tool node. PLT-21 accepts these shapes (E1b covers the shared-file and label-only shapes). Every story path must name a file that GNP-18 ships (`drafts/arrival.md`, `drafts/the-storm.md`, `drafts/ledger.md`, and any entity file that a node names), or PLT-21 fails at M6. Agrees, with this requirement.
- **PST-11 (nonfiction skeleton) and PST-03 (new projects).** The sample has no `graphs/` folder (D11). PST-03 creates an empty `graphs/` in new projects (`units/PST-03-discovery-new-import.md` line 21), and an empty `graphs/` passes (C4b). Agrees.
- **PLT-20.** The M1 layer is unchanged. The edits are the loader signature (`lib.mjs`), the context field `ctx.graphRunner`, the `LAYERS` line, the exit 2 text and one comment. PLT-20's tests are unchanged and still pass (step 5). Agrees.
- **GRR-01.** No contract change. Its `unblocks` (`units/GRR-01-contract-slice.md` line 9) names PLT-21. Its last criterion, "Contract tests pass in CI" (line 39), is unticked and is not PLT-21's. Agrees.
- **AGL-08 and SHL-22 (both `status: planned`).** No overlap. AGL-08 changes e2e files and `apps/api/test/agent-loop-run.test.ts` (`plans/AGL-08.md` section 2 table), and it lists every `package.json` as not changed (line 68). SHL-22 changes web and API specs. AGL-08 cites `m1.mjs` lines 24 to 33 (line 14), and PLT-21 does not move them. Agrees.
- **PLT-10 and CI.** No change to `ci.yml`. The lint order is as PLT-20 left it.

## 6. Points settled in revision (2026-11-15)

1. **A `.gitkeep` under `graphs/` fails.** Kept. The unit says "every `graphs/` file" parses (line 16), and criterion 1 says "Every `graphs/` file parses with the Graph runner schema" (line 21); an exemption would let a file under `graphs/` pass without parsing. Nothing needs a placeholder file: GRR-16 adds a recipe to the folder (`units/GRR-16-sample-recipe.md` line 15), git does not track an empty folder, and an empty folder passes (C4b). D3 and C1 stay as written.
2. **No file-name rule for `graphs/<id>.json`.** Settled: none. The name rule is GRR-01's shape (`units/GRR-01-contract-slice.md` line 17) and belongs to the Graph runner's listing and create rules; the PLT-21 unit, its criteria and the module file do not ask the sample check for it. A non-JSON name such as `readme.txt` still fails by D5 (C1 (b)).
3. **A story path that leaves the sample fails.** Kept, with the same message as a missing file (D6). "Resolves to an existing file in the same sample" (unit line 17) is not met by a file outside it, even an existing one (E1 (a)). The draft's separate "leaves the sample" message is dropped; one message keeps the code to one branch.
4. **A symbolic link at a story path** fails by D6, and the M1 layer also reports the link itself. Accepted: the two issues are on two different files (the graph file and the link), and each is true. No extra test; D6's `lstat` rule is covered by E2 (a folder).
5. **Recipe output `params.path` is not checked.** Confirmed. The unit's rule names story-node paths only (line 17), and an output node's path names a file that a run writes (`units/GRR-01-contract-slice.md` line 20; `units/GRR-06-output-nodes-pending-changes.md` line 21).
6. **Shared names with PLT-22.** Settled from this side: `requireContracts(scriptRoot, subpath = 'project-store')` in `lib.mjs`, the context field `ctx.graphRunner` (the `@bbartolome/scriba-contracts/graph-runner` exports), the layer module `scripts/examples-check/graph.mjs` with `check(ctx)` and `graphFiles(ctx, sample)` (D7 record shape), and the merge rules of section 5. These go to `plans/DECISIONS.md` so that PLT-22's planner uses them. PLT-22's plan is not written; its reviser checks it against section 5.
7. **`graphFiles` before PLT-22 uses it.** Kept, but `check` now uses it (D7), so it is not dead code on main. PLT-22's unit line 22 states that PLT-21 parses the graph files for it.

## 7. Facts checked

Each line is FACT (checked on `main` at 3f3e7ab in this checkout, and the code lines again at 418fe6f in revision, with file and line) unless it says otherwise.

- `units/PLT-21-examples-check-graph-layer.md` lines 7 (`blocked_by`), 8 (`parallel_with`), 9 (`unblocks`), 15 to 18 (decisions), 21 to 24 (criteria). The file is 24 lines. It has no note that records a change of the unit (no "by revision" text).
- `units/PLT-20-examples-check-m1-layer.md` lines 7, 9, 18 (`npm run lint` wiring), 19 (samples layout), 20 to 25 (checks), 26 (failure output), 27 (empty state).
- `units/PLT-22-examples-check-pack-layer.md` lines 7, 8, 14 (closes the phase with PLT-21), 17 (library entry point), 18 to 22 (additions; line 22 says recipe checks apply once graph files exist), 25 to 29 (criteria).
- `units/GRR-01-contract-slice.md` lines 9 (`unblocks` PLT-21), 17 (`graphs/<id>.json`; the stem is the id), 19 (path meaning), 36 to 39 (criteria; line 39 unticked). No note that records a change (checked).
- `units/GRR-16-sample-recipe.md` lines 7 (`blocked_by` PLT-21), 15 (adds `graphs/chapter-opening.json`), 22 (no story graph), 26 (criterion).
- `units/GRR-06-output-nodes-pending-changes.md` lines 21 and 26. `units/GRR-03-validation.md` line 22 (as `plans/GRR-01.md` line 82 cites it). `units/AGL-13-output-routing.md` lines 21 and 28. `units/GNP-04-propose-graph.md` line 21. `units/GNP-18-fiction-sample.md` lines 19 and 20. `units/PST-03-discovery-new-import.md` line 21.
- `units/README.md` lines 64 (the inverse rule), 69 (a phase closes when its gate unit is merged), 79 (the `phase:examples-check` row), 138 (unit tests never read `examples/`).
- `modules/platform.md` lines 22 (PLT-21 needs PLT-20 and the Graph runner contract), 31 (PLT-21 and PLT-22 in parallel), 57 (test seam).
- `modules/graph-runner.md` lines 27 (GRR-16 needs PLT-21) and 51 (Platform's CI check validates `examples/` graphs).
- `plans/GRR-01.md` line 3 (`status: done`); line 81 (C2: PLT-21 uses `graphFileSchema`); line 82 (C3: existence is not in the contract); lines 241 (GRR-16) and 242 (PLT-21's path rule is its own).
- `plans/PLT-20.md` line 3 (`status: done`); section headings at lines 9, 11, 25, 51, 73, 96, 132, 146, 153 and 200 (the layout this plan follows); line 22 (commit style); line 39 (D13); line 46 (D16); line 134 (the PLT-21 row, corrected by DECISIONS line 2427); line 141 (the TRG-07 row convention).
- `plans/DECISIONS.md` line 2364 (the review result: GRR-01 and TRG-11 block PLT-21 and PLT-22), line 2368 (item 4: exempt `scripts/examples-check*.test.mjs`; one test file per layer), line 2427 (item 3: a missing `graphs/` is no issue), line 2447 (approved).
- `plans/SHL-22.md` line 3 (`status: planned`), line 81 (the worktree form). `plans/AGL-08.md` line 3 (`status: planned`), line 14 and line 244 (cite `m1.mjs` lines 24 to 33), line 68 (the "not changed" list). `plans/SHL-14.md` line 7 (`status: done`). `plans/QUEUE.md` line 5 (PLT-21 available: yes).
- `prompt.md` line 26 (the unit id in each code commit message) and line 118 (the implementer's own worktree on `unit/<ID>`).
- `packages/contracts/src/graph-runner/graph.ts`: line 2 (import of `fileReferenceSchema`); lines 33 to 38 (the JSDoc: the schema does not check the path rules); lines 39 to 61 (`storyNodeSchema`, with `path` at lines 44, 51 and 58); lines 118 to 124 (story shape); lines 127 to 133 (recipe shape); lines 135 to 152 (`refineUniqueIds`, message at line 146, path at line 148); lines 155 to 160 (`storyGraphSchema`); lines 163 to 168 (`recipeGraphSchema`); lines 174 to 177 (`graphFileShapeSchema`); lines 183 to 186 (`graphFileSchema`).
- `packages/contracts/src/graph-runner/constants.ts`: line 7 (`GRAPH_SCHEMA_VERSION`), line 19 (`NODE_ID_PATTERN`), line 22 (`GRAPH_ID_PATTERN`), line 44 (`GRAPH_FOLDER`), lines 110 to 117 (the warning codes; `path-missing` at 113, `path-unsafe` at 114, `path-in-versions` at 115, `entity-path-outside-entities` at 117).
- `packages/contracts/src/graph-runner/index.ts` line 3 (exports `graph.js`).
- `packages/contracts/src/project-store/files.ts` line 9 (`fileReferenceSchema = z.string()`), lines 4 and 5 (the path rules belong to the module, not the contract).
- `packages/contracts/src/tool-registry/constants.ts` line 26 (`PORT_TYPES`: text, entity, style); `packages/contracts/src/tool-registry/spec.ts` line 18 (`portTypeSchema`).
- `packages/contracts/package.json` lines 18 to 21 (`./project-store`) and 30 to 32 (`./graph-runner`).
- `packages/contracts/dist/graph-runner/` holds `index.js` and `index.d.ts` only, with no `graph.js` (FACT, `ls`). `dist/` is git-ignored (`.gitignore` line 2).
- `apps/api/package.json` line 11 (the contracts dependency).
- Root `package.json` lines 23 (`build`), 25 (`test`), 26 (`lint`), 27 (`lint:examples`).
- `scripts/examples-check/index.mjs`: line 8 (import of `requireContracts`), line 10 (import of `m1`), line 12 (comment: PLT-21 and PLT-22 append), line 14 (exit codes), line 15 (`LAYERS = [m1]`), lines 17 to 21 (`SCRIPT_ROOT`), lines 35 to 43 (contracts load; the message at line 40 names only `project-store`), lines 45 to 53 (the context; `stats` at line 52), lines 54 to 56 (sorting), lines 58 to 64 (pass line), lines 78 to 81 (the `import.meta.main` run guard, which is not in the PLT-20 plan).
- `scripts/examples-check/lib.mjs`: lines 8 to 9 (contracts resolved from `apps/api`, never `--root`), lines 10 to 15 (`requireContracts`), lines 20 to 41 (`walk`), lines 43 to 49 (`lstatOrNull`), lines 51 to 53 (`lexists`), lines 55 to 58 (`isRealDirectory`), lines 62 to 68 (`discoverSamples`), lines 72 to 85 (`readFrontMatter`), lines 102 to 108 (`issueLines`), lines 110 to 112 (`toRel`), lines 114 to 118 (`compareText`).
- `scripts/examples-check/m1.mjs`: line 16 (layer contract), line 19 (excluded paths), line 26 (`EXEMPT_TEST_FILE`), lines 35 to 55 (`check`), lines 37 to 42 (the "examples must be a folder" check, the pattern for D4), lines 57 to 59 (comment and `entityFiles`, which PLT-22 reuses), lines 139 to 167 (tree walk; the symlink issue at lines 143 to 147), line 174 (`isFile` for `project.yaml`, a change made after the PLT-20 plan), lines 203 to 222 (test-file scan).
- `scripts/examples-check.test.mjs`: lines 18 to 19 (CLI path), lines 22 to 36 (`VALID`), lines 51 to 59 (`withTree`), lines 61 to 65 (`run`), lines 67 to 73 (`errorLines`, `hasLine`), lines 416 to 443 (the run-guard test).
- `examples/samples.yaml` lines 1 to 3 (one entry, `nonfiction`). `examples/nonfiction/project.yaml` line 4 (`genrePack: nonfiction`). `git ls-files examples` lists no `graphs/` entry.
- Git: `418fe6f` is HEAD of `main` (the draft was made at `3f3e7ab`). `0fe9f34` (GRR-01 feat), `b3841cb` (PLT-20 feat) and `9190e75` (PLT-20 done) are ancestors of `main` (`git merge-base --is-ancestor`). The tree is clean.

## 8. Assumed facts (not checked by running anything)

- Checked in revision with a scratch script under `/tmp` (zod from `packages/contracts`, Node v26.13.0): a discriminated union of `superRefine`d strict objects reports `schemaVersion` with `Invalid input: expected 1` for `schemaVersion: 2`, and `nodes.1.id` with `Duplicate node id "ada".` for the custom issue, as C3 and E5 expect. `JSON.parse` of `{"schemaVersion": 1,` + newline throws a one-line message. The real `graphFileSchema` was not run (its `dist` file is not built in this checkout).
- ASSUMED: `npm run build -w @bbartolome/scriba-contracts` runs offline and emits `dist/graph-runner/graph.js`. Step 2 checks the second part.
- ASSUMED: the symlink tests (E4, E6) get the same `lstat` results on the implementer's machine as on CI's runner (`ubuntu-latest`, as PLT-20's section 8 assumes; not re-checked here).
- ASSUMED: the check finishes well within a few seconds on the repository and on the test trees. Step 6 records the time.
- ASSUMED: GRR-16's recipe and GNP-18's files, which are not on main, are schema-valid when they arrive and ship the files that their story paths name.
- ASSUMED: the implementer's `node -v` is 26.x (`.nvmrc` line 1 is 26, FACT).

## Review parts

One part: the plan is small, and every step builds or checks the one layer.

- **Part 1 — the graph layer and its tests.** Steps 0 to 12 of section 3; decisions D1 to D11; the four files of section 2. Tests: C1 (criterion 1), C2 (criterion 2), C3 (criterion 3), C4 (criterion 4), and the extras E1 to E6.
