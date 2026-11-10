# Spec: Compile & export

## Problem Statement

An author who has written a book's chapters and scenes as Markdown files in `drafts/` has no way yet to turn them into one manuscript. Nothing decides the order the files go in, which files count, or where front and back matter come from. Nothing tells the author, before they send a file to an editor, agent or self-publishing platform, that the manuscript still holds a `TK`, a claim the sources don't support, a scene node that points at a deleted file, a broken entity link or a phrase their style profile bans. They can't produce the formats publishing needs: a DOCX in standard manuscript layout for submission, an EPUB for self-publishing, a PDF to read or print, and plain Markdown. They have no one-click way to save the whole manuscript before a risky revision and roll back to it afterwards.

The author's brief said the manuscript is "assembled from chapter files in outline order". The recorded design decisions replaced that. Order now comes from an order field in `project.yaml`, or from the story graph's `order` relations when a story graph exists, and the manuscript is every top-level file in `drafts/`. This spec turns those decisions into a module.

## Solution

Compile & export is a vertical feature module with its own NestJS `@Module` and its own lazy Angular route, the **manuscript view**. It does five things.

1. **Assembly.** It works out the effective order of the manuscript. The manuscript is every top-level file in `drafts/`. The order comes from the `project.yaml` order field (default: alphabetical). When a story graph exists, its `order` relations, projected onto the files their story nodes point at, are applied first. Inside a file, the text order the author wrote decides everything. The result is one Markdown source, with front matter and back matter placed around the body.
2. **Preflight.** Five deterministic checks run over the assembled manuscript without calling a model: unresolved placeholders, unsupported claims (read from the Agent loop's grounding results), orphan scenes, broken entity links, and banned phrases from the style profile.
3. **Export.** It calls Pandoc 3.13 server-side to produce Markdown, DOCX (standard manuscript layout), EPUB and PDF. PDF goes through Typst (`--to=typst --pdf-engine=typst`). The template for each format can be overridden in the project's export settings. A Typst quality spike decides whether Typst's PDF is good enough to keep in v1.
4. **Snapshots.** One click saves the current manuscript to `snapshots/<label>-<ts>/`. Snapshots can be listed and restored. Compile & export owns `snapshots/` and never reads draft versions in `drafts/.versions/`.
5. **Manuscript view.** The author sees every manuscript file in order, with word counts per file and in total and a status for each file (outline, draft, revised or final). They can drag files to reorder them, which writes the `project.yaml` order field, set each file's status, run preflight, export, and create or restore snapshots.

Compile & export reads the story graph's `order` relations and nothing else. It never runs a graph.

## User Stories

### Assembly and order

1. As an author, I want every top-level file in `drafts/` included in my manuscript automatically, so that I never have to register a new chapter before it shows up.
2. As an author, I want older versions in `drafts/.versions/` and any other subfolder of `drafts/` left out of the manuscript, so that history never leaks into the book.
3. As an author, I want `sources/`, `entities/`, `graphs/`, `logs/`, `snapshots/`, `.scriba/` and `project.yaml` kept out of the manuscript, so that research and app files never appear in my book.
4. As an author with no story graph and no saved order, I want my drafts ordered alphabetically by file name, so that a new project compiles predictably with zero setup.
5. As an author, I want the order I set to be stored in the `project.yaml` order field, so that I can read it, edit it by hand and put it under git.
6. As an author who has drawn a story graph, I want `order` relations between scene nodes to put their files in that sequence, so that I can arrange the book where I already think about its structure.
7. As an author whose story graph branches, I want files that are equal in the graph's order to fall back to alphabetical order, so that compile is deterministic.
8. As an author who accidentally made a cycle of `order` relations, I want compile to fall back to my `project.yaml` order and tell me about the cycle, so that a graph mistake never blocks an export.
9. As an author, I want files my story graph doesn't order to follow the graph-ordered files in my `project.yaml` order, then alphabetically, so that every draft still has a place.
10. As an author whose chapter file holds several scenes, I want the scenes to compile in the order I wrote them, so that the text in my file is what the reader gets.
11. As an author, I want `order` relations between two scene nodes that point at the same file ignored, so that the graph never tries to reorder text inside a file.
12. As an author, I want a new draft I haven't placed yet to be appended alphabetically after the files I have placed, so that it is visible and easy to drag into position.
13. As an author, I want an order entry for a file I deleted or renamed to be ignored during assembly and reported by preflight, so that stale entries never break the manuscript.
14. As an author, I want the YAML front matter of each draft (for example the provenance the agent records) stripped from the manuscript, so that metadata never shows up in the book.

### Front and back matter

15. As an author, I want a title page generated from my project's title, subtitle, author name and contact details, so that my submission DOCX starts the way agents expect.
16. As an author, I want to type a short dedication in the export settings, so that I don't need a file for one line.
17. As an author, I want to mark a draft file as front matter or back matter (for example acknowledgements, a foreword, notes or an author's note), so that it is placed before or after the body without a new folder.
18. As a nonfiction author, I want a bibliography generated from my Source entities and placed at the end, so that I don't maintain a reference list by hand.
19. As a nonfiction author, I want to choose between listing every Source entity and listing only the ones my manuscript cites, so that the bibliography fits the book.
20. As a fiction author, I want an author's note in the back matter as an ordinary draft file marked back, so that it is edited like the rest of my prose.
21. As an author, I want my Markdown footnotes rendered as each format's native notes, so that notes work in Word, EPUB and PDF without extra markup.

### Manuscript view

22. As an author, I want a manuscript view that lists every manuscript file in compile order, grouped into front matter, body and back matter, so that I can see the shape of the book at a glance.
23. As an author, I want a word count per file and a total for the body and for the whole manuscript, so that I can track length against my target.
24. As an author, I want to drag a file to a new position, so that I can reorder chapters without editing YAML.
25. As an author, I want a file that the story graph orders to show a badge and stay locked in place, so that I know to change its position in the graph.
26. As an author, I want to mark each file as outline, draft, revised or final, so that I can track progress through revision.
27. As an author, I want status saved in `project.yaml` next to the file's order entry, so that my draft files need no front matter.
28. As an author, I want a reorder that clashes with an edit made on another device, or by hand in `project.yaml`, to be refused with a prompt to reload, so that I never silently overwrite my own order.
29. As an author with the app open in two tabs, I want the second tab to refresh when I reorder in the first, so that both always show the same order.
30. As an author on a phone, I want to read the manuscript outline with word counts and statuses, so that I can check progress away from my desk.
31. As an author, I want to open a file from the manuscript view, so that I can go straight from the outline to the text.

### Preflight

32. As an author, I want preflight to run automatically before every export and also on demand, so that I see problems before I send a file anywhere.
33. As an author, I want leftover placeholders such as `TK`, `TODO`, `XXX` or unrendered `{{…}}` flagged with their file and line, so that unfinished bits never reach an editor.
34. As a nonfiction author, I want claims the grounding check marked unsupported flagged as errors and weak ones as warnings, so that I fix invented facts before publishing.
35. As an author, I want files with no grounding result, or whose text changed since the last grounding check, listed as unchecked, so that I know where the claims check doesn't reach.
36. As an author, I want scene and beat nodes whose `path` points at a missing file, or at a file that isn't a top-level draft, flagged as orphan scenes, so that my story graph and my files stay in step.
37. As an author with a story graph, I want manuscript files that no story node points at listed as not on the graph, so that I notice a chapter I forgot to map.
38. As an author, I want entity references that point at an entity that no longer exists flagged, so that I don't publish broken links.
39. As an author, I want every occurrence of a phrase my style profile bans reported with its location, so that I can strip my verbal tics.
40. As an author, I want each finding to link to its place in the file, so that I can fix it in one click.
41. As an author, I want preflight to warn me but never block me, so that I can still export a rough draft for a reader.
42. As an author, I want preflight to run without calling a model, so that it is fast, free and works offline.

### Export

43. As an author, I want to export Markdown, DOCX, EPUB and PDF from the manuscript view, so that one source serves every destination.
44. As an author submitting to agents, I want the DOCX in standard manuscript layout (12 pt serif, double spacing, 1-inch margins, a running header with surname, short title and page number, each chapter on a new page), so that it meets submission norms.
45. As a self-publishing author, I want an EPUB 3 with my title, author, language and a table of contents, split by chapter, so that it opens cleanly in an EPUB reader.
46. As an author, I want a PDF that works out of the box with no TeX install, so that I can proofread a typeset copy offline.
47. As an author, I want to override the template for each format (a reference DOCX, an EPUB stylesheet, a Typst template) from my project's export settings, so that the output matches my house style.
48. As an author, I want a "copy default template into my project" action, so that I start customising from a working file.
49. As an author, I want the export to download in my browser with a file name built from the title, the format and a timestamp, so that exports don't overwrite each other on my device.
50. As an author, I want a clear error that names the problem when Pandoc fails, so that I can fix a bad template or a malformed file.
51. As an author, I want export to work the same in the container on amd64 and arm64, so that my Mac and my Linux box produce the same files.

### Snapshots

52. As an author, I want to save a labelled snapshot of the whole manuscript in one click, so that I can try a risky revision without fear.
53. As an author, I want my snapshots listed newest first with label, time, file count and word count, so that I can find the one to roll back to.
54. As an author, I want restoring a snapshot to put the top-level `drafts/` files, their order and their statuses back as they were, so that the manuscript is exactly what I saved.
55. As an author, I want an automatic "pre-restore" snapshot taken before every restore, so that a restore can be undone too.
56. As an author, I want restore to leave my per-draft versions in `drafts/.versions/` untouched, so that the two histories stay separate.
57. As an author, I want snapshots stored as plain folders in my project, so that I can browse or copy them outside the app.

### Operators and other modules

58. As the Platform CI, I want an image smoke step that exports the nonfiction sample to all four formats, so that a broken Pandoc or Typst in the image fails the build.
59. As the Agent loop, I want a stable grounding result shape that preflight consumes, so that grounding and preflight agree on what "unsupported" means.
60. As a demoer, I want the nonfiction sample to carry an order field with mixed statuses, so that the manuscript view and the `project.yaml` branch can be shown straight from "start from sample".

## Implementation Decisions

### Module shape

- One NestJS `@Module` imported into Platform's API composition root, and one lazy `Routes` array registered in the Shell's route table. All endpoints sit behind Setup & auth's guard. GET and HEAD never mutate: reorder, status, preflight, export, snapshot create and restore are POSTs. Preflight is a POST because it is a command, even though it writes nothing.
- All project file access goes through the Project store's file API and its path-safety invariant. The one exception is snapshot copy and restore, which use a Project store bulk primitive if one exists. Otherwise they copy file by file through the file API (see Further Notes).
- Compile & export never reads `drafts/.versions/` and never writes there. It never runs a graph. It never calls a model.

### Manuscript membership

- The manuscript is every **top-level regular file with a `.md` extension** in `drafts/`. Subfolders are skipped, which excludes `drafts/.versions/`. Hidden files are skipped as well.
- The `.md`-only rule is a decision this spec makes. The decision "Manuscript assembly order without a story graph" says "every file". Non-Markdown files in `drafts/` (images, for example) are left out and can be referenced from Markdown instead.

### The `project.yaml` order field

- The field is an ordered list of **order entries**: `{ path, status?, part? }`.
  - `path` is a project-relative file reference (the Project store type), for example `drafts/ch01.md`.
  - `status` is one of `outline | draft | revised | final`. When absent, it is `draft`.
  - `part` is one of `front | body | back`. When absent, it is `body`.
- **Status lives on the order entry** (decided here), not in front matter. Scene files need no front matter, and `project.yaml` is author-inspectable and under git.
- **Every write materialises the whole effective order.** Any reorder or status change writes one entry for every current manuscript file, in effective order. A single new entry would otherwise jump ahead of the unnamed files that are appended alphabetically. Entries that point at missing files are dropped on write and reported by preflight before that.
- Writes change only the `order` key (and the `export` key, from the export settings panel). They preserve the rest of `project.yaml`'s text, comments and key order.
- **Optimistic concurrency.** The manuscript view model carries a `revision`, a hash of the current order field and the set of manuscript files. Reorder, status and settings requests carry the `revision` they were based on. A mismatch returns a conflict error and nothing is written. This covers edits made by hand on the host and edits from another device.
- A renamed file loses its entry and its status: it reappears as a new, unplaced file. This is the same known cost as the rename rule in the decision "Current draft versus older versions in drafts/".
- Project store owns the `project.yaml` schema and reserves `order` (and `export settings`) from day one. This module defines what goes inside them (see Contracts).

### Effective order (assembly algorithm)

Apply these steps in this order:

1. **Collect** the manuscript files (above).
2. **Partition** them by `part`, read from each file's order entry (default `body`). Front matter and back matter keep their relative order from the order field, then alphabetical. The story graph never orders front or back matter.
3. **Order the body.**
   - **No story graph** (no file in `graphs/` with `view: 'story'`): order by the `project.yaml` order field. Files without an entry are appended alphabetically by path.
   - **With a story graph:** read every story graph in `graphs/` and take the union of their edges whose relation is exactly `order`. Read each edge as "from precedes to". Project each edge onto files: map each endpoint node to its `path`, and drop the edge if either endpoint has no `path`, its path is not a body manuscript file, or both endpoints map to the **same file**. The files touched by at least one remaining edge form the **graph-ordered block**. Sort that block topologically, breaking ties alphabetically by path. The other body files follow the block in `project.yaml` order, then alphabetically.
   - **Cycle:** if the projected edges contain a cycle over distinct files, ignore the graph completely. The body is ordered by `project.yaml`, then alphabetically, and the manuscript view model carries a `graphCycle` warning that lists the files in the cycle.
4. **Text order inside a file** is the order the author wrote. Compile treats a file as one unit and never parses scene boundaries.

- Placing the graph-ordered files as a leading block is this spec's reading of the decision "Manuscript assembly order without a story graph" ("its `order` edges over files come first"). It is the simplest deterministic merge. A reviewer should confirm this reading.
- Taking the union of all story graphs is also decided here, because nothing limits a project to one story graph. A cycle across graphs triggers the same fallback.
- Graph files are parsed with the Graph runner's schema. A graph file that fails validation is skipped, and the manuscript view model reports it as a warning.

### Assembled Markdown

- The output is one Pandoc Markdown document built in this order:
  1. a generated YAML metadata block (title, subtitle, author, language, date, rights, identifier);
  2. front matter files;
  3. the dedication, if set;
  4. body files;
  5. back matter files;
  6. the generated bibliography, if enabled.
- Each file has its own YAML front matter stripped. Files are joined with blank lines so that every file starts a new block.
- Chapter structure comes from the author's own headings. Compile does not inject headings, except the generated "Bibliography" heading.
- Front and back matter files get Pandoc classes (`.unnumbered`, and `.unlisted` for the dedication) so that they stay out of chapter numbering. The DOCX and EPUB writers place them per format.
- The title page comes from metadata. Standard manuscript layout also needs the contact block and an approximate word count, rounded to the nearest 1,000 for the body. The reference DOCX template renders these.
- **Bibliography.** It is enabled by default when the project's genre pack is nonfiction, and toggled in the export settings.
  - Entries come from Source entities (the Genre packs' Source entity type), rendered from the `citation` field plus the URL when present, sorted alphabetically by citation.
  - **All** (default): every Source entity in the project.
  - **Cited only**: Source entities referenced from a manuscript file, either by an entity reference in the body or by the file's draft provenance (Agent loop format).
  - Pandoc citeproc and CSL are out of scope for v1.
- **Notes** are the author's Markdown footnotes. Pandoc renders them natively: footnotes in DOCX and PDF, endnotes in EPUB. A dedicated notes chapter is simply a back matter file.

### Word counts

- Words are counted on each file's body after the front matter is stripped. Markdown syntax, URLs, HTML comments and fenced code are removed, and `Intl.Segmenter` word segments with `isWordLike` are counted. The same rule applies everywhere, so the totals match the sum of the files.
- The view model reports a count per file, a **body total** (the standard manuscript figure) and a **manuscript total** (body plus front and back matter files; generated matter is not counted).

### Manuscript view model and routes

- `GET` manuscript returns:
  - the effective order: `{path, part, status, words, graphOrdered, inOrderField}` per file;
  - totals;
  - the order source: `'alphabetical' | 'project' | 'graph+project'`;
  - warnings: graph cycle, invalid graph file, stale entries;
  - the `revision`.
- `POST` reorder sends `{revision, front: path[], body: path[], back: path[]}`. The server rejects a body order that moves graph-ordered files relative to one another (the graph-ordered block is fixed), and any list that isn't a permutation of the current files.
- `POST` status sends `{revision, path, status}`. `POST` part sends `{revision, path, part}`.
- After every successful write, the module publishes `manuscript.updated` on the SSE stream (Platform envelope, `module: 'compile-export'`).

### Preflight

- `POST` preflight returns `{ranAt, revision, checks: [{id, status: 'pass'|'warn'|'fail', findings}]}`. A finding is `{check, severity: 'error'|'warning'|'info', path, line?, offset?, length?, message, ref?}`. Check ids are a constant enum: `placeholders | unsupported-claims | orphan-scenes | entity-links | banned-phrases`.
- All five checks are deterministic and make no model calls.
- **Unresolved placeholders (error).** Matches come from a contract constant: whole-word `TK`, `TKTK`, `TODO`, `FIXME` and `XXX` (case-sensitive), plus unrendered `{{…}}`. Fenced and inline code are skipped. A per-project list is out of scope for v1.
- **Unsupported claims.**
  - Preflight consumes the Agent loop's **grounding result** type (claim → `supported | weak | unsupported` plus the cited passage). It reads the latest grounding result recorded for each manuscript file from `logs/`, through the Agent loop's transcript entry format.
  - `unsupported` claims are errors and `weak` claims are warnings.
  - A file with no grounding result is reported as `info`, "not grounding-checked". So is a file whose content hash differs from the one in its latest grounding result ("changed since grounding check").
  - Preflight never starts a grounding check. The finding tells the author to run one from the Agent loop.
- **Orphan scenes (warning)**, defined here:
  - (a) a story node of kind `scene` or `beat` whose `path` is set but does not resolve to an existing top-level manuscript file (missing, in a subfolder such as `.versions/`, or outside `drafts/`);
  - (b) an order entry in `project.yaml` whose `path` is not a current manuscript file (stale entry);
  - (c) `info` only, and only when at least one story graph exists: a body manuscript file that no story node points at ("not on the story graph").
  - Label-only story nodes are never orphans.
- **Broken entity links (error).** Every entity reference in a manuscript file's body (using the Project store's entity reference syntax) and every entity ID in its front matter `links` or draft provenance must resolve to an entity in the project. Project-relative Markdown links and image paths must resolve to existing files inside the project. Paths outside the project are errors.
- **Banned phrases (warning).** Preflight reads the style profile that `project.yaml` references and that profile's banned-phrases field (a Genre packs entity-type field). Matching is case-insensitive and whole-phrase, with whitespace normalised, and code is skipped. Every occurrence is reported. If no style profile is set, the check passes with an `info` note.
- **Preflight never blocks.** The export API always runs preflight first and attaches the summary to the export result. The UI shows a confirm dialog ("N errors. Export anyway?") when there are errors.

### Export

- `POST` export sends `{format: 'md'|'docx'|'epub'|'pdf'}` and returns `{format, fileName, bytes, downloadUrl, preflight: summary, warnings: string[]}`. A `GET` download streams the file and has no side effects.
- Output is written under the project's app-state folder (`<project>/.scriba/exports/`) and the module keeps only the latest file per format. Exports are not part of the author's project content. No `exports/` folder is added to the layout.
- **Pandoc invocation.**
  - Pandoc 3.13 runs as a child process with an argument array and no shell, in a temp working directory.
  - `--resource-path` is the project root. A wall-clock timeout applies (default 120 s), with an output size cap.
  - It never runs `--filter` or Lua filters from project content.
  - Only one export runs at a time per project. A second export returns a busy error.
  - Pandoc's stderr warnings are returned in `warnings`. A non-zero exit returns a Pandoc-failed error with the stderr tail.
- **Per format:**
  - `md`: the assembled Markdown itself, without calling Pandoc. It is still validated by a Pandoc parse in tests.
  - `docx`: `--to=docx --reference-doc=<template>`. The built-in reference DOCX encodes standard manuscript layout: Times New Roman 12 pt, double spacing, 1-inch margins, a header of surname / short title / page, chapter headings on a new page, a first-line indent, and a title page with a contact block and word count.
  - `epub`: `--to=epub3`, `--split-level=1`, a TOC, title, author, language and a stable identifier derived from the project, plus a stylesheet.
  - `pdf`: `--to=typst --pdf-engine=typst` with a Typst template.
- **Templates in project settings.** The `project.yaml` export settings may set one override per format: `docxReferenceDoc`, `epubCss`, `typstTemplate`. Each is a project-relative file reference, checked by path safety and required to exist. Built-in defaults ship in the image with the module.
  - "Copy default into project" writes the built-in file to a path the author picks. The suggested default is the project root (for example `reference.docx`), so no folder is added.
  - An invalid or missing template returns a template error before Pandoc runs.
- **Export settings** (inside `project.yaml`, content defined here): author name, optional pen name, contact block, subtitle, language, rights line, dedication text, bibliography mode (`off | all | cited`), and the per-format template overrides above.

### Snapshots

- **Layout.** `snapshots/<label>-<ts>/`. The `label` is slugified (lowercase, `[a-z0-9-]`, at most 40 characters, `snapshot` if empty). `ts` is UTC `YYYYMMDDTHHmmssZ`.
  - The folder holds copies of every top-level manuscript file (same file names) and one `snapshot.yaml` manifest: `{schemaVersion, label, createdAt, appVersion, order: OrderEntry[], words: {body, total}}`. `order` is the effective order and statuses at capture time.
  - Snapshots never include `drafts/.versions/`, `project.yaml` settings other than the order, or any other folder. "Whole manuscript" means the top-level drafts plus their order.
- **Create.** `POST {label}` returns the snapshot summary. Snapshots are immutable once written. Two snapshots in the same second with the same label get a `-2` suffix.
- **List.** `GET` returns summaries `{id, label, createdAt, fileCount, words}`, newest first. Folders whose manifest is missing or invalid are listed as `unreadable` and are never restored.
- **Restore.** `POST {id}` runs these steps:
  1. take an automatic `pre-restore` snapshot;
  2. write every snapshot file back to `drafts/`;
  3. **delete** top-level manuscript files that are absent from the snapshot (the pre-restore snapshot holds them);
  4. write the manifest's `order` into the `project.yaml` order field;
  5. publish `snapshot.restored` and `manuscript.updated`.
- Restore is an author action and writes directly, not as pending changes (the same reasoning as editor saves, per the decision "Markdown editor for the shared Shell editor component").
  - Pending changes that target restored files keep their captured base, so the Project store's three-way check flags them as conflicts instead of overwriting the restored text.
  - Restore does not write per-draft versions. Versioning on pending-change apply is the Project store's job.
- Deleting snapshots in the app is out of scope for v1. The author can delete the folder on the host.

### UI (manuscript route)

- One lazy route with five parts:
  - an outline list grouped Front / Body / Back. Each row shows the file name, a status chip, a word count, a graph-ordered badge (graph-ordered rows can't be dragged) and an open-file link;
  - a totals bar and an order-source indicator, with the graph-cycle warning;
  - a preflight panel with findings grouped by check, each linking to its location;
  - export buttons for the four formats, with a confirm dialog when preflight has errors, and an export settings panel (metadata, dedication, bibliography mode, templates with "copy default");
  - a snapshots panel (create with a label, list, and restore behind a confirm dialog that names the pre-restore snapshot).
- Drag and drop uses Angular CDK on tablet and desktop. The phone breakpoint shows the outline, counts and statuses read-only, and allows download.
- The route subscribes to `compile-export` SSE events and refetches the view model on `manuscript.updated`. It also refetches on Project store file events that touch `drafts/` or `project.yaml`, when that slice publishes them.

### Sample content

- At M5 this module adds the `project.yaml` order field to the nonfiction sample. The order differs from alphabetical, so the demo proves that the order field drives compile, and the entries carry mixed statuses (for example `final`, `revised`, `draft`).
- It also adds export settings with an author name and a dedication. The bibliography is generated from the sample's Source entities.
- The sample stays within the size of 2–3 draft files set by the decision "Contents of the nonfiction and fiction sample projects". The M5 "done when" criterion needs three chapters, so if the skeleton ships fewer than three draft files, this module adds the third. No front or back matter file is added.
- The sample ships no `snapshots/`.

## Phases

### `phase:contract` (M5; lands early in wave 2)

Gated by: Platform `phase:scaffold`; Project store `phase:contract`; Graph runner `phase:contract`; Agent loop `phase:contract`.

Scope:
- Publish `@bbartolome/scriba-contracts/compile-export`, containing Zod schemas plus TS types and constants:
  - the `OrderEntry`, `ManuscriptStatus` and `ManuscriptPart` enums;
  - the `ExportSettings` shape;
  - the manuscript view model, with `revision`, warnings and order source;
  - the reorder, status and part requests;
  - the preflight request and result, the check-id enum, severities and the placeholder pattern constants;
  - the export request and result, and the format enum `md | docx | epub | pdf`;
  - the snapshot summary, the create, list and restore requests, and the `snapshot.yaml` manifest schema;
  - the SSE event members (`manuscript.updated`, `export.finished`, `snapshot.created`, `snapshot.restored`);
  - route constants;
  - error codes that follow Platform's convention: order conflict, invalid reorder, graph-ordered move, export busy, Pandoc failed, Pandoc timeout, template invalid, empty manuscript, snapshot not found, snapshot unreadable.
- Land, as an expand-only change coordinated with the Project store, the narrowing of the reserved `order` and `export` settings fields in the `project.yaml` schema to `OrderEntry[]` and `ExportSettings`.

Acceptance criteria:
- [ ] The subpath builds, exports only shapes and constants, and is importable from both `apps/api` and `apps/web`.
- [ ] Zod tests accept valid examples and reject: an unknown status or part, an order entry with a path outside `drafts/`, a reorder that isn't a list of paths, and an unknown export format.
- [ ] The `project.yaml` schema accepts files with and without `order` and `export`. The current nonfiction sample still passes Platform's CI sample check.

### `phase:assembly-preflight` (M5)

Gated by: this module's `phase:contract`; Project store file-API phase (implementation); Setup & auth guard phase.

Scope:
- The NestJS module, registered in the API root.
- Manuscript membership, the effective-order algorithm (alphabetical, `project.yaml`, graph topological sort with alphabetical tie-break, same-file edge drop, cycle fallback, unplaced files appended), and the part partition.
- Word counts.
- The `GET` manuscript endpoint; the reorder, status and part writes with `revision` conflicts and full materialisation; the `manuscript.updated` SSE event.
- The five preflight checks and the `POST` preflight endpoint.
- The assembled-Markdown builder: metadata block, matter placement, front matter stripping and bibliography. It is exposed through `md` export in the next phase, and tested here through preflight and the view model.
- The nonfiction sample's `project.yaml` order field, statuses and export settings.

Acceptance criteria:
- [ ] With no order field and no graph, files come back in alphabetical order. `drafts/.versions/x/…`, other subfolders and non-`.md` files are absent.
- [ ] With an order field, the listed files come first in that order and an unlisted file is appended alphabetically. A stale entry is ignored in the order and reported by `orphan-scenes`.
- [ ] With a story graph, the `order` relations put files in topological order with alphabetical ties. An edge between two scene nodes in one file is ignored. Files outside the graph follow in `project.yaml` order. A cycle falls back to `project.yaml` order and sets `graphCycle`.
- [ ] Reordering with a stale `revision` returns a conflict and leaves `project.yaml` byte-identical. A valid reorder writes every file's entry and keeps the comments and other keys in `project.yaml`.
- [ ] Each of the five checks has a fixture project that triggers it, and every finding has the right check id, severity, path and line. A clean fixture passes all five.
- [ ] Unsupported claims reads a grounding result fixture in the Agent loop's transcript format, and reports `unsupported` as an error, `weak` as a warning and a changed file as `info`.
- [ ] Preflight makes no outbound HTTP call (the test asserts that the mock OpenAI server received no request).
- [ ] The nonfiction sample started from "start from sample" returns its authored, non-alphabetical order with its statuses.

### `phase:export` (M5)

Gated by: `phase:assembly-preflight`; Platform's image phase (Pandoc 3.13 and Typst in the image) and CI phase.

Scope:
- Pandoc invocation (argument array, temp dir, timeout, size cap, single export per project, error mapping).
- `md`, `docx`, `epub` and `pdf` export, with the download endpoint and the `export.finished` event.
- Built-in templates: a standard manuscript reference DOCX, an EPUB stylesheet and a Typst template.
- Per-project template overrides and "copy default into project". The export settings read and write endpoints, with `revision`.
- Additive Platform steps: install Pandoc 3.13 and Typst in `ci.yml` so that export tests run in CI, and an image smoke step that exports the nonfiction sample to all four formats inside the built image.
- **Typst quality spike.** Render the nonfiction sample plus a typographic stress fixture to PDF via Typst. The fixture covers footnotes, block quotes, smart quotes, em and en dashes, accented and non-Latin text, long headings, a TOC, a page break per chapter and an image. Compare the output against a written checklist. Record the outcome as an ADR in `docs/adr/`: keep Typst, or recommend the TeX Live derived image (`FROM bbartolome/scriba`) as follow-up work.

Acceptance criteria:
- [ ] Each format exports the fixture project through the HTTP API, and the download `GET` returns the bytes with no side effects.
- [ ] Unzipped DOCX: chapters appear in effective order, and the styles come from the reference doc (the override template's style is used when one is set). The title page carries the author, the contact block and the rounded word count.
- [ ] Unzipped EPUB: the spine and nav follow effective order with front and back matter placed correctly, and the metadata has the title, author, language and identifier. The bibliography is present for a nonfiction fixture and absent when the mode is `off`.
- [ ] PDF: the output starts with `%PDF-` and is produced via `--pdf-engine=typst`.
- [ ] A missing template override returns the template error without calling Pandoc. A Pandoc failure returns the Pandoc-failed error with the stderr tail. A second concurrent export returns busy.
- [ ] Export always attaches the preflight summary and still succeeds when preflight has errors.
- [ ] CI runs the export tests with real Pandoc and Typst. Locally, the tests skip with a clear message if either binary is missing, and CI sets a flag that turns that skip into a failure.
- [ ] The image smoke step exports all four formats on amd64 and arm64.
- [ ] The Typst spike ADR is merged and states the decision.

### `phase:manuscript-snapshots` (M5; demos the milestone)

Gated by: `phase:export`; Frontend shell `phase:core`.

Scope:
- The snapshot create, list and restore endpoints, the `snapshot.yaml` manifest, the pre-restore snapshot, and the SSE events.
- The lazy manuscript route: the outline with drag reorder (graph-ordered rows locked), status and part controls, totals, the order-source and cycle indicators, the preflight panel with links to file locations, export buttons with the confirm dialog, the export settings panel with the template override and "copy default", the snapshots panel, and the read-only phone layout.
- The extension to Platform's Playwright e2e: after "accept change", open the manuscript view and assert that the sample's files are in their `project.yaml` order and that the accepted file's word count changed. There is no export step in the e2e.

Acceptance criteria:
- [ ] A created snapshot folder matches `snapshots/<label>-<ts>/` and holds the top-level drafts and a valid manifest. The list returns it newest first.
- [ ] Restore brings back the drafts, the order and the statuses, removes files created after the snapshot, and creates a `pre-restore` snapshot. `drafts/.versions/` is byte-identical before and after. A pending change against a restored file shows as a conflict.
- [ ] UI tests (against a fake API and SSE client): a drag sends a reorder with the current `revision`; graph-ordered rows can't be dragged; a conflict response shows the reload prompt; `manuscript.updated` refetches; preflight errors open the confirm dialog before export; restore needs confirmation.
- [ ] The e2e passes with the manuscript step.
- [ ] **Done when** (brief, M5): a three-chapter sample exports and opens cleanly in Word and an EPUB reader.

**Demo script (under 5 minutes):**
1. Start a new project from the nonfiction sample and open **Manuscript**. Three chapters appear in the sample's `project.yaml` order (not alphabetical), with statuses and word counts.
2. Drag chapter 3 above chapter 2. Open `project.yaml` on the host and see the order field updated. Set chapter 2 to `final`.
3. Type `TK` into chapter 1 in the editor, return and run **Preflight**. See the placeholder error with a link to the line. Note the unsupported-claims finding from the sample's grounding-claims draft.
4. Click **Snapshot**, label it `before-cut`.
5. Export **DOCX**, confirm past the preflight dialog, and open the file in Word: standard manuscript layout, title page, dedication, chapters in the new order, bibliography.
6. Export **EPUB** and open it in an EPUB reader (Apple Books or Calibre): the TOC lists the chapters in order.
7. Export **PDF** and open it.
8. Delete chapter 3's file and restore `before-cut`. The chapter is back in place, and a `pre-restore` snapshot is listed.

## Contracts

### Produces: `@bbartolome/scriba-contracts/compile-export`

- `ManuscriptStatus` = `outline | draft | revised | final`, and `ManuscriptPart` = `front | body | back`.
- `OrderEntry` `{ path: FileReference; status?: ManuscriptStatus; part?: ManuscriptPart }`, the content of the `project.yaml` `order` field.
- `ExportSettings`: author, penName?, contact?, subtitle?, lang, rights?, dedication?, bibliography `off | all | cited`, docxReferenceDoc?, epubCss?, typstTemplate?. This is the content of the `project.yaml` export settings.
- Manuscript view model: entries `{path, part, status, words, graphOrdered, inOrderField}`, totals `{body, manuscript}`, `orderSource`, warnings, `revision`.
- The reorder, status and part requests, each with a `revision`.
- The preflight request and result, `PreflightCheckId`, findings, and the placeholder pattern constants.
- `ExportFormat` = `md | docx | epub | pdf`, the export request and the export result.
- The snapshot summary, the create, list and restore requests, and the `snapshot.yaml` manifest schema (`schemaVersion`).
- SSE members under `module: 'compile-export'`: `manuscript.updated`, `export.finished`, `snapshot.created` and `snapshot.restored`.
- Route constants and error codes.

Consumers: the Frontend shell route table (lazy route entry only); Platform (the e2e step and the CI and image smoke steps that this module adds); possibly the Agent loop, if it later exposes compile tools.

### Consumes

| Producer | Slice / phase | What |
|---|---|---|
| Platform | `/platform`, `phase:scaffold` | SSE envelope, error-code convention, API composition root, contracts package |
| Platform | image + CI phases | Pandoc 3.13 and Typst in the image; `ci.yml` and the smoke job (this module adds steps); the Playwright harness |
| Setup & auth | `/setup-auth` guard phase | The single guard on every endpoint; the GET-never-mutates invariant |
| Project store | `/project-store`, `phase:contract` + file-API phase | The `project.yaml` schema (reserved `order` and export settings, style profile ref, genre pack, title); the file API (list, read, write); file reference; entity reference; entity front-matter base (`id`, `type`, `links`); path safety |
| Graph runner | `/graph-runner`, `phase:contract` | Graph file schema (`view: 'story'`); story-node fields `kind`, `label`, optional `path`; edge `{id, from, to, relation?}`; the suggested relation `order` |
| Agent loop | `/agent-loop`, `phase:contract` | Grounding result (claim → `supported \| weak \| unsupported` plus the cited passage); transcript entry format in `logs/`; draft provenance (entity IDs and the tool run) |
| Genre packs | nonfiction pack content (M2) | The Source entity's `citation` (and URL) fields; the Style profile entity's banned-phrases field |
| Frontend shell | `phase:core` | API and SSE clients, theming, nav, breakpoint gate, route table |

## Testing Decisions

- **What a good test is.** It exercises external behaviour only: HTTP responses, SSE events and the files on disk. It never tests internal services, the topological-sort helper on its own, or Pandoc's argument list. The order algorithm is tested through `GET` manuscript against fixture projects.
- **Primary seam: the running API.**
  - Boot the module, imported into a test app with Platform's root and Setup & auth's guard, against a temp library folder per test.
  - Fixture projects are built in the test: drafts, `project.yaml` variants, story graphs (including a branch, a same-file edge and a cycle), a grounding-result transcript, entities with broken references and a style profile with banned phrases. Unit tests never read `examples/`.
  - Assert on the view model, preflight findings, `project.yaml` bytes after writes, snapshot folders, and unzipped DOCX and EPUB structure.
  - The mock OpenAI server runs alongside only to prove that preflight and export make no model calls.
- **Pandoc-dependent tests** use real Pandoc 3.13 and Typst. CI installs them (an additive step in Platform's `ci.yml`). Locally, these tests skip with a message when a binary is missing, and CI turns that skip into a failure.
  - DOCX and EPUB outputs are checked structurally (document XML, styles, spine, nav, metadata), never by byte golden files.
  - PDF output is checked by its header and engine. Markdown output is compared against a golden file.
- **UI seam.** The manuscript route is rendered with Angular's Vitest runner against a fake API and SSE client built from the `/compile-export` contract types. Tests cover drag-to-reorder requests, locked graph-ordered rows, the conflict prompt, SSE refetch, the preflight confirm dialog, status and part changes, and snapshot restore confirmation.
- **Contract seam.** Zod tests for every shape. Platform's CI check validates the nonfiction sample's `project.yaml` (with the order field and export settings) against the schema.
- **System seam.** The single Playwright e2e is extended with the manuscript step (order and word count after an accepted change). Export stays out of the e2e.
- **Image smoke.** An additive smoke step exports the nonfiction sample to all four formats inside the built image on both architectures.
- **Manual.** The M5 "done when" criterion (Word plus an EPUB reader) and the Typst spike review are manual, recorded in the demo script and the ADR.
- **Prior art.** None in the repo yet.

## Out of Scope

- Reordering scenes inside a file, and per-scene breaks. A file is one unit in v1. This replaces the brief's "drag to reorder chapters and scenes" for scenes that share a file.
- Reading or restoring per-draft versions in `drafts/.versions/`, which is the Project store's job.
- Running graphs of any kind, and writing to the story graph from the manuscript view.
- Starting a grounding check from preflight. Preflight only reads results.
- A per-project placeholder list, CSL and citeproc citation styles, an index, and cross-references.
- A TeX Live PDF image (not in v1). The Typst spike may recommend it as follow-up work only.
- Deleting or renaming snapshots in the app, and snapshot diffing.
- Export in the Playwright e2e. EPUB validation with epubcheck (no Java in the image).
- Publishing-platform uploads (brief).
- Agent-initiated reorder. If the Agent loop ever exposes compile tools, any write to `project.yaml` must become a pending change.
- **Overridden from the brief:** "assembled from chapter files in outline order" is replaced by the order rules of the decision "Manuscript assembly order without a story graph" over every top-level `drafts/` file. The `structure/` folder and its Chapter and Scene entities don't exist, so status lives on `project.yaml` order entries. Drag-to-reorder writes the `project.yaml` order field. React, Fastify and Zod-for-tool-inputs don't apply here.

## Further Notes

- **Decisions this spec makes that the reviewer should confirm.**
  - The graph-ordered files form a leading block ahead of the other body files (the reading of "come first" in the decision "Manuscript assembly order without a story graph").
  - All story graphs in `graphs/` are unioned.
  - Status and part live on order entries.
  - Every order write materialises the full order.
  - Front and back matter are marked with `part` on order entries, the dedication and title page come from export settings, and the bibliography is generated, so no new folder is needed.
  - Manuscript membership is limited to `.md` files.
  - Exports are kept under `<project>/.scriba/exports/`.
  - Restore deletes newer files, with a pre-restore snapshot as the safety net.
  - Preflight is model-free and reads recorded grounding results.
- **Cross-spec coordination.**
  - *Project store:* the reserved `order` and export settings fields must be loose enough at its contract phase for this module to narrow them later, as an expand-only change. Its FTS index should exclude `snapshots/` so that snapshot copies don't duplicate search hits. It should expose a comment-preserving YAML key update, or let this module write `project.yaml` through the file API with a full-text write.
  - *Agent loop:* the grounding result, or its transcript entry, must carry the checked file's project-relative path and a content hash. Without them, preflight can't attribute results to files or detect stale ones.
  - *Genre packs:* the field names for the Source entity's citation and URL, and for the Style profile's banned phrases, are consumed as stated in their entity-type schemas.
  - *Platform:* this module adds Pandoc and Typst to `ci.yml`, an export smoke step to the image smoke job, and a manuscript step to the e2e.
- **Agent compile tools.** The brief lists assemble, check and export as agent tools. This spec exposes them only as HTTP endpoints. Whether the Agent loop wraps the read-only ones (manuscript, preflight) as tools is the Agent loop spec's decision.
- **Known cost.** Renaming a draft file drops its order entry and status, the same as the rename cost in the decision "Current draft versus older versions in drafts/". A stable id could fix both later.
