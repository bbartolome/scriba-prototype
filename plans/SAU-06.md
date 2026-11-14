---
id: SAU-06
status: draft
---

# SAU-06 plan — minimal /setup page and the sign-in notice

Setup & auth, phase:token-guard, M1, main track. Unit `units/SAU-06-minimal-setup-page.md`. Revision 1 (draft, for Opus). Base: main at `fe4407b` (`git rev-parse --short HEAD`); `git status --short -- ':!plans'` printed nothing when this plan was written. The blockers are done: SAU-05 (`plans/SAU-05.md` front matter line 3, `status: done`; `git log --oneline --grep='feat(SAU-05)' main` shows `efb1f80`) and SHL-09 (`plans/SHL-09.md` line 3, `status: done`). This plan was written from the local checkout only. Nothing was built, installed, tested, committed or pushed while writing it. The only file written is this one, left untracked.

Tags: FACT means checked by the planner in section 7a. ASSUMED means a choice or an unchecked belief, listed in section 7b.

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module and DECISIONS

1. **Route and owner.** `/setup` is an app-level route owned by Setup & auth, minimum device class `phone`, with no nav entry. Source: unit line 15; `modules/shell.md` line 51 (the `/setup` row: `Setup & auth | app | phone | no`); `modules/setup-auth.md` line 40 (`/setup` has no nav entry). FACT.
2. **Feature folder.** `apps/web/src/app/features/setup-auth/` holds a lazy `Routes` array. Source: unit line 15; `modules/setup-auth.md` line 40; `modules/shell.md` line 42 (feature UIs live in `features/<m>/`); `units/README.md` line 125 (module shape). FACT.
3. **Page content.** The page shows the current identity and "you're in", and a **Continue** button that POSTs. Source: unit line 16. FACT.
4. **Continue completes setup.** Continue is a command, so it is a POST to `SETUP_CONTINUE_ROUTE` (`/api/setup-auth/continue`), which completes setup (SAU-05) and then navigates into the app. Source: unit line 16; `units/README.md` line 126 ("every command is a `POST`"); `packages/contracts/src/setup-auth/routes.ts` line 5; `apps/api/src/modules/setup-auth/setup-status.controller.ts` lines 28 to 34 (the POST, 200, status body); `plans/SAU-05.md` items 8 and 9. FACT.
5. **401s come here.** The Shell's API client sends a 401 to `/setup`, and the page shows the sign-in notice for it. Source: unit line 17; `modules/setup-auth.md` line 42; `modules/shell.md` line 72. The code path exists: `apps/web/src/app/shell/api-client.ts` lines 104 to 106. FACT.
6. **Loopback notice.** On loopback the notice explains how to get in with the command `cat ~/Books/.scriba/setup-url` and with `docker compose logs scriba`. Source: unit line 17; the same recovery step in `units/SAU-15-settings-page.md` line 19. FACT.
7. **Tailnet notice.** On the tailnet the notice explains identity and allowlist failures by error code. Source: unit line 17; the contract codes `AUTH_TAILNET_IDENTITY_MISSING` and `AUTH_TAILNET_NOT_ALLOWED` in `packages/contracts/src/setup-auth/errors.ts` lines 7 and 8. FACT.
8. **Identity is for display only.** The page displays it, and nothing partitions data by it. Source: `modules/setup-auth.md` line 44; `packages/contracts/src/setup-auth/identity.ts` lines 3 and 4. FACT.
9. **No SSE.** This module publishes no SSE events, so the page reads and does not subscribe. Source: `modules/setup-auth.md` line 43. FACT.
10. **Test seams.** UI tests render lazy routes with Angular's Vitest runner, against a fake API client built from the `/setup-auth` contract types. Vitest everywhere. External behaviour only. Source: `modules/setup-auth.md` lines 65, 68 and 69; `units/README.md` line 133. FACT.
11. **Error codes.** The codes of this module carry the `AUTH_` or `SETUP_` prefix. Source: `packages/contracts/src/setup-auth/errors.ts` lines 1 and 2; `units/README.md` line 127. FACT.
12. **Downstream.** SAU-08, SAU-11 and SAU-15 each list SAU-06 in `blocked_by`. Source: `units/SAU-08-token-guard-gate.md` line 7; `units/SAU-11-wizard-shell-routing.md` line 7; `units/SAU-15-settings-page.md` line 7. FACT.
13. **The Shell ships no runtime zod.** Shell contract values come from type-only imports or from a dynamic import. The DECISIONS entry names the Shell only. Source: `plans/DECISIONS.md` lines 1084 to 1089; `plans/SHL-08.md` line 20 (decision 3); `units/SHL-08-active-project-landing.md` line 19. For the `/setup` feature the route is not settled. It is open point 1.

### 1b. Small decisions this plan makes

