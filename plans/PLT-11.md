---
id: PLT-11
status: planned
---

# PLT-11 plan — scaffold gate: dev script, build order, subpath checks, end-to-end checks

Batch: [PLT-11] (Platform, phase:scaffold, M1); the gate unit, batch of one. Revision 6.

## Revision 6 changes

- Base (section 3 step 0, section 7): the driver's branch `unit/PLT-11` is at `228a852`, and it already holds the unit's code. So `git diff --quiet 76461e3 HEAD -- ':!plans'` fails there. The branch check is the merge-base form in step 0: a quiet diff from `76461e3` to the merge base, then `git diff --name-only`, which lists the eight unit files. `--quiet` stays the check for `main`.
- Section 2 table: rows added or changed for `apps/web/src/main.ts` (remove the fixture import), the `ci.yml` row (`@v7` already on the branch at `228a852`), the fixture move (`git mv`), `package.json` (quote the `dev` values), `README.md` (line 23) and `apps/web/angular.json` (move `allowedCommonJsDependencies` into `contracts-boot`). The not-changed list no longer names `main.ts`.
- Section 3: step 0 (base and what is already on the branch), step 4 (quote the `dev` values), step 5 (the move, the `main.ts` edit and the configuration), step 7 (the entry check and the production total), step 10 (README line 23) and step 11 (already `@v7` on the branch).
- Section 6 point 3: the reason for rejecting option (b) is reworded. The chosen check does not build the production bundle either, so the production build is checked by its initial total.
- Section 7: the fixture state is cited at `228a852` (the fixture import is still in `main.ts`), not at `72918bc`. The measured sizes are "not verified" for the `contracts-boot` configuration and must be measured after the change.
- Revision 5 list, line 24: "Step 6" now reads step 10, the README step.
- Revision 5 list: the ASSUMED configuration-override fact (section 7, step 7) is listed.

## Revision 5 changes

- Section 1: decision 1 says each path value is single-quoted, and decision 2 shows the quoted values. Decisions 4 and 5 name the `contracts-boot` configuration in place of `main.ts`.
- Section 2: the `apps/web/src/main.ts` row is removed, and `main.ts` joins the not-changed list. The fixture row, its paragraph and the `angular.json` row name `apps/web/src/contracts-boot.ts` and the `contracts-boot` configuration, whose JSON is added. The README row says to fill in the existing `packages/contracts/src/<slug>/index.ts`. The dev script's path values are single-quoted.
- Section 3: steps 5, 7 and 13(b) use the new entry file and configuration. Step 7 also expects the production initial total to be about 128 kB. Step 10 (the README step) takes its text from section 2, so the README change is recorded in both places.
- Section 4: the AC 3 Angular check runs `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot`.
- Section 5: the SHL-01 bullet and the CommonJS bullet name the `contracts-boot` configuration.
- Section 6: point 3 is decided. SHL-01 does not need the fixture, and the zod finding is for the Navigator.
- Section 7: the measured sizes with their provenance, the DECISIONS reference (commit f9c37b3), the optimization default and the schema keys are recorded. The assumed "production budgets still pass with zod" line is removed. The HEAD fact is updated to `8028035`.
- The front matter already reads `status: draft` (commit 8028035), so it is unchanged.
- Section 7: ASSUMED that a build configuration can override `browser` and `outputPath`; step 7 proves it.

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
   - Quoting: each path value in the `dev` string is single-quoted, as in `SCRIBA_BOOKS_DIR='$PWD/.scriba-dev'`. The outer shell expands `$PWD`, because the argument sits inside double quotes. The single quotes then keep a path with spaces intact in the inner shell that `concurrently` starts.
