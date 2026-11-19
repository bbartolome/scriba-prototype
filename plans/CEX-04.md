---
id: CEX-04
status: draft
---
# CEX-04 plan — assembled Markdown: metadata block, matter placement, front-matter stripping, dedication and bibliography

Draft, planner's revision 1, written at main `dc98b20` (the tree was clean). Unit: `units/CEX-04-assembled-markdown.md` (module compile-export, phase:assembly-preflight, M5). Its blockers are merged and `done`: CEX-02 (`plans/CEX-02.md` line 3; commit `05c582f`), GNP-03 (`plans/GNP-03.md` line 4), SAU-09 (`plans/SAU-09.md` line 3; commit `4b97515`). The unit has no notes section (it ends at line 37), so no recorded change applies. The plan changes no criterion, no module file and no unit file, and marks nothing passed. Section 6 lists the points left for the orchestrator.

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the module, the contracts and DECISIONS

- **S1 Document order.** Six parts, in this order: the generated YAML metadata block; the front matter files; the dedication, if set; the body files; the back matter files; the generated bibliography, if enabled. Source: unit lines 18 to 24.
- **S2 Per-file front matter.** Each file's own YAML front matter is stripped. Files are joined with blank lines, so every file starts a new block. Source: unit line 25.
- **S3 No injected headings.** Chapter structure comes from the author's headings. Compile adds only the generated "Bibliography" heading. Source: unit line 26.
- **S4 Matter classes.** Front and back matter files get Pandoc's `.unnumbered` class, so they stay out of chapter numbering. The writers place them per format. Source: unit line 27; module line 51.
- **S5 Title page and dedication** come from the export settings. No new folder. Source: unit line 28; module line 51.
- **S6 Export settings** are read from `project.yaml` with read-time defaults and never written back. `author` falls back to Setup & auth's preference reader, then to nothing. Source: unit line 29; module line 51; `packages/contracts/src/project-store/order-export.ts` line 36 (the defaults comment); `packages/contracts/src/project-store/project.ts` line 26 (the `export` key).
- **S7 Bibliography.** On by default for the `nonfiction` pack. Modes: `all` (the default when on), `cited`, `off`. Entries come from Source entities, rendered from `citation`, plus `url` when present, sorted alphabetically by citation. No citeproc or CSL in v1. Source: unit line 30; `packages/contracts/src/compile-export/constants.ts` lines 51 and 52 (`BIBLIOGRAPHY_DEFAULT`, `BIBLIOGRAPHY_DEFAULT_BY_PACK`).
- **S8 Notes.** The author's Markdown footnotes are passed through. Nothing is added. Source: unit line 31.
- **S9 Internal builder.** The unit adds no HTTP route. The builder is tested through a test-only route or the in-process service. The `md` export is CEX-10. Source: unit line 32; module lines 40 and 58 (external behaviour only).
- **S10 Order and membership** come from the manuscript view, not from a second algorithm: front in order-field order, then body in effective order, then back in order-field order. Source: module lines 49 to 52; CEX-02 plan P20 (line 64) and P24 (line 68).
- **S11 File access** goes through the Project store's in-process file API, not `fs`. The builder never reads `drafts/.versions/`, never runs a graph and never calls a model. Source: module lines 41 and 42.
- **S12 No event, no contract change.** The builder publishes no event. It changes no contract and adds no dependency. Source: module line 44 (the events belong to other units); CEX-01 plan section 4 (the names used here already exist).
- **S13 Front-matter rule.** The Shell's rule, option A of the SHL-11 decision: Pandoc's block shape plus the YAML-shape guard. The decision names CEX-04 as a recipient (`plans/DECISIONS.md` lines 3462 and 3466). Line 3467 says Pandoc's own stripping need not match, so this plan does not use Pandoc's rule. The algorithm is CEX-02's P16 (`plans/CEX-02.md` line 60; `apps/api/src/modules/compile-export/word-count.ts` lines 22 to 43). Open point 3 asks whether S13 stands for CEX-04.
- **S14 Empty string is unset** for the author. Source: `apps/api/src/modules/setup-auth/setup-preferences.reader.ts` line 6 (its comment); `plans/SAU-09.md` section 6, open point 3 (line 136), which hands this rule to CEX-04's planner.
- **S15 Module boundary.** Modules import each other only through entry files (`eslint.config.mjs` lines 40 and 50). CEX-02's imports are the pattern (`apps/api/src/modules/compile-export/manuscript.service.ts` lines 24 to 28).
- **S16 Dependencies.** None added. `yaml` 2.9.1 and `zod` ^4 are already in `apps/api/package.json` (lines 20 and 21).
- **S17 Testing.** External behaviour only; Markdown checked against a golden; unit tests never read `examples/` (module lines 58 and 60; the Testing bullet of the units README Conventions section; `plans/SAU-09.md` D15, line 37, on the examples-check rule).

