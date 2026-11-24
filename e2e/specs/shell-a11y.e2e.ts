import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

// SHL-19's criterion 1 (unit line 21): an automated accessibility check of the Shell (nav, landing,
// notices, editor, diff, card) reports no serious violation in either theme. Plan: SHL-19 plan,
// section 4 (test A, steps A1 to A6), and the extra focus test F1 (U17, D16).

const PROJECT = 'shell-a11y';
const DESKTOP = { width: 1280, height: 800 };
const TABLET = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };
const ORIGIN = 'http://127.0.0.1:8080';
const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/** Visible, enabled, and fully inside the viewport after it is scrolled into view. */
async function expectReachable(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

/** Signs in with the handshake URL the API wrote to the temp library. */
async function signIn(page: Page): Promise<void> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);
}

/** The content hash of a file's bytes, as the contract writes it: sha256: and lowercase hex. */
function hashOf(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

/** A pending change of one draft: a valid pendingChangeSchema record, open, with no conflict. */
function pendingRecord(
  projectId: string,
  id: string,
  path: string,
  base: string,
  proposed: string,
): Record<string, unknown> {
  const now = '2026-11-14T09:00:00Z';
  return {
    id,
    projectId,
    targetPath: path,
    kind: 'modify',
    diff: '',
    capturedBase: { hash: hashOf(base), content: base },
    proposed,
    origin: { kind: 'agent-run', runId: 'run-a11y' },
    status: 'pending',
    conflict: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Seeds the project: its files and one pending change of drafts/ch1.md. Drafts come before the pending file. */
async function seed(project: string): Promise<void> {
  await mkdir(join(project, 'drafts'), { recursive: true });
  await mkdir(join(project, 'sources'), { recursive: true });
  await writeFile(
    join(project, 'project.yaml'),
    'schemaVersion: 1\ntitle: Shell a11y\ngenrePack: nonfiction\n',
  );
  await writeFile(join(project, 'drafts', 'ch1.md'), '# One\n\nFirst draft.\n');
  await writeFile(join(project, 'drafts', 'ch2.md'), '# Two\n');
  await writeFile(
    join(project, 'sources', 'outline.md'),
    '# Outline\n\n- One\n- Two\n',
  );
  await mkdir(join(project, '.scriba', 'pending'), { recursive: true });
  await writeFile(
    join(project, '.scriba', 'pending', '20261114T090000000Z-000001.json'),
    JSON.stringify(
      pendingRecord(
        PROJECT,
        '20261114T090000000Z-000001',
        'drafts/ch1.md',
        '# One\n\nFirst draft.\n',
        '# One\n\nFirst draft, as the agent proposed.\n',
      ),
    ),
  );
}

/** Makes the project active, as its row's Switch button does. */
async function activate(page: Page): Promise<void> {
  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();
  const row = page.locator('li').filter({
    has: page.locator('code', { hasText: new RegExp(`^${PROJECT}$`) }),
  });
  const switchButton = row.getByRole('button', {
    name: 'Switch',
    exact: true,
  });
  // The row loads with the list; the active project shows "Active" and no Switch button.
  await expect(row).toBeVisible();
  if ((await switchButton.count()) === 0) return;
  await expectReachable(switchButton);
  await switchButton.click();
  await expect(page).toHaveURL(new RegExp(`/projects/${PROJECT}/chat$`));
}

/** Sets the theme the service reads at load (device-local, theme.ts). */
async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((value) => {
    localStorage.setItem('scriba.theme', value);
  }, theme);
}

/**
 * Scans the given Shell hosts with axe and asserts that no serious or critical violation remains.
 * Other impacts are printed, not asserted.
 */
async function scan(
  page: Page,
  label: string,
  include: string[],
  exclude?: string,
): Promise<void> {
  let builder = new AxeBuilder({ page });
  for (const selector of include) builder = builder.include(selector);
  if (exclude) builder = builder.exclude(exclude);
  const results = await builder.analyze();
  const describe = (v: (typeof results.violations)[number]) =>
    `${v.id} [${v.impact}] ${v.nodes
      .slice(0, 3)
      .map((n) => JSON.stringify(n.target))
      .join(' ')}`;
  for (const v of results.violations) {
    if (v.impact !== 'serious' && v.impact !== 'critical') {
      console.log(`${label}: not blocking: ${describe(v)}`);
    }
  }
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    blocking.map(describe),
    `${label}: serious or critical axe violations`,
  ).toEqual([]);
}

/** The row of the review queue that holds a change of the given path. */
function reviewRow(page: Page, path: string): Locator {
  return page.locator('li').filter({
    has: page.locator('code', { hasText: new RegExp(`^${path}$`) }),
  });
}

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  await rm(join(process.env.SCRIBA_E2E_LIBRARY!, PROJECT), {
    recursive: true,
    force: true,
  });
});

