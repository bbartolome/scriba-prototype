---
id: CEX-06
status: draft
---
# CEX-06 plan — unsupported-claims and orphan-scenes checks

Draft, revision 1, by the planner, at main `3cb634c` (working tree clean). Unit: `units/CEX-06-claims-orphans-checks.md` (module compile-export, phase:assembly-preflight, M5). Blockers, all done: CEX-05 (`plans/CEX-05.md`, code `51d9271` on main), AGL-01 (`plans/AGL-01.md`), GRR-01 (`plans/GRR-01.md`). The unit file has no change notes: `git log -- units/CEX-06-claims-orphans-checks.md` lists only `2fed3f4`, its creation. This plan changes no unit, module, contract or code. Open points 1 to 4 (section 8) need the orchestrator's decision; points 1 and 4 affect merged or downstream work.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the contracts

- **S1 Checks.** Two runners, with the ids `unsupported-claims` and `orphan-scenes` of `PREFLIGHT_CHECK_IDS` (`packages/contracts/src/compile-export/constants.ts` line 57). Source: unit lines 14 and 20 (the two sections).
- **S2 Claims.** `unsupported` gives an error. `weak` gives a warning, with the claim text and the cited passage as `ref`. A missing or unparseable artefact gives info "not grounding-checked". A current hash different from the artefact's `contentHash` gives info "changed since grounding check". The check never starts a grounding check; its message tells the author to run one from the Agent loop. Source: unit lines 15 to 18.
- **S3 Orphans.** (a) A story node of kind `scene` or `beat` whose `path` does not name a current top-level manuscript file: warning. (b) An order entry that is not a current manuscript file: warning. (c) A body manuscript file that no story node points at: info, and only when at least one story graph exists. A label-only node is never an orphan. Source: unit lines 21 to 24; module line 48 (all story graphs in `graphs/` are unioned).
- **S4 Artefact.** Path `GROUNDING_ARTEFACT_PATH_PREFIX` + path + `GROUNDING_ARTEFACT_PATH_SUFFIX` (`packages/contracts/src/agent-loop/constants.ts` lines 82 and 83). This is the path the engine writes (`apps/api/src/modules/agent-loop/grounding-engine.ts` lines 150 to 152). Parsed with `groundingResultSchema` (`packages/contracts/src/agent-loop/grounding.ts` line 33). Source: unit line 15.
- **S5 Scope.** The claims rules apply to each manuscript file: each view entry, in every part. Source: unit line 15 ("each manuscript file"); module line 43 (membership).
- **S6 Model-free and no writes.** Source: module line 55; CEX-05 S6 and S7.
- **S7 Finding and status.** Fields as in `packages/contracts/src/compile-export/preflight.ts` lines 15 to 23. Status by CEX-05 P8: an error fails the check, a warning warns it, and info does not change it. Source: CEX-05 P8.
- **S8 File access.** Through the Project store's in-process file API (module line 41).
- **S9 Test seam.** External behaviour through HTTP, the composed app and temp libraries (module lines 58 and 59).

### 1b. Settled by earlier plans and DECISIONS

- **D1 Runners.** A runner is `{id, run(input)}`, synchronous. `PREFLIGHT_RUNNERS` holds them in array order. The input may gain fields that the service fills, and CEX-06 appends its runners. Source: `plans/CEX-05.md` P9 and P10.
- **D2 Orphan path.** A finding's `path` is `projectPathSchema`, not the manuscript path, because an orphan scene or a stale entry can name a path outside `drafts/`. So an orphan finding's `path` is the path it names. Source: `plans/CEX-01.md` P10 (line 41).
- **D3 Ref.** `ref` is an opaque record. Source: `plans/CEX-01.md` P11 and O2 (lines 42 and 337).
- **D4 Hash rule.** The artefact's `contentHash` and the current file hash are both `sha256:` over the file's UTF-8 bytes. Source: `plans/AGL-17.md` line 290; checked in section 2a (the hash run).
- **D5 Nothing else sets a rule.** No DECISIONS entry sets a rule for these two checks. The only CEX-06 line in `plans/DECISIONS.md` (line 5420) says CEX-06 is unchanged.

### 1c. Planner's choices (the simplest option the sources allow)

