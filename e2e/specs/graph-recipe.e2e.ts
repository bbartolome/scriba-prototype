import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// GRR-17 criterion 1 (T1) and the Scope's sample run (S1), the extension of unit GRR-17
// (Scope line 17; criterion 1 at line 21). Plan: GRR-17 plan, sections 4.1, 4.2 and 4.3.
// Desktop viewport, mouse gestures, form fields and the input-values dialog. The setup (sign-in, provider,
// app default, start from sample, activation) is HTTP and is not part of the criterion. Criteria 3 and 4 are
// not tested here (DECISIONS 2026-11-20 GRR-17).
// The vflow is 70vh tall and takes the width right of the entity list (canvas-page.ts lines 718, 804, 805 and 812).
// Page scroll cannot reach a node the vflow clips, so the viewport is larger, as tools-preview.e2e.ts does
// (lines 20 to 23). It is still the desktop class (device-class.ts lines 63 and 100 to 101). No pan, no zoom.
test.use({ viewport: { width: 2560, height: 1800 } });

const ORIGIN = 'http://127.0.0.1:8080';
const ACTIVE_PATH = '/api/project-store/active';
const APP_DEFAULT_PATH = '/api/providers/app-default';
const SCENARIO = 'recipe-chapter-opening';
const EMPTY_FOLDER = 'recipe-gate-empty';
const SAMPLE_FOLDER = 'recipe-gate-sample';
const GRAPH_EMPTY = 'empty-recipe';
const SAVE_PATH = `/api/graph-runner/graphs/${GRAPH_EMPTY}/save`;
const VALIDATE_PATH = '/api/graph-runner/graphs/validate';

interface AppDefaultReply {
  appDefault: { providerId: string; model: string } | null;
}

interface MockRecord {
  endpoint: string;
  attempt: number;
  step: number | null;
}

interface SavedEdge {
  from: string;
  to: string;
}

interface SavedGraph {
  nodes: Array<{ id: string; tool?: string; params?: Record<string, unknown> }>;
  edges: SavedEdge[];
}

/** Signs in through the setup URL, as the other specs do; the session cookie is kept by the page. */
async function signIn(page: Page): Promise<string> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);
  return library;
}

/**
 * Setup steps a to d of plan section 4.1: sign in, record the prior app default, reset the mock scenario,
 * make a mock provider the app default, start a copy of the sample, and activate it.
 * Returns the prior app default (null when there was none).
 */
