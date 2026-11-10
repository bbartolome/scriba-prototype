---
id: PLT-20
title: examples/ check — M1 layer (project.yaml, entity base, excluded folders, samples.yaml)
module: platform
phase: phase:examples-check
milestone: M1
blocked_by: [PLT-13, "Project store phase:contract"]
parallel_with: ["release track", "wave-1 modules"]
unblocks: [PLT-21, PLT-22]
---

# PLT-20 — Examples check, M1 layer

## Why
CI validates the sample projects in `examples/` against the current contracts so a contract change can't silently break the demos (story 41). The check is built in layers, each added as soon as its gate closes, so no layer waits on a later milestone.

## Decisions
- Wired into `npm run lint` (so it runs in `ci.yml`'s lint step).
- **Samples layout:** `examples/samples.yaml` lists samples as `{id, title, description}` (the "start from sample" cards). Each sample is a project folder `examples/<id>/` (`examples/nonfiction/` at M1, `examples/fiction/` at M6). The index file sits outside every sample folder, so it's never copied into a project. Project store owns the sample content and the nonfiction skeleton.
- **This layer checks:**
  - every `project.yaml` under `examples/` parses with Project store's Zod schema (`@bbartolome/scriba-contracts/project-store`);
  - every entity file's front matter parses with the generic entity front-matter base;
  - no sample ships `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/`;
  - `samples.yaml` entries match sample folders one-to-one;
  - the "unit tests never read `examples/`" rule (lint/grep over test files).
- Failures name the file path and the schema issue.
- Must pass on an `examples/` folder that holds only the nonfiction skeleton (or nothing yet).

## Acceptance criteria
- [ ] Every `project.yaml` under `examples/` parses with the Project store schema; every entity's front matter parses with the entity base.
- [ ] A sample containing `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/` fails the check.
- [ ] A `samples.yaml` entry with no folder (or a folder with no entry) fails the check.
- [ ] A unit test that reads `examples/` fails lint.
- [ ] A deliberately broken sample file (fixture) fails with the file path and the schema issue.
- [ ] The check passes on the nonfiction skeleton.