- **P1 Files.** One new file, `preflight-claims-orphans.ts`, holds both runners and the messages. The runners of CEX-07 go in their own file (CEX-05 P1 layout). The tests go in `compile-export-claims-orphans.test.ts`.
- **P2 Input.** `PreflightFile` gains `hash`, which is `FileRead.hash` from the read the service already makes (`files.service.ts` line 268), so no second hash rule is written. `PreflightInput` gains `storyGraphs`, the valid story graphs from `ManuscriptService.storyGraphs`, which becomes public (it is `private` at `manuscript.service.ts` line 226). It also gains `readText(path)`, which returns the file's text, or `undefined` when the store's read throws (missing, larger than the 5 MiB cap of `project-store/constants.ts` line 23, or not text). CEX-05 P10 allows these fields.
- **P3 Unparseable.** An artefact is unparseable when `JSON.parse` throws or `groundingResultSchema.safeParse` fails. That includes `schemaVersion` 2, which reads as not checked (`plans/AGL-01.md` line 127). The artefact's `targetPath` is not compared with the file path, because the path rule already ties them.
- **P4 Claim position.** The claim's `span` is an offset into the text the engine checked (`grounding-engine.ts` lines 102 to 104 read the overlay or the file text; `grounding-prompts.ts` line 27 asks for offsets in the text). When `0 <= start <= end <= content.length`, the finding has `offset` = start, `length` = end - start and `line` = `lineOf(content, start)`. `lineOf` (`preflight-checks.ts` line 34) becomes exported, so the new file can use it. Otherwise the finding has no position.
- **P5 Order.** Files in view order. For each file: the not-checked or changed info first, then the claim findings in artefact order.
- **P6 Changed files.** The claims of a changed file are reported as well, with the info. The unit gives the claim rules no condition on the hash (unit lines 16 and 17). Open point 3.
- **P7 Ref.** `ref` is `{text: claim.text}`, plus `passage` when the claim has one. It is the same for the error and the warning.
- **P8 Messages.** Fixed texts. No claim text and no token is echoed (CEX-05 P6):
  - not checked: `Not grounding-checked. Run a grounding check from the Agent loop.`
  - changed: `Changed since grounding check. Run a grounding check from the Agent loop.`
  - unsupported: `Claim not supported by the sources.`
  - weak: `Claim only weakly supported by the sources.`
  - orphan (a): `Scene or beat path names no manuscript file in drafts/.`
  - orphan (b): `Order entry names no manuscript file.`
  - orphan (c): `Body file is not on the story graph.`
- **P9 Orphan (a).** The members are the paths of `view.entries`. A node counts when its kind is `scene` or `beat` and its `path` is set. One warning per such node, in graph order and then node order, with `ref` = `{node: node.id}`.
- **P10 Orphan (b).** One warning per `staleEntry` of `view.warnings`. The view already gives one per path (`manuscript.service.ts` lines 165 to 170).
- **P11 Orphan (c).** The pointed paths are the `path` of every node, of any kind, of every valid story graph. "A story graph exists" means `storyGraphs` returns at least one graph; only valid story-view files are returned (`manuscript.service.ts` lines 244 to 255). One info per body file that is not in the pointed set.
- **P12 No position for orphans.** Orphan findings carry no `line`, `offset` or `length`. The named file may not exist, and the contract makes `line` optional (`preflight.ts` line 19). Open point 1.
- **P13 Duplicates.** One finding per node for (a), and one per stale path for (b), as the view reports it.
- **P14 Registry.** `PREFLIGHT_RUNNERS` = `[placeholdersCheck, unsupportedClaimsCheck, orphanScenesCheck]`. The placeholders check stays at index 0, which C3 reads (`compile-export-preflight.test.ts` line 164).
- **P15 Module.** `compile-export.module.ts` does not change. `PreflightService` is already provided and exported (CEX-05 P15).
- **P16 CEX-05 test edits.** In `compile-export-preflight.test.ts`, the assertions on the whole `checks` list change: line 70 (`toHaveLength(1)`) and lines 119 to 121 (an exact list). They look up the placeholders check by id, and C2 requires every check to pass. The CEX-05 criteria keep their meaning. Open point 4.

## 2. Facts checked and facts assumed

### 2a. Checked

