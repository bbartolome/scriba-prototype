---
id: PLT-06
status: planned
---
# PLT-06 plan — `/events` stream, publisher, hello, heartbeat, echo and backpressure

Batch: [PLT-05, PLT-06, PLT-07, PLT-08] (Platform, phase:scaffold, M1); this plan is PLT-06 only. Revision 2.

Read at `main` HEAD `bd95da8`. Sources: `units/PLT-06-sse-stream-publisher.md`, `units/README.md`, `modules/platform.md`, `plans/DECISIONS.md`, `plans/PLT-04.md`, and the committed code and contracts. Section 7 lists what was checked and what is assumed. Nothing here has been run.

## 1. Decisions this plan follows

| # | Decision | Source |
|---|---|---|
| 1 | One multiplexed `GET /events`, `text/event-stream`. Commands are POSTs; nothing on the stream is a command. | unit line 18 |
| 2 | Envelope `{module, type, data}`: `sseEnvelopeSchema`, members `helloDataSchema` and `echoDataSchema`, union `platformEventSchema`. `module` is in `PUBLISHING_MODULE_SLUGS`, which includes `platform`. | unit line 19; `packages/contracts/src/platform/events.ts`, `slugs.ts` |
| 3 | Every message is unnamed: one `data:` line holding the JSON envelope, then a blank line. No `event:` line. `retry: 3000` (`SSE_RETRY_MS`) comes first, in the first block, before hello. Comment heartbeat `: heartbeat` every `SSE_HEARTBEAT_MS` (15000). Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, no compression. | unit lines 20, 36; contract constants |
| 4 | No `id:` lines and no replay. Reconnecting clients reconcile through state endpoints. | unit lines 21, 38; `modules/platform.md` "No SSE replay" |
| 5 | Fan-out: each envelope goes to every open stream. | unit line 22 |
| 6 | Backpressure: after each write, a stream whose `res.writableLength` is over the limit is destroyed and removed. Default limit 1 MiB (1048576). The unit names no number, so the plan picks one. | unit line 23; choice |
| 7 | Hello is written first, in the same synchronous step that registers the stream: `{module:'platform', type:'hello', data:{streamId, version, serverTime}}`. `streamId` is `randomUUID()`, `version` is `BUILD_INFO.version`, `serverTime` is `new Date().toISOString()`. | unit line 24; `helloDataSchema`; PLT-04 section 1 item 9 |
| 8 | Echo: `POST /api/platform/echo` (`ECHO_ROUTE`) takes `{count, intervalMs}`, answers `202` with an empty body, and emits `seq` 1 to count: the first at once, then one every `intervalMs`. With `intervalMs` 0 it waits with `setImmediate`, because `setTimeout` clamps to 1 ms. No consumer fixes the status: PLT-16 ST-2 and PLT-11's demo need timed delivery only. | unit line 24; contract; choice |
| 9 | Echo body: `echoRequestSchema.parse(body)` inline. A `ZodError` is left to PLT-05's filter. No criterion covers it (open point 2). | choice |
| 10 | Shutdown: `beforeApplicationShutdown()` on the publisher marks it stopping and destroys every stream. It destroys, not ends, so a stalled client cannot hold `server.close()`. The echo emitter stops once stopping. No other shutdown hook. | unit line 26; PLT-04 section 1 item 11 and section 7 |
| 11 | No guard now. Setup & auth adds one later. | unit line 25; `units/SAU-04-global-guard.md` line 26 |
| 12 | `/events` is already excluded from the static fallback. | `apps/api/src/app.module.ts` line 35; PLT-04 section 1 item 2 |
| 13 | The publisher is exported from `PlatformModule` by DI. Other modules import it from `platform.module.ts` only. | unit line 27; PLT-04 section 1 item 4 |
| 14 | CommonJS; relative imports have no `.js` suffix. | PLT-04 section 1 item 15 (PLT-04 open point 1, decided) |
| 15 | Tests: external behaviour only, Vitest, `createTestApp`, one `it` per file. The heartbeat test uses fake timers (`toFake: ['setInterval', 'clearInterval']`). The backpressure test uses a test-only global module that lowers the limit. | `units/README.md` line 133; unit line 35 allows fake timers; choice |
| 16 | No compression middleware is added, and none exists in `apps/api/package.json`. | unit line 36; `apps/api/package.json` |

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/platform/events/events.tuning.ts` | new | Symbol token `WRITE_BUFFER_LIMIT_BYTES` (optional injection) and `DEFAULT_WRITE_BUFFER_LIMIT_BYTES = 1048576` |
| `apps/api/src/modules/platform/events/events.publisher.ts` | new | `EventsPublisher`: stream set, `subscribe(res)`, `publish(envelope)`, heartbeat, backpressure, `stopping`, `beforeApplicationShutdown()` |
| `apps/api/src/modules/platform/events/events.controller.ts` | new | `EventsController`: `GET EVENTS_ROUTE` |
| `apps/api/src/modules/platform/events/echo.controller.ts` | new | `EchoController`: `POST ECHO_ROUTE`, `@HttpCode(202)`, and the emitter |
| `apps/api/src/modules/platform/platform.module.ts` | edit | `controllers` gains `EventsController` and `EchoController`; `providers` becomes `[EventsPublisher]`; `exports` becomes `[EventsPublisher]`; a re-export line `export { EventsPublisher } from './events/events.publisher';` sits beside the `SCRIBA_ENV` one |
| `apps/api/test/sse.ts` | edit | add `openSse(url, headers?)` (returns `response`, `next(timeoutMs)`, `cancel()`) and `dataOf(block)`. `readSse` is unchanged |
| `apps/api/test/events-write-limit.ts` | new | `@Global()` module providing `WRITE_BUFFER_LIMIT_BYTES` = 262144 (256 KiB) |
| `apps/api/test/events-hello.test.ts` | new | AC 1 |
| `apps/api/test/events-echo.test.ts` | new | AC 2 |
| `apps/api/test/events-heartbeat.test.ts` | new | AC 3 |
| `apps/api/test/events-headers.test.ts` | new | AC 4 |
| `apps/api/test/events-backpressure.test.ts` | new | AC 5 |
| `apps/api/test/events-no-id.test.ts` | new | AC 6 |
| `apps/api/test/events-envelope.test.ts` | new | AC 7 |

Not changed: `main.ts`, `bootstrap.ts`, `app.module.ts`, `test/create-test-app.ts`, every `package.json`, `package-lock.json`, `apps/web`, `packages/contracts`. No dependency is added: `node:http`, `node:crypto`, Nest, Zod and Vitest are already in use. The publisher types the response as `ServerResponse` from `node:http`, not as an express type, because `apps/api` has no `@types/express`.

Shapes (a sketch, not final code):

```ts
// events.tuning.ts
export const WRITE_BUFFER_LIMIT_BYTES = Symbol('WRITE_BUFFER_LIMIT_BYTES');
export const DEFAULT_WRITE_BUFFER_LIMIT_BYTES = 1024 * 1024;

