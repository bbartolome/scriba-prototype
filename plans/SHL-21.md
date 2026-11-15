---
id: SHL-21
status: draft
title: The Shell's setup-status contract loader reads the CommonJS default export
module: shell
---
# SHL-21 plan — contract loader CommonJS interop

Unit: `units/SHL-21-contract-chunks-interop.md` (module shell, `phase: none`, M1, ungated). Status draft; the orchestrator's review moves it on. Written at HEAD `88640b5` on `main` (working tree clean at the check). The planner ran reads and greps only. It did not install, build, test or change any file except this one.

## 1. Decisions this plan obeys

- **The fix is one unwrap of `default` at line 12 of the loader, and nothing else in the loader changes.** Lines 1 to 11 and 13 stay. The exported name, the parameter list, the return type `Promise<Pick<typeof import('@bbartolome/scriba-contracts/setup-auth'), 'SETUP_STATUS_ROUTE' | 'setupStatusSchema'>>` and the dynamic import stay. Source: unit line 20 (first Decisions bullet); the task's rule "edit line 12 only".
- **The unwrap is the one SAU-06 uses: `mod.default ?? mod`** (`apps/web/src/app/features/setup-auth/setup-contract.ts` lines 24 to 26). The form on line 12 differs in its syntax, not its meaning, because the loader's function is not `async` and its namespace type needs a cast (section 2; open point 1). Source: unit line 20; setup-contract.ts lines 10 to 11 and 24 to 26. Plan decision on the form.
- **Shapes.** The production build's shape is a namespace whose only key is `default` (the chunk ends with `export{chunk_LBEDIZWX_default as default}`, unit lines 16 to 17). The named-export shape has the named keys and no `default` key. Source: unit lines 16 to 17 and 30.
- **One new spec file, `apps/web/src/app/shell/contract-chunks.spec.ts`, with one test that covers both shapes.** Source: unit lines 21, 26 and 30; the task's instruction (one test for the one criterion). Plan decision on the count (open point 2).
- **Each shape gets its own `vi.doMock` call, then `vi.resetModules()`, then a fresh dynamic import of the loader.** Reason: `vi.mock` is hoisted and applies to every import of the specifier in its file (`setup-contract.spec.ts` lines 5 to 7 say so), so one file cannot give two shapes with it. Vitest 5.1.0 documents `doMock` as mocking "every subsequent dynamic import call" (`node_modules/vitest/dist/index.d.ts` line 656) and `resetModules` as clearing the cache so modules are re-evaluated, while top-level imports cannot be re-evaluated (lines 819 to 821). Plan decision; the method is checked against the installed Vitest in section 4.
- **The named-export mock returns `default: undefined` explicitly.** Reason: the mock proxy throws when a key the factory did not return is read (`node_modules/vitest/dist/chunks/index.Bi0NXYPf.js` line 457); the pass-through list at lines 300 to 315 has no `default`. A namespace without the key gives `undefined` when it is read, so `undefined` is the faithful model. Plan decision.
- **The default-only mock is X5's:** `{ default: await importOriginal() }` (`setup-contract.spec.ts` line 10). Source: unit line 21.
- **No other file under `apps/web` changes:** not `landing.ts`, not `api-client.ts`, not SAU-06's loader or its spec, not `package.json`, `angular.json` or any tsconfig. Source: unit lines 22 and 26 to 27.
- **SHL-08 stays done.** This is a follow-up fix, not a reopening. Source: unit line 23; `plans/SHL-08.md` line 3 (`status: done`).
- **Blockers are met.** SHL-08 and SAU-01 are `status: done` (`plans/SHL-08.md` line 3; `plans/SAU-01.md` line 3). A bare id in `blocked_by` must be merged. Source: unit line 7; `units/README.md` line 61.
- **Test seam: Vitest, the spec mocks the module both ways.** Source: unit line 30.
- **Testing is external.** The spec asserts only what the loader returns: the route and the schema the landing reads. It does not test internals. Source: `modules/shell.md` lines 89 and 90; the loader is an exported function, not a private service (open point 4).
- **Ungated, M1, unblocks SAU-08.** Source: unit lines 5, 9 and 14; `units/README.md` lines 85 and 124. `units/SAU-08-token-guard-gate.md` line 7 already names SHL-21 in `blocked_by`. Source of the decision: `plans/DECISIONS.md` lines 3965 to 3970 (2026-11-15, SAU-08, Navigator option (b)).
- **The production build check is SAU-08's e2e, not this unit's.** Source: the task's instruction; SAU-08's last acceptance item ("The e2e setup step passes", `units/SAU-08-token-guard-gate.md`); `plans/SAU-08.md` line 108 (step (e)).
- **Branch and commits.** The driver creates `unit/SHL-21` from `main` in a worktree. The implementer does not commit, push, add a remote or switch branches; the driver commits. Source: `plans/SHL-08.md` line 50 (precedent). Plan decision.
- **Names and layout.** The spec's file name is fixed by the unit. The describe and test names are chosen here (section 4). Source: unit line 26; task rule "simplest option".

