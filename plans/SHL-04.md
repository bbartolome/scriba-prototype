---
id: SHL-04
status: done
---

# SHL-04 plan — theming, theme toggle and notices service

Batch: [SHL-02, SHL-03, SHL-04] (main track, phase:core, M1). Revision 2. Status stays `draft` until an Opus plan review approves it. Revision 2 applies the five items of the Opus rejection of revision 1 (rejection 1, DECISIONS 2026-11-13, commit 6ba529b). The changes are: the three theme tests run through the rendered `App` (section 4, T1 to T3; decision 13); the `MatSnackBar` citation is corrected (decision 7, step 2); the browser check filters all three forwarded prefixes and records the SHL-03 caveat (step 9); the toggle is neutral and the toolbar spacer lives in `app.html` and `app.css` (decision 4, section 2); the palette-line wording is corrected (decision 1). The base is `main` at `248f39d`; `git diff --quiet c2c498c HEAD -- apps/web` exits 0, so the web code read here is the code SHL-01 merged. The SHL-02 and SHL-03 plans are not on `main` yet. Section 2 names every shared file and the rule each sibling follows, so the batch merges in either order.

## 1. Decisions this plan follows

Each item is FACT (checked in this session, with the check named) or ASSUMED (a step in section 3 tests it). Items marked "Decision" are choices of this plan; each one is ASSUMED and a named step tests it.

