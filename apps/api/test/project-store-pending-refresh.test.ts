import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  PROJECT_PENDING_ROUTE,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { dataOf, openSse, type OpenSse } from './sse';
import {
  bookLibrary,
  fileUrl,
  putFile,
  sha256Of,
} from './project-store-files.kit';
import {
  addOkProject,
  postJsonPlain,
  type PlainReply,
} from './project-store-active.kit';
import { pendingKitModule } from './project-store-pending.kit';
import type { ErrorBody } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Propose goes through the kit module, which has no guard.
// Refresh and accept anyway go through their real paths on the same app. The event stream is GET /events on that
// app. The host edits the disk directly, because no POST touches the target.

const KIT = '/api/project-store-test/pending/propose';
const REGISTER_GRAPH = '/api/project-store-test/pending/register-graph-validator';
const BOOK = 'book';
const PENDING = fileUrl(PROJECT_PENDING_ROUTE, BOOK);
const ACCEPT = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/accept`;
const REJECT = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/reject`;
const REFRESH = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/refresh`;

interface PendingEvent {
  type: string;
  data: { projectId: string; paths?: string[]; pendingChange?: PendingChange };
}

// The hello block of the stream, then one event at a time.
async function nextEvent(
  stream: OpenSse,
  timeoutMs = 2000,
): Promise<PendingEvent> {
  return JSON.parse(dataOf(await stream.next(timeoutMs))) as PendingEvent;
}

// Boots the kit module on the library, and closes the app in every case.
async function withKit(
  library: string,
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: library,
    modules: [pendingKitModule()],
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

// Proposes a change through the kit module and returns the change.
async function propose(
  app: TestApp,
  input: {
    projectId?: string;
    path: string;
    content: string;
    origin?: { kind: 'agent-run'; runId: string };
  },
): Promise<PendingChange> {
  const response = await fetch(app.baseUrl + KIT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectId: BOOK,
      origin: { kind: 'agent-run', runId: 'r1' },
      ...input,
    }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as PendingChange;
}

// The open change files of a project, in name order.
function openFiles(library: string, projectId = BOOK): string[] {
  const folder = join(library, projectId, '.scriba', 'pending');
  return existsSync(folder)
    ? readdirSync(folder)
        .filter((name) => name.endsWith('.json'))
        .sort()
    : [];
}

// Every file under a folder, recursively, with its name and SHA-256 (in name order). Empty when the folder is absent.
function snapshot(folder: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        const digest = createHash('sha256')
          .update(readFileSync(path))
          .digest('hex');
        out.push(`${path}:${digest}`);
      }
    }
  };
  try {
    statSync(folder);
    walk(folder);
  } catch {
    return [];
  }
  return out.sort();
}

// One POST with no body and no content type.
async function postEmpty(baseUrl: string, path: string): Promise<PlainReply> {
  const response = await fetch(baseUrl + path, { method: 'POST' });
  const text = await response.text();
  return { status: response.status, json: JSON.parse(text) as unknown };
}

function errorOf(reply: PlainReply): ErrorBody['error'] {
  return (reply.json as ErrorBody).error;
}

const OUTLINE = join('sources', 'outline.md');
const PENDING_FOLDER = (library: string, projectId = BOOK): string =>
  join(library, projectId, '.scriba', 'pending');

it('T1 (criterion line 23): refresh clears a conflict when host and proposal edit different paragraphs, and the merged text has both', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, OUTLINE);
    const base = '# Outline\n\nFirst point.\n\nSecond point.\n\nThird point.\n';
    const proposed =
      '# Outline\n\nFirst point.\n\nSecond point.\n\nThird point, revised.\n';
    const host =
      '# Outline\n\nFirst point, host edit.\n\nSecond point.\n\nThird point.\n';
    const merged =
      '# Outline\n\nFirst point, host edit.\n\nSecond point.\n\nThird point, revised.\n';
    writeFileSync(target, base);
    await withKit(fixture.library, async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const change = await propose(app, {
          path: 'sources/outline.md',
          content: proposed,
        });
        expect((await nextEvent(stream)).type).toBe('pending-created');

        writeFileSync(target, host);
        const reply = await postEmpty(app.baseUrl, REFRESH(change.id));
        expect(reply.status).toBe(200);
        const refreshed = reply.json as PendingChange;
        expect(refreshed.conflict).toBeNull();
        expect(refreshed.proposed).toBe(merged);
        expect(refreshed.capturedBase).toEqual({
          hash: sha256Of(host),
          content: host,
        });

        const updated = await nextEvent(stream);
        expect(updated.type).toBe('pending-updated');
        expect(updated.data.pendingChange).toEqual(refreshed);

        // The refresh wrote nothing to the target.
        expect(readFileSync(target, 'utf8')).toBe(host);

        // The accept with no edit writes the merged text.
        const accepted = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
        expect(accepted.status).toBe(200);
        expect(readFileSync(target, 'utf8')).toBe(merged);
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('T2 (criterion line 24): refresh keeps the conflict when host and proposal overlap, and leaves the change unchanged', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, OUTLINE);
    const base = '# Outline\n\nFirst point.\n\nSecond point.\n\nThird point.\n';
    const proposed =
      '# Outline\n\nFirst point.\n\nSecond point, agent.\n\nThird point.\n';
    const host =
      '# Outline\n\nFirst point.\n\nSecond point, host.\n\nThird point.\n';
    writeFileSync(target, base);
    await withKit(fixture.library, async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const change = await propose(app, {
          path: 'sources/outline.md',
          content: proposed,
        });
        expect((await nextEvent(stream)).type).toBe('pending-created');

        writeFileSync(target, host);
        const reply = await postEmpty(app.baseUrl, REFRESH(change.id));
        expect(reply.status).toBe(200);
        const refreshed = reply.json as PendingChange;
        expect(refreshed.conflict?.reason).toBe('base-changed');

        // D9: everything but the conflict is as it was before the refresh.
        expect(refreshed.proposed).toBe(change.proposed);
        expect(refreshed.capturedBase).toEqual(change.capturedBase);
        expect(refreshed.diff).toBe(change.diff);
        expect(refreshed.status).toBe(change.status);
        expect(refreshed.createdAt).toBe(change.createdAt);
        expect(refreshed.updatedAt).toBe(change.updatedAt);

        // Exactly one pending-updated: the stored reason changed from null.
        const updated = await nextEvent(stream);
        expect(updated.type).toBe('pending-updated');
        expect(updated.data.pendingChange).toEqual(refreshed);
        await expect(stream.next(500)).rejects.toThrow();

        expect(readFileSync(target, 'utf8')).toBe(host);

        const refused = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
        expect(refused.status).toBe(409);
        const error = errorOf(refused);
        expect(error.code).toBe('PROJECT_PENDING_CONFLICT');
        expect(error.details).toEqual({ reason: 'base-changed' });
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X1a: refresh of a resolved change is PROJECT_PENDING_NOT_OPEN; an unknown or malformed id is PROJECT_NOT_FOUND', async () => {
  const fixture = bookLibrary();
  try {
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      const rejected = await postEmpty(app.baseUrl, REJECT(change.id));
      expect(rejected.status).toBe(200);

      const resolved = await postEmpty(app.baseUrl, REFRESH(change.id));
      expect(resolved.status).toBe(409);
      expect(errorOf(resolved).code).toBe('PROJECT_PENDING_NOT_OPEN');

      const unknown = await postEmpty(
        app.baseUrl,
        REFRESH('20260101T000000000Z-000000'),
      );
      expect(unknown.status).toBe(404);
      expect(errorOf(unknown).code).toBe('PROJECT_NOT_FOUND');

      const slashed = await postEmpty(app.baseUrl, REFRESH('a%2Fb'));
      expect(slashed.status).toBe(404);
      expect(errorOf(slashed).code).toBe('PROJECT_NOT_FOUND');
    });
  } finally {
    fixture.remove();
  }
});

it('X2a: refresh in a project that is not active is PROJECT_NOT_ACTIVE, changes nothing, and the change stays open', async () => {
  const fixture = bookLibrary();
  try {
    addOkProject(fixture.library, 'second');
    const secondRoot = join(fixture.library, 'second');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        projectId: 'second',
        path: 'sources/new.md',
        content: 'N\n',
      });
      const before = snapshot(secondRoot);

      const reply = await postEmpty(
        app.baseUrl,
        REFRESH(change.id, 'second'),
      );
      expect(reply.status).toBe(409);
      expect(errorOf(reply).code).toBe('PROJECT_NOT_ACTIVE');

      expect(snapshot(secondRoot)).toEqual(before);
      expect(openFiles(fixture.library, 'second')).toEqual([`${change.id}.json`]);
    });
  } finally {
    fixture.remove();
  }
});

it('X3 (case 3): refresh of a deleted modify target answers target-missing; of a create whose target the host wrote answers target-exists; no file is written', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, OUTLINE);
    const created = join(fixture.library, BOOK, 'sources', 'new.md');
    writeFileSync(target, '# Outline\n');
    await withKit(fixture.library, async (app) => {
      // (a) The host deletes the target of a modify.
      const modify = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      unlinkSync(target);
      const missing = await postEmpty(app.baseUrl, REFRESH(modify.id));
      expect(missing.status).toBe(200);
      expect((missing.json as PendingChange).conflict?.reason).toBe(
        'target-missing',
      );
      expect(existsSync(target)).toBe(false);
      const stored = missing.json as PendingChange;
      expect(stored.proposed).toBe(modify.proposed);
      expect(stored.capturedBase).toEqual(modify.capturedBase);

      // (b) The host writes the target of a create.
      const create = await propose(app, {
        path: 'sources/new.md',
        content: 'N\n',
      });
      expect(create.kind).toBe('create');
      writeFileSync(created, 'H\n');
      const exists = await postEmpty(app.baseUrl, REFRESH(create.id));
      expect(exists.status).toBe(200);
      expect((exists.json as PendingChange).conflict?.reason).toBe(
        'target-exists',
      );
      expect(readFileSync(created, 'utf8')).toBe('H\n');
      expect((exists.json as PendingChange).proposed).toBe('N\n');
    });
  } finally {
    fixture.remove();
  }
});

it('X4 (cases 2 and 1): a refused accept stores base-changed; refresh after the host restores the bytes clears it; with no conflict and no disk change, refresh writes nothing and publishes nothing', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, OUTLINE);
    writeFileSync(target, 'Orig\n');
    await withKit(fixture.library, async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const change = await propose(app, {
          path: 'sources/outline.md',
          content: 'P\n',
        });
        expect((await nextEvent(stream)).type).toBe('pending-created');

        // (a) The host edits the target, and a refused accept stores the conflict.
        writeFileSync(target, 'H\n');
        const refused = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
        expect(refused.status).toBe(409);
        const stored = await nextEvent(stream);
        expect(stored.type).toBe('pending-updated');
        expect(stored.data.pendingChange?.conflict?.reason).toBe(
          'base-changed',
        );

        // The host restores the original bytes; refresh clears the stored conflict.
        writeFileSync(target, 'Orig\n');
        const cleared = await postEmpty(app.baseUrl, REFRESH(change.id));
        expect(cleared.status).toBe(200);
        const refreshed = cleared.json as PendingChange;
        expect(refreshed.conflict).toBeNull();
        expect(refreshed.proposed).toBe(change.proposed);
        expect(refreshed.capturedBase).toEqual(change.capturedBase);
        const updated = await nextEvent(stream);
        expect(updated.type).toBe('pending-updated');
        expect(updated.data.pendingChange?.conflict).toBeNull();

        // (b) No conflict and the disk equals the base: nothing is written and nothing is published.
        const before = snapshot(PENDING_FOLDER(fixture.library));
        const again = await postEmpty(app.baseUrl, REFRESH(change.id));
        expect(again.status).toBe(200);
        expect(snapshot(PENDING_FOLDER(fixture.library))).toEqual(before);
        await expect(stream.next(500)).rejects.toThrow();
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X5 (D5): when host and proposal make the same edit to one line, refresh is clean and accept writes the shared text', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, OUTLINE);
    const base = '# Outline\n\nFirst point.\n\nSecond point.\n\nThird point.\n';
    const shared =
      '# Outline\n\nFirst point, both.\n\nSecond point.\n\nThird point.\n';
    writeFileSync(target, base);
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: shared,
      });
      writeFileSync(target, shared);

      const reply = await postEmpty(app.baseUrl, REFRESH(change.id));
      expect(reply.status).toBe(200);
      const refreshed = reply.json as PendingChange;
      expect(refreshed.conflict).toBeNull();
      expect(refreshed.proposed).toBe(shared);

      const accepted = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
      expect(accepted.status).toBe(200);
      expect(readFileSync(target, 'utf8')).toBe(shared);
    });
  } finally {
    fixture.remove();
  }
});

it('X6 (D7): a clean merge whose text fails the registered validator is refused with 422, and nothing is written', async () => {
  const fixture = bookLibrary();
  try {
    const base = '{\n  "schemaVersion": 1,\n\n  "a": 1\n}\n';
    const proposed = '{\n  "schemaVersion": 1,\n\n  "a": 2\n}\n';
    const host = '{\n  "schemaVersion": 2,\n\n  "a": 1\n}\n';
    const graph = join(fixture.library, BOOK, 'graphs', 'a.json');
    putFile(fixture.library, `${BOOK}/graphs/a.json`, base);
    await withKit(fixture.library, async (app) => {
      const registered = await postEmpty(app.baseUrl, REGISTER_GRAPH);
      expect(registered.status).toBe(200);

      const change = await propose(app, {
        path: 'graphs/a.json',
        content: proposed,
      });
      writeFileSync(graph, host);
      const before = snapshot(PENDING_FOLDER(fixture.library));

      const reply = await postEmpty(app.baseUrl, REFRESH(change.id));
      expect(reply.status).toBe(422);
      expect(errorOf(reply).code).toBe('PROJECT_VALIDATION_FAILED');

      expect(snapshot(PENDING_FOLDER(fixture.library))).toEqual(before);
      expect(readFileSync(graph, 'utf8')).toBe(host);
    });
  } finally {
    fixture.remove();
  }
});

it('X9 (D6, case 4): a disk file with a NUL byte keeps base-changed; the proposal and the host file are unchanged', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, OUTLINE);
    writeFileSync(target, 'Orig\n');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      const nul = Buffer.from('Ho\x00st\n', 'utf8');
      writeFileSync(target, nul);

      const reply = await postEmpty(app.baseUrl, REFRESH(change.id));
      expect(reply.status).toBe(200);
      const refreshed = reply.json as PendingChange;
      expect(refreshed.conflict?.reason).toBe('base-changed');
      expect(refreshed.proposed).toBe('P\n');
      expect(refreshed.capturedBase).toEqual(change.capturedBase);
      expect(readFileSync(target).equals(nul)).toBe(true);
    });
  } finally {
    fixture.remove();
  }
});

it('X10 (D5, paragraph reach; PST-22 demo step 3): edits to two lines of one paragraph conflict; edits to two paragraphs merge', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, OUTLINE);
    const other = join(fixture.library, BOOK, 'sources', 'b.md');
    const base = '# Outline\n\nAlpha one.\nAlpha two.\n\nBeta.\n';
    writeFileSync(target, base);
    putFile(fixture.library, `${BOOK}/sources/b.md`, base);
    await withKit(fixture.library, async (app) => {
      // (a) Two lines of one paragraph: the reaches overlap, so the change stays conflicted.
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: '# Outline\n\nAlpha one.\nAlpha two, agent.\n\nBeta.\n',
      });
      writeFileSync(target, '# Outline\n\nAlpha one, host.\nAlpha two.\n\nBeta.\n');
      const conflicted = await postEmpty(app.baseUrl, REFRESH(change.id));
      expect(conflicted.status).toBe(200);
      const kept = conflicted.json as PendingChange;
      expect(kept.conflict?.reason).toBe('base-changed');
      expect(kept.proposed).toBe(change.proposed);
      expect(kept.capturedBase).toEqual(change.capturedBase);
      expect(kept.updatedAt).toBe(change.updatedAt);

      // (b) Two paragraphs: the edits merge cleanly and both are in the proposal.
      const separate = await propose(app, {
        path: 'sources/b.md',
        content: '# Outline\n\nAlpha one.\nAlpha two.\n\nBeta, agent.\n',
      });
      writeFileSync(other, '# Outline\n\nAlpha one, host.\nAlpha two.\n\nBeta.\n');
      const merged = await postEmpty(app.baseUrl, REFRESH(separate.id));
      expect(merged.status).toBe(200);
      const clean = merged.json as PendingChange;
      expect(clean.conflict).toBeNull();
      expect(clean.proposed).toBe(
        '# Outline\n\nAlpha one, host.\nAlpha two.\n\nBeta, agent.\n',
      );
    });
  } finally {
    fixture.remove();
  }
});
