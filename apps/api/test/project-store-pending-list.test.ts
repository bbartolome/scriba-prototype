import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  PROJECT_PENDING_ROUTE,
  pendingChangeSchema,
  pendingListSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import { bookLibrary, fileUrl } from './project-store-files.kit';
import { pendingKitModule } from './project-store-pending.kit';
import { withProjectsApp, type ErrorBody } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. The changes are proposed through the kit module; the
// queue is read through the composed app's GET route.

const KIT = '/api/project-store-test/pending/propose';

interface KitReply {
  status: number;
  text: string;
}

// One propose call of the kit module, with no cookie (the kit app has no guard).
async function propose(
  baseUrl: string,
  body: Record<string, unknown>,
): Promise<KitReply> {
  const response = await fetch(baseUrl + KIT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

// One GET of the queue route, with the loopback Host and the session cookie.
function listChanges(
  app: TestApp,
  cookie: string,
  projectId: string,
  query: Record<string, string> = {},
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: fileUrl(PROJECT_PENDING_ROUTE, projectId, query),
  });
}

it('L1: the queue lists the open changes of the active project, filters by run, refuses a non-active project, and creates nothing', async () => {
  const fixture = bookLibrary();
  try {
    // Three changes proposed through the kit app, then the kit app is closed.
    const ids: string[] = [];
    const kit = await createTestApp({
      libraryDir: fixture.library,
      modules: [pendingKitModule()],
    });
    try {
      const proposals = [
        {
          path: 'sources/outline.md',
          content: 'One\n',
          origin: { kind: 'agent-run', runId: 'r1' },
        },
        {
          path: 'sources/notes.md',
          content: 'Two\n',
          origin: { kind: 'agent-run', runId: 'r1' },
        },
        {
          path: 'sources/new.md',
          content: 'Three\n',
          origin: { kind: 'agent-run', runId: 'r2' },
        },
      ];
      for (const proposal of proposals) {
        const reply = await propose(kit.baseUrl, {
          projectId: 'book',
          ...proposal,
        });
        expect(reply.status).toBe(200);
        ids.push((JSON.parse(reply.text) as PendingChange).id);
      }
    } finally {
      await kit.close();
    }
    const sortedIds = [...ids].sort();

    await withProjectsApp(fixture, async (app, cookie) => {
      // (a) All three, in ascending id order, each one a valid change.
      const all = await listChanges(app, cookie, 'book');
      expect(all.status).toBe(200);
      const list = pendingListSchema.parse(JSON.parse(all.body));
      expect(list.changes.map((change) => change.id)).toEqual(sortedIds);
      for (const change of list.changes) {
        expect(pendingChangeSchema.safeParse(change).success).toBe(true);
      }

      // (b) The run filter keeps the changes of one run, and an unknown run gives an empty list.
      const r1 = await listChanges(app, cookie, 'book', { run: 'r1' });
      expect(r1.status).toBe(200);
      const r1Changes = pendingListSchema.parse(JSON.parse(r1.body)).changes;
      expect(r1Changes).toHaveLength(2);
      expect(r1Changes.every((change) => change.origin.runId === 'r1')).toBe(
        true,
      );

      const none = await listChanges(app, cookie, 'book', { run: 'none' });
      expect(none.status).toBe(200);
      expect(JSON.parse(none.body)).toEqual({ changes: [] });

      // (c) A project that is not the active one is refused before its folder is read.
      const refused = await listChanges(app, cookie, 'draft-only');
      expect(refused.status).toBe(409);
      expect((JSON.parse(refused.body) as ErrorBody).error.code).toBe(
        'PROJECT_NOT_ACTIVE',
      );
    });
  } finally {
    fixture.remove();
  }
});

it('L1(d): on a library with no changes the queue is empty, and the GET creates no .scriba folder', async () => {
  const fixture = bookLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await listChanges(app, cookie, 'book');
      expect(reply.status).toBe(200);
      expect(JSON.parse(reply.body)).toEqual({ changes: [] });
    });
    expect(existsSync(join(fixture.library, 'book', '.scriba'))).toBe(false);
  } finally {
    fixture.remove();
  }
});
