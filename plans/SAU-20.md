---
id: SAU-20
status: draft
unit: units/SAU-20-tailscale-ui.md
sources: units/SAU-20-tailscale-ui.md (23 lines, no change note); units/README.md; modules/setup-auth.md; units/SAU-15 and SAU-21 (lines named below); plans/SAU-11.md, SAU-15.md, SAU-17.md, SAU-18.md, SAU-19.md (done); plans/PLT-16.md (done, line 230); plans/PST-22.md, SAU-22.md, TRG-14.md (planned or draft; file lists); plans/DECISIONS.md (grep by unit id, matching lines read); plans/PLT-02.md (structure); the web, API and contract files named in sections 2 and 7.
---

# SAU-20 plan — Tailscale UI on /setup and the settings page (draft)

Base: `main` at `2a09cd5`, clean tree. No `unit/SAU-20` branch and no SAU-20 worktree exist (`git branch --list`, `git worktree list`). Nothing was built, installed, run or changed except this file.

Tags: **D**n is a decision this plan obeys (section 1a to 1c). **C**n is a small choice this plan makes (section 1d). **OP**n is an open point for the Navigator (section 6). **F**n is a fact checked, **A**n an assumed fact (section 7).

## 1. Decisions this plan obeys

### 1a. Settled by the unit

- **D1 The /setup step.** Replaces the Tailscale placeholder with: the state (unavailable / logged out / waiting for login / running); the login link (`authURL`); the tailnet URL once `Running`; the prerequisite hints (MagicDNS off; HTTPS certificates off when `CertDomains` is empty, pointing to the admin console); a visible skip. Tailscale stays optional. Source: unit line 15.
- **D2 The settings page.** Gains the Tailscale status and login link again (reconnect after logout), and the owner allowlist editor with an on/off toggle and the lockout message. The allowlist section "can ship read-only first". Source: unit line 16; `units/SAU-15-settings-page.md` line 16 ("Tailscale status and allowlist sections are added in SAU-20").
- **D3 Polling.** Both poll the status endpoint every few seconds while visible. Source: unit line 17.
- **D4 Criteria.** Three, quoted in section 4 (unit lines 20 to 22).
- **D5 Blockers.** `blocked_by` SAU-11, SAU-15, SAU-17; `parallel_with` SAU-18, SAU-19; `unblocks` SAU-21 (unit lines 7 to 9). The three blockers are `status: done`. SAU-19 is listed in `parallel_with` only, not in `blocked_by`, and unit line 16 says "once SAU-19 lands". SAU-19 is on main, so the allowlist editor is built against the real routes and needs no read-only stage.

### 1b. Settled by the module and the README

- **D6 Feature and test seam.** The feature folder is `apps/web/src/app/features/setup-auth/`, with the `/setup` and `/settings` routes (`modules/setup-auth.md` line 42). UI tests render the routes with Angular's Vitest runner against a fake API (lines 70 and 71).
- **D7 Polling, no events.** UIs poll; this module publishes no SSE events (`modules/setup-auth.md` lines 45 and 81).
- **D8 HTTP.** Reads are `GET`, commands are `POST` (`units/README.md` line 132). The status read is a `GET`; the allowlist change is a `POST`. Codes are `SETUP_` or `AUTH_` (line 133).
- **D9 Test seam.** Tests check external behaviour: rendered UI and what the fake API received (`units/README.md` line 139).

### 1c. Settled by done plans, the owner, and the code on main