2. **Dev environment, set on the API process only.** `SCRIBA_BOOKS_DIR='$PWD/.scriba-dev'`, `SCRIBA_PACKS_DIR='$PWD/packages/packs'`, `SCRIBA_EXAMPLES_DIR='$PWD/examples'`, `SCRIBA_DEV_ORIGINS=http://localhost:4200`, `SCRIBA_SETUP_URL_BASE=http://localhost:4200`.
   - Source: unit line 20; PLT-01 unit line 27 (git-ignored repo-local library; packs and examples dirs); `.gitignore` (`.scriba-dev/`); PLT-04 section 1 bullet 5 (the three dirs must be absolute) and DECISIONS 2026-11-11 (PLT-04 plan review of revision 1, item 9, line 403).
   - The origin `http://localhost:4200` is the Angular dev-server default (section 7), as SHL-01 line 20 and SAU-02 line 20 assume.
3. **Build order.** Root `build` runs contracts first, then API, web and packs.
   - Source: unit line 21 ("contracts, then API and web"); PLT-01 unit line 18; PLT-04 section 1 bullet 16 (API tests import the built contracts); DECISIONS 2026-11-11 mismatch 2.
   - Root `test` and `lint` are not changed (DECISIONS 2026-11-11 root glob; PLT-03 section 6 point 7).
4. **Subpath checks.** The API-runtime leg is a root-owned `node:test` file, `scripts/subpaths.test.mjs`, which requires each subpath from `apps/api`'s own resolution context. The Angular leg is a build-time fixture, the entry of a separate `contracts-boot` build configuration in `apps/web`. The production build does not import contracts. `packages/contracts/test/boot.test.ts` is not edited.
   - Source: unit lines 22 and 30; PLT-02 sections 4 and 5 (workspace-level resolution is PLT-11 criterion 3); DECISIONS 2026-11-11 PLT-09 criterion 4 disposition (line 260).
5. **Angular and CommonJS (checked, section 7).** Contracts emits CommonJS (its `package.json` has no `type`). The CommonJS check runs only in optimized builds (`optimization` defaults to true), and it reports each subpath module once. An allowed entry also covers deep imports (`startsWith(allowed + '/')`). The plan lists the single name `@bbartolome/scriba-contracts` in the `allowedCommonJsDependencies` of the `contracts-boot` configuration, if that build warns. It covers all ten subpaths and any subpath added later; ten names would need an edit for each new module. `"*"` is not used. If a warning remains for another package, the build still passes, and the PR reports it. ESM stays rejected.
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
| `package.json` | root | on the branch (commit `72918bc`): `scripts.build`, `scripts.dev` and devDependency `concurrently` `10.0.7`. Still to do: quote the `dev` path values (step 4) | Decisions 1 to 3 and 7. `test`, `lint`, `workspaces`, `scribaPins`, `engines` and `packageManager` are unchanged |
| `package-lock.json` | root | changed by npm (step 2), additive | `concurrently` and its dependencies |
| `README.md` | root | on the branch (commit `3c49808`); edit line 23 (step 10) | Getting started: the commands; how to add a module (fill in the existing `packages/contracts/src/<slug>/index.ts`; its folder and `./<slug>` export already exist for all ten subpaths; one `@Module` line in `COMPOSED_MODULES`; `/api/<slug>/` prefix; `EventsPublisher`; `ModuleError` codes with the module prefix; `SettingsService` section; `createTestApp`); a note that the dev API listens on `0.0.0.0:8080` (PLT-04 section 1 bullet 1) |
| `scripts/subpaths.test.mjs` | root | new | API-runtime leg of criterion 3 (section 4) |
| `.github/workflows/ci.yml` | root (a PLT-10 file) | on the branch at `228a852`: `@v7` for both actions (step 11) | Decision 8 |
| `apps/web/src/contracts-boot.ts` | web | moved with `git mv` from `apps/web/src/app/contracts-boot.fixture.ts` (step 5) | Entry of the `contracts-boot` configuration: one namespace import per subpath (Angular leg of criterion 3). No production file imports it |
| `apps/web/src/main.ts` | web | remove the one import line `import './app/contracts-boot.fixture';` (step 5); afterwards `git diff main -- apps/web/src/main.ts` is empty | The production bundle does not contain the fixture |
| `apps/web/angular.json` | web | move `allowedCommonJsDependencies` from the production `build.options` into the `contracts-boot` configuration (below), and add that configuration (step 5); keep the entry only if the build warns (step 7) | Decisions 4 and 5 |

