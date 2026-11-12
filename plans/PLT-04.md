---
id: PLT-04
status: draft
---
# PLT-04 plan — NestJS composition root, env parsing, app-state check, /healthz, version info, create-test-app

Batch: [PLT-04] (Platform, phase:scaffold, M1). Revision 6.

Revision 5 is a fresh redraft. The earlier drafts are not in git, and DECISIONS logs revisions 1 to 4, the rejection of the previous redraft (commit d5b353d) and the rejection of revision 5 (commit af54076), whose corrections this revision applies.

Open point 1 is decided (DECISIONS commit a4ab77a). Opus approved revision 5 (DECISIONS commit cba83fb); revision 6 applies its six non-blocking corrections without a new review.

This revision is written from the unit, the module file, the committed code and `plans/DECISIONS.md`. It applies every note of the Opus reviews at `plans/DECISIONS.md` lines 392, 408 and 422, and the corrections of the rejected redraft (bullet 22).

## 1. Decisions this plan follows

1. **One app, one port.** `main.ts` listens on `0.0.0.0:8080`. `SCRIBA_PORT` is the host publish port only. Tests listen on `127.0.0.1` port 0. No CORS. Source: unit line 18; contracts `src/platform/env.ts` comment.
2. **Static files and SPA fallback.** `ServeStaticModule.forRoot({rootPath, exclude: ['/api{/*rest}', HEALTHZ_ROUTE, EVENTS_ROUTE]})` in `app.module.ts`. Every non-excluded GET gets `index.html` (the render route is `{*any}`). Excluded GETs are passed on with `next()`, so Nest answers them. The exclude entries are path-to-regexp v8 patterns. Default `rootPath` is `resolve(__dirname, '..', '..', 'web', 'dist', 'scriba-web', 'browser')`. Source: unit line 18; DECISIONS line 392, item 10; section 7.
3. **Composition root.** `app.module.ts` exports `COMPOSED_MODULES = [PlatformModule]`. Each later module adds one import there. `buildRootModule(options)` returns a dynamic module with `global: true`, `exports: [SCRIBA_ENV]`, which imports `ServeStaticModule.forRoot(...)` and `options.modules ?? COMPOSED_MODULES`. Source: unit lines 19, 29; DECISIONS line 392, item 3.
4. **Platform folder.** Platform code is `apps/api/src/modules/platform/`, with entry `platform.module.ts`. Boot helpers (env, app-state check, logger, `BootError`) live inside that folder, so platform code imports only inside its own folder (PLT-09 rule R1; open point 4). `platform.module.ts` re-exports `SCRIBA_ENV` and the type `ScribaEnv`, so modules outside platform import them from the entry only. Source: unit line 20; DECISIONS line 295 (PLT-09 entry patterns).
5. **Env.** Source: unit line 21; contracts `env.ts` comment ("Parse rules belong to the API composition root (PLT-04)").
   - Names and defaults come from `SCRIBA_ENV_DEFAULTS` (`@bbartolome/scriba-contracts/platform`). `parseEnv(options.env ?? process.env)` validates every name there with Zod 4, except the compose-only `SCRIBA_UID`, `SCRIBA_GID` and `SCRIBA_IMAGE_TAG`.
   - Rules: `SCRIBA_PORT` an integer from 1 to 65535; `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR`, `SCRIBA_EXAMPLES_DIR` absolute paths; `SCRIBA_LOG_LEVEL` one of `debug`, `info`, `warn`, `error` (the contract gives only the default, `info`, so these four values are chosen here); `SCRIBA_WATCHER` `true` or `false`; `SCRIBA_COMPOSE_VERSION` an optional non-negative integer; `SCRIBA_SETUP_URL_BASE` a URL, and when unset `http://127.0.0.1:<SCRIBA_PORT>`; `SCRIBA_TS_SOCKET` and `SCRIBA_DEV_ORIGINS` are strings, not checked here.
   - Error: a bad value throws `BootError` with `Invalid <NAME> "<value>": <reason>.`. The reason for the enum is `expected one of debug, info, warn, error`; the others use a short reason of the same kind.
6. **`SCRIBA_LIBRARY` is read raw.** Its contract default (`~/Books`) is not used. Unset means no host line in the app-state message. Set to the empty string is invalid (`must not be empty`). Source: DECISIONS line 408 (first note); line 422 (empty value).
7. **App-state check.** Runs before Nest is created: `mkdirSync(join(SCRIBA_BOOKS_DIR, '.scriba'), {recursive: true})`, then `accessSync(dir, W_OK)`. A failure of either call throws `BootError` with `Cannot write to the app-state folder <container path> as UID <uid>, GID <gid>.`. When `SCRIBA_LIBRARY` is set, a second line `Host path: <SCRIBA_LIBRARY>/.scriba` follows. UID and GID are `process.getuid()` and `process.getgid()`. The container cannot know the host path, so the unit's "host path" (line 22) becomes that optional line. Source: unit line 22; DECISIONS line 392, item 8.
8. **Boot order.** Source: unit line 23; DECISIONS line 408 (second note); line 422 (correction).
   - (a) Env parse. (b) App-state check. (c) `NestFactory.create(rootModule, {abortOnError: false, logger: new StdoutLogger(level)})`. (d) `app.init()`, which runs `onApplicationBootstrap`, where PLT-07 and PLT-08 hook in. (e) `app.listen`, done by the caller. `bootstrap()` stops after (d).
   - The default `abortOnError` is true and exits the process (`nest-factory.js` line 25). With `false`, `create` rejects instead. A rejected hook makes `init()` reject in both modes.
   - `main.ts` handles only `BootError`: it writes the message and a newline to stderr, then calls `process.exit(1)`. Other errors are rethrown.
