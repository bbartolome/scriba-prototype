import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  pendingListSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { dataOf, openSse, type OpenSse } from './sse';
import { bookLibrary } from './project-store-files.kit';
import { pendingKitModule } from './project-store-pending.kit';

// Every test builds its own temp library and removes it. Propose goes through the kit module, which has no guard.
// The event stream is GET /events on the same app. The host edits the disk directly.

const KIT = '/api/project-store-test/pending/propose';

interface PendingEvent {
  type: string;
  data: { projectId: string; pendingChange: PendingChange };
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

it('A4: listing after a host edit returns the conflict, leaves .scriba/pending/ byte-identical, and publishes nothing', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, 'book', 'sources', 'outline.md');
    const pendingFolder = join(fixture.library, 'book', '.scriba', 'pending');
    await withKit(fixture.library, async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const proposed = await fetch(app.baseUrl + KIT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            projectId: 'book',
            path: 'sources/outline.md',
            content: 'P\n',
            origin: { kind: 'agent-run', runId: 'r1' },
          }),
        });
        expect(proposed.status).toBe(200);
        expect((await nextEvent(stream)).type).toBe('pending-created');

        // The host edits the target after the propose.
        writeFileSync(target, 'H\n');

        const before = snapshot(pendingFolder);
        const listed = await fetch(
          `${app.baseUrl}/api/project-store/projects/book/pending`,
        );
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
