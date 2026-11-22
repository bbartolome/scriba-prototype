# Documentation summaries

Each summary is the raw output of a local model run through `opencode run`, one file per fresh session. Summaries are unedited.

## Status

- Status: complete
- Files in scope: 442 (all tracked `.md`, `.txt`, `.adoc`, `.rst`, `.mdx` files, excluding `apps/api/test/fixtures/` and `examples/` sample manuscripts)
- Processed: 442 / 442
- Summarized: 439
- Failed or empty: 3 (timed out at 300 s with no output: plans/PST-04.md, plans/SHL-09.md, units/PST-06-file-api-core.md)
- Wall-clock elapsed: 06h 08m 49s (22129 s), from the first file to completion, including a pause
- Summed model time: 05h 49m 28s (20968 s)

## Notes on this run

- The first pass ran with `--auto`, which auto-approved tool calls. The model wrote `plans/GNP-15.md` and three `apps/api/src/modules/setup-auth/` files into the worktree during the runs for `plans/GNP-15.md` and `plans/SAU-04.md`. Those writes were reverted and quarantined outside the repo, and the worktree was restored to a clean `ea79a31`.
- The run was paused, then resumed from `plans/SAU-12.md`, with no `--auto` and a scratch working directory outside the repo. `plans/GNP-15.md` and `plans/SAU-04.md` were summarized again in that resumed pass, and their latest rows replace the earlier ones.

## Files and summaries

### `README.md`

_exit 0, 34s_

Scriba is a monorepo containing an Angular web app, a NestJS API, shared contracts, and genre packs. It can be set up with a single Docker command that installs, updates, and rolls back the stack, with recovery procedures for tailscale and setup tokens. Adding a module involves updating contract slices, API modules, routes, events, errors, settings, and tests. Security is limited to a single owner controlling tailscale via a shared socket.

### `deploy/RUNBOOK.md`

_exit 0, 31s_

The runbook outlines smoke tests for the Scriba application covering ST‑1 (late login with HTTPS Serve), ST‑2 (SSE streaming over HTTP/2), ST‑3 (host Ollama access), and SAU‑21 (socket permissions and tailnet connectivity). It details prerequisites, Docker commands, and validation criteria for each test, including health checks, login flows, and network connectivity verification. A pre‑release checklist tracks the status of each test across different environments.

### `deploy/installer-hint.txt`

_exit 0, 38s_

Scriba is a monorepo containing an Angular web app, a NestJS API, shared contracts, and genre packs. It is installed and updated with a single Docker command, and provides procedures for running, stopping, rolling back the stack, and recovery via a setup URL and token. Adding a module involves creating a contract slice, composing an API module, defining routes and events, registering settings, and writing tests. The project notes that tailscale is controlled through a shared socket for security.

### `docs/RELEASING.md`

_exit 0, 33s_

The Scriba project uses a GitHub Actions workflow with five jobs (plan, build, smoke, merge, release) to build multi‑architecture Docker images, test them, and publish releases based on Conventional Commits. It requires Docker Hub credentials, bakes version information into the image, and tags latest, sha‑<short>, and semver releases. The process includes PR title and CI checks, and has procedures for handling cancelled or failed runs to avoid losing releases.

### `docs/adr/0001-tailscale-serve-mechanism.md`

_exit 0, 26s_

An ADR details the Tailscale Serve mechanism failure with Variant A using a JSON config file due to late login timing, and the successful implementation of Variant B using a CLI loop that starts Serve after IP detection. Variant B passed all post-approval checks and is now the shipped solution. The change updates compose configuration and includes additional considerations for network namespace handling and tailnet filtering.

### `docs/adr/0002-form-renderer-spike.md`

_exit 0, 36s_

The TRG-05 spike gate verified that the form renderer displays a tool in both form and node-body layouts with functional validation, filtering, and drag-to-drop in the dev preview, and that the fixture conforms to the HINT_KEYS vocabulary. Drag start triggers enter predicates that can shift pickers and invalidate cached positions, though cross‑browser, touch, and edge‑case behavior remains untested. Consequently, HINT_KEYS stays unchanged, tools routes and preview pages are retained, and ToolForm inputs are not modified.

### `docs/adr/0003-typst-pdf-spike.md`

_exit 0, 16s_

The ADR documents a spike evaluating Typst 0.15.1 for PDF exports, testing 13 rendering criteria including headers, footnotes, quotes, and international characters. All checklist items passed except for a CJK font missing issue in the pinned image, which was acceptable per the evaluation criteria. The decision is to continue using Typst for PDF exports while addressing the CJK font follow-up.

### `modules/agent-loop.md`

_exit 0, 213s_

The agent loop is a tool‑calling engine that iterates recipe runs, generates pending changes, and runs grounding checks using only `sources/` evidence. It follows a dependency graph with parallel phases for file tools, narrative, grounding, research, and compile&export, reserves built‑in tool names, and limits writes to `logs/`. External behavior is tested via a composed app with mocks, while internal services and the graph runner remain out of scope.

### `modules/compile-export.md`

_exit 0, 50s_

The compile-export module compiles markdown drafts into a manuscript by ordering files, running model-free preflight checks, and exporting to multiple formats via Pandoc and Typst. It features a modular API, controlled file access, snapshot management, and parallel processing stages. The design emphasizes separation of concerns, testable seams, and clear scope boundaries.

### `modules/genre-packs.md`

_exit 0, 25s_

Genre packs is a content module delivering three built-in packs (core, nonfiction, fiction) with validated tool specs and entity schemas via the Tool registry. It defines standards for tool prompts, inputs, and entity types including source, style, person, claim, concept, character, place, and world rule. The system uses phased gates for development and deploys packs as read-only assets, with original content under the repository's license.

### `modules/graph-runner.md`

_exit 0, 24s_

The Graph runner module provides an `ngx-vflow` canvas for story graphs and runnable recipes, featuring graph CRUD, validation, and a sequential run engine. Operating in `phase:engine` and `phase:canvas`, it uses a dependency graph (GRR-01 through TRG-17) with parallel processing stages. The implementation focuses on single HTTP APIs, centralized validation, pending changes for outputs, and follows specific testing principles while excluding story graph execution and parallel branch running.

### `modules/platform.md`

_exit 0, 72s_

Platform wave 0 is the foundational layer that owns shared components such as workspace, contracts package, API composition root, SSE stream, test harness, image, compose, installer, and CI/publishing. It maps dependencies among platform tasks (PLT-01 through PLT-19), describes parallelism phases, settled decisions, and items out of scope. Testing uses Vitest and focuses on external behavior, with prior art from other repositories referenced.

### `modules/project-store.md`

_exit 0, 67s_

The Project store module manages the author's books on disk, implementing file API, entity resolution, search, pending‑change tracking, and UI components through a series of gated units (PST‑01 to PST‑23) that run in parallel where dependencies allow. It enforces cross‑cutting concerns such as path safety, active‑project rules, and atomic writes, and exposes operations via a NestJS provider while testing uses temporary folders and fake APIs. Scope excludes scene/beat folders, multi‑project and cloud sync, and certain integrations, while settled decisions define version paths, sample handling, and environment variables.

### `modules/providers.md`

_exit 0, 21s_

The providers module enables 'talk to a model' functionality with openai-compatible providers, an in-process streaming client, registry, and Ollama seeding. It manages configuration via settings.yaml, secure secrets, and model resolution (project override → app default → provider model) using a dependency graph for parallel development. The implementation includes UI components and connection testing while deferring native adapters, with testing focused on HTTP interactions and mock servers.

### `modules/setup-auth.md`

_exit 0, 23s_

The Setup & Auth module delivers a reusable setup token and handshake that creates a stateless loopback cookie and Tailscale Serve identity, paired with a default‑deny global guard, `/setup` wizard, settings page, owner allowlist and related integrity checks. It is organized into sequential phases (token‑guard then tailnet) with a clear dependency graph enabling parallel work after key milestones, and is implemented as a single vertically scoped API + web feature set that exports in‑process providers while focusing on external HTTP behavior. Current development has not yet executed real‑tailnet socket checks or browser secure‑flag tests, and out‑of‑scope items such as user accounts, auto‑update, and Tailscale userspace mode are deferred.

### `modules/shell.md`

_exit 0, 34s_

Scriba is a monorepo with an Angular web app, NestJS API, shared contracts, and genre packs. It can be developed and run using Node 26 and npm scripts, with `npm run dev` serving the app and proxying API calls; production deployment uses Docker with a one-liner install and update command. The repository includes detailed instructions for adding modules, handling errors, and recovering from issues, along with security notes about tailscale.

### `modules/tool-registry.md`

_exit 0, 22s_

Scriba is a monorepo with an Angular web app, a NestJS API, shared contracts, and genre packs. It can be installed and run via a Docker one-liner, after which the stack can be managed with docker compose commands. The README explains module development guidelines and security notes regarding tailscale access.

### `packages/packs/test/README.md`

_exit 0, 23s_

Scriba is a monorepo containing an Angular web app, a NestJS API, shared contracts, and genre packs. Developers can start and deploy the project using npm commands and a Docker installer that manages compose files and environment variables. The system allows modular extension through contract slices and API modules, and provides procedures for installation, updates, rollback, and recovery.

### `plans/AGL-01.md`

_exit 0, 54s_

Plan AGL-01 specifies the contract slice for the agent loop component, including Zod schemas for events, runs, settings, errors, and grounding, plus route constants and error codes. It details creating eleven new files under `packages/contracts/src/agent-loop/` and corresponding tests, following a branch-test-build-commit workflow. Acceptance criteria verify schema exports, type inference, event parsing, and successful import by the shell and project store, while open points and assumptions are tracked for later refinement.

### `plans/AGL-02.md`

_exit 0, 33s_

AGL-02 implements a built-in tool framework that adds `list_files` and `read_file` tools, dispatching them through a validated router with Ajv, readable errors, and retry/withdrawal logic. The plan defines per-run tool state, error handling for invalid calls and failures, and integrates the tools into the agent loop module. Acceptance criteria cover path safety, JSON parsing, schema validation, and withdrawal after three consecutive invalid calls.

### `plans/AGL-03.md`

_exit 0, 439s_

Agent loop core implementation for run start, stepped execution with cap, stop, project switch, and provider errors, publishing events and handling tool calls. It adds controllers, services, and module changes for provider resolution and family filtering, with defined end reasons and HTTP handlers. The plan outlines code modifications, tests, and a verification procedure to validate the loop's behavior.

### `plans/AGL-04.md`

_exit 0, 55s_

The AGL-04 plan introduces transcript logging that records agent run events as JSONL files, includes scrubbing and truncation of sensitive or long data, and enables history replay and context trimming for conversations. It defines new reading and controller endpoints, along with code changes and tests to verify correct behavior. Acceptance criteria ensure proper transcript format, follow‑up history continuity, trimming limits, and secret protection.

### `plans/AGL-05.md`

_exit 0, 42s_

Unit AGL-05 implements a GET /api/agent-loop/runs/current endpoint that returns the current agent run state from memory or rebuilds it from the latest transcript. It adds fields like lastSeq, cap, and pendingChangeIds to transcript runs and modifies agent-runs.service and controller to serve the state read‑only. The plan includes six criteria tests covering mid‑run state, restarts, no‑run cases, and per‑project slots, with corresponding code changes and validation.

### `plans/AGL-06.md`

_exit 0, 39s_

Plan AGL-06 adds an API endpoint for managing agent settings such as stepCap and research flags by registering an 'agent' section in the platform settings. It requires new files for the section definition, service, and controller, and updates the agent loop module and app module to expose GET/POST endpoints. Acceptance criteria ensure default settings persist, valid updates modify only specified fields, and invalid inputs return 400 without changing storage. The implementation follows a worktree setup, installs dependencies, writes and tests the code, then commits the changes.

### `plans/AGL-07.md`

_exit 0, 51s_

The AGL-07 plan implements a chat panel UI with conversation streaming, tool‑call cards, stop/continue controls, step counter, settings sheet, and responsive phone layout. It requires new files for routing, state, contract, and the chat page, updates to app routes, and follows a rigorous procedure including contract builds, unit tests, and phone viewport validation. Acceptance criteria ensure proper token appending, stop button visibility, reconnection behavior, and mobile layout.

### `plans/AGL-08.md`

_exit 0, 45s_

AGL-08 introduces a gate test for file-tools-chat that executes an agent run step summarizing an outline via a mock scenario. The plan adds three scripted turns to the composed app tests for outside-path refusal and malformed input withdrawal, and updates the e2e journey test to validate the agent run with a mock provider. It modifies relevant test files and ensures the feature meets all acceptance criteria before CI and merge.

### `plans/AGL-09.md`

_exit 0, 60s_

AGL-09 enables narrative tools as registry functions with entity resolution, citations, and provenance. It requires changes to the agent loop, tool registry, and web UI to resolve entities, display sources, and propagate provenance for draft outputs. The plan defines acceptance criteria, tests, and resolves prior open points, building on earlier modules.

### `plans/AGL-10.md`

_exit 0, 56s_

The AGL-10 plan adds a `search_notes` tool to the agent loop that searches project sources and entities and returns ranked passages. Implementation requires edits to tool schemas, builtin tools, and agent tools service, and updates existing tests to include the new tool in expected lists. Acceptance criteria are two tests: one verifying successful searches return only `sources/` paths, and another ensuring invalid arguments yield readable errors.

### `plans/AGL-11.md`

_exit 0, 33s_

AGL-11 plans a narrative gate introducing four workhorse tools, with criteria covering mock execution and real‑model validation. It mandates a new test file to verify tool calls, sourcesUsed, and provenance under mock conditions, plus a demo test for disabled tools. The plan depends on prior units being complete and stays unrolled until a real‑model run confirms the [`@id`] criterion.

### `plans/AGL-12.md`

_exit 0, 43s_

Unit AGL-12 adds run overlays to track file writes and edits, capturing base content on first access and proposing all changes at run end even after stops or project switches. It implements the `write_file` and `edit_file` tools with validation, ensuring pending changes are created against the captured base and handling missing files or host edits via a three‑way merge. The plan details the files to modify, a two‑part rollout (tool calls and run‑end flush), and four acceptance criteria covering disk writes, pending changes, stopped runs, and error handling.

### `plans/AGL-13.md`

_exit 0, 38s_

AGL-13 outlines a plan to implement output routing for tool kinds (draft, entity, graph, check) with optional target arguments, directing outputs to the correct folders and validating graph schemas. It details specific code changes across several files, a three-part test suite covering draft routing, graph proposal/validation, and check outputs, and resolves open issues around defaults, claims, and cross-run collisions. The plan includes procedures for development, testing, and integration with existing systems.

### `plans/AGL-14.md`

_exit 0, 71s_

AGL-14 adds diff previews to write/edit tool cards showing changed files and recommended content, and refreshes the review link when pending changes are resolved. It modifies backend logic to compute diffs, frontend components to display them and handle queue events, and includes tests to verify the diff display and link refresh functionality.

### `plans/AGL-15.md`

_exit 0, 42s_

Plan AGL-15 adds a new gate test `agent-loop-pending-writes-gate.test.ts` to verify that no agent writes reach the book before acceptance, stopped runs preserve changes, and multiple edits merge into a single pending change (criterion 1), while criterion 2 is already covered by the existing e2e journey accept step. The test includes three sub-checks ensuring disk writes are deferred until acceptance and pending changes are correctly recorded. Implementation involves creating the test file, running it three times, and confirming the e2e journey passes. The plan is currently drafted and will be moved to done after verification.

### `plans/AGL-16.md`

_exit 0, 46s_

The grounding engine extracts factual claims from drafts, retrieves matching passages from source files, and judges each claim as supported, weak, or unsupported, writing the results as a claims artefact with content hashes. It is registered in the agent loop module and initially tested via a temporary HTTP harness until AGL-17 integrates it into the run loop. Four acceptance criteria — claim extraction, retrieval, judgment, and artefact formatting — are validated by automated tests.

### `plans/AGL-17.md`

_exit 0, 61s_

AGL-17 will add automatic grounding checks for draft outputs and an on-demand check endpoint, wiring the grounding engine into the agent loop to validate drafts against sources and attach summaries to pending changes. The implementation requires edits to agent-run, agent-runs, grounding-engine, and related modules, along with new tests covering check runs and on-demand scenarios. The plan aligns with parallel units AGL-15, AGL-18, AGL-19 and resolves blockers AGL-13 and AGL-16.

### `plans/AGL-18.md`

_exit 0, 43s_

The AGL-18 plan implements grounding badges in the chat feature, adding summary chips to draft cards that show verdict counts and expand to display per-claim lists with source links. It includes a 'Check grounding' action from both chat cards and the files view that triggers on-demand checking. The plan details code modifications, tests, and deployment steps across the agent-loop and project-store modules.

### `plans/AGL-19.md`

_exit 0, 116s_

The plan adds a new draft chapter investigating whether learning plateaus can be a stage of reorganising, creates mock extract and judge turns and a corresponding e2e spec, and updates the sample outline and tests. All criteria have been met and the plan is marked as done.

### `plans/AGL-20.md`

_exit 0, 50s_

AGL-20 is the grounding gate plan that adds two new test cases to verify five criteria of the agent loop's grounding check. The plan details a procedure for writing, mutating, and running the tests, building the codebase, and committing changes. Criteria include detection of unsupported invented statistics, sample verdict validation, downgrading of unretrieved passages, artefact contract compliance, and badge rendering at phone width.

### `plans/AGL-21.md`

_exit 0, 31s_

The AGL-21 plan implements a `web_search` tool that runs against a SearXNG-compatible endpoint only when the research switch is enabled and a search endpoint is configured. It adds a new tool definition and handler, updates the agent tools service to conditionally include the tool based on research settings, and modifies the run service to pass the endpoint setting. Tests verify that the tool appears only when both research and the endpoint are enabled, and that it correctly calls the stub endpoint and returns results.

### `plans/AGL-22.md`

_exit 0, 45s_

Implement a `fetch_page` tool that retrieves web pages while refusing private, loopback, and reserved IP ranges, including after redirects, and applies size and time caps. The fetched text is marked untrusted and must be saved to `sources/` before grounding. The plan involves creating new files for fetch policy and address checking, updating builtin tools and agent services, and adding tests with a local HTTP stub.

### `plans/AGL-23.md`

_exit 0, 25s_

The AGL-23 plan implements a research gate check to verify four criteria: research tools are absent when disabled, execute locally when enabled, refuse loopback/private addresses even after redirects, and only show fetched text as evidence after acceptance into `sources/`. It creates `apps/api/test/agent-loop-research-gate.test.ts` with four test cases (AC1-AC4) using local test servers and mocks, without internet access. The tests validate the research family's activation, tool refusal rules, and grounding evidence scoping.

### `plans/AGL-24.md`

_exit 0, 155s_

The AGL-24 plan adds three compile tools—assemble_manuscript, run_preflight, and export_manuscript—that invoke manuscript, preflight, and export services, with export supporting multiple formats. Implementation involves a new compile-tools module, updates to agent-tools.service.ts to inject the services and register the tools, and modifications to agent-runs.service.ts and agent-loop.module.ts to enable the compile family and module wiring. Acceptance criteria are fulfilled through unit tests that verify tool behavior, family gating, project binding, and that exports are handled by the compile-export service without graph runner involvement.

### `plans/AGL-25.md`

_exit 0, 36s_

AGL-25 plans to create a manual evaluation script `npm run eval:agent` that runs the agent loop against real local models, processes test cases, and generates JSON reports. The script boots the API, configures a provider, executes predefined cases (e.g., summarize outline), and records results including tool usage and citations. Implementation involves adding new files (`run.mjs`, case files, README), updating `package.json` and `.gitignore`, and ensuring the script is not part of CI. Acceptance criteria include successful execution of the script, proper report output, ability to add new cases via additional JSON files, and passing unit tests.

### `plans/AGL-26.md`

_exit 0, 365s_

Scriba is a monorepo containing an Angular web app, a NestJS API, shared contracts, and genre packs, managed with Node.js and Docker. It can be installed and updated with a single Docker command that configures the environment and pulls the latest release. Modules are added by creating contract slices, API modules, routes, events, errors, and settings following a standard composition pattern. Security is handled through tailscale controlled via a shared socket, with optional development mode that relaxes checks.

### `plans/CEX-01.md`

_exit 0, 46s_

The CEX-01 plan develops a compile‑export contract slice containing Zod schemas and constants for order entries and export settings, and updates the project store to narrow these fields via the new slice. It creates nine new files under compile‑export, modifies project‑store imports, and adds tests to verify the subpath builds, exports correctly, and enforces validation. Acceptance criteria ensure the subpath exports only shapes, Zod rejects invalid inputs, and project.yaml files with or without order/export pass validation including samples. The plan resolves downstream dependencies and blockers, with readiness confirmed by associated done units.

### `plans/CEX-02.md`

_exit 0, 32s_

CEX-02 details the implementation of a GET /api/compile-export/manuscript endpoint that provides the manuscript's effective order, word counts, and related warnings. The plan includes creating new service and controller files, updating the application module to integrate the feature, and following a precise procedure for handling orders, graphs, and word counting. It is validated by six acceptance criteria and corresponding tests to ensure correct behavior.

### `plans/CEX-03.md`

_exit 0, 46s_

CEX-03 plans to implement ordered manuscript field updates (reorder, status, part) with revision checks and full materialization of order entries. It involves creating new files such as `order-write.ts` and `manuscript-write.service.ts` and modifying `manuscript.service.ts`, `manuscript.controller.ts`, and `compile-export.module.ts` to add the necessary routes, validation, and event publishing. The plan includes four acceptance criteria tests covering stale revision collisions, valid reorders, graph-ordered file restrictions, and status/part writes, and notes downstream dependencies and merge order.

### `plans/CEX-04.md`

_exit 0, 44s_

The CEX-04 plan details an assembled Markdown builder that merges metadata, front/back matter, dedication, and bibliography according to precise placement rules. It entails creating new service files such as `markdown-text.ts`, `assembly.ts`, and `assembly.service.ts`, modifying `word-count.ts` and `compile-export.module.ts`, and adding tests to meet criteria for metadata block order, bibliography modes, and author fallback. The plan also outlines downstream integration, open points, and review steps.

### `plans/CEX-05.md`

_exit 0, 36s_

The CEX-05 plan adds a preflight endpoint that scans assembled manuscript files for placeholder words and unrendered `{{...}}` patterns, returning findings with file, line, and offset details. It implements this by creating new service, controller, and module code while reusing utilities from CEX-04, and includes tests verifying correct placeholder detection and that no model calls are made. Completion of this plan unblocks several downstream checks and integrations.

### `plans/CEX-06.md`

_exit 0, 109s_

Plan CEX-06 implements two preflight checks: unsupported-claims identifies claims not supported by sources, marking unsupported as errors and weak as warnings, while orphan-scenes finds story nodes or order entries pointing to missing files. Both checks ensure findings include file path and line numbers, and the plan involves updates to manuscript service, preflight checks, and new tests to satisfy downstream criteria.

### `plans/CEX-07.md`

_exit 0, 37s_

CEX-07 adds two preflight checks — one for entity links and one for banned phrases — by extending the preflight service with new runners and input types. The entity‑links check validates citations, front‑matter links, and markdown destinations, while the banned‑phrases check scans masked text using the project's style profile. Both checks report findings with file paths and line numbers, and the implementation passes all criteria through updated tests and service integrations.

### `plans/CEX-08.md`

_exit 0, 43s_

The plan adds an `order` field and `export` block with author and dedication to the nonfiction sample's `project.yaml`, listing the four chapters with their statuses. It ensures the sample passes the platform examples check and that the non‑alphabetical order is preserved when starting the sample from scratch.

### `plans/CEX-09.md`

_exit 0, 44s_

The CEX‑09 plan adds re‑exports of ManuscriptService, AssemblyService and PreflightService in compile‑export.module.ts and creates a gate test file that runs T2–T4 to verify each preflight check, confirm no external HTTP calls, and ensure the nonfiction sample’s authored order is kept after a start‑from‑sample flow. Criterion 1 is already satisfied, and the changes integrate with downstream units like CEX‑10 and AGL‑24 while preserving guard coverage. The test suite uses fixtures for each check and includes negative controls to validate the gate’s behavior.

### `plans/CEX-10.md`

_exit 0, 49s_

The CEX-10 plan implements a compile‑export service that uses Pandoc (and Typst for PDF) to assemble markdown and export it as Markdown, DOCX, EPub, or PDF, with preflight checks, busy‑export protection, timeouts, output limits, and download endpoints, and updates CI to install Pandoc 3.13 and Typst 0.15.1. Comprehensive tests cover successful exports, concurrent exports, failures, timeouts, empty manuscripts, and the CI tool installation steps. Criteria 1–3 are addressed, while criterion 4 remains unverified until the pushed code runs in CI.

### `plans/CEX-11.md`

_exit 0, 332s_

The CEX-11 plan focuses on implementing DOCX export with a standard manuscript reference document. It involves creating a built-in reference DOCX file, updating the pandoc runner to handle a reference document flag, adding a title block to the exported document, and ensuring the Dockerfile includes the reference asset. The plan defines three acceptance criteria (C1, C2, C3) checked by tests, plus extras E1-E2 for structural details. It builds upon completed units CEX-10 and follows decisions fromNavigator and other plans, with careful coordination to merge changes from CEX-12, CEX-13, and CEX-14 without conflicts. The procedure includes branching, creating the reference DOCX, updating code in several modules, adding tests, and running checks before committing.