Not changed: `apps/api/**` (PLT-04, PLT-07 and PLT-08 forbid edits to `apps/api/src`, and no test is needed there); `packages/contracts/**` (`boot.test.ts` is PLT-02's); `apps/web/proxy.conf.json`; `apps/web/package.json` (`start` is PLT-03's, and no package is added); `eslint.config.mjs`; `tsconfig.base.json`; `.prettierignore`; `.gitignore` (it already lists `.scriba-dev/` and `dist/`).

The new root scripts, as they appear in `package.json` (the inner quotes are escaped there):

```json
"build": "npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api -w @bbartolome/scriba-web -w @bbartolome/scriba-packs",
"dev": "npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api && concurrently -n contracts,api-tsc,api,web \"tsc -p packages/contracts/tsconfig.build.json --watch --preserveWatchOutput\" \"tsc -p apps/api/tsconfig.build.json --watch --preserveWatchOutput\" \"SCRIBA_BOOKS_DIR='$PWD/.scriba-dev' SCRIBA_PACKS_DIR='$PWD/packages/packs' SCRIBA_EXAMPLES_DIR='$PWD/examples' SCRIBA_DEV_ORIGINS=http://localhost:4200 SCRIBA_SETUP_URL_BASE=http://localhost:4200 node --watch apps/api/dist/main.js\" \"npm run start -w @bbartolome/scriba-web\""
```

Package added: `concurrently` 10.0.7 (root devDependency, exact). Its dependencies are installed by npm, with no direct entry: `chalk` 5.6.2, `rxjs` 7.8.2, `shell-quote` 1.12.0, `supports-color` 10.2.2, `tree-kill` 1.2.2 and `yargs` 18.0.0.

The Angular fixture, `apps/web/src/contracts-boot.ts`, is the entry of the `contracts-boot` configuration. It has one namespace import per subpath (`platform`, `setup-auth`, `providers`, `project-store`, `tool-registry`, `agent-loop`, `graph-runner`, `compile-export`, `shell`, `genre-packs`). It exports one object, `CONTRACT_SUBPATHS`, that holds all ten. A comment says it is a build-time check and is not used at runtime. The configuration goes under `build.configurations` in `apps/web/angular.json`. The branch has `allowedCommonJsDependencies` in the production `build.options`, and it moves into this configuration (step 5). The production configuration does not change:

```json
"contracts-boot": {
  "browser": "src/contracts-boot.ts",
  "outputPath": "dist/contracts-boot",
  "budgets": [],
  "allowedCommonJsDependencies": ["@bbartolome/scriba-contracts"]
}
```

Its `outputPath` stops the check from overwriting the production output `apps/web/dist/scriba-web/browser`, which PLT-03, PLT-04 and PLT-13 use. Its `optimization` is not set, so it keeps the default `true` (section 7). The `allowedCommonJsDependencies` entry is listed because the branch has it and it moves here; step 7 keeps it only if the build warns.

## 3. Procedure

Run in the driver's worktree on branch `unit/PLT-11`, which the driver creates. Do not run `git switch -c`. Record `node -v` and `npm -v` with each result. Each step names its files.

