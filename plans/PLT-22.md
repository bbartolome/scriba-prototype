---
id: PLT-22
status: draft
---
# PLT-22 plan — examples/ check, pack layer (tool refs and params, entity front matter, reference resolution)

Unit: PLT-22 (module Platform, phase:examples-check, M2; `blocked_by` PLT-20, TRG-11 and GNP-11; `parallel_with` PLT-21; `units/PLT-22-examples-check-pack-layer.md` lines 7 to 9). Base: `main` at 38dcdce (CHECKED `git log --oneline -1 main`). The working tree differs from `main` only in `units/SAU-12-providers-step.md` (CHECKED `git status --short`), which this plan does not touch. PLT-20 and PLT-21 are `done` (CHECKED `plans/PLT-20.md` and `plans/PLT-21.md` line 3), and so are GNP-11 (`plans/GNP-11.md` line 3) and TRG-11 (`plans/TRG-11.md` line 4); the pack layer builds on their code. This plan changes no file except `plans/PLT-22.md`, writes no code, runs no npm command and commits nothing. Each fact is marked CHECKED (file and line) or ASSUMED (section 8).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the contracts, the earlier plans or DECISIONS

- **Scope and criteria.** The unit's Decisions (lines 17 to 23) and criteria (lines 26 to 30): recipe tool nodes with params in `params` mode, entity front matter against pack entity-type schemas, entity references (front-matter reference fields, story-node paths, `[@id]` citations in drafts), and the gate on `examples/`. CHECKED.
- **Layer contract.** A layer module exports `check(ctx)` returning `[{file, message}]`; `LAYERS` in `scripts/examples-check/index.mjs` (line 16) is appended to; each layer has its own test file, exempt under `scripts/examples-check*.test.mjs` (`plans/PLT-20.md` D16 at line 46; `scripts/examples-check/m1.mjs` line 26). CHECKED.
- **Recipes.** PLT-21 is on `main`, so the recipe check uses its shared reader `graphFiles(ctx, sample)` (`scripts/examples-check/graph.mjs` line 12) and `ctx.graphRunner` (`index.mjs` line 54). The unit's fallback (line 23) does not apply. CHECKED.
- **Story-node paths belong to PLT-21.** `graph.mjs` lines 70 to 88 already check every story-node `path` (`plans/PLT-21.md` D6). This plan adds no story-path check, so no issue is reported twice (`plans/DECISIONS.md` line 4481, the point left for this planner). CHECKED.
- **Entity files and ids.** Every `.md` file under `entities/` and `sources/`; a `sources/` file without `type` is `source`. `entityFiles(ctx, sample)` (`m1.mjs` line 59) returns them (`plans/PLT-20.md` D10). Resolution: a front-matter `id` wins, otherwise the file stem; an id outside the pattern makes the file invalid; duplicates are errors and are never guessed (`units/PST-08-entity-resolution.md` line 22). CHECKED.
- **Patterns.** `ENTITY_ID_PATTERN` is `packages/contracts/src/project-store/constants.ts` line 4. `CITATION_PATTERN` is lines 7 and 8: unanchored, without the `g` flag, and "a scanner adds g itself" (comment line 6). Both reach the check through `@bbartolome/scriba-contracts/project-store` (`packages/contracts/src/project-store/index.ts` line 1). CHECKED.
- **Code is skipped in citations.** `units/CEX-07-entity-links-banned-phrases.md` line 15 (`[@id]`, multi-citations `[@a; @b]`, "code skipped"). CHECKED.
- **Pack schemas through the Tool registry's own functions.** `readEntityTypes(packsRoot)` (`apps/api/src/modules/tool-registry/entity-types.ts` line 259) returns a Map from kind to entry; `entityValidatorOf(entry)` (line 296) returns the per-kind checker. `readBuiltinTools(packsRoot, kinds)` (`packs.ts` line 341) returns the built-in tool entries and throws `BootError` on a duplicate name. `validateArguments(entry, request)` (`validate.ts` line 84) checks params in `params` mode (port keys dropped at line 93; `compiled.params` used at line 101) and throws `ModuleError` whose `details.issues` lists each `{path, message}` (`apps/api/src/modules/platform/errors/module-error.ts`; `validate.ts` line 133). CHECKED.
- **The library entry today.** `apps/api/src/modules/tool-registry/pack-lint.ts` exports `PackFinding` (line 11), `lintPacks` (line 17) and `formatFinding` (line 81), and no loader or validator. CHECKED.
- **Who decides the seam.** `plans/TRG-11.md` line 135: "extending the entry is PLT-22's planning point". `plans/GNP-01.md` line 133 (open point 4) and `plans/GNP-03.md` line 158 say the same. CHECKED.
- **The examples check loads the pack lint from `apps/api/dist`.** By `createRequire` from `apps/api/package.json`; `lint:examples` must build the API first (`plans/TRG-07.md` D9 at lines 68 to 74, and its section 6 at line 258). CHECKED.
- **Build and CI.** `lint` runs `lint:examples` before `lint:packs` (`package.json` lines 26 to 28); CI runs `npm run lint` (`.github/workflows/ci.yml` line 27) before `npm test` (line 29) and `npm run build` (line 31); `dist/` is git-ignored (`.gitignore` line 2). CHECKED.
- **Test seam.** External behaviour only; unit tests never read `examples/` (`units/README.md` line 138; `modules/platform.md` line 57). CHECKED.
- **Commit style and worktree.** The unit id in each commit message; code commits start `feat(`, tests `test(` (`prompt.md` lines 299 and 300; `plans/PLT-21.md` D10). The implementer works in its own worktree on `unit/PLT-22` and runs `npm ci` there first (`prompt.md` lines 118 and 121). CHECKED.