- **D10 Wizard seams.** The Tailscale step is a `@case` in `step-body.ts` (`plans/SAU-11.md` lines 69 and 89). Mark done, Skip, Next and Skip the rest are generic controls in `setup-page.ts`. Mark done on this step is allowed with no special case (`plans/SAU-11.md` line 192).
- **D11 Settings seams.** The settings page keeps one `<section>` per block; SAU-20 adds its sections and may add values to `loadSettingsContract()` (`plans/SAU-15.md` line 154).
- **D12 Status.** The normalised status is `tailscaleStatusSchema` (`packages/contracts/src/setup-auth/tailscale.ts` lines 19 to 28). The server sets `magicDNSEnabled` and `httpsCertsEnabled` whenever `available` is true (`apps/api/src/modules/setup-auth/tailscale-status.service.ts` lines 64 and 65), and caches the socket read for 2000 ms (`TAILSCALE_STATUS_CACHE_MS`, line 11; `plans/SAU-17.md` line 215).
- **D13 Allowlist.** `GET` returns `{enabled, logins}`. `POST` takes any subset of the two fields and answers 200 with the saved list, or 403 `SETUP_ALLOWLIST_LOCKOUT` (`apps/api/src/modules/setup-auth/setup-flow.controller.ts` lines 27 to 40; `setup-status.service.ts` `saveAllowlist`; `plans/SAU-19.md` section 1b, C6). The owner's login is not in the body.
- **D14 Error text.** A tailnet error shows the web's own text, keyed by code; the server text is not shown (`apps/web/src/app/features/setup-auth/sign-in-notice.ts` lines 10 to 13 and `tailnetExplanation`; `setup-page.spec.ts` tests C1d; `plans/SAU-19.md` section 1b, C5).
- **D15 Security.** The owner accepted the SAU-18 peer rule for the identity header (`plans/DECISIONS.md`, entry "2026-11-17 — SAU-18 — Owner decision", lines 5530 to 5536). This plan changes no guard, identity or API code.
- **D16 HTTPS hint.** The hint is the one of unit line 15 (`plans/DECISIONS.md` line 796; `plans/PLT-15.md` line 78). Its restart caveat is OP5.

### 1d. Choices this plan makes

- **C1 Components.** `TailscalePanel` in `tailscale-panel.ts` (selector `app-tailscale-panel`) is shown in the wizard's Tailscale step and in a "Tailscale" section of the settings page, placed after "This device". `AllowlistPanel` in `allowlist-panel.ts` (selector `app-allowlist-panel`) is shown in an "Allowlist" section placed after "Tailscale". Reason: the unit names the same states for both places.
- **C2 Loaders.** `setup-contract.ts` gains `loadTailscaleContract()` (`TAILSCALE_STATUS_ROUTE`, `tailscaleStatusSchema`, `SETUP_AUTH_ERROR_CODES`) and `loadAllowlistContract()` (`ALLOWLIST_ROUTE`, `allowlistSchema`, `allowlistUpdateSchema`, `SETUP_AUTH_ERROR_CODES`). Both read the module as the existing loaders do (`mod.default ?? mod`), because the production import has only `default` (`setup-contract.ts` header; `settings-contract.spec.ts` Y1; `setup-contract.spec.ts` X5). The panels import no other contract value at run time; type imports are allowed.
- **C3 Polling.** One read every 5000 ms while visible, an immediate read when the page becomes visible, and no read while hidden or after the view is destroyed. 5 s is above the 2000 ms server cache, so each poll reads the socket. Pattern: `apps/web/src/app/shell/sse-client.ts` lines 62 and 63 (visible check), 89 (listener), 238 to 240 (teardown).
- **C4 Texts and links.** Unavailable (`available: false`): the paragraph "Tailscale is unavailable." exactly, because two e2e checks match it (`e2e/specs/journey.e2e.ts` line 78; `e2e/specs/setup-phone.e2e.ts` line 235). Logged out (`NeedsLogin`, no `authURL`): "Tailscale is logged out." Waiting for login (`NeedsLogin` with `authURL`): link "Log in to Tailscale" to `authURL`. Running: "Tailscale is running." and link "Open Scriba over the tailnet" to `tailnetURL`. Other states: OP2. Hints: "MagicDNS is off. Turn it on in the Tailscale admin console." and "HTTPS certificates are off for this tailnet. Turn them on in the Tailscale admin console.", each with the link "Tailscale admin console" (URL in OP4). Links are `<a>` elements that open in a new tab with `rel="noopener"`.
- **C5 No button in the panel.** On /setup the panel adds no `<button>`. W1 asserts the exact button list of the Tailscale step (`setup-page.spec.ts` lines 511 to 520), and `setup-phone.e2e.ts` line 238 finds the Skip button by role. The skip is the wizard's own Skip (OP7).
- **C6 Toggle.** One `mat-slide-toggle` from Angular Material, as `tool-form.ts` line 456 uses it, labelled "Allow only listed Tailscale logins". The state comes from `GET`; a change sends `POST {enabled}` only. The login list is not shown (OP8).
- **C7 Lockout text.** Keyed by `SETUP_ALLOWLIST_LOCKOUT` in `allowlist-panel.ts`: "This change would leave this Tailscale login out of the allowlist, so it was refused. Make the change from the computer that runs Scriba." The server text is not shown (D14). The text names no list editor, because this unit has none (OP8).
- **C8 Other errors.** A tailnet code shows `tailnetExplanation` (`sign-in-notice.ts`). Any other error shows its message, as the other setup-auth reads do (`messageOf`).

