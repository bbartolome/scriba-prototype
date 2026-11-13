---
id: MPR-03
status: planned
---
# MPR-03 plan — secrets file helper and stdout redaction

Batch: Model providers, phase:client, M1. MPR-03 is in the same batch as MPR-02 and MPR-04, ordered by unit id: MPR-02, then MPR-03, then MPR-04. Revision 2 was written against `main` at 76ce5fc; `main` is at f77e24d now (section 7). It applies Navigator decision 3 (short-key hint; `plans/DECISIONS.md` line 1876, entry "Model providers — Navigator decisions 1 to 3", commit c8e4262), the coordinator decisions on the drafts (`plans/DECISIONS.md` line 1884; open points 3 to 5 at line 1890, open point 6 at line 1891), and the Opus reviews of revision 2 (NOT APPROVED, two rounds; their items are applied in place). Open point 1 is closed as the coordinator's default, option (a), which is also the plan default; no DECISIONS entry records it. Revision 1 was written against `main` at `f023fa4`; no code file has changed since then (section 7). Status is `draft`; the orchestrator sets `planned` after review. Nothing was built, installed, tested, committed or pushed while writing this plan.

## 1. Decisions this plan follows

Settled by the unit and the module:

- File `${SCRIBA_BOOKS_DIR}/.scriba/secrets.yaml`, mode 0600 inside a 0700 directory. Writes are atomic: temp file, rename, mode check. Source: `units/MPR-03-secrets-file.md` line 18; `modules/providers.md` line 36.
- On startup, create the directory and file with those modes if missing; if looser, tighten and warn on stdout. Source: unit line 19. Narrowed by D3.
- Entries keyed by opaque `keyRef`. API: `put(keyRef, key)`, `get(keyRef)` (in-process only), `delete(keyRef)`, `hint(keyRef)` (last four characters, for keys of five or more characters; see D14), `has(keyRef)`. Source: unit line 20.
- A reusable helper. No second secrets file. Setup & auth stores nothing there. Source: unit line 21; module line 36; `modules/platform.md` line 48 (the secrets file is owned by Model providers).
- Log redaction: operational logs on stdout redact the `Authorization` header and any key-shaped value (known keys and patterns such as `sk-…`). Error messages from this module never include keys. Source: unit line 22; module line 36 (keys never in logs, transcripts, errors or the event stream).
- `settings.yaml` holds only `keyRef`. This unit writes nothing to `settings.yaml`. Source: module line 36.
- `keyRef` is an opaque, non-empty string on the stored member (`packages/contracts/src/providers/config.ts` line 17). The read view carries `keySet` and `keyHint`, with `keyHint` at most four characters and optional (config.ts lines 28 to 29). The helper returns plain strings and does not depend on the contract's types.
- Testing: external behaviour only (files on disk and their modes, HTTP responses, captured stdout). The module's primary seam is Platform's `create-test-app` against a temp library. Source: `modules/providers.md` line 44 and the Testing principles section.
- Stdout choke point: every Nest log goes through `StdoutLogger` (`apps/api/src/modules/platform/boot/stdout-logger.ts`), so redaction is applied there. Source: unit line 22 ("operational logs (stdout)"); `plans/PLT-04.md` line 32 (the overrides call `printMessages`).

Settled by Navigator decision 3 (`plans/DECISIONS.md` line 1880, commit c8e4262):

- Short keys. A key of four characters or fewer gets no `keyHint` (absent; the contract allows it). A key of five or more characters gets its last four characters. MPR-03 criterion 3 and test T4 gain this branch. MPR-09 shows "key set" with no hint text. The contract and MPR-06 are unchanged. The log over-redaction of very short keys (D9) is accepted.

Decision log: `plans/DECISIONS.md` names MPR-03 in two entries. "Model providers — Navigator decisions 1 to 3" (line 1876; decision 3 at line 1880) closes open point 2 of this plan. "Model providers — coordinator decisions on the drafts MPR-02, MPR-03 and MPR-04" (line 1884) closes open points 3 to 5 at line 1890 and open point 6 at line 1891. The earlier providers entries (lines 1837 to 1858) fix the contract, not the helper.

Small decisions made in this plan (each is the simplest option that meets the unit):

