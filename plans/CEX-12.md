---
id: CEX-12
status: draft
---
# CEX-12 plan — EPUB 3 export with stylesheet, TOC and stable identifier

Planner revision 1, at main 8b5c726 (clean tree at the start of the run; commits made by other agents while this plan was written are ignored). Unit: `units/CEX-12-epub-export.md` (module compile-export, phase:export, M5). Its one blocker, CEX-10, is done on main (merged at 18210ba; `plans/CEX-10.md` has `status: done`). CEX-11 is also done on main (merged at 0eb35cc), so the runner's file-flag table, the `file` parameter of `runPandoc`, the `templateOf` method and the Dockerfile asset line already exist; this plan builds on them. The unit has no change note, so it is planned as written. No contract change is needed.

Tags: `U<n>` is a decision from the unit, the module, the README or the CEX-04 and CEX-10 units. `P<n>` is from another plan, the CI file, the Dockerfile or DECISIONS. `D<n>` is a choice of this plan (names, file layout, test structure, or a value the unit leaves open). `F<n>` is a fact checked in section 2a, with its file and line. `A<n>` is an assumption in section 2b. `O<n>` is an open point in section 7.

The Pandoc probes in section 2a ran Pandoc 3.13 inside the local image `bbartolome/scriba:dev`, with stdin and stdout and a `/tmp` folder only. They check Pandoc's behaviour and are not test results. No test in this plan has been run, and no criterion is claimed as passed. CI has not been observed for this unit.

## 1. Decisions this plan follows

### 1a. From the unit, the module, the README and the CEX-04 and CEX-10 units

- **U1 Flags and features.** `--to=epub3 --split-level=1`, a TOC, title, author, language, a stable identifier derived from the project, and the built-in stylesheet (overridable via CEX-14). Source: unit line 15.
- **U2 Criteria.** Three checkboxes, all structural (unzipped): unit lines 18 to 20. Each has exactly one test (section 5).
- **U3 Metadata already exists.** The generated YAML block (CEX-04) holds `title`, `author`, `lang` and `identifier` (`urn:scriba:<projectId>`). Source: `units/CEX-04-assembled-markdown.md` line 19; `plans/CEX-04.md` line 160 ("CEX-12 must not write a second identifier"), section 7 point 5 (line 175, the identifier is settled as `urn:scriba:<projectId>`). So this unit adds no metadata key.
- **U4 Matter and order.** Chapters in effective order; front and back matter placed by `part`; the dedication from export settings; no new folders. Source: `modules/compile-export.md` line 51 and line 53 (exports kept under `.scriba/compile-export/exports/`). Line 7: EPUB is its own unit over the shared Pandoc runner.
- **U5 Pandoc invocation.** Argument array with no shell, a temp working folder, `--resource-path` set to the project root, a wall-clock timeout (120 s) that gives `COMPILE_PANDOC_TIMEOUT`, an output cap, no `--filter` or Lua filters from project content, one export per project at a time, and the stderr tail on `COMPILE_PANDOC_FAILED`. Source: `units/CEX-10-pandoc-runner-md-export.md` line 18. This plan changes none of it.
- **U6 Storage and download.** Output under `stateDir(projectId, 'compile-export')/exports/` with plain `fs`; the latest file per format is kept; `fileName` is `<title-slug>-<yyyymmdd-hhmm>.<ext>` in UTC; the GET streams with `Content-Disposition: attachment` and changes nothing. Source: CEX-10 unit lines 16 and 17; module line 41.
- **U7 Markdown unchanged.** The md format is the assembled Markdown with no Pandoc call (CEX-10 unit line 19). This plan does not touch the assembled Markdown.
- **U8 Testing.** External behaviour only (HTTP, files on disk). EPUB is checked structurally (spine, nav, metadata), never by byte goldens. Pandoc tests use real Pandoc 3.13, skip locally with a message when it is missing, and a CI flag turns the skip into a failure. Source: `modules/compile-export.md` lines 58 to 60; `units/README.md`, "Conventions shared by every module", Testing bullet.

### 1b. From other plans, the CI file, the Dockerfile and DECISIONS