### 1b. Planner's choices (the simplest option the sources allow)

- **P1 Files.** One pure helper file for Markdown text (`markdown-text.ts`), one pure rendering file (`assembly.ts`) and one service (`assembly.service.ts`). The front-matter and fence helpers that CEX-02 keeps private move into `markdown-text.ts`, and `word-count.ts` imports them. A copy would give the module two front-matter rules.
- **P2 Front-matter helper.** `splitFrontMatter(text)` returns `{yaml, body}`. The rule is CEX-02's P16, moved unchanged. `yaml` is the text between the fences when the block passes the guard, and undefined otherwise. `body` is the text after the block with leading blank lines removed, or the whole text with any BOM removed when there is no block. This is the same result `bodyOf` gives today.
- **P3 Body text.** A file's body is copied as written, with trailing whitespace removed. HTML comments, links and code are kept, because the unit names no rule for them. A body that is empty after stripping adds no block.
- **P4 Joining.** Blocks are joined with one blank line. The document ends with one newline.
- **P5 Wrappers.** A front or back file is wrapped as a fenced div: `::: {.unnumbered}` on its own line, the body, then `:::` on its own line. The dedication is wrapped the same way with `{.unnumbered .unlisted}`. No heading is added for either. Whether Pandoc honours these attributes on divs is ASSUMED (section 7b, A2).
- **P6 Metadata block.** Keys in this order: `title`, `subtitle`, `author`, `lang`, `date`, `rights`, `identifier`, `contact`, `wordcount`. `lang` is the key Pandoc reads for the unit's "language" (ASSUMED, section 7b, A1). Each string is a JSON string literal, which is a valid YAML double-quoted scalar. `wordcount` is a bare integer. `title`, `lang`, `date`, `identifier` and `wordcount` are always written. The other keys are left out when unset.
- **P7 Metadata values.** `subtitle`, `rights` and `contact` come from the export settings; empty or absent means unset. `author` is the export value, then `PreferencesReader.read().authorName`, with empty meaning unset (S14), then left out. `lang` is the export `lang`, then `EXPORT_LANG_DEFAULT` (`constants.ts` line 54). `identifier` is `urn:scriba:<projectId>` (open point 5). `date` is the UTC calendar date of the `now` argument, as `YYYY-MM-DD`. `title` is the `title` of `project.yaml`. `wordcount` is `totals.body` of the view, rounded to the nearest 1,000.
- **P8 Bibliography mode.** The export's `bibliography` value when set; otherwise the value of the `BIBLIOGRAPHY_DEFAULT_BY_PACK` entry whose key equals the project's `genrePack` (found with `Object.entries`, so a key inherited from the prototype never matches); otherwise `BIBLIOGRAPHY_DEFAULT`.
- **P9 Bibliography block.** Written when the mode is not `off`: the heading `# Bibliography {.unnumbered}`, then one paragraph per entry, with blank lines between them. An entry is the citation, followed by a space and the `url` when present. The heading stays when no entry matches. Entries are sorted by citation in JavaScript string order (CEX-02 P2). Mode `all` lists every Source with a citation. Mode `cited` lists the Sources whose id is in the cited set (P10).
- **P10 Cited set.** The ids in `[@id]` and `[@a; @b]` (the pattern of `CITATION_PATTERN`, `packages/contracts/src/project-store/constants.ts` line 7) in the body of every manuscript file, front, body and back. Front matter, fenced code and inline code are removed first. Code is skipped because CEX-05 (its line 19) and CEX-07 (its line 15) skip it. The scanner is `citationIds(text)` in `markdown-text.ts`. Open point 2 covers provenance.
- **P11 Source fields.** `EntitiesService.list(projectId, {type: 'source'})` gives the Source ids and paths, sorted by path. Each Source's file is read with `FilesService.read`, its YAML (P2) is parsed with `parseDocument`, and `citation` and `url` are kept when they are strings. A Source with no usable `citation` is open point 1.
- **P12 Clock.** `assemble(now: Date): string` takes the time as an argument and is synchronous, as the services it calls are. CEX-10 passes the export time. The test passes a fixed date.
- **P13 Errors.** No active project: `PROJECT_NO_ACTIVE` (409), as CEX-02 P6. A `project.yaml` that fails `projectYamlSchema.safeParse`: `PROJECT_INVALID` (422) with a fixed message, as CEX-02 P7. Store refusals (too new, too large, not text) propagate unchanged. No `COMPILE_` code is used. The empty-manuscript refusal, `COMPILE_EMPTY_MANUSCRIPT`, belongs to CEX-10, which checks it before it calls this builder.
- **P14 Test seam.** A probe module defined in the test file, following the pattern of `plans/SAU-09.md` D14. Its route `GET /api/compile-export-probe/assembled` returns `{markdown}` from `AssemblyService.assemble(FIXED_NOW)`. The test boots it with `modules: [...COMPOSED_MODULES, AssemblyProbeModule]`. Nothing of the probe ships.
- **P15 Golden.** Inline in the test file. No golden file is written.

