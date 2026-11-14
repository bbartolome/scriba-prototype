# Releasing Scriba

Pushes to `main` run `.github/workflows/publish.yml`. It builds the image for both architectures, smoke-tests each one, publishes the image to Docker Hub and, when a release is due, tags the commit and creates the GitHub release. Only the release job writes to git.

## The five jobs

- **plan** runs semantic-release as a dry run. It works out whether this push releases, and which version, and writes both to the job outputs.
- **build** builds the image once per architecture (`linux/amd64` on `ubuntu-24.04`, `linux/arm64` on `ubuntu-24.04-arm`) and pushes it by digest only, with the version, the short revision and the build time baked in.
- **smoke** runs `scripts/smoke-image.sh` against each digest on its own architecture. A failure in any check stops the run before any tag exists.
- **merge** checks that the two digests form a manifest list for `linux/amd64` and `linux/arm64`, then creates the tags `latest`, `sha-<short>` and, when a release is due, the semver tag. It is the only job that pushes tags.
- **release** runs the real semantic-release, which creates the git tag and the GitHub release with its notes. It refuses a version that differs from the one the image was built with.

## Repository secrets and the Docker Hub repository

The repository needs two secrets: `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (a token that can push). The Docker Hub repository `bbartolome/scriba` must exist and be public, because the installer pulls it anonymously. Creating the repository and the secrets is a manual step outside this repository. The workflow uses no other secret besides the built-in `GITHUB_TOKEN`.

## Versions and Conventional Commits

The first release is `1.0.0`. The version comes from the commit messages since the last git tag. A `feat` commit makes a minor release. A `fix`, `perf` or `revert` commit makes a patch release. Other types, such as `docs`, `chore` and `test`, make no release.

A breaking change needs a footer line that starts with `BREAKING CHANGE:` in the squash-merge body. A `!` after the type, as in `feat!:`, does not release, because the default commit rules do not read it. The PR title check still accepts the `!` form.

## Checklist before merging a release

- The PR title is a Conventional Commit.
- CI is green on the pull request.
- If the change touches `Dockerfile`, `deploy/`, `scripts/entrypoint.sh` or the installer, run the [pre-release checklist](../deploy/RUNBOOK.md#pre-release-checklist) in the runbook.

## How to read a run

Each smoke job writes a table to its job summary, with one row per check: `dispenser`, `pandoc`, `typst`, `convert`, `healthz`, `fts5`, `size` and `arch`. The `size` row reports the unpacked size and, when the image is in the registry, the compressed size. A row marked FAIL names the reason.

## Known limit: a cancelled pending run

The publish runs for `main` are serialised, so that a later run sees the git tag that an earlier run created. GitHub keeps one pending run per group. If one run is in progress, a second push waits, and a third push cancels the second push's pending run. The commit of the cancelled push then gets no `sha-<short>` tag, and that tag is never published later. Its changes ship in the third run's `latest`, and its commits count in the third run's plan, so no release is lost and the version is right.

## Recovery from a failed run

- A run that fails before `merge` publishes no tag, and no git tag is created.
- If `release` fails after `merge`, the semver image tag exists without a git tag. Re-run the failed job. The next release overwrites the same semver image tag.
- If `main` moved during the run, semantic-release in `release` refuses to tag, and the job fails on purpose. Use Run workflow on `main`. It plans again and pushes the new image under the same semver tag, since no git tag was made.
