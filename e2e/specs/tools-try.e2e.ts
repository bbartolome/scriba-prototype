import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

// TRG-16's running-app check (unit line 22). Plan: plans/TRG-16.md, section 4, step 9 and test E1.
// The composed app the harness starts, with the mock OpenAI server behind the app default. The cold-open
// fixture goes into the library's user pack, as the TRG-05 spec does; this spec does not import that one.

const FIXTURE = fileURLToPath(
  new URL(
    '../../apps/api/test/fixtures/packs/core/tools/cold_open.yaml',
    import.meta.url,
  ),
);
const PROJECT = 'tools-try';
const ACTIVE_PATH = '/api/project-store/active';
const APP_DEFAULT_PATH = '/api/providers/app-default';
const ORIGIN = 'http://127.0.0.1:8080';

interface AppDefaultReply {
  appDefault: { providerId: string; model: string } | null;
}

/** Signs in, puts the fixture into the user pack, and activates a project of two people. */
async function setUp(page: Page): Promise<string> {
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
    'schemaVersion: 1\ntitle: Tools try\ngenrePack: nonfiction\n',
  );
  await writeFile(
    join(project, 'entities', 'ada.md'),
    '---\ntype: person\n---\nAda.\n',
  );
  await writeFile(
    join(project, 'entities', 'bob.md'),
    '---\ntype: person\n---\nBob.\n',
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

test('TRG-16 E1: Try runs the tool through the mock model, shows the draft and its sources, and leaves no file under the pending folder', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  const library = await setUp(page);
  const pendingBefore = await pendingFiles(library);

  // The app default this run finds, which it restores at its end.
  const before = await page.request.get(APP_DEFAULT_PATH);
  expect(before.status()).toBe(200);
  const prior = ((await before.json()) as AppDefaultReply).appDefault;
  const mock = process.env.SCRIBA_E2E_MOCK_URL!;

  // A provider at the tool-execute-draft scenario, made the app default, so the run never reaches Ollama.
  const created = await page.request.post('/api/providers', {
    headers: { origin: ORIGIN },
    data: {
      label: 'Mock tool',
      kind: 'openai-compatible',
      baseURL: `${mock}/scenario/tool-execute-draft/v1`,
      model: 'mock-model',
      temperature: 0.7,
      contextSize: 64000,
      maxTokens: 4096,
      timeout: 120000,
      retries: 2,
    },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  try {
    const defaulted = await page.request.post(APP_DEFAULT_PATH, {
      headers: { origin: ORIGIN },
      data: { providerId: id, model: 'mock-model' },
    });
    expect(defaulted.status()).toBe(200);

    await page.goto('/tools');
    await page
      .locator('li[data-tool="cold_open"][data-origin="user"] [data-open]')
      .click();
    await page.getByRole('tab', { name: 'Try', exact: true }).click();

    const panel = page.locator('app-tools-try');
    await panel
      .locator('section[data-key="coreIdea"] textarea')
      .fill('Engines reward patience');
    await panel
      .locator('section[data-key="person"] select')
      .selectOption('ada');
    await panel.getByRole('button', { name: 'Submit', exact: true }).click();

    // The output is the mock's draft; its trailing newline is contained, not compared.
    await expect(panel.locator('[data-output]')).toContainText(
      'The cold open opens on the bench at dawn.',
    );
    await expect(panel.locator('li[data-source]')).toHaveText(
      'entities/ada.md',
    );

    // Try writes no file and creates no pending change.
    expect(await pendingFiles(library)).toEqual(pendingBefore);
    expect(await pendingFiles(library)).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    if (prior !== null) {
      const restored = await page.request.post(APP_DEFAULT_PATH, {
        headers: { origin: ORIGIN },
        data: { providerId: prior.providerId, model: prior.model },
      });
      expect(restored.status()).toBe(200);
    }
  }
});
