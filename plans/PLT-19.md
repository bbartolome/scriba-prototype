---
id: PLT-19
status: draft
---
# PLT-19 plan — publish.yml: plan, native multi-arch build, smoke, merge, release

Batch: [PLT-19] (Platform, phase:ci-publish, M1 release track). **Revision 7, the Opus rewrite** under `prompt.md` lines 99 to 101 (four rejections whose open problems are errors of fact and wording), as recorded in `plans/DECISIONS.md` "2026-11-14 — PLT-19 — four rejections: examination of the open problems" (line 3285). It is written from revision 6 (`68d6179`) and the four Opus reviews: revision 1 (`plans/DECISIONS.md` line 2932, nine items), revision 3 (line 3154, ten items), revision 5 (line 3223, four items) and revision 6 (line 3276, four items). The Navigator's rulings are applied unchanged: O1, O2 and O3 (line 3120, commit `611843e`) and the cancelled pending run, D10, option (a) (line 3203, commit `6aed752`; option (b) rejected at line 3207). Those rulings cite line numbers of revisions 4 and 5 of this file; in this revision the same text is in D10, section 4.1 (the tick rule and the known-limit paragraph) and step 6.

Base: `main` at `c0c7863`. `git diff --name-only 611843e c0c7863 -- . ':!plans'` prints nothing, so every non-plan file cited here reads as it did when the Navigator ruled; `git diff --name-only 68d6179 c0c7863` (the commits since revision 6) lists only `plans/DECISIONS.md`, `plans/MPR-09.md`, `plans/SHL-10.md` and `plans/SHL-12.md`. The rewriter ran no Docker, npm, GitHub or project test command, so every statement about those tools is either read from a file or a scratch run named in section 7a, or labelled ASSUMED (section 7b). Merging this unit closes `phase:ci-publish` (`units/README.md` line 78; unit line 14).

Reading guide: sections 1 to 7 follow `plans/PLT-02.md`; section 8 lists the files shared with other units. The code stage is for a Haiku subagent, so section 3 gives the exact commands, the YAML and the checks.

### Revision 7: where each item of the revision-6 review stands

Each item was checked against the repository before it was fixed; in all four the repository agrees with the review (column 3). Line numbers of revision 6 are those of `68d6179`.

| Review, item | Problem | Repository check | Where revision 7 answers it |
|---|---|---|---|
| **r6.1** | MU14 copies only `docs/RELEASING.md`; W11 did not say what `../deploy/RUNBOOK.md` is resolved against; resolved against `RELEASING_PATH`, W11 fails twice in MU14 | Agrees: revision 6 W11 (line 504) and MU14 (line 528) name no base; the runbook exists only at the repository path `deploy/RUNBOOK.md` (heading at line 87), so `$M/../deploy/RUNBOOK.md` does not exist | **Fixed.** W11 (4.6) and 4.8: the runbook is always read at the repository path `deploy/RUNBOOK.md`, resolved from the test file's folder (`join(here, '..', 'deploy', 'RUNBOOK.md')`, as `scripts/ci-workflow.test.mjs` lines 8 to 12 resolve `ci.yml`), never relative to `RELEASING_PATH`, and it has no override variable; the link is checked as text in the doc. MU14 (4.7): the runbook check passes on the real file and only the `BREAKING CHANGE:` assertion fails, with a message that names it. Section 8 says the same |
| **r6.2** | W7 was two rows; a "W7 (triggers)" test reads only `ci.yml` at the red stage and passes, so step 2's "every test fails" stops the run | Agrees: `.github/workflows/` holds only `ci.yml`, and its triggers (`ci.yml` lines 2 to 6: `pull_request`, and `push` with `branches: [main]`) satisfy W7's trigger rules | **Fixed.** W7 is one `node:test` test with two parts (one row in 4.6; 4.8). Every id of 4.8 is exactly one top-level `test`, and no file under test is read or imported outside a test body (4.8), so each of the 41 tests fails at the red stage (step 2). W10 is stated to read `publish.yml` only, because a W10 that read the workflow folder would also pass on `ci.yml` alone |
| **r6.3** | Step 0 could open an existing `unit/PLT-19` but gave no point to resume from | Agrees: `prompt.md` line 78 ("If it exists, the subagent continues from its commits") and line 7 (uncommitted work is lost); `git branch --list unit/PLT-19` prints nothing today | **Fixed.** D21 and step 0 "Resume point": no commit, start at step 1; the red commit only, run step 1 again (it writes no file; step 5 needs `<PIN>`), then resume at step 3; the feat commit (and any later `PLT-19` fix commits), resume at step 8 with `<PIN>` read from the committed workflow, and step 12 makes no commit; any other history, stop and report |
| **r6.4** | 4.1 said the Navigator rejected both "no concurrency group" and "a per-commit group" | Agrees: `plans/DECISIONS.md` line 3207 rejects only option (b), the per-commit group | **Fixed.** The known-limit paragraph of 4.1 now says that option (b), a per-commit group, was rejected by the Navigator (line 3207), and that no group at all has the same flaw; D10 says the same and cites line 3207 |

Corrections the rewrite also made against the repository (none reopens a ruling):

- **R7-a.** Node 26's default test reporter prints `ℹ fail 0`, not `# fail 0`, and no `not ok` lines; checked on two scratch test files with `node v26.13.0` (F17). Steps 2, 8 and 10 now run `node --test --test-reporter=tap …`, so the TAP lines they expect (`not ok`, `# pass 0`, `# fail 0`) are printed. `npm test` (step 9) is judged by its exit code only.
- **R7-b.** Section 8 cited `plans/SHL-12.md` lines 101 and 112 for SHL-12's `package-lock.json` change; SHL-12 revision 6 (`952411a`) moved those rows to lines 104 and 115.
- **R7-c.** F1 is re-read at `c0c7863`: four unit branches with worktrees now exist (`unit/AGL-01`, `unit/PST-02`, `unit/PST-11`, `unit/SAU-06`); `unit/PLT-19` does not.

### Earlier review items (reviews 1, 3 and 5), kept in revision 7

Where a review item and revision 5 disagreed, the repository was read; in all four items of the revision-5 review the repository agrees with the review (named per item below). Revision 7 keeps every fix in this table.

| Review, item | Problem | Where it stands |
|---|---|---|
| r1.1 [NAVIGATOR] | default for criteria 1 to 4 | Closed by the Navigator (`611843e`); O1; tick rules in 4.1, 4.2, 4.4; criterion 3 decision in 4.3 |
| r1.2 [NAVIGATOR] | the `conventionalcommits` preset | Closed (`611843e`), option (a); O3 |
| r1.3 [NAVIGATOR] | first version | Closed (`611843e`), `1.0.0`; O2; W11 |
| r1.4 | S-P1 case D tested the count rule | Second build differs (`LABEL plt19=b`); distinct digests and two files asserted (S-P1) |
| r1.5 | "every `docker run` passes `--rm`" | The `healthz` exception is stated (section 2) and K10 checks its removal |
| r1.6 | cancelled pending run | D10, 4.1 known-limit paragraph, step 6; accepted by the Navigator (`6aed752`) |
| r1.7 | S17 wording | "only CEX-15 is blocked by PLT-19" (S17, F10) |
| r1.8 | `download-artifact@v7` unchecked | Step 1(c); A5 |
| r1.9 | stale base | Base is `c0c7863` (above; F1) |
| r3.1 | job wiring untested | W12 (i) to (viii); MU11 to MU13, MU15, MU16; W12 and W2 listed under criteria 1 and 2 |
| r3.2 | S-P2 (a, b) were dry runs only | Row S-P2 (a, b, d); `publish-plan.sh` runs after each dry run |
| r3.3 | no S-P1 (B) row | Row in 4.2 |
| r3.4 | no real stand-in for the manifest check | M4 and S-P1 (A) under criterion 4 |
| r3.5 | step 0 without Docker | Step 0: skip 1(b), run S-P2, S-P1 and S-P3 NOT RUN, still commit |
| r3.6 | W7 too narrow | W7 forbids `create`, `release`, `workflow_run`, and a `push` without `branches`; MU2, MU2b, MU2c, MU2d |
| r3.7 | MU3 duplicate `if:`; MU2 without `WORKFLOWS_DIR` | MU3 edits the existing `if:`; MU2 sets both variables |
| r3.8 | W11 checked neither `1.0.0` nor the footer | W11; MU14; step 6 |
| r3.9 | citations in S8 and S14 | S8 cites DECISIONS lines 604, 2605, 2775; S14 cites `status: done` |
| r3.10 [NAVIGATOR] | D10 shortfall vs. the tick | Ruled by the Navigator (`6aed752`), option (a) |
| **r5.1** | MU2b and MU2c reused MU2's folder | **Fixed:** every mutant is made in its own fresh `mktemp -d` folder from the original files (step 10, 4.7). Repository: step 10 already required one copy per mutant |
| **r5.2** | M4 row of criterion 4 said "no create call" | **Fixed:** "no create call without `--dry-run`" (4.4). Repository: `publish-merge.sh` step 2 always makes the `--dry-run` call first (section 2) |
| **r5.3** | W12 did not check the digest's source or `PLATFORM_PAIR` | **Fixed:** W12 (vii) and (viii); MU15 and MU16. Repository: the `Export the digest` step reads `steps.build.outputs.digest`, and both `Prepare` steps write `PLATFORM_PAIR` (section 2 YAML) |
| **r5.4** | D6 claimed the same three patterns as `build-image.sh` | **Fixed:** D6. Repository: `scripts/build-image.sh` line 9 allows `+build`; `scripts/entrypoint.sh` line 9 does not; lines 10 and 11 are used unchanged |

All 27 items are addressed: the 19 of reviews 1 and 3 were fixed in revisions 2 to 5, the 4 of review 5 in revision 6, and all are kept; the 4 of review 6 are fixed in revision 7 (table above). Revision 6 also corrected these errors found against the repository (none reopens a ruling; all are kept):

- **R6-a.** W1's sample path `examples/nonfiction/sample.md` would fail `npm run lint`: the examples check (PLT-20) flags any line of a `*.test.mjs` file that names `examples/` (`scripts/examples-check/m1.mjs` lines 25, 30 and 201 to 229; run by `lint:examples`, `package.json` lines 26 and 27). The sample is removed (it tested nothing that `packages/packs/src/x.md` does not) and 4.8 states the rule.
- **R6-b.** Step 0 now works in a git worktree on `unit/PLT-19` and runs `npm ci` (`prompt.md` lines 78 and 79), instead of `git switch -c` in the main checkout.
- **R6-c.** D18's reason is restated: today no Markdown is tracked under `examples/` or `packages/packs/` (`git ls-files` lists only `examples/.gitkeep` and no `.md` under `packages/packs`); `deploy/RUNBOOK.md` ships now (Dockerfile line 60), and PST-11 adds Markdown under `examples/` (`units/PST-11-nonfiction-sample-skeleton.md` line 20; `plans/PST-11.md` lines 53 to 59), which ships at Dockerfile line 59.
- **R6-d.** Section 5 (GNP-05) said `smoke-image.sh` adds no `--user`; the `size` check runs as `--user 0` (D14). Corrected.
- **R6-e.** Section 5 said SAU-10, SAU-16 and SAU-08 quote the one-liner; only `units/SAU-10-compose-version-status.md` line 21 quotes it; SAU-08 line 33 and SAU-16 line 24 name it. Corrected.
- **R6-f.** W4 forbade the text ` -t ` in the `smoke` job, which would break an additive CEX-15 step that passes `-t` to any tool (D12). W4 now forbids `imagetools create`, `docker push` and `docker tag`.
- **R6-g.** S16 cited `modules/platform.md` line 58 ("Vitest everywhere") as support for `node:test`; the repository rule for root-owned script tests is `node:test` (`plans/DECISIONS.md` line 35, PLT-01; `plans/PLT-10.md` line 19). S16 now says so.
- **R6-h.** `grep -rn ci-publish units/` also lists `units/README.md` line 78 and this unit's own file (F10, section 5).
- **R6-i.** S-P1 now checks that each computed digest resolves in the registry before it is used.
- **R6-j.** D17 fixes the Docker action majors at Tride's; step 1(c) checks that those tags exist (revision 5 left "unless newer majors" open).
- **R6-k.** `plans/PLT-18.md` line 194 says "the README rollback example uses a semver tag"; `README.md` lines 51 to 58 name no fixed tag ("Set `SCRIBA_IMAGE_TAG` in `.env` to the older tag"). The repository decides: no README change follows from O2 (section 5).
- **R6-l.** O4 to O8 are marked as needing no Navigator decision, as the revision-1 review (item 3) found.
- **R6-m.** F14: `which` now finds `docker`, `jq`, `gh`, `npx`, `curl` and `sha256sum`, and none of `act`, `actionlint`, `yamllint`, `shellcheck`.

## 1. Decisions this plan follows

### 1a. Settled decisions (obeyed, not reopened)

