# Scriba

Scriba is a tool for writing books. A book is a set of plain files in a folder on your computer. You write in the app. You can also ask an artificial intelligence (AI) agent for help.

The agent does not change your files directly. It creates pending changes. You accept or reject each pending change. Your typing saves immediately.

Scriba has one owner. It runs on your computer. You can use it from that computer, or from a phone over a private Tailscale network. In this README, that private network is called the tailnet.

## Terms

Scriba stores its settings in YAML files. YAML is a plain text format. The API (application programming interface) is the server part of Scriba. Each term below has one meaning in this README and in the code.

| Term             | Meaning                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library          | The folder that holds all projects and the `.scriba` folder. The default is `~/Books`.                                                                                                                     |
| Project          | One book. A project is a folder in the library that has a `project.yaml` file.                                                                                                                             |
| Source           | A file in the `sources/` folder. It holds notes or reference material.                                                                                                                                     |
| Entity           | A file in the `entities/` folder. It describes one item of the book, such as a person or a place.                                                                                                          |
| Draft            | A manuscript file in the `drafts/` folder.                                                                                                                                                                 |
| Pending change   | A proposed change to a project file. The agent or a recipe creates it. You accept or reject it.                                                                                                            |
| Snapshot         | A saved copy of the manuscript at one time.                                                                                                                                                                |
| Tool             | A named action that the agent or a recipe can run. A tool spec, a YAML file, defines it.                                                                                                                   |
| Genre pack       | A set of tools and entity types for one kind of book.                                                                                                                                                      |
| Story graph      | A diagram that links scenes, beats and entities. A beat is one unit of the story, such as a turning point. A story graph does not run.                                                                     |
| Recipe           | A runnable graph of input, tool and output steps.                                                                                                                                                          |
| Provider         | A connection to a model service.                                                                                                                                                                           |
| Model service    | A service that runs an AI language model.                                                                                                                                                                  |
| Module           | One part of Scriba with one responsibility.                                                                                                                                                                |
| Image tag        | The name of one image version, for example `latest`.                                                                                                                                                       |
| Setup URL        | The web address (URL) that gives the setup cookie to a browser on the computer that runs Scriba. Before setup, it opens the first-run setup. After setup, it opens Scriba. Scriba prints it at each start. |
| Setup token      | The secret in the setup URL. Scriba keeps it in `.scriba/setup-token`. A person who has the setup URL also has the setup token.                                                                            |
| Setup cookie     | A cookie that lets a browser use Scriba. The browser keeps it after setup.                                                                                                                                 |
| Tailnet identity | The login of a tailnet user. Tailscale gives it to the API.                                                                                                                                                |
| Allowlist        | The list of tailnet logins that can use Scriba. It is off by default.                                                                                                                                      |
| Origin check     | The API check of the Origin header. The header of each request that changes data must match the host.                                                                                                      |
| Web feature      | A folder of screens for one module in the web app.                                                                                                                                                         |

## What Scriba does

- Creates and opens book projects. Each project is one book.
- Shows and edits the files of a project.
- Searches the sources and entities of a project by keyword.
- Shows pending changes. You accept or reject each change.
- Keeps the version history of each draft.
- Runs a chat panel. The agent writes and edits text in the panel.
- Checks drafts against their sources (the grounding check).
- Shows a graph canvas. You build story graphs and run recipes on it.
- Lists the tools. You can set a tool as active or inactive, change its settings and try it.
- Shows the manuscript. It runs five preflight checks (checks that run before export), takes snapshots and exports the book.
- Exports the manuscript to Markdown, Word (DOCX), EPUB (an e-book format) and PDF (Portable Document Format) files.
- Makes the connections to model services. Each connection is a provider.

## Architecture

### Overview

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

In the container image, the API server also serves the built web app. The image contains Pandoc and Typst. Pandoc makes the DOCX and EPUB files. For PDF, Pandoc uses Typst as its engine. Scriba writes Markdown directly. A Tailscale container shares its network with Scriba. It gives Scriba an HTTPS (HTTP with encryption) address on your tailnet.

### Modules

Scriba has ten modules. Eight modules run in the API server. The frontend shell and the genre packs have no API module. Each module has design notes in the `modules/` folder.

