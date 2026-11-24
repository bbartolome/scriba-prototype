import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// SHL-18's criterion 2 (unit line 21): the documented shortcuts navigate between nav entries and save
// in the editor. Plan: SHL-18 plan, section 4, test T2. The config's desktop viewport applies.
// Each run seeds its own library project and rewrites its file, so the order of the tests does not matter.

const PROJECT = 'polish-book';
const FILE = 'drafts/ch01.md';
const BEFORE = '# Polish book\n\nSaved text.\n';
const WRITE_PATH = `/api/project-store/projects/${PROJECT}/file/write`;

/** Signs in, seeds the project and its file, activates the project, and opens the editor layout. */
async function openEditor(page: Page): Promise<string> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const project = join(library, PROJECT);
  await mkdir(join(project, 'drafts'), { recursive: true });
  await writeFile(
    join(project, 'project.yaml'),
    'schemaVersion: 1\ntitle: Polish book\ngenrePack: nonfiction\n',
  );
  await writeFile(join(project, FILE), BEFORE);

  // The switch page POSTs the activation when its Switch button is clicked (setup, not part of the criterion).
  await page.goto(`/projects/${PROJECT}/switch`);
  const activated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/project-store/active',
  );
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  expect((await activated).ok()).toBe(true);

  await page.goto(
    `/core-gate?projectId=${PROJECT}&path=${encodeURIComponent(FILE)}`,
  );
  await expect(
    page.getByRole('textbox', { name: `Markdown source for ${FILE}` }),
  ).toBeVisible();
  return join(project, FILE);
}

test('criterion 2: Documented shortcuts navigate between nav entries and trigger save in the editor.', async ({
  page,
}) => {
  const file = await openEditor(page);

  // The About panel documents both shortcuts.
  const shortcuts = page.locator('app-about-panel ul');
  await expect(shortcuts).toContainText('Alt+[ and Alt+]');
  await expect(shortcuts).toContainText('Ctrl+S');

  // Save: type in the editor and press Ctrl+S before the 1500 ms debounce fires.
  const editor = page.getByRole('textbox', {
    name: `Markdown source for ${FILE}`,
  });
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' typed');
  const written = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === WRITE_PATH,
  );
  await page.keyboard.press('Control+s');
  expect((await written).ok()).toBe(true);
  expect(await readFile(file, 'utf8')).toBe(BEFORE + ' typed');

  // Leave the editor, so the shortcuts are sent to the page and not to the editor.
  await page.getByRole('heading', { name: 'Core gate' }).click();

  // Navigate: the nav order is projects (20), tools (40), providers (50), settings (90), core gate (100).
  await page.keyboard.press('Alt+BracketLeft');
  await expect(page).toHaveURL(/\/settings$/);
  await page.keyboard.press('Alt+BracketRight');
  await expect(page).toHaveURL(/\/core-gate(\?.*)?$/);
  await page.keyboard.press('Alt+BracketRight');
  await expect(page).toHaveURL(/\/projects$/);
});
