---
id: PLT-11
status: planned
---

# PLT-11 plan — scaffold gate: dev script, build order, subpath checks, end-to-end checks

Batch: [PLT-11] (Platform, phase:scaffold, M1); the gate unit, batch of one. Revision 4.

## Revision 4 changes

- Step 0 (and the port rule of revision 3): the PID lookup no longer uses `lsof`, which this machine lacks, nor `ss` or `netstat`. It reads the LISTEN sockets (state `0A`, port in hex) from `/proc/net/tcp` and `/proc/net/tcp6`, matches each inode to a `socket:[inode]` link under `/proc/<pid>/fd`, and reads the command line from `/proc/<pid>/cmdline`, with `ps -eo pid,args` as the fallback. It reports the PID and never kills. The method was run read-only on this machine.
- Section 7: HEAD is `67056c5`, a docs-only commit after `76461e3`. `git diff --quiet 76461e3 HEAD -- ':!plans'` passes.
- Section 7: the descendant skip is cited to `commonjs-checker.js` line 102. The `if` at line 73 and its `continue` at line 74 handle exact matches only.
- Section 7: the lint command is named: `npm run lint --workspaces && prettier --check .`.
- Section 7: the owners of ports 4200 and 8080 are recorded as observed. Step 0 therefore stops on this machine until they are free.

## Revision 3 changes

- Ports: before and after each dev-stack run (steps 0, 9 and 14, and AC 1), ports 4200 and 8080 must refuse connections. If one answers, stop and report the PID (method in step 0). Do not kill it.
- Step 11: `scripts/ci-workflow.test.mjs` has 5 tests, so the expected result is "5 pass".
- Step 0: a HEAD later than `76461e3` is accepted when `git diff --quiet 76461e3 HEAD -- ':!plans'` passes. The run uses the driver's worktree on `unit/PLT-11`; `git switch -c` is not run.
- Reporting: step 15, section 6 point 2 and AC 1 report results. The driver ticks the boxes (prompt.md step 8), so the draft sentence in step 15 is dropped.
- Angular CommonJS: decision 5, step 7, section 5 and the section 7 fact use the single name `@bbartolome/scriba-contracts`. The packed source confirms the matching rules (section 7, checked).
- Citations: decision 6 cites PLT-03 section 1 bullets 4 and 16 (not bullet 14). Decision 2's DECISIONS entry is 2026-11-11, line 403 (not 2026-11-12).

## Revision 2 changes

- Open point 1 (AC 5) is decided by the Navigator, option (a): DECISIONS entry "2026-11-12 — PLT-11 — acceptance criterion 5", commit 76461e3. Section 4 (AC 5), step 14 and section 6 point 1 now name the three local proxies. Step 14 runs the commands in CI order (npm ci, lint, test, build) under Node 26.
- Open point 2 (SSE buffering) is decided by the driver, option (A). Section 4 (AC 1) and section 6 point 2 changed.
- Open point 3 (the Angular fixture) is decided by the driver, option (a). Section 6 point 3 changed.
- The base moved from `afed8ef` to `76461e3`, a docs-only commit that adds the criterion 5 entry. Step 0 and section 7 changed. No code fact changed.
- Nothing else changed. Status stays `draft`.

Base: `main` at `76461e3` or a later commit that changes only `plans/` (step 0). `76461e3` is a docs-only commit on top of `afed8ef` (checked in section 7). This machine has no git remote, no pull request and no CI. Node v26.13.0 and npm 11.20.0 are on the PATH.

## 1. Decisions this plan follows

1. **`npm run dev` shape.** Build contracts and the API once, then run four processes under `concurrently`: contracts `tsc --watch`, API `tsc --watch` into `apps/api/dist`, `node --watch apps/api/dist/main.js`, and the Angular dev server (`npm run start -w @bbartolome/scriba-web`). The one-time build avoids a race with the first emit. No package is added for the watch.
   - Source: unit line 20; PLT-03 DECISIONS 2026-11-11 (web provides `start`, PLT-11 owns the root `dev`); PLT-04 section 5, PLT-11 row (the watch option is left to PLT-11); DECISIONS 2026-11-12 line 478.
2. **Dev environment, set on the API process only.** `SCRIBA_BOOKS_DIR=$PWD/.scriba-dev`, `SCRIBA_PACKS_DIR=$PWD/packages/packs`, `SCRIBA_EXAMPLES_DIR=$PWD/examples`, `SCRIBA_DEV_ORIGINS=http://localhost:4200`, `SCRIBA_SETUP_URL_BASE=http://localhost:4200`.
   - Source: unit line 20; PLT-01 unit line 27 (git-ignored repo-local library; packs and examples dirs); `.gitignore` (`.scriba-dev/`); PLT-04 section 1 bullet 5 (the three dirs must be absolute) and DECISIONS 2026-11-11 (PLT-04 plan review of revision 1, item 9, line 403).
   - The origin `http://localhost:4200` is the Angular dev-server default (section 7), as SHL-01 line 20 and SAU-02 line 20 assume.
