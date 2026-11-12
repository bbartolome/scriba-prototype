---
id: PLT-13
status: done
---
# PLT-13 plan — Playwright harness, one e2e journey with five pending steps, e2e in CI

Batch: [PLT-13] (Platform, phase:test-harness, M1); batch of one. Revision 3, approved by Opus (DECISIONS 2026-11-12, commit 909eb29). Revision 2 was revision 1 with the fixes of rejection 1 (commit 57d9922), and revision 3 applied the fixes of rejection 2 (commit dd74821). The text edits made after the approval are applied in place and listed at the top of section 6, as PLT-12 did. Written against `main` at `d810dd8`; `main` is now at `909eb29`, which changes `plans/DECISIONS.md` only. The plan file is untracked. Status `planned`. Section 7 lists the facts checked with commands; section 8 lists what was not checked.

## 1. Decisions this plan follows

Harness and journey (from the unit):
- The harness builds the web bundle, starts the API on that bundle (one origin, no dev origins) against a temp library, starts the mock OpenAI server, and waits for `/healthz`. Source: PLT-13 unit line 20.
- The harness configures no model provider. The agent-run step does, through the Model providers API, pointing a provider at the mock scenario URL. Source: unit line 21; AGL-08 unit line 18; MPR-08 unit line 19.
- One e2e test with five named steps in this order: setup, project from sample, agent run, accept change, manuscript. Live here: the harness, the boot and an app-loads check. The five steps are placeholders that report as pending. Source: unit lines 22 and 32.
- Owners, as the unit names them (line 23), with the milestone at which each owner's unit turns its step on. Each placeholder's comment names both:
  - setup: Setup & auth, M1. SAU-08 line 17 ("Extend Platform's e2e"). SAU-16 line 17 extends the same block at M2.
  - project from sample: Project store, M1. PST-09 line 26.
  - agent run: Agent loop, M1. AGL-08 line 18.
  - accept change: Project store review, M3. PST-22 line 17; AGL-15 (M3) line 17.
  - manuscript: Compile & export, M5. CEX-20 line 17.
- Export is not in the e2e. Source: unit line 24; CEX-20 line 17 ("No export step in the e2e").
- Browser: the pre-installed Chromium, with no install step (section 6, open point 1). The local run uses Playwright's own lookup. The CI run uses the Chromium that the runner image installs at `/usr/bin/chromium` (section 5). Trace is off unless `CI` is set; then `retain-on-failure`. Source: unit line 25.
- A root `npm run e2e` script. Source: unit line 26.
- Scope: the `e2e/` config, the harness global setup and teardown, the journey spec, the root script, and one `e2e` step appended after `Build` in the single `ci.yml` job, with a trace upload on failure. Source: unit line 29; PLT-10 unit line 18 ("The e2e step is appended by PLT-13").
- The harness does not use `npm run dev`, which has the dev proxy and the dev origins. Source: plans/PLT-11.md line 241.
- Merging PLT-13 with PLT-12 closes `phase:test-harness`. Source: unit line 14; `units/README.md` line 74.

Workspace, pins and lockfile:
- `e2e/` is already an npm workspace named `@bbartolome/scriba-e2e`. PLT-13 adds its Playwright dependency to the e2e workspace's `package.json`, not the root. Source: PLT-12 plan section 1 decision 1; PLT-12 section 5, PLT-13 bullet (line 209); PLT-01 plan section 5 line 114 (the root gets `@playwright/test` only if `e2e/` stays a plain folder, which it does not).
- `@playwright/test` is pinned exact at `1.65.0`, the newest on npm when this plan was written (2026-11-12). Source: every root devDependency is exact (root `package.json`, checked in section 7); PLT-12 decision 2 pins `openai` the same way.
- Lock gate: an install may add entries. It may not change `version`, `resolved` or `integrity` of an existing package entry, and may not remove one. Source: DECISIONS 2026-11-11 "PLT-02 — lockfile gate at the batch collection"; PLT-12 decision 21.
- The install step is a plain `npm install` with no package argument, after the workspace file is edited. Source: the task for this plan; the method of PLT-12 section 3, step 3.

Test runners and scoping:
- The root `test` line is unchanged. It runs `npm test --workspaces`, which runs the e2e workspace's Vitest script, so Playwright specs are not run by root `npm test`. Source: DECISIONS 2026-11-11 "root test script: one quoted glob" (later units add test files and do not edit the line).
- Vitest stays the unit-test runner. The e2e journey runs under Playwright, as the PLT-13 unit states (unit lines 12 and 22). Source: `modules/platform.md` line 58 ("Vitest everywhere").
- Tests exercise external behaviour (`modules/platform.md` lines 57 and 58; `units/README.md` line 133). The criterion checks in section 4 use exit codes, stdout, the Playwright JSON report, the workflow file and trace files. Criterion 3 also has one source check (the owner comments), because the criterion is about comments.

Test-file scoping (decided here):
- The hazard that PLT-12 section 5 names (the PLT-13 bullet, line 209) is real. Measured in section 7: Vitest's default include runs a `*.spec.ts` file and fails it, and Playwright's default match loads the Vitest mock test and lists zero tests.
- Rule. A Playwright spec ends `.e2e.ts` and lives only in `e2e/specs/`. `playwright.config.ts` sets `testDir: './specs'` and `testMatch: '**/*.e2e.ts'`. A Vitest test ends `.test.ts`. Vitest has no config file, and its default include never matches `*.e2e.ts`. No file under `e2e/` may end `.spec.ts`. Checks S1 and S2 (section 4) prove both directions.

Root wiring and formatting:
- The root `package.json` gains `scripts.e2e` = `npm run e2e -w @bbartolome/scriba-e2e`, so the root script delegates to a workspace script named `e2e` (`playwright test`). Source: PLT-12 decision 17 (the same wiring for `mock:openai`).
- Prettier checks the new files. Prettier 3 reads `.gitignore`, so the new `e2e/test-results/` folder is ignored once its line is in `.gitignore` (checked in section 7). Source: DECISIONS 2026-11-10 "PLT-01 — Prettier scope"; PLT-12 decision 20.
- Node 26: `.nvmrc` is `26`, and root `engines` is `>=26 <27`.

App-loads check:
- The app-loads check asserts the placeholder page's `Scriba` heading, and that the API boot wrote its settings file into the temp library. Source: PLT-03 unit line 25 ("so that the e2e app-loads check (PLT-13) has something to assert").

## 2. Files to create or change

Only the paths below change. Nothing under `apps/`, `packages/`, `examples/`, `scripts/` or `e2e/fixtures/` changes. The root `test`, `lint`, `build` and `dev` lines do not change, and nor do `tsconfig.base.json`, `eslint.config.mjs`, `.prettierignore` and `README.md`. The root `build` already type-checks the e2e workspace (PLT-12 section 2).