9. **Health and version.** `HealthController` on `HEALTHZ_ROUTE`, unguarded: `{status: 'ok', version}`. `VersionController` on `VERSION_ROUTE`: `{version, revision, builtAt, composeVersion}`. Shapes are `healthzSchema` and `versionInfoSchema`. `build-info.ts` holds the dev values `version` `0.0.0-dev`, `revision` `dev`, `builtAt` `dev`. `compose-version.ts` holds `EXPECTED_COMPOSE_VERSION = 0`, a placeholder that PLT-15 replaces. Source: unit lines 24, 25; contracts `http.ts`; DECISIONS line 237; open point 3.
10. **Logging.** `StdoutLogger extends ConsoleLogger` overrides `error` and `fatal`. Each override calls `printMessages(..., 'error' or 'fatal', 'stdout', stack, params)` and writes the stack to `process.stdout`, because Nest's `error` and `fatal` write to stderr (section 7). Level map: `debug` enables fatal, error, warn, log, debug, verbose; `info` enables fatal, error, warn, log; `warn` enables fatal, error, warn; `error` enables fatal, error. Source: unit line 27; DECISIONS line 392, item 4; section 7.
11. **Shutdown.** `main.ts` calls `app.enableShutdownHooks([], {useProcessExit: true})`. The signature is `enableShutdownHooks(signals = [], options = {})` (`nest-application-context.js` line 207; section 7), and an empty `signals` means all `ShutdownSignal` values. Without `useProcessExit`, Nest re-sends the signal, so the process ends by signal (status 143). With it, Nest calls `process.exit(0)` after close (lines 244 to 249). Nest's close runs `beforeApplicationShutdown`, then closes the HTTP server, then `onApplicationShutdown` (lines 159 to 162). PLT-06 ends its streams in `beforeApplicationShutdown`. Source: unit line 28; section 7.
12. **No guard here.** Setup & auth adds the global guard later. Source: unit line 26.
13. **Packages.** `scribaPins.nestjs` is `"12"`: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` and `@nestjs/serve-static` at `^12`. Resolved versions are recorded at implementation (step 1), not in this plan. Also `rxjs` `7.8.2` (same as `apps/web`; a Nest peer), `reflect-metadata` `^0.2` (a Nest peer), `zod` `^4` (`scribaPins.zod`), and `@bbartolome/scriba-contracts` `0.0.0` (the workspace). `@nestjs/platform-express` is not named in DECISIONS line 13 (open point 2). Source: root `package.json` `scribaPins`; DECISIONS lines 13 and 19.
14. **Types.** `apps/api/tsconfig.json` gets `"types": ["node"]` (option A, DECISIONS line 294; `plans/PLT-02.md` open point 12 asks for it), plus `experimentalDecorators` and `emitDecoratorMetadata` for Nest's DI (section 7). `@types/node` `^26.6.6`, as in contracts. Source: DECISIONS lines 294 and 301 (item 3).
15. **Module format.** CommonJS, decided in open point 1: no `"type": "module"` in `apps/api`. Source: DECISIONS 2026-11-12, open point 1 entry (commit a4ab77a).
16. **Build and test chain.** `build` = `tsc -p tsconfig.build.json && tsc --noEmit -p tsconfig.json` (emit `dist/`, then type-check `src` and `test`). `test` = `npm run build && vitest run`. The apps/api tests import the built contracts package, so contracts must be built first. The root `npm test` gets this from workspace order, since contracts is first. `npm test -w @bbartolome/scriba-api` on its own needs `npm run build -w @bbartolome/scriba-contracts` first. Source: DECISIONS line 151; the 2026-11-11 PLT-10 entry (build-first test script); PLT-01 section 5 (PLT-04 entry).
17. **Test runner.** Vitest from the root (5.1.0; apps/api has no copy). `vitest.config.mts` uses `unplugin-swc` 2.x. `testTimeout` is 20000 ms. A spawned child is killed after 15000 ms. Source: units/README.md line 133; PLT-01 section 5 (PLT-04 entry); DECISIONS line 392, item 5; line 408.
18. **Spawned tests.** AC 3 and AC 4 run `process.execPath` on `resolve(__dirname, '..', 'dist', 'main.js')` with an env built from scratch (no inherited `SCRIBA_*`), and assert exact labelled lines (section 4). Source: DECISIONS line 392, item 2.
19. **Test helper.** `createTestApp({libraryDir?, env?, staticRoot?, modules?})` calls `bootstrap({env, staticRoot, modules})` with the base env merged under `env`, then `listen(0, '127.0.0.1')`. The base env sets `SCRIBA_BOOKS_DIR` to the library, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR` inside it, and `SCRIBA_LOG_LEVEL` to `error`. `staticRoot` is absolute and defaults to the Angular output. `modules` replaces `COMPOSED_MODULES`, so a test that needs Platform's routes lists `PlatformModule`. It returns `{baseUrl, sse(path), close()}`. When `createTestApp` makes the temp library itself (no `libraryDir` given), `close()` removes it; a given `libraryDir` is never removed. `sse` is a thin fetch reader with no PLT-04 criterion; PLT-06 tests it. Source: unit lines 29, 32; DECISIONS line 392, item 3.
20. **`bootstrap.ts` imports `reflect-metadata` first.** Source: section 7 (the scratch probe imports it before Nest).
21. **The smoke test stays.** `apps/api/test/smoke.test.ts` is kept, as PLT-02 kept its own. The PLT-01 AC 2 probe names `test/smoke.test.ts` (DECISIONS, 2026-11-11 PLT-03 review entry).
22. **Review notes applied** (DECISIONS lines 392, 408, 422; the rejection of the previous redraft, commit d5b353d):
   - Labelled forms and no stack frames: section 4 (AC 3 and AC 4).
   - `modules ?? COMPOSED_MODULES`: bullets 3 and 19. Logger on stdout: bullet 10. Spawn timeouts: bullet 17.
   - Lockfile gate: step 3. Host path: bullet 7. No unit edits `bootstrap.ts`: section 5.
   - Exclude list from constants: bullet 2. `abortOnError` and init wording: bullet 8.
   - Both `SCRIBA_LIBRARY` cases use the unwritable folder, and an empty `SCRIBA_LIBRARY` is invalid: bullet 6 and section 4.
   - `os.tmpdir()`: open point 6. Each of PLT-05 to PLT-08 adds one line to `platform.module.ts`: section 5.
   - Node and npm versions are recorded: steps 1 and 18.
   - Corrections of commit d5b353d: step 1 (`npm ci` first) and step 3 (lock command); step 15 (six files); step 19 and bullet 11; step 16(d) (`app-state.ts` mutation); AC 2 (`__dirname` path); bullet 4 (`SCRIBA_ENV` re-export); section 7.
   - Corrections of commit af54076: step 3 (`--package-lock-only`, open point 8); step 14 (prettier); bullet 11 (`enableShutdownHooks` arguments); bullet 18 (spawn path); bullet 4 (line 295); section 7 (A7, platform-express, the signature, the lock facts).