- **P1 Target flags and file flags.** CEX-10 plan line 37 (D1) gives `epub` the target arguments `['--to=epub3']` and says CEX-12 adds `--split-level=1` to its entry. CEX-11 plan section 6a fixes the shared text of this unit's runner change: `epub: '--css',` in `PANDOC_FILE_FLAGS`, and a `case 'epub'` in `templateOf`. The sixth parameter `file` of `runPandoc` already exists on main (F4).
- **P2 The stylesheet ships in the image already.** CEX-11 D2 added `cp -a apps/api/assets /out/app/apps/api/` to the Dockerfile build stage (line 44 on main). It copies the whole folder, so this unit needs no Dockerfile change (F11).
- **P3 CI.** `.github/workflows/ci.yml` installs Pandoc 3.13 and Typst 0.15.1 (line 28) and runs the tests with `SCRIBA_REQUIRE_EXPORT_TOOLS: '1'` (lines 40 to 42). The EPUB tests run in CI after a push; that run is not observed here (A1).
- **P4 CI clause of CEX-10.** `plans/DECISIONS.md` line 6607: a CI clause cannot be ticked from a local run; it is ticked only after a CI run of a pushed `main`. This unit has no CI clause, but the same status applies to its CI run.
- **P5 Local procedure (Navigator, O5).** `plans/DECISIONS.md` line 6663, "acceptance criteria 1 to 3 (structural): a local Pandoc run is the pass" (session `890addc43cf34963b6605875a25df260`). The procedure is the one in `plans/CEX-11.md` section 4, step 12: copy the static `pandoc` 3.13 binary out of `bbartolome/scriba:dev` into a temp folder, put it first on PATH, run the tests with `SCRIBA_REQUIRE_EXPORT_TOOLS=1`. The decision was recorded for CEX-11's criteria; applying it to this unit's structural criteria is open point O2.

### 1c. Choices of this plan

- **D1 Stylesheet file and path.** The built-in stylesheet is `apps/api/assets/compile-export/epub.css` (new text file). `apps/api/src/modules/compile-export/builtin-assets.ts` gains `BUILTIN_EPUB_CSS`, resolved from `__dirname` with the same `'..', '..', '..'` form as `BUILTIN_REFERENCE_DOCX` (F6). Because it is text, CEX-14's copy-default can write it through the text file API (`plans/CEX-11.md` O4 (i) concerns only the DOCX binary).
- **D2 Target arguments.** `PANDOC_TARGET_ARGS.epub` becomes `['--to=epub3', '--split-level=1', '--toc']`. `--toc` is chosen because the unit asks for a TOC. The probe (F18 P4) shows that `--toc` adds the nav document to the spine and a "Table of Contents" landmark; without it neither appears. The nav document itself is present in both cases.
- **D3 File flag.** `PANDOC_FILE_FLAGS.epub = '--css'`, placed between the `docx` and `pdf` lines. Pandoc 3.13 help lists `-c URL, --css=URL` and no `--epub-stylesheet` option (F18 P1). The probe with `--css=<file>` wrote the given file into the EPUB (F18 P3).
- **D4 Stylesheet content.** The file holds one comment line and these rules: `body` in a serif face with a line height of 1.4; `h1`, `h2` and `h3` bold and centred; `p` with no margin, a first-line indent of 1.5em and justified text; `h1 + p`, `h2 + p` and `h3 + p` with no indent; `blockquote` with a margin of 1em 2em and italic text. These are choices of this plan, not unit text. No CI check reads their values beyond E1 and E3 (presence and identity).
- **D5 Template case.** `templateOf` returns `BUILTIN_EPUB_CSS` for `epub`. Its comment (export.service.ts lines 206 and 207) drops "CEX-12". CEX-13 and CEX-14 change it as section 6a says.
- **D6 No assembly change.** The EPUB takes the CEX-04 Markdown as it is. `assemble(now, format === 'docx')` already passes `false` for EPUB, so no title block is added. The probe shows that `contact` and `wordcount` do not appear in any EPUB part (F18 P5).
- **D7 Test file and helpers.** `apps/api/test/compile-export-epub.test.ts` (new). Its fixtures and XML readers sit in the same file. `readZip`, `binaryDownload` and `useFixedClock` are imported from `apps/api/test/compile-export-docx.kit.ts`; the kit keeps its name, and moving the helpers to a shared kit is out of scope. The OPF, nav and XHTML are read with regular expressions, with no XML parser dependency (as CEX-11 D10).
- **D8 Fixture.** The kit writes the project to the folder `book` (F13), so the identifier in the tests is `urn:scriba:book`. The base fixture, `EPUB_FILES`: `title: Book`, `genrePack: nonfiction`, `export:` with `author: A. Writer` and `dedication: For Sam.`; `order:` lists `drafts/front.md` (part front), `drafts/zeta.md` and `drafts/alpha.md` (part body, in that order), and `drafts/back.md` (part back). Each matter file has a level-1 heading: `# Front heading` with `Front matter words.`; `# Zeta chapter` with `Zeta words.`; `# Alpha chapter` with `Alpha words.`; `# Back heading` with `Back matter words.`. The base fixture sets `bibliography: off`. Criterion 3 uses the base fixture without that line (so the nonfiction default applies) plus `sources/alpha.md` (`type: source`, `citation: Alpha, A. (2001). Title one.`, `url: https://example.com/one`), as in `compile-export-assembly.test.ts` lines 171 to 176; it then runs again with `bibliography: off`.
- **D9 Clock.** `useFixedClock()` (kit line 12), so C1 can assert `fileName` `book-20261119-1200.epub`. `vi.useRealTimers()` runs in `afterEach`, as the DOCX test does.

