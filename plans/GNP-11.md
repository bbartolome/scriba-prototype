---
id: GNP-11
status: done
---
# GNP-11 plan — nonfiction sample entities and Source front matter on the skeleton sources

Revision 3 (Opus reviser), checked at main `025b4d5`. Revision 2 was checked at main `b010ab4`; revision 1 was written at main `bafecf2` from the repository alone. All open points are settled; the plan waits on no decision.

Revision 3 changes: open point 1 decided by the Navigator, option (c), and open point 5 confirmed, option (a) (`plans/DECISIONS.md`, `## 2026-11-16 — GNP-11 — open points 1 and 5: the Navigator's decisions`); section 6 restates both as decided and drops the other options. Section 4: the tick rule of criterion 1 is the option (c) rule only; the box is not ticked at merge. Steps 0 and 12 and section 8 follow it. Section 5, PLT-22 bullet: the order is recorded in PLT-22's `blocked_by` (line 7) and GNP-11's `unblocks` (line 9) by `be8eba2`. D8, D9, the CEX-07 bullet, C3, C19, C21 and section 7c updated to the decisions. The unit line references are shifted by one, because `be8eba2` added a change note at line 15 of the GNP-11 unit (its original Decisions are now lines 16 to 20, its criteria lines 23 and 24) and at line 17 of the PLT-22 unit (its Decisions bullets are now lines 21 and 22, its criterion 5 line 30). No step, test, path or file text of section 2 changed.

Revision 2 notes, kept for the record:

Revision 2 changes: the facts re-checked at `b010ab4` (C2, C25); C13 corrected (the root `ajv` is 6.15.0, not 8.20.0); the R1 spec of `stripExtensions` corrected; S14 and C21 corrected (DECISIONS now has a GNP-11 record); step 0 and step 3 made precise; open points 2, 3, 4 and 5 settled by the reviser (section 6); open point 1 restated with the options for the Navigator, including the fact that PLT-22's check fails on the skeleton sources as they are on `main` (C26); section 5 updated (TRG-12 is done; PLT-22; the other e2e specs that start from the sample); a section 8 "Review parts" added.

Batch: [GNP-11] (Genre packs, phase:nonfiction-workhorses, M2), a batch of one. The facts of section 7 were read at `24b1b3c`, and main moved to `bafecf2` while the plan was written. `git diff --name-only 24b1b3c HEAD` lists only `plans/TRG-13.md`, so every fact holds at `bafecf2`. The unit file was read in full (lines 1 to 24 at `025b4d5`). Its one change note (line 15) is the Navigator's decision on open point 1 (`be8eba2`, PLT-22 added to `unblocks`); its earlier commits (`2fed3f4`, `098add9`) moved it and fixed its dependency fields, and `c45cd5e` did not touch it. Its blockers hold: GNP-03 (`plans/GNP-03.md` line 4, `done`; code `f303689`), GNP-06 (`plans/GNP-06.md` line 4, `done`; code `5213c1e`) and PST-11 (`plans/PST-11.md` line 3, `done`; code `6756f0d` and `43ba0bb`). No `unit/GNP-11` branch and no worktree exist. This plan changes only `plans/GNP-11.md`.

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken, with its one-line reason.

### 1a. Settled by the unit, the module, the done blockers and DECISIONS

- **S1 Content.** Five entities in `examples/nonfiction/entities/`: one `person`, two `claim`s, one `concept`, one `style-profile`. Source: unit line 16.
- **S2 Facts and quotes.** Every reference resolves to a source in `sources/`. Entities only summarise and cite those sources and add no fact they lack. No invented quotes from real living people. Source: unit line 17; module line 93.
- **S3 Claim statuses.** The claims' statuses must not contradict the grounding-claims draft of AGL-19; coordinate when that draft lands. Source: unit line 18; `units/AGL-19-grounding-sample-draft.md` line 16. AGL-19 is blocked by this unit (its line 7), so this unit lands first; section 5 hands the check to AGL-19.
- **S4 Source front matter.** Each skeleton source that lacks Source front matter gets it in this PR. All four sources lack it (section 7, C7), and the done GNP-03 makes `citation` and `reliability` required (`packages/packs/core/entity-types/source.yaml` line 22). So all four change. Source: unit line 19; `plans/GNP-03.md` section 5, GNP-11 bullet.
- **S5 Paths are a contract.** The skeleton's file paths and the paths the mock script uses stay as they are. Source: unit line 20; `plans/PST-11.md` D2 (line 32); `e2e/specs/journey.e2e.ts` lines 149, 247 and 265; `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` line 17.
- **S6 Unit tests never read `examples/`.** Source: `modules/genre-packs.md` line 88; `units/README.md` line 138; `plans/PST-11.md` D11 (line 41). So no committed test reads the sample (D9).
- **S7 Kinds, folders and field names.** `person` (`name`, `role`, `sources`), `claim` (`statement`, `evidence`, `status`), `concept` (`name`, `definition`) and `style-profile` (`tone`, `targetLength`, `bannedPhrases`) live in `entities/`. `source` (`title`, `citation`, `url?`, `reliability`) lives in `sources/`. The names are stable once shipped. Source: `modules/genre-packs.md` lines 73 to 77 and 82; the pack files on main (C6); `plans/GNP-03.md` D1 and D2; `plans/GNP-06.md` D1 and D2.
- **S8 Status values.** `claim.status` is `supported`, `weak` or `unsupported`; `unsourced` is not a value. Source: `modules/genre-packs.md` line 76; `packages/packs/nonfiction/entity-types/claim.yaml` line 23; `plans/GNP-06.md` D3.
- **S9 Reference fields.** `person.sources` and `claim.evidence` are lists of source IDs, each field carrying `x-scriba-type: entity` and `x-scriba-entity-kinds: [source]`. Source: `modules/genre-packs.md` line 69; `person.yaml` lines 19 and 20; `claim.yaml` lines 16 and 17; `plans/GNP-06.md` D4.
- **S10 IDs and types.** An entity's ID is its front-matter `id` or, when there is none, its file stem. The ID pattern is `^[a-z0-9][a-z0-9-]*$`. An entity file needs a `type`; a `sources/` file without one is read as `source`. Source: `units/PST-08-entity-resolution.md` lines 18, 19 and 29; `packages/contracts/src/project-store/constants.ts` line 4; `packages/contracts/src/project-store/entities.ts` lines 11 to 15; `scripts/examples-check/m1.mjs` lines 66 to 72.
- **S11 Gate.** `npm run lint:examples` (`package.json` line 27) must pass, and it prints `examples check passed: 1 sample(s)` plus the entity count (`scripts/examples-check/index.mjs` line 65). The pass line changes only in its counts. Source: unit lines 23 and 24; `plans/DECISIONS.md` line 2405.
- **S12 Prettier.** `examples/` is not ignored by Prettier (`.prettierignore` lines 1 to 5). `npm run lint` ends with `prettier --check .` (`package.json` line 26). Every new or changed file must pass it. Source: `plans/PST-11.md` section 1a (the Prettier bullet, line 24); `.prettierrc.json`.
- **S13 Sample text.** No whole-word placeholder (`TK`, `TODO` and the others), no `{{`, no `[@id]`, no URL, original text. Source: `plans/PST-11.md` D4 (line 34) and D5 (line 35); `modules/genre-packs.md` line 93.
- **S14 Repository state.** No git remote is added and nothing is pushed. The `plans/DECISIONS.md` entries that name GNP-11 are the orchestrator's records of this plan's drafts, which settle nothing, and `## 2026-11-16 — GNP-11 — open points 1 and 5: the Navigator's decisions` (section 6, points 1 and 5). No entry names GNP-12 (grep, C21). Source: `prompt.md` (commit rules, lines 297 and 300).

