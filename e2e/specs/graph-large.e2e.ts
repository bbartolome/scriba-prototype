import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// GRR-15's large-graph measurement (unit criterion 3, unit lines 17 and 22). Plan: plans/GRR-15.md, section 5 (T7),
// section 4 steps 7 and 12. Desktop viewport, no touch. The test runs only when SCRIBA_E2E_MEASURE=1 is set: it is a
// load-sensitive measurement, recorded once in the PR, and the CI suite does not repeat it. The helpers are copies,
// not imports.
test.use({ viewport: { width: 1280, height: 800 } });

const PROJECT = 'canvas-large';
const GRAPH = 'large-graph';
const NODE_COUNT = 150;
const COLUMNS = 15;
const LIMIT_MS = 200;

type Point = { x: number; y: number };

/** A recipe of 150 cold_open tool nodes, n001 to n150, on a grid of 15 by 10 with no wires. */
function largeRecipe(): string {
  const nodes = Array.from({ length: NODE_COUNT }, (_, index) => {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    return {
      id: `n${String(index + 1).padStart(3, '0')}`,
      kind: 'tool',
      position: { x: 40 + 400 * column, y: 40 + 600 * row },
      tool: 'cold_open',
    };
  });
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      view: 'recipe',
      name: 'Large graph',
      nodes,
      edges: [],
    },
    null,
    2,
  )}\n`;
}

/** Signs in, seeds the project and the graph, and activates the project. */
async function seed(page: Page): Promise<void> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  const folder = join(library, PROJECT);
  await mkdir(join(folder, 'graphs'), { recursive: true });
  await writeFile(
    join(folder, 'project.yaml'),
    'schemaVersion: 1\ntitle: Large book\ngenrePack: nonfiction\n',
  );
  await writeFile(join(folder, 'graphs', `${GRAPH}.json`), largeRecipe());

  // The switch page POSTs the activation when its Switch button is clicked (setup, not part of the measurement).
  await page.goto(`/projects/${PROJECT}/switch`);
  const activated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/project-store/active',
  );
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  expect((await activated).ok()).toBe(true);
}

/** The long tasks recorded since the last reset, as their durations in milliseconds. */
async function longTasks(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    ((window as unknown as { __long: PerformanceEntry[] }).__long ?? []).map(
      (entry) => entry.duration,
    ),
  );
}

/** Empties the recorded long tasks. */
async function resetLongTasks(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __long: PerformanceEntry[] }).__long = [];
  });
}

/** The centre of an element on the page, in page coordinates, as it is now. */
async function boxCentre(page: Page, selector: string): Promise<Point> {
  const box = await page.locator(selector).boundingBox();
  if (box === null) throw new Error(`${selector} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The candidate background points: a fine grid over the vflow. */
async function gridOverVflow(page: Page): Promise<Point[]> {
  const box = await page.locator('vflow').boundingBox();
  if (box === null) throw new Error('the vflow has no box');
  const points: Point[] = [];
  for (let fy = 0.05; fy <= 0.95; fy += 0.05) {
    for (let fx = 0.05; fx <= 0.95; fx += 0.05) {
      points.push({ x: box.x + box.width * fx, y: box.y + box.height * fy });
    }
  }
  return points;
}

/** The first candidate point that is inside the vflow and not inside a node. */
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

test('a 150-node recipe opens and pans with no long task over 200 ms', async ({
  page,
}) => {
  test.skip(
    process.env.SCRIBA_E2E_MEASURE !== '1',
    'set SCRIBA_E2E_MEASURE=1 to run the large-graph measurement',
  );

  // The long tasks are recorded from the first script of each page (buffered, so none is missed).
  await page.addInitScript(() => {
    const target = window as unknown as { __long: PerformanceEntry[] };
    target.__long = [];
    new PerformanceObserver((list) => {
      target.__long.push(...list.getEntries());
    }).observe({ type: 'longtask', buffered: true });
  });

  await seed(page);

  // The graph list is opened in the app; the link to the graph is an in-app navigation (no second bundle parse).
  await page.goto(`/projects/${PROJECT}/graphs`);
  const link = page.getByRole('link', { name: 'Large graph', exact: true });
  await expect(link).toBeVisible();

  await resetLongTasks(page);
  await page.evaluate(() => {
    (window as unknown as { __t0: number }).__t0 = performance.now();
  });
  await link.click();
  await expect(page.locator('.vnode:visible')).toHaveCount(NODE_COUNT);
  await expect(page.locator('[data-node="n150"]')).toBeVisible();
  const openMs = await page.evaluate(
    () => performance.now() - (window as unknown as { __t0: number }).__t0,
  );
  const openLongs = await longTasks(page);

  // The pan: a drag of the background by (-200, -100) in 20 steps. The longtask record is cleared first.
  // The validation list above the canvas pushes the vflow down the page, so it is scrolled into view first.
  await page.locator('vflow').scrollIntoViewIfNeeded();
  const before = await boxCentre(page, '[data-node="n001"]');
  const start = await backgroundPoint(page, await gridOverVflow(page));
  await resetLongTasks(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 200, start.y - 100, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator('[data-node="n001"]')).toBeVisible();
  const panLongs = await longTasks(page);

  const after = await boxCentre(page, '[data-node="n001"]');
  expect(Math.abs(after.x - before.x + 200)).toBeLessThanOrEqual(5);
  expect(Math.abs(after.y - before.y + 100)).toBeLessThanOrEqual(5);

  const summary = {
    openMs: Math.round(openMs),
    openLongestMs: Math.round(Math.max(0, ...openLongs)),
    openLongTasksOver50: openLongs.filter((d) => d >= 50).length,
    panLongestMs: Math.round(Math.max(0, ...panLongs)),
    panLongTasksOver50: panLongs.filter((d) => d >= 50).length,
  };
  console.log(`T7 measurement ${JSON.stringify(summary)}`);

  for (const duration of [...openLongs, ...panLongs]) {
    expect(duration, 'a long task during open or pan').toBeLessThanOrEqual(
      LIMIT_MS,
    );
  }
});
