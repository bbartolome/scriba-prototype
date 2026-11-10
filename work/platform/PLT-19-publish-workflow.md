---
id: PLT-19
title: publish.yml — plan → native multi-arch build → smoke → merge → release
module: platform
phase: phase:ci-publish
milestone: M1 (release track)
blocked_by: [PLT-18]
parallel_with: ["wave-1 modules"]
unblocks: ["Compile & export image smoke step (additive)"]
---

# PLT-19 — Publishing

Merging this **closes `phase:ci-publish`**. Compile & export later adds an app-level export smoke step here, additively.

## Why
Releases cut automatically from Conventional Commits (story 44); a semver image published only after both arches build and pass smoke (story 45); `latest`, `sha-<short>` and semver tags (story 46); smoke jobs prove the image's promises on every publish (story 47); the app tells its version (story 20).

## Decisions
- `.github/workflows/publish.yml`, following Tride's structure, extended. Triggers on pushes to `main` (with `paths-ignore` for docs-only changes) and `workflow_dispatch`.
- Jobs, in order:
  1. **`plan`** — semantic-release dry-run works out whether this push releases, and which version.
  2. **`build`** — matrix of native `ubuntu-24.04` (amd64) and `ubuntu-24.04-arm` (arm64); each pushes by digest with the version baked in as a build arg and per-arch GHA cache.
  3. **`smoke`** — per arch, against the digest.
  4. **`merge`** — creates the manifest list; tags `latest`, `sha-<short>`, and semver when `plan` says so.
  5. **`release`** — real semantic-release: git tag, GitHub release, changelog.
- Docker Hub credentials from repository secrets.
- **`GITHUB_TOKEN` gotcha:** a tag pushed with `GITHUB_TOKEN` doesn't trigger other workflows; running the semver publish inside the same workflow as the release avoids it, with no GitHub App and no PAT. The image is tagged before the git tag exists, so a tag never points at an image that failed to build or smoke. semantic-release doesn't commit back to `main`; the version lives in the tag and the image, not `package.json`.
- **Smoke checks:**
  - dispenser output passes `bash -n`, with nothing but the script on stdout;
  - the merged manifest lists `linux/amd64` and `linux/arm64`;
  - `pandoc --version` reports 3.13, `typst --version` runs;
  - a tiny Markdown file converts to DOCX, EPUB and PDF (via Typst) inside the image (stands in for export in the e2e);
  - `docker run` with no sidecar returns 200 from `/healthz`;
  - an FTS5 `MATCH` query through `node:sqlite` returns a row;
  - image size measured and reported.
- A pre-release checklist links the ST runbook (PLT-16).
- semantic-release config file at the root.

## Acceptance criteria
- [ ] A push to `main` with no releasable commit publishes `latest` and `sha-<short>` for both arches and creates no git tag.
- [ ] A push with a `feat:` or `fix:` commit publishes the semver tag too, then creates the git tag and GitHub release; the image reports that semver from `/healthz`.
- [ ] A failure in any build or smoke job leaves no new tag on Docker Hub and no git tag.
- [ ] All smoke checks pass on both arches.
- [ ] No step relies on a tag push triggering another workflow; no PAT or App token required.