### 1b. Decisions this plan makes

- **D1 File names and IDs (plan choice).** The file stem is the ID; no front-matter `id` is written. Files: `entities/k-anders-ericsson.md`, `entities/hours-figure-is-average.md`, `entities/plateau-is-reorganising.md`, `entities/deliberate-practice.md` and `entities/book-style.md`. Reason: the stem is the simplest ID that S10 accepts, and no ID equals a source stem.
- **D2 The person (plan choice).** K. Anders Ericsson, role "One of the three authors of the 1993 article on deliberate practice", sources `[deliberate-practice-notes, ten-thousand-hours-notes]`. Both notes name him in full (`deliberate-practice-notes.md` line 5; `ten-thousand-hours-notes.md` line 5). Reason: "Gladwell" in `ten-thousand-hours-notes.md` line 11 is a surname only, and a first name would add a fact the sources lack. The entity has no quotation, so S2 holds whatever his status.
- **D3 The two claims (plan choice from the sources).** `hours-figure-is-average`: statement "The ten-thousand-hour figure is an average from one 1993 study, not a threshold", evidence `[ten-thousand-hours-notes]`, status `supported` (`ten-thousand-hours-notes.md` lines 5, 7 and 9 state it). `plateau-is-reorganising`: statement "A learning plateau can be a stage of reorganising rather than an end", evidence `[learning-plateaus-notes]`, status `weak`, because the notes say their reading is from memory and the full texts are unread (`learning-plateaus-notes.md` lines 13 and 15). Reason: one supported and one weak claim give the grounding draft of AGL-19 two statuses to match (S3), and both are stated by the sources.
- **D4 The concept (plan choice).** `deliberate-practice`, name "Deliberate practice", definition "Practice on a well-defined task at the right level of difficulty, with informative feedback and chances to repeat and correct errors" (`deliberate-practice-notes.md` lines 11 to 13 give the three features). The definition is one line, as the module requires (`modules/genre-packs.md` line 77).
- **D5 The style profile (plan choice).** `book-style`: tone "Plain and direct for an adult reader, with short sentences and no hype"; `targetLength: 800`, the default length of the workhorse tools (`modules/genre-packs.md` line 63); `bannedPhrases: [game-changer, unlock your potential]`. Reason: no source gives a style; neither phrase appears in the sample (C15).
- **D6 Source front matter (plan choice).** Each source gets a front-matter block with `type: source`, `title` (its H1, without the colon), `citation` and `reliability`. No `url` (S13) and no `id` (D1). Each citation uses only what its file states: K. Anders Ericsson, Ralf Krampe and Clemens Tesch-Römer, 1993, the article's title, and Psychological Review (the first two notes); Bryan and Harter, 1897 and 1899 (the plateau notes). No volume or page is added. The outline's citation is "The author's working outline for this book", because `citation` is required (S4). Reason: this answers PST-11 open point 4 for this file (`plans/PST-11.md` line 168) by giving the outline a citation.
- **D7 Bodies (plan choice).** The four source bodies do not change. The five entity bodies are one or two sentences that restate what the sources say, with no quotation marks around any person's words and no figure that the sources do not state (`plans/PST-11.md` D6). Reason: S2 and S5.
- **D8 `project.yaml` does not change.** No unit asks for it, and `plans/PST-11.md` section 2 (the `project.yaml` row, line 51) decided that it names no `styleProfile`. Confirmed by the Navigator, open point 5, option (a) (section 6). Reason: scope; and every reader of the key handles its absence (CEX-07 line 20; AGL-09 line 19, TRG-04 line 19 and TRG-16 line 15 fill or preselect only when it is set).
- **D9 No committed test (plan choice).** Both criteria are checked by recorded commands (section 4), as `plans/PST-11.md` D11 did. Reason: S6, and the pack layer that would check the sample, PLT-22, is not merged and now waits for this unit (open point 1, decided: option (c)).
- **D10 Commit (plan choice).** One commit on `unit/GNP-11`: `feat(GNP-11): nonfiction sample entities and source front matter`. Reason: each code commit carries the unit id (`prompt.md` line 300).
- **D11 No `.gitkeep` (plan choice).** `entities/` gets its files at once, so no placeholder file is needed; git does not track empty folders.

## 2. Files to create or change

Only the paths below change. Nothing else in the repository changes, including `examples/nonfiction/project.yaml`, `examples/samples.yaml`, `examples/nonfiction/drafts/**`, `e2e/**`, `scripts/**`, `packages/**`, `apps/**`, `units/**`, `modules/**` and `plans/DECISIONS.md`.

| Path | Change | Purpose |
|---|---|---|
| `examples/nonfiction/sources/outline.md` | change | prepend the front matter of this section (6 lines); the body is unchanged |
| `examples/nonfiction/sources/ten-thousand-hours-notes.md` | change | prepend its front matter (6 lines) |
| `examples/nonfiction/sources/deliberate-practice-notes.md` | change | prepend its front matter (6 lines) |
| `examples/nonfiction/sources/learning-plateaus-notes.md` | change | prepend its front matter (6 lines) |
| `examples/nonfiction/entities/k-anders-ericsson.md` | new | the `person` entity (D2) |
| `examples/nonfiction/entities/hours-figure-is-average.md` | new | the `claim` entity, supported (D3) |
| `examples/nonfiction/entities/plateau-is-reorganising.md` | new | the `claim` entity, weak (D3) |
| `examples/nonfiction/entities/deliberate-practice.md` | new | the `concept` entity (D4) |
| `examples/nonfiction/entities/book-style.md` | new | the `style-profile` entity (D5) |

Each front-matter block of section 2 is inserted above the first line of its file, which is that file's existing H1 heading. The block ends with `---` and is followed by a blank line. Its text is exact.

`examples/nonfiction/sources/outline.md`:

```
---
type: source
title: The Long Apprenticeship outline notes
citation: The author's working outline for this book
reliability: The author's own plan for the book; it is not a research source
---
```

`examples/nonfiction/sources/ten-thousand-hours-notes.md`:

```
---
type: source
title: Notes on the ten-thousand-hour idea
citation: K. Anders Ericsson, Ralf Krampe and Clemens Tesch-Römer, 1993, The Role of Deliberate Practice in the Acquisition of Expert Performance, Psychological Review
reliability: Reading notes on the 1993 study, which had few students at one school and estimated its practice hours from memory
---
```

`examples/nonfiction/sources/deliberate-practice-notes.md`:

```
---
type: source
title: Notes on deliberate practice
citation: K. Anders Ericsson, Ralf Krampe and Clemens Tesch-Römer, 1993, The Role of Deliberate Practice in the Acquisition of Expert Performance, Psychological Review
reliability: Reading notes on the account of deliberate practice in the 1993 article; the notes give no numbers
---
```

`examples/nonfiction/sources/learning-plateaus-notes.md`:

```
---
type: source
title: Notes on learning plateaus
citation: Bryan and Harter, studies of telegraph learners from 1897 and 1899
reliability: Reading from memory; the full texts have not been read, so the speed and word-habit claims are unverified
---
```

`examples/nonfiction/entities/k-anders-ericsson.md` (the body is one paragraph after a blank line):

```
---
type: person
name: K. Anders Ericsson
role: One of the three authors of the 1993 article on deliberate practice
sources: [deliberate-practice-notes, ten-thousand-hours-notes]
---

K. Anders Ericsson is named as one of three authors of the 1993 article in Psychological Review, with Ralf Krampe and Clemens Tesch-Römer. Both sets of reading notes name that article.
```

`examples/nonfiction/entities/hours-figure-is-average.md`:

```
---
type: claim
statement: The ten-thousand-hour figure is an average from one 1993 study, not a threshold
evidence: [ten-thousand-hours-notes]
status: supported
---

The study compared violin students at a music academy in Berlin, grouped by level. The notes say the figure is an average, and that individuals varied within each group. The study had few students, at one school, and its practice hours were estimated from memory.
```

`examples/nonfiction/entities/plateau-is-reorganising.md`:

```
---
type: claim
statement: A learning plateau can be a stage of reorganising rather than an end
evidence: [learning-plateaus-notes]
status: weak
---

Bryan and Harter read the flat stretch in telegraph learning as a change of method, after which gains returned. The subject is narrow, and the reading is from memory, so the claim stays weak until the papers are read.
```

`examples/nonfiction/entities/deliberate-practice.md`:

```
---
type: concept
name: Deliberate practice
definition: Practice on a well-defined task at the right level of difficulty, with informative feedback and chances to repeat and correct errors
---

The contrast is with playing through what you can already do. The fuller account is in the notes on deliberate practice, and chapter 2 of the book uses it.
```

`examples/nonfiction/entities/book-style.md`:

```
---
type: style-profile
tone: Plain and direct for an adult reader, with short sentences and no hype
targetLength: 800
bannedPhrases: [game-changer, unlock your potential]
---

Practice is the work you do while you cannot yet do the thing well. Say what the research shows, say where it stops, and then get back to the practice.
```

Each body sentence was compared with the source lines named in D2 to D5 (CHECKED by the planner, section 7, C23). The body of each claim and of the concept cites its sources only by the ID in the front matter.

## 3. Method

Run every command from the worktree `/Users/bbartolome/workspace/scriba-prototype-wt/GNP-11` on branch `unit/GNP-11`. The driver makes the branch from `main` with `git branch unit/GNP-11 main`, then `git worktree add /Users/bbartolome/workspace/scriba-prototype-wt/GNP-11 unit/GNP-11` (no `-b`), as `prompt.md` lines 118 and 121 require. Record `node -v` and `npm -v` beside each result. Do not push. Do not add a remote. Stage only the paths of section 2; never use `git add -A` or `git commit -a`.

0. **Base.** In the main checkout, `git rev-parse --short HEAD` prints the base hash; write it down as `<base>`. In the worktree, `git branch --show-current` prints `unit/GNP-11` and `git status --short` prints nothing. `git ls-files examples` prints exactly these ten paths: `examples/nonfiction/.gitignore`, the three files of `examples/nonfiction/drafts/`, `examples/nonfiction/project.yaml`, the four files of `examples/nonfiction/sources/`, and `examples/samples.yaml`. `examples/nonfiction/entities` does not exist. `git diff --name-only <base> -- examples` prints nothing. Record the `LAYERS` line of `scripts/examples-check/index.mjs` (line 16 at `b010ab4`: `export const LAYERS = [m1, graph];`). It names no pack layer: PLT-22 is blocked by this unit (`units/PLT-22-examples-check-pack-layer.md` line 7) and cannot have merged. If any of these facts differs, including a third layer in `LAYERS`, stop and report.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.x`.
2. **Install.** `npm ci`. Expected: exit 0, and `git status --short` still prints nothing.
3. **Baseline, before any edit.** (a) `npm run lint:examples`. Expected: exit 0 and the line `examples check passed: 1 sample(s), 1 project.yaml, 4 entity file(s), <N> test file(s) scanned`; record `<N>`. (b) `npm run e2e`. Record its exit code as `E0`, and the last 20 lines of its output. Expected: `E0` is 0 (open point 2, settled: the suite runs on this machine). If `E0` is not 0, or the run cannot start, the base itself fails: record the exact error and stop with PLAN DOES NOT WORK at this step, before any edit.
4. **Source front matter (section 2).** Insert the front matter of each of the four source files above its first line, exactly as section 2 gives it. Expected: `git diff -- examples/nonfiction/sources` shows, for each file, six added lines before the existing H1 and no other change.
5. **Entities (section 2).** Run `mkdir examples/nonfiction/entities`. Write the five files of section 2 with their exact text. Expected: `git status --short -uall` lists the four modified source files and the five new entity files, and nothing else.
6. **Format.** `npx prettier --write examples/nonfiction/sources examples/nonfiction/entities`, then `npx prettier --check examples`. Expected: the second prints `All matched files use Prettier code style!`. Then `git diff -- examples/nonfiction/sources` again: the body of each source is unchanged. If Prettier changed a value, keep what Prettier wrote and record the change in the report.
7. **Criteria checks.** Run T1 and T2 of section 4. Expected: each pass condition of section 4 holds.
8. **Regression.** From the root: `npm run lint` and `npm test`. Expected: each exits 0. `npm run lint` ends with `All matched files use Prettier code style!`.
9. **Scope.** `git status --short -uall` lists exactly nine paths: four ` M` entries for the source files and five `??` entries for the entity files. `e2e/test-results/` is gitignored (`.gitignore` line 8), so an e2e run adds nothing to this list.
10. **Commit.** `git add -- examples/nonfiction/sources/outline.md examples/nonfiction/sources/ten-thousand-hours-notes.md examples/nonfiction/sources/deliberate-practice-notes.md examples/nonfiction/sources/learning-plateaus-notes.md examples/nonfiction/entities/k-anders-ericsson.md examples/nonfiction/entities/hours-figure-is-average.md examples/nonfiction/entities/plateau-is-reorganising.md examples/nonfiction/entities/deliberate-practice.md examples/nonfiction/entities/book-style.md`. Then `git diff --cached --stat` must list exactly these nine paths. Commit with `git commit -m "feat(GNP-11): nonfiction sample entities and source front matter"`. Do not push.
11. **Fresh clone.** `git clone --branch unit/GNP-11 /Users/bbartolome/workspace/scriba-prototype <empty temporary folder>`. In it: `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0. Then `npm run lint:examples` prints `1 sample(s)` and `9 entity file(s)`.
12. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its test in section 4 holds. The orchestrator ticks the unit file's boxes after review, not this plan. At merge it ticks criterion 2 only. Criterion 1 stays unticked with the cause "PLT-22 not merged", even when T1 passes (section 4, tick rule); the implementer reports T1 as the work pass and does not mark criterion 1 as ticked.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-11-nonfiction-sample-entities.md` lines 23 and 24. The unit has two criteria, so there are two tests, T1 and T2. Neither is a committed file (D9). Both are recorded commands, run in the worktree on the final tree of step 10, with the output kept in the report.

