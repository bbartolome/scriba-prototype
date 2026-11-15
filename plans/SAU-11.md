---
id: SAU-11
status: draft
unit: units/SAU-11-wizard-shell-routing.md
---
# SAU-11 plan — /setup wizard shell, Access step, skip, completion and the compose warning

Setup & auth, phase:setup-flow, M2, main track. Unit `units/SAU-11-wizard-shell-routing.md`: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9), Decisions lines 15 to 20, acceptance criteria lines 23 to 26. Written against `main` at `e46b9bd` (the commits after `7592c1b` change only `plans/AGL-10.md` and `plans/PST-14.md`; the tree was clean). Nothing was built, installed, run or tested while this plan was written; the planner ran reads, greps and `git` only.

**Availability (checked).** Blockers: SAU-06 (`plans/SAU-06.md` line 3, `status: done`), SAU-09 (`plans/SAU-09.md` line 3, `status: done`) and SHL-09 (`plans/SHL-09.md` line 3, `status: done`). No `plans/SAU-11.md` existed. `plans/QUEUE.md` lists SAU-11 as available. The unit is available.

Tags: FACT means checked in this session (section 7). ASSUMED means not checked (section 8). DECISION means a choice made here, with its reason (section 1b).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, the API and earlier plans (obeyed, not reopened)

- **Steps and order.** 1 Access (current identity), 2 Tailscale (placeholder showing "unavailable" until SAU-20), 3 Model providers, 4 Preferences, 5 First project. Every step except Access can be skipped. Finishing, or explicitly skipping the rest, sets `complete`. Source: unit line 15. The keys are `SETUP_STEP_KEYS` in this order (`packages/contracts/src/setup-auth/status.ts` line 4).
- **Stored values.** Each step loads current values as defaults and writes only what the author changed, through the owning module's API. Source: unit line 16. In SAU-11 the only stored values are step states and `complete`; no step has a field until SAU-13 (open point 1).
- **Routing.** The SPA sends an authenticated author to `/setup` until `complete` is set, the Shell's landing reads this module's status, and re-running `/setup` is always allowed. Source: unit line 17. Already on main: `apps/web/src/app/shell/landing.ts` line 51 (complete goes to the active project) and line 54 (otherwise `/setup`); `apps/web/src/app/app.routes.ts` line 78 (the `setup` entry has no guard).
- **Phone width.** Works at 390 by 844, including over the tailnet, and finishing a skipped step from the phone. Source: unit line 18.
- **Completion replaces Continue.** The M1 page's Continue is replaced by the wizard's own completion, and the "skip the rest" path stays. Source: unit line 19. Continue is `SETUP_CONTINUE_ROUTE` (`packages/contracts/src/setup-auth/routes.ts` line 5). The server marks pending steps skipped and sets `complete` (`apps/api/src/modules/setup-auth/setup-status.service.ts` `continueSetup`, lines 70 to 78, and `continuedSteps`, lines 40 to 46).
- **Compose warning.** On `/setup`, for `mismatch` and `unknown`, with SAU-10's re-run-the-installer one-liner; hidden for `ok`. Source: unit line 20, added by the Navigator decision of `plans/DECISIONS.md` lines 4125 to 4130 and applied in commit ba39540 (entry at lines 4138 to 4142). Data: `compose` in `GET /api/setup-auth/status` (`packages/contracts/src/setup-auth/status.ts` lines 27 to 31 and 34 to 38), produced by SAU-10 (`plans/SAU-10.md`, done).
- **Criteria.** The four criteria of unit lines 23 to 26 are tested in section 4.
- **Inherited from SAU-06 (done; `plans/SAU-06.md` section 1b), kept.** The identity states of decision 1b-3: any 401 shows the sign-in notice only; the two tailnet codes show their explanation only; any other error shows its message in a `role="alert"` paragraph. The texts of 1b-4: "Signed in from this computer (loopback).", "Signed in over the tailnet as <login>.", then "You're in.". The sign-in notice and its commands (1b-4, 1b-6; `sign-in-notice.ts`). The tailnet explanations (1b-8). The heading rule of 1b-7: no heading contains the word "Scriba". The host style of 1b-13: `:host { display: block; padding: 16px; overflow-wrap: anywhere; }`. The rule of 1b-9 and 1b-12: only `setup-contract.ts` refers to the contract at run time, through a dynamic import; every other feature file imports contract types only. The selector `app-setup-page` (the e2e uses it).
- **Module and repository rules.** External behaviour only. UI tests render with Angular's Vitest runner against a fake API client. A viewport check is a Playwright spec at 390 by 844 (`modules/setup-auth.md` lines 64 to 69; `units/README.md` line 136; `plans/SAU-06.md` section 1a, item 15). `GET` never mutates (`units/README.md` line 129).
- **Existing API, used as it is (SAU-03, SAU-05, SAU-09, SAU-10).** `GET /api/setup-auth/status` (`setup-status.controller.ts` line 22, cookie required). `POST /api/setup-auth/continue` (line 29). `POST /api/setup-auth/steps/:step` with body `{state: 'done' | 'skipped'}` (`setup-flow.controller.ts` line 37; `setStep`, `setup-status.service.ts` line 85, writes that one step and never `complete`). `GET /api/setup-auth/identity` (`setup-session.controller.ts` lines 101 to 116). No API or contract change is needed.