### `plans/CEX-12.md`

_exit 0, 36s_

Unit CEX-12 adds EPUB 3 export with a built-in stylesheet, TOC, and stable identifier, modifying thepandoc runner, export service, and adding a stylesheet file. It includes criteria to validate spine/nav order, metadata fields, and bibliography visibility, supported by new tests and a localPandoc procedure. The work extends CEX-10 and CEX-11 functionality and prepares for future overrides and gateway checks.

### `plans/CEX-13.md`

_exit 0, 44s_

The plan implements PDF export using Typst by adding a built-in Typst template, updating the pandoc runner and export service to handle `--pdf-engine=typst`, and incorporating Typst availability checks in the kit. It includes writing new tests, an ADR to record the spike results, and verification steps to ensure the PDF starts with `%PDF-` and that Typst is correctly integrated. After validation, the changes are committed to support PDF generation via Typst.

### `plans/CEX-14.md`

_exit 0, 59s_

Scriba is a monorepo containing an Angular web app, a NestJS API, shared contracts, and genre packs, all managed with Docker. It includes detailed instructions for installing, updating, and recovering the stack via a one-liner command and manual rollback procedures. Developers can extend the system by adding modules following a structured process for contracts, API routes, events, and settings. The project uses Tailscale for secure access and offers a development mode that bypasses setup checks.

### `plans/CEX-15.md`

_exit 0, 43s_

The CEX-15 plan adds an export step to the image smoke job that generates the nonfiction sample in Markdown, DOCX, EPUB, and PDF formats. It includes a new wrapper script and tests that validate each format via the HTTP API on both AMD64 and ARM64 images. The step is integrated into the CI workflow and meets criteria for correctness, service availability, and alignment with the image smoke process.

### `plans/CEX-16.md`

_exit 0, 40s_

CEX-16 will implement a snapshot API enabling create, list, and restore operations for manuscript drafts. The implementation adds snapshot service and controller files, updates the compile-export module, and includes tests to verify correct snapshot creation, restoration with pre-restore snapshots, integrity of drafts and versions, and conflict detection. The plan is divided into Part A (create/list) and Part B (restore), with four acceptance criteria covering snapshot creation, restore mechanics, version consistency, and conflict handling.

### `plans/CEX-17.md`

_exit 0, 46s_

The CEX-17 plan details implementing a manuscript route outline feature in the compile‑export module, including a new route, hand‑written contract copies, a standalone ManuscriptPage component, and functionality for reading, ordering, status/part updates, conflict handling, and phone read‑only mode. It specifies the files to be created or modified, the step‑by‑step development and testing approach, and how the feature integrates with existing shell routes and events. The plan notes that the work is blocked by CEX‑01 and SHL‑09 but is ready for implementation once those are complete.

### `plans/CEX-18.md`

_exit 0, 48s_

The CEX-18 plan adds a preflight panel that runs compile checks and displays findings, together with export buttons that require confirmation before exporting and an export settings panel for project preferences. It requires new web components, updates to manuscript page wiring, and modifications to compile export contracts and APIs, all backed by detailed unit tests. The work follows upstream decisions from CEX-17, CEX-10, and CEX-14 and will be verified against criteria for preflight behavior, finding links, and settings changes.

### `plans/CEX-19.md`

_exit 0, 32s_

The CEX‑19 plan adds a SnapshotsPanel to the manuscript route, enabling users to create labeled snapshots, view a newest‑first list, and restore snapshots via a confirm dialog. Implementation requires new contract copies, panel and spec files, and minor edits to the manuscript page, following a detailed procedure and passing all acceptance criteria. The panel integrates with the compile‑export API, respects phone read‑only constraints, and is validated through unit and integration tests.

### `plans/CEX-20.md`

_exit 0, 36s_

The CEX-20 milestone gate adds a manuscript step to the e2e journey that verifies the authored order of four chapters and the accepted word count. Criteria 1 and 2 are met via existing unit/module tests and the e2e test, while criterion 3 requires a manual check by the owner of Word and EPUB exports. The plan details the code changes, testing, and demos needed before the feature can be merged and marked done.

### `plans/DECISIONS.md`

_exit 0, 97s_

## Objective
- Summarize the conversation for another agent to resume work

## Requirements
- Exclude repository conventions, instruction files, environment details
- Use the specified template format
- Summarize only what the user and assistant said and did

## Decisions
- (none)

## Work State
### Completed
- User provided checkpoint with summary instructions and emphasized MUST summarize the conversation
- Assistant attempted to search for files using `glob` but encountered path error
- Assistant executed `shell ls -la` to list directory contents
- Assistant read `README.md` to understand project structure

### Active
- Generating structured summary as per user request

### Blocked
- (none)

## Next Move
1. Produce final structured summary

## Relevant Files
- None

## Important Context
- User explicitly commanded: "You MUST summarize the conversation above into a structured summary that will be given to another agent to resume the work."

### `plans/GNP-01.md`

_exit 0, 42s_

GNP-01 creates a pack content-check suite that validates tools against specifications, checking for errors like invalid output kinds, unknown hints, template variables, and duplicate names. The suite ensures common inputs are consistent across draft tools, descriptions start with verbs and are under 120 characters, and remix shapes match draft tools when remix.yaml exists. It uses Vitest with five broken-spec fixtures and integrates with the build, test, and lint pipelines via updated scripts and dependencies.

### `plans/GNP-02.md`

_exit 0, 45s_

GNP-02 implements a golden-test harness with a `goldenCase` helper that compares tool execution requests against stored golden files and supports updating goldens via `--update-goldens`. It creates per-tool fixtures, golden files, and a test-only probe tool with mock scenarios, while enforcing conventions for tool catalogs and invalid argument validation. The plan integrates these changes into Vitest tests and updates the documentation.

### `plans/GNP-03.md`

_exit 0, 50s_

Creates source and style-profile entity type YAML files with required fields. Adds tests to verify lint clean loading in the tool registry. Runs mutation and lint checks before committing.

### `plans/GNP-04.md`

_exit 0, 311s_

GNP-04 plans a `propose_graph` tool that creates story graphs or recipes from intent, taking inputs like `view`, `intent`, `includeCatalogue` (true for recipes, false for stories), `entityIds`, and `files`. The plan includes golden tests for both views with fixtures and scenario mocks, and ensures the output parses correctly against a graph schema.

### `plans/GNP-05.md`

_exit 0, 42s_

GNP-05 details a plan to implement the core gate checks by adding a registry list test for `propose_graph` and a script that verifies the image's read-only `/opt/scriba/packs` directory, aiming to satisfy criteria 21‑23. The work includes building an arm64 image, running image and registry tests, and confirming the pack directory is not writable by the app user. Dependent units and earlier plans (GNP-01‑04, PLT-14) must be complete, after which the orchestrator will mark the criteria as done on main.

### `plans/GNP-06.md`

_exit 0, 45s_

The plan introduces `person`, `claim`, and `concept` entity types with defined fields and validations for a nonfiction knowledge base. It involves creating corresponding YAML schema files, updating the tool registry, and adding tests to ensure lint cleanliness and proper reference handling. Implementation steps include setting up a worktree, installing dependencies, running builds and tests, mutating checks, linting, and committing the changes. Success is measured by passing all tests, lint checks, and validator constraints, particularly that claims with invalid status are rejected.

### `plans/GNP-07.md`

_exit 0, 52s_

GNP-07 plans the `cold_open` draft tool for nonfiction, specifying its inputs and prompt, and creating associated golden and eval test cases. It updates the tool catalogue, runs lint and validation checks, and integrates the tool into the propose_graph recipe. Implementation involves several new files and follows a defined procedure to ensure correctness.

### `plans/GNP-08.md`

_exit 0, 42s_

The GNP-08 plan introduces a `mystery_question` tool that generates nonfiction drafts starting with a puzzle and unfolding to a surprising finding, using inputs such as core idea and puzzle (required) and optional elements like surprising finding and entities. It details the tool's specification, prompt structure, and required fields, and outlines the implementation steps including creating specs, golden tests, scenario mocks, and an eval case to validate functionality.

### `plans/GNP-09.md`

_exit 0, 44s_

Plan GNP-09 details the implementation of a 'myth_buster' nonfiction draft tool, including its YAML specification, golden tests, and eval case. It outlines steps for building the tool, updating the pack catalogue, and integrating validation and prompt rendering. The plan coordinates with related units GNP-08 and GNP-10 and defines procedures for development, testing, and committing changes.

### `plans/GNP-10.md`

_exit 0, 58s_

The GNP-10 plan details the implementation of the 'numbers_to_people' tool, which converts a statistic into a narrative story of the person behind it using inputs like statistic, person, and core idea. It involves creating the tool specification, golden test fixtures, scenario files, and evaluation scripts, then running linting, golden checks, and eval tests to validate the tool. The work proceeds by branching, coding the YAML prompt, generating tests, updating the catalogue registry, and committing the changes while ensuring compatibility with prior GNP-08 and GNP-09 work.

### `plans/GNP-11.md`

_exit 0, 56s_

The GNP-11 plan adds five new entity files and front matter to four source files to provide nonfiction sample data, ensuring validation through examples checks and e2e tests while integrating with existing schemas and tools. It defines entities for a person, claims, concept, and style profile, sets claim statuses, and includes source metadata required by the pack schema. Criteria cover linting, reference resolution, claim grounding, and compatibility, with open points pending PLT-22 merge and e2e execution confirmation.

### `plans/GNP-12.md`

_exit 0, 35s_

The GNP-12 workhorses gate plan verifies that the four nonfiction tools pass validation, have identical inputs, validate sample entities and references, and produce draft citations with sources—either through data‑only checks or a deferred real‑model run. It is executed via steps T1 to T4, including lint packs, golden tests, examples checking (pending PLT‑22), eval data tests, and a manual model run that cannot start without a local model server. Criteria are ticked based on these results, with some items remaining unticked until PLT‑22 merges and the model run is performed.

### `plans/GNP-13.md`

_exit 0, 49s_

The GNP-13 plan introduces character, place, and world-rule entity types with specified fields and relationships, creating YAML definition files and an updated test suite. It validates the changes through lint, mutation, and CI tests and integrates with downstream units GNP-14 through GNP-19.

### `plans/GNP-14.md`

_exit 0, 58s_

GNP-14 adds character_builder and world_builder tools that generate character and place/rule entities from seeds and rules, with prompts constrained to use only supplied material. The plan creates tool specifications, fixtures, scenarios, golden tests, and eval cases, and updates the tool catalog. Criteria ensure the tools pass validation, their golden prompts match expectations, and eval cases are present. Implementation ends with e2e tests and a viewport height increase in tools-preview.e2e.ts to accommodate the new tools.

### `plans/GNP-15.md`

_exit 0, 124s_

The GNP-15 plan implements the `scene_builder` tool for drafting scenes from a character's point of view by creating its YAML spec, fixtures, scenarios, golden tests, and eval cases, then updating the recipe golden to include the tool in the catalogue. It requires running lint and test suites, verifying the `/tools` viewport height of 6000, and passing the root `npm test` gate after possible reruns. Successful completion hinges on all criteria tests passing and a clean commit of the changes.

### `plans/GNP-16.md`

_exit 0, 58s_

GNP-16 plans to implement a new dialogue tool for fiction packs, defining its schema with core idea, character IDs, style, length, tone, subtext, and goal inputs, and generating a draft exchange. The implementation creates the tool spec, fixture, mock scenario, comprehensive tests with golden cases for valid and invalid inputs, an eval case, and updates the catalogue to include the tool. Steps include linting, building, e2e checks, and verifying the tool appears correctly in the /tools list.

### `plans/GNP-17.md`

_exit 0, 54s_

GNP-17 intends to ship a `plot_manager` tool that scans fiction story outlines for unpaired setups, payoffs, gaps, and loose ends. The plan covers creating the tool spec, golden fixture, mock scenario, tests, eval case, and catalogue entry, with inputs `outline` and `entityIds`. Acceptance requires passing the validation suite, a golden test, and an eval case, verified through specific automated checks. Implementation follows a step‑by‑step procedure including build, lint, e2e, and gate tests to ensure correct integration.

### `plans/GNP-18.md`

_exit 0, 43s_

GNP-18 adds a fiction sample project "The Lamp Keepers" with characters, places, and world rules, including story graph and dialogue recipe files. The plan involves creating 12 files in examples/fiction and validating them through the examples check and structural tests. Implementation includes pinned coreIdea values in the dialogue tool and ordered scene edges in the story graph.

### `plans/GNP-19.md`

_exit 0, 47s_

The plan adds a test for the fiction-order check through start-from-sample flow by creating `apps/api/test/packs/fiction-gate.test.ts` and fixture copies. Criterion 5's manual evaluation is deferred due to missing model infrastructure, while the test integrates with existing phase:fiction gates.

### `plans/GNP-20.md`

_exit 0, 39s_

GNP-20 plans to implement the `throughline_check` tool that flags chapter sections drifting from a core idea. It involves creating the tool spec, golden test fixtures, mock scenarios, and eval cases, then updating the recipe catalogue and running validation tests. Implementation steps include coding the spec, running tests, and committing changes, with acceptance criteria covering validation, golden checks, and tool listing.

### `plans/GNP-21.md`

_exit 0, 139s_

Adds three new disabled tools—named_concept, comparison_set, and objection_handler—for nonfiction content analysis. Updates the verb list and adds an enable option for golden tests while implementing tool specs, fixtures, scenarios, and tests. All development steps are complete, with tools shipping disabled and golden tests passing, though real-model evaluation remains not run.

### `plans/GNP-22.md`

_exit 0, 70s_

GNP-22 plans to add nine disabled draft tools for genre packs, each sharing common inputs and unique prompts, with corresponding fixtures, scenarios, golden tests, and eval cases to validate their behavior before enablement, and includes a viewport adjustment to accommodate the new tools.

### `plans/GNP-23.md`

_exit 0, 63s_

GNP-23 will implement a 'remix' tool that rewrites passages in another tool's shape. The plan involves writing the tool's spec, tests, golden cases, and eval data to ensure it passes validation and updates the tool registry enum, enabling the tool and unblocking GNP-24.

### `plans/GNP-24.md`

_exit 0, 44s_

GNP-24 completes the remaining-shapes gate by enabling 12 disabled nonfiction shapes through the tool registry and verifying they become agent-callable canvas nodes. The plan writes a test file validating all 14 tools, golden tests, enum consistency, and enable functionality via mock OpenAI. Procedure steps include worktree setup, test execution, and updating plan/unit files to mark criteria as done when tests pass.

### `plans/GRR-01.md`

_exit 0, 59s_

The GRR-01 plan implements the `graph-runner` contract slice by defining Zod schemas for story and recipe graphs, run states, errors, and SSE events. It details creating ten new source files and tests, running formatting, lint, build, and CI checks to validate the contract exports and example graphs. Acceptance criteria verify schema validation, uniqueness, routing, issue codes, and that all tests pass in CI, with downstream units depending on the new slice.

### `plans/GRR-02.md`

_exit 0, 48s_

The GRR-02 plan implements a new graph-runner module with controllers and services to enable CRUD operations on graph files stored in the project's `graphs` directory. It adds six REST endpoints for listing, creating, saving, renaming, and deleting graphs, using the project store and files API with schema validation, proper error codes, and canonical JSON representation. The plan includes helper functions for ID generation and version handling, and is validated by four test cases covering core workflows such as create, schema version, rename conflicts, and pending changes.

### `plans/GRR-03.md`

_exit 0, 75s_

The GRR-03 plan implements graph validation against the tool registry, adding a validate endpoint and pure rules to check recipes and stories. It introduces a `GraphValidatorService`, updates the graph runner to perform validation, and adds corresponding controller and module changes. Tests verify each rule produces the expected issues, and decisions handle illegal node kinds and duplicate IDs in stories.

### `plans/GRR-04.md`

_exit 0, 50s_

GRR-04 details the implementation of the graph runner's core execute engine, specifying how scope, input values, topological order, tool calls, run state, and SSE are handled. It establishes five acceptance tests covering run startup, targeted execution, error refusals, file input caching, and run state continuity. The plan outlines required code changes, new files, and resolves open points regarding output nodes and failure behavior.

### `plans/GRR-05.md`

_exit 0, 38s_

GRR-05 adds a stop route and stop logic that aborts running nodes, marks queued and running nodes as stopped, and ends the run with a reason such as 'author' or 'project‑switched'. It integrates this stop behavior with existing fail‑fast error handling, ensuring no pending changes Are created after a stop. The unit includes three tests (C1–C3) that verify stop during tool failure, stop during a slow mock call, and stop when the active project is switched.

### `plans/GRR-06.md`

_exit 0, 56s_

GRR-06 implements output nodes that create pending changes with target precedence, captured base, origin, and provenance, and validates graph outputs via a registered schema. It adds pure functions for folder/extension rules, modifies the graph runner's service to handle proposes and validation, and includes tests covering criteria C1‑C5. The plan integrates with GRR-05 and GRR-07, resolves open points on name collisions and logging, and completes the pending‑change workflow.

### `plans/GRR-07.md`

_exit 0, 45s_

The plan implements structured JSON Lines logging of graph run events (start, node status, tool calls, pending changes, end) to `logs/recipe-runs`, and adds restart recovery that rebuilds the current run state from the most recent log of the active project, marking interrupted runs as stopped with reason `interrupted`. Changes are made in `runs.service.ts`, `run-log.ts`, and `run-recovery.ts`, with tests ensuring logs parse correctly and recovery restores state after crashes. Acceptance criteria verify that after a run or restart mid-run, the log contains required entries and the API reports the run as stopped with reason `interrupted`.

### `plans/GRR-08.md`

_exit 0, 64s_

GRR-08 is a gate plan with three criteria that confirm graph-runner tests pass on main, that all graph-runner API routes are protected by the global auth guard via invariant tests, and that platform boundaries lint shows no illegal imports between graph-runner and agent-loop. The plan specifies concrete test commands and a procedure using a temporary worktree to verify each criterion, then reports the results. After the tests succeed, the orchestrator updates the unit and plan files to mark the gate as done.

### `plans/GRR-09.md`

_exit 0, 69s_

The GRR-09 plan implements a graphs route with a list page that displays graph names, views, node counts, validity, pending change badges, and the latest run status, along with create/rename/delete controls on tablet and desktop and a phone gate page. It requires new route definitions, graph list and placeholder components, API client calls for create/rename/delete and run status, and contract copies with specs. Acceptance criteria include component tests verifying list rendering, API interactions, status updates, and proper phone viewport behavior.

### `plans/GRR-10.md`

_exit 0, 72s_

GRR-10 is the plan to build an adapter layer that bridges the graph JSON format with the ngx-vflow library, enabling the canvas page to render and manipulate nodes and edges for both story and recipe views, including move, add, remove, connect and save operations. It specifies creating new files such as vflow-adapter.ts and canvas-page.ts, updating dependencies, and adding tests to verify byte-equivalent JSON preservation, correct position updates on node moves, and proper handle connections with wireType IDs. The implementation depends on upstream units GRR-09, GRR-11, and GRR-14 and integrates with the backend graph runner API.

### `plans/GRR-11.md`

_exit 0, 63s_

GRR-11 plan adds tool nodes generated from the registry to the canvas, showing only enabled and valid tools in the palette, and implements input/output nodes, typed wires, connection validation, and live validation. It requires new utility functions and edits to the canvas page, vflow adapter, and contract files to support these features and proper form handling. The plan outlines specific code changes, testing steps, and acceptance criteria to integrate the functionality.

### `plans/GRR-12.md`

_exit 0, 64s_

The GRR-12 unit will implement an entity side list and draggable chips on the canvas, enabling users to pin entities or styles to tool ports by dropping chips, with validation, refusal reasons, and removal handling. Changes are limited to canvas-page.ts, entity-chips.ts, and graph-runner-contract.ts, with new Vitest unit tests and a Playwright gesture spec to verify the behavior. The plan follows criteria for correct pinning, rejection of invalid drops, and integration with existing graph validation and run controls.

### `plans/GRR-13.md`

_exit 0, 306s_

The GRR-13 plan introduces run controls, an input-values dialog, live status badges, and inline results while keeping the canvas read-only during graph runs. It specifies modifications to run-state, run-dialog, and canvas-page files, and outlines a step-by-step implementation procedure including code changes, tests, and validation. Acceptance is achieved through criterion-specific tests and integration checks.

### `plans/GRR-14.md`

_exit 0, 69s_

The GRR-14 unit plan describes implementing story graph UI controls including file and relation pickers, a missing-file badge, an Open File button, and an Arrange button that layouts nodes left-to-right by order edges. It details the files to modify, such as canvas-page.ts, story-view.ts, layout.ts, and updates to contracts for file handling. The plan coordinates with preceding units GRR-12 and GRR-13, depends on their completion, and includes tests and validation steps. Overall, GRR-14 aims to integrate these features while maintaining read-only guards and validation checks.

### `plans/GRR-15.md`

_exit 0, 73s_

GRR-15 details a plan to add touch interaction support, theme token styling across the canvas, and large-graph performance measurement. It specifies criteria for touch connect/move/drop, token-based colors in both light and dark themes, and a 200 ms long-task threshold for a 150‑node graph, with chunked rendering of graphs over 25 nodes. The plan includes new e2e tests (T1‑T9, T7, V1), manual checks, and regression steps to ensure compliance.

### `plans/GRR-16.md`

_exit 0, 48s_

Unit GRR-16 adds a recipe graph chaining four tools to produce a draft chapter opening, along with a mock scenario and fixture copy of the sample. An API end-to-end test validates the run against the mock, satisfying both CI check and runtime criteria.

### `plans/GRR-17.md`

_exit 0, 162s_

The GRR-17 plan creates an e2e spec testing an empty canvas and sample run, evolving through five revisions to resolve viewport, validation, and drag magnet issues. Criteria 1 and 2 are met locally, while criteria 3 (CI) and 4 (iPad) are deferred per navigator decision. The unit sets status to done after merging, closing phase:canvas and unblocking GNP-19.

### `plans/MPR-01.md`

_exit 0, 131s_

Plan MPR-01 defines the providers contract slice using Zod schemas and TypeScript types for configuration, presets, error codes, and API routes. It includes acceptance criteria, tests, and examples covering validation, connection testing, key management, model selection, and effective model resolution. Implementation involves creating new files under `packages/contracts/src/providers/`, building, testing, and integrating with downstream modules like MPR-02 for seeding and MPR-09 for the providers panel.

### `plans/MPR-02.md`

_exit 0, 92s_

The MPR-02 plan adds a providers module with registry and seeding capabilities, registering an Ollama provider on first start. It defines module files, registry methods for list/get/create/update/delete/appDefault, and a seeder that validates and writes the initial section. The plan follows decided standards for schema validation, hook order, and id generation, and includes tests to ensure correct seeding, idempotent behavior, and proper error handling.

### `plans/MPR-03.md`

_exit 0, 51s_

MPR-03 introduces a secrets file helper and stdout redaction for model providers, providing atomic read/write of a secrets file with strict 0600/0700 permissions, key management functions (put, get, delete, hint), and redaction of secrets from logs. The implementation creates new modules `secrets-file.ts` and `secrets-store.ts`, updates `providers.module.ts` and `stdout-logger.ts`, and adds tests to verify atomic writes, mode enforcement, key hint generation, and log redaction. It follows decisions from the Navigator and coordinator, integrates with the platform's logger, and is downstream of MPR-02 and MPR-04, with acceptance criteria covering file persistence, crash recovery, short keys, and log safety.

### `plans/MPR-04.md`

_exit 0, 74s_

The MPR-04 plan is to implement an openai-compatible streaming client that assembles tool calls, collects streams, and handles retries, timeouts, and aborts with mapped errors. It involves creating multiple new files for the client, error types, retry logic, and stream collection, along with thirteen mock scenarios and tests for various criteria. The development method uses a worktree to install the pinned openai SDK, build, test, and lint the changes, ensuring compatibility and no regressions, and this client will be used by downstream units MPR-05, MPR-07, and MPR-08.

### `plans/MPR-05.md`

_exit 0, 53s_

MPR-05 adds a `ModelResolver` that determines the effective model by applying project overrides, then the app default, then the provider's own model, and finally falling back to the first listed model from a proxy list. It implements `resolve` and `modelList` methods with proper error handling and integrates into the providers module. The plan includes unit tests covering various resolution paths and error cases, and aligns with related tasks such as MPR-06, MPR-08, and MPR-12.

### `plans/MPR-06.md`

_exit 0, 64s_

MPR-06 describes how to implement the providers HTTP API, including endpoints for listing, creating, updating, deleting providers, managing keys, setting app defaults, and resolving effective models. The implementation requires new controller and service files, updates to the registry and module, and additional tests, while ensuring proper key storage, deletion behavior, and compliance with security guards. Acceptance criteria cover key persistence, key clearing, app default changes, and read-only GET behavior, and the plan notes downstream impacts on connection tests and the providers panel, as well as an open point about provider ID reuse.

### `plans/MPR-07.md`

