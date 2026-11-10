# Spec: Agent loop

## Problem Statement

The author thinks in plain language: "summarize my outline", "draft the cold open for chapter 3 from my notes on the 10,000 hour idea", "is this paragraph backed by my sources?". Today nothing in Scriba turns such an intent into work. The author would have to pick a narrative tool, find the right entity files, fill a form, copy the result into a draft and then check by hand whether each fact in it comes from a source.

Local models make this harder. They emit malformed tool calls, they loop, and they invent facts. A statistic that sounds right but appears in no source is the failure that hurts a nonfiction book most. The author also works from several devices. A phone that went to sleep mid-answer has to pick up where the agent run is, not show a frozen half-answer.

The author needs one chat panel where an agent reads the project, calls the right tools, shows every step it takes, never touches the author's files without review, and flags every claim the sources don't back.

## Solution

The Agent loop is a plain tool-calling loop over the Model providers client. The author types an intent in the chat panel. The loop sends the intent, a project summary and the schemas of the tools it may call to the model. If the model answers with tool calls, the loop runs them, appends the results and calls the model again. If the model answers with text only, the agent run ends. A step cap (default 12) and a stop button end runaway loops.

The model can call four tool families:

- **Project tools**: list files, read file, write file, edit file (exact old text → new text), search notes. They work only inside the active project, through the Project store.
- **Narrative tools**: every *enabled* tool from the Tool registry, one function each. The loop resolves the entity IDs in the arguments to file contents, hands them to the registry, which executes the tool, and records which entities and sources were used.
- **Research tools**: web search and page fetch, behind a setting that is off by default.
- **Compile tools**: assemble, check and export, through the Compile & export API (M7).

Every write the agent makes, and every draft, entity or graph a narrative tool produces, becomes a **pending change** for the author to accept or reject. Nothing lands in `drafts/`, `entities/` or `graphs/` directly. Malformed tool arguments go back to the model as a readable error, and the model gets two retries. Tokens stream into the chat, and every tool call shows as a card with its inputs, outputs or error, over the one multiplexed SSE stream.

After any draft, the loop runs the **grounding check** as a built-in step. It extracts the factual claims, retrieves passages from `sources/` with FTS5 search, and asks the model to judge each claim supported, weak or unsupported, citing the passage. The verdicts appear as badges in the chat and are saved as a `claims` artefact. Every agent run is written as a transcript in `logs/`. A current-run-state endpoint lets a device that slept catch up. The chat panel works on the phone.

## User Stories