### 1b. Choices made by this plan (DECISION)

- **P1. One route, no child routes.** The wizard is `SetupPage` at `/setup`; the current step is component state, not a URL. `app.routes.ts` and `setup-auth.routes.ts` do not change. Reason: the unit does not ask for step URLs, and a child route would need `pathMatch: 'full'` removed from the `setup` entry (`plans/DECISIONS.md` line 2925, a review item on the SAU-06 plan). Open point 8.
- **P2. Buttons and what they write.** Only an explicit author action writes a step state. "Next" moves on and writes nothing. "Mark done" writes `done` and moves on. "Skip" writes `skipped` and moves on. "Skip the rest" posts `SETUP_CONTINUE_ROUTE` and goes to `LANDING_PATH`. On the last step, "Finish" posts `SETUP_CONTINUE_ROUTE` and goes to `LANDING_PATH`; on the last step, "Mark done" and "Skip" write their state and then finish (post continue). The matrix:

  | Step | Buttons, in order |
  |---|---|
  | 1 Access | Next, Skip the rest |
  | 2 Tailscale, 3 Model providers, 4 Preferences | Mark done, Skip, Next, Skip the rest |
  | 5 First project | Mark done, Skip, Finish |

  Reason: a re-run passes through a step without changing its stored state (a `skipped` step stays `skipped` on Next), and a skipped step is finished with Mark done (unit line 18). Open point 3.
- **P3. Access step.** Body as SAU-06 (1b-3, 1b-4). Access cannot be skipped (unit line 15), so it has no Skip. Next does not write `access`. The stored access stays `pending`, which the status shows as `done` (`statusBody`, `setup-status.service.ts` line 26), and continue marks it `done` (`continuedSteps`, line 40).
- **P4. Placeholders for steps 2 to 5.** Text only, in `step-body.ts`: Tailscale "Tailscale is unavailable."; Model providers "Model providers are not set up yet."; Preferences "Preferences are not set up yet."; First project "The first project is not set up yet.". No text contains "Scriba". SAU-12, SAU-13, SAU-14 and SAU-20 each replace one `@case` (section 5).
- **P5. Opening step and states list.** On every load the wizard opens at Access, re-run included. An ordered list shows the five steps as `title: state`, with the state words of the contract (`SETUP_STEP_STATES` in `status.ts`): `pending`, `done`, `skipped`. Open point 9.
- **P6. Read order.** Identity first, as in SAU-06. Only after it answers 200 is the status read; a failure of that read uses the same error mapping as the identity read. Without a 200 identity, no status is read, no control shows, and the notice, explanation or alert is the only content (1b-3).
- **P7. Compose warning component.** `compose-warning.ts` holds `ComposeWarning` (selector `app-compose-warning`, input `compose`) and the exported constant `COMPOSE_UPDATE_COMMAND = 'docker run --rm -e SETUP=true bbartolome/scriba | bash'` (the text is `scripts/entrypoint.sh` line 20). It renders nothing for `ok`. For `mismatch` it says the install's compose version (`actual`) differs from the one this Scriba needs (`expected`). For `unknown` it says the install does not report its compose version. Both then show the one-liner in one `<code>`. It has no `role="alert"`, because the e2e's `getByRole('alert')` in state 4b would match two elements in strict mode. It sits after the heading.
- **P8. Controls fit the phone.** The controls sit in a flex row with wrap, so four buttons wrap at 390 px. They show only when the identity answered 200 and the status is loaded.
- **P9. Contract use.** `setup-contract.ts` adds `SETUP_STATUS_ROUTE`, `setupStatusSchema` and `SETUP_STEP_ROUTE` to its `Pick`. The step path is `SETUP_STEP_ROUTE` with `:step` replaced by the key, cast to `ApiPath` (`api-client.ts` line 13 types `ApiPath` as `` `/${string}` ``). The step keys in `steps.ts` are literals typed with the type-only `SetupStep`.
- **P10. The journey e2e changes in place.** `e2e/specs/journey.e2e.ts` lines 56 and 57 change without adding or removing a line, so the lines 72 and 73 that MPR-08 and AGL-08 cite stay where they are (`plans/MPR-08.md` lines 29, 30 and 253).
- **P11. C2 state 2's "no code" check is scoped to the sign-in notice.** In the e2e the API has no `SCRIBA_COMPOSE_VERSION` (`e2e/harness/global-setup.ts` lines 77 to 82), so the status is `unknown` and the one-liner `<code>` shows on `/setup` in every signed-in state. The check `app-setup-page code` count 0 (`setup-phone.e2e.ts` line 99) would then fail, so it becomes `app-sign-in-notice code`.

## 2. Files to create or change

Paths are relative to the repository root. Only these paths change.