_exit 0, 405s_

MPR-07 implements a `/api/providers/test` endpoint that executes staged connection tests (reach, list, chat) on providers, returning stage, latency, and error details with context-specific hints. The plan adds a `ConnectionTestService`, updates the controller and module, and includes seven mock scenarios and ten test cases covering various failure modes. It ensures proper config handling, key management, timeouts, and integrates with existing provider resolution and secret storage.

### `plans/MPR-08.md`

_exit 0, 53s_

MPR-08 aims to add a gate for the providers API, covering guard, secrecy, and system seam tests. It specifies a new test file to validate the routes and security checks, and defines criteria for successful implementation. Criterion 1 is automated via existing tests, while Criterion 2 requires a manual model-path check on the host by the owner due to Ollama availability. The plan includes steps for the implementer to write and run the tests, and notes fallback if the manual check cannot be performed.

### `plans/MPR-09.md`

_exit 0, 109s_

The MPR-09 plan specifies building an exported providers panel with list, add/edit/delete functionality, model pickers, and write-only keys. It involves creating 12 files under `apps/web/src/app/features/providers/` and includes detailed acceptance criteria and tests.

### `plans/MPR-10.md`

_exit 0, 46s_

MPR-10 implements a "Test connection" button in the provider form that displays staged test results across up to three stages. For Ollama providers, it conditionally shows context-length and model pull hints. The UI includes dedicated components for rendering results and handling various connection failure scenarios with appropriate hints.

### `plans/MPR-11.md`

_exit 0, 57s_

The MPR-11 plan details adding a lazy‑loaded `/providers` route with a nav item “Providers” that hosts a page and panel for model providers. It sets acceptance criteria for lazy loading, navigation visibility, and phone‑width usability, and provides a step‑by‑step procedure including file changes, unit tests, and e2e validation. Implementation involves modifying app routes, creating new components and tests, and running build and browser checks to ensure the feature works correctly.

### `plans/MPR-12.md`

_exit 0, 37s_

The plan adds per-project model overrides by reading a `model` field from `project.yaml`, with API endpoints to set and clear the override for the active project. Resolution prioritizes the project override, then the app default, and returns the provider's model or the provider's default when the override points to a deleted provider, issuing a warning. Implementation includes updates to providers' resolution logic, controller routes, and services, along with tests and contract changes.

### `plans/MPR-13.md`

_exit 0, 83s_

MPR-13 adds a "This project" model panel to the /providers page that shows the effective model for the active project and permits setting a project-specific model override. The panel fetches the active project, lists providers, displays the effective model, and refreshes on project switches or user actions, with dedicated UI tests. Implementation involves new component files, updated texts and copies, and edits to providers-page and related modules, all verified through unit and integration tests.

### `plans/PLT-01.md`

_exit 0, 32s_

PLT-01 creates the root npm workspace with four packages (contracts, api, web, packs), pins Node 26 and TypeScript 6.0.x, and resolves the latest Angular, NestJS, and Zod majors while ensuring compatibility. It generates the root package.json, ESLint and Prettier configurations, .nvmrc, and initializes each workspace with minimal package.json and tsconfig, then defines acceptance criteria for installation, building, testing, and linting across all workspaces. The plan includes downstream checks to prevent conflicts, verifies a single TypeScript version, and ensures the pin section accurately records the resolved majors.

### `plans/PLT-02.md`

_exit 0, 35s_

PLT-02 will publish ten subpath modules and a `/platform` slice in the contracts package, adding TypeScript Node types, Zod validation schemas, and CJS build scripts. It creates source files for platform events, errors, HTTP methods, settings, and environment defaults, and updates package exports and build configuration. Acceptance criteria verify runtime subpath resolution, proper envelope validation, and that no extraneous runtime dependencies exist. Downstream plans PLT-04, PLT-11, and contract slices depend on these contracts.

### `plans/PLT-03.md`

_exit 0, 36s_

PLT-03 will bootstrap a Scriba web application using Angular 22 with Material, creating a placeholder page that shows 'Scriba' and setting up a proxy to forward /api, /healthz, and /events to localhost:8080. The plan involves generating the app, adding Material, writing proxy configuration, and implementing a minimal Vitest test and a proxy validation script, then updating build, test, and lint scripts. Successful completion is measured by a build that produces a static bundle, a passing single test, and a proxy config covering exactly the three specified endpoints, which enables downstream scaffolding, e2e testing, and API integration.

### `plans/PLT-04.md`

_exit 0, 54s_

PLT-04 plan implements the NestJS API platform with composition root, environment parsing, app state checks, health and version endpoints, and proper logging/shutdown. It creates main.ts, bootstrap.ts, app.module.ts, and platform modules with controllers, following decisions for CommonJS format and single app/port. The plan includes acceptance criteria tests for boot behavior, static fallback, environment validation, and shutdown, with method steps for building, testing, and linting.

### `plans/PLT-05.md`

_exit 0, 40s_

PLT-05 describes implementing a global exception filter and Zod validation pipe to standardize error handling for validation errors, payload limits, and other failures across the API. It specifies creating new files for errors, the filter, pipe, and tests, and defines acceptance criteria for each error case. The plan resolves open points on body limits and module re-exports while integrating with existing platform modules.

### `plans/PLT-06.md`

_exit 0, 38s_

PLT-06 describes adding a server-sent events endpoint at `/events` that streams a hello message, periodic heartbeats, and allows other modules to publish events to all connected clients. It also implements an `/api/platform/echo` endpoint that emits a configurable sequence of echo events to all clients, with backpressure handling that closes slow streams when the buffer limit is exceeded. The plan includes detailed acceptance criteria for message format, headers, shutdown behavior, and a suite of tests to validate each requirement.

### `plans/PLT-07.md`

_exit 0, 41s_

The PLT-07 plan implements a settings file migration system via an `onApplicationBootstrap` hook that validates schema versions, backs up files, and migrates sections using registered steps. It introduces new types, services, and utilities for handling `settings.yaml` and updates the platform module to provide `SettingsService`. Six tests verify migration, defaults, atomic writes, and error handling, ensuring the feature works correctly and integrates with downstream modules.

### `plans/PLT-08.md`

_exit 0, 36s_

PLT-08 adds a Tailscale IP range filter that drops connections from Tailscale addresses on the `connection` event. The filter uses a new predicate `isTailnetAddress` and a `TailnetFilter` provider registered in `platform.module.ts`, which is updated during the batch. The filter is attached via Nest's `onApplicationBootstrap` hook before the server listens.

### `plans/PLT-09.md`

_exit 0, 39s_

PLT-09 introduces a module boundary lint rule with eslint-plugin-boundaries, updating the root ESLint config and adding fixtures tested by a new script. The plan specifies steps to install the plugin, configure selectors, and meet criteria banning cross-module imports and allowing contract imports, while aligning with PLT-02, PLT-03, PLT-10, PLT-11, AGL-01, and GRR-01. Key open issues involve plugin selectors, resolver settings, and Node 26 compatibility.

### `plans/PLT-10.md`

_exit 0, 36s_

PLT-10 plans to create a GitHub Actions workflow ci.yml that runs `npm ci`, `lint`, `test`, and `build` in sequence and includes a PR title check. To validate the workflow and title format, it introduces scripts such as `check-pr-title.mjs` and test files that use Node's built‑in test runner. The plan includes unit tests for the workflow structure and title validation, though full acceptance criteria will be verified in later stages.

### `plans/PLT-11.md`

_exit 0, 59s_

The PLT-11 scaffold gate plan establishes a new development setup where contracts are built first, adds a dedicated Angular configuration for contract subpaths, and enforces CommonJS checks via updated build scripts and CI. It outlines a step‑by‑step procedure to verify pins, install dependencies, run subpath and dev stack tests, and ensure acceptance criteria for local and CI environments are met. Acceptance criteria include successful local dev serving, workspace tests, contract resolution, existing PLT‑04‑09 criteria, CI pipeline greenness, and proper proxy configuration, while open points are resolved or deferred.

### `plans/PLT-12.md`

_exit 0, 62s_

The PLT-12 plan adds a scripted mock OpenAI server that simulates tool calls, errors, delays, and matcher scenarios for testing the OpenAI SDK. It creates server code, a CLI, multiple scenario files, and comprehensive tests within an e2e npm workspace, and integrates the mock via a new `mock:openai` script with TypeScript type checking.

### `plans/PLT-13.md`

_exit 0, 58s_

PLT-13 introduces a Playwright harness for end-to-end testing. It creates one journey test with five placeholder steps (setup, project from sample, agent run, accept change, manuscript) that run against a temporary library and mock server. The plan integrates the test into CI, running `npm run e2e` and uploading traces on failure. Each step is a named, independently executable block assigned to specific owners and milestones.

### `plans/PLT-14.md`

_exit 0, 63s_

PLT-14 plans a two-stage Docker image build that fetches Pandoc 3.13 and Typst v0.15.1, compiles the Node.js application in a build stage, and produces a minimal runtime image with Node LTS, read-only packs, and a non-root user. The implementation will create a Dockerfile, .dockerignore, entrypoint.sh, and build-image.sh, with specific checks for image contents, security, and cross-architecture builds. Downstream plans PLT-15, PLT-16, PLT-17, and PLT-19 depend on the image and its tags. Acceptance criteria verify the image stages, runtime capabilities, entrypoint behavior, FTS5 queries, and native builds where possible.

### `plans/PLT-15.md`

_exit 0, 64s_

PLT-15 intends to compose Scriba with a Tailscale sidecar, sharing a socket and adding a healthcheck. It defines nine acceptance criteria covering service health, environment variables, socket access, DNS resolution, and version compatibility, with a detailed implementation and cleanup procedure. downstream plans PLT-16, PLT-17, and PLT-18 depend on this compose setup.

### `plans/PLT-16.md`

_exit 0, 78s_

PLT-16 plans to implement variant B of the Tailscale Serve mechanism by updating the compose configuration to remove the old serve config, add a timeout, and modify the containerboot wrapper. The code stage includes a mechanism retest (M1‑M4) and a post‑approval run to validate HTTPS, restart, and Serve health, while acceptance criteria remain partially unmet and downstream tasks are blocked until approval. Overall, the work aims to ship variant B after these checks pass, but several criteria including ST‑1’s HTTPS and restart checks are still deferred.

### `plans/PLT-17.md`

_exit 0, 65s_

PLT-17 details the implementation of a dispenser that prints a bash script to install the application via `docker run --rm -e SETUP=true bbartolome/scriba | bash`. The script handles version detection, image pinning, extraction of installer files, Docker Compose setup, health checks, and configuration. Five acceptance criteria ensure proper behavior under various conditions, supported by Vitest tests.

### `plans/PLT-18.md`

_exit 0, 73s_

The PLT-18 plan makes the installer support idempotent updates by backing up and merging .env files, replacing compose files, and validating compose version, while documenting update and rollback procedures. It updates scripts/entrypoint.sh to handle these flows and adds or modifies tests to cover criteria C1–C3 and extras E1–E6. The README is updated with install, update, and rollback sections, and the plan incorporates Navigator decisions and notes known limits.

### `plans/PLT-19.md`

_exit 0, 143s_

PLT-19 details a publish workflow with five jobs—plan, build, smoke, merge, and release—automating semantic release, native multi-arch Docker builds, and smoke testing. It defines acceptance criteria for versioning, Docker Hub publishing, and smoke checks, supported by comprehensive tests and rollback procedures for cancelled runs. The plan fixes prior issues and includes scripts for versioning, manifest checking, and smoke validation.

### `plans/PLT-20.md`

_exit 0, 59s_

The PLT-20 plan introduces an M1 layer examples check that validates project.yaml schemas, entity front matter, and samples.yaml structure while banning excluded paths and symlinks. It provides a CLI tool `scripts/examples-check/index.mjs` run via `npm run lint:examples` with comprehensive tests integrated into the lint workflow. The check outputs errors with file paths and messages, integrates with CI, and unblocks downstream graph and pack layers.

### `plans/PLT-21.md`

_exit 0, 41s_

PLT-21 adds a new layer to the examples check that validates all `graphs/` files by parsing them as JSON, confirming they match the graph schema, and verifying that any story node paths point to existing files in the sample. The layer is integrated into `scripts/examples-check/index.mjs` with its own test file, covering criteria for parsing, missing paths, schema violations, and samples without a `graphs/` folder. This change integrates with PLT-20 and enables parallel work on PLT-22 and recipe graphs while keeping CI passing.

### `plans/PLT-22.md`

_exit 0, 64s_

PLT-22 adds a pack layer to the examples check that validates entity schemas, resolves references and citations, and verifies tool recipe parameters. The plan modifies key files such as `pack.mjs`, `index.mjs`, `lib.mjs`, `pack-lint.ts`, and test files, following a procedure that builds the API and runs criteria tests C1–C5 and extra tests E1–E4. Successful completion passes all validation checks while maintaining backward compatibility.

### `plans/PLT-23.md`

_exit 0, 47s_

The plan fixes three e2e test failures caused by leftover library folders and user tools after specs, and a phone bottom nav overflow, by adding cleanup `afterAll` calls in six specs and updating comments, though the phone issue is blocked by SHL-23. It confirms the causes in isolated worktrees, applies the changes, runs full and individual tests, and verifies cleanup. The expected outcome is that all e2e tests pass, including the full suite and phone specs, after the fixes and pending SHL-23 work.

### `plans/PST-01.md`

_exit 0, 63s_

PST-01 defines the project-store contract slice, detailing its REST API routes, Zod schemas for projects, files, entities, pending changes, and errors, and the required files under `packages/contracts/src/project-store/`. It specifies the implementation of commands for CRUD operations, file handling, entity resolution, and conflict management, along with SSE events and error code mapping. The plan includes building, testing, and integrating the slice, with acceptance criteria verifying schema parsing, route constants, and status codes.

### `plans/PST-02.md`

_exit 0, 87s_

PST-02 is a plan to create a project store module and a path‑safety function that resolves and validates project paths, handling reserved paths, symlinks, and errors. It specifies the files to be added or modified, the implementation approach, test cases, and how the new functionality integrates with existing modules and settings. The plan also notes open questions, assumptions, and commitments to ensure the unit meets its criteria before moving forward.

### `plans/PST-03.md`

_exit 0, 60s_

PST-03 implements project discovery, listing immediate subfolders as projects or marking them importable, and provides New and Import endpoints to create and add projects. It defines validation rules for project.yaml, folder naming, and filesystem operations, and specifies a set of implementation files and tests to verify the behavior. The plan includes criteria for discovery, new project creation, import handling, and ensures the routes are protected by the existing auth guard.

### `plans/PST-04.md`

_exit 124, 300s_

**Failed:** see stderr; no summary produced.

### `plans/PST-05.md`

_exit 0, 48s_

The PST-05 plan implements a "start from sample" feature that copies a selected sample's files (excluding temporary paths) into a new project folder, sets the title, and handles errors such as missing or invalid samples. It involves creating new service and controller files, updating the project store module, and adding tests, with acceptance criteria covering copy behavior, startup emptiness, and sample list access. The unit depends on PST-03 and blocks UI, file gate, and fiction sample units, while being unblocked by PST-04 and others, and has several open points around activation, messaging, and layout folders.

### `plans/PST-06.md`

_exit 0, 59s_

PST-06 plans to implement a file API core with list, read, write, and edit operations, featuring atomic writes, hash verification, conflict detection, and BOM handling. The plan includes detailed acceptance criteria, a red-green implementation procedure with tests, and mutation checks, and unblocks PST-07, PST-10, and PST-12.

### `plans/PST-07.md`

_exit 0, 62s_

The PST-07 plan details the implementation of delete, move, updateProjectYaml, appendLog, and stateDir helpers in the project store service, including proper path handling, active project checks, and event publishing. It specifies code changes, testing strategy, mutation checks, and lint gate procedures to ensure correctness and compliance with existing modules and contracts. The plan integrates with Navigator decisions and includes acceptance criteria covering file operations, projections, and helper functions.

### `plans/PST-08.md`

_exit 0, 49s_

Plan PST-08 implements entity resolution and list functionality for the project store by scanning entities/ and sources/ directories, parsing Markdown files with front matter, and caching a manifest of files. It adds new service, controller, and manifest files, updates the project store module, and includes regression tests E1‑E5 plus extras X1‑X3. The new GET /entities and /entities/resolve endpoints return resolved content or typed errors, enabling downstream features such as graph running, tool registry, and search.

### `plans/PST-09.md`

_exit 0, 52s_

PST-09 describes adding a project picker UI at `/projects` with rows for each project status (active, invalid, importable, too-new) and actions such as Switch, Import, New, and Start from sample. The feature integrates the picker into the Shell's navigation slot via `ActiveProjectNav`, uses a shared `ProjectsState` service, and lazy-loads its route while copying contract types. Implementation includes unit tests for all statuses and flows, an e2e phone viewport test (E2), and a "project from sample" step in the journey, all of which must pass before merge.

### `plans/PST-10.md`

_exit 0, 54s_

PST-10 describes the implementation of a Files UI page that displays a tree of project files and a read-only Markdown preview. The page is accessible at `/projects/:projectId/files` and opens files via the `?path=` query parameter. Criteria cover tree rendering, file opening, preview rendering, and refreshing on `files-changed` events, with a phone variant that stays read-only. The plan involves creating new files, updating route definitions, and adding comprehensive tests.

### `plans/PST-11.md`

_exit 0, 47s_

Unit PST-11 plans to create a nonfiction sample skeleton in `examples/nonfiction/` with ten specific files including `project.yaml`, source notes, draft chapters, and an outline, following a strict method to ensure consistency with downstream units. The plan includes detailed acceptance criteria validating project schema, draft-outline alignment, and exclusion of prohibited folders, to be implemented by writing the files in a new worktree and running lint checks. Completion requires meeting all criteria before marking the unit done.

### `plans/PST-12.md`

_exit 0, 56s_

PST-12 adds comprehensive tests to verify the project store's files gate, ensuring all routes are protected by the global guard, GET requests are side-effect free, unauthenticated access is denied, and path safety checks work over HTTP. The unit creates a new test file with three tests (F1–F3) that validate these behaviors against the real API, and follows a detailed procedure including setup, invariant sweeps, and e2e checks. It depends on several preceding plans and unlocks downstream tasks such as PST-13 and PST-15.

### `plans/PST-13.md`

_exit 0, 45s_

Implement project-level FTS5 search indexing sources and entities with a disposable SQLite database per project, freshness via manifest diff, and POST endpoints for search and rebuild; queries match terms against indexed passages ranked by BM25 with snippets and offsets, while startup prunes orphan indexes and activation triggers refresh for active projects only.

### `plans/PST-14.md`

_exit 0, 46s_

Plan PST-14 describes adding a search box to the files page with scoped searches and result highlighting, including new contract copies, a search panel component, and modifications to the files page. It outlines nine implementation steps, three criteria tests (desktop search, scope toggle, mobile viewport), and required e2e validation. The effort involves creating several new files and editing existing ones while maintaining existing functionality.

### `plans/PST-15.md`

_exit 0, 54s_

The PST-15 plan details implementing a pending change store for project proposes, including validation, storage, and queue listing features. It involves creating new service and controller files while modifying existing modules and adding tests, with specific acceptance criteria for propose behavior and integration with downstream units.

### `plans/PST-16.md`

_exit 0, 51s_

PST-16 outlines implementing three-way conflict detection, accept/reject operations, and draft versioning in the project store. It introduces new helper modules for conflict computation, folder handling, and version storage, modifies pending and files services, adds accept/reject routes, and includes extensive tests. The plan defines detailed steps, acceptance criteria, and integration points with the store hook and event system.

### `plans/PST-17.md`

_exit 0, 68s_

Scriba is a monorepo containing an Angular web app, a NestJS API, shared contracts, and genre packs. It can be installed and updated via a Docker one-liner command. The project provides development instructions, module integration guidelines, and tailscale networking control.

### `plans/PST-18.md`

_exit 0, 102s_

PST-18 implements draft version listing, reading, and restoring functionality via new API endpoints, storing versions in drafts/.versions/ with timestamp-based IDs. The plan includes creating a DraftVersions service and controller, handling version creation on restore, and ensuring only top-level drafts have versions. Acceptance criteria are verified through automated tests covering list, read, and restore operations, including edge cases like missing drafts and reserved paths.

### `plans/PST-19.md`

_exit 0, 33s_

The PST-19 plan adds an optional file watcher service that monitors project directories for changes. When enabled via `SCRIBA_WATCHER`, the watcher debounces events, publishes `files-changed` messages, and triggers pending conflict updates without disrupting existing functionality. Implementation involves a new `ProjectWatcherService`, updates to the project store module, and extensive tests to ensure correct behavior across project switches, retargets, and disabled states.

### `plans/PST-20.md`

_exit 0, 60s_

PST-20 implements a review queue UI for pending changes with grouping by run or recipe run, actions (accept, reject, refresh, accept-anyway), conflict badges, and live updates. The feature includes phone venue support, merge view integration, and specific route endpoints under `/projects/:projectId/review`. Implementation involves creating contract copies, UI components, and comprehensive tests to validate all criteria.

### `plans/PST-21.md`

_exit 0, 40s_

The plan adds version history to the files page for top-level draft files, allowing users to view past versions and restore them through a confirmation step. It defines UI changes, new API endpoints for listing, reading, and restoring versions, and includes detailed criteria and tests for desktop and phone layouts. Implementation involves updates across the web and API codebases, with thorough unit and end‑to‑end testing to ensure correctness and responsiveness.

### `plans/PST-22.md`

_exit 0, 49s_

The PST-22 plan implements a review gate for project store changes, enabling agents to propose, accept, refresh, backup, and restore edits with full e2e coverage. It defines five criteria (C1‑C5) covering propose behavior, listing side effects, accept/refresh/backup/restore logic, phone UI review, and the e2e accept step passing. The work involves creating new test files, a mock scenario, modifying the journey e2e script, and running baseline and full e2e tests to validate the gate.

### `plans/PST-23.md`

_exit 0, 79s_

PST-23 plans to implement lazy, backed-up file migrations with a registry in the Project store, adding backups, logs, and rejection of too-new files while upgrading views on write. The detailed plan specifies changes to modules, a test kit for migration registration, and five test criteria covering activation, GET behavior, version checks, comment preservation, and migrator execution on first write.

### `plans/PST-24.md`

_exit 0, 42s_

The PST-24 plan adds an optional base64 bytes field to file write requests, enabling byte‑safe storage of binary files without UTF‑8 encoding. It updates the write schema, service, and atomic write logic to handle both text and base64 content while preserving existing checks and caps. A new test suite verifies round‑trip storage of binary data and that reads correctly refuse non‑text files with PROJECT_NOT_TEXT.

### `plans/PST-34.md`

_exit 0, 61s_

The PST-34 plan introduces direct file editing on tablet and desktop using the Shell's editor, with baseHash‑based saves and stale‑base conflict warnings, while phone devices show a read‑only preview. It defines decisions on editor visibility, reference stability, unsaved‑text guarding, and avoidance of reloads on file changes or orientation updates. Criteria and tests E1–E7 will verify that saves send the correct baseHash and that conflicts display the warning without losing author text.

### `plans/QUEUE.md`

_exit 0, 55s_

Scriba is a monorepo containing an Angular web app, NestJS API, and shared contracts. Installation and updates are managed via a Docker one-liner that handles compose files and image tags. Adding modules involves contract slices, API composition, and settings registration. Recovery procedures include resetting setup tokens and reconfiguring tailscale access.

### `plans/SAU-01.md`

_exit 0, 33s_

SAU-01 implements a contract slice for setup-auth functionality including Zod schemas, API routes, error codes, and example payloads, with full test coverage and integration into the contracts package. The implementation follows planned decisions and has been verified through build, test, and dependency checks. It provides the foundational types and validation needed for setup authentication flows.

### `plans/SAU-02.md`

_exit 0, 39s_

The unit adds a setup token store that generates a random 43-character token on first run, creates `.scriba/setup-token` (0600) and `.scriba/setup-url` (0600), prints the handshake URL to stdout, and validates the token in constant time. On restart it retains the same token and updates the URL with the current port; deleting the token file triggers a new token and URL. The token value is never logged except in the printed setup URL, and the token file and directory have strict 0600/0700 permissions.

### `plans/SAU-03.md`

_exit 0, 116s_

SAU-03 implements the setup authentication flow, including a handshake endpoint that issues a time-limited cookie for loopback hosts, an identity endpoint that validates the cookie, and a sign-out endpoint that expires the cookie. The implementation includes validation of tokens, proper cookie attributes, and security measures like Referrer-Policy and loophost restrictions. Tests cover token validation, cookie issuance, identity verification, and sign-out behavior, with criteria aligned to NestJS guards and middleware.

### `plans/SAU-04.md`

_exit 0, 58s_

SAU-04 implements a global guard and middleware that enforce authentication, host allowlist, origin validation, and CSP while exempting public routes and /healthz. The plan introduces new policy and middleware files, updates the setup-auth module and bootstrap, and adds tests that verify all security criteria.

### `plans/SAU-05.md`

_exit 0, 43s_

