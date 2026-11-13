---
id: SHL-02
status: planned
---

# SHL-02 plan — typed API client

Batch: SHL-02, SHL-03, SHL-04 (main track, phase:core, M1). This plan covers SHL-02 only. The plans for SHL-03 and SHL-04 are written in parallel; section 2 names each file the three units share and the change each makes, so the batch merges in either order. Revision 2. Revision 1 was rejected by Opus (DECISIONS, "2026-11-13 — SHL-02 — Opus plan review of revision 1", commit 1a27470). Revision 2 applies its four items: the Node types reference of the spec (decision 18), the scope of the build check (decision 5, steps 6 and 10, section 5, assumption A6), the citation in decision 11, and the smaller fixes (decision 4, assumption A5, and the `git status` checks that exclude `plans/`). Status stays `draft` until Opus approves revision 2. Base: `main` at `c2c498c` (section 3, step 0). This plan writes no code.

## 1. Decisions this plan follows

Each item gives its source. FACT means checked in this session (the check is named). ASSUMED means a step in section 3 tests it.

1. **Location.** The client lives in `apps/web/src/app/shell/`, outside `features/`. Source: `modules/shell.md` line 42; SHL-01 plan decision 12. FACT: `ls apps/web/src/app/shell` lists `index.ts`, `landing.ts`, `not-found.ts`, `route-data.ts`, `route-data.spec.ts` and `tokens.ts`.

2. **Injection through the placeholder.** `API_CLIENT` keeps its name, and its type becomes `ApiClient`. Its default factory injects the root service `HttpApiClient`, so no provider is added to `app.config.ts`. Source: SHL-01 unit line 17 ("placeholders for the API and SSE clients (filled by SHL-02/03)"); SHL-01 plan decision 7. FACT: `tokens.ts` line 4 is `new InjectionToken<unknown>('API_CLIENT')`, and `grep -rn -E 'API_CLIENT|SSE_CLIENT' apps/web/src e2e` finds only `tokens.ts` lines 4 and 7 and `index.ts` line 3. Decision: the token stays the seam, so the SHL-07 fakes can replace it with `{ provide: API_CLIENT, useValue: fake }`.

3. **Methods.** `get(path, schema, params?)` and `post(path, body, schema)`, and no other verb. Each returns `Observable<T>`. Source: SHL-02 unit line 22 (verbs). Decision: `Observable`, because `HttpClient` returns observables and unsubscribing cancels the request. A caller that needs a promise uses `firstValueFrom`.

4. **Schema type.** `ResponseSchema<T>` is a structural interface: `safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown }`. The client never names zod's type. Source: SHL-02 unit line 19 (callers pass their Zod schema). FACT: zod 4.6.7 `package/v4/classic/schemas.d.ts` line 27 gives `safeParse(data: unknown, params?)`, and `package/v4/classic/parse.d.ts` line 3 gives the union `ZodSafeParseResult<T>`, lines 4 to 7 the success type `{success: true; data: T; error?: never}`, and lines 9 to 13 the failure type `{success: false; data?: never; error: ZodError<T>}`. Both read from the npm cache with `tar -xzO`. The lock has two zod copies (root 4.6.6, `packages/contracts/node_modules/zod` 4.6.7). A nominal `ZodType` parameter fails across the copies (PLT-05 decision 4, `plans/PLT-05.md` line 43), so the structural type is the one that works.

5. **No runtime zod in the Shell.** The Shell imports only the type `ErrorBody` from `@bbartolome/scriba-contracts/platform`. `import type` is erased, so the Shell's bundle keeps no zod. Source: DECISIONS 2026-11-12 line 634, the cross-unit zod finding that `plans/SHL-01.md` open point 1 hands to SHL-02; DECISIONS 2026-11-12 line 631 (PLT-11 kept contracts and zod out of the placeholder app's bundle). FACT: `packages/contracts/src/platform/errors.ts` line 1 imports zod and line 25 calls `z.object` when the module loads, and `platform/index.ts` line 3 re-exports that file, so a runtime import of `/platform` loads zod. FACT: the zod CommonJS build measured 564.1 kB (DECISIONS line 631); the production budget warns at 500 kB (`apps/web/angular.json`, `production.budgets`). Decision: this unit takes the type-only route, and the Navigator has made it the Shell-wide rule (DECISIONS entry "2026-11-13 — SHL-01 / SHL-02 / SHL-03 — zod in the browser bundle", line 1084, commit 5e75b06). SHL-03 revision 3 follows the same rule (`plans/SHL-03.md` decision 18 and its `isPlatformEnvelope` guard; the zod question is closed at its line 195). The default build keeps no CommonJS allowance and no budget change. Rejected: a runtime `errorBodySchema.safeParse`, which adds about 564 kB to the initial bundle. Open point 1 is closed. Decision 5 is checked by the step 6 grep, which shows that every line naming the contracts package in the Shell's four files is an `import type`. No production module imports `shell/tokens.ts`, `index.ts` or `api-client.ts` (only `app.routes.ts` imports `shell/landing` and `shell/not-found`), so no build loads this unit's files, and no build step tests decision 5.

