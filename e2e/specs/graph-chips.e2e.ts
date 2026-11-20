import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// GRR-12's gesture check (unit criterion 4). Plan: plans/GRR-12.md, section 6 (T4) and C-13. Desktop viewport, no
// touch. The test seeds its own library project and its own graph file. The helpers are copies of
// graph-wires.e2e.ts and tools-preview.e2e.ts, not imports (as GRR-11 did). Gestures are real mouse drags: a
// chip of the side list is dragged onto a port row of the tool node.
test.use({ viewport: { width: 1280, height: 800 } });

const PROJECT = 'canvas-chips';
const GRAPH = 'tool-chips';
const SAVE_PATH = `/api/graph-runner/graphs/${GRAPH}/save`;

// The seeded recipe: a text input, an entity input feeding the tool's entity list, and the tool cold_open with
// no params. Its only wire is people.out to cold-open.entityIds, so cold-open.person and cold-open.coreIdea are free.
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
    id: 'cold-open',
    kind: 'tool',
    position: { x: 400, y: 120 },
    tool: 'cold_open',
  },
];
const SEEDED_EDGES = [
  { id: 'w1', from: 'people.out', to: 'cold-open.entityIds' },
];
const SEEDED_GRAPH = {
  schemaVersion: 1,
  view: 'recipe',
  name: 'Tool chips',
  nodes: SEEDED_NODES,
  edges: SEEDED_EDGES,
};
const SEEDED = `${JSON.stringify(SEEDED_GRAPH, null, 2)}\n`;

/** Signs in, seeds the project with its entities and the graph file, activates it, and opens the graph's canvas. */
async function openCanvas(page: Page): Promise<string> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const folder = join(library, PROJECT);
  await mkdir(join(folder, 'graphs'), { recursive: true });
  await mkdir(join(folder, 'entities'), { recursive: true });
  await writeFile(
    join(folder, 'project.yaml'),
    'schemaVersion: 1\ntitle: Chips book\ngenrePack: nonfiction\n',
  );
  // The entity id is the file stem; the front matter gives only the type and the title.
  await writeFile(
    join(folder, 'entities', 'anna.md'),
    '---\ntype: person\ntitle: Anna\n---\nAnna.\n',
  );
  await writeFile(
    join(folder, 'entities', 'claim-1.md'),
    '---\ntype: claim\ntitle: Claim one\n---\nA claim.\n',
  );
  await writeFile(
    join(folder, 'entities', 'house-style.md'),
    '---\ntype: style-profile\ntitle: House style\n---\nThe house style.\n',
  );
  await writeFile(join(folder, 'graphs', `${GRAPH}.json`), SEEDED);

  // The switch page POSTs the activation when its Switch button is clicked (setup, not part of the criterion).
  await page.goto(`/projects/${PROJECT}/switch`);
  const activated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/project-store/active',
  );
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  expect((await activated).ok()).toBe(true);

  await page.goto(`/projects/${PROJECT}/graphs/${GRAPH}`);
  await expect(page.locator('[data-node="chapter-notes"]')).toBeVisible();
  await expect(page.locator('[data-entity="anna"]')).toBeVisible();
  await expect(
    page.locator('[data-drop-port="cold-open.person"]'),
  ).toBeAttached();
  return join(folder, 'graphs', `${GRAPH}.json`);
}

/** The centre of an element, after scrolling it into view. Used before a drag starts, never during one. */
async function centreOf(
  page: Page,
  selector: string,
): Promise<{ x: number; y: number }> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  return boxCentre(page, selector);
}

/** The centre of an element's box as it is now, without scrolling. */
async function boxCentre(
  page: Page,
  selector: string,
): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).boundingBox();
  if (box === null) throw new Error(`${selector} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * True when the element hit at the centre of the box of `selector` is that element or inside it. A port row's
 * centre is usually a child of the row, so `closest` is the test.
 */
async function hitsWithin(page: Page, selector: string): Promise<boolean> {
  const centre = await centreOf(page, selector);
  return page.evaluate(
    ({ x, y, target }) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && hit.closest(target) !== null;
    },
    { x: centre.x, y: centre.y, target: selector },
  );
}

/** Two animation frames, so that CDK's drag preview and the layout settle before the target is measured. */
async function twoFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

/**
 * A real mouse drag of a side-list chip onto a port row, as TRG-05 does it: down on the chip, a short move to start
 * the drag, then the target is measured (the drag has started), and the pointer moves there and is released.
 */
async function dragChip(
  page: Page,
  chipSelector: string,
  targetSelector: string,
): Promise<void> {
  expect(await hitsWithin(page, chipSelector)).toBe(true);
  expect(await hitsWithin(page, targetSelector)).toBe(true);

  const from = await centreOf(page, chipSelector);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 12, { steps: 4 });
  await expect(page.locator('.cdk-drag-preview')).toBeVisible();
  await twoFrames(page);
  const target = await boxCentre(page, targetSelector);
  await page.mouse.move(target.x, target.y, { steps: 12 });
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
  await rm(join(process.env.SCRIBA_E2E_LIBRARY!, PROJECT), {
    recursive: true,
    force: true,
  });
});

test("Drop rules are tested as the drop handler's observable outcome on the saved graph (Vitest) and as a real gesture (Playwright).", async ({
  page,
}) => {
  const path = await openCanvas(page);

  // Drag 1: anna (a person) onto the text port coreIdea. Refused: the reason shows and nothing is pinned.
  await dragChip(
    page,
    '[data-entity="anna"]',
    '[data-drop-port="cold-open.coreIdea"]',
  );
  await expect(page.locator('[data-drop-reason]')).toHaveText(
    'Text ports take no entities.',
  );
  await expect(page.locator('[data-pinned]')).toHaveCount(0);

  // Drag 2: claim-1 (a claim) onto person, which takes only person entities. Refused with the kind's reason.
  await dragChip(
    page,
    '[data-entity="claim-1"]',
    '[data-drop-port="cold-open.person"]',
  );
  await expect(page.locator('[data-drop-reason]')).toHaveText(
    'This port takes person entities.',
  );
  await expect(page.locator('[data-pinned]')).toHaveCount(0);

  // Drag 3: anna onto entityIds, which is wired from people. Refused: the port is already wired.
  await dragChip(
    page,
    '[data-entity="anna"]',
    '[data-drop-port="cold-open.entityIds"]',
  );
  await expect(page.locator('[data-drop-reason]')).toHaveText(
    'This port is already wired.',
  );
  await expect(page.locator('[data-pinned]')).toHaveCount(0);

  // Drag 4: anna onto person. Accepted: the port shows anna as a pinned chip, and the reason line is empty.
  await dragChip(
    page,
    '[data-entity="anna"]',
    '[data-drop-port="cold-open.person"]',
  );
  await expect(page.locator('[data-pinned="cold-open.person"]')).toContainText(
    'anna',
  );
  await expect(page.locator('[data-drop-reason]')).toHaveText('');

  expect(await saveAndStatus(page)).toBe(200);

  // The file on disk is the seeded graph, with cold-open's params holding only the pinned reference.
  const saved = JSON.parse(await readFile(path, 'utf8')) as typeof SEEDED_GRAPH;
  expect(saved).toEqual({
    ...SEEDED_GRAPH,
    nodes: [
      ...SEEDED_NODES.slice(0, 2),
      { ...SEEDED_NODES[2], params: { person: 'anna' } },
    ],
  });
});