| Path | Change | Purpose |
|---|---|---|
| `e2e/package.json` | edit | `scripts.e2e` = `playwright test`; `devDependencies["@playwright/test"]` = `1.65.0` (exact). Other fields unchanged |
| `e2e/tsconfig.json` | edit | `include` becomes `["fixtures", "harness", "specs", "playwright.config.ts"]`; `compilerOptions` unchanged |
| `e2e/playwright.config.ts` | new | the scoping rule, `globalSetup`, the reporters, `baseURL`, the trace rule and the browser override (section 3, step 8) |
| `e2e/harness/global-setup.ts` | new | default export: builds, temp library, API start, mock start, `/healthz` wait; returns the teardown (section 3, step 8) |
| `e2e/specs/journey.e2e.ts` | new | the one test: the app-loads step and five placeholder steps (section 3, step 9) |
| `package.json` (root) | edit | `scripts.e2e`, added after `mock:openai` |
| `package-lock.json` | changed by npm | adds `node_modules/@playwright/test`, `node_modules/playwright` and `node_modules/playwright-core`; the `e2e` workspace entry gains the devDependency |
| `.gitignore` | edit | one line: `e2e/test-results/` |
| `.github/workflows/ci.yml` | edit | two steps after `Build` (section 3, step 11) |

Generated and ignored, not committed: `e2e/test-results/`, `apps/api/dist/`, `apps/web/dist/`, `packages/contracts/dist/`.

## 3. Method

Record `node -v` and `npm -v` with each result (expected: `v26.x` and `11.20.0`). Do not use the main checkout's `node_modules`: it predates the lock and cannot build (section 7). Do not run `playwright install`. Do not push, add a remote or open a PR. Commit only after the checks pass.

0. Precondition. `git merge-base --is-ancestor d810dd8 main` exits 0. `git diff --quiet d810dd8 main -- ':!plans'` exits 0, so nothing outside `plans/` differs from the base. `git status --short -- ':!plans'` prints nothing. `git ls-files e2e` lists the eleven PLT-12 files. `test -e e2e/playwright.config.ts` fails. If any check differs, stop and report.
1. Pins (read-only). `npm view @playwright/test@1.65.0 version` prints `1.65.0`. `npm view playwright-core@1.65.0 engines` admits Node 26 (`>=20`). Record the Chromium revision: `npm pack playwright-core@1.65.0` into an empty directory, extract it into a second empty directory, and read `package/browsers.json`. Expected: Chromium revision `1254` (section 7). All exit 0.
2. Worktree. `git worktree add -b unit/PLT-13 /tmp/plt13-wt d810dd8`. Expected: created. Every later step runs in `/tmp/plt13-wt`.
3. Base install. In `/tmp/plt13-wt`, run `npm ci`. Expected: exit 0 (8 s in the section 7 check). This shows that the base lock installs before anything changes.
4. Workspace edits. Edit `e2e/package.json` and `e2e/tsconfig.json` as section 2 says.
5. Install. Run a plain `npm install` with no package argument. Expected: exit 0. `npm ls @playwright/test openai @types/node` shows one copy of each: `@playwright/test` 1.65.0, `openai` 7.55.0, `@types/node` 26.6.6. The `install-scripts` warnings for `lmdb@3.5.6` and `msgpackr-extract@3.0.7` also appear in `npm ci` on the base (section 7), so they are not PLT-13 changes.
6. Lock gate. Run:
   ```
   git show d810dd8:package-lock.json > /tmp/plt13-lock-base.json && node --input-type=module -e "
   import { readFileSync } from 'node:fs';
   const a = JSON.parse(readFileSync('/tmp/plt13-lock-base.json', 'utf8')).packages;
   const b = JSON.parse(readFileSync('package-lock.json', 'utf8')).packages;
   const changed = Object.keys(a).filter((k) => k in b && ['version', 'resolved', 'integrity'].some((f) => a[k][f] !== b[k][f]));
   const removed = Object.keys(a).filter((k) => !(k in b));
   const added = Object.keys(b).filter((k) => !(k in a));
   console.log({ changed, removed, added });
   if (changed.length || removed.length) throw new Error('lock gate failed');
   "
   ```
   Expected: `changed` and `removed` are empty, and `added` is exactly `node_modules/@playwright/test`, `node_modules/playwright` and `node_modules/playwright-core`. If the gate fails, stop and report. Do not edit the lock by hand.
7. Root wiring. Add `"e2e": "npm run e2e -w @bbartolome/scriba-e2e"` to the root `scripts`, after `mock:openai`. Add the line `e2e/test-results/` to `.gitignore`.
8. Config and harness. Create `e2e/playwright.config.ts` and `e2e/harness/global-setup.ts`.
   - Config: `testDir` `./specs`; `testMatch` `**/*.e2e.ts`; `globalSetup` `./harness/global-setup.ts`; `workers` 1; `forbidOnly` when `CI` is set; reporters `list` and `json`, where the JSON file is the absolute path `e2e/test-results/report.json` built from `import.meta.url`; `use.baseURL` `http://127.0.0.1:8080`; `use.trace` `retain-on-failure` when `CI` is set and `off` otherwise; `use.launchOptions.executablePath` = `process.env.SCRIBA_E2E_CHROMIUM`, or `undefined` when it is unset.
   - Harness, in this order:
     a. Port check: open a probe socket on `0.0.0.0` port 8080, which is the address the API binds (`apps/api/src/main.ts`). If it fails with `EADDRINUSE`, throw `port 8080 is in use`. The API always binds 8080, so a server already there would pass the health wait. Close the probe socket before the spawn in step d, so the API can bind the port.
     b. Build, from the repo root, with `stdio: 'inherit'`: `npm run build -w @bbartolome/scriba-contracts`, then `-w @bbartolome/scriba-api`, then `-w @bbartolome/scriba-web`. The order matters: the API imports contracts from `dist`.
     c. Library: `mkdtemp(join(tmpdir(), 'scriba-e2e-'))`. Print `e2e: library <path>`. Set `process.env.SCRIBA_E2E_LIBRARY` to the path.
     d. API: spawn `process.execPath` on `apps/api/dist/main.js`, with an environment of exactly `PATH`, `SCRIBA_BOOKS_DIR` (the library), `SCRIBA_PACKS_DIR` (`<repo>/packages/packs`) and `SCRIBA_EXAMPLES_DIR` (`<repo>/examples`). The last two are the values the root `dev` script sets. Nothing else is passed, so an `SCRIBA_*` variable in the developer's shell cannot leak in. `SCRIBA_SETUP_URL_BASE` is not passed either (section 5, SAU-08). The API's stdio is `inherit` or `ignore`, never an unread `pipe`, because an unread pipe fills up and blocks the API.
     e. Mock: `startMockOpenAI()` from `e2e/fixtures/mock-openai/server.mjs`, with no options, so it loads the shipped scenarios. Print `e2e: mock OpenAI at <baseUrl>`. Set `process.env.SCRIBA_E2E_MOCK_URL` to `baseUrl`. Check that `GET <baseUrl>/scenario/tool-call/v1/models` returns 200, then `POST <baseUrl>/__mock/scenarios/tool-call/reset` returns 204. The probe is itself a recorded request, so the reset clears its record and attempt count before any test runs.
     f. Health: poll `GET http://127.0.0.1:8080/healthz` every 200 ms until it returns 200 with `status` `ok`. Fail after 60 s, or at once if the API process has exited. Print `e2e: API ready at http://127.0.0.1:8080/healthz`.
     g. Teardown: the function that `globalSetup` returns sends SIGTERM to the API, waits for it to exit, closes the mock, and removes the library. If setup throws after any of steps c to f has started a resource, the setup itself kills the API, closes the mock and removes the library before it rethrows, because Playwright does not call the teardown when setup fails (section 8).