SAU-05 implements the `/status` GET and `/continue` POST endpoints for the setup authentication flow, returning current setup steps and completing setup when called. The status endpoint checks for a valid session cookie and reflects `access: 'done'` for authenticated users, while continue updates the `setupAuth` section in settings, marking steps as complete. The implementation depends on SAU-03 for cookie verification and SAU-04 for authentication guards, and is blocked until SAU-03 is merged on main.

### `plans/SAU-06.md`

_exit 0, 158s_

SAU-06 implements a setup page at `/setup` for authentication, handling identity verification, 401 errors, and tailnet identities with Continue functionality. The plan creates route configurations, UI components displaying status messages and system commands, and integrates with API endpoints for setup status and continuation. It includes unit tests for component behavior and an e2e test covering viewport requirements and error states, following decisions for code structure and error handling.

### `plans/SAU-07.md`

_exit 0, 74s_

SAU-07 proposes invariant tests to ensure GET requests don't mutate the library or emit events and that mutations are guarded, by adding new test files and enhancing the test harness to enumerate routes and seed fixtures. The plan involves creating `invariant-sweep.ts`, `invariant-probe.ts`, and test files for get-head and mutation guard scenarios, following decisions from SAU-04 and other units, with acceptance criteria requiring these tests to pass in CI. Some open points remain regarding certain routes and lint rules.

### `plans/SAU-08.md`

_exit 0, 62s_

SAU-08 describes a plan to implement a token-guard gate for setup-auth, adding unit tests for criteria 1‑6 and an e2e setup step for criterion 8. The work involves creating `apps/api/test/token-guard-gate.test.ts`, modifying `e2e/specs/journey.e2e.ts` to include a live setup step, and running lint, test, build, and e2e commands. Criteria 7 invariant tests are already present but CI validation is deferred, and criteria 6 and 7 are marked unticked due to environment limitations.

### `plans/SAU-09.md`

_exit 0, 38s_

SAU-09 implements a setup flow API with step management and preferences endpoints, including a `SetupFlowController`, `setStep`/`savePreferences` service methods, and a `PreferencesReader` provider. The changes add POST/GET routes for steps and preferences that perform field-level merges and respect stored values, while GETs remain side‑effect free. Tests verify step states, preferences persistence, reader accuracy, and idempotency, covering completion, partial updates, reader behavior, and non‑mutating GETs.

### `plans/SAU-10.md`

_exit 0, 32s_

The SAU-10 plan adds a compose version status check to the setup‑auth module, exposing the state (ok, mismatch, unknown) via a GET /api/setup-auth/status endpoint. It compares the runtime SCRIBA_COMPOSE_VERSION environment variable against the expected version, handling unset, older, equal, and newer cases. Implementation involves a new compose-status.ts file and changes to setup-status.service.ts, with tests and downstream integration in modules like SAU-15 and SAU-11.

### `plans/SAU-11.md`

_exit 0, 57s_

SAU-11 plans a five-step setup wizard with Access, Tailscale, Model providers, Preferences, and First project, supporting skip, completion, and a compose version warning. It details the component implementation, API changes, and e2e tests required to meet the acceptance criteria.

### `plans/SAU-12.md`

_exit 0, 35s_

Embed the Model providers panel into the setup auth step's providers step, showing the panel if the route exists or a link to /providers otherwise. The Continue button checks for a usable provider (app default set and listed) and writes 'done' or displays a message. Implementation requires creating copy files, modifying step-body.ts and setup-page.ts, and updating tests and e2e checks.

### `plans/SAU-13.md`

_exit 0, 44s_

SAU-13 adds a preferences step to the setup flow where users can update their author name and default genre pack, with the step reusing the existing preferences form and integrating the shell's theme toggle. The implementation updates the setup contract, step body, and page components to handle stored values, partial saves, and step completion, while writing only changed fields. Comprehensive tests verify prefilling, save behavior, theme toggle, and integration with existing steps.

### `plans/SAU-14.md`

_exit 0, 51s_

SAU-14 plan implements the first-project step in the setup flow, allowing users to create new projects, start from samples, or import existing projects. The step carries default genre packs, handles activations separately, and marks itself complete after successful operations. Implementation involves new files and edits to integrate with project store APIs and includes tests for all user flows.

### `plans/SAU-15.md`

_exit 0, 73s_

SAU-15 outlines building the settings page with user controls for identity, preferences, providers, and version info, along with recovery documentation. The plan involves creating several new files and updating routes and docs, followed by tests to verify functionality and documentation. Development is structured in phases with red and green test stages.

### `plans/SAU-16.md`

_exit 0, 43s_

The SAU-16 plan implements a gate for the setup‑flow phase by adding API tests and modifying the e2e journey to validate end‑to‑end setup and project creation through /setup. It specifies six criteria with associated tests, a step‑by‑step procedure for local and CI execution, and identifies downstream effects and open items awaiting resolution.

### `plans/SAU-17.md`

_exit 0, 53s_

SAU-17 implements a LocalAPI client that fetches Tailscale status over a Unix socket and normalizes it into a structured endpoint. The unit creates new source files, fixtures, and tests, modifies the setup-auth module, and follows a step-by-step procedure with three acceptance criteria. Normalisation rules handle various Tailscale states with caching, and the plan outlines downstream dependencies and handoffs to SAU-18, SAU-20, and SAU-21.

### `plans/SAU-18.md`

_exit 0, 45s_

SAU-18 will implement a tailnet guard path that authenticates requests via Tailscale headers, skips cookie checks for tailnet hosts, and enforces origin checks for mutations, returning specific error codes. The changes span request-policy, setup-auth.guard, setup-auth.module, related controllers, bootstrap, and test files, adding five new tailnet acceptance tests. The plan coordinates with downstream units SAU-19, SAU-21, SAU-20, and SAU-22 to ensure consistent behavior and future devMode support.

### `plans/SAU-19.md`

_exit 0, 34s_

The SAU-19 plan implements an owner allowlist feature to restrict tailnet access by enforcing a list of approved logins. When enabled on an empty list, it automatically seeds the owner's login. The implementation adds allowlist checks in the setup-auth guard, modifies the status service to handle seeding and validation, and creates new API endpoints for managing the allowlist. Specific criteria include preventing lockouts when the current user would be excluded, providing appropriate 403 errors, and ensuring loopback requests bypass the check. Tests verify all authorization scenarios including seeding, lockout protection, and proper refusal messages.

### `plans/SAU-20.md`

_exit 0, 42s_

The SAU-20 plan implements Tailscale status and allowlist UI on the /setup wizard step and settings page, displaying states such as unavailable, logged out, waiting for login, and running with relevant links and hints, and includes polling every 5 seconds while visible. It introduces dedicated panels (TailscalePanel and AllowlistPanel) with controlled loading, error handling, and read-only allowlist lists, integrating them through updated contracts and step definitions. The work involves specific file changes and passes new component tests (W3, S2, S3) that verify state rendering, toggle behavior with lockout errors, and polling coverage, while depending on completed upstream units.

### `plans/SAU-21.md`

_exit 0, 54s_

The SAU-21 plan verifies the tailnet gate by adding a new test for criterion 1, updating the RUNBOOK and setup‑auth module docs, and running socket and tailnet checks on macOS (and optionally Linux) via Docker Compose. It outlines a two‑part procedure: part 1 creates the test and documents the checks without Docker; part 2 deploys a temporary stack, performs socket smoke tests, tailnet host verification, and records results. Acceptance criteria include tailscaled status, host forwarding, login flow, and socket permissions, with results written to the RUNBOOK and module table. Completion of all criteria closes the tailnet phase.

### `plans/SAU-22.md`

_exit 0, 52s_

The SAU-22 plan implements a dev mode guard that activates when SCRIBA_DEV_AUTH=1, skipping origin checks and assigning a loopback identity to non-tailnet hosts, with updates to environment parsing, request policy, and guard logic. It includes new tests and documentation, modifies eight files in the API and contracts, and validates the flag's handling including production refusal. The work aligns with completed SAU-18 and SAU-19 tasks and does not unblock other units.

### `plans/SHL-01.md`

_exit 0, 57s_

The SHL-01 plan implements the shell's composition root and routing structure, detailing file changes such as `app.config.ts` and `app.routes.ts` to set up providers, routes, and a not-found page. It defines a development method with acceptance criteria covering the dev server, browser checks using Playwright, and proxy echo validation. The plan resolves dependencies like ngx-markdown and configures external Playwright dependencies, while leaving open points for browser launch and KaTeX integration.

### `plans/SHL-02.md`

_exit 0, 42s_

SHL-02 will implement a typed API client in the Shell, with `get`/`post` methods returning parsed observables and dedicated error classes for platform errors, schema mismatches, and network failures. The plan creates `api-error.ts` and `api-client.ts`, updates `tokens.ts` and `index.ts`, and adds `api-client.spec.ts` with eleven tests. All changes are validated through builds, linting, and tests, ensuring no runtime zod and correct 401 handling.

### `plans/SHL-03.md`

_exit 0, 81s_

SHL-03 outlines the implementation of a singleton SSE client that opens a single EventSource to /events, demultiplexes messages by module, and maintains connection state with automatic reconnection and server reachability signals. The plan writes new files including sse-client.ts and sse-envelope.ts with hand-written contract checks, updates shell tokens and app configuration to provide the client, and includes 12 unit tests covering unknown modules, reconnection ticks, and recovery scenarios. It verifies the implementation through parity tests, budget checks, and a dev stack validation, while noting open points such as undeclared contracts dependencies and unknown feature type handling.

### `plans/SHL-04.md`

_exit 0, 38s_

SHL-04 implements a device-local light/dark theme toggle with system preference fallback using CSS variables and data-theme attributes, plus a Notices service for banners and snackbars. The solution stores preferences in localStorage, integrates via App component injections, and ensures themes persist across reloads without server calls. Implementation follows eight acceptance criteria covering theme switching, notice rendering, and proper UI integration in the shared app area.

### `plans/SHL-05.md`

_exit 0, 71s_

SHL-05 introduces device‑class detection via CDK Breakpoints, providing a `DeviceClassService`, `deviceClassGuard`, and `withDeviceGate` to conditionally match routes based on phone, tablet or desktop viewports. It adds generated fallback pages for views that require a larger screen, integrates notices for unmet minimum classes, and updates the app’s navigation and layout to reflect device‑specific views and forms. The plan includes extensive unit and browser tests across multiple viewport sizes to verify routing, gating, navigation content, icons, and layout, with Acceptance Criteria ensuring correct behavior on phones, tablets, and desktop.

### `plans/SHL-06.md`

_exit 0, 51s_

The SHL-06 plan implements a toolbar connection status indicator and a “server unreachable” banner that appears when the server is unreachable and clears when it recovers. It involves creating a `ConnectionStatus` component, updating the app’s HTML and TypeScript files, modifying the dev proxy configuration and scripts, and adding new spec tests to verify the behavior. The plan defines acceptance criteria through unit tests, a dev stack browser check, and a production build verification, with several open points regarding timing and edge cases.

### `plans/SHL-07.md`

_exit 0, 47s_

SHL-07 introduces test doubles—fake API client and event source—to enable isolated unit testing of the Shell's functionality. It creates four new files in `apps/web/src/app/shell/testing/` that implement these fakes, a dummy feature, and their tests, covering API response mocking, schema validation, event simulation, and integration with Angular's testing harness. The plan specifies acceptance criteria and validation steps to ensure the fakes behave like the real clients while remaining independent of backend services.

### `plans/SHL-08.md`

_exit 0, 63s_

The SHL‑08 plan implements landing redirects, an active‑project signal, and project‑route reconciliation in the shell module. It creates new files for contract chunks, copies, guards, and the switch page, modifies route configuration and app initialization, and follows decisions on dynamic imports and hand‑written contract data. Tests cover setup status, project switching, and event‑driven navigation, while the work stays within the initial bundle budget and aligns with downstream units such as SHL‑09 and SAU‑01.

### `plans/SHL-09.md`

_exit 124, 300s_

**Failed:** see stderr; no summary produced.

### `plans/SHL-10.md`

_exit 0, 129s_

SHL-10 plans to implement a presentational `ToolCallCard` component with a `ToolCallView` model, handling tool calls, status, arguments, output, and sources, with responsive behavior and integration of SHL-11's Markdown preview. The unit involves creating new files for the card and view model, updating shell exports, writing tests, and following a detailed step-by-step development process including linting, building, and bundle checks. It depends on shared components and other units, and follows decisions on implementation details such as collapsed state, markdown rendering, and source linking.

### `plans/SHL-11.md`

_exit 0, 103s_

The SHL-11 plan implements a MarkdownPreview component that hides leading front matter and escapes raw HTML, with new component and test files and a possible swap into the tool-call card. It defines 25 acceptance criteria covering front matter parsing, raw HTML handling, sanitisation, and build constraints, and records all decisions and facts. The unit is marked done after implementation and review.

### `plans/SHL-12.md`

_exit 0, 86s_

SHL-12 plans to build a read-only diff view component using @codemirror/merge, creating new files for the component, its tests, and a DOM range stub while updating package dependencies and the barrel index. The work follows a staged code process with installs, commits, and automated tests, and includes eight open points such as package versions and UI details. Overall, the plan delivers an integrated diff view ready for downstream components and future enhancements.

### `plans/SHL-13.md`

_exit 0, 96s_

The SHL-13 plan describes building a standalone `MarkdownEditor` component with CodeMirror 6 that loads and saves markdown files losslessly, preserving BOMs and dominant line separators. It defines inputs (`reference`, `readOnly`) and outputs (`contentChange`, `dirtyChange`, `saveStateChange`, `errorChange`), reads via the typed file API, writes via the API, and uses hand‑written copies instead of runtime zod. Implementation includes new files for document extensions, editor logic, and specs, updates to project‑store copies, and adds the necessary Codemirror packages, with a detailed incremental development plan and test criteria.

### `plans/SHL-14.md`

_exit 0, 48s_

The SHL-14 plan implements debounced and explicit saving with a single in‑flight write, managing states such as saved, unsaved, saving, failed, and conflict. It adds guards for navigation and reference changes that flush unsaved text and prompt the user before leaving, and introduces an unsaved‑text registry and confirm function. The work updates the markdown editor component, adds new files `unsaved-text.ts` and `unsaved-text.spec.ts`, and extends tests to cover all specified criteria while keeping existing SHL‑13 functionality.

### `plans/SHL-15.md`

_exit 0, 49s_

SHL-15 plans to implement an editor layout component that displays a split view with live preview on desktop/tablet and a toggle on phone, wrapping the existing markdown editor and preview while keeping the feature lazy‑loaded. The work involves adding new component files, updating barrel exports and project‑store imports to maintain the bundle budget, and writing unit and e2e tests for the layout, device‑class handling, and touch interactions. Success is measured by criteria covering responsive behavior, dark theme, and execution of the touch editor test as the final e2e spec.

### `plans/SHL-16.md`

_exit 0, 69s_

SHL-16 makes the proposed side of the merge view editable while emitting edited text via `contentChange`, handles CRLF line endings with a diff override to show visible changes, and preserves read-only mode behavior from SHL-12. The plan includes new tests (C1, C3, C4, C6, E1) to validate editing and line ending visibility, follows decision D9 (option e), and is blocked on merging to enable the review queue.

### `plans/SHL-17.md`

_exit 0, 77s_

SHL-17 implements a Progressive Web App feature including web manifest, icons, and Angular service worker configuration with route exclusions. It adds a reload prompt mechanism for new versions and offline server unreachable handling. The plan details specific file changes, a PwaUpdate service, and requires e2e tests to verify installability, cache behavior, and update prompts.

### `plans/SHL-18.md`

_exit 0, 37s_

The SHL-18 plan adds an About panel to the /core-gate page that displays app version, revision, and health fetched from platform endpoints, along with documented keyboard shortcuts for navigation and editor save. It introduces loading skeletons and empty states for the switch page, landing, and nav when no features are registered, and implements Alt+`/` shortcuts to move between navigation entries and trigger editor saves. Component tests verify skeletons, empty states, shortcut behavior, and integration with the core gate page.

### `plans/SHL-19.md`

_exit 0, 51s_

The SHL-19 polish gate plan adds an axe-core accessibility pass scanning six Shell areas in light and dark themes via a new Playwright test, and a phone viewport e2e test covering bottom navigation, review, and typing in the editor. It modifies diff components to include accessible labels for read-only sides and updates dependencies to include @axe-core/playwright. The acceptance criteria are verified by new and existing tests, with detailed steps for setup, execution, and validation.

### `plans/SHL-20.md`

_exit 0, 45s_

SHL-20 plan fits the toolbar on a 390‑px phone screen by adding a device‑class attribute to the toolbar, applying CSS rules to wrap and size it properly, and verifying the layout with a new Playwright e2e test that checks the toolbar’s items and connection label at 390×844 pixels. The plan involves editing app.html to bind the device class, updating app.css with a phone‑specific rule, and creating e2e/specs/phone-toolbar.e2e.ts to assert the toolbar fits without scrolling and with the connection label visible in both reconnecting and closed states. After implementing these changes, automated tests will confirm the toolbar remains fully inside the viewport and non‑scrolling at the specified resolution, and the plan will be merged once the tests pass.

### `plans/SHL-21.md`

_exit 0, 62s_

The SHL-21 plan modifies the shell's contract loader to async-load CommonJS modules and use `mod.default ?? mod` to handle default exports. It adds a new Vitest spec that tests both named and default-only contract shapes. This change enables SAU-08's setup status feature to proceed.

### `plans/SHL-22.md`

_exit 0, 33s_

Plan SHL-22 introduces explicit 5000 ms timeouts for vi.waitFor calls across four spec files and defines a shared LOAD_WAIT constant, adjusting per-test timeouts where needed. The plan outlines a detailed procedure including branching, editing, formatting, running tests, and validation steps to ensure the changes pass all criteria.

### `plans/SHL-23.md`

_exit 0, 40s_

The SHL-23 plan modifies app-nav.ts CSS to fit ten navigation items at 390px width by adding min-width: 0 and label truncation, creates a new Playwright test spec to verify no overflow and visible truncated labels, and runs regression tests to ensure the implementation works correctly across different screen states.

### `plans/TRG-01.md`

_exit 0, 141s_

TRG-01 is a completed contract slice for the tool-registry that defines schemas and behaviors for tools. It implements ten new files covering specifications, views, linting, errors, and routes. All decisions have been resolved and the unit integrates with downstream components like TRG-02 and GRR-01.

### `plans/TRG-02.md`

_exit 0, 50s_

TRG-02 plans to implement the tool-registry module that emits three views (function schema, form, ports) using Ajv validation against a fixture-backed tool read. It defines input processing, port handling, and error messages, and implements GET/POST routes for tool details and validation, with acceptance criteria covering valid and invalid arguments, defaults, and entity references. The plan outlines file creation, dependency upgrade, testing, and integration with existing modules.

### `plans/TRG-03.md`

_exit 0, 48s_

TRG-03 develops an Angular tool-form component for form and node-body layouts with all control types, defaults, and issue handling. It creates three files—tool-form.ts, tool-registry.routes.ts, and tool-form.spec.ts—following detailed decisions on data structures and rendering. Implementation includes value handling, issue reporting, and integration with the Graph runner, validated by Vitest tests.

### `plans/TRG-04.md`

_exit 0, 45s_

TRG-04 will add entity and style pickers to the tool registry form, filtering entities by kind and defaulting the style picker to the project's styleProfile. A new `entity-picker` component with Angular CDK drag-and-drop will handle single and list selections, replacing read-only slots in `tool-form`. The plan includes new files, updates to copies and tests, and depends on completed upstream tasks.

### `plans/TRG-05.md`

_exit 0, 48s_

TRG-05 spikes a `/tools` preview route showing a tool fixture in form and node-body layouts, with running-app checks via Playwright e2e tests and a spike note. The work involves creating new files for the preview page, tool copies, routes, and tests, following a defined procedure for setup, building, testing, and manual verification. Acceptance criteria ensure the API drives both layouts, the picker handles entity chips, validation works, schema is correct, and the note is committed. The spike validates the preview in the running app and informs downstream development.

### `plans/TRG-06.md`

_exit 0, 113s_

TRG-06 aims to build a pack loader that integrates built-in and user packs, handles schemaVersion migration, and manages tool and entity type registration. The implementation requires edits to catalog.service.ts, packs.ts, and entity-types.ts, plus new fixture tools and test updates to verify loading, versioning, and overrides. Acceptance criteria ensure tools are listed correctly, invalid or outdated packs are rejected with appropriate errors, user tools shadow built-ins, and entity types validate nested fields. The plan includes incremental steps to write code, run tests, build, and lint, culminating in a working catalog service without regressions.

### `plans/TRG-07.md`

_exit 0, 91s_

TRG-07 plans to implement a full lint rule set, a pack-lint CLI, and a library entry point for tools and entity types. It requires creating new files such as lint.ts and pack-lint.ts, modifying packs.ts, entity-types.ts, and catalog.service.ts, and adding 21 rule-specific fixtures, with detailed steps for development, testing, and integration. The plan includes comprehensive tests for each rule and notes dependencies on downstream units such as TRG-09, TRG-10, and PLT-22.

### `plans/TRG-08.md`

_exit 0, 39s_

TRG-08 plans a pure template engine that parses and renders templates with `{{field}}`, `#each`, `#if`, `{{entity}}`, and `{{toolCatalog}}` tags, providing positioned diagnostics and standalone-line handling. It will create `template.ts` with `parseTemplate`, `templateVariables`, and `renderTemplate` functions, and `tool-registry-template.test.ts` with four tests covering the core criteria. Implementation follows a defined procedure of setting up a worktree, writing and testing the code, building, and committing the changes.

### `plans/TRG-09.md`

_exit 0, 58s_

TRG-09 implements a persistent tool enable/switch system that excludes disabled tools from functions while keeping them in the registry across restarts. The plan includes services for switch management, catalog updates, and active genre handling, along with tests verifying endpoints, functions, and enable behavior.

### `plans/TRG-10.md`

_exit 0, 50s_

The plan introduces lint, save, and delete endpoints for the tool registry, enabling users to lint, save, and delete tool specifications. Save writes user tool files atomically, validates YAML, and publishes catalog-changed events; delete removes user copies or returns errors for built-in or missing tools. Lint checks tool specifications and returns diagnostics, while invariant tests ensure route and event handling remain correct.

### `plans/TRG-11.md`

_exit 0, 38s_

TRG-11 adds a test verifying unauthenticated requests to registry routes are refused with 401, documents the catalog service interface, and will close the loader-validation phase once blocker criteria are satisfied.

### `plans/TRG-12.md`

_exit 0, 48s_

The TRG-12 plan adds an ExecutorService that renders and executes tools, handling validation, entity resolution, and model calls while returning output and used sources. It modifies executor.service.ts, validate.ts, tools.controller.ts, and tool-registry.module.ts, adds new test files and fixtures, and defines system messages and error codes for disabled, invalid, unresolved, and kind-mismatch cases. Acceptance criteria ensure correct rendering, execution with draft output, proper error handling for malformed arguments, disabled tools, aborts, and entity kind mismatches through integrated tests.

### `plans/TRG-13.md`

_exit 0, 69s_

TRG-13 outlines a plan to build a tools list page that groups tools by origin, shows validity and lint counts, and includes enable toggles that refresh on catalog changes and adapt to phone view. The implementation involves creating new files such as `tools-list.ts`, updating route definitions and tool copies, and following a detailed procedure with unit and e2e tests. The plan resolves previous open points, builds on TRG-05 work, and has been revised through multiple versions with specific coding and testing steps.

### `plans/TRG-14.md`

_exit 0, 55s_

TRG-14 plans to add a CodeMirror 6 YAML editor with linting to the tool registry UI, introducing Source and Compare tabs and actions for Customize, Revert, New, Duplicate, and Delete. The implementation involves new frontend components, backend routes for builtin/user tools and linting, draft handling, diff viewing, and extensive unit and e2e tests. It builds on existing TRG‑13 functionality and integrates with the shell's unsaved‑text and diff‑view features.

### `plans/TRG-15.md`

_exit 0, 41s_

Live previews will be added in the tool detail’s Source tab beside the editor, with four tabs (form, node, function schema, rendered prompt) that show live updates as the YAML is edited. The panel uses the editor’s `linted` output, including an optional inline source field, to render the tool’s prompt with resolved entities and styles without saving any changes. Implementation extends the render request schema, updates the catalog and executor to handle inline source, and adds new UI components and tests while reusing code from TRG-16 and TRG-14.

### `plans/TRG-16.md`

_exit 0, 49s_

The TRG-16 plan adds a 'Try' tab to the tool detail UI for running tools against the active project. It implements a `ToolsTryPanel` component that resolves entities, fills missing style fields, calls the execute endpoint, and shows output and sources, with corresponding changes to `tools-list.ts` and related files. The plan includes unit and e2e tests, handles errors and edge cases, and depends on completed tasks TRG-12, TRG-13, and PST-12 while unblocking TRG-17.

### `plans/TRG-17.md`

_exit 0, 44s_

TRG-17 defines an editor‑ui gate that closes the tool registry’s editor‑ui phase once gates TRG‑13 through TRG‑16 and the GNP‑12 workhorse golden tests pass on main. The gate adds no code or tests and requires implementers to tick two checklist items in `units/TRG-17-editor-ui-gate.md` after the criteria are satisfied. Criteria involve running existing e2e and unit tests, confirming draft outputs cite source files, and ensuring no pending writes. Merging the gate sets its status to done and records the result.

