import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  EXPORT_COPY_DEFAULT_ROUTE,
  EXPORT_SETTINGS_ROUTE,
  type ExportSettingsView,
} from '@bbartolome/scriba-contracts/compile-export';
import type { TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import { sha256Of } from './project-store-files.kit';
import { postJson } from './project-store-projects.kit';
import {
  fakePandoc,
  itPandoc,
  postExport,
  removeFake,
  withExport,
} from './compile-export-export.kit';
import { binaryDownload, readZip } from './compile-export-docx.kit';

// The built-in files, as the build ships them (apps/api/assets/compile-export).
const ASSETS = resolve(__dirname, '..', 'assets', 'compile-export');
const REFERENCE_DOCX = resolve(ASSETS, 'reference.docx');
const EPUB_CSS = resolve(ASSETS, 'epub.css');
const TYPST_TEMPLATE = resolve(ASSETS, 'typst-template.typst');

const ONE_FILES: Record<string, string> = {
  'drafts/one.md': '# One\n\nBody words.\n',
};

// One GET of the settings route, with the loopback Host and the session cookie.
function getSettings(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: EXPORT_SETTINGS_ROUTE,
  });
}

// The revision of a settings GET (the reply must be 200).
async function revisionOf(app: TestApp, cookie: string): Promise<string> {
  const reply = await getSettings(app, cookie);
  expect(reply.status).toBe(200);
  return (JSON.parse(reply.body) as ExportSettingsView).revision;
}

function postSettings(
  app: TestApp,
  cookie: string,
  body: unknown,
): Promise<Reply> {
  return postJson(app, cookie, EXPORT_SETTINGS_ROUTE, body);
}

function copyDefault(
  app: TestApp,
  cookie: string,
  body: unknown,
): Promise<Reply> {
  return postJson(app, cookie, EXPORT_COPY_DEFAULT_ROUTE, body);
}

function errorCodeOf(reply: Reply): string {
  return JSON.parse(reply.body).error.code;
}

