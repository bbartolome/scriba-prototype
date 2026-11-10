# Spec: Frontend shell & shared UI

## Problem Statement

The author uses Scriba on a Mac, an iPad and a phone, as one responsive web app with no accounts and no separate mobile app. Nine other modules each ship their own UI slice, and each slice needs the same things: a way to reach the API, live server events, a theme, navigation, a decision about which device may open which view, and a few heavy shared widgets (a tool-call card, a diff view and a Markdown editor). If each module builds these alone, the app looks different from page to page and opens a separate event stream per page. It also handles a sleeping iPad in five different ways, risks rewriting the author's Markdown files, and makes the Agent loop, Graph runner and Compile & export features wait on a UI bottleneck at the end.

From the author's side, the problems are:
- The app must feel like one product on every device. Phones get chat, the review queue, reading and light edits. Tablets add the canvas and long-form editing. The desktop gets everything.
- Streaming chat, node run status and queue updates must keep arriving, and must catch up after the device sleeps.
- The author's Markdown files, including YAML front matter, must come back from the editor **byte-identical**, because they are also edited in other tools and kept in git.

## Solution

The Frontend shell is the Angular 22 + Angular Material web app's composition root and shared UI kit. It owns `apps/web`'s root: the app configuration, the lazy route table and the dev proxy. Every feature module plugs in with **one route-table entry** that lazy-loads its own standalone `Routes` array. The Shell gives every feature:

- a **typed API client** that speaks the Platform's base error shape and takes each feature's contract types;
- one **SSE client** per tab, a native `EventSource` that reads the Platform's multiplexed envelope `{module, type, data}` and hands each module only its own events. It also announces reconnects and wake-ups so each feature can fetch its "current run state";
- **theming** (Material, light and dark), **navigation** (bottom nav on phones, side nav on tablet and desktop) and a **breakpoint gate** that hides and blocks heavy views on devices too small for them;
- shared components: the **tool-call card**, the **diff view** (read-only first, then an editable merge view on `@codemirror/merge`), a **Markdown preview** on `ngx-markdown`, and the **CodeMirror 6 Markdown editor**. The editor is lossless and saves the author's own typing straight through the Project store file API, after a debounce or on an explicit save;
- test doubles (a fake API client and a fake event source) so every feature can test its lazy route against contract types.

At M7 the Shell adds PWA install (possible because the tailnet URL is HTTPS) and polish.

The Shell publishes **no contract slice**: its shared pieces are Angular APIs, not wire formats (`/shell` is empty).

## User Stories

