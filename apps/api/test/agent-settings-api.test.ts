import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { AGENT_SETTINGS_ROUTE } from '@bbartolome/scriba-contracts/agent-loop';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import { backupEntries, makeLibrary, settingsFilePath } from './settings.kit';

type Doc = Record<string, unknown>;

function get(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: AGENT_SETTINGS_ROUTE,
  });
}

// A POST with the loopback Origin, as the guard requires for a mutation.
function post(app: TestApp, cookie: string, body: unknown): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path: AGENT_SETTINGS_ROUTE,
    body: JSON.stringify(body),
  });
}

function fileText(library: string): string {
  return readFileSync(settingsFilePath(library), 'utf8');
}

function fileDoc(library: string): Doc {
  return parse(fileText(library)) as Doc;
}

it('AC1: a fresh library gets the default agent section, and a stepCap change survives a restart and changes no other field', async () => {
  const library = makeLibrary();
  try {
    // Boot on a fresh library: the default section is written.
    const first = await createTestApp({ libraryDir: library });
    await first.close();
    expect(fileDoc(library).agent).toEqual({
      schemaVersion: 1,
      stepCap: 12,
      research: { enabled: false },
    });

    // Hand-edit a section key the contract does not name, to show that the section keeps unknown keys.
    const edited = fileDoc(library);
    (edited.agent as Doc).note = 'kept';
    writeFileSync(settingsFilePath(library), stringify(edited));

    const second = await createTestApp({ libraryDir: library });
    const before = fileDoc(library);
    let body: unknown;
    try {
      const cookie = await sessionCookie(second, library);
      const reply = await post(second, cookie, { stepCap: 20 });
      expect(reply.status).toBe(200);
      body = JSON.parse(reply.body);
      expect(body).toEqual({
        schemaVersion: 1,
        stepCap: 20,
        research: { enabled: false },
        note: 'kept',
      });
    } finally {
      await second.close();
    }

    // After a restart, GET returns the same body, and a GET leaves the file text unchanged.
    const third = await createTestApp({ libraryDir: library });
    try {
      const cookie = await sessionCookie(third, library);
      const textBefore = fileText(library);
      const reply = await get(third, cookie);
      expect(reply.status).toBe(200);
      expect(JSON.parse(reply.body)).toEqual(body);
      expect(fileText(library)).toBe(textBefore);
    } finally {
      await third.close();
    }

    const after = fileDoc(library);
    expect(after.agent).toEqual(body);
    for (const key of Object.keys(before).filter((key) => key !== 'agent')) {
      expect(after[key]).toEqual(before[key]);
    }
    expect(backupEntries(library)).toEqual([]);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('AC2: an invalid agent settings body returns 400 PLATFORM_VALIDATION_FAILED and leaves settings.yaml byte-for-byte unchanged', async () => {
  const library = makeLibrary();
  try {
    const app = await createTestApp({ libraryDir: library });
    try {
      const cookie = await sessionCookie(app, library);
      const textBefore = fileText(library);
      const invalidBodies: unknown[] = [
        { stepCap: 0 },
        { stepCap: 1.5 },
        { stepCap: '5' },
        { research: { enabled: 'yes' } },
        { research: { searchEndpoint: 'ftp://x/y' } },
      ];
      for (const body of invalidBodies) {
        const reply = await post(app, cookie, body);
        expect(reply.status).toBe(400);
        const parsed = errorBodySchema.parse(JSON.parse(reply.body));
        expect(parsed.error.code).toBe('PLATFORM_VALIDATION_FAILED');
      }
      expect(fileText(library)).toBe(textBefore);

      // Positive control: a local http endpoint is accepted.
      const control = await post(app, cookie, {
        research: { searchEndpoint: 'http://localhost:8888/search' },
      });
      expect(control.status).toBe(200);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
