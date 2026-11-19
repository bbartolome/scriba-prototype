---
id: CEX-06
status: done
---
# CEX-06 plan — unsupported-claims and orphan-scenes checks

Revision 2, by the Opus reviser, at main `1e3dd26` (working tree clean). Revision 1 (the planner's draft) was at `3cb634c`; `git diff --name-only 3cb634c 1e3dd26` lists only `plans/CEX-06.md`, `plans/DECISIONS.md` and `plans/QUEUE.md`. Unit: `units/CEX-06-claims-orphans-checks.md` (module compile-export, phase:assembly-preflight, M5). Blockers, all done: CEX-05 (`plans/CEX-05.md`, code `51d9271` on main), AGL-01 (`plans/AGL-01.md`), GRR-01 (`plans/GRR-01.md`). The unit file has no change notes: `git log -- units/CEX-06-claims-orphans-checks.md` lists only `2fed3f4`, its creation. This plan changes no unit, module, contract or code. Every open point is settled in section 8; none needs the Navigator.

Revision 2 corrections, in short: every finding now carries `path` and `line`, as CEX-05's decision requires (unit `units/CEX-05-preflight-endpoint-placeholders.md` line 18, CEX-05 plan S2); orphan findings point at the file that holds the defect (the story graph file or `project.yaml`, at the node's or the entry's line; case (c) at line 1 of the body file); the file-level info findings and a claim with an out-of-range span are at line 1; D2 is corrected (CEX-01 P10 sets only the schema of `path`); the story-graph reader also returns each graph's file path; K1 also tests P6 (the claims of a changed file); A2 is replaced (the kit's `putFile` creates folders); the base commit of step 0 is `1e3dd26`; the open points are settled.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the contracts

- **S1 Checks.** Two runners, with the ids `unsupported-claims` and `orphan-scenes` of `PREFLIGHT_CHECK_IDS` (`packages/contracts/src/compile-export/constants.ts` line 57). Source: unit lines 14 and 20 (the two sections).
- **S2 Claims.** `unsupported` gives an error. `weak` gives a warning, with the claim text and the cited passage as `ref`. A missing or unparseable artefact gives info "not grounding-checked". A current hash different from the artefact's `contentHash` gives info "changed since grounding check". The check never starts a grounding check; its message tells the author to run one from the Agent loop. Source: unit lines 15 to 18.
- **S3 Orphans.** (a) A story node of kind `scene` or `beat` whose `path` is set and does not name a current top-level manuscript file: warning. (b) An order entry that is not a current manuscript file: warning. (c) A body manuscript file that no story node points at: info, and only when at least one story graph exists. A label-only node is never an orphan. Source: unit lines 21 to 24; module line 48 (all story graphs in `graphs/` are unioned).
- **S4 Artefact.** Path `GROUNDING_ARTEFACT_PATH_PREFIX` + path + `GROUNDING_ARTEFACT_PATH_SUFFIX` (`packages/contracts/src/agent-loop/constants.ts` lines 82 and 83). This is the path the engine writes (`apps/api/src/modules/agent-loop/grounding-engine.ts` lines 150 to 152). Parsed with `groundingResultSchema` (`packages/contracts/src/agent-loop/grounding.ts` line 33). Source: unit line 15.
- **S5 Scope.** The claims rules apply to each manuscript file: each view entry, in every part. Source: unit line 15 ("each manuscript file"); module line 43 (membership).
- **S6 Model-free and no writes.** Source: module line 55; CEX-05 unit lines 20 and 21; CEX-05 plan S6 and S7.
- **S7 Finding and status.** Fields as in `packages/contracts/src/compile-export/preflight.ts` lines 15 to 24. Status by CEX-05 P8: an error fails the check, a warning warns it, and info does not change it.
- **S8 Every finding carries `path` and `line`** (and `offset` and `length` where useful), so that the UI can link to the location. Source: CEX-05 unit line 18 (a decision of the unit whose framework this unit extends: "CEX-06 and CEX-07 add the other four"); CEX-05 plan S2. CEX-09's criterion (line 22: "path and line") and CEX-18's (lines 15 and 21) read the same rule.
- **S9 File access.** Through the Project store's in-process file API (module line 41).
- **S10 Test seam.** External behaviour through HTTP, the composed app and temp libraries (module lines 58 and 59).

### 1b. Settled by earlier plans and DECISIONS

- **D1 Runners.** A runner is `{id, run(input)}`, synchronous. `PREFLIGHT_RUNNERS` holds them in array order. The input may gain fields that the service fills, and CEX-06 appends its runners. Source: `plans/CEX-05.md` P9 and P10.
- **D2 Finding path schema.** A finding's `path` is `projectPathSchema`, not the manuscript path, because an orphan finding can be outside `drafts/` (`plans/CEX-01.md` P10, line 41; `preflight.ts` line 13). P10 sets the schema only; it does not say which path an orphan finding names. This plan's orphan paths (`graphs/<id>.json`, `project.yaml`, a body file) are project paths, so the schema holds.
- **D3 Ref.** `ref` is an opaque record. Source: `plans/CEX-01.md` P11 and O2.
- **D4 Hash rule.** The artefact's `contentHash` and the current file hash are both `sha256:` over the file's UTF-8 bytes. Source: `plans/AGL-17.md` line 290; checked in section 2a (the hash run).
- **D5 Nothing else sets a rule.** No DECISIONS entry sets a rule for these two checks. `grep -n 'CEX-06' plans/DECISIONS.md` finds line 2901 (the path constants) and line 5420 ("CEX-06 is unchanged"). No entry names CEX-09 or CEX-18 for a finding rule.

### 1c. Choices of this plan (the simplest option the sources allow)

- **P1 Files.** One new file, `preflight-claims-orphans.ts`, holds both runners and the messages. The runners of CEX-07 go in their own file (CEX-05 P1 layout). The tests go in `compile-export-claims-orphans.test.ts`.
- **P2 Input.** `PreflightFile` gains `hash`, which is `FileRead.hash` from the read the service already makes (`files.service.ts` line 268), so no second hash rule is written. `ManuscriptService.storyGraphs` becomes public (it is `private` at `manuscript.service.ts` line 226) and also returns `paths: string[]`, where `paths[i]` is the file of `graphs[i]` (pushed together at line 255); `compose` ignores the new field. `PreflightInput` gains `storyGraphs: {path: string; graph: StoryGraph}[]` (the valid story graphs with their files) and `readText(path)`, which returns the file's text, or `undefined` when the store's read throws (missing, larger than the 5 MiB cap of `project-store/constants.ts` line 23, or not text). CEX-05 P10 allows these fields.
- **P3 Unparseable.** An artefact is unparseable when `JSON.parse` throws or `groundingResultSchema.safeParse` fails. That includes `schemaVersion` 2, which reads as not checked (`plans/AGL-01.md` line 127). The artefact's `targetPath` is not compared with the file path, because the path rule already ties them.
- **P4 Claim position.** The claim's `span` is an offset into the text the engine checked (`grounding-engine.ts` lines 102 to 104). When `0 <= start <= end <= content.length`, the finding has `offset` = start, `length` = end - start and `line` = `lineOf(content, start)`. `lineOf` (`preflight-checks.ts` line 34) becomes exported. Otherwise the finding has `line` 1 and no `offset` or `length` (S8).
- **P5 Order.** Files in view order. For each file: the not-checked or changed info first, then the claim findings in artefact order.
- **P6 Changed files.** The claims of a changed file are reported as well, after the info. The unit gives the claim rules no condition on the hash (unit lines 16 and 17), and CEX-20's demo step 3 (unit line 27) expects "the unsupported-claims finding from the grounding-claims draft", which dropping would hide once that draft is edited. Settled (open point 3).
- **P7 Ref.** `ref` is `{text: claim.text}`, plus `passage` (the artefact's passage object) when the claim has one. It is the same for the error and the warning.
- **P8 Messages.** Fixed texts. No claim text and no token is echoed (CEX-05 P6); the named path is in `ref`:
  - not checked: `Not grounding-checked. Run a grounding check from the Agent loop.`
  - changed: `Changed since grounding check. Run a grounding check from the Agent loop.`
  - unsupported: `Claim not supported by the sources.`
  - weak: `Claim only weakly supported by the sources.`
  - orphan (a): `Scene or beat path names no manuscript file in drafts/.`
  - orphan (b): `Order entry names no manuscript file.`
  - orphan (c): `Body file is not on the story graph.`
- **P9 File-level position.** The not-checked and changed infos have the manuscript file as `path` and `line` 1, with no `offset` or `length` (S8).
- **P10 Item line.** A helper `itemLine(text, key, index)`: `parseDocument(text, {lineCounter})` of the `yaml` package (already a dependency of `apps/api`, `package.json` line 20, used by `manuscript.service.ts` line 3), then `doc.getIn([key, index], true)`; the result is `lineCounter.linePos(item.range[0]).line`, or 1 when the text is `undefined`, the document has errors, or the item has no range. JSON is read as YAML flow, so the same helper serves graph files and `project.yaml` (checked in section 2a).
- **P11 Orphan (a).** The members are the paths of `view.entries`. For each `{path, graph}` of `input.storyGraphs`, in input order, and each node at index `i` in node order whose kind is `scene` or `beat`, whose `path` is set and is not a member: one warning with `path` = the graph file, `line` = `itemLine(readText(graph file), 'nodes', i)`, `ref` = `{node: node.id, path: node.path}`. The finding names the place to fix (the node), which exists, while the node's path may not.
- **P12 Orphan (b).** For each `staleEntry` warning of `view.warnings` (the view gives one per path, first occurrence, `manuscript.service.ts` lines 164 to 171): one warning with `path` = `project.yaml`, `line` = `itemLine(readText('project.yaml'), 'order', i)` where `i` is the index of the first entry of the parsed `order` list (`doc.toJS().order`) whose `path` equals the stale path, and `ref` = `{path: <stale path>}`. If no index is found, `line` is 1.
- **P13 Orphan (c).** The pointed paths are the `path` of every node, of any kind, of every valid story graph. "A story graph exists" means `input.storyGraphs` is not empty; only valid story-view files are returned (`manuscript.service.ts` lines 244 to 255). One info per body file (view entry with `part` `body`) not in the pointed set, with `path` = the file and `line` 1.
- **P14 Orphan order.** Findings in the order (a), (b), (c). One finding per node for (a), one per stale path for (b).
- **P15 Registry.** `PREFLIGHT_RUNNERS` = `[placeholdersCheck, unsupportedClaimsCheck, orphanScenesCheck]`. The placeholders check stays at index 0, which C3 reads (`compile-export-preflight.test.ts` line 164).
- **P16 Module.** `compile-export.module.ts` does not change. `PreflightService` is already provided and exported (CEX-05 P15).
- **P17 CEX-05 test edits.** In `compile-export-preflight.test.ts`, the assertions on the whole `checks` list change: line 70 (`toHaveLength(1)`) with the `checks[0]` reads at lines 71 and 76, and lines 119 to 121 (an exact list). They look up the placeholders check by id, and C2 also requires every check to pass. The CEX-05 criteria (unit lines 24 to 26) keep their text and meaning. Settled (open point 4).

## 2. Facts checked and facts assumed

### 2a. Checked

- **Unit.** `units/CEX-06-claims-orphans-checks.md`: front matter lines 2 to 9 (`blocked_by` line 7; `parallel_with` line 8: CEX-07; `unblocks` line 9: CEX-09). Claims lines 14 to 18, orphans lines 20 to 24, criteria lines 27 and 28. No change notes.
- **CEX-05 unit.** Line 18: "Every finding carries `path` and `line` (and `offset`/`length` where useful) so the UI can link to the location." Line 9: `unblocks` names CEX-06.
- **Module.** `modules/compile-export.md` line 17 (CEX-06 with AGL-01 and GRR-01), line 41 (file access), line 42 (never reads `.versions/`, never runs a graph, "reads only story-graph `order` edges", never calls a model), line 43 (membership), line 48 (all story graphs unioned), line 55 (preflight is model-free and reads recorded grounding results), lines 58 and 59 (test seam).
- **Merged graph reads.** `manuscript.service.ts` `pairsOf` lines 47 to 56 already reads every node's `path` and skips every edge whose `relation` is not `order`. So module line 42 restricts the edges read, not the node fields; CEX-06 reads node kinds and paths and no edge (open point 2).
- **Downstream.** CEX-09: line 7 (`blocked_by` names CEX-06), line 22 ("right check id, severity, path and line"). CEX-18: lines 15 and 21 (link to file and line). CEX-20 line 27. CEX-07: lines 7 and 8. Only CEX-09 names CEX-06 in `blocked_by` (`grep -l CEX-06 units/*.md`).
- **Merged work.** `plans/CEX-01.md` to `plans/CEX-05.md`, `plans/AGL-01.md`, `plans/AGL-16.md`, `plans/AGL-17.md` and `plans/GRR-01.md` have `status: done`. The branches `unit/CEX-03` and `unit/CEX-04` exist but hold no commit beyond main (`git log main..unit/CEX-03` and `..unit/CEX-04` print nothing).
- **Preflight code (merged CEX-05).** `preflight-checks.ts`: `PreflightFile` lines 11 to 15; `PreflightInput` lines 18 to 22; `PreflightRunner` lines 25 to 28; `lineOf` lines 34 to 36; `placeholdersCheck` from line 39. `preflight.service.ts`: `PREFLIGHT_RUNNERS` line 26; `statusOf` line 29; `run` lines 45 to 61; `files` lines 48 to 52; `input` line 53; `checks` lines 54 to 59.
- **View.** `manuscript.service.ts`: `view()` line 73; `compose` line 92; the `storyGraphs` call line 110; `fieldOf` lines 156 to 174 (`staleEntry` push line 170, first occurrence per path lines 165 and 166); `projectOrder` line 190 (order entries validated with `orderEntrySchema`, so each has a `path`); `members` lines 212 to 223; `storyGraphs` (private) lines 226 to 259, with the read and parse in a `try` at lines 244 to 248 and the `view === 'story'` filter at line 255; `isManuscriptFile` lines 278 to 287.
- **Store.** `files.service.ts`: `hashOf` line 87; `decodeText` line 93; `read` lines 257 to 269 (`hash: hashOf(bytes)` at line 268). `project-store/constants.ts` lines 17 to 20: reserved paths `.scriba/` and `drafts/.versions/`, so `logs/` and `graphs/` are readable.
- **Engine.** `grounding-engine.ts`: `contentHashOf` lines 55 and 56; the text source lines 102 to 104; `contentHash` line 144; the artefact write lines 150 to 152.
- **Contracts.** `agent-loop/constants.ts`: verdicts line 73; `GROUNDING_RESULT_SCHEMA_VERSION` line 78; prefix and suffix lines 82 and 83. `agent-loop/grounding.ts`: passage schema lines 14 to 18 (`path`, `offset`, `snippet`); claim schema lines 21 to 30; result schema lines 33 to 40. `graph-runner/graph.ts`: doc comment lines 33 to 38 (no `path` means label-only); story nodes lines 39 to 61; edges line 64 (each has an `id`); the story graph shape lines 118 to 124. `fileReferenceSchema` is `z.string()` (`project-store/files.ts` line 9), so node paths in `.versions/` or outside `drafts/` are valid. `compile-export/preflight.ts` lines 13 to 24 (finding; `line` optional at line 19) and lines 34 to 38 (result). `compile-export/order.ts` lines 43 to 50 (warnings) and lines 53 to 59 (view).
- **Item line (run).** On 2026-11-19 with `yaml` 2.9.1: for a story graph written as `JSON.stringify(graph, null, 2)` (the form of `graph-files.ts` line 36 and of the kit's `storyGraph`), `getIn(['nodes', 1], true).range[0]` gives the line of the node's opening `{`, one line above its `"id"` line; for compact JSON and for tab-indented JSON it parses without errors and gives the node's line; for `order:\n  - path: drafts/a.md\n  - path: drafts/gone.md` it gives line 4, the line of `- path: drafts/gone.md`.
- **Test kit.** `compile-export-manuscript.kit.ts`: `STATIC_ROOT` line 16; `manuscriptLibrary` lines 20 to 45 (files under `book/`, with `putFile`); `withManuscript` lines 48 to 67; `getManuscript` line 70; `manuscriptOf` line 79; `storyGraph` lines 85 to 109 (kinds `scene` or `entity` only). `project-store-files.kit.ts` `putFile` lines 70 to 76 creates the folders (`mkdirSync(dirname(target), {recursive: true})`). `compile-export-manuscript.test.ts` lines 18 to 20: the `projectYaml` helper.
- **Existing preflight test.** `compile-export-preflight.test.ts`: line 70 (`toHaveLength(1)`), lines 71 to 76 (`checks[0]`), lines 119 to 121 (the whole list), line 164 (`checks[0].findings`). No other file in `apps/api/test` or `e2e` reads `checks`.
- **Boundaries.** `eslint.config.mjs` lines 27 to 60 govern imports between `src/modules/*` folders. Importing `@bbartolome/scriba-contracts/agent-loop` or `yaml` from compile-export is not governed. The new file must not import `apps/api/src/modules/agent-loop/*`.
- **Hash rule (run).** On 2026-11-19 with Node v26.13.0, for a plain text, a text with a BOM and CRLF, and a text with multi-byte characters: the `sha256:` of the bytes equals the `sha256:` of the text as `decodeText` decodes it.
- **Plans and branches.** The only non-done plans are `plans/CEX-06.md` (draft) and `plans/GRR-15.md` (planned). `git diff --stat main...unit/GRR-15` lists six files under `apps/web/src/app/features/graph-runner/` and `e2e/specs/graph-*.e2e.ts`. There is no `plans/CEX-07.md`, `plans/CEX-09.md` or `plans/CEX-18.md`, and no `unit/CEX-06`, `unit/CEX-07`, `unit/CEX-09` or `unit/CEX-18` branch.

### 2b. Assumed, not checked

- A1 CEX-07's shape. That CEX-07 may add `PreflightInput` fields is inferred from CEX-05 P10; its plan does not exist.
- A3 A model-produced `span` is usually in range. The schema checks only integers of at least 0. Out of range gives line 1 (P4).
- A4 `npm ci` and the contracts build run offline in the worktree (CEX-05's implementation did).
- A5 The test matchers used (`toEqual`, `toMatchObject`, `toHaveLength`) exist in the installed Vitest.
- A6 Nothing changes a file between the store read that gives the hash and the claim check. The check runs in one request.

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/manuscript.service.ts` | edit | `storyGraphs` (line 226): drop `private`; add `paths: string[]` to its return, pushed with each story graph (P2). `compose` unchanged |
| `apps/api/src/modules/compile-export/preflight-checks.ts` | edit | `PreflightFile.hash`; `PreflightInput.storyGraphs` and `readText` (P2); `export` on `lineOf` (P4); `import type { StoryGraph }` from `@bbartolome/scriba-contracts/graph-runner` |
| `apps/api/src/modules/compile-export/preflight.service.ts` | edit | keeps `hash` with the content; fills `storyGraphs` and `readText`; registers the two runners (P15) |
| `apps/api/src/modules/compile-export/preflight-claims-orphans.ts` | new | `unsupportedClaimsCheck` (Part A); `itemLine` and `orphanScenesCheck` (Part B); the messages of P8 |
| `apps/api/test/compile-export-claims-orphans.test.ts` | new | K1 and K2 (Part A); O1 to O4 (Part B) |
| `apps/api/test/compile-export-preflight.test.ts` | edit | lines 70 to 76 and 119 to 121 only (P17) |
| `plans/CEX-06.md` | this plan | none |

Not changed: the unit file (the orchestrator ticks its boxes at merge), `modules/`, `packages/contracts/`, `compile-export.module.ts` (P16), `markdown-text.ts`, the test kits, and `plans/DECISIONS.md`.

## 4. Method

Work in the worktree of branch `unit/CEX-06` that the orchestrator gives. Record `node -v` (v26.x) and `npm -v` beside each result. Do not push and do not open a pull request. Stop rule: if a regression fails in steps 4 to 13, revert that step, report, and do not continue. The implementer does not tick the unit's boxes.

0. **Preconditions.** `git diff --name-only 1e3dd26 -- apps/api/src/modules/compile-export apps/api/test packages/contracts` prints nothing, and `ls apps/api/src/modules/compile-export/preflight-claims-orphans.ts` fails. If CEX-07 merged first, the diff lists its files: re-read the cited lines of section 2a and keep its entries (section 7).
1. **Worktree.** `git -C <folder> branch --show-current` prints `unit/CEX-06`. Run steps 2 to 15 in that folder.
2. **Install and contracts.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
3. **Baseline.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. Record the file and test counts.
4. **Story-graph reader (P2).** In `manuscript.service.ts`, remove `private` from `storyGraphs`, add `paths: string[]` to its return type and value, and `paths.push(entry.path)` beside `graphs.push(parsed.data)`. Nothing else. Then `cd apps/api && npx vitest run test/compile-export-manuscript.test.ts test/compile-export-order.test.ts`. Expected: pass, with the counts of step 3.
5. **Input plumbing (P2, P4).** In `preflight-checks.ts`: `PreflightFile.hash: string`; `PreflightInput.storyGraphs: {path: string; graph: StoryGraph}[]` and `readText(path: string): string | undefined`; `export` on `lineOf`; the type import. In `preflight.service.ts`: read each entry once and keep its `content` and `hash`; `const { graphs, paths } = this.manuscript.storyGraphs(projectId)` zipped into `storyGraphs`; the `readText` closure (`try { return this.files.read(projectId, path).content; } catch { return undefined; }`); `const input = { projectId, view, files, storyGraphs, readText }`. No runner is added yet. Then `npx vitest run test/compile-export-preflight.test.ts`. Expected: pass, as in step 3.
6. **Claims runner (P3 to P9).** Create `preflight-claims-orphans.ts` with `unsupportedClaimsCheck` (id `unsupported-claims`). For each file of `input.files`, in order: (i) `text = input.readText(GROUNDING_ARTEFACT_PATH_PREFIX + file.path + GROUNDING_ARTEFACT_PATH_SUFFIX)`; `result` is the parsed artefact or `undefined` (P3). If `undefined`, add one info NOT_CHECKED (P9) and go on. (ii) If `result.contentHash !== file.hash`, add one info CHANGED (P9). (iii) For each claim: `unsupported` gives an error UNSUPPORTED, `weak` a warning WEAK, `supported` nothing; each has `path`, `ref` (P7) and the position of P4. Register: `PREFLIGHT_RUNNERS = [placeholdersCheck, unsupportedClaimsCheck]`. Then `npm run build -w @bbartolome/scriba-api`. Expected: exit 0.
7. **CEX-05 test edits (P17).** In `compile-export-preflight.test.ts`: C1 replaces `toHaveLength(1)` and the `checks[0]` reads (lines 70 to 71 and 76) with a lookup of the `placeholders` check by id; its findings assertions stay. C2 replaces lines 119 to 121 with two assertions: the `placeholders` entry equals `{id: 'placeholders', status: 'pass', findings: []}`, and every check's status is `pass`. C3 is unchanged. Then `npx vitest run test/compile-export-preflight.test.ts`. Expected: 3 pass.

   Note on C2: its clean fixture (`drafts/a.md`, `drafts/b.md`, no artefact) gets two NOT_CHECKED infos from `unsupported-claims`; info leaves the status `pass` (S7), so "every check passes" holds.
8. **Claims tests.** Create `apps/api/test/compile-export-claims-orphans.test.ts` with K1 and K2 (section 5). Expected: 2 pass.
9. **Format.** `npx prettier --write`, then `npx prettier --check`, on each changed or new file of section 3. Expected: exit 0.
10. **Part A regression.** `npx vitest run test/compile-export-order.test.ts test/compile-export-manuscript.test.ts test/compile-export-assembly.test.ts test/compile-export-preflight.test.ts test/compile-export-claims-orphans.test.ts`. Expected: every test passes.
11. **Orphan runner (P10 to P15).** Add `itemLine` (P10) and `orphanScenesCheck` (id `orphan-scenes`) to `preflight-claims-orphans.ts`: case (a) as P11, case (b) as P12, case (c) as P13, in the order of P14. Every finding has `path` and `line`. Register: `PREFLIGHT_RUNNERS = [placeholdersCheck, unsupportedClaimsCheck, orphanScenesCheck]`. Then `npm run build -w @bbartolome/scriba-api`. Expected: exit 0.
12. **Orphan tests.** Add O1 to O4 (section 5). Expected: 6 of 6 pass in that file. Then `npx prettier --check` on it and on `preflight-claims-orphans.ts`.
13. **API and root gates.** `npm run build -w @bbartolome/scriba-api`, `npm test -w @bbartolome/scriba-api`, `npm run lint -w @bbartolome/scriba-api`. From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0.
14. **Commit.** `git status --short` lists exactly the six code and test paths of section 3. Stage each by name (`git add -- <path>`), never `git add -A` or `git commit -a`. Commit with `feat(CEX-06): unsupported-claims and orphan-scenes checks`. Do not edit or tick the unit file.
15. **Fresh clone and record.** `git clone --branch unit/CEX-06 /Users/bbartolome/workspace/scriba-prototype <empty folder>`, then in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0. Store the versions and each command's output. A criterion is reported as passed only when its rows in section 5 hold.

## 5. Acceptance criteria and tests

The two criteria are unit lines 27 and 28, copied as written. Their tests are in `apps/api/test/compile-export-claims-orphans.test.ts`. Every test uses the kit's `withManuscript(files, run)`. The file has a local `postPreflight(app, cookie)`, as CEX-05's test file does, and parses each 200 body with `preflightResultSchema`. Local helpers write the artefact JSON (a `sha256:` of a text by `node:crypto`; passages as `{path: 'sources/notes.md', offset: 0, snippet}`) and the graph JSON (`JSON.stringify(graph, null, 2)` + newline; nodes inline with `label` and `position`, because the kit's `storyGraph` takes only `scene` and `entity`). Expected lines and offsets are computed in the test from the text it wrote (`indexOf`, and a local line count), never as literals: a node's line is the line of its `"id": "<id>"` text minus 1 (its opening `{`, section 2a); an order entry's line is the line of its `- path: <path>` text. Checks are looked up by id, never by index or count. Findings are compared with `toEqual` on `check`, `severity`, `path`, `line`, `message` and `ref`; `offset` and `length` are checked with `slice`.

| Criterion (unit line) | Test | What it asserts |
|---|---|---|
| "A claims-artefact fixture in the Agent loop's format yields `unsupported` → error, `weak` → warning, and a changed file → `info`." (27) | K1 "claims: unsupported is an error, weak a warning, a changed file an info" | `unsupported-claims` has status `fail` and exactly four findings in order: an error on `drafts/a.md` at line 1 (offset and length of the claim's text, UNSUPPORTED, `ref` `{text}`); a warning on `drafts/a.md` at line 3 (WEAK, `ref` `{text, passage}`); an info on `drafts/b.md` at line 1 (CHANGED, no offset); an error on `drafts/b.md` at line 1 (P6). The supported claim gives nothing. `orphan-scenes` has no findings. |
| (same criterion) | K2 "claims: a missing, unparseable or older-version artefact is not grounding-checked" | Status `pass`, with exactly three infos NOT_CHECKED at line 1, for `c`, `d` and `e` in that order, and none for `f`. |
| "Each orphan case (a), (b), (c) has a fixture producing the right severity; label-only nodes produce nothing." (28), case (a) | O1 "orphans (a): a scene or beat path that names no top-level manuscript file is a warning" | `orphan-scenes` has status `warn` and four warnings in node order, each with `path` `graphs/story.json`, the line of its node, and `ref` `{node, path}`: `sub` (`drafts/sub/x.md`), `gone` (`drafts/gone.md`), `versions` (`drafts/.versions/ch01.md`), `outside` (`notes/ideas.md`). None for `ch01` (resolves) or `hero` (entity). |
| (same), case (b) | O2 "orphans (b): a stale order entry is a warning" | Status `warn`, one warning: `path` `project.yaml`, the line of `- path: drafts/gone.md`, `ref` `{path: 'drafts/gone.md'}`; no case (c) finding (no graph). |
| (same), case (c) | O3 "orphans (c): a body file that no story node points at is info, and only with a story graph" | With the graph: status `pass`, one info on `drafts/ch02.md` at line 1; nothing for `drafts/front.md` (part `front`). Without the graph, same files: no `orphan-scenes` finding. |
| (same), label-only | O4 "orphans: label-only story nodes produce nothing" | `orphan-scenes` findings are `[]`. |
| CEX-05 criteria (CEX-05 unit lines 24 to 26) | C1, C2, C3 of `compile-export-preflight.test.ts`, as edited in step 7 | The placeholder findings are exact (C1); a clean fixture passes, every check's status is `pass`, the placeholders check is empty, and the revision and files are unchanged (C2); no model call (C3). |

**K1 fixture.** `drafts/a.md` is three lines: `Harbour traffic doubled in 1900.`, `The town has a river.` and `The bridge opened in 1931.`, each with a line end. `logs/grounding/drafts/a.md.json`: `schemaVersion` 1, `targetPath` `drafts/a.md`, `contentHash` the `sha256:` of the file's text, a `checkedAt` ISO time, a `runId` valid for `agentRunIdSchema`, and three claims with `text`, `span` (by `indexOf`), `verdict` and `reason`: "Harbour traffic doubled in 1900." (unsupported, no passage); "The town has a river." (supported, with a passage); "The bridge opened in 1931." (weak, with a passage). `drafts/b.md` is `The old mill burned.` Its artefact has the `contentHash` of `The old mill stood.` and one claim "The old mill stood." (unsupported, span 0 to 19, in range of the current text).

**K2 fixture.** `drafts/c.md` has no artefact. `drafts/d.md` has the artefact text `{ not json`. `drafts/e.md` has an otherwise valid artefact with `schemaVersion: 2`. `drafts/f.md` has a valid artefact with the matching hash and one supported claim.

**O1 fixture.** `drafts/ch01.md` and `drafts/sub/x.md` (a subfolder, not a member). `graphs/story.json`: `schemaVersion` 1, `view` `story`, `name`, `edges` `[]`, and the nodes in order: scene `ch01` path `drafts/ch01.md`; scene `sub` path `drafts/sub/x.md`; beat `gone` path `drafts/gone.md`; beat `versions` path `drafts/.versions/ch01.md`; scene `outside` path `notes/ideas.md`; entity `hero` path `entities/hero.md`.

**O2 fixture.** `drafts/ch01.md`. `project.yaml` with an `order` of `drafts/ch01.md` and then `drafts/gone.md`. No graph.

**O3 fixture.** Files `drafts/ch01.md`, `drafts/ch02.md` and `drafts/front.md`. `project.yaml` has the order entry `drafts/front.md` with `part: front`. Case 1 adds `graphs/story.json` with one scene `ch01` with path `drafts/ch01.md`. Case 2 has the same files and no graph.

**O4 fixture.** `drafts/ch01.md`. `graphs/story.json` with a scene `idea` and a beat `turn`, both without a path, and a scene `ch01` with path `drafts/ch01.md`.

## 6. Agreement with downstream units and later phases

- **CEX-09 (`blocked_by` names CEX-06, line 7).** Criterion line 22 ("right check id, severity, path and line"): every finding of both checks has a path and a line (S8, P4, P9, P11 to P13), so CEX-09 can write its fixtures from this plan. No change to CEX-09.
- **CEX-18 (preflight panel).** Lines 15 and 21: each finding links to `/projects/:projectId/files?path=…` with a line. Orphan findings link to an existing file at the defect (the node in the graph file, the entry in `project.yaml`, the body file). No change to CEX-18.
- **CEX-20 (line 27).** The unsupported-claims finding from the grounding-claims draft: the AGL-19 draft gives an error for claim 3 and a warning for claim 2 (`plans/AGL-19.md` section 5), which this plan emits, also after an edit of the draft (P6).
- **AGL-24 (compile tools).** Reads the checks as CEX-05's plan says. The ids and the status rule do not change.
- **AGL-01, AGL-16, AGL-17, AGL-19, AGL-20.** Read-only use of the artefact, its path rule and its hash.
- **GRR-01.** The story graph schema is used as it is; a node path that names no file is reported here (`plans/GRR-01.md` line 245).
- **CEX-05 (merged).** Its C1 and C2 change (P17); its criteria keep their text and meaning. Its input gains fields, as its P10 allows. Its decision "every finding carries path and line" is followed (S8).
- **Blockers.** `blocked_by` CEX-05, AGL-01, GRR-01 (all done); the `unblocks` of each names CEX-06, and this unit's `unblocks` (CEX-09) matches CEX-09's `blocked_by` (`units/README.md`, "Blocker notation").
- **Later phases.** GNP-19 reads the manuscript order, not preflight. No change.

## 7. Other plans on the same files

- **GRR-15 (planned).** Its branch changes six files under `apps/web/src/app/features/graph-runner/` and `e2e/specs/graph-*.e2e.ts`; none is a file of this plan. Both orders are correct.
- **CEX-07 (parallel, no plan).** Expected change: two runners appended to `PREFLIGHT_RUNNERS`, its runners in its own file, possibly new `PreflightInput` fields, its own tests.
  - CEX-06 first: CEX-07 rebases. In `preflight.service.ts` (the array, the `input` object) and `preflight-checks.ts` (the interfaces), keep both sides. CEX-07's tests must look up checks by id; a clean fixture of CEX-07 gets NOT_CHECKED infos from `unsupported-claims`, which leave its status `pass`.
  - CEX-07 first: CEX-06 rebases. Keep CEX-07's entries in the array and the input. Step 7 looks up by id, so C1 holds with five checks. C2's "every check passes" holds if CEX-07's checks pass on C2's clean fixture (no style profile gives an `info` pass, CEX-07 unit line 24; no entity reference). If CEX-07 edited the same lines of `compile-export-preflight.test.ts`, keep the by-id form once. C3 reads `checks[0]`, still the placeholders check.
  - Either order: the field names `hash`, `storyGraphs`, `readText` do not collide; the change to `ManuscriptService.storyGraphs` only adds a field.
- **Later units** (CEX-09, CEX-18, AGL-24) have no plans.

## 8. Open points (all settled by the reviser)

1. **Orphan lines. Settled: every orphan finding has a line, in this unit's scope.** CEX-05's decision (unit line 18) already requires `path` and `line` on every finding, so revision 1's P12 (no line) broke a decision this unit inherits. The unit says which defects are orphans, not which file the finding names, and CEX-01 P10 sets only the schema (D2). So (a) names the graph file at the node's line, (b) `project.yaml` at the entry's line, (c) the body file at line 1, with the named path in `ref` (P10 to P13). No downstream criterion changes.
2. **Module line 42. Settled: no disagreement.** "Never runs a graph (reads only story-graph `order` edges)" restricts graph use to reading, and the edges read to `order` edges. The merged view already reads every node's `path` under that text (`pairsOf`, lines 47 to 56), and module line 17 names GRR-01 for CEX-06. CEX-06 reads node kinds and paths (and the graph file's text for a line), reads no edge and runs nothing.
3. **Claims of a changed file. Settled: reported with the info (P6).** The unit's rules have no hash condition; reporting keeps CEX-20 demo step 3; K1 tests it.
4. **CEX-05 test edits. Settled: step 7 (P17).** Only the whole-list assertions change, to lookups by id; the CEX-05 criteria keep their text and meaning.

## 9. Review parts

One part per criterion area. Every step of section 4 is in exactly one part, and every test of section 5 is in exactly one part.

- **Part A (claims, plumbing, CEX-05 test edits).** Steps 0 to 10. Tests K1 and K2 (criterion 1, unit line 27) and C1 to C3 as edited in step 7. Files: `manuscript.service.ts`, `preflight-checks.ts`, `preflight.service.ts`, `preflight-claims-orphans.ts` (claims runner), `compile-export-claims-orphans.test.ts` (K1, K2), `compile-export-preflight.test.ts`. Review: every claim finding and info has a line (P4, P9); P6 holds; C1 and C2 keep their meaning and only change to lookups by id; no import from `modules/agent-loop`. No commit yet.
- **Part B (orphans, gates, commit).** Steps 11 to 15. Tests O1 to O4 (criterion 2, unit line 28). Files: `preflight-claims-orphans.ts` (`itemLine`, orphan runner), `compile-export-claims-orphans.test.ts` (O1 to O4). Review: each orphan finding's path and line are those of P11 to P13; expected lines are computed in the tests; the gates and the fresh clone exit 0; the commit of step 14 holds both parts and uses explicit paths.
