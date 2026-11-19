---
id: CEX-07
status: draft
---
# CEX-07 plan — entity links and banned phrases

Draft, revision 1, by the planner, at main `f425e3f` (working tree clean at the start). Unit: `units/CEX-07-entity-links-banned-phrases.md` (module compile-export, phase:assembly-preflight, M5). Blockers, both done: CEX-05 (`plans/CEX-05.md`, code `51d9271`) and GNP-03 (`plans/GNP-03.md`, `status: done`). The unit file has no change notes: its only commit is `2fed3f4` (its creation), and it has no "Moved to", "Loosened by", "Reworded by" or "Removed by revision" line. This plan changes no unit, module, contract or code, and writes nothing to `plans/DECISIONS.md`. The unit can be planned as written; section 8 lists the choices the orchestrator may want to overrule. None of them changes a criterion.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and the contracts

- **S1 Check ids and severities.** `entity-links` (its findings are errors) and `banned-phrases` (warnings), both in `PREFLIGHT_CHECK_IDS` (`packages/contracts/src/compile-export/constants.ts` lines 57 to 63). Source: unit lines 14 and 18 (`(38; error)`, `(39; warning)`); CEX-01 unit line 22.
- **S2 In-body references.** Every `[@id]` and `[@a; @b]` token in the body of each manuscript file, found with the Project store's `CITATION_PATTERN` (`packages/contracts/src/project-store/constants.ts` lines 6 to 8, unanchored, no `g` flag, so the scan adds `g`). Code is skipped. Source: unit line 15; `plans/CEX-01.md` line 296; `plans/PST-01.md` line 51 (D11).
- **S3 Front-matter links.** Every ID in a manuscript file's front-matter `links`. Source: unit line 15.
- **S4 Resolution.** Each ID must resolve through the Project store's resolution, `EntitiesService.resolve` (`apps/api/src/modules/project-store/entities.service.ts` lines 34 to 65). An ID with no entity and an ID with two or more are both unresolved, so both are errors. Source: unit line 15; the Project store's own comment at `entities.service.ts` lines 34 to 35 ("An id with no valid entity, or with two or more, is an error").
- **S5 Markdown links and images.** A project-relative link or image target must resolve to an existing file inside the project; a target outside the project is an error. Source: unit line 16.
- **S6 Banned phrases.** The style profile is the entity that `project.yaml` names in `styleProfile` (`packages/contracts/src/project-store/project.ts` line 25). Its `bannedPhrases` is a list of strings (`packages/packs/core/entity-types/style-profile.yaml` lines 5 and 16 to 21: `folder: entities`, `bannedPhrases`). Matching is case-insensitive, whole-phrase, whitespace-normalised, skips code, and reports every occurrence with its location. Source: unit lines 19 and 20; `plans/GNP-03.md` D2, D3 and D7.
- **S7 No style profile.** The check passes with an `info` note. Source: unit line 20; criterion 2 (unit line 24).
- **S8 Location.** Every finding carries `path` and `line`, and `offset` and `length` where useful. Source: CEX-05 unit line 18; `plans/CEX-05.md` S2; `plans/CEX-06.md` (revision 2) S8.
- **S9 Status.** Any error fails a check, else any warning warns it, else it passes; `info` does not change the status. Source: `plans/CEX-05.md` P8; `CHECK_STATUSES` and `FINDING_SEVERITIES` (`constants.ts` lines 66 to 69).
- **S10 Model-free, writes nothing, never blocks.** Source: CEX-05 unit lines 20 and 21; module line 55.
- **S11 File access and reserved paths.** Reads go through the Project store's in-process API. Preflight never reads `drafts/.versions/` (module lines 41 and 42). The store's reserved prefixes are in `packages/contracts/src/project-store/constants.ts` lines 17 to 20.
- **S12 Test seam.** External behaviour through HTTP, the composed app and a temp library. The mock OpenAI server only proves that no model is called. Source: module lines 57 to 59.

### 1b. Settled by earlier plans, units and DECISIONS

- **D1 Runners and registry.** A runner is `{id, run(input)}`, synchronous. `PREFLIGHT_RUNNERS` holds them in array order, and CEX-07 appends its two. The input may gain fields that the service fills. Source: `plans/CEX-05.md` P9 and P10.
- **D2 Positions and the body.** The body is `splitFrontMatter(content).body`, `bodyStart = content.length - body.length`, and `line` is 1 plus the line terminators before `offset` (`lineOf`). Front matter is not prose. Source: `plans/CEX-05.md` P4 and P5.
- **D3 Code.** `maskCode` blanks fenced and inline code and keeps offsets and line terminators (`apps/api/src/modules/compile-export/markdown-text.ts` lines 93 to 105). The file's header requires one fence rule (lines 1 and 2). Source: `plans/CEX-05.md` P2 and P3.
- **D4 Comments.** HTML comments are not skipped, as `plans/CEX-05.md` open point 5 decides for placeholders.
- **D5 In-process resolution.** The Project store's resolution is named by PST-08 as the consumer's route: `plans/PST-08.md` line 156 ("Needs in-process resolution of `[@id]` citations and of front-matter `links`"). `EntitiesService` is exported by `ProjectStoreModule` (`apps/api/src/modules/project-store/project-store.module.ts` lines 27 and 75), which `CompileExportModule` already imports (`apps/api/src/modules/compile-export/compile-export.module.ts` line 3). `AssemblyService` already injects it (`assembly.service.ts` lines 18 and 56).
- **D6 Link base.** Project-root relative. The export passes `--resource-path` = the project root (CEX-10 unit line 18), and the assembled manuscript has no file folder to resolve against.
- **D7 Inside the project.** The Project store's path rule decides it. `resolveProjectPath` refuses a leading `/` (`apps/api/src/modules/project-store/path-safety.ts` line 132), a `..` segment (line 137), empty segments, and reserved paths (line 148). `FilesService.list` skips dot-entries (`files.service.ts` line 568).
- **D8 No DECISIONS entry** sets a rule for these two checks. `grep -n 'CEX-07' plans/DECISIONS.md` finds lines 2264, 2268, 2273 and 5045, all in PST-01 and GNP-11 review notes about the citation pattern. PST-01's plan settled it as the unanchored `CITATION_PATTERN` of S2.

