---
id: CEX-02
status: draft
unit: units/CEX-02-effective-order-view-model.md
module: compile-export
---
# CEX-02 plan — effective order, manuscript membership, word counts and GET manuscript

## 1. Summary

- Unit: `units/CEX-02-effective-order-view-model.md` (phase:assembly-preflight, M5). Base: `main` at `c96cadd`. The facts were read at `ef60970`; between the two, only GRR-10 changed, on no path of this plan (section 8a).
- Adds the compile-export API module (skeleton, manuscript view model, `GET /api/compile-export/manuscript`) and one import in the composition root. API only: no web file, no contract change. The view schemas are on main from CEX-01 (`packages/contracts/src/compile-export/order.ts`).
- Blockers, all merged and `done`: CEX-01 (`2e0471d`, `c9fef69`), PST-12 (`377a83c`), SAU-08 (`0e6778d`). The plan works in either merge order with CEX-08 and CEX-17 and with the in-flight plans (section 6).
- One PR, one part (section 9). Six tests, one per acceptance criterion (section 5). Eleven procedure steps (section 4).

## 2. Decisions this plan obeys

### 2a. Settled by the unit, the module and the record

- **Membership.** Top-level regular `.md` files directly in `drafts/`. Subfolders (including `drafts/.versions/`), hidden files and non-Markdown files are absent. Sources: unit line 18; module lines 42 and 43.
- **Partition.** `part` comes from the order entry (default `body`). Front and back keep their order-field order, then alphabetical. The story graph never orders front or back matter. Sources: unit line 19; module line 51. Because an unlisted file is `body`, the alphabetical tail of front and back can never receive a file; the code adds no path for it.
- **No story graph.** `project.yaml` order, then unlisted files alphabetically by path; stale entries are ignored. Source: unit line 21.
- **Story graphs.** The union of edges whose relation is exactly `order` across all story graphs in `graphs/`. Each edge reads "from precedes to" and is projected onto files through each endpoint's `path`. An edge is dropped if an endpoint has no path, its path is not a body manuscript file, or both map to the same file. The graph-ordered block (files touched by a remaining edge) is topologically sorted with alphabetical ties and leads the body. Other body files follow in `project.yaml` order, then alphabetically. Sources: unit line 22; module lines 47 and 48; `modules/graph-runner.md` line 39 (only `order` edges are read).
- **Cycle.** Over distinct files, the graph is ignored entirely: `project.yaml` order, then alphabetical, and a `graphCycle` warning that lists the files. Source: unit line 23.
- **Graph files.** Parsed with the Graph runner's published schema. A file failing validation is skipped and reported as an `invalidGraph` warning. Sources: unit line 25; `modules/graph-runner.md` line 39.
- **Inside a file.** The author's text order; scene boundaries are never parsed. Sources: unit line 24; module line 65 (scene reordering is out of scope).
- **Word counts.** Per file, on the body after YAML front matter; Markdown syntax, URLs, HTML comments and fenced code are removed; `Intl.Segmenter` word segments with `isWordLike` are counted. Totals: body (body files) and manuscript (body, front and back; generated matter is not counted). Source: unit lines 27 to 29.
- **View model.** Entries `{path, part, status, words, graphOrdered, inOrderField}`; totals `{body, manuscript}`; `orderSource` in `alphabetical | project | graph+project`; warnings `graphCycle`, `invalidGraph`, `staleEntry`; `revision` is the hash of the current order field plus the set of manuscript files. Sources: unit lines 31 and 32; contract `order.ts` lines 23 to 59, `constants.ts` lines 35 to 40.
- **Status and part live on order entries**, not in front matter (module line 49).
- **Route and guard.** `GET /api/compile-export/manuscript`, behind Setup & auth's global guard. Reads are GET and never mutate. Sources: module line 40; contract `routes.ts` line 4.
- **Side effects.** The GET is side-effect free (unit line 41). It never reads `drafts/.versions/`, never runs a graph and never calls a model (module line 42).
- **File access** goes through the Project store's in-process file API, not through `fs` (module line 41).
- **Module shape.** A NestJS `@Module` at `apps/api/src/modules/compile-export/`, registered with one import in the composition root (module line 39; unit line 33).
- **Testing.** External behaviour only, through GET; fixture projects built inside each test; unit tests never read `examples/`; the primary seam is `createTestApp` with the guard (module lines 58 and 59).

