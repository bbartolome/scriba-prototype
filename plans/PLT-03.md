---
id: PLT-03
status: done
---
# PLT-03 plan — apps/web bootstrap (Angular + Material placeholder and dev proxy)

Batch: [PLT-02, PLT-03, PLT-09, PLT-10] (Platform, phase:scaffold, M1). Revision 2, revised after the DECISIONS 2026-11-11 Opus reviews.

## 1. Decisions this plan follows

- Bare Angular + Material app, package `@bbartolome/scriba-web`, with one placeholder page that has a "Scriba" heading. Source: units/PLT-03-web-bootstrap.md lines 18, 25.
- Angular's default test runner (Vitest). Source: unit line 20; modules/platform.md line 58 ("Vitest everywhere").
- Feature folders at `apps/web/src/app/features/<m>/`; the folder exists and is empty. Source: unit lines 21, 27.
- The proxy maps exactly `/api`, `/healthz` and `/events` to the API on 8080, and SSE is not buffered. Source: unit line 26; units/PLT-11-scaffold-gate.md line 28.
- The web composition root, route table and proxy pass to the Frontend shell at `phase:core` (SHL-01). Platform does not edit them after handover. Source: unit line 19; units/SHL-01-composition-root.md line 3.
- The production bundle is served by NestJS (PLT-04) on the same origin. PLT-03 configures no production serving. Source: unit line 22.
- Angular major 22 from `scribaPins.angular` ("22") in the root `package.json`. The `@angular/*` packages are at the resolved 22.2.5. Source: DECISIONS, 2026-11-10 "versions resolved at implementation".
- TypeScript: one root copy at `scribaPins.typescript` (6.0.3). The generator's own TypeScript devDependency is removed, not set, so no nested copy exists. Source: DECISIONS, 2026-11-10 "TypeScript major in the pin section"; PLT-01 section 5 (PLT-03 entry).
- `apps/web/package.json` keeps `"name": "@bbartolome/scriba-web"`, `"version": "0.0.0"`, `"private": true`, and the `build`, `test` and `lint` scripts. `lint` is `eslint .`. Source: PLT-01 section 5; DECISIONS, PLT-01 rejection 3 notes (the root fan-out has no `--if-present`).
- The PLT-01 placeholder `apps/web/test/smoke.test.ts` is deleted. Source: PLT-01 section 5; DECISIONS, PLT-01 rejection 3 notes.
- Prettier: generated files are formatted with the root config (`prettier --write`). No `.prettierignore` entry is added and the root lint is not changed. Source: PLT-01 section 1 (Prettier scope) and section 5 (PLT-03 entry).
- Tests run on Node 26. Source: DECISIONS, 2026-11-10 "Node runtime for the tests"; `.nvmrc` is 26.
- Tests check external behaviour only (rendered DOM, files on disk). Source: modules/platform.md, "Testing principles".
- Vitest specs import `describe`, `it` and `expect` from `vitest` explicitly. Source: PLT-01 section 2 (smoke test note).
- The generated app has no router (`--routing=false`). SHL-01 adds the router and the route table, so PLT-03 creates no route file. Source: unit line 19 (ownership).
- The proxy target is `http://127.0.0.1:8080`, not `localhost`, to avoid an IPv6 `::1` lookup against an IPv4 listener. The API listens on all interfaces. Source: modules/platform.md line 35.

## 2. Files to create or change

Method: the app is generated with `ng new` in a scratch directory outside the repo, then a fixed set of files is copied in (section 3). Generating in place is ruled out because `apps/web` already holds a `package.json` and `tsconfig.json`, and the generator would add a second package.json, lockfile, README, .gitignore and .editorconfig.

