import { Controller, Get, Module } from '@nestjs/common';
import { expect, it } from 'vitest';
import { PREFERENCES_ROUTE } from '@bbartolome/scriba-contracts/setup-auth';
import { COMPOSED_MODULES } from '../src/app.module';
import { AssemblyService } from '../src/modules/compile-export/assembly.service';
import { CompileExportModule } from '../src/modules/compile-export/compile-export.module';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import {
  manuscriptLibrary,
  STATIC_ROOT,
} from './compile-export-manuscript.kit';

// The probe of the assembled Markdown (P14). Test-only: it is not part of the composed app.
const FIXED_NOW = new Date('2026-11-19T12:00:00Z');
const PROBE_ROUTE = '/api/compile-export-probe/assembled';

@Controller()
class AssemblyProbeController {
  constructor(private readonly assembly: AssemblyService) {}

  @Get(PROBE_ROUTE)
  assembled(): { markdown: string } {
    return { markdown: this.assembly.assemble(FIXED_NOW) };
  }
}

@Module({
  imports: [CompileExportModule],
  controllers: [AssemblyProbeController],
})
export class AssemblyProbeModule {}

// Boots the composed app with the probe on a manuscript library, takes the session cookie, and removes the library
// in every case.
async function withAssembly<T>(
  files: Record<string, string>,
  run: (app: TestApp, cookie: string) => Promise<T>,
): Promise<T> {
  const fixture = manuscriptLibrary(files);
  try {
    const app = await createTestApp({
      libraryDir: fixture.library,
      staticRoot: STATIC_ROOT,
      modules: [...COMPOSED_MODULES, AssemblyProbeModule],
    });
    try {
      const cookie = await sessionCookie(app, fixture.library);
      return await run(app, cookie);
    } finally {
      await app.close();
    }
  } finally {
    fixture.remove();
  }
}

// The markdown value of the probe.
async function assembledOf(app: TestApp, cookie: string): Promise<string> {
  const reply = await send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: PROBE_ROUTE,
  });
  expect(reply.status).toBe(200);
  return (JSON.parse(reply.body) as { markdown: string }).markdown;
}

// Stores the preferences through the public route (a field-level merge).
async function setPreferences(
  app: TestApp,
  cookie: string,
  body: Record<string, string>,
): Promise<void> {
  const reply = await send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    path: PREFERENCES_ROUTE,
    method: 'POST',
    body: JSON.stringify(body),
  });
  expect(reply.status).toBe(200);
}

// C1 fixture (see the plan, section 4).
const FILLER = Array(600).fill('word').join(' ');

const C1_FILES: Record<string, string> = {
  'project.yaml': [
    'schemaVersion: 1',
    'title: Book',
    'genrePack: nonfiction',
    'export:',
    '  subtitle: A Short Study',
    '  author: A. Writer',
    '  contact: 12 Lane Road',
    '  rights: Copyright A. Writer',
    '  dedication: For Sam.',
    '  bibliography: off',
    'order:',
    '  - path: drafts/preface.md',
    '    part: front',
    '  - path: drafts/notes.md',
    '    part: back',
    '',
  ].join('\n'),
  'drafts/preface.md': '---\ntitle: Preface front matter\n---\nFront words.\n',
  'drafts/a.md':
    '---\ntitle: Chapter one front matter\n---\n# Chapter one\n\nBody text one.\n',
  'drafts/b.md': `# Chapter two\n\nBody text two. ${FILLER}\n`,
  'drafts/notes.md': '---\nstatus: draft\n---\nBack note.\n',
};

const C1_GOLDEN = [
  '---',
  'title: "Book"',
  'subtitle: "A Short Study"',
  'author: "A. Writer"',
  'lang: "en"',
  'date: "2026-11-19"',
  'rights: "Copyright A. Writer"',
  'identifier: "urn:scriba:book"',
  'contact: "12 Lane Road"',
  'wordcount: 1000',
  '---',
  '',
  '::: {.unnumbered}',
  'Front words.',
  ':::',
  '',
  '::: {.unnumbered .unlisted}',
  'For Sam.',
  ':::',
  '',
  '# Chapter one',
  '',
  'Body text one.',
  '',
  '# Chapter two',
  '',
  `Body text two. ${FILLER}`,
  '',
  '::: {.unnumbered}',
  'Back note.',
  ':::',
  '',
].join('\n');

it('C1 assembled document: metadata block, matter placement, no per-file front matter', async () => {
  await withAssembly(C1_FILES, async (app, cookie) => {
    const markdown = await assembledOf(app, cookie);
    expect(markdown).toBe(C1_GOLDEN);
  });
});

// C2 fixture (see the plan, section 4).
const C2_BODY = [
  '# Chapter one',
  '',
  'See [@gamma]. Inline `[@alpha]` here.',
  '',
  '```text',
  '[@beta]',
  '```',
  '',
].join('\n');