- **D1 File shape.** `schemaVersion: 1` and a `keys` mapping from `keyRef` to key. Only the helper reads the file.
- **D2 Startup.** Ensure `.scriba` exists (create it recursively, then `chmod` 0700). If `secrets.yaml` is missing, create it through the atomic write with `schemaVersion: 1` and `keys: {}`. A leftover `secrets.yaml.tmp` is removed silently, because it can hold part of a key.
- **D3 Warning scope.** The warning covers the secrets file only. The directory is tightened to 0700 without a warning. Reasons: `ensureAppState` creates `.scriba` with the process umask before any module runs (`apps/api/src/modules/platform/boot/app-state.ts` line 11, no mode), so the folder is loose on every first start; setup-auth already tightens it silently (`apps/api/src/modules/setup-auth/setup-token.store.ts` line 103); and `apps/api/test/setup-auth-token.test.ts` line 35 expects exactly one stdout line on first start, which a directory warning would break once the providers module is composed. Open point 4 records the decision.
- **D4 "Loose".** A file whose mode is not exactly 0600, and a directory whose mode is not exactly 0700. The fix is an explicit `chmod`. The warning names the path and the old mode as four octal digits with a leading zero (for example `0644`, the form T2 expects), names the new mode `0600`, and contains no key.
- **D5 Reads.** Every `get`, `has`, `hint` reads the file from disk; there is no in-memory cache. `put` and `delete` rewrite the whole file. Writes are synchronous, so calls cannot interleave inside the process.
- **D6 Atomic write.** Remove a stale temp file. `writeFileSync(temp, yaml, {mode: 0o600})`, then `chmodSync(temp, 0o600)` (umask-proof). `renameSync(temp, path)`. Then the mode check: `statSync(path)`, and if the mode is not 0600, tighten and warn. On any error, remove the temp file and throw `BootError('Cannot write <path>: <reason>.')`. The pattern follows `setup-token.store.ts` lines 77 to 89. It differs from `apps/api/src/modules/platform/settings/settings.file.ts` line 53, which writes without a mode.
- **D7 Parse and shape.** A file that is not valid YAML, whose top level is not a mapping, whose `schemaVersion` is not 1, or whose `keys` holds a non-string or empty value, refuses boot with `BootError('Cannot read <path>: not a valid secrets file.')`. The parser's own text is not included. `settings.file.ts` line 36 does include it; this helper does not copy that. The file is left unchanged. Open point 5 records the decision.
- **D8 Calls.** `put` requires a non-empty `keyRef` and a non-empty `key`; a violation throws a plain `Error` that echoes no value. `put` on an existing `keyRef` overwrites it. `delete` of an absent `keyRef` is a no-op with no write. Entries are held in a `Map`, so a `keyRef` such as `__proto__` is an ordinary key.
- **D9 Redaction registry.** After each successful write, and at boot, the registry is replaced with every current key value (`setKnownSecrets`). A failed write leaves the registry as it was. Every key is registered, including very short ones. Navigator decision 3 accepts the over-redaction this causes (line 1880).
- **D10 Redactor location.** Platform owns stdout, so the redactor is `apps/api/src/modules/platform/boot/redact.ts`. The providers module reaches it through the platform entry file (`platform.module.ts`), which the PLT-09 boundary rule allows.
- **D11 Warnings.** The boot warning is written with `process.stdout.write`, not through the Nest logger. The unit requires it on stdout, and the logger drops `warn` at `SCRIBA_LOG_LEVEL=error` (`apps/api/src/modules/platform/boot/stdout-logger.ts` lines 5 to 10; `apps/api/test/create-test-app.ts` line 82 sets `error`). The pattern follows `setup-token.store.ts` line 109.
- **D12 Test seam.** No HTTP route for secrets exists in M1 (MPR-06 adds them), so the tests use a test kit module, as `apps/api/test/settings.kit.ts` does for the settings writer (lines 23 to 56). The kit exports `SecretsKitModule`. It imports `PlatformModule` (as `settings.kit.ts` does) and lists `SecretsStore` in its own `providers`. It imports the internal `secrets-store.ts` file, as existing tests already import internal source files (`../src/modules/platform/events/events.tuning` and `../src/modules/setup-auth/public-route.decorator`). The kit does not import `providers.module.ts`, so the tests do not depend on MPR-02's files. Because the kit imports `PlatformModule`, its `SettingsService` writes `settings.yaml` at boot when the file is absent (`apps/api/src/modules/platform/settings/settings.service.ts` lines 82 and 94), so `.scriba` holds two files in every kit test.
- **D13 Errors on write.** A failed `put` or `delete` reaches HTTP as a 500 through Platform's filter. Anything uncaught becomes `PLATFORM_INTERNAL` with no stack (`units/PLT-05-error-filter-validation-pipe.md` line 22).
- **D14 Hint.** Navigator decision 3 (line 1880): a key of four characters or fewer has no hint (absent), and a key of five or more characters has its last four characters. The length is JavaScript `string.length`; API keys are ASCII in practice. The helper is `hintOf(key)`: `undefined` when `key.length <= 4`, else `key.slice(-4)`. The contract's `keyHint` is optional (config.ts line 29), so the absent case is valid.
- **D15 Dependencies.** None added. `yaml` 2.9.1 and `zod` ^4 are already in `apps/api/package.json` (lines 18 and 19). `package.json` and `package-lock.json` do not change.
- **D16 Wiring.** MPR-03 owns the `SecretsStore` entries in `apps/api/src/modules/providers/providers.module.ts`: one import line, one entry in `providers`, one entry in `exports`, one entry per line. MPR-02 adds nothing for SecretsStore, so the `SecretsStore` lines in this shared file are MPR-03's, and the two plans agree on that. MPR-02 creates the file; MPR-03 edits it after MPR-02, in batch order. The store is listed directly in `providers.module.ts`; no other Nest module file is created for it. The store's boot step runs inside the app once MPR-02 adds `ProvidersModule` to `COMPOSED_MODULES`; until then the kit tests the store directly.

## 2. Files to change

One path per line. All paths are under the repository root `/Users/bbartolome/workspace/scriba-prototype`.

| Path | Change | Purpose |
|---|---|---|
| `apps/api/src/modules/platform/boot/redact.ts` | new | `setKnownSecrets(values)` replaces the known-value registry. `redact(text)` applies, in order, the known values (longest first), the Authorization rule and the `sk-` rule (section 3, step 4) |
| `apps/api/src/modules/platform/boot/stdout-logger.ts` | edit | overrides `printMessages`, the single print point of Nest 12.4.2 (step 5). String messages are redacted; non-string messages are inspected and then redacted; the context and the error stack are redacted; `params` (a plain-object argument after the message) is rendered by `util.inspect(params, {depth: 5, compact: true, breakLength: Infinity})` with no colour, redacted, appended with one space to each message, and then passed on as `undefined`. The two direct stack writes (lines 23 and 31) write `redact(stack)`. Level gating (lines 5 to 10) unchanged |
| `apps/api/src/modules/platform/platform.module.ts` | edit | adds one export, `export { setKnownSecrets } from './boot/redact';`, after line 14. The `exports` array (line 39) is unchanged |
| `apps/api/src/modules/providers/secrets/secrets-file.ts` | new | `secretsFilePath`, `readSecrets` (D7), `writeSecretsAtomic` (D6), `enforceMode` (D4), `ensureDirectory`, `hintOf` (D14) |
| `apps/api/src/modules/providers/secrets/secrets-store.ts` | new | `SecretsStore`, the reusable helper: boot (D2) and `put`, `get`, `delete`, `has`, `hint` (D5, D8, D9, D14) |
| `apps/api/src/modules/providers/providers.module.ts` | edit (MPR-02 creates it; MPR-03 edits it after MPR-02) | adds one import line for `SecretsStore`, and one entry each in `providers` and `exports` (D16). No other line is changed. If the file is absent when this unit is implemented, stop and report |
| `apps/api/test/secrets.kit.ts` | new | test module `SecretsKitModule`, importing `PlatformModule`, with `SecretsStore` in its own `providers`, a named logger, and the test routes listed in section 4 |
| `apps/api/test/providers-secrets-file.test.ts` | new | tests T1 to T5, with T4a (criteria 1 to 3, plus T5) |
| `apps/api/test/providers-log-redaction.test.ts` | new | tests T6 and T7 (criterion 4, plus T7) |

