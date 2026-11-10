# Spec: Genre packs

## Problem Statement

The author wants to say "draft the cold open for chapter 3 from my notes on the 10,000 hour idea" and get a draft back that sits on their own material and says which files it came from. Scriba's engine knows nothing about books, by design: the Tool registry turns tool specs into forms, canvas nodes and model function schemas, and the Agent loop and Graph runner run them. Without content, that engine has nothing to offer. There are no narrative tools for the model to choose from, no entity types for people, claims, characters or places, and no prompt that tells a small local model to stay inside the author's sources.

The author writes two very different books: narrative nonfiction in the style of *Outliers*, and a novel. Each needs its own vocabulary of entities and its own story techniques. The author also needs sample projects that show these tools working before they trust them with a real manuscript. Nonfiction needs entities that the workhorse tools can draw on. Fiction needs a whole small project: a story graph, scenes that share a chapter file, beats, characters and places, a recipe, and a compile order that the graph drives.

## Solution

Genre packs is a content module. It ships three built-in packs of tool specs and entity-type schemas, all plain data and all editable by the author through the Tool registry's copy-on-write user pack:

- **`core`**: the single `propose_graph` tool (with a required `view` input, `story | recipe`), the shared entity types (Source, Style profile), and the cross-genre tools that land later (Throughline check, Remix).
- **`nonfiction`**: Person, Claim and Concept entity types; the four M2 workhorses (Cold open, Mystery question, Myth-buster, Numbers-to-people); and the tier 2–3 shapes that ship disabled.
- **`fiction`**: Character, Place and World rule entity types, and the five M6 tools (Character builder, Scene builder, Dialogue, Plot manager, World-builder).

Every tool has a plain one-line description, written for the model that chooses tools from it. It also has a first-draft prompt template that keeps the model grounded: use only the supplied material, cite it by ID, and leave a placeholder instead of inventing a fact. Every draft-producing tool takes the same common inputs: core idea, entity IDs, style profile, length and an optional tone. Every tool's output is one of the output kinds `draft | entity | claims | graph | check`.

The packs ship read-only in the image. CI validates them against the Tool registry contract, and each tool has a golden test through the mock OpenAI server. Genre packs also adds the nonfiction sample's `entities/` (M2) and authors the whole fiction sample (M6).

## User Stories