1. **Follow the OS by default.** Unit line 15 ("default follows `prefers-color-scheme`") is met with CSS `color-scheme: light dark` on `html`, not a `matchMedia` listener. FACT: `node_modules` has no `@angular` yet, so the source is the cached 22.2.7 tarball `/tmp/shl01-cache/angular/mat/package/core/tokens/_system.scss`. A `primary`/`tertiary` map with no `theme-type` takes the branch at lines 64 to 66, which sets `theme-type: color-scheme`. `material-theme.scss` passes such a map (its `color` value, lines 12 to 15). A bare palette takes the other branch, which sets `theme-type` at line 82; this project does not use that branch. Lines 248 to 253 emit `light-dark(...)` for each `--mat-sys-*` colour. FACT (read): `apps/web/src/material-theme.scss` line 26 sets `color-scheme: light;` on `body`, which pins the app to light today.
2. **Override in device-local storage.** Key `scriba.theme`, value `light` or `dark`. No key means "follow the OS" and the service removes the key for that choice. Source: unit line 15 (device-local; no server preference); `modules/shell.md` line 94 (no server-side per-user preferences); `units/SAU-09-setup-flow-api.md` line 20 ("Theme is device-local (Shell local storage)"). Reads are wrapped in try/catch, because storage can throw. ASSUMED (Decision; tested by criterion 1 tests T1 to T3 and step 9).
3. **The choice is an attribute on `<html>`.** The service sets `data-theme` to `light` or `dark`, or removes it; the stylesheet maps the attribute to `color-scheme`. The attribute is set with `setAttribute` and `removeAttribute`, because `apps/web/tsconfig.json` sets `noPropertyAccessFromIndexSignature`, which rejects `dataset.theme`. FACT (probe): `/tmp/shl04-probe/probe.mjs` with `/tmp/shl04-probe/site/index.html`, run in Google Chrome for Testing 158.0.8127.18 through `@playwright/test` 1.65.0 (a scratch install in `/tmp/shl04-probe`, outside the repo). With the OS in light, the body background is `rgb(255, 255, 255)` by default, `rgb(16, 16, 16)` with `data-theme="dark"`, and white again after the attribute is removed. With the OS in dark it is `rgb(16, 16, 16)` by default, white with `data-theme="light"`, and dark again after removal. The probe uses a two-variable stand-in sheet; step 9 checks the real app.
4. **Theme toggle.** `ThemeToggle` is a standalone, neutral component: a single-select `mat-button-toggle-group` with `aria-label="Theme"` and three options, `System`, `Light` and `Dark`. It sets no position of its own: no host style, no margin. It is exported from `shell/index.ts` and embedded by Setup & auth (unit line 16; `units/SAU-13-preferences-step.md` line 16), so the alignment must not follow it into that step. Three states, not a binary switch: a binary switch cannot return to "follow the OS" without clearing storage by hand. Placement in the App toolbar is set by `app.html`, which adds a spacer (`<span class="spacer">`) before the toggle; the spacer's rule (`flex: 1 1 auto`) goes in `app.css`. SHL-09's demo (`units/SHL-09-core-gate.md` line 28) expects the toggle on the landing page, so every route shows it. ASSUMED (Decision; placement is open point 1). FACT: `@angular/material` 22.2.7 `types/button-toggle.d.ts` line 16 exports `MatButtonToggleGroup` and `MatButtonToggle`; the single-select template renders `role` `radio` and `aria-checked` (`fesm2022/button-toggle.mjs`, the `attr.aria-checked` binding).
5. **No Material theme provider.** The unit's "Material theme" (line 17) is the CSS theme, as SHL-01 decision 6 settled (`plans/SHL-01.md` section 1, item 6; `plans/DECISIONS.md` line 956). FACT: `types/core.d.ts` line 189 exports `MATERIAL_ANIMATIONS` and `provideNativeDateAdapter` as the only provider-like exports. ThemeService and ThemeToggle add no provider.
6. **No animations provider.** FACT: `grep -l "@angular/animations"` over the 22.2.7 `fesm2022/*.mjs` files matches nothing; Material 22 animates with CSS and reads `MATERIAL_ANIMATIONS` only to decide whether to animate (`fesm2022/_animation-chunk.mjs` lines 4 to 21). This agrees with SHL-01 section 5, which says SHL-04 must not add `provideAnimationsAsync`. Step 2 re-checks it in `node_modules`.
7. **Notices service API.** Root service (`providedIn: 'root'`) with signals. `postBanner(notice)` replaces the banner with the same `key` in place, or appends it. `clearBanner(key)` removes it; the Dismiss button calls the same method. `postSnackbar(message)` calls `MatSnackBar.open(message, 'Dismiss', { duration: 6000 })`. `BannerNotice` is `{ key: string; message: string; dismissible?: boolean }`, with `dismissible` false by default. Sources: unit line 17 (features post notices; banners can be dismissible); `units/SHL-06-connection-indicator.md` line 16 (the "server unreachable" banner is cleared on recovery, so a feature must clear a banner by code, not only by the user); `units/SHL-05-breakpoint-gate-nav.md` line 20 (a dismissible notice); `units/SAU-15-settings-page.md` line 17 (raises the banner). FACT: `MatSnackBar` is `providedIn: 'root'` through `@Service()`, not through its token. In `node_modules/@angular/material/fesm2022/snack-bar.mjs` (22.2.7, the cached copy is the same file): the class is declared at line 583; its `static ɵprov` is `ɵɵngDeclareService` at line 750; its class metadata at lines 760 to 764 says `type: Service`. Line 580 is not the class: it is the `providedIn: 'root'` of the `MAT_SNACK_BAR_DEFAULT_OPTIONS` token (lines 579 to 582). The root default for a service comes from `ɵɵdefineService` in `@angular/core` 22.2.5 (`fesm2022/_debug_node-chunk.mjs` line 1026): `providedIn` is `'root'` unless `autoProvided === false`, and `MatSnackBar` does not set that. `open(message, action?, config?)` is in `types/snack-bar.d.ts` line 288. ASSUMED: the names and the 6000 ms duration (Decision).
8. **Where notices render.** Banners: `<app-notice-banners />` in App's template, between the toolbar and `<router-outlet />`. Snackbars: Material's CDK overlay in `document.body`, so they are app-wide but not inside App's template. The unit's "shared area" is read as app-wide, which unit line 17 states ("an app-wide banner area and snackbars"). ASSUMED (Decision).
9. **The stored choice applies at load.** `App` gets one field, `ThemeService`, so the service exists before the first render. The alternative, `provideAppInitializer` in `app.config.ts`, would edit a file that SHL-02 and SHL-03 are likely to edit. `ThemeService` is not exported from `shell/index.ts`: the tests reach it only through the rendered `App` and the toggle (`modules/shell.md` line 83). ASSUMED (Decision; tested by T1 to T3 and by the reload in step 9).
10. **No composition-root or package change.** `app.config.ts`, `app.routes.ts`, every `package.json` and `package-lock.json` stay as they are. FACT: `apps/web/package.json` pins `@angular/material` 22.2.7 and `@angular/cdk` 22.2.7, and the components used (`MatButton`, `MatButtonToggleGroup`, `MatButtonToggle`, `MatSnackBar`) are in those packages (`types/button.d.ts` line 110; `types/button-toggle.d.ts` line 16; `types/snack-bar.d.ts` line 288). No dependency is added, so the lockfile gate (DECISIONS line 385) is not triggered.
11. **Material 3 stays.** `material-theme.scss` lines 10 to 19 already call `mat.theme` with the azure and blue M3 palettes, `Roboto` and density 0. Only the `color-scheme` lines change. FACT (read). This meets unit line 15 ("Material 3 theming").
12. **Banner colours from the M3 roles.** The banner uses `--mat-sys-tertiary-container` and `--mat-sys-on-tertiary-container`. FACT: both roles exist in `core/tokens/m3/_md-sys-color.scss` (lines 52 and 84 of the cached tarball). The `--mat-sys-` prefix is the one `material-theme.scss` line 31 uses. ASSUMED (Decision).
13. **Test seam.** Vitest through the Angular unit-test builder (`npm test -w @bbartolome/scriba-web`, which runs `ng test --watch=false`; `jsdom` 30.1.3 and `vitest` 5.1.0 are in `apps/web/package.json`). Tests render `App` with TestBed and drive it only through the DOM (clicks, rendered text, `aria-checked`) and `localStorage`; they call the public `NoticesService` only in the notices tests, as a stand-in feature would. They never read a service's signal. Dismissing a snackbar: when animations are enabled, Material finishes the exit with a 200 ms timer (`fesm2022/snack-bar.mjs`, the `else` branch of `exit()`, read at lines 352 to 400). FACT for the timer. ASSUMED for jsdom: CDK's `MediaMatcher` uses a no-op `matchMedia` when `window.matchMedia` is missing (`/tmp/shl04-probe/cdk/package/fesm2022/_breakpoints-observer-chunk.mjs` line 17; the no-op returns `matches` false except for `all` and the empty query, lines 71 to 76), so animations stay enabled in jsdom. Step 5 tests it.
14. **Browser check.** The Playwright version in the lock (`package-lock.json`, `node_modules/@playwright/test` 1.65.0) launches the cached Chromium through `executablePath` from `SCRIBA_E2E_CHROMIUM` (`e2e/playwright.config.ts` line 24). FACT: the probe in item 3 launched it. The check runs against `npm run start -w @bbartolome/scriba-web` on port 4200. SHL-04's pages make no API call (`app.config.ts` provides `provideHttpClient()` and no feature calls it yet), so the API on 8080 is not needed. The check runs on `unit/SHL-04` before SHL-03 merges; section 3, step 9 says what changes after it.
15. **Runtime and branch.** Node `v26.13.0` and npm `11.20.0` (FACT: `node -v`, `npm -v`). The driver creates the unit branch. The implementer does not commit or push (SHL-01 decision 20).

