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
import { afterEach, expect, it, vi } from 'vitest';
import {
  PROJECT_FILE_DELETE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
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

// Every test builds its own temp library and removes it. Propose goes through the kit module, which has no guard,
// and accept, reject, list and the file routes go through their real paths on the same app. The event stream is
// GET /events on that app. The host edits the disk directly.

const KIT = '/api/project-store-test/pending/propose';
const BOOK = 'book';
const PENDING = fileUrl(PROJECT_PENDING_ROUTE, BOOK);
const ACCEPT = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/accept`;
const REJECT = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/reject`;

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

// One open or resolved change file, parsed.
function changeFile(
  library: string,
  id: string,
  state: 'open' | 'resolved',
  projectId = BOOK,
): PendingChange {
  const folder =
    state === 'open'
      ? join(library, projectId, '.scriba', 'pending')
      : join(library, projectId, '.scriba', 'pending', 'resolved');
  return JSON.parse(
    readFileSync(join(folder, `${id}.json`), 'utf8'),
  ) as PendingChange;
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

function errorCode(reply: PlainReply): string {
  return (reply.json as ErrorBody).error.code;
}

afterEach(() => {
  vi.useRealTimers();
});

it('A4: listing after a host edit returns the conflict, leaves .scriba/pending/ byte-identical, and publishes nothing', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, 'sources', 'outline.md');
    const pendingFolder = join(fixture.library, BOOK, '.scriba', 'pending');
    await withKit(fixture.library, async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        await propose(app, { path: 'sources/outline.md', content: 'P\n' });
        expect((await nextEvent(stream)).type).toBe('pending-created');

        // The host edits the target after the propose.
        writeFileSync(target, 'H\n');

        const before = snapshot(pendingFolder);
        const listed = await fetch(app.baseUrl + PENDING);
        expect(listed.status).toBe(200);
        const list = pendingListSchema.parse(await listed.json());
        expect(list.changes).toHaveLength(1);
        expect(list.changes[0]?.conflict?.reason).toBe('base-changed');

        // The list wrote nothing, and the folder is byte-identical.
        expect(snapshot(pendingFolder)).toEqual(before);

        // Nothing was published by the list.
        await expect(stream.next(500)).rejects.toThrow();
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('A1: accepting with edited content writes that content, and the change is resolved', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, 'sources', 'outline.md');
    await withKit(fixture.library, async (app) => {
      expect(readFileSync(target, 'utf8')).toBe('# Outline\n');
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'Proposed\n',
      });

      const reply = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {
        content: 'Edited\n',
      });
      expect(reply.status).toBe(200);
      const resolved = reply.json as PendingChange;
      expect(resolved.status).toBe('accepted');
      expect(resolved.targetPath).toBe('sources/outline.md');

      expect(readFileSync(target, 'utf8')).toBe('Edited\n');
      expect(openFiles(fixture.library)).toEqual([]);
      expect(changeFile(fixture.library, change.id, 'resolved').status).toBe(
        'accepted',
      );
    });
  } finally {
    fixture.remove();
  }
});

it('A2: applying a matching base writes the proposal; an existing top-level draft keeps its previous text in drafts/.versions; a new draft writes no version', async () => {
  const fixture = bookLibrary();
  try {
    const draft = join(fixture.library, BOOK, 'drafts', 'ch01.md');
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Old\n');
    const versions = join(fixture.library, BOOK, 'drafts', '.versions');
    await withKit(fixture.library, async (app) => {
      // (a) An existing draft: the proposal is written, and the previous text is saved as one version.
      const modify = await propose(app, {
        path: 'drafts/ch01.md',
        content: 'New\n',
      });
      const applied = await postJsonPlain(app.baseUrl, ACCEPT(modify.id), {});
      expect(applied.status).toBe(200);
      expect(readFileSync(draft, 'utf8')).toBe('New\n');

      const folder = join(versions, 'ch01.md');
      const names = readdirSync(folder);
      expect(names).toHaveLength(1);
      expect(names[0]).toMatch(/^\d{8}T\d{9}Z\.md$/);
      expect(readFileSync(join(folder, names[0] as string), 'utf8')).toBe(
        'Old\n',
      );

      // (b) A new draft: the file is written, and no version exists for it.
      const create = await propose(app, {
        path: 'drafts/ch02.md',
        content: 'Fresh\n',
      });
      const created = await postJsonPlain(app.baseUrl, ACCEPT(create.id), {});
      expect(created.status).toBe(200);
      expect(
        readFileSync(join(fixture.library, BOOK, 'drafts', 'ch02.md'), 'utf8'),
      ).toBe('Fresh\n');
      expect(existsSync(join(versions, 'ch02.md'))).toBe(false);
    });
  } finally {
    fixture.remove();
  }
});

