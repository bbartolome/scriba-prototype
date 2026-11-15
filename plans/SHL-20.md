---
id: SHL-20
status: draft
title: Toolbar fits a 390 px phone with the connection label showing
module: shell
---
# SHL-20 plan - phone toolbar fits 390 px with the connection label showing

Batch: [SHL-20] (Frontend shell, phase:phone-toolbar, M1). Revision 1, written at HEAD `3a4c72e` (`main`, clean tree). Status stays `draft`; the orchestrator sets `done` at merge (`plans/SAU-06.md` line 142 reads that line).

## 1. Decisions this plan follows

- **D1. Files.** Only the toolbar's styles and binding change, plus one new e2e spec. Source: unit Scope lines 27 and 28; unit Decisions line 22 (`app.html` changes only for the binding; no route, no API call, no contract, no change to any feature).
- **D2. Toolbar items.** Three items in order: the `Scriba` heading (the only `h1`), the connection label, the theme toggle. No wording change, no new item. Source: unit Decisions line 20; unit Scope line 29.
- **D3. Label states.** The label shows exactly when it shows now (`reconnecting` and `closed`). Its texts, its `data-state` values and its `role="status"` stay. Source: unit Decisions line 21; `apps/web/src/app/shell/connection-status.ts` lines 24, 25, 29 and 30; `connection-status.spec.ts` lines 138 to 251 assert the texts and `data-state` only (`grep -c role` on that spec prints 0).
- **D4. Label visible at phone width.** Its text is never truncated or hidden. Source: unit Decisions line 21 (last sentence).
- **D5. Phone selector from the Shell's device class.** `<mat-toolbar>` gets `[attr.data-device]="devices.deviceClass()"`; the rule selects `mat-toolbar[data-device='phone']`. No `:has()` rule, no pixel breakpoint. Source: unit Decisions line 23; `apps/web/src/app/app.html` line 6 (the same binding on `.layout`); `apps/web/src/app/app.ts` line 29 (`devices`); `apps/web/src/app/shell/device-class.ts` lines 99 and 100 (`phone` is `Breakpoints.Handset`); `modules/shell.md` line 104 ("Features declare only a class, never pixel widths").
- **D6. How it fits (chosen here).** On a phone the toolbar wraps: `flex-wrap: wrap`, `height: auto` with `min-height: 56px`, `padding-block: 8px`, `row-gap: 4px`. The label keeps its `white-space: nowrap`. Source: unit Decisions line 24 leaves the choice to this plan. Reasons, checked: Material's single-row toolbar is `nowrap` with a fixed height of 56 px below 600 px wide (`node_modules/@angular/material/fesm2022/toolbar.mjs` lines 77 to 98), and the document is 417 px wide with the single row (REPORTED, see section 6, point 2), so something must give. Wrapping lets every item keep its text and its size, so `theme-toggle.ts` does not change. This is a small choice, so it is not recorded in `plans/DECISIONS.md`.
- **D7. Test seam.** Playwright e2e at 390 by 844, in a real Chromium, against the API's build on port 8080. Source: unit Acceptance criteria line 31; `modules/shell.md` lines 88 and 90; `e2e/playwright.config.ts` lines 10, 11 and 20.
- **D8. One new spec file, one test.** `e2e/specs/phone-toolbar.e2e.ts`. Same placement as the SAU-06 phone check. Source: `plans/DECISIONS.md` lines 2867 to 2872 (SAU-06 open point 4, option (a): a new spec file with one test at 390 by 844, because PLT-13's one-e2e rule governs `journey.e2e.ts`). The file name follows the unit's name for the work.
- **D9. Page under test: `/core-gate`.** It is the Shell's own route, phone minimum, shown in the nav (`apps/web/src/app/app.routes.ts` lines 37 to 49; `modules/shell.md` line 64). Not `/`: on a fresh library `/` sends the user to `/setup` (`apps/web/src/app/shell/landing.ts` line 54), which is not registered at HEAD, so `/` depends on the setup state. The toolbar is in `App`'s own template, so the fix does not depend on the page.
- **D10. Label states by route interception.** `reconnecting`: `/events` is aborted, so the EventSource fails with readyState CONNECTING. `closed`: `/events` answers 401, so readyState is CLOSED. Source: `apps/web/src/app/shell/sse-client.ts` line 96 (the EventSource of `EVENTS_PATH`), lines 149 to 152 (CLOSED gives `closed`), lines 156 to 157 (other errors give `reconnecting`); `apps/web/src/app/shell/sse-envelope.ts` line 10. Both labels are tested in the one test, because the criterion accepts either and the closed text is the wider one (test structure, this plan's choice).
- **D11. The measures.** "Does not scroll sideways": `document.documentElement.scrollWidth <= window.innerWidth`, the same definition as SAU-06's check (iv) (`plans/SAU-06.md` line 103). "Fully inside the viewport": the heading, the label and the toggle each have a bounding box with `x >= 0`, `y >= 0`, `x + width <= 390` and `y + height <= 844`. Source: unit Acceptance criteria line 32.
- **D12. Nothing else.** No route, API call, contract or feature change. Source: unit Decisions line 22; `modules/shell.md` line 5 (the Shell publishes no contract slice) and line 44 (the Shell consumes nothing new).
- **D13. Phase.** SHL-20 is the gate of `phase:phone-toolbar`; merging it closes the phase. Source: unit line 14; `units/README.md` line 84.
- **D14. Out of scope.** The nav (SHL-05), the notices and banner area (SHL-04, SHL-06), the labels' wording, any new toolbar item. Source: unit Scope line 29.

## 2. Files to change

| Path | Change | Decision |
|---|---|---|
| `apps/web/src/app/app.html` | Edit: the `<mat-toolbar` tag (line 1) gets the attribute `[attr.data-device]="devices.deviceClass()"`. The toolbar's items (lines 1 to 4) and `.layout` (line 6) stay as they are. Prettier decides the line breaks. | D5 |
| `apps/web/src/app/app.css` | Edit: one new rule after `.spacer` (lines 7 to 9), with a comment: `mat-toolbar[data-device='phone'] { flex-wrap: wrap; height: auto; min-height: 56px; padding-block: 8px; row-gap: 4px; }`. `.spacer`, `.layout` and `.content` stay. | D5, D6 |
| `e2e/specs/phone-toolbar.e2e.ts` | New: one test (section 4). | D7 to D11 |

Not changed, with the reason:
- `apps/web/src/app/shell/connection-status.ts`: its styles (lines 15 to 20; `white-space: nowrap` at line 18) stay. The label stays on one line, which the wrap needs. The unit allows a change here (its Decisions line 22), but this plan has no need for one.
- `apps/web/src/app/shell/theme-toggle.ts` and `apps/web/src/app/shell/theme.spec.ts`: unit Scope line 27 allows them only if the toggle's own width needs it. Section 3, step 4 decides that; this plan makes no change to them.
- `apps/web/src/app/app.ts`, every unit file, every module file, `plans/DECISIONS.md`, `units/README.md`, `plans/QUEUE.md`: not this plan's to change.

Specificity, checked (for the implementer). Material's toolbar rules are global (`encapsulation: ViewEncapsulation.None`, `toolbar.mjs` line 98), so `.mat-toolbar-single-row` (specificity 0,1,0) and its `max-width: 599px` height rule are both lower than the emulated `mat-toolbar[data-device='phone'][_ngcontent-...]` (0,3,1). The new rule wins whatever the order of the stylesheets.

## 3. Procedure

Run from the root of a worktree on branch `unit/SHL-20` made from `main` (the orchestrator creates it). Record `node -v` and `npm -v` (expected `v26.x` and `11.x`) beside the first result. The implementer makes the code commits; the orchestrator commits this file.

0. **Preconditions.** `git status --short` prints nothing, and `ls e2e/specs` prints only `journey.e2e.ts`. Expected: both hold. If not, stop and report.
1. **Baseline.** `npm ci`, then `npm test -w @bbartolome/scriba-web` and `npm run build -w @bbartolome/scriba-web` at HEAD. Expected: both exit 0. Record the test result and the number of warnings the build prints (the CommonJS warnings, if any).
2. **Red.** Write `e2e/specs/phone-toolbar.e2e.ts` as section 4 describes. Run `npm run e2e -w @bbartolome/scriba-e2e -- phone-toolbar`. Expected: the test fails in its first step (`reconnecting`) at the scroll check or a box check, after the label check has passed. Record `document.documentElement.scrollWidth`, the three boxes and the toggle's width. If the test passes, or fails before the label check, stop and report: the test does not show the criterion, or D10 does not hold (section 6, point 1). Commit the test alone: `test(SHL-20): add the phone toolbar e2e check at 390 by 844`.
3. **Green.** Make the two edits of section 2 (`app.html` and `app.css`). Then run `npx prettier --write apps/web/src/app/app.html apps/web/src/app/app.css e2e/specs/phone-toolbar.e2e.ts`. Expected: each file is reported as written, and `git status --short` lists only the two web files. Record the new line numbers of the toolbar and of `.layout` in `app.html`.
4. **Green check, with a stop rule.** Run `npm run e2e -w @bbartolome/scriba-e2e -- phone-toolbar`. Expected: both steps pass. Record the scroll widths and the boxes of each step. If a step still fails: when the failing element is the toggle and its box is wider than 358 px (390 px minus the toolbar's 16 px side padding on each side, `toolbar.mjs` line 97), stop and report the measured width, because this plan does not change `theme-toggle.ts`. In any other case, stop and report the failing element. Do not weaken the test.
5. **Unit tests.** Run `npm test -w @bbartolome/scriba-web`. Expected: exit 0. The tests of `connection-status.spec.ts`, `theme.spec.ts` and `app.spec.ts` pass unchanged.
6. **Build and lint.** Run `npm run build -w @bbartolome/scriba-web` (exit 0; the warning count equals step 1's) and `npm run lint` (exit 0; the Prettier check at its end passes). Expected: both hold.
7. **Full e2e.** Run `npm run e2e`. Expected: `journey.e2e.ts` and `phone-toolbar.e2e.ts` both pass. The journey's steps stay pending, as before.
8. **Scope.** Run `git diff --stat main -- ':!plans'`. Expected: exactly `apps/web/src/app/app.css`, `apps/web/src/app/app.html` and `e2e/specs/phone-toolbar.e2e.ts`.
9. **Commit.** Commit `feat(SHL-20): fit the phone toolbar at 390 px with the connection label showing` on top of step 2's commit. Do not edit `plans/SHL-20.md`; the orchestrator sets its status at merge.
10. **Record.** Report the Node and npm versions, the measurements of steps 2 and 4, and the output of steps 1 and 5 to 8. The criterion counts as passed only when the step 7 run shows the test passing.

## 4. Acceptance criteria and tests

One criterion (unit line 32). It runs with the Playwright seam of D7.

| Criterion (unit line 32) | Test file | Test name | Pass condition |
|---|---|---|---|
| "At 390 by 844, with the connection label showing ("Reconnecting" or "Connection lost, retrying"), the page does not scroll sideways, and the heading, the label and the theme toggle are each fully inside the viewport." | `e2e/specs/phone-toolbar.e2e.ts` | `phone toolbar fits 390 by 844 with the connection label showing` | Both steps below pass. |

Structure of the one test: `test.use({ viewport: { width: 390, height: 844 } })`. A `pageerror` listener collects the page errors as `journey.e2e.ts` does (lines 15 and 16), and the test ends by expecting none (as line 19).

- **Step `reconnecting`.** `page.route('**/events', (route) => route.abort())`, then `page.goto('/core-gate')`. Expect the label (`app-connection-status [data-state]`) to read `Reconnecting` with `data-state="reconnecting"`.
- **Step `closed`.** `page.unrouteAll()`, then `page.route('**/events', (route) => route.fulfill({ status: 401 }))`, then `page.goto('/core-gate')`. Expect the label to read `Connection lost, retrying` with `data-state="closed"`.
- **In each step, after its label check:** the scroll check `document.documentElement.scrollWidth <= window.innerWidth`, and the boxes of the heading (`getByRole('heading', { name: 'Scriba', level: 1 })`), the label, and the toggle (`getByRole('radiogroup', { name: 'Theme' })`), each inside 0 to 390 by 0 to 844 (D11).

Timing. The first recovery probe runs one second after a closed stream (`connection-status.spec.ts` line 209; `sse-client.ts` line 17, `SSE_BACKOFF_BASE_MS` 1000). The closed step therefore measures before any probe or navigation.

Non-vacuity. The red run of step 2 shows that this test fails at HEAD on the criterion's own measures, so it can fail.

## 5. Agreement with downstream units

Each check is a statement to confirm. C1 to C3 and C6 to C9 hold now; C4 and C5 are confirmed after the merge.

- **C1. SAU-06 waits for SHL-20.** `units/SAU-06-minimal-setup-page.md` line 7 names "Frontend shell phone toolbar (SHL-20)" in `blocked_by`, and `units/SHL-20-phone-toolbar.md` line 9 names SAU-06 in `unblocks`. The two agree. `units/README.md` line 84 and `modules/setup-auth.md` lines 18 and 35 agree too.
- **C2. SAU-06 step 0 reads this file's status.** `plans/SAU-06.md` line 142 expects `git show main:plans/SHL-20.md | grep -m1 '^status:'` to print `status: done`. Now `grep -m1 '^status:' plans/SHL-20.md` prints `status: draft`; the orchestrator sets `done` at merge.
- **C3. SAU-06's check (iv) and this test use one definition.** `plans/SAU-06.md` line 103 defines check (iv) as `document.documentElement.scrollWidth <= window.innerWidth` in state 1 at `/setup`. This plan's test uses the same definition on `/core-gate`. The toolbar is the same in both places, so SAU-06's check (iv) follows from this fix, provided the rest of its page fits (its checks (ii) and (iii) are SAU-06's own).
- **C4. SAU-06's closed label comes from the same path.** SAU-06's state 1 gets the closed label from a 401 on `/events` (`plans/SAU-06.md` line 345, A14, marked ASSUMED there). The closed step here answers `/events` with 401 too, and both take the path of `sse-client.ts` lines 149 to 152. Confirm after the merge: SAU-06's state 1 shows `Connection lost, retrying` with the same readyState path.
- **C5. Line numbers that SAU-06 cites.** SAU-06 cites `app.html` lines 1 to 4 and line 6, and `app.ts` line 22 (`plans/SAU-06.md` line 314, revision 8). This plan adds an attribute to the `<mat-toolbar` tag and one rule after line 9 of `app.css`. If Prettier puts the attribute on its own line, `.layout` moves from line 6 to line 7. SAU-06's code stage re-reads these lines at its own HEAD, after its rebase (`plans/SAU-06.md` section 6, point 5). Confirm after the merge: `grep -c 'data-device' apps/web/src/app/app.html` prints 2 (the toolbar and `.layout`).
- **C6. SHL-09.** `units/SHL-09-core-gate.md` line 9 lists SHL-20 in `unblocks`, which is the inverse of SHL-20's `blocked_by: [SHL-09]` (unit line 7).
- **C7. parallel_with.** SHL-20 has `parallel_with: []`, and no unit names SHL-20 in its `parallel_with` (grep of `units/*.md`), so no pair breaks `units/README.md` line 64.
- **C8. Open plans on the same files.** Of the plans not yet `done`, only `plans/SAU-06.md` (status `planned`) names these files. It reads them and changes none of them (its lines 160 and 363 say so).
- **C9. SHL-19.** `units/SHL-19-polish-gate.md` lines 18 and 22 add a phone-viewport e2e check of their own. SHL-19 is not blocked by SHL-20, and no spec named `phone-toolbar` exists or is planned.

## 6. Open points

1. **Assumed: the route answers produce the two labels** (D10). The red run (step 2) shows it. If the label check fails, the code stage stops and reports; the criterion is not weakened.
2. **The widths are not measured here.** The 417 px is REPORTED by the reviewer (`plans/DECISIONS.md` line 3498; SAU-06's A5). The planner built and ran nothing. The toggle's own width is unknown; the stop rule of step 4 covers it.
3. **The expected layout is two rows, an estimate.** The heading and the label share the first row if they fit, and the toggle takes the second. The test asserts the criterion, not the rows. Step 4 records the rows.
4. **`/core-gate` as the test page** (D9). If a later unit removes the dummy route, the test moves to another Shell page. The orchestrator decides.
5. **Module file gap (not changed here).** `modules/shell.md` line 38 ("After SHL-09") lists the consumers of `phase:core` but not SHL-20, though SHL-20 is blocked only by SHL-09. `plans/DECISIONS.md` line 3834 notes the same. This plan changes no module file; the orchestrator decides.
6. **Recovery navigation.** After a closed stream's first probe, a 401 from `/api/setup-auth/status` navigates to `/setup` (`sse-client.ts` lines 191 to 202). The closed step measures before that (section 4). If the test flakes on it, the code stage stops and reports; it does not add stubs silently.

## 7. Facts checked and Assumed

### Facts checked

Read and grep only. The planner built, installed, ran and measured nothing. Versions read on PATH: Node v26.13.0, npm 11.20.0. HEAD `3a4c72e`, clean tree.

- `units/SHL-20-phone-toolbar.md`: front matter lines 1 to 10 (title line 3, module line 4, `blocked_by` line 7, `unblocks` line 9); line 14 (the gate); line 17 (Why); lines 20 to 24 (Decisions); lines 27 to 29 (Scope); lines 31 to 32 (criterion).
- `units/SAU-06-minimal-setup-page.md` line 7 (`blocked_by` names SHL-20).
- `units/SHL-09-core-gate.md` line 9 (`unblocks` names SHL-20).
- `units/README.md` lines 64 and 65 (blocker rules); line 84 (the `phase:phone-toolbar` row).
- `modules/shell.md` line 5 (no contract slice); line 33 (the SHL-20 graph line); line 38 (the "After SHL-09" parallelism line, without SHL-20); line 44 (the Shell consumes only listed contracts); line 64 (the `/core-gate` route row); lines 88 and 90 (testing seam); line 104 (classes, not pixels).
- `modules/setup-auth.md` lines 18 and 35 (both name SHL-20).
- `plans/QUEUE.md` line 2 (`SHL-20 | M1 | available: yes`).
- `plans/PLT-02.md` lines 5, 11, 35, 60, 77, 89 and 95 (section headings, the structure this plan follows).
- `plans/DECISIONS.md` lines 2867 to 2872 (SAU-06 open point 4, the e2e placement); 3498 (417 px, REPORTED); 3617 to 3619 (the Navigator's option (b) for SHL-20); 3680 to 3690 (review of SAU-06 revision 8, SHL-20 items 3 and 4); 3833 to 3835 (SHL-20 named, no plan yet).
- `plans/SAU-06.md` lines 103 (check (iv)), 124 (SHL-20 changes Shell files), 142 (step 0 reads SHL-20's status), 160 and 363 (the SHL-20 files it reads), 258 to 270 (the blocker), 314 (its citations of `app.html` lines 1 to 4 and 6), 345 (A14, the 401 gives CLOSED).
- `plans/SAU-06.md` is the only plan that is not `done` (`grep -m1 '^status:' plans/*.md`: 54 `done`, `planned` only for SAU-06, and `DECISIONS.md`, `QUEUE.md` are not plans).
- `apps/web/src/app/app.html` lines 1 to 4 (the toolbar: `<mat-toolbar`, `<h1>Scriba</h1>`, the spacer, the label and the toggle), line 6 (`.layout` with `[attr.data-device]`).
- `apps/web/src/app/app.css` lines 7 to 9 (`.spacer`), 11 to 15 (`.layout`), 17 to 20 (the phone rule for `.layout`), 26 to 29 (`.content`).
- `apps/web/src/app/app.ts` line 22 (`styleUrl: './app.css'`), line 29 (`protected readonly devices`).
- `apps/web/src/app/shell/connection-status.ts` lines 13 to 35 (the component), 15 to 20 (styles), 18 (`white-space: nowrap`), 24 to 25 and 29 to 30 (the two labels, with `role="status"` and `data-state`).
- `apps/web/src/app/shell/theme-toggle.ts` lines 13 to 24 (the group with `aria-label="Theme"`, three buttons).
- `apps/web/src/app/shell/theme.spec.ts` lines 19 to 25 (the radio lookup), and its three tests at lines 33, 49 and 58.
- `apps/web/src/app/shell/connection-status.spec.ts` lines 80 to 82 (the indicator selector), four tests at lines 138, 181, 196 and 219, the asserted texts and `data-state` at lines 156 to 157 and 251, the comment at line 209 (the recovery probe runs one second after a closed stream); `grep -c role` prints 0.
- `apps/web/src/app/shell/sse-client.ts` line 17 (`SSE_BACKOFF_BASE_MS = 1000`), line 96 (the EventSource of `EVENTS_PATH`), lines 149 to 160 (closed gives `closed`; other errors give `reconnecting`), lines 181 to 207 (recovery; lines 199 to 202 navigate to `/setup` on a 401).
- `apps/web/src/app/shell/sse-envelope.ts` line 10 (`EVENTS_PATH = '/events'`).
- `apps/web/src/app/shell/device-class.ts` lines 63 and 71 (the observed sets and `deviceClass`), lines 99 and 100 (`Breakpoints.Handset` gives `phone`).
- `apps/web/src/app/shell/landing.ts` line 54 (`/setup` when setup is incomplete).
- `apps/web/src/app/app.config.ts` line 27 (`inject(SSE_CLIENT).start()`).
- `apps/web/src/app/app.routes.ts` lines 37 to 49 (the `core-gate` entry: phone minimum, `nav` label).
- `apps/web/src/app/shell/core-gate/core-gate.ts` lines 6 to 8 (the heading and the paragraph).
- `apps/web/src/app/app.spec.ts` lines 8 to 19 (the heading test).
- `e2e/playwright.config.ts` lines 10 and 11 (`testDir`, `testMatch` for `*.e2e.ts`), 12 (`globalSetup`), 13 (`workers: 1`), 20 (`baseURL` 8080), 22 to 25 (the Chromium lookup).
- `e2e/harness/global-setup.ts` line 17 (health timeout), lines 20 and 21 (port check and build), lines 44 to 58 (port check), 60 to 72 (builds contracts, API, web), 74 to 85 (starts the API).
- `e2e/specs/journey.e2e.ts` lines 11 to 19 (the test, the heading check, the `pageerror` listener, the empty-errors check).
- `e2e/package.json` line 10 (`"e2e": "playwright test"`), line 13 (`@playwright/test` 1.65.0). `e2e/tsconfig.json` line 6 (includes `specs`).
- Root `package.json` lines 23 (build), 25 (test), 26 (lint), 29 (e2e). `apps/web/package.json` lines 6 (`ng build`), 8 (`ng test --watch=false`), 9 (lint).
- `node_modules/@angular/material` version 22.2.7 (read from its `package.json`); `@playwright/test` 1.65.0 (read from its `package.json`).
- `node_modules/@angular/material/fesm2022/toolbar.mjs` lines 77 to 98 (the `mat-toolbar` component: single-row class at lines 84 and 85; styles at line 97, `.mat-toolbar-row, .mat-toolbar-single-row` with `display: flex`, `padding: 0 16px`, `white-space: nowrap`, a 64 px height, and 56 px below 600 px wide; `encapsulation: ViewEncapsulation.None` at line 98).
- `node_modules/@angular/material/fesm2022/button-toggle.mjs` line 339 (the group's role is `radiogroup` when single-select) and line 641 (the buttons' role is `radio` when single-select).
- The Playwright browser cache holds `chromium-1194`, `chromium-1248` and `chromium-1254` (listed with `ls`).

### Assumed

- Playwright 1.65.0 finds one of the cached Chromium builds on this machine, and the e2e global setup finishes its builds and starts the API within its limits (`global-setup.ts` line 17).
- `route.abort()` on `/events` gives readyState CONNECTING, and `route.fulfill({ status: 401 })` gives CLOSED (WHATWG EventSource rules). Not run here.
- The toggle's own box is narrower than 358 px at 390 px. Not measured.
- `boundingBox()` of the inline label element reports its rendered box.
- Port 8080 is free when the e2e runs.
- No unit merged after `3a4c72e` changes `app.html`, `app.css` or `connection-status.ts` before this unit's code stage. That holds only for the plans and files present at HEAD.
