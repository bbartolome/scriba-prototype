import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { expect, it } from 'vitest';
import {
  PREFLIGHT_ROUTE,
  preflightResultSchema,
} from '@bbartolome/scriba-contracts/compile-export';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  snapshotLibrary,
} from './invariant-sweep';
import {
  STATIC_ROOT,
  getManuscript,
  manuscriptLibrary,
  manuscriptOf,
  withManuscript,
} from './compile-export-manuscript.kit';
import { recordsOf, startMockOpenAI } from './providers-client.kit';

// One POST of the preflight route, with the loopback Host, the loopback Origin, the session cookie and no body.
function postPreflight(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    method: 'POST',
    path: PREFLIGHT_ROUTE,
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
  });
}

// C1: the fixture of criterion 1. drafts/a.md has a TK and a TODO in prose, and a TODO in a fence and in inline code.
// drafts/b.md has front matter with a TODO that is not prose, and an unrendered placeholder in its body.
const C1_FILES: Record<string, string> = {
  'drafts/a.md': [
    '# Chapter one',
    '',
    'The draft has a TK in prose.',
    '',
    'TODO: finish the opening.',
    '',
    '```text',
    'TODO in a fenced block.',
    '```',
    '',
    'Inline `TODO` in code. Also todo, TODOS and XXXL are not placeholders.',
    '',
  ].join('\n'),
  'drafts/b.md': [
    '---',
    'title: Second',
    'note: TODO later',
    '---',
    '',
    'Second file: {{chapter_title}} is unrendered.',
    '',
  ].join('\n'),
};

it('placeholders: prose occurrences only, with file, line, offset and length', async () => {
  await withManuscript(C1_FILES, async (app, cookie) => {
    const reply = await postPreflight(app, cookie);
    expect(reply.status).toBe(200);
    const result = preflightResultSchema.parse(JSON.parse(reply.body));
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0]).toMatchObject({
      id: 'placeholders',
      status: 'fail',
    });

    const findings = result.checks[0].findings;
    expect(findings.map((finding) => [finding.path, finding.line])).toEqual([
      ['drafts/a.md', 3],
      ['drafts/a.md', 5],
      ['drafts/b.md', 6],
    ]);
    expect(findings.map((finding) => finding.message)).toEqual([
      'Placeholder word left in the text.',
      'Placeholder word left in the text.',
      'Unrendered placeholder left in the text.',
    ]);
    for (const finding of findings) {
      expect(finding.check).toBe('placeholders');
      expect(finding.severity).toBe('error');
      expect(finding.offset).toBeDefined();
      expect(finding.length).toBeDefined();
    }

    // The offsets and lengths point at the token in the text the test wrote (front matter included).
    const tokens = findings.map((finding) => {
      const text = C1_FILES[finding.path];
      return text.slice(
        finding.offset ?? -1,
        (finding.offset ?? 0) + (finding.length ?? 0),
      );
    });
    expect(tokens).toEqual(['TK', 'TODO', '{{chapter_title}}']);
  });
});

it("a clean fixture passes, the revision is the view's, and nothing is written", async () => {
  await withManuscript(
    {
      'drafts/a.md': '# Chapter one\n\nA clean sentence.\n',
      'drafts/b.md': 'A second clean sentence.\n',
    },
    async (app, cookie, library) => {
      const before = snapshotLibrary(library);
      const reply = await postPreflight(app, cookie);
      const after = snapshotLibrary(library);

      expect(reply.status).toBe(200);
      const result = preflightResultSchema.parse(JSON.parse(reply.body));
      expect(result.checks).toEqual([
        { id: 'placeholders', status: 'pass', findings: [] },
      ]);
      const view = manuscriptOf(await getManuscript(app, cookie));
      expect(result.revision).toBe(view.revision);
      expect(after).toEqual(before);
    },
  );
});

it('preflight makes no model call', async () => {
  const mock = await startMockOpenAI();
  const fixture = manuscriptLibrary({ 'drafts/a.md': 'A TODO in prose.\n' });
  let app: TestApp | undefined;
  try {
    writeFileSync(
      join(fixture.library, '.scriba', 'settings.yaml'),
      stringify({
        schemaVersion: 1,
        projects: { schemaVersion: 1, active: 'book' },
        providers: {
          schemaVersion: 1,
          list: [
            {
              id: 'mock',
              kind: 'openai-compatible',
              baseURL: `${mock.baseUrl}/scenario/text-stream/v1`,
              model: 'mock-model',
              ...PROVIDER_DEFAULTS,
            },
          ],
          appDefault: { providerId: 'mock', model: 'mock-model' },
        },
      }),
    );
    app = await createTestApp({
      libraryDir: fixture.library,
      staticRoot: STATIC_ROOT,
    });
    const cookie = await sessionCookie(app, fixture.library);

    const reply = await postPreflight(app, cookie);

    expect(reply.status).toBe(200);
    const result = preflightResultSchema.parse(JSON.parse(reply.body));
    expect(result.checks[0].findings).toHaveLength(1);
    expect(await recordsOf(mock, 'text-stream')).toEqual([]);
  } finally {
    await app?.close();
    await mock.close();
    fixture.remove();
  }
});
