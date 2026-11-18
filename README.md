# Scriba

This monorepo holds an Angular web app (`apps/web`), a NestJS API (`apps/api`), shared contracts (`packages/contracts`) and genre packs (`packages/packs`).

## Getting started

Use Node 26 (`.nvmrc`) and the npm version in `packageManager`.

```sh
npm ci          # install every workspace from the lock file
npm run dev     # build contracts and the API, then watch and serve everything
npm run build   # contracts, then API, web and packs
npm test        # every workspace, then the scripts/*.test.mjs checks
npm run lint    # every workspace, then prettier --check .
```

`npm run dev` serves the Angular dev server at `http://localhost:4200`. It proxies `/api`, `/healthz` and `/events` to the API. The dev API listens on `0.0.0.0:8080`, and it keeps its library in `.scriba-dev/` (git-ignored).

`SCRIBA_DEV_AUTH=1` is a dev mode that `npm run dev` sets. It skips the setup cookie and the Origin check on the API, so a local run needs no setup URL step. The flag is local only: the boot refuses it when `NODE_ENV=production` (exit 1), and no image or compose file sets it. With the flag on, any device that can reach port 8080 can call the API without the setup cookie, and any web page open in the browser can send POST requests to the local API.

## Install, update and roll back

The installer is one command. It writes a `.env` and a compose file into the folder you run it in, and it starts the stack.

### Install

Run this in an empty folder:

```sh
docker run --rm -e SETUP=true bbartolome/scriba | bash
```

The first run asks for the library folder and the web port. It then starts the stack and prints the web address.

### Update

Run the same one-liner in the install folder. The update asks nothing. Before it writes anything, it backs up `.env` to `.env.bak.<stamp>` and `compose.yaml` to `compose.yaml.bak.<stamp>`, where `<stamp>` is the UTC time of the run, such as `20261114T093000Z`.

The update then:

- keeps the values in `.env`, except `SCRIBA_IMAGE_TAG`, which takes the release's tag, and `SCRIBA_COMPOSE_VERSION`, which takes the new version; new keys are added;
- replaces `compose.yaml` with the release's file. Put local edits in `compose.override.yaml`, which the installer never writes;
- pulls the image, then starts the stack and waits for `scriba` to be healthy.

A re-run is safe to repeat. A second run changes nothing except one more pair of backups. If the pull fails, the failure is printed, and the update goes on to `docker compose up -d`, which fails if the image is absent.

For a quick update, run `docker compose pull && docker compose up -d` in the install folder. It moves the image only when `SCRIBA_IMAGE_TAG` names a tag that moves, such as `latest`, or after a re-run has written a new release tag. A pinned install updates by re-running the one-liner.

### Stop and start

A stopped stack is started again with `docker compose restart` in the install folder. Docker restarts only the `tailscale` container, not `scriba`, so if the app stops answering after `tailscale` restarts on its own, run `docker compose restart` in the install folder.

### Roll back

A re-run cannot roll back, because it writes the one-liner's own tag. A rollback is done by hand, and a later re-run moves the tag forward again. `<stamp>` is the timestamp in a backup's name.

1. Set `SCRIBA_IMAGE_TAG` in `.env` to the older tag, or copy `.env.bak.<stamp>` back over `.env`.
2. If the older release needs an older compose file, copy `compose.yaml.bak.<stamp>` back over `compose.yaml`.
3. Run `docker compose up -d` in the install folder.
4. Check that `scriba` is healthy with `docker compose ps`.

## Recovery

If you cannot get into Scriba, use the computer that runs it. The setup link is printed there at each start.

1. Re-open the setup URL: `cat ~/Books/.scriba/setup-url`, or find it in `docker compose logs scriba`.
2. Replace a leaked token: delete `~/Books/.scriba/setup-token`, then run `docker compose restart` in the install folder. Scriba makes a new token and rewrites `~/Books/.scriba/setup-url`, and every existing cookie stops working.
3. Last resort: stop the stack with `docker compose stop`, then delete the contents of `~/Books/.scriba/` (settings, secrets, search indexes, your own tool packs in `packs/user/`, and the setup token), and start the stack again with `docker compose restart`. Your projects are not touched.
4. Allowlist locked out a tailnet device: use the Mac and the setup URL.

The paths assume the default library folder `~/Books`. For another folder, use the `.scriba` folder inside the `SCRIBA_LIBRARY` value in `.env`.

## Adding a module

Each module has a contract slice, an API module and, when it has a screen, a web feature. Follow these steps.

1. **Contract slice.** Fill in the existing `packages/contracts/src/<slug>/index.ts`; its folder and its `./<slug>` key in the `exports` map of `packages/contracts/package.json` already exist for all ten subpaths. Module slugs are fixed in `MODULE_SLUGS` (`packages/contracts/src/platform/slugs.ts`). The package has no root barrel, so import only a subpath, such as `@bbartolome/scriba-contracts/<slug>`.
2. **Compose the API module.** Add the Nest module under `apps/api/src/modules/<slug>/` and add one line to `COMPOSED_MODULES` in `apps/api/src/app.module.ts`.
3. **Routes.** Serve HTTP routes under `/api/<slug>/`. Define each route path as a constant in the contract slice, as the platform does with `ECHO_ROUTE`.
4. **Events.** Publish through `EventsPublisher`, which the platform entry file (`apps/api/src/modules/platform/platform.module.ts`) exports. The envelope's `module` is your slug.
5. **Errors.** Throw `ModuleError(code, status, message, details?)`, also exported from the platform entry file. Each code is SCREAMING_SNAKE_CASE with your module prefix, such as `PLATFORM_NOT_FOUND`. Declare the codes in your contract slice.
6. **Settings.** Register your section with `SettingsService.register(def)` before boot. The section key must be one of `SETTINGS_SECTION_KEYS` in `packages/contracts/src/platform/settings.ts`, so a new section adds a key there.
7. **Tests.** Boot the app with `createTestApp` from `apps/api/test/create-test-app.ts`. It serves the composed app on `127.0.0.1` with an ephemeral port and a temporary library. Pass `modules` to replace `COMPOSED_MODULES` in a test.

## Security notes

The app controls tailscaled through the shared socket. This is accepted for a single owner.
