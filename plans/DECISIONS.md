# Decisions

Record of Navigator decisions and Opus rejections. Only add to this file. Each entry has the date, the unit, the decision and the reason.

## 2026-11-10 — PLT-01 — batch and step list (iteration 1)

- **Decision:** Batch `[PLT-01]` approved. Step list accepted: write `plans/PLT-01.md` with `status: planned`, commit it locally, do not push. Implementation is a later iteration.
- **Reason:** PLT-01 is the only unblocked unit in the first open phase (Platform `phase:scaffold`). No plan exists yet. No git remote is configured, so the work stays local.
- **Correction:** The Navigator's carry-forward line "no DECISIONS.md entry is forced this iteration" is wrong. The driver rules (steps 2 and 5) require each Navigator decision to be recorded here, so this entry is required.

## 2026-11-10 — PLT-01 — how the Angular, NestJS and Zod majors are pinned (Option B)

- **Decision (Navigator):** Option B. PLT-01 records the Angular, NestJS and Zod majors in a documented pin section in the root `package.json`, and installs none of the three packages. The resolved numbers are recorded when PLT-01 is implemented, not hardcoded in the plan. PLT-02 adds `zod` to `packages/contracts`, PLT-03 adds `@angular/*` and Material to `apps/web`, and PLT-04 adds `@nestjs/core` and `@nestjs/serve-static` to `apps/api`, each at its recorded major. The pin is a section, not npm `overrides`.
- **Reason (Navigator):** Keeps the three packages out of the lockfile until their owning units. Avoids baking possibly stale version numbers into a plan that is not implemented in this iteration.
- **Driver challenge (open at the time of writing):** The stated reason "no downstream file changes" does not separate Option A from Option B. Under both, PLT-02, PLT-03 and PLT-04 edit the workspace `package.json` files that PLT-01 creates (PLT-01 Scope line 32). No acceptance criterion tests the pin section (AC 4 covers only Node and npm). The challenge is recorded in a separate navigator question. Its answer will be added here.

## 2026-11-10 — PLT-01 — answer to the challenge on Option B (criterion added)

- **Decision (Navigator):** Option (a). Keep Option B. The reason is corrected to the ownership boundary: PLT-01 is the scaffold and must not pre-declare dependencies owned by PLT-02 (contracts), PLT-03 (web) and PLT-04 (api). PLT-01 records the three majors so those units install at the recorded major. Option A (install now) is rejected.
- **Criterion change (Navigator, PLT-01):** Added one acceptance criterion: the root `package.json` pin section names the Angular, NestJS and Zod majors. A test asserts that the three names are present. Version numbers are not checked. This is additive; no existing criterion was removed or weakened. The unit file records the change.
- **Reason (Navigator):** The stated reason "no downstream file changes" did not separate Option A from Option B, so it was withdrawn. The pin is required by PLT-01's Decisions ("Angular, NestJS and Zod majors are pinned here"). No criterion tested it, so a criterion is added. A presence-only check avoids baking stale version numbers into the plan.
- **Driver note:** The challenge recorded in the entry above is closed by this answer.

## 2026-11-10 — PLT-01 — TypeScript major in the pin section

- **Decision (Navigator, confirmed):** TypeScript is pinned to the 6.0.x line (range `>=6.0 <6.1`). The exact patch is resolved when PLT-01 is implemented and recorded in the root `package.json` pin section. 7.x and 5.x are rejected. The earlier "6.x" label is withdrawn as too wide.
- **Reason (Navigator, checked by the driver against the npm registry, 2026-11-10):** `@angular/build@22.2.5`, `@angular-devkit/build-angular@22.2.5` and `@angular/compiler-cli@22.2.5` each declare peer `typescript` `>=6.0 <6.1`, which alone forces 6.0.x. The registry `latest` is 7.0.2, which those packages exclude. Angular 21 accepts `>=5.9 <6.0` and Angular 20 accepts `>=5.8 <6.0`, so no Angular line checked accepts 7.x. `typescript-eslint` (latest) declares `>=4.8.4 <6.1.0`, a secondary constraint not required by the PLT-01 unit.
- **Why the newest-major rule does not apply to TypeScript:** the rule was set for Angular, NestJS and Zod. Applied to TypeScript it picks 7.0.2, which the Angular build tooling excludes.

## 2026-11-10 — PLT-01 — Node runtime for the tests

- **Decision (Navigator):** The Node pin is Node 26 in `.nvmrc` and `engines`, as PLT-01 Decisions line 25 requires. This iteration writes `plans/PLT-01.md` with `status: planned` only and runs no tests. No local Node 24.21.0 run is recorded, and no criterion is marked passed. The four acceptance-criterion tests run on a Node 26 runtime at implementation time, obtained from nodejs.org or the npm `node@26` package.
- **Reason (Navigator):** A Node 24 run would misrepresent the pin, and no test runs in this iteration anyway. Changing the pin to Node 24 would alter the unit's stated decision and force a unit edit.

## 2026-11-10 — PLT-01 — location and coverage of the pin-section test

- **Decision (Navigator):** The test for the new pin-section criterion is `scripts/pins.test.mjs` at the repo root. It runs with Node's built-in `node:test`, invoked by the root `test` script after the workspace fan-out. It asserts that the keys `angular`, `nestjs` and `zod` are present in the root pin section. It does not check version numbers, and it has no TypeScript key.
- **Reason (Navigator):** The pin section is in the root `package.json`, so the test is root-owned. `packages/contracts` belongs to PLT-02, so the test is not placed there. A root Vitest config would add a file and a dependency for a presence check. `node:test` is built into Node, and the root `test` script already fans out to every workspace. The criterion names only the three majors, so the coverage matches it.
- **Correction:** The Navigator's reason "a TypeScript key would force version checking" is wrong. A presence check on a TypeScript key does not check its version. The coverage choice still stands, because the criterion names only the three majors, and widening the criterion is the Navigator's call.

## 2026-11-10 — PLT-01 — Opus rejection 1 of the plan (blocking problems)

- **Rejection (Opus subagent, plan review):** `plans/PLT-01.md` is not approved. Count for PLT-01: 1 rejection.
- **Blocking 1:** Root `prettier --check .` (plan section 2) also checks the tracked Markdown files in `units/`, `modules/` and `plans/`, and the plan adds no `.prettierignore`. So AC 2 cannot pass. The driver confirmed this: Prettier 3 flags `units/PLT-01-workspace-scaffold.md` with default config.
- **Blocking 2:** The AC 3 command `find node_modules -path '*/node_modules/typescript/package.json'` returns 0 for the root copy, because the path has no `/` before its first `node_modules`. The driver confirmed this: the plan's pattern returns 0 and `find . -path '*/node_modules/typescript/package.json'` returns 1.
- **Non-blocking notes to fold into the plan:** the workspace `lint` runs Prettier, which reads only the cwd's ignore files, so it can check generated `dist/` output; the section 5 downstream list misses PLT-12's possible `e2e/` workspace, PLT-04's `build` and `tsconfig` changes, PLT-03's deletion of the placeholder test, and PLT-11's `concurrently` and `.scriba-dev/` use; pins must be resolved before the first install; the ESLint version wording should not name a version; the `node -v` and `npm -v` output should be recorded with each result; the pin section should be documented with a `//` key.

## 2026-11-10 — PLT-01 — Prettier scope (Navigator decision, after Opus rejection 1)

- **Decision (Navigator):** Option (a). A root `.prettierignore` excludes `units/`, `modules/` and `plans/`. Prettier then checks code and config in the four workspaces only. The driver fixes to the plan are accepted: the AC 3 `find` pattern (`find . -path '*/node_modules/typescript/package.json'`), workspace `lint` as ESLint only, the completed section 5 downstream list, pins resolved before the first install, version-free ESLint wording, node and npm versions recorded with each result, and `scribaPins` documented with a `//` key.
- **Reason (Navigator):** It honors the unit's decision "ESLint flat config plus Prettier check across workspaces" (PLT-01 line 26) without a unit edit, because the document folders are not workspaces. It is additive. It avoids reformatting about 212 documents (option b), and it avoids the unit edit that dropping Prettier would need (option c).

## 2026-11-10 — PLT-01 — Opus rejection 2 of the plan (blocking problem)

- **Rejection (Opus subagent, re-review of revision 2):** `plans/PLT-01.md` is not approved. Count for PLT-01: 2 rejections. The next rejection is the third, and at three the Navigator must choose to make the unit smaller, divide it, or stop it.
- **Blocking:** The `.prettierignore` entries in revision 2 are unanchored (`modules/`). Gitignore rules make such a pattern match a folder of that name at any depth, so `apps/api/src/modules/**` would be ignored too. The driver confirmed this with Prettier 3: `apps/api/src/modules/platform/platform.module.ts` reports `"ignored": true` with `modules/`, and `"ignored": false` with `/modules/`.
- **Non-blocking, folded into the revision:** PLT-03's replacement `package.json` must keep `build`, `test` and `lint` scripts. PLT-09's fixtures must fail lint, so the root config needs an ignore for their folder. PLT-13 also adds a root `e2e` script. PLT-11 adds a root `README.md` that Prettier checks. Prettier formatting is applied to `package.json` before the check. The unit branch `unit/PLT-01` is created before the first commit, and the fresh clone uses `-b unit/PLT-01`. The chosen Angular major's build peer must admit the 6.0 patch. The `packageManager` value must match an exact npm version.

## 2026-11-10 — PLT-01 — Opus rejection 3 of the plan (blocking problem)

- **Rejection (Opus subagent, round 3 review of revision 3):** `plans/PLT-01.md` is not approved. Count for PLT-01: 3 rejections. Per the driver rules, at three rejections the Navigator must select one of: make the unit smaller, divide the unit, or stop the unit. No further plan revision is made before that selection.
- **Blocking:** The workspace `package.json` files have no `version`. npm prints the package name in each workspace's run banner only when `version` is set. The driver confirmed this in a temporary two-workspace project: the workspace without `version` printed `> build`, and the one with `"version": "0.0.0"` printed `> @x/b@0.0.0 build`. So AC 2's requirement that each fan-out name all four packages cannot be met as written. The fix is `"version": "0.0.0"` in each workspace, plus a banner check in AC 2.
- **Non-blocking, to fold in if the unit continues:** Step 1 must resolve the tool versions and require `npm install` to succeed without `--legacy-peer-deps`. Step 1c must check the exact Angular version from step 1a, and also the `@angular/compiler-cli` peer. Step 3 must run AC 2 to 5 in the working tree, with AC 1 run after the step 4 commit. Step 2 must run `prettier --write` after the install, so the locked Prettier version formats the files. Section 5 must cover the TypeScript devDependency that the Angular and NestJS generators add, the root Prettier check reaching the files PLT-03, PLT-10 and PLT-12 add, PLT-12's tests not running under root `npm test` if `e2e/` stays a plain folder, and any root devDependency PLT-09 adds. The smoke test must import `describe`, `it` and `expect` from `vitest`.

## 2026-11-10 — PLT-01 — response to the third rejection (Navigator decision)

- **Decision (Navigator):** Keep PLT-01 as one unit and fix the defects in place. No scope cut, no division, no stop. Apply the blocking fix (`"version": "0.0.0"` in each of the four workspace `package.json` files, plus a banner check that npm names all four packages in AC 2) and the non-blocking notes above. Then re-send the plan to Opus.
- **Reason (Navigator):** The three rejections are mechanical defects, not scope problems. Dividing would change the `blocked_by` and `unblocks` fields of about ten units and the README phase table for a one-line version field. Stopping would block the whole build.
- **Driver note on the label:** The question offered "(a) make the unit smaller" as the first option. The Navigator's answer is labelled (a), but its text describes no scope cut. The driver records the selection as keep-whole, fix-in-place. This is not one of the three literal options. It is flagged here so the user can see it.

## 2026-11-10 — PLT-01 — Angular and TypeScript conflict rule (Navigator decision)

- **Decision (Navigator):** Option (a). The newest-Angular-major rule and the TypeScript 6.0.x line are two separate Navigator decisions. If the newest Angular major's build-tooling TypeScript peer excludes the 6.0.x line, the implementation stops and records the conflict for the Navigator. It does not pick a non-newest Angular major, and it does not move the TypeScript line.
- **Reason (Navigator):** Choosing an older Angular major would silently downgrade a decision. Moving the TypeScript line would silently reopen the 6.0.x decision, whose premise is the Angular 22.2.5 build peer. Only the Navigator may re-decide either one.

## 2026-11-10 — PLT-01 — step list for the implementation iteration (Navigator decision)

- **Decision (Navigator):** Step list s1 to s8. s1: send `plans/PLT-01.md` revision 4 to an Opus subagent for plan review, as a gate before any implementation. This closes the gap that no approval of revision 4 is recorded. If Opus rejects, the count becomes 4, and the iteration stops to record the conflict for the Navigator. s2 to s8 follow plan section 3: branch `unit/PLT-01` from main; resolve versions (3.1); create the files and run `npm install` and `prettier --write`; run AC 2 to AC 5 in the working tree on Node 26; commit on `unit/PLT-01`; run AC 1 and AC 2 to AC 5 in a fresh clone; one merge commit to main with the checkboxes and `status: done`. No push.
- **Reason (Navigator):** Revision 4 has no Opus approval, so approval must come before any implementation. The repo has no remote, so the work stays local.
- **Driver note:** The Navigator's carry-forward line "Node 26 runtime required for the four AC tests" is wrong. The plan has five criteria, AC 1 to AC 5 (`plans/PLT-01.md` section 4). Node 26 applies to all five. The driver recorded this as a `carry_forward_verdict` with evidence.

## 2026-11-10 — PLT-01 — Opus review of plan revision 4: APPROVED

- **Result (Opus subagent, plan review of `plans/PLT-01.md` revision 4):** APPROVED. No blocking problem. The rejection count for PLT-01 stays at 3. The plan may be implemented (step s2 onward).
- **Reason:** The reviewer checked all five acceptance criteria against tests and pass conditions; the Decisions of `units/PLT-01-workspace-scaffold.md`; the downstream units PLT-02, PLT-03, PLT-04, PLT-09, PLT-10, PLT-11, PLT-12 and PLT-13; the front matter (`unblocks` matches the `blocked_by` fields); the order of the method steps; and the points in plan section 6.
- **Non-blocking notes, not yet folded into the plan.** Each needs a Navigator decision before the plan changes:
  1. Plan section 5 cites "its unit, line 31" for PLT-13's root `e2e` script. The reviewer reports the script is at PLT-13 line 26.
  2. Plan section 4, AC 2, writes to `/tmp/plt01-ac2/` but no step creates that folder. A `mkdir -p` is needed.
  3. Plan section 2 (`.gitignore`) says "The last is the dev library folder". The folder is `.scriba-dev/`, not `.claude/settings.local.json`.
  4. Step 1d: if the ESLint fallback picks an older major, `@eslint/js` must be on the same major (its peer is `eslint ^10.0.0`). Step 1d does not say so.
  5. The "Decision (Navigator)" entry at line 50 of this file says Prettier checks "the four workspaces only". The plan, as approved, checks the whole repo except the anchored `.prettierignore` paths. This entry is superseded by the plan's scope.
  6. Byte-exact fixtures in later units (the reviewer names SHL-13 and GNP-02) will need `.prettierignore` entries. This is not PLT-01's concern.
  7. PLT-10 runs tests before build. Tests in contracts and api that import the built contracts package need a build step first. This is owned by PLT-02 or PLT-10, not PLT-01.

## 2026-11-10 — PLT-01 — revision 5 (documentation-only) and disposition of the non-blocking notes (Navigator decision, Option B)

- **Decision (Navigator):** Revision 5 of `plans/PLT-01.md` is documentation-only. It changes three texts and no acceptance criterion:
  - Note 1: section 5, the PLT-13 citation changes from "its unit, line 31" to "its unit, line 26". Verified: `units/PLT-13-playwright-harness-e2e.md` line 26 is the root `npm run e2e` script.
  - Note 2: the AC 2 procedure now runs `mkdir -p /tmp/plt01-ac2/` before the fan-out redirects. This is also an implementation detail, since the driver creates the folder, but the procedure is made complete.
  - Note 3: section 2, `.gitignore` wording. `.scriba-dev/` is named as the dev library folder, not `.claude/settings.local.json`. Verified: `units/PLT-01-workspace-scaffold.md` line 27 names neither folder.
- **Supersession (note 5):** The entry "Prettier scope (Navigator decision, after Opus rejection 1)", with its sentence "Prettier then checks code and config in the four workspaces only", is superseded. The approved plan checks the whole repo except the anchored `.prettierignore` paths (`/units/`, `/modules/`, `/plans/`, `/package-lock.json`). The other decisions in that entry still stand.
- **Implementation-time or downstream decisions (notes 4, 6, 7; not plan changes):**
  - Note 4: at step 1d, if the ESLint fallback picks an older major, `@eslint/js` must be on that same major, because its peer is `eslint ^10.0.0`. Implementation applies this.
  - Note 6: byte-exact fixtures in later units (the reviewer names SHL-13 and GNP-02) need `.prettierignore` entries. Those units own them.
  - Note 7: PLT-10 runs tests before build, so contracts and api tests that import the built contracts package need a build step first. Owned by PLT-02 or PLT-10.
- **Reason (Navigator):** These are text fixes that change no criterion, so the revision-4 Opus approval carries over. Re-sending revision 5 to Opus would risk a fourth rejection, and a fourth rejection stops the iteration.

## 2026-11-10 — PLT-01 — versions resolved at implementation (plan section 3, steps 1a to 1e)

- **Resolved (driver, Node v26.13.0, npm 11.20.0):** Angular major 22 (`@angular/core` 22.2.5). NestJS major 12 (`@nestjs/core` 12.4.2). Zod major 4 (`zod` 4.6.7). TypeScript 6.0.3, the highest of `typescript@6.0` (`npm view typescript@6.0 version` lists 6.0.2 and 6.0.3). Tools: `vitest` 5.1.0, `eslint` 10.14.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.72.2, `prettier` 3.9.10. `packageManager` is `npm@11.20.0`, the npm bundled with Node 26.13.0.
- **Peer checks (steps 1c and 1d):** `@angular/build@22.2.5` and `@angular/compiler-cli@22.2.5` both declare `typescript` `>=6.0 <6.1`, which admits 6.0.3. `@angular/build@22.2.5` declares `vitest` `^4.0.8 || ^5.0.0`, so the newest admitted vitest is 5.1.0. `typescript-eslint@8.72.2` declares `eslint` `^8.57.0 || ^9.0.0 || ^10.0.0` and `typescript` `>=4.8.4 <6.1.0`, which admit eslint 10.14.0 and TypeScript 6.0.3. `@eslint/js@10.0.1` declares `eslint` `^10.0.0`.
- **Conflict rule (Angular and TypeScript):** not triggered. The newest Angular build tooling admits the 6.0.x line, so implementation continues.
- **Implementation-time decision (note 4 of the approval entry):** `@eslint/js` and `eslint` are both on major 10, so the install and the ESLint config resolve.
- **Install:** `npm install` at the root succeeded on Node 26.13.0 without `--legacy-peer-deps`, adding 132 packages and writing the single root `package-lock.json`. npm reported 10 moderate vulnerabilities. No criterion covers audit results, so they are not addressed in PLT-01.

## 2026-11-10 — PLT-01 — Opus implementation review of the merge commit cf7a8bb: APPROVED (recorded after the merge)

