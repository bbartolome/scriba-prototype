import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PREFLIGHT_ROUTE,
  exportResultSchema,
  preflightResultSchema,
  type PreflightResult,
} from '@bbartolome/scriba-contracts/compile-export';
import { getManuscript, manuscriptOf } from './compile-export-manuscript.kit';
import { snapshotLibrary } from './invariant-sweep';
import {
  downloadOf,
  itPandoc,
  postExport,
  withExport,
} from './compile-export-export.kit';
import { postJson } from './project-store-projects.kit';

// The C1 fixture and its golden (copied from compile-export-assembly.test.ts, as CEX-04 settled).
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

// The clock is faked for Date only, before the app boots (D27, A4). Real timers stay on.
afterEach(() => {
  vi.useRealTimers();
});

describe('compile-export export', () => {
  it('criterion 1: md export returns the C1 golden; the download GET returns the same bytes and changes nothing', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
    await withExport(C1_FILES, {}, async (app, cookie, library) => {
      const root = join(library, 'book');
      const before = await downloadOf(app, cookie, 'md');
      expect(before.status).toBe(404);
      expect(existsSync(join(root, '.scriba', 'compile-export'))).toBe(false);

      const posted = await postExport(app, cookie, 'md');
      expect(posted.status).toBe(200);
      const result = exportResultSchema.parse(JSON.parse(posted.body));
      expect(result.fileName).toBe('book-20261119-1200.md');
      expect(result.bytes).toBe(Buffer.byteLength(C1_GOLDEN, 'utf8'));
      expect(result.downloadUrl).toBe('/api/compile-export/exports/md');

      const afterPost = snapshotLibrary(library);
      const reply = await downloadOf(app, cookie, 'md');
      expect(reply.status).toBe(200);
      expect(reply.body).toBe(C1_GOLDEN);
      expect(reply.headers['content-disposition']).toBe(
        'attachment; filename=book-20261119-1200.md',
      );
      expect(snapshotLibrary(library)).toEqual(afterPost);
    });
  });

  it('criterion 3: export with a TODO (a preflight error) returns 200 with the summary, and writes the file', async () => {
    await withExport(
      { 'drafts/a.md': '# Chapter one\n\nDraft TODO here.\n' },
      {},
      async (app, cookie) => {
        const preflight = await postJson(app, cookie, PREFLIGHT_ROUTE, {});
        expect(preflight.status).toBe(200);
        const run: PreflightResult = preflightResultSchema.parse(
          JSON.parse(preflight.body),
        );
        const errors = run.checks.flatMap((check) =>
          check.findings.filter((finding) => finding.severity === 'error'),
        );

        const posted = await postExport(app, cookie, 'md');
        expect(posted.status).toBe(200);
        const result = exportResultSchema.parse(JSON.parse(posted.body));
        expect(result.preflight.errors).toBeGreaterThanOrEqual(1);
        expect(result.preflight.errors).toBe(errors.length);

        const manuscript = manuscriptOf(await getManuscript(app, cookie));
        expect(result.preflight.revision).toBe(manuscript.revision);

        const download = await downloadOf(app, cookie, 'md');
        expect(download.status).toBe(200);
      },
    );
  });

  // Criterion 4 (the real-binary half): the md output parses with Pandoc 3.13. Skipped with a message when Pandoc is
  // missing, and required to run when SCRIBA_REQUIRE_EXPORT_TOOLS=1 (see compile-export-export.kit.ts).
  itPandoc('criterion 4: the md output parses with real Pandoc 3.13', () => {
    const parsed = spawnSync('pandoc', ['--from=markdown', '--to=native'], {
      input: C1_GOLDEN,
      encoding: 'utf8',
    });
    expect(parsed.status).toBe(0);
    expect(parsed.stdout.length).toBeGreaterThan(0);
  });

  it('extra: an empty manuscript returns COMPILE_EMPTY_MANUSCRIPT and writes nothing', async () => {
    await withExport({}, {}, async (app, cookie, library) => {
      const posted = await postExport(app, cookie, 'md');
      expect(posted.status).toBe(422);
      expect(JSON.parse(posted.body).error.code).toBe(
        'COMPILE_EMPTY_MANUSCRIPT',
      );
      expect(
        existsSync(
          join(library, 'book', '.scriba', 'compile-export', 'exports'),
        ),
      ).toBe(false);
    });
  });

  it('extra: a second md export keeps one md file', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
    await withExport(C1_FILES, {}, async (app, cookie, library) => {
      expect((await postExport(app, cookie, 'md')).status).toBe(200);
      vi.setSystemTime(new Date('2026-11-19T13:00:00Z'));
      const second = await postExport(app, cookie, 'md');
      expect(second.status).toBe(200);
      const folder = join(
        library,
        'book',
        '.scriba',
        'compile-export',
        'exports',
      );
      expect(readdirSync(folder)).toEqual(['book-20261119-1300.md']);
    });
  });
});