## 2. Files to change

Only these two paths change. Nothing else under `apps/web` changes.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/shell/contract-chunks.ts` | edit line 12 only: the line is replaced by the three lines below; lines 1 to 11 and 13 do not change | the unwrap (section 1) |
| `apps/web/src/app/shell/contract-chunks.spec.ts` | new | the one test (section 4) |

Line 12 becomes (Prettier output expected to match; step 5 runs `prettier --write`):

```ts
  return import('@bbartolome/scriba-contracts/setup-auth').then(
    (mod) => (mod as typeof mod & { default?: typeof mod }).default ?? mod,
  );
```

Why this form (decision; open point 1): the unit's text `const mod = await import(...); return mod.default ?? mod;` cannot be pasted on line 12. The function is not `async`, and line 6 may not change. The namespace type is assumed to have no `default` key under `apps/web/tsconfig.json` (`module: preserve`, `moduleResolution: bundler`, lines 14 to 15), so `mod.default` needs the cast. The cast type-checks whether or not that key is in the type. The type alias of `setup-contract.ts` (lines 10 to 11) would need lines outside line 12.

Not changed: `packages/contracts/` source and config. Its `dist/` is git-ignored build output that step 0 creates.

## 3. Method

Run from the worktree root. Record `node -v` (the root `engines.node` is `>=26 <27`) and `npm -v` (`packageManager` npm@11.20.0) beside the first result. Tests run through `apps/web`'s `test` script, `ng test --watch=false` (`apps/web/package.json` line 8). If a step's expected result does not hold, stop and report; do not change this plan.

0. **Install and build the contract.** Run `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`, then `ls packages/contracts/dist/setup-auth/index.js`. Expected: each exits 0, and the `ls` prints the path. Reason: `packages/contracts/dist` is absent at HEAD (checked), is git-ignored, and the loader's import resolves into it (`packages/contracts/package.json` lines 10 to 12). Source: `plans/DECISIONS.md` line 2921 (the same step 0 in SAU-06).

1. **Baseline.** Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0. Record the file and test counts. Run `npx tsc -p apps/web/tsconfig.spec.json --noEmit`. Expected: exit 0; if it already fails before any change, record its messages and compare with step 8. Run `git status --short`. Expected: no output.

2. **Write the spec.** Create `apps/web/src/app/shell/contract-chunks.spec.ts` as section 4 gives it. Then run `npx prettier --write apps/web/src/app/shell/contract-chunks.spec.ts`. Expected: the file is reported as written.

3. **Red.** Run `npm test -w @bbartolome/scriba-web -- --include '**/contract-chunks.spec.ts'`. Expected: exit non-zero, and the one test fails. The failure must be in the default-only half, at the first read of `defaultOnly.SETUP_STATUS_ROUTE`, with Vitest's message `No "SETUP_STATUS_ROUTE" export is defined on the "@bbartolome/scriba-contracts/setup-auth" mock`. The named half runs first, and its assertions pass before the failing line. Record the actual message. Stop and report if the failure is in the named half (the named mock is wrong), or if the default-only half passes (then `doMock` does not reach the loader's dynamic import; open point 6).

4. **Loader unchanged at red.** Run `git diff --stat -- apps/web/src/app/shell/contract-chunks.ts`. Expected: no output.

5. **Fix.** Replace line 12 with the three lines of section 2 and no other line. Run `npx prettier --write apps/web/src/app/shell/contract-chunks.ts`, then `npx prettier --check apps/web/src/app/shell/contract-chunks.ts apps/web/src/app/shell/contract-chunks.spec.ts`. Expected: `All matched files use Prettier code style!`.

6. **Green.** Run the step 3 command again. Expected: exit 0, and the one test passes. The named half now passes through the `?? mod` branch (`mod.default` reads `undefined`), and the default-only half passes through `mod.default`.

7. **Web tests.** Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0. The counts equal the step 1 baseline plus one file and one test, with zero failures. This run includes SAU-06's X5 (`setup-contract.spec.ts`), which must still pass with the new spec in the same run (section 7, Assumed).

8. **Type check.** Run `npx tsc -p apps/web/tsconfig.spec.json --noEmit`. Expected: exit 0, or only the errors that step 1 recorded. The new spec is not type-checked by `ng test` or `ng build`, so this step is the check of its types.

9. **Files.** Run `git status --short`. Expected: exactly ` M apps/web/src/app/shell/contract-chunks.ts` and `?? apps/web/src/app/shell/contract-chunks.spec.ts`. Git-ignored output (`dist/`, `node_modules/`) does not appear.

10. **Lint gate.** From the root, run `npm run lint`. Expected: exit 0. It runs each workspace's lint, `lint:examples` (which builds the contracts first) and `prettier --check .`. It ends with `All matched files use Prettier code style!`.

11. **Test gate.** From the root, run `npm test`. Expected: exit 0. It runs every workspace's test and `node --test 'scripts/*.test.mjs'`. A failure outside `apps/web` is not this unit's: record it and stop.

12. **Build gate.** From the root, run `npm run build`. Expected: exit 0. Warnings are reported, not failures: the initial budget warning (500 kB) and the CommonJS warnings (`angular.json`, production configuration; the 1 MB error budget applies). This gate proves that the code compiles. It does not prove the production interop. That is SAU-08's e2e (`plans/SAU-08.md` line 108, step (e)), which runs on a build that includes this unit's commit after SHL-21 merges. This unit does not run it.

13. **Report.** For each step, report the command, the exit code and the key line: the red message (step 3), the green counts (steps 6 and 7), the type-check result (step 8), the `git status --short` output (step 9) and the three gate exit codes (steps 10 to 12). Do not commit. The driver commits.

## 4. Acceptance criterion and test

Criterion (unit line 30): "The loader returns SETUP_STATUS_ROUTE and setupStatusSchema when the contract module has named exports, and when it has only default (the production build). Test seam: Vitest, the spec mocks the module both ways."

One test, in `apps/web/src/app/shell/contract-chunks.spec.ts`:
- describe: `SHL-21 the Shell setup-status contract loader`
- test: `returns SETUP_STATUS_ROUTE and setupStatusSchema with named exports and with only a default export`

**Vitest and the method.** The installed Vitest is 5.1.0 (`apps/web/package.json` line 36 `"vitest": "5.1.0"`; root `package.json` line 39; `node_modules/vitest` 5.1.0). The web tests run through Angular's `@angular/build:unit-test` builder (`apps/web/angular.json` line 76). Its runner defaults to `vitest` (`node_modules/@angular/build/src/builders/unit-test/schema.json` lines 16 to 20). Its project defaults are `globals: true` and `isolate: false` (`node_modules/@angular/build/src/builders/unit-test/runners/vitest/plugins.js` lines 193 to 195). The globals come from `apps/web/tsconfig.spec.json` (`types: ["vitest/globals"]`), so the spec has no imports, as `setup-contract.spec.ts` has none.

The method is `vi.doMock`, then `vi.resetModules()`, then a dynamic import of the loader inside each half. The loader is not imported statically: a top-level import is not re-evaluated by `resetModules` (`index.d.ts` lines 819 to 821), so each shape needs its own dynamic import after its own mock.

The spec body (the load-bearing part; the implementer may reformat it with Prettier):

```ts
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