| Module           | Responsibility                                                                                                                                                               | Design notes                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Platform         | The shared base. It holds the contracts, the event stream, the error shape, the settings and the installer. The API composition root is the file that joins the API modules. | [Notes](modules/platform.md)       |
| Frontend shell   | The web app root, the route table, the typed API client, the live-update client and the shared user interface (UI).                                                          | [Notes](modules/shell.md)          |
| Setup & auth     | The first-run setup, the setup cookie, the tailnet identity and the default-deny guard.                                                                                      | [Notes](modules/setup-auth.md)     |
| Model providers  | The connections to model services. It keeps the keys in a restricted file.                                                                                                   | [Notes](modules/providers.md)      |
| Project store    | The books on disk: projects, files, search, pending changes and draft versions.                                                                                              | [Notes](modules/project-store.md)  |
| Tool registry    | The tool specs, the validation and the execution of tools.                                                                                                                   | [Notes](modules/tool-registry.md)  |
| Genre packs      | The three packs of tool specs and entity types: core, nonfiction and fiction.                                                                                                | [Notes](modules/genre-packs.md)    |
| Agent loop       | The tool-calling loop behind the chat panel.                                                                                                                                 | [Notes](modules/agent-loop.md)     |
| Graph runner     | The graph canvas, the story graphs and the recipes.                                                                                                                          | [Notes](modules/graph-runner.md)   |
| Compile & export | The manuscript order, the preflight checks, the snapshots and the exports.                                                                                                   | [Notes](modules/compile-export.md) |

### Frameworks and libraries

| Area       | Choice                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app    | Angular 22 with Angular Material. It uses zoneless change detection and signals. The editor uses CodeMirror. The graph canvas uses ngx-vflow.                                           |
| API server | NestJS 12 on Node.js 26, a JavaScript runtime. It validates data with Zod. It calls model services with the official OpenAI software development kit (SDK).                             |
| Storage    | Plain files. The settings are in YAML files. Keyword search uses SQLite (a small database engine) with FTS5 (full-text search, version 5), through the built-in `node:sqlite` library.  |
| Exports    | Pandoc 3.13 makes DOCX, EPUB and PDF files. Pandoc uses Typst 0.15.1 as the PDF engine. Scriba writes Markdown directly.                                                                |
| Tests      | Vitest for unit and API tests. Playwright for end-to-end tests.                                                                                                                         |
| Delivery   | A Docker image for two processor types, amd64 and arm64. Docker Compose with a Tailscale container. GitHub Actions. semantic-release, which sets release versions from commit messages. |

### Repository layout

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
| `docs`               | The architecture decision records and the release guide.                                                                                                   |
| `plans`              | The decision log.                                                                                                                                          |

### Files on disk

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

### Design strategy

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

## Getting started

Use Node.js 26, as set in `.nvmrc`. Use the npm version in the `packageManager` field of `package.json`.

```sh
npm ci          # install every workspace from the lock file
npm run dev     # build contracts and the API, then watch and serve everything
npm run build   # contracts, then API, web, packs and e2e
npm test        # every workspace, then the scripts/*.test.mjs checks
npm run lint    # every workspace, then the example and pack checks, then prettier --check .
```

`npm run dev` starts the web app at `http://localhost:4200`. The Angular development server forwards `/api`, `/healthz` and `/events` requests to the API. The development API server listens on `0.0.0.0:8080`. Its library is in `.scriba-dev/`, which Git ignores.

`SCRIBA_DEV_AUTH=1` is a development mode, and `npm run dev` sets it. It skips the setup cookie check and the Origin check on the API. This flag is local only. When `NODE_ENV=production`, the API refuses to start with this flag, and it exits with code 1. No image or compose file sets it. With the flag on, any device that can reach port 8080 can call the API. A web page open in the browser can also send POST requests (requests that send data) to the local API.

## Install, update and roll back

The installer runs with one command. It writes a `.env` file and a compose file in the folder where you run it. That folder is the install folder. The installer then starts the stack. The stack is the two containers, `scriba` and `tailscale`. You need Docker and Docker Compose 2.24 or later. Run the installer as your own user, not as root.

### Install

First run `docker pull bbartolome/scriba`. Then run this command in an empty folder:

```sh
docker run --rm -e SETUP=true bbartolome/scriba | bash
```