## 2. Files to create or change

Only the paths below change. `packages/contracts/**`, `apps/api/src/app.module.ts`, `apps/api/test/invariant-sweep.ts`, `apps/api/test/compile-export-manuscript.kit.ts`, the Project store, the Setup & auth module, every `package.json` and `package-lock.json` do not change. `manuscript.service.ts` (CEX-02) does not change either.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/compile-export/markdown-text.ts` | new | `splitFrontMatter` (P2); `withoutFences`, moved from `word-count.ts` lines 11 to 12 and 45 to 70; `citationIds` (P10) |
| `apps/api/src/modules/compile-export/word-count.ts` | edit | Moves the lines that only `splitFrontMatter` and `withoutFences` use (lines 3 to 12 and 18 to 70) into `markdown-text.ts`. Keeps the regexes that `countWords` uses (lines 13 to 16) and `countWords` (lines 72 to 82). `countWords` imports `splitFrontMatter` and `withoutFences`. Results do not change |
| `apps/api/src/modules/compile-export/assembly.ts` | new | Pure rendering, no I/O: `renderMetadata` (P6), `renderBibliography` (P9), `renderDocument` (P4, P5) |
| `apps/api/src/modules/compile-export/assembly.service.ts` | new | `AssemblyService.assemble(now: Date): string`, the reads of section 3, step 5. It is the only file that reads for assembly |
| `apps/api/src/modules/compile-export/compile-export.module.ts` | edit | adds `SetupAuthModule` (from `../setup-auth/setup-auth.module`) to `imports`; `AssemblyService` to `providers` and `exports`. Nothing else |
| `apps/api/test/compile-export-assembly.test.ts` | new | tests C1 to C3 (section 4), with the probe module of P14. The file does not name the examples folder |

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/CEX-04`, created from main. Record `node -v` (expected `v26.x`, root `engines`) and `npm -v` beside each result. Do not push and do not open a pull request.

