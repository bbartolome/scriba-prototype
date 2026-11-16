---
id: GNP-11
status: draft
---
# GNP-11 plan — nonfiction sample entities and Source front matter on the skeleton sources

Revision 1, written at main bafecf2 from the repository alone. Status stays draft until the plan review approves it.

Batch: [GNP-11] (Genre packs, phase:nonfiction-workhorses, M2), a batch of one. The facts of section 7 were read at `24b1b3c`, and main moved to `bafecf2` while the plan was written. `git diff --name-only 24b1b3c HEAD` lists only `plans/TRG-13.md`, so every fact holds at `bafecf2`. The unit file was read in full (lines 1 to 23). It has no change note: its two commits (`2fed3f4`, `098add9`) moved it and fixed its dependency fields, and `c45cd5e` did not touch it. Its blockers hold: GNP-03 (`plans/GNP-03.md` line 4, `done`; code `f303689`), GNP-06 (`plans/GNP-06.md` line 4, `done`; code `5213c1e`) and PST-11 (`plans/PST-11.md` line 3, `done`; code `6756f0d` and `43ba0bb`). No `unit/GNP-11` branch and no worktree exist. This plan changes only `plans/GNP-11.md`.

## 1. Decisions this plan follows

Each item names its source. "Plan choice" marks a small choice that no source settles; the simplest option is taken, with its one-line reason.

### 1a. Settled by the unit, the module, the done blockers and DECISIONS

- **S1 Content.** Five entities in `examples/nonfiction/entities/`: one `person`, two `claim`s, one `concept`, one `style-profile`. Source: unit line 15.
- **S2 Facts and quotes.** Every reference resolves to a source in `sources/`. Entities only summarise and cite those sources and add no fact they lack. No invented quotes from real living people. Source: unit line 16; module line 93.
- **S3 Claim statuses.** The claims' statuses must not contradict the grounding-claims draft of AGL-19; coordinate when that draft lands. Source: unit line 17; `units/AGL-19-grounding-sample-draft.md` line 16. AGL-19 is blocked by this unit (its line 7), so this unit lands first; section 5 hands the check to AGL-19.
- **S4 Source front matter.** Each skeleton source that lacks Source front matter gets it in this PR. All four sources lack it (section 7, C7), and the done GNP-03 makes `citation` and `reliability` required (`packages/packs/core/entity-types/source.yaml` line 22). So all four change. Source: unit line 18; `plans/GNP-03.md` section 5, GNP-11 bullet.
- **S5 Paths are a contract.** The skeleton's file paths and the paths the mock script uses stay as they are. Source: unit line 19; `plans/PST-11.md` D2 (line 32); `e2e/specs/journey.e2e.ts` lines 149, 247 and 265; `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` line 17.
- **S6 Unit tests never read `examples/`.** Source: `modules/genre-packs.md` line 88; `units/README.md` line 138; `plans/PST-11.md` D11 (line 41). So no committed test reads the sample (D9).
- **S7 Kinds, folders and field names.** `person` (`name`, `role`, `sources`), `claim` (`statement`, `evidence`, `status`), `concept` (`name`, `definition`) and `style-profile` (`tone`, `targetLength`, `bannedPhrases`) live in `entities/`. `source` (`title`, `citation`, `url?`, `reliability`) lives in `sources/`. The names are stable once shipped. Source: `modules/genre-packs.md` lines 73 to 77 and 82; the pack files on main (C6); `plans/GNP-03.md` D1 and D2; `plans/GNP-06.md` D1 and D2.
- **S8 Status values.** `claim.status` is `supported`, `weak` or `unsupported`; `unsourced` is not a value. Source: `modules/genre-packs.md` line 76; `packages/packs/nonfiction/entity-types/claim.yaml` line 23; `plans/GNP-06.md` D3.
- **S9 Reference fields.** `person.sources` and `claim.evidence` are lists of source IDs, each field carrying `x-scriba-type: entity` and `x-scriba-entity-kinds: [source]`. Source: `modules/genre-packs.md` line 69; `person.yaml` lines 19 and 20; `claim.yaml` lines 16 and 17; `plans/GNP-06.md` D4.
- **S10 IDs and types.** An entity's ID is its front-matter `id` or, when there is none, its file stem. The ID pattern is `^[a-z0-9][a-z0-9-]*$`. An entity file needs a `type`; a `sources/` file without one is read as `source`. Source: `units/PST-08-entity-resolution.md` lines 18, 19 and 29; `packages/contracts/src/project-store/constants.ts` line 4; `packages/contracts/src/project-store/entities.ts` lines 11 to 15; `scripts/examples-check/m1.mjs` lines 66 to 72.
- **S11 Gate.** `npm run lint:examples` (`package.json` line 27) must pass, and it prints `examples check passed: 1 sample(s)` plus the entity count (`scripts/examples-check/index.mjs` line 65). The pass line changes only in its counts. Source: unit lines 22 and 23; `plans/DECISIONS.md` line 2405.
- **S12 Prettier.** `examples/` is not ignored by Prettier (`.prettierignore` lines 1 to 5). `npm run lint` ends with `prettier --check .` (`package.json` line 26). Every new or changed file must pass it. Source: `plans/PST-11.md` section 1a (the Prettier bullet, line 24); `.prettierrc.json`.
- **S13 Sample text.** No whole-word placeholder (`TK`, `TODO` and the others), no `{{`, no `[@id]`, no URL, original text. Source: `plans/PST-11.md` D4 (line 34) and D5 (line 35); `modules/genre-packs.md` line 93.
- **S14 Repository state.** No git remote is added, nothing is pushed, and no `plans/DECISIONS.md` entry names GNP-11 or GNP-12 (grep, C21). Source: `prompt.md` (commit rules, lines 297 and 300).