| Path | Purpose |
|---|---|
| `apps/web/package.json` | Rewritten by hand (step 5): name, version, private; scripts `build`, `start`, `test`, `lint`; exact `@angular/*`, Material, CDK, and test-environment devDependencies; no TypeScript entry |
| `apps/web/tsconfig.json` | Replaced (step 6): extends `../../tsconfig.base.json`; overrides `module` and `moduleResolution` only (section 6, point 3) |
| `apps/web/tsconfig.app.json`, `apps/web/tsconfig.spec.json` | Generated, kept |
| `apps/web/angular.json` | Generated, kept; the project's serve options gain `"proxyConfig": "proxy.conf.json"` |
| `apps/web/proxy.conf.json` | New. Exactly three keys: `/api`, `/healthz`, `/events`, each `{ "target": "http://127.0.0.1:8080" }` |
| `apps/web/src/main.ts`, `src/app/app.config.ts`, `src/index.html`, `src/styles.css`, `src/material-theme.scss` | Generated, kept, except the font links in `src/index.html` (note below). `material-theme.scss` is the Material theme, written by `ng add`; `angular.json` loads it before `src/styles.css` |
| `apps/web/src/app/app.ts`, `app.html`, `app.css` | Generated, then edited: the component has no title field; template `<mat-toolbar><h1>Scriba</h1></mat-toolbar>`; imports `MatToolbar`. CSS stays empty |
| `apps/web/src/app/app.spec.ts` | Generated, then replaced with one test (section 4, criterion 2) |
| `apps/web/src/app/features/.gitkeep` | New. Keeps the empty folder in git |
| `apps/web/public/` | Generated if present, kept (binary only) |
| `apps/web/test/` (including `smoke.test.ts`) | Deleted |
| `apps/web/src/.gitkeep` | Deleted (`src/` now has files) |
| `scripts/web-proxy.test.mjs` | New. `node:test` file for criterion 3 |
| `package.json` (root) | `test` line becomes `npm test --workspaces && node --test 'scripts/*.test.mjs'`, a quoted glob that runs every root test file (DECISIONS 2026-11-11). PLT-03 is the only unit that sets it; PLT-09 and PLT-10 add files only (section 6, point 7) |
| `package-lock.json` (root) | Updated by the root `npm install`; still the only lockfile |

Not copied from the scratch project: `.editorconfig`, `.gitignore` (the root ignore rules cover it), `README.md` (the root README belongs to PLT-11), `.vscode/`, generated AI-config files, the scratch `package.json` and lockfile, `node_modules/`, `.angular/`, `dist/`.

Font links: the font links in `src/index.html` (preconnect, Roboto, Material Symbols) are deleted. The page uses no Material Symbols icon, and Roboto falls back to the system font (accepted for a placeholder).

## 3. Method

Shell state does not persist between commands, so each command below uses the absolute scratch path written by step 2.

0. Preconditions. `git status --short` prints nothing. `git switch -c unit/PLT-03` from `main`. `node -v` prints v26.x. Record `node -v` and `npm -v` next to each result.
1. Resolve versions (read-only, nothing installed):
   a. `npm view @angular/core@22 version`: take the highest 22.x (expected 22.2.5).
   b. `npm view @angular/build@22.2.5 peerDependencies` and `npm view @angular/compiler-cli@22.2.5 peerDependencies.typescript`: both must admit `6.0.3`. The `vitest` range of `@angular/build` must admit `5.1.0`. If any fails, stop and record the conflict for the Navigator (DECISIONS, "Angular and TypeScript conflict rule"). Do not change Angular or TypeScript.
   c. `npm view @angular/material@22 version` (highest 22.x), then `npm view @angular/material@<v> peerDependencies`: the `@angular/core` peer must admit 22.2.5. Record the exact versions of `@angular/material`, `@angular/cdk` and the test-environment packages the generator adds.
   d. `npm view @angular/cli@22.2.5 engines`: must admit Node 26.
