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

## Adding a module

Each module has a contract slice, an API module and, when it has a screen, a web feature. Follow these steps.

1. **Contract slice.** Fill in the existing `packages/contracts/src/<slug>/index.ts`; its folder and its `./<slug>` key in the `exports` map of `packages/contracts/package.json` already exist for all ten subpaths. Module slugs are fixed in `MODULE_SLUGS` (`packages/contracts/src/platform/slugs.ts`). The package has no root barrel, so import only a subpath, such as `@bbartolome/scriba-contracts/<slug>`.
2. **Compose the API module.** Add the Nest module under `apps/api/src/modules/<slug>/` and add one line to `COMPOSED_MODULES` in `apps/api/src/app.module.ts`.
3. **Routes.** Serve HTTP routes under `/api/<slug>/`. Define each route path as a constant in the contract slice, as the platform does with `ECHO_ROUTE`.
4. **Events.** Publish through `EventsPublisher`, which the platform entry file (`apps/api/src/modules/platform/platform.module.ts`) exports. The envelope's `module` is your slug.
5. **Errors.** Throw `ModuleError(code, status, message, details?)`, also exported from the platform entry file. Each code is SCREAMING_SNAKE_CASE with your module prefix, such as `PLATFORM_NOT_FOUND`. Declare the codes in your contract slice.
6. **Settings.** Register your section with `SettingsService.register(def)` before boot. The section key must be one of `SETTINGS_SECTION_KEYS` in `packages/contracts/src/platform/settings.ts`, so a new section adds a key there.
7. **Tests.** Boot the app with `createTestApp` from `apps/api/test/create-test-app.ts`. It serves the composed app on `127.0.0.1` with an ephemeral port and a temporary library. Pass `modules` to replace `COMPOSED_MODULES` in a test.
