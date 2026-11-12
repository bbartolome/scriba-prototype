---
id: PLT-07
status: planned
---
# PLT-07 plan — `settings.yaml` startup migration hook and section registration

Batch: [PLT-05, PLT-06, PLT-07, PLT-08] (Platform, phase:scaffold, M1); this plan is PLT-07 only. Revision 2.

Written from the unit, `units/README.md`, `modules/platform.md`, `plans/DECISIONS.md`, `plans/PLT-04.md`, the code on `main` (HEAD `bd95da8`) and the packed `@nestjs/core` 12.4.2 source. Nothing was built or run in this checkout (section 7).

## 1. Decisions this plan follows

Settled:
1. Platform owns the file envelope and the eager boot hook. Each module owns its section and its steps. Sources: unit line 18; `modules/platform.md` line 41; `units/README.md` line 129.
2. File `${SCRIBA_BOOKS_DIR}/.scriba/settings.yaml`, top-level `schemaVersion` `1`, one section per fixed key, and each section has its own `schemaVersion` as its first key. Sources: unit lines 19 and 20; `packages/contracts/src/platform/settings.ts` lines 4 and 7 to 13. The folder is PLT-04's app-state folder (`apps/api/src/modules/platform/boot/app-state.ts` line 9).
3. Registration is a section key, a current version, a default (`null` = leave absent) and `{fromVersion → step}`. Sources: unit line 21; MPR-02 registers `providers` with default `null` (`units/MPR-02-registry-seeding.md` line 19).
4. The hook runs at boot, after the app-state check and before listen. A missing file is `{schemaVersion: 1}`. A behind section gets a `settings.yaml.bak-<UTC timestamp>` backup and its steps in order. The write is atomic (temp file + rename). Unknown top-level keys are kept. Sources: unit lines 22 and 31 to 36. Boot order: PLT-04 plan section 1 bullet 8. The hook is an `onApplicationBootstrap` provider, which `app.init()` runs before `listen` (section 7).
5. A newer envelope or section `schemaVersion` makes the app exit non-zero with a message that names the section (or envelope) and the version. The error is `BootError`, because `main.ts` prints only that class and rethrows the rest (`apps/api/src/main.ts` lines 9 to 14; DECISIONS line 419).
6. The hook exposes atomic section read and write to its owning module as an injectable service. Source: unit line 24.
7. Per-project files are out of scope (PST-23). Source: unit line 25.
8. `SCRIBA_ENV` is read through its token in `boot/env.ts`, imported from inside the platform folder (PLT-04 bullet 4; `eslint.config.mjs` rule R1). A same-module import passes lint, and only a cross-module import of `boot/env` is flagged (DECISIONS line 456).
9. `apps/api` stays CommonJS (PLT-04 open point 1, decided at DECISIONS line 460, commit a4ab77a).
10. Tests check external behaviour only: `createTestApp` on a temp library, and spawned `dist/main.js` for exit codes and stderr (`units/README.md` line 133; PLT-04 section 4).

Choices where the unit is silent (the simplest option):
11. A missing file is written at boot. There is no backup, because there is nothing to back up.
12. A registered section that is absent from an existing file gets its default when the default is non-null. That makes the section behind, so the file is backed up. A `null`-default absent section is not a change.
13. All checks run before any write: the envelope first, then each registered section in `SETTINGS_SECTION_KEYS` order. A refusal leaves the file and the backups as they were.
14. A file that cannot be read (YAML error, not a mapping, a missing or non-integer `schemaVersion`, an invalid section) is refused with `Cannot read <path>: <reason>.` as a `BootError`. The file is never overwritten (story 22). Not criterion-tested.
15. Backup name: `settings.yaml.bak-` plus `new Date().toISOString()` with `:` and `.` replaced by `-`, for example `settings.yaml.bak-2026-11-12T10-15-00-000Z`. The backup is a byte copy of the file before the change.
16. The runner sets `schemaVersion` to `from + 1` after each step. A behind section with a missing step is a plain `Error`, raised before any write.
17. A written section puts `schemaVersion` first. Other keys keep their order. Unknown keys keep their values.
18. Atomic write: `settings.yaml.tmp` in the same folder, then `renameSync`. No `fsync`.
19. `yaml` 2.9.1 is already in the lock as a root devDependency. It becomes a runtime dependency of `apps/api`, because the built app needs it. The root `package.json` is not edited (the PLT-04 bullet 13 pattern).
20. File problems at runtime (`read` and `write`) throw the same `BootError`. PLT-05 maps it to 500 like any other error.