The first run asks for the library folder and the web port. Then it starts the stack and shows the setup URL.

### Update

First run `docker pull bbartolome/scriba`. Then run the same command in the install folder. The update does not ask questions. Before it writes files, it makes two backups.

- It copies `.env` to `.env.bak.<stamp>`.
- It copies `compose.yaml` to `compose.yaml.bak.<stamp>`.

`<stamp>` is the Coordinated Universal Time (UTC) of the run, for example `20261114T093000Z`.

Then the update does three things.

- It keeps the values in `.env`. It takes the new release values for `SCRIBA_IMAGE_TAG` and `SCRIBA_COMPOSE_VERSION`. It adds new keys.
- It replaces `compose.yaml` with the release file. Put your own changes in `compose.override.yaml`. The installer never writes that file.
- It pulls the image. Then it starts the stack and waits until `scriba` is healthy.

A second run changes nothing except one more pair of backups. If the pull fails, the failure is printed. The update then runs `docker compose up -d`. That command fails if the image is missing.

For a quick update, run `docker compose pull && docker compose up -d` in the install folder. This command pulls the images of both containers. It gets new images only when `SCRIBA_IMAGE_TAG` names a tag such as `latest`, which changes over time. If `SCRIBA_IMAGE_TAG` names a fixed version, run the install command again to get the new release.

### Stop and start

Start a stopped stack with `docker compose restart` in the install folder.

Docker restarts the `tailscale` container when that container stops by itself. Docker does not restart `scriba` at the same time. If the app then stops answering, run `docker compose restart` in the install folder.

### Roll back

Running the install command again does not roll back. The command sets the tag to the newest release. Roll back by hand. `<stamp>` is the timestamp in a backup file name.

1. Set `SCRIBA_IMAGE_TAG` in `.env` to the older tag.
   - Or copy `.env.bak.<stamp>` over `.env`.
2. If the older release needs an older compose file, copy `compose.yaml.bak.<stamp>` over `compose.yaml`.
3. Run `docker compose up -d` in the install folder.
4. Run `docker compose ps`.
   - Check that `scriba` shows `healthy`.

## Recovery

Use this section if you cannot open Scriba. Use the computer that runs Scriba. Scriba prints the setup URL there at each start.

1. Open the setup URL in a browser on the computer that runs Scriba.
   - To find the URL, run `cat ~/Books/.scriba/setup-url`.
   - Or find it in the output of `docker compose logs scriba`.
2. If another person has the setup URL or the setup token, delete `~/Books/.scriba/setup-token`.
   - Run `docker compose restart` in the install folder. Scriba makes a new token and writes a new `~/Books/.scriba/setup-url`. Every existing cookie stops working.
3. If steps 1 and 2 do not help, reset the app data. Your projects are not touched.
   - Run `docker compose stop` in the install folder.
   - Delete the contents of `~/Books/.scriba/`.
   - The contents are the settings, the secrets, the search index, the setup token and the setup URL.
   - Your own tools in `packs/user/` are also deleted.
   - Run `docker compose restart`.
4. If the allowlist refuses a tailnet device, open the setup URL on the computer that runs Scriba.

The paths assume the default library folder `~/Books`. For another folder, use the `.scriba` folder in the folder that `SCRIBA_LIBRARY` in `.env` names.

## Adding a module

Each module with an API has a contract slice and an API module. A module with a screen also has a web feature. The slug is the short name of a module, for example `project-store`. Follow these steps.

1. **Contract slice.** Write the contract in `packages/contracts/src/<slug>/index.ts`.
   - The folder and the `./<slug>` entry in the `exports` map of `packages/contracts/package.json` already exist for all ten modules.
   - The module slugs are in `MODULE_SLUGS` in `packages/contracts/src/platform/slugs.ts`.
   - Import only a subpath, such as `@bbartolome/scriba-contracts/<slug>`.
2. **API module.** Add a NestJS module in `apps/api/src/modules/<slug>/`.
   - Add one line to `COMPOSED_MODULES` in `apps/api/src/app.module.ts`.
3. **Routes.** Serve HTTP routes under `/api/<slug>/`.
   - Define each route path as a constant in the contract slice. The platform does this with `ECHO_ROUTE`.
