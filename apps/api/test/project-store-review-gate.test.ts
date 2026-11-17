import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  draftVersionListSchema,
  pendingListSchema,
  PROJECT_PENDING_ROUTE,
  PROJECT_VERSION_RESTORE_ROUTE,
  PROJECT_VERSION_ROUTE,
  PROJECT_VERSIONS_ROUTE,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { openSse } from './sse';
import {
  addOkProject,
  postJsonPlain,
  type PlainReply,
} from './project-store-active.kit';
import {
  bookLibrary,
  fileUrl,
  putFile,
  sha256Of,
} from './project-store-files.kit';
import { pendingKitModule } from './project-store-pending.kit';

// The review gate (PST-22). Each test builds its own temp library and removes it. Proposals go through the kit
// module, which has no guard. Everything else goes through the real routes on the same app. The host edits the
// disk directly. Tests never read examples/. The app here runs with SCRIBA_WATCHER=false (create-test-app.ts).

const KIT = '/api/project-store-test/pending/propose';
const REGISTER_GRAPH =
  '/api/project-store-test/pending/register-graph-validator';
const BOOK = 'book';
const PENDING = fileUrl(PROJECT_PENDING_ROUTE, BOOK);
const ACCEPT = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/accept`;
const REFRESH = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/refresh`;
const ACCEPT_ANYWAY = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/accept-anyway`;

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

// Proposes a change through the kit module and returns the change (the kit answers 200).
async function propose(
  app: TestApp,
  input: {
    projectId?: string;
    path: string;
    content: string;
    origin?: { kind: 'agent-run'; runId: string };
  },
): Promise<PendingChange> {
  const reply = await postJsonPlain(app.baseUrl, KIT, {
    projectId: BOOK,
    origin: { kind: 'agent-run', runId: 'r1' },
    ...input,
  });
  expect(reply.status).toBe(200);
  return reply.json as PendingChange;
}

// One POST with no body and no content type.
async function postEmpty(baseUrl: string, path: string): Promise<PlainReply> {
  const response = await fetch(baseUrl + path, { method: 'POST' });
  const text = await response.text();
  return { status: response.status, json: JSON.parse(text) as unknown };
}

// One GET with no cookie; the kit app has no guard.
async function getPlain(baseUrl: string, path: string): Promise<PlainReply> {
  const response = await fetch(baseUrl + path);
  return { status: response.status, json: (await response.json()) as unknown };
}

// The error code and the optional details.reason of a refused reply.
function refusal(reply: PlainReply): {
  code: string;
  reason: string | undefined;
} {
  const error = (
    reply.json as {
      error: { code: string; details?: { reason?: string } };
    }
  ).error;
  return { code: error.code, reason: error.details?.reason };
}

// The open change files of a project (not the resolved ones), in name order.
function openFiles(library: string, projectId = BOOK): string[] {
  const folder = join(library, projectId, '.scriba', 'pending');
  return existsSync(folder)
    ? readdirSync(folder)
        .filter((name) => name.endsWith('.json'))
        .sort()
    : [];
}

// Every file under a folder, recursively, with its path and SHA-256, in name order. Empty when the folder is absent.
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

const VERSION_NAME = /^\d{8}T\d{9}Z\.md$/;

it('G1 (C1): a propose leaves the target unchanged, folds a second propose from the same origin, and lands in a non-active ok project queue', async () => {
  const fixture = bookLibrary();
  try {
    addOkProject(fixture.library, 'second');
    const target = join(fixture.library, BOOK, 'sources', 'outline.md');
    writeFileSync(target, '# Outline\n');
    const before = sha256Of(readFileSync(target));
    await withKit(fixture.library, async (app) => {
      // Step 2: the first propose.
      const first = await propose(app, {
        path: 'sources/outline.md',
        content: '# Outline\n\nFirst proposal.\n',
        origin: { kind: 'agent-run', runId: 'run-g1' },
      });
      expect(first.status).toBe('pending');
      expect(sha256Of(readFileSync(target))).toBe(before);
      expect(openFiles(fixture.library)).toHaveLength(1);

      // Step 3: a second propose, same path and origin, folds into the first.
      const second = await propose(app, {
        path: 'sources/outline.md',
        content: '# Outline\n\nSecond proposal.\n',
        origin: { kind: 'agent-run', runId: 'run-g1' },
      });
      expect(second.id).toBe(first.id);
      expect(second.capturedBase).toEqual(first.capturedBase);
      expect(second.proposed).toBe('# Outline\n\nSecond proposal.\n');
      expect(openFiles(fixture.library)).toHaveLength(1);
      expect(sha256Of(readFileSync(target))).toBe(before);

      // Step 4: a propose into the non-active ok project lands in its own queue.
      const other = await propose(app, {
        projectId: 'second',
        path: 'notes.md',
        content: 'Note\n',
        origin: { kind: 'agent-run', runId: 'run-g1-second' },
      });
      expect(other.status).toBe('pending');
      expect(openFiles(fixture.library, 'second')).toHaveLength(1);
      expect(existsSync(join(fixture.library, 'second', 'notes.md'))).toBe(
        false,
      );
    });
  } finally {
    fixture.remove();
  }
});

it('G2 (C2): listing after a host edit returns the conflict, leaves .scriba/pending/ byte-identical, and publishes nothing', async () => {
  const fixture = bookLibrary();
  try {
    const target = join(fixture.library, BOOK, 'sources', 'outline.md');
    const pendingFolder = join(fixture.library, BOOK, '.scriba', 'pending');
    writeFileSync(target, '# Outline\n');
    await withKit(fixture.library, async (app) => {
      // Step 2: the propose happens before the stream is opened (D13: no replay).
      await propose(app, {
        path: 'sources/outline.md',
        content: 'P\n',
        origin: { kind: 'agent-run', runId: 'run-g2' },
      });

      // Step 3: open the stream and read the hello block.
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000);

        // Step 4: the host edits the target.
        writeFileSync(target, 'H\n');

        // Step 5: snapshot of the pending folder.
        const beforeList = snapshot(pendingFolder);

        // Step 6: list the queue.
        const listed = await getPlain(app.baseUrl, PENDING);
        expect(listed.status).toBe(200);
        const list = pendingListSchema.parse(listed.json);
        expect(list.changes).toHaveLength(1);
        expect(list.changes[0]?.conflict?.reason).toBe('base-changed');

        // Step 7: snapshot again. The listing wrote nothing.
        expect(snapshot(pendingFolder)).toEqual(beforeList);

        // Step 8: nothing was published.
        await expect(stream.next(500)).rejects.toThrow();
        expect(readFileSync(target, 'utf8')).toBe('H\n');
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('G3 (C3): accept with edited content, apply with a version, base-changed refusal, refresh clean and overlapping, accept-anyway backup and version, validator rejection, and restore saves the current text first', async () => {
  const fixture = bookLibrary();
  try {
    const lib = fixture.library;
    const at = (path: string): string => join(lib, BOOK, path);
    await withKit(lib, async (app) => {
      // (a) Accept with edited content (PST-16 A1).
      putFile(lib, `${BOOK}/sources/a.md`, 'A0\n');
      const a = await propose(app, { path: 'sources/a.md', content: 'A1\n' });
      const acceptedA = await postJsonPlain(app.baseUrl, ACCEPT(a.id), {
        content: 'Edited\n',
      });
      expect(acceptedA.status).toBe(200);
      expect((acceptedA.json as PendingChange).status).toBe('accepted');
      expect(readFileSync(at('sources/a.md'), 'utf8')).toBe('Edited\n');
      expect(openFiles(lib)).not.toContain(`${a.id}.json`);

      // (b) Apply with a version (PST-16 A2).
      putFile(lib, `${BOOK}/drafts/ch01.md`, 'Old\n');
      const b = await propose(app, {
        path: 'drafts/ch01.md',
        content: 'New\n',
      });
      const acceptedB = await postJsonPlain(app.baseUrl, ACCEPT(b.id), {});
      expect(acceptedB.status).toBe(200);
      expect(readFileSync(at('drafts/ch01.md'), 'utf8')).toBe('New\n');
      const versionsB = readdirSync(at('drafts/.versions/ch01.md'));
      expect(versionsB).toHaveLength(1);
      expect(versionsB[0]).toMatch(VERSION_NAME);
      expect(
        readFileSync(at(`drafts/.versions/ch01.md/${versionsB[0]}`), 'utf8'),
      ).toBe('Old\n');

      // (c) base-changed refusal (PST-16 A3).
      putFile(lib, `${BOOK}/sources/c.md`, 'C0\n');
      const c = await propose(app, { path: 'sources/c.md', content: 'C1\n' });
      writeFileSync(at('sources/c.md'), 'C2\n');
      const refusedC = await postJsonPlain(app.baseUrl, ACCEPT(c.id), {});
      expect(refusedC.status).toBe(409);
      expect(refusal(refusedC)).toEqual({
        code: 'PROJECT_PENDING_CONFLICT',
        reason: 'base-changed',
      });
      expect(readFileSync(at('sources/c.md'), 'utf8')).toBe('C2\n');
      const listedC = pendingListSchema.parse(
        (await getPlain(app.baseUrl, PENDING)).json,
      );
      const openC = listedC.changes.find((change) => change.id === c.id);
      expect(openC?.status).toBe('pending');
      expect(openC?.conflict?.reason).toBe('base-changed');

      // (d) Refresh, clean: the two edits are in different paragraphs (PST-17 T1).
      const dBase =
        '# Outline\n\nFirst point.\n\nSecond point.\n\nThird point.\n';
      putFile(lib, `${BOOK}/sources/para.md`, dBase);
      const d = await propose(app, {
        path: 'sources/para.md',
        content:
          '# Outline\n\nFirst point.\n\nSecond point.\n\nThird point, revised.\n',
      });
      writeFileSync(
        at('sources/para.md'),
        '# Outline\n\nFirst point, host edit.\n\nSecond point.\n\nThird point.\n',
      );
      const refreshedD = await postEmpty(app.baseUrl, REFRESH(d.id));
      expect(refreshedD.status).toBe(200);
      const dChange = refreshedD.json as PendingChange;
      expect(dChange.conflict).toBeNull();
      const dProposed =
        '# Outline\n\nFirst point, host edit.\n\nSecond point.\n\nThird point, revised.\n';
      expect(dChange.proposed).toBe(dProposed);
      const acceptedD = await postJsonPlain(app.baseUrl, ACCEPT(d.id), {});
      expect(acceptedD.status).toBe(200);
      expect(readFileSync(at('sources/para.md'), 'utf8')).toBe(dProposed);

      // (e) Refresh, overlapping: the same paragraph was edited (PST-17 X10; demo step 3).
      putFile(
        lib,
        `${BOOK}/sources/alpha.md`,
        '# Outline\n\nAlpha one.\nAlpha two.\n\nBeta.\n',
      );
      const e = await propose(app, {
        path: 'sources/alpha.md',
        content: '# Outline\n\nAlpha one.\nAlpha two, agent.\n\nBeta.\n',
      });
      writeFileSync(
        at('sources/alpha.md'),
        '# Outline\n\nAlpha one, host.\nAlpha two.\n\nBeta.\n',
      );
      const refreshedE = await postEmpty(app.baseUrl, REFRESH(e.id));
      expect(refreshedE.status).toBe(200);
      const eChange = refreshedE.json as PendingChange;
      expect(eChange.conflict?.reason).toBe('base-changed');
      expect(eChange.proposed).toBe(e.proposed);
      expect(eChange.capturedBase).toEqual(e.capturedBase);
      expect(eChange.updatedAt).toBe(e.updatedAt);

      // (f) Accept-anyway backup: the disk bytes go to .scriba/backups/ (PST-17 T3b).
      putFile(lib, `${BOOK}/sources/back.md`, 'O\n');
      const f = await propose(app, { path: 'sources/back.md', content: 'P\n' });
      writeFileSync(at('sources/back.md'), 'H\n');
      const refusedF = await postJsonPlain(app.baseUrl, ACCEPT(f.id), {});
      expect(refusedF.status).toBe(409);
      const forcedF = await postEmpty(app.baseUrl, ACCEPT_ANYWAY(f.id));
      expect(forcedF.status).toBe(200);
      expect((forcedF.json as PendingChange).status).toBe('accepted');
      expect(readFileSync(at('sources/back.md'), 'utf8')).toBe('P\n');
      const backups = readdirSync(at('.scriba/backups'));
      expect(backups).toHaveLength(1);
      expect(
        readFileSync(
          at(`.scriba/backups/${backups[0]}/sources/back.md`),
          'utf8',
        ),
      ).toBe('H\n');

      // (g) Accept-anyway version: a top-level draft saves the disk bytes as a version (PST-17 T3a).
      putFile(lib, `${BOOK}/drafts/ch02.md`, 'Old2\n');
      const g = await propose(app, {
        path: 'drafts/ch02.md',
        content: 'New2\n',
      });
      writeFileSync(at('drafts/ch02.md'), 'Host2\n');
      const forcedG = await postEmpty(app.baseUrl, ACCEPT_ANYWAY(g.id));
      expect(forcedG.status).toBe(200);
      expect(readFileSync(at('drafts/ch02.md'), 'utf8')).toBe('New2\n');
      const versionsG = readdirSync(at('drafts/.versions/ch02.md'));
      expect(versionsG).toHaveLength(1);
      expect(
        readFileSync(at(`drafts/.versions/ch02.md/${versionsG[0]}`), 'utf8'),
      ).toBe('Host2\n');

      // (h) Validator rejection (PST-15 P5; PST-17 D7): nothing is filed.
      expect((await postEmpty(app.baseUrl, REGISTER_GRAPH)).status).toBe(200);
      const filesBeforeH = openFiles(lib);
      const refusedH = await postJsonPlain(app.baseUrl, KIT, {
        projectId: BOOK,
        path: 'graphs/a.json',
        content: '{"schemaVersion": 2}\n',
        origin: { kind: 'agent-run', runId: 'run-g3-h' },
      });
      expect(refusedH.status).toBe(422);
      expect(refusal(refusedH).code).toBe('PROJECT_VALIDATION_FAILED');
      expect(openFiles(lib)).toEqual(filesBeforeH);
      expect(existsSync(at('graphs/a.json'))).toBe(false);

      // (i) Restore saves the current text first (PST-18 V2).
      putFile(lib, `${BOOK}/drafts/ch03.md`, 'Current\n');
      const seededId = '20261104T231500123Z.md';
      putFile(lib, `${BOOK}/drafts/.versions/ch03.md/${seededId}`, 'Old\n');
      const restored = await postJsonPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_RESTORE_ROUTE, BOOK),
        { draftPath: 'drafts/ch03.md', id: seededId },
      );
      expect(restored.status).toBe(200);
      expect(restored.json).toEqual({
        draftPath: 'drafts/ch03.md',
        id: seededId,
        content: 'Old\n',
      });
      expect(readFileSync(at('drafts/ch03.md'), 'utf8')).toBe('Old\n');

      const listedI = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, { draftPath: 'drafts/ch03.md' }),
      );
      expect(listedI.status).toBe(200);
      const versionsI = draftVersionListSchema.parse(listedI.json).versions;
      expect(versionsI).toHaveLength(2);
      const newest = versionsI[0]?.id as string;
      expect(newest).not.toBe(seededId);
      const readNewest = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_ROUTE, BOOK, {
          draftPath: 'drafts/ch03.md',
          id: newest,
        }),
      );
      expect((readNewest.json as { content: string }).content).toBe(
        'Current\n',
      );
    });
  } finally {
    fixture.remove();
  }
});
