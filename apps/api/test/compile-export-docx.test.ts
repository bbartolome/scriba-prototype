import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportResultSchema } from '@bbartolome/scriba-contracts/compile-export';
import {
  withExport,
  itPandoc,
  postExport,
  downloadOf,
} from './compile-export-export.kit';
import {
  binaryDownload,
  C1_FILES,
  C2_FILES,
  DOCX_TYPE,
  matterFiles,
  paragraphsOf,
  readZip,
  useFixedClock,
} from './compile-export-docx.kit';
import type { TestApp } from './create-test-app';

// The clock is restored after each test (D12, as CEX-10 does).
afterEach(() => {
  vi.useRealTimers();
});

const ASSET = resolve(
  __dirname,
  '..',
  'assets',
  'compile-export',
  'reference.docx',
);
const DOCKERFILE = resolve(__dirname, '..', '..', '..', 'Dockerfile');

// One DOCX export and its download: the POST result, the bytes of the download, and the parts of the zip.
async function exportDocx(
  app: TestApp,
  cookie: string,
): Promise<{
  result: ReturnType<typeof exportResultSchema.parse>;
  bytes: Buffer;
}> {
  const posted = await postExport(app, cookie, 'docx');
  expect(posted.status).toBe(200);
  const result = exportResultSchema.parse(JSON.parse(posted.body));
  const reply = await binaryDownload(app, cookie, 'docx');
  expect(reply.status).toBe(200);
  expect(String(reply.headers['content-type'])).toBe(DOCX_TYPE);
  expect(reply.bytes.length).toBe(result.bytes);
  return { result, bytes: reply.bytes };
}

// One part of a zip, read as text. The part must exist.
function partOf(bytes: Buffer, name: string): string {
  const part = readZip(bytes).get(name);
  if (part === undefined) throw new Error(`missing part ${name}`);
  return part.toString('utf8');
}

// The index of the first paragraph with the style and text, or -1.
function indexOfParagraph(xml: string, text: string, style?: string): number {
  return paragraphsOf(xml).findIndex(
    (paragraph) =>
      paragraph.text === text &&
      (style === undefined || paragraph.style === style),
  );
}

// Each index is found and each one comes after the one before it.
function expectInOrder(indexes: number[]): void {
  indexes.forEach((index, i) => {
    expect(index).toBeGreaterThanOrEqual(0);
    if (i > 0) expect(index).toBeGreaterThan(indexes[i - 1]);
  });
}