Facts that shape the design:
21. `settingsEnvelopeSchema` is a `strictObject` that requires all five sections (`settings.ts` line 22 onward). PLT-02's test pins both (`packages/contracts/test/platform.schema.test.ts` lines 208 to 244). The plan does not parse with it (open point 1, decided).
22. The fixed key list has no test key, so the test-only section uses the existing key `tools`. A new section needs a new key in the contract (PLT-02 unit line 35).

## 2. Files to create or change

Paths are under `apps/api/` unless shown. `settings/` means `src/modules/platform/settings/`.

| Path | Change | Purpose |
|---|---|---|
| `package.json` | edit | add `"yaml": "2.9.1"` to `dependencies` (step 2) |
| `src/modules/platform/settings/settings.types.ts` | new | `SettingsSectionKey`, `SettingsSection`, `SettingsMigrationStep`, `SettingsSectionDef` |
| `src/modules/platform/settings/settings.file.ts` | new | `settingsFilePath(booksDir)`; `readSettingsFile` (missing gives `undefined`, unreadable gives `BootError`); `writeSettingsAtomic` (temp + rename); `backupFileName(now)` |
| `src/modules/platform/settings/settings.migrate.ts` | new | pure `migrateSettings(file, defs, path)`, returns `{next, changed}` or throws the refusal `BootError`; holds the rollback sentence |
| `src/modules/platform/settings/settings.service.ts` | new | `SettingsService`: `register`, `read`, `write`, `onApplicationBootstrap` (plan, backup, write) |
| `src/modules/platform/platform.module.ts` | edit | `providers` and `exports` get `SettingsService`; re-exports it and the types from `./settings/` (open point 3) |
| `test/settings.kit.ts` | new | `settingsTestModule(defs)`; `makeLibrary(settingsText?)`; `settingsFilePath(library)`; the test controller on `/api/settings-test/section` (GET reads `tools`, POST writes `tools`) |
| `test/fixtures/boot-with-test-section.cjs` | new | child process for the AC 5 section case (open point 2) |
| `test/settings-migration.test.ts` | new | AC 1 |
| `test/settings-defaults.test.ts` | new | AC 2 |
| `test/settings-current.test.ts` | new | AC 3 |
| `test/settings-unknown-keys.test.ts` | new | AC 4 |
| `test/settings-refusal.test.ts` | new | AC 5 (both cases in one `it`) |
| `test/settings-atomic.test.ts` | new | AC 6 |
| `package-lock.json` | changed only by step 2 | the `apps/api` entry gets `yaml`; `node_modules/yaml` loses its `dev` flag |
| `dist/` | generated, git-ignored | build output |

Not changed: `bootstrap.ts`, `main.ts`, `app.module.ts`, `packages/contracts/**`, the root `package.json`, `eslint.config.mjs`.

Signatures (a sketch for the implementer; the constructor uses explicit `@Inject` tokens, so no decorator metadata is needed):

```ts
// settings.types.ts
export type SettingsSectionKey = (typeof SETTINGS_SECTION_KEYS)[number];
export type SettingsSection = { schemaVersion: number } & Record<string, unknown>;
export type SettingsMigrationStep = (section: SettingsSection) => SettingsSection;
export interface SettingsSectionDef {
  key: SettingsSectionKey;
  version: number;                                   // current schemaVersion, integer >= 1
  defaultValue: SettingsSection | null;              // null = leave absent
  migrations: Record<number, SettingsMigrationStep>; // key = fromVersion
}

// settings.service.ts
@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  constructor(@Inject(SCRIBA_ENV) private readonly env: ScribaEnv) {}
  register(def: SettingsSectionDef): void;           // from a provider factory, before boot
  read(key: SettingsSectionKey): SettingsSection | undefined;
  write(key: SettingsSectionKey, section: SettingsSection): void;
  onApplicationBootstrap(): void;
}
```

`register` throws a plain `Error` for a key outside `SETTINGS_SECTION_KEYS`, a duplicate key, a version that is not an integer of at least 1, or a default whose `schemaVersion` differs from the version.

## 3. Method