## 2. Files to create or change

Only the paths below change. Git-ignored output (`node_modules/`, `apps/web/dist/`, `apps/web/.angular/`) is generated and not committed. The scratch script of step 9 lives in `/tmp/shl04-check/`, outside the repo.

| Path | Change | Purpose | Shared with |
|---|---|---|---|
| `apps/web/src/material-theme.scss` | edit | On `html`, add `color-scheme: light dark`. Add `html[data-theme='light']` with `color-scheme: light` and `html[data-theme='dark']` with `color-scheme: dark`. In `body`, delete the `color-scheme: light;` declaration and the comment above it (lines 23 to 26). Keep the body's `background-color`, `color`, `font`, `margin` and `height`, and the `mat.theme` block (lines 8 to 20) unchanged. (Decisions 1, 3, 11.) | None. SHL-02 and SHL-03 do not touch the stylesheet. |
| `apps/web/src/app/shell/theme.ts` | new | Exports `ThemeChoice` (`'system' \| 'light' \| 'dark'`) and `ThemeService` (root). On construction it reads `scriba.theme` and accepts only `light` and `dark`; anything else means `system`. It applies the choice to `document.documentElement` as `data-theme`. `set(choice)` writes or removes the key and the attribute. `choice` is a readonly signal. This file is not re-exported from `index.ts`. (Decisions 2, 3, 9.) | None. |
| `apps/web/src/app/shell/theme-toggle.ts` | new | Exports `ThemeToggle`: a standalone, neutral component with a single-select `mat-button-toggle-group` (`aria-label="Theme"`) and the options `System`, `Light`, `Dark`. Its value is `ThemeService.choice()`; a change calls `set`. No host style and no margin: alignment is the caller's (decision 4). (Decision 4.) | None. |
| `apps/web/src/app/shell/notices.ts` | new | Exports the `BannerNotice` interface and `NoticesService` (root). It has a readonly signal `banners` and the methods `postBanner`, `clearBanner` and `postSnackbar` as in decision 7. (Decision 7.) | None. |
| `apps/web/src/app/shell/notice-banners.ts` | new | Exports `NoticeBanners`: a standalone component. An `@for` over `banners()` renders one `div` per banner with `role="status"`, the message, and, when `dismissible`, a `mat-button` labelled `Dismiss` that calls `clearBanner(key)`. Colours from the M3 roles in decision 12. (Decisions 7, 8, 12.) | None. |
| `apps/web/src/app/app.ts` | edit | Adds `NoticeBanners` and `ThemeToggle` to the component's `imports`, after `RouterOutlet`. Adds one field, `private readonly theme = inject(ThemeService)`, with a comment that it starts the service so the stored choice applies at load. (Decision 9.) | SHL-02 and SHL-03 add a line to `App` only if they open a client from it. Their lines are kept beside this plan's: this plan adds import lines and one field, and reorders nothing. |
| `apps/web/src/app/app.html` | edit | The toolbar becomes `<mat-toolbar><h1>Scriba</h1><span class="spacer"></span><app-theme-toggle /></mat-toolbar>`. Adds `<app-notice-banners />` between the toolbar and the existing `<router-outlet />`. `h1` stays the only heading on `/`. (Decisions 4, 8.) | None expected from SHL-02 and SHL-03. SHL-05 (nav layout) and SHL-06 (connection indicator) come after this unit and keep these elements. |
| `apps/web/src/app/app.css` | edit (was empty, 0 bytes) | Adds one rule, `.spacer { flex: 1 1 auto; }`, which pushes the toggle to the right of the toolbar. (Decision 4.) | None expected. SHL-05 or SHL-06 may add rules to this file later; they keep this one. |
| `apps/web/src/app/shell/index.ts` | edit | Appends three export lines after the existing lines 2 and 3: `export { NoticesService } from './notices';`, `export type { BannerNotice } from './notices';`, `export { ThemeToggle } from './theme-toggle';`. Line 1 (the comment) is reworded to name notices and the theme toggle too. | SHL-02 and SHL-03 each append their own export lines after the existing lines and do not reorder or remove any. Only SHL-04 edits line 1; if a sibling also edits it, keep both texts. |
| `apps/web/src/app/shell/theme.spec.ts` | new | Criterion 1, Vitest tests T1 to T3 (section 4), rendered through `App`. | None. |
| `apps/web/src/app/shell/notices.spec.ts` | new | Criterion 2, Vitest tests N1 to N3 (section 4). | None. |
| `/tmp/shl04-check/theme-check.mjs` | new, outside the repo, not committed | The browser check of criterion 1 (step 9). | None. |

