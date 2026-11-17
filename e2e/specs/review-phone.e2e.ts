import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Locator, type Page, test } from '@playwright/test';

// PST-20's criterion 2 (unit line 24): at 390 by 844, the review queue lists the open changes, shows a
// diff, and accepts and rejects a change, with no sideways scroll. Plan: plans/PST-20.md, section 4 (E1).
test.use({ viewport: { width: 390, height: 844 } });

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
  id: string,
  path: string,
  base: string,
  proposed: string,
): Record<string, unknown> {
  const now = '2026-11-14T09:00:00Z';
  return {
    id,
    projectId: 'phone-review',
    targetPath: path,
    kind: 'modify',
    diff: '',
    capturedBase: { hash: hashOf(base), content: base },
    proposed,
    origin: { kind: 'agent-run', runId: 'run-phone' },
    status: 'pending',
    conflict: null,
    createdAt: now,
    updatedAt: now,
  };
}

test('the review queue fits 390 by 844: list, diff, accept and reject work', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  // Signs in as projects-phone.e2e.ts does: the handshake URL the API wrote to the temp library.
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  // Its own project. The drafts are written before the pending files, so a watcher recheck sees
  // matching hashes (the pending store reads .scriba/pending/*.json on each call, with no cache).
  const project = join(library, 'phone-review');
  const ch1Old = 'Chapter one, as first drafted.\n';
  const ch1New = 'Chapter one, as the agent proposed.\n';
  const ch2Old = 'Chapter two, left as it is.\n';
  const ch2New = 'Chapter two, which the author rejects.\n';
  await mkdir(join(project, 'drafts'), { recursive: true });
  await writeFile(
    join(project, 'project.yaml'),
    'schemaVersion: 1\ntitle: Phone review\ngenrePack: nonfiction\n',
  );
  await writeFile(join(project, 'drafts', 'ch1.md'), ch1Old);
  await writeFile(join(project, 'drafts', 'ch2.md'), ch2Old);
  await mkdir(join(project, '.scriba', 'pending'), { recursive: true });
  await writeFile(
    join(project, '.scriba', 'pending', '20261114T090000000Z-000001.json'),
    JSON.stringify(
      pendingRecord(
        '20261114T090000000Z-000001',
        'drafts/ch1.md',
        ch1Old,
        ch1New,
      ),
    ),
  );
  await writeFile(
    join(project, '.scriba', 'pending', '20261114T090000000Z-000002.json'),
    JSON.stringify(
      pendingRecord(
        '20261114T090000000Z-000002',
        'drafts/ch2.md',
        ch2Old,
        ch2New,
      ),
    ),
  );

  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();

  // Makes the project active, as its row's Switch button does.
  const projectRow = page.locator('li').filter({
    has: page.locator('code', { hasText: /^phone-review$/ }),
  });
  const switchButton = projectRow.getByRole('button', {
    name: 'Switch',
    exact: true,
  });
  await expectReachable(switchButton);
  await switchButton.click();
  await expect(page).toHaveURL(/\/projects\/phone-review\/chat$/);

  // The nav item of the bottom bar opens the queue.
  const reviewLink = page
    .getByRole('navigation', { name: 'Bottom navigation' })
    .getByRole('link', { name: 'Review', exact: true });
  await expectReachable(reviewLink);
  await reviewLink.click();
  await expect(page).toHaveURL(/\/projects\/phone-review\/review$/);
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeVisible();

  // The list items that hold a change: each has the change's path in a code element.
  const changeRows = (page: Page): Locator =>
    page.locator('li').filter({ has: page.locator('code') });

  const row = (path: string): Locator =>
    page.locator('li').filter({
      has: page.locator('code', { hasText: new RegExp(`^${path}$`) }),
    });
  await expect(changeRows(page)).toHaveCount(2);

  // Accept: the open change shows its diff in a unified layout on the phone.
  await expectReachable(
    row('drafts/ch1.md').getByRole('button', { name: 'Open', exact: true }),
  );
  await row('drafts/ch1.md')
    .getByRole('button', { name: 'Open', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Changes to drafts/ch1.md', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('radio', { name: 'Unified', exact: true }),
  ).toBeChecked();

  const accept = row('drafts/ch1.md').getByRole('button', {
    name: 'Accept',
    exact: true,
  });
  await expectReachable(accept);
  await accept.click();
  await expect(changeRows(page)).toHaveCount(1);
  expect(await readFile(join(project, 'drafts', 'ch1.md'), 'utf8')).toBe(
    ch1New,
  );
  // The replaced text is kept as a version of the draft.
  const versions = await readdir(
    join(project, 'drafts', '.versions', 'ch1.md'),
  );
  expect(versions).toHaveLength(1);
  expect(
    await readFile(
      join(project, 'drafts', '.versions', 'ch1.md', versions[0]!),
      'utf8',
    ),
  ).toBe(ch1Old);

  // Reject: the change is dropped and the draft stays as it was.
  await row('drafts/ch2.md')
    .getByRole('button', { name: 'Open', exact: true })
    .click();
  const reject = row('drafts/ch2.md').getByRole('button', {
    name: 'Reject',
    exact: true,
  });
  await expectReachable(reject);
  await reject.click();
  await expect(changeRows(page)).toHaveCount(0);
  expect(await readFile(join(project, 'drafts', 'ch2.md'), 'utf8')).toBe(
    ch2Old,
  );
  await expect(
    page.getByText('No open changes.', { exact: true }),
  ).toBeVisible();

  const documentFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(documentFits).toBe(true);
  expect(errors).toEqual([]);
});
