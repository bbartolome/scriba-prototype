import { inflateRawSync } from 'node:zlib';
import { request as httpRequest } from 'node:http';
import { vi } from 'vitest';
import type { TestApp } from './create-test-app';
import { LOOPBACK_HOST } from './invariant-sweep';

// The content type of a DOCX download (the wire value; the service keeps the same string).
export const DOCX_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// The clock of the DOCX tests (D12): the file name and the date line of the title page follow it.
export function useFixedClock(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
}

// Reads every entry of a zip (D9). Method 8 is inflated, method 0 is stored; other methods are not expected.
export function readZip(bytes: Buffer): Map<string, Buffer> {
  const eocd = findEndOfCentralDirectory(bytes);
  const count = bytes.readUInt16LE(eocd + 10);
  let pos = bytes.readUInt32LE(eocd + 16);
  const entries = new Map<string, Buffer>();
  for (let i = 0; i < count; i += 1) {
    if (bytes.readUInt32LE(pos) !== 0x02014b50) {
      throw new Error('zip: bad central directory entry');
    }
    const method = bytes.readUInt16LE(pos + 10);
    const compressedSize = bytes.readUInt32LE(pos + 20);
    const nameLength = bytes.readUInt16LE(pos + 28);
    const extraLength = bytes.readUInt16LE(pos + 30);
    const commentLength = bytes.readUInt16LE(pos + 32);
    const localOffset = bytes.readUInt32LE(pos + 42);
    const name = bytes
      .subarray(pos + 46, pos + 46 + nameLength)
      .toString('utf8');
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('zip: bad local header');
    }
    const localName = bytes.readUInt16LE(localOffset + 26);
    const localExtra = bytes.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localName + localExtra;
    const data = bytes.subarray(start, start + compressedSize);
    if (method === 8) entries.set(name, inflateRawSync(data));
    else if (method === 0) entries.set(name, Buffer.from(data));
    else throw new Error(`zip: unsupported method ${method}`);
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

// The end-of-central-directory record is within the last 64 KiB plus its own 22 bytes.
function findEndOfCentralDirectory(bytes: Buffer): number {
  const floor = Math.max(0, bytes.length - 65557);
  for (let pos = bytes.length - 22; pos >= floor; pos -= 1) {
    if (bytes.readUInt32LE(pos) === 0x06054b50) return pos;
  }
  throw new Error('zip: no end of central directory');
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

function decode(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (match) => ENTITIES[match]);
}

// The paragraphs of a WordprocessingML part, in document order: the style ID when set, and the text of its runs (D10).
export function paragraphsOf(xml: string): { style?: string; text: string }[] {
  const paragraphs: { style?: string; text: string }[] = [];
  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const body = match[1];
    const style = /<w:pStyle w:val="([^"]+)"/.exec(body)?.[1];
    const text = [...body.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
      .map((run) => decode(run[1]))
      .join('');
    paragraphs.push(style === undefined ? { text } : { style, text });
  }
  return paragraphs;
}

// The text of each paragraph with the given style, in order.
export function textsOf(xml: string, style: string): string[] {
  return paragraphsOf(xml)
    .filter((paragraph) => paragraph.style === style)
    .map((paragraph) => paragraph.text);
}

export interface BinaryReply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  bytes: Buffer;
}

// One GET of the download route that keeps the body as bytes (D11). Same Host and cookie as the text helper.
export function binaryDownload(
  app: TestApp,
  cookie: string,
  format: string,
): Promise<BinaryReply> {
  const { hostname, port } = new URL(app.baseUrl);
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname,
        port,
        path: `/api/compile-export/exports/${format}`,
        method: 'GET',
        headers: { Host: LOOPBACK_HOST, Cookie: cookie },
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            bytes: Buffer.concat(chunks),
          });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

// A body of `count` repeated `word` tokens (P4): under CEX-02's rule it counts as `count` words.
export function wordsBody(count: number): string {
  return Array(count).fill('word').join(' ');
}

// The C1 fixture (plan section 4): two body files in the order of `order:`, zeta before alpha, bibliography off.
export const C1_FILES: Record<string, string> = {
  'project.yaml': [
    'schemaVersion: 1',
    'title: Book',
    'genrePack: nonfiction',
    'export:',
    '  bibliography: off',
    'order:',
    '  - path: drafts/zeta.md',
    '    part: body',
    '  - path: drafts/alpha.md',
    '    part: body',
    '',
  ].join('\n'),
  'drafts/zeta.md': '# Zeta chapter\n\nZeta words.\n',
  'drafts/alpha.md': '# Alpha chapter\n\nAlpha words.\n',
};

// The C2 fixture: one body file of 2,600 words plus its heading (2,601 words, rounded to 3,000).
export const C2_FILES: Record<string, string> = {
  'project.yaml': [
    'schemaVersion: 1',
    'title: Book',
    'genrePack: nonfiction',
    'export:',
    '  author: A. Writer',
    '  contact: 12 Lane Road',
    '  bibliography: off',
    '',
  ].join('\n'),
  'drafts/one.md': `# One\n\n${wordsBody(2600)}\n`,
};

// The C3 fixture: front matter, a dedication, one body file and back matter, in `order:`. The options set the author
// and the project title (E2 uses both); the default title is Book.
export function matterFiles(
  options: { title?: string; author?: string } = {},
): Record<string, string> {
  const exportLines = ['  dedication: For Sam.', '  bibliography: off'];
  if (options.author !== undefined) {
    exportLines.unshift(`  author: ${JSON.stringify(options.author)}`);
  }
  const title = options.title ?? 'Book';
  return {
    'project.yaml': [
      'schemaVersion: 1',
      `title: ${JSON.stringify(title)}`,
      'genrePack: nonfiction',
      'export:',
      ...exportLines,
      'order:',
      '  - path: drafts/front.md',
      '    part: front',
      '  - path: drafts/one.md',
      '    part: body',
      '  - path: drafts/back.md',
      '    part: back',
      '',
    ].join('\n'),
    'drafts/front.md': 'Front matter words.\n',
    'drafts/one.md': '# One\n\nBody words.\n',
    'drafts/back.md': 'Back matter words.\n',
  };
}
