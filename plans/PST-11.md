---
id: PST-11
status: done
---

# PST-11 plan — examples/ nonfiction skeleton and samples.yaml

Unit: PST-11 (module Project store, phase:files, M1; `units/PST-11-nonfiction-sample-skeleton.md` lines 2 to 9). Revision 3 (draft, for Opus). Revision 1 was not approved (`plans/DECISIONS.md`, 2026-11-14, "PST-11 — Opus review of the plan (revision 1)"); revision 2 fixed its items 1 and 3 to 6. Revision 3 resolves its item 2, the M5 chapter count, by the Navigator's decision (option B) in `plans/DECISIONS.md` line 3058, entry "2026-11-14 — PST-11, CEX-08, CEX-20 — the Navigator's decision on the M5 chapter count (option B)": this plan keeps three skeleton drafts, and the milestone gate now counts four chapters. Base: `main` at `c061b08` (`docs(TRG-01): draft plan`). HEAD when this revision was written is `a04bb65`, which differs from the base only in files under `plans/`, `units/` and `modules/` (`git diff --stat c061b08 HEAD` lists 14 files: the plans, `plans/DECISIONS.md`, `units/CEX-08-nonfiction-sample-order.md`, `units/CEX-20-milestone-gate.md` and `modules/compile-export.md`). `git status --short -- ':!plans'` prints nothing. The nine other plans of this batch now exist in `plans/` (F13). The only blocker, PST-01, is done (`plans/PST-01.md` line 3). PLT-20, the examples check the first criterion names, has landed (`scripts/examples-check/` on main; `plans/PLT-20.md` line 3, `status: done`). This unit is content only: ten new files under `examples/` and one deletion. It changes no code, no test, no config and no other plan. This plan changes only `plans/PST-11.md`. It writes no sample file, runs no command that changes the tree and commits nothing.

Tags: FACT means checked by the planner (section 7a). ASSUMED means a choice or an unchecked belief (section 7b).

## 1. Decisions this plan follows

### 1a. Settled by the unit, the module, other units and DECISIONS