### `scripts/eval-agent/README.md`

_exit 0, 22s_

The `run.mjs` script manually evaluates the Agent loop by executing it against local model cases and generating detailed reports of outcomes, failure modes, and citation presence. It accepts command-line arguments to specify models, cases, and directories, creates temporary projects from sample files, runs each agent case up to 10 minutes, and stops the API afterward. Each case is a JSON file that defines a sample project, user intent, and expected conditions such as completion reason, used tools, and citation presence. The script writes per-run JSON reports containing results, citations, and any errors, and uses exit codes to indicate success or usage errors.

### `units/AGL-01-contract-slice.md`

_exit 0, 35s_

AGL-01 defines the contract slice for the agent loop phase, specifying data shapes for start/stop requests, stream events, run state, grounding results, and transcripts. It requires Zod schemas with inferred types for all structures and includes contract tests validating each schema. The slice enables integration with Shell, project store, and compile/export functionality through subpath imports.

### `units/AGL-02-tool-framework-file-reads.md`

_exit 0, 50s_

AGC-02 implements a tool framework with Ajv validation for file tools including list_files and read_file, producing readable errors for invalid arguments. It includes retry logic allowing two consecutive failures before withdrawing a tool on the third consecutive failure, resetting the count on valid calls. Tools use project-relative paths via the Project store API and reject external paths with readable errors. The acceptance criteria verify path safety, error formatting, and the retry/withdrawal behavior.

### `units/AGL-03-loop-core.md`

_exit 0, 20s_

The loop core initiates agent runs tied to the active project, allowing only one run per project and streaming steps with model calls and tools while enforcing a step cap. It supports stopping or continuing runs, cancels on project switches or provider errors, and returns specific error messages when no provider is configured. Throughout the run lifecycle, structured events are emitted to track progress and outcomes.

### `units/AGL-04-transcripts-history.md`

_exit 0, 21s_

Agent runs are logged as plain-file transcripts in JSON Lines format within `logs/agent-runs/`, using project-relative paths and excluding sensitive data. Conversation history is reconstructed from these transcripts to enable cross-device continuity, and context trimming reduces oldest tool results first before dropping turns when context limits are exceeded, always retaining the current intent and system prompt.

### `units/AGL-05-current-run-state.md`

_exit 0, 20s_

The AGL-05 document defines a `GET /api/agent-loop/runs/current` endpoint that returns the active or latest agent run’s status, steps, accumulated text, cards, grounding results, pending changes, and `lastSeq`. Clients that reconnect fetch this state, replace their view, and apply only events with sequence numbers greater than `lastSeq` to reconcile differences. State is maintained in memory for the current and most recent runs and restored from the transcript after a restart, with the endpoint being side‑effect free, satisfying the acceptance criteria.

### `units/AGL-06-agent-settings.md`

_exit 0, 16s_

The agent settings section defines a configurable API for agent loop parameters, including step cap and research enablement, with default values and validation. It registers the settings via a platform hook, supports GET and POST endpoints, and persists changes across restarts. Acceptance criteria ensure defaults are applied, only valid modifications persist, and invalid values trigger validation errors.

### `units/AGL-07-chat-panel-ui.md`

_exit 0, 24s_

AGL-07 defines the chat panel UI for agent loops, providing a lazy route for project conversations with streaming tokens, a stop button, step counter, settings sheet, and tool-call cards that integrate the Shell's shared card. It manages reconnection by replacing the view from run-state and applying only events with higher sequence numbers, and adapts to phone layout with one column and collapsed cards. The module depends on AGL-01 and Shell phases SHL-09/SHL-10 but runs parallel with other agent loop components.

### `units/AGL-08-file-tools-chat-gate.md`

_exit 0, 25s_

AGL-08 establishes the file-tools-chat gate, aiming to mock the "summarize my outline" interaction using file listing and reading tools. It defines scope, dependencies, and acceptance criteria, requiring the command to work with visible tool calls and an e2e agent run test in CI. The planned demo shows starting from a sample, invoking the command, observing the conversation on phone, and reviewing logs.

### `units/AGL-09-narrative-tools.md`

_exit 0, 15s_

AGL-09 implements narrative tools by loading enabled tools' function schemas and resolving entity/style references before execution. It records citations and draft provenance for each tool call, including sources used, and displays this information in chat cards and transcripts. The acceptance criteria verify that disabled tools are omitted, unknown entities yield readable errors counted as retries, and all drafts carry provenance data.

### `units/AGL-10-search-notes.md`

_exit 0, 16s_

The `search_notes` tool calls the project store's search contract to fetch ranked passages from a temporary project's `sources/` directory (excluding `drafts/`), returning the results as project-relative paths. It accepts a query with optional limit and scope parameters. The tool satisfies its acceptance criteria by providing ranked passages in scripted turns and returning readable errors for invalid arguments.

### `units/AGL-11-narrative-gate.md`

_exit 0, 22s_

AGL-11 sets the narrative‑tools gate for milestone M2, mocking agent‑driven calls of the four workhorses (cold open, mystery question, myth‑buster, numbers‑to‑people) and optionally extending e2e tests with a registry tool call. Each workhorse must generate drafts that cite source files, and the AGL‑09 and AGL‑10 criteria are already satisfied. A short demo shows the agent drafting a cold open about a note on the 10,000 hour idea, displaying entity IDs and sources, and demonstrates that disabling myth‑buster prevents the agent from calling it.

### `units/AGL-12-write-overlay.md`

_exit 0, 23s_

Agent writes and edits are kept in a run overlay and captured base instead of on disk. At the end of any run, the agent proposes these changes to the project store with origin and provenance information. This ensures pending changes are preserved across stopped or switched runs and that edit mismatches are handled correctly.

### `units/AGL-13-output-routing.md`

_exit 0, 36s_

Output routing determines where tool results are stored: drafts in drafts/ after grounding check, entities in entities/, graphs in graphs/ after validation (invalid graphs cause retries with errors), and claims/checks appear as cards only. Tools must support optional target arguments for file outputs. Valid graph outputs become pending changes, while invalid graph outputs return validation errors.

### `units/AGL-14-diff-previews-review-link.md`

_exit 0, 13s_

The AGL-14 plan defines diff previews for write cards and a review‑queue link, deciding to include diffPreview {path, base, proposed} in tool‑call results and render diffs via the read‑only diff view while adding a /review link after a run with pending change IDs. Acceptance criteria require component tests to show the diff and link, and ensure proper phone viewport behavior.

### `units/AGL-15-pending-writes-gate.md`

_exit 0, 22s_

AGL-15 establishes the pending-writes gate for the agent loop's phase:pending-writes, covering an end-to-end accept-change step with the Project store where an agent edit creates a pending change that is later accepted and saved to disk. The gate depends on AGL-12, AGL-13, AGL-14, and PST-22, runs parallel with AGL-16–AGL-19, and unblocks AGL-20. Acceptance criteria require that no writes reach disk before acceptance, that multiple edits consolidate into a single pending change, that stopped runs still produce changes, and that propose-graph valid/invalid handling and the change appearing in the draft are satisfied.

### `units/AGL-16-grounding-engine.md`

_exit 0, 22s_

The grounding engine extracts factual claims from a draft, retrieves relevant passages from source files, and judges each claim as supported, weak, or unsupported by ensuring supported or weak verdicts cite only retrieved passages—claims with no retrieved passages or invalid citations are marked unsupported. It produces a result with a content hash and writes a claims artefact as JSON to the project store. Acceptance criteria guarantee that unsupported claims are correctly identified, citations are validated, and malformed extract data are retried.

### `units/AGL-17-grounding-wiring.md`

_exit 0, 11s_

The grounding wiring design specifies that checks automatically run after every draft tool output and for paths touched by the overlay, producing a grounding summary stored in the pending change before other operations. It also defines an on-demand `check_grounding` tool and a UI action that trigger a grounding check, generating `grounding-result` events and artifacts. Additionally, it establishes transcript sections and event notifications for grounding start and results.

### `units/AGL-18-grounding-badges-ui.md`

_exit 0, 33s_

Grounding badges UI feature summary chips on draft cards showing claim status counts. Expanding chips display per-claim verdicts with text, icons, colors, passage snippets, and source file links. A 'Check grounding' action triggers an on-demand endpoint, with phone design ensuring collapsed chips and ≥44px tap targets.

### `units/AGL-19-grounding-sample-draft.md`

_exit 0, 54s_

AGL-19 adds a nonfiction sample draft containing claims that are supported, weakly supported, or unsupported by sources, including at least one invented statistic. The draft's claims must not contradict claim entity statuses (GNP-11), and scripted extract and judge turns are added to mock openai fixtures. Acceptance criteria require the examples check to pass and the draft to validate against the mock, producing all three claim verdicts with source citations.

### `units/AGL-20-grounding-gate.md`

_exit 0, 24s_

AGL-20 is the grounding gate task for milestone M3, closing the agent's phase:grounding loop. The acceptance criteria require that invented statistics be flagged unsupported, supported claims cite retrieved sources, the claims artifact matches the contract with a content hash, and badges render properly on phones. A demo under five minutes shows starting from a sample, tapping "Check grounding" to view badges and source citations, expanding a claim, and asking the agent to draft a paragraph whose grounding check runs automatically.

### `units/AGL-21-web-search.md`

_exit 0, 15s_

The document specifies a research toggle and web_search tool that integrates with a SearXNG-compatible endpoint. web_search requires both research to be enabled and an endpoint to be configured, defaulting to no research tools when disabled. Chat panel settings control these features, and acceptance criteria ensure proper tool availability and search functionality against a local SearXNG stub.

### `units/AGL-22-fetch-page.md`

_exit 0, 8s_

The `fetch_page` tool will retrieve HTTP(S) pages while refusing to connect to loopback, private, tailnet, or host.docker.internal addresses—even after redirects—and will truncate overly large or slow responses. Fetched content is returned as readable text but marked untrusted and must be explicitly written to `sources/` before it can be used for grounding. Acceptance tests verify these refusals, caps, and untrusted marking work as specified.

### `units/AGL-23-research-gate.md`

_exit 0, 18s_

AGL-23 defines a research gate that closes the agent loop's research phase. Its acceptance criteria ensure that when research is off, no research tools are sent to the model; when on, searches and fetches operate only against a local test server and reject loopback, private, tailnet, and host.docker.internal addresses, including after redirects. Fetched text is not used as grounding evidence until it is explicitly accepted into sources.

### `units/AGL-24-compile-tools.md`

_exit 0, 19s_

Unit AGL-24 defines compile tools assemble_manuscript, run_preflight, and export_manuscript that invoke the compile&export API in-process and return result cards, while excluding reorder and snapshot restore functions. It ensures the agent loop's compile phase completes without calling the graph runner and that exports produce the same results as from the manuscript view. The unit meets acceptance criteria by showing preflight checks as cards, consistent exports, and by not triggering any recipe runs or graph execution.

### `units/AGL-25-manual-eval-script.md`

_exit 0, 16s_

The manual eval script for the agent loop runs tests against local models to capture failure modes like malformed calls, withdrawals, and step caps, recording citations and outcomes in a report. It uses separate data files for each case, allowing additional tool‑specific tests to be added without code changes, and outputs Markdown or JSON results. The script meets acceptance criteria by executing the "summarize my outline" case and enabling new cases through simple data files documented in its README.

### `units/AGL-26-research-no-endpoint.md`

_exit 0, 21s_

If research is enabled but no search endpoint is configured, only the `fetch_page` tool is offered; `web_search` requires both research to be enabled and a valid endpoint. By default, `agent.research.enabled` is false, which hides all research tools unless explicitly turned on. The unit's acceptance criteria confirm that with research on and no endpoint, only `fetch_page` is provided.

### `units/CEX-01-contract-slice.md`

_exit 0, 18s_

CEX-01 establishes the contract for compile‑export, detailing shapes such as manuscript status, parts, order entries, export settings, and related structures. It defines request types, preflight checks, export formats, snapshot handling, and SSE events, and requires the subpath to build and export only shapes while integrating with API and web. Zod validations ensure correct values, and the project.yaml schema is narrowed to OrderEntry[] and ExportSettings, supporting optional fields and maintaining CI compliance for nonfiction samples.

### `units/CEX-02-effective-order-view-model.md`

_exit 0, 19s_

The module specifies how top-level draft files are ordered and how word counts are computed, using parts, project.yaml order, and story graph edges with cycle fallback. It collects manuscript files, partitions them by part, and applies graph‑derived precedence when available, otherwise falling back to project.yaml or alphabetical order. Word counts are derived from the body text after stripping markup, and a GET endpoint returns a view model containing file details, totals, order source, and warnings.

### `units/CEX-03-order-writes.md`

_exit 0, 16s_

CEX-03 defines a system for ordering, status, and part writes with optimistic concurrency using revisions to prevent conflicts. Reordering must be a permutation that preserves graph‑ordered files, and writes fully materialize the effective file order while updating only the `order` key in `project.yaml`. Invalid operations such as stale revisions, non‑permutations, or moving graph‑ordered files relative to each other are rejected, and successful writes trigger a `manuscript-updated` publication.

### `units/CEX-04-assembled-markdown.md`

_exit 0, 43s_

CEX-04 describes assembling a Markdown document by concatenating a metadata block, front matter, dedication, body files, back matter, and bibliography in a specific order, stripping individual file front matters. It defines bibliography modes (all sources, cited sources, off) and ensures the author field falls back to preference data. The assembly meets acceptance criteria for proper structure and configurable bibliketing.

### `units/CEX-05-preflight-endpoint-placeholders.md`

_exit 0, 13s_

The CEX-05 preflight endpoint `/api/compile-exported/preflight` runs deterministic checks—including detection of placeholder patterns like `TK`, `TODO`, `FIXME`, `XXX`, `TKTK`, and unrendered `{{…}}`—before compilation and export, returning a list of findings with file paths and line numbers. These checks never invoke models or block execution. The endpoint's response includes the run timestamp, revision, and an array of check results. Acceptance criteria verify correct detection of placeholders in prose and code, passing clean files, and that no requests are made to a mock OpenAI server during preflight.

### `units/CEX-06-claims-orphans-checks.md`

_exit 0, 25s_

CEX-06 defines preflight checks for unsupported claims and orphan scenes in the compile-export module. It requires validating claims artifacts from the Agent loop, marking unsupported claims as errors and weak claims as warnings, while tracking changes since last grounding check. For orphan scenes, it checks unresolved paths, stale order entries, and unreferenced manuscript files (excluding label-only nodes), with warnings only when story graphs exist.

### `units/CEX-07-entity-links-banned-phrases.md`

_exit 0, 20s_

CEX-07 introduces preflight checks during the compile-export phase (M5) that verify all entity links resolve correctly and detect banned phrases defined in the style profile, reporting errors for broken links and warnings for banned occurrences. The checks cover in-body citations, front-matter links, Markdown links, and image paths, ensuring they stay within the project. Banned phrase matching is case-insensitive and whole-phrase, scanning all instances while skipping code, and the check passes with an info note if no style profile is present.

### `units/CEX-08-nonfiction-sample-order.md`

_exit 0, 21s_

Add an `order` field to `examples/nonfiction/project.yaml` that lists items non‑alphabetically with mixed statuses while preserving existing comments and keys, and configure export settings with an author name, dedication, and bibliography sourced from the sample’s entities. The nonfiction sample should remain small (2–4 draft chapters of a few hundred words), and the milestone is complete only when four chapters are present—three skeleton drafts plus the grounding draft from unit AGL‑19—adding a third original draft if the skeleton provides fewer. Ensure that any file paths used by mock OpenAI scenarios remain unchanged, and verify the changes by passing the platform’s examples check and a temp‑copy test conducted in CEX‑09.

### `units/CEX-09-assembly-preflight-gate.md`

_exit 0, 27s_

CEX-09 establishes the assembly-preflight gate, exporting an in-process service for the agent's assemble_manuscript, run_preflight, and export_manuscript functions. The gate completes the phase:assembly-preflight, is blocked by CEX-02 through CEX-08 and runs parallel with CEX-16 and CEX-17. Acceptance criteria require CEX-02–CEX-07 criteria to pass, five fixture tests confirming check triggers, preflight to make no outbound HTTP calls, and the nonfiction sample started via "start from sample" to return its authored, non-alphabetical order with statuses.

### `units/CEX-10-pandoc-runner-md-export.md`

_exit 0, 31s_

CEX-10 defines the export functionality with a POST /api/compile-export/export endpoint that performs a preflight check before generating exported documents. Exports are produced by running Pandoc (and Typst for some formats) as a child process with timeouts and concurrency controls, storing the latest file per format and providing a download URL. The response includes format details, warnings, and attaches the preflight summary, while errors such as busy state, Pandoc failure, or timeout are handled with specific error codes. Additionally, the document outlines CI updates to install Pandoc 3.13 and Typst, and ensures export tests run appropriately in local and CI environments.

### `units/CEX-11-docx-export.md`

_exit 0, 53s_

CEX-11 defines DOCX export using a standard manuscript reference document with Times New Roman formatting, double spacing, and 1-inch margins. It depends on CEX-10 and runs parallel with CEX-12, CEX-13, and CEX-16, while unblocking CEX-14 and CEX-15. The export ensures chapters appear in correct order with styles from the reference document, a title page contains author and rounded word count, and front matter, dedication, and back matter are properly placed.

### `units/CEX-12-epub-export.md`

_exit 0, 13s_

CEX-12 configures EPUB 3 export with stylesheet, TOC, and a stable identifier using `--to=epub3 --split-level=1`. It is blocked by CEX-10, unblocks CEX-15, and runs parallel with CEX-11, CEX-13, CEX-14, and CEX-16. Acceptance criteria require correct spine and nav ordering, proper metadata (title, author, language, identifier), and a bibliography that appears for nonfiction fixtures only.

### `units/CEX-13-pdf-typst-spike.md`

_exit 0, 18s_

PDF export will use the Typst engine with a built-in template and no TeX installation. A Typst quality spike will render a sample with complex typographic features and compare it to a checklist, recording the outcome as an ADR. The work is considered complete when the produced PDF begins with `%PDF-` and is generated via `--pdf-engine=typst`, and the spike ADR is merged.

### `units/CEX-14-template-overrides-settings.md`

_exit 0, 21s_

CEX-14 specifies export settings endpoints that handle per‑project template overrides for formats like DOCX, EPUB, and Typst, validating overrides before Pandoc runs. It adds a "copy default into project" capability that writes built‑in templates to a user‑specified path through the project store API. Settings are managed with revision conflicts, updating only the export key, and stale revisions are rejected. Acceptance criteria ensure missing overrides return errors, copied defaults enable proper styling, and revision validation works correctly.

### `units/CEX-15-export-gate-image-smoke.md`

_exit 0, 31s_

CEX-15 is the export gate step for the image smoke job, tasked with exporting a nonfiction sample to md, docx, epub, and pdf on both amd64 and arm64 inside the built image. It will be accepted when each format exports via the HTTP API without side effects, the earlier CEX-10 through CEX-14 criteria are satisfied, and the Typst spike ADR is merged. The step is blocked by CEX-10, CEX-11, CEX-12, CEX-13, CEX-14, and platform phases PLT-15 and PLT-19, while running parallel with CEX-16, CEX-18, and CEX-19.

### `units/CEX-16-snapshot-api.md`

_exit 0, 16s_

The Snapshot API enables one-click creation, listing, and restoration of project snapshots. Snapshots are stored in timestamped directories with a manifest, and restoration reinstates files while deleting any added files, updates the project order, and generates a pre-restore snapshot. The design ensures drafts/.versions/ remains unchanged and pending changes are flagged as conflicts. Acceptance criteria verify snapshot integrity, restore behavior, and conflict detection.

### `units/CEX-17-manuscript-route-outline.md`

_exit 0, 21s_

CEX-17 outlines a lazy manuscript route that displays an outline grouped by Front/Body/Back with status chips, part controls, word counts, graph badges, totals, and order indicators, and enables drag‑and‑drop reordering via Angular CDK on tablet and desktop while automatically refetching on compile‑export events. The phone viewport renders the outline read‑only, and acceptance criteria confirm drag‑reorder functionality, conflict prompts, status/part updates, and the read‑only phone behavior.

### `units/CEX-18-preflight-export-panels.md`

_exit 0, 46s_

CEX-18 defines the UI for preflight checks and export functionality, including an on-demand preflight panel that groups findings by check with links to file locations. Export buttons for md, docx, epub, and pdf formats run preflight and show confirm dialogs when errors exist, while an export settings panel handles metadata and template overrides. Acceptance criteria ensure errors trigger confirmation dialogs, findings link to specific file lines, and the settings panel only submits changed fields with the current revision.

### `units/CEX-19-snapshots-panel.md`

_exit 0, 15s_

The CEX-19 document specifies a Snapshots panel UI that lists labeled snapshots newest first with file count and word statistics, and allows restoration only after a confirmation dialog that names the pre-restore snapshot. It also states that unreadable snapshots cannot be restored and that the panel refreshes on snapshot creation or restoration events.

### `units/CEX-20-milestone-gate.md`

_exit 0, 33s_

CEX-20 milestone gate completes the M5 demo by closing manuscript-snapshots phase. It mandates extending e2e tests to check file order and word counts after acceptance changes, without export steps. Acceptance criteria include passing CEX-16-CEX-19, a passing e2e for manuscript steps, and manual verification of Word and EPUB exports for a four-chapter sample. The demo shows project creation, chapter reordering, snapshotting, and exporting DOCX, EPUB, and PDF formats while preserving correct chapter order.

### `units/GNP-01-packs-scaffold-content-checks.md`

_exit 0, 19s_

GNP-01 establishes the directory structure for core, nonfiction, and fiction packs and creates a content-check suite in `packages/packs/test/` that validates packs using the pack-lint library. The suite ensures packs have correct entity types, consistent tool inputs, proper descriptions, and matching Remix enums, and includes fixtures that test each validation rule. CI runs the suite on every push, and it currently passes even though the packs are empty, while the work remains blocked by platform scaffolding and the pack-lint library.

### `units/GNP-02-golden-harness.md`

_exit 0, 25s_

GNP-02 defines a golden test harness and mock fixture convention for tools, specifying that tests should boot the API with Platform's test app and mock OpenAI server, execute tool endpoints with fixture arguments, and assert that requests and outputs match checked-in goldens. The convention places suites and goldens/fixtures in specific directories, uses one mock scenario per tool, includes a helper for declaring golden cases, and provides a flag to update goldens intentionally. Fixtures are self-contained and not sourced from examples. The acceptance criteria require a passing sample golden case that fails when templates change without updating goldens, and documentation of the convention in the packs test README.

### `units/GNP-03-core-entity-types.md`

_exit 0, 23s_

GNP-03 defines the core entity types `source` and `style-profile`, specifying their file locations, fields, and validation rules. Source entities have fields `title`, `citation`, `url?`, `reliability` and may omit front matter, while style‑profile entities include `tone`, `targetLength`, `bannedPhrases` and sample paragraphs. The document fixes field names used by compile & export tools and confirms acceptance criteria are met, with linters ensuring valid front matter and rejecting missing `citation` or non‑list `bannedPhrases`.

### `units/GNP-04-propose-graph.md`

_exit 0, 34s_

The `propose_graph` tool (GNP-04) skeths story graphs or recipes from plain‑language intent. It takes required inputs `intent`, `view` (story or recipe), `includeCatalogue`, `entityIds`, and `files`; story graphs use labeled entity/scene/beat nodes with relational edges, while recipe graphs use typed input/tool/output nodes with port‑matched wires. The prompt forbids inventing paths, sourcing scene/entity paths only from provided files and entity IDs, and returns JSON—injecting a tool catalogue for recipe views. Golden tests verify the tool validates the required `view` parameter and that outputs parse correctly against the graph schema and match expected prompts.

### `units/GNP-05-core-gate.md`

_exit 0, 22s_

GNP-05 is the core gate for the `phase:core-propose-graph` milestone, ensuring the built image contains the `/opt/scriba/packs` directories and that the app user cannot write to them. It requires checks such as CI running the pack validation suite, `propose_graph` validation passing, and that the tool registry lists `propose_graph` from the core pack. The gate also confirms the core pack is present in the image and unblocks GNP-12 while being blocked by other tasks such as image composition.

### `units/GNP-06-nonfiction-entity-types.md`

_exit 0, 30s_

GNP-06 defines person, claim, and concept entity types with specific fields. Person includes name, role, and sources; claim includes statement, evidence references, and status (supported, weak, unsupported); concept includes name and a one-line definition. The document requires lint cleanliness, proper reference recognition, and validators that reject any claim with an unsourced status.

### `units/GNP-07-cold-open.md`

_exit 0, 22s_

The cold_open tool (GNP-07) generates content by starting mid-scene with a person at a moment and then pulling back to the core idea. It accepts inputs such as coreIdea, entityIds, styleProfile, length, tone, plus required person and moment ports, using a shared prompt skeleton to shape the output. The tool must pass lint and content checks, include a golden test validating prompt rendering and source usage, and have manual eval cases added for small and larger models.

### `units/GNP-08-mystery-question.md`