1. As an author, I want Scriba to open on my Mac, iPad and phone at the same URL, so that any device I pick up is a way into the same book.
2. As an author on a phone, I want a bottom navigation bar with only the views that suit a phone (chat, review, reading), so that I can reach them with my thumb.
3. As an author on a tablet or desktop, I want a side navigation, so that the content area keeps its full height for writing and the canvas.
4. As an author on a phone, I want heavy views (the canvas, long-form editing) kept out of my navigation, so that I don't land in a view that can't work on a small screen.
5. As an author who follows a link to a heavy view on a phone, I want a clear "open this on a tablet or computer" page with a way back, so that I'm not left with a broken layout.
6. As an author who rotates or resizes a device mid-task, I want an open view to stay open with my work intact, so that crossing a breakpoint never throws away unsaved text.
7. As an author, I want light and dark themes that follow my device's setting, with a manual override remembered on that device, so that writing at night is comfortable.
8. As an author, I want the app to look and behave the same across all its views, so that it reads as one product.
9. As an author, I want streamed tokens, tool-call cards, node run statuses and queue updates to arrive live, so that I can see what the agent and recipes are doing.
10. As an author whose iPad slept during an agent run, I want the app to reconnect and catch up on the run's current state when I wake it, so that I never see a stale "running" card.
11. As an author, I want a small, unobtrusive indicator when the live connection drops and while it reconnects, so that I know whether what I see is current.
12. As an author, I want a plain message when the server can't be reached, rather than a blank page, so that I know to check the app is running.
13. As an author whose session cookie is missing or expired, I want to be sent to `/setup` to re-open my setup URL, so that I can get back in without guessing.
14. As an author, I want error messages from the server shown in plain language, with the error code available, so that I can understand and report problems.
15. As an author, I want each tool call in chat shown as a card with the tool's name, its inputs, its live status and its output or error, so that I can see what the agent did.
16. As an author on a phone, I want tool-call cards collapsed to a one-line summary that I can expand, so that the chat stays readable.
17. As an author, I want a tool-call card to list the source files the tool used, as project-relative paths, so that I can check where a draft came from.
18. As an author reviewing a pending change, I want a clear diff of the current text against the proposed text, so that I can decide whether to accept it.
19. As an author on a phone, I want the diff shown inline (unified), and on a tablet or desktop side by side, so that it fits the screen.
20. As an author, I want whitespace, line-ending and front-matter changes visible in the diff, so that nothing changes in my files without my seeing it.
21. As an author, I want to edit the proposed side of a diff before I accept it, so that I can fix a small mistake without rejecting the whole change.
22. As an author, I want to edit a draft in a source Markdown editor with a live preview beside it on a tablet or desktop, so that I see both the text I keep in git and how it reads.
23. As an author on a phone, I want to switch between the editor and the preview with one tap, so that light edits are possible on a small screen.
24. As an author, I want a file I open and save without changes to stay byte-identical, including front matter, emphasis style, line endings and the trailing newline, so that my git history shows no noise.
25. As an author, I want my typing saved automatically after a short pause, and also when I press save or Cmd/Ctrl-S, so that I never lose a paragraph.
26. As an author, I want a visible "saved / saving / unsaved / failed" state in the editor, so that I know whether my words are on disk.
27. As an author, I want to be warned before I leave a view or close the tab with unsaved text, so that I don't lose work by accident.
28. As an author who also edits files in another editor, I want the Scriba editor to refuse to silently overwrite a file that changed on disk since I opened it, and to tell me, so that I don't lose edits made elsewhere.
29. As an author on an iPad, I want the editor to work with touch selection, the on-screen keyboard and a hardware keyboard, so that long-form drafting works on the tablet.
30. As an author, I want reading panes to render Markdown cleanly without showing raw front matter, so that reading a draft feels like reading a book.
31. As an author, I want Markdown preview to never run scripts or raw HTML from a file or an agent output, so that a pasted snippet can't harm the app.
32. As an author on a phone or iPad, I want to install Scriba to my home screen and open it full screen, so that it feels like an app.
33. As an author, I want the installed app to load fresh code after I update the server, so that an old cached bundle never talks to a newer API.
34. As an author, I want an about panel showing the app version and server health, so that I know which release I'm running.
35. As an author, I want keyboard shortcuts for navigation and saving on the desktop, and reachable controls with labels for screen readers, so that the app is fast and accessible.
36. As a feature-module developer, I want to register my feature with one route-table entry that lazy-loads my own `Routes` array, so that I never edit another module's code.
37. As a feature-module developer, I want to declare my nav label, icon, minimum device class and whether my view is project-scoped in that one entry, so that the Shell handles nav and gating for me.
38. As a feature-module developer, I want a typed API client that validates responses against my contract's Zod schema and turns the base error shape into a typed error, so that my UI code never parses errors by hand.
39. As a feature-module developer, I want to subscribe to only my module's SSE events as a signal or stream, so that I don't filter the whole multiplexed stream myself.
40. As a feature-module developer, I want a "reconnected or woke up" hook, so that I can re-fetch my current run state in one place.
41. As a feature-module developer, I want an "active project" signal taken from the route, so that every project-scoped view agrees on which project is open.
42. As a feature-module developer, I want a notices area I can post to (for example the compose-version mismatch warning), so that app-wide warnings look the same.
43. As a feature-module developer, I want a fake API client and a fake event source built from contract types, so that I can test my lazy route with Vitest without a server.
44. As a feature-module developer, I want the dev proxy to cover `/api`, `/healthz` and the events route, so that `npm run dev` works on one origin with streaming intact.
45. As a feature-module developer, I want to drop the shared diff view and editor into my page with a few inputs and outputs, so that review and drafting look identical everywhere.
46. As the Platform maintainer, I want the web root built and served by NestJS as a static bundle on the same origin as `/api`, so that cookies and `EventSource` need no CORS.

## Implementation Decisions

**Stack and composition root**
- Angular 22, standalone components, signals-first and zoneless. Angular Material plus CDK for components, layout and `BreakpointObserver`.
- The Shell owns `apps/web`'s composition root: the app configuration (providers for the router, HTTP, Material theme, `ngx-markdown`, the API and SSE clients), the root route table and the dev proxy configuration.
- Feature UIs live in `apps/web/src/app/features/<m>/`, each owned by its module. The Shell's own code lives outside `features/`.
- `ngx-markdown` is configured once at the root, with Angular sanitisation on and no raw-HTML pass-through.