2. Generate in scratch, outside the repo:
   `export NG_CLI_ANALYTICS=false; SCRATCH=$(mktemp -d /tmp/plt03-gen.XXXXXX); cd "$SCRATCH"`
   `npx -p @angular/cli@22.2.5 ng new --help`: confirm the flag names. Expected: the help lists `--routing`, `--ssr`, `--style`, `--test-runner`, `--skip-git`, `--skip-install`, and `--ai-config` if it exists.
   `npx -p @angular/cli@22.2.5 ng new scriba-web --defaults --skip-git --skip-install --style=css --routing=false --ssr=false --test-runner=vitest` (add `--ai-config=none` if that flag exists). Expected: `$SCRATCH/scriba-web/` with `angular.json`, `package.json`, `src/app/`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`. The project name `scriba-web` gives the build output `dist/scriba-web/`.
3. Add Material in scratch: `cd "$SCRATCH/scriba-web" && npm install && npx ng add @angular/material@<exact> --skip-confirmation`. Expected: `@angular/material` and `@angular/cdk` appear in its `package.json`; `src/material-theme.scss` holds the theme, and `angular.json` loads it before `src/styles.css`. Confirm the theme flag with `ng add @angular/material --help` if one is needed.
4. Copy the allowlist from scratch into the repo, from the repo root: `cp -R "$SCRATCH/scriba-web/src" apps/web/`; `cp "$SCRATCH/scriba-web/angular.json" "$SCRATCH/scriba-web/tsconfig.json" "$SCRATCH/scriba-web/tsconfig.app.json" "$SCRATCH/scriba-web/tsconfig.spec.json" apps/web/`; `cp -R "$SCRATCH/scriba-web/public" apps/web/` if it exists. Then `rm -rf apps/web/test apps/web/src/.gitkeep`. Expected: `git status --short` lists only the paths in section 2.
5. Rewrite `apps/web/package.json` by hand, then `npx prettier --write apps/web/package.json`. Keep `name`, `"version": "0.0.0"` and `"private": true`. Scripts: `"build": "ng build"`, `"start": "ng serve"`, `"test": "ng test --watch=false"`, `"lint": "eslint ."`. Dependencies: the generator's `@angular/*` at 22.2.5 (or the patch resolved in step 1a), `rxjs` and `tslib` at the generator's exact versions, and `@angular/material` and `@angular/cdk` at their step 1c versions, all exact. DevDependencies: `@angular/build`, `@angular/cli`, `@angular/compiler-cli` at 22.2.5 and the test-environment packages the generator adds, exact, except `vitest`: pin it to the root `5.1.0` or omit it, then check that `npm ls vitest` shows one copy. Remove the generator's `typescript` entry.
6. Edit `apps/web/tsconfig.json`: set `"extends": "../../tsconfig.base.json"`, keep the generator's `module` and `moduleResolution` values (if the generator writes `module: preserve` with no `moduleResolution`, set `moduleResolution: bundler` explicitly), and drop the rest of the generator's own compilerOptions that the base already sets. Expected: `npx tsc -p apps/web/tsconfig.json --showConfig` (read-only) shows `strict: true` and `target: ES2022` from the base, and the Angular `module` and `moduleResolution` values.
7. Write `apps/web/proxy.conf.json` with the three keys. In `apps/web/angular.json`, put `"proxyConfig": "proxy.conf.json"` under the project's serve options. Expected: `grep -n proxyConfig apps/web/angular.json` prints one line, under serve.
8. Edit the placeholder: `apps/web/src/app/app.ts` (import `MatToolbar` from `@angular/material/toolbar`, remove the title field) and `app.html` (`<mat-toolbar><h1>Scriba</h1></mat-toolbar>`). Create the empty `apps/web/src/app/features/.gitkeep`.
9. Replace `apps/web/src/app/app.spec.ts` with one `it`. It configures TestBed with the component, creates it, calls `detectChanges()` and awaits `whenStable()` (Angular is zoneless by default), reads the `h1` and expects its text to contain `Scriba`. It imports `describe`, `it` and `expect` from `vitest`.
10. Write `scripts/web-proxy.test.mjs` (`node:test`, no dependencies). It reads `apps/web/proxy.conf.json` and `apps/web/angular.json`, relative to itself. It asserts that the sorted keys of the proxy file equal `['/api', '/events', '/healthz']`, that each target has port 8080, and that the project's serve options name `proxy.conf.json`. Then edit the root `test` script as in section 2. Expected: `node --test scripts/web-proxy.test.mjs` passes.
11. From the repo root: `npx prettier --write apps/web scripts/web-proxy.test.mjs package.json`, then `npx prettier --check .`. Expected: exit 0. `.prettierignore` and `eslint.config.mjs` are not changed.
12. From the repo root: `npm install` without `--legacy-peer-deps`. Expected: exit 0, no ERESOLVE, root `package-lock.json` updated. Then `npm ls typescript --all` shows one `typescript@6.0.3`, and `find . -path '*/node_modules/typescript/package.json' | wc -l` prints 1. Then `node -p "require('./apps/web/package.json').dependencies['@angular/core']"` starts with `22.`.
13. Run the criteria in section 4 in the working tree, then the supporting SSE check, then the root fan-out: `npm run build`, `npm test` and `npm run lint`, each exit 0 (the PLT-01 criteria must still pass). Then `cd apps/web && npx eslint --print-config src/app/app.ts` prints the root rules.
14. Commit on `unit/PLT-03`. As PLT-01 did, run the criteria once more in a fresh clone (`git clone -b unit/PLT-03 --no-hardlinks <repo> <tmp>/fresh`, then `npm ci`). Then follow the driver's merge steps.