0. **Preconditions.** `git status --short` prints nothing. `git diff --name-only dc98b20 -- apps/api/src/modules/compile-export apps/api/src/modules/setup-auth apps/api/src/modules/project-store packages/contracts apps/api/test` prints nothing. If it prints anything, re-read the lines this plan cites for those files before going on. `git switch -c unit/CEX-04`. Expected: `Switched to a new branch 'unit/CEX-04'`.
1. **Install and contracts.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
2. **Baseline.** `npm test -w @bbartolome/scriba-api`. Expected: exit 0. Record the file and test counts.
3. **Helpers (P1, P2, P10).** Create `markdown-text.ts` with `splitFrontMatter`, `withoutFences` and `citationIds`. Edit `word-count.ts` as section 2 says. Then `cd apps/api && npx vitest run test/compile-export-manuscript.test.ts`. Expected: six pass. Its C5 pins the counts through the moved helpers. Stop rule: if any test fails, revert this step, report, and do not continue.
4. **Rendering (P4 to P9).** Write `assembly.ts` as pure functions over plain values. It takes the metadata values, the entries' bodies and the bibliography entries, and returns the Markdown text.
5. **Service (P7, P8, P11, P13).** Write `assembly.service.ts`, `assemble(now)`, in this order: (a) the active project id (P13); (b) `project.yaml` read through `FilesService.read(id, 'project.yaml')`, parsed with `parseDocument(...).toJS()` and checked with `projectYamlSchema.safeParse` (P13); (c) `PreferencesReader.read()`; (d) `ManuscriptService.view()`, for the entries and `totals.body`; (e) each entry's file read with `FilesService.read`, its body taken with `splitFrontMatter` and trailing whitespace removed, grouped by `part` in view order; (f) the bibliography mode (P8), and when the mode is `cited`, `citationIds` over the bodies of step (e); when the mode is not `off`, the Sources (P11), read with `FilesService.read` and parsed; (g) rendering with `assembly.ts`. Return the string. Use `parseDocument` from `yaml`, as `manuscript.service.ts` line 3 does.
6. **Module.** Edit `compile-export.module.ts` as section 2 says. Expected: one new import line, and `AssemblyService` in `providers` and in `exports`.
7. **Tests.** Write `compile-export-assembly.test.ts` with C1 to C3 (section 4). Do not write the name of the examples folder in it.
8. **Format.** `npx prettier --write` on the new and changed files of section 2, then `npx prettier --check` on the same files. Expected: exit 0. (`plans/` is in `.prettierignore`, line 3.)
9. **New tests.** `cd apps/api && npx vitest run test/compile-export-assembly.test.ts`. Expected: three pass. Then `npx vitest run test/compile-export-manuscript.test.ts`. Expected: six pass. If `test/compile-export-order.test.ts` is on main by then (CEX-03), run it too.
10. **API gates.** `npm run build -w @bbartolome/scriba-api`, `npm test -w @bbartolome/scriba-api` (the whole API suite, including the Setup & auth invariant sweeps), `npm run lint -w @bbartolome/scriba-api` (the PLT-09 boundaries). Expected: each exits 0.
11. **Root gates.** From the root: `npm run build`, `npm test` (the workspaces, then `scripts/*.test.mjs`), `npm run lint` (the workspaces, `lint:examples`, `lint:packs` and `prettier --check .`). Expected: each exits 0.
12. **Commit.** Before committing, `git diff --cached --stat` must list exactly the section 2 paths. Stage each path by name (`git add -- <path>`), never `git add -A` or `git commit -a`. Commit with `feat(CEX-04): assembled Markdown builder with metadata, matter, dedication and bibliography`.
13. **Fresh clone.** Clone the branch into an empty folder (`git clone --branch unit/CEX-04 /Users/bbartolome/workspace/scriba-prototype <tmp>`), then in it `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0.
14. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its row in section 4 holds.

## 4. Acceptance criteria and tests

The three criteria are unit lines 35 to 37, copied as written. Each has one test in `apps/api/test/compile-export-assembly.test.ts`. Every test boots `createTestApp({libraryDir, staticRoot: STATIC_ROOT, modules: [...COMPOSED_MODULES, AssemblyProbeModule]})` on a library from the kit's `manuscriptLibrary` (kit line 20), takes the cookie with `sessionCookie`, and sends with `send` (`guard-request.ts` line 27), `host: LOOPBACK_HOST` and, for POSTs, `origin: LOOPBACK_ORIGIN` (`invariant-sweep.ts` lines 38 and 39). It closes the app and removes the library in a `finally`. The probe's `markdown` is the value under test. The command for all three is `cd apps/api && npx vitest run test/compile-export-assembly.test.ts`.

| Criterion (unit line) | Test | Pass condition |
|---|---|---|
| "The assembled document has the metadata block, matter in the right places and no per-file front matter (golden Markdown for a fixture project)." (35) | C1 "assembled document: metadata block, matter placement, no per-file front matter" | The probe's `markdown` equals the golden below exactly. |
| "Bibliography `all` lists every Source; `cited` lists only cited ones; `off` omits the heading." (36) | C2 "bibliography: all, cited, off, and the nonfiction default" | Four libraries, one per case below. Each case's output matches its check exactly. |
| "`author` falls back to the preference reader when unset." (37) | C3 "author: falls back to the preference reader when unset, and an empty value is unset" | Five cases below. Each case's `author:` line in the metadata block matches. |

**C1 fixture.** `project.yaml`: `schemaVersion: 1`, `title: Book`, `genrePack: nonfiction`, and `export` with `subtitle: A Short Study`, `author: A. Writer`, `contact: 12 Lane Road`, `rights: Copyright A. Writer`, `dedication: For Sam.`, `bibliography: off`; and `order` with `drafts/preface.md` at `part: front` and `drafts/notes.md` at `part: back`. Files:

- `drafts/preface.md`: a front matter block with `title: Preface front matter`, then the line `Front words.`
- `drafts/a.md`: a front matter block with `title: Chapter one front matter`, then `# Chapter one`, a blank line, and `Body text one.`
- `drafts/b.md`: `# Chapter two`, a blank line, and `Body text two.` followed by one space and `<FILLER>`.
- `drafts/notes.md` (part back): a front matter block with `status: draft`, then `Back note.`

`<FILLER>` is `word` repeated 600 times, joined by single spaces (`Array(600).fill('word').join(' ')`). The body total is 5 words in `a.md` and 605 in `b.md`, so 610, which rounds to `wordcount: 1000`. The probe's fixed date is `new Date('2026-11-19T12:00:00Z')`. Expected `markdown`, exactly, with one final newline:

````text
---
title: "Book"
subtitle: "A Short Study"
author: "A. Writer"
lang: "en"
date: "2026-11-19"
rights: "Copyright A. Writer"
identifier: "urn:scriba:book"
contact: "12 Lane Road"
wordcount: 1000
---

::: {.unnumbered}
Front words.
:::

::: {.unnumbered .unlisted}
For Sam.
:::

# Chapter one

Body text one.

# Chapter two

Body text two. <FILLER>

::: {.unnumbered}
Back note.
:::
````

No `---` line of a file's own front matter appears in the output. The `bibliography: off` setting keeps the `Bibliography` heading out.