Not changed: `apps/api/src/app.module.ts` (MPR-02 wires `ProvidersModule`), `apps/api/src/bootstrap.ts`, `apps/api/src/modules/setup-auth/*`, `packages/contracts/*`, `package.json`, `package-lock.json`. `providers.module.ts` is shared with MPR-02 and listed above.

## 3. Method

Preconditions: `git status --short` prints nothing on `main`. Then `git switch -c unit/MPR-03`. Expected: `Switched to a new branch 'unit/MPR-03'`.

1. **Runtime.** `node -v` prints `v26.x` and `npm -v` prints `11.x`. Record both.
2. **Install.** `npm ci` at the root. Expected: exit 0. `git status --short` shows no change to `package.json` or `package-lock.json`. Step 5 repeats the Nest checks against this install.
3. **Baseline.** `npm test -w @bbartolome/scriba-api` on the untouched branch. Expected: exit 0. Record the file and test counts. A failure found here is reported, not fixed in this unit.
4. **Redactor.** Write `apps/api/src/modules/platform/boot/redact.ts`. `setKnownSecrets(values)` keeps the non-empty values. `redact(text)` applies, in this order:
   (a) each known value, longest first, replaced by `[redacted]`;
   (b) the Authorization rule, case-insensitive: the name `authorization`, an optional quote, `:`, an optional quote, an optional `Bearer` or `Basic` scheme followed by whitespace, then the credential, which runs to the first whitespace, quote or escape character. As a regular expression: `/(authorization['"]?\s*:\s*['"]?(?:(?:bearer|basic)\s+)?)[^\s'"\x1b]+/gi`, replaced by the first group followed by `[redacted]`. The name, quotes and scheme are kept. Outputs: `Authorization: Bearer [redacted]` for a string, and `authorization: 'Bearer [redacted]'` for the form `util.inspect` gives an object;
   (c) the key-shape rule: `\bsk-[A-Za-z0-9_-]{8,}` replaced by `[redacted]`.
   Rules (a) and (c) must not rewrite the placeholder, so `[redacted]` stays as it is in each later rule.
5. **Logger.** Edit `stdout-logger.ts`. Override `printMessages`, the method the existing `error` and `fatal` overrides already call (`plans/PLT-04.md` line 32). It is the single point where Nest 12.4.2 prints, so one override covers messages, context, stack and params. Its arguments are `(messages, context, logLevel, writeStreamType, errorStack, params)`. The override does this:
   (a) each string message is passed through `redact`, so the string path is unchanged apart from redaction;
   (b) each non-string message is passed through `util.inspect(message, {depth: 5, compact: false, breakLength: Infinity})` and then `redact`. These are Nest's inspect options with colours off (section 7); depth 5 is Nest's `DEFAULT_DEPTH`, so nested values print to the same depth;
   (c) when `params` is present (Nest extracts a plain-object argument that follows the message into `params`), it is rendered with `util.inspect(params, {depth: 5, compact: true, breakLength: Infinity})`, with no colour, passed through `redact`, and appended with one space to each message. The override then passes `undefined` as `params` to `super.printMessages`, so Nest does not print it a second time. The override is placed at `printMessages`, not at `stringifyParams`, because `printMessages` is already the override point and covers every level. The StdoutLogger is built without `json`, so Nest's JSON path, which would bypass the appended text, is not used;
   (d) the context and the error stack arguments are redacted;
   (e) the two direct stack writes at lines 23 and 31 write `process.stdout.write(redact(stack))`.
   Nest prints a plain-object message as `Object(n)` followed by its inspection, and colours string messages. The override does not reproduce the `Object(n)` prefix or the colours; the Platform row in section 5 says what that changes. Level gating is unchanged.
   The Nest facts used here were read from a read-only copy of `@nestjs/common` 12.4.2 at `/tmp/opus-plt04-r3/app/node_modules/@nestjs/common` (not this checkout; `apps/api/node_modules` is not installed). Repeat them against this repository's install after `npm ci` (step 2). Stop and report if any differs:
   (i) `printMessages(messages, context, logLevel, writeStreamType, errorStack, params)` at `services/console-logger.service.js` line 206, and the existing overrides call it with that shape;
   (ii) non-string messages are printed by `stringifyMessage` (line 403), which inspects them with `inspectOptions` (`getInspectOptions`, lines 446 to 457; `inspectOptions`, lines 458 to 464: depth 5, compact false unless set and not json, breakLength Infinity when colours are off) and prefixes plain objects with `Object(n)`. Confirm the depth and compact values;
   (iii) a named `Logger` (`new Logger('SecretsTest')`) appends its context as a third argument, so `Logger.error(message, stackLine)` reaches `ConsoleLogger.error` as `(message, stackLine, 'SecretsTest')` (`services/logger.service.js` lines 64 to 68). With three arguments the last string is the context and the second string is the stack, whatever its shape (`getContextAndStackAndMessagesToPrint`, line 575). The stack-shape test (`isStackFormat`, lines 616 to 622) applies only to two-argument calls. T7 depends on this;
   (iv) a plain-object argument after the message reaches `printMessages` as `params`: `getContextAndMessagesToPrint` (line 542) extracts plain objects that follow the first argument into `params` (lines 558 to 573), and `formatMessage` (line 372) prints them through `stringifyParams` (lines 379 to 385). T6's params case depends on this.
   Nest's constructor `redact` option (lines 73 to 90; method `redact`, line 359) is path-based on object keys, so it cannot redact text. It is not used.
   The callers checked in this plan all pass strings: the Platform exception filter (`apps/api/src/modules/platform/errors/platform-exception.filter.ts` line 113) and the setup-auth warning (`apps/api/src/modules/setup-auth/setup-token.store.ts` line 119). Nest's own internal logs are assumed to pass strings; confirm at this step.
   Expected: level gating unchanged. Stop rules (i) to (iv) are in force.
