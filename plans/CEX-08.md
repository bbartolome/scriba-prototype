---
id: CEX-08
status: draft
unit: units/CEX-08-nonfiction-sample-order.md
module: compile-export
---
# CEX-08 plan — nonfiction sample: order field and export settings

Draft, planned by the planner against main `350d296` (`git rev-parse --short HEAD`; `git status --short` was empty at the start). Section 2a lists the facts checked, with file and line. Section 2b lists the facts assumed and not run. The plan changes one file, `examples/nonfiction/project.yaml`, and no code, test, unit or module file.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, DECISIONS or the code

- **What the change is.** Add an `order` field and an `export` block to `examples/nonfiction/project.yaml`. The order differs from alphabetical and has mixed statuses. The export block holds an author and a dedication. The bibliography stays at its default `all`. The existing comment and the three existing keys stay. Source: `units/CEX-08-nonfiction-sample-order.md` lines 15 and 16.
- **Four chapters, no third draft to add.** The sample has two to four drafts. The milestone demo needs four chapters: the three skeleton drafts plus AGL-19's grounding draft. Source: unit line 17; `plans/DECISIONS.md` lines 3058 to 3062 (the Navigator's option B). On main all four drafts are present (F5), so the unit's condition "add the third draft" does not apply.
- **No front or back matter file, no `snapshots/`.** Source: unit line 17. The folders `.scriba/`, `logs/` and `drafts/.versions/` are excluded by the gate (`scripts/examples-check/m1.mjs` line 19).
- **Mock scenario paths do not change.** Source: unit line 18.
- **Criterion 2 is tested in CEX-09, on a temp copy.** Source: unit line 22; `units/CEX-09-assembly-preflight-gate.md` line 24, which asserts the same thing.
- **Criterion 1 is the Platform examples check.** Source: unit line 21; `units/CEX-01-contract-slice.md` line 32; the gate is `npm run lint:examples` (`package.json` line 27), which runs `scripts/examples-check/index.mjs`.
- **Shape of the two keys.** An order entry has a `path` under `drafts/`, an optional `status` (`outline`, `draft`, `revised` or `final`) and an optional `part`. The export block is loose, with every key optional. Defaults are applied at read time and never written back. Source: `units/CEX-01-contract-slice.md` lines 18 and 19; the code in `packages/contracts/src/project-store/order-export.ts` lines 6 to 12, 21 to 22, 26 to 30 and 37 to 49.
- **Status and part live on order entries; every order write materialises the full order; graph-ordered files form a leading block.** Source: `modules/compile-export.md` lines 47, 49 and 50. This sample has no story-graph `order` edge, so the leading block is empty (F8).
- **Membership is the top-level `.md` files of `drafts/`.** Source: `modules/compile-export.md` lines 43 and 52.
- **Front matter, title page and dedication come from export settings.** Source: `modules/compile-export.md` line 51.
- **Unit tests never read `examples/`.** Source: `units/README.md` line 139; `modules/compile-export.md` line 59.
- **Prettier covers `examples/`.** Source: `package.json` line 26 (`prettier --check .`); `.prettierignore` (F10) does not list `examples/`.
- **Blocker pair.** `units/CEX-01-contract-slice.md` line 9 and `units/PST-11-nonfiction-sample-skeleton.md` line 9 both name CEX-08 in `unblocks`. `plans/CEX-01.md` line 3 and `plans/PST-11.md` line 3 are `status: done`.
- **Plan layout.** Sections 1 to 9 in the order of `plans/PLT-02.md` and `plans/CEX-01.md`. The commit command is given by the orchestrator.

### 1b. Choices this plan makes (the simplest the sources allow)

