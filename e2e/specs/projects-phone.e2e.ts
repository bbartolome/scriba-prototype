import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Locator } from '@playwright/test';

// PST-09's criterion 2 (unit line 30): at 390 by 844, every action of the project picker is reachable and
// the page does not scroll sideways. Plan: plans/PST-09.md, section 3 step 7 (test E2).
test.use({ viewport: { width: 390, height: 844 } });

/** Visible, enabled, and fully inside the viewport after it is scrolled into view. */
async function expectReachable(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

test('the project picker fits 390 by 844 and every action is reachable', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  // Signs in as setup-phone.e2e.ts does: the handshake URL the API wrote to the temp library.
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  // Its own fixtures, so the run does not depend on the journey's folders: a valid project (ok, not
  // active, so nothing activates it) and a folder with no project.yaml (importable).
  await mkdir(join(library, 'phone-ok'), { recursive: true });
  await writeFile(
    join(library, 'phone-ok', 'project.yaml'),
    'schemaVersion: 1\ntitle: Phone book\ngenrePack: nonfiction\n',
  );
  await mkdir(join(library, 'phone-loose'), { recursive: true });
  await writeFile(join(library, 'phone-loose', 'notes.md'), 'Loose notes.\n');

  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('This page needs a larger screen')).toHaveCount(
    0,
  );

  const newForm = page.getByRole('form', { name: 'New project', exact: true });
  await expectReachable(newForm.getByLabel('Title', { exact: true }));
  await expectReachable(newForm.getByLabel('Folder name', { exact: true }));
  await expectReachable(newForm.getByLabel('Genre pack', { exact: true }));
  await expectReachable(
    newForm.getByRole('button', { name: 'Create project', exact: true }),
  );

  const row = (id: string): Locator =>
    page.locator('li').filter({
      has: page.locator('code', { hasText: new RegExp(`^${id}$`) }),
    });
  await expectReachable(
    row('phone-ok').getByRole('button', { name: 'Switch', exact: true }),
  );
  await expectReachable(
    row('phone-loose').getByRole('button', { name: 'Import', exact: true }),
  );

  const card = page.getByRole('region', { name: 'Nonfiction', exact: true });
  await expectReachable(
    card.getByRole('button', { name: 'Start from sample', exact: true }),
  );
  await card
    .getByRole('button', { name: 'Start from sample', exact: true })
    .click();
  await expectReachable(card.getByLabel('Folder name', { exact: true }));
  await expectReachable(card.getByLabel('Title', { exact: true }));
  await expectReachable(
    card.getByRole('button', { name: 'Create from sample', exact: true }),
  );
  // Nothing is submitted: the form is only opened.

  const documentFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(documentFits).toBe(true);
  expect(errors).toEqual([]);
});
