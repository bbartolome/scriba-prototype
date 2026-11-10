---
id: PLT-01
status: planned
---

# PLT-01 plan — root npm workspace, pins and scripts skeleton

Batch: `[PLT-01]` (Platform, `phase:scaffold`, M1). This iteration writes the plan only. The plan is implemented in a later iteration, so no criterion is marked passed here.

Revision 5. Revision 4 was approved by Opus on 2026-11-10 (`plans/DECISIONS.md`). Revision 5 is documentation-only: it corrects the dev folder wording in section 2, the `/tmp/plt01-ac2/` procedure in AC 2, and the PLT-13 line citation in section 5. No criterion changed, so the approval carries over. Opus rejections 1, 2 and 3, and the Navigator's response to rejection 3 (keep the unit whole and fix it in place), are recorded in `plans/DECISIONS.md`.

## 1. Decisions this plan follows

Each is recorded in `plans/DECISIONS.md` (2026-11-10 entries):

- **Workspaces:** exactly four, in this order: `packages/contracts`, `apps/api`, `apps/web`, `packages/packs`. `deploy/`, `e2e/` and `examples/` are plain folders with `.gitkeep`.
- **Node:** 26, in `.nvmrc` and `engines`. The tests run on a Node 26 binary at implementation time (from nodejs.org or the npm `node@26` package), not on the local Node 24.
- **npm:** pinned through `packageManager`.
- **TypeScript:** the 6.0.x line (range `>=6.0 <6.1`). The exact patch is resolved at implementation. Exactly one copy is installed, at the root. 7.x and 5.x are rejected.
- **Angular, NestJS and Zod majors:** recorded in a pin section (`scribaPins`) of the root `package.json`. PLT-01 installs none of the three. PLT-03, PLT-04 and PLT-02 install them at the recorded majors. If the newest Angular major's build tooling excludes the 6.0.x line, the implementation stops and records the conflict for the Navigator (section 3, step 1c).
- **Pin-section test:** `scripts/pins.test.mjs` at the root, run with `node:test` from the root `test` script. It checks that the keys `angular`, `nestjs` and `zod` are present. It checks no version numbers and no TypeScript key.
- **Prettier scope:** a root `.prettierignore` with anchored patterns excludes `/units/`, `/modules/`, `/plans/` and `/package-lock.json`. Anchoring matters: an unanchored `modules/` would also hide `apps/api/src/modules/`. Prettier then checks every file that is not ignored: the root config files, the four workspaces, and the files that later units add (for example `e2e/`, `.github/` and `README.md`). Workspace `lint` is ESLint only.
- **Workspace versions:** each workspace `package.json` has `"version": "0.0.0"`. npm prints a workspace's package name in the run banner only when it has a version.

## 2. Files to create

### Root

- **`package.json`**
  - `"name": "scriba"`, `"private": true`
  - `"workspaces": ["packages/contracts", "apps/api", "apps/web", "packages/packs"]`
  - `"engines": { "node": ">=26 <27" }`
  - `"packageManager": "npm@<exact version of the npm that runs the install>"`
  - `"//scribaPins"`: a documentation string. It says that `scribaPins` records the Angular, NestJS and Zod majors and the TypeScript line. PLT-01 installs none of the three packages, and PLT-02, PLT-03 and PLT-04 install them at these majors. It also says that if the newest Angular major's build tooling excludes the TypeScript line, implementation stops and records the conflict for the Navigator, and neither pin is changed silently.
  - `"scribaPins"`: `{ "angular": "<major>", "nestjs": "<major>", "zod": "<major>", "typescript": "6.0.<patch>" }`. The Angular, NestJS and Zod majors are resolved at implementation (step 1). The `typescript` value equals the `devDependencies` pin.
  - `"scripts"`:
    - `"build": "npm run build --workspaces"`
    - `"test": "npm test --workspaces && node --test scripts/pins.test.mjs"`
    - `"lint": "npm run lint --workspaces && prettier --check ."`
    - Without `--if-present`, `npm run X --workspaces` fails when a workspace lacks script `X`. So a missing script fails the root command, and the root command covers every workspace.
  - `"devDependencies"`: `typescript` at exactly `6.0.<patch>`; `vitest`, `eslint`, `@eslint/js`, `typescript-eslint` and `prettier` at the versions resolved in step 1d.
