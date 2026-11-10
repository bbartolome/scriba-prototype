---
id: PST-05
title: Start from sample and the sample list
module: project-store
phase: phase:files
milestone: M1
blocked_by: [PST-03]
parallel_with: [PST-04, PST-06, PST-08, PST-11]
unblocks: [PST-09, PST-12, "Genre packs fiction sample (GNP-18)"]
---

# PST-05 — Start from sample

## Why
Try every feature on realistic material (story 9), copied only on request (10), with a chosen folder name and title (11). Setup & auth's first-project step uses the same API.

## Decisions
- Samples are baked into the image read-only at `SCRIBA_EXAMPLES_DIR` (default `/opt/scriba/examples`; dev points at repo `examples/`).
- `GET` sample list reads `examples/samples.yaml` (`[{id, title, description}]`) for the picker's sample cards.
- **Start from sample** (POST) `{sampleId, folderName, title}` copies `examples/<sampleId>/` into a new library folder, rewriting **only** the `title` key of the copied `project.yaml` (comment-preserving YAML document edit). Fails `PROJECT_EXISTS` if the folder exists, `PROJECT_NOT_FOUND` for an unknown sample.
- The copy excludes `.scriba/`, `logs/`, `snapshots/` and `drafts/.versions/` (samples ship none anyway). `samples.yaml` sits outside every sample folder and is never copied.
- **Never auto-copied:** nothing happens at startup.
- Tests use a tiny test sample in a temp `SCRIBA_EXAMPLES_DIR`, never the real `examples/`.

## Acceptance criteria
- [ ] Start from sample copies a test sample under a chosen name; only `title` differs in `project.yaml` (comments intact); excluded folders planted in the test sample are not copied.
- [ ] Nothing is copied at startup (library unchanged after boot).
- [ ] The sample list GET returns the `samples.yaml` entries and is side-effect free.
