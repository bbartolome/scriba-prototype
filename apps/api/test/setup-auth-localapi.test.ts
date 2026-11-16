import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VERSION_ROUTE } from '@bbartolome/scriba-contracts/platform';
import {
  SETUP_STATUS_ROUTE,
  TAILSCALE_STATUS_ROUTE,
  tailscaleStatusSchema,
  type TailscaleStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp, type TestApp } from './create-test-app';
import { type LocalApiFixture, startFakeLocalApi } from './localapi-fake';
import { send, sessionCookie, type Reply } from './guard-request';

const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const HOST = '127.0.0.1:8080';

function folder(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

async function getStatus(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: HOST,
    path: TAILSCALE_STATUS_ROUTE,
    cookie,
  });
}

function parseStatus(reply: Reply): TailscaleStatus {
  return tailscaleStatusSchema.parse(JSON.parse(reply.body));
}

describe('setup-auth LocalAPI status', () => {
  it('localapi status, criterion 1: without a socket, status reads available false and loopback access is unaffected', async () => {
    const library = folder('scriba-lapi-lib-');
    const second = folder('scriba-lapi-sock-');
    let app: TestApp | undefined;
    try {
      app = await createTestApp({
        libraryDir: library,
        staticRoot: STATIC_ROOT,
        env: { SCRIBA_TS_SOCKET: join(second, 'missing.sock') },
      });
      const cookie = await sessionCookie(app, library);

      const status = await getStatus(app, cookie);
      expect(status.status).toBe(200);
      expect(parseStatus(status)).toStrictEqual({
        available: false,
        backendState: 'NoState',
      });

      const version = await send(app.baseUrl, {
        host: HOST,
        path: VERSION_ROUTE,
        cookie,
      });
      expect(version.status).toBe(200);
      const setupStatus = await send(app.baseUrl, {
        host: HOST,
        path: SETUP_STATUS_ROUTE,
        cookie,
      });
      expect(setupStatus.status).toBe(200);
    } finally {
      await app?.close();
      rmSync(library, { recursive: true, force: true });
      rmSync(second, { recursive: true, force: true });
    }
  });

  it('localapi status, criterion 1 (extra): a regular file at the socket path gives the same body', async () => {
    const library = folder('scriba-lapi-lib-');
    const second = folder('scriba-lapi-sock-');
    const plainPath = join(second, 'plain.sock');
    writeFileSync(plainPath, 'not a socket');
    let app: TestApp | undefined;
    try {
      app = await createTestApp({
        libraryDir: library,
        staticRoot: STATIC_ROOT,
        env: { SCRIBA_TS_SOCKET: plainPath },
      });
      const cookie = await sessionCookie(app, library);
      const status = await getStatus(app, cookie);
      expect(status.status).toBe(200);
      expect(parseStatus(status)).toStrictEqual({
        available: false,
        backendState: 'NoState',
      });
    } finally {
      await app?.close();
      rmSync(library, { recursive: true, force: true });
      rmSync(second, { recursive: true, force: true });
    }
  });

  it('localapi status, criterion 2: the fixtures give authURL, dnsName without the trailing dot, tailnetURL, httpsCertsEnabled and ownerLogin', async () => {
    const running = {
      available: true,
      backendState: 'Running',
      dnsName: 'scriba-1.tail1234.ts.net',
      tailnetURL: 'https://scriba-1.tail1234.ts.net',
      magicDNSEnabled: true,
      ownerLogin: 'ada@example.com',
    } as const;
    const expected: Record<LocalApiFixture, TailscaleStatus> = {
      'needs-login': {
        available: true,
        backendState: 'NeedsLogin',
        authURL: 'https://login.tailscale.com/a/0123456789abcdef',
        magicDNSEnabled: false,
        httpsCertsEnabled: false,
      },
      'logged-out': {
        available: true,
        backendState: 'NeedsLogin',
        magicDNSEnabled: false,
        httpsCertsEnabled: false,
      },
      'running-certs': { ...running, httpsCertsEnabled: true },
      'running-no-certs': { ...running, httpsCertsEnabled: false },
      'running-null-certs': { ...running, httpsCertsEnabled: false },
    };

    for (const name of Object.keys(expected) as LocalApiFixture[]) {
      const fake = await startFakeLocalApi(name);
      const library = folder('scriba-lapi-lib-');
      let app: TestApp | undefined;
      try {
        app = await createTestApp({
          libraryDir: library,
          staticRoot: STATIC_ROOT,
          env: { SCRIBA_TS_SOCKET: fake.socketPath },
        });
        const cookie = await sessionCookie(app, library);
        const status = await getStatus(app, cookie);
        expect(status.status, name).toBe(200);
        expect(parseStatus(status), name).toStrictEqual(expected[name]);
      } finally {
        await app?.close();
        await fake.close();
        rmSync(library, { recursive: true, force: true });
      }
    }
  }, 60000);

  it('localapi status, criterion 3: status calls within the cache window read the socket once', async () => {
    const fake = await startFakeLocalApi('running-certs');
    const library = folder('scriba-lapi-lib-');
    let app: TestApp | undefined;
    try {
      app = await createTestApp({
        libraryDir: library,
        staticRoot: STATIC_ROOT,
        env: { SCRIBA_TS_SOCKET: fake.socketPath },
      });
      const cookie = await sessionCookie(app, library);
      expect(fake.hits()).toBe(0);

      const parallel = await Promise.all([
        getStatus(app, cookie),
        getStatus(app, cookie),
        getStatus(app, cookie),
      ]);
      const after = await getStatus(app, cookie);
      const replies = [...parallel, after];
      for (const reply of replies) {
        expect(reply.status).toBe(200);
        expect(parseStatus(reply).backendState).toBe('Running');
      }
      expect(new Set(replies.map((reply) => reply.body)).size).toBe(1);
      expect(fake.hits()).toBe(1);

      await new Promise((done) => setTimeout(done, 2100));
      await getStatus(app, cookie);
      expect(fake.hits()).toBe(2);
    } finally {
      await app?.close();
      await fake.close();
      rmSync(library, { recursive: true, force: true });
    }
  });
});