## 2. Files to change

Only these paths change.

| # | Path | New or modified | Change | Decision |
|---|---|---|---|---|
| 1 | `apps/web/src/app/features/setup-auth/setup-contract.ts` | modified | Adds `loadTailscaleContract()` and `loadAllowlistContract()`. | C2 |
| 2 | `apps/web/src/app/features/setup-auth/settings-contract.spec.ts` | modified | Test Y1 gains assertions for the two new loaders, read through the default-only mock. Existing assertions kept. | C2 |
| 3 | `apps/web/src/app/features/setup-auth/tailscale-panel.ts` | new | `TailscalePanel`: states, links, hints, polling. | C1, C3, C4, C5, C8, D12 |
| 4 | `apps/web/src/app/features/setup-auth/step-body.ts` | modified | The `tailscale` case shows `<app-tailscale-panel />`. The header comment loses its sentence about placeholders, because no placeholder is left. | C1, D10 |
| 5 | `apps/web/src/app/features/setup-auth/setup-page.spec.ts` | modified | Canned `GET` of the status route in each test or helper that walks past Access (W1, and the providers helper and P3, `lines 627 to 800`). New test W3. | D10, section 4 |
| 6 | `apps/web/src/app/features/setup-auth/preferences-step.spec.ts` | modified | Canned `GET` of the status route in the two walks past Access (`lines 171 to 179` and `361 to 374`). | D10 |
| 7 | `apps/web/src/app/features/setup-auth/settings-page.ts` | modified | Adds the "Tailscale" and "Allowlist" sections, their imports and the header comment. | C1, D11 |
| 8 | `apps/web/src/app/features/setup-auth/settings-page.spec.ts` | modified | Test S1 gains canned `GET` and `POST` answers for the two new routes (`lines 158 to 180`); its assertions are kept. New tests S2 and S3. | section 4 |
| 9 | `apps/web/src/app/features/setup-auth/allowlist-panel.ts` | new | `AllowlistPanel`: read, toggle, lockout text. | C6, C7, C8, D13 |

Checked and not changed: `apps/api/**` (no code change; every route exists); `packages/contracts/**` (no contract change; `examples.ts` stays as it is, so the allowlist-off fixture is `SETUP_AUTH_EXAMPLES.setupAuthSection.allowlist` and the hint fixtures are written inline in the spec); `e2e/**` (its texts are kept, so no e2e file changes); `setup-page.ts`, `steps.ts`, `setup-auth.routes.ts` and `sign-in-notice.ts` (no change needed); `package.json` and the lockfile (no new dependency); `units/**`, `modules/**` and every plan except `plans/SAU-20.md`; `plans/DECISIONS.md` (the orchestrator writes it); the guard and the SAU-18 code.

## 3. Procedure

Each numbered step is one commit on the implementer's branch `unit/SAU-20`, in a worktree the implementer creates. Each commit leaves the web suite green. Steps 1 to 4 form Part 1 and steps 5 to 9 form Part 2 (section 8).

Before any test, run `npm run build -w @bbartolome/scriba-contracts`, because the web resolves the contract through the package exports into `packages/contracts/dist`. No install is needed.

