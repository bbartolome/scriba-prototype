import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Locator } from '@playwright/test';

// PST-21's criterion 2 (unit line 20): at 390 by 844, the version history of a draft works as a
// read-only list and diff, and the page does not scroll sideways. Plan: plans/PST-21.md, section 4 (E1).
test.use({ viewport: { width: 390, height: 844 } });

/** Visible, enabled, and fully inside the viewport after it is scrolled into view. */
async function expectReachable(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

// Removes the folders this file seeds from the shared library, which journey.e2e.ts checks.
test.afterAll(async () => {
  for (const project of ['phone-history']) {
    await rm(join(process.env.SCRIBA_E2E_LIBRARY!, project), {
      recursive: true,
      force: true,
    });
  }
});

test('the version history of a draft fits 390 by 844 and shows a read-only diff', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  // Signs in as search-phone.e2e.ts does: the handshake URL the API wrote to the temp library.
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  // Its own project, so the run does not depend on the folders of the other specs.
  await mkdir(join(library, 'phone-history', 'drafts', '.versions', 'ch1.md'), {
    recursive: true,
  });
  await writeFile(
    join(library, 'phone-history', 'project.yaml'),
    'schemaVersion: 1\ntitle: Phone history\ngenrePack: nonfiction\n',
  );
  await writeFile(
    join(library, 'phone-history', 'drafts', 'ch1.md'),
    'Current text of chapter one.\n',
  );
  await writeFile(
    join(
      library,
      'phone-history',
      'drafts',
      '.versions',
      'ch1.md',
      '20261104T231500123Z.md',
    ),
    'Old text of chapter one.\n',
  );

  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();

  // Makes the project active, as its row's Switch button does.
  const row = page.locator('li').filter({
    has: page.locator('code', { hasText: /^phone-history$/ }),
  });
  const switchButton = row.getByRole('button', {
    name: 'Switch',
    exact: true,
  });
  await expectReachable(switchButton);
  await switchButton.click();
  await expect(page).toHaveURL(/\/projects\/phone-history\/chat$/);

  await page.goto('/projects/phone-history/files?path=drafts/ch1.md');
  const version = page
    .locator('ul[aria-label="Versions"]')
    .getByRole('button', { name: /2026-11-04T23:15:00\.123Z/ });
  await expectReachable(version);
  await version.click();

  const diff = page.locator('section[aria-label="Changes to drafts/ch1.md"]');
  await expect(diff).toBeVisible();
  await expect(diff).toContainText('Old text');
  await expect(
    page.getByRole('button', { name: 'Restore this version', exact: true }),
  ).toHaveCount(0);

  const documentFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(documentFits).toBe(true);
  expect(errors).toEqual([]);
});