0. **Precondition: the code on main is the code read for this plan.**
   - On the driver's branch `unit/PLT-11`, `git rev-parse --short HEAD` prints `228a852`. `git diff --quiet 76461e3 HEAD -- ':!plans'` fails there, because the unit's code is on the branch. Its check is `b=$(git merge-base HEAD main); git diff --quiet 76461e3 "$b" -- ':!plans' && git diff --name-only "$b" HEAD -- ':!plans'`. The first command proves that the merge base carries no code change from `76461e3`. The second must list exactly the eight files of section 2 (the fixture at its branch path `apps/web/src/app/contracts-boot.fixture.ts`, which step 5 moves). `git status --short` prints nothing.
   - On `main`, `git rev-parse --short HEAD` prints `76461e3` or a later commit, and `git diff --quiet 76461e3 HEAD -- ':!plans'` exits 0.
   - Already on the branch, not repeated: the install and lock (steps 2 and 3, commit `72918bc`), the subpath test (step 8, commit `0d767c9`), the README except line 23 (commit `3c49808`) and the v7 actions (step 11, commit `228a852`). Verify them. Make only the changes in steps 4, 5, 7 and 10.
   - Root `scripts.test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'`.
   - `apps/web/proxy.conf.json` has the three keys; `apps/api/src/main.ts` calls `listen(8080, '0.0.0.0')`. On `main`, `ci.yml` uses `@v4` twice; on the branch it uses `@v7`.
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
2. **Install (files: `package.json`, `package-lock.json`). Done at `72918bc`; verify.**
   - Verify that `concurrently` 10.0.7 is present as an exact root devDependency and in the lock: `node -p "require('./package.json').devDependencies.concurrently"` prints `10.0.7`. Do not run `npm install` again.
   - Run `npm ci`; it must exit 0. The working tree's `node_modules` lacks the Angular packages, and the lock is the source.
3. **Lock gate (file: `package-lock.json`).**
   - Run `git diff main -- package-lock.json`. Pass when no `version`, `resolved` or `integrity` of an existing package entry changes, and removed lines are at most the root entry's devDependencies lines that npm re-emits (the PLT-02 precedent, DECISIONS 2026-11-11 lines 387 and 388).
   - Expected new entries: `node_modules/concurrently`, `node_modules/shell-quote`, `node_modules/tree-kill`, and any nested copies under `node_modules/concurrently/node_modules/`. The top-level `supports-color` (8.1.1) and `yargs` (18.1.0) differ from what `concurrently` needs, so nested copies of 10.2.2 and 18.0.0 are expected. `chalk` 5.6.2 and `rxjs` 7.8.2 are already present and shared.
   - Then `npm ls concurrently` exits 0, and `npm ci` exits 0 again.
4. **Root `dev` quoting (file: `package.json`).** On the branch, the `dev` script's path values are unquoted. Change them to the single-quoted form of section 2: `SCRIBA_BOOKS_DIR='$PWD/.scriba-dev'`, `SCRIBA_PACKS_DIR='$PWD/packages/packs'` and `SCRIBA_EXAMPLES_DIR='$PWD/examples'`. Keep every other key. Run `npx prettier --write package.json`. The `build` script and `concurrently` are already on the branch.
5. **Angular entry and configuration (files: `apps/web/src/app/contracts-boot.fixture.ts`, `apps/web/src/contracts-boot.ts`, `apps/web/src/main.ts`, `apps/web/angular.json`).**
   - `git mv apps/web/src/app/contracts-boot.fixture.ts apps/web/src/contracts-boot.ts`.
   - In `apps/web/src/main.ts`, delete the line `import './app/contracts-boot.fixture';`. Expected: `git diff main -- apps/web/src/main.ts` is empty.
   - In `apps/web/angular.json`, move `"allowedCommonJsDependencies": ["@bbartolome/scriba-contracts"]` out of the production `build.options` (on the branch, line 28). Add the `contracts-boot` configuration of section 2 under `build.configurations`. The production options and configuration keep no contracts entry.
   - Run `npx prettier --write apps/web/src/contracts-boot.ts apps/web/angular.json`. Expected: `npx prettier --check apps/web` passes.
