import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import { expect, it } from 'vitest';
import {
  PREFLIGHT_ROUTE,
  preflightResultSchema,
  type PreflightCheck,
  type PreflightResult,
} from '@bbartolome/scriba-contracts/compile-export';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import {
  STATIC_ROOT,
  getManuscript,
  manuscriptLibrary,
  manuscriptOf,
  withManuscript,
} from './compile-export-manuscript.kit';
import { postJson } from './project-store-projects.kit';
import {
  startFromSample,
  withSamplesApp,
  type SamplesFixture,
} from './project-store-samples.kit';
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

// The check of an id. Checks are looked up by id, never by index.
function checkOf(result: PreflightResult, id: string): PreflightCheck {
  const check = result.checks.find((entry) => entry.id === id);
  if (check === undefined) throw new Error(`no check ${id}`);
  return check;
}

// The identity of a finding that the criteria name: check id, severity, path and line.
function keyOf(finding: {
  check: string;
  severity: string;
  path: string;
  line?: number;
}): { check: string; severity: string; path: string; line?: number } {
  return {
    check: finding.check,
    severity: finding.severity,
    path: finding.path,
    line: finding.line,
  };
}

// The `sha256:` hash of a text's UTF-8 bytes, in the form of the Project store and the Agent loop.
function hashOf(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

// The claim as the Agent loop writes it: its span is an offset into the text the engine checked.
function claimOf(
  text: string,
  claim: string,
  verdict: 'supported' | 'weak' | 'unsupported',
  passage?: { path: string; offset: number; snippet: string },
): Record<string, unknown> {
  const start = text.indexOf(claim);
  return {
    text: claim,
    span: { start, end: start + claim.length },
    verdict,
    ...(passage === undefined ? {} : { passage }),
    reason: `${verdict} in the test fixture`,
  };
}

// The text of a grounding-result artefact of the Agent loop's format (schema version 1).
function artefactText(
  targetPath: string,
  contentHash: string,
  claims: Record<string, unknown>[],
): string {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      targetPath,
      contentHash,
      checkedAt: '2026-11-19T10:00:00.000Z',
      runId: 'run-gate-fixture',
      claims,
    },
    null,
    2,
  )}\n`;
}

// Criterion 2 fixtures. Each is copied from the named test of the compile-export preflight suite.

// The placeholders fixture: the first three lines of C1_FILES['drafts/a.md'] (compile-export-preflight.test.ts).
const PLACEHOLDERS_FILES: Record<string, string> = {
  'drafts/a.md': '# Chapter one\n\nThe draft has a TK in prose.\n',
};

// The K1 files map (compile-export-claims-orphans.test.ts lines 95 to 113). Also the criterion 3 fixture.
const K1_A = [
  'Harbour traffic doubled in 1900.',
  'The town has a river.',
  'The bridge opened in 1931.',
  '',
].join('\n');
const K1_A_PASSAGE = {
  path: 'sources/notes.md',
  offset: 0,
  snippet: 'The town has a river.',
};
const K1_B = 'The old mill burned.\n';
const K1_B_OLD_CLAIM = 'The old mill stood.';

function k1Files(): Record<string, string> {
  return {
    'drafts/a.md': K1_A,
    'drafts/b.md': K1_B,
    'logs/grounding/drafts/a.md.json': artefactText(
      'drafts/a.md',
      hashOf(K1_A),
      [
        claimOf(K1_A, 'Harbour traffic doubled in 1900.', 'unsupported'),
        claimOf(K1_A, 'The town has a river.', 'supported', K1_A_PASSAGE),
        claimOf(K1_A, 'The bridge opened in 1931.', 'weak', K1_A_PASSAGE),
      ],
    ),
    // The artefact checked an older text of b.md, so its hash no longer matches the file.
    'logs/grounding/drafts/b.md.json': artefactText(
      'drafts/b.md',
      hashOf(K1_B_OLD_CLAIM),
      [claimOf(K1_B_OLD_CLAIM, K1_B_OLD_CLAIM, 'unsupported')],
    ),
  };
}

// The orphans fixture (compile-export-claims-orphans.test.ts lines 288 to 296, orphans case (b)).
const ORPHANS_FILES: Record<string, string> = {
  'project.yaml': [
    'schemaVersion: 1',
    'title: Book',
    'genrePack: nonfiction',
    'order:',
    '  - path: drafts/ch01.md',
    '  - path: drafts/gone.md',
    '',
  ].join('\n'),
  'drafts/ch01.md': 'Chapter one.\n',
};

// The entity-links fixture: E1_FILES (compile-export-links-phrases.test.ts lines 30 to 63).
const CH01 = [
  '---',
  'title: One',
  'links: [ada, ghost]',
  '---',
  '# One',
  '',
  'Ada wrote it [@ada].',
  'Nobody knows [@ghost].',
  'Two of them [@ada; @nobody].',
  'Duplicate [@bob].',
  '![Cover](assets/cover.png)',
  '![Map](assets/missing.png)',
  'See [the notes](../outside.md).',
  '[ref]: assets/gone.png',
  'Use [ref].',
  '![Again](<assets/cover.png>)',
  '![Spaced](assets/my%20map.png)',
  'A note.[^1]',
  'Code link [x](`assets/none.png`).',
  '[^1]: The note.',
  '',
].join('\n');
const LINKS_FILES: Record<string, string> = {
  'entities/ada.md': ['---', 'type: person', '---', 'Ada Lovelace.', ''].join(
    '\n',
  ),
  'entities/bob.md': ['---', 'type: person', '---', 'Bob.', ''].join('\n'),
  'sources/bob.md': "Bob's notes.\n",
  'assets/cover.png': 'cover',
  'assets/my map.png': 'map',
  'drafts/ch01.md': CH01,
};

// The banned-phrases fixture: HOUSE_PROJECT, HOUSE_STYLE and A_MD (compile-export-links-phrases.test.ts lines 106 to 136).
// They are written before boot (A4).
const A_MD = [
  '# Chapter one',
  '',
  'This is a game',
  'changer, the editor said.',
  '',
  'Game Changer again.',
  'You can unlock your potential.',
  '',
  'Inline `game changer` is code. Game changers and changer alone are not the phrase.',
  '',
  '```text',
  'unlock your potential',
  '```',
  '',
].join('\n');
const HOUSE_PROJECT =
  'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\nstyleProfile: house-style\n';