_exit 0, 28s_

The mystery_question tool is a nonfiction workhorse pack module scheduled for milestone M2 that creates a draft prompt by merging a core idea, entity IDs, style profile, length and tone with required puzzle and surprising‑finding inputs. Its prompt follows a structured skeleton that poses a puzzle, deepens it, unravels it, lands a surprising finding, and ties the outcome back to the idea, while including citations and respecting length and tone constraints. The tool has passed linting and a golden test ensuring correct entity references and proper error handling for invalid arguments, and it includes manual evaluation cases for small and larger models in the agent loop's eval script.

### `units/GNP-09-myth-buster.md`

_exit 0, 17s_

The myth_buster tool generates a prompt that states a common belief and deconstructs it claim by claim using evidence, based on inputs such as coreIdea, entityIds, styleProfile, belief, and claimIds. It renders each entity with its ID, includes citations, and enforces constraints like length and tone while ensuring only claim entities are accepted. The tool must pass linting and golden tests that validate prompt content and error handling, and a manual evaluation case has been added to the agent loop's test data.

### `units/GNP-10-numbers-to-people.md`

_exit 0, 21s_

The numbers_to_people tool converts statistics into stories about individuals behind them, taking inputs like a statistic, a person entity, core idea, and style preferences. It uses a structured prompt skeleton to outline the statistic, introduce the person, narrate their story, and connect back to the number's significance. The specification includes linting requirements, a golden test for prompt validation and source handling, and mandates manual evaluation cases for various model sizes.

### `units/GNP-11-nonfiction-sample-entities.md`

_exit 0, 21s_

GNP-11 plans to create five nonfiction sample entities (one person, two claims, one concept, one style-profile) in the skeleton's examples directory, ensuring each references existing source files and that source front matter is added if missing. The work is blocked by GNP-03, GNP-06, and PST-11, and will unblock GNP-12 and the agent loop grounding-claims sample. Acceptance criteria require the entities to validate against their types and resolve correctly, with the platform's examples check already passing.

### `units/GNP-12-workhorses-gate.md`

_exit 0, 23s_

GNP-12 is the workhorses gate for phase nonfiction-workhorses at milestone M2, and merging it closes the phase. Its acceptance criteria require four tools to pass validation and golden tests, sample entities to validate, and workhorses to produce drafts that cite source files via [@id] citations. The demo demonstrates drafting a cold open and busting a myth with narrative tools, observing tool cards and citations, then rejecting the changes.

### `units/GNP-13-fiction-entity-types.md`

_exit 0, 18s_

GNP-13 specifies the data structure for fiction entity types, defining fields for characters (name, want, need, flaw, voice, notes) and a one‑level array of character‑note relationships, for places (name and lists of world‑rule references), and for world‑rules (statement and appliesTo places). It explicitly removes linked scene fields, relying instead on story‑graph relations. The decisions have passed linting and validation, confirming that the registry accepts the relationships and required fields.

### `units/GNP-14-character-world-builder.md`

_exit 0, 30s_

GNP-14 defines two enabled entity-output tools, character_builder and world_builder, for fiction genre packs. character_builder generates character entities from seed, role, core idea, and related entities, outputting Markdown with want, need, flaw, voice, and backstory. world_builder expands place or world rules using provided rule entities and a core idea, returning updated rules and highlighting any contradictions in a fixed Contradictions section. The plan includes validation passes, golden tests, manual eval cases, and is unblocked by GNP-02 and GNP-03 while blocking GNP-19.

### `units/GNP-15-scene-builder.md`

_exit 0, 11s_

The scene_builder tool drafts scenes from goal, conflict, and outcome using inputs such as coreIdea, entity IDs, style profile, length, tone, point‑of‑view character, and scene notes. It builds a prompt with a shared skeleton that renders each entity by its ID, includes placeholders for missing facts, and applies the style profile’s tone and length constraints. The tool passes lint checks, has a golden test verifying entity rendering and error handling, and includes manual evaluation cases in the agent loop.

### `units/GNP-16-dialogue.md`

_exit 0, 18s_

GNP-16 is a dialogue tool that generates exchanges between characters in their distinct voices using inputs such as a core idea, entity IDs, style profile, length, tone, and at least two character IDs plus scene text, subtext, and goal. It renders each character's full entity data including voice and relationships, builds a prompt with citations and placeholders, and enforces constraints like banned phrases and length. The tool must pass linting and content checks, include all input entities in the prompt, and return appropriate errors for invalid arguments, with golden tests verifying prompt content and behavior.

### `units/GNP-17-plot-manager.md`

_exit 0, 22s_

GNP-17 provides a plot manager tool for fiction genre packs that checks story outlines for setups, payoffs, gaps, and loose ends. The tool, configured in `fiction/tools/plot_manager.yaml`, takes an outline and entity IDs as inputs and outputs findings such as unmatched setups or payoffs without rewriting content. Development is blocked by GNP-02 and GNP-13, runs parallel with several other tasks, and will unblock GNP-19 once complete. The tool has passed validation tests and includes a manual evaluation case.

### `units/GNP-18-fiction-sample.md`

_exit 0, 14s_

GNP-18 plans a short fiction sample about two lighthouse keepers, defining two characters, a place, a world‑rule, and a style profile. The project includes three draft files (arrival.md, the‑storm.md, ledger.md) and a story graph linking scenes and beats, along with a recipe that invokes a dialogue tool to generate the drafts. Expected compile order is arrival → the‑storm → ledger, and the configuration satisfies the platform's examples check with all paths present and proper graph connections.

### `units/GNP-19-fiction-gate.md`

_exit 0, 34s_

GNP-19 is milestone M6 for phase:fiction that implements a fiction-order check verifying manuscript files appear as `arrival.md`, `the-storm.md`, `ledger.md` when starting from sample. It depends on GNP-13 through GNP-18, CEX-09, and GRR-17, runs parallel with GNP-20 to GNP-22, and blocks GNP-24 upon completion. The acceptance criteria include tool validation, dialogue tests, and the order check, with a demo showing graph navigation and recipe execution, and the milestone is complete when dialogue scenes maintain distinct voices and relationship notes are verified.

### `units/GNP-20-throughline-check.md`

_exit 0, 23s_

GNP-20 specifies the `throughline_check` tool that monitors chapters for sections drifting from their core idea. The tool, configured in `core/tools/throughline_check.yaml`, accepts `chapterText` and `coreIdea` inputs and flags drifting sections with reasons and opening quotes without rewriting. It is blocked by GNP-02 and GNP-12, runs parallel with GNP-19, GNP-21, GNP-22, GNP-23, and will unblock GNP-24, and has passed validation with a golden test and a manual eval case.

### `units/GNP-21-tier2-entity-and-argument-shapes.md`

_exit 0, 22s_

GNP-21 introduces three disabled tools—named_concept, comparison_set, and objection_handler—for nonfiction content generation. Each tool is defined with specific inputs and purposes: named_concept creates labeled concepts from patterns, comparison_set contrasts winners with losing cases, and objection_handler identifies and addresses objections to claims. The tools ship with `enabled: false` and will be activated later, and they each have passed validation, include golden tests, and have manual evaluation cases.

### `units/GNP-22-tier2-3-draft-shapes.md`

_exit 0, 16s_

The GNP‑22 plan outlines nine disabled tier‑2–3 nonfiction draft shapes — contrast, profile, zoom, reader challenge, framework builder, method first, timeline, flashback, and stockdale tension — each with specific inputs and descriptions. Acceptance criteria require all shapes pass validation, include golden tests, become callable via the tool registry when enabled, and have manual eval cases added.

### `units/GNP-23-remix.md`

_exit 0, 19s_

GNP-23 adds a remix tool that rewrites a passage into another tool's shape for side-by-side comparison. It accepts a passage text and a targetShape parameter enumerating all shipped draft tools except remix, and uses shaped prompts to perform the rewrite. The tool integrates with the project's review diff and activates a consistency check that fails CI if draft tools are added or renamed without updating the enum. Acceptance criteria ensure the tool passes validation, updates the enum correctly, and includes golden and manual test cases.

### `units/GNP-24-remaining-shapes-gate.md`

_exit 0, 25s_

GNP-24 is the plan to complete phase remaining-shapes at milestone M7 by enabling Throughline check and Remix tools while keeping twelve nonfiction shapes disabled. It requires validation of fourteen tools, golden tests, and proper enum matching. The demo shows four key actions: flagging drifting paragraphs, remicing cold opens to mystery questions, proposing recipes from intents, and enabling them on the canvas.

### `units/GRR-01-contract-slice.md`

_exit 0, 28s_

GRR-01 defines the contract slice for graph-runner, specifying a versioned JSON schema for story and recipe graphs with strict node‑id patterns, port conventions, and relation vocabularies. It details required imports, CRUD operations, run execution, node‑run statuses, and SSE events, along with example fixtures and acceptance criteria for validation and CI tests. The implementation is blocked by platform scaffolding, tool registry, and project store contracts, yet it unblocks several graph‑related work items.

### `units/GRR-02-graph-crud.md`

_exit 0, 157s_

GRR-02 specifies the module skeleton and graph CRUD operations for the graph-runner component at milestone M4. It defines HTTP API endpoints for listing, creating, saving, renaming, and deleting graphs using the active project's file store, with direct author writes validated by Zod schemas. The design includes schema version checking, migration considerations, and concurrency handling via the project store's three-way merge, while acceptance criteria confirm expected validation and error behaviors.

### `units/GRR-03-validation.md`

_exit 0, 18s_

GRR-03 specifies how to validate recipes and story graphs against the live tool registry, identifying errors that block runs and warnings that don’t. It details validation triggers—such as get, save, run start, and a dedicated validate endpoint—and the types of issues like invalid node kinds, mismatched ports, missing required inputs, and cycles. Acceptance criteria ensure fixtures produce correct errors and that disabling tools or schema mismatches are properly handled.

### `units/GRR-04-run-engine-core.md`

_exit 0, 13s_

The GRR-04 plan defines the core run engine for executing graph recipes, detailing how a run is started with optional targets, input validation, and ensuring only one active run per project. Before any tool execution, all file references are read once via the project store, and nodes run sequentially in topological order, emitting SSE events for status changes. Tool nodes gather inputs, resolve references, call the tool registry executor, and update run state while keeping results in memory. Acceptance criteria confirm correct ordering, scoping, error handling for invalid graphs or missing inputs, and that current‑run‑state returns the active or last finished run.

### `units/GRR-05-stop-fail-fast-switch.md`

_exit 0, 22s_

GRR-05 introduces stop and failure handling for the graph runner: it enforces fail-fast where a node failure marks the node error and queued nodes stopped, ending the run error; it provides a Stop endpoint that aborts ongoing model calls and stops all nodes, ending the run stopped without creating pending changes; and it hooks into project switches to stop the run with a project-switched reason. The acceptance criteria verify these behaviors with mock failures, stop requests, and project changes.

### `units/GRR-06-output-nodes-pending-changes.md`

_exit 0, 21s_

Output nodes generate pending changes for draft, entity, or graph outputs, determining the target file via precedence rules and capturing the appropriate base content. They propose these changes to the project store with run origin and provenance info, and graph outputs are validated against a schema via registered validators. Invalid targets or graph content are rejected, and changes based on run-start content conflict with mid-run file edits.

### `units/GRR-07-run-logs-recovery.md`

_exit 0, 21s_

GRR-07 mandates structured run logs in `logs/recipe-runs/<runId>.jsonl` tracking starts, node changes, tool calls, and pending changes. It implements restart recovery by rebuilding interrupted runs from logs and marking them as stopped with reason 'interrupted' upon API restart. Acceptance criteria confirm correct logging and mid-run restart handling.

### `units/GRR-08-engine-gate.md`

_exit 0, 10s_

The Engine gate checklist defines the completion criteria for the graph‑runner’s phase:engine, stating that merging it will close the phase. Acceptance criteria require that tasks GRR‑02 through GRR‑07 pass, all `/api/graph-runner` routes be properly guarded, and platform boundaries lint confirm no illegal imports between graph‑runner and agent‑loop. The gate is currently blocked by several dependencies, runs parallel with other tasks, and unblocks GRR‑17.

### `units/GRR-09-graphs-route-list.md`

_exit 0, 10s_

GRR-09 defines the route and UI for graphs listing with the latest run status, including create, rename, and delete actions on tablet and desktop, while ensuring phone users see a appropriate message on the canvas route. It establishes a Shell route at `/projects/:projectId/graphs` that displays the graph list and each recipe’s current status, with the individual graph view gated for tablet‑sized devices. Acceptance criteria include component tests verifying API calls and status updates, and responsive behavior showing the list on phone and a gate message on the canvas for phone viewports.

### `units/GRR-10-vflow-adapter.md`

_exit 0, 20s_

GRR-10 defines an adapter layer that translates graph JSON into ngx-vflow views for story and recipe representations, implementing four workarounds for handles and connections. It enables node movement and saving via API, with acceptance criteria ensuring byte-identical JSON output, accurate position updates, and validated handle connections through Playwright tests.

### `units/GRR-11-tool-nodes-wires.md`

_exit 0, 12s_

GRR-11 describes generating tool nodes from the registry with typed ports, a palette of enabled tools, input and output nodes, and a connection validator that rejects mismatched or duplicate wires. Live validation displays issues and disables the Run button until errors are fixed. Acceptance criteria confirm that tool nodes render correctly, invalid wires are refused, and validation errors are highlighted.

### `units/GRR-12-entity-side-list-chips.md`

_exit 0, 25s_

GRR-12 implements draggable entity and style chips from a project side list onto canvas ports. Dropping a chip pins it only when the port matches the chip type, satisfies the port's kind filter, and has no wire, otherwise showing a refusal reason.Pinned chips can be removed, and the behavior is validated through unit and Playwright tests.

### `units/GRR-13-run-controls-status.md`

_exit 0, 19s_

GRR-13 defines the Run UI for the graph-runner module, specifying controls such as Run, Run to here, and Stop, an input-values dialog that scopes fields for whole runs and subruns, live status badges driven by SSE events, inline results with citations, and a read-only canvas while a recipe is executing. The dialog lists input nodes and output nodes with appropriate pickers and default values, and status badges reflect node states reconciled on load and via periodic ticks. Acceptance criteria ensure the dialog works correctly, badges update during runs, the canvas becomes editable after stopping, and output nodes display pending-change links.

### `units/GRR-14-story-view-arrange.md`

_exit 0, 14s_

The story view adds scene, beat, and entity nodes with labels and file pickers, showing a warning badge when referenced files are missing and linking “Open file” to the files route. A relation picker will suggest predefined types like order, causality, and containment while allowing free‑text relations, and story graphs will never display a Run control. Arrange provides a layered layout ordered by topological depth and story‑graph order edges, updating node positions without altering other data.

### `units/GRR-15-touch-styling-perf.md`

_exit 0, 22s_

GRR-15 adds tablet touch support for canvas interactions like panning, zooming, moving nodes, drawing wires, and dropping chips, and applies Material Design styling to nodes, chips, dialogs, and badges using theme tokens in both light and dark themes. It also measures performance by timing the opening of a 150-node generated recipe. The task is blocked by GRR-11‑14, runs parallel with GRR-16, and will unblock GRR-17. Acceptance criteria are met via Playwright touch emulation tests, visual checks of themed styling, and a main‑thread latency measurement under 200 ms for the large graph.

### `units/GRR-16-sample-recipe.md`

_exit 0, 20s_

GRR-16 defines a sample recipe for a nonfiction graph (chapter-opening.json) that includes nodes for chapter notes, key people/claims, style, and chained workhorse tools like cold open, mystery question, myth-buster, and numbers-to-people, outputting a draft. The recipe follows genre pack workhorse specifications, excludes story graphs and certain directories, and is linked to mockopenai test scenarios. It has passed CI checks and successfully runs end-to-end tests against a mock OpenAI server.

### `units/GRR-17-canvas-gate.md`

_exit 0, 22s_

GRR-17 completes the canvas gate for the graph runner by extending Playwright e2e tests and conducting a manual iPad Safari check, aiming to finish the `phase:canvas` functionality. It requires visual recipe building, end‑to‑end execution, and pending changes appearing in the review queue, with several acceptance criteria already satisfied except for CI e2e pass and iPad recording. The demo illustrates creating a chapter recipe on the canvas, running it, reviewing results, and exploring logs, which will merge this gate and unblock related genre‑fiction targets.

### `units/MPR-01-contract-slice.md`

_exit 0, 103s_

MPR-01 defines the contract slice for provider configurations, specifying Zod shapes for configs with presets like Ollama, LM Studio, OpenAI, and OpenRouter, and detailing write-only key handling, connection testing, model selection, and error codes with HTTP status mappings. The slice includes defaults for parameters such as timeout and retries, ensuring keys are never exposed in responses. Acceptance criteria confirm the slice builds for API and web, validates inputs via Zod, and properly exports constants and presets.

### `units/MPR-02-registry-seeding.md`

_exit 0, 21s_

MPR-02 specifies the module skeleton and registry service for managing providers within settings.yaml. It requires an in-process registry that supports list, get, create, update, delete, and setting the default provider, writing through Platform's atomic section updates. On first start, if no providers section exists, the module seeds a default Ollama entry pointing to `http://host.docker.internal:11434/v1`, and ensures subsequent startups are idempotent and do not overwrite existing data. Acceptance criteria confirm correct seeding on fresh installs, preserve empty lists, reject newer schema versions, and generate distinct IDs when creating multiple providers from the same preset.

### `units/MPR-03-secrets-file.md`

_exit 0, 16s_

The MPR-03 module creates a secure secrets file at `.scriba/secrets.yaml` with 0600 permissions inside a 0700 directory, using atomic writes and tightening looser modes on startup. It offers an API to store, retrieve, delete, hint (showing only the last four characters), and check existence of secrets keyed by opaque references, while redacting Authorization headers and key-like values from logs. The design includes a reusable helper for future secret needs and ensures keys are never exposed in error messages or transcripts.

### `units/MPR-04-openai-compatible-client.md`

_exit 0, 53s_

The document describes MPR-04, which builds an OpenAI-compatible client for streaming agent tool calls and text deltas. It features robust retry logic, timeout handling, abort support, and comprehensive error codes, along with mock scenarios for testing edge cases like stalled streams and malformed tool calls.

### `units/MPR-05-model-resolution.md`

_exit 0, 28s_

Model resolution picks a model in order of project override, app default, provider model, and fallback to the first model listed as auto; explicit provider or app defaults override auto, and an empty model list yields a PROVIDER_NOT_CONFIGURED error with a pull hint. The system also proxies the provider's model list endpoint, returning sorted IDs without changing state.

### `units/MPR-06-http-api.md`

_exit 0, 16s_

The HTTP API provides CRUD operations for provider configurations, enabling listing providers (including presets, app default, and model lists), retrieving effective models, and managing API keys via set, clear, and delete actions. Keys set through the API are stored securely as references in `settings.yaml`, with the actual secret kept in a secrets file; clearing or deleting a key removes the secret entry. Deleting the app‑default provider is prohibited with a 409 error until another default is selected, and deleting a provider that is in use by projects simply removes the provider while those projects fall back. All GET endpoints are side‑effect free, and errors follow the platform's base shape.

### `units/MPR-07-connection-test.md`

_exit 0, 29s_

MPR-07 implements a staged connection test that verifies provider connectivity by checking server reachability, listing models, and performing a minimal chat. The test accepts saved provider IDs or draft configurations with temporary keys, returning results with latency, model count, and detailed error hints for failures like unreachable Ollama, unauthorized access, or missing models. Implementation must preserve configuration files while handling scenarios such as incorrect keys, empty model lists, and network issues with specific troubleshooting guidance.

### `units/MPR-08-client-gate.md`

_exit 0, 32s_

The MPR-08 client gate task secures the `/api/providers` endpoints, implements a end‑to‑end secrecy suite for API keys, and wires the Playwright e2e test to configure providers via the real API. It builds on completed seeding, streaming, and error‑handling work from earlier phases and includes a milestone check that the agent loop’s M1 run can invoke a model through a seeded provider without extra setup. A brief demo starts Ollama, installs the tool, confirms the settings file, runs a connection test, and then executes a sample query that streams tokens and displays tool calls.

### `units/MPR-09-providers-panel.md`

_exit 0, 35s_

MPR-09 specifies a providers panel component for managing API providers with presets and custom URLs. It features an Angular-based UI with forms for editing provider settings, a model picker that falls back to free text, masked password fields for keys, and app default selection. The component uses Angular Material and the Shell's API client, is responsive, and includes tests for key masking, picker fallback behavior, deletion safeguards, and route independence.

### `units/MPR-10-connection-test-ui-hints.md`

_exit 0, 24s_

MPR-10 implements a "Test connection" button showing staged results with pass/fail details and hints. It adds Ollama context-length ≥64000 hints for Ollama or port 11434 providers and "pull a model" hints for empty Ollama model lists. The acceptance criteria ensure these hints appear appropriately for failing stages and provider types.

### `units/MPR-11-providers-route-gate.md`

_exit 0, 21s_

MPR-11 implements the lazy-loaded `/providers` route for the providers panel, merging model providers phase:settings-ui. The route is responsive for phone and desktop, allowing app default switching over tailnet. It depends on MPR-09 and MPR-10 and unblocks MPR-13 and others. The work meets acceptance criteria for lazy-loading, navigation presence, and phone usability.

### `units/MPR-12-project-override-api.md`

_exit 0, 50s_

MPR-12 defines per-project model overrides stored in `project.yaml`, with resolution prioritizing the override (falling back to app default and warning if provider missing). The set/clear API updates the active project's `project.yaml` via `updateProjectYaml`, and switching projects changes the effective model. A type-level test ensures `model` field compatibility with `ModelChoice`, meeting all acceptance criteria for override functionality.

### `units/MPR-13-project-model-panel.md`

_exit 0, 15s_

The MPR-13 feature adds a “This project” section to the providers panel where users can set a specific provider and model for the active project, overriding the app default. It displays an effective-model readout showing the selected model, its source (project, app, or auto), and any fallback warning. The section is hidden when no project is active and refreshes automatically when the project switches.

### `units/PLT-01-workspace-scaffold.md`

_exit 0, 38s_

PLT-01 creates a root npm workspace with sub‑workspaces for contracts, API, web, and packs, locking Node, npm, TypeScript, Angular, NestJS, and Zod versions. It includes root configuration files (tsconfig, ESLint, Prettier, .nvmrc, .gitignore), sets up empty workspaces with passing tests, and configures tooling like Vitest and ESLint. The acceptance criteria verify that `npm ci` works, build/test/lint commands run successfully across all workspaces, pins are correctly set, and the root package.json specifies the required Angular, NestJS, and Zod majors.

### `units/PLT-02-contracts-package-platform-slice.md`

_exit 0, 49s_

PLT-02 establishes the `@bbartolome/scriba-contracts` package with ten subpaths (`/platform`, `/setup-auth`, etc.) and a shared `/platform` slice. The contract uses isomorphic TypeScript and Zod for shape definitions, with each module exporting one subpath; the platform slice defines core SSE envelopes, error codes, HTTP conventions, and environment variables. All ten modules are scaffolded, but only `/platform` has API routes and events; the other nine subpaths are empty placeholders. The package must have no runtime dependencies other than Zod and all subpaths must resolve correctly in NestJS and Angular.

### `units/PLT-03-web-bootstrap.md`

_exit 0, 21s_

PLT-03 generates a minimal Angular + Material application with a placeholder page and a development proxy that maps `/api`, `/healthz`, and `/events` to the backend. The platform creates this app and proxy, after which the Frontend shell takes over and features are organized under `apps/web/src/app/features/`. Acceptance criteria include a successful build, a passing Vitest test of the placeholder page, and correct proxy configuration.

### `units/PLT-04-api-composition-root.md`

_exit 0, 29s_

PLT-04 defines the NestJS composition root for the API, creating a single app that serves the Angular bundle with SPA fallback and registers modules via individual `@Module` imports under `/api/<module-slug>`. It requires Zod parsing of `SCRIBA_*` environment variables, ensures the `.scriba/` directory exists and is writable at startup, and sets up SIGTERM handling, logging, and a `create-test-app` helper for module API tests. The design avoids CORS, postpones global guarding to later phases, and exposes `/healthz` and `/api/platform/version` endpoints, with version info baked into the image. Acceptance criteria verify health checks, version endpoints, static file serving, environment validation, and the test helper's functionality.

### `units/PLT-05-error-filter-validation-pipe.md`

_exit 0, 23s_

The task is to implement a global error filter and a Zod validation pipe for the platform module. The filter standardizes error responses, converting Zod validation failures, unknown API routes, oversized payloads, and other errors into specific error codes while preserving module‑specific errors. The validation pipe integrates with each module’s contract schemas, and acceptance criteria ensure proper handling of invalid inputs, routes, payload limits, and error shape validation.

### `units/PLT-06-sse-stream-publisher.md`

_exit 0, 17s_

PLT-06 defines a multiplexed `/events` SSE stream that broadcasts JSON envelopes `{module, type, data}` to all open clients, starting with a `platform/hello` message. The stream sends heartbeats every 15 seconds, supports an echo endpoint for latency measurement, and handles backpressure by closing slow clients, while using `retry: 3000`, no compression, and `Cache-Control: no-cache`. Authentication flows via cookie and the publisher is exported from the platform module, with shutdown handling on SIGTERM. Acceptance criteria ensure hello, echo, heartbeats, cache headers, backpressure behavior, and schema validation all work.

