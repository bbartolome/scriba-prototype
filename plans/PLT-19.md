---
id: PLT-19
status: draft
---
# PLT-19 plan — publish.yml: plan, native multi-arch build, smoke, merge, release

Batch: [PLT-19] (Platform, phase:ci-publish, M1 release track). Revision 5. Revision 5 applies the Navigator's ruling on item 10 of the review of revision 3 (the cancelled pending run, D10, option (a), `plans/DECISIONS.md` "2026-11-14 — PLT-19 — the Navigator's decision on the cancelled pending run (D10, item 10 of the revision-3 review): option (a), a recorded limit", commit `6aed752`); revision 4 applied items 1 to 9 of the Opus review of revision 3 (`plans/DECISIONS.md`, "2026-11-14 — PLT-19 — Opus review of the plan (revision 3): NOT APPROVED"). Revision 1 was NOT APPROVED by Opus (`plans/DECISIONS.md`, "2026-11-14 — PLT-19 — Opus review of the plan (revision 1)"); revision 2 applied items 4 to 9 of that entry. Revision 3 applied the Navigator's rulings on items 1 to 3 (O1 the criteria that cannot run here, O2 the first version, O3 breaking changes), recorded in `plans/DECISIONS.md` under "2026-11-14 — PLT-19 — the Navigator's decisions on O1 (the criteria that cannot run here), O2 (the first version) and O3 (breaking changes)", commit `611843e`. The planner's earlier default for O1 is removed. The base was `22040f6` for revision 1, `c061b08` for revision 2, and is `611843e` now: `git diff --name-only 22040f6 611843e` lists, outside `plans/`, only `modules/compile-export.md` (a wording change in its manual-checks line 62, "three-chapter" to "four-chapter"), `units/CEX-08-nonfiction-sample-order.md` and `units/CEX-20-milestone-gate.md`. This plan cites none of the changed lines (it cites `modules/compile-export.md` line 25, which is unchanged, and `units/CEX-15-export-gate-image-smoke.md`, which is unchanged), so every non-plan file cited below reads the same as at `22040f6`. The planner could not run Docker, npm, GitHub or any test (the instruction forbade it), so every statement about those tools is either read from a file (section 7a) or labelled ASSUMED (section 7b). Merging this unit closes `phase:ci-publish` (`units/README.md` line 78; unit line 14).

Reading guide: sections 1 to 7 follow `plans/PLT-02.md`. Section 8 lists the files this plan shares with other units. The code stage is for a Haiku subagent, so section 3 gives the exact commands, the YAML and the checks.

## 1. Decisions this plan follows

### 1a. Settled decisions (obeyed, not reopened)

