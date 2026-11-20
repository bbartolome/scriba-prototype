import { describe, expect, vi, afterEach } from 'vitest';
import { exportResultSchema } from '@bbartolome/scriba-contracts/compile-export';
import { snapshotLibrary } from './invariant-sweep';
import { withExport, itPdf, postExport } from './compile-export-export.kit';
import {
  binaryDownload,
  readZip,
  useFixedClock,
} from './compile-export-docx.kit';
import type { TestApp } from './create-test-app';

// The clock is restored after each test (as the other export tests do).
afterEach(() => {
  vi.useRealTimers();
});

// Two chapters, one body paragraph each (the export gate fixture; not the nonfiction sample).
const GATE_FILES: Record<string, string> = {
  'drafts/one.md': '# One\n\nBody words.\n',
  'drafts/two.md': '# Two\n\nMore words.\n',
};

// The content type of each format (the values of CONTENT_TYPES in export.service.ts).
const CONTENT_TYPES: Record<string, string> = {
  md: 'text/markdown; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
};

// The signature check of each format (D6).
function assertSignature(format: string, bytes: Buffer): void {
  if (format === 'md') {
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes.includes(0)).toBe(false);
    expect(() =>
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ).not.toThrow();
  } else if (format === 'docx') {
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(readZip(bytes).has('word/document.xml')).toBe(true);
  } else if (format === 'epub') {
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(bytes.toString('latin1')).toContain('application/epub+zip');
  } else {
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  }
}

describe('compile-export export gate', () => {
  itPdf(
    'criterion 1: Each format exports the fixture project through the HTTP API; the download GET returns the bytes with no side effects.',
    async () => {
      useFixedClock();
      await withExport(
        GATE_FILES,
        {},
        async (app: TestApp, cookie, library) => {
          for (const format of ['md', 'docx', 'epub', 'pdf'] as const) {
            const posted = await postExport(app, cookie, format);
            expect(posted.status).toBe(200);
            const result = exportResultSchema.parse(JSON.parse(posted.body));
            expect(result.format).toBe(format);

            const beforeGet = snapshotLibrary(library);
            const first = await binaryDownload(app, cookie, format);
            expect(first.status).toBe(200);
            expect(String(first.headers['content-type'])).toBe(
              CONTENT_TYPES[format],
            );
            expect(String(first.headers['content-length'])).toBe(
              String(result.bytes),
            );
            expect(first.bytes.length).toBe(result.bytes);
            assertSignature(format, first.bytes);
            expect(snapshotLibrary(library)).toEqual(beforeGet);

            const second = await binaryDownload(app, cookie, format);
            expect(second.status).toBe(200);
            expect(second.bytes.equals(first.bytes)).toBe(true);
          }
        },
      );
    },
  );
});
