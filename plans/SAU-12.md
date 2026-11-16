---
id: SAU-12
status: draft
---
# SAU-12 plan — /setup Model providers step (embedded panel)

Draft by the Haiku planner on `main` at 5475399. Not revised. Section 6 lists the points that need the Navigator. The reviser settles them before this plan can become `planned`.

## 1. Decisions this plan obeys

- **D1 Embed the panel.** The step renders `ProvidersPanel` (selector `app-providers-panel`, standalone, no inputs and no outputs). It is imported only from `apps/web/src/app/features/providers/providers.routes.ts`. Source: unit line 15; `plans/MPR-09.md` line 77 (D1) and line 71 (S14: another feature imports only the entry file); `plans/MPR-09.md` line 236 (no "usable provider" output in v1).
- **D2 No provider UI of its own.** The step body has no `form`, `input`, `select` or `textarea`. The panel is the only provider UI on the step. Source: unit lines 16 and 20; `modules/setup-auth.md` line 76 (provider forms belong to Model providers).
- **D3 Link until the settings UI lands.** Until the Model providers settings UI has landed, the step shows a link to `/providers` instead of the panel. What "landed" means is open point 1. Source: unit lines 15 and 21; `units/README.md` line 93 (the `phase:settings-ui` gate is MPR-11).
- **D4 The step's own completion rule.** On the providers step, Continue writes `done` only when the list of providers holds a usable one. Skip writes `skipped`. Otherwise Continue writes nothing. What "usable" means is open point 2. Source: unit line 17; `plans/SAU-11.md` line 79 (P14: each step unit states its own rule and changes its own controls in `setup-page.ts`).
- **D5 Route and body.** The write uses the existing route `SETUP_STEP_ROUTE` (`/api/setup-auth/steps/:step`, `packages/contracts/src/setup-auth/routes.ts` line 7) with the body `{state}` of `stepUpdateSchema` (`packages/contracts/src/setup-auth/status.ts` line 41; `done` or `skipped`). The write goes through SAU-11's `writeState` (`setup-page.ts` line 142). No contract change.
- **D6 Contract values in the browser.** The feature imports the providers contract only with `import type`. The one runtime value the step needs, the route path, is a hand-written copy with a parity spec. Sources: `plans/MPR-09.md` line 70 (S13); `plans/DECISIONS.md` line 3148 (the Navigator's option b: hand-written copies with a parity spec); the header of `setup-contract.ts` (lines 1 to 8: the dynamic loader is the only runtime contract reference of the feature); `platform-copy.ts` and its spec are the pattern.
- **D7 Other steps unchanged.** Tailscale, Preferences and First project keep SAU-11's Mark done and Skip. Source: `plans/SAU-11.md` line 79 (P14); `setup-page.ts` lines 78 to 84.
- **D8 Test seam.** Vitest, with the Shell's fake API (`createShellTestDoubles`). The panel is stubbed with `TestBed.overrideComponent`, as `settings-page.spec.ts` lines 27 to 32 and 75 to 77 do. Source: `modules/setup-auth.md` line 68 (UI seam); `modules/providers.md` line 45.
- **D9 Errors.** A 401 shows the sign-in notice, a tailnet code shows its explanation, and any other error shows its message. This is the existing `fail()` (`setup-page.ts` line 235). Source: `modules/setup-auth.md` line 42.
- **D10 Shared-file discipline.** Each step unit changes only its own `@case` in `step-body.ts` (`plans/SAU-11.md` line 69, P4, and line 89, the file table) and its own controls in `setup-page.ts`. This plan changes only the providers case and the providers controls.
- **D11 Existing tests that name the placeholder.** Three assertions name the providers placeholder or its Mark done button: `setup-page.spec.ts` line 489 (the W1 test), `e2e/specs/setup-phone.e2e.ts` lines 239 to 241 and lines 245 to 246. This plan replaces only those lines, for the providers step only. Each keeps its check that the wizard reaches the step and then the next step. Nothing is deleted and no check is removed. If the reviser reads this as a weakening, it is a NAVIGATOR point.

Small decisions, taken here:

- **S1.** The providers case is inline in `step-body.ts`, not a new component. The step body stays one file, as P4 names it.
- **S2.** The button is labelled `Continue`. The providers step shows these buttons in this order: `Continue`, `Skip`, `Next`, `Skip the rest`.
- **S3.** Continue reads the list when it is clicked. Nothing is read when the step is entered. So no other test gets an extra request.
- **S4.** When Continue finds no usable provider, the page's existing alert line shows `No usable provider yet. Add one, or skip this step.`
- **S5.** The copy file is `providers-copy.ts`, with `providers-copy.spec.ts`, as `platform-copy.ts` and its spec.

## 2. Files to change

Only these paths change. Nothing else is touched, including `packages/**`, `apps/api/**`, `apps/web/src/app/features/providers/**`, `apps/web/src/app/app.routes.ts`, `settings-page.ts`, `units/**`, `modules/**`, `plans/DECISIONS.md` and every other plan.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/setup-auth/providers-copy.ts` | new | `PROVIDERS_PATH` = `'/api/providers'` (the value of `PROVIDERS_ROUTE`, `packages/contracts/src/providers/routes.ts` line 3). Types `ProviderSummary` = `{id: string; keySet: boolean; keyRef?: string}` and `ProviderSummaries` = `{providers: ProviderSummary[]}`. `providerListCopy: ResponseSchema<ProviderSummaries>` with `safeParse`, as `platform-copy.ts`. `isUsable(list: ProviderSummaries): boolean` (body per open point 2). Types only from the contract, if any |
| `apps/web/src/app/features/setup-auth/providers-copy.spec.ts` | new | P7, the parity test |
| `apps/web/src/app/features/setup-auth/step-body.ts` | edit | The `providers` case (section 3, step 4). Imports `ProvidersPanel` from `../providers/providers.routes` and `RouterLink`. Injects `Router`. The other four cases are unchanged |
| `apps/web/src/app/features/setup-auth/setup-page.ts` | edit | The providers controls and `continueProviders()` (step 5). The doc comment of `SetupPage` (lines 17 to 22) names Continue for the providers step |
| `apps/web/src/app/features/setup-auth/setup-page.spec.ts` | edit | `renderSetup` (step 6). W1 line 489. A new describe block for P3 to P6 |
| `apps/web/src/app/features/setup-auth/providers-step.spec.ts` | new | P1 and P2 (step 7) |
| `e2e/specs/setup-phone.e2e.ts` | edit | Lines 239 to 241 (the providers placeholder assertion) and lines 245 to 246 (the Mark done click and the step name). Nothing else in that file (step 8) |

`package.json`, `package-lock.json` and every other file stay as they are.

## 3. Procedure

Run in a new worktree of `unit/SAU-12`, created from `main`. Run `npm ci` in the worktree first. Record `node -v` and `npm -v` beside each result. Expected: `v26.x` for Node.

1. **Baseline.** Run `npm test -w @bbartolome/scriba-web`, `npm run lint -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web` before any change. Record the test count, the exit codes and the list of CommonJS warnings in the build output. Expected: all exit 0. The warning list is the stop reference for step 9.

2. **Copy and predicate.** Create `providers-copy.ts` as section 2 says. Write the body of `isUsable` as the Navigator settles open point 2, and no other predicate. Expected: the file exports `PROVIDERS_PATH`, `providerListCopy`, `isUsable` and the two types. No other export.

3. **Copy spec.** Create `providers-copy.spec.ts` (P7). Expected: the spec passes.

4. **Providers case.** In `step-body.ts`, replace the providers placeholder with this (option A of open point 1; rewrite if the Navigator picks another):

   ```ts
   @case ('providers') {
     @if (panelAvailable()) {
       <app-providers-panel />
     } @else {
       <p><a routerLink="/providers">Model providers</a></p>
     }
   }
   ```

   Add `private readonly router = inject(Router);`, `protected panelAvailable(): boolean { return this.router.config.some((route) => route.path === 'providers'); }`, and `imports: [ProvidersPanel, RouterLink]` to the decorator. `Router` and `RouterLink` come from `@angular/router`. Expected: `step-body.ts` compiles. Only the providers case changes.

5. **Providers controls.** In `setup-page.ts`, add a branch before the existing `@if (step() !== 'access')` block of the non-last-step controls:

   ```html
   @if (step() === 'providers') {
     <button mat-flat-button [disabled]="busy()" (click)="continueProviders()">Continue</button>
     <button mat-stroked-button [disabled]="busy()" (click)="writeState('skipped')">Skip</button>
   } @else if (step() !== 'access') {
     ... the existing Mark done and Skip, unchanged ...
   }
   ```

   Add `protected continueProviders(): void`. It returns when `contract` is undefined or `busy()` is true. It calls `begin()`, then `this.api.get(PROVIDERS_PATH, providerListCopy)` with `takeUntilDestroyed`. On `next`, it sets `busy` to false. If `isUsable(list)` is true, it calls `this.writeState('done')`. Otherwise it sets `failure` to `No usable provider yet. Add one, or skip this step.`. On `error`, it sets `busy` to false and calls `this.fail(error)`. The Next and Skip-the-rest controls, and the last step's controls, do not change. Expected: `setup-page.ts` builds, and the other steps' buttons are unchanged.

6. **Page spec.** In `setup-page.spec.ts`:
   - Add two components: `ProvidersStub` (selector `app-providers-panel`, empty template, as in `settings-page.spec.ts` line 31) and `ProvidersRouteStub` (empty template, used as a route component).
   - In `renderSetup` (lines 76 to 82), before `configureTestingModule`, call `TestBed.overrideComponent(StepBody, { remove: { imports: [ProvidersPanel] }, add: { imports: [ProvidersStub] } })`. Give `provideRouter` the list `[{ path: 'providers', component: ProvidersRouteStub }, ...APP_ROUTES]`. The test route goes first, so the router sees a `providers` path both before and after MPR-11 lands. The W1 result does not depend on the merge order.
   - W1, line 489: replace `expect(paragraphs(root)).toContain('Model providers are not set up yet.');` with `expect(root.querySelector('app-providers-panel')).not.toBeNull();`. Nothing else in W1 changes.
   - Add a describe block `P providers step with the fake API` with P3 to P6 (section 4).
   Expected: every existing test in the file passes, with W1 as changed.

7. **Step body spec.** Create `providers-step.spec.ts` with P1 and P2 (section 4). P1 overrides `StepBody` with the stub, as in step 6, and provides a `providers` route. P2 provides no `providers` route. Both render `StepBody` directly with `TestBed.createComponent`, `setInput('step', 'providers')` and a loopback `Identity`. Expected: both pass.

8. **Phone e2e.** In `e2e/specs/setup-phone.e2e.ts`, replace the assertion at lines 239 to 241 with a check that is true before and after MPR-11: the page shows `app-providers-panel` or a link with `href="/providers"`. Use the locator `page.locator('app-setup-page app-providers-panel, app-setup-page a[href="/providers"]')` and `toBeVisible()`. In the step at lines 245 to 246, rename it to `providers: Continue, then Next`, and click the button `Continue`. Keep the Preferences assertion and the rest of the file. Expected: the file parses. Run the e2e suite as AGL-08 did (`npm run e2e -w @bbartolome/scriba-e2e -- --trace off`, `plans/DECISIONS.md` line 4491 and after). Expected: `setup-phone` passes. If Chromium is not available, record the e2e as not run, with the reason. Do not mark the e2e as passed.

9. **Checks.** Run `npx prettier --check` on each file of section 2. Run `npm run lint -w @bbartolome/scriba-web`, `npm test -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web`. Expected: all exit 0. The build's CommonJS warnings equal the list of step 1. **Stop rule:** a new CommonJS warning, or a build that fails, stops the unit. Report it and do not change the plan.

10. **Commit.** Commit only the section 2 paths, on `unit/SAU-12`, with a message that contains `SAU-12`, for example `feat(SAU-12): embed the providers panel in the setup step`. Do not commit `plans/`. Expected: the commit lists only the section 2 paths.

## 4. Acceptance criteria and tests

The unit has two criteria (unit lines 20 and 21). Each has one test that is named here. Other tests in section 4 check the behavior that the criteria do not state. Run all of them with `npm test -w @bbartolome/scriba-web`. Nothing needs a remote, CI or Docker. The e2e run in step 8 is a regression check, not a criterion.

| Criterion | Test (name and file) | Seam | Pass condition |
|---|---|---|---|
| 1. "The step renders the Model providers component (a stub of it in tests) and contains no provider form of its own." | **P1** `providers-step.spec.ts`: "P1 the providers step renders the Model providers component (stub) and no form of its own" | `StepBody` with the stub override and a `providers` route | Exactly one `app-providers-panel` element. No `form`, `input`, `select` or `textarea` element in the host. No `a` element. |
| 2. "Before the panel exists, the step shows a link to `/providers`." | **P2** `providers-step.spec.ts`: "P2 without the providers route the step shows a link to /providers and no panel" | `StepBody` with no `providers` route | One `a` element whose text is `Model providers` and whose `href` attribute is `/providers`. No `app-providers-panel` element. |

Further tests, for the behavior of D4 to D5 and D11:

- **P3** `setup-page.spec.ts`: "P3 the providers step shows Continue, Skip, Next and Skip the rest, and no Mark done". Reach the providers step with Next twice from the access step (the C1a setup). Expected button texts: `['Continue', 'Skip', 'Next', 'Skip the rest']`.
- **P4** `setup-page.spec.ts`: "P4 Continue with a usable provider reads the list, writes done and moves on". Answer `GET /api/providers` with the usable fixture, and answer the step POST with a status whose providers step is `done`. Expected: the requests are exactly `GET /api/providers` and `POST /api/setup-auth/steps/providers` with body `{state: 'done'}`, in that order. The page shows `Preferences` as the current step and `Model providers: done` in the list. No model-list or connection-test request.
- **P5** `setup-page.spec.ts`: "P5 Continue with no usable provider writes nothing and shows the message". Answer the GET with the non-usable fixture. Expected: the requests are only the GET. The alert line shows `No usable provider yet. Add one, or skip this step.`. The step is still providers, and Continue is enabled.
- **P6** `setup-page.spec.ts`: "P6 Skip on the providers step writes skipped and moves on". Expected: `POST /api/setup-auth/steps/providers` with `{state: 'skipped'}`, and the page shows Preferences.
- **P7** `providers-copy.spec.ts`: "P7 the copy of GET /api/providers accepts what the contract accepts and rejects what it rejects". Accepted: `PROVIDERS_EXAMPLES.providerList` (`packages/contracts/src/providers/examples.ts` line 88) and the two read examples (`ollamaRead`, `openRouterRead`). Rejected: a body without `providers`, `providers` that is not an array, an entry without `id`, `keySet` that is not a boolean, and `keyRef: ''`. `PROVIDERS_PATH` equals `PROVIDERS_ROUTE`.
- **W1** (existing, changed at line 489 only; section 3, step 6). The wizard test still walks skip, complete and re-run.
- **E1** (existing e2e, changed at lines 239 to 246; section 3, step 8). The phone flow passes through the providers step with Continue.

Fixtures for P4 and P5 depend on open point 2. Under options (a) and (b), the usable fixture is `PROVIDERS_EXAMPLES.ollamaRead` (keyless, as seeded) and the non-usable fixture is `{providers: []}`. Under options (c) and (d), the fixtures change, and the reviser records the change here.

## 5. Agreement with the downstream and the parallel units

- **SAU-16 (the gate; `blocked_by` line 7 names SAU-12; no plan).** Its criterion (`units/SAU-16-setup-flow-gate.md` line 23) needs the step to render the Model providers component. Under option A, that holds once the `/providers` route is on `main`, so SAU-16 depends on MPR-11 landing. See open point 3. This plan changes no SAU-16 file. Its demo (`units/SAU-16-setup-flow-gate.md`, the Demo section) picks an Ollama model in the embedded step. That also needs the panel, not the link.
- **SAU-13, SAU-14 and SAU-20 (no plans; each `blocked_by` SAU-11).** Each replaces its own `@case` in `step-body.ts` and changes its own controls in `setup-page.ts` (`plans/SAU-11.md` lines 69, 79 and 89). Shared spots: the `renderSetup` helper (`setup-page.spec.ts` lines 76 to 82), and the W1 test and the e2e file (`setup-phone.e2e.ts`), where each unit changes only its own step's lines. Rule for the second merger: keep both changes. `TestBed.overrideComponent(StepBody, …)` appears once, and each unit adds its own stub to the same `remove` and `add` lists. Each unit keeps its own W1 and e2e assertions.
- **MPR-11 (`planned`; code on `unit/MPR-11`, not on `main`).** It adds a top-level `{ path: 'providers', … }` entry to `APP_ROUTES` in `app.routes.ts` (`git diff main...unit/MPR-11 -- apps/web/src/app/app.routes.ts`, +13 lines), and `providersRoutes` to `providers.routes.ts`. It keeps the `ProvidersPanel` export (`plans/SAU-15.md` line 164). This plan changes neither file. Both orders are correct. (i) SAU-12 first: the route is absent, so the step shows the link, and the link leads to the not-found page until MPR-11 lands. The unit accepts that. (ii) MPR-11 first: the route is present, and the step embeds the panel. The tests do not depend on the order, because `renderSetup` and P2 set their own router configuration. `plans/MPR-11.md` line 194 says the same.
- **MPR-12 (`planned`, API only).** It changes no web file (`plans/MPR-12.md` line 113). No shared file. Both orders are correct.
- **SAU-15 (done).** It imports the same panel from the same entry file (`settings-page.ts`). This plan changes nothing it uses. Its spec's stub stays.
- **AGL-25 (`draft`).** It names none of this plan's files.
- **Other draft and planned plans.** `grep -l` over `plans/*.md` for `step-body`, `setup-page`, `providers.routes`, `app.routes` and `settings-page`, among draft and planned plans, finds only MPR-11 and MPR-12.

## 6. Open points

1. **What makes the link appear and then give way to the panel (criterion 2; unit lines 15 and 21).** The unit says the step links to `/providers` until `phase:settings-ui` lands. The facts: the component is already on `main`, because `providers.routes.ts` line 3 re-exports it and MPR-09 is done. The route is not on `main`, because `APP_ROUTES` has no `providers` entry. The gate MPR-11 is `planned` with code on `unit/MPR-11`. So "the component exists" is already true, and "the phase has landed" is not. The options:
   - **A.** The route exists: `StepBody` checks `Router.config` (typed `Routes`, `node_modules/@angular/router/types/_router_module-chunk.d.ts` line 1496) for a top-level `providers` path. The link is shown while the path is absent, and the panel once MPR-11 is on `main`. No later edit is needed. **Written into section 3 step 4 and tests P1 and P2.**
   - **B.** A constant in `step-body.ts`, `false` now. It has to be changed later, by MPR-11 or the orchestrator, in a file of this unit.
   - **C.** An injection token that the app provides, absent until the route lands. It adds a token and an app-level provider.
   - **D.** Treat the component's existence as "the panel exists". The link is then never shown, and criterion 2 has no state to test. The planner does not choose D.
2. **What "a usable provider" means (unit line 17).** The read view carries `keySet` and an optional `keyRef` (`packages/contracts/src/providers/config.ts` lines 17 and 27 to 29). It carries no connection status. The app default is `appDefaultSchema` (`packages/contracts/src/providers/model.ts` line 33; `GET /api/providers/app-default`). The options:
   - **(a)** Any provider is listed.
   - **(b)** A listed provider has no `keyRef` (it is keyless), or has `keySet` true.
   - **(c)** The app default is set and names a listed provider.
   - **(d)** A connection test has passed in this session. The result is not stored. It needs `POST /api/providers/test`, which the panel owns.

   The facts: an absent providers section reads as an empty list with `appDefault: null` (`apps/api/src/modules/providers/providers.registry.ts` line 111). The MPR-02 plan (line 17) says the first start seeds one keyless `ollama` provider and sets it as the app default. The planner read this in the plan and did not trace the seeder. Under (a), (b) and (c), a fresh install with the seed passes Continue at once, and nothing checks that Ollama is reachable. Only (d) checks it. The predicate is written as `isUsable` (section 2). The fixtures of P4 and P5 follow the option (section 4).
3. **Gate and order (unit line 7; the orchestrator's rule).** Line 7 names the settings-UI phase in quotes, with no unit id. `prompt.md` line 51 makes the orchestrator ignore such an entry. So SAU-12 is available now, and it may merge before MPR-11. `plans/DECISIONS.md` line 4504 raised this for the orchestrator and the user. The plan is correct in either order under option A (section 5), so this point does not block the plan. The gap is that SAU-16 (`units/SAU-16-setup-flow-gate.md` line 23) needs the embedded panel, and SAU-16 has no entry for MPR-11. So SAU-16 can be checked before MPR-11 is on `main`. The fix options are: (a) keep the entry as informative; (b) name MPR-11 in SAU-12's entry, and change MPR-11's `unblocks` to the exact inverse (`units/README.md` line 64). A unit file changes only by the Navigator's decision. The planner does not make that change.

## 7. Facts checked and assumed

**Checked in the repository in this run (no file was changed):**

- `prompt.md`: the Draft rules (lines 84 to 94), the availability rule (line 51), the Navigator rules (lines 283 to 295), and the commit rules (lines 297 to 301).
- `units/SAU-12-providers-step.md`: front matter (lines 7 to 9), decisions (lines 15 to 17), criteria (lines 20 and 21). No "Moved to", "Removed by revision", "Loosened by revision" or "Reworded by revision" note is in this file. A grep of `units/` and `modules/` for those phrases found none for SAU-12.
- Git: `main` at `5475399`, clean at the start. Branches: `unit/MPR-11` (worktree `/Users/bbartolome/workspace/scriba-prototype-wt/MPR-11`), `unit/MPR-12`. No `unit/SAU-12` branch and no `plans/SAU-12.md` before this run.
- Plan statuses: `done` for SAU-01 to SAU-11, SAU-15, MPR-01 to MPR-10, SHL-07, SHL-09, SHL-20, PST-01 and PST-12. `planned` for MPR-11 and MPR-12. `draft` for AGL-25. No plan for SAU-13, SAU-14, SAU-16 and SAU-20. `plans/QUEUE.md` line 4 lists SAU-12 as available.
- `apps/web/src/app/features/setup-auth/`: `step-body.ts` lines 14 to 30 (the `@switch`; providers placeholder at line 23). `setup-page.ts`: the class doc (lines 17 to 22), the template controls (lines 59, 65, 78, 84), and the methods `writeState` (142), `finish` (171), `moveOn` (191), `begin` (198), `load` (203) and `fail` (235). `setup-page.spec.ts`: `renderSetup` (lines 76 to 82), the W1 assertion (line 489), the W1 buttons (lines 478 to 481 and 528 to 531). `steps.ts` (the five keys and titles). `setup-contract.ts` (header lines 1 to 8).
- `apps/web/src/app/features/providers/providers.routes.ts`: only the `ProvidersPanel` re-export (line 3). `providers-panel.ts` line 21 has the selector `app-providers-panel`.
- `apps/web/src/app/app.routes.ts`: no `providers` entry. `settings-page.ts` imports `ProvidersPanel` from `../providers/providers.routes` and embeds it. `settings-page.spec.ts` stubs it (lines 27 to 32, 75 to 77).
- `apps/web/src/app/shell/index.ts` exports `API_CLIENT`, `ApiError`, `ApiPath` and `ResponseSchema` (lines 3 to 5). `shell/testing/test-doubles.ts` line 91: an unanswered route throws.
- `e2e/specs/setup-phone.e2e.ts`: the providers placeholder assertion at lines 239 to 241, the providers `test.step` at lines 245 to 246, and the Preferences placeholder at line 248.
- Contracts: `PROVIDERS_ROUTE` (`providers/routes.ts` line 3); `keyRef` (`providers/config.ts` line 17); the read view (lines 27 to 29); `appDefaultSchema` (`providers/model.ts` line 33); `PROVIDERS_EXAMPLES.providerList` (`providers/examples.ts` line 88); `SETUP_STEP_ROUTE` (`setup-auth/routes.ts` line 7); `stepUpdateSchema` (`setup-auth/status.ts` line 41).
- `eslint.config.mjs` line 50: rule R1, a feature imports another only through its entry file.
- `node_modules/@angular/router` is version 22.2.5. `Router.config: Routes` is public (`types/_router_module-chunk.d.ts` line 1496).
- `apps/api/src/modules/providers/providers.registry.ts` line 111: an absent section reads with `appDefault: null`.
- `plans/DECISIONS.md`: line 3148 (the Navigator's option b), line 4504 (the blocked_by point), and the AGL-08 entry at line 4491 (the e2e command form).
- `plans/MPR-09.md` lines 70, 71, 77 and 236. `plans/SAU-11.md` lines 69, 79 and 89. `plans/SAU-15.md` lines 38, 50 and 164. `plans/MPR-11.md` line 194. `plans/MPR-12.md` line 113. `plans/MPR-02.md` line 17. `modules/setup-auth.md` lines 42, 68 and 76. `modules/providers.md` lines 3, 33 and 45. `units/README.md` lines 62 to 65, 89 and 93.
- `git diff main...unit/MPR-11` for `app.routes.ts` and `providers.routes.ts`.

**Assumed, not verified in this run:**

- The build's CommonJS warnings equal the baseline that SAU-15 left (the planner did not run a build).
- `TestBed.overrideComponent` on `StepBody` works as the override on `SettingsPage` does (`settings-page.spec.ts` line 75). SAU-15 is done, but its tests were not run here.
- `RouterLink` on an `a` element renders `href="/providers"`. P2 checks it.
- The first-start seed (MPR-02 line 17) is what the code does. The seeder file `providers.seeding.ts` exists, but its behavior was not traced.
- `ollamaRead` in `PROVIDERS_EXAMPLES` is keyless. The example file was not read in full.
- The e2e suite was not run here, and Chromium availability was not checked.
