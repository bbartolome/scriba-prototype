import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';

// A placeholder records itself as pending. Its owner replaces the call with the step's assertions.
function pending(testInfo: TestInfo, name: string): void {
  testInfo.annotations.push({ type: 'pending', description: name });
  console.log(`pending: ${name}`);
}

test('journey: setup, project from sample, agent run, accept change, manuscript', async ({
  page,
}, testInfo) => {
  await test.step('app loads', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Scriba' })).toBeVisible();
    expect(errors).toEqual([]);
    // Records the browser build in the run report (criterion 2, C2d).
    testInfo.annotations.push({
      type: 'browser',
      description: page.context().browser()!.version(),
    });
    // The API boot writes .scriba/settings.yaml into the library the harness set (SCRIBA_E2E_LIBRARY).
    expect(
      existsSync(
        join(process.env.SCRIBA_E2E_LIBRARY!, '.scriba', 'settings.yaml'),
      ),
    ).toBe(true);
  });

  // Owner: Setup & auth, M1 (SAU-08). Reads setup-url from SCRIBA_E2E_LIBRARY.
  await test.step('setup', () => pending(testInfo, 'setup'));

  // Owner: Project store, M1 (PST-09). Uses the examples folder the harness sets.
  await test.step('project from sample', () =>
    pending(testInfo, 'project from sample'));

  // Owner: Agent loop, M1 (AGL-08). Configures a provider at SCRIBA_E2E_MOCK_URL through the API.
  await test.step('agent run', () => pending(testInfo, 'agent run'));

  // Owner: Project store review, M3 (PST-22; AGL-15).
  await test.step('accept change', () => pending(testInfo, 'accept change'));

  // Owner: Compile & export, M5 (CEX-20). No export step in the e2e.
  await test.step('manuscript', () => pending(testInfo, 'manuscript'));
});
