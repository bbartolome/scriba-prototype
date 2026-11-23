import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page, type Response } from '@playwright/test';

// TRG-14's running-app checks (unit criteria 1 and 4). Plan: TRG-14 plan, section 5, tests E1 and E2.
// The composed app the harness starts. The cold-open fixture goes into the library's user pack, which the
// tool registry serves, so the harness and the root package.json stay unchanged.

const FIXTURE = fileURLToPath(
  new URL(
    '../../apps/api/test/fixtures/packs/core/tools/cold_open.yaml',
    import.meta.url,
  ),
);
const ACTIVE_PATH = '/api/project-store/active';
const LINT_PATH = '/api/tool-registry/lint';
const PROJECT = 'tools-spike';

/** Signs in, puts the fixture into the user pack, and activates a project of three entities. */
async function setUp(page: Page): Promise<void> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const userTools = join(library, '.scriba', 'packs', 'user', 'tools');
  await mkdir(userTools, { recursive: true });
  await copyFile(FIXTURE, join(userTools, 'cold_open.yaml'));

  const project = join(library, PROJECT);
  await mkdir(join(project, 'entities'), { recursive: true });
  await writeFile(
    join(project, 'project.yaml'),
    'schemaVersion: 1\ntitle: Tools spike\ngenrePack: nonfiction\n',
  );
  await writeFile(
    join(project, 'entities', 'ada.md'),
    '---\ntype: person\n---\nAda.\n',
  );
  await writeFile(
    join(project, 'entities', 'bob.md'),
    '---\ntype: person\n---\nBob.\n',
  );
  await writeFile(
    join(project, 'entities', 'paris.md'),
    '---\ntype: place\n---\nParis.\n',
  );

  // The switch page POSTs the activation when its Switch button is clicked.
  await page.goto(`/projects/${PROJECT}/switch`);
  const activated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === ACTIVE_PATH,
  );
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  expect((await activated).ok()).toBe(true);
}

/** The user pack's file of a tool, as the library holds it. */
function userToolFile(name: string): string {
  return join(
    process.env.SCRIBA_E2E_LIBRARY!,
    '.scriba',
    'packs',
    'user',
    'tools',
    `${name}.yaml`,
  );
}

/** The status line of the detail's editor. */
function editorStatus(page: Page) {
  return page.locator(
    'section[aria-label="Tool detail"] [data-editor] [role="status"]',
  );
}

/** The user row's read after a save (C9): the moved selection's /user answer, its row, its Source tab and its text. */
function movedRead(name: string): (response: Response) => boolean {
  return (response) =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname ===
      `/api/tool-registry/tools/${name}/user`;
}

async function expectMovedRow(
  page: Page,
  name: string,
  moved: Promise<Response>,
): Promise<void> {
  const answer = await moved;
  expect(answer.status()).toBe(200);
  const detail = (await answer.json()) as {
    lint: { severity: string }[];
    source: string;
  };
  expect(detail.lint.filter((item) => item.severity === 'error')).toEqual([]);
  // The text the moved editor is given (the /user answer's source), not the rendered lines.
  expect(detail.source).toMatch(new RegExp(`^name: ${name}$`, 'm'));
  await expect(
    page.locator(`li[data-tool="${name}"][data-origin="user"]`),
  ).toBeVisible();
  const section = page.locator('section[aria-label="Tool detail"]');
  await expect(section.locator('[data-tab="source"]')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(section.locator('[data-editor]')).toBeVisible();
}

test.afterAll(async () => {
  for (const name of ['my_tool', 'cold_open_2', 'cold_open']) {
    await rm(userToolFile(name), { force: true });
  }
});

test('E1 New and Duplicate produce YAML that the real lint accepts, and Save writes it', async ({
  page,
}) => {
  await setUp(page);
  await page.goto('/tools');

  // New: the draft's first lint answer is awaited; it must have no error.
  await page.locator('[data-new]').click();
  await page.locator('input[data-name]').fill('my_tool');
  const firstLint = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === LINT_PATH,
  );
  await page.locator('[data-create]').click();
  const lintAnswer = await (await firstLint).json();
  expect(
    (lintAnswer.lint as { severity: string }[]).filter(
      (item) => item.severity === 'error',
    ),
  ).toEqual([]);

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname ===
        '/api/tool-registry/tools/my_tool/save',
  );
  const moved = page.waitForResponse(movedRead('my_tool'));
  await page.locator('section[aria-label="Tool detail"] [data-save]').click();
  expect((await saved).status()).toBe(200);
  await expectMovedRow(page, 'my_tool', moved);
  expect(await readFile(userToolFile('my_tool'), 'utf8')).toContain(
    'name: my_tool',
  );

  // Duplicate: the user copy of cold_open, under a new name.
  await page
    .locator('li[data-tool="cold_open"][data-origin="user"] [data-open]')
    .click();
  await page.locator('[data-duplicate]').click();
  await page.locator('input[data-name]').fill('cold_open_2');
  const secondLint = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === LINT_PATH,
  );
  await page.locator('[data-create]').click();
  const copyLint = await (await secondLint).json();
  expect(
    (copyLint.lint as { severity: string }[]).filter(
      (item) => item.severity === 'error',
    ),
  ).toEqual([]);

  const copySaved = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname ===
        '/api/tool-registry/tools/cold_open_2/save',
  );
  const copyMoved = page.waitForResponse(movedRead('cold_open_2'));
  await page.locator('section[aria-label="Tool detail"] [data-save]').click();
  expect((await copySaved).status()).toBe(200);
  await expectMovedRow(page, 'cold_open_2', copyMoved);
  expect(await readFile(userToolFile('cold_open_2'), 'utf8')).toContain(
    'name: cold_open_2',
  );
});

test('E2 a save the real API refuses shows its diagnostics on the line, and the file on disk is unchanged', async ({
  page,
}) => {
  await setUp(page);
  await page.goto('/tools');
  await page
    .locator('li[data-tool="cold_open"][data-origin="user"] [data-open]')
    .click();
  await page
    .locator('section[aria-label="Tool detail"] [data-tab="source"]')
    .click();

  // The prompt's {{coreIdea}} placeholder becomes {{coreIdeaX}}, which the real lint refuses.
  const original = await readFile(FIXTURE, 'utf8');
  const broken = original.replace('{{coreIdea}}', '{{coreIdeaX}}');
  expect(broken).not.toBe(original);
  const content = page.locator(
    'section[aria-label="Tool detail"] [data-editor] .cm-content',
  );
  await content.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(broken);

  const refused = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname ===
        '/api/tool-registry/tools/cold_open/save',
  );
  await page.locator('section[aria-label="Tool detail"] [data-save]').click();
  expect((await refused).status()).toBe(422);

  await expect(editorStatus(page)).toContainText('The tool was not saved');
  await expect(
    page.locator(
      'section[aria-label="Tool detail"] [data-editor] .cm-lintRange-error',
    ),
  ).not.toHaveCount(0);
  expect(await readFile(userToolFile('cold_open'))).toEqual(
    await readFile(FIXTURE),
  );
});
