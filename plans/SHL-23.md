---
id: SHL-23
status: planned
---
# SHL-23 plan — phone bottom nav fits ten items at 390 px

Revision 1, planner draft (Haiku draft stage), checked at main `85d1cee`. Nothing is marked passed. Open points 1 and 2 need the Navigator. Points 3 and 4 need the orchestrator. Section 8 lists all of them.

Revision 2, reviser (Opus), 2026-11-19, checked at main `28a07e2` (`app-nav.ts`, `app.routes.ts`, `active-project-nav.ts` and the e2e specs are unchanged since `85d1cee`). Corrections: open point 2 is settled by the reviser, option (a) (D7, section 8); open point 1 stays with the Navigator, because a test file for criteria 1 and 2 is outside the unit's Scope (lines 25 and 26) and no reviser action can add it (section 8); one test per criterion (section 6: the `documentFits` checks of the three specs are no longer a second test of criterion 1); N2's overflow check is restated as the criterion says it (the nav does not scroll sideways), and the icon-width fact is checked (section 2.2); step 10 is correct in either merge order with PLT-23; section 7 gives the effects of the new spec on PLT-23's counts and order; section 9 names the steps and tests of the one part. No unit file changed.

Revision 3, reviser (Opus), 2026-11-20, checked at main `c28a1ab` (`app-nav.ts` lines 132 to 136, 124, 163 and 167, `app.routes.ts` nav entries and the e2e specs unchanged; 17 spec files, 24 tests). The Navigator decisions of 2026-11-20 (`plans/DECISIONS.md`, "SHL-23 — Navigator decisions") are applied: point 1, option (a), the new spec `e2e/specs/nav-phone.e2e.ts` is in the Scope (unit lines 25 and 26 changed in commit `c28a1ab`), so every "only if open point 1" condition is removed; point 2, option (a), ratified (D7). Corrections: N1's `project.yaml` has `schemaVersion: 1`, as the other phone specs write it (history-phone line 36); step 12 lints the e2e workspace too, since the new spec is there; step 10's expected test count is read from the branch (GRR-15, planned, adds e2e specs and may reach main first); open points 3 and 4 are decided by the reviser (section 8).

## 1. Decisions this plan follows

- **D1 Change and scope.** Only the bottom form of `apps/web/src/app/shell/app-nav.ts` changes: `min-width: 0` on `nav.bottom a`, and label truncation. Source: unit lines 20 and 25 ("the production change, in this file only"); `plans/DECISIONS.md` line 6799 (Navigator decision, 2026-11-19, PLT-23 entry) and the SHL-23 entry of 2026-11-20, point 1 (the "only" of line 6799 concerns the production change).
- **D2 Ten items, none hidden, no sideways scroll.** The route table and the route data do not change. Source: unit lines 21 and 22; `modules/shell.md` route table, lines 57 to 69 (ten rows with min class phone and nav yes: settings 58, providers 59, tools 60, projects 61, chat 62, review 63, files 64, graphs 65, manuscript 67, core-gate 69).
- **D3 Only the phone form.** Every new rule sits under `nav.bottom`. The rail and side forms (`app-nav.ts` lines 99 to 105 and 138 to 147) are not touched. Source: unit line 26; `app-nav.ts` lines 30 to 34 (FORMS).
- **D4 Geometry kept.** The bottom bar stays 64 px high, with the icon above the label. Source: `plans/SHL-05.md` line 40 (decision 12; SHL-05 is done, so its settled values stay); `app-nav.ts` lines 94 to 97.
- **D5 Test seam.** Layout is a browser fact: jsdom under Vitest has no layout. So criteria 1 and 2 are tested with Playwright, the system seam of `modules/shell.md` line 95. Criterion 3 names its seam in the unit (line 31). The unit's acceptance heading (line 28) has no parenthetical, so the module default applies (`units/README.md` line 57).
- **D6 Where the truncation goes.** The label is the `span` inside each link (`app-nav.ts` line 163). That span gets `max-width: 100%` as well as the three truncation properties the unit names. Reason: the base `a` rule centres its children (`align-items: center`, line 124), so a `nowrap` label sizes to its full text and spills out of its link unless its width is capped. Checked by the scratch probe, case C (section 2.2).
- **D7 The title is not changed.** The active-project title in the same row (`features/project-store/active-project-nav.ts`, PST-09's widget) is outside this unit's file (unit line 25). Its effect on the row was open point 2: option (a), ratified by the Navigator on 2026-11-20 (`plans/DECISIONS.md`, "SHL-23 — Navigator decisions", point 2). The decision is applied as recorded. The title keeps its CSS; on a project page the ten links share what the title leaves, and on an app-level page with a long title (over about 100 to 120 px) the five-item labels truncate too. Reason: it is the simplest option the unit allows. The unit's decisions (lines 20 and 21) choose truncation and say nothing about whole labels; no criterion of SHL-23, PLT-23 or any other unit checks a visible label text of the bottom bar (`providers-phone` and `review-phone` look links up by accessible name, which CSS truncation does not change; `plans/PST-20.md` line 62); and options (b) and (c) change files outside the Scope (PST-09's widget, or the template's link attributes beyond the bottom form's CSS). SHL-19's a11y pass (its unit line 17) will see the labels; nothing is asked of it now.
- **D8 The new spec.** `e2e/specs/nav-phone.e2e.ts` (unit line 25; Navigator decision of 2026-11-20, point 1), named after the `<topic>-phone.e2e.ts` names of the other phone specs. Its tests are N1 and N2 (section 6). No existing spec is edited (unit line 26).