0. **Check the code on main first.** `git status --short` is empty. `git rev-parse --short HEAD` is `bd95da8`, or a later commit that changes nothing under `apps/api/src`, `apps/api/test` or `packages/contracts/src/platform` (`git diff --quiet bd95da8 HEAD -- apps/api packages/contracts`). Re-read `bootstrap.ts`, `main.ts`, `app.module.ts`, `platform.module.ts`, `boot/*` and `test/create-test-app.ts` if anything differs.
1. **Preconditions.** Record `node -v` and `npm -v` (expected v26.x and 11.x). Run `npm ci` from the root. The checkout's `node_modules` has no `@nestjs` and no `yaml`, so it cannot be used. Then `npm run build -w @bbartolome/scriba-contracts`.
2. **Dependency.** Add `"yaml": "2.9.1"` to `apps/api/package.json` `dependencies`. From the root run `npm install --package-lock-only --ignore-scripts`, then `npm ci`. Gate: `git diff bd95da8 -- package-lock.json` changes only the `apps/api` workspace entry (the `yaml` line) and removes `"dev": true` from `node_modules/yaml`. Any other change stops the step (the PLT-04 step 3 rule).
3. **Settings folder.** Create `settings.types.ts`, then `settings.file.ts`, then `settings.migrate.ts`, then `settings.service.ts`. The algorithm lives in `settings.migrate.ts` and is pure (no file I/O):
   - Envelope: `schemaVersion` must be an integer. A value above 1 is refused with the envelope message. A value below 1, or not an integer, is a `Cannot read` error.
   - Pass 1 (checks only): for each registered def, in `SETTINGS_SECTION_KEYS` order. An absent section with a non-null default is planned for its default. A present section must be a mapping with an integer `schemaVersion` of at least 1 (else `Cannot read`). A `schemaVersion` above the version is refused with the section message. A lower one needs steps `from` to `version - 1`, all present (else plain `Error`).
   - Pass 2 (only when pass 1 raised nothing): the new document keeps the file's keys in file order, with the envelope at 1. Each behind section is replaced by its migrated value. Each planned default is appended. Unregistered keys are kept. `changed` is true when any section was migrated or defaulted.
   - `SettingsService.onApplicationBootstrap` (`settings.service.ts`): `file = readSettingsFile(path)`; run `migrateSettings(file ?? {schemaVersion: 1}, defs, path)`. If the file exists and `changed` is false, return with no write and no backup. If the file exists, copy its bytes to the backup name. Then `writeSettingsAtomic(path, next)`.
   - `read(key)` returns the stored section, or `undefined` when absent. `write(key, section)` checks that the key is registered and that `section.schemaVersion` equals its version (else plain `Error`). It then sets the section, with `schemaVersion` first, and writes atomically. Unknown keys are kept.
   - Refusal messages are exact. The rollback sentence is the same in both (`ROLLBACK`):
     - Envelope: `Cannot start: <path> has top-level schemaVersion <found>, but this app supports schemaVersion <current>. <ROLLBACK>`
     - Section: `Cannot start: <path> has section "<key>" at schemaVersion <found>, but this app supports schemaVersion <current>. <ROLLBACK>`
     - `ROLLBACK` is `To roll back, restore a settings.yaml.bak-* backup made before the upgrade, or run the app version that wrote this file.`
     - `<path>` is the container path `join(SCRIBA_BOOKS_DIR, '.scriba', 'settings.yaml')`.
   - `settings.file.ts` uses `yaml` `parse` and `stringify` (`yaml` 2.9.1, `dist/index.d.ts` line 19). A missing file gives `undefined`. A parse or read error becomes a `Cannot read <path>: <reason>.` `BootError`. A write error becomes `Cannot write <path>: <reason>.` `BootError`.
