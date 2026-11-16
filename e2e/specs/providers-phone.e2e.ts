import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Locator } from '@playwright/test';

// MPR-11's criterion 2 (unit line 22): at 390 by 844 the Providers nav item opens the page, the page fits, and the
// app default switches there. Plan: plans/MPR-11.md, section 4 (test E1).
test.use({ viewport: { width: 390, height: 844 } });

const origin = 'http://127.0.0.1:8080';

interface AppDefaultReply {
  appDefault: { providerId: string; model: string } | null;
}

/** Visible, enabled, and fully inside the viewport after it is scrolled into view. */
async function expectReachable(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

test('the providers page fits 390 by 844, its nav item opens it, and the app default switches', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  // Signs in as projects-phone.e2e.ts does: the handshake URL the API wrote to the temp library.
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  // The app default this run finds, which it restores at its end (the journey may have set it).
  const before = await page.request.get('/api/providers/app-default');
  expect(before.status()).toBe(200);
  const prior = ((await before.json()) as AppDefaultReply).appDefault;
  expect(prior).not.toBeNull();
  if (prior === null) throw new Error('The app default is not set.');

  // Its own provider, at the mock's tool-call scenario. The origin header is required by the API's guard.
  const created = await page.request.post('/api/providers', {
    headers: { origin },
    data: {
      label: 'Phone check',
      kind: 'openai-compatible',
      baseURL: `${process.env.SCRIBA_E2E_MOCK_URL}/scenario/tool-call/v1`,
      model: 'mock-model',
      temperature: 0.7,
      contextSize: 64000,
      maxTokens: 4096,
      timeout: 120000,
      retries: 2,
    },
  });
  expect(created.status()).toBe(201);
  const { id: newId } = (await created.json()) as { id: string };

  // The nav item of the five-item bottom bar at the app level opens the page.
  await page.goto('/projects');
  const providersLink = page
    .getByRole('navigation', { name: 'Bottom navigation' })
    .getByRole('link', { name: 'Providers', exact: true });
  await expectReachable(providersLink);
  await providersLink.click();
  await expect(page).toHaveURL(/\/providers$/);

  // The page: its title, the App default select, and the new provider's row.
  await expect(
    page.getByRole('heading', { name: 'Model providers', exact: true }),
  ).toBeVisible();
  const appDefault = page.getByLabel('App default', { exact: true });
  await expectReachable(appDefault);
  const row = page.locator('ul[aria-label="Providers"] > li').filter({
    has: page.locator('.provider-id', { hasText: new RegExp(`^${newId}$`) }),
  });
  await expect(row).toBeVisible();

  // The switch: the page's own POST, answered 200, then the row shows Default and the API holds it.
  const switched = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/providers/app-default') &&
      response.request().method() === 'POST',
  );
  await appDefault.selectOption(newId);
  expect((await switched).status()).toBe(200);
  await expect(row.getByText('Default', { exact: true })).toBeVisible();
  const after = (await (
    await page.request.get('/api/providers/app-default')
  ).json()) as AppDefaultReply;
  expect(after.appDefault?.providerId).toBe(newId);

  // The row's edit form and its connection test, at phone width.
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await expectReachable(
    page.getByRole('button', { name: 'Save', exact: true }),
  );
  const testButton = page.getByRole('button', {
    name: 'Test connection',
    exact: true,
  });
  await expectReachable(testButton);
  await testButton.click();
  await expect(
    page.getByRole('heading', { name: 'Connection test', exact: true }),
  ).toBeVisible();

  // The page does not scroll sideways, and no page error was raised.
  const documentFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(documentFits).toBe(true);
  expect(errors).toEqual([]);

  // Restores the app default this run found.
  const restored = await page.request.post('/api/providers/app-default', {
    headers: { origin },
    data: { providerId: prior.providerId, model: prior.model },
  });
  expect(restored.status()).toBe(200);
});