**C2 fixture.** The `drafts/a.md` body is `# Chapter one`, a blank line, `See [@gamma]. Inline` followed by the code span `[@alpha]` and `here.`, a blank line, then a fenced block (three backticks, language `text`) holding the line `[@beta]`. Three Sources, each a file in `sources/` with a front matter block of `type: source` and a `citation`: `sources/alpha.md` (citation `Alpha, A. (2001). Title one.`, url `https://example.com/one`); `sources/beta.md` (citation `Beta, B. (2002). Title two.`, no url); `sources/gamma.md` (citation `Gamma, C. (2003). Title three.`, no url). Four `project.yaml` variants, each with `title: Book` and `genrePack: nonfiction`: `export.bibliography: all`; `cited`; `off`; and no `export` key (the nonfiction default).

- `all` and the default: the output ends with the block `# Bibliography {.unnumbered}`, a blank line, `Alpha, A. (2001). Title one. https://example.com/one`, a blank line, `Beta, B. (2002). Title two.`, a blank line, `Gamma, C. (2003). Title three.`, and one final newline.
- `cited`: the output ends with `# Bibliography {.unnumbered}`, a blank line, and `Gamma, C. (2003). Title three.` only. `alpha` appears only in inline code and `beta` only in fenced code, so neither is cited.
- `off`: the output contains no `Bibliography` text.

**C3 fixture.** `project.yaml` with `title: Book` and `genrePack: nonfiction`, and `drafts/a.md` as `# One`, a blank line, `Text.`. Preferences are set through `POST /api/setup-auth/preferences` (JSON body, origin, cookie). Each case uses its own library:

- (i) no export author; preference `authorName` `Ada`: `author: "Ada"`.
- (ii) export `author` `A. Writer`; preference `Ada`: `author: "A. Writer"`.
- (iii) export `author` empty (`""`); preference `Ada`: `author: "Ada"`.
- (iv) no export author; preference `authorName` empty (`""`): no `author:` line.
- (v) no export author; no preferences stored: no `author:` line.

## 5. Downstream agreement and other plans

- **CEX-02 (done, merged at `05c582f`).** Consumed: the view's entries (`path`, `part`), `totals.body` and the order. The only CEX-02 file this plan changes is `word-count.ts`, by a move that keeps results. CEX-02's C5 and the rest of its suite pin the results (step 3).
- **CEX-03 (draft, `plans/CEX-03.md`).** Both plans edit `compile-export.module.ts` (CEX-03 section 2, the row for that file at line 51; CEX-03 section 5, line 117). Merge rule: keep the imports, providers and exports of both. CEX-03 writes only the `order` key. This plan reads the view after any write, so its assembly order equals the view's order. The files otherwise do not overlap. CEX-03's open points OP-1 and OP-2 (lines 128 to 138) do not reach this plan.
- **CEX-05 (parallel, `units/CEX-05-preflight-endpoint-placeholders.md` line 8).** Its preflight runs over the assembled manuscript files in effective order (its line 18). It may reuse `splitFrontMatter` and `withoutFences` from `markdown-text.ts`. The module rule above applies to its module edit too. Whichever of CEX-04 and CEX-05 merges second uses the first one's helpers and writes no second copy.
- **CEX-07 (`units/CEX-07-entity-links-banned-phrases.md` line 15).** Its `[@id]` check skips code, as this plan's `citationIds` does. CEX-07 should call `citationIds`, so the two rules cannot drift.
- **CEX-09 (gate, `units/CEX-09-assembly-preflight-gate.md` line 7).** Needs CEX-04's criteria on main. `AssemblyService` is exported from `CompileExportModule`, so the gate's in-process service may list it.
- **CEX-10 (export, `units/CEX-10-pandoc-runner-md-export.md` line 7).** Its `md` output is `AssemblyService.assemble(exportTime)` (its line 19). It checks for an empty manuscript (`COMPILE_EMPTY_MANUSCRIPT`, its line 18) before it calls this builder, because the builder does not refuse an empty manuscript. Its `md` golden can use the C1 fixture. It publishes `export-finished` (its line 20); this plan publishes nothing.
- **CEX-11 (DOCX, `units/CEX-11-docx-export.md` lines 16 and 20).** Reads the metadata keys `title`, `subtitle`, `author`, `date`, `contact` and `wordcount` (P6). The contact block and the rounded word count are not Pandoc title-block fields (ASSUMED, section 7b, A3). How they appear on the title page is CEX-11's design, not this plan's.
- **CEX-12 (EPUB, `units/CEX-12-epub-export.md` lines 15 and 19).** Its title, author, language and identifier are this block's `title`, `author`, `lang` and `identifier`. CEX-12 must not write a second identifier.
- **CEX-14 (`units/CEX-14-template-overrides-settings.md` line 15).** Writes the `export` key. This plan reads it at assembly time with the same defaults. No conflict.
- **CEX-08 (sample, `units/CEX-08-nonfiction-sample-order.md` line 16).** Adds the sample's author and dedication to the export settings. Open point 6 concerns the sample's outline.
- **GNP-03 (`plans/GNP-03.md` section 5, the CEX-04 hand-off at line 154).** Its names `citation` and `url` are used as they are. The hand-off's open case, a Source with no citation, is open point 1. The sample sources now carry a `citation` (GNP-11, commit `36d5b42`).
- **SAU-09 (`plans/SAU-09.md` section 5, line 120; section 6, open point 3, line 136).** This plan imports `PreferencesReader` from the entry file and treats an empty string as unset (S14).
- **Other plans with status draft or planned.** `plans/GRR-13.md` and `plans/TRG-17.md` (both `planned`, line 3 of each) are the only ones besides this plan and CEX-03. GRR-13's file table (lines 144 to 153) lists only `apps/web` paths; it reads the graph-runner contract (line 25). TRG-17 names `apps/api/test/packs/` (line 47) and `apps/api/package.json` (line 59), but edits no compile-export, Project store, Setup & auth or contract path. There is no overlap with this plan in either merge order.
- **Blocker consistency.** CEX-04's `blocked_by` (unit line 7) and `unblocks` (unit line 9) agree with the other units: CEX-02 (line 9), SAU-09 (line 9) and GNP-03 (line 9) list CEX-04 in `unblocks`, and CEX-09 (line 7) and CEX-10 (line 7) list it in `blocked_by`. `parallel_with` (unit line 8) agrees with CEX-03 (line 8) and CEX-05 (line 8). No unit file needs a change.