## 2. Facts checked and assumptions

### 2a. Checked

- **F1 Unit** `units/CEX-12-epub-export.md`: front matter lines 7 (`blocked_by: [CEX-10]`), 8 (`parallel_with: [CEX-11, CEX-13, CEX-14, CEX-16]`) and 9 (`unblocks: [CEX-15]`); Decisions line 15; criteria lines 18 to 20. No change note.
- **F2 CEX-10 unit** `units/CEX-10-pandoc-runner-md-export.md`: lines 16 (GET), 17 (storage), 18 (invocation), 19 (md), 21 (CI), 24 to 27 (criteria; criterion 4 unticked).
- **F3 Module** `modules/compile-export.md`: line 3 (export formats), line 7 (EPUB as its own unit over the runner), line 41 (plain `fs` for output), line 51 (matter via `part`, dedication from export settings), line 53 (exports folder), lines 57 to 61 (testing principles), line 62 (manual "done when").
- **F4 Runner** `apps/api/src/modules/compile-export/pandoc-runner.ts` on main: lines 9 and 10 (`PandocFormat`); lines 12 to 14 (comment: "CEX-11 to CEX-13 add their own flags to their entry"); lines 15 to 19 (`PANDOC_TARGET_ARGS`, epub on line 17 as `['--to=epub3']`); lines 21 to 26 (`PANDOC_FILE_FLAGS`, docx on line 25; comment on lines 21 to 23 says "CEX-12 and CEX-13 add their own line here"); line 113 (comment on `file`); lines 114 to 121 (`runPandoc`, six parameters, `file?` on line 120); lines 124 to 131 (the file flag, which throws for a format with no flag); lines 132 to 138 (argument order: `--from=markdown`, target arguments, file flag, `--resource-path`, `--output`).
- **F5 Export service** `apps/api/src/modules/compile-export/export.service.ts`: line 30 (`import { BUILTIN_REFERENCE_DOCX }`); line 52 (`CONTENT_TYPES.epub` = `application/epub+zip`); line 125 (`assemble(now, format === 'docx')`); lines 145 to 152 (the Pandoc branch, `templateOf(format)` on line 151); lines 206 to 215 (`templateOf`, with only the `docx` case on lines 210 and 211).
- **F6 Built-in paths** `apps/api/src/modules/compile-export/builtin-assets.ts`: 14 lines; `BUILTIN_REFERENCE_DOCX` on lines 6 to 14, resolved with three `'..'` from `__dirname`. `apps/api/assets/compile-export/` holds `reference.docx` only (no stylesheet yet).
- **F7 Metadata** `apps/api/src/modules/compile-export/assembly.service.ts`: line 91 (`lang` is the export `lang`, then `EXPORT_LANG_DEFAULT`); line 93 (`identifier: urn:scriba:${projectId}`); line 97 (author: export value, then the preference); line 99 (contact); lines 114 and 115 (`renderDocument` with or without the title block). `assembly.ts` lines 42 to 54 (`renderMetadata`; keys `title`, `subtitle`, `author`, `lang`, `date`, `rights`, `identifier`, `contact`, `wordcount`).
- **F8 Constants** `packages/contracts/src/compile-export/constants.ts`: line 44 (`EXPORT_FORMATS` includes `epub`); line 51 (`BIBLIOGRAPHY_DEFAULT = 'off'`); line 52 (`BIBLIOGRAPHY_DEFAULT_BY_PACK = { nonfiction: 'all' }`); line 54 (`EXPORT_LANG_DEFAULT = 'en'`).
- **F9 Export settings** `packages/contracts/src/project-store/order-export.ts`: line 42 (`lang`), line 47 (`epubCss`). No contract change.
- **F10 Project id** `apps/api/src/modules/project-store/project-discovery.ts` line 38: `id: entry.name`, the folder name. The test kit writes the project to `book` (`compile-export-manuscript.kit.ts` lines 39 and 42).
- **F11 Dockerfile** line 44, in the build stage: `cp -a apps/api/assets /out/app/apps/api/;`. `.dockerignore` has no rule for `assets`.
- **F12 Assets** `apps/api/assets/compile-export/reference.docx` exists (CEX-11). No `epub.css` exists.
- **F13 Test kits.** `compile-export-docx.kit.ts`: line 8 (`DOCX_TYPE`), line 12 (`useFixedClock`), line 18 (`readZip`), line 73 (`paragraphsOf`), line 100 (`binaryDownload`), line 135 (`wordsBody`), line 175 (`matterFiles`). `compile-export-export.kit.ts`: line 35 (`PANDOC_STATUS`), line 50 (`itPandoc`), line 69 (`withExport`), line 95 (`postExport`), line 104 (`downloadOf`).
- **F14 No EPUB test today.** A search of `apps/api/test` finds no test that mentions `epub`, `--to=epub3` or `--css`. `PANDOC_TARGET_ARGS` and `PANDOC_FILE_FLAGS` are read only in `pandoc-runner.ts`.
- **F15 CEX-04 plan** `plans/CEX-04.md` (status done): line 38 (P6, metadata keys), line 39 (P7, values), line 160 (CEX-12 must not write a second identifier), line 175 (identifier settled), line 202 (A2: whether a front or back div breaks the EPUB spine and nav was left to CEX-11 and CEX-12 with real Pandoc; F18 P6 answers it for this unit).
- **F16 DECISIONS** `plans/DECISIONS.md`: no entry names CEX-12; a search for "epub" (any case) finds no entry; the downstream notes are at lines 6654 and 6701; the CI clause decision is at 6607; the local-Pandoc decision (O5) is at 6663; the CEX-11 merge with "CI not observed" is at 6694.
- **F17 Other plans.** The only plan with `status: draft` or `planned` on main is `plans/GRR-15.md` (planned; it touches none of these files). No plan exists for CEX-13, CEX-14 or CEX-15. `plans/QUEUE.md` line 7 lists CEX-12 as available.
- **F18 Pandoc probes** (Pandoc 3.13, `aarch64`, local image `bbartolome/scriba:dev`; a temp folder `/tmp/cex12-probe.6Q1uqH`; not test results):
  - **P1** `pandoc --help` lists `--split-level=NUMBER`, `--epub-chapter-level=NUMBER`, `--toc`, `-c URL, --css=URL`, and no `--epub-stylesheet`. The help does not state the default of `--split-level`, which this plan does not claim.
  - **P2** A fixture with `# Front heading` and `# Back heading` inside `::: {.unnumbered}` divs, a dedication div with no heading, `# One` and `# Two`, a body of two files, and a `# Bibliography {.unnumbered}` block, built with `--to=epub3 --split-level=1 --css=<file> --toc`: `content.opf` has `dc:identifier` `urn:scriba:book` (the `identifier` key is used), `dc:title`, `dc:creator` `A. Writer` and `dc:language` `en`. The spine is: title page, nav, then the chapters of Front heading, the dedication, One, Two, Back heading and Bibliography, in that order. The nav's TOC entries are Front heading, One, Two, Back heading and Bibliography, in that order. This confirms CEX-04's A2 for front and back divs.
  - **P3** The `--css` file is written as `EPUB/styles/stylesheet1.css`, byte for byte (21 bytes for a 21-byte input). Pandoc's default stylesheet is not written.
  - **P4** Without `--toc`, the nav document is not in the spine and the "Table of Contents" landmark is absent (a `diff` of the two OPF files shows the nav `itemref`; a `diff` of the two nav files shows the landmark).
  - **P5** `12 Lane Road`, `3000` and `wordcount` do not occur in any EPUB part, and the title page shows the title, the author and the date.
  - **P6** The dedication, a div with no heading, is its own spine file and is not in the nav (the nav lists headings only).