3. **Build order.** Root `build` runs contracts first, then API, web and packs.
   - Source: unit line 21 ("contracts, then API and web"); PLT-01 unit line 18; PLT-04 section 1 bullet 16 (API tests import the built contracts); DECISIONS 2026-11-11 mismatch 2.
   - Root `test` and `lint` are not changed (DECISIONS 2026-11-11 root glob; PLT-03 section 6 point 7).
4. **Subpath checks.** The API-runtime leg is a root-owned `node:test` file, `scripts/subpaths.test.mjs`, which requires each subpath from `apps/api`'s own resolution context. The Angular leg is a build-time fixture in `apps/web`. `packages/contracts/test/boot.test.ts` is not edited.
   - Source: unit lines 22 and 30; PLT-02 sections 4 and 5 (workspace-level resolution is PLT-11 criterion 3); DECISIONS 2026-11-11 PLT-09 criterion 4 disposition (line 260).
5. **Angular and CommonJS (checked, section 7).** Contracts emits CommonJS (its `package.json` has no `type`). The CommonJS check runs only in optimized (production) builds, and it reports each subpath module once. An allowed entry also covers deep imports (`startsWith(allowed + '/')`). The plan lists the single name `@bbartolome/scriba-contracts` in `allowedCommonJsDependencies`. It covers all ten subpaths and any subpath added later; ten names would need an edit for each new module. `"*"` is not used. If a warning remains for another package, the build still passes, and the PR reports it. ESM stays rejected.
   - Source: DECISIONS 2026-11-11 CommonJS entry (line 173) and 2026-11-12 (line 465); PLT-02 section 6 point 1; `@angular/build` 22.2.5 schema (section 7).
6. **Proxy.** Exactly `/api`, `/healthz` and `/events` to `http://127.0.0.1:8080`; SSE unbuffered. The JSON file stays (section 6 point 2).
   - Source: unit line 28; PLT-03 section 1 bullets 4 and 16, and section 6 point 5.
7. **Pin.** `concurrently` at the exact version `10.0.7`, the npm `latest` tag on 2026-11-12, as a root devDependency. At implementation, the rule is the same: the current `latest` tag, pinned exact.
   - Source: PLT-01 section 2 (root devDependencies are exact); PLT-09 section 3 step 3 (`--save-exact`).
8. **CI action majors.** `actions/checkout@v4` and `actions/setup-node@v4` change to `@v7`.
   - Source: PLT-10 section 6 item 7 and step 6 ("if a major differs from v4, change the file to that major and record it"); DECISIONS 2026-11-11 PLT-10 review note 2, which defers the check to PLT-11 criterion 5.
   - The tags were checked on 2026-11-12 (section 7). The decision test in `scripts/ci-workflow.test.mjs` matches the prefix `actions/setup-node@`, so it is unaffected.
9. **Lockfile.** Additive only, under the lockfile gate of DECISIONS 2026-11-11 (line 385: no existing package entry changes version or content). PLT-04 step 3 uses the same rule. No file names a "PLT-09 lockfile gate", so this plan uses the DECISIONS rule.
10. **README.** A root `README.md` with getting-started notes for module builders (unit line 25). Content in section 2.

No step below changes a settled decision in `modules/platform.md`.

## 2. Files to create or change

| Path | Root, web or api | Change | Purpose |
|---|---|---|---|
| `package.json` | root | edit `scripts.build`; add `scripts.dev`; add devDependency `concurrently` `10.0.7` | Decisions 1 to 3 and 7. `test`, `lint`, `workspaces`, `scribaPins`, `engines` and `packageManager` are unchanged |
| `package-lock.json` | root | changed by npm (step 2), additive | `concurrently` and its dependencies |
| `README.md` | root | new | Getting started: the commands; how to add a module (contract slice and subpath; one `@Module` line in `COMPOSED_MODULES`; `/api/<slug>/` prefix; `EventsPublisher`; `ModuleError` codes with the module prefix; `SettingsService` section; `createTestApp`); a note that the dev API listens on `0.0.0.0:8080` (PLT-04 section 1 bullet 1) |
| `scripts/subpaths.test.mjs` | root | new | API-runtime leg of criterion 3 (section 4) |
| `.github/workflows/ci.yml` | root (a PLT-10 file) | edit: `@v4` to `@v7` for both actions | Decision 8 |
| `apps/web/src/app/contracts-boot.fixture.ts` | web | new | Angular leg of criterion 3: one namespace import per subpath |
| `apps/web/src/main.ts` | web | one added line: `import './app/contracts-boot.fixture';` | Keeps the fixture in the build graph |
| `apps/web/angular.json` | web | only if the build warns: `allowedCommonJsDependencies` under `build.options` | Decision 5 |

