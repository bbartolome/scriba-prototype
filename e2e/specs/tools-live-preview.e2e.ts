import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page, type Request } from '@playwright/test';

// TRG-15's running-app checks (unit lines 21 and 22). Plan: plans/TRG-15.md, section 4, step 8 and section 5.1.
// The composed app the harness starts. The cold-open fixture goes into the library's user pack as `live_probe`, so
// the Source tab of that user row is editable and the panel reads its /user views (TRG-15 D4).

const FIXTURE = fileURLToPath(
  new URL(
    '../../apps/api/test/fixtures/packs/core/tools/cold_open.yaml',
    import.meta.url,
  ),
);
const PROJECT = 'tools-live';
const PROBE = 'live_probe';
const ACTIVE_PATH = '/api/project-store/active';
const LINT_PATH = '/api/tool-registry/lint';
const RENDER_PATH = `/api/tool-registry/tools/${PROBE}/render`;

test.use({ viewport: { width: 1280, height: 2100 } });

/** The user copy of the probe in the library, which afterAll removes. */
async function probeFile(): Promise<string> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  return join(library, '.scriba', 'packs', 'user', 'tools', `${PROBE}.yaml`);
}

/** Signs in, puts the probe into the user pack, and activates a project of one person and one source. */
async function setUp(page: Page): Promise<string> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const userTools = join(library, '.scriba', 'packs', 'user', 'tools');
  await mkdir(userTools, { recursive: true });
  const fixture = await readFile(FIXTURE, 'utf8');
  const probe = fixture.replace(/^name: cold_open$/m, `name: ${PROBE}`);
  await writeFile(await probeFile(), probe);

  const project = join(library, PROJECT);
  await mkdir(join(project, 'entities'), { recursive: true });
  await mkdir(join(project, 'sources'), { recursive: true });
  await writeFile(
    join(project, 'project.yaml'),
    'schemaVersion: 1\ntitle: Tools live\ngenrePack: nonfiction\n',
  );
  await writeFile(
    join(project, 'entities', 'ada.md'),
    '---\ntype: person\n---\nAda.\n',
  );
  await writeFile(
    join(project, 'sources', 'field-notes.md'),
    '---\ntype: source\ntitle: Field notes\ncitation: Notes from the field\nreliability: high\n---\nField notes.\n',
  );

  await page.goto(`/projects/${PROJECT}/switch`);
  const activated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === ACTIVE_PATH,
  );
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  expect((await activated).ok()).toBe(true);
  return library;
}

/** The files in the pending folder of the project; a missing folder is an empty list. */
async function pendingFiles(library: string): Promise<string[]> {
  try {
    return await readdir(join(library, PROJECT, '.scriba', 'pending'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** Opens the probe's Source tab, where the live panel sits beside the editor. */
async function openProbeSource(page: Page): Promise<void> {
  await page.goto('/tools');
  await page
    .locator(`li[data-tool="${PROBE}"][data-origin="user"] [data-open]`)
    .click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await expect(page.locator('[data-editor]')).toBeVisible();
}

/** The ids of an entity picker's options, without the empty first option. */
async function pickerIds(page: Page, key: string): Promise<string[]> {
  return page
    .locator(
      `section[aria-label="Live preview"] section[data-key="${key}"] select option`,
    )
    .evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value !== ''),
    );
}

test.afterAll(async () => {
  await rm(await probeFile(), { force: true });
});

test('TRG-15 E1: editing a port and an entity kind in the source changes the node preview and the picker, after the lint answer and with no save', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await setUp(page);
  const file = await probeFile();
  const before = await readFile(file, 'utf8');

  await openProbeSource(page);
  const panel = page.locator('section[aria-label="Live preview"]');

  // Before the edit: the core idea is a node port, and the entity picker offers the person.
  await panel.locator('[data-live-tab="node"]').click();
  await expect(panel.locator('li[data-port="coreIdea"]')).toHaveCount(1);
  await panel.locator('[data-live-tab="form"]').click();
  await expect
    .poll(() => pickerIds(page, 'entityIds'))
    .toEqual(['ada']);

  // The new text: the core idea is no port, and the entity list takes a source.
  const edited = before
    .replace(
      'x-scriba-port: true\n      x-scriba-control: textarea',
      'x-scriba-port: false\n      x-scriba-control: textarea',
    )
    .replace(
      'x-scriba-entity-kinds: [person]',
      'x-scriba-entity-kinds: [source]',
    );
  expect(edited).not.toBe(before);

  const saves: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/save')) {
      saves.push(request);
    }
  });
  const linted = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === LINT_PATH,
  );
  await page.locator('[data-editor] .cm-content').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(edited);
  const answer = await linted;
  expect(answer.ok()).toBe(true);
  const body = (await answer.json()) as { lint: { severity: string }[] };
  expect(body.lint.filter((item) => item.severity === 'error')).toEqual([]);

  // After the answer: the node preview lost the core idea port, and the picker offers the source only.
  await panel.locator('[data-live-tab="node"]').click();
  await expect(panel.locator('li[data-port="coreIdea"]')).toHaveCount(0);
  await expect(panel.locator('li[data-port="entityIds"]')).toHaveCount(1);
  await panel.locator('[data-live-tab="form"]').click();
  await expect
    .poll(() => pickerIds(page, 'entityIds'))
    .toEqual(['field-notes']);

  // Nothing was saved: no save request, and the file on disk is the text read before the edit.
  expect(saves).toEqual([]);
  expect(await readFile(file, 'utf8')).toBe(before);
  expect(errors).toEqual([]);
});

test('TRG-15 E2: Render shows the cold-open template with the Form values and the chosen entity, with the source of the editor', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await setUp(page);

  await openProbeSource(page);
  const panel = page.locator('section[aria-label="Live preview"]');

  await panel
    .locator('section[data-key="coreIdea"] textarea')
    .fill('Engines reward patience');
  await panel
    .locator('section[data-key="entityIds"] select')
    .selectOption('ada');
  await panel.locator('section[data-key="person"] select').selectOption('ada');

  await panel.locator('[data-live-tab="prompt"]').click();
  const rendered = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === RENDER_PATH,
  );
  await panel.locator('[data-render]').click();
  const answer = await rendered;
  expect(answer.ok()).toBe(true);
  const sent = answer.request().postDataJSON() as { source?: unknown };
  expect(typeof sent.source).toBe('string');

  const prompt = panel.locator('[data-prompt]');
  await expect(prompt).toContainText('Core idea: Engines reward patience');
  await expect(prompt).toContainText('person ada (entities/ada.md)');
  await expect(prompt).toContainText('Ada.');

  // Render writes no file: the pending folder of the project holds nothing.
  expect(await pendingFiles(process.env.SCRIBA_E2E_LIBRARY!)).toEqual([]);
  expect(errors).toEqual([]);
});
