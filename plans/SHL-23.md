---
id: SHL-23
status: draft
---
# SHL-23 plan — phone bottom nav fits ten items at 390 px

Revision 1, planner draft (Haiku draft stage), checked at main `85d1cee`. Nothing is marked passed. Open points 1 and 2 need the Navigator. Points 3 and 4 need the orchestrator. Section 8 lists all of them.

## 1. Decisions this plan follows

- **D1 Change and scope.** Only the bottom form of `apps/web/src/app/shell/app-nav.ts` changes: `min-width: 0` on `nav.bottom a`, and label truncation. Source: unit lines 20 and 25; `plans/DECISIONS.md` line 6799 (Navigator decision, 2026-11-19, PLT-23 entry).
- **D2 Ten items, none hidden, no sideways scroll.** The route table and the route data do not change. Source: unit lines 21 and 22; `modules/shell.md` route table, lines 57 to 69 (ten rows with min class phone and nav yes: settings 58, providers 59, tools 60, projects 61, chat 62, review 63, files 64, graphs 65, manuscript 67, core-gate 69).
- **D3 Only the phone form.** Every new rule sits under `nav.bottom`. The rail and side forms (`app-nav.ts` lines 99 to 105 and 138 to 147) are not touched. Source: unit line 26; `app-nav.ts` lines 30 to 34 (FORMS).
- **D4 Geometry kept.** The bottom bar stays 64 px high, with the icon above the label. Source: `plans/SHL-05.md` line 40 (decision 12; SHL-05 is done, so its settled values stay); `app-nav.ts` lines 94 to 97.
- **D5 Test seam.** Layout is a browser fact: jsdom under Vitest has no layout. So criteria 1 and 2 are tested with Playwright, the system seam of `modules/shell.md` line 95. Criterion 3 names its seam in the unit (line 31). The unit's acceptance heading (line 28) has no parenthetical, so the module default applies (`units/README.md` line 57).
- **D6 Where the truncation goes.** The label is the `span` inside each link (`app-nav.ts` line 163). That span gets `max-width: 100%` as well as the three truncation properties the unit names. Reason: the base `a` rule centres its children (`align-items: center`, line 124), so a `nowrap` label sizes to its full text and spills out of its link unless its width is capped. Checked by the scratch probe, case C (section 2.2).
- **D7 The title is not changed.** The active-project title in the same row (`features/project-store/active-project-nav.ts`, PST-09's widget) is outside this unit's file (unit line 25). Its effect on the row is open point 2.
- **D8 Names.** The new spec, if approved, is `e2e/specs/nav-phone.e2e.ts`, after the `<topic>-phone.e2e.ts` names of the other phone specs. Its tests are N1 and N2 (section 6).

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
- Unit `units/SHL-23-phone-bottom-nav-fit.md`: line 7 (`blocked_by: [SHL-05]`), 9 (`unblocks: [PLT-23]`), 17 (why), 20 (decision), 21 and 22 (no overflow, no hidden item, route table), 25 (scope: app-nav.ts only), 26 (not in scope: route table, route data, tablet and desktop forms, e2e specs), 28 (criteria heading), 29 to 31 (criteria).
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

### 2.3 Assumed (not run by the planner)

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
| `e2e/specs/nav-phone.e2e.ts` | new, only if open point 1 is answered yes | the test for criteria 1 and 2 (section 6). Named and justified: criteria 1 and 2 are layout facts, which only a browser measures, and no existing spec checks all ten links. The unit puts "the e2e specs" out of scope (line 26), so the Navigator decides |

No other file. No template, TypeScript, route, package or contract change.

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
3. Red for the new spec, only if open point 1 is yes. Write `e2e/specs/nav-phone.e2e.ts` with N1 and N2 (section 6), with no CSS change yet. Run `npm run e2e -w @bbartolome/scriba-e2e -- specs/nav-phone.e2e.ts --trace off`. Expected: exit 1; N1 fails at the document check; N2 fails at its first style check. Record it.
4. Edit `apps/web/src/app/shell/app-nav.ts` as section 4. No other change.
5. Format. `npx prettier --check apps/web/src/app/shell/app-nav.ts e2e/specs/nav-phone.e2e.ts`. Expected: every file passes. For a file that fails, run `--write` on that file only.
6. Unit regression. Repeat step 1. Expected: exit 0, nine pass.
7. New spec green, only if open point 1 is yes. Repeat step 3. Expected: exit 0; N1 and N2 pass. N2 logs its measures; record them and compare them with section 3.
8. Criterion 3, the unit's command (line 31): `npm run e2e -w @bbartolome/scriba-e2e -- specs/history-phone.e2e.ts specs/review-phone.e2e.ts specs/search-phone.e2e.ts --trace off`. Expected: exit 0.
9. Phone regression: `npm run e2e -w @bbartolome/scriba-e2e -- specs/projects-phone.e2e.ts specs/providers-phone.e2e.ts specs/setup-phone.e2e.ts specs/phone-toolbar.e2e.ts --trace off`. Expected: exit 0. They passed on main in PLT-23 step 1b.
10. Full e2e regression: `npm run e2e -w @bbartolome/scriba-e2e -- --trace off`. Expected: the only failure is journey "project from sample" (PLT-23 section 2.1, not this unit). Any other failure: record it, and run that spec on main before attributing it.
11. Web unit suite: `npm test -w @bbartolome/scriba-web`. Expected: exit 0, or the same failures as on main. The nav is shared, so this step matters.
12. Lint: `npm run lint -w @bbartolome/scriba-web` and `npx prettier --check .`. Expected: exit 0.
13. Scope check: `git diff --name-only main...unit/SHL-23`. Expected: `apps/web/src/app/shell/app-nav.ts`, plus `e2e/specs/nav-phone.e2e.ts` if open point 1 is yes. Nothing else.
14. Commit on `unit/SHL-23` with the message `feat(SHL-23): phone bottom nav fits ten items at 390 px`, adding the named files only (no `git add -A`).

Stop rules: if step 2 does not show the three `documentFits` failures, stop. If step 8 fails after step 7 passed, report PLAN DOES NOT WORK with the output.

## 6. Acceptance criteria and tests

| Criterion (unit line) | Test | Command | Pass condition |
|---|---|---|---|
| 1. With the ten phone items shown, at 390 px no horizontal overflow (29) | N1 in `e2e/specs/nav-phone.e2e.ts` (new; open point 1). Also the `documentFits` checks of the three specs in criterion 3, which run with ten items on project pages | `npm run e2e -w @bbartolome/scriba-e2e -- specs/nav-phone.e2e.ts --trace off` | N1 passes |
| 2. All ten links visible, shrunk, label truncated, none hidden, nav not scrolling sideways (30) | N2 (new; open point 1) | same command | N2 passes |
| 3. The three phone specs pass (31) | the three specs | the unit's command, step 8 | exit 0 |

**N1**, title "the ten bottom nav items show at 390 by 844 and the page does not scroll sideways". Setup as history-phone lines 17 to 69: read the setup URL; write `nav-phone/project.yaml` with `title: Nav phone with a long title` and `genrePack: nonfiction`; go to `/projects`; Switch the row whose code is `nav-phone`; expect `/projects/nav-phone/chat`. Assert: the bottom navigation has ten links, and their labels in order are Chat, Projects, Review, Files, Manuscript, Graphs, Tools, Providers, Settings, Core gate (read the labels from `a > span`, so the title span is not counted); `document.documentElement.scrollWidth <= window.innerWidth`; no page error.

**N2**, title "each of the ten bottom nav links stays visible, shrunk, with its label truncated, and none overlaps the title". Same setup. For each of the ten links:
- visible, and `toBeInViewport({ ratio: 1 })` after it is scrolled into view;
- its box lies within 0 and the viewport width;
- its width is at most the `.items` width divided by 10, plus 0.5 (shrunk to its share);
- its label span has computed `text-overflow: ellipsis`, `overflow-x: hidden` and `white-space: nowrap`;
- its label box is no wider than the link box (no spill).

Also: the label "Manuscript" is truncated (`scrollWidth > clientWidth`); the nav and `.items` have `scrollWidth <= clientWidth`; the right edge of the last link is at or left of the title's left edge (no overlap; PST-20's effect). Log the link, label and title boxes as `measures ...`, in the phone-toolbar pattern (lines 19 to 27), for the record.

