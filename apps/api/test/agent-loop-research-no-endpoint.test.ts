import { expect, it } from 'vitest';
import { AGENT_SETTINGS_ROUTE } from '@bbartolome/scriba-contracts/agent-loop';
import {
  observe,
  openHarness,
  post,
  readUntilEnded,
  requestsOf,
  startRun,
  type ChatBody,
  type Harness,
} from './agent-loop-transcript.kit';
import type { Observer } from './invariant-sweep';

// AGL-26: with research on and no search endpoint, only fetch_page is offered. The research names are the reserved names of the research family (AGL-21, AGL-22).

const RESEARCH_NAMES = ['web_search', 'fetch_page'];

// The stream of agent-loop events for the duration of the body.
async function withStream<T>(
  h: Harness,
  body: (stream: Observer) => Promise<T>,
): Promise<T> {
  const stream = await observe(h);
  try {
    return await body(stream);
  } finally {
    await stream.close();
  }
}

async function enableResearch(h: Harness): Promise<void> {
  const reply = await post(h, AGENT_SETTINGS_ROUTE, {
    research: { enabled: true },
  });
  expect(reply.status).toBe(200);
}

// The tool names offered in one chat request, sorted.
function toolNamesOf(body: ChatBody): string[] {
  return (body.tools ?? []).map((tool) => tool.function.name).sort();
}

it('AC1: With research on and no endpoint, only `fetch_page` is offered.', async () => {
  const h = await openHarness({
    scenario: 'agl26-ac1',
    steps: [
      {
        match: { endpoint: 'chat' },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
  });
  try {
    await withStream(h, async (stream) => {
      await enableResearch(h);
      await startRun(h, { intent: 'AGL-26 research on, no endpoint' });
      await readUntilEnded(stream);
    });
    const [first] = await requestsOf(h);
    const offered = toolNamesOf(first as ChatBody).filter((name) =>
      RESEARCH_NAMES.includes(name),
    );
    expect(offered).toEqual(['fetch_page']);
  } finally {
    await h.close();
  }
});
