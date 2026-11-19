import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportResultSchema } from '@bbartolome/scriba-contracts/compile-export';
import { withExport, itPdf, postExport } from './compile-export-export.kit';
import { binaryDownload, useFixedClock } from './compile-export-docx.kit';
import type { TestApp } from './create-test-app';

// The clock is restored after each test (D12, as the DOCX tests do).
afterEach(() => {
  vi.useRealTimers();
});

const PDF_TYPE = 'application/pdf';

// The PDF fixture: one chapter, bibliography off, no order (D7).
const PDF_FILES: Record<string, string> = {
  'project.yaml': [
    'schemaVersion: 1',
    'title: Book',
    'genrePack: nonfiction',
    'export:',
    '  bibliography: off',
    '',
  ].join('\n'),
  'drafts/one.md': '# One\n\nBody words.\n',
};

const TEMPLATE = resolve(
  __dirname,
  '..',
  'assets',
  'compile-export',
  'typst-template.typst',
);

describe('compile-export PDF', () => {
  itPdf(
    'criterion 1: The PDF output starts with %PDF- and is produced via --pdf-engine=typst',
    async () => {
      useFixedClock();
      await withExport(PDF_FILES, {}, async (app: TestApp, cookie) => {
        const posted = await postExport(app, cookie, 'pdf');
        expect(posted.status).toBe(200);
        const result = exportResultSchema.parse(JSON.parse(posted.body));
        expect(result.fileName).toBe('book-20261119-1200.pdf');
        expect(result.downloadUrl).toBe('/api/compile-export/exports/pdf');

        const reply = await binaryDownload(app, cookie, 'pdf');
        expect(reply.status).toBe(200);
        expect(String(reply.headers['content-type'])).toBe(PDF_TYPE);
        expect(reply.bytes.length).toBe(result.bytes);
        expect(reply.bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        // Typst writes its name as the Creator (F17, F27); no TeX runs here.
        expect(reply.bytes.toString('latin1')).toMatch(/\/Creator\s*\(Typst /);
      });
    },
  );
});

// Extra E1 (D2): the built-in template is self-contained, keeps the body placeholder and the TOC block, and sets
// the chapter break between the TOC and the body. It needs no Pandoc or Typst.
describe('compile-export PDF template', () => {
  it('extra: the built-in Typst template is self-contained, keeps the body placeholder and the TOC block, and sets the chapter break', () => {
    const lines = readFileSync(TEMPLATE, 'utf8').split('\n');
    const at = (text: string): number[] =>
      lines.flatMap((line, i) => (line === text ? [i] : []));
    const body = at('$body$');
    const toc = at('$if(toc)$');
    const breaks = at(
      '#show heading.where(level: 1): it => { pagebreak(weak: true); it }',
    );

    expect(body).toHaveLength(1);
    expect(toc).toHaveLength(1);
    expect(breaks).toHaveLength(1);
    expect(lines.join('\n')).not.toContain('template.typst()');
    expect(toc[0]).toBeLessThan(breaks[0]);
    expect(breaks[0]).toBeLessThan(body[0]);
  });
});
