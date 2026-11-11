---
id: PLT-10
status: planned
---
# PLT-10 plan — ci.yml — one job (npm ci → lint → test → build) plus PR-title check

Batch: [PLT-02, PLT-03, PLT-09, PLT-10] (Platform, phase:scaffold, M1). Revision 2, revised after the DECISIONS 2026-11-11 Opus reviews.

## 1. Decisions this plan follows

- One job on `pull_request` and `push` to `main`, no `paths` filter; steps npm ci → lint → test → build. Source: unit lines 18, 24, 25.
- On PRs, the title must be a Conventional Commit. Source: unit lines 19, 26.
- Node version from `.nvmrc` (26); npm cache keyed on `package-lock.json`. Source: unit line 20; `.nvmrc`; PLT-01 plan section 1 (Node 26).
- Later modules extend the job additively, so the job keeps no structure that blocks that (single job, named steps, no `needs`). Source: unit line 21; PLT-13 unit line 29; CEX-10 unit line 21.
- The CI order stays npm ci → lint → test → build. The contracts package's own test script builds first (PLT-02 uses `npm run build && vitest run`, `plans/PLT-02.md` line 16), so the Test step needs no separate build step. Source: DECISIONS.md, "2026-11-11 — PLT-02 — mismatch 2".
- `npm run lint` stays green because the PLT-09 lint-fixture folder is excluded from the root ESLint config. Source: DECISIONS.md, "2026-11-11 — PLT-09 — mismatch 3".
- Criterion 4 keeps its text. It is recorded as "deferred to PLT-11, not testable here (no remote or runner)", with a labelled structural proxy. Source: DECISIONS.md, "2026-11-10 — PLT-10 — mismatch 1".
- Root `lint` is `npm run lint --workspaces && prettier --check .`, so `.github/workflows/ci.yml` and the new `scripts/*.mjs` files are Prettier-checked. Source: PLT-01 plan sections 1 and 2.
- Root-owned script tests use `node:test` and run from the root `test` script, as `scripts/pins.test.mjs` does. Source: DECISIONS.md, "2026-11-10 — PLT-01 — location and coverage of the pin-section test". See section 6, item 6.
- Tests read files on disk and process exit codes only. Source: modules/platform.md, Testing principles.
- The workflow cannot run in this environment: there is no GitHub remote and no runner. Every local check covers the file, the title script or the test order. Source: DECISIONS.md, 2026-11-10 PLT-01 entries (no git remote).

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | new | The one job `ci`, its triggers and steps (content below). |
| `scripts/check-pr-title.mjs` | new | Reads `PR_TITLE` from the environment. Exit 0 if it matches the header pattern below, exit 1 otherwise, and prints the rejected title to stderr. |
| `scripts/pr-title.test.mjs` | new | `node:test`. Runs the script as a child process for each test title. |
| `scripts/ci-workflow.test.mjs` | new | `node:test`. Parses `ci.yml` with the `yaml` package. Holds the criterion 1, 2 and 4-proxy tests and the decision checks. |
| `package.json` (root) | changed | `devDependencies` gains `yaml` at an exact version. The `test` line is not edited: the root glob set by PLT-03 picks up both new test files (DECISIONS 2026-11-11; PLT-03 is merged first). |
| `package-lock.json` | changed | Updated by the `yaml` install. It stays the only lockfile. |

Not changed: `units/PLT-10-ci-workflow.md`, `.prettierignore`, `eslint.config.mjs`, `.nvmrc`, the workspaces, and `.github/workflows/publish.yml` (PLT-19, not yet present).

Header pattern (the Conventional Commit header check):
`^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([A-Za-z0-9._-]+\))?!?: \S.*$`
The scope charset admits `PLT-09`-style scopes, because the repo's own commits use them (for example `docs(PLT-09)`).

`ci.yml` content (fixed by this plan):

```yaml
name: ci
on:
  pull_request:
    types: [opened, reopened, edited, synchronize]
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: package-lock.json
      - name: Check PR title
        if: github.event_name == 'pull_request'
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
        run: node scripts/check-pr-title.mjs
      - name: Install
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Test
        run: npm test
      - name: Build
        run: npm run build
```

