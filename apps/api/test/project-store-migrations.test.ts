import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  PROJECT_ERROR_CODES,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_PENDING_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import {
  bookLibrary,
  fileUrl,
  putFile,
  sha256Of,
} from './project-store-files.kit';
import { migrationsKitModule } from './project-store-migrations.kit';
import { buildProjectsLibrary } from './project-store-projects.kit';

// Every test builds its own temp library and removes it, and never reads examples/. The kit module has no guard,
// so the requests carry no session cookie, as in the pending kit tests. The assertions are HTTP answers and files.

const KIT_REGISTER = '/api/project-store-test/migrations/register';
const ACTIVATE = '/api/project-store/active';
const STAMP = /^\d{8}T\d{9}Z(-\d+)?$/;
const V1_NOTE = 'schemaVersion: 1\ntitle: Note\n';

// A reply: its status and its body text.
interface Reply {
  status: number;
  text: string;
}

// One request to the test app, with a JSON body when one is given.
async function call(
  baseUrl: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<Reply> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

// Registers a migrator of the kit, and expects the kit to answer.
async function register(
  app: TestApp,
  kind: string,
  pattern: string,
): Promise<void> {
  const reply = await call(app.baseUrl, 'POST', KIT_REGISTER, {
    kind,
    pattern,
  });
  expect(reply.status).toBe(200);
}

// The error code of a refusal.
function codeOf(reply: Reply): string {
  return (JSON.parse(reply.text) as { error: { code: string } }).error.code;
}

// The folder of the migration backups of one project in the library.
function migrationBackups(library: string, projectId: string): string {
  return join(library, projectId, '.scriba', 'project-store', 'backups');
}

// The log of the migrations of one project in the library.
function migrationLog(library: string, projectId: string): string {
  return join(library, projectId, 'logs', 'migrations.log');
}

// Boots the kit module on a library, and closes the app in every case. The library is removed by the caller.
async function withMigrationsKit(
  library: string,
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: library,
    modules: [migrationsKitModule()],
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

it('C1: activation upgrades project.yaml with a backup, a log line and no pending change', async () => {
  const fixture = buildProjectsLibrary();
  try {
    const original = readFileSync(
      join(fixture.library, 'book', 'project.yaml'),
    );
    await withMigrationsKit(fixture.library, async (app) => {
      await register(app, 'project-yaml', 'project.yaml');

      const activated = await call(app.baseUrl, 'POST', ACTIVATE, {
        projectId: 'book',
      });
      expect(activated.status).toBe(200);
      expect(JSON.parse(activated.text)).toEqual({ active: 'book' });

      const pending = await call(
        app.baseUrl,
        'GET',
        fileUrl(PROJECT_PENDING_ROUTE, 'book'),
      );
      expect(pending.status).toBe(200);
      expect(JSON.parse(pending.text)).toEqual({ changes: [] });
    });

    const upgraded = readFileSync(
      join(fixture.library, 'book', 'project.yaml'),
      'utf8',
    );
    expect(upgraded).toContain('schemaVersion: 2');
    expect(upgraded).toContain('upgradedBy: test-migrator');

    const stamps = readdirSync(migrationBackups(fixture.library, 'book'));
    expect(stamps).toHaveLength(1);
    expect(stamps[0]).toMatch(STAMP);
    const backup = readFileSync(
      join(
        migrationBackups(fixture.library, 'book'),
        stamps[0] as string,
        'project.yaml',
      ),
    );
    expect(backup.equals(original)).toBe(true);

    const log = readFileSync(migrationLog(fixture.library, 'book'), 'utf8')
      .split('\n')
      .filter((line) => line !== '');
    expect(log).toHaveLength(1);
    expect(log[0]).toContain('project.yaml migrated from schemaVersion 1 to 2');

    expect(
      existsSync(join(fixture.library, 'book', '.scriba', 'pending')),
    ).toBe(false);
  } finally {
    fixture.remove();
  }
});

it('C2: GET returns the upgraded view and writes nothing', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, 'book/notes/a.yaml', V1_NOTE);
    const file = join(fixture.library, 'book', 'notes', 'a.yaml');
    const before = readFileSync(file);
    await withMigrationsKit(fixture.library, async (app) => {
      await register(app, 'notes', 'notes/*.yaml');

      const reply = await call(
        app.baseUrl,
        'GET',
        fileUrl(PROJECT_FILE_ROUTE, 'book', { path: 'notes/a.yaml' }),
      );
      expect(reply.status).toBe(200);
      const view = JSON.parse(reply.text) as {
        content: string;
        hash: string;
        upgraded?: boolean;
      };
      expect(view.content).toContain('schemaVersion: 2');
      expect(view.content).toContain('upgradedBy: test-migrator');
      expect(view.upgraded).toBe(true);
      expect(view.hash).toBe(sha256Of(before));
    });

    expect(readFileSync(file).equals(before)).toBe(true);
    expect(existsSync(migrationBackups(fixture.library, 'book'))).toBe(false);
    expect(existsSync(migrationLog(fixture.library, 'book'))).toBe(false);
  } finally {
    fixture.remove();
  }
});