### 1c. Planner's choices (the simplest option the sources allow)

- **P1 Files.** One new runner file, `preflight-links-phrases.ts`, holds both runners and their messages (the CEX-05 P1 layout). One new test file, `compile-export-links-phrases.test.ts`. The edits of section 3. No module change.
- **P2 Input.** `PreflightInput` gains one field, `reads: PreflightReads`, with three members: `projectYaml` (the text of `project.yaml`, read by the service with `files.read`), `resolveIds(ids)` (`EntitiesService.resolve(projectId, ids)`), and `targetOf(path)` (P7). One field keeps the edit small for the merge with CEX-06 (section 7).
- **P3 One mask, NUL fill.** The body is masked once with `maskCode(body, '\u0000')`. `maskCode` gains an optional `fill` parameter whose default is `' '`, so CEX-05's output is unchanged. A space fill would let the phrase "in order" match the text "in `x` order" across a removed code span. A scratch check (section 2a) gave one match with the space fill and none with NUL.
- **P4 Entity references.** `new RegExp(CITATION_PATTERN.source, 'g')` runs on the masked body. Each `@id` inside a token is one occurrence: `offset` at its `@`, `length` the id's length plus 1, `ref` `{id}`. The scan does not call `citationIds` (open point 2).
- **P5 Front-matter links.** `splitFrontMatter(content).yaml` is parsed with the `yaml` package's `parseDocument`. A parse error means no front-matter findings (open point 3). `yamlStart` is the offset just after the first line terminator of `content`, which is correct with a BOM. An item with source range `[start, end]` has `offset = yamlStart + start` and `length = end - start`. A missing or null `links` gives nothing. A `links` value that is not a list, or a list item that is not a string, gives an error `LINKS_INVALID` at its own range.
- **P6 Markdown links and images.** On the masked body, two patterns: inline destinations `/\]\(([^)\s]*)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g` (an image `![alt](x)` contains `](`, so one pattern covers both), and reference definitions `/^ {0,3}\[[^\]\n]+\]:[ \t]*(\S+)/gm`. A destination is skipped when it is empty, starts with `#` or `//`, or has a scheme (`/^[a-zA-Z][a-zA-Z0-9+.-]*:/`). Otherwise the target is the destination before its first `?` or `#`, and `targetOf` decides it. `file` gives nothing; `missing` gives an error `LINK_MISSING`; `refused` gives an error `LINK_REFUSED`. `offset` is where the destination text starts, `length` its length as written, `ref` `{target}`.
- **P7 `targetOf`.** A private method of `PreflightService`, which returns a closure with a cache per run keyed by parent folder. The target is split at its last `/` (the parent is `.` at the root). `files.list(projectId, {path: parent})` is called once per parent. A `ModuleError` with code `NOT_FOUND` (`files.service.ts` lines 237 to 240) gives `missing`; any other `ModuleError` (the store's path refusals, D7) gives `refused`. Otherwise the entry whose last path segment equals the name and whose `kind` is `file` gives `file`, and anything else gives `missing`. `list` is called only when a link exists.
- **P8 Messages.** Fixed texts; no target, id or phrase is written in a message (`plans/CEX-05.md` P6). Their values are in section 4, step 7 and step 10.
- **P9 Style profile.** `reads.projectYaml` is parsed. (a) No `styleProfile` key, or a null value: one `info` `NO_PROFILE` at `project.yaml` line 1. (b) A value that is not a string: one warning `PROFILE_UNUSABLE` at its line. (c) A string id: `resolveIds([id])`. If it gives one entity of type `style-profile`, its front matter's `bannedPhrases` is either absent (no phrases) or an array of strings (each trimmed, empty ones dropped), and those are the phrases. Anything else (unresolved, duplicate, another type, a non-list or non-string value) gives one warning `PROFILE_UNUSABLE` at the value's line (`lineOf(projectYaml, valueNode.range[0])`), and no phrase findings (open point 1).
- **P10 Phrase pattern.** `(?<![\p{L}\p{N}_])` + the phrase's words, each escaped, joined by `\s+` + `(?![\p{L}\p{N}_])`, with flags `giu`. A scratch check (section 2a) found `game\nchanger` and `Game-Changer`, and did not find `game-changers` or `game-changeré`.
- **P11 Phrase findings.** Per file, every match of every phrase, sorted by offset. Each has severity `warning`, `offset = bodyStart + match.index`, `length` the match length, `line = lineOf(content, offset)`, `ref` `{phrase}`, and the message BANNED.
- **P12 Order.** Within a file, findings are sorted by offset, so front matter comes first. The files are in view order.
- **P13 Registry.** With CEX-07 alone: `PREFLIGHT_RUNNERS = [placeholdersCheck, entityLinksCheck, bannedPhrasesCheck]`. With CEX-06 too, the final array is in the contract order (section 7).
- **P14 CEX-05 test edits.** The same meaning as CEX-06's plan P17: C1 looks up the `placeholders` check by id; C2 requires that entry to equal `{id: 'placeholders', status: 'pass', findings: []}` and every check's status to be `pass`.
- **P15 Errors.** No new error code. The active-project check of `PreflightService` is unchanged.
- **P16 Tests look up by id.** Checks are found by id, never by index. Positions are checked as `text.slice(offset, offset + length)` on the text the test wrote.

## 2. Facts checked and facts assumed

### 2a. Checked

- **Unit.** `units/CEX-07-entity-links-banned-phrases.md`: front matter lines 1 to 10 (`blocked_by` line 7: CEX-05 and GNP-03; `parallel_with` line 8: CEX-06; `unblocks` line 9: CEX-09); "Broken entity links" lines 14 to 16; "Banned phrases" lines 18 to 20; criteria lines 22 to 24. No change notes (`git log --oneline -- units/CEX-07-entity-links-banned-phrases.md` lists `2fed3f4` only).
- **Module.** `modules/compile-export.md` line 3 (one manuscript from `drafts/`), line 39 (module shape), line 41 (file access through the Project store's in-process API), line 42 (never `drafts/.versions/`, never runs a graph, never calls a model), line 43 (membership), line 55 (preflight is model-free), lines 57 to 59 (testing principles and the primary seam).
- **Contracts.** `compile-export/constants.ts` lines 57 to 63 (`PREFLIGHT_CHECK_IDS` already lists `entity-links` and `banned-phrases`), 66 and 69 (`FINDING_SEVERITIES`, `CHECK_STATUSES`). `compile-export/preflight.ts` lines 15 to 24 (finding: `path` is `projectPathSchema`, `line` optional at line 19, `ref` a record). `project-store/constants.ts` lines 6 to 8 (`CITATION_PATTERN`: unanchored, no `g`) and 17 to 20 (reserved prefixes). `project-store/entities.ts` lines 31 to 47 (`entityResolutionSchema`: `resolved` with `id`, `type`, `path`, `content`; `errors` with `code` `unknown` or `duplicate`) and line 77 (type export). `project-store/files.ts` lines 15 to 20 (`fileEntrySchema`: `path`, `kind` `file` or `dir`). `project-store/project.ts` line 25 (`styleProfile` is an entity reference). `project-store/index.ts` line 6 (exports `entities.js`).
- **Style profile and examples.** `packages/packs/core/entity-types/style-profile.yaml` line 2 (`kind: style-profile`), line 5 (`folder: entities`), lines 16 to 21 (`bannedPhrases` is an array of strings, required). `examples/nonfiction/project.yaml` has no `styleProfile` key (`grep -c styleProfile` prints 0).
- **Store (read).** `entity-manifest.ts` line 16 (`ENTITY_ROOTS` `entities` and `sources`), line 148 (in-memory cache, no writes), line 204 (`readText`, the full text), line 296 (a `sources/` file without `type` gets `source`). `entities.service.ts` line 17 (class), lines 34 to 35 (the rule for unknown and duplicate IDs), line 36 (`resolve`), lines 68 to 79 (`projectFor`, which calls `requireActive`). `files.service.ts` line 232 (`list`), lines 237 to 240 (`NOT_FOUND` for a missing folder), lines 257 to 270 (`read` reads the disk each time; `hash` at 268), line 568 (`collect` skips dot-entries). `path-safety.ts` line 118 (`resolveProjectPath`), line 132 (leading `/` refused), line 137 (`..` refused), line 148 (reserved refused). `platform/errors/module-error.ts` line 3 (`code`).
- **Preflight code (merged CEX-05, unchanged on main).** `preflight-checks.ts`: `PreflightFile` lines 10 to 15, `PreflightInput` lines 17 to 22, `PreflightRunner` lines 24 to 28, `lineOf` lines 33 to 36, `placeholdersCheck` lines 38 to 64. `preflight.service.ts`: imports lines 1 to 21 (`ModuleError` at line 11; `FilesService` and `ProjectStoreService` at lines 13 to 15), `PREFLIGHT_RUNNERS` line 26, `statusOf` lines 28 to 33, constructor lines 38 to 42 (`store`, `files`, `manuscript`), `run` lines 44 to 61, `input` line 53, `activeProjectId` lines 63 to 74.
- **Markdown helpers.** `markdown-text.ts`: header lines 1 and 2; `INLINE_CODE` line 14; `CITATION` line 15 (the same pattern as the contract, as a local copy); `CITED_ID` line 16; `splitFrontMatter` lines 22 to 55; `fencedLines` lines 57 to 84; `withoutFences` lines 86 to 91; `maskCode` lines 93 to 105; `citationIds` lines 107 to 121 (returns a set of ids, no positions, and removes inline code rather than masking it).
- **Module wiring.** `compile-export.module.ts` line 3 (imports `ProjectStoreModule`), line 14 (imports list), lines 16 to 21 (providers include `PreflightService`), line 22 (exports). `assembly.service.ts` lines 17 to 21 (imports `EntitiesService` at line 18), line 56 (`private readonly entities: EntitiesService`), lines 166 to 170 (`this.entities.list`). The precedent for injecting `EntitiesService` into a compile-export service.
- **Test kit and CEX-05 tests.** `compile-export-preflight.test.ts`: `postPreflight` lines 26 to 35; C1 fixture lines 37 to 63; C1 test from line 65 (`toHaveLength(1)` at line 70, `checks[0]` reads at lines 71 to 74 and 76); C2 lines 106 to 127 (the whole-list assertion at lines 119 to 121); C3 lines 129 to 171 (`checks[0].findings` at line 164). `compile-export-manuscript.kit.ts`: `manuscriptLibrary` lines 20 to 45, `withManuscript` lines 48 to 67 (the callback gets the library path as its third argument). `project-store-files.kit.ts` `putFile` lines 70 to 77 (creates the folders). `guard-request.ts`: `send` line 27, `sessionCookie` line 80.
- **Other plans and branches.** `plans/CEX-06.md` on main is revision 2 (`status: planned`, commit `f425e3f`); its shared-file changes are in section 7. `plans/GRR-15.md` is `status: planned`. The branch `unit/GRR-15` has 5 commits and changes 6 files under `apps/web/` and `e2e/specs/`, none of them a file of this plan. `unit/CEX-06` is at main with no commits of its own. CEX-09 is the only unit whose `blocked_by` names CEX-07 (`units/CEX-09-assembly-preflight-gate.md` line 7). `plans/GNP-11.md` line 229 and `plans/AGL-19.md` line 120 agree with the behaviour for the sample and the draft; `plans/PLT-22.md` line 175 agrees on `links`.
- **Scratch checks (outside the repo, in `/tmp/cex07-check`).**
  - `yaml` 2.9.1 (the root `node_modules`, the version `apps/api` pins): for `title: One\r\nlinks: [ada, ghost]\r\n`, `doc.get('links', true)` is a sequence whose items have `range` `[20, 23, ...]` and `[25, 30, ...]`; with `yamlStart` taken after the first terminator of a BOM and CRLF text, `content.slice(yamlStart + start, yamlStart + end)` gives `ada` and `ghost`. A scalar `links` (`links: ghost`) is not a sequence (`isSeq` is false), as P5 needs. A null `links` value was not run (P5 treats it as no links; the implementer checks it).
  - Phrase pattern (P10): `game changer` finds `game\nchanger`; `game-changer` finds `Game-Changer`; `game-changers` and `game-changeré` find nothing.
  - Fill (P3): `'in `x` order'` with the code replaced by three spaces matches `in order` once; with three NUL characters it matches zero times.
  - Citations: `[@a] [@b; @nobody] [ch01] [@Bad]` with the contract pattern and `g` gives `@a`, `@b` and `@nobody`, and no match for `[ch01]` or `[@Bad]`.
  - Links: `![Map](assets/map.png)`, `[x](../out.md "t")`, `[h](#sec)` and `[q](https://e.org/a)` give destinations `assets/map.png`, `../out.md`, `#sec` and `https://e.org/a`. Reference definitions `[1]: assets/a.png` and `  [two]:   notes.md "t"` give `assets/a.png` and `notes.md`; a line `not [x]: y` gives nothing.

### 2b. Assumed, not checked

- A1 The Vitest matchers used (`toEqual`, `toMatchObject`, `toHaveLength`) exist in the installed Vitest, as `plans/CEX-06.md` A5 assumes.
- A2 Nest resolves `EntitiesService` for `PreflightService` with the module as it is. `AssemblyService` does the same, and the first test run confirms it.
- A3 `EntityManifest` picks up an entity file written between two requests. Its cache (`entity-manifest.ts` line 148) is keyed by path and each slot keeps the `mtimeMs` and `size` it was parsed at. Test B1 writes the style profile before its second request, and the test checks it.
- A4 A NUL character inside a string literal passes ESLint and Prettier.
- A5 Listing a folder for each link target is fast enough for a manuscript. Not measured.
- A6 How Pandoc resolves a target written with `%` escapes. Not checked (open point 4).

## 3. Files to change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/markdown-text.ts` | edit | `maskCode(text, fill = ' ')` (P3). The default output is unchanged |
| `apps/api/src/modules/compile-export/preflight-checks.ts` | edit | `export` on `lineOf` (the same line CEX-06 writes); types `LinkTarget` and `PreflightReads`; `reads: PreflightReads` in `PreflightInput` (P2); the type import of `EntityResolution` |
| `apps/api/src/modules/compile-export/preflight.service.ts` | edit | constructor gets `EntitiesService`; `reads` and the private `targetOf` (P2, P7); `input` gets `reads`; imports; `PREFLIGHT_RUNNERS` gets `entityLinksCheck` and `bannedPhrasesCheck` (P13) |
| `apps/api/src/modules/compile-export/preflight-links-phrases.ts` | new | `entityLinksCheck` (id `entity-links`), `bannedPhrasesCheck` (id `banned-phrases`), their messages and helpers |
| `apps/api/test/compile-export-links-phrases.test.ts` | new | E1 (criterion 1, Part A) and B1 (criterion 2, Part B) |
| `apps/api/test/compile-export-preflight.test.ts` | edit | lines 70 to 76 and 119 to 121 only (P14) |
| `plans/CEX-07.md` | this plan | none |

Not changed: `compile-export.module.ts` (P1 and D5), `manuscript.service.ts`, `markdown-text.ts` beyond the `fill` parameter, the test kits, the unit file (the orchestrator ticks its boxes at merge), `modules/`, `packages/contracts/`, and `plans/DECISIONS.md`.

## 4. Method

Work in the worktree of branch `unit/CEX-07` that the orchestrator gives, so that the main working tree is not switched. Record `node -v` (v26.x) and `npm -v` beside each result. Do not push and do not open a pull request. Stop rule: if a regression fails in steps 4 to 14, revert that step, report, and do not continue. The implementer does not tick the unit's boxes.

Part A (steps 0 to 9): the helpers, the entity-links runner, the wiring, the CEX-05 test edits and E1. Part B (steps 10 to 16): the banned-phrases runner, B1, the gates and the commit.

0. **Preconditions.** `git diff --name-only f425e3f -- apps/api/src/modules/compile-export apps/api/test packages/contracts` prints nothing, and `ls apps/api/src/modules/compile-export/preflight-links-phrases.ts` fails. If CEX-06 merged first, the diff lists its files: re-read the cited lines of section 2a and keep its entries (section 7). If main has moved, re-read the cited lines.
1. **Worktree.** `git -C <folder> branch --show-current` prints `unit/CEX-07`. Run steps 2 to 16 in that folder.
2. **Install and contracts.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
3. **Baseline.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. Record the file and test counts.
4. **Mask parameter (P3).** In `markdown-text.ts`, change `maskCode` to `maskCode(text: string, fill = ' ')`. Its two `/[^\r\n]/g` replacements use `fill`. Update its comment in one line. Then `cd apps/api && npx vitest run test/compile-export-order.test.ts test/compile-export-manuscript.test.ts test/compile-export-assembly.test.ts`. Expected: every test passes, with the counts of step 3.
5. **Types and `lineOf` (P2).** In `preflight-checks.ts`: `export function lineOf(text: string, offset: number): number {`; `export type LinkTarget = 'file' | 'missing' | 'refused';`; the interface `PreflightReads` with `projectYaml: string`, `resolveIds(ids: string[]): EntityResolution` and `targetOf(path: string): LinkTarget`; `reads: PreflightReads;` in `PreflightInput`; `import type { EntityResolution } from '@bbartolome/scriba-contracts/project-store'`. No runner changes. Then `npx vitest run test/compile-export-preflight.test.ts`. Expected: pass, with the counts of step 3.
6. **Service wiring (P2, P7).** In `preflight.service.ts`: add `EntitiesService` to the import from `../project-store/project-store.module`; add `private readonly entities: EntitiesService` to the constructor; import `type FileEntry` from `@bbartolome/scriba-contracts/project-store` and `type LinkTarget` and `type PreflightReads` from `./preflight-checks`. In `run`, after `files`: `const reads: PreflightReads = { projectYaml: this.files.read(projectId, 'project.yaml').content, resolveIds: (ids) => this.entities.resolve(projectId, ids), targetOf: this.targetOf(projectId) };` and `const input = { projectId, view, files, reads };`. Add the private method `targetOf(projectId: string): (path: string) => LinkTarget` (P7). No runner is registered yet. Then `npx vitest run test/compile-export-preflight.test.ts`. Expected: pass, with the counts of step 3.
7. **Entity-links runner (P4 to P6, P12).** Create `preflight-links-phrases.ts` with `entityLinksCheck`, id `entity-links`. Its `run`, for each file in order: (i) the body, `bodyStart` and the masked body (P3, with NUL); (ii) the front-matter items (P5); (iii) the citation occurrences (P4); (iv) the Markdown destinations (P6), calling `reads.targetOf` only for destinations that pass the skip rules. Collect the unique ids of (ii) and (iii) and call `reads.resolveIds` once when there are any. Each id is unknown, duplicate or resolved. Then produce the findings: an unknown id gives an error with the message `Entity reference names no entity.`; a duplicate gives an error with `Entity reference names more than one entity.`; an invalid front-matter `links` value gives an error with `The links in the front matter must be a list of entity IDs.`; `missing` gives an error with `Link or image names no file in the project.`; `refused` gives an error with `Link or image does not name a file inside the project.`. Sort each file's findings by offset. Register in `preflight.service.ts`: `PREFLIGHT_RUNNERS = [placeholdersCheck, entityLinksCheck]`. Then edit `compile-export-preflight.test.ts` as P14: C1 replaces `toHaveLength(1)` (line 70) and the `checks[0]` reads (lines 71 to 76) by a lookup of the `placeholders` check by id, and its findings assertions stay; C2 replaces lines 119 to 121 by the two assertions of P14. Then `npx vitest run test/compile-export-preflight.test.ts`. Expected: 3 pass.
8. **E1 test.** Create `apps/api/test/compile-export-links-phrases.test.ts` with E1 (section 5), and its local `postPreflight` helper as in `compile-export-preflight.test.ts` lines 26 to 35. Expected: 1 pass.
9. **Part A regression.** `npx vitest run test/compile-export-order.test.ts test/compile-export-manuscript.test.ts test/compile-export-assembly.test.ts test/compile-export-preflight.test.ts test/compile-export-links-phrases.test.ts`. Expected: every test passes.

10. **Banned-phrases runner (P9 to P11).** Add `bannedPhrasesCheck`, id `banned-phrases`, to `preflight-links-phrases.ts`. Its `run`: the style profile of P9 from `reads.projectYaml` and `reads.resolveIds`; the phrase pattern of P10; the findings of P11 per file, sorted. The messages are `Banned phrase left in the text.` (warning), `No style profile is set in project.yaml, so banned phrases were not checked.` (info, at `project.yaml` line 1) and `The style profile gives no usable bannedPhrases list, so banned phrases were not checked.` (warning, at the value's line in `project.yaml`). Register: `PREFLIGHT_RUNNERS = [placeholdersCheck, entityLinksCheck, bannedPhrasesCheck]`. Then `npx vitest run test/compile-export-preflight.test.ts`. Expected: 3 pass. C2's clean fixture has no style profile, so its `banned-phrases` status is `pass`.
11. **B1 test.** Add B1 (section 5) to `compile-export-links-phrases.test.ts`. Expected: 2 of 2 pass in that file.
12. **Format.** `npx prettier --write` on each code or test file of section 3, then `npx prettier --check` on the same files. Expected: exit 0.
13. **API gates.** `npm run build -w @bbartolome/scriba-api`, `npm test -w @bbartolome/scriba-api` (the whole suite, including Setup & auth's invariant sweeps), `npm run lint -w @bbartolome/scriba-api` (the PLT-09 boundaries). Expected: each exits 0.
14. **Root gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0.
15. **Commit.** `git status --short` lists exactly the six code and test paths of section 3: `markdown-text.ts`, `preflight-checks.ts`, `preflight.service.ts`, `preflight-links-phrases.ts`, `compile-export-links-phrases.test.ts` and `compile-export-preflight.test.ts`. Stage each by name, never `git add -A` or `git commit -a`. Commit with `feat(CEX-07): entity-links and banned-phrases checks`. Do not edit or tick the unit file.
16. **Fresh clone and record.** `git clone --branch unit/CEX-07 /Users/bbartolome/workspace/scriba-prototype <empty folder>`, then in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0. Store the Node and npm versions and each command's output. A criterion is reported as passed only when its row in section 5 holds.

## 5. Acceptance criteria and tests

The two criteria are unit lines 23 and 24, copied as written. Each has one test in `apps/api/test/compile-export-links-phrases.test.ts`. Both run the composed app with `withManuscript(files, run)`, and parse each 200 body with `preflightResultSchema`. Checks are found by id (P16). The CEX-05 criteria keep their tests, edited as P14.

| Criterion (unit line) | Test (file, name) | What it asserts |
|---|---|---|
| "Fixtures with an unknown `[@id]`, a multi-citation with one bad ID, a bad `links` entry, a missing image and an outside-project link each produce an error at the right line." (23) | E1 "entity links: unknown, duplicate and outside references, a bad links entry and a missing image are errors at their lines" | Fixture below. `entity-links` has status `fail` and exactly the seven errors listed below, in this order. Each has `path` `drafts/ch01.md`, the given `line`, `text.slice(offset, offset + length)` equal to the given slice, and the given message. `ada` (lines 3, 7 and 9) and `assets/cover.png` (line 11) give nothing. |
| "A banned phrase split across a line break is found; occurrences in code are not; no style profile gives an `info` pass." (24) | B1 "banned phrases: a split phrase is found, code is not scanned, and no style profile is an info pass" | Fixture below, one library and three requests in order. (a) No `styleProfile`: `banned-phrases` has status `pass` and exactly one finding: `info`, `path` `project.yaml`, `line` 1, the NO_PROFILE message. (b) With `styleProfile: house-style`: status `warn`, exactly three warnings at lines 3, 6 and 7, whose slices are `game\nchanger`, `Game Changer` and `unlock your potential`. None in the inline or fenced code, and none for `Game changers`. (c) With `styleProfile: ghost`: status `warn`, exactly one warning, `path` `project.yaml`, `line` 4, the PROFILE_UNUSABLE message, and no phrase finding. |
| CEX-05 criteria (CEX-05 unit lines 24 to 26) | C1, C2 and C3 of `compile-export-preflight.test.ts`, C1 and C2 as edited in step 7 | C1: the placeholder findings are exact. C2: the clean fixture passes (every check's status is `pass`), the placeholders entry is empty, and nothing is written. C3: no model call. |

**E1 fixture.** Files, in the kit's keys (under `book/`): `entities/ada.md` is `---`, `type: person`, `---`, `Ada Lovelace.`. `entities/bob.md` is `---`, `type: person`, `---`, `Bob.`. `sources/bob.md` is `Bob's notes.` with no front matter (a `sources/` file gets type `source`, `entity-manifest.ts` line 296), so `bob` is a duplicate id. `assets/cover.png` is `cover` (text stands in for an image). `drafts/ch01.md` is these lines, with line ends:

```text
1  ---
2  title: One
3  links: [ada, ghost]
4  ---
5  # One
6  
7  Ada wrote it [@ada].
8  Nobody knows [@ghost].
9  Two of them [@ada; @nobody].
10 Duplicate [@bob].
11 ![Cover](assets/cover.png)
12 ![Map](assets/missing.png)
13 See [the notes](../outside.md).
14 [ref]: assets/gone.png
15 Use [ref].
```

Expected `entity-links` errors, in order: line 3 `ghost` (`links`, unknown); line 8 `@ghost` (unknown); line 9 `@nobody` (unknown); line 10 `@bob` (duplicate); line 12 `assets/missing.png` (missing); line 13 `../outside.md` (refused); line 14 `assets/gone.png` (missing, a reference definition).

**B1 fixture.** `project.yaml` is written by the kit by default (no `styleProfile`). Then the test writes the file with `putFile` (`project-store-files.kit.ts` line 70) as the steps need. The three versions of `project.yaml` are: the default; `schemaVersion: 1`, `title: Book`, `genrePack: nonfiction`, `styleProfile: house-style` (line 4); and the same with `styleProfile: ghost`. `entities/house-style.md` (written before step b) is `---`, `type: style-profile`, `tone: Plain and direct`, `targetLength: 800`, `bannedPhrases: [game changer, unlock your potential]`, `---`, `Say what the evidence shows.`. `drafts/a.md` is these lines, with line ends:

```text
1  # Chapter one
2  
3  This is a game
4  changer, the editor said.
5  
6  Game Changer again.
7  You can unlock your potential.
8  
9  Inline `game changer` is code. Game changers and changer alone are not the phrase.
10 
11 ```text
12 unlock your potential
13 ```
```

Line 3 and line 4 hold the split phrase; line 9 and lines 11 to 13 are code (inline and fenced) and must give nothing.

## 6. Agreement with downstream units and later phases

- **CEX-09 (gate, `blocked_by` names CEX-07, line 7).** Its criterion "each of the five checks has a fixture ... right check id, severity, path and line" (unit line 22) is met by E1 (`entity-links`, errors) and B1 (`banned-phrases`, warnings), each finding with a `path` and a `line` (S8). Its clean fixture passes both checks: `banned-phrases` gives an `info` for a project with no style profile, which keeps the status `pass` (S9). No change to CEX-09.
- **CEX-18 (preflight panel, unit lines 15 and 21).** Every finding has a file and a line. The `info` of B1 step (a) sits at `project.yaml` line 1, which the panel links like any other finding. No change.
- **AGL-24 (compile tools, `plans/CEX-05.md` section 5).** It reads the checks by id and by the status rule; the two ids added here are the ones `PREFLIGHT_CHECK_IDS` already lists. No change.
- **CEX-10 (export, `plans/CEX-05.md` section 5).** It derives its preflight counts from `checks`. The new errors and warnings count as the unit says (preflight never blocks, S10).
- **CEX-04 (done).** `citationIds` is not changed and not called (open point 2). `markdown-text.ts` gains only the optional `fill` parameter, whose default keeps its output.
- **CEX-05 (done).** Its output of `maskCode` with the default fill is unchanged. Its C1 and C2 are edited (P14), and its three criteria keep their text and meaning. Its runner input gains one field, as its P10 allows.
- **GNP-03 (done).** Its style-profile entity (folder `entities`, `type: style-profile`, a list of strings in `bannedPhrases`) is what this check reads (S6). Its plan line 155 says "A list of strings"; P9 keeps that rule.
- **GNP-11 (sample).** `examples/nonfiction/project.yaml` names no `styleProfile` (section 2a), so the sample's banned-phrases check is an `info` pass, as `plans/GNP-11.md` line 229 says.
- **PST-08 (done) and PST-01 (done).** This plan uses `EntitiesService.resolve` (`plans/PST-08.md` line 156) and the unanchored `CITATION_PATTERN` as settled (`plans/PST-01.md` line 51). Neither changes.
- **AGL-19 (draft).** It has no entity reference and no banned phrase, so it passes both checks, as `plans/AGL-19.md` line 120 says.
- **Module.** The check is model-free, never reads `drafts/.versions/` (the store refuses it as reserved), never runs a graph, and reads only through `list`, `read` and the entity resolver (module lines 41, 42 and 55).

## 7. Other plans on the same files

- **CEX-06 (`plans/CEX-06.md`, revision 2 on main, `status: planned`).** Its changes to the shared files: `manuscript.service.ts` (`storyGraphs` becomes public and also returns `paths`; this plan does not touch that file); `preflight-checks.ts` (`PreflightFile.hash`; `PreflightInput.storyGraphs` and `readText`; `export` on `lineOf`; `import type StoryGraph`); `preflight.service.ts` (the `files` map keeps the hash; the `storyGraphs` and `readText` fields; the `input` object; `PREFLIGHT_RUNNERS` gets `unsupportedClaimsCheck` and `orphanScenesCheck`; an import line); `compile-export-preflight.test.ts` (lines 70 to 76 and 119 to 121, P17). Its new file, `preflight-claims-orphans.ts`, and its test file do not overlap with this plan.
- **CEX-07 (this plan), the same files.** `markdown-text.ts` (not touched by CEX-06); `preflight-checks.ts` (the identical `lineOf` line, the types, and the `reads` field); `preflight.service.ts` (the constructor, the `reads` object, `targetOf`, the `input` object, `PREFLIGHT_RUNNERS`, and import lines); `compile-export-preflight.test.ts` (the same lines, same meaning).
- **Either merge order is correct.**
  - Textual conflicts are expected in `preflight-checks.ts` (the `PreflightInput` interface and the import block), in `preflight.service.ts` (the import block, the `input` object and the `PREFLIGHT_RUNNERS` line), and in `compile-export-preflight.test.ts` (lines 70 to 76 and 119 to 121). Keep both sides in each case.
  - The `lineOf` edit is the identical text, so it merges without conflict.
  - No name collides. CEX-06 adds `hash`, `storyGraphs` and `readText`; CEX-07 adds `reads`, with `targetOf` as a private method. `manuscript.service.ts` changes only in CEX-06.
  - The registry ends as `[placeholdersCheck, unsupportedClaimsCheck, orphanScenesCheck, entityLinksCheck, bannedPhrasesCheck]`, the order of `PREFLIGHT_CHECK_IDS`. If CEX-07 merges first, CEX-06 inserts its two entries after `placeholdersCheck`, not at the end. No test depends on the order beyond `checks[0]`, which stays the placeholders check in both orders (CEX-05 C3).
  - The test edits have the same meaning, so the second merge keeps the by-id form once. CEX-06's clean fixture (C2) has no link and no style profile, so both new checks pass on it, and CEX-06's K and O tests look up their checks by id, so the new checks do not affect them.
  - CEX-06 first: CEX-07 rebases. CEX-07 first: CEX-06 rebases, and its step 0 names the files it finds.
- **GRR-15 (`status: planned`, branch `unit/GRR-15`).** Its branch changes 6 files under `apps/web/` and `e2e/specs/` (section 2a). None is a file of this plan. Both orders are correct.

## 8. Open points

The unit can be planned as written. The points below are choices the unit does not settle. Each is decided in this plan so that the work can start; the orchestrator may overrule any of them, and none changes a criterion.

1. **A style profile that names nothing usable (P9; B1 step c).** Unit lines 19 and 20 do not say what happens when `styleProfile` names no entity, a non-style-profile entity, or a `bannedPhrases` that is not a list of strings. This plan gives one `banned-phrases` warning at the line of the `styleProfile` key, and no phrase findings. The alternative is an error on `entity-links`, because a missing entity is a broken reference. Recommendation: the warning, because the rule is about banned phrases and the warning names the line to fix. A change moves one branch of `bannedPhrasesCheck` and step (c) of B1.
2. **`citationIds` is not called (P4).** `plans/CEX-04.md` line 156 asks CEX-07 to call `citationIds`, and `plans/CEX-05.md` line 140 repeats it. This plan does not, because `citationIds` returns a set without positions, and it removes inline code instead of masking it. So for `[@a`x`]` it finds `a`, while the code splits the token and the text has no citation. This plan scans the masked body with the contract's `CITATION_PATTERN`. The cost is two copies of the pattern (the contract, and `markdown-text.ts` line 15). Recommendation: keep this rule. The alternative is to give `citationIds` positions, which changes merged CEX-04 code.
3. **Front matter that cannot be read (P5).** A draft whose front matter is not valid YAML gives no front-matter findings, so its `links` are never checked, and the unit is silent. A `links` value that is not a list gives `LINKS_INVALID`. Recommendation: report an unparseable front matter as one error at line 1, so that a broken file is not a silent pass. That is one more message and one more test case, and it is not in the unit, so the orchestrator decides.
4. **Link syntax this check does not read (P6).** A destination with a space (`[x](my file.md)`) is not read and gives no finding. A `%` escape is not decoded, so `my%20file.md` is reported missing when the file has a space in its name. A destination in `<…>` is not read. Whether Pandoc decodes `%20` is not checked here. Recommendation: accept these for v1, and say so in the check's notes.

## 9. Review parts

Two parts. Every step of section 4 is in exactly one part, and every test of section 5 is in exactly one part.

- **Part A (helpers, entity links, CEX-05 test edits).** Steps 0 to 9. Test E1 (criterion 1, unit line 23) and the CEX-05 tests C1 to C3 as edited in step 7. Files: `markdown-text.ts`, `preflight-checks.ts`, `preflight.service.ts`, `preflight-links-phrases.ts` (entity links only), `compile-export-links-phrases.test.ts` (E1), `compile-export-preflight.test.ts`. Review: `maskCode` output is unchanged with the default fill (the regression of step 9); every entity-link and link finding has a path, a line and the slice of section 5; `targetOf` never reads outside the project; the CEX-05 tests keep their meaning, and only the list lookups change; no import from another module's internals.
- **Part B (banned phrases, gates, commit).** Steps 10 to 16. Test B1 (criterion 2, unit line 24). Files: `preflight-links-phrases.ts` (banned phrases), `compile-export-links-phrases.test.ts` (B1). Review: the phrase pattern follows P10 (case, whole phrase, whitespace across a line break); code gives nothing (fill NUL, P3); the no-profile case is an `info` with status `pass`; the gates and the fresh clone exit 0; the commit of step 15 holds both parts and uses explicit paths.
