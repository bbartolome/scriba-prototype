import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Request } from '@playwright/test';

// Counts the word-like segments of a text, as the module's word count does for these files.
function wordsOf(text: string): number {
  let count = 0;
  for (const segment of new Intl.Segmenter('en', {
    granularity: 'word',
  }).segment(text)) {
    if (segment.isWordLike) count += 1;
  }
  return count;
}

test('journey: setup, project from sample, agent run, accept change, manuscript', async ({
  page,
}, testInfo) => {
  await test.step('app loads', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Scriba' })).toBeVisible();
    expect(errors).toEqual([]);
    // Records the browser build in the run report (criterion 2, C2d).
    testInfo.annotations.push({
      type: 'browser',
      description: page.context().browser()!.version(),
    });
    // The API boot writes .scriba/settings.yaml into the library the harness set (SCRIBA_E2E_LIBRARY).
    expect(
      existsSync(
        join(process.env.SCRIBA_E2E_LIBRARY!, '.scriba', 'settings.yaml'),
      ),
    ).toBe(true);
  });

  // Owner: Setup & auth, M1 (SAU-08) and M2 (SAU-16). Reads setup-url from SCRIBA_E2E_LIBRARY. This step is live.
  await test.step('setup', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    // The handshake URL the API wrote to the temp library. The browser opens it, as the product does.
    const setupUrl = (
      await readFile(
        join(process.env.SCRIBA_E2E_LIBRARY!, '.scriba', 'setup-url'),
        'utf8',
      )
    ).trim();
    await page.goto(setupUrl);
    // The 303 ends on /setup, and the address bar holds no token.
    expect(page.url()).toBe(new URL('/setup', setupUrl).href);
    await expect(
      page.getByText('Signed in from this computer (loopback).'),
    ).toBeVisible();
    // The cookie from the handshake keeps the session across a reload.
    await page.reload();
    await expect(
      page.getByText('Signed in from this computer (loopback).'),
    ).toBeVisible();
    // The harness sets no SCRIBA_COMPOSE_VERSION, so the compose state is unknown and the one-liner shows.
    await expect(
      page.getByText('does not report its compose version'),
    ).toBeVisible();
    await expect(
      page.locator('code', {
        hasText: 'docker run --rm -e SETUP=true bbartolome/scriba | bash',
      }),
    ).toBeVisible();
    // A fresh library: four steps pending, not complete.
    const fresh = (await (
      await page.request.get('/api/setup-auth/status')
    ).json()) as { steps: Record<string, string>; complete: boolean };
    expect(fresh.steps).toMatchObject({
      tailscale: 'pending',
      providers: 'pending',
      preferences: 'pending',
      firstProject: 'pending',
    });
    expect(fresh.complete).toBe(false);
    // The walk through the five steps: Next, Next, Skip, Skip, Skip.
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Tailscale is unavailable.')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(
      page.locator('app-setup-page app-providers-panel'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page.getByText('Model providers: skipped')).toBeVisible();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page.getByText('Preferences: skipped')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start from sample', exact: true }),
    ).toBeVisible();
    // Skip on the last step writes its state and finishes setup. Skip the rest is no longer clicked.
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page).toHaveURL(/\/projects(\/|$)/);
    const skipped = (await (
      await page.request.get('/api/setup-auth/status')
    ).json()) as { steps: Record<string, string>; complete: boolean };
    expect(skipped.steps).toMatchObject({
      providers: 'skipped',
      preferences: 'skipped',
      firstProject: 'skipped',
    });
    expect(skipped.complete).toBe(true);
    // The landing reads complete and leaves /setup.
    await expect(page).toHaveURL(/\/projects(\/|$)/);
    const status = await page.request.get('/api/setup-auth/status');
    expect(status.status()).toBe(200);
    expect(((await status.json()) as { complete: unknown }).complete).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });

  // Owner: Setup & auth, M2 (SAU-16). The first-project step of /setup creates the project from the nonfiction sample.
  await test.step('project from sample', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    const next = page.getByRole('button', { name: 'Next', exact: true });
    // First visit: Next three times reaches Preferences, which saves Ada and fiction.
    await page.goto('/setup');
    for (let step = 0; step < 3; step += 1) {
      await next.click();
    }
    await page
      .getByRole('textbox', { name: 'Author name', exact: true })
      .fill('Ada');
    await page
      .getByLabel('Default genre pack', { exact: true })
      .fill('fiction');
    await page
      .getByRole('button', { name: 'Save preferences', exact: true })
      .click();
    await expect(page.getByText('Preferences: done')).toBeVisible();
    await next.click();
    // The first-project step: the nonfiction sample, a title and a folder, then Start from sample.
    await page
      .getByRole('combobox', { name: 'Sample', exact: true })
      .selectOption('nonfiction');
    await page.locator('input[name="sampleTitle"]').fill('Demo book');
    await page.getByLabel('Folder name', { exact: true }).fill('demo-book');
    await page
      .getByRole('button', { name: 'Start from sample', exact: true })
      .click();
    await expect(page.getByText('Demo book: ok (active)')).toBeVisible();
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
    // The new project is active, and the page lands in it.
    await expect(page).toHaveURL(/\/projects\/demo-book\/chat$/);
    const project = join(process.env.SCRIBA_E2E_LIBRARY!, 'demo-book');
    const yaml = await readFile(join(project, 'project.yaml'), 'utf8');
    expect(yaml).toMatch(/^title: Demo book$/m);
    expect(existsSync(join(project, 'sources', 'outline.md'))).toBe(true);
    expect(existsSync(join(project, 'structure'))).toBe(false);
    expect(await readFile(join(project, '.gitignore'), 'utf8')).toContain(
      '.scriba/',
    );
    const done = (await (
      await page.request.get('/api/setup-auth/status')
    ).json()) as { steps: Record<string, string>; complete: boolean };
    expect(done.steps.firstProject).toBe('done');
    expect(done.complete).toBe(true);

    // The settings page shows the same compose warning and one-liner as /setup.
    await page.goto('/settings');
    await expect(
      page.getByText('does not report its compose version'),
    ).toBeVisible();
    await expect(
      page.locator('code', {
        hasText: 'docker run --rm -e SETUP=true bbartolome/scriba | bash',
      }),
    ).toBeVisible();

    // Re-run visit: the saved values are shown, and the first-project step lists and creates nothing.
    const writes: string[] = [];
    const onRequest = (request: Request): void => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname.startsWith('/api/project-store/')
      ) {
        writes.push(request.url());
      }
    };
    page.on('request', onRequest);
    await page.goto('/setup');
    await expect(page.getByText('Access: done')).toBeVisible();
    await expect(page.getByText('Tailscale: skipped')).toBeVisible();
    await expect(page.getByText('Model providers: skipped')).toBeVisible();
    await expect(page.getByText('Preferences: done')).toBeVisible();
    await expect(page.getByText('First project: done')).toBeVisible();
    for (let step = 0; step < 3; step += 1) {
      await next.click();
    }
    await expect(
      page.getByRole('textbox', { name: 'Author name', exact: true }),
    ).toHaveValue('Ada');
    await expect(
      page.getByLabel('Default genre pack', { exact: true }),
    ).toHaveValue('fiction');
    await next.click();
    await expect(page.getByText('Demo book: ok (active)')).toBeVisible();
    page.off('request', onRequest);
    expect(writes).toEqual([]);
    const entries = (await readdir(process.env.SCRIBA_E2E_LIBRARY!)).filter(
      (name) => !name.startsWith('.'),
    );
    expect(entries).toEqual(['demo-book']);
    await page.goto('/projects/demo-book/chat');
    expect(errors).toEqual([]);
  });

  // Owner: Agent loop, M1 (AGL-08). Configures a provider at SCRIBA_E2E_MOCK_URL through the API.
  await test.step('agent run', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    const mock = process.env.SCRIBA_E2E_MOCK_URL!;
    const origin = 'http://127.0.0.1:8080';
    // A provider at the summarize-outline scenario, made the app default, so the run never reaches Ollama.
    const created = await page.request.post('/api/providers', {
      headers: { origin },
      data: {
        label: 'Mock',
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
    const defaulted = await page.request.post('/api/providers/app-default', {
      headers: { origin },
      data: { providerId: id, model: 'mock-model' },
    });
    expect(defaulted.status()).toBe(200);

    await page
      .getByRole('textbox', { name: 'Intent', exact: true })
      .fill('summarize my outline');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(
      page.getByRole('article', { name: 'Tool call: list_files', exact: true }),
    ).toContainText('Listed the project root.', { timeout: 15_000 });
    await expect(
      page.getByRole('article', { name: 'Tool call: read_file', exact: true }),
    ).toContainText('Read sources/outline.md.', { timeout: 15_000 });
    await expect(
      page.getByRole('region', { name: 'Messages', exact: true }),
    ).toContainText('The outline has six chapters', { timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toHaveCount(0, { timeout: 15_000 });

    // The three requests of the run, in order, and the third one carries the outline the model read.
    const requests = await fetch(
      `${mock}/__mock/scenarios/summarize-outline/requests`,
    );
    const records = (await requests.json()) as {
      step: number | null;
      body: unknown;
    }[];
    expect(records.map((record) => record.step)).toEqual([0, 1, 2]);
    expect(JSON.stringify(records[2].body)).toContain(
      'Chapter 6: Practice for the Rest of Us',
    );

    // The run wrote one transcript into the project's logs. Its closing line may follow the end event, so only the name is checked.
    const transcripts = join(
      process.env.SCRIBA_E2E_LIBRARY!,
      'demo-book',
      'logs',
      'agent-runs',
    );
    await expect
      .poll(() => readdir(transcripts).catch(() => []), { timeout: 15_000 })
      .toEqual([expect.stringMatching(/^\d{8}T\d{6}Z-.+\.jsonl$/)]);
    expect(errors).toEqual([]);
  });

  // Owner: Project store review, M3 (PST-22; AGL-15).
  await test.step('accept change', async () => {
    testInfo.setTimeout(testInfo.timeout + 30_000);
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    const mock = process.env.SCRIBA_E2E_MOCK_URL!;
    const origin = 'http://127.0.0.1:8080';
    const library = process.env.SCRIBA_E2E_LIBRARY!;
    const draft = join(library, 'demo-book', 'drafts', 'born-to-it.md');
    const versions = join(
      library,
      'demo-book',
      'drafts',
      '.versions',
      'born-to-it.md',
    );
    const pendingUrl = '/api/project-store/projects/demo-book/pending';

    // The chapter as it is before the agent's edit.
    const before = await readFile(draft, 'utf8');

    // A second provider, at the edit-chapter-one scenario, made the app default.
    const created = await page.request.post('/api/providers', {
      headers: { origin },
      data: {
        label: 'Mock edit',
        kind: 'openai-compatible',
        baseURL: `${mock}/scenario/edit-chapter-one/v1`,
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
    const defaulted = await page.request.post('/api/providers/app-default', {
      headers: { origin },
      data: { providerId: id, model: 'mock-model' },
    });
    expect(defaulted.status()).toBe(200);

    // The second run continues the chat's conversation (the agent-run step's run is replayed before it).
    await page
      .getByRole('textbox', { name: 'Intent', exact: true })
      .fill('tighten chapter 1');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Messages', exact: true }),
    ).toContainText('I tightened the last sentence of chapter 1.', {
      timeout: 15_000,
    });
    // The run ends after its grounding extract, so no Stop button means the change is filed.
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toHaveCount(0, { timeout: 15_000 });

    // One open change, for the chapter, from the agent run. Nothing is written yet.
    await expect
      .poll(
        async () => {
          const reply = await page.request.get(pendingUrl);
          const body = (await reply.json()) as { changes: unknown[] };
          return body.changes.length;
        },
        { timeout: 15_000 },
      )
      .toBe(1);
    const listed = await page.request.get(pendingUrl);
    const { changes } = (await listed.json()) as {
      changes: {
        proposed: string;
        targetPath: string;
        status: string;
        conflict: unknown;
        origin: { kind: string };
      }[];
    };
    const [change] = changes;
    expect(change?.targetPath).toBe('drafts/born-to-it.md');
    expect(change?.status).toBe('pending');
    expect(change?.conflict).toBeNull();
    expect(change?.origin.kind).toBe('agent-run');
    expect(await readFile(draft, 'utf8')).toBe(before);

    // The intent, the tool result and the grounding extract, in that order (the requests of this run).
    const requests = await fetch(
      `${mock}/__mock/scenarios/edit-chapter-one/requests`,
    );
    const records = (await requests.json()) as {
      endpoint: string;
      step: number | null;
    }[];
    expect(
      records
        .filter((record) => record.endpoint === 'chat')
        .map((record) => record.step),
    ).toEqual([1, 2, 0]);

    // Accept in the review queue, on the desktop layout.
    await page.goto('/projects/demo-book/review');
    await expect(
      page.getByRole('heading', { name: 'Review', exact: true }),
    ).toBeVisible();
    const row = page.locator('li').filter({
      has: page.locator('code', { hasText: /^drafts\/born-to-it\.md$/ }),
    });
    await row.getByRole('button', { name: 'Open', exact: true }).click();
    await row.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(
      page.getByText('No open changes.', { exact: true }),
    ).toBeVisible();

    // The file is the proposed text, and the version holds the text before the edit.
    const after = await readFile(draft, 'utf8');
    expect(after).toBe(change?.proposed);
    expect(after).toContain('This chapter sets up the harder question.');
    expect(after).not.toContain(
      'The rest of this chapter sets up the harder question.',
    );
    const versionFiles = await readdir(versions);
    expect(versionFiles).toHaveLength(1);
    expect(versionFiles[0]).toMatch(/^\d{8}T\d{9}Z\.md$/);
    expect(await readFile(join(versions, versionFiles[0]!), 'utf8')).toBe(
      before,
    );
    expect(errors).toEqual([]);
  });

  // Owner: Compile & export, M5 (CEX-20). No export step in the e2e.
  await test.step('manuscript', async () => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    const project = join(process.env.SCRIBA_E2E_LIBRARY!, 'demo-book');
    // The authored order, from the library copy: four entries, and not alphabetical.
    const yaml = await readFile(join(project, 'project.yaml'), 'utf8');
    const authored = [...yaml.matchAll(/^\s+- path: (\S+)$/gm)].map(
      (match) => match[1]!,
    );
    expect(authored).toHaveLength(4);
    expect(authored).not.toEqual([...authored].sort());
    // The chapter before and after the accepted edit.
    const versionDir = join(project, 'drafts', '.versions', 'born-to-it.md');
    const [version] = await readdir(versionDir);
    const before = await readFile(join(versionDir, version!), 'utf8');
    const after = await readFile(
      join(project, 'drafts', 'born-to-it.md'),
      'utf8',
    );
    // The counter matches the module only when none of these constructs is present.
    expect(before + after).not.toMatch(
      /^---|<!--|\x60\x60\x60|~~~|\]\(|https?:\/\/|www\./m,
    );

    await page.goto('/projects/demo-book/manuscript');
    await expect(
      page.getByRole('heading', { name: 'Manuscript', exact: true }),
    ).toBeVisible();
    // The body rows are the authored list, in its order.
    await expect
      .poll(
        () =>
          page
            .locator('ul[data-part="body"] > li')
            .evaluateAll((rows) =>
              rows.map((row) => row.getAttribute('data-path')),
            ),
        { timeout: 15_000 },
      )
      .toEqual(authored);
    // The shown count is the count of the current file, and the edit changed it.
    const expected = wordsOf(after);
    expect(wordsOf(before)).not.toBe(expected);
    await expect(
      page
        .locator('li[data-path="drafts/born-to-it.md"]')
        .getByText(expected + ' words', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
  });
});