const C2_SOURCES: Record<string, string> = {
  'sources/alpha.md':
    '---\ntype: source\ncitation: Alpha, A. (2001). Title one.\nurl: https://example.com/one\n---\nNotes.\n',
  'sources/beta.md':
    '---\ntype: source\ncitation: Beta, B. (2002). Title two.\n---\nNotes.\n',
  'sources/gamma.md':
    '---\ntype: source\ncitation: Gamma, C. (2003). Title three.\n---\nNotes.\n',
  'sources/delta.md': 'Notes.\n',
};

// The project.yaml of a C2 case: the nonfiction pack, and an export block when given.
function c2Project(exportLines: string[] | undefined): string {
  const lines = ['schemaVersion: 1', 'title: Book', 'genrePack: nonfiction'];
  if (exportLines !== undefined) lines.push('export:', ...exportLines);
  return `${lines.join('\n')}\n`;
}

const BIB_ALL = [
  '# Bibliography {.unnumbered}',
  '',
  'Alpha, A. (2001). Title one. https://example.com/one',
  '',
  'Beta, B. (2002). Title two.',
  '',
  'Gamma, C. (2003). Title three.',
  '',
  'delta',
  '',
].join('\n');

const BIB_CITED = [
  '# Bibliography {.unnumbered}',
  '',
  'Gamma, C. (2003). Title three.',
  '',
].join('\n');

it('C2 bibliography: all, cited, off, and the nonfiction default', async () => {
  const cases: {
    name: string;
    project: string;
    check: (markdown: string) => void;
  }[] = [
    {
      name: 'all',
      project: c2Project(['  bibliography: all']),
      check: (markdown) => expect(markdown.endsWith(`\n${BIB_ALL}`)).toBe(true),
    },
    {
      name: 'cited',
      project: c2Project(['  bibliography: cited']),
      check: (markdown) =>
        expect(markdown.endsWith(`\n${BIB_CITED}`)).toBe(true),
    },
    {
      name: 'off',
      project: c2Project(['  bibliography: off']),
      check: (markdown) => expect(markdown).not.toContain('Bibliography'),
    },
    {
      name: 'nonfiction default (no export key)',
      project: c2Project(undefined),
      check: (markdown) => expect(markdown.endsWith(`\n${BIB_ALL}`)).toBe(true),
    },
  ];
  for (const testCase of cases) {
    await withAssembly(
      {
        ...C2_SOURCES,
        'project.yaml': testCase.project,
        'drafts/a.md': C2_BODY,
      },
      async (app, cookie) => {
        testCase.check(await assembledOf(app, cookie));
      },
    );
  }
});

// C3 fixture (see the plan, section 4).
const C3_FILES: Record<string, string> = {
  'drafts/a.md': '# One\n\nText.\n',
};

function c3Project(authorLine: string | undefined): string {
  const lines = ['schemaVersion: 1', 'title: Book', 'genrePack: nonfiction'];
  if (authorLine !== undefined)
    lines.push('export:', `  author: ${authorLine}`);
  return `${lines.join('\n')}\n`;
}

it('C3 author: falls back to the preference reader when unset, and an empty value is unset', async () => {
  const cases: {
    name: string;
    project: string;
    preferences: Record<string, string> | undefined;
    expected: string | undefined;
  }[] = [
    {
      name: '(i) no export author, preference Ada',
      project: c3Project(undefined),
      preferences: { authorName: 'Ada' },
      expected: 'author: "Ada"',
    },
    {
      name: '(ii) export author wins over the preference',
      project: c3Project('"A. Writer"'),
      preferences: { authorName: 'Ada' },
      expected: 'author: "A. Writer"',
    },
    {
      name: '(iii) empty export author falls back to the preference',
      project: c3Project('""'),
      preferences: { authorName: 'Ada' },
      expected: 'author: "Ada"',
    },
    {
      name: '(iv) empty preference is unset',
      project: c3Project(undefined),
      preferences: { authorName: '' },
      expected: undefined,
    },
    {
      name: '(v) no preferences stored',
      project: c3Project(undefined),
      preferences: undefined,
      expected: undefined,
    },
  ];
  for (const testCase of cases) {
    await withAssembly(
      { ...C3_FILES, 'project.yaml': testCase.project },
      async (app, cookie) => {
        if (testCase.preferences !== undefined) {
          await setPreferences(app, cookie, testCase.preferences);
        }
        const markdown = await assembledOf(app, cookie);
        const authorLines = markdown
          .split('\n')
          .filter((line) => line.startsWith('author:'));
        if (testCase.expected === undefined) {
          expect(authorLines, testCase.name).toEqual([]);
        } else {
          expect(authorLines, testCase.name).toEqual([testCase.expected]);
        }
      },
    );
  }
});