6. **Platform error body.** A non-2xx body with `error.code` and `error.message` strings is a Platform error body, checked by the hand-written guard `isPlatformErrorBody`. Source: SHL-02 unit line 20; PLT-02 unit line 31 (base shape `{error: {code, message, details?}}`). FACT: `errors.ts` lines 25 to 31 (`errorBodySchema`; `details` optional). The guard is looser than the schema only on the code prefix (`errors.ts` lines 17 to 19). Test T11 checks that the two agree on the fixtures.

7. **Typed error.** `ApiError extends Error` with `status: number`, `code: string`, `message: string` and `details?: unknown`. Source: SHL-02 unit line 20 ("one typed error `{status, code, message, details?}`"). The status comes from the HTTP response, because the body has none (`errors.ts` line 23: "The HTTP status lives on the response, not in the body"). Decision: a class, so features can test `instanceof`.

8. **Codes for responses without a Platform body.** Two Shell codes: `CLIENT_NETWORK` for status 0 (message "Could not reach the server."), and `CLIENT_UNEXPECTED_RESPONSE` for any other non-2xx body that is not a Platform error (status from the response, message "The server sent an unexpected response."). Source: decision. SHL-02 unit line 20 gives every error a code. FACT: `ERROR_CODE_PREFIXES` (`errors.ts` lines 4 to 14) has no Shell prefix, so these codes are declared in `api-error.ts` (open point 3). SHL-06 unit (Decisions, bullet 2) needs the status 0 case ("an API network failure").

9. **Schema mismatch.** `ApiSchemaError extends Error`, which is not an `ApiError`, with `path` and `issues`. A 2xx body that is not JSON is also an `ApiSchemaError`. Source: SHL-02 unit line 19 ("fails loudly") and criterion 1 ("a distinct failure for a schema mismatch"). Decision. The order is fixed: HTTP errors are mapped first (`catchError`), then the body is parsed (`map`), so a parse failure never reaches the HTTP mapping.

10. **401.** Any 401 calls `Router.navigateByUrl('/setup')` without awaiting it. The call still errors with an `ApiError` (status 401), so the caller's stream ends. Source: SHL-02 unit line 21; `modules/setup-auth.md` line 42 ("the Shell's API client sends 401s to the sign-in notice on `/setup`"); `units/SAU-06-minimal-setup-page.md` line 17. FACT: `navigateByUrl(url: string | UrlTree, extras?): Promise<boolean>` on `Router` (`@angular/router` 22.2.5, `_router_module-chunk.d.ts` line 1639, from the extracted copy in `/tmp/shl01-cache/angular/router`). FACT: until Setup & auth registers `/setup`, that path matches the `**` not-found entry (`app.routes.ts` line 21), so a 401 shows the not-found page at that point.

11. **Credentials and headers.** Every request sets `withCredentials: true`. The client adds no interceptor and no header. Source: SHL-02 unit line 18 and criterion 3. FACT: `withCredentials?: boolean` is `HttpRequestOptions.withCredentials` (`@angular/common` 22.2.5, `types/_module-chunk.d.ts` line 371, inside the interface that starts at line 359). It reaches `get<T>(url, options?)` (`types/http.d.ts` line 784) through `HttpClientCommonOptions` (`types/http.d.ts` line 63). Read from the npm cache. `types/http.d.ts` line 2286 is `HttpResourceRequest.withCredentials`, which this unit does not use. Same-origin requests send cookies anyway, so the flag records the rule.

12. **Paths.** `ApiPath` is `` `/${string}` ``, so the route constants of the contracts fit, including `/healthz` (`HEALTHZ_ROUTE`, `packages/contracts/src/platform/http.ts` line 8) and `/api/...`. A path that starts with `//` throws a `TypeError` at call time, with no request made, because a protocol-relative URL would leave the origin. Source: SHL-02 unit line 18 (same-origin); SHL-03 unit line 21 (the reconnect check calls `/healthz`, which is outside `/api`). Decision.

13. **Request bodies.** `post` takes `body: unknown`, and the client does not validate it. Platform validates request bodies on the server with each module's schema. Source: PLT-05 unit line 15. Decision.

14. **Shared parser.** `parseResponse(path, schema, body)` is exported from `api-client.ts`. The client uses it, and so does any fake (SHL-07), so both reject a mismatch the same way. Source: SHL-07 unit line 22 ("the fakes reject responses that don't match the passed schema"). Decision.