it('A3: a host edit flags base-changed, a deletion flags target-missing, and a created target flags target-exists; each apply is refused and the change stays open', async () => {
  const fixture = bookLibrary();
  try {
    const outline = join(fixture.library, BOOK, 'sources', 'outline.md');
    const notes = join(fixture.library, BOOK, 'sources', 'notes.md');
    putFile(fixture.library, `${BOOK}/sources/notes.md`, 'Notes\n');
    await withKit(fixture.library, async (app) => {
      // (a) base-changed: the host edits the target after the propose.
      const edited = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      writeFileSync(outline, 'H\n');
      const refusedA = await postJsonPlain(app.baseUrl, ACCEPT(edited.id), {});
      expect(refusedA.status).toBe(409);
      expect(errorCode(refusedA)).toBe('PROJECT_PENDING_CONFLICT');
      expect(
        (refusedA.json as ErrorBody & { error: { details?: unknown } }).error
          .details,
      ).toEqual({ reason: 'base-changed' });
      expect(readFileSync(outline, 'utf8')).toBe('H\n');
      expect(
        changeFile(fixture.library, edited.id, 'open').conflict?.reason,
      ).toBe('base-changed');

      // (b) target-missing: the host deletes the target after the propose.
      const deleted = await propose(app, {
        path: 'sources/notes.md',
        content: 'Q\n',
      });
      unlinkSync(notes);
      const refusedB = await postJsonPlain(app.baseUrl, ACCEPT(deleted.id), {});
      expect(refusedB.status).toBe(409);
      expect(
        (refusedB.json as ErrorBody & { error: { details?: unknown } }).error
          .details,
      ).toEqual({ reason: 'target-missing' });
      expect(
        changeFile(fixture.library, deleted.id, 'open').conflict?.reason,
      ).toBe('target-missing');
      expect(existsSync(notes)).toBe(false);

      // (c) target-exists: a create whose target appears before the apply.
      const created = await propose(app, {
        path: 'sources/new.md',
        content: 'C\n',
      });
      const newFile = join(fixture.library, BOOK, 'sources', 'new.md');
      writeFileSync(newFile, 'X\n');
      const refusedC = await postJsonPlain(app.baseUrl, ACCEPT(created.id), {});
      expect(refusedC.status).toBe(409);
      expect(
        (refusedC.json as ErrorBody & { error: { details?: unknown } }).error
          .details,
      ).toEqual({ reason: 'target-exists' });
      expect(readFileSync(newFile, 'utf8')).toBe('X\n');
      expect(
        changeFile(fixture.library, created.id, 'open').conflict?.reason,
      ).toBe('target-exists');

      // Every refused change is still open.
      expect(openFiles(fixture.library)).toHaveLength(3);
    });
  } finally {
    fixture.remove();
  }
});

it('A5: pending-updated on a persisted conflict; pending-resolved and files-changed on apply; pending-resolved on reject', async () => {
  const fixture = bookLibrary();
  try {
    const outline = join(fixture.library, BOOK, 'sources', 'outline.md');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        // (1) The host edits the target; the accept is refused and publishes one pending-updated.
        writeFileSync(outline, 'H\n');
        const refused = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
        expect(refused.status).toBe(409);
        const updated = await nextEvent(stream);
        expect(updated.type).toBe('pending-updated');
        expect(updated.data.pendingChange?.conflict?.reason).toBe(
          'base-changed',
        );
        await expect(stream.next(500)).rejects.toThrow();

        // (2) The host restores the original bytes; the accept succeeds, and two events follow in this order.
        writeFileSync(outline, '# Outline\n');
        const applied = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
        expect(applied.status).toBe(200);
        const resolved = await nextEvent(stream);
        expect(resolved.type).toBe('pending-resolved');
        expect(resolved.data.pendingChange?.status).toBe('accepted');
        const changed = await nextEvent(stream);
        expect(changed.type).toBe('files-changed');
        expect(changed.data.paths).toEqual(['sources/outline.md']);
        await expect(stream.next(500)).rejects.toThrow();

        // (3) A second change is proposed and then rejected: one pending-created, then one pending-resolved.
        const second = await propose(app, {
          path: 'sources/second.md',
          content: 'Second\n',
        });
        expect((await nextEvent(stream)).type).toBe('pending-created');
        const rejected = await postEmpty(app.baseUrl, REJECT(second.id));
        expect(rejected.status).toBe(200);
        const rejectedEvent = await nextEvent(stream);
        expect(rejectedEvent.type).toBe('pending-resolved');
        expect(rejectedEvent.data.pendingChange?.status).toBe('rejected');
        await expect(stream.next(500)).rejects.toThrow();
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X1: accept or reject of a resolved change gives PROJECT_PENDING_NOT_OPEN; an unknown id or an id with a slash gives PROJECT_NOT_FOUND', async () => {
  const fixture = bookLibrary();
  try {
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'Once\n',
      });
      expect(
        (await postJsonPlain(app.baseUrl, ACCEPT(change.id), {})).status,
      ).toBe(200);

      const again = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
      expect(again.status).toBe(409);
      expect(errorCode(again)).toBe('PROJECT_PENDING_NOT_OPEN');
      const rejectedAgain = await postEmpty(app.baseUrl, REJECT(change.id));
      expect(rejectedAgain.status).toBe(409);
      expect(errorCode(rejectedAgain)).toBe('PROJECT_PENDING_NOT_OPEN');

      const unknown = await postJsonPlain(
        app.baseUrl,
        ACCEPT('20260101T000000000Z-abcdef'),
        {},
      );
      expect(unknown.status).toBe(404);
      expect(errorCode(unknown)).toBe('PROJECT_NOT_FOUND');

      const slashed = await postEmpty(app.baseUrl, ACCEPT('a%2Fb'));
      expect(slashed.status).toBe(404);
      expect(errorCode(slashed)).toBe('PROJECT_NOT_FOUND');
    });
  } finally {
    fixture.remove();
  }
});