### 1b. Decisions this plan makes

- **D1 File names and IDs (plan choice).** The file stem is the ID; no front-matter `id` is written. Files: `entities/k-anders-ericsson.md`, `entities/hours-figure-is-average.md`, `entities/plateau-is-reorganising.md`, `entities/deliberate-practice.md` and `entities/book-style.md`. Reason: the stem is the simplest ID that S10 accepts, and no ID equals a source stem.
- **D2 The person (plan choice).** K. Anders Ericsson, role "One of the three authors of the 1993 article on deliberate practice", sources `[deliberate-practice-notes, ten-thousand-hours-notes]`. Both notes name him in full (`deliberate-practice-notes.md` line 5; `ten-thousand-hours-notes.md` line 5). Reason: "Gladwell" in `ten-thousand-hours-notes.md` line 11 is a surname only, and a first name would add a fact the sources lack. The entity has no quotation, so S2 holds whatever his status.
- **D3 The two claims (plan choice from the sources).** `hours-figure-is-average`: statement "The ten-thousand-hour figure is an average from one 1993 study, not a threshold", evidence `[ten-thousand-hours-notes]`, status `supported` (`ten-thousand-hours-notes.md` lines 5, 7 and 9 state it). `plateau-is-reorganising`: statement "A learning plateau can be a stage of reorganising rather than an end", evidence `[learning-plateaus-notes]`, status `weak`, because the notes say their reading is from memory and the full texts are unread (`learning-plateaus-notes.md` lines 13 and 15). Reason: one supported and one weak claim give the grounding draft of AGL-19 two statuses to match (S3), and both are stated by the sources.
- **D4 The concept (plan choice).** `deliberate-practice`, name "Deliberate practice", definition "Practice on a well-defined task at the right level of difficulty, with informative feedback and chances to repeat and correct errors" (`deliberate-practice-notes.md` lines 11 to 13 give the three features). The definition is one line, as the module requires (`modules/genre-packs.md` line 77).
- **D5 The style profile (plan choice).** `book-style`: tone "Plain and direct for an adult reader, with short sentences and no hype"; `targetLength: 800`, the default length of the workhorse tools (`modules/genre-packs.md` line 63); `bannedPhrases: [game-changer, unlock your potential]`. Reason: no source gives a style; neither phrase appears in the sample (C15).
- **D6 Source front matter (plan choice).** Each source gets a front-matter block with `type: source`, `title` (its H1, without the colon), `citation` and `reliability`. No `url` (S13) and no `id` (D1). Each citation uses only what its file states: K. Anders Ericsson, Ralf Krampe and Clemens Tesch-Römer, 1993, the article's title, and Psychological Review (the first two notes); Bryan and Harter, 1897 and 1899 (the plateau notes). No volume or page is added. The outline's citation is "The author's working outline for this book", because `citation` is required (S4). Reason: this answers PST-11 open point 4 for this file (`plans/PST-11.md` line 168) by giving the outline a citation.
- **D7 Bodies (plan choice).** The four source bodies do not change. The five entity bodies are one or two sentences that restate what the sources say, with no quotation marks around any person's words and no figure that the sources do not state (`plans/PST-11.md` D6). Reason: S2 and S5.
- **D8 `project.yaml` does not change.** No unit asks for it, and `plans/PST-11.md` section 2 decided that it names no `styleProfile`. Open point 5 records the question. Reason: scope.
- **D9 No committed test (plan choice).** Both criteria are checked by recorded commands (section 4), as `plans/PST-11.md` D11 did. Reason: S6, and the pack layer that would check the sample, PLT-22, is not merged (open point 1).
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