6. **Contracts first.**
   - `npm run build -w @bbartolome/scriba-contracts` exits 0, and `ls packages/contracts/dist` lists the ten slug folders (PLT-02 step 6).
   - Then `npm run build -w @bbartolome/scriba-api` exits 0. The API build type-checks against the built contracts, so this order is required.
7. **Builds (file: `apps/web/angular.json`, only if needed).**
   - `npm run build -w @bbartolome/scriba-web` exits 0. Its initial total should match the 128.22 kB measured without the fixture (section 7). That figure is not verified after the change, so record the new total.
   - `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` exits 0. This is the Angular check of criterion 3.
   - Check the entry of decision 5: remove `allowedCommonJsDependencies` from the `contracts-boot` configuration and run the second build. If it reports CommonJS warnings for the contracts subpaths, restore `["@bbartolome/scriba-contracts"]` there, run `npx prettier --write apps/web/angular.json`, and rerun the build. Expected: no contracts warning remains. If it reports none, leave the entry out.
   - If a warning names another package, add that name and report why. Do not use `"*"`.
   - Report the warning text, if any.
8. **API-runtime leg (file: `scripts/subpaths.test.mjs`).** Verify that the file is present (commit `0d767c9`; section 4, AC 3). Run `node --test scripts/subpaths.test.mjs` after step 6: 2 pass. Run `npx prettier --check scripts/subpaths.test.mjs`.
9. **Dev stack (no file change).**
   - Before: the port check of step 0 must pass.
   - Run `npm run dev` in its own terminal, then the AC 1 checks against port 4200.
   - Run `test -d .scriba-dev/.scriba` (exit 0) and `git check-ignore -q .scriba-dev` (exit 0).
   - Stop the stack with Ctrl+C. After: the port check of step 0 must pass again, so both requests fail to connect. The unit's demo steps 2 to 4 are manual, and they are not criteria.
10. **README (file: `README.md`).** The README exists on the branch (commit `3c49808`). Edit line 23, the contract slice step, to read: `1. **Contract slice.** Fill in the existing \`packages/contracts/src/<slug>/index.ts\`; its folder and its \`./<slug>\` key in the \`exports\` map of \`packages/contracts/package.json\` already exist for all ten subpaths. Module slugs are fixed in \`MODULE_SLUGS\` (\`packages/contracts/src/platform/slugs.ts\`). The package has no root barrel, so import only a subpath, such as \`@bbartolome/scriba-contracts/<slug>\`.` Run `npx prettier --write README.md`.
11. **CI majors (file: `.github/workflows/ci.yml`).** Already on the branch at `228a852`: `actions/checkout@v7` and `actions/setup-node@v7`. Verify with `grep -n 'uses:' .github/workflows/ci.yml`. Then `node --test scripts/ci-workflow.test.mjs` (5 pass).
12. **Root gates (no file change).** From the root, `npm run build`, `npm test` and `npm run lint` each exit 0, with the banner counts of AC 2.
13. **Mutation checks (temporary edits; each is reverted, and `git diff` on that file is then empty).**
    - (a) In `packages/contracts/package.json`, delete the `./shell` key. `node --test scripts/subpaths.test.mjs` must fail. Restore the key.
    - (b) In `apps/web/src/contracts-boot.ts`, change the `shell` specifier to `@bbartolome/scriba-contracts/shell-x`. `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` must fail. Restore it.
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
- Angular build: `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` exits 0. Its entry `apps/web/src/contracts-boot.ts` imports each subpath. The build type-checks the entry through `tsconfig.app.json` and bundles each specifier, so an unresolved subpath fails the build (ASSUMED, section 7). The production build does not import contracts (step 7). Step 13(b) is the mutation check.
- No barrel: the `exports` map has no `"."` key, and the API test and `boot.test.ts` (PLT-02) both check that the root import fails.
- Pass: the API test passes both tests, the `contracts-boot` build exits 0, and both mutation checks fail as expected.

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
- **SHL-01 takes over `main.ts` and `app.config.ts`** (PLT-03 section 5). The Angular check is the separate `contracts-boot` configuration, so SHL-01 does not need to keep any subpath import (section 6 point 3, decided). Importing contracts into the production bundle would add about 564 kB of zod. That finding is for the Navigator when SHL-01 is planned (DECISIONS, commit f9c37b3), and this plan does not decide it.
- **Angular CommonJS question: decided (section 1 decision 5).** The build passes or fails on its exit code, and a CommonJS warning is not a failure. `allowedCommonJsDependencies` takes the single name `@bbartolome/scriba-contracts` in the `contracts-boot` configuration, if that build warns (decision 5), and never `"*"`. The ESM switch stays rejected (PLT-02 section 6 point 1).
- **Earlier "must not" rules hold.** No `apps/api/src` file changes (PLT-04 section 5, PLT-07, PLT-08). `packages/contracts` is unchanged (PLT-02).