test('criterion 1: axe finds no serious violation in the Shell, in light and dark', async ({
  page,
}) => {
  test.setTimeout(360_000);
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  const project = join(process.env.SCRIBA_E2E_LIBRARY!, PROJECT);
  await seed(project);
  await signIn(page);
  await activate(page);

  // A6 needs a provider and a run before its themes; set them up once, as the journey spec does.
  await test.step('card set-up', async () => {
    const mock = process.env.SCRIBA_E2E_MOCK_URL!;
    const created = await page.request.post('/api/providers', {
      headers: { origin: ORIGIN },
      data: {
        label: 'Shell a11y mock',
        kind: 'openai-compatible',
        baseURL: `${mock}/scenario/summarize-outline/v1`,
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
    // The project model, not the app default: other specs read the app default.
    const chosen = await page.request.post('/api/providers/project-model', {
      headers: { origin: ORIGIN },
      data: { providerId: id, model: 'mock-model' },
    });
    expect(chosen.status()).toBe(200);

    await page.goto(`/projects/${PROJECT}/chat`);
    await page
      .getByRole('textbox', { name: 'Intent', exact: true })
      .fill('summarize my outline');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(
      page.getByRole('article', { name: 'Tool call: list_files', exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });

  await test.step('A1 nav', async () => {
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await page.setViewportSize(DESKTOP);
      await page.goto(`/projects/${PROJECT}/chat`);
      await expect(
        page.getByRole('navigation', { name: 'Side navigation', exact: true }),
      ).toBeVisible();
      await scan(
        page,
        `nav ${theme} desktop`,
        ['mat-toolbar', 'app-nav'],
        'app-active-project-nav',
      );

      await page.setViewportSize(TABLET);
      await expect(
        page.getByRole('navigation', { name: 'Navigation rail', exact: true }),
      ).toBeVisible();
      await scan(
        page,
        `nav ${theme} tablet`,
        ['mat-toolbar', 'app-nav'],
        'app-active-project-nav',
      );

      await page.setViewportSize(PHONE);
      await expect(
        page.getByRole('navigation', {
          name: 'Bottom navigation',
          exact: true,
        }),
      ).toBeVisible();
      await scan(
        page,
        `nav ${theme} phone`,
        ['mat-toolbar', 'app-nav'],
        'app-active-project-nav',
      );
      await page.setViewportSize(DESKTOP);
    }
  });

  await test.step('A2 landing', async () => {
    for (const theme of THEMES) {
      await setTheme(page, theme);
      // A second page of the same context keeps the landing page at `/`: its active-project GET is held.
      const held = await page.context().newPage();
      await held.route('**/api/project-store/active', (route) => {
        if (route.request().method() === 'GET') return;
        return route.continue();
      });
      await held.goto('/');
      await expect(
        held
          .locator('app-landing')
          .getByText('Platform version:', { exact: false }),
      ).toBeVisible();
      await expect(held).toHaveURL(`${ORIGIN}/`);
      await scan(held, `landing ${theme}`, ['app-landing']);
      await held.close();
    }
  });

  await test.step('A3 notices', async () => {
    for (const theme of THEMES) {
      await setTheme(page, theme);
      // (a) the server is unreachable: the events stream and the health probe are aborted.
      const offline = await page.context().newPage();
      await offline.route('**/events', (route) => route.abort());
      await offline.route('**/healthz', (route) => route.abort());
      await offline.goto('/core-gate');
      await expect(
        offline.getByText('Server unreachable', { exact: false }).first(),
      ).toBeVisible();
      await scan(offline, `notices ${theme} unreachable`, [
        'app-notice-banners',
        'app-connection-status',
      ]);
      await offline.close();

      // (b) the device-class banner: a tablet-gated canvas route opened at a phone size.
      await page.setViewportSize(DESKTOP);
      await page.goto(`/projects/${PROJECT}/graphs/graph-a11y`);
      // The canvas is mounted at the desktop size before the viewport shrinks.
      await expect(page.locator('app-canvas-page')).toBeAttached();
      await page.setViewportSize(PHONE);
      await expect(
        page
          .getByText('This view needs a larger screen', { exact: false })
          .first(),
      ).toBeVisible();
      await scan(page, `notices ${theme} device class`, ['app-notice-banners']);
      await page.setViewportSize(DESKTOP);
    }
  });

  await test.step('A4 editor', async () => {
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await page.setViewportSize(DESKTOP);
      await page.goto(
        `/core-gate?projectId=${PROJECT}&path=${encodeURIComponent('drafts/ch1.md')}`,
      );
      await expect(
        page.getByRole('textbox', {
          name: 'Markdown source for drafts/ch1.md',
          exact: true,
        }),
      ).toBeVisible();
      await scan(page, `editor ${theme} desktop`, ['app-editor-layout']);

      await page.setViewportSize(PHONE);
      await expect(
        page.getByRole('group', { name: 'Edit or preview', exact: true }),
      ).toBeVisible();
      await scan(page, `editor ${theme} phone`, ['app-editor-layout']);
      await page.setViewportSize(DESKTOP);
    }
  });

  await test.step('A5 diff', async () => {
    // (a) the review diff, editable. The pending change is still open for both themes.
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await page.setViewportSize(DESKTOP);
      await page.goto(`/projects/${PROJECT}/review`);
      await reviewRow(page, 'drafts/ch1.md')
        .getByRole('button', { name: 'Open', exact: true })
        .click();
      await expect(
        page.getByRole('region', {
          name: 'Changes to drafts/ch1.md',
          exact: true,
        }),
      ).toBeVisible();
      await scan(page, `diff ${theme} review`, ['app-diff-view']);
    }
    // Accept once, so that the draft has a version for (b).
    await page.goto(`/projects/${PROJECT}/review`);
    const accept = reviewRow(page, 'drafts/ch1.md').getByRole('button', {
      name: 'Accept',
      exact: true,
    });
    await reviewRow(page, 'drafts/ch1.md')
      .getByRole('button', { name: 'Open', exact: true })
      .click();
    await expectReachable(accept);
    await accept.click();
    await expect
      .poll(async () =>
        readdir(join(project, 'drafts', '.versions', 'ch1.md')).then(
          (names) => names.length,
          () => 0,
        ),
      )
      .toBe(1);

    // (b) the version-history diff, read-only, on the Files page.
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await page.goto(
        `/projects/${PROJECT}/files?path=${encodeURIComponent('drafts/ch1.md')}`,
      );
      await page
        .getByRole('list', { name: 'Versions', exact: true })
        .getByRole('button')
        .first()
        .click();
      await expect(
        page.getByRole('region', {
          name: 'Changes to drafts/ch1.md',
          exact: true,
        }),
      ).toBeVisible();
      await scan(page, `diff ${theme} version history`, ['app-diff-view']);
    }
  });

  await test.step('A6 card', async () => {
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await page.setViewportSize(DESKTOP);
      await page.goto(`/projects/${PROJECT}/chat`);
      await expect(
        page.getByRole('article', {
          name: 'Tool call: list_files',
          exact: true,
        }),
      ).toBeVisible();
      await scan(page, `card ${theme}`, ['app-tool-call-card']);
    }
  });

  expect(errors).toEqual([]);
});

test('focus order: side nav', async ({ page }) => {
  await signIn(page);
  await seed(join(process.env.SCRIBA_E2E_LIBRARY!, PROJECT));
  await activate(page);
  await setTheme(page, 'light');
  await page.setViewportSize(DESKTOP);
  await page.goto(`/projects/${PROJECT}/chat`);

  const links = page
    .getByRole('navigation', { name: 'Side navigation', exact: true })
    .getByRole('link');
  const count = await links.count();
  expect(count).toBeGreaterThan(1);

  const isFocused = (locator: Locator) =>
    locator.evaluate((element) => element === document.activeElement);

  // Tab until the first link of the side nav has focus.
  let reached = false;
  for (let i = 0; i < 40 && !reached; i += 1) {
    await page.keyboard.press('Tab');
    reached = await isFocused(links.nth(0));
  }
  expect(reached, 'the first side nav link is reached by Tab').toBe(true);

  // Each next link follows in DOM order.
  for (let i = 1; i < count; i += 1) {
    await page.keyboard.press('Tab');
    await expect(links.nth(i)).toBeFocused();
  }
});