- **D1 The order.** Four entries in the authored chapter order: `drafts/born-to-it.md`, `drafts/what-counts-as-practice.md`, `drafts/the-ten-thousand-hour-idea.md`, `drafts/the-plateau-is-not-the-end.md`. Their first lines are `# Chapter 1` to `# Chapter 4` (F5), and the outline's `Draft:` lines name the same files (F6). In alphabetical order the four are chapters 1, 4, 3 and 2, so the authored list differs in positions 2 to 4.
- **D2 Statuses.** `final` for chapter 1, `revised` for chapter 2, `draft` for chapter 3 (the outline says it still needs its cold open, F6) and `draft` for chapter 4 (AGL-19's grounding draft). The unit gives `final`, `revised` and `draft` as examples (unit line 15).
- **D3 No `part` key and no `bibliography` key.** Every entry is body, the default. The bibliography key is left out so that the pack default `all` applies (`packages/contracts/src/compile-export/constants.ts` lines 51 and 52; unit line 16).
- **D4 Author and dedication text.** `author: Sample Author`, a fictional name, so that no real person's name ships in a sample file. Dedication: one plain sentence, `For everyone who is still in the middle of learning something.` It has no colon, no `#` and no placeholder word, so it is a valid plain scalar. The unit asks for both and gives no text (open point 3).
- **D5 Nothing else in the export block.** No `lang`, `subtitle`, `rights`, `contact`, `penName`, template key, `styleProfile` or `model`. The unit names only the author and the dedication. GNP-11's decision keeps the sample without a `styleProfile` (`plans/DECISIONS.md` line 5075; `plans/CEX-07.md` line 186).
- **D6 Layout.** Block style with two-space indentation: the `order` block, then the `export` block, both after the `genrePack` line. Prettier's output is kept (step 3).
- **D7 No committed test in this PR.** Criterion 1 keeps the existing gate. Criterion 2's committed test is CEX-09's (section 5). A test that reads `examples/` breaks `units/README.md` line 139, and a committed assertion on the sample's content would go stale when the sample changes. This is the same reasoning as `plans/PST-11.md` D11.
- **D8 Worktree and commit.** Branch `unit/CEX-08` from `main`, in the worktree `/Users/bbartolome/workspace/scriba-prototype-wt/CEX-08`, which follows the layout of the existing worktrees (F17). One commit, `feat(CEX-08): add the nonfiction sample's order and export settings`, not pushed.

## 2. Facts checked and facts assumed

### 2a. Checked by the planner (read, grep, ls and git; nothing built, installed or run)

- **F1 The unit and its history.** `units/CEX-08-nonfiction-sample-order.md`: front matter lines 2 to 9 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Decisions lines 15 to 18; criteria lines 21 and 22. Its last change is commit `a04bb65` (the four-chapter count). A grep of `units/`, `modules/` and `plans/` for "Moved to", "Loosened by", "Reworded by" and "Removed by revision" finds no note on CEX-08, CEX-09, CEX-17, CEX-20 or `modules/compile-export.md`. The notes in `units/` sit on PST-07, PST-08, PST-10, AGL-13 and GRR-07 only. So no note changes this unit.
- **F2 The module.** `modules/compile-export.md` line 7 (ordering), line 19 (CEX-08 in the graph), line 33 (CEX-08 in parallel after CEX-01), line 43 (membership), lines 47 to 52 (settled decisions), line 59 (unit tests never read `examples/`), line 78 (renaming a draft drops its order entry).
- **F3 The blockers, on main.** CEX-01's narrowing is in `packages/contracts/src/project-store/project.ts`: line 7 imports `exportSettingsSchema` and `orderEntrySchema`; line 20 is the comment; line 26 is `export: exportSettingsSchema.optional()`; line 28 is `order: z.array(orderEntrySchema).optional()`. `packages/contracts/src/project-store/order-export.ts`: lines 6 to 12 (statuses), 21 to 22 (`MANUSCRIPT_PATH_PATTERN`), 26 to 30 (`orderEntrySchema`, loose), 37 to 49 (`exportSettingsSchema`, loose; `dedication` line 44; `bibliography` line 45).
- **F4 The sample on main.** `examples/nonfiction/project.yaml` has four lines: a comment line, `schemaVersion: 1`, `title: The Long Apprenticeship` and `genrePack: nonfiction`. It has no `order` and no `export`. `examples/samples.yaml` has one entry, `nonfiction`. `find examples -type f` lists 17 files: `.gitignore`; four drafts; five entity files under `entities/`; four source files under `sources/`; `graphs/chapter-opening.json`; `project.yaml`; `samples.yaml`. There is no `snapshots/`, `logs/`, `.scriba/`, `drafts/.versions/`, front-matter file or back-matter file.
- **F5 The drafts.** Four top-level files: `born-to-it.md` (chapter 1, 305 words by `wc -w`), `what-counts-as-practice.md` (chapter 2, 298), `the-ten-thousand-hour-idea.md` (chapter 3, 260) and `the-plateau-is-not-the-end.md` (chapter 4, 255; AGL-19's draft). Each starts with `# Chapter N:` on line 1 and has no front matter. `grep -c '\[@'` is 0 for each. `plans/AGL-19.md` is `status: done`.
- **F6 The outline.** `examples/nonfiction/sources/outline.md` lines 1 to 5 are front matter: `type: source`, a title, and `citation: The author's working outline for this book` on line 4. It has six `### Chapter N:` headings, each followed by a `Draft:` line. Chapters 1 to 4 name the four drafts of F5. Chapters 5 and 6 say `Draft: not started.`. Chapter 3 says its draft "still needs its cold open".
- **F7 The sources and entities.** `sources/deliberate-practice-notes.md` and `sources/ten-thousand-hours-notes.md` carry the same `citation` text on line 4 (K. Anders Ericsson, Ralf Krampe and Clemens Tesch-Römer, 1993, Psychological Review). `sources/learning-plateaus-notes.md` line 4 cites Bryan and Harter. The four sources have `type: source`. The five files under `entities/` have types `style-profile`, `concept`, `claim`, `person` and `claim`. In total there are nine entity files (`find examples/nonfiction/sources examples/nonfiction/entities -name '*.md' | wc -l` prints 9).
- **F8 The graph.** `examples/nonfiction/graphs/chapter-opening.json`: its edges are `{id, from, to}` with no `relation` field, so none is an `order` edge (module line 47 gives the leading block only for `order` edges). Its output node, line 59, names `drafts/chapter-opening.md`, which is not on main.
- **F9 The gate.** `scripts/examples-check/m1.mjs` lines 137 to 168 parse every `project.yaml` at any depth and pass it to `projectYamlSchema.safeParse`. This schema check is the only check of `order` and `export`: m1 does not compare an order path with the files. `scripts/examples-check/index.mjs` line 16 gives the usage `[--root <dir>]`, and line 88 prints the pass line `examples check passed: N sample(s), N project.yaml, N entity file(s), N test file(s) scanned`. `scripts/examples-check.test.mjs` works on temp trees; its one mention of the real `examples` path is a string inside a fixture (line 224).
- **F10 The lint scripts and Prettier.** `package.json` line 25 (`test` runs the workspaces and `node --test 'scripts/*.test.mjs'`), line 26 (`lint` runs the workspace lints, `lint:examples`, `lint:packs` and `prettier --check .`), line 27 (`lint:examples` builds contracts and api, then runs `scripts/examples-check/index.mjs`). `.prettierignore` lines 1 to 5 list `/units/`, `/modules/`, `/plans/`, `/package-lock.json` and `/apps/api/test/fixtures/lint/`. `examples/` is not listed.
- **F11 Start from sample keeps the keys.** `apps/api/src/modules/project-store/samples.service.ts`: `start()` at line 80; `readYamlState(text)` at line 86, which refuses an invalid sample with `PROJECT_INVALID` ("The sample's project.yaml is not valid."); `parseDocument(text)` at line 104 and `doc.set('title', …)` at line 105, which keep every other key; `copyTree` at line 147 copies every file except `project.yaml`, which is written from `doc`, and the excluded paths (`EXCLUDED_PATHS`, line 37). `apps/api/src/modules/project-store/project-yaml.ts` line 39 is `projectYamlSchema.safeParse(value)`. So an `order` or `export` that fails the narrowed schema makes the sample refuse to start.
- **F12 The manuscript view reads the order.** `apps/api/src/modules/compile-export/manuscript.service.ts`: the order is parsed with `z.array(orderEntrySchema).safeParse` at lines 189 to 208 (line 204); `members()` at lines 212 to 224 lists the top-level `.md` files of `drafts/`, sorted; `fieldOf` at lines 154 to 173 keeps the first occurrence of a path that is a member and reports any other entry as `staleEntry`. `apps/api/src/modules/compile-export/effective-order.ts`: the body is the order-field order followed by the unlisted files in path order (lines 111 to 115); `orderSource` is `project` when the field is non-empty and no graph block exists (lines 134 to 139). The GET route is `manuscript.controller.ts` line 28.
- **F13 The export settings are read.** `apps/api/src/modules/compile-export/assembly.service.ts`: `project.export` is read at line 65; `author` comes from the settings with a fallback to `prefs.authorName` (line 96); the dedication is read at lines 109 and 110; the bibliography mode is at lines 139 to 150 (the export value, then the pack default, then `off`); `bibliographyEntries` at lines 164 to 186 lists every entity of type `source`, with text `citation ?? title ?? id`, and does not dedupe. `apps/api/src/modules/compile-export/assembly.ts` lines 63 to 71 (`renderBibliography` sorts, does not dedupe) and lines 86 to 88 (the dedication is wrapped in `.unnumbered .unlisted`). `packages/contracts/src/compile-export/constants.ts` line 51 (`BIBLIOGRAPHY_DEFAULT = 'off'`) and line 52 (`BIBLIOGRAPHY_DEFAULT_BY_PACK = { nonfiction: 'all' }`).
- **F14 No committed test reads the real `examples/`.** Each committed test that names `SCRIBA_EXAMPLES_DIR` points it at a temp folder: `apps/api/test/create-test-app.ts` line 82 (`join(library, 'examples')`); `apps/api/test/env-boot.test.ts` line 17 and `setup-auth-guard.test.ts` line 570 and `setup-auth-dev-mode.test.ts` line 237 (folders made by `mkdtempSync` or `tempLibrary()` at lines 10, 563 and 228); `apps/api/test/project-store-samples.kit.ts` line 116 (fixture samples); `apps/api/test/graph-runner-sample-recipe.test.ts` lines 60 to 95 (copies a fixture into a temp folder). The e2e points at the real `examples/` (`e2e/harness/global-setup.ts` line 81). The journey e2e reads `project.yaml` and asserts only the title line (`e2e/specs/journey.e2e.ts` lines 147 to 149).
- **F15 Sample paths used by the mock and the e2e.** `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` line 17 (`sources/outline.md`); `edit-chapter-one.json` line 24 (`drafts/born-to-it.md`); `grounding-claims.json` line 23 (`sources/learning-plateaus-notes.md`); `e2e/specs/verdicts-sample.e2e.ts` line 11 (`drafts/the-plateau-is-not-the-end.md`).
- **F16 Downstream units.** `units/CEX-09-assembly-preflight-gate.md` line 7 (`blocked_by` names CEX-08) and line 24 (criterion: the sample started from "start from sample" returns its authored, non-alphabetical order with its statuses). `units/CEX-20-milestone-gate.md` line 7 (`blocked_by` names CEX-08), line 22 (the done-when: a four-chapter sample) and lines 25 and 26 (demo steps 1 and 2: four chapters in the `project.yaml` order; drag chapter 3 above chapter 2; set chapter 2 to `final`). `units/CEX-17-manuscript-route-outline.md`: no line names the sample, the nonfiction pack or `examples/` (a grep for "sample", "nonfiction" and "examples" finds nothing); its line 8 has `parallel_with` naming CEX-08. `units/CEX-02-effective-order-view-model.md` line 8 has `parallel_with` naming CEX-08.
- **F17 Git state.** `git worktree list` shows the main checkout at `350d296` on `main`, and worktrees under `/Users/bbartolome/workspace/scriba-prototype-wt/` for CEX-03, CEX-04, CEX-06, GRR-11, GRR-13, GRR-15 and TRG-14. There is no `unit/CEX-08` branch and no CEX-08 worktree.
- **F18 Plans in draft or planned.** `grep '^status:'` over `plans/` finds three: `plans/CEX-06.md` (planned), `plans/CEX-07.md` (draft) and `plans/GRR-15.md` (planned). Their file tables are at `plans/CEX-06.md` lines 95 to 101, `plans/CEX-07.md` lines 90 to 96 and `plans/GRR-15.md` lines 88 to 94. `plans/CEX-07.md` line 186 says the sample names no `styleProfile`. `plans/CEX-04.md` line 176 settles that the outline is listed under the default `all`, and says CEX-08 may set `cited` instead; line 162 says CEX-08 adds the author and dedication.
- **F19 DECISIONS entries.** Lines 3058 to 3062 are the only entry that sets a CEX-08 rule (four chapters; two to four drafts). Line 3097 is the hand-off to AGL-19's fourth draft, which is now on main. Line 5075 (GNP-11) keeps the sample without a `styleProfile`.
- **F20 Blocker inverse.** `units/CEX-08` has `unblocks: [CEX-09, CEX-20]`. Both name CEX-08 in `blocked_by` (`units/CEX-09-assembly-preflight-gate.md` line 7; `units/CEX-20-milestone-gate.md` line 7). `parallel_with` is symmetric: CEX-02 and CEX-17 name CEX-08 (lines 8 of each), and CEX-08 names both (line 8).

### 2b. Assumed (not run here)

- **A1.** `npm ci` and `npm run lint:examples` pass on `350d296`. Not run: the planner builds and installs nothing, and these commands write `node_modules/` and `packages/contracts/dist/`.
- **A2.** Prettier 3 keeps the YAML of step 3 as written. Step 3 checks this.
- **A3.** The gate prints 9 entity files, as F7 counts. The test-file count is whatever `index.mjs` prints; the implementer records it in step 2.
- **A4.** The plain-Node schema check of step 5(b) runs from the repository root, and `require("yaml")` resolves there (the same assumption as `plans/PST-11.md` section 7b).
- **A5.** The throwaway test of step 7 runs under the Vitest setup of `apps/api`, and the helpers `startFromSample` (`apps/api/test/project-store-samples.kit.ts` line 135) and `getManuscript` and `manuscriptOf` (`apps/api/test/compile-export-manuscript.kit.ts`, lines 60 to 90) work as their names say.
- **A6.** The browser e2e is not run; it is optional in step 9.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `examples/nonfiction/project.yaml` | edit | add the `order` block (four entries, D1 and D2) and the `export` block (author and dedication, D4); the comment and the three existing keys do not change (unit line 15) |
| `plans/CEX-08.md` | this plan | committed by the planner, not by the implementer |

Not changed: every other path, `examples/samples.yaml`, the four drafts, the sources, the entities, the graph, every file under `units/`, `modules/` and `plans/` (except this plan), `plans/DECISIONS.md`, all code, all tests and all e2e fixtures. No file is added and no test file is committed.

## 4. Method

Run in the worktree `/Users/bbartolome/workspace/scriba-prototype-wt/CEX-08` on branch `unit/CEX-08`, created from `main` by the driver with `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/CEX-08 -b unit/CEX-08 main`. Do not switch branches in the main checkout. Run `npm ci` in the worktree before step 1, because a new worktree has no `node_modules/`. Record `node -v` (expect `v26.x`) and `npm -v` beside each result. Do not push, do not add a remote and do not run `git add -A`. A temporary directory (`$T`, `$T2`) is created and used within one command line.

0. **Base.** `git branch --show-current` prints `unit/CEX-08`. `git rev-parse --short HEAD` prints `350d296`, or a later `main` commit. `git diff --stat 350d296 HEAD -- examples packages apps scripts e2e` prints nothing, so no file this plan relies on has changed. `git status --short` prints nothing. `find examples -type f | wc -l` prints `17`. `cat examples/nonfiction/project.yaml` shows the four lines of F4. If any differs, stop and report, because another unit has changed the sample: re-read sections 2a and 6.
1. **Dependencies.** `npm ci` from the worktree root. Expected: exit 0.
2. **Red baseline.** (a) `grep -cE '^(order|export):' examples/nonfiction/project.yaml` prints `0`. (b) `npm run lint:examples` exits 0 and prints `examples check passed: 1 sample(s), 1 project.yaml, 9 entity file(s), <M> test file(s) scanned`. Record `<M>`. The gate passes before the change, so the red state is (a); step 5 and the negative controls of step 6 carry the criterion.
3. **Edit the sample.** After the `genrePack: nonfiction` line of `examples/nonfiction/project.yaml`, insert exactly this text, and change nothing else:

   ```yaml
   order:
     - path: drafts/born-to-it.md
       status: final
     - path: drafts/what-counts-as-practice.md
       status: revised
     - path: drafts/the-ten-thousand-hour-idea.md
       status: draft
     - path: drafts/the-plateau-is-not-the-end.md
       status: draft
   export:
     author: Sample Author
     dedication: For everyone who is still in the middle of learning something.
   ```

   Then run `npx prettier --write examples/nonfiction/project.yaml` and `npx prettier --check examples`. Expected from the second: `All matched files use Prettier code style!`. If Prettier changes any value, and not only indentation or spacing, stop and report.
4. **Additions only.** `git diff -- examples/nonfiction/project.yaml` contains no line that starts with `-` (other than the file header `---`), so the comment and the three keys are unchanged (X8).
5. **Criterion 1.** (a) `npm run lint:examples` exits 0 and prints the step-2 line with the same counts and the same `<M>`, because no file is added. (b) After step 5(a) has built the contracts, run from the repository root:

   ```sh
   node -e 'const {createRequire}=require("node:module");const fs=require("node:fs");const {parse}=require("yaml");const c=createRequire(process.cwd()+"/apps/api/package.json")("@bbartolome/scriba-contracts/project-store");const p=parse(fs.readFileSync("examples/nonfiction/project.yaml","utf8"));const r=c.projectYamlSchema.safeParse(p);console.log(JSON.stringify({ok:r.success,order:p.order,export:p.export,issues:r.success?[]:r.error.issues}))'
   ```

   Expected: `"ok":true`, the four entries of step 3, the `export` object of step 3, and `"issues":[]`.
6. **Negative controls (the gate is armed on this tree).** Each runs on a temporary copy, never on `examples/` itself.
   - (a) `T=$(mktemp -d) && cp -R examples "$T/examples" && sed -i.bak 's/status: final/status: published/' "$T/examples/nonfiction/project.yaml" && node scripts/examples-check/index.mjs --root "$T"; echo "exit $?"; rm -rf "$T"`. Expected: `exit 1`, and a stderr line that names `examples/nonfiction/project.yaml`.
   - (b) `T=$(mktemp -d) && cp -R examples "$T/examples" && sed -i.bak 's#- path: drafts/born-to-it.md#- path: notes/born-to-it.md#' "$T/examples/nonfiction/project.yaml" && node scripts/examples-check/index.mjs --root "$T"; echo "exit $?"; rm -rf "$T"`. Expected: `exit 1`.
7. **Criterion 2 evidence (a throwaway, not committed).** The committed test belongs to CEX-09 (section 5, open point 1). The implementer runs the same assertions once, to record evidence:
   - (a) `T=$(mktemp -d) && cp -R examples "$T/examples"`. The throwaway reads only this copy, through `SCRIBA_EXAMPLES_DIR`.
   - (b) Write `apps/api/test/tmp-cex08-sample-order.test.ts`. It reads the copy's folder from the environment variable `CEX08_SAMPLES`. It boots `createTestApp` on a temporary library with `env: { SCRIBA_EXAMPLES_DIR: samples }`, using the pattern of `apps/api/test/graph-runner-sample-recipe.test.ts` lines 60 to 95. It calls `startFromSample` with `{sampleId: 'nonfiction', folderName: 'cex08', title: 'CEX08'}`, then `getManuscript` and `manuscriptOf`. It asserts the values of C2 in section 5.
   - (c) `cd apps/api && CEX08_SAMPLES="$T/examples" npx vitest run test/tmp-cex08-sample-order.test.ts`. Expected: pass.
   - (d) Negative control, on a second copy: `T2=$(mktemp -d) && cp -R examples "$T2/examples" && sed -i.bak '/^order:/,/^export:/{/^export:/!d}' "$T2/examples/nonfiction/project.yaml"` removes the order block, so the view falls back to alphabetical. Run the same test with `CEX08_SAMPLES="$T2/examples"`. Expected: the order assertion fails.
   - (e) `rm -rf "$T" "$T2"`, and delete `apps/api/test/tmp-cex08-sample-order.test.ts`. The file must not exist at step 8.
8. **Extra checks (X1 to X7), each recorded.**
   - X1: `find examples -type f | wc -l` prints `17`.
   - X2: every order path names a file: `grep '^  - path: ' examples/nonfiction/project.yaml | sed 's/^  - path: //' | while read -r p; do test -f "examples/nonfiction/$p" || echo "MISSING $p"; done` prints nothing.
   - X3: the order names exactly the drafts: `diff <(grep '^  - path: ' examples/nonfiction/project.yaml | sed 's/^  - path: //' | sort) <(ls examples/nonfiction/drafts/*.md | sed 's#^examples/nonfiction/##' | sort)` prints nothing.
   - X4: the order is not alphabetical: `diff <(grep '^  - path: ' examples/nonfiction/project.yaml) <(grep '^  - path: ' examples/nonfiction/project.yaml | sort)` prints lines.
   - X5: `git status --short -uall` lists exactly ` M examples/nonfiction/project.yaml`.
   - X6: `find examples \( -name .scriba -o -name logs -o -name snapshots -o -name .versions -o -name '*matter*' \) -print` prints nothing.
   - X7: `wc -w examples/nonfiction/drafts/*.md` prints the counts of F5 (305, 298, 260 and 255).
9. **Regression.** `npm run lint` exits 0 (the workspace lints, `lint:examples`, `lint:packs` and `prettier --check .`). `npm test` exits 0. Neither reads the real `examples/` except the gate inside lint (F14). The browser e2e is optional (A6); if it runs, its journey step reads only the title line (`e2e/specs/journey.e2e.ts` lines 147 to 149).
10. **Scope and commit.** Confirm that the throwaway file of step 7 is gone. `git status --short -uall` lists exactly ` M examples/nonfiction/project.yaml`. Stage that path only (`git add examples/nonfiction/project.yaml`) and commit on `unit/CEX-08` with `feat(CEX-08): add the nonfiction sample's order and export settings`. Do not push. The implementer records each command and its output. The implementer ticks no criterion: the orchestrator ticks criterion 1 from the record, and criterion 2 when CEX-09's test passes on main (open point 1).

## 5. Acceptance criteria and tests

The unit has two criteria (unit lines 21 and 22). Each has one test. Neither criterion is weakened.

### C1 (unit line 21: the Platform examples check passes with the order field and export settings)

- **Test.** `npm run lint:examples` (step 5(a)). This is the existing gate, `scripts/examples-check/index.mjs`, which runs `checkExamplesTree` in `m1.mjs` (lines 137 to 168). Seam: the files on disk.
- **What it asserts.** Every `project.yaml` under `examples/` parses and passes `projectYamlSchema`, which is narrowed by CEX-01. So each `order` entry has a `drafts/` path (the pattern of `order-export.ts` lines 21 and 22) and a status from the four names; each `export` key has its type; a `bibliography` value, if present, is one of `off`, `all` or `cited`.
- **Supporting checks.** Step 5(b) (the same schema in plain Node) and step 6 (a status outside the enum and a path outside `drafts/`, each refused with exit 1).
- **Pass condition.** Exit 0 and the pass line of step 2 with the same counts and the same `<M>`; step 5(b) prints `"ok":true` and `"issues":[]`; both controls of step 6 exit 1.

### C2 (unit line 22: the sample, started from "start from sample", returns its authored non-alphabetical order with its statuses)

- **Test.** Owned by CEX-09 (unit line 22; `units/CEX-09-assembly-preflight-gate.md` line 24). Its file is named by CEX-09's plan, which does not exist yet. This plan commits none (D7). Its assertions are fixed here so that CEX-08 and CEX-09 agree:
  - Seam: a temporary copy of `examples/`, with `SCRIBA_EXAMPLES_DIR` set to it; `createTestApp` on a temporary library; `POST` start from sample for `nonfiction`; `GET` of the manuscript route.
  - The `path` of each entry, in order: `drafts/born-to-it.md`, `drafts/what-counts-as-practice.md`, `drafts/the-ten-thousand-hour-idea.md`, `drafts/the-plateau-is-not-the-end.md`.
  - The `status` of each entry, in the same order: `final`, `revised`, `draft`, `draft`.
  - `orderSource` is `project`; every entry has `inOrderField: true` and `graphOrdered: false`; `warnings` is empty.
  - The list of paths is not equal to its sorted form.
- **Evidence in this PR.** Step 7: a throwaway run of these assertions on a temporary copy, with the negative control of step 7(d), which must fail. It is not committed.

## 6. Agreement with downstream units and later phases

- **CEX-09 (blocked by CEX-08; criterion 4).** Asserts the same order and statuses (section 5, C2). Agrees. Its `parallel_with` (CEX-16, CEX-17) is not touched.
- **CEX-20 (blocked by CEX-08; done-when and demo steps 1 and 2).** Four chapters in the `project.yaml` order, with statuses (D1 and D2). Demo step 2 (drag chapter 3 above chapter 2; set chapter 2 to `final`) writes the full order through CEX-03, which is done (`apps/api/src/modules/compile-export/order-write.ts`). Agrees, except for the recipe output (open point 5).
- **CEX-17 (`parallel_with` CEX-08).** Its unit names no sample content (F16). It is built on the Shell's fakes and refetches on `manuscript-updated`. It reads nothing from the sample, so no agreement is needed, and this plan does not change anything it uses.
- **CEX-02 and CEX-03 (done).** The view parses the order field with `orderEntrySchema` (F12). All four entries are valid, and each has a status, so the defaults of D2 are not needed for them. Agrees.
- **CEX-04 (done).** Reads `export.author` and `export.dedication` (F13) and the pack default `all` for nonfiction. Agrees. The outline and the duplicate citation appear in the bibliography (open point 2). `plans/CEX-04.md` line 176 settles that the outline is listed under `all`.
- **CEX-06 (planned) and CEX-07 (draft).** Both read the sample's `project.yaml`: CEX-06 for the order (stale entries), CEX-07 for `styleProfile`. The four entries name existing files, so the sample gets no stale-entry warning. The sample names no `styleProfile`, so the banned-phrases check is an info pass (`plans/CEX-07.md` line 186). Agrees.
- **CEX-10, CEX-11, CEX-12, CEX-13, CEX-14, CEX-15, CEX-16, CEX-18 and CEX-19 (later).** They use the same `export` keys (author, dedication and the bibliography default) and the same order. No new name is needed. CEX-14 later writes the `export` key, and `exportSettingsSchema` is loose, so it keeps every key this plan writes (`order-export.ts` lines 37 to 49).
- **PST-05, PST-12, AGL-08, AGL-19, GNP-11 and GRR-16 (done).** Their sample paths do not change (F15). The journey e2e reads only the title (F14). Agrees.
- **Known cost (`modules/compile-export.md` line 78).** A later rename of a draft drops its order entry. The four names in this `project.yaml` are the file names, so a rename must update the file in the same change. This is for the sample's later editors.

## 7. Other plans on the same files

No draft or planned plan changes `examples/nonfiction/project.yaml`, and none of the three names an `examples/` path in its file table (F18). For each:

- **CEX-06 (`plans/CEX-06.md`, planned; file table lines 95 to 101).** It adds `preflight-claims-orphans.ts`, edits `preflight-checks.ts`, `preflight.service.ts` and `manuscript.service.ts` (`storyGraphs` exported), and changes two test files: `compile-export-claims-orphans.test.ts` (new) and `compile-export-preflight.test.ts` (lines 70 to 76 and 119 to 121). Its tests build temporary trees, so they never read the sample. CEX-08 changes only the sample file. Neither change reads the other's output, so the two are correct in either order: with CEX-08 first, the sample's four entries are valid and not stale, and CEX-06's temporary fixtures are unaffected; with CEX-06 first, CEX-08's change to the sample is not seen by CEX-06's tests.
- **CEX-07 (`plans/CEX-07.md`, draft; file table lines 90 to 96).** It edits `markdown-text.ts`, `preflight-checks.ts` and `preflight.service.ts`, adds `preflight-links-phrases.ts` and a test file, and changes `compile-export-preflight.test.ts` (lines 70 to 76 and 119 to 121). Its banned-phrases check reads `styleProfile`, which the sample does not set (`plans/CEX-07.md` line 186). CEX-08 adds no `styleProfile` (D5). In either order the sample's banned-phrases result is an info pass.
- **GRR-15 (`plans/GRR-15.md`, planned; file table lines 88 to 94).** It changes the web canvas styles and specs and the graph-runner e2e files. It reads the sample's graph only as a size fixture (its line 66). Its file table names no `examples/` path, and it does not read `project.yaml`. In either order the two changes are independent.

Note for the orchestrator (not this plan's change): CEX-06 and CEX-07 both edit the same lines (70 to 76 and 119 to 121) of `apps/api/test/compile-export-preflight.test.ts`. Their order needs sequencing.

## 8. Open points

1. **Criterion 2 is tested by CEX-09, which this unit blocks.** The unit names CEX-09 as the test (unit line 22; CEX-09 line 24), and CEX-09 is blocked by CEX-08 (CEX-09 line 7). So this PR cannot carry a committed test for criterion 2; its evidence is the throwaway run of step 7. The unit can be planned as written. Recommendation: tick criterion 2 when CEX-09's test passes on main, not at this PR's merge. The unit file is not changed. Decision: the orchestrator.
2. **The sample's bibliography lists the outline and one citation twice.** The default `all` lists every source with a citation (F13). The outline has a citation (`sources/outline.md` line 4). The two Ericsson notes carry the same citation text (F7), and `bibliographyEntries` does not dedupe (F13), so the bibliography has four paragraphs, two of them the same Ericsson line. The alternative `bibliography: cited` (named in `plans/CEX-04.md` line 176; unit line 16 does not mention it) lists nothing today, because no draft has a `[@id]` citation (F5). This plan keeps `all`, as the unit says. A clean result needs a change outside this unit: source front matter in GNP-11's files, or a later unit that adds citations and sets `cited`. Decision: the orchestrator. No change is proposed here.
3. **Author name and dedication text are the planner's choice.** The unit asks for both and gives no text. The plan uses `Sample Author` and one sentence (D4). The orchestrator may replace either before implementation. The steps and the criteria do not change.
4. **The gate does not check that an order path names an existing draft.** `projectYamlSchema` checks the shape of the path and the status only (F9). A misspelled path passes `lint:examples`. The view then reports a `staleEntry` warning (F12) and the file falls back to alphabetical. Checks X2 and X3 and CEX-09's test catch it. A gate rule would change PLT-20's module, so none is proposed here.
5. **A run of the recipe adds a fifth entry.** The recipe's output node writes `drafts/chapter-opening.md` (`examples/nonfiction/graphs/chapter-opening.json` line 59). A run of the recipe in a project copied from this sample adds that file as a body entry after the four listed ones (`effective-order.ts` lines 111 to 115). CEX-20's demo says "four chapters", so the demo must run before the recipe, or CEX-20's text must allow five. Decision: the orchestrator (CEX-20).

## 9. Review parts

One part. The unit is one data change with one gate and one downstream test. Part 1 holds section 3 (the one file), section 4 (steps 0 to 10) and section 5 (C1, and the step-7 evidence for C2). The committed test of C2 belongs to CEX-09 and is in no part of this plan.
