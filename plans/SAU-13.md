---
id: SAU-13
status: planned
---
# SAU-13 plan — /setup Preferences step

Draft by the Haiku planner on `main` at `2b6a50e`. Revised by the Opus reviser on `main` at `a01e942` (after the draft: the SAU-13 draft commit and MPR-11 on `main`; MPR-11 changes no file of this plan). The unit is `units/SAU-13-preferences-step.md`: front matter lines 7 to 9 (`blocked_by` SAU-09 and SAU-11; `parallel_with` SAU-12, SAU-14, SAU-15; `unblocks` SAU-16), Decisions lines 15 to 17, acceptance criteria lines 20 and 21. The unit has no "Moved to", "Removed by revision", "Loosened by revision" or "Reworded by revision" note. The only entry in `plans/DECISIONS.md` that names SAU-13 is the SHL-04 review line 1099 (the toolbar alignment note, which this plan obeys). No unit file changes.

**Main correction of the revision.** The draft read the stored values in `SetupPage` when the page enters the preferences step, and claimed that no existing test enters that step. That is wrong once SAU-12 is on `main`: SAU-12's planned tests P4 and P6 (`plans/SAU-12.md` section 4) move from the providers step to the preferences step, and P4 asserts the exact list of requests after its click. A page-level read would add an unanswered `GET PREFERENCES_ROUTE` to that list, in either merge order. The revision moves the step's content into its own component, `PreferencesStep` (it reads and saves the preferences), which `setup-page.spec.ts` stubs in its `StepBody` override, the rule SAU-12 set for every step unit (`plans/SAU-12.md` section 5: "`TestBed.overrideComponent(StepBody, …)` appears once, and each unit adds its own stub to the same `remove` and `add` lists"). The page still writes the step state.

## 1. Decisions this plan obeys

### 1a. Settled by the unit, the module and earlier plans

- **D1 Fields.** The author display name and the default genre pack, both text. The genre pack offers choices from the built-in packs and keeps free text as the fallback. Source: unit line 15.
- **D2 The choices are `nonfiction` and `fiction`.** The unit names them (unit line 15). `core` is not a genre choice: it is always active and comes with every project (`modules/genre-packs.md` line 40). User packs are not offered: the unit adds them only "if listed by the Tool registry" (unit line 15), and no route on `main` lists pack names (a tool summary carries only an `origin`, `packages/contracts/src/tool-registry/catalog.ts` line 31). Open point 1 of the draft, settled in section 6.
- **D3 The theme is device-local.** The step embeds the Shell's `ThemeToggle` (`apps/web/src/app/shell/index.ts` line 9). `ThemeService.set` writes `localStorage` under `scriba.theme` and sets `data-theme` on `<html>` (`shell/theme.ts` lines 8 and 49 to 53), and sends no request. The theme is in no POST body: `preferencesSchema` holds only `authorName` and `defaultGenrePack` (`packages/contracts/src/setup-auth/settings.ts` lines 7 to 12). Sources: unit lines 16 and 21; `modules/shell.md` line 82; `plans/SHL-04.md` line 175 (the toggle is neutral, with no margin or host style).
- **D4 Save sends only the changed fields.** The step posts the changed keys to `PREFERENCES_ROUTE` (`packages/contracts/src/setup-auth/routes.ts` line 14). `PreferencesForm` already emits only the changed keys and disables its button when none changed (`preferences-form.ts` lines 30 to 45 and 56 to 60; `plans/SAU-15.md` D6). The API merges field by field (`setup-flow.controller.ts` lines 22 and 28 to 33; `setup-status.service.ts` `savePreferences`). Source: unit line 17; `units/SAU-09-setup-flow-api.md` line 20.
- **D5 Save marks the step done.** After the preferences POST succeeds, the page posts `{state: 'done'}` to the step route, in a second request. Source: unit line 17; `plans/SAU-09.md` line 122 ("its preferences step state is a separate `POST steps/preferences` call").
- **D6 Prefill.** The stored values are the field defaults. Source: unit line 20; `plans/SAU-11.md` P12.
- **D7 Runtime contract values come through the loader.** `PREFERENCES_ROUTE` and `preferencesSchema` are read through `loadSetupAuthContract`. Types come only with `import type`. Source: the header of `setup-contract.ts` (lines 1 to 8); `plans/SAU-11.md` P9.
- **D8 The step's controls are its own.** Each step unit states its marking rule and changes its own controls in `setup-page.ts`. Source: `plans/SAU-11.md` P14; unit line 17.
- **D9 Errors.** A 401 shows the sign-in notice, a tailnet code shows its explanation, any other error shows its message. This is the existing `fail()` of `SetupPage`. Source: `modules/setup-auth.md` line 42.
- **D10 No API change and no contract change.** The preferences GET and POST and `POST /api/setup-auth/steps/:step` exist (SAU-09, done). Source: `units/SAU-09-setup-flow-api.md` lines 18 to 20; `packages/contracts/src/setup-auth/status.ts` line 41 (`stepUpdateSchema`).
- **D11 One `StepBody` override in `setup-page.spec.ts`.** Each step unit that embeds a component with its own requests adds its own stub to that override. Source: `plans/SAU-12.md` section 5 and step 6.