### `units/PLT-07-settings-migration-hook.md`

_exit 0, 17s_

The PLT-07 design adds a startup migration hook for settings.yaml that backs up the file, applies modular section migrations in order, and uses atomic writes. The platform owns the file envelope while modules register their sections and migration steps. The system handles missing files, unknown keys, and refuses newer schema versions by exiting with an error.

### `units/PLT-08-tailnet-address-filter.md`

_exit 0, 24s_

PLT-08 implements a Tailnet address filter that drops direct HTTP connections from Tailscale range peers (100.64.0.0/10 and fd7a:115c:a1e0::/48) while allowing loopback and other non-Tailscale addresses. The filter ensures that only proxied connections preserve HTTPS and identity headers. Acceptance criteria verify that Tailscale range addresses are rejected and that valid connectionsLike loopback still work.

### `units/PLT-09-module-boundaries-lint.md`

_exit 0, 21s_

PLT-09 establishes a lint rule to enforce module boundaries, prohibiting direct imports between modules like agent-loop and graph-runner and cross-feature imports, allowing only imports through NestJS modules or @bbartolome/scriba-contracts. The rule is implemented in the root ESLint configuration and requires that each module's entry file (e.g., *.module.ts or routes file) is the only importable entity. Acceptance criteria ensure that forbidden imports fail linting while allowed imports, such as contract imports, pass, and that tests cover these cases.

### `units/PLT-10-ci-workflow.md`

_exit 0, 10s_

The PLT-10 plan defines a GitHub Actions workflow ci.yml that runs on pull requests and pushes to main, executing npm ci, lint, test, and build in a single job. The workflow also checks that PR titles follow Conventional Commits format. It uses the Node version from .nvmrc and npm cache, with other modules able to extend the job.

### `units/PLT-11-scaffold-gate.md`

_exit 0, 32s_

PLT-11 is the scaffold gate that completes `phase:scaffold` by publishing `/platform` and defining the development and build commands. It specifies `npm run dev` to concurrently run the API, Angular dev server, and contract watches with proper environment variables, and `npm run build` to compile contracts then API and web, while also including an Angular build test that ensures all ten contract subpaths resolve in both runtimes. The acceptance criteria require a fresh clone to serve the placeholder app with proxied endpoints, pass build/test/lint, and resolve contract subpaths, as demonstrated by commands that start the dev server, check health, stream events, and validate settings.

### `units/PLT-12-mock-openai-server.md`

_exit 0, 26s_

PLT-12 is a mock OpenAI server that tests model interactions by serving scenarios via URL paths. It handles chat completions and models endpoints, simulating tool calls, streaming, errors, and delays based on request patterns. Scenarios are data files that record requests and can be reset per test. The server supports parallel testing and is used via Vitest or `npm run mock:openai`.

### `units/PLT-13-playwright-harness-e2e.md`

_exit 0, 33s_

PLT-13 introduces a Playwright end-to-end test harness that bootstraps the application with a temporary library and mock OpenAI server, running a single e2e test containing five placeholder steps (setup, project from sample, agent run, accept change, manuscript) reported as pending. The harness sets up the environment, performs an app‑loads check, and integrates with CI to upload Playwright traces on failure, while leaving model configuration and export to other components. Acceptance criteria require that `npm run e2e` successfully starts the harness and reports the pending steps, that CI executes the test with trace uploads, and that each placeholder step is clearly named and independently enableable with ownership comments.

### `units/PLT-14-dockerfile-entrypoint.md`

_exit 0, 45s_

PLT-14 plans a two-stage Docker image for the platform runtime, using a slim Node.js base with SQLite FTS5, Pandoc 3.13, Typst, and ca-certificates, excluding git and build tools. The runtime includes deployed API, packs, and examples, with an entrypoint that prints a dispenser script when SETUP=true or starts the API. Acceptance criteria verify the presence of these components, FTS5 functionality, and builds on both amd64 and arm64.

### `units/PLT-15-compose-sidecar.md`

_exit 0, 17s_

PLT-15 outlines integrating a Tailscale sidecar and shared socket into the Scriba service via Docker Compose, enabling secure local API access, optional Tailnet authentication, and version‑tracked healthchecks. The Tailscale service runs in kernel mode and shares a socket volume with the non‑root Scriba container, which binds to the local API port and mounts the library directory. Configuration uses environment variables, a shared compose version constant, and override files, with init and restart policies applied, and includes acceptance criteria verifying health, file ownership, and API status.

### `units/PLT-16-smoke-st1-st3.md`

_exit 0, 14s_

PLT-16 defines smoke tests ST‑1 to ST‑3 for the platform phase, focusing on Serve configuration, SSE echoing, and host Ollama access. ST‑1 verifies late‑login HTTPS Serve behavior and network restrictions, ST‑2 checks unbuffered SSE events over the tailnet, and ST‑3 ensures Ollama is reachable from the container on Mac and Linux. Acceptance criteria require all three tests to pass, with outcomes recorded and guidance updated for Linux host binding and installer hints.

### `units/PLT-17-dispenser-first-install.md`

_exit 0, 25s_

The PLT‑17 design specifies a one-liner dispenser script that installs the application by verifying Docker and Compose v2, extracting deployment files, creating the library and `.scriba/` directory, writing `.env` and compose files, and starting the stack with `docker compose up -d`. The script runs the container as the current user, waits for the service to become healthy, and prints the setup URL (or a fallback loopback URL), while also displaying a hint about Ollama and host binding. Acceptance criteria ensure the script aborts early if Docker or Compose are missing, works without interactive prompts when run without a TTY, and only outputs the script to stdout.

### `units/PLT-18-update-rerun-rollback.md`

_exit 0, 61s_

The PLT-18 update process backs up and merges `.env` and compose files non-interactively, then deploys via `docker compose pull && up -d` with fast path image updates and rollback capability using tag reversal and backup restoration. This idempotent system preserves local overrides and meets acceptance criteria for silent operation and backup restoration as demonstrated in a five-minute setup and re-run demo.

### `units/PLT-19-publish-workflow.md`

_exit 0, 26s_

PLT-19 defines a CI/CD publishing workflow that builds multi-arch Docker images, runs smoke tests, and automatically tags and releases based on conventional commits. The workflow comprises plan, build, smoke, merge, and release jobs executed in a single GitHub Actions run, using semantic‑release and avoiding external triggers. Acceptance criteria ensure that pushes to main publish `latest` and `sha‑<short>` tags, semver tags and releases only for `feat:` or `fix:` commits, and that all smoke checks pass on both architectures without leaving dangling tags.

### `units/PLT-20-examples-check-m1-layer.md`

_exit 0, 17s_

PLT-20 implements a check that validates example projects in the examples/ directory against project and entity schemas, ensures samples follow the correct layout and forbids reserved directories, and confirms that samples.yaml entries match actual folders while tests avoid reading example files. Failures are reported with the file path and schema issue. The check must pass on the initial nonfiction skeleton.

### `units/PLT-21-examples-check-graph-layer.md`

_exit 0, 19s_

PLT-21 verifies that all `graphs/` files in examples conform to the Graph runner schema and that each story-node's path points to an existing file. It adds checks to PLT-20, reports failures with the file and issue details, and passes even when a sample has no `graphs/` folder. The task is blocked by PLT-20 and unblocks the Graph runner sample recipe (GRR-16).

### `units/PLT-22-examples-check-pack-layer.md`

_exit 0, 29s_

PLT-22 enhances the examples check by validating recipe tool references against built-in tools, ensuring entity front matter validates against schemas, and resolving entity references within samples. Using the pack-lint CLI, it verifies that recipe parameters are valid and references exist, failing CI with specific file and id details for issues. The check must pass on the examples directory with skeleton content and continue passing as more content is added.

### `units/PLT-23-full-suite-e2e-failures.md`

_exit 0, 32s_

Fixing two end-to-end tests that fail only in the full test suite on main due to shared state contamination between specs in the Playwright harness. The unit will identify the problematic spec and implement isolation fixes to prevent cross-test side effects without altering test assertions. Both tests must pass individually and in the full suite, ensuring the root `npm test` exits successfully.

### `units/PST-01-contract-slice.md`

_exit 0, 16s_

PST-01 defines the contract slice for the project store, detailing the project.yaml schema and supporting structures for projects, files, entities, search, pending changes, draft versions, and SSE events, along with error codes. It ensures the store can be built independently using Zod, preserves unknown fields, and includes round‑trip tests and validation. The slice is importable by both API and web modules and unblocks several platform components.

### `units/PST-02-module-skeleton-path-safety.md`

_exit 0, 22s_

The PST-02 module is a NestJS project‑store module at `apps/api/src/modules/project-store/` that exposes an API under `/api/project-store/` and registers a `projects` settings section with Platform. It implements a single path‑safety check that validates project‑relative paths, rejects unsafe constructs (absolute, `..`, backslashes, NUL, empty segments), resolves symlinks, blocks reserved paths like `.scriba/` and `drafts/.versions/`, and ensures returned errors only contain relative paths. The module must pass a table‑driven test suite covering these cases and appear correctly in the settings when the application starts.

### `units/PST-03-discovery-new-import.md`

_exit 0, 38s_

PST-03 establishes project discovery by identifying immediate subfolders containing `project.yaml`, listing them with status flags. It defines POST endpoints for creating new projects with scaffolded directories and importing existing folders by validating or initializing `project.yaml` while preserving existing files. The GET list endpoint is read-only, and operations ensure `.gitignore` is updated appropriately without side effects.

### `units/PST-04-active-project-switching.md`

_exit 0, 32s_

PST-04 defines the standard for persisting and managing one active project across restarts and devices via settings.yaml. Activation and switching validate project schemas, execute lazy migrations, synchronously call `onProjectSwitched` hooks, and publish `project-switched` events. Helper checks ensure APIs target the active project, failing with `PROJECT_NOT_ACTIVE` or `PROJECT_NO_ACTIVE` otherwise. Acceptance criteria confirm persistence, proper hook execution, schema validation, and error handling for invalid projects.

### `units/PST-05-start-from-sample.md`

_exit 0, 17s_

The PST-05 document specifies a "Start from sample" feature that copies a selected sample directory into a new library folder with a user-specified name and title, rewriting only the title in project.yaml while preserving comments and excluding unnecessary files. It defines the API endpoint (POST with sampleId, folderName, title) and ensures samples are listed via a GET that reads samples.yaml, with no automatic copying at startup. Acceptance criteria verify that the copy works correctly, that nothing is copied on boot, and that the sample list view is side-effect free.

### `units/PST-06-file-api-core.md`

_exit 124, 300s_

**Failed:** see stderr; no summary produced.

### `units/PST-07-delete-move-helpers.md`

_exit 0, 27s_

PST-07 introduces helpers for deleting and moving files, along with in-process functions for updating project YAML, appending logs, and retrieving module state directories. The `delete` and `move` actions operate on single files with path safety and conflict checks, while `updateProjectYaml` preserves YAML formatting and validates against a schema. `appendLog` appends lines to log files under a safe `logs/` directory, even for inactive projects, and `stateDir` creates isolated directories for modules. These utilities unblock PST-12 and are consumed by graph operations, compilation/export, model providers, and the agent loop.

### `units/PST-08-entity-resolution.md`

_exit 0, 40s_

PST-08 defines entity resolution and entity list features for Markdown files in `entities/` and `sources/`. Entities are identified by front-matter `id` or file stem, validated against a pattern, and resolution returns contents with errors for unknown or duplicate IDs. An entity list provides filterable entries by type, and both resolution and list are GET endpoints. A manifest of file changes rebuilds the ID map on each request to reflect host edits, ensuring side-effect-free operations.

### `units/PST-09-project-picker-ui.md`

_exit 0, 21s_

The project picker UI (PST-09) implements a responsive interface at `/projects` that lists projects by status and provides New, Import, and Start from sample options, syncing with the Shell's navigation via SSE. The feature uses a lazy-loaded route and integrates with platform components, targeting phone viewport compatibility. It extends e2e tests to cover the 'project from sample' flow using the nonfiction sample. Implementation is blocked by several dependencies but will unblock PST-12 upon completion.

### `units/PST-10-files-ui.md`

_exit 0, 27s_

PST-10 specifies the Files UI with a project file tree and Markdown preview, enabling direct save via the file API on desktop/tablet and read-only preview on phone. The component routes to `/projects/:projectId/files`, opens files in the shell’s editor (once the editor phase is available) or preview, warns on stale-base conflicts, and refreshes the tree on `files-changed` events. Acceptance criteria include component tests for tree rendering, file opening, preview, refresh, and phone viewport handling, and the implementation was later moved to PST-34.

### `units/PST-11-nonfiction-sample-skeleton.md`

_exit 0, 81s_

PST-11 defines the nonfiction sample skeleton structure, including `examples/samples.yaml` and `examples/nonfiction/` with `project.yaml`, `sources/outline.md`, and `drafts/`. The sample acts as an e2e fixture and follows specific content decisions. Future work will add entities, grounding claims, and ordering in subsequent milestones. Acceptance criteria ensure schema validation, outline presence, and no excluded directories.

### `units/PST-12-files-gate.md`

_exit 0, 33s_

PST-12 ensures the project-store's phase:files is gated at M1 by a global Setup & auth guard, validating GET-never-mutates invariants and an end-to-end checklist. The checklist confirms route protection, proper file operations with hash conflict handling, and that GET requests are side-effect free. Demo validates sample project creation, curl-based file reads/writes with conflicts, path rejection, and agent summarization of outline.md via tool calls.

### `units/PST-13-fts5-search.md`

_exit 0, 18s_

PST-13 plans to implement a per-project FTS5 SQLite database that indexes only sources and entities files, excluding drafts, and keeps the index fresh by comparing a manifest of file changes. The search API accepts queries and returns ranked passages with path, offset, snippet, and score, rebuilding the index automatically when file changes or the project version changes. Orphan indexes are removed at startup, and the implementation safely handles special characters in queries.

### `units/PST-14-search-box-ui.md`

_exit 0, 29s_

The PST-14 document describes a search box UI on the files page that queries the active project’s search endpoint with an optional sources/entities toggle. Results show project‑relative paths and snippets; selecting a result opens the file at the indicated passage, and the component works at phone width. Acceptance criteria include component tests, toggle functionality, and a passing phone viewport test, and this feature completes the project store’s search phase, enabling tools and the agent loop to look up information.

### `units/PST-15-propose-pending-store.md`

_exit 0, 37s_

The PST-15 design introduces an in‑process `propose` function that queues changes in a pending store without modifying files, capturing bases and supporting same‑origin folding. Pending changes are validated against path‑specific rules, stored as JSON files, and listed via a queue API, while provenance and grounding data are recorded. Acceptance criteria ensure proposes create proper pending entries, update correctly for identical origins, work with inactive projects, use supplied or captured bases, and reject invalid content via validators.

### `units/PST-16-apply-three-way-check.md`

_exit 0, 36s_

Accept/reject operations use a three-way check comparing base, pending, and disk versions to flag conflicts; accepted changes write content or version existing drafts, while rejected changes are marked accordingly. The system performs eager conflict detection on listing, persists changed flags, and publishes events such as pending-updated and pending-resolved. Versioned drafts save previous content to drafts/.versions before applying, and direct host edits trigger appropriate conflict errors.

### `units/PST-17-refresh-accept-anyway.md`

_exit 0, 17s_

This document describes conflict resolution features for the project store. The 'Refresh' operation performs a three-way merge between base, proposed, and disk content, clearing conflicts when changes don't overlap but preserving conflicts when they do. The 'Accept anyway' operation saves the current disk content as a draft or backup before overwriting with the proposal. Both actions require an active project and aim to prevent small host edits from discarding proposals.

### `units/PST-18-draft-versions-api.md`

_exit 0, 16s_

The PST-18 document defines an API for draft versions that lets users list all versions with their IDs and sizes, read a specific version’s content, and restore a version by saving the current content as a new version and writing the restored content directly. Versions are stored in `drafts/.versions/` and are only accessible through these draft‑specific routes; restoring triggers a `files-changed` publish. Renaming a draft would orphan its existing versions, and the feature is part of the project‑store module in the pending‑review phase.

### `units/PST-19-optional-watcher.md`

_exit 0, 32s_

PST-19 implements an optional file watcher for project-store that monitors the active project for UI refresh and conflict re-check, publishing debounced `files-changed` events when files are edited and re-checking conflict flags for pending changes. The watcher is controlled by `SCRIBA_WATCHER` (default true) and is especially important for unreliable hosts like macOS Docker Desktop. It re-targets on project switch and stops on shutdown. Acceptance criteria verify it works with the watcher enabled and disabled without affecting other test suites.

### `units/PST-20-review-queue-ui.md`

_exit 0, 23s_

PST-20 implements a review queue UI for pending changes, routing to `/projects/:projectId/review` with optional `?run=` filtering. The list groups items by origin run, displays conflict badges, grounding chips, and provenance, and opens diffs in the Shell's read-only diff or merge view with actions like accept, reject, refresh, and accept-anyway, supporting live updates. Designed phone-friendly with a single column and sticky buttons, it must pass component tests, phone viewport tests, and integrate edited text via the merge view when available.

### `units/PST-21-version-history-ui.md`

_exit 0, 17s_

PST-21 implements a version history UI for draft files, displaying a list of versions with options to view, diff against the current draft using the read-only diff, and restore a previous version after confirmation, while automatically refreshing when files change. The implementation includes component tests verifying the list renders, version diff functionality, restore operations that POST and refresh the view, and ensures the UI works at phone width.

### `units/PST-22-review-gate.md`

_exit 0, 16s_

PST-22 defines the review gate for the project store's pending-review phase at milestone M3, requiring an e2e 'accept change' step that writes the agent's pending modification to a versioned draft and updates the review queue. The acceptance criteria cover propose behavior, diff editing, conflict detection, and phone-friendly review queue functionality, with a demo showing accepting changes on desktop and phone, handling conflicts, and restoring previous versions. Completing this gate enables the M3 milestone when an unsupported statistic in a draft is flagged.

### `units/PST-23-lazy-migrations.md`

_exit 0, 12s_

PST-23 implements lazy, per-file migrations with a registry keyed by file kind and version. Migrations trigger on first write or POST, back up files, log migrations, and preserve project.yaml comments while refusing too-new files. The system ensures upgrades happen automatically without pending changes.

### `units/PST-24-byte-safe-file-write.md`

_exit 0, 32s_

PST-24 introduces a byte-safe write mechanism using an optional `contentBase64` field to store binary files exactly without UTF-8 corruption. When `contentBase64` is provided, files are written directly with decoded bytes, bypassing UTF-8 encoding used in previous text writes. Binary files stored this way are recognized as non-text and return undefined on text read attempts, while text files and listing behavior remain unchanged. This enables correct handling of binary templates in compile and export copy operations.

### `units/PST-34-files-editor-adoption.md`

_exit 0, 20s_

The PST-34 plan adopts CodeMirror 6 direct save with stale‑base warnings for desktop and tablet, using `baseHash` in saves and showing a conflict warning without losing changes; mobile devices continue to use read‑only preview. This follows decisions to open files read‑only in Markdown preview until the Shell editor phase is complete, and the scope covers a follow‑up PR implementing these editor features. Acceptance criteria confirm that when the editor is present, saves include `baseHash` and conflict responses display the warning without discarding author text.

### `units/README.md`

_exit 0, 38s_

OpenCode organizes development into units of work stored as markdown files, each representing a PR with self-contained context and acceptance criteria. Units are grouped into modules, waves, and milestones, with dependencies managed through blocked_by and unblocks fields. Modules implement features via contract-driven HTTP APIs, SSE events, and follow strict conventions for testing, settings, and phased deployment starting with platform scaffolding.

### `units/SAU-01-contract-slice.md`

_exit 0, 29s_

SAU-01 defines the TypeScript contract slice for setup and authentication, specifying shapes for setup status, token handshake, identity, normalized Tailscale status, allowlist, preferences, compose version, route constants, and error codes. It provides Zod schemas and example payloads that validate these structures, with acceptance criteria ensuring the shapes are exported from the contracts package and no runtime code is included. The contract closes the setup & auth `phase:contract` and unblocks later steps such as SAU-02.

### `units/SAU-02-token-store-setup-url.md`

_exit 0, 27s_

SAU-02 outlines the implementation of a secure token store and dynamic setup URL for the setup-auth module. It describes generating a high-entropy token on first start, storing it with restrictive permissions, and using it to build a `setup-url` that includes the current port and is printed to stdout. The token supports cookie signing and invalidates cookies when replaced, and the URL is rewritten on each restart while never appearing in logs except via the URL line. Acceptance criteria confirm correct token and URL creation, persistence across restarts, and that the token value is never logged elsewhere.

### `units/SAU-03-handshake-cookie-identity.md`

_exit 0, 18s_

The module defines a token handshake endpoint that issues a secure, HttpOnly, SameSite=Strict session cookie only on loopback hosts when a valid token is provided, redirecting to the setup page or home once complete. It details handling of invalid tokens, cookie attributes including Secure flag verification across browsers, sign-out functionality, and an identity endpoint that reports the authentication context. Acceptance criteria ensure the cookie is set correctly for both localhost and 127.0.0.1, old cookies are invalidated after token replacement, and appropriate error pages and redirects occur.

### `units/SAU-04-global-guard.md`

_exit 0, 20s_

SAU-04 defines a global default-deny guard that secures all routes by enforcing host allowlisting, session cookie authentication, and origin validation while disabling CORS and framing. For each request, the guard first verifies the host matches an allowlist entry, then checks for a valid cookie on loopback hosts, and finally ensures mutating requests include a correct Origin header. Public endpoints such as /healthz remain exempt, but all other responses include anti-framing CSP headers and no CORS, and the guard provides a typed identity accessor for Platform integration.

### `units/SAU-05-status-continue-api.md`

_exit 0, 15s_

Implement a GET /api/setup-auth/status endpoint that returns the current setup auth status, showing `access: done` for authenticated users and other steps as pending, and a POST Continue endpoint that skips remaining pending steps and marks the setup as complete while only merging changes into the `setupAuth` section of settings.yaml. The status check is side‑effect free, and after Continue the library’s status reflects completion with minimal changes to configuration.

### `units/SAU-06-minimal-setup-page.md`

_exit 0, 16s_

The SAU-06 design defines a minimal `/setup` page for the setup-auth module that displays the current identity and a Continue button to complete setup and navigate. It also includes a sign-in notice for 401 errors, showing either loopback instructions with a command to display the setup URL or tailnet error codes explanations. Acceptance criteria require component tests verifying identity display, button behavior, error notices, and proper rendering on phone viewports.

### `units/SAU-07-invariant-tests.md`

_exit 0, 11s_

The SAU-07 plan defines invariant tests to ensure that GET and HEAD requests never mutate state and that mutation routes are properly guarded against unauthorized access. It includes enumerating all routes, authenticating, snapshotting the library and settings, and asserting no changes after GET/HEAD calls, while also verifying that mutation endpoints reject requests without proper credentials or allowed origins. The tests run in CI against the composed application and must pass, with failures triggered by unintended mutations or missing guards.

### `units/SAU-08-token-guard-gate.md`

_exit 0, 22s_

Token-guard gate is the final phase of the setup-auth flow, implementing token lifecycle management, secure cookie attributes, and comprehensive 401/403 protections for all routes while ensuring the status updates from incomplete to complete. It includes acceptance criteria covering token regeneration, handshake redirects, origin/host validation, and security headers, along with an end-to-end test of the setup step. The phase is demonstrated via a local dev run where the setup URL authenticates users and various failure cases are verified, and it must pass before M1 walking skeleton completion.

### `units/SAU-09-setup-flow-api.md`

_exit 0, 23s_

SAU-09 defines a Setup-flow API that manages five sequential steps (access, tailscale, providers, preferences, firstProject) with status tracked as pending, done, or skipped, and a complete flag set when the author finishes or skips remaining steps. It provides GET and POST preferences endpoints for author name and default genre pack that perform field-level merges, ensuring unchanged settings remain intact, and includes an in-process preferences reader for other modules. The design emphasizes idempotent, safe writes that never delete or reset data, and includes acceptance criteria verifying step updates, preference partial updates, reader functionality, and side-effect‑free GETs.

### `units/SAU-10-compose-version-status.md`

_exit 0, 23s_

The SAU-10 feature adds a compose version mismatch check that compares the installer-stamped `SCRIBA_COMPOSE_VERSION` with the expected version from Platform. It reports status as `ok`, `mismatch`, or `unknown` and exposes this via the `/api/setup-auth/status` endpoint for use in setup, settings pages, and the shell banner. The UI displays a warning with the command to re-run the installer when a mismatch or unknown status is present. Acceptance criteria define that unset versions show `unknown`, older versions show `mismatch`, and matching versions show `ok`.

### `units/SAU-11-wizard-shell-routing.md`

_exit 0, 20s_