1. **Loaders.** Add `loadTailscaleContract()` and `loadAllowlistContract()` to `setup-contract.ts` (C2). Add the assertions for both loaders to test Y1 in `settings-contract.spec.ts`. The existing tests pass.
2. **Panel, states only.** Create `tailscale-panel.ts`. It reads the status once through `loadTailscaleContract()` and renders the texts and links of C4, the hints of OP3 and the state mapping of OP2. It uses `overflow-wrap: anywhere` as `setup-page.ts` does, so it fits at 390 px. It adds no `<button>` (C5). It is not yet placed on a page.
3. **Wire the wizard.** In `step-body.ts`, replace the `tailscale` case (lines 27 to 29) with `<app-tailscale-panel />` and remove the placeholder sentence from the header comment. In `setup-page.spec.ts` and `preferences-step.spec.ts`, add `respond('GET', TAILSCALE_STATUS_ROUTE, SETUP_AUTH_EXAMPLES.tailscaleUnavailable)` in each test or helper that walks past Access (section 2, rows 5 and 6). No existing assertion changes. W1's "Tailscale is unavailable." (line 510) and the two preference-step checks (lines 173 and 363) then test the real panel.
4. **Test W3 (criterion 1).** Write W3 in `setup-page.spec.ts` (section 4) and make it pass.
5. **Settings Tailscale section.** In `settings-page.ts`, add the section "Tailscale" after "This device", containing `<app-tailscale-panel />`. In S1, add the canned `GET` for the status route. S1's assertions stay as they are.
6. **Test S3 (criterion 3), then polling.** Write S3 first and see it fail. Then add the polling of C3 to `tailscale-panel.ts` and make S3 pass.
7. **Allowlist panel and section.** Create `allowlist-panel.ts` (C6, C7, C8). Add the section "Allowlist" after "Tailscale" in `settings-page.ts`. In S1, add the canned `GET` for `ALLOWLIST_ROUTE` (`SETUP_AUTH_EXAMPLES.setupAuthSection.allowlist`) and a canned `POST`.
8. **Test S2 (criterion 2).** Write S2 (section 4) and make it pass.
9. **Verification.** `npm test -w @bbartolome/scriba-web`; `npm run lint -w @bbartolome/scriba-web`; `npx prettier --check apps/web/src/app/features/setup-auth`. The three specs that navigate to `/setup` or `/settings` and check only the URL (`landing.spec.ts` line 75, `project-switch-follow.spec.ts` lines 76 to 84, `api-client.spec.ts` line 184) must pass unchanged. No commit unless a fix is needed.

## 4. Acceptance criteria and tests

Criteria as written in `units/SAU-20-tailscale-ui.md` lines 20 to 22. They are not reworded. The fake API is `FakeApiClient` (`apps/web/src/app/shell/testing/test-doubles.ts`): `respond`, `fail` and `requests`.

| Criterion | Test (file and name) | What it checks |
|---|---|---|
| "Component tests (fake API) for each state: link shown for `NeedsLogin`, URL for `Running`, HTTPS hint for certs off, MagicDNS hint, "unavailable" in dev, skip." | `apps/web/src/app/features/setup-auth/setup-page.spec.ts`, **W3** "the Tailscale step shows each state's text, link or hint, and a Skip that writes skipped" | Walks to the Tailscale step and re-renders /setup once per status, as S1 does. `tailscaleNeedsLogin`: a link to `authURL` with "Log in to Tailscale" and no URL link. `tailscaleRunning`: a link to `tailnetURL` and no login link. Inline `NeedsLogin` without `authURL`: "Tailscale is logged out.". Inline `Running` with `httpsCertsEnabled: false`: the HTTPS hint and its admin-console link. Inline `Running` with `magicDNSEnabled: false`: the MagicDNS hint. `tailscaleUnavailable` (dev): the exact paragraph "Tailscale is unavailable.", with no link and no hint. Then clicks the step's Skip: one `POST` to `/api/setup-auth/steps/tailscale` with body `{state: 'skipped'}`, and the list shows "Tailscale: skipped". |
| "Allowlist toggle and lockout error rendering." | `apps/web/src/app/features/setup-auth/settings-page.spec.ts`, **S2** "the allowlist toggle posts the change and shows the saved state, and a 403 SETUP_ALLOWLIST_LOCKOUT shows the lockout text and keeps the toggle" | The `button[role="switch"]` starts with `aria-checked` false, from `setupAuthSection.allowlist`. A click posts `{enabled: true}` to `ALLOWLIST_ROUTE` (`postsTo` helper). With a canned 200 `{enabled: true, logins: ['ada@example.com']}`, `aria-checked` becomes true. With `fail('POST', ALLOWLIST_ROUTE, new ApiError(403, 'SETUP_ALLOWLIST_LOCKOUT', 'server text'))`, the text of C7 is shown, "server text" is not, and the toggle keeps its last saved state. |
| "Polling stops when the view is hidden." | `apps/web/src/app/features/setup-auth/settings-page.spec.ts`, **S3** "the Tailscale status is read every 5 s while the page is visible, and not while it is hidden or after the page is left" | Fake timers. After 5 s the status `GET` count has risen by one. Set `document.visibilityState` to `hidden` and dispatch `visibilitychange`; after 15 s there is no new read. Set `visible` and dispatch: one immediate read, then the 5 s rhythm resumes. Navigate to `/no-such-page`: after 15 s there is no new read. The test covers both readings of "hidden" (OP1). Pattern: `sse-client.spec.ts` lines 100 to 103 and 207 to 216. |