6. **Platform entry.** Edit `platform.module.ts`: add `export { setKnownSecrets } from './boot/redact';` after line 14. Expected: the file gains one line.
7. **File helper.** Write `secrets-file.ts`. `readSecrets(path)`: a missing file gives an empty map; other errors follow D7. `writeSecretsAtomic(path, entries)`: D6. `enforceMode(path, expected, label)`: D4, with the warning for the file only. `ensureDirectory(dir)`: `mkdirSync` recursive, then `chmodSync` 0700, silently (D3). `hintOf(key)`: `undefined` when `key.length <= 4`, otherwise `key.slice(-4)` (D14, Navigator decision 3). The hint branch is written in this step.
8. **Store.** Write `secrets-store.ts`, `SecretsStore`, with `@Inject(SCRIBA_ENV)` (`platform.module.ts` line 13). Boot (`onApplicationBootstrap`), in this order: `ensureDirectory`; remove a leftover temp file; if the file is missing, create it; otherwise `enforceMode(file, 0o600)`; read and validate (D7); `setKnownSecrets` with the values. Then the methods: `put`, `get`, `delete` and `has` as D5 and D8 say; `hint(keyRef)` returns `hintOf(value)`, which is `undefined` for an absent entry. Errors in `put` and `delete` come from `writeSecretsAtomic`.
9. **Wiring.** Edit `apps/api/src/modules/providers/providers.module.ts` as D16 says. MPR-02's file is the base (batch order). Re-read the file before editing. Do not touch `app.module.ts`. Expected: the import, `providers` and `exports` each gain exactly the `SecretsStore` line, and no other line changes. If the file is absent, stop and report.
10. **Test kit.** Write `apps/api/test/secrets.kit.ts` as section 4 lists its routes. Follow the shape of `apps/api/test/settings.kit.ts`: the exported module `SecretsKitModule` imports `PlatformModule` and lists `SecretsStore` in its own `providers`.
11. **Tests.** Write `providers-secrets-file.test.ts` (T1 to T5, with T4a) and `providers-log-redaction.test.ts` (T6 and T7). Each creates its own temp library and removes it in `finally`, as `settings-atomic.test.ts` does.
12. **Focused run.** `npm run build -w @bbartolome/scriba-api`, then from `apps/api`: `npx vitest run providers-secrets-file providers-log-redaction`. Expected: eight tests pass (T1, T2, T3, T4, T4a, T5, T6, T7). T3's listing assertion uses the sorted form, `['secrets.yaml', 'settings.yaml']` (section 4). The name filter is a substring match; no other file name contains these strings, so other `providers-*` test files are not run here. The build runs first because `setup-auth-token.test.ts` runs the built `dist` through its fixture.
13. **Mutations.** Each on the working tree, then restored.
    (M1) The temp file is written at 0o644, and both `chmodSync(temp, 0o600)` and the post-rename mode check are removed. T1 must fail.
    (M2) The `chmodSync` on the restart path is removed. T2 must fail.
    (M3) The `redact` call is removed from the message path of `printMessages`. T6 and T7 must fail.
    (M3p) The `redact` call on `params` is removed. T6 must fail, because the headers line then prints the token.
    (M4a) `hintOf` returns the whole key. T4 and T4a must fail.
    (M4b) `hintOf` returns the last four characters for keys of four or fewer characters as well. Only T4a must fail; T4 must pass.
    (M5) Rule (b) is removed from `redact`. T6 must fail, because its token is neither stored nor `sk-` shaped, so only rule (b) can redact it.
    Expected: each named test fails under its mutation and passes after the restore. A direct, non-atomic write is not caught by any external test (open point 3).
14. **Format and lint.** `npx prettier --write` on the nine paths in section 2 (six new, three edited, including `providers.module.ts`). `npm run lint -w @bbartolome/scriba-api`. Expected: exit 0. The PLT-09 boundary rule passes: the providers files import platform only through `platform.module.ts`.
15. **Full gates.** From the root: `npm run build`, `npm test`, `npm run lint`. Expected: each exits 0.
16. **Commit (implementer, not this plan).** On `unit/MPR-03`, one commit `feat(MPR-03): add the secrets file helper and stdout redaction`. Do not push.

## 4. Acceptance criteria and tests

Criteria are the four in `units/MPR-03-secrets-file.md` lines 25 to 28. The test seam is the kit (D12). Commands: `npm test -w @bbartolome/scriba-api` for the full run, and `npx vitest run providers-secrets-file providers-log-redaction` from `apps/api` for the focused run.

Kit routes in `apps/api/test/secrets.kit.ts` (test-only; not in any composed module). The kit's logger is `new Logger('SecretsTest')`, a named context, so the context is never taken from logged text.

