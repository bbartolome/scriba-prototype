import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type CDPSession, type Page } from '@playwright/test';

// GRR-15's touch checks (unit criterion 1, and the touch Decision of unit line 15). Plan: plans/GRR-15.md, section 5
// (T1 to T4 and T8) and section 4, step 6. A tablet viewport (1024 by 768 is the CDK's tablet class) with touch
// emulation. The gestures are CDP touch sequences (Input.dispatchTouchEvent), since page.touchscreen only taps.
// Each test seeds its own library project and rewrites its file, so the order of the tests does not matter. The
// helpers are copies of graph-canvas.e2e.ts and graph-chips.e2e.ts, not imports.
test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

const GRAPH = 'touch-canvas';
const CHIPS_GRAPH = 'tool-chips';
const SAVE_PATH = `/api/graph-runner/graphs/${GRAPH}/save`;
const CHIPS_SAVE_PATH = `/api/graph-runner/graphs/${CHIPS_GRAPH}/save`;
const SEEDED_POSITION = { x: 80, y: 120 };

type Point = { x: number; y: number };

const SEEDED = `${JSON.stringify(
  {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Touch canvas',
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

// The seeded recipe of graph-chips.e2e.ts, for the chip drop (T3).
const CHIPS_NODES = [
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
const CHIPS_GRAPH_SEED = {
  schemaVersion: 1,
  view: 'recipe',
  name: 'Tool chips',
  nodes: CHIPS_NODES,
  edges: [{ id: 'w1', from: 'people.out', to: 'cold-open.entityIds' }],
};
const CHIPS_SEEDED = `${JSON.stringify(CHIPS_GRAPH_SEED, null, 2)}\n`;

/** Signs in, seeds the project with entities and the graph file, activates it, and opens the graph's canvas. */
async function openCanvas(
  page: Page,
  project: string,
  graph: string,
  body: string,
  entities: boolean,
): Promise<string> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const folder = join(library, project);
  await mkdir(join(folder, 'graphs'), { recursive: true });
  await writeFile(
    join(folder, 'project.yaml'),
    'schemaVersion: 1\ntitle: Touch book\ngenrePack: nonfiction\n',
  );
  if (entities) {
    await mkdir(join(folder, 'entities'), { recursive: true });
    await writeFile(
      join(folder, 'entities', 'anna.md'),
      '---\ntype: person\ntitle: Anna\n---\nAnna.\n',
    );
  }
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
  await expect(page.locator('[data-node="chapter-notes"]')).toBeVisible();
  return join(folder, 'graphs', `${graph}.json`);
}

/** The centre of an element on the page, in page coordinates, as it is now. */
async function boxCentre(page: Page, selector: string): Promise<Point> {
  const box = await page.locator(selector).boundingBox();
  if (box === null) throw new Error(`${selector} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The centre of an element, after scrolling it into view. Used before a gesture starts, never during one. */
async function centreOf(page: Page, selector: string): Promise<Point> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  return boxCentre(page, selector);
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

/** Two animation frames, so that CDK's drag preview and the layout settle before the target is measured. */
async function twoFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

/** Touch-starts the given points (ids 1, 2, ...) on a CDP session. */
async function touchStart(cdp: CDPSession, points: Point[]): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: points.map((point, index) => ({ ...point, id: index + 1 })),
  });
}

/** Moves each touch point in `steps` straight steps from `from` to `to` (the same index in both lists). */
async function touchMoves(
  cdp: CDPSession,
  from: Point[],
  to: Point[],
  steps = 10,
): Promise<void> {
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: from.map((start, index) => ({
        x: start.x + (to[index].x - start.x) * t,
        y: start.y + (to[index].y - start.y) * t,
        id: index + 1,
      })),
    });
  }
}

/** Releases every touch point. */
async function touchEnd(cdp: CDPSession): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