### 1b. Small decisions (taken here, the simplest option)

- **S1 Controls of the step.** The form's own button, `Save preferences`, is the done path (D4, D5). Below the body the page shows `Skip`, `Next` and `Skip the rest`. `Mark done` is not shown on this step.
- **S2 Save stays on the step.** After a successful save the step shows the saved values and the list shows `Preferences: done`. The author moves on with `Next`. Reason: the settings page works this way (`plans/SAU-15.md` D6), and it keeps the first-project body out of this unit's tests.
- **S3 Save needs a change.** The form's button is disabled when no field differs (`hasChanges`). `Next` writes nothing. `Skip` writes `skipped`.
- **S4 The step reads the stored values when it is shown.** `PreferencesStep` reads `GET PREFERENCES_ROUTE` when it is created, which is when the page enters the preferences step. Nothing is read at page load.
- **S5 The step component.** New file `preferences-step.ts`, component `PreferencesStep`, selector `app-preferences-step`, no inputs. Its template: `@if (stored(); as values) { <app-preferences-form [stored]="values" (save)="onSave($event)" /> }`, then `<p>Theme is kept on this device only.</p>`, then `<app-theme-toggle />`. Outputs: `saved = output<void>()` and `failed = output<unknown>()`. It has no inputs, so a stub with the same selector and no members can replace it in a test.
- **S6 The form is reused, and the settings page gets the same choices.** `units/SAU-15-settings-page.md` line 16 says the settings page has the "same fields as the step", so one form serves both pages. The datalist options carry only a `value` attribute and no text, so no text of the settings page changes.
- **S7 Where the choices live.** `export const GENRE_PACK_CHOICES = ['nonfiction', 'fiction'] as const;` in `preferences-form.ts`. The genre pack input gets `list="genre-pack-choices"`, and the form renders `<datalist id="genre-pack-choices">` with one `<option [value]="choice">` per choice, after the genre pack label. The text input stays, so free text is accepted.
- **S8 Names and files.** One new spec file, `preferences-step.spec.ts`, with the tests PR1 to PR8. Its helpers (`renderSetup`, `rootOf`, `buttonNamed`, `buttonTexts`, `settle`, `stepItems`) and its `beforeEach` / `afterEach` with `stubMatchMedia(390, 844)` and `restoreMatchMedia()` are copied from `setup-page.spec.ts`. Every `vi.waitFor` in the new file has `timeout: 5000`, as `settle` does (the MPR-11 failed check of 2026-11-16 in `plans/DECISIONS.md`).
- **S9 The providers panel is stubbed in the new spec.** `renderSetup` in `preferences-step.spec.ts` calls `TestBed.overrideComponent(StepBody, { remove: { imports: [ProvidersPanel] }, add: { imports: [ProvidersStub] } })` (`ProvidersPanel` from `../providers/providers.routes`; `ProvidersStub` with selector `app-providers-panel` and an empty template, as `settings-page.spec.ts` lines 27 to 31). The tests pass through the providers step; with SAU-12 and MPR-11 (now on `main`) the real panel would make requests that the test does not answer.
- **S10 Next and Skip drop unsaved drafts.** No prompt.
- **S11 Body checks are exact.** Request bodies are checked with `toStrictEqual`.
- **S12 Opening step.** No change: the wizard still opens at Access (`plans/SAU-11.md` P5).
- **S13 Errors of the step reach the page.** `PreferencesStep` emits `failed` with the error of its GET or POST, `StepBody` passes it on, and the page calls its `fail()` (D9). The step keeps its drafts after a failed save.

