import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Locator, type Page, test } from '@playwright/test';

// SHL-19's criterion 2 (unit line 22): the e2e phone-viewport check passes. At 390 by 844 the bottom nav
// shows Review, the review opens and Accept writes the proposed text, and the typed text is saved byte
// for byte (the typing leg is OP-2). Plan: plans/SHL-19.md, section 4 (test P).
test.use({ viewport: { width: 390, height: 844 } });

const PROJECT = 'shell-phone';
const CH1_OLD = '# One\n\nFirst draft.\n';
const CH1_NEW = '# One\n\nFirst draft, as the agent proposed.\n';
const CH2 = '# Two\n';

/** Visible, enabled, and fully inside the viewport after it is scrolled into view. */
async function expectReachable(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
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
    origin: { kind: 'agent-run', runId: 'run-phone-check' },
    status: 'pending',
    conflict: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Signs in with the handshake URL the API wrote to the temp library. */
async function signIn(page: Page): Promise<void> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);
}

/** Seeds the project: its drafts first, then one pending change of drafts/ch1.md. */
async function seed(project: string): Promise<void> {
  await mkdir(join(project, 'drafts'), { recursive: true });
  await writeFile(
    join(project, 'project.yaml'),
    'schemaVersion: 1\ntitle: Shell phone\ngenrePack: nonfiction\n',
  );
  await writeFile(join(project, 'drafts', 'ch1.md'), CH1_OLD);
  await writeFile(join(project, 'drafts', 'ch2.md'), CH2);
  await mkdir(join(project, '.scriba', 'pending'), { recursive: true });
  await writeFile(
    join(project, '.scriba', 'pending', '20261114T090000000Z-000001.json'),
    JSON.stringify(
      pendingRecord(
        PROJECT,
        '20261114T090000000Z-000001',
        'drafts/ch1.md',
        CH1_OLD,
        CH1_NEW,
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

test.afterAll(async () => {
  await rm(join(process.env.SCRIBA_E2E_LIBRARY!, PROJECT), {
    recursive: true,
    force: true,
  });
});

test('criterion 2: phone viewport: bottom nav, review and typing', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  const project = join(process.env.SCRIBA_E2E_LIBRARY!, PROJECT);
  await seed(project);
  await signIn(page);
  await activate(page);

  await test.step('review', async () => {
    const bottomNav = page.getByRole('navigation', {
      name: 'Bottom navigation',
      exact: true,
    });
    await expect(bottomNav).toBeVisible();
    const reviewLink = bottomNav.getByRole('link', {
      name: 'Review',
      exact: true,
    });
    await expectReachable(reviewLink);
    await reviewLink.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${PROJECT}/review$`));
    await expect(
      page.getByRole('heading', { name: 'Review', exact: true }),
    ).toBeVisible();

    const row = page.locator('li').filter({
      has: page.locator('code', { hasText: /^drafts\/ch1\.md$/ }),
    });
    await expectReachable(
      row.getByRole('button', { name: 'Open', exact: true }),
    );
    await row.getByRole('button', { name: 'Open', exact: true }).click();
    const accept = row.getByRole('button', { name: 'Accept', exact: true });
    await expectReachable(accept);
    await accept.click();
    await expect(
      page.getByText('No open changes.', { exact: true }),
    ).toBeVisible();

    expect(await readFile(join(project, 'drafts', 'ch1.md'), 'utf8')).toBe(
      CH1_NEW,
    );
    const versions = await readdir(
      join(project, 'drafts', '.versions', 'ch1.md'),
    );
    expect(versions).toHaveLength(1);
    expect(
      await readFile(
        join(project, 'drafts', '.versions', 'ch1.md', versions[0]!),
        'utf8',
      ),
    ).toBe(CH1_OLD);
  });

  await test.step('typing', async () => {
    await page.goto(
      `/core-gate?projectId=${PROJECT}&path=${encodeURIComponent('drafts/ch2.md')}`,
    );
    const group = page.getByRole('group', {
      name: 'Edit or preview',
      exact: true,
    });
    const edit = group.getByRole('button', { name: 'Edit', exact: true });
    await expectReachable(edit);
    await edit.click();
    const source = page.getByRole('textbox', {
      name: 'Markdown source for drafts/ch2.md',
      exact: true,
    });
    await expectReachable(source);
    await source.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('Typed on a phone.');
    // The file on disk holds exactly the typed text (M7: byte-identical to what was typed).
    await expect
      .poll(() => readFile(join(project, 'drafts', 'ch2.md'), 'utf8'), {
        timeout: 10_000,
      })
      .toBe(`${CH2}Typed on a phone.`);
    await expect(
      page.getByText('Saved', { exact: true }).first(),
    ).toBeVisible();
  });

  const documentFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(documentFits).toBe(true);
  expect(errors).toEqual([]);
});