/** One finger: touch at `from`, ten moves to `to`, release. */
async function touchDrag(page: Page, from: Point, to: Point): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await touchStart(cdp, [from]);
  await touchMoves(cdp, [from], [to]);
  await twoFrames(page);
  await touchEnd(cdp);
  await cdp.detach();
}

/**
 * A touch drag of a side-list chip onto a port. The target is measured after the drag has started (the preview is
 * visible and two frames have passed), the same ordering as dragChip in graph-chips.e2e.ts.
 */
async function touchChipDrag(
  page: Page,
  chipSelector: string,
  targetSelector: string,
): Promise<void> {
  const from = await centreOf(page, chipSelector);
  // The first move is 30 px: under Chromium's touch slop (about 15 px) no touchmove is dispatched, so CDK sees none.
  const nudged = { x: from.x, y: from.y + 30 };
  const cdp = await page.context().newCDPSession(page);
  await touchStart(cdp, [from]);
  await touchMoves(cdp, [from], [nudged], 6);
  await expect(page.locator('.cdk-drag-preview')).toBeVisible();
  await twoFrames(page);
  // The target can be below the fold at 1024 by 768 (the canvas starts low, see revealVflow), so it is scrolled into
  // view here, after the drag has started; the pointer stays on the chip until the first move to the target.
  const target = await centreOf(page, targetSelector);
  await touchMoves(cdp, [nudged], [target]);
  await twoFrames(page);
  await touchEnd(cdp);
  await cdp.detach();
}

/**
 * Scrolls the vflow into view. At 1024 by 768 the canvas starts below the fold, because the tool palette is long (it
 * lists every tool of the packs); the vflow is shorter than the viewport, so it is then wholly visible.
 */
async function revealVflow(page: Page): Promise<void> {
  await page.locator('vflow').scrollIntoViewIfNeeded();
}

/**
 * A point of the vflow's background: inside the vflow, and not inside a node (`.vflow-node`). The candidates are
 * tried in order, and the first that qualifies is returned.
 */
async function backgroundPoint(
  page: Page,
  candidates: Point[],
): Promise<Point> {
  const found = await page.evaluate((points) => {
    for (const point of points) {
      const hit = document.elementFromPoint(point.x, point.y);
      if (
        hit !== null &&
        hit.closest('vflow') !== null &&
        hit.closest('.vflow-node') === null
      ) {
        return point;
      }
    }
    return null;
  }, candidates);
  if (found === null) throw new Error('no background point in the vflow');
  return found;
}

/** The candidate background points: a grid over the vflow, from its lower right corner. */
async function gridOverVflow(page: Page): Promise<Point[]> {
  const box = await page.locator('vflow').boundingBox();
  if (box === null) throw new Error('the vflow has no box');
  const points: Point[] = [];
  for (const fy of [0.9, 0.8, 0.7, 0.6]) {
    for (const fx of [0.9, 0.8, 0.7, 0.6]) {
      points.push({ x: box.x + box.width * fx, y: box.y + box.height * fy });
    }
  }
  return points;
}

/** Clicks Save and returns the status of the save request. */
async function saveAndStatus(page: Page, savePath: string): Promise<number> {
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === savePath,
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  return (await saved).status();
}

test('touch: a wire connects two handles', async ({ page }) => {
  const path = await openCanvas(page, 'touch-canvas-1', GRAPH, SEEDED, false);

  // The handles are reachable at 1024 by 768 (the same check as the mouse test in graph-canvas.e2e.ts).
  expect(await hitsAtCentre(page, '[data-port="chapter-notes.out"]')).toBe(
    true,
  );
  expect(await hitsAtCentre(page, '[data-port="draft.in"]')).toBe(true);

  const from = await centreOf(page, '[data-port="chapter-notes.out"]');
  const to = await boxCentre(page, '[data-port="draft.in"]');
  await touchDrag(page, from, to);

  expect(await saveAndStatus(page, SAVE_PATH)).toBe(200);
  const saved = JSON.parse(await readFile(path, 'utf8')) as {
    edges: Array<{ id: string; from: string; to: string }>;
  };
  expect(saved.edges).toEqual([
    { id: 'w1', from: 'chapter-notes.out', to: 'draft.in' },
  ]);
});