| Path | Change | Purpose |
|---|---|---|
| `apps/web/src/app/features/setup-auth/setup-page.ts` | rewrite (126 lines today) | `SetupPage`, selector `app-setup-page`: the wizard shell. Keeps the identity load and the `fail()` mapping of SAU-06. Adds the status read, the five-item list, the controls of P2, the busy flag, the posts of P2, and the compose warning |
| `apps/web/src/app/features/setup-auth/step-body.ts` | new | `StepBody` (selector `app-step-body`), input `step` (type `SetupStep`) and, for Access, input `who` (`Identity`). A `@switch` with the Access identity text and the four placeholders of P4. The one file that SAU-12, SAU-13, SAU-14 and SAU-20 each change for their own step |
| `apps/web/src/app/features/setup-auth/steps.ts` | new | `WIZARD_STEPS`: five entries `{key, title}` in the order of section 1a, titled Access, Tailscale, Model providers, Preferences, First project. Type-only import of `SetupStep` |
| `apps/web/src/app/features/setup-auth/compose-warning.ts` | new | `ComposeWarning` and `COMPOSE_UPDATE_COMMAND` (P7). Imports only the type `ComposeVersionStatus` |
| `apps/web/src/app/features/setup-auth/setup-contract.ts` | edit (27 lines) | adds `SETUP_STATUS_ROUTE`, `setupStatusSchema` and `SETUP_STEP_ROUTE` to the `Pick` type (entries from line 16); the header comment is updated to name the status and step routes |
| `apps/web/src/app/features/setup-auth/setup-page.spec.ts` | edit (373 lines) | updates C1a (two tests), C1b, X1 and X4 (section 4, regression table); adds a `describe` with W1 (criterion 1) and W2 (criterion 4) |
| `e2e/specs/setup-phone.e2e.ts` | edit (191 lines) | updates the C2 steps (section 4); adds C3 (criterion 3) |
| `e2e/specs/journey.e2e.ts` | edit, lines 56 and 57 in place | the setup step completes through "Skip the rest" instead of "Continue" |

Checked and not changed: `app.routes.ts`, `setup-auth.routes.ts`, `sign-in-notice.ts`, `setup-contract.spec.ts` (X5), `shell/landing.ts`, `shell/landing.spec.ts`, `packages/contracts/**`, `apps/api/**`, `units/**`, `modules/**`, `deploy/**`, `scripts/**`, `docs/**`, `e2e/specs/projects-phone.e2e.ts`, `e2e/specs/phone-toolbar.e2e.ts`, and every other plan.

## 3. Procedure

Run from a worktree on branch `unit/SAU-11` made from `main` (`git worktree add -b unit/SAU-11 <path> main`). Record `node -v` (expected `v26.x`) and `npm -v` beside the first result. Do not push. Use absolute paths in commands. If a step's expected result does not hold, stop and report; do not change this plan.