4. **Platform entry.** Edit `platform.module.ts` (open point 3): `providers: [SettingsService]`, `exports: [SettingsService]`, and `export { SettingsService } from './settings/settings.service'` with `export type { SettingsSection, SettingsSectionDef, SettingsMigrationStep, SettingsSectionKey } from './settings/settings.types'`. Modules outside platform import these from this entry only (rule R1).
5. **Test helpers.** Create `test/settings.kit.ts` and `test/fixtures/boot-with-test-section.cjs` (open point 2).
   - `settingsTestModule(defs)` returns a `@Module` class from a factory. It imports `PlatformModule` and has a provider factory with `inject: [SettingsService]` that calls `register` for each def. It also has the controller: `GET /api/settings-test/section` returns `service.read('tools') ?? null`, and `POST /api/settings-test/section` (`@HttpCode(204)`) calls `service.write('tools', body)`.
   - The `.cjs` child defines `projects` (version 2, step 1 adds `migrated: true`) and `tools` (version 1), then calls the built `bootstrap()` with its own module. On rejection it checks `err instanceof BootError` (imported from `dist/modules/platform/boot/boot-error.js`). For a `BootError` it writes `err.message` and a newline to stderr, then exits 1, as `main.ts` does. For any other error it rethrows. On success it exits 0, so the test never hangs.