## 5. Downstream and parallel agreement

- **SAU-21 (blocked by SAU-20; unit line 7).** Its criterion "LocalAPI fixture states render correctly (SAU-17, SAU-20)" (`units/SAU-21-tailnet-gate.md` line 23) is covered by the fixtures of W3. Its late-login criterion (line 26) and its demo (line 30: "click the Tailscale login link ... Watch the state turn `Running` and the tailnet URL appear", then "turn on the allowlist ... see the refusal, then turn it off") need the settings Tailscale section (C1), the 5 s poll (C3, S3) and the toggle (S2). SAU-21 needs no change in these routes or codes. Its own work (socket smoke test, Serve checks, docs) touches no file of this plan.
- **SAU-19 (done).** Consumed as built: the routes, the codes and the `GET` and `POST` shapes (D13). No contract change. The lockout text (C7) follows the server's `SETUP_ALLOWLIST_LOCKOUT` (403).
- **SAU-17 (done).** Status fields (D12). The poll interval respects the 2000 ms cache (C3).
- **SAU-18 (done).** The status route is reachable on the tailnet Host (`plans/SAU-18.md` line 143). SAU-20 needs no API change, as that plan says.
- **SAU-11 and SAU-15 (done).** The seams of D10 and D11. `setup-page.ts`, `steps.ts` and `setup-auth.routes.ts` do not change.
- **SAU-22 (draft; `plans/SAU-22.md` section 3).** Its files are `packages/contracts/src/platform/env.ts`, `packages/contracts/test/platform.schema.test.ts`, `apps/api/**`, `package.json`, `README.md` and `scripts/dev-auth-docs.test.mjs`. None is in this plan's list, and its section 8 says it does not change `apps/web`. Either merge order is correct.
- **PST-22 (planned; `plans/PST-22.md` section 2).** Its files are `apps/api/test/project-store-review-gate.test.ts`, `e2e/fixtures/mock-openai/scenarios/edit-chapter-one.json`, line 282 of `e2e/specs/journey.e2e.ts`, and its unit and plan. None is in this plan's list, and its section 2 says `apps/web/**` does not change. Either merge order is correct. The journey's check of "Tailscale is unavailable." (line 78) stays true by C4.
- **TRG-14 (planned; `plans/TRG-14.md` file table).** Its files are under `apps/web/src/app/features/tool-registry/`, `apps/web/package.json`, `package-lock.json` and `e2e/specs/tools-editor.e2e.ts`. None is in this plan's list. Either merge order is correct.
- **PLT-16 (done).** `plans/PLT-16.md` line 230 and `plans/DECISIONS.md` line 1781 say that if HTTPS is off at login or after logout, Serve stays unconfigured until a restart, so the HTTPS hint describes a state that lasts until a restart. Carried as OP5.
- **Existing e2e expectations.** `e2e/specs/journey.e2e.ts` line 78 and lines 160 to 170 (settings compose warning); `e2e/specs/setup-phone.e2e.ts` lines 232 to 238 (the Tailscale step). Their texts and roles are kept by C4 and C5. They are not run here (A5).
- **Other plans.** The only draft or planned plans are PST-22, SAU-22 and TRG-14 (front-matter grep of `plans/`). Done plans name the setup-auth web files, and their changes are on main.