const HOUSE_STYLE = [
  '---',
  'type: style-profile',
  'tone: Plain and direct',
  'targetLength: 800',
  'bannedPhrases: [game changer, unlock your potential]',
  '---',
  'Say what the evidence shows.',
  '',
].join('\n');
const BANNED_FILES: Record<string, string> = {
  'project.yaml': HOUSE_PROJECT,
  'entities/house-style.md': HOUSE_STYLE,
  'drafts/a.md': A_MD,
};

// The clean fixture (compile-export-preflight.test.ts lines 111 and 112).
const CLEAN_FILES: Record<string, string> = {
  'drafts/a.md': '# Chapter one\n\nA clean sentence.\n',
  'drafts/b.md': 'A second clean sentence.\n',
};

const CHECK_IDS = [
  'placeholders',
  'unsupported-claims',
  'orphan-scenes',
  'entity-links',
  'banned-phrases',
];

it('each of the five checks fires with its id, severity, path and line, and a clean fixture passes all five', async () => {
  const cases: {
    name: string;
    files: Record<string, string>;
    check: string;
    status: 'fail' | 'warn';
    finding: { check: string; severity: string; path: string; line: number };
  }[] = [
    {
      name: 'placeholders',
      files: PLACEHOLDERS_FILES,
      check: 'placeholders',
      status: 'fail',
      finding: {
        check: 'placeholders',
        severity: 'error',
        path: 'drafts/a.md',
        line: 3,
      },
    },
    {
      name: 'unsupported-claims',
      files: k1Files(),
      check: 'unsupported-claims',
      status: 'fail',
      finding: {
        check: 'unsupported-claims',
        severity: 'error',
        path: 'drafts/a.md',
        line: 1,
      },
    },
    {
      name: 'orphan-scenes',
      files: ORPHANS_FILES,
      check: 'orphan-scenes',
      status: 'warn',
      finding: {
        check: 'orphan-scenes',
        severity: 'warning',
        path: 'project.yaml',
        line: 6,
      },
    },
    {
      name: 'entity-links',
      files: LINKS_FILES,
      check: 'entity-links',
      status: 'fail',
      finding: {
        check: 'entity-links',
        severity: 'error',
        path: 'drafts/ch01.md',
        line: 3,
      },
    },
    {
      name: 'banned-phrases',
      files: BANNED_FILES,
      check: 'banned-phrases',
      status: 'warn',
      finding: {
        check: 'banned-phrases',
        severity: 'warning',
        path: 'drafts/a.md',
        line: 3,
      },
    },
  ];

  for (const item of cases) {
    await withManuscript(item.files, async (app, cookie) => {
      const reply = await postPreflight(app, cookie);
      expect(reply.status, item.name).toBe(200);
      const result = preflightResultSchema.parse(JSON.parse(reply.body));
      const check = checkOf(result, item.check);
      expect(check.status, item.name).toBe(item.status);
      expect(check.findings.map(keyOf), item.name).toContainEqual(item.finding);
    });
  }

  await withManuscript(CLEAN_FILES, async (app, cookie) => {
    const reply = await postPreflight(app, cookie);
    expect(reply.status).toBe(200);
    const result = preflightResultSchema.parse(JSON.parse(reply.body));
    expect(result.checks.map((check) => check.id)).toEqual(CHECK_IDS);
    expect(result.checks.every((check) => check.status === 'pass')).toBe(true);
  });
}, 60000);

