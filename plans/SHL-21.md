---
id: SHL-21
status: planned
title: The Shell's setup-status contract loader reads the CommonJS default export
module: shell
---
# SHL-21 plan — contract loader CommonJS interop

Unit: `units/SHL-21-contract-chunks-interop.md` (module shell, `phase: none`, M1, ungated). Status draft; the orchestrator's review moves it on. Drafted at HEAD `88640b5`, revised at HEAD `836b0a4` on `main`. The reviser ran the spec and the fix of this plan in a scratch copy outside the repository (`npm ci`, contracts build, red, green, the full web suite, `tsc`, the root lint and build); the results are in section 7. No file of the repository changed except this plan.

## 1. Decisions this plan obeys

- **The fix is the unit's unwrap, word for word:** `const mod = await import('@bbartolome/scriba-contracts/setup-auth');` then `return mod.default ?? mod;`, in place of line 12. Source: unit Decisions, first bullet; it mirrors `apps/web/src/app/features/setup-auth/setup-contract.ts` lines 24 to 26.
- **Line 6 gains `async`, because `await` needs it.** The unit keeps the exported name, the return type (`Pick<…, 'SETUP_STATUS_ROUTE' | 'setupStatusSchema'>`, lines 6 to 11) and the dynamic load; adding `async` changes none of the three (the function already returned a `Promise` of that type). Lines 1 to 5 and 7 to 11 do not change. Source: unit Decisions, first bullet. Plan decision.
- **No cast and no type alias.** Under `apps/web/tsconfig.json` (`module: preserve`, `moduleResolution: bundler`, lines 14 to 15) the namespace type of the CommonJS contract has a non-optional `default` key whose type is the module, so `mod.default ?? mod` type-checks with no annotation (checked: `tsc -p apps/web/tsconfig.spec.json` and `tsconfig.app.json` exit 0, eslint exit 0). The draft's cast `(mod as typeof mod & { default?: typeof mod })` fails with TS2352 and breaks `ng test` and `ng build` (checked); it is dropped.
- **Shapes.** The production build's shape is a namespace whose only key is `default` (the chunk ends with `export{chunk_LBEDIZWX_default as default}`; unit **Why**). The named-export shape has the named keys and no usable `default`. Source: unit **Why** and the criterion.
- **One new spec file, `apps/web/src/app/shell/contract-chunks.spec.ts`, with one test for the one criterion.** Source: unit **Decisions** second bullet, **Scope**, the criterion.
- **Each shape gets its own `vi.doMock` of the contract specifier inside the test, and `afterEach` calls `vi.doUnmock`.** Reason: `vi.mock` is hoisted and applies to every import of the specifier in its file (`setup-contract.spec.ts` lines 5 to 7 say so), so one file cannot give two shapes with it. `vi.doMock` is not hoisted and applies to every later dynamic import (`node_modules/vitest/dist/index.d.ts` line 656; Vitest 5.1.0). Each `doMock` registration drops the cached mock (`node_modules/vitest/dist/chunks/index.Bi0NXYPf.js` lines 178 to 189, "every time the mock is registered, we remove the previous one from the cache"), and the loader calls `import()` on each call, so the second call sees the second factory. `vi.doUnmock` deletes the mock and drops the cache too (lines 174 to 177). The loader itself is imported statically: it need not be re-evaluated, so the spec uses no `vi.resetModules()` (with the builder's `isolate: false`, `resetModules` clears every non-Vitest module of the worker, which this test does not need). Angular's patch only rejects relative paths in `vi.doMock`/`vi.doUnmock` (`node_modules/@angular/build/src/builders/unit-test/runners/vitest/build-options.js` lines 263 to 295); the specifier is a bare package name and external (`externalPackages: true`, line 250). Plan decision; checked by a run (section 7).
- **The named-export mock returns `default: undefined` explicitly.** Reason: the mock proxy throws when a key the factory did not return is read (`index.Bi0NXYPf.js` line 457); its pass-through list (lines 300 to 315) has no `default`. After the fix the loader reads `mod.default`, so without the key the named half would throw. Plan decision.
- **The default-only mock is X5's:** `{ default: await importOriginal() }` (`setup-contract.spec.ts` line 10). Source: unit **Decisions** second bullet.
- **No other file under `apps/web` changes:** not `landing.ts`, not `api-client.ts`, not SAU-06's loader or its spec, not `package.json`, `angular.json` or any tsconfig. Source: unit **Decisions** third bullet and **Scope**.
- **SHL-08 stays done.** Source: unit **Decisions** fourth bullet; `plans/SHL-08.md` line 3 (`status: done`).
- **Blockers are met.** SHL-08 and SAU-01 are `status: done` (`plans/SHL-08.md` line 3; `plans/SAU-01.md` line 3). A bare id in `blocked_by` must be merged (`units/README.md` line 61).
- **Testing is external.** The spec asserts only what the loader returns: the route and the schema the landing reads. The unit names this seam (Vitest, the module mocked both ways). Source: the criterion; `modules/shell.md` lines 88 to 91.
- **Ungated, M1, unblocks SAU-08.** Source: unit front matter; `units/README.md` lines 85 and 124; `modules/shell.md` line 13. `units/SAU-08-token-guard-gate.md` line 7 already names SHL-21 in `blocked_by`. Source of the decision: `plans/DECISIONS.md` lines 3965 to 3970 (2026-11-15, SAU-08, Navigator option (b)).
- **The production e2e check is SAU-08's, not this unit's.** This unit's gates are the root lint, test and build. SAU-08's e2e (criterion 8 step (e), `plans/SAU-08.md` line 108) proves the production interop on a build that contains this unit's commit. Source: `plans/DECISIONS.md` lines 3965 to 3970; SAU-08's last acceptance item ("The e2e setup step passes").
- **Branch and commits (prompt.md, Implement).** The implementer works in its own worktree on `unit/SHL-21`, runs `npm ci`, changes only the two files of section 2, and commits to the branch after each complete part of the work; each message contains `SHL-21`. This plan has two commits: the red spec (step 4) and the fix (step 12). The implementer does not push, add a remote, or change the plan.

## 2. Files to change

Only these two paths change. Nothing else under `apps/web` changes.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/shell/contract-chunks.ts` | line 6 gains `async`; line 12 is replaced by the two lines below; lines 1 to 5 and 7 to 11 and 13 do not change | the unwrap (section 1) |
| `apps/web/src/app/shell/contract-chunks.spec.ts` | new | the one test (section 4) |

After the fix, lines 6 to 14 are (Prettier-clean, checked):

```ts
export async function loadSetupStatusContract(): Promise<
  Pick<
    typeof import('@bbartolome/scriba-contracts/setup-auth'),
    'SETUP_STATUS_ROUTE' | 'setupStatusSchema'
  >
> {
  const mod = await import('@bbartolome/scriba-contracts/setup-auth');
  return mod.default ?? mod;
}
```

Not changed: `packages/contracts/` source and config. Its `dist/` is git-ignored build output that step 0 creates.

## 3. Method

Run from the worktree root. Record `node -v` (root `engines.node` is `>=26 <27`, `package.json` line 12) and `npm -v` (`packageManager` npm@11.20.0, line 14) beside the first result. Web tests run through `apps/web`'s `test` script, `ng test --watch=false` (`apps/web/package.json` line 8). If a step's expected result does not hold, stop and send PLAN DOES NOT WORK with the step and the cause; do not change this plan.

0. **Install and build the contract.** Run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`, then `ls packages/contracts/dist/setup-auth/index.js`. Expected: each exits 0, and the `ls` prints the path. Reason: `packages/contracts/dist` is git-ignored and absent in a new worktree, and the loader's import resolves into it (`packages/contracts/package.json` lines 10 to 12). Source: `plans/DECISIONS.md` line 2921 (the same step 0 in SAU-06).

1. **Baseline.** Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0. Record the file and test counts (the reviser measured 32 files, 227 tests at `836b0a4`). Run `npx tsc -p apps/web/tsconfig.spec.json --noEmit`. Expected: exit 0; if it already fails, record its messages and compare with step 8. Run `git status --short`. Expected: no output.

2. **Write the spec.** Create `apps/web/src/app/shell/contract-chunks.spec.ts` exactly as section 4 gives it. Run `npx prettier --check apps/web/src/app/shell/contract-chunks.spec.ts`. Expected: `All matched files use Prettier code style!` (if not, run `prettier --write` and change nothing else).

3. **Red (this step runs the red).** Run `npm test -w @bbartolome/scriba-web -- --include '**/contract-chunks.spec.ts'`. Expected: exit non-zero, 1 file and 1 test failed. The failure is in the default-only half, at `expect(defaultOnly.SETUP_STATUS_ROUTE)`, with the message `[vitest] No "SETUP_STATUS_ROUTE" export is defined on the "@bbartolome/scriba-contracts/setup-auth" mock`. The named half runs first and its assertions pass. Record the message and the line. Stop and report if the failure is in the named half, if the build fails, or if the test passes.

4. **Loader unchanged at red; commit the red.** Run `git diff --stat -- apps/web/src/app/shell/contract-chunks.ts`. Expected: no output. Commit only the spec: `git add apps/web/src/app/shell/contract-chunks.spec.ts` and `git commit -m "test(SHL-21): add the red test of the contract loader"`.

5. **Fix.** Make the change of section 2 (line 6 `async`; line 12 replaced by the two lines) and no other change. Run `npx prettier --check apps/web/src/app/shell/contract-chunks.ts apps/web/src/app/shell/contract-chunks.spec.ts`. Expected: `All matched files use Prettier code style!`.

6. **Green (this step runs the green).** Run the step 3 command again. Expected: exit 0, 1 file and 1 test passed. The named half passes through `?? mod` (`mod.default` is `undefined`); the default-only half passes through `mod.default`.

7. **Web tests.** Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0, the step 1 counts plus one file and one test (measured: 33 files, 228 tests), zero failures. This run includes SAU-06's X5 (`setup-contract.spec.ts`), which must still pass.

8. **Type check.** Run `npx tsc -p apps/web/tsconfig.spec.json --noEmit`. Expected: exit 0, or only the errors that step 1 recorded.

9. **Files.** Run `git status --short`. Expected: exactly ` M apps/web/src/app/shell/contract-chunks.ts`. Git-ignored output (`dist/`, `node_modules/`) does not appear.

10. **Lint gate.** From the root, run `npm run lint`. Expected: exit 0, ending with `All matched files use Prettier code style!`. It runs each workspace's lint, `lint:examples` and `prettier --check .` (root `package.json` line 26).

11. **Test gate.** From the root, run `npm test`. Expected: exit 0. It runs every workspace's test and `node --test 'scripts/*.test.mjs'` (line 25). A failure outside `apps/web` is not this unit's: record it and stop.

12. **Build gate; commit the fix.** From the root, run `npm run build` (line 23). Expected: exit 0. Warnings are not failures: the initial budget warning (500 kB) and two CommonJS warnings (`zod` used by a `packages/contracts/dist/setup-auth/*.js` file; `@bbartolome/scriba-contracts/setup-auth` used by `src/app/shell/contract-chunks.ts`), as in `plans/DECISIONS.md` line 2702. This gate proves compilation only; the production interop is SAU-08's e2e (section 5), which this unit does not run. Then `git add apps/web/src/app/shell/contract-chunks.ts` and `git commit -m "fix(SHL-21): read the CommonJS default export in the contract loader"`. Then `git diff --stat main...HEAD`. Expected: exactly the two files of section 2.

13. **Report.** COMPLETE with, for each step, the command, the exit code and the key line: the red message and line (step 3), the green counts (steps 6 and 7), the type-check result (step 8), the `git status --short` output (step 9), the three gate exit codes (steps 10 to 12), the two commit hashes and the `git diff --stat` (step 12).

## 4. Acceptance criterion and test

Criterion (the unit's only one): "The loader returns SETUP_STATUS_ROUTE and setupStatusSchema when the contract module has named exports, and when it has only default (the production build). Test seam: Vitest, the spec mocks the module both ways."

One test, in `apps/web/src/app/shell/contract-chunks.spec.ts`:
- describe: `SHL-21 the Shell setup-status contract loader`
- test: `returns SETUP_STATUS_ROUTE and setupStatusSchema with named exports and with only a default export`

**Vitest and the runner.** Vitest 5.1.0 (`apps/web/package.json` line 36; root `package.json` line 39). The web tests run through `@angular/build:unit-test` (`apps/web/angular.json`, the `test` target), runner `vitest` by default (`node_modules/@angular/build/src/builders/unit-test/schema.json` lines 16 to 20), with `globals: true` and `isolate: false` (`runners/vitest/plugins.js` lines 193 to 195). The globals come from `apps/web/tsconfig.spec.json` (`types: ["vitest/globals"]`), so the spec imports only the loader.

The spec (exact; Prettier-clean as written):

```ts
import { loadSetupStatusContract } from './contract-chunks';

type Contract = typeof import('@bbartolome/scriba-contracts/setup-auth');
const CONTRACT = '@bbartolome/scriba-contracts/setup-auth';
const STATUS = {
  steps: {
    access: 'done',
    tailscale: 'pending',
    providers: 'pending',
    preferences: 'pending',
    firstProject: 'pending',
  },
  complete: false,
  compose: { state: 'unknown', expected: 3 },
};

describe('SHL-21 the Shell setup-status contract loader', () => {
  afterEach(() => {
    vi.doUnmock(CONTRACT);
  });

  it('returns SETUP_STATUS_ROUTE and setupStatusSchema with named exports and with only a default export', async () => {
    // Named exports and no usable default (the shape under ng test).
    vi.doMock(CONTRACT, async (importOriginal) => {
      const actual = await importOriginal<Contract>();
      return {
        default: undefined,
        SETUP_STATUS_ROUTE: actual.SETUP_STATUS_ROUTE,
        setupStatusSchema: actual.setupStatusSchema,
      };
    });
    const named = await loadSetupStatusContract();
    expect(named.SETUP_STATUS_ROUTE).toBe('/api/setup-auth/status');
    expect(named.setupStatusSchema.parse(STATUS)).toEqual(STATUS);

    // Only default: the production build's shape, mocked as X5 mocks it.
    vi.doMock(CONTRACT, async (importOriginal) => ({
      default: await importOriginal(),
    }));
    const defaultOnly = await loadSetupStatusContract();
    expect(defaultOnly.SETUP_STATUS_ROUTE).toBe('/api/setup-auth/status');
    expect(defaultOnly.setupStatusSchema.parse(STATUS)).toEqual(STATUS);
  });
});
```

Why each piece is there:
- The static import of the loader is enough: the loader calls `import()` on each call, and each `vi.doMock` drops the cached mock (section 1), so no `vi.resetModules()` is needed.
- `afterEach` removes the mock, so the module state this file leaves for the other spec files of the same worker is the original module (`isolate: false`).
- `STATUS` is a valid `setupStatusSchema` value (`packages/contracts/src/setup-auth/status.ts`: `setupStepsSchema`, `composeVersionStatusSchema`, `setupStatusSchema`). `toEqual` shows that the schema returned is the contract's schema, not a stub.
- `/api/setup-auth/status` is `packages/contracts/src/setup-auth/routes.ts` line 4.

**Results (measured by the reviser in a scratch copy; steps 3 and 6 confirm them).**

| Half | Before the fix (step 3, red) | After the fix (step 6, green) | Reason |
|---|---|---|---|
| named exports | passes | passes | Before: the loader returns the mock, which has both keys. After: `mod.default` is `undefined`, so `?? mod` returns the mock. |
| default only | fails at `defaultOnly.SETUP_STATUS_ROUTE` with `No "SETUP_STATUS_ROUTE" export is defined on the … mock` | passes | Before: the loader returns `{ default }` unchanged. After: `mod.default` is the real module. |

The order named-then-default is part of the red: the named half passes first, and the failing line is in the default half.

## 5. Downstream agreement: SAU-08

- SAU-08 names SHL-21 in `blocked_by` already (`units/SAU-08-token-guard-gate.md` line 7). This unit changes no file of SAU-08 and no SAU-08 criterion (`plans/DECISIONS.md` lines 3965 to 3970). SAU-08 is in the pipeline (`plans/SAU-08.md`, branch `unit/SAU-08`); no unit change touches it.
- **What SAU-08 needs:** `loadSetupStatusContract()` keeps its name and return type, and in the production build (a namespace whose only key is `default`) it resolves to an object whose `SETUP_STATUS_ROUTE` and `setupStatusSchema` are the contract's values. Then `landing.ts` line 49 reads a defined route and schema, `api-client.ts` line 51 does not throw, and the landing navigates (SAU-08's step (e), `plans/SAU-08.md` line 108).
- **Who proves it:** SAU-08's e2e, run after SHL-21 merges. This unit proves the two shapes under Vitest (section 4) and compilation (step 12) only.
- No other `draft` or `planned` plan changes `contract-chunks.ts` (grep of `plans/`: SAU-06, SHL-08 and SHL-20 name it and are done).

## 6. Open points

1. **`async` on line 6.** Needed for the unit's `await` form. The unit fixes the name, the return type and the dynamic load, not the absence of `async`. Decided here.
2. **One test, two halves.** One criterion, one `it`. Splitting it in two would also work; not needed.
3. **`default: undefined` in the named mock** is needed because of the Vitest mock proxy (section 1). Recheck it if Vitest changes.
4. **Include pattern.** `--include '**/contract-chunks.spec.ts'` is relative to the project source root (`schema.json` lines 45 to 46); it matched in the reviser's run.
5. **Build warnings.** The initial budget and the two CommonJS warnings are expected (step 12). If the build fails on a warning, stop and report.

## 7. Facts checked and Assumed

**Facts checked (read or grepped).**
- `units/SHL-21-contract-chunks-interop.md`: front matter, **Why**, **Decisions**, **Scope**, the one criterion.
- `units/SAU-08-token-guard-gate.md` line 7 (`blocked_by` names SHL-21).
- `modules/shell.md` line 13 (SHL-21 note), lines 88 to 91 (testing principles). `units/README.md` line 61 (bare id), line 85 (SHL-21 row), line 124 (SHL-21 note).
- `apps/web/src/app/shell/contract-chunks.ts`: lines 1 to 5 the comment, lines 6 to 11 the signature, line 12 `return import('@bbartolome/scriba-contracts/setup-auth');`.
- `apps/web/src/app/shell/landing.ts`: line 5 (the import), line 41 (the load), line 49 (`contract.SETUP_STATUS_ROUTE`, `contract.setupStatusSchema`), lines 58 to 60 (the catch that shows the alert). `apps/web/src/app/shell/api-client.ts` line 51 (`path.startsWith('//')`).
- `apps/web/src/app/features/setup-auth/setup-contract.ts`: lines 7 to 8 (the comment on the shapes), lines 10 to 11 (the type aliases), lines 24 to 26 (the unwrap).
- `apps/web/src/app/features/setup-auth/setup-contract.spec.ts`: line 3 (`vi.hoisted`), lines 5 to 7 (the hoisting comment), lines 8 to 11 (`vi.mock` with `{ default: await importOriginal() }`), lines 13 to 29 (X5). Grep of `apps/web/src` finds `vi.mock` and `importOriginal` only there; no spec uses `vi.doMock` or `vi.resetModules`.
- `node_modules/vitest` 5.1.0: `dist/index.d.ts` line 656 (`doMock` doc), lines 819 to 821 (`resetModules` doc); `dist/chunks/index.Bi0NXYPf.js` lines 174 to 189 (`unmockPath`, `mockPath` drop the cached mock), lines 300 to 315 (proxy pass-through keys), line 457 (the "No … export" throw); `dist/chunks/utils.DYj33du9.js` lines 27 to 41 (`resetModules` clears every module except Vitest's and `mock:` ids).
- `node_modules/@angular/build/src/builders/unit-test`: `schema.json` lines 16 to 20 and 44 to 46; `runners/vitest/plugins.js` lines 193 to 195; `runners/vitest/build-options.js` line 250 (`externalPackages: true`), lines 263 to 295 (the relative-path patch of `vi.mock`/`vi.doMock`).
- `apps/web/package.json` lines 6, 8, 9, 36. `apps/web/tsconfig.json` lines 14 to 15. Root `package.json` lines 12, 14, 23, 25, 26, 39. `packages/contracts/package.json` lines 10 to 12. `packages/contracts/src/setup-auth/routes.ts` line 4.
- `plans/SHL-08.md` line 3, `plans/SAU-01.md` line 3, `plans/SAU-08.md` line 108, `plans/DECISIONS.md` lines 2702, 2921, 3960 to 3962, 3965 to 3970.

**Checked by a run (reviser, scratch copy of `836b0a4` under `/tmp`, after `npm ci` and the contracts build).**
- Baseline web suite: 32 files, 227 tests, all pass.
- The section 4 spec with the loader unchanged: 1 test fails at the `defaultOnly.SETUP_STATUS_ROUTE` line with the "No \"SETUP_STATUS_ROUTE\" export is defined on the … mock" error.
- The section 2 fix: the spec passes; the full web suite has 33 files, 228 tests, all pass; `tsc -p apps/web/tsconfig.spec.json` and `tsconfig.app.json` exit 0; eslint of `src/app/shell/` exits 0; root `npm run lint` exits 0; root `npm run build` exits 0 with the budget warning and the two CommonJS warnings.
- The draft's cast form fails with TS2352 under `ng test`.

**Assumed (not checked).**
- Root `npm test` (all workspaces) passes; only the web workspace was run.
- The production build's lazy chunk has only `default` (unit **Why**, from SAU-08's evidence); SAU-08's e2e confirms the fix in production.

## Review parts

**Part 1 (the whole plan).** Steps 0 to 13 of section 3, the change of section 2, and the one test of section 4 for the one acceptance criterion. The reviewer also checks that the branch changes only `apps/web/src/app/shell/contract-chunks.ts` and `apps/web/src/app/shell/contract-chunks.spec.ts`, that the red commit holds the spec with the loader unchanged, and that the production e2e is not claimed (it belongs to SAU-08).