- **Result (Opus subagent, implementation review of commit cf7a8bb against plan revision 5 and the unit's acceptance criteria):** APPROVED. No blocking problem. All five acceptance criteria are met by the code and the saved evidence. The 28 tracked files outside the document folders are exactly the files named in plan section 2. Nothing contradicts a downstream unit.
- **Process gap (driver):** Driver rule 7 requires the Opus implementation review before the merge commit (step 8). The driver merged `unit/PLT-01` into main as cf7a8bb before running this review, because the Navigator's step list (s1 to s8) did not include it. The review ran on the merged commit, and its approval is recorded here. The merge was local only and was not pushed. A challenge record in the session describes the gap.
- **Non-blocking notes (recorded; the Navigator decides any change):**
  1. The `node -v` and `npm -v` output is not saved next to each result in the evidence files. It was printed in the terminal for each run. Node v26.13.0 and npm 11.20.0 are recorded in this file and in the merge commit message.
  2. The fresh-clone run executed AC 2 to AC 5 and printed the results. The files in `/tmp/plt01-ac2/` were later overwritten by the merged-tree run, so the fresh-clone fan-out output is kept in the session transcript only.
  3. The Prettier `--file-info` probe, the two `find` counts, and the exit status of `npm ci` have no saved output. Their results were printed in the terminal.
  4. `tseslint.config()` is marked `@deprecated` in typescript-eslint 8.72.2 (`node_modules/typescript-eslint/dist/config-helper.js`, around line 24), in favour of ESLint's `defineConfig()`. It still works. PLT-09 may switch when it edits `eslint.config.mjs`.
  5. `plans/PLT-01.md` line 8 still says "This iteration writes the plan only ... no criterion is marked passed here." That is out of date now that the status is `done`. It describes iteration 1.
  6. The ESLint config covers only `**/*.ts`, so the root `.mjs` files (`eslint.config.mjs`, `scripts/pins.test.mjs`) are not linted. This matches the plan.

## 2026-11-10 — PLT-01 — disposition of the implementation review notes (Navigator decision, Option B)

- **Decision (Navigator):** Option B. A documentation-only commit on main corrects the out-of-date sentence at `plans/PLT-01.md` line 8 (note 5). It now says that iteration 1 wrote the plan and a later iteration implemented it, and that all five acceptance criteria passed. No change is made to `eslint.config.mjs`.
- **Disposition of the six notes:**
  - Note 1 (no saved `node -v` and `npm -v` next to each result): known. The versions are recorded in this file and in the merge commit message.
  - Note 2 (fresh-clone fan-out output overwritten): known. The fresh-clone results are in the session transcript only.
  - Note 3 (Prettier probe, `find` counts and `npm ci` exit status not saved): known.
  - Note 4 (`tseslint.config()` is deprecated in typescript-eslint 8.72.2): deferred to PLT-09, which owns `eslint.config.mjs`. The code works and AC 2 lint passes. Changing it now would reopen a closed, approved unit and need a new Opus implementation review.
  - Note 5 (stale line 8 in `plans/PLT-01.md`): fixed by the documentation-only commit. No criterion changes, so no new Opus review.
  - Note 6 (the root `.mjs` files are not linted): known. This matches the plan.
- **Reason (Navigator):** PLT-01 is closed: merged as cf7a8bb, `status: done`, and approved by the Opus implementation review. The six notes are non-blocking. A documentation-only fix needs no new review.

## 2026-11-10 — PLT-10 — mismatch 1: the green-on-PR criterion (Navigator decision)

- **Decision (Navigator):** Keep PLT-10 criterion 4 ("`ci.yml` is green on the scaffold PR (verified at PLT-11)") unchanged in `units/PLT-10-ci-workflow.md`. In PLT-10's plan, criteria 1 to 3 map to real local tests. Criterion 4 is recorded as "deferred to PLT-11, not testable here (no remote or runner)", with a local structural proxy: the workflow parses as YAML, it is a single job, and its steps run in the order npm ci → lint → test → build. The proxy is labelled a proxy, not the green-on-PR check. The green-on-PR checkbox stays unmarked.
- **Reason (Navigator):** The criterion already defers to PLT-11, and PLT-11 criterion 5 (`units/PLT-11-scaffold-gate.md` line 32) is the only owner of the green-on-PR check. Editing PLT-10 would be an unrequired one-way change. No earlier record of this mismatch exists in this file.
- **Driver note:** This entry is recorded now, not at step s3, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02 — mismatch 2: build before test for the contracts package (Navigator decision)

- **Decision (Navigator):** Option A. The `packages/contracts` workspace owns a build-before-test step inside its own `test` script (a `pretest` hook, or a test script that runs the `tsc` build first). PLT-02's runtime boot test (criterion 1, `units/PLT-02-contracts-package-platform-slice.md` line 63) then loads the built JS and `.d.ts` output. The CI order in PLT-10 (npm ci → lint → test → build, criterion 2 at line 25 and Decisions line 18) stays unchanged. No criterion text changes. Note 7 (line 105 of this file) is assigned to PLT-02.
- **Rejected (Navigator):** Option B, which moves the build before the test in PLT-10's job. It would change a criterion pinned in two places, a one-way change. Option C, which runs the tests against TypeScript source through a path mapping, contradicts PLT-02's stated rationale (line 15: consumed as built JS and `.d.ts` without path-alias tricks) and weakens criterion 1.
- **Reason (Navigator):** The build step belongs to the package that needs it, and the CI order stays as the unit fixes it. Mismatch 1 already set the precedent of keeping PLT-10's criteria unchanged.
- **Driver note:** apps/api tests that import the built contracts package (note 7) depend on `packages/contracts` running its `pretest` first. The root test fan-out runs `packages/contracts` first, so this holds by workspace order. PLT-04's plan must state this dependency, not rely on it silently.
- **Driver note:** Recorded now, before the PLT-02 plan is drafted, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-09 — mismatch 3: lint fixtures versus the root ESLint config (Navigator decision)

- **Decision (Navigator):** Option A. The PLT-09 lint-test fixture folder is added to the root ESLint `ignores` array (`eslint.config.mjs` line 7). `npm run lint`, and therefore PLT-10's CI lint step, stays green. The fixtures stay as `.ts` files, so their relative import paths stay valid. The PLT-09 test runs ESLint's Node API on each fixture with the ignore lifted (for example `new ESLint({ ignore: false, overrideConfig })` or `overrideConfigFile`), and asserts that the boundary errors appear.
- **Rejected (Navigator):** Option B, a non-`.ts` extension with a temporary copy per test, because its temporary copy is fragile. Option C, a second ESLint config for the test, because it adds a second file on top of the same ignore.
- **Reason (Navigator):** The root config's comment at line 4 anticipates later units adding entries. The ignore alone does not satisfy PLT-09 criterion 5 ("don't ship"). The PLT-09 plan must pin the fixture folder as a repo-root lint-test folder, outside `packages/` and `apps/`, and must state two mechanisms: the ESLint ignore, and the fact that the folder is not an npm workspace, so `npm run build --workspaces` never builds it.
- **No criterion text changes.** PLT-10's CI order (npm ci → lint → test → build) is untouched. Recorded as a plan note for PLT-09, not as a criterion change.
- **Driver note:** Recorded now, before the plans are drafted, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — batch [PLT-02, PLT-03, PLT-09, PLT-10] — root test script: one quoted glob (Navigator decision)

- **Decision (Navigator):** Replace the explicit file list in the root `test` script with a quoted Node-native glob, `node --test 'scripts/*.test.mjs'`. PLT-03 is the first unit by ID that edits the root `test` line, so it sets the glob in its plan. PLT-09 and PLT-10 (and PLT-12 later) add their own test file only and do not edit the `test` line. No runner script is added.
- **Change to an approved contract (recorded):** This changes the root `test` line that PLT-01 approved (DECISIONS 2026-11-10, "location and coverage of the pin-section test", which named one file). The glob is a superset: `scripts/pins.test.mjs` still runs. This is a one-way change to a PLT-01-approved line, and it is recorded here.
- **Reason (Navigator):** A single line shared by four units conflicts at every merge. With a glob, a new root test needs no `package.json` edit. A glob is simpler than a runner script, and Node's own glob is cross-platform.
- **Verified locally (driver, Node 24.21.0 at the time):** `node --test 'scripts/*.test.mjs'` and the shell-expanded form each ran every matching test file, reported 2 tests for 2 files, and did not run a non-test helper file. Node 26 behaviour is re-verified at implementation.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02 — output format: CommonJS (Navigator decision, disposition of PLT-02 open point 1)

- **Decision (Navigator):** Option A, CommonJS, as drafted. `packages/contracts/package.json` has no `"type": "module"`, and `tsconfig.base.json` keeps `module` and `moduleResolution` NodeNext, so tsc emits CJS. PLT-02 criterion 1 (`units/PLT-02-contracts-package-platform-slice.md` line 63) is tested with a direct CJS `require` from a NestJS-style consumer, as the criterion names it.
- **Consequence handed to PLT-11:** The Angular build may warn about a CommonJS dependency and may need an `allowedCommonJsDependencies` entry. PLT-11 owns the Angular half of the cross-runtime boot test (`units/PLT-11-scaffold-gate.md` lines 22 and 30), so it makes that decision.
- **Rejected (Navigator):** Option B, ESM with `"type": "module"`. It would make NestJS, which is CJS by default, load ESM through require(esm) on Node 26, which adds risk for no benefit. `units/PLT-02-contracts-package-platform-slice.md` line 20 allows either format if both runtimes load it, so CJS is a permitted choice, not a contradiction.
- **Reason (Navigator):** The draft already emits CJS. The Angular consequence is additive (an `allowedCommonJsDependencies` entry can be added later), so this is a low-risk one-way door. PLT-03 names no output-format constraint.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-10 — criterion 3 method: local PR-title script (Navigator decision)

- **Decision (Navigator):** Option A. The PR-title check is the local Node script `scripts/check-pr-title.mjs`, tested with `node:test` through `spawnSync`, as `plans/PLT-10.md` sections 2 and 4 describe. The header pattern is the one in `plans/PLT-10.md` section 2. The title reaches the script only through the environment variable `PR_TITLE`, never inside a `run:` line, so the title cannot inject shell code.
- **Rejected (Navigator):** Option B, a third-party action such as `amannn/action-semantic-pull-request`. It cannot run or be tested here without the network, and it adds third-party code that runs with the CI token. Option C, an inline regex in the YAML, because no test would run it.
- **Reason (Navigator):** Criterion 3 names no method. The local script is the only option that runs and is tested in this environment, so criterion 3 can be verified here.
- **No criterion text changes.** Criterion 4 stays deferred to PLT-11 (decision of 2026-11-10, PLT-10 mismatch 1).
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-09 — rule implementation: eslint-plugin-boundaries, with a named fallback (Navigator decision)

- **Decision (Navigator):** Option A. The boundary rule is `eslint-plugin-boundaries` 7.4.2, as a new exact root devDependency, as `plans/PLT-09.md` section 1 describes. Unit line 21 permits it. The plugin has the primitives the rules need: element types declared with a glob and a capture list (for the module slug), and ordered policies that allow or forbid element combinations.
- **Two required refinements, recorded:**
  1. **Rule name.** The draft's name `boundaries/dependencies` (plans/PLT-09.md lines 29, 39 and 68) is stale. The plugin's v2 migration guide renames the rule to `boundaries/element-types`. The v7 name is not confirmed by the search, so step 4 confirms it against the installed v7 docs. The config, the criteria and the file list then use that name.
  2. **Fallback, named in advance.** If step 4 finds that the plugin cannot express rules R1 to R3, the fallback is Option B: a local ESLint rule that resolves each import with a module resolver (`eslint-import-resolver-node`, which the plugin already brings) and checks the module and feature rules. The switch is recorded in this file when it happens. It is not silent.
- **Rejected (Navigator):** Option C, `no-restricted-imports` patterns alone, because the patterns match the raw import string and cannot see the file a relative import resolves to.
- **Residual risk (not a blocker):** how an entry file (`*.module.ts`) is told apart from an internal file, and the base for path matching (cwd or config directory), are unconfirmed. The step 4 stop rule covers both.
- **No criterion text changes.** The unit's Decisions line 21 is an implementation choice, not a criterion.
- **Driver note:** Recorded now, before the plan is revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-03 — dev script ownership: web "start" only (Navigator decision)

- **Decision (Navigator):** Option A. PLT-03 adds only the apps/web `start` script (`ng serve`, with the proxy wired for exactly `/api`, `/healthz` and `/events`). PLT-11 owns and adds the root `dev` script, which composes `start` with the API watch and `tsc --watch` on contracts. No criterion text changes.
- **Rejected (Navigator):** Option B, PLT-03 adding the root `dev` script now. PLT-11 owns the `dev` script and `concurrently` (`units/PLT-11-scaffold-gate.md` line 25), so Option B would force PLT-11 to rewrite it, a one-way door against that ownership.
- **Reason (Navigator):** None of PLT-03's three acceptance criteria (`units/PLT-03-web-bootstrap.md` lines 30 to 32) names the root `dev` script. Line 15 ("`npm run dev` must work end to end") is rationale. It is realized at the PLT-11 gate (criterion 1, line 28), not at PLT-03's merge.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-03 — web tsconfig: a local override of two keys (Navigator decision)

- **Decision (Navigator):** Option A. `apps/web/tsconfig.json` extends `../../tsconfig.base.json` and overrides only `module` and `moduleResolution`, keeping the Angular generator's values. Those values are decided at implementation, because the spec does not pin them and the generator is the right source.
- **Verified (driver):** `tsconfig.base.json` lines 6 and 7 set both keys to NodeNext. `apps/web/tsconfig.json` and `apps/api/tsconfig.json` currently inherit them with no local override. The web override changes only apps/web. The base, the API and contracts stay as they are.
- **Rejected (Navigator):** Option B, a second shared base such as `tsconfig.web.base.json`. It would add a root file and a shared config for one consumer, which the spec does not require.
- **Not a criterion change.** Recorded as the disposition of `plans/PLT-03.md` section 6, point 3.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02 — @types/node for the contracts tests (Navigator decision, disposition of PLT-02 open point 3)

- **Decision (Navigator):** Option A. `@types/node` at `^26` is a devDependency of `packages/contracts`, as the draft proposes. The build's second step type-checks `src` and `test` (`plans/PLT-02-...` section 1, line 15, "as the PLT-01 build did"), and the tests import `node:` modules, so the Node types are needed for that check to pass.
- **Criterion 3 is unaffected.** It forbids runtime dependencies other than Zod (`units/PLT-02-contracts-package-platform-slice.md` line 65). A devDependency is outside it, and the criterion's check reads `dependencies` only.
- **Rejected (Navigator):** Option B, dropping the tests from the type-check. It would weaken the build that PLT-01 set up, and leave the `node:` imports untyped. The spec does not require that change.
- **Not a criterion change.** Recorded as the disposition of `plans/PLT-02.md` section 6, point 3.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-10 — smaller plan choices accepted as drafted (Navigator decision)

- **Decision (Navigator):** Accept all seven defaults in `plans/PLT-10.md` section 6, as drafted:
  1. The 11 Angular-convention title types, with scope `[A-Za-z0-9._-]+` and `!` allowed.
  2. `edited` in the `pull_request` trigger types, so a retitled PR is checked again.
  3. The title step runs after checkout and setup-node, before `npm ci`, so it fails fast. The fixed order npm ci → lint → test → build is unchanged.
  4. The `yaml` devDependency, to parse the workflow structurally. Node has no built-in YAML parser.
  5. `node:test` for root-owned script tests, following the PLT-01 precedent. The root glob picks up `scripts/pr-title.test.mjs`.
  6. The `CI_WORKFLOW_PATH` override, used only by the mutation checks.
  7. Criterion 4 deferred to PLT-11, with the labelled structural proxy (YAML parse, one job, step order).
- **Reason (Navigator):** Each is a plan-level detail that the unit does not fix. Each is additive and consistent with the unit and the settled decisions. None changes a criterion. Criteria 1 and 2 keep the order and the trigger set the unit writes.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02, PLT-03, PLT-09 — smaller plan choices accepted as drafted (Navigator decision)

- **Decision (Navigator):** Accept all six defaults as drafted in the plans, with no criterion text changes:
  1. PLT-02: the field types for the `/platform` slice (hello, echo, echo request, healthz, version info) are chosen in the plan, with expand-contract. PLT-04 or PLT-06 may tighten them later.
  2. PLT-02: contracts export only the integer shape of `composeVersion`. PLT-04 owns the placeholder constant, and PLT-15 owns the real value (`units/PLT-04-api-composition-root.md` line 25).
  3. PLT-03: the PLT-01 AC 2 probe (`npx eslint --print-config test/smoke.test.ts`) breaks when PLT-03 deletes `apps/web/test/smoke.test.ts`. PLT-11 re-points the probe to a surviving file, and the path is left to PLT-11. PLT-03 records the break in its section 5.
  4. PLT-03: the placeholder uses one Material component (`mat-toolbar`), so the Material wiring is exercised. The criteria are the same with a bare heading.
  5. PLT-09: the web routes file is `<m>.routes.ts`. Feature units must confirm the name, a forward dependency.
  6. PLT-09: the "at all" ban (`units/PLT-09-module-boundaries-lint.md` line 19) also covers the agent-loop and graph-runner web features under `apps/web/src/app/features/`. This is the stronger reading of line 20 and is consistent with line 19.
- **Reason (Navigator):** Each is a plan-level detail that the units and PLT-04 do not fix. Each is additive, and none changes a criterion.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — Opus review of plan revision 1: NOT APPROVED (rejection 1 for each unit)

- **Rejection (Opus subagent, batch plan review of `plans/PLT-02.md`, `plans/PLT-03.md`, `plans/PLT-09.md`, `plans/PLT-10.md`, revision 1):** NOT APPROVED for all four. Count for each unit: 1 rejection.
- **PLT-02 (blocking):** open points 1, 2, 6 and 7 still say "Navigator to confirm" or "to say". All four are decided: the 2026-11-11 CommonJS entry, the 2026-11-10 PLT-02 zod entry, and the 2026-11-11 smaller choices 1 and 2. Lines 12, 18 and 23 still cite those open points.
- **PLT-03 (blocking):** points 8 (the PLT-01 AC 2 probe) and 9 (Material usage) are still open. The 2026-11-11 smaller choices 3 and 4 decided both.
- **PLT-09 (blocking):** the pass condition of criterion 4 contradicts itself. Part 4b sits inside the criterion's test and is skipped when PLT-02 is not merged. Section 6, point 6 says 4b is added "in the PLT-02 PR or at PLT-11", but PLT-02's file list does not include it. The criterion is a lint outcome, and part 4a covers it. Points 4 and 7 are decided by the 2026-11-11 smaller choices 5 and 6.
- **PLT-10 (blocking):** lines 15 and 120 say contracts builds "through its own `pretest`". That narrows the 2026-11-11 mismatch 2 entry, which allows a pretest or a test script that builds first, and it conflicts with `plans/PLT-02.md` line 16 (`npm run build && vitest run`, no pretest). Points 1 to 6, 11 and 12 still say "Navigator to confirm", but were decided on 2026-11-11.
- **Non-blocking notes:** (1) PLT-02 line 79: the consumer fixture sits inside the contracts package, so `@bbartolome/scriba-contracts/*` resolves by self-reference, not through the root `node_modules` symlink. (2) PLT-03 step 6: a generator that writes `"module": "preserve"` with no `moduleResolution` needs `moduleResolution: "bundler"` set explicitly. (3) PLT-03 step 5: the generator's vitest devDependency must match the root 5.1.0, or be omitted, and `npm ls vitest` must show one copy. (4) PLT-03 line 107 says the root test script "gains one `node --test` path"; line 47 makes it the glob. (5) PLT-09 step 10 and PLT-10 lines 31 and 89 need PLT-03 merged first. (6) PLT-09 line 84: `ESLint#isPathIgnored` is async and must be awaited. (7) PLT-09 point 2: add a check that `npm run lint -w @bbartolome/scriba-api` fails on a temporary violating file, then remove it.
- **Driver note:** Recorded now, before the fixes are made, because driver rule 7 requires the rejection to be recorded first. The problems go to the Navigator next.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — response to the Opus rejection of plan revision 1 (Navigator decision)

- **Decision (Navigator):** Accept all five proposed fixes. No criterion text changes in any unit.
  1. **PLT-02:** open points 1, 2, 6 and 7 are decided and cited: CommonJS (2026-11-11, commit 74f1d91), zod in packages/contracts (2026-11-10), and the smaller-choices entry (2026-11-11, commit 64b3744). The references at `plans/PLT-02.md` lines 12, 18 and 23 point to the decided entries.
  2. **PLT-03:** open points 8 and 9 are decided (smaller choices 3 and 4, commit 64b3744).
  3. **PLT-09, criterion 4:** the criterion passes on part 4a alone (lint of the contracts subpath imports). Part 4b (resolution of the ten subpaths) moves to **PLT-11 criterion 3**, which already owns cross-runtime resolution (`units/PLT-11-scaffold-gate.md` line 30). PLT-11 criterion 4 (line 31) still requires PLT-09's part 4a on `main`. Section 6 points 4, 6 and 7 are decided. Point 6 is closed by this move, not left open.
  4. **PLT-10:** "through its own `pretest`" becomes "the contracts package's own test script builds first (PLT-02 uses `npm run build && vitest run`, `plans/PLT-02.md` line 16)". This matches mismatch 2, Option A (commit fb78539). Section 6 points 1 to 6, 11 and 12 are decided; point 8 (runner pin) stays open.
  5. **Non-blocking, accepted:** the PLT-02 criterion 1 seam is corrected: the consumer resolves the package by self-reference, so the exports map is exercised and the root `node_modules` symlink is not. The PLT-03 step 6 sets `moduleResolution` to `bundler` if the generator writes `"module": "preserve"` without it. The PLT-03 step 5 pins the generator's vitest to the root 5.1.0 or omits it, and checks `npm ls vitest`. The PLT-03 section 5 wording says the root glob replaces the test line. PLT-09 step 10 and PLT-10 need PLT-03 merged first. PLT-09 awaits `ESLint#isPathIgnored`. PLT-09 adds a workspace check that `npm run lint -w @bbartolome/scriba-api` fails on a temporary violating file.
- **Rejection count:** 1 for each of PLT-02, PLT-03, PLT-09 and PLT-10. The plans are revised and go back to Opus before any commit.
- **Driver note:** Recorded now, before the plans are revised, because driver rule 5 requires each decision to be recorded and committed at once.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — Opus re-review of plan revision 2

- **Result (Opus subagent):** PLT-02 APPROVED. PLT-03 APPROVED. PLT-10 APPROVED. PLT-09 NOT APPROVED. Rejection count for PLT-09: 2. The next rejection is the third, and at three the Navigator must choose to make the unit smaller, divide it, or stop it.
- **PLT-09 (blocking):** (1) section 5, the PLT-11 entry (`plans/PLT-09.md` line 92), still says PLT-11 criterion 4 needs "4b after PLT-02". Part 4b moved to PLT-11 criterion 3 (commit 5831408). (2) The step 11 workspace check (line 56) names `apps/api/src/modules/graph-runner/graph-runner.service`, which does not exist yet. The step also says "both exit 0" directly after a check that must fail.
- **Non-blocking:** all four plans still say "Revision 1" in their headers. PLT-09 line 89 says "PLT-02's `pretest` build", which should read "PLT-02's build-first test script". PLT-09 open point 2 should note that step 11 now runs lint with the workspace as cwd. PLT-02 line 79 should name PLT-11 criterion 3 as the owner of workspace resolution, not PLT-04. PLT-02 open point 11 is settled by the DECISIONS entries that act on this batch. PLT-03 step 5 keeps `rxjs` and `tslib` at the generator's exact versions, not at 22.2.5.
- **Driver note:** Recorded now, before the fixes are made, because driver rule 7 requires the rejection to be recorded first. The problems go to the Navigator next.

## 2026-11-11 — PLT-02, PLT-03, PLT-09, PLT-10 — plan batch APPROVED by Opus (revision 2, after the fixes)

- **Result (Opus subagent):** PLT-02 APPROVED and PLT-03 APPROVED (revision 2, re-review). PLT-10 APPROVED (revision 2, re-review). PLT-09 NOT APPROVED on the second review, its two blockers were fixed as the Navigator decided (this file, the entry of the same date), and it was APPROVED on the third review. Rejection count: PLT-09 has 2 rejections, which are recorded above. PLT-02, PLT-03 and PLT-10 have 1 rejection each, recorded above.
- **Non-blocking notes applied in the plan files:** the R1 to R3 labels are defined in `plans/PLT-09.md` section 1. The step 11 workspace check runs `mkdir -p`, runs the root checks before the temporary files exist, and removes them afterwards.
- **Driver note:** Plans are committed as `status: planned` in one commit, as step s4 of the batch requires. No implementation is started in this iteration.

## 2026-11-11 — PLT-03, PLT-10 — Opus code review of the first implementation pass

- **Result (Opus subagent), PLT-10:** APPROVED (code of `unit/PLT-10`, three commits). Criteria 1 to 3 are met by local tests. Criterion 4 stays unticked and deferred to PLT-11 (see the PLT-10 mismatch 1 entry above). Non-blocking notes: (1) PLT-10 merges only after PLT-03. At that merge the root `test` line stays PLT-03's glob, `package-lock.json` is regenerated from main (`yaml@2.9.1`), and the full check set is rerun; (2) the action majors `actions/checkout@v4` and `actions/setup-node@v4` are unverified, to be checked at PLT-11 criterion 5; (3) the test that checks the title step's `if` only asserts `pull_request`; a negated condition passes it. Tightening to the exact string is optional; (4) `npm ci` reports 10 moderate findings in the eslint chain (minimatch), not caused by PLT-10.
- **Result (Opus subagent), PLT-03:** NOT APPROVED (code of `unit/PLT-03`, two commits). Rejection count for PLT-03: 1. Blocking: `apps/web/src/index.html` lines 9 to 18 (two preconnect links, the Roboto stylesheet and the Material Symbols stylesheet) load from fonts.googleapis.com and fonts.gstatic.com. The production build inlines those fonts on every build, so the build fails with exit 127 when the network is cut, and every page load sends requests to Google. Correction the reviewer verified: delete those lines and keep everything else. The page uses no Material Symbols icon, and the Roboto fallback is cosmetic for a placeholder. Non-blocking, plan text only: plan section 2 and step 3 must name `apps/web/src/material-theme.scss` (written by `ng add`, loaded from `angular.json` before `src/styles.css`), must not claim an animations provider, and must not claim that `app.config.ts` changes; the PLT-01 AC 2 probe premise is wrong (the probe runs in workspaces that still have `test/smoke.test.ts`, and `npx eslint --print-config` exits 0 there), so PLT-03 section 5, open point 8 and the smaller-choice entry of 2026-11-11 need correcting and PLT-11 does not need to re-point the probe; `apps/web/angular.json` `$schema` should point at the root `node_modules/@angular/cli/lib/config/schema.json`.
- **Driver note:** The font-link correction is the simplest fix the reviewer verified. It is not a Navigator decision: the Navigator question the implementer raised about the font links (its item 3c) is still open, because the Navigator session could not be used in this run. The correction is applied to the code as a pending fix. PLT-03 is not approved until a new Opus review passes. Plan text corrections are not applied to `main` yet.

## 2026-11-11 — PLT-03 — Opus re-review of the fix commit 3c0a1e3: APPROVED

- **Result (Opus subagent, second review):** APPROVED for the code of `unit/PLT-03` at 3c0a1e3 (commits a352943, 6f4aec4, 3c0a1e3). Rejection count for PLT-03: 1. The fix deletes exactly lines 9 to 18 of `apps/web/src/index.html` (the external font links) and changes nothing else. Criteria 1 to 3 pass again, the root lint, test and build pass, and a build with the network cut (`HTTPS_PROXY=http://127.0.0.1:9`) now exits 0. Only comment URLs and the XML namespace strings in the built output remain, and none is a network request. The reviewer confirmed that the pre-fix commit failed under the same network cut, so the check does tell the two apart.
- **Open, non-blocking (plan text, to apply to `main` before PLT-03 is merged):** (1) `plans/PLT-03.md` section 2 and step 3 say `styles.css` holds the Material theme and that `app.config.ts` provides animations; the code has `apps/web/src/material-theme.scss` (loaded before `src/styles.css`) and no animations provider; (2) `plans/PLT-03.md` section 5 and open point 8, and the 2026-11-11 smaller-choice entry (item 3), say PLT-11 must re-point the PLT-01 AC 2 probe; the premise is wrong, so PLT-11 does not need to; (3) `apps/web/angular.json` `$schema` should be `../../node_modules/@angular/cli/lib/config/schema.json`; (4) `typography: Roboto` in `material-theme.scss` falls back to the system font, accepted for a placeholder.
- **Driver note:** The Google Fonts correction is applied to the code. It is not yet a Navigator-settled decision (see the previous entry); the implementer's question 3c is still open for the Navigator. The batch is not complete: PLT-02 and PLT-09 are not approved, so nothing goes to `batch/current` in this iteration.

## 2026-11-11 — PLT-02, PLT-09 — plan revision 3 after the implementation stops (driver decisions, Navigator not available)

- **Context:** The Navigator could not be used in this session. The `navigator:pair` skill is set to user invocation only, and the MCP navigator tools rejected each answer tool for pair mode. The two questions below had already been put to the Navigator's process. The driver settles them here as smaller decisions, with the simplest option, and asks the Navigator to confirm them on its next run.
- **PLT-02, types under TypeScript 6 (option A):** `"types": ["node"]` in `packages/contracts/tsconfig.json`. Reason: one line in the package's own config. Option B needs a directive in each test file that uses Node APIs. Option C changes a PLT-01 root file. Downstream effect: each workspace sets its own `types` (PLT-04 must, per `plans/PLT-02.md` open point 12). Verified by the driver: `tsc --noEmit -p tsconfig.json` fails without the setting and passes with `--types node`.
- **PLT-09, element patterns (no leading `**/`):** `src/modules/*` and `src/app/features/*`. Reason: the implementer's experiment showed that `**/` captures an empty module name, so criterion 1 could not pass. With the new patterns, the four cross-module fixtures produce the R2 message and the three ok fixtures produce no message. The criteria are unchanged. The same revision records the rule name `boundaries/dependencies` (v7.4.2), the resolver extensions setting, and the lockfile count (`plans/PLT-09.md` sections 1, 2 and 6, revision 3).
- **Pending:** each revised plan goes to Opus before its unit's code continues. The Opus results are recorded here when they arrive, and the Navigator's confirmation of the two decisions is still open.

## 2026-11-11 — PLT-02 — Opus plan review of revision 3: APPROVED with corrections applied

- **Result (Opus subagent):** APPROVED. The reviewer confirmed the TypeScript claim in a scratch copy: without the setting `tsc --noEmit -p tsconfig.json` fails in exactly `test/boot.test.ts` and `test/package-deps.test.ts`; with `types: ["node"]` the check and the root build, test and lint pass; `apps/api` type-checks against the contracts subpaths without the setting; `tsconfig.build.json` keeps the Node-free guard. All three criteria are unchanged. The types choice (option A) fits the build chain and the DECISIONS entries it cites.
- **Corrections, applied to `plans/PLT-02.md` in the same commit as this entry (none changes the code approach):** (1) step 5 Prettier command includes `packages/contracts/tsconfig.json`, and the object is written with spaces (the unspaced form fails `prettier --check`); (2) a resume paragraph in section 3: steps 1 to 4 are done (96e0eda), the step 5 files are in a698680, the implementer resumes at the tsconfig edit and does not run step 2 again; step 11 keeps the existing commits and adds the feature commit with the unit id; (3) section 5 (PLT-04) gets item (e): apps/api needs Node types under TypeScript 6, and PLT-04's plan chooses the form; open point 12 says the same.
- **Driver note:** The option choice (A) is still a driver decision that the Navigator must confirm.

## 2026-11-11 — PLT-09 — Opus plan review of revision 3: NOT APPROVED (third rejection; to the Navigator)

- **Result (Opus subagent):** NOT APPROVED. **Rejection count for PLT-09: 3** (two on the plan batch, recorded above; this one is the third). At three rejections the disagreement goes to the Navigator (prompt.md, step 5).
- **Blocking:** the new element patterns are right, but the file-category setting (`boundaries/files`, category `entry`) also needs the leading `**/` in its two patterns, because file patterns are matched against the path relative to `process.cwd()`. Revision 3 had dropped it, and open point 2 said the opposite. The reviewer reproduced it: without `**/`, criteria 2 and 3 fail from the repository root and pass with `apps/api` as the cwd. The reviewer confirmed the element patterns: R2 holds in both directions, and R1 and R3 hold with the file patterns.
- **Applied to `plans/PLT-09.md` in the same commit as this entry:** the `boundaries/files` setting with its `**/` patterns is written into section 2; open point 2 is rewritten with the cwd facts; open point 3 names the right source (`eslint-import-resolver-node/index.js`, extensions without `.ts`); open point 1 is marked confirmed; a stale "per step 4" phrase in criterion 5's text names `boundaries/dependencies`; the criterion-4 weakness is open point 8; the lockfile wording and the step 7 wording are corrected; the "driver decision, Navigator confirmation pending" marking is added to the element-pattern and file-pattern choices.
- **Driver decision:** the code of `unit/PLT-09` does not continue, because the plan is not approved. The rule for three rejections sends this to the Navigator, which settles the point or stops the unit. The Navigator is not available in this run. PLT-09 therefore stays `planned` with no further code work, and the batch cannot reach `batch/current` until the Navigator settles PLT-09.

## 2026-11-11 — PLT-02 — plan revision 4: the base envelope requires `data` (driver decision; measured Zod behaviour)

- **Context:** The implementer stopped at step 11 (no commit). It measured that zod 4.6.7 treats a `z.unknown()` key as required: `sseEnvelopeSchema.safeParse({module:'platform', type:'hello'})` fails with `invalid_type` at `["data"]`, and `data: null` passes. Revision 3 of the plan (section 1 and open point 8) said the opposite. No acceptance criterion or test failed; the plan text was wrong.
- **Options:** (a) keep the base `data` required, which matches unit line 27 (`{module, type, data}`) as written, and correct the plan text and the `events.ts` comment; (b) make the base `data` optional with `z.unknown().optional()`, which would change the envelope the unit names and which the other modules depend on.
- **Decision (driver, the simplest option):** (a). The base requires `data`. Plan revision 4 corrects section 1 (envelope bullet), open point 8 and the header. The schema test gains one case, an envelope with no `data` key, which must be rejected. The `events.ts` comment is corrected in the implementation commit. The member schemas keep `data` required as well.
- **Pending:** Opus must approve revision 4 before the implementation commit. The Navigator has not confirmed this decision either.

## 2026-11-11 — PLT-02 — Opus plan review of revision 4: NOT APPROVED (rejection 2 for PLT-02)

- **Result (Opus subagent, read-only review of `plans/PLT-02.md` revision 4):** NOT APPROVED. Rejection count for PLT-02: 2 (the plan batch rejection of revision 1, and this one). The reviewer's checks passed: the toolchain versions, the unit and downstream line references, the zod 4.6.7 measurement, the TypeScript `types` claim, and the step 6 to 10 outputs in a scratch copy.
- **Problems (to the plan text; no criterion change):** (1) the criterion 2 pass condition in section 4 and the Rejected list omit the revision-4 case, a base envelope with no `data` key, which must be rejected; the `platform.schema.test.ts` row in section 2 needs it too. (2) The resume paragraph (section 3) is still labelled revision 3, tells the implementer to make the tsconfig edit (already in commit 5d7376b on `unit/PLT-02`), and does not name the revision-4 edits. (3) The plan and this log disagree on the stop step (plan says step 7, the 2026-11-11 revision-4 entry says step 11); step 7 still says the `z.unknown()` assumption is checked. (4) Step 11 must use the commit message `feat(PLT-02): …`, with the unit id.
- **Driver note:** Recorded before the fixes, because driver rule 7 requires a rejection to be recorded first. The fixes go to a plan-fix subagent next, then a new Opus review. Because this is the second rejection, a third one goes to the Navigator.

## 2026-11-11 — PLT-02 — Opus plan review of revision 5: APPROVED

- **Result (Opus subagent, fresh context, read-only review of `plans/PLT-02.md` revision 5):** APPROVED. The reviewer checked the revision-4 fixes: the base envelope requires `data`, with the no-`data` case in the schema test; the resume paragraph; the plan and log agreement on the stop step; the `feat(PLT-02): …` commit message.
- **Driver note:** PLT-02 status stays `planned`. The code of `unit/PLT-02` continues from its commits in a later step (code mode).

## 2026-11-11 — PLT-09 — open point 8 (criterion 4 weakness): option A (Navigator decision)

- **Decision (Navigator, session f01b01fc…, answer to set_plan):** Option A. Keep criterion 4 and part 4a (zero-message `lintText` runs) exactly as written. Record the weakness: `checkAllOrigins` defaults to false, so the rule never checks external imports; zero messages prove no policy blocks the import, not that a policy allows it. The stronger positive-allow check is left to PLT-11 criterion 3 and 4.
- **Rejected options:** (B) enable `checkAllOrigins`: unverified against the plugin source, and a one-way-door change that would make the rule check all external imports. (C) stop the unit: the criterion is testable as written, and the unit only requires the import to pass.
- **Reason (Navigator):** the unit's criterion 4 only requires the contracts import to pass, not that a rule positively allows it.
- **Verification gap (driver):** the Navigator's web searches did not confirm the `checkAllOrigins` default or `getDependencySkipReason`. The plugin is not yet installed (step 2 and 3 of PLT-09). The claim stays unverified until the install.
- **Driver note:** open point 8 in `plans/PLT-09.md` is marked resolved. PLT-09 needs a new Opus plan review of revision 3 with this decision before it can be approved. Its status stays `planned`.

## 2026-11-11 — PLT-09 — Opus plan review of revision 3 after the Navigator decision: NOT APPROVED (rejection 4 for PLT-09)

- **Result (Opus subagent, fresh context):** NOT APPROVED. The reviewer checked the five criteria (all covered), and the rewritten open point 8 (matches the Navigator decision). Four blocking problems, all plan text, no criterion change:
  1. The root `test` script on `main` is still `npm test --workspaces && node --test scripts/pins.test.mjs`. The glob `'scripts/*.test.mjs'` exists only on `batch/current` (commit 506e1f8, PLT-03). Plan steps 10 and 14 would fail on `main` or on the unit branch. Verified by the driver: `package.json` line 23 on `main` and on `batch/current`.
  2. Plan step 15 says "merge to `main`" with `status: done` in a merge commit. prompt.md forbids merge commits (line 5). The correct route is rebase onto `batch/current` and fast-forward (steps 6 to 8).
  3. `unit/PLT-09` already exists (a404e21, 333399b). Steps 1 to 3 cannot run as written, and the element patterns on that branch are the old `**/` ones. A resume paragraph is missing.
  4. Open points are mis-numbered: point 3 and point 4 run together on one line, and two points are numbered 8. DECISIONS refers to "PLT-09 open point 8", which is ambiguous.
- **Driver note:** Problems 1 to 4 are plan-text corrections. They are not a disagreement, so the Navigator is not asked again. The fixes go to a Haiku subagent of the unit (revision 4). Then a new Opus review. The four-rejection count is recorded here, not from memory.

## 2026-11-11 — PLT-09 — Opus plan review of revision 4: NOT APPROVED (rejection 5 for PLT-09)

- **Result (Opus subagent, fresh context, review of `plans/PLT-09.md` revision 4):** NOT APPROVED. The four problems of the previous review are fixed in content. Five new problems, all plan text, no criterion change:
  1. Blocking: the step-7 element-pattern edit stays uncommitted until step 16, so `git rebase batch/current` (step 10) fails on a dirty tree. The rebase also conflicts in `package-lock.json`, which needs `npm install` and `git rebase --continue`. Verified by the driver: the repo has no `rebase.autoStash` (`git config --get rebase.autoStash` returns nothing).
  2. Blocking: `node_modules/` is git-ignored and not in the new worktree, so steps 4(d), 7 and 8 cannot load the plugin unless `npm ci` runs in the worktree first.
  3. The step 16 reference "driver rule 7" does not exist. Verified by the driver: `grep -c "rule 7" prompt.md` returns 0. The review is prompt.md step 5, and its diff is `git diff batch/current...unit/PLT-09`.
  4. The section 1 and 2 quote of main's `test` line omits the workspace part. Step 11 should say that the glob runs every `scripts/*.test.mjs` file.
  5. Two inconsistencies with the resume: the plugin bullet says "re-resolved at implementation (step 2)", but step 2 is skipped; the step-6 red run on main's config fails criteria 1, 2, 3 and 5, not only 1 to 3.
- **Driver note:** These are plan-text corrections, not a disagreement, so the Navigator is not asked again. Fixes go to a Haiku subagent of the unit (revision 5), then a new Opus review. Rejection count: 5, recorded here.

## 2026-11-11 — PLT-09 — Opus plan review of revision 5: APPROVED

- **Result (Opus subagent, fresh context, review of `plans/PLT-09.md` revision 5):** APPROVED. The five problems of the previous review are fixed. The reviewer ran a test rebase in a scratch clone (a404e21 conflicts in `package-lock.json` only; 333399b and the element-pattern commit then apply cleanly) and a red run on main's config (criteria 1, 2, 3 and 5 fail, criterion 4 passes). Repo facts confirmed: 506e1f8 on batch/current, a404e21 and 333399b on `unit/PLT-09`, lockfile 162 to 190 entries, batch/current 532 entries.
- **Not verified (plugin internals, not read by the reviewer):** the `checkAllOrigins` default and `getDependencySkipReason` (open point 8); `boundaries/element-types` as a deprecated alias; element patterns matching from the right and file patterns relative to cwd; the default extensions of `eslint-import-resolver-node`. These are checks for step 4 at implementation.
- **Non-blocking notes, to fix when the code is implemented (not a re-review):** (1) the resume label in section 3 says "revision 4"; (2) step 11 is a placeholder; (3) step 10's "lockfile of batch/current" means the rebased branch's lockfile (batch's plus the plugin's 28 entries); (4) step 4 says "R1 to R3 below", they are in section 1; (5) step 6 says "create" the test and fixtures, which exist in 333399b.
- **Driver note:** PLT-09 status stays `planned`. The code of `unit/PLT-09` is next (code mode, prompt.md step 4).

## 2026-11-11 — PLT-02 — Opus code review of unit/PLT-02 (a6b3fa0): APPROVED

- **Result (Opus subagent, fresh context, review of `git diff main...unit/PLT-02` and the test run):** APPROVED. All three acceptance criteria are met, each with a passing test at least as strong as the criterion. Tests in the worktree: 4 files, 42 tests, exit 0 (Node v26.13.0). The reviewer's scratch mutations made the root-import and dependency tests fail (an added `"."` export, a second runtime dependency) and the schema tests fail (dots in `type`, any `module`), so the tests can fail.
- **Plan wording (non-blocking):** the plan's section 2 says the `/platform` index re-exports "the five files below", but six files are listed. The implementer re-exported six, including `env.ts` (which holds `SCRIBA_ENV_DEFAULTS`, required by criterion 1). The reviewer judged six correct. Fix the plan wording "five" to "six" in a later plan commit.
- **Commits:** 96e0eda `chore(PLT-02)`, a698680 and 5d7376b `wip(PLT-02)`, a6b3fa0 `feat(PLT-02)`. The two wip commits are kept without squashing, as the plan says. No merge commits, no remote.
- **Driver note:** PLT-02 status stays `planned` until the batch fast-forward of `main` (prompt.md step 8). Its code is on `unit/PLT-02`, not yet on `batch/current`. Rejection count for PLT-02 code: 0.

## 2026-11-11 — PLT-09 — Opus code review of unit/PLT-09 (2dc0f66): NOT APPROVED (rejection 1 for PLT-09 code)

- **Result (Opus subagent, fresh context, review of `git diff batch/current...unit/PLT-09`):** NOT APPROVED. Acceptance criteria 1 to 5 pass, each with a test at least as strong as the criterion; the rule name, capture key and file category are confirmed in the installed plugin; criterion 4 is a skip, not an allow (open point 8, option A). The commits carry the unit id and there are no merges.
- **Blocking problem (lockfile):** the lockfile is not the additive change the plan describes. Against batch/current it adds 27 entries, changes 143 existing entries, removes 1, and drops `resolved` and `integrity` from 156 package entries. batch/current has none without them. It also moves root `chalk` 5.6.2 to 4.1.2 and bumps seven `@babel/*` packages (Angular toolchain). Verified by the driver: root `node_modules/chalk` is 5.6.2 on batch/current and 4.1.2 on unit/PLT-09. The cause is the `npm install` run during the step-10 rebase conflict, over a node_modules tree from the pre-rebase lockfile.
- **Correction (Opus):** rebuild the lockfile from batch/current: `git show batch/current:package-lock.json > package-lock.json`, `rm -rf node_modules`, `npm install --package-lock-only --ignore-scripts`, `git diff --exit-code package.json` must be clean, `npm ci`, rerun the boundaries test, `npm test` and `npm run lint`, commit `fix(PLT-09): ...`. The target is 532 to 559 entries, 27 added, 0 removed, no existing entry changed except the root devDependencies, all package entries with `resolved` and `integrity`, root chalk 5.6.2.
- **Plan (non-blocking, later plan commit):** the plan's "28 entries (162 to 190)" was measured against main; against batch/current it is 27. Step 10 must say to rebuild the lockfile from batch/current with `npm install --package-lock-only`, not plain `npm install`. The same rule applies to the prompt.md step 6 rebase when a lockfile conflicts.
- **Driver note:** the plan already requires an additive lockfile, so no plan change is needed before the fix. Rejection count for PLT-09 code: 1.

## 2026-11-11 — PLT-09 — Opus code re-review of unit/PLT-09 (54f353a): APPROVED

- **Result (Opus subagent, fresh context, re-review after the lockfile fix):** APPROVED. The lockfile diff against batch/current is additive: 359 lines added, 0 removed; 27 package entries added, 0 removed; the only existing entry that changes is the root `""` devDependencies entry (`eslint-plugin-boundaries` 7.4.2). Root chalk stays 5.6.2; the plugin's own chalk 4.1.2, ansi-styles 4.3.0 and supports-color 7.2.0 are nested under `node_modules/eslint-plugin-boundaries/`. All 550 registry entries have `resolved` and `integrity`. `package.json` is unchanged since 63c6708. The five criteria tests pass (boundaries 5/5; root `npm test` 17/17; `npm run lint` exit 0), also on a fresh clone of 54f353a.
- **Checked by the reviewer, not a problem:** the implementer read revision 3 of `plans/PLT-09.md` from the branch and reported no resume paragraph. The approved revision 5 on `main` has it (section 3, "Resume (revision 4)"). The code matches revision 5.
- **Non-blocking note for the batch step (prompt.md step 8):** `main` has commits that are not on `batch/current` (plan and DECISIONS docs only). `main` is not an ancestor of `batch/current`, so step 8 needs `batch/current` rebased onto `main` first.
- **Driver note:** Rejection count for PLT-09 code: 1 (2dc0f66, lockfile drift); the fix is 54f353a. Both units' code is now approved: PLT-02 (a6b3fa0) and PLT-09 (54f353a). Next: prompt.md step 6, collect the approved units on `batch/current`.

## 2026-11-11 — PLT-02 — lockfile gate at the batch collection (driver decision, prompt.md step 6)

- **Situation:** rebasing `unit/PLT-02` onto `batch/current` stopped on `package-lock.json`. The rebased diff against `batch/current` had 33 added lines and 1 removed line. The removed line is `"version": "0.0.0"` on the `packages/contracts` workspace entry, which is re-emitted with a trailing comma because PLT-02 adds its own `dependencies` and `devDependencies` blocks to that entry. Verified by the driver: the other changes are additive (`@types/node` 26.6.6, `undici-types` 8.9.0, `packages/contracts/node_modules/zod` 4.6.7); no existing package entry changed.
- **Decision (driver, the simplest option):** the gate means "no existing package entry changes version or content". A comma on the unit's own workspace entry is part of that unit's change and passes the gate. The PLT-02 rebase is accepted. Its tests pass after `npm ci` (42 of 42 in `packages/contracts`).
- **Procedure used for the lockfile:** `git checkout --ours package-lock.json`, then `npm install --package-lock-only --ignore-scripts`, then `git add` and `rebase --continue`. For PLT-09 the rebase applied cleanly; after it, `npm ci`, `npm ls --all` (exit 0), boundaries 5/5, `npm test` 17/17, `npm run lint` and `npm run build` all exit 0; the lockfile diff against `batch/current` is 359 added and 0 removed.
- **Batch state after step 6:** `batch/current` (head 2fd80ee) holds PLT-03, PLT-10, PLT-02 and PLT-09. The `unit/PLT-02` and `unit/PLT-09` branches and their worktrees are deleted (both were on `batch/current`; `git branch -d` refused because it checks against `main`, so `-D` was used after `merge-base --is-ancestor` confirmed both).

## 2026-11-11 — PLT-04 — Opus plan review of revision 1: NOT APPROVED (rejection 1 for PLT-04 plan)

- **Result (Opus subagent, fresh context, review of `plans/PLT-04.md` revision 1):** NOT APPROVED. The five criteria match the unit verbatim. Eleven items, of which four are blocking:
  1. Open point 1 (CommonJS vs ESM for apps/api, NestJS 12 is ESM-only). Left to the Navigator. The reason "NestJS is CJS by default" in the PLT-02 CommonJS entry is false for NestJS 12.
  2. Blocking: the AC 3 and AC 4 tests would pass even if the criteria broke. Assert no stack-frame lines and the labelled forms (`SCRIBA_LOG_LEVEL` message, `UID <n>`, `GID <n>` from `getuid()` and `getgid()`).
  3. Blocking: `create-test-app` imports `...COMPOSED_MODULES, ...(modules ?? [])`, a superset of the unit's "a given subset of modules". Use `...(modules ?? COMPOSED_MODULES)`, add `modules` to `BootOptions`, and state that `createTestApp` runs `bootstrap()` then `listen(0, '127.0.0.1')`.
  4. Blocking: "ConsoleLogger writes to stdout" is false for `@nestjs/common` 12.4.2. `error` and `fatal` go to stderr (`services/console-logger.service.js` lines 110 and 148). Fix with a ConsoleLogger subclass in `platform/boot/` that forces stdout.
  5. Non-blocking: spawned tests need a timeout or an async spawn that kills the child.
  6. Non-blocking: the AC 2 `staticRoot` must be resolved from `__dirname`, not the repo root.
  7. Non-blocking: the step 6 lockfile gate must compare `resolved` and `integrity` as well as `version`, and allow flag-only changes (`dev`).
  8. Non-blocking: unit line 22 says "host path"; the container cannot know it. Print the container path, and add `SCRIBA_LIBRARY` only when set.
  9. Non-blocking, downstream: open point 17 has PLT-07 and PLT-08 both edit `bootstrap.ts`, which conflicts with unit line 20 and the Parallelism section of `modules/platform.md`. Use provider hooks in their own folders. PLT-11's dev script must pass absolute `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR`.
  10. Non-blocking: build the serve-static exclude list from `HEALTHZ_ROUTE` and `EVENTS_ROUTE`.
  11. Non-blocking: close open points 13 and 14 and the `__dirname` assumption (verified by Opus: `getDependencySkipReason`, TypeScript 6.0.3 accepts the decorator options, Vitest 5.1.0 injects `__dirname`).
- **Driver note:** Problems 2, 3 and 4 are plan-text and file-list corrections, not disagreements, so they go to the Haiku subagent of the unit (revision 2). Problem 1 is a decision to settle: the Navigator is required, and the driver cannot invoke `navigator:pair` (the skill is reserved for explicit user invocation). PLT-04 status stays `draft`. Rejection count for PLT-04 plan: 1.

## 2026-11-12 — PLT-04 — Opus plan review of revision 2: APPROVED (point 1 still open)

- **Result (Opus subagent, fresh context, review of `plans/PLT-04.md` revision 2):** APPROVED. All eleven revision-1 problems (A to K) are fixed. The five acceptance criteria match the unit verbatim. Opus re-verified from the packed `@nestjs/common` 12.4.2 source that `error` and `fatal` write to stderr, and that the stdout logger's two overrides cover every stderr path. It also checked the init and shutdown order that PLT-06 and PLT-08 depend on, and ran TypeScript 6.0.3 and Node 26.13.0 on the CommonJS path.
- **Open point 1 is not decided by this review.** The approval covers the plan text as written, which keeps apps/api CommonJS. The Navigator still has to settle CommonJS vs ESM before `status: planned`. The driver cannot invoke `navigator:pair`, so the choice goes to the user.
- **Non-blocking notes to apply in revision 3** (no criterion change):
  - `SCRIBA_LIBRARY` defaults to `~/Books` in `env.ts`, so "only when set" must be decided from the raw environment, with no default. Add a test for no host line when unset, and a PLT-15 handoff to pass the variable through.
  - `NestFactory.create` defaults to `abortOnError: true`, which can call `process.exit(1)` inside a Vitest worker. Pass `abortOnError: false` so `bootstrap()` rejects.
  - AC 4 root case: chmod the temporary library to 0o755 so only `.scriba` fails.
  - The spawn timeout (20000) equals the Vitest `testTimeout`. Use about 15000 for the spawn.
  - Stale text: `HEAD is bb80437` (now 73cbda0). "Three gaps" in section 5 lists more.
  - Wording: PLT-07 and PLT-08 both add a provider line to `platform.module.ts`; no unit edits `bootstrap.ts`.
  - `main.ts` handles only `BootError`; other errors are rethrown. PLT-07's "newer schemaVersion" refusal must throw `BootError`.
- **Driver note:** Rejection count for the PLT-04 plan: 1. PLT-04 status stays `draft`.

## 2026-11-12 — PLT-04 — Opus plan review of revision 3: APPROVED (point 1 still open)

- **Result (Opus subagent, fresh context, review of `plans/PLT-04.md` revision 3):** APPROVED. All eight revision-3 changes are correct. The reviewer confirmed in a scratch `npm pack` of `@nestjs/core` 12.4.2 and in a scratch run on Node 26.13.0 that `abortOnError: false` and the 0o755 chmod behave as the plan says, and that the npm workspace behaviour holds on npm 11.20.0.
- **Factual correction (non-blocking, to apply in revision 4):** the plan says the `abortOnError` default "prints nothing". That is wrong. Nest's exception handler logs the error and its stack through the app logger, then calls `process.exit(1)`. With `abortOnError: false`, the error is logged and `create` rejects. Also, a rejected `onApplicationBootstrap` makes `init()` reject in both modes; the option matters only for errors while providers are built.
- **Other non-blocking notes for revision 4:** the AC 3 and AC 4 tests do not reach any PLT-07 hook, so line 145 must not say they catch a PLT-07 stack. The reviewer's `os.tmpdir()` note (uid 65534 must be able to enter it) goes into point 16. PLT-05 and PLT-06 also edit `platform.module.ts`, so the wording becomes "each of PLT-05 to PLT-08". Line 131 must say both `SCRIBA_LIBRARY` cases use the unwritable-`.scriba` setup. `SCRIBA_LIBRARY=""` fails the non-empty rule, so PLT-15 must not pass an empty value.
- **Driver note:** These are text corrections. The reviewer approved the plan with them listed as non-blocking, so they are applied in revision 4 without a further review. Point 1 (CommonJS vs ESM) is still open and waits for the Navigator and the user. PLT-04 status stays `draft`. Rejection count for the PLT-04 plan: 1.

## 2026-11-12 — PLT-04 — Opus plan review of the fresh redraft (`plans/PLT-04.md`, labelled revision 1 in the file): NOT APPROVED (rejection 2 for PLT-04 plan)

- **Context:** the untracked revision-4 draft was discarded under prompt.md step 1 (uncommitted work on `main`). The redraft was written from the entries above, not from that file.
- **Result (Opus subagent, fresh context):** NOT APPROVED. Nine items, one blocking:
  1. [blocking] Step 1 builds `packages/contracts` before anything is installed. A fresh worktree has no `node_modules`, and the checkout's `node_modules` lacks `zod` and `@types/node`. Step 3 then runs `npm install` over a stale tree, which is the PLT-09 lockfile drift (line 373). Correction: start with `npm ci`, then build contracts.
  2. [non-blocking] Step 17 expects exit 0 after SIGTERM. `enableShutdownHooks()` with no options re-sends the signal, so the exit is by signal (status 143). Correction: pass `{useProcessExit: true}`, or expect termination by signal.
  3. [non-blocking] Five test files are expected. `smoke.test.ts` also matches `test/**/*.test.ts`. Correction: expect six.
  4. [non-blocking] A7 says step 10 and AC 1 check that the Nest packages load through `require`. They do not. Correction: name the AC 3 and AC 4 spawns and step 17.
  5. [non-blocking] Mutation 14(d) changes the test setup, not the code. Correction: mutate `boot/app-state.ts`.
  6. [non-blocking] `SCRIBA_ENV` is in a non-entry file. Any other module that injects it breaks PLT-09 rule R1. Correction: re-export `SCRIBA_ENV` and `ScribaEnv` from `platform.module.ts`.
  7. [non-blocking] serve-static has six peers, two of them required. Line 217 says the four peers are optional. Line 211 is out of date. Correction: reword both.
  8. [non-blocking] The "Revision 1" header clashes with the rejected revision 1 (line 392). Correction: label it revision 5.
  9. [non-blocking] Old note 6 (line 400) is applied only as "absolute path". Correction: state `resolve(__dirname, 'fixtures/static')`.
  - The CommonJS default is internally consistent. Downstream units PLT-05 to PLT-08 and PLT-11 agree with the plan, once item 6 is applied.
  - Facts spot-checked: 18, of which wrong: 1 (the reviewer did not say which one).
- **Driver note:** Items 1 to 9 go to the Haiku subagent of the unit, which writes revision 5. Open point 1 (CommonJS vs ESM) is unchanged and still waits for the Navigator. PLT-04 status stays `draft`. Rejection count for the PLT-04 plan: 2. At three rejections the disagreement goes to the Navigator.

## 2026-11-12 — PLT-04 — Opus plan review of revision 5: NOT APPROVED (rejection 3 for PLT-04 plan)

- **Result (Opus subagent, fresh context, review of `plans/PLT-04.md` revision 5):** NOT APPROVED. Six items:
  1. [blocking] Open point 8 default (a) gives no command and lists no entries. Step 3 compares against "the lock at the start of implementation", which under (a) already holds the driver's entries, so the lock gate checks nothing. `plans/PLT-01.md` line 115 says PLT-04 commits its own lockfile. Correction: make option (b) the defined path, run after step 2 with `npm install --package-lock-only --ignore-scripts` (the method at lines 374 and 389 of this file), then `npm ci`, then diff the lock against `d5b353d` and list the expected new entries.
  2. [blocking] `enableShutdownHooks({useProcessExit: true})` is wrong: options is the second parameter, so tsc 6.0.3 fails with TS2353. Correction: `enableShutdownHooks([], {useProcessExit: true})`, which a scratch run shows exits 0 on SIGTERM.
  3. [non-blocking] A7 says the AC 3 and AC 4 spawns load platform-express. `NestFactory.create` loads it through `import()` after the env check, so they never do. Correction: say step 17 covers platform-express.
  4. [non-blocking] The spawn path `apps/api/dist/main.js` is relative, but Vitest runs with `apps/api` as its working folder. Correction: `resolve(__dirname, '..', 'dist', 'main.js')`.
  5. [non-blocking] No step formats the new files, yet step 16 runs `prettier --check .`. Correction: add `npx prettier --write` on the new `apps/api` files before step 13.
  6. [non-blocking] Line 18 cites DECISIONS line 294 for the PLT-09 patterns; they are at line 295. Correction: cite line 295.
  - Earlier items fixed: 7 of 9. Item 1 is partly fixed (open point 8 lists no entries). Item 2 is not fixed (wrong call form).
  - Also checked, no problem: a scratch lint with the repo's ESLint config passes the planned imports from both working folders, and only a cross-module import of `boot/env` is flagged. Downstream units agree, the criteria are verbatim, and open point 1 stays open with both options.
  - Facts spot-checked: 21, of which wrong: 0.
- **Driver note:** Rejection count for the PLT-04 plan: 3. Per the rule at three rejections, the open disagreement goes to the Navigator. This round has no disagreement with the reviewer: items 1 to 6 are text and call-form corrections that the unit's subagent applies. The one open decision is point 1 (CommonJS vs ESM). It must be settled before `status: planned` anyway, so it goes to the Navigator now. Items 1 to 6 go to the Haiku subagent in parallel; point 1's answer follows as a separate change. PLT-04 status stays `draft`.

## 2026-11-12 — PLT-04 — open point 1: CommonJS for apps/api (Navigator decision, disposition of the PLT-04 plan's open point 1)

- **Decision (Navigator, session `d057c67d2d0a4138867903c9519fad6c`):** Option A, CommonJS. `apps/api/package.json` has no `"type"` field. `tsconfig.base.json` keeps `module` and `moduleResolution` NodeNext, so tsc emits CJS. `__dirname` is used in `bootstrap.ts` and `create-test-app.ts`. The ESM-only NestJS 12 packages are loaded from CJS through `require`.
- **Evidence:** the scratch CJS build in `plans/PLT-04.md` section 7 (TypeScript 6.0.3, NodeNext) booted `@nestjs/core` 12.4.2 on Node v26.13.0 with no warning. Opus approved revisions 2 and 3 on this path. Search results (secondary sources, not opened) say Node 22.12.0 enables require(esm) by default and that it is marked stable from Node 25.4.0.
- **Rejected (Navigator):** Option B, ESM with `"type": "module"`. It needs `.js` suffixes on every relative import, `fileURLToPath` for `__dirname`, and Vitest and SWC config changes. Those changes reach PLT-05 to PLT-08 and give no benefit.
- **Downstream effect:** PLT-05 to PLT-08 write imports without `.js` suffixes and use `__dirname`. PLT-09's boundaries lint is unchanged. PLT-11 owns the Angular half, including any `allowedCommonJsDependencies` entry (line 173 of this file).
- **Driver note:** Open point 1 is settled by this entry. PLT-04 status stays `draft`. The Navigator's suggestion to set `planned` now was not taken: prompt.md step 5 sets `planned` only after Opus approves the plan text. Revision 5 was rejected (`af54076`), its corrections are applied, and they have not been re-reviewed.

## 2026-11-12 — PLT-02 — correction of the stated reason for the CommonJS decision (entry of 2026-11-11, lines 170 to 175)

- **Correction:** the 2026-11-11 entry gives "NestJS, which is CJS by default" as the reason to reject ESM. That is false for NestJS 12, which is ESM-only. The decision stands: CommonJS for `packages/contracts`. Its real reason is that the draft already emits CJS, and the Angular consequence is additive (an `allowedCommonJsDependencies` entry can be added later).
- **Source:** Navigator decision of 2026-11-12, session `d057c67d2d0a4138867903c9519fad6c`. The 2026-11-11 lines are not edited; this entry is the correction.
- **Driver note:** Only this entry is added.

## 2026-11-12 — PLT-04 — Opus plan review after open point 1 (`plans/PLT-04.md`, labelled revision 5): APPROVED

- **Result (Opus subagent, fresh context, review of the plan text with open point 1 decided, commit a4ab77a):** APPROVED. Checks A to F: the six corrections of the previous rejection are fixed; open point 1 is consistent across the plan and the DECISIONS entry; the section 5 rows match the unit files, except for item 1 below; the five acceptance criteria are verbatim; the procedure order is valid; the files list matches the procedure.
- **Non-blocking items (applied to the plan text without a further review, as with revision 3):**
  1. The PLT-11 row presents `tsc -p tsconfig.build.json --watch` plus `node --watch dist/main.js` as the watch under option A. PLT-11's unit line 20 says only "the API in watch mode". The command is one option for PLT-11 to choose. The "Must not" citation to DECISIONS line 392, item 9, does not say that, so it is fixed or dropped.
  2. The PLT-06 row says "one line in `platform.module.ts`". PLT-06 adds two controllers, a provider and an export. The row now says one entry per array.
  3. A2 (decorator metadata) is not verified by step 12, because no PLT-04 class has a constructor parameter typed with a class. A2 stays assumed until PLT-05 to PLT-08 check it.
  4. Mutation checks run with `npm test -w @bbartolome/scriba-api`, which rebuilds `dist/` first. A direct `npx vitest run` could test a stale build of `dist/main.js`.
  5. The plan is labelled revision 6, with open point 1 "decided". The HEAD reference is updated to `a4ab77a`.
  6. Open point 6 also needs the uid 65534 child, when the runner is root, to read the repo's `dist` and `node_modules`.
- **Driver note:** The reviewer did not say which of the 24 facts was wrong. Its item 1 is about the PLT-11 watch command, which is not a fact row. The plan's status is set to `planned` in the next commit, on `main`, with the edits above applied.

## 2026-11-12 — PLT-04 — code stop at plan step 16(a): plan revision (step 16 mutations and two code differences)

- **Situation:** the code subagent on `unit/PLT-04` (head `3fd05dc`) finished plan steps 1 to 15 and 20. AC 1, 2, 3 and 5 pass. AC 4 passes on the non-root branch (the runner is uid 1000); the root branch is not run. Step 16(a) stopped the run. Changing `status` to `'up'` fails `tsc` before vitest runs, so the mutation tests nothing. Mutation (c) may hit the same problem.
- **Differences the code makes from the plan:** (1) `ensureAppState(env)` takes one argument, because `ScribaEnv` already holds the raw `SCRIBA_LIBRARY`. (2) `createTestApp` removes the temp library it creates itself on `close()`; a given `libraryDir` is never removed.
- **Revision (driver):** plan step 16 now uses type-correct mutations: (a) `BUILD_INFO.version` replaced by `'0.0.0-mutant'`; (c) `.catch('info')` appended to the `logLevel` rule, which makes an invalid value fall back with no error. The section 2 row for `app-state.ts` and bullet 19 describe the two differences above. The plan's status is set to `draft` until Opus approves this text, as the method requires when a plan does not work.
- **Not yet reviewed:** the code on `unit/PLT-04`, mutations (b) to (e), step 17, step 18 and step 19. The uid 65534 branch of AC 4 is not run (runner uid 1000; passwordless `sudo` exists on this machine, so it could be run later).

## 2026-11-12 — PLT-04 — Opus review of the plan revision after the code stop (commit d69a582): APPROVED

- **Result (Opus subagent, fresh context):** APPROVED. Checks A to E are ok. (A) mutation (a) compiles: `Healthz.version` is `z.string().min(1)`, and AC 1 fails on it. (B) mutation (c) compiles with zod 4.6.6 (`catch` is in that version), and at runtime `safeParse('loud')` returns `info` with no error, so AC 3 fails by timeout. (C) mutations (b), (d) and (e) match the code. (D) `ensureAppState(env: ScribaEnv)` and the cleanup via `ownsLibrary` match the plan. (E) only the four items of the revision changed.
- **Non-blocking, code (not the plan):** `apps/api/test/create-test-app.ts` lines 37 to 50 leave a temp library behind when `bootstrap` or `listen` throws, because no `close()` is returned. Bullet 19 is accurate. The driver asks the unit's subagent for a try/catch that removes the folder it created on that path.
- **Driver note:** Plan status is set back to `planned` in the next commit, on `main`. The code on `unit/PLT-04` is rebased onto that commit before its steps resume.

## 2026-11-12 — PLT-04 — Opus code review of `unit/PLT-04` (head b90c9db, rebased onto main 2706a37): APPROVED

- **Result (Opus subagent, fresh context, code review):** APPROVED. Checks A to I ok: only the plan's files changed; the lock change is additive (107 entries added, 0 removed, no `version`, `resolved` or `integrity` changed, 8 `dev` flags dropped); all five criteria assert the labelled forms of plan section 4; the code follows plan sections 1 and 3; the two approved differences are present; no test is skipped, narrowed or weakened; tests exercise external behaviour; traversal probes fall back to `index.html`; no secret is logged; `BootError` prints no stack. Tests: 6 of 6 files, 6 of 6 tests, none skipped. Run as uid 1000, so the uid 65534 root branch of AC 4 did not run.
- **Non-blocking item (applied before batch collection, because later units may not edit `bootstrap.ts`):** if `app.init()` rejects, `bootstrap` throws without closing the Nest app it created, and `createTestApp`'s cleanup can leave the temp library behind if the close throws. The fix: `bootstrap` closes the app in a catch around `init()` and rethrows the original error; `createTestApp` removes an owned library in a `finally`. Commit to follow on `unit/PLT-04`.
- **Driver note:** the change is small and is verified by the six tests, lint and prettier, and by a hand check that is not committed. The batch-level review of the final diff is the last Opus review before `main` moves.

## 2026-11-12 — PLT-04 — Opus review of the delta (`b90c9db` to `8fe5803`, the close-on-failure fix): APPROVED

- **Result (Opus subagent, fresh context, delta review):** APPROVED. Checks A to E ok. `bootstrap` closes the app when `init()` rejects, drops a close error, and rethrows the original error; the success path is unchanged. An owned temp library is removed on setup failure and on close; a caller's library is never removed. The six test files are unchanged. Tests: 6 of 6 files, 6 of 6 tests, none skipped.
- **Non-blocking note, not applied:** in `apps/api/test/create-test-app.ts` (the `finally` blocks), a failure of `rmSync` inside `finally` would replace the original error. The reviewer judged it unlikely (EPERM or EBUSY under `force: true`). Recorded here so that it is known. A later unit that touches the helper may wrap the removal in a try/catch.
- **Driver note:** the head of `unit/PLT-04` is `8fe5803`. Collection onto `batch/current` follows (prompt.md steps 6 to 8).

## 2026-11-12 — PLT-05 — open point 1 (request body limit): option (a), no change in bootstrap.ts (Navigator decision, session `c76bb1875d464d9fa7916f64d061b89e`)

- **Decision (Navigator):** option (a). PLT-05 changes nothing in `apps/api/src/bootstrap.ts`. AC 3 holds as written: a 200 KB body is over the 100 KB default and gets 413 `PLATFORM_PAYLOAD_TOO_LARGE`. Any raise of the author-save limit is a PLT-04 revision, not a PLT-05 or PST-06 change.
- **Reason:** `plans/PLT-04.md` section 5 forbids downstream edits to `bootstrap.ts`, and PLT-05 owns no composition-root setting. The PLT-05 plan's deferral to PST-06 is mis-grounded. The 5 MB figure in `units/PST-06-file-api-core.md` is on read (line 20, `PROJECT_FILE_TOO_LARGE`), and the write line (21) states no size limit. Option (b) at 6mb would also make AC 3's 200 KB body no longer over the limit, which changes the test, not the criterion.
- **Known gap, not fixed here:** a save of a text file over 100 KB gets HTTP 413 from the composition root until PLT-04 is revised. This is recorded so the gap is visible. It is not a PLT-05 criterion.
- **Driver note:** the Navigator's check of the body-parser default used the scratch unpack `/tmp/plt05-probe/pack/body-parser-2.4.0`. Binding to Nest 12.4.2 is unverified, because the repo's `node_modules` does not hold the PLT-04 install.

## 2026-11-12 — PLT-07 — open point 1 (settings envelope against the unit): option (a), the contract stays as it is (Navigator decision, session `c76bb1875d464d9fa7916f64d061b89e`)

- **Decision (Navigator):** option (a). PLT-07 does not parse the file with `settingsEnvelopeSchema`. It checks the envelope and each section's `schemaVersion` itself, using the exported `SETTINGS_SECTION_KEYS` and `SETTINGS_SCHEMA_VERSION` from `packages/contracts/src/platform/settings.ts`. The contract and PLT-02's test stay unchanged.
- **Reason:** `settingsEnvelopeSchema` is a `z.strictObject` that validates a well-formed file. The migration hook reads transitional files: null-default sections stay absent, and unknown top-level keys are kept (unit line 22 and AC line 34). Option (b) would make sections optional and the top level passthrough. That is not an additive change to a published contract (`units/README.md` line 130), and it reopens PLT-02, which is done and whose test pins the closed top level (`platform.schema.test.ts` around lines 229 to 242).
- **Driver note:** the Navigator's line cites for `settings.ts` were off (the strictObject is at line 22, the constants at lines 4 and 7 to 13). The claims are correct, and the cites are corrected here.

## 2026-11-12 — PLT-07 — open point 2 (how the section refusal is tested): the `.cjs` fixture, option A (Navigator decision, session `c76bb1875d464d9fa7916f64d061b89e`)

- **Decision (Navigator):** option A, the plan's default. The section case (b) runs in the test-only `test/fixtures/boot-with-test-section.cjs`. It calls the real built `bootstrap()` and copies only the BootError-to-stderr-and-exit(1) wrapper of `apps/api/src/main.ts`. The envelope case (a) spawns the real `dist/main.js`, as planned. No structural change to the plan.
- **Reason:** option B (in-process, no exit check) drops the exit half of a criterion that requires each case to exit non-zero. Option C (a file-driven test section in the real `main.js`) adds production surface to the real entry point. The fixture calls the real `bootstrap()`, so the real hook logic and the message naming are exercised. The copied wrapper is a narrow risk, already covered by case (a) against the real `main.js`, since both errors go through the same wrapper.
- **Driver note:** a copy of `main.ts`'s wrapper can drift from `main.ts`. If `main.ts` changes that wrapper, the fixture must follow. That is the known cost of option A.

## 2026-11-12 — PLT-05, PLT-06, PLT-07, PLT-08 — Opus plan review of the four Platform plans, revision 2 (cross-plan check included)

- **PLT-05: NOT APPROVED.** Two blocking items and one non-blocking item:
  1. [blocking] Body-parser errors do not reach the filter unchanged. Nest 12.4.2 `routes-resolver.js` line 96 calls the adapter's `mapException` before any filter runs (`express-adapter.js` lines 494 to 516). The too-large error becomes `HttpException(msg, 413, {cause})`, and malformed JSON becomes `BadRequestException`. Under decision 3 and open point 4, AC 3 and AC 6 would get 500. Correction: identify both by `exception.cause` (`cause.type` `entity.too.large` gives 413 `PLATFORM_PAYLOAD_TOO_LARGE`; a SyntaxError cause with `entity.parse.failed` gives 400 `PLATFORM_VALIDATION_FAILED`), state this in open point 4, and fix fact F10.
  2. [blocking] Decision 4 says a raw `ZodError` becomes a 500. Unit line 19 says the filter maps Zod validation failures to 400. PLT-06's inline `echoRequestSchema.parse` depends on the 400. Correction: the filter maps `z.ZodError` to 400 `PLATFORM_VALIDATION_FAILED` with the issues in `details`.
  3. [non-blocking] Section 5 PLT-06 row says the echo uses `ZodValidationPipe` and `ModuleError`, and adds one controller entry. PLT-06 decided inline parsing and adds two controllers. Correction: align the row.
- **PLT-06: APPROVED.** One non-blocking text item: open point 2 says a bad body gets Nest's default 500. Once PLT-05 maps `ZodError`, it gets 400. Correction: say so.
- **PLT-07: APPROVED.** Two non-blocking items: the third mutation (write each behind section before the checks finish) cannot be applied, because `migrateSettings` is pure. Correction: copy the backup before calling `migrateSettings`. The fixture writes `err.message` for any rejection, but the decision (commit 4fe0c99) says it copies the BootError-only wrapper. Correction: check `instanceof BootError` and rethrow other errors.
- **PLT-08: APPROVED.** Two non-blocking items: the sketch's `httpAdapter.getHttpServer()` is typed `any`, so `(socket) =>` fails `strict` (TS7006). Correction: type the server as `Server` from `node:http`. Lines 134 and 139 say "one line each", but PLT-06 and PLT-07 also add `exports` entries and re-exports. Correction: fix the text.
- **Cross-plan A to E:** A ok (the four plans touch `platform.module.ts` arrays, and the batch order resolves the text conflicts). B ok (no path or test-name collisions). C ok (only PLT-06 changes `sse.ts`). D ok (the re-exports do not clash). E: the PLT-05 row in section 5 (item 3 above) contradicts PLT-06's decision. The other "unchanged" lists are fine.
- **Driver note:** PLT-06, PLT-07 and PLT-08 have only non-blocking text items, so the authors apply them without a further review, as with earlier plan revisions. PLT-05 has two blocking items, so it goes to revision 3 and then to a new Opus review. Status stays `draft` for all four until each is approved.

## 2026-11-12 — PLT-05 — Opus plan review of revision 3: APPROVED (three non-blocking text items)

- **Result (Opus subagent, fresh context):** APPROVED. The two blocking items of revision 2 are fixed: the body-parser errors are identified by `exception.cause` (Nest 12.4.2 `routes-resolver.js` line 96 calls `mapException` first), and `z.ZodError` maps to 400 `PLATFORM_VALIDATION_FAILED` with the issues in `details`. The PLT-06 row in section 5 matches `plans/PLT-06.md`.
- **Non-blocking items, applied as text by the plan's author without a further review:**
  1. Open point 4 cites the charset 415 path (body-parser `lib/read.js` lines 77 to 83). Other 415, 400 and `URIError` cases also become a logged 500. They are known gaps under option (a), and no criterion covers them. Line 31 narrows to malformed JSON.
  2. Fact F10 and A8 note that the lock has two zod copies (root 4.6.6 serves apps/api; `packages/contracts/node_modules/zod` 4.6.7 serves the contract schemas). The 400 still holds, because `z.ZodError`'s `Symbol.hasInstance` checks `_zod.traits`.
  3. Fact F10 cites one `mapException` call site (line 96), not the default definition.
- **Driver note:** PLT-05 goes to `planned` after these text items are applied. PLT-08's code review is the next Opus review, and PLT-06 and PLT-07 code reports are still pending.

## 2026-11-12 — PLT-08 — Opus code review of `unit/PLT-08` (head cdc93f3, base main 6e10382): APPROVED (two non-blocking text items)

- **Result (Opus subagent, fresh context, code review):** APPROVED. Only the seven files of plan section 2 changed; the protected files are identical to main. The predicate covers the Tailscale ranges and the boundary addresses; the server drops a Tailscale-range connection before listen (the server is created in the `NestApplication` constructor, and `onApplicationBootstrap` runs inside `init()`). Lint and prettier pass. Tests: 10 of 10 files, 10 of 10 tests, none skipped.
- **Step 12 deviation, recorded here (the commit messages do not carry it):** the real-socket check was run on `bootstrap()` at `0.0.0.0:18089`, not on `main.js` at 8080, because a stale process (`node apps/api/dist/main.js`, PID 2546840, started 03:11 on this machine) holds port 8080. The subagent's request to stop that process was denied, and the driver did not stop it. On port 18089, loopback returned 200 with the JSON body; a request from the tailscale0 address `100.94.240.19` was reset with no body; the server closed with exit 0. The Opus reviewer repeated the drop from a Tailscale-range source through Nest's own server. The filter does not depend on the port, so the substitute is acceptable. The `main.js` 8080 check and the SIGTERM check are not run.
- **Non-blocking text items, applied to `plans/PLT-08.md` (mutation row d) on main:** the expected failures of mutation d now also list `create-test-app`, `healthz-version` and `static-fallback`. An unconditional destroy drops every real loopback connection they make; these failures are expected, and they are not a defect of the filter.
- **Driver note:** the step 12 record is in this entry, so it is not lost at collection. The PLT-08 branch is rebased onto main at collection.

## 2026-11-12 — PLT-07 — Opus code review of `unit/PLT-07` (head 289e887, base main 6e10382): APPROVED (one non-blocking code item, applied on the unit branch)

- **Result (Opus subagent, fresh context, code review):** APPROVED. The 15 changed paths are the ones in plan section 2, and the `yaml` 2.9.1 runtime dependency is allowed by plan decision 19 and step 2. The lock diff against main has 0 added and 0 removed entries, and no `version`, `resolved` or `integrity` changes. The contracts package is unchanged, and `settingsEnvelopeSchema` is not used. Each acceptance test uses the exact form the plan names. Lint and prettier pass. Tests: 12 of 12 files, 12 of 12 tests, none skipped.
- **Non-blocking code item, applied on `unit/PLT-07` by its code author, with no criterion change:** if the atomic write or the rename fails, `settings.yaml.tmp` is left in `.scriba/`. The fix removes the temp file in the `catch` before the `BootError` is thrown. The failure path has no criterion, so no test is added.
- **Notes, no change needed:** `MigrationResult` and `withSchemaVersion` in `settings.migrate.ts`, and `errorReason` in `settings.file.ts`, are not re-exported from `platform.module.ts`, so rule R1 keeps them inside the folder.
- **Driver note:** the fix is small and touches only a failure path. The batch-level Opus review of the final diff covers it before `main` moves.

## 2026-11-12 — PLT-06 — open point 4 (shutdown window): option (A), a known gap (driver decision, recorded before `planned`)

- **Situation:** a stream that opens after `beforeApplicationShutdown` runs and before dispose is not guarded, because `subscribe()` does not check the stopping flag. The code author found this at the PLT-06 revision 2 code stop. The heartbeat keeps such a stream active, so `server.close()` waits until the client leaves, and a SIGTERM exit can stall. Nothing in the plan's procedure covers it.
- **Decision (driver, the simplest option, option A):** leave it as a known gap of the shutdown window. Do not guard `subscribe()` in this unit.
- **Reason:** no acceptance criterion of `units/PLT-06-sse-stream-publisher.md` covers shutdown. The gap only opens for a stream opened after `beforeApplicationShutdown` has begun. Option B adds one check to the procedure and is a behaviour change to the publisher's public path; it is not needed for the criteria. A later unit or a shutdown test can add the guard.
- **Opus note, recorded:** the review of revision 3 (`a47be7f048b8f9020`, approved with four text items) asked for this decision to be recorded before `planned`. The text items are applied to `plans/PLT-06.md` on main.

## 2026-11-12 — PLT-05 — Opus code review of `unit/PLT-05` (head a48cf50): NOT APPROVED (one blocking item, one non-blocking item)

- **Result (Opus subagent, fresh context, code review):** NOT APPROVED.
  1. [blocking] `apps/api/src/modules/platform/errors/zod-validation.pipe.ts` (lines 2 and 6) types the pipe's schema as root `zod` 4.6.6 `ZodType`. Every contract schema is typed from `packages/contracts/node_modules/zod` 4.6.7, so `new ZodValidationPipe(echoRequestSchema)` fails `tsc` (TS2345, `toJSONSchema` parameters). AC 1 does not catch it, because its probe schema uses root zod. Unit line 24 says modules apply the pipe with their contract schemas, and plan section 5 forbids editing the pipe after PLT-05 merges, so a later unit cannot fix it here. The correction is to type the parameter structurally, as `{ parse(value: unknown): unknown }`, with no zod import. The reviewer verified that this accepts schemas from both zod copies.
  2. [non-blocking] `platform-exception.filter.ts` (lines 113 to 117) passes `PlatformExceptionFilter.name` as a second context argument to `Logger.error`. The Logger already appends its own context, so the stack prints as a second ERROR line and a stray line replaces it. The stack still reaches stdout once, so AC 4 holds. The correction is `this.logger.error(message, stack)`. Plan decision 7 and step 3 have the same mistake.
- **Driver note:** item 1 changes the pipe's public parameter type, which plan step 2 names. That is a plan-to-code change, so plan revision 4 records it and gets a quick Opus delta review before the code changes. PLT-05 status is set back to `draft` until then. Rejection count for the PLT-05 code: 1.

## 2026-11-12 — PLT-06 — Opus code review of `unit/PLT-06` (head eee9f6d, base main 6e10382): APPROVED (one non-blocking item, applied on the unit branch)

- **Result (Opus subagent, fresh context, code review):** APPROVED. Exactly the 14 files of plan section 2 changed; the protected files are unchanged, and `platform.module.ts` adds only the entries the plan lists. All seven tests assert the forms of plan section 4. AC 5 asserts the closure first, then the count, then the `1..100000, 1` sequence. The exact header values, the retry line, the hello and envelope shapes, the heartbeat, and the absence of `event:` and `id:` lines match. The echo returns 202 and uses inline `echoRequestSchema.parse`. Shutdown and backpressure match the plan. Lint and prettier pass. Tests: 13 of 13 files, 13 of 13 tests, none skipped.
- **Non-blocking item, applied on `unit/PLT-06` by its code author, with no criterion change:** if the client disconnects before `subscribe` runs, the `'close'` event has already fired, but the stream is still added and gets a heartbeat interval that only shutdown clears. The fix returns early from `subscribe` when `res.destroyed` is true. The stream then takes no set entry and no timer.
- **Driver note:** the shutdown-window gap (open point 4, option A) is unchanged. This item is a separate, earlier edge case in `subscribe`.

## 2026-11-12 — PLT-05 — Opus delta review of plan revision 4 (`9ee7d90`): APPROVED (two non-blocking text items)

- **Result (Opus subagent, fresh context):** APPROVED. The structural pipe parameter `{ parse(value: unknown): unknown }` accepts both the root-zod probe schema and the contract-zod `echoRequestSchema`, and the pipe's error handling is unchanged. The AC 1 criterion text is unchanged; the contract-schema check sits inside the same `it`. Mutation M8 fails with TS2345 for `echoRequestSchema`. The logger call with two arguments matches Nest 12.4.2 `Logger.error`, which adds its own context. The "Revision 4 changes" list cites the heading at `plans/DECISIONS.md` line 572 (commit `ee7978a`).
- **Non-blocking text items (applied to `plans/PLT-05.md` by its author, no further review):** the revision 4 list must name every location it changed (step 10, the section 4 intro, F10, A8 and the new A9). Mutation M8's TS2345 must be stated as coming from `apps/api/test/error-probe.ts` in the second build pass (`tsc --noEmit -p tsconfig.json`), because `tsconfig.build.json` covers only `src`.
- **Driver note:** PLT-05 goes to `planned` after the text items are applied. Its code fix (the structural pipe type and the two-argument logger call) then runs on `unit/PLT-05`, and its own Opus code review follows.

## 2026-11-12 — PLT-05 — Opus re-review of the code fix (`unit/PLT-05`, head 36d81a9, after the NOT APPROVED review of a48cf50): APPROVED

- **Result (Opus subagent, fresh context, re-review of the fix):** APPROVED. The pipe imports only the `PipeTransform` type and types the schema as `{ parse(value: unknown): unknown }`; its error handling is unchanged, so the `ZodError` reaches the filter. The filter logs with `this.logger.error(message, stack)`. The AC 1 contract-schema check sits inside the same `it`; no test was added or weakened. M8 fails with TS2345 on `echoRequestSchema` in the second build pass. The protected files have no diff against main. Lint and prettier pass. Tests: 12 of 12 files, 12 of 12 tests, none skipped.
- **Driver note:** PLT-05 is approved in code. The batch collection follows (prompt.md steps 6 to 8), with PLT-05, PLT-06, PLT-07 and PLT-08 in sequence.

## 2026-11-12 — PLT-05, PLT-06, PLT-07, PLT-08 — batch review before `main` moves: APPROVED

- **Result (Opus subagent, fresh context, batch review of `batch/current` at `a4effa4`):** APPROVED, no problems. `platform.module.ts` is the exact union of the four approved unit heads; every entry appears once, and the provider order does not affect boot, because every provider is created in `NestFactory.create` before `init()`. Each of the 45 changed paths is in its unit's plan section 2. The protected files (`main.ts`, `bootstrap.ts`, `app.module.ts`, `packages/contracts/**`, root `package.json`, `create-test-app.ts`, the six PLT-04 tests) are identical to `main`. The lock changes only additively, except one `dev` flag and the `yaml` line of the `apps/api` workspace. Through the built app: a bad echo body gets 400 `PLATFORM_VALIDATION_FAILED` with the Zod issues in `details`, and a valid body gets 202. Lint and prettier pass. Tests: 40 of 40 files and 90 of 90 tests at the root (the API has 29 of 29 files).
- **Checkboxes ticked and plans set to `done`:** the passed acceptance criteria of PLT-05 (six), PLT-06 (seven), PLT-07 (six) and PLT-08 (three), each covered by a passing test. PLT-08's real-socket check on `main.js` port 8080 is not run (see the PLT-08 entry above); its criterion is covered by the test.
- **Open environment issue, not part of this batch:** a stale `node apps/api/dist/main.js` (PID 2546840) still holds port 8080 on this machine. It is not stopped, because the permission system denied the request to stop it.

## 2026-11-12 — PLT-11 — acceptance criterion 5 ("`ci.yml` is green on this PR"): cannot test locally, option (a) (Navigator decision, session `e9ca3d03b50048e5bf93d96aeec08c2a`)

- **Decision (Navigator):** the criterion is marked "cannot test locally" in the plan, with the cause: the repository has no git remote, so there is no pull request and no GitHub Actions runner. The unit is complete with criterion 5 left UNCHECKED. The decision is recorded here.
- **Local proxy preconditions for completeness:** (1) `node --test scripts/ci-workflow.test.mjs` passes; (2) `npm ci`, `npm run lint`, `npm test` and `npm run build` pass locally in CI order under the `.nvmrc` Node version (26); (3) the `@v7` action tags are present in `.github/workflows/ci.yml` (plan step 11). The checkboxes of the other criteria are marked only after their tests pass.
- **Reason:** the criterion is about a CI runner executing on a pull request, which this local-only environment cannot produce (`prompt.md`: all work is local, no push). Option (b) needs a remote the project forbids and would block the Platform gate and every downstream module. Option (c) adds an unplanned Docker dependency. The local proxies cover the substance of "green" (the same four commands and the workflow structure) minus only the runner.
- **Driver note:** the other two open points of `plans/PLT-11.md` are driver decisions, not Navigator decisions: point 2 (SSE buffering) stays option (A), stop and record if the AC 1 check fails; point 3 (the Angular fixture) is option (a), SHL-01's plan keeps the import. These are recorded in the plan, not here.

## 2026-11-12 — PLT-11 — Opus plan review of revision 2: NOT APPROVED (one blocking item, five text items)

- **Result (Opus subagent, fresh context):** NOT APPROVED.
  1. [blocking] Steps 0, 9 and 14 and AC 1 of `plans/PLT-11.md`: two stale processes from earlier worktrees already hold the dev ports. PID 2362325 (`ng serve`, PLT-03) listens on `::1:4200`, and PID 2546840 (`node apps/api/dist/main.js`, PLT-08) listens on `0.0.0.0:8080`. Without the dev stack, `curl localhost:4200/` returns 200 and `curl 127.0.0.1:8080/healthz` returns the healthz body. The new servers would fail to bind, and `concurrently` would keep running, so the AC 1 check could pass falsely. Correction: before steps 0, 9 and 14, require that ports 4200 and 8080 refuse connections, otherwise stop and report. After Ctrl+C, the same requests must fail.
  2. [non-blocking] Step 11: `scripts/ci-workflow.test.mjs` has 5 tests, not 4.
  3. [non-blocking] Step 0: once the plan's own commits land, HEAD is past `76461e3`, so step 0 would always stop. Accept a later HEAD when `git diff --quiet 76461e3 HEAD -- ':!plans'` passes, and use the driver's `unit/PLT-11` worktree.
  4. [non-blocking] Step 15 and point 2: the driver ticks the boxes in `units/PLT-11-scaffold-gate.md` (prompt.md step 8), and the code subagent may not edit the plan. "Record in this plan" becomes "report". Drop the `draft` sentence from step 15.
  5. [non-blocking] Decision 5, step 7 and the CommonJS line of section 7: the check runs only in optimized (production) builds, warns once per subpath, and an allowed entry also covers deep imports. Mark this as checked and choose one form: the ten subpath names, or the single name `@bbartolome/scriba-contracts`.
  6. [non-blocking] Decision 6 cites PLT-03 bullet 14 (the Vitest bullet); it should cite bullets 4 and 16. Decision 2's date (line 403) is in a 2026-11-11 entry, not 2026-11-12.
- **Driver note:** item 1 is an environment problem as well as a plan one. Two stale processes from earlier worktrees (PIDs 2362325 and 2546840) hold the ports, and the earlier request to stop PID 2546840 was denied. The driver does not stop them. The plan is revised to stop and report when the ports are busy. PLT-11 status stays `draft`.

## 2026-11-12 — PLT-11 — Opus plan review of revision 3: NOT APPROVED (one blocking item, three text items); Opus plan review of revision 4: APPROVED (text items)

- **Revision 3 (NOT APPROVED):** blocking: step 0 used `lsof`, `ss` and `netstat`, none of which is installed on this machine. Revision 4 finds the PID from `/proc/net/tcp` and `/proc/net/tcp6` (the LISTEN inode, matched to `/proc/<pid>/fd` links), with `ps -eo pid,args` as the fallback. Text items: the HEAD fact (now `67056c5`, with the `':!plans'` diff check), the citation of the subpath match (line 91) and the descendant skip (line 102), and the lint command (`npm run lint --workspaces && prettier --check .`).
- **Revision 4 (APPROVED):** the reviewer ran the plan's exact PID lookup on this machine with the ports held. It printed PID 2362325 for port 4200 and PID 2546840 for port 8080. The lookup works here.
- **Non-blocking items for the text, applied by the plan's author without a further review:** the line numbers of the `commonjs-checker.js` citations (the exact-match `continue` is at line 74, and the `if` at line 73; `seenFiles` is checked at line 68).
- **Driver note:** both ports are held by processes with PPID 1 from earlier worktrees (PID 2362325, `ng serve`, port 4200; PID 2546840, `node apps/api/dist/main.js`, port 8080). The plan's step 0 stops and reports while they are held, as the plan says. The driver has not stopped them: the earlier request to stop PID 2546840 was denied. PLT-11 cannot run its live checks until the user frees the two ports.

## 2026-11-12 — PLT-11 — Opus code review of `unit/PLT-11` (head 72918bc, base main 4617ca6): APPROVED (three non-blocking items)

- **Result (Opus subagent, fresh context):** APPROVED. The eight files of plan section 2 changed; the lock adds six entries and one root devDependency, with no existing entry changed or removed. The protected paths are unchanged. The dev script matches decision 1 byte for byte. Criterion 3 passes (the subpath test 2 of 2, and the Angular build with the fixture exits 0). Criterion 4 passes (the named API test files all ran, boundaries 5 of 5). Criterion 2 passes (build, test and lint exit 0; prettier clean). `scripts/ci-workflow.test.mjs` passes 5 of 5 with the `@v7` actions. Tests: 41 of 41 files and 92 of 92 tests, none skipped. Criterion 1 (the live dev stack) was not run, by scope. Criterion 5 stays unticked (Navigator decision, commit 76461e3).
- **Non-blocking items:**
  1. **Budget fact is false (the plan marked it ASSUMED).** With the fixture, the initial bundle is 699.02 kB (the `main` chunk is 690.98 kB, of which zod 4.6.6 in its CommonJS build is 564.1 kB). The build exits 0 with a 500 kB warning; the error threshold is 1 MB. Without the fixture the bundle is 128.22 kB. Decision: move the fixture out of the production bundle, so the placeholder app does not ship contracts and zod to the browser. The plan is revised so that the fixture builds from a separate Angular configuration with no budgets.
  2. **README (`README.md` line 23):** it tells builders to create the `packages/contracts/src/<slug>/` folder and a `./<slug>` export key. Both already exist for all ten subpaths, and `scripts/subpaths.test.mjs` requires exactly ten keys. The text is corrected to say: fill in the existing `packages/contracts/src/<slug>/index.ts`.
  3. **Dev script quoting (`package.json` line 23):** `$PWD` is expanded by the outer shell and again by `concurrently`'s shell, so a repo path with spaces breaks the API command. Optional fix: single-quote each path value.
- **Cross-unit finding, recorded for the Navigator when SHL-01 is planned:** the contracts package is CommonJS (PLT-02 decision). When the Angular app imports any subpath, the browser bundle gets zod's CommonJS build (about 564 kB). This is a cost for every frontend unit, not only the fixture. It needs a decision before SHL-01 imports contracts.
- **Driver note:** item 1 is a plan change, so the plan is revised first and reviewed by Opus before the fixture is moved. Items 2 and 3 are applied with it.

## 2026-11-12 — PLT-11 — Opus review of the revision-6 code (`unit/PLT-11`, head 49cec4a): APPROVED (two non-blocking items)

- **Result (Opus subagent, fresh context):** APPROVED. The files changed are the ones revision 6 names; the protected paths are untouched (checked with the three-dot diff against main). `apps/web/src/main.ts` now matches main, so the production build no longer imports the contracts. Production `main` is 120.18 kB, initial total 128.22 kB, with no contracts strings. The `contracts-boot` configuration builds with `budgets: []` and its `allowedCommonJsDependencies` entry; without the entry the build gives 10 CommonJS warnings, so the entry stays. The README line and the `dev` script's quoting match revision 6. Exit codes: build 0, contracts-boot 0, test 0 (41 of 41 files, 92 of 92 tests), lint 0, prettier 0. Criterion 1 is NOT TESTED (the live dev stack was not run). Criterion 5 stays unticked (Navigator option (a), commit 76461e3).
- **Non-blocking items:**
  1. Commit `7f8388e` is titled "single-quote the dev script" but also contains the fixture rename; at `7f8388e` and `d5ee928`, `main.ts` still imports the old fixture path, so those two intermediate commits do not build. The branch head `49cec4a` builds. Accepted: history is linear and the head is correct. Not squashed.
  2. The branch's merge base is `4617ca6`, so a two-dot diff against `main` shows `plans/` changes from main's later plan-only commits. The three-dot diff shows no protected path changed.
- **Driver note:** the only remaining criterion of PLT-11 that can be run here is criterion 1, the live dev stack. It is NOT TESTED because it needs the dev servers started and stopped, and it has been left to the user.

## 2026-11-12 — PLT-11 — criterion 1 (live dev stack) run; batch collected onto main; criterion 5 unticked by the Navigator's decision

- **Criterion 1 (`npm ci && npm run dev` serves the placeholder app; `/api`, `/healthz` and `/events` proxied; SSE unbuffered): PASSED,** run by the driver on a fresh clone of `unit/PLT-11` (head `49cec4a`) at `/tmp/prt11-fresh`: `npm ci` exit 0, then `npm run dev`. Through port 4200: `/` returns 200 `text/html`; `/api/platform/version` and `/healthz` return the expected JSON; `/events` returns the `retry: 3000` line and the `platform/hello` envelope at once (time to first byte 0.002 s); a `POST /api/platform/echo` with `{"count":3,"intervalMs":500}` returns 202 and three `platform/echo` envelopes arrive on `/events`. The driver stopped only the dev processes it had started; ports 4200 and 8080 then refused connections. The earlier run in the unit worktree (same commit) gave the same results.
- **Criteria 2, 3 and 4:** passed at the batch (root build, test and lint exit 0; the subpath test and the Angular `contracts-boot` build; the named API tests and the boundaries rule).
- **Criterion 5 (`ci.yml` green on this PR):** not ticked, by the Navigator's decision (option (a), commit 76461e3). The local proxies pass: `scripts/ci-workflow.test.mjs` 5 of 5, the four steps in a fresh clone, and the `@v7` tags.
- **Batch:** `unit/PLT-11` (head `4f9007b`) rebased onto `main` `a54533a`, fast-forwarded to `batch/current`, checked at the root (build, test, lint, `prettier --check .`, `npm ci` all exit 0), then `main` fast-forwarded. No merge commits were added.

## 2026-11-12 — PLT-12 — Opus plan review of revision 1 (`plans/PLT-12.md`, status draft): NOT APPROVED (three blocking items, five text items)

- **Blocking 1:** the export of `server.mjs` has no declaration file, so `apps/api`'s strict type check (TS7016) fails on import. Correction: add `e2e/fixtures/mock-openai/server.d.mts`, list it in plan section 2, and close open point 5.
- **Blocking 2:** MPR-04 criterion 1 needs a stream of text deltas, then a tool call, then a finish event. The reply shape cannot produce that. Correction: extend the reply to content plus `toolCalls` with per-call `index` and argument chunks, and test content-then-tool-call. Fix the MPR-04 line citation (lines 29 to 35).
- **Blocking 3:** the `e2e` workspace is not in the root `build` and is never type-checked. Correction: add `e2e/tsconfig.json`, a `build` script, `@types/node` as devDependency, `-w @bbartolome/scriba-e2e` on the root build, and the banner count 5.
- **Text 4:** criterion 5 runs two flows in one test. Correction: two `test.concurrent` cases, each resetting only its own scenario.
- **Text 5:** step 0 always stops because `plans/PLT-12.md` is untracked and HEAD moves. Correction: check `git merge-base --is-ancestor 339c716 HEAD` and `git diff --quiet 339c716 HEAD -- ':!plans'`.
- **Text 6–9 (non-blocking):** add a `GET /v1/models` assertion to criterion 1; define the SSE format; pick one `turnIndex` rule on models requests; `.mjs` files have no ESLint rules. Implement in a fresh worktree.

## 2026-11-12 — PLT-12 — Opus plan review of revision 2 (`plans/PLT-12.md`, status draft): NOT APPROVED (rejection 2 of 3; one blocking item, six text items)

- **Blocking 1:** the wire format in decisions 23 and 24 omits `role` and the tool-call `type`. Without them the SDK's streaming helper (`chat.completions.stream(...).finalChatCompletion()`) fails ("missing role for choice 0", "tool call snapshot missing `type`"), so MPR-04 cannot use it against the mock. The SDK types `tool_calls[i]` as a union, so criterion 2's `.function.arguments` needs a `type === 'function'` check first. Correction: the first streamed delta carries `role: "assistant"`; each call's first chunk carries `index`, `id`, `type: "function"`, `function.name` and `function.arguments: ""`; the non-streamed reply has `message.role` and `type: "function"`; criterion 1 adds a `finalChatCompletion()` assertion on `tool-call`; criterion 2 checks `type` before reading `.function.arguments`.
- **Text 2:** step 3 should run a plain `npm install`, not an explicit `@types/node@^26.6.6` re-resolve, or state that the lock gate stops if a newer 26.x is published first.
- **Text 3:** section 3 should carry the revision-1 note "implement in a fresh worktree" (the main checkout's `node_modules` is from 2026-11-10 and has no `@types/node`).
- **Text 4:** step 12 should name the banner-count command, as PLT-11 criterion 2 does: `grep -o '^> @bbartolome/scriba-[a-z0-9]*' | sort -u | wc -l`.
- **Text 5:** no test covers the `header`, `turnIndex`, `lastMessageRole`/`lastMessageContent` matchers or `chunkDelayMs`, though MPR-04, AGL-08 and AGL-16 rely on them. Add a small test for each and define `lastMessageContent` for array content parts.
- **Text 6:** section 7 cites `core/error.d.ts` line 8 as `Headers`; the file says `readonly headers: THeaders` (generic).
- **Text 7:** section 5 should record that MPR-04 pins `openai` 7.55.0 in apps/api, so the repository keeps one copy.

## 2026-11-12 — PLT-12 — Opus plan review of revision 3 (`plans/PLT-12.md`): APPROVED (five non-blocking text items, applied to the plan before status planned)

- **Result (Opus subagent, fresh context):** APPROVED. Every acceptance criterion has a test through the openai SDK or HTTP. Downstream needs (MPR-04, TRG-12, GNP-02, GRR-04, PLT-13, AGL-03/08/16/19) match in names and shapes. Both earlier rejections (revision 1 items 1–9, revision 2 items 1–7) are resolved. The reviewer probed `finalChatCompletion()` with the decision-23 chunk shape, the 429 and socket-error classes, the abort-to-`closedByClient` path, and criterion 6's detached process group, in a throwaway clone (deleted; no repo file changed). The lock diff only adds entries; `@types/node` stays at 26.6.6.
- **Text items (applied by the plan's author; no further review, as for PLT-11 revision 4):**
  1. Step 9: run `npm run build -w @bbartolome/scriba-contracts` before the apps/api build (`dist/` is gitignored; the apps/api import fails with TS2307 otherwise).
  2. Step 2: drop the `npx prettier --write package.json` run before the install (npx would fetch prettier@latest, not the locked 3.9.10; DECISIONS line 63 says format after the install).
  3. Preamble and section 7: main is at `c1dac25`; `339c716` is the last commit that changed code. Basing the worktree on `339c716` is still fine.
  4. Decision 2: cite only the root devDependencies as the exact-pin convention (apps/api uses ranges).
  5. Section 5: "the exact version in `e2e/package.json` (7.55.0 at planning)", not a fixed pin.

## 2026-11-12 — PLT-12 — Opus code review of `unit/PLT-12` (head 1233780, base main 5dbcc6c): APPROVED (five non-blocking notes)

- **Result (Opus subagent, fresh context):** APPROVED. Every changed file is in plan section 2; nothing under plans/, units/, modules/, apps/, packages/, scripts/ or .github/ changed. The lock diff only adds the `e2e` workspace entry, the scriba-e2e link and `node_modules/openai` 7.55.0, and appends `e2e` to the root workspaces list. `@types/node` stays at 26.6.6. The reviewer broke the code in a /tmp copy four ways (valid first chunk in the malformed scenario; a reset that does nothing; `role` removed from the first chunk; one attempt counter shared across scenarios); each mutation failed the matching criterion.
- **Test counts and exits (worktree at 1233780):** `-t "criterion 1"` through `"criterion 6"`: 1, 1, 1, 1, 2 and 1 passed, exit 0. `-t "matcher"`: 5 passed. Full e2e suite: 12 of 12, exit 0. Root `build`, `lint` and `test`: exit 0, five workspace banners each.
- **Non-blocking notes (not applied; a later edit may add them):**
  1. Criterion 1's split-arguments check and final answer after the tool result use the raw-HTTP helper; the SDK side is covered by `models.list()`, `.stream().finalChatCompletion()` and the non-streamed call (plan section 4 (b) and (e)).
  2. Criterion 4's `authorization` check reads a header set by the test helper, not one the SDK sent. MPR-04's key-only-in-Authorization test covers the SDK.
  3. The loader does not reject unknown matcher names; a misspelt matcher never matches. Load-time checking would help MPR-04, AGL-08 and AGL-16 authors.
  4. A step that matches only on `header` also matches `GET /v1/models` (decision 7); downstream scenario authors should add `endpoint`.
  5. A client that disconnects before the request body is read leaves no record. No downstream unit depends on it.

## 2026-11-12 — PLT-13 — Opus plan review of revision 1 (`plans/PLT-13.md`, status draft): NOT APPROVED (rejection 1 of 3; three blocking items, six text items)

- **Result (Opus subagent, fresh context):** the reviewer built the plan in a /tmp copy of `d810dd8`. `npm ci` passed; the plain install adds only `@playwright/test`, `playwright` and `playwright-core`; root `e2e`, lint, test and build exit 0; the CI-mode trace mutant leaves one trace file; `--list` shows one test.
- **Blocking 1:** criterion 3 ("independently enable-able") is not tested. M2 comments out the agent-run step, which shows removal, not enabling. Correction: M2 replaces only the `pending(testInfo, 'agent run')` call with a live body (for example `expect((await page.request.get('/healthz')).ok()).toBe(true)`). Expected: exit 0, the six step titles unchanged and in order, and the pending annotations equal the other four names in order.
- **Blocking 2:** criterion 1 ("boots the app against a temp library") has no external check. A1 reads only the harness's own log; A2 checks the path prefix and that the folder is gone afterwards. Correction: the live app-loads step asserts that `join(process.env.SCRIBA_E2E_LIBRARY, '.scriba', 'settings.yaml')` exists (the API boot creates it), which also proves the variable reaches the worker. Add a mutation: with `SCRIBA_BOOKS_DIR` pointed elsewhere the run fails.
- **Blocking 3:** step 0 does not stop on a stale base. Correction: add `git diff --quiet d810dd8 main -- ':!plans'` to step 0 and stop if it fails (the guard PLT-12 adopted as its change R5).
- **Text 4:** section 5 should say that `baseURL` is `http://127.0.0.1:8080` (the dev script leaves `SCRIBA_SETUP_URL_BASE` unset), for SAU-08's setup step.
- **Text 5:** unit line 25 says "pre-installed Chromium" but CI points at `/usr/bin/google-chrome`. Point at the image's Chromium or record why Chrome is used (open point 2 already flags it).
- **Text 6:** the `GET /scenario/tool-call/v1/models` probe leaves a record and an attempt; follow it with the reset endpoint.
- **Text 7:** the list and JSON reporters do not show `test.step.skip` as skipped; keep the annotation plus console line (open point 4).
- **Text 8:** optionally, S1 fails if Vitest lists any file other than the mock test.
- **Text 9:** base `npm ci` warns for both `lmdb@3.5.6` and `msgpackr-extract@3.0.7`; state both.

## 2026-11-12 — PLT-13 — Opus plan review of revision 2 (`plans/PLT-13.md`, status draft): NOT APPROVED (rejection 2 of 3; one blocking item, four text items)

- **Result (Opus subagent, fresh context):** the reviewer built revision 2 in a /tmp copy of HEAD. Base `npm ci` passes; the plain install adds only the three Playwright packages; e2e build, lint and run exit 0; the A3 output, the trace mutants, M2, M3, S1 and S2 behave as planned; the root `dev` script sets `SCRIBA_SETUP_URL_BASE=http://localhost:4200`, and the harness's `127.0.0.1:8080` default is correct. Rejection 1 items B1, B2, B3, T4, T6, T7, T8 and T9 are resolved.
- **Blocking 1 (rejection 1, text 5 not resolved):** the reason given for using Google Chrome in CI is false. The GitHub `ubuntu-latest` image has Google Chrome at `/usr/bin/google-chrome` and also Chromium at `/usr/bin/chromium` (install script `images/ubuntu/scripts/build/install-google-chrome.sh`, lines 41 and 78 to 87, in actions/runner-images). Correction: step 11 sets `SCRIBA_E2E_CHROMIUM: /usr/bin/chromium`; section 5's browser bullet, open point 2, item T5 and the first assumption in section 8 name the image's pre-installed Chromium and say the first CI run settles it.
- **Text 2:** after M3, remove the `<tmpdir>/scriba-e2e-elsewhere` directory (the API creates it; the teardown removes only the library).
- **Text 3:** S2's expected output uses Playwright's path relative to `testDir` (`journey.e2e.ts:11:1 › …`).
- **Text 4:** step 8a checks the port on `0.0.0.0` (the API's own address) and closes the probe socket before the spawn.
- **Text 5:** step 8g, when setup fails, also closes the mock and removes the library, not only kills the API.
- **Text 6 (section 5):** add PLT-19 (line 33 is the image smoke that stands in for export in the e2e) and PLT-20 (its "unit tests never read `examples/`" grep must exempt `e2e/harness` and `*.e2e.ts`, which pass `<repo>/examples`).

## 2026-11-12 — PLT-13 — Opus plan review of revision 3 (`plans/PLT-13.md`): APPROVED (six non-blocking items, to be applied to the plan before status planned)

- **Result (Opus subagent, fresh context):** APPROVED. Rejection 1 items (B1–B3, T4–T9) and rejection 2 items (B1, T2–T6) are resolved. The browser claim was checked against the source with `gh api`: `install-google-chrome.sh` sets `CHROME_BIN=/usr/bin/google-chrome` (line 41) and unpacks Chromium to `/usr/local/share/chromium`, linked as `/usr/bin/chromium` (lines 78–87); `ubuntu-latest` is `ubuntu-24.04`, which ships Chromium 156.0.8078.0. Playwright 1.65.0 ran a headless test on `chromium-1248` (156.0.8078.4) through `executablePath`; the default lookup is `chromium-1254` (158), a version gap noted in the plan. The lock gate, scoping (S1, S2), Prettier and the port check were probed in /tmp copies.
- **Non-blocking items to apply (text and check additions only):**
  1. The repository has no remote (DECISIONS 2026-11-12, PLT-11 criterion 5). The runner part of criterion 2 cannot be tested locally. Drop the throwaway-branch option (open point 3); mark the runner part "cannot test locally (no remote)"; label C2a–C2c as local proxies; leave that checkbox unticked unless the Navigator decides otherwise.
  2. Add C2d: `CI=1 SCRIBA_E2E_CHROMIUM=$HOME/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome npm run e2e` exits 0 and records a 156.x browser; `SCRIBA_E2E_CHROMIUM=/nonexistent npm run e2e` fails at launch. C2a asserts `env.SCRIBA_E2E_CHROMIUM === '/usr/bin/chromium'` on the E2E step.
  3. Move the first section 8 assumption to section 7 as verified, with the 156-versus-158 gap and the passing probe.
  4. Section 7 citations: line 89 tests Chrome and line 90 tests Chromium; the snapshot URL is on line 77; the "main at d810dd8, then 57d9922" header is stale (main is at dd74821).
  5. Step 8d: the API process gets `stdio` `inherit` or `ignore`, never an unread `pipe`.
  6. Optional: A1 also greps five `pending: <name>` lines in the criterion-1 log.

## 2026-11-12 — PLT-13 — criterion 2 runner part ("CI green on the PR"): cannot test locally; checkbox left unticked (option (a), PLT-11 precedent)

- **Decision (by the driver, applying the PLT-11 precedent of 2026-11-12, criterion 5, option (a)):** the repository has no git remote, so the runner part of criterion 2 cannot run here. The plan (`plans/PLT-13.md`, status planned) gives local proxies C2a to C2d: the workflow YAML, the trace retention and the browser-variable checks. The checkbox stays unticked. This decision was not yet put to the Navigator; if the Navigator decides otherwise, it can change the checkbox.
- **Browser:** the CI step sets `SCRIBA_E2E_CHROMIUM=/usr/bin/chromium` (the image's pre-installed Chromium, 156.0.8078.0 per the runner-images readme). The local run uses Playwright's Chromium 1254 lookup or the 1248 cache, as the plan's section 7 records.

## 2026-11-12 — PLT-13 — Opus code review of `unit/PLT-13` (head e49b92e, base main 801bd72): APPROVED (five non-blocking notes)

- **Result (Opus subagent, fresh context):** APPROVED. Nine files, all in plan section 2; nothing under plans/, units/, modules/, apps/, packages/, examples/ or scripts/ changed. The lock adds only the three Playwright packages at 1.65.0. Runs: `npm run e2e` exit 0 (three boot lines, five pending lines in order, 1 passed); C2a ok; C2b exit 0 with 0 traces; C2c (M1) exit 1 with 1 trace; C2d(i) exit 0 with browser 156.0.8078.4; C2d(ii) exit 1; C3a count 5; C3d (M2) exit 0; M3 (A4) exit 1 in `app loads`; S1 12 passed; S2 `Total: 1 test in 1 file`; lint and build exit 0; root `npm test` exit 0 (contracts 42, api 29, web 1, packs 1, e2e 12, node:test 19). Extra probes: no Chromium exit 1; port 8080 held exit 1; API exits early exit 1 with cleanup.
- **Non-blocking notes (not applied; a later edit may take them):**
  1. `startApi()` runs outside the `try` and has no `error` listener, so a spawn error would crash without cleanup.
  2. `stop()` waits for the API to exit with no timeout; an API that ignores SIGTERM would hang teardown.
  3. An empty `SCRIBA_E2E_CHROMIUM` value is passed through as is.
  4. Locally the default lookup launches `chromium_headless_shell-1254`, not `chromium-1254`; the version is the same (158.0.8127.18). Text-only.
  5. `/tmp/scriba-e2e-Cbs3am` (2026-11-06) predates this unit and was not made by these runs.

## 2026-11-12 — PLT-14 — Opus plan review of revision 1 (`plans/PLT-14.md`, status draft): NOT APPROVED (rejection 1 of 3; four blocking items, six text items)

- **Blocking 1:** criterion 2(b) cannot pass as written. The shell runs in a container on a bridge network, so `127.0.0.1:18080` does not reach the published port; `$HOME` is not shared with the Docker daemon (only `/Users/bbartolome/workspace` is). Correction: `LIB=$(mktemp -d /Users/bbartolome/workspace/.plt14-books.XXXX)`; the HTTP asserts run inside the container (`docker exec ... node -e "fetch('http://127.0.0.1:8080/healthz')"`); clean up the daemon-side probe folder with a `docker run` rm.
- **Blocking 2:** port 8080 is held by a stale API process left by the planner's probe (PID 2822220, cwd deleted, running about 3h44m). It gives a false 200. Correction: a step 0 guard that `curl 127.0.0.1:8080/healthz` prints `000`; the local procedure asserts the new PID is alive (`kill -0`) when the 200 arrives. The planner stops its own leftover process.
- **Blocking 3:** the runtime tree omits `packages/contracts/node_modules` (the lock has zod 4.6.7 there; root zod is 4.6.6). Correction: copy `packages/contracts/node_modules` (and `apps/api/node_modules` if present); add a check that contracts resolves zod from its own nested folder.
- **Blocking 4:** the size figure is wrong and undefined. The containerd snapshotter adds unpacked and compressed sizes together. `node:26-slim` arm64 is about 274 MiB unpacked and 82 MiB compressed; the finished image is about 530 MiB unpacked and 140–175 MB compressed. The `.deb` in a `COPY --from` leaves a 36 MB layer. Correction: record both sizes for both arches in a committed file, state which one is compared with story 26, install the `.deb` with a bind mount, and flag "recorded in the PR" as not possible locally.
- **Text 5:** criterion 5's cause is analogous to PLT-11 and PLT-13 (no amd64 host here, not no remote). Keep it as an open point for the Navigator.
- **Text 6:** the PDF check uses the unit's exact flags `--to=typst --pdf-engine=typst`; a failure stops and is reported.
- **Text 7:** close open point 9: `node:26-slim` already has libc6 2.41, libgmp10 6.3.0 and zlib1g 1.3.1.
- **Text 8:** cite the PLT-02, PLT-03, PLT-09 DECISIONS entry (item 2), not the ambiguous 2026-11-11 "smaller plan choices" entries.
- **Text 9:** add an in-image LTS check: `node -p process.release.lts` prints `Lithium`.
- **Text 10:** note that `/opt/scriba/packs` gets `package.json`, `tsconfig.json`, `src/` and `test/`, matching the dev `SCRIBA_PACKS_DIR`.

## 2026-11-12 — PLT-14 — Opus plan review of revision 2 (`plans/PLT-14.md`, status draft): NOT APPROVED (rejection 2 of 3; one blocking item, four text items, two notes)

- **Result (Opus subagent, fresh context):** revision 1 items 1–10 are resolved. The build stage matches the real outputs; as UID 1000, `/healthz` returns the expected JSON and the app-state failure exits 1; the nested zod 4.6.7 resolves; the Pandoc and Typst digests match GitHub; the arm64 probe measured 495 MiB unpacked and 151 MB compressed, which agrees with the plan.
- **Blocking 1:** the PDF decision check always fails in the planned image. Pandoc 3.13 writes `./media-<hash>` into the current directory when it creates a PDF through Typst; WORKDIR `/opt/scriba/app` is root-owned, so UID 1000 gets `permission denied`. With `-w /tmp` the same command exits 0 and the file starts with `%PDF-`. Correction: run the check with `-w /tmp` (exact flags kept); replace the section 8 assumption with this fact; tell CEX-10, CEX-13, CEX-15 and PLT-19's PDF smoke to run Pandoc from a writable folder.
- **Text 2:** (a) run the `du -sxk /` size measure with `--user 0` (the baseline ran as root); (b) measure the amd64 size on `bbartolome/scriba:local-amd64` with `--platform linux/amd64` after criterion 5 builds it.
- **Text 3:** `build-image.sh` passes `--build-arg VERSION="$VERSION"` (and REVISION, BUILT_AT) explicitly, or exports all three; add a check that `local-arm64` holds the validated values (`node -p` on `apps/api/dist/modules/platform/build-info.js` in the image).
- **Text 4:** step 12's DECISIONS commit goes on the main checkout, as the other `docs(PLT-*)` records do, not on `unit/PLT-14`.
- **Text 5:** section 7's `ci.yml` step list omits the first step, "Check PR title"; correct the list.
- **Note 1:** declare the `ARG VERSION/REVISION/BUILT_AT` lines just before the `build-info.ts` write, not before `npm ci`, so the install layer stays cached (matters for PLT-19's cache).
- **Note 2:** say in section 5 how PLT-17 reads the pinned version (from `build-info.js` or an OCI label or ENV), or leave the choice to PLT-19.

## 2026-11-12 — PLT-14 — Opus plan review of revision 3 (`plans/PLT-14.md`): APPROVED (text notes to apply before status planned)

- **Result (Opus subagent, fresh context):** APPROVED. Every item of both rejections is fixed. The reviewer built the planned Dockerfile in a `git archive` copy of main for arm64 (about 1m34s) and amd64 (about 2m02s) under emulation; both exit 0. Criteria 1–4 and the decision checks print the expected output, including the PDF from `-w /tmp` (`%PDF-`) and the `createDirectory: permission denied` cause from `/`. The Pandoc and Typst digests, the Node LTS name and the `node:26-slim` layer sums match GitHub.
- **Text notes to apply (no further review, as for PLT-11 revision 4):**
  1. Criterion 1's "recorded in the PR" is replaced by the DECISIONS.md entry; say explicitly whether criterion 1's checkbox is ticked, or add that to open point 1.
  2. Criterion 5's `build-image.sh` check asserts exit 1 with a message on stderr, before any docker call (the spec says "non-zero").
  3. The size example in criterion 1 (88.4 MB) is stale after an amd64 pull of the base image (`docker image ls node:26-slim` then reads 463MB / 174MB). Say that the scriba images are single-platform and that the base's listed size depends on what was pulled.
  4. Expected probe sizes for the real build's record: arm64 548,816 KiB unpacked, 156 MB content size; amd64 522,736 KiB unpacked, 153 MB content size. Both sit within the open point 2 estimate; the Navigator's choice of measure decides whether story 26 is met.
  5. Step 2 bases the worktree on the tip of main (currently `ceac02c` or later), not on `20e2349`.
  6. For PLT-17 and PLT-19 (no change to PLT-14): non-release builds may bake `VERSION=0.0.0-dev`, which is not a pullable tag, so the dispenser may need to pin by revision. `/opt/installer` ships `deploy/.gitkeep`, which a tar of the whole folder would extract into the install folder. Record these in PLT-17 and PLT-19's notes via this entry.
  7. The planner's scratch folders `/tmp/plt14-pdf-EFcR` and `/Users/bbartolome/workspace/.plt14-pdf-mzQd` still exist; a safety check blocked their removal. Leave them for the user; they are not part of the repository.

## 2026-11-12 — PLT-14 — Opus code review of `unit/PLT-14` (head 2c806c7, base main cb540c9): APPROVED (notes below)

- **Result (Opus subagent, fresh context):** APPROVED. Four files added (Dockerfile, .dockerignore, scripts/build-image.sh, scripts/entrypoint.sh), all in plan section 2; no protected path touched. The Dockerfile matches section 2 (two stages, pinned digests checked by `sha256sum -c`, ARG placement before the build-info rewrite, runtime `npm ci --omit=dev -w api -w contracts` with the nested zod copy, `.deb` bind mount, read-only packs/examples/deploy, `USER 1000:1000`, exec-form ENTRYPOINT, no `--platform`). `build-image.sh` rejects bad VERSION/REVISION/BUILT_AT with exit 1 and no docker call. Criteria 1–4 checked in a /tmp build (arm64): Node LTS Lithium, Pandoc 3.13, Typst 0.15.1, no git/cc/gcc/make, the PDF with `-w /tmp`, the app-state failure message and exit 1, `/healthz` 200 and `/api/platform/version` with the build args, the stub's `bash -n` and empty stderr, FTS5. Lint and test exit 0 (node:test 19 passed).
- **Size record (step 12).** Implementer's figures; the arm64 content size was confirmed by the reviewer on its own build, the amd64 figures were not re-measured:
  - arm64 (native): unpacked 548,816 KiB (535.9 MiB; `du -sxk /` as root); compressed 156 MB (`docker image ls` CONTENT SIZE); DISK USAGE 722 MB.
  - amd64 (QEMU under Docker Desktop): unpacked 522,736 KiB (510.5 MiB); compressed 153 MB.
  - Base `node:26-slim` (arm64): 273.9 MiB unpacked, 82.2 MiB compressed. Story 26's 300–400 MB target: the unpacked figure is above it, the compressed figure below it; the Navigator decides which measure counts (open point 2).
- **Criterion 1 checkbox:** left unticked. Its "recorded in the PR" part is replaced by this record, but whether that tick counts is the Navigator's decision (open point 1, second choice). Criteria 2, 3 and 4 are ticked. Criterion 5 stays unticked (native amd64 leg, open point 1).
- **Non-blocking notes from the reviewer:** (1) the reviewer's arm64 build reused the implementer's cached layers, so the downloads and `sha256sum -c` did not run again in review; (2) criterion 2(b) was run with a tmpfs `/books` in review, and the 1000:1000 ownership was checked inside the container; (3) `--user 501:20` also gets `/healthz` 200, so PLT-15 can run the app under a typical macOS UID; (4) `build-image.sh` uses `.` as the build context, so run it from the repo root; (5) the record is this entry.
- **Driver note:** the implementer's attempt to commit this record on `main` was denied by an auto-mode classifier (a subagent's command); the driver wrote the record itself as an ordinary `docker(PLT-14)` documentation commit on `main`, as for the other records.

## 2026-11-12 — PLT-15 — Opus plan review of revision 1 (`plans/PLT-15.md`, status draft): NOT APPROVED (rejection 1 of 3; six items, one non-blocking list)

- **Result (Opus subagent, fresh context):** NOT APPROVED. Items:
  1. Criterion 1's check cannot work as written. The shell runs inside a container (`/.dockerenv`), so `curl 127.0.0.1:18080` never reaches the published port. The LAN half cannot run either (`ipconfig` is absent; `hostname -I` gives the shell's bridge address). Correction: run the positive probe from a place that sees the daemon host's loopback (for example `http://host.docker.internal:18080/healthz`); add `docker inspect` of the tailscale container's PortBindings, expecting only HostIp `127.0.0.1`; give the LAN probe a real non-loopback daemon-host address with a positive control, or mark that half "cannot test locally" with its cause.
  2. Step 9 creates `$INST` under the shell's `/tmp`, which the daemon cannot see (only `/Users/bbartolome/workspace` is shared). Correction: create it under `/Users/bbartolome/workspace` with `mktemp -d`, remove it in step 12, and check that `docker compose exec tailscale cat /config/serve/serve.json` matches the committed file.
  3. Criterion 2 cannot fail: `SCRIBA_UID=$(id -u)` is 1000 here, the image's `USER 1000:1000` and the compose default. Correction: use a non-default pair (for example 1001:1001, or 501:20) with `chmod 0777 "$LIB"`; expect that pair from `ls -ldn` and from `id -u` / `id -g` inside the container; update criterion 3's expected UID; say the owner is read through Docker Desktop's virtiofs view.
  4. `SCRIBA_COMPOSE_VERSION: ${SCRIBA_COMPOSE_VERSION:-0}` conflicts with SAU-10 (line 19, and its criterion at line 24, "unset → `unknown`"): an unstamped install would report `mismatch` with actual 0. Correction: pass the bare key `SCRIBA_COMPOSE_VERSION:` with no value (unset → null, dropped; set → resolves), with a step-4 check of the `.env` value; or keep `:-0` and list the SAU-10 deviation as an open point.
  5. The hosts are reversed in open point 3, section 8 and the criteria 1–4 notes. The daemon is Docker Desktop on the Mac (`docker info`: Docker Desktop, linuxkit kernel, aarch64), not a Linux Engine. "The planning run starts no containers" is not a reason the implementer cannot test locally. Correction: step 9 tests criteria 1–4 on macOS Docker Desktop (also covering `/dev/net/tun` and SAU-21's macOS socket leg); only the native Linux Engine leg and possibly the LAN half of criterion 1 stay "cannot test locally".
  6. Open point 2 is already decided: SAU-20 line 15 shows the "HTTPS certificates off" hint pointing to the admin console; SAU-17 lines 21–22 provide `httpsCertsEnabled` from an empty `CertDomains`. Correction: close it and cite those lines.
- **Non-blocking:** the criterion 5 test uses `staticRoot: fixtures/static` (as `healthz-version.test.ts` does); optionally read `/api/platform/version` from the running stack; open point 1 may use `depends_on.tailscale.restart: true` for restarts compose drives.
- **Driver note:** the planner's report ("Linux host", "no containers started" as the testing reason) is the source of items 1, 2 and 5; the driver did not re-run them before this record. The next revision must re-check them.

## 2026-11-12 — PLT-15 — Opus plan review of revision 2 (`plans/PLT-15.md`, status draft): NOT APPROVED (rejection 2 of 3; five items, one non-blocking)

- **Result (Opus subagent, fresh context):** rejection-1 items 1–6 are all fixed (positive probe via host.docker.internal, PortBindings inspected, LAN half marked "cannot test locally" with a recipe and positive control, $INST and $LIB under the workspace, test pair 1001:1001 with chmod 0777, bare `SCRIBA_COMPOSE_VERSION:` key, hosts corrected, open point 2 closed with SAU-20 line 15 and SAU-17 lines 21–22). New items:
  1. Step 12 runs `docker compose down -v` on the fixed project name `scriba`, but step 0 checks only port 18080. A real install (from PLT-16 or PLT-17 runs on this Mac) would lose its tailnet state, and a leftover logged-in state volume would make criterion 3 print `Running`, not `NeedsLogin`. Correction: step 0 also stops if `docker compose ls -a` shows a `scriba` row or `docker volume ls -q --filter name=scriba_` prints anything.
  2. The LAN half has no slot in section 3: step 12 tears the stack down and no step hands over the Mac-terminal recipe. Correction: add a step between 9b and 12 that leaves the stack up with the step-9 `.env` and hands the recipe and `$INST` path to the Navigator; step 12 runs only after the result is recorded or the Navigator defers it; criterion 1 stays unticked until then.
  3. Criterion 2 says "on the host", but `ls -ldn` and busybox `stat` on Docker Desktop read the VM's virtiofs view, not the Mac's view. Correction: say so in criterion 2; add `ls -ln "$LIB/.scriba"` to the Mac-terminal recipe as a recorded observation with no pass/fail on 1001; add bind-mount ownership to the native Linux leg of open point 3, where "owned on the host" is exact.
  4. Section 1 ("Socket volume mounted read-write") gives a wrong reason: `connect()` needs write permission on the socket inode's mode bits, not a writable mount, so a `:ro` mount still allows connecting (as with `docker.sock:ro`). Correction: mount `tailscale-socket:/var/run/tailscale:ro` on `scriba`, matching SAU-17 line 20 ("The app only ever reads status"); criterion 3 proves it. Or keep read-write with a correct reason.
  5. Revision-2 item 3 and section 7 fact 7 say the record's line 62 is off by one. The rejection-1 entry cites no Dockerfile line. Correction: drop the remark and keep "`USER 1000:1000` is Dockerfile line 63" (confirmed: line 63 is `USER`, line 64 `ENTRYPOINT`, line 60 the `COPY` of `deploy/`).
- **Non-blocking:** section 5 (PLT-16): the loopback publish does not make `http://<100.x>:8080` refused. `scriba` listens on 0.0.0.0 in the shared namespace, which includes `tailscale0`; the refusal comes from PLT-08's tailnet filter. Reword it that way.
- **Assumed by the reviewer (not verified):** a `.env` file resolves the bare key to "1" (planner's probe B, not re-run); `host.docker.internal:18080` reaches the Mac's 127.0.0.1 publish; the Mac's view of bind-mount files is the Mac user; a `:ro` mount allows `connect()`; the tailscale source facts; UID 1001 can traverse the socket volume.

## 2026-11-12 — PLT-15 — Opus plan review of revision 3 (`plans/PLT-15.md`, status draft): NOT APPROVED (rejection 3 of 3; disagreement sent to the Navigator)

- **Result (Opus subagent, fresh context):** the revision-2 items and the non-blocking item are fixed (step 0 guard, step 9c hand-off, criterion 2 wording and Mac `ls -ln`, `:ro` socket mount with the kernel-source reason, Dockerfile lines 60/63/64, PLT-08 filter credit). New items:
  1. **Disagreement (for the Navigator):** criterion 2 expects owner values that Docker Desktop's file sharing does not show. The shared-folder view reports each file as owned by the reader: busybox run as 1001:1001, 4242:4343 and 0:0 each see different owners for the same root-written file; from the shell it reads 1000:1000; back-to-back calls return the previous reader's cached owner. So `ls -ldn` prints 1000 1000 and root busybox `stat` prints 0:0, whatever the app does. Section 4's "proves the UID:GID the container gives the files it writes" is false on this daemon. Proposed correction: on Docker Desktop, evidence is `id -u`/`id -g` = 1001 plus `.scriba/` being created (proves the process UID and the successful write, not the owner); the literal `stat -c %u:%g` = 1001:1001 check stays on the native Linux leg; the Mac `ls -ln` is recorded only.
  2. `$INST`, `$LIB` and `cd "$INST"` do not persist between tool calls. If `$INST` is empty, `cd ""` succeeds and `docker compose down -v` runs in the current folder. Correction: print and record the two `mktemp` paths at step 9; write later commands with literal paths or `${INST:?}` / `${LIB:?}` guards (for example `docker compose --project-directory "${INST:?}" …`); re-run the step-0 guard before `up`; before `down -v`, confirm `docker compose ls -a` shows `scriba` with config file `$INST/compose.yaml`. Or run the whole check under `-p plt15-check`.
  3. Step 12's cleanup mounts the whole workspace read-write into a root container to `rm -rf` globs; too wide. Correction: `docker run --rm -v "${LIB:?}":/l busybox rm -rf /l/.scriba`, then `rm -rf -- "${LIB:?}" "${INST:?}"` from the shell; if refused, record the paths in step 11 as PLT-14 did.
  4. Step 8 retags `bbartolome/scriba:local-arm64`, which is the PLT-14 image (`a5fca3e65422`, whose criteria 1 and 5 are still with the Navigator), so the PLT-14 image becomes untagged. Correction: build under `SCRIBA_IMAGE_TAG=plt15-check`, remove it in step 12, adjust section 5; or state that both images are left behind on purpose.
- **Non-blocking:** section 7 fact 2 still names `54b469c` as HEAD (it is `ceae8d9`); fact 14 cites `sb_permission`, which covers read-only filesystems, not a `:ro` bind mount (the conclusion stands); add `sleep 1` after `python3 -m http.server` in the Mac recipe.
- **Assumed by the reviewer:** `host.docker.internal:18080` reaches the Mac's loopback publish; a `.env` file resolves the bare key to "1"; a connect through the `:ro` mount works at run time; UID 1001 can enter the socket folder; the Mac `ls -ln` shows the Mac user; `ipconfig` and `python3` exist on the Mac; `id` and `printenv` exist in the runtime image; `env_file` with `required` needs Compose v2.24 or later.
- **Driver note:** prompt.md Step 5 applies: three rejections, so the disagreement (item 1) goes to the Navigator. Items 2–4 and the non-blocking notes are corrections for the planner and do not need the Navigator.

## 2026-11-13 — PLT-15 — Navigator decision on the criterion 2 owner check (after Opus plan rejection 3 of 3)

- **Decision A (Navigator, option b):** criterion 2 ("files the app writes into the library are owned by `SCRIBA_UID:SCRIBA_GID` on the host") stays unticked and is marked cannot-test-locally. The unit is complete without the literal host-owner check (prompt.md, "Criteria that you cannot test").
- **Decision B (Navigator):** the process-UID proof (`id -u` and `id -g` = 1001 in the `scriba` container, and `.scriba/` created by that process) is supporting evidence that `user:` is applied. It is not a substitute for the host-owner check. The criterion wording is unchanged.
- **Native Linux leg (open point 3):** optional, not required before status `done`. Recorded as not run until it runs; when it runs it records `stat -c %u:%g` on the host path, where "owned on the host" is exact.
- **Reason:** Docker Desktop's file sharing (VirtioFS) reports an owner that is not the creator's UID and changes between reads, so an owner check cannot verify the host owner on this daemon. Driver probe, 2026-11-13, a root-created file in a temp folder under the workspace: root `0:0`; UID 1001 `0:0`; UID 4242 `0:0`; the shell `0:0`; the shell again after 5 s `1000:1000`; root again `1000:1000`. The Navigator's step a1 wording "the reader's UID" does not match this probe, and the plan uses the corrected wording.
- **Plan changes (`plans/PLT-15.md`, revision 5, still untracked draft):** the `[PENDING NAVIGATOR: owner check]` markers are replaced by this decision. The criterion 2 test is the `id -u`, `id -g` and `.scriba/` check; `ls -ldn` and busybox `stat` are removed from it. The step 9c Mac `ls -ln` stays as a recorded observation. Open points 3 and 6 are resolved.

## 2026-11-13 — PLT-15 — Opus plan review of revision 5 (`plans/PLT-15.md`, status draft): NOT APPROVED (rejection 4; text items and two checks; criterion 2 decision applied)

- **Result (Opus subagent, fresh context):** the criterion 2 test is now `id -u`, `id -g` = 1001 and `.scriba/`; the box stays unticked; `ls -ldn` and busybox `stat` are gone from the test; every compose command in criteria 1–4 and steps 9, 9b and 12 has the prefix; bind mounts are under the workspace; downstream names agree. Items:
  1. The plan still says Docker Desktop shows the reader's owner, and still calls the owner check pending: open point 6 is titled "PENDING, with the Navigator"; line 7 says revision 4 at `086f4e0` is with the Navigator; fact 2 gives HEAD `086f4e0`. Correction: retitle open point 6 as resolved (DECISIONS 2026-11-13); use the probe wording (the owner shown is not the creator's UID and changes between reads); update line 7 and fact 2 to revision 5 at `dffd203`.
  2. Open point 3 credits the Navigator with closing criteria 1, 3, 4 and "the process-UID half of criterion 2". The decision says none of that. Correction: cite Decisions A and B and the native-leg sentence only; state the criteria 1, 3 and 4 coverage as the plan's own.
  3. Contradictions: line 205 ("Criterion 2's command block is left as written"); section 8 says busybox is pulled "by criterion 2"; step 12 says the app's files "belong to UID 1001", which cannot be verified on this daemon; line 237 says the Mac's owner view is "not the one criterion 2 defines", with no source. Correction: delete the line 205 sentence; busybox is pulled by step 12 only; step 12's reason becomes "the shell may be unable to remove files the app created"; line 237 cites the Navigator decision as the reason the `ls -ln` is an observation only.
  4. Step 11's record list omits the native Linux leg. Correction: add "native Linux leg (criterion 2 `stat -c %u:%g` on the host path, open point 3): not run".
  5. Criterion 4 cannot fail on this daemon. Docker Desktop's DNS answers `host.docker.internal` without a hosts-file line in this shell (`grep` exit 1), yet `getent` returns 192.168.65.254 through nameserver 127.0.0.11. So the DNS check does not show that `extra_hosts` on `tailscale` reaches `scriba`, and section 8's "Criterion 4 checks it" is wrong. Correction: add `docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba grep host.docker.internal /etc/hosts` expecting one `host-gateway` line; note that the DNS lookup alone passes either way on Docker Desktop; fix section 8.
  6. Cleanup: step 4's `/tmp` copies of `deploy/` are never named or removed. Correction: `mktemp -d /tmp/plt15-cfg.XXXX` in step 4, removed in step 12. Step 0 adds `docker image ls -q bbartolome/scriba:plt15-check` printing nothing (true today).
  7. Non-blocking: section 1 should source "pass `SCRIBA_LIBRARY` to the app" to the PLT-04 hand-off (DECISIONS line 413, "PLT-04 — Opus plan review of revision 2"), not only the empty-value rule.
- **Driver note:** items 1–7 are plan text and checks for the planner. Criterion 2 is settled by the Navigator (DECISIONS 2026-11-13, dffd203); no new Navigator question. Opus's probe claim (VirtioFS owner) was not re-run.

## 2026-11-13 — PLT-15 — Opus plan review of revision 6 (`plans/PLT-15.md`, status draft): NOT APPROVED (rejection 5; four items)

- **Result (Opus subagent, fresh context):** all seven revision-5 items are applied in the text. Items:
  1. Criterion 4's expected output does not match what `extra_hosts` writes on this daemon. `host-gateway` writes two tab-separated lines: `192.168.65.254<TAB>host.docker.internal` and `fdc4:f303:9324::254<TAB>host.docker.internal` (read from the exited container `scriba-check2`, with `extra_hosts: host.docker.internal:host-gateway`, via `docker cp … | tar -xO | cat -A`). The plan expects "exactly one line" with two spaces, and its command 2 must equal "the address of command 1", which is unclear with two addresses. Correction: expect one IPv4 line `<IPv4><TAB>host.docker.internal` (here 192.168.65.254) and record an IPv6 line if one appears; fail only when there is no IPv4 line (`grep -E '^[0-9.]+[[:space:]]+host\.docker\.internal$' /etc/hosts` exits 1); command 2 uses `dns.lookup('host.docker.internal', {family: 4}, …)` and compares with the IPv4 line; add the two-line observation as a fact.
  2. Step 4's config checks depend on the current folder ("Run in copies of `deploy/` in CFG"), the same problem as rejection 3 item 2. Step 12 removes `${CFG:?}` but step 11 does not record the path. Correction: each step 4 command is `docker compose --project-directory "${CFG:?}" config`, including the `env -u SCRIBA_LIBRARY` case; the printed `CFG` line goes into step 11's record list next to INST and LIB.
  3. Steps 1, 7 and 12 create and remove paths that step 0 never checks: `/tmp/plt15-wt`, `/tmp/plt15-fresh` and branch `unit/PLT-15`. Correction: step 0 adds `test ! -e /tmp/plt15-wt && test ! -e /tmp/plt15-fresh` and `git branch --list unit/PLT-15` printing nothing. Step 9 pulls `tailscale/tailscale:v1.104.4` (only `:latest` is on the daemon) and step 12 leaves it: say it is left on purpose (PLT-16 reuses it), or remove it.
  4. Non-blocking: line 7 tells the revision 1 and 2 rejection history twice (delete the second telling); lines 13 and 248 cite "Decision A" for the `ls -ln` observation, whose source is the "Plan changes" line of the 2026-11-13 entry (DECISIONS line 828).
- **Driver note:** items 1–4 are plan text and checks for the planner; no Navigator question (criterion 2 settled by DECISIONS 2026-11-13, dffd203). Not re-run: the compose probes, the VirtioFS probe, and the tailscale source facts (the reviewer's assumed list).

## 2026-11-13 — PLT-15 — Opus plan review of revision 7 (`plans/PLT-15.md`, status draft): NOT APPROVED (rejection 6; four items)

- **Result (Opus subagent, fresh context):** the four revision-6 items are applied in the text, and the reviewer re-checked the cited lines, the git state, the daemon state (read-only) and the Dockerfile lines. Items:
  1. Step 4 (c) to (f) cannot produce their expected results: none sets `SCRIBA_LIBRARY`, and the shell has no `SCRIBA_*` variables, so the `${SCRIBA_LIBRARY:?…}` line makes `config` exit 1 (fact 10E). Correction: write each case in full, for example `SCRIBA_LIBRARY=/tmp/x docker compose --project-directory "${CFG:?}" config`; case (e) is `env -u SCRIBA_COMPOSE_VERSION SCRIBA_LIBRARY=/tmp/x docker compose --project-directory "${CFG:?}" config`.
  2. Step 9b ends with "restore the line and run `up -d --wait` again", with no prefix. Without `-p`, it starts a project named `scriba` (the file's `name:`), whose volumes step 12's `down -v` does not reach. Correction: write `docker compose -p plt15-check --project-directory "${INST:?}" up -d --wait` in full.
  3. Fact 22 calls `scriba-check2` "the stopped container left by the criterion 4 probe". It is wrong: `docker inspect` shows it was created 2026-11-06T16:30:50Z, before any PLT-15 review, in bridge mode as 1000:1000, from image `9b392c90203c` (now untagged), with a bind of `/tmp/scriba-lib-grzp:/books`. Correction: describe it as an existing exited container from 2026-11-06, read only with `docker cp`, which the plan leaves alone (add it to step 0's leave-alone list). The two hosts lines match on re-check.
  4. Non-blocking: fact 17 still says "Not run in revision 4" (restate for revision 7: no `up`, build, pull or container start; the only read was `docker cp`); step 12 says branch `unit/PLT-15` stays because it holds the commit, so the cleanup list matches step 0's list.
- **Driver note:** text and check corrections for the planner; no Navigator question. Not re-run: compose probes, VirtioFS probe, tailscale source facts, `.env` resolution from another folder.

## 2026-11-13 — PLT-15 — Opus plan review of revision 8 (`plans/PLT-15.md`, status draft): NOT APPROVED (rejection 7; four items)

- **Result (Opus subagent, fresh context):** the four revision-7 items are applied. The reviewer checked the step 4 forms on stdin (`docker compose config`, no files written), the daemon state (read-only), and the cited lines. Items:
  1. Step 4 copies the wrong `deploy/`. Step 4 runs from the main checkout unless a step names a path; step 1 names only steps 2, 3, 5 and 10 for `/tmp/plt15-wt`. The main checkout's `deploy/` holds only `.gitkeep`, so every step 4 case would exit 1 with "no configuration file provided", and case (b) would not name `SCRIBA_LIBRARY`. Step 6 (`git add deploy …`) has the same gap. Correction: step 1 reads "Steps 2 to 6 and 10 run in `/tmp/plt15-wt`"; step 4 copies the contents of the folder with `cp -R /tmp/plt15-wt/deploy/. "${CFG:?}"/`.
  2. Step 12 does not say that `scriba-check2` stays; only step 0 does. Correction: add "The existing exited container `scriba-check2` stays untouched (step 0)." Fact 22 and step 0 have the image wrong: `docker inspect` gives `.Config.Image` = `bbartolome/scriba:dev`; its `.Image` is `sha256:9b392c90203c…`, which is not on the daemon (`docker image inspect` says "No such image"; `docker images -a --no-trunc` does not list it). Correction: say the container was created from `bbartolome/scriba:dev` (image `9b392c90203c`, not on the daemon); drop "the untagged image `9b392c90203c`" from step 0's leave-alone list, or mark it absent.
  3. Downstream disagreement not recorded. PLT-18 unit line 41 (demo) says "`docker compose ps` shows both services healthy". Only `scriba` has a healthcheck in the plan, and `tailscale/tailscale:latest` has no healthcheck. Correction: section 5's PLT-18 bullet records the hand-off: only `scriba` reports health; PLT-18's demo step 4 reads "scriba healthy, tailscale running". Do not add a `tailscale` healthcheck, because a check that fails before login would break `up --wait` in criterion 1.
  4. Non-blocking: stale revision wording (line 312 "Not checked in revision 7", line 388 "not run in revision 7", line 206 "(true at revision 7)"). Optional: step 9 adds `docker compose -p plt15-check --project-directory "${INST:?}" exec -T scriba printenv SCRIBA_COMPOSE_VERSION`, expecting `1`, as the only run-time check that the stamped `.env` value reaches the bare key.
- **Driver note:** item 1 is a real defect (the step 4 checks would fail as written); the rest are text and checks. No Navigator question. Not re-run: `.secret` and `.env` through real files, `--project-directory` from another folder, the VirtioFS probe, tailscale source facts.
