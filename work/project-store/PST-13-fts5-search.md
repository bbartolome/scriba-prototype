---
id: PST-13
title: FTS5 keyword search per project behind the backend-agnostic search contract
module: project-store
phase: phase:search
milestone: M2
blocked_by: [PST-08, PST-12]
parallel_with: [PST-15, PST-16]
unblocks: [PST-14, "Agent loop search_notes and grounding (phase:search consumers)"]
---

# PST-13 — Search

## Why
Find quotes and studies by keyword (36), fresh without manual rebuilds (37), rebuildable (38), drafts excluded so grounding never matches the author's prose (39); ranked passages for the grounding check (47).

## Decisions
- One **disposable** database per project at `${SCRIBA_BOOKS_DIR}/.scriba/index/<project-id>.db` via built-in `node:sqlite` (FTS5; no native addons). The file name is the project id **percent-encoded**, so any legal folder name is safe.
- Indexes **exactly `sources/` and `entities/`**. Never `drafts/`, `snapshots/`, `graphs/`, `logs/` or anything else.
- **Passages** are paragraphs (blocks split on blank lines); front-matter values are indexed as their own passage. Each records file and character offset. Tokenizer `porter unicode61`.
- **Freshness:** reuse PST-08's `(path, mtime, size)` manifest, stored in the database, diffed against disk on activation and before each query; only changed/added/removed files are re-indexed.
- `PRAGMA user_version` ≠ the module's index-format constant → rebuild on open. **Full rebuild is a POST.** Orphan indexes (from renamed/removed project folders) are pruned at startup.
- **Query:** the author's text becomes a safe FTS5 query (each term quoted, joined with OR so long claims still retrieve), ranked by BM25. Contract: `{query, limit?, scope?: ('sources'|'entities')[]}` → `[{path, offset, snippet, score}]`; `score` is negated BM25 (higher is better), snippet from FTS5's snippet function. The contract names no FTS5 concept (vector search could be added behind it later).
- **Search is a POST** (it may refresh the index) and is on the in-process provider; subject to the active-project check.

## Acceptance criteria
- [ ] A query returns ranked `{path, offset, snippet, score}`, and the passage text sits at `offset` in the file.
- [ ] A file edited on the host appears in the next query's results with no manual rebuild; a deleted file disappears.
- [ ] Files in `drafts/` never appear in results.
- [ ] Overwriting the index with one whose `user_version` differs triggers a rebuild; results stay correct.
- [ ] Queries containing `"`, `*`, `-`, `NEAR` don't error.
- [ ] An orphan index file is removed at startup; a project id with unusual characters gets a safe file name.