**Feature-registration pattern**
- Each feature exports standalone, lazy `Routes` arrays. The root route table holds **one entry per top-level path a feature owns** whose `loadChildren` loads that feature's routes. Most features own one path; a few own two (see the route table below). The feature module adds its own entries in its own PR. Adding a feature is an additive change to the table.
- Route `data` on that entry declares: a nav label, a Material icon, a nav order, a **minimum device class** (`phone | tablet | desktop`, default `tablet`), and the scope (app-level or project-scoped). The Shell builds the nav from these entries. It never imports feature code eagerly.
- **Scopes.** App-level features (for example `/setup` from Setup & auth, provider settings) mount at the top level. Project-scoped features mount under the Shell-owned parent `projects/:projectId/` segment. The Shell exposes the **active project** as a signal read from that parameter. The project list itself is a Project store view at `/projects`.
- **Route table** (paths are fixed here; each owner registers its own entry):

| Path | Owner | Scope | Min. class | Nav |
|---|---|---|---|---|
| `/setup` | Setup & auth | app | phone | no |
| `/settings` | Setup & auth | app | phone | yes |
| `/providers` | Model providers | app | phone | yes |
| `/tools` | Tool registry | app | phone | yes |
| `/projects` | Project store (picker) | app | phone | yes |
| `/projects/:projectId/chat` | Agent loop | project | phone | yes |
| `/projects/:projectId/review` (`?run=<runId>`) | Project store | project | phone | yes |
| `/projects/:projectId/files` (`?path=<path>`) | Project store | project | phone | yes |
| `/projects/:projectId/graphs` | Graph runner (graph list, latest run status) | project | phone | yes |
| `/projects/:projectId/graphs/:graphId` | Graph runner (canvas; a child route of the same entry) | project | tablet (child-level gate) | no |
| `/projects/:projectId/manuscript` | Compile & export | project | phone | yes |

  Pages that offer a richer layout on larger screens (files editing, the Tools editor) declare `phone` so the phone gets their read-only view, and switch layout on the device-class signal. The canvas has nothing to offer a phone, so its child route is gated to `tablet` with the Shell's exported `deviceClassGuard('tablet')` (`canMatch`), which shows the same "needs a larger screen" page.
- **Landing (`/`).** The Shell's landing route reads Setup & auth's setup status (`GET` route constant from `/setup-auth`). If setup isn't `complete`, it navigates to `/setup`. Otherwise it reads the Project store's active project and navigates to `/projects/<active>/chat`, or to `/projects` when none is active. It also shows the app version and health while loading.
- **Project-route reconciliation.** The server's active project (Project store) is the source of truth. A `canActivate` guard on `projects/:projectId` compares the URL's id with the server's active project. If they match, navigation proceeds. If not, the guard shows a "Switch to <title>?" page with **Switch** (POSTs the Project store's activate request, then proceeds) and **Go to the active project** (navigates to the same child path under the active id). On a `project-store/project-switched` SSE event, every tab on a project-scoped route navigates to the same child path under the new id.
- The Shell core ships the landing page, the switch page and a not-found page.

**Typed API client**
- One root service over Angular's HTTP client. It is same-origin, sends credentials (the loopback cookie, or the tailnet's Serve identity is implicit), and adds no auth headers.
- Callers pass the Zod schema for the response from their own contract slice. The client parses the response and fails loudly on a mismatch. The Shell imports no feature slice for this.
- Non-2xx responses are parsed with the Platform base error shape into one typed error (HTTP status, error code, message). The error-code convention is Platform's.
- A `401` from any call routes the app to `/setup`, a fixed in-app path registered by Setup & auth. Apart from the landing redirect (setup status route and schema), the Shell imports nothing from the `/setup-auth` slice.
- Reads use GET and commands use POST, matching Platform's method convention. The client offers no "GET with side effects" helper and no other verbs.