## 6. Open points

All three points are decided. The options that were not taken are kept for the record.

1. **Decided: AC 5, "`ci.yml` is green on this PR", is marked "cannot test locally".** Navigator decision, option (a), DECISIONS entry "2026-11-12 — PLT-11 — acceptance criterion 5", commit 76461e3. The criterion stays unchecked. The unit is complete once the three local proxies pass: (1) `node --test scripts/ci-workflow.test.mjs`; (2) `npm ci`, `npm run lint`, `npm test` and `npm run build`, in CI order, under Node 26 (`.nvmrc`); (3) the `@v7` action majors are in `ci.yml` (step 11). Not taken: (b) keep the unit open until a pull request run is green, which needs a remote; (c) a local runner such as `act`, which needs Docker and a download.
2. **Decided: SSE buffering, if the AC 1 check fails, is option (A).** Driver decision. If the check fails, stop, report the result, and do not change `apps/web/proxy.conf.json` in this unit. Reason: a JavaScript proxy config would change the file form that PLT-03 criterion 3 tests, so that choice goes to a new decision. Not taken: (B) change the proxy config now.
3. **Decided: SHL-01 does not need the Angular fixture.** Driver decision. The fixture is the entry of the separate `contracts-boot` configuration, so the production bundle does not import contracts. The measured sizes are in section 7. The zod cost for frontend units is recorded in DECISIONS (commit f9c37b3) for the Navigator when SHL-01 is planned, and this plan does not decide it. Not taken: (a) keep one import of the subpaths in `main.ts`, which puts about 564 kB of zod into the production bundle; (b) an Angular unit test. A unit test does not build the bundle, so it cannot show that the Angular build resolves the subpaths. The chosen check, a build of the separate `contracts-boot` configuration, does show resolution, but it is not the production build. The production build is therefore checked separately, by its initial total (step 7).

## 7. Facts checked and facts assumed