- `POST /api/secrets-test/put`, body `{keyRef, key}`, 204.
- `POST /api/secrets-test/delete`, body `{keyRef}`, 204.
- `POST /api/secrets-test/matches`, body `{keyRef, candidate}`, returns `{matches}` from `get`.
- `GET /api/secrets-test/has?keyRef=`, returns `{has}`.
- `GET /api/secrets-test/hint?keyRef=`, returns `{hint}`, or `{hint: null}` when `hint` is absent (no entry, or a key of four or fewer characters).
- `POST /api/secrets-test/log-request`, reads the `Authorization` header with `@Headers('authorization')`, then makes three log calls at log level: (1) the string `POST /api/secrets-test/log-request Authorization: <value>`; (2) the object `{ authorization: <value> }` as the message (the message path, step 5 (b)); (3) `this.logger.log('headers', { authorization: <value> })` (the params path, step 5 (c)). 204.
- `POST /api/secrets-test/log-stored`, body `{keyRef}`, logs `stored: <get(keyRef)>` at log level, 204.
- `POST /api/secrets-test/log-text`, body `{text}`, calls `this.logger.log(text)`, then `this.logger.error(text, stackLine)`, where `stackLine` is `Error: <text>` followed by the line `    at SecretsKitController.logText (secrets.kit.ts:1:1)`. Because the logger is named, ConsoleLogger receives the error call as `(text, stackLine, 'SecretsTest')`, so the second argument is the stack whatever its shape (step 5 (iii)). 204.

| Criterion (unit line) | Test file and name | What it asserts (external behaviour only) |
|---|---|---|
| 1, create part (line 25) | `providers-secrets-file.test.ts`: T1 "a put creates secrets.yaml at mode 0600 in a 0700 .scriba, holding the key under its keyRef" | After boot and one `put`: the file mode is 0o600; the directory mode is 0o700; the file parses to `{schemaVersion: 1, keys: {'openrouter-1': <key>}}`; `matches` returns true |
| 1, tighten part (line 25) | T2 "a loosened secrets file is tightened on restart with a stdout warning, and a loosened directory is tightened to 0700" | `put`; then `chmod` the file to 0o644 and the directory to 0o755; restart. The file mode is 0o600 and the directory mode is 0o700. Captured stdout (spy on `process.stdout.write`, installed before the restart) names `secrets.yaml`, `0644` and `0600`, and contains no key. The directory assertion is on mode only (D3) |
| 2, atomic (line 26) | T3 "a partial temp file left by a crash leaves secrets.yaml byte-identical, is removed on restart, and delete keeps the file whole" | `put` a key; close. Write a truncated `secrets.yaml.tmp` beside it (the state a crash between write and rename leaves). Restart. `secrets.yaml` bytes equal the bytes before the crash; `has` is true; `matches` is true; `secrets.yaml.tmp` is absent; `readdirSync(.scriba).sort()` equals `['secrets.yaml', 'settings.yaml']`. Then `delete`: the file parses with no entry; `has` is false; the sorted listing is still `['secrets.yaml', 'settings.yaml']`. The sorted-listing form is chosen over a prefix check, because the kit's `PlatformModule` writes `settings.yaml` at boot (D12) |
| 3, hint (line 27) | T4 "hint returns the last four characters of a key of five or more characters, and null for an unknown keyRef" | `put` key `sk-test-abcdefgh1234WXYZ` and, under another keyRef, the five-character key `ABCDE`. `GET hint` returns `{hint: 'WXYZ'}` for the first and `{hint: 'BCDE'}` for the second (the exact five-character boundary). `GET hint` for an unknown keyRef returns `{hint: null}` |
| 3, short keys (Navigator decision 3, line 1880) | T4a "a key of four or fewer characters has no hint, but is still set" | `put` keyRef `short-4` with key `ABCD`, and keyRef `short-1` with key `Z`. For both: `GET has` returns `{has: true}`; `GET hint` returns `{hint: null}`; the hint response body does not contain the key |
| 4, log redaction (line 28) | T6 "a logged request's Authorization header and a stored key are redacted on stdout" | Boot with `SCRIBA_LOG_LEVEL: 'info'`; spy installed before boot. `put` keyRef `openrouter-1`, key `stored-key-ABCD1234`. `POST log-request` with `Authorization: Bearer req-token-EFGH5678`, a token that is neither stored nor `sk-` shaped, so only rule (b) can redact it. The route makes its three log calls (kit routes above). `POST log-stored`. Captured stdout, with ANSI sequences stripped (Nest colours output unless `NO_COLOR` is set; `plans/DECISIONS.md` line 1563), contains `Authorization: Bearer [redacted]` (the string call); `authorization: 'Bearer [redacted]'` (the object message call); the line containing `headers` contains `authorization: 'Bearer [redacted]'` (the params call, step 5 (c)); and `[redacted]` on the stored-key line. It contains neither `req-token-EFGH5678` nor `stored-key-ABCD1234` |
| Extra, D7 and error rule (unit line 22, last sentence) | T5 "a secrets file that does not parse refuses boot with a message that holds no key, and the file is unchanged" | Write `schemaVersion: 1` / `keys:` / `  broken: [sk-MALFORMED-KEY-0001` into `secrets.yaml`. The key sits on the line that fails to parse, so a parser excerpt would show it. `createTestApp({libraryDir, modules: [SecretsKitModule]})` rejects, so `COMPOSED_MODULES` and MPR-02's `ProvidersModule` are not booted (D12). The error message matches `/Cannot read .*secrets\.yaml/` and does not contain `sk-MALFORMED`. The bytes of `secrets.yaml` are unchanged |
| Extra, step 4 rule (c) and step 5 (unit line 22) | T7 "a bare key-shaped value is redacted in both a log line and an error line" | Boot with `SCRIBA_LOG_LEVEL: 'info'`. `POST log-text` with `text: 'config sk-or-v1-PATTERNKEY0001 here'`. Captured stdout, stripped of ANSI, shows `[redacted]` on the log line, on the error message line, and in the error stack, and does not contain `PATTERNKEY0001`. The error call is a three-argument call because the logger is named, so the second argument is the stack (step 5 (iii)). If that check fails at step 5, the test does not run and the step stops |

