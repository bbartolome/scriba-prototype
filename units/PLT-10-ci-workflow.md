---
id: PLT-10
title: ci.yml — one job (npm ci → lint → test → build) plus PR-title check
module: platform
phase: phase:scaffold
milestone: M1
blocked_by: [PLT-01]
parallel_with: [PLT-02, PLT-03, PLT-04, PLT-09, PLT-12]
unblocks: [PLT-11, "Compile & export export runner and Markdown (CEX-10)"]
---

# PLT-10 — `ci.yml`

## Why
CI runs lint, test, build and e2e on every PR and push to `main`, so `main` stays green (story 43); releases are cut from Conventional Commits (story 44).

## Decisions
- `.github/workflows/ci.yml`: **one job** on PRs and pushes to `main`, **no paths filter**: `npm ci` → lint (later including the `examples/` check, PLT-20) → test → build. The e2e step is appended by PLT-13.
- On PRs it also checks the **PR title is a Conventional Commit** (squash merges make it the commit on `main`, which semantic-release needs).
- Node version from `.nvmrc`; npm cache.
- Other modules extend this job additively (e.g. Compile & export installs Pandoc 3.13 and Typst, and CI turns a Pandoc-missing test skip into a failure).

## Acceptance criteria
- [ ] The workflow runs on `pull_request` and `push` to `main` with no `paths` filter.
- [ ] Steps run in order npm ci → lint → test → build in a single job.
- [ ] A PR titled `update stuff` fails the title check; `feat(platform): scaffold` passes.
- [ ] `ci.yml` is green on the scaffold PR (verified at PLT-11).
