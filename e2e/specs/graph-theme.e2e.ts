import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

// GRR-15's styling check (unit criterion 2). Plan: GRR-15 plan, section 5 (T5, T6 and T9). Desktop viewport.
// Each test seeds its own library project and its own graph file, so the order of the tests does not matter. The
// expected colours are read from the theme itself: a probe element takes the token, and its computed value is
// the expected value, so no literal colour is written here. The helpers are copies, not imports.
test.use({ viewport: { width: 1280, height: 800 } });

const APP_DEFAULT_PATH = '/api/providers/app-default';
const ORIGIN = 'http://127.0.0.1:8080';

interface AppDefaultReply {
  appDefault: { providerId: string; model: string } | null;
}

// The recipe: a text input, the tool cold_open with its person pinned to anna, and an output. Both required ports
// (coreIdea and person) are fed, so Run is enabled and no node carries an issue.
const RECIPE_GRAPH = 'theme-recipe';
const RECIPE = `${JSON.stringify(
  {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Theme recipe',
    nodes: [
      {
        id: 'chapter-notes',
        kind: 'input',
        position: { x: 40, y: 120 },
        params: { type: 'text', label: 'Chapter notes' },
      },
      {
        id: 'cold-open',
        kind: 'tool',
        position: { x: 400, y: 120 },
        tool: 'cold_open',
        params: { person: 'anna' },
      },
      { id: 'draft', kind: 'output', position: { x: 760, y: 120 } },
    ],
    edges: [
      { id: 'w1', from: 'chapter-notes.out', to: 'cold-open.coreIdea' },
      { id: 'w2', from: 'cold-open.output', to: 'draft.in' },
    ],
  },
  null,
  2,
)}\n`;

// The story: one scene whose file is not in the project, so the scene gets the path-missing badge and an issue.
const STORY_GRAPH = 'theme-story';
const STORY = `${JSON.stringify(
  {
    schemaVersion: 1,
    view: 'story',
    name: 'Theme story',
    nodes: [
      {
        id: 'scene-1',
        kind: 'scene',
        label: 'Arrival',
        path: 'drafts/missing.md',
        position: { x: 40, y: 40 },
      },
    ],
    edges: [],
  },
  null,
  2,
)}\n`;

/** Signs in, seeds a project with an entity and the graph file, activates the project, and opens the graph. */
async function openGraph(
  page: Page,
  project: string,
  graph: string,
  body: string,
  view: 'recipe' | 'story',
): Promise<void> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const folder = join(library, project);
  await mkdir(join(folder, 'graphs'), { recursive: true });
  await mkdir(join(folder, 'entities'), { recursive: true });
  await writeFile(
    join(folder, 'project.yaml'),
    'schemaVersion: 1\ntitle: Theme book\ngenrePack: nonfiction\n',
  );
  await writeFile(
    join(folder, 'entities', 'anna.md'),
    '---\ntype: person\ntitle: Anna\n---\nAnna.\n',
  );
  await writeFile(join(folder, 'graphs', `${graph}.json`), body);

  // The switch page POSTs the activation when its Switch button is clicked (setup, not part of the criterion).
  await page.goto(`/projects/${project}/switch`);
  const activated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/project-store/active',
  );
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  expect((await activated).ok()).toBe(true);

  await page.goto(`/projects/${project}/graphs/${graph}`);
  const anchor = view === 'story' ? 'scene-1' : 'chapter-notes';
  await expect(page.locator(`[data-node="${anchor}"]`)).toBeVisible();
}