6. **Tests.** Create the six test files in section 4. Do not run them yet.
7. **Build.** `npm run build -w @bbartolome/scriba-api`. Check that `dist/main.js`, `dist/bootstrap.js` and `dist/modules/platform/settings/settings.service.js` exist, and that `dist/main.js` has `require(` and no top-level `import`.
8. **Format.** `npx prettier --write` on every new or changed file under `apps/api`, including the `.cjs`. Then `npx prettier --check apps/api` must pass.
9. **Run.** `npm test -w @bbartolome/scriba-api`. Twelve files run (PLT-04's six and these six), and twelve tests pass with none skipped.
10. **Mutations.** Section 4 lists them. Apply one at a time, run `npm test -w @bbartolome/scriba-api` for each (it rebuilds `dist/` first, so the child processes run the mutated build), record the result, then revert. A mutation that fails `tsc` stops at the build and tests nothing; if one does, replace it.
11. **Lint.** `npm run lint -w @bbartolome/scriba-api`. Record the result.
12. **Root gate.** From the root: `npm run build`, `npm test`, `npm run lint`. Record `node -v` and `npm -v`.
13. **Status.** `git status` shows only the section 2 paths. Do not commit; the driver commits.

## 4. Acceptance criteria and tests

The criterion text is the unit's checklist (unit lines 31 to 36), verbatim. Each has one test file with one `it`. Exact forms are given where the criterion names one.

- [ ] A `settings.yaml` with a test section that's behind gets a `settings.yaml.bak-<timestamp>` backup and is migrated by that section's registered steps, in order, before `/healthz` answers.
  - Test: `settings-migration.test.ts`, via `createTestApp({libraryDir, modules: [settingsTestModule([tools v3 with steps 1 and 2])]})`. The file is `schemaVersion: 1` plus `tools: {schemaVersion: 1, steps: []}`. Step 1 pushes `'one'` and step 2 pushes `'two'`.
  - Exact: right after `createTestApp` resolves and before any request, the parsed file has `tools` `toEqual({schemaVersion: 3, steps: ['one', 'two']})`. Exactly one entry in `.scriba/` matches `/^settings\.yaml\.bak-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/`, and its bytes equal the original text's bytes. Then `GET /healthz` is 200.
  - Mutations: apply the steps in reverse order; skip the backup.
- [ ] A missing file is treated as `{schemaVersion: 1}`; sections with non-null defaults are written; `null`-default sections stay absent.
  - Test: `settings-defaults.test.ts`, a fresh library with no file, and `tools` (version 1, default `{schemaVersion: 1, enabled: {}}`) plus `agent` (version 1, default `null`).
  - Exact: the parsed file `toEqual({schemaVersion: 1, tools: {schemaVersion: 1, enabled: {}}})`, so `agent` is absent. No `.bak-` entry exists (our rule 11).
  - Mutations: write the `null`-default `agent` as `{schemaVersion: 1}`; skip writing defaults.
- [ ] A file already current is not rewritten and no backup is created.
  - Test: `settings-current.test.ts`. The file is hand-written: a first line `# hand-written, keep me`, then `schemaVersion: 1` and `tools: {schemaVersion: 1, enabled: {}}`. Same defs as above.
  - Exact: the file's bytes equal the original string, its inode is unchanged, and no `.bak-` entry exists.
  - Mutations: drop the `changed` check so every boot rewrites (the comment is lost and the inode changes); back up whenever the file exists.
- [ ] An unknown top-level key survives a migration unchanged.
  - Test: `settings-unknown-keys.test.ts`. The file has `notes: {keep: [1, 2], text: 'hi'}` and `tools: {schemaVersion: 1, steps: []}`. The defs are `tools` version 2 with step 1 pushing `'one'`.
  - Exact: `notes` `toEqual({keep: [1, 2], text: 'hi'})`, and `tools.schemaVersion` is 2, so a migration did happen.
  - Mutation: drop unknown top-level keys when writing.
- [ ] A newer envelope `schemaVersion` and, separately, a newer section `schemaVersion` each make the app exit non-zero with a message naming the section (or envelope) and the version.
  - Test: `settings-refusal.test.ts`, one `it` with two spawns, both with `SCRIBA_LOG_LEVEL=error` and the three dir variables inside a temp library, and a 15000 ms timeout. Nest's `create` logs `APPLICATION_START` at `log` level (`nest-factory.js` line 104), which `info` prints to stdout (`console-logger.service.js` line 103). `error` keeps stdout empty.
  - (a) Envelope: the file is `schemaVersion: 2`. The child is `dist/main.js`. Exact: status 1; stdout `''`; `stderr.trim()` equals the envelope message for `schemaVersion 2` against `1`.
  - (b) Section: the file is `schemaVersion: 1`, `projects: {schemaVersion: 1}`, `tools: {schemaVersion: 2}`. The child is the `.cjs` fixture. Exact: status 1; stdout `''`; `stderr.trim()` equals the section message for `"tools"`, `2` against `1`.
  - Both: no stderr line starts with whitespace then `at ` (no stack frames). The file's bytes are unchanged and no `.bak-` entry exists.
  - Mutations: replace the newer comparison with one that never fires (for example, compare against `version + 1000`); throw `new Error(message)` instead of `BootError`; in the service, copy the backup before calling `migrateSettings` (the copy is a statement in `onApplicationBootstrap`, so it type-checks; case (b) then leaves a `.bak-` file, and the no-backup assertion fails).
- [ ] Section write is atomic (temp file + rename) and round-trips through section read.
  - Test: `settings-atomic.test.ts`, via `createTestApp` with `tools` (version 1, default `null`), so the boot writes `{schemaVersion: 1}`. Record the inode. `POST /api/settings-test/section` with `{schemaVersion: 1, enabled: {search: false}}`.
  - Exact: the POST is 204. The inode changed. `readdirSync('.scriba')` is `['settings.yaml']`, with no `.tmp` left. The parsed file's `tools` `toEqual` the body. `GET /api/settings-test/section` `toEqual` the body.
  - Mutations: write in place (`writeFileSync` to the target, no rename), which keeps the inode; `write` stores only `{schemaVersion}`.

Every mutation keeps the types valid. Step 10 confirms each reaches vitest.

## 5. Downstream agreement

`platform.module.ts` is shared by PLT-05, PLT-06, PLT-07 and PLT-08, each adding lines to its arrays (DECISIONS lines 418 and 426; PLT-04 section 5). Every other file has one owner. Where a conflict falls on a shared array line, keep every unit's entry. Only PLT-07 adds a dependency; if another unit adds one, it reruns the step 2 lock command.

| Unit | May add | Where | Must not / agreement |
|---|---|---|---|
| PLT-05 | `APP_FILTER`, Zod pipe, error helper, test controller | `platform/errors/`; a provider line in `platform.module.ts` | Edit `settings/`. Settings `BootError` is a 500 for it (decision 20) |
| PLT-06 | stream and echo controllers, publisher | `platform/events/`; lines in the controllers, providers and exports arrays | Edit `settings/`. Stream shutdown stays in `beforeApplicationShutdown` (PLT-04 bullet 11) |
| PLT-08 | predicate and `connection` listener | `platform/tailnet/`; a provider line in `platform.module.ts` | No settings dependency. Its hook order is independent of PLT-07's |
| PLT-11 | root `dev` script, `concurrently`, absolute env dirs | root `package.json`; the `apps/api` script only | Change any `apps/api/src` file. Its demo step 4 (unit line 38) must show the envelope message of section 4, which PLT-07 produces |
| AGL-06 | the `agent` registration and settings routes | `apps/api/src/modules/agent-loop/`; a provider factory with `inject: [SettingsService]`; imports the platform entry only | Edit `settings/`. Its default `{schemaVersion: 1, stepCap: 12, research: {enabled: false}}` is non-null, so boot writes it (AGL-06 Decisions line 15) |

PLT-11 is blocked by PLT-07 (unit line 7), so PLT-07 merges first. Other consumers use the same API and need no change to their units: PST-02 and PST-04 (`projects`, default `{schemaVersion: 1, active: null}`), SAU-02 (`setupAuth`, non-null default), MPR-02 (`providers`, default `null`), TRG-01 and TRG-09 (`tools`; the default is not stated, and both `null` and non-null work).

## 6. Open points

1. **Contract envelope against the unit (decided: option (a)).** The unit keeps unknown top-level keys and leaves `null`-default sections absent. `settingsEnvelopeSchema` (`settings.ts` line 22) rejects unknown top-level keys and requires all five sections, and PLT-02's test pins both (`platform.schema.test.ts` lines 231, 237 and 242). Decided: PLT-07 does not parse the file with `settingsEnvelopeSchema`. It checks the envelope and each section's `schemaVersion` itself, using `SETTINGS_SECTION_KEYS` and `SETTINGS_SCHEMA_VERSION` (`settings.ts` lines 4 and 7 to 13). The contract and PLT-02's test stay unchanged. Rejected: option (b), an expand-contract change to `settings.ts`, because it changes a published contract. Reason and source: DECISIONS "2026-11-12 — PLT-07 — open point 1", commit 3581240.
2. **Section refusal runs in a fixture (decided).** `dist/main.js` has no test-only section, and `modules` takes only static classes (`bootstrap.ts` line 13), so the spawned `main.js` cannot register one. Decided: case (a) spawns the real `dist/main.js`. Case (b) runs `test/fixtures/boot-with-test-section.cjs` (step 5), which calls the real built `bootstrap()` and copies only the `main.ts` wrapper (a `BootError` written to stderr, then exit 1). A change to `main.ts`'s wrapper must be copied into the fixture. Rejected: an in-process test of `bootstrap()` with no exit check, because it weakens the criterion; and a file-driven test section in the spawned `main.js`, because it adds production surface. Reason and source: DECISIONS "2026-11-12 — PLT-07 — open point 2", commit 4fe0c99.
3. **Lines in `platform.module.ts` (decided).** The brief says one entry. Decided: three lines, which are a `providers` entry, an `exports` entry and the re-export of the class and types from the entry (rule R1). Reason: DI needs the provider and the export, and R1 needs the re-export. This is a driver decision, because PLT-05, PLT-06 and PLT-08 also add their own entries to this shared file. Rejected: a separate `SettingsModule` imported by the platform module, which still needs an `exports` edit.

## 7. Facts checked and facts assumed

Facts checked (file, line or command):
- `git status --short` empty; `git log --oneline -8` starts at `bd95da8` on `main`.
- Unit `units/PLT-07-settings-migration-hook.md`: front matter line 7 (`blocked_by: [PLT-04]`); Decisions lines 18 to 25; Scope line 28; criteria lines 31 to 36.
- `units/README.md` lines 67 to 70 (gates), 129 (`settings.yaml`), 133 (testing).
- `modules/platform.md` lines 29 (parallelism), 35 to 44 (settled decisions), 41 (`settings.yaml` ownership).
- `plans/DECISIONS.md` line 418 (PLT-07 and PLT-08 provider line), 419 (newer schemaVersion throws `BootError`), 426 (each of PLT-05 to PLT-08 adds one line), 456 (scratch lint: same-module import passes, cross-module `boot/env` flagged), 460 (CommonJS decision).
- `plans/PLT-04.md` lines 25 (bullet 6, raw `SCRIBA_LIBRARY`), 27 to 30 (bullet 8, boot order), section 4 (test pattern), line 200 (PLT-07 row of section 5), lines 210 to 213 (open point 1).
- `packages/contracts/src/platform/settings.ts` lines 4 (`SETTINGS_SCHEMA_VERSION`), 7 to 13 (`SETTINGS_SECTION_KEYS`), 22 (`settingsEnvelopeSchema`, which ends at line 27), 31 (type). `index.ts` exports `settings.js`; `package.json` exports `./platform`.
- `packages/contracts/test/platform.schema.test.ts` lines 208 to 244 (accepts five sections; rejects `schemaVersion: 2`, an unknown top-level key and a section without an integer `schemaVersion`; keys match the constant).
- `apps/api/src/bootstrap.ts` lines 26 to 51 (env, app-state, create, init, no listen; `modules?: Type<unknown>[]` at line 13). `main.ts` lines 4 to 18 (`BootError` branch at lines 9 to 14). `app.module.ts` lines 26 to 40. `platform.module.ts` lines 5 to 12. `boot/env.ts` line 10 (`SCRIBA_ENV`). `boot/app-state.ts` line 9 (`join(SCRIBA_BOOKS_DIR, '.scriba')`). `boot/stdout-logger.ts` lines 5 to 10 (`info` enables `log`).
- `apps/api/test/create-test-app.ts` lines 34 to 82 (temp library removed only when owned; `modules` replaces `COMPOSED_MODULES`). `test/env-boot.test.ts` lines 13 to 22 (spawn pattern). `test/app-state.test.ts` lines 49 to 59 (child env built from scratch).
- `apps/api/package.json` (no `yaml`); `apps/api/tsconfig.json` (`include` `src` and `test`); `tsconfig.build.json` (`include` `src`); `vitest.config.mts` (`include` `test/**/*.test.ts`).
- Root `package.json` line 34 (`yaml` 2.9.1 devDependency). `package-lock.json` lines 10488 to 10492 (`node_modules/yaml` 2.9.1, `"dev": true`).
- Nest 12.4.2 (`npm pack @nestjs/core@12.4.2`, unpacked in `/tmp/plt07-probe`): `nest-application.js` lines 113 to 141 (`init()` runs `callInitHook`, then `registerRouterHooks`, then `callBootstrapHook`, with no catch and a `finally` that flushes logs). `nest-application-context.js` lines 277 to 304 (hooks run module by module). `nest-factory.js` line 104 (`logger.log(APPLICATION_START)` inside `create`). The `logger.error` calls (`nest-application-context.js` line 332, `nest-application.js` line 306) are a preview-mode guard and a `listen` error, not the close path.
- `@nestjs/common` 12.4.2 (`npm pack`): `services/console-logger.service.js` line 103 (`log` to stdout) and line 110 (`error` to stderr).
- `yaml` 2.9.1 (`npm pack yaml@2.9.1`): `dist/index.d.ts` line 19 exports `parse`, `stringify` and `parseDocument`.
- Unit consumers: `units/AGL-06-agent-settings.md` lines 7 and 15; `units/PLT-11-scaffold-gate.md` lines 7 and 38; `units/PST-02-module-skeleton-path-safety.md` line 26; `units/PST-04-active-project-switching.md` line 18; `units/SAU-02-token-store-setup-url.md` line 25; `units/MPR-02-registry-seeding.md` lines 19 and 28; `units/TRG-01-contract-slice.md` line 33; `units/TRG-09-read-endpoints-enabled.md` line 20; `units/PLT-02-contracts-package-platform-slice.md` line 35; `modules/project-store.md` line 76; `modules/tool-registry.md` line 43; `modules/providers.md` line 37; `modules/agent-loop.md` line 57.
- Installed packages: the root `node_modules` has no `@nestjs` and no `yaml`, and `apps/api/node_modules` has no `@nestjs`. The lint plugin `eslint-plugin-boundaries` is not installed, so no lint was run.

Facts assumed (ASSUMED):
- A1. `npm install --package-lock-only --ignore-scripts` changes only the `apps/api` entry and clears `dev` on `node_modules/yaml` (step 2 checks it; not run).
- A2. Renaming a temp file over `settings.yaml` gives the target a new inode on Linux and macOS (AC 6 relies on it).
- A3. A provider with `useFactory` and `inject` runs during `NestFactory.create`, before the `init()` hooks, so registration is complete when the boot hook runs (AC 1 checks it).
- A4. `unplugin-swc` handles `@Module` and `@Controller` in test files, as PLT-04's tests assume. PLT-04 is done, but this was not re-run.
- A5. The `.cjs` fixture can `require` `dist/` and the ESM-only Nest packages on Node 26, as PLT-04 open point 1 and `dist/bootstrap.js` assume.
- A6. With `SCRIBA_LOG_LEVEL=error` the refusal path prints nothing to stdout, since no `log` or `error` call runs on that path (from the Nest source above; not run).

Not verified:
- Nothing was built or run in this checkout. Every behaviour claim comes from files and the packed source.
- The lock result of step 2 (A1).
- The lint result of step 11. DECISIONS line 456 reports a scratch lint run that passed a same-module import.