Not changed: `apps/api/**` (PLT-04, PLT-07 and PLT-08 forbid edits to `apps/api/src`, and no test is needed there); `packages/contracts/**` (`boot.test.ts` is PLT-02's); `apps/web/proxy.conf.json`; `apps/web/package.json` (`start` is PLT-03's, and no package is added); `eslint.config.mjs`; `tsconfig.base.json`; `.prettierignore`; `.gitignore` (it already lists `.scriba-dev/` and `dist/`).

The new root scripts, as they appear in `package.json` (the inner quotes are escaped there):

```json
"build": "npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api -w @bbartolome/scriba-web -w @bbartolome/scriba-packs",
"dev": "npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && concurrently -n contracts,api-tsc,api,web \"tsc -p packages/contracts/tsconfig.build.json --watch --preserveWatchOutput\" \"tsc -p apps/api/tsconfig.build.json --watch --preserveWatchOutput\" \"SCRIBA_BOOKS_DIR=$PWD/.scriba-dev SCRIBA_PACKS_DIR=$PWD/packages/packs SCRIBA_EXAMPLES_DIR=$PWD/examples SCRIBA_DEV_ORIGINS=http://localhost:4200 SCRIBA_SETUP_URL_BASE=http://localhost:4200 node --watch apps/api/dist/main.js\" \"npm run start -w @bbartolome/scriba-web\""
```

Package added: `concurrently` 10.0.7 (root devDependency, exact). Its dependencies are installed by npm, with no direct entry: `chalk` 5.6.2, `rxjs` 7.8.2, `shell-quote` 1.12.0, `supports-color` 10.2.2, `tree-kill` 1.2.2 and `yargs` 18.0.0.

The Angular fixture, `apps/web/src/app/contracts-boot.fixture.ts`, has one namespace import per subpath (`platform`, `setup-auth`, `providers`, `project-store`, `tool-registry`, `agent-loop`, `graph-runner`, `compile-export`, `shell`, `genre-packs`). It exports one object, `CONTRACT_SUBPATHS`, that holds all ten. A comment says it is a build-time check and is not used at runtime.

## 3. Procedure

Run in the driver's worktree on branch `unit/PLT-11`, which the driver creates. Do not run `git switch -c`. Record `node -v` and `npm -v` with each result. Each step names its files.

0. **Precondition: the code on main is the code read for this plan.**
   - `git rev-parse --short HEAD` prints `76461e3` or a later commit, and `git diff --quiet 76461e3 HEAD -- ':!plans'` exits 0. `git status --short` prints nothing.
   - Root `scripts.test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'`.
   - `apps/web/proxy.conf.json` has the three keys; `apps/api/src/main.ts` calls `listen(8080, '0.0.0.0')`; `ci.yml` uses `@v4` twice.
   - Ports are free: `curl -s -o /dev/null http://localhost:4200/` and `curl -s -o /dev/null http://127.0.0.1:8080/healthz` must each fail to connect (curl exit code 7). If either connects, stop and report the owner, found with this Linux method (`lsof`, `ss` and `netstat` are not installed here):
     - `port=<port>; hex=$(printf '%04X' "$port")`
     - `inodes=$(awk -v h=":$hex" '$4=="0A" && $2 ~ h"$" {print $10}' /proc/net/tcp /proc/net/tcp6)`. State `0A` is LISTEN, and the port is in hex in the local address.
     - `for i in $inodes; do for fd in /proc/[0-9]*/fd/*; do [ "$(readlink "$fd" 2>/dev/null)" = "socket:[$i]" ] && echo "$fd" | cut -d/ -f3; done; done | sort -u` prints the PID.
     - The command line is read from `tr '\0' ' ' < /proc/<pid>/cmdline`. If that is unreadable, use `ps -eo pid,args | awk -v p=<pid> '$1==p'`.
     - The method reports only. Do not kill the process.
   - If any check differs, stop and report.
1. **Resolve pins (read-only).**
   - `npm view concurrently dist-tags.latest` (expect `10.0.7`); `npm view concurrently@<v> engines` (must admit Node 26).
   - `git ls-remote --tags https://github.com/actions/checkout 'refs/tags/v7'`, and the same for `actions/setup-node`. Each must print a tag.