DECISIONS entries that bind this unit:

- `plans/DECISIONS.md` line 3430 (the SHL-11 raw-HTML decision, 2026-11-14): "CEX-02's word-count rule is unchanged (it already strips HTML comments before counting)". HTML comments are removed before counting.
- `plans/DECISIONS.md` lines 3462 to 3466 (the SHL-11 front-matter decision, option A, 2026-11-14): the Shell's front-matter rule is Pandoc's block shape with a YAML-shape guard, and the notes go to CEX-02. The API uses the same algorithm (P16 below), so the count and the Shell's display agree.
- `plans/DECISIONS.md` line 3954 (SAU-08 done, 2026-11-15): SAU-08 unblocks CEX-02. Blocker status only.
- `plans/DECISIONS.md` line 5806 (CEX-01 review approved, 2026-11-18): CEX-01 is merged on main. Blocker status only.

### 2b. Planner's choices (the simplest option the sources allow)

- **P1 Code split.** Five new files (section 3). Pure helpers hold the ordering and the counting; the service holds all reads.
- **P2 Sort.** "Alphabetically" and "by path" mean JavaScript string order (`<`), the order `FilesService.list` already uses. No locale collation.
- **P3 Folder paths.** Paths passed to the Project store have no trailing slash (`'drafts'`, `'graphs'`). The contract's `MANUSCRIPT_FOLDER` is `'drafts/'` (`order-export.ts` line 18) and is not passed to `files.list`: `resolveProjectPath` refuses an empty segment (`path-safety.ts` lines 140 to 142).
- **P4 Membership test.** For each entry of `list('drafts')`: `kind === 'file'`, the name ends with `.md` (case-sensitive) and does not start with `.`.
- **P5 Missing folders.** A missing `drafts/` or `graphs/` is an empty set, not an error. Check the root listing for a `dir` entry first, as Graph runner's `graphEntries` does.
- **P6 No active project.** `ProjectStoreService.activeId()` returns null: throw `ModuleError(PROJECT_ERROR_CODES.NO_ACTIVE, PROJECT_ERROR_STATUS.PROJECT_NO_ACTIVE, message)`, as Graph runner's `activeProjectId()` does (409).
- **P7 project.yaml.** Read with `FilesService.read(id, 'project.yaml')`; the store's own refusals (missing, too new, too large) propagate unchanged. Parse with `yaml` `parseDocument`. A YAML error, or an `order` key that is present and fails `z.array(orderEntrySchema)`, throws `ModuleError(PROJECT_ERROR_CODES.INVALID, PROJECT_ERROR_STATUS.PROJECT_INVALID, message)` (422). This is the store's own rule for `order` (`project.yaml` schema, `project.ts` line 28). An absent `order` is `[]`.
- **P8 Order entries.** The first occurrence of a path wins; later duplicates are ignored without a warning. A valid entry whose path is not a current manuscript file (missing, a subfolder, under `.versions/`, hidden, not `.md`) is stale: it is ignored and reported as `staleEntry {path}` with the path as written. The reason: CEX-03 materialises one entry per current manuscript file and drops the rest, so the view and the write agree (open point 4).
- **P9 Defaults.** `MANUSCRIPT_STATUS_DEFAULT` (`draft`) and `MANUSCRIPT_PART_DEFAULT` (`body`) from `compile-export/constants.ts` lines 32 and 33. Applied in the view, never written.
- **P10 orderSource.** `graph+project` when the graph-ordered block is non-empty; else `project` when at least one order entry names a current manuscript file; else `alphabetical`.
- **P11 Graph files.** Regular files directly in `graphs/` named `<id>.json`, where `<id>` matches `GRAPH_ID_PATTERN`. This is Graph runner's rule (`graphIdOf`, `graph-runner.service.ts` lines 73 to 79). Other files are ignored silently. Each is read with `FilesService.read`, parsed with `JSON.parse` and checked with `graphFileSchema` from `@bbartolome/scriba-contracts/graph-runner` (the save rule; its comment at `graph.ts` lines 179 to 182 says "every other consumer use it"). Any failure (read refusal, JSON error, schema error) gives `invalidGraph {path}` and the file is skipped. A valid recipe graph is ignored.
- **P12 Node ids are per graph.** Each graph's edge endpoints are mapped through that graph's own node list. Never one map across graphs.
- **P13 Projected pairs.** An edge counts only if its relation is exactly `order` and both endpoints map to a current body manuscript file (member, part `body`), the two files differ. Pairs from all graphs are collected as a set.
- **P14 Topological sort.** Kahn's algorithm; among the ready files, the smallest path (P2) goes first.
- **P15 Cycle.** A file is listed in `graphCycle` when it can reach itself through the projected pairs (the files on a cycle), sorted by path. The graph is then ignored entirely (unit line 23). A file that only hangs off a cycle is not listed.
- **P16 Front matter.** The algorithm of `plans/SHL-11.md` step 3 (lines 124 to 132), with its YAML-shape guard (decision 5, line 27): drop one leading BOM; the first line is `---` alone; the second line is not blank; the closing line is `---` or `...` alone; the first non-blank line between the fences is a `#` comment or matches `/^(?:#|[^\s#:][^:]*:(?:[ \t]|$))/`. An empty block is front matter. With no closing line, nothing is stripped. The Shell's implementation is `apps/web/src/app/shell/markdown-preview.ts` (`stripFrontMatter`, line 22). The API copies the algorithm; it does not import from `apps/web`.
- **P17 Body cleanup**, in this order: remove closed HTML comments (`/<!--[\s\S]*?-->/g`); remove fenced code, meaning a line of three or more backticks or tildes (indented up to three spaces) through the closing fence of the same character and at least the same length, and an unclosed fence runs to the end of the text; remove URLs (`/(?:https?:\/\/|www\.)\S+/gi`); remove link and image targets (`/\]\([^)]*\)/g`, replaced by `]`). Inline code and indented code are counted; the unit lists only fenced code (open point 1).
- **P18 Counting.** `new Intl.Segmenter('en', { granularity: 'word' })`, counting segments where `isWordLike` is true. The locale is fixed so the count does not depend on the host.
- **P19 Revision.** `sha256:` plus the hex digest of `JSON.stringify({ order, files })`, where `order` is the parsed `order` value (or `null` when the key is absent) and `files` is the sorted list of current manuscript paths. Computed on every call; no cache. Story graphs are not in it (open point 2). The form matches `hashOf` in `files.service.ts` (lines 87 to 89).
- **P20 Entry order.** `front` in order-field order, then `body` in effective order, then `back` in order-field order.
- **P21 Warning order.** `staleEntry` in order-field order, then `invalidGraph` sorted by path, then `graphCycle` last.
- **P22 Errors.** The GET uses only the Project store's codes (P6, P7). No `COMPILE_` code is used by this GET.
- **P23 Unreadable drafts.** A draft the store refuses to read (over the 5 MiB cap, or not text) fails the whole GET with the store's error. It is not counted as zero. Graph files are different: an unreadable graph is an `invalidGraph` (P11). Open point 3.
- **P24 Export.** `ManuscriptService` (from `manuscript.service.ts`) is exported from the module with a method `view(): ManuscriptView`. The controller calls it. No state is kept between calls.
- **P25 Dependencies.** None added. `yaml` 2.9.1 and `zod` ^4 are already in `apps/api/package.json` (lines 20 and 21); the contracts package is already built by its `build` script.
- **P26 Composition root.** One import and one array entry, placed after `GraphRunnerModule` (`app.module.ts` lines 17 and 27).