- **Ownership and shape.** The Project store owns `examples/`, `examples/samples.yaml` and the nonfiction skeleton. `samples.yaml` lists `{id, title, description}`; one entry, `nonfiction`, at M1; it sits outside every sample folder. Source: `units/PST-11-nonfiction-sample-skeleton.md` lines 14 and 17; `units/PST-05-start-from-sample.md` lines 19 and 21 (the file is never copied).
- **The skeleton.** `examples/nonfiction/` holds: `project.yaml` (`schemaVersion: 1`, a title, `genrePack: nonfiction`, no `order`); `sources/` with 3 to 5 short documents, one of them `sources/outline.md`; `drafts/` with 2 to 3 top-level files of a few hundred words; `.gitignore` containing `.scriba/`; and no `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/`. Source: unit lines 18 to 23; `modules/project-store.md` lines 75 and 80.
- **The outline is an ordinary source.** There is no `structure/` folder; chapters are whole Markdown files at the top level of `drafts/`. Source: `modules/project-store.md` line 62; unit line 20.
- **Topic and text.** Practice and expertise, so intents such as "draft the cold open for chapter 3 from my notes on the 10,000 hour idea" make sense. The text is public domain or written for the sample. Source: unit line 24; `modules/project-store.md` line 75; `modules/genre-packs.md` line 93 (original text, no copyrighted excerpts, no invented quotes from real living people).
- **The sample is the e2e fixture.** Its file paths are a contract with `e2e/fixtures/mock-openai/`; a rename updates the mock scenario in the same PR. Source: unit line 25; `units/PLT-12-mock-openai-server.md` line 26.
- **What others add later, and this unit does not.** `entities/` (Genre packs, M2), a grounding-claims draft (Agent loop, M3), a recipe (Graph runner, M4), `order` (Compile & export, M5), the fiction entry in `samples.yaml` (Genre packs, M6). Source: unit line 26; `modules/project-store.md` line 70.
- **Unit tests never read `examples/`.** Tests build temp projects. The sample is checked by the lint gate (PLT-20), which is not a unit test, and read by the e2e harness, whose files are not named `*.test.*` or `*.spec.*`. Source: `units/README.md` line 133; `modules/project-store.md` line 58; `plans/PLT-20.md` D13 and D14; `scripts/examples-check/m1.mjs` lines 25 to 33.
- **Gate behaviour on this unit's merge.** The check must pass on the skeleton and then print `1 sample(s)`, not `0`. Source: `plans/DECISIONS.md` line 2405 (the only DECISIONS entry that names PST-11); `plans/PLT-20.md` D18 (line 48) and line 83.
- **Prettier.** `npm run lint` ends with `prettier --check .`, and `examples/` is not ignored, so every Markdown and YAML file in the sample must be Prettier-clean. Source: `package.json` line 26; `.prettierignore` lines 1 to 4; `plans/PLT-20.md` lines 138 and 208 (the note addressed to this unit).
- **Entity rules the sample files must meet.** A file under `sources/` may have no front matter (type `source`); its id is the front-matter `id` or the file stem; an id that fails `^[a-z0-9][a-z0-9-]*$` makes the file an invalid entity. Source: `units/PST-08-entity-resolution.md` lines 18 to 21; `packages/contracts/src/project-store/constants.ts` line 4.
- **Source front matter belongs to Genre packs.** "If skeleton sources lack Source front matter, add it in this PR" (GNP-11). Source: `units/GNP-11-nonfiction-sample-entities.md` line 18. This plan therefore ships none (D4).
- **Compile & export already depends on the skeleton's shape.** The M5 sample has four chapters: the three skeleton drafts plus AGL-19's grounding draft; the sample has 2 to 4 drafts; an order that differs from alphabetical; no front or back matter file; no `snapshots/`. Source: `units/CEX-08-nonfiction-sample-order.md` lines 15 to 17; `units/CEX-20-milestone-gate.md` lines 22 and 25; `plans/DECISIONS.md` line 3058 (the Navigator's decision, option B).

### 1b. Decisions this plan makes

- **D1 The book.** Working title `The Long Apprenticeship`: why expertise takes years, what the practice in those years looks like, and what an adult can borrow from it. Six chapters (D3). The picker card is `{id: nonfiction, title: Nonfiction, description: ...}`. The card title `Nonfiction` matches the wording of the demos (`units/PST-12-files-gate.md` line 34; `units/AGL-08-file-tools-chat-gate.md` line 26) and of PLT-20's own fixture (`scripts/examples-check.test.mjs` line 25).
- **D2 Files (the path contract).** Ten files, listed in section 2. The paths in that table are frozen from this PR on. Nothing under `e2e/` names a sample path today (F8), so this PR changes no mock scenario. AGL-08 and AGL-19 add the first ones.
- **D3 Chapters and drafts.** The outline lists six chapters. Three are drafted. Their file names are topic words, not numbers, so that the alphabetical order differs from the book order (the reading `units/CEX-08-nonfiction-sample-order.md` line 15 needs; `units/GNP-18-fiction-sample.md` line 18 does the same). Alphabetical: `born-to-it`, `the-ten-thousand-hour-idea`, `what-counts-as-practice` = chapters 1, 3, 2. The skeleton ships three drafts, the top of this unit's range of 2 to 3, so CEX-08 need not add a third (its line 17). With AGL-19's grounding draft the sample has four drafts, the M5 count (the Navigator's decision, option B, `plans/DECISIONS.md` line 3058; `units/CEX-08-nonfiction-sample-order.md` line 17; `units/CEX-20-milestone-gate.md` lines 22 and 25). Chapter 3 has no cold open yet, which gives the unit's example intent something to do.
- **D4 No front matter, no citations.** No sample file starts with `---`; no draft holds a `[@id]` citation. Reason: Source front matter is GNP-11's (its line 18), `[@id]` citations are resolved by PLT-22's pack layer (`units/PLT-22-examples-check-pack-layer.md` line 21) and by Compile & export's checks, and the grounding draft with its citations is AGL-19's. This leaves the gate with nothing to fail on in this unit. See open point 3.
- **D5 Placeholders and links.** No whole-word `TK`, `TKTK`, `TODO`, `FIXME` or `XXX`, no `{{`, and no URL. Reason: Compile & export's placeholder check flags the first five (`units/CEX-05-preflight-endpoint-placeholders.md` line 19), so a clean sample can later show a clean preflight; a URL cannot be checked offline.
- **D6 Facts rule.** Each source is the author's reading notes, original text, paraphrase only, with no quotation marks around any real person's words. A source may state only the research facts listed in section 2a. A draft may state a research fact only when a source in the sample states it. No figure appears except those listed. Reason: GNP-11 requires entities to add no fact the sources lack (its line 16), and AGL-19 needs one invented statistic that appears in no source (its line 15).
- **D7 Search wording.** The notes on the idea contain the literal `10,000 hours` as well as the words "ten thousand hours", so a keyword search for the author's own phrase finds them (PST-13 keyword search over `sources/`).
- **D8 Delete `examples/.gitkeep`.** It keeps an empty folder in git; the folder now holds files. Precedent: `plans/PLT-02.md` line 44; `plans/PLT-03.md` line 45; `plans/PLT-17.md` S17. PLT-20 ignores dot-files at the top of `examples/` (`plans/PLT-20.md` D6).
- **D9 A machine-checkable outline.** The outline has one `### Chapter N: Title` heading per chapter, and the first line under each heading is a `Draft:` line. It is either `Draft: \`drafts/<file>.md\`.` or `Draft: not started.` A named file's first line is `# Chapter N: Title`, identical to the outline heading apart from the hashes. A chapter marked `not started` has no draft in `drafts/` whose title line is its heading. Each file in `drafts/` is named by exactly one chapter. Notes files are mentioned in the sentence after the `Draft:` line, never on it. This makes criterion 2 ("consistent with the drafts") checkable by command in both directions (section 4, function `c2`).
- **D10 Plain text.** UTF-8, LF line endings, no BOM, one trailing newline, no raw HTML, no images, no footnotes. Reason: path hash rules are UTF-8 (`modules/project-store.md` line 49), and Pandoc and Typst later render these files (`units/CEX-13-pdf-typst-spike.md` line 16).
- **D11 No test file is committed (decided here).** `units/README.md` line 133 and `modules/project-store.md` line 58 forbid unit tests that read `examples/`, and no criterion of the unit names a test file (lines 29 to 31). So each criterion is tested by recorded commands run on the real tree (section 4), and criteria 1 and 3 also keep the permanent gate (the examples check inside `npm run lint`). A committed assertion about the sample's content would also go stale: "no `order` key" turns false when CEX-08 lands at M5. This is the plan's decision; open point 1 records it.
- **D12 One commit, in the worktree.** `feat(PST-11): add the nonfiction sample skeleton and examples/samples.yaml` on branch `unit/PST-11`, in the implementer's own worktree (section 3). Not pushed.

## 2. Files to create or change

Only the paths below change. Everything else, including `plans/DECISIONS.md`, `e2e/`, `scripts/` and `packages/`, stays as it is.

| Path | Change | Holds |
|---|---|---|
| `examples/samples.yaml` | new | a top-level YAML list with one entry: `id: nonfiction`, `title: Nonfiction`, `description: A short book about practice and expertise, with an outline, source notes and draft chapters.` (one line; no colon inside the value, so it stays a plain scalar) |
| `examples/nonfiction/project.yaml` | new | a one-line comment, then `schemaVersion: 1`, `title: The Long Apprenticeship`, `genrePack: nonfiction`. No `order`, no `export`, no `model`, no `styleProfile`. The title stays a single-line plain scalar, because PST-05 rewrites only that key |
| `examples/nonfiction/.gitignore` | new | exactly `.scriba/` and a newline |
| `examples/nonfiction/sources/outline.md` | new | the outline (2a), 250 to 450 words |
| `examples/nonfiction/sources/ten-thousand-hours-notes.md` | new | notes for chapter 3 (2a), 150 to 350 words |
| `examples/nonfiction/sources/deliberate-practice-notes.md` | new | notes for chapter 2 (2a), 150 to 350 words |
| `examples/nonfiction/sources/learning-plateaus-notes.md` | new | notes for chapter 4 (2a), 150 to 350 words |
| `examples/nonfiction/drafts/born-to-it.md` | new | chapter 1 (2a), 250 to 450 words |
| `examples/nonfiction/drafts/what-counts-as-practice.md` | new | chapter 2 (2a), 250 to 450 words |
| `examples/nonfiction/drafts/the-ten-thousand-hour-idea.md` | new | chapter 3 (2a), 250 to 450 words |
| `examples/.gitkeep` | delete | D8 |

Four sources (the outline and three notes) is inside the unit's 3 to 5. Every source stem is a valid entity id.

### 2a. What the prose holds

- **`sources/outline.md`.** H1 `The Long Apprenticeship: outline notes`; a two or three sentence premise; `## Chapters` with six `### Chapter N: Title` headings, each with the `Draft:` line first (D9) and then one or two sentences of purpose; a short `## Threads to carry through` bullet list. The six chapters: 1 `Born to It?` (`Draft: \`drafts/born-to-it.md\`.`; why we call someone a natural; makes no research claim); 2 `What Counts as Practice` (`Draft: \`drafts/what-counts-as-practice.md\`.`; the sentence after it points to `sources/deliberate-practice-notes.md`); 3 `The Ten-Thousand-Hour Idea` (`Draft: \`drafts/the-ten-thousand-hour-idea.md\`.`; points to `sources/ten-thousand-hours-notes.md`; says it still needs a cold open); 4 `The Plateau Is Not the End` (`Draft: not started.`; points to `sources/learning-plateaus-notes.md`); 5 `The Coach in the Room` (`Draft: not started.`); 6 `Practice for the Rest of Us` (`Draft: not started.`).
- **Drafts.** Each starts with `# Chapter N: Title`. Chapter 1 is the author's own framing and states no research fact. Chapter 2 states only what `deliberate-practice-notes.md` states. Chapter 3 begins with the argument and has no cold open; it states only what `ten-thousand-hours-notes.md` states. Plain paragraphs, no list longer than five items.
- **Allowed research facts (D6).**
  - `ten-thousand-hours-notes.md`: a 1993 article by Ericsson, Krampe and Tesch-Römer, "The Role of Deliberate Practice in the Acquisition of Expert Performance", in Psychological Review; it compared violin students at a Berlin music academy by level; the best group had practised the most; its average was about 10,000 hours by age twenty; that is an average, not a threshold, and individuals varied; a 2008 popular book (Gladwell's Outliers) made it a rule of thumb; limits: few students, one school, practice hours estimated from memory.
  - `deliberate-practice-notes.md`: the same article's account of deliberate practice (a well-defined task of the right difficulty, informative feedback, chances to repeat and correct errors) set against playing through what you can already do. No numbers.
  - `learning-plateaus-notes.md`: Bryan and Harter's studies of telegraph learners (1897 and 1899): receiving speed rose, flattened, then rose again; their reading was that learners were turning letter habits into word habits before gains resumed. No numbers.

## 3. Method

Every step runs from the root of the implementer's own worktree on branch `unit/PST-11`, made from `main` by the driver (`prompt.md` lines 78 and 79; the convention of `plans/PLT-20.md` line 75). If the branch already exists, the worktree continues from its commits. That worktree is not the main checkout: do not switch branches in the main checkout, and do not run `git switch -c`. Record `node -v` and `npm -v` beside each result. Do not push. Do not add a remote. Stage only the paths of section 2; do not run `git add -A`.

0. Base. `git branch --show-current` prints `unit/PST-11`. `git rev-parse --short HEAD` prints `c061b08`, or a later `main` commit that changes only `plans/`, `units/` or `modules/` (`a04bb65` is one). `git status --short -- ':!plans'` prints nothing. `git ls-files examples` prints only `examples/.gitkeep`. `node -v` prints `v26.x`. `ls scripts/examples-check` lists `index.mjs lib.mjs m1.mjs`. If any differs, stop and report (if `examples/` already holds a sample, another unit has merged first: re-read sections 5 and 7a before going on).
1. Dependencies. `npm ci` from the worktree root (a new worktree has no `node_modules/`). Expected: exit 0. Stop and report if it fails; that is a setup failure.
2. Red baseline. (a) `npm run lint:examples` exits 0 and prints `examples check passed: 0 sample(s), 0 project.yaml, 0 entity file(s), <N> test file(s) scanned`. It passes with nothing to check, so it proves nothing yet. (b) `test -f examples/nonfiction/sources/outline.md; echo $?` prints `1`, and `c2` of section 4a cannot run because `examples/nonfiction` does not exist. Record both.
3. Write the ten files of section 2 with the content rules of 2a and D4 to D10. Delete `examples/.gitkeep` (`git rm examples/.gitkeep`).
4. Format. `npx prettier --write examples`, then `npx prettier --check examples`. Expected: the second prints `All matched files use Prettier code style!`. Keep what Prettier wrote, and re-read the outline's `Draft:` lines after it (D9).
5. Criteria checks. Run C1, C2 (with its negative control) and C3 of section 4. Expected output is in the table.
6. Extra checks X1 to X8 of section 4.
7. Regression. `npm run lint` and `npm test`, each exit 0. Neither reads `examples/` except the examples check inside lint. If the Chromium of the e2e is installed, `npm run e2e` is optional; it does not read the sample files yet (F8).
8. Scope. `git status --short -uall -- ':!plans'` lists exactly the ten new paths of section 2 (`??`) and ` D examples/.gitkeep`, nothing else.
9. Commit (D12) on `unit/PST-11`, with the unit id in the message. Record each command and its output in the implementer's report. This plan marks no criterion as passed.

## 4. Acceptance criteria and tests

The unit has three criteria (lines 29 to 31). None is weakened or dropped. The seam for all three is the files on disk, read by a command; nothing imports `examples/` into a test. In the tables below, `\|` stands for a plain `|` (it is escaped only so the table renders). No test file is committed (D11, open point 1). The gate's own behaviour is already proved on temp trees by the existing `scripts/examples-check.test.mjs` (C1, C2, C5, C6), which this unit does not change.

| Criterion | Test (file and seam) | Pass condition |
|---|---|---|
| **C1** (line 29): `project.yaml` validates against the PST-01 schema; Platform's examples check passes. | (a) `npm run lint:examples`, that is `scripts/examples-check/index.mjs` run on the repository (the lint gate; unit tests of the gate: `scripts/examples-check.test.mjs`). (b) From the repo root: `node -e 'const {createRequire}=require("node:module");const fs=require("node:fs");const {parse}=require("yaml");const c=createRequire(process.cwd()+"/apps/api/package.json")("@bbartolome/scriba-contracts/project-store");const p=parse(fs.readFileSync("examples/nonfiction/project.yaml","utf8"));const r=c.projectYamlSchema.safeParse(p);const s=c.sampleListSchema.safeParse(parse(fs.readFileSync("examples/samples.yaml","utf8")));console.log(JSON.stringify({ok:r.success,schemaVersion:p.schemaVersion,genrePack:p.genrePack,hasOrder:"order" in p,title:p.title,samples:s.success?s.data:s.error.issues}))'` | (a) exit 0 and `examples check passed: 1 sample(s), 1 project.yaml, 4 entity file(s), <N> test file(s) scanned`. This covers the schema parse (D9 of PLT-20), the `samples.yaml` shape and the one-to-one match (D7), the entity base on the four sources (D10), the excluded paths (D11), no symbolic link (D12) and no test naming `examples/` (D13). (b) prints `ok:true`, `schemaVersion:1`, `genrePack:"nonfiction"`, `hasOrder:false`, the title, and `samples` as a one-element array `{id:"nonfiction", title:"Nonfiction", description:...}` (the unit's extra decisions, which the check does not test). |
| **C2** (line 30): `sources/outline.md` exists and outlines the book's chapters, consistent with the drafts. | The `c2` shell function of 4a, run in `examples/nonfiction` (seam: the three folders on disk). Red state: step 2b. Negative control: 4a, last command. | `c2` prints `1,2,3,4,5,6`; then six lines that begin `ok Chapter` (chapters 1 to 3 each name a file whose first line is `# ` plus the outline heading; chapters 4 to 6 say `not started` and no draft carries their heading) and no line that begins `BAD`; then `ok: each draft is named exactly once`. So every outline chapter matches its draft, or has none, in both directions, and the outline names six chapters. In the negative control (the first line of one draft changed on a temp copy) `c2` prints one `BAD` line for chapter 1 and five `ok Chapter` lines. |
| **C3** (line 31): no excluded folders are present. | (a) The gate of C1 (a): `scripts/examples-check/m1.mjs` lines 19 and 170 to 188 fail on `.scriba`, `logs`, `snapshots` or `drafts/.versions` at the sample root. (b) `find examples \( -name .scriba -o -name logs -o -name snapshots -o -name .versions \) -print` (stricter than the gate: any depth). (c) Negative control, so the gate is armed on this tree: `T=$(mktemp -d) && cp -R examples "$T/examples" && mkdir "$T/examples/nonfiction/logs" && node scripts/examples-check/index.mjs --root "$T"; echo "exit $?"; rm -rf "$T"`. | (a) as C1 (a). (b) prints nothing. (c) stderr has `examples/nonfiction/logs: a sample must not ship this excluded path` and `examples check failed: 1 issue(s)`, then `exit 1`. |

Extra checks (the unit's decisions and the downstream needs; not criteria):

| # | Check | Expected |
|---|---|---|
| X1 | `find examples -type f \| sort` | exactly the ten paths of section 2 (no `.gitkeep`) |
| X2 | `wc -w examples/nonfiction/drafts/*.md examples/nonfiction/sources/*.md` | each draft and the outline 250 to 450; each note 150 to 350; three drafts, four sources |
| X3 | `head -qn 1 examples/nonfiction/sources/*.md examples/nonfiction/drafts/*.md \| grep -c '^---$'` | `0` (D4) |
| X4 | `grep -rnE '(^\|[^A-Za-z0-9])(TK\|TKTK\|TODO\|FIXME\|XXX)([^A-Za-z0-9]\|$)\|\{\{\|\[@\|https?:' examples` | no output (D4, D5) |
| X5 | `cat examples/nonfiction/.gitignore` and `grep -rl $'\r' examples` | `.scriba/`; no file listed (D10) |
| X6 | `for f in examples/nonfiction/sources/*.md; do basename "$f" .md; done \| grep -Evc '^[a-z0-9][a-z0-9-]*$'` | `0`, so every source stem is a valid entity id |
| X7 | `ls examples/nonfiction/drafts` | `born-to-it.md`, `the-ten-thousand-hour-idea.md`, `what-counts-as-practice.md`: alphabetical order is chapters 1, 3, 2 (D3) |
| X8 | `grep -c '10,000' examples/nonfiction/sources/ten-thousand-hours-notes.md examples/nonfiction/drafts/the-ten-thousand-hour-idea.md` | at least `1` in each (D7) |

### 4a. The `c2` function (criterion 2)

Paste it into a bash or zsh shell, then run `( cd examples/nonfiction && c2 )`. It reads files only.

```sh
c2() {
  test -f sources/outline.md || { echo "FAIL: sources/outline.md is missing"; return 1; }
  grep -o '^### Chapter [0-9]*' sources/outline.md | awk '{print $3}' | paste -sd, -
  awk '/^### Chapter [0-9]+: /{h=substr($0,5)} /^Draft: /{print h "|" substr($0,8)}' sources/outline.md |
  while IFS='|' read -r h d; do
    case "$d" in
      'not started'*)
        if grep -lxF "# $h" drafts/*.md >/dev/null; then
          echo "BAD $h: marked not started, but a draft carries it"
        else
          echo "ok $h: not started"
        fi ;;
      *)
        f=$(printf '%s\n' "$d" | sed 's/^.\(drafts\/[a-z0-9-]*\.md\).*/\1/')
        if [ -f "$f" ] && [ "$(head -n 1 "$f")" = "# $h" ]; then
          echo "ok $h: $f"
        else
          echo "BAD $h: $d"
        fi ;;
    esac
  done
  named=$(grep -o '^Draft: .drafts/[a-z0-9-]*\.md' sources/outline.md | sed 's/^Draft: .//' | sort)
  if [ "$named" = "$(ls drafts/*.md | sort)" ]; then
    echo "ok: each draft is named exactly once"
  else
    echo "BAD: the drafts the outline names differ from the files in drafts/"
  fi
}
```

Negative control (the check must fail when the criterion is false):

```sh
T=$(mktemp -d) && cp -R examples/nonfiction "$T/n" && sed -i.bak '1s/.*/# Chapter 2: Something Else/' "$T/n/drafts/born-to-it.md" && ( cd "$T/n" && c2 ); rm -rf "$T"
```

## 5. Agreement with downstream units

- **PST-09 (picker UI and the e2e "project from sample" step; blocked by PST-11).** Needs the sample list entry and the real sample folder: its e2e step starts from the nonfiction sample through the picker against `SCRIBA_EXAMPLES_DIR=<repo>/examples` (`e2e/harness/global-setup.ts` line 81). Provided: `id: nonfiction`, card title `Nonfiction`, a one-line description. Agrees. If the step selects the card by its title, that title is part of the contract (PST-09 line 26 does not say how the step selects the card).
- **PST-12 (files gate; blocked by PST-11).** Its criteria and demo start from the nonfiction sample under a chosen name (`units/PST-12-files-gate.md` lines 24 and 34 to 37): no `structure/`, `.gitignore` lists `.scriba/`, `sources/outline.md` browsable. Provided. Hand-off to PST-05 (not a change here): the copy must include dot-files, because the sample's `.gitignore` is one (PST-05's own criteria test a test sample and do not say so).
- **GNP-11 (sample entities; blocked by PST-11).** Needs the topic, the `sources/` files its entities cite, and no `entities/` folder yet. Provided; sources carry no Source front matter, which GNP-11 adds (its line 18). The paths are frozen (its line 19 and D2). Agrees. See open point 3 for the PLT-22 ordering.
- **AGL-08 (file-tools-chat gate; blocked by PST-11).** Needs `sources/outline.md` for the "summarize my outline" turn and a start-from-sample project (its lines 17 and 18). Provided. The file list the agent sees hides dot-entries (`units/PST-06-file-api-core.md` line 19), so `.gitignore` does not appear in `list_files`. The outline has six chapters, so a correct summary is checkable. Agrees.
- **AGL-19 (grounding-claims draft; blocked by PST-11 and GNP-11).** Adds a draft to `drafts/` whose claims the sources support, weakly support and do not support (its line 15). Provided: the 10,000-hour notes state their own limits, which can back a weak verdict, and no source holds any figure beyond those in section 2a (D6), so a made-up statistic stays unsupported. The skeleton's three drafts plus AGL-19's make four top-level drafts, which is the four-chapter sample that CEX-08 line 17 and CEX-20 lines 22 and 25 now name (open point 2, resolved). Agrees.
- **CEX-08 (sample order; blocked by PST-11).** Its line 17 says the sample has 2 to 4 drafts and its done-when needs four chapters: the three skeleton drafts plus AGL-19's grounding draft. It needs the three skeleton drafts, an authored order that differs from alphabetical, a `project.yaml` with a comment to preserve, no front or back matter file and no `snapshots/`. Provided (D3, 2). Agrees. Open point 4 notes the bibliography.
- **Later users that are not blockers.** PST-22 (a chapter 1 draft to tighten, `units/PST-22-review-gate.md` line 30): `drafts/born-to-it.md`. CEX-09 (an authored, non-alphabetical order with statuses, its line 24) and CEX-20 (a four-chapter sample, done-when line 22 and demo step 1 line 25: three skeleton drafts plus AGL-19's): provided for the three skeleton drafts, with the fourth coming from AGL-19; Agrees. GRR-16 (a recipe fed from `drafts/`): drafts exist. GNP-18 (appends the fiction entry): the file is a top-level list ending in a newline. PLT-21 and PLT-22 (layers on the same check): see open point 3. CEX-01 (the sample must still pass with `order` optional): the schema takes `order` as optional (`packages/contracts/src/project-store/project.ts` line 27). MPR-12 (a `project.yaml` with no `model` override): provided. CEX-13 and CEX-15 (render and export the sample): plain Markdown (D10). PST-05 (rewrites only `title`, comment kept): the title is a one-line plain scalar below a comment. PST-08 (entity resolution): `entities/` is absent, so PST-08 must treat a missing `entities/` as empty (`units/PST-03-discovery-new-import.md` line 22 says layout folders are created lazily); the three source stems are valid ids. PST-13 (search over `sources/`): D7.
- **Front matter of PST-11.** `unblocks` names PST-09, PST-12, GNP-11, AGL-08, AGL-19 and CEX-08; each of those six has PST-11 in its `blocked_by` (grep of `units/*.md`), so `unblocks` is the exact inverse (`units/README.md` line 64). `parallel_with` is PST-02 to PST-08, and each of those lists PST-11 back. Nothing to edit.

## 6. Open points

1. **No test file is committed. Decided (D11).** Criteria 1 and 3 keep the permanent gate (the examples check inside `npm run lint`). Criterion 2 has only the recorded run of `c2` (section 4a). A committed test would read `examples/`, which `units/README.md` line 133 and `modules/project-store.md` line 58 forbid, and a committed content assertion about `order` would be false from M5. A later rule in the examples check (for example, "every sample has a `sources/outline.md`") would change PLT-20's files and would also bind the fiction sample (GNP-18 does not say it has an outline); this unit does not make that change.
2. **The M5 chapter count. Resolved (the Navigator, option B).** Three skeleton drafts plus AGL-19's grounding draft make four, and the milestone gate now says four chapters: `units/CEX-08-nonfiction-sample-order.md` line 17 (2 to 4 drafts, done-when four chapters) and `units/CEX-20-milestone-gate.md` lines 22 and 25 ("four-chapter sample", "four chapters"); `modules/compile-export.md` line 62 follows. Recorded in `plans/DECISIONS.md` line 3058. This plan keeps three skeleton drafts. Nothing in this unit changes.
3. **PLT-22 versus GNP-11 on sources without front matter.** PLT-22's last criterion says the pack layer passes on the skeleton alone (`units/PLT-22-examples-check-pack-layer.md` line 29), and its second says entity front matter validates against the pack type (line 26). If the Source type requires `title`, `citation` and `reliability` (`modules/genre-packs.md` line 73), a source with no front matter would fail the pack layer, and GNP-11 is the unit that adds the front matter (its line 18). Recommended: PLT-22's plan treats a `sources/` file with no front matter as a valid source, as PST-08 and PLT-20 do; otherwise GNP-11 must merge first. For the orchestrator.
4. **The outline is a Source entity.** By PST-08's rule `sources/outline.md` is type `source` with no `citation`. Compile & export's bibliography lists "every Source entity" by `citation` (`units/CEX-04-assembled-markdown.md` line 30). CEX-04 or CEX-08 must skip an entity with no citation (or GNP-11 must give the outline front matter). Not this unit's decision, because the outline's path and role are fixed by the unit and the module.
5. **Facts cannot be verified offline.** The research statements of 2a come from the planner's memory; there is no network in this run. The implementer confirms each against a reliable source, or removes or hedges it. If neither is possible, the Navigator may want a human fact-check before merge.
6. **`examples/.gitkeep` is deleted (D8).** A small choice. If the Navigator prefers to keep it, step 3 and X1 change by one path.

## 7. Facts checked and assumed

### 7a. Checked by the planner (reading, grep and `ls`; nothing was built or run)

- **F1.** `git log --oneline` lists `c061b08 docs(TRG-01): draft plan`; `git rev-parse --short HEAD` printed `a04bb65` when this revision was written, and `git diff --stat c061b08 HEAD` lists 14 files, all under `plans/`, `units/` (CEX-08, CEX-20) or `modules/` (`compile-export.md`). `git status --short -- ':!plans'` printed nothing. `plans/PST-01.md` line 3 and `plans/PLT-20.md` line 3 say `status: done`. `scripts/examples-check/` holds `index.mjs`, `lib.mjs`, `m1.mjs`; `scripts/examples-check.test.mjs` exists. `prompt.md` lines 77 to 79 (code mode: a worktree on `unit/<ID>`, `npm ci` in it).
- **F2.** `examples/` holds one file, `.gitkeep`, size 0; `git ls-files examples` prints `examples/.gitkeep`. No `examples/nonfiction` and no `examples/samples.yaml` exist.
- **F3.** Unit file `units/PST-11-nonfiction-sample-skeleton.md`: lines 14 (ownership), 17 (`samples.yaml`), 18 to 23 (the skeleton), 24 (topic), 25 (e2e contract), 26 (later additions), 29 to 31 (the three criteria). `unblocks` on line 9, `parallel_with` on line 8, `blocked_by: [PST-01]` on line 7.
- **F4.** Schemas: `projectYamlSchema` is a loose object with `schemaVersion` (integer 1 or more), `title` (non-empty), `genrePack` (non-empty) and optional `order` (`packages/contracts/src/project-store/project.ts` lines 20 to 28); `sampleSchema` is `{id: non-empty, title: string, description: string}` and `sampleListSchema` is an array of it (lines 82 to 88); `entityBaseSchema` needs a non-empty `type` and an optional id matching the entity pattern (`entities.ts` lines 11 to 15; `constants.ts` line 4).
- **F5.** The gate. `package.json` line 26 (`lint` runs `lint:examples` then `prettier --check .`) and line 27 (`lint:examples` builds contracts, then runs `node scripts/examples-check/index.mjs`). `m1.mjs`: excluded paths line 19; entity folders line 22 (a `sources/` file with no `type` gets `source`, lines 59 to 80); test-file rules lines 25 to 33; samples cross-check lines 86 to 137; project.yaml walk lines 139 to 168; sample root and excluded paths lines 170 to 189; only `sources/` and `entities/` are entity files, so `drafts/` is never parsed. `index.mjs` line 61 is the pass line with `samples.length`, `projectYaml`, `entityFiles` and `testFiles` counts. `lib.mjs` lines 62 to 70: a sample is an immediate non-dot subfolder; `readFrontMatter` (line 72) reads no front matter as `{}`.
- **F6.** `packages/contracts/dist` does not exist at this commit, so `npm run lint:examples` builds it first (`package.json` line 27). `.prettierignore` lines 1 to 4 ignore `/units/`, `/modules/`, `/plans/` and `/package-lock.json`; `examples/` is not ignored. `.prettierrc.json`: `singleQuote`, `trailingComma: all`. Prettier 3.9.10 is installed (`node_modules/prettier/package.json` line 3). `.nvmrc` is `26`; `node -v` here prints `v26.13.0`.
- **F7.** `Dockerfile` line 59 copies `/src/examples` to `/opt/scriba/examples`; `.dockerignore` excludes neither `examples` nor dot-files. The contracts default for `SCRIBA_EXAMPLES_DIR` is `/opt/scriba/examples` (`packages/contracts/src/platform/env.ts` line 14).
- **F8.** `e2e/harness/global-setup.ts` line 81 sets `SCRIBA_EXAMPLES_DIR` to `join(repoRoot, 'examples')`; `e2e/specs/journey.e2e.ts` lines 36 and following are placeholders for PST-09 and AGL-08. A grep of `e2e/` (specs, harness, mock scenarios) for `outline`, `nonfiction`, `drafts/`, `sources/` and `.md` found nothing, so no scenario names a sample path yet.
- **F9.** `units/PST-06-file-api-core.md` line 19: list hides dot-entries by default. `units/PST-08-entity-resolution.md` lines 18 to 21 (entity files, id from front matter or stem). `units/PST-05-start-from-sample.md` lines 19 to 23. `units/PST-03-discovery-new-import.md` lines 21 and 22 (New scaffolds `sources/`, `entities/`, `drafts/`, `graphs/`, `logs/`; Import creates layout folders lazily).
- **F10.** The only `PST-11` line in `plans/DECISIONS.md` is line 2405 (item 4 of the third Opus review of PLT-20). It asks for `1 sample(s)` after PST-11 merges. No DECISIONS entry changes the unit's decisions. `plans/DECISIONS.md` line 3058 records the Navigator's M5 chapter-count decision (option B); it keeps PST-11 at three skeleton drafts and changes CEX-08, CEX-20 and `modules/compile-export.md` (read in `units/CEX-08-nonfiction-sample-order.md` line 17, `units/CEX-20-milestone-gate.md` lines 22 and 25, `modules/compile-export.md` line 62).
- **F11.** Units whose `blocked_by` names PST-11: AGL-08, AGL-19, GNP-11, PST-09, PST-12, CEX-08 (grep of the `blocked_by:` lines). Units whose `parallel_with` names PST-11: PST-02, PST-03, PST-04, PST-05, PST-06, PST-07, PST-08.
- **F12.** Downstream text read: `units/GNP-11-nonfiction-sample-entities.md` lines 15 to 19; `units/AGL-08-file-tools-chat-gate.md` lines 17 and 18; `units/AGL-19-grounding-sample-draft.md` lines 15 to 18; `units/CEX-08-nonfiction-sample-order.md` lines 15 to 18; `units/CEX-20-milestone-gate.md` lines 22 and 25; `units/CEX-05-preflight-endpoint-placeholders.md` line 19 (placeholder tokens); `units/CEX-04-assembled-markdown.md` line 30 (bibliography); `units/PLT-22-examples-check-pack-layer.md` lines 21 to 29; `units/GNP-18-fiction-sample.md` lines 15 to 18; `units/GRR-16-sample-recipe.md` line 23; `units/PST-22-review-gate.md` line 30.
- **F13.** The nine other plans of this batch now exist in `plans/`: SAU-06, AGL-01, PLT-19, PST-02, SHL-10, SHL-11, SHL-12, MPR-09 and TRG-01 (`ls plans`). A grep of them for `examples/`, `samples.yaml`, `.gitkeep`, `nonfiction` and `PST-11` found: `plans/PST-02.md` line 187 ("PST-11: independent"), `plans/PLT-19.md` line 52 (its `paths-ignore` list does not name `examples/`, because the sample ships in the image, so a change to `examples/` triggers a publish run; no conflict), and `.gitkeep` hits that all concern `apps/web/src/app/features/`, not `examples/`. None of the nine plans changes a file under `examples/`. None of the nine unit files names `examples/`, a sample path or `.gitkeep` either (grep).

### 7b. Assumed, not checked here

- **ASSUMED:** the shell and `node -e` commands of section 4 run as written on macOS and Linux (BSD and GNU `grep -qxF`, `awk`, `paste`, `sed`, `cp -R`). The planner did not run them. The implementer fixes any quoting slip and records the fixed command.
- **ASSUMED:** `require("yaml")` resolves from the repository root in check C1 (b), because `yaml` is a root dependency that the examples check already uses (`scripts/examples-check/lib.mjs` line 4; `node_modules/yaml/package.json` exists).
- **ASSUMED:** Prettier keeps a single-line plain YAML scalar longer than 80 characters on one line (`proseWrap` default `preserve`). Step 4 settles it; keep what Prettier writes.
- **ASSUMED:** 250 to 450 words is "a few hundred" for a draft, and 150 to 350 is "short" for a note. The unit gives no number.
- **ASSUMED:** the bibliographic and research details of 2a: the 1993 article and its authors, the Berlin music academy, the best group's average of about 10,000 hours by age twenty, the 2008 popular book, Bryan and Harter's 1897 and 1899 telegraphy studies and their plateau finding, and the three features of deliberate practice. They are from memory (open point 5).
- **ASSUMED:** deleting `examples/.gitkeep` is acceptable (open point 6).
- **ASSUMED:** PST-05, PST-08, GNP-11, AGL-19 and CEX-08 keep the rules of their units as written; none of them is on main as code or content.

## 8. Shared files

No file that this plan changes is expected to be changed by any of the nine other units of this batch (F13; their plans now exist and were grepped). The files this plan changes, for the orchestrator's reconciliation:

- `examples/.gitkeep`: deleted (D8). No other unit of the batch touches it.
- `examples/samples.yaml`: new, created here. Later units change it (GNP-18 appends `fiction`, M6); none is in this batch.
- `examples/nonfiction/**`: new, created here. Later units change it (GNP-11, AGL-19, GRR-16, CEX-08); none is in this batch.
- `plans/PLT-19.md` D18 (line 52): its publish workflow's `paths-ignore` list does not name `examples/`, so this change triggers a publish run. Nothing to change in either plan.
- No change to `package.json`, `package-lock.json`, `.prettierignore`, `.gitignore`, `Dockerfile`, `e2e/`, `scripts/`, `packages/`, `apps/` or `plans/DECISIONS.md`.