0. **Base.** In the main checkout, `git rev-parse --short HEAD` prints the base hash; write it down as `<base>`. In the worktree, `git branch --show-current` prints `unit/GNP-11` and `git status --short` prints nothing. `git ls-files examples` prints exactly these ten paths: `examples/nonfiction/.gitignore`, the three files of `examples/nonfiction/drafts/`, `examples/nonfiction/project.yaml`, the four files of `examples/nonfiction/sources/`, and `examples/samples.yaml`. `examples/nonfiction/entities` does not exist. If any of this differs, stop and report.
1. **Runtime.** `node -v` prints `v26.x`; `npm -v` prints `11.x`.
2. **Install.** `npm ci`. Expected: exit 0, and `git status --short` still prints nothing.
3. **Baseline, before any edit.** (a) `npm run lint:examples`. Expected: exit 0 and the line `examples check passed: 1 sample(s), 1 project.yaml, 4 entity file(s), <N> test file(s) scanned`; record `<N>`. (b) `npm run e2e`. Record its exit code as `E0`, and the last 20 lines of its output. If it cannot start, record the exact error and `E0` as "not run", and continue (open point 2).
4. **Source front matter (section 2).** Insert the front matter of each of the four source files above its first line, exactly as section 2 gives it. Expected: `git diff -- examples/nonfiction/sources` shows, for each file, six added lines before the existing H1 and no other change.
5. **Entities (section 2).** Run `mkdir examples/nonfiction/entities`. Write the five files of section 2 with their exact text. Expected: `git status --short -uall` lists the four modified source files and the five new entity files, and nothing else.
6. **Format.** `npx prettier --write examples/nonfiction/sources examples/nonfiction/entities`, then `npx prettier --check examples`. Expected: the second prints `All matched files use Prettier code style!`. Then `git diff -- examples/nonfiction/sources` again: the body of each source is unchanged. If Prettier changed a value, keep what Prettier wrote and record the change in the report.
7. **Criteria checks.** Run T1 and T2 of section 4. Expected: each pass condition of section 4 holds.
8. **Regression.** From the root: `npm run lint` and `npm test`. Expected: each exits 0. `npm run lint` ends with `All matched files use Prettier code style!`.
9. **Scope.** `git status --short -uall` lists exactly nine paths: four ` M` entries for the source files and five `??` entries for the entity files. `e2e/test-results/` is gitignored (`.gitignore` line 8), so an e2e run adds nothing to this list.
10. **Commit.** `git add -- examples/nonfiction/sources/outline.md examples/nonfiction/sources/ten-thousand-hours-notes.md examples/nonfiction/sources/deliberate-practice-notes.md examples/nonfiction/sources/learning-plateaus-notes.md examples/nonfiction/entities/k-anders-ericsson.md examples/nonfiction/entities/hours-figure-is-average.md examples/nonfiction/entities/plateau-is-reorganising.md examples/nonfiction/entities/deliberate-practice.md examples/nonfiction/entities/book-style.md`. Then `git diff --cached --stat` must list exactly these nine paths. Commit with `git commit -m "feat(GNP-11): nonfiction sample entities and source front matter"`. Do not push.
11. **Fresh clone.** `git clone --branch unit/GNP-11 /Users/bbartolome/workspace/scriba-prototype <empty temporary folder>`. In it: `npm ci && npm run build && npm test && npm run lint`. Expected: each exits 0. Then `npm run lint:examples` prints `1 sample(s)` and `9 entity file(s)`.
12. **Record.** Store the Node and npm versions and each command's output. A criterion is marked passed only when its test in section 4 holds. The orchestrator ticks the unit file's boxes after review, not this plan.

## 4. Acceptance criteria and tests

The criteria text is copied from `units/GNP-11-nonfiction-sample-entities.md` lines 22 and 23. The unit has two criteria, so there are two tests, T1 and T2. Neither is a committed file (D9). Both are recorded commands, run in the worktree on the final tree of step 10, with the output kept in the report.