describe('compile-export templates, copy default and export settings (CEX-14)', () => {
  it('criterion 1: a missing override returns COMPILE_TEMPLATE_INVALID (422) and Pandoc is not started', async () => {
    const fake = fakePandoc('touch "$0.ran"');
    try {
      await withExport(ONE_FILES, { command: fake }, async (app, cookie) => {
        const r0 = await revisionOf(app, cookie);
        const set = await postSettings(app, cookie, {
          revision: r0,
          settings: {
            docxReferenceDoc: 'missing.docx',
            epubCss: 'missing.css',
            typstTemplate: 'missing.typ',
          },
        });
        expect(set.status).toBe(200);
        for (const format of ['docx', 'epub', 'pdf'] as const) {
          const reply = await postExport(app, cookie, format);
          expect(reply.status).toBe(422);
          expect(errorCodeOf(reply)).toBe('COMPILE_TEMPLATE_INVALID');
          expect(existsSync(`${fake}.ran`)).toBe(false);
        }
        const markdown = await postExport(app, cookie, 'md');
        expect(markdown.status).toBe(200);
      });
    } finally {
      removeFake(fake);
    }
  });

  itPandoc(
    'criterion 2: copy default writes the built-in reference DOCX, and the override makes DOCX use its styles',
    async () => {
      await withExport(ONE_FILES, {}, async (app, cookie, library) => {
        const copied = await copyDefault(app, cookie, {
          format: 'docx',
          path: 'reference.docx',
        });
        expect(copied.status).toBe(200);
        const target = join(library, 'book', 'reference.docx');
        expect(readFileSync(target).equals(readFileSync(REFERENCE_DOCX))).toBe(
          true,
        );

        const r = await revisionOf(app, cookie);
        const set = await postSettings(app, cookie, {
          revision: r,
          settings: { docxReferenceDoc: 'reference.docx' },
        });
        expect(set.status).toBe(200);

        const exported = await postExport(app, cookie, 'docx');
        expect(exported.status).toBe(200);
        const first = await binaryDownload(app, cookie, 'docx');
        expect(first.status).toBe(200);
        const firstStyles = readZip(first.bytes)
          .get('word/styles.xml')!
          .toString('utf8');
        expect(firstStyles).toContain('Times New Roman');

        // The discriminator: a reference with the Pandoc default styles, which lack the font, is the one Pandoc reads.
        writeFileSync(
          target,
          execFileSync('pandoc', [
            '--print-default-data-file',
            'reference.docx',
          ]),
        );
        const again = await postExport(app, cookie, 'docx');
        expect(again.status).toBe(200);
        const second = await binaryDownload(app, cookie, 'docx');
        expect(second.status).toBe(200);
        const secondStyles = readZip(second.bytes)
          .get('word/styles.xml')!
          .toString('utf8');
        expect(secondStyles).not.toContain('Times New Roman');
      });
    },
  );

  it('criterion 3: a settings write with a stale revision is refused and writes nothing; a valid one changes only the export key', async () => {
    const original = [
      '# The book record.',
      'schemaVersion: 1',
      'title: Book',
      'genrePack: nonfiction',
      'export:',
      '  author: A. Writer',
      '',
    ].join('\n');
    await withExport(
      { 'project.yaml': original, ...ONE_FILES },
      {},
      async (app, cookie, library) => {
        const projectYaml = join(library, 'book', 'project.yaml');
        const r0 = await revisionOf(app, cookie);

        // A hand edit after the GET makes r0 stale.
        const hand = [
          '# The book record.',
          'schemaVersion: 1',
          'title: Book',
          'genrePack: nonfiction',
          'export:',
          '  author: Hand Edit',
          '',
        ].join('\n');
        writeFileSync(projectYaml, hand);

        const stale = await postSettings(app, cookie, {
          revision: r0,
          settings: { author: 'Stale' },
        });
        expect(stale.status).toBe(409);
        expect(errorCodeOf(stale)).toBe('COMPILE_ORDER_CONFLICT');
        expect(readFileSync(projectYaml, 'utf8')).toBe(hand);

        const r1 = await revisionOf(app, cookie);
        expect(r1).not.toBe(r0);

        const valid = await postSettings(app, cookie, {
          revision: r1,
          settings: { contact: '12 Lane Road' },
        });
        expect(valid.status).toBe(200);

        const text = readFileSync(projectYaml, 'utf8');
        expect(text.startsWith(hand.slice(0, hand.indexOf('export:')))).toBe(
          true,
        );
        const before = parse(hand) as Record<string, unknown>;
        const after = parse(text) as Record<string, unknown>;
        expect(after.export).toEqual({
          author: 'Hand Edit',
          contact: '12 Lane Road',
        });
        for (const key of Object.keys(before)) {
          if (key === 'export') continue;
          expect(after[key]).toEqual(before[key]);
        }
      },
    );
  });

  it('extra E1: GET settings writes nothing and shows lang and bibliography defaults', async () => {
    await withExport(ONE_FILES, {}, async (app, cookie, library) => {
      const projectYaml = join(library, 'book', 'project.yaml');
      const before = readFileSync(projectYaml);
      const reply = await getSettings(app, cookie);
      expect(reply.status).toBe(200);
      const view = JSON.parse(reply.body) as ExportSettingsView;
      expect(view.settings.lang).toBe('en');
      expect(view.settings.bibliography).toBe('all');
      expect(readFileSync(projectYaml).equals(before)).toBe(true);
    });
  });

  it('extra E2: an override outside the project, reserved, a folder, or missing is refused as COMPILE_TEMPLATE_INVALID', async () => {
    const values = [
      '../outside.docx',
      '.scriba/reference.docx',
      'drafts',
      'reference.docx',
    ];
    const fake = fakePandoc('touch "$0.ran"');
    try {
      await withExport(ONE_FILES, { command: fake }, async (app, cookie) => {
        for (const value of values) {
          const r = await revisionOf(app, cookie);
          const set = await postSettings(app, cookie, {
            revision: r,
            settings: { docxReferenceDoc: value },
          });
          expect(set.status).toBe(200);
          const reply = await postExport(app, cookie, 'docx');
          expect(reply.status).toBe(422);
          expect(errorCodeOf(reply)).toBe('COMPILE_TEMPLATE_INVALID');
          expect(existsSync(`${fake}.ran`)).toBe(false);
        }
      });
    } finally {
      removeFake(fake);
    }
  });

  it('extra E3: copy default refuses project.yaml, reserved and invalid paths and an existing file, and writes nothing', async () => {
    await withExport(
      { ...ONE_FILES, 'existing.docx': 'keep' },
      {},
      async (app, cookie, library) => {
        const book = join(library, 'book');
        const names = [
          'project.yaml',
          'drafts/one.md',
          'existing.docx',
          'reference.docx',
          'epub-style.css',
          'templates/manuscript.typst',
        ];
        const before = new Map(
          names.map((name) => [name, existsSync(join(book, name))]),
        );
        const refused: [string, number, string][] = [
          ['project.yaml', 400, 'PROJECT_PATH_RESERVED'],
          ['.scriba/x.docx', 400, 'PROJECT_PATH_RESERVED'],
          ['../x.docx', 400, 'PROJECT_PATH_INVALID'],
          ['existing.docx', 409, 'PROJECT_FILE_EXISTS'],
        ];
        for (const [path, status, code] of refused) {
          const reply = await copyDefault(app, cookie, {
            format: 'docx',
            path,
          });
          expect(reply.status).toBe(status);
          expect(errorCodeOf(reply)).toBe(code);
        }
        expect(readFileSync(join(book, 'existing.docx'), 'utf8')).toBe('keep');
        expect(existsSync(join(book, 'x.docx'))).toBe(false);
        expect(existsSync(join(book, '.scriba', 'x.docx'))).toBe(false);
        for (const name of names) {
          expect(existsSync(join(book, name))).toBe(before.get(name));
        }
      },
    );
  });

  it('extra E4: copy default for epub and pdf writes the built-in file and returns its hash', async () => {
    await withExport(ONE_FILES, {}, async (app, cookie, library) => {
      const cases: [string, string, string][] = [
        ['epub', 'epub-style.css', EPUB_CSS],
        ['pdf', 'templates/manuscript.typst', TYPST_TEMPLATE],
      ];
      for (const [format, path, source] of cases) {
        const bytes = readFileSync(source);
        const reply = await copyDefault(app, cookie, { format, path });
        expect(reply.status).toBe(200);
        const body = JSON.parse(reply.body) as { path: string; hash: string };
        expect(body.path).toBe(path);
        expect(body.hash).toBe(sha256Of(bytes));
        expect(readFileSync(join(library, 'book', path)).equals(bytes)).toBe(
          true,
        );
      }
    });
  });
});