2. **Install (files: `package.json`, `package-lock.json`).**
   - Run `npm ci` first. The working tree's `node_modules` lacks the Angular packages, and the lock is the source.
   - Run `npm install --save-dev --save-exact concurrently@10.0.7` at the root. Expected: exit 0, no ERESOLVE.
3. **Lock gate (file: `package-lock.json`).**
   - Run `git diff main -- package-lock.json`. Pass when no `version`, `resolved` or `integrity` of an existing package entry changes, and removed lines are at most the root entry's devDependencies lines that npm re-emits (the PLT-02 precedent, DECISIONS 2026-11-11 lines 387 and 388).
   - Expected new entries: `node_modules/concurrently`, `node_modules/shell-quote`, `node_modules/tree-kill`, and any nested copies under `node_modules/concurrently/node_modules/`. The top-level `supports-color` (8.1.1) and `yargs` (18.1.0) differ from what `concurrently` needs, so nested copies of 10.2.2 and 18.0.0 are expected. `chalk` 5.6.2 and `rxjs` 7.8.2 are already present and shared.
   - Then `npm ls concurrently` exits 0, and `npm ci` exits 0 again.
4. **Root scripts (file: `package.json`).** Set `build` and add `dev` as shown in section 2. Keep every other key. Run `npx prettier --write package.json`.
5. **Angular fixture (files: `apps/web/src/app/contracts-boot.fixture.ts`, `apps/web/src/main.ts`).** Create the fixture and the one-line side-effect import. Run `npx prettier --write` on both files.
6. **Contracts first.**
   - `npm run build -w @bbartolome/scriba-contracts` exits 0, and `ls packages/contracts/dist` lists the ten slug folders (PLT-02 step 6).
   - Then `npm run build -w @bbartolome/scriba-api` exits 0. The API build type-checks against the built contracts, so this order is required.
7. **Angular half (file: `apps/web/angular.json`, only if needed).**
   - `npm run build -w @bbartolome/scriba-web` exits 0.
   - If the output reports CommonJS warnings for the contracts subpaths, add `"@bbartolome/scriba-contracts"` to `build.options.allowedCommonJsDependencies` (decision 5), run `npx prettier --write apps/web/angular.json`, and rebuild. Expected: no contracts warning remains.
   - If a warning names another package, add that name and report why. Do not use `"*"`.
   - Report the warning text, if any.
8. **API-runtime leg (file: `scripts/subpaths.test.mjs`).** Create the file (section 4, AC 3). Run `node --test scripts/subpaths.test.mjs` after step 6: 2 pass. Run `npx prettier --write scripts/subpaths.test.mjs`.
9. **Dev stack (no file change).**
   - Before: the port check of step 0 must pass.
   - Run `npm run dev` in its own terminal, then the AC 1 checks against port 4200.
   - Run `test -d .scriba-dev/.scriba` (exit 0) and `git check-ignore -q .scriba-dev` (exit 0).
   - Stop the stack with Ctrl+C. After: the port check of step 0 must pass again, so both requests fail to connect. The unit's demo steps 2 to 4 are manual, and they are not criteria.
10. **README (file: `README.md`).** Write the content listed in section 2. Run `npx prettier --write README.md`.
11. **CI majors (file: `.github/workflows/ci.yml`).** Change `@v4` to `@v7` for both actions. Run `npx prettier --write .github/workflows/ci.yml`, then `node --test scripts/ci-workflow.test.mjs` (5 pass).
12. **Root gates (no file change).** From the root, `npm run build`, `npm test` and `npm run lint` each exit 0, with the banner counts of AC 2.
13. **Mutation checks (temporary edits; each is reverted, and `git diff` on that file is then empty).**
    - (a) In `packages/contracts/package.json`, delete the `./shell` key. `node --test scripts/subpaths.test.mjs` must fail. Restore the key.
    - (b) In `apps/web/src/app/contracts-boot.fixture.ts`, change the `shell` specifier to `@bbartolome/scriba-contracts/shell-x`. `npm run build -w @bbartolome/scriba-web` must fail. Restore it.
    - Record both results.
14. **Commit and fresh clone.**
    - Commit on `unit/PLT-11` (the driver commits).
    - `git clone -b unit/PLT-11 --no-hardlinks <repo> <tmp>/fresh`. In the clone, run `npm ci`, `npm run lint`, `npm test` and `npm run build`, in CI's order, under Node 26 from `.nvmrc` (`node -v` prints `v26.x`).
    - In the clone, `find . -name package-lock.json -not -path '*/node_modules/*'` lists one file. The port check of step 0 must pass before the AC 1 dev checks, which run with `npm run dev`. After Ctrl+C, the port check must pass again. The clone holds only committed files.
