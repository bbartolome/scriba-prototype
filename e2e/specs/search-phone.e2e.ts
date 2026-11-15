import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Locator } from '@playwright/test';

// PST-14's criterion 3 (unit line 24): at 390 by 844, the search box of the files page is reachable,
// its results open the file, and the page does not scroll sideways. Plan: plans/PST-14.md, section 4 (T3).
test.use({ viewport: { width: 390, height: 844 } });

/** Visible, enabled, and fully inside the viewport after it is scrolled into view. */
async function expectReachable(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

test('the search box fits 390 by 844 and a result opens its file', async ({
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

  // Its own project, so the run does not depend on the folders of the other specs.
  await mkdir(join(library, 'phone-search', 'sources'), { recursive: true });
  await writeFile(
    join(library, 'phone-search', 'project.yaml'),
    'schemaVersion: 1\ntitle: Phone search\ngenrePack: nonfiction\n',
  );
  await writeFile(
    join(library, 'phone-search', 'sources', 'notes.md'),
    'Lighthouse keepers wrote about the fog.\n',
  );

  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();

  // Makes the project active, as its row's Switch button does.
  const row = page.locator('li').filter({
    has: page.locator('code', { hasText: /^phone-search$/ }),
  });
  const switchButton = row.getByRole('button', {
    name: 'Switch',
    exact: true,
  });
  await expectReachable(switchButton);
  await switchButton.click();
  await expect(page).toHaveURL(/\/projects\/phone-search\/chat$/);

  await page.goto('/projects/phone-search/files');
  const searchBox = page.getByRole('searchbox', {
    name: 'Search the project',
    exact: true,
  });
  await expectReachable(searchBox);
  await searchBox.fill('lighthouse');

  const result = page
    .locator('ol[aria-label="Search results"]')
    .getByRole('link', { name: /sources\/notes\.md/ });
  await expectReachable(result);
  await result.click();

  await expect(page).toHaveURL(/[?&]path=sources(%2F|\/)notes\.md/);
  await expect(page.locator('app-markdown-preview')).toContainText(
    'Lighthouse keepers',
  );

  const documentFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(documentFits).toBe(true);
  expect(errors).toEqual([]);
});