| Criterion (unit line) | Test and seam | Command | Pass condition |
|---|---|---|---|
| "Sample entities validate against their types (Platform's examples check, pack layer), and every entity reference resolves to an existing file in the sample." (23) | **T1.** The examples check (part a) and the pack-layer check of the same files, run by recorded script R1 (part b), because PLT-22 is not merged; it is blocked by this unit (open point 1, decided). T1 is the work pass; it does not tick the box (tick rule below). | (a) `npm run lint:examples` from the root. (b) `T=$(mktemp -d)`, then write R1 to `$T/r1.mjs` (spec below) and run `node "$T/r1.mjs" examples/nonfiction` from the root. | (a) exit 0; the pass line reads `examples check passed: 1 sample(s), 1 project.yaml, 9 entity file(s), <N> test file(s) scanned`. (b) exit 0; the last line reads `R1: 9 entity file(s) checked, 4 reference(s) checked, 0 issue(s)`. Controls, run on copies made with `cp -R examples/nonfiction "$T/n"`: (c1) delete the line that begins `citation:` in `$T/n/sources/outline.md`; R1 exits 1 and an issue names `outline.md` and `citation`. (c2) in `$T/n/entities/plateau-is-reorganising.md` change `evidence: [learning-plateaus-notes]` to `evidence: [plateau-notes]`; R1 exits 1 and an issue names `plateau-is-reorganising.md` and `plateau-notes`. The controls show that R1 is armed. |
| "Platform's examples check passes; the e2e still passes unchanged." (24) | **T2.** The examples check (part a) and the e2e run of the repository, compared with the base (part b). | (a) `npm run lint:examples`. (b) `npm run e2e` from the root. (c) `git diff --name-only <base> HEAD -- e2e`, with `<base>` from step 0. | (a) exit 0, with the pass line of T1 (a). (b) the exit code equals `E0` from step 3 and `E0` is 0. (c) prints nothing: no file under `e2e/` changed. (Step 3 stops the work if `E0` is not 0, so part (b) is never compared with a failing base.) |

**R1 spec (a recorded check, not committed).** The implementer writes R1 to `$T/r1.mjs`, a file in a new temporary folder outside the repository, and runs it from the repository root. It takes one argument, the sample folder.

- It imports `readFrontMatter` from `scripts/examples-check/lib.mjs` (line 73), by a `file://` URL built with `pathToFileURL` from `process.cwd()`. It loads `ajv` and `yaml` with `createRequire` from `apps/api/package.json`. That resolves `ajv` 8.20.0 (`apps/api/node_modules/ajv`), the version the loader uses. The root `node_modules/ajv` is 6.15.0, which has no `strict` option, so R1 must not load `ajv` from the root. `yaml` (2.9.1) resolves from the root.
- It reads every `*.md` file in `<sample>/entities` and `<sample>/sources`. The kind of each file is its front-matter `type`.
- It loads `packages/packs/core/entity-types/<kind>.yaml`, or else `packages/packs/nonfiction/entity-types/<kind>.yaml`. A kind with neither file is an issue.
- It builds the schema as the loader does (`apps/api/src/modules/tool-registry/entity-types.ts` lines 185 to 189). It takes the `fields` of the kind's file, removes every key that begins with `x-` at every depth, except the property names directly under a `properties` key, which are data and are kept (as `stripExtensions` and `stripChild` do, `inputs.ts` lines 172 to 190), and adds `type: 'object'` and `additionalProperties: true`. It compiles the schema with `new Ajv({ allErrors: true, strict: true })` (line 184) and validates the front matter. Each Ajv error is one issue, named by file, `instancePath` and message.
- For each `person` (field `sources`) and each `claim` (field `evidence`), every listed ID must equal the stem of a `*.md` file in `<sample>/sources`. Each ID that does not is one issue, naming the file and the ID.
- It prints the summary line `R1: <n> entity file(s) checked, <m> reference(s) checked, <k> issue(s)`. With no issue it exits 0. Otherwise it prints each issue on stderr, then the summary, and exits 1.

The in-memory run of the same logic on the planned front matter gave the expected results (C14, and again by the reviser at `b010ab4`, C25). The file-based run is checked by T1 (b) and its controls.

**When the box of criterion 1 is ticked (Navigator, open point 1, option (c)).** T1 (a), (b) and the controls passing is the work pass of criterion 1, and the unit is complete without the box. The box is NOT ticked at GNP-11's merge: neither the implementer nor the orchestrator ticks it then. It stays unticked with the cause "PLT-22 not merged". It is ticked when `npm run lint:examples` passes on a `main` that contains PLT-22's pack layer (a third entry in `LAYERS` of `scripts/examples-check/index.mjs`), with this sample in `examples/`. Criterion 2 is ticked at merge when T2 passes.

## 5. Downstream agreement