| Criterion (unit line) | Test and seam | Command | Pass condition |
|---|---|---|---|
| "Sample entities validate against their types (Platform's examples check, pack layer), and every entity reference resolves to an existing file in the sample." (22) | **T1.** The examples check (part a) and the pack-layer check of the same files, run by recorded script R1 (part b), because PLT-22 is not merged (open point 1). | (a) `npm run lint:examples` from the root. (b) `T=$(mktemp -d)`, then write R1 to `$T/r1.mjs` (spec below) and run `node "$T/r1.mjs" examples/nonfiction` from the root. | (a) exit 0; the pass line reads `examples check passed: 1 sample(s), 1 project.yaml, 9 entity file(s), <N> test file(s) scanned`. (b) exit 0; the last line reads `R1: 9 entity file(s) checked, 4 reference(s) checked, 0 issue(s)`. Controls, run on copies made with `cp -R examples/nonfiction "$T/n"`: (c1) delete the line that begins `citation:` in `$T/n/sources/outline.md`; R1 exits 1 and an issue names `outline.md` and `citation`. (c2) in `$T/n/entities/plateau-is-reorganising.md` change `evidence: [learning-plateaus-notes]` to `evidence: [plateau-notes]`; R1 exits 1 and an issue names `plateau-is-reorganising.md` and `plateau-notes`. The controls show that R1 is armed. |
| "Platform's examples check passes; the e2e still passes unchanged." (23) | **T2.** The examples check (part a) and the e2e run of the repository, compared with the base (part b). | (a) `npm run lint:examples`. (b) `npm run e2e` from the root. (c) `git diff --name-only <base> HEAD -- e2e`, with `<base>` from step 0. | (a) exit 0, with the pass line of T1 (a). (b) the exit code equals `E0` from step 3 and `E0` is 0. (c) prints nothing: no file under `e2e/` changed. If `E0` is not 0, or the run cannot start, part (b) does not pass; open point 2 applies. |

**R1 spec (a recorded check, not committed).** The implementer writes R1 to `$T/r1.mjs`, a file in a new temporary folder outside the repository, and runs it from the repository root. It takes one argument, the sample folder.

- It imports `readFrontMatter` from `scripts/examples-check/lib.mjs` (line 73), by a `file://` URL built with `pathToFileURL` from `process.cwd()`. It loads `ajv` and `yaml` with `createRequire` from `apps/api/package.json`. `ajv` is version 8.20.0 (`apps/api/node_modules/ajv`), and `yaml` is at the root.
- It reads every `*.md` file in `<sample>/entities` and `<sample>/sources`. The kind of each file is its front-matter `type`.
- It loads `packages/packs/core/entity-types/<kind>.yaml`, or else `packages/packs/nonfiction/entity-types/<kind>.yaml`. A kind with neither file is an issue.
- It builds the schema as the loader does (`apps/api/src/modules/tool-registry/entity-types.ts` lines 185 to 189). It takes the `fields` of the kind's file, removes every key that begins with `x-` at every depth (as `stripExtensions` does, `inputs.ts` lines 172 to 180), and adds `type: 'object'` and `additionalProperties: true`. It compiles the schema with `new Ajv({ allErrors: true, strict: true })` (line 184) and validates the front matter. Each Ajv error is one issue, named by file, `instancePath` and message.
- For each `person` (field `sources`) and each `claim` (field `evidence`), every listed ID must equal the stem of a `*.md` file in `<sample>/sources`. Each ID that does not is one issue, naming the file and the ID.
- It prints the summary line `R1: <n> entity file(s) checked, <m> reference(s) checked, <k> issue(s)`. With no issue it exits 0. Otherwise it prints each issue on stderr, then the summary, and exits 1.

The in-memory run of the same logic on the planned front matter gave the expected results (C14). The file-based run is checked by T1 (b) and its controls.

## 5. Downstream agreement