The title is passed through `env`, never interpolated into `run`, so a title cannot inject shell code.

## 3. Method

These commands run at implementation, not in this planning iteration. Run them from the repo root on Node 26 (the `.nvmrc` value), and record `node -v` and `npm -v` next to each result.

1. Resolve the parser version: `npm view yaml version`. Expected: one version string, recorded for step 5. Then `npm view yaml@<version> dependencies`. Expected: no output (no runtime dependencies).
2. Create branch `unit/PLT-10` from `main`. Expected: `git branch --show-current` prints `unit/PLT-10`.
3. Write `scripts/check-pr-title.mjs`. Check: `PR_TITLE='update stuff' node scripts/check-pr-title.mjs; echo $?` prints the rejection on stderr and `1`. `PR_TITLE='feat(platform): scaffold' node scripts/check-pr-title.mjs; echo $?` prints `0`.
4. Write `scripts/pr-title.test.mjs`. Three cases, each run with `spawnSync(process.execPath, [script], { env: { ...process.env, PR_TITLE: title } })`: `update stuff` gives status 1; `feat(platform): scaffold` gives status 0; the empty string gives status 1. Run `node --test scripts/pr-title.test.mjs`. Expected: `# tests 3`, `# fail 0`, exit 0.
5. Install the parser: `npm install --save-dev --save-exact yaml@<version>`. Expected: exit 0; `npm ls yaml` shows one version; `package-lock.json` changes.
6. Write `.github/workflows/ci.yml` (section 2). Run `npx prettier --write .github/workflows/ci.yml`, then `npx prettier --check .github/workflows/ci.yml`. Expected: exit 0. Then check the action majors, if the network is available: `gh api repos/actions/checkout/releases/latest --jq .tag_name` and the same for `actions/setup-node`. Expected: a major tag. If a major differs from `v4`, change the file to that major and record it.
7. Write `scripts/ci-workflow.test.mjs`. It reads `process.env.CI_WORKFLOW_PATH`, or the repo file if unset. The override exists only for step 9. Run `node --test scripts/ci-workflow.test.mjs`. Expected: `# fail 0`, exit 0. The `yaml` package parses the key as the string `on`, because it defaults to YAML 1.2. The test asserts the key by that name.
8. Precondition: PLT-03 is merged first. No edit to the root `test` line (DECISIONS 2026-11-11). The root glob `node --test 'scripts/*.test.mjs'` runs `scripts/pr-title.test.mjs` and `scripts/ci-workflow.test.mjs` once the files exist. Run `npx prettier --write package.json` (the `yaml` install changed it), then `npx prettier --check .`. Expected: exit 0.
9. Mutation checks, outside the repo: `mkdir -p /tmp/plt10-mut/`, then copy `ci.yml` to two mutants.
   - `ci-paths.yml`: add `paths: ['apps/**']` under `push`. Run `CI_WORKFLOW_PATH=/tmp/plt10-mut/ci-paths.yml node --test scripts/ci-workflow.test.mjs`. Expected: non-zero exit, and the criterion 1 test fails.
   - `ci-swap.yml`: move the `Test` step above the `Lint` step. Run the same way. Expected: non-zero exit, and the criterion 2 test fails.
   Then run step 7's command with no override. Expected: exit 0. Report all three results.
10. From the root, run `node --test scripts/pins.test.mjs scripts/pr-title.test.mjs scripts/ci-workflow.test.mjs`, `npm test`, `npm run lint` and `npm run build`. Expected: each exit 0. If `npm test` or `npm run lint` fails on a file that another unit owns (PLT-02 or PLT-09), record that file and do not fix it in this PR.
11. Commit on `unit/PLT-10`, with only the section 2 files. Do not push (no remote).
12. Fresh clone: `git clone -b unit/PLT-10 --no-hardlinks <repo> <tmp>/fresh`. In the clone, run `npm ci`, then the three `node --test` commands from step 10. Expected: all exit 0. This shows that the committed files alone pass.
13. Driver merge step, as for PLT-01: tick criteria 1 to 3 after review. Criterion 4 stays unticked.

