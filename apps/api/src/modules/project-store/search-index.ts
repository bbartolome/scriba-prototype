import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// The format of the index file, kept in PRAGMA user_version (P4). A file whose user_version differs is rebuilt
// when it is opened (P5). Change this value when the schema or the passage rules change.
export const SEARCH_INDEX_FORMAT = 1;

// One passage of a file: its text, and the UTF-16 offset of its first character in the text (P6, P7, P8).
export interface Passage {
  body: string;
  offset: number;
}

// The index file of one project: the percent-encoded id and the .db extension (P1).
export function indexFileName(projectId: string): string {
  return `${encodeURIComponent(projectId)}.db`;
}

// One line of a text: its offsets in the text, and its content without the line feed (P6).
interface Line {
  start: number;
  end: number;
  text: string;
}

const BOM = '﻿';
const FENCE = '---';
const LIST_ITEM = /^\s*-(?:\s+|$)/;
const KEY = /^\s*[^\s#:][^:]*:(?:\s+|$)/;
const BLOCK_SCALAR = /^[|>][-+]?$/;

// The lines of a text from an offset on. The last line may be empty.
function linesOf(text: string, from: number): Line[] {
  const lines: Line[] = [];
  let start = from;
  let end = text.indexOf('\n', start);
  while (end !== -1) {
    lines.push({ start, end, text: text.slice(start, end) });
    start = end + 1;
    end = text.indexOf('\n', start);
  }
  lines.push({ start, end: text.length, text: text.slice(start) });
  return lines;
}

// True for a line that is exactly the fence, with a trailing carriage return ignored (S11).
function isFence(line: Line): boolean {
  return line.text.replace(/\r$/, '') === FENCE;
}

// The passage of one front-matter line, or undefined when the line gives none (P7). A value is the text after
// `key:` or after `- `, or the whole line when it is a continuation. Keys, comments and block-scalar indicators
// give nothing.
function frontMatterPassage(line: Line): Passage | undefined {
  const raw = line.text.replace(/\r$/, '');
  if (raw.trim() === '' || raw.trimStart().startsWith('#')) return undefined;
  const marker = LIST_ITEM.exec(raw) ?? KEY.exec(raw);
  const from = marker === null ? 0 : marker[0].length;
  const tail = raw.slice(from);
  const value = tail.trim();
  if (value === '' || BLOCK_SCALAR.test(value)) return undefined;
  return {
    body: value,
    offset: line.start + from + (tail.length - tail.trimStart().length),
  };
}

// The passage of a block of lines: the exact text from its first non-space character to its last one (P6).
function blockPassage(text: string, block: Line[]): Passage {
  const first = block[0];
  const last = block[block.length - 1];
  const start =
    first.start + (first.text.length - first.text.trimStart().length);
  const end = last.end - (last.text.length - last.text.trimEnd().length);
  return { body: text.slice(start, end), offset: start };
}

// The passages of a text (P6, P7). One leading BOM is skipped for the parse, but the offsets count it (P8). The
// front matter gives one passage per value; the body is split into blocks of lines that are not blank.
export function chunkText(text: string): Passage[] {
  const from = text.startsWith(BOM) ? BOM.length : 0;
  const lines = linesOf(text, from);
  const passages: Passage[] = [];
  let bodyFrom = 0;
  if (isFence(lines[0])) {
    const close = lines.findIndex((line, index) => index > 0 && isFence(line));
    if (close !== -1) {
      for (const line of lines.slice(1, close)) {
        const passage = frontMatterPassage(line);
        if (passage !== undefined) passages.push(passage);
      }
      bodyFrom = close + 1;
    }
  }
  let block: Line[] = [];
  const flush = (): void => {
    if (block.length > 0) passages.push(blockPassage(text, block));
    block = [];
  };
  for (const line of lines.slice(bodyFrom)) {
    if (line.text.trim() === '') flush();
    else block.push(line);
  }
  flush();
  return passages;
}

// The FTS5 query of the author's text (P11): NUL characters removed, the text split on whitespace, each piece
// quoted with its double quotes doubled, and the pieces joined with OR. A text with no piece gives ''.
export function buildMatchQuery(text: string): string {
  return text
    .replaceAll('\u0000', '')
    .split(/\s+/)
    .filter((piece) => piece !== '')
    .map((piece) => `"${piece.replaceAll('"', '""')}"`)
    .join(' OR ');
}

// The open index when the file opens and carries SEARCH_INDEX_FORMAT, otherwise undefined (P5).
function openCurrent(file: string): DatabaseSync | undefined {
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(file);
    const row = db.prepare('PRAGMA user_version').get();
    if (Number(row?.user_version) === SEARCH_INDEX_FORMAT) return db;
  } catch {
    // A file that cannot be read is rebuilt by the caller.
  }
  db?.close();
  return undefined;
}

// A new, empty index: the P4 schema, created in one transaction with the format version.
function createIndex(file: string): DatabaseSync {
  const db = new DatabaseSync(file);
  try {
    db.exec(`BEGIN;
CREATE TABLE files (path TEXT PRIMARY KEY, mtime REAL NOT NULL, size INTEGER NOT NULL);
CREATE VIRTUAL TABLE passages USING fts5(body, path UNINDEXED, char_offset UNINDEXED, tokenize = 'porter unicode61');
PRAGMA user_version = ${SEARCH_INDEX_FORMAT};
COMMIT;`);
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

// Opens the index file of a project for one operation, creating the folder and the file when they are missing
// (P2, P5). A file that cannot be opened, or whose format differs, is deleted with its journal and created
// anew, empty. The caller fills it and closes it.
export function openIndex(file: string): DatabaseSync {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const current = openCurrent(file);
  if (current !== undefined) return current;
  rmSync(file, { force: true });
  rmSync(`${file}-journal`, { force: true });
  return createIndex(file);
}