## 2. Files to create or change

Only the paths below change. `package.json` at the root, `tsconfig.base.json`, `eslint.config.mjs` and `.prettierignore` do not change. `package-lock.json` changes only through step 3.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/package.json` | edit | scripts `build` and `test` (bullet 16); dependencies `@bbartolome/scriba-contracts` `0.0.0`, `@nestjs/common` `^12`, `@nestjs/core` `^12`, `@nestjs/platform-express` `^12`, `@nestjs/serve-static` `^12`, `reflect-metadata` `^0.2`, `rxjs` `7.8.2`, `zod` `^4`; devDependencies `@types/node` `^26.6.6`, `@swc/core` `^1`, `unplugin-swc` `^2`. No vitest entry |
| `apps/api/tsconfig.json` | edit | adds `compilerOptions`: `types` `["node"]`, `experimentalDecorators`, `emitDecoratorMetadata`. Keeps `extends` and `include` |
| `apps/api/tsconfig.build.json` | new | extends `../../tsconfig.base.json`; `include` `["src"]`; `rootDir` `src`; `outDir` `dist`; the same compiler options |
| `apps/api/vitest.config.mts` | new | `defineConfig({plugins: [swc.vite()], test: {include: ['test/**/*.test.ts'], testTimeout: 20000}})` |
| `apps/api/src/.gitkeep` | delete | the folder now holds files |
| `apps/api/src/main.ts` | new | entry for `dist/main.js`: `bootstrap()`, `enableShutdownHooks([], {useProcessExit: true})`, `listen(8080, '0.0.0.0')`, `BootError` handling |
| `apps/api/src/bootstrap.ts` | new | `import 'reflect-metadata'`; `BootOptions`; `bootstrap()`: env, app-state check, create, init. Returns the initialized app without listening |
| `apps/api/src/app.module.ts` | new | `COMPOSED_MODULES`; `buildRootModule()`: global env provider, `ServeStaticModule.forRoot`, `options.modules ?? COMPOSED_MODULES` |
| `apps/api/src/modules/platform/platform.module.ts` | new | entry; `controllers` `[HealthController, VersionController]`; `providers` `[]`; re-exports `SCRIBA_ENV` and `ScribaEnv` from `boot/env.ts`. PLT-05 to PLT-08 each add lines here |
| `apps/api/src/modules/platform/health.controller.ts` | new | `GET` on `HEALTHZ_ROUTE` |
| `apps/api/src/modules/platform/version.controller.ts` | new | `GET` on `VERSION_ROUTE` |
| `apps/api/src/modules/platform/build-info.ts` | new | `BUILD_INFO` with the dev values (bullet 9) |
| `apps/api/src/modules/platform/compose-version.ts` | new | `EXPECTED_COMPOSE_VERSION = 0`, the placeholder PLT-15 replaces |
| `apps/api/src/modules/platform/boot/boot-error.ts` | new | `class BootError extends Error` |
| `apps/api/src/modules/platform/boot/env.ts` | new | `SCRIBA_ENV` injection token; `ScribaEnv` type; `parseEnv()` |
| `apps/api/src/modules/platform/boot/app-state.ts` | new | `ensureAppState(env)`: mkdir, access check, the `BootError` message. The raw library value is `env.SCRIBA_LIBRARY` (the `ScribaEnv` holds it raw), so no second argument |
| `apps/api/src/modules/platform/boot/stdout-logger.ts` | new | `StdoutLogger` with the `error` and `fatal` overrides and the level map |
| `apps/api/test/create-test-app.ts` | new | `createTestApp()` (bullet 19) |
| `apps/api/test/sse.ts` | new | `readSse(url)`, a thin fetch stream reader |
| `apps/api/test/fixtures/static/index.html` | new | fixed fixture for AC 2 (checked in, not generated) |
| `apps/api/test/healthz-version.test.ts` | new | AC 1 |
| `apps/api/test/static-fallback.test.ts` | new | AC 2 |
| `apps/api/test/env-boot.test.ts` | new | AC 3 |
| `apps/api/test/app-state.test.ts` | new | AC 4 |
| `apps/api/test/create-test-app.test.ts` | new | AC 5 |
| `apps/api/test/smoke.test.ts` | unchanged | kept (bullet 21) |
| `package-lock.json` | changed only by step 3 | the new packages and their dependencies |
| `apps/api/dist/` | generated, git-ignored | build output (`.gitignore` lists `dist/`) |

Signatures (a sketch of the shapes the implementer fills in; not final code):

```ts
// apps/api/src/bootstrap.ts
import 'reflect-metadata';
export interface BootOptions {
  env?: Record<string, string | undefined>; // default: process.env
  staticRoot?: string;                      // absolute; default: Angular output
  modules?: Type<unknown>[];                // default: COMPOSED_MODULES
}
export async function bootstrap(options: BootOptions = {}): Promise<INestApplication>;