## 4. Acceptance criteria and tests

Each criterion is quoted from units/PLT-03-web-bootstrap.md, lines 30 to 32. Commands run from the repo root.

**Criterion 1.** "`npm run build -w @bbartolome/scriba-web` produces a static bundle with `index.html`."
- Test: no unit test. The seam is the build output on disk, at the path that PLT-04 and PLT-13 use.
- Command: `npm run build -w @bbartolome/scriba-web; echo "exit=$?"; test -f apps/web/dist/scriba-web/browser/index.html && grep -c '<app-root' apps/web/dist/scriba-web/browser/index.html`
- Pass: `exit=0`, `test -f` succeeds, and the grep count is at least 1. If the path differs, section 6, point 2 applies, and the criterion is not marked passed until the file exists at the recorded path.

**Criterion 2.** "`npm test -w @bbartolome/scriba-web` runs one passing Vitest component test of the placeholder page."
- Test file: `apps/web/src/app/app.spec.ts`. Seam: TestBed renders the component, and the test reads the rendered DOM.
- Command: `npm test -w @bbartolome/scriba-web; echo "exit=$?"`
- Pass: `exit=0`, and the runner summary reports 1 test, 1 passed, 0 failed. To check that the test can fail, change the expected text to `'Nope'`, run again, expect a failure, restore `'Scriba'`, and report both results.

**Criterion 3.** "The proxy config covers exactly `/api`, `/healthz` and `/events`."
- Test file: `scripts/web-proxy.test.mjs` (root, `node:test`, run by the root `test` script). Seam: the files on disk, `apps/web/proxy.conf.json` and `apps/web/angular.json`.
- Command: `node --test scripts/web-proxy.test.mjs; echo "exit=$?"`
- Pass: `exit=0`, at least 3 tests run, none fail, and the key list equals the three paths. To check that the test can fail, add a `"/foo"` key temporarily, expect a failure, remove it, and report both results.
- Limit: criterion 3 tests the content of the config, not the proxy's behaviour. SSE is checked by the supporting check below. Its result is reported separately and does not change criterion 3.

Supporting SSE check (not a criterion). A Node stub at `/tmp/plt03-stub/server.mjs`, outside the repo, listens on 8080. It writes `data: <n>` every second on `/events`, and answers `/healthz` and `/api/ping` with a short body. Start the stub, then `npm run start -w @bbartolome/scriba-web` (dev server on 4200). Run `curl -sN -m 5 http://localhost:4200/events | while read -r l; do echo "$(date +%s) $l"; done`. Pass: the `data:` lines carry timestamps about one second apart, not all at the end. Also `curl -s http://localhost:4200/healthz` and `curl -s http://localhost:4200/api/ping` return the stub bodies. Stop the dev server and the stub afterwards. If the check fails, section 6, point 5 applies.

## 5. Downstream agreement