## 3. Files to create or change

| Path | Change | What it holds |
|---|---|---|
| `apps/api/src/modules/compile-export/compile-export.module.ts` | new | `CompileExportModule`: imports `PlatformModule` from `../platform/platform.module` and `ProjectStoreModule` from `../project-store/project-store.module` (the entry files); controllers `[ManuscriptController]`; providers and exports `[ManuscriptService]`. |
| `apps/api/src/modules/compile-export/manuscript.controller.ts` | new | `@Get(MANUSCRIPT_ROUTE)` returns `this.manuscript.view()`. No query, no body. |
| `apps/api/src/modules/compile-export/manuscript.service.ts` | new | `ManuscriptService.view()`: P6 to P8, P11 to P13, P19, P21 to P24. The only file that reads the store. |
| `apps/api/src/modules/compile-export/effective-order.ts` | new | Pure `effectiveOrder(input)` (P9, P10, P14, P15, P20): input is the sorted member paths, the valid order entries in file order, and the projected pairs; output is the entries with `part`, `status`, `graphOrdered`, `inOrderField`, the `orderSource` and the cycle files. |
| `apps/api/src/modules/compile-export/word-count.ts` | new | Pure `countWords(text: string): number` (P16 to P18). |
| `apps/api/src/app.module.ts` | edit | One import of `CompileExportModule` and one entry in `COMPOSED_MODULES` after `GraphRunnerModule` (P26). Nothing else. |
| `apps/api/test/compile-export-manuscript.kit.ts` | new | Fixture builder, GET helper and the parse helper (section 5). |
| `apps/api/test/compile-export-manuscript.test.ts` | new | Six tests, C1 to C6 (section 5). |