1. As an author, I want to type an intent in a chat panel, so that I can ask for work in plain language instead of picking tools myself.
2. As an author, I want the agent to see a short summary of my active project (title, genre pack, folders and file counts), so that it starts its answer knowing where things are.
3. As an author, I want the agent to list and read my project's files, so that "summarize my outline" gets an answer based on my real files.
4. As an author, I want to watch the answer stream in token by token, so that I know the agent is working and can read along.
5. As an author, I want each tool call shown as a card with its name, its arguments and its result, so that I can see exactly what the agent did.
6. As an author, I want a tool-call card to show an error clearly, with the attempt number, so that I can tell a retried call from a failed one.
7. As an author, I want a step counter such as "step 4 of 12", so that I can see how close the agent is to the cap.
8. As an author, I want the agent run to stop at the step cap and tell me so, so that a confused model can't loop forever on my machine.
9. As an author, I want to continue an agent run that hit the cap with one tap, so that a long but productive task can carry on when I choose.
10. As an author, I want to change the step cap in settings, so that I can give a larger model more room or keep a small one on a short leash.
11. As an author, I want a stop button that is always visible during an agent run, so that I can end it the moment it goes wrong.
12. As an author, I want stop to cancel the model call in flight, so that my machine stops working on an answer I no longer want.
13. As an author, I want the agent to be unable to read or write anything outside the active project, so that my other books and the app's state stay private and safe.
14. As an author, I want switching the active project to stop any agent run in the old one, so that an agent never keeps working in a book I've left.
15. As an author, I want every file the agent writes or edits to become a pending change, so that I review a diff before anything changes on disk.
16. As an author, I want the agent to see its own earlier writes when it reads a file again in the same agent run, so that it can make several edits to one file coherently.
17. As an author, I want an edit whose old text isn't found, or is found more than once, to fail with a clear message to the model, so that it rereads the file instead of guessing.
18. As an author, I want the write card to show the diff it will propose, so that I can judge it in the chat before I open the review queue.
19. As an author, I want all of an agent run's writes to appear in the review queue when the agent run ends, even if I stopped it, so that no work is lost and I still decide what lands.
20. As an author, I want the agent to call my enabled narrative tools (cold open, myth-buster, …), so that it can draft with the techniques my genre pack provides.
21. As an author, I want disabled tools hidden from the agent, so that switching a tool off in the registry really keeps the agent from using it.
22. As an author, I want the agent to pass entity IDs to a tool and the app to fetch those entity files, so that the tool works from my material and not from the model's memory.
23. As an author, I want an unknown entity ID to come back to the model as a readable error, so that it looks the right ID up instead of inventing one.
24. As an author, I want a malformed tool call answered with a readable error and two retries, so that a small local model can correct itself.
25. As an author, I want a tool that keeps failing validation to be withdrawn for the rest of the agent run, so that the agent run doesn't burn its steps on the same mistake.
26. As an author, I want every draft the agent produces to record the entity IDs and the tool run that produced it, so that I can trace any sentence back to its inputs.
27. As an author, I want the sources a narrative tool used listed on its card, so that I can open them from the chat.
28. As an author, I want a narrative tool's draft to become a pending change in `drafts/` (or the file I named), so that new prose goes through review like any other write.
29. As an author, I want an entity a tool produces to become a pending change in `entities/`, so that new people, claims or concepts are reviewed before they join my project.
30. As an author, I want a graph the agent proposes with the propose-graph tool to become a pending change in `graphs/`, valid for the Graph runner, so that I can review it and then open it on the canvas.
31. As an author, I want the agent never to start a recipe run, so that the canvas stays the one place where recipes run.
32. As an author, I want a grounding check to run automatically after any draft, so that unsupported facts are caught without my asking.
33. As an author, I want each claim in a draft marked supported, weak or unsupported, so that I know which sentences need work.
34. As an author, I want each supported or weak verdict to cite the passage from `sources/` it relied on, so that I can check the judgement myself.
35. As an author, I want an invented statistic flagged unsupported, so that a made-up number never slips into my book.
36. As an author, I want to run the grounding check on any draft on demand, so that I can check my own prose and older drafts too.
37. As an author, I want the latest grounding result for a draft kept in the project, so that the unsupported-claims preflight in Compile & export can read it later.
38. As an author, I want grounding badges that use text and icons as well as colour, so that I can read them in sunlight on a phone and without colour vision.
39. As an author, I want a summary line on each draft card ("3 supported · 1 weak · 1 unsupported"), so that I see the state at a glance and expand only when needed.
40. As an author, I want web search and page fetch off until I switch them on, so that nothing leaves my machine unless I decide it should.
41. As an author, I want fetched web pages kept out of grounding until I save them into `sources/` through a pending change, so that only material I've vetted can support a claim.
42. As an author, I want page fetch to refuse my local network, tailnet and the host's services, so that a hostile page can't steer the agent into my private network.
43. As an author, I want the agent to assemble, check and export my manuscript on request, so that "run the preflight and tell me what's wrong" works from the chat.
44. As an author, I want every agent run written to a transcript in `logs/`, so that I can audit what happened, in plain files I can open anywhere.
45. As an author, I want transcripts to show project-relative paths and never keys, so that sharing a log doesn't leak my machine layout or my secrets.
46. As an author, I want my chat history to carry across agent runs and devices, so that a follow-up question on the phone builds on what I asked on the Mac.
47. As an author on a phone, I want the chat panel, tool-call cards, stop button and grounding badges to fit one column and stay usable with the keyboard open, so that I can drive the agent from anywhere.
48. As an author on a phone that slept, I want the chat to catch up with the agent run on wake, so that I see where it is now, not where it was.
49. As an author with two devices open, I want both to show the same agent run live, so that I can start on the Mac and watch from the couch.
50. As an author, I want a second intent while an agent run is active refused clearly, so that two agent runs never write over each other in one project.
51. As an author, I want a clear message when no model provider is configured or reachable, so that I know to fix the provider settings rather than wait.
52. As a module developer (Shell, Project store), I want the agent stream events published as contract types, so that the chat UI and other consumers compile against one source of truth.
53. As a module developer (Compile & export), I want the grounding result shape published as a contract, so that the preflight can read claims artefacts without calling the Agent loop.
54. As a test author, I want the loop to run against the mock OpenAI server, so that CI covers a normal tool-call turn, a malformed turn and a grounding check without a real model.

## Implementation Decisions

### Shape of the module
- One NestJS `@Module` in `apps/api` and one lazy Angular `Routes` array in `apps/web`, both owned by this module. API routes live under `/api/agent-loop/…`; the chat UI is the project-scoped route `/projects/:projectId/chat` (minimum class `phone`). The API uses Setup & auth's guard on every route. GET never changes state.
- The loop depends on the Model providers client interface, the Project store file, search and pending-change API, the Tool registry list/get/execute API, and later the Compile & export API. It **never calls the Graph runner and is never called by it**.