15. **Report.** The driver ticks the criteria that pass in `units/PLT-11-scaffold-gate.md` (prompt.md step 8). Criterion 5 stays unticked, and its cause is reported. No push.

## 4. Acceptance criteria and checks

The criteria text is copied from `units/PLT-11-scaffold-gate.md` lines 28 to 32.

**AC 1.** "On a fresh clone, `npm ci && npm run dev` serves the placeholder web app through the Angular dev server; `/api`, `/healthz` and `/events` are proxied to the API (SSE unbuffered)."

Local check, in the fresh clone. The port check of step 0 must pass before `npm run dev` starts. Then, with `npm run dev` running:
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/` prints `200`, and `curl -s http://localhost:4200/ | grep -c '<app-root'` prints `1`. The `Scriba` heading is rendered by the component in the browser, which PLT-03 criterion 2 tests.
- `curl -s http://localhost:4200/healthz` returns `{"status":"ok","version":"0.0.0-dev"}` (`build-info.ts` line 3 and `health.controller.ts` line 13 on main), so `/healthz` is proxied.
- `curl -s http://localhost:4200/api/platform/version` returns JSON with the keys `builtAt`, `composeVersion`, `revision` and `version`, so `/api` is proxied.
- SSE: `curl -sN -D /tmp/plt11-sse-headers.txt -m 8 http://localhost:4200/events | while IFS= read -r l; do echo "$(node -p 'Date.now()') $l"; done` runs while `curl -s -X POST http://localhost:4200/api/platform/echo -H 'content-type: application/json' -d '{"count":3,"intervalMs":500}'` prints `202`.
  - The headers file shows `content-type: text/event-stream` and no `content-encoding`.
  - The three `platform/echo` envelopes arrive 0.4 to 0.6 s apart. If they all arrive at the end, the proxy buffers: stop, report the result, and do not change the proxy config in this unit (section 6 point 2).
- Dev env: `test -d .scriba-dev/.scriba` exits 0, which shows the repo-local library was used. `grep -c 'SCRIBA_DEV_ORIGINS=http://localhost:4200' package.json` prints `1`. This is a static check; the guard reads the value later.
- After Ctrl+C, the port check of step 0 passes again.
- Pass: every line above holds.

**AC 2.** "`npm run build`, `npm test` and `npm run lint` pass from the root and cover every workspace."
- Each root command exits 0.
- Coverage: `npm run build 2>&1 | grep -o '^> @bbartolome/scriba-[a-z]*' | sort -u | wc -l` prints `4`. The same count applies to `npm test` and `npm run lint`. The four names are the packages of the four `workspaces` paths (`packages/contracts`, `apps/api`, `apps/web`, `packages/packs`).
- `npm run lint` includes `prettier --check .`, so the new README, the fixture and `ci.yml` are checked too.
- Pass: exit 0 for all three, and a count of 4 for each.

**AC 3.** "All ten contract subpaths resolve in both the API runtime and the Angular build; no root barrel."
- API runtime, `scripts/subpaths.test.mjs` (also run by root `npm test` through the glob):
  - The `exports` map of `packages/contracts/package.json` has ten keys and none is `"."`. Each key `require`s from `apps/api` (`createRequire` on `apps/api/package.json`) without error.
  - `require('@bbartolome/scriba-contracts')` from `apps/api` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
  - The test needs `packages/contracts/dist`, which the root order builds first.
- Angular build: `npm run build -w @bbartolome/scriba-web` exits 0 with the fixture imported by `main.ts`. The build type-checks the fixture through `tsconfig.app.json` and bundles each specifier. An unresolved subpath therefore fails the build (ASSUMED, section 7). Step 13(b) is the mutation check.
- No barrel: the `exports` map has no `"."` key, and the API test and `boot.test.ts` (PLT-02) both check that the root import fails.
- Pass: the API test passes both tests, `ng build` exits 0, and both mutation checks fail as expected.