Unchanged, and checked in step 4: `apps/web/src/app/app.config.ts`, `app.routes.ts`, `app.spec.ts` (it must pass as it is), `app.routes.spec.ts`, `shell/tokens.ts`, `shell/route-data.ts`, `shell/route-data.spec.ts`, `shell/landing.ts`, `shell/not-found.ts`, `apps/web/src/main.ts`, `apps/web/src/index.html`, `apps/web/angular.json`, `apps/web/proxy.conf.json`, `apps/web/package.json`, `package.json`, `package-lock.json`, `eslint.config.mjs`, `packages/**`, `apps/api/**`, `e2e/**`, `plans/**` (except this file), `units/**`, `modules/**`.

## 3. Method

Run from the repo root on the driver's unit branch. Do not run `git switch -c`, do not commit and do not push. Record `node -v` and `npm -v` with each result.

0. **Preconditions (no file change).**
   - `git rev-parse --short HEAD` prints `248f39d`, or a later commit; `git diff --quiet c2c498c HEAD -- apps/web` exits 0. `git status --short -- ':!plans'` prints nothing (the untracked `plans/` files of the batch are excluded).
   - `node -v` prints `v26.x`; `npm -v` prints `11.20.0`.
   - `curl -s -o /dev/null http://localhost:4200/; echo $?` prints `7`. If it connects, stop and report the owner found with the `/proc` method of `plans/PLT-11.md` section 3, step 0. Do not kill it.
   - `ls ~/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome` lists the file.
1. **Install from the lock (no file change).** `npm ci` exits 0. `node -p "require('./node_modules/@angular/material/package.json').version"` prints `22.2.7`. `ls node_modules/@playwright/test/package.json` lists the file.
2. **Check the installed packages (no file change).**
   - `grep -l "@angular/animations" node_modules/@angular/material/fesm2022/*.mjs; echo $?` prints `1` and nothing else (decision 6).
   - `grep -n "light-dark(" node_modules/@angular/material/core/tokens/_system.scss` prints one line, containing `light-dark($light-value, $dark-value)` (decision 1).
   - `grep -n "ngDeclareService\|type: Service" node_modules/@angular/material/fesm2022/snack-bar.mjs` prints a `ngDeclareService` line (line 750 in 22.2.7) and a `type: Service` line (line 763), both in the `MatSnackBar` class; `grep -n "providedIn: 'root'" node_modules/@angular/material/fesm2022/snack-bar.mjs` prints only line 580, the default-options token (decision 7).
   - `grep -rn --include='*.mjs' "opts.autoProvided === false" node_modules/@angular/core/fesm2022/` prints one line, and its `providedIn` is `'root'` unless `autoProvided === false` (decision 7).
   - `grep -c "aria-checked" node_modules/@angular/material/fesm2022/button-toggle.mjs` prints a number greater than `0` (decision 4).
3. **Write the files (section 2).** Follow decisions 1 to 12. Then `npx prettier --write apps/web/src/app apps/web/src/material-theme.scss` and `npx prettier --check apps/web` exits 0.
4. **Static checks (no file change).**
   - `grep -c "^[[:space:]]*color-scheme:" apps/web/src/material-theme.scss` prints `3`.
   - `grep -rn "provideAnimations\|provideNoopAnimations" apps/web/src` prints nothing.
   - `grep -n "margin\|host" apps/web/src/app/shell/theme-toggle.ts` prints nothing (the toggle is neutral, decision 4).
   - `git diff --quiet -- apps/web/src/app/app.config.ts apps/web/src/app/app.routes.ts apps/web/src/app/app.spec.ts apps/web/angular.json apps/web/package.json package.json package-lock.json` exits 0.
   - `git status --short -- ':!plans'` lists only the section 2 paths (the untracked `plans/` files of the batch are excluded).
5. **Unit tests (files: `theme.spec.ts`, `notices.spec.ts`).** `npm test -w @bbartolome/scriba-web` exits 0, with 5 test files and 11 passing tests: `app.spec.ts` 1, `app.routes.spec.ts` 3, `shell/route-data.spec.ts` 1, `shell/theme.spec.ts` 3, `shell/notices.spec.ts` 3. None fails. If N3 fails only because the snackbar exit has not finished, lengthen its wait; do not change the component.
6. **Type checks (no file change).** `npx tsc --noEmit -p apps/web/tsconfig.app.json` and `npx tsc --noEmit -p apps/web/tsconfig.spec.json` each exit 0.
7. **Lint (no file change).** `npm run lint -w @bbartolome/scriba-web` exits 0.
8. **Production build (no file change).** `npm run build -w @bbartolome/scriba-web` exits 0. Record the `Initial total` line. `grep -l "scriba-contracts" apps/web/dist/scriba-web/browser/*.js` prints nothing.
9. **Browser check (criterion 1; no file change).**
   - Start the dev server: `npm run start -w @bbartolome/scriba-web > /tmp/shl04-web.log 2>&1 &`. Poll `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/` until it prints `200` (timeout 180 s).
   - Save this script to `/tmp/shl04-check/theme-check.mjs`. The forwarded prefixes are the three keys of `apps/web/proxy.conf.json` (`/api`, `/healthz`, `/events`); a request counts as a server call when it is not a GET or its path starts with one of them.