## 4. Acceptance criteria and tests

No checkbox is marked passed in this plan. Every `node --test` run must print `# fail 0` and a non-zero `# tests` count. The workflow file is read from disk; no runner is involved.

| # | Criterion (exact, unit lines 24 to 27) | Test file and seam | Command | Pass condition |
|---|---|---|---|---|
| 1 | The workflow runs on `pull_request` and `push` to `main` with no `paths` filter. | `scripts/ci-workflow.test.mjs`, test "criterion 1"; the parsed file on disk | `node --test scripts/ci-workflow.test.mjs` | Exit 0. The `on` keys are exactly `pull_request` and `push`; `push.branches` is `['main']`; neither event has `paths` or `paths-ignore`. |
| 2 | Steps run in order npm ci → lint → test → build in a single job. | same file, test "criterion 2"; the parsed file | same command | Exit 0. `jobs` has one key. The `run` values `npm ci`, `npm run lint`, `npm test` and `npm run build` each occur exactly once, in that index order. Other steps may sit between them. |
| 3 | A PR titled `update stuff` fails the title check; `feat(platform): scaffold` passes. | `scripts/pr-title.test.mjs`; the script's exit code in a child process with `PR_TITLE` set | `node --test scripts/pr-title.test.mjs` | Exit 0. `update stuff` gives 1; `feat(platform): scaffold` gives 0. The empty title also gives 1 (extra case). On `pull_request` events the CI step supplies the event title (decision check below). |
| 4 | `ci.yml` is green on the scaffold PR (verified at PLT-11). | Deferred to PLT-11. Not testable here (no remote or runner). Labelled PROXY, not the green-on-PR check: test "criterion 4 PROXY" in `scripts/ci-workflow.test.mjs` | `node --test scripts/ci-workflow.test.mjs` | Status: not testable here. The proxy passes only if the file parses as YAML, has one job, and orders npm ci → lint → test → build. That shows the file is structurally valid. It is not evidence that the job is green. The checkbox stays unmarked. |

Decision checks, not acceptance criteria, in `scripts/ci-workflow.test.mjs`: the setup-node step has `node-version-file: .nvmrc`, no `node-version` key, `cache: npm` and `cache-dependency-path: package-lock.json`. The title step has an `if` naming `pull_request`, its `env.PR_TITLE` is `${{ github.event.pull_request.title }}`, and its `run` does not contain `github.event`.

The criterion 4 proxy shares its assertions with criteria 1 and 2 and adds only the YAML parse. Section 6, item 12 records the decision that accepts it.

## 5. Downstream agreement

- **PLT-11 (scaffold gate).** Needs `ci.yml` present, one job, the four steps in order, and root `build`, `test` and `lint` covering every workspace. PLT-10 provides the file and the local checks. PLT-11's criterion 5 ("`ci.yml` is green on this PR") is PLT-11's own check and needs a remote. No conflict.
- **PLT-13 (e2e step).** Its unit (line 29) appends an `e2e` step to this job after build. The job ends at build, so the step goes last. Criterion 2 checks only the four named steps' relative order, so the appended step passes. No conflict.
- **PLT-20 (examples check, lint layer).** Wired into root `npm run lint` (its unit line 18), so the existing lint step runs it. It needs no change to `ci.yml` and must not add a job. No conflict.
- **CEX-10 (Pandoc 3.13 and Typst).** Adds an install step and a CI flag (its unit line 21). PLT-10 leaves the job's steps named and the job-level `env` empty, so CEX-10 can insert its install step before `Test`. Criterion 2 allows that. No conflict.
- **PLT-02 (contracts test script).** Mismatch 2 relies on it: the contracts package's own test script builds first (`npm run build && vitest run`, `plans/PLT-02.md` line 16). PLT-10 adds no build-before-test step. If PLT-02 drops that chain, the Test step fails in contracts. That is PLT-02's obligation.
- **PLT-09 (lint fixtures).** The `Lint` step is green only if PLT-09 excludes its fixture folder from the root ESLint config (mismatch 3). The root `prettier --check .` also reaches any `.ts` fixture that is not in `.prettierignore`, so PLT-09's plan must keep fixtures Prettier-clean or ignore them. PLT-10's own tests do not run lint, so only criterion 4 depends on PLT-09.
- **PLT-12 (mock server, possibly `e2e/` as a workspace) (conflict risk).** PLT-01 plan section 5 says PLT-12 may edit the root `package.json` (the `test` script) and the root lockfile. PLT-10 no longer edits the `test` line (the glob, DECISIONS 2026-11-11). It still adds `yaml` to the root lockfile, so whichever of PLT-10 and PLT-12 merges second rebases the lockfile and reruns `npm test`. This is a merge conflict on the lockfile, not a logic conflict.
- **PLT-19 (publish.yml, semantic-release).** PLT-10 does not touch `publish.yml`. The title types accepted here include types that semantic-release does not release (`docs`, `chore`, and others). PLT-19 owns the release rules, so there is no conflict.