**AC 4.** "PLT-04 … PLT-09 acceptance criteria all still pass on `main`."
- Local check: root `npm test` exits 0 with each test file below run and none skipped, and `npm run lint` exits 0. Each file is the test seam that the unit's approved plan names in section 4:
  - PLT-04: `healthz-version`, `static-fallback`, `env-boot`, `app-state`, `create-test-app` (and `smoke`).
  - PLT-05: `error-validation`, `error-not-found`, `error-payload`, `error-internal`, `error-module`, `error-shape`.
  - PLT-06: `events-hello`, `events-echo`, `events-heartbeat`, `events-headers`, `events-backpressure`, `events-no-id`, `events-envelope`.
  - PLT-07: `settings-atomic`, `settings-current`, `settings-defaults`, `settings-migration`, `settings-refusal`, `settings-unknown-keys`.
  - PLT-08: `tailnet-refuses`, `tailnet-accepts`, `tailnet-loopback`, `tailnet-filter`.
  - PLT-09: `scripts/boundaries.test.mjs`, and `npm run lint` (the fixture ignore and the boundary rule).
- The PLT-02, PLT-03 and PLT-10 tests also run in root `npm test` and must pass too.
- "On `main`": the check runs on `unit/PLT-11`, which holds `main` (`76461e3`) plus this unit's changes. Running on `main` itself waits for the merge, which is outside this unit.
- Pass: exit 0, the named files run, and none is skipped.

**AC 5.** "`ci.yml` is green on this PR."
- Status: **cannot test locally**, decided by the Navigator (DECISIONS entry "2026-11-12 — PLT-11 — acceptance criterion 5", commit 76461e3; section 6 point 1). The cause is that the repository has no git remote (`git remote -v` is empty), so there is no pull request and no GitHub Actions runner. DECISIONS 2026-11-10 (PLT-10 mismatch 1) deferred this check to PLT-11.
- The criterion stays unchecked. The unit is complete once these three local proxies pass. They are not the green check:
  - (1) `node --test scripts/ci-workflow.test.mjs` passes: one job, the order npm ci, lint, test, build, and the setup-node cache keyed on the lock.
  - (2) `npm ci`, `npm run lint`, `npm test` and `npm run build` pass in CI order in a fresh clone (step 14), under Node 26 from `.nvmrc`.
  - (3) The `@v7` action majors are in `ci.yml` (step 11), and their tags exist (step 1).
- Pass for the local part: (1), (2) and (3).

## 5. Agreement with PLT-12, PLT-13, PLT-14 and the Angular CommonJS question

- **PLT-12 is parallel, not unblocked.** Its front matter has `blocked_by: [PLT-01]` and `parallel_with` PLT-11 (`units/PLT-12-mock-openai-server.md` lines 2 to 8). The gate does not unblock it.
  - Conflict: both units change root `package.json` (`dev` and `concurrently` here; `mock:openai`, and possibly an `e2e` workspace, there) and the root lockfile. Whichever merges second rebases, runs `npm install` on a lockfile conflict, and reruns the root gates (PLT-01 section 5).
  - PLT-11 does not touch the root `test` script.
- **PLT-13 is blocked by PLT-11 and PLT-12.** It builds the web bundle and starts the API on one origin, with no dev origins (unit line 20). It relies on two paths that this plan keeps: `apps/web/dist/scriba-web/browser` (PLT-03 criterion 1) and `apps/api/dist/main.js` with the default static root (PLT-04 section 2, `bootstrap.ts`). PLT-13 must not use `npm run dev`, because the e2e harness does not use the dev proxy (PLT-03 section 5).
- **PLT-14 is blocked by PLT-11.** It needs the build order of section 2 (contracts, then API and web) and the layout `apps/web/dist/scriba-web/browser` beside `apps/api/dist` (PLT-04 open point 5). It may call `npm run build`, and it must not depend on `dev`.
- **SHL-01 takes over `main.ts` and `app.config.ts`** (PLT-03 section 5). The fixture import is the Angular leg of criterion 3, so SHL-01's plan must keep the ten subpaths in the build graph (section 6 point 3).
- **Angular CommonJS question: decided (section 1 decision 5).** The build passes or fails on its exit code, and a CommonJS warning is not a failure. `allowedCommonJsDependencies` takes the single name `@bbartolome/scriba-contracts` (decision 5), not `"*"`. The ESM switch stays rejected (PLT-02 section 6 point 1).
- **Earlier "must not" rules hold.** No `apps/api/src` file changes (PLT-04 section 5, PLT-07, PLT-08). `packages/contracts` is unchanged (PLT-02).

## 6. Open points

All three points are decided. The options that were not taken are kept for the record.

