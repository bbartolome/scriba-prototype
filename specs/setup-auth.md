# Spec: Setup & auth

## Problem Statement

Scriba runs as a Docker container on the author's own machine. The author starts it with one host command, so it is running before the author has made any choice inside it. From then on the author needs to:

- **Get in safely the first time.** Scriba is always on `http://127.0.0.1:<port>` on the Mac. Other local processes, and any web page the author visits, can reach that port. If nothing guards it, a malicious page could use DNS rebinding or a cross-site form post to read the manuscript, spend provider credit or overwrite drafts.
- **Reach Scriba from the iPad and the phone** without accounts or a pairing step. Tailscale is optional, and logging in to it today means hunting through container logs for a login link.
- **Finish first-run setup in one place.** That means connecting Tailscale, adding a model provider (BYOK), setting a few preferences and opening a first project. The author should be able to come back later, change any answer and never lose what was already set up.
- **Recover** after losing the browser cookie, wiping a device or locking themselves out with an allowlist.
- **Notice when the install itself is out of date.** The image updates with `docker compose pull`, but the compose file only changes when the installer is re-run. A mismatch between the two can break things without any visible sign.

Every other module exposes an HTTP API and needs the same answer to "is this request from the author?". If each module wrote its own check, the checks would drift, and one GET handler that changes state would reopen the CSRF hole.

## Solution

Setup & auth gives Scriba one way in and one guard.

- **Setup token.** On first start the app generates a long random token and persists it in `/books/.scriba/`. It writes the setup URL to `/books/.scriba/setup-url` (mode 0600) and prints it to stdout. The installer prints the same URL when it finishes. The token is reusable: re-opening the setup URL is also how the author recovers access.
- **Token handshake.** Opening the setup URL validates the token, sets an HttpOnly, SameSite=Strict session cookie and redirects to `/setup` without the token in the address bar.
- **One guard for every API route.** A request is the author's if either:
  - it carries a valid session cookie and its Host is a loopback name, or
  - its Host is the app's tailnet name and Tailscale Serve injected a `Tailscale-User-Login` identity.

  The guard is default-deny and covers every module's routes. It also checks the Host against a config-derived allowlist and checks the full Origin, including the scheme, on every mutation. It sends no CORS headers.
