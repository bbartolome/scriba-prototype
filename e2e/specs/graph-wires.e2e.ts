import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// GRR-11's gesture checks (unit criterion 2, line 27). Plan: plans/GRR-11.md, section 4 (T2 and E2). Desktop
// viewport, no touch. Each test seeds its own library project and its own graph file. The helpers are copies
// of graph-canvas.e2e.ts, not imports (as TRG-14 does). Gestures are mouse drags with intermediate moves.
test.use({ viewport: { width: 1280, height: 800 } });

const GRAPH = 'tool-wires';
const SAVE_PATH = `/api/graph-runner/graphs/${GRAPH}/save`;

// The seeded recipe of step 7: two entity inputs and a text input, and the tool cold_open with no params.
const SEEDED_NODES = [
  {
    id: 'chapter-notes',
    kind: 'input',
    position: { x: 40, y: 120 },
    params: { type: 'text', label: 'Chapter notes' },
  },
  {
    id: 'people',
    kind: 'input',
    position: { x: 40, y: 300 },
    params: { type: 'entity', label: 'Key people', entityKind: 'person' },
  },
  {
    id: 'others',
    kind: 'input',
    position: { x: 40, y: 480 },
    params: { type: 'entity', label: 'Others', entityKind: 'person' },
  },
  {
    id: 'cold-open',
    kind: 'tool',
    position: { x: 400, y: 120 },
    tool: 'cold_open',
  },
];
const SEEDED_EDGES = [{ id: 'w1', from: 'people.out', to: 'cold-open.person' }];
const SEEDED = `${JSON.stringify(
  {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Tool wires',
    nodes: SEEDED_NODES,
    edges: SEEDED_EDGES,
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
    'schemaVersion: 1\ntitle: Tool wires book\ngenrePack: nonfiction\n',
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
  await expect(page.locator(`[data-port="cold-open.person"]`)).toBeAttached();
  return join(folder, 'graphs', `${GRAPH}.json`);
}

/** The centre of an element on the page, in page coordinates. */
async function centreOf(
  page: Page,
  selector: string,
): Promise<{ x: number; y: number }> {
  // A handle below the viewport cannot be hit; the page scrolls it into view first.
  await page.locator(selector).scrollIntoViewIfNeeded();
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

test('criterion 2: a text output drawn to an entity list port, and a second wire into a wired input, are refused and the saved file keeps its text', async ({
  page,
}) => {
  const path = await openCanvas(page, 'canvas-wires-refused');

  // Drag 1: the text input's output to the entity list input of the tool (refused: text to entity).
  const textOut = '[data-port="chapter-notes.out"]';
  const entityIds = '[data-port="cold-open.entityIds"]';
  expect(await hitsAtCentre(page, textOut)).toBe(true);
  expect(await hitsAtCentre(page, entityIds)).toBe(true);
  await drag(
    page,
    await centreOf(page, textOut),
    await centreOf(page, entityIds),
  );

  // Drag 2: a second entity input's output to the input that `people` already feeds (refused: wired input).
  const othersOut = '[data-port="others.out"]';
  const person = '[data-port="cold-open.person"]';
  expect(await hitsAtCentre(page, othersOut)).toBe(true);
  expect(await hitsAtCentre(page, person)).toBe(true);
  await drag(
    page,
    await centreOf(page, othersOut),
    await centreOf(page, person),
  );

  expect(await saveAndStatus(page)).toBe(200);

  // No wire was emitted by either drag: the file's text is the seeded text, byte for byte.
  expect(await readFile(path, 'utf8')).toBe(SEEDED);
});

test('E2: an entity output drawn to an entity list port is accepted, and Save adds only that wire', async ({
  page,
}) => {
  const path = await openCanvas(page, 'canvas-wires-accepted');

  const peopleOut = '[data-port="people.out"]';
  const entityIds = '[data-port="cold-open.entityIds"]';
  expect(await hitsAtCentre(page, peopleOut)).toBe(true);
  expect(await hitsAtCentre(page, entityIds)).toBe(true);
  await drag(
    page,
    await centreOf(page, peopleOut),
    await centreOf(page, entityIds),
  );

  expect(await saveAndStatus(page)).toBe(200);

  const saved = JSON.parse(await readFile(path, 'utf8')) as {
    nodes: unknown[];
    edges: Array<{ id: string; from: string; to: string }>;
  };
  expect(saved.edges).toEqual([
    ...SEEDED_EDGES,
    { id: 'w2', from: 'people.out', to: 'cold-open.entityIds' },
  ]);
  expect(saved.nodes).toEqual(SEEDED_NODES);
});
