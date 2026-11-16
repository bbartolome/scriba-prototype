---
id: SAU-12
status: done
---
# SAU-12 plan — /setup Model providers step (embedded panel)

Draft by the Haiku planner on `main` at 5475399. Revised by the Opus reviser on `main` at 0708c82 (only docs commits after 5475399). The three open points of the draft and the D11 question are settled in section 6. No unit file changes.

## 1. Decisions this plan obeys

- **D1 Embed the panel.** The step renders `ProvidersPanel` (selector `app-providers-panel`, standalone, no inputs and no outputs). It is imported only from `apps/web/src/app/features/providers/providers.routes.ts`. Source: unit line 15; `plans/MPR-09.md` line 77 (D1) and line 71 (S14: another feature imports only the entry file); `plans/MPR-09.md` line 236 (no "usable provider" output in v1). The panel is not changed (no new output): the step reads the usable state itself (D4).
- **D2 No provider UI of its own.** The step body has no `form`, `input`, `select` or `textarea`. The panel is the only provider UI on the step. The step lists no models and calls no connection test. Source: unit lines 16 and 20; `modules/setup-auth.md` "Out of scope" (provider forms, model listing and the connection test belong to Model providers).
- **D3 Link until the settings UI lands.** Until the Model providers `phase:settings-ui` has landed, the step shows a link to `/providers` instead of the panel. "Landed" means: the root route table has a top-level `providers` entry. MPR-11 is the gate of that phase (`units/README.md` line 93) and it adds exactly that entry (`git diff main...unit/MPR-11 -- apps/web/src/app/app.routes.ts`). `StepBody` reads `Router.config`. Source: unit lines 15 and 21; section 6, point 1.
- **D4 The step's own completion rule.** On the providers step, Continue reads `GET /api/providers` and `GET /api/providers/app-default`. It writes `done` only when a usable provider exists: the app default is set and names a listed provider. Skip writes `skipped`. Otherwise Continue writes nothing and shows a message. Source: unit line 17; `plans/SAU-11.md` line 79 (P14: each step unit states its own rule and changes its own controls in `setup-page.ts`); the rule is the one the app itself uses to refuse an agent run, `ProvidersResolver.hasChoice` (`apps/api/src/modules/providers/providers.resolution.ts` lines 41 to 47: "a choice exists and names a stored provider"), used by `agent-runs.service.ts` lines 73 to 78 (`AGENT_NO_PROVIDER`, "Add a provider and choose an app default first."). In setup there is no active project, so the project override does not apply. Section 6, point 2.
- **D5 Route and body.** The write uses the existing route `SETUP_STEP_ROUTE` (`/api/setup-auth/steps/:step`, `packages/contracts/src/setup-auth/routes.ts` line 7) with the body `{state}` of `stepUpdateSchema` (`packages/contracts/src/setup-auth/status.ts` line 41; `done` or `skipped`). The write goes through SAU-11's `writeState` (`setup-page.ts` line 142). No contract change.
- **D6 Contract values in the browser.** The feature imports the providers contract only with `import type`. The runtime values the step needs (the two route paths and the two response readers) are hand-written copies with a parity spec. Sources: `plans/MPR-09.md` line 70 (S13); `plans/DECISIONS.md` line 3148 (the Navigator's option b: hand-written copies with a parity spec); the header of `setup-contract.ts` (lines 1 to 8: the dynamic loader is the only runtime contract reference of the feature); `platform-copy.ts` and its spec are the pattern. The feature cannot import `providers-copies.ts` (ESLint R1, `eslint.config.mjs` line 50: only the entry file `providers.routes.ts`, which this plan does not change).
- **D7 Other steps unchanged.** Tailscale, Preferences and First project keep SAU-11's Mark done and Skip. Source: `plans/SAU-11.md` line 79 (P14); `setup-page.ts` lines 78 to 93.
- **D8 Test seam.** Vitest, with the Shell's fake API (`createShellTestDoubles`). The panel is stubbed with `TestBed.overrideComponent`, as `settings-page.spec.ts` lines 27 to 32 and 75 to 77 do. Source: `modules/setup-auth.md` "Testing principles" (UI seam); `modules/providers.md` "Testing principles".
- **D9 Errors.** A 401 shows the sign-in notice, a tailnet code shows its explanation, and any other error shows its message. This is the existing `fail()` (`setup-page.ts` line 235). Source: `modules/setup-auth.md` "Cross-cutting decisions".
- **D10 Shared-file discipline.** Each step unit changes only its own `@case` in `step-body.ts` (`plans/SAU-11.md` line 69, P4, and line 89, the file table) and its own controls in `setup-page.ts`. This plan changes only the providers case and the providers controls.
- **D11 Existing tests that name the placeholder.** Three assertions name the providers placeholder or its Mark done button: `setup-page.spec.ts` line 489 (the W1 test), `e2e/specs/setup-phone.e2e.ts` lines 239 to 241 and line 246. This plan replaces only those lines, for the providers step only. Each keeps its check that the wizard reaches the step and then the next step. This is not a weakening: the placeholder text and its Mark done are SAU-11's temporary content, which SAU-11 P4 and P14 (`plans/SAU-11.md` lines 69 and 79) hand to this unit to replace. Section 6, point 4.

Small decisions, taken here:

- **S1.** The providers case is inline in `step-body.ts`, not a new component. The step body stays one file, as P4 names it.
- **S2.** The button is labelled `Continue`. The providers step shows these buttons in this order: `Continue`, `Skip`, `Next`, `Skip the rest`.
- **S3.** Continue reads the two GETs when it is clicked. Nothing is read when the step is entered. So no other test gets an extra request.
- **S4.** When Continue finds no usable provider, the page's existing alert line (`<p role="alert">`) shows `No usable provider yet. Add a provider and choose it as the app default, or skip this step.`
- **S5.** The copy file is `providers-copy.ts`, with `providers-copy.spec.ts`, as `platform-copy.ts` and its spec.
- **S6.** The two GETs run with `forkJoin([list, appDefault])`. The fake API records requests in subscription order, so the order is `GET /api/providers`, then `GET /api/providers/app-default`.

## 2. Files to change

Only these paths change. Nothing else is touched, including `packages/**`, `apps/api/**`, `apps/web/src/app/features/providers/**`, `apps/web/src/app/app.routes.ts`, `settings-page.ts`, `units/**`, `modules/**`, `plans/**`.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/setup-auth/providers-copy.ts` | new | `PROVIDERS_PATH` = `'/api/providers'` (the value of `PROVIDERS_ROUTE`, `packages/contracts/src/providers/routes.ts` line 3) and `APP_DEFAULT_PATH` = `'/api/providers/app-default'` (`APP_DEFAULT_ROUTE`, line 5). Type `ProviderIds` = `{providers: {id: string}[]}`. `providerIdsCopy: ResponseSchema<ProviderIds>`: accepts a record whose `providers` is an array of records, each with a non-empty string `id`; the data holds only the ids. `appDefaultCopy: ResponseSchema<AppDefault>`: accepts a record whose `appDefault` is `null`, or a record with a non-empty string `providerId` and a string `model`. `isUsable(list: ProviderIds, current: AppDefault): boolean` returns `current.appDefault !== null && list.providers.some((p) => p.id === current.appDefault.providerId)`. `AppDefault` comes from `@bbartolome/scriba-contracts/providers` with `import type` only. Pattern: `platform-copy.ts` |
| `apps/web/src/app/features/setup-auth/providers-copy.spec.ts` | new | P7, the parity test |
| `apps/web/src/app/features/setup-auth/step-body.ts` | edit | The `providers` case (section 3, step 4). Imports `ProvidersPanel` from `../providers/providers.routes`, and `Router` and `RouterLink` from `@angular/router`. The other four cases are unchanged. The doc comment names the providers case |
| `apps/web/src/app/features/setup-auth/setup-page.ts` | edit | The providers controls and `continueProviders()` (step 5). The doc comment of `SetupPage` (lines 19 to 24) names Continue for the providers step |
| `apps/web/src/app/features/setup-auth/setup-page.spec.ts` | edit | `renderSetup` (step 6). W1 line 489. A new describe block for P3 to P6 and P8 |
| `apps/web/src/app/features/setup-auth/providers-step.spec.ts` | new | P1 and P2 (step 7) |
| `e2e/specs/setup-phone.e2e.ts` | edit | Lines 239 to 241 (the providers placeholder assertion) and lines 245 to 246 (the step name and the Mark done click). Nothing else in that file (step 8) |

`package.json`, `package-lock.json` and every other file stay as they are.

## 3. Procedure

Run in a new worktree of `unit/SAU-12`, created from `main`. Run `npm ci` in the worktree first. Record `node -v` and `npm -v` beside each result. Expected: `v26.x` for Node.

1. **Baseline.** Run `npm test -w @bbartolome/scriba-web`, `npm run lint -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web` before any change. Record the test count, the exit codes and the list of CommonJS warnings in the build output. Expected: all exit 0. The warning list is the stop reference for step 9.

2. **Copy and predicate.** Create `providers-copy.ts` as section 2 says. Expected: the file exports `PROVIDERS_PATH`, `APP_DEFAULT_PATH`, `providerIdsCopy`, `appDefaultCopy`, `isUsable` and the type `ProviderIds`. No other export. Its only import of the providers contract is `import type`.

3. **Copy spec.** Create `providers-copy.spec.ts` (P7). The spec may import the contract's runtime values (`PROVIDERS_ROUTE`, `APP_DEFAULT_ROUTE`, `providerListSchema`, `appDefaultSchema`, `PROVIDERS_EXAMPLES`), as `platform-copy.spec.ts` does for its contract. Expected: the spec passes.

4. **Providers case.** In `step-body.ts`, replace the providers placeholder with this:

   ```ts
   @case ('providers') {
     @if (panelAvailable()) {
       <app-providers-panel />
     } @else {
       <p><a routerLink="/providers">Model providers</a></p>
     }
   }
   ```

   Add `private readonly router = inject(Router);`, `protected panelAvailable(): boolean { return this.router.config.some((route) => route.path === 'providers'); }`, and `imports: [ProvidersPanel, RouterLink]` to the decorator. `inject` comes from `@angular/core`. Expected: `step-body.ts` compiles. Only the providers case, the imports and the doc comment change.

5. **Providers controls.** In `setup-page.ts`, in the non-last-step branch, replace the opening `@if (step() !== 'access') {` (line 78) with a providers branch before it:

   ```html
   @if (step() === 'providers') {
     <button mat-flat-button [disabled]="busy()" (click)="continueProviders()">Continue</button>
     <button mat-stroked-button [disabled]="busy()" (click)="writeState('skipped')">Skip</button>
   } @else if (step() !== 'access') {
     ... the existing Mark done and Skip, unchanged ...
   }
   ```

   Add `protected continueProviders(): void`. It returns when `contract` is undefined or `busy()` is true. It calls `begin()`, then `forkJoin([this.api.get(PROVIDERS_PATH, providerIdsCopy), this.api.get(APP_DEFAULT_PATH, appDefaultCopy)])` (`forkJoin` from `rxjs`) with `takeUntilDestroyed(this.destroyRef)`. On `next` with `[list, current]`, it sets `busy` to false. If `isUsable(list, current)` is true, it calls `this.writeState('done')`. Otherwise it sets `failure` to the S4 text. On `error`, it sets `busy` to false and calls `this.fail(error)`. The Next and Skip-the-rest controls, and the last step's controls, do not change. Expected: `setup-page.ts` builds, and the other steps' buttons are unchanged.

6. **Page spec.** In `setup-page.spec.ts`:
   - Add two spec-local components: `ProvidersStub` (selector `app-providers-panel`, empty template, as in `settings-page.spec.ts` line 31) and `ProvidersRouteStub` (empty template, used as a route component).
   - In `renderSetup` (lines 76 to 82), before `configureTestingModule`, call `TestBed.overrideComponent(StepBody, { remove: { imports: [ProvidersPanel] }, add: { imports: [ProvidersStub] } })`. Give `provideRouter` the list `[{ path: 'providers', component: ProvidersRouteStub }, ...APP_ROUTES]`. The test route goes first, so the router sees a `providers` path both before and after MPR-11 lands. The W1 result does not depend on the merge order.
   - W1, line 489: replace `expect(paragraphs(root)).toContain('Model providers are not set up yet.');` with `expect(root.querySelector('app-providers-panel')).not.toBeNull();`. Nothing else in W1 changes.
   - Add a describe block `P providers step with the fake API` with P3 to P6 and P8 (section 4).
   Expected: every existing test in the file passes, with W1 as changed.

7. **Step body spec.** Create `providers-step.spec.ts` with P1 and P2 (section 4). Both render `StepBody` directly with `TestBed.createComponent`, `setInput('step', 'providers')` and `setInput('who', SETUP_AUTH_EXAMPLES.identityLoopback)`, then `fixture.detectChanges()` (or `await fixture.whenStable()`). P1 overrides `StepBody` with the stub, as in step 6, and provides `provideRouter([{ path: 'providers', component: ProvidersRouteStub }])`. P2 provides `provideRouter([])` (no `providers` route) and no override. Expected: both pass.

8. **Phone e2e.** In `e2e/specs/setup-phone.e2e.ts`, replace the assertion at lines 239 to 241 with a check that is true before and after MPR-11: the page shows `app-providers-panel` or a link with `href="/providers"`. Use the locator `page.locator('app-setup-page app-providers-panel, app-setup-page a[href="/providers"]').first()` and `toBeVisible()`. In the step at lines 245 to 246, rename it to `providers: Continue, then Next`, and click the button `Continue` (`getByRole('button', { name: 'Continue', exact: true })`). The e2e library is seeded with `ollama` as the app default (`providers.seeding.ts` lines 36 to 40 and 58 to 71), and the journey spec only replaces the app default with another listed provider (`journey.e2e.ts` lines 101 to 121), so Continue finds a usable provider in either spec order and writes `done`. Keep the Preferences assertion and the rest of the file. Expected: the file parses. Run the e2e suite as AGL-08 did (`npm run e2e -w @bbartolome/scriba-e2e -- --trace off`, `plans/DECISIONS.md` line 4491 and after). Expected: `setup-phone` passes. If Chromium is not available, record the e2e as not run, with the reason. Do not mark the e2e as passed.

9. **Checks.** Run `npx prettier --check` on each file of section 2. Run `npm run lint -w @bbartolome/scriba-web`, `npm test -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web`. Expected: all exit 0. The build's CommonJS warnings equal the list of step 1 (the setup-auth chunk already carries the panel through `settings-page.ts`, `plans/DECISIONS.md` line 4502 item 5, and the copy adds no contract runtime import). **Stop rule:** a new CommonJS warning, or a build that fails, stops the unit. Report it and do not change the plan.

10. **Commit.** Commit only the section 2 paths, on `unit/SAU-12`, with a message that contains `SAU-12`, for example `feat(SAU-12): embed the providers panel in the setup step`. Do not commit `plans/`. Expected: the commit lists only the section 2 paths.

## 4. Acceptance criteria and tests

The unit has two criteria (unit lines 20 and 21). Each has one test that is named here. The other tests check the behavior of D4, D5 and D11, which the criteria do not state. Run all of them with `npm test -w @bbartolome/scriba-web`. Nothing needs a remote, CI or Docker. The e2e run in step 8 is a regression check, not a criterion.

| Criterion | Test (name and file) | Seam | Pass condition |
|---|---|---|---|
| 1. "The step renders the Model providers component (a stub of it in tests) and contains no provider form of its own." | **P1** `providers-step.spec.ts`: "P1 the providers step renders the Model providers component (stub) and no form of its own" | `StepBody` with the stub override and a `providers` route | Exactly one `app-providers-panel` element. No `form`, `input`, `select` or `textarea` element in the host. No `a` element. |
| 2. "Before the panel exists, the step shows a link to `/providers`." | **P2** `providers-step.spec.ts`: "P2 without the providers route the step shows a link to /providers and no panel" | `StepBody` with `provideRouter([])` | One `a` element whose text is `Model providers` and whose `href` attribute is `/providers`. No `app-providers-panel` element. No `form`, `input`, `select` or `textarea`. |

Further tests, for the behavior of D4, D5 and D11:

- **P3** `setup-page.spec.ts`: "P3 the providers step shows Continue, Skip, Next and Skip the rest, and no Mark done". Reach the providers step with Next twice from the access step (the C1a setup). Expected button texts: `['Continue', 'Skip', 'Next', 'Skip the rest']`.
- **P4** `setup-page.spec.ts`: "P4 Continue with a usable provider reads the list and the app default, writes done and moves on". Answer `GET /api/providers` with `PROVIDERS_EXAMPLES.providerList`, `GET /api/providers/app-default` with `PROVIDERS_EXAMPLES.appDefault` (names `ollama`), and the step POST with a status whose providers step is `done`. Expected: the requests after the click are exactly `GET /api/providers`, `GET /api/providers/app-default` and `POST /api/setup-auth/steps/providers` with body `{state: 'done'}`, in that order. The page shows the Preferences step and `Model providers: done` in the list. No other `/api/providers/...` request (no model list, no connection test).
- **P5** `setup-page.spec.ts`: "P5 Continue without an app default writes nothing and shows the message". Answer the list GET with `PROVIDERS_EXAMPLES.providerList` and the app-default GET with `PROVIDERS_EXAMPLES.appDefaultUnset`. Expected: the requests after the click are only the two GETs. The alert line shows the S4 text. The step is still providers, and Continue is enabled.
- **P8** `setup-page.spec.ts`: "P8 Continue when the app default names no listed provider writes nothing and shows the message". Answer the list GET with `{providers: []}` and the app-default GET with `PROVIDERS_EXAMPLES.appDefault`. Expected: as P5.
- **P6** `setup-page.spec.ts`: "P6 Skip on the providers step writes skipped and moves on". Expected: `POST /api/setup-auth/steps/providers` with `{state: 'skipped'}`, no `/api/providers` request, and the page shows the Preferences step.
- **P7** `providers-copy.spec.ts`: "P7 the copies of the two providers reads agree with the contract on each case". For each case, the copy and the contract schema (`providerListSchema`, `appDefaultSchema`) give the same `success`. List, accepted: `PROVIDERS_EXAMPLES.providerList` (`packages/contracts/src/providers/examples.ts` line 88) and `{providers: []}`; for `providerList` the copy's data is `{providers: [{id: 'ollama'}, {id: 'openrouter'}]}` (the ids of the example). List, rejected: a body without `providers`, `providers` that is not an array, an entry without `id`, an entry with `id: ''`. App default, accepted: `PROVIDERS_EXAMPLES.appDefault` and `PROVIDERS_EXAMPLES.appDefaultUnset`, with data equal to the input. App default, rejected: a body without `appDefault`, `appDefault` without `providerId`, `providerId: ''`, `model` that is not a string. `PROVIDERS_PATH` equals `PROVIDERS_ROUTE` and `APP_DEFAULT_PATH` equals `APP_DEFAULT_ROUTE`. `isUsable`: true for (`providerList`, `appDefault`); false for (`providerList`, `appDefaultUnset`) and for (`{providers: []}`, `appDefault`). The implementer reads the ids of `providerList` from the example file and uses them.
- **W1** (existing, changed at line 489 only; section 3, step 6). The wizard test still walks skip, complete and re-run.
- **E1** (existing e2e, changed at lines 239 to 246; section 3, step 8). The phone flow passes through the providers step with Continue.

## 5. Agreement with the downstream and the parallel units

- **SAU-16 (the gate; `blocked_by` line 7 names SAU-12; no plan, no branch).** Its criterion (`units/SAU-16-setup-flow-gate.md` line 23, "The providers step renders the Model providers component and duplicates no forms") is met by P1 and D2 once the `/providers` route is on `main`; before that, the step shows the link (D3). Its first criterion ("skipping providers and preferences still allows completion, and they show `skipped`") is met by P6. Its demo picks an Ollama model in the embedded step, which needs MPR-11 on `main`. SAU-16 has no `blocked_by` entry for MPR-11; see section 6, point 3. This plan changes no SAU-16 file.
- **SAU-13 (no plan yet; may be written in parallel), SAU-14 and SAU-20 (no plans; each `blocked_by` SAU-11).** Each replaces its own `@case` in `step-body.ts` and changes its own controls in `setup-page.ts` (`plans/SAU-11.md` lines 69, 79 and 89). Shared spots: the non-last-step controls block of `setup-page.ts` (line 78), the `renderSetup` helper (`setup-page.spec.ts` lines 76 to 82), the W1 test, and the e2e file (`setup-phone.e2e.ts` lines 239 to 253, where the providers step's Continue is followed by the Preferences assertion at line 248). Rules for the second merger, correct in either order: in `setup-page.ts`, each step unit adds its own `@if (step() === '<key>') { … } @else` branch before the generic `@if (step() !== 'access')`; on a conflict, chain the branches (`@if … @else if … @else if (step() !== 'access')`), keeping each unit's buttons. `TestBed.overrideComponent(StepBody, …)` appears once, and each unit adds its own stub to the same `remove` and `add` lists. Each unit keeps its own W1 and e2e assertions; SAU-13 may change the Preferences assertion at line 248, and this plan keeps whatever text that line has.
- **MPR-11 (`planned`; code on `unit/MPR-11`, not on `main`).** It adds a top-level `{ path: 'providers', … }` entry to `APP_ROUTES` in `app.routes.ts` (+13 lines) and `providersRoutes` to `providers.routes.ts`, and keeps the `ProvidersPanel` export (`git diff main...unit/MPR-11`). It changes no setup-auth file and no `setup-phone.e2e.ts` (`plans/MPR-11.md` line 58). This plan changes neither of its files. Both orders are correct. (i) SAU-12 first: the route is absent, so the step shows the link, and the link leads to the not-found page until MPR-11 lands; unit line 15 accepts that ("links to `/providers` instead"). MPR-11's rebase runs `setup-page.spec.ts` (`plans/MPR-11.md` line 128); with SAU-12's `renderSetup`, the test `providers` route stays first and W1 still finds the stub. (ii) MPR-11 first: the route is present, and the step embeds the panel. The unit tests do not depend on the order, because `renderSetup`, P1 and P2 set their own router configuration. The e2e locator of step 8 accepts the panel or the link. `plans/MPR-11.md` line 194 says the same.
- **MPR-12 (`planned`, API only).** It changes no web file (`plans/MPR-12.md` line 113). No shared file.
- **AGL-25 (`planned`).** It names none of this plan's files (grep of `plans/AGL-25.md`).
- **SAU-15 (done).** It imports the same panel from the same entry file (`settings-page.ts`). This plan changes nothing it uses. Its spec's stub stays.
- **Other draft and planned plans.** Draft or planned plans on `main` at 0708c82: AGL-25, MPR-11, MPR-12 (and this one). `plans/SAU-13.md` does not exist at the time of the revision.

## 6. Open points (settled by the revision)

1. **What makes the link give way to the panel (criterion 2; unit lines 15 and 21).** Settled: option A of the draft (D3). The unit names the landing of `phase:settings-ui` as the switch, not the existence of the component. The phase closes when its gate MPR-11 merges (`units/README.md` lines 61 and 93), and MPR-11's observable change to the app is the top-level `providers` route. So `Router.config` holding that path is the landing, read without a later edit. Option B needs another unit to edit this unit's file later; option C adds a token and a provider that no unit asks for; option D gives criterion 2 no state to test. Not a Navigator point: the unit text decides it.
2. **What "a usable provider" means (unit line 17).** Settled: option (c) of the draft (D4): the app default is set and names a listed provider. This is the repository's own rule for "a provider is set up": `ProvidersResolver.hasChoice` (`providers.resolution.ts` lines 41 to 47) and the agent loop's `AGENT_NO_PROVIDER` refusal (`agent-runs.service.ts` lines 73 to 78). Option (a) passes when no default is set, which the agent then refuses. Option (b) checks keys, which `hasChoice` does not. Option (d) needs the connection test, which the step must never reimplement (unit line 16), and the panel exposes no result (MPR-09 D1). On a fresh install the seed (`providers.seeding.ts` lines 36 to 40 and 58 to 71: one keyless `ollama`, set as the app default) makes Continue pass at once; whether Ollama answers is the panel's connection test. Not a Navigator point: no criterion or settled decision changes.
3. **Gate and order (unit line 7).** Not in the way of this plan: the plan is correct in either order with MPR-11 (section 5). The fix that the draft names (add MPR-11 to the quoted entry of SAU-12's `blocked_by`, and change MPR-11's `unblocks`) is none of the four reviser actions (remove, loosen, reword, split), and nothing in SAU-12 needs it. Remaining for the orchestrator and the user, as `plans/DECISIONS.md` line 4504 already records: SAU-16 has no entry for MPR-11, so SAU-16 can become available before MPR-11 is on `main`, and its criterion line 23 and its demo need the embedded panel.
4. **D11, the changed assertions.** Settled: not a weakening (D11). The placeholder and its Mark done are SAU-11 content that SAU-11 hands to this unit to replace; no criterion is changed, and each test keeps its walk through the step.

## 7. Facts checked and assumed

**Checked in the repository by the planner (no file was changed):**

- `prompt.md`: the Draft rules (lines 84 to 94), the availability rule (line 51), the Navigator rules and the commit rules.
- `units/SAU-12-providers-step.md`: front matter (lines 7 to 9), decisions (lines 15 to 17), criteria (lines 20 and 21). No "Moved to", "Removed by revision", "Loosened by revision" or "Reworded by revision" note.
- `apps/web/src/app/features/setup-auth/`: `step-body.ts` lines 14 to 31 (the `@switch`; providers placeholder at line 23). `setup-page.ts`: the class doc (lines 19 to 24), the template controls (lines 59 to 100), and the methods `writeState` (142), `finish` (171), `moveOn` (191), `begin` (198), `load` (203) and `fail` (235). `setup-page.spec.ts`: `renderSetup` (lines 76 to 82), the W1 assertion (line 489). `setup-contract.ts` (header lines 1 to 8).
- `apps/web/src/app/features/providers/providers.routes.ts`: only the `ProvidersPanel` re-export on `main`. `settings-page.ts` imports `ProvidersPanel` from `../providers/providers.routes`. `settings-page.spec.ts` stubs it (lines 27 to 32, 75 to 77).
- `apps/web/src/app/app.routes.ts`: no `providers` entry on `main`. `node_modules/@angular/router` 22.2.5; `Router.config: Routes` is public.
- `e2e/specs/setup-phone.e2e.ts` lines 239 to 248.

**Checked by the reviser on `main` at 0708c82:**

- `plans/QUEUE.md` line 3 lists SAU-12 as available (the draft said line 4).
- `withDeviceGate` (`shell/device-class.ts` lines 148 to 171) keeps each entry's `path`, so a top-level `providers` entry stays visible in `Router.config` after MPR-11.
- `git diff main...unit/MPR-11 --stat`: six files, none in `features/setup-auth/` and not `setup-phone.e2e.ts`. `unit/MPR-12` and `unit/AGL-25`: none of this plan's files.
- `packages/contracts/src/providers/routes.ts` lines 3 and 5; `model.ts` lines 5 to 8 (`modelChoiceSchema`: `providerId` min 1, `model` string) and 33 to 35 (`appDefaultSchema`, nullable); `config.ts` line 8 (`id` regex, so `''` is rejected) and lines 46 to 48 (`providerListSchema`); `examples.ts` lines 59, 88 to 93 (`providerList`: the ollama and openrouter read views), 100 and 101 (`appDefault` names `ollama`; `appDefaultUnset`).
- `providers.controller.ts` lines 50 and 68: `GET /api/providers` and `GET /api/providers/app-default` are served.
- `providers.resolution.ts` lines 41 to 47 (`hasChoice`); `agent-runs.service.ts` lines 73 to 78 (`AGENT_NO_PROVIDER`).
- `providers.seeding.ts` lines 36 to 40 and 58 to 71: an absent section is seeded with `ollama` and `appDefault: {providerId: 'ollama', model: ''}`.
- `e2e/specs/journey.e2e.ts` lines 101 to 121: creates a provider and makes it the app default; `e2e/playwright.config.ts` line 13: `workers: 1`.
- `shell/testing/test-doubles.ts`: `FakeApiClient.requests` records in subscription order; an unanswered route errors.
- `plans/DECISIONS.md` lines 4502 (item 5, the setup-auth chunk carries the panel) and 4504 (the `blocked_by` point).

**Assumed, not verified:**

- The build's CommonJS warnings equal the baseline that SAU-15 left (no build was run in planning or revision; step 1 records the baseline).
- `TestBed.overrideComponent` on `StepBody` works as the override on `SettingsPage` does.
- `RouterLink` on an `a` element renders `href="/providers"` under `provideRouter([])`. P2 checks it.
- The e2e suite was not run here, and Chromium availability was not checked.

## 8. Review parts

- **Part 1 — copies, step body, criteria.** Steps 1, 2, 3, 4, 7, 9 and 10. Tests P1 (criterion 1), P2 (criterion 2) and P7. The reviewer of this part also checks that the code changes only the section 2 paths.
- **Part 2 — controls, completion rule, existing tests.** Steps 5, 6 and 8. Tests P3, P4, P5, P6, P8, W1 and E1.