Imports, all from published subpaths: `MANUSCRIPT_ROUTE`, `manuscriptViewSchema`, `orderEntrySchema`, `manuscriptPathSchema`, `MANUSCRIPT_STATUS_DEFAULT`, `MANUSCRIPT_PART_DEFAULT` from `@bbartolome/scriba-contracts/compile-export` (it re-exports `order-export.ts`; `project-store/index.ts` does not export that file, checked); `GRAPH_FOLDER`, `GRAPH_ID_PATTERN`, `graphFileSchema` from `@bbartolome/scriba-contracts/graph-runner` (checked: its index re-exports `constants.js` and `graph.js`); `PROJECT_ERROR_CODES`, `PROJECT_ERROR_STATUS` from `@bbartolome/scriba-contracts/project-store`.

Not changed: `packages/contracts/**` (CEX-01's shapes are used as they are); the Project store; `apps/api/test/invariant-sweep.ts` (the sweep reads the Nest router, and the route template has no `:` or `{`, so it needs no `FIXTURE_PATHS` entry); `examples/**`; `units/**`; `modules/**`; `plans/**` except this file; `apps/web/**`; `e2e/**`.

## 4. Procedure

1. **Pre-check.** `git status` shows no change under section 3's paths. Run `npm run build -w @bbartolome/scriba-contracts` and confirm it passes. Do not change `packages/contracts`. If a name listed in section 3 is missing from the contract, stop and report it; do not add it here.
2. **`word-count.ts`.** Write `countWords(text)` with P16 to P18. Pure; no I/O.
3. **`effective-order.ts`.** Write `effectiveOrder({ members, orderField, projectedPairs })`, where `members` is the sorted list of current manuscript paths, `orderField` the valid order entries in file order, and `projectedPairs` the distinct `[from, to]` body pairs from step 4(f). The function (a) partitions by `part` (P20); (b) sorts the graph-ordered block with P14 if there are pairs and no cycle; (c) finds the cycle files (P15) and, on a cycle, drops every pair; (d) orders the other body files by the order field, then alphabetically; (e) sets `graphOrdered`, `inOrderField`, the defaults (P9) and `orderSource` (P10).
4. **`manuscript.service.ts`, `view()`.** In this sequence:
   a. The active id (P6).
   b. `project.yaml` and its `order` (P7).
   c. Membership: root listing has a `drafts` dir (P5); then `list('drafts')` filtered by P4.
   d. Stale entries (P8) and the `part` of each valid entry, which decides the body set.
   e. Graphs: root listing for `graphs`; for each file that matches P11, read it and parse it. Collect `invalidGraph` for failures. Keep each valid story graph's node-id to path map (P12).
   f. Projected pairs (P12, P13) from each story graph's `order` edges, with the body set from step (d).
   g. `effectiveOrder` (step 3).
   h. Words: `files.read` each member and `countWords` on its content. Totals: `body` is the sum over `body` entries; `manuscript` is the sum over all entries.
   i. `revision` (P19) with `createHash('sha256')`; warnings in P21 order. Return the `ManuscriptView`.
5. **`manuscript.controller.ts`.** Add `@Get(MANUSCRIPT_ROUTE)` calling `view()`.
6. **`compile-export.module.ts`.** Imports, controller, provider and export as in section 3 (P24).
7. **`app.module.ts`.** Add the import after the `GraphRunnerModule` import, and `CompileExportModule` after `GraphRunnerModule` in `COMPOSED_MODULES`. No other edit.
8. **Kit.** Write `compile-export-manuscript.kit.ts` as in section 5.
9. **Tests.** Write `compile-export-manuscript.test.ts` with C1 to C6 as in section 5.
10. **Verify.** (a) `npm run build -w @bbartolome/scriba-contracts`. (b) In `apps/api`: `npx vitest run test/compile-export-manuscript.test.ts`; all six pass. (c) `npm test -w @bbartolome/scriba-api` (build and the full API suite; the Setup & auth invariant sweeps now include the GET). (d) `npm run lint -w @bbartolome/scriba-api` (PLT-09 boundaries). (e) From the repo root, `node --test 'scripts/*.test.mjs'`.
11. **Commit.** Only the section 3 paths, each named in `git add <path>`, with the unit id in the message (`feat(CEX-02): ...`). Never `git add -A` or `git commit -a`.

## 5. Acceptance criteria and tests

The six criteria are unit lines 36 to 41. Each has one test in `compile-export-manuscript.test.ts`. Every test sends `GET /api/compile-export/manuscript` with the loopback host and a session cookie, and parses the body with `manuscriptViewSchema`. Every fixture is built inside the test in a temp library.

| Criterion | Test | Fixture | Expected |
|---|---|---|---|
| C1 No order field and no graph: alphabetical; `.versions`, subfolders and non-`.md` absent. | C1 | Files: `drafts/b.md`, `drafts/a.md`, `drafts/.hidden.md`, `drafts/notes.txt`, `drafts/.versions/x/old.md`, `drafts/sub/inner.md`. No order field, no `graphs/`. | Paths exactly `['drafts/a.md', 'drafts/b.md']`; `orderSource` `alphabetical`; `warnings` `[]`; both `inOrderField` false, `part` `body`, `status` `draft`, `graphOrdered` false. |
| C2 Order field: listed files first in order; unlisted appended alphabetically; stale entry ignored and warned. | C2 | `project.yaml` order: `drafts/c.md` (status `revised`), `drafts/gone.md` (missing), `drafts/a.md` (status `final`), `drafts/intro.md` (part `front`), `drafts/epilogue.md` (part `back`). Files: `a`, `b`, `c`, `intro`, `epilogue`. | Paths `['drafts/intro.md', 'drafts/c.md', 'drafts/a.md', 'drafts/b.md', 'drafts/epilogue.md']`; parts `front, body, body, body, back`; `inOrderField` true except for `b`; `warnings` exactly `[{kind:'staleEntry', path:'drafts/gone.md'}]`; `orderSource` `project`. Then the test rewrites `project.yaml` with `a` before `c` and adds `drafts/d.md`; the new `revision` differs from the first one. |
| C3 Story graph: `order` relations give topological order with alphabetical ties; same-file edge ignored; outside files in `project.yaml` order; cycle falls back and sets `graphCycle`. | C3a and C3b (one test, two libraries) | C3a: files `a`–`e`. `project.yaml` order `drafts/e.md`, `drafts/d.md`, `drafts/a.md`. `graphs/plot.json` (story, `schemaVersion` 1): scene nodes `c1` (`c.md`), `b1` (`b.md`), `b2` (`b.md`), `d1` (`d.md`), `e1` (`e.md`), `e2` (`e.md`), `a1` (`a.md`); entity node `x1` with no path. Edges: `c1→b1` order; `c1→d1` order; `b1→b2` order (same file); `e1→e2` order (same file); `a1→c1` causality; `x1→c1` order (no path). C3b: files `a`–`c`. `project.yaml` order `c`, `b`, `a`. `graphs/loop.json`: nodes `p` (`a.md`), `q` (`b.md`), `r` (`c.md`); edges `p→q` order, `q→p` order, `r→p` order. | C3a: `['drafts/c.md','drafts/b.md','drafts/d.md','drafts/e.md','drafts/a.md']`; `graphOrdered` true for `c`, `b`, `d` only; `orderSource` `graph+project`; `warnings` `[]`. C3b: `['drafts/c.md','drafts/b.md','drafts/a.md']`; `graphOrdered` false everywhere; `orderSource` `project`; `warnings` exactly `[{kind:'graphCycle', files:['drafts/a.md','drafts/b.md']}]`. |
| C4 Two story graphs unioned; an invalid graph file skipped with a warning. | C4 | Files `a`–`d`; no order field. `graphs/first.json`: nodes `n1` (`c.md`), `n2` (`b.md`); edge `n1→n2` order. `graphs/second.json`: nodes `n1` (`d.md`), `n2` (`c.md`); edge `n1→n2` order (node ids deliberately reused). `graphs/broken.json` with the text `{ not json`. `graphs/wrong-schema.json` with `{"schemaVersion":2,"view":"story","name":"x","nodes":[],"edges":[]}`. | Paths `['drafts/d.md','drafts/c.md','drafts/b.md','drafts/a.md']`; `orderSource` `graph+project`; `warnings` contains exactly two `invalidGraph` entries, for `graphs/broken.json` and `graphs/wrong-schema.json`. (Only `first` would give `c, b, a, d`; a single shared node map would give a different order.) |
| C5 Word totals equal the sum of per-file counts; front matter and code do not count. | C5 | `drafts/a.md` is the text below. `drafts/b.md` is `Alpha beta.` and `project.yaml` order is `drafts/b.md` with part `back`. | `words`: `a` 9, `b` 2; `totals` `{body: 9, manuscript: 11}`; the test also asserts totals equal the sums of the entries' words. |
| C6 The GET is side-effect free. | C6 | The C3a fixture. | After `sessionCookie`, snapshot the library (`snapshotLibrary`), open `observeEvents`, send the GET twice, take the observer's blocks after `EVENT_WAIT_MS`, close it. The library snapshot is equal before and after; no block mentions `compile-export`; the two bodies are equal. |

The exact text of `drafts/a.md` for C5 (the front matter, the URL, the comment and the fence are the cases under test):

````text
---
title: Front matter words do not count
---

# Chapter one

One two three, see https://example.com/some/path now.

<!-- hidden comment words -->

```text
fenced code with five words
```

Four five.
````

Counted by hand: `Chapter one` (2), `One two three, see now` (5, the URL removed), `Four five` (2). Total 9. The front matter, the comment and the fenced code are not counted.

Kit (`compile-export-manuscript.kit.ts`):

- `manuscriptLibrary(files: Record<string, string>): { library: string; remove(): void }`. A temp library. Writes `.scriba/settings.yaml` with `ACTIVE_BOOK_SETTINGS` (from `project-store-files.kit.ts`, lines 40 and 41), makes `book` the active project, writes `book/project.yaml` as `schemaVersion: 1`, `title: Book`, `genrePack: nonfiction` unless the map gives `project.yaml`, and writes each other key under `book/` with `putFile` (from `project-store-files.kit.ts`, line 70). Keys are project-relative.
- `withManuscript<T>(files, run)`: boots `createTestApp({ libraryDir })`, takes `sessionCookie(app, library)`, runs `run(app, cookie, library)`, closes the app and removes the library in `finally`.
- `getManuscript(app, cookie)`: `send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path: MANUSCRIPT_ROUTE })`.
- `manuscriptOf(reply)`: asserts status 200 and returns `manuscriptViewSchema.parse(JSON.parse(reply.body))`.

## 6. Agreement with downstream units and other plans

- **CEX-03** (reorder, status and part writes; `blocked_by` CEX-02). Needs the current `revision` and the entries in effective order, with `path`, `part`, `status` and `graphOrdered`, to materialise the full order. Provided by `ManuscriptService.view()`, recomputed on each call (P19), so a stale-revision check compares with the current state. CEX-03's write rules are its own. Open point 2 affects its conflict check.
- **CEX-04** (assembled Markdown; `blocked_by` CEX-02, GNP-03, SAU-09). Needs the front, body and back order, each entry's `part`, and `totals.body` for the rounded count. Provided. CEX-04 strips each file's front matter with its own rule; the output of `countWords` is not reused.
- **CEX-05** (preflight endpoint; `blocked_by` CEX-02). Needs the assembled files in effective order and the `revision` for the preflight result. Provided by the view.
- **CEX-09** (assembly-preflight gate; `blocked_by` CEX-02 and the others). Needs the exported service. Provided: `CompileExportModule` exports `ManuscriptService`. The nonfiction-sample criterion is CEX-09's own test; C2 covers the rule it relies on.
- **CEX-06 and CEX-07** (after CEX-05). Consume the entries. Provided.
- **CEX-17** (manuscript route UI; parallel with CEX-02). Builds on contract types and the Shell's fakes; no shared path. It reads the GET body as `manuscriptViewSchema` describes it. Unchanged by this plan.
- **CEX-08** (nonfiction sample order; parallel with CEX-02). Its `order` entries must pass `orderEntrySchema` and its statuses must be in the enum; both hold. CEX-02's tests never read `examples/`, so the two merge in either order.
- **CEX-10, CEX-16, CEX-18 to CEX-20, AGL-24, GNP-19.** Depend on CEX-02 through CEX-05 or CEX-09. Need no new name from this plan.
- **Merge order.** This plan uses only merged code: CEX-01, PST-12 and SAU-08 are on main at `c96cadd`. It edits no file of CEX-08 or CEX-17. Among the parallel units, only CEX-02 edits `apps/api/src/app.module.ts`. If another change to `COMPOSED_MODULES` lands first, keep both entries; the edit is a single import and a single array entry.
- **In-flight plans** at `c96cadd`: `plans/GNP-20.md` (draft; another agent has an uncommitted edit to it, which this plan does not read or touch), `plans/SAU-22.md` and `plans/TRG-14.md` (planned). None of them lists `apps/api/src/app.module.ts`, `apps/api/src/modules/compile-export/`, the Project store's `files.service.ts` or `apps/api/test/invariant-sweep.ts`. SAU-22 names `setup-auth.guard.ts` and `request-policy.ts`; CEX-02 depends on the guard only through the global guard, and the Setup & auth sweeps cover the new route whichever lands first. GRR-10 is `done` and changed only web graph-runner files and an e2e spec.

## 7. Open points

1. **Inline code (criterion 5 wording).** The criterion says "code don't count"; the unit's word-count list names fenced code only. Planner's default (P17): inline code is counted. The C5 fixture has no inline code, so no test depends on the answer. The Navigator decides whether inline code is "code".
2. **Revision excludes story graphs (settled by the unit, line 32).** A graph edit changes the effective order without changing `revision`. CEX-03's stale-revision check therefore does not refuse a reorder made against an old graph. This plan keeps the settled rule. The Navigator confirms that this is intended.
3. **Whole-GET failure on unreadable input (P7, P23).** An over-size or non-text draft, or a `project.yaml` with an invalid `order`, fails the whole GET. The contract's warning kinds (`graphCycle`, `invalidGraph`, `staleEntry`) cannot report a per-file read failure; per-file reporting needs a new warning kind, which is an expand change to CEX-01's contract. The Navigator decides before CEX-03 whether that is wanted.
4. **Definition of stale (P8).** The unit says "stale entries (missing files)". This plan also treats an entry that names a non-manuscript path (subfolder, `.versions/`, hidden, not `.md`) as stale, because CEX-03 materialises entries only for current manuscript files. The Navigator confirms this reading. The default is in place.

## 8. Facts checked and assumed

### 8a. CHECKED

Read at `ef60970` and rechecked at `c96cadd`: the paths and commits changed between the two (only GRR-10's web and e2e files, `package-lock.json`, `plans/DECISIONS.md`, `plans/GRR-10.md`, `units/GRR-10-vflow-adapter.md`) touch no path of this plan.

- **Unit and module.** `units/CEX-02-effective-order-view-model.md`: front matter (`module` line 4; `blocked_by` line 7; `parallel_with` line 8; `unblocks` line 9); Why line 15; effective order lines 17 to 25; word counts lines 27 to 29; view model lines 31 to 33; criteria lines 35 to 41. The file has no change note. `modules/compile-export.md` has no front matter; lines 39 to 62 are cited above. `units/README.md`: unit format (lines 34 to 57) and blocker notation (lines 59 to 65). `plans/PLT-02.md` and `plans/CEX-01.md`: structure and review-part convention.
- **Blockers on main.** CEX-01 (`2e0471d`, `c9fef69`; plan `status: done`), PST-12 (`377a83c`; `done`), SAU-08 (`0e6778d`; `done`). `plans/QUEUE.md` lists CEX-02 as available.
- **Contract on main.** `packages/contracts/src/compile-export/`: `order.ts` (revision line 24; entry, totals, warnings, view lines 27 to 59), `constants.ts` (defaults lines 32 and 33; `ORDER_SOURCES` lines 36 to 40), `routes.ts` (line 4). `project-store/order-export.ts`: `MANUSCRIPT_FOLDER` line 18, path pattern lines 21 and 22, `orderEntrySchema` lines 26 to 30. `project-store/index.ts` does not re-export it; `compile-export/order.ts` does (lines 20 and 21).
- **Graph contract.** `graph-runner/graph.ts`: `storyNodeSchema` lines 39 to 61, `storyEdgeSchema` lines 64 to 69 (`relation` optional), `graphFileSchema` lines 183 to 186. `graph-runner/constants.ts`: `GRAPH_ID_PATTERN` line 22, `RELATION_VOCABULARY.order` line 38, `GRAPH_FOLDER` line 44. The subpath index re-exports both files.
- **Project store.** `FilesService`: `list` (about line 232), `read` (about line 257; its too-new check for `project.yaml`), `projectFor` (about lines 512 to 519: `requireActive`, then the lookup), `hashOf` (lines 87 to 89). `ProjectStoreService.activeId()` (`project-store.service.ts`, lines 51 to 57). `project-store.module.ts`: entry exports (lines 25 to 32) and module exports (lines 71 to 79). `path-safety.ts` lines 140 to 142 refuse an empty segment. `PROJECT_ERROR_CODES.NO_ACTIVE` and `INVALID`, and their statuses, in `project-store/errors.ts`. `projectYamlSchema` narrows `order` to `orderEntrySchema` (`project.ts` lines 21 to 29).
- **Graph runner.** `graphIdOf` (`graph-runner.service.ts` lines 73 to 79); root listing before the graphs folder (`graphEntries`, about lines 215 to 226); `activeProjectId()` (about lines 196 to 204). `graph-runner.module.ts` imports `PlatformModule` and `ProjectStoreModule` through entry files.
- **Errors and composition.** `ModuleError` is exported from `platform.module.ts` (line 17) with `(code, status, message)`. `app.module.ts` lines 20 to 28 hold `COMPOSED_MODULES`; the Setup & auth invariant tests import it.
- **Test seam.** `create-test-app.ts` (`createTestApp`, lines 66 to 90; `routes()` line 27). `guard-request.ts` (`send`, `sessionCookie`, `Reply` lines 20 to 24). `project-store-files.kit.ts` (`ACTIVE_BOOK_SETTINGS` lines 40 and 41; `putFile` line 70). `invariant-sweep.ts` (fixture rule, header lines 4 to 6; `sweepGetHead` asserts no status, header lines 12 and 13; `EVENT_WAIT_MS` line 208; `snapshotLibrary` line 330; `observeEvents` line 412; `Observer.take` and `close`). `apps/api/vitest.config.mts` line 8 (`test/**/*.test.ts`). `apps/api/package.json`: name `@bbartolome/scriba-api`; `build`, `test` and `lint` scripts (lines 6 to 8); `yaml` 2.9.1 and `zod` ^4 (lines 20 and 21).
- **Lint rule.** `eslint.config.mjs`: an API module imports another only through its `*.module.ts` entry (rule R1).
- **Front-matter rule.** `plans/SHL-11.md` decision 5 (line 27) and step 3 (lines 124 to 132); implemented on main in `apps/web/src/app/shell/markdown-preview.ts` (`stripFrontMatter`, line 22; commit `b36fb90`).
- **No existing helper.** No word-count, `Intl.Segmenter` or front-matter helper in `apps/api/src` or `packages/contracts/src` that compile-export could import.
- **DECISIONS** (searched, not read whole): lines 3430, 3466 and 3954, plus the headings at 3425, 3462, 3946 and 5806 (line numbers at `c96cadd`).
- **Segmenter.** A one-off `node -e` check outside the repo gave 9 words for the body of C5's `drafts/a.md` (after the same stripping) and 2 for `Alpha beta.`, with `'en'`, `granularity: 'word'` and `isWordLike`.

### 8b. ASSUMED (not run here)

- The planner ran no build, test or lint command. The implementer runs the commands of section 4, step 10.
- The `yaml` package's `toJS()` on a `parseDocument` result (the store uses `parseDocument` and `doc.errors`; `toJS` is the standard method).
- The runtime's `Intl.Segmenter` behaves as checked above (Node 26 is the environment named in `plans/PLT-02.md`).
- C6's event filter is robust to heartbeats: a heartbeat block does not mention `compile-export`.
- The Setup & auth sweeps pass for a GET with no active project in the sweep's library, because `sweepGetHead` asserts no status. This plan adds no `FIXTURE_PATHS` entry.
- `snapshotLibrary` fingerprints each file by size, times, inode and sha256 (the comment above it, `invariant-sweep.ts` lines 326 and 327), so an unchanged tree compares equal after the GET.

## 9. Review parts

One part. The change is one GET over one service. Every test reads the whole view, since `manuscriptViewSchema` requires every field; a split would test partly built output.

- **Part 1:** steps 1 to 11 (section 4) and tests C1 to C6 (section 5).