- **`package-lock.json`**: created by the root `npm install` at implementation and committed. It is the only lockfile.
- **`.nvmrc`**: `26`
- **`.prettierignore`**: exactly these four lines, anchored: `/units/`, `/modules/`, `/plans/`, `/package-lock.json`. The first three are process documents, which are not formatted code. The lockfile is written by npm.
- **`tsconfig.base.json`**: `strict`, `skipLibCheck`, `target` `ES2022`, `module` and `moduleResolution` `NodeNext`. No `include` or `files`. Each workspace extends it.
- **`eslint.config.mjs`**: a flat config that exports an array. It applies `@eslint/js` recommended and `typescript-eslint` recommended to `**/*.ts`, and ignores `**/dist/**`, `**/node_modules/**` and `**/.angular/**`. The array export lets PLT-09 add its entries.
- **`.prettierrc.json`**: `{ "singleQuote": true, "trailingComma": "all" }`
- **`.gitignore`**: `node_modules/`, `dist/`, `.angular/`, `coverage/`, `.scriba-dev/`, and `.claude/settings.local.json` (a local file that Claude Code writes, which Prettier would otherwise check). `.scriba-dev/` is the dev library folder that `SCRIBA_BOOKS_DIR` defaults to (PLT-01 Decisions line 27). PLT-01 adds only the ignore entry.
- **`deploy/.gitkeep`**, **`e2e/.gitkeep`**, **`examples/.gitkeep`**: empty.
- **`scripts/pins.test.mjs`**: a `node:test` file. It reads `../package.json` relative to itself. It asserts that `scribaPins` is an object, and that its keys `angular`, `nestjs` and `zod` are present with non-empty string values. The test name is "pin section names the Angular, NestJS and Zod majors".

### Each workspace (`packages/contracts`, `apps/api`, `apps/web`, `packages/packs`)

- **`package.json`**
  - `"name"`: `@bbartolome/scriba-contracts`, `@bbartolome/scriba-api`, `@bbartolome/scriba-web`, `@bbartolome/scriba-packs`
  - `"version": "0.0.0"`
  - `"private": true`; no dependencies (the root hoists the tools)
  - `"scripts"`:
    - `"build": "tsc --noEmit -p tsconfig.json"`
    - `"test": "vitest run"`
    - `"lint": "eslint ."`
- **`tsconfig.json`**: `{ "extends": "../../tsconfig.base.json", "include": ["src", "test"] }`
- **`src/.gitkeep`**: empty. The workspace has no source yet. `src/index.ts` is not created, because PLT-02 owns the contracts entry point and PLT-01 must not pre-empt it.
- **`test/smoke.test.ts`**: one passing test. It imports `describe`, `it` and `expect` from `vitest` explicitly (the workspace has no Vitest config, so there are no globals, and `tsc` needs the import). The body is `expect(true).toBe(true)`.

Note: `apps/web` gets no Angular. PLT-03 generates the app. `packages/packs` gets the same TypeScript skeleton for now. Its YAML tool specs come later.

## 3. Method (implementation iteration)

1. Resolve every version before anything is installed:
   - a. the newest Angular, NestJS and Zod majors and their exact versions (`npm view @angular/core version`, `npm view @nestjs/core version`, `npm view zod version`);
   - b. the TypeScript patch on the 6.0 line: `npm view typescript@6.0 version`, then take the highest version printed (by semver);
   - c. confirm that the exact Angular version from step 1a admits the 6.0 patch: `npm view @angular/build@<exact> peerDependencies.typescript` and `npm view @angular/compiler-cli@<exact> peerDependencies.typescript` must both admit the chosen patch. Also run `npm view @angular/build@<exact> peerDependencies.vitest`, and use that range in step 1d. If either TypeScript peer does not admit the patch, the implementation stops and records the conflict for the Navigator (rule in `plans/DECISIONS.md`, 2026-11-10 entry "Angular and TypeScript conflict rule"). It does not pick an older Angular major and does not move the TypeScript line;
   - d. the newest stable `vitest`, `eslint`, `@eslint/js`, `typescript-eslint` and `prettier` (`npm view <pkg> version`), except that `vitest` is the newest version the Angular build peer from step 1c admits. Check that `typescript-eslint`'s peer ranges admit the chosen ESLint and the 6.0 patch (`npm view typescript-eslint@<exact> peerDependencies`). If the newest ESLint falls outside that range, use the newest ESLint that the range admits;
   - e. the npm version to put in `packageManager` (the version of the npm that runs the install).
