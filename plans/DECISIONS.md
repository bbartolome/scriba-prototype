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