15. **Test seam.** TestBed with `provideHttpClient()` and `provideHttpClientTesting()`. The wire is observed through `HttpTestingController`, and the 401 test adds `provideRouter` with a stub `/setup` route. Source: `modules/shell.md` lines 82 to 84 (test what goes over the wire). FACT: `HttpTestingController` (`types/http-testing.d.ts` line 85) and `provideHttpClientTesting()` (line 179) are exported at `@angular/common/http/testing`, whose package export points at `types/http-testing.d.ts`.

16. **Contract schemas in tests.** The criterion tests use a local `ResponseSchema`. Test T11 loads the built contracts with `createRequire(import.meta.url)`, because the workspace link leads to a CommonJS dist. ASSUMED: Vitest can `require` that dist (step 7 checks it; open point 4). Test-only; no runtime change.

17. **Unchanged.** `app.config.ts`, `app.routes.ts`, `route-data.ts`, `apps/web/package.json`, `package-lock.json`, `apps/web/angular.json` and `eslint.config.mjs`, and `packages/contracts/**`. Source: decisions 2 and 5. FACT: `apps/web/package.json` lists no `@bbartolome/scriba-contracts` dependency (lines 11 to 23), while `apps/api/package.json` line 11 does; `apps/web/src/contracts-boot.ts` already imports the subpaths through the root workspace link (open point 2).

18. **Node types in the spec.** `api-client.spec.ts` starts with the line `/// <reference types="node" />`, so `node:module` resolves in the spec program. `apps/web/tsconfig.spec.json` is unchanged: its `compilerOptions.types` is `["vitest/globals"]`, so it loads no Node types (FACT, read directly). The lock has `node_modules/@types/node` 26.6.6 at the root (FACT, read with `node`). The reference line changes no config. Rejected: adding `node` to `types` in `tsconfig.spec.json`, which would add a file outside section 2. Source: Opus review of revision 1, item 1 (DECISIONS "2026-11-13 — SHL-02 — Opus plan review of revision 1", commit 1a27470). Steps 7 and 8 check it (assumption A9).

## 2. Files to create or change

Only these five paths change. Nothing else in the repo changes.

| Path | Change | Purpose | Shared with |
|---|---|---|---|
| `apps/web/src/app/shell/api-error.ts` | new | `ApiError`, `ApiSchemaError`, `CLIENT_ERROR_CODES` (`CLIENT_NETWORK`, `CLIENT_UNEXPECTED_RESPONSE`), and the guard `isPlatformErrorBody`. Imports only the type `ErrorBody` (decisions 5 to 9). | none |
| `apps/web/src/app/shell/api-client.ts` | new | `ApiClient` (interface), `ApiPath`, `ResponseSchema<T>`, `parseResponse` (decision 14), and `HttpApiClient`, the root service (decisions 3, 9 to 13). | none |
| `apps/web/src/app/shell/tokens.ts` | edit | Line 1 becomes `import { inject, InjectionToken } from '@angular/core';`, and `import { HttpApiClient, type ApiClient } from './api-client';` is added after it. Lines 3 and 4 become the typed `API_CLIENT` with `providedIn: 'root'` and `factory: () => inject(HttpApiClient)` (decision 2). `SSE_CLIENT` (lines 6 and 7) is not changed. | SHL-03 revision 3 (`plans/SHL-03.md` line 54) adds `import type { SseClient } from './sse-client';` after line 1 and changes `SSE_CLIENT` (lines 6 and 7). It does not touch line 1 or lines 3 and 4. Both units add one import line after line 1: keep both lines and both declarations. SHL-04 does not touch this file (`plans/SHL-04.md` line 49, unchanged list). |
| `apps/web/src/app/shell/index.ts` | edit | Appends two export lines after line 3, the last existing line: `export type { ApiClient, ApiPath, ResponseSchema } from './api-client';` and `export { ApiError, ApiSchemaError } from './api-error';`. Lines 1 to 3 are unchanged. | SHL-03 revision 3 appends one export type line for its SSE types (`plans/SHL-03.md` line 55). SHL-04 (status planned) appends three lines and rewords line 1 (`plans/SHL-04.md` line 44). All three append after line 3; keep every appended line. This unit does not touch line 1. |
| `apps/web/src/app/shell/api-client.spec.ts` | new | The eleven tests of section 4 (T1 to T11), with the Node types reference of decision 18 as its first line. | none |

`apps/web/src/app/app.config.ts` is not changed by this unit, so nothing there needs merging. This plan adds no provider there, because the client is root-provided (decision 2). `plans/SHL-03.md` revision 3 agrees: its `app.config.ts` row (line 56) says SHL-02 adds no provider there, and SHL-03 adds its own SSE provider. `plans/SHL-04.md` changes nothing there (its unchanged list, line 49).

## 3. Method