async function loadFresh() {
  vi.resetModules();
  const { loadSetupStatusContract } = await import('./contract-chunks');
  return loadSetupStatusContract();
}

describe('SHL-21 the Shell setup-status contract loader', () => {
  afterEach(() => {
    vi.doUnmock(CONTRACT);
    vi.resetModules();
  });

  it('returns SETUP_STATUS_ROUTE and setupStatusSchema with named exports and with only a default export', async () => {
    // Named exports and no default key (the shape under ng test; plans/SAU-06.md line 31, row R5.1).
    vi.doMock(CONTRACT, async (importOriginal) => {
      const actual = await importOriginal<Contract>();
      return {
        default: undefined,
        SETUP_STATUS_ROUTE: actual.SETUP_STATUS_ROUTE,
        setupStatusSchema: actual.setupStatusSchema,
      };
    });
    const named = await loadFresh();
    expect(named.SETUP_STATUS_ROUTE).toBe('/api/setup-auth/status');
    expect(named.setupStatusSchema.parse(STATUS)).toEqual(STATUS);

    // Only default: the production build's shape (unit lines 16 to 17), mocked as X5 mocks it.
    vi.doMock(CONTRACT, async (importOriginal) => ({
      default: await importOriginal(),
    }));
    const defaultOnly = await loadFresh();
    expect(defaultOnly.SETUP_STATUS_ROUTE).toBe('/api/setup-auth/status');
    expect(defaultOnly.setupStatusSchema.parse(STATUS)).toEqual(STATUS);
  });
});
```

Why each piece is there:
- `afterEach` removes the mock and clears the cache, so the module state this file leaves for the other spec files of the same run is clean (`isolate: false`, section 7).
- `STATUS` is a valid value of `setupStatusSchema`: its shape is `setupStepsSchema` and `composeVersionStatusSchema` (`packages/contracts/src/setup-auth/status.ts` lines 17 to 38). `toEqual` shows that the schema returned is the contract's schema, not a stub.
- The route value `/api/setup-auth/status` is `packages/contracts/src/setup-auth/routes.ts` line 4.

**Expected results.** These are predictions from reading the code; step 3 and step 6 confirm them.

| Half | Before the fix (step 3) | After the fix (step 6) | Reason |
|---|---|---|---|
| named exports | passes | passes | The loader returns the mock unchanged; it has both keys. After the fix, `mod.default` reads `undefined`, so `?? mod` returns the mock. |
| default only | fails at `defaultOnly.SETUP_STATUS_ROUTE` with the Vitest "No ... export is defined on the mock" error | passes | Before the fix the loader returns `{ default }` unchanged. After the fix `mod.default` is the real module. |

The order named-then-default is part of the red: the named half must pass first, and the failing line must be in the default half (step 3).

## 5. Downstream agreement: SAU-08

- SAU-08 names SHL-21 in `blocked_by` already (`units/SAU-08-token-guard-gate.md` line 7). This unit changes no file of SAU-08 and no SAU-08 criterion (`plans/DECISIONS.md` lines 3965 to 3970).
- **What SAU-08 needs from this unit:** `loadSetupStatusContract()` keeps its signature, and in the production build (a namespace whose only key is `default`) it resolves to an object whose `SETUP_STATUS_ROUTE` and `setupStatusSchema` are the contract's values. Then `landing.ts` line 49 reads a defined route and schema, `api-client.ts` line 51 does not throw, and the landing navigates (SAU-08's step (e), `plans/SAU-08.md` line 108).
- **Who proves it:** SAU-08's e2e, run after SHL-21 merges. This unit proves the loader's two shapes under Vitest only (section 4). Its build gate (step 12) proves compilation only.
- SAU-08 stays blocked until SHL-21 is merged; its e2e runs on a build that contains this unit's commit.

## 6. Open points

1. **Line 12 form (decided here, not the unit's literal text).** The unit's line (`const mod = await import(...); return mod.default ?? mod;`, unit line 20) cannot be used as it is: the function is not `async`, and line 6 may not change. The cast form avoids both problems. The lint and build gates (steps 10 and 12) and the type check (step 8) confirm it. If the reviewer prefers the `setup-contract.ts` type alias, line 12 grows into more lines, and the scope rule of unit line 26 has to be read with that in mind.
2. **One test, two halves.** The instruction asks for one test that covers both shapes, so the plan has one `it`. A reviewer who wants one `it` per shape can split the body with no other change; the red step then shows one failing test in place of a failing half.
3. **`default: undefined` in the named mock** is needed because of the Vitest mock proxy (section 1). Recheck it if Vitest changes.
4. **Testing principle.** `modules/shell.md` lines 89 and 90 ask for external behaviour through the seam. The loader is an exported function, not a private service, and the test asserts only the values it returns, which are the values the landing reads. The unit names the seam. No DECISIONS ruling is needed.
5. **Red text.** The expected message comes from the installed Vitest source (`index.Bi0NXYPf.js` line 457), not from a run. Step 3 records the actual text. The decision is the location of the failure (the default half), not the wording.
6. **`doMock` reaches the loader.** Assumed: `doMock` uses the same function-mock path as `vi.mock` (`index.Bi0NXYPf.js` line 404), and X5 shows that the loader's dynamic import goes through a mock. If the default-only half passes before the fix, step 3 stops the work.
7. **Include pattern.** `--include '**/contract-chunks.spec.ts'` is relative to the project source root (`schema.json` line 46). If the runner does not match it, use the form that matches, record it, and change nothing else.
8. **Warnings in the build.** The initial budget and the CommonJS warnings are expected and are not failures (step 12). If the build fails on a warning, stop and report.

## 7. Facts checked and Assumed

**Facts checked.** All of these were read or grepped. No install, build or test was run by the planner.

- `units/SHL-21-contract-chunks-interop.md`: front matter lines 3 to 9 (`blocked_by` line 7, `unblocks` line 9); Why lines 16 to 17; Decisions lines 20 to 23; Scope lines 26 to 27; the criterion at line 30.
- `units/SAU-08-token-guard-gate.md`: `blocked_by` line 7 names SHL-21; the last acceptance item is "The e2e setup step passes."
- `modules/shell.md`: line 5 (no contract slice), line 13 (SHL-21 ordering note), line 46 (the Shell consumes the setup-status route and schema), lines 88 to 91 (testing principles).
- `units/README.md`: lines 61 to 65 (blocker notation), line 85 (the SHL-21 row, ungated), line 124 (the SHL-21 note).
- `plans/PLT-02.md`: section headings at lines 11, 35, 60, 77, 89 and 95 (the structure this plan follows).
- `apps/web/src/app/shell/contract-chunks.ts`: line 12 `return import('@bbartolome/scriba-contracts/setup-auth');`; lines 6 to 10 the signature and the `Pick`; lines 1 to 5 the comment.
- `apps/web/src/app/shell/landing.ts`: line 5 (its import, the only importer found by grep of `apps/web/src`), line 49 (`contract.SETUP_STATUS_ROUTE` and `contract.setupStatusSchema`), lines 58 to 60 (the catch that shows the alert).
- `apps/web/src/app/shell/api-client.ts` line 51: `if (path.startsWith('//')) {`.
- `apps/web/src/app/features/setup-auth/setup-contract.ts`: lines 7 to 8 (the comment on the CommonJS shapes), lines 10 to 11 (the `LoadedModule` type alias), lines 24 to 26 (the unwrap).
- `apps/web/src/app/features/setup-auth/setup-contract.spec.ts`: line 3 (`vi.hoisted` counter), lines 5 to 7 (comment on the hoisting limit), lines 8 to 11 (`vi.mock` with `{ default: await importOriginal() }`), lines 13 to 29 (X5, one test). It has no named-export case. Grep of `apps/web/src` finds `vi.mock`, `importOriginal` and `resetModules` only in this file.
- `packages/contracts/src/setup-auth/routes.ts` line 4 (`SETUP_STATUS_ROUTE = '/api/setup-auth/status'`); `status.ts` lines 17 (`setupStepsSchema`), 27 (`composeVersionStatusSchema`) and 34 to 38 (`setupStatusSchema`).
- `packages/contracts/package.json` lines 10 to 12 (the `./setup-auth` export). `packages/contracts/dist` does not exist.
- `apps/web/package.json`: line 6 (`build`), line 8 (`test`), line 9 (`lint`), line 36 (`vitest` 5.1.0). `apps/web/tsconfig.json` lines 14 to 15 (`module`, `moduleResolution`). `apps/web/tsconfig.spec.json`: `types: ["vitest/globals"]`, include `src/**/*.spec.ts`. `apps/web/angular.json` line 76 (`@angular/build:unit-test`) and the production budgets (500 kB warning, 1 MB error).
- Root `package.json`: line 11 and 12 (`engines.node` `>=26 <27`), line 23 (`build`), line 25 (`test`), line 26 (`lint`), line 39 (`vitest` 5.1.0).
- `.prettierrc.json`: `singleQuote`, `trailingComma: all`. `.prettierignore` lines 1 to 3 (`/units/`, `/modules/`, `/plans/`): `prettier --check .` does not read `plans/SHL-21.md`.
- `node_modules/vitest/dist/index.d.ts`: line 645 (`mock`), line 656 (the `doMock` doc: "Mocks every subsequent dynamic import call"), line 666 (`doMock` declaration), lines 819 to 821 (the `resetModules` doc: top-level imports are not re-evaluated), line 824 (`resetModules` declaration).
- `node_modules/vitest/dist/chunks/index.Bi0NXYPf.js`: lines 300 to 315 (the keys the mock proxy passes through: `__esModule` and well-known symbols; no `default`), line 404 (the function-mock path), lines 448 to 460 (the proxy's get trap), line 457 (the "No ... export is defined on the mock" throw).
- `node_modules/@angular/build/src/builders/unit-test/runners/vitest/plugins.js` lines 193 to 195 (`globals: true`, `isolate: false`); `schema.json` lines 16 to 20 (runner default `vitest`), lines 45 to 46 (`include` default and its base).
- `plans/SHL-08.md` line 3 (`status: done`) and line 50 (the branch rule precedent). `plans/SAU-01.md` line 3 (`status: done`). `plans/SAU-08.md` line 108 (step (e)). `plans/SAU-06.md` line 31 (row R5.1: under `ng test` the namespace has the named exports and no `default`; a measurement at `11e1d38`, reported and not repeated here).
- `plans/DECISIONS.md`: line 2921 (SAU-06's step 0 builds `dist`), line 2702 (SHL-08's build record: the initial budget warning), lines 3960 to 3962 (the cause), lines 3965 to 3970 (the SAU-08 Navigator decision, option (b), and what SHL-21 covers).
- Git: HEAD `88640b5` on `main`; `git status --short` empty; `apps/web/src/app/shell/contract-chunks.spec.ts` and `plans/SHL-21.md` did not exist before this plan was written.

**Assumed (not checked).**
- The namespace type of `import('@bbartolome/scriba-contracts/setup-auth')` has no `default` key under the web tsconfig. The cast form works either way (open point 1; step 8 checks).
- `vi.doMock` reaches the loader's dynamic import and uses the function-mock path (open point 6; step 3 checks).
- `isolate: false` shares the module cache between spec files of one run. Not verified in source. The `afterEach` cleanup guards against it, and step 7 checks X5 in the same run.
- The red and green results in section 4 are predictions from reading the code. No test was run while planning.
- The production build's lazy chunk has only `default` (unit lines 16 to 17, which cite the SAU-08 evidence). Not re-checked here.
- Node 26 and npm 11.20.0 are on the implementer's PATH (the root `engines` and `packageManager` fields say so). Not checked.