- **F19 Zip reader.** `readZip` (kit line 18) reads methods 0 and 8, which covers the stored `mimetype` and the deflated parts of an EPUB (A3).

### 2b. Assumed (not verified here)

- **A1** CI runs the EPUB tests after a push, with the install step of F11 (ci.yml line 28) and the flag of lines 40 to 42. No CI run is observed here, as for CEX-10 criterion 4 and CEX-11.
- **A2** The local binary is arm64 and CI is amd64. The structural checks are judged independent of the architecture by the Navigator decision at DECISIONS line 6663; that judgement is not verified here (as CEX-11 A10).
- **A3** `readZip` reads the entries of Pandoc's EPUB zip. Not run on an EPUB here; C1 checks it in step 8.
- **A4** Pandoc copies the `--css` file verbatim for any size, not only for the 21-byte probe (F18 P3). E1 checks it in step 8.
- **A5** `vi.useFakeTimers({toFake: ['Date']})` fakes only `Date`, as in CEX-11 A5.
- **A6** In the image, `BUILTIN_EPUB_CSS` resolves to `apps/api/assets/compile-export/epub.css` under the copied app, by the same rule as the reference DOCX (CEX-11 A9). The image is not built here; CEX-15's image smoke step is its gate.
- **A7** `dc:creator` is written only when an author is set. The tests set one (CEX-04 P7 leaves an unset author out).