test('touch: a node moves and only its position changes', async ({ page }) => {
  const path = await openCanvas(page, 'touch-canvas-2', GRAPH, SEEDED, false);

  const head = await centreOf(page, '[data-node="chapter-notes"] .vnode-head');
  await touchDrag(page, head, { x: head.x + 120, y: head.y + 40 });

  expect(await saveAndStatus(page, SAVE_PATH)).toBe(200);

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
  expect(`${JSON.stringify({ ...saved, nodes: withSeeded }, null, 2)}\n`).toBe(
    SEEDED,
  );
});

test('touch: a matching entity chip pins on an entity port', async ({
  page,
}) => {
  const path = await openCanvas(
    page,
    'touch-canvas-3',
    CHIPS_GRAPH,
    CHIPS_SEEDED,
    true,
  );

  await touchChipDrag(
    page,
    '[data-entity="anna"]',
    '[data-drop-port="cold-open.person"]',
  );

  await expect(page.locator('[data-pinned="cold-open.person"]')).toContainText(
    'anna',
  );
  await expect(page.locator('[data-drop-reason]')).toHaveText('');
  expect(await saveAndStatus(page, CHIPS_SAVE_PATH)).toBe(200);

  const saved = JSON.parse(
    await readFile(path, 'utf8'),
  ) as typeof CHIPS_GRAPH_SEED;
  expect(saved).toEqual({
    ...CHIPS_GRAPH_SEED,
    nodes: [
      ...CHIPS_NODES.slice(0, 2),
      { ...CHIPS_NODES[2], params: { person: 'anna' } },
    ],
  });
});

test('touch: the background pans the canvas', async ({ page }) => {
  await openCanvas(page, 'touch-canvas-4', GRAPH, SEEDED, false);
  await revealVflow(page);

  const node = page.locator('[data-node="chapter-notes"]');
  const before = await boxCentre(page, '[data-node="chapter-notes"]');
  const start = await backgroundPoint(page, await gridOverVflow(page));
  await touchDrag(page, start, { x: start.x - 150, y: start.y - 60 });
  await expect(node).toBeVisible();

  const after = await boxCentre(page, '[data-node="chapter-notes"]');
  expect(Math.abs(after.x - before.x + 150)).toBeLessThanOrEqual(5);
  expect(Math.abs(after.y - before.y + 60)).toBeLessThanOrEqual(5);
});

test('touch: two fingers zoom the canvas', async ({ page }) => {
  await openCanvas(page, 'touch-canvas-5', GRAPH, SEEDED, false);
  await revealVflow(page);

  const node = page.locator('[data-node="chapter-notes"]');
  const chapter = await boxCentre(page, '[data-node="chapter-notes"]');
  const draft = await boxCentre(page, '[data-node="draft"]');
  const middle = { x: (chapter.x + draft.x) / 2, y: chapter.y };
  const widthBefore = (await node.boundingBox())!.width;

  // Two fingers 80 px apart spread to 240 px apart, in ten moves, on the background between the nodes.
  const centre = await backgroundPoint(page, [
    middle,
    ...(await gridOverVflow(page)),
  ]);
  const starts = [
    { x: centre.x - 40, y: centre.y },
    { x: centre.x + 40, y: centre.y },
  ];
  const ends = [
    { x: centre.x - 120, y: centre.y },
    { x: centre.x + 120, y: centre.y },
  ];
  const cdp = await page.context().newCDPSession(page);
  await touchStart(cdp, starts);
  await touchMoves(cdp, starts, ends);
  await twoFrames(page);
  await touchEnd(cdp);
  await cdp.detach();

  const widthAfter = (await node.boundingBox())!.width;
  expect(widthAfter).toBeGreaterThanOrEqual(widthBefore * 1.2);
});