- **S1. One workflow file with two triggers.** `.github/workflows/publish.yml`, "following Tride's structure, extended"; push to `main` with `paths-ignore` for docs-only changes, plus `workflow_dispatch`. Source: unit line 20; `modules/platform.md` line 59 (Tride is structure only). Tride's `tags: ['v*']` trigger (Tride `publish.yml` line 9) is NOT carried over, because of S8.
- **S2. Five jobs in order: `plan`, `build`, `smoke`, `merge`, `release`.** Contents as in unit lines 22 to 26: plan = semantic-release dry-run (release or not, which version); build = native matrix `ubuntu-24.04` (amd64) and `ubuntu-24.04-arm` (arm64), push by digest, version as build arg, per-arch GHA cache; smoke = per arch, against the digest; merge = manifest list with tags `latest`, `sha-<short>`, and semver only when `plan` says so; release = real semantic-release (git tag, GitHub release, changelog). Source: unit lines 21 to 26.
- **S3. `latest` and `sha-<short>` on every publishing push whose run is not cancelled while pending (D10); only the semver tag depends on `plan`.** Source: unit line 25 (this is the reading recorded in `plans/DECISIONS.md` line 2383) and criterion 1 (unit line 41).
- **S4. Docker Hub credentials come from repository secrets.** Source: unit line 27.
- **S5. No tag push is relied on; no PAT; no GitHub App.** The semver image publish runs inside the same workflow as the release; the image is tagged before the git tag exists; semantic-release does not commit back to `main`; the version lives in the tag and the image, not in `package.json`. Source: unit line 28; `modules/platform.md` line 39.
- **S6. The smoke list.** Dispenser output passes `bash -n` with only the script on stdout; the merged manifest lists `linux/amd64` and `linux/arm64`; `pandoc --version` reports 3.13 and `typst --version` runs; a tiny Markdown file converts to DOCX, EPUB and PDF (via Typst) inside the image; `docker run` with no sidecar returns 200 from `/healthz`; an FTS5 `MATCH` through `node:sqlite` returns a row; image size is measured and reported. Source: unit lines 30 to 36.
- **S7. A pre-release checklist links the ST runbook (PLT-16)** and **a semantic-release config file sits at the repo root.** Source: unit lines 37 and 38; `plans/PLT-16.md` line 231 (PLT-16 provides `deploy/RUNBOOK.md` for this link).
- **S8. The five acceptance criteria are kept word for word.** Source: unit lines 41 to 45; `plans/DECISIONS.md` lines 604 (PLT-11, the Navigator), 2605 (PLT-17 O3) and 2775 (PLT-18 P10) (a criterion is never weakened; one that cannot run here is ticked only on a stand-in the Navigator accepted, or left unticked by the Navigator's ruling); prompt.md section "Criteria that you cannot test".
- **S9. Pandoc runs from a writable folder.** Pandoc 3.13 writes `./media-<hash>` into the current folder when it makes a PDF through Typst, and the image's WORKDIR `/opt/scriba/app` is root-owned, so the PDF smoke runs with `-w /tmp`. Source: `plans/DECISIONS.md` line 757; `plans/PLT-14.md` line 229.
- **S10. The no-sidecar `/healthz` run needs a writable `/books` mount.** Without one the container exits 1 on the app-state check. Source: `plans/PLT-14.md` line 228 ("PLT-19 must add the mount"); `/healthz` is unguarded forever so smoke can call it before setup (`units/PLT-04-api-composition-root.md` line 24).
- **S11. A non-release build bakes `VERSION=0.0.0-dev`, which is not a pullable tag; the dispenser then pins `sha-<revision>`.** Source: `plans/DECISIONS.md` line 774; `plans/PLT-14.md` line 225; `plans/PLT-17.md` line 44 (D3) and line 187 (O1, which asks this unit to confirm the tag side).
- **S12. REVISION is the same short SHA as the `sha-<short>` tag.** Source: `plans/PLT-17.md` line 244 (A10).
- **S13. This unit passes validated build-arg values** (PLT-14's Dockerfile writes `build-info.ts` with `printf` and does not validate). Source: `plans/PLT-14.md` line 278 (open point 7).
- **S14. The Dockerfile is not changed.** `ARG VERSION/REVISION/BUILT_AT` already sit just before the `build-info.ts` write (`Dockerfile` lines 32 to 35), as `plans/DECISIONS.md` line 762 asked. PLT-14 is done. Source: `modules/platform.md` line 30 (the release track, PLT-14 to PLT-19, touches only Platform-owned files: `Dockerfile`, `deploy/` and `.github/workflows/publish.yml`; that line does not say which units are closed). PLT-14 and PLT-15 are closed because `plans/PLT-14.md` and `plans/PLT-15.md` have `status: done`.
- **S15. No auto-update, no Watchtower, no "update available" notice.** Source: `modules/platform.md` line 51.
- **S16. Tests exercise external behaviour only.** Here that means the workflow file as parsed YAML, the emitted outputs of the scripts, and the calls the scripts make to a stub `docker`. Source: `modules/platform.md` lines 57 and 58; precedent for repo-root checks with `node:test`: `scripts/ci-workflow.test.mjs` (PLT-10) and `package.json` line 25 (`node --test 'scripts/*.test.mjs'`).
- **S17. Blocker notation.** `blocked_by: [PLT-18]` stays; `unblocks` is the exact inverse. Only CEX-15 is blocked by PLT-19: `units/CEX-15-export-gate-image-smoke.md` line 7 is the only `blocked_by` that names it (`grep -rn PLT-19 units/`); `units/PLT-13-playwright-harness-e2e.md` line 24 mentions it in prose and `units/PLT-18-update-rerun-rollback.md` line 9 lists it in PLT-18's own `unblocks`. That matches `unblocks: ["Compile & export export gate (CEX-15)"]`. Source: `units/README.md` line 64.

### 1b. Smaller decisions this plan makes (the simplest option, each with its reason)

- **D1. The logic lives in four scripts, and the YAML only calls them.** `scripts/publish-plan.sh`, `scripts/publish-merge.sh`, `scripts/smoke-image.sh` and the semantic-release plugin `scripts/release-guard.mjs`. Reason: a script can be run in `npm test` against a stub `docker` and by hand against real images; inline YAML shell cannot. Same pattern as `scripts/build-image.sh` and `scripts/entrypoint.sh`. Scripts are bash 3.2 compatible (no `mapfile`, no associative arrays, no empty-array expansion under `set -u`), because the tests run on a Mac too.
- **D2. semantic-release runs as `npx --yes "semantic-release@<pin>"`, not as a repo dependency.** The pin is one exact version in the workflow `env` (`SEMANTIC_RELEASE_VERSION`). Reason: `package.json` and `package-lock.json` are shared by every unit and stay untouched; the `plan` and `release` jobs need no `npm ci` of the workspaces; the three plugins used are bundled with semantic-release. Cost: the version is not in the lockfile (open point O4).
- **D3. `.releaserc.json` holds only `branches: ["main"]`, `tagFormat: "v${version}"`, and four plugins.** They are `@semantic-release/commit-analyzer` and `@semantic-release/release-notes-generator` (default presets), `./scripts/release-guard.mjs` (D4), and `@semantic-release/github` with `successComment`, `failComment`, `failTitle` and `releasedLabels` all `false`. No `@semantic-release/npm`, `git`, `changelog` or `exec`. Reasons: S5 (no commit back; no `package.json` version); `false` options mean the token needs only `contents: write`, with no `issues` or `pull-requests` permission. "Changelog" in unit line 26 is read as the GitHub release notes that the release-notes generator writes; no `CHANGELOG.md` is committed, because that needs a commit back (open point O6).
- **D4. `scripts/release-guard.mjs` is a local plugin with one lifecycle function, `verifyRelease(pluginConfig, context)`.** It writes `context.nextRelease.version` plus a newline to the file named by `SCRIBA_PLAN_OUT` (if set), and throws when `SCRIBA_EXPECT_VERSION` is set and differs from `context.nextRelease.version`. The dry run in `plan` uses the first role (a machine-readable version, instead of parsing log text). The real run in `release` uses the second (the version it tags must be the version already in the image; it throws before any tag exists). `verifyRelease` does not run when no release is due, so a missing output file means "no release".
- **D5. Non-release builds bake `VERSION=0.0.0-dev` and the pin is `sha-<short>`; release builds bake the semver and the pin is the semver.** This answers `plans/PLT-17.md` O1 (a), (b) and (c): (a) `sha-<short>` is tagged on every publishing push whose run is not cancelled while pending (D10), and the pin of any published image always exists; (b) REVISION and the tag use one value; (c) the VERSION is exactly `0.0.0-dev`, which the dispenser (`scripts/entrypoint.sh` lines 9 to 16) turns into `sha-<revision>`. A different dev version string (for example with `+sha`) would break the dispenser's semver regex. The smoke dispenser check asserts the printed `REF=` line equals `bbartolome/scriba:<pin>`, so a wrong pin fails before any tag is pushed.
- **D6. `short` is the first 7 characters of `GITHUB_SHA`, computed once in `plan`.** It is the REVISION build arg and the tag suffix. `BUILT_AT` is also computed once in `plan` (UTC, `YYYY-MM-DDTHH:MM:SSZ`), so both arch builds carry the same values. `publish-plan.sh` checks all three against the same regular expressions as `scripts/build-image.sh` lines 9 to 11 (S13).
- **D7. No `docker/metadata-action`, and no OCI labels.** Tags are computed in shell (`publish-merge.sh`). Reason: `plans/PLT-14.md` line 256 says the version has one source (`build-info.js`), and metadata-action would add a second tag-computing path.
- **D8. `provenance: false` on the build step.** The pushed digest is then a plain image manifest, not an index with attestation entries, so the merge check sees exactly two platforms and the size check can read the layers from the digest.
- **D9. `merge` and `release` run only when `github.ref == 'refs/heads/main'`.** A `workflow_dispatch` from another branch still builds and smokes both arches natively (and so gives the native amd64 proof of `plans/PLT-14.md` line 217), but pushes only untagged digests; it can never move `latest`.
- **D10. `concurrency: {group: publish-${{ github.ref }}, cancel-in-progress: false}`.** Runs for one ref are serialised. Reason: a later run must see the git tag the earlier run created, or the two runs would plan the same version. **Known limit:** GitHub keeps at most one pending run per concurrency group, so when a third push arrives while one run is in progress and one is pending, the pending run is cancelled and never starts. The commit of the cancelled run gets no `sha-<short>` tag; the newest pending run still publishes `latest`, and its `plan` counts every commit since the last git tag, so no release is lost and the version is still right. This is a shortfall against criterion 1 for the cancelled push, recorded in section 4.1 and in `docs/RELEASING.md`. **Accepted by the Navigator** (`plans/DECISIONS.md`, "2026-11-14 — PLT-19 — the Navigator's decision on the cancelled pending run (D10 …)", commit `6aed752`, option (a)): the cancelled-pending case is a recorded limit, and criterion 1 is ticked on the stand-ins (the tick rule of 4.1 stands) with the limit recorded here, in the known-limit paragraph of 4.1 and in `docs/RELEASING.md`. The unit's criterion text is unchanged. It does not break the dispenser pin: an image always has the tag its own `REVISION` names, because the pin is read from the image that was published.
- **D11. The manifest check (smoke list, unit line 31) runs inside `merge`, before any tag is pushed.** `docker buildx imagetools create --dry-run <the two digests>` prints the merged index without pushing; `publish-merge.sh` requires exactly `linux/amd64` and `linux/arm64` in it (entries with `os` `unknown` are ignored), and only then runs the real `create` with all tags in one command. A check after the push would leave tags behind on failure, which criterion 3 forbids. The final `imagetools inspect` is informational. See O5 for the open dependency on the buildx flag.
- **D12. The `smoke` job exposes `SMOKE_IMAGE` (the digest reference) to later steps and the `merge` job depends on it.** Reason: the unit says Compile & export adds an app-level export step here, additively (unit line 14; `units/CEX-15-export-gate-image-smoke.md` line 17), and GNP-05 may add its pack check the same way. The tests assert the required steps and their order, not an exact step list.
- **D13. Smoke script interface.** `scripts/smoke-image.sh <image-ref>`; required env `EXPECTED_VERSION` and `EXPECTED_PIN`; optional `EXPECTED_ARCH` (Node's `process.arch`: `x64` or `arm64`), `SMOKE_POLLS` (default 60), `SMOKE_POLL_SLEEP` (default 1), `GITHUB_STEP_SUMMARY`. It runs every check even after a failure, prints one `PASS <name>` or `FAIL <name>: <reason>` line each, and exits 1 if any check failed. Check names: `dispenser`, `pandoc`, `typst`, `convert`, `healthz`, `fts5`, `size`, and `arch` (only when `EXPECTED_ARCH` is set). The `arch` check is not in the unit's list; it proves each digest really is the platform of the runner that built it, which the native claim of criterion 4 and PLT-14 criterion 5 rests on.
- **D14. Size is reported, not gated** (`plans/PLT-14.md` open point 2 leaves the story-26 target open). Unpacked: `docker run --rm --user 0 --entrypoint sh <ref> -c 'du -sxk / | tail -n 1'` (KiB, the PLT-14 measure). Compressed: the sum of `layers[].size` from `docker buildx imagetools inspect --raw <ref>`; it prints `n/a` when the reference is not in a registry (a local image). The check fails only when the unpacked size cannot be measured.
- **D15. Permissions.** Workflow level `contents: read`; `plan` and `release` have `contents: write` (semantic-release checks push access even on a dry run, ASSUMED A1; the release pushes the tag and creates the release); nothing else is granted anywhere.
- **D16. Secret names are `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`**, the names Tride uses (Tride `publish.yml` lines 70 and 71). The only other secret is the built-in `GITHUB_TOKEN`.
- **D17. Action versions.** `actions/*` at `@v7`: checkout, setup-node and upload-artifact are the pins `ci.yml` already uses (lines 13, 14, 38); `download-artifact@v7` is new to this repository and is checked in step 1(c) (A5). Docker actions at Tride's majors (`setup-buildx-action@v3`, `login-action@v3`, `build-push-action@v6`; Tride lines 61, 68, 75) unless the implementer can read newer majors (step 1). All `uses:` are pinned to a major tag, not `@main`.
- **D18. `paths-ignore` is an explicit folder list, not `**/*.md`:** `README.md`, `LICENSE`, `.gitignore`, `docs/**`, `modules/**`, `plans/**`, `units/**`. Reason: `deploy/RUNBOOK.md` and the `examples/` and `packages/packs` Markdown ship in the image, so a `**/*.md` pattern would skip a release that changes the image. The patterns are anchored at the repo root, so `modules/**` does not match `apps/api/src/modules/…`.
- **D19. The checklist is `docs/RELEASING.md`** (new). It links `../deploy/RUNBOOK.md#pre-release-checklist` (the heading exists, `RUNBOOK.md` line 87) and also explains the secrets, the first-release version (`1.0.0`, O2), the breaking-change footer and the `!` limit (O3), the known limit of a cancelled pending run (D10) and recovery from a failed run. `README.md` and `deploy/RUNBOOK.md` are not edited (section 8).
- **D20. Tests are `node:test` files under `scripts/`**, picked up by the root `npm test` with no change to `package.json`. They use the `yaml` devDependency already installed (`package.json` line 40) and path-override env variables for the mutation checks, as `scripts/ci-workflow.test.mjs` does with `CI_WORKFLOW_PATH` (lines 9 to 12). They need no Docker, network or GitHub.

## 2. Files to create or change

Only the paths below change. Nothing in `package.json`, `package-lock.json`, `Dockerfile`, `scripts/build-image.sh`, `scripts/entrypoint.sh`, `deploy/`, `README.md` or `.github/workflows/ci.yml` changes. Scripts are mode 0755 like `scripts/build-image.sh`.

| Path | Change | Purpose |
|---|---|---|
| `.github/workflows/publish.yml` | new | the five jobs (section 3, step 5) |
| `.releaserc.json` | new | semantic-release config at the root (D3) |
| `scripts/release-guard.mjs` | new | the local plugin (D4) |
| `scripts/publish-plan.sh` | new | reads the plugin's output file; prints `release`, `version`, `pin`, `short`, `built_at` as `key=value` lines for `$GITHUB_OUTPUT` |
| `scripts/publish-merge.sh` | new | digest folder in; manifest check; tags; one `imagetools create` |
| `scripts/smoke-image.sh` | new | the per-arch checks (D13, D14) |
| `docs/RELEASING.md` | new | pre-release checklist and release notes for the maintainer (D19) |
| `scripts/publish-workflow.test.mjs` | new | static tests W1 to W12 |
| `scripts/publish-scripts.test.mjs` | new | tests for `publish-plan.sh` (P), `publish-merge.sh` (M) and the plugin (G) |
| `scripts/smoke-image.test.mjs` | new | tests K1 to K13 for the smoke script against a stub `docker` |
| `scripts/publish-test-kit.mjs` | new | helper (not `*.test.mjs`, so the glob skips it): builds the stub `docker` on a temp `PATH` and records its calls |

### The scripts, exactly

**`scripts/publish-plan.sh <next-version-file>`** (`set -euo pipefail`). Requires `GITHUB_SHA` (7 to 40 lowercase hex, else exit 1). `BUILT_AT` defaults to `date -u +%Y-%m-%dT%H:%M:%SZ` and must match `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$`. If the file does not exist: `release=false`, `version=0.0.0-dev`, `pin=sha-<short>`. If it exists: it must hold exactly one line that matches `^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$` (no `v`, no `+build`), else exit 1; then `release=true`, `version=<it>`, `pin=<it>`. On any error: message on stderr, nothing on stdout. On success stdout is exactly five lines in this order: `release=`, `version=`, `pin=`, `short=` (first 7 characters of `GITHUB_SHA`), `built_at=`.

**`scripts/publish-merge.sh <digests-dir>`** (`set -euo pipefail`). Env: `REGISTRY_IMAGE` (required, `^[a-z0-9._:/-]+$`), `SHORT` (required, 7 to 40 lowercase hex), `RELEASE` (`true` or `false`), `VERSION` (required and semver-checked when `RELEASE=true`, ignored otherwise). Every validation error exits 1 before any `docker` call. Then:
1. Each entry of the folder must be named by 64 lowercase hex characters (a digest without `sha256:`); there must be exactly two. Reference list `refs`: `"$REGISTRY_IMAGE@sha256:<digest>"` for each.
2. `manifest=$(docker buildx imagetools create --dry-run "${refs[@]}")`. If it exits non-zero, exit 1.
3. Parse `manifest` with `node -e` (no `jq`): `(m.manifests||[]).map(x=>x.platform).filter(p=>p&&p.os!=='unknown').map(p=>p.os+'/'+p.architecture).sort()` must equal `["linux/amd64","linux/arm64"]`; otherwise print the platforms found to stderr and exit 1. No tag has been pushed yet.
4. `docker buildx imagetools create -t "$REGISTRY_IMAGE:latest" -t "$REGISTRY_IMAGE:sha-$SHORT"` plus `-t "$REGISTRY_IMAGE:$VERSION"` only when `RELEASE=true`, then `"${refs[@]}"`. Exactly one such call.
5. `docker buildx imagetools inspect "$REGISTRY_IMAGE:sha-$SHORT"` for the log; a failure here only prints a warning.

**`scripts/smoke-image.sh <image-ref>`.** `set -uo pipefail` (no `-e`: every check runs). Its working files go in `mktemp -d`; the container name is `scriba-smoke-$$`; a `trap` removes the folder and `docker rm -f` the container. Each check is a function whose stdout is its detail on success and its reason on failure; a runner prints `PASS <name>: <detail>` or `FAIL <name>: <reason>` and counts failures. Every `docker run` passes `--rm` except one: the `healthz` container runs with `-d` and no `--rm`, so that `docker logs` still works after the app has crashed; the `trap` removes it with `docker rm -f` on every exit path (K10 checks the call). The checks:
- `dispenser`: `docker run --rm -e SETUP=true "$REF" > "$tmp/boot.sh"` exits 0; the first line is `#!/usr/bin/env bash` (so no byte comes before the script); `bash -n "$tmp/boot.sh"` passes; the file has a line exactly `REF=bbartolome/scriba:$EXPECTED_PIN` and a line exactly `IMAGE_TAG=$EXPECTED_PIN` (`scripts/entrypoint.sh` lines 25 and 26). Stderr is not asserted (Docker prints platform warnings there when run under emulation).
- `pandoc`: `docker run --rm --entrypoint pandoc "$REF" --version`, first line exactly `pandoc 3.13` (the output is captured whole, then cut, so `head` cannot cause SIGPIPE).
- `typst`: `docker run --rm --entrypoint typst "$REF" --version` exits 0 and the first line matches `^typst [0-9]+\.[0-9]+\.[0-9]+`.
- `convert`: `docker run --rm -w /tmp --entrypoint sh "$REF" -c '<script>'` where the script, run with `set -e`, writes `t.md` (`# Title`, blank line, `Hello world.`), runs `pandoc t.md -o t.docx`, `pandoc t.md -o t.epub` and `pandoc t.md --to=typst --pdf-engine=typst -o t.pdf`, then checks: `head -c 2 t.docx` is `PK` and `grep -aq word/document.xml t.docx`; `head -c 2 t.epub` is `PK` and `grep -aq application/epub+zip t.epub`; `head -c 5 t.pdf` is `%PDF-`; it prints `converted`. The check passes when the output is exactly `converted`.
- `healthz`: `docker run -d --name "$NAME" --tmpfs /books:rw,mode=1777 "$REF"` (no sidecar, no `SCRIBA_*` variables); poll `docker exec "$NAME" node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"` up to `SMOKE_POLLS` times with `SMOKE_POLL_SLEEP` seconds between; then `docker exec "$NAME" node -e "fetch('http://127.0.0.1:8080/healthz').then(async r=>console.log(r.status+' '+await r.text()))"` must print exactly `200 {"status":"ok","version":"<EXPECTED_VERSION>"}` (the shape from `apps/api/src/modules/platform/health.controller.ts` line 13). On failure it prints the last 20 lines of `docker logs "$NAME"`.
- `fts5`: the PLT-14 criterion 4 command: `docker run --rm --entrypoint node "$REF" -e "<script>"` with `DatabaseSync(':memory:')`, `CREATE VIRTUAL TABLE t USING fts5(body)`, one insert of `the quick brown fox`, and `SELECT body FROM t WHERE t MATCH 'quick'`; the output must be exactly `[{"body":"the quick brown fox"}]`.
- `size`: D14. Prints `unpacked <KiB> KiB (<MiB> MiB), compressed <MB or n/a>`.
- `arch` (only when `EXPECTED_ARCH` is set): `docker run --rm --entrypoint node "$REF" -p process.arch` equals `$EXPECTED_ARCH`.
At the end it writes a Markdown table of the results to `$GITHUB_STEP_SUMMARY` when that variable is set, and exits 1 if any check failed.

**`scripts/release-guard.mjs`**: as D4. Named export `verifyRelease`, ESM, no dependencies beyond `node:fs`.

### The workflow (the text the implementer writes in step 5)

`<PIN>` is the version resolved in step 1. Format with Prettier afterwards.

```yaml
name: publish
on:
  push:
    branches: [main]
    paths-ignore:
      - README.md
      - LICENSE
      - .gitignore
      - docs/**
      - modules/**
      - plans/**
      - units/**
  workflow_dispatch:
concurrency:
  group: publish-${{ github.ref }}
  cancel-in-progress: false
permissions:
  contents: read
env:
  REGISTRY_IMAGE: docker.io/bbartolome/scriba
  SEMANTIC_RELEASE_VERSION: <PIN>
jobs:
  plan:
    name: Plan the release
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    permissions:
      contents: write
    outputs:
      release: ${{ steps.plan.outputs.release }}
      version: ${{ steps.plan.outputs.version }}
      pin: ${{ steps.plan.outputs.pin }}
      short: ${{ steps.plan.outputs.short }}
      built_at: ${{ steps.plan.outputs.built_at }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
      - name: Dry-run semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SCRIBA_PLAN_OUT: ${{ runner.temp }}/next-version
        run: |
          rm -f "$SCRIBA_PLAN_OUT"
          npx --yes "semantic-release@$SEMANTIC_RELEASE_VERSION" --dry-run
      - name: Write the plan
        id: plan
        run: bash scripts/publish-plan.sh "$RUNNER_TEMP/next-version" >> "$GITHUB_OUTPUT"

  build:
    name: Build ${{ matrix.platform }}
    needs: plan
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 45
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: linux/amd64
            runner: ubuntu-24.04
            node_arch: x64
          - platform: linux/arm64
            runner: ubuntu-24.04-arm
            node_arch: arm64
    steps:
      - uses: actions/checkout@v7
      - name: Prepare
        env:
          PLATFORM: ${{ matrix.platform }}
        run: |
          echo "PLATFORM_PAIR=${PLATFORM//\//-}" >> "$GITHUB_ENV"
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push by digest
        id: build
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: ${{ matrix.platform }}
          build-args: |
            VERSION=${{ needs.plan.outputs.version }}
            REVISION=${{ needs.plan.outputs.short }}
            BUILT_AT=${{ needs.plan.outputs.built_at }}
          outputs: type=image,name=${{ env.REGISTRY_IMAGE }},push-by-digest=true,name-canonical=true,push=true
          provenance: false
          cache-from: type=gha,scope=${{ env.PLATFORM_PAIR }}
          cache-to: type=gha,mode=max,scope=${{ env.PLATFORM_PAIR }}
      - name: Export the digest
        env:
          DIGEST: ${{ steps.build.outputs.digest }}
        run: |
          mkdir -p /tmp/digests
          touch "/tmp/digests/${DIGEST#sha256:}"
      - uses: actions/upload-artifact@v7
        with:
          name: digests-${{ env.PLATFORM_PAIR }}
          path: /tmp/digests/*
          if-no-files-found: error
          retention-days: 1

  smoke:
    name: Smoke ${{ matrix.platform }}
    needs: [plan, build]
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: linux/amd64
            runner: ubuntu-24.04
            node_arch: x64
          - platform: linux/arm64
            runner: ubuntu-24.04-arm
            node_arch: arm64
    steps:
      - uses: actions/checkout@v7
      - name: Prepare
        env:
          PLATFORM: ${{ matrix.platform }}
        run: |
          echo "PLATFORM_PAIR=${PLATFORM//\//-}" >> "$GITHUB_ENV"
      - uses: actions/download-artifact@v7
        with:
          name: digests-${{ env.PLATFORM_PAIR }}
          path: /tmp/digests
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Resolve the image
        run: |
          set -euo pipefail
          digest=$(ls /tmp/digests)
          echo "SMOKE_IMAGE=$REGISTRY_IMAGE@sha256:$digest" >> "$GITHUB_ENV"
      - name: Image smoke checks
        env:
          EXPECTED_VERSION: ${{ needs.plan.outputs.version }}
          EXPECTED_PIN: ${{ needs.plan.outputs.pin }}
          EXPECTED_ARCH: ${{ matrix.node_arch }}
        run: bash scripts/smoke-image.sh "$SMOKE_IMAGE"

  merge:
    name: Merge the manifest list
    needs: [plan, smoke]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/download-artifact@v7
        with:
          path: /tmp/digests
          pattern: digests-*
          merge-multiple: true
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Check the manifest, then create the tags
        env:
          SHORT: ${{ needs.plan.outputs.short }}
          RELEASE: ${{ needs.plan.outputs.release }}
          VERSION: ${{ needs.plan.outputs.version }}
        run: bash scripts/publish-merge.sh /tmp/digests

  release:
    name: Tag and release
    needs: [plan, merge]
    if: github.ref == 'refs/heads/main' && needs.plan.outputs.release == 'true'
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
      - name: Run semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SCRIBA_EXPECT_VERSION: ${{ needs.plan.outputs.version }}
        run: npx --yes "semantic-release@$SEMANTIC_RELEASE_VERSION"
      - name: Check the tag and the release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VERSION: ${{ needs.plan.outputs.version }}
        run: |
          set -euo pipefail
          sha=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/v$VERSION" --jq .object.sha) || { echo "semantic-release did not create tag v$VERSION; main may have moved during the run" >&2; exit 1; }
          [ "$sha" = "$GITHUB_SHA" ] || { echo "tag v$VERSION points at $sha, not at $GITHUB_SHA" >&2; exit 1; }
          gh release view "v$VERSION" --repo "$GITHUB_REPOSITORY" > /dev/null
```

`.releaserc.json` (D3):

```json
{
  "branches": ["main"],
  "tagFormat": "v${version}",
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "./scripts/release-guard.mjs",
    [
      "@semantic-release/github",
      {
        "successComment": false,
        "failComment": false,
        "failTitle": false,
        "releasedLabels": false
      }
    ]
  ]
}
```

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype` on branch `unit/PLT-19`, made from the tip of `main`. Use Node 26 (`.nvmrc`). Record `node -v` and `docker version --format '{{.Server.Version}}'` beside the results. Do not push; the repository has no remote. If a step does not behave as written, stop and report; do not change the plan.

0. Branch and tools. `git switch -c unit/PLT-19` on a clean tree. `node -v` prints `v26.x`. `docker info >/dev/null && echo docker-ok`. If Docker is absent: skip step 1(b) and leave O5 open (record "flag not checked"); do steps 1(a), 1(c) and 2 to 10; in step 11 run S-P2 (it needs `npx` and the npm registry, not Docker; if either is missing, mark S-P2 NOT RUN too) and mark S-P1 and S-P3 NOT RUN with the cause "no Docker"; still do step 12 (the commit) and report which stand-in rows ran, so that only the criteria whose rows all ran and passed are ticked (O1).
1. Resolve versions and check flags. (a) `npm view semantic-release version` and `npm view semantic-release engines.node`; take the newest version whose `engines.node` admits Node 26; that is `<PIN>`; record both. (b) `docker buildx version`, and `docker buildx imagetools create --help | grep -- '--dry-run'` must print the flag; if not, stop (O5). (c) Check the action tags. `actions/download-artifact@v7` is new to this repository (`ci.yml` uses only checkout, setup-node and upload-artifact), so it must be checked: `gh api repos/actions/download-artifact/git/ref/tags/v7 --jq .ref` must print `refs/tags/v7`; if the tag does not exist, take the major of `gh api repos/actions/download-artifact/releases/latest --jq .tag_name` and use that major for both `download-artifact` and `upload-artifact` in `publish.yml` (they must be the same major to read each other's artifacts; `ci.yml` is not edited). Also read `gh api repos/docker/build-push-action/releases/latest --jq .tag_name` and the same for `docker/setup-buildx-action` and `docker/login-action`. If `gh` or the network is unavailable, keep D17's majors, record "not checked", and the A5 assumption stays open for the first real run. Record what was read.
2. Red tests. Write the four test files (section 4 lists every test). Run `node --test scripts/publish-workflow.test.mjs scripts/publish-scripts.test.mjs scripts/smoke-image.test.mjs`. Expected: every test fails (the files under test do not exist). Commit `test(PLT-19): add the publish workflow, script and smoke tests (red)`.
3. Write `.releaserc.json` and `scripts/release-guard.mjs`.
4. Write `scripts/publish-plan.sh`, `scripts/publish-merge.sh` and `scripts/smoke-image.sh` as in section 2; `chmod 0755` each.
5. Write `.github/workflows/publish.yml` from section 2, with `<PIN>` replaced.
6. Write `docs/RELEASING.md` (D19). Required content: the five jobs in one paragraph each at most; the two repository secrets and that the Docker Hub repository `bbartolome/scriba` must exist (a manual step, O7); the first version: the text must say the first release is `1.0.0` (O2); which Conventional Commit types release (`feat`, `fix`, plus `perf` and `revert` under the default rules) and which do not; the breaking-change rule (O3): the text must say that a breaking change needs a footer line that starts with `BREAKING CHANGE:` in the squash-merge body, and that a `!` after the type (`feat!:`) does not release; the checklist (PR title is Conventional; CI green; if the release touches `Dockerfile`, `deploy/`, `scripts/entrypoint.sh` or the installer, run the runbook at `../deploy/RUNBOOK.md#pre-release-checklist`); how to read a run; a section titled "Known limit: a cancelled pending run" (D10, accepted by the Navigator as a recorded limit): while one run is in progress and a second push is waiting, a third push cancels the second push's pending run; the second push's commit then gets no `sha-<short>` tag, and that tag is never published later; its changes ship in the third run's `latest` and its commits count in the third run's plan, so no release is lost and the version is right; recovery (a failed run before `merge` published nothing; if `release` failed, re-run the failed job; if main moved meanwhile, use Run workflow on `main`, which re-plans and overwrites the same semver tag with the new image since no git tag was made).
7. `npx prettier --write .github/workflows/publish.yml .releaserc.json docs/RELEASING.md scripts/release-guard.mjs scripts/publish-workflow.test.mjs scripts/publish-scripts.test.mjs scripts/smoke-image.test.mjs scripts/publish-test-kit.mjs`. Prettier does not parse `.sh` files. Then `git status --short` lists only section 2 paths.
8. The three test files: the command of step 2. Expected: all pass, 0 failures.
9. Root gates from the repository root: `npm run lint`, `npm test`, `npm run build`. Expected: each exits 0; `npm run lint` ends with `All matched files use Prettier code style!`.
10. Mutation checks, section 4.7. Each mutant is a copy in `$(mktemp -d)`, pointed at by the override variable; the original files are not edited. Expected: the named test fails on the mutant and passes on the original.
11. Local procedures S-P2, S-P1 and S-P3 (section 4.7). Guards and cleanup are inside each.
12. Commit `feat(PLT-19): add publish.yml, the release config, the publish scripts, the image smoke checks and the release checklist`. Report the results of steps 8 to 11 and what was not run. The orchestrator ticks the boxes in the unit file by the rule of O1: criteria 1, 2 and 4 each only after every stand-in row named for it in section 4 ran and passed; criterion 5 after its own tests and mutation checks pass (it needs no stand-in); criterion 3 is never ticked (section 4.3).

## 4. Acceptance criteria and tests

The criteria are the unit's lines 41 to 45, unchanged. This plan marks nothing passed; the tick rule is O1. All five end in a real GitHub Actions run with Docker Hub credentials; this repository has no git remote (`git remote -v` prints nothing), no runner, and no Docker Hub account here. The tests below prove the logic and the structure; where a criterion has a part that only a real run can show, the row says "cannot test locally", names the cause, and the part is recorded as untested under O1 (closed by the Navigator's ruling, `611843e`). Names: W = `scripts/publish-workflow.test.mjs`, P, M and G = `scripts/publish-scripts.test.mjs`, K = `scripts/smoke-image.test.mjs`, S-P = a local procedure (4.7).

### 4.1 Criterion 1: a push to `main` with no releasable commit publishes `latest` and `sha-<short>` for both arches and creates no git tag

| Test | Seam | Pass condition |
|---|---|---|
| W1 | `on` of the parsed `publish.yml` | the keys are exactly `push` and `workflow_dispatch`; `push.branches` is `['main']`; `push.paths-ignore` equals the D18 list; none of these sample paths (they need not exist) matches a pattern (small glob matcher in the test, `**` as `.*` and `*` as `[^/]*`): `deploy/RUNBOOK.md`, `Dockerfile`, `scripts/entrypoint.sh`, `examples/nonfiction/sample.md`, `packages/packs/src/x.md`, `apps/api/src/modules/platform/x.ts`, `.github/workflows/publish.yml` |
| W3 | the `if` of `merge` and `release` | `merge.if` and `release.if` contain `github.ref == 'refs/heads/main'`; `release.if` also contains `needs.plan.outputs.release == 'true'`; `merge` has no condition on `release`; `concurrency.group` contains `github.ref` and `concurrency.cancel-in-progress` is `false` (D10) |
| W2 | the `build` and `smoke` matrices | each matrix has exactly the two pairs `linux/amd64` on `ubuntu-24.04` and `linux/arm64` on `ubuntu-24.04-arm`, with `node_arch` `x64` and `arm64`, and `fail-fast: false`, so both arches are built and smoked |
| W12 | the wiring between jobs | see 4.8: the `plan` outputs and their use, the `SCRIBA_PLAN_OUT` file, `merge`'s `SHORT`, `RELEASE` and `VERSION`, and the digest hand-off; a wrong key would make every push plan `release=false` or make `merge` exit 1 while every other test passes |
| P1, P2 | `publish-plan.sh` | no output file: stdout is exactly `release=false`, `version=0.0.0-dev`, `pin=sha-<first 7 of GITHUB_SHA>`, `short=<same 7>`, `built_at=<value>`; file `1.2.3`: `release=true`, `version=1.2.3`, `pin=1.2.3` |
| M1 | `publish-merge.sh` with the stub `docker` | `RELEASE=false`: exactly one `imagetools create` call without `--dry-run`, with exactly two `-t` arguments, `<registry>:latest` and `<registry>:sha-<SHORT>`, and the two `@sha256:` sources |
| K1 | `smoke-image.sh` with a stub that passes | with `EXPECTED_VERSION=0.0.0-dev` and `EXPECTED_PIN=sha-abc1234`, exit 0, and the `dispenser` check passes only because the stub's script has `REF=bbartolome/scriba:sha-abc1234` |
| W6 | the `plan` and `release` steps | `plan` calls semantic-release with `--dry-run`; the only call without `--dry-run` is in `release`; nothing outside `release` can create a tag, so a no-release push (job skipped) creates no git tag |
| G1 | `release-guard.mjs` with `verifyRelease` | when `SCRIBA_PLAN_OUT` is unset it writes no file; when set it writes `<version>\n` |
| S-P2 (a, b, d) | real semantic-release on a scratch repo | (a) and (b) are dry runs: after the `chore:` and the `docs:` commit the dry run writes no output file, and `publish-plan.sh` run on `$S/out` prints `release=false`; (d) is the real run: after a `chore:` commit following the first release, the real run exits 0, `publish-plan.sh` prints `release=false`, and `git ls-remote --tags` shows no new tag |
| S-P1 (A) | registry stand-in | after `publish-merge.sh` with `RELEASE=false`, the new tags are exactly `latest` and `sha-<short>`, and `latest` lists `linux/amd64` and `linux/arm64` |

Cannot test locally: the workflow on GitHub-hosted runners (both arches natively), the push to Docker Hub, and the absence of a git tag after a real Actions run. Cause: no git remote, no runner, no credentials. Local procedure, accepted by the Navigator (O1, `611843e`): the rows above. Criterion 1 is ticked only after W1, W2, W3, W6, W12, P1, P2, M1, K1, G1, S-P2 (a, b, d) and S-P1 (A) all ran and passed; if S-P1 ends NOT RUN, its row has not run and the box stays unticked. The unrun parts are recorded as untested with their cause: the Docker Hub push (no credentials, no remote) and the real Actions run on both native runners (no runner).

Known limit of criterion 1 (D10), accepted by the Navigator as a recorded limit (`plans/DECISIONS.md`, "2026-11-14 — PLT-19 — the Navigator's decision on the cancelled pending run (D10 …)", option (a), commit `6aed752`), which is what authorises the tick of criterion 1 in the paragraph above: with the serialised concurrency group, GitHub keeps one pending run. If a run is in progress, a second push waits, and a third push cancels the second's pending run, then the second push's commit gets no `sha-<short>` tag (its changes are in the third run's `latest`, and its commits count in the third run's `plan`). So "a push publishes `latest` and `sha-<short>`" holds for every push whose run is not cancelled while pending. No test can show this here (it is GitHub's queue behaviour, ASSUMED A4); W3 checks that `cancel-in-progress` is `false` and that the group is per ref; `docs/RELEASING.md` states the limit (W11). The alternatives are worse and were rejected by the Navigator: no concurrency group, or a per-commit group (`github.sha`), lets two runs on one ref run at once, so a later run may not see the git tag that the earlier run created and the two plan the same version.

### 4.2 Criterion 2: a `feat:` or `fix:` push publishes the semver tag too, then the git tag and GitHub release; the image reports that semver from `/healthz`

| Test | Seam | Pass condition |
|---|---|---|
| P3 | `publish-plan.sh` | the file `1.2.3`: `release=true`, `version=1.2.3`, `pin=1.2.3`; the files `v1.2.3`, `1.2`, `1.2.3+b5`, an empty file and a two-line file each exit 1 with nothing on stdout; a `GITHUB_SHA` of 6 characters or with an upper-case letter exits 1 |
| M2 | `publish-merge.sh` | `RELEASE=true VERSION=1.2.3`: the create call has three `-t` arguments, the third `<registry>:1.2.3`; `VERSION` of `v1.2.3`, `1.2` or empty exits 1 before any `docker` call |
| W2 | `needs` and the matrices | `release.needs` contains `merge`; `merge.needs` contains `smoke`; so the git tag is created after the image tags; the `build` and `smoke` matrices are the two native pairs of criterion 1 |
| W12 | the wiring between jobs | the `plan` outputs reach `build` (`VERSION`), `merge` (`RELEASE`, `VERSION`, `SHORT`) and `release` (`SCRIBA_EXPECT_VERSION`); `SCRIBA_PLAN_OUT` names the file `publish-plan.sh` reads (4.8) |
| W5 | the build step's `build-args` | `VERSION`, `REVISION` and `BUILT_AT` come from `needs.plan.outputs.version`, `.short` and `.built_at` |
| W6 | the `release` job | `release` sets `SCRIBA_EXPECT_VERSION` from `needs.plan.outputs.version`, runs semantic-release with no `--dry-run`, and has a later step that reads `git/ref/tags/v$VERSION` and runs `gh release view` |
| W8 | `.releaserc.json` | `branches` is `['main']`; the plugins are exactly the four of D3 in that order; `@semantic-release/github` has the four `false` options |
| K2 | `smoke-image.sh`, `healthz` | the stub's `/healthz` answers `200 {"status":"ok","version":"1.2.3"}` with `EXPECTED_VERSION=1.2.3`: PASS; the same stub with `EXPECTED_VERSION=1.2.4`: `FAIL healthz` and exit 1 |
| G2, G3 | `verifyRelease` | with `SCRIBA_EXPECT_VERSION=1.2.3` and `nextRelease.version` `1.2.3` it resolves; with `nextRelease.version` `1.3.0` it throws and writes no file |
| S-P2 (c to g) | real semantic-release on a scratch repo | a `fix:` commit gives `1.0.0` (the first release); a real run with `SCRIBA_EXPECT_VERSION=1.0.0` creates `v1.0.0` in the remote on `HEAD`; a later `feat:` gives `1.1.0`; a run with `SCRIBA_EXPECT_VERSION=9.9.9` fails and creates no tag |
| S-P1 (B) | registry stand-in | `publish-merge.sh` with `RELEASE=true VERSION=1.2.3 SHORT=def5678` adds the tags `1.2.3` and `sha-def5678`; the three new tags (`latest`, `sha-def5678`, `1.2.3`) resolve to one digest |
| S-P3 | real images, local | a build with `VERSION=1.2.3` and `scripts/smoke-image.sh` with `EXPECTED_VERSION=1.2.3 EXPECTED_PIN=1.2.3` passes on arm64 and, under emulation, amd64; `/healthz` printed `{"status":"ok","version":"1.2.3"}` |

Cannot test locally: the Docker Hub semver tag, the real GitHub release (the `@semantic-release/github` plugin needs github.com and a token), and the run order on real runners. Cause: no remote, no credentials. Local procedure, accepted by the Navigator (O1, `611843e`): the rows above. Criterion 2 is ticked only after P3, M2, W2, W5, W6, W8, W12, K2, G2, G3, S-P2 (c to g), S-P3 and S-P1 (B) all ran and passed; if S-P1 ends NOT RUN, the box stays unticked. The unrun parts are recorded as untested with their cause: the Docker Hub push, the GitHub release (no github.com, no token) and the run order on real runners (no runner). The S-P2 scratch repo removes the GitHub plugin to test the rest (the test config is derived from `.releaserc.json`, so the analyser rules are the real ones).

### 4.3 Criterion 3: a failure in any build or smoke job leaves no new tag on Docker Hub and no git tag

| Test | Seam | Pass condition |
|---|---|---|
| W4 | the build step | uses `docker/build-push-action`, its `outputs` contain `push-by-digest=true`, it has no `tags` key, and no step in `plan`, `build`, `smoke` or `release` contains `imagetools`, ` -t ` or `publish-merge.sh`; only `merge` calls `scripts/publish-merge.sh`; the text of `scripts/smoke-image.sh` and `scripts/publish-plan.sh` contains no `imagetools create`, `docker push` or `docker tag` |
| W2 | `needs` | `plan` has no `needs`; `build.needs` contains `plan`; `smoke.needs` contains `build`; `merge.needs` contains `smoke`; `release.needs` contains `merge` |
| W3 | the `if` of `smoke`, `merge`, `release` | none contains `always()`, `failure()` or `cancelled()`, so GitHub skips them when a needed job failed |
| M3 | `publish-merge.sh` | with one digest file, with three, and with a file whose name is not 64 hex characters: exit 1, and the stub's call log has no `imagetools create` at all |
| M4 | `publish-merge.sh` | the dry-run stub prints a manifest that has only `linux/amd64` (or two `linux/amd64` entries): exit 1, and the call log has the `--dry-run` call and no create call without `--dry-run` |
| M5 | `publish-merge.sh` | the dry-run call exits 1: exit 1, no create call without `--dry-run` |
| K2 to K12 | `smoke-image.sh` | each check broken in turn (the stub's output for that check wrong) gives exit 1, `FAIL <that check>`, and `PASS` for every other check, so no failure hides another; the table is in 4.5 |
| S-P1 (C, D) | registry stand-in | with one digest, and with two digests of the same platform, `publish-merge.sh` exits 1 and the registry's tag list has no `latest` or `sha-` tag |

Cannot test locally: that GitHub Actions really skips `merge` and `release` when a build or smoke matrix leg fails (the documented behaviour of `needs` without `always()`), and a real Docker Hub tag list after a failed run. Cause: no GitHub Actions runner in this environment (`act`, `actionlint` and `yamllint` are not installed here, `which` found only `docker` and `jq`).

**Navigator decision on criterion 3 (O1; `plans/DECISIONS.md` "2026-11-14 — PLT-19 — the Navigator's decisions on O1 …", commit `611843e`; under `prompt.md` lines 142 and 143).** The structural proxy (W2 and W3, with the script refusals M3 to M5 and S-P1 C and D) is not accepted as proof of criterion 3: it shows the YAML wiring but does not exercise the claim that Actions skips `merge` and `release` when a matrix leg fails. The Navigator decides that the unit is complete without criterion 3. Its checkbox is NOT marked. The criterion and its cause (no GitHub Actions runner in this environment) are recorded here and stay so until a real run exists. The tests W2, W3, M3 to M5, K2 to K12 and S-P1 (C, D) are kept unchanged; they are tests of the wiring and the refusals, not proof of the criterion. No criterion is weakened or dropped. This is also not testable: a failure in `release` after `merge` leaves a semver image tag with no git tag (the unit's ordering; see O4).

### 4.4 Criterion 4: all smoke checks pass on both arches

| Test | Seam | Pass condition |
|---|---|---|
| K1 | `smoke-image.sh` against an all-passing stub | exit 0; stdout has a `PASS` line for each of `dispenser`, `pandoc`, `typst`, `convert`, `healthz`, `fts5`, `size` and (with `EXPECTED_ARCH=arm64`) `arch` |
| W9 | the `smoke` job | its `strategy.matrix.include` has `ubuntu-24.04` with `linux/amd64` and `ubuntu-24.04-arm` with `linux/arm64`; a step runs `scripts/smoke-image.sh "$SMOKE_IMAGE"` with `EXPECTED_VERSION`, `EXPECTED_PIN` and `EXPECTED_ARCH` from `needs.plan.outputs.version`, `.pin` and `matrix.node_arch`; `SMOKE_IMAGE` is set from `$REGISTRY_IMAGE@sha256:` plus the downloaded digest |
| M4 | `publish-merge.sh` with the stub | the manifest check of D11 refuses a dry-run manifest that lacks `linux/arm64` or lists `linux/amd64` twice (exit 1, no create call), so the merged-manifest smoke check (unit line 31) can fail |
| M6 | `publish-merge.sh` | the manifest check of D11 passes for a dry-run manifest with both platforms plus an `unknown/unknown` attestation entry |
| S-P1 (A) | registry stand-in | the real `docker buildx imagetools create --dry-run` output, parsed by the real `publish-merge.sh`, lists exactly `linux/amd64` and `linux/arm64`, and the pushed `latest` lists both; this is the only row that proves assumption A2 (the flag and its output), because M4 and M6 run against a stub |
| S-P3 | real images, local | `scripts/smoke-image.sh` prints `PASS` for every check on `bbartolome/scriba:plt19-arm64` (native here) and on `plt19-amd64` (emulated), and on a `VERSION=0.0.0-dev` build with `EXPECTED_PIN=sha-<short>`; the size line is recorded |

Cannot test locally: the checks on a native `ubuntu-24.04` amd64 runner and the pull by digest from Docker Hub. Cause: this host is arm64 and has no remote. Local procedure, accepted by the Navigator (O1, `611843e`): the rows above. Criterion 4 is ticked only after K1, W9, M4, M6, S-P1 (A) and S-P3 (arm64 native, amd64 emulated, and the `0.0.0-dev` build) all ran and passed; if S-P1 ends NOT RUN, A2 is unproved and the box stays unticked. The unrun parts are recorded as untested with their cause: the native amd64 run (this host is arm64) and the pull by digest from Docker Hub (no published image). The amd64 run here is under QEMU and is recorded as emulated. The native proof comes with the first real publish run, which is also the native check that PLT-14 criterion 5 waits for (`plans/PLT-14.md` line 217; `units/PLT-14-dockerfile-entrypoint.md` line 40 is unticked).

### 4.5 Smoke script tests K1 to K13 (the rows K2 to K12 of 4.3 refer to this table)

| Id | Stub behaviour | Expected |
|---|---|---|
| K1 | all outputs correct | exit 0, `PASS` for each check |
| K2 | `/healthz` version differs from `EXPECTED_VERSION` | `FAIL healthz`, exit 1 |
| K3 | dispenser script has a bad shebang (`# x` first) | `FAIL dispenser` |
| K4 | dispenser script fails `bash -n` (an unclosed `if`) | `FAIL dispenser` |
| K5 | dispenser `REF=` line holds another tag than `EXPECTED_PIN` | `FAIL dispenser` |
| K6 | `pandoc --version` first line `pandoc 3.12` | `FAIL pandoc` |
| K7 | `typst --version` exits 1 | `FAIL typst` |
| K8 | the convert script prints nothing, or the stub exits 1 | `FAIL convert` |
| K9 | the FTS5 command prints `[]` | `FAIL fts5` |
| K10 | the container never answers (`SMOKE_POLLS=2`, `SMOKE_POLL_SLEEP=0`) | `FAIL healthz`; the call log shows `docker rm -f` of the container |
| K11 | `EXPECTED_ARCH=arm64` but `process.arch` prints `x64` | `FAIL arch` |
| K12 | `du` cannot be measured (exit 1) | `FAIL size` |
| K13 | no argument, or `EXPECTED_VERSION` or `EXPECTED_PIN` unset | exit 2 with a usage line on stderr and no `docker` call |

For K3 to K12 the other checks still print `PASS`, and the `healthz` container (the only one without `--rm`) is removed by the `trap` in every case, including a crash before the poll ends.

### 4.6 Criterion 5: no step relies on a tag push triggering another workflow; no PAT or App token

This criterion is fully testable locally, because it is a property of the workflow file and the release config.

| Test | Seam | Pass condition |
|---|---|---|
| W1 | `on` | no `tags`, no `tags-ignore`, no `release`, no `workflow_run`, no `workflow_call` trigger in `publish.yml` |
| W7 | every file in `.github/workflows/` (`publish.yml` and `ci.yml`) | `on` is normalised to an object first (so `on: push` or `on: [push]` count as a push with no filter); no workflow has a `create`, `release` or `workflow_run` trigger; where `push` is present it has a non-empty `branches` filter and no `tags` or `tags-ignore` key. A push trigger with a branch filter alone does not run for a tag, so a tag pushed by semantic-release starts nothing, and nothing needs it to |
| W7 | secrets and permissions | every `secrets.<NAME>` in `publish.yml` is one of `GITHUB_TOKEN`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`; the text has none of `PAT`, `app-id`, `private-key`, `create-github-app-token`; workflow `permissions` is exactly `{contents: read}`; the only jobs with a `permissions` key are `plan` and `release`, each exactly `{contents: write}` |
| W2 | one workflow | `release` is in the same file as `merge` and needs it, so the semver image tag and the git tag come from one run |
| W8 | `.releaserc.json` | the plugin list has no `@semantic-release/git`, `/npm`, `/changelog` or `/exec` (no commit back to `main`) |
| W10 | hygiene | no `run:` text contains `${{ github.event` or `${{ github.head_ref`; every `uses:` value ends in `@v<number>`; each job that has a `docker/login-action` step takes both credentials from `secrets.DOCKERHUB_USERNAME` and `secrets.DOCKERHUB_TOKEN` |
| W11 | `docs/RELEASING.md` | links `../deploy/RUNBOOK.md#pre-release-checklist`; that file exists and has a line `## Pre-release checklist`; the doc names both secrets, states that the first release is `1.0.0` (the text contains `1.0.0`, O2), tells the reader that a breaking change needs a footer line starting `BREAKING CHANGE:` (the text contains `BREAKING CHANGE:`, O3), and states the cancelled-pending-run limit (the text contains `pending` and the heading `Known limit`) (unit lines 37 and 38 are not a criterion, but they are decisions) |

Not tested: that GitHub does not start workflows for tags pushed with `GITHUB_TOKEN` (platform behaviour, ASSUMED A9; the unit states it on line 28).

### 4.7 Mutation checks (step 10) and the local procedures (step 11)

Mutation checks (each in a temp copy; the override variables are `PUBLISH_WORKFLOW_PATH`, `RELEASERC_PATH`, `RELEASING_PATH`, `WORKFLOWS_DIR`, `PUBLISH_PLAN_SCRIPT`, `PUBLISH_MERGE_SCRIPT`, `SMOKE_SCRIPT`, `RELEASE_GUARD_PATH`):
- MU1 remove `smoke` from `merge.needs`: W2 fails.
- MU2 copy `.github/workflows/` to a temp folder, add `tags: ['v*']` under `push` in the copy's `publish.yml`, and set both `PUBLISH_WORKFLOW_PATH` (the copy) and `WORKFLOWS_DIR` (the temp folder): W1 and W7 fail. (W7 reads every file of `WORKFLOWS_DIR`, so without that variable it would read the real folder and pass.)
- MU2b the same temp folder, with the `branches` line removed from the `push` trigger of the copy of `ci.yml`: W7 fails.
- MU2c the same temp folder, with a `release:` trigger added to the copy of `publish.yml`: W7 fails.
- MU3 replace the `if` of `merge` (it already has one, so edit it, do not add a second key, which makes `yaml` throw) with `if: always() && github.ref == 'refs/heads/main'`: W3 fails.
- MU4 delete `push-by-digest=true`: W4 fails.
- MU5 add `${{ secrets.PAT }}` anywhere: W7 fails.
- MU6 delete `--dry-run` from `plan`: W6 fails.
- MU7 add `@semantic-release/git` to `.releaserc.json`: W8 fails.
- MU8 delete the manifest-check block of `publish-merge.sh`: M4 fails.
- MU9 replace the `healthz` version comparison in `smoke-image.sh` by `true`: K2 fails.
- MU10 delete the `throw` in `release-guard.mjs`: G3 fails.
- MU11 change the `short` output of `plan` to `${{ steps.plan.outputs.shorts }}`: W12 fails.
- MU12 change `SCRIBA_PLAN_OUT` of the dry-run step to `${{ runner.temp }}/next-versionx`: W12 fails.
- MU13 change `RELEASE` of the `merge` step to `${{ needs.plan.outputs.version }}`: W12 fails.
- MU14 remove the text `BREAKING CHANGE:` from a copy of `docs/RELEASING.md` (set `RELEASING_PATH`): W11 fails.

**S-P2. semantic-release on a scratch repository (needs the npm registry, not Docker).** Guards: `R=$(pwd)` (the repository root, used below); `S=$(mktemp -d)`; stop if `command -v npx` is empty. Steps: `git init --bare "$S/remote.git"`; `git init -b main "$S/work"`; in `work`, `git config user.name t`, `git config user.email t@example.invalid`, `git remote add origin "$S/remote.git"`; copy `scripts/release-guard.mjs` to `work/scripts/`; write `work/.releaserc.json` by reading the repository's `.releaserc.json` with `node` and removing the `@semantic-release/github` entry, nothing else. Then for each of these commits, make it, `git push origin main`, and run `SCRIBA_PLAN_OUT="$S/out" npx --yes "semantic-release@<PIN>" --dry-run --no-ci` from `work` (delete `$S/out` first), and then, from `work`, `GITHUB_SHA=$(git rev-parse HEAD) bash "$R/scripts/publish-plan.sh" "$S/out"`, whose five lines are recorded (it must print `release=false` after (a), (b), (d) and the `feat!` commit of (f), `release=true` with `version=1.0.0` after (c), `1.1.0` after (e), and `2.0.0` after the footer commit of (f); a missing `$S/out` is the no-release case): (a) `chore: init`: no `$S/out`; (b) `docs: x`: no `$S/out`; (c) `fix: a`: `$S/out` holds `1.0.0`; then the real run `SCRIBA_PLAN_OUT="$S/out" SCRIBA_EXPECT_VERSION=1.0.0 npx --yes "semantic-release@<PIN>" --no-ci` exits 0 and `git ls-remote --tags "$S/remote.git"` lists `refs/tags/v1.0.0`; (d) `chore: y`: dry run writes nothing; a real run exits 0 and adds no tag; (e) `feat: b`: dry run writes `1.1.0`; real run tags `v1.1.0`; (f) `feat!: c` alone: record whether the dry run writes a version (expected under the default preset: none; this is the limit of O3); then a `fix: d` commit whose body has the line `BREAKING CHANGE: e`: dry run writes `2.0.0` (do not run a real release); (g) `SCRIBA_EXPECT_VERSION=9.9.9` real run: non-zero exit and the tag list unchanged. Remove `$S` at the end. Record every result. If the dry run does not call `verifyRelease` (no output file after (c)), stop and report (A1).

**S-P1. Registry stand-in (needs Docker, the `registry:2` image and a registry port reachable by the shell).** Guards: no container named `plt19-registry`; host port 5099 free (`docker ps --format '{{.Ports}}'` shows none); and `curl -fsS http://127.0.0.1:5099/v2/` must answer once the registry runs. PLT-14's notes say the shell may run in a container where a published port is not reachable on `127.0.0.1` (`plans/PLT-14.md` line 159). If the shell cannot reach the registry, record S-P1 as NOT RUN with that cause (A2 and A3 then stay unproved until the first real run) and go on. Steps: `docker run -d --name plt19-registry -p 127.0.0.1:5099:5000 registry:2`. Build two tiny single-platform images and push them to `localhost:5099/bbartolome/scriba` as tags `src-amd64` and `src-arm64` (`printf 'FROM busybox:1.37\n' | docker buildx build --platform linux/<arch> --provenance=false --push -t localhost:5099/bbartolome/scriba:src-<arch> -`). The digest of each is `docker buildx imagetools inspect --raw localhost:5099/bbartolome/scriba:src-<arch> | sha256sum` (first field). Make a folder `D` holding two empty files named by the two digests. Case A: `REGISTRY_IMAGE=localhost:5099/bbartolome/scriba SHORT=abc1234 RELEASE=false bash scripts/publish-merge.sh "$D"`: exit 0; `curl -s http://127.0.0.1:5099/v2/bbartolome/scriba/tags/list` lists `src-amd64`, `src-arm64`, `latest`, `sha-abc1234` and nothing else; `imagetools inspect --raw` of `latest` lists both platforms. Case B: `SHORT=def5678 RELEASE=true VERSION=1.2.3`: adds `1.2.3` and `sha-def5678`; the three new tags resolve to one digest. Case C: a folder with only the amd64 digest, `REGISTRY_IMAGE=localhost:5099/bbartolome/scriba-fail`: exit 1 and no `latest` tag there (push the amd64 source to that name first). Case D: two different amd64 digests. Two builds of the same `FROM busybox:1.37` give the same digest, so the second build must differ: `printf 'FROM busybox:1.37\nLABEL plt19=b\n' | docker buildx build --platform linux/amd64 --provenance=false --push -t localhost:5099/bbartolome/scriba-fail:src-amd64b -` (and push the first amd64 build to the same `scriba-fail` repository as `src-amd64`). Take both digests as above and, before the run, assert that they differ (`[ "$d1" != "$d2" ]`) and that the digest folder holds two files (`ls "$D2" | wc -l` prints `2`; if it prints `1`, stop, because the case would test the count rule instead). Then `publish-merge.sh` on that folder with `REGISTRY_IMAGE=localhost:5099/bbartolome/scriba-fail`: exit 1 with the platforms found (`linux/amd64` twice) on stderr, and no `latest` or `sha-` tag in that repository. Case C and Case D therefore use the repository `scriba-fail`; case C runs first with a one-file folder. Cleanup: `docker rm -f plt19-registry`; remove the `localhost:5099/…` images.

**S-P3. Real images, local (needs Docker; the amd64 image runs under emulation).** Guard: no image or container with a `plt19-` name. Build with the same build args the workflow passes: `SHORT=$(git rev-parse --short=7 HEAD)`; `NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)`; for `arm64` and `amd64`: `docker buildx build --platform linux/<arch> --build-arg VERSION=1.2.3 --build-arg REVISION=$SHORT --build-arg BUILT_AT=$NOW --load -t bbartolome/scriba:plt19-<arch> .` (it does not touch the `local-*` tags). Run `EXPECTED_VERSION=1.2.3 EXPECTED_PIN=1.2.3 EXPECTED_ARCH=arm64 bash scripts/smoke-image.sh bbartolome/scriba:plt19-arm64; echo exit=$?` and the same with `EXPECTED_ARCH=x64` on `plt19-amd64`: every check `PASS`, `exit=0`. Then a non-release build: `--build-arg VERSION=0.0.0-dev --build-arg REVISION=$SHORT` tagged `plt19-dev-arm64`, run with `EXPECTED_VERSION=0.0.0-dev EXPECTED_PIN=sha-$SHORT EXPECTED_ARCH=arm64`: every check `PASS` (this is the proof for D5). Then two failing runs on the first image: `EXPECTED_VERSION=9.9.9` gives `FAIL healthz` and exit 1 with the other checks still `PASS`; `EXPECTED_PIN=9.9.9` gives `FAIL dispenser`. Record the `size` line of each arch. Cleanup: `docker image rm bbartolome/scriba:plt19-arm64 bbartolome/scriba:plt19-amd64 bbartolome/scriba:plt19-dev-arm64`; no container is left (`docker ps -a --filter name=scriba-smoke`).

### 4.8 The test files in full (what the implementer writes in step 2)

All tests use `node:test` and `node:assert/strict`, as `scripts/ci-workflow.test.mjs` does. Every path under test defaults to the repository file and can be replaced by the override variable named in 4.7.

- **`scripts/publish-workflow.test.mjs`** (parses `publish.yml`, `.releaserc.json`, `docs/RELEASING.md` and every file of `.github/workflows/`): W1 triggers and `paths-ignore`; W2 the job names (`plan`, `build`, `smoke`, `merge`, `release`), the `needs` chain, and the `build` and `smoke` matrices (the two `runner` and `platform` pairs and `node_arch`; `fail-fast: false`); W3 the `if` conditions and the `concurrency` block; W4 the untagged build and the single caller of `publish-merge.sh`; W5 the build args, the `type=gha` cache with a per-platform scope, and `provenance: false`; W6 the semantic-release calls and the post-release tag check; W7 secrets, permissions and the other workflow files; W8 `.releaserc.json`; W9 the `smoke` job's steps and env; W10 hygiene; W11 `docs/RELEASING.md`; W12 the wiring between jobs (below). Steps are matched by `name` or `uses`, never by index, so an added step (CEX-15) does not break them.
- **W12 in detail.** (i) `jobs.plan.outputs` has exactly the keys `release`, `version`, `pin`, `short` and `built_at`, and each value is exactly `${{ steps.plan.outputs.<same key> }}`. (ii) The `plan` job has a step with `id: plan` whose `run` calls `scripts/publish-plan.sh` and appends to `$GITHUB_OUTPUT`. (iii) The file that the dry-run step names in `env.SCRIBA_PLAN_OUT` (`${{ runner.temp }}/<name>`) is the file `publish-plan.sh` is given (`"$RUNNER_TEMP/<name>"`, same `<name>`). (iv) The `merge` step that calls `publish-merge.sh` has `env.SHORT`, `env.RELEASE` and `env.VERSION` equal to `${{ needs.plan.outputs.short }}`, `.release` and `.version`. (v) The `release` job's `SCRIBA_EXPECT_VERSION` and `VERSION` equal `${{ needs.plan.outputs.version }}`. (vi) The digest hand-off: `build` uploads an artifact named `digests-${{ env.PLATFORM_PAIR }}` from `/tmp/digests/*`; `smoke` downloads `digests-${{ env.PLATFORM_PAIR }}`; `merge` downloads with `pattern: digests-*` and `merge-multiple: true` into the folder that it passes to `publish-merge.sh` (`/tmp/digests`). Every needed `needs.plan.outputs.<key>` used anywhere in the file names a key listed in (i).
- **`scripts/publish-scripts.test.mjs`**: P1 no output file; P2 file `1.2.3`; P3 invalid inputs (`v1.2.3`, `1.2`, `1.2.3+b5`, empty file, two lines, a 6-character or upper-case `GITHUB_SHA`) exit 1 with empty stdout; P4 a valid and an invalid `BUILT_AT` override; P5 the stdout is exactly five lines in the order of section 2. M1 tags without a release; M2 tags with a release and the bad `VERSION` cases; M3 digest-folder errors; M4 a dry-run manifest without arm64, and one with two amd64 entries; M5 a failing dry-run call; M6 a manifest with both platforms plus an `unknown/unknown` entry passes; M7 invalid `REGISTRY_IMAGE`, `SHORT` or `RELEASE` exit 1 with no `docker` call. G1 `verifyRelease` writes `<version>\n` to `SCRIBA_PLAN_OUT`; G2 it resolves when the expected version matches; G3 it throws when it differs and writes no file; G4 with neither variable set it resolves and writes nothing.
- **`scripts/smoke-image.test.mjs`**: K1 to K13 of 4.5.
- **`scripts/publish-test-kit.mjs`**: `makeStubDocker(dir, behaviour)` writes an executable `docker` shell script into `dir`; the script appends each call (all arguments, one line) to a log file and answers by matching the call (`run --rm -e SETUP=true`, `--entrypoint pandoc`, `--entrypoint typst`, `-w /tmp`, `--entrypoint node ... -p process.arch`, `--entrypoint node ... -e`, `--user 0`, `run -d`, `exec`, `rm -f`, `logs`, `buildx imagetools create --dry-run`, `buildx imagetools create -t`, `buildx imagetools inspect`) from files or variables in `behaviour`. It also exports `runScript(script, args, env, stubDir)`, which runs a script with `PATH=<stubDir>:$PATH` and returns status, stdout, stderr and the call log.

## 5. Downstream agreement

- **CEX-15 (the only unit in `unblocks`; its `blocked_by` names "Platform phase:ci-publish (PLT-19)", unit line 7).** It adds "an additive step in Platform's image smoke job" that exports the nonfiction sample to four formats on amd64 and arm64 (its lines 17 and 22). What it needs, and what this plan provides: (a) a `smoke` job that runs per arch on a native runner (D12; W9); (b) the image under test as `$SMOKE_IMAGE` in every later step, plus `$EXPECTED_VERSION`-style values from `needs.plan.outputs` (the step reads them the same way); (c) the gate: `merge` needs `smoke`, so a failing export step blocks every tag (W2, W3); (d) the sample at `/opt/scriba/examples` and a writable folder for Pandoc (S9; the container needs `--tmpfs /books` or a mount, S10). CEX-15 appends a step after "Image smoke checks"; the W tests check the required steps and their order and do not forbid extra steps (D12). Confirmed: nothing in `smoke-image.sh` blocks an additive step. Its criterion "CEX-10 to CEX-14 pass on `main` with real Pandoc and Typst in CI" is `ci.yml`'s (PLT-10, unit line 21), not this unit's.
- **GNP-05 (`units/GNP-05-core-gate.md` line 17; not blocked by PLT-19).** Its pack read-only check may live "in Platform's image smoke". The image runs as UID 1000 by default and `smoke-image.sh` adds no `--user`, so a `touch /opt/scriba/packs/x` check behaves as in `plans/PLT-14.md` (decision checks). It would be a new `check_` function or a new step; nothing here prevents it, and nothing here adds it.
- **PLT-17 (done; `plans/PLT-17.md` O1, D3, A10).** Answers: (a) yes, `sha-<short>` is published on every publishing push whose run is not cancelled while pending (D10); a cancelled pending run publishes nothing, and the pin of any image that was published always names a tag that exists (S3; M1); (b) REVISION and the tag suffix are the same 7 characters from one place (D6; W5; M1); (c) a non-release build bakes exactly `0.0.0-dev` (D5), and the dispenser then pins `sha-<revision>`. The smoke `dispenser` check asserts the pin printed by the published image equals the tag `merge` will push, before it pushes (K5, S-P3). For a release the pin is the semver, which `merge` also tags. Confirmed; no change to `scripts/entrypoint.sh`.
- **PLT-18 (done; `plans/PLT-18.md` lines 189 and 194).** Its update and rollback need tags on Docker Hub; this unit publishes `latest`, `sha-<short>` and semver (S3). The first semver is `1.0.0` (O2, accepted by the Navigator); its README rollback text names no fixed version. PLT-18's recorded limit "the Docker Hub pull is untested" stays untested here (no remote); it can be repeated with `bbartolome/scriba:<tag>` after the first real run. No file of PLT-18 changes.
- **PLT-15 (done; `plans/PLT-15.md` line 337).** Compose defaults to `bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}` (`deploy/compose.yaml` line 40); `latest` exists after the first publishing push on `main`. No compose change.
- **PLT-14 (done).** Build args `VERSION`, `REVISION`, `BUILT_AT` are passed by name (Dockerfile lines 32 to 34); values are validated (S13); the native matrix is the one in unit line 23 and is the native check for PLT-14 criterion 5, whose checkbox this plan does not touch. Open point 5 of PLT-14 (digest-pinned base images) is not taken: base images stay `node:26` and `node:26-slim`; this unit does not edit the Dockerfile. The cache note: the Dockerfile runs `COPY . .` before `npm ci` (lines 30 and 31), so a source change invalidates the install layer; the GHA cache still holds the base layers and the `fetch` stage; changing that is PLT-14's file and not part of this plan.
- **PLT-16 (done; `plans/PLT-16.md` line 231).** The checklist links `deploy/RUNBOOK.md#pre-release-checklist`. SAU-21 later adds its socket row to that table (`units/SAU-21-tailnet-gate.md` line 17), so the link stays valid and nothing changes in `docs/RELEASING.md` when it lands.
- **PLT-13 (done; `plans/PLT-13.md` line 271; unit line 24).** The e2e has no export step; the `convert` smoke check stands in for export (S6). `publish.yml` and `ci.yml` do not share a file and both run on pushes to `main`, independently.
- **PLT-10 (done; `plans/PLT-10.md` line 123; unit line 19).** The PR-title check makes the squash-merge subject a Conventional Commit, which semantic-release reads. The title pattern allows `type!:`, but the default commit analyser does not parse `feat!:` (A1), so such a title does not release; that is open point O3. `ci.yml` is not changed and runs `npm test`, which now includes this unit's tests.
- **Units using the one-liner (SAU-10, SAU-16, SAU-08).** They quote `docker run --rm -e SETUP=true bbartolome/scriba | bash`, which pulls `latest`; it works once `latest` is published. No change.
- **`units/README.md`.** Phase table line 78: merging this unit closes `phase:ci-publish`. No other unit names that phase (`grep -rn ci-publish units/` finds CEX-15 only).

## 6. Open points (for the Navigator)

- **O1. Which criteria can be ticked without a real run. CLOSED by the Navigator (session 2ddb4a6c49c64ada9360fb078f09cf2e, 2026-11-14, `plans/DECISIONS.md` "2026-11-14 — PLT-19 — the Navigator's decisions on O1 …", commit `611843e`): option (a), refined.** Criteria 1 to 4 end in a GitHub Actions run with Docker Hub credentials on native runners; criterion 5 is fully tested locally (section 4.6). Ruling: the stand-ins are accepted as the local procedures for criteria 1, 2 and 4. Each is ticked only after every stand-in row named for it in section 4 ran and passed (a row that ends NOT RUN counts as not run, so S-P1 NOT RUN leaves criteria 1 and 2 unticked), and the unrun parts are recorded in the plan as untested with their cause: the Docker Hub push and pull (no credentials, no remote), the GitHub release (no github.com, no token), the native amd64 run (the host is arm64), the pull by digest (no published image), and the Actions runtime itself (no runner). Criterion 3 is not accepted with its structural proxy; the Navigator decides that the unit is complete without it, its checkbox is not marked (section 4.3). Criterion 5 needs no stand-in and is ticked after its own tests and the mutation checks pass. The planner's earlier default (tick only criterion 5) is withdrawn. The first real run is still the native amd64 check that PLT-14 criterion 5 waits for. Precedents the Navigator cites: `plans/DECISIONS.md` lines 2605 (PLT-17, O3) and 2775 (PLT-18, P10).
- **O2. The first version. CLOSED by the Navigator (same entry, `611843e`): accept `1.0.0`**, semantic-release's default with no prior tag (ASSUMED A1). A `0.x` start would need a baseline tag pushed by hand, with no benefit for a prototype. `docs/RELEASING.md` states `1.0.0` as the first release.
- **O3. Breaking-change syntax. CLOSED by the Navigator (same entry, `611843e`): option (a).** The PR-title check accepts `type!:` (`scripts/check-pr-title.mjs` line 4), but the default commit analyser does not read `feat!:` as a release (ASSUMED A1; S-P2 step (f) records what it does). The current analyser is accepted and a breaking change needs a `BREAKING CHANGE:` footer in the squash body; `docs/RELEASING.md` says so. The `conventionalcommits` preset is NOT installed: both install paths rest on an unverified assumption (A1), and a root devDependency would change the lockfile that every unit shares. The PLT-10 title pattern is not changed. Options (b) (the preset) and (c) (refuse `!` in the title check) are not taken.
- **O4. semantic-release as `npx` at a pinned version, not a devDependency (D2).** The version is not in `package-lock.json`, so Dependabot-style tooling will not see it. The alternative is a root devDependency, which changes `package.json` and the lockfile, both shared by every unit. Proposed: `npx` with the pin. Also open: a release that fails after `merge` leaves a semver image tag with no git tag; the recovery in `docs/RELEASING.md` is a re-run, and the next release overwrites the same semver tag. A second case: if `main` moves during a run, semantic-release in `release` refuses ("local branch is behind the remote", ASSUMED A1) and the `Check the tag and the release` step fails the job on purpose. The proposed protection is the serialised concurrency group (D10) and that failing step; a stricter rule (refuse to overwrite an existing semver tag in `merge`) would block the next run until someone deletes the tag by hand, so it is not planned.
- **O5. `imagetools create --dry-run` (D11).** The unit lists the manifest check among the smoke checks, which run before `merge`; but a merged manifest exists only in `merge`, and checking after the push would leave tags behind on failure. This plan checks the dry-run output before pushing. It depends on the buildx flag and on its output being the index JSON (ASSUMED A2). Step 1(b) checks the flag; S-P1 checks the output if the registry is reachable. If either fails, the Navigator chooses between a check of the two source digests' platforms (the `arch` smoke check already proves each) and a post-push check with a documented delete step.
- **O6. "Changelog" means the GitHub release notes (D3).** No `CHANGELOG.md` file is written, because that would be a commit back to `main` (S5). The Navigator confirms or says otherwise.
- **O7. Manual setup outside this repository.** The repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (a token that can push), a Docker Hub repository `bbartolome/scriba` that is public (the installer pulls it anonymously), and a GitHub repository that allows the free `ubuntu-24.04-arm` runner (public; ASSUMED A6). None of this can be done or checked here; `docs/RELEASING.md` lists it.
- **O8. `publish.yml` does not wait for `ci.yml`.** Both start on a push to `main`. If branch protection requires CI on the pull request, the squashed commit was green before it merged (ASSUMED A6), but a red `main` could still publish an image that passed smoke. The spec asks for smoke only. Proposed: accept; the Navigator may ask for a CI-green gate.

## 7. Facts checked

### 7a. Checked in the repository (command or file and line)

- **F1.** `git log --oneline -1` was `22040f6` for revision 1 (`c061b08` for revision 2, `611843e` for revision 3; the files that differ outside `plans/` are listed in the first paragraph and none is cited here); `git status --short` was empty; `git remote -v` prints nothing; `git branch -a` lists `main` and `backup/PLT-16`. No `plans/PLT-19.md` existed; `ls plans` has PLT-01 to PLT-18 (not 19) and others.
- **F2.** `ls .github/workflows` is `ci.yml` only. `.github/workflows/ci.yml`: lines 2 to 6 triggers (`pull_request`, `push` to `main`); lines 7 and 8 `permissions: contents: read`; lines 13, 14 and 38 use `actions/checkout@v7`, `setup-node@v7`, `upload-artifact@v7`; line 16 `node-version-file: .nvmrc`; lines 33 to 35 set `SCRIBA_E2E_CHROMIUM` for the e2e step. No tag trigger.
- **F3.** `scripts/ci-workflow.test.mjs` lines 9 to 12 read only `ci.yml` (with the `CI_WORKFLOW_PATH` override); line 22 asserts one job in that file, so a multi-job `publish.yml` does not affect it. `package.json` line 25 `"test": "npm test --workspaces && node --test 'scripts/*.test.mjs'"`; line 26 `lint` ends with `prettier --check .`; line 40 `"yaml": "2.9.1"`. `.nvmrc` is `26`. `.prettierignore` ignores `/units/`, `/modules/`, `/plans/` and `/package-lock.json`, so `docs/`, `.github/`, `scripts/` and `.releaserc.json` are Prettier-checked. `eslint.config.mjs` lints `**/*.ts` only, so `.mjs` scripts are not ESLint-checked.
- **F4.** `Dockerfile`: line 28 `FROM node:26 AS build`; lines 30 and 31 `COPY . .` then `RUN npm ci`; lines 32 to 34 `ARG VERSION=0.0.0-dev`, `REVISION=dev`, `BUILT_AT=dev`; line 35 writes `build-info.ts`; line 50 `FROM node:26-slim AS runtime`; line 51 `WORKDIR /opt/scriba/app`; lines 52 to 56 Pandoc `.deb` and Typst; line 63 `USER 1000:1000`; line 64 the entrypoint. `.dockerignore` excludes `.git`, `node_modules`, `plans`, `units`, `modules`, `prompt.md`, `.claude`.
- **F5.** `scripts/build-image.sh` lines 9 to 11 hold the SEMVER, REVISION (`^[0-9a-f]{7,40}$`) and BUILT_AT regular expressions; lines 28 to 35 build `bbartolome/scriba:local-<arch>`; the file is executable (`ls -l`).
- **F6.** `scripts/entrypoint.sh`: line 3 `SETUP=true` branch; lines 6 to 8 read BUILD_INFO with `node -p`; lines 9 to 16 the pin rule (semver other than `0.0.0-dev`, else `sha-<revision>` for 7 to 40 hex, else exit 1); line 17 `sed "s|@@PIN@@|$PIN|g"`; lines 25 and 26 `REF=bbartolome/scriba:@@PIN@@` and `IMAGE_TAG=@@PIN@@`; the script ends with `cat installer-hint.txt </dev/null` then the heredoc terminator at line 347 and `exit 0`; the non-setup path ends with `exec node /opt/scriba/app/apps/api/dist/main.js`.
- **F7.** `apps/api/src/modules/platform/health.controller.ts` line 13 returns `{ status: 'ok', version: BUILD_INFO.version }`; `build-info.ts` lines 2 to 6 hold the dev defaults `0.0.0-dev`, `dev`, `dev`. `units/PLT-04-api-composition-root.md` line 24: `/healthz` is "unguarded forever (compose healthcheck and image smoke run before setup)".
- **F8.** `deploy/compose.yaml` line 40 `image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`; line 63 uses `node -e fetch('http://127.0.0.1:8080/healthz')` as the healthcheck, the same in-container probe the smoke uses. `README.md` line 28 is the one-liner `docker run --rm -e SETUP=true bbartolome/scriba | bash`. `deploy/RUNBOOK.md` line 87 is `## Pre-release checklist`.
- **F9.** The unit, the module file and `units/README.md` lines quoted in section 1a were read in this session (`units/PLT-19-publish-workflow.md` lines 14 to 45; `modules/platform.md` lines 30, 39, 51, 57 to 59; `units/README.md` lines 59 to 65 and 78).
- **F10.** `grep -rn PLT-19 units/ modules/` lists only: `units/CEX-15-export-gate-image-smoke.md` line 7 (`blocked_by`), `units/PLT-13` line 24, `units/PLT-18` line 9 (`unblocks: [PLT-19]`), `modules/platform.md` lines 20 and 30, `modules/compile-export.md` line 25, `units/README.md` line 78. `grep -rn ci-publish units/` finds only CEX-15 and the README table. GNP-05 (unit line 17) says "in Platform's image smoke".
- **F11.** `units/PLT-14-dockerfile-entrypoint.md` lines 36 and 40 (criteria 1 and 5) are `- [ ]`. The PLT-14 plan holds the smoke commands this plan reuses: lines 123 and 124 (Pandoc `3.13`, Typst `0.15.1` first lines), 130 and 132 (the `-w /tmp` PDF check, the `PK` check), the criterion 4 FTS5 command, criterion 2 (no mount exits 1; writable mount gives 200; the tmpfs `/books` run is noted at `plans/DECISIONS.md` line 785), lines 217 to 229 (downstream notes for PLT-19).
- **F12.** `plans/DECISIONS.md` lines 604 and 142 (criteria that cannot run without a remote; line 728 is the driver's own PLT-13 decision, not a precedent), 713, 757, 762, 774, 2383, 2605, 2606, 2775 and 2863 read as cited.
- **F13.** Tride (`/Users/bbartolome/workspace/tride/.github/workflows/publish.yml`, outside this repository, read for structure only): line 9 `tags: ['v*']`, line 10 `paths-ignore`, lines 27 to 97 the per-arch build by digest with `fail-fast: false`, lines 99 to 140 the merge with `docker buildx imagetools create` (line 135) and `inspect`, lines 144 onward the smoke job (dispenser `bash -n`, manifest platforms, files present). Tride has no semantic-release, so the plan and release jobs and the guard are new here.
- **F14.** `which docker jq act actionlint yamllint shellcheck` printed only `/usr/bin/docker` and `/usr/bin/jq`. `node -v` is `v26.13.0`. The planner did not run any of them beyond `which` and `node -v`.
- **F15.** `scripts/` today holds `boundaries.test.mjs`, `ci-workflow.test.mjs`, `examples-check.test.mjs`, `pins.test.mjs`, `pr-title.test.mjs`, `subpaths.test.mjs`, `web-proxy.test.mjs`, `build-image.sh`, `entrypoint.sh`, `check-pr-title.mjs` and the `examples-check/` folder; no file of this plan's names exists. `scripts/check-pr-title.mjs` line 4 holds the title pattern with an optional `!`.

### 7b. Assumed (not verified here)

- **A1 (ASSUMED). semantic-release behaviour (no network, no npm in this run).** (i) The newest version admits Node 26 (step 1 checks). (ii) `--dry-run` runs `verifyConditions`, `analyzeCommits`, `verifyRelease` and `generateNotes`, but no `prepare` or `publish`; and `verifyRelease` is not called when no release is due. (iii) The dry run still checks push access, so `plan` needs `contents: write`. (iv) The first release is `1.0.0`. (v) With the default angular preset, `feat` is minor, `fix` is patch, `perf` and `revert` are patch, other types do not release, a `BREAKING CHANGE:` footer is major, and `feat!:` is not parsed as a type. (vi) On a branch that is behind its remote, or on a branch other than `main`, it logs and exits 0 with no release. (vii) A relative plugin path such as `./scripts/release-guard.mjs` is resolved from the working folder, and an ESM plugin with a named `verifyRelease` export loads. (viii) The built-in plugins are found when semantic-release runs from `npx`, while an extra preset package would not be (O3). (ix) `@semantic-release/github` accepts `successComment`, `failComment`, `failTitle` and `releasedLabels` as `false`, and then needs only `contents: write`. (x) The tag is a lightweight tag on `HEAD`, so `git/ref/tags/<tag>` returns the commit SHA in `.object.sha`. (xi) `--no-ci` lets it run outside Actions in S-P2. S-P2 checks (ii), (iv), (v) and the guard; the rest wait for the first real run.
- **A2 (ASSUMED). `docker buildx imagetools create --dry-run`** exists, needs no `-t`, pushes nothing, and prints the merged index as JSON on stdout. Step 1(b) checks the flag; S-P1 checks the output if the registry is reachable.
- **A3 (ASSUMED). `imagetools` talks to a `localhost:<port>` registry over plain HTTP, and a `registry:2` container is reachable from the shell.** The shell may run in a container (`plans/PLT-14.md` line 159); S-P1 has a stop rule.
- **A4 (ASSUMED). GitHub-hosted runner facts.** `ubuntu-24.04-arm` exists and is free for a public repository (Tride relies on it, Tride line 37); the runner images have Docker with buildx, `gh` and `node`; a job whose `if` has no status function gets an implicit `success()`; a job whose `needs` failed is skipped; an expression `needs.plan.outputs.x` is a string.
- **A5 (ASSUMED). Actions versions.** `actions/checkout@v7`, `setup-node@v7` and `upload-artifact@v7` exist (they are the pins `ci.yml` already uses, lines 13, 14 and 38; this plan did not check them against GitHub). `actions/download-artifact@v7` is new to this repository and is ASSUMED to exist beside `upload-artifact@v7` until step 1(c) checks the tag. `docker/*` at `v3`/`v3`/`v6` work as in Tride; the newest majors may differ (step 1(c)).
- **A6 (ASSUMED). Repository settings.** The GitHub repository is public, has the two secrets, has a Docker Hub repository `bbartolome/scriba`, and requires CI on pull requests before merging.
- **A7 (ASSUMED). `docker run --tmpfs /books:rw,mode=1777`** gives UID 1000 a writable `/books` on a runner and on Docker Desktop. The PLT-14 reviewer used a tmpfs `/books` (`plans/DECISIONS.md` line 785); the exact option string is checked by S-P3.
- **A8 (ASSUMED). `provenance: false` with `push-by-digest=true`** pushes a plain image manifest (not an index), and `outputs.digest` is its digest.
- **A9 (ASSUMED). A tag pushed with `GITHUB_TOKEN` starts no workflow.** Stated by the unit (line 28); platform behaviour, not tested.
- **A10 (ASSUMED). The `size` check's compressed figure** (sum of `layers[].size` from `imagetools inspect --raw` on a single-platform digest) works on a runner after the image has been pulled by digest.
- **A11 (ASSUMED). Image facts unchanged since PLT-14:** `pandoc --version` starts with `pandoc 3.13`, `typst --version` starts with `typst 0.15.1`, `node:sqlite` has FTS5, `/healthz` answers on `127.0.0.1:8080` inside the container without a sidecar. These are PLT-14's measured results (F11); S-P3 re-checks them on a fresh build.
- **A12 (ASSUMED). Scripts and tests run under bash 3.2 and GNU bash 5** with `node`, `sort`, `head`, `grep`, `mktemp` on `PATH`; the stub `docker` is a shell script first on `PATH`.

## 8. Shared files

This plan changes no file that another unit of this batch (SAU-06, AGL-01, PST-02, PST-11, SHL-10, SHL-11, MPR-09, SHL-12, TRG-01) is expected to change. Those units are application code and contracts; this one adds only workflow, release, script and doc files.

- `.github/workflows/publish.yml` (new): only this unit writes it. A later unit, CEX-15, appends one step to the `smoke` job (section 5); that edit is additive and needs no change here.
- `package.json` and `package-lock.json`: not changed (D2). The new `scripts/*.test.mjs` files join the root `npm test` glob (`package.json` line 25) with no edit.
- `scripts/`: eight new files (`publish-plan.sh`, `publish-merge.sh`, `smoke-image.sh`, `release-guard.mjs`, `publish-test-kit.mjs`, and the three `*.test.mjs`). The names do not collide with existing files (F15). `scripts/entrypoint.sh`, `scripts/build-image.sh` and `scripts/check-pr-title.mjs` are read, not changed.
- `docs/RELEASING.md` (new) and `.releaserc.json` (new): only this unit.
- `README.md`, `deploy/RUNBOOK.md`, `deploy/compose.yaml`, `Dockerfile`, `.github/workflows/ci.yml`, `.prettierignore`, `.gitignore`, `.dockerignore`: not changed. The tests read `deploy/RUNBOOK.md` for one heading (`## Pre-release checklist`), so another unit may add rows to its table without effect.
- `plans/DECISIONS.md` and `units/PLT-19-publish-workflow.md`: not edited by this plan; the orchestrator records the review results and ticks the boxes by the rule of O1. The Navigator's rulings on O1 to O3 are in `plans/DECISIONS.md` (commit `611843e`) and are applied in this revision; nothing else in section 8 changes.
- Prettier: `npm run lint` runs `prettier --check .`, so the new `.yml`, `.json`, `.md` and `.mjs` files must be formatted (step 7). Any unit that adds a file under `scripts/` or `docs/` has the same duty; there is no conflict.
