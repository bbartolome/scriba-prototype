---
id: SAU-15
status: done
unit: units/SAU-15-settings-page.md
---
# SAU-15 plan — Settings page and user-facing recovery documentation

Setup & auth, phase:setup-flow, M2, main track. Unit `units/SAU-15-settings-page.md`: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9), Decisions lines 14 to 23, acceptance criteria lines 25 to 27 (criterion 1 is line 26, criterion 2 is line 27). Written against `main` at `821d1d6`; revised against `main` at `cd3e911` (the commits since change only `plans/`). Nothing was built, installed, run or tested. The planner and the reviser ran reads, greps and `git` only.

**Availability (checked).** Blockers: SAU-06 (`plans/SAU-06.md` line 3, `status: done`), SAU-09 (`plans/SAU-09.md` line 3, `status: done`), SAU-10 (`plans/SAU-10.md` line 3, `status: done`) and SHL-09 (`plans/SHL-09.md` line 3, `status: done`). Their code is on `main`. `plans/QUEUE.md` line 9 lists SAU-15 as available. No `unit/SAU-15` branch exists. The unit is available.

Tags: FACT means checked (section 7). ASSUMED means not checked (section 8). DECISION means a choice made here, with its source (section 1b).

## 0. Revision record (2026-11-15)

The reviser compared each statement of the draft with the unit, the module, `plans/DECISIONS.md` (by grep), the downstream units, the other draft and planned plans, and the repository. Corrections:

1. **The platform values no longer come from a dynamic import.** The draft's D3 also loaded `@bbartolome/scriba-contracts/platform` dynamically. The Navigator settled that "the dynamic import stays the setup-auth rule only" (`plans/DECISIONS.md` lines 2548 and 2549, from the SHL-08 review at line 2507; confirmed unchanged at line 3396). For other contract values the settled route is type-only imports plus hand-written copies checked by a parity test (`plans/DECISIONS.md` line 1086; the same pattern as `apps/web/src/app/shell/platform-copies.ts` and `apps/web/src/app/features/tool-registry/project-store-copy.ts`). So the version path and its guard are a new feature file, `platform-copy.ts`, with its parity test P1 (D3, D15). The loader reads setup-auth only.
2. **S1's seam is the lazy route.** The draft created `SettingsPage` with `TestBed.createComponent`. The module's UI seam is "lazy routes with Angular's Vitest runner against a fake API client" (`modules/setup-auth.md` line 68; `units/README.md` line 136), and the SAU-11 revision rejected the same `createComponent` pattern for that reason (`plans/SAU-11.md` line 19). S1 now renders `/settings` with `RouterTestingHarness` under `provideRouter(APP_ROUTES)`, and re-renders through the not-found route as SAU-11's W2 does (`plans/SAU-11.md` line 136). The draft's assumption about `router.url` without an outlet is gone.
3. **S1 step 5 had no canned answer for the preferences POST.** `FakeApiClient` fails a request with no canned answer (`apps/web/src/app/shell/testing/test-doubles.ts` lines 89 to 93). Step 1 of the S1 script now registers it.
4. **S1 compares the one-liner with a literal in the spec**, not with the implementation's constant, so a typo in `COMPOSE_UPDATE_COMMAND` fails the test (the same correction as `plans/SAU-11.md` line 18).
5. **"Hidden for `ok`"** also checks that the page text does not contain the one-liner, which holds whether `ComposeWarning` renders an empty host or the page guards it with `@if`.
6. **The eight open points are closed** (section 6), each with its source. None is a criterion change, a settled module decision or a protected decision.
7. **SAU-11 is now in implementation** (`unit/SAU-11` at `b9bd8b1`, its red tests only). Section 5 says what that means for `compose-warning.ts`.
8. **Paths and counts.** Section 2 lists twelve paths (the copy and its spec are added). Step 7 expects N0 + 3 web tests.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the API and earlier plans (obeyed, not reopened)

