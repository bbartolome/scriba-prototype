import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// AGL-19 T2 (unit line 22). Plan: plans/AGL-19.md, section 4.3 and section 4.2 (the scripted turns).
// The grounding check of the nonfiction sample's chapter 4 draft, on a fresh copy made by "start from
// sample", against the grounding-claims mock scenario. Named so that it sorts after every other spec
// (plan section 1, D-ORDER): journey.e2e.ts must run first.

const SAMPLE_FOLDER = 'grounding-sample';
const DRAFT = 'drafts/the-plateau-is-not-the-end.md';
const CLAIM_WEAK =
  'A learning plateau can be a stage of reorganising rather than an end.';
const ACTIVE_PATH = '/api/project-store/active';
const APP_DEFAULT_PATH = '/api/providers/app-default';
const CHECK_PATH = '/api/agent-loop/grounding';
const CURRENT_RUN_PATH = '/api/agent-loop/runs/current';
const ORIGIN = 'http://127.0.0.1:8080';

interface AppDefaultReply {
  appDefault: { providerId: string; model: string } | null;
}

interface ActiveReply {
  active: string | null;
}

interface Passage {
  path: string;
  offset: number;
  snippet: string;
}

interface Claim {
  text: string;
  verdict: 'supported' | 'weak' | 'unsupported';
  passage?: Passage;
  reason: string;
}

interface RunState {
  runId: string;
  status: 'running' | 'ended';
  reason?: string;
}

interface GroundingArtefact {
  claims: Claim[];
}

interface MockRecord {
  body: { messages?: Array<{ content?: unknown }> } | null;
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

/** The text of the last message of a recorded request, or '' when it has none. */
function lastMessageText(record: MockRecord): string {
  const messages = record.body?.messages ?? [];
  const content = messages.at(-1)?.content;
  return typeof content === 'string' ? content : '';
}

/** The lines of the judge request that belong to one claim: its Claim line and its Passage lines. */
function judgeBlock(judgeRequest: string, index: number): string[] {
  const lines = judgeRequest.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`Claim ${index}: `));
  if (start === -1) return [];
  const block: string[] = [];
  for (let i = start + 1; i < lines.length && lines[i] !== ''; i++) {
    block.push(lines[i]);
  }
  return block;
}

