---
id: PLT-05
status: done
---
# PLT-05 plan — global error filter, Zod validation pipe, module error

Batch: [PLT-04 done; PLT-05 batch with PLT-06, PLT-07, PLT-08] (Platform, phase:scaffold, M1). Revision 4.

Revision 4 changes (Opus code review of `unit/PLT-05`, head a48cf50; `plans/DECISIONS.md`, "2026-11-12 — PLT-05 — Opus code review of `unit/PLT-05` (head a48cf50): NOT APPROVED (one blocking item, one non-blocking item)"; commit ee7978a, as given by the coordinator):
- Blocking 1 (type): the pipe's schema parameter is structural, `{ parse(value: unknown): unknown }`, with no zod import (decision 4, step 2, section 2 sketch). Cause: two zod copies (F10, A8). A root `ZodType` parameter fails `tsc` with TS2345 for `echoRequestSchema`, a 4.6.7 contract schema.
- Blocking 1 (coverage): AC 1 gains a contract-schema route, `POST /api/platform/probe/contract`, as one extra assertion inside the same `it` (step 5; section 4 AC 1 and its M8 bullet; the section 4 intro). Mutation M8 (root `ZodType` in the pipe) fails the build, and is recorded as a build failure (step 10).
- Facts and assumptions: F10 (the two zod copies and the reported TS2345), A8 (the 4.6.7 path is tested on the contract route), A9 (new: structural assignability).
- Non-blocking 2: the 500 log is `this.logger.error(message, stack)`, with no class-name argument (decision 7, step 3).
- Status is `draft` until the Opus delta review.

Revision 3 changes (Opus review of revision 2: `plans/DECISIONS.md`, "2026-11-12 — PLT-05, PLT-06, PLT-07, PLT-08 — Opus plan review of the four Platform plans, revision 2"):
- Blocking 1: body-parser errors are identified by `exception.cause`, because Nest's `mapException` converts them before the filter. Changed: decision 3 (the 413 and malformed-JSON rows), decision 9, fact F10, and open point 4.
- Blocking 2: the filter maps `z.ZodError` to 400 `PLATFORM_VALIDATION_FAILED`. The pipe no longer throws `ModuleError`. Changed: decision 4, the filter order in step 3, the pipe sketch, the M1 mutation, and one sentence of the AC 1 test description.
- Non-blocking 3: the section 5 PLT-06 row follows `plans/PLT-06.md` (inline `echoRequestSchema.parse`; two controllers, one provider, one export).
- Applied after the Opus approval of revision 3 (text only):
  - Open point 4 cites the charset 415 path (`body-parser` `lib/read.js` lines 77 to 83) and lists the known gaps, each a logged 500 under option (a). Decision 3's malformed-JSON sentence is narrowed to malformed JSON.
  - F10 and A8 state the two zod copies and why `z.ZodError` still matches.
  - F10 cites one `mapException` call site, line 96.

Written at HEAD `bd95da8` (clean tree). Unit: `units/PLT-05-error-filter-validation-pipe.md`. Structure follows `plans/PLT-04.md`. `node_modules` is not installed, so the Nest and body-parser facts come from the published tarballs (section 7, F10).

## 1. Decisions this plan follows

