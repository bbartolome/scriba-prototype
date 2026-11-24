# Architecture

This document describes how Scriba is built. The terms have the meanings given in [Terms](TERMS.md).

## Overview

Scriba has two runtime parts and one external service.

- The web app runs in the browser. It is written in Angular.
- The API (application programming interface) server runs on your computer. It is written in NestJS. It reads and writes the library folder.
- The model service runs outside Scriba. The agent sends it requests through the OpenAI-compatible API, a common interface for model services.

The web app and the API server exchange HTTP (the protocol for web requests) messages. The API server also sends live events.

```text
  Browser
  Web app (Angular)
        |  HTTP requests to /api/<module>/...
        |  live events from /events
        v
  API server (NestJS) ----- calls -----> Model service
        |  reads and writes
        v
  Library folder on disk
```

In the container image, the API server also serves the built web app. The image contains Pandoc and Typst. Pandoc makes Word (DOCX) and EPUB (an e-book format) files. For PDF (Portable Document Format), Pandoc uses Typst as its engine. Scriba writes Markdown directly. A Tailscale container shares its network with Scriba. It gives Scriba an HTTPS (HTTP with encryption) address on your tailnet.

## Modules

Scriba has ten modules. Eight modules run in the API server. The frontend shell and the genre packs have no API module. Each module has design notes in the `modules/` folder.

| Module           | Responsibility                                                                                                                                                               | Design notes                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Platform         | The shared base. It holds the contracts, the event stream, the error shape, the settings and the installer. The API composition root is the file that joins the API modules. | [Notes](../modules/platform.md)       |
| Frontend shell   | The web app root, the route table, the typed API client, the live-update client and the shared user interface (UI).                                                          | [Notes](../modules/shell.md)          |
| Setup & auth     | The first-run setup, the setup cookie, the tailnet identity and the default-deny guard.                                                                                      | [Notes](../modules/setup-auth.md)     |
| Model providers  | The connections to model services. It keeps the keys in a restricted file.                                                                                                   | [Notes](../modules/providers.md)      |
| Project store    | The books on disk: projects, files, search, pending changes and draft versions.                                                                                              | [Notes](../modules/project-store.md)  |
| Tool registry    | The tool specs, the validation and the execution of tools.                                                                                                                   | [Notes](../modules/tool-registry.md)  |
| Genre packs      | The three packs of tool specs and entity types: core, nonfiction and fiction.                                                                                                | [Notes](../modules/genre-packs.md)    |
| Agent loop       | The tool-calling loop behind the chat panel.                                                                                                                                 | [Notes](../modules/agent-loop.md)     |
| Graph runner     | The graph canvas, the story graphs and the recipes.                                                                                                                          | [Notes](../modules/graph-runner.md)   |
| Compile & export | The manuscript order, the preflight checks, the snapshots and the exports.                                                                                                   | [Notes](../modules/compile-export.md) |

## Frameworks and libraries

| Area       | Choice                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app    | Angular 22 with Angular Material. It uses zoneless change detection and signals. The editor uses CodeMirror. The graph canvas uses ngx-vflow.                                           |
| API server | NestJS 12 on Node.js 26, a JavaScript runtime. It validates data with Zod. It calls model services with the official OpenAI software development kit (SDK).                             |
| Storage    | Plain files. The settings are in YAML files. Keyword search uses SQLite (a small database engine) with FTS5 (full-text search, version 5), through the built-in `node:sqlite` library.  |
| Exports    | Pandoc 3.13 makes DOCX, EPUB and PDF files. Pandoc uses Typst 0.15.1 as the PDF engine. Scriba writes Markdown directly.                                                                |
| Tests      | Vitest for unit and API tests. Playwright for end-to-end tests.                                                                                                                         |
| Delivery   | A Docker image for two processor types, amd64 and arm64. Docker Compose with a Tailscale container. GitHub Actions. semantic-release, which sets release versions from commit messages. |

## Repository layout

| Folder               | Contents                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`           | The Angular web app.                                                                                                                                       |
| `apps/api`           | The NestJS API server.                                                                                                                                     |
| `packages/contracts` | The shared types and route constants. There is one subpath (an import path) for each of the ten modules. The `shell` and `genre-packs` subpaths are empty. |
| `packages/packs`     | The genre packs hold the tool specs and the entity types. The golden files are saved model requests that the golden tests compare with.                    |
| `e2e`                | The end-to-end tests in a real browser, with a mock model server.                                                                                          |
| `examples`           | Sample projects for the nonfiction and fiction packs.                                                                                                      |
| `deploy`             | The Compose file, the installer files and the operations runbook.                                                                                          |
| `scripts`            | The build, check, installer and release scripts.                                                                                                           |
| `modules`            | The design notes for each module.                                                                                                                          |
| `docs`               | This document, the terms, the development guide, the release guide and the architecture decision records.                                                  |
| `plans`              | The decision log.                                                                                                                                          |

## Files on disk

```text
~/Books/                        the library folder
  .scriba/                      app data: settings.yaml, secrets.yaml,
                                the search index, the setup token, the setup URL,
                                your own tools in packs/user/
  <project>/                    one book
    project.yaml                project settings
    sources/  entities/  drafts/  graphs/  logs/
    drafts/.versions/           older versions of each draft
    .scriba/                    pending changes, backups and exports of this project
    snapshots/                  snapshots, made when you take one
```

## Design strategy

- **Contract slice.** Each module with an API has its types, route paths and error codes in `packages/contracts`. The API and the web app use the same types.
- **Entry files.** A module imports another module only through its entry file. For an API module, the entry file is named `*.module.ts`. For a web feature, it is named `*.routes.ts`. The agent loop and the graph runner never import each other. A lint rule and a boundary test check these rules.
- **Published contracts change in small steps.** Add the new part first. Remove the old part later. Persisted formats carry a `schemaVersion`.
- **The agent proposes. The author decides.** Agent writes and recipe writes become pending changes. Your typing saves immediately.
- **One error shape.** Every error has a `code`, a `message` and optional `details`. Each code starts with its module prefix, for example `PLATFORM_NOT_FOUND`.
- **Events carry no history.** After it reconnects, a client reads the current state. The state routes are the API routes that return it.
- **Keys stay out of the settings file.** The model keys are in `secrets.yaml`, which has mode 0600. Only the owner of the file can read or write it. The settings file keeps only key references (names that point to the keys).
- **The default is deny.** Every route needs the setup cookie or a tailnet identity, unless the route is public.
- **Tests check behaviour from outside.** Tests use HTTP responses, events, files on disk, rendered pages and mock model requests. They do not test private helpers.
- **Automated tests do not call real models.** A mock server that follows the OpenAI-compatible API replaces the model. A manual script runs real models.
- **The development mode is local only.** `SCRIBA_DEV_AUTH=1` skips two checks. The API refuses to start with this flag when `NODE_ENV=production`.