test('grounding-claims: the draft yields all three verdicts, and each supported or weak verdict cites a retrieved sources passage', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  // Step 1: sign in. Step 2: the project active before this test, restored at its end.
  const library = await signIn(page);
  const activeBefore = (await (
    await page.request.get(ACTIVE_PATH)
  ).json()) as ActiveReply;

  // Step 5 (first half): the app default this run finds, restored at the end.
  const before = await page.request.get(APP_DEFAULT_PATH);
  expect(before.status()).toBe(200);
  const prior = ((await before.json()) as AppDefaultReply).appDefault;
  const mock = process.env.SCRIBA_E2E_MOCK_URL!;

  try {
    // Step 3: a fresh copy of the sample, not activated.
    const started = await page.request.post(
      '/api/project-store/projects/start-from-sample',
      {
        headers: { origin: ORIGIN },
        data: {
          sampleId: 'nonfiction',
          folderName: SAMPLE_FOLDER,
          title: 'Grounding sample',
        },
      },
    );
    expect(started.status()).toBe(201);

    // Step 4: activate the copy.
    const activated = await page.request.post(ACTIVE_PATH, {
      headers: { origin: ORIGIN },
      data: { projectId: SAMPLE_FOLDER },
    });
    expect(activated.status()).toBe(200);
    expect(await activated.json()).toEqual({ active: SAMPLE_FOLDER });

    // Step 5 (second half): a provider at the grounding-claims scenario, made the app default.
    const created = await page.request.post('/api/providers', {
      headers: { origin: ORIGIN },
      data: {
        label: 'Mock grounding',
        kind: 'openai-compatible',
        baseURL: `${mock}/scenario/grounding-claims/v1`,
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

    // Step 5 (cont.): the provider is the app default, so the run never reaches Ollama.
    const defaulted = await page.request.post(APP_DEFAULT_PATH, {
      headers: { origin: ORIGIN },
      data: { providerId: id, model: 'mock-model' },
    });
    expect(defaulted.status()).toBe(200);

    // Step 6: clear the mock's record of this scenario.
    const reset = await page.request.post(
      `${mock}/__mock/scenarios/grounding-claims/reset`,
    );
    expect(reset.status()).toBe(204);

    // Step 7: the check of the draft through the real route; keep the run's id.
    const checked = await page.request.post(CHECK_PATH, {
      headers: { origin: ORIGIN },
      data: { path: DRAFT },
    });
    expect(checked.status()).toBe(200);
    const { runId } = (await checked.json()) as { runId: string };

    // Step 8: wait for this run to end (status "ended", reason "completed"), then read the artefact once.
    let run = null as RunState | null;
    await expect
      .poll(
        async () => {
          const body = (await (
            await page.request.get(CURRENT_RUN_PATH)
          ).json()) as RunState | null;
          run = body !== null && body.runId === runId ? body : null;
          if (run?.status !== 'ended') {
            console.log(`run state: ${JSON.stringify(body)}`);
          }
          return run?.status ?? null;
        },
        { timeout: 15_000 },
      )
      .toBe('ended');
    expect(run!.reason).toBe('completed');
    const artefactPath = join(
      library,
      SAMPLE_FOLDER,
      'logs',
      'grounding',
      `${DRAFT}.json`,
    );
    const artefact = JSON.parse(
      await readFile(artefactPath, 'utf8'),
    ) as GroundingArtefact;

    // Step 9(a): all three verdicts.
    const verdicts = artefact.claims.map((claim) => claim.verdict);
    expect(verdicts).toContain('supported');
    expect(verdicts).toContain('weak');
    expect(verdicts).toContain('unsupported');

    // Step 9(b): each supported or weak claim cites a passage of sources/ that was retrieved for it.
    const records = (await (
      await page.request.get(
        `${mock}/__mock/scenarios/grounding-claims/requests`,
      )
    ).json()) as MockRecord[];
    const judge = records.find((record) =>
      lastMessageText(record).includes('Task: judge claims.'),
    );
    expect(judge, 'the mock recorded the judge request').toBeDefined();
    const judgeRequest = lastMessageText(judge!);

    for (const [index, claim] of artefact.claims.entries()) {
      if (claim.verdict !== 'supported' && claim.verdict !== 'weak') continue;
      const passage = claim.passage;
      const block = judgeBlock(judgeRequest, index);
      const retrieved =
        passage !== undefined &&
        passage.path.startsWith('sources/') &&
        block.some((line) =>
          line.startsWith(`Passage ${passage.path} at ${passage.offset}: `),
        );
      if (!retrieved) {
        console.log(
          `claim ${index} (${claim.verdict}) has no retrieved sources passage. Its judge block:\n${block.join('\n')}`,
        );
      }
      expect(
        retrieved,
        `claim ${index} cites a retrieved sources passage`,
      ).toBe(true);
    }

    // Step 9(c): the weak claim is the status GNP-11 gave its entity.
    const weak = artefact.claims.find((claim) => claim.text === CLAIM_WEAK);
    expect(weak?.verdict).toBe('weak');

    expect(errors).toEqual([]);
  } finally {
    // Step 10: restore the prior app default, and the prior active project when there was one.
    if (prior !== null) {
      const restored = await page.request.post(APP_DEFAULT_PATH, {
        headers: { origin: ORIGIN },
        data: { providerId: prior.providerId, model: prior.model },
      });
      expect(restored.status()).toBe(200);
    }
    if (activeBefore.active !== null) {
      const reactivated = await page.request.post(ACTIVE_PATH, {
        headers: { origin: ORIGIN },
        data: { projectId: activeBefore.active },
      });
      expect(reactivated.status()).toBe(200);
    }
  }
});