## 6. Open points

None of these is settled here. Each one changes a criterion, a settled module decision, or a content decision of another unit, so each is left for the orchestrator. Until one is decided, the code stops at the case the point covers and reports it. It does not guess.

1. **A Source with no usable `citation`.** Such a case is a `sources/` file with no front matter (PST-08 counts it as a Source, `units/PST-08-entity-resolution.md` lines 18 and 20), a front matter block without `citation`, or a `citation` that is not a string. Options: (a) list it, with its title or, when it has none, its file id as the entry text; (b) leave it out of every mode; (c) refuse the export with a 422 that names the file. Criterion 2 says "`all` lists every Source", which only (a) meets. (b) and (c) change the criterion's meaning.
2. **Provenance in `cited`.** The unit's "cited" also covers the file's draft provenance "where available" (unit line 30). Provenance is stored on the pending change, not in the file (`packages/contracts/src/agent-loop/provenance.ts` line 5), and this plan finds no link from a file to its pending changes. Options: (a) the body `[@id]` references only (the tests of this plan); (b) also `sourcesUsed` from the provenance of the pending changes that wrote the file, while they are still recorded. Criterion 2 depends on the answer.
3. **Malformed front matter, and whether S13 stands for CEX-04.** A block between `---` fences that fails the YAML-shape guard stays in the output, where Pandoc may read it as metadata. Options: (a) keep S13 as written, so the block stays; (b) follow Pandoc, which strips any block between the fences (prose can be lost); (c) refuse the export with a 422 that names the file. Criterion 1's "no per-file front matter" means (a) only for valid front matter, and (b) or (c) for every file.
4. **`penName`.** The export settings have `penName` (`order-export.ts` line 39), but the unit's metadata list (line 19) and its export-settings rule (line 29) do not use it. Options: (a) not emitted (this plan's choice); (b) used as the byline when set, with `author` as the fallback for the other use. Option (b) changes what `author` means in criterion 3.
5. **The stable identifier.** The unit asks for "a stable id derived from the project" (line 19). This plan uses `urn:scriba:<projectId>`, where the project id is the folder name (`packages/contracts/src/project-store/project.ts` lines 9 to 11). Renaming the folder changes the id. Options: (a) keep this derivation; (b) store a generated id in `project.yaml` when the project is made. (b) needs a new `project.yaml` key, which is outside this unit's narrowing (CEX-01).
6. **The sample's outline in the default bibliography.** `examples/nonfiction/sources/outline.md` is a Source with the citation "The author's working outline for this book" (lines 3 and 4). Under the default `all` it is listed. DECISIONS 2026-11-16 (the GNP-11 planner's revision, item 4, line 5043) left this to CEX-04's planner. The unit's default is unchanged here, so this plan needs no decision on it. Options: (a) keep, so the outline is listed; (b) CEX-08 sets `bibliography: cited` in the sample's export settings; (c) the outline is not a Source (a GNP-11 or CEX-08 content change). The owner is CEX-08's planner or the orchestrator.

## 7. Facts checked and facts assumed

### 7a. CHECKED

