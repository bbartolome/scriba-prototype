import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  PROJECT_REBUILD_ROUTE,
  PROJECT_SEARCH_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import type { TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import { postJson } from './project-store-projects.kit';

// One passage row of a test-built index file (P4): its file, its character offset and its text.
export interface PassageRow {
  path: string;
  offset: number;
  body: string;
}

// The URL of a project-scoped search or rebuild route. The project id is percent-encoded (P18).
export function searchUrl(projectId: string): string {
  return PROJECT_SEARCH_ROUTE.replace(
    ':projectId',
    encodeURIComponent(projectId),
  );
}

// One POST of the search route, with the body sent as given.
export function search(
  app: TestApp,
  cookie: string,
  projectId: string,
  body: unknown,
): Promise<Reply> {
  return postJson(app, cookie, searchUrl(projectId), body);
}

// One POST of the rebuild route, which has no body.
export function rebuild(
  app: TestApp,
  cookie: string,
  projectId: string,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path: PROJECT_REBUILD_ROUTE.replace(
      ':projectId',
      encodeURIComponent(projectId),
    ),
  });
}

// The folder of the index files of a library: .scriba/index (P1, P2).
export function indexFolder(library: string): string {
  return join(library, '.scriba', 'index');
}

// The user_version of an index file, read without creating the file.
export function readUserVersion(file: string): number {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const row = db.prepare('PRAGMA user_version').get();
    return Number(row?.user_version);
  } finally {
    db.close();
  }
}

// Replaces an index file with a test-built SQLite file: the P4 schema, an empty files table, the given
// passages and the given user_version.
export function writeIndexDb(
  file: string,
  version: number,
  passages: PassageRow[],
): void {
  rmSync(file, { force: true });
  const db = new DatabaseSync(file);
  try {
    db.exec(
      'CREATE TABLE files (path TEXT PRIMARY KEY, mtime REAL NOT NULL, size INTEGER NOT NULL);' +
        "CREATE VIRTUAL TABLE passages USING fts5(body, path UNINDEXED, char_offset UNINDEXED, tokenize = 'porter unicode61');",
    );
    const insert = db.prepare(
      'INSERT INTO passages (body, path, char_offset) VALUES (?, ?, ?)',
    );
    for (const passage of passages) {
      insert.run(passage.body, passage.path, passage.offset);
    }
    db.exec(`PRAGMA user_version = ${Math.trunc(version)}`);
  } finally {
    db.close();
  }
}