4. **Events.** Publish events with `EventsPublisher`.
   - Import it from the platform entry file, `apps/api/src/modules/platform/platform.module.ts`.
   - The `module` value in the event envelope, which is the outer wrapper of each event, is your slug.
5. **Errors.** Throw `ModuleError(code, status, message, details?)`.
   - Import `ModuleError` from the platform entry file too.
   - Name each code with upper-case letters, digits and underscores.
   - Start each code with your module prefix, for example `PLATFORM_NOT_FOUND`.
   - Declare the codes in your contract slice.
6. **Settings.** Register your section with `SettingsService.register(def)` before the API starts.
   - The section key must be one of the keys in `SETTINGS_SECTION_KEYS` in `packages/contracts/src/platform/settings.ts`.
   - To add a section, add its key to that list.
7. **Tests.** Start the app in a test with `createTestApp` from `apps/api/test/create-test-app.ts`.
   - The helper serves the composed app on `127.0.0.1`, on a random free port, with a temporary library.
   - To replace `COMPOSED_MODULES` in a test, pass `modules`.

## Testing

Scriba has five kinds of test.

| Kind                    | Runner                                | Location                               | What it checks                                                |
| ----------------------- | ------------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| Unit and API tests      | Vitest                                | `apps/api/test`, `packages/packs/test` | Behaviour through the composed API, with a temporary library. |
| UI tests                | Angular unit test builder with Vitest | `apps/web`                             | Lazy routes, rendered with the shared test fakes.             |
| End-to-end tests        | Playwright                            | `e2e/specs`                            | The real browser, the real API and the mock model.            |
| Script tests            | Node test runner                      | `scripts/*.test.mjs`                   | Scripts, documents and configuration files.                   |
| Manual model evaluation | `npm run eval:agent`                  | `scripts/eval-agent`                   | Real models. Not run in continuous integration.               |

Run the end-to-end tests with `npm run e2e`. The run needs port 8080 to be free. Run the manual evaluation only when you need it. It calls real models. Read `scripts/eval-agent/README.md` first.

## Delivery

- Continuous integration runs on each pull request and on each push to `main`. It runs lint, tests, the build and the end-to-end tests.
- A push to `main` builds the image for amd64 and arm64. It checks each image before it publishes the image. Pushes that change only the paths listed under `paths-ignore` in `.github/workflows/publish.yml` do not start this run. Other pushes do, including changes to `deploy/RUNBOOK.md`.
- Releases come from Conventional Commit messages. A Conventional Commit message starts with a type, such as `feat` or `fix`. A `feat` commit makes a minor release. A `fix` commit makes a patch release. See `docs/RELEASING.md`.

## Security notes

The app controls tailscaled through the shared socket. This is accepted for a single owner. Tailscaled is the Tailscale daemon. It runs in the `tailscale` container. The shared socket is the connection that the app uses to control it.

- The API accepts a request only when its `Host` header names an admitted host. These are `127.0.0.1`, `localhost`, the development origins and the Tailscale name when Tailscale runs. A development origin is a web address of the development web app.
- The allowlist is the list of tailnet logins that can use Scriba. It is off by default.
- Each request that changes data must send an `Origin` header. The header must match the host.
- The setup cookie is `HttpOnly`, so a script in a web page cannot read it. It has `SameSite=Strict`, so the browser sends it only for requests from this site.
- Model keys are stored in `secrets.yaml` with mode 0600. Only the owner of the file can read or write it.

## Documentation

- [`modules/`](modules/) contains the design notes for the ten modules.
- [`docs/adr/`](docs/adr/) contains the architecture decision records.
- [`docs/RELEASING.md`](docs/RELEASING.md) describes the release process.
- [`deploy/RUNBOOK.md`](deploy/RUNBOOK.md) lists the manual checks that run before a release, on the tailnet and the host network.
- [`packages/packs/test/README.md`](packages/packs/test/README.md) describes the golden tests for the genre packs.
- [`scripts/eval-agent/README.md`](scripts/eval-agent/README.md) describes the manual model evaluation.
- [`plans/DECISIONS.md`](plans/DECISIONS.md) is the log of decisions made while building Scriba.

This README follows the ASD-STE100 writing rules as closely as practical. ASD-STE100 is Simplified Technical English, from the AeroSpace and Defence Industries Association of Europe. Keep new text in the same style.