2. Create the branch `unit/PLT-01`. Create the files in section 2 with the resolved values written in. Run `npm install` at the root once, without `--legacy-peer-deps`. It must succeed. This creates the lockfile. Then run `npx prettier --write .` with the locked Prettier, so that `package.json` and the other files match Prettier's output.
3. Run AC 2 to AC 5 in the working tree. For each criterion, record the output of `node -v` and `npm -v` next to its result. Mark a criterion's checkbox only after its test passes.
4. Commit on branch `unit/PLT-01`. Then run AC 1 in a fresh clone (`git clone -b unit/PLT-01 --no-hardlinks <repo> <tmp>/fresh`), and run AC 2 to AC 5 again in that clone, so that untracked local files (for example `.claude/`) cannot change the result. Then follow driver step 8 (merge, checkboxes, `status: done`, one commit).

## 4. Acceptance criteria and their tests

**AC 1 — `npm ci` on a fresh clone succeeds with one root lockfile.**
- Test: commit everything on `unit/PLT-01`, then `git clone -b unit/PLT-01 --no-hardlinks <repo> <tmp>/fresh`. The clone holds committed files only. In the clone, run `npm ci` on Node 26.
- Pass: exit 0. `find . -name package-lock.json -not -path '*/node_modules/*'` lists one file. No `pnpm-lock.yaml` or `yarn.lock` exists.

**AC 2 — `npm run build`, `npm test` and `npm run lint` pass from the root, and each runs in every workspace.**
- Test: from the root, run `npm run build`, `npm test` and `npm run lint`. Each must exit 0. Run `mkdir -p /tmp/plt01-ac2/` first. Then run each fan-out and save its output outside the repo: `npm run build --workspaces > /tmp/plt01-ac2/build.txt 2>&1`, `npm test --workspaces > /tmp/plt01-ac2/test.txt 2>&1`, `npm run lint --workspaces > /tmp/plt01-ac2/lint.txt 2>&1`. Each command must exit 0. Then `grep -c '^> @bbartolome/scriba-' /tmp/plt01-ac2/build.txt /tmp/plt01-ac2/test.txt /tmp/plt01-ac2/lint.txt` must print 4 for each file, one banner per package. Also run `npx eslint --print-config test/smoke.test.ts` inside one workspace, to confirm that the root ESLint config is found from a workspace.
- Prettier scope check: create a probe file `apps/api/src/modules/platform/probe.ts`, run `npx prettier --file-info apps/api/src/modules/platform/probe.ts`, and confirm `"ignored": false`. Run `npx prettier --file-info modules/platform.md` and confirm `"ignored": true`. Delete the probe file afterwards.
- Pass: all six commands exit 0, each fan-out's banner count is 4, the ESLint print shows the root rules, and the two Prettier file-info results are as stated.

**AC 3 — exactly one TypeScript version is installed.**
- Test: `npm ls typescript --all`, then `find . -path '*/node_modules/typescript/package.json' | wc -l`.
- Pass: `npm ls` exits 0 and shows one version, `6.0.<patch>`. The count is 1, so there is no nested copy.

**AC 4 — Node and npm pins are present.**
- Test: `cat .nvmrc`, `node -p "require('./package.json').engines.node"`, `node -p "require('./package.json').packageManager"`.
- Pass: `.nvmrc` is `26`; `engines.node` is `>=26 <27`; `packageManager` matches `^npm@\d+\.\d+\.\d+$`, an exact npm version.

**AC 5 — the root pin section names the Angular, NestJS and Zod majors (added by Navigator decision).**
- Test: `node --test scripts/pins.test.mjs` (also run inside the root `test` script).
- Pass: exit 0, and the test runs (not zero tests). To check that it can fail, temporarily delete `zod` from `scribaPins` and confirm the test fails, then restore the key. Both results are reported.

## 5. Downstream check

The plan agrees with the downstream units. The files each unit changes are named here, so none is surprised by a PLT-01 file.