1. **Decided: AC 5, "`ci.yml` is green on this PR", is marked "cannot test locally".** Navigator decision, option (a), DECISIONS entry "2026-11-12 — PLT-11 — acceptance criterion 5", commit 76461e3. The criterion stays unchecked. The unit is complete once the three local proxies pass: (1) `node --test scripts/ci-workflow.test.mjs`; (2) `npm ci`, `npm run lint`, `npm test` and `npm run build`, in CI order, under Node 26 (`.nvmrc`); (3) the `@v7` action majors are in `ci.yml` (step 11). Not taken: (b) keep the unit open until a pull request run is green, which needs a remote; (c) a local runner such as `act`, which needs Docker and a download.
2. **Decided: SSE buffering, if the AC 1 check fails, is option (A).** Driver decision. If the check fails, stop, report the result, and do not change `apps/web/proxy.conf.json` in this unit. Reason: a JavaScript proxy config would change the file form that PLT-03 criterion 3 tests, so that choice goes to a new decision. Not taken: (B) change the proxy config now.
3. **Decided: the Angular fixture is kept by SHL-01's plan, option (a).** Driver decision. SHL-01's plan keeps one import of the ten subpaths in the build graph. Not taken: (b) move the check to an Angular unit test, because a unit test does not prove the production build.

## 7. Facts checked and facts assumed

**Facts checked** (each with its file or command):
- `git rev-parse --short HEAD` is `67056c5` on `main`. It is a docs-only commit (`git show --stat 67056c5`: `plans/DECISIONS.md` only, 11 insertions) after `76461e3`, which is itself docs-only on `afed8ef`. `git diff --quiet 76461e3 HEAD -- ':!plans'` exits 0, so the step 0 check passes. `git status --short` shows only the untracked `plans/PLT-11.md`. `git remote -v` is empty.
- No `dist/` folder exists in `packages/contracts`, `apps/api` or `apps/web`. `node_modules/@angular` is absent from the working tree.
- Root `package.json`: `workspaces` in the order `packages/contracts`, `apps/api`, `apps/web`, `packages/packs`. `build` is `npm run build --workspaces`. `test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'`, and `lint` is `npm run lint --workspaces && prettier --check .`. `scribaPins` is angular `22`, nestjs `12`, zod `4`, typescript `6.0.3`. There is no `concurrently`.
- `apps/web/package.json`: `start` is `ng serve`. `apps/web/angular.json`: `serve.options.proxyConfig` is `proxy.conf.json`, the browser entry is `src/main.ts`, and there is no `allowedCommonJsDependencies`.
- `apps/web/proxy.conf.json`: keys `/api`, `/healthz` and `/events`, each to `http://127.0.0.1:8080`.
- `apps/web/src/main.ts` imports `appConfig` and `App`. `apps/web/src/index.html` line 11 has `<app-root>`.
- `apps/api/src/main.ts` line 8: `app.listen(8080, '0.0.0.0')`. `bootstrap.ts` resolves the default static root from `__dirname` to `apps/web/dist/scriba-web/browser`.
- `apps/api/src/modules/platform/boot/env.ts`: the three dirs must be absolute. `main.ts` does not read `SCRIBA_PORT` and listens on 8080.
- `apps/api/src/modules/platform/build-info.ts` line 3: `version: '0.0.0-dev'`. `health.controller.ts` line 13 returns `{status: 'ok', version}`.
- `packages/contracts/package.json`: ten `exports` keys and no `"."`. `dependencies` is `zod` only. There is no `type` field, so the output is CommonJS. `test` is `npm run build && vitest run`.
- `.github/workflows/ci.yml`: one job. `actions/checkout@v4` and `actions/setup-node@v4` (`node-version-file: .nvmrc`, `cache: npm`). The steps run `npm ci`, `npm run lint`, `npm test` and `npm run build`, in that order.
- `apps/api/src/modules/platform/events/events.controller.ts` lines 14 and 15 set `Content-Type: text/event-stream` and `Cache-Control: no-cache, no-transform`. `echo.controller.ts` has `@Post` with `@HttpCode(202)`. `grep -rn compression apps/api/src` finds nothing.
- `.gitignore` lists `dist/`, `.angular/` and `.scriba-dev/`. `.prettierignore` lists `/units/`, `/modules/`, `/plans/` and `/package-lock.json`.
- `eslint.config.mjs` ignores `lint-fixtures/**`, `**/dist/**`, `**/node_modules/**` and `**/.angular/**`.
- `@angular/build` 22.2.5, packed into `/tmp/plt11-probe`:
  - `allowedCommonJsDependencies` is an array of names, and `'*'` allows all (`src/builders/application/schema.json` line 558).
  - The dev-server defaults are port 4200 and host `localhost`.
  - Peer `typescript` is `>=6.0 <6.1`.
  - The dev server passes the proxy object to Vite (`src/builders/dev-server/vite/server.js` lines 51 and 75; Vite 8.3.5).
  - CommonJS check (checked): it runs only when `optimizationOptions.scripts` is set, which is the production build (`src/builders/application/execute-build.js` lines 285 to 287). The allow test is on the import specifier (`src/tools/esbuild/commonjs-checker.js` lines 73 and 85), so a workspace symlink does not change the match. Deep imports match `startsWith(allowed + '/')` (line 91). Descendants of an allowed deep import are skipped by the `continue` at line 102, so `zod` under the contracts package is not reported. The `if` at line 73 and its `continue` at line 74 handle exact matches only. Each imported module path is reported once (`seenFiles` is checked at line 68 and added at line 71), so each subpath module is reported once.