### The loop
- **Start.** `POST` start-agent-run with `{intent, conversationId?}` returns `{runId, conversationId}` straight away. Everything else arrives over SSE. The agent run is bound to the project that was active when it started.
- **One active agent run per project.** A second start returns the error code `AGENT_RUN_ACTIVE`. An agent run and a recipe run may run at the same time; they don't know about each other.
- **Messages sent each step:** a fixed system prompt (role, confinement, "writes become pending changes", "cite sources with `[@id]`"), the project summary, the conversation so far, and the tool schemas for the families that are currently on. The **project summary** is built by this module at run start from the Project store: the project's title and genre pack (project list) and, for each top-level folder, its file count (file list). It is plain text in the system message, not a contract shape.
- **Model.** The Model providers client resolves the per-project override or the app default. Transport retries live in that client. The loop adds none.
- **Step.** One model call is one step. If the reply contains tool calls, the loop runs them in the order given, one at a time, appends each result and takes another step. A reply with text and no tool calls ends the agent run with reason `completed`.
- **Step cap.** Default 12, an app setting. Reaching it emits `step-cap-reached` and ends the agent run with reason `capped`. "Continue" starts a new agent run in the same conversation with a fresh cap.
- **Stop.** `POST` stop-agent-run aborts the in-flight model call and any tool still running, then ends the agent run with reason `stopped`. Stopping twice is a no-op.
- **Project switch.** The module registers with the Project store's in-process `onProjectSwitched` hook. A switch stops the old project's agent run with reason `project-switched`. Its pending changes are still created, in the project the run was bound to (the Project store allows propose into a non-active project).
- **Errors.** No provider configured → `AGENT_NO_PROVIDER` before the agent run starts. A provider failure after the client's retries ends the agent run with reason `error` and a readable message. Error codes follow Platform's convention.
- **Conversation history.** A conversation is the sequence of agent runs sharing a `conversationId`. It is rebuilt from the transcripts in `logs/`, so any device can continue it. When the history exceeds the provider's `contextSize`, the oldest tool results are shortened first, then the oldest turns are dropped. The current intent and the system prompt are always kept.

### Tool families and names
- **Built-in function names are reserved:** `list_files`, `read_file`, `write_file`, `edit_file`, `search_notes`, `check_grounding`, `web_search`, `fetch_page`, `assemble_manuscript`, `run_preflight`, `export_manuscript`. A registry tool that clashes with one is left out of the agent's tools and reported once in the transcript.
- **Project tools** call the Project store file API with project-relative paths only. The Project store enforces path safety, so the loop never builds absolute paths. `search_notes` uses the Project store search contract (`query → ranked passages {path, offset, snippet, score}`).
- **Narrative tools** are the registry's *enabled* tools, using the registry's model function schema (`x-scriba-*` keys stripped). The tool list is read at the start of each agent run, so enabling or disabling a tool takes effect on the next agent run.
- **Research tools** are only in the tool list when research is switched on.
- **Compile tools** are only in the tool list once the compile-tools phase lands. They are read and produce only: assemble, preflight and export. Reorder (which writes `project.yaml`) and snapshot restore are not agent tools.
- **Built-in tool argument schemas** are JSON Schema, Ajv-validated, with the same readable-error format as registry tools.

### Validation and retries
- The Tool registry validates narrative tool arguments with Ajv. The loop validates built-in tools, and also catches arguments that aren't parseable JSON.
- A validation failure goes back to the model as the tool result: one line per problem (`<argument path>: <what is wrong>`), followed by a short summary of the expected arguments. The card shows the same text and the attempt number.
- **Two retries.** The count is per tool per agent run, for consecutive invalid calls. On the third consecutive invalid call to the same tool, the loop answers "this tool is unavailable for the rest of this agent run" and drops it from the schemas for the remaining steps. A valid call resets the count. Unknown entity IDs and edit-text mismatches count as validation failures.
- Retries count towards the step cap. The cap is the only hard limit.

### Entity resolution, citations and provenance
- Before executing a narrative tool, the loop finds every argument the tool spec marks as an entity or style reference (`x-scriba-type`). It resolves each ID through the Project store's entity reference type and file API, and passes the contents to the registry's executor. The registry template stays pure.
- The registry returns `{output, sourcesUsed}`. The loop records the citations: the entity IDs passed and the `sourcesUsed` paths.
- **Draft provenance** (contract shape): `{runId, toolCallId, tool, entityIds, sourcesUsed, model, at}`. It is attached to the pending change the output becomes (its origin is an agent run) and written to the transcript. Provenance is **not** injected into the draft's Markdown, because scene files need no front matter and Compile reads drafts as they are. Tracing a draft back means reading the pending change, the accepted version's record, or the transcript.