```js
import { createRequire } from 'node:module';
const req = createRequire(process.cwd() + '/package.json');
const { chromium } = req('@playwright/test');
const BASE = 'http://localhost:4200/';
const FORWARDED = ['/api', '/healthz', '/events'];
const method = (r) => r.split(' ')[0];
const path = (r) => r.split(' ')[1];
const serverCall = (r) => method(r) !== 'GET' || FORWARDED.some((p) => path(r).startsWith(p));
const bg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const stored = (page) => page.evaluate(() => localStorage.getItem('scriba.theme'));
const browser = await chromium.launch({ executablePath: process.env.SCRIBA_E2E_CHROMIUM });
async function open(colorScheme) {
  const ctx = await browser.newContext({ colorScheme });
  const page = await ctx.newPage();
  const pageErrors = [];
  const reqs = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('request', (r) => reqs.push(r.method() + ' ' + new URL(r.url()).pathname));
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'Scriba' }).waitFor({ timeout: 30000 });
  return { ctx, page, pageErrors, reqs };
}
const out = {};
let s = await open('light');
out.osLight = await bg(s.page);
await s.ctx.close();
s = await open('dark');
out.osDark = await bg(s.page);
let mark = s.reqs.length;
await s.page.getByRole('radio', { name: 'Light' }).click();
await s.page.waitForTimeout(300);
out.afterLightClick = await bg(s.page);
out.storedAfterLight = await stored(s.page);
out.requestsAfterClick = s.reqs.slice(mark);
out.lightCheckedBeforeReload = await s.page.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked');
mark = s.reqs.length;
await s.page.reload();
await s.page.getByRole('heading', { name: 'Scriba' }).waitFor({ timeout: 30000 });
out.afterReload = await bg(s.page);
out.lightCheckedAfterReload = await s.page.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked');
out.serverCallsAfterReload = s.reqs.slice(mark).filter(serverCall);
await s.page.getByRole('radio', { name: 'System' }).click();
await s.page.waitForTimeout(300);
out.afterSystem = await bg(s.page);
out.storedAfterSystem = await stored(s.page);
out.pageErrors = s.pageErrors;
out.overlay = await s.page.locator('vite-error-overlay').count();
console.log(JSON.stringify(out));
await browser.close();
```

   - Run `cd /Users/bbartolome/workspace/scriba-prototype && SCRIBA_E2E_CHROMIUM="$HOME/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome" node /tmp/shl04-check/theme-check.mjs`. It prints one JSON line and exits 0. The expected values are in section 4, criterion 1.
   - `grep -c -E 'Failed to resolve import|Could not resolve' /tmp/shl04-web.log` prints `0`.
   - **SHL-03 caveat.** Before SHL-03 merges, `requestsAfterClick` and `serverCallsAfterReload` must both be `[]`. SHL-03's `provideAppInitializer` opens the SSE stream at boot, and its recovery sends `GET /healthz` and `GET /api/setup-auth/status` when the API is down. So after SHL-03 merges, with the API down (as on this machine), the lists can also hold those requests, and the check is not a pass rule. The rerun on the post-merge `main` runs with the API up, and its pass rule is: `requestsAfterClick` is `[]`, and `serverCallsAfterReload` is exactly `["GET /events"]` (the boot-time stream, which is not a theme call). A `GET /events` reconnect in `requestsAfterClick` is a failure of this rule, and the record names it as a reconnect rather than a theme call.
10. **Stop the dev server (no file change).** Stop the process group of step 9. `curl -s -o /dev/null http://localhost:4200/; echo $?` prints `7`.
11. **Root gates (no file change).** From the root, `npm run build`, `npm test` and `npm run lint` each exit 0. The last line of `npm run lint` is `All matched files use Prettier code style!`.
12. **Record.** Node and npm versions; each command's exit status; the `Initial total` of step 8; the JSON line of step 9; the PID stopped in step 10 and the port result after it.

## 4. Acceptance criteria tests

Both criteria are testable in this environment: Vitest with TestBed covers both, and the headless Chromium covers the browser part of criterion 1. No criterion is left open.

**Criterion 1.** "Light and dark themes follow the OS setting; the override persists across reloads on the same device and makes no server call."
- Test (a), browser, step 9. The JSON line must show:
  - Follows the OS: `osLight` has three channels, all at least 200; `osDark` has three channels, all at most 60.
  - Override: `afterLightClick` equals `osLight`; `storedAfterLight` is `light`; `lightCheckedBeforeReload` is `"true"`; `requestsAfterClick` is `[]` (the click sends no request at all, before SHL-03 merges).
  - Persists across a reload: `afterReload` equals `osLight`; `lightCheckedAfterReload` is `"true"`; `serverCallsAfterReload` is `[]` before SHL-03 merges.
  - Back to the OS: `afterSystem` equals `osDark`; `storedAfterSystem` is `null`.
  - Clean page: `pageErrors` is `[]`; `overlay` is `0`; the `grep` of step 9 prints `0`.
