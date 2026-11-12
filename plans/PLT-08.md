---
id: PLT-08
status: planned
---
# PLT-08 plan — Tailnet-address connection filter

Batch: [PLT-05, PLT-06, PLT-07, PLT-08] (Platform, phase:scaffold, M1); this plan is PLT-08 only. Revision 2.

Written from `units/PLT-08-tailnet-address-filter.md`, `units/README.md`, `modules/platform.md`, `plans/DECISIONS.md`, `plans/PLT-04.md` and the code on `main` at commit bd95da8. Section 7 cites each fact. Nothing was built, tested or installed for this plan.

## 1. Decisions this plan follows

1. **Drop, do not answer.** A connection whose peer is in a Tailscale range is destroyed on the `connection` event, before any request is read. No HTTP response is sent. Source: unit line 18 ("drops connections"). The no-response reading is this plan's choice, as the simplest.
2. **Ranges.** IPv4 `100.64.0.0/10`, IPv6 `fd7a:115c:a1e0::/48`, and the IPv4-mapped IPv6 forms of the IPv4 range. Source: unit line 18; `modules/platform.md` line 35.
3. **Loopback and the Docker gateway pass.** Serve proxies from `127.0.0.1`, and the loopback publish arrives from the Docker gateway (`172.17.0.1` is the address AC 2 uses). Source: unit lines 19 and 26; SAU-18 line 19.
4. **Testing.** The range check is tested as a predicate (criteria 1 and 2). A test checks that the filter is installed on the server's `connection` event, using a fake socket. The loopback criterion uses a real connection. Source: unit line 22 (testing exception); `modules/platform.md` line 57.
5. **Shape.** `platform/tailnet/` holds the predicate file and one provider. The provider implements `onApplicationBootstrap`, takes the server from `HttpAdapterHost`, and is registered by one entry in `platform.module.ts`. The hook runs before `listen`, because `app.init()` runs `onApplicationBootstrap` (PLT-04 section 1 bullet 8). Source: `plans/PLT-04.md` section 5, PLT-08 row. The unit itself names neither `HttpAdapterHost` nor a hook.
6. **No other file changes.** `bootstrap.ts`, `main.ts` and `app.module.ts` stay as they are. Source: `plans/PLT-04.md` section 5; `plans/DECISIONS.md` line 426.
7. **No package change.** The predicate uses `node:net`'s `BlockList`, which is built in. No dependency and no lockfile change. The choice is the simplest option. Checked in section 7.
8. **Setup & auth is separate.** It trusts `Tailscale-User-Login` only from a loopback peer and implements that itself (SAU-18). PLT-08 exports nothing for it. Source: unit line 20; SAU-18 line 19.
9. **Confirmation.** ST-1 (PLT-16) records the peer addresses on both paths. Source: unit line 21; PLT-16 unit line 21.
10. **Why a provider, not `main.ts`.** `main.ts`, `bootstrap.ts` and `app.module.ts` are PLT-04's settled files (item 6). A provider in the platform folder keeps the filter with the platform code, and it runs in the `onApplicationBootstrap` phase, before `listen`. Source: `plans/PLT-04.md` section 1 bullet 4 and section 5.

No settled module decision is changed, so nothing is listed for the Navigator beyond section 6.

## 2. Files to create or change

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/platform/tailnet/tailnet-address.ts` | new | `isTailnetAddress(address: string): boolean`, the predicate. Holds the two ranges |
| `apps/api/src/modules/platform/tailnet/tailnet-filter.ts` | new | `TailnetFilter`: `@Injectable()`, `OnApplicationBootstrap`, injects `HttpAdapterHost`, adds the `connection` listener |
| `apps/api/src/modules/platform/platform.module.ts` | edit | one import line; `providers: []` (line 10) becomes `providers: [TailnetFilter]` |
| `apps/api/test/tailnet-refuses.test.ts` | new | AC 1 |
| `apps/api/test/tailnet-accepts.test.ts` | new | AC 2 |
| `apps/api/test/tailnet-loopback.test.ts` | new | AC 3 |
| `apps/api/test/tailnet-filter.test.ts` | new | the module's "installed on the `connection` event" test. Not a unit criterion |

Not changed: `bootstrap.ts`, `main.ts`, `app.module.ts`, `test/create-test-app.ts`, `test/sse.ts`, every file under `boot/`, every `package.json`, `package-lock.json`, the tsconfig files, `vitest.config.mts`.

Sketch (not final code):

```ts
// tailnet-address.ts
import { BlockList, isIP } from 'node:net';