## 2. Facts checked and facts assumed

### 2.1 Checked (file and line, at main `85d1cee`)

Nav component, `apps/web/src/app/shell/app-nav.ts`:
- FORMS 30 to 34. `navItem` 36 to 46. `navItems` 52 to 73; project children only when the URL has a project id (lines 55 and 56).
- `nav.bottom` 94 to 97. `.items` 107 to 111 (`flex: 1 1 auto; min-width: 0`). `nav.bottom .items` 113 to 115. Base `a` 122 to 130, with `align-items: center` at line 124. `nav.bottom a` 132 to 136 (`flex: 1 1 0`, column, 12 px, no min-width). `nav.rail a` 138 to 142. `nav.side a` 144 to 147.
- Template 153 to 169: `nav` 154, `.items` 155, link 157 to 164, label `<span>` 163, `nav-project` slot 167. `export class AppNav` 171. `items` computed 182 to 189.
- No commit since 84e25db changed this file (`git log 6deb543^..main -- apps/web/src/app/shell/app-nav.ts` is empty). CEX-17 (6deb543) changed no nav file.

Route data, `apps/web/src/app/app.routes.ts`: `nav` entries at lines 18 (Chat, order 10), 31 (Files, 30), 44 (Review, 25), 56 (Graphs, 35), 69 (Manuscript, 32), 108 (Core gate, 100), 133 (Settings, 90), 146 (Projects, 20), 159 (Tools, 40), 172 (Providers, 50). Line 120 is `/setup`: phone, no nav. So ten phone nav items: five app-level (Projects, Providers, Tools, Settings, Core gate) and five project items (Chat, Files, Review, Graphs, Manuscript).

Active-project title:
- `features/project-store/active-project-nav.ts`: host flex with `min-width: 0` (lines 19 to 23); span with `min-width: 0; max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px` (lines 25 to 32); renders only with a label (lines 35 to 37).
- `features/project-store/projects-state.ts` lines 44 to 51: `activeLabel` is the active project's title, or its id, from the server's list. It is not read from the URL, so it can show on app-level pages too.
- `apps/web/src/app/app.html` line 7 puts the widget in the nav slot.
- `plans/PST-09.md` line 32 (D5): the title shows on any page once the list has been read in this tab.

Phone specs, `e2e/specs/`:
- history-phone: viewport line 7; Switch 63 to 68; `documentFits` 85 to 88. Ten items at a project URL.
- review-phone: viewport line 8; Review link by `getByRole('navigation', { name: 'Bottom navigation' })`, lines 116 to 118; `documentFits` 190 to 193.
- search-phone: viewport line 7; `documentFits` 77 to 80.
- providers-phone: viewport line 7; Providers link, lines 63 to 65 (app level, five items); `documentFits` 111 to 114.
- projects-phone: viewport line 7; `documentFits` line 82 at `/projects` (five items). It uses no nav link.
- setup-phone: viewport line 6; host and document checks, lines 27 to 35, at `/setup` (five items).
- phone-toolbar: viewport line 8; visits `/core-gate` (lines 68 and 79; five items, no project items); measures the toolbar and logs `measures` (lines 19 to 27).
- So the nav's width matters to history, review and search through `documentFits` (ten items), to providers-phone through a link lookup, and not at all to projects-phone, setup-phone or phone-toolbar beyond five items (section 3).