- Test (b), Vitest, step 5, `shell/theme.spec.ts`. Every test renders `App` with TestBed, drives it through the DOM, and reads only the DOM and `localStorage`. In `afterEach`, `localStorage` is cleared and `data-theme` is removed from `<html>`.
  - T1 (click, then System): render `App`; click the `Dark` radio. `scriba.theme` is `dark` and `<html>` has `data-theme="dark"`; the `Dark` radio is `aria-checked="true"`. Click the `System` radio. `scriba.theme` is absent and `<html>` has no `data-theme`.
  - T2 (stored light at load, the reload seam): set `scriba.theme` to `light` before `App` is rendered. `<html>` has `data-theme="light"`, and the `Light` radio is `aria-checked="true"`.
  - T3 (stored invalid value): set `scriba.theme` to `blue` before `App` is rendered. `<html>` has no `data-theme`, and the `System` radio is `aria-checked="true"`.
  - The revision 1 test T4 (click Dark) is folded into T1; the count of theme tests is three.
- Pass: test (a) shows every value above; test (b) passes T1 to T3.
- Local: yes. The "no server call" part is a request log in the browser: the click and the reload issue no server call before SHL-03 merges, and the page makes no non-GET request. The browser check runs against the dev server only, which is the real page.

**Criterion 2.** "A feature-posted banner and snackbar render in the shared area and can be dismissed."
- Test: `shell/notices.spec.ts`, Vitest, step 5. The test renders `App` with TestBed and acts as a feature: it calls only the public `NoticesService` methods, then checks the DOM.
  - N1: `postBanner({ key, message, dismissible: true })` shows the message inside the rendered `app-notice-banners`; the banner's `Dismiss` button removes it.
  - N2: a banner posted without `dismissible` has no `Dismiss` button; `clearBanner(key)` removes it. This is the path SHL-06 uses on recovery.
  - N3: `postSnackbar(message)` shows the message in the Material overlay in `document.body`; its `Dismiss` action closes it, and the message is gone within 1 s.
- Pass: N1 to N3 pass, so `npm test` reports 11 passing tests (step 5).
- Local: yes, under jsdom. The browser run of criterion 2 is not part of this plan, because no feature posts a notice in the running app until SHL-05, SHL-06 or SHL-09 merges (open point 3). The Vitest test is the module's seam (`modules/shell.md` line 84), so criterion 2 is complete at that seam.

## 5. Agreement with downstream units

| Unit | What it needs from SHL-04 | Provided by this plan |
|---|---|---|
| SHL-05 breakpoint gate, nav | A dismissible notice for "view below class" (SHL-05 line 20) | `postBanner` with `dismissible: true`; `clearBanner` for its own cleanup. SHL-05 edits `app.ts`, `app.html` and `app.css` for the nav layout and keeps the banner, the toggle and the spacer. |
| SHL-06 connection indicator, unreachable banner | A banner that a feature posts and clears by code (SHL-06 line 16) | `postBanner` replaces by key; `clearBanner(key)` (test N2). The indicator is SHL-06's own. |
| SHL-09 core gate | Theming criteria pass on `main`; demo step 3 "toggle dark mode and reload; the choice persists" (SHL-09 line 28) | Criterion 1 (test (a) and T1 to T3); the toggle sits in the toolbar on every route. SHL-09's dummy feature is not affected. |
| SAU-13 Preferences step (M2) | The Shell's device-local theme toggle, with no server call (SAU-13 lines 16, 21) | `ThemeToggle` exported from `shell/index.ts`; neutral, with no margin or host style, so the toolbar alignment does not follow it; no HTTP. |
| SAU-15 Settings, SAU-10 status (M2) | Raise the Shell banner for a compose mismatch (SAU-15 line 17; SAU-10 line 20) | `postBanner` with a stable key. |
| SAU-01 contract (compose flag) | A global banner for the compose flag (SAU-01 line 17) | Same `postBanner` call, made by Setup & auth when it reads the flag. |
| GRR-15 Material styling (M4) | Tokens that follow the theme in both modes (GRR-15 line 16) | `--mat-sys-*` tokens resolve per `data-theme` and the OS (test (a) reads them through the body). Its visual check is GRR-15's. |
| SHL-19 polish gate (M7) | Both themes reachable for the accessibility pass (SHL-19 lines 17, 21) | The toggle pins a theme (`data-theme`), or the OS emulation sets the other. |
| SHL-02 and SHL-03 (same batch) | No overlap in providers or in `app.config.ts`. SHL-03's `provideAppInitializer` opens SSE at boot, which the step 9 caveat covers. | SHL-04 does not edit `app.config.ts` or `shell/tokens.ts`; the shared-file rules are in section 2. |
| SHL-01 section 5 | No animations provider | None added (decision 6). |
| PLT-13 e2e journey | Heading `Scriba` on `/`, no page errors | The toolbar keeps the only `h1`; the banner area has no heading. The journey is not run here; run it only if its harness works here, and report the result. |

## 6. Open points