const TAILNET = new BlockList();
TAILNET.addSubnet('100.64.0.0', 10, 'ipv4');
TAILNET.addSubnet('fd7a:115c:a1e0::', 48, 'ipv6');

export function isTailnetAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  return TAILNET.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

// tailnet-filter.ts
import type { Server } from 'node:http';

@Injectable()
export class TailnetFilter implements OnApplicationBootstrap {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  onApplicationBootstrap(): void {
    const server: Server = this.adapterHost.httpAdapter.getHttpServer();
    server.on('connection', (socket) => {
      if (socket.remoteAddress !== undefined && isTailnetAddress(socket.remoteAddress)) {
        socket.destroy();
      }
    });
  }
}
```

The IPv4-mapped forms need no code: `BlockList` checks `::ffff:100.100.1.1` against the IPv4 rule (section 7).

## 3. Procedure

1. **Check the base.** From the repo root: `git rev-parse --short HEAD` prints `bd95da8`; `git branch --show-current` prints `main`; `git status --short` prints nothing; `git ls-files apps/api/src/modules/platform/tailnet` prints nothing. Then `grep -n "listen(" apps/api/src/main.ts apps/api/test/create-test-app.ts` shows `listen(8080, '0.0.0.0')` and `listen(0, '127.0.0.1')`. If any value differs, stop and report. This plan was written against them.
2. **Build base.** As PLT-04 step 1: `npm ci` from the lock, then `npm run build -w @bbartolome/scriba-contracts`. Record `node -v` and `npm -v`. No package file or lock changes in this unit.
3. **Settle A1 and A2 from source.** After step 2, `node_modules/@nestjs` exists. Read `node_modules/@nestjs/core/helpers/http-adapter-host.js` (expected path; `HttpAdapterHost` is expected to be `@Injectable()` and globally provided, A3) and `node_modules/@nestjs/platform-express/adapters/express-adapter.js` (expected path; `getHttpServer()` should return a Node `http.Server` that exists before `listen`, A1). If the server does not exist before `listen`, stop: section 6 point 3.
4. **Predicate.** Create `apps/api/src/modules/platform/tailnet/tailnet-address.ts` (sketch, section 2). Its two ranges are the only range data in this unit. Tested by section 4 AC 1 and AC 2.
5. **Provider.** Create `apps/api/src/modules/platform/tailnet/tailnet-filter.ts`. Choices: a `remoteAddress` of `undefined` is left alone (the socket is already closed); a matching socket is destroyed with no response; nothing is logged (section 6 point 2).
6. **Platform module.** Edit `apps/api/src/modules/platform/platform.module.ts`: add `import { TailnetFilter } from './tailnet/tailnet-filter';` and change `providers: []` to `providers: [TailnetFilter]`. Same-folder imports are already used (`./health.controller`), and the PLT-04 code passed lint (`plans/DECISIONS.md` line 503).
7. **Tests.** Create the four files of section 4. Each holds one `it`.
8. **Format.** `npx prettier --write` on the three files under `apps/api/src/modules/platform/` and the four test files. Then `npx prettier --check apps/api` must pass.
9. **Test run.** `npm test -w @bbartolome/scriba-api`. It builds first (`tsc` on `src` and `test`), then runs Vitest. Expected: 10 test files pass (PLT-04's six and the four above), 10 tests, none skipped.
10. **Lint.** `npm run lint -w @bbartolome/scriba-api` must exit 0.
11. **Mutation checks.** Apply each edit of section 4 alone, run `npm test -w @bbartolome/scriba-api`, record the failing test, revert by hand. A mutation that fails `tsc` stops at the build and counts as nothing.
12. **Manual socket check** (recorded in the plan and the commit message, not a test). This machine has a `tailscale0` IPv4 address (section 7). Run `node apps/api/dist/main.js` with the base env of PLT-04 step 19 (a temp library). Then `curl -s http://127.0.0.1:8080/healthz` must return `{"status":"ok",...}`, and `curl --interface <tailscale0 IPv4> -s http://127.0.0.1:8080/healthz` must fail with no body. Send SIGTERM. Keep any scratch file in `/tmp`.
13. **Scope check.** `git status --short` shows only the section 2 paths. Do not commit; the driver commits.

## 4. Acceptance criteria and tests

