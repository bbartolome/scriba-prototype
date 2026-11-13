---
id: SAU-01
status: done
---
# SAU-01 plan — setup-auth contract slice

Batch: [SAU-01] alone (Setup & auth, phase:contract, M1, main track; the only unit of its batch). Revision 2: applies the Opus rejection of revision 1 (DECISIONS 2026-11-13, "SAU-01 — Opus plan review of revision 1", commit ecf29e2). Base: main at 08c2ce5 (holds SHL-01 to SHL-07); main has since gained DECISIONS-only commits. This plan was written from the local checkout only. Nothing was built, installed, tested, committed or pushed while writing it.

## 1. Decisions this plan follows

Each item gives its source. FACT means the planner checked it (how is in section 7a), or the item is a recorded decision. ASSUMED means a choice made here (section 7b).

- **Scope.** Zod and TypeScript shapes and constants only; no runtime code beyond schemas and constants. Source: unit lines 14 and 32. FACT (unit text).
- **Shapes.** Exactly the shapes of unit lines 17 to 25, the example payloads of line 27, and the choices below. Source: unit lines 17 to 27. FACT.
- **Subpath and build.** `./setup-auth` is already in the exports map with `types` and `default`, and the map has no `"."` entry. Output is CommonJS. Source: packages/contracts/package.json lines 10 to 13; DECISIONS 2026-11-11 "output format: CommonJS" (line 170); PLT-02 plan section 1. FACT.
- **Dependencies.** The runtime dependency stays `zod` only (`^4.6.7`). No package.json or lockfile change. Source: package.json lines 52 to 57; DECISIONS 2026-11-10 PLT-01 Option B entry (line 13). FACT.
- **File pattern.** One file per concern. `index.ts` re-exports each with `export * from './<file>.js';`, as src/platform/index.ts does. Source: src/platform/index.ts. FACT.
- **Test pattern.** A `*.schema.test.ts` file that uses `safeParse`, plus a CJS consumer fixture run with `process.execPath`, as boot.test.ts does. Source: test/platform.schema.test.ts; test/boot.test.ts lines 18 and 32; PLT-02 plan section 1. FACT.
- **Example payloads are exported.** They are shapes (unit line 27), and criterion 1 requires the subpath to export every shape. They live in `src/setup-auth/examples.ts` as `as const` objects with no functions, and are re-exported from `index.ts`. Criterion 3 allows constants. Source: unit lines 27 and 30; DECISIONS 2026-11-13 SAU-01 review of revision 1, item 1. FACT (recorded decision).
- **Seam.** External behaviour only: the exported schemas and constants, and the built CJS output. Source: modules/setup-auth.md lines 49 to 52. FACT.
- **No function exports.** `setup-auth.exports.test.ts` asserts that no export of the subpath is a function, as PLT-02's fixture pattern does. Zod 4 schemas are `typeof 'object'`, checked by the reviewer on 4.6.6; step 9 re-checks on 4.6.7. Source: DECISIONS 2026-11-13 SAU-01 review of revision 1, item 2. FACT (recorded decision).
- **Setup status.** `{steps: {access, tailscale, providers, preferences, firstProject}, complete, compose}`, with step states `pending | done | skipped`. Source: unit line 17; SAU-09 line 18. FACT.
- **Step update body.** `{state: 'done' | 'skipped'}`. The step key is in the path (`SETUP_STEP_ROUTE`), not in the body. Source: SAU-09 line 25 (its criterion names only these two states). The two-state body: ASSUMED.
- **Tailscale status.** `backendState` is required, because the unit gives it no `?`. When `available` is false it reads `NoState`. Source: unit line 20; SAU-17 line 22. The `NoState` value for the unavailable case: ASSUMED.
- **dnsName.** No trailing dot, enforced by a regex constant and not by a refinement, because a refinement is a function and criterion 3 forbids functions in src. Source: unit line 20. ASSUMED.
- **URLs.** `authURL` and `tailnetURL` are validated with `z.url()`. Source: unit line 20; SAU-17 line 22. That zod 4.6.7 has `z.url()`: ASSUMED, checked at step 3 of section 3.
- **Identity.** A union on `via`. The tailnet `login` is a non-empty string. Source: unit line 19; SAU-03 line 26; SAU-18 line 23. Shape FACT; non-empty ASSUMED.
- **Compose status.** `state` is `ok | mismatch | unknown`. `expected` is an integer and always present. `actual` is an optional integer and is absent when the variable is unset. Source: unit line 24; SAU-10 lines 18 and 19; src/platform/http.ts line 24 (`composeVersion` is an integer); deploy/compose.yaml line 43 (bare `SCRIBA_COMPOSE_VERSION:`, so the unset case reaches `unknown`). Optionality of `actual`: ASSUMED.
- **Preferences.** `authorName` and `defaultGenrePack` are optional strings. The POST body uses the same schema, so a request with one field changes only that field. Source: unit line 22; SAU-09 lines 20 and 21; SAU-13 line 15. Reuse as the body: ASSUMED.
- **Allowlist.** `{enabled: boolean, logins: string[]}`. The update body is its `.partial()`. Source: unit line 21; SAU-19 line 18. Partial body: ASSUMED.
- **setupAuth section.** `schemaVersion` is the literal 1. The keys are steps, complete, preferences and allowlist. The contract does not hold the default object; SAU-02 owns it (SAU-02 line 25). Source: unit line 23; SAU-02 line 25; SAU-09 line 19. Keys FACT; default ownership ASSUMED.
- **Unknown keys.** Every SAU-01 object schema is a `z.object`, so unknown keys are stripped on parse and not refused. Platform's section schema keeps unknown keys (`z.looseObject`, src/platform/settings.ts line 17). Source: SHL-03 unit line 19 (forward compatibility under expand–contract). ASSUMED.
- **Routes, fixed paths.** `/api/setup-auth/status` (SAU-05 line 15); `/api/setup-auth/handshake` (unit line 25; SAU-03 line 18); `/api/setup-auth/identity` (unit line 25; SAU-03 line 26). Source as listed. FACT.
- **Routes, chosen paths.** The other six paths (`continue`, `steps/:step`, `sign-out`, `tailscale/status`, `allowlist`, `preferences`) and the names of the nine route constants. Source for the set of routes: unit line 25; modules/setup-auth.md line 40; units/README.md, "Conventions shared by every module" (reads are GET, commands are POST). The six paths and the names: ASSUMED.
- **Handshake.** Redirect status 303. `Referrer-Policy` value `no-referrer`. Targets `/setup` and `/`. Source: unit line 18; SAU-03 line 18. FACT for the values.
- **Error codes.** The seven codes of unit line 26, checked against platform's pattern (src/platform/errors.ts line 21). The statuses of the five AUTH codes come from unit line 26. The unit gives no status for SETUP_TOKEN_INVALID and SETUP_ALLOWLIST_LOCKOUT, so this plan sets them to 401 and 403. ASSUMED for those two.
- **SSE.** None. Source: modules/setup-auth.md line 43. FACT.
- **No guard.** SAU-01 has no runtime guard. The Shell's hand-written guards belong to the Shell units. Source: criterion 3; DECISIONS 2026-11-13 zod entry (line 1084). FACT (decision).
- **Platform unchanged.** `ERROR_CODE_PREFIXES` already has SETUP and AUTH (src/platform/errors.ts lines 4 to 14). `SETTINGS_SECTION_KEYS` already has setupAuth (src/platform/settings.ts lines 7 to 13). `PUBLISHING_MODULE_SLUGS` already has setup-auth (src/platform/slugs.ts line 22). FACT.
- **Build and test scripts unchanged.** `build` is the tsc build plus a noEmit check; `test` is build then vitest run (package.json lines 48 and 49). FACT.
- **Existing consumer.** apps/web/src/contracts-boot.ts line 5 namespace-imports setup-auth and keeps building. Zod is already in that bundle through platform (src/platform/events.ts line 1; apps/web/src/contracts-boot.ts line 4). FACT.