async function setUp(
  page: Page,
  folder: string,
  title: string,
): Promise<{ prior: AppDefaultReply['appDefault']; mock: string }> {
  await signIn(page);
  const mock = process.env.SCRIBA_E2E_MOCK_URL!;

  const before = await page.request.get(APP_DEFAULT_PATH);
  expect(before.status()).toBe(200);
  const prior = ((await before.json()) as AppDefaultReply).appDefault;

  const reset = await page.request.post(
    `${mock}/__mock/scenarios/${SCENARIO}/reset`,
  );
  expect(reset.status()).toBe(204);

  const created = await page.request.post('/api/providers', {
    headers: { origin: ORIGIN },
    data: {
      label: 'Mock',
      kind: 'openai-compatible',
      baseURL: `${mock}/scenario/${SCENARIO}/v1`,
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

  const started = await page.request.post(
    '/api/project-store/projects/start-from-sample',
    {
      headers: { origin: ORIGIN },
      data: { sampleId: 'nonfiction', folderName: folder, title },
    },
  );
  expect(started.status()).toBe(201);

  const activated = await page.request.post(ACTIVE_PATH, {
    headers: { origin: ORIGIN },
    data: { projectId: folder },
  });
  expect(activated.status()).toBe(200);
  expect(await activated.json()).toEqual({ active: folder });

  return { prior, mock };
}

/** Restores the prior app default, only when there was one (the app default cannot be cleared). */
async function restoreDefault(
  page: Page,
  prior: AppDefaultReply['appDefault'],
): Promise<void> {
  if (prior === null) return;
  const restored = await page.request.post(APP_DEFAULT_PATH, {
    headers: { origin: ORIGIN },
    data: { providerId: prior.providerId, model: prior.model },
  });
  expect(restored.status()).toBe(200);
}

/** The centre of an element on the page, in page coordinates (scrolls it into view first). */
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

/** The element hit at a point, described as dropHits describes it (for the failure message only). */
async function describeHit(
  page: Page,
  point: { x: number; y: number },
): Promise<string> {
  return page.evaluate(
    ({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      if (hit === null) return 'null';
      return `<${hit.tagName.toLowerCase()} class="${hit.getAttribute('class') ?? ''}" data-port="${hit.getAttribute('data-port') ?? ''}" cx="${hit.getAttribute('cx') ?? ''}" cy="${hit.getAttribute('cy') ?? ''}">`;
    },
    { x: point.x, y: point.y },
  );
}

/**
 * Asserts the hit check 2 of plan section 4.1 step j, before the mouse-down: the centre of the handle is hit by
 * the handle's own circle. The message names the check, the point, the element hit, the target's box and the
 * viewport size, so a stop report carries the measured numbers.
 */
async function expectHitBeforeDrag(
  page: Page,
  selector: string,
): Promise<void> {
  const centre = await centreOf(page, selector);
  const hit = await hitsAtCentre(page, selector);
  const element = await describeHit(page, centre);
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  expect(
    hit,
    `check 2: ${selector} is not hit at point (${centre.x}, ${centre.y}); element hit ${element}; target box ${JSON.stringify(box)}; viewport ${JSON.stringify(viewport)}`,
  ).toBe(true);
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
 * The answer to a validate request whose unsaved file passes `matches`. Create the waiter before the edit it
 * follows. Validation answers about 300 ms after the last edit and can move the panel above the palette.
 */
function validated(page: Page, matches: (file: SavedGraph) => boolean) {
  return page.waitForResponse(
    (response) => {
      const request = response.request();
      if (
        request.method() !== 'POST' ||
        new URL(response.url()).pathname !== VALIDATE_PATH
      ) {
        return false;
      }
      try {
        return matches(request.postDataJSON() as SavedGraph);
      } catch {
        return false;
      }
    },
    { timeout: 10_000 },
  );
}

/** True when two points are more than 1 px apart in x or y. */
function far(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1;
}

/**
 * True when the element at a point during a drag is the target's drop surface: the target itself, or the
 * connection magnet of that very handle (same node, same centre). While a connection is dragged, ngx-vflow draws
 * a transparent `circle.magnet` over every handle, and it is on top of the handle's own circle. It does not
 * scroll, so an open drag is not moved. `hit` describes the element found, for the failure message.
 */
async function dropHits(
  page: Page,
  point: { x: number; y: number },
  selector: string,
): Promise<{ ok: boolean; hit: string }> {
  return page.evaluate(
    ({ x, y, target }) => {
      const hit = document.elementFromPoint(x, y);
      const el = document.querySelector(target);
      let ok = false;
      if (hit !== null && el !== null) {
        ok =
          hit === el ||
          (hit.matches('circle.magnet') &&
            hit.closest('g.vflow-node') === el.closest('g.vflow-node') &&
            hit.getAttribute('cx') === el.getAttribute('cx') &&
            hit.getAttribute('cy') === el.getAttribute('cy'));
      }
      const hitText =
        hit === null
          ? 'null'
          : `<${hit.tagName.toLowerCase()} class="${hit.getAttribute('class') ?? ''}" data-port="${hit.getAttribute('data-port') ?? ''}" cx="${hit.getAttribute('cx') ?? ''}" cy="${hit.getAttribute('cy') ?? ''}">`;
      return { ok, hit: hitText };
    },
    { x: point.x, y: point.y, target: selector },
  );
}

/**
 * Asserts a drop-surface hit check of plan section 4.1 step j (check `b` or `c`). The message names the check, the
 * point, the element hit, the target's box and the viewport size, so a stop report carries the measured numbers.
 */
async function expectDropHit(
  page: Page,
  check: 'b' | 'c',
  point: { x: number; y: number },
  selector: string,
): Promise<void> {
  const result = await dropHits(page, point, selector);
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  expect(
    result.ok,
    `check ${check}: ${selector} is not hit at point (${point.x}, ${point.y}); element hit ${result.hit}; target box ${JSON.stringify(box)}; viewport ${JSON.stringify(viewport)}`,
  ).toBe(true);
}

/**
 * Drags a wire by mouse from the source handle to the target handle (plan section 4.1 step j, helper `wire`).
 * The drop is measured after the drag has started and again before the mouse-up, so a reflow during the drag
 * is seen. A failed expectation here is the stop rule of step j: PLAN DOES NOT WORK.
 */
async function wire(page: Page, from: string, to: string): Promise<void> {
  await expectHitBeforeDrag(page, from);
  await expectHitBeforeDrag(page, to);
  const start = await centreOf(page, from);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 40, start.y, { steps: 4 });
  await twoFrames(page);

  const aim = await boxCentre(page, to);
  await expectDropHit(page, 'b', aim, to);
  await page.mouse.move(aim.x, aim.y, { steps: 10 });
  await twoFrames(page);

  let pointer = aim;
  let drop = await boxCentre(page, to);
  if (far(drop, pointer)) {
    await page.mouse.move(drop.x, drop.y, { steps: 2 });
    pointer = drop;
    await twoFrames(page);
    drop = await boxCentre(page, to);
  }
  expect(far(drop, pointer), `${to} did not move away from the pointer`).toBe(
    false,
  );
  await expectDropHit(page, 'c', pointer, to);
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

// Removes the folders this file creates from the shared library, which journey.e2e.ts checks.
test.afterAll(async () => {
  for (const folder of [EMPTY_FOLDER, SAMPLE_FOLDER]) {
    await rm(join(process.env.SCRIBA_E2E_LIBRARY!, folder), {
      recursive: true,
      force: true,
    });
  }
});

test('criterion 1: an empty canvas becomes a recipe that runs and leaves a pending change in the review queue', async ({
  page,
}) => {
  const { prior, mock } = await setUp(page, EMPTY_FOLDER, 'Recipe gate empty');
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  try {
    // e. A new recipe graph from the graph list, then its canvas: no nodes yet.
    await page.goto(`/projects/${EMPTY_FOLDER}/graphs`);
    await page.getByLabel('Graph name', { exact: true }).fill('Empty recipe');
    await page.getByLabel('View', { exact: true }).selectOption('recipe');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('link', { name: 'Empty recipe', exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/projects/${EMPTY_FOLDER}/graphs/${GRAPH_EMPTY}$`),
    );
    await expect(page.locator('[data-node]')).toHaveCount(0);

    // f. Three nodes: two inputs (Chapter notes, Puzzle) and one output. Kind is selected each time.
    await page.getByLabel('Kind', { exact: true }).selectOption('input');
    await page.getByLabel('Label', { exact: true }).fill('Chapter notes');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Kind', { exact: true }).selectOption('input');
    await page.getByLabel('Label', { exact: true }).fill('Puzzle');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Kind', { exact: true }).selectOption('output');
    await page
      .getByLabel('Path', { exact: true })
      .fill('drafts/empty-recipe.md');
    await page.getByLabel('Label', { exact: true }).fill('Chapter draft');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('[data-node="input-1"]')).toBeVisible();
    await expect(page.locator('[data-node="input-2"]')).toBeVisible();
    await expect(page.locator('[data-node="output-1"]')).toBeVisible();

    // g. The tool mystery_question from the palette: tool-1.
    await page.locator('li[data-tool="mystery_question"] button').click();
    await expect(page.locator('[data-node="tool-1"]')).toBeVisible();

    // h. Arrange separates the nodes that were added 40 px apart. It runs before the wires on purpose: with the
    // nodes overlapping, input-2 covers input-1.out. With no edges, Arrange puts all four nodes in one column.
    await page.locator('[data-arrange]').click();

    // i. The non-port form field of the tool. Its validation answers before any drag starts (Revision 4).
    const toned = validated(page, (file) =>
      file.nodes.some(
        (node) => node.id === 'tool-1' && node.params?.tone === 'curious',
      ),
    );
    await page
      .locator('[data-node="tool-1"]')
      .getByLabel('Tone', { exact: true })
      .fill('curious');
    await toned;
    await twoFrames(page);

    // j. Three wires, by mouse, one at a time. Each drag waits for the validation of the wire before it.
    const wires: Array<[string, string]> = [
      ['input-1.out', 'tool-1.coreIdea'],
      ['input-2.out', 'tool-1.puzzle'],
      ['tool-1.output', 'output-1.in'],
    ];
    for (const [index, [from, to]] of wires.entries()) {
      const count = index + 1;
      const wired = validated(
        page,
        (file) =>
          file.edges.length === count &&
          file.edges.some((edge) => edge.from === from && edge.to === to),
      );
      await wire(page, `[data-port="${from}"]`, `[data-port="${to}"]`);
      await wired;
      await twoFrames(page);
    }

    // k. Save, then the file on disk holds exactly the three edges and the tone.
    expect(await saveAndStatus(page)).toBe(200);
    const saved = JSON.parse(
      await readFile(
        join(library, EMPTY_FOLDER, 'graphs', `${GRAPH_EMPTY}.json`),
        'utf8',
      ),
    ) as SavedGraph;
    expect(saved.edges.map((edge) => [edge.from, edge.to]).sort()).toEqual(
      [
        ['input-1.out', 'tool-1.coreIdea'],
        ['input-2.out', 'tool-1.puzzle'],
        ['tool-1.output', 'output-1.in'],
      ].sort(),
    );
    const tool = saved.nodes.find((node) => node.id === 'tool-1');
    expect(tool?.tool).toBe('mystery_question');
    expect(tool?.params?.tone).toBe('curious');

    // l. Run is enabled with no blocking reason; the input-values dialog takes both inputs.
    await expect(page.locator('[data-run]')).toBeEnabled();
    await expect(page.locator('[data-run-reasons] li')).toHaveCount(0);
    await page.locator('[data-run]').click();
    const dialog = page.locator('[data-run-dialog]');
    await dialog
      .getByRole('textbox', { name: 'Chapter notes', exact: true })
      .fill('The practice-hours figure is quoted as a rule.');
    await dialog
      .getByRole('textbox', { name: 'Puzzle', exact: true })
      .fill('Why does one figure about practice hours get quoted as a rule?');
    await page.locator('[data-start]').click();
    await expect(dialog).toBeHidden();

    // m. The run is done, with the tool and the output badges done.
    await expect(page.locator('[data-run-status]')).toHaveText('Done');
    await expect(
      page.locator('[data-node="tool-1"] .badge[data-status="done"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-node="output-1"] .badge[data-status="done"]'),
    ).toBeVisible();

    // n. The output's review link opens the pending change of this run.
    const link = page.locator('[data-node="output-1"] [data-review-link]');
    const href = await link.getAttribute('href');
    const runId = new URL(href!, ORIGIN).searchParams.get('run');
    expect(runId, 'the review link carries the run id').not.toBeNull();
    await link.click();
    // The link is a router link: the navigation is asynchronous, so wait for the review URL before reading it.
    await page.waitForURL(
      (url) => url.pathname === `/projects/${EMPTY_FOLDER}/review`,
    );
    const reviewUrl = new URL(page.url());
    expect(reviewUrl.pathname).toBe(`/projects/${EMPTY_FOLDER}/review`);
    expect(reviewUrl.searchParams.get('run')).toBe(runId);
    await expect(
      page.getByText(`Recipe run ${runId}, output output-1`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('drafts/empty-recipe.md', { exact: true }),
    ).toBeVisible();

    // o. The mock got exactly one chat call, the first attempt at step 0.
    const records = (await (
      await page.request.get(`${mock}/__mock/scenarios/${SCENARIO}/requests`)
    ).json()) as MockRecord[];
    const chats = records.filter((record) => record.endpoint === 'chat');
    expect(chats.map((record) => [record.attempt, record.step])).toEqual([
      [1, 0],
    ]);
  } finally {
    await restoreDefault(page, prior);
  }
});

test('the Scope sample run: the shipped recipe runs with input values and leaves a pending change', async ({
  page,
}) => {
  const { prior, mock } = await setUp(
    page,
    SAMPLE_FOLDER,
    'Recipe gate sample',
  );
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  try {
    // a. The eight nodes of the shipped recipe.
    await page.goto(`/projects/${SAMPLE_FOLDER}/graphs/chapter-opening`);
    for (const id of [
      'chapter-notes',
      'people',
      'house-style',
      'mystery',
      'cold-open',
      'myth-buster',
      'numbers-to-people',
      'draft',
    ]) {
      await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
    }

    // b. Run, with input values: a project file, two entities, a style, and the output's target path.
    await expect(page.locator('[data-run]')).toBeEnabled();
    await page.locator('[data-run]').click();
    const dialog = page.locator('[data-run-dialog]');
    await dialog
      .getByLabel('Chapter notes mode', { exact: true })
      .selectOption('file');
    await dialog
      .getByLabel('Chapter notes file', { exact: true })
      .fill('drafts/the-ten-thousand-hour-idea.md');
    const people = dialog.getByLabel('Add to Key people and claims', {
      exact: true,
    });
    await people.selectOption('k-anders-ericsson');
    await people.selectOption('hours-figure-is-average');
    await dialog
      .getByLabel('House style', { exact: true })
      .selectOption('book-style');
    await dialog
      .getByLabel('Target path', { exact: true })
      .fill('drafts/ch02-opening.md');
    await page.locator('[data-start]').click();
    await expect(dialog).toBeHidden();

    // c. The run is done; the tool nodes and the output are done.
    await expect(page.locator('[data-run-status]')).toHaveText('Done');
    for (const id of [
      'mystery',
      'cold-open',
      'myth-buster',
      'numbers-to-people',
      'draft',
    ]) {
      await expect(
        page.locator(`[data-node="${id}"] .badge[data-status="done"]`),
      ).toBeVisible();
    }

    // d. The output's review link lists the draft in its run group. The link must be in the viewport first.
    const draftLink = page.locator('[data-node="draft"] [data-review-link]');
    await expect(
      draftLink,
      'the draft review link is in the viewport',
    ).toBeInViewport();
    await draftLink.click();
    await expect(page).toHaveURL(/\/projects\/recipe-gate-sample\/review/);
    const group = page.getByText(/^Recipe run .+, output draft$/);
    await expect(group).toBeVisible();
    await expect(
      page.getByText('drafts/ch02-opening.md', { exact: true }),
    ).toBeVisible();

    // e. The mock got four chat calls, attempts 1 to 4 at steps 0 to 3.
    const records = (await (
      await page.request.get(`${mock}/__mock/scenarios/${SCENARIO}/requests`)
    ).json()) as MockRecord[];
    const chats = records.filter((record) => record.endpoint === 'chat');
    expect(chats.map((record) => [record.attempt, record.step])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
    ]);

    // f. Extra, not a criterion: the run log names the run (existence only).
    const runLogs = await readdirSafe(
      join(library, SAMPLE_FOLDER, 'logs', 'recipe-runs'),
    );
    expect(runLogs.length).toBeGreaterThan(0);
  } finally {
    await restoreDefault(page, prior);
  }
});

/** The entries of a directory, or none when it does not exist. */
async function readdirSafe(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}