- **PLT-02 (`packages/contracts`):** changes its `package.json` (exports map, `zod` at `scribaPins.zod`), its `build` script (emit JS and `.d.ts`), and its `tsconfig.json`. PLT-01 creates no `src/index.ts`, so there is no barrel to remove.
- **PLT-03 (`apps/web`):** the generated Angular app replaces `apps/web/package.json` and `apps/web/tsconfig.json`, adds Angular and Material at `scribaPins.angular`, and deletes the placeholder `apps/web/test/smoke.test.ts`. The replacement `package.json` keeps `"name": "@bbartolome/scriba-web"`, `"version": "0.0.0"` (the banner needs it) and the `build`, `test` and `lint` scripts, with `lint` as ESLint (`eslint .`), because the root fan-out has no `--if-present`. The generator may add its own `typescript` devDependency. PLT-03 must set it to `scribaPins.typescript` or remove it, or AC 3 (one TypeScript copy) breaks. The root `prettier --check .` reaches the generated files, so PLT-03 formats them.
- **PLT-04 (`apps/api`):** adds NestJS and `@nestjs/serve-static` at `scribaPins.nestjs`. It changes `apps/api/package.json` (a `build` that emits), `apps/api/tsconfig.json` (decorator options), and adds a Vitest config for `unplugin-swc`. It owns `apps/api/src` and `apps/api/test`. The same `typescript` devDependency rule as PLT-03 applies.
- **PLT-09:** adds its boundaries rule to the root `eslint.config.mjs`, as its unit says (line 21). Its fixtures must fail lint (its unit lines 25–29), so the root config also needs an `ignores` entry for the folder that holds them, or the fixtures must sit where workspace `eslint .` does not reach. PLT-09 may also add a root `devDependencies` entry, such as a boundaries plugin. All of these are known edits to PLT-01 files.
- **PLT-10:** reads Node from `.nvmrc` (consistent with section 2). Its `ci.yml` is a file the root `prettier --check .` reaches, so PLT-10 formats it.
- **PLT-11:** adds `concurrently` to the root `devDependencies` and the root `dev` script. It uses the dev library defaults from PLT-01 (`.scriba-dev/` for `SCRIBA_BOOKS_DIR`). It adds a root `README.md`, which the root `prettier --check .` checks, so PLT-11 formats it.
- **PLT-12:** adds the root `mock:openai` script. Its scenario JSON files under `e2e/fixtures/` are reached by the root `prettier --check .`, so PLT-12 formats them. Its unit (line 20) says it may make `e2e/` a workspace. If `e2e/` stays a plain folder, PLT-12's tests are not run by the root `npm test`, which runs only the workspaces and the pin test. In that case PLT-12 must either make `e2e/` a workspace (with `build`, `test` and `lint` scripts, because the fan-out has no `--if-present`) or add a root test script. Either option edits the root `package.json` and the lockfile, and removes `e2e/.gitkeep`.
- **PLT-13:** adds the root `e2e` script (its unit, line 26). It makes `e2e/` a workspace only if it needs its own dev dependencies, as PLT-01 Decisions line 23 says. If `e2e/` stays a plain folder, PLT-13 adds `@playwright/test` to the root `devDependencies`.
- **Root lockfile:** PLT-02, PLT-03, PLT-04, PLT-09, PLT-11, PLT-12 and PLT-13 each change the root `package-lock.json` when they add a dependency or a workspace. Each of those units commits the updated lockfile with its own change.

## 6. Points the Opus reviewer should check

- `packages/packs` is named `@bbartolome/scriba-packs`. The unit gives the path only, so the name follows the pattern of the other three.
- The ignored dev library folder is `.scriba-dev/`. The unit gives no name, only "a git-ignored repo-local folder".
- `.prettierignore` also lists `/package-lock.json`. This is a plan choice: npm writes the lockfile, and it is not formatted code.
- `"//scribaPins"` is a documentation key. npm ignores unknown keys, and the pin-section test does not read it.
- The workspace `"version": "0.0.0"` is a plan choice. It is needed for npm's banner to name each package (verified by the driver in a temporary two-workspace project).
- The tool versions are the newest stable at implementation (step 1d), except TypeScript (6.0.x, decided). `typescript-eslint` is included because the workspaces contain TypeScript. Its peer range is checked at implementation.
- AC 2 checks that a workspace's `eslint .` finds the root `eslint.config.mjs`, that the fan-out names all four packages, and that the Prettier scope is as stated. Each is tested rather than assumed.
