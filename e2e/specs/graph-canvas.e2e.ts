import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// GRR-10's gesture checks (unit lines 25 to 27, criteria 2 and 3). Plan: GRR-10 plan, section 4, tests 2 and 3.
// Desktop viewport, no touch. Each test seeds its own library project and its own graph file, so the order of
// the tests does not matter. The gestures are mouse drags, with intermediate moves so that d3-drag and the
// library's connection see a drag.
test.use({ viewport: { width: 1280, height: 800 } });

const GRAPH = 'chapter-canvas';
const SAVE_PATH = `/api/graph-runner/graphs/${GRAPH}/save`;
const SEEDED_POSITION = { x: 80, y: 120 };
const SEEDED = `${JSON.stringify(
  {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Canvas gesture',
    nodes: [
      {
        id: 'chapter-notes',
        kind: 'input',
        position: SEEDED_POSITION,
        params: { type: 'text', label: 'Chapter notes' },
      },
      { id: 'draft', kind: 'output', position: { x: 480, y: 120 } },
    ],
    edges: [],
  },
  null,
  2,
)}\n`;

/** Signs in, seeds the project with the graph file, activates the project, and opens the graph's canvas. */
async function openCanvas(page: Page, project: string): Promise<string> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const folder = join(library, project);
  await mkdir(join(folder, 'graphs'), { recursive: true });
  await writeFile(
    join(folder, 'project.yaml'),
    'schemaVersion: 1\ntitle: Canvas book\ngenrePack: nonfiction\n',
  );
  await writeFile(join(folder, 'graphs', `${GRAPH}.json`), SEEDED);

  // The switch page POSTs the activation when its Switch button is clicked (setup, not part of the criterion).
  await page.goto(`/projects/${project}/switch`);
  const activated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/project-store/active',
  );
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  expect((await activated).ok()).toBe(true);

  await page.goto(`/projects/${project}/graphs/${GRAPH}`);
  await expect(page.locator(`[data-node="chapter-notes"]`)).toBeVisible();
  return join(folder, 'graphs', `${GRAPH}.json`);
}

/** The centre of an element on the page, in page coordinates. */
async function centreOf(
  page: Page,
  selector: string,
): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).boundingBox();
  if (box === null) throw new Error(`${selector} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** True when the element hit at the centre of the box of `selector` is that element itself. */
async function hitsAtCentre(page: Page, selector: string): Promise<boolean> {
  const centre = await centreOf(page, selector);
  return page.evaluate(
    ({ x, y, target }) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && hit.matches(target);
    },
    { x: centre.x, y: centre.y, target: selector },
  );
}

/** A mouse drag from one point to another, in steps. */
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/** Clicks Save and returns the status of the save request. */
async function saveAndStatus(page: Page): Promise<number> {
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === SAVE_PATH,
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  return (await saved).status();
}

// Removes the folders this file seeds from the shared library, which journey.e2e.ts checks.
test.afterAll(async () => {
  for (const project of ['canvas-move', 'canvas-connect']) {
    await rm(join(process.env.SCRIBA_E2E_LIBRARY!, project), {
      recursive: true,
      force: true,
    });
  }
});

test('criterion 2: moving a node updates only its position in the saved file', async ({
  page,
}) => {
  const path = await openCanvas(page, 'canvas-move');

  const header = await centreOf(
    page,
    '[data-node="chapter-notes"] .vnode-head',
  );
  await drag(page, header, { x: header.x + 120, y: header.y + 40 });

  expect(await saveAndStatus(page)).toBe(200);

  const saved = JSON.parse(await readFile(path, 'utf8')) as {
    nodes: Array<{ id: string; position: { x: unknown; y: unknown } }>;
  };
  const moved = saved.nodes.find((node) => node.id === 'chapter-notes');
  expect(typeof moved?.position.x).toBe('number');
  expect(typeof moved?.position.y).toBe('number');
  expect(moved?.position).not.toEqual(SEEDED_POSITION);

  // Only the position changed: with it replaced by the seeded value, the file is the seeded text.
  const withSeeded = saved.nodes.map((node) =>
    node.id === 'chapter-notes' ? { ...node, position: SEEDED_POSITION } : node,
  );
  const restored = { ...saved, nodes: withSeeded };
  expect(`${JSON.stringify(restored, null, 2)}\n`).toBe(SEEDED);
});

test('criterion 3: a canvas-gesture Playwright spec (desktop) connects two handles and the saved wire uses <nodeId>.<key> port ids', async ({
  page,
}) => {
  const path = await openCanvas(page, 'canvas-connect');

  // The pointer events reach each handle's circle at its centre (the library's handle group, step 13).
  expect(await hitsAtCentre(page, '[data-port="chapter-notes.out"]')).toBe(
    true,
  );
  expect(await hitsAtCentre(page, '[data-port="draft.in"]')).toBe(true);

  const from = await centreOf(page, '[data-port="chapter-notes.out"]');
  const to = await centreOf(page, '[data-port="draft.in"]');
  await drag(page, from, to);

  expect(await saveAndStatus(page)).toBe(200);

  const saved = JSON.parse(await readFile(path, 'utf8')) as {
    edges: Array<{ id: string; from: string; to: string }>;
  };
  expect(saved.edges).toEqual([
    { id: 'w1', from: 'chapter-notes.out', to: 'draft.in' },
  ]);
  for (const edge of saved.edges) {
    expect(edge.from).toMatch(/^[a-z0-9][a-z0-9-]*\..+$/);
    expect(edge.to).toMatch(/^[a-z0-9][a-z0-9-]*\..+$/);
  }
});