1. **Toggle placement.** The App toolbar is this plan's choice (decision 4). SHL-05 (nav layout) or SHL-09 may move it; the component's API does not change, and it carries no position of its own.
2. **"Shared area" reading.** Settled by unit line 17 ("an app-wide banner area and snackbars"): banners render in App (below the toolbar); snackbars render in the Material overlay, app-wide, outside App's template (decision 8). No coordinator decision is needed.
3. **No browser run of criterion 2.** No feature posts a notice in the running app before SHL-05, SHL-06 or SHL-09. The first real poster should add a browser check of the banner and the snackbar exit. This plan does not claim the browser part.
4. **Flash of the OS theme.** The stored override is applied when the JavaScript runs, after the stylesheet, so a reload can show the OS theme for a moment. Removing that needs an inline script in `index.html`, which is outside this unit. Accepted for M1.
5. **`light-dark()` support.** Assumed for iPad Safari 17.5 and later and for current Chrome (ASSUMED; not tested here). SHL-19's accessibility pass covers both themes on the real devices.
6. **Contradiction in another unit.** SHL-01 unit line 17 lists "providers for … the Material theme". `plans/DECISIONS.md` line 956 and SHL-01 decision 6 say the CSS theme only. This plan follows DECISIONS. The coordinator decides whether SHL-01 line 17 is corrected.
7. **Post-SHL-03 rerun of step 9.** The step 9 lists of server calls are empty only before SHL-03 merges (step 9 caveat). The rerun on the post-merge `main` uses the pass rule of step 9 (API up: `requestsAfterClick` is `[]`, `serverCallsAfterReload` is exactly `["GET /events"]`); the coordinator schedules it when SHL-03 lands.

## 7. Facts checked and assumed