## 5. Downstream agreement

| Unit | What it needs from MPR-03 | Agreement and check |
|---|---|---|
| MPR-05 (blocked by MPR-03) | `get(keyRef)` in-process; `undefined` when absent | Resolution maps an absent key to its own coded error. MPR-05 owns that mapping |
| MPR-06 (blocked by MPR-03) | `put` for set key; `delete` for clear key and for provider delete (idempotent, D8); `has` and `hint` for `keySet` and `keyHint`; no key on any response | MPR-06 mints the `keyRef` (opaque here). `put` on an existing `keyRef` overwrites. An absent `keyHint` with `keySet` true means "key set" with no hint text (Navigator decision 3, line 1880). MPR-06's body errors must not echo a key; its secrecy check must cover the zod validation pipe |
| MPR-09 (needs MPR-06 and Shell phase:core) | `keySet` and `keyHint` from the read view | When `keyHint` is absent, the panel shows "key set" with no hint text (Navigator decision 3). The panel's wording is MPR-09's |
| MPR-08 (blocked by MPR-03) | the file modes; `settings.yaml` holds only `keyRef`; redaction covers Nest logs and error stacks | MPR-03 writes nothing to `settings.yaml`. The secrecy suite's "no captured stdout line" depends on D10 for Nest logs, including params. The setup URL line (`setup-token.store.ts` line 109) carries the setup token, not a provider key, and is outside this unit |
| MPR-02 (same batch; merges before MPR-03) | MPR-02 creates `providers.module.ts`; MPR-03 adds the `SecretsStore` lines (D16) | MPR-02 adds nothing for SecretsStore. The `providers.module.ts` SecretsStore lines (one import, one `providers` entry, one `exports` entry) are MPR-03's (D16). Test file names and the kit name do not collide (`providers.kit.ts`, `providers-seeding`, `providers-create` belong to MPR-02). MPR-03 does not edit `app.module.ts` (MPR-02 does). A line number of this plan cited in the MPR-02 plan is MPR-02's to update |
| MPR-04 (same batch; merges after MPR-03) | nothing from this unit at the file level; the key reaches the client only as a resolved input from MPR-05 | MPR-04 does not touch `providers.module.ts` (`plans/MPR-04.md` section 5a and its method step 9). No path overlap with this plan. MPR-04's keyless placeholder `scriba-keyless` is not `sk-` shaped (`plans/MPR-04.md` S13), so D9 does not register it |
| Platform (PLT-04, PLT-05 units, done) | `StdoutLogger` gains a redaction step; the two stack writes (lines 23 and 31) change | Output for string messages without secrets is unchanged. Non-string messages are inspected with depth 5 and compact false, and params with depth 5 and compact true, both with breakLength Infinity and no colour (step 5). Nest's own text can still differ from ours in three ways: the layout (with colours on, Nest's breakLength for a non-string message is the util default, not Infinity), the colour, and the `Object(n)` prefix on plain-object messages. This plan does not claim full equality. The Platform callers checked here pass strings and no params (step 5). No Platform unit needs to change. The Platform owners should know this plan changes their file |
| Setup & auth (SAU-02, done) | `setup-token.store.ts` tightens `.scriba` silently (line 103) | Relied on by D3. MPR-03 does not edit setup-auth |

## 6. Open points

All six open points of revision 1 are closed in this revision, each with its source: open point 2 by Navigator decision 3 (line 1880), open points 3 to 5 by the coordinator decisions (line 1890), open point 6 by line 1891, and open point 1 by the coordinator's default (option a; no DECISIONS entry records it). Nothing in this plan waits on a later decision.

1. **No request log exists (criterion 4). Closed: option (a), the coordinator's default, which is also the plan default.** `grep` of `apps/api/src` finds no request logger and no `authorization` reference; `units/PLT-04-api-composition-root.md` line 27 asks only for "logging to stdout, level from SCRIBA_LOG_LEVEL". Option (a) adds no request log. Criterion 4 is tested through the kit's `log-request` route, which logs the header through the app's logger; the redactor covers every stdout line, so a later request log is covered too. Reason: no unit owns a Platform request log, and one would change stdout for every request. Option (b), a Platform request log, is not built.
2. **Short keys. Closed by Navigator decision 3 (`plans/DECISIONS.md` line 1880, commit c8e4262), which line 1890 says stands: option (a), threshold 4.** A key of four characters or fewer has no hint; five or more have the last four. Effects built into this plan: criterion 3 gains the five-character boundary in T4 and the short-key test T4a; the MPR-06 read view has `keySet` true with `keyHint` absent; MPR-09 shows "key set" with no hint text. The log over-redaction of very short keys (D9) is accepted under the same decision.
3. **Crash test seam (criterion 2). Closed: option (a), the external state test T3 (line 1890).** Option (b), a Vitest mock of `node:fs` for one failing `put`, asserts an internal call, not a file, and the module's testing principles ask for external behaviour. Accepted gap: a direct non-atomic write would pass T3. The implementer checks the write order against D6 in review.
4. **Directory warning (D3). Closed: option (a), warn for the file only (line 1890).** `setup-auth-token.test.ts` line 35 requires exactly one stdout line on first start, and the directory is loose on every first start (`app-state.ts` line 11). Option (b), making `ensureAppState` create `.scriba` at 0700, is a Platform change that no unit owns, so it is not made.
5. **A damaged secrets file at boot (D7). Closed: option (a), refuse boot, and the file is left alone (line 1890).** The same rule as `settings.yaml`, without the parser's text (`settings.file.ts` line 36 is not copied). The file is left alone, so the author can repair it, and no `put` overwrites the damaged content. Accepted effect: a damaged file stops the app's boot for every module; the message names the file.
6. **Parallel plans (same batch). Closed by batch order (line 1891).** The batch order by unit id is MPR-02, then MPR-03, then MPR-04. `providers.module.ts` is created by MPR-02 (its file table). MPR-03 edits it for one import line and the two `SecretsStore` entries (D16); MPR-03 owns those lines. MPR-04 does not touch the file (`plans/MPR-04.md` section 5a). If the file is absent when MPR-03 is implemented, stop and report; do not create it. MPR-02 adds nothing for SecretsStore; the `providers.module.ts` SecretsStore lines are MPR-03's (D16). This plan and MPR-02 agree on that.