- **GNP-12 (workhorses gate; blocked by GNP-11, its line 7).** Its criterion 3 (line 19, "Sample entities validate and every reference resolves") is T1. Its demo steps 2 and 5 (lines 24 and 27) need a person and claims. Provided: `k-anders-ericsson` (kind `person`), `hours-figure-is-average` and `plateau-is-reorganising` (kind `claim`), `deliberate-practice` (kind `concept`), `book-style` (kind `style-profile`), and four sources whose IDs are their stems. Agrees.
- **AGL-19 (grounding sample draft; blocked by GNP-11, its line 7).** Its draft must not contradict the claim statuses (its line 16). Provided: two claims, one `supported` and one `weak`, both about the sources, and no `unsupported` claim. AGL-19's planner must match the verdicts of any statement that matches these two claims to these statuses. Its invented statistic has no claim entity, so it cannot contradict one. Its other hand-off is in `plans/DECISIONS.md` line 3097: it updates the `Draft:` line of an unstarted chapter in `sources/outline.md`. This unit changes only the first six lines of that file, so the two hunks do not overlap and merge in either order. Agrees, with the check left to AGL-19 (open point 3).
- **GNP-07 (cold_open, line 17) and GNP-10 (numbers_to_people, line 17).** Their `person` input takes kind `person` with `name`, `role` and `sources`. Provided by `k-anders-ericsson`. Agrees.
- **GNP-09 (myth_buster, lines 17 and 23).** Its `claimIds` takes only `claim` entities. Provided: two claims. Agrees.
- **GNP-21 (named_concept, line 17; objection_handler, line 19) and GNP-22 (profile, line 19; framework_builder, line 22).** `named_concept` returns a label and a one-line definition, which the `concept` schema holds as `name` and `definition`; its root allows other keys (`entity-types.ts` line 188). `profile` takes a `person`, and the two `claimIds` inputs take `claim`. Provided. Agrees.
- **GRR-16 (sample recipe; blocked by the workhorses gate, its line 7).** It names "Key people and claims" (its line 17) and needs no entity path. Provided. Agrees.
- **CEX-04 (bibliography, line 30).** `all` lists every `source` entity by `citation`, so the outline, which now has a citation (D6), appears in an `all` bibliography. This unit does not decide it (open point 4).
- **CEX-07 (banned phrases, line 19).** It reads the style profile that `project.yaml` names. The sample names none, so CEX-07 passes with an `info` note until open point 5 is settled. The two phrases are in `book-style`, and no sample file contains them (C15). Agrees, with open point 5.
- **PLT-22 (pack layer; not planned; blocked by PLT-20 and TRG-11, its line 7).** Its lines 20 and 21 check the front matter against the pack schemas and the references, which R1 checks. Its planner must choose the Ajv seam, because the pack-lint library has no validator (`plans/GNP-03.md` section 5, PLT-22 bullet). Agrees: every file passes R1, and PLT-22 later adds the permanent check.
- **AGL-08 (summarize outline; its `blocked_by` names PST-11) and the e2e journey.** The scenario reads `sources/outline.md`. Its third request must contain `Chapter 6: Practice for the Rest of Us` (`journey.e2e.ts` lines 264 and 265). The body keeps that heading, and the mock does not check the front matter. Agrees (T2).
- **CEX-08 (sample order; edits `project.yaml`).** This unit does not change `project.yaml`, so CEX-08 and this unit merge in either order. Agrees.
- **Done units that index the sample (PST-08, PST-13).** They read `entities/` and `sources/`. The new files are picked up without a change. Agrees.
- **Other plans.** `plans/TRG-12.md` (planned) changes only `apps/api/**` and one mock scenario. `plans/TRG-13.md` (draft) changes `e2e/specs/tools-preview.e2e.ts` and no path of section 2. GNP-05, GNP-07, GNP-08, GNP-09 and GNP-10 have no plan (`ls plans`), and none of them names an `examples/` path (grep). The units that name a sample path under `examples/nonfiction/` are GNP-11, AGL-19, CEX-08, GRR-16 and PST-11. No plan changes a path of section 2.

## 6. Open points