Unit, module and README:
- Unit `units/SHL-23-phone-bottom-nav-fit.md`: line 7 (`blocked_by: [SHL-05]`), 9 (`unblocks: [PLT-23]`), 17 (why), 20 (decision), 21 and 22 (no overflow, no hidden item, route table), 25 (scope: app-nav.ts, the production change in this file only, and the new spec `e2e/specs/nav-phone.e2e.ts` for criteria 1 and 2; changed at `c28a1ab`), 26 (not in scope: route table, route data, tablet and desktop forms, the existing e2e specs), 28 (criteria heading), 29 to 31 (criteria).
- `modules/shell.md`: route table 53 to 69; testing principles 91 to 96 (seam: Vitest, line 93; system: Playwright, line 95); line 109 "Features declare only a class, never pixel widths".
- `units/README.md`: line 10 (Shell milestones), line 57 (heading parenthetical), lines 61 to 65 (blocker notation; line 64 the unblocks convention), line 87 (SHL-23 row).

Settled values of other units (done units keep them):
- `plans/SHL-05.md` line 40 (bar 64 px high, icon above label), line 52 (decision 22: slot after `.items`), line 65 (file table).
- `plans/CEX-17.md` line 46 (P14: no 390 px fit test; the nav's layout is a Shell file), line 112 (F52), line 234 (decision 3).
- `plans/MPR-11.md` lines 184 and 209 (the five-item bar is measured at 390 px; the seven-item bar is the Shell's and is not measured there), line 277 (A5).
- `plans/PST-09.md` lines 31 and 32 (D4 slot, D5 title).
- `plans/PST-20.md` line 62 (the accessible name is the label alone: `MatIcon` sets `aria-hidden`), line 157 (replica: a title of 14 characters or more is drawn over the last two links, Settings and Core gate).

PLT-23:
- `plans/PLT-23.md` lines 56 to 65 (section 2.3): at 6deb543 and 390 px, nav `scrollWidth` 431; the ten link widths 32, 50, 45, 32, 63, 43, 35, 54, 47, 32 px (they sum to 433; the 2 px difference is PLT-23's rounding and is not used here). No other element overflows: with Manuscript hidden at 25578b3 the three specs pass.
- `units/PLT-23-full-suite-e2e-failures.md` line 7 (`blocked_by: [SHL-23]`).
- `plans/PLT-23.md` section 8 (SHL-23 bullet: no shared file, SHL-23 first) and section 9, points 3 and 7 (active project after cleanups; the rule for future specs).
- `plans/DECISIONS.md` lines 6781 to 6795 (PLT-23 step 1b on main at c52b2b4): history-phone, journey, review-phone and search-phone fail; the other phone specs and tools-preview C2 pass.

Harness and tests:
- `e2e/harness/global-setup.ts` line 15 (port 8080), line 43 (a server already on 8080 would pass the health wait), lines 60 to 70 (builds contracts, api and web before each run, so a run serves the new CSS).
- `e2e/playwright.config.ts` line 13 (`workers: 1`), line 20 (baseURL), line 21 (trace). `e2e/package.json` line 10 (`playwright test`).
- `apps/web/src/app/shell/app-nav.spec.ts` lines 136 to 224 (N1 to N9: form label, hrefs, project item, slot; no layout or style assertion).
- The web unit command used in this repo, `plans/MPR-11.md` line 128: `npm test -w @bbartolome/scriba-web -- --include <file>`.
- `plans/DECISIONS.md` line 4435: `app-nav.spec.ts` failed 9 of 9 with "window is not defined" in a run outside the Angular test builder. Run it through `npm test`.
- `units/SHL-19-polish-gate.md` lines 17 (a11y pass), 18 (phone check), 22 (criterion), 31 (demo step 4: the bottom nav shows Review). There is no `plans/SHL-19.md`.

Other plans and units naming `app-nav.ts` or `nav.bottom`: the search of `plans/` and `units/` is in section 7. The `nav.bottom` rule is named only in PLT-23's plan (lines 61 to 72), the SHL-23 unit, and `plans/DECISIONS.md` line 6799 and its neighbours.

### 2.2 Scratch probe (checked; not in the repo, not committed)

`/tmp/shl23-probe/probe.cjs` and `probe2.cjs` reproduce the nav's DOM, the base rules of `app-nav.ts` (lines 89 to 136) and the title's CSS (`active-project-nav.ts` lines 19 to 32), in a 390 px page, run with the repo's Playwright and the cached Chromium. The font is Arial. It is 6 to 9 percent wider than the app's labels in PLT-23's measurements (the ten-link sum is 460 px against 433 px; `Providers` at 58.7 px against 54 px). So the numbers below are estimates. The probe checks the mechanism.

| Case | Items | Title | Result |
|---|---|---|---|
| A, current CSS | ten | none | links keep their min-content width; document 460 px (overflow) |
| B, current CSS | ten | "Phone history" | links at min-content; document 460 px; the title shrinks to 51 px |
| M, current CSS | ten | 27 characters (138 px, shrinks to 88 px) | links run under the title by 157 px (the PST-20 effect); document 460 px |
| C, proposed without `max-width` | ten | "Phone history" | document 390 px, but label boxes up to 25 px wider than their links (spill) |
| D, proposed (section 4) | ten | "Phone history" | links 33.9 px each; labels 25 to 26 px, inside their links; document 390 px |
| N, proposed | ten | 27 characters | links 30.2 to 30.3 px; all ten labels truncated; no overlap; document 390 px |
| E, proposed | ten | none | links 39 px each; labels 25 to 31 px |
| G current, H proposed | five | "Phone history" | identical: links 63.3 px each |
| I current, J proposed | five | none | identical: links 78 px each |
| K, current CSS | five | 27 characters (138 px) | links unequal, 45 to 59 px; no label truncated |
| L, proposed | five | 27 characters | links equal at 50.5 px; Projects, Providers, Settings and Core gate truncated |

Reviser check (2026-11-19, scratch copy of the probe in `/tmp/shl23-rev/`, not in the repo): with the proposed CSS and the ten labels, the 24 px icon is wider than a link's content box only in case N (by 1.8 px, the 4 px padding absorbs it; the icon stays inside the link's border box). `.items` `scrollWidth` equals its `clientWidth` in cases N (302), D (339) and E (390), and the nav's is 390 of 390 in all three. So N2's nav check below holds with the icon.

### 2.3 Checked by the reviser at main `28a07e2`

- Unit lines 17 to 31 as cited; front matter lines 7 and 9. `modules/shell.md` route table lines 57 to 69 (ten rows phone and nav yes, as D2 lists). `app.routes.ts` nav entries and orders at the ten lines of section 2.1. `app-nav.ts`: `align-items: center` line 124, `nav.bottom a` 132 to 136, label `<span>` 163, slot 167; last commits to the file `dfab234` (SHL-08) and `aa1218d` (SHL-05). `active-project-nav.ts` lines 19 to 32 as cited.
- The web unit tests run in jsdom (`apps/web/package.json` line 44 `jsdom`; `angular.json` line 76 `@angular/build:unit-test`), so a Vitest test cannot measure criteria 1 and 2 (D5).
- Other unit scopes name their test files explicitly (`units/SHL-20-phone-toolbar.md` Scope: "One e2e spec file that runs the criterion"; `units/SHL-21-contract-chunks-interop.md` Scope: the source and its new spec). SHL-23's Scope named `app-nav.ts` only and excluded "the e2e specs" (open point 1). Since `c28a1ab` it names the new spec and excludes the existing e2e specs (Navigator, 2026-11-20).
- Draft and planned plans: CEX-14, GNP-15, GRR-15, PLT-23 and this plan. Only PLT-23 names `app-nav.ts` or `nav.bottom`; GRR-15 adds three `graph-*.e2e.ts` specs and no nav file. Branches: `unit/PLT-23`, `unit/GRR-15`, `unit/GNP-15` and backups; no `unit/SHL-23`.
- `plans/PLT-23.md` (planned): step 0 (line 162) refuses to start until `plans/SHL-23.md` is `status: done` on main; step 1b (line 164) expects "1 failed, 23 passed"; step 5 (line 172) expects "24 passed", with "If the total is different, record the list and the count"; section 8 (line 212) and open points 3 and 7 (lines 219 and 223).

### 2.4 Assumed (not run by the planner or the reviser)

- The app's real label widths are PLT-23's measurements (section 2.1). The planner did not re-measure them in the app.
- No element other than the nav overflows on the three pages at 390 px (PLT-23 section 2.3 checked this at 25578b3).
- The implementer's Playwright and Chromium run the e2e specs. The cache holds chromium-1254; nothing was run here.

## 3. The arithmetic

The bar's row holds the `.items` box (the ten links) and, once a project page has read the list, the title box. Both have `flex-shrink: 1`. Today each link has `flex: 1 1 0` with `min-width: auto`, so none can shrink below its min-content width: the widest word of its label, plus 8 px of padding. The links then keep the widths PLT-23 measured (433 px), and the row overflows (case A).

With `min-width: 0` the links take an equal share of what the title leaves. The title's maximum is 9 rem (144 px), and it shrinks with the links. The ten-item state is a project page, so the title is in the row. What the links get:

- No title: 39 px each, labels about 25 to 31 px wide (case E). This is the Navigator's arithmetic, 390 divided by 10.
- Title "Phone history" (the e2e specs' titles): links about 34 px each, label area about 26 px (case D).
- Title of 27 characters: links about 30 px, label area about 22 px; all ten labels truncated (case N).

At those widths the labels show about three characters: "Projects" and "Providers" both begin with "Pro". That is open point 2.

On the five-item bar (app-level pages), the equal share is (390 px minus the title) divided by 5. The labels stay whole while that share is at least the widest label's link (Providers: about 54 px in PLT-23's font, about 59 px in the probe). That holds for titles up to about 100 to 120 px (cases G to J). A longer title makes the five-item bar truncate labels that fit on main (case L). The Navigator's decision does not mention this. It is open point 2.

The overlap that PST-20 recorded (`plans/PST-20.md` line 157) is case M on main: the links run under the title. The proposed CSS removes it (case N). The links shrink and the title shrinks instead.

Why the label cap (D6): case C. Without `max-width: 100%` the labels spill out of their links; with it they truncate inside them (case D).

## 4. Files to change

| Path | Change | Why |
|---|---|---|
| `apps/web/src/app/shell/app-nav.ts` | edit: `min-width: 0;` added to `nav.bottom a` (lines 132 to 136), and a new `nav.bottom a span` rule after it | the fix (D1, D6) |
| `e2e/specs/nav-phone.e2e.ts` | new | the test for criteria 1 and 2, N1 and N2 (section 6). Unit line 25 names it. Criteria 1 and 2 are layout facts, which only a browser measures, and no existing spec checks all ten links |

No other file. No existing e2e spec is edited (unit line 26). No template, TypeScript, route, package or contract change.

The exact CSS, replacing lines 132 to 136 (the rest of the style block is unchanged; indentation as in the file):

```css
    nav.bottom a {
      flex: 1 1 0;
      flex-direction: column;
      font-size: 12px;
      min-width: 0;
    }

    nav.bottom a span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
```

After the edit, lines 138 and below move down by 8. The new positions: `nav.rail a` 146; slot 175; `export class AppNav` 179; `items` computed 190; sort 196. Check with grep, not by these numbers alone.

## 5. Procedure

Branch: `unit/SHL-23`, created from `main` in a worktree whose path the orchestrator names (the convention of `unit/PLT-23`). Record `node -v` and `npm -v`. Before the first run, check that nothing listens on port 8080 (harness line 43).

1. Baseline unit. `npm test -w @bbartolome/scriba-web -- --include src/app/shell/app-nav.spec.ts`. Expected: exit 0, nine tests pass (N1 to N9). Record it.
2. Baseline e2e, red. `npm run e2e -w @bbartolome/scriba-e2e -- specs/history-phone.e2e.ts specs/review-phone.e2e.ts specs/search-phone.e2e.ts --trace off`. Expected: exit 1, and each of the three fails at its `documentFits` line (88, 193 and 80). Record it. If the failures differ, stop: the premise is wrong.
3. Red for the new spec. Write `e2e/specs/nav-phone.e2e.ts` with N1 and N2 (section 6), with no CSS change yet. Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/nav-phone.e2e.ts --trace off`. Expected: exit 1; N1 fails at the document check; N2 fails at its first style check. Record it.
4. Edit `apps/web/src/app/shell/app-nav.ts` as section 4. No other change.
5. Format. `npx prettier --check apps/web/src/app/shell/app-nav.ts e2e/specs/nav-phone.e2e.ts`. Expected: every file passes. For a file that fails, run `--write` on that file only.
6. Unit regression. Repeat step 1. Expected: exit 0, nine pass.
7. New spec green. Repeat step 3. Expected: exit 0; N1 and N2 pass. N2 logs its measures; record them and compare them with section 3.
8. Criterion 3, the unit's command (line 31): `npm run e2e -w @bbartolome/scriba-e2e -- specs/history-phone.e2e.ts specs/review-phone.e2e.ts specs/search-phone.e2e.ts --trace off`. Expected: exit 0.
9. Phone regression: `npm run e2e -w @bbartolome/scriba-e2e -- specs/projects-phone.e2e.ts specs/providers-phone.e2e.ts specs/setup-phone.e2e.ts specs/phone-toolbar.e2e.ts --trace off`. Expected: exit 0. They passed on main in PLT-23 step 1b.
10. Full e2e regression: `npm run e2e -w @bbartolome/scriba-e2e -- --trace off`. Expected, on a branch from a main without PLT-23 (the expected order: PLT-23's step 0 waits for SHL-23 to be done): exit 1, and the only failure is journey "project from sample" at `journey.e2e.ts:204` (PLT-23 section 2.1, not this unit); TRG-05 C2 passes (PLT-23 step 1b at c52b2b4). If PLT-23 is already on main when the branch is made: exit 0, no failure. The total is the count of `grep -hE '^\s*test\(' e2e/specs/*.e2e.ts | wc -l` on the branch: 26 on a branch from main `c28a1ab` (24 plus N1 and N2), more if GRR-15's specs reached main first (its plan adds three); record the count and the list. Any other failure: record it, and run that spec on main before attributing it.
11. Web unit suite: `npm test -w @bbartolome/scriba-web`. Expected: exit 0, or the same failures as on main. The nav is shared, so this step matters.
12. Lint: `npm run lint -w @bbartolome/scriba-web`, `npm run lint -w @bbartolome/scriba-e2e` (the new spec) and `npx prettier --check .`. Expected: exit 0 each.
13. Scope check: `git diff --name-only main...unit/SHL-23`. Expected: `apps/web/src/app/shell/app-nav.ts` and `e2e/specs/nav-phone.e2e.ts`. Nothing else.
14. Commit on `unit/SHL-23` with the message `feat(SHL-23): phone bottom nav fits ten items at 390 px`, adding the named files only (no `git add -A`).

Stop rules: if step 2 does not show the three `documentFits` failures, stop. If step 8 fails after step 7 passed, report PLAN DOES NOT WORK with the output.

## 6. Acceptance criteria and tests

| Criterion (unit line) | Test | Command | Pass condition |
|---|---|---|---|
| 1. With the ten phone items shown, at 390 px no horizontal overflow (29) | N1 in `e2e/specs/nav-phone.e2e.ts` (new). The `documentFits` checks of the three specs also run with ten items, but they are criterion 3's test, not a second test of criterion 1 | `npm run e2e -w @bbartolome/scriba-e2e -- specs/nav-phone.e2e.ts --trace off` | N1 passes |
| 2. All ten links visible, shrunk, label truncated, none hidden, nav not scrolling sideways (30) | N2 in `e2e/specs/nav-phone.e2e.ts` (new) | same command | N2 passes |
| 3. The three phone specs pass (31) | the three specs | the unit's command, step 8 | exit 0 |

**N1**, title "the ten bottom nav items show at 390 by 844 and the page does not scroll sideways". Setup as history-phone lines 17 to 69: read the setup URL; write `nav-phone/project.yaml` with `schemaVersion: 1`, `title: Nav phone with a long title` (27 characters, case N of section 2.2) and `genrePack: nonfiction`, as history-phone line 36 does; go to `/projects`; Switch the row whose code is `nav-phone`; expect `/projects/nav-phone/chat`. Assert: the bottom navigation has ten links, and their labels in order are Chat, Projects, Review, Files, Manuscript, Graphs, Tools, Providers, Settings, Core gate (read the labels from `a > span`, so the title span is not counted); `document.documentElement.scrollWidth <= window.innerWidth`; no page error.

**N2**, title "each of the ten bottom nav links stays visible, shrunk, with its label truncated, and none overlaps the title". Same setup. For each of the ten links:
- visible, and `toBeInViewport({ ratio: 1 })` after it is scrolled into view;
- its box lies within 0 and the viewport width;
- its width is at most the `.items` width divided by 10, plus 0.5 (shrunk to its share);
- its label span has computed `text-overflow: ellipsis`, `overflow-x: hidden` and `white-space: nowrap`;
- its label box is no wider than the link box (no spill).

Also: the label "Manuscript" is truncated (`scrollWidth > clientWidth`); the nav does not scroll sideways: its `scrollWidth <= clientWidth`, and the computed `overflow-x` of the nav and of `.items` is neither `auto` nor `scroll` (the icon may exceed a link's content box by up to 2 px but stays inside the link, section 2.2); the right edge of the last link is at or left of the title's left edge (no overlap; PST-20's effect). Log the link, label and title boxes as `measures ...`, in the phone-toolbar pattern (lines 19 to 27), for the record.

Both tests: a page error fails the test, as the phone specs check it. `test.afterAll` removes the `nav-phone` folder from the library. This follows PLT-23 section 9 point 7, which is a draft rule, not a settled one.

Criterion 3 passes when the command of step 8 exits 0.

Accessible names: CSS truncation does not change a link's accessible name (the label span is the name; `plans/PST-20.md` line 62). So the name lookups in review-phone (lines 117 and 118) and providers-phone (lines 63 to 65) stay valid. Step 8 checks it.

Regression checks, not criteria: app-nav.spec.ts N1 to N9 (steps 1 and 6); the four phone specs (step 9); the full e2e run (step 10); the web unit suite (step 11).

## 7. Downstream agreement

- **PLT-23** (`units/PLT-23-full-suite-e2e-failures.md` line 7, `blocked_by: [SHL-23]`). Agreed with `plans/PLT-23.md` section 8: SHL-23 merges first. PLT-23 changes `e2e/specs` only and SHL-23 changes `app-nav.ts` and adds one new spec, `nav-phone.e2e.ts`, which PLT-23's section 4 does not touch, so no file is shared. PLT-23's criterion 3 needs the three specs to pass on main; step 8 is that check. PLT-23's section 2.3 is then a record of the cause. Two points for PLT-23's own plan, not decided here: (a) the new spec switches the active project and removes its folder in `afterAll`, which PLT-23 section 9 points 3 and 7 cover; (b) after SHL-23 alone, the full run's failures should be journey only (step 10).
  Effects of `nav-phone.e2e.ts` on `plans/PLT-23.md`, checked against its lines 162 to 172: the full run has 18 spec files and 26 tests instead of 17 and 24 (on main `c28a1ab`; GRR-15's three new specs add to both if GRR-15 reaches main first), so PLT-23 step 1b sees "1 failed, 25 passed" (its text says 23 passed; the pass condition there is the failure list, which does not change) and step 5 sees "26 passed" (its text says 24, and it already says to record the list and the count when the total differs). The file sorts after `journey.e2e.ts` (`j` before `n`), so its project folder cannot reach journey's `entries` check, and its `afterAll` removes the folder for the specs after it. Like history-phone after PLT-23, it leaves the active project naming a removed folder until the next Switch (PLT-23 open point 3, the same situation). No file is shared, so the two branches merge in either order without conflict (PLT-23 step 0 makes SHL-23 first in any case); PLT-23's plan is planned and in the pipeline (`unit/PLT-23` exists), so it is not edited here: the count is a record for its implementer.
- **SHL-19** (`units/SHL-19-polish-gate.md`, no plan yet). Its phone check (line 18) and demo step 4 (line 31, "the bottom nav shows Review") read the bar with a project open. So its check meets the ten-item state with a title (section 3). Its a11y pass (line 17) covers the nav's labels, which are truncated as D7 settles. No change is asked of SHL-19 now.
- **PST-20** (done; line 157). Its replica effect, a title of 14 characters or more drawn over the last two links, is case M. This unit's CSS removes it (case N, and N2's last check). PST-20 names "the Shell's nav layout (`app-nav.ts` lines 107 to 111 and 132 to 136)" as the cause, and this unit changes that layout. PST-20 is not edited.
- **CEX-17** (done; lines 46, 112, 234). No fit test; Manuscript stays a phone item. Consistent: the route data does not change.
- **MPR-11** (done; lines 184, 209, 277). Its five-item measurement at 390 px holds for short titles (cases G to J). For titles over about 100 to 120 px the five-item labels change (case L; accepted, D7). The project-page layout that it left to the Shell is measured by N2, in the ten-item state.
- **SHL-05** (done; lines 40, 52, 65). Its settled values are kept: 64 px bar, icon above label, the slot after `.items`, three forms. The `app-nav.ts` line citations in done plans that fall after line 137 move by 8 with this edit. Done plans are records; no edit is proposed.
- **PST-09** (done; lines 31 and 32) and **PST-10** (done; line 190, lines 167 and 188 of `app-nav.ts`). The slot and the title are unchanged; their line citations move by 8.
- **The other plans that name `app-nav.ts`**, from the search of `plans/` and `units/`: SHL-06 (line 37), SHL-08 (lines 58, 78), SHL-09 (line 18), SHL-10, SHL-11, SHL-12 (lines 215, 282), SHL-13 (lines 66, 194), PST-20 (lines 22, 62, 157, 180), GRR-09 (lines 66, 70, 171), SAU-06 (line 233), SAU-15 (line 116), TRG-05 (line 102), AGL-07 (lines 38, 78, 93, 158). Each cites the file for spec imports, route entries, the `navItems` logic, or a test name. None sets the bar's CSS, so none needs a change. GRR-09's `Graphs` link lookup (line 171) is not affected.
- **`plans/DECISIONS.md`** names `app-nav.ts` in review and bundle-check entries (lines 2720, 3718, 4435), not in a bar-CSS decision. Line 3718 requires `shell/app-nav.ts` in the main bundle's inputs; this unit keeps the file, so that check still holds.

## 8. Open points

1. **The scope of the test for criteria 1 and 2. Settled by the Navigator on 2026-11-20, option (a)** (`plans/DECISIONS.md`, "SHL-23 — Navigator decisions", point 1). One new Playwright spec, `e2e/specs/nav-phone.e2e.ts`, holds N1 (criterion 1) and N2 (criterion 2). No existing spec is edited. The unit's Scope says so since `c28a1ab` (lines 25 and 26). The PLT-23 decision's "only" (line 6799) concerns the production change, which stays in `app-nav.ts`.
2. **The title in the row, and the five-item bar. Settled: option (a), ratified by the Navigator on 2026-11-20** (same entry, point 2); see D7. With a 13-character title the links are about 34 px wide; with a 27-character title, about 30 px, and labels show about three characters or fewer (case N). On the five-item bar the change truncates labels once the title is wider than about 100 to 120 px (case L). The title keeps its CSS; `active-project-nav.ts` is not changed.
3. **Unit notation: `unblocks: [PLT-23]` across modules. Decided by the reviser (revision 3): no change.** The README's convention for `unblocks` across modules is the quoted `"<Module> <title> (<ID>)"` form (`units/README.md` line 64), but the same line makes `blocked_by` the source of truth, and PLT-23's `blocked_by: [SHL-23]` (its line 7) is correct. The bare form across modules already exists in the repository (`units/GNP-11-nonfiction-sample-entities.md` line 9 names `PLT-22`). Requoting is none of the four reviser actions, and it is not in the way of any plan, so the simplest option is to leave the line as it is. No unit file is changed for it.
4. **README milestone row. Decided by the reviser (revision 3): no change.** `units/README.md` line 10 gives Frontend shell "M1–M3, M7", while SHL-23 is M4 (unit line 6; README phase table line 87 says M4). The Modules table's column is a summary, and the phase table row (line 87) already records M4. The repository has the same case for Platform: line 9 gives "M1–M2 (examples check through M6)", and PLT-23 is M4 (`units/PLT-23-full-suite-e2e-failures.md` line 6). A reviser changes `units/README.md` only for a split, and the row is not in the way of any plan, so the simplest option is to leave it.
5. **Probe font.** The probe uses Arial, which is 6 to 9 percent wider than PLT-23's measured labels. The implementer records the real widths in N2's log and compares them with section 3. Recorded, not decided.

## 9. Review parts

One part. The change is one CSS block in one file and one new spec.

- **Part 1: the phone bottom nav fit.** Steps 1 to 14 of section 5 (baselines, the red spec, the `app-nav.ts` edit, format, the green spec, criterion 3, the phone and full regressions, the web unit suite, lint, the scope check, the commit), with the tests of all three criteria: N1 in `e2e/specs/nav-phone.e2e.ts` (criterion 1), N2 in the same file (criterion 2), and the three specs `history-phone.e2e.ts`, `review-phone.e2e.ts` and `search-phone.e2e.ts` run by the unit's command (criterion 3, step 8). The reviewer checks the diff of `app-nav.ts` against section 4, `nav-phone.e2e.ts` against N1 and N2 of section 6, that no existing spec changed (step 13), and the outputs of steps 2, 3, 7, 8, 9 and 10 against section 6.