## 2. Files to create or change

Shared files: none. The batch is SAU-01 alone. Not changed: packages/contracts/package.json, package-lock.json, packages/contracts/tsconfig.json, tsconfig.build.json, src/platform/*, test/boot.test.ts, test/package-deps.test.ts, scripts/*, apps/*. plans/DECISIONS.md is not edited here; the coordinator records the two ASSUMED statuses if it wants them on record.

| Path | Change | Purpose |
|---|---|---|
| `packages/contracts/src/setup-auth/index.ts` | edit | replaces `export {};` with seven lines `export * from './<file>.js';`, one per file below, examples included |
| `packages/contracts/src/setup-auth/identity.ts` | new | `identitySchema` (union on `via`); type `Identity` |
| `packages/contracts/src/setup-auth/tailscale.ts` | new | `BACKEND_STATES` (the six names), `backendStateSchema`, `tailscaleStatusSchema`; types `BackendState`, `TailscaleStatus` |
| `packages/contracts/src/setup-auth/status.ts` | new | `SETUP_STEP_KEYS`, `SETUP_STEP_STATES`, `setupStepKeySchema`, `setupStepStateSchema`, `setupStepsSchema`, `composeVersionStatusSchema`, `setupStatusSchema`, `stepUpdateSchema` (`z.object({state: z.enum(['done', 'skipped'])})`; the step key is in the path, not the body); types `SetupStep`, `SetupStepState`, `ComposeVersionStatus`, `SetupStatus`, `StepUpdate` |
| `packages/contracts/src/setup-auth/settings.ts` | new | `SETUP_AUTH_SECTION_SCHEMA_VERSION` (1), `preferencesSchema`, `allowlistSchema`, `allowlistUpdateSchema`, `setupAuthSectionSchema` (imports `setupStepsSchema` from `./status.js`); types `Preferences`, `Allowlist`, `SetupAuthSection` |
| `packages/contracts/src/setup-auth/routes.ts` | new | `SETUP_STATUS_ROUTE` `/api/setup-auth/status`; `SETUP_CONTINUE_ROUTE` `/api/setup-auth/continue`; `SETUP_STEP_ROUTE` `/api/setup-auth/steps/:step`; `HANDSHAKE_ROUTE` `/api/setup-auth/handshake`; `IDENTITY_ROUTE` `/api/setup-auth/identity`; `SIGN_OUT_ROUTE` `/api/setup-auth/sign-out`; `TAILSCALE_STATUS_ROUTE` `/api/setup-auth/tailscale/status`; `ALLOWLIST_ROUTE` `/api/setup-auth/allowlist`; `PREFERENCES_ROUTE` `/api/setup-auth/preferences`; `HANDSHAKE_REDIRECT_STATUS` (303); `HANDSHAKE_REFERRER_POLICY` (`no-referrer`); `SETUP_PAGE_PATH` (`/setup`); `LANDING_PATH` (`/`); `handshakeQuerySchema` (`{token}`, non-empty string); type `HandshakeQuery` |
| `packages/contracts/src/setup-auth/errors.ts` | new | `SETUP_AUTH_ERROR_CODES` (short key to full code, as `PLATFORM_ERROR_CODES` does: REQUIRED, HOST_REJECTED, ORIGIN_REJECTED, TAILNET_IDENTITY_MISSING, TAILNET_NOT_ALLOWED, TOKEN_INVALID, ALLOWLIST_LOCKOUT); `SETUP_AUTH_ERROR_STATUS` keyed by full code (401, 403, 403, 403, 403, 401, 403) |
| `packages/contracts/src/setup-auth/examples.ts` | new | `SETUP_AUTH_EXAMPLES`, one `as const` object with the keys `identityLoopback`, `identityTailnet`, `tailscaleNeedsLogin`, `tailscaleRunning`, `tailscaleUnavailable`, `setupStatus`, `composeOk`, `composeMismatch`, `composeUnknown`, `stepUpdateDone`, `stepUpdateSkipped`, `preferences`, `preferencesEmpty`, `allowlist`, `setupAuthSection`, `handshakeQuery`. No import line, no functions |
| `packages/contracts/test/setup-auth.schema.test.ts` | new | criterion 2: each entry of `SETUP_AUTH_EXAMPLES` accepted by its schema, and the reject cases; `import type` of every type above (criterion 1, type part); `import { SETUP_AUTH_EXAMPLES }` from `../src/setup-auth/index.js`; route-prefix and error-constant checks |
| `packages/contracts/test/setup-auth.exports.test.ts` | new | criterion 1, runtime part: the export names are present. Criterion 3, committed: no export is a function. Spawns the fixture with `process.execPath` |
| `packages/contracts/test/fixtures/nest-style/setup-auth-consumer.cjs` | new | CJS consumer: requires `@bbartolome/scriba-contracts/setup-auth`; prints JSON with the sorted export names and the `typeof` of each export |
| `units/SAU-01-contract-slice.md` | edit, at close-out only | ticks the three criteria (lines 30 to 32) |
| `plans/SAU-01.md` | edit, at close-out only | the front matter status line is set to its closing value by the coordinator |

## 3. Method

Run from `/Users/bbartolome/workspace/scriba-prototype`. The implementer creates the branch; this planning run creates none. The planner ran no build, test or install, because those would write `dist/` and `node_modules`. The planner's versions: node v26.13.0 and npm 11.20.0. Record `node -v` and `npm -v` beside each result.

1. **Preconditions.** Three checks, because HEAD moves with DECISIONS-only commits and this plan file is untracked until it is committed:
   - `git status --short -- ':!plans'`: expected empty.
   - `git merge-base --is-ancestor 08c2ce5 HEAD`: expected exit 0.
   - `git diff --quiet 08c2ce5 HEAD -- apps packages`: expected exit 0 (no code change since the base).
   Then `git switch -c unit/SAU-01`: expected `Switched to a new branch 'unit/SAU-01'`. The planner ran the three checks on this checkout: all pass.
2. **Restore dependencies.** `npm ci`: expected exit 0. Before this step the planner found `node_modules/zod` and `node_modules/@types/node` absent, and `packages/contracts/node_modules` holding only `.vite`. After it, `ls -d node_modules/zod packages/contracts/node_modules/zod`: expected both paths listed.
3. **Check the zod API.** `node -e "const {z}=require(require.resolve('zod',{paths:[process.cwd()+'/packages/contracts']})); console.log(['url','enum','literal','object','discriminatedUnion','looseObject'].map(k=>typeof z[k]).join(' '))"`: expected `function function function function function function`. If `z.url` is not a function, use `z.string().regex(/^https:\/\//)` for the two URL fields and record the change.
4. **Baseline on main.** `npm run build -w @bbartolome/scriba-contracts`: expected exit 0. `npm test -w @bbartolome/scriba-contracts`: expected exit 0, with "Test Files 4 passed" (smoke, platform.schema, boot, package-deps). If either fails, stop and report: main is not green.
5. **Write the files** in section 2. Write the `src/setup-auth` files first (examples.ts included), then the two tests and the fixture, and edit `index.ts` last.
6. **Format.** `npx prettier --write packages/contracts/src/setup-auth packages/contracts/test/setup-auth.schema.test.ts packages/contracts/test/setup-auth.exports.test.ts packages/contracts/test/fixtures/nest-style/setup-auth-consumer.cjs`: expected exit 0, each file reported.
7. **Type check.** `npx tsc --noEmit -p packages/contracts/tsconfig.json`: expected exit 0 and no output. This also proves that every `import type` name in the schema test is exported.
8. **Build.** `npm run build -w @bbartolome/scriba-contracts`: expected exit 0. `ls packages/contracts/dist/setup-auth`: expected `index.js`, `index.d.ts`, and a `.js` and `.d.ts` pair for each of identity, tailscale, status, settings, routes, errors and examples. `head -n 1 packages/contracts/dist/setup-auth/index.js`: expected `"use strict";`.
9. **Package tests.** `npm test -w @bbartolome/scriba-contracts`: expected exit 0, with six files passing: smoke, platform.schema, boot, package-deps, setup-auth.schema, setup-auth.exports. The exports test carries the committed no-function check (criterion 3).
10. **Source check for criterion 3 (extra to step 9).** `grep -nE '=>|function|class ' packages/contracts/src/setup-auth/*.ts`: expected no output. If a comment trips it, reword the comment. `grep -h '^import' packages/contracts/src/setup-auth/*.ts | sort -u`: expected exactly `import { z } from 'zod';` and `import { setupStepsSchema } from './status.js';`; `examples.ts` contributes no import line. `grep -n 'SETUP_AUTH_EXAMPLES' packages/contracts/test/setup-auth.schema.test.ts | head -n 1`: expected the import line that names it, from `../src/setup-auth/index.js`.
11. **Root gates.** `npm run build`: expected exit 0. `npm test`: expected exit 0; this includes scripts/subpaths.test.mjs (exactly ten exports keys, resolution from apps/api) and scripts/pins.test.mjs. `npm run lint`: expected exit 0, ending with `All matched files use Prettier code style!`.
12. **Consumer regression.** `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot`: expected exit 0. The contracts-boot namespace for setup-auth now has real exports. Its zod comes from one place: `npm ls zod -w @bbartolome/scriba-contracts` expected to print the contracts package with a single child, `zod@4.6.7`, and no second zod entry under it; `node -p "require.resolve('zod',{paths:[process.cwd()+'/packages/contracts']})"` expected to print a path under `packages/contracts/node_modules/zod`. The bundle is not grepped; the resolution check is the evidence.
13. **Runtime dependency.** `npm ls --omit=dev -w @bbartolome/scriba-contracts`: expected the package with one child, `zod`.
14. **Commit and fresh clone.** Commit on `unit/SAU-01` with the message `feat(SAU-01): publish the setup-auth contract slice`. Then `git clone --branch unit/SAU-01 /Users/bbartolome/workspace/scriba-prototype /tmp/sau01-fresh` (an empty target), and in it `npm ci && npm run build && npm test && npm run lint`: expected each exits 0.
15. **Close-out.** A second commit, `docs(SAU-01): tick the passed criteria`, ticks lines 30 to 32 of the unit and updates this plan's status line as the coordinator directs. Report the exit code of each command in steps 1 to 14.

## 4. Acceptance criteria tests

The unit has three criteria, numbered 1 to 3 as in the unit (lines 30 to 32). All three run locally. None needs Docker, tailscaled or a browser. The only external need is registry access for `npm ci` (open point 1).

**Criterion 1** (unit line 30): "The subpath exports every shape above and builds as part of the contracts package."
- Build: step 8. Expected: exit 0, and the dist/setup-auth files exist, including examples.js and examples.d.ts.
- Runtime: `test/setup-auth.exports.test.ts` spawns the fixture under `process.execPath`. Expected: exit 0, and the exported names include each of `identitySchema`, `backendStateSchema`, `BACKEND_STATES`, `tailscaleStatusSchema`, `SETUP_STEP_KEYS`, `SETUP_STEP_STATES`, `setupStepKeySchema`, `setupStepStateSchema`, `setupStepsSchema`, `composeVersionStatusSchema`, `setupStatusSchema`, `stepUpdateSchema`, `preferencesSchema`, `allowlistSchema`, `allowlistUpdateSchema`, `setupAuthSectionSchema`, `SETUP_AUTH_SECTION_SCHEMA_VERSION`, the nine route constants, `handshakeQuerySchema`, `HANDSHAKE_REDIRECT_STATUS`, `HANDSHAKE_REFERRER_POLICY`, `SETUP_PAGE_PATH`, `LANDING_PATH`, `SETUP_AUTH_ERROR_CODES`, `SETUP_AUTH_ERROR_STATUS` and `SETUP_AUTH_EXAMPLES`.
- Types: step 7. Expected: exit 0 with the `import type` list in the schema test (Identity, BackendState, TailscaleStatus, SetupStep, SetupStepState, ComposeVersionStatus, SetupStatus, StepUpdate, Preferences, Allowlist, SetupAuthSection, HandshakeQuery). A missing export fails with TS2305.

**Criterion 2** (unit line 31): "Zod schemas accept the example payloads and reject malformed ones (wrong BackendState, missing login on a tailnet identity, unknown step state)."
- Test: `test/setup-auth.schema.test.ts`, run in step 9.
- Expected, accepted (`success` true): every entry of `SETUP_AUTH_EXAMPLES` through its schema. Mapping: `identityLoopback` and `identityTailnet` through `identitySchema`; the three `tailscale*` entries through `tailscaleStatusSchema` (NeedsLogin with `authURL`; Running with `dnsName`, `tailnetURL`, `magicDNSEnabled`, `httpsCertsEnabled` and `ownerLogin`; unavailable with `available` false and `backendState` NoState); `setupStatus` through `setupStatusSchema` (steps in mixed states including `skipped`, `complete` false, compose `unknown`); the three `compose*` entries through `composeVersionStatusSchema`; `stepUpdateDone` and `stepUpdateSkipped` through `stepUpdateSchema`; `preferences` and `preferencesEmpty` through `preferencesSchema`; `allowlist` through `allowlistSchema`; `setupAuthSection` through `setupAuthSectionSchema`; `handshakeQuery` through `handshakeQuerySchema`.
- Expected, rejected (`success` false), named first: (a) wrong BackendState: `Connected`, and lower-case `running`; (b) missing login: `{via: 'tailnet'}`, and `login: ''`; (c) unknown step state: `access: 'started'`. Also rejected: a step key missing (no `firstProject`); `dnsName` with a trailing dot; `authURL` of `not-a-url`; compose state `broken`; compose `expected` 1.5; step update state `pending`; setupAuth `schemaVersion` 2; allowlist `logins: [1]`; handshake `token: ''`; identity `via: 'peer'`.
- Expected: each of the seven SETUP_AUTH error codes passes `errorCodeSchema`, and `SETUP_` alone fails it.
- Extra tests, not named by the criterion, pinned by this plan: an unknown key is stripped; every route constant starts with `/api/setup-auth/` and is unique; `Object.keys(setupStatusSchema.shape.steps.shape)` equals `SETUP_STEP_KEYS`; the keys of `SETUP_AUTH_ERROR_STATUS` equal the code values.

**Criterion 3** (unit line 32): "No runtime code beyond schemas and constants."
- Committed test: `test/setup-auth.exports.test.ts`, run in step 9. The fixture reports the `typeof` of every export of `@bbartolome/scriba-contracts/setup-auth`. Expected: no export has `typeof` `'function'`, and every export is one of `object`, `string`, `number` or `boolean`. This is the PLT-02 pattern, applied to the subpath.
- Extra: step 10, the grep for `=>`, `function` and `class` in src prints nothing, and the import list is only zod and `./status.js`.
- Dependencies: step 9, `test/package-deps.test.ts`, unchanged, passes. Expected: `dependencies` is `['zod']`, and the built setup-auth JS requires only zod and relative files.
- The dist is not grepped for functions. TypeScript's CommonJS emit for `export *` adds helper functions to each file, and those are not authored code. The committed `typeof` test covers the dist's actual exports.

## 5. Agreement with downstream units

The downstream set is SAU-02 (named in SAU-01's unblocks), SHL-08 (the other name in unblocks), every setup-auth unit that uses the contract (SAU-02 to SAU-21), and the Shell units named in the brief. Only SHL-08 consumes the setup-status route (modules/shell.md line 43); see open point 5.

| Unit | Needs from SAU-01 | Provided |
|---|---|---|
| SAU-02 (token store, setupAuth section) | `setupAuthSectionSchema` and its keys; AUTH_REQUIRED from the error constants. The default object is SAU-02's | Yes |
| SAU-03 (handshake, cookie, identity) | `identitySchema`; `HANDSHAKE_ROUTE`, `handshakeQuerySchema`, the 303 and no-referrer constants, `SETUP_PAGE_PATH`, `LANDING_PATH`; `IDENTITY_ROUTE`, `SIGN_OUT_ROUTE`; SETUP_TOKEN_INVALID. The wrong-token page is HTML; the contract gives it only a code | Yes |
| SAU-04 (global guard) | `Identity` as the accessor's return type; AUTH_HOST_REJECTED, AUTH_REQUIRED, AUTH_ORIGIN_REJECTED. The fixed public route set is SAU-04's, not a contract shape | Yes |
| SAU-05 (status, Continue) | `setupStatusSchema`, `SETUP_STATUS_ROUTE`, `SETUP_CONTINUE_ROUTE`, `composeVersionStatusSchema` (`unknown` needs no `actual`) | Yes |
| SAU-06 (minimal /setup page) | `Identity` and `SetupStatus` for the fake client; AUTH_REQUIRED for the 401 notice; AUTH_TAILNET_IDENTITY_MISSING and AUTH_TAILNET_NOT_ALLOWED for its tailnet explanations (criterion line 20). These are 403 codes, so the notice is not reachable through the Shell's 401 path (open point 9). `SETUP_AUTH_EXAMPLES` may seed the fake client | Yes |
| SAU-07 (invariant tests) | Route constants only; the public route list is SAU-04's | Yes |
| SAU-08 (token-guard gate) | `HANDSHAKE_ROUTE`, `SETUP_STATUS_ROUTE`, the status shape for the e2e step | Yes |
| SAU-09 (setup-flow API) | `setupStepsSchema`, `stepUpdateSchema`, `SETUP_STEP_ROUTE`, `preferencesSchema`, `PREFERENCES_ROUTE`, `setupAuthSectionSchema`. A reset to `pending` would need an expand change; the criteria do not ask for one | Yes |
| SAU-10 (compose status) | `composeVersionStatusSchema` (ok, mismatch, unknown); `expected` comes from platform's `versionInfoSchema.composeVersion`, already exported | Yes |
| SAU-11 (wizard, routing) | `setupStatusSchema`, `SETUP_STEP_KEYS`, `SETUP_STEP_STATES` | Yes |
| SAU-12 (providers step) | The `providers` key and states. Provider shapes belong to Model providers | Yes |
| SAU-13 (preferences step) | `preferencesSchema`, `PREFERENCES_ROUTE`, `stepUpdateSchema` | Yes |
| SAU-14 (first-project step) | The `firstProject` key; `defaultGenrePack` as a string. Project store shapes come from PST-01, not from SAU-01 | Yes |
| SAU-15 (settings page) | `Identity` variants, `composeVersionStatusSchema`, `preferencesSchema`, `SETUP_STATUS_ROUTE`, `SIGN_OUT_ROUTE` | Yes |
| SAU-16 (setup-flow gate) | No new shape; uses the above | Yes |
| SAU-17 (LocalAPI client, status) | `tailscaleStatusSchema`, `backendStateSchema` (six states), `TAILSCALE_STATUS_ROUTE`. The LocalAPI field mapping is SAU-17's | Yes |
| SAU-18 (tailnet guard path) | `identitySchema` (tailnet member); AUTH_HOST_REJECTED, AUTH_ORIGIN_REJECTED, AUTH_TAILNET_IDENTITY_MISSING | Yes |
| SAU-19 (owner allowlist) | `allowlistSchema`, `allowlistUpdateSchema`, `ALLOWLIST_ROUTE`; AUTH_TAILNET_NOT_ALLOWED; SETUP_ALLOWLIST_LOCKOUT (its 403 is ASSUMED here, open point 2) | Yes |
| SAU-20 (Tailscale UI) | `tailscaleStatusSchema` fields (`authURL`, `tailnetURL`, `magicDNSEnabled`, `httpsCertsEnabled`), `TAILSCALE_STATUS_ROUTE`, allowlist types | Yes |
| SAU-21 (tailnet gate) | Error codes and identity only | Yes |
| SHL-08 (landing) | `SETUP_STATUS_ROUTE` and `setupStatusSchema`, its only use of /setup-auth. Runtime cost and the guard are SHL-08's (open point 3) | Yes |
| SHL-02 (typed API client) | Nothing from setup-auth. A 401 goes to a fixed path | Nothing needed |
| SHL-03 (SSE client) | Nothing from setup-auth. It uses the platform envelope | Nothing needed |
| PLT-11 contracts-boot (apps/web/src/contracts-boot.ts) | Keeps building with real exports | Yes; step 12 checks it |

## 6. Open points

1. `npm ci` needs registry access. The checkout has no zod in node_modules (section 7a), so no local substitute exists. If it fails, stop and report.
2. SETUP_TOKEN_INVALID (401) and SETUP_ALLOWLIST_LOCKOUT (403) are statuses chosen here. The unit gives none. The coordinator confirms them and records them in DECISIONS if it wants them on record.
3. SHL-08 runtime cost. CommonJS cannot be tree-shaken, so importing any value from `/setup-auth`, even `SETUP_STATUS_ROUTE`, loads zod's CommonJS build. DECISIONS 2026-11-13 (line 1084) gives two options, and SHL-08 chooses between them: (a) a dynamic import in its own chunk; (b) a dedicated build configuration with `allowedCommonJsDependencies`, as contracts-boot has. A third option, a copied constant, is not in that entry and conflicts with SHL-08 lines 16 and 19. SAU-01 adds no guard (criterion 3).
4. Unit text: the front matter `unblocks` names SHL-08 as "Frontend shell landing and project routes (SHL-08)", but SHL-08's own title differs. A text fix only; not made here.
5. Brief correction: only SHL-08 consumes the setup-status route (modules/shell.md line 43). SHL-02 and SHL-03 do not.
6. API code that passes a contract schema to a zod-typed parameter hits the duplicate zod typing (root 4.6.6, contracts 4.6.7; DECISIONS 2026-11-12, PLT-05 review at line 572, fix at line 591). SAU-02 onward types such parameters structurally.
7. `setup-auth` is in PUBLISHING_MODULE_SLUGS, but modules/setup-auth.md line 43 says no SSE events in v1. No change proposed.
8. SHL-02 unit line 19 says callers pass Zod schemas, but DECISIONS 2026-11-13 (line 1084) says the Shell ships no runtime zod. Outside SAU-01; flagged to the coordinator.
9. SAU-06's tailnet notice cannot be reached. AUTH_TAILNET_IDENTITY_MISSING and AUTH_TAILNET_NOT_ALLOWED are 403 (unit line 26), but SHL-02 line 21 routes only 401s to `/setup`, so SAU-06's tailnet explanations (SAU-06 line 17) never see those codes from a 403 response. Not SAU-01's to fix; SHL-02 or SAU-06 must decide.

## 7. Facts checked and assumed

(a) Checked by the planner, by reading or grep only. No build, install or test was run.
- `git rev-parse main` is `08c2ce5` at planning time; the tree is clean apart from this plan; node v26.13.0 and npm 11.20.0. HEAD is now ecf29e2, a DECISIONS-only commit. The three precondition checks of step 1 pass on this checkout.
- Units read: SAU-01 (front matter lines 1 to 9; shapes lines 16 to 27; criteria lines 30 to 32); SAU-02 to SAU-21; SHL-02, SHL-03, SHL-08; units/README.md (format and blocker notation). A grep of units/*.md for SAU-01 shows that SAU-02 and SHL-08 have it in `blocked_by` (SHL-08 as "Setup & auth phase:contract (SAU-01)"), so the blocker inverse holds for those two. PLT-02 (line 9) and PLT-11 (line 9) name it in `unblocks`, and units/README.md (line 84) names it in the phase table.
- packages/contracts/package.json: the exports map has ten keys and no `"."`; `./setup-auth` is at lines 10 to 13; `dependencies` is `{"zod": "^4.6.7"}`; `devDependencies` has `@types/node` ^26.6.6; scripts are at lines 47 to 51.
- packages/contracts/src/setup-auth/index.ts is `export {};`. src/platform/ has slugs, events, errors, http, settings, env and index.
- packages/contracts/test/ has smoke, platform.schema, boot (`__dirname` at line 18; spawnSync at line 32), package-deps and fixtures/nest-style/consumer.cjs.
- tsconfig.json includes src and test and sets `types: ["node"]`; tsconfig.build.json includes src only; tsconfig.base.json is NodeNext.
- node_modules: vitest 5.1.0 and typescript 6.0.3 are present, with the @bbartolome links. node_modules/zod and node_modules/@types/node are absent. packages/contracts/node_modules holds only .vite. packages/contracts/dist is absent. package-lock.json has root zod 4.6.6 and packages/contracts/node_modules/zod 4.6.7.
- Root scripts: build; test (`npm test --workspaces && node --test 'scripts/*.test.mjs'`); lint (`npm run lint --workspaces && prettier --check .`). .prettierignore excludes /units/, /modules/ and /plans/; .gitignore excludes dist/.
- scripts/subpaths.test.mjs requires exactly the ten exports keys and needs the built dist.
- apps/web/src/contracts-boot.ts line 5 imports setup-auth; angular.json lines 51 to 56 hold the contracts-boot configuration; the apps/web build script is `ng build`.
- apps/api/src/modules contains only platform. Neither apps/web/src/app/features/setup-auth nor apps/api/src/modules/setup-auth exists.
- deploy/compose.yaml line 43 holds the bare `SCRIBA_COMPOSE_VERSION:`.
- PLT-02 and PLT-11 plan statuses are both `done`, and PLT-11's commits are on main.
- modules/setup-auth.md lines 40, 43 and 49 to 52; modules/shell.md line 43; SHL-02 lines 21 and 26; SAU-06 lines 17 and 20.
- DECISIONS: grep for SAU-01, setup-auth, setupAuth, subpath, contract and SAU. The entries read are the headings and matching lines of the entries at lines 13, 170, 212, 518, 572, 591, 788, 1084 and 1395 (the rejection of revision 1).
- eslint.config.mjs: the boundaries rules cover api modules and web features only; there is no contracts rule.

(b) Assumed, not checked here:
- zod 4.6.7 has `z.url()` (step 3 checks it).
- `npm ci` completes (needs the registry).
- Vitest 5 provides `__dirname` in the test files, as boot.test.ts relies on (PLT-02 open point 8).
- The four contracts test files pass on main today (step 4 checks it; the planner did not run them).
- zod 4 schemas are `typeof 'object'` on 4.6.7 (the reviewer checked 4.6.6; step 9 checks 4.6.7).
- The chosen route paths, the statuses of the two SETUP codes, the strip and optional choices, the dnsName regex, the two-state step update body and the NoState value. Each is marked ASSUMED in section 1.