**SSE client**
- One native `EventSource` per tab on the Platform's events route (a Platform constant), opened once at app start. It relies on the cookie or Serve identity.
- Each message is parsed with the Platform envelope schema `{module, type, data}`. The client demultiplexes by `module` and exposes a per-module stream/signal. The feature parses `data` with its own slice's schemas. Unknown modules and unknown types are ignored and logged at debug level, which keeps the client forward-compatible under expand–contract.
- **Connection state** (`connecting | open | reconnecting | closed`) is a signal that drives a small status indicator.
- **Reconnect.** Native retry handles network drops. When the stream reaches `CLOSED` (for example after an HTTP error), the Shell recreates it with capped backoff and first checks `/healthz` and auth.
- **Wake and reconcile.** The Shell emits one **reconcile tick** when the stream re-opens after a drop, when the page becomes visible again, on `online`, and on `pageshow` from the back/forward cache. Features register a reconcile callback on that tick that fetches their own "current run state" endpoint. Those endpoints belong to the Agent loop and Graph runner, not the Shell. The Shell does not rely on event replay.

**Theming, nav and notices**
- Material 3 theming with light and dark schemes. The default follows `prefers-color-scheme`. A manual override is stored in device-local storage: devices are access points, not identities, so there is no server-side preference.
- **Nav.** Phone: a bottom nav bar. Tablet: a compact side rail. Desktop: an expanded side nav. Both nav forms come from the same route `data`.
- **Notices.** A root notices service with an app-wide banner area and snackbars. Features post notices to it (for example Setup & auth's compose-version mismatch warning). The connection indicator and the "server unreachable" banner use the same service.

**Breakpoint gate** (this spec fixes the exact breakpoints)
- The device class comes from the CDK's `Handset`, `Tablet` and `Web` query sets, which account for orientation. A phone in landscape stays `phone`. A 12.9-inch iPad in portrait counts as `desktop`. The class is a root signal.
- The gate is a `canMatch` guard on each feature entry plus nav filtering. A view whose minimum class is above the current device is hidden from the nav. Opening it directly shows a "needs a larger screen" page with a link back.
- The gate is checked **at navigation**. A view that is already open is not torn down when the class drops on resize or rotation. Instead a dismissible notice appears, which protects unsaved editor text.
- Default mapping: chat, the review queue, reading and light edits are `phone`. The canvas is `tablet`. Long-form editing is a layout switch inside `phone`-class pages (read-only preview on phones, editor on tablet and desktop). Each feature declares its own class, and a feature may gate a child route with the exported `deviceClassGuard(minClass)`.

**Shared components** (Angular APIs, not contracts)
- **Tool-call card.** A presentational component on a Shell-local view model: tool name, arguments (JSON shown as a key/value tree), status (`pending | running | done | error`), output (Markdown or JSON), error text, sources used (project-relative paths) and a collapsed flag. Cards start collapsed on phones. The Agent loop maps its stream events onto this model, so the Shell does not depend on the `/agent-loop` slice. The Graph runner may reuse the card for inline node results.
- **Diff view.** Inputs: the path, the base text, the proposed text and an optional conflict flag/message. Layout is unified on phones and side by side on tablet and desktop, with an override. The view is built on `@codemirror/merge` and shows whitespace, line-ending and front-matter changes. It knows nothing about pending changes: the Project store feeds it strings.
  - **Read-only diff first** (`phase:shared-components`), so the review queue can ship before the editor phase.
  - **Merge view later** (`phase:editor`). The proposed side becomes editable and the component emits the edited text. Whether the Project store's accept request carries edited text is the Project store's call (see Further Notes).
- **Markdown preview.** Renders through `ngx-markdown` and hides YAML front matter in reading panes (display only, never written back). Sanitised.
- **Markdown editor** (CodeMirror 6).
  - A thin standalone wrapper around a CodeMirror 6 view with Markdown language support. Inputs: a project file reference, a read-only flag and the save mode. Outputs: the dirty state, the save state (`saved | saving | unsaved | failed | conflict`) and errors.
  - **Lossless by construction.** The text the author didn't touch goes back exactly as loaded. The wrapper detects the file's line separator and sets CodeMirror's line-separator facet to it, so CRLF and mixed endings survive. It never trims, reformats or adds or removes the trailing newline. A BOM, if the file API returns one, is kept. The front matter is plain text in the editor.
  - **Saving.** The author's own typing is written **straight through the Project store file API**, not through the pending-changes queue. Saves happen after a debounce (about 1.5 s idle), on explicit save (a button plus Cmd/Ctrl-S), on blur and before route leave. One save is in flight at a time, and later edits coalesce.
  - **Conflicts.** The save sends the Project store write request's `baseHash` (the `hash` from the last read or successful save). A write-conflict error shows the conflict state and never overwrites silently. After a successful save the editor keeps the returned hash as the next base.
  - **Unsaved changes.** A `canDeactivate` guard and a `beforeunload` prompt warn about unsaved text.
  - **Layout.** A split view (source plus `ngx-markdown` preview) is the default on tablet and desktop. Phones get an edit/preview toggle for light edits.
  - **Touch.** Tablet touch, the on-screen keyboard and a hardware keyboard all work. No feature depends on a hardware-only shortcut.

**Dev proxy**
- The dev proxy covers `/api`, `/healthz` and the events route. The events route must stream unbuffered (no compression, no response buffering).
- `npm run dev` runs the Angular dev server alongside the API through `concurrently` (Platform's script).
- In production, NestJS serves the built bundle on the same origin with `@nestjs/serve-static`, so no proxy is involved.

**PWA and polish (M7)**
- **Manifest and service worker.** A web app manifest and icons, plus Angular's service worker, used only to cache the app shell's static assets.
- **Never cached:** `/api`, `/healthz`, the events route, and `/setup` (including the token URL). Offline use is limited to a "server unreachable" page.
- **Install.** The PWA installs over the tailnet's HTTPS name. Loopback (`127.0.0.1`) is a secure context, so the PWA also works there.
- **Fresh code after an update.** The service worker checks for a new bundle and prompts a reload when the server was updated. This is not an "update available" check against Docker Hub, which is out of v1.
- **Polish:**
  - an accessibility pass (labels, focus order, contrast in both themes);
  - desktop keyboard shortcuts;
  - loading skeletons;
  - the about panel (app version from the Platform version info, health from `/healthz`);
  - the empty states the Shell owns.

## Phases

Phases are serial. Every phase is blocked by Platform `phase:scaffold`.

Milestones referenced here: M1 is the walking skeleton, M3 is review and grounding, and M7 is remaining tools and polish.

### `phase:core` — M1
The gate that every feature UI phase names. The Shell has **no `phase:contract`** because it publishes no slice.

Blocked by: Platform `phase:scaffold`; Setup & auth `phase:contract` and Project store `phase:contract` (route constants and schemas only, for the landing redirect and project-route reconciliation; both are small and land early in wave 1).

Scope:
- the web composition root, the root route table, and the feature-registration pattern with its route `data`;
- the landing and not-found pages;
- the dev proxy for `/api`, `/healthz` and the events route;
- the typed API client (Zod response parsing, base error shape, 401 → `/setup`);
- the SSE client (one `EventSource`, envelope demultiplexing, connection-state signal, reconnect, reconcile tick);
- the active-project signal, the landing redirect, and project-route reconciliation (guard, switch page, `project-switched` navigation);
- Material theming (light, dark, override), nav (bottom/rail/side) and the breakpoint gate (device-class signal, `canMatch`, the "larger screen" page);
- the notices service and the "server unreachable" banner;
- test doubles: the fake API client and the fake event source, typed from the contract package.

Acceptance criteria:
- [ ] `npm run dev` serves the Shell. Through the proxy, `/healthz` answers and an `EventSource` on the events route receives `platform/hello`, and `platform/echo` envelopes triggered through `POST /api/platform/echo` arrive with no buffering delay.
- [ ] A dummy feature registered with one route-table entry is lazy-loaded (its own chunk), shown in the nav with its label and icon, and absent from the initial bundle.
- [ ] A feature with minimum class `tablet` is hidden from the phone nav. Opening its URL on a phone viewport shows the "larger screen" page. Resizing an open view below its class keeps it open and shows a notice.
- [ ] Phone viewports show the bottom nav. Tablet shows the rail. Desktop shows the side nav.
- [ ] The API client returns parsed data for a valid response, a typed error (status, code, message) for a Platform error body, and a failure for a schema mismatch. A `401` navigates to `/setup`.
- [ ] Envelope events for module A reach only A's subscribers. Unknown modules and types are ignored without error.
- [ ] Simulated drop then re-open, `visibilitychange` to visible, `online` and `pageshow` each emit one reconcile tick. A `CLOSED` stream is recreated with backoff.
- [ ] With a fake API: an incomplete setup status sends `/` to `/setup`; a complete one with an active project sends it to `/projects/<id>/chat`, and with none to `/projects`.
- [ ] Opening `/projects/b/chat` while `a` is active shows the switch page. Switch POSTs the activate request and proceeds. A fake `project-switched` event moves an open `/projects/a/review` tab to `/projects/b/review`.
- [ ] Light and dark themes follow the OS setting. The override persists across reloads on the same device.
- [ ] A feature route test using the fake API client and fake event source runs under Vitest, and serves as the template for feature modules.
- [ ] The Platform Playwright e2e still passes: its first step loads the Shell.

M1 "done when": *the author types "summarize my outline" and gets a correct answer with visible tool calls.* The Shell is the substrate. The Agent loop's chat route and the tool-call card (next phase) complete it.

Demo script (Shell part, under 5 minutes):
1. Run `npm run dev` and open the app.
2. Check the landing page's version and health.
3. Toggle dark mode and reload; the choice persists.
4. Switch the dev tools viewport to a phone: the bottom nav appears and the canvas entry is hidden. Open the canvas URL directly and see the "larger screen" page.
5. Stop the API and see the reconnecting indicator, then the "server unreachable" banner.
6. Start the API again and watch it reconnect and fire a reconcile tick (visible in the debug log).

### `phase:shared-components` — M1 (tool-call card, Markdown preview), M2 (read-only diff: the Tool registry's Compare needs it at M2, the Project store's review queue at M3)
Blocked by `phase:core`.

Scope:
- the tool-call card and its view model, including collapsed-on-phone behaviour and the sources list;
- the read-only diff view on `@codemirror/merge`, unified or side by side by device class;
- the Markdown preview component (front matter hidden, sanitised).

Acceptance criteria:
- [ ] The tool-call card renders each status (`pending`, `running`, `done`, `error`) with the tool name, arguments, output or error, and source paths. It is collapsed by default on a phone viewport and expands on tap.
- [ ] The read-only diff shows insertions, deletions and changed lines for base vs proposed text. It renders unified on phones and side by side on tablet and desktop, and the toggle overrides that.
- [ ] Whitespace-only, line-ending-only (LF to CRLF) and front-matter-only changes are visible as changes. Identical inputs show "no changes".
- [ ] The Markdown preview renders a draft with front matter, without showing the front-matter block. A `<script>` or inline event handler in the source is not executed or rendered.
- [ ] The Agent loop's chat route can render a run's tool calls with the card using only the card's documented inputs (checked with the fake event source).

### `phase:editor` — M3
Blocked by `phase:shared-components` and by Project store `phase:contract` (file reference type and the file-API read/write requests).

Scope:
- the CodeMirror 6 Markdown editor wrapper, with lossless loading and saving and line-separator detection;
- debounced and explicit save through the file API, save-state output, conflict state, and the unsaved-changes guard plus `beforeunload`;
- split view with the preview on tablet and desktop, and the edit/preview toggle on phones;
- tablet touch and keyboard checks;
- the editable merge view (proposed side editable, emitting the edited text) on `@codemirror/merge`.

Acceptance criteria:
- [ ] **Round trip.** Loading then saving with no edits sends a file-API write whose content is **byte-identical** to the loaded content. The check runs on a fixture set: YAML front matter, `_emphasis_` and `*emphasis*`, CRLF endings, mixed endings, no trailing newline, a leading BOM, and trailing whitespace.
- [ ] An edit changes only the edited range. All other bytes match the original.
- [ ] Typing then pausing saves once after the debounce. Cmd/Ctrl-S and the save button save at once. Saves during an in-flight save coalesce into one follow-up save.
- [ ] Save state moves through `unsaved → saving → saved`. A failed write shows `failed` and keeps the text. A precondition failure from the file API shows `conflict` and does not overwrite.
- [ ] Navigating away or closing the tab with unsaved text prompts first.
- [ ] Tablet and desktop show the split view with a live preview. Phones show the edit/preview toggle.
- [ ] On a tablet viewport with touch emulation: tap to place the cursor, select by touch, type with the on-screen keyboard, and save, all without a hardware key.
- [ ] The merge view's proposed side is editable and emits the edited text. Read-only mode is unchanged.

### `phase:polish` — M7
Blocked by `phase:editor`.

Scope:
- the web app manifest, icons and service worker (app-shell assets only), with exclusions for `/api`, `/healthz`, the events route and `/setup`;
- the reload prompt after a server update;
- the about panel;
- an accessibility pass, desktop keyboard shortcuts, loading skeletons and empty states.

Acceptance criteria:
- [ ] The app is installable (passes the browser's installability checks) over the tailnet HTTPS URL and on loopback, and opens full screen.
- [ ] With the service worker active, no request to `/api`, `/healthz`, the events route or `/setup` is served from cache. Streaming still works after install.
- [ ] After the server is updated to a new build, an open installed app prompts a reload and then runs the new bundle.
- [ ] An automated accessibility check of the Shell (nav, landing, notices, editor, diff, card) reports no serious violations in either theme.
- [ ] The Platform e2e gains a phone-viewport check that the bottom nav is shown and the review step works there.

M7 "done when" for the Shell: *the author installs Scriba on an iPad over the tailnet, drafts and saves a scene, and the file is byte-identical on disk to what was typed; a phone reviews and accepts a pending change from the installed app.*

Demo script (under 5 minutes):
1. On the iPad, open `https://scriba.<tailnet>.ts.net` and Add to Home Screen. Launch it.
2. Open a draft: the split view appears. Type a paragraph and wait for "saved".
3. On the Mac, `git diff` the file: only the paragraph changed.
4. On the phone, open the installed app: the bottom nav shows Review. Accept a pending change.
5. Toggle airplane mode on the phone and back: the indicator shows reconnecting, then current state.

## Contracts

**Produces.** No contract slice. `/shell` is empty (the Shell is UI only). The Shell provides these **Angular APIs** to feature modules, versioned with the app rather than through `@bbartolome/scriba-contracts`:

| API | Consumers | Available from |
|---|---|---|
| Route-table entry pattern + route `data` (nav label, icon, order, minimum device class, scope) | every feature UI | `phase:core` |
| Typed API client (Zod-parsed responses, typed error, 401 → `/setup`) | every feature UI | `phase:core` |
| SSE client: per-module event stream, connection-state signal, reconcile tick | Agent loop, Graph runner, Project store (queue updates) | `phase:core` |
| Device-class signal and breakpoint gate | every feature UI | `phase:core` |
| Active-project signal | project-scoped features | `phase:core` |
| Notices service | Setup & auth (compose-version mismatch), any feature | `phase:core` |
| Fake API client + fake event source (test doubles) | every feature's route tests | `phase:core` |
| Tool-call card | Agent loop chat (M1); optionally Graph runner node results | `phase:shared-components` |
| Read-only diff view | Tool registry Compare (M2), Project store review queue (M3), Agent loop write previews (M3) | `phase:shared-components` |
| Markdown preview | Compile & export manuscript/reading, Project store, Agent loop | `phase:shared-components` |
| Markdown editor (lossless, saves through file API) | Project store drafts, Compile & export manuscript editing | `phase:editor` |
| Editable merge view | Project store review queue | `phase:editor` |

**Consumes.**

| Slice | Producer | What | Gate |
|---|---|---|---|
| `/platform` | Platform | SSE envelope `{module, type, data}`, events route constant, base error shape + error-code convention, `/healthz` response, app version info | Platform `phase:scaffold` (publishes `/platform`) |
| `/setup-auth` | Setup & auth | setup status shape and route constant (landing redirect) | Setup & auth `phase:contract` (blocks `phase:core`) |
| `/project-store` | Project store | active-project response, activate request, `project-switched` event (blocks `phase:core`); project-relative path + file reference type, file-API read/write requests including `baseHash` and the write-conflict error code (blocks `phase:editor`) | Project store `phase:contract` |

The Shell does not consume `/agent-loop`, `/graph-runner` or `/compile-export`. The tool-call card and diff view take Shell-local inputs, so the Agent loop, Graph runner and Compile & export slices never block the Shell. The `/setup` route is a fixed in-app path registered by Setup & auth, and the Shell does not import it.

## Testing Decisions

- **What makes a good test.** It exercises external behaviour only: what the author sees and does in a rendered route, and what goes over the wire (HTTP requests and `EventSource` messages). It never asserts on private services, signals' internal wiring or component internals.
- **Seam: rendered routes with Angular's Vitest runner**
  - Shell tests render the composed Shell (root routes plus a dummy feature registered through the real pattern) against the **fake API client and fake event source** built from contract types.
  - These doubles are shipped by `phase:core` so every feature module uses the same seam.
- **SSE client.** Tested through a stubbed global `EventSource` (the browser boundary): envelope demultiplexing, unknown-member tolerance, `CLOSED` recreate with backoff, and reconcile ticks on re-open, `visibilitychange`, `online` and `pageshow`.
- **Breakpoint gate and nav.** Tested by driving `matchMedia` / `BreakpointObserver` per device class. The tests assert nav contents, `canMatch` outcomes and the "keep the open view" rule on resize.
- **Editor round trip.** A byte-level fixture suite (front matter, both emphasis styles, CRLF, mixed endings, BOM, no trailing newline, trailing whitespace). The test loads through the fake file API, saves with no edits, and asserts the captured write payload equals the input byte for byte. It also asserts a targeted edit changes only that range. This byte-diff round trip is kept as a regression test.
- **Diff view.** Fixture pairs assert rendered change markers (including whitespace and line-ending-only changes) and the unified/side-by-side switch by device class.
- **Security.** Markdown preview fixtures with `<script>`, `onerror` and `javascript:` links assert nothing executes or renders as active HTML.
- **System.** The single Platform-owned Playwright e2e runs against the dev server, so it exercises the Shell's proxy, SSE through the proxy, and nav on every run. `phase:polish` adds the phone-viewport review check.
- **Contracts.** None of the Shell's own (no slice). The Shell's use of `/platform` schemas is covered by the envelope and error tests above.
- **Prior art.** None in the repo yet. The canvas library evaluation's headless-Chromium touch synthesis is reference only for the tablet touch checks. The Markdown round-trip probe is the model for the fixture suite: it loaded a real file with YAML front matter, saved it with no edits and byte-diffed the result.

## Out of Scope

- **Feature pages:** the chat, review queue, canvas, manuscript, settings, `/setup` and tool-spec pages belong to their modules. The Shell gives them the pattern and shared components only.
- **The canvas.** `ngx-vflow` and both canvas views belong to the Graph runner. The Shell only gates them to `tablet` and above.
- **The "current run state" endpoints** and their shapes (Agent loop, Graph runner). The Shell only emits the reconcile tick.
- **Pending-change semantics:** the captured base, the three-way check, accept/reject and partial accept all belong to the Project store. The diff view renders strings.
- **WYSIWYG editing.** TipTap and Milkdown are ruled out.
- **Offline editing** or an offline write queue. The service worker caches the app shell only.
- **A native mobile app**.
- **Per-user preferences on the server.** There are no accounts.
- **An "update available" notice** against published images (not in v1).
- **Read-only reviewer access** (later).
- **Internationalisation.**
- **Superseded proposals, with their replacements:**
  - The frontend is Angular 22 + Angular Material, replacing React with Vite.
  - The Markdown editor is CodeMirror 6 only, replacing the choice between CodeMirror and TipTap.
  - The canvas is `ngx-vflow`, in the Graph runner, replacing React Flow.
  - Agent and recipe writes to `drafts/` still go through the pending-changes queue, so no tool writes straight to `drafts/`. The author's own typing in the editor saves straight to the file. This replaces the rule that nothing touches `drafts/` until the author has reviewed a diff.

## Further Notes

- **Milestone scope.** The M7 "done when" above is the Shell's criterion. The remix comparison view (M7) belongs to whichever module ships Remix (a Genre packs tool that rewrites a passage in another shape for side-by-side comparison). It can reuse the diff view's side-by-side layout, and extending the diff view to more than two variants would be an additive Shell change requested by that module.
- **Merge-view edits and the Project store.** The editable merge view emits edited text. The Project store's accept request carries it as optional `content` (decided in Project store work units `work/project-store/PST-01-contract-slice.md` and `PST-16-apply-three-way-check.md`).
- **Editor conflicts.** The Project store write request takes an optional `baseHash` and returns a distinct write-conflict error code, which the editor maps to `conflict`.
- **Dev proxy vs Origin/Host checks.** The dev proxy forwards `Host` and `Origin` unchanged (no `changeOrigin`). `npm run dev` sets `SCRIBA_DEV_ORIGINS=http://localhost:4200` so Setup & auth's guard accepts the dev server's Host and Origin, and `SCRIBA_SETUP_URL_BASE` to the same origin so the cookie is set where the browser uses it.
- **iOS Safari** drops `EventSource` connections when backgrounded. The reconcile tick on `visibilitychange` and `pageshow` is what keeps the phone and iPad correct. Event replay (`Last-Event-ID`) is not relied on, and Platform may add it later without Shell changes.
- **Breakpoints** follow the CDK's `Handset`/`Tablet`/`Web` sets as decided above. The canvas library's touch checks were synthesised in headless Chromium and did not cover real tablets or Safari. The editor's tablet touch check passed on a test page. If testing on real devices shows a misclassification, adjust the mapping in the Shell. Features declare only a class, never pixel widths.