Both tests: a page error fails the test, as the phone specs check it. `test.afterAll` removes the `nav-phone` folder from the library. This follows PLT-23 section 9 point 7, which is a draft rule, not a settled one.

Criterion 3 passes when the command of step 8 exits 0.

Accessible names: CSS truncation does not change a link's accessible name (the label span is the name; `plans/PST-20.md` line 62). So the name lookups in review-phone (lines 117 and 118) and providers-phone (lines 63 to 65) stay valid. Step 8 checks it.

Regression checks, not criteria: app-nav.spec.ts N1 to N9 (steps 1 and 6); the four phone specs (step 9); the full e2e run (step 10); the web unit suite (step 11).

## 7. Downstream agreement

- **PLT-23** (`units/PLT-23-full-suite-e2e-failures.md` line 7, `blocked_by: [SHL-23]`). Agreed with `plans/PLT-23.md` section 8: SHL-23 merges first. PLT-23 changes `e2e/specs` only and SHL-23 changes `app-nav.ts` (plus, if approved, one new spec), so no file is shared. PLT-23's criterion 3 needs the three specs to pass on main; step 8 is that check. PLT-23's section 2.3 is then a record of the cause. Two points for PLT-23's own plan, not decided here: (a) the new spec switches the active project and removes its folder in `afterAll`, which PLT-23 section 9 points 3 and 7 cover; (b) after SHL-23 alone, the full run's failures should be journey only (step 10).
- **SHL-19** (`units/SHL-19-polish-gate.md`, no plan yet). Its phone check (line 18) and demo step 4 (line 31, "the bottom nav shows Review") read the bar with a project open. So its check meets the ten-item state with a title (section 3). Its a11y pass (line 17) covers the nav's labels, and open point 2 is for it to see. No change is asked of SHL-19 now.
- **PST-20** (done; line 157). Its replica effect, a title of 14 characters or more drawn over the last two links, is case M. This unit's CSS removes it (case N, and N2's last check). PST-20 names "the Shell's nav layout (`app-nav.ts` lines 107 to 111 and 132 to 136)" as the cause, and this unit changes that layout. PST-20 is not edited.
- **CEX-17** (done; lines 46, 112, 234). No fit test; Manuscript stays a phone item. Consistent: the route data does not change.
- **MPR-11** (done; lines 184, 209, 277). Its five-item measurement at 390 px holds for short titles (cases G to J). For titles over about 100 to 120 px the five-item labels change (case L; open point 2). The project-page layout that it left to the Shell is measured by N2, in the ten-item state.
- **SHL-05** (done; lines 40, 52, 65). Its settled values are kept: 64 px bar, icon above label, the slot after `.items`, three forms. The `app-nav.ts` line citations in done plans that fall after line 137 move by 8 with this edit. Done plans are records; no edit is proposed.
- **PST-09** (done; lines 31 and 32) and **PST-10** (done; line 190, lines 167 and 188 of `app-nav.ts`). The slot and the title are unchanged; their line citations move by 8.
- **The other plans that name `app-nav.ts`**, from the search of `plans/` and `units/`: SHL-06 (line 37), SHL-08 (lines 58, 78), SHL-09 (line 18), SHL-10, SHL-11, SHL-12 (lines 215, 282), SHL-13 (lines 66, 194), PST-20 (lines 22, 62, 157, 180), GRR-09 (lines 66, 70, 171), SAU-06 (line 233), SAU-15 (line 116), TRG-05 (line 102), AGL-07 (lines 38, 78, 93, 158). Each cites the file for spec imports, route entries, the `navItems` logic, or a test name. None sets the bar's CSS, so none needs a change. GRR-09's `Graphs` link lookup (line 171) is not affected.
- **`plans/DECISIONS.md`** names `app-nav.ts` in review and bundle-check entries (lines 2720, 3718, 4435), not in a bar-CSS decision. Line 3718 requires `shell/app-nav.ts` in the main bundle's inputs; this unit keeps the file, so that check still holds.