1. **Files and names.** Section 2 lists them. The names follow the module shape (`units/README.md` line 125) and the boundaries lint, whose entry files are `features/*/*.routes.ts` (`eslint.config.mjs` line 41). Reason: the existing layout; no other choice is named.
2. **Route entry.** The entry copies the `core-gate` entry (`apps/web/src/app/app.routes.ts` lines 37 to 49): `path: 'setup'`, `pathMatch: 'full'`, `data: { scope: 'app', minDeviceClass: 'phone' } satisfies ShellRouteData` (no `nav`), `loadChildren` to `setupAuthRoutes`, and one child `{ path: '', pathMatch: 'full', component: SetupPage }`. It goes after `core-gate` and before the `**` entry (line 50). Reason: `minDeviceClass` must be written, because an absent value means `tablet` (`apps/web/src/app/shell/route-data.ts` lines 12 to 13; `device-class.ts` line 162). The `core-gate` pattern is the working precedent.
3. **Page states.**
   - Loading: no identity block yet.
   - Identity 200: the identity text, "You're in.", and the Continue button.
   - A 401 (any 401): the sign-in notice only. The identity block and Continue are hidden. Reason: a POST without a session is refused with 401 (`apps/api/src/modules/setup-auth/setup-auth.guard.ts` lines 58 to 63), so the page should not offer it.
   - A 403 with a tailnet code: the explanation in place of the identity text.
   - Any other error: its message in a `role="alert"` paragraph (the landing's pattern, `apps/web/src/app/shell/landing.ts` lines 21 to 23), and the Continue button stays.
   Reason: the unit does not name these states.
4. **Identity and button texts.** Heading "Setup" (h2). Loopback identity: "Signed in from this computer (loopback)." Tailnet identity: "Signed in over the tailnet as <login>." Then "You're in." and a button "Continue". Reason: the unit fixes the content but not the wording. The author may change the wording (open point 7).
5. **Continue request and result.** The body is `{}`, because `ApiClient.post` takes a body (`apps/web/src/app/shell/api-client.ts` lines 30 to 34), and the server reads none (`setup-status.controller.ts` lines 29 to 33). The response is parsed with `setupStatusSchema` (`packages/contracts/src/setup-auth/status.ts` lines 34 to 38). On success the page calls `navigateByUrl(LANDING_PATH, { replaceUrl: true })`. Reason: `routes.ts` lines 20 to 22 name `LANDING_PATH` as the target after setup, and the landing then picks the active project (`landing.ts` lines 51 to 53 and 63 to 72). `replaceUrl` follows the landing's convention (`landing.ts` line 54). The button is disabled while the POST is in flight, so one click sends one POST.
6. **The command text.** One constant, `SIGN_IN_COMMAND = 'cat ~/Books/.scriba/setup-url'`, shown in a `<code>` element with that exact text. The docker line is `docker compose logs scriba`. Reason: the unit's wording (line 17). The service name is `scriba` (`deploy/compose.yaml` line 39), and the URL is printed on stdout at each start (`apps/api/src/modules/setup-auth/setup-token.store.ts` line 109), so the docker logs show it.
7. **Heading rule.** No heading on the page or in the notice may contain the word "Scriba". Reason: `e2e/specs/journey.e2e.ts` line 18 finds the heading "Scriba" by a case-insensitive substring match (`node_modules/playwright-core/types/types.d.ts` lines 3277 and 3278), and the App's toolbar already has the one heading `<h1>Scriba</h1>` (`apps/web/src/app/app.html` line 2). A second match would make that locator fail in strict mode.
8. **Tailnet explanations.** Two codes get an explanation: `AUTH_TAILNET_IDENTITY_MISSING` and `AUTH_TAILNET_NOT_ALLOWED`. Their texts are: "Scriba did not get your Tailscale identity. Open Scriba through its tailnet address, with Tailscale Serve running." and "This Tailscale login is not on the owner's allowlist. Use the computer that runs Scriba and its setup link to change the allowlist." Reason: the unit's "identity and allowlist failures" (line 17). The set itself is open point 5.
9. **Component test structure.** Criterion C1 is one `describe('C1 …')` with four `it`s, C1a to C1d, because each part needs its own fake response. The criterion passes when all four pass. Canned data comes from `SETUP_AUTH_EXAMPLES` (`packages/contracts/src/setup-auth/examples.ts` lines 10 to 12 and line 28), which the contract declares as "for the contract tests and for fake API clients" (line 1).
10. **Component test viewport.** The component spec calls `stubMatchMedia(390, 844)` in `beforeEach` and `restoreMatchMedia()` in `afterEach` (`apps/web/src/app/shell/testing/match-media.ts` lines 67 and 99). Reason: the `/setup` route's `canMatch` injects `DeviceClassService` (`device-class.ts` lines 128 to 131), which reads the breakpoints. The 390 by 844 size is the Shell's phone size (`plans/SHL-05.md` line 49). The stub is the only phone size that the component spec sets. The real-viewport check is C2 (open point 3).
11. **E2E shape (C2).** One test in a new spec at 390 by 844 (`test.use({ viewport })`). It covers two states: a fresh browser context shows the notice, and after the setup link is opened the identity, "You're in." and Continue render. It does not click Continue, because the e2e run shares one temp library (`e2e/harness/global-setup.ts` lines 23 to 25), so a Continue would change `setupAuth.complete` for the rest of the run. The test reads `setup-url` from `process.env.SCRIBA_E2E_LIBRARY` (set at `global-setup.ts` line 25; read the same way at `journey.e2e.ts` lines 28 and 33). Its checks are: no horizontal overflow, the Continue button inside the viewport, and no page errors (the `pageerror` listener of `journey.e2e.ts` lines 15 to 19).
12. **No other change.** No API change (SAU-03 and SAU-05 provide the endpoints). No contract change. No Shell change: the 401 path (`api-client.ts` lines 104 to 106) and the SSE 401 path (`apps/web/src/app/shell/sse-client.ts` lines 214 to 216) already reach `/setup`.
13. **Branch and commits.** The driver creates `unit/SAU-06` from main after the plan is approved (prompt.md step 6, lines 93 to 105). The implementer commits to that branch only, with the prefixes `test(SAU-06)`, `feat(SAU-06)`. The docs commit `docs(SAU-06)` is made by the driver on the batch branch (prompt.md step 8, lines 121 to 131).

## 2. Files to create or change

Paths are under `/Users/bbartolome/workspace/scriba-prototype/`. `features/setup-auth/` means `apps/web/src/app/features/setup-auth/`.

| Path | Change | Purpose | Shared with |
|---|---|---|---|
| `apps/web/src/app/features/setup-auth/setup-auth.routes.ts` | new | Exports `setupAuthRoutes: Routes = [{ path: '', pathMatch: 'full', component: SetupPage }]`. It is the lazy entry file (boundaries entry, `eslint.config.mjs` line 41) | SAU-11, SAU-15 and SAU-20 add their children here (their plans decide) |
| `features/setup-auth/setup-page.ts` | new | `SetupPage`, standalone component. Reads identity on load (`IDENTITY_ROUTE`); shows the identity text, "You're in.", the Continue button (POST `SETUP_CONTINUE_ROUTE`, body `{}`), the notice, the tailnet explanations and the error line (decisions 1b-3 to 1b-5). Injects `API_CLIENT` from the Shell entry (`apps/web/src/app/shell/index.ts` line 3) | SAU-11 replaces its Continue (`units/SAU-11-wizard-shell-routing.md` line 19) |
| `features/setup-auth/sign-in-notice.ts` | new | `SignInNotice` component, `SIGN_IN_COMMAND` (`cat ~/Books/.scriba/setup-url`) and the explanation texts keyed by the two tailnet codes (decisions 1b-6 and 1b-8) | SAU-11 (wizard) may reuse it; SAU-15 recovery text repeats the same command |
| `features/setup-auth/setup-contract.ts` | new | `loadSetupAuthContract()`: one dynamic `import('@bbartolome/scriba-contracts/setup-auth')`, typed with `Pick<typeof import(...), 'IDENTITY_ROUTE' \| 'identitySchema' \| 'SETUP_CONTINUE_ROUTE' \| 'setupStatusSchema' \| 'LANDING_PATH' \| 'SETUP_AUTH_ERROR_CODES'>`. This is the provisional route of open point 1 (option a). If the Navigator picks another option, only this file and the build step change | none |
| `features/setup-auth/setup-page.spec.ts` | new | Criterion C1 (`describe` with C1a to C1d) and extra tests X1 to X3 (section 4). Uses `createShellTestDoubles()` (`apps/web/src/app/shell/testing/test-doubles.ts` lines 187 to 199), `RouterTestingHarness` and `provideRouter(APP_ROUTES)`, as `landing.spec.ts` does | none |
| `e2e/specs/setup-phone.e2e.ts` | new | Criterion C2: the real-viewport check at 390 by 844 (decision 1b-11, open point 4) | none. `journey.e2e.ts` is SAU-08's file |
| `apps/web/src/app/app.routes.ts` | edit | One route entry after the `core-gate` entry (lines 37 to 49) and before the `**` entry (line 50). The type import of `ShellRouteData` (line 5) is already there. No other entry changes | Every feature adds entries here; the union is what counts |

### Files that must not change

- `apps/api/**` (the endpoints of SAU-03 and SAU-05 are used as they are).
- `packages/contracts/**`.
- `apps/web/src/app/shell/**`, including `api-client.ts`, `index.ts`, `tokens.ts`, `sse-client.ts` and `testing/**`.
- `apps/web/src/app/app.config.ts`, `apps/web/src/app/app.routes.spec.ts`, `apps/web/angular.json`, `apps/web/package.json`.
- `eslint.config.mjs`, `package.json`, `package-lock.json`, `tsconfig*.json`.
- `e2e/playwright.config.ts`, `e2e/harness/**`, `e2e/specs/journey.e2e.ts` (SAU-08 turns its setup step on, `journey.e2e.ts` lines 33 and 34).
- `modules/**`, `units/**`, `prompt.md`, `plans/DECISIONS.md` (the driver and the Navigator write those).
- `deploy/**`, `Dockerfile`, `scripts/**`.

## 3. Method

Run every command from `/Users/bbartolome/workspace/scriba-prototype`. Record `node -v` and `npm -v` beside the first result. Node is v26.13.0 and npm is 11.20.0 at the planner's check (`node -v`, `npm -v`).

0. **Preconditions.**
   - `git branch --show-current`: expected `main`. `git status --short -- ':!plans' ':!units'`: expected no output.
   - `git diff --stat fe4407b HEAD -- apps/web e2e packages apps/api modules units`: expected no output. If it prints anything, the citations of section 7a must be checked again before writing code.
   - `ls -d node_modules/@angular/build node_modules/@playwright/test node_modules/jsdom`: expected three paths. If one is missing, run `npm ci` once and record its exit code.
   - `ls ~/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome`: expected the file. It is the build that `e2e` uses by default (`node_modules/playwright-core/browsers.json` lines 5 and 6).
1. **Baseline.** `npm test -w @bbartolome/scriba-web`: expected exit 0. Record `Test Files` and `Tests` as the baseline. `npm run build -w @bbartolome/scriba-web 2>&1 | grep -ci commonjs`: record the count. The last recorded count is 2 (`plans/DECISIONS.md` line 2702). If the baseline run fails, stop and report: main is not green.
2. **Red: write the tests first.** Create `features/setup-auth/setup-page.spec.ts` with C1a to C1d and X1 to X3 (section 4), and `e2e/specs/setup-phone.e2e.ts` with C2.
   - Run `npm test -w @bbartolome/scriba-web -- --include src/app/features/setup-auth/setup-page.spec.ts`. Expected: exit non-zero. The `--include` form is the one in `plans/SHL-03.md` line 88.
   - Run `npm run e2e -w @bbartolome/scriba-e2e -- setup-phone`. Expected: exit non-zero, and the page at `/setup` shows "Page not found" (`apps/web/src/app/shell/not-found.ts` line 8), because the route is still the `**` entry (`app.routes.ts` line 50).
   - Commit: `test(SAU-06): add the setup page component tests and the phone e2e check (red)`.
3. **Green: the component.** Write `setup-contract.ts`, `sign-in-notice.ts`, `setup-page.ts` and `setup-auth.routes.ts`. Edit `app.routes.ts` (decision 1b-2).
   - `npm test -w @bbartolome/scriba-web -- --include src/app/features/setup-auth/setup-page.spec.ts`: expected exit 0, with C1a to C1d and X1 to X3 passing.
   - `npm test -w @bbartolome/scriba-web`: expected exit 0 and `Tests` equal to the baseline plus 7. The landing spec (`landing.spec.ts` C1, line 68) still passes, because `/setup` now renders the page: its check is only the URL (section 5, row SHL-08).
4. **Types and lint.** `npx tsc --noEmit -p apps/web/tsconfig.spec.json` and `npx tsc --noEmit -p apps/web/tsconfig.app.json`: expected exit 0 for both. `npm run lint -w @bbartolome/scriba-web`: expected exit 0, with no `boundaries/dependencies` error. `npx prettier --check apps/web/src/app e2e/specs`: expected `All matched files use Prettier code style!`.
5. **Build.** `npm run build -w @bbartolome/scriba-web`: expected exit 0. `npm run build -w @bbartolome/scriba-web 2>&1 | grep -ci commonjs`: expected the baseline count (section 7b, A4). Record the `Initial total` line too. It must not grow by more than the page code.
6. **Green: the e2e.** `npm run e2e -w @bbartolome/scriba-e2e -- setup-phone`: expected exit 0, with C2 passing. Then `npm run e2e -w @bbartolome/scriba-e2e`: expected exit 0, with the journey's "app loads" step passing (the heading rule of decision 1b-7 is checked here).
7. **Commit the code.** `feat(SAU-06): add the /setup page, the sign-in notice and the route`. The commit touches only the files of section 2.
8. **Mutations.** One at a time, each reverted with `git checkout -- <file>` before the next. Each row names the test that must fail.
   - M1: Continue does not navigate. Expected: C1b fails.
   - M2: Continue sends a GET, or a different path. Expected: C1b fails (`doubles.api.requests`).
   - M3: a 401 shows the server's message in the error line instead of the notice. Expected: C1c fails.
   - M4: `SIGN_IN_COMMAND` reads `cat ~/.scriba/setup-url`. Expected: C1c fails (exact text).
   - M5: the tailnet codes show the server message, not the explanation. Expected: C1d fails.
   - M6: the identity block is not rendered. Expected: C1a fails.
   - M7: the route entry drops `minDeviceClass: 'phone'`, so the default `tablet` applies. Expected: C2 fails (the "larger screen" page shows at 390 by 844; the gate in `device-class.ts` lines 150 and 162).
   - M8: `.setup-page { min-width: 600px }` in the page's styles. Expected: C2 fails (horizontal overflow).
   - M9: a heading on the page reads "Set up Scriba". Expected: the full e2e run of step 6 fails in the journey's "app loads" step (strict mode).
9. **Root gates.** `npm run build`: expected exit 0 (it builds the e2e types too). `npm test`: expected exit 0. `npm run lint`: expected exit 0.
10. **Status.** `git status --short -- ':!plans' ':!units'`: expected no output on `unit/SAU-06` after the commits. The docs commit is the driver's (decision 1b-13).

## 4. Acceptance criteria tests

The unit has two criteria, numbered as in the unit (lines 20 and 21). Both run locally: no tailnet, Docker, git remote or credential is needed. Criterion C2 uses the real API and the real build, which the e2e harness starts (`e2e/harness/global-setup.ts` lines 19 to 21 and 60 to 72).

A criterion is ticked only after its test is seen to pass (`prompt.md` line 154). The driver ticks C1 and C2 in the docs commit, and only when the runs of section 3 steps 3 and 6 pass.

**Criterion C1** (unit line 20): "Component tests (fake API): identity shown; Continue posts and navigates; a 401 shows the loopback sign-in notice with the command; tailnet error codes show their explanations."
- Test: `apps/web/src/app/features/setup-auth/setup-page.spec.ts`, `describe('C1 setup page with the fake API')`, with four `it`s. Seam: `RouterTestingHarness.create('/setup')` under `provideRouter(APP_ROUTES)` and `createShellTestDoubles()`; `stubMatchMedia(390, 844)` in `beforeEach` (decision 1b-10).
  - C1a identity: `respond('GET', IDENTITY_ROUTE, identityLoopback)` shows "Signed in from this computer (loopback)." and "You're in."; a second render with `identityTailnet` shows "ada@example.com".
  - C1b Continue: after identity 200, `respond('POST', SETUP_CONTINUE_ROUTE, { ...setupStatus, complete: true })`, then a click on "Continue". Expected: `doubles.api.requests` contains `{ method: 'POST', path: SETUP_CONTINUE_ROUTE, body: {} }`, and the router URL ends at `/projects/a/chat`. The landing reads are canned too: `VERSION_ROUTE`, `HEALTHZ_ROUTE`, `SETUP_STATUS_ROUTE` (complete), and `ACTIVE_PROJECT_ROUTE` (`{ active: 'a' }`), as in `landing.spec.ts` lines 48 to 55 and 63 to 75.
  - C1c 401: `fail('GET', IDENTITY_ROUTE, new ApiError(401, 'AUTH_REQUIRED', 'Not signed in.'))`. Expected: the `<code>` element's text is exactly `cat ~/Books/.scriba/setup-url`; the text `docker compose logs scriba` is present; there is no button "Continue" and no "You're in.".
  - C1d tailnet codes: `fail` with `ApiError(403, 'AUTH_TAILNET_IDENTITY_MISSING', …)`, then with `ApiError(403, 'AUTH_TAILNET_NOT_ALLOWED', …)`. Expected: each shows its explanation text of decision 1b-8, and not the server's message.
- Mutations covered: M1, M2 (C1b); M3, M4 (C1c); M5 (C1d); M6 (C1a).

**Criterion C2** (unit line 21): "Phone viewport renders all of it."
- Test: `e2e/specs/setup-phone.e2e.ts`, one test, `test.use({ viewport: { width: 390, height: 844 } })`. Name: `C2 the setup page renders at 390 by 844: the notice without a session, then identity and Continue with one`.
- Seam: a real Chromium at a real viewport, the production build and the API on 8080 with a temp library (the harness). Playwright 1.65 should find the cached Chromium 1254 (`node_modules/playwright-core/browsers.json` lines 5 and 6; ASSUMED, A7). `SCRIBA_E2E_CHROMIUM` is optional.
- Steps: (1) `page.goto('/setup')` in a fresh context. Expected: `getByText('cat ~/Books/.scriba/setup-url', { exact: true })` is visible, and its box lies inside 390 by 844. (2) Read `${SCRIBA_E2E_LIBRARY}/.scriba/setup-url`, `page.goto` that URL (the handshake sets the cookie and redirects, `apps/api/src/modules/setup-auth/setup-session.controller.ts` lines 85 to 97), then `page.goto('/setup')`. Expected: "You're in." is visible; the Continue button is visible and its box lies inside the viewport; `document.documentElement.scrollWidth` is at most `window.innerWidth`. (3) `pageerror` events are `[]`.
- Mutations covered: M7, M8. The C2 test is not a substitute for the component test: it checks layout, C1 checks behaviour.
- Command: `npm run e2e -w @bbartolome/scriba-e2e -- setup-phone`.

**Extra tests (not criteria; each is its own item).** Each is in `setup-page.spec.ts`.
- X1: a Continue that fails with `ApiError(500, CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE, …)` keeps the page on `/setup`, shows the message in a `role="alert"` element, and leaves the Continue button enabled. Reason: decision 1b-3 (`api-error.ts` line 6 gives the code).
- X2: a 403 with `AUTH_HOST_REJECTED` (`host-frame.middleware.ts` lines 34 to 39 produce it) shows its server message and no explanation. Reason: decision 1b-8 (only the two codes get an explanation).
- X3: route registration: `APP_ROUTES` has an entry with `path === 'setup'`, `data.minDeviceClass === 'phone'`, no `data.nav`, and a `loadChildren`. Reason: decision 1b-2 (the nav is built from `data.nav`, `apps/web/src/app/shell/app-nav.ts` lines 36 to 46 and 66 to 70).

## 5. Agreement with downstream units

| Unit | Needs from SAU-06 | Provided by this plan |
|---|---|---|
| SAU-08 (token-guard gate, `units/SAU-08-token-guard-gate.md`) | `/setup` reachable after the setup link (its demo, line 33: "land on `/setup` with a clean address bar"); the e2e setup step (line 17) is its own | Yes. The handshake redirects to `SETUP_PAGE_PATH` (`routes.ts` line 21) and the route renders. C2 does not click Continue, so SAU-08's step still starts with an incomplete library. Open point 6 |
| SAU-11 (wizard, `units/SAU-11-wizard-shell-routing.md`) | Replaces this page's Continue with the wizard's completion (line 19); keeps the "skip the rest" path; phone check (line 24) | Yes. The route is in `setupAuthRoutes` (SAU-11 adds children there). `SignInNotice` is exported and may be reused. The Continue handler is in `setup-page.ts`, so it can be replaced without touching the route |
| SAU-15 (settings, `units/SAU-15-settings-page.md`) | `/setup` exists and is a route target of "re-run setup" (line 26); the same recovery command (lines 18 to 22) | Yes. The command constant is in `sign-in-notice.ts` |
| SAU-18 (tailnet guard path) | The tailnet answers of identity and the codes of decision 1b-8 (open points 2 and 5) | Not in this unit. The hand-off is open point 2 |
| SAU-20 (Tailscale UI in `/setup`, `units/SAU-20-tailscale-ui.md` line 7) | A place on the page for a new section | Yes. The page is a plain component, and SAU-20 adds a section to it |
| SHL-08 (landing, `units/SHL-08-active-project-landing.md`) | `/setup` as the redirect target when setup is incomplete (`landing.ts` line 54) | Yes. `landing.spec.ts` C1 (line 68) checks only the URL, so it still passes. Verified by the full web run in section 3, step 3 |
| SHL-09 (core gate, `units/SHL-09-core-gate.md` line 21) | Platform's Playwright e2e still passes, its first step loads the Shell | Checked by section 3, step 6 (the full e2e run) |
| PLT-13 (e2e harness, `units/PLT-13-playwright-harness-e2e.md` lines 22 and 23) | "One e2e test with five named steps"; owners turn steps on in the journey | Conflict, open point 4. C2 is a second spec; the journey is unchanged |

## 6. Open points

1. **The route for setup-auth values in the `/setup` feature (for the Navigator).** Every value of `@bbartolome/scriba-contracts/setup-auth` loads zod's CommonJS build, because the barrel `index.ts` line 5 re-exports `routes.ts`, which imports zod (`routes.ts` line 1). The DECISIONS entry of 2026-11-13 (lines 1084 to 1089) and SHL-08 decision 3 settle the route for the Shell only. For this feature the options are:
   - (a) A dynamic import in the feature (`setup-contract.ts`), the same mechanism as `contract-chunks.ts`. Cost: a second dynamic import of the same module, which shares the chunk, so the CommonJS warning count should stay at the baseline (ASSUMED, A4). **This plan's provisional choice,** until the Navigator answers.
   - (b) A static import. Zod enters the `/setup` lazy chunk, and the CommonJS warnings can grow. The initial bundle is not affected, because the route is lazy.
   - (c) A dedicated build configuration with `allowedCommonJsDependencies`, as `contracts-boot` has (`apps/web/angular.json` lines 51 to 56). Removes the warnings. It changes `angular.json`, which is not in this unit's list, and DECISIONS line 1088 names it as an option.
   - (d) Hand-written guards with a parity spec, the mechanism of DECISIONS lines 1086 to 1087. SAU-01 open point 3 (`plans/SAU-01.md` line 144) rejects copied constants, but only for the Shell, through SHL-08.
   If the Navigator picks (b), (c) or (d), only `setup-contract.ts`, its import and the build step change. The tests do not change.
2. **A tailnet caller's 401 (for the Navigator).** The unit (line 17) and criterion C1c (line 20) say a 401 shows the loopback notice. The identity route answers 401 `AUTH_REQUIRED` for any Host that is not loopback, not only for a missing cookie (`setup-session.controller.ts` lines 110 to 116). So a tailnet browser would see the loopback command. Options:
   - (a) Follow the criterion literally: any 401 shows the loopback text. This is the plan's default. Until SAU-18 changes the tailnet answer, a tailnet caller sees the loopback text.
   - (b) Choose the notice by the page's host: `location.hostname` in `127.0.0.1`, `localhost` or `[::1]` gets the loopback text, and any other host gets a tailnet text for a 401. Adds a text the unit does not name.
   - (c) Have the identity route answer a tailnet caller with a tailnet code (for example `AUTH_TAILNET_IDENTITY_MISSING`, 403). That changes SAU-03's route, which is outside this unit.
   Note: the tailnet codes are not produced by any route at this commit (grep of `apps/api/src`: none). SAU-18 is the producer.
3. **The real-viewport check (for the coordinator or the Navigator).** The unit says "Phone viewport renders all of it" (line 21). The coordinator's rule for this plan says the phone check must use a real viewport in the component test or the e2e. The component test cannot have one: the Angular unit-test builder runs on jsdom or happy-dom (`node_modules/@angular/build/src/builders/unit-test/runners/vitest/index.js` line 43), and `apps/web/angular.json` lines 75 to 77 set no browser. So the plan uses the e2e (C2). Options: (a) the e2e only (this plan); (b) the component stub only (`stubMatchMedia(390, 844)`, which is what SHL-05 used, `plans/SHL-05.md` lines 49 and 200); (c) both. Confirm that the coordinator's rule means the e2e.
4. **Placement of the phone e2e (for the coordinator or the Navigator).** `units/PLT-13-playwright-harness-e2e.md` line 22 says the e2e is "One e2e test with five named steps", and line 23 says owners turn steps on inside it. A new spec file, `setup-phone.e2e.ts`, is a second e2e test. Options: (a) a new spec file (this plan, which leaves the journey's five pending steps as they are, PLT-13 criterion line 32); (b) a test in `journey.e2e.ts`, which collides with SAU-08's setup step (`journey.e2e.ts` lines 33 and 34); (c) a Playwright script run from outside the repo, as SHL-05 did (`plans/SHL-05.md` step 12, line 124), which leaves no committed test. Decide before code.
5. **Which codes get a tailnet explanation (for the Navigator).** The unit says "identity and allowlist failures by error code" (line 17). The contract has `AUTH_TAILNET_IDENTITY_MISSING` and `AUTH_TAILNET_NOT_ALLOWED` (`errors.ts` lines 7 and 8). Options: (a) those two (this plan's default); (b) also `AUTH_HOST_REJECTED` (`host-frame.middleware.ts` line 34, produced today) and `AUTH_ORIGIN_REJECTED` (`errors.ts` line 6); (c) also `SETUP_ALLOWLIST_LOCKOUT` (`errors.ts` line 10, SAU-19's). Each extra code adds one explanation text and one test case.
6. **The shared e2e library (for the coordinator, not blocking).** One temp library serves the whole e2e run (`global-setup.ts` lines 23 to 25). C2 leaves `setupAuth.complete` unchanged. SAU-08's setup step (`journey.e2e.ts` lines 33 and 34) is the one that completes setup. The journey runs before `setup-phone.e2e.ts` in the alphabetical order Playwright uses with one worker (`e2e/playwright.config.ts` line 13). Confirm that SAU-08 knows this. C2 works in both states.
7. **Wording (for the author, not blocking).** The texts of decisions 1b-4 and 1b-8 and the loopback paragraph of decision 1b-6 are proposals. Any wording change must keep the command text exactly `cat ~/Books/.scriba/setup-url` and the "Scriba" heading rule of decision 1b-7.

## 7. Facts checked and assumed

### 7a. Checked by the planner (reading, grep and `sed -n`; nothing was built or run)

Unit and module:
- `units/SAU-06-minimal-setup-page.md`: front matter lines 1 to 10 (`blocked_by` line 7, `unblocks` line 9); Decisions lines 14 to 17; criteria lines 19 to 21.
- `modules/setup-auth.md`: line 40 (`/setup` and `/settings`); line 42 (the Shell's API client sends 401s to `/setup`); line 43 (no SSE); line 44 (identity is display only); lines 64 to 69 (testing principles, UI seam, Vitest).
- `modules/shell.md`: line 42 (`features/<m>/`); line 51 (the `/setup` row); line 72 (the API client sends 401s to `/setup`).
- `units/README.md`: lines 59 to 65 (blocker notation); lines 123 to 133 (module shape at 125, HTTP at 126, errors at 127, testing at 133).
- `prompt.md`: line 64 (plan contents), line 65 (facts checked and assumed), lines 93 to 105 (step 6), lines 121 to 131 (step 8), line 154 (a checkbox after the test passed).
- Dependency units: `units/SAU-08-token-guard-gate.md` lines 7, 17, 28, 33 (demo); `units/SAU-11-wizard-shell-routing.md` lines 7, 17 to 19, 24; `units/SAU-15-settings-page.md` lines 7, 18 to 22, 26; `units/SAU-20-tailscale-ui.md` line 7; `units/SHL-08-active-project-landing.md` lines 16 and 19; `units/SHL-09-core-gate.md` line 21; `units/PLT-13-playwright-harness-e2e.md` lines 22, 23 and 32.
- `plans/SAU-05.md` line 3 (`status: done`); items 8 and 9 (the Continue response and what it writes). `plans/SHL-09.md` line 3 (`status: done`). `plans/SHL-05.md` line 49 (the phone size, decision 19) and line 200 (the matchMedia stub in the Vitest specs). `plans/SHL-03.md` line 88 (the `--include` form). `plans/SHL-02.md` line 91 (the CommonJS count command). `plans/SHL-08.md` line 20 (decision 3). `plans/SAU-01.md` line 144 (open point 3).
- `plans/DECISIONS.md`: lines 634 (the 564 kB zod cost), 1084 to 1089 (the zod entry), 2702 (the build record: `W1` 2, `I0` 496.03 kB).

Contracts:
- `packages/contracts/src/setup-auth/routes.ts`: line 1 (`import { z } from 'zod'`); line 5 (`SETUP_CONTINUE_ROUTE`); line 9 (`IDENTITY_ROUTE`); lines 20 to 22 (`SETUP_PAGE_PATH`, `LANDING_PATH`, the handshake's targets).
- `packages/contracts/src/setup-auth/errors.ts`: lines 1 and 2 (the prefix rule); line 4 (`AUTH_REQUIRED`); lines 6 to 8 (the host, origin and tailnet codes); line 10 (`SETUP_ALLOWLIST_LOCKOUT`); line 16 (401 for `AUTH_REQUIRED`).
- `packages/contracts/src/setup-auth/identity.ts`: lines 3 and 4 (comments); lines 5 to 8 (`identitySchema`).
- `packages/contracts/src/setup-auth/status.ts`: lines 34 to 38 (`setupStatusSchema`).
- `packages/contracts/src/setup-auth/examples.ts`: line 1 (the comment); lines 10 to 12 (`identityLoopback`, `identityTailnet`); line 28 (`setupStatus`).
- `packages/contracts/src/setup-auth/index.ts`: line 5 (`export * from './routes.js'`), lines 1 to 7 (the barrel).
- `packages/contracts/package.json` lines 10 to 13 (`./setup-auth` points at `dist/setup-auth/index.js`).
- `packages/contracts/src/platform/env.ts` line 5 (`SCRIBA_PORT` default `'8080'`); `platform/http.ts` lines 8 and 9 (`HEALTHZ_ROUTE`, `VERSION_ROUTE`).
- `packages/contracts/src/project-store/routes.ts` line 12 (`ACTIVE_PROJECT_ROUTE`).

API (read only; this unit changes none):
- `apps/api/src/modules/setup-auth/setup-status.controller.ts`: lines 22 to 26 (GET status); lines 28 to 34 (POST continue, `@HttpCode(200)` at line 30); lines 37 to 46 (`requireSession`, 401 `AUTH_REQUIRED`).
- `apps/api/src/modules/setup-auth/setup-session.controller.ts`: line 41 (the invalid-link page shows `cat ~/Books/.scriba/setup-url`); lines 67 to 99 (handshake; `Location` at lines 86 to 89; the cookie at lines 91 to 97); lines 103 to 118 (identity; lines 110 to 116 give 401 for a non-loopback Host or an invalid cookie).
- `apps/api/src/modules/setup-auth/setup-auth.guard.ts`: lines 58 to 63 (401 `AUTH_REQUIRED` for a non-public route without a valid cookie); lines 65 to 74 (Origin on mutations).
- `apps/api/src/modules/setup-auth/setup-auth.module.ts` line 25 (`controllers: [SetupSessionController, SetupStatusController]`).
- `apps/api/src/modules/setup-auth/setup-session.cookie.ts` lines 13 to 15 (`HttpOnly`, `SameSite=Strict`, `Path=/`, no `Secure`).
- `apps/api/src/modules/setup-auth/setup-cookie.signer.ts` lines 18 and 19 (`scriba_setup_<SCRIBA_PORT>`).
- `apps/api/src/modules/setup-auth/setup-token.store.ts` lines 101 and 108 (the `.scriba` folder and `setup-url`); line 109 (`process.stdout.write('Setup URL: …')`).
- `apps/api/src/modules/setup-auth/host-frame.middleware.ts` lines 34 to 39 (`AUTH_HOST_REJECTED`).
- `apps/api/src/app.module.ts` line 31 (SPA fallback), lines 39 to 45 (`ServeStaticModule` with the `/api`, `/healthz` and `/events` excludes).
- `apps/api/test/setup-auth-guard.test.ts` lines 421 to 426 (`/healthz` and `/` answer 200 without a cookie, so the static shell loads with no session).
- `deploy/compose.yaml` line 39 (`scriba:` service).
- No producer of `AUTH_TAILNET_IDENTITY_MISSING`, `AUTH_TAILNET_NOT_ALLOWED` or `SETUP_ALLOWLIST_LOCKOUT` in `apps/api/src` (grep).

Web (the Shell and the route table):
- `apps/web/src/app/app.routes.ts`: line 5 (`type ShellRouteData`); lines 13 to 16 (the comment on feature entries above `**`); line 17 (`APP_ROUTES`); lines 37 to 49 (`core-gate`); line 50 (`**`).
- `apps/web/src/app/shell/core-gate/core-gate.routes.ts` lines 4 to 6 (the lazy child `''` route).
- `apps/web/src/app/shell/route-data.ts` lines 12 to 13 (absent `minDeviceClass` means `tablet`); lines 15 to 18 (`ShellRouteData`).
- `apps/web/src/app/shell/device-class.ts` lines 128 to 131 (`deviceClassGuard` injects `DeviceClassService`); lines 148 to 150 (`withDeviceGate`); lines 162 (default `tablet`); lines 184 to 193 (`fallbackFor`).
- `apps/web/src/app/shell/app-nav.ts` lines 36 to 46 (`navItem` reads `data.nav`); lines 66 to 70 (only `scope: 'app'` routes with `nav` appear).
- `apps/web/src/app/shell/api-client.ts`: lines 17 to 21 (`ResponseSchema`); lines 24 to 35 (`ApiClient`); lines 30 to 34 (`post(path, body, schema)`); lines 104 to 106 (401 navigates to `/setup`); lines 111 to 115 (the unexpected-response error).
- `apps/web/src/app/shell/api-client.spec.ts` lines 172 to 186 (test T7: a 401 goes to `/setup`).
- `apps/web/src/app/shell/api-error.ts`: lines 6 (`CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE`); lines 10 to 27 (`ApiError` and its constructor).
- `apps/web/src/app/shell/sse-client.ts` lines 200, 214 and 215 (the status probe navigates to `/setup` on a 401).
- `apps/web/src/app/shell/index.ts` lines 3 to 5 (`API_CLIENT`, `ApiClient`, `ApiPath`, `ResponseSchema`, `ApiError`) and line 7 (`NoticesService`).
- `apps/web/src/app/shell/tokens.ts` lines 6 to 9 (`API_CLIENT`, root-provided, replaced by fakes in tests).
- `apps/web/src/app/shell/contract-chunks.ts` lines 6 to 13 (the dynamic setup-auth import).
- `apps/web/src/app/shell/landing.ts` lines 21 to 23 (the `role="alert"` pattern); lines 35 to 37 (constructor); lines 39 to 61 (`load`); line 54 (`navigateByUrl('/setup', { replaceUrl: true })`); lines 63 to 74 (the active-project target); lines 77 to 82 (`read` with `takeUntilDestroyed`).
- `apps/web/src/app/shell/landing.spec.ts` lines 11 to 14 (contract imports), 46 to 55 (`beforeEach` with the fakes), 63 to 80 (C1, which asserts `/setup` at line 68).
- `apps/web/src/app/shell/testing/test-doubles.ts`: lines 43 to 56 (`FakeApiClient`, `respond`, `fail`); lines 58 to 82 (`get` and `post` record `requests`); lines 173 to 181 (the throwing backend); lines 187 to 199 (`createShellTestDoubles`).
- `apps/web/src/app/shell/testing/match-media.ts`: lines 1 to 5 (purpose); lines 63 to 67 (`stubMatchMedia`); lines 99 to 108 (`restoreMatchMedia`).
- `apps/web/src/app/shell/not-found.ts` line 8 ("Page not found").
- `apps/web/src/app/app.html` line 2 (`<h1>Scriba</h1>`).
- `apps/web/src/app/app.config.ts` line 20 (`provideRouter(APP_ROUTES)`, with no `onSameUrlNavigation` option set).
- `apps/web/src/app/features/` holds only `.gitkeep` (this unit creates the first feature folder).
- `apps/web/src/contracts-boot.ts` lines 1 to 3 (build-time check only).
- `apps/web/angular.json` lines 32 to 37 (production budgets: initial warning 500 kB, error 1 MB); lines 51 to 56 (`contracts-boot`); lines 75 to 77 (the unit-test builder with no browser option).
- `apps/web/package.json` line 8 (`"test": "ng test --watch=false"`); line 29 (`jsdom`).
- `apps/web/tsconfig.spec.json` line 8 (`src/**/*.spec.ts`).
- `eslint.config.mjs` lines 27 to 41 (elements and entry files: `features/*/*.routes.ts`); lines 45 to 68 (rule R1).
- `node_modules/@boundaries/policies/dist/index.js` lines 1200 to 1209: a local dependency to a file that is not an element is skipped unless `checkUnknownLocals` is set (so a feature importing `shell/index.ts` is not checked by the lint).
- `node_modules/@angular/build/src/builders/unit-test/runners/vitest/index.js` line 43 (`checkAny(['jsdom', 'happy-dom'])`).
- `node_modules/@angular/cdk/fesm2022/_breakpoints-observer-chunk.mjs` line 17 (no `window.matchMedia` gives `noopMatchMedia`) and lines 71 to 78 (`noopMatchMedia` returns `matches` false for any query but `all` or empty).

E2E:
- `e2e/playwright.config.ts`: lines 10 and 11 (`testDir`, `testMatch` `**/*.e2e.ts`); line 13 (`workers: 1`); lines 19 to 26 (`use`, `baseURL` `http://127.0.0.1:8080`).
- `e2e/package.json` line 10 (`"e2e": "playwright test"`).
- `e2e/specs/journey.e2e.ts`: lines 14 to 19 (the "app loads" step and the `pageerror` listener); line 18 (`getByRole('heading', { name: 'Scriba' })`); lines 28 and 33 (`SCRIBA_E2E_LIBRARY` and the setup step); lines 33 and 34 (the setup step is pending, owner SAU-08).
- `e2e/harness/global-setup.ts`: lines 15 and 16 (`apiPort` 8080); line 21 (`buildWorkspaces()`); lines 23 to 25 (the temp library and `SCRIBA_E2E_LIBRARY`); lines 60 to 72 (`npm run build` for contracts, api and web); lines 74 to 80 (`startApi`, `SCRIBA_BOOKS_DIR: library` at line 79).
- `node_modules/playwright-core/types/types.d.ts` lines 3277 and 3278 (`getByRole` `name` matches case-insensitively and by substring by default).
- `node_modules/playwright-core/browsers.json` lines 5 and 6 (`chromium`, revision `1254`).
- `~/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome` exists (`ls -la`, 298978696 bytes).

Repository state:
- `git rev-parse --short HEAD` is `fe4407b`; `git branch --show-current` is `main`; `git status --short -- ':!plans'` is empty.
- `plans/SAU-06.md` did not exist before this plan.
- `node -v` is v26.13.0; `npm -v` is 11.20.0.

### 7b. Assumed, not checked here

- A4: The CommonJS warning count stays at the baseline (2 at `48d5999`, `plans/DECISIONS.md` line 2702) under option (a). Verified only in step 5.
- A5: `apps/web` tests run on jsdom with no `matchMedia`, so the component spec needs the stub. Consistent with `match-media.ts` lines 1 to 5 and with the CDK's noop fallback (7a), but not run.
- A6: Playwright's default `getByText(..., { exact: true })` matches the `<code>` element's full text. Not run.
- A7: The e2e harness runs in this environment (the cached Chromium exists, and the SHL-09 and PLT-13 records say the journey ran). Not re-run for this plan.
- A8: The `shell/index.ts` barrel can be imported from a feature without pulling much code into the feature's chunk (the barrel's components are standalone and tree-shaken). The build step measures it.
- A9: `RouterTestingHarness` can render `/setup` after `TestBed` has a `stubMatchMedia` set in `beforeEach`, as `device-class.spec.ts` and `device-gate.spec.ts` do (`plans/SHL-05.md` line 200 describes their `beforeEach`). Not run.
- A10: Angular's `Routes` entry with `loadChildren` and `pathMatch: 'full'` for the `setup` path behaves as the `core-gate` entry does (`app.routes.ts` lines 37 to 49). This is the precedent in the repo; not run for `setup`.
- A11: The `setup-url` file has one line, the handshake URL, which the e2e reads after `trim()` (`setup-token.store.ts` lines 71 to 74 build it; the write is at line 108).
- A12: The static shell (`/setup` on a GET without a cookie) loads, as `setup-auth-guard.test.ts` lines 421 to 426 expect. Not run in this session.

## 8. Summary of commitments

- One route `/setup` (phone, no nav) in `app.routes.ts`, lazy, under `features/setup-auth/`.
- The page shows the identity, "You're in." and a Continue that POSTs and then goes to `/`. A 401 shows the loopback notice with `cat ~/Books/.scriba/setup-url` and `docker compose logs scriba`. The two tailnet codes show their explanations.
- C1 (four `it`s in one `describe`) runs on the fake API. C2 runs in a real Chromium at 390 by 844 against the built app. Neither ticks until its run passes.
- The API and the contracts do not change. The e2e does not click Continue.
- Seven open points: 1 (route for setup-auth values, Navigator), 2 (a tailnet caller's 401, Navigator), 3 (the real-viewport rule, coordinator), 4 (the placement of the phone e2e against PLT-13, coordinator or Navigator), 5 (the tailnet codes, Navigator), 6 (the shared e2e library and SAU-08, coordinator), 7 (the wording, author).