## 7. Facts checked and facts assumed

### Facts checked (file:line)

Unit and module:
- `units/MPR-03-secrets-file.md` lines 18 to 22 (decisions), 25 to 28 (criteria).
- `modules/providers.md` line 14 (dependency graph entry), line 36 (Secrets), line 39 (Methods), line 44 (primary seam).
- `modules/platform.md` line 48 (secrets file owned by Model providers).
- `units/PLT-05-error-filter-validation-pipe.md` line 22 (uncaught errors become 500 with no stack).
- `units/PLT-04-api-composition-root.md` line 27 (logging to stdout).
- `units/PLT-09-module-boundaries-lint.md` (entry-file rule); `eslint.config.mjs` lines 29 to 30 (api-module element), line 40 (entry glob `**/src/modules/*/*.module.ts`), line 50 (rule R1).

Contract (merged on main):
- `packages/contracts/src/providers/config.ts` lines 5, 17 (`keyRef: z.string().min(1).optional()`), 23, 28 to 29 (`keySet`, `keyHint: z.string().min(1).max(4).optional()`).
- `packages/contracts/src/providers/keys.ts` lines 4 to 7 (write-only key request, `key: z.string().min(1)`).
- `packages/contracts/src/providers/examples.ts` line 44 (`keyRef: 'openrouter-1'`).
- `plans/MPR-01.md` lines 270 (MPR-03 downstream) and 297 (open point 4, closed by Navigator decision 3); status `done` in its front matter.

Platform and setup-auth code:
- `apps/api/src/modules/platform/boot/app-state.ts` lines 6, 9 to 11 (`ensureAppState` runs before Nest; `mkdirSync` with no mode).
- `apps/api/src/bootstrap.ts` lines 33 (`parseEnv`), 34 (`ensureAppState`), 46 (`StdoutLogger`), 54 (`app.init`).
- `apps/api/src/app.module.ts` lines 15 to 18 (`COMPOSED_MODULES`), line 34 (`SCRIBA_ENV` global provider).
- `apps/api/src/modules/platform/boot/env.ts` line 10 (`SCRIBA_ENV` symbol), line 19 (`SCRIBA_BOOKS_DIR`).
- `apps/api/src/modules/platform/boot/stdout-logger.ts` lines 5 to 10 (level map), 13 (class), 18 to 24 (`error`, stack write at 23), 26 to 32 (`fatal`, stack write at 31).
- `apps/api/src/modules/platform/boot/boot-error.ts` lines 2 to 3.
- `apps/api/src/modules/platform/platform.module.ts` lines 13 to 18 (entry exports), 39 (`exports`).
- `apps/api/src/modules/platform/errors/platform-exception.filter.ts` line 113 (logs `error?.message` and `error?.stack` as strings).
- `apps/api/src/modules/platform/settings/settings.file.ts` line 36 (parser text inside a `BootError`), lines 47 to 59 (atomic writer; line 53 writes with no mode).
- `apps/api/src/modules/platform/settings/settings.service.ts` lines 82 (`onApplicationBootstrap`) to 95; line 94 writes `settings.yaml` when the file is absent.
- `apps/api/src/modules/setup-auth/setup-token.store.ts` lines 25 to 26 (0700, 0600), 36 to 42 (silent `chmodOrBoot`), 49 (`writeFileSync` with mode), 77 to 89 (temp, chmod, rename), 103 and 105 (chmod directory and token), 109 (direct stdout write), 119 (`logger.warn` with a string).
- `apps/api/package.json` lines 7 (`test` builds first), 18 (`yaml` 2.9.1), 19 (`zod` ^4).

Nest `@nestjs/common` 12.4.2, read from a read-only copy at `/tmp/opus-plt04-r3/app/node_modules/@nestjs/common` (its `package.json` says 12.4.2; not this checkout):
- `services/console-logger.service.js`: constructor lines 73 to 90 (the `redact` option, lines 86 to 88); `log` line 95 and `error` line 105 (both call `printMessages` with `params`); `printMessages` line 206 (`redact` applied to messages and params only when the option is set, lines 207 to 209); `redact` method line 359; `formatMessage` line 372 (calls `stringifyMessage` and `stringifyParams`); `stringifyParams` lines 379 to 385 (`inspect` with `compact: true, breakLength: Infinity`); `stringifyMessage` line 403 (plain objects prefixed `Object(n)`, strings coloured); `getContextAndMessagesToPrint` line 542 (context from a trailing string; plain-object extraction into `params` at lines 558 to 573); `getContextAndStackAndMessagesToPrint` line 575 (two-argument stack test at 580; last-element stack test near 600); `isStackFormat` lines 616 to 622 (`\n[ \t]+at .+:\d+:\d+`).
- `services/logger.service.js`: `error` lines 64 to 68 and `log` lines 70 to 74 append the named context as the last argument.
- `services/console-logger.service.js`: `DEFAULT_DEPTH` is 5 (line 10); `getInspectOptions` lines 446 to 457 (breakLength is Infinity when colours are off and compact is not false; undefined when colours are on and compact is false); `inspectOptions` lines 458 to 464 (`depth` DEFAULT_DEPTH; `compact` is `options.compact ?? (json ? true : false)`, so false here).

