import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  AGENT_TRANSCRIPT_KINDS,
  AGENT_TRANSCRIPT_PATH_PATTERN,
  transcriptEntrySchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import { SecretsStore } from '../src/modules/providers/secrets/secrets-store';
import type { ScribaEnv } from '../src/modules/platform/platform.module';
import {
  LONG_SOURCE_LENGTH,
  observe,
  openHarness,
  readUntilEnded,
  startRun,
  transcriptFolder,
  writeLongSource,
  listThenReadSteps,
} from './agent-loop-transcript.kit';

// The transcript files of a run in the fixture's logs folder: the names that match the path rule and end with the run id.
function transcriptFilesOf(folder: string, runId: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter(
    (name) =>
      AGENT_TRANSCRIPT_PATH_PATTERN.test(`logs/agent-runs/${name}`) &&
      name.endsWith(`-${runId}.jsonl`),
  );
}

// The lines of a transcript file, parsed as JSON, in file order.
function linesOf(path: string): unknown[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as unknown);
}

const TRUNCATION_MARKER = ' … [truncated: original length';

it('T1 (AC1): the transcript file matches the contract entry schema line by line', async () => {
  const h = await openHarness({
    scenario: 'transcript',
    steps: listThenReadSteps('sources/long.md', ['Done.']),
    prepare: writeLongSource,
  });
  try {
    const stream = await observe(h);
    try {
      const started = await startRun(h, { intent: 'Read two files' });
      const events = await readUntilEnded(stream);

      const files = transcriptFilesOf(transcriptFolder(h), started.runId);
      expect(files).toHaveLength(1);
      const path = join(transcriptFolder(h), files[0]);

      // Every line is a contract entry, and every kind is one of the nine.
      const entries = linesOf(path).map((line) =>
        transcriptEntrySchema.parse(line),
      );
      for (const entry of entries) {
        expect(AGENT_TRANSCRIPT_KINDS).toContain(entry.kind);
        expect(entry.runId).toBe(started.runId);
        expect(entry.conversationId).toBe(started.conversationId);
      }

      expect(entries.map((entry) => entry.kind)).toEqual([
        'intent',
        'step',
        'tool-call',
        'tool-result',
        'step',
        'tool-call',
        'tool-result',
        'step',
        'assistant-text',
        'run-end',
      ]);

      // Each data parses with its own payload schema of the transcript writer.
      const { transcriptPayloadSchemas } =
        await import('../src/modules/agent-loop/transcript-entries');
      for (const entry of entries) {
        const schema = transcriptPayloadSchemas[entry.kind];
        expect(schema, entry.kind).toBeDefined();
        expect(schema?.safeParse(entry.data).success, entry.kind).toBe(true);
      }
      expect(entries[0].data).toEqual({ intent: 'Read two files' });

      // The long read is cut in its output and in its model text, with the marker and the original length.
      const reads = entries.filter(
        (entry) =>
          entry.kind === 'tool-result' &&
          (entry.data as { summary?: unknown }).summary ===
            'Read sources/long.md.',
      );
      expect(reads).toHaveLength(1);
      const read = reads[0].data as {
        output: { content: string };
        modelText: string;
      };
      expect(read.output.content).toMatch(
        /^a+ … \[truncated: original length 20000 characters\]$/,
      );
      expect(read.output.content.length).toBeLessThan(LONG_SOURCE_LENGTH);
      expect(read.modelText).toContain(TRUNCATION_MARKER);
      expect(read.modelText.length).toBeLessThan(LONG_SOURCE_LENGTH);

      // The list result is short, so it is not cut.
      const lists = entries.filter((entry) => entry.kind === 'tool-result');
      const list = lists[0].data as { modelText: string };
      expect(list.modelText).not.toContain(TRUNCATION_MARKER);

      // The seq values never decrease, and the largest is the seq of run-ended on the stream.
      const seqs = entries.map((entry) => entry.seq);
      for (let i = 1; i < seqs.length; i += 1) {
        expect(seqs[i]).toBeGreaterThanOrEqual(seqs[i - 1]);
      }
      const ended = events[events.length - 1] as AgentLoopEvent;
      expect(ended.type).toBe('run-ended');
      expect(Math.max(...seqs)).toBe(ended.data.seq);
      expect(entries[entries.length - 1].data).toEqual({
        reason: 'completed',
        pendingChangeIds: [],
      });
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('T4 (AC4): no transcript line has an absolute container path or the configured key', async () => {
  const KEY = 'sk-test-AC4-SECRET';
  const h = await openHarness({
    scenario: 'scrub',
    steps: [
      {
        match: { endpoint: 'chat', turnIndex: 0 },
        reply: {
          kind: 'toolCalls',
          calls: [
            {
              name: 'read_file',
              argumentChunks: ['{"path":"sources/outline.md"}'],
            },
          ],
        },
      },
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
    keyRef: 'ac4-key',
    prepare: (fixture) => {
      new SecretsStore({
        SCRIBA_BOOKS_DIR: fixture.library,
      } as ScribaEnv).put('ac4-key', KEY);
    },
  });
  try {
    const library = h.fixture.library;
    const intent = `Read ${join(library, 'book', 'sources', 'outline.md')} with key ${KEY}`;
    const stream = await observe(h);
    try {
      const started = await startRun(h, { intent });
      const events = await readUntilEnded(stream);
      expect(events[events.length - 1]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'completed' },
      });

      const files = transcriptFilesOf(transcriptFolder(h), started.runId);
      expect(files).toHaveLength(1);
      const path = join(transcriptFolder(h), files[0]);
      const raw = readFileSync(path, 'utf8');

      // Neither the key, nor the library root (configured or real), nor the project path appears in any line.
      const forbidden = [
        KEY,
        library,
        realpathSync(library),
        join(library, 'book'),
      ];
      for (const line of raw.split('\n').filter((item) => item !== '')) {
        for (const text of forbidden) {
          expect(line).not.toContain(text);
        }
      }

      // The intent line is written with the placeholders.
      const lines = linesOf(path) as Array<{ kind: string; data: unknown }>;
      expect(lines[0]).toMatchObject({
        kind: 'intent',
        data: {
          intent: 'Read <library>/book/sources/outline.md with key <key>',
        },
      });
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});