Convention: `isTailnetAddress(a)` returns `true` when the filter refuses `a`. The unit's "refuses" maps to `true`, and "accepts" maps to `false`.

**AC 1** — The predicate refuses `100.64.0.1`, `100.127.255.254`, `::ffff:100.100.1.1` and `fd7a:115c:a1e0::1`.
- Test: `apps/api/test/tailnet-refuses.test.ts`, one `it`. Imports `isTailnetAddress` from `../src/modules/platform/tailnet/tailnet-address`. Expects `true` for each of the four.
- Seam: predicate (the testing exception, unit line 22).

**AC 2** — The predicate accepts `127.0.0.1`, `::1`, `::ffff:127.0.0.1`, `172.17.0.1` and `100.63.255.255` / `100.128.0.0` (range edges).
- Test: `apps/api/test/tailnet-accepts.test.ts`, one `it`. Expects `false` for all six addresses.
- Seam: predicate.

**AC 3** — A real loopback connection to the test app is served.
- Test: `apps/api/test/tailnet-loopback.test.ts`, one `it`. `createTestApp({staticRoot: resolve(__dirname, 'fixtures/static')})`; `fetch(baseUrl + '/healthz')` returns status 200 and `toEqual({status: 'ok', version: '0.0.0-dev'})`; `close()` in `finally`.
- The peer is `127.0.0.1`, because the test app listens on `127.0.0.1` (`create-test-app.ts` line 57). No Tailscale-range address is involved, so the filter must let it through.
- Seam: real socket, external behaviour.

**Module decision, not a unit criterion** — the filter is installed on the server's `connection` event.
- Test: `apps/api/test/tailnet-filter.test.ts`, one `it`. Calls `bootstrap({env, staticRoot: resolve(__dirname, 'fixtures/static')})` from `../src/bootstrap`, with a temp library and the base env of `createTestApp` (`create-test-app.ts` lines 47 to 53), then `listen(0, '127.0.0.1')`.
  1. `server = app.getHttpServer()`. `baseline = http.createServer().listeners('connection')` holds Node's own listener. `added = server.listeners('connection').filter((f) => !baseline.includes(f))`. Expect `added.length` to be at least 1.
  2. For each `added` listener, call it with a fake socket: `Object.assign(new EventEmitter(), {remoteAddress: '100.100.1.1', destroy: vi.fn()})`. Expect `destroy` to have been called. Repeat with `remoteAddress: '127.0.0.1'`; expect `destroy` not to have been called.
  3. `app.close()` in `finally`; the temp library is removed.
- The fake socket is the testing exception at work: it stands in for the one property the filter reads. Real-socket behaviour is checked by step 12 and by ST-1.

**Existing tests keep passing.** PLT-04's tests (AC 1 to AC 5) make their requests from `127.0.0.1`, and `createTestApp` listens there, so the filter lets them through. The spawned AC 3 and AC 4 children exit before `listen` and never accept a connection. Step 9 checks this.

**Mutation checks** (step 11). Each row is one edit, run alone.

| # | Edit | Expected failure | Type-check |
|---|---|---|---|
| a | `tailnet-address.ts`: delete the `addSubnet('fd7a:115c:a1e0::', 48, 'ipv6')` call | AC 1 on `fd7a:115c:a1e0::1` | removes a call |
| b | `tailnet-address.ts`: IPv4 prefix `10` becomes `9` | AC 2 on `100.63.255.255` (true with prefix 9, section 7) | number literal |
| c | `tailnet-address.ts`: first statement `if (address.startsWith('::ffff:')) return false;` | AC 1 on `::ffff:100.100.1.1` | returns a boolean |
| d | `tailnet-filter.ts`: `socket.destroy()` without the `if` | AC 3 (fetch rejects) and the `tailnet-filter` test (loopback stub destroyed). Also fail, as expected: `create-test-app`, `healthz-version` and `static-fallback`, because an unconditional destroy drops every real loopback connection they make (not a defect of the filter) | removes a condition |
| e | `tailnet-filter.ts`: delete the `server.on('connection', …)` statement | the `tailnet-filter` test (no new listener) | `tsconfig.base.json` has no `noUnusedLocals`, so the unused `server` is accepted |

## 5. Agreement with the other units

Each unit below adds files of its own. The shared file is covered in the last paragraph.