it('C3: a too-new file is refused for read and write', async () => {
  const fixture = bookLibrary();
  try {
    const future = 'schemaVersion: 3\ntitle: Future\n';
    putFile(fixture.library, 'book/notes/b.yaml', future);
    const file = join(fixture.library, 'book', 'notes', 'b.yaml');
    await withMigrationsKit(fixture.library, async (app) => {
      await register(app, 'notes', 'notes/*.yaml');

      const read = await call(
        app.baseUrl,
        'GET',
        fileUrl(PROJECT_FILE_ROUTE, 'book', { path: 'notes/b.yaml' }),
      );
      expect(read.status).toBe(409);
      expect(codeOf(read)).toBe(PROJECT_ERROR_CODES.SCHEMA_TOO_NEW);

      const write = await call(
        app.baseUrl,
        'POST',
        fileUrl(PROJECT_FILE_WRITE_ROUTE, 'book'),
        {
          path: 'notes/b.yaml',
          content: 'schemaVersion: 2\ntitle: Mine\n',
          baseHash: sha256Of(future),
        },
      );
      expect(write.status).toBe(409);
      expect(codeOf(write)).toBe(PROJECT_ERROR_CODES.SCHEMA_TOO_NEW);
    });

    expect(readFileSync(file, 'utf8')).toBe(future);
  } finally {
    fixture.remove();
  }
});

it('C4: comments in project.yaml survive a migration', async () => {
  const fixture = buildProjectsLibrary();
  try {
    const original = [
      '# The book record. Comments must survive.',
      'schemaVersion: 1',
      'title: Book # working title',
      'genrePack: nonfiction',
      '',
    ].join('\n');
    writeFileSync(join(fixture.library, 'book', 'project.yaml'), original);
    await withMigrationsKit(fixture.library, async (app) => {
      await register(app, 'project-yaml', 'project.yaml');
      const activated = await call(app.baseUrl, 'POST', ACTIVATE, {
        projectId: 'book',
      });
      expect(activated.status).toBe(200);
    });

    const text = readFileSync(
      join(fixture.library, 'book', 'project.yaml'),
      'utf8',
    );
    expect(text.startsWith('# The book record. Comments must survive.\n')).toBe(
      true,
    );
    expect(text).toContain('title: Book # working title\n');
    expect(text).toContain('schemaVersion: 2');
    expect(text).toContain('upgradedBy: test-migrator');
    const order = ['schemaVersion:', 'title:', 'genrePack:'].map((key) =>
      text.indexOf(key),
    );
    expect(order[0]).toBeLessThan(order[1] as number);
    expect(order[1]).toBeLessThan(order[2] as number);
  } finally {
    fixture.remove();
  }
});

it("C5: a test migrator registered for another file kind runs on that file's first write", async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, 'book/notes/d.yaml', V1_NOTE);
    const file = join(fixture.library, 'book', 'notes', 'd.yaml');
    await withMigrationsKit(fixture.library, async (app) => {
      await register(app, 'notes', 'notes/*.yaml');

      const write = await call(
        app.baseUrl,
        'POST',
        fileUrl(PROJECT_FILE_WRITE_ROUTE, 'book'),
        {
          path: 'notes/d.yaml',
          content: V1_NOTE,
          baseHash: sha256Of(V1_NOTE),
        },
      );
      expect(write.status).toBe(200);
    });

    const onDisk = readFileSync(file, 'utf8');
    expect(onDisk).toContain('schemaVersion: 2');
    expect(onDisk).toContain('upgradedBy: test-migrator');

    const stamps = readdirSync(migrationBackups(fixture.library, 'book'));
    expect(stamps).toHaveLength(1);
    expect(stamps[0]).toMatch(STAMP);
    const backup = readFileSync(
      join(
        migrationBackups(fixture.library, 'book'),
        stamps[0] as string,
        'notes',
        'd.yaml',
      ),
    );
    expect(backup.equals(Buffer.from(V1_NOTE))).toBe(true);

    const log = readFileSync(migrationLog(fixture.library, 'book'), 'utf8')
      .split('\n')
      .filter((line) => line !== '');
    expect(log).toHaveLength(1);
    expect(log[0]).toContain('notes/d.yaml');
  } finally {
    fixture.remove();
  }
});
