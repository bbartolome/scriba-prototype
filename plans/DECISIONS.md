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