- **Repository.** Branch `main`; `git status --short` clean at the start. `git diff --stat 2fd25bb HEAD` lists only `plans/DECISIONS.md` (21 added lines, the TRG-17 and GRR-13 entries of 2026-11-19). The base was first read at `2fd25bb`; the facts below hold at `dc98b20`.
- **Plan statuses.** `plans/CEX-03.md` line 3 `draft`; `plans/GRR-13.md` line 3 `planned`; `plans/TRG-17.md` line 3 `planned`; `plans/CEX-01.md`, `plans/CEX-02.md` (line 3), `plans/GNP-03.md` (line 4) and `plans/SAU-09.md` (line 3) `done`. No `plans/CEX-04.md` existed before this plan, and no `plans/CEX-08.md` exists (`ls plans`).
- **Unit.** `units/CEX-04-assembled-markdown.md`: lines 7 to 9 (`blocked_by`, `parallel_with`, `unblocks`); line 15 (Why); lines 17 to 32 (Decisions: metadata list 18 to 24, stripping 25, headings 26, classes 27, title page 28, export settings 29, bibliography 30, notes 31, builder 32); lines 34 to 37 (criteria). The file has no notes section.
- **Unit context.** `units/CEX-02-effective-order-view-model.md` lines 27 to 29 (word counts), 32 (view model); `units/CEX-05-preflight-endpoint-placeholders.md` lines 8, 18, 19; `units/CEX-07-entity-links-banned-phrases.md` line 15; `units/CEX-08-nonfiction-sample-order.md` line 16; `units/CEX-09-assembly-preflight-gate.md` lines 7, 17, 21; `units/CEX-10-pandoc-runner-md-export.md` lines 7, 15 to 20; `units/CEX-11-docx-export.md` lines 16, 20; `units/CEX-12-epub-export.md` lines 15, 19; `units/CEX-14-template-overrides-settings.md` line 15.
- **Module.** `modules/compile-export.md`: line 40 (HTTP), 41 (file access), 42 (side effects), 43 (membership), 44 (events), 47 to 52 (settled decisions, including 51 for matter, title page, dedication and bibliography), 58 (external behaviour), 59 (primary seam), 60 (Pandoc tests and golden).
- **Contracts on main.** `packages/contracts/src/compile-export/constants.ts`: line 19 (re-exports); 32 (`MANUSCRIPT_STATUS_DEFAULT`); 51 (`BIBLIOGRAPHY_DEFAULT`); 52 (`BIBLIOGRAPHY_DEFAULT_BY_PACK`); 54 (`EXPORT_LANG_DEFAULT`). `packages/contracts/src/compile-export/settings.ts` line 8 (re-exports `exportSettingsSchema`). `packages/contracts/src/project-store/order-export.ts` lines 36 to 49 (`exportSettingsSchema`; `author` 38, `penName` 39, `contact` 40, `subtitle` 41, `lang` 42, `rights` 43, `dedication` 44, `bibliography` 45). `packages/contracts/src/project-store/project.ts` lines 21 to 29 (`projectYamlSchema`; `title` 23, `genrePack` 24, `export` 26, `order` 28) and lines 9 to 11 (project id is the folder name). `packages/contracts/src/project-store/constants.ts` line 7 (`CITATION_PATTERN`). `packages/contracts/src/project-store/index.ts` line 1 and `packages/contracts/src/compile-export/index.ts` line 1 re-export `constants.js`. `packages/contracts/src/agent-loop/provenance.ts` line 5 (provenance lives on the pending change) and line 11 (`sourcesUsed`). `packages/contracts/src/setup-auth/routes.ts` line 14 (`PREFERENCES_ROUTE`).
- **Merged API code.** `apps/api/src/modules/compile-export/word-count.ts`: lines 3 to 16 (constants; `HTML_COMMENT` 13; `SEGMENTER` 16), 18 to 20 (`bare`), 22 to 43 (`bodyOf`, the front-matter rule), 45 to 70 (`withoutFences`), 72 to 82 (`countWords`, function at 73). `manuscript.service.ts`: imports at lines 24 to 28 (`ModuleError`; `FilesService`, `ProjectStoreService` from the entry file), class at line 66, `view(): ManuscriptView` at line 73, `totals: { body, manuscript }` at line 137, `activeProjectId` at lines 145 to 155 with `this.store.activeId()` at line 146. `compile-export.module.ts` lines 8 to 13 (`imports` [PlatformModule, ProjectStoreModule], `controllers`, `providers`, `exports` `[ManuscriptService]`).
- **Project store.** `project-store.service.ts` line 51 (`activeId()`). `files.service.ts` line 232 (`list`) and line 257 (`read(projectId, path): FileRead`, synchronous). `entities.service.ts` line 24 (comment: "sorted by path") and line 25 (`list(projectId, query)`). `project-store.module.ts` exports lines 71 to 78 include `ProjectStoreService`, `FilesService` and `EntitiesService`. `entity-manifest.ts` line 304 (the id is the file stem: `basename(file.path, ENTITY_SUFFIX)`) and lines 33 to 34 (the file name must be a valid id).
- **Setup & auth.** `apps/api/src/modules/setup-auth/setup-auth.module.ts` line 21 (import of `PreferencesReader`), line 24 (re-export), line 51 (`providers`), line 61 (`exports`). `setup-preferences.reader.ts` line 6 (comment: an empty string is a stored value, the consumer treats it as unset) and line 12 (`read(): Preferences`).
- **App and gates.** `apps/api/src/app.module.ts` line 12 and line 18 (imports of `SetupAuthModule` and `CompileExportModule`), line 21 (`COMPOSED_MODULES`), lines 23 and 29 (both listed). `eslint.config.mjs` line 40 (entry pattern `**/src/modules/*/*.module.ts`) and line 50 (rule R1). `apps/api/package.json` lines 5 to 8 (scripts `build`, `test`, `lint`) and lines 20 to 21 (`yaml` 2.9.1, `zod` ^4). Root `package.json` line 23 (`build`), line 25 (`test`: workspaces, then `scripts/*.test.mjs`), line 26 (`lint`: workspaces, `lint:examples`, `lint:packs`, `prettier --check .`). `.prettierignore` line 3 (`/plans/`).
- **Test helpers.** `apps/api/test/create-test-app.ts` lines 9 to 14 (`TestAppOptions`: `libraryDir`, `env`, `staticRoot`, `modules`) and the `bootstrap` call, which passes `modules` through. `apps/api/test/compile-export-manuscript.kit.ts` line 16 (`STATIC_ROOT`), 20 (`manuscriptLibrary`), 48 (`withManuscript`, which builds the app with `libraryDir` and `staticRoot` only), 70 (`getManuscript`), 85 (`storyGraph`). `apps/api/test/guard-request.ts` lines 7 to 18 (`RequestOptions`) and 27 (`send`). `apps/api/test/invariant-sweep.ts` lines 38 (`LOOPBACK_HOST`) and 39 (`LOOPBACK_ORIGIN`).
- **Examples.** `examples/nonfiction/sources/*.md`: each starts with `---`, then `type: source` and a `citation` line (line 3 in each); `outline.md` has `citation: The author's working outline for this book` at line 3.
- **Earlier plans.** `plans/CEX-02.md` P2 (line 46), P6 (line 50), P7 (line 51), P16 (line 60), P20 (line 64), P24 (line 68), and the test table (lines 116 to 123). `plans/CEX-03.md` section 2 rows (lines 48 to 51), section 5 (line 117), open points (lines 128 to 138). `plans/GNP-03.md` section 5, the CEX-04 hand-off (line 154). `plans/SAU-09.md` D6 (line 28), D14 (line 36), D15 (line 37), section 5 (line 120), section 6 open point 3 (line 136). `plans/GRR-13.md` lines 25 and 144 to 153. `plans/TRG-17.md` lines 47 and 59.
- **DECISIONS** (searched by unit id, not read whole): line 3430 (CEX-02's word-count rule unchanged); lines 3462, 3466 and 3467 (SHL-11, 2026-11-14: the notes go to CEX-04; Pandoc's stripping need not match); line 5043 (the GNP-11 planner's item 4, the outline).
- **PST-08.** `units/PST-08-entity-resolution.md` lines 18 and 20: `sources/` files may have no front matter and are of type `source`.
- **Commits.** GNP-11 is `36d5b42` and the sample sources carry front matter with `citation`; GNP-03 is `f303689` (the feature commit); SAU-09 is `4b97515`; CEX-02 is `05c582f`.

### 7b. ASSUMED

- **A1.** Pandoc 3.13 reads `title`, `subtitle`, `author`, `lang`, `date`, `rights`, `identifier` and the other keys of P6 as metadata, and `lang` is its language key. Not run here.
- **A2.** Pandoc honours `{.unnumbered}` on a heading, and `::: {.unnumbered}` and `{.unlisted}` on fenced divs as P5 uses them. Numbering and the table of contents are not run here. CEX-10 and CEX-11 check this with real Pandoc.
- **A3.** Pandoc's title block shows the title, subtitle, author and date only, so `contact` and `wordcount` are not shown unless the writer's template shows them.
- **A4.** Nest creates one instance of `SetupAuthModule` and one of `CompileExportModule` when both appear in `COMPOSED_MODULES` and the probe module imports `CompileExportModule`. This follows the mechanism of `plans/SAU-09.md` D14. Not run here.
- **A5.** `parseDocument(text)` from `yaml` 2.9.1 gives `errors` and `toJS()`, as `manuscript.service.ts` uses them.
- **A6.** The C1 body counts 610 words under CEX-02's rule (5 in `a.md`, 605 in `b.md`), counted by hand; `Math.round(0.61)` is 1, so `wordcount` is 1000.
- **A7.** `POST /api/setup-auth/preferences` with `authorName` set to an empty string is stored and returned as stored (`plans/SAU-09.md` D6). Not run here.
- **A8.** No merged code writes `export.author`, `export.lang` or `export.bibliography` yet, so the tests' own `project.yaml` files set every value they check.
- **A9.** The planner ran no build, test, lint or git write command. Every fact above was read from the files at the commit named.