1. **The seam of criterion 1 before PLT-22 is merged. Needs the Navigator.** The criterion's parenthesis names "Platform's examples check, pack layer", which is PLT-22. PLT-22 is not in this unit's `blocked_by` (unit line 7 names GNP-03, GNP-06 and PST-11), it has no plan, and its phase closes separately. Options: (a) T1 (b) runs R1 until PLT-22 merges, and PLT-22 then adds the permanent check; (b) add PLT-22 to this unit's `blocked_by`, which is an orchestrator edit to a unit file and needs PLT-22 planned and merged first. The plan takes (a). The Navigator must confirm it, because the choice fixes the seam the criterion names.
2. **Can the e2e run in this environment? Needs the Navigator only if it cannot run.** T2 (b) needs `npm run e2e` to pass on the base. Chromium builds are cached in `~/.cache/ms-playwright` (chromium-1194, chromium-1248 and chromium-1254), and `e2e/package.json` pins Playwright 1.65.0. Whether a cached build matches is ASSUMED and not run. Options: (a) step 3 runs the baseline; if `E0` is 0, T2 (b) is checked; (b) if the e2e cannot run, T2 (b) stays unchecked, and the Navigator decides as for the GNP-01 CI clause (`plans/DECISIONS.md` line 4903, option (a)).
3. **Claim statuses against the AGL-19 draft. No Navigator needed.** This unit sets two statuses from the sources (D3), as S3 asks; AGL-19 is blocked by this unit, so AGL-19's planner must match its verdicts to these statuses (section 5). Option (a) is the plan. Option (b), a later claim for AGL-19's statement, is a new entity and needs no change here.
4. **The outline in the bibliography (CEX-04's decision). Needs the Navigator if CEX-04's default changes.** CEX-04 states `all` as "every Source entity" (`units/CEX-04-assembled-markdown.md` line 30), so the outline with its citation (D6) is listed. Options: (a) keep CEX-04's default, and the sample lists the outline; (b) the sample's export settings, which CEX-08 writes, select `cited`; (c) CEX-04 excludes a source that no manuscript file cites, which is a change to its decision. The plan takes neither (b) nor (c). The CEX-04 planner decides.
5. **A `styleProfile` reference in `project.yaml`. Needs the Navigator.** The contract allows the key (`packages/contracts/src/project-store/project.ts` line 24; `units/PST-01-contract-slice.md` line 18). AGL-09 fills a tool's empty style field with the project's `styleProfile` (`units/AGL-09-narrative-tools.md` line 19), and CEX-07 reads it. `plans/PST-11.md` section 2 decided that the sample names none, so the plan keeps that. Options: (a) keep it (the plan; the workhorses' `styleProfile` input is optional, so they run without it); (b) add `styleProfile: book-style` to `examples/nonfiction/project.yaml`. Option (b) reverses a PST-11 decision and edits a file of a done unit that CEX-08 also edits.

## 7. Facts checked and facts assumed

### 7a. Checked

- **C1 Main, tree and worktrees.** `git rev-parse --short HEAD` printed `24b1b3c` at the start and `bafecf2` at the end. `git diff --name-only 24b1b3c HEAD` lists `plans/TRG-13.md` only. `git status --short` shows only ` M units/SAU-12-providers-step.md`, which this plan does not touch. `git branch --list 'unit/GNP-11'` is empty. `git worktree list` shows the PST-15, SAU-13, TRG-07 and TRG-12 worktrees and none for GNP-11. Node v26.13.0 and npm 11.20.0 are on this machine.
- **C2 Plan statuses.** `plans/GNP-03.md`, `plans/GNP-06.md`, `plans/GNP-01.md`, `plans/PST-11.md`, `plans/PST-08.md`, `plans/PLT-20.md` and `plans/TRG-11.md` have `status: done` (line 3 or 4). `plans/TRG-12.md` is `planned`. `plans/TRG-13.md` is `draft`. No plan exists for PLT-22, AGL-19, GNP-05, GNP-07, GNP-08, GNP-09, GNP-10, GNP-12, GRR-16 or CEX-08 (`ls plans`). `plans/QUEUE.md` line 9 lists GNP-11 as available.
- **C3 The unit file.** `units/GNP-11-nonfiction-sample-entities.md`: front matter lines 2 to 9; Decisions lines 15 to 19; criteria lines 22 and 23. No change note. `git log --oneline -- units/GNP-11-nonfiction-sample-entities.md` lists `098add9` and `2fed3f4` only. Its `parallel_with` (GNP-05, GNP-07, GNP-08, GNP-09, GNP-10) is symmetric: each of those units lists GNP-11 back on its line 8. The units that name GNP-11 in `blocked_by` are GNP-12 and AGL-19 (line 7 of each). GNP-03 (line 9), GNP-06 (line 9) and PST-11 (line 9) each list GNP-11 in `unblocks`.
- **C4 The module.** `modules/genre-packs.md`: line 19 (the dependency graph draws GNP-11 under GNP-06 with PST-11), line 31 (GNP-06 after GNP-03, the Navigator decision of `plans/DECISIONS.md` line 4948), line 32, line 63 (length default 800), line 69 (envelope and reference hints), lines 73 to 77 (the source, style-profile, person, claim and concept rows), line 76 (status values), line 82 (stable names), line 85 (test principles), line 88 (sample checks; unit tests never read `examples/`), line 93 (sample sourcing).
- **C5 README.** `units/README.md` line 64 (`blocked_by` is the source of truth; `unblocks` is its inverse; `parallel_with` is symmetric), line 138 (testing; unit tests never read `examples/`).
- **C6 Pack entity types on main.** `packages/packs/core/entity-types/source.yaml`: the fields at lines 9 to 21 and `required: [title, citation, reliability]` at line 22. `style-profile.yaml`: `folder: entities` at line 5, `bannedPhrases` at lines 16 to 20, `required` at line 21. `packages/packs/nonfiction/entity-types/person.yaml`: `folder: entities` at line 5, `sources` at lines 15 to 22 with the hints at lines 19 and 20, `required` at line 23. `claim.yaml`: the hints at lines 16 and 17, the enum at line 23. `concept.yaml`: `required` at line 16. Each nonfiction file has `schemaVersion: 1` at line 1.
- **C7 The four sources.** `examples/nonfiction/sources/outline.md`, `ten-thousand-hours-notes.md`, `deliberate-practice-notes.md` and `learning-plateaus-notes.md` each start with a `#` heading and have no front matter (read in full). The plateau notes carry the verification paragraph at line 15, added by commit `43ba0bb`. The facts used by D2 to D6 are at these lines: `ten-thousand-hours-notes.md` lines 5 (the 1993 article, its title and journal), 7 (violin students, Berlin, grouped by level, the best group, about 10,000 hours by age twenty), 9 (an average, individuals varied), 11 (Gladwell, surname only), 13 (few students, one school, hours estimated from memory); `deliberate-practice-notes.md` lines 5 (the same article), 7 (playing through), 9 to 13 (the three features), 15 (no numbers); `learning-plateaus-notes.md` lines 5 (Bryan and Harter, 1897 and 1899, telegraphy), 7 (speed rises, levels, rises), 9 (a change of method, gains return), 11 (a stage of reorganising), 13 (narrow subject), 15 (from memory, texts unread); `outline.md` lines 3 and 7 to 47, with chapter 4 to 6 marked `Draft: not started.` at lines 27, 33 and 39.
- **C8 The sample.** `examples/samples.yaml` (one entry, `nonfiction`, lines 1 to 3). `examples/nonfiction/project.yaml` lines 1 to 4: a comment, `schemaVersion: 1`, `title`, `genrePack: nonfiction`; no `styleProfile`.
- **C9 The gate.** `package.json` line 26 (`lint`), line 27 (`lint:examples`), line 30 (`e2e`). `scripts/examples-check/index.mjs` line 13 (PLT-22 appends its layer), line 16 (`LAYERS = [m1, graph]`), line 58 (issues sorted), line 65 (the pass line). Read-only run on main, with no build: `node scripts/examples-check/index.mjs` printed `examples check passed: 1 sample(s), 1 project.yaml, 4 entity file(s), 195 test file(s) scanned` and exited 0.
- **C10 The entity check.** `scripts/examples-check/m1.mjs` lines 21 and 22 (`ENTITY_FOLDERS`), lines 59 to 82 (`entityFiles`), lines 66 to 72 (a `sources/` file without `type` is read as `source`), lines 191 to 199 (`checkEntity` with `entityBaseSchema`). `scripts/examples-check/lib.mjs` lines 61 to 69 (`discoverSamples`) and line 73 (`readFrontMatter`).
- **C11 The contracts.** `packages/contracts/src/project-store/entities.ts` lines 11 to 15 (`entityBaseSchema`: `type` at least one character, optional `id` and `links`). `constants.ts` line 4 (`ENTITY_ID_PATTERN`). `project.ts` line 24 (`styleProfile`, optional).
- **C12 The loader.** `apps/api/src/modules/tool-registry/entity-types.ts` line 184 (`new Ajv({ allErrors: true, strict: true })`), lines 185 to 189 (the schema: the stripped fields, `type: 'object'`, `additionalProperties: true`). `apps/api/src/modules/tool-registry/inputs.ts` lines 172 to 180 (`stripExtensions`, which removes every `x-` key at every depth).
- **C13 Versions.** `apps/api/node_modules/ajv` is version 8.20.0 (also at the root). `node_modules/yaml` is version 2.9.1.
- **C14 R1 in memory.** With the schema of C12 and no file written, the pack files gave: `person` with two sources valid; `claim` with `status: supported` valid; `claim` with `status: unsourced` rejected at `/status` ("must be equal to one of the allowed values"); `source` without `citation` rejected ("must have required property 'citation'"); `style-profile` with `bannedPhrases` as a plain string rejected at `/bannedPhrases` ("must be array"); `style-profile` as planned valid; `concept` valid.
- **C15 Prettier and phrases.** `npx prettier --check examples` on main prints `All matched files use Prettier code style!`. Every planned front-matter block and entity body was passed through `npx prettier --stdin-filepath`, with nothing written to the repository, and came back unchanged. `.prettierrc.json` sets `singleQuote` and `trailingComma: all`. `.prettierignore` lines 1 to 5 do not ignore `examples/`. A grep of `examples` for `game-changer` and `unlock your potential` finds nothing.
- **C16 The e2e.** `e2e/specs/journey.e2e.ts` line 149 (`sources/outline.md` exists after the first project), line 240 (the intent), line 247 (`Read sources/outline.md.`), line 250 (`The outline has six chapters`), lines 264 and 265 (`toContain` of `Chapter 6: Practice for the Rest of Us`). `e2e/fixtures/mock-openai/scenarios/summarize-outline.json` line 17 (`sources/outline.md`). `e2e/harness/global-setup.ts` line 81 (`SCRIBA_EXAMPLES_DIR`). `e2e/playwright.config.ts` (`testMatch` `**/*.e2e.ts`; the Chromium path from `SCRIBA_E2E_CHROMIUM`). `.gitignore` line 8 (`e2e/test-results/`).
- **C17 Chromium cache.** `~/.cache/ms-playwright` holds `chromium-1194`, `chromium-1248` and `chromium-1254` (listed, not run).
- **C18 No test reads the sample.** A grep of `apps/api/test`, `packages/packs/test` and `scripts/*.test.mjs` for `examples`, `nonfiction`, `samples.yaml`, `outline.md` and `sources/` finds only temporary-library paths (for example `apps/api/test/create-test-app.ts` line 81, `join(library, 'examples')`) and the paths of the test's own library.
- **C19 Downstream lines.** GNP-12 lines 7, 19, 20, 24 and 27. AGL-19 lines 7, 15, 16, 17, 21 and 22. GNP-07 line 17. GNP-09 lines 17 and 23. GNP-10 line 17. GNP-21 lines 7, 17 and 19. GNP-22 lines 7, 19 and 22. GRR-16 lines 7 and 15. CEX-04 line 30. CEX-07 lines 7 and 19. CEX-08 line 15. CEX-20 lines 22 and 25. PLT-22 lines 7, 20, 21, 26 and 27. AGL-09 line 19. PST-01 lines 18 and 21. PST-08 lines 18, 19, 29 and 31. PST-13 line 19.
- **C20 Plans of the blockers.** `plans/GNP-03.md` D1 (line 14), D2 (line 16), D3 (line 18), D4 (line 20), section 5 (the GNP-11 bullet at line 152; the PLT-22 bullet at line 158). `plans/GNP-06.md` D1 to D4 (lines 16 to 22), section 5 (the GNP-11 bullet at line 179). `plans/PST-11.md` D2 (line 32), D4 (line 34), D5 (line 35), D6 (line 36), D11 (line 41), section 2 (the `project.yaml` row at line 51), section 1a (the Prettier bullet at line 24), section 6 (open points 1 to 6, lines 165 to 170).
- **C21 DECISIONS.** Searched by unit id. GNP-11 and GNP-12 have no entry. PST-11 has entries at lines 2405, 2874, 3058, 3093, 3097 and 3326. GNP-03 has entries at lines 4922 and 4928. GNP-06 has the Navigator decision at line 4948. GNP-01's CI decision is at line 4903.
- **C22 Rules.** `prompt.md` line 118 (the implementer's own worktree), line 121 (`npm ci` in a new worktree), line 124 (commits carry the unit id), lines 297 and 300 (commit messages).
- **C23 Sentence check.** Each sentence of the five entity bodies and each front-matter value of section 2 was compared with the source lines named in D2 to D5. Each restates a line of the sources, or is an instruction about the sample's own status (the plateau claim's "stays weak until the papers are read"). The planner checked this by reading; no tool did.
- **C24 Commits.** `6756f0d` (PST-11 skeleton), `43ba0bb` (PST-11, plateau notes unverified), `f303689` (GNP-03), `5213c1e` (GNP-06), `80bdbea` (GNP-01).

### 7b. Assumed, not checked

- **ASSUMED:** the 1993 study and the Bryan and Harter papers are as the sources state them. The planner has no network access in this run, so it did not check them against the articles. The plateau notes say they are from memory (C7). The sample copies what the sources say and no more; PST-11 open point 5 holds for this unit as well.
- **ASSUMED:** `npm ci` in the new worktree succeeds (step 2 checks it).
- **ASSUMED:** Playwright 1.65.0 can run with one of the cached Chromium builds (C17). Step 3 checks it (open point 2).
- **ASSUMED:** `readFrontMatter` can be imported from a script outside the repository by a `file://` URL. Step 7 checks it.
- **ASSUMED:** Prettier leaves each file as C15 shows, when the file is written and not piped. Step 6 checks it.

### 7c. Inconsistencies found (for the orchestrator; none is changed by this plan)

- `units/GNP-11-nonfiction-sample-entities.md` line 22 says "Platform's examples check, pack layer", but PLT-22 is not in its `blocked_by` (line 7) and has no plan.
- `units/GNP-11-nonfiction-sample-entities.md` line 18 says "if skeleton sources lack Source front matter", but all four lack it, and GNP-03 makes `citation` and `reliability` required (`packages/packs/core/entity-types/source.yaml` line 22).
- `modules/genre-packs.md` line 88 says PLT-20 to PLT-22 validate sample files against the entity-type schemas; PLT-20 (done) does not, and that is PLT-22's job, which is not merged.
- `modules/genre-packs.md` line 19 draws GNP-11 under GNP-06 with PST-11, not under GNP-03 (its `blocked_by` at line 7); the Navigator decision of `plans/DECISIONS.md` line 4948 left the graph as it is.
- `plans/PST-11.md` lines 22, 41 and 165 cite `units/README.md` line 133 for "unit tests never read examples/"; the rule is at line 138.
- `units/CEX-04-assembled-markdown.md` line 30 (`all` is every Source entity) and `plans/PST-11.md` open point 4 (line 168): the outline, given a citation by D6, appears in the sample's bibliography.
- `units/AGL-09-narrative-tools.md` line 19 and `units/CEX-07-entity-links-banned-phrases.md` line 19 read the project's style profile, but `examples/nonfiction/project.yaml` names none (`plans/PST-11.md` section 2 decided so).
