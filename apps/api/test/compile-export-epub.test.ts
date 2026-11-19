import { existsSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { exportResultSchema } from '@bbartolome/scriba-contracts/compile-export';
import { itPandoc, postExport, withExport } from './compile-export-export.kit';
import {
  binaryDownload,
  readZip,
  useFixedClock,
} from './compile-export-docx.kit';
import type { TestApp } from './create-test-app';

// The clock is restored after each test (D9, as the DOCX tests do).
afterEach(() => {
  vi.useRealTimers();
});

const EPUB_TYPE = 'application/epub+zip';
const EPUB_CSS = resolve(
  __dirname,
  '..',
  'assets',
  'compile-export',
  'epub.css',
);
const ALPHA_SOURCE =
  '---\ntype: source\ncitation: Alpha, A. (2001). Title one.\nurl: https://example.com/one\n---\nNotes.\n';

// The base fixture (D8): front matter with a dedication, two body files in the order of `order:` (zeta before
// alpha), and back matter. The bibliography is off unless `bibliography` is true.
function epubFiles(bibliographyOff = true): Record<string, string> {
  const exportLines = ['  author: A. Writer', '  dedication: For Sam.'];
  if (bibliographyOff) exportLines.push('  bibliography: off');
  return {
    'project.yaml': [
      'schemaVersion: 1',
      'title: Book',
      'genrePack: nonfiction',
      'export:',
      ...exportLines,
      'order:',
      '  - path: drafts/front.md',
      '    part: front',
      '  - path: drafts/zeta.md',
      '    part: body',
      '  - path: drafts/alpha.md',
      '    part: body',
      '  - path: drafts/back.md',
      '    part: back',
      '',
    ].join('\n'),
    'drafts/front.md': '# Front heading\n\nFront matter words.\n',
    'drafts/zeta.md': '# Zeta chapter\n\nZeta words.\n',
    'drafts/alpha.md': '# Alpha chapter\n\nAlpha words.\n',
    'drafts/back.md': '# Back heading\n\nBack matter words.\n',
  };
}

// One EPUB export and its download: the POST result, and the bytes of the download with the zip parts.
async function exportEpub(
  app: TestApp,
  cookie: string,
): Promise<{
  result: ReturnType<typeof exportResultSchema.parse>;
  bytes: Buffer;
}> {
  const posted = await postExport(app, cookie, 'epub');
  expect(posted.status).toBe(200);
  const result = exportResultSchema.parse(JSON.parse(posted.body));
  const reply = await binaryDownload(app, cookie, 'epub');
  expect(reply.status).toBe(200);
  expect(String(reply.headers['content-type'])).toBe(EPUB_TYPE);
  expect(reply.bytes.length).toBe(result.bytes);
  return { result, bytes: reply.bytes };
}

// One part of the EPUB zip, by its full name. The part must exist.
function epubPart(bytes: Buffer, name: string): Buffer {
  const part = readZip(bytes).get(name);
  if (part === undefined) throw new Error(`missing part ${name}`);
  return part;
}

// The OPF of the EPUB: its path (from META-INF/container.xml), its metadata text, its manifest and its spine.
interface ManifestItem {
  id: string;
  href: string;
  path: string;
  isNav: boolean;
}

interface Opf {
  path: string;
  metadata: string;
  manifest: ManifestItem[];
  spine: string[];
}

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

function opfOf(bytes: Buffer): Opf {
  const container = epubPart(bytes, 'META-INF/container.xml').toString('utf8');
  const path = /full-path="([^"]+)"/.exec(container)?.[1];
  if (path === undefined) throw new Error('container.xml has no full-path');
  const text = epubPart(bytes, path).toString('utf8');
  const base = posix.dirname(path);
  const metadata = /<metadata[\s\S]*?<\/metadata>/.exec(text)?.[0] ?? '';
  const manifest = [...text.matchAll(/<item\s[^>]*>/g)].map((match) => {
    const href = attr(match[0], 'href') ?? '';
    return {
      id: attr(match[0], 'id') ?? '',
      href,
      path: posix.join(base, href),
      isNav: (attr(match[0], 'properties') ?? '').split(' ').includes('nav'),
    };
  });
  const spine = [...text.matchAll(/<itemref\s[^>]*>/g)].map(
    (match) => attr(match[0], 'idref') ?? '',
  );
  return { path, metadata, manifest, spine };
}

// The text of one element of the OPF metadata, with attributes allowed on its start tag (F20).
function dcText(opf: Opf, name: string): string | undefined {
  const match = new RegExp(
    `<dc:${name}(?:\\s[^>]*)?>([\\s\\S]*?)</dc:${name}>`,
  ).exec(opf.metadata);
  return match?.[1].trim();
}

