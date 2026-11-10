---
id: CEX-02
title: Module skeleton, manuscript membership, effective-order algorithm, parts, word counts, GET manuscript
module: compile-export
phase: phase:assembly-preflight
milestone: M5
blocked_by: [CEX-01, "Project store phase:files (PST-12)", "Setup & auth phase:token-guard (SAU-08)"]
parallel_with: [CEX-08, CEX-17]
unblocks: [CEX-03, CEX-04, CEX-05]
---

# CEX-02 — Effective order and the view model

## Why
Every top-level draft is included (1) and nothing else (2–3); predictable alphabetical default (4); `project.yaml` order (5); story-graph order (6) with deterministic ties (7), cycle fallback (8), unordered files placed after (9); text order inside a file (10); same-file edges ignored (11); new drafts appended (12); stale entries ignored (13); word counts (23).

## Effective order (apply in this order)
1. **Collect** manuscript files: top-level regular `.md` files in `drafts/` (skip subfolders and hidden files).
2. **Partition** by `part` from each file's order entry (default `body`). Front and back keep their relative order from the order field, then alphabetical. The story graph never orders front or back matter.
3. **Order the body:**
   - **No story graph** (no file in `graphs/` with `view: 'story'`): `project.yaml` order, then files without an entry appended alphabetically by path. Stale entries (missing files) are ignored.
   - **With story graphs:** take the **union** of edges whose relation is exactly `order` across all story graphs; read each as "from precedes to"; project onto files by mapping each endpoint node to its `path`; drop the edge if either endpoint has no `path`, its path isn't a body manuscript file, or both endpoints map to the **same file**. Files touched by a remaining edge form the **graph-ordered block**, sorted topologically with ties broken alphabetically by path. Other body files follow in `project.yaml` order, then alphabetically.
   - **Cycle** over distinct files → ignore the graph entirely (order by `project.yaml`, then alphabetical) and set the `graphCycle` warning listing the files.
4. **Inside a file**, the author's text order; compile never parses scene boundaries.
- Graph files are parsed with the Graph runner's schema; a file failing validation is skipped and reported as an `invalidGraph` warning.

## Word counts
- Count on each file's body after stripping YAML front matter; remove Markdown syntax, URLs, HTML comments and fenced code; count `Intl.Segmenter` word segments with `isWordLike`. Same rule everywhere, so totals equal the sum of files.
- Per file; **body total**; **manuscript total** (body + front + back files; generated matter not counted).

## View model
- `GET /api/compile-export/manuscript`: entries `{path, part, status, words, graphOrdered, inOrderField}`, totals, `orderSource` (`alphabetical` | `project` | `graph+project`), warnings, `revision` (hash of the current order field plus the set of manuscript files).
- Module skeleton registered in the composition root.

## Acceptance criteria (fixture projects via GET)
- [ ] No order field and no graph → alphabetical; `drafts/.versions/x/…`, other subfolders and non-`.md` files absent.
- [ ] With an order field, listed files first in that order; an unlisted file appended alphabetically; a stale entry ignored and reported as a warning.
- [ ] With a story graph, `order` relations give topological order with alphabetical ties; an edge between two scene nodes in one file is ignored; files outside the graph follow in `project.yaml` order; a cycle falls back to `project.yaml` order and sets `graphCycle`.
- [ ] Two story graphs are unioned; an invalid graph file is skipped with a warning.
- [ ] Word totals equal the sum of per-file counts; front matter and code don't count.
- [ ] The GET is side-effect free.
