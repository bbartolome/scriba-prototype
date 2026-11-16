import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type {
  PendingChange,
  ProposeInput,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { dataOf, openSse, type OpenSse } from './sse';
import { sha256Of } from './project-store-files.kit';
import { addOkProject } from './project-store-active.kit';
import { bookLibrary } from './project-store-files.kit';
import { pendingKitModule } from './project-store-pending.kit';
import type { ErrorBody } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. The propose calls go through the kit module, which has
// no guard. The event stream is GET /events on the same app.

const KIT = '/api/project-store-test/pending';
const RUN_1 = { kind: 'agent-run', runId: 'r1' } as const;
const RUN_2 = { kind: 'agent-run', runId: 'r2' } as const;

// A reply of the kit module: its status and its body text.
interface KitReply {
  status: number;
  text: string;
}

// One POST of a kit route with a JSON body. A body may be a plain object or a text (for example `{`).
async function kitPost(
  baseUrl: string,
  route: string,
  body: unknown,
): Promise<KitReply> {
  const response = await fetch(`${baseUrl}${KIT}/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

// One propose call of the kit module.
function propose(
  app: TestApp,
  input: Partial<ProposeInput> & { projectId: string; path: string },
): Promise<KitReply> {
  return kitPost(app.baseUrl, 'propose', {
    content: '',
    origin: RUN_1,
    ...input,
  });
}

function kitCode(reply: KitReply): string {
  return (JSON.parse(reply.text) as ErrorBody).error.code;
}

function changeOf(reply: KitReply): PendingChange {
  return JSON.parse(reply.text) as PendingChange;
}

// Boots the kit module on the library, and closes the app in every case. The library is removed by the caller.
async function withPendingKit(
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

// The folder of open changes of one project in the library.
function pendingDir(library: string, projectId: string): string {
  return join(library, projectId, '.scriba', 'pending');
}

// The names of the entries of the pending folder, or none when the folder is missing.
function pendingNames(library: string, projectId: string): string[] {
  const dir = pendingDir(library, projectId);
  return existsSync(dir) ? readdirSync(dir) : [];
}

// The open changes on disk, in name order.
function openOnDisk(library: string, projectId: string): PendingChange[] {
  return pendingNames(library, projectId)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map(
      (name) =>
        JSON.parse(
          readFileSync(join(pendingDir(library, projectId), name), 'utf8'),
        ) as PendingChange,
    );
}

interface PendingEvent {
  type: string;
  data: { projectId: string; pendingChange: PendingChange };
}

// The hello block of the stream, then one event at a time.
async function nextEvent(stream: OpenSse): Promise<PendingEvent> {
  return JSON.parse(dataOf(await stream.next(2000))) as PendingEvent;
}

it('P1: a propose leaves the target unchanged, writes one pending file, and publishes one pending-created', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, 'book', 'sources', 'outline.md');
    const before = sha256Of(readFileSync(target));
    await withPendingKit(fixture.library, async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const reply = await propose(app, {
          projectId: 'book',
          path: 'sources/outline.md',
          content: '# Outline\n\nA new line.\n',
        });
        expect(reply.status).toBe(200);

        expect(sha256Of(readFileSync(target))).toBe(before);
        const names = pendingNames(fixture.library, 'book');
        expect(names.filter((name) => name.endsWith('.json'))).toHaveLength(1);
        expect(names.some((name) => name.endsWith('.tmp'))).toBe(false);

        const event = await nextEvent(stream);
        expect(event.type).toBe('pending-created');
        expect(event.data.projectId).toBe('book');
        expect(event.data.pendingChange.targetPath).toBe('sources/outline.md');

        // No files-changed and no second event follow.
        await expect(stream.next(500)).rejects.toThrow();
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('P2: a second propose from the same origin folds into the change and keeps the base; another run is separate', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, 'book', 'sources', 'outline.md');
    await withPendingKit(fixture.library, async (app) => {
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const first = await propose(app, {
          projectId: 'book',
          path: 'sources/outline.md',
          content: 'Content A\n',
          origin: RUN_1,
        });
        expect((await nextEvent(stream)).type).toBe('pending-created');

        // The author edits the file on disk between the two proposes.
        writeFileSync(target, '# Outline\nEdited by the host.\n');

        const second = await propose(app, {
          projectId: 'book',
          path: 'sources/outline.md',
          content: 'Content B\n',
          origin: RUN_1,
        });
        expect(second.status).toBe(200);
        expect((await nextEvent(stream)).type).toBe('pending-updated');

        const open = openOnDisk(fixture.library, 'book');
        expect(open).toHaveLength(1);
        expect(open[0].capturedBase?.content).toBe('# Outline\n');
        expect(open[0].proposed).toBe('Content B\n');
        expect(changeOf(second).id).toBe(changeOf(first).id);

        const third = await propose(app, {
          projectId: 'book',
          path: 'sources/outline.md',
          content: 'Content C\n',
          origin: RUN_2,
        });
        expect(third.status).toBe(200);
        expect((await nextEvent(stream)).type).toBe('pending-created');

        const after = openOnDisk(fixture.library, 'book');
        expect(after).toHaveLength(2);
        const separate = after.find(
          (change) =>
            change.origin.kind === 'agent-run' && change.origin.runId === 'r2',
        );
        expect(separate?.id).toBe(changeOf(third).id);
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('P3: a propose naming a non-active ok project lands in that project queue', async () => {
  const fixture = bookLibrary();
  try {
    addOkProject(fixture.library, 'second');
    await withPendingKit(fixture.library, async (app) => {
      const reply = await propose(app, {
        projectId: 'second',
        path: 'sources/notes.md',
        content: 'Notes.\n',
      });
      expect(reply.status).toBe(200);
      const change = changeOf(reply);
      expect(change.projectId).toBe('second');
      expect(change.targetPath).toBe('sources/notes.md');
      expect(change.kind).toBe('create');

      expect(openOnDisk(fixture.library, 'second')).toHaveLength(1);
      expect(existsSync(join(fixture.library, 'book', '.scriba'))).toBe(false);
    });
  } finally {
    fixture.remove();
  }
});

it('P4: a caller base is used instead of disk, and a missing target is a create with a null base', async () => {
  const fixture = bookLibrary();
  try {
    await withPendingKit(fixture.library, async (app) => {
      // (a) The disk holds '# Outline\n', but the caller's base is used.
      const withBase = await propose(app, {
        projectId: 'book',
        path: 'sources/outline.md',
        content: 'New\n',
        base: { content: 'Captured\n' },
      });
      expect(withBase.status).toBe(200);
      const modified = changeOf(withBase);
      expect(modified.kind).toBe('modify');
      expect(modified.capturedBase?.content).toBe('Captured\n');
      expect(modified.capturedBase?.hash).toBe(sha256Of('Captured\n'));
      expect(modified.diff).toContain('-Captured\n');
      expect(modified.diff).not.toContain('# Outline');

      // (b) The target is missing, and no base is given.
      const missing = await propose(app, {
        projectId: 'book',
        path: 'sources/new.md',
        content: 'Fresh\n',
        origin: RUN_2,
      });
      expect(missing.status).toBe(200);
      const created = changeOf(missing);
      expect(created.kind).toBe('create');
      expect(created.capturedBase).toBeNull();
      const lines = created.diff.split('\n').filter((line) => line !== '');
      expect(lines[0]).toBe('--- /dev/null');
      expect(lines[1]).toBe('+++ b/sources/new.md');
      for (const line of lines.slice(2)) {
        expect(line.startsWith('+') || line.startsWith('@@')).toBe(true);
      }
    });
  } finally {
    fixture.remove();
  }
});

it('P5: a validator refusal, an invalid project.yaml and reserved paths are refused; only the good graph is queued', async () => {
  const fixture = bookLibrary();
  try {
    await withPendingKit(fixture.library, async (app) => {
      const register = await kitPost(
        app.baseUrl,
        'register-graph-validator',
        {},
      );
      expect(register.status).toBe(200);

      const bad = await propose(app, {
        projectId: 'book',
        path: 'graphs/bad.json',
        content: '{"schemaVersion":2}',
      });
      expect(bad.status).toBe(422);
      expect(kitCode(bad)).toBe('PROJECT_VALIDATION_FAILED');

      const broken = await propose(app, {
        projectId: 'book',
        path: 'graphs/broken.json',
        content: '{',
      });
      expect(broken.status).toBe(422);
      expect(kitCode(broken)).toBe('PROJECT_VALIDATION_FAILED');

      const good = await propose(app, {
        projectId: 'book',
        path: 'graphs/good.json',
        content: '{"schemaVersion":1}',
      });
      expect(good.status).toBe(200);

      const yaml = await propose(app, {
        projectId: 'book',
        path: 'project.yaml',
        content: 'schemaVersion: 1\n',
      });
      expect(yaml.status).toBe(422);
      expect(kitCode(yaml)).toBe('PROJECT_VALIDATION_FAILED');
      const details = (JSON.parse(yaml.text) as ErrorBody).error.details;
      expect(Array.isArray(details) && details.length > 0).toBe(true);

      const stateReserved = await propose(app, {
        projectId: 'book',
        path: '.scriba/pending/x.json',
        content: '{}',
      });
      expect(stateReserved.status).toBe(400);
      expect(kitCode(stateReserved)).toBe('PROJECT_PATH_RESERVED');

      const versionsReserved = await propose(app, {
        projectId: 'book',
        path: 'drafts/.versions/ch01.md/x.md',
        content: 'x',
      });
      expect(versionsReserved.status).toBe(400);
      expect(kitCode(versionsReserved)).toBe('PROJECT_PATH_RESERVED');

      const open = openOnDisk(fixture.library, 'book');
      expect(open).toHaveLength(1);
      expect(open[0].targetPath).toBe('graphs/good.json');
    });
  } finally {
    fixture.remove();
  }
});

it('E1: a folder that is not ok is refused with the appendLog codes, and nothing is written', async () => {
  const fixture = bookLibrary();
  try {
    await withPendingKit(fixture.library, async (app) => {
      const cases: [string, number, string][] = [
        ['bare', 404, 'PROJECT_NOT_FOUND'],
        ['bad', 422, 'PROJECT_INVALID'],
        ['later', 409, 'PROJECT_SCHEMA_TOO_NEW'],
        ['nope', 404, 'PROJECT_NOT_FOUND'],
      ];
      for (const [projectId, status, code] of cases) {
        const reply = await propose(app, {
          projectId,
          path: 'sources/x.md',
          content: 'x\n',
        });
        expect(reply.status).toBe(status);
        expect(kitCode(reply)).toBe(code);
        expect(existsSync(join(fixture.library, projectId, '.scriba'))).toBe(
          false,
        );
      }
      const invalid = await propose(app, {
        projectId: 'bad',
        path: 'sources/x.md',
        content: 'x\n',
      });
      const details = (JSON.parse(invalid.text) as ErrorBody).error.details;
      expect(Array.isArray(details) && details.length > 0).toBe(true);
    });
  } finally {
    fixture.remove();
  }
});

it('E2: recipe-run proposes fold by node, and each answer carries its provenance', async () => {
  const fixture = bookLibrary();
  try {
    await withPendingKit(fixture.library, async (app) => {
      const provenance = {
        graphId: 'g1',
        nodeId: 'n1',
        entityIds: ['e1'],
        sourcesUsed: ['sources/outline.md'],
      };
      const recipe = (nodeId: string) =>
        ({
          kind: 'recipe-run',
          runId: 'run1',
          graphId: 'g1',
          nodeId,
        }) as const;

      const first = await propose(app, {
        projectId: 'book',
        path: 'sources/outline.md',
        content: 'One\n',
        origin: recipe('n1'),
        provenance,
      });
      const second = await propose(app, {
        projectId: 'book',
        path: 'sources/outline.md',
        content: 'Two\n',
        origin: recipe('n1'),
        provenance,
      });
      const third = await propose(app, {
        projectId: 'book',
        path: 'sources/outline.md',
        content: 'Three\n',
        origin: recipe('n2'),
        provenance: { ...provenance, nodeId: 'n2' },
      });

      expect(changeOf(first).provenance).toEqual(provenance);
      expect(changeOf(second).id).toBe(changeOf(first).id);
      expect(changeOf(second).provenance).toEqual(provenance);
      expect(changeOf(third).id).not.toBe(changeOf(first).id);
      expect(changeOf(third).provenance).toEqual({
        ...provenance,
        nodeId: 'n2',
      });
      expect(openOnDisk(fixture.library, 'book')).toHaveLength(2);
    });
  } finally {
    fixture.remove();
  }
});

it('E3: the diff of a two-line change is the six-line unified diff', async () => {
  const fixture = bookLibrary();
  try {
    await withPendingKit(fixture.library, async (app) => {
      const reply = await propose(app, {
        projectId: 'book',
        path: 'sources/x.md',
        content: 'a\nc',
        base: { content: 'a\nb' },
      });
      expect(reply.status).toBe(200);
      expect(changeOf(reply).diff).toBe(
        '--- a/sources/x.md\n+++ b/sources/x.md\n@@ -1,2 +1,2 @@\n a\n-b\n+c\n',
      );
    });
  } finally {
    fixture.remove();
  }
});

it('E4: a 3000-line change above the alignment bound is one hunk of removed then added lines', async () => {
  const fixture = bookLibrary();
  try {
    await withPendingKit(fixture.library, async (app) => {
      const oldText = Array.from(
        { length: 3000 },
        (_, i) => `old-${i + 1}`,
      ).join('\n');
      const newText = Array.from(
        { length: 3000 },
        (_, i) => `new-${i + 1}`,
      ).join('\n');
      const reply = await propose(app, {
        projectId: 'book',
        path: 'sources/big.md',
        content: newText,
        base: { content: oldText },
      });
      expect(reply.status).toBe(200);
      const lines = changeOf(reply).diff.split('\n');
      expect(lines[2]).toBe('@@ -1,3000 +1,3000 @@');
      expect(lines.filter((line) => line.startsWith('-old-'))).toHaveLength(
        3000,
      );
      expect(lines.filter((line) => line.startsWith('+new-'))).toHaveLength(
        3000,
      );
    });
  } finally {
    fixture.remove();
  }
});