## 6. Open points (for the Navigator)

Each point is a question the repository does not settle. The default below is used unless the Navigator changes it.

- **OP1 "Hidden" (criterion 3).** Does it mean the document is hidden (`visibilityState`), the page is left, or both? Default: both. S3 tests both.
- **OP2 States (criterion 1; unit line 15).** The unit names four states: unavailable, logged out, waiting for login, running. `BACKEND_STATES` has six names (`tailscale.ts` lines 3 to 11). Default: unavailable is `available: false`; logged out is `NeedsLogin` with no `authURL` (`plans/SAU-17.md` assumption A13, line 137, not verified); waiting for login is `NeedsLogin` with `authURL`; running is `Running`. `NoState` with `available: true`, `NeedsMachineAuth`, `Stopped` and `Starting` have no state in the unit. Default for them: "Tailscale state: <name>." with no link and no hint.
- **OP3 Where the hints show.** The unit names the hints but not the states where they show. The status sets both fields whenever `available` is true (`tailscale-status.service.ts` lines 64 and 65). Default: a hint shows when its field is exactly `false` (not when the field is absent), in any available state.
- **OP4 Admin console URL.** The repository has no admin console URL (grep of the repository). Default: `https://login.tailscale.com/admin` (A3). The alternative is the hint text without a link.
- **OP5 Restart after HTTPS.** `plans/PLT-16.md` line 230 and `plans/DECISIONS.md` line 1781: if HTTPS is off at login or after logout, Serve stays unconfigured until the container restarts. Unit line 15 names no restart text. Default: no restart text. The Navigator decides whether the HTTPS hint says that a restart is needed after HTTPS is turned on.
- **OP6 Step marked done.** `units/SAU-17-localapi-client-status.md` line 24: "With an auth key in `.secret`, state reaches `Running` without interaction; the step shows done." No code on main writes `steps.tailscale` (F21), and SAU-20's unit names no auto-done rule. Default: no automatic write; the author uses Mark done or Skip (D10). If automatic done is wanted, either the panel posts it (a change inside this plan's files) or the server does (outside SAU-20).
- **OP7 Skip (criterion 1).** The unit asks for "a visible skip" (line 15). The wizard's own Skip already writes `skipped` on this step (`setup-page.ts` controls). Default: no skip control in the panel, because an extra button would break W1's button list and `setup-phone.e2e.ts` line 238. The Navigator confirms that the wizard's Skip meets the criterion.
- **OP8 Allowlist scope (unit line 16).** The unit names an "owner allowlist editor with on/off toggle and the lockout message". No criterion or decision names a list editor for adding or removing logins. Default: toggle only; the logins are neither shown nor editable. A list editor would need its own criterion.
- **OP9 Lockout wording and the way back.** The unit names no text. Default: the wording of C7, which points to the computer that runs Scriba. That is the only way back the repository names (unit line 22; `units/SAU-15-settings-page.md` recovery item 4). The Navigator confirms the wording.
- **OP10 Settings coverage.** Criterion 1 is tested on /setup only (W3). The settings page shows the same panel (C1), but no test covers the settings Tailscale section. Default: accept. The alternative is an extra settings check inside S2 or S3, which is not a new criterion.
- **OP11 Poll interval.** "every few seconds" fixes no number. Default: 5000 ms (C3), above the 2000 ms cache.

## 7. Facts checked and assumed

### 7a. Facts checked