Run from the repo root on `unit/SHL-02`, created from `main` by the driver. Whether the work is committed follows the rule the coordinator sets (SHL-01 plan open point 5); this plan does not decide it. Record `node -v` and `npm -v` with each result. Each step names its files.

0. **Preconditions (no file change).**
   - `node -v` prints `v26.x`; `npm -v` prints `11.x`.
   - `git rev-parse --short HEAD` prints `c2c498c`, or a later `main` commit; `git diff --quiet c2c498c HEAD -- ':!plans'` exits 0; `git status --short -- ':!plans'` prints nothing (the untracked drafts of the other units under `plans/` are excluded).
   - `ls node_modules/@angular` fails before step 1 (true at plan time).
1. **Install (no file change).** `npm ci` exits 0. `ls node_modules/@angular/common/package.json` prints the path.
2. **Contracts build (no file change).** `npm run build -w @bbartolome/scriba-contracts` exits 0. `ls packages/contracts/dist/platform/index.d.ts` prints the path; the web types resolve through it.
3. **Baseline on main (no file change, before any edit).** `npm run build -w @bbartolome/scriba-web` exits 0. Record the `Initial total` line; it should be near 321.86 kB, the figure of the SHL-01 code review. `grep -rl -e '_zod' -e 'PLATFORM_VALIDATION_FAILED' apps/web/dist/scriba-web/browser/` prints nothing.
4. **Placeholder pre-check (no file change).** `grep -rn -E 'API_CLIENT|SSE_CLIENT' apps/web/src` prints exactly `tokens.ts:4`, `tokens.ts:7` and `index.ts:3`.
5. **Write the files (section 2; decisions 1 to 14).**
   - `api-error.ts`: the two classes, the code constants, and `isPlatformErrorBody(value: unknown): value is ErrorBody`. The guard checks that `value` is an object whose `error` is an object with string `code` and `message`. It does not check `details`.
   - `api-client.ts`: `get` builds `this.http.get<unknown>(path, { withCredentials: true, params })`, and `post` builds `this.http.post<unknown>(path, body, { withCredentials: true })`. Both pipe through `catchError(mapHttpError)` and then `map((body) => parseResponse(path, schema, body))`. `mapHttpError` does three things in order. For a 2xx `HttpErrorResponse` it returns an `ApiSchemaError`. For status 0 it returns a `CLIENT_NETWORK` `ApiError`. For status 401 it calls `void this.router.navigateByUrl('/setup')`. Then it returns an `ApiError` built from the Platform body, or `CLIENT_UNEXPECTED_RESPONSE` when the body is not a Platform error. Errors that are not `HttpErrorResponse` pass through unchanged. `get` and `post` throw a `TypeError` for a path that starts with `//`, before building the request.
   - `tokens.ts` and `index.ts`: the edits of section 2.
   - `api-client.spec.ts`: the tests T1 to T11 of section 4, with the reference line of decision 18 as its first line.
   Then `npx prettier --write apps/web/src/app/shell` and `npx prettier --check apps/web/src/app/shell` exits 0.
6. **Static checks (no file change).**
   - `grep -n -i -E 'authorization|setHeaders|HTTP_INTERCEPTORS|withInterceptors' apps/web/src/app/shell/api-error.ts apps/web/src/app/shell/api-client.ts apps/web/src/app/app.config.ts` prints nothing.
   - `grep -n "'X-" apps/web/src/app/shell/api-client.ts` prints nothing.
   - `grep -n 'scriba-contracts' apps/web/src/app/shell/api-error.ts apps/web/src/app/shell/api-client.ts apps/web/src/app/shell/tokens.ts apps/web/src/app/shell/index.ts | grep -v 'import type'` prints nothing. Only the spec may require the contracts at runtime. This grep is the check of decision 5 and assumption A6.
   - `git status --short -- ':!plans'` lists five lines: `??` for `api-error.ts`, `api-client.ts` and `api-client.spec.ts`, and ` M` for `tokens.ts` and `index.ts`.
   - `git diff --quiet -- apps/web/src/app/app.config.ts apps/web/src/app/app.routes.ts apps/web/src/app/shell/route-data.ts apps/web/package.json package-lock.json apps/web/angular.json eslint.config.mjs` exits 0.
