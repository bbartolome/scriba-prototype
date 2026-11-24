# Development

This document describes how to change and deliver Scriba. The terms have the meanings given in [Terms](TERMS.md). Set up the tools first. Then follow [Getting started](../README.md#getting-started).

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
- Releases come from Conventional Commit messages. A Conventional Commit message starts with a type, such as `feat` or `fix`. A `feat` commit makes a minor release. A `fix` commit makes a patch release. See [Releasing Scriba](RELEASING.md).