- **F1** `units/SAU-20-tailscale-ui.md`: front matter lines 7 to 9 (blockers, parallel, unblocks), decisions lines 14 to 17, criteria lines 19 to 22. The file has no change note. The front matter of SAU-11, SAU-15, SAU-17, SAU-18, SAU-19 and SAU-21 agrees with it (grep of `units/`).
- **F2** Done (front matter `status: done`): `plans/SAU-11.md`, `SAU-15.md`, `SAU-17.md`, `SAU-18.md`, `SAU-19.md`. `plans/SAU-20.md` did not exist before this draft. `git branch --list 'unit/SAU-20*'` prints nothing. `git worktree list` has no SAU-20 entry. `git status --short` was empty at `2a09cd5`.
- **F3** Allowlist routes on main: `apps/api/src/modules/setup-auth/setup-flow.controller.ts` lines 27 to 40; `setup-status.service.ts` `allowlist()` and `saveAllowlist()` (lines 139 to 170; the lockout error at lines 161 and 162); test `apps/api/test/setup-auth-allowlist.test.ts`.
- **F4** Status on main: `apps/api/src/modules/setup-auth/tailscale-status.controller.ts` (GET, covered by the guard); `tailscale-status.service.ts` line 11 (`TAILSCALE_STATUS_CACHE_MS = 2000`), lines 47 to 72 (`normaliseLocalApiStatus`, fields and `ownerLogin` at line 70), line 92 (`refresh()`).
- **F5** Contract: `packages/contracts/src/setup-auth/routes.ts` lines 11 to 13 (`TAILSCALE_STATUS_ROUTE`, `ALLOWLIST_ROUTE`); `tailscale.ts` lines 3 to 11 (`BACKEND_STATES`) and 19 to 28 (`tailscaleStatusSchema`); `settings.ts` lines 14 to 20 (`allowlistSchema`, `allowlistUpdateSchema`); `errors.ts` lines 8 to 10 and 20 to 22 (the codes and their statuses); `examples.ts` lines 13 to 27 (the Tailscale fixtures) and the `setupAuthSection` fixture with the allowlist off.
- **F6** Placeholder: `apps/web/src/app/features/setup-auth/step-body.ts` lines 8 to 16 (header, which names the placeholders) and lines 27 to 29 (the `tailscale` case).
- **F7** Loaders: `setup-contract.ts` header (runtime use and the `mod.default ?? mod` read), `loadSetupAuthContract` (line 14), `loadSettingsContract` (line 39).
- **F8** Settings page: `settings-page.ts` sections "This device", "Preferences", "Model providers", "Versions", "Recovery", "Setup"; its `read()` and `fail()`. Its spec `settings-page.spec.ts`: S1 at line 157, canned answers at lines 158 to 180, button check with `arrayContaining` at line 190.
- **F9** Wizard controls in `setup-page.ts`: on a middle step other than access, providers or preferences, Mark done, Skip, Next and Skip the rest; on the last step, Mark done, Skip and Finish. `postStep` posts `SETUP_STEP_ROUTE` with the step key.
- **F10** Fake client: `apps/web/src/app/shell/testing/test-doubles.ts`: `respond`, `fail`, `requests`; a missing canned answer throws `No canned response for ...` (line 92).
- **F11** Visibility pattern: `apps/web/src/app/shell/sse-client.ts` lines 62 and 63 (visible check), 89 (listener), 238 to 240 (teardown); `sse-client.spec.ts` lines 100 to 103 (`defineProperty` on `visibilityState`), 207 to 216 (tick on visible).
- **F12** Tests that depend on the placeholder or on the exact button list: `setup-page.spec.ts` W1 (lines 483 to 520; "Tailscale is unavailable." at line 510) and the providers tests (lines 627 to 800, with a walk past Access before P3); `preferences-step.spec.ts` lines 171 to 179 and 361 to 374 (checks at lines 173 and 363); `settings-page.spec.ts` S1 (button check at line 190).
- **F13** e2e: `e2e/specs/journey.e2e.ts` line 78 (text) and lines 160 to 170 (settings warning); `e2e/specs/setup-phone.e2e.ts` lines 232 to 238 (exact text at line 235, Skip by role at line 238).
- **F14** Specs that route to /setup or /settings and check only the URL: `landing.spec.ts` line 75, `project-switch-follow.spec.ts` lines 76 to 84, `api-client.spec.ts` line 184.
- **F15** Material slide toggle: `node_modules/@angular/material/fesm2022/slide-toggle.mjs` contains `role="switch"`. `apps/web/src/app/features/tool-registry/tool-form.ts` line 14 (import) and line 456 (use).
- **F16** Draft and planned plans (front-matter grep of `plans/`): PST-22 planned, SAU-22 draft, TRG-14 planned. File lists: `plans/PST-22.md` section 2 (lines 46 to 59), `plans/SAU-22.md` section 3 (lines 76 to 93), `plans/TRG-14.md` file table (around lines 100 to 110). None lists a path of section 2 of this plan.
- **F17** Plans that name setup-auth web files (grep of `plans/` for `features/setup-auth`): all are done, or are DECISIONS entries.
- **F18** DECISIONS entries by unit id (grep; matching lines read): 796, 802, 1781, 1784, 1786 and 1991 (PLT-15 and PLT-16, the HTTPS hint); 5530 to 5536 (owner decision on SAU-18); 5556 to 5566 (SAU-19 review; its point 5, "SAU-20 ordering: no action").
- **F19** Commands: root `package.json` (`test` runs the workspace tests after the contracts build; `build` builds contracts first); `apps/web/package.json` (`test`: `ng test --watch=false`; `lint`: `eslint .`); `packages/contracts/package.json` exports `./setup-auth` (types under `dist/setup-auth/`); `packages/contracts/dist/` exists.
- **F20** `setup-contract.spec.ts` (X5) and `settings-contract.spec.ts` (Y1) mock the contract module with only a `default` export, which is the production shape.
- **F21** No non-spec code writes `steps.tailscale`: grep of `apps/api/src/modules/setup-auth/` and `apps/web/src/app/features/setup-auth/` finds only the `tailscale` key in `steps.ts` and the `@case` in `step-body.ts`.
- **F22** Owner decision on the SAU-18 peer rule: `plans/DECISIONS.md` lines 5530 to 5536.