7. **Unit tests (file: `api-client.spec.ts`).** `npm test -w @bbartolome/scriba-web` exits 0 with 16 tests passing and none failing: the five of SHL-01 (`app.spec.ts` 1, `app.routes.spec.ts` 3, `shell/route-data.spec.ts` 1) and the eleven of section 4. Step 8 runs first: a compile error in the spec (for example TS2591 on `node:module` without the reference line of decision 18) stops every test in the file. If T11 fails at its `require` (a module or export error), record the error and stop. Do not weaken T11 or the guard (open point 4).
8. **Type checks (no file change).** `npx tsc --noEmit -p apps/web/tsconfig.spec.json` exits 0. `npx tsc --noEmit -p apps/web/tsconfig.app.json` exits 0. The first one is the check of decision 18 (the reference line; assumption A9) and of the type-level check of T1, so a missing Node type or a wrong return type fails it.
9. **Lint (no file change).** `npm run lint -w @bbartolome/scriba-web` exits 0.
10. **Production build (no file change).** `npm run build -w @bbartolome/scriba-web` exits 0 with no CommonJS warning: `npm run build -w @bbartolome/scriba-web 2>&1 | grep -ci commonjs` prints `0`. The `Initial total` is within 5 kB of step 3. `grep -rl -e '_zod' -e 'PLATFORM_VALIDATION_FAILED' apps/web/dist/scriba-web/browser/` prints nothing. Step 10 is a regression check of the build only: it does not test decision 5 or assumption A6, because no production module imports this unit's files and `ng build` never loads them. Decision 5 is tested by step 6. A lazy chunk that SHL-08 adds for its setup-auth schema (DECISIONS entry, line 1084) is checked by SHL-08's plan.
11. **Contracts-boot check (no file change; PLT-11).** `npm run build -w @bbartolome/scriba-web -- --configuration contracts-boot` exits 0.
12. **Root checks (no file change).** `npm test` exits 0 (the workspaces, then the `scripts/*.test.mjs` tests). `npm run lint` exits 0.
13. **Record.** Change nothing in the repo beyond section 2. Report the `Initial total` before and after, the test count, and `git status --short -- ':!plans'`.

## 4. Acceptance criteria tests

Test list, all in `apps/web/src/app/shell/api-client.spec.ts`. The tests use TestBed, `HttpTestingController` and `provideRouter`, and they obtain the client through `TestBed.inject(API_CLIENT)`, as features do. Each test asserts what goes over the wire.

- **T1 Valid response.** `GET /healthz` is flushed with `{ version: '1.2.3' }`. A local schema returns `{ version }` in a shape that differs from the raw body, and the observable emits the schema's output. An exported function that no test calls (exported so that the `@typescript-eslint/no-unused-vars` rule of step 9 does not flag it) holds the type check `expectTypeOf(client.get('/healthz', healthzSchema)).toEqualTypeOf<Observable<Platform.Healthz>>()`, with `import type * as Platform from '@bbartolome/scriba-contracts/platform'` and `declare const healthzSchema: typeof Platform.healthzSchema`. Both emit nothing at runtime.
- **T2 Platform error body.** `GET` is flushed with status 404 and `{ error: { code: 'PLATFORM_NOT_FOUND', message: 'Not found.', details: { x: 1 } } }`. The error is an `ApiError` with status 404, that code, that message, and `details` equal to `{ x: 1 }`.
- **T3 Schema mismatch.** `GET` is flushed with status 200 and `{ version: 7 }`, which the local schema rejects. The error is an `ApiSchemaError`, not an `ApiError`, and its `path` is `/healthz`.
- **T4 Non-JSON 2xx.** The request fails with `TestRequest.error(new ProgressEvent('error'), { status: 200 })`. The error is an `ApiSchemaError`.
- **T5 Network failure.** `TestRequest.error(new ProgressEvent('error'))` with no status. The error is an `ApiError` with status 0 and code `CLIENT_NETWORK`.
- **T6 Non-Platform body.** The request is flushed with status 502 and the string `'<html>'`. The error is an `ApiError` with status 502 and code `CLIENT_UNEXPECTED_RESPONSE`.
- **T7 401.** `GET` is flushed with status 401 and a Platform body. After the flush, `router.url` is `/setup` (checked with `vi.waitFor`), and the error is an `ApiError` with status 401.
- **T8 Other errors do not navigate.** `GET` is flushed with status 500 and a Platform body. The error is an `ApiError` with status 500, and `router.url` stays `/`.
- **T9 Requests.** `GET /healthz` and `POST /api/platform/echo` with body `{ count: 0 }`. Each request has `withCredentials` true and a URL that starts with a single `/`. The GET has no headers. The POST has no header whose name matches `/^(authorization|cookie|x-)/i`.
- **T10 Same-origin guard.** `client.get('//evil.example/x', schema)` throws a `TypeError` synchronously, and `HttpTestingController.match` finds no request.
- **T11 Parity.** For each fixture, `isPlatformErrorBody(f)` equals `errorBodySchema.safeParse(f).success`, with `errorBodySchema` loaded by `createRequire(import.meta.url)('@bbartolome/scriba-contracts/platform')`. Valid fixtures: `{error:{code:'PLATFORM_NOT_FOUND',message:'Not found.'}}` and `{error:{code:'PLATFORM_INTERNAL',message:'Internal server error.',details:{a:1}}}`. Invalid fixtures: `null`, `'text'`, `{}`, `{error:{}}`, `{error:{code:1,message:'m'}}`, `{error:{code:'PLATFORM_NOT_FOUND'}}` and `{error:'PLATFORM_NOT_FOUND'}`. The one known difference (a code without a Platform prefix, which the guard accepts and the schema rejects) is left out of the fixtures, and the test comment says so.