9. Journey spec. Create `e2e/specs/journey.e2e.ts` with one test, titled `journey: setup, project from sample, agent run, accept change, manuscript`. Its shape:
   ```ts
   import { existsSync } from 'node:fs';
   import { join } from 'node:path';
   import { expect, test, type TestInfo } from '@playwright/test';

   // A placeholder records itself as pending. Its owner replaces the call with the step's assertions.
   function pending(testInfo: TestInfo, name: string): void {
     testInfo.annotations.push({ type: 'pending', description: name });
     console.log(`pending: ${name}`);
   }

   test('journey: setup, project from sample, agent run, accept change, manuscript', async ({ page }, testInfo) => {
     await test.step('app loads', async () => {
       const errors: Error[] = [];
       page.on('pageerror', (error) => errors.push(error));
       await page.goto('/');
       await expect(page.getByRole('heading', { name: 'Scriba' })).toBeVisible();
       expect(errors).toEqual([]);
       // Records the browser build in the run report (criterion 2, C2d).
       testInfo.annotations.push({ type: 'browser', description: page.context().browser()!.version() });
       // The API boot writes .scriba/settings.yaml into the library the harness set (SCRIBA_E2E_LIBRARY).
       expect(existsSync(join(process.env.SCRIBA_E2E_LIBRARY!, '.scriba', 'settings.yaml'))).toBe(true);
     });

     // Owner: Setup & auth, M1 (SAU-08). Reads setup-url from SCRIBA_E2E_LIBRARY.
     await test.step('setup', () => pending(testInfo, 'setup'));

     // Owner: Project store, M1 (PST-09). Uses the examples folder the harness sets.
     await test.step('project from sample', () => pending(testInfo, 'project from sample'));

     // Owner: Agent loop, M1 (AGL-08). Configures a provider at SCRIBA_E2E_MOCK_URL through the API.
     await test.step('agent run', () => pending(testInfo, 'agent run'));

     // Owner: Project store review, M3 (PST-22; AGL-15).
     await test.step('accept change', () => pending(testInfo, 'accept change'));

     // Owner: Compile & export, M5 (CEX-20). No export step in the e2e.
     await test.step('manuscript', () => pending(testInfo, 'manuscript'));
   });
   ```
   Each owner comment has the form `// Owner: <module>, M<n> (<unit>)`, so criterion 3 can count them. The settings-file check makes the app-loads step prove that `SCRIBA_E2E_LIBRARY` reaches the worker and points at the library the API uses. The `browser` annotation records the Chromium version for C2d.
10. Tsconfig check. `e2e/tsconfig.json` (step 4) includes the new folders, so `npm run build -w @bbartolome/scriba-e2e` type-checks the config, the harness and the spec.
11. CI. Append two steps after `Build` in `.github/workflows/ci.yml`. Nothing else in the file changes:
    ```yaml
          - name: E2E
            env:
              SCRIBA_E2E_CHROMIUM: /usr/bin/chromium
            run: npm run e2e
          - name: Upload Playwright traces
            if: failure()
            uses: actions/upload-artifact@v7
            with:
              name: playwright-traces
              path: e2e/test-results/
              if-no-files-found: ignore
    ```
    The indentation follows the existing steps. The `actions/upload-artifact` version is the latest tag (`v7.0.2`, section 7), matching the repo's `v7` actions. The browser path is the image's Chromium, not Google Chrome (section 5, browser bullet).
12. Format and type check. `npx prettier --write` on `package.json`, `e2e/package.json`, `e2e/tsconfig.json`, `e2e/playwright.config.ts`, `e2e/harness`, `e2e/specs` and `.github/workflows/ci.yml`. Then `npx prettier --check .` exits 0, `npm run build -w @bbartolome/scriba-e2e` exits 0, and `npm run lint -w @bbartolome/scriba-e2e` exits 0.
13. Checks. Run S1, S2, the criterion checks C1 to C3 and C2d (section 4), including the mutations M1 to M3. Record each exit code and output.
14. Root gates (no file change). From the root: `npm run lint`, `npm test` and `npm run build`, each exit 0. The `npm test` output still shows the mock suite's twelve passing tests.
15. Commit on `unit/PLT-13`, with the message `feat(PLT-13): add the Playwright harness, the e2e journey with five pending steps and the CI e2e step`.
16. Fresh clone. `git clone -b unit/PLT-13 --no-hardlinks /Users/bbartolome/workspace/scriba-prototype <tmp>/fresh`. In the clone run `npm ci && npm run lint && npm test && npm run build && npm run e2e`, each exit 0. `find . -name package-lock.json -not -path '*/node_modules/*'` lists one file.
17. Record. Node and npm versions and each command's output, including the Chromium executable that Playwright used. No push, no PR.

## 4. Acceptance criteria and tests

The checks run in `/tmp/plt13-wt` after step 12. Each criterion's text is copied from the unit (lines 32 to 34). Node scripts are run with `--input-type=module`, and the file paths are relative to the repo root.

### criterion 1: `npm run e2e` boots the app against a temp library and the mock server, passes the app-loads check, and reports the five journey steps as pending

Command: `npm run e2e > /tmp/plt13-c1.log 2>&1; echo $?`. Expected: `0`.
- A1 (boot): `grep -E '^e2e: (library|API ready|mock OpenAI)' /tmp/plt13-c1.log` prints exactly three lines: `e2e: library <absolute path>`, `e2e: API ready at http://127.0.0.1:8080/healthz` and `e2e: mock OpenAI at http://127.0.0.1:<port>`. `grep '^pending: ' /tmp/plt13-c1.log` prints exactly five lines, in this order: `pending: setup`, `pending: project from sample`, `pending: agent run`, `pending: accept change` and `pending: manuscript`. The list reporter prints the test's console lines at column 0 (probe 5).
- A2 (temp library, then removed): `LIB=$(grep '^e2e: library ' /tmp/plt13-c1.log | cut -d' ' -f3-)`. Then `case "$LIB" in "$(node -p 'require("os").tmpdir()')"*) echo ok;; *) echo bad;; esac` prints `ok`, and `test ! -e "$LIB"` exits 0.
- A3 (app loads, five pending, from the JSON report): run the node script below. Expected output: `criterion 1 A3 ok`. It asserts that the one test passed (`status` `expected`), that its top-level steps are exactly `app loads` and then the five names in order, and that its `pending` annotations are exactly the five names in order.
  ```
  node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const report = JSON.parse(readFileSync('e2e/test-results/report.json', 'utf8'));
  const test = report.suites[0].specs[0].tests[0];
  const result = test.results[0];
  const steps = result.steps.map((s) => s.title);
  const pending = result.annotations.filter((a) => a.type === 'pending').map((a) => a.description);
  const names = ['setup', 'project from sample', 'agent run', 'accept change', 'manuscript'];
  if (test.status !== 'expected') throw new Error('test status ' + test.status);
  if (JSON.stringify(steps) !== JSON.stringify(['app loads', ...names])) throw new Error('steps ' + steps);
  if (JSON.stringify(pending) !== JSON.stringify(names)) throw new Error('pending ' + pending);
  console.log('criterion 1 A3 ok');
  "
  ```