- **S1. One workflow file with two triggers.** `.github/workflows/publish.yml`, "following Tride's structure, extended"; push to `main` with `paths-ignore` for docs-only changes, plus `workflow_dispatch`. Source: unit line 20; `modules/platform.md` line 59 (Tride is reference for structure only). Tride's `tags: ['v*']` trigger (Tride `publish.yml` line 9) is NOT carried over, because of S5 and criterion 5.
- **S2. Five jobs in order: `plan`, `build`, `smoke`, `merge`, `release`.** plan = semantic-release dry run (release or not, which version); build = native matrix `ubuntu-24.04` (amd64) and `ubuntu-24.04-arm` (arm64), push by digest, version as build arg, per-arch GHA cache; smoke = per arch, against the digest; merge = manifest list tagged `latest`, `sha-<short>`, and semver only when `plan` says so; release = real semantic-release (git tag, GitHub release, changelog). Source: unit lines 21 to 26.
- **S3. `latest` and `sha-<short>` on every publishing push whose run is not cancelled while pending (D10); only the semver tag depends on `plan`.** Source: unit line 25 (the reading recorded in `plans/DECISIONS.md` line 2383) and criterion 1 (unit line 41).
- **S4. Docker Hub credentials come from repository secrets.** Source: unit line 27.
- **S5. No tag push is relied on; no PAT; no GitHub App.** The semver image publish runs inside the same workflow as the release; the image is tagged before the git tag exists; semantic-release does not commit back to `main`; the version lives in the tag and the image, not in `package.json`. Source: unit line 28; `modules/platform.md` line 39.
- **S6. The smoke list.** Dispenser output passes `bash -n` with only the script on stdout; the merged manifest lists `linux/amd64` and `linux/arm64`; `pandoc --version` reports 3.13 and `typst --version` runs; a tiny Markdown file converts to DOCX, EPUB and PDF (via Typst) inside the image; `docker run` with no sidecar returns 200 from `/healthz`; an FTS5 `MATCH` through `node:sqlite` returns a row; image size is measured and reported. Source: unit lines 30 to 36.
- **S7. A pre-release checklist links the ST runbook (PLT-16), and a semantic-release config file sits at the repo root.** Source: unit lines 37 and 38; `plans/PLT-16.md` line 231 (PLT-16 provides `deploy/RUNBOOK.md` for this link).
- **S8. The five acceptance criteria are kept word for word.** Source: unit lines 41 to 45; `prompt.md` lines 136 and 138 to 144 (no criterion weakened; a criterion that cannot run here gets a local procedure from the Navigator, or the Navigator rules the unit complete without it and the box stays unticked); precedents `plans/DECISIONS.md` lines 604 (PLT-11), 2605 (PLT-17 O3) and 2775 (PLT-18 P10).
- **S9. Pandoc runs from a writable folder.** Pandoc 3.13 writes `./media-<hash>` into the current folder when it makes a PDF through Typst, and the image's WORKDIR `/opt/scriba/app` (Dockerfile line 51) is root-owned, so the convert smoke runs with `-w /tmp`. Source: `plans/DECISIONS.md` line 757; `plans/PLT-14.md` line 229.
- **S10. The no-sidecar `/healthz` run needs a writable `/books`.** Without one the container exits 1 on the app-state check. Source: `plans/PLT-14.md` line 228 ("PLT-19 must add the mount"); `/healthz` is unguarded forever so smoke can call it before setup (`units/PLT-04-api-composition-root.md` line 24; `apps/api/src/modules/platform/health.controller.ts` line 8).
- **S11. A non-release build bakes `VERSION=0.0.0-dev`, which is not a pullable tag; the dispenser then pins `sha-<revision>`.** Source: `plans/DECISIONS.md` line 774; `plans/PLT-14.md` line 225; `plans/PLT-17.md` line 44 (D3) and line 187 (O1, which asks this unit to confirm the tag side).
- **S12. REVISION is the same short SHA as the `sha-<short>` tag.** Source: `plans/PLT-17.md` line 244 (A10).
- **S13. This unit passes validated build-arg values** (the Dockerfile writes `build-info.ts` with `printf`, line 35, and does not validate). Source: `plans/PLT-14.md` line 278 (open point 7).
- **S14. The Dockerfile is not changed.** `ARG VERSION/REVISION/BUILT_AT` already sit just before the `build-info.ts` write (Dockerfile lines 32 to 35), as `plans/DECISIONS.md` line 762 asked. PLT-14 and PLT-15 are closed: `plans/PLT-14.md` and `plans/PLT-15.md` have `status: done`. The release track (PLT-14 to PLT-19) touches only Platform-owned files: `Dockerfile`, `deploy/` and `.github/workflows/publish.yml` (`modules/platform.md` line 30).
- **S15. No auto-update, no Watchtower, no "update available" notice.** Source: `modules/platform.md` line 51.
- **S16. Tests exercise external behaviour only, with `node:test` for root-owned scripts.** Here that means the workflow file as parsed YAML, the emitted output and exit codes of the scripts, and the calls the scripts make to a stub `docker`. Source: `modules/platform.md` line 57. `modules/platform.md` line 58 says "Vitest everywhere"; the workspaces use Vitest, while tests owned by the repo root use `node:test` and run from the root `test` script (`plans/DECISIONS.md` line 35, the Navigator's PLT-01 decision; `plans/PLT-10.md` line 19; `package.json` line 25 `node --test 'scripts/*.test.mjs'`; `scripts/ci-workflow.test.mjs` is the precedent for workflow tests).
- **S17. Blocker notation.** `blocked_by: [PLT-18]` stays; `unblocks` is the exact inverse. Only CEX-15 is blocked by PLT-19: `units/CEX-15-export-gate-image-smoke.md` line 7 is the only `blocked_by` that names it. `units/PLT-13-playwright-harness-e2e.md` line 24 mentions PLT-19 in prose and `units/PLT-18-update-rerun-rollback.md` line 9 lists it in PLT-18's own `unblocks`. That matches `unblocks: ["Compile & export export gate (CEX-15)"]`. Source: `units/README.md` line 64.

### 1b. Smaller decisions this plan makes (the simplest option, each with its reason)

- **D1. The logic lives in four scripts, and the YAML only calls them.** `scripts/publish-plan.sh`, `scripts/publish-merge.sh`, `scripts/smoke-image.sh` and the semantic-release plugin `scripts/release-guard.mjs`. Reason: a script can be run in `npm test` against a stub `docker` and by hand against real images; inline YAML shell cannot. Same pattern as `scripts/build-image.sh` and `scripts/entrypoint.sh`. The shell scripts are bash 3.2 compatible (no `mapfile`, no associative arrays, no empty-array expansion under `set -u`), because the tests also run on a Mac.
- **D2. semantic-release runs as `npx --yes "semantic-release@<pin>"`, not as a repo dependency.** The pin is one exact version in the workflow `env` (`SEMANTIC_RELEASE_VERSION`). Reason: `package.json` and `package-lock.json` are shared by every unit and stay untouched; the `plan` and `release` jobs need no `npm ci`; the three plugins used are dependencies of semantic-release itself (ASSUMED A1 viii). Cost: the version is not in the lockfile (O4).
- **D3. `.releaserc.json` holds only `branches: ["main"]`, `tagFormat: "v${version}"`, and four plugins:** `@semantic-release/commit-analyzer` and `@semantic-release/release-notes-generator` (default presets), `./scripts/release-guard.mjs` (D4), and `@semantic-release/github` with `successComment`, `failComment`, `failTitle` and `releasedLabels` all `false`. No `@semantic-release/npm`, `git`, `changelog` or `exec`. Reasons: S5 (no commit back; no `package.json` version); with those options `false` the token needs only `contents: write` (ASSUMED A1 ix). "Changelog" in unit line 26 is read as the GitHub release notes that the release-notes generator writes; a `CHANGELOG.md` would need a commit back, which unit line 28 excludes (O6).
- **D4. `scripts/release-guard.mjs` is a local plugin with one lifecycle function, `verifyRelease(pluginConfig, context)`.** It writes `context.nextRelease.version` plus a newline to the file named by `SCRIBA_PLAN_OUT` (if set), and throws when `SCRIBA_EXPECT_VERSION` is set and differs from `context.nextRelease.version` (it then writes no file). The dry run in `plan` uses the first role (a machine-readable version, instead of parsing log text). The real run in `release` uses the second (the version it tags must be the version already in the image; it throws before any tag exists). `verifyRelease` is not called when no release is due (ASSUMED A1 ii), so a missing output file means "no release".
- **D5. Non-release builds bake `VERSION=0.0.0-dev` and the pin is `sha-<short>`; release builds bake the semver and the pin is the semver.** This answers `plans/PLT-17.md` O1 (line 187) (a), (b) and (c): (a) `sha-<short>` is tagged on every publishing push whose run is not cancelled while pending (D10), and the pin of any published image always exists; (b) REVISION and the tag use one value (D6); (c) the VERSION is exactly `0.0.0-dev`, which the dispenser (`scripts/entrypoint.sh` lines 9 to 16) turns into `sha-<revision>`. Another dev string (for example with `+sha`) fails the dispenser's semver test at line 9, which has no `+build` part. The `dispenser` smoke check asserts the printed `REF=` line equals `bbartolome/scriba:<pin>`, so a wrong pin fails before any tag is pushed.
- **D6. `short` is the first 7 characters of `GITHUB_SHA`, computed once in `plan`.** It is the REVISION build arg and the tag suffix. `BUILT_AT` is also computed once in `plan` (UTC, `YYYY-MM-DDTHH:MM:SSZ`), so both arch builds carry the same values. `publish-plan.sh` checks `GITHUB_SHA` with the REVISION pattern of `scripts/build-image.sh` line 10 (`^[0-9a-f]{7,40}$`) and `BUILT_AT` with the pattern of line 11, unchanged. It checks the version with the semver pattern of line 9 **without its `(\+[0-9A-Za-z.-]+)?` build part**: `scripts/entrypoint.sh` line 9 (`^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$`) does not accept `+build`, and a `+` is not valid in a Docker tag. Every version the stricter pattern accepts also passes the dispenser's test, so the dispenser pins the semver (S13).
- **D7. No `docker/metadata-action`, and no OCI labels.** Tags are computed in shell (`publish-merge.sh`). Reason: `plans/PLT-14.md` line 256 says the version has one source (`build-info.js`), and metadata-action would add a second tag-computing path.
- **D8. `provenance: false` on the build step.** The pushed digest is then a plain image manifest, not an index with attestation entries, so the merge check sees exactly two platforms and the size check reads the layers from the digest (ASSUMED A8).
- **D9. `merge` and `release` run only when `github.ref == 'refs/heads/main'`.** A `workflow_dispatch` from another branch still builds and smokes both arches natively (the native amd64 proof that `plans/PLT-14.md` line 217 waits for), but pushes only untagged digests; it can never move `latest`.
- **D10. `concurrency: {group: publish-${{ github.ref }}, cancel-in-progress: false}`.** Runs for one ref are serialised. Reason: a later run must see the git tag the earlier run created, or the two runs would plan the same version. **Known limit:** GitHub keeps at most one pending run per concurrency group (ASSUMED A4), so when a third push arrives while one run is in progress and one is pending, the pending run is cancelled and never starts. The commit of the cancelled run gets no `sha-<short>` tag; the newest pending run still publishes `latest`, and its `plan` counts every commit since the last git tag, so no release is lost and the version is still right. It does not break the dispenser pin: an image always has the tag its own `REVISION` names, because the pin is read from the image that was published. This is a shortfall against criterion 1 for the cancelled push. **Accepted by the Navigator as a recorded limit** (`plans/DECISIONS.md` line 3203, "the Navigator's decision on the cancelled pending run (D10 …): option (a)", commit `6aed752`): criterion 1 is ticked on the stand-ins by the tick rule of 4.1, with the limit recorded here, in the known-limit paragraph of 4.1 and in `docs/RELEASING.md` (step 6; W11). The unit's criterion text is unchanged. Option (b), a per-commit group, was rejected by the Navigator (`plans/DECISIONS.md` line 3207); no group at all has the same flaw, since it too lets two runs on one ref run at once.
- **D11. The manifest check (smoke list, unit line 31) runs inside `merge`, before any tag is pushed.** `docker buildx imagetools create --dry-run <the two digests>` prints the merged index without pushing (ASSUMED A2); `publish-merge.sh` requires exactly `linux/amd64` and `linux/arm64` in it (entries with `os` `unknown` are ignored), and only then runs the real `create` with all tags in one command. A check after the push would leave tags behind on failure, which criterion 3 forbids. The final `imagetools inspect` is informational. See O5.
- **D12. The `smoke` job exposes `SMOKE_IMAGE` (the digest reference) to later steps, and `merge` depends on `smoke`.** Reason: Compile & export adds an app-level export step here, additively (unit line 14; `units/CEX-15-export-gate-image-smoke.md` lines 17 and 22), and GNP-05 may add its pack check the same way (`units/GNP-05-core-gate.md` line 17). The tests assert the required steps, their order and their wiring, never an exact step list, and forbid no text that a reasonable added step could contain (R6-f).
- **D13. Smoke script interface.** `scripts/smoke-image.sh <image-ref>`; required env `EXPECTED_VERSION` and `EXPECTED_PIN`; optional `EXPECTED_ARCH` (Node's `process.arch`: `x64` or `arm64`), `SMOKE_POLLS` (default 60), `SMOKE_POLL_SLEEP` (default 1), `GITHUB_STEP_SUMMARY`. A missing argument or required variable exits 2 with a usage line on stderr and no `docker` call. Otherwise it runs every check even after a failure, prints one `PASS <name>: <detail>` or `FAIL <name>: <reason>` line each, and exits 1 if any check failed. Check names: `dispenser`, `pandoc`, `typst`, `convert`, `healthz`, `fts5`, `size`, and `arch` (only when `EXPECTED_ARCH` is set). The `arch` check is not in the unit's list; it proves each digest really is the platform of the runner that built it, which the native claim of criterion 4 and PLT-14 criterion 5 rest on.
- **D14. Size is reported, not gated** (`plans/PLT-14.md` open point 2, line 273, leaves the story-26 target open). Unpacked: `docker run --rm --user 0 --entrypoint sh <ref> -c 'du -sxk / | tail -n 1'` (KiB, the PLT-14 measure, `plans/PLT-14.md` line 127). Compressed: the sum of `layers[].size` from `docker buildx imagetools inspect --raw <ref>`; it prints `n/a` when the reference is not in a registry (a local image) or the call fails. The check fails only when the unpacked size cannot be measured. This is the only check that runs as root.
- **D15. Permissions.** Workflow level `contents: read`; `plan` and `release` have `contents: write` (semantic-release checks push access even on a dry run, ASSUMED A1 iii; the release pushes the tag and creates the release); nothing else is granted anywhere.
- **D16. Secret names are `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`**, the names Tride uses (Tride `publish.yml` lines 70 and 71). The only other secret is the built-in `GITHUB_TOKEN`.
- **D17. Action versions.** `actions/checkout@v7`, `actions/setup-node@v7` and `actions/upload-artifact@v7` are the pins `ci.yml` already uses (lines 13, 14, 38). `actions/download-artifact@v7` is new to this repository and is checked in step 1(c) (A5); it must have the same major as `upload-artifact`. Docker actions at Tride's majors: `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/build-push-action@v6` (Tride lines 61, 68, 75); step 1(c) checks that these tags exist and records the newest releases, but does not move to a newer major. Every `uses:` is pinned to a major tag, never `@main`.
- **D18. `paths-ignore` is an explicit list, not `**/*.md`:** `README.md`, `LICENSE`, `.gitignore`, `docs/**`, `modules/**`, `plans/**`, `units/**`. Reason: Markdown that ships in the image must trigger a publish. `deploy/RUNBOOK.md` ships today (Dockerfile line 60 copies `deploy/` to `/opt/installer`), and PST-11 adds Markdown under `examples/` (unit line 20; its plan lines 53 to 59), which ships at Dockerfile line 59; `packages/packs/` ships at line 58. None of the listed paths reaches the runtime stage (Dockerfile lines 57 to 61 copy only the build output, `packages/packs`, `examples`, `deploy` and the entrypoint; `.dockerignore` excludes `plans`, `units`, `modules`). The patterns are anchored at the repo root, so `modules/**` does not match `apps/api/src/modules/…`. A releasable commit that touches only ignored paths starts no run; its release is made by the next publishing push, whose `plan` counts every commit since the last tag.
- **D19. The checklist is `docs/RELEASING.md`** (new). It links `../deploy/RUNBOOK.md#pre-release-checklist` (the heading is `deploy/RUNBOOK.md` line 87) and also explains the secrets, the first-release version (`1.0.0`, O2), the breaking-change footer and the `!` limit (O3), the known limit of a cancelled pending run (D10) and recovery from a failed run (step 6). `README.md` and `deploy/RUNBOOK.md` are not edited (section 8).
- **D20. Tests are `node:test` files under `scripts/`**, picked up by the root `npm test` with no change to `package.json` (line 25). They use the `yaml` devDependency already installed (`package.json` line 40) and path-override env variables for the mutation checks, as `scripts/ci-workflow.test.mjs` does with `CI_WORKFLOW_PATH` (lines 9 to 12). They need no Docker, network or GitHub. Each id is exactly one top-level `test` (41 in all, 4.8), and each test's name starts with its id (`W2 …`, `M4 …`, `K10 …`), so the TAP output names a failing test.
- **D21. Two commits, and the resume rule.** The implementer commits twice on `unit/PLT-19`, each subject with `PLT-19` (`prompt.md` line 82): the red tests (step 2) and the rest (step 12). A session can stop at any step and only committed work survives (`prompt.md` line 7), so a later session finds one of three histories on the branch: no commit, the red commit only, or the feat commit (possibly followed by `PLT-19` fix commits that the driver asked for after a review or a failing check, `prompt.md` lines 97 and 112). Step 0 maps each to the step to resume at, and a committed step is never done again (`prompt.md` line 78: "If it exists, the subagent continues from its commits"). Any other history stops the run with a report.

## 2. Files to create or change

Only the paths below change. Nothing in `package.json`, `package-lock.json`, `Dockerfile`, `scripts/build-image.sh`, `scripts/entrypoint.sh`, `deploy/`, `README.md`, `.prettierignore` or `.github/workflows/ci.yml` changes. The three shell scripts are mode 0755 like `scripts/build-image.sh`.

| Path | Change | Purpose |
|---|---|---|
| `.github/workflows/publish.yml` | new | the five jobs (the YAML below) |
| `.releaserc.json` | new | semantic-release config at the root (D3) |
| `scripts/release-guard.mjs` | new | the local plugin (D4) |
| `scripts/publish-plan.sh` | new | reads the plugin's output file; prints `release`, `version`, `pin`, `short`, `built_at` as `key=value` lines for `$GITHUB_OUTPUT` |
| `scripts/publish-merge.sh` | new | digest folder in; manifest check; tags; one `imagetools create` |
| `scripts/smoke-image.sh` | new | the per-arch checks (D13, D14) |
| `docs/RELEASING.md` | new | pre-release checklist and release notes for the maintainer (D19) |
| `scripts/publish-workflow.test.mjs` | new | static tests W1 to W12 |
| `scripts/publish-scripts.test.mjs` | new | tests for `publish-plan.sh` (P), `publish-merge.sh` (M) and the plugin (G) |
| `scripts/smoke-image.test.mjs` | new | tests K1 to K13 for the smoke script against a stub `docker` |
| `scripts/publish-test-kit.mjs` | new | helper (not `*.test.mjs`, so neither the test glob nor the examples check picks it up): builds the stub `docker` on a temp `PATH` and records its calls |

### The scripts, exactly

**`scripts/publish-plan.sh <next-version-file>`** (`set -euo pipefail`). Requires `GITHUB_SHA` matching `^[0-9a-f]{7,40}$` (`scripts/build-image.sh` line 10), else exit 1. `BUILT_AT` defaults to `date -u +%Y-%m-%dT%H:%M:%SZ` and must match `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$` (line 11). If the file does not exist: `release=false`, `version=0.0.0-dev`, `pin=sha-<short>`. If it exists: it must hold exactly one line that matches `^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$` (line 9 without the `+build` part, D6; no `v`), else exit 1; then `release=true`, `version=<it>`, `pin=<it>`. On any error: a message on stderr, nothing on stdout. On success stdout is exactly five lines in this order: `release=`, `version=`, `pin=`, `short=` (first 7 characters of `GITHUB_SHA`), `built_at=`.

**`scripts/publish-merge.sh <digests-dir>`** (`set -euo pipefail`). Env: `REGISTRY_IMAGE` (required, `^[a-z0-9._:/-]+$`), `SHORT` (required, `^[0-9a-f]{7,40}$`), `RELEASE` (`true` or `false`), `VERSION` (required and checked with the D6 semver pattern when `RELEASE=true`, ignored otherwise). Every validation error exits 1 before any `docker` call. Then:
1. Each entry of the folder must be named by 64 lowercase hex characters (a digest without `sha256:`); there must be exactly two. Reference list `refs`: `"$REGISTRY_IMAGE@sha256:<digest>"` for each.
2. `manifest=$(docker buildx imagetools create --dry-run "${refs[@]}")`. If it exits non-zero, exit 1. This call is always made first, before any create without `--dry-run`.
3. Pipe `manifest` into `node -e` (no `jq`), which computes `(m.manifests||[]).map(x=>x.platform).filter(p=>p&&p.os!=='unknown').map(p=>p.os+'/'+p.architecture).sort()`; it must equal `["linux/amd64","linux/arm64"]`; otherwise print the platforms found to stderr and exit 1. No tag has been pushed yet.
4. `docker buildx imagetools create -t "$REGISTRY_IMAGE:latest" -t "$REGISTRY_IMAGE:sha-$SHORT"` plus `-t "$REGISTRY_IMAGE:$VERSION"` only when `RELEASE=true`, then `"${refs[@]}"`. Exactly one such call.
5. `docker buildx imagetools inspect "$REGISTRY_IMAGE:sha-$SHORT"` for the log; a failure here only prints a warning.

**`scripts/smoke-image.sh <image-ref>`.** `set -uo pipefail` (no `-e`: every check runs). Its working files go in `mktemp -d`; the container name is `scriba-smoke-$$`; a `trap` on `EXIT` removes the folder and runs `docker rm -f` on the container. Each check is a function whose stdout is its detail on success and its reason on failure; a runner prints `PASS <name>: <detail>` or `FAIL <name>: <reason>` and counts failures. Every `docker run` passes `--rm` except one: the `healthz` container runs with `-d` and no `--rm`, so that `docker logs` still works after the app has crashed; the `trap` removes it on every exit path (K10 checks the call). Only the `size` check passes `--user 0`; every other check runs as the image's UID 1000 (Dockerfile line 63). The checks:
- `dispenser`: `docker run --rm -e SETUP=true "$REF" > "$tmp/boot.sh"` exits 0; the first line is `#!/usr/bin/env bash` (the first line of the heredoc, `scripts/entrypoint.sh` line 18, so no byte comes before the script); `bash -n "$tmp/boot.sh"` passes; the file has a line exactly `REF=bbartolome/scriba:$EXPECTED_PIN` and a line exactly `IMAGE_TAG=$EXPECTED_PIN` (`scripts/entrypoint.sh` lines 25 and 26 after the `sed` of line 17). Stderr is not asserted (the pull progress and the emulation platform warning go there).
- `pandoc`: `docker run --rm --entrypoint pandoc "$REF" --version`, first line exactly `pandoc 3.13` (the output is captured whole, then cut, so `head` cannot cause SIGPIPE).
- `typst`: `docker run --rm --entrypoint typst "$REF" --version` exits 0 and the first line matches `^typst [0-9]+\.[0-9]+\.[0-9]+`.
- `convert`: `docker run --rm -w /tmp --entrypoint sh "$REF" -c '<script>'` where the script, run with `set -e`, writes `t.md` (`# Title`, blank line, `Hello world.`), runs `pandoc t.md -o t.docx`, `pandoc t.md -o t.epub` and `pandoc t.md --to=typst --pdf-engine=typst -o t.pdf`, then checks: `head -c 2 t.docx` is `PK` and `grep -aq word/document.xml t.docx`; `head -c 2 t.epub` is `PK` and `grep -aq application/epub+zip t.epub`; `head -c 5 t.pdf` is `%PDF-`; it prints `converted`. The check passes when the output is exactly `converted`. (The commands follow `plans/PLT-14.md` lines 130 and 132.)
- `healthz`: `docker run -d --name "$NAME" --tmpfs /books:rw,mode=1777 "$REF"` (no sidecar, no `SCRIBA_*` variables; the entrypoint defaults `SCRIBA_BOOKS_DIR` to `/books`, `scripts/entrypoint.sh` line 350); poll `docker exec "$NAME" node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"` up to `SMOKE_POLLS` times with `SMOKE_POLL_SLEEP` seconds between; then `docker exec "$NAME" node -e "fetch('http://127.0.0.1:8080/healthz').then(async r=>console.log(r.status+' '+await r.text()))"` must print exactly `200 {"status":"ok","version":"<EXPECTED_VERSION>"}` (the shape of `apps/api/src/modules/platform/health.controller.ts` line 13; port 8080 from `apps/api/src/main.ts` line 8). On failure it prints the last 20 lines of `docker logs "$NAME"`.
- `fts5`: the PLT-14 criterion 4 command (`plans/PLT-14.md` line 198): `docker run --rm --entrypoint node "$REF" -e "<script>"` with `DatabaseSync(':memory:')`, `CREATE VIRTUAL TABLE t USING fts5(body)`, one insert of `the quick brown fox`, and `SELECT body FROM t WHERE t MATCH 'quick'`; the output must be exactly `[{"body":"the quick brown fox"}]`.
- `size`: D14. Prints `unpacked <KiB> KiB (<MiB> MiB), compressed <MB or n/a>`.
- `arch` (only when `EXPECTED_ARCH` is set): `docker run --rm --entrypoint node "$REF" -p process.arch` equals `$EXPECTED_ARCH`.

At the end it writes a Markdown table of the results to `$GITHUB_STEP_SUMMARY` when that variable is set, and exits 1 if any check failed.

**`scripts/release-guard.mjs`**: as D4. Named export `verifyRelease`, ESM, no dependency beyond `node:fs`.

### The workflow (the text the implementer writes in step 5)

`<PIN>` is the semantic-release version resolved in step 1(a). Format with Prettier afterwards (step 7).

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

Do not push; the repository has no remote. If a step does not behave as written, stop and report; do not change the plan. Record `node -v`, `npm -v` and `docker version --format '{{.Server.Version}}'` beside the results.

0. **Worktree, dependencies, tools and the resume point.** Work in the git worktree on `unit/PLT-19` that the orchestrator gives (`prompt.md` lines 78 and 79). If none was given, make one from the main checkout: `git worktree add -b unit/PLT-19 <path> main` when the branch does not exist, or `git worktree add <path> unit/PLT-19` when it does. Never `git switch` in the main checkout. In the worktree: `git branch --show-current` prints `unit/PLT-19`; `git status --short` prints nothing (if it prints anything, stop and report: uncommitted work of a stopped session is not part of the branch, `prompt.md` line 7); `node -v` prints `v26.x` (`.nvmrc` is `26`). Then `npm ci` (exit 0; a new worktree has no `node_modules`, and the tests import `yaml` and step 7 runs Prettier from it). Every later command runs from the worktree root, called `$R` below. Then `docker info >/dev/null && echo docker-ok`.

   **Resume point (D21).** The two commit subjects are `RED` = `test(PLT-19): add the publish workflow, script and smoke tests (red)` (step 2) and `FEAT` = `feat(PLT-19): add publish.yml, the release config, the publish scripts, the image smoke checks and the release checklist` (step 12). Run `git log --format=%s main..HEAD` (newest first) and record its output. Exactly one of these holds:
   - **State N, a new branch:** it prints nothing. Run steps 1 to 12.
   - **State R, the red commit only:** it prints exactly one line, equal to `RED`, and `git diff --name-only main...HEAD` lists exactly `scripts/publish-workflow.test.mjs`, `scripts/publish-scripts.test.mjs`, `scripts/smoke-image.test.mjs` and `scripts/publish-test-kit.mjs`. Run step 1 again (it writes no file, and step 5 needs `<PIN>`); skip step 2 and record "step 2: committed by an earlier session" with the commit's short SHA (its red result is not re-run); resume at step 3 and run steps 3 to 12.
   - **State F, the feat commit is there:** the last (oldest) line is `RED`, the line above it is `FEAT`, and every line above `FEAT` contains `PLT-19` (fix commits the driver asked for, `prompt.md` lines 97 and 112). Skip steps 1(a), 1(c) and 2 to 7, whose results are committed; take `<PIN>` from the committed workflow with `node -e "console.log(require('yaml').parse(require('fs').readFileSync('.github/workflows/publish.yml','utf8')).env.SEMANTIC_RELEASE_VERSION)"` (S-P2 needs it); run step 1(b) when Docker is present (S-P1 relies on the flag); resume at step 8 and run steps 8 to 11; in step 12 make no commit (`git status --short` prints nothing) and report the commits found.
   - **Anything else** (commits without `RED` as the oldest, `RED` followed by a line other than `FEAT`, or a line above `FEAT` without `PLT-19`): stop and report the list; the branch holds work that this plan does not describe.

   **If Docker is absent:** skip step 1(b) and leave O5 open (record "flag not checked"); of the steps the resume point selects, do all of 1(a), 1(c) and 2 to 10; in step 11 run S-P2 (it needs `npx` and the npm registry, not Docker; if either is missing, mark S-P2 NOT RUN too) and mark S-P1 and S-P3 NOT RUN with the cause "no Docker"; still do step 12 (the commit, except in state F) and report which stand-in rows ran, so that only the criteria whose rows all ran and passed are ticked (O1).
1. **Resolve versions and check flags.** (a) `npm view semantic-release version` and `npm view semantic-release engines.node`; take the newest version whose `engines.node` admits Node 26; that is `<PIN>`; record both. If the registry cannot be reached, stop and report (the workflow needs a pin). (b) `docker buildx version`, and `docker buildx imagetools create --help | grep -- '--dry-run'` must print the flag; if not, stop (O5). (c) Check the action tags. `gh api repos/actions/download-artifact/git/ref/tags/v7 --jq .ref` must print `refs/tags/v7`; if that tag does not exist, take the major of `gh api repos/actions/download-artifact/releases/latest --jq .tag_name` and use it for both `download-artifact` and `upload-artifact` in `publish.yml` (the two must share a major to read each other's artifacts; `ci.yml` is not edited). For each of `docker/setup-buildx-action` `v3`, `docker/login-action` `v3` and `docker/build-push-action` `v6`, `gh api repos/docker/<name>/git/ref/tags/<major> --jq .ref` must print `refs/tags/<major>`; if one does not exist, stop and report. Record `gh api repos/docker/<name>/releases/latest --jq .tag_name` for each (information only; D17). If `gh` or the network is unavailable, keep D17's majors, record "not checked", and A5 stays open for the first real run.
2. **Red tests.** Write the three test files and `scripts/publish-test-kit.mjs` (4.8). Run `node --test --test-reporter=tap scripts/publish-workflow.test.mjs scripts/publish-scripts.test.mjs scripts/smoke-image.test.mjs` (the TAP reporter is named because Node 26's default reporter prints no `not ok` or `#` lines, F17). Expected: `# tests 41`, `# pass 0`, `# fail 41`, and a `not ok` line for each id of 4.8 (W1 to W12, P1 to P5, M1 to M7, G1 to G4, K1 to K13). Why each fails: every W test reads at least one missing file (`publish.yml`, `.releaserc.json` or `docs/RELEASING.md`; W7 reads `publish.yml` as well as the workflow folder, so the compliant `ci.yml` alone cannot make it pass); the P, M and K tests assert exact exit codes, and `bash <missing file>` exits 127; the G tests import a missing module. If any test passes, stop and report it. Commit `test(PLT-19): add the publish workflow, script and smoke tests (red)` with only those four files (`git add` them by name).
3. Write `.releaserc.json` and `scripts/release-guard.mjs`.
4. Write `scripts/publish-plan.sh`, `scripts/publish-merge.sh` and `scripts/smoke-image.sh` as in section 2; `chmod 0755` each.
5. Write `.github/workflows/publish.yml` from section 2, with `<PIN>` replaced.
6. **Write `docs/RELEASING.md` (D19).** Required content: the five jobs, one paragraph each at most; the two repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`, and that the Docker Hub repository `bbartolome/scriba` must exist and be public (a manual step, O7); the first version: the text says the first release is `1.0.0` (O2); which Conventional Commit types release (`feat` minor, `fix`, `perf` and `revert` patch under the default rules) and which do not; the breaking-change rule (O3): the text says that a breaking change needs a footer line that starts with `BREAKING CHANGE:` in the squash-merge body, and that a `!` after the type (`feat!:`) does not release; the checklist (the PR title is a Conventional Commit; CI is green; if the release touches `Dockerfile`, `deploy/`, `scripts/entrypoint.sh` or the installer, run the runbook at `../deploy/RUNBOOK.md#pre-release-checklist`); how to read a run (the job summary table of the smoke checks); a section titled "Known limit: a cancelled pending run" (D10, accepted by the Navigator as a recorded limit): while one run is in progress and a second push is waiting, a third push cancels the second push's pending run; the second push's commit then gets no `sha-<short>` tag, and that tag is never published later; its changes ship in the third run's `latest` and its commits count in the third run's plan, so no release is lost and the version is right; recovery: a run that failed before `merge` published no tag; if `release` failed, re-run the failed job; if `main` moved meanwhile, use Run workflow on `main`, which re-plans and overwrites the same semver image tag with the new image, since no git tag was made.
7. `npx prettier --write .github/workflows/publish.yml .releaserc.json docs/RELEASING.md scripts/release-guard.mjs scripts/publish-workflow.test.mjs scripts/publish-scripts.test.mjs scripts/smoke-image.test.mjs scripts/publish-test-kit.mjs`. Prettier has no parser for `.sh` files and skips them. Then `git status --short` lists only section 2 paths.
8. The three test files: the command of step 2 (with `--test-reporter=tap`). Expected: `# tests 41`, `# pass 41`, `# fail 0`.
9. Root gates from the worktree root: `npm run lint`, `npm test`, `npm run build`. Expected: each exits 0; `npm run lint` prints `examples check passed: …` (the three new `*.test.mjs` files are scanned and name no `examples/`, 4.8) and ends with `All matched files use Prettier code style!`.
10. **Mutation checks, 4.7.** Each mutant is made in its **own fresh folder**: `M=$(mktemp -d)`; copy into `$M` only the file or folder that the mutant names, from the worktree; apply that one mutation and nothing else; run `node --test --test-reporter=tap <the named test file>` with the override variable or variables pointing into `$M`; then `rm -rf "$M"`. No two mutants share a folder, and the originals are never edited. Expected: the run exits non-zero and its TAP output has `not ok` for the named test id (other tests may fail as well, where 4.7 says so); where 4.7 names a part or a message, the failure block under that `not ok` line shows that assertion message; the same test passed on the originals in step 8.
11. Local procedures S-P2, S-P1 and S-P3 (4.7), in that order. Guards and cleanup are inside each.
12. Commit `feat(PLT-19): add publish.yml, the release config, the publish scripts, the image smoke checks and the release checklist` (in state F of step 0 there is nothing to commit: make no commit). Report the resume state of step 0, the results of steps 1 and 8 to 11, and what was not run or was committed by an earlier session. The orchestrator ticks the boxes in the unit file by the rule of O1: criteria 1, 2 and 4 each only after every row named for it in section 4 ran and passed; criterion 5 after its own tests and its mutation checks pass (it needs no stand-in); criterion 3 is never ticked (4.3).

## 4. Acceptance criteria and tests

The criteria are the unit's lines 41 to 45, unchanged. This plan marks nothing passed; the tick rule is O1. Criteria 1 to 4 end in a real GitHub Actions run with Docker Hub credentials; this repository has no git remote (`git remote -v` prints nothing), no runner and no Docker Hub account here. The tests below prove the logic and the structure; where a criterion has a part that only a real run can show, the section says "cannot test locally", names the cause, and records the part as untested under O1 (closed by the Navigator, `611843e`). Names: W = `scripts/publish-workflow.test.mjs`; P, M and G = `scripts/publish-scripts.test.mjs`; K = `scripts/smoke-image.test.mjs`; S-P = a local procedure (4.7).

### 4.1 Criterion 1: a push to `main` with no releasable commit publishes `latest` and `sha-<short>` for both arches and creates no git tag

| Test | Seam | Pass condition |
|---|---|---|
| W1 | `on` of the parsed `publish.yml` | the keys are exactly `push` and `workflow_dispatch`; `push.branches` is `['main']`; `push.paths-ignore` equals the D18 list; none of these sample paths (they need not exist) matches a pattern (a small glob matcher in the test, anchored at both ends, `**` as `.*` and `*` as `[^/]*`): `deploy/RUNBOOK.md`, `Dockerfile`, `scripts/entrypoint.sh`, `packages/packs/src/x.md`, `apps/api/src/modules/platform/x.ts`, `.github/workflows/publish.yml` |
| W2 | the `build` and `smoke` matrices | each matrix has exactly the two pairs `linux/amd64` on `ubuntu-24.04` and `linux/arm64` on `ubuntu-24.04-arm`, with `node_arch` `x64` and `arm64`, and `fail-fast: false`, so both arches are built and smoked |
| W3 | the `if` of `merge` and `release`; `concurrency` | `merge.if` and `release.if` contain `github.ref == 'refs/heads/main'`; `release.if` also contains `needs.plan.outputs.release == 'true'`; `merge` has no condition on `release`; `concurrency.group` contains `github.ref` and `concurrency.cancel-in-progress` is `false` (D10) |
| W6 | the semantic-release calls | the `plan` step calls semantic-release with `--dry-run`; the only call without `--dry-run` is in `release`; nothing outside `release` can create a git tag, so a no-release push (job skipped) creates none |
| W12 | the wiring between jobs | (i) to (viii) of 4.8: the `plan` outputs and their use, the `SCRIBA_PLAN_OUT` file, `merge`'s `SHORT`, `RELEASE` and `VERSION`, the digest hand-off, the digest's source step and `PLATFORM_PAIR`; a wrong key would make every push plan `release=false`, make `merge` exit 1, or make the upload fail, while every other test passes |
| P1, P2 | `publish-plan.sh` | no output file: stdout is exactly `release=false`, `version=0.0.0-dev`, `pin=sha-<first 7 of GITHUB_SHA>`, `short=<same 7>`, `built_at=<value>`; file `1.2.3`: `release=true`, `version=1.2.3`, `pin=1.2.3` |
| M1 | `publish-merge.sh` with the stub `docker` | `RELEASE=false`: exactly one `imagetools create` call without `--dry-run`, with exactly two `-t` arguments, `<registry>:latest` and `<registry>:sha-<SHORT>`, and the two `@sha256:` sources |
| K1 | `smoke-image.sh` with a stub that passes | with `EXPECTED_VERSION=0.0.0-dev`, `EXPECTED_PIN=sha-abc1234` and `EXPECTED_ARCH=arm64`, exit 0, and the `dispenser` check passes only because the stub's script has `REF=bbartolome/scriba:sha-abc1234` and `IMAGE_TAG=sha-abc1234` |
| G1 | `verifyRelease` | when `SCRIBA_PLAN_OUT` is unset it writes no file; when set it writes `<version>\n` |
| S-P2 (a, b, d) | real semantic-release on a scratch repo | (a) and (b) are dry runs: after the `chore:` and the `docs:` commit the dry run writes no output file, and `publish-plan.sh` run on `$S/out` prints `release=false`; (d) is a real run: after a `chore:` commit following the first release, the real run exits 0, `publish-plan.sh` prints `release=false`, and `git ls-remote --tags` shows no new tag |
| S-P1 (A) | registry stand-in | after `publish-merge.sh` with `RELEASE=false`, the new tags are exactly `latest` and `sha-<short>`, and `latest` lists `linux/amd64` and `linux/arm64` |

Cannot test locally: the workflow on GitHub-hosted runners (both arches natively), the push to Docker Hub, and the absence of a git tag after a real Actions run. Cause: no git remote, no runner, no credentials. Local procedure, accepted by the Navigator (O1, `611843e`): the rows above. **Tick rule:** criterion 1 is ticked only after W1, W2, W3, W6, W12, P1, P2, M1, K1, G1, S-P2 (a, b, d) and S-P1 (A) all ran and passed; if S-P1 ends NOT RUN, its row has not run and the box stays unticked. The unrun parts are recorded as untested with their cause: the Docker Hub push (no credentials, no remote) and the real Actions run on both native runners (no runner).

**Known limit of criterion 1 (D10), accepted by the Navigator as a recorded limit** (`plans/DECISIONS.md` line 3203, option (a), commit `6aed752`), which is what authorises the tick above: with the serialised concurrency group, GitHub keeps one pending run (ASSUMED A4). If a run is in progress, a second push waits, and a third push cancels the second's pending run, then the second push's commit gets no `sha-<short>` tag (its changes are in the third run's `latest`, and its commits count in the third run's `plan`). So "a push publishes `latest` and `sha-<short>`" holds for every push whose run is not cancelled while pending. No test can show GitHub's queue behaviour here; W3 checks that `cancel-in-progress` is `false` and that the group is per ref; `docs/RELEASING.md` states the limit (W11). Option (b), a per-commit group (`github.sha`), was rejected by the Navigator (`plans/DECISIONS.md` line 3207); no group at all has the same flaw: both let two runs on one ref run at once, so a later run may not see the git tag that the earlier run created and the two plan the same version (D10).

### 4.2 Criterion 2: a `feat:` or `fix:` push publishes the semver tag too, then creates the git tag and GitHub release; the image reports that semver from `/healthz`

| Test | Seam | Pass condition |
|---|---|---|
| P3 | `publish-plan.sh` | the files `v1.2.3`, `1.2`, `1.2.3+b5`, an empty file and a two-line file each exit 1 with nothing on stdout; a `GITHUB_SHA` of 6 characters or with an upper-case letter exits 1 |
| M2 | `publish-merge.sh` | `RELEASE=true VERSION=1.2.3`: the create call has three `-t` arguments, the third `<registry>:1.2.3`; a `VERSION` of `v1.2.3`, `1.2`, `1.2.3+b5` or empty exits 1 before any `docker` call |
| W2 | `needs` and the matrices | `release.needs` contains `merge`; `merge.needs` contains `smoke`; so the git tag is created after the image tags; the `build` and `smoke` matrices are the two native pairs of criterion 1 |
| W5 | the build step | `build-args` sets `VERSION`, `REVISION` and `BUILT_AT` from `needs.plan.outputs.version`, `.short` and `.built_at` |
| W6 | the `release` job | it sets `SCRIBA_EXPECT_VERSION` from `needs.plan.outputs.version`, runs semantic-release with no `--dry-run`, and has a later step that reads `git/ref/tags/v$VERSION` and runs `gh release view` |
| W8 | `.releaserc.json` | `branches` is `['main']`; `tagFormat` is `v${version}`; the plugins are exactly the four of D3 in that order; `@semantic-release/github` has the four `false` options |
| W12 | the wiring between jobs | the `plan` outputs reach `build` (`VERSION`), `merge` (`RELEASE`, `VERSION`, `SHORT`) and `release` (`SCRIBA_EXPECT_VERSION`); `SCRIBA_PLAN_OUT` names the file that `publish-plan.sh` reads (4.8) |
| K2 | `smoke-image.sh`, `healthz` | the stub's `/healthz` answers `200 {"status":"ok","version":"1.2.3"}`: with `EXPECTED_VERSION=1.2.3`, `PASS healthz`; with `EXPECTED_VERSION=1.2.4`, `FAIL healthz` and exit 1 |
| G2, G3 | `verifyRelease` | with `SCRIBA_EXPECT_VERSION=1.2.3` and `nextRelease.version` `1.2.3` it resolves; with `nextRelease.version` `1.3.0` it throws and writes no file |
| S-P2 (c to g) | real semantic-release on a scratch repo | a `fix:` commit gives `1.0.0` (the first release); a real run with `SCRIBA_EXPECT_VERSION=1.0.0` creates `v1.0.0` in the remote on `HEAD`; a later `feat:` gives `1.1.0` and its real run tags `v1.1.0`; a `BREAKING CHANGE:` footer gives `2.0.0`; a run with `SCRIBA_EXPECT_VERSION=9.9.9` fails and creates no tag |
| S-P1 (B) | registry stand-in | `publish-merge.sh` with `RELEASE=true VERSION=1.2.3 SHORT=def5678` adds the tags `1.2.3` and `sha-def5678` and moves `latest`; the three tags resolve to one index |
| S-P3 | real images, local | a build with `VERSION=1.2.3` and `scripts/smoke-image.sh` with `EXPECTED_VERSION=1.2.3 EXPECTED_PIN=1.2.3` passes on arm64 and, under emulation, amd64; `/healthz` printed `{"status":"ok","version":"1.2.3"}` |

Cannot test locally: the Docker Hub semver tag, the real GitHub release (the `@semantic-release/github` plugin needs github.com and a token), and the run order on real runners. Cause: no remote, no credentials, no runner. Local procedure, accepted by the Navigator (O1, `611843e`): the rows above. **Tick rule:** criterion 2 is ticked only after P3, M2, W2, W5, W6, W8, W12, K2, G2, G3, S-P2 (c to g), S-P1 (B) and S-P3 all ran and passed; if S-P1 or S-P3 ends NOT RUN, the box stays unticked. The unrun parts are recorded as untested with their cause: the Docker Hub push, the GitHub release (no github.com, no token) and the run order on real runners (no runner). The S-P2 scratch repo drops only the GitHub plugin, and its config is derived from `.releaserc.json`, so the analyser rules are the real ones.

### 4.3 Criterion 3: a failure in any build or smoke job leaves no new tag on Docker Hub and no git tag

| Test | Seam | Pass condition |
|---|---|---|
| W4 | the build step and the tag writers | the build step uses `docker/build-push-action`, its `outputs` contain `push-by-digest=true`, and it has no `tags` key; no step `run` in `plan`, `build`, `smoke` or `release` contains `imagetools create`, `docker push`, `docker tag` or `publish-merge.sh`; only `merge` calls `scripts/publish-merge.sh`; the text of `scripts/smoke-image.sh` and `scripts/publish-plan.sh` contains no `imagetools create`, `docker push` or `docker tag` |
| W2 | `needs` | `plan` has no `needs`; `build.needs` contains `plan`; `smoke.needs` contains `build`; `merge.needs` contains `smoke`; `release.needs` contains `merge` |
| W3 | the `if` of `smoke`, `merge`, `release` | none contains `always()`, `failure()` or `cancelled()`, so GitHub skips them when a needed job failed (ASSUMED A4) |
| M3 | `publish-merge.sh` | with one digest file, with three, and with a file whose name is not 64 hex characters: exit 1, and the stub's call log has no `imagetools create` at all |
| M4 | `publish-merge.sh` | the dry-run stub prints a manifest that has only `linux/amd64`, or two `linux/amd64` entries: exit 1, and the call log has the `--dry-run` call and no create call without `--dry-run` |
| M5 | `publish-merge.sh` | the dry-run call exits 1: exit 1, no create call without `--dry-run` |
| K2 to K12 | `smoke-image.sh` | each check broken in turn (the stub's output for that check wrong) gives exit 1, `FAIL <that check>`, and `PASS` for every other check, so no failure hides another (table in 4.5) |
| S-P1 (C, D) | registry stand-in | with one digest, and with two digests of the same platform, `publish-merge.sh` exits 1 and the registry's tag list has no `latest` or `sha-` tag |

Cannot test locally: that GitHub Actions really skips `merge` and `release` when a build or smoke matrix leg fails (the documented behaviour of `needs` without a status function), and a real Docker Hub tag list after a failed run. Cause: no GitHub Actions runner in this environment (no remote; `act`, `actionlint` and `yamllint` are not installed, F14).

**Navigator decision on criterion 3** (O1; `plans/DECISIONS.md` line 3120, commit `611843e`; under `prompt.md` lines 142 and 143). The structural proxy (W2 and W3, with the script refusals M3 to M5 and S-P1 C and D) is not accepted as proof of criterion 3: it shows the YAML wiring but does not exercise the claim that Actions skips `merge` and `release` when a matrix leg fails. The Navigator decides that the unit is complete without criterion 3. **Its checkbox is NOT marked.** The criterion and its cause (no GitHub Actions runner in this environment) are recorded here and stay so until a real run exists. The tests W2, W3, W4, M3 to M5, K2 to K12 and S-P1 (C, D) are kept; they test the wiring and the refusals, and are not proof of the criterion. No criterion is weakened or dropped. Also not testable here: a failure in `release` after `merge` leaves a semver image tag with no git tag (the unit's ordering, unit line 28; see O4).

### 4.4 Criterion 4: all smoke checks pass on both arches

| Test | Seam | Pass condition |
|---|---|---|
| K1 | `smoke-image.sh` against an all-passing stub | exit 0; stdout has a `PASS` line for each of `dispenser`, `pandoc`, `typst`, `convert`, `healthz`, `fts5`, `size` and `arch` (K1's inputs are those of 4.1) |
| W9 | the `smoke` job | its `strategy.matrix.include` has `ubuntu-24.04` with `linux/amd64` and `ubuntu-24.04-arm` with `linux/arm64`; a step runs `scripts/smoke-image.sh "$SMOKE_IMAGE"` with `EXPECTED_VERSION`, `EXPECTED_PIN` and `EXPECTED_ARCH` from `needs.plan.outputs.version`, `.pin` and `matrix.node_arch`; an earlier step sets `SMOKE_IMAGE` from `$REGISTRY_IMAGE@sha256:` plus the downloaded digest |
| M4 | `publish-merge.sh` with the stub | the manifest check of D11 refuses a dry-run manifest that lacks `linux/arm64` or lists `linux/amd64` twice: exit 1, and the call log has the `--dry-run` call and no create call without `--dry-run`. So the merged-manifest smoke check (unit line 31) can fail |
| M6 | `publish-merge.sh` | the manifest check of D11 passes for a dry-run manifest with both platforms plus an `unknown/unknown` attestation entry |
| S-P1 (A) | registry stand-in | the real `docker buildx imagetools create --dry-run` output, parsed by the real `publish-merge.sh`, lists exactly `linux/amd64` and `linux/arm64`, and the pushed `latest` lists both; this is the only row that proves assumption A2 (the flag and its output), because M4 and M6 run against a stub |
| S-P3 | real images, local | `scripts/smoke-image.sh` prints `PASS` for every check on `bbartolome/scriba:plt19-arm64` (native here) and on `plt19-amd64` (emulated), and on a `VERSION=0.0.0-dev` build with `EXPECTED_PIN=sha-<short>`; the size line of each arch is recorded |

Cannot test locally: the checks on a native `ubuntu-24.04` amd64 runner and the pull by digest from Docker Hub. Cause: this host is arm64 (`uname -m` prints `aarch64`) and has no remote. Local procedure, accepted by the Navigator (O1, `611843e`): the rows above. **Tick rule:** criterion 4 is ticked only after K1, W9, M4, M6, S-P1 (A) and S-P3 (arm64 native, amd64 emulated, and the `0.0.0-dev` build) all ran and passed; if S-P1 ends NOT RUN, A2 is unproved and the box stays unticked. The unrun parts are recorded as untested with their cause: the native amd64 run (this host is arm64) and the pull by digest from Docker Hub (no published image). The amd64 run here is under QEMU and is recorded as emulated. The native proof comes with the first real publish run, which is also the native check that PLT-14 criterion 5 waits for (`plans/PLT-14.md` line 217; `units/PLT-14-dockerfile-entrypoint.md` line 40 is unticked).

### 4.5 Smoke script tests K1 to K13 (the rows K2 to K12 of 4.3 refer to this table)

| Id | Stub behaviour | Expected |
|---|---|---|
| K1 | all outputs correct (inputs as in 4.1) | exit 0, `PASS` for each check |
| K2 | `/healthz` version differs from `EXPECTED_VERSION` | `FAIL healthz`, exit 1 |
| K3 | the dispenser script has a bad first line (`# x`) | `FAIL dispenser` |
| K4 | the dispenser script fails `bash -n` (an unclosed `if`) | `FAIL dispenser` |
| K5 | the dispenser `REF=` line holds another tag than `EXPECTED_PIN` | `FAIL dispenser` |
| K6 | `pandoc --version` first line `pandoc 3.12` | `FAIL pandoc` |
| K7 | `typst --version` exits 1 | `FAIL typst` |
| K8 | the convert script prints nothing, or the stub exits 1 | `FAIL convert` |
| K9 | the FTS5 command prints `[]` | `FAIL fts5` |
| K10 | the container never answers (`SMOKE_POLLS=2`, `SMOKE_POLL_SLEEP=0`) | `FAIL healthz`; the call log has `rm -f <name>` with the name given to `run -d --name` |
| K11 | `EXPECTED_ARCH=arm64` but `process.arch` prints `x64` | `FAIL arch` |
| K12 | `du` cannot be measured (exit 1) | `FAIL size` |
| K13 | no argument, or `EXPECTED_VERSION` or `EXPECTED_PIN` unset | exit 2 with a usage line on stderr and no `docker` call |

For K2 to K12 every other check still prints `PASS`, and the `healthz` container (the only one without `--rm`) is removed by the `trap` in every case, including a failure before the poll ends.

### 4.6 Criterion 5: no step relies on a tag push triggering another workflow; no PAT or App token required

This criterion is fully testable locally, because it is a property of the workflow files and the release config.

| Test | Seam | Pass condition |
|---|---|---|
| W1 | `on` of `publish.yml` | no `tags`, no `tags-ignore`, no `release`, no `workflow_run`, no `workflow_call` trigger |
| W7 | one `node:test` test with two parts, (a) the triggers of every file of `WORKFLOWS_DIR` (default `.github/workflows/`: `ci.yml` and `publish.yml`) and (b) the secrets and permissions of the file at `PUBLISH_WORKFLOW_PATH` | (a) `on` is normalised to an object first (so `on: push` or `on: [push]` count as a push with no filter); no workflow has a `create`, `release` or `workflow_run` trigger; where `push` is present it has a non-empty `branches` list and no `tags` or `tags-ignore` key. A push trigger with a branch filter alone does not run for a tag, so a tag pushed by semantic-release starts nothing, and nothing needs it to. `ci.yml` complies today (lines 2 to 6). (b) every `secrets.<NAME>` is one of `GITHUB_TOKEN`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`; the text matches none of `/\bPAT\b/`, `app-id`, `private-key`, `create-github-app-token`; workflow `permissions` is exactly `{contents: read}`; the only jobs with a `permissions` key are `plan` and `release`, each exactly `{contents: write}`. Part (b) reads `publish.yml`, which does not exist at the red stage, so W7 fails there even though part (a) alone would pass on `ci.yml` (step 2). Each assertion message starts with `W7 (a)` or `W7 (b)` and names the file and the rule |
| W2 | one workflow | `release` is in the same file as `merge` and needs it, so the semver image tag and the git tag come from one run |
| W8 | `.releaserc.json` | the plugin list has no `@semantic-release/git`, `/npm`, `/changelog` or `/exec` (no commit back to `main`) |
| W10 | hygiene of the file at `PUBLISH_WORKFLOW_PATH` only (not the workflow folder, so it cannot pass on `ci.yml` alone at the red stage) | no `run:` text contains `${{ github.event` or `${{ github.head_ref`; every `uses:` value ends in `@v<number>`; each job that has a `docker/login-action` step takes both credentials from `secrets.DOCKERHUB_USERNAME` and `secrets.DOCKERHUB_TOKEN` |
| W11 | the file at `RELEASING_PATH` (default `docs/RELEASING.md`), and the runbook at the repository path `deploy/RUNBOOK.md` (unit lines 37 and 38 are decisions, not a criterion; checked here) | the doc's text contains the link `../deploy/RUNBOOK.md#pre-release-checklist` (checked as text); the runbook is read at the repository path `deploy/RUNBOOK.md`, resolved from the test file's own folder (`join(here, '..', 'deploy', 'RUNBOOK.md')`, the way `scripts/ci-workflow.test.mjs` lines 8 to 12 find `ci.yml`), never relative to `RELEASING_PATH` and with no override variable; it exists and has a line `## Pre-release checklist` (line 87 today, the target of the link from `docs/`); the doc names both secrets; it contains `1.0.0` (O2), `BREAKING CHANGE:` (O3), and the heading `Known limit` with the word `pending` (D10). Each assertion message names what it checks (for example `W11: the doc contains BREAKING CHANGE:`), so a mutant shows which rule failed |

**Tick rule:** criterion 5 is ticked after W1, W2, W7, W8 and W10 pass and the mutation checks MU2, MU2b, MU2c, MU2d, MU5 and MU7 behave as 4.7 says. Not tested: that GitHub starts no workflow for a tag pushed with `GITHUB_TOKEN` (platform behaviour, ASSUMED A9; the unit states it at line 28); W7 makes the claim independent of it.

### 4.7 Mutation checks (step 10) and the local procedures (step 11)

Override variables: `PUBLISH_WORKFLOW_PATH`, `WORKFLOWS_DIR`, `RELEASERC_PATH`, `RELEASING_PATH`, `PUBLISH_PLAN_SCRIPT`, `PUBLISH_MERGE_SCRIPT`, `SMOKE_SCRIPT`, `RELEASE_GUARD_PATH`. The runbook has none: W11 always reads the repository's `deploy/RUNBOOK.md` (4.6). Each mutant below is made in its own fresh `M=$(mktemp -d)` from the original files, with only its own mutation (step 10). "A copy of `publish.yml`" means `cp .github/workflows/publish.yml "$M/"` with `PUBLISH_WORKFLOW_PATH="$M/publish.yml"`; "a copy of the folder" means `cp -R .github/workflows "$M/wf"` with `WORKFLOWS_DIR="$M/wf"`.

- MU1. A copy of `publish.yml`; remove `smoke` from `merge.needs`: W2 fails.
- MU2. A copy of the folder; add `tags: ['v*']` under `push` in `$M/wf/publish.yml`; set `WORKFLOWS_DIR="$M/wf"` and `PUBLISH_WORKFLOW_PATH="$M/wf/publish.yml"`: W1 and W7 fail. (W7 reads every file of `WORKFLOWS_DIR`, so without that variable it would read the real folder and pass.)
- MU2b. A **new** copy of the folder (not MU2's); remove the `branches: [main]` line from the `push` trigger of `$M/wf/ci.yml`, so `push` has no filter; set `WORKFLOWS_DIR="$M/wf"` only: W7 fails, and only for the missing branch filter (its message is a `W7 (a)` message naming `ci.yml`; part (b) reads the original `publish.yml` and passes, and `$M/wf/publish.yml` is the original too).
- MU2c. A **new** copy of the folder; add a `release:` trigger with `types: [published]` to `$M/wf/publish.yml`; set `WORKFLOWS_DIR="$M/wf"` and `PUBLISH_WORKFLOW_PATH="$M/wf/publish.yml"`: W7 fails for the `release` trigger (a `W7 (a)` message; W1 also fails, since it forbids `release` in `publish.yml`).
- MU2d. A **new** copy of the folder; add a `create:` trigger to `$M/wf/ci.yml`; set `WORKFLOWS_DIR="$M/wf"` only: W7 fails for the `create` trigger (a `W7 (a)` message naming `ci.yml`).
- MU3. A copy of `publish.yml`; replace the existing `if:` of `merge` (do not add a second `if:` key, which makes `yaml` throw) with `if: always() && github.ref == 'refs/heads/main'`: W3 fails.
- MU4. A copy of `publish.yml`; delete `push-by-digest=true,` from the build `outputs`: W4 fails.
- MU5. A copy of `publish.yml`; add `PAT: ${{ secrets.PAT }}` to the `env` of the `merge` step: W7 fails with a `W7 (b)` message (`WORKFLOWS_DIR` is unset, so part (a) reads the real folder and passes).
- MU6. A copy of `publish.yml`; delete `--dry-run` from the `plan` step: W6 fails.
- MU7. A copy of `.releaserc.json` (`RELEASERC_PATH`); add `"@semantic-release/git"` to `plugins`: W8 fails.
- MU8. A copy of `scripts/publish-merge.sh` (`PUBLISH_MERGE_SCRIPT`); delete the manifest-check block (step 3 of the script): M4 fails.
- MU9. A copy of `scripts/smoke-image.sh` (`SMOKE_SCRIPT`); replace the `healthz` version comparison by `true`: K2 fails.
- MU10. A copy of `scripts/release-guard.mjs` (`RELEASE_GUARD_PATH`); delete the `throw`: G3 fails.
- MU11. A copy of `publish.yml`; change the `short` output of `plan` to `${{ steps.plan.outputs.shorts }}`: W12 fails.
- MU12. A copy of `publish.yml`; change `SCRIBA_PLAN_OUT` of the dry-run step to `${{ runner.temp }}/next-versionx`: W12 fails.
- MU13. A copy of `publish.yml`; change `RELEASE` of the `merge` step to `${{ needs.plan.outputs.version }}`: W12 fails.
- MU14. A copy of `docs/RELEASING.md` only, as `$M/RELEASING.md` with `RELEASING_PATH="$M/RELEASING.md"`; remove every occurrence of the text `BREAKING CHANGE:`: W11 fails, and only for the footer (its message names `BREAKING CHANGE:`). The runbook is not copied and need not be: W11 reads it at the repository path `deploy/RUNBOOK.md`, never relative to `RELEASING_PATH`, so its check passes, and the link check reads the copy's unchanged text.
- MU15. A copy of `publish.yml`; change `DIGEST` of the `Export the digest` step to `${{ steps.buildx.outputs.digest }}`: W12 fails (vii) (a `W12 (vii)` message).
- MU16. A copy of `publish.yml`; in the `smoke` job's `Prepare` step change `PLATFORM_PAIR=` to `PLATFORM_PAIRX=`: W12 fails (viii) (a `W12 (viii)` message).

**S-P2. semantic-release on a scratch repository (needs `npx` and the npm registry, not Docker).** Guards: `R` is the worktree root; `S=$(mktemp -d)`; stop if `command -v npx` is empty. Setup: `git init --bare "$S/remote.git"`; `git init -b main "$S/work"`; in `work`: `git config user.name t`, `git config user.email t@example.invalid`, `git remote add origin "$S/remote.git"`; copy `$R/scripts/release-guard.mjs` to `work/scripts/`; write `work/.releaserc.json` by reading `$R/.releaserc.json` with `node` and removing the `@semantic-release/github` entry, nothing else. For each commit below: make it (the first, `chore: init`, adds `.releaserc.json` and `scripts/release-guard.mjs`; the others use `git commit --allow-empty`), `git push origin main`, delete `$S/out`, run `SCRIBA_PLAN_OUT="$S/out" npx --yes "semantic-release@<PIN>" --dry-run --no-ci` from `work`, then from `work` run `GITHUB_SHA=$(git rev-parse HEAD) bash "$R/scripts/publish-plan.sh" "$S/out"` and record its five lines. Expected (a missing `$S/out` is the no-release case):
- (a) `chore: init`: no `$S/out`; `release=false`.
- (b) `docs: x`: no `$S/out`; `release=false`.
- (c) `fix: a`: `$S/out` holds `1.0.0`; `release=true`, `version=1.0.0`. Then the real run `SCRIBA_PLAN_OUT="$S/out" SCRIBA_EXPECT_VERSION=1.0.0 npx --yes "semantic-release@<PIN>" --no-ci` exits 0, and `git ls-remote --tags "$S/remote.git"` lists `refs/tags/v1.0.0` on the commit of `HEAD`.
- (d) `chore: y`: the dry run writes nothing; `release=false`; a real run exits 0 and adds no tag.
- (e) `feat: b`: the dry run writes `1.1.0`; a real run with `SCRIBA_EXPECT_VERSION=1.1.0` tags `v1.1.0`.
- (f) `feat!: c` alone: record whether the dry run writes a version (expected under the default preset: none, so `release=false`; this is the limit of O3). Then a `fix: d` commit whose body has the line `BREAKING CHANGE: e`: the dry run writes `2.0.0` (do not run a real release).
- (g) a real run with `SCRIBA_EXPECT_VERSION=9.9.9`: non-zero exit, and the tag list unchanged (`v1.0.0` and `v1.1.0` only).

Remove `$S` at the end. Record every result. If the dry run does not call `verifyRelease` (no `$S/out` after (c)), stop and report (A1).

**S-P1. Registry stand-in (needs Docker, the `registry:2` image and a registry port reachable by the shell).** Guards: no container named `plt19-registry`; host port 5099 free (`docker ps --format '{{.Ports}}'` shows no `5099`). The shell may run in a container where a published port is not reachable on `127.0.0.1` (`plans/PLT-14.md` line 159), so after `docker run -d --name plt19-registry -p 127.0.0.1:5099:5000 registry:2`, `curl -fsS http://127.0.0.1:5099/v2/` must answer; if it does not, remove the container, record S-P1 as NOT RUN with that cause (A2 and A3 then stay unproved until the first real run), and go on. Sources: build two tiny single-platform images and push them as tags `src-amd64` and `src-arm64` with `printf 'FROM busybox:1.37\n' | docker buildx build --platform linux/<arch> --provenance=false --push -t localhost:5099/bbartolome/scriba:src-<arch> -`. The digest of each is the first field of `docker buildx imagetools inspect --raw localhost:5099/bbartolome/scriba:src-<arch> | sha256sum`. **Digest guard:** `docker buildx imagetools inspect localhost:5099/bbartolome/scriba@sha256:<digest>` must exit 0 for each; if not, stop and report (the raw output was not byte-exact). Make a folder `D` holding two empty files named by the two digests.
- Case A: `REGISTRY_IMAGE=localhost:5099/bbartolome/scriba SHORT=abc1234 RELEASE=false bash scripts/publish-merge.sh "$D"`: exit 0; `curl -s http://127.0.0.1:5099/v2/bbartolome/scriba/tags/list` lists exactly the set `src-amd64`, `src-arm64`, `latest`, `sha-abc1234`; `docker buildx imagetools inspect --raw localhost:5099/bbartolome/scriba:latest` lists both platforms.
- Case B: the same with `SHORT=def5678 RELEASE=true VERSION=1.2.3`: exit 0; the tags `1.2.3` and `sha-def5678` are added; `imagetools inspect --raw` of `latest`, `sha-def5678` and `1.2.3` print identical bytes (`cmp`).
- Case C: push the amd64 source also to `localhost:5099/bbartolome/scriba-fail:src-amd64`; a folder with only the amd64 digest file; `publish-merge.sh` with `REGISTRY_IMAGE=localhost:5099/bbartolome/scriba-fail`: exit 1, and that repository's tag list has no `latest` and no `sha-` tag.
- Case D: two different amd64 digests. Two builds of the same `FROM busybox:1.37` give the same digest, so the second build differs: `printf 'FROM busybox:1.37\nLABEL plt19=b\n' | docker buildx build --platform linux/amd64 --provenance=false --push -t localhost:5099/bbartolome/scriba-fail:src-amd64b -`. Take both digests (`src-amd64` and `src-amd64b` of `scriba-fail`) as above, with the digest guard, and before the run assert `[ "$d1" != "$d2" ]` and that the folder `D2` holds two files (`ls "$D2" | wc -l` prints `2`; if it prints `1`, stop, because the case would test the count rule instead). Then `publish-merge.sh` on `D2` with `REGISTRY_IMAGE=localhost:5099/bbartolome/scriba-fail`: exit 1 with the platforms found (`linux/amd64` twice) on stderr, and no `latest` or `sha-` tag in that repository.

Cleanup: `docker rm -f plt19-registry`; remove the local `localhost:5099/…` images if any were loaded.

**S-P3. Real images, local (needs Docker; the amd64 image runs under emulation).** Guard: no image or container with a `plt19-` name. From the worktree root, build with the same build args the workflow passes: `SHORT=$(git rev-parse --short=7 HEAD)`; `NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)`; for `arm64` and `amd64`: `docker buildx build --platform linux/<arch> --build-arg VERSION=1.2.3 --build-arg REVISION=$SHORT --build-arg BUILT_AT=$NOW --load -t bbartolome/scriba:plt19-<arch> .` (it does not touch the `local-*` tags of `scripts/build-image.sh`). Run `EXPECTED_VERSION=1.2.3 EXPECTED_PIN=1.2.3 EXPECTED_ARCH=arm64 bash scripts/smoke-image.sh bbartolome/scriba:plt19-arm64; echo exit=$?` and the same with `EXPECTED_ARCH=x64` on `plt19-amd64`: every check `PASS`, `exit=0`. Then a non-release build: `--build-arg VERSION=0.0.0-dev --build-arg REVISION=$SHORT --build-arg BUILT_AT=$NOW`, tagged `plt19-dev-arm64` for `linux/arm64`, run with `EXPECTED_VERSION=0.0.0-dev EXPECTED_PIN=sha-$SHORT EXPECTED_ARCH=arm64`: every check `PASS` (the proof of D5). Then two failing runs on `plt19-arm64`: `EXPECTED_VERSION=9.9.9` gives `FAIL healthz` and exit 1 with the other checks still `PASS`; `EXPECTED_PIN=9.9.9` gives `FAIL dispenser`. Record the `size` line of each arch (the compressed figure is `n/a` for a local image, D14). Cleanup: `docker image rm bbartolome/scriba:plt19-arm64 bbartolome/scriba:plt19-amd64 bbartolome/scriba:plt19-dev-arm64`; `docker ps -a --filter name=scriba-smoke` lists no container.

### 4.8 The test files in full (what the implementer writes in step 2)

All tests use `node:test` and `node:assert/strict`, as `scripts/ci-workflow.test.mjs` does. Every path under test defaults to the repository file, found from the test file's own folder as `scripts/ci-workflow.test.mjs` lines 8 to 12 do, and can be replaced by the override variable named in 4.7. The one path with no override variable is the runbook: W11 reads `join(here, '..', 'deploy', 'RUNBOOK.md')`, where `here` is the test file's folder, so it reads the repository's `deploy/RUNBOOK.md` in the worktree whatever `RELEASING_PATH` is (MU14). Shell scripts are run as `bash <path>`, so a mutant copy needs no mode bit.

**One test per id.** Each id below is exactly one top-level `test(...)` call with no subtests: 12 W, 5 P, 7 M, 4 G and 13 K tests, 41 in all (steps 2 and 8). Where a row has parts (W7 (a) and (b); W12 (i) to (viii)) or several cases (P3, P4, M2, M3, M4, M7, K8, K13), they are assertions inside that one test, and each assertion message starts with the id and, if any, the part (`W12 (vii) …`). **No top-level reads.** No file under test is read, parsed or imported at module top level: each test reads its files inside its own body, so a missing or broken file fails, by id, each test that needs it (step 2), and never the whole file at load. **No line of the three `*.test.mjs` files may name `examples/` or contain a quoted `examples` beside the words root, repo, here, dirname or cwd:** `npm run lint` runs the PLT-20 examples check, which flags such lines in every `*.test.*` file (`scripts/examples-check/m1.mjs` lines 25 to 33 and 201 to 229; `package.json` lines 26 and 27).

- **`scripts/publish-workflow.test.mjs`** (parses `publish.yml`, `.releaserc.json`, `docs/RELEASING.md` and every file of `WORKFLOWS_DIR`, and reads the repository's `deploy/RUNBOOK.md`): W1 triggers and `paths-ignore`; W2 the job names (`plan`, `build`, `smoke`, `merge`, `release`), the `needs` chain, and the `build` and `smoke` matrices (the two `runner` and `platform` pairs and `node_arch`; `fail-fast: false`); W3 the `if` conditions and the `concurrency` block; W4 the untagged build and the single caller of `publish-merge.sh`; W5 the build args, the `type=gha` cache with scope `${{ env.PLATFORM_PAIR }}` in `cache-from` and `cache-to`, and `provenance: false`; W6 the semantic-release calls and the post-release tag check; W7, one test, (a) the triggers of every workflow file and (b) the secrets and permissions of `publish.yml`; W8 `.releaserc.json`; W9 the `smoke` job's steps and env; W10 hygiene of `publish.yml` only; W11 `docs/RELEASING.md` and the heading of the repository's `deploy/RUNBOOK.md`; W12 the wiring between jobs (below), one test whose eight parts are assertions. Steps are found by `name`, `id` or `uses`, never by a fixed index, so an added step (CEX-15) does not break them; "before" means a lower position in the same job's step list.
- **W12 in detail.** (i) `jobs.plan.outputs` has exactly the keys `release`, `version`, `pin`, `short` and `built_at`, and each value is exactly `${{ steps.plan.outputs.<same key> }}`. (ii) The `plan` job has a step with `id: plan` whose `run` calls `scripts/publish-plan.sh` and appends to `$GITHUB_OUTPUT`. (iii) The file that the dry-run step names in `env.SCRIBA_PLAN_OUT` (`${{ runner.temp }}/<name>`) is the file `publish-plan.sh` is given (`"$RUNNER_TEMP/<name>"`, the same `<name>`). (iv) The `merge` step that calls `publish-merge.sh` has `env.SHORT`, `env.RELEASE` and `env.VERSION` equal to `${{ needs.plan.outputs.short }}`, `.release` and `.version`. (v) The `release` job's `SCRIBA_EXPECT_VERSION` and `VERSION` equal `${{ needs.plan.outputs.version }}`. (vi) The digest hand-off: `build` uploads an artifact named `digests-${{ env.PLATFORM_PAIR }}` from `/tmp/digests/*`; `smoke` downloads `digests-${{ env.PLATFORM_PAIR }}` into `/tmp/digests`; `merge` downloads with `pattern: digests-*` and `merge-multiple: true` into the folder it passes to `publish-merge.sh` (`/tmp/digests`). (vii) The digest's source: in `build`, the step whose `run` contains `touch "/tmp/digests/${DIGEST#sha256:}"` has `env.DIGEST` equal to `${{ steps.<id>.outputs.digest }}`, where `<id>` is the non-empty `id` of the job's step that uses `docker/build-push-action` (today `build`), and that step comes before it. (viii) `PLATFORM_PAIR`: in each of `build` and `smoke`, a step whose `env.PLATFORM` is `${{ matrix.platform }}` and whose `run` contains the text `PLATFORM_PAIR=${PLATFORM//\//-}` and `>> "$GITHUB_ENV"` comes before every step whose `with` values contain `${{ env.PLATFORM_PAIR }}`. Also, every `needs.plan.outputs.<key>` used anywhere in the file names a key listed in (i).
- **`scripts/publish-scripts.test.mjs`**: P1 no output file; P2 file `1.2.3`; P3 invalid inputs (`v1.2.3`, `1.2`, `1.2.3+b5`, empty file, two lines, a 6-character or upper-case `GITHUB_SHA`) exit 1 with empty stdout; P4 a valid and an invalid `BUILT_AT` override; P5 stdout is exactly five lines in the order of section 2. M1 tags without a release; M2 tags with a release, and the bad `VERSION` cases; M3 digest-folder errors; M4 a dry-run manifest without arm64, and one with two amd64 entries; M5 a failing dry-run call; M6 a manifest with both platforms plus an `unknown/unknown` entry passes; M7 an invalid `REGISTRY_IMAGE`, `SHORT` or `RELEASE` exits 1 with no `docker` call. G1 `verifyRelease` writes `<version>\n` to `SCRIBA_PLAN_OUT`; G2 it resolves when the expected version matches; G3 it throws when it differs and writes no file; G4 with neither variable set it resolves and writes nothing. The G tests import the plugin with `import(pathToFileURL(path))`.
- **`scripts/smoke-image.test.mjs`**: K1 to K13 of 4.5.
- **`scripts/publish-test-kit.mjs`**: `makeStubDocker(dir, behaviour)` writes an executable `docker` shell script into `dir`; the script appends each call (all arguments, one line) to a log file and answers by matching the call (`run --rm -e SETUP=true`, `--entrypoint pandoc`, `--entrypoint typst`, `-w /tmp`, `--entrypoint node … -p process.arch`, `--entrypoint node … -e`, `--user 0`, `run -d`, `exec`, `rm -f`, `logs`, `buildx imagetools create --dry-run`, `buildx imagetools create -t`, `buildx imagetools inspect`) from files or variables in `behaviour`. It also exports `runScript(script, args, env, stubDir)`, which runs `bash <script>` with `PATH=<stubDir>:$PATH` and returns the status, stdout, stderr and the call log.

## 5. Downstream agreement

- **CEX-15 (the only unit in `unblocks`; its `blocked_by` names "Platform phase:ci-publish (PLT-19)", `units/CEX-15-export-gate-image-smoke.md` line 7).** It adds "an additive step in Platform's image smoke job" that exports the nonfiction sample to four formats on amd64 and arm64 (its lines 17 and 22). What it needs, and what this plan provides: (a) a `smoke` job that runs per arch on a native runner (D12; W2, W9); (b) the image under test as `$SMOKE_IMAGE` in every later step, and the plan values from `needs.plan.outputs` (the step reads them the same way); (c) the gate: `merge` needs `smoke`, so a failing export step blocks every tag (W2, W3); (d) the sample at `/opt/scriba/examples` (Dockerfile line 59) and a writable folder for Pandoc (S9; the container needs a writable `/books`, S10). CEX-15 appends a step after "Image smoke checks"; the W tests check the required steps, their order and their wiring and do not forbid extra steps or a `-t` option in them (D12, R6-f). Nothing in `smoke-image.sh` blocks an additive step. Its criterion "CEX-10…CEX-14 criteria pass on `main` with real Pandoc and Typst in CI" (CEX-15 line 21) is a matter for `ci.yml` and those units, not for this workflow.
- **GNP-05 (`units/GNP-05-core-gate.md` line 17; not blocked by PLT-19).** Its pack read-only check may live "in Platform's image smoke". The image runs as UID 1000 by default (Dockerfile line 63), and every smoke check except `size` (`--user 0`, D14) runs as that user, so a `touch /opt/scriba/packs/x` check added as a new function or step behaves as in `plans/PLT-14.md`. Nothing here prevents it, and nothing here adds it.
- **PLT-17 (done; `plans/PLT-17.md` O1 line 187, D3 line 44, A10 line 244).** Answers: (a) yes, `sha-<short>` is published on every publishing push whose run is not cancelled while pending (D10); a cancelled pending run publishes nothing, and the pin of any image that was published always names a tag that exists (S3; M1); (b) REVISION and the tag suffix are the same 7 characters from one place (D6; W5; W12; M1); (c) a non-release build bakes exactly `0.0.0-dev` (D5), and the dispenser then pins `sha-<revision>`. The `dispenser` smoke check asserts that the pin printed by the image equals the tag `merge` will push, before it pushes (K5, S-P3). For a release the pin is the semver, which `merge` also tags. No change to `scripts/entrypoint.sh`.
- **PLT-18 (done; `plans/PLT-18.md` lines 189 and 194).** Its update and rollback need tags on Docker Hub; this unit publishes `latest`, `sha-<short>` and semver (S3). The first semver is `1.0.0` (O2). `plans/PLT-18.md` line 194 says the README rollback example uses a semver tag, but `README.md` lines 51 to 58 name no fixed tag; the repository decides, and no README change follows (R6-k). PLT-18's recorded limit "the Docker Hub pull is untested" (`plans/DECISIONS.md` line 2863, item 3) stays untested here (no remote); it can be repeated with `bbartolome/scriba:<tag>` after the first real run. No file of PLT-18 changes.
- **PLT-15 (done; `plans/PLT-15.md` line 337).** Compose defaults to `bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}` (`deploy/compose.yaml` line 40); `latest` exists after the first publishing push on `main`. No compose change.
- **PLT-14 (done).** The build args `VERSION`, `REVISION`, `BUILT_AT` are passed by name (Dockerfile lines 32 to 34) with validated values (S13); the native matrix is the one in unit line 23 and is the native check for PLT-14 criterion 5, whose checkbox this plan does not touch. PLT-14 open point 5 (digest-pinned base images, `plans/PLT-14.md` line 276) is not taken: base images stay `node:26` and `node:26-slim` (Dockerfile lines 2, 28, 50). Cache note: the Dockerfile runs `COPY . .` before `npm ci` (lines 30 and 31), so a source change invalidates the install layer; the GHA cache still holds the base layers and the `fetch` stage; changing that is PLT-14's file and not part of this plan.
- **PLT-16 (done; `plans/PLT-16.md` line 231).** The checklist links `deploy/RUNBOOK.md#pre-release-checklist` (line 87). SAU-21 later adds its socket row to that runbook (`units/SAU-21-tailnet-gate.md` line 17); W11 checks only the heading, so the link stays valid.
- **PLT-13 (done; `plans/PLT-13.md` line 271; `units/PLT-13-playwright-harness-e2e.md` line 24).** The e2e has no export step; the `convert` smoke check stands in for export (S6). `publish.yml` and `ci.yml` share no file and both run on pushes to `main`, independently.
- **PLT-10 (done; `plans/PLT-10.md` line 123; `units/PLT-10-ci-workflow.md` line 19).** The PR-title check makes the squash-merge subject a Conventional Commit, which semantic-release reads. The title pattern allows `type!:` (`scripts/check-pr-title.mjs` line 4), but the default commit analyser does not parse `feat!:` (A1 v), so such a title does not release; that is O3, closed by the Navigator. `ci.yml` is not changed; it runs `npm test` (line 29), which now includes this unit's tests.
- **Units that use the one-liner.** `units/SAU-10-compose-version-status.md` line 21 quotes `docker run --rm -e SETUP=true bbartolome/scriba | bash`; `units/SAU-08-token-guard-gate.md` line 33 and `units/SAU-16-setup-flow-gate.md` line 24 name it. It pulls `latest`, which exists once the first publishing push runs. No change.
- **`units/README.md`.** Phase table line 78: merging this unit closes `phase:ci-publish`. `grep -rn ci-publish units/` lists only CEX-15 line 7, that table line, and this unit's own file (lines 5 and 14).

## 6. Open points

- **O1. Which criteria can be ticked without a real run. CLOSED by the Navigator** (session 2ddb4a6c49c64ada9360fb078f09cf2e; `plans/DECISIONS.md` line 3120, commit `611843e`): option (a), refined. Criteria 1 to 4 end in a GitHub Actions run with Docker Hub credentials on native runners; criterion 5 is fully tested locally (4.6). Ruling: the stand-ins are accepted as the local procedures for criteria 1, 2 and 4. Each is ticked only after every row named for it in section 4 ran and passed (a row that ends NOT RUN counts as not run), and the unrun parts are recorded as untested with their cause: the Docker Hub push and pull (no credentials, no remote), the GitHub release (no github.com, no token), the native amd64 run (the host is arm64), the pull by digest (no published image), and the Actions runtime itself (no runner). Criterion 3 is not accepted with its structural proxy; the Navigator decides that the unit is complete without it, and its checkbox is not marked (4.3). Criterion 5 needs no stand-in. The first real run is still the native amd64 check that PLT-14 criterion 5 waits for. Precedents the Navigator cites: `plans/DECISIONS.md` lines 2605 (PLT-17, O3) and 2775 (PLT-18, P10).
- **O2. The first version. CLOSED by the Navigator** (same entry): accept `1.0.0`, semantic-release's default with no prior tag (ASSUMED A1 iv; S-P2 (c) shows it). A `0.x` start would need a hand-pushed baseline tag, with no benefit for a prototype. `docs/RELEASING.md` states `1.0.0` (W11).
- **O3. Breaking-change syntax. CLOSED by the Navigator** (same entry): option (a). The PR-title check accepts `type!:` (`scripts/check-pr-title.mjs` line 4), but the default commit analyser does not read `feat!:` as a release (ASSUMED A1 v; S-P2 (f) records what it does). The current analyser is kept, and a breaking change needs a `BREAKING CHANGE:` footer in the squash body; `docs/RELEASING.md` says so (W11). The `conventionalcommits` preset is not installed, and the PLT-10 title pattern is not changed.
- **O4. semantic-release as `npx` at a pinned version (D2). No Navigator decision needed** (revision-1 review, item 3: it follows from the batch's rule that shared files stay untouched). The version is not in `package-lock.json`, so lockfile tooling will not see it. Also recorded: a release that fails after `merge` leaves a semver image tag with no git tag; the recovery in `docs/RELEASING.md` is a re-run, and the next release overwrites the same semver image tag. If `main` moves during a run, semantic-release in `release` refuses (ASSUMED A1 vi) and the `Check the tag and the release` step fails the job on purpose. A stricter rule (refuse to overwrite an existing semver tag in `merge`) would block the next run until someone deletes the tag by hand, so it is not planned.
- **O5. `imagetools create --dry-run` (D11). No Navigator decision needed unless step 1(b) or S-P1 fails** (revision-1 review, item 3). The unit lists the manifest check among the smoke checks, but a merged manifest exists only in `merge`, and checking after the push would leave tags behind on failure. This plan checks the dry-run output before pushing (ASSUMED A2). Step 1(b) checks the flag; S-P1 checks the output if the registry is reachable. If either fails, the implementer stops and the Navigator chooses between a check of the two source digests' platforms (the `arch` smoke check already proves each) and a post-push check with a documented delete step.
- **O6. "Changelog" means the GitHub release notes (D3). No Navigator decision needed**: unit line 28 says semantic-release does not commit back to `main`, which excludes a committed `CHANGELOG.md`.
- **O7. Manual setup outside this repository. No Navigator decision needed.** The repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (a token that can push), a public Docker Hub repository `bbartolome/scriba` (the installer pulls it anonymously), and a public GitHub repository, which gets the free `ubuntu-24.04-arm` runner (ASSUMED A4, A6). None of this can be done or checked here; `docs/RELEASING.md` lists it.
- **O8. `publish.yml` does not wait for `ci.yml`. No Navigator decision needed**: the unit makes `smoke` the gate (unit line 24). Both workflows start on a push to `main`. If branch protection requires CI on the pull request, the squashed commit was green before it merged (ASSUMED A6).

## 7. Facts checked

### 7a. Checked in the repository (command or file and line, at `c0c7863`)

- **F1.** `git rev-parse --short HEAD` is `c0c7863`; `git status --short` is empty; `git remote -v` prints nothing; `git branch -a` lists `backup/PLT-16`, `main`, `unit/AGL-01`, `unit/PST-02`, `unit/PST-11` and `unit/SAU-06`; `git worktree list` lists the main checkout and one worktree for each of those four unit branches (under `/Users/bbartolome/workspace/scriba-prototype-wt/`), all at `c0c7863`; `git branch --list unit/PLT-19` prints nothing. `git diff --name-only 611843e c0c7863 -- . ':!plans'` prints nothing; `git diff --name-only 22040f6 c0c7863 -- . ':!plans'` lists only `modules/compile-export.md`, `units/CEX-08-nonfiction-sample-order.md` and `units/CEX-20-milestone-gate.md`, of which this plan cites only `modules/compile-export.md` line 25 (unchanged); `git diff --name-only 68d6179 c0c7863` lists `plans/DECISIONS.md`, `plans/MPR-09.md`, `plans/SHL-10.md` and `plans/SHL-12.md`. `git log -- plans/PLT-19.md` lists revisions 1 to 6 (`60222ca`, `c956a6b`, `d706143`, `deb4565`, `dd2c9ab`, `68d6179`). `git show --stat 611843e` and `6aed752` each change only `plans/DECISIONS.md`.
- **F2.** `ls .github/workflows` is `ci.yml` only. `ci.yml`: lines 2 to 6 the triggers (`pull_request`; `push` with `branches: [main]`); lines 7 and 8 `permissions: contents: read`; lines 13, 14 and 38 use `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`; line 16 `node-version-file: .nvmrc`; line 29 `npm test`. No `tags`, `create`, `release` or `workflow_run` trigger.
- **F3.** `scripts/ci-workflow.test.mjs` lines 9 to 12 read only `ci.yml` (override `CI_WORKFLOW_PATH`); line 22 asserts one job in that file, so `publish.yml` does not affect it; line 44 reads `workflow.on` (the `yaml` package parses the key as the string `on`). `package.json` line 25 `"test": "npm test --workspaces && node --test 'scripts/*.test.mjs'"`; line 26 `lint` runs `lint:examples` and ends with `prettier --check .`; line 27 `lint:examples` runs `scripts/examples-check/index.mjs`; line 36 `prettier` `3.9.10`; line 40 `"yaml": "2.9.1"`. `.nvmrc` is `26`. `.prettierignore` ignores `/units/`, `/modules/`, `/plans/` and `/package-lock.json`; `prettier --file-info` reports `.github/workflows/ci.yml`, `.releaserc.json`, `docs/RELEASING.md` and `scripts/x.mjs` as not ignored, and `scripts/x.sh` with no parser; Prettier expands directories with `dot: true` (`node_modules/prettier/internal/legacy-cli.mjs` line 1730). `eslint.config.mjs` lines 17 and 21 lint `**/*.ts` only, and only the workspaces run ESLint.
- **F4.** `Dockerfile`: line 2 `FROM node:26-slim AS fetch`; line 28 `FROM node:26 AS build`; lines 30 and 31 `COPY . .` then `RUN npm ci`; lines 32 to 34 `ARG VERSION=0.0.0-dev`, `REVISION=dev`, `BUILT_AT=dev`; line 35 writes `build-info.ts` with `printf`; line 50 `FROM node:26-slim AS runtime`; line 51 `WORKDIR /opt/scriba/app`; lines 52 to 56 Pandoc `.deb` and Typst; lines 57 to 61 copy the app, `packages/packs` to `/opt/scriba/packs`, `examples` to `/opt/scriba/examples`, `deploy` to `/opt/installer` and the entrypoint; line 63 `USER 1000:1000`; line 64 the entrypoint. `.dockerignore` excludes `.git`, `**/node_modules`, `**/dist`, `**/.angular`, `plans`, `units`, `modules`, `prompt.md`, `.claude`, `.scriba-dev`, `e2e/test-results`.
- **F5.** `scripts/build-image.sh` line 9 `SEMVER_RE` (with an optional `(\+[0-9A-Za-z.-]+)?` build part), line 10 `REVISION_RE='^[0-9a-f]{7,40}$'`, line 11 `BUILT_AT_RE`; lines 28 to 35 build `bbartolome/scriba:local-<arch>`; the file is mode `-rwxr-xr-x`.
- **F6.** `scripts/entrypoint.sh` (353 lines): line 3 the `SETUP=true` branch; lines 6 to 8 read BUILD_INFO with `node -p`; line 9 the semver test `^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$` (no `+build`) and the `0.0.0-dev` exclusion; lines 9 to 16 the pin rule (else `sha-<revision>` for `^[0-9a-f]{7,40}$`, else exit 1); line 17 `sed "s|@@PIN@@|$PIN|g"`; line 18 `#!/usr/bin/env bash` (first line of the heredoc); lines 25 and 26 `REF=bbartolome/scriba:@@PIN@@` and `IMAGE_TAG=@@PIN@@`; line 346 `cat installer-hint.txt </dev/null`, line 347 the heredoc terminator, line 348 `exit 0`; lines 350 to 352 default `SCRIBA_BOOKS_DIR=/books`, `SCRIBA_PACKS_DIR`, `SCRIBA_EXAMPLES_DIR`; line 353 `exec node /opt/scriba/app/apps/api/dist/main.js`.
- **F7.** `apps/api/src/modules/platform/health.controller.ts` line 8 (unguarded on purpose) and line 13 `return { status: 'ok', version: BUILD_INFO.version }`; `build-info.ts` lines 2 to 6 hold `0.0.0-dev`, `dev`, `dev`; `packages/contracts/src/platform/http.ts` line 8 `HEALTHZ_ROUTE = '/healthz'`; `apps/api/src/main.ts` line 8 `app.listen(8080, '0.0.0.0')`. `units/PLT-04-api-composition-root.md` line 24: `/healthz` is "Unguarded forever (compose healthcheck and image smoke run before setup)".
- **F8.** `deploy/compose.yaml` line 40 `image: bbartolome/scriba:${SCRIBA_IMAGE_TAG:-latest}`; line 63 the in-container `fetch('http://127.0.0.1:8080/healthz')` healthcheck. `README.md` line 28 is the one-liner; lines 51 to 58 the rollback ("Set `SCRIBA_IMAGE_TAG` in `.env` to the older tag", no fixed tag). `deploy/RUNBOOK.md` line 87 is `## Pre-release checklist`. `git ls-files '*.md'` outside `plans/`, `units/`, `modules/` and `docs/` lists only `README.md` and `deploy/RUNBOOK.md`; `git ls-files examples` lists only `examples/.gitkeep`; `docs/` holds `adr/0001-tailscale-serve-mechanism.md`; no `LICENSE` file exists.
- **F9.** The unit (`units/PLT-19-publish-workflow.md` lines 14 to 45), `modules/platform.md` lines 20, 30, 39, 51, 57 to 59, and `units/README.md` lines 64 and 78 read as quoted in section 1a. `prompt.md` line 7 (work that is not committed is lost), lines 78 and 79 (code mode: a worktree on `unit/<ID>`; "If it exists, the subagent continues from its commits"; then `npm ci`), line 82 (commit after each complete part, with the unit id), lines 97 and 112 (fixes sent to the unit's subagent after a review or a failing check, committed with the unit id), lines 99 to 101 (the three-rejection rule), line 136 and lines 138 to 144 ("Criteria that you cannot test").
- **F10.** `grep -rn PLT-19 units/ modules/` lists: `units/CEX-15-export-gate-image-smoke.md` line 7 (`blocked_by`), `units/PLT-13-playwright-harness-e2e.md` line 24 (prose), `units/PLT-18-update-rerun-rollback.md` line 9 (`unblocks: [PLT-19]`), `modules/platform.md` lines 20 and 30, `modules/compile-export.md` line 25, `units/README.md` line 78, and this unit's own file. `grep -rn ci-publish units/` lists CEX-15 line 7, `units/README.md` line 78 and this unit's lines 5 and 14. CEX-15 lines 17, 21 and 22; `units/GNP-05-core-gate.md` line 17 ("in Platform's image smoke"); `units/SAU-10-compose-version-status.md` line 21 (quotes the one-liner); `units/SAU-08-token-guard-gate.md` line 33 and `units/SAU-16-setup-flow-gate.md` line 24 (name it); `units/SAU-21-tailnet-gate.md` line 17; `units/PLT-10-ci-workflow.md` line 19; `units/PST-11-nonfiction-sample-skeleton.md` line 20 (`sources/outline.md`).
- **F11.** `units/PLT-14-dockerfile-entrypoint.md` lines 36 and 40 (criteria 1 and 5) are `- [ ]`. `plans/PLT-14.md` (status `done`): lines 123 and 124 (Pandoc `3.13`, Typst `0.15.1` first lines), 127 (the `du -sxk /` size measure as `--user 0`), 130 and 132 (the `-w /tmp` PDF check and the `PK` check), 136 to 160 (criterion 2: no mount exits 1; a writable `/books` gives `200 {"status":"ok","version":"1.2.3"}`), 159 (the shell runs in a container; `127.0.0.1` does not reach a published port), 193 to 198 (the criterion 4 FTS5 command), 217, 225, 228, 229, 256, 273 (open point 2), 276 (open point 5) and 278 (open point 7). `plans/PLT-15.md`, `plans/PLT-16.md`, `plans/PLT-17.md`, `plans/PLT-18.md`, `plans/PLT-13.md` and `plans/PLT-10.md` have `status: done`; their lines cited in section 5 read as quoted (`plans/PLT-17.md` 44, 187, 244; `plans/PLT-18.md` 189, 194; `plans/PLT-16.md` 231; `plans/PLT-15.md` 337; `plans/PLT-13.md` 271; `plans/PLT-10.md` 19, 123).
- **F12.** `plans/DECISIONS.md` lines 35 (PLT-01, root tests use `node:test`), 604 (PLT-11), 728 (a driver's PLT-13 decision, not a precedent), 757, 762, 774, 785 (the PLT-14 reviewer ran criterion 2(b) with a tmpfs `/books`), 2383, 2605, 2606, 2775, 2863; and the PLT-19 entries at lines 2932, 3120, 3154, 3203 (with the rejection of option (b) at line 3207), 3223, 3232, 3276 and 3285, read in full.
- **F13.** Tride (`/Users/bbartolome/workspace/tride/.github/workflows/publish.yml`, outside this repository, read for structure only): line 9 `tags: ['v*']`; line 10 `paths-ignore`; lines 27 to 97 the per-arch build by digest with `fail-fast: false` (line 31), `ubuntu-24.04-arm` (line 37), `setup-buildx-action@v3` (61), `login-action@v3` (68) with `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (70 and 71), `build-push-action@v6` (75); lines 99 to 140 the merge with `docker buildx imagetools create` (line 135) and `inspect` (line 140); line 144 onward the smoke job, which runs after `merge`. Tride has no semantic-release, so the `plan` and `release` jobs and the guard are new here, and this plan moves smoke before the tags.
- **F14.** `which docker jq act actionlint yamllint shellcheck gh npx curl sha256sum` prints `/usr/bin/docker`, `/usr/bin/jq`, `/usr/bin/gh`, `npx` (under `~/.n/bin`), `/usr/bin/curl` and `/usr/bin/sha256sum`, and nothing for `act`, `actionlint`, `yamllint`, `shellcheck`. `node -v` is `v26.13.0`; `uname -m` is `aarch64`; `bash --version` here is GNU bash 5.2.21. The rewriter ran none of these tools beyond `which`, `node -v`, `uname -m`, `bash --version`, `prettier --file-info` and the two scratch `node` runs of F17.
- **F15.** `scripts/` today holds `boundaries.test.mjs`, `build-image.sh`, `check-pr-title.mjs`, `ci-workflow.test.mjs`, `entrypoint.sh`, `examples-check/`, `examples-check.test.mjs`, `pins.test.mjs`, `pr-title.test.mjs`, `subpaths.test.mjs`, `web-proxy.test.mjs`; no file of this plan's names exists. `scripts/check-pr-title.mjs` line 4 holds the title pattern with an optional `!`.
- **F16.** `scripts/examples-check/m1.mjs` lines 25 to 33 (a test file is `*.test|spec.(ts|mjs|cjs|js)`; only `scripts/examples-check*.test.mjs` is exempt; R1, line 30, matches `examples/` at the start of a line or after a slash or a quote character, and `/examples` followed by a quote character; R2, lines 32 and 33, a quoted `examples` on a line that also has root, repo, here, dirname or cwd), line 53 (the check runs the scan), lines 201 to 229 (`checkTestFiles` and `namesExamples`; each matching line is an issue); `scripts/examples-check/index.mjs` returns 1 when any issue is found.
- **F17.** Scratch runs with `node v26.13.0`, in a `mktemp -d` folder outside the repository (removed afterwards): two test files with three top-level `test` calls that read a missing file, fail an assertion with the message `W2 (i) part`, and import a missing module. `node --test --test-reporter=tap <both files>` printed `not ok 1 - W1 x`, `not ok 2 - W2 y` with the message `W2 (i) part` in its failure block, `not ok 3 - P1 z`, `# tests 3`, `# pass 0`, `# fail 3`; the same run without `--test-reporter` printed `✖ W1 x …` and `ℹ tests 3`, `ℹ pass 0`, `ℹ fail 3`, with no `not ok` and no `#` line. In the repository root, `node -e "…require('yaml').parse(…)…"` loads the `yaml` devDependency and returns a string for a `x.y.z` value (step 0, state F).
- **F18.** `scripts/ci-workflow.test.mjs` lines 8 to 12: `here = dirname(fileURLToPath(import.meta.url))` and the default path `join(here, '..', '.github', 'workflows', 'ci.yml')`, overridable by `CI_WORKFLOW_PATH`; lines 16 to 18 read the file inside `loadWorkflow()`, which a test calls in its own body (line 43). `deploy/RUNBOOK.md` line 87 is `## Pre-release checklist`; from `docs/RELEASING.md` the link `../deploy/RUNBOOK.md` names that file. `plans/SHL-12.md` at `952411a` (revision 6, unchanged at `c0c7863`): line 104 is the `package-lock.json` row of its changed-files table and line 115 the `package-lock.json` row of its shared-files table.

### 7b. Assumed (not verified here)

- **A1 (ASSUMED). semantic-release behaviour (no network, no npm in this rewrite).** (i) The newest version admits Node 26 (step 1(a) checks). (ii) `--dry-run` runs `verifyConditions`, `analyzeCommits`, `verifyRelease` and `generateNotes`, but no `prepare` or `publish`; `verifyRelease` is not called when no release is due. (iii) The dry run still checks push access, so `plan` needs `contents: write`. (iv) The first release is `1.0.0`. (v) With the default angular preset, `feat` is minor, `fix`, `perf` and `revert` are patch, other types do not release, a `BREAKING CHANGE:` footer is major, and `feat!:` is not parsed as a type. (vi) On a branch that is behind its remote, or on a branch other than `main`, it logs and exits 0 with no release. (vii) A relative plugin path such as `./scripts/release-guard.mjs` is resolved from the working folder, and an ESM plugin with a named `verifyRelease` export loads. (viii) The built-in plugins are found when semantic-release runs from `npx`, while an extra preset package would not be (O3). (ix) `@semantic-release/github` accepts `successComment`, `failComment`, `failTitle` and `releasedLabels` as `false`, and then needs only `contents: write`. (x) The tag is a lightweight tag on `HEAD`, so `git/ref/tags/<tag>` returns the commit SHA in `.object.sha`. (xi) `--no-ci` lets it run outside Actions in S-P2, and a local bare repository works as `origin`. (xii) It pushes the tag through a URL that carries `GITHUB_TOKEN`, so `persist-credentials: false` on the checkout does not stop the push. S-P2 checks (ii), (iv), (v), (vii), (xi) and the guard; the rest wait for the first real run.
- **A2 (ASSUMED). `docker buildx imagetools create --dry-run`** exists, needs no `-t`, pushes nothing, and prints the merged index as JSON on stdout. Step 1(b) checks the flag; S-P1 checks the output if the registry is reachable.
- **A3 (ASSUMED). `imagetools` talks to a `localhost:<port>` registry over plain HTTP, a `registry:2` container is reachable from the shell, and `imagetools inspect --raw` prints the manifest bytes exactly** (S-P1's digest guard checks the last). The shell may run in a container (`plans/PLT-14.md` line 159); S-P1 has a stop rule.
- **A4 (ASSUMED). GitHub-hosted runner and Actions facts.** `ubuntu-24.04-arm` exists and is free for a public repository (Tride relies on it, Tride line 37); the runner images have Docker with buildx, `gh` and `node`; a job whose `if` has no status function gets an implicit `success()`, so a job whose `needs` failed is skipped; an expression `needs.plan.outputs.x` is a string; a concurrency group keeps at most one pending run, and a newer one cancels it (D10).
- **A5 (ASSUMED). Action versions.** `actions/checkout@v7`, `setup-node@v7` and `upload-artifact@v7` exist (they are the pins `ci.yml` already uses, lines 13, 14 and 38; not checked against GitHub here). `actions/download-artifact@v7` is new to this repository and is ASSUMED to exist beside `upload-artifact@v7` until step 1(c) checks the tag. `docker/setup-buildx-action@v3`, `docker/login-action@v3` and `docker/build-push-action@v6` work as in Tride.
- **A6 (ASSUMED). Repository settings.** The GitHub repository is public, has the two secrets, a public Docker Hub repository `bbartolome/scriba` exists, and CI is required on pull requests before merging.
- **A7 (ASSUMED). `docker run --tmpfs /books:rw,mode=1777`** gives UID 1000 a writable `/books` on a runner and on Docker Desktop. The PLT-14 reviewer used a tmpfs `/books` (`plans/DECISIONS.md` line 785); S-P3 runs the exact option string.
- **A8 (ASSUMED). `provenance: false` with `push-by-digest=true`** pushes a plain image manifest (not an index), and `steps.<id>.outputs.digest` of `docker/build-push-action` is its digest.
- **A9 (ASSUMED). A tag pushed with `GITHUB_TOKEN` starts no workflow.** Stated by the unit (line 28); platform behaviour, not tested, and W7 makes criterion 5 independent of it.
- **A10 (ASSUMED). The `size` check's compressed figure** (the sum of `layers[].size` from `imagetools inspect --raw` on a single-platform digest) works on a runner after the login.
- **A11 (ASSUMED). Image facts unchanged since PLT-14:** `pandoc --version` starts with `pandoc 3.13`, `typst --version` starts with `typst 0.15.1`, `node:sqlite` has FTS5, and `/healthz` answers on `127.0.0.1:8080` inside the container without a sidecar. These are PLT-14's measured results (F11); S-P3 re-checks them on a fresh build.
- **A12 (ASSUMED). The scripts and tests run under bash 3.2 (macOS) and GNU bash 5** with `node`, `sort`, `head`, `grep`, `mktemp` on `PATH`; the stub `docker` is a shell script first on `PATH`. Only bash 5.2 is present here (F14).

## 8. Shared files

This plan changes no file that another unit of this batch (SAU-06, AGL-01, PST-02, PST-11, SHL-10, SHL-11, MPR-09, SHL-12, TRG-01) is expected to change; their file tables list no path of section 2. The changes are correct in either merge order.

- `.github/workflows/publish.yml` (new): only this unit writes it. CEX-15, a later unit, appends one step to the `smoke` job (section 5); that edit is additive and needs no change here.
- `package.json` and `package-lock.json`: not changed (D2). SHL-12 changes `package-lock.json` (`plans/SHL-12.md` lines 104 and 115, at `952411a`); this plan's tests need only the `yaml` and `prettier` devDependencies already present, and the worktree runs `npm ci` after a rebase (step 0). The new `scripts/*.test.mjs` files join the root `npm test` glob (`package.json` line 25) with no edit.
- `scripts/`: eight new files (`publish-plan.sh`, `publish-merge.sh`, `smoke-image.sh`, `release-guard.mjs`, `publish-test-kit.mjs`, and the three `*.test.mjs`). The names do not collide with existing files (F15). `scripts/entrypoint.sh`, `scripts/build-image.sh`, `scripts/check-pr-title.mjs` and `scripts/examples-check/` are read, not changed. The examples check scans the three new test files (F16); they name no `examples/` (4.8), and no batch plan changes that check's rules.
- `examples/`: PST-11 adds `examples/nonfiction/**` with Markdown (`plans/PST-11.md` lines 50 to 60). Those files ship in the image (Dockerfile line 59) and are not in `paths-ignore` (D18), so their merge to `main` publishes, in either order.
- `docs/RELEASING.md` (new) and `.releaserc.json` (new): only this unit.
- `README.md`, `deploy/RUNBOOK.md`, `deploy/compose.yaml`, `Dockerfile`, `.github/workflows/ci.yml`, `.prettierignore`, `.gitignore`, `.dockerignore`: not changed. W11 reads `deploy/RUNBOOK.md` at its repository path (never relative to `RELEASING_PATH`, 4.6) for one heading (`## Pre-release checklist`), so another unit may add rows to its table without effect; renaming or moving that heading or file would fail W11.
- Citations of this plan by other plans, at `c0c7863`: `plans/MPR-09.md` line 290, `plans/SHL-10.md` lines 273 and 308 and `plans/SHL-12.md` lines 53, 113, 114 and 298 cite lines 106, 626 and 629 of revision 6, each pinned to `68d6179`; the statements they cite (no change to `package.json` or `package-lock.json`, section 2; the batch list and "no file shared with the batch", section 8; `npm ci` after a rebase, this section and step 0) are kept in this revision, at other line numbers. `plans/PST-11.md` lines 188 and 207 cite D18 as "line 52" (an older revision); D18 and its `paths-ignore` list are unchanged.
- `plans/DECISIONS.md` and `units/PLT-19-publish-workflow.md`: not edited by this plan; the orchestrator records the review results and ticks the boxes by the rule of O1.
- Prettier: `npm run lint` runs `prettier --check .`, so the new `.yml`, `.json`, `.md` and `.mjs` files must be formatted (step 7). Any unit that adds a file under `scripts/` or `docs/` has the same duty; there is no conflict.