it('preflight runs all five checks and sends the mock OpenAI server no request', async () => {
  const mock = await startMockOpenAI();
  const fixture = manuscriptLibrary(k1Files());
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
    expect(result.checks.map((check) => check.id)).toEqual(CHECK_IDS);
    expect(checkOf(result, 'unsupported-claims').status).toBe('fail');
    expect(await recordsOf(mock, 'text-stream')).toEqual([]);
  } finally {
    await app?.close();
    await mock.close();
    fixture.remove();
  }
}, 60000);

// The samples folder of criterion 4: the order block of examples/nonfiction/project.yaml, lines 5 to 13, byte for byte.
function buildGateSamples(): SamplesFixture {
  const library = mkdtempSync(join(tmpdir(), 'scriba-gate-library-'));
  const samples = mkdtempSync(join(tmpdir(), 'scriba-gate-samples-'));
  const remove = (): void => {
    rmSync(library, { recursive: true, force: true });
    rmSync(samples, { recursive: true, force: true });
  };
  try {
    const file = (path: string, text: string): void => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    };
    file(
      join(library, 'book', 'project.yaml'),
      'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n',
    );
    file(
      join(samples, 'samples.yaml'),
      [
        '- id: nonfiction',
        '  title: Nonfiction',
        "  description: The gate's copy of the nonfiction order.",
        '',
      ].join('\n'),
    );
    file(
      join(samples, 'nonfiction', 'project.yaml'),
      [
        'schemaVersion: 1',
        'title: The Long Apprenticeship',
        'genrePack: nonfiction',
        'order:',
        '  - path: drafts/born-to-it.md',
        '    status: final',
        '  - path: drafts/what-counts-as-practice.md',
        '    status: revised',
        '  - path: drafts/the-ten-thousand-hour-idea.md',
        '    status: draft',
        '  - path: drafts/the-plateau-is-not-the-end.md',
        '    status: draft',
        '',
      ].join('\n'),
    );
    const drafts = [
      'born-to-it',
      'what-counts-as-practice',
      'the-ten-thousand-hour-idea',
      'the-plateau-is-not-the-end',
    ];
    drafts.forEach((name, index) => {
      file(
        join(samples, 'nonfiction', 'drafts', `${name}.md`),
        `# Chapter ${index + 1}\n\nOne line.\n`,
      );
    });
  } catch (error) {
    remove();
    throw error;
  }
  return { library, samples, remove };
}

it('start from sample keeps the authored order and statuses of the nonfiction sample', async () => {
  const fixture = buildGateSamples();
  try {
    await withSamplesApp(fixture, async (app, cookie) => {
      const started = await startFromSample(app, cookie, {
        sampleId: 'nonfiction',
        folderName: 'gate-sample',
        title: 'Gate Sample',
      });
      expect(started.status).toBe(201);

      const activated = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: 'gate-sample',
      });
      expect(activated.status).toBe(200);

      const view = manuscriptOf(await getManuscript(app, cookie));
      const paths = view.entries.map((entry) => entry.path);
      expect(paths).toEqual([
        'drafts/born-to-it.md',
        'drafts/what-counts-as-practice.md',
        'drafts/the-ten-thousand-hour-idea.md',
        'drafts/the-plateau-is-not-the-end.md',
      ]);
      expect(view.entries.map((entry) => entry.status)).toEqual([
        'final',
        'revised',
        'draft',
        'draft',
      ]);
      expect(view.orderSource).toBe('project');
      for (const entry of view.entries) {
        expect(entry.inOrderField).toBe(true);
        expect(entry.graphOrdered).toBe(false);
      }
      expect(view.warnings).toEqual([]);
      expect(paths).not.toEqual([...paths].sort());
    });
  } finally {
    fixture.remove();
  }
}, 60000);