it('X2: accept and reject on a project that is not active give PROJECT_NOT_ACTIVE, and nothing changes', async () => {
  const fixture = bookLibrary();
  try {
    addOkProject(fixture.library, 'second');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        projectId: 'second',
        path: 'notes/a.md',
        content: 'Z\n',
      });

      const accepted = await postJsonPlain(
        app.baseUrl,
        ACCEPT(change.id, 'second'),
        {},
      );
      expect(accepted.status).toBe(409);
      expect(errorCode(accepted)).toBe('PROJECT_NOT_ACTIVE');
      const rejected = await postEmpty(
        app.baseUrl,
        REJECT(change.id, 'second'),
      );
      expect(rejected.status).toBe(409);
      expect(errorCode(rejected)).toBe('PROJECT_NOT_ACTIVE');

      expect(existsSync(join(fixture.library, 'second', 'notes', 'a.md'))).toBe(
        false,
      );
      expect(openFiles(fixture.library, 'second')).toHaveLength(1);
    });
  } finally {
    fixture.remove();
  }
});

it('X3: reject leaves the target and drafts/.versions untouched, and the resolved record is rejected', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Old\n');
    const draft = join(fixture.library, BOOK, 'drafts', 'ch01.md');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'drafts/ch01.md',
        content: 'Rejected\n',
      });
      const reply = await postEmpty(app.baseUrl, REJECT(change.id));
      expect(reply.status).toBe(200);
      const resolved = reply.json as PendingChange;
      expect(resolved.status).toBe('rejected');
      expect(resolved.conflict).toBeNull();

      expect(readFileSync(draft, 'utf8')).toBe('Old\n');
      expect(
        existsSync(join(fixture.library, BOOK, 'drafts', '.versions')),
      ).toBe(false);
      expect(openFiles(fixture.library)).toEqual([]);
      expect(changeFile(fixture.library, change.id, 'resolved').status).toBe(
        'rejected',
      );

      const again = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
      expect(again.status).toBe(409);
      expect(errorCode(again)).toBe('PROJECT_PENDING_NOT_OPEN');
    });
  } finally {
    fixture.remove();
  }
});

it('X5: an accept with no body applies the proposal; a body with a wrong type gives 400 and changes nothing', async () => {
  const fixture = bookLibrary();
  try {
    const outline = join(fixture.library, BOOK, 'sources', 'outline.md');
    const notes = join(fixture.library, BOOK, 'sources', 'notes.md');
    putFile(fixture.library, `${BOOK}/sources/notes.md`, 'Notes\n');
    await withKit(fixture.library, async (app) => {
      const first = await propose(app, {
        path: 'sources/outline.md',
        content: 'Proposal\n',
      });
      const bodiless = await postEmpty(app.baseUrl, ACCEPT(first.id));
      expect(bodiless.status).toBe(200);
      expect(readFileSync(outline, 'utf8')).toBe('Proposal\n');

      const second = await propose(app, {
        path: 'sources/notes.md',
        content: 'Second\n',
      });
      const bad = await postJsonPlain(app.baseUrl, ACCEPT(second.id), {
        content: 1,
      });
      expect(bad.status).toBe(400);
      expect(errorCode(bad)).toBe('PLATFORM_VALIDATION_FAILED');
      expect(readFileSync(notes, 'utf8')).toBe('Notes\n');
      expect(changeFile(fixture.library, second.id, 'open').status).toBe(
        'pending',
      );
    });
  } finally {
    fixture.remove();
  }
});