**Facts checked** (each with its file or command):
- On `main`, `git rev-parse --short HEAD` is `8028035`. The commits after `76461e3` (`67056c5`, `32c2750`, `4617ca6`, `f9c37b3`, `8028035`) change only `plans/`, and `git diff --quiet 76461e3 HEAD -- ':!plans'` exits 0. `git remote -v` is empty.
- On `unit/PLT-11`, `git rev-parse --short HEAD` is `228a852`. The unit commits after `76461e3` are `72918bc`, `722e5b2`, `0d767c9`, `3c49808` and `228a852`. `git diff --stat 76461e3 unit/PLT-11 -- ':!plans'` lists eight files, 213 insertions and 4 deletions: `.github/workflows/ci.yml`, `README.md`, `apps/web/angular.json`, `apps/web/src/app/contracts-boot.fixture.ts`, `apps/web/src/main.ts`, `package-lock.json`, `package.json` and `scripts/subpaths.test.mjs`. `git diff --quiet 76461e3 unit/PLT-11 -- ':!plans'` fails, as expected.
- Fixture state at `228a852`: `apps/web/src/main.ts` line 4 imports `./app/contracts-boot.fixture`, so the fixture is in the production bundle. `apps/web/angular.json` has `allowedCommonJsDependencies` in `build.options` (line 28), and no `contracts-boot` configuration exists yet. The `dev` script's path values are unquoted.
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
  - CommonJS check (checked): it runs only when `optimizationOptions.scripts` is set (`src/builders/application/execute-build.js` lines 285 to 287). `optimization` defaults to `true` (`src/builders/application/schema.json` lines 218 to 220), so the `contracts-boot` configuration runs the check unless it sets `optimization` to `false`. The schema has the keys `browser` (line 15) and `outputPath` (line 318). The allow test is on the import specifier (`src/tools/esbuild/commonjs-checker.js` lines 73 and 85), so a workspace symlink does not change the match. Deep imports match `startsWith(allowed + '/')` (line 91). Descendants of an allowed deep import are skipped by the `continue` at line 102, so `zod` under the contracts package is not reported. The `if` at line 73 and its `continue` at line 74 handle exact matches only. Each imported module path is reported once (`seenFiles` is checked at line 68 and added at line 71), so each subpath module is reported once.
- `concurrently` 10.0.7 (`npm view concurrently dist-tags` gives `latest: 10.0.7`; packed):
  - `engines` is `node >=22`.
  - Dependencies are listed in section 2.
  - Flags are `-n`/`--names`, `-k`/`--kill-others`, `--kill-others-on-fail` and `-c`/`--prefix-colors`.
- Lock (`package-lock.json`, lockfileVersion 3, 669 entries): top-level `chalk` 5.6.2 and `rxjs` 7.8.2 are present. Top-level `supports-color` 8.1.1 and `yargs` 18.1.0 are present. `shell-quote` and `tree-kill` are absent.
- Action majors: `gh api repos/actions/checkout/releases/latest` gives `v7.0.1`, and the setup-node call gives `v7.1.0`. `git ls-remote --tags` shows `refs/tags/v7` for both.
- Local runtime: `node -v` is v26.13.0 and `npm -v` is 11.20.0.
- Ports (read-only `/proc` lookup, revision 4): port 4200 is held by PID 2362325 (`ng serve (scriba-web)`), and port 8080 by PID 2546840 (`node apps/api/dist/main.js`). Neither was stopped. The step 0 port check therefore fails on this machine until both are free.
- Bundle sizes (measured on the fixture-in-`main.ts` state of `unit/PLT-11`; the Opus code review that reported them named head `72918bc`, and the import is still present at `228a852`; recorded in DECISIONS commit `f9c37b3`; not re-run, because this machine has no Angular packages installed. Not verified for the `contracts-boot` configuration: measure it after the change): the `main` chunk is 690.98 kB, of which zod 4.6.6 (CommonJS build) is 564.1 kB. The initial total is 699.02 kB. The 500 kB budget warns (the build exits 0), and the 1 MB budget errors. Without the fixture, the initial bundle is 128.22 kB. The production build command is `npm run build -w @bbartolome/scriba-web`. The review recorded the figures but not the exact invocation, so step 7 repeats the production build and checks the initial total.
- DECISIONS commit `f9c37b3` (10 insertions, read with `git show f9c37b3 -- plans/DECISIONS.md`) records the cross-unit finding that the CommonJS contracts package brings about 564 kB of zod into any browser bundle that imports a subpath. It is for the Navigator when SHL-01 is planned. This plan does not decide it.
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
- ASSUMED: a build configuration can override `browser` and `outputPath` (step 7 proves it).
- ASSUMED: `npm view`, `gh api` and `git ls-remote` work from this machine, as they did on 2026-11-12.

**Not verified** (nothing has been run yet): the root gates and the dev stack on the branch; the Angular CommonJS warning output; SSE timing; the CI result (no remote).