Tests:
- `apps/api/test/create-test-app.ts` lines 65 to 87 (boot against a temp library), 82 (`SCRIBA_LOG_LEVEL: 'error'`), 83 (`...options.env`).
- `apps/api/test/settings.kit.ts` lines 23 to 56 (test kit pattern).
- `apps/api/test/settings-atomic.test.ts` line 33 (`.scriba` listing equals `['settings.yaml']`; this test composes only the settings kit, so the new secrets file does not affect it).
- `apps/api/test/setup-auth-token.test.ts` lines 35 (exactly one stdout line), 42 to 44 (0600 and 0700 checks).
- `apps/api/test/fixtures/boot-setup-auth.cjs`: boots `dist` with the composed modules.
- Existing tests import internal source files (grep: `events.tuning`, `public-route.decorator`, `tailnet-address`).

Decisions log and repository state:
- `plans/DECISIONS.md` line 1563 (Nest colours console output unless `NO_COLOR` is set); lines 1837 to 1858 (MPR-01 label and create-body decisions; none on MPR-03); line 1876 (entry "Model providers — Navigator decisions 1 to 3"); line 1880 (decision 3: threshold 4; MPR-09 "key set" with no hint text; D9 over-redaction accepted); line 1884 (entry "coordinator decisions on the drafts MPR-02, MPR-03 and MPR-04"); line 1890 (open points 2 to 5 for MPR-03); line 1891 (batch order and shared file).
- `plans/PLT-04.md` line 32 (`StdoutLogger` overrides call `printMessages`); `plans/PLT-05.md` line 227 (A3: a `process.stdout.write` spy captures Nest's `StdoutLogger` output); `plans/SAU-03.md` line 162 (`@nestjs/common` 12.4.2).
- `main` is at `f77e24d`: commit `c49e944` (the MPR-04 timeout decision, DECISIONS lines 1901 to 1908) plus two docs commits, `9bcefe3` and `f77e24d`, which add `plans/MPR-02.md`. `git diff --stat f023fa4 c49e944`: `plans/DECISIONS.md` 50 insertions; `units/MPR-05-model-resolution.md` 2 insertions and 2 deletions; no code file. `git diff --stat f023fa4 f77e24d` adds `plans/MPR-02.md` (190 insertions) and 5 more DECISIONS insertions (55 in total); still no code file. Every code citation above still holds. The DECISIONS lines cited in this plan (1563, 1876, 1880, 1884, 1890, 1891) have not moved.

Check 1, nothing in the repo already implements the helper: `apps/api/src` has `modules/platform` and `modules/setup-auth` only; no `providers` folder; no `secrets` file or helper.

Check 2, parallel plans (re-run at revision 2):
- `plans/MPR-02.md` is present (untracked). Its changed paths are `apps/api/src/modules/providers/providers.module.ts` (shared, see D16), `apps/api/src/app.module.ts`, `apps/api/test/providers.kit.ts`, `apps/api/test/providers-seeding.test.ts` and `apps/api/test/providers-create.test.ts`. Its parallel-units text expects MPR-03 to add its helper to the providers and exports arrays, one entry per line, which D16 matches. MPR-02 adds nothing for SecretsStore, which D16 matches. It names no platform file as changed, and it does not change `package.json` or the lockfile. No other path overlaps section 2 of this plan.
- `plans/MPR-04.md` is present (untracked). Its section 5a: `providers.module.ts` is shared with MPR-02 and MPR-03; MPR-04 changes nothing in it. Its test kit and test names (`providers-client.kit.ts`, `providers-client-*.test.ts`) do not collide with this plan. Its `package.json` change (`openai`) does not overlap this plan's "no dependency change" (D15).
- MPR-02's seeding criterion ("a second start changes nothing", its section 4 row 1) reads `settings.yaml`. This plan's boot step does not rewrite an existing `secrets.yaml` (D2, D4), so a second start leaves it unchanged too.

### Facts assumed

- `printMessages`, `stringifyMessage`, `formatMessage`, `stringifyParams` and the argument splitting are as read in the Nest copy above. They are repeated against this repository's install at step 2, and step 5 (i) to (iv) stop the work if any differs.
- Nest's own internal logs pass strings; this is assumed, and step 5 confirms it.
- Nest's `ConsoleLogger` writes through `process.stdout.write`, so a spy captures its output (`plans/PLT-05.md` line 227).
- `yaml` 2.9.1's parse errors may include a source excerpt. This plan does not forward parser text (D7), so the outcome is the same either way; T5 checks it, with the key on the failing line.
- `mkdirSync` with no mode creates a directory with 0o777 and the umask applied (Node's documented behaviour). Under a common umask of 022, `.scriba` is 0755 on first start.
- Nest colours console output unless `NO_COLOR` is set (`plans/DECISIONS.md` line 1563), so the tests strip ANSI sequences before matching.
- The `apps/api` tests run against `src` through Vitest; the setup-auth fixture runs against `dist`, which `npm test` builds first (`apps/api/package.json` line 7).
- The sandbox running this plan is Linux. The tests use temp directories and modes that behave the same on macOS.
- API keys are ASCII in practice, so counting by `string.length` (D14) gives the intended hint.
- The lock in this repository pins `@nestjs/common` 12.4.2 (`plans/SAU-03.md` line 162); step 2 confirms it.
