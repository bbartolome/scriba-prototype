import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';

// TRG-05's running-app checks (unit lines 21 and 22). Plan: plans/TRG-05.md, section 4, tests T1 and T2.
// The composed app the harness starts. The cold-open fixture goes into the library's user pack, which the
// tool registry serves (plan F-A), so the harness and the root package.json stay unchanged.

const FIXTURE = fileURLToPath(
  new URL(
    '../../apps/api/test/fixtures/packs/core/tools/cold_open.yaml',
    import.meta.url,
  ),
);
const TOOL_PATH = '/api/tool-registry/tools/cold_open';
const ACTIVE_PATH = '/api/project-store/active';
const PROJECT = 'tools-spike';

// The person picker sits below the chips, so a tall viewport keeps the chip and the picker on screen for the drag.
test.use({ viewport: { width: 1280, height: 2100 } });

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

/** The centre of a visible element, in page coordinates. */
async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('the element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The values of a select's options, without the empty option. */
async function optionValues(select: Locator): Promise<string[]> {
  return select
    .locator('option')
    .evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value !== ''),
    );
}

test('TRG-05 C1: one tool response drives the form and the node body', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  const toolReads: string[] = [];
  page.on('response', (response) => {
    if (
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === TOOL_PATH
    ) {
      toolReads.push(response.url());
    }
  });

  await setUp(page);
  const formLayout = page.locator('section[aria-label="Form layout"]');
  const nodeBody = page.locator('section[aria-label="Node body"]');

  await page.goto('/tools');
  await page
    .locator('li[data-tool="cold_open"][data-origin="user"] [data-open]')
    .click();
  await expect(nodeBody.locator('li[data-port]')).toHaveCount(6);

  // (a) One read of the tool while the page lives.
  expect(toolReads).toHaveLength(1);

  // (b) The form layout: one section per field of the fixture, in form order, each with a control.
  const formSections = await formLayout
    .locator('section[data-key]')
    .evaluateAll((sections) =>
      sections.map((section) => ({
        key: section.getAttribute('data-key'),
        control: section.getAttribute('data-control'),
      })),
    );
  expect(formSections.map((section) => section.key)).toEqual([
    'coreIdea',
    'entityIds',
    'styleProfile',
    'length',
    'tone',
    'person',
    'moment',
  ]);
  for (const section of formSections) {
    expect(section.control, `control of ${section.key}`).toBeTruthy();
  }

  // (c) The node body: the port rows, in order, with their types; the output last.
  const portRows = await nodeBody.locator('li[data-port]').evaluateAll((rows) =>
    rows.map((row) => ({
      port: row.getAttribute('data-port'),
      type: row.querySelector('.port-type')?.textContent?.trim() ?? null,
    })),
  );
  expect(portRows).toEqual([
    { port: 'coreIdea', type: 'text' },
    { port: 'entityIds', type: 'entity list' },
    { port: 'styleProfile', type: 'style' },
    { port: 'person', type: 'entity' },
    { port: 'moment', type: 'text' },
    { port: 'output', type: 'text' },
  ]);

  // (d) The node body's controls are the parameters only: length (a slider) and tone (a select).
  const params = await nodeBody
    .locator('section[data-key]')
    .evaluateAll((sections) =>
      sections.map((section) => ({
        key: section.getAttribute('data-key'),
        control: section.getAttribute('data-control'),
      })),
    );
  expect(params).toEqual([
    { key: 'length', control: 'slider' },
    { key: 'tone', control: 'select' },
  ]);

  // (e) No page error.
  expect(errors).toEqual([]);
});

test('TRG-05 C2: the picker offers person entities only and takes a dropped person chip', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  await setUp(page);
  await page.goto('/tools');
  await page
    .locator('li[data-tool="cold_open"][data-origin="user"] [data-open]')
    .click();

  const formLayout = page.locator('section[aria-label="Form layout"]');
  const personPicker = formLayout.locator('section[data-key="person"] select');
  const entityPicker = formLayout.locator(
    'section[data-key="entityIds"] select',
  );

  // (a) Both pickers offer exactly the person entities: ada and bob. paris (a place) is in neither.
  await expect(personPicker.locator('option[value="ada"]')).toHaveCount(1);
  await expect(entityPicker.locator('option[value="ada"]')).toHaveCount(1);
  expect(await optionValues(personPicker)).toEqual(['ada', 'bob']);
  expect(await optionValues(entityPicker)).toEqual(['ada', 'bob']);

  // (b) A real mouse drag of the ada chip straight onto the person picker sets the person to ada. The target
  // is measured after the drag has started: when a drag starts, CDK runs every picker's enter predicate, and a
  // refusal line written then moves the person select (plan F-E). Measuring before the start misses it.
  const chip = page.locator('[data-chip="ada"]');
  await expect(chip).toBeVisible();
  const from = await centerOf(chip);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 12, { steps: 4 });
  await expect(page.locator('.cdk-drag-preview')).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const target = await centerOf(personPicker);
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();

  await expect(personPicker).toHaveValue('ada');
  await expect(
    page.locator('section[aria-label="Form value"] pre'),
  ).toContainText('"person": "ada"');

  // (c) The drop reached the person picker and no other: the entityIds picker holds no chip.
  await expect(
    formLayout.locator('section[data-key="entityIds"] li.chip'),
  ).toHaveCount(0);

  // (d) No page error.
  expect(errors).toEqual([]);
});