- **Route and placement.** `/settings` is app-level, `minDeviceClass: 'phone'`, with a nav entry. Its one named export is `settingsRoutes` in `features/setup-auth/setup-auth.routes.ts`, and its entry goes in `app.routes.ts` above `'**'`. Sources: unit line 15; `modules/setup-auth.md` line 40; `plans/SHL-01.md` line 28 (decision 9); `plans/DECISIONS.md` line 941 (one named `Routes` export per owned path); `modules/shell.md` line 55; `plans/SAU-06.md` line 245 (the SAU-15 row).
- **Sections** (unit line 16): how this device is connected; preferences (the same fields as the step); providers (embeds the Model providers panel, or links to `/providers`); versions (app version and compose version from Platform's version info) with the compose-mismatch warning and the one-liner; recovery; re-run setup; sign out this browser. Tailscale status and the allowlist are added by SAU-20 (unit line 16, last clause).
- **Recovery** (unit lines 18 to 22): four steps, on the page and in the user docs. The docs state that the app can control tailscaled through the shared socket (unit line 23). `README.md` lines 72 to 74 already say so ("The app controls tailscaled through the shared socket. This is accepted for a single owner.").
- **Contract access.** Feature files read setup-auth values only through `setup-contract.ts`, by a dynamic import read as `mod.default ?? mod`. No other file of `features/setup-auth/` has a runtime import of the contract (`plans/SAU-06.md` decision 1a-12; the grep rule at `plans/SAU-06.md` line 176; `plans/DECISIONS.md` lines 2869 and 3395 to 3400). The dynamic import is the setup-auth rule only; values of other contracts are hand-written copies with a parity test (`plans/DECISIONS.md` lines 1084 to 1089, 2507, 2548 and 2549). The Shell ships no runtime zod (`plans/DECISIONS.md` line 1086).
- **Routes that exist on main.** `GET /api/setup-auth/status` with `compose` (`apps/api/src/modules/setup-auth/setup-status.controller.ts` line 22). `GET` and `POST /api/setup-auth/preferences`; the POST is a field-level merge that answers 200 with the merged preferences (`setup-flow.controller.ts` lines 22 to 33). `GET /api/setup-auth/identity` and `POST /api/setup-auth/sign-out` (204) (`setup-session.controller.ts` lines 101 to 122). `plans/SAU-09.md` line 124: SAU-15 reads GET status and GET preferences and adds no route. Versions come from Platform's version info, not from the status (`plans/SAU-10.md` line 127).
- **The one-liner.** `docker run --rm -e SETUP=true bbartolome/scriba | bash` (`units/SAU-10-compose-version-status.md` line 21; `scripts/entrypoint.sh` line 20). The README's Update section says to run it in the install folder (`README.md` line 35).
- **The compose warning is shared with SAU-11.** SAU-11 creates `compose-warning.ts` with `ComposeWarning` (selector `app-compose-warning`, input `compose`) and the constant `COMPOSE_UPDATE_COMMAND`; it renders nothing for `ok` and has no `role="alert"` (`plans/SAU-11.md` line 60, P7, and line 163). The Navigator's decision (`plans/DECISIONS.md` lines 4125 to 4142) gives the `/setup` warning to SAU-11; SAU-15's criterion (unit line 26) covers the settings page.
- **Providers panel.** `ProvidersPanel` (selector `app-providers-panel`, standalone, no inputs or outputs) is exported from `apps/web/src/app/features/providers/providers.routes.ts` (line 3), the only file another feature may import (`plans/MPR-09.md` line 77, D1). Hosts' tests stub it (`plans/MPR-10.md` line 107).
- **Sign-out is per browser.** `setup-session.controller.ts` line 120: the cookie is expired in this browser only, and a copy elsewhere stays valid until the token changes. `plans/SAU-03.md` line 153: "The SAU-15 copy should say so."
- **Existing copy.** The identity sentences (`plans/SAU-06.md` decision 1b-4; `setup-page.ts` lines 61 to 65). `sign-in-notice.ts`: `SIGN_IN_COMMAND` (line 4), `DOCKER_LOGS_COMMAND` (line 7), `tailnetExplanation` (line 19).
- **Replacing the token.** Replacing the token revokes every cookie (`modules/setup-auth.md`, "Settled decisions"). The token is loaded or created at boot, and `setup-url` is rewritten on every start (`apps/api/src/modules/setup-auth/setup-token.store.ts` lines 91 to 108).
- **Testing.** External behaviour only. UI tests render lazy routes with Angular's Vitest runner against the fake API client (`modules/setup-auth.md` lines 64 to 68; `units/README.md` line 136).

### 1b. Choices made by this plan (DECISION)

- **D1 Nav order 90.** The entry is `nav: { label: 'Settings', icon: 'settings', order: 90 }`. Items are sorted by `nav.order` (`plans/SHL-05.md` decision 11). The orders in use are 10 (Chat), 20 (Projects), 30 (Files) and 100 (Core gate) (`apps/web/src/app/app.routes.ts` lines 18, 95, 31, 70). 90 puts Settings after the content items and before the development page. The label and icon are the ones of `apps/web/src/app/shell/route-data.spec.ts` line 9. The order value is a choice (ASSUMED suitable, section 8).
- **D2 Entry position.** The `settings` entry goes directly after the `setup` entry (lines 77 to 88 of `app.routes.ts`) and before the `projects` entry (line 89). The two Setup & auth routes stay together.
- **D3 Contract loader (setup-auth only).** `setup-contract.ts` gains one exported function, `loadSettingsContract()`, appended after its last line (line 27). It makes one dynamic import of `@bbartolome/scriba-contracts/setup-auth` and returns `mod.default ?? mod`, typed as a `Pick` of: `IDENTITY_ROUTE`, `identitySchema`, `SETUP_STATUS_ROUTE`, `setupStatusSchema`, `SIGN_OUT_ROUTE`, `PREFERENCES_ROUTE`, `preferencesSchema`, `SETUP_PAGE_PATH` and `SETUP_AUTH_ERROR_CODES`. The existing function, its `Pick` (lines 13 to 27) and the header (lines 1 to 9) are not edited, so SAU-11's edits there do not collide. It does not import `/platform` (correction 1).
- **D4 Compose warning file.** `compose-warning.ts` uses the names of SAU-11's P7 exactly. For `mismatch`: "This install runs compose version {actual}, but this Scriba needs compose version {expected}." For `unknown`: "This install does not report its compose version, so it cannot be checked." Both then say "To update, run the one-liner in the install folder:" and show the one-liner in one `<code>`. For `ok` it renders nothing. No `role="alert"`. If SAU-11 is on `main` first, its file is used unchanged (section 5).
- **D5 Providers section embeds the panel.** `/providers` does not exist on main (`app.routes.ts` has no providers entry; `providers.routes.ts` lines 1 and 2 say MPR-11 adds it), and MPR-11 has no plan. The unit allows either (line 16), so the section embeds `<app-providers-panel />`.
- **D6 Preferences form.** `PreferencesForm` (selector `app-preferences-form`) has input `stored: Preferences` and output `save: Partial<Preferences>`. Two native inputs, `name="authorName"` and `name="defaultGenrePack"`, both free text (open point 2, closed). The form emits only the keys whose values changed; the Save button ("Save preferences") is disabled when none changed. The page posts the emitted keys to `PREFERENCES_ROUTE` with `preferencesSchema` as the response schema and then sets `stored` from the answer. The form makes no API call.
- **D7 Identity sentences are written again.** `settings-page.ts` holds the two identity sentences of `setup-page.ts` lines 61 to 65. It does not import them, because SAU-11 rewrites `setup-page.ts` (`plans/SAU-11.md` section 2). Open point 8, closed.
- **D8 Sign-out.** The button posts `SIGN_OUT_ROUTE` with body `{}`. The answer is 204 with no body (`setup-session.controller.ts` line 122), and the contract has no schema for it. The page reads it with a local `ResponseSchema<null>` that accepts `null` or `undefined`, the pattern of `apps/web/src/app/features/providers/providers-copies.ts` lines 285 to 291. On success the page navigates to `SETUP_PAGE_PATH` (`/setup`).
- **D9 Re-run setup.** The button navigates to `SETUP_PAGE_PATH` and sends no request. Re-running `/setup` is always allowed (`plans/SAU-11.md` line 35; `plans/SAU-06.md` line 245).
- **D10 Recovery wording.** The four steps keep the unit's order and words, with these additions, and the docs and the page use the same text:
  - Step 1 names the two commands through the constants `SIGN_IN_COMMAND` and `DOCKER_LOGS_COMMAND` (imported on the page, not copied).
  - Step 2: delete `~/Books/.scriba/setup-token`, then `docker compose restart` in the install folder (`README.md` line 49 names that command for starting the stack again).
  - Step 3 (the wipe) keeps the unit's list (settings, secrets, search indexes; projects untouched) and also names, as facts, the user's own tool packs (`packs/user/`) and the setup token, which the wipe also deletes (open point 3, closed). It stops the stack first (`docker compose stop`) and starts it again with `docker compose restart` (`README.md` lines 47 to 49). Folder contents: `settings.yaml` (`apps/api/src/modules/platform/settings/settings.file.ts` line 7), `secrets.yaml` (`apps/api/src/modules/providers/secrets/secrets-store.ts` line 25), `index/` (`apps/api/src/modules/project-store/search.service.ts` line 175), `packs/user/tools` (`apps/api/src/modules/tool-registry/packs.ts` lines 80 to 82), `setup-token` and `setup-url`. A project's own `.scriba/` folder is inside the project (`apps/api/src/modules/project-store/files.service.ts` line 490).
  - Step 4 keeps the unit's words (unit line 22; open point 4, closed).
  - The paths assume the default library folder `~/Books`. For another folder, use the `.scriba` folder inside the `SCRIBA_LIBRARY` value in `.env` (`scripts/entrypoint.sh` line 197 writes that key; line 139 builds `$LIBRARY/.scriba/setup-url`).
- **D11 Banner not built.** The unit makes the banner optional ("Optionally", unit line 17). `plans/SAU-10.md` line 127 also records that it is not built there. Open point 1, closed.
- **D12 Docs location.** The user docs are `README.md`, with a new `## Recovery` section before `## Adding a module` (line 60). PLT-18 documents update and rollback there. `deploy/RUNBOOK.md` is the maintainers' smoke runbook (line 1), and `docs/` holds ADRs and `RELEASING.md` only.
- **D13 Tests.** Criterion 1 has one test, S1. Criterion 2 has one test, D1. Two extra tests guard code shapes that the criteria do not see: Y1 (the loader's production shape) and P1 (the parity of the platform copy). Neither is a criterion test.
- **D14 The existing E4 keeps passing.** `apps/web/src/app/shell/project-switch-follow.spec.ts` test E4 (line 60) navigates to `/settings` (line 76) and checks only the URL (line 84). After this change `/settings` renders the page; its reads have no canned answers, so each fails inside the page, which shows its alert. E4 is not changed.
- **D15 Platform copy.** `features/setup-auth/platform-copy.ts` exports `VERSION_PATH = '/api/platform/version'` and `versionInfoCopy: ResponseSchema<VersionInfo>`, a hand-written guard with the same rules as `versionInfoSchema` (`packages/contracts/src/platform/http.ts` lines 20 to 25: three non-empty strings and an integer). It imports only types (`VersionInfo` from the contract, `ResponseSchema` from `../../shell`). Its parity test P1 is `platform-copy.spec.ts`, built like `shell/platform-copies.spec.ts` lines 77 to 89. Source: correction 1. The Shell's own copy is not exported from `shell/index.ts`, and `shell/` belongs to SHL (`plans/DECISIONS.md` line 3401), so it is not re-exported here.

## 2. Files to create or change

Only these twelve paths change.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/setup-auth/settings-page.ts` | new | `SettingsPage` (selector `app-settings-page`). Reads identity, status and preferences after `loadSettingsContract()`, and the version through `VERSION_PATH` and `versionInfoCopy`. Sections in order (step 5). Sign-out and re-run. Imports `ProvidersPanel` from `../providers/providers.routes`, `ComposeWarning` from `./compose-warning`, `PreferencesForm` from `./preferences-form`. Only type imports from the contract |
| `apps/web/src/app/features/setup-auth/settings-page.spec.ts` | new | Criterion 1, test S1 |
| `apps/web/src/app/features/setup-auth/settings-contract.spec.ts` | new | Extra test Y1 |
| `apps/web/src/app/features/setup-auth/platform-copy.ts` | new | `VERSION_PATH` and `versionInfoCopy` (D15). Only `import type` from the contract |
| `apps/web/src/app/features/setup-auth/platform-copy.spec.ts` | new | Extra test P1 (parity) |
| `apps/web/src/app/features/setup-auth/compose-warning.ts` | new, unless SAU-11 has put it on `main` (section 5) | `ComposeWarning` and `COMPOSE_UPDATE_COMMAND` (D4). Only `import type` from the contract |
| `apps/web/src/app/features/setup-auth/preferences-form.ts` | new | `PreferencesForm` (D6). No API call. Only `import type` from the contract |
| `apps/web/src/app/features/setup-auth/setup-contract.ts` | edit, append only | `loadSettingsContract()` after the last line (D3) |
| `apps/web/src/app/features/setup-auth/setup-auth.routes.ts` | edit | adds `export const settingsRoutes: Routes = [{ path: '', pathMatch: 'full', component: SettingsPage }];` beside `setupRoutes` |
| `apps/web/src/app/app.routes.ts` | edit | one entry between the `setup` entry and the `projects` entry (D1, D2) |
| `scripts/recovery-docs.test.mjs` | new | Criterion 2, test D1. `npm test` runs `node --test 'scripts/*.test.mjs'` (`package.json` line 25) |
| `README.md` | edit | adds `## Recovery` (D10, D12) before `## Adding a module`. Nothing else in the file changes |

Not changed: `setup-page.ts`, `setup-page.spec.ts`, `sign-in-notice.ts`, `setup-contract.spec.ts`, everything under `shell/`, `providers/`, `package.json`, `packages/contracts/**`, `apps/api/**`, `e2e/**`, `deploy/**`, `units/**`, `modules/**`, and every plan.

## 3. Procedure

Base: `main` (revised at `cd3e911`). The driver creates `unit/SAU-15` from `main`. Run every command from the worktree root. Commit with paths only: `git add <new paths>` for new files, then `git commit -m "<msg>" -- <paths>`. Never `git add -A` or `git commit -a`. If the index is locked, wait and retry. If step 0 does not pass, stop and report before any change. **Before step 1**, check `ls apps/web/src/app/features/setup-auth/compose-warning.ts apps/web/src/app/features/setup-auth/preferences-form.ts`: if `compose-warning.ts` exists (SAU-11 merged), skip step 3 and use the file as it is; if `preferences-form.ts` exists (another unit created it), stop and report, because D6 no longer holds.

Part 1 is steps 0 to 8. Part 2 is steps 9 to 11.

0. **Baseline.** `npm ci` if `node_modules` is missing. `npm run build -w @bbartolome/scriba-contracts`, then `ls packages/contracts/dist/setup-auth/index.js` (`plans/DECISIONS.md` line 2921). Then `npm test -w @bbartolome/scriba-web`, `npm run lint -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web`. Expected: each exits 0. Record the web test count N0, the CommonJS warnings W0 and the initial total size I0.

1. **Red tests.** Write `settings-page.spec.ts` (S1), `settings-contract.spec.ts` (Y1) and `platform-copy.spec.ts` (P1), section 4. Commit them with `test(SAU-15): add the settings tests (red)`. Expected: `npm test -w @bbartolome/scriba-web` fails in S1, Y1 and P1 only (their imports do not exist yet), and in no other test.

2. **Loader.** Append `loadSettingsContract()` to `setup-contract.ts` (D3).

3. **Compose warning.** Create `compose-warning.ts` (D4), unless it exists (see above).

4. **Preferences form and platform copy.** Create `preferences-form.ts` (D6) and `platform-copy.ts` (D15).

5. **Settings page.** Create `settings-page.ts`. After `await loadSettingsContract()`, four independent reads: identity, status, version (`VERSION_PATH`, `versionInfoCopy`) and preferences. A tailnet code from a read or a post shows `tailnetExplanation(code, SETUP_AUTH_ERROR_CODES)`. Any other error shows its message in one `role="alert"` paragraph. A 401 is left to the Shell's client, which navigates to `/setup` (`apps/web/src/app/shell/api-client.ts` lines 104 and 105). Host style as `setup-page.ts` lines 20 to 26. Template, in this order, one `<section>` per block:
   - `<h2>Settings</h2>`.
   - "This device": the identity sentence (loopback: "Signed in from this computer (loopback)."; tailnet: "Signed in over the tailnet as <login>."), the button "Sign out this browser" and the line "Signs out this browser only. A copy of the cookie elsewhere stays valid until the setup token changes."
   - "Preferences": `<app-preferences-form>`, once the preferences have loaded.
   - "Model providers": `<app-providers-panel />`.
   - "Versions": "Scriba {version} (revision {revision})" and "Compose version {composeVersion}" from the version info. Then `<app-compose-warning [compose]="…">`, once the status has loaded.
   - "Recovery": an ordered list of the four steps of D10. Each command is in its own `<code>`: `SIGN_IN_COMMAND` (`cat ~/Books/.scriba/setup-url`), `DOCKER_LOGS_COMMAND` (`docker compose logs scriba`), `~/Books/.scriba/setup-token`, `docker compose restart`, `docker compose stop` and `~/Books/.scriba/`.
   - "Setup": the button "Re-run setup" (D9).
   - Expected: `npx tsc --noEmit -p apps/web/tsconfig.app.json` exits 0.

6. **Route.** Add `settingsRoutes` to `setup-auth.routes.ts`. Add the entry to `app.routes.ts` (D1, D2): `path: 'settings'`, `pathMatch: 'full'`, `data: { scope: 'app', minDeviceClass: 'phone', nav: { label: 'Settings', icon: 'settings', order: 90 } } satisfies ShellRouteData`, and `loadChildren: () => import('./features/setup-auth/setup-auth.routes').then((feature) => feature.settingsRoutes)`. Expected: `grep -c "path: 'settings'" apps/web/src/app/app.routes.ts` prints 1.

7. **Green.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0 and N0 + 3 tests (S1, Y1 and P1 are one `it` each). `setup-page.spec.ts`, `setup-contract.spec.ts`, `landing.spec.ts`, `app.routes.spec.ts`, `core-gate.spec.ts`, `device-class.spec.ts`, `device-gate.spec.ts`, `app-nav.spec.ts` and `project-switch-follow.spec.ts` (E4) pass without a change.

8. **Part 1 gates and commit.** `npm run lint -w @bbartolome/scriba-web` exits 0. `npx prettier --check` on the web paths of section 2 exits 0. `npm run build -w @bbartolome/scriba-web` exits 0. Expected: the CommonJS warnings equal W0 (the settings chunk's only contract import is the setup-auth dynamic import, which shares its chunk with the existing one, `plans/DECISIONS.md` line 2869; the platform copy and the providers panel import contract types only). **Stop rule:** if a new CommonJS warning appears, or the initial total reaches the 1 MB error budget, stop and report; a new `allowedCommonJsDependencies` entry or a budget change is not this unit's to make (`plans/DECISIONS.md` lines 1086 to 1087 and 2684). Record the initial total I1 against I0. Grep rule (`plans/SAU-06.md` line 176): `grep -Pzo "(?m)^import (?!type )(?:[^;]*?from )?'@bbartolome/scriba-contracts" $(ls apps/web/src/app/features/setup-auth/*.ts | grep -v 'spec.ts')` prints nothing. Commit the web paths of section 2 (all but the two docs paths) with `feat(SAU-15): the settings page, its contract loader, the platform copy, the compose warning and the preferences form`.

9. **Red docs test.** Write `scripts/recovery-docs.test.mjs` (D1). Commit it with `test(SAU-15): add the recovery docs test (red)`. Expected: `node --test scripts/recovery-docs.test.mjs` fails, because there is no `## Recovery` section.

10. **Docs.** Add `## Recovery` to `README.md` before `## Adding a module`, with the four steps of D10 and the sentence about the library folder. Expected: `node --test scripts/recovery-docs.test.mjs` passes. `git diff --stat -- README.md` shows only insertions.

11. **Unit gates and commit.** From the root: `npm test` exits 0 (every workspace, then `scripts/*.test.mjs`), `npm run lint` exits 0 and `npm run build` exits 0. Commit `README.md` with `docs(SAU-15): recovery steps in the README`. Expected: `git status --short` prints nothing afterwards.

## 4. Acceptance criteria and tests

Each criterion has exactly one test. Y1 and P1 are extra tests, not criterion tests (D13).

| Criterion (unit line) | Test (file and name) | Seam | Pass condition |
|---|---|---|---|
| "Component tests: identity variants, versions, warning shown for `mismatch`/`unknown` with the one-liner and hidden for `ok`, re-run setup navigates to `/setup`, sign out posts." (line 26) | **S1**, `settings-page.spec.ts`: `S1 the settings page shows the identity variants, the versions, the compose warning for mismatch and unknown and not for ok, posts the sign-out, and navigates to /setup on re-run` | Lazy route: `TestBed.configureTestingModule({ providers: [provideRouter(APP_ROUTES), ...doubles.providers] })` with `createShellTestDoubles()`, then `RouterTestingHarness.create('/settings')` (`modules/setup-auth.md` line 68; the pattern of `app.routes.spec.ts` lines 15 to 25). `TestBed.overrideComponent(SettingsPage, { remove: { imports: [ProvidersPanel] }, add: { imports: [ProvidersStub] } })`, where `ProvidersStub` is a standalone component with the selector `app-providers-panel` (`plans/MPR-10.md` line 107). A new render is `harness.navigateByUrl('/no-such-page')` then `harness.navigateByUrl('/settings')` (`plans/SAU-11.md` line 136). Navigation is checked with `TestBed.inject(Router).url` | The script below |
| "User docs contain the recovery steps above." (line 27) | **D1**, `scripts/recovery-docs.test.mjs`: `D1 the README has a Recovery section with the four steps, and the tailscaled statement stays in the security notes` | reads `README.md` from disk with `node:test`, as `scripts/boundaries.test.mjs` lines 1 to 12 do | The conditions below |
| Extra: Y1 | **Y1**, `settings-contract.spec.ts`: `Y1 the settings contract load reads its values through default when the module has only a default` | the X5 pattern of `setup-contract.spec.ts` (line 14): `vi.mock` of `@bbartolome/scriba-contracts/setup-auth` to `{ default: await importOriginal() }` | `loadSettingsContract()` returns `IDENTITY_ROUTE` as `/api/setup-auth/identity`, `SETUP_STATUS_ROUTE` as `/api/setup-auth/status`, `SIGN_OUT_ROUTE` as `/api/setup-auth/sign-out`, `PREFERENCES_ROUTE` as `/api/setup-auth/preferences` and `SETUP_PAGE_PATH` as `/setup`; `preferencesSchema` parses `{ authorName: 'Ada' }` |
| Extra: P1 | **P1**, `platform-copy.spec.ts`: `P1 the settings platform copy agrees with the contract` | Node, the contract's `VERSION_ROUTE` and `versionInfoSchema` imported as values (spec files only) | `VERSION_PATH` equals `VERSION_ROUTE`; for the accepted and refused samples of `shell/platform-copies.spec.ts` (including `composeVersion: 0`, a negative, a fraction and a missing field), `versionInfoCopy` and `versionInfoSchema` give the same `success` |

**S1 script** (one `it`, in this order). The spec holds `const COMPOSE_ONE_LINER = 'docker run --rm -e SETUP=true bbartolome/scriba | bash';` (`units/SAU-10-compose-version-status.md` line 21) and does not import `COMPOSE_UPDATE_COMMAND`.

1. Canned answers: GET `IDENTITY_ROUTE` → `SETUP_AUTH_EXAMPLES.identityLoopback`; GET `SETUP_STATUS_ROUTE` → `{ ...SETUP_AUTH_EXAMPLES.setupStatus, compose: SETUP_AUTH_EXAMPLES.composeOk }`; GET `VERSION_ROUTE` → `{ version: '1.2.3', revision: 'abc1234', builtAt: '2026-11-14T00:00:00Z', composeVersion: 3 }`; GET `PREFERENCES_ROUTE` → `SETUP_AUTH_EXAMPLES.preferences`; POST `PREFERENCES_ROUTE` → `{ authorName: 'Ada', defaultGenrePack: 'fiction' }`; POST `SIGN_OUT_ROUTE` → `null`. GET `/api/setup-auth/status` and identity also serve `/setup` after a navigation there.
2. Render `/settings` and wait until the page shows its sections. Paragraphs contain "Signed in from this computer (loopback).", "Scriba 1.2.3 (revision abc1234)" and "Compose version 3". Buttons include "Sign out this browser" and "Re-run setup". **Hidden for `ok`:** no `code` element is inside `app-compose-warning`, and the page's text does not contain `COMPOSE_ONE_LINER`. The stub `app-providers-panel` is present. The recovery list has four items, and its `code` texts include each command of section 3, step 5.
3. Identity variant: GET identity → `SETUP_AUTH_EXAMPLES.identityTailnet`. A new render has the paragraph "Signed in over the tailnet as ada@example.com."
4. Compose: for `composeMismatch` and then `composeUnknown`, GET status answers `compose` set to it; a new render shows one `app-compose-warning`, whose one `code` text is exactly `COMPOSE_ONE_LINER`.
5. Preferences: set `input[name="defaultGenrePack"]` to `fiction` (dispatch `input`) and click "Save preferences". The recorded POSTs to `PREFERENCES_ROUTE` are exactly one, with body `{ defaultGenrePack: 'fiction' }`.
6. Sign-out: click "Sign out this browser". The recorded POSTs to `SIGN_OUT_ROUTE` are exactly one, with body `{}`, and `router.url` is `/setup`.
7. Re-run: navigate back to `/settings`, note the number of recorded POSTs, click "Re-run setup". `router.url` is `/setup`, and the number of recorded POSTs is unchanged.

**D1 conditions.** The section from `## Recovery` to the next `## ` heading contains: `cat ~/Books/.scriba/setup-url`; `docker compose logs scriba`; `~/Books/.scriba/setup-token` and `docker compose restart`; the words "new token" and "cookie"; `~/Books/.scriba/` with "settings", "secrets" and "search"; "Your projects are not touched."; and "allowlist" with "setup URL". The whole README contains "The app controls tailscaled through the shared socket." and "accepted for a single owner."

## 5. Downstream agreement

Units whose `blocked_by` names SAU-15: SAU-16 and SAU-20 (line 7 of each; grep of `units/`). Parallel units and plans that touch the same files: SAU-11 (planned, in implementation), SAU-12, SAU-13 and SAU-14 (no plans), MPR-11 (no plan). The other draft or planned plans (GRR-01, MPR-08, AGL-10, PST-14) change none of this plan's paths (grep of `plans/`; PST-14 line 58 excludes `app.routes.ts`).

- **SAU-16 (setup-flow gate).** Its criterion (line 24): with `SCRIBA_COMPOSE_VERSION` unset or older, `/setup` and settings show the warning with the one-liner; matching gives no warning. The settings page shows `app-compose-warning` with the same one-liner. Agreement: yes.
- **SAU-20 (Tailscale UI).** Adds the Tailscale status section and the allowlist section to the settings page, polling while visible (`units/SAU-20-tailscale-ui.md` lines 15 to 17). SAU-15 keeps one `<section>` per block, so SAU-20 adds its sections; it may add values to `loadSettingsContract()`. SAU-20 is blocked by SAU-15. Agreement: yes.
- **SAU-21 (tailnet gate).** Adds docs about control of tailscaled (`units/SAU-21-tailnet-gate.md` line 19). SAU-15 leaves the security notes as they are. Agreement: yes.
- **SAU-11 (planned; parallel; `unit/SAU-11` at `b9bd8b1` holds only its red tests).**
  - `compose-warning.ts`: if SAU-11 is on `main` before SAU-15's code stage starts, SAU-15 imports `ComposeWarning` from it and skips step 3. If SAU-15 merges first, SAU-11 adopts this file (`plans/SAU-11.md` line 163). Names, input, constant and the no-alert rule are the same in both plans; the sentences may differ, because S1 and W2 check only the one-liner and the hidden state.
  - `setup-contract.ts`: SAU-11 edits the header and the `Pick`; SAU-15 appends a function after the last line. On a conflict, keep both.
  - `app.routes.ts` and `setup-auth.routes.ts`: SAU-11 changes neither (its P1). Identity sentences: SAU-15 does not edit `setup-page.ts` (D7).
  - Agreement: yes.
- **SAU-13 (parallel; preferences step; blocked by SAU-11; no plan).** It names the same two fields, a free-text fallback for the genre pack and a save of changed fields only (`units/SAU-13-preferences-step.md` lines 15 and 17). `PreferencesForm` matches that; SAU-13's planner may reuse it. If `preferences-form.ts` already exists when SAU-15's code stage starts, the implementer stops (section 3). Agreement: yes.
- **SAU-12 (parallel; providers step).** Also embeds `ProvidersPanel` from `providers.routes.ts`; neither unit edits that file. Agreement: yes.
- **SAU-14 (parallel; first project step).** No shared file. Agreement: yes.
- **MPR-11 (`/providers`; no plan).** Adds `providersRoutes` to `providers.routes.ts` and a `/providers` entry to `app.routes.ts` (`units/MPR-11-providers-route-gate.md` line 17). It keeps the `ProvidersPanel` export. On a conflict in `app.routes.ts`, keep both entries, once each.
- **SAU-06, SAU-09, SAU-10, PLT-18 (done).** Their files and README sections are used, not changed.

## 6. Open points (all closed by the reviser, 2026-11-15)

1. **Shell notices banner** — not built (D11). Source: unit line 17 ("Optionally"); `plans/SAU-10.md` line 127.
2. **Genre pack field** — free text. Source: unit line 16 ("same fields as the step"); `units/SAU-13-preferences-step.md` line 15 (free text fallback); `packages/contracts/src/setup-auth/settings.ts` line 11 (`defaultGenrePack: z.string().optional()`). Reuse by SAU-13 is SAU-13's planner's choice (section 5).
3. **Wipe wording** — the unit's list is kept, and the tool packs and setup token are named as facts (D10). No criterion changes; D1 checks the unit's words. Source: the code lines in D10.
4. **Allowlist step** — the unit's words are kept. "Use the Mac and the setup URL" works on main today (loopback sign-in). Source: unit line 22.
5. **Extra test Y1** — kept. Vitest's named exports hide the production shape (`plans/DECISIONS.md` lines 3396 and 3397; lines 3961 to 3967 record the defect), and the SHL-21 decision gives a new loader the same mocked-default test (`plans/DECISIONS.md` line 3401).
6. **Build warnings and budget** — no new warning is expected; step 8 has a stop rule. Source: `plans/DECISIONS.md` lines 1086, 1087, 2684 and 2869; correction 1 removes the platform import that could add one.
7. **Phone navigation width** — no check in this unit. No SAU-15 criterion names it; the nav entry is required by `modules/shell.md` line 55 and `modules/setup-auth.md` line 40, and the bar's geometry is the Shell's (`plans/SHL-05.md` decision 12, a full-width bar).
8. **Identity sentences twice** — left as is (D7). Source: `plans/SAU-11.md` section 2 rewrites `setup-page.ts`.

No Navigator point is open.

## 7. Facts checked (reads, greps and `git` only)

- **Git.** `main` at `cd3e911`, tree clean apart from other agents' work. `unit/SAU-11` exists at `b9bd8b1` (one commit, `setup-page.spec.ts` only). No `unit/SAU-15`, no `plans/SAU-12.md`, `SAU-13.md`, `SAU-14.md`, `SAU-16.md`, `SAU-20.md` or `MPR-11.md`.
- **Units.** `units/SAU-15-settings-page.md` lines 1 to 27. `units/SAU-16-setup-flow-gate.md` line 7 and line 24. `units/SAU-20-tailscale-ui.md` line 7 and lines 15 to 17. `units/SAU-13-preferences-step.md` lines 7, 15 and 17. `units/SAU-21-tailnet-gate.md` line 19. `units/MPR-11-providers-route-gate.md` line 17. `units/SAU-10-compose-version-status.md` line 21. `units/README.md` lines 57, 60 to 66 and 136.
- **Module.** `modules/setup-auth.md` lines 25, 40 and 64 to 68. `modules/shell.md` line 55.
- **DECISIONS (grep by SAU-15 and setup-auth).** Lines 941, 1084 to 1089, 2507, 2548, 2549, 2684, 2869, 2921, 3395 to 3401, 3961 to 3967, 4125 to 4142.
- **Route table.** `app.routes.ts`: nav orders at lines 18 (10), 31 (30), 70 (100), 95 (20); `setup` entry lines 77 to 88; `projects` entry from line 89; `'**'` at line 102. `route-data.spec.ts` line 9.
- **Feature files.** `setup-contract.ts` (27 lines; header 1 to 9, `Pick` 14 to 22, `mod.default ?? mod` line 26). `setup-auth.routes.ts` (`setupRoutes` line 4). `setup-page.ts` lines 20 to 26 (host style), 61 to 65 (identity sentences). `sign-in-notice.ts` lines 4, 7 and 19. `providers.routes.ts` lines 1 to 3. `providers-copies.ts` lines 285 to 292 (`emptyBodyCopy`). `tool-registry/project-store-copy.ts` lines 1 to 10 (the copy pattern).
- **Shell.** `api-client.ts` line 13 (`ApiPath`), lines 104 and 105 (401 to `/setup`). `shell/index.ts` (no export of `platform-copies`). `platform-copies.ts` lines 10 to 44 and `platform-copies.spec.ts` lines 77 to 89. `testing/test-doubles.ts` lines 43 to 103 (`respond`, `fail`, `requests`; no canned answer is an error). `project-switch-follow.spec.ts` lines 60 to 85 (E4). `app.routes.spec.ts` lines 15 to 25.
- **Contract.** `setup-auth/routes.ts` lines 4, 9, 10, 14, 21. `setup-auth/status.ts` lines 27 to 38. `setup-auth/settings.ts` lines 9 to 12. `setup-auth/examples.ts` lines 11, 12, 28 to 35, 38. `platform/http.ts` lines 9 and 20 to 25.
- **API.** `setup-flow.controller.ts` lines 22 to 33. `setup-session.controller.ts` lines 101 to 122.
- **Library folder.** `settings.file.ts` line 7; `secrets-store.ts` line 25; `search.service.ts` line 175; `packs.ts` lines 80 to 82; `files.service.ts` line 490.
- **Docs.** `README.md` headings at lines 1, 5, 19, 23, 33, 47, 51, 60, 72; lines 35, 49 and 74. `deploy/RUNBOOK.md` lines 1 and 11. `scripts/entrypoint.sh` lines 20, 139 and 197. `package.json` line 25. `docs/` holds `adr/` and `RELEASING.md`.
- **Plans.** `plans/SAU-11.md` lines 18, 19, 35, 60, 136, 163. `plans/SAU-06.md` lines 176 and 245. `plans/SAU-03.md` line 153. `plans/SAU-09.md` line 124. `plans/SAU-10.md` line 127. `plans/MPR-09.md` line 77. `plans/MPR-10.md` line 107. `plans/QUEUE.md` line 9. `plans/PST-14.md` line 58. Status lines of every plan (78 done, 5 planned, this draft).
- **Not on main.** `compose-warning.ts`, `preferences-form.ts`, `settings-page.ts`, `platform-copy.ts`, the `/providers` route.

## 8. Assumed (not checked here)

- ASSUMED: `TestBed.overrideComponent` on `SettingsPage` takes effect when the lazy route loads the same class. If it does not, S1 drops the stub: the real panel renders inside the page, its reads have no canned answers and it shows its own error, and S1 still checks only that `app-providers-panel` is present.
- ASSUMED: a 204 reaches the client as `null` on both HTTP backends (`providers-copies.ts` line 285; the providers plan's A5). The local schema of D8 also accepts `undefined`.
- ASSUMED: nav order 90 and the icon `settings` suit the Shell (D1), and the phone bar still fits at 390 px with one more item.
- ASSUMED: `docker compose stop` and `docker compose restart` behave as `README.md` lines 47 to 49 say. Not run here.
- ASSUMED: the sentences of D4 are acceptable; SAU-11's may differ (section 5).
- NOT RUN: no build, no test, no lint, no e2e and no Docker. Line numbers are the reviser's reads at `cd3e911`.

## 9. Review parts

- **Part 1: the settings page (criterion 1).** Steps 0 to 8. Tests: S1 (criterion 1), Y1 and P1 (extra). Commits: the red tests, then one green commit.
- **Part 2: the recovery docs (criterion 2) and the unit gates.** Steps 9 to 11. Test: D1 (criterion 2).

Every step and every test is in exactly one part.