| Unit | May add or change | Must not |
|---|---|---|
| PLT-05 | `platform/errors/`; its `APP_FILTER` provider line in `platform.module.ts`; a test-only controller in its own test file | edit `platform/tailnet/`, the four `tailnet-*` tests, `bootstrap.ts`, `main.ts`, `app.module.ts` |
| PLT-06 | `platform/events/`; one entry each in `platform.module.ts`'s `controllers`, `providers` and `exports`; may extend `test/sse.ts` | edit the files of PLT-05 or PLT-08; add `id:` lines |
| PLT-07 | `platform/settings/`; its own entries in `platform.module.ts` (providers, and exports or re-exports if it needs them), one entry per item | edit `bootstrap.ts` |
| PLT-11 | root `package.json`; the `dev` script in `apps/api/package.json`; web files | change any `apps/api/src` file |

PLT-08 adds two source files, four tests, and one import line plus one array entry in `platform.module.ts`. It touches no package file, no lock, no test helper and no PLT-05 to PLT-07 folder.

`platform.module.ts` is edited by PLT-05, PLT-06, PLT-07 and PLT-08. Each unit adds its own entries (providers, controllers, exports, re-exports) to the arrays and export lists, one entry per item. The batch shape prescribes this (`modules/platform.md` line 29; PLT-04 section 5), but it breaks the batch rule "no two units edit the same file". Section 6 point 1 holds this.

PLT-16 (ST-1) only records addresses. Its ADR and compose change are outside `apps/api`.

The filter applies to every connection, so the `/events` stream (PLT-06) and the Setup & auth routes (SAU-04 onward) are filtered too. Nothing in this unit exempts a route. The drop happens at the socket, before any guard runs, so the guard never sees a Tailscale-range peer.

## 6. Open points

1. **Shared `platform.module.ts` versus the no-shared-file rule. Decided: option (A).** `platform.module.ts` is shared. Each unit adds its own entries. Batch order is PLT-05, PLT-06, PLT-07, PLT-08, and array conflicts are resolved at batch collection. Reason: `modules/platform.md` line 29 and PLT-04 section 5 already prescribe the shared file. Option (B), one file per folder, would change PLT-04's file and needs a PLT-04 revision, so it is outside this plan.
2. **Logging dropped peers. Decided: option (A).** Peers in Tailscale ranges are dropped silently, with no log line. Reason: the unit is silent, and silence is the simplest option. A `debug` line per drop, option (B), could flood the log when a scanner hits the port.
3. **If A1 or A2 fails. Decided.** The A1 stop rule stays: no server before `listen` changes PLT-04's boot order (section 1 bullet 8), so stop and list it for the Navigator. The A2 fix is decided: add `@Inject(HttpAdapterHost)` on the constructor parameter of `TailnetFilter`, recorded in the plan and the commit message. Reason: the explicit token needs no config change and does not depend on decorator metadata.

## 7. Facts checked and facts assumed