## 8. Open points

1. **Navigator: the scope of the test for criteria 1 and 2.** The unit puts "the e2e specs" out of scope (line 26), and no existing spec checks all ten links. Criteria 1 and 2 are layout facts, so Playwright is the only seam (D5). The plan proposes one new file, `e2e/specs/nav-phone.e2e.ts` (N1 and N2), and no edit to an existing spec. (a) Accept the new file: this plan. (b) No new file: criterion 2 has no test, and the plan cannot pass its own criterion. The new spec also joins PLT-23's full run, with the points of section 7. Not decided here.
2. **Navigator: the title in the row, and the five-item bar.** The decision's arithmetic (390 divided by 10) assumes no title. The ten-item state has one (section 3). With a 13-character title the links are about 34 px wide; with a 27-character title, about 30 px, and labels show about three characters or fewer (case N: all ten truncated). On the five-item bar the change truncates labels once the title is wider than about 100 to 120 px (case L). The title is PST-09's widget (`active-project-nav.ts` lines 25 to 32, with `max-width: 9rem`), outside this unit's file. Options, none decided: (a) accept the decision as recorded, with these labels; (b) limit the title's width on the phone bar, a change to PST-09's widget that affects PST-09's D5 and SHL-19's check; (c) keep labels whole by another rule, for example a `title` attribute on each link, which is a template change the decision does not include. This changes other units, so it is for the Navigator.
3. **Orchestrator: unit notation.** `units/SHL-23-phone-bottom-nav-fit.md` line 9 has `unblocks: [PLT-23]`, a bare id across modules. The README's convention for `unblocks` across modules is the quoted `"<Module> <title> (<ID>)"` form (`units/README.md` line 64; the AGL units use it). PLT-23's `blocked_by: [SHL-23]` is a bare id, which the README allows (line 61). This plan changes no unit. The orchestrator decides whether to requote.
4. **Orchestrator: README milestone row.** `units/README.md` line 10 gives Frontend shell "M1–M3, M7", but SHL-23 is M4 (unit line 6; README line 87). Not changed here.
5. **Probe font.** The probe uses Arial, which is 6 to 9 percent wider than PLT-23's measured labels. The implementer records the real widths in N2's log and compares them with section 3. Recorded, not decided.

## 9. Review parts

One part. The change is one CSS block in one file, plus the optional new spec. The reviewer checks the diff of `app-nav.ts` against section 4, and the outputs of steps 2, 3, 7, 8, 9 and 10 against section 6.