**Criterion 1.** "Returns parsed data for a valid response; a typed error (status, code, message) for a Platform error body; a distinct failure for a schema mismatch."
- Tests: T1 (parsed data, and the type check that step 8 compiles), T2 (typed error), T3 (distinct failure). Supporting: T4 to T6, and T11.
- Pass: T1 emits the schema's output, not the raw body. T2 is an `ApiError` (`instanceof` true) with status 404, code `PLATFORM_NOT_FOUND`, message `Not found.`, and `details` equal to `{ x: 1 }`. T3 is an `ApiSchemaError`, and `instanceof ApiError` is false. Step 8's `tsc` exits 0.
- Local: yes. Vitest with `HttpTestingController` needs no server, browser, remote or credential. Criterion 1 does not depend on T11; T11 checks the parity claim of decision 6.

**Criterion 2.** "A 401 navigates to `/setup`."
- Tests: T7, and T8 as the guard of the rule.
- Pass: after T7's flush, `router.url` is `/setup`, and the error is an `ApiError` with status 401. In T8, `router.url` stays `/` after a 500.
- Local: yes.

**Criterion 3.** "Requests are same-origin with credentials and no added auth headers."
- Tests: T9 (what the client sends), T10 (the same-origin guard), and the static checks of step 6.
- Pass: T9 shows `withCredentials` true on both requests, a relative URL, and no auth or custom header. T10 throws and sends nothing. Step 6's greps print nothing.
- Local: yes. The check is on the `HttpRequest` the client sends, which is the wire the client controls. The cookie reaching the server through the dev proxy needs a feature that calls the client; that is SHL-09's e2e, and this unit does not claim it.

## 5. Agreement with downstream units

| Unit | What it needs from SHL-02 | Provided by this plan |
|---|---|---|
| SHL-01 (done) | `API_CLIENT` placeholder filled; `provideHttpClient()` in `app.config.ts` | Token filled by a root factory; `app.config.ts` unchanged (decision 2). |
| SHL-03 SSE client | A `/healthz` check and a 401 → `/setup` for the reconnect probes (unit line 21) | Not needed by SHL-03 revision 3: its probes use `fetch` with `HEALTHZ_PATH` and their own 401 rule (`plans/SHL-03.md` decision 9, line 22, and its section 5 row, line 182). If it changed to this client, `get('/healthz', schema)` would be allowed (decision 12) and the 401 rule of decision 10 would apply. Both 401 rules route to `/setup` and stay separate. Under the Shell-wide rule (decision 5), SHL-03 has no runtime contracts import (`plans/SHL-03.md` decision 18); it uses type imports and its own `isPlatformEnvelope` guard. |
| SHL-04 theming, notices | Nothing from SHL-02 (no API call) | Nothing needed. `index.ts` is shared (section 2). |
| SHL-06 connection indicator | A "server unreachable" signal from an API network failure (unit, Decisions, bullet 2) | `ApiError` with status 0 and code `CLIENT_NETWORK` (decision 8). |
| SHL-07 test doubles | The `ApiClient` interface; the same schema behaviour; a token to replace | The fake implements `ApiClient` and is provided as `{ provide: API_CLIENT, useValue: fake }`. It rejects with `parseResponse` (decisions 2, 3, 14). |
| SHL-08 landing, project routes | `get` and `post` for setup status, the active project and activate; 401 → `/setup` | `get` and `post` (decision 3); the 401 rule (decision 10). SHL-08 loads its `/setup-auth` schema itself (DECISIONS entry, line 1084); this unit provides nothing for it. |
| SHL-09 core gate | The SHL-02 criteria pass on `main`; no runtime zod in the Shell; default build has no CommonJS warning | Section 4 criteria. Decision 5 is checked by step 6, not by the build; step 10 is a regression check. |
| SHL-13 editor wrapper | Reads a file through the client (unit, Decisions, bullet 1) | `get` with a `params` record (decision 3). |
| SAU-06 `/setup` | A 401 routes to `/setup`, and the caller gets an `ApiError` with status 401 for the sign-in notice (unit line 17) | Decision 10. Until SAU-06 registers the route, a 401 shows the not-found page. |
| MPR-09 providers panel | `get` and `post` through the Shell's client (unit line 20) | Decision 3. |
| PLT-05 error filter | The body the client parses: `{error: {code, message, details?}}` | Decision 6; T11 checks the guard against `errorBodySchema`. |

