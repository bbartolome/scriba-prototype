---
id: SAU-15
status: draft
unit: units/SAU-15-settings-page.md
---
# SAU-15 plan — Settings page and user-facing recovery documentation

Setup & auth, phase:setup-flow, M2, main track. Unit `units/SAU-15-settings-page.md`: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9), Decisions lines 14 to 23, acceptance criteria lines 25 to 27 (criterion 1 is line 26, criterion 2 is line 27). Written against `main` at `821d1d6`, which revised `plans/SAU-11.md` (status `planned`); this plan reads that revised text. Nothing was built, installed, run or tested. The planner ran reads, greps and `git` only.

**Availability (checked).** Blockers: SAU-06 (`plans/SAU-06.md` line 3, `status: done`), SAU-09 (`plans/SAU-09.md` line 3, `status: done`), SAU-10 (`plans/SAU-10.md` line 3, `status: done`) and SHL-09 (`plans/SHL-09.md` line 3, `status: done`). Their code is on `main` (`5678192`, `4b97515`, `658a3c8`, `355f86e`). No `plans/SAU-15.md` existed before this plan. `plans/QUEUE.md` line 9 lists SAU-15 as available. The unit is available.

Tags: FACT means checked (section 7). ASSUMED means not checked (section 8). DECISION means a choice made here, with its source (section 1b).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the API and earlier plans (obeyed, not reopened)