### 1b. Decisions this plan makes

- **D1 Layout.** New: `scripts/examples-check/pack.mjs` (the layer) and `scripts/examples-check-pack.test.mjs` (the tests). Edited: `scripts/examples-check/index.mjs`, `scripts/examples-check/lib.mjs`, `apps/api/src/modules/tool-registry/pack-lint.ts`, `package.json` (line 27 only), and the fixtures of the two earlier test files (D11). `m1.mjs` and `graph.mjs` are not edited.
- **D2 Library seam (the plan's choice; open point 1).** `pack-lint.ts` gains one function and two re-exports, all additive:

  ```ts
  export interface BuiltinPacks { tools: ToolEntry[]; entityTypes: Map<string, EntityTypeEntry>; }
  export function loadBuiltinPacks(packsRoot: string): BuiltinPacks;
  // entityTypes = readEntityTypes(packsRoot); tools = readBuiltinTools(packsRoot, new Set(entityTypes.keys()))
  export { validateArguments } from './validate';
  export { entityValidatorOf } from './entity-types';
  ```

  `lintPacks`, `formatFinding` and `PackFinding` stay as they are, so `scripts/lint-packs.mjs` and `scripts/lint-packs.test.mjs` are unaffected. Reason: the unit names this entry point (line 18), and TRG-07 D9 says the examples check reuses it (`plans/TRG-07.md` line 74). The alternative is in open point 1.
- **D3 Packs root.** Always `<scriptRoot>/packages/packs`, never `--root`, as the contracts are (`plans/PLT-20.md` D3). Reason: the built-in packs are the repository's, the same root as `DEFAULT_ROOT` in `scripts/lint-packs.mjs`; a temp tree has none.
- **D4 Build.** `lint:examples` becomes `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && node scripts/examples-check/index.mjs`. `lint` (line 26) and `lint:packs` (line 28) do not change. Reason: `apps/api/dist` holds the library, and the lint step runs before the build step in CI (`ci.yml` lines 27 and 31).
- **D5 Loading and exit 2.** `index.mjs` loads the library and the packs once, after the contracts, in its own `try`:
  - `library = requireBuilt(SCRIPT_ROOT, 'dist/modules/tool-registry/pack-lint.js')`;
  - `packs = library.loadBuiltinPacks(join(SCRIPT_ROOT, 'packages', 'packs'))`.

  A throw (no build, or a pack fault that `BootError` reports) exits 2 with one stderr line: `examples check: cannot load the built-in packs through the API build (<reason>); run npm run lint:packs`. The context gains `packs` (the `BuiltinPacks`) and `library` (`{validateArguments, entityValidatorOf}`). `requireBuilt(scriptRoot, relPath)` is added to `lib.mjs` beside `requireContracts` (lines 11 to 16): `createRequire` from `apps/api/package.json`, then `join(scriptRoot, 'apps', 'api', relPath)`.
- **D6 Entity front matter (criterion 2).** For each record of `entityFiles(ctx, sample)` that has no read error and a string `type`:
  - `type` is not a key of `ctx.packs.entityTypes` → `<file>: type: "<type>" is not a built-in entity type`;
  - otherwise `entityValidatorOf(entry)(record.frontMatter)`. Each issue is `<file>: <field>: <message>`, where `<field>` is the JSON-pointer path with `/` turned into `.` (`evidence.1`), `(root)` for the root, and `<message>` is the validator's text.
  - A record with a read error or no string `type` gets nothing from this layer, because PLT-20 reports it (`plans/PLT-20.md` D10). A `sources/` file without front matter has `type: source` from `entityFiles`, so it is checked against the `source` schema, which requires `title`, `citation` and `reliability` (`packages/packs/core/entity-types/source.yaml` line 22). CHECKED.
- **D7 Reference resolution (criterion 3).** The target index of a sample is built from every record of `entityFiles` (`entities/` and `sources/`): the id is the front-matter `id` when it is a string, otherwise the file stem (PST-08 line 22); the type is the record's `type`, which may be undefined. An id names a target when exactly one record has it.
  - (a) Reference fields: each property of the entity type's `fields.properties` with `x-scriba-type: entity`, whose value is a string or a list of strings. Examples: claim `evidence` (`packages/packs/nonfiction/entity-types/claim.yaml` lines 16 and 17), person `sources` (`person.yaml` lines 19 and 20). Only records with a string `type` that is a built-in kind are read this way.
  - (b) `links` in the base front matter (`packages/contracts/src/project-store/entities.ts` line 14), any kind. This is a plan choice (open point 3): CEX-07 line 15 checks `links` the same way, and the unit's "front-matter reference fields" covers it.
  - No target: `<file>: <field>: "<id>" does not name an entity or source in this sample`. More than one: `<file>: <field>: "<id>" names more than one file (<path>, <path>)`, paths in sorted order. For (a) only, when the property declares `x-scriba-entity-kinds` and the target's type is a string not in that list: `<file>: <field>: "<id>" is a <type>, but this field takes <kinds joined by ", ">`. A target with no type passes the kind test.
- **D8 Ids from file names.** A record whose id comes from its stem must match `ENTITY_ID_PATTERN`; otherwise `<file>: entity id "<stem>" from the file name does not match ^[a-z0-9][a-z0-9-]*$`. Reason: PST-08 line 22 makes such a file invalid and not resolvable, and without this rule its references would fail with no reason shown.
- **D9 Citations (criterion 3).** Every `.md` file under `<sample>/drafts/`, at any depth (`walk` in `lib.mjs`). Lines inside a fenced block are skipped (a line whose trimmed start is three backticks or three tildes toggles the fence), and so is text inside inline code spans on one line. Each match of `new RegExp(ctx.contracts.CITATION_PATTERN.source, 'g')` is split at `;`, and each `@id` is resolved as in D7 with any kind allowed. Issue: `<file>: [@<id>] does not name an entity or source in this sample`, or the duplicate form of D7. Nothing else in drafts is checked.
- **D10 Recipe tool nodes (criterion 1).** For each record of `graphFiles(ctx, sample)` with `graph !== null && graph.view === 'recipe'`, and each node with `kind === 'tool'` (`packages/contracts/src/graph-runner/graph.ts` lines 97 to 99 require `tool`; line 85 makes `params` an optional record):
  - no entry of `ctx.packs.tools` has that `name` → `<file>: node "<id>": tool "<tool>" is not a built-in tool`;
  - the entry is `valid: false` → `<file>: node "<id>": tool "<tool>" is not a valid built-in tool`;
  - otherwise `library.validateArguments({spec, compiled}, {mode: 'params', arguments: node.params ?? {}})`, with `{spec, compiled}` taken from `entry.tool`. A thrown error whose `details.issues` is an array gives one line per issue: `<file>: node "<id>": <field>: <message>`, with `<field>` as in D6 and `(params)` at the root. Any other error is rethrown.
  - Input and output nodes are not checked. An output node's `params.path` names a file that a run writes (`plans/PLT-21.md` section 6, point 5).
- **D11 Earlier fixtures (open point 2).** The trees of the two earlier test files are M1 samples that PLT-22 makes invalid: `sources/outline.md` has no front matter, and `entities/style.md` has only `type`, which fails `style-profile` (`packages/packs/core/entity-types/style-profile.yaml` line 21). Change the fixtures and keep every assertion:
  - `scripts/examples-check.test.mjs`: `VALID` (line 22). `sources/outline.md` gets front matter with `title`, `citation` and `reliability`; `entities/style.md` gets `tone`, an integer `targetLength` and a list `bannedPhrases`. C6 (line 258): `sources/notes.md` and `sources/quotes.md` get `citation` and `reliability`. E1 (line 274), first case: `sources/outline.md` gets `citation` and `reliability`.
  - `scripts/examples-check-graph.test.mjs`: `VALID` (line 23), the same two files.

  PLT-20's C1(c) and E4(a) files have no `type` or no closed front matter, so D6 skips them and they keep their PLT-20 result. Without this change most PLT-20 and PLT-21 cases that expect exit 0 would fail.
- **D12 Output.** The pass line and the stats stay as they are, so the line that `plans/GNP-11.md` T1 expects holds: `examples check passed: 1 sample(s), 1 project.yaml, 9 entity file(s), <N> test file(s) scanned`. `LAYERS` becomes `[m1, graph, pack]` (line 16). The comment on line 13 is updated to name no later layer.
- **D13 Test file and what it reads.** `scripts/examples-check-pack.test.mjs` runs the CLI on temp trees with `--root`, as PLT-20 does. The CLI reads the built-in packs of `packages/packs` (D3). The tests name the built-in tool `cold_open` (`packages/packs/nonfiction/tools/cold_open.yaml`: `minimum: 200` at line 29, `required` at line 45). The file matches `EXEMPT_TEST_FILE` (`m1.mjs` line 26). Its `before` hook builds the API when the library file is missing, as the `before` hook of `scripts/lint-packs.test.mjs` does.
- **D14 Commits.** Two commits on `unit/PLT-22`, not squashed. Commit 1: `feat(PLT-22): add the pack layer to the examples check (tool params, entity schemas, references)`, covering `pack.mjs`, `index.mjs`, `lib.mjs`, `pack-lint.ts`, `package.json` and the two earlier test files (D11), so that commit 1 is green. Commit 2: `test(PLT-22): cover the pack layer criteria and extras`, covering `scripts/examples-check-pack.test.mjs`.

## 2. Files to change

| Path | Change | Purpose |
|---|---|---|
| `scripts/examples-check/pack.mjs` | new | `check(ctx)` for D6 to D10 (criteria 1 to 3) |
| `scripts/examples-check/index.mjs` | edit | import `./pack.mjs` as `pack`; `LAYERS = [m1, graph, pack]` (line 16); the library and packs load in their own `try` after the contracts (D5); `ctx.packs` and `ctx.library` added; the exit 2 text; the comment on line 13 (D12) |
| `scripts/examples-check/lib.mjs` | edit | `requireBuilt(scriptRoot, relPath)` beside `requireContracts` (lines 11 to 16; D5) |
| `apps/api/src/modules/tool-registry/pack-lint.ts` | edit | `loadBuiltinPacks`, the interface `BuiltinPacks` and the two re-exports (D2); `lintPacks`, `formatFinding`, `PackFinding` unchanged |
| `package.json` | edit | line 27, `lint:examples` (D4) and nothing else |
| `scripts/examples-check.test.mjs` | edit (fixtures only) | `VALID`, C6 and E1 first case (D11) |
| `scripts/examples-check-graph.test.mjs` | edit (fixtures only) | `VALID` (D11) |
| `scripts/examples-check-pack.test.mjs` | new | criteria C1 to C5 and extras E1 to E5 (section 4) |

Must not change:
- `scripts/examples-check/m1.mjs` and `graph.mjs` (other plans cite their line numbers, for example `plans/AGL-08.md` lines 14 and 244).
- `scripts/lint-packs.mjs`, `scripts/lint-packs.test.mjs` and the rest of `apps/api/src/**`.
- `packages/packs/**` (read only), `packages/contracts/**`, `examples/**` (GNP-11 owns the sample), `.github/workflows/ci.yml`, `.gitignore`.
- `units/**`, `modules/**`, `plans/**` except `plans/PLT-22.md`, and `units/SAU-12-providers-step.md`.

## 3. Procedure

Each step runs in the worktree of `unit/PLT-22`, which the driver makes from `main` (`git worktree add <dir> -b unit/PLT-22 main`, as `plans/PLT-21.md` section 3 does). Record `node -v` and `npm -v` beside each result (`.nvmrc` line 1 is 26, CHECKED). Do not push, add a remote, or switch branches in the main checkout. Stage only the paths of section 2.

0. **Base.** `git branch --show-current` prints `unit/PLT-22`. `git status --short -- ':!plans'` prints nothing. `git ls-files examples | wc -l` prints 15 (CHECKED). `git diff --stat 38dcdce HEAD -- scripts apps/api/src/modules/tool-registry package.json examples packages/packs` prints nothing. If any of these differs, stop and report.
1. **Dependencies.** `npm ci` at the worktree root. Expected: exit 0, and `node_modules/@bbartolome/scriba-contracts` is present.
2. **Baseline build and tests.** `npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api`. Expected: exit 0, and `apps/api/dist/modules/tool-registry/pack-lint.js` exists. Then `node --test scripts/examples-check.test.mjs scripts/examples-check-graph.test.mjs`. Expected: all cases pass; record the counts. Stop and report if the build or the baseline fails.
3. **Red.** Write `scripts/examples-check-pack.test.mjs` (section 4). Run `node --test scripts/examples-check-pack.test.mjs`. Expected: each case fails on an exit code or a stderr line, because the CLI has no pack layer and invalid trees exit 0. Save the output.
4. **Fixtures.** Edit the two earlier test files as D11 says and change no assertion. Run both files again. Expected: the same counts as step 2.
5. **Library seam.** Edit `pack-lint.ts` (D2). Run `npm run build -w @bbartolome/scriba-api` and `npm run lint:packs`. Expected: both exit 0.
6. **Layer.** Write `requireBuilt` in `lib.mjs`, write `pack.mjs` (D6 to D10), and edit `index.mjs` (D5, D12).
7. **Green.** `node --test scripts/examples-check-pack.test.mjs`: expected all cases pass. Then `node --test scripts/examples-check.test.mjs scripts/examples-check-graph.test.mjs`: expected all pass. Save the output.
8. **Wire.** Edit `package.json` line 27 (D4). Run `npm run lint:examples`. Expected: exit 0, and the pass line of D12 with `1 sample(s), 1 project.yaml, 9 entity file(s)`.
9. **Repository gate (criterion 5).** The output of step 8 on the repository is the work pass of criterion 5. It is not a committed test (`units/README.md` line 138). If it reports an issue on `examples/`, stop and report. Do not weaken a rule.
10. **Format.** `npx prettier --write` on the new and changed `.mjs`, `.ts` and `package.json` files. Then `npx prettier --check .`: expected exit 0.
11. **Gates.** `npm run lint`, `npm test` and `npm run build`, each expected exit 0. `npm test` builds the API inside its workspace test before the `scripts/*.test.mjs` run (`package.json` line 25).
12. **Paths.** `git status --short -- ':!plans'` lists exactly the section 2 paths.
13. **Commits.** Commit 1 and commit 2 as D14, by path (`git commit -m … -- <paths>`), not squashed. `git log --oneline -2` shows both messages.
14. **Fresh clone.** `git clone --branch unit/PLT-22 <repository> <empty directory under /tmp>`, then `npm ci && npm run lint && npm test && npm run build` there. Expected: each exits 0.

Stop rules:
- Step 2 fails: the baseline is broken; stop.
- Step 5 fails: the TRG-07 gate is broken; stop.
- Step 9 reports an issue on `examples/`: stop and report.
- Step 7 or 11 fails in an earlier test file: the D11 fixtures are wrong. Fix the fixture, never the assertion.

## 4. Acceptance criteria and tests

All tests are in `scripts/examples-check-pack.test.mjs`. Each builds its tree with `mkdtemp` under `os.tmpdir()`, removes it in `finally`, and runs `spawnSync(process.execPath, [CLI, '--root', tree])`, where `CLI` is `scripts/examples-check/index.mjs`. The seam is the exit code and the stderr and stdout text. No test reads a path under the repository's `examples/`. The base tree `VALID` is the D11 version of the PLT-20 layout: a nonfiction sample with `project.yaml`, `samples.yaml`, `sources/outline.md` (front matter `title`, `citation`, `reliability`), `entities/style.md` (a complete `style-profile`), `drafts/cold-open.md` and `.gitignore`.

| Criterion (unit line) | Test name | What it asserts | Pass condition |
|---|---|---|---|
| 1 (line 26): every recipe tool node names a built-in tool, and its params validate against that tool's inputs | `C1: a recipe tool node naming a built-in tool with valid params passes; an unknown tool, and params that break its inputs, fail naming the file and the node` | A recipe `graphs/recipe.json` with one tool node `opening`, tool `cold_open`. (a) params `{"length": 800}`: exit 0. (b) tool `no_such_tool`: exit 1, a line starts `examples/nonfiction/graphs/recipe.json: ` and contains `node "opening": tool "no_such_tool" is not a built-in tool`. (c) params `{"length": 100}`: exit 1, a line contains `node "opening": length: expected at least 200`. (d) params `{"lenght": 800}`: exit 1, a line contains `node "opening": lenght: unknown field` | (a) passes; (b), (c) and (d) fail with those lines |
| 2 (line 27): entity front matter validates against pack entity-type schemas | `C2: entity front matter is checked against the pack's entity-type schema; a claim status outside its enum, a person without role and an unknown type each fail, naming the file` | (a) `VALID`: exit 0. (b) `entities/claim.md` (`type: claim`, `statement`, `evidence: [outline]`, `status: maybe`): exit 1, a line starts `examples/nonfiction/entities/claim.md: status: `. (c) `entities/ada.md` (`type: person`, `name`, `sources: [outline]`, no `role`): exit 1, a line is `examples/nonfiction/entities/ada.md: (root): missing required property "role"`. (d) `entities/odd.md` with `type: no-such-kind`: exit 1, a line is `examples/nonfiction/entities/odd.md: type: "no-such-kind" is not a built-in entity type` | (a) passes; (b) to (d) fail with those lines |
| 3 (line 28): an unresolved `[@id]` citation or reference field fails with the file path and the id | `C3: an unresolved [@id] citation or reference field fails with the file path and the id` | (a) `drafts/cold-open.md` = `Cited [@no-such-id].`: exit 1, a line starts `examples/nonfiction/drafts/cold-open.md: ` and contains `[@no-such-id] does not name an entity or source`. (b) `entities/claim.md` with `evidence: [no-such-source]`: exit 1, a line starts `examples/nonfiction/entities/claim.md: evidence: "no-such-source" does not name` | (a) and (b) fail with those lines |
| 4 (line 29): a deliberately broken sample file fails with the path and the schema issue | `C4: a deliberately broken sample file fails with its path and the schema issue, and the last line counts the issues` | `VALID` plus `entities/claim.md` with `status: maybe` and `evidence: [outline]`: exit 1; a line starts `examples/nonfiction/entities/claim.md: status: `; the last line is `examples check failed: 1 issue(s)` | Exit 1 and both lines. The CI substitute is open point 5 |
| 5 (line 30): the check passes on `examples/` with only the nonfiction skeleton, and keeps passing | `C5: a nonfiction-shaped sample with schema-valid entities, resolvable references and citations passes` | `VALID` plus `entities/claim.md` (`evidence: [outline]`, `status: supported`), `entities/ada.md` (`type: person`, `sources: [outline]`) and `drafts/cold-open.md` = `Cited [@outline; @ada].`: exit 0; stdout matches `/1 sample\(s\)/` | Exit 0. The repository run is step 9 |

Extra tests (decisions with no criterion of their own):

| Decision | Test name | What it asserts |
|---|---|---|
| D7 (kinds and links) | `E1: a reference names an entity or source of its sample, of the kind its field takes; links resolve too` | (a) `entities/claim.md` with `evidence: [ada]`, where `ada.md` is a person: exit 1, a line contains `evidence: "ada" is a person, but this field takes source`. (b) a claim with `links: [missing-note]`: exit 1, a line contains `links: "missing-note" does not name`. (c) `links: [outline]`: exit 0 |
| D7 (duplicates) | `E2: an id that two files define is reported where it is named, with both paths` | `entities/dup-one.md` and `entities/dup-two.md`, both `id: shared` with `type: concept`, `name`, `definition`; `entities/claim.md` with `links: [shared]`: exit 1; a line contains `links: "shared" names more than one file (examples/nonfiction/entities/dup-one.md, examples/nonfiction/entities/dup-two.md)` |
| D6 (no second report) | `E3: a file that PLT-20 already reports gets no second issue from the pack layer` | (a) `entities/broken.md` with an opening `---` and `type: concept` and no closing line: exit 1, exactly one stderr line starts with `examples/nonfiction/entities/broken.md: `. (b) `entities/notype.md` with front matter `name: X` and no `type`: exit 1, exactly one stderr line starts with `examples/nonfiction/entities/notype.md: ` |
| D9 (citations) | `E4: a [@id] in code is not a citation, and each id of a multi-citation is checked` | `drafts/code.md` = a fenced block holding `[@no-such]`, then `Inline \`[@also-no]\` and [@outline; @no-such-two].`: exit 1; exactly one stderr line starts with `examples/nonfiction/drafts/code.md: `, and it contains `[@no-such-two]` |
| D8 (ids from file names) | `E5: an entity id taken from a file name must match the id pattern` | `entities/Bad_Name.md` with `type: concept`, `name`, `definition`: exit 1; a line is `examples/nonfiction/entities/Bad_Name.md: entity id "Bad_Name" from the file name does not match ^[a-z0-9][a-z0-9-]*$` |

Criteria covered: 5 of 5, with 5 named tests (C1 to C5). Extra tests: 5 (E1 to E5). Total: 10.

## 5. Downstream and parallel agreement

- **GNP-11 (done; criterion 1 at unit line 23).** Its box is ticked when `npm run lint:examples` passes on a `main` that has this layer (`plans/GNP-11.md` lines 218 and 238). Step 8 is that run, and the D12 pass line is the one T1 expects (`plans/GNP-11.md` line 204). The five entity files and their references are checked by D6 and D7. Agrees.
- **GNP-12 (done; criterion 3 at unit line 19, `plans/GNP-12.md` line 127, decision (b)).** Its box is ticked on the same run. Agrees.
- **GRR-16 (not planned; `units/GRR-16-sample-recipe.md` line 26).** Its recipe passes the CI sample check for tool references and params, which D10 gives. Its output node's `path` is not checked (D10). Its `blocked_by` (line 7) quotes PLT-21 and PLT-22 in one entry (open point 8). Agrees.
- **PLT-21 (done).** `graph.mjs` is unchanged. The layer reuses `graphFiles` and `ctx.graphRunner`. The `LAYERS` line and the line 13 comment change as D12 says. PLT-21's test cases change only in their fixtures (D11). Agrees.
- **PLT-20 (done).** `m1.mjs` is unchanged, and the layer reuses `entityFiles` (`m1.mjs` line 59). PLT-20's test cases change only in their fixtures (D11). Agrees.
- **TRG-07 (done).** `pack-lint.ts` gains additive exports only. `lintPacks`, `formatFinding`, `PackFinding` and the `lint:packs` script (`package.json` line 28) are unchanged. `plans/TRG-07.md` section 6 expects this layer to build the API in `lint:examples` (D4). Agrees.
- **TRG-11 (done; `plans/TRG-11.md` line 135).** Its note hands the seam to this unit; D2 takes it. TRG-11 changes no file. Agrees.
- **GNP-01 open point 4, GNP-03, GNP-06, GNP-13 (`plans/GNP-01.md` line 133; `plans/GNP-03.md` line 158).** They need a per-kind validator from the library. D2 provides one through `entityValidatorOf`, which is option (b) of GNP-01's open point 4. Their tests reach validators in-process (`apps/api/test/packs/*.test.ts`) and are unchanged. Agrees.
- **AGL-11 (planned; `plans/AGL-11.md` line 81).** It changes only `apps/api/test/agent-loop-workhorses.test.ts` and lists `scripts/**` and `apps/api/src/**` as not changed. No file is shared. Its gate, root `npm run lint`, runs this layer, so its sample must stay valid. Agrees.
- **TRG-14 (planned) and TRG-16 (draft).** They change `apps/web` and the tool-registry routes; TRG-16 names no `apps/api/**` file (`plans/TRG-16.md` line 86). No file is shared. Agrees.
- **`modules/platform.md` line 23 and the unit's `blocked_by`.** They agree on GNP-11, TRG-11 and PLT-20. Agrees.

## 6. Open points

1. **Seam (D2).** The unit (line 18) names the pack-lint entry point, but it exports only `lintPacks`, `formatFinding` and `PackFinding`. D2 adds three additive exports to it. The alternative loads `packs.js`, `entity-types.js` and `validate.js` from `apps/api/dist` by path and changes no Tool registry file. Navigator to choose; this plan follows D2.
2. **Done units' fixtures (D11).** PLT-22 changes the fixtures, not the assertions, of PLT-20's and PLT-21's test files, which belong to done units. Criterion 2 cannot pass otherwise. Navigator to accept.
3. **Reference scope (D7).** `links` and the declared-kind check go beyond the unit's words ("reference fields", "resolves"). Navigator may narrow them to existence only.
4. **Unknown types and stem ids (D6, D8).** An unknown entity type fails, and a stem id outside the pattern fails. Both are plan choices.
5. **Criterion 4 and CI.** "Fails CI" cannot be shown here: there is no pull request and no GitHub Actions run. Substitute: the CLI exits 1 with the path and the issue (C4), and CI runs the same script through `npm run lint` (`ci.yml` line 27). Navigator to accept the substitute or name another.
6. **Criterion 5 wording.** "Only the nonfiction skeleton" is out of date: `examples/nonfiction/entities/` now holds five GNP-11 files (CHECKED: `git ls-files examples`). The repository run (step 9) checks those files. A reviser cannot change the criterion text. Navigator to decide.
7. **Build dependency.** After this unit, the three CLI test files need the API build. `npm run lint`, `npm run lint:examples` and root `npm test` build it first. A bare `node --test` of one file on a fresh checkout exits 2 with the build message (D5).
8. **Statements that disagree with the repository (not changed).** `modules/graph-runner.md` line 27 names PLT-21 only for GRR-16, while `units/GRR-16-sample-recipe.md` line 7 names PLT-21 and PLT-22 in one quoted entry, which the blocker notation in `units/README.md` does not cover. `modules/genre-packs.md` line 88 credits PLT-20 with entity-type checks that belong to PLT-22. Unit line 18 names an entry point that does not export the loader (open point 1).
9. **Real packs in tests.** C1 names the built-in tool `cold_open`, so a rename of that tool breaks C1. Accepted.

## 7. Facts checked

- Unit: `units/PLT-22-examples-check-pack-layer.md` lines 7 (`blocked_by` with GNP-11), 8 (`parallel_with`), 9 (`unblocks`), 14 (closes the phase with PLT-21), 16 to 23 (Decisions), 26 to 30 (criteria). No text records a change other than line 17.
- Module: `modules/platform.md` lines 23 (the PLT-22 blockers) and 57 (test seam). `units/README.md` line 138 (unit tests never read `examples/`).
- Statuses: `plans/PLT-20.md`, `plans/PLT-21.md` line 3 `done`; `plans/GNP-11.md` line 3 `done`; `plans/TRG-11.md` line 4 `done`; `plans/GNP-03.md` and `plans/GNP-06.md` line 4 `done`; `plans/TRG-07.md` line 3 `done`; `plans/GNP-12.md` line 3 `done`. Non-done plans: `plans/TRG-14.md` (planned), `plans/TRG-16.md` (draft), `plans/AGL-11.md` (planned). `plans/PLT-22.md` did not exist before this write.
- Checker code on `main`: `scripts/examples-check/index.mjs` line 13 (comment), line 16 (`LAYERS = [m1, graph]`), lines 36 to 46 (contracts load and exit 2 text), lines 49 to 57 (context), line 82 (the run guard comment). `scripts/examples-check/lib.mjs` lines 8 to 16 (`requireContracts`). `scripts/examples-check/m1.mjs` line 26 (`EXEMPT_TEST_FILE`), line 59 (`entityFiles`), with its comment at 57 and 58. `scripts/examples-check/graph.mjs` line 12 (`graphFiles`), line 18 (`check`), lines 70 to 82 (`checkStoryPaths`), lines 84 to 88 (`isExistingSampleFile`).
- Tests on `main`: `scripts/examples-check.test.mjs` `VALID` line 22, C6 at line 258, E1 at line 274 (first case, `sources/outline.md` at line 277). `scripts/examples-check-graph.test.mjs` `VALID` line 23, `sources/outline.md` at line 32, `entities/style.md` at line 33.
- Library and loader: `apps/api/src/modules/tool-registry/pack-lint.ts` lines 1 to 5 (imports), 11 (`PackFinding`), 17 (`lintPacks`), 81 (`formatFinding`). `entity-types.ts` lines 26 (`EntityTypeEntry`), 259 (`readEntityTypes`), 296 (`entityValidatorOf`). `packs.ts` lines 35 (`LoadedTool`), 47 (`ToolEntry`), 314 (`builtinFiles`), 341 (`readBuiltinTools`, throws `BootError` on a duplicate). `validate.ts` lines 24 (`CompiledTool`), 56 (`compileTool`), 84 (`validateArguments`), 93 (`params` mode), 101 (`compiled.params`), 133 (throws). `apps/api/src/modules/platform/errors/module-error.ts` (`details`).
- Contracts: `packages/contracts/src/project-store/constants.ts` lines 4 (`ENTITY_ID_PATTERN`), 6 to 8 (`CITATION_PATTERN`). `packages/contracts/src/project-store/entities.ts` lines 11 to 14 (`entityBaseSchema`, `links` at 14). `packages/contracts/src/project-store/index.ts` line 1 (`constants.js`). `packages/contracts/src/graph-runner/graph.ts` line 85 (`toolParamsSchema`), line 88 (`recipeNodeSchema`), lines 97 to 99 (tool node, `tool` required).
- Pack files: `packages/packs/core/entity-types/source.yaml` line 22 (`required`); `style-profile.yaml` line 21; `packages/packs/nonfiction/entity-types/claim.yaml` lines 16 and 17 (`x-scriba-type`, `x-scriba-entity-kinds`), line 24 (`required`); `person.yaml` lines 19 and 20, line 23; `packages/packs/nonfiction/tools/cold_open.yaml` line 29 (`minimum: 200`), line 45 (`required`). The built-in packs are `core`, `nonfiction` and an empty `fiction` (CHECKED `ls packages/packs/*`).
- Sample: `git ls-files examples` lists 15 paths: `samples.yaml`, `nonfiction/project.yaml`, `.gitignore`, three drafts, five entity files and four source files. No `[@` occurs under `examples/` (CHECKED `grep`).
- Plans and units cited: `plans/TRG-07.md` lines 68 to 74 (D9), 258 (PLT-22 note), 283 (downstream obligations). `plans/TRG-11.md` line 135. `plans/GNP-01.md` line 133. `plans/GNP-03.md` line 158. `plans/GNP-11.md` lines 204, 218, 238. `plans/GNP-12.md` line 127. `plans/PLT-20.md` lines 36 (D10), 39 (D13), 46 (D16). `plans/PLT-21.md` section 5 and section 6, point 5. `plans/DECISIONS.md` lines 2264 and 4481. `units/PST-08-entity-resolution.md` line 22. `units/CEX-07-entity-links-banned-phrases.md` line 15. `units/GRR-16-sample-recipe.md` lines 7 and 26. `units/GNP-11-nonfiction-sample-entities.md` line 23. `units/GNP-12-workhorses-gate.md` line 19. `plans/AGL-11.md` line 81. `plans/TRG-16.md` line 86. `modules/graph-runner.md` line 27. `modules/genre-packs.md` line 88.
- Build and CI: `package.json` lines 25 (`test`), 26 (`lint`), 27 (`lint:examples`), 28 (`lint:packs`). `.github/workflows/ci.yml` lines 25 (`npm ci`), 27 (`npm run lint`), 29 (`npm test`), 31 (`npm run build`). `apps/api/tsconfig.build.json` emits `src` to `dist` with `rootDir` `src`. `.gitignore` line 2 (`dist/`). `scripts/lint-packs.mjs` (`DEFAULT_ROOT` is `packages/packs`; `LIBRARY` is `apps/api/dist/modules/tool-registry/pack-lint.js`).
- Current build state: `apps/api/dist` does not exist; `packages/contracts/dist` exists; `node_modules` exists at the root (CHECKED `ls`).

## 8. Assumed facts (not run here; this planner runs no npm command)

- ASSUMED: `npm ci`, `npm run build -w @bbartolome/scriba-contracts` and `npm run build -w @bbartolome/scriba-api` succeed on `main`. TRG-07's `lint:packs` and CI's build step rely on the same build.
- ASSUMED: `pack-lint.js` and the modules it loads (`packs.js`, `entity-types.js`, `validate.js`) load in plain Node through `createRequire`, without starting the app. `plans/TRG-07.md` A4 left this unchecked, and `scripts/lint-packs.mjs` relies on it. Step 5 and step 8 check it.
- ASSUMED: `cold_open` has no lint error on `main`. GNP-12 criterion 1 and TRG-07 criterion 5 are ticked on `main` (CHECKED in `plans/GNP-12.md` and `plans/TRG-07.md`), which supports it.
- ASSUMED: the five entity files and four source files on `main` pass D6, D7 and D9. This is read from the files (CHECKED each front-matter block), not run. Step 8 checks it.
- ASSUMED: `ajv` 8.20.0 (`apps/api/package.json`) resolves from the built files, and `validateArguments` with `mode: 'params'` returns the messages in section 4 (the messages are read from `validate.ts` lines 139 to 200 (`issueOf` at 139, `messageOf` at 168) and not run).
- ASSUMED: each CLI run takes under five seconds after the build, as PLT-20 assumed.
