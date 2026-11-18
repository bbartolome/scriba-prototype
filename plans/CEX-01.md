---
id: CEX-01
status: planned
unit: units/CEX-01-contract-slice.md
module: compile-export
---
# CEX-01 plan — compile-export contract slice and the narrowed project.yaml `order` and `export`

Revised by the reviser against main `c05de97` (no change under `packages/`, `units/`, `modules/`, `scripts/`, `examples/` or `apps/` since the planner's base `f1a301b`: `git diff --stat f1a301b c05de97 -- <those paths>` is empty). The main correction of the revision is section 4a: the narrowed shapes are defined in a new project-store file and re-exported by compile-export, because an import of `compile-export` from `project-store/project.ts` would make the tool-registry and graph-runner subpaths load the compile-export folder (F23). Section 10 records how each open point was settled.

Draft, planned by the planner against main `f1a301b` (`git rev-parse --short HEAD`). The working tree had uncommitted edits to `plans/GRR-10.md` and `plans/GRR-16.md` made by other units; this plan does not read or depend on them. "CHECKED" means read or run on main, with the file and line. "ASSUMED" means not run here (section 3b). The unit file has no change notes: its only commits are `2fed3f4` and `098add9`, and neither adds a note.

## 1. Summary

The unit publishes the `compile-export` subpath of `@bbartolome/scriba-contracts` and narrows two optional keys of the Project store's `project.yaml` schema (`order` to `OrderEntry[]`, `export` to `ExportSettings`). The slice holds Zod schemas, TypeScript types, constants, route constants, error codes and SSE members. It has no runtime logic. Three acceptance criteria. Tests: C1 (subpath exports only data, and resolves from apps/api and apps/web), C2 (Zod refusals), C3 (project.yaml accepts with and without the two keys, and the nonfiction sample check passes). Section 7 lists them with their commands.

## 2. Decisions this plan obeys

### 2a. Settled by the unit, the module and the record

- **S1 Content of the subpath.** "Zod schemas + TS types + constants only" (`units/CEX-01-contract-slice.md` line 14). Criterion 1 requires the subpath to export only shapes and constants (line 30). The existing export tests treat every export as data: `packages/contracts/test/agent-loop.exports.test.ts` line 92 (`DATA_KINDS = object, string, number, boolean`) and line 155.
- **S2 The shapes.** Each shape of the unit, lines 17 to 26, is in section 4 with its name. No shape is added or removed.
- **S3 The narrowing.** `order` becomes `OrderEntry[]` and `export` becomes `ExportSettings`, both still optional (`units/CEX-01-contract-slice.md` line 27; `units/PST-01-contract-slice.md` lines 22 and 24: "passthrough until Compile & export narrows them"; `modules/project-store.md` line 81: "a placeholder Compile & export narrows via expand–contract; it stays optional").
- **S4 Module decisions the slice must not contradict.** Status and part live on order entries, not in front matter (`modules/compile-export.md` line 49). Every order write materialises the full order (line 50; the write rule is CEX-03's). Graph-ordered files form a leading block (line 47; the flag `graphOrdered` carries it). Membership is `.md` files in `drafts/` (line 43). Events use the Platform envelope with `module: 'compile-export'` and four members (line 44; unit line 25). HTTP: `/api/compile-export/…`, GET never mutates, commands are POST (line 40).
- **S5 Test seam.** External behaviour only, and unit tests never read `examples/` (`modules/compile-export.md` lines 57 to 63; `units/README.md`, "Conventions shared by every module", Testing bullet). For a contract slice, the external behaviour is what a consumer gets from the built subpath and from `safeParse`. The existing tests do this (section 7).
- **S6 Error codes.** Prefix `COMPILE_` (`packages/contracts/src/platform/errors.ts` line 13; the `ERROR_CODE_PREFIXES` list). The unit names ten codes (line 26). The Platform convention is a constant map with an HTTP status (`PLATFORM_ERROR_STATUS`, `platform/errors.ts`).
- **S7 Blockers.** `PLT-11`, `PST-01`, `GRR-01` and `AGL-01` each have `status: done` on main (checked with `git show main:plans/<ID>.md`, line 2). The slice imports nothing from graph-runner or agent-loop, so their `blocked_by` entries are ordering only (section 3a, F14).
- **S8 Contract changes.** Once published, contracts change by expand–contract, and persisted formats carry their own `schemaVersion` (`units/README.md`, "Conventions shared by every module", Contracts and Errors bullets).

### 2b. Planner's choices (the simplest option that the sources allow)

- **P1 Layout.** Nine source files split by concern, and an `index.ts` barrel with one `export *` per file. This is the layout of `packages/contracts/src/project-store/` (`index.ts`, lines 1 to 10) and `packages/contracts/src/agent-loop/index.ts`.
- **P2 Enums and constants.** Each enum is a literal `as const` tuple followed by `z.enum(tuple)`. Each pattern and default is a named constant. The comment at the head of `packages/contracts/src/agent-loop/constants.ts` line 3 gives this rule.
- **P3 Defaults are constants, not Zod defaults.** The unit gives defaults for `ManuscriptStatus` (`draft`) and `ManuscriptPart` (`body`) (line 17), and for `lang` and `bibliography` (line 19). Its rule "Defaults are applied at read time, never written back" (line 19) is stated for `ExportSettings`. This plan applies it to `OrderEntry` as well, because a Zod `.default()` on an order entry would write `status: draft` into `project.yaml` on every order write. Defaults are therefore constants: `MANUSCRIPT_STATUS_DEFAULT`, `MANUSCRIPT_PART_DEFAULT`, `EXPORT_LANG_DEFAULT`, `BIBLIOGRAPHY_DEFAULT`, `BIBLIOGRAPHY_DEFAULT_BY_PACK`. CEX-02 applies them when it builds the view (O9, settled in section 10).
- **P4 Manuscript path rule.** `manuscriptPathSchema` is `z.string().regex(MANUSCRIPT_PATH_PATTERN)`: a string that starts with `drafts/`, has no empty, `.` or `..` segment, and has no backslash, NUL or leading slash. The pattern is a named constant (P2), not a `refine` callback, so the built slice holds no function. `MANUSCRIPT_PATH_PATTERN` = `/^drafts\/(?:(?!\.{1,2}(?:\/|$))[^/\\\0]+\/)*(?!\.{1,2}$)[^/\\\0]+$/` (checked with Node 26.13.0 and Zod 4.6.7 by the reviser: accepts `drafts/ch01.md`, `drafts/sub/x.md`, `drafts/..x.md`; refuses `graphs/story.json`, `project.yaml`, `ch01.md`, `/drafts/ch01.md`, `drafts/../project.yaml`, `drafts/`, `drafts//a.md`, `drafts/a\b.md`, a NUL, `drafts/.`, `drafts/./a.md`). The unit requires "must be in drafts/" (line 18) and a refusal of a path outside `drafts/` (line 31). Other path rules stay with the module's path function (`packages/contracts/src/project-store/files.ts` lines 3 and 4). Membership (top-level `.md` files) is CEX-02's rule, so `drafts/sub/x.md` passes this schema and is reported as stale by CEX-06.
- **P5 `revision` format.** `manuscriptRevisionSchema` is `contentHashSchema` (`sha256:` plus 64 lowercase hex digits; `packages/contracts/src/project-store/files.ts` line 12). The unit says only "revision" (line 20) and CEX-02 says "hash" (`units/CEX-02-effective-order-view-model.md` line 32). What the hash covers is not part of the contract: the manuscript view's `revision` is CEX-02's (order field plus file set), and the settings view's `revision` is a separate field that CEX-14 defines (O1, settled in section 10).
- **P6 Route paths.** Constants under `/api/compile-export/`, listed in section 4. The unit names none. CEX-02 names `GET /api/compile-export/manuscript` (line 32), CEX-05 names `POST …/preflight` (line 18), CEX-10 names `POST …/export` (line 15). The other methods are named without paths (`units/CEX-03-order-writes.md` line 18; `units/CEX-14-template-overrides-settings.md` lines 15 and 17; `units/CEX-16-snapshot-api.md` lines 19 to 21). The project-store convention is followed: each path is a constant with `as const` and a comment on the method (`packages/contracts/src/project-store/routes.ts` lines 1 and 2). Settled in section 10 (O3).
- **P7 HTTP status of each error code.** Chosen by the project-store pattern (`packages/contracts/src/project-store/errors.ts` lines 56 to 75: `PROJECT_ERROR_STATUS` uses 409 for state conflicts such as `PROJECT_WRITE_CONFLICT`, 422 for `PROJECT_INVALID`, 404 for not found; its comment says the 404 and 409 choices follow the providers' codes and 422 is a request-body status): 409 for a state conflict, 422 for a request the server refuses, 404 for not found, and, with no precedent in that map, 504 for a timeout and 500 for a failed child process. Table in section 4. Settled in section 10 (O4).
- **P8 Discriminators.** SSE members use `type`, as the envelope does (`packages/contracts/src/project-store/events.ts`). Manuscript warnings use `kind`, as `origin.kind` does in `packages/contracts/src/project-store/pending.ts`.
- **P9 Looseness.** `orderEntrySchema`, `exportSettingsSchema` and `snapshotManifestSchema` are `z.looseObject`, so unknown keys survive. Their sibling `projectYamlSchema` is loose (`project.ts` line 20), and the existing test C2 requires an order entry's unknown key to survive (`packages/contracts/test/project-store.schema.test.ts` lines 159 to 166). The API test U1 also needs a loose `export`: it writes `export: {template: default}` and patches it to `{template: 'custom'}` through `updateProjectYaml`, which validates with `projectYamlSchema` (`apps/api/test/project-store-files-helpers.test.ts` lines 95 to 150; F24). Requests and views are `z.object`.
- **P10 Finding paths.** A preflight finding's `path` is `projectPathSchema`, not the manuscript path, because an orphan scene or a stale entry can name a path outside `drafts/` (`units/CEX-06-claims-orphans-checks.md`, "Orphan scenes" cases (a) and (b)). `line` is an integer from 1 (one-based).
- **P11 Finding `ref`.** An optional record, `z.record(z.string(), z.unknown())`. The unit gives no shape, and CEX-06 says only "claim text and cited passage as `ref`" (`units/CEX-06-claims-orphans-checks.md` line 16). Settled in section 10 (O2).
- **P12 Preflight summary.** `{ranAt, revision, errors, warnings, infos}` with counts. CEX-18 shows "N errors" (`units/CEX-18-preflight-export-panels.md` line 16), and the export result carries the summary (`units/CEX-10-pandoc-runner-md-export.md` line 15).
- **P13 Snapshot words and the unreadable flag.** The summary carries `unreadable?` (unit line 24). Its `words` is `{body, total}` (the manifest's shape, unit line 24) and is `null` when the manifest cannot be read. Settled in section 10 (O5).
- **P14 Copy-default format.** `docx | epub | pdf` only. `md` has no template (`units/CEX-14-template-overrides-settings.md` line 16 and its copy-default bullet). Settled in section 10 (O6).
- **P15 Event data.** `{projectId, …}` in each member, as the Project store's events do (`packages/contracts/src/project-store/events.ts`, lines 6 to 10). The fields are listed in section 4. Settled in section 10 (O8).
- **P16 Bibliography default.** `BIBLIOGRAPHY_DEFAULT_BY_PACK` maps `nonfiction` to `all`, and `BIBLIOGRAPHY_DEFAULT` is `off` for every other pack (unit line 19). The contract exports only constants, so no function selects the default (S1).

## 3. Facts checked and assumed

### 3a. CHECKED (main `f1a301b`)

- **F1.** `packages/contracts/src/compile-export/index.ts` is one line, `export {};`.
- **F2.** `packages/contracts/package.json` already has the `./compile-export` entry in `exports` (`dist/compile-export/index.js` and `.d.ts`). Its `build` is `tsc -p tsconfig.build.json && tsc --noEmit -p tsconfig.json`, and its only runtime dependency is `zod` `^4.6.7`.
- **F3.** `packages/contracts/src/project-store/project.ts`: line 19 is the comment "`export` and the entries of `order` stay passthrough until Compile & export narrows them"; line 20 is `projectYamlSchema = z.looseObject({`; line 25 is `export: z.looseObject({}).optional()`; line 27 is `order: z.array(z.looseObject({})).optional()`.
- **F4.** `packages/contracts/src/project-store/files.ts`: `projectPathSchema = z.string()` (line 6), `fileReferenceSchema = z.string()` (line 9), `contentHashSchema = z.string().regex(CONTENT_HASH_PATTERN)` (line 12). Its comment at lines 3 and 4 gives the path rules to the path function, not the contract.
- **F5.** `packages/contracts/src/project-store/constants.ts`: `CITATION_PATTERN` is unanchored and has no `g` flag (line 7); `CONTENT_HASH_PATTERN` is at line 11.
- **F6.** `packages/contracts/src/platform/errors.ts`: `ERROR_CODE_PREFIXES` includes `'COMPILE'` (line 13). `errorCodeSchema` accepts `^(PREFIX)_[A-Z0-9]+(_[A-Z0-9]+)*$`.
- **F7.** `packages/contracts/src/platform/events.ts` line 15 is `sseEnvelopeSchema = z.object({module: z.enum(PUBLISHING_MODULE_SLUGS), type, data: z.unknown()})`. `PUBLISHING_MODULE_SLUGS` in `platform/slugs.ts` includes `compile-export`.
- **F8.** `packages/contracts/src/project-store/events.ts`: the members are `sseEnvelopeSchema.extend({module: z.literal(...), type: z.literal(...), data})`, and the union is `z.discriminatedUnion('type', [...])`.
- **F9.** `packages/contracts/src/project-store/errors.ts`: `PROJECT_ERROR_CODES` (line 5), `PROJECT_ERROR_CODE_VALUES` (line 29), `projectErrorCodeSchema` (line 52), `PROJECT_ERROR_STATUS` (line 58).
- **F10.** `packages/contracts/src/project-store/routes.ts` lines 1 and 2: the header comment on paths, GET and POST, and query strings.
- **F11.** `packages/contracts/test/project-store.schema.test.ts` C2 (lines 137 to 166) passes `order: [{path: 'drafts/ch01.md', status: 'draft'}]` and `order: [{path: 'drafts/ch01.md', futureOrderKey: true}]`, and expects the second's unknown key to survive (lines 159 to 166). Both pass the narrowed `orderEntrySchema` in section 4. No other test or fixture in `packages/` writes `order` or `export`.
- **F12.** `packages/contracts/test/project-store.exports.test.ts` has no rule on relative imports that leave the slice (the only check is `isExternal`, line 82). `agent-loop.exports.test.ts` lines 209 to 216 allow relative imports that leave the slice only into `platform` and `project-store`. The new compile-export test in section 7 uses the same rule.
- **F13.** `scripts/subpaths.test.mjs` lists the ten subpaths (line 14) and requires each from `apps/api` (line 42).
- **F14.** The four blockers are `status: done` on main (`git show main:plans/PLT-11.md` and the other three, line 2). Graph-runner and agent-loop are not imported by any `compile-export` file: the slice is new, and `packages/contracts/src/compile-export/` holds only `export {};` (F1).
- **F15.** `apps/web/src/contracts-boot.ts` line 11 imports `@bbartolome/scriba-contracts/compile-export`, so `ng build` of the web app already resolves this subpath (a build-time check, lines 1 to 3 of that file).
- **F16.** `scripts/examples-check/m1.mjs` lines 137 to 165 parse every `project.yaml` at any depth with `projectYamlSchema`. The root `package.json` line 27 is `lint:examples`: it builds contracts and api, then runs `scripts/examples-check/index.mjs`. `npm run lint` (root line 26) runs `lint:examples` and `prettier --check .`.
- **F17.** `apps/api/src/modules/project-store/project-yaml.ts` line 39 calls `projectYamlSchema.safeParse(value)`. Its state reads only `title` and `genrePack`, so a `project.yaml` with an invalid `order` or `export` becomes `invalid` after this change. That is the intended effect of a narrowing.
- **F18.** `examples/nonfiction/project.yaml` has neither `order` nor `export` (four lines: a comment, `schemaVersion`, `title`, `genrePack`). No code on main writes these keys: `apps/api/src` has no `order:` or `export:` writer, and no `compile-export` module exists yet (`apps/api/src/modules` has no `compile-export` folder).
- **F19.** `eslint.config.mjs` lines 27 to 34 bind only `api-module` and `web-feature` elements. `packages/contracts` is not bound by the boundaries rules, so cross-slice contract imports are checked only by the export tests (F12).
- **F20.** Zod 4.6.7 is installed in `packages/contracts`. Checked with `node -e` from that folder: `z.string().refine(...)` accepts and refuses by prefix; `z.looseObject` keeps an unknown key; `z.array(z.string())` refuses a string; `z.record(z.string(), z.unknown())` accepts an object; `z.looseObject({a: z.string().optional()}).parse({})` returns `{}` with no key added.
- **F21.** Downstream units read in full: CEX-02, CEX-03, CEX-04, CEX-05, CEX-06, CEX-07, CEX-08, CEX-09, CEX-10, CEX-14, CEX-16, CEX-17, CEX-18, CEX-19, CEX-20. Consumers outside the module: `units/AGL-24-compile-tools.md` line 17 (manuscript view model, preflight request and result, export request and result), `units/GNP-19-fiction-gate.md` line 17 (manuscript order from the API).
- **F22.** Between `ce207d3` (the first read) and `f1a301b` (the base of this plan), the unit file, `modules/compile-export.md`, `packages/contracts`, the unit and plan of PST-01, and the unit files of CEX-02, CEX-08 and CEX-17 did not change (`git diff --stat ce207d3 f1a301b -- <paths>` is empty).

Added by the reviser (main `c05de97`):

- **F23. The planner's import direction breaks two done criteria.** `packages/contracts/src/tool-registry/call.ts` line 2 and `packages/contracts/src/graph-runner/graph.ts` line 2 import `../project-store/index.js`, which re-exports `project.js` (`project-store/index.ts` line 4). If `project.ts` imported `../compile-export/order.js`, requiring `/tool-registry` or `/graph-runner` would load the `compile-export` folder of `dist`. `test/tool-registry.exports.test.ts` C1 (lines 16 and 158 to 164: `ALLOWED_FOLDERS = platform, project-store, tool-registry`, read from `require.cache` by `fixtures/nest-style/tool-registry-consumer.cjs` lines 11 to 23) and `test/graph-runner.exports.test.ts` C1 (lines 15 to 20 and 170 to 175) would fail. These tests check the done criteria TRG-01 ("no other subpath than `/project-store` and `/platform`", `units/TRG-01-contract-slice.md` line 36) and GRR-01 ("importing only from `/tool-registry`, `/project-store` and `/platform`", `units/GRR-01-contract-slice.md` line 35). It would also make a slice cycle (compile-export imports project-store, project-store imports compile-export). Correction: section 4a.
- **F24.** `apps/api/test/project-store-files-helpers.test.ts` U1 (lines 95 to 150) uses a `project.yaml` with `export: {template: default}` and patches `export` to `{template: 'custom'}` and to `null`; `updateProjectYaml` refuses an invalid result with 422 (lines 177 to 189). The narrowed `export` keeps the unknown key `template` because `exportSettingsSchema` is loose (P9), so U1 still passes. No other file under `apps/`, `e2e/`, `packages/packs/` or `examples/` has an `order` or `export` key in a `project.yaml` (grep).
- **F25.** `packages/contracts/test/agent-loop.exports.test.ts` test C1b (lines 148 to 194; lines 192 and 193) refuses `function` and `=>` in the agent-loop's built source only; the compile-export slice is not bound by that test, but P4 uses a regex so the slice holds no callback either way.
- **F26.** `packages/contracts/src/project-store/events.ts` line 4 imports `projectIdSchema` from `./project.js`; the compile-export event data use the same schema, imported from `../project-store/project.js` (step 1). `project.ts` imports only `./constants.js`, `./entities.js` and the new `./order-export.js`, so this import makes no cycle.
- **F27.** Route style: graph-runner's routes name no `:projectId` (`packages/contracts/src/graph-runner/routes.ts` lines 5 to 19; the active project is implied), and CEX-02 names `GET /api/compile-export/manuscript` without one (`units/CEX-02-effective-order-view-model.md` line 32). The compile-export routes follow this.
- **F28.** No file `units/CEX-2*.md` other than `units/CEX-20-milestone-gate.md` exists; no split is made by this revision. Only `unit/GRR-10`, `unit/GRR-16`, `unit/TRG-14` and old backups exist as `unit/*` branches.

### 3b. ASSUMED (not run here)

- **A1.** The baseline `npm run build`, `npm test` and `npm run lint` pass on main. Not run: the tree is shared with other units.
- **A2.** `ng build` in `apps/web` still passes after the subpath gains content. The content is plain Zod and constants, and no Angular file imports a new name.
- **A3.** Vitest collects `packages/contracts/test/*.test.ts` without configuration (the existing files show it). Prettier 3 accepts the new files as it accepts the existing ones (checked in the procedure).

## 4. The contract: what the subpath exports

Names are final. Downstream units use them (section 8). Each schema has a `z.infer` type with the same name in PascalCase (`ManuscriptStatus`, `OrderEntry`, and so on), as the project-store does. The build type-checks them.

Names marked (4a) are defined in `packages/contracts/src/project-store/order-export.ts` and re-exported, unchanged, by the compile-export file under which they are listed. Each such name is re-exported by exactly one compile-export file, so the barrel has no duplicate (TS2308).

**`constants.ts`**
- `MANUSCRIPT_STATUSES` = `['outline','draft','revised','final']` (4a); `manuscriptStatusSchema` (4a); `MANUSCRIPT_STATUS_DEFAULT` = `'draft'`.
- `MANUSCRIPT_PARTS` = `['front','body','back']` (4a); `manuscriptPartSchema` (4a); `MANUSCRIPT_PART_DEFAULT` = `'body'`.
- `ORDER_SOURCES` = `['alphabetical','project','graph+project']`; `orderSourceSchema`.
- `MANUSCRIPT_FOLDER` = `'drafts/'` (4a); `MANUSCRIPT_PATH_PATTERN` (4a; P4).
- `EXPORT_FORMATS` = `['md','docx','epub','pdf']`; `exportFormatSchema`.
- `TEMPLATE_FORMATS` = `['docx','epub','pdf']`; `templateFormatSchema` (P14).
- `BIBLIOGRAPHY_MODES` = `['off','all','cited']` (4a); `bibliographyModeSchema` (4a); `BIBLIOGRAPHY_DEFAULT` = `'off'`; `BIBLIOGRAPHY_DEFAULT_BY_PACK` = `{nonfiction: 'all'}` (P16).
- `EXPORT_LANG_DEFAULT` = `'en'`.
- `PREFLIGHT_CHECK_IDS` = `['placeholders','unsupported-claims','orphan-scenes','entity-links','banned-phrases']`; `preflightCheckIdSchema`.
- `FINDING_SEVERITIES` = `['error','warning','info']`; `findingSeveritySchema`.
- `CHECK_STATUSES` = `['pass','warn','fail']`; `checkStatusSchema`.
- `PLACEHOLDER_WORDS` = `['TK','TKTK','TODO','FIXME','XXX']`.
- `PLACEHOLDER_PATTERN` = `/\b(?:TKTK|TK|TODO|FIXME|XXX)\b|\{\{[^{}\n]*\}\}/`: unanchored, no `g` flag, case-sensitive (the unit's whole-word and `{{…}}` rule, line 22 and CEX-05 line 19).
- `SNAPSHOT_SCHEMA_VERSION` = `1`.

**`order.ts`**
- `manuscriptPathSchema` (4a) = `z.string().regex(MANUSCRIPT_PATH_PATTERN)`: starts with `MANUSCRIPT_FOLDER`, no empty, `.` or `..` segment, no backslash, NUL or leading slash (P4).
- `manuscriptRevisionSchema` = `contentHashSchema` (P5).
- `orderEntrySchema` (4a) = `z.looseObject({path: manuscriptPathSchema, status: manuscriptStatusSchema.optional(), part: manuscriptPartSchema.optional()})`.
- `manuscriptEntrySchema` = `{path: manuscriptPathSchema, part, status, words (int ≥ 0), graphOrdered (boolean), inOrderField (boolean)}`.
- `manuscriptTotalsSchema` = `{body, manuscript}`, integers ≥ 0 (unit line 20).
- `manuscriptWarningSchema` = discriminated union on `kind`: `{kind: 'graphCycle', files: projectPathSchema[]}`, `{kind: 'invalidGraph', path: projectPathSchema}`, `{kind: 'staleEntry', path: projectPathSchema}`.
- `manuscriptViewSchema` = `{entries, totals, orderSource, warnings, revision}`.
- `manuscriptReorderRequestSchema` = `{revision, front, body, back}`, each list an array of `manuscriptPathSchema`.
- `manuscriptStatusRequestSchema` = `{revision, path: manuscriptPathSchema, status}`.
- `manuscriptPartRequestSchema` = `{revision, path: manuscriptPathSchema, part}`.

**`settings.ts`**
- `exportSettingsSchema` (4a) = `z.looseObject`, every key optional: `author`, `penName`, `contact`, `subtitle`, `lang`, `rights`, `dedication` (strings); `bibliography` (`bibliographyModeSchema`); `docxReferenceDoc`, `epubCss`, `typstTemplate` (`fileReferenceSchema`, project-relative). No Zod default (P3).
- `exportSettingsViewSchema` = `{revision: manuscriptRevisionSchema, settings: exportSettingsSchema}` (response of GET settings). Its `revision` is the settings revision, a field separate from the manuscript view's `revision`; what it covers is CEX-14's (O1). Source comment: "The settings revision; CEX-14 defines what it covers."
- `exportSettingsWriteSchema` = `{revision: manuscriptRevisionSchema, settings: exportSettingsSchema}` (body of POST settings).
- `copyDefaultRequestSchema` = `{format: templateFormatSchema, path: fileReferenceSchema}`.

**`preflight.ts`**
- `preflightRequestSchema` = `z.object({})` (the preflight request carries no fields).
- `preflightFindingSchema` = `{check: preflightCheckIdSchema, severity: findingSeveritySchema, path: projectPathSchema, line?: int ≥ 1, offset?: int ≥ 0, length?: int ≥ 0, message: string, ref?: record}` (P10, P11).
- `preflightCheckSchema` = `{id: preflightCheckIdSchema, status: checkStatusSchema, findings: [...]}`.
- `preflightResultSchema` = `{ranAt (iso datetime), revision, checks}`.
- `preflightSummarySchema` = `{ranAt, revision, errors, warnings, infos}`, counts as integers ≥ 0 (P12).

**`export.ts`**
- `exportRequestSchema` = `{format: exportFormatSchema}`.
- `exportResultSchema` = `{format, fileName (string, min 1), bytes (int ≥ 0), downloadUrl (string, min 1), preflight: preflightSummarySchema, warnings: string[]}`.

**`snapshots.ts`**
- `snapshotIdSchema` = string, min 1.
- `snapshotWordsSchema` = `{body, total}`, integers ≥ 0.
- `snapshotSummarySchema` = `{id, label, createdAt (iso datetime), fileCount (int ≥ 0), words: snapshotWordsSchema.nullable(), unreadable?: boolean}` (P13).
- `snapshotListSchema` = `{snapshots: snapshotSummarySchema[]}`.
- `snapshotCreateRequestSchema` = `{label: string, min 1}`.
- `snapshotRestoreRequestSchema` = `{id: snapshotIdSchema}`.
- `snapshotManifestSchema` = `z.looseObject({schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION), label, createdAt, appVersion (string, min 1), order: orderEntrySchema[], words: snapshotWordsSchema})` (unit line 24; CEX-16 Layout bullet).

**`events.ts`**
- Data (each `projectId` is `projectIdSchema` from `../project-store/project.js`, F26): `manuscriptUpdatedDataSchema` = `{projectId, revision}`; `exportFinishedDataSchema` = `{projectId, format, fileName}`; `snapshotCreatedDataSchema` = `{projectId, snapshot: snapshotSummarySchema}`; `snapshotRestoredDataSchema` = `{projectId, snapshotId}`.
- `compileExportEventSchema` = `z.discriminatedUnion('type', [...four members...])`. Each member is `sseEnvelopeSchema.extend({module: z.literal('compile-export'), type: z.literal(...), data: ...})` (F8). `sseEnvelopeSchema` comes from `../platform/events.js` (F7), the one import from platform.

**`routes.ts`** (all `as const`, each with a comment on its method)
- `MANUSCRIPT_ROUTE` = `/api/compile-export/manuscript` (GET).
- `MANUSCRIPT_REORDER_ROUTE` = `/api/compile-export/manuscript/reorder` (POST).
- `MANUSCRIPT_STATUS_ROUTE` = `/api/compile-export/manuscript/status` (POST).
- `MANUSCRIPT_PART_ROUTE` = `/api/compile-export/manuscript/part` (POST).
- `PREFLIGHT_ROUTE` = `/api/compile-export/preflight` (POST).
- `EXPORT_ROUTE` = `/api/compile-export/export` (POST).
- `EXPORT_DOWNLOAD_ROUTE` = `/api/compile-export/exports/:format` (GET; no side effects, CEX-10 line 16).
- `EXPORT_SETTINGS_ROUTE` = `/api/compile-export/settings` (GET and POST).
- `EXPORT_COPY_DEFAULT_ROUTE` = `/api/compile-export/template/copy-default` (POST).
- `SNAPSHOTS_ROUTE` = `/api/compile-export/snapshots` (GET list, POST create).
- `SNAPSHOT_RESTORE_ROUTE` = `/api/compile-export/snapshots/restore` (POST).

**`errors.ts`**
- `COMPILE_ERROR_CODES` (short key to code, as `PROJECT_ERROR_CODES`): `ORDER_CONFLICT` → `COMPILE_ORDER_CONFLICT`; `INVALID_REORDER`; `GRAPH_ORDERED_MOVE`; `EXPORT_BUSY`; `PANDOC_FAILED`; `PANDOC_TIMEOUT`; `TEMPLATE_INVALID`; `EMPTY_MANUSCRIPT`; `SNAPSHOT_NOT_FOUND`; `SNAPSHOT_UNREADABLE` (the ten codes of unit line 26).
- `COMPILE_ERROR_CODE_VALUES` = the same ten as a literal tuple; `compileErrorCodeSchema` = `z.enum(COMPILE_ERROR_CODE_VALUES)`.
- `COMPILE_ERROR_STATUS` (P7): `COMPILE_ORDER_CONFLICT` 409; `COMPILE_INVALID_REORDER` 422; `COMPILE_GRAPH_ORDERED_MOVE` 422; `COMPILE_EXPORT_BUSY` 409; `COMPILE_PANDOC_FAILED` 500; `COMPILE_PANDOC_TIMEOUT` 504; `COMPILE_TEMPLATE_INVALID` 422; `COMPILE_EMPTY_MANUSCRIPT` 422; `COMPILE_SNAPSHOT_NOT_FOUND` 404; `COMPILE_SNAPSHOT_UNREADABLE` 409.

**`index.ts`**: `export * from './<file>.js'` for the nine files above. The stub line `export {};` is replaced.

### 4a. Where the narrowed shapes are defined (corrected by the reviser)

The project-store slice must not import the compile-export slice (F23). So the shapes that `project.yaml` needs are defined in the project-store folder, and compile-export re-exports them. Nothing under `packages/contracts/src/project-store/` imports `../compile-export/`.

**New file `packages/contracts/src/project-store/order-export.ts`.** Head comment: "The shapes of project.yaml's `order` and `export` keys. Compile & export owns them and publishes them from its subpath (CEX-01); they are defined here so that the Project store slice imports no other slice." It imports only `zod` and `fileReferenceSchema` from `./files.js`. It defines, with the values of section 4: `MANUSCRIPT_STATUSES`, `manuscriptStatusSchema`, `MANUSCRIPT_PARTS`, `manuscriptPartSchema`, `MANUSCRIPT_FOLDER`, `MANUSCRIPT_PATH_PATTERN`, `manuscriptPathSchema`, `orderEntrySchema`, `BIBLIOGRAPHY_MODES`, `bibliographyModeSchema`, `exportSettingsSchema`, and the `z.infer` types `ManuscriptStatus`, `ManuscriptPart`, `ManuscriptPath`, `OrderEntry`, `BibliographyMode`, `ExportSettings`. `project-store/index.ts` does not re-export this file, so the project-store subpath's names do not change.

**Re-exports in compile-export** (value names with `export { … } from '../project-store/order-export.js';`, types with `export type { … } from …`):
- `constants.ts`: `MANUSCRIPT_STATUSES`, `manuscriptStatusSchema`, `MANUSCRIPT_PARTS`, `manuscriptPartSchema`, `MANUSCRIPT_FOLDER`, `MANUSCRIPT_PATH_PATTERN`, `BIBLIOGRAPHY_MODES`, `bibliographyModeSchema`; types `ManuscriptStatus`, `ManuscriptPart`, `BibliographyMode`.
- `order.ts`: `manuscriptPathSchema`, `orderEntrySchema`; types `ManuscriptPath`, `OrderEntry`.
- `settings.ts`: `exportSettingsSchema`; type `ExportSettings`.

**Narrowing in `packages/contracts/src/project-store/project.ts`:**
- Add `import { exportSettingsSchema, orderEntrySchema } from './order-export.js';`. The import graph is `project.ts` to `order-export.ts` to `files.ts` to `constants.ts`. None of them imports `project.ts`, so there is no cycle.
- Line 19: the comment becomes "`export` and `order` are narrowed to Compile & export's shapes (order-export.ts, CEX-01); the other keys are passthrough."
- Line 25: `export: exportSettingsSchema.optional(),`.
- Line 27: `order: z.array(orderEntrySchema).optional(),`.
- `project-store/index.ts` and the other project-store files do not change. The project-store export names do not change, so `project-store.exports.test.ts` keeps its name list. Requiring `/project-store`, `/tool-registry` or `/graph-runner` loads no new `dist` folder (F23).

## 5. Files to change

| Path | Change | Purpose |
|---|---|---|
| `packages/contracts/src/compile-export/constants.ts` | new | section 4, constants |
| `packages/contracts/src/compile-export/routes.ts` | new | section 4, route constants |
| `packages/contracts/src/compile-export/errors.ts` | new | section 4, error codes and statuses |
| `packages/contracts/src/compile-export/order.ts` | new | section 4, order entries, manuscript view, order requests |
| `packages/contracts/src/compile-export/settings.ts` | new | section 4, export settings and copy-default |
| `packages/contracts/src/compile-export/preflight.ts` | new | section 4, preflight request, result and summary |
| `packages/contracts/src/compile-export/export.ts` | new | section 4, export request and result |
| `packages/contracts/src/compile-export/snapshots.ts` | new | section 4, snapshot summary, list, requests and manifest |
| `packages/contracts/src/compile-export/events.ts` | new | section 4, event data and the event union |
| `packages/contracts/src/compile-export/index.ts` | edit | replace `export {};` with the barrel |
| `packages/contracts/src/project-store/order-export.ts` | new | the shapes of `order` and `export` (section 4a) |
| `packages/contracts/src/project-store/project.ts` | edit | narrow `order` and `export` (section 4a) |
| `packages/contracts/test/compile-export.schema.test.ts` | new | tests C2, C3 and the optional X tests (section 7) |
| `packages/contracts/test/compile-export.exports.test.ts` | new | test C1 (section 7) |
| `packages/contracts/test/fixtures/nest-style/compile-export-consumer.cjs` | new | CJS consumer for C1, the same form as `agent-loop-consumer.cjs` |

Not changed: `packages/contracts/package.json` (the subpath and the `zod` dependency already exist), `packages/contracts/src/project-store/index.ts`, `packages/contracts/test/project-store.schema.test.ts`, `packages/contracts/test/project-store.exports.test.ts`, `examples/**` (CEX-08 adds the sample's `order`), `apps/**`, `scripts/**`, `modules/**`, `units/**` (except the checkboxes the orchestrator marks at step 3), `plans/DECISIONS.md`. The generated `packages/contracts/dist/` is git-ignored.

## 6. Procedure

Run from the repository at `/Users/bbartolome/workspace/scriba-prototype`, in the worktree of `unit/CEX-01`. If the branch does not exist, create it from `main` (`git worktree add <path> -b unit/CEX-01 main`). A new worktree has no `node_modules/`: run `npm ci` first. Record `node -v` (expect `v26.x`) and `npm -v` with the results.

1. Write `packages/contracts/src/project-store/order-export.ts` as in section 4a. It imports only `zod` and `./files.js`.
2. Write the nine compile-export files of section 5 with the names and shapes of section 4, and the re-exports of section 4a. Each file starts with `import { z } from 'zod';` where it needs Zod. Relative imports end in `.js`. The only imports from other slices are `../platform/events.js` (for `sseEnvelopeSchema`, in `events.ts`), `../project-store/files.js` (for `projectPathSchema`, `fileReferenceSchema` and `contentHashSchema`), `../project-store/project.js` (for `projectIdSchema`, in `events.ts`) and `../project-store/order-export.js` (the re-exports). Replace the stub in `packages/contracts/src/compile-export/index.ts` with the barrel.
3. Edit `packages/contracts/src/project-store/project.ts` as in section 4a (the narrowing). Do not change any other line of that file. Check: `grep -rn "compile-export" packages/contracts/src/project-store` finds only the head comment of `order-export.ts` and the comment of `project.ts` line 19, and no import.
4. Write the two test files of section 7 and the fixture.
5. Run `npx prettier --write` on the changed paths, then `npx prettier --check` on them.
6. Run `npm run build -w @bbartolome/scriba-contracts`. Expect exit 0, and `ls packages/contracts/dist/compile-export` lists `index` and the nine slice files, each with a `.js` and a `.d.ts`, and `dist/project-store/order-export.js` exists. A duplicate name across two `export *` files is a TypeScript error here (TS2308), so the build also checks the barrel.
7. Run `npm test -w @bbartolome/scriba-contracts`. Expect every file to pass, including the regression files `project-store.schema.test.ts` (C2), `project-store.exports.test.ts`, `tool-registry.exports.test.ts` (C1, the loaded folders) and `graph-runner.exports.test.ts` (C1, the loaded folders).
8. Run `npm test -w @bbartolome/scriba-api`. Expect pass. The API's `readYamlState` (`apps/api/src/modules/project-store/project-yaml.ts` line 39) and `updateProjectYaml` use the narrowed schema; `project-store-files-helpers.test.ts` U1 still passes (F24).
9. Run the root checks: `npm run build` (this builds apps/web, which resolves the subpath through `contracts-boot.ts` line 11), then `node --test 'scripts/*.test.mjs'` (includes the apps/api subpath test), then `npm run lint` (ESLint, `lint:examples` and Prettier).
10. Commit on `unit/CEX-01` with the message `feat(CEX-01): publish the compile-export contract slice and narrow project.yaml order and export`. Do not squash.
11. Report: the Node and npm versions, and the output of each command in section 7 with its pass or fail.

## 7. Acceptance criteria and tests

The unit has three criteria (unit lines 30 to 32). Each criterion has one test (C1, C2, C3). The tests check external behaviour: a CJS consumer loads the built subpath by its package name, and the test reads the parse results and the file list. Each criterion names its command. Optional extra tests (X1 to X4) check decisions of this plan. The orchestrator's rule is that only the criterion tests are required, so the implementer may skip X1 to X4; the reviewer then checks those decisions by reading.

### C1 (criterion 1: the subpath builds, exports only shapes and constants, and is importable from apps/api and apps/web)

Test file `packages/contracts/test/compile-export.exports.test.ts` (new), with `fixtures/nest-style/compile-export-consumer.cjs`. The consumer requires `@bbartolome/scriba-contracts/compile-export` and prints the names and `typeof` of each export, as `agent-loop-consumer.cjs` does, and the `dist` folders that the require loaded, read from `require.cache`, as `tool-registry-consumer.cjs` lines 11 to 23 do.

Assertions:
- The consumer exits 0 (`process.execPath`, the package name, the exports map).
- Every name in section 4 is an export (the list `C1_NAMES` holds them all, as `agent-loop.exports.test.ts` does).
- Every export's `typeof` is in `DATA_KINDS = ['object','string','number','boolean']` (line 92 of the agent-loop test). No export is a function.
- Containment (as `tool-registry.exports.test.ts` lines 158 to 188): the loaded folders contain `compile-export` and are a subset of `compile-export`, `platform`, `project-store`; the external specifiers of the built `dist/compile-export/**` files are exactly `['zod']`; and the set of folders reached by relative specifiers that leave the slice is exactly `['platform', 'project-store']`.

Command: `npm test -w @bbartolome/scriba-contracts` (C1 file), and the two other checks of this criterion:
- apps/api: `node --test scripts/subpaths.test.mjs` after the build (existing; line 42 requires each subpath from apps/api).
- apps/web: `npm run build` at the root (existing; `apps/web/src/contracts-boot.ts` line 11 imports the subpath).

### C2 (criterion 2: Zod refuses the four named inputs)

Test file `packages/contracts/test/compile-export.schema.test.ts` (new). It imports the public barrel `../src/compile-export/index.js`. Each refusal has a matching accepted control.

- Status: `outline`, `draft`, `revised`, `final` accepted by `manuscriptStatusSchema`; `published` refused.
- Part: `front`, `body`, `back` accepted by `manuscriptPartSchema`; `appendix` refused.
- Order entry: `{path: 'drafts/ch01.md'}` accepted; refused: `graphs/story.json`, `project.yaml`, `ch01.md`, `/drafts/ch01.md`, `drafts/../project.yaml`, `drafts/` (empty name), `drafts/a\\b.md`. A `status: 'published'` is refused.
- Reorder: `{revision: 'sha256:' + 'a'.repeat(64), front: [], body: ['drafts/a.md'], back: []}` accepted. Refused: `body: 'drafts/a.md'` (a string), `body: [3]`, `body: ['notes/a.md']`, and a `revision` that is not `sha256:` plus 64 lowercase hex digits.
- Export format: `md`, `docx`, `epub`, `pdf` accepted by `exportFormatSchema`; `rtf` and `DOCX` refused.

### C3 (criterion 3: project.yaml accepts files with and without `order` and `export`; the nonfiction sample still passes the CI sample check)

Part (a), in `packages/contracts/test/compile-export.schema.test.ts`: `projectYamlSchema` from `../src/project-store/index.js` accepts:
- `{schemaVersion: 1, title, genrePack}`;
- the same plus `order: [{path: 'drafts/ch01.md', status: 'final'}]`;
- the same plus `export: {author: 'A', bibliography: 'all'}`;
- the same plus both keys.

It refuses `order: [{path: 'notes/ch01.md'}]` and `export: {bibliography: 'some'}`, which shows that the narrowing takes effect.

Part (b), the command `npm run lint:examples` (root; exit 0). This runs the existing examples check over `examples/` (`scripts/examples-check/m1.mjs` lines 137 to 165). The nonfiction sample has no `order` and no `export`, so this shows that the narrowed schema still accepts the sample. CEX-08 adds an `order` later and is checked by its own criteria.

### Optional extra tests (not criteria; they check decisions of this plan)

- X1. Defaults are not written back: `exportSettingsSchema.parse({})` equals `{}`; `orderEntrySchema.parse({path: 'drafts/a.md'})` has no `status` or `part` key; `BIBLIOGRAPHY_DEFAULT_BY_PACK.nonfiction` is `'all'` and `BIBLIOGRAPHY_DEFAULT` is `'off'`.
- X2. Unknown keys survive in an order entry and in export settings, and in the manifest.
- X3. `PLACEHOLDER_PATTERN` finds `TODO` and `{{author}}` in prose, and finds nothing in `TODOS`, `todo`, `TKTKS` or `{x}`. `PLACEHOLDER_WORDS` has the five words.
- X4. `compileErrorCodeSchema` accepts `COMPILE_SNAPSHOT_NOT_FOUND`, refuses `COMPILE_nope`, and every key of `COMPILE_ERROR_STATUS` is in `COMPILE_ERROR_CODE_VALUES`. `compileExportEventSchema` accepts a `snapshot-restored` member and refuses `module: 'project-store'`.

### Regression (existing tests, must still pass)

- `packages/contracts/test/project-store.schema.test.ts`, C2 (order with `status` and with `futureOrderKey`, lines 137 to 166).
- `packages/contracts/test/project-store.exports.test.ts` and `boot.test.ts`.
- `packages/contracts/test/tool-registry.exports.test.ts` C1 and `packages/contracts/test/graph-runner.exports.test.ts` C1: their loaded-folder checks fail if `project-store` imports `compile-export` (F23). They check the done criteria TRG-01 line 36 and GRR-01 line 35.
- `npm test -w @bbartolome/scriba-api` (section 6, step 8), including `project-store-files-helpers.test.ts` U1 (F24).

## 8. Agreement with downstream units and other plans

### 8a. Downstream units

The unit lists CEX-02, CEX-08 and CEX-17 in `unblocks` (line 9). The later units use the same names, so they are checked here too. "Provided" means a name of section 4.

- **CEX-02** (effective order and view model; `units/CEX-02-effective-order-view-model.md` line 32). Needs the view: `manuscriptViewSchema` with `entries` (`manuscriptEntrySchema`), `totals`, `orderSource` (`orderSourceSchema`), `warnings` (`manuscriptWarningSchema`), `revision`. Route `MANUSCRIPT_ROUTE`. Provided. CEX-02 must produce `revision` as `sha256:<64 hex>` (P5) and apply the defaults of P3 when it builds entries.
- **CEX-03** (order writes; line 18). Needs the three request schemas and `COMPILE_ORDER_CONFLICT`, `COMPILE_INVALID_REORDER`, `COMPILE_GRAPH_ORDERED_MOVE`, plus `orderEntrySchema` for the materialised full order. Provided. Whether a write omits default-valued `status` and `part` is CEX-03's decision (O9).
- **CEX-04** (assembled Markdown; export settings read with defaults). Needs `exportSettingsSchema` fields, `EXPORT_LANG_DEFAULT`, `BIBLIOGRAPHY_DEFAULT`, `BIBLIOGRAPHY_DEFAULT_BY_PACK`. Provided.
- **CEX-05** (preflight endpoint and placeholders; lines 18 to 20). Needs `PREFLIGHT_ROUTE`, `preflightResultSchema`, `preflightCheckSchema`, `preflightFindingSchema` (with `line`, `offset`, `length`), `PREFLIGHT_CHECK_IDS`, `PLACEHOLDER_WORDS`, `PLACEHOLDER_PATTERN`. Provided.
- **CEX-06** (unsupported claims and orphan scenes). Needs the check ids and severities, `projectPathSchema` for finding paths (P10). The `ref` shape is an opaque record (O2, settled). Provided.
- **CEX-07** (entity links and banned phrases). Uses the project-store's `CITATION_PATTERN`, which is unchanged (`project-store/constants.ts` line 7). Provided.
- **CEX-08** (nonfiction sample `order` and `export`). Writes `drafts/*.md` entries with statuses `final`, `revised` or `draft` (unit, Decisions, first bullet). Passes `orderEntrySchema` (`status` is in the enum). Its export settings (author, dedication) pass `exportSettingsSchema`. Provided. CEX-08 follows CEX-01, so the order of the two units is fixed.
- **CEX-09** (assembly-preflight gate; in-process service). Uses the view, preflight and export result types. Provided.
- **CEX-10** (export runner; line 15). Needs `EXPORT_ROUTE`, `EXPORT_DOWNLOAD_ROUTE` (GET), `exportRequestSchema`, `exportResultSchema`, `preflightSummarySchema`, `COMPILE_EXPORT_BUSY`, `COMPILE_PANDOC_FAILED`, `COMPILE_PANDOC_TIMEOUT`, `COMPILE_EMPTY_MANUSCRIPT`, and the `export-finished` member. Provided.
- **CEX-14** (templates and export settings; lines 15 to 17). Needs `EXPORT_SETTINGS_ROUTE`, `exportSettingsViewSchema`, `exportSettingsWriteSchema`, `EXPORT_COPY_DEFAULT_ROUTE`, `copyDefaultRequestSchema`, `COMPILE_TEMPLATE_INVALID`. Provided. Its stale-revision criterion uses the settings view's own `revision` field, which CEX-14 defines (O1, settled).
- **CEX-16** (snapshot API; lines 19 to 21 and the Layout bullet). Needs `snapshotSummarySchema`, `snapshotListSchema`, the create and restore requests, `snapshotManifestSchema`, `COMPILE_SNAPSHOT_NOT_FOUND`, `COMPILE_SNAPSHOT_UNREADABLE`, the `snapshot-created` and `snapshot-restored` members. Provided. The unreadable form is P13 (O5, settled).
- **CEX-17** (manuscript route; Decisions). Needs the view, the three order requests, and `manuscript-updated` (refetch). Provided.
- **CEX-18** (preflight panel, export buttons, settings panel; line 16). Needs `preflightSummarySchema` (error count for the confirm dialog), `exportFormatSchema`, `exportSettingsWriteSchema` (partial settings with the revision), `copyDefaultRequestSchema`. Provided.
- **CEX-19** (snapshots panel; line 15). Needs `unreadable` and `words` nullable. Provided (O5).
- **CEX-20** (milestone gate). No new name. Nothing to agree.
- **AGL-24** (compile tools; line 17). Needs the view, preflight request and result, export request and result. Provided.
- **GNP-19** (fiction gate; line 17). Uses the API only. Nothing to agree.

### 8b. Done plans and units this plan relies on

- `PST-01` (done): `projectYamlSchema` and its `passthrough` placeholder (F3). This plan replaces the two placeholders for `export` and `order` (`modules/project-store.md` line 81 says it will).
- `GRR-01` and `AGL-01` (done): listed as blockers. Not imported (F14), so this plan depends on neither's contract.
- `PLT-11` (done): the subpath and build setup (F2).

### 8c. Draft and planned plans on the same paths

The plans with status `draft` or `planned` in the repository were four at the base: `plans/GRR-10.md` (planned in `f1a301b`), `plans/TRG-14.md` (planned), `plans/SAU-22.md` (draft) and `plans/GRR-16.md` (draft on main). The working tree also has uncommitted status edits to `GRR-10.md` and `GRR-16.md` by other units; the file lists below are those of the plans and do not depend on the edits. Each file list is checked:

- `plans/GRR-10.md`: changes `apps/web/src/app/features/graph-runner/*`, `e2e/specs/graph-canvas.e2e.ts`, `apps/web/package.json` and the lock file. Its only contract reference is a read (line 76). No path shared with CEX-01.
- `plans/TRG-14.md`: its plan line 95 says `packages/contracts/**` does not change. No shared path.
- `plans/SAU-22.md`: changes `packages/contracts/src/platform/env.ts` and `packages/contracts/test/platform.schema.test.ts`. Neither is a CEX-01 path.
- `plans/GRR-16.md`: changes `examples/nonfiction/graphs/chapter-opening.json`, e2e fixtures, `apps/api/test/fixtures/chapter-opening-sample/**` and `apps/api/test/graph-runner-sample-recipe.test.ts`. The fixture copy of `project.yaml` has no `order` or `export` key, so the narrowing does not change it. `examples/nonfiction/project.yaml` itself is not changed by that plan.

No `unit/<ID>` branch shares a CEX-01 path (`git branch --list 'unit/*'` at `c05de97`: `unit/GRR-10`, `unit/GRR-16`, `unit/TRG-14` and old backups only). The reviser re-ran `grep -l "^status: \(draft\|planned\)" plans/*.md` at `c05de97`: CEX-01, GRR-10, GRR-16, SAU-22, TRG-14, the same set; none lists `packages/contracts/src/project-store/**`, `packages/contracts/src/compile-export/**`, `packages/contracts/test/compile-export.*`, `tool-registry.exports.test.ts` or `graph-runner.exports.test.ts` as a change. SAU-22 and GRR-16 run the contracts and api test suites, which this plan keeps passing (section 7, Regression). The change of this plan and the change of each plan above are independent, so the units can reach main in either order.

## 9. Review parts

One part. The unit is one contract slice with one plan, and the steps of section 6 and the tests of section 7 belong together.

- Part 1: section 4 and 4a (all names), section 5 (all files), section 6 (steps 1 to 11), section 7 (C1, C2, C3, the optional X1 to X4 and the regression runs).

## 10. Open points, settled by the reviser

No point needs the Navigator, and no unit file changes. None of these changes an acceptance criterion or a settled decision of a module file.

- **O1 What `revision` covers. Settled: two separate fields; the contract fixes only the format.** The manuscript view's `revision` (`manuscriptViewSchema`, and the three order requests) is CEX-02's: "hash of the current order field plus the set of manuscript files" (`units/CEX-02-effective-order-view-model.md` line 32). The settings revision is the `revision` of `exportSettingsViewSchema` and `exportSettingsWriteSchema`, a different response and request: CEX-14 serves `GET` settings and accepts `POST {revision, settings}` (`units/CEX-14-template-overrides-settings.md` line 15), so CEX-14 defines what its revision covers (for example a hash of the `export` key) and can refuse a stale one with the CEX-03 mechanism ("revision conflicts as in CEX-03": mismatch refused, nothing written; CEX-03 Decisions, second bullet). CEX-18 writes settings "with the current revision" that the settings GET returned (`units/CEX-18-preflight-export-panels.md` line 17). No unit says the two revisions are one value, CEX-02's definition is stated for `GET` manuscript only, and the module file says nothing on revisions. So CEX-14's criterion 3 is reachable without a change of CEX-02 or CEX-14, and CEX-01's plan is correct either way: the YAGNI first condition (the part is in the way now) is false, so no unit-change action applies. The plan's source comment on `exportSettingsViewSchema` (section 4) records the split.
- **O2 Finding `ref`. Settled: opaque record** `z.record(z.string(), z.unknown())` (P11). The unit gives no shape (line 22), CEX-06 gives only "claim text and cited passage as `ref`" (line 16). A typed shape later is an expand change that CEX-06 may make.
- **O3 Route paths. Settled as P6.** No `:projectId` in the path, as CEX-02 line 32 and the graph-runner routes (F27). The route constants are unused until their units; CEX-02, CEX-05 and CEX-10 name paths that match.
- **O4 HTTP statuses. Settled as P7** (corrected citation). No unit names a status for these codes.
- **O5 Snapshot words and the unreadable flag. Settled as P13.** CEX-16 lists unreadable snapshots ("missing/invalid manifest → listed `unreadable`"), so `words` (read from the manifest) cannot be known for them; `words` is nullable and `unreadable` optional, as unit line 24 marks it.
- **O6 Copy-default format. Settled as P14** (`docx | epub | pdf`): only these three formats have a template override (CEX-14 Decisions, second bullet; the three override keys of unit line 19).
- **O7 Preflight summary. Settled as P12.** CEX-18 needs the error count ("N errors", line 16); the warning and info counts are the same shape.
- **O8 Event data. Settled as P15**, `projectId` first, as the project-store events (F26). CEX-17 refetches on `manuscript-updated`; CEX-16 publishes `snapshot-created` and `snapshot-restored`.
- **O9 Defaults are constants, not Zod defaults. Settled as P3.** The unit says "Defaults are applied at read time, never written back" (line 19) and CEX-14 says "defaults applied at read time, never written". CEX-02 applies them when it builds the view; whether CEX-03 writes default-valued `status` and `part` is CEX-03's, and the schema allows both.
- **O10 "Expand-only" (unit line 27). Settled: the plan's reading stands, with a corrected fact.** The unit calls the narrowing of the reserved placeholder fields expand-only, and `modules/project-store.md` line 81 says the placeholder is narrowed by Compile & export. The one file in the repository with such a key is the API test fixture with `export: {template: default}` (F24, not "no file", as F17 and F18 implied); it stays valid because `exportSettingsSchema` is loose (P9). No unit text changes.
- **O11 Blocker entries. Settled: no change.** The four entries use the cross-module form `"<Module> phase:<name> (<gate unit>)"` of `units/README.md` lines 59 to 66, each names the gate of that module's first phase, and each gate is `status: done` on main (`git show main:plans/<ID>.md`, PLT-11, PST-01, GRR-01, AGL-01). The inverse holds: `units/PLT-11-scaffold-gate.md`, `units/PST-01-contract-slice.md`, `units/GRR-01-contract-slice.md` and `units/AGL-01-contract-slice.md` each name CEX-01 in `unblocks` (line 9). The slice imports nothing from graph-runner or agent-loop; an extra satisfied blocker is not in the way, so no Remove action applies (`prompt.md`, "Do not change a part that is not in the way").