SAU-11 specifies a setup wizard with five ordered steps (Access, Tailscale, Model providers, Preferences, First project), where steps except Access can be skipped and completion sets a `complete` flag. The wizard handles routing to `/setup` until completion then to the main app, supports re-running the setup, works on phone including over the tailnet, and replaces the old continue button with its own completion flow while showing a compose-version warning when needed. Acceptance criteria include component tests for step flow, routing, phone rendering, and warning display.

### `units/SAU-12-providers-step.md`

_exit 0, 51s_

SAU-12 implements the Providers step in the setup flow, embedding the Model providers settings panel (via Angular API) and linking to `/providers` until the panel exists. It does not reimplement provider forms, model listing, or connection tests, relying on the Model providers module seeded with Ollama. The step marks itself done when a usable provider is chosen or skipped. Acceptance criteria require rendering the providers component stub without forms and showing the link to `/providers` before the panel is available.

### `units/SAU-13-preferences-step.md`

_exit 0, 12s_

The SAU-13 preferences step lets users set their display name and default genre pack—drawing from built‑in and user‑defined packs with a free‑text fallback—and includes a device‑local theme toggle that works without server calls. It saves only changed fields via a POST request and marks the step complete or skipped, prefilling existing values so that updates send only the modified data. The implementation satisfies acceptance criteria by ensuring the toggle is a client‑side Shell component and that preferences are persisted locally.

### `units/SAU-14-first-project-step.md`

_exit 0, 17s_

The SAU-14 step implements the first-project setup by calling the Project store API to list existing projects, create a new project with the default genre pack, import an existing folder, or start from a sample, without recreating anything if projects already exist. It marks the step as done when a project is active or skipped. Component tests verify the correct API shapes and that re-runs only list projects and do not create new ones unless prompted, and this step unblocks SAU-16.

### `units/SAU-15-settings-page.md`

_exit 0, 28s_

SAU-15 defines the settings page with sections for device connection, preferences, providers, version info and mismatch warnings, recovery instructions, re-run setup, and sign out. It outlines recovery steps such as reopening the setup URL, replacing a leaked token, wiping the config directory, or using a Mac for tailnet devices, and notes the app can control tailscale via a shared socket. The work is blocked by SAU-06, SAU-09, SAU-10 and frontend shell phase SHL-09, and unblocks SAU-16 and SAU-20. Acceptance criteria include component tests for these features and documentation of the recovery steps.

### `units/SAU-16-setup-flow-gate.md`

_exit 0, 28s_

SAU-16 closes the Setup & auth phase:setup-flow by extending the platform's end-to-end test so that the setup → project-from-sample leg runs through /setup's first-project step. The acceptance criteria ensure a fresh library can complete all five steps (skipping providers and preferences shows as skipped), that re-running /setup pre-fills saved values, that the first-project step creates a nonfiction sample project via the Project store API without duplicate projects, that the providers step renders the model component without duplicate forms, and that an old SCRIBA_COMPOSE_VERSION displays a warning while the matching version does not. The demo shows users picking an Ollama model, setting an author name, starting from the nonfiction sample, seeing prefilled values on re-run, changing the default genre pack, and encountering the version warning when appropriate.

### `units/SAU-17-localapi-client-status.md`

_exit 0, 20s_

The SAU-17 work item describes building a Tailscale LocalAPI client that reads status information from a Unix socket endpoint. It normalizes the response into fields like availability, backend state, auth URL, DNS name, tailnet URL, magic DNS enablement, HTTPS certificate status, and owner login, caching the data and providing a rate-limited refresh. The client supports UI components needing login links, tailnet details, and prerequisite checks without the Tailscale CLI, and includes test doubles for various socket states to meet acceptance criteria.

### `units/SAU-18-tailnet-guard-path.md`

_exit 0, 23s_

The tailnet guard path validates that API calls to the tailnet host originate from a trusted Tailscale identity delivered via a `Tailscale-User-Login` header over a loopback peer, and that the host and origin match the expected tailnet name. Requests lacking the header receive a 403 `AUTH_Tailnet_Identity_Missing`, while non‑loopback peers or incorrect HTTP origins are rejected, and late login works without restart via a rate‑limited refresh of Tailscale status. Session cookies are not treated as credentials, and mutations require HTTPS origins matching the tailnet.

### `units/SAU-19-owner-allowlist.md`

_exit 0, 22s_

SAU-19 implements an owner allowlist for authentication, off by default and stored in `setupAuth.allowlist`. When enabled with an empty list, it seeds the owner's login; changes excluding the current login are refuseable, and non-allowlisted logins receive 403 errors. Loopback cookie access bypasses the allowlist, with endpoints under `/api/setup-auth/`.

### `units/SAU-20-tailscale-ui.md`

_exit 0, 17s_

SAU-20 plans the Tailscale UI implementation in the /setup flow and settings page, showing status states, login link, tailnet URL, prerequisites hints, a skip option, and an owner allowlist toggle with lockout messaging. The UI polls the status endpoint every few seconds while visible and stops polling when hidden. Acceptance criteria require component tests for each state, proper rendering of the allowlist toggle and lockout error, and correct polling behavior.

### `units/SAU-21-tailnet-gate.md`

_exit 0, 18s_

The Tailnet gate phase (SAU-21) completes setup and auth for phase:tailnet by running a socket‑permission smoke test, verifying real tailnet routing and enabling late login without restart, while ensuring the app can control tailscaled only via the shared socket and reads status securely. Acceptance criteria cover socket reachability, header handling, allowlist enforcement, loopback behavior, and the requirement that logging in via the tailnet URL works immediately after approval. The phase also updates documentation, adds the socket test to the pre‑release checklist, and demonstrates the flow of logging in from settings and accessing the tailnet URL on a device.

### `units/SAU-22-guard-dev-mode.md`

_exit 0, 14s_

The SAU-22 document proposes a new environment variable `SCRIBA_DEV_AUTH` to enable a development mode that skips cookie and Origin checks required for local runs with `npm run dev`. When enabled, `SetupAuthGuard.canActivate` allows cookie‑less requests and mutation calls, sets a loopback identity, and still enforces host allowlist and frame restrictions. The flag is validated at boot: it causes a failure if set in production, logs a warning when active, and is only intended for local development. Existing tests remain unchanged to verify production behavior.

### `units/SHL-01-composition-root.md`

_exit 0, 23s_

SHL-01 task is to take over the web app's composition root, route table, and dev proxy, after which the platform will no longer edit them. Decisions include a zoneless, standalone Angular app with signals-first change detection, a feature-registration pattern where each lazy feature declares its routes and the root table aggregates them, and a route data type that carries navigation labels, icons, order, minimum device class, and scope. The dev proxy forwards /api, /healthz, and an unbuffered events stream while preserving Host and Origin headers, and the Shell provides a not-found page. Acceptance criteria verify that the proxy works, headers are forwarded unchanged, unknown paths render the not-found page, and route data is correctly exported.

### `units/SHL-02-typed-api-client.md`

_exit 0, 17s_

The SHL-02 typed API client wraps Angular's HTTP client to send same-origin requests with credentials and no auth headers. It parses responses using Zod schemas provided by callers, failing loudly on mismatches, and converts non-2xx responses into typed errors. A 401 response redirects the application to /setup. The client supports only GET and POST methods.

### `units/SHL-03-sse-client.md`

_exit 0, 22s_

SHL-03 introduces a single EventSource per tab that parses envelope‑schema messages and demultiplexes events per module, ignoring unknown modules. It tracks connection state and implements capped‑backoff reconnection after a CLOSED state, including health checks and auth redirects. Features reconcile their run state on stream re‑open, visibility, online, and pageshow events. The design meets acceptance criteria for proper event routing, reconnect behavior, and state transitions.

### `units/SHL-04-theming-notices.md`

_exit 0, 15s_

The document describes implementing Material 3 light and dark themes with a device‑local override, a exported theme toggle component, and a root notices service for app‑wide banners and snackbars. Themes follow the OS setting by default but can be manually overridden locally without server calls. Acceptance criteria confirm that themes persist across reloads and that notices render and can be dismissed.

### `units/SHL-05-breakpoint-gate-nav.md`

_exit 0, 26s_

SHL-05 defines a device-class signal and breakpoint gate that filters features and navigation according to the current device type (phone, tablet, desktop). It implements a `deviceClassGuard` to hide views unsuitable for the device and redirects to a "needs a larger screen" page when accessed improperly, while keeping open views alive during resize and showing a notice. The gate checks at navigation and adapts the navigation UI to bottom bar on phones, side rail on tablets, and expanded side nav on desktops. Acceptance criteria validate hiding of tablet‑min features, resize handling, correct nav display, and route guarding.

### `units/SHL-06-connection-indicator.md`

_exit 0, 23s_

SHL-06 defines a connection indicator and server-unreachable banner. Decisions include a subtle status indicator based on SSE state, shown for reconnecting or closed states but hidden when open, and a plain 'server unreachable' banner via the notices service when health checks fail. Acceptance criteria require that stopping the API shows the reconnecting indicator followed by the banner, restarting clears both and fires a reconcile tick, and component tests validate these states using a stubbed EventSource.

### `units/SHL-07-test-doubles.md`

_exit 0, 21s_

SHL-07 defines test doubles for the API client and event source, providing fake versions of the interfaces from SHL-02 and SHL-03 that let tests register canned responses, simulate envelopes, and record requests. A provider helper swaps these fakes into Angular's Vitest runner for feature route tests, and a template feature route test is included for modules to copy. The acceptance criteria require that a dummy feature's route test runs under Vitest using only the fakes, asserting rendered values from fake responses and live updates from fake envelopes, and that the fakes reject responses that don't match the passed schema.

### `units/SHL-08-active-project-landing.md`

_exit 0, 27s_

Active-project signal from the route parameter drives landing redirects: incomplete setup sends to `/setup`, complete with an active project goes to its chat or the projects list, and with no project goes to `/projects`. Route reconciliation compares the URL's project ID with the server's active project, showing a switch prompt when they mismatch and activating the correct project on user choice. A `project-switched` SSE event causes all open tabs on project routes to navigate to the new project's path. The acceptance criteria verify these redirects, switch behavior, and tab updates.

### `units/SHL-09-core-gate.md`

_exit 0, 19s_

SHL-09 is the core gate for the frontend shell, merging which closes phase:core and requires the shell to serve correctly via `npm run dev`, include proxy health checks, and support a dummy lazy‑loaded feature. It must pass breakpoint gate, navigation forms, API client, SSE demux, and related modules SHL‑02 through SHL‑08, with all tests on main and Playwright e2e still green, and includes a route‑test template run by Vitest. M1 is considered complete when a user can ask “summarize my outline” and receive a correct answer with visible tool calls, building on the shell substrate and upcoming chat and tool‑call features. The demo demonstrates running `npm run dev`, verifying version and health, toggling dark mode, responsive phone viewport navigation, and API stop/start reconnection handling.

### `units/SHL-10-tool-call-card.md`

_exit 0, 22s_

SHL-10 describes a tool-call card component and view model for displaying each tool invocation in the chat interface. The card shows the tool name, arguments, status, output or error, and used source files, and is collapsed by default on phones while expanding on tablets and desktops. It is a standalone component driven by a Shell-local view model, independent of the agent loop but possibly reused by the graph runner, and relies on SHL-11's preview for markdown output. The acceptance criteria require proper rendering of tool calls, responsive collapsing behavior, and a sample chat route that demonstrates the component.

### `units/SHL-11-markdown-preview.md`

_exit 0, 16s_

The SHL-11 task defines a markdown preview component that sanitizes markdown content. It uses ngx-markdown with sanitization enabled, hides leading YAML front matter, and prevents execution of scripts or raw HTML. The component accepts a markdown string directly without file I/O and meets acceptance criteria by rendering front-matter-free drafts and neutralizing malicious fixtures.

### `units/SHL-12-readonly-diff.md`

_exit 0, 16s_

SHL-12 implements a read-only diff view using `@codemirror/merge` to compare current and proposed text. The component is responsive, showing unified layout on phones and side‑by‑side on tablets and desktops with a toggle override, and highlights insertions, deletions, changed lines, as well as whitespace, line‑ending, and front‑matter differences. It accepts path, base text, proposed text and optional conflict info, and is designed to integrate with future editable proposals while displaying "no changes" when the inputs are identical.

### `units/SHL-13-editor-wrapper-lossless.md`

_exit 0, 10s_

SHL-13 implements a lossless CodeMirror 6 Markdown editor wrapper that preserves file bytes exactly during load and save, handling line endings, trailing newlines, BOM, and front matter without modification. It integrates with the project file API and exposes dirty and save state outputs. Acceptance criteria verify byte‑identical round‑trip saves, precise edit targeting, and read‑only protection.

### `units/SHL-14-editor-saving.md`

_exit 0, 42s_

SHL-14 defines editor saving with debounced auto-save (~1.5s idle), explicit save triggers, and coalesce logic that merges later edits into a single save request using hash-based base checks via the Project store API to prevent conflicts. Save states include unsaved, saving, saved, failed, and conflict, with text preserved on failure and conflicts preventing overwrites. Navigation is guarded by canDeactivate and beforeunload prompts for unsaved changes.

### `units/SHL-15-editor-layout-touch.md`

_exit 0, 17s_

SHL-15 defines the editor layout with a split view and live preview on tablet and desktop, and an edit/preview toggle on phones, while supporting tablet touch, on-screen keyboard, and hardware keyboard inputs. The design decisions make the split view the default for tablets and desktop, the toggle for phones, and ensure all input methods work without hardware-only shortcuts. Acceptance criteria confirm that tablets and desktops show the split view with preview, phones show the toggle, and tablet touch emulation allows cursor placement, selection, typing with the on-screen keyboard, and saving without hardware keys.

### `units/SHL-16-editable-merge-view.md`

_exit 0, 22s_

SHL-16 introduces an editable proposed side in the merge view, allowing users to edit the suggestion before accepting and having the changes emitted. It extends SHL-12's merge component, maintains byte-preserving handling, and keeps line-ending differences visible. Read-only mode remains unchanged, and the component unblocks related work such as PST-34 and SHL-19. Acceptance criteria confirm both editable and read-only behaviors work as intended.

### `units/SHL-17-pwa-service-worker.md`

_exit 0, 20s_

The SHL-17 plan implements a Progressive Web App using a web app manifest and icons, with an Angular service worker that caches only the app shell's static assets and excludes critical endpoints such as `/api`, `/healthz`, `/events`, and `/setup`. It enables installation over the tailnet HTTPS URL and loopback, opens the app in full screen, and prompts users to reload after the server is updated to a new build. Acceptance criteria verify browser installability, ensure excluded routes are not cached, and confirm that updated bundles are loaded after a reload.

### `units/SHL-18-polish-about-shortcuts.md`

_exit 0, 25s_

SHL-18 polishes the shell by implementing an about panel that displays app version, revision, and health; adding desktop keyboard shortcuts for navigation and saving (also accessible without hardware keys); and creating loading skeletons and empty states for Shell-owned UI. This work is blocked by SHL-09, runs parallel with SHL-10 through SHL-17, and unblocks SHL-19. The acceptance criteria confirm the about panel shows version/revision/health, shortcuts are documented and functional, and component tests cover skeletons and empty states.

### `units/SHL-19-polish-gate.md`

_exit 0, 24s_

SHL-19 is the polish gate for the frontend shell, requiring automated accessibility passes, a phone-viewport end-to-end test, and compliance with SHL-17 installability criteria. Completing it closes phase:polish and unlocks milestone M7, which is reached when a user can install the app on an iPad, draft and save a scene, and have a phone review and accept a pending change. A five-minute demo demonstrates installation, drafting, diffing, phone review, and offline connectivity.

### `units/SHL-20-phone-toolbar.md`

_exit 0, 60s_

SHL-20 will adjust toolbar styles to fit 390px phones when the connection label shows, changing app.css, connection-status.ts and app.html bindings while preserving the toolbar's three items order. This work is blocked by SHL-09 and unblocks SAU-06, with acceptance criteria tested by Playwright e2e at 390x844.

### `units/SHL-21-contract-chunks-interop.md`

_exit 0, 30s_

SHL-21 fixes the Shell's contract loader to properly handle CommonJS default exports in production, avoiding undefined routes and errors. The loader now unwraps the default export like SAU-06 and includes a new spec testing both default and named exports via Vitest mocks. Only `contract-chunks.ts` and its spec are changed, and the fix satisfies the criteria that the loader returns SETUP_STATUS_ROUTE and setupStatusSchema for both export types.

### `units/SHL-22-load-sensitive-spec-waits.md`

_exit 0, 17s_

Add explicit 5,000 ms timeouts to vi.waitFor calls in the affected spec files that were flaking under CPU load, and raise test timeouts where needed. Validate the changes by running the full test suite and a load test, ensuring all waits are explicit and no assertions are altered.

### `units/SHL-23-phone-bottom-nav-fit.md`

_exit 0, 20s_

This unit fixes phone bottom navigation overflow at 390px width when ten items are displayed. It modifies the navigation links to shrink and truncate labels, ensuring all items remain visible without horizontal scrolling. The changes are made in app-nav.ts and include new tests to prevent document overflow and pass related e2e specs.

### `units/TRG-01-contract-slice.md`

_exit 0, 67s_

TRG-01 defines the contract slice for publishing tool registry contracts, establishing Zod-validated tool-spec envelopes with required fields including a fixed output enum (draft, entity, claims, graph, check) and port types (text, entity, style). It standardizes descriptors, linting, API shapes, and error codes while ensuring buildability across platform and project store phases and integration with genre packs and graph runner.

### `units/TRG-02-emission-validate.md`

_exit 0, 35s_

Emission of the three views—function schema, form descriptor, and port descriptor—is derived from a JSON schema subset; Ajv validates inputs without coercion using fixture-backed GET and validate endpoints and returns structured `TOOL_ARGS_INVALID` errors for missing, wrong, or unknown fields. The function schema strips `x-` keys and treats style fields as optional, applying defaults and resolving entity IDs for valid inputs. Acceptance criteria ensure required fields and enum violations are caught, defaults are applied, and integer values cannot be coerced from strings.

### `units/TRG-03-form-renderer.md`

_exit 0, 16s_

TRG-03 defines a standalone Angular tool-form renderer with signal-based UI, offering form and node-body layouts for tool parameters. It supports controls like text, number, and toggle, displays required marks and defaults, renders server-side issues inline, and emits values on submit. The component consumes form and port descriptors, integrates with the Graph runner's handle templates, and has met acceptance criteria via Vitest tests.

### `units/TRG-04-entity-style-pickers.md`

_exit 0, 19s_

TRG-04 describes an entity picker that filters project entities by kind, supports single or multiple selections via chips, and accepts dropped entity chips, and a style picker that defaults to the project's style profile from project.yaml. The entity picker retrieves entities from the Project store's entity list, while the style picker selects from style-profile entities using the project's styleProfile. Component tests use the shell's fake API, but the running application uses the real Project store. Acceptance criteria confirm correct filtering, chip handling, and default selection behavior.

### `units/TRG-05-spike-gate.md`

_exit 0, 23s_

TRG-05 is a spike gate for the form‑renderer phase that adds a dev preview route on the Tools page showing a cold‑open fixture with form and node body side by side. The implementation must support entity picking, inline validation feedback, and ensure the generated schema complies with draft‑07 without `x-` keys. A concise spike note recording any vocabulary insights must be committed, and merging this task closes `phase:form-renderer`.

### `units/TRG-06-pack-loader-catalog.md`

_exit 0, 28s_

The pack loader initializes built‑in packs and a user pack, re‑scanning the user pack on changes and giving user tools precedence over built‑ins while validating and migrating schemas in memory; invalid user copies fall back to built‑ins with warnings, newer schema versions are rejected and listed as unsupported, and invalid user tools are hidden. The catalog service exposes project‑specific lists of enabled, valid tools from core, the project’s genre pack, and the user pack, and provides validation per tool and entity‑type schema. Acceptance criteria confirm correct precedence, handling of invalid or newer files, and proper entity‑type schema validation across core, genre, and user packs.

### `units/TRG-07-lint-pack-lint-cli.md`

_exit 0, 38s_

TRG-07 implements linting for pack files and a `npm run lint:packs` CLI that validates tool specifications and entity-type schemas. It enforces rules on YAML structure, dependencies, vocabulary, control/type compatibility, and template syntax, generating diagnostics with severity and location. The CLI fails on errors or duplicate names and provides a library entry point, with acceptance criteria ensuring comprehensive rule coverage and error detection.

### `units/TRG-08-template-engine.md`

_exit 0, 18s_

TRG-08 creates a pure, dependency‑free template engine that parses and renders a small Handlebars‑like language. It supports field interpolation, #each and #if blocks, entity insertion with headers, {{toolCatalog}} and comments, while rejecting partials, helpers, and unsafe constructs. The engine provides parse, variables, and render APIs that return positioned errors and is intended to be reused by lint (TRG‑07) and the executor (TRG‑12). Acceptance criteria confirm correct rendering of all constructs and proper error handling for malformed templates.

### `units/TRG-09-read-endpoints-enabled.md`

_exit 0, 23s_

TRG-09 defines APIs to read tool endpoints, function schemas, and enable/disable tools, including GET routes for tool summaries, specs, built‑in/user versions, functions, and entity types, and POST routes for validation in full or params mode and toggling the enabled flag. The enable switch overrides the default spec’s enabled status via a tools section, persists across restarts and updates, and disables tools from function schemas and the executor while keeping them listed. Acceptance criteria ensure disabling removes tools from function schemas, toggling only updates the tools section, param validation works correctly, and all GET requests are side‑effect free.

### `units/TRG-10-save-delete-catalog-changed.md`

_exit 0, 37s_

TRG-10 is a plan for tool registry endpoints handling linting, save (copy-on-write), delete, and catalog-changed events. It specifies that saving user tools writes to user packs without affecting built-ins, lint returns diagnostics without persisting changes, and delete restores built-ins or returns read-only errors. Acceptance criteria validate these behaviors, including proper event publishing after save, delete, or toggle operations.

### `units/TRG-11-loader-gate.md`

_exit 0, 19s_

TRG-11 establishes the loader‑validation gate for the tool registry. It requires that all `/api/tool-registry` endpoints be protected by the setup‑and‑auth guard, that `npm run lint:packs` be integrated into the lint pipeline and pass in CI, and that the catalog service be documented for the agent loop and graph runner. The gate is considered complete when the checklist items — including the satisfied criteria from TRG‑06, TRG‑07, TRG‑09, TRG‑10 on main and the refusal of unauthenticated requests — are met.

### `units/TRG-12-executor.md`

_exit 0, 25s_

The executor service (TRG-12) renders tool templates and calls models with project-specific system messages, validating inputs and entity references while tracking sourcesUsed for entity-typed fields. It supports render and execute endpoints, handles errors without calling the model for invalid inputs or unresolved entities, and includes acceptance criteria for mocked executions and proper source tracking.

### `units/TRG-13-tools-page-list.md`

_exit 0, 24s_

TRG-13 describes the Tools page that groups tools by origin (core, nonfiction, fiction, user), shows validity and lint counts with an “overrides built-in” marker and enable toggles, routes to /tools with a phone-only list view that refreshes on catalog changes, and is blocked by TRG-05, TRG-11, and SHL-09 while running parallel with TRG-12. Acceptance criteria include component tests verifying grouping, toggle behavior, invalid tool marking, and refresh on catalog-changed events, ensuring the phone viewport displays only the list and toggles. This work unblocks TRG-14, TRG-16, and TRG-17.

### `units/TRG-14-yaml-editor-actions.md`

_exit 0, 29s_

TRG-14 plans to implement a CodeMirror 6 YAML editor with real-time linting and diagnostics, enabling users to customize, revert, compare, new, duplicate, or delete tool specs. Built-in tools open read-only with Customize, Revert, and Compare actions that switch between user copies and builtins. Saving invalid specs displays line errors and retains the previous version unless warnings are present, while valid saves update the user-owned spec. Acceptance criteria ensure these behaviors work as described.

### `units/TRG-15-live-previews.md`

_exit 0, 16s_

TRG-15 aims to add live preview tabs for form, tool node, function schema, and rendered prompt views, updating in real time as users edit fields like x-scriba-port and x-scriba-entity-kinds. The previews are fed by debounced lint responses and show sample values with real entities. Acceptance includes immediate updates to node previews and displaying the rendered prompt with sample data.

### `units/TRG-16-try-panel.md`

_exit 0, 28s_

TRG-16 describes a Try panel feature for running tools against the active project by filling forms, resolving entities in the browser, and executing tools without creating pending changes. It displays output and sources used, shows errors readably, and hides the Try tab on invalid rows. The acceptance criteria ensure component tests validate this flow and that tool execution produces output without writing files to pending directories.

### `units/TRG-17-editor-ui-gate.md`

_exit 0, 28s_

TRG-17 is the Editor-UI gate for milestone M2, which closes the tool registry's phase:editor-ui when TRG-13–TRG-16 are satisfied and the four nonfiction workhorses (cold open, mystery question, myth-buster, numbers-to-people) each produce drafts that cite their source files. The demo illustrates using the Tools view to customize cold_open with a tone selector, correcting typos, running tries with person entities and moments, and optionally leveraging narrative tools while the workhorses are active. Completing these steps fulfills the acceptance criteria and terminates the phase:editor-ui.

