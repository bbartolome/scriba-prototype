import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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

  // Owner: Setup & auth, M1 (SAU-08). Reads setup-url from SCRIBA_E2E_LIBRARY. This step is live.
  await test.step('setup', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    // The handshake URL the API wrote to the temp library. The browser opens it, as the product does.
    const setupUrl = (
      await readFile(
        join(process.env.SCRIBA_E2E_LIBRARY!, '.scriba', 'setup-url'),
        'utf8',
      )
    ).trim();
    await page.goto(setupUrl);
    // The 303 ends on /setup, and the address bar holds no token.
    expect(page.url()).toBe(new URL('/setup', setupUrl).href);
    await expect(
      page.getByText('Signed in from this computer (loopback).'),
    ).toBeVisible();
    // The cookie from the handshake keeps the session across a reload.
    await page.reload();
    await expect(
      page.getByText('Signed in from this computer (loopback).'),
    ).toBeVisible();
    // Skip the rest is a real POST through the guard's Origin check.
    await page.getByRole('button', { name: 'Skip the rest' }).click();
    // The landing reads complete and leaves /setup.
    await expect(page).toHaveURL(/\/projects(\/|$)/);
    const status = await page.request.get('/api/setup-auth/status');
    expect(status.status()).toBe(200);
    expect(((await status.json()) as { complete: unknown }).complete).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });

  // Owner: Project store, M1 (PST-09). Uses the examples folder the harness sets.
  await test.step('project from sample', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    // The Nonfiction card of the picker, found by its name; its form opens with the sample's defaults.
    const card = page.getByRole('region', { name: 'Nonfiction', exact: true });
    await card
      .getByRole('button', { name: 'Start from sample', exact: true })
      .click();
    await card.getByLabel('Folder name', { exact: true }).fill('demo-book');
    await card.getByLabel('Title', { exact: true }).fill('Demo book');
    await card
      .getByRole('button', { name: 'Create from sample', exact: true })
      .click();
    // The new project is active, and the page lands in it.
    await expect(page).toHaveURL(/\/projects\/demo-book\/chat$/);
    const project = join(process.env.SCRIBA_E2E_LIBRARY!, 'demo-book');
    const yaml = await readFile(join(project, 'project.yaml'), 'utf8');
    expect(yaml).toMatch(/^title: Demo book$/m);
    expect(existsSync(join(project, 'sources', 'outline.md'))).toBe(true);
    expect(existsSync(join(project, 'structure'))).toBe(false);
    expect(await readFile(join(project, '.gitignore'), 'utf8')).toContain(
      '.scriba/',
    );
    expect(errors).toEqual([]);
  });

  // Owner: Agent loop, M1 (AGL-08). Configures a provider at SCRIBA_E2E_MOCK_URL through the API.
  await test.step('agent run', () => pending(testInfo, 'agent run'));

  // Owner: Project store review, M3 (PST-22; AGL-15).
  await test.step('accept change', () => pending(testInfo, 'accept change'));

  // Owner: Compile & export, M5 (CEX-20). No export step in the e2e.
  await test.step('manuscript', () => pending(testInfo, 'manuscript'));
});