**Checked** (command or file; commit bd95da8 on `main`):
- Branch and state: `git rev-parse --short HEAD` gives `bd95da8`; `git branch --show-current` gives `main`; `git status --short` is empty.
- `apps/api/src/main.ts` line 8: `await app.listen(8080, '0.0.0.0');`. `apps/api/test/create-test-app.ts` line 57: `await app.listen(0, '127.0.0.1');`.
- `apps/api/src/bootstrap.ts` lines 26 to 51: env parse, `ensureAppState`, `NestFactory.create` with `abortOnError: false`, `app.init()` (lines 43 and 44) with close on failure, then returns the app. It does not listen.
- `apps/api/src/app.module.ts` line 14: `COMPOSED_MODULES = [PlatformModule]`; lines 26 to 40: `buildRootModule`.
- `apps/api/src/modules/platform/platform.module.ts`: line 6 re-exports `SCRIBA_ENV` and `ScribaEnv`; line 9 `controllers`; line 10 `providers: []`.
- `apps/api/src/modules/platform/` holds `boot/`, `build-info.ts`, `compose-version.ts`, `health.controller.ts`, `platform.module.ts`, `version.controller.ts` (`ls`). No `tailnet/`.
- `apps/api/test/` holds the PLT-04 tests, `create-test-app.ts`, `sse.ts` and `fixtures/static/index.html`. `apps/api/vitest.config.mts`: `include: ['test/**/*.test.ts']`, `testTimeout: 20000`, `swc.vite()`.
- `apps/api/package.json`: `@nestjs/core` `^12` is already a dependency. PLT-08 adds none.
- `package-lock.json` lines 3427, 3459 and 3498: entries for `@nestjs/common`, `@nestjs/core` and `@nestjs/platform-express`.
- `tsconfig.base.json`: `strict: true` and no `noUnusedLocals`. `apps/api/tsconfig.json`: `types: ["node"]`, `experimentalDecorators`, `emitDecoratorMetadata`.
- `node_modules/@nestjs`, `apps/api/node_modules/@nestjs` and `node_modules/@types/node` do not exist; `node_modules/typescript` exists (`ls`). So the Nest source and the mutation type-checks could not be read here.
- Unit: decisions at lines 18 to 22; criteria at lines 25 to 27. The unit names no mechanism. `units/README.md` line 133 is the external-behaviour rule. `modules/platform.md` line 35 is the settled decision; line 57 holds the tailnet exception.
- `plans/DECISIONS.md`: no line mentions "tailnet" or "Tailscale" (`grep -n -i "tailnet\|tailscale"`). Lines 403, 418 and 426 cover PLT-07 and PLT-08 editing `platform.module.ts` and `bootstrap.ts`. Line 456: a scratch lint passes same-module imports and flags only a cross-module one. Line 503: the PLT-04 close-on-failure fix was verified by the tests, lint and prettier.
- Predicate, `node -e` on this machine (Node v26.13.0), with `BlockList` `addSubnet('100.64.0.0', 10, 'ipv4')` and `addSubnet('fd7a:115c:a1e0::', 48, 'ipv6')`: `check` gives true for `100.64.0.1`, `100.127.255.254`, `::ffff:100.100.1.1` (type `ipv6`), `fd7a:115c:a1e0::1` and `FD7A:115C:A1E0:0:0:0:0:1`. It gives false for `127.0.0.1`, `::1`, `::ffff:127.0.0.1`, `172.17.0.1`, `100.63.255.255`, `100.128.0.0`, `::ffff:100.63.255.255`, `::ffff:100.128.0.0` and `fd7a:115c:a1e1::1`. With prefix 9, `100.63.255.255` gives true (mutation b). `net.isIP` gives 6 for `::ffff:100.100.1.1` and 0 for `nope`.
- Interfaces, `os.networkInterfaces()`: `lo` has `127.0.0.1` and `::1`; `eth0` has `172.21.0.2`; `tailscale0` has `100.94.240.19`, `fd7a:115c:a1e0::c83a:f014` and a link-local address. So this machine has a Tailscale-range address.
- Real-socket probe, `node -e` run from `/tmp`, a plain Node `http.Server` with a `connection` listener that destroys Tailscale-range peers: a loopback client got `200 ok`; a client with `localAddress` `100.94.240.19` got `ECONNRESET`, and the listener saw `100.94.240.19`.

**Assumed (ASSUMED):**
- A1. `app.getHttpServer()` returns the Node `http.Server` during `onApplicationBootstrap`, before `listen`. Checked by step 3 (source) and by `tailnet-filter.test.ts`.
- A2. unplugin-swc emits constructor metadata, so Nest injects `HttpAdapterHost` by class (PLT-04 A2 left this to PLT-05 to PLT-08). Checked by every test that boots `bootstrap()`.
- A3. `HttpAdapterHost` is available to a provider in any module without an import. Checked by the same tests.
- A4. Nest's server is a plain Node `http.Server`, so the probe result carries over to the app. Checked by step 12 (manual).
- A5. CI runners (`ubuntu-latest`, `.github/workflows/ci.yml`, per PLT-04 section 7) have no `tailscale0` address. Not checked. This is why the CI test uses a fake socket.
- A6. The IPv6 rule is inert today: `main.ts` binds `0.0.0.0`, an IPv4 wildcard, so no IPv6 peer reaches the app. From Node's socket behaviour; not run. The unit requires the rule anyway.
- A7. The Docker gateway peer (`172.17.0.1` in AC 2) is outside `100.64.0.0/10`. ST-1 records the real address (unit line 21).

**Not verified:**
- Nest source and any Nest behaviour (no `@nestjs` folder here).
- Any build, test, lint, prettier or mutation run for PLT-08. This plan was written without running them.
- Type-correctness of the five mutations, and whether `HttpAdapterHost.httpAdapter` is typed non-null (no `@types/node` here); the `npm test` build step is the check.
- A real `tailscale0` IPv6 address through a socket. Only its string was checked.
- The real-socket check through Nest's server (step 12).