- **PLT-11 (scaffold gate).** Needs: web `build`, `test` and `lint` green from the root (its criterion 2); the dev server proxying the three paths (its criterion 1); the placeholder visible at the dev URL. PLT-03 provides `start` (`ng serve`) with the proxy wired in `angular.json`. The root `dev` script belongs to PLT-11 (its Decisions, line 20). The PLT-03 Why (unit line 15) says `npm run dev` must work before the Shell exists. PLT-03 adds no `dev` script. The Navigator decided that PLT-11 owns `dev` and composes `start` (DECISIONS 2026-11-11; section 6, point 6). PLT-01 AC 2's probe (`npx eslint --print-config test/smoke.test.ts`) runs in workspaces that still have `test/smoke.test.ts`, where it exits 0. PLT-11 does not need to re-point the probe (section 6, point 8).
- **PLT-13 (e2e).** Needs: a built bundle at a known path, served by the API on one origin (PLT-04), and an element to assert (its Decisions, lines 20 and 22). PLT-03 provides the bundle at `apps/web/dist/scriba-web/browser/index.html` and an `h1` reading "Scriba", rendered by Angular, so the check must wait for rendering and cannot read raw HTML. No conflict. The harness does not use the dev proxy.
- **SHL-01 (composition root).** Takes over the app config, the root component, `proxy.conf.json` and `src/app/features/` (unit front matter, line 3). PLT-03 gives a router-free app, so SHL-01 adds the router and the route table. SHL-01 replaces the placeholder and its one test; criterion 2 holds at PLT-03's merge only. No conflict.
- **PLT-04 (API).** Serves the bundle from `apps/web/dist/scriba-web/browser/` (unit line 22). PLT-03 configures no production serving. PLT-04's planning must use this path, and so must any later unit that copies the bundle (for example PLT-14).
- **PLT-09 and PLT-10 (boundaries lint, CI).** PLT-09's boundaries rule covers `apps/web/src/app/features/` (unit line 21), and that folder exists. PLT-10's CI order (lint, test, build) holds: `ng test` and `eslint .` need no build output. PLT-03 adds no root devDependency; it sets the root `test` line to the glob `node --test 'scripts/*.test.mjs'` (DECISIONS 2026-11-11).
- **PLT-02 (contracts).** No direct dependency. Both units change the root `package-lock.json`, so the second merge rebases the lockfile.

## 6. Open points

1. CLI flag and file names. Angular 22's flag names (`--test-runner`, `--routing`, `--ssr`, `--ai-config`, the Material theme flag) and the generated names (class `App`, files `app.ts`, `app.html`) are not confirmed by the files in this repo. Steps 2 and 3 confirm them with `--help` and the generated output. The flags in this plan state the intent.
2. Output path. `dist/scriba-web/browser/` assumes the application builder's default. Step 13 confirms it. If it differs, PLT-04 and PLT-13 need the new path, and the Navigator decides whether to pin `outputPath`.
3. Module settings. Decided (DECISIONS 2026-11-11): `apps/web/tsconfig.json` extends the base and overrides `module` and `moduleResolution` only. `tsconfig.base.json` (NodeNext, lines 6 and 7) is unchanged for the API and contracts. The Angular values are kept from the generator and decided at implementation.
4. `ng test --watch=false`. Assumed to be the run-once form for Angular 22's Vitest builder. If the builder rejects it, the script uses the run-once option the builder documents, and the Navigator is told.
5. SSE buffering. A JSON proxy config cannot set streaming options. If the supporting check shows buffering, the fix is a JavaScript proxy config, which changes the file form that criterion 3 tests. That is a Navigator decision and this plan does not make it.
6. `dev` versus `start`. Decided (DECISIONS 2026-11-11): this plan provides `start` only, and PLT-11 owns the root `dev` script. Unit line 15 is rationale, realized at the PLT-11 gate (criterion 1).
7. Root `test` script. Decided by the Navigator (DECISIONS 2026-11-11): one quoted glob, `node --test 'scripts/*.test.mjs'`, set here. It replaces the explicit file list that PLT-01 approved. The alternative, a proxy test inside `apps/web`, would make `npm test -w` run two tests, which conflicts with criterion 2's "one". The glob keeps the proxy test at the root.
8. PLT-01 AC 2 probe. Closed. Reason: the probe runs in workspaces that still have `test/smoke.test.ts`, and `npx eslint --print-config` exits 0 there. PLT-11 does not need to re-point the probe.
9. Material usage. Decided (DECISIONS 2026-11-11, smaller choices item 4): the placeholder uses one Material component (`mat-toolbar`), so the Material wiring is exercised. The criteria are the same with a bare heading.