// The text of the spine files, in spine order, except the nav document: tags removed, whitespace collapsed.
function spineText(bytes: Buffer): string {
  const opf = opfOf(bytes);
  const parts = opf.spine.map((idref) => {
    const item = opf.manifest.find((entry) => entry.id === idref);
    if (item === undefined)
      throw new Error(`spine item ${idref} not in manifest`);
    return item;
  });
  return parts
    .filter((item) => !item.isNav)
    .map((item) =>
      epubPart(bytes, item.path)
        .toString('utf8')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .join(' ');
}

// The texts of the <a> elements inside the toc nav element, in document order.
function navEntries(bytes: Buffer): string[] {
  const opf = opfOf(bytes);
  const nav = opf.manifest.find((item) => item.isNav);
  if (nav === undefined) throw new Error('no nav item in the manifest');
  const text = epubPart(bytes, nav.path).toString('utf8');
  const toc = /<nav\b[^>]*epub:type="toc"[^>]*>([\s\S]*?)<\/nav>/.exec(
    text,
  )?.[1];
  if (toc === undefined) throw new Error('no toc nav element');
  return [...toc.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

// Each token occurs in the text after the one before it.
function expectInOrder(text: string, tokens: string[]): void {
  let from = 0;
  for (const token of tokens) {
    const at = text.indexOf(token, from);
    expect(at, `"${token}" after position ${from}`).toBeGreaterThanOrEqual(0);
    from = at + token.length;
  }
}

itPandoc(
  'criterion 1: the spine and the nav follow the effective order, with the front and back matter in place',
  async () => {
    useFixedClock();
    await withExport(epubFiles(), {}, async (app, cookie) => {
      const posted = await postExport(app, cookie, 'epub');
      expect(posted.status).toBe(200);
      const result = exportResultSchema.parse(JSON.parse(posted.body));
      expect(result.fileName).toBe('book-20261119-1200.epub');
      expect(result.downloadUrl).toBe('/api/compile-export/exports/epub');
      const reply = await binaryDownload(app, cookie, 'epub');
      expect(reply.status).toBe(200);
      expect(String(reply.headers['content-type'])).toBe(EPUB_TYPE);
      expect(reply.bytes.length).toBe(result.bytes);
      expect(reply.bytes.subarray(0, 2).toString('latin1')).toBe('PK');
      expect(navEntries(reply.bytes)).toEqual([
        'Front heading',
        'Zeta chapter',
        'Alpha chapter',
        'Back heading',
      ]);
      expectInOrder(spineText(reply.bytes), [
        'Front heading',
        'Front matter words.',
        'For Sam.',
        'Zeta chapter',
        'Zeta words.',
        'Alpha chapter',
        'Alpha words.',
        'Back heading',
        'Back matter words.',
      ]);
    });
  },
);

itPandoc(
  'criterion 2: the metadata has the title, the author, the language and the identifier',
  async () => {
    useFixedClock();
    await withExport(epubFiles(), {}, async (app, cookie) => {
      const { bytes } = await exportEpub(app, cookie);
      const opf = opfOf(bytes);
      expect(dcText(opf, 'title')).toBe('Book');
      expect(dcText(opf, 'creator')).toBe('A. Writer');
      expect(dcText(opf, 'language')).toBe('en');
      expect(dcText(opf, 'identifier')).toBe('urn:scriba:book');
    });
  },
);

itPandoc(
  'criterion 3: the bibliography is present for a nonfiction fixture and absent when the mode is off',
  async () => {
    useFixedClock();
    const sources = { 'sources/alpha.md': ALPHA_SOURCE };
    // Run A: no bibliography line, so the nonfiction default (all) applies.
    await withExport(
      { ...epubFiles(false), ...sources },
      {},
      async (app, cookie) => {
        const { bytes } = await exportEpub(app, cookie);
        expect(navEntries(bytes).at(-1)).toBe('Bibliography');
        expectInOrder(spineText(bytes), [
          'Back matter words.',
          'Bibliography',
          'Alpha, A. (2001). Title one.',
        ]);
      },
    );
    // Run B: the same files with the bibliography off.
    await withExport(
      { ...epubFiles(true), ...sources },
      {},
      async (app, cookie) => {
        const { bytes } = await exportEpub(app, cookie);
        expect(navEntries(bytes)).not.toContain('Bibliography');
        for (const name of readZip(bytes).keys()) {
          if (!name.endsWith('.xhtml')) continue;
          expect(epubPart(bytes, name).toString('utf8')).not.toContain(
            'Alpha, A.',
          );
        }
      },
    );
  },
);

itPandoc(
  'extra: the built-in stylesheet is written into the EPUB unchanged',
  async () => {
    useFixedClock();
    await withExport(epubFiles(), {}, async (app, cookie) => {
      const { bytes } = await exportEpub(app, cookie);
      const styles = [...readZip(bytes).keys()].filter((name) =>
        name.startsWith('EPUB/styles/'),
      );
      expect(styles.length).toBeGreaterThan(0);
      const written = epubPart(bytes, styles[0]);
      expect(written.equals(readFileSync(EPUB_CSS))).toBe(true);
    });
  },
);

itPandoc(
  'extra: two exports of one project give the same identifier',
  async () => {
    useFixedClock();
    await withExport(epubFiles(), {}, async (app, cookie) => {
      const first = await exportEpub(app, cookie);
      const second = await exportEpub(app, cookie);
      expect(dcText(opfOf(first.bytes), 'identifier')).toBe('urn:scriba:book');
      expect(dcText(opfOf(second.bytes), 'identifier')).toBe('urn:scriba:book');
    });
  },
);

it('extra: the built-in stylesheet is in apps/api/assets', () => {
  expect(existsSync(EPUB_CSS)).toBe(true);
  expect(readFileSync(EPUB_CSS, 'utf8').trim().length).toBeGreaterThan(0);
});
