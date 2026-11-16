import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// SHL-15's touch checks (unit lines 22 and 23). Plan: plans/SHL-15.md, section 4, tests C2 and X2.
// A tablet viewport (1024 by 768 is the CDK's tablet class) with touch emulation. Each test seeds its own
// library project and rewrites its file, so the order of the tests does not matter.
test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

const PROJECT = 'touch-book';
const FILE = 'drafts/ch01.md';
const BEFORE = '# Chapter One\n\nFirst paragraph here.\n';
const AFTER = '# Part One\n\nFirst paragraph here. typed\n';

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
    'schemaVersion: 1\ntitle: Touch book\ngenrePack: nonfiction\n',
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

/** The centre of the first occurrence of `word` in the first line of the editor, in page coordinates. */
async function wordCentre(
  page: Page,
  word: string,
): Promise<{ x: number; y: number }> {
  const point = await page.evaluate((target) => {
    const line = document.querySelector('app-markdown-editor .cm-line');
    if (line === null) throw new Error('no line');
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      const at = text.indexOf(target);
      if (at >= 0) {
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + target.length);
        const rect = range.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }
    }
    throw new Error(`no ${target} in the first line`);
  }, word);
  return point;
}

test('C2 tablet touch: tap, double-tap select, on-screen keyboard typing and a tapped Save write the file', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  const path = await openEditor(page);

  // The tablet layout: the source and the preview sit side by side, the preview to the right of the source.
  const source = page.locator('section[aria-label="Source"]');
  const preview = page.locator('section[aria-label="Preview"]');
  const sourceBox = await source.boundingBox();
  const previewBox = await preview.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(previewBox!.x).toBeGreaterThanOrEqual(sourceBox!.x + sourceBox!.width);

  // (d) Tap the end of the third line, then type with the on-screen keyboard (insertText sends no key events).
  const third = page.locator('app-markdown-editor .cm-line').nth(2);
  await expect(third).toHaveText('First paragraph here.');
  const thirdBox = await third.boundingBox();
  expect(thirdBox).not.toBeNull();
  await page.touchscreen.tap(
    thirdBox!.x + thirdBox!.width - 2,
    thirdBox!.y + thirdBox!.height / 2,
  );
  await page.keyboard.insertText(' typed');

  // (e) Select the word "Chapter" by touch: a double tap made of two touchscreen taps at the same point
  // (plan open point 4). No CDP session, no mouse call and no programmatic selection.
  const word = await wordCentre(page, 'Chapter');
  await page.touchscreen.tap(word.x, word.y);
  await page.touchscreen.tap(word.x, word.y);
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()), {
      timeout: 2000,
    })
    .toBe('Chapter');
  await page.keyboard.insertText('Part');

  // (f) Tap Save with the touchscreen; the status reads Unsaved changes, then Saved.
  const status = page.locator('app-markdown-editor [role="status"]');
  await expect(status).toHaveText('Unsaved changes');
  await page
    .locator('app-markdown-editor')
    .getByRole('button', { name: 'Save', exact: true })
    .tap();
  await expect(status).toHaveText('Saved');

  // (g) The file on disk has the edits, the preview shows them, and no page error was raised.
  expect(await readFile(path, 'utf8')).toBe(AFTER);
  await expect(preview).toContainText('Part One');
  expect(errors).toEqual([]);
});

test('X2 the editor follows the Dark theme on a tablet', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await openEditor(page);

  const themeGroup = page.getByRole('radiogroup', { name: 'Theme' });
  await themeGroup.getByRole('radio', { name: 'Light' }).tap();
  const background = () =>
    page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector('app-markdown-editor .cm-editor')!,
        ).backgroundColor,
    );
  const light = await background();

  await themeGroup.getByRole('radio', { name: 'Dark' }).tap();
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );
  const dark = await background();

  expect(dark).not.toBe(light);
  expect(dark).not.toBe('rgba(0, 0, 0, 0)');
  expect(errors).toEqual([]);
});