- **GNP-12 (workhorses gate; blocked by GNP-11, its line 7).** Its criterion 3 (line 19, "Sample entities validate and every reference resolves") is T1. Its demo steps 2 and 5 (lines 24 and 27) need a person and claims. Provided: `k-anders-ericsson` (kind `person`), `hours-figure-is-average` and `plateau-is-reorganising` (kind `claim`), `deliberate-practice` (kind `concept`), `book-style` (kind `style-profile`), and four sources whose IDs are their stems. Agrees.
- **AGL-19 (grounding sample draft; blocked by GNP-11, its line 7).** Its draft must not contradict the claim statuses (its line 16). Provided: two claims, one `supported` and one `weak`, both about the sources, and no `unsupported` claim. AGL-19's planner must match the verdicts of any statement that matches these two claims to these statuses. Its invented statistic has no claim entity, so it cannot contradict one. Its other hand-off is in `plans/DECISIONS.md` line 3097: it updates the `Draft:` line of an unstarted chapter in `sources/outline.md`. This unit changes only the first six lines of that file, so the two hunks do not overlap and merge in either order. Agrees, with the check left to AGL-19 (open point 3).
- **GNP-07 (cold_open, line 17) and GNP-10 (numbers_to_people, line 17).** Their `person` input takes kind `person` with `name`, `role` and `sources`. Provided by `k-anders-ericsson`. Agrees.
- **GNP-09 (myth_buster, lines 17 and 23).** Its `claimIds` takes only `claim` entities. Provided: two claims. Agrees.
- **GNP-21 (named_concept, line 17; objection_handler, line 19) and GNP-22 (profile, line 19; framework_builder, line 22).** `named_concept` returns a label and a one-line definition, which the `concept` schema holds as `name` and `definition`; its root allows other keys (`entity-types.ts` line 188). `profile` takes a `person`, and the two `claimIds` inputs take `claim`. Provided. Agrees.
- **GRR-16 (sample recipe; blocked by the workhorses gate, its line 7).** It names "Key people and claims" (its line 17) and needs no entity path. Provided. Agrees.
- **CEX-04 (bibliography, line 30).** `all` lists every `source` entity by `citation`, so the outline, which now has a citation (D6), appears in an `all` bibliography. This unit does not decide it (open point 4).
- **CEX-07 (banned phrases, line 19).** It reads the style profile that `project.yaml` names. The sample names none, so CEX-07 passes with an `info` note, which its line 20 and its criterion 2 (line 24) state as the behaviour for no style profile. The two phrases are in `book-style`, and no sample file contains them (C15). Agrees (open point 5, confirmed by the Navigator: no `styleProfile` key).
- **PLT-22 (pack layer; no plan, no branch; blocked by PLT-20 and TRG-11, both done, and by GNP-11, its line 7).** Its lines 21 and 22 check the front matter against the pack schemas and the references, which R1 checks. Its planner must choose the Ajv seam, because the pack-lint library has no validator (`plans/GNP-03.md` section 5, PLT-22 bullet). Order: on `main` the four skeleton sources have no front matter, and `m1.mjs` lines 66 to 72 read each as a `source`, which requires `title`, `citation` and `reliability` (`source.yaml` line 22). So PLT-22's entity-type check (its line 21) fails on the skeleton as it is on `main` (C26), and its criterion 5 (line 30, "passes on `examples/` with only the nonfiction skeleton") can pass only after this unit's front matter is on `main`. This order is now recorded: PLT-22's `blocked_by` names GNP-11 (`units/PLT-22-examples-check-pack-layer.md` line 7) and GNP-11's `unblocks` names PLT-22 (`units/GNP-11-nonfiction-sample-entities.md` line 9), with `modules/platform.md` line 23 agreeing (`be8eba2`, the Navigator's decision on open point 1). This unit lands first. When PLT-22 merges, its run of `npm run lint:examples` on this sample is the seam that ticks this unit's criterion 1 (section 4, tick rule). This unit changes no PLT-22 file. Agrees.
- **AGL-08 (summarize outline; its `blocked_by` names PST-11) and the e2e journey.** The scenario reads `sources/outline.md`. Its third request must contain `Chapter 6: Practice for the Rest of Us` (`journey.e2e.ts` lines 264 and 265). The body keeps that heading, the `read_file` tool returns the whole file content (`apps/api/src/modules/agent-loop/tools/builtin-tools.ts` lines 89 and 92; the only limit is 5 MiB, `apps/api/src/modules/project-store/files.service.ts` line 144), and the mock does not check the front matter. `projects-phone.e2e.ts` (lines 66 to 78) only opens the start-from-sample form, and `setup-phone.e2e.ts` (line 260) only sees its button; no spec asserts on the sample's `entities/` or on its file count (grep of `e2e/specs`). Agrees (T2).
- **CEX-08 (sample order; edits `project.yaml`).** This unit does not change `project.yaml`, so CEX-08 and this unit merge in either order. Agrees.
- **Done units that index the sample (PST-08, PST-13).** They read `entities/` and `sources/`. The new files are picked up without a change. Agrees.
- **Other plans (re-checked at `b010ab4`).** The only other plan that is `draft` or `planned` is `plans/TRG-13.md` (draft). It changes `apps/web/**` and `e2e/specs/tools-preview.e2e.ts` (its section 2) and no path of section 2 here; if it merges first, T2 (b) runs its changed spec on the base and on the branch alike. `plans/TRG-12.md` is now `done` (`ac13917`); its merge changed `apps/api/**`, one test file and `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json`, none of them a path of this plan. The open branches `unit/PST-15`, `unit/SAU-13` and `unit/TRG-07` (plans done) change no path under `examples/`, `e2e/` or `scripts/examples-check/` (`git diff --name-only main...<branch>`). GNP-05, GNP-07, GNP-08, GNP-09 and GNP-10 have no plan (`ls plans`), and none of them names an `examples/` path (grep). The units that name a sample path under `examples/nonfiction/` are GNP-11, AGL-19, CEX-08, GRR-16 and PST-11. No plan changes a path of section 2.

## 6. Open points

1. **The seam of criterion 1 before PLT-22 is merged. Decided by the Navigator: option (c).** Record: `plans/DECISIONS.md`, `## 2026-11-16 — GNP-11 — open points 1 and 5: the Navigator's decisions`. The criterion's parenthesis names "Platform's examples check, pack layer", which is PLT-22, and PLT-22's criterion 5 cannot pass before this unit's source front matter is on `main` (C26). Decision: criterion 1's box stays unticked at GNP-11's merge, with the cause "PLT-22 not merged". The box is ticked when `npm run lint:examples` passes on a `main` that contains PLT-22's pack layer. R1 and its controls (T1 (b)) are the work pass, and the unit is complete without the box (precedent: SAU-16, `plans/DECISIONS.md` line 4937). The order is recorded in the units by the orchestrator (`be8eba2`): PLT-22's `blocked_by` names GNP-11 (its line 7), GNP-11's `unblocks` names PLT-22 (its line 9), and `modules/platform.md` line 23 agrees. Effects on this plan: the tick rule of section 4, steps 0 and 12, and section 8; the steps, tests and paths are unchanged. AGL-19 and GNP-12 wait only for this unit; GNP-12's criterion 3 (its line 19) is checked again at its gate.
2. **Can the e2e run in this environment? Settled by the reviser.** Yes. On this machine `npm run e2e` passed on 2026-11-16 for SAU-17 (`plans/DECISIONS.md`, the SAU-17 implementer record, "`npm run e2e` exit 0 (11 passed)") and for MPR-11 ("9 of 9"), with Node v26.13.0 and Playwright 1.65.0. Step 3 records `E0`, and a failing base stops the work before any edit (step 3). No Navigator point.
3. **Claim statuses against the AGL-19 draft. Settled; hand-off.** This unit sets two statuses from the sources (D3), as S3 asks. AGL-19 is blocked by this unit, so AGL-19's planner matches its verdicts to these statuses (section 5); a later claim for AGL-19's own statement is a new entity there and needs no change here. No Navigator point.
4. **The outline in the bibliography. Settled; hand-off to CEX-04 and CEX-08.** `citation` is required (`source.yaml` line 22), and `m1.mjs` reads every `sources/` file as a `source`, so the outline must have a citation. CEX-04 line 30 defines `all` as every Source, so the sample's `all` bibliography lists the outline's citation; CEX-08 (line 16) writes the sample's export settings and can choose `cited`. Neither choice changes a file of this unit. No Navigator point unless CEX-04's planner proposes to change CEX-04's definition of `all`.
5. **A `styleProfile` reference in `project.yaml`. Decided: option (a), no change (D8); confirmed by the Navigator.** Record: the same `plans/DECISIONS.md` entry as point 1. `examples/nonfiction/project.yaml` keeps no `styleProfile` key. This is a confirmation of `plans/PST-11.md` line 51 (a `done` plan) and of GNP-11's Decisions (unit lines 16 to 20, which list five entities and the source front matter only), not a new decision. Every reader handles the absent key: CEX-07 line 20 and criterion 2 (line 24, "no style profile gives an `info` pass"); AGL-09 line 19 fills an empty style field only from a set key; TRG-04 line 19 and TRG-16 line 15 default or fill only when it is set; the workhorses' `styleProfile` input is optional (`modules/genre-packs.md` line 62). Adding the key would edit a file of the done PST-11 outside this unit's scope and make a merge-order dependency with CEX-08, which also edits that file.

## 7. Facts checked and facts assumed

### 7a. Checked

- **C1 Main, tree and worktrees.** `git rev-parse --short HEAD` printed `24b1b3c` at the start and `bafecf2` at the end. `git diff --name-only 24b1b3c HEAD` lists `plans/TRG-13.md` only. `git status --short` shows only ` M units/SAU-12-providers-step.md`, which this plan does not touch. `git branch --list 'unit/GNP-11'` is empty. `git worktree list` shows the PST-15, SAU-13, TRG-07 and TRG-12 worktrees and none for GNP-11. Node v26.13.0 and npm 11.20.0 are on this machine.
- **C2 Plan statuses.** `plans/GNP-03.md`, `plans/GNP-06.md`, `plans/GNP-01.md`, `plans/PST-11.md`, `plans/PST-08.md`, `plans/PLT-20.md` and `plans/TRG-11.md` have `status: done` (line 3 or 4). `plans/TRG-12.md` was `planned` at `bafecf2` and is `done` at `b010ab4` (`ac13917`). `plans/TRG-13.md` is `draft`. No plan exists for PLT-22, AGL-19, GNP-05, GNP-07, GNP-08, GNP-09, GNP-10, GNP-12, GRR-16 or CEX-08 (`ls plans`). `plans/QUEUE.md` line 9 lists GNP-11 as available.
- **C3 The unit file.** `units/GNP-11-nonfiction-sample-entities.md`: front matter lines 2 to 9; Decisions lines 15 to 20 (line 15 is the change note of `be8eba2`; the original Decisions are lines 16 to 20); criteria lines 23 and 24. `git log --oneline -- units/GNP-11-nonfiction-sample-entities.md` lists `be8eba2`, `098add9` and `2fed3f4`; `unblocks` (line 9) now names GNP-12, AGL-19 and PLT-22. Its `parallel_with` (GNP-05, GNP-07, GNP-08, GNP-09, GNP-10) is symmetric: each of those units lists GNP-11 back on its line 8. The units that name GNP-11 in `blocked_by` are GNP-12, AGL-19 and PLT-22 (line 7 of each; PLT-22 since `be8eba2`). GNP-03 (line 9), GNP-06 (line 9) and PST-11 (line 9) each list GNP-11 in `unblocks`.
- **C4 The module.** `modules/genre-packs.md`: line 19 (the dependency graph draws GNP-11 under GNP-06 with PST-11), line 31 (GNP-06 after GNP-03, the Navigator decision of `plans/DECISIONS.md` line 4948), line 32, line 63 (length default 800), line 69 (envelope and reference hints), lines 73 to 77 (the source, style-profile, person, claim and concept rows), line 76 (status values), line 82 (stable names), line 85 (test principles), line 88 (sample checks; unit tests never read `examples/`), line 93 (sample sourcing).
- **C5 README.** `units/README.md` line 64 (`blocked_by` is the source of truth; `unblocks` is its inverse; `parallel_with` is symmetric), line 138 (testing; unit tests never read `examples/`).
- **C6 Pack entity types on main.** `packages/packs/core/entity-types/source.yaml`: the fields at lines 9 to 21 and `required: [title, citation, reliability]` at line 22. `style-profile.yaml`: `folder: entities` at line 5, `bannedPhrases` at lines 16 to 20, `required` at line 21. `packages/packs/nonfiction/entity-types/person.yaml`: `folder: entities` at line 5, `sources` at lines 15 to 22 with the hints at lines 19 and 20, `required` at line 23. `claim.yaml`: the hints at lines 16 and 17, the enum at line 23. `concept.yaml`: `required` at line 16. Each nonfiction file has `schemaVersion: 1` at line 1.
- **C7 The four sources.** `examples/nonfiction/sources/outline.md`, `ten-thousand-hours-notes.md`, `deliberate-practice-notes.md` and `learning-plateaus-notes.md` each start with a `#` heading and have no front matter (read in full). The plateau notes carry the verification paragraph at line 15, added by commit `43ba0bb`. The facts used by D2 to D6 are at these lines: `ten-thousand-hours-notes.md` lines 5 (the 1993 article, its title and journal), 7 (violin students, Berlin, grouped by level, the best group, about 10,000 hours by age twenty), 9 (an average, individuals varied), 11 (Gladwell, surname only), 13 (few students, one school, hours estimated from memory); `deliberate-practice-notes.md` lines 5 (the same article), 7 (playing through), 9 to 13 (the three features), 15 (no numbers); `learning-plateaus-notes.md` lines 5 (Bryan and Harter, 1897 and 1899, telegraphy), 7 (speed rises, levels, rises), 9 (a change of method, gains return), 11 (a stage of reorganising), 13 (narrow subject), 15 (from memory, texts unread); `outline.md` lines 3 and 7 to 47, with chapter 4 to 6 marked `Draft: not started.` at lines 27, 33 and 39.
- **C8 The sample.** `examples/samples.yaml` (one entry, `nonfiction`, lines 1 to 3). `examples/nonfiction/project.yaml` lines 1 to 4: a comment, `schemaVersion: 1`, `title`, `genrePack: nonfiction`; no `styleProfile`.
- **C9 The gate.** `package.json` line 26 (`lint`), line 27 (`lint:examples`), line 30 (`e2e`). `scripts/examples-check/index.mjs` line 13 (PLT-22 appends its layer), line 16 (`LAYERS = [m1, graph]`), line 58 (issues sorted), line 65 (the pass line). Read-only run on main, with no build: `node scripts/examples-check/index.mjs` printed `examples check passed: 1 sample(s), 1 project.yaml, 4 entity file(s), 195 test file(s) scanned` and exited 0.
- **C10 The entity check.** `scripts/examples-check/m1.mjs` lines 21 and 22 (`ENTITY_FOLDERS`), lines 59 to 82 (`entityFiles`), lines 66 to 72 (a `sources/` file without `type` is read as `source`), lines 191 to 199 (`checkEntity` with `entityBaseSchema`). `scripts/examples-check/lib.mjs` lines 61 to 69 (`discoverSamples`) and line 73 (`readFrontMatter`).
- **C11 The contracts.** `packages/contracts/src/project-store/entities.ts` lines 11 to 15 (`entityBaseSchema`: `type` at least one character, optional `id` and `links`). `constants.ts` line 4 (`ENTITY_ID_PATTERN`). `project.ts` line 24 (`styleProfile`, optional).
- **C12 The loader.** `apps/api/src/modules/tool-registry/entity-types.ts` line 184 (`new Ajv({ allErrors: true, strict: true })`), lines 185 to 189 (the schema: the stripped fields, `type: 'object'`, `additionalProperties: true`). `apps/api/src/modules/tool-registry/inputs.ts` lines 172 to 180 (`stripExtensions`, which removes every `x-` key at every depth).
- **C13 Versions.** `apps/api/node_modules/ajv` is version 8.20.0. The root `node_modules/ajv` is version 6.15.0 (corrected in revision 2; revision 1 said 8.20.0 for both). `node_modules/yaml` is version 2.9.1.
- **C14 R1 in memory.** With the schema of C12 and no file written, the pack files gave: `person` with two sources valid; `claim` with `status: supported` valid; `claim` with `status: unsourced` rejected at `/status` ("must be equal to one of the allowed values"); `source` without `citation` rejected ("must have required property 'citation'"); `style-profile` with `bannedPhrases` as a plain string rejected at `/bannedPhrases` ("must be array"); `style-profile` as planned valid; `concept` valid.
- **C15 Prettier and phrases.** `npx prettier --check examples` on main prints `All matched files use Prettier code style!`. Every planned front-matter block and entity body was passed through `npx prettier --stdin-filepath`, with nothing written to the repository, and came back unchanged. `.prettierrc.json` sets `singleQuote` and `trailingComma: all`. `.prettierignore` lines 1 to 5 do not ignore `examples/`. A grep of `examples` for `game-changer` and `unlock your potential` finds nothing.
- **C16 The e2e.** `e2e/specs/journey.e2e.ts` line 149 (`sources/outline.md` exists after the first project), line 240 (the intent), line 247 (`Read sources/outline.md.`), line 250 (`The outline has six chapters`), lines 264 and 265 (`toContain` of `Chapter 6: Practice for the Rest of Us`). `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` line 17 (`sources/outline.md`). `e2e/harness/global-setup.ts` line 81 (`SCRIBA_EXAMPLES_DIR`). `e2e/playwright.config.ts` (`testMatch` `**/*.e2e.ts`; the Chromium path from `SCRIBA_E2E_CHROMIUM`). `.gitignore` line 8 (`e2e/test-results/`).
- **C17 Chromium cache.** `~/.cache/ms-playwright` holds `chromium-1194`, `chromium-1248` and `chromium-1254` (listed, not run).
- **C18 No test reads the sample.** A grep of `apps/api/test`, `packages/packs/test` and `scripts/*.test.mjs` for `examples`, `nonfiction`, `samples.yaml`, `outline.md` and `sources/` finds only temporary-library paths (for example `apps/api/test/create-test-app.ts` line 81, `join(library, 'examples')`) and the paths of the test's own library.
- **C19 Downstream lines.** GNP-12 lines 7, 19, 20, 24 and 27. AGL-19 lines 7, 15, 16, 17, 21 and 22. GNP-07 line 17. GNP-09 lines 17 and 23. GNP-10 line 17. GNP-21 lines 7, 17 and 19. GNP-22 lines 7, 19 and 22. GRR-16 lines 7 and 15. CEX-04 line 30. CEX-07 lines 7 and 19. CEX-08 line 15. CEX-20 lines 22 and 25. PLT-22 lines 7, 17 (the change note of `be8eba2`), 21, 22, 27, 28 and 30. `modules/platform.md` line 23 (PLT-22 needs GNP-11). AGL-09 line 19. PST-01 lines 18 and 21. PST-08 lines 18, 19, 29 and 31. PST-13 line 19.
- **C20 Plans of the blockers.** `plans/GNP-03.md` D1 (line 14), D2 (line 16), D3 (line 18), D4 (line 20), section 5 (the GNP-11 bullet at line 152; the PLT-22 bullet at line 158). `plans/GNP-06.md` D1 to D4 (lines 16 to 22), section 5 (the GNP-11 bullet at line 179). `plans/PST-11.md` D2 (line 32), D4 (line 34), D5 (line 35), D6 (line 36), D11 (line 41), section 2 (the `project.yaml` row at line 51), section 1a (the Prettier bullet at line 24), section 6 (open points 1 to 6, lines 165 to 170).
- **C21 DECISIONS.** Searched by unit id. GNP-11 has the orchestrator's record of the revision 1 draft (line 5036, `## 2026-11-16 — GNP-11 — Planner draft, revision 1 (orchestrator record)`), which settles nothing, and the Navigator's decisions on open points 1 and 5 (line 5069, `## 2026-11-16 — GNP-11 — open points 1 and 5: the Navigator's decisions`). SAU-16's tick-rule precedent is at line 4937. GNP-12 and AGL-19 have no entry. PLT-22 has no entry of its own; the PLT-21 entry (line 4480) names shared helper names for PLT-22 in `scripts/examples-check/`, which this plan does not change. PST-11 has entries at lines 2405, 2874, 3058, 3093, 3097 and 3326. GNP-03 has entries at lines 4922 and 4928. GNP-06 has the Navigator decision at line 4948. GNP-01's CI decision is at line 4903.
- **C22 Rules.** `prompt.md` line 118 (the implementer's own worktree), line 121 (`npm ci` in a new worktree), line 124 (commits carry the unit id), lines 297 and 300 (commit messages).
- **C23 Sentence check.** Each sentence of the five entity bodies and each front-matter value of section 2 was compared with the source lines named in D2 to D5. Each restates a line of the sources, or is an instruction about the sample's own status (the plateau claim's "stays weak until the papers are read"). The planner checked this by reading; no tool did.
- **C24 Commits.** `6756f0d` (PST-11 skeleton), `43ba0bb` (PST-11, plateau notes unverified), `f303689` (GNP-03), `5213c1e` (GNP-06), `80bdbea` (GNP-01).
- **C25 Re-check at `b010ab4` (reviser, revision 2).** `git diff --name-only bafecf2 b010ab4` lists `apps/api/src/modules/tool-registry/{executor.service.ts,tool-registry.module.ts,tools.controller.ts,validate.ts}`, `apps/api/test/fixtures/executor/packs/core/tools/render_probe.yaml`, `apps/api/test/invariant-sweep.ts`, `apps/api/test/tool-registry-executor.test.ts`, `e2e/fixtures/mock-openai/scenarios/tool-execute-draft.json`, `plans/DECISIONS.md`, `plans/GNP-11.md`, `plans/TRG-12.md` and `units/TRG-12-executor.md` (the TRG-12 merge). None is a path of section 2 or a file cited by C6 to C12 and C16; the test-file count `<N>` of step 3 grows by one, which step 3 records. `git ls-files examples` lists the ten paths of step 0. `git status --short` shows only ` M units/SAU-12-providers-step.md`. No `unit/GNP-11`, `unit/GNP-12`, `unit/AGL-19` or `unit/PLT-22` branch and no plan file for GNP-12, AGL-19 or PLT-22. The line references of S10 to S12, C9 to C12 and the R1 spec were re-read: `package.json` lines 26, 27 and 30; `index.mjs` lines 16 and 65; `m1.mjs` lines 21 to 22, 59 to 82, 66 to 72 and 191 to 199; `lib.mjs` line 73; `entity-types.ts` lines 184 to 189; `inputs.ts` lines 172 to 190. The reviser ran the R1 logic in memory (a script in `/tmp`, nothing written to the repository) on the nine front-matter blocks of section 2 with `ajv` 8.20.0 from `apps/api`: all nine valid. Each planned file (for a source: its block, a blank line and the current file) passed through `npx prettier --stdin-filepath` came back unchanged. The other e2e specs that touch the sample (`projects-phone.e2e.ts` lines 66 to 78, `setup-phone.e2e.ts` line 260) assert nothing on its files.
- **C26 PLT-22 on the skeleton.** `m1.mjs` lines 66 to 72 give each `sources/` file without `type` the type `source`; `readFrontMatter` (`lib.mjs` lines 73 to 76) reads a file with no front matter as `{}`; `source.yaml` line 22 requires `title`, `citation` and `reliability`. So a pack-layer check of `examples/` on `main` reports the four skeleton sources as missing those fields, until this unit's front matter is on `main`.

### 7b. Assumed, not checked

- **ASSUMED:** the 1993 study and the Bryan and Harter papers are as the sources state them. The planner has no network access in this run, so it did not check them against the articles. The plateau notes say they are from memory (C7). The sample copies what the sources say and no more; PST-11 open point 5 holds for this unit as well.
- **ASSUMED:** `npm ci` in the new worktree succeeds (step 2 checks it).
- **ASSUMED:** the e2e passes on the base, as it did for SAU-17 and MPR-11 on this machine on 2026-11-16 (open point 2, settled). Step 3 checks it and stops the work if it fails.
- **ASSUMED:** `readFrontMatter` can be imported from a script outside the repository by a `file://` URL. Step 7 checks it.
- **ASSUMED:** Prettier leaves each file as C15 shows, when the file is written and not piped. Step 6 checks it.

### 7c. Inconsistencies found (for the orchestrator; none is changed by this plan)

- `units/GNP-11-nonfiction-sample-entities.md` line 23 says "Platform's examples check, pack layer", but PLT-22 is not in its `blocked_by` (line 7) and has no plan. Resolved by the Navigator (open point 1, option (c)): the box stays unticked until PLT-22 is merged; PLT-22 is blocked by GNP-11.
- `units/GNP-11-nonfiction-sample-entities.md` line 19 says "if skeleton sources lack Source front matter", but all four lack it, and GNP-03 makes `citation` and `reliability` required (`packages/packs/core/entity-types/source.yaml` line 22).
- `modules/genre-packs.md` line 88 says PLT-20 to PLT-22 validate sample files against the entity-type schemas; PLT-20 (done) does not, and that is PLT-22's job, which is not merged.
- `modules/genre-packs.md` line 19 draws GNP-11 under GNP-06 with PST-11, not under GNP-03 (its `blocked_by` at line 7); the Navigator decision of `plans/DECISIONS.md` line 4948 left the graph as it is.
- `plans/PST-11.md` lines 22, 41 and 165 cite `units/README.md` line 133 for "unit tests never read examples/"; the rule is at line 138.
- `units/CEX-04-assembled-markdown.md` line 30 (`all` is every Source entity) and `plans/PST-11.md` open point 4 (line 168): the outline, given a citation by D6, appears in the sample's bibliography.
- `units/AGL-09-narrative-tools.md` line 19 and `units/CEX-07-entity-links-banned-phrases.md` line 19 read the project's style profile, but `examples/nonfiction/project.yaml` names none (`plans/PST-11.md` section 2 decided so; the Navigator confirmed it, open point 5). Both readers handle the absent key.
- `units/PLT-22-examples-check-pack-layer.md` criterion 5 (line 30) says the check passes on `examples/` with only the nonfiction skeleton, but the skeleton's sources fail the `source` schema until this unit adds their front matter (C26). Resolved by `be8eba2`: PLT-22 is blocked by GNP-11 (its line 7). Still stale: `plans/QUEUE.md` line 15 lists PLT-22 as available ("all blockers done"); the orchestrator regenerates the queue.

## 8. Review parts

The plan is small, so it has one part.

| Part | Steps | Tests | Paths |
|---|---|---|---|
| 1. Sample entities and source front matter | Section 3, steps 0 to 12 | T1 (criterion 1, with R1 and its controls c1 and c2) and T2 (criterion 2) | The nine paths of section 2 |

The reviewer of part 1 compares the diff with section 2 (exact text, nine paths), checks that each entity sentence restates a source line (C23), and checks T1 and T2 against section 4. The reviewer checks that criterion 1's box is not ticked at merge (section 4, tick rule; open point 1, option (c)); T1 is its work pass.