- **Route and placement.** `/settings` is app-level, `minDeviceClass: 'phone'`, with a nav entry. Its one named export is `settingsRoutes` in `features/setup-auth/setup-auth.routes.ts`, and its entry goes in `app.routes.ts` above `'**'`. Sources: unit line 15; `plans/SHL-01.md` line 28 (decision 9); `modules/shell.md` line 55; `plans/SAU-06.md` line 245 (the SAU-15 row).
- **Sections** (unit line 16): how this device is connected; preferences (the same fields as the step); providers (embeds the Model providers panel, or links to `/providers`); versions (app version and compose version from Platform's version info) with the compose-mismatch warning and the one-liner; recovery; re-run setup; sign out this browser. Tailscale status and the allowlist are added by SAU-20 (unit line 16, last clause).
- **Recovery** (unit lines 18 to 22): four steps, on the page and in the user docs. The docs state that the app can control tailscaled through the shared socket (unit line 23). `README.md` lines 72 to 74 already say so.
- **Optional banner** (unit line 17): decision D11 below.
- **Contract access.** Feature files read contract values only through `setup-contract.ts`, by a dynamic import read as `mod.default ?? mod`. No other file of `features/setup-auth/` has a runtime import of the contract (`plans/SAU-06.md` section 1, decision 1a-12; the grep rule at `plans/SAU-06.md` line 176; `plans/DECISIONS.md` lines 3395 to 3400). The Shell ships no runtime zod (`plans/DECISIONS.md` line 1084).
- **Routes that exist on main.** `GET /api/setup-auth/status` with `compose` (`apps/api/src/modules/setup-auth/setup-status.controller.ts` line 22; `plans/SAU-10.md` line 15). `GET` and `POST /api/setup-auth/preferences`, a field-level merge (`setup-flow.controller.ts` lines 22 and 28). `plans/SAU-09.md` line 124: SAU-15 reads GET status and GET preferences and adds no route. Versions come from Platform's version info, not from the status (`plans/SAU-10.md` line 127).
- **The one-liner.** `docker run --rm -e SETUP=true bbartolome/scriba | bash` (`units/SAU-10-compose-version-status.md` line 21; `scripts/entrypoint.sh` line 20). The README's Update section says to run it in the install folder (`README.md` line 33 onward).
- **The compose warning is shared with SAU-11.** SAU-11 creates `compose-warning.ts` with `ComposeWarning` (selector `app-compose-warning`, input `compose`) and the constant `COMPOSE_UPDATE_COMMAND` (`plans/SAU-11.md` P7 and section 5). The Navigator's decision (`plans/DECISIONS.md` lines 4125 to 4142) gives the `/setup` warning to SAU-11, and SAU-15's criterion (unit line 26) covers the settings page.
- **Providers panel.** `ProvidersPanel` (selector `app-providers-panel`, standalone, no inputs or outputs) is exported from `apps/web/src/app/features/providers/providers.routes.ts` (line 3), the allowed import path (`plans/MPR-09.md` line 77, decisions D1 and D2). The panel's own tests stub it (`plans/MPR-10.md` line 107).
- **Sign-out is per browser.** `setup-session.controller.ts` lines 120 and 121 say the cookie is expired in this browser only and that a copy elsewhere stays valid until the token changes. `plans/SAU-03.md` line 153: "The SAU-15 copy should say so."
- **Existing copy.** The identity sentences, "You're in." and the sign-in notice (`plans/SAU-06.md` section 1b, decisions 1b-3 and 1b-4). `sign-in-notice.ts` line 4 (`SIGN_IN_COMMAND`), line 7 (`DOCKER_LOGS_COMMAND`) and line 19 (`tailnetExplanation`).
- **Replacing the token.** Replacing the token revokes every cookie (`modules/setup-auth.md`, "Settled decisions"). The token is loaded or created at boot, and `setup-url` is rewritten on every start (`apps/api/src/modules/setup-auth/setup-token.store.ts` lines 91 to 108).
- **Testing.** External behaviour only. UI tests render lazy routes with Angular's Vitest runner against the fake API client (`modules/setup-auth.md`, "Testing principles"; `units/README.md` line 136).

### 1b. Choices made by this plan (DECISION)

- **D1 Nav order 90.** The entry is `nav: { label: 'Settings', icon: 'settings', order: 90 }`. Items are sorted by `nav.order` (`plans/SHL-05.md` decision 11). The orders in use are 10 (Chat), 20 (Projects), 30 (Files) and 100 (Core gate, `apps/web/src/app/app.routes.ts`). 90 puts Settings after the content items and before the development page. The value is ASSUMED (section 8).
- **D2 Entry position.** The `settings` entry goes directly after the `setup` entry, which spans lines 77 to 88 of `app.routes.ts`, and before the `projects` entry (line 89). The two Setup & auth routes stay together.
- **D3 Contract loader.** `setup-contract.ts` gains one exported function, `loadSettingsContract()`, appended after its last line (line 27). It makes one dynamic import of `@bbartolome/scriba-contracts/setup-auth` and one of `@bbartolome/scriba-contracts/platform`, and it reads each as `mod.default ?? mod`, because both modules are CommonJS (`setup-contract.ts` lines 7 and 8, and line 26). It returns the values listed in step 2. The existing function and its `Pick` (lines 13 to 27) are not edited.
- **D4 Compose warning file.** `compose-warning.ts` uses the names of SAU-11's P7 exactly. P7 gives no sentences, so this plan writes them. For `mismatch`: "This install runs compose version {actual}, but this Scriba needs compose version {expected}." For `unknown`: "This install does not report its compose version, so it cannot be checked." Both then say "To update, run the one-liner in the install folder:" and show the one-liner in one `<code>`. For `ok` it renders nothing. It has no `role="alert"`.
- **D5 Providers section embeds the panel.** `/providers` does not exist on main (`app.routes.ts` has no providers entry; `plans/MPR-10.md` line 145), and MPR-11 is not planned. So the section embeds `<app-providers-panel />`.
- **D6 Preferences form.** `PreferencesForm` (selector `app-preferences-form`) has input `stored: Preferences` and output `save: Partial<Preferences>`. It has two native inputs, `name="authorName"` and `name="defaultGenrePack"`. The genre pack is free text, which is the fallback that SAU-13 names (`units/SAU-13-preferences-step.md` line 15); the choice list is not decided (open point 2). The form emits only the keys whose values changed, and the Save button is disabled when none changed. The page posts the emitted keys to `PREFERENCES_ROUTE` and then updates `stored` from the answer. The form itself makes no API call.
- **D7 Identity sentences are written again.** `settings-page.ts` holds the two identity sentences of `setup-page.ts` lines 61 to 65 (loopback and tailnet). It does not import them, because `setup-page.ts` is rewritten by SAU-11 (`plans/SAU-11.md` section 2). Open point 8.
- **D8 Sign-out.** The button posts `SIGN_OUT_ROUTE` with body `{}`. The answer is 204 with no body (`setup-session.controller.ts` line 122), and the contract has no schema for it. The page reads it with a local schema that accepts `null`, the same pattern as `apps/web/src/app/features/providers/providers-copies.ts` lines 285 to 290. On success the page navigates to `SETUP_PAGE_PATH` (`/setup`). There the identity read now answers 401 and the sign-in notice shows. The page's copy under the button is the sentence of section 3, step 5.
- **D9 Re-run setup.** The button navigates to `SETUP_PAGE_PATH` and sends no request. Re-running `/setup` is always allowed (`plans/SAU-11.md` line 35).
- **D10 Recovery wording.** The four steps keep the unit's order and words, with these changes, and the docs and the page use the same text:
  - Step 1 names the two commands as the constants `SIGN_IN_COMMAND` and `DOCKER_LOGS_COMMAND`, which are imported, not copied.
  - Step 3 (the wipe) lists what the folder holds, which the unit does not. `~/Books/.scriba/` holds `settings.yaml` (`apps/api/src/modules/platform/settings/settings.file.ts` line 7), `secrets.yaml` (the provider keys, `apps/api/src/modules/providers/secrets/secrets-store.ts` line 25), the search index in `index/` (`apps/api/src/modules/project-store/search.service.ts` line 175), the user's own tool packs in `packs/user/` (`apps/api/src/modules/tool-registry/packs.ts` lines 80 to 82) and the setup token. A wipe deletes all of them. Projects are not touched: a project's own `.scriba/` folder is inside the project (`apps/api/src/modules/project-store/files.service.ts` line 490).
  - Step 3 stops the stack first (`docker compose stop` in the install folder) and starts it again as "Stop and start" in the README says. This is a DECISION of this plan, for safety. The unit does not say it.
  - The paths assume the default library folder `~/Books`. For another folder, use the `.scriba` folder inside the `SCRIBA_LIBRARY` value in `.env`. The installer writes that key (`deploy/RUNBOOK.md` lists it; `scripts/entrypoint.sh` line 139 builds `$LIBRARY/.scriba/setup-url`).
- **D11 Banner not built.** The unit makes the banner optional. An app-wide banner needs a status read in the Shell's App component, which is outside this unit's files. The page warning covers the criterion. Open point 1.
- **D12 Docs location.** The user docs are `README.md`, with a new `## Recovery` section before `## Adding a module` (line 60). PLT-18 documents update and rollback in the README ("Both documented (README / `deploy/` docs)", `units/PLT-18-update-rerun-rollback.md` Decisions). `deploy/RUNBOOK.md` is the maintainers' pre-release runbook (its first line is "Smoke runbook"), so it is not user docs.
- **D13 Tests.** Criterion 1 has one test, S1. Criterion 2 has one test, D1. One extra test, Y1, guards the production shape of the new loader. It is not a criterion (open point 5).
- **D14 The existing E4 keeps passing.** `apps/web/src/app/shell/project-switch-follow.spec.ts` test E4 (line 60) navigates to `/settings` and checks only the URL. After this change `/settings` renders the page. In that test the page's reads have no canned answers, so each read fails inside the page, which shows its alert. E4 still passes, and it is not changed.

## 2. Files to create or change

Only these ten paths change.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/setup-auth/settings-page.ts` | new | `SettingsPage` (selector `app-settings-page`). Reads identity, status, versions and preferences after `loadSettingsContract()`. Sections in order (step 5). Sign-out and re-run. Imports `ProvidersPanel` from `../providers/providers.routes`, `ComposeWarning` from `./compose-warning` and `PreferencesForm` from `./preferences-form`. Only type imports from the contract |
| `apps/web/src/app/features/setup-auth/settings-page.spec.ts` | new | Criterion 1, test S1 |
| `apps/web/src/app/features/setup-auth/settings-contract.spec.ts` | new | Extra test Y1 |
| `apps/web/src/app/features/setup-auth/compose-warning.ts` | new | `ComposeWarning` (selector `app-compose-warning`, input `compose: ComposeVersionStatus`) and `COMPOSE_UPDATE_COMMAND`, the text of SAU-10 line 21. Names as SAU-11 P7. Only `import type` from the contract |
| `apps/web/src/app/features/setup-auth/preferences-form.ts` | new | `PreferencesForm` (selector `app-preferences-form`), D6. No API call. Only `import type` from the contract |
| `apps/web/src/app/features/setup-auth/setup-contract.ts` | edit, append only | `loadSettingsContract()` after line 27 (D3). The header and the existing `Pick` are not touched |
| `apps/web/src/app/features/setup-auth/setup-auth.routes.ts` | edit | adds `export const settingsRoutes: Routes = [{ path: '', pathMatch: 'full', component: SettingsPage }];` beside `setupRoutes` |
| `apps/web/src/app/app.routes.ts` | edit | one entry between the `setup` entry (ends line 88) and the `projects` entry (line 89), D1 and D2 |
| `scripts/recovery-docs.test.mjs` | new | Criterion 2, test D1. `npm test` runs `node --test 'scripts/*.test.mjs'` (`package.json` line 25) |
| `README.md` | edit | adds `## Recovery` (D10, D12) before `## Adding a module` (line 60). Nothing else in the file changes |

Not changed: `setup-page.ts`, `setup-page.spec.ts`, `sign-in-notice.ts`, `setup-contract.spec.ts`, `package.json`, `packages/contracts/**`, `apps/api/**`, `e2e/**`, `deploy/**`, `units/**`, `modules/**`, and every plan except this one.

## 3. Procedure

Base: `main` at `821d1d6`, tree clean (checked). The driver creates `unit/SAU-15` from `main`. Run every command from `/Users/bbartolome/workspace/scriba-prototype`. Commit with paths only: `git add <new paths>` for new files, then `git commit -m "<msg>" -- <paths>`. Never `git add -A` or `git commit -a`. If the index is locked, wait and retry. If step 0 does not pass, stop and report before any change.

Part 1 is steps 0 to 8. Part 2 is steps 9 to 11.

0. **Baseline.** `npm run build -w @bbartolome/scriba-contracts`, then `npm test -w @bbartolome/scriba-web`, `npm run lint -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web`. Expected: each exits 0. Record the web test count N0, the CommonJS warnings and the initial bundle size. `ls packages/contracts/dist/setup-auth/index.js packages/contracts/dist/platform/index.js` lists both files.

1. **Red tests.** Write `settings-page.spec.ts` (test S1, section 4) and `settings-contract.spec.ts` (test Y1). Commit them with `test(SAU-15): add the settings tests (red)`. Expected: `npm test -w @bbartolome/scriba-web` fails in S1 and Y1 only, because their imports do not exist yet, and in no other test.

2. **Loader.** Append `loadSettingsContract()` to `setup-contract.ts` (D3). Its return type picks these values. From setup-auth: `IDENTITY_ROUTE`, `identitySchema`, `SETUP_STATUS_ROUTE`, `setupStatusSchema`, `SIGN_OUT_ROUTE`, `PREFERENCES_ROUTE`, `preferencesSchema`, `SETUP_PAGE_PATH` and `SETUP_AUTH_ERROR_CODES`. From platform: `VERSION_ROUTE` and `versionInfoSchema`. Expected: `npx tsc --noEmit -p apps/web/tsconfig.spec.json` exits 0 once step 5 exists. Until then Y1 can be run on its own.

3. **Compose warning.** Create `compose-warning.ts` (D4). Expected: step 8's grep rule holds for it.

4. **Preferences form.** Create `preferences-form.ts` (D6). Expected: the same grep rule holds for it.

5. **Settings page.** Create `settings-page.ts`. Reads, after `await loadSettingsContract()`: identity, status, versions and preferences, each independent. A tailnet code from a read or a post shows `tailnetExplanation(code, SETUP_AUTH_ERROR_CODES)`. Any other error shows its message in one `role="alert"` paragraph. A 401 is left to the Shell's client, which navigates to `/setup` (`apps/web/src/app/shell/api-client.ts` lines 104 and 105). Template, in this order:
   - `<h2>Settings</h2>`.
   - Section "This device": the identity sentence (loopback: "Signed in from this computer (loopback)."; tailnet: "Signed in over the tailnet as <login>."), the button "Sign out this browser" and the line "Signs out this browser only. A copy of the cookie elsewhere stays valid until the setup token changes."
   - Section "Preferences": `<app-preferences-form>`, once the preferences have loaded.
   - Section "Model providers": `<app-providers-panel />`.
   - Section "Versions": "Scriba {version} (revision {revision})" and "Compose version {composeVersion}" from the version info. Then `<app-compose-warning>`, once the status has loaded.
   - Section "Recovery": an ordered list of the four steps of D10. Each command is in its own `<code>`: `cat ~/Books/.scriba/setup-url` (the constant `SIGN_IN_COMMAND`), `docker compose logs scriba` (the constant `DOCKER_LOGS_COMMAND`), `~/Books/.scriba/setup-token`, `docker compose restart`, `docker compose stop` and `~/Books/.scriba/`.
   - Section "Setup": the button "Re-run setup" (D9).
   - Expected: `npx tsc --noEmit -p apps/web/tsconfig.app.json` exits 0.

6. **Route.** Add `settingsRoutes` to `setup-auth.routes.ts`. Add the entry to `app.routes.ts` (D1, D2): `path: 'settings'`, `pathMatch: 'full'`, `data: { scope: 'app', minDeviceClass: 'phone', nav: { label: 'Settings', icon: 'settings', order: 90 } } satisfies ShellRouteData`, and `loadChildren` that imports `./features/setup-auth/setup-auth.routes` and returns `settingsRoutes`. Expected: `grep -c "path: 'settings'" apps/web/src/app/app.routes.ts` prints 1.

7. **Green.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0 and N0 + 2 tests (S1 and Y1 are one `it` each). `setup-page.spec.ts`, `landing.spec.ts`, `device-class.spec.ts`, `device-gate.spec.ts`, `app-nav.spec.ts` and `project-switch-follow.spec.ts` (E4) pass without a change.

8. **Part 1 gates and commit.** `npm run lint -w @bbartolome/scriba-web` exits 0. `npx prettier --check` on the eight web paths of section 2 exits 0. `npm run build -w @bbartolome/scriba-web` exits 0. Its CommonJS warnings and initial bundle size equal the step 0 record, or a new warning is written in the closing report (open point 6). Grep rule, from `plans/SAU-06.md` line 176: `grep -Pzo "(?m)^import (?!type )(?:[^;]*?from )?'@bbartolome/scriba-contracts" $(ls apps/web/src/app/features/setup-auth/*.ts | grep -v 'spec.ts')` prints nothing. Commit the eight web paths with `feat(SAU-15): the settings page, its contract loader, the compose warning and the preferences form`.

9. **Red docs test.** Write `scripts/recovery-docs.test.mjs` (test D1). Commit it with `test(SAU-15): add the recovery docs test (red)`. Expected: `node --test scripts/recovery-docs.test.mjs` fails, because there is no `## Recovery` section.

10. **Docs.** Add `## Recovery` to `README.md` before `## Adding a module`, with the four steps of D10 and the sentence about the library folder. Expected: `node --test scripts/recovery-docs.test.mjs` passes. `git diff --stat -- README.md` shows only insertions.

11. **Unit gates and commit.** From the root: `npm test` exits 0 (every workspace, then `scripts/*.test.mjs`), `npm run lint` exits 0 and `npm run build` exits 0. Commit `README.md` and `scripts/recovery-docs.test.mjs` with `docs(SAU-15): recovery steps in the README and their docs test`. Expected: `git status --short` prints nothing afterwards, and `unit/SAU-15` holds the Part 1 commits and the Part 2 commits.

## 4. Acceptance criteria and tests

Each criterion has one test. Y1 is an extra test that is not a criterion.

| Criterion (unit line) | Test (file and name) | Seam | Pass condition |
|---|---|---|---|
| "Component tests: identity variants, versions, warning shown for `mismatch`/`unknown` with the one-liner and hidden for `ok`, re-run setup navigates to `/setup`, sign out posts." (line 26) | **S1**, `settings-page.spec.ts`: `S1 the settings page shows the identity, the versions, the compose warning, the recovery steps and the preferences, posts the sign-out, and navigates on re-run` | `TestBed.createComponent(SettingsPage)` under `provideRouter(APP_ROUTES)` and `createShellTestDoubles()`. `TestBed.overrideComponent(SettingsPage, { remove: { imports: [ProvidersPanel] }, add: { imports: [ProvidersStub] } })`, where `ProvidersStub` has the selector `app-providers-panel`. A `settle` helper as in `setup-page.spec.ts`. Navigation is checked through `router.url` | The script below |
| "User docs contain the recovery steps above." (line 27) | **D1**, `scripts/recovery-docs.test.mjs`: `D1 the README has a Recovery section with the four steps, and the tailscaled statement stays in the security notes` | reads `README.md` from disk with `node:test`, as `scripts/boundaries.test.mjs` lines 1 to 12 do | The conditions below |
| Extra, not a criterion: Y1 | **Y1**, `settings-contract.spec.ts`: `Y1 the settings contract load reads its values through default when both modules have only a default` | the X5 pattern of `setup-contract.spec.ts`: `vi.mock` of both specifiers to `{ default: await importOriginal() }` | `loadSettingsContract()` returns `VERSION_ROUTE` as `/api/platform/version`, `IDENTITY_ROUTE` as `/api/setup-auth/identity`, `SIGN_OUT_ROUTE` as `/api/setup-auth/sign-out` and `PREFERENCES_ROUTE` as `/api/setup-auth/preferences`. `versionInfoSchema` and `preferencesSchema` parse one sample each |

**S1 script** (one `it`, in this order):

1. Canned answers: GET the identity (`SETUP_AUTH_EXAMPLES.identityLoopback`), GET the status (`SETUP_AUTH_EXAMPLES.setupStatus` with `compose` set to `SETUP_AUTH_EXAMPLES.composeOk`), GET the version (`{ version: '1.2.3', revision: 'abc1234', builtAt: '2026-11-14T00:00:00Z', composeVersion: 3 }`) and GET the preferences (`SETUP_AUTH_EXAMPLES.preferences`).
2. Create the page and settle. Paragraphs contain "Signed in from this computer (loopback).", "Scriba 1.2.3 (revision abc1234)" and "Compose version 3". Buttons include "Sign out this browser" and "Re-run setup". No `code` is inside `app-compose-warning`. The stub `app-providers-panel` is present. The recovery list has four items, and its `code` texts include each command of section 3, step 5.
3. Identity variant: the GET identity answers `SETUP_AUTH_EXAMPLES.identityTailnet`. A new page has the paragraph "Signed in over the tailnet as ada@example.com."
4. Compose: the GET status answers `compose` set to `composeMismatch`. A new page shows one `app-compose-warning`, whose one `code` text is exactly the one-liner of SAU-10 line 21. The same holds for `composeUnknown`. For `composeOk`, no `code` is inside `app-compose-warning`.
5. Preferences: set `input[name="defaultGenrePack"]` to `fiction` and click "Save preferences". The recorded request is one POST to `PREFERENCES_ROUTE` whose body is `{ defaultGenrePack: 'fiction' }`.
6. Sign-out: the POST to `SIGN_OUT_ROUTE` answers `null`. Click "Sign out this browser". The recorded request is one POST to `SIGN_OUT_ROUTE` with body `{}`, and `router.url` is `/setup`.
7. Re-run: on a new page, click "Re-run setup". `router.url` is `/setup`, and no POST is recorded.

**D1 conditions.** The section from `## Recovery` to the next `## ` heading contains: `cat ~/Books/.scriba/setup-url`; `docker compose logs scriba`; `~/Books/.scriba/setup-token` and `docker compose restart`; the words "new token" and "cookie"; `~/Books/.scriba/` with "settings", "secrets", "search" and "tool packs"; "Your projects are not touched."; and "allowlist". The whole README contains "The app controls tailscaled through the shared socket." and "accepted for a single owner."

## 5. Downstream agreement

Two units name SAU-15 in `blocked_by` (SAU-16 and SAU-20, both on line 7). Parallel units or planned work touch the same files: SAU-11 (planned), SAU-12, SAU-13 and SAU-14 (no plans yet), and MPR-11 (no plan).

- **SAU-16 (setup-flow gate).** Its criterion (line 24): with `SCRIBA_COMPOSE_VERSION` unset or older, `/setup` and settings show the warning with the one-liner; matching gives no warning. The settings page shows `app-compose-warning` with the same one-liner (D4). SAU-16's e2e must look for the one-liner on `/settings` as well as on `/setup`. Agreement: yes, under that rule.
- **SAU-20 (Tailscale UI).** Adds the Tailscale status and login-link section and the allowlist section to the settings page, and polls while the view is visible (`units/SAU-20-tailscale-ui.md` lines 15 to 17). SAU-15 keeps one `<section>` per block in the template, so SAU-20 adds its sections without changing SAU-15's. SAU-20 also adds its values to `loadSettingsContract()`. SAU-20 is blocked by SAU-15, so the two never edit in parallel. Agreement: yes.
- **SAU-21 (tailnet gate).** Adds to the security notes the statement about control of tailscaled (`units/SAU-21-tailnet-gate.md`, Scope, third bullet). SAU-15 leaves those lines as they are. SAU-21 merges after SAU-15. Agreement: yes.
- **SAU-11 (planned; parallel).**
  - `compose-warning.ts`: SAU-11 creates it (P7). If SAU-11 merges first, SAU-15 imports `ComposeWarning` and `COMPOSE_UPDATE_COMMAND` from it and writes no copy, so step 3 becomes "the file exists: keep it". If SAU-15 merges first, SAU-11 adopts this file, as its P7 and section 5 say. The names, the input and the constant are the same in both plans. The sentences may differ, because S1 checks only the one-liner and the hidden state.
  - `setup-contract.ts`: SAU-11 edits the `Pick` (lines 16 to 21) and the header (lines 1 to 9). SAU-15 appends a function after line 27. The hunks do not touch, so git merges them in either order. On a conflict, keep both sets of lines.
  - `app.routes.ts` and `setup-auth.routes.ts`: SAU-11 changes neither (its P1). No conflict.
  - Identity sentences: SAU-15 does not edit `setup-page.ts` (D7).
  - Agreement: yes, under these rules.
- **SAU-13 (parallel; preferences step).** Its decisions (lines 15 and 17) name the same two fields and a save of changed fields only. If SAU-13 merges after SAU-15, it should use `PreferencesForm` in its step, and its own step rule (done or skipped) stays. If SAU-13 merges first, SAU-15 must be revised before its code stage so that it uses SAU-13's form (open point 2). Agreement: conditional.
- **SAU-12 (parallel; providers step).** Also embeds `ProvidersPanel` from `providers.routes.ts`, and its tests stub the panel (`plans/MPR-10.md` line 107). Neither unit edits `providers.routes.ts`. Agreement: yes.
- **SAU-14 (parallel; first project step).** No shared file. Agreement: yes.
- **MPR-11 (`/providers`; no plan).** Adds `providersRoutes` to `providers.routes.ts` and a `/providers` entry to `app.routes.ts` (`units/MPR-11-providers-route-gate.md` line 17). MPR-11 keeps the `ProvidersPanel` export that SAU-15 imports (`plans/MPR-09.md` line 232). Both new route entries go above `'**'`. On a conflict, keep both entries, once each.
- **SAU-06, SAU-09, SAU-10 (done).** The sign-in notice and its constants are used, not changed. The routes listed in section 1a exist, and SAU-15 changes none of them.
- **PLT-18 (done).** Its README sections (Install, update and roll back) are not changed.

## 6. Open points

1. **Shell notices banner (unit line 17, optional).** Not built (D11). A banner that covers every page needs a status read in the Shell's App component, which is not in this unit's files. Navigator: confirm, or name the unit that does it.
2. **Preferences form and SAU-13.** The merge order is in section 5. The genre pack is free text here, and SAU-13 names a choice list that no decision has settled (`units/SAU-13-preferences-step.md` line 15). Navigator: confirm free text for SAU-15, and whether SAU-13 reuses `PreferencesForm`.
3. **Wipe wording beyond the unit.** The unit's wipe step (line 20) does not name the user's tool packs, but the wipe deletes them, and so does the provider key file. D10 names both, and the checks are in section 7. Navigator: confirm this factual correction. No criterion changes.
4. **Allowlist step.** Recovery step 4 (unit line 22) tells the reader to use the allowlist. The allowlist API is SAU-19 and its editor is SAU-20, and neither is on main, so the step names a control that does not exist yet. The plan keeps the unit's words. Navigator: keep them now, or hold step 4 until SAU-20.
5. **Extra test Y1.** It is not a criterion. It guards the production shape that the default-only mock imitates. `plans/DECISIONS.md` lines 3961 to 3967 record two defects of this kind. Navigator: keep or drop.
6. **Build warnings and budget.** The platform import and the providers code in the settings chunk may add a CommonJS warning or change the lazy chunk sizes. Step 8 records both. A new warning would need an `allowedCommonJsDependencies` entry, which is a Navigator decision (`plans/DECISIONS.md` line 1084: the default build has none).
7. **Phone navigation width.** The phone bottom bar gains an item (Settings), and MPR-11 would add Providers. No test here checks that the bar still fits 390 px (the bar's geometry is in `plans/SHL-05.md` decision 12). Navigator: name the check, for SAU-16's e2e or a visual check.
8. **Identity sentences exist twice** (`settings-page.ts` and `setup-page.ts`, D7). Sharing them later would edit SAU-11's file. Navigator: leave as is, or assign a cleanup.

## 7. Facts checked (at `821d1d6`; reads, greps and `git` only)

- **Git.** Branch `main`, HEAD `821d1d6`, tree clean. `plans/SAU-15.md` did not exist. `plans/SAU-11.md` was revised at `821d1d6` (status `planned`, line 3).
- **Units.** `units/SAU-15-settings-page.md`: Decisions lines 14 to 23, criteria at lines 26 and 27. `units/SAU-16-setup-flow-gate.md`: `blocked_by` line 7, the compose criterion at line 24. `units/SAU-20-tailscale-ui.md`: `blocked_by` line 7, Decisions at lines 15 to 17. `units/SAU-13-preferences-step.md`: Decisions at lines 15 to 17. `units/SAU-11-wizard-shell-routing.md`: Decisions lines 15 to 20 and criteria lines 23 to 26, as `plans/SAU-11.md` gives them. `units/README.md` line 136 (testing).
- **Route table.** `apps/web/src/app/app.routes.ts`: `core-gate` nav order 100; `setup` entry lines 77 to 88 (path at line 78, no nav); `projects` entry from line 89; `{ path: '**', component: NotFoundPage }` at line 102. `modules/shell.md` line 55: `/settings`, Setup & auth, app, phone, nav yes. `plans/SHL-05.md` decision 11 (nav sorted by `nav.order`) and decision 12 (bar geometry).
- **Feature files.** `setup-auth.routes.ts`: one export, `setupRoutes`, at line 4. `setup-contract.ts` (27 lines): header lines 1 to 9, the `Pick` lines 16 to 21, `mod.default ?? mod` at line 26, and `loadSetupAuthContract` from line 13. `setup-contract.spec.ts`: test X5 at line 14. `setup-page.ts`: `identityText` at line 61, `onContinue` at line 67, `load` at line 88, `fail` at line 106. `sign-in-notice.ts`: `SIGN_IN_COMMAND` line 4, `DOCKER_LOGS_COMMAND` line 7, `tailnetExplanation` line 19. `setup-page.spec.ts`: tests C1a to X4 (the names start at lines 129 to 342).
- **Shell.** `apps/web/src/app/shell/api-client.ts` lines 104 and 105: a 401 navigates to `/setup`. `shell/index.ts` exports `API_CLIENT`, `ApiError`, `ApiPath`, `ResponseSchema`, `NoticesService` and `ShellRouteData`. `shell/platform-copies.ts` line 27 holds the hand-written `versionInfoCopy`, which the index does not export. `shell/testing/test-doubles.ts`: `FakeApiClient` (`respond`, `fail`, `requests`) and `createShellTestDoubles`. `shell/project-switch-follow.spec.ts` test E4 at line 60 navigates to `/settings` at line 76.
- **Providers.** `apps/web/src/app/features/providers/providers.routes.ts` line 3 exports `ProvidersPanel`. `providers-copies.ts` line 285 (comment) and 286 (`emptyBodyCopy`) accept a 204 with no body.
- **Contract.** `packages/contracts/src/setup-auth/routes.ts`: `SETUP_STATUS_ROUTE` line 4, `IDENTITY_ROUTE` line 9, `SIGN_OUT_ROUTE` line 10, `PREFERENCES_ROUTE` line 14, `SETUP_PAGE_PATH` line 21. `identity.ts` line 5 (`identitySchema`). `settings.ts` line 9 (`preferencesSchema`). `status.ts` line 34 (`setupStatusSchema`). `errors.ts` (`SETUP_AUTH_ERROR_CODES`). `packages/contracts/src/platform/http.ts`: `VERSION_ROUTE` line 9, `versionInfoSchema` line 20.
- **API.** `setup-session.controller.ts`: identity at lines 103 and 104, sign-out at lines 121 and 122 (`@HttpCode(204)` on line 122). `setup-flow.controller.ts`: preferences GET at line 22, POST at line 28. `setup-status.controller.ts`: GET status at line 22, POST continue at line 29. `setup-status.service.ts` line 101 (`preferences()`). `setup-token.store.ts` lines 91 to 108 (token loaded or created at boot; `setup-url` rewritten on each start).
- **Library folder.** `settings.file.ts` line 7 (`.scriba/settings.yaml`). `secrets-store.ts` line 25 (`.scriba/secrets.yaml`). `search.service.ts` line 175 (`.scriba/index`). `packs.ts` lines 80 to 82 (`.scriba/packs/user/tools`). `files.service.ts` line 490 (a project's `.scriba/<owner>/`, inside the project).
- **Docs.** `README.md` headings at lines 1, 5, 19, 23, 33, 47, 51, 60 and 72. The security sentence is at line 74. `deploy/RUNBOOK.md` line 1 is "Smoke runbook". `scripts/entrypoint.sh` line 20 (the one-liner) and line 139 (`$LIBRARY/.scriba/setup-url`). `package.json` line 25 (`node --test 'scripts/*.test.mjs'`). `apps/web/package.json` line 8 (`ng test --watch=false`). `scripts/boundaries.test.mjs` lines 1 to 12 (the file-reading test pattern).
- **Lint.** `eslint.config.mjs`: the `boundaries/files` rule makes `features/*/*.routes.ts` the only entry file a feature may import from another feature. Settings imports `ProvidersPanel` from `providers.routes.ts`, so that is allowed.
- **e2e.** No file under `e2e/specs/` mentions `settings`, `nav` or a navigation link (grep).
- **Plans.** `plans/SAU-06.md` line 176 (the grep rule), line 245 (the SAU-15 row), section 1 (decision 1a-12). `plans/SAU-03.md` line 153 (sign-out per browser). `plans/SAU-09.md` line 124. `plans/SAU-10.md` lines 127 and 145, line 21 of its unit (the one-liner). `plans/MPR-09.md` line 77 (D1), line 222 and line 232. `plans/MPR-10.md` line 107 (stubs) and line 145. `plans/SHL-01.md` line 28 (decision 9). `plans/DECISIONS.md` lines 953, 1084, 3395 to 3400, 3961 to 3967 and 4125 to 4142. `plans/SAU-11.md` P1, P7, P9, section 5 (line 163) and line 35 (re-run). `plans/QUEUE.md` line 9.
- **Files that are not on main.** `compose-warning.ts`, `preferences-form.ts` and `settings-page.ts` do not exist. The `/providers` route and `providersRoutes` (MPR-11) do not exist.
- **Tree.** `packages/contracts/dist` is not built in this checkout, so step 0 builds it.

## 8. Assumed (not checked here)

- ASSUMED: `ng test --watch=false` accepts a file filter, so step 1 and step 5 can run one spec. The implementer checks it and records the command.
- ASSUMED: `TestBed.overrideComponent` with `remove` and `add` of `imports` works for a standalone component that is created directly with `TestBed.createComponent`.
- ASSUMED: `router.url` changes after `navigateByUrl('/setup')` even without a router outlet in the created component. S1 depends on it. If it does not, S1 uses `RouterTestingHarness` for those two checks.
- ASSUMED: a 204 reaches the client as `null` on both HTTP backends. `providers-copies.ts` line 285 says so, and it is the providers plan's A5, not measured here.
- ASSUMED: nav order 90 and the icon `settings` suit the Shell (D1).
- ASSUMED: `docker compose stop`, `docker compose restart` and the install-folder commands in the README behave as the docs say. They are not run here.
- ASSUMED: the sentences of D4 are acceptable. SAU-11 may write its own, under section 5.
- NOT RUN: no build, no test, no lint, no e2e and no Docker in this planning. Line numbers are the planner's reads at `821d1d6`.

## 9. Review parts

- **Part 1: the settings page (criterion 1).** Steps 0 to 8. Tests: S1 (criterion 1) and Y1 (extra). Commits: the red tests, then one green commit.
- **Part 2: the recovery docs (criterion 2) and the unit gates.** Steps 9 to 11. Tests: D1 (criterion 2).

Every step and every test is in exactly one part.