// apps/api/src/app.module.ts
export const COMPOSED_MODULES: Type<unknown>[] = [PlatformModule];
export function buildRootModule(o: { env: ScribaEnv; staticRoot: string; modules?: Type<unknown>[] }): DynamicModule {
  return {
    module: RootModule,
    global: true,
    providers: [{ provide: SCRIBA_ENV, useValue: o.env }],
    exports: [SCRIBA_ENV],
    imports: [
      ServeStaticModule.forRoot({ rootPath: o.staticRoot, exclude: ['/api{/*rest}', HEALTHZ_ROUTE, EVENTS_ROUTE] }),
      ...(o.modules ?? COMPOSED_MODULES),
    ],
  };
}

// apps/api/src/modules/platform/boot/stdout-logger.ts
export class StdoutLogger extends ConsoleLogger {
  error(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isLevelEnabled('error')) return;
    const { messages, context, stack, params } = this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, 'error', 'stdout', stack, params);
    if (stack) process.stdout.write(`${stack}\n`);
  }
  // fatal: the same body with 'fatal'
}
```

## 3. Method

1. **Preconditions.** Before any edit, `git diff --quiet d5b353d -- package-lock.json` must exit 0: the lock at the start of implementation is the one at d5b353d. From the repo root run `npm ci`, which installs from that lock only. Then build contracts: `npm run build -w @bbartolome/scriba-contracts`. Record `node -v` and `npm -v` (expected v26.x and 11.x). Read the versions for the PR description, not into this plan: `npm view @nestjs/core@12 version | tail -1`, the same for `@nestjs/common`, `@nestjs/platform-express` and `@nestjs/serve-static`, and `npm view unplugin-swc@2 version | tail -1`.
2. Edit `apps/api/package.json` (section 2). Add the dependencies and scripts. The root `package.json` is not edited. Do not install yet.
3. **Lock update (the one lock-writing command).** From the root run `npm install --package-lock-only --ignore-scripts`. `npm ci` cannot add entries that the lock lacks, and this mode writes the lock without touching `node_modules` (DECISIONS lines 374 and 389). Then run `npm ci` again, then the lock gate: `git diff d5b353d -- package-lock.json`.
   - Expected additions (absent from the d5b353d lock; section 7): `@nestjs/core`, `@nestjs/common`, `@nestjs/serve-static` and `@nestjs/platform-express` at 12.x; `express` and the other transitive entries of these packages; `unplugin-swc` and `@swc/core` with its optional platform packages.
   - Already present, versions must not change: `reflect-metadata`, `rxjs`, `zod`, `@types/node`, `tslib`.
   - The `apps/api` workspace entry gains its `dependencies` and `devDependencies`. The root entry (keyed by an empty string) does not change, because the root `package.json` is not edited.
   - No existing package changes `version`, `resolved` or `integrity`; changes to the `dev` flag are allowed (DECISIONS line 392, item 7). Any other change stops the step.
   - Then `npm ls vitest` (one copy, 5.1.0), `npm ls @nestjs/core @nestjs/common` (one copy each, 12.x) and `npm ls express` (one copy).
4. Edit `apps/api/tsconfig.json` and create `apps/api/tsconfig.build.json`.
5. Create `build-info.ts`, `compose-version.ts`, `boot/boot-error.ts` and `boot/env.ts`.
6. Create `boot/app-state.ts` and `boot/stdout-logger.ts`.
7. Create `platform.module.ts`, `health.controller.ts` and `version.controller.ts`.
8. Create `app.module.ts`. Its `ServeStaticModule.forRoot` exclude list uses `HEALTHZ_ROUTE` and `EVENTS_ROUTE` from contracts, not string literals.
9. Create `bootstrap.ts` and `main.ts`. Delete `apps/api/src/.gitkeep`.
10. Run `npm run build -w @bbartolome/scriba-api`. Check that `apps/api/dist/main.js` exists, contains `require(`, and has no top-level `import` statement (CommonJS emitted).
11. Create `vitest.config.mts`, `test/create-test-app.ts`, `test/sse.ts` and `test/fixtures/static/index.html`.
12. Create `test/create-test-app.test.ts` (AC 5) and run it with `npx vitest run test/create-test-app.test.ts` in `apps/api`. It does not verify A2: no PLT-04 class has a constructor parameter typed with a class.
13. Create `healthz-version.test.ts` (AC 1), `static-fallback.test.ts` (AC 2), `env-boot.test.ts` (AC 3) and `app-state.test.ts` (AC 4). Do not run them yet.
14. **Format.** Run `npx prettier --write` on every new or edited file under `apps/api`: `package.json`, both tsconfig files, `vitest.config.mts`, every file under `src/` and `test/`, and `test/fixtures/static/index.html`. Then `npx prettier --check apps/api` must pass. `apps/api/dist` is not formatted (A4).
15. Run `npm test -w @bbartolome/scriba-api`. All six test files pass (`smoke.test.ts` included), and the output shows six passing tests and none skipped.
16. Mutation checks, one at a time, each reverted after its run. Each runs with `npm test -w @bbartolome/scriba-api`, which rebuilds `dist/` first, so the spawned children of AC 3 and AC 4 run the mutated build. Each mutation must keep the build type-correct: a mutation that fails `tsc` stops at the build before vitest runs, so it tests nothing (found when the code ran this step). (a) in `health.controller.ts`, replace `BUILD_INFO.version` with the string `'0.0.0-mutant'`: AC 1 fails. (The `status` literal is not used: `'up'` is not a `Healthz` status, so `tsc` rejects it.) (b) in `app.module.ts`, remove `/api{/*rest}` from the exclude list: AC 2 fails on `/api/platform/nope`. (c) in `boot/env.ts`, append `.catch('info')` to the `logLevel` rule: an invalid value falls back to `info` with no error, so AC 3 fails. The fallback is a `LogLevelName`, so `tsc` accepts it. (d) in `boot/app-state.ts`, drop the `, GID <gid>` part of the message: AC 4 fails on the exact line. (e) in `create-test-app.ts`, listen on 8080: AC 5 fails. Record each result.
17. Lint: `npm run lint -w @bbartolome/scriba-api`. This is where open point 4 is checked. Record the result.
18. Root gate, from the repo root: `npm run build`, `npm test`, `npm run lint`. Record `node -v` and `npm -v` with the results. Prettier must skip `apps/api/dist` (A4).
19. Smoke check, not an acceptance test: start `node apps/api/dist/main.js` with the base env of `createTestApp`, run `curl -s 127.0.0.1:8080/healthz`, then send SIGTERM. The process must exit 0, which bullet 11's `useProcessExit` option gives. Without the option it would end by signal instead.
20. Check `git status`: only the paths of section 2 change. Do not commit; the driver commits.

## 4. Acceptance criteria and tests

The criterion text is the checklist line of the unit (lines 35 to 39). Each test seam is named. Pass conditions use the exact labelled forms. Each test file holds one `it`; the AC 4 `it` runs the child twice. The child env of AC 3 and AC 4 holds only the `SCRIBA_*` names that the test sets, and nothing copied from `process.env`.

**AC 1 — `GET /healthz` returns `{status:'ok', version}` with 200; `GET /api/platform/version` returns the version-info shape.** Test: `healthz-version.test.ts`, via `createTestApp` with the fixture static root.
- `GET /healthz`: status 200; `content-type` starts with `application/json`; body `toEqual({status: 'ok', version: '0.0.0-dev'})`.
- `GET /api/platform/version`: status 200; `Object.keys(body).sort()` `toEqual(['builtAt', 'composeVersion', 'revision', 'version'])`; `versionInfoSchema.parse(body)` does not throw (imported from `@bbartolome/scriba-contracts/platform`); `body.version` is `0.0.0-dev`; `Number.isInteger(body.composeVersion)`.
- Mutation (16a).

**AC 2 — A non-API path returns `index.html` (tested with a fixture static dir).** Test: `static-fallback.test.ts`, via `createTestApp` with `staticRoot` set to `resolve(__dirname, 'fixtures/static')` (DECISIONS line 400, item 6: resolved from `__dirname`, not the repo root).
- `GET /` and `GET /deep/link/x`: status 200; `content-type` starts with `text/html`; body bytes equal the bytes of `fixtures/static/index.html` (`Buffer.equals`).
- `GET /api/platform/nope`: status 404, and its body bytes are not the index bytes. This shows the exclude list works.
- Mutation (16b).

**AC 3 — An invalid `SCRIBA_*` value makes boot exit non-zero with a readable message naming the variable.** Test: `env-boot.test.ts`, spawns `dist/main.js` with `SCRIBA_LOG_LEVEL` set to `loud`, the three dir variables set to temp folders, and a 15000 ms kill timeout.
- Exit code is 1. stdout is empty.
- `stderr.trim()` is exactly `Invalid SCRIBA_LOG_LEVEL "loud": expected one of debug, info, warn, error.`
- No stderr line begins with whitespace followed by `at ` (no stack frames).
- Mutation (16c). Without the check, the child listens and the kill fails the test.

**AC 4 — An unwritable `.scriba/` folder makes the app exit non-zero with a message naming the UID/GID and the path.** Test: `app-state.test.ts`, spawns `dist/main.js` twice.
- Setup: a temp library folder, `chmod` to 0o755 (`mkdtemp` makes 0o700), with `.scriba` inside at mode 0o555. If the runner is root, the child runs with `uid` and `gid` 65534, since root bypasses mode bits. The expected UID and GID are then 65534. Otherwise they are the test process's own.
- Run A: `SCRIBA_LIBRARY` unset. Run B: `SCRIBA_LIBRARY` set to the same library path.
- Both runs: exit code 1; stdout empty; stderr lines contain exactly `Cannot write to the app-state folder <lib>/.scriba as UID <uid>, GID <gid>.`; no stack frames.
- Run B also contains exactly the line `Host path: <lib>/.scriba`. Run A contains no line starting with `Host path`.
- Cleanup: `chmod` `.scriba` back to 0o755, then remove the folder.
- Mutation (16d). AC 3 and AC 4 do not reach any PLT-07 hook, so neither tests a settings migration (DECISIONS line 422).

**AC 5 — A test using `create-test-app` boots against a temp library on an ephemeral port and reads `/healthz`.** Test: `create-test-app.test.ts`, via `createTestApp` with default modules and a `mkdtemp` library.
- `new URL(baseUrl).hostname` is `127.0.0.1`; its port is set and is not `8080`.
- `GET /healthz`: status 200; body `toEqual({status: 'ok', version: '0.0.0-dev'})`.
- `existsSync(join(library, '.scriba'))` is true, so boot ran against the temp library.
- After `close()`, `fetch(baseUrl + '/healthz')` rejects.
- Mutation (16e).

## 5. Downstream agreement

Each downstream unit adds a folder of its own and at most one entry per array in `platform.module.ts`. None edits `main.ts`, `bootstrap.ts` or `app.module.ts`, except that a new feature module adds one line to `COMPOSED_MODULES`. A test that needs Platform's routes passes `modules: [PlatformModule, <test module>]` to `createTestApp`, because `modules` replaces `COMPOSED_MODULES`.

| Unit | May add | Where | Must not |
|---|---|---|---|
| PLT-05 | `APP_FILTER` provider, Zod pipe, module-error helper, a test-only controller | `platform/errors/`; one provider line in `platform.module.ts`; the test controller in its own test file | edit `main.ts`, `bootstrap.ts`, `app.module.ts` or the exclude list. Unknown `/api` routes become `PLATFORM_NOT_FOUND` through the filter, while non-API paths keep the fallback |
| PLT-06 | stream controller on `EVENTS_ROUTE`, publisher exported from `PlatformModule`, echo controller on `ECHO_ROUTE`, backpressure close | `platform/events/`; one entry per array in `platform.module.ts` (a controller array, a provider array and an exports array); may extend `test/sse.ts` | add a shutdown hook outside `beforeApplicationShutdown`; send `id:` lines. `/events` is already excluded from the fallback |
| PLT-07 | settings registration, boot hook, atomic section read and write | `platform/settings/` as a provider with `onApplicationBootstrap`, which runs before listen; one line in `platform.module.ts` | edit `bootstrap.ts`. A newer `schemaVersion` must throw `BootError`, because `main.ts` rethrows other errors (DECISIONS line 408). Reads the books folder through the `SCRIBA_ENV` token, imported from `boot/env.ts` (inside platform) |
| PLT-08 | predicate and `connection` listener | `platform/tailnet/` as a provider with `onApplicationBootstrap`, which takes the server from `HttpAdapterHost` (A1); one line in `platform.module.ts` | edit `bootstrap.ts` (DECISIONS line 422: each of PLT-05 to PLT-08 adds one line) |
| PLT-11 | root `dev` script, `concurrently`, absolute `SCRIBA_BOOKS_DIR`, `SCRIBA_PACKS_DIR` and `SCRIBA_EXAMPLES_DIR`; one option for PLT-11 to choose, not settled here: a `tsc -p tsconfig.build.json --watch` build into `dist/` with `node --watch dist/main.js`; the Angular CommonJS question (`allowedCommonJsDependencies`, DECISIONS 2026-11-11 line 173) and the Angular half of the boot test (unit line 22) | root `package.json`; `apps/api/package.json` (script only) | change any `apps/api/src` file (PLT-04 bullet 4) |
| PLT-14 | overwrites `build-info.ts` from build args before `npm run build` (open point 3); keeps the relative static layout (open point 5) | PLT-14's own Dockerfile and build files | edit other PLT-04 files |
| PLT-15 | the real value of `EXPECTED_COMPOSE_VERSION`; passes `SCRIBA_LIBRARY` only when set, never as an empty string | `deploy/`; `compose-version.ts` | edit `build-info.ts` |

PLT-02 is unchanged: its open point 12 is settled here (bullet 14). PLT-09 is unchanged: its lint must pass on the platform folder (step 17). Unit sources of the rows: PLT-05 Decisions lines 18 to 28; PLT-06 lines 18 to 27; PLT-07 lines 21 to 24; PLT-08 line 18; PLT-11 lines 20 to 22 and 30.

## 6. Open points

1. **CommonJS or ESM for `apps/api` (DECIDED).** Facts: `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` and `@nestjs/serve-static` at major 12 all declare `"type": "module"` (section 7). This plan uses CommonJS, the path the Opus reviews checked (DECISIONS lines 408 and 422). A scratch CommonJS build with TypeScript 6.0.3 under NodeNext compiled and booted on Node v26.13.0 (section 7).
   - Decided: option A (DECISIONS 2026-11-12, open point 1 entry, commit a4ab77a).
   - Option A, CommonJS: the tsconfig of section 2; `__dirname` in `bootstrap.ts` and `create-test-app.ts`; Node loads the ESM-only Nest packages through `require`. PLT-05 to PLT-08 write imports without `.js` suffixes. The Angular-side `allowedCommonJsDependencies` question stays with PLT-11 (DECISIONS line 173).
   - Option B, ESM (rejected): `"type": "module"` in `apps/api/package.json`; NodeNext needs `.js` suffixes on every relative import; `__dirname` is replaced by `fileURLToPath(new URL('../../web/dist/scriba-web/browser', import.meta.url))` in `bootstrap.ts` and `create-test-app.ts`; the Vitest and SWC config changes for ESM. PLT-05 to PLT-08 must write `.js` suffixes and must not use `__dirname`. PLT-11's watch runs `node --watch` on the ESM output. Contracts stays CommonJS; ESM may import it (ASSUMED). The PLT-02 decision is unaffected.
   - The plan stays `draft` until Opus approves this text.
2. **`@nestjs/platform-express` and `express`.** Not named in DECISIONS line 13, which lists core and serve-static. The plan adds `@nestjs/platform-express` at `^12` because `NestFactory.create` needs an HTTP adapter, and serve-static's express loader needs express, which comes with it. Alternative: none workable in this unit, since the app needs an HTTP adapter. Default: add it (section 2). Non-blocking; the Navigator confirms.
3. **Release values for `BUILD_INFO`.** The unit says build args bake `version`, `revision` and `builtAt` into the image (line 25), but not how. Default: PLT-14 overwrites `build-info.ts` from build args before `npm run build`, so no new env name is needed. Alternative: three `SCRIBA_*` variables, which needs a PLT-02 expand-contract change first, because they are not in `/platform`. Owner: PLT-14.
4. **Lint for imports inside one module.** PLT-09's fixtures cover cross-module imports and the contracts import. No fixture shows that a non-entry file of `platform/` may import another file of `platform/`, or that `app.module.ts` may import a platform file. Step 17 checks it. If lint rejects it, stop and record it for the Navigator. Options: (a) the Navigator allows same-module imports in `eslint.config.mjs` (PLT-09's file); (b) the platform folder has fewer files. The rule is not changed silently.
5. **Static layout in the image.** The default `rootPath` assumes `apps/web/dist/scriba-web/browser` sits beside `apps/api/dist` (section 7). Default: PLT-14 keeps that relative layout. Alternative: a new `SCRIBA_*` variable, which is outside `/platform`. Owner: PLT-14.
6. **AC 4 as root.** The uid 65534 run needs the temp root to be enterable by uid 65534. On Linux `/tmp` is mode 1777, so it is. On macOS the per-user temp folder is not (ASSUMED, not run). Default: the test uses the uid 65534 run only when the runner is root, and fails with a clear message if the temp root is not enterable. Non-root runs, such as the dev Mac and the CI runner, do not use that path. When the runner is root, the uid 65534 child must also read the repo: each directory from `/` down to `apps/api/dist` and the repo's `node_modules` must be `o+x`, and every file under `apps/api/dist` must be `o+r`. Before spawning, the test checks these with `stat` and fails with a message naming the first path that fails, so the root case cannot be mistaken for the app-state message. AC 4's root case depends on this check.
7. **SIGTERM has no criterion.** The unit's shutdown bullet has no acceptance criterion, so step 19 checks it by hand. Default: keep it that way. A test would need a new criterion, which this plan does not add.
8. **How the PLT-04 entries reach `package-lock.json` (defined in step 3).** `npm ci` cannot add entries that the lock lacks, so the defined path is one command, `npm install --package-lock-only --ignore-scripts`, run from the root in step 3, followed by `npm ci` and the lock gate. The Navigator confirms the command. The earlier option of a lock edited by the driver is removed.

## 7. Facts checked and facts assumed

Facts checked (command or file):
- Before this redraft, `plans/PLT-04.md` was not in the working tree (`ls plans/`) or on any ref (`git log --all -- plans/PLT-04.md` was empty; `git branch -a` listed `main` only). HEAD at the first draft was `1c71ffa`; it was `a4ab77a` when open point 1 was decided, and `cba83fb` at revision 6 (`git log -1`). `git status` was clean at the start of the first draft.
- Unit file lines 14 to 39; `modules/platform.md` lines 26, 33 to 45, 55 to 59; `units/README.md` lines 125 to 133; DECISIONS lines 13 to 19, 46, 151, 170 to 175, 236 to 242, 270, 294, 301 and 392 to 427.
- Root `package.json`: `scribaPins` is `angular "22"`, `nestjs "12"`, `zod "4"`, `typescript "6.0.3"`; the workspaces are in the PLT-01 order.
- `npm view @nestjs/core@12.4.2 type exports peerDependencies peerDependenciesMeta`: `type` is `module`; exports `./*` to `./*.js`; peers rxjs, `@nestjs/common`, reflect-metadata; optional websockets, microservices, platform-express.
- `npm view @nestjs/common@12.4.2`: `type` is `module`; optional class-validator and class-transformer.
- `npm view @nestjs/platform-express@12.4.2`: `type` is `module`; depends on `express` 5.3.0.
- `npm view @nestjs/serve-static`: 12.1.1 is the latest; `type` is `module`; six peers. `@nestjs/common` and `@nestjs/core` are required (12.x, provided by this plan). `express`, `fastify`, `@fastify/static` and `@nestjs/platform-node` are optional (`peerDependenciesMeta`). Engines `^20.19.0 || ^22.12.0 || >=23.0.0`.
- `npm view @nestjs/core@12 version`: the last entry is 12.4.2. `npm view unplugin-swc@2.0.0 peerDependencies`: `@swc/core` `^1.2.108`. `npm view @types/node@26 version`: the last entry is 26.6.6. `npm view reflect-metadata@0.2 version`: the last entry is 0.2.2.
- `nest-factory.js` line 180 (`@nestjs/core` 12.4.2): `loadAdapter('@nestjs/platform-express', 'HTTP', () => import('@nestjs/platform-express'))`. The adapter loads through `import()` inside `NestFactory.create`, after the env check. `nest-application.js` line 437 says it is deliberately not preloaded. The AC 3 and AC 4 spawns exit before this point.
- `git show d5b353d:package-lock.json`: no entries for `@nestjs/*`, `express`, `unplugin-swc` or `@swc/core`. Present: `reflect-metadata` 0.2.2, `rxjs` 7.8.2, `zod` 4.6.6, `@types/node` 26.6.6, `tslib` 2.9.1. The `apps/api` entry holds only `name` and `version`; the root entry keyed by an empty string holds `name`, `workspaces`, `devDependencies` and `engines`.
- DECISIONS lines 374 and 389 name `npm install --package-lock-only --ignore-scripts` (`sed -n '370,390p' plans/DECISIONS.md`). DECISIONS line 295 is the PLT-09 element-pattern entry (`grep -n 'element patterns' plans/DECISIONS.md`).
- Scratch build outside the repo, in `/tmp/plt04-probe/ts`: TypeScript 6.0.3, `module` and `moduleResolution` NodeNext, `experimentalDecorators` and `emitDecoratorMetadata` true, `types` `["node"]`. A CommonJS file imports `reflect-metadata`, `@nestjs/common` and `@nestjs/core` 12.4.2 and calls `NestFactory.create(..., {abortOnError: false})`. `tsc -p tsconfig.json` exits 0. `node dist/probe.js` on `v26.13.0` prints `booted object` and exits 0, with no warning.
- `@nestjs/common` 12.4.2 (`npm pack` into `/tmp/plt04-probe/pack`): `services/console-logger.service.js` `error` (lines 105 to 110) and `fatal` (lines 143 to 148) call `printMessages(..., 'stderr', ...)`; `printStackTrace` writes to `process.stderr` (lines 424 to 432). The `.d.ts` declares `printMessages`, `printStackTrace` and `getContextAndStackAndMessagesToPrint` as `protected` (lines 217, 276, 297), so a subclass can call them.
- `@nestjs/core` 12.4.2: `nest-application-context.js` lines 159 to 162 (`callDestroyHook`, `callBeforeShutdownHook`, `dispose`, `callShutdownHook`); `nest-factory.js` line 25 (`abortOnError = true`). `enableShutdownHooks(signals = [], options = {})` is at line 207; with `options.useProcessExit`, lines 244 to 249 call `process.exit(0)`, otherwise `process.kill(process.pid, signal)`. Checked in the packed source under `/tmp/plt04-probe/pack/nestjs-core-12.4.2/package` with `sed -n '207,212p' nest-application-context.js`; an empty `signals` falls back to all `ShutdownSignal` values.
- `@nestjs/serve-static` 12.1.1: `dist/serve-static.constants.js` (`DEFAULT_EXPRESS_RENDER_PATH = '{*any}'`); `loaders/express.loader.js` lines 27 to 72 (the render function sends the index file when the route is not excluded, and calls `next()` when it is); `utils/is-route-excluded.util.js` (path-to-regexp).
- path-to-regexp 8.4.2 (scratch): with `['/api{/*rest}', '/healthz', '/events']` as the exclude list, `/api`, `/api/platform/version`, `/api/platform/nope`, `/healthz` and `/events` are excluded; `/`, `/deep/link` and `/apiary` are not.
- `@angular/build` 22.2.5 (`npm pack` into `/tmp/plt04-probe/ng`): `src/builders/application/options.js` line 166 sets the default `outputPath` to `<workspaceRoot>/dist/<projectName>`, and line 168 sets the browser folder to `browser`. `apps/web/angular.json` has no `outputPath`, and its project is `scriba-web`.
- `apps/api/package.json` has no dependencies and the scripts `build` (`tsc --noEmit -p tsconfig.json`), `test` (`vitest run`) and `lint` (`eslint .`). `apps/api/tsconfig.json` extends the base and includes `src` and `test`. `apps/api/src/.gitkeep` and `apps/api/test/smoke.test.ts` exist.
- `packages/contracts/package.json`: `test` is `npm run build && vitest run`. `tsconfig.json` has `types` `["node"]`. `src/platform/env.ts` has the defaults and the PLT-04 parse comment; `http.ts` has the routes and schemas; `events.ts` has `EVENTS_ROUTE`.
- `eslint.config.mjs`: the API element is `src/modules/*`; the entry is `**/src/modules/*/*.module.ts`; rules R1 and R2 are set. `lint-fixtures/apps/api/src/modules/agent-loop/ok-contracts.ts` imports `@bbartolome/scriba-contracts/agent-loop`. No fixture imports within one module.
- `.github/workflows/ci.yml`: `ubuntu-latest`; `npm ci`, `npm run lint`, `npm test`, `npm run build`; Node from `.nvmrc`.
- `.prettierignore` lists `/units/`, `/modules/`, `/plans/`, `/package-lock.json`. `.gitignore` lists `dist/`.
- Local runtime: `node -v` gives `v26.13.0`; `npm -v` gives `11.20.0`.

Facts assumed (ASSUMED):
- A1. `httpAdapter.getHttpServer()` is available in `onApplicationBootstrap` (PLT-08 relies on it). Checked by PLT-08's tests.
- A2. The `unplugin-swc` 2.x default options emit decorator metadata under Vitest 5.1.0. ASSUMED: step 12 does not verify it, because no PLT-04 class has a constructor parameter typed with a class. PLT-05 to PLT-08 check it when they inject a class.
- A3. `fs.accessSync(dir, W_OK)` fails with EACCES for a 0o555 folder owned by the test user, and for uid 65534 under root. POSIX behaviour; checked by AC 4.
- A4. Prettier 3 reads `.gitignore` by default, so root `prettier --check .` skips `apps/api/dist`. Checked by step 18.
- A5. The Angular output for `scriba-web` is `apps/web/dist/scriba-web/browser`, since the workspace root is the folder holding `angular.json` (the `.angular/cache` path in `apps/web` agrees).
- A6. Nest's routing answers an excluded GET (for example `/api/...`) with its own 404. Checked by AC 2.
- A7. `@nestjs/serve-static` loads through `require` on Node 26. Checked by the AC 3 and AC 4 spawns, which load `dist/main.js`, and so `bootstrap.ts`, `app.module.ts`, `@nestjs/core` and `@nestjs/common`, before the env check. Not run in the scratch build. `@nestjs/platform-express` is not loaded by those spawns: `NestFactory.create` loads it with `import()` after the env check (section 7). Step 19 (smoke) covers it, and so does AC 1, which calls `NestFactory.create` through `createTestApp`.
- A8. `@swc/core` 1.x satisfies the `unplugin-swc` 2.0.0 peer. Checked by the peer resolution of the step 3 lock command and the `npm ci` after it.
- A9. The reviewers' claims in DECISIONS (Vitest 5.1.0 injects `__dirname`; TypeScript 6.0.3 accepts the decorator options) are reported here, not re-run. Step 12 checks the Vitest part.

Not verified:
- Lint of imports inside one module (open point 4).
- The real `apps/api` tsconfig and the platform files: only the scratch probe has run.
- Any behaviour of the real modules and any mutation result: none has run yet.