describe('compile-export DOCX', () => {
  // Criterion 1 (unit line 19): chapters in effective order; styles from the built-in reference. The override
  // clause is CEX-14's criterion 2 and is not tested here (O2).
  itPandoc(
    'criterion 1: the DOCX lists the chapters in effective order and takes its styles from the built-in reference',
    async () => {
      useFixedClock();
      await withExport(C1_FILES, {}, async (app, cookie) => {
        const { result, bytes } = await exportDocx(app, cookie);
        expect(result.fileName).toBe('book-20261119-1200.docx');
        expect(result.downloadUrl).toBe('/api/compile-export/exports/docx');
        expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');

        const document = partOf(bytes, 'word/document.xml');
        const headings = paragraphsOf(document)
          .filter((paragraph) => paragraph.style === 'Heading1')
          .map((paragraph) => paragraph.text);
        expect(headings).toEqual(['Zeta chapter', 'Alpha chapter']);

        const styles = partOf(bytes, 'word/styles.xml');
        expect(styles).toContain('Times New Roman');
        expect(styles).toContain('w:styleId="Heading1"');
      });
    },
  );

  // Criterion 2 (unit line 20): the title page carries the author, the contact block and the rounded word count.
  itPandoc(
    'criterion 2: the title page carries the author, the contact block and the word count rounded to 1,000',
    async () => {
      useFixedClock();
      await withExport(C2_FILES, {}, async (app, cookie) => {
        const { bytes } = await exportDocx(app, cookie);
        const document = partOf(bytes, 'word/document.xml');
        expectInOrder([
          indexOfParagraph(document, 'A. Writer', 'Author'),
          indexOfParagraph(document, '12 Lane Road', 'ContactBlock'),
          indexOfParagraph(document, 'About 3,000 words', 'WordCount'),
          indexOfParagraph(document, 'One', 'Heading1'),
        ]);

        const posted = await postExport(app, cookie, 'md');
        expect(posted.status).toBe(200);
        const markdown = await downloadOf(app, cookie, 'md');
        expect(markdown.body).toContain('wordcount: 3000');
      });
    },
  );

  // Criterion 3 (unit line 21): front matter, dedication, body and back matter in their places.
  itPandoc(
    'criterion 3: front matter, the dedication, the body and the back matter appear in that order',
    async () => {
      useFixedClock();
      await withExport(matterFiles(), {}, async (app, cookie) => {
        const { bytes } = await exportDocx(app, cookie);
        const document = partOf(bytes, 'word/document.xml');
        const texts = paragraphsOf(document).map((paragraph) => paragraph.text);
        expectInOrder(
          [
            'Front matter words.',
            'For Sam.',
            'One',
            'Body words.',
            'Back matter words.',
          ].map((text) => texts.indexOf(text)),
        );
      });
    },
  );

  // Extra E1 (U2 layout, no criterion): the reference sets the layout, and Pandoc keeps it (A2 to A4).
  itPandoc(
    'extra: the built-in reference sets the layout: 12 pt, double spacing, first-line indent, chapter page breaks, 1-inch margins, a page break after the title block',
    async () => {
      useFixedClock();
      await withExport(matterFiles(), {}, async (app, cookie) => {
        const { bytes } = await exportDocx(app, cookie);
        const styles = partOf(bytes, 'word/styles.xml');
        expect(styles).toContain('w:sz w:val="24"');
        expect(styles).toMatch(/<w:spacing [^>]*w:line="480"/);
        expect(styles).toContain('w:firstLine="720"');
        const heading =
          /<w:style [^>]*w:styleId="Heading1"[\s\S]*?<\/w:style>/.exec(styles);
        expect(heading?.[0]).toContain('pageBreakBefore');

        const document = partOf(bytes, 'word/document.xml');
        const margins = /<w:pgMar [^>]*\/>/.exec(document)?.[0] ?? '';
        for (const side of ['top', 'bottom', 'left', 'right']) {
          expect(margins).toContain(`w:${side}="1440"`);
        }
        const pageBreak = document.indexOf('w:br w:type="page"');
        expect(pageBreak).toBeGreaterThan(-1);
        expect(pageBreak).toBeLessThan(document.indexOf('Front matter words.'));
      });
    },
  );

  // Extra E2 (U2 running header, D14): the header carries the surname, the short title and the page number.
  itPandoc(
    'extra: the running header carries the surname, the short title and the page number',
    async () => {
      useFixedClock();
      await withExport(
        matterFiles({ author: 'A. Writer', title: 'Book: A Story' }),
        {},
        async (app, cookie) => {
          const { bytes } = await exportDocx(app, cookie);
          const names = [...readZip(bytes).keys()];
          const headerName = names.find((name) =>
            /^word\/header\d*\.xml$/.test(name),
          );
          expect(headerName).toBeDefined();
          const header = partOf(bytes, headerName ?? '');
          expectInOrder(
            ['DOCPROPERTY surname', 'DOCPROPERTY shorttitle', 'PAGE '].map(
              (field) => header.indexOf(field),
            ),
          );
          expect(partOf(bytes, 'word/document.xml')).toContain(
            'w:headerReference',
          );

          const custom = partOf(bytes, 'docProps/custom.xml');
          const surname =
            /name="surname"[\s\S]*?<vt:lpwstr>([^<]*)<\/vt:lpwstr>/.exec(
              custom,
            );
          const shortTitle =
            /name="shorttitle"[\s\S]*?<vt:lpwstr>([^<]*)<\/vt:lpwstr>/.exec(
              custom,
            );
          expect(surname?.[1]).toBe('Writer');
          expect(shortTitle?.[1]).toBe('Book');

          expect(partOf(bytes, 'word/settings.xml')).toContain(
            'w:updateFields',
          );
        },
      );
    },
  );

  // Extra E3 (D2 and U2, the image): the asset is in apps/api/assets, and the Dockerfile copies that folder.
  it('extra: the built-in reference is in apps/api/assets and the Dockerfile copies that folder into the image', () => {
    expect(existsSync(ASSET)).toBe(true);
    const zip = readZip(readFileSync(ASSET));
    expect(zip.has('word/styles.xml')).toBe(true);
    expect(zip.has('word/document.xml')).toBe(true);

    const copies = readFileSync(DOCKERFILE, 'utf8')
      .split('\n')
      .filter((line) =>
        line.includes('cp -a apps/api/assets /out/app/apps/api/'),
      );
    expect(copies).toHaveLength(1);
  });
});