**(a) Facts checked in this session**
- Repo: `git rev-parse --short HEAD` printed `248f39d` (a DECISIONS-only commit on top of `c2c498c`). `git diff --stat c2c498c HEAD -- apps/web` printed nothing. `git status --short` printed nothing at the start.
- Revision 2 checks: `git log --oneline -3` printed `6ba529b` (the rejection record) on top of `5e75b06` and `56e1390`. `plans/DECISIONS.md` line 1093 is the rejection-1 entry, and its items 1 to 5 are the five corrections applied here.
- `node -v` printed `v26.13.0`; `npm -v` printed `11.20.0`. `node_modules/@angular` does not exist (`ls` fails); `node_modules/.bin` has no `ng`.
- `npm view @angular/material@22.2.7 version` printed `22.2.7` (the registry is reachable).
- Unit `units/SHL-04-theming-notices.md`: front matter (`blocked_by: [SHL-01]`, `parallel_with: [SHL-02, SHL-03]`, `unblocks: [SHL-05, SHL-06, SHL-09]`, `phase:core`, `M1`); lines 14 to 17 (Decisions); lines 19 to 21 (criteria 1 and 2).
- Symmetry and inverse of the front matter (`units/README.md` lines 59 to 65): `grep -rn "SHL-04" units modules` finds `blocked_by` entries only in `SHL-05` line 7, `SHL-06` line 7 and `SHL-09` line 7; `parallel_with` in `SHL-02` line 8 and `SHL-03` line 8; `SHL-01` line 9 lists SHL-04 in `unblocks`, the reverse of SHL-04's `blocked_by: [SHL-01]`. The inverse of `SHL-04`'s `unblocks` is exactly SHL-05, SHL-06 and SHL-09.
- `modules/shell.md`: lines 19 to 21 (graph), 36 (parallelism), 41 to 45 (cross-cutting), 47 to 63 (route table), 65 to 80 (Angular APIs; line 74 is SHL-04's row), 83 (testing principles: "never private services, signal wiring"), 84 (seam), 94 (no server-side preferences), 97 to 100 (breakpoints).
- Downstream units, read for the lines that touch theming or notices: SHL-05 lines 7, 17 to 26; SHL-06 lines 7, 14 to 19; SHL-09 lines 7, 19, 28; SAU-01 line 17; SAU-06 line 17 (an in-page sign-in notice, not the Shell's banner); SAU-09 line 20; SAU-10 lines 15 and 20; SAU-13 lines 16 and 21; SAU-15 line 17; GRR-15 lines 16 and 21; SHL-19 lines 17 and 21. The `blocked_by` and `unblocks` lines of SHL-10 to SHL-19 were read: none names SHL-04.
- Shell as built on `main`: `app.config.ts` (provides `provideBrowserGlobalErrorListeners`, `provideZonelessChangeDetection`, `provideRouter(APP_ROUTES)`, `provideHttpClient`, `provideMarkdown`); `app.routes.ts`; `app.ts` (`imports: [MatToolbar, RouterOutlet]`, `styleUrl` `./app.css`); `app.css` (0 bytes); `app.html` (`<mat-toolbar><h1>Scriba</h1></mat-toolbar>` and `<router-outlet />`); `app.spec.ts` (renders `App`, checks `h1`); `shell/index.ts` (line 1 comment, lines 2 and 3 exports); `shell/route-data.ts`; `shell/tokens.ts`; `shell/landing.ts`; `shell/not-found.ts`. `apps/web/src/app/features/` holds only `.gitkeep` (`ls -a`).
- `apps/web/proxy.conf.json`: three keys, `/api`, `/healthz` and `/events`, each with target `http://127.0.0.1:8080` (read; SHL-01 plan section 7(a) recorded the same).
- `apps/web/src/material-theme.scss`: lines 10 to 19 `mat.theme` with `color` as a map of `primary: mat.$azure-palette` and `tertiary: mat.$blue-palette` (lines 12 to 15), `typography: Roboto`, `density: 0`; line 26 `color-scheme: light;`; line 31 uses `--mat-sys-surface`.
- `apps/web/angular.json`: line 27 `styles` (`src/material-theme.scss`, `src/styles.css`); line 28 `externalDependencies` (SHL-01 decision 22).
- `apps/web/package.json`: `@angular/material` and `@angular/cdk` 22.2.7; `@angular/core` 22.2.5; `jsdom` 30.1.3 and `vitest` 5.1.0 (devDependencies); scripts `start` = `ng serve` and `test` = `ng test --watch=false`.
- `apps/web/tsconfig.json`: `noPropertyAccessFromIndexSignature` true, `noImplicitOverride` true; `tsconfig.base.json` has `strict` true. `apps/web/tsconfig.spec.json` types `vitest/globals`.
- `.prettierrc.json`: `singleQuote` true, `trailingComma` `all`.
- `eslint.config.mjs`: the `web-feature` element is `src/app/features/*` only; files under `shell/` match no element (SHL-01 decision 16).
- `e2e/playwright.config.ts` line 24: `executablePath: process.env.SCRIBA_E2E_CHROMIUM ?? undefined`.
- `~/.cache/ms-playwright/` lists `chromium-1254`; `chrome-linux-arm64/chrome --version` printed `Google Chrome for Testing 158.0.8127.18`. The machine is `aarch64`.
- Material 22.2.7, from the cached tarball `/tmp/shl01-cache/angular/mat/package`: `core/tokens/_system.scss` lines 57 (`theme` mixin), 64 to 66 (`theme-type` default for a map without it), 82 (bare-palette branch), 248 to 253 (`light-dark`); `core/tokens/m3/_md-sys-color.scss` (`tertiary-container` line 52, `on-tertiary-container` line 84); `types/core.d.ts` lines 32 and 189; `fesm2022/_animation-chunk.mjs` lines 4 to 21; `fesm2022/snack-bar.mjs`: line 579 to 582 (`MAT_SNACK_BAR_DEFAULT_OPTIONS`, `providedIn: 'root'`), line 583 (`class MatSnackBar`), line 750 (`ɵprov` `ɵɵngDeclareService`), lines 760 to 764 (class metadata, `type: Service`), lines 352 to 400 (`enter` and `exit`; the `else` branch sets a 200 ms timer); `types/snack-bar.d.ts` line 288 (`open`); `types/button.d.ts` line 110; `types/button-toggle.d.ts` lines 2 and 16; `fesm2022/button-toggle.mjs` (`role` `radio` and `aria-checked` in single-select mode); `grep -l "@angular/animations" fesm2022/*.mjs` matched no file.
- Angular core 22.2.5, from the cached tarball `/tmp/shl01-cache/angular/core/package`: `fesm2022/_debug_node-chunk.mjs` line 1026 (`ɵɵdefineService`: `providedIn: opts.autoProvided === false ? null : 'root'`); `types/core.d.ts` line 1049 (`autoProvided?: boolean`).
- CDK 22.2.7, from `npm pack @angular/cdk@22.2.7` into `/tmp/shl04-probe/cdk`: `package/fesm2022/_breakpoints-observer-chunk.mjs` line 17 (the no-op fallback when `window.matchMedia` is missing) and lines 71 to 76 (`noopMatchMedia`).
- Probe (item 3): `/tmp/shl04-probe/probe.mjs` run with `CHROME` set to the cached binary; output `{"light":{"system":"rgb(255, 255, 255)","forcedDark":"rgb(16, 16, 16)","forcedLight":"rgb(255, 255, 255)","backToSystem":"rgb(255, 255, 255)"},"dark":{"system":"rgb(16, 16, 16)","forcedDark":"rgb(16, 16, 16)","forcedLight":"rgb(255, 255, 255)","backToSystem":"rgb(16, 16, 16)"}}`. `@playwright/test` 1.65.0 was installed in `/tmp/shl04-probe` (scratch).
- DECISIONS (`plans/DECISIONS.md`): `grep -n -i "SHL-0\|shell\|theme\|notice\|snackbar\|material"` finds no entry that names SHL-04 or the theme or notices, except the SHL-04 rejection of revision 1 (line 1093 onward, commit 6ba529b), which this revision answers. The relevant SHL-01 entries are line 944 (review of revision 1, item 4), line 950 (revision 2 approved), line 956 (item 4: "Material theme" is the CSS theme only), line 1035 (code approved, `unit/SHL-01`). Line 385 is the lockfile gate.
- No contradiction was found between the SHL-04 unit and `modules/shell.md` or DECISIONS. The contradiction in item 6 of section 6 is in SHL-01's unit.

**(b) Assumed (each tested by a step)**
- The Vitest jsdom run gives the notices and toggle behaviour of decisions 7 and 13, including a snackbar exit within 1 s (step 5).
- CDK's no-op `matchMedia` in jsdom leaves animations enabled, so the snackbar exit uses its 200 ms timer (step 5).
- Playwright's `request` events do not include the dev server's websocket traffic, so step 9's request log shows only HTTP requests (step 9).
- Between the two runs, the M3 surface values stay far from the thresholds (at most 60 for dark, at least 200 for light); step 9 prints the raw values for review (step 9).
- `localStorage` is the device-local store the unit means: per browser and per origin (browser behaviour, not checked here).
- The SHL-02 and SHL-03 plans will not name `shell/notices.ts`, `shell/notice-banners.ts`, `shell/theme.ts`, `shell/theme-toggle.ts` or the two SHL-04 spec files; if they do, the coordinator renames one side before merge.