// events.publisher.ts
@Injectable()
export class EventsPublisher implements BeforeApplicationShutdown {
  constructor(@Optional() @Inject(WRITE_BUFFER_LIMIT_BYTES) limit?: number) {}
  subscribe(res: ServerResponse): void;  // writes `retry` and hello, then registers the stream
  publish(envelope: SseEnvelope): void;  // one `data:` block per stream; no-op when stopping
  get stopping(): boolean;
  beforeApplicationShutdown(): void;
}
```

Block forms: `retry: 3000\ndata: <hello>\n\n`, `data: <envelope>\n\n`, `: heartbeat\n\n`.

A module publishes by injecting the class from the platform entry file. The envelope is typed by the module's own slice, and the publisher adds no validation:

```ts
import { EventsPublisher } from '../platform/platform.module'; // entry file only
publisher.publish({ module: 'project-store', type: 'pending-created', data: { /* the slice's shape */ } });
```

`helloDataSchema`, `echoDataSchema` and the envelope schemas come from `@bbartolome/scriba-contracts/platform`, and the tests parse the blocks with them.

`platform.module.ts` after the edit:

```ts
export { SCRIBA_ENV, type ScribaEnv } from './boot/env';            // existing
export { EventsPublisher } from './events/events.publisher';        // new
@Module({
  controllers: [HealthController, VersionController, EventsController, EchoController],
  providers: [EventsPublisher],
  exports: [EventsPublisher],
})
```

## 3. Method

1. **Check the base.** `git diff --quiet bd95da8 -- apps/api packages/contracts/src/platform` exits 0. This checks tracked files only: the clone has untracked files in `plans/` from other units, which are not part of this change. Then confirm the code this plan reads: `grep -n EVENTS_ROUTE apps/api/src/app.module.ts` finds the exclude; `platform.module.ts` has `providers: []` and two controllers; `events.ts` exports `ECHO_ROUTE`, `SSE_RETRY_MS` and `SSE_HEARTBEAT_MS`. Any mismatch stops the run and is recorded for the Navigator.
2. **Install and build**, as PLT-04 step 1: `npm ci` at the root, then `npm run build -w @bbartolome/scriba-contracts`. Record `node -v` and `npm -v`. No dependency is added, so the lock does not change.
3. Create `events/events.tuning.ts` (section 2).
4. Create `events/events.publisher.ts`. `subscribe` writes `retry: ${SSE_RETRY_MS}\n` and the hello block, then adds the stream to the set, in one synchronous step. `send(res, block)` writes, then destroys and removes the stream if `res.writableLength` is over the limit. Each response also gets an `'error'` listener that removes the stream, so a write after the client has gone cannot crash the process. Each stream gets `setInterval(() => send(res, ': heartbeat\n\n'), SSE_HEARTBEAT_MS)`, cleared on `'close'`. `publish` loops over a copy of the set, skips destroyed streams, and does nothing when stopping. `beforeApplicationShutdown` sets stopping, destroys every stream and clears the intervals.
5. Create `events/events.controller.ts`, mirroring `health.controller.ts`: `@Controller()`, `@Get(EVENTS_ROUTE)`, with `@Res()` so Nest writes no response of its own. It calls `res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform'})`, then `subscribe(res)`, and returns nothing.
6. Create `events/echo.controller.ts`: `@Post(ECHO_ROUTE)`, `@HttpCode(202)`, `echoRequestSchema.parse(body)`, then `void this.emit(request)`. `emit` publishes each echo with `sentAt: new Date().toISOString()`, stops when `publisher.stopping`, and waits between messages as decision 8 says.
7. Edit `platform.module.ts` (section 2).
8. Edit `test/sse.ts`: add `openSse` and `dataOf`. `openSse` buffers chunks, splits on a blank line, and returns each block without its trailing blank line. `next(timeoutMs)` rejects on timeout. `createTestApp().sse` stays as it is, since it already reads the real stream (PLT-04 section 1 item 19).
9. Create `test/events-write-limit.ts`.
10. Run `npm run build -w @bbartolome/scriba-api`. Its `tsc --noEmit -p tsconfig.json` covers `test/`, so the new test files must type-check too. Check that `apps/api/dist/main.js` still contains `require(`.
11. Create the seven test files (section 4). Run each with `npx vitest run test/<file>` in `apps/api`.
12. Format: `npx prettier --write` on the new and edited files under `apps/api/src` and `apps/api/test`, then `npx prettier --check apps/api`. `apps/api/dist` is git-ignored and is not formatted (PLT-04 section 7, A4).
13. Run `npm test -w @bbartolome/scriba-api`. Expected: 13 test files and 13 tests (PLT-04's six, smoke included, plus seven), none skipped. This also checks PLT-04 A2 (decorator metadata), because `EchoController` takes `EventsPublisher` by class. If AC 3 or AC 5 hangs, the likely causes are a stream that `beforeApplicationShutdown` did not close (A1), or a fake timer that also caught an I/O timer (A3). Check those before changing a test.
14. Mutation checks (section 4), one at a time. Each runs `npm test -w @bbartolome/scriba-api`, must pass `npm run build` (type-correct), and must fail the named test. Revert after each run; `git diff --stat` then lists only section 2 paths.
15. Lint: `npm run lint -w @bbartolome/scriba-api`. Record the result. This also checks the same-folder imports from `events/` to `../build-info` (section 7).
16. Root gate: `npm run build`, `npm test` and `npm run lint` from the root. The root `lint` script ends with `prettier --check .`, so the new files must already be formatted. Record the results and versions.
17. Manual check, not an acceptance test (the unit has no shutdown criterion; PLT-04 open point 7): run `node apps/api/dist/main.js` with the `createTestApp` base env (library, packs and examples in temp folders, `SCRIBA_LOG_LEVEL=error`). `curl -N 127.0.0.1:8080/events` shows `retry: 3000` and hello. A POST of `{"count":3,"intervalMs":500}` to `/api/platform/echo` streams three echoes. SIGTERM ends the curl and the process exits 0.
18. Check `git status`: only the section 2 paths changed. Do not commit.

## 4. Acceptance criteria and tests

Checklist, verbatim from unit lines 33 to 39:

- [ ] A client on `/events` gets `platform/hello` first, preceded by `retry: 3000`.
- [ ] `POST /api/platform/echo {count:3, intervalMs:50}` delivers three `platform/echo` envelopes in `seq` order to **each of two** open streams.
- [ ] A heartbeat comment arrives at least every 15 s (fake timers or a configurable interval in test).
- [ ] Responses carry `Cache-Control: no-cache, no-transform` and no `Content-Encoding`.
- [ ] A stream whose client stops reading is closed once the buffer limit is passed; other streams keep receiving.
- [ ] No `id:` lines are ever sent.
- [ ] Every message validates against the `/platform` envelope schema.

Each test is one `it` through `createTestApp`, with the default modules and a fixture static root as in `healthz-version.test.ts`. AC 5 passes its own modules. Read deadlines are 2 s unless stated. `PlatformModule` is imported from `../src/modules/platform/platform.module`.

| AC | Test file | Seam | Mutation that must fail it |
|---|---|---|---|
| 1 | `events-hello.test.ts` | none | (a) drop the `retry` line |
| 2 | `events-echo.test.ts` | none | (b) write to one stream only |
| 3 | `events-heartbeat.test.ts` | fake `setInterval` | (c) interval 30000 ms |
| 4 | `events-headers.test.ts` | none | (d) `Cache-Control: no-cache` |
| 5 | `events-backpressure.test.ts` | `WriteLimitModule`, 256 KiB | (e) no `destroy()` |
| 6 | `events-no-id.test.ts` | none | (f) `id:` prefix |
| 7 | `events-envelope.test.ts` | none | (g) `sentAt` not a date |

**AC 1 (hello first, after `retry: 3000`) — `events-hello.test.ts`.** Open `/events`. The first block starts with `retry: 3000\ndata: `, has no other line, and its JSON parses with `platformEventSchema`. Its `type` is `hello`, `data.version` is `0.0.0-dev`, `data.streamId` is a non-empty string, and `data.serverTime` is an ISO string. Mutation (a): delete `retry: ${SSE_RETRY_MS}\n` in `subscribe`. The first block then starts with `data:`, and the test fails.

**AC 2 (fan-out, seq order, two streams) — `events-echo.test.ts`.** Open streams A and B and read hello on each. `POST /api/platform/echo {count:3, intervalMs:50}` returns 202. On each stream, read three blocks. Each block is exactly one `data:` line with no `event:` line. The parsed `seq` values are `[1,2,3]`, `module` is `platform` and `type` is `echo`. Mutation (b): in `publish`, write only to the first stream of `[...this.streams].slice(0, 1)`. Stream B then times out.

**AC 3 (heartbeat at least every 15 s) — `events-heartbeat.test.ts`.** After `createTestApp()` and before the GET, call `vi.useFakeTimers({toFake: ['setInterval', 'clearInterval']})`. Open `/events` and read hello. Call `vi.advanceTimersByTime(15000)`. The next block is exactly `: heartbeat`. Repeat the advance once and expect a second `: heartbeat`. Read deadlines use the real `setTimeout`, which is not faked. `vi.useRealTimers()` runs in `finally`, before `close()`. Mutation (c): the heartbeat interval is `30000` instead of `SSE_HEARTBEAT_MS`. No block arrives within 2 s, and the test fails.

**AC 4 (cache headers, no encoding) — `events-headers.test.ts`.** `fetch` `/events` with `accept: text/event-stream` and `accept-encoding: gzip, deflate, br`. `cache-control` is exactly `no-cache, no-transform`. `content-encoding` is `null`. `content-type` starts with `text/event-stream`. Cancel the body. Mutation (d): the `Cache-Control` value is `no-cache`.

**AC 5 (slow stream closed, others keep receiving) — `events-backpressure.test.ts`.** This test is the slow one, and its own deadlines add up to 30 s, so its `it` takes a 40000 ms timeout; the config's `testTimeout` is 20000 ms (PLT-04 section 1 item 17). Use `createTestApp({modules: [PlatformModule, WriteLimitModule]})`, which lowers the limit to 256 KiB. Stalled client S: `fetch` `/events` and never read the body. Healthy client H: `openSse`, read hello, then run a background loop that collects echo `seq` values with `next(20000)`. `POST {count: 100000, intervalMs: 0}`. Wait until H has 100000 echoes (20 s deadline). Drain S to `done` or an error, under a 10 s deadline, and count the `"type":"echo"` occurrences in the drained text. Assert the count is below 100000. Then `POST {count: 1, intervalMs: 0}` and assert H's `seq` list is `1..100000` followed by `1`. Cancel H and S before `close()`. If S still receives all 100000 (A4), raise N, never the limit. Mutation (e): in `send`, replace `res.destroy()` with `void res;`. S then receives everything, and the `below 100000` assertion fails.

**AC 6 (no `id:` lines) — `events-no-id.test.ts`.** Open, read hello, `POST {count:3, intervalMs:0}`, and read three echo blocks. Split each received block into lines. No line starts with `id:`. Mutation (f): `publish` prefixes each block with `id: 1\n`.

**AC 7 (every message validates) — `events-envelope.test.ts`.** Open, read hello, `POST {count:3, intervalMs:0}`, and read three echo blocks. Pass each `data:` line to `platformEventSchema.parse`. Four messages validate: hello and three echoes. Mutation (g): in `emit`, set `sentAt: 'not-a-date'`. `parse` throws on the first echo.

The mutations keep the build type-correct: (a) deletes a template piece; (b) uses a slice of the set; (c) and (d) use literals of the field's type; (e) is a `void` expression; (f) is string concatenation; (g) is a string where `sentAt` is a `string`.

## 5. Agreement with downstream units

| Unit | May add or edit | Must not |
|---|---|---|
| PLT-05 | `platform/errors/`: `APP_FILTER`, the Zod pipe, the module-error helper; one entry per array in `platform.module.ts`; its test controller in its own test file | Edit `events/`, `test/sse.ts` or the three shared boot files. Write a response to a stream whose headers were already sent: the filter must skip those |
| PLT-07 | `platform/settings/`: a provider with `onApplicationBootstrap`; one entry per array in `platform.module.ts`; its own test files | Edit `events/`. Add a shutdown hook outside `beforeApplicationShutdown` |
| PLT-08 | `platform/tailnet/`: a provider with `onApplicationBootstrap`, taking the server from `HttpAdapterHost`; one entry per array in `platform.module.ts` | Edit `events/`. A dropped Tailscale peer never reaches `/events`, so PLT-06 needs no change |
| PLT-11 | The root `dev` script, `concurrently`, and a script line in `apps/api/package.json` (PLT-04 section 5) | Change any `events/` file or `test/sse.ts`. PLT-06 sends no header beyond the criteria. Unbuffered `/events` through the Angular proxy is PLT-11's check (its AC 1); `apps/web/proxy.conf.json` maps `/events` to 8080, and PLT-03 line 26 requires no buffering. PLT-06 does not add `X-Accel-Buffering` |

No two units edit the same file, with one exception: `platform.module.ts` is edited by PLT-05, PLT-06, PLT-07 and PLT-08. DECISIONS line 426 and PLT-04 section 5 accept this, but it breaks the batch rule, so it is open point 1. Every other path in section 2 belongs to PLT-06 alone.

## 6. Open points

1. **`platform.module.ts` is shared.** PLT-05, PLT-06, PLT-07 and PLT-08 each add entries to its arrays, which breaks "no two units edit the same file". Options: (A) keep the shared file: each unit adds its own entries, and the batch collection merges them in the order PLT-05, PLT-06, PLT-07, PLT-08, resolving array conflicts by hand; (B) one unit owns the file for the batch, and the others rebase onto it. DECIDED: option A (revision 2, by the coordinator). Reason: PLT-04 section 5 and DECISIONS line 426 already accept the shared file, and batch collection resolves array conflicts.
2. **Echo body validation.** Default: inline `echoRequestSchema.parse` (decision 9), so PLT-06 does not wait for PLT-05. Option B: use PLT-05's pipe after PLT-05 merges, which makes PLT-06 depend on PLT-05 and breaks the parallel rule. A bad body becomes 400 `PLATFORM_VALIDATION_FAILED` once PLT-05 maps `z.ZodError` (PLT-05 revision 3, decision 4). Until then, Nest's default 500 applies. DECIDED: option A (revision 2, by the coordinator). Reason: PLT-06 stays parallel with PLT-05 and does not depend on it.
3. **Echo `count` cap.** `echoRequestSchema.count` has no maximum (`events.ts`), so one POST can run a very long emission. Options: (A) no cap, contract unchanged (default; a cap in the published contract needs expand–contract under PLT-02); (B) a handler-side cap that is not in the contract. The guard arrives later with Setup & auth (SAU-04). DECIDED: option A (revision 2, by the coordinator). Reason: no cap, and the contract stays unchanged; a cap would need expand–contract under PLT-02.

## 7. Facts checked and assumed

Checked (file or command):

- Git: branch `main`; HEAD `bd95da8`; `git diff --quiet bd95da8 -- apps/api packages/contracts/src/platform` is the base check. The clone has untracked plan files from other units (`plans/PLT-05.md`, `plans/PLT-07.md`, `plans/PLT-08.md`), which are not part of this plan.
- Unit lines 14 to 39 (criteria at 33 to 39, copied in section 4); `units/README.md` lines 128 and 133; `modules/platform.md` lines 18 to 27 and 33 to 40.
- `plans/DECISIONS.md`: `grep -n PLT-06` gives lines 236, 410, 426 and 479. Line 426 says PLT-05 and PLT-06 edit `platform.module.ts`. Line 410 mentions the shutdown order. DECISIONS does not name `beforeApplicationShutdown`; the name is in PLT-04 section 1 item 11 and section 7.
- `packages/contracts/src/platform/events.ts`: `EVENTS_ROUTE`, `ECHO_ROUTE`, `SSE_RETRY_MS` (3000), `SSE_HEARTBEAT_MS` (15000), `sseEnvelopeSchema`, `helloDataSchema`, `echoDataSchema` (`seq` min 1, `sentAt` ISO), `echoRequestSchema` (`count` min 1 with no maximum, `intervalMs` min 0), `platformEventSchema`. `slugs.ts`: `platform` is in `PUBLISHING_MODULE_SLUGS`. `http.ts`: `HEALTHZ_ROUTE`, `VERSION_ROUTE`.
- `apps/api/src/app.module.ts` line 35: the exclude list holds `/api{/*rest}`, `HEALTHZ_ROUTE` and `EVENTS_ROUTE`.
- `apps/api/src/bootstrap.ts` line 39: `abortOnError: false`. `main.ts` line 7: `enableShutdownHooks([], {useProcessExit: true})`.
- `platform.module.ts` lines 6, 9 and 10: the re-export, `controllers` and `providers`. `health.controller.ts` (the pattern to mirror) and `build-info.ts` (`0.0.0-dev`).
- `test/create-test-app.ts`: `sse` returns `readSse(baseUrl + path)`; `close` calls `app.close()`. `test/sse.ts`: `readSse` yields raw text chunks.
- `apps/api/package.json`: no `@types/express`, no compression package; `@nestjs/platform-express`, `zod`, `@types/node` and `unplugin-swc` are present.
- `apps/web/proxy.conf.json`: `/events` maps to `http://127.0.0.1:8080`. `units/PLT-03-web-bootstrap.md` line 26: SSE must not be buffered.
- `eslint.config.mjs` lines 9 to 110: the element `api-module` is `src/modules/*`; the entry glob is `**/src/modules/*/*.module.ts`; rule R1 allows only entry files across modules. DECISIONS line 456 records a scratch lint in which the imports this plan names passed and only a cross-module import of `boot/env` failed. PLT-04's step 17 result is not recorded, so step 15 confirms it.
- Consumers: PLT-16 line 22 (echo 1 s apart, each within about 250 ms); SHL-01 line 24; SHL-03 lines 18 to 22. None fixes a POST status code.
- Local `node -v` is `v26.13.0`. `node -e` shows `OutgoingMessage.prototype.writableLength` is a getter.
- Local `node -e` against a server: the default `fetch` `accept-encoding` is `gzip, deflate`, and a value the caller sets is sent unchanged.
- `node_modules/vitest` is 5.1.0, and its dist contains `toFake`.
- The root `package.json` `lint` script is `npm run lint --workspaces && prettier --check .`, and its `test` script runs each workspace's `test`. `apps/api/package.json` `build` is `tsc -p tsconfig.build.json && tsc --noEmit -p tsconfig.json`, so the test folder is type-checked by the build.
- The clone's `node_modules` has no `@nestjs` packages, so the Nest facts come from PLT-04 section 7 and were not re-run.

Assumed (ASSUMED):

- A1. `app.close()` runs `beforeApplicationShutdown` before the HTTP server closes (PLT-04 section 7, from the packed `@nestjs/core` 12.4.2). Not re-run here.
- A2. A `@Global()` test module in `modules` supplies the optional limit token. With no provider, the publisher gets `undefined` and uses the default. Checked by AC 5.
- A3. Faking only `setInterval` and `clearInterval` leaves Node's HTTP and undici unaffected. Checked by AC 3. If not, use a seam like AC 5's.
- A4. Loopback kernel buffers hold well under 10 MB, so N = 100000 echoes (about 10 MB) push the stalled stream past 256 KiB. Checked by AC 5.
- A5. `res.writableLength` counts the response's and the socket's unsent bytes. Checked by AC 5.
- A6. `z.iso.datetime()` accepts `Date.prototype.toISOString()` output. Checked by AC 1 and AC 7.
- A7. PLT-04 A2 (decorator metadata under unplugin-swc) is first exercised here, because `EchoController` injects `EventsPublisher` by class. Checked by AC 2 and step 13.
- A8. Same-folder imports from `events/` to `../build-info` pass the boundaries rule. Partly checked by DECISIONS line 456; checked by step 15.

Not verified: the lint result (step 15); every file in section 2 (none is written yet); every mutation result (none has run).