it('X6: a refused accept persists the conflict once; a second refused accept publishes nothing and keeps updatedAt and detectedAt', async () => {
  const fixture = bookLibrary();
  try {
    const outline = join(fixture.library, BOOK, 'sources', 'outline.md');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      writeFileSync(outline, 'H\n');
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        expect(
          (await postJsonPlain(app.baseUrl, ACCEPT(change.id), {})).status,
        ).toBe(409);
        expect((await nextEvent(stream)).type).toBe('pending-updated');
        const stored = changeFile(fixture.library, change.id, 'open');
        expect(stored.conflict?.reason).toBe('base-changed');

        expect(
          (await postJsonPlain(app.baseUrl, ACCEPT(change.id), {})).status,
        ).toBe(409);
        await expect(stream.next(500)).rejects.toThrow();
        const after = changeFile(fixture.library, change.id, 'open');
        expect(after.updatedAt).toBe(stored.updatedAt);
        expect(after.conflict?.detectedAt).toBe(stored.conflict?.detectedAt);
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X7: a file write or delete of a target with an open change is followed by files-changed, then pending-updated', async () => {
  const fixture = bookLibrary();
  try {
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const written = await postJsonPlain(
          app.baseUrl,
          fileUrl(PROJECT_FILE_WRITE_ROUTE, BOOK),
          { path: 'sources/outline.md', content: 'W\n' },
        );
        expect(written.status).toBe(200);
        const first = await nextEvent(stream);
        expect(first.type).toBe('files-changed');
        expect(first.data.paths).toEqual(['sources/outline.md']);
        const flagged = await nextEvent(stream);
        expect(flagged.type).toBe('pending-updated');
        expect(flagged.data.pendingChange?.conflict?.reason).toBe(
          'base-changed',
        );

        const deleted = await fetch(
          app.baseUrl + fileUrl(PROJECT_FILE_DELETE_ROUTE, BOOK),
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: 'sources/outline.md' }),
          },
        );
        expect(deleted.status).toBe(200);
        expect((await nextEvent(stream)).type).toBe('files-changed');
        const missing = await nextEvent(stream);
        expect(missing.type).toBe('pending-updated');
        expect(missing.data.pendingChange?.conflict?.reason).toBe(
          'target-missing',
        );
        expect(missing.data.pendingChange?.id).toBe(change.id);
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X9: two applies in the same millisecond keep both versions, the second with a -2 suffix', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Old\n');
    const versions = join(
      fixture.library,
      BOOK,
      'drafts',
      '.versions',
      'ch01.md',
    );
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-04T23:15:00.123Z'));
    await withKit(fixture.library, async (app) => {
      const first = await propose(app, {
        path: 'drafts/ch01.md',
        content: 'A\n',
      });
      expect(
        (await postJsonPlain(app.baseUrl, ACCEPT(first.id), {})).status,
      ).toBe(200);
      const second = await propose(app, {
        path: 'drafts/ch01.md',
        content: 'B\n',
      });
      expect(
        (await postJsonPlain(app.baseUrl, ACCEPT(second.id), {})).status,
      ).toBe(200);
    });
    vi.useRealTimers();

    expect(readdirSync(versions).sort()).toEqual([
      '20261104T231500123Z-2.md',
      '20261104T231500123Z.md',
    ]);
    expect(readFileSync(join(versions, '20261104T231500123Z.md'), 'utf8')).toBe(
      'Old\n',
    );
    expect(
      readFileSync(join(versions, '20261104T231500123Z-2.md'), 'utf8'),
    ).toBe('A\n');
  } finally {
    vi.useRealTimers();
    fixture.remove();
  }
});

it('X10: a host edit shows base-changed in the list, and restoring the bytes clears it; the accept then succeeds', async () => {
  const fixture = bookLibrary();
  try {
    const outline = join(fixture.library, BOOK, 'sources', 'outline.md');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
      });
      const list = async (): Promise<PendingChange> => {
        const response = await fetch(app.baseUrl + PENDING);
        expect(response.status).toBe(200);
        return pendingListSchema.parse(await response.json())
          .changes[0] as PendingChange;
      };

      writeFileSync(outline, 'H\n');
      expect((await list()).conflict?.reason).toBe('base-changed');

      writeFileSync(outline, '# Outline\n');
      expect((await list()).conflict).toBeNull();

      const applied = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
      expect(applied.status).toBe(200);
      expect(sha256Of(readFileSync(outline))).toBe(sha256Of('P\n'));
    });
  } finally {
    fixture.remove();
  }
});