## 6. Open points

1. **Zod in the Shell: closed.** The Navigator decided option (c) (DECISIONS entry "2026-11-13 — SHL-01 / SHL-02 / SHL-03 — zod in the browser bundle", line 1084, commit 5e75b06): the Shell ships no runtime zod. All contracts imports in the Shell are type-only; error bodies and the SSE envelope use hand-written guards, each with a Vitest parity test against the contracts schemas in Node (T11 here). The default build keeps no `allowedCommonJsDependencies` entry and no budget change. SHL-08 loads its setup-auth schema itself, and SHL-03 revision 3 already matches (`plans/SHL-03.md` line 195). This unit follows the rule as written in decision 5.
2. **Undeclared dependency.** `apps/web/package.json` does not list `@bbartolome/scriba-contracts`. The type import resolves through the root workspace link, as `contracts-boot.ts` already does. Adding the dependency would change `package-lock.json`, so it is not made here.
3. **Shell codes outside Platform's prefixes.** `CLIENT_NETWORK` and `CLIENT_UNEXPECTED_RESPONSE` are not in `ERROR_CODE_PREFIXES` (`errors.ts` lines 4 to 14). If the Navigator wants all codes in one list, a `CLIENT` prefix can be added to Platform.
4. **A compile error in the spec blocks every test.** T11 uses `createRequire` from `node:module` and loads the built contracts. If the spec program does not compile (for example TS2591 on `node:module` without the reference line of decision 18), every test in `api-client.spec.ts` fails to run, T1 to T10 included. Step 8 catches that before step 7. If the `require` fails at run time (Vitest cannot load the contracts dist; assumption A1), T11 is reported as not run, not as passed, and T1 to T10 still count. The guard and the other criteria stay as written. Criterion 1 does not depend on T11.

## 7. Facts checked and assumed