1. As an author, I want a Cold open tool that starts mid-scene with one person and then pulls back to the idea, so that my chapters open on a human moment rather than a thesis.
2. As an author, I want a Mystery question tool that opens with a puzzle and unravels it, so that the reader has a reason to keep turning pages.
3. As an author, I want a Myth-buster tool that states a common belief and dismantles it with my claims, so that I can persuade from my own evidence.
4. As an author, I want a Numbers-to-people tool that turns one statistic into one human face, so that my data reads as a story.
5. As an author, I want every narrative tool to take the same core inputs (core idea, entity IDs, style profile, length, optional tone), so that I learn one form and can swap shapes without re-entering material.
6. As an author, I want every workhorse draft to cite the entities and sources it drew on by ID, so that I can trace any sentence back to its inputs.
7. As an author, I want a tool to leave a visible placeholder when my material lacks a fact, rather than invent one, so that preflight can catch the gap before export.
8. As an author, I want Source, Person, Claim and Concept entity types with clear fields, so that my research notes have a predictable shape that tools can read.
9. As an author, I want a Claim entity to record its status with the same words the grounding check uses (`supported`, `weak`, `unsupported`), so that claims and grounding results don't disagree on vocabulary.
10. As an author, I want a Style profile entity holding my tone, sample paragraphs, banned phrases and target length, so that every tool writes in my voice and preflight can catch my banned phrases.
11. As an author, I want the nonfiction sample to include a few entities that cite its sources, so that I can try every workhorse on real-looking material straight after "start from sample".
12. As an author, I want a Character builder that drafts a character from want, need, flaw and voice, so that I can grow a cast from a one-line seed.
13. As an author, I want a Scene builder that drafts a scene from its goal, conflict and outcome from one character's point of view, so that I can get from beats to prose quickly.
14. As an author, I want a Dialogue tool that writes an exchange in each character's own voice and respects their relationship notes, so that my characters don't all sound alike.
15. As an author, I want a Plot manager that checks my beats, setups and payoffs for gaps, so that I catch a missing payoff before a reader does.
16. As an author, I want a World-builder that expands a place or rule and flags contradictions with my other rules, so that my world stays consistent.
17. As an author, I want Character, Place and World rule entity types, so that fiction material has the same predictable shape as nonfiction research.
18. As an author, I want a fiction sample with a story graph, scenes, beats, characters, a place, a recipe and graph-driven compile order, so that I can see the whole fiction workflow before starting my novel.
19. As an author, I want the fiction sample to show two scenes sharing one chapter file, plus one label-only beat and one file-backed beat, so that I understand my options for laying out drafts.
20. As an author, I want the fiction sample's compile order to differ from alphabetical file order, so that I can see the story graph's `order` relations at work.
21. As an author, I want to type an intent and get a proposed story graph or recipe as a pending change, so that I can start from a sketch and edit it before running anything.
22. As an author, I want a Throughline check that flags any section drifting from a chapter's core idea, so that each chapter keeps its spine.
23. As an author, I want Remix to re-deliver a passage in another shape, so that I can compare a cold-open version with a mystery-question version side by side in review.
24. As an author, I want the tier 2–3 nonfiction shapes (Named concept, Comparison set, Objection handler, Contrast, Profile, Zoom, Reader-challenge, Framework-builder, Method-first, Timeline, Flashback, Stockdale tension) available but disabled by default, so that the model isn't swamped with choices until I turn them on.
25. As an author, I want to edit any built-in tool's description or prompt, with my edits saved as a copy in my user pack, so that I can tune tools without losing the shipped version.
26. As an author, I want the built-in packs to be read-only in the image, so that an update can never conflict with my edits and a broken edit can always fall back to the original.
27. As an author, I want tools to show as canvas nodes whose ports match their inputs (text, entity, style), so that I can drag a character onto Dialogue or a claim onto Myth-buster without typing.
28. As an author, I want entity inputs filtered by entity type (only claims on Myth-buster's claim input, only characters on Dialogue), so that I can't wire the wrong kind of thing.
29. As an author, I want each tool's description to be one plain sentence, so that I can read the tool list and know what each one does.
30. As the agent (model), I want short, distinct tool descriptions, so that I choose the right tool from a plain-language intent.
31. As the agent (model), I want each tool's inputs as a strict function schema with required fields marked, so that my calls validate and a bad call gets a readable error.
32. As the Agent loop, I want every tool's sources computed from its entity-ID inputs, so that I can record draft provenance without parsing prose.
33. As the Graph runner, I want stable tool names and input keys, so that saved recipes (including the nonfiction sample recipe) keep working across releases.
34. As the Graph runner, I want the propose-graph output to be a graph file that validates against the graph schema, so that a proposed graph opens on the canvas without repair.
35. As Compile & export, I want fixed field names for Source citation data and the Style profile's banned phrases, so that the bibliography and the banned-phrase preflight check can read them.
36. As a developer, I want CI to validate every pack against the Tool registry contract, so that a malformed spec fails the build instead of the author's session.
37. As a developer, I want a golden test per tool through the mock OpenAI server, so that a prompt or schema change is a deliberate, reviewed diff.
38. As a developer, I want the sample entities and graphs validated in CI with every reference resolving to an existing file, so that "start from sample" never ships a broken link.
39. As a developer, I want a manual eval case per tool for the real-model check, so that I can confirm citation behaviour and voice separation with a small and a larger local model.
40. As a future pack author, I want packs laid out as plain folders of tool YAML and entity-type schemas, so that a screenplay or memoir pack can be added later without engine changes.
41. As an author, I want the samples to ship without `.scriba/`, `logs/`, `snapshots/` or `drafts/.versions/`, so that a fresh sample project starts clean.
42. As an author, I want sample text that is original or public domain, so that I can copy, share and modify the samples freely.

## Implementation Decisions

### Pack layout and shipping
- The packs live in `packages/packs` as three folders: `core`, `nonfiction` and `fiction`. Each folder holds `tools/<name>.yaml` (one file per tool) and `entity-types/<kind>.yaml` (one file per entity type), the layout the Tool registry's loader reads. The module contains no runtime code. Its only code is its tests.
- The image ships them read-only at `/opt/scriba/packs/{core,nonfiction,fiction}` through Platform's existing Dockerfile copy of `packages/packs`; Genre packs only verifies it. The app user cannot write there.
- Loading, name resolution (user > built-in), copy-on-write editing into `/books/.scriba/packs/user/`, and lint-on-save all belong to the Tool registry. Genre packs only supplies content that passes them.
- `core` is always active. `project.yaml`'s genre pack field names `nonfiction` or `fiction`, and the tools and entity types offered to that project are `core` plus the named pack. The Tool registry and Agent loop specs implement the filtering. This spec fixes only which pack each tool and type belongs to.

### Tool spec content
- Each tool is one YAML file with `name`, a one-line plain `description`, `inputs` (the JSON Schema subset with `x-scriba-*` hints), `output`, `enabled`, `prompt` (block scalar) and `schemaVersion`.
- **Names** are lower snake_case and stable, as the Tool registry requires for model function names, for example `cold_open` and `numbers_to_people`. The file name is `<name>.yaml`. Input keys are camelCase and also stable, because recipes address ports as `<nodeId>.<key>`. Renaming a tool or input key is a breaking change. It needs expand–contract and an update to every sample recipe in the same PR.
- **Descriptions** are one sentence, under about 120 characters, in plain words, starting with a verb, and naming the shape rather than the genre theory. The model chooses tools from these descriptions.
- **Prompt templates** use only the Tool registry's Handlebars-like subset (`{{field}}`, `{{#each}}`, `{{#if}}`, `{{entity id}}`, `{{toolCatalog}}`). They stay pure: callers supply the resolved entity contents. Every first-draft template follows the same skeleton:
  1. a role line;
  2. the material, each entity rendered with its ID;
  3. the shape's steps (for Cold open: the moment, the person, the pull-back, the idea);
  4. constraints: use only the material; cite each factual sentence with its entity or source ID in Pandoc citation form (`[@id]`, the Project store's in-body citation syntax); where a needed fact is missing, write `TK` (Compile & export's placeholder) with a short note, for example `TK (year of the study)`, rather than invent one; respect the style profile's tone, banned phrases and the requested length.
- **`enabled`** is `true` for `propose_graph`, the four workhorses, the five fiction tools, Throughline check and Remix. It is `false` for the twelve tier 2–3 nonfiction shapes, which the author turns on later.
- **Sources used** are computed by the Tool registry from the entity-ID inputs. Prompts never ask the model to list its own sources.

### Common inputs
Every draft-producing narrative tool declares these five inputs. Each spec repeats them verbatim (the tool-spec format has no cross-file reference), and a CI check asserts they are identical across tools.

| Key | Meaning | Required | Port |
|---|---|---|---|
| `coreIdea` | The idea the passage serves, in one or two sentences | yes | `text` |
| `entityIds` | Entities and sources to draw from (a list) | no | `entity` |
| `styleProfile` | One Style profile entity | no | `style` |
| `length` | Target length in words (default 800) | no | none (a `params` control) |
| `tone` | Optional tone override for this passage | no | none (a `params` control) |

Tools whose output is `entity`, `check` or `graph` take only the subset that makes sense, listed per tool below. Entity inputs carry the Tool registry's entity-reference hint, filtered by entity type, so the form, the canvas and Ajv all restrict them.

### Entity types
Each entity-type schema uses the Tool registry's entity-type envelope `{schemaVersion, kind, title, description, folder, fields}`. `fields` is a JSON Schema in the tool-input subset plus the registry's one extension (a one-level array of objects with scalar properties, used by `relationships`). It describes the front-matter fields that a type adds on top of the Project store's generic entity front matter (`id`, `type`, `links`). Reference-valued fields carry `x-scriba-type: entity` and `x-scriba-entity-kinds`, so broken-link checks can find them. The `description` is one line that also says what the Markdown body holds. The `kind` value is the front-matter `type` value that tool inputs filter by.

| Type (`type` value) | Pack | Folder | Front-matter fields | Body |
|---|---|---|---|---|
| Source (`source`) | core | `sources/` | `title`, `citation`, `url` (optional), `reliability` (a short note) | quotes and notes |
| Style profile (`style-profile`) | core | `entities/` | `tone`, `targetLength` (words), `bannedPhrases` (list) | sample paragraphs |
| Person (`person`) | nonfiction | `entities/` | `name`, `role`, `sources` (source references) | what happened |
| Claim (`claim`) | nonfiction | `entities/` | `statement`, `evidence` (source references), `status` (`supported \| weak \| unsupported`) | discussion |
| Concept (`concept`) | nonfiction | `entities/` | `name`, `definition` (one line) | examples and where it's used |
| Character (`character`) | fiction | `entities/` | `name`, `want`, `need`, `flaw`, `voice` (notes), `relationships` (list of `{character, note}`, where `character` is a character reference) | backstory |
| Place (`place`) | fiction | `entities/` | `name`, `rules` (world-rule references) | description |
| World rule (`world-rule`) | fiction | `entities/` | `statement`, `appliesTo` (place references) | consequences and exceptions |

- Source and Style profile are in `core` because both books use them.
- **Replaced entity types:** Scene and Plot beat are story nodes, not entity types. A scene's goal, conflict, outcome and point of view become Scene builder inputs (`goal`, `conflict`, `outcome`, `pov`), and its characters and place come in through `entityIds`. A beat is a story node whose label holds its short text, or which points at a whole file in `drafts/`. Neither Place nor a beat has a "linked scenes" field: links to scenes are relations on the story graph. Chapter is not an entity type in v1: a chapter is a draft file in `drafts/`, its order lives in `project.yaml` or the story graph's `order` relations, and its status lives in Compile & export's manuscript view. A chapter's throughline is passed as `coreIdea`.
- Claim status uses `unsupported` (replacing `unsourced`) to match the Agent loop's grounding verdicts.
- Front matter is optional on files in `sources/` (the Project store treats such a file as type `source`), but the samples always carry it, so the bibliography works.

### Tool catalogue
Descriptions below are the shipped one-liners (first drafts). "Extra inputs" are added to the common inputs where the output is `draft`. Port types are shown in brackets; inputs without a port are `params` controls.

| Tool (`name`) | Pack | Output | Description | Extra inputs | Phase |
|---|---|---|---|---|---|
| `propose_graph` | core | graph | Sketch a story graph or a recipe from a plain-language intent. | `intent` [text, required], `view` (`story \| recipe`, required), `entityIds` [entity], `files` (project-relative paths) | core-propose-graph |
| `cold_open` | nonfiction | draft | Open mid-scene with one person at one moment, then pull back to the idea. | `person` [entity: person, required], `moment` [text] | nonfiction-workhorses |
| `mystery_question` | nonfiction | draft | Open with a puzzle, then unravel it to a surprising finding. | `puzzle` [text, required], `surprisingFinding` [text] | nonfiction-workhorses |
| `myth_buster` | nonfiction | draft | State a common belief, then take it apart with evidence. | `belief` [text, required], `claimIds` [entity: claim, required] | nonfiction-workhorses |
| `numbers_to_people` | nonfiction | draft | Turn one statistic into the story of one person behind it. | `statistic` [text, required], `person` [entity: person, required] | nonfiction-workhorses |
| `character_builder` | fiction | entity | Draft a character from a seed: want, need, flaw and voice. | `seed` [text, required], `role` (param); plus `coreIdea`, `entityIds`, no style or length | fiction |
| `scene_builder` | fiction | draft | Draft a scene from its goal, conflict and outcome from one character's point of view. | `sceneNotes` [text], `pov` [entity: character, required], `goal`, `conflict`, `outcome` (params) | fiction |
| `dialogue` | fiction | draft | Write an exchange between characters, each in their own voice. | `characterIds` [entity: character, at least 2, required], `sceneText` [text], `subtext`, `goal` (params) | fiction |
| `plot_manager` | fiction | check | Check beats, setups and payoffs for gaps and loose ends. | `outline` [text, required: the story graph file or a beat list], `entityIds` [entity] | fiction |
| `world_builder` | fiction | entity | Expand a place or world rule and flag contradictions with the others. | `ruleIds` [entity: place or world-rule, required], `coreIdea` [text] | fiction |
| `throughline_check` | core | check | Flag any section of a chapter that drifts from its core idea. | `chapterText` [text, required], `coreIdea` [text, required] | remaining-shapes |
| `remix` | core | draft | Rewrite a passage in another tool's shape for side-by-side comparison. | `passage` [text, required], `targetShape` (enum of draft-producing tool names, required) | remaining-shapes |
| `named_concept` | nonfiction | entity | Coin a memorable label and one-line definition for a pattern. | `pattern` [text, required], `examples` [entity] | remaining-shapes |
| `comparison_set` | nonfiction | draft | Contrast winners with matched cases that didn't win. | `cases` [entity, required], `variables` (param list) | remaining-shapes |
| `objection_handler` | nonfiction | draft | Raise the strongest objections to a claim and answer each fairly. | `claimIds` [entity: claim, required] | remaining-shapes |
| `contrast` | nonfiction | draft | Set two things side by side so the difference makes the point. | `subjectA`, `subjectB` [text, required] | remaining-shapes |
| `profile` | nonfiction | draft | Paint one person in depth to embody the idea. | `person` [entity: person, required] | remaining-shapes |
| `zoom` | nonfiction | draft | Move from a close-up detail out to the big picture and back. | `detail` [text, required], `bigPicture` [text] | remaining-shapes |
| `reader_challenge` | nonfiction | draft | Ask the reader to test their own assumption before the reveal. | `question` [text, required] | remaining-shapes |
| `framework_builder` | nonfiction | draft | Turn a pattern into a small named framework with steps. | `pattern` [text, required], `claimIds` [entity: claim] | remaining-shapes |
| `method_first` | nonfiction | draft | Explain how the evidence was gathered before what it showed. | `method` [text, required] | remaining-shapes |
| `timeline` | nonfiction | draft | Tell events in order to show how the idea unfolded. | `events` [text, required] | remaining-shapes |
| `flashback` | nonfiction | draft | Break from the present moment to a past one that explains it. | `present` [text, required], `past` [text, required] | remaining-shapes |
| `stockdale_tension` | nonfiction | draft | Face the hardest fact while holding on to the hope beside it. | `hardFact` [text, required], `hope` [text, required] | remaining-shapes |

- Every `output` value is in the enum `draft | entity | claims | graph | check`. No built-in tool produces `claims`: claim extraction is the Agent loop's grounding step.
- **Scene and beat are not entity references**. Scene builder, Dialogue, Plot manager and Throughline check take scene and chapter content on `text` ports. In a recipe, a text Input node holds a file reference read at run start. In chat, the agent reads the file first.
- **World-builder** returns the expanded place or rule as an `entity` output. Its prompt puts any contradictions under a fixed "Contradictions" heading in the body, where the author sees them in review.
- **Remix** produces a draft of the same passage in the target shape. `targetShape` is a `string` enum of the snake_case names of every shipped `draft` tool except `remix` itself. Its prompt carries one line per shape, and a CI check asserts that the enum matches the shipped draft tools in the packs. The side-by-side comparison is the Project store's review diff of the resulting pending change. There is no Compare node: recipe nodes are input, tool and output only (replacing the Merge, Compare and Gate node types).
- **Dialogue's "done when"** relies on the prompt rendering each character's full entity (`voice` and `relationships` included) through `{{#each}}` and `{{entity id}}`, and telling the model to give each speaker distinct diction and to keep to the relationship notes.

### Propose-graph (core)
- One tool with a required `view` input (`story | recipe`) and output `graph`.
- The prompt describes the graph file shape owned by the Graph runner: `{schemaVersion, view, name, nodes, edges}`. In story view, nodes are `entity | scene | beat` with `label` and an optional `path`, and edges carry free-text relations (suggested: `order`, `causality`, `containment`). In recipe view, nodes are `input | tool | output` with `{id, kind, position, tool?, params?}`, wires connect port ids `<nodeId>.<key>`, there is one wire per input, and types must match.
- For recipe view the model needs the enabled tools with their port keys and types. The template takes these from a Tool registry template helper that renders the enabled tool catalogue. That helper is pure, because it uses registry data and no project files. Paths for scene and entity nodes come from the `files` and `entityIds` inputs. The prompt forbids inventing paths.
- The Agent loop writes the result as a pending change aimed at `graphs/`, validated against the Graph runner's schema. If validation fails, the agent gets the error back and can retry.

### Samples
- **Sourcing.** All sample prose and entity text is original writing made for Scriba and released under the repo's licence. Nonfiction sources follow the Project store's skeleton, which may use public-domain excerpts. Nonfiction entities only summarise and cite those sources, and never add facts the sources lack. The fiction sample is wholly original. No copyrighted excerpts and no invented quotes from real living people.
- **Excluded from both samples:** `.scriba/`, `logs/`, `snapshots/` and `drafts/.versions/`.
- **Nonfiction `entities/` (M2).** Five entities on the skeleton's topic: one `person`, two `claim`s, one `concept` and one `style-profile`. Every reference resolves to a source in the skeleton's `sources/`. The claims' statuses must not contradict the Agent loop's grounding-claims draft (M3). If skeleton sources lack Source front matter, this phase adds the missing fields in the same PR. File paths already used by the mock OpenAI script stay unchanged.
- **Fiction sample (M6), whole project.** An original short piece about two lighthouse keepers. It is kept to a small slice: 3–6 entities and 2–3 draft files of a few hundred words each.
  - `project.yaml`: genre pack `fiction`, style profile reference, **no** order field, so the sample's compile order comes only from the story graph's `order` edges (the nonfiction sample demos the `project.yaml` order field).
  - `entities/`: two characters with clearly distinct voices and relationship notes (a terse veteran keeper and a talkative relief keeper), one `place` (the lighthouse island), one `world-rule` (for example, "the supply boat comes only on a spring tide"), and one `style-profile`. That makes five entities.
  - `drafts/`: three files whose alphabetical order differs from story order: `arrival.md` (two scenes), `the-storm.md` (one scene) and `ledger.md` (a short file-backed beat).
  - `graphs/` story graph:
    - two scene nodes, both pointing at `drafts/arrival.md`;
    - one scene node for `drafts/the-storm.md`;
    - a label-only beat contained in the storm scene;
    - a file-backed beat pointing at `drafts/ledger.md`;
    - entity nodes for the characters and the place;
    - `order` edges (arrival scenes → storm → ledger beat), one `containment` edge (storm scene → beat), one `causality` edge (label-only beat → ledger beat), and one free-text relation from a scene to its POV character.
  - Expected compile order: `arrival.md`, `the-storm.md`, `ledger.md`. Alphabetical order would be arrival, ledger, the-storm.
  - `graphs/` recipe: text Input (scene file reference) + entity Input (characters) + style Input → `dialogue` tool node → Output node (`draft`).

## Phases

Serial. Genre packs publishes no contract slice (`/genre-packs` is empty), so there is no `phase:contract`.

Milestones referenced here: M1 is the walking skeleton, M2 is the tool registry, M3 is review and grounding, M4 is canvas, M5 is compile and export, M6 is the fiction pack, and M7 is remaining tools and polish.

### `phase:core-propose-graph` (M2; `propose_graph` first demoed at M4 and in M7's polish)
Blocked by: Platform `phase:scaffold` (including `create-test-app`) and `phase:test-harness` (mock OpenAI server); Tool registry `phase:executor` (which includes the loader, the pack-lint library and the execute endpoint the golden tests use); Graph runner `phase:contract`; Project store `phase:contract` (entity front-matter base, entity reference). Content authoring can start against the Tool registry contract earlier, but the phase closes only when its suites run.

Scope:
- `packages/packs` with `core`, `nonfiction` and `fiction` folders (each with `tools/` and `entity-types/`), and a check that the image copy at `/opt/scriba/packs/` is read-only for the app user.
- The pack content checks in CI (see Testing Decisions), running against all three folders on top of the Tool registry's `npm run lint:packs`.
- The golden-test harness and the convention for adding mock OpenAI fixtures per tool.
- The core entity types `source` and `style-profile`.
- The `propose_graph` tool, with its golden tests for both views.

Acceptance criteria:
- [ ] CI runs the pack validation suite on every push, and it fails on the suite's own broken-spec fixtures (bad output kind, unknown hint, template naming an undeclared input, duplicate name, multi-line description).
- [ ] `propose_graph` validates. Calling it without `view` returns an Ajv error naming `view`.
- [ ] Golden tests: with the mock scripted to return a story graph and a recipe, each output parses against the Graph runner's graph schema, and the rendered prompt matches its checked-in golden.
- [ ] The built image contains `/opt/scriba/packs/core`, and the app user cannot write to it.
- [ ] The Tool registry's list includes `propose_graph` from the built-in `core` pack.

### `phase:nonfiction-workhorses` (M2)
Blocked by: `phase:core-propose-graph`; Project store's nonfiction skeleton (M1) for the sample.

Scope:
- The `person`, `claim` and `concept` entity types.
- The `cold_open`, `mystery_question`, `myth_buster` and `numbers_to_people` tools, each with the common inputs.
- Golden tests and mock fixtures for those four tools, plus manual eval cases.
- The nonfiction sample's `entities/`, and Source front matter on skeleton sources if it's missing.

Acceptance criteria:
- [ ] All four tools pass the validation suite, and their common inputs are identical.
- [ ] Each tool's golden test: the rendered prompt contains every input entity with its ID plus the citation and placeholder instructions; the result's `sourcesUsed` equals the sources derived from the input entity IDs.
- [ ] Sample entities validate against their types, and every entity reference resolves to an existing file in the sample.
- [ ] **Done when:** each of the four workhorses produces a draft that cites its source files. In CI this is checked through `sourcesUsed` and draft provenance. With a real model it is checked by the manual eval: the draft contains `[@id]` citations, and those IDs are among the input entities and sources.
- [ ] Demo script (under 5 minutes, needs Agent loop's `phase:narrative-tools`):
  1. Start from the nonfiction sample.
  2. In chat, ask "draft a cold open for chapter 1 about <person> using my notes".
  3. Watch the `cold_open` tool card with its inputs and sources.
  4. Open the pending change and see the `[@id]` citations.
  5. Repeat with "bust the myth that …" (Myth-buster).
  6. Reject both changes.

### `phase:fiction` (M6)
Blocked by: `phase:nonfiction-workhorses`. The sample's graph-order demo needs Compile & export's assembly-order implementation (M5) and Graph runner's canvas phase (M4).

Scope:
- The `character`, `place` and `world-rule` entity types.
- The `character_builder`, `scene_builder`, `dialogue`, `plot_manager` and `world_builder` tools, with golden tests, mock fixtures and manual eval cases.
- The whole fiction sample in `examples/` (story graph, recipe, entities, drafts and `project.yaml`), as specified above.

Acceptance criteria:
- [ ] All five tools pass the validation suite. Every entity input names an existing entity type as its filter.
- [ ] Dialogue's golden test: the rendered prompt contains both characters' `voice` and `relationships`, plus the distinct-voice instruction. Calling it with one character fails Ajv.
- [ ] The fiction sample validates (graph schema, `project.yaml`, entity types and recipe tool references). Every story-node `path` exists, and two scene nodes share `drafts/arrival.md`. There is one label-only beat and one file-backed beat.
- [ ] Started through "start from sample", the fiction project's manuscript order (Compile & export API) is `arrival.md`, `the-storm.md`, `ledger.md`.
- [ ] **Done when:** a dialogue scene between two characters keeps each voice distinct and respects their relationship notes. This is checked by the manual eval with a small and a larger local model, and by the author in the demo.
- [ ] Demo script (under 5 minutes):
  1. Start from the fiction sample.
  2. Open the story graph and point out the shared chapter file, both beats and the `order` edges.
  3. Open the manuscript and confirm the graph order.
  4. Open the recipe and run it with the storm scene and both keepers.
  5. Read the Dialogue pending change for voice and relationship.
  6. Ask the agent to "check my beats for loose ends" (Plot manager).

### `phase:remaining-shapes` (M7)
Blocked by: `phase:fiction`.

Scope:
- `throughline_check` and `remix` (core).
- `named_concept`, `comparison_set` and `objection_handler`, plus the nine tier 2–3 shapes (all shipped with `enabled: false`).
- Golden tests and manual eval cases for all of them.
- The Remix shape-list consistency check.

Acceptance criteria:
- [ ] All fourteen tools pass the validation suite. The twelve nonfiction shapes ship disabled. Throughline check and Remix ship enabled.
- [ ] One golden test per tool through the mock OpenAI server.
- [ ] Remix's `targetShape` enum matches the shipped draft tools, so CI fails if a shape is added or renamed without updating Remix.
- [ ] Enabling a disabled shape through the Tool registry (a copy-on-write user-pack copy) makes it callable by the agent and available as a canvas node.
- [ ] Demo script (under 5 minutes):
  1. Run Throughline check on a sample chapter that has one drifting paragraph, and see it flagged.
  2. Remix that chapter's cold open as a Mystery question, and compare the two in the review diff.
  3. Type an intent and get a proposed recipe (`propose_graph`, `view: recipe`) as a pending change.
  4. Accept it, then open it on the canvas.

## Contracts

**Produces.** Nothing in `@bbartolome/scriba-contracts`: the `/genre-packs` subpath stays empty, because packs are content validated by the Tool registry. Content interfaces other modules depend on, held stable with expand–contract:
- Pack folders `core`, `nonfiction` and `fiction` at `/opt/scriba/packs/`, read by the Tool registry's loader.
- Tool names and input keys from the catalogue. Graph runner's nonfiction sample recipe (M4) and saved recipes reference them as `<nodeId>.<key>`.
- Entity-type names and fields. The Tool registry filters entity references by type name. Compile & export reads `source` fields for the bibliography and `style-profile.bannedPhrases` for preflight. The Agent loop's grounding-claims draft (M3) uses `claim` entities.
- The citation convention (`[@id]`, with entity or source IDs) used in drafts.
- Sample content: the nonfiction `entities/` (M2) and the whole fiction sample (M6) in `examples/`.

**Consumes.**
- **Tool registry, `phase:contract`** (`/tool-registry`): the tool-spec shape, the `x-scriba-*` hint vocabulary (including `x-scriba-port`, `x-scriba-type` and the entity-reference filter), the port-type enum `text | entity | style`, the output enum `draft | entity | claims | graph | check`, the template-helper set (including the tool-catalogue helper used by propose-graph) and the tool-execution result `{output, sourcesUsed}`. Its `phase:executor` (implementation) is needed for the golden tests and content checks.
- **Graph runner, `phase:contract`** (`/graph-runner`): the graph file schema, story-node fields, the recipe node shape, port ids and suggested relations. Used for propose-graph output validation and the fiction sample's graphs.
- **Project store, `phase:contract`** (`/project-store`): the generic entity front-matter base, the entity reference and file reference types, and the `project.yaml` schema. The **implementation** of `phase:files` (M1) is needed for `examples/` and "start from sample".
- **Platform, `phase:scaffold`**: the workspace, CI job, Dockerfile (already copies `packages/packs`), `create-test-app`, mock OpenAI server (fixtures added) and the sample CI check (which validates entity files against these schemas).
- **Agent loop**: the manual eval script (cases added).
- **Compile & export** (implementation, M5) and **Agent loop** (`phase:narrative-tools`): needed only for demos and the fiction-order check, not for building packs.

## Testing Decisions

- **What a good test is here.** It asserts behaviour other modules and the model see: a spec loads and validates; a call with given arguments and entity contents sends a given request to the model; the result carries the right output kind and `sourcesUsed`; samples resolve. It does not assert wording inside prompts beyond the golden snapshot, and never tests Tool registry internals.
- **Contract seam: pack validation (CI).** Two layers:
  - The Tool registry's pack-lint (`npm run lint:packs`) lints every pack folder: output enum, `x-scriba-*` vocabulary and port types, known entity kinds, template parsing against declared inputs and helpers, unique names, one-line descriptions, and entity-type schemas.
  - This module's **content checks** (a Vitest suite in `packages/packs/test/`, using the pack-lint library entry point and the contracts package): every `x-scriba-entity-kinds` value names a shipped entity type (an error here, not a warning), the five common inputs are identical on draft tools, Remix's shape enum matches the shipped draft tools, descriptions are under 120 characters and start with a verb, and every pack lints with zero errors.

  Broken-spec fixtures owned by the content suite (bad output kind, unknown hint, template naming an undeclared input, duplicate name, multi-line description) prove that the pack-lint library rejects them.
- **Primary seam: golden test per tool.** The golden suite lives at `apps/api/test/packs/` (owned by this module; goldens and fixtures under `packages/packs/test/golden/`). Each test boots the API with Platform's `create-test-app` (with `SCRIBA_PACKS_DIR` pointed at `packages/packs`) against a temp library folder and the mock OpenAI server, then calls the Tool registry's `POST /api/tool-registry/tools/:name/execute` with fixture arguments and fixture resolved entities. It asserts that:
  - the request the mock received (rendered prompt and function schema) matches a checked-in golden;
  - the returned `{output, sourcesUsed}` matches the expected output kind and source IDs;
  - invalid arguments return Ajv's readable error.

  Golden files change only on purpose, in the same PR as the prompt edit. Fixtures are the tests' own; unit tests never read `examples/`.
- **Sample checks.**
  - Platform's CI sample check validates sample files against the contracts and these entity-type schemas.
  - A fiction-order check creates a project through the real "start from sample" HTTP flow and asserts the manuscript order from Compile & export's API. That is the same real "start from sample" flow that the e2e run uses for the nonfiction sample.
- **System seam.** The single Playwright e2e is unchanged. This module adds no e2e step, because the nonfiction file paths the mock script uses stay stable.
- **Real models.** Manual eval cases per tool go into the Agent loop's manual eval script, covering a small and a larger local model: citation presence for the workhorses and voice separation for Dialogue.
- **Tooling.** Vitest. There is no prior art in the repo yet.

## Out of Scope

- Loading, copy-on-write editing, lint-on-save, the tool-spec UI, and form/node/function-schema emission (Tool registry).
- Running tools, recording citations and provenance, and the grounding check (Agent loop); running recipes (Graph runner).
- Per-project `tools/`, a field DSL for tool specs, and per-tool model choice (all deferred to later versions).
- New output kinds; screenplay or memoir packs; tier-4 tools (none is defined yet).
- A dedicated Remix comparison view. Comparison uses the review diff.
- A nonfiction story graph.
- **Replaced design choices** (earlier option → chosen option):
  - Zod for tool inputs → JSON Schema.
  - Scene and Plot beat entity types → story nodes.
  - The `structure/` folder → `drafts/`.
  - Merge, Compare and Gate nodes and entity nodes in recipes → input/tool/output only.
  - React or React Flow node components → the Tool registry's derived nodes on ngx-vflow.
  - Chapter entity type → dropped (see Implementation Decisions).

## Further Notes

- **Cross-spec alignment (resolved):** the Tool registry publishes the entity-type envelope and entity-reference hints; it provides the pure `{{toolCatalog}}` helper for `propose_graph`; its `execute` endpoint is the golden tests' surface; Compile & export's placeholder is `TK` and it reads `source.citation`, `source.url` and `style-profile.bannedPhrases`; the Tool registry and Agent loop filter tools by `project.yaml`'s genre pack.
- `[@id]` is Pandoc citation syntax, so Compile & export can later render citations with citeproc, and the broken-entity-link preflight can check them. This spec does not require either.
- Each tool's plain one-line description and first-draft prompt template come from the catalogue's descriptions and the shared prompt skeleton. The templates are first drafts that the author is expected to tune through copy-on-write.
- Propose-graph is in the first phase, although the polish milestone (M7) also demos it. The phase also lays the pack foundation that M2 depends on. If the Graph runner's contract phase lags, that phase is the critical path for M2.