- **`/setup`.** An in-app wizard for the token status, the Tailscale login (the live login link, read from tailscaled's LocalAPI), model providers (the Model providers UI, embedded), preferences and the first project (new, import or start from a sample, through the Project store). Re-running it is safe. Every step shows the previous answers as defaults and never overwrites config the author did not change.
- **Settings page.** It shows how the author is connected and the Tailscale status, and holds the opt-in owner allowlist (auto-seeded from Tailscale status), preferences, the providers section, the app and compose versions with a mismatch warning, recovery instructions and a "re-run setup" entry.
- **GET/HEAD never mutate.** A cross-module test owned by this module enforces that invariant for every route in the composed app.

## User Stories

### First run and the setup token

1. As an author, I want the installer to finish by printing a single URL, so that I know exactly what to open next.
2. As an author, I want that URL to sign me in on my Mac's browser without asking me to invent a password, so that first run takes one click.
3. As an author, I want the token removed from the address bar after it has been accepted, so that it doesn't end up in screenshots, bookmarks or shared links.
4. As an author, I want the setup URL saved in a file in my library (`~/Books/.scriba/setup-url`) that only my user can read, so that I can find it again later without other OS users reading it.
5. As an author, I want the app to print the setup URL to its logs every time it starts, so that `docker compose logs scriba` is another way to find it.
6. As an author, I want the same setup URL to keep working after the first use, so that I can sign in again on a new browser or after clearing cookies.
7. As an author, I want an invalid or stale token to give a clear "this link is not valid" page with the command to print the current URL, so that I'm not left at a blank error.
8. As an author, I want the token to survive container restarts and image updates, so that a URL I saved keeps working.
9. As an author, I want a documented way to replace a token I think has leaked, so that I can lock out whoever has the old one.

### Loopback access

10. As an author, I want my signed-in browser on the Mac to stay signed in for a long time, so that I'm not asked for the setup URL every day.
11. As an author, I want a request from any other website to my local Scriba port to be rejected, so that a page I visit can't read or change my book.
12. As an author, I want requests that arrive with an unexpected Host name to be refused, so that DNS-rebinding attacks can't reach Scriba through a hostile domain.
13. As an author, I want a "sign out this browser" action, so that I can clear access on a shared computer.
14. As an author, I want opening Scriba at `http://localhost:<port>` and at `http://127.0.0.1:<port>` both to work, so that either habit gets me in.

### Tailnet access

15. As an author, I want to log in to Tailscale from inside `/setup` with a link the app shows me, so that I don't have to read container logs.
16. As an author, I want `/setup` to show whether Tailscale is logged out, waiting for login or running, so that I know what to do next.
17. As an author, I want Tailscale to stay optional, with a visible "skip" choice, so that I can use Scriba on my Mac alone.
18. As an author, I want `/setup` to show my tailnet URL (`https://scriba.<tailnet>.ts.net`) once Tailscale is running, so that I can open it on my iPad and phone.
19. As an author, I want `/setup` to warn me when MagicDNS or HTTPS certificates are not enabled on my tailnet, so that I can fix the admin console setting instead of guessing why the URL fails.
20. As an author, I want my iPad and phone to get in through their Tailscale identity with no pairing step, so that a new device only needs to be on my tailnet.
21. As an author, I want an opt-in allowlist of Tailscale logins, seeded with my own login, so that people I've shared the node with can't use Scriba unless I add them.
22. As an author, I want Scriba to stop me from turning on the allowlist in a way that locks out the device I'm using, so that I don't cut myself off by mistake.
23. As an author, I want a clear message on a tailnet device whose identity is missing or not allowed, so that I know whether to sign in to Tailscale or change the allowlist.
24. As an author, I want logging in to Tailscale after setup (late login) to make the tailnet URL work without restarting Scriba, so that I can add it whenever I like.

### The `/setup` flow

25. As an author, I want `/setup` to walk me through token, Tailscale, model providers, preferences and first project in order, so that I finish setup in one sitting.
26. As an author, I want to skip any step except the token and come back later, so that a missing API key doesn't block me from looking around.
27. As an author, I want the providers step to be the same screen I'll later use in settings, with Ollama already filled in, so that I learn one UI and can usually just pick a model.
28. As an author, I want to set a few preferences (my author name, the theme, the default genre pack for new projects), so that new projects and the UI start the way I like.
29. As an author, I want the first-project step to offer "new", "import an existing folder" and "start from a sample", so that I can begin from scratch, from my own files or from a working example.
30. As an author, I want the first-project step to show the projects I already have when I re-run setup, so that I'm never asked to create one I already have.
31. As an author, I want re-running `/setup` to show every previous answer as the default, so that I can change one thing without retyping the rest.
32. As an author, I want re-running `/setup` never to overwrite settings I didn't touch, so that revisiting a step is safe.
33. As an author, I want to land on `/setup` automatically until setup is complete and on the main app afterwards, so that I'm never dropped into an empty workspace.
34. As an author on my phone, I want to be able to finish setup over the tailnet, so that I can complete a step I skipped on the Mac.

### Settings page

35. As an author, I want a settings page that shows how this device is connected (loopback cookie or tailnet identity, and which login), so that I understand my access.
36. As an author, I want the settings page to show the Tailscale status and the login link again, so that I can reconnect after a logout.
37. As an author, I want to edit the owner allowlist and turn it on or off on the settings page, so that I control tailnet access in one place.
38. As an author, I want the settings page to show the app version and the compose version, so that I can tell what I'm running when I report a problem.
39. As an author, I want a visible warning when my compose file is older than the app expects, with the exact update command, so that I fix it before something breaks.
40. As an author, I want recovery instructions on the settings page and in the docs, so that I know what to do before I'm locked out.
41. As an author, I want a "re-run setup" button on the settings page, so that I can walk through setup again on purpose.

### Module implementers and the invariant

42. As a module implementer, I want one global guard that covers my routes automatically, so that I don't write or forget my own auth check.
43. As a module implementer, I want a typed accessor for the request's identity (loopback or tailnet, plus the login), so that I can record who made a change without parsing headers.
44. As a module implementer, I want a test that fails if any GET or HEAD route in the composed app changes files or state, so that I learn about a CSRF-shaped bug in CI and not in production.
45. As a module implementer, I want a test that fails if any mutating route accepts a request with no credential or a foreign Origin, so that guard coverage can't silently regress.
46. As a module implementer, I want the auth error responses to follow Platform's error shape and code convention, so that the Shell's API client handles them in one place.
47. As a module implementer, I want the dev server and the Playwright e2e to authenticate the same way the product does, so that tests cover the real path.

### Operator and safety

48. As an author, I want the app to need no Tailscale CLI and no extra privileges to show my login status, so that the image stays small and simple.
49. As an author, I want the spec and docs to state plainly that the app can control tailscaled through the shared socket, so that I accept that trade-off knowingly.
50. As an author, I want Scriba to keep working on loopback when tailscaled is missing, stopped or unreachable, so that a Tailscale problem never locks me out of my Mac.

## Implementation Decisions

### Module shape
- One vertical module, as the repo, build, image and runtime topology decision lays it out: a NestJS `@Module` in `apps/api` and a lazy `Routes` array in `apps/web` with two routes, `/setup` and the settings page (route path to be confirmed with the Frontend shell spec; `/settings` is proposed). Platform imports the module into the API composition root. The Shell adds the route-table entries and a settings nav item.
- The module provides the app's **single global guard**, registered as the default for every route. It also provides a request-identity accessor that other modules use. Both are NestJS APIs, not contract-slice members.
- **Default-deny.** A route skips the credential check only if it carries an explicit public marker. The fixed public set is `/healthz`, the token-handshake endpoint, the identity endpoint (it answers 401 when there's no credential), and the static Angular bundle. The static bundle still goes through the Host check. A test pins the public set.

### Setup token
- Generated on first start, only when no token exists: at least 256 bits from a CSPRNG, base64url. Persisted in its own 0600 file inside `/books/.scriba/` (directory 0700, matching the secrets floor in the project storage, app state and search decision).
- **`setup-url`** (0600) is rewritten on every start from the persisted token and the current loopback base URL, `http://127.0.0.1:<SCRIBA_PORT>`. The port can change between starts, so the file is never trusted as the source of the token.
- The setup URL is printed to stdout on every start (the installer, auth and model providers decision requires first start; printing every start makes the logs a recovery path too). Anyone with Docker access can read the logs, but Docker access already means control of the host.
- The installer reads `setup-url` after the healthcheck passes (per the installer, auth and model providers decision; owned by Platform). The file's location and its single-line format are the interface. The setup URL points at the handshake endpoint with the token as a query parameter. A fragment can't be used, because the server has to see the token to set the cookie.
- Tokens are compared in constant time. Failed attempts are logged without the token value.

### Token handshake
- `GET` on the handshake endpoint with a valid token sets the session cookie and answers 303 to `/setup`, or to `/` once setup is complete. The response carries `Referrer-Policy: no-referrer` so the token can't leak through Referer. An invalid token gets a page that explains how to print the current URL.
- **The handshake changes no server state.** The cookie is stateless: a signed value holding the issue time, with the signing key derived from the setup token. Validating a token and issuing a cookie therefore don't count as a GET mutation, and replacing the token invalidates every issued cookie at once.
- The handshake issues cookies only on loopback Hosts. On the tailnet name it redirects without setting a cookie, because the tailnet identity is the credential there.
- **Cookie attributes:**
  - HttpOnly and SameSite=Strict.
  - `Path=/` and no `Domain`, so the cookie is host-only.
  - A long `Max-Age`, up to the browser maximum of about 400 days.
  - The name includes the port, because cookies are not isolated by port and other local apps on `127.0.0.1` would otherwise collide with it.
  - The `__Host-` prefix can't be used, because it requires `Secure`.
- **`Secure` flag (per the installer, auth and model providers decision: verify first).** Chrome and Firefox accept `Secure` cookies on `http://127.0.0.1` and `http://localhost`. Safari's behaviour must be checked. The `phase:token-guard` acceptance criteria include a recorded check in Safari, Chrome and Firefox on macOS. The expected outcome, and the fallback the installer, auth and model providers decision names, is to set `Secure` only on HTTPS responses. Because the cookie is issued only on loopback, in practice that means no `Secure` flag.
- **SameSite=Strict and the first redirect.** Navigating from a terminal link is cross-site, so the redirected request after the handshake may not carry the new cookie. That's fine, because the static bundle needs no credential. The SPA then calls the API with same-origin `fetch` and `EventSource`, which do send the cookie. Guarded resources are therefore only ever fetched by the SPA, never as top-level navigations.
- "Sign out this browser" is a POST that expires the cookie.

### The guard
The guard handles each request in this order:
1. **Host check** (every route except `/healthz`). The Host header must exactly match one entry in the config-derived allowlist:
   - `127.0.0.1:<SCRIBA_PORT>` and `localhost:<SCRIBA_PORT>`;
   - the tailnet name, taken from the LocalAPI's `Self.DNSName` with the trailing dot removed, with or without `:443`.

   There are no wildcards and no short `scriba` name. When Tailscale is unavailable or logged out, only the loopback entries apply. An unknown Host triggers at most one rate-limited refresh of the Tailscale status before rejection, so late login works without a restart. `/healthz` is exempt because the container healthcheck calls the internal port.
2. **Credential.**
   - Loopback Host: a valid session cookie is required. A `Tailscale-User-Login` header on a loopback Host is ignored.
   - Tailnet Host: the `Tailscale-User-Login` header is the credential. Serve strips any copy the client sends and injects its own. If the owner allowlist is on, the login must be in it. A tailnet request without the header gets a specific error explaining that the device must be signed in to Tailscale as a user. Tagged devices get no user identity from Serve.
   - A session cookie on a tailnet Host is not a credential.
3. **Origin check on mutations** (every method other than GET, HEAD and OPTIONS). `Origin` must be present and must equal the full origin expected for the request's Host: `http://127.0.0.1:<port>` or `http://localhost:<port>` on loopback, `https://<tailnet name>` on the tailnet (per the installer, auth and model providers decision; Tride's guard assumed `http://`). A missing or `null` Origin is rejected.
4. **No CORS.** No response ever carries `Access-Control-*` headers. OPTIONS gets no CORS headers, so cross-origin preflights fail.
- **Proposed addition (not in the installer, auth and model providers decision; flag for review):** `Content-Security-Policy: frame-ancestors 'none'` on all responses. On the tailnet path the network identity authenticates even a framed page, so clickjacking would otherwise work there.
- **Errors** use Platform's base error shape and code convention. The codes are auth required (401), Host rejected (403), Origin rejected (403) and tailnet identity not allowed (403). The Shell's API client sends 401s to the sign-in notice on `/setup`.
- **Dev mode.** The Angular dev server's origin differs from the API's. Platform's env list therefore gains one dev-only setting that adds extra loopback origins, and the setup-URL base can be overridden there too. Neither is ever set in the image. The proxy owned by the Shell must forward `Host` and `Origin` unchanged (cross-spec check).
- **Serve preserves Host.** The guard assumes Serve forwards the original Host (the tailnet name) to `127.0.0.1:8080`, and that it injects `Tailscale-User-Login` only for proxies to localhost. Both are verified in `phase:tailnet` against a real tailnet.
- **Peer-address check on the identity header.** Serve proxies from `127.0.0.1` inside the shared network namespace, while the host's loopback publish arrives from the Docker gateway address (Platform spec), and Platform drops direct connections from Tailscale ranges. So the guard trusts `Tailscale-User-Login` only when Host is the tailnet name **and** the socket's peer address is loopback (`127.0.0.1` or `::1`). This stops a non-browser process on the Mac from forging the header through the published port. A test confirms it, and ST-1 checks the real peer addresses. If ST-1 shows that published-port traffic can arrive from loopback on some Docker setup, the fallback is a second, unpublished listener for Serve, with the header trusted only there.

### Request identity (contract shape)
- The identity endpoint returns one of two variants:
  - `{via: 'loopback'}`, the cookie path;
  - `{via: 'tailnet', login}`, where login is the `Tailscale-User-Login` value.
- Modules read the same shape through the accessor. There's no user table and no per-user data. The identity is for display and logs only, never for partitioning data.

### Tailscale LocalAPI
- The app calls `GET /localapi/v0/status` over the Unix socket from the shared named volume at `/var/run/tailscale`. Platform's compose sets `TS_SOCKET=/var/run/tailscale/tailscaled.sock` on the sidecar. Requests use `Host: local-tailscaled.sock`. There's no Tailscale CLI in the app image.
- Fields read:
  - `BackendState` (`NoState`, `NeedsLogin`, `NeedsMachineAuth`, `Stopped`, `Starting`, `Running`);
  - `AuthURL`;
  - `Self.DNSName`, which gives the tailnet name;
  - `CurrentTailnet.MagicDNSEnabled` and `CertDomains`, for the prerequisites hint (an empty `CertDomains` means HTTPS certificates are off);
  - `Self.UserID` with the `User` map, which gives the owner's login for seeding the allowlist.

  The hostname is never hard-coded to `scriba`, because Tailscale may assign `scriba-1`.
- **Normalised status.** The contract carries an availability flag (unavailable when the socket is missing or the call is refused, as in plain `npm run dev`), the backend state, the auth URL, the tailnet name, the tailnet URL and the prerequisites flags. Status is cached briefly server-side.
- **The UI polls.** The `/setup` Tailscale step and the settings page poll the status endpoint every few seconds while visible. This module publishes no SSE events in v1, which keeps its slice small.
- **The app controls tailscaled (caveat from the installer, auth and model providers decision).** Any process that can write to the socket can drive tailscaled: log it out, change prefs, edit the Serve config. The app only ever reads status. This is accepted for a single owner and stated in the docs. A compromised app process could therefore disconnect or re-point the node.
- **Socket-permission smoke test.** Run as the app's non-root UID (`user:` from `.env`, per the repo, build, image and runtime topology decision). It checks that the socket is reachable and that `status` succeeds, on macOS (Docker Desktop) and on Linux. It also records whether write endpoints are allowed, for information. It joins Platform's manual pre-release checklist next to ST-1 to ST-3. If it fails, the fallback is a sidecar entrypoint step that relaxes socket permissions; the last resort is a `/setup` hint to run `docker compose logs tailscale`.
- With an auth key in `.secret`, the state reaches `Running` without interaction, and the step shows as done.

### `/setup` flow
- **Steps:**
  1. Access: shows the current identity.
  2. Tailscale: state, login link, prerequisites, skip.
  3. Model providers.
  4. Preferences.
  5. First project.

  Every step except Access can be skipped. Setup status records each step as `pending`, `done` or `skipped`, plus an overall `complete` flag that is set when the author finishes or explicitly skips the remaining steps.
- **Model providers step.** It embeds the Model providers module's settings component (an Angular API, as with Shell components), or links to it if that component hasn't landed yet. It never reimplements provider forms, model listing or the connection test. Ollama is seeded by Model providers.
- **Preferences step.** A minimal set, chosen here because the recorded design decisions are silent on preferences: author display name (a default for new projects), theme (system/light/dark, applied through the Shell's theming), and default genre pack for new projects. Stored in Setup & auth's `preferences` section of `settings.yaml`. The section is versioned through the startup migration hook, and the hook's owner is confirmed in the Platform spec.
- **First-project step.** It calls the Project store API to list projects, create a new one, import an existing folder or start from a sample. The samples come from Project store's baked-in templates. If projects already exist, it lists them and offers to open one or create another. It never re-creates anything.
- **Idempotent re-runs.** Every step loads current values as defaults. A step writes only the fields the author changed, through the owning module's API. Setup & auth's own writes are field-level merges into its `settings.yaml` sections. Re-running never deletes, resets or re-seeds anything.
- **Routing.** The SPA sends an authenticated author to `/setup` until `complete` is set. An unauthenticated visitor on loopback sees a sign-in notice with the command that prints the setup URL, `cat ~/Books/.scriba/setup-url`. On the tailnet the notice explains identity and allowlist failures.

### Owner allowlist
- Off by default. The settings shape is `{enabled, logins[]}` in Setup & auth's `settings.yaml` section.
- Turning it on when the list is empty seeds it with the tailnet owner's login from Tailscale status.
- A change made over the tailnet is refused if it would exclude the login making it.
- Loopback cookie access ignores the allowlist, so the Mac plus the setup URL is always the way back in.

### Compose-version mismatch
- The app compares `SCRIBA_COMPOSE_VERSION` from its environment, which the installer stamps into `.env`, with the compose version the image expects. That expected version is a constant published with Platform's version info.
- The status has three states:
  - `ok`;
  - `mismatch`, with expected and actual versions;
  - `unknown`, when the variable is missing.
- A mismatch or `unknown` shows a warning on `/setup` and the settings page with the exact re-run-the-installer one-liner. The setup status also exposes the flag so the Shell can show a global banner if its spec chooses to.

### Recovery (documented on the settings page and in the user docs)
1. Re-open the setup URL. Print it with `cat ~/Books/.scriba/setup-url` or find it in `docker compose logs scriba`.
2. To replace a leaked token, delete the token file in `~/Books/.scriba/` and restart. A new token is generated, `setup-url` is rewritten, and every existing cookie stops working.
3. Last resort: wipe `~/Books/.scriba/`. This also removes settings, secrets and search indexes, but projects stay untouched.
4. If the allowlist locks out a tailnet device, use the Mac and the setup URL.

A CLI reset-token is a later work item.

## Phases

### `phase:contract` (M1)
Scope:
- Publish `@bbartolome/scriba-contracts/setup-auth` (Zod + TS, shapes and constants only):
  - setup status (per-step state, `complete`, compose-mismatch flag);
  - token-handshake request/response, including the error codes;
  - identity shape (`loopback` | `tailnet` + login);
  - normalised Tailscale status (availability, `BackendState` enum, `AuthURL`, tailnet name and URL, prerequisites flags);
  - owner-allowlist settings `{enabled, logins[]}`;
  - preferences shape;
  - compose-version status;
  - route constants and auth error codes, following Platform's convention.
- Example payloads for the contract tests.

Acceptance criteria:
- [ ] The subpath exports every shape above and builds as part of the contracts package.
- [ ] Zod schemas accept the example payloads and reject the malformed ones (wrong `BackendState`, missing login on a tailnet identity).
- [ ] No runtime code beyond schemas and constants.

### `phase:token-guard` (M1 — "Setup & auth minimal token")
Blocked by: Platform `phase:scaffold`; Platform's compose/env phase for `SCRIBA_PORT` in the app environment.

Scope:
- Token generation and persistence, `setup-url` rewrite (0600) and stdout print.
- Handshake endpoint, stateless signed cookie, sign-out and the identity endpoint.
- Global default-deny guard covering the loopback cookie path only, the loopback Host allowlist and the dev-origin setting.
- Full-origin mutation check and no CORS.
- Request-identity accessor for other modules.
- A minimal `/setup` page: identity plus "you're in", and the sign-in notice for 401s.
- The `Secure`-flag browser check.
- **The cross-module invariant tests:** GET/HEAD-never-mutate, and mutating-route guard coverage (see Testing Decisions).
- Extend Platform's Playwright e2e: its setup step reads `setup-url` from the temp library and opens it.

Acceptance criteria:
- [ ] First start creates the token and a 0600 `setup-url`, and prints the URL. A restart keeps the same token. Deleting the token file creates a new one, and old cookies get 401.
- [ ] Opening the setup URL sets an HttpOnly, SameSite=Strict, host-only cookie and redirects to `/setup` with no token in the URL. A wrong token gets the explanatory page and no cookie.
- [ ] Without the cookie, every non-public API route returns 401 in Platform's error shape.
- [ ] A request with any Host outside the allowlist gets 403, except `/healthz`. A mutation with a missing, `null` or foreign Origin, or with the wrong scheme, gets 403.
- [ ] No response carries `Access-Control-*` headers.
- [ ] The `Secure` behaviour in Safari, Chrome and Firefox on `http://127.0.0.1` is recorded in the module docs, and the chosen cookie attributes match it.
- [ ] Both invariant tests run in CI against the composed app and pass.
- [ ] **M1 "done when" (brief):** the author types "summarize my outline" and gets a correct answer with visible tool calls. This phase's share: the author reaches the chat only through the setup URL.
- [ ] **Demo (under 5 min, this module's share of M1):** run the installer one-liner and copy the printed URL. Open `http://127.0.0.1:8080/api/…` directly and see a 401. Open the setup URL and land on `/setup` with a clean address bar. Reload and stay signed in. Run `curl -X POST` with a foreign Origin and see a 403. Sign out and see the notice.

### `phase:setup-flow` (M2; milestone assignment is a drafting choice, review it)
Blocked by: Frontend shell `phase:core`. Model providers `phase:contract` (and its settings-UI phase to embed, or link until it lands). Project store `phase:contract` (the project list/create/import/start-from-sample requests).

Scope:
- The `/setup` wizard: Access, Tailscale placeholder (shows "unavailable" until `phase:tailnet`), Model providers, Preferences, First project, with skip and the `complete` flag.
- Setup-status endpoint, preferences endpoints and the `settings.yaml` section with its migration hook registration.
- Idempotent re-runs with previous answers as defaults.
- Settings page: identity, preferences, providers section, versions, the compose-mismatch warning, recovery instructions, re-run setup and sign out.
- The SPA routes to `/setup` until setup is complete.
- User-facing recovery documentation.
- Extend the Playwright e2e: the setup → project-from-sample leg runs through `/setup`'s first-project step.

Acceptance criteria:
- [ ] A fresh library walks through all five steps. Skipping providers and preferences still allows completion, and they show as `skipped`.
- [ ] Re-running `/setup` shows every saved value as a default. Saving one step changes only that step's fields: the settings files differ only in those fields, and the projects are unchanged.
- [ ] The first-project step creates a project from the nonfiction sample through the Project store API. On a re-run it lists existing projects and doesn't create one unless asked.
- [ ] The providers step renders the Model providers component and doesn't duplicate its forms.
- [ ] With `SCRIBA_COMPOSE_VERSION` unset or older than expected, `/setup` and the settings page show the warning with the update one-liner. With a matching value, no warning.
- [ ] The e2e setup leg passes in CI.
- [ ] **Demo (under 5 min):** open the setup URL, pick an Ollama model in the embedded providers step, set the author name, start from the nonfiction sample and land in the project. Re-open `/setup` and see every answer prefilled. Change the theme only and confirm nothing else changed. Edit `.env` to an old compose version, restart and see the warning.

### `phase:tailnet` (M3: phone review over the tailnet; review the assignment)
Blocked by: Platform's compose phase (shared LocalAPI socket volume, `TS_SOCKET`) and Platform's ST-1 outcome (how Serve ships).

Scope:
- LocalAPI client and normalised status endpoint, with caching and the rate-limited refresh on an unknown Host.
- The `/setup` Tailscale step and the settings section: state, login link, tailnet URL, prerequisites hints and skip.
- Tailnet name added to the Host allowlist from `Self.DNSName`.
- Tailnet credential path (`Tailscale-User-Login` trusted only on the tailnet Host) and the `https://` origin check.
- Owner allowlist: toggle, auto-seed, lockout protection, and the 403 messages.
- The socket-permission smoke test, added to Platform's checklist.
- Documentation of the app's control of tailscaled.
- Verification against a real tailnet that Serve preserves Host and strips client copies of the identity header.

Acceptance criteria:
- [ ] Without tailscaled (dev), the status reads "unavailable", loopback works, and the tailnet Host is not allowed.
- [ ] Against a recorded LocalAPI fixture: `NeedsLogin` with an `AuthURL` shows the link, `Running` shows the tailnet URL, and an empty `CertDomains` shows the HTTPS-certificates hint.
- [ ] On the tailnet Host with an injected login, API calls succeed with no cookie. On a loopback Host the same header is ignored and the request gets 401. A tailnet POST with an `http://` Origin gets 403.
- [ ] With the allowlist on, a login not in the list gets 403 with the explanatory code. Enabling the allowlist from a login that wouldn't be included is refused. Loopback with a cookie still works.
- [ ] Late login: starting logged out, logging in through the shown link makes `https://<tailnet name>` work without restarting the app.
- [ ] The socket smoke test passes as the non-root UID on macOS (Docker Desktop) and Linux, and the result is recorded.
- [ ] **Demo (under 5 min):** open the settings page on the Mac, click the Tailscale login link and approve. Watch the state turn `Running` and the tailnet URL appear. Open that URL on the phone, with no token, and see the review queue. Turn on the allowlist, try from a shared-in user and see the refusal, then turn it off.

## Contracts

### Produces: `@bbartolome/scriba-contracts/setup-auth`
- **Setup status:** per-step state (`pending | done | skipped`) for access, tailscale, providers, preferences and firstProject; `complete`; the compose-mismatch flag.
- **Token handshake:** request (token) and response/redirect semantics, plus the error codes (invalid token, Host rejected, Origin rejected, auth required, tailnet identity missing or not allowed).
- **Identity:** `{via: 'loopback'} | {via: 'tailnet', login}`.
- **Tailscale status:** `available`, `backendState` (`BackendState` enum), `authURL`, `dnsName` (tailnet name, trailing dot removed), `tailnetURL`, `magicDNSEnabled`, `httpsCertsEnabled`, `ownerLogin`.
- **Allowlist settings:** `{enabled, logins[]}`.
- **Preferences:** author display name, theme, default genre pack.
- **Compose-version status:** `{state: 'ok' | 'mismatch' | 'unknown', expected, actual}`.
- **Route constants** for setup status, handshake, identity, sign-out, Tailscale status, allowlist and preferences.
- **Non-contract APIs** provided to every module: the global guard (public marker) and the request-identity accessor (NestJS), plus the `/setup` and settings lazy routes (Angular).

### Consumes
- **Platform** (`/platform`, `phase:scaffold` and later):
  - base error shape and code convention;
  - `SCRIBA_*` env names: `SCRIBA_PORT` and `SCRIBA_COMPOSE_VERSION`, plus new entries requested here for the dev-only extra origins, the setup-URL base override and the LocalAPI socket path;
  - app version info, including the expected compose version;
  - `/healthz`;
  - the API composition root;
  - compose (shared `/var/run/tailscale` volume, `TS_SOCKET`, app `user:`, `SCRIBA_PORT` passed into the app), the installer reading `setup-url`, the Playwright harness and the pre-release checklist.
- **Frontend shell** (`phase:core`): API client (401 handling sends the author to the sign-in notice), route table, nav, theming (for the theme preference), and the dev proxy forwarding Host and Origin.
- **Model providers** (`/providers`, `phase:contract`; settings UI phase for embedding): provider config and presets, for display only. The embeddable settings component is an Angular API.
- **Project store** (`/project-store`, `phase:contract`): project summary/list and the new/import/start-from-sample requests. Cross-spec check: these requests must be in the Project store slice.

## Testing Decisions

- **What a good test is:** it exercises external behaviour (HTTP status codes, headers, cookies, redirects, files on disk, rendered UI) and never internal services, the token store or the signing helper.
- **Primary seam: the running API.** Boot the composed NestJS app, or this module in a test app, against a temp library folder. Tests:
  - token file and `setup-url` creation and their permission bits;
  - restart stability and regeneration after deleting the token file;
  - handshake redirect, cookie attributes, and the missing `Referrer-Policy` / token-in-Location cases;
  - 401/403 matrices across Host × credential × Origin × method;
  - absence of CORS headers;
  - `settings.yaml` merge behaviour on re-runs.
- **LocalAPI seam.** A small fake Unix-socket server in the test serves recorded `status` payloads for logged-out, `NeedsLogin` with `AuthURL`, `Running` with certs, and `Running` without certs. This fake is the only test double for tailscaled. The tailnet path is tested by sending the Serve-injected header with the tailnet Host. The real Serve behaviour (Host preserved, client headers stripped) is checked manually in `phase:tailnet` and recorded.
- **Cross-module invariant tests (owned here, run in CI against the composed app, so they cover every module's routes automatically):**
  1. **GET/HEAD never mutate.** Enumerate every registered route. Authenticate. Fill path parameters from a seeded sample project. Snapshot the library tree (paths, sizes, mtimes, hashes) and `settings.yaml`. Issue GET and HEAD to every route. Assert the snapshot is unchanged and no mutation-type SSE event was emitted. The only exemptions are disposable derived caches (the FTS index under `/books/.scriba/index/`, per the project storage, app state and search decision), listed explicitly in the test.
  2. **Mutations are guarded.** Every non-GET/HEAD/OPTIONS route rejects a request with no credential (401), a foreign or missing Origin (403), and an unlisted Host (403). The set of public routes equals the fixed list.
- **UI seam:** the `/setup` and settings lazy routes, rendered with Angular's Vitest runner against a fake API client built from the `/setup-auth` contract types. Tests: step order, skip, defaults prefilled on re-run, the Tailscale states (link, URL, hints), the allowlist toggle and lockout message, the compose warning, and the sign-in notice on 401.
- **Contract seam:** Zod schemas with valid and invalid examples.
- **System seam:** Platform's Playwright e2e. This module owns its setup leg: read `setup-url` from the temp library, open it, then go through `/setup`'s first-project step (from `phase:setup-flow`).
- **Manual checks**, recorded in the module docs and Platform's checklist: the `Secure`-flag browser matrix, the socket-permission smoke test, and Serve Host preservation and header stripping on a real tailnet.
- Vitest everywhere (NestJS via `unplugin-swc`). There's no prior art in the repo. Tride's guard is reference only, and its `http://` origin assumption must not be copied.

## Out of Scope

- A CLI reset-token command and in-app token rotation (later work item; see the installer, auth and model providers decision).
- Accounts, a user table, per-user data and read-only reviewer access (see the scope, identity and reachability decision; reviewers are a later add).
- LAN mode, `0.0.0.0` publishing and a plain `http://scriba` short name.
- A separate installer UI container. The host bootstrap, `.env`/compose writing and the update one-liner belong to Platform. This module only reads `setup-url` (writing it) and `SCRIBA_COMPOSE_VERSION`.
- Provider forms, key storage, model listing and the connection test: Model providers.
- Project creation, import and sample templates: Project store. This module only calls them.
- An "update available" notice and auto-update. Only the compose-version mismatch is warned about.
- Tailscale userspace mode (ST-4, deferred, per the repo, build, image and runtime topology decision) and auth-key management beyond what the installer writes.
- SSE events from this module (v1 polls).
- **Brief overrides:** the brief assumed a backend "running on localhost" with no authentication, installer or remote access. The recorded design decisions replace that with the Docker install, the setup token, the cookie and tailnet-identity guard, and Tailscale HTTPS access. The brief's React/Fastify stack is replaced by Angular and NestJS. The brief's "ask before making a decision" does not apply to anything the installer, auth and model providers decision settled.

## Further Notes

- **Owner's calls in the installer, auth and model providers decision:** the token is reusable, loopback requires a cookie, and the tailnet is trusted. Don't reopen them in work items.
- **Points to check against sibling specs:**
  - Platform: env entries `SCRIBA_DEV_ORIGINS`, `SCRIBA_SETUP_URL_BASE` and `SCRIBA_TS_SOCKET` (listed in the Platform spec); the expected compose-version constant in version info; Platform owns the `settings.yaml` envelope and migration hook; the socket-permission smoke test and the ST-1 peer-address check go on the checklist.
  - Frontend shell: the settings route path; 401 handling; the proxy preserving Host and Origin; an optional global compose banner.
  - Model providers: the embeddable settings component.
  - Project store: the new/import/start-from-sample requests in its slice.
- **Proposed beyond the installer, auth and model providers decision, for review:** `frame-ancestors 'none'`; port-suffixed cookie names; the stateless cookie keyed from the token (so replacing the token revokes all cookies); and the peer-address check on the identity header, with a dedicated Serve listener as the fallback if ST-1 disproves it.
- **Milestones:** `phase:setup-flow` (M2) and `phase:tailnet` (M3) are drafting choices. The spec shape, modules and contracts decision places only the "minimal token" in M1. Until `phase:setup-flow` lands, the e2e's project-from-sample step uses the Project store's own UI.
- **Phase sizing for the work breakdown:**
  - `phase:token-guard`: token store + `setup-url`; handshake + cookie; guard + Host/Origin/CORS; the two invariant tests; e2e hook.
  - `phase:setup-flow`: setup status + wizard shell; providers embed; preferences; first project; settings page + compose warning + docs.
  - `phase:tailnet`: LocalAPI client + status UI; tailnet guard path + Host allowlist; owner allowlist; smoke test + Serve verification.