- A4 (the library is the one the API uses, and the variable reaches the worker). The app-loads step of section 3, step 9, asserts that `join(process.env.SCRIBA_E2E_LIBRARY, '.scriba', 'settings.yaml')` exists. The passing run above is the check. Mutation M3 must make the run fail (section 4, mutations).

### criterion 2: CI runs the e2e and uploads Playwright traces on failure

**Cannot test locally (no remote).** The repository has no git remote, so there is no pull request and no GitHub Actions runner. The runner part of this criterion (the upload, and the browser on the runner) cannot be tested locally. C2a to C2d are local proxies for it. The unit's criterion 2 checkbox stays unticked after implementation, as PLT-11 left its criterion 5 (DECISIONS 2026-11-12, PLT-11 criterion 5, option (a); section 6, point 3).

- C2a (local proxy, static: the workflow file). Expected output: `criterion 2 static ok`.
  ```
  node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  import { parse } from 'yaml';
  const wf = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
  if (Object.keys(wf.jobs).length !== 1) throw new Error('not one job');
  const steps = Object.values(wf.jobs)[0].steps;
  const build = steps.findIndex((s) => s.run === 'npm run build');
  const e2e = steps.findIndex((s) => s.run === 'npm run e2e');
  const up = steps.findIndex((s) => String(s.uses ?? '').startsWith('actions/upload-artifact@'));
  if (!(build >= 0 && e2e > build && up > e2e)) throw new Error('order ' + [build, e2e, up]);
  if (steps[up].if !== 'failure()') throw new Error('upload is not on failure');
  if (steps[up].with.path !== 'e2e/test-results/') throw new Error('upload path');
  if (steps[e2e].env?.SCRIBA_E2E_CHROMIUM !== '/usr/bin/chromium') throw new Error('browser path');
  console.log('criterion 2 static ok');
  "
  ```
- C2b (local proxy: a passing run keeps no trace). `rm -rf e2e/test-results && CI=1 npm run e2e` exits 0. Then `find e2e/test-results -name trace.zip | wc -l` prints `0`.
- C2c (local proxy: a failing run keeps a trace). Apply mutation M1, then `CI=1 npm run e2e` exits non-zero, and `find e2e/test-results -name trace.zip | wc -l` prints `1`. Restore M1 (section 4, mutations).
- C2d (local proxy: the browser). Two runs.
  - (i) `CI=1 SCRIBA_E2E_CHROMIUM=$HOME/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome npm run e2e` exits 0. The `browser` annotation of the run (step 9) records the version, expected `156.0.8078.4` (probe 7). Then this check reads the JSON report:
    ```
    node --input-type=module -e "
    import { readFileSync } from 'node:fs';
    const result = JSON.parse(readFileSync('e2e/test-results/report.json', 'utf8')).suites[0].specs[0].tests[0].results[0];
    const version = result.annotations.find((a) => a.type === 'browser')?.description ?? '';
    if (!/^156\./.test(version)) throw new Error('browser ' + version);
    console.log('criterion 2 C2d browser ok', version);
    "
    ```
    Expected output: `criterion 2 C2d browser ok 156.0.8078.4`.
  - (ii) `SCRIBA_E2E_CHROMIUM=/nonexistent npm run e2e` exits non-zero, and the log contains `Failed to launch chromium because executable doesn't exist at /nonexistent` (probe 7 gives this message from `browserType.launch`).
  The 156 build is the same major version as the image's Chromium (section 7). The gap to Playwright's 158 is recorded in open point 2.
- Not proven here: the upload itself, and the browser on the runner, which only GitHub runs (section 6, open point 3).

### criterion 3: Each placeholder step is a clearly named, independently enable-able block with a comment naming its owning module and milestone

- C3a (source; the owner comments). `grep -c '// Owner: .*, M[0-9]' e2e/specs/journey.e2e.ts` prints `5`. `grep -n '// Owner:' e2e/specs/journey.e2e.ts` shows the five owners of section 1 in order: Setup & auth M1; Project store M1; Agent loop M1; Project store review M3; Compile & export M5.
- C3b (named blocks). The six step titles in the report of criterion 1, A3, are exactly `app loads`, then `setup`, `project from sample`, `agent run`, `accept change` and `manuscript`, in that order.
- C3c (type check). `npm run build -w @bbartolome/scriba-e2e` exits 0.
- C3d (independence). Apply mutation M2, which replaces only the `agent run` placeholder call with a live body. `npm run e2e` exits 0. The six step titles are unchanged and in order. The `pending` annotations are the other four names in order: `setup`, `project from sample`, `accept change`, `manuscript`. Restore M2 (section 4, mutations).

### Mutations (temporary edits)

Copy the file to `/tmp/plt13-mut/` first, edit it, run the check, copy the original back, then `cmp` the two files (no output means equal).
- M1 (heading): in `e2e/specs/journey.e2e.ts`, change the app-loads assertion's `'Scriba'` to `'Scriba-mutant'`. Expected: the run fails, as C2c requires.
- M2 (independence): in `e2e/specs/journey.e2e.ts`, replace only the line `await test.step('agent run', () => pending(testInfo, 'agent run'));` with `await test.step('agent run', async () => { expect((await page.request.get('/healthz')).ok()).toBe(true); });`. The step title stays `agent run`. Expected: exit 0, the six step titles unchanged, and four pending annotations, as C3d requires.
- M3 (library): in `e2e/harness/global-setup.ts`, pass `join(tmpdir(), 'scriba-e2e-elsewhere')` as the API's `SCRIBA_BOOKS_DIR`, while `SCRIBA_E2E_LIBRARY` keeps the library path. Expected: `npm run e2e` exits non-zero, the test status is not `expected`, and the failure is in the `app loads` step (the settings-file check). This is the A4 check of criterion 1. After the check, restore the file and `cmp` it, then remove the directory the API created: `rm -rf "$(node -p 'require("os").tmpdir()')/scriba-e2e-elsewhere"`. The teardown removes only the library.

### Scoping checks (not criteria; they prove the section 1 rule)

- S1 (Vitest does not see the specs). `npm test -w @bbartolome/scriba-e2e` exits 0 with `Tests  12 passed (12)`. `cd e2e && npx vitest list --filesOnly` lists exactly one file, `fixtures/mock-openai/test/mock-openai.test.ts`. Any other file in the list fails S1.
- S2 (Playwright does not see the mock tests). `cd e2e && npx playwright test --list` prints `Total: 1 test in 1 file`. The one listed line starts with `journey.e2e.ts:<line>:1 › journey: setup, ...`, which is the path relative to `testDir` (the probe printed `journey.e2e.ts:3:1 › probe`). No `mock-openai` line is listed.

## 5. Downstream agreement

Each unit below was read for its e2e, Playwright, harness or CI references (section 7 gives the lines). What each needs from PLT-13, and whether this plan provides it:

- **PLT-20** (`blocked_by` names PLT-13, line 7). Its body does not use the harness. It needs only the closed `phase:test-harness`. Provided on merge.
- **AGL-08** (lines 7, 18, 23). Needs the agent-run block to be replaceable (block 3); the mock URL (`SCRIBA_E2E_MOCK_URL`, step 8e), for the provider that its step configures through the API; a scenario file added beside the two shipped ones, which `startMockOpenAI()` loads from the platform folder (PLT-12 decision 15 keeps only the shipped files there, so AGL-08's file is added by AGL-08); and CI running `npm run e2e` (criterion 2). Provided. The harness never configures a provider (unit line 21).
- **MPR-08** (lines 7, 19). Needs the agent-run step to reach the mock through the API at `SCRIBA_E2E_MOCK_URL` plus `/scenario/<name>/v1`. Provided. Its `blocked_by` closes on this merge.
- **SAU-08** (line 17). Its setup step "reads `setup-url` from the temp library and opens it". Needs the library path, which is `SCRIBA_E2E_LIBRARY` (step 8c), and the app's base URL. The base URL is `http://127.0.0.1:8080` (`baseURL`, step 8). The harness does not set `SCRIBA_SETUP_URL_BASE`, so the API default applies: `http://127.0.0.1:${SCRIBA_PORT}` (`apps/api/src/modules/platform/boot/env.ts` lines 135 to 139), and `SCRIBA_PORT` defaults to 8080. The root `dev` script sets `SCRIBA_SETUP_URL_BASE=http://localhost:4200` for the dev stack, so the two stacks differ on purpose. Provided. The name of the setup-url file is SAU's, and this plan does not check it.
- **SAU-16** (lines 17, 25). Extends the same setup block at M2 (`/setup` leg). Provided: the block exists, and only its body changes.
- **PST-09** (lines 26, 31). Turns on block 2. Needs the samples folder, which is `SCRIBA_EXAMPLES_DIR` (step 8d), and the API on `baseURL`. Provided. The nonfiction sample arrives with PST-05 and PST-11 (M1). Until then block 2 stays pending.
- **PST-22** (lines 17, 25) and **AGL-15** (lines 17, 21). Turn on block 4, "accept change". Provided.
- **CEX-20** (lines 17, 21). Turns on block 5. Keeps the rule "No export step in the e2e" (unit line 24). Provided.
- **AGL-11** (line 18, optional: "Extend the e2e with a registry tool call if useful") and **AGL-19** (line 17: adds scenario files under `e2e/fixtures/mock-openai/`). Both need the spec and the scenario folder to stay open to additions. Provided: this plan changes neither.
- **PLT-03** (line 25). Its placeholder page carries the `Scriba` heading (`apps/web/src/app/app.html`). Provided: the app-loads check asserts it.
- **PLT-10** (line 18). Says the e2e step is appended by PLT-13. Provided by step 11. `scripts/ci-workflow.test.mjs` asserts one job and four named commands, each exactly once and in order. The two new steps do not change those assertions, and the root `npm test` at step 14 runs that file.
- **PLT-14, PLT-15, PLT-16** (`parallel_with` PLT-13, line 8 of each). None of the three units names `ci.yml`, `.gitignore` or the root `package.json` (section 7). No file conflict is expected.
- **PLT-19** (publish workflow, release track; `blocked_by` names PLT-18, not PLT-13; `parallel_with` wave-1 modules; `units/PLT-19-publish-workflow.md`). Its smoke list (line 33) says a tiny Markdown file converts to DOCX, EPUB and PDF "inside the image (stands in for export in the e2e)". So it needs the journey to have no export step, and nothing else from PLT-13. Provided: the manuscript block (block 5) has no export step, and the harness starts no export engine. PLT-19 changes `publish.yml` (its line 20), not `ci.yml`, so the two workflows do not collide.
- **PLT-20** (examples check; `blocked_by` names PLT-13, line 7). Its rule (lines 25 and 33) is that a unit test which reads `examples/` fails lint, and the check greps test files. The harness (`e2e/harness/global-setup.ts`) passes `<repo>/examples` to the API as `SCRIBA_EXAMPLES_DIR` (step 8d), and the journey spec names that folder only in a comment. So PLT-20's grep must exempt `e2e/harness/` and `e2e/specs/*.e2e.ts`, or scope itself to unit tests (`*.test.ts` under `apps/` and `packages/`). That choice is PLT-20's to write. What PLT-20 needs from PLT-13 is that the rule holds for the e2e. Provided: the harness reads nothing from `examples/` (it passes the path, and the API reads it). PLT-13 does not change PLT-20's rule.
- **Browser, local and CI (unit line 25).** The unit says "pre-installed Chromium". The local run uses the pre-installed Chromium in `~/.cache/ms-playwright`, found by Playwright's own lookup (section 6, point 1). The CI run uses the Chromium that the `ubuntu-latest` image installs at `/usr/bin/chromium` (step 11). The source is `actions/runner-images`, `images/ubuntu/scripts/build/install-google-chrome.sh` (read in this revision): line 77 is the snapshot URL (`chromium-browser-snapshots`, `Linux_x64`), lines 78 to 84 set the directory and unpack the snapshot into `/usr/local/share/chromium`, and lines 86 and 87 link `/usr/bin/chromium` and `/usr/bin/chromium-browser`. The same script installs Google Chrome at `/usr/bin/google-chrome` (line 41), which this plan does not use. The plan therefore uses Chromium, not Google Chrome. The image is Ubuntu 24.04 (`ubuntu-latest`, runner-images `README.md` line 25), its template runs this script (`build.ubuntu-24_04.pkr.hcl` line 123), and its readme lists Chromium 156.0.8078.0 (`Ubuntu2404-Readme.md` line 150). These facts are in section 7. The run-time image is not seen here (section 8; open point 2).

## 6. Open points

Post-approval text edits (Opus approved revision 3, DECISIONS 2026-11-12, commit 909eb29; text and check additions only, no criterion or decision changed). Each is applied where it is named.
- **P1.** Criterion 2 is marked "cannot test locally (no remote)". C2a to C2d are local proxies. Open points 2 and 3 say so, and the throwaway-branch option is dropped. The criterion 2 checkbox stays unticked (PLT-11 precedent).
- **P2.** C2d added: a run with the cached Chromium 156 build records a 156.x browser version (the `browser` annotation, step 9); a missing path fails at launch. C2a asserts `SCRIBA_E2E_CHROMIUM` on the E2E step.
- **P3.** The first section 8 assumption is split. The verified part (Ubuntu 24.04, the template, Chromium 156.0.8078.0) is in section 7. The run-time image stays ASSUMED.
- **P4.** Section 7 citations are corrected: the snapshot URL is line 77; line 89 tests Chrome and line 90 tests Chromium. The section 7 header names `909eb29`.
- **P5.** Step 8d: the API's stdio is `inherit` or `ignore`, never an unread `pipe`.
- **P6.** A1 also greps five `pending: <name>` lines in the criterion-1 log.

Revision 3 changes (Opus rejection 2, DECISIONS 2026-11-12, commit dd74821). Each is applied where it is named.
- **B1.** Browser: the CI step sets `SCRIBA_E2E_CHROMIUM=/usr/bin/chromium`, the Chromium that the runner image installs. The Google Chrome reason is withdrawn. Applied in section 1, section 5 (browser bullet), step 11, open point 2, section 7 and section 8.
- **T2.** After mutation M3, the `<tmpdir>/scriba-e2e-elsewhere` directory is removed (section 4, mutations).
- **T3.** S2 expects Playwright's path relative to `testDir`, `journey.e2e.ts:<line>:1 › …` (section 4).
- **T4.** Step 8a checks port 8080 on `0.0.0.0`, the API's own address, and closes the probe socket before the spawn.
- **T5.** Step 8g: a setup failure after any resource starts also closes the mock and removes the library, not only kills the API.
- **T6.** Section 5 adds PLT-19 (line 33: the smoke that stands in for export) and PLT-20 (lines 25 and 33: the examples grep must exempt the e2e harness and specs).

Revision 2 changes (Opus rejection 1, DECISIONS 2026-11-12, commit 57d9922). Each is applied where it is named.
- **B1.** Criterion 3, C3d: mutation M2 replaces only the `agent run` call with a live body. Expected: exit 0, the six step titles unchanged and in order, four pending annotations (section 4, mutations).
- **B2.** Criterion 1, A4: the app-loads step asserts the settings file in the temp library (section 3, step 9). Mutation M3 must make the run fail (section 4, mutations). A1 and A2 are unchanged.
- **B3.** Step 0 adds `git diff --quiet d810dd8 main -- ':!plans'` and stops on failure. The clean-status check excludes `plans/`, because this plan file is untracked.
- **T4.** Section 5, SAU-08: the base URL is `http://127.0.0.1:8080`. The review said the dev script leaves `SCRIBA_SETUP_URL_BASE` unset. That is not so: the root `dev` script sets it to `http://localhost:4200`. The harness leaves it unset, so the API default `http://127.0.0.1:${SCRIBA_PORT}` gives `http://127.0.0.1:8080`.
- **T5.** Section 5 (browser bullet) and open point 2: the local run uses `~/.cache/ms-playwright`; the CI run uses the path named in the workflow. The unit's wording is kept, and the difference is recorded. Superseded in revision 3 (B1).
- **T6.** Step 8e: the models probe is followed by `POST …/__mock/scenarios/tool-call/reset`.
- **T7.** Open point 4: the pending steps are an annotation plus a console line, because the list and JSON reporters do not show a skipped test step as skipped.
- **T8.** S1 fails if Vitest lists any file other than the mock test.
- **T9.** Step 5 and section 7: the base `npm ci` warns for `lmdb@3.5.6` and `msgpackr-extract@3.0.7`, and for three other packages with install scripts.

1. **Browser location.** The task text says `/opt/pw-browsers/chromium` is pre-installed. It does not exist here (section 7). The plan does not rely on that path. Playwright 1.65.0 needs Chromium revision 1254, and the matching builds are already in `~/.cache/ms-playwright` (`chromium-1254` and `chromium_headless_shell-1254`, both marked installed, aarch64 host). The harness passes no path, so Playwright's own lookup finds them, and it honours `PLAYWRIGHT_BROWSERS_PATH` when that is set. `SCRIBA_E2E_CHROMIUM` overrides the executable on any other machine. Chosen: the simplest option that uses the pre-installed browser. If an environment provides `/opt/pw-browsers` at another revision, set `SCRIBA_E2E_CHROMIUM` to its binary.
2. **CI browser.** The CI step sets `SCRIBA_E2E_CHROMIUM=/usr/bin/chromium`. Section 7 verifies the image side: `ubuntu-latest` is Ubuntu 24.04, its template runs the script that installs the browser, and its readme lists Chromium 156.0.8078.0. The path is Chromium, not Google Chrome. Playwright 1.65.0 is built for Chromium revision 1254 (browser version 158.0.8127.18, section 7), so there is a 156-versus-158 gap. Probe 7 (section 7) shows that Playwright 1.65.0 launches the 156.0.8078.4 build from the cache and reads its version, which is the passing probe for that gap. The image's exact build (156.0.8078.0) and the run-time image were not seen here. The repository has no remote, so the first CI run cannot happen yet (point 3). Until it does, the runner part of criterion 2 is not tested, and its checkbox stays unticked. If the path is missing at run time, the fix is another path, not a browser install, because the task forbids `playwright install`.
3. **Proof of the upload (cannot test locally: no remote).** The upload runs only on GitHub, and the repository has no git remote (`git remote` prints nothing), so there is no pull request and no runner. The runner part of criterion 2 cannot be tested locally. The local proxies C2a to C2d prove the workflow file, the trace retention and the browser. The throwaway-branch option is dropped, because it needs a remote. The unit's criterion 2 checkbox stays unticked after implementation, as PLT-11 left its criterion 5 (DECISIONS 2026-11-12, PLT-11 criterion 5, option (a)).
4. **"Pending".** Playwright has no pending status. The list and JSON reporters do not show a skipped test step as skipped (Opus review, DECISIONS 2026-11-12; not re-tested in this revision, section 8). Chosen: one `pending` annotation per placeholder, plus one console line. The JSON report carries the annotations, the list reporter shows the console lines, and the test passes. A skipped step is not used.
5. **Port 8080 is fixed.** `apps/api/src/main.ts` calls `listen(8080, '0.0.0.0')`, and `SCRIBA_PORT` does not change that. The harness fails fast if 8080 is busy. Changing the API's port is a PLT-04 matter, not this unit.
6. **Rebuild on every run.** Each run rebuilds the three workspaces. Chosen: no skip flag, which is the simplest option. The cost is run time, and CI builds twice (once in the build step, once in the e2e step).
7. **Where the scoping hazard is written.** The task text calls it PLT-12's open point 6. In the file it is the PLT-13 bullet in PLT-12 section 5 (line 209). Section 6, point 6 of PLT-12 is about matchers. The rule is decided in section 1 of this plan.
8. **Setup milestone.** The setup block is M1, not the M2 of the setup-flow phase, because SAU-08 turns it on first. SAU-16 extends the same block at M2.
9. **Root script name.** The root `e2e` script delegates to the workspace script named `e2e`. This is naming only.
10. **Trace setting.** Locally the trace is `off`, the default that the unit asks for. A command-line `--trace on` still overrides the config.
11. **Reporters.** The default HTML report is replaced by `list` and `json`, so no `playwright-report/` folder is made. The JSON file is needed by criterion 1, A3. Chosen: the simplest option. Publishing it as a CI artifact is not asked for, so it is not added.
12. **Harness variable names.** `SCRIBA_E2E_LIBRARY`, `SCRIBA_E2E_MOCK_URL` and `SCRIBA_E2E_CHROMIUM` are e2e-only. They are not API configuration, so they are not added to `SCRIBA_ENV_DEFAULTS` (PLT-02's contract).

## 7. Facts checked

Repository and state (main at `909eb29`; `git diff --stat d810dd8 909eb29` changes `plans/DECISIONS.md` only; `git remote` prints nothing, so the repository has no remote):
- `git status` shows only the untracked `plans/PLT-13.md`. The only worktree is the main checkout. `git ls-files e2e` lists eleven files: `fixtures/mock-openai/{cli.mjs, server.mjs, server.d.mts}`, the two shipped scenarios, `test/mock-openai.test.ts`, three `test/scenarios/*.json`, `e2e/package.json` and `e2e/tsconfig.json`. `e2e/playwright.config.ts` does not exist.
- `e2e/package.json` (`@bbartolome/scriba-e2e`, `private`, `type` module) has scripts `build` (`tsc --noEmit -p tsconfig.json`), `test` (`vitest run`), `lint` (`eslint .`), and devDependencies `@types/node` `^26.6.6` and `openai` `7.55.0`. `e2e/tsconfig.json` extends `../tsconfig.base.json`, sets `types` `["node"]` and includes `["fixtures"]`.
- Root `package.json`: `workspaces` is `packages/contracts`, `apps/api`, `apps/web`, `packages/packs`, `e2e`. `build` is contracts, then api, web, packs and e2e. `test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'`. `lint` is `npm run lint --workspaces && prettier --check .`. Scripts `dev` and `mock:openai` exist. There is no `e2e` script. Every root devDependency is an exact version (checked with `node -p`). `engines` is `>=26 <27`. The `dev` script sets `SCRIBA_SETUP_URL_BASE=http://localhost:4200`, `SCRIBA_DEV_ORIGINS=http://localhost:4200`, `SCRIBA_BOOKS_DIR='$PWD/.scriba-dev'`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR`.
- `.nvmrc` is `26`. `.gitignore` lists `node_modules/ dist/ .angular/ coverage/ .scriba-dev/ .claude/settings.local.json prompt.md`. `.prettierignore` lists `/units/ /modules/ /plans/ /package-lock.json`. `package-lock.json` and `.gitignore` are tracked.
- `.github/workflows/ci.yml` has one job, `ci`, with steps: `actions/checkout@v7`, `actions/setup-node@v7` (`node-version-file: .nvmrc`, cache npm), `Check PR title`, `Install` (`npm ci`), `Lint` (`npm run lint`), `Test` (`npm test`) and `Build` (`npm run build`). `scripts/ci-workflow.test.mjs` asserts one job and the four commands `npm ci`, `npm run lint`, `npm test` and `npm run build`, each exactly once and in order.
- Newest action tags (`gh release view`): `actions/upload-artifact` `v7.0.2`; `actions/checkout` `v7.0.1`.
- Main checkout `node_modules` is stale: `node_modules/@types` has no `node`, and there is no `openai`, `zod` or `ng`. `npm run build -w @bbartolome/scriba-contracts` there fails with `TS2307: Cannot find module 'zod'`. The partial `dist/` it wrote was removed. The checkout is clean again.

Clean install and builds (scratch copies of `git archive HEAD`, outside the repo, deleted after the checks):
- `npm ci` at `d810dd8` exits 0 (8 s in the first run). It prints an `install-scripts` notice for five packages with install scripts: `@parcel/watcher@2.6.0`, `@swc/core@1.16.22`, `esbuild@0.28.2`, `lmdb@3.5.6` and `msgpackr-extract@3.0.7`. The notice was printed again in a second scratch copy for this revision. All five predate PLT-13.
- `npm run build` for contracts, API and web each exits 0. `apps/web/dist/scriba-web/browser` holds `index.html`, `main-*.js`, `styles-*.css` and `favicon.ico`. `apps/api/dist/main.js` exists.
- API boot with only `SCRIBA_BOOKS_DIR` (a temp directory), `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR` set: `GET /healthz` returns `{"status":"ok","version":"0.0.0-dev"}`; `GET /` returns 200 `text/html` containing `<app-root>`; `GET /deep/link` returns 200; `GET /api/nope` returns 404. The boot creates `<books>/.scriba/settings.yaml`.
- Code paths: `apps/api/src/main.ts` calls `listen(8080, '0.0.0.0')`. `apps/api/src/bootstrap.ts` sets the static root to `apps/web/dist/scriba-web/browser`. `apps/api/src/app.module.ts` serves static files and excludes `/api`, `/healthz` and `/events`. `apps/api/src/modules/platform/boot/env.ts` lines 135 to 139 default `SCRIBA_SETUP_URL_BASE` to `http://127.0.0.1:${port}`, where `port` is `SCRIBA_PORT` (default 8080). `packages/contracts/src/platform/env.ts` holds the defaults.
- Root `dev` script: the API runs `node --watch apps/api/dist/main.js` with the dev values listed above. The web app runs `ng serve`, whose `apps/web/proxy.conf.json` forwards `/api`, `/healthz` and `/events` to `127.0.0.1:8080`. The harness uses none of that (section 1).
- Web placeholder: `apps/web/src/app/app.html` is `<mat-toolbar><h1>Scriba</h1></mat-toolbar>`. `apps/web/src/app/app.spec.ts` checks the heading.

Playwright and browsers:
- `npm view @playwright/test version` prints `1.65.0`, with dist-tag `latest` `1.65.0`. `npm view playwright-core engines` for 1.65.0 prints `>=20`.
- `playwright-core@1.65.0` `browsers.json` (from `npm pack` into an empty directory): `chromium` revision `1254`, browser version `158.0.8127.18`. `chromium-headless-shell` has the same revision.
- `/opt/pw-browsers` does not exist. `PLAYWRIGHT_BROWSERS_PATH` is unset. `HOME` is `/Users/bbartolome`. `uname -m` prints `aarch64`.
- `~/.cache/ms-playwright` holds `chromium-1254/chrome-linux-arm64/chrome` (executable) and `chromium_headless_shell-1254/chrome-headless-shell-linux-arm64/`. Both revision folders have `INSTALLATION_COMPLETE`. Other revisions (1194, 1248) are also present. `/usr/bin/chromium-browser` is a shell wrapper that needs the snap at `/snap/bin/chromium`, which does not exist, so it is not used. `/usr/bin/google-chrome` does not exist here.
- Runner image (read with `gh api` in this revision): `actions/runner-images`, `images/ubuntu/scripts/build/install-google-chrome.sh` on main. Line 41 sets `CHROME_BIN` to `/usr/bin/google-chrome` after installing Google Chrome from its deb. Line 77 is the snapshot URL (`chromium-browser-snapshots`, `Linux_x64`). Lines 78 to 84 set `/usr/local/share/chromium` and unpack the snapshot there. Lines 86 and 87 link `/usr/bin/chromium` and `/usr/bin/chromium-browser` to `chrome-linux/chrome`. Line 89 tests `Chrome` and line 90 tests `Chromium`. Verified in this revision with `gh api`: `README.md` line 25 maps `ubuntu-latest` to Ubuntu 24.04; `images/ubuntu/templates/build.ubuntu-24_04.pkr.hcl` line 123 runs `install-google-chrome.sh`; `images/ubuntu/Ubuntu2404-Readme.md` lists Google Chrome 156.0.8078.79 (line 148) and Chromium 156.0.8078.0 (line 150). Not verified: the build that a run actually receives.
- Probe 1: `playwright-core@1.65.0` (`index.mjs` in the extracted package), launched with no options on Node `v26.13.0`: `chromium.executablePath()` returned `~/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome`, and the page read back `Scriba`.
- Probe 2: `@playwright/test@1.65.0` installed in a scratch copy by a plain `npm install` after `npm ci`. The install changed 0 existing lock entries (`version`, `resolved`, `integrity`), removed 0, and added exactly `node_modules/@playwright/test`, `node_modules/playwright` and `node_modules/playwright-core`. `npm ls` still shows `openai` 7.55.0 and `@types/node` 26.6.6, one copy each. Root `workspaces` is unchanged.
- Probe 3 (Playwright on Node 26.13.0): with a config of `testDir: './specs'` and `testMatch: '**/*.e2e.ts'`, `npx playwright test -c <config> --list` prints `Total: 1 test in 1 file` for `journey.e2e.ts`. With no config, `npx playwright test --list` fails: it loads `fixtures/mock-openai/test/mock-openai.test.ts`, whose Vitest `beforeAll` is rejected, and it reports `Total: 0 tests`.
- Probe 4 (Vitest 5.1.0 in the same copy): `npx vitest list --filesOnly` lists `specs/probe-plain.spec.ts` (a `.spec.ts` file) and `fixtures/mock-openai/test/mock-openai.test.ts`. It does not list `specs/journey.e2e.ts`. `npx vitest run` shows the mock file's 12 tests passing, and the `.spec.ts` file fails (`1 failed | 1 passed (2)`).
- Probe 5 (a Playwright run of one test with `page.setContent` and a `test.step`, the default headless browser, no env): passed. The worker saw a `process.env` value that `globalSetup` had set, the teardown returned by `globalSetup` ran, the top-level `result.steps` titles were `app loads` and `setup`, `test.annotations` and `result.annotations` both carried `{type, description}`, and `test.status` was `expected`. The default output folder `e2e/test-results` was created next to the config.
- Probe 6: `.gitignore` decides Prettier's ignore. `npx prettier --file-info e2e/test-results/x.json` reported `"ignored": false` before the `.gitignore` line and `"ignored": true` after it.
- Probe 7 (Playwright 1.65.0 from `npm pack`, Node `v26.13.0`, the cached `chromium-1248` build): `chromium-1248/chrome-linux-arm64/chrome --version` prints `Google Chrome for Testing 156.0.8078.4`. Launched with `executablePath` set to that binary, the browser reported `browser.version()` `156.0.8078.4`, the page read back `Scriba`, and the process exited 0. With `executablePath` `/nonexistent`, the launch failed with `browserType.launch: Failed to launch chromium because executable doesn't exist at /nonexistent`. With no path, the default lookup launched the cached `chromium-1254` build, version `158.0.8127.18`.

Units and plans (line numbers as in the files):
- PLT-13 unit: front matter lines 2 to 9. Title line 12. Closes `phase:test-harness`, line 14. Decisions lines 20 to 26. Scope line 29. Criteria lines 32 to 34.
- PLT-12 plan: section 1 decisions 1, 2, 15, 17, 20 and 21; section 2 file list; section 5, PLT-13 bullet, line 209 (the scoping hazard). Its section 6 point 6 is about matchers.
- PLT-01 plan section 5, line 114 (PLT-13 root script; `@playwright/test` goes to the root only if `e2e/` is a plain folder).
- Downstream lines checked: AGL-08 lines 7, 18, 23; MPR-08 lines 7, 19; PLT-20 line 7 (its body has no e2e or harness text); SAU-08 line 17; SAU-16 lines 17, 25; PST-09 lines 26, 31; PST-22 lines 17, 25; AGL-15 lines 3, 17, 21; CEX-20 lines 3, 7, 17, 21; AGL-11 line 18; AGL-19 line 17; PLT-03 line 25; PLT-10 line 18; PLT-14, PLT-15 and PLT-16 line 8 (`parallel_with`). None of PLT-14, PLT-15 or PLT-16 mentions `ci.yml`, `.gitignore` or the root `package.json`.
- Milestones of the step owners: SAU-08 M1 (`phase:token-guard`), PST-09 M1 (`phase:files`), AGL-08 M1, PST-22 M3 and AGL-15 M3 (`phase:pending-review` and `phase:pending-writes`), CEX-20 M5.
- `units/README.md` line 74 (the `phase:test-harness` row) and line 133 (testing convention). `modules/platform.md` lines 57 and 58. `plans/PLT-11.md` line 241 (PLT-13 must not use `npm run dev`).
- DECISIONS entries: "2026-11-10 — PLT-01 — Prettier scope"; "2026-11-11 — batch [PLT-02, PLT-03, PLT-09, PLT-10] — root test script: one quoted glob"; "2026-11-11 — PLT-02 — lockfile gate at the batch collection"; "2026-11-12 — PLT-13 — Opus plan review of revision 1" (commit 57d9922).
- `e2e/fixtures/mock-openai/server.mjs` exports `startMockOpenAI`, and `server.d.mts` declares it. The reset route returns 204 (PLT-12 decision 4).
- Node `v26.13.0` and npm `11.20.0` are on the PATH.

## 8. Assumed

- ASSUMED: the image a CI run receives is the one its readme describes (Ubuntu 24.04, Chromium 156.0.8078.0, `/usr/bin/chromium`, section 7), and Playwright 1.65.0 drives that build through `executablePath`. The 156 match was probed on this host (probe 7, section 7), not on a runner. The first CI run settles it, and that run needs a remote (section 6, point 3).
- ASSUMED: `actions/upload-artifact@v7` uploads the `e2e/test-results/` folder when the step runs on failure. Not runnable here (section 6, point 3).
- ASSUMED: Playwright's `retain-on-failure` removes traces of passing tests, so a passing run leaves no `trace.zip`. Checked by C2b.
- ASSUMED: the harness's `execFileSync('npm', ['run', 'build', '-w', ...])` works inside Playwright's `globalSetup`. Not run yet. Checked by C1.
- ASSUMED: a Playwright `globalSetup` that throws does not run its teardown, so step 8g cleans up the API, the mock and the library itself. Not tested.
- ASSUMED: a listen probe on `0.0.0.0:8080` fails with `EADDRINUSE` when another server holds 8080 on loopback. Not tested (step 8a).
- ASSUMED: environment variables set in `globalSetup` (`SCRIBA_E2E_LIBRARY`, `SCRIBA_E2E_MOCK_URL`) reach the workers. The probe showed this for one variable. Checked again by C1 (A4).
- ASSUMED: the `getByRole('heading', { name: 'Scriba' })` locator matches the Angular placeholder page as built. The probe used `page.setContent`, not the real app. Checked by C1.
- ASSUMED: the two added CI steps leave `scripts/ci-workflow.test.mjs` passing. Read, not run. Checked by step 14.
- ASSUMED: the implementation worktree shares the same `HOME`, so the revision-1254 browser is found without `SCRIBA_E2E_CHROMIUM`. Checked by C1.
- ASSUMED: a plain `npm install` on the implementation machine adds the same three lock entries as the scratch probe, because the registry and versions are the same. The lock gate (step 6) checks it.
- ASSUMED: the list and JSON reporters do not show a skipped test step as skipped (Opus review of revision 1; not re-tested here). Open point 4 relies on it.
- Not verified: no implementation has run, no real-app Playwright run has happened, and no CI run has happened.