### 7b. Assumed (not verified)

- **A1** Angular's test runner with `vi.useFakeTimers()` and `RouterTestingHarness` can drive S3. `sse-client.spec.ts` uses fake timers with a different harness.
- **A2** A real tailscaled reports `NeedsLogin` with an empty `AuthURL` after logout (`plans/SAU-17.md` assumption A13, itself unverified).
- **A3** `https://login.tailscale.com/admin` is the Tailscale admin console. It is not in the repository and was not checked online.
- **A4** `npm test -w @bbartolome/scriba-web` and the lint run pass in this environment after a contracts build. The planner did not run them.
- **A5** The Playwright e2e suite is not run by this plan's gate. The e2e texts are kept by construction (C4, C5), not by a run.
- **A6** The installed Material `mat-slide-toggle` renders `button[role="switch"]` with `aria-checked`. The role is confirmed in the bundle; the attribute binding is not run.
- **A7** No other test renders `SetupPage` or `SettingsPage` past Access, beyond the specs listed in F12 and F14 (grep of the features and shell specs).

## 8. Review parts

**Part 1: the /setup Tailscale step (criterion 1).** Steps 1 to 4, and test W3. The reviewer checks that: the placeholder sentence is gone from `step-body.ts`; "Tailscale is unavailable." is still the exact text (C4); the panel adds no button (C5); W3 covers each listed state and the Skip; the existing assertions of W1, the providers tests and the preference tests are unchanged, and only canned answers are added (F12); the two loaders read through `mod.default ?? mod` (C2).

**Part 2: the settings page (criteria 2 and 3).** Steps 5 to 9, and tests S2 and S3. The reviewer checks that: the "Tailscale" and "Allowlist" sections exist with the names of C1; S3 tests both readings of "hidden" (OP1); the lockout text comes by code and not from the server (D14); step 9 passes, including the three navigation-only specs (F14).

Each step and each test is in exactly one part: steps 1 to 4 and W3 in Part 1; steps 5 to 9, S2 and S3 in Part 2.