**(a) Facts checked**
- Git: `git rev-parse --short HEAD` → `c2c498c` at the first check; `git branch --show-current` → `main`; `git status --short -- ':!plans'` → empty at that check.
- `units/SHL-02-typed-api-client.md`: front matter lines 1 to 10 (`blocked_by: [SHL-01]`, `parallel_with: [SHL-03, SHL-04]`, `unblocks: [SHL-07, SHL-08, SHL-09]`); Decisions lines 18 to 22; criteria lines 25 to 27.
- `units/README.md` lines 34 to 66: the format and the blocker notation. The `unblocks` list matches the `blocked_by` lines of SHL-07, SHL-08 and SHL-09, and `parallel_with` is symmetric for SHL-03 and SHL-04.
- `modules/shell.md`: line 5 (`/shell` stays empty), line 42 (feature folders), line 43 (the Shell consumes only `/platform`, the setup-status route and schema, and the `/project-store` shapes), line 70 (the API table row), lines 82 to 84 (testing principles).
- `plans/SHL-01.md`: decisions 4, 7 and 12; section 5 SHL-02 row (line 189); open point 1 (line 212).
- `apps/web/src/app/app.config.ts` lines 1 to 22 (`provideHttpClient()` at line 17); `app.routes.ts` lines 9 and 16 to 21; `shell/tokens.ts` lines 1 to 7; `shell/index.ts` lines 2 to 3; `shell/route-data.ts` (types only).
- `apps/web/src/app/app.routes.spec.ts` (the `RouterTestingHarness` pattern; used for style only).
- `packages/contracts/src/platform/errors.ts`: line 1 (`import { z } from 'zod'`), lines 4 to 14 (prefixes), lines 17 to 19 (code pattern), lines 23 to 31 (`errorBodySchema`, `details` optional), lines 36 to 49 (Platform codes and statuses). `index.ts` lines 1 to 6 (re-exports). `http.ts` line 8 (`HEALTHZ_ROUTE`) and line 12 (`healthzSchema`). `events.ts` line 15 (`sseEnvelopeSchema`).
- `packages/contracts/package.json`: `exports` `./platform` (types `./dist/platform/index.d.ts`, default `./dist/platform/index.js`); `dependencies.zod` `^4.6.7`. `packages/contracts/src/shell/index.ts` is `export {};`.
- `apps/web/package.json` lines 11 to 23 (no contracts dependency); `apps/api/package.json` line 11 (contracts dependency); `apps/web/angular.json` `production.budgets` (initial warning 500 kB, error 1 MB) and the `contracts-boot` configuration (`allowedCommonJsDependencies`); `apps/web/src/contracts-boot.ts` (imports the ten subpaths, build-time only).
- `package-lock.json` (read with `node`): `node_modules/@bbartolome/scriba-contracts` is a link; `node_modules/zod` 4.6.6; `packages/contracts/node_modules/zod` 4.6.7; `node_modules/ngx-markdown` 22.1.1; `node_modules/marked` 18.2.0.
- Root `package.json`: `build` builds contracts first; `test` is `npm test --workspaces && node --test 'scripts/*.test.mjs'`; `lint` ends with `prettier --check .`; `workspaces` lists `packages/contracts` first.
- Environment: `ls node_modules/@angular` fails; `packages/contracts/dist` does not exist; `plans/SHL-02.md` did not exist before this write.
- `grep -rn -E 'API_CLIENT|SSE_CLIENT' apps/web/src e2e` → `tokens.ts:4`, `tokens.ts:7`, `index.ts:3`, nothing else.
- zod 4.6.7 types, read with `tar -xzO` from the npm cache (nothing written): `package/v4/classic/schemas.d.ts` line 27; `package/v4/classic/parse.d.ts` line 3 (union), lines 4 to 7 (success type), lines 9 to 13 (failure type).
- `@angular/common` 22.2.5, read the same way: `types/http-testing.d.ts` lines 85, 179 and 181; `types/_module-chunk.d.ts` lines 359 and 371 (`HttpRequestOptions.withCredentials`); `types/http.d.ts` lines 63 and 784 (`HttpClientCommonOptions`, `get`); `types/http.d.ts` line 2286 is `HttpResourceRequest.withCredentials` (not used); `package.json` export `./http/testing` → `./types/http-testing.d.ts`. `apps/web/tsconfig.spec.json` `compilerOptions.types` is `["vitest/globals"]` (read directly); the lock has `node_modules/@types/node` 26.6.6 (read with `node`).
- `@angular/router` 22.2.5 (extracted copy in `/tmp/shl01-cache/angular/router`, read only): `_router_module-chunk.d.ts` line 1639.
- DECISIONS: at plan writing no entry named SHL-02 (grep). The Navigator entry of 2026-11-13 (line 1084, commit 5e75b06) names it and was read in full after the first handback (decision 5, open point 1). SHL-01 entries are at lines 938 to 1042. The zod facts are at lines 631 and 634 (PLT-11 review, 2026-11-12).
- Downstream units read: SHL-03 (front matter; lines 19 to 28), SHL-04 (front matter; lines 15 to 21), SHL-06 (front matter; Decisions), SHL-07 (front matter; lines 15 to 22), SHL-08 (front matter; lines 15 to 24), SHL-09 (front matter; lines 17 to 21), SHL-13 (front matter; Decisions bullet 1). Grep hits: SAU-06 line 17, MPR-09 line 20, `modules/setup-auth.md` line 42, PLT-05 line 15.
- Parallel plans on disk (drafts, not on `main`; read to check the shared files): `plans/SHL-03.md` revision 3 (status draft) lines 8 (revision and base), 22 (decision 9: `fetch` probes with `HEALTHZ_PATH`, own 401 rule), 35 (decision 17: `SSE_CLIENT` provider in `app.config.ts`), 36 (decision 18: no runtime contracts import), 54 to 56 (section 2 rows for `tokens.ts`, `index.ts` and `app.config.ts`), 182 (section 5, SHL-02 row), 189 (open point 1, the undeclared dependency) and 195 (the zod question, closed by the Navigator entry). `plans/SHL-04.md` (status planned, commit f9d8070) lines 41, 42 and 44 (`app.ts`, `app.html`, `index.ts` rows), 49 (unchanged list: `tokens.ts`, `app.config.ts`), 180 (section 5, the SHL-02 and SHL-03 row).

**(b) Assumed**
- A1. Vitest can `require` the contracts dist through `createRequire` (step 7; open point 4).
- A2. TypeScript accepts `typeof` on a type-only namespace import, and an exported function that no test calls holds the type check of T1 (step 8; exported, so the linter treats it as used).
- A3. `TestRequest.error(...)` accepts a `status` option, so T4 can produce a 2xx parse failure (step 7).
- A4. The baseline `Initial total` on `main` is about 321.86 kB (the SHL-01 code review figure); step 3 records the real one.
- A5. Section 2's shared-file rows rest on the SHL-03 revision 3 draft (on disk, not on `main`) and the SHL-04 plan (on `main`, status planned, commit f9d8070); recheck section 2 when the SHL-03 revision lands.
- A6. TypeScript erases `import type` at emit, so a type import of contracts adds no runtime code. Step 6's grep is the check; no build step loads these files (decision 5).
- A7. Same-origin requests send cookies with or without `withCredentials` (browser behaviour), so the flag records the rule.
- A8. On a 2xx non-JSON body, `HttpClient` emits an `HttpErrorResponse` with status 200 (decision 9; T4 simulates it).
- A9. The reference line `/// <reference types="node" />` makes `node:module` resolve in the spec program, and `@types/node` 26.6.6 at the root is what it resolves to (steps 7 and 8 check it; decision 18).