- **Unit.** `units/CEX-06-claims-orphans-checks.md`: front matter lines 2 to 9 (`blocked_by` line 7: CEX-05, AGL-01, GRR-01; `parallel_with` line 8: CEX-07; `unblocks` line 9: CEX-09). Claims lines 14 to 18, orphans lines 20 to 24, criteria lines 27 and 28. No change notes.
- **Module.** `modules/compile-export.md` line 17 (CEX-06 depends on AGL-01 and GRR-01), line 41 (file access through the Project store), line 42 (never reads `.versions/`, never runs a graph, reads only story-graph `order` edges, never calls a model), line 43 (membership), line 48 (all story graphs unioned), line 55 (preflight is model-free and reads recorded grounding results), lines 58 and 59 (test seam).
- **Downstream.** CEX-09: line 7 (`blocked_by` names CEX-06), line 22 (each check's fixture gives "the right check id, severity, path and line"). CEX-18: line 15 (findings link "to their location ... with line") and line 21 ("Findings link to their file and line"). CEX-20 line 27 (the unsupported-claims finding from the grounding-claims draft). CEX-07: lines 7 and 8.
- **Merged work.** `plans/CEX-01.md` to `plans/CEX-05.md`, `plans/AGL-01.md`, `plans/AGL-16.md`, `plans/AGL-17.md` and `plans/GRR-01.md` all have `status: done` (`grep -m1 '^status'`). CEX-05's code is `51d9271` on main.
- **Preflight code (merged CEX-05).** `apps/api/src/modules/compile-export/preflight-checks.ts`: `PreflightFile` lines 11 to 15; `PreflightInput` lines 18 to 22; `PreflightRunner` lines 25 to 28; `lineOf` lines 34 to 36; `placeholdersCheck` from line 39 (`bodyStart` line 46, `matchAll` line 48). `preflight.service.ts`: `PREFLIGHT_RUNNERS` line 26; `statusOf` line 29; `run` lines 45 to 61; `files` lines 48 to 52; `input` line 53; `checks` lines 54 to 59; `activeProjectId` line 64.
- **View.** `manuscript.service.ts`: `view()` line 73; `compose` line 92; the `storyGraphs` call line 110; `staleEntry` push line 170, with the first occurrence per path kept at lines 165 to 167; `members` lines 212 to 223; `storyGraphs` (private) lines 226 to 257, with the read and parse in a `try` at lines 244 to 248, the `view === 'story'` filter at line 255 and the return at line 257; `isManuscriptFile` lines 278 to 287.
- **Store.** `apps/api/src/modules/project-store/files.service.ts`: `hashOf` line 87; `decodeText` line 93 (fatal UTF-8, BOM kept); `readFileAt` lines 135 to 147 (NOT_FOUND at line 141); `read` lines 257 to 269 (`hash: hashOf(bytes)` at line 268). `packages/contracts/src/project-store/constants.ts` lines 17 to 20: the reserved paths are `.scriba/` and `drafts/.versions/`, so `logs/` is readable.
- **Engine.** `grounding-engine.ts`: `contentHashOf` lines 55 and 56; the text source lines 102 to 104; `contentHash` line 144; the artefact write lines 150 to 152.
- **Contracts.** `agent-loop/constants.ts`: verdicts line 73; `GROUNDING_RESULT_SCHEMA_VERSION` line 78; prefix and suffix lines 82 and 83. `agent-loop/grounding.ts`: claim schema lines 21 to 30 (`text`, `span`, `verdict`, optional `passage`, `reason`); result schema lines 33 to 40. `graph-runner/graph.ts`: the doc comment lines 33 to 38 (no `path` means label-only); node kinds lines 39 to 62 (`entity` line 42, `scene` line 49, `beat` line 56; strict fields `id`, `label`, `path`, `position`); the story graph shape lines 118 to 124 (strict). `graph-runner/constants.ts` line 7 (`GRAPH_SCHEMA_VERSION` = 1). `compile-export/preflight.ts` lines 15 to 23 (finding; `line` optional at line 19; `ref` at line 23) and lines 34 to 38 (result). `compile-export/order.ts` lines 43 to 50 (warnings; `staleEntry` at line 49) and lines 53 to 59 (view).
- **Test kit.** `apps/api/test/compile-export-manuscript.kit.ts`: `STATIC_ROOT` line 16; `manuscriptLibrary` lines 20 to 45 (files are written under `book/`); `withManuscript` lines 48 to 67; `getManuscript` line 70; `manuscriptOf` line 79; `storyGraph` lines 85 to 106 (kinds `scene` or `entity` only). `compile-export-manuscript.test.ts` lines 18 to 20: the `projectYaml` helper, which writes the `order:` key.
- **Existing preflight test.** `compile-export-preflight.test.ts`: line 70 (`toHaveLength(1)`), lines 71 to 77 (`checks[0]`), lines 119 to 121 (the whole list), line 164 (`checks[0].findings`). No other file in `apps/api/test` or `e2e` reads `checks` (grep). The `preflight` matches in the setup-auth tests are CORS text.
- **Boundaries.** `eslint.config.mjs` lines 27 to 60: the boundaries rules govern imports between `src/modules/*` folders, through entry files. Importing `@bbartolome/scriba-contracts/agent-loop` from compile-export is not governed. The new file must not import `apps/api/src/modules/agent-loop/*`.
- **Hash rule (run).** On 2026-11-19 with Node v26.13.0, for a plain text, a text with a BOM and CRLF, and a text with multi-byte characters: the `sha256:` of the bytes equals the `sha256:` of the text decoded as `decodeText` decodes it. So the store's hash and the engine's hash agree for a file the engine read from disk.
- **Plans and branches.** `plans/QUEUE.md` line 8 lists CEX-06 as available. Among the draft and planned plans, only `plans/GRR-15.md` is `status: planned`; its section 3 names `apps/web/src/app/features/graph-runner/*` and `e2e/specs/graph-*.e2e.ts` only. There is no `plans/CEX-07.md`. There is no `unit/CEX-06` branch and no worktree for it.
- **DECISIONS.** `grep -n 'CEX-06' plans/DECISIONS.md` finds line 5420 (the AGL-16 entry: "CEX-06 is unchanged") and line 2901 (the constants). A grep for "orphan" and "not grounding-checked" finds no entry.

### 2b. Assumed, not checked

- A1 CEX-07's shape. Its unit says it is parallel with CEX-06 (lines 7 and 8), and CEX-05 P9 says CEX-06 and CEX-07 append to the array. That CEX-07 may add `PreflightInput` fields is inferred, not read; its plan does not exist.
- A2 `FilesService.write` creates the folders of `logs/grounding/drafts/`. Not read in full.
- A3 A model-produced `span` is usually in range. The schema checks only integers of at least 0 (`grounding.ts` lines 22 and 23). The plan omits the position when the span is out of range.
- A4 `npm ci` and the contracts build run offline in the worktree (CEX-05's implementation did).
- A5 The test matchers used (`toEqual`, `toMatchObject`, `toHaveLength`) exist in the installed Vitest.
- A6 Nothing changes a file between the store read that gives the hash and the claim check. The check runs in one request.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/manuscript.service.ts` | edit (one word) | line 226: `private storyGraphs` becomes `storyGraphs`; no other change (P2) |
| `apps/api/src/modules/compile-export/preflight-checks.ts` | edit | `PreflightFile.hash` (P2); `PreflightInput.storyGraphs` and `readText` (P2); `export` on `lineOf` (P4); `import type { StoryGraph }` from `@bbartolome/scriba-contracts/graph-runner` |
| `apps/api/src/modules/compile-export/preflight.service.ts` | edit | reads `hash` with the content (P2); fills `storyGraphs` and `readText`; registers `unsupportedClaimsCheck` (Part A) and `orphanScenesCheck` (Part B) (P14); imports them from `./preflight-claims-orphans` |
| `apps/api/src/modules/compile-export/preflight-claims-orphans.ts` | new | `unsupportedClaimsCheck` (Part A); `orphanScenesCheck` (Part B); the messages of P8 |
| `apps/api/test/compile-export-claims-orphans.test.ts` | new | K1 and K2 (Part A); O1 to O4 (Part B) |
| `apps/api/test/compile-export-preflight.test.ts` | edit | lines 70 to 71 and 119 to 121 only (P16) |
| `plans/CEX-06.md` | this plan | none |

Not changed: the unit file (the orchestrator ticks its boxes at merge, CEX-05 P19), `modules/`, `packages/contracts/`, `compile-export.module.ts` (P15), `markdown-text.ts`, the test kits, and `plans/DECISIONS.md`.

## 4. Method

Work in the worktree of branch `unit/CEX-06` that the orchestrator gives, so that the main working tree is not switched. Record `node -v` (v26.x) and `npm -v` beside each result. Do not push and do not open a pull request. Stop rule: if a regression fails in steps 4 to 10, revert that step, report, and do not continue. The implementer does not tick the unit's boxes.

0. **Preconditions.** `git diff --name-only 3cb634c -- apps/api/src/modules/compile-export apps/api/test packages/contracts` prints nothing, and `ls apps/api/src/modules/compile-export/preflight-claims-orphans.ts` prints nothing. If either prints something, re-read the cited lines before going on.
1. **Worktree.** `git -C <folder> branch --show-current` prints `unit/CEX-06`. Run steps 2 to 15 in that folder.
2. **Install and contracts.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
3. **Baseline.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. Record the file and test counts.
4. **Public story-graph reader (P2).** In `manuscript.service.ts` line 226, remove `private`. Nothing else. Then `cd apps/api && npx vitest run test/compile-export-manuscript.test.ts test/compile-export-order.test.ts`. Expected: pass, with the counts of step 3.
5. **Input plumbing (P2, P4).** In `preflight-checks.ts`: `PreflightFile.hash: string`; `PreflightInput.storyGraphs: StoryGraph[]` and `readText(path: string): string | undefined`; `export` on `lineOf`; the type import. In `preflight.service.ts`: read each entry once and keep its `content` and `hash`; `const { graphs } = this.manuscript.storyGraphs(projectId)`; the `readText` closure (`try { return this.files.read(projectId, path).content; } catch { return undefined; }`); `const input = { projectId, view, files, storyGraphs: graphs, readText }`. No runner is added yet. Then `cd apps/api && npx vitest run test/compile-export-preflight.test.ts`. Expected: pass, with the result of step 3.
6. **Claims runner (P3 to P8).** Create `preflight-claims-orphans.ts` with `unsupportedClaimsCheck` (id `unsupported-claims`). For each file of `input.files`, in order: (i) `text = input.readText(GROUNDING_ARTEFACT_PATH_PREFIX + file.path + GROUNDING_ARTEFACT_PATH_SUFFIX)`, and `result` is the parsed artefact or `undefined` (P3). If `result` is `undefined`, add one info NOT_CHECKED for the file and go on. (ii) If `result.contentHash !== file.hash`, add one info CHANGED. (iii) For each claim: `unsupported` gives an error UNSUPPORTED, `weak` a warning WEAK, and `supported` nothing. Each finding has `path`, `ref` (P7) and the position of P4. Register it: `PREFLIGHT_RUNNERS = [placeholdersCheck, unsupportedClaimsCheck]`. Then `npm run build -w @bbartolome/scriba-api`. Expected: exit 0.
7. **CEX-05 test edits (P16).** In `compile-export-preflight.test.ts`: C1 replaces `toHaveLength(1)` and the `checks[0]` reads (lines 70 to 71 and 76) with a lookup of the `placeholders` check by id; its findings assertions stay. C2 replaces the whole-list assertion (lines 119 to 121) with two assertions: the `placeholders` entry equals `{id: 'placeholders', status: 'pass', findings: []}`, and every check's status is `pass`. C3 is unchanged. Then `npx vitest run test/compile-export-preflight.test.ts`. Expected: 3 pass.
8. **Claims tests.** Create `apps/api/test/compile-export-claims-orphans.test.ts` with K1 and K2 (section 5). Expected: 2 pass.
9. **Format.** `npx prettier --write` on each file of section 3 that changes or is new, then `npx prettier --check` on the same files. Expected: exit 0.
10. **Part A regression.** `npx vitest run test/compile-export-order.test.ts test/compile-export-manuscript.test.ts test/compile-export-assembly.test.ts test/compile-export-preflight.test.ts test/compile-export-claims-orphans.test.ts`. Expected: every test passes.
11. **Orphan runner (P9 to P14).** Add `orphanScenesCheck` (id `orphan-scenes`) to `preflight-claims-orphans.ts`. (a) For each graph of `input.storyGraphs`, each node of kind `scene` or `beat` with `path` set and not among the paths of `input.view.entries`: a warning ORPHAN_SCENE, `ref` = `{node: node.id}`. (b) For each `staleEntry` of `input.view.warnings`: a warning STALE_ENTRY. (c) If `input.storyGraphs` is not empty: the pointed set is the `path` of every node of every graph; each body file (`part` `body`) whose path is not in the set gets an info NOT_ON_GRAPH. Findings come in the order (a), (b), (c), with no position (P12). Register: `PREFLIGHT_RUNNERS = [placeholdersCheck, unsupportedClaimsCheck, orphanScenesCheck]`. Then `npm run build -w @bbartolome/scriba-api`. Expected: exit 0.
12. **Orphan tests.** Add O1 to O4 (section 5) to `compile-export-claims-orphans.test.ts`. Expected: 6 of 6 pass in that file. Then `npx prettier --check` on it.
13. **API and root gates.** `npm run build -w @bbartolome/scriba-api`, `npm test -w @bbartolome/scriba-api` (the whole suite, including Setup & auth's invariant sweeps), `npm run lint -w @bbartolome/scriba-api` (the PLT-09 boundaries). From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0.
14. **Commit.** `git status --short` and `git diff --stat` list exactly the six paths of section 3 that are code or tests: `manuscript.service.ts`, `preflight-checks.ts`, `preflight.service.ts`, `preflight-claims-orphans.ts`, `compile-export-claims-orphans.test.ts` and `compile-export-preflight.test.ts`. Stage each by name (`git add -- <path>`), never `git add -A` or `git commit -a`. Commit with `feat(CEX-06): unsupported-claims and orphan-scenes checks`. Do not edit or tick the unit file.
15. **Fresh clone and record.** `git clone --branch unit/CEX-06 /Users/bbartolome/workspace/scriba-prototype <empty folder>`, then in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0. Store the Node and npm versions and each command's output. A criterion is reported as passed only when its row in section 5 holds.

## 5. Acceptance criteria and tests

The two criteria are unit lines 27 and 28, copied as written. Each has tests in `apps/api/test/compile-export-claims-orphans.test.ts`. Every test uses the kit's `withManuscript(files, run)`, where the `files` map gives project paths under `book/`. The file has a local `postPreflight(app, cookie)`, as CEX-05's test file does, and parses each 200 body with `preflightResultSchema`. It has local helpers for the artefact JSON (a `sha256:` of a text by `node:crypto`), and for the graph JSON (nodes written inline with `label` and `position`, because the kit's `storyGraph` takes only `scene` and `entity` kinds). Positions are computed with `indexOf` in the test, never as literals. Checks are looked up by id, never by index or by count. Findings are compared with `toEqual` on `check`, `severity`, `path`, `line`, `message` and `ref`; `offset` and `length` are checked with `slice`.

| Criterion (unit line) | Test (file, name) | What it asserts |
|---|---|---|
| "A claims-artefact fixture in the Agent loop's format yields `unsupported` → error, `weak` → warning, and a changed file → `info`." (27) | K1 "claims: unsupported is an error, weak a warning, a changed file an info" | Fixture below. The `unsupported-claims` check has status `fail` and exactly three findings in order: an error on `drafts/a.md` at line 1 (the unsupported claim: offset and length of its text, UNSUPPORTED, `ref` `{text}`); a warning on `drafts/a.md` at line 3 (the weak claim: WEAK, `ref` `{text, passage}`); an info on `drafts/b.md` (CHANGED, no position). The supported claim gives nothing. `orphan-scenes` has no findings. |
| (same criterion) | K2 "claims: a missing, unparseable or older-version artefact is not grounding-checked" | Fixture below. Status `pass`, with exactly three info findings NOT_CHECKED, for `c`, `d` and `e` in that order, and none for `f`. |
| "Each orphan case (a), (b), (c) has a fixture producing the right severity; label-only nodes produce nothing." (28), case (a) | O1 "orphans (a): a scene or beat path that names no top-level manuscript file is a warning" | Fixture below. `orphan-scenes` has status `warn` and four warnings in node order, with paths `drafts/sub/x.md`, `drafts/gone.md`, `drafts/.versions/ch01.md` and `notes/ideas.md`, and no position. None for `ch01` (its path resolves) or `hero` (an entity node). |
| (same criterion), case (b) | O2 "orphans (b): a stale order entry is a warning" | Fixture below. Status `warn`, with one warning, path `drafts/gone.md`, and no finding of case (c) (there is no graph). |
| (same criterion), case (c) | O3 "orphans (c): a body file that no story node points at is info, and only with a story graph" | Fixture below. With the graph: status `pass`, one info on `drafts/ch02.md`, nothing for `drafts/front.md` (its part is `front`). Without the graph, same files: no `orphan-scenes` finding. |
| (same criterion), label-only | O4 "orphans: label-only story nodes produce nothing" | Fixture below. `orphan-scenes` findings are `[]`. |
| CEX-05 criteria (unit lines 24 to 26) | C1, C2, C3 of `compile-export-preflight.test.ts`, as edited in step 7 | The placeholder findings are exact (C1); a clean fixture passes, with every check's status `pass` and the placeholders check empty, and the revision and the files are unchanged (C2); no model call (C3). |

**K1 fixture (Part A).** `drafts/a.md` is three lines: `Harbour traffic doubled in 1900.`, `The town has a river.` and `The bridge opened in 1931.`, each with a line end. `logs/grounding/drafts/a.md.json` is an artefact of the Agent loop's format: `schemaVersion` 1, `targetPath` `drafts/a.md`, `contentHash` the `sha256:` of the file's text, a `checkedAt` ISO time, a `runId`, and three claims, each with `text`, `span`, `verdict` and `reason`. The claims are: "Harbour traffic doubled in 1900." (unsupported, no passage); "The town has a river." (supported, with a passage); "The bridge opened in 1931." (weak, with a passage). `drafts/b.md` is `The old mill burned.` Its artefact `logs/grounding/drafts/b.md.json` has a `contentHash` of a different text (`The old mill stood.`) and one supported claim.

**K2 fixture (Part A).** `drafts/c.md` has no artefact. `drafts/d.md` has the artefact text `{ not json`. `drafts/e.md` has an otherwise valid artefact with `schemaVersion: 2`. `drafts/f.md` has a valid artefact with the matching hash and one supported claim.

**O1 fixture (Part B).** `drafts/ch01.md` and `drafts/sub/x.md` (the second is in a subfolder, so it is not a member). `graphs/story.json`: `schemaVersion` 1, `view` `story`, `name`, `edges` `[]`, and the nodes in this order: scene `ch01` with path `drafts/ch01.md`; scene `sub` with path `drafts/sub/x.md`; beat `gone` with path `drafts/gone.md`; beat `versions` with path `drafts/.versions/ch01.md`; scene `outside` with path `notes/ideas.md`; entity `hero` with path `entities/hero.md`.

**O2 fixture (Part B).** `drafts/ch01.md`. `project.yaml` with an `order` of `drafts/ch01.md` and then `drafts/gone.md`. No graph.

**O3 fixture (Part B).** Files `drafts/ch01.md`, `drafts/ch02.md` and `drafts/front.md`. `project.yaml` has the order entry `drafts/front.md` with `part: front`. Case 1 adds `graphs/story.json` with one scene `ch01` with path `drafts/ch01.md`. Case 2 has the same files and no graph.

**O4 fixture (Part B).** `drafts/ch01.md`. `graphs/story.json` with a scene `idea` and a beat `turn`, both without a path (label-only), and a scene `ch01` with path `drafts/ch01.md`.

## 6. Agreement with downstream units and later phases

- **CEX-09 (assembly-preflight gate; `blocked_by` names CEX-06 at line 7).** It needs both check ids, their severities and their findings. Its criterion (line 22) asks for "path and line" for each check's fixture. Claim findings have a line when the span is in range (P4). Orphan findings have none (P12). Open point 1.
- **CEX-18 (preflight panel).** Lines 15 and 21 ask each finding to link to its file and line. The same point as CEX-09. Open point 1.
- **CEX-20 (milestone gate, line 27).** "The unsupported-claims finding from the grounding-claims draft." The AGL-19 draft gives an error for claim 3 and a warning for claim 2 (`plans/AGL-19.md` line 119), which this plan emits.
- **AGL-24 (compile tools).** Its `run_preflight` reads the checks as CEX-05's plan says (`plans/CEX-05.md` section 5, the AGL-24 bullet). The ids and the status rule do not change.
- **AGL-01, AGL-16, AGL-17 and AGL-20.** Read-only use: the artefact, its path rule and its hash do not change. AGL-20 needs no unit change for CEX-06 (`plans/AGL-20.md` line 219).
- **GRR-01.** The story graph schema is used as it is. The schema does not check paths; a node path that names no file is reported here, as `plans/GRR-01.md` line 245 says.
- **CEX-05 (merged).** Its C1 and C2 change (P16). Its criteria keep their meaning. Its runner input gains fields that the service fills, as CEX-05 P10 allows.
- **Unit blockers.** This unit's `blocked_by` names CEX-05, AGL-01 and GRR-01, all done. Its `unblocks` (CEX-09) matches CEX-09's `blocked_by`. AGL-01's and GRR-01's `unblocks` lists name CEX-06, which matches this unit's `blocked_by` (`units/README.md`, "Blocker notation").
- **Later phases.** GNP-19 reads the manuscript order, not preflight. No change.

## 7. Other plans on the same files

- **GRR-15 (planned).** Its files are `apps/web/src/app/features/graph-runner/*` and `e2e/specs/graph-*.e2e.ts` (section 3 of `plans/GRR-15.md`). None is a file of this plan. Both orders are correct.
- **CEX-07 (no plan).** Its unit: blocked by CEX-05 and parallel with CEX-06 (lines 7 and 8). Its expected change: two entries appended to `PREFLIGHT_RUNNERS`, its runners in its own file, possibly new fields on `PreflightInput`, and its own tests, which must look up checks by id as P16 does.
  - CEX-06 first: CEX-07 rebases. In a conflict in `preflight.service.ts` (the array and the `input` object) and in `preflight-checks.ts` (the interface), keep both sides.
  - CEX-07 first: CEX-06 rebases. The step 7 edits look up by id, so they hold with five checks. C2's "every check passes" holds if CEX-07's clean fixture passes, which its unit requires. C3 reads `checks[0]`, which stays the placeholders check because CEX-07 appends (CEX-05 P9). The registry line of step 11 then keeps all the entries of both units.
  - Either order: no field name collides (`hash`, `storyGraphs`, `readText`). CEX-07 must not rename or remove them.
- **Later units** (CEX-09, CEX-18, AGL-24) have no plans yet. Open point 1 concerns them.

## 8. Open points

1. **Orphan findings carry no line (P12), and downstream criteria require one.** CEX-09 line 22 asks for "path and line" for each check, CEX-18 lines 15 and 21 ask each finding to link to its file and line, and CEX-05 unit line 18 says every finding carries a line. Under CEX-01 P10 an orphan finding's `path` is the path it names, which may not exist, so no line can be given there. Options: (i) relax the line rule for orphan findings in CEX-05's decision, CEX-09 and CEX-18 (this plan's default); (ii) anchor orphan findings in `graphs/<id>.json` or `project.yaml` with a line, which reverses CEX-01 P10; (iii) give only case (c) line 1. This plan changes none of these units.
2. **Module wording of graph reads.** `modules/compile-export.md` line 42 says the module "never runs a graph (reads only story-graph `order` edges)". Cases (a) and (c) of the unit need each node's `kind` and `path`. This plan reads the nodes and runs nothing, which the unit requires, and module line 17 names GRR-01, the graph schema, as CEX-06's blocker. The orchestrator confirms this reading or clarifies the module's wording. This plan does not change the module.
3. **Claims of a changed file (P6).** They are reported together with the info, because the unit's claim rules have no condition on the hash (unit lines 16 and 17). If they should be dropped, the unit has to say so.
4. **Edit of merged CEX-05 tests (P16).** The whole-list assertions in `compile-export-preflight.test.ts` (line 70 and lines 119 to 121) must change, or they fail once CEX-06 registers its runners. The CEX-05 criteria keep their meaning: the exact placeholder findings, and a clean fixture that passes. The orchestrator confirms the edit of a merged test file.

## 9. Review parts

Two parts. Every step of section 4 is in exactly one part, and every test of section 5 is in exactly one part.

- **Part A (claims and plumbing).** Steps 0 to 10. Tests K1 and K2 (criterion 1, unit line 27), and the CEX-05 tests C1 to C3 as edited in step 7, with the regression suites of step 10. No commit yet.
- **Part B (orphans, gates and commit).** Steps 11 to 15. Tests O1 to O4 (criterion 2, unit line 28). The commit of step 14 holds the work of both parts.
