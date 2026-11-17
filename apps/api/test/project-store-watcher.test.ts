import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECT_PENDING_ROUTE,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { dataOf, openSse, type OpenSse } from './sse';
import { bookLibrary, fileUrl } from './project-store-files.kit';
import { addOkProject, postJsonPlain } from './project-store-active.kit';
import { pendingKitModule } from './project-store-pending.kit';

// The watcher tests write the host side with writeFileSync and read GET /events. The watcher runs only when the
// test passes SCRIBA_WATCHER 'true' (the harness default is 'false', PST-19 R1). Each test removes its own library.

const KIT = '/api/project-store-test/pending/propose';
const BOOK = 'book';
const PENDING = fileUrl(PROJECT_PENDING_ROUTE, BOOK);

interface WatcherEvent {
  type: string;
  data: {
    projectId?: string;
    paths?: string[];
    from?: string | null;
    to?: string;
    pendingChange?: PendingChange;
  };
}

// The next event of the stream, parsed. The timeout is the wait for the block.
async function nextEvent(
  stream: OpenSse,
  timeoutMs = 2000,
): Promise<WatcherEvent> {
  return JSON.parse(dataOf(await stream.next(timeoutMs))) as WatcherEvent;
}

// Boots the kit module on the library with the watcher set by the test, and closes the app in every case.
async function withWatcher(
  library: string,
  watcher: 'true' | 'false',
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: library,
    modules: [pendingKitModule()],
    env: { SCRIBA_WATCHER: watcher },
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

// Proposes a change through the kit module, and returns the change.
async function propose(
  app: TestApp,
  path: string,
  content: string,
): Promise<PendingChange> {
  const reply = await postJsonPlain(app.baseUrl, KIT, {
    projectId: BOOK,
    path,
    content,
    origin: { kind: 'agent-run', runId: 'r1' },
  });
  expect(reply.status).toBe(200);
  return reply.json as PendingChange;
}

// The conflict reason of the first open change, read from the GET list.
async function listedReason(baseUrl: string): Promise<string | undefined> {
  const response = await fetch(baseUrl + PENDING);
  const body = (await response.json()) as {
    changes: { conflict?: { reason: string } }[];
  };
  return body.changes[0]?.conflict?.reason;
}

it('W1: a burst of host edits gives one debounced files-changed, and the watcher starts at boot', async () => {
  const fixture = bookLibrary();
  try {
    await withWatcher(fixture.library, 'true', async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const outline = join(fixture.library, BOOK, 'sources', 'outline.md');
        writeFileSync(outline, 'A\n');
        writeFileSync(outline, 'B\n');
        writeFileSync(outline, 'C\n');

        const changed = await nextEvent(stream);
        expect(changed.type).toBe('files-changed');
        expect(changed.data.projectId).toBe(BOOK);
        expect(changed.data.paths).toEqual(['sources/outline.md']);
        await expect(stream.next(1500)).rejects.toThrow();
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('W2: a host edit of a pending target gives files-changed, then pending-updated with the conflict', async () => {
  const fixture = bookLibrary();
  try {
    await withWatcher(fixture.library, 'true', async (app) => {
      await propose(app, 'sources/outline.md', 'P\n');
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        writeFileSync(
          join(fixture.library, BOOK, 'sources', 'outline.md'),
          'H\n',
        );

        const changed = await nextEvent(stream);
        expect(changed.type).toBe('files-changed');
        expect(changed.data.paths).toEqual(['sources/outline.md']);

        const updated = await nextEvent(stream);
        expect(updated.type).toBe('pending-updated');
        expect(updated.data.pendingChange?.conflict?.reason).toBe(
          'base-changed',
        );

        await expect(stream.next(1500)).rejects.toThrow();
        expect(await listedReason(app.baseUrl)).toBe('base-changed');
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('W3: with SCRIBA_WATCHER=false no watcher runs, and the GET list still shows the conflict', async () => {
  const fixture = bookLibrary();
  try {
    await withWatcher(fixture.library, 'false', async (app) => {
      await propose(app, 'sources/outline.md', 'P\n');
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        writeFileSync(
          join(fixture.library, BOOK, 'sources', 'outline.md'),
          'H\n',
        );
        await expect(stream.next(1500)).rejects.toThrow();

        expect(await listedReason(app.baseUrl)).toBe('base-changed');
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('W4: after a switch the watcher follows the new active project only', async () => {
  const fixture = bookLibrary();
  try {
    addOkProject(fixture.library, 'second');
    await withWatcher(fixture.library, 'true', async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const switched = await postJsonPlain(
          app.baseUrl,
          ACTIVE_PROJECT_ROUTE,
          {
            projectId: 'second',
          },
        );
        expect(switched.status).toBe(200);
        const event = await nextEvent(stream);
        expect(event.type).toBe('project-switched');
        expect(event.data.to).toBe('second');

        writeFileSync(
          join(fixture.library, BOOK, 'sources', 'outline.md'),
          'X\n',
        );
        await expect(stream.next(1500)).rejects.toThrow();

        writeFileSync(join(fixture.library, 'second', 'notes.md'), 'Notes\n');
        const changed = await nextEvent(stream);
        expect(changed.type).toBe('files-changed');
        expect(changed.data.projectId).toBe('second');
        expect(changed.data.paths).toEqual(['notes.md']);
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('W5: writes under reserved or dot paths publish nothing, and a propose publishes only pending-created', async () => {
  const fixture = bookLibrary();
  try {
    // The folders exist before the app boots, so their creation is not a host change under test.
    const book = join(fixture.library, BOOK);
    mkdirSync(join(book, 'drafts', '.versions', 'a.md'), { recursive: true });
    mkdirSync(join(book, '.scriba'), { recursive: true });
    await withWatcher(fixture.library, 'true', async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        await propose(app, 'sources/new.md', 'New\n');
        const created = await nextEvent(stream);
        expect(created.type).toBe('pending-created');
        await expect(stream.next(1500)).rejects.toThrow();

        const book = join(fixture.library, BOOK);
        writeFileSync(join(book, 'drafts', '.versions', 'a.md', 'x.md'), 'V\n');
        writeFileSync(join(book, '.scriba', 'x.txt'), 'S\n');
        writeFileSync(join(book, 'sources', '.hidden.md'), 'H\n');
        await expect(stream.next(1500)).rejects.toThrow();
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});