### Writes and output routing
- `write_file` and `edit_file` never write to disk. Each agent run keeps a **run overlay**: the proposed content per path. Later `read_file` calls in the same agent run see the overlay, so the model sees its own edits.
- The **captured base** for a path is the on-disk content the first time the agent run reads or writes that path.
- `edit_file` takes exact old text and new text. The old text must occur exactly once in the overlay or on-disk content, otherwise the model gets a readable error.
- **When the agent run ends**, for any reason including stop, cap, error and project switch, the loop calls the Project store's in-process `propose` once per touched path, with the overlay content, the captured base, origin `{kind:'agent-run', runId, toolCallId?}` (the tool call that last wrote the path), the draft provenance in `provenance`, and, for paths in `drafts/`, the grounding summary in `grounding`. The Project store computes the diff. Then the loop emits `run-ended` with the pending change IDs. The Project store's three-way check handles host edits made in the meantime.
- **A narrative tool's output kind sets its routing** (output enum `draft | entity | claims | graph | check`):
  - `draft` → the overlay at the path the model gave in an optional `target` argument (the loop adds it to the function schema of tools whose output writes a file; it must sit in the kind's folder), or else a new file `drafts/<tool-name>-<yyyymmdd-hhmm>.md` (UTC; `-2`, `-3`, … on collision). A grounding check follows (see below).
  - `entity` → the overlay in `entities/`, same `target` rule (default `entities/<tool-name>-<yyyymmdd-hhmm>.md`).
  - `graph` → validated against the Graph runner's graph file schema. If valid, the overlay in `graphs/`, which becomes a pending change aimed at `graphs/`. If invalid, a validation error to the model, with the same retries.
  - `claims` → a claims artefact (same shape as a grounding result), shown as a card.
  - `check` → shown as a card only, with no file.
- `logs/` is the one place the loop writes directly, through the Project store's in-process helpers (`appendLog` for transcript lines, `write` for claims artefacts): transcripts and claims artefacts are the app's own records, not book content.

### Grounding check
- **When it runs.** As a built-in step after any draft: every `draft` tool output, and every path in `drafts/` that the run overlay touched. It runs before the pending changes are created when the agent run ends. It also runs on demand: through `check_grounding(path)` for the model, and a "Check grounding" action in the UI that starts an agent run whose only step is the check. Grounding model calls don't count towards the step cap, but stop cancels them.
- **Steps.**
  1. **Extract:** one model call with a fixed prompt returns the draft's factual claims as JSON, each with its text and character span. The loop validates it, with the same two retries.
  2. **Retrieve:** for each claim, the Project store search returns the top passages, filtered to `sources/`.
  3. **Judge:** one model call per batch of claims judges each claim `supported | weak | unsupported` against its passages. Supported and weak verdicts must cite one of the retrieved passages `{path, offset, snippet}`. A verdict that cites a passage outside the retrieved set is downgraded to `unsupported`. A claim with no retrieved passages is `unsupported` without asking the model.
- **Result** (contract shape): `{schemaVersion: 1, targetPath, contentHash, checkedAt, runId, claims: [{text, span: {start, end}, verdict, passage?: {path, offset, snippet}, reason}]}`. `contentHash` uses the Project store's `sha256:<hex>` format over the checked text (the overlay content for a draft the run proposed, otherwise the file on disk).
- **Delivery:** a `grounding-result` SSE event, a section in the transcript, and the **claims artefact**: the latest result per draft, written as JSON to `logs/grounding/<targetPath>.json` (for example `logs/grounding/drafts/ch01.md.json`) and overwritten by each check. The path rule is a contract constant. The content hash lets readers such as Compile & export's unsupported-claims preflight tell whether a result is stale, without calling the Agent loop.
- A draft's pending change carries its grounding summary (`{supported, weak, unsupported, checkedAt}`) in the Project store's `grounding` field, so the review queue can show it.
- Fetched web pages and entities are **not** evidence. Only `sources/` grounds a claim.

### Research tools (off by default)
- The `agent.research.enabled` setting defaults to false. When it is false, the research tools are not in the tool list, so the model never sees them.
- `web_search(query)` calls a configured **SearXNG-compatible JSON endpoint** (`GET <endpoint>?q=<query>&format=json`, reading `results[].{title, url, content}`), with no key. The setting `agent.research.searchEndpoint` has no default: `web_search` is offered only when research is on **and** an endpoint is set. Keyed search APIs are out of scope for v1.
- `fetch_page(url)` is offered whenever research is on. It allows only http(s). It refuses loopback, link-local, private ranges, the tailnet CGNAT range, `host.docker.internal`, and any name that resolves to them, checked after every redirect. It caps size and time, and returns readable text. Fetched text is marked untrusted data in the tool result.
- To keep fetched material, the agent writes it into `sources/` with `write_file`, which becomes a pending change. Only then can it ground a claim.

### Compile tools (M7, in v1)
- `assemble_manuscript`, `run_preflight` and `export_manuscript` call the Compile & export API (manuscript view model, preflight request/result, export request/result). Compile & export reads only the story graph's `order` edges and never runs a graph, so the "loop never calls the runner" rule holds through this family too.
- They come last because they need Compile & export's implementation (M5), and the M5 demo doesn't need them.

### Streaming and run state
- **SSE events** are published under Platform's envelope `{module: 'agent-loop', type, data}`. Each `data` carries `runId` and a per-run, increasing `seq`. Event types:
  - `run-started`
  - `token-delta`
  - `tool-call-started` (callId, name, family)
  - `tool-call-args` (final, validated or raw arguments)
  - `tool-call-result` (summary, output, optional diff preview, sources used)
  - `tool-call-error` (message, attempt, withdrawn?)
  - `grounding-started`
  - `grounding-result`
  - `step-cap-reached`
  - `run-ended` (reason `completed | stopped | capped | error | project-switched`, pending change IDs)
- **Current-run-state** (GET) returns the project's active agent run, or the most recent finished one. It includes status, step and cap, the accumulated assistant text, the cards with their state, the grounding results so far, and `lastSeq`. A client that reconnects fetches it, replaces its view, and then applies only events with `seq > lastSeq`.
- **Conversation history** (GET, from the transcripts) gives the chat panel past turns on any device.

### Transcripts
- One JSON Lines file per agent run at `logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl` (UTC start time). Each line is a transcript entry (contract shape): `{schemaVersion, at, runId, conversationId, seq, kind, data}`. Its `kind` is one of `intent`, `step`, `assistant-text`, `tool-call`, `tool-result`, `tool-error`, `grounding`, `pending-change`, `run-end`.
- Paths are project-relative. Keys and auth headers are never written. Very long tool results are truncated, with a marker and the original length.
- `logs/` stays the source of truth. A run-log index is deferred. The samples ship without `logs/`.

### Settings
- The agent settings are the step cap (default 12), research on/off (default off) and the search endpoint (default unset). They live in the `agent` section of `settings.yaml`, shaped `{schemaVersion: 1, stepCap, research: {enabled, searchEndpoint?}}`, registered with Platform's startup hook, and are edited from a settings sheet in the chat panel (GET and POST under `/api/agent-loop/settings`). Per-tool enable switches belong to the Tool registry.

### UI: chat panel
- A lazy route with the conversation list, the message stream, the intent box, the stop button and the step counter. On desktop it can also dock beside the editor, if the Shell's layout offers a slot.
- **Tool-call cards** use the Shell's shared tool-call card. This module supplies the per-family bodies: arguments, result, error with the attempt number, sources-used links, and a write preview through the Shell's shared diff view.
- **Grounding badges:** a summary chip per draft, which expands to a per-claim list. Each claim shows the verdict as text plus an icon plus a colour, the claim text, and the cited passage with a link to open the source file.
- **Phone** (Shell breakpoint gate): one column, cards collapsed to a single line by default, a stop button and intent box that stay reachable with the keyboard open, and tap targets of at least 44 px. Reconnect runs on `visibilitychange` and when the EventSource reopens.
- At `run-ended`, a link takes the author to the review queue (Project store) filtered to that agent run's pending changes: `/projects/:projectId/review?run=<runId>`.

### Sample content
- At M3 this module adds the **grounding-claims draft** to the nonfiction sample. It is a short draft in `drafts/` whose claims the sample's `sources/` support, weakly support and don't support. At least one claim is an invented statistic that appears in no source. One grounding check shows all three verdicts.
- The module also adds the matching scripted turns to `e2e/fixtures/mock-openai/` (extract and judge), in the same PR, because sample paths are a contract with the mock.

## Phases

Serial. Each phase starts only after the previous one closes, plus the gates listed.

M1 to M7 are the build milestones, in order: M1 walking skeleton, M2 tool registry, M3 review and grounding, M4 canvas, M5 compile and export, M6 fiction pack, M7 remaining tools and polish.

### `phase:contract` (M1)
**Gate:** Platform `phase:scaffold`; Project store `phase:contract` (file and entity reference types, passage shape, hash format).
**Scope:**
- Publish `@bbartolome/scriba-contracts/agent-loop`:
  - the start-agent-run request and response, and the stop request;
  - the agent stream event members (as listed above) under the Platform envelope, and the current-run-state shape;
  - the grounding result and claims artefact shape, and the claims-artefact path rule (`logs/grounding/<targetPath>.json`);
  - the transcript entry format;
  - draft provenance;
  - the agent settings shape;
  - route constants, error codes (`AGENT_RUN_ACTIVE`, `AGENT_NO_PROVIDER`, `AGENT_NO_ACTIVE_PROJECT`, `AGENT_RUN_NOT_FOUND`), the run-end reason enum and the reserved built-in tool names.

**Acceptance:**
- [ ] The slice exports Zod schemas and inferred TS types for every shape above, with no runtime logic beyond schemas and constants.
- [ ] Each event schema parses one valid and rejects one invalid example in contract tests.
- [ ] The Shell, Project store and Compile & export can import the slice from its subpath.

### `phase:file-tools-chat` (M1)
**Gates:**
- Model providers `phase:client` and Project store `phase:files` (implementation; M1 needs them running);
- Setup & auth `phase:token-guard`;
- Shell `phase:core` and `phase:shared-components` (tool-call card).

**Scope:**
- The loop: start, steps, text ends the agent run, step cap, stop, one active agent run per project, project-switch stop.
- `list_files` and `read_file`.
- SSE streaming of tokens and cards.
- Current-run-state.
- Transcripts in `logs/` and conversation history.
- Readable errors and two retries for built-in tools.
- Chat panel UI with tool-call cards, stop button and step counter, working on phone.
- The mock-openai script for the "summarize my outline" turn.
- The "agent run" step of the Platform-owned Playwright e2e.

**Acceptance:**
- [ ] **Done when** the author types "summarize my outline" in the nonfiction sample and gets a correct answer with visible tool calls.
- [ ] With the mock server set to loop, the agent run ends at step 12 with `step-cap-reached` and `run-ended: capped`.
- [ ] Stop ends an agent run within one second of the POST, with `run-ended: stopped`.
- [ ] A path outside the project is refused and the refusal shows as a card error.
- [ ] The mock's malformed turn produces two readable errors, then the tool is withdrawn.
- [ ] Reloading the page mid-run restores the same text and cards from current-run-state.
- [ ] A transcript file in `logs/` matches the contract entry schema.

**Demo (under 5 minutes):**
1. Start from the nonfiction sample.
2. Type "summarize my outline" and watch the `list_files` and `read_file` cards appear and the answer stream in.
3. Open the same chat on a phone and see the same conversation.
4. Start "read every file twice" and press stop.
5. Open `logs/` and show the transcript.

### `phase:narrative-tools` (M2)
**Gates:**
- Tool registry `phase:contract` and `phase:executor` (which includes the loader and catalog);
- Genre packs nonfiction workhorses and nonfiction `entities/` (for the demo);
- Project store `phase:search` (for `search_notes`).

**Scope:**
- Load the enabled registry tools as functions, and handle reserved-name clashes.
- Resolve entity and style IDs and record citations from `sourcesUsed`.
- Build draft provenance.
- Show registry Ajv errors in the readable format, with the retry policy.
- `search_notes`.
- Cards that show the sources used.
- At this milestone, `draft` outputs are shown in the chat with their provenance. They become pending changes in the next phase.

**Acceptance:**
- [ ] **Done when** each of the four workhorses (cold open, mystery question, myth-buster, numbers-to-people), called by the agent from an intent, produces a draft that cites its source files.
- [ ] A disabled tool is absent from the model request (asserted on the mock server's received request).
- [ ] An unknown entity ID returns a readable error and counts as a retry.
- [ ] Every draft's card and transcript entry carry provenance (entity IDs and tool run).

**Demo (under 5 minutes):** Ask "draft a cold open about the person in my notes on the 10,000 hour idea". Show the card's entity IDs and sources used. Disable myth-buster in the registry, ask for one, and show the agent can't call it.

### `phase:pending-writes` (M3)
**Gates:**
- Project store `phase:pending-review`;
- Graph runner `phase:contract` (graph file schema);
- Shell diff view (`phase:shared-components`).

**Scope:**
- `write_file` and `edit_file` with the run overlay and captured base.
- Pending changes created when the agent run ends, for any reason.
- Output routing for `draft`, `entity`, `graph`, `claims` and `check`, with the optional `target` argument.
- Graph validation against the Graph runner schema.
- Diff previews on cards, and the link to the review queue.
- The "accept change" step of the e2e, with the Project store.

**Acceptance:**
- [ ] No agent write changes a file on disk before the author accepts it (asserted on disk).
- [ ] Two edits to one file in one agent run yield one pending change against the first captured base.
- [ ] A stopped agent run still creates its pending changes.
- [ ] Propose-graph output becomes a pending change aimed at `graphs/` that parses with the Graph runner schema. An invalid graph returns a readable error.
- [ ] The e2e accepts an agent-made change and sees it in the draft.

### `phase:grounding` (M3)
**Gates:** Project store `phase:search`; `phase:pending-writes`.

**Scope:**
- Extract → retrieve → judge, built in after any draft and on demand (`check_grounding` and the UI action).
- The `grounding-result` event, the claims artefact in `logs/`, and the grounding summary on the pending change.
- Grounding badges in the UI, working on phone.
- The grounding-claims draft in the nonfiction sample, and its mock-openai script.

**Acceptance:**
- [ ] **Done when** an invented statistic in a draft is flagged as unsupported.
- [ ] A check of the sample grounding-claims draft yields at least one claim of each verdict, and every supported or weak verdict cites a retrieved `sources/` passage.
- [ ] A verdict citing a passage that was not retrieved is downgraded to `unsupported`.
- [ ] The claims artefact matches the contract and carries the draft's content hash.
- [ ] Badges render with text labels at phone width.

**Demo (under 5 minutes):** Start from the sample and open the grounding-claims draft. Tap "Check grounding" and watch claims get their badges, with the invented statistic marked unsupported. Expand a supported claim and open its cited source. Ask the agent to draft a paragraph, and see the check run on its own.

### `phase:research` (M7)
**Gate:** `phase:grounding`.

**Scope:**
- The research setting (off by default) and the search endpoint setting.
- `web_search` and `fetch_page` with the network refusals and size and time caps.
- Saving fetched material into `sources/` through pending changes.

**Acceptance:**
- [ ] With the setting off, the model request contains no research tools.
- [ ] With it on, a search and a fetch run against a local test server.
- [ ] Fetching loopback, private, tailnet or `host.docker.internal` addresses is refused, including after a redirect.
- [ ] Fetched text never appears as grounding evidence until it is accepted into `sources/`.

### `phase:compile-tools` (M7)
**Gate:** Compile & export `phase:assembly-preflight` and `phase:export` (implementation).

**Scope:** `assemble_manuscript`, `run_preflight` and `export_manuscript` through the Compile & export API, with result cards.

**Acceptance:**
- [ ] "Run the preflight" returns the five checks as a card.
- [ ] An export started by the agent produces the same result as one started from the manuscript view.
- [ ] No agent tool starts a recipe run or calls the Graph runner.

## Contracts

**Produces: `@bbartolome/scriba-contracts/agent-loop`** (in `phase:contract`)
- The chat/intent request (`{intent, conversationId?}`), the start-agent-run response (`{runId, conversationId}`) and the stop request.
- Agent stream events under the Platform envelope (`module: 'agent-loop'`):
  - `run-started`
  - `token-delta`
  - `tool-call-started`, `tool-call-args`, `tool-call-result`, `tool-call-error`
  - `grounding-started`, `grounding-result`
  - `step-cap-reached`
  - `run-ended` (reason enum)
- The current-run-state shape (including `lastSeq`) and the conversation-history shape.
- The grounding result and claims artefact: a claim with `supported | weak | unsupported` and the cited passage `{path, offset, snippet}`, plus the target path and the content hash.
- The transcript entry format in `logs/`.
- Draft provenance: `{runId, toolCallId, tool, entityIds, sourcesUsed, model, at}`.
- Agent settings (step cap, research on/off, search endpoint).
- Route constants, error codes, and the reserved built-in tool names.

**Consumers:**
- Frontend shell, which carries the events on its SSE client.
- Project store, which shows provenance and the grounding summary on pending changes.
- Compile & export, which reads claims artefacts for the unsupported-claims preflight.
- Platform, whose e2e uses the agent run step.

**Consumes:**
- Platform `/platform` (`phase:scaffold`): the SSE envelope, error shape and convention, `SCRIBA_*` names, and the API composition root, Playwright harness and mock OpenAI server, which this module extends.
- Setup & auth `/setup-auth` (`phase:contract`, plus `phase:token-guard`): the guard on every route.
- Model providers `/providers` (`phase:contract`, plus `phase:client` for M1): the client interface, the resolved per-project or default model, and `contextSize`.
- Project store `/project-store` (contract; file API at M1, search at M2, pending changes at M3):
  - the project list (title, genre pack) and active project, and the in-process `onProjectSwitched` hook;
  - the file API (list, read);
  - project-relative path, file reference and entity reference types;
  - the search contract;
  - the pending change (target path, diff, captured base, origin agent run, `provenance`, `grounding`, status) and the in-process `propose` operation;
  - the in-process `appendLog` and `write` for `logs/`;
  - queue-update events, to refresh the review link.
- Tool registry `/tool-registry` (contract; execution at M2): tool list/get (enabled only), the model function schema, the `x-scriba-*` vocabulary (to find entity and style references), the output enum, tool execution `{output, sourcesUsed}` and its Ajv error details.
- Graph runner `/graph-runner` (contract only, M3): the graph file schema, to validate `graph` outputs. There is no runtime call.
- Compile & export `/compile-export` (contract plus implementation, M7): the manuscript view model, the preflight request/result and the export request/result.
- Frontend shell (UI APIs, not contracts): the shared tool-call card, the diff view, the breakpoint gate, the API and SSE clients, and the lazy route registration.

## Testing Decisions

- **Good tests** exercise external behaviour only: HTTP responses, SSE events, files on disk and the requests the mock model receives. They never test the loop's internal services or private message-building helpers.
- **Primary seam: the running API.** Boot the composed NestJS app, or this module imported into a test app with its real neighbours, against a temp library folder and the mock OpenAI server (`e2e/fixtures/mock-openai/`). Scripted turns cover:
  - a normal list → read → text turn;
  - a malformed-arguments turn;
  - an endless tool-call loop (step cap);
  - a slow stream (stop);
  - a narrative tool call with entity IDs;
  - write and edit calls;
  - a propose-graph call with a valid and an invalid graph;
  - grounding extract and judge turns.
- **Assertions at that seam:**
  - SSE events in `seq` order that match the contract;
  - the mock's received request (tool list, with research and disabled tools absent);
  - pending changes listed by the Project store, with untouched files on disk;
  - transcript lines in `logs/` that match the transcript schema;
  - claims artefacts;
  - current-run-state mid-run;
  - `AGENT_RUN_ACTIVE` on a second start.
- **Research tests** run against a local HTTP server and a local SearXNG-shaped stub, never the internet. The network-refusal cases include a redirect into a refused range.
- **UI seam:** the chat panel's lazy route, rendered with Angular's Vitest runner against a fake API and SSE client built from the contract types. Cases:
  - tokens append;
  - cards move from started to result or error;
  - stop appears only while an agent run is active;
  - a reconnect replaces the view from run-state and ignores events at or below `lastSeq`;
  - grounding badges show text labels;
  - the phone breakpoint shows one column with collapsed cards.
- **Contract seam:** Zod schemas in the slice, with valid and invalid examples per event. CI validates `examples/` against contracts. The grounding-claims draft is plain Markdown and needs no schema, but its paths are part of the mock-script contract.
- **System seam:** this module extends the Platform-owned Playwright e2e with the "agent run" step at M1 and, together with Project store, the "accept change" step at M3.
- **Real models:** a manual eval script runs the tool-calling loop against a small local model and a larger one. It records which failure modes the retries handled. It is not part of CI.
- **Prior art:** none in the repo yet. Vitest throughout, with NestJS via `unplugin-swc`.

## Out of Scope

- Executing tools: the Tool registry renders templates and calls the model. Path safety, the three-way check, applying pending changes and draft versions: the Project store. The review queue UI: the Project store. The tool-call card and diff view components: the Frontend shell.
- Starting, stopping or watching recipe runs, or any call to or from the Graph runner. The agent only creates graph pending changes.
- Per-tool model choice, native provider adapters and vector/semantic search (later work).
- A run-log index over `logs/` (deferred).
- Promoting grounding verdicts into Claim entities automatically. The author can ask the agent to write Claim entities, which become pending changes.
- Agent tools for reorder, snapshot create or restore, or settings changes.
- Parallel tool calls, sub-agents, and more than one active agent run per project.
- Grounding against web pages or entities. Only `sources/` is evidence.
- **Settled choices that replace earlier plans:**
  - Tool inputs use JSON Schema validated with Ajv, replacing an earlier Zod plan.
  - The frontend is Angular and the backend is NestJS, replacing an earlier React and Fastify plan.
  - Story structure is not kept in a `structure/` folder, replacing the earlier plan to keep the outline, chapters, scenes and plot beats there. Chapters and scenes are Markdown files in `drafts/` (one chapter file may hold several scenes). A beat is a story-graph node, label-only by default or pointing at a whole file in `drafts/`. Manuscript order comes from the `project.yaml` order field or the story graph's `order` edges.
  - The canvas has no Gate node, replacing an earlier grounding gate node. Grounding is a built-in step of the loop.
  - A run-log index is deferred, replacing an earlier plan for a SQLite run-log index. `logs/` is the source of truth.
  - Agent writes go through pending changes in any folder, replacing an earlier rule that covered only `drafts/`. The author's own typing still saves directly.

## Further Notes

- **Glossary.** **Run** (recipe run) means one execution of a recipe. This spec therefore always says **agent run** for one pass of the loop, and never uses bare "run" for it. In code, the module's identifiers may use `run` (for example `runId`) because they are already scoped to the `agent-loop` module.
- **Phase ordering versus the milestones.** M3 is split into `phase:pending-writes` and `phase:grounding`. Writes can't exist before the Project store's `phase:pending-review` (M3), and at M1 the Project store has read and write only. So M1 ships only `list_files` and `read_file`, and M2 shows drafts in the chat until M3 routes them to pending changes.
- **Compile tools are in v1 but land at M7**, after research. They need Compile & export's implementation (M5) and aren't part of any earlier milestone demo.
- **Provenance location** is a deliberate choice: on the pending change and in the transcript, not in draft front matter. If the author later wants it in the file, an optional front-matter block can be added in an expand–contract change.
- **The claims artefact lives in `logs/`** so that Compile & export's preflight can read it as a file, with no Agent loop dependency. The Compile & export spec should consume the grounding result shape from this slice.
- **Search backend for research** is settled: a SearXNG-compatible JSON endpoint the author configures. No endpoint ships by default.
- **Fetched pages and prompt injection.** Fetched pages are untrusted. Even if one steers the model, every resulting write still needs the author's acceptance, and grounding never trusts them.
