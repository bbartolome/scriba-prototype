# Scriba

Scriba is a tool for writing books. A book is a set of plain files in a folder on your computer. You write in the app. You can also ask an artificial intelligence (AI) agent for help.

The agent does not change your files directly. It creates pending changes. You accept or reject each pending change. Your typing saves immediately.

Scriba has one owner. It runs on your computer. You can use it from that computer, or from a phone over a private Tailscale network. In this README, that private network is called the tailnet.

The terms in this README have the meanings given in [Terms](docs/TERMS.md).

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

## Getting started

Use Node.js 26, as set in `.nvmrc`. Use the npm version in the `packageManager` field of `package.json`.

```sh
npm ci          # install every workspace from the lock file
npm run dev     # build contracts and the API, then watch and serve everything
npm run build   # contracts, then API, web, packs and e2e
npm test        # every workspace, then the scripts/*.test.mjs checks
npm run lint    # every workspace, then the example and pack checks, then prettier --check .
```

`npm run dev` starts the web app at `http://localhost:4200`. The development API (application programming interface) server listens on `0.0.0.0:8080`. The Angular development server forwards `/api`, `/healthz` and `/events` requests to it. The development API server keeps its library in `.scriba-dev/`, which Git ignores.

`SCRIBA_DEV_AUTH=1` is a development mode, and `npm run dev` sets it. It skips the setup cookie check and the Origin check on the API. This flag is local only. When `NODE_ENV=production`, the API refuses to start with this flag, and it exits with code 1. No image or compose file sets it. With the flag on, any device that can reach port 8080 can call the API. A web page open in the browser can also send POST requests (requests that send data) to the local API.

For the architecture, the module list and the design rules, read [Architecture](docs/ARCHITECTURE.md). To add a module, run the tests or deliver a change, read [Development](docs/DEVELOPMENT.md).

## Install, update and roll back

The installer runs with one command. It writes a `.env` file and a compose file in the folder where you run it. That folder is the install folder. The installer then starts the stack. The stack is the two containers, `scriba` and `tailscale`. You need Docker and Docker Compose 2.24 or later. Run the installer as your own user, not as root.

### Install

First run `docker pull bbartolome/scriba`. Then run this command in an empty folder:

```sh
docker run --rm -e SETUP=true bbartolome/scriba | bash
```

The first run asks for the library folder and the web port. Then it starts the stack and shows the setup URL (the web address of the first-run setup).

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

## Security notes

The app controls tailscaled through the shared socket. This is accepted for a single owner. Tailscaled is the Tailscale daemon. It runs in the `tailscale` container. The shared socket is the connection that the app uses to control it.

- The API accepts a request only when its `Host` header names an admitted host. These are `127.0.0.1`, `localhost`, the development origins and the Tailscale name when Tailscale runs. A development origin is a web address of the development web app.
- The allowlist is the list of tailnet logins that can use Scriba. It is off by default.
- Each request that changes data must send an `Origin` header. The header must match the host.
- The setup cookie is `HttpOnly`, so a script in a web page cannot read it. It has `SameSite=Strict`, so the browser sends it only for requests from this site.
- Model keys are stored in `secrets.yaml` with mode 0600. Only the owner of the file can read or write it.

## Documentation

- [Terms](docs/TERMS.md) gives the meaning of each term in the Scriba documents and code.
- [Architecture](docs/ARCHITECTURE.md) describes the parts, modules, libraries, folders and design rules of Scriba.
- [Development](docs/DEVELOPMENT.md) tells you how to add a module, run the tests and deliver a change.
- [Releasing Scriba](docs/RELEASING.md) describes the release process.
- [Architecture decision records](docs/adr/) record the main design decisions.
- [Module design notes](modules/) contains the design notes for the ten modules.
- [Runbook](deploy/RUNBOOK.md) lists the manual checks that run before a release, on the tailnet and the host network.
- [Golden tests](packages/packs/test/README.md) describes the golden tests for the genre packs.
- [Manual model evaluation](scripts/eval-agent/README.md) describes the manual model evaluation.
- [Decision log](plans/DECISIONS.md) is the log of decisions made while building Scriba.

This README follows the ASD-STE100 writing rules as closely as practical. ASD-STE100 is Simplified Technical English, from the AeroSpace and Defence Industries Association of Europe. Keep new text in the same style.