- `concurrently` 10.0.7 (`npm view concurrently dist-tags` gives `latest: 10.0.7`; packed):
  - `engines` is `node >=22`.
  - Dependencies are listed in section 2.
  - Flags are `-n`/`--names`, `-k`/`--kill-others`, `--kill-others-on-fail` and `-c`/`--prefix-colors`.
- Lock (`package-lock.json`, lockfileVersion 3, 669 entries): top-level `chalk` 5.6.2 and `rxjs` 7.8.2 are present. Top-level `supports-color` 8.1.1 and `yargs` 18.1.0 are present. `shell-quote` and `tree-kill` are absent.
- Action majors: `gh api repos/actions/checkout/releases/latest` gives `v7.0.1`, and the setup-node call gives `v7.1.0`. `git ls-remote --tags` shows `refs/tags/v7` for both.
- Local runtime: `node -v` is v26.13.0 and `npm -v` is 11.20.0.
- Ports (read-only `/proc` lookup, revision 4): port 4200 is held by PID 2362325 (`ng serve (scriba-web)`), and port 8080 by PID 2546840 (`node apps/api/dist/main.js`). Neither was stopped. The step 0 port check therefore fails on this machine until both are free.
- Units: PLT-11 front matter (`blocked_by` PLT-02 to PLT-10; `unblocks` 15 units). A scan of `units/*.md` finds exactly those 15 units whose `blocked_by` names PLT-11, so the inverse holds. PLT-12: `blocked_by: [PLT-01]`, parallel PLT-11. PLT-13: `blocked_by: [PLT-11, PLT-12]`. PLT-14: `blocked_by: [PLT-11]`.
- Unit lines checked: PLT-01 lines 18 and 27; PLT-11 lines 20 to 30; SHL-01 line 20; SAU-02 line 20; PLT-13 line 20. `apps/web/src/app/app.spec.ts` exists (PLT-03 criterion 2).
- DECISIONS lines checked: 140 to 143, 146 to 152, 162 to 168, 170 to 175, 178 to 184, 197 to 202, 260, 281, 385 to 389, 403, 465, 478, and 596 to 598 (the batch review: root tests 40 of 40 files and 90 of 90 tests; API 29 of 29 files), and from line 602 (the criterion 5 entry of 2026-11-12, commit 76461e3).
- Approved plans checked: PLT-01 sections 1, 2 and 5; PLT-02 sections 1, 4, 5 and open point 1; PLT-03 sections 1, 2, 4, 5 and open points 5 and 7; PLT-04 sections 1, 2, 5 (PLT-11 row), 6 and 7 (A5); PLT-09 sections 1, 3 and 5; PLT-10 section 6 item 7 and step 6.

**Facts assumed** (each marked ASSUMED, each tested at implementation):
- ASSUMED: the dev script runs under POSIX `sh` (dev Mac and CI). Windows is not a dev target.
- ASSUMED: npm's `sh -c` expands `$PWD` in the root `dev` string. Root scripts find `tsc`, `node` and `concurrently` in the root `node_modules/.bin`.
- ASSUMED: `node --watch` restarts when `tsc --watch` re-emits `apps/api/dist` or a loaded contracts file changes, and it stays alive after a crash.
- ASSUMED: the API boots in dev with `apps/web/dist` absent, because the Angular server serves the page.
- ASSUMED: the Vite proxy streams SSE without buffering. AC 1 checks it.
- ASSUMED: `ng build` fails on an unresolved subpath even when it is tree-shaken.
- ASSUMED: npm runs `--workspaces` in array order. The explicit `build` removes this dependence for `build`. `test` still relies on it, and the fresh clone in step 14 checks it.
- ASSUMED: the production budgets (500 kB warning, 1 MB error) still pass with `zod` in the bundle.
- ASSUMED: `npm view`, `gh api` and `git ls-remote` work from this machine, as they did on 2026-11-12.

**Not verified** (nothing has been run yet): the root gates and the dev stack on the branch; the Angular CommonJS warning output; SSE timing; the CI result (no remote).