0. **Preconditions.** `npm ci`, then `npm run build -w @bbartolome/scriba-contracts`, then `ls packages/contracts/dist/setup-auth/index.js`. Expected: exit 0 and the file is listed. The contracts `dist` is git-ignored and the web app imports it at run time, so the build is needed in a new worktree (as SAU-06's step 0 says).
1. **Baseline.** `npm test -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web`. Expected: exit 0 for both. Record the test counts and the number of CommonJS warnings that `ng build` prints.
2. **Red tests.** Edit `setup-page.spec.ts`. In C1a (both tests), C1b, X1 and X4, add `doubles.api.respond('GET', SETUP_STATUS_ROUTE, SETUP_AUTH_EXAMPLES.setupStatus)` (the wizard now reads the status) and change the expected buttons to the matrix of P2: `['Next', 'Skip the rest']` on Access; C1b and X4 click "Skip the rest". Add `describe('W wizard with the fake API')` with W1 and W2 (section 4). Commit only this file: `test(SAU-11): add the wizard tests (red)`. Expected: `npm test -w @bbartolome/scriba-web` fails in W1, W2 and the four updated tests, and in nothing else (C1c, C1d, X2, X3, X5 and landing C1 still pass).
3. **Contract loader.** Edit `setup-contract.ts` as section 2 says. Expected: `npx tsc --noEmit -p apps/web/tsconfig.app.json` and `npx tsc --noEmit -p apps/web/tsconfig.spec.json` exit 0.
4. **Steps list.** Create `steps.ts`. Expected: the keys are in `SETUP_STEP_KEYS` order.
5. **Compose warning.** Create `compose-warning.ts` (P7). Expected: `grep -n "from '@bbartolome/scriba-contracts" apps/web/src/app/features/setup-auth/compose-warning.ts` shows only `import type` lines.
6. **Step body.** Create `step-body.ts` (P3, P4). Expected: the same grep rule holds for this file.
7. **Wizard shell.** Rewrite `setup-page.ts` (P1, P2, P5, P6, P8): the identity load, then the status; the controls and their posts; the busy flag; the failure mapping of SAU-06 for identity, status and posts; navigation to `LANDING_PATH` with `replaceUrl`, as `onContinue` does today (lines 67 to 85). Expected: `setup-page.ts` has no value import from the contract, and the grep rule of step 5 holds for it.
8. **Green.** `npm test -w @bbartolome/scriba-web`. Expected: exit 0. W1, W2, the landing test C1 (`shell/landing.spec.ts`), the four updated tests and every other test of the suite pass.
9. **Format and lint.** `npx prettier --write` on the TypeScript paths of section 2, then `npm run lint -w @bbartolome/scriba-web`. Expected: exit 0.
10. **Build.** `npm run build -w @bbartolome/scriba-web`. Expected: exit 0, and the CommonJS warnings equal the count of step 1, because the new files add no value import of the contract.
11. **Mutation checks (unit).** Apply each one, run the command of step 8, record the failing tests, and revert. Expected after the reverts: `git diff` is empty.
    - M1: "Next" also posts `{state: 'done'}` for its step. Expected: W1 fails at the POST check of step 2.
    - M2: "Skip the rest" navigates without posting. Expected: W1 and X1 fail.
    - M3: the compose warning is shown for `ok`. Expected: W2 fails.
    - M4: the one-liner constant has a typo (`bbartolome/scripa`). Expected: W2 fails.
    - M5: `WIZARD_STEPS` puts Preferences before Model providers. Expected: W1 fails.
    - M6: the status read is skipped and every step shows `pending`. Expected: W1 fails.
12. **Commit part 1.** `git add` the paths of step 2's files that step 7 changed, then `git commit -m "feat(SAU-11): the /setup wizard shell with five steps, skip, completion and the compose warning" -- apps/web/src/app/features/setup-auth/setup-page.ts apps/web/src/app/features/setup-auth/step-body.ts apps/web/src/app/features/setup-auth/steps.ts apps/web/src/app/features/setup-auth/compose-warning.ts apps/web/src/app/features/setup-auth/setup-contract.ts`. Never `git add -A` or `git commit -a`. Expected: one commit on `unit/SAU-11`.
13. **Journey.** Edit `e2e/specs/journey.e2e.ts` lines 56 and 57 (P10): the comment says "Skip the rest is a real POST through the guard's Origin check", and the click is `page.getByRole('button', { name: 'Skip the rest', exact: true }).click()`. Expected: the file has the same number of lines as before.
14. **Phone e2e.** Edit `setup-phone.e2e.ts`. The helper `continueButton` (lines 43 to 45) becomes `nextButton` (name "Next") and `skipRestButton` (name "Skip the rest"), both with `exact: true`. Add `wizardButtons(page)`, which is `page.locator('app-setup-page button')`. Lines 79, 125, 136 and 151 check `wizardButtons` has count 0. Lines 98 and 112 check that `nextButton` and `skipRestButton` are visible. Line 99 checks `page.locator('app-sign-in-notice code')` has count 0 (P11). Lines 172 and 174 click "Skip the rest" (state 4b; `CONTINUE_ROUTE` at line 13 is unchanged), and line 186 checks that "Skip the rest" is enabled. The titles at lines 47, 83, 103 and 155 name the new buttons. Then add C3 (section 4). Expected: the file has the C2 test and the C3 test.
15. **E2E run.** `npm run e2e -w @bbartolome/scriba-e2e`. Expected: exit 0; journey, phone-toolbar, projects-phone and setup-phone (C2 and C3) pass. If no Chromium is available, record the run as blocked with the reason; C2, C3 and the journey's setup step are then not passed.
16. **E2E mutation.** Make "Finish" skip its `POST /api/setup-auth/continue`, run `npm run e2e -w @bbartolome/scriba-e2e -- setup-phone`, and expect C3 to fail. Revert. Expected: `git diff` shows only the edits of steps 13 and 14.
17. **Root gates.** From the root: `npm run build`, `npm test` and `npm run lint`. Expected: each exits 0. `npm run lint` ends with the Prettier check.
18. **Diff and commit part 2.** `git status --short` lists exactly the paths of section 2 that are e2e files and no others. Commit with `git commit -m "test(SAU-11): the phone e2e walks the wizard and the journey completes through Skip the rest" -- e2e/specs/setup-phone.e2e.ts e2e/specs/journey.e2e.ts`. Expected: one commit; no push.

## 4. Acceptance criteria and tests

Each criterion has one test (the unit's four criteria, unit lines 23 to 26). The names below are the names to write.

| Criterion (unit line) | Test (file and name) | Seam | Pass condition |
|---|---|---|---|
| 1. "Component tests (fake API): step order, skip, completion, prefilled defaults on re-run." (23) | **W1**, `setup-page.spec.ts`: `W1 the wizard shows the five steps in order, skips and finishes a step, completes, and shows the stored states on re-run` | `RouterTestingHarness.create('/setup')` under `provideRouter(APP_ROUTES)` and the fake API; a second `SetupPage` through `TestBed.createComponent` for the re-run | The script below |
| 2. "Landing routing: incomplete → `/setup`; complete → app." (24) | **L1**: the existing `shell/landing.spec.ts` test `C1 routes by setup status and active project` (SHL-08). Not changed by this unit | `RouterTestingHarness.create('/')` and the fake API | Passes unchanged in part 1 (step 8). W1's last check adds the completion path into the app |
| 3. "Phone viewport renders and completes the flow." (25) | **C3**, `setup-phone.e2e.ts`: `C3 the wizard walks its five steps at 390 by 844 and completes setup` | real Chromium at 390 by 844, the real API and a real handshake | The script below |
| 4. "Component test (fake API): compose-version warning shown for mismatch/unknown with the one-liner; hidden for ok." (26) | **W2**, `setup-page.spec.ts`: `W2 the compose warning shows the one-liner for mismatch and unknown, and not for ok` | `TestBed.createComponent(SetupPage)` three times, one fake status each | The script below |

**W1 script.** Fake API: identity `SETUP_AUTH_EXAMPLES.identityLoopback`. The status objects are written in the spec, each `satisfies SetupStatus`: `fresh` (access `done`, the other four `pending`, `complete` false, compose `composeOk`); `afterSkip` (tailscale `skipped`, otherwise as `fresh`); `afterDone` (tailscale `done`, otherwise as `fresh`); `complete` (as `afterDone` with `complete` true).

1. Render `/setup` with `fresh`. The list shows Access, Tailscale, Model providers, Preferences and First project, in that order, with states done, pending, pending, pending and pending. The Access body shows the loopback text and "You're in.". The buttons are exactly `['Next', 'Skip the rest']`.
2. Click Next. The Tailscale body shows "Tailscale is unavailable.". The buttons are `['Mark done', 'Skip', 'Next', 'Skip the rest']`. No POST was recorded.
3. Set the POST canned response for `/api/setup-auth/steps/tailscale` to `afterSkip`, then click Skip. The recorded request is POST `/api/setup-auth/steps/tailscale` with body `{state: 'skipped'}`. The page shows the Model providers body, and the list shows tailscale `skipped`.
4. Set the GET canned response for `/api/setup-auth/status` to `afterSkip`. Create a second page with `TestBed.createComponent(SetupPage)`. Its list shows tailscale `skipped` and the other states as stored, and its body is Access (P5). On this page, click Next, set the POST canned response for tailscale to `afterDone`, and click Mark done. The recorded request is POST tailscale with `{state: 'done'}`, and this page's list shows tailscale `done`. Destroy this fixture.
5. On the first page, which is on Model providers, set the POST canned response for `/api/setup-auth/continue` to `complete`, answer the landing reads as `respondLanding` does, and click "Skip the rest". The recorded request is POST continue with body `{}`, and `router.url` becomes `/projects/a/chat`.

**W2 script.** Configure the TestBed as W1 does (`provideRouter(APP_ROUTES)`, the fake API, identity loopback). For each of `composeMismatch`, `composeUnknown` and `composeOk` (the examples of `SETUP_AUTH_EXAMPLES`), set the status to `{...SETUP_AUTH_EXAMPLES.setupStatus, compose: <example>}`, create a `SetupPage`, wait for the list, and check: mismatch and unknown each show one `app-compose-warning`, whose one `code` text is exactly `COMPOSE_UPDATE_COMMAND`; ok shows no `app-compose-warning` and no `code` element. Destroy each fixture before the next.

**C3 script** (`setup-phone.e2e.ts`; `expectPhoneLayout` runs at every step). The test relies on no stored state, because journey runs first and leaves its states in the shared library.

1. Read the setup URL from `SCRIBA_E2E_LIBRARY` and open it (the handshake sets the cookie), then open `/setup`. Expect "Signed in from this computer (loopback)." and the buttons Next and "Skip the rest" (exact names).
2. Click Next. Expect "Tailscale is unavailable.". Click Skip (exact). Expect "Model providers are not set up yet.".
3. Click "Mark done" (exact). Expect "Preferences are not set up yet.". Click Next. Expect "The first project is not set up yet.".
4. Click Finish. Expect the URL to match `/\/projects(\/|$)/`. Then `GET /api/setup-auth/status` returns 200 with `complete` true, `steps.tailscale` `skipped` and `steps.providers` `done`. No page error.

**Existing SAU-06 tests that this unit changes (regression, not criteria).** Their states are kept. Only the button names and the requests they answer change.

| Test | Change | Pass condition |
|---|---|---|
| C1a loopback and C1a tailnet (`setup-page.spec.ts` lines 129, 146) | respond the status; buttons `['Next', 'Skip the rest']` | identity text, "You're in." and the buttons |
| C1b (line 163) | respond the status; click "Skip the rest"; the POST is continue | the landing with `/projects/a/chat` |
| X1 (line 268) | respond the status; the failing POST is continue, from "Skip the rest" | the alert text, the identity, buttons enabled |
| X4 (line 342) | respond the status; a second click on "Skip the rest" sends no second POST | one POST; buttons enabled after the error |
| C1c, C1d (two), X2, X3, X5 | unchanged | pass as they are |
| landing E1 (`landing.spec.ts` line 82) | unchanged | passes |
| e2e C2 (`setup-phone.e2e.ts` line 47) | states 1 to 4b kept; state 2 check (line 99) scoped (P11); "Continue" becomes Next or "Skip the rest" at lines 79 to 186 as section 3, step 14 says | the layout checks (i) to (vi) of SAU-06 unchanged |
| e2e journey setup step (`journey.e2e.ts` lines 56 and 57) | button "Skip the rest" | the landing, and status `complete` true |

## 5. Downstream agreement

The units whose `blocked_by` names SAU-11 are SAU-12, SAU-13, SAU-14, SAU-16 and SAU-20 (line 7 of each unit file). The `unblocks` list of SAU-11 (line 9) is their exact inverse. Each is blocked by SAU-11, so SAU-11 always merges before them.

- **SAU-12 (providers step), SAU-13 (preferences), SAU-14 (first project), SAU-20 (Tailscale).** Each replaces its own `@case` in `step-body.ts` and adds its own files. Each touches `setup-page.ts` only if it needs step-owned state (open point 4). SAU-13 adds the field defaults (its criterion "Prefills saved values") on top of the step list. SAU-12's "link to /providers until the panel exists" and SAU-20's "unavailable in dev" stay their own. Agreement: yes.
- **SAU-15 (settings page; parallel with SAU-11, no plan).** It needs the warning. SAU-11 creates `compose-warning.ts` (P7), and SAU-15 imports `ComposeWarning` and `COMPOSE_UPDATE_COMMAND` from it rather than copying the text. Either order: if SAU-15 merges first, it creates `compose-warning.ts`, and SAU-11 rebases onto it, adopting its `ComposeWarning` (input `compose`, the same one-liner constant, no `role="alert"`) and deleting its own copy of the file. If SAU-11 merges first, SAU-15 imports it. Otherwise the two units touch different files: SAU-15 edits `setup-auth.routes.ts` and adds its own entry to `app.routes.ts` (`plans/SAU-06.md` section 5, the SAU-15 row), and SAU-11 edits neither. Agreement: yes, under the rule above.
- **SAU-16 (setup-flow gate).** Its criterion that skipping providers and preferences still allows completion, with those steps shown as skipped, holds by P2. Its criterion that re-running shows every saved value needs SAU-13. Its compose criterion (with the warning on `/setup` and settings) is met by W2's component on `/setup`. Its e2e leg through the first-project step needs SAU-14. Agreement: yes.
- **SAU-18 (tailnet guard path; not in SAU-11's `blocked_by`).** Over the real tailnet, the status, step and continue routes need the guard to accept the tailnet identity without a cookie. The guard requires a verified cookie on every non-public route (`setup-auth.guard.ts` lines 58 to 63), and the identity route answers 401 for a non-loopback Host (`setup-session.controller.ts` lines 101 to 116). SAU-18's criterion 1 ("API calls succeed with no cookie" on the tailnet Host) covers this. SAU-11's tailnet evidence is the mocked identity of C2 state 3a and the loopback cookie of C3's context, as SAU-06 did. Open point 7.
- **MPR-08 (planned, `plans/MPR-08.md`).** Its demo step at line 158 says "press Continue". After SAU-11 the button is "Skip the rest" (or Next). The sentence is text only, and MPR-08's tests do not click it. Its references to `journey.e2e.ts` lines 72 and 73 stay valid (P10). SAU-11 does not edit that plan.
- **PST-14 (planned, `plans/PST-14.md`).** Its files do not overlap with SAU-11's (its section 2 lists project-store files and `search-phone.e2e.ts`). Its whole-branch run (its step 10, line 87) runs `journey` and `setup-phone`, so it sees C2 and C3 and must pass with them.
- **AGL-10 (draft) and GRR-01 (planned).** No file in common: a grep of their plans for the setup, landing and routing files found nothing.
- **SAU-06 (done).** Its C1 and C2 states are kept. Its button "Continue" is replaced, as the unit requires (section 4 table). `plans/SAU-06.md` section 2 says that `journey.e2e.ts` "is SAU-08's to extend and does not change"; SAU-11 changes two lines of it (open point 6).
- **SHL-08, SHL-09, SAU-09, SAU-10 (done).** No change to their files. The landing (`shell/landing.ts`) and its test stay as they are. The SAU-09 step and continue routes and SAU-10's `compose` are used as they are.

## 6. Open points

1. **Criterion 1's "prefilled defaults on re-run."** SAU-11 has no step with fields, so W1 prefills the stored step states only. Field defaults (author name, default genre pack) belong to SAU-13, whose criterion is "Prefills saved values". Navigator: confirm that the SAU-11 criterion means the states.
2. **Criterion 2 has no new test.** The existing `landing.spec.ts` C1 (SHL-08) covers "incomplete → `/setup`; complete → app", and W1's last check covers the wizard's completion into the app. Navigator: confirm that this counts as the one test.
3. **The button model (P2).** The unit names "skip", "completion" and the replacement of Continue, but no controls. This plan's choice: Next never writes; Mark done and Skip write; Skip the rest and Finish post continue. SAU-12 to SAU-14 and SAU-16 rely on it.
4. **Who writes `done` for steps 3 to 5.** SAU-11 gives a generic Mark done. SAU-12 to SAU-14 may want their own step action to write `done` (SAU-12: "Marks the providers step done when the author continues with a usable provider"). They can hide the generic control for their step with a later input. That is their change, and it does not affect SAU-11's tests.
5. **Mark done on the Tailscale placeholder.** It can mark an unavailable step done. The alternative is to hide Mark done for step 2 in SAU-11. The default in this plan is allowed, and SAU-20 replaces the placeholder. Navigator to choose.
6. **The journey's setup step.** It is SAU-08's e2e. SAU-11 changes its button from "Continue" to "Skip the rest" (two lines, in place), which is required because Continue is replaced (unit line 19). The journey's assertions do not change. Navigator: confirm.
7. **"Over the tailnet" in SAU-11.** The real tailnet path depends on SAU-18, which is not built. SAU-11's evidence is the mocked tailnet identity in C2 state 3a and the loopback cookie in C3, as SAU-06 did. Navigator: confirm that this meets "works over the tailnet" for SAU-11.
8. **No child routes (P1).** `pathMatch: 'full'` stays on the `setup` entry. If the Navigator wants step URLs, the removal of `pathMatch` that `plans/DECISIONS.md` line 2925 describes applies, and the tests of section 4 still hold.
9. **Re-run opens on Access (P5).** The alternative is to open on the first pending step. Navigator to choose; the default is Access, because the unit lists the order from Access.

## 7. Facts checked (at `e46b9bd`; reads, greps and `git` only)

- **F1 Unit.** `units/SAU-11-wizard-shell-routing.md`: front matter lines 1 to 10 (`blocked_by` line 7, `parallel_with` line 8, `unblocks` line 9); Decisions lines 15 to 20; criteria lines 23 to 26. FACT.
- **F2 Blockers.** `plans/SAU-06.md`, `plans/SAU-09.md` and `plans/SHL-09.md`: line 3 is `status: done`. `plans/QUEUE.md` lists SAU-11 as available. `plans/SAU-11.md` did not exist. FACT.
- **F3 Downstream.** `grep -n "SAU-11" units/*.md`: `blocked_by` of SAU-12, SAU-13, SAU-14, SAU-16 and SAU-20 names SAU-11 (line 7 of each); `parallel_with` of SAU-10 (line 8) and SAU-15 (line 8). SAU-15's `blocked_by` (SAU-06, SAU-09, SAU-10, SHL-09) does not include SAU-11. FACT.
- **F4 Current page.** `apps/web/src/app/features/setup-auth/setup-page.ts` (126 lines): one button "Continue" (lines 36 to 37), `onContinue` (line 67), `load` (line 88; the identity read is inside the `try`), `fail` (line 106). `setup-contract.ts` (27 lines): the `Pick` with `IDENTITY_ROUTE` (line 16) and `SETUP_CONTINUE_ROUTE` (line 18). `setup-auth.routes.ts`: one route, `''`, `SetupPage`. FACT.
- **F5 Page tests.** `setup-page.spec.ts` (373 lines): `describe('C1 …')` at line 128; C1a loopback at 129 (`buttonTexts` at 142); C1a tailnet at 146 (159); C1b at 163 (176); C1c at 191; C1d at 208 and 225; `describe('setup page extra tests')` at 267; X1 at 268 (288); X2 at 304; X3 at 327; X4 at 342 (352). Helpers: `renderSetup` (73), `buttonTexts` (94), `continueButton` (102), `settle` (107), `respondLanding` (121). None of the identity-answering tests responds to `SETUP_STATUS_ROUTE`. FACT.
- **F6 Landing.** `apps/web/src/app/shell/landing.ts`: the status read, the `status.complete` branch (line 51) and `navigateByUrl('/setup')` (line 54). `landing.spec.ts`: `describe('landing')` at line 62, C1 at line 63 (incomplete → `/setup`; complete → `/projects/a/chat`, then `/projects`), E1 at line 82. FACT.
- **F7 Route entry.** `apps/web/src/app/app.routes.ts` line 78: `path: 'setup'`, `pathMatch: 'full'`, `minDeviceClass: 'phone'`, no `nav`. FACT.
- **F8 API.** `apps/api/src/modules/setup-auth/setup-status.controller.ts`: GET status at line 22 (cookie required), POST continue at lines 29 and 30. `setup-flow.controller.ts`: POST preferences at lines 28 and 29, POST step at lines 37 and 38. `setup-status.service.ts`: `statusBody` at line 26 (pending access is shown as done), `continuedSteps` at line 40, `status()` at line 57, `continueSetup()` at line 70 (access done, pending steps skipped, `complete` true), `setStep()` at line 85 (one step; `complete` untouched), `preferences()` at line 101. `setup-session.controller.ts`: the identity route at lines 101 to 116. `setup-auth.guard.ts` lines 58 to 63: 401 for a non-public route without a verified cookie. FACT.
- **F9 Contract.** `packages/contracts/src/setup-auth/routes.ts`: `SETUP_STATUS_ROUTE` line 4, `SETUP_CONTINUE_ROUTE` line 5, `SETUP_STEP_ROUTE` line 7 (with `:step`). `status.ts`: `SETUP_STEP_KEYS` line 4, `composeVersionStatusSchema` line 27, `setupStatusSchema` line 34, `stepUpdateSchema` line 41, types lines 45 to 49. `examples.ts`: `identityLoopback`, `setupStatus` (compose `unknown`), `composeOk`, `composeMismatch`, `composeUnknown`. FACT.
- **F10 Fake API.** `apps/web/src/app/shell/testing/test-doubles.ts`: `FakeApiClient` at line 43; `respond` at lines 49 to 51 (a later call replaces the earlier one); `fail` at lines 54 to 56; `get` at line 58; `post` at line 73; an unregistered path throws "No canned response" (line 92); matching is by method and exact path. `api-client.ts` line 13: `ApiPath = \`/${string}\``. `shell/index.ts` exports `API_CLIENT` (line 3) and `ApiError` (line 5). `shell/testing/match-media.ts`: `stubMatchMedia` at line 67. FACT.
- **F11 E2E setup.** `e2e/specs/setup-phone.e2e.ts` (191 lines): constants at lines 12 and 13; `continueButton` at lines 43 to 45; C2 title at line 47; state 1 count check at line 79; state 2 at line 83, visible check at 98, `app-setup-page code` count check at line 99; state 3a at line 103, visible at 112; state 3b count at 125; 3c count at 136; 4a count at 151; 4b at line 155, its `CONTINUE_ROUTE` handler at line 158, visible at 172, click at 174, enabled at 186. `expectPhoneLayout` at lines 15 to 41 uses `app-setup-page :is(h2, p, code, button)`, `getByRole('heading', {name: 'Scriba'})` and "This page needs a larger screen". `e2e/specs/journey.e2e.ts`: heading check at line 19; setup step at line 35; the comment and the click at lines 56 and 57; the landing check from line 58. FACT.
- **F12 E2E environment.** `e2e/harness/global-setup.ts`, `startApi` env (lines 77 to 82): `PATH`, `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR` only, with no `SCRIBA_COMPOSE_VERSION`, so the status's `compose` is `unknown` in the e2e (the unset case of `plans/SAU-10.md`). `e2e/playwright.config.ts`: `workers: 1`, `testMatch: '**/*.e2e.ts'`. The e2e specs are `journey`, `phone-toolbar`, `projects-phone` and `setup-phone`. FACT.
- **F13 One-liner.** `scripts/entrypoint.sh` line 20: `# Run it with: docker run --rm -e SETUP=true bbartolome/scriba | bash`. FACT.
- **F14 Decisions.** `plans/DECISIONS.md` line 2925 (the SAU-06 review item about `pathMatch` and SAU-11); lines 4125 to 4130 (the Navigator decision on the compose warning in SAU-11); lines 4138 to 4142 (the unit change, commit ba39540). FACT.
- **F15 Module and README.** `modules/setup-auth.md` "Testing principles", lines 64 to 69. `units/README.md` line 129 (reads never mutate) and line 136 (testing: external behaviour only; UI tests against the fake API). FACT.
- **F16 Downstream text.** The acceptance criteria of `units/SAU-16-setup-flow-gate.md` (the skip, re-run and compose criteria); `plans/MPR-08.md` line 158 ("press Continue") and lines 29, 30 and 253 (journey lines 72 and 73); `plans/PST-14.md` step 10, line 87 (whole-branch e2e). FACT.
- **F17 SAU-18.** `units/SAU-18-tailnet-guard-path.md`, criterion 1: API calls succeed with no cookie on the tailnet Host. FACT.
- **F18 Git state.** The working tree was clean. `git log` shows `7592c1b`, then `d787da3`, `0536ca2` and `e46b9bd`; `git diff --name-only 7592c1b e46b9bd` lists only `plans/AGL-10.md` and `plans/PST-14.md`. FACT.

## 8. Assumed (not checked here)

- **A1.** Chromium is available for the Playwright run (`SCRIBA_E2E_CHROMIUM` or the cached build). Step 15 records it.
- **A2.** Playwright runs the spec files in name order with one worker, so journey runs before setup-phone. C3 does not depend on that order (section 4), and C2's state 1 needs a fresh context, which Playwright gives each test.
- **A3.** The web Vitest suite (`ng test`) can create a `SetupPage` with `TestBed.createComponent` in the same test as a `RouterTestingHarness`. If it cannot, the implementer stops and reports (section 3).
- **A4.** The current `ng build` prints CommonJS warnings for the contract (the baseline of step 1), and the new files add none, because they import no values from the contract.
- **A5.** The handshake token is reusable (`modules/setup-auth.md`, "Settled decisions"), so C3 can open the setup URL in its own fresh context.
- **A6.** The label "Skip the rest" is unique on each page, so the `exact` name matches one button.

## 9. Review parts

Two parts. Each step of section 3 and each test of section 4 is in exactly one part. Review part 1 before part 2: part 1 needs no browser; part 2 needs Chromium.

- **Part 1: the wizard, in Vitest.** Steps 0 to 12. Tests: W1 (criterion 1), L1 (criterion 2, `landing.spec.ts` C1), W2 (criterion 4), the regression tests of `setup-page.spec.ts` (C1a loopback, C1a tailnet, C1b, C1c, C1d (two), X1, X2, X3, X4) and `setup-contract.spec.ts` (X5), and the landing test E1.
- **Part 2: the phone and the journey, in Playwright.** Steps 13 to 18. Tests: C2 (states 1 to 4b, updated), C3 (criterion 3), the journey's setup step and its other steps, `projects-phone` and `phone-toolbar`.

Each part ends with its commit: part 1 at step 12 (its red commit is step 2), part 2 at step 18.
