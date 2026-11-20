import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const e2eDir = fileURLToPath(new URL('.', import.meta.url));
const ci = Boolean(process.env.CI);

export default defineConfig({
  // Specs live only in specs/ and end in .e2e.ts. Unit tests end in .test.ts.
  testDir: './specs',
  testMatch: '**/*.e2e.ts',
  globalSetup: './harness/global-setup.ts',
  workers: 1,
  forbidOnly: ci,
  reporter: [
    ['list'],
    ['json', { outputFile: join(e2eDir, 'test-results', 'report.json') }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: ci ? 'retain-on-failure' : 'off',
    // Specs run without a service worker; pwa.e2e.ts allows it. page.route does not see requests a worker handles.
    serviceWorkers: 'block',
    // The CI step sets SCRIBA_E2E_CHROMIUM. Locally the default lookup finds the cached build.
    launchOptions: {
      executablePath: process.env.SCRIBA_E2E_CHROMIUM ?? undefined,
    },
  },
});