## 2. Files to change

Only these paths change.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/setup-auth/preferences-form.ts` | edit | `GENRE_PACK_CHOICES`, the `list` attribute and the datalist (S7). Nothing else in the form changes |
| `apps/web/src/app/features/setup-auth/preferences-step.ts` | new | `PreferencesStep` (S5, step 5) |
| `apps/web/src/app/features/setup-auth/step-body.ts` | edit | The `preferences` case renders `<app-preferences-step (saved)="preferencesSaved.emit()" (failed)="preferencesFailed.emit($event)" />`. New outputs `preferencesSaved = output<void>()` and `preferencesFailed = output<unknown>()`. `PreferencesStep` added to `imports`. The class doc comment names the preferences case |
| `apps/web/src/app/features/setup-auth/setup-page.ts` | edit | Step 7: the two output bindings on `<app-step-body>`, the `preferences` control branch, `postStep`, `onPreferencesSaved()`, `onPreferencesFailed()`, and one sentence of the class doc |
| `apps/web/src/app/features/setup-auth/setup-contract.ts` | edit | `loadSetupAuthContract`'s `Pick` gains `'PREFERENCES_ROUTE'` and `'preferencesSchema'`. Its doc comment names the preferences route |
| `apps/web/src/app/features/setup-auth/preferences-step.spec.ts` | new | PR1 to PR8 (section 4) |
| `apps/web/src/app/features/setup-auth/setup-page.spec.ts` | edit | Step 8 only: the `PreferencesStep` stub in the `StepBody` override of `renderSetup`, and the placeholder assertions of the preferences step, if the base has any |
| `e2e/specs/setup-phone.e2e.ts` | edit | The assertion of `Preferences are not set up yet.` (line 248 on `main`) only (step 10) |

Checked and not changed: `settings-page.ts` and `settings-page.spec.ts` (must pass unchanged); `setup-contract.spec.ts`; `shell/**`; `packages/**`; `apps/api/**`; `units/**`; `modules/**`; `plans/**`.

## 3. Procedure

Run in a new worktree: `git worktree add -b unit/SAU-13 /Users/bbartolome/workspace/scriba-prototype-wt/SAU-13 main`. Use absolute paths in every command. Record `node -v` (expected `v26.x`) and `npm -v` beside the first result. Do not push.

0. **Preconditions.** In the worktree, `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`, then `ls packages/contracts/dist/setup-auth/index.js`. Expected: exit 0 and the file is listed.
1. **Baseline.** `npm test -w @bbartolome/scriba-web`, `npm run lint -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web`. Expected: exit 0 for each. Record the test count and the CommonJS warnings that `ng build` prints. Also record whether `step-body.ts` imports `ProvidersPanel` and whether `setup-page.spec.ts` already has a `TestBed.overrideComponent(StepBody, …)` call (both are there only when SAU-12 is on the base).
2. **Red tests.** Create `preferences-step.spec.ts` with the tests of section 4 and the helpers of S8 and S9. It imports `GENRE_PACK_CHOICES` from `./preferences-form`; until step 4 the test file does not compile, which counts as red. Run it. Commit it by path: `git add -- apps/web/src/app/features/setup-auth/preferences-step.spec.ts` and `git commit -m "test(SAU-13): add the preferences step tests (red)" -- apps/web/src/app/features/setup-auth/preferences-step.spec.ts`.
3. **Contract loader.** In `setup-contract.ts`, add `'PREFERENCES_ROUTE'` and `'preferencesSchema'` to the `Pick` of `loadSetupAuthContract`, and name the preferences route in its doc comment (D7). Expected: `npx tsc --noEmit -p apps/web/tsconfig.app.json` exits 0.
4. **Choices.** In `preferences-form.ts`, add `GENRE_PACK_CHOICES` (S7), the `list` attribute and the datalist. Update the class doc: the genre pack offers the built-in packs as choices and accepts free text. Expected: `settings-page.spec.ts` passes unchanged.
5. **Step component.** Create `preferences-step.ts` (S5). Imports: `Component`, `DestroyRef`, `inject`, `output`, `signal` from `@angular/core`; `takeUntilDestroyed`; `API_CLIENT` and `ThemeToggle` from `'../../shell'`; `PreferencesForm` from `./preferences-form`; `loadSetupAuthContract` from `./setup-contract`; `import type { Preferences }` from the contract. Members:
   - `private contract` (the loaded contract or `undefined`), `protected readonly stored = signal<Preferences | undefined>(undefined)`, `private readonly saving = signal(false)`.
   - The constructor calls `void this.load()`. `load()`: inside `try`, `await loadSetupAuthContract()`, keep it, then `this.api.get(contract.PREFERENCES_ROUTE, contract.preferencesSchema)` with `takeUntilDestroyed(this.destroyRef)`; `next` sets `stored`; `error` emits `failed`. The `catch` emits `failed`.
   - `protected onSave(changed: Partial<Preferences>)`: returns when `contract` is undefined or `saving()` is true. Sets `saving` to true. Posts `changed` to `PREFERENCES_ROUTE` with `preferencesSchema` and `takeUntilDestroyed`. `next`: sets `stored` to the answer, sets `saving` to false, emits `saved`. `error`: sets `saving` to false, emits `failed` with the error.
   - Class doc: the preferences step reads the stored values when shown, posts only the changed fields, emits `saved` after a save so the page marks the step done, and embeds the Shell's device-local theme toggle.
   Expected: the file has no value import from `@bbartolome/scriba-contracts`.
6. **Step body.** In `step-body.ts`, replace the `preferences` case and add the outputs and the import (section 2). Expected: the other cases are unchanged.
7. **Page.** In `setup-page.ts`:
   a. On `<app-step-body>`, add `(preferencesSaved)="onPreferencesSaved()"` and `(preferencesFailed)="onPreferencesFailed($event)"`.
   b. In the non-last-step controls, put a preferences branch before the generic branch: `@if (step() === 'preferences') { <button mat-stroked-button [disabled]="busy()" (click)="writeState('skipped')">Skip</button> } @else if (step() !== 'access') { …the existing Mark done and Skip… }`. If SAU-12 is on the base, the chain is `@if (step() === 'providers') {…} @else if (step() === 'preferences') {…} @else if (step() !== 'access') {…}` (section 5). `Next` and `Skip the rest` are unchanged.
   c. Move the POST of `writeState` into `private postStep(state: 'done' | 'skipped', after: () => void)`. It does not check `busy` and does not call `begin()`. It posts `{state}` to the step route of `this.step()` with `setupStatusSchema` and `takeUntilDestroyed`. `next`: sets `status`, sets `busy` to false, calls `after()`. `error`: sets `busy` to false, calls `fail()`. `writeState` keeps its guard and `begin()`, then calls `postStep(state, () => (this.isLastStep() ? this.finish() : this.moveOn()))`. Its behaviour does not change.
   d. `protected onPreferencesSaved()`: returns when `contract` is undefined or `busy()` is true; calls `begin()`; calls `postStep('done', () => undefined)`. The page stays on the step (S2).
   e. `protected onPreferencesFailed(error: unknown)`: calls `this.fail(error)`.
   f. Class doc: add one sentence: on the preferences step, Save writes the changed fields and marks the step done, Skip writes skipped, and there is no Mark done.
   Expected: `setup-page.ts` has no value import from the contract (the grep rule of `plans/SAU-11.md` step 5).
8. **Page spec stub.** In `setup-page.spec.ts`, add a spec-local `@Component({ selector: 'app-preferences-step', template: '' }) class PreferencesStepStub {}` with a one-line doc comment, and the imports `Component` (`@angular/core`), `PreferencesStep` (`./preferences-step`) and `StepBody` (`./step-body`) where they are missing. In `renderSetup`, before `configureTestingModule`:
   - If there is no `TestBed.overrideComponent(StepBody, …)` (SAU-12 not on the base): add `TestBed.overrideComponent(StepBody, { remove: { imports: [PreferencesStep] }, add: { imports: [PreferencesStepStub] } });`.
   - If there is one (SAU-12 on the base): add `PreferencesStep` to its `remove.imports` and `PreferencesStepStub` to its `add.imports`. Do not add a second call.
   - Replace each assertion of the text `Preferences are not set up yet.` (none on `main` at `a01e942`; SAU-12's P4 and P6 may have one) with `expect(root.querySelector('app-preferences-step')).not.toBeNull();`, with the same root variable. Nothing else in the file changes.
   Expected: every test of `setup-page.spec.ts` passes, and no test of that file sends `GET PREFERENCES_ROUTE`.
9. **Green.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0. PR1 to PR8 pass. Every other web test passes, with `setup-page.spec.ts` changed only as step 8 says.
10. **Phone e2e.** In `e2e/specs/setup-phone.e2e.ts`, replace the assertion of `Preferences are not set up yet.` (lines 247 to 249 on `main`) with `await expect(page.getByRole('textbox', { name: 'Author name', exact: true })).toBeVisible();` and `await expect(page.locator('app-setup-page app-theme-toggle [aria-label="Theme"]')).toBeVisible();`. Keep `expectPhoneLayout` after them and the rest of the step (its name, its first click and its `Next`) as the base has it. Run `npm run e2e -w @bbartolome/scriba-e2e -- --trace off`. Expected: `setup-phone` passes. If the browser is not available, record the e2e as not run, with the reason, and do not mark it passed.
11. **Format, lint and build.** `npx prettier --write` on every path of section 2. Then `npm run lint -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web`. Expected: exit 0. The CommonJS warnings equal the list of step 1. **Stop rule:** a new warning or a failed build stops the unit. Report it and do not change the plan.
12. **Mutation checks.** Apply each change in turn, run `npm test -w @bbartolome/scriba-web -- --include 'src/app/features/setup-auth/preferences-step.spec.ts'`, record the failing tests, and revert. Expected after each revert: `git diff` is empty.
    - M1: `onSave` posts `{...stored, ...changed}` instead of `changed`. Expected: PR1 fails.
    - M2: `onPreferencesSaved` returns without `postStep`. Expected: PR1 fails.
    - M3: `<app-theme-toggle />` is replaced by `<button type="button">Dark</button>`. Expected: PR2 fails.
    - M4: the constructor of `PreferencesStep` does not call `load()`. Expected: PR1 and PR7 fail.
    - M5: the datalist is removed. Expected: PR3 fails.
    - M6: the preferences branch shows `Mark done` as well. Expected: PR5 fails.
13. **Commit.** `git add -- apps/web/src/app/features/setup-auth/preferences-step.ts`, then `git commit -m "feat(SAU-13): preferences step with the device theme toggle" -- <every path of section 2 that changed>`. Never `git add -A` and never `git commit -a`. Expected: the commit holds only section 2 paths.

## 4. Acceptance criteria and tests

The unit has two criteria (unit lines 20 and 21). Each has one named test (PR1, PR2). PR3 to PR8 test decisions of section 1 that the criteria do not state. Run them all with `npm test -w @bbartolome/scriba-web`. Nothing needs a remote, CI or Docker. Seam for every test: `/setup` rendered through `RouterTestingHarness` with `provideRouter(APP_ROUTES)` and `createShellTestDoubles()`, as `setup-page.spec.ts` does (`modules/setup-auth.md` line 68, the UI seam), with the S9 override.

Shared fixtures in the spec: `atPreferences` = `{steps: {access: 'done', tailscale: 'skipped', providers: 'skipped', preferences: 'pending', firstProject: 'pending'}, complete: false, compose: SETUP_AUTH_EXAMPLES.composeOk}`. Entering the step: answer `GET IDENTITY_ROUTE` with `SETUP_AUTH_EXAMPLES.identityLoopback`, `GET SETUP_STATUS_ROUTE` with `atPreferences` and `GET PREFERENCES_ROUTE` with `SETUP_AUTH_EXAMPLES.preferences` (`authorName` `'Ada'`, `defaultGenrePack` `'mystery'`), then click `Next` three times from Access, with `settle` after each click.

| Criterion | Test (name and file) | Pass condition |
|---|---|---|
| 1. "Prefills saved values; changing only the genre pack sends only that field." | **PR1** `preferences-step.spec.ts`: "PR1 prefills the stored values, and saving only a changed genre pack posts only that field and marks the step done" | The input `name="authorName"` has the value `Ada` and `name="defaultGenrePack"` has `mystery`. Answer `POST PREFERENCES_ROUTE` with `{authorName: 'Ada', defaultGenrePack: 'nonfiction'}` and `POST /api/setup-auth/steps/preferences` with `atPreferences` with `preferences: 'done'`. Set the genre pack input to `nonfiction`, dispatch `input`, and click `Save preferences`. The POST requests after the click are exactly, in order: `POST PREFERENCES_ROUTE` with body `{defaultGenrePack: 'nonfiction'}` (`toStrictEqual`), then `POST /api/setup-auth/steps/preferences` with body `{state: 'done'}` (`toStrictEqual`). The list shows `Preferences: done`, and `Save preferences` is still shown (the page is still on the step). |
| 2. "The theme toggle is the Shell's component and makes no server call." | **PR2** `preferences-step.spec.ts`: "PR2 the theme toggle is the Shell's ThemeToggle, and choosing a theme makes no server call" | On the preferences step, `harness.fixture.debugElement.queryAll(By.directive(ThemeToggle))` has length 1 (`ThemeToggle` from `../../shell`), and `[aria-label="Theme"]` is inside `app-theme-toggle`. Record `doubles.api.requests.length`. Click the button `Dark` inside `app-theme-toggle` and `settle`. The count is unchanged. `localStorage.getItem('scriba.theme')` is `'dark'`, and `document.documentElement.getAttribute('data-theme')` is `'dark'`. `afterEach` removes the storage key and the `data-theme` attribute. |
| (extra) | **PR3** "PR3 the genre pack input lists the built-in choices in a datalist" | The genre pack input's `list` attribute is `genre-pack-choices`; the values of `datalist#genre-pack-choices option` equal `['nonfiction', 'fiction']` and equal `GENRE_PACK_CHOICES`. |
| (extra) | **PR4** "PR4 Next writes nothing and moves on" | From the preferences step, `Next` sends no POST request. After it, `Save preferences` is gone. The first-project body is not asserted (SAU-14 owns it). |
| (extra) | **PR5** "PR5 Skip writes skipped and moves on, and Mark done is not shown on the preferences step" | Before the click, the button texts include `Save preferences`, `Skip`, `Next` and `Skip the rest`, and not `Mark done`. Answer the step POST with `atPreferences` with `preferences: 'skipped'`. `Skip` sends exactly one POST: `POST /api/setup-auth/steps/preferences` with body `{state: 'skipped'}`. After it, `Save preferences` is gone. |
| (extra) | **PR6** "PR6 a failed save shows its message, keeps the draft, and writes no step state" | `doubles.api.fail('POST', PREFERENCES_ROUTE, new ApiError(500, CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE, 'The server sent an unexpected response.'))` (`ApiError` and `CLIENT_ERROR_CODES` from `../../shell/api-error`, as `setup-page.spec.ts` imports them). Change the genre pack and Save. The `role="alert"` line shows that message. No POST to `/api/setup-auth/steps/preferences`. `Save preferences` is still shown, and the genre pack input still has the typed value. |
| (extra) | **PR7** "PR7 the stored values are read when the step is shown, not at load" | Before the third `Next`, the requests hold no `GET PREFERENCES_ROUTE`. After it, exactly one. |
| (extra) | **PR8** "PR8 every genre choice is a built-in pack other than core" | Every entry of `GENRE_PACK_CHOICES` is in `BUILTIN_ORIGINS` (from `@bbartolome/scriba-contracts/tool-registry`), and none is `'core'`. |

Regression checks (not criteria): **R1** every test of `setup-page.spec.ts` (with the step 8 stub), `settings-page.spec.ts` and `setup-contract.spec.ts` passes. **E1** the phone e2e `setup-phone` passes with the step 10 change.

No criterion needs something that this environment lacks.

## 5. Agreement with the downstream and the parallel units

- **SAU-16 (setup-flow gate; `blocked_by` SAU-13; no plan, no branch).** No SAU-16 file changes. Its criterion 2 (`units/SAU-16-setup-flow-gate.md` line 21) and its demo (line 28) agree with this plan; see section 6, point 2.
- **SAU-12 (providers step; `planned`; `unit/SAU-12` has one commit, `842c00a`, that changes `step-body.ts` and adds the providers copy files and `providers-step.spec.ts`).** Shared files and merge rules, correct in either order:
  - `step-body.ts`: keep both units' imports (`ProvidersPanel`, `RouterLink`, `PreferencesStep`), both units' members (`router`, `panelAvailable()`, the two preferences outputs) and each unit's own `@case`. The class doc names both cases.
  - `setup-page.ts` controls: `@if (step() === 'providers') {Continue, Skip} @else if (step() === 'preferences') {Skip} @else if (step() !== 'access') {Mark done, Skip}`, then `Next` and `Skip the rest`. The class doc keeps both sentences. SAU-12's `continueProviders()` calls `writeState('done')`, which keeps its behaviour under step 7c.
  - `setup-page.spec.ts`: one `TestBed.overrideComponent(StepBody, …)` in `renderSetup`, with `remove: { imports: [ProvidersPanel, PreferencesStep] }` and `add: { imports: [ProvidersStub, PreferencesStepStub] }` (SAU-12's rule, D11). SAU-12's P4 and P6 move onto the preferences step; with the stub they see no preferences request, so P4's exact request list holds. If SAU-12's P4 or P6 asserts the text `Preferences are not set up yet.`, the second merger replaces it with `expect(root.querySelector('app-preferences-step')).not.toBeNull()` (SAU-13 does this in step 8 when SAU-12 is first; SAU-12's rebase does it when SAU-13 is first).
  - `setup-phone.e2e.ts`: SAU-12 changes the providers assertion (lines 239 to 241) and the step name and its click (lines 245 and 246). SAU-13 changes only the preferences assertion (lines 247 to 249). The lines are adjacent, so a textual conflict is possible; keep both changes.
  - SAU-12's tests in `providers-step.spec.ts` render `StepBody` with `step = 'providers'`; `PreferencesStep` is not created there.
- **SAU-14 (first-project step; parallel; no plan).** It reads `defaultGenrePack` for **New** through its own `GET PREFERENCES_ROUTE` (`units/SAU-14-first-project-step.md` line 15). Shared spots: the `Pick` of `setup-contract.ts` (keep the entries of both units), `step-body.ts` (imports, members, own `@case`), `setup-page.ts` (the control chain, as above; SAU-14's controls are those of the last step), `setup-page.spec.ts` (if SAU-14 embeds a component with its own requests, it adds its stub to the same override). `preferences-step.spec.ts` PR4 and PR5 move to the first-project step and check only that `Save preferences` is gone, so SAU-14 must keep them passing (its body may make requests; an unanswered one shows an alert, which PR4 and PR5 do not check).
- **SAU-20 (Tailscale UI; M3; no plan).** Its controls are a branch of the same chain in `setup-page.ts`. No other shared line.
- **SAU-15 (settings page; done).** The form changes only by the datalist (S6). Its spec must pass unchanged.
- **SAU-09 (done).** Used as it is (D10).
- **MPR-11 (done, on `main` at `a01e942`).** It adds the top-level `providers` route, so with SAU-12 the step body embeds the panel; S9 stubs it. No shared file.
- **AGL-25, MPR-12 (`planned`).** Neither names a file of section 2.
- **SHL-04 (done).** `ThemeToggle` is used as it is (`plans/SHL-04.md` line 175 names SAU-13 as its consumer). The toggle has no host style; this plan adds none.

## 6. Open points (settled by the revision)

1. **Which built-in packs the genre choice offers.** Settled: `nonfiction` and `fiction`, the two names of the unit (unit line 15), with free text as the fallback. Not a Navigator point: the unit names them, and nothing breaks when a project names a pack whose folder is not built yet: the Project store accepts any non-empty name (`packages/contracts/src/project-store/project.ts` lines 23 and 56), and the Tool registry gives an unknown or absent pack `core` and `user` (`apps/api/src/modules/tool-registry/catalog.service.ts` lines 60 to 66). Option (b) (`nonfiction` only) would narrow the unit's decision without a cause; option (c) (a route that lists packs) is an API and contract change that nothing needs now.
2. **SAU-16's wording.** Settled: no conflict, no unit change. (i) "Change only the default genre pack and confirm nothing else changed in `settings.yaml`" (SAU-16 line 28): in the demo, the author name is set first, and that Save marks the step `done`; the later Save of the genre pack writes `done` again, the same value, so only `defaultGenrePack` differs. Criterion 2 says "saving one step changes only that step's fields"; the step's own state is part of that step. (ii) "Re-open `/setup` and see every answer prefilled" and criterion 2's "shows every saved value as a default": each step shows its stored values when it is shown (S4), which is when the author sees the step. The SAU-16 planner words its demo steps to match. No criterion and no settled decision changes.
3. **The cross-plan conflict of the draft (found by the revision).** Settled by S4, S5 and step 8 (see the note at the top).

## 7. Facts checked and assumed

**Checked by the reviser on `main` at `a01e942`:**

- `prompt.md` sections Revise, When a plan does not work, Changes of units that the reviser can make.
- `units/SAU-13-preferences-step.md` (no change note); `units/SAU-14`, `SAU-15`, `SAU-16`, `SAU-20` unit files; `grep -l SAU-13 units/*.md`.
- `plans/DECISIONS.md` lines that name SAU-13: only line 1099.
- Plans with status `draft` or `planned`: AGL-25, MPR-12, SAU-12, SAU-13 (MPR-11 is now `done`). No `plans/SAU-14.md` and no `plans/SAU-20.md`. Branches: `unit/SAU-12` (`842c00a`), no `unit/SAU-13`.
- `plans/SAU-12.md` sections 2 to 5 (P4 asserts the exact requests after Continue and that the page shows the Preferences step; P6 the same after Skip; the `StepBody` override rule).
- `git diff main...unit/SAU-12 -- step-body.ts`: imports `ProvidersPanel` and `RouterLink`, `panelAvailable()` reads `Router.config`.
- `git diff --stat ab99ea8 a01e942`: MPR-11 changes `app.routes.ts`, `features/providers/**`, `e2e/specs/providers-phone.e2e.ts`; none of section 2.
- `step-body.ts` (no `imports` on `main`; the preferences case lines 25 to 27); `setup-page.ts` (doc lines 19 to 24, `<app-step-body>` line 57, `@if (step() !== 'access')` line 78, `writeState` 142 with the guard, `begin()`, and `busy` reset before `finish`/`moveOn`, `moveOn` 191, `fail` 235, private); `preferences-form.ts` (no inputs other than `stored`, `save` output, `hasChanges`); `setup-contract.ts` (`loadSettingsContract` already picks the preferences route; `loadSetupAuthContract` does not).
- `setup-page.spec.ts`: `renderSetup` (lines 76 to 83, no override on `main`), helpers (lines 85 to 134), imports of `ApiError` and `CLIENT_ERROR_CODES` from `../../shell/api-error`; no test enters the preferences step on `main` (W1 stops at providers); no assertion of the preferences placeholder.
- `settings-page.spec.ts` lines 27 to 31 and 70 to 77 (the stub pattern); no assertion on `option` or on input counts.
- `shell/theme-toggle.ts`, `shell/theme.ts`, `shell/index.ts` line 9, `shell/testing/test-doubles.ts` (`requests` in subscription order; an unanswered route errors).
- `e2e/specs/setup-phone.e2e.ts` lines 232 to 256.
- `packages/contracts/src/setup-auth/settings.ts`, `examples.ts` (`preferences`), `tool-registry/constants.ts` (`BUILTIN_ORIGINS`), `packages/contracts/package.json` (`./tool-registry` export); other web specs import `@bbartolome/scriba-contracts/tool-registry`.
- `apps/api/src/modules/tool-registry/catalog.service.ts` `offeredOrigins`.

**Assumed, not verified:**

- `TestBed.overrideComponent` with `remove` of an import that the component does not have is a no-op. The red run of step 2 shows it for `ProvidersPanel` before SAU-12 lands.
- A stub with the selector `app-preferences-step` and no outputs accepts the `(saved)` and `(failed)` bindings of `StepBody` as DOM event listeners, without an error.
- `mat-button-toggle` renders a `button` with the text `Dark`.
- `getByRole('textbox', { name: 'Author name', exact: true })` matches the input inside its label.
- The build's CommonJS warnings equal the baseline (no build was run in revision).
- The e2e suite and its browser were not run here.

## 8. Review parts

- **Part 1 — the step, the page and the criteria.** Steps 0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 12 and 13. Tests PR1 (criterion 1), PR2 (criterion 2), PR3, PR4, PR5, PR6, PR7 and PR8. The reviewer of this part also checks that the code changes only the section 2 paths.
- **Part 2 — the shared test files of other units.** Steps 8 and 10. Tests R1 and E1.