/** Sets the theme through the Shell's Theme toggle. */
async function setTheme(page: Page, theme: 'Light' | 'Dark'): Promise<void> {
  await page
    .getByRole('radiogroup', { name: 'Theme', exact: true })
    .getByRole('radio', { name: theme, exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    theme.toLowerCase(),
  );
}

/**
 * The value a token takes in the current theme for one CSS property. A probe element takes `var(token)` for that
 * property, and its computed value is read. The probe is removed before the function returns.
 */
async function probe(
  page: Page,
  token: string,
  property: 'color' | 'background-color' | 'border-top-color',
): Promise<string> {
  return page.evaluate(
    ({ token, property }) => {
      const element = document.createElement('div');
      element.style.setProperty(property, `var(${token})`);
      document.body.append(element);
      const value = getComputedStyle(element).getPropertyValue(property);
      element.remove();
      return value;
    },
    { token, property },
  );
}

/** The computed value of one CSS property of the first element that matches `locator`. */
async function styleOf(
  locator: Locator,
  property: 'color' | 'background-color' | 'border-top-color',
): Promise<string> {
  await expect(locator.first()).toBeVisible();
  return locator
    .first()
    .evaluate(
      (element, name) => getComputedStyle(element).getPropertyValue(name),
      property,
    );
}

/** Checks each row: the element's computed property equals the token's value in the current theme. */
async function expectTokens(
  page: Page,
  rows: Array<{
    name: string;
    locator: Locator;
    property: 'color' | 'background-color' | 'border-top-color';
    token: string;
  }>,
): Promise<void> {
  for (const row of rows) {
    const expected = await probe(page, row.token, row.property);
    expect(
      await styleOf(row.locator, row.property),
      `${row.name} ${row.property}`,
    ).toBe(expected);
  }
}

/** The app default this run finds, which the test restores at its end. */
async function readAppDefault(
  page: Page,
): Promise<AppDefaultReply['appDefault']> {
  const before = await page.request.get(APP_DEFAULT_PATH);
  expect(before.status()).toBe(200);
  return ((await before.json()) as AppDefaultReply).appDefault;
}

/** A provider at the mock scenario tool-execute-draft, made the app default, so the run never reaches Ollama. */
async function defaultToMock(page: Page): Promise<void> {
  const mock = process.env.SCRIBA_E2E_MOCK_URL!;
  const created = await page.request.post('/api/providers', {
    headers: { origin: ORIGIN },
    data: {
      label: 'Mock theme',
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
  const defaulted = await page.request.post(APP_DEFAULT_PATH, {
    headers: { origin: ORIGIN },
    data: { providerId: id, model: 'mock-model' },
  });
  expect(defaulted.status()).toBe(200);
}

// The projects of this file are library folders of the run; they are removed when the file's tests are done.
test.afterAll(async () => {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  for (const project of [
    'theme-canvas-1',
    'theme-canvas-2',
    'theme-canvas-3',
  ]) {
    await rm(join(library, project), { recursive: true, force: true });
  }
});

test('T5 recipe view: nodes, chips and the run dialog use the tokens in both themes', async ({
  page,
}) => {
  await openGraph(page, 'theme-canvas-1', RECIPE_GRAPH, RECIPE, 'recipe');
  await expect(page.locator('[data-run]')).toBeEnabled();
  await page.locator('[data-run]').click();
  await expect(page.locator('section[data-run-dialog]')).toBeVisible();

  const vnode = page.locator('.vnode');
  const sideChip = page.locator('.chip[data-entity="anna"]');
  const pinnedChip = page.locator('[data-pinned="cold-open.person"]');
  const dialog = page.locator('section[data-run-dialog]');

  const rows = (): Array<{
    name: string;
    locator: Locator;
    property: 'color' | 'background-color' | 'border-top-color';
    token: string;
  }> => [
    {
      name: '.vnode',
      locator: vnode,
      property: 'background-color',
      token: '--mat-sys-surface-container',
    },
    {
      name: '.vnode',
      locator: vnode,
      property: 'color',
      token: '--mat-sys-on-surface',
    },
    {
      name: '.vnode border',
      locator: vnode,
      property: 'border-top-color',
      token: '--mat-sys-outline',
    },
    {
      name: 'side chip',
      locator: sideChip,
      property: 'background-color',
      token: '--mat-sys-secondary-container',
    },
    {
      name: 'side chip',
      locator: sideChip,
      property: 'color',
      token: '--mat-sys-on-secondary-container',
    },
    {
      name: 'side chip border',
      locator: sideChip,
      property: 'border-top-color',
      token: '--mat-sys-outline-variant',
    },
    {
      name: 'pinned chip',
      locator: pinnedChip,
      property: 'background-color',
      token: '--mat-sys-secondary-container',
    },
    {
      name: 'pinned chip',
      locator: pinnedChip,
      property: 'color',
      token: '--mat-sys-on-secondary-container',
    },
    {
      name: 'port text glyph',
      locator: page.locator('.port-glyph.port-text'),
      property: 'color',
      token: '--mat-sys-primary',
    },
    {
      name: 'port entity glyph',
      locator: page.locator('.port-glyph.port-entity'),
      property: 'color',
      token: '--mat-sys-tertiary',
    },
    {
      name: 'port style glyph',
      locator: page.locator('.port-glyph.port-style'),
      property: 'color',
      token: '--mat-sys-secondary',
    },
    {
      name: 'run dialog',
      locator: dialog,
      property: 'background-color',
      token: '--mat-sys-surface-container-high',
    },
    {
      name: 'run dialog',
      locator: dialog,
      property: 'color',
      token: '--mat-sys-on-surface',
    },
    {
      name: 'run dialog border',
      locator: dialog,
      property: 'border-top-color',
      token: '--mat-sys-outline-variant',
    },
  ];

  await setTheme(page, 'Light');
  await expectTokens(page, rows());
  const lightBackground = await styleOf(vnode, 'background-color');
  await page.screenshot({
    path: test.info().outputPath('recipe-light.png'),
  });

  await setTheme(page, 'Dark');
  await expectTokens(page, rows());
  const darkBackground = await styleOf(vnode, 'background-color');
  await page.screenshot({
    path: test.info().outputPath('recipe-dark.png'),
  });

  expect(darkBackground).not.toBe(lightBackground);
});

test('T6 story view: the path-missing badge and the issue node use the tokens in both themes', async ({
  page,
}) => {
  await openGraph(page, 'theme-canvas-2', STORY_GRAPH, STORY, 'story');
  const badge = page.locator('[data-badge="path-missing"]');
  const issueNode = page.locator('.vnode.issue');
  const panel = page.locator('.story-panel');
  await expect(badge).toBeVisible();
  await expect(issueNode).toBeVisible();

  const rows = (): Array<{
    name: string;
    locator: Locator;
    property: 'color' | 'background-color' | 'border-top-color';
    token: string;
  }> => [
    {
      name: 'path-missing badge',
      locator: badge,
      property: 'background-color',
      token: '--mat-sys-error-container',
    },
    {
      name: 'path-missing badge',
      locator: badge,
      property: 'color',
      token: '--mat-sys-on-error-container',
    },
    {
      name: 'path-missing badge border',
      locator: badge,
      property: 'border-top-color',
      token: '--mat-sys-error',
    },
    {
      name: 'issue node border',
      locator: issueNode,
      property: 'border-top-color',
      token: '--mat-sys-error',
    },
    {
      name: 'story panel border',
      locator: panel,
      property: 'border-top-color',
      token: '--mat-sys-outline-variant',
    },
  ];

  await setTheme(page, 'Light');
  await expectTokens(page, rows());
  await page.screenshot({
    path: test.info().outputPath('story-light.png'),
  });

  await setTheme(page, 'Dark');
  await expectTokens(page, rows());
  await page.screenshot({
    path: test.info().outputPath('story-dark.png'),
  });
});

test('T9 recipe run: the status badges use the tokens in both themes', async ({
  page,
}) => {
  await openGraph(page, 'theme-canvas-3', RECIPE_GRAPH, RECIPE, 'recipe');
  const prior = await readAppDefault(page);

  try {
    await defaultToMock(page);
    await expect(page.locator('[data-run]')).toBeEnabled();
    await page.locator('[data-run]').click();
    await page
      .locator('section[data-run-dialog] textarea[aria-label="Chapter notes"]')
      .fill('Engines reward patience');
    await page.locator('section[data-run-dialog] [data-start]').click();

    const done = page.locator(
      '[data-node="cold-open"] .badge[data-status="done"]',
    );
    await expect(done).toBeVisible({ timeout: 120_000 });

    const rows = (): Array<{
      name: string;
      locator: Locator;
      property: 'color' | 'background-color' | 'border-top-color';
      token: string;
    }> => [
      {
        name: 'done badge',
        locator: done,
        property: 'background-color',
        token: '--mat-sys-primary-container',
      },
      {
        name: 'done badge',
        locator: done,
        property: 'color',
        token: '--mat-sys-on-primary-container',
      },
    ];

    await setTheme(page, 'Light');
    await expectTokens(page, rows());
    await page.screenshot({
      path: test.info().outputPath('run-light.png'),
    });

    await setTheme(page, 'Dark');
    await expectTokens(page, rows());
    await page.screenshot({
      path: test.info().outputPath('run-dark.png'),
    });
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