1. **One global filter.** `PlatformExceptionFilter` is registered as `APP_FILTER` in `PlatformModule` and maps every error to `{error: {code, message, details?}}` with the HTTP status. Source: unit line 18; `plans/PLT-04.md` section 5 (PLT-05 row).
2. **Codes and statuses come from `/platform`.** `PLATFORM_ERROR_CODES`, `PLATFORM_ERROR_STATUS` and `errorBodySchema` in `packages/contracts/src/platform/errors.ts` (lines 25 to 49). Source: unit line 18; `units/PLT-02-contracts-package-platform-slice.md` line 31.
3. **The filter's whole mapping.** The filter checks the rows in this order:

   | Input | Status | Code | Body `message` | Logged |
   |---|---|---|---|---|
   | `ModuleError` (decision 5) | its `status` | its `code` | its `message`; `details` only when set | no |
   | `z.ZodError` (decision 4) | 400 | `PLATFORM_VALIDATION_FAILED` | `Request body failed validation.`; `details` is `error.issues` | no |
   | `HttpException` with status 404 (the not-found handler's `NotFoundException`) | 404 | `PLATFORM_NOT_FOUND` | `Not found.` | no |
   | `HttpException` (413) whose `cause.type` is `entity.too.large` (body-parser, after Nest's `mapException`) | 413 | `PLATFORM_PAYLOAD_TOO_LARGE` | `Request body is too large.` | no |
   | `BadRequestException` whose `cause` is a `SyntaxError` with `cause.type` `entity.parse.failed` (malformed JSON) | 400 | `PLATFORM_VALIDATION_FAILED` | `Request body is not valid JSON.` | no |
   | anything else | 500 | `PLATFORM_INTERNAL` | `Internal server error.` | yes: message and stack |

   Source: unit lines 19 to 22. The 413 and malformed-JSON rows are identified by `cause`, because Nest's `mapException` converts body-parser errors before the filter sees them (decision 9; F10). The malformed-JSON row is this plan's choice: unit line 19 makes validation failures 400, and malformed JSON must not become a 500 (narrowed after the Opus approval of revision 3). No criterion names it; step 9 checks it by hand.
4. **Zod: pipe and inline parse, one error path.** `ZodValidationPipe(schema)` is used as `@Body(new ZodValidationPipe(schema))`. Its schema parameter has the structural type `{ parse(value: unknown): unknown }`, and the file imports nothing from zod. The cause is two zod copies (fact F10, A8): every contract schema is typed from `packages/contracts/node_modules/zod` 4.6.7, and the app's root zod is 4.6.6. A parameter typed with root `ZodType` fails `tsc` with TS2345 for `new ZodValidationPipe(echoRequestSchema)`. Modules apply the pipe with their contract schemas (unit line 24), so the parameter must accept both copies. Its `transform` returns `this.schema.parse(value)` and lets the `ZodError` reach the filter. The filter maps `z.ZodError` to 400 `PLATFORM_VALIDATION_FAILED` with `details` set to the error's `issues`, Zod's issue objects unchanged (decision 3). A handler that calls `schema.parse` inline gets the same response; PLT-06's echo does (`plans/PLT-06.md` decision 9). Source: unit lines 19 and 24 (the filter maps Zod validation failures to 400). The `ZodError` reaches the filter as thrown: the only call site of `mapException` in `@nestjs/core` is the error-handler callback (F10).
5. **Module error.** `ModuleError extends Error` with `code: string`, `status: number`, `message: string` and optional `details: unknown`. `code` is typed `string`, not a literal union, so mutations of codes stay type-correct (section 4). There is no runtime prefix check; AC 6 covers the platform codes. Source: unit line 23.
6. **Secrets.** Every message the filter writes is a fixed string. A module's message is the module's own text, and the module owns it. Source: unit line 25; `errors.ts` line 24.
7. **Stack logging.** The 500 path calls `this.logger.error(message, stack)` on a logger built with `new Logger(PlatformExceptionFilter.name)`, which sets the context once. A third argument would print the stack as a second ERROR line and a stray context line, so it is not passed (Opus code review, non-blocking 2). Nest forwards that to the logger given to `NestFactory.create`, which is `StdoutLogger` (`apps/api/src/bootstrap.ts` line 40), so the stack goes to stdout. Source: unit line 22; `plans/PLT-04.md` bullet 10; verified (F10).
8. **Headers already sent.** The filter mirrors Nest's `BaseExceptionFilter`: reply through `HttpAdapterHost.httpAdapter.reply` while headers are unsent, otherwise `httpAdapter.end`. This matters for PLT-06's streams. Source: verified (F10).
9. **Which errors reach the filter.** Route, pipe and inline-parse errors reach the filter as thrown. Nest's `mapException` is called only in the error-handler callback (`routes-resolver.js` line 96). Body-parser errors reach that callback first, and arrive as `HttpException` or `BadRequestException` with `cause` set (decision 3). The not-found handler's `NotFoundException` is thrown inside the router exception filters. All of these pass through `APP_FILTER` providers. Source: verified (F10).
10. **Unknown `/api` routes.** The exclude list in `apps/api/src/app.module.ts` (line 35) is unchanged (`plans/PLT-04.md` bullet 2). Excluded GETs reach Nest's not-found handler, which the filter maps to 404. Non-API GETs keep `index.html`. Source: unit line 20.
11. **Body limit (decided, open point 1).** PLT-05 changes nothing in `apps/api/src/bootstrap.ts`. Nest's default 100 KB JSON limit applies, so the 200 KB body in AC 3 gets 413. Source: DECISIONS entry "2026-11-12 — PLT-05 — open point 1 (request body limit)" (commit 0a82d97); unit line 21; verified (F10).
12. **Test-only controller.** `ErrorProbeModule` lives in `apps/api/test/error-probe.ts`, under `/api/platform/probe`. Tests pass `modules: [PlatformModule, ErrorProbeModule]` to `createTestApp`, because `modules` replaces `COMPOSED_MODULES` (`apps/api/test/create-test-app.ts` lines 9 to 14 and 46 to 56). Source: unit line 28; `plans/PLT-04.md` section 5 (PLT-05 row).
13. **Placement and imports.** The filter, the pipe and the error class live in `platform/errors/`. Code outside the platform folder imports them from the entry file only (`plans/PLT-04.md` bullet 4; the R1 policy in `eslint.config.mjs`). The entry's re-export is decided in open point 2. Source: `plans/PLT-04.md` bullet 4; `units/README.md` line 125.
14. **Module format.** CommonJS: relative imports have no `.js` suffix. Source: `plans/DECISIONS.md` lines 462 to 465 (2026-11-12, open point 1).
15. **No new packages.** `@nestjs/core`, `@nestjs/common` and `zod` are already in `apps/api/package.json` (lines 10 to 19). `package.json` and `package-lock.json` do not change.
16. **First class injection.** The filter takes `HttpAdapterHost` in its constructor. This is the first constructor injection in the API, so it checks A2 (decorator metadata), which `plans/PLT-04.md` section 7 asks PLT-05 to do. Source: `plans/DECISIONS.md` line 480.

## 2. Files to create or change

Only the platform folder, the test folder and the entry `platform.module.ts` change. Explicitly unchanged: `apps/api/src/main.ts`, `bootstrap.ts`, `app.module.ts`, `apps/api/package.json`, `package-lock.json`, `packages/contracts/**` and the six PLT-04 test files (`smoke`, `healthz-version`, `static-fallback`, `env-boot`, `app-state`, `create-test-app.test.ts`).

| Path | New or changed | Purpose |
|---|---|---|
| `apps/api/src/modules/platform/errors/module-error.ts` | new | `ModuleError` (decision 5) |
| `apps/api/src/modules/platform/errors/zod-validation.pipe.ts` | new | `ZodValidationPipe` (decision 4) |
| `apps/api/src/modules/platform/errors/platform-exception.filter.ts` | new | `PlatformExceptionFilter`: `@Catch()`, the mapping of decision 3, decisions 4, 7 to 9 and 16 |
| `apps/api/src/modules/platform/errors/index.ts` | new | Barrel for the one re-export line in `platform.module.ts` (open point 2) |
| `apps/api/src/modules/platform/platform.module.ts` | changed | Adds the imports for `APP_FILTER` (from `@nestjs/core`), the filter and the barrel. One entry in `providers`: `{provide: APP_FILTER, useClass: PlatformExceptionFilter}`. One re-export line: `export { ModuleError, ZodValidationPipe } from './errors/index';` |
| `apps/api/test/error-probe.ts` | new | `ErrorProbeModule` and its controller (decision 12). Not a test file |
| `apps/api/test/error-validation.test.ts` | new | AC 1 |
| `apps/api/test/error-not-found.test.ts` | new | AC 2 |
| `apps/api/test/error-payload.test.ts` | new | AC 3 |
| `apps/api/test/error-internal.test.ts` | new | AC 4 |
| `apps/api/test/error-module.test.ts` | new | AC 5 |
| `apps/api/test/error-shape.test.ts` | new | AC 6 |

Shapes (a sketch for the implementer, not final code):

```ts
// errors/module-error.ts
export class ModuleError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: string, status: number, message: string, details?: unknown) { ... }
}

// errors/zod-validation.pipe.ts
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly schema: { parse(value: unknown): unknown }) {} // structural; no zod import
  transform(value: unknown): unknown { return this.schema.parse(value); } // a ZodError reaches the filter
}

// errors/platform-exception.filter.ts
@Catch()
export class PlatformExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PlatformExceptionFilter.name);
  constructor(private readonly adapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost): void { ... } // mapping table, then reply or end
}
```

## 3. Method

0. **Preconditions.** `git status --short` is empty, and `git diff --quiet bd95da8 HEAD -- apps/api packages/contracts package.json package-lock.json` exits 0. That is the code this plan read. Run `npm ci` from the root, then `git diff --quiet bd95da8 -- package-lock.json` must exit 0 (the install must not rewrite the lock). Run `npm run build -w @bbartolome/scriba-contracts`. Run the baseline `npm test -w @bbartolome/scriba-api`: 6 of 6 files and 6 of 6 tests pass. Record `node -v` and `npm -v`. Check the installed Nest and body-parser facts with the greps of section 7, F10, against `node_modules`. If one differs, stop and record it.
1. Create `errors/module-error.ts` (decision 5).
2. Create `errors/zod-validation.pipe.ts` (decision 4). Its `transform` returns `this.schema.parse(value)`; it imports nothing from `zod`; its schema parameter has the structural type of decision 4. Then create `errors/index.ts`, the barrel: `export { ModuleError } from './module-error';` and `export { ZodValidationPipe } from './zod-validation.pipe';` (open point 2).
3. Create `errors/platform-exception.filter.ts` (decisions 3, 4, 7, 8, 9 and 16). The mapping is a private function in this file, checked in this order: `ModuleError`; `z.ZodError`; `HttpException` with status 404; `HttpException` or `BadRequestException` whose `cause` identifies the body-parser error (413, then 400); anything else. Read `cause` with a structural check, not an express type, because `apps/api` has no `@types/express`. The mapped code is typed `string`. The 500 log is `this.logger.error(message, stack)`, with two arguments only (decision 7).
4. Edit `platform.module.ts`: the imports, one `providers` entry, and the one re-export line `export { ModuleError, ZodValidationPipe } from './errors/index';` (open point 2). The `SCRIBA_ENV` re-export line stays.
5. Create `test/error-probe.ts`. `ProbeController` sits on `@Controller('api/platform/probe')` and has four routes:
   - `POST validate`, with `@Body(new ZodValidationPipe(probeSchema))`, returns the body. `probeSchema = z.object({count: z.number().int().min(1)})`, exported.
   - `POST module-error` throws `new ModuleError('PROVIDER_UNREACHABLE', 502, 'Provider is unreachable.', {provider: 'ollama'})`.
   - `GET plain-error` throws `new Error('probe boom')`.
   - `POST contract`, with `@Body(new ZodValidationPipe(echoRequestSchema))`, where `echoRequestSchema` is imported from `@bbartolome/scriba-contracts/platform`, returns the body. It is the contract-schema route of AC 1 (Opus code review, blocking 1).
   `ErrorProbeModule` lists the controller.
6. Create the six test files (section 4). Every POST sends `content-type: application/json`. A `fetch` with a string body sends `text/plain` by default, and body-parser then skips the body.
7. Format: `npx prettier --write` on the new and changed files under `apps/api` (sources, tests and `platform.module.ts`), then `npx prettier --check apps/api` must pass.
8. Build: `npm run build -w @bbartolome/scriba-api`. Then `grep -c "design:paramtypes" apps/api/dist/modules/platform/errors/platform-exception.filter.js` gives at least 1, and the file mentions `HttpAdapterHost` (A2 on the tsc path). `apps/api/dist` must not contain `error-probe`.
9. Test run: `npm test -w @bbartolome/scriba-api`. Expect 12 of 12 files and 12 of 12 tests. Fallbacks, used only if the named failure occurs: (a) if Nest reports that it cannot resolve the filter's dependencies, add `@Inject(HttpAdapterHost)` to the constructor parameter (A1); (b) if the AC 3 `fetch` raises a socket error instead of the 413, send that one request with `node:http` and read the response (A2). Hand check, not committed: in a scratch test, POST `{` with `content-type: application/json` to `/api/platform/probe/validate` and expect 400 `PLATFORM_VALIDATION_FAILED` with no `details` (decision 3, malformed row).
10. Mutations (section 4). One at a time: apply the edit, run `npm test -w @bbartolome/scriba-api`, record which test file fails, restore the edit. M8 fails in the second build pass (`tsc --noEmit -p tsconfig.json`, which `npm test` runs first); the first pass still writes `dist`. Its recorded result is that build failure. M2 is the only edit to `app.module.ts`, and it is reverted before step 11.
11. Lint: `npm run lint -w @bbartolome/scriba-api`. Record the result. This checks A4 and the platform folder against PLT-09's rules.
12. Root gate from the repo root: `npm run build`, `npm test`, `npm run lint`. Record `node -v` and `npm -v`.
13. Smoke, not an acceptance test: start `node apps/api/dist/main.js` with `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR` set to temp folders. Run `curl -s -i 127.0.0.1:8080/api/platform/nope`: expect 404 with `PLATFORM_NOT_FOUND`. Send SIGTERM: exit 0.
14. `git status --short` must list only the section 2 paths. Do not commit; the driver commits.

## 4. Acceptance criteria and tests

The criterion text is copied from `units/PLT-05-error-filter-validation-pipe.md` lines 31 to 36. Each criterion has one `it`, in its own file. The seam is HTTP through `createTestApp`; AC 4 also reads process stdout. Each mutation is type-correct, so `tsc` accepts it and the test is what fails. M8 is the one exception: its recorded result is a build failure (AC 1).

**AC 1.** `- [ ] An invalid body to a test controller using the pipe returns 400 `PLATFORM_VALIDATION_FAILED` in the base shape with Zod issues in `details`.`
Test: `error-validation.test.ts`, via `createTestApp({modules: [PlatformModule, ErrorProbeModule]})`. The pipe's `ZodError` takes the filter's `z.ZodError` branch, the same branch PLT-06's inline parse uses (decision 4).
- `POST /api/platform/probe/validate` with `{count: 0}`: status 400; `errorBodySchema.parse(body)` does not throw; `body.error.code` is `PLATFORM_VALIDATION_FAILED`.
- `body.error.details` `toEqual` `JSON.parse(JSON.stringify(probeSchema.safeParse({count: 0}).error!.issues))`, and its first entry's `path` is `['count']`.
- Contract route, same `it`: `POST /api/platform/probe/contract` with `{count: 0, intervalMs: 0}`, where `echoRequestSchema` comes from `@bbartolome/scriba-contracts/platform` (zod 4.6.7). Status 400; `errorBodySchema.parse(body)` does not throw; `body.error.code` is `PLATFORM_VALIDATION_FAILED`; `body.error.details` `toEqual` `JSON.parse(JSON.stringify(echoRequestSchema.safeParse({count: 0, intervalMs: 0}).error!.issues))`. This covers the cross-copy `instanceof` path (A8) and the structural pipe type at runtime (A9) (added in revision 4).
- M1 (filter, `z.ZodError` branch): pass `undefined` as `details`. The response then has no `details`, so the test fails at the `details` assertion. `details` is `unknown`, so `tsc` accepts it.
- M8 (`errors/zod-validation.pipe.ts`, type mutation): change the schema parameter back to root zod's `z.ZodType` (`import { z } from 'zod'`). The TS2345 error comes from `apps/api/test/error-probe.ts` in the second build pass (`tsc --noEmit -p tsconfig.json`). `tsconfig.build.json` covers only `src`, so the first pass still succeeds and writes `dist`; `npm run build` then fails before vitest runs. Recorded result: build failure, not a test failure. This is the one mutation expected to fail `tsc`.

**AC 2.** `- [ ] An unknown `/api/...` route returns 404 `PLATFORM_NOT_FOUND`; an unknown non-API path still returns `index.html`.`
Test: `error-not-found.test.ts`, via `createTestApp({staticRoot: resolve(__dirname, 'fixtures/static')})`.
- `GET /` and `GET /deep/link/x`: status 200; `content-type` starts with `text/html`; body `Buffer.equals` the fixture's bytes.
- `GET /api/platform/nope`: status 404; body `toEqual({error: {code: 'PLATFORM_NOT_FOUND', message: 'Not found.'}})`.
- M2 (`app.module.ts`, temporary): remove `'/api{/*rest}'` from the exclude list. The request gets the index with 200, so the test fails. The array keeps its type.

**AC 3.** `- [ ] A body over the limit returns 413 `PLATFORM_PAYLOAD_TOO_LARGE`.`
Test: `error-payload.test.ts`, via `createTestApp({modules: [PlatformModule, ErrorProbeModule]})`.
- `POST /api/platform/probe/validate` with `content-type: application/json` and `JSON.stringify({count: 1, pad: 'x'.repeat(200 * 1024)})`: status 413; `errorBodySchema.parse(body)` does not throw; `body.error.code` is `PLATFORM_PAYLOAD_TOO_LARGE`; `body.error` has no `details` key.
- 200 KB is above the default 100 KB limit (open point 1). If open point 1 changes the limit, the body must be above the new limit.
- M3 (filter): delete the `entity.too.large` branch. The response becomes 500, so the test fails.

**AC 4.** `- [ ] A thrown plain `Error` returns 500 `PLATFORM_INTERNAL` with no stack in the body and the error logged.`
Test: `error-internal.test.ts`, via the probe module. The test spies on `process.stdout.write` during the request.
- `GET /api/platform/probe/plain-error`: status 500; body `toEqual({error: {code: 'PLATFORM_INTERNAL', message: 'Internal server error.'}})`. The raw body text contains neither `probe boom` nor a line matching `/^\s+at /m`.
- The captured stdout contains `probe boom` and a line matching `/^\s+at /m`.
- M4 (body): add `details: {stack: <the thrown error's stack>}` to the 500 body. The exact-body assertion fails. `details` is `unknown`, so `tsc` accepts it.
- M5 (log): remove the `logger.error` call. The stdout assertion fails.

**AC 5.** `- [ ] A module error with a custom code/status is returned unchanged in the base shape.`
Test: `error-module.test.ts`, via the probe module.
- `POST /api/platform/probe/module-error`: status 502; body `toEqual({error: {code: 'PROVIDER_UNREACHABLE', message: 'Provider is unreachable.', details: {provider: 'ollama'}}})`.
- M6 (filter, `ModuleError` branch): use status `500` instead of `exception.status`. The status is 500, so the test fails.

**AC 6.** `- [ ] Every error body validates against the `/platform` error schema.`
Test: `error-shape.test.ts`, via the probe module. It collects one body from each error route.
- Bodies from `GET /api/platform/nope` (404), the invalid `validate` body (400), the 200 KB `validate` body (413), `GET plain-error` (500) and `POST module-error` (502).
- For each: `errorBodySchema.parse(body)` does not throw, and `Object.keys(body)` is `['error']`. The second check matters because `errorBodySchema` strips unknown keys.
- M7 (filter, 404 branch): use the code `'NOT_FOUND'`, with no prefix. `errorBodySchema.parse` throws. `error-not-found` also fails.

PLT-04's `static-fallback.test.ts` still passes: its 404 check holds with a JSON body. Each mutation is caught by at least one named test.

## 5. Downstream agreement

Each unit creates its own folder. `platform.module.ts` is shared: each of PLT-05, PLT-06, PLT-07 and PLT-08 adds only its own entries, merged in that order, and array conflicts are resolved at batch collection (open point 3, decided). No unit edits `main.ts`, `bootstrap.ts` or `app.module.ts` (except the agreed `COMPOSED_MODULES` line of a feature module), and no unit edits the filter or pipe after PLT-05 merges.

| Unit | May add | Where | Must not |
|---|---|---|---|
| PLT-06 | stream and echo controllers, publisher, backpressure close | `platform/events/`. In `platform.module.ts`: `EventsController` and `EchoController` in `controllers`, `EventsPublisher` in `providers` and `exports`, and one re-export line for `EventsPublisher` (`plans/PLT-06.md` section 2) | edit `platform/errors/`. The echo body is parsed inline with `echoRequestSchema.parse`, not with the pipe (`plans/PLT-06.md` decision 9), so its `ZodError` reaches the filter's `z.ZodError` branch (decision 4). An error after the stream has started takes the headers-sent path (decision 8) |
| PLT-07 | settings registration, boot hook, section read and write | `platform/settings/`; one `providers` entry in `platform.module.ts` | use `ModuleError` for boot failures. Those are `BootError`, which `main.ts` handles (`plans/DECISIONS.md` line 419). A newer `schemaVersion` throws `BootError` |
| PLT-08 | predicate and `connection` listener | `platform/tailnet/`; one `providers` entry in `platform.module.ts` | touch the filter. A dropped socket never reaches it |
| PLT-11 | root `dev` script, `concurrently`, dev environment | root `package.json`; `apps/api/package.json` (script only) | change any `apps/api/src` file (`plans/PLT-04.md` section 5) |
| PLT-12 | mock OpenAI server | `e2e/fixtures/mock-openai/` (`units/MPR-04-openai-compatible-client.md` line 26) | touch `apps/api` (it is parallel to PLT-05) |

Not in this batch, but relying on PLT-05: Setup & auth's guard (`units/SAU-04-global-guard.md` lines 15 and 20 to 21) and the Model providers client (`units/MPR-04-openai-compatible-client.md` line 22) both need coded errors. They need `ModuleError` from the entry file (open point 2, decided) and the rule in open point 4 (decided).

## 6. Open points

Revision 2 decided all four. Revision 3 changes the text of open point 4 only (the body-parser identification). Each decision and its reason:

1. **Body limit: decided, option (a).** PLT-05 changes nothing in `bootstrap.ts`. Nest's 100 KB default JSON limit holds, so AC 3's 200 KB body gets 413. Reason: `plans/PLT-04.md` section 5 forbids downstream edits to `bootstrap.ts`, and PLT-05 owns no composition-root setting. Source: DECISIONS entry "2026-11-12 — PLT-05 — open point 1 (request body limit)" (commit 0a82d97). The premise is corrected: the 5 MB figure is the read cap (`units/PST-06-file-api-core.md` line 20, `PROJECT_FILE_TOO_LARGE`), and the write line (21) states no size limit. Known gap: a save over 100 KB gets 413 until PLT-04 is revised. That is recorded in DECISIONS and is not a PLT-05 criterion.
2. **Re-export from the entry file: decided, option (a).** One line in `platform.module.ts` re-exports `ModuleError` and `ZodValidationPipe` through the barrel `platform/errors/index.ts`, as `plans/PLT-04.md` bullet 4 does for `SCRIBA_ENV`. Reason: SAU-04 and MPR-04 need the class from the entry file, and rule R1 allows only entry-file imports across modules. The barrel is one new file.
3. **Shared file `platform.module.ts`: decided, option (a).** Each of PLT-05, PLT-06, PLT-07 and PLT-08 adds only its own entries. The merge order is PLT-05, PLT-06, PLT-07, PLT-08, and array conflicts are resolved at batch collection. Reason: `plans/PLT-04.md` section 5 and `plans/DECISIONS.md` line 426 settle the shared file, so batch collection governs it.
4. **Nest `HttpException` other than the identified cases: decided, option (a).** Guards and modules throw `ModuleError` with their own codes. Any other exception maps to 500 under decision 3. Reason: `units/SAU-04-global-guard.md` line 15 asks for Platform-shaped errors (the `AUTH_*` codes of Setup & auth). The two body-parser cases are identified by `exception.cause` (decision 3), because Nest's `mapException` turns body-parser errors into `HttpException` or `BadRequestException` before the filter runs (`express-adapter.js` lines 494 to 516; F10). Under option (a), other body-parser errors also map to 500. Known gaps under option (a), with no criterion covering them, each becoming a logged 500 (applied after the Opus approval of revision 3): (i) a 415 for an unsupported charset (`cause.type` `charset.unsupported`, `body-parser` `lib/read.js` lines 77 to 83, active only when `lib/types/json.js` line 56 rejects a charset that does not start with `utf-`); (ii) a 415 `encoding.unsupported` (`lib/read.js` lines 231 to 234); (iii) a 400 `request.size.invalid` (`raw-body` `index.js` line 281); (iv) an Express `URIError`, which becomes a `BadRequestException` with no `SyntaxError` cause. AC 6 still passes with a 500 body, because that body validates against the schema.

## 7. Facts checked and facts assumed

Facts checked (file, lines, or command):
- F1. HEAD `bd95da8`, tree clean (`git rev-parse --short HEAD`, `git status --short`). `git diff --stat bd95da8 -- apps/api packages/contracts` is empty. No `APP_FILTER` or probe code exists yet (`grep -rn "APP_FILTER\|ErrorProbe" apps/api/src apps/api/test` is empty).
- F2. `units/PLT-05-error-filter-validation-pipe.md`: front matter lines 1 to 9; Decisions lines 18 to 25; Scope line 28; criteria lines 31 to 36.
- F3. `units/README.md` line 125 (module shape and R1), line 127 (error shape), line 133 (testing rules).
- F4. `modules/platform.md`: line 29 (PLT-05 to PLT-08 each add their own folder and provider), lines 33 to 44 (settled decisions), lines 55 to 59 (testing principles).
- F5. `plans/DECISIONS.md`: lines 462 to 465 (CommonJS), 419 (`main.ts` handles only `BootError`), 426 (PLT-05 and PLT-06 edit `platform.module.ts`), 480 (A2 is for PLT-05 to PLT-08), 511 to 515 (the entry "2026-11-12 — PLT-05 — open point 1 (request body limit)"; cited with commit 0a82d97 as given, git not run), 530 to 540 (the Opus review of revision 2). No other 2026-11-12 entry records open points 2 to 4.
- F6. `plans/PLT-04.md`: section 2 rows; section 5 PLT-05 row; bullets 2, 4, 10 and 19; section 7 (A2).
- F6a. `plans/PLT-06.md`: decision 9 (inline `echoRequestSchema.parse`; a `ZodError` is left to the filter); section 2 `platform.module.ts` row (two controllers, `EventsPublisher` in `providers` and `exports`, one re-export line); open point 2 (decided option A).
- F7. Code on main: `apps/api/src/bootstrap.ts` lines 27 to 51 (logger at line 40, `init` catch at lines 43 to 49); `app.module.ts` lines 25 to 40 (exclude list at line 35; `modules ?? COMPOSED_MODULES` at line 37); `main.ts` lines 9 to 15; `platform.module.ts` lines 1 to 12; `test/create-test-app.ts` lines 9 to 14 and 46 to 56; each PLT-04 test has one `it`; `boot/stdout-logger.ts` lines 13 to 32; `boot/env.ts` lines 84 to 154.
- F8. `apps/api/package.json` lines 10 to 24 (dependencies `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `zod`; devDependencies `unplugin-swc`, `@swc/core`, `@types/node`). `apps/api/tsconfig.json`: `types`, `experimentalDecorators`, `emitDecoratorMetadata`; includes `src` and `test`.
- F9. Contracts: `packages/contracts/src/platform/errors.ts` lines 4 to 49; `index.ts` line 3 re-exports errors; `packages/contracts/test/platform.schema.test.ts` lines 121 to 159 (error-body tests).
- F10. Nest, body-parser, http-errors and raw-body source from published tarballs, unpacked under `/tmp/plt05-probe/pack` (outside the repo; the repo and `node_modules` were not touched). The versions in the committed lock (read with `node` from `package-lock.json`) are `@nestjs/core` 12.4.2, `@nestjs/common` 12.4.2, `@nestjs/platform-express` 12.4.2, `@nestjs/serve-static` 12.1.1, `express` 5.3.0, `body-parser` 2.4.0, `raw-body` 3.0.2, `zod` 4.6.6, `unplugin-swc` 2.0.0, `vitest` 5.1.0. The lock has two `zod` copies: root `node_modules/zod` 4.6.6 serves `apps/api`, and `packages/contracts/node_modules/zod` 4.6.7 serves every contract schema, PLT-06's echo included. In 4.6.7, `v4/core/core.js` lines 112 to 117 define `Symbol.hasInstance` on each constructor as `inst._zod.traits.has(name)`, so a `ZodError` from either copy passes `instanceof z.ZodError` (applied after the Opus approval of revision 3). The Opus code review of `unit/PLT-05` (head a48cf50) reports that a root `ZodType` parameter fails `tsc` with TS2345 for a 4.6.7 contract schema, and that a structural parameter accepts schemas from both copies (`plans/DECISIONS.md`, entry at line 572; not re-run here; M8 re-checks the first claim). The checks:
  - `@nestjs/core/router/routes-resolver.js` `registerNotFoundHandler` (lines 77 to 92): the callback throws `NotFoundException`, wrapped by `routerExceptionsFilter.create`.
  - `routes-resolver.js` `registerExceptionHandler` (lines 94 to 106): the error-handler callback does `throw mapException(err)` (line 96), and the handler is wrapped by the same filters. `grep -rn mapException` in the `@nestjs/core` package finds one call site, line 96. Its other matches are the default definition in `adapters/http-adapter.js` (line 230; line 13 is a comment) and type declarations, so route, pipe and inline-parse errors do not pass through `mapException` (applied after the Opus approval of revision 3).
  - `@nestjs/platform-express/adapters/express-adapter.js` `mapException` (lines 494 to 516): a `SyntaxError` or `URIError` becomes `BadRequestException(message, {cause})`; an http-errors object with `statusCode` below 500 becomes `HttpException(message, statusCode, {cause})`; other errors are returned unchanged. `isHttpError` (line 560) requires `expose` boolean and a numeric `statusCode`.
  - `@nestjs/common/exceptions/http.exception.js` line 72: `this.cause = this.options.cause`.
  - `@nestjs/core/router/router-exception-filters.js` lines 30 to 41: global filters come from `config.getGlobalFilters()`.
  - `@nestjs/core/nest-application.js` lines 126 to 127 (default parser unless `bodyParser: false`) and 227 to 228 (not-found and exception handlers).
  - `@nestjs/core/constants.js` line 12 (`APP_FILTER`), exported at `index.js` line 10; `helpers/http-adapter-host.js` line 14 (`HttpAdapterHost`), exported through `index.js` line 13.
  - `@nestjs/core/exceptions/base-exception-filter.js` lines 31 to 35 and 49 to 53: headers sent gives `applicationRef.end`, otherwise `reply`.
  - `@nestjs/core/nest-factory.js` line 166: `Logger.overrideLogger(logger)`.
  - `@nestjs/common/services/logger.service.js` lines 50 to 68: a `Logger` instance forwards to the static logger once it is set.
  - `@nestjs/common/services/console-logger.service.js` lines 206 to 259: output goes to `process[writeStreamType ?? 'stdout']`.
  - `@nestjs/platform-express/adapters/express-adapter.js`: `reply` (line 90), `setErrorHandler` (lines 169 to 180), `setNotFoundHandler` (line 181), `isHeadersSent` (line 216), `registerParserMiddleware` (`express.json` with default options).
  - `body-parser` 2.4.0: `lib/utils.js` line 47 (102400 bytes, 100 KB). `lib/read.js` lines 136 to 157: a raw-body error is re-wrapped with `createError(400, error)` and `createError(400, _error)`, and http-errors keeps the error's status (413), so the `next` argument keeps `type` `entity.too.large`. `lib/read.js` lines 196 to 198: a JSON parse failure calls `createError(400, err, {type: err.type || 'entity.parse.failed'})`, which sets `type` on the `SyntaxError`.
  - `http-errors` 2 `index.js` lines 50 to 70 and 94 to 100: given an Error, it keeps the error's status and copies the extra props onto it.
  - `raw-body` 3.0.2: `index.js` lines 163 to 167 and 260 to 263 (`entity.too.large`, status 413).
- F11. `units/PST-06-file-api-core.md` line 20 (read: 5 MB cap, `PROJECT_FILE_TOO_LARGE`), line 21 (write: POST, no size limit stated), line 31 (read criterion); `units/PST-01-contract-slice.md` line 50 (file size cap constant); `units/SAU-04-global-guard.md` lines 15 and 20 to 21 (Platform-shaped errors, `AUTH_*` codes); `units/MPR-04-openai-compatible-client.md` lines 22 and 26; `units/PLT-06-sse-stream-publisher.md` lines 17 to 27 and 33 to 39; `units/PLT-07-settings-migration-hook.md` lines 17 to 23 and 35; `units/PLT-08-tailnet-address-filter.md` lines 17 to 27; `units/PLT-11-scaffold-gate.md` lines 20 to 31; `units/PLT-12-mock-openai-server.md` front matter (`parallel_with` includes PLT-05).
- F12. `eslint.config.mjs`: element pattern `src/modules/*`, entry pattern `**/src/modules/*/*.module.ts`, and the R1 policy.

Facts assumed (each has a check):
- A1. Vitest 5.1.0 with `unplugin-swc` 2.0.0 emits the decorator metadata that the filter's constructor needs. Checked by step 9 (fallback in step 9a).
- A2. `fetch` with a 200 KB body receives the 413 response without a socket error. Checked by step 9 (fallback in step 9b).
- A3. Vitest's `process.stdout.write` spy captures Nest's `StdoutLogger` output in the test worker. Checked by AC 4.
- A4. Files under `apps/api/test/` are outside the ESLint boundary elements, so test imports of `src/modules/platform/errors/*` pass lint. Checked by step 11.
- A5. Zod 4.6.6 issue objects are JSON-serialisable. AC 1 compares against `JSON.parse(JSON.stringify(issues))`, so it does not depend on the exact fields. Checked by step 9.
- A6. The installed packages match the lock versions in F10. Checked by step 0.
- A7. `export ... from './errors/index'` resolves under the CommonJS NodeNext build (step 8 checks it).
- A8. The filter's `instanceof z.ZodError` (zod 4.6.6, `apps/api`) matches a `ZodError` thrown by a contract schema (zod 4.6.7, `packages/contracts/node_modules`), through the trait check in F10. The 4.6.6 copy is ASSUMED to behave like 4.6.7. AC 1 checks the 4.6.6 path on the pipe route and the 4.6.7 path on its contract route (revision 4).
- A9. A zod 4.6.7 schema is assignable to the pipe's structural parameter `{ parse(value: unknown): unknown }`, and the pipe file imports nothing from zod. Checked by step 8 (`tsc`) and by AC 1's contract route.

Not verified:
- `node_modules` is absent, so nothing has been installed, built, tested or linted for this plan. No mutation has run.
- Commit 0a82d97 is cited as given by the coordinator; git was not run to check it.
- The malformed-JSON row (decision 3) has no criterion. Step 9 checks it by hand.