## 3. Files to change

Only the paths below change, plus this plan. No file under `packages/contracts/`, `units/`, `modules/`, `plans/DECISIONS.md` or the Dockerfile changes.

| Path | Change |
|---|---|
| `apps/api/assets/compile-export/epub.css` | new: the built-in stylesheet (D1, D4) |
| `apps/api/src/modules/compile-export/builtin-assets.ts` | edit: add `BUILTIN_EPUB_CSS`; the header comment also names the stylesheet (D1) |
| `apps/api/src/modules/compile-export/pandoc-runner.ts` | edit: `epub` target arguments (D2); `epub: '--css'` in `PANDOC_FILE_FLAGS` (D3); the comments on lines 12 to 14 and 21 to 23 (step 4) |
| `apps/api/src/modules/compile-export/export.service.ts` | edit: import `BUILTIN_EPUB_CSS`; `case 'epub'` in `templateOf` and its comment (D5) |
| `apps/api/test/compile-export-epub.test.ts` | new: criteria C1, C2 and C3 (real Pandoc); extras E1 and E2 (real Pandoc) and E3 (no Pandoc) (section 5) |
| `plans/CEX-12.md` | this plan (the planner's only output) |

## 4. Procedure

Run from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v` and `npm -v` with each result. The implementer makes the branch; the planner does not.

1. **Branch and baseline.** `git switch -c unit/CEX-12` on a clean tree. Run `npm run build -w @bbartolome/scriba-contracts`. Expected: exit 0.
2. **Stylesheet.** Create `apps/api/assets/compile-export/epub.css` with the rules of D4, the comment line first. Expected: `test -s` succeeds.
3. **Built-in path.** Add `BUILTIN_EPUB_CSS` to `builtin-assets.ts` with the same form as `BUILTIN_REFERENCE_DOCX` (D1). Update the header comment so it names both files.
4. **Runner.** Edit `pandoc-runner.ts`:
   - `PANDOC_TARGET_ARGS.epub` becomes `['--to=epub3', '--split-level=1', '--toc']` (D2); the other two entries stay as they are;
   - add the line `epub: '--css',` to `PANDOC_FILE_FLAGS` after the `docx` line, so the order is `docx`, `epub`, then `pdf` when CEX-13 adds it;
   - change the comment on lines 12 to 14 to "CEX-13 adds its own flags to its entry", and the comment on lines 21 to 23 to "CEX-13 adds its own line here". `runPandoc` is unchanged.
5. **Export service.** In `export.service.ts`, import `BUILTIN_EPUB_CSS` next to `BUILTIN_REFERENCE_DOCX` (line 30). In `templateOf` (lines 206 to 215), add `case 'epub': return BUILTIN_EPUB_CSS;` after the docx case, and change the comment on lines 206 and 207 to say that CEX-13 adds its case and CEX-14 puts the project override first. Lines 125 and 145 to 152 stay as they are.
6. **Test file.** Create `apps/api/test/compile-export-epub.test.ts` with the tests of section 5, using `itPandoc` and `withExport(files, {}, run)` for C1, C2, C3, E1 and E2, and `it` for E3.
7. **Checks, in order** (as CEX-11 step 11):
   - `npm run build -w @bbartolome/scriba-api`. Expected: exit 0.
   - In `apps/api`: `npx vitest run test/compile-export-epub.test.ts test/compile-export-docx.test.ts test/compile-export-export.test.ts test/compile-export-export-runner.test.ts test/compile-export-assembly.test.ts`. Expected on this host: E3 passes; C1, C2, C3, E1 and E2 are skipped with the message that CEX-10 added; the other files pass unchanged.
   - `npm test -w @bbartolome/scriba-api`. Expected: exit 0, with the Pandoc tests skipped and the message printed.
   - `npx prettier --write` on each new and changed TypeScript file and on `epub.css`, then `npm run lint`. Expected: exit 0.
   - Do not set `SCRIBA_REQUIRE_EXPORT_TOOLS` here: with no Pandoc on the host, the kit fails at load by design (CEX-10 D28).
8. **Real-Pandoc run (local procedure, Navigator O5, P5).** Run the command block of `plans/CEX-11.md` section 4, step 12, unchanged except the test path, which is `test/compile-export-epub.test.ts`. Proceed only when `pandoc --version` prints 3.13, `command -v pandoc` prints the temp folder, and the two hashes are equal. Record, for each of C1, C2, C3, E1 and E2, the result, with `node -v`, `npm -v`, the hash and the host architecture (arm64; A2). Then, as a regression check, run `SCRIBA_REQUIRE_EXPORT_TOOLS=1 npm test -w @bbartolome/scriba-api` with the same PATH. Expected: exit 0, so the DOCX and CEX-10 tests also pass with the real binary. A skipped test is not a pass, and this plan claims none. The CI run after a push is not the gate for these boxes.
9. **Scope check.** `git status --short` lists exactly the paths of section 3. The Dockerfile is unchanged.
10. **Commit.** On `unit/CEX-12`, with the message `feat(CEX-12): EPUB 3 export with stylesheet, TOC and stable identifier`. A criterion's box is ticked only after step 8 passes for its test, in a separate commit, as in the CEX-10 and CEX-11 history.

## 5. One test for each acceptance criterion

Criteria are the three checkboxes at unit lines 18 to 20. Each has exactly one test (C1, C2, C3). Extras (E) cover decisions that no criterion names. They add no criterion and replace none.

All tests use the composed app through `withExport` on a temp library, with the fixed clock of D9. C1, C2, C3, E1 and E2 need Pandoc 3.13 (`itPandoc`). E3 needs no Pandoc.

The helpers of the test file: `epubPart(bytes, name)` (from `readZip`, failing when the part is missing); `opfOf(bytes)`, which reads the OPF path from `META-INF/container.xml` (`full-path`) and returns the metadata text, the manifest (id, href and whether it is the nav item) and the spine idrefs in order; `dcText(opf, name)`, which reads `<dc:name ...>text</dc:name>`; `spineText(bytes)`, which joins the text of every spine file except the nav item, in spine order, with tags removed and whitespace collapsed; `navEntries(bytes)`, which returns the texts of the `<a>` elements inside the `<nav epub:type="toc">` element, in document order; `expectInOrder(text, tokens)`, which checks that each token occurs after the one before it. The fixture texts contain no XML entities, so no decoding is needed.

| Criterion or extra (unit line or decision) | Test title | Pass condition |
|---|---|---|
| C1 (line 18): spine and nav follow effective order; front and back matter in place | `criterion 1: the spine and the nav follow the effective order, with the front and back matter in place` (`itPandoc`) | Fixture: `EPUB_FILES` (D8). POST `epub` gives 200, `fileName` `book-20261119-1200.epub`, `downloadUrl` `/api/compile-export/exports/epub`. `binaryDownload` gives 200, the content type `application/epub+zip` (`CONTENT_TYPES.epub`), a body whose length equals `bytes` in the POST result, and a body that starts with `PK`. `navEntries` equals `['Front heading', 'Zeta chapter', 'Alpha chapter', 'Back heading']`. `spineText` contains these tokens in this order: `Front heading`, `Front matter words.`, `For Sam.`, `Zeta chapter`, `Zeta words.`, `Alpha chapter`, `Alpha words.`, `Back heading`, `Back matter words.`. |
| C2 (line 19): metadata has title, author, language and identifier | `criterion 2: the metadata has the title, the author, the language and the identifier` (`itPandoc`) | Fixture: `EPUB_FILES`. In the OPF of the download: `dcText` gives `Book` for `title`, `A. Writer` for `creator`, `en` for `language` and `urn:scriba:book` for `identifier`. |
| C3 (line 20): bibliography present for a nonfiction fixture; absent when `off` | `criterion 3: the bibliography is present for a nonfiction fixture and absent when the mode is off` (`itPandoc`) | Run A: `EPUB_FILES` without `bibliography: off` (the nonfiction default, `all`) plus `sources/alpha.md` (D8). `navEntries` ends with `Bibliography`, and `spineText` contains `Back matter words.`, `Bibliography`, `Alpha, A. (2001). Title one.` in this order. Run B, in a second `withExport`: the same files with `bibliography: off`. `navEntries` has no `Bibliography`, and no `.xhtml` part of the EPUB contains `Alpha, A.`. |
| E1 (extra; U1, D1 and D4) | `extra: the built-in stylesheet is written into the EPUB unchanged` (`itPandoc`) | Fixture: `EPUB_FILES`. The EPUB has a part whose name starts with `EPUB/styles/`, and its bytes equal the bytes of `apps/api/assets/compile-export/epub.css` (A4). Checks P3. |
| E2 (extra; U1, D8) | `extra: two exports of one project give the same identifier` (`itPandoc`) | Fixture: `EPUB_FILES`. POST `epub` twice, and download each time. The `identifier` of both OPF files is `urn:scriba:book`. |
| E3 (extra; D1, D3) | `extra: the built-in stylesheet is in apps/api/assets` (`it`, runs here) | `apps/api/assets/compile-export/epub.css` exists and has text that is not empty. Read from `resolve(__dirname, '..', 'assets', 'compile-export', 'epub.css')`. |

Notes on the tests:

- The clock is faked in C1, C2, C3, E1 and E2, set before the app boots and restored in `afterEach`.
- Each test has its own temp library (`withExport`) and removes it.
- No test asserts Pandoc's argument list (U8). The flags are observed through the output only: the stylesheet part for E1, the nav and spine for C1 and C3, and the identifier for C2.
- No test is ticked or claimed as passed here.

## 6. Agreement with the downstream and sibling units, and other plans

### 6a. Agreement

- **The shared runner change, as the text each sibling writes (any merge order).** CEX-11 is merged, so this unit adds only its own lines. (1) In `pandoc-runner.ts`, `PANDOC_FILE_FLAGS` gets `epub: '--css',` between `docx` and `pdf`; CEX-13 adds `pdf: '--template',`. (2) `runPandoc`'s sixth parameter is unchanged. (3) In `export.service.ts`, `templateOf` gets `case 'epub': return BUILTIN_EPUB_CSS;`; CEX-14 changes only the body of `templateOf`, so that the project override (`epubCss`) comes first and `BUILTIN_EPUB_CSS` is the fallback. (4) `builtin-assets.ts` holds one `export const` per built-in file, and the Dockerfile copies the whole folder (P2). A text conflict with a sibling is limited to adjacent lines of these lists; the resolution keeps both lines.
- **CEX-13 (PDF via Typst).** The same pattern: `pdf: '--template'` in the file-flag table and `case 'pdf'` in `templateOf`. Either order works, because the lines are adjacent and independent.
- **CEX-14 (overrides and export settings).** Its blockers are CEX-03, CEX-10 and CEX-11, all done. Its `epubCss` override (`packages/contracts/src/project-store/order-export.ts` line 47) is the project-relative file that replaces `BUILTIN_EPUB_CSS` in `templateOf`; its `COMPILE_TEMPLATE_INVALID` check goes before `runPandoc`, as CEX-11 section 6a says. Its copy-default for `epub` reuses `BUILTIN_EPUB_CSS` (D1). The copy of `epub.css` is text, so the text file API of the Project store can write it; the binary concern of `plans/CEX-11.md` O4 (i) does not apply to it. CEX-12 is not in CEX-14's blockers, and the two units are not in each other's `parallel_with`.
- **CEX-15 (export gate, blocked by CEX-12).** Its image smoke step exports an EPUB inside the image on amd64 and arm64, so the stylesheet path of D1 must resolve there (A6). Its criterion 2 (CEX-10 to CEX-14 criteria pass on `main` with real Pandoc and Typst in CI) follows the CI status of P3 and P4.
- **CEX-20 (milestone gate).** Its manual check opens an exported EPUB in Apple Books or Calibre and expects the TOC to list the chapters in order (`units/CEX-20-milestone-gate.md` line 30). Criterion 1's nav check (C1) covers the order in CI; the reader check stays manual.
- **CEX-16, CEX-18 and AGL-24.** CEX-16 runs in parallel and shares no file. CEX-18 and AGL-24 use `downloadUrl` and `export(format)`, which do not change.

### 6b. Other plans and units that change the same files

- **CEX-04 (done).** Owns `assembly.ts` and `assembly.service.ts`. This plan changes neither (D6). Its metadata block is the EPUB's metadata source (U3).
- **CEX-10 (done).** Owns `pandoc-runner.ts`, `export.service.ts` and the kit. This plan changes one target entry, one file-flag line, one `case` and two comments.
- **CEX-11 (done, merged at 0eb35cc).** Added `PANDOC_FILE_FLAGS`, the `file` parameter, the docx case of `templateOf`, `builtin-assets.ts` and the Dockerfile asset line. This plan adds to each of them and changes none of their behaviour.
- **Platform's Dockerfile (PLT-14, done, extended by CEX-11).** No change in this unit (P2).
- **No draft or planned plan** changes these files (F17).

## 7. Open points

Settled in this plan: D1 to D9 (the stylesheet, `--toc`, `--css`, the rules of the stylesheet, the case in `templateOf`, no metadata change, the test file, the fixture and the clock). No open point blocks the unit: CEX-10 and CEX-11 are done, and every criterion can be tested as written.

1. **O1 Front-matter key of this plan.** The orchestrator's template writes `unit: CEX-12`, but every plan on main uses `id:` (`plans/PLT-02.md`, `plans/CEX-04.md`, `plans/CEX-10.md`, `plans/CEX-11.md`). This plan uses `id: CEX-12` and `status: draft`, to match those plans. The orchestrator can change the key if its tooling needs `unit:`. Settled here; flagged.
2. **O2 Scope of the local procedure (Navigator).** DECISIONS line 6663 applies the local Pandoc run to CEX-11's criteria, and the Navigator's wording names CEX-11. This plan applies the same procedure to CEX-12's structural criteria, as the orchestrator asked. The Navigator should confirm that the decision covers CEX-12 (or record a decision for it). Until then, the boxes of this unit are not ticked on the local run. Recommendation: confirm, because the criteria are structural in the same way (unit line 17).
3. **O3 Front and back matter without a heading (Navigator, criterion 1).** The spine places such matter (F18 P6), but the nav lists only headings, and CEX-04 P5 adds no heading to front or back files. C1 uses matter with headings, so the nav shows front and back. If the Navigator reads criterion 1 as requiring headless matter in the nav, the fix is a change to CEX-04's wrapper (a heading per matter file), which is outside this unit. Recommendation: no change.
4. **O4 No author (criterion 2).** With no author in the export settings and no preference name, `dc:creator` is absent (A7). Criterion 2 is tested with an author. Recommendation: read the criterion as "when an author is set"; no change. The Navigator should confirm if the criterion is meant to need a fallback.
5. **O5 Stable identifier (known limit).** The identifier is `urn:scriba:<folder name>` (CEX-04, section 7 point 5). It stays stable while the project folder is not renamed; a renamed folder gets a new identifier. Recommendation: keep it, as CEX-04 settled. Recorded, not changed.
6. **O6 Stylesheet rules.** The rules of D4 are this plan's choice. No CI check reads them, and the reader check is manual (CEX-20). Recommendation: keep.

Review parts: to be set by the reviser.