## 6. Choices (settled by the Navigator, DECISIONS 2026-11-10 and 2026-11-11)

Point 1 is the decided PR-title method. Points 2 to 6, 11 and 12 are accepted as drafted (DECISIONS 2026-11-11, PLT-10 smaller plan choices). Points 7 to 10 are implementation details.

1. **PR-title method (a choice).** This plan uses a local Node script, `scripts/check-pr-title.mjs`, tested with `node:test`. Rejected: (a) a third-party action such as `amannn/action-semantic-pull-request`. It cannot be run or tested here without the network, and it adds third-party code that runs with a token. (b) An inline regex in the YAML: no test would run it. The chosen method runs locally against both titles and receives the event title through `env` on pull_request events. Decided (DECISIONS 2026-11-11, PR-title method).
2. **Title type list and scope.** The 11 Angular-convention types, a scope of `[A-Za-z0-9._-]+`, and `!` allowed. Decided (DECISIONS 2026-11-11, smaller choices item 1).
3. **`edited` in the trigger types.** Without it, a retitled PR is not re-checked. Decided (DECISIONS 2026-11-11, smaller choices item 2).
4. **Position of the title step.** After checkout and setup-node, before `npm ci`, so it fails fast. The four named steps stay in order. The alternative is the last step. Decided (DECISIONS 2026-11-11, smaller choices item 3).
5. **New root devDependency `yaml`.** Node has no built-in YAML parser, and the structural tests need one. Alternatives: rely on `prettier --check` (checks syntax only, not job structure), or a line-based check (weak). Chosen: `yaml`. Decided (DECISIONS 2026-11-11, smaller choices item 4).
6. **`node:test` versus "Vitest everywhere".** modules/platform.md says Vitest everywhere. This plan follows the PLT-01 precedent for root-owned script tests. Decided (DECISIONS 2026-11-11, smaller choices item 5).
7. **Action majors.** `actions/checkout@v4` and `actions/setup-node@v4` are GitHub-maintained, not third-party. Nothing here runs them. The majors are unverified without the network; step 6 checks them if the network is available.
8. **Runner.** `ubuntu-latest`, not a pinned image. Navigator may pin.
9. **Not added:** `actionlint` and `act`. Both need a download, and no criterion requires them.
10. **Date of mismatch 1.** The driver's brief dates the mismatch 1 entry 2026-11-11. The DECISIONS.md header says 2026-11-10. This plan cites the header.
11. **`CI_WORKFLOW_PATH` override.** A test seam added only for the mutation checks in step 9. Decided (DECISIONS 2026-11-11, smaller choices item 6): the override serves the mutation checks only.
12. **Criterion 4 proxy.** The criterion text is unchanged. The proxy adds only the YAML parse over criteria 1 and 2. Decided (DECISIONS 2026-11-11, smaller choices item 7): a labelled structural proxy is enough for the deferral.
