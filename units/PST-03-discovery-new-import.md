---
id: PST-03
title: Library discovery, project list, New and Import
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-02]
parallel_with: [PST-11]
unblocks: [PST-04, PST-05, PST-09]
---

# PST-03 — Discovery, list, New, Import

## Why
Find every project automatically (story 1), ignore dot-folders (2), offer folders without `project.yaml` for import (3), create from a title (4–6), import safely with clear errors (7–8).

## Decisions
- A project is every **immediate, non-dot subfolder** of the library containing `project.yaml`. Discovery never recurses and never follows a symlinked top-level folder pointing outside the library.
- **Project id = folder name**; project-scoped routes carry it as `:projectId`. A host rename gives a new id.
- `GET` project list: per folder `{id, title, genrePack, active, status}` with status `ok`, `invalid` (with schema error), `too-new` (newer `schemaVersion` than supported), or `importable` (no `project.yaml`). Pure read.
- **New** (POST) `{folderName?, title, genrePack?}`: folder name slug of lowercase letters, digits, hyphens, derived from the title by default; default genre pack `nonfiction` (Setup & auth's first-project step passes the author's preference). Fails `PROJECT_EXISTS` if the folder exists. Scaffolds **without `structure/`**: `project.yaml` (`schemaVersion: 1`), `sources/`, `entities/`, `drafts/`, `graphs/`, `logs/`, and a `.gitignore` containing `.scriba/`. Does not create `snapshots/` (Compile & export creates it on first use) nor any scene/beat folders.
- **Import** (POST) applies to an `importable` or `invalid` folder: validates `project.yaml` (returns `PROJECT_INVALID` with exact Zod issues if invalid), or creates a minimal one (title from folder name, `schemaVersion: 1`). Appends `.scriba/` to `.gitignore` if missing (creating it if absent). Never moves, renames or rewrites any other file, never creates the layout folders (they're created lazily on first write).
- `project.yaml` is written/edited as a **YAML document** (comment- and order-preserving), never re-serialised from an object.
- Setup & auth's `/setup` flow calls these same endpoints.

## Acceptance criteria
- [ ] Discovery lists exactly the non-dot immediate subfolders with `project.yaml`, marks the others `importable`, ignores `.scriba/` and other dot-folders, and doesn't follow an outward top-level symlink.
- [ ] Invalid and too-new `project.yaml` list as `invalid` (with the issue) and `too-new`.
- [ ] New creates the layout without `structure/` or `snapshots/` and with a `.gitignore` containing `.scriba/`; a second New with the same folder fails `PROJECT_EXISTS`.
- [ ] Import leaves every other file byte-identical (hash the tree before/after), appends `.scriba/` to an existing `.gitignore` once, and reports exact issues for an invalid `project.yaml`.
- [ ] The list GET is side-effect free.
